import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { Webhook } from 'standardwebhooks';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from './admin.js';
import type { WhopWebhookEvent, WhopPaymentData, WhopMembershipData, WhopManagedUserFields } from './types.js';

/**
 * Set once via: firebase functions:secrets:set WHOP_WEBHOOK_SECRET
 * Value = the "ws_..." signing secret shown when you create the webhook
 * endpoint in the Whop dashboard (dev.whop.com -> Webhooks).
 * Not set yet — this function will 500 on every request until it is,
 * which is intentional (fail closed, never skip verification).
 */
const WHOP_WEBHOOK_SECRET = defineSecret('WHOP_WEBHOOK_SECRET');

const WEBHOOK_EVENTS_COLLECTION = 'whopWebhookEvents';

/**
 * Verifies the Standard Webhooks signature Whop sends
 * (docs.whop.com/developer/guides/webhooks). Headers: webhook-id,
 * webhook-timestamp, webhook-signature ("v1,<base64 hmac-sha256>").
 * Throws if the signature is missing or invalid.
 */
function verifySignature(rawBody: Buffer, headers: Record<string, string | undefined>, secret: string): WhopWebhookEvent {
  const wh = new Webhook(secret);
  const verifiedPayload = wh.verify(rawBody.toString('utf8'), {
    'webhook-id': headers['webhook-id'] ?? '',
    'webhook-timestamp': headers['webhook-timestamp'] ?? '',
    'webhook-signature': headers['webhook-signature'] ?? '',
  });
  // standardwebhooks returns the parsed JSON body once verification passes.
  return verifiedPayload as unknown as WhopWebhookEvent;
}

/**
 * Result of looking up a Firebase user by email. 'unmatched' covers both
 * "no user with this email" and "more than one user with this email" —
 * either way we must NOT guess, and the caller has to surface it for
 * manual review rather than silently dropping the event. A payment with
 * no matching user means someone paid Whop and nobody got Pro; that must
 * never pass quietly.
 */
export type EmailLookupResult =
  | { status: 'matched'; uid: string }
  | { status: 'unmatched'; reason: 'not_found'; email: string | undefined }
  | { status: 'unmatched'; reason: 'ambiguous'; email: string | undefined; matchCount: number };

// Cap on how many matching docs we fetch when checking for ambiguity. We only
// need to know "is it exactly one or not" — fetching more than this many
// duplicate-email user docs would be its own (separate) data problem.
const EMAIL_LOOKUP_FETCH_LIMIT = 5;

/**
 * Looks up our Firebase user by the email Whop reports for this
 * payment/membership. This is the uid<->Whop link (per the agreed
 * decision: no separate Whop metadata API call, link by email instead of
 * a passed-through fbUid, since the webhook body is the only thing we
 * actually trust).
 *
 * TODO verify against a real payload once WHOP_WEBHOOK_SECRET is live:
 * confirm the email field name/location for both payment and membership
 * events (it may be nested under data.user.email rather than data.email).
 */
async function findUserByEmail(email: string | undefined): Promise<EmailLookupResult> {
  if (!email) return { status: 'unmatched', reason: 'not_found', email };
  const snap = await db.collection('users').where('email', '==', email).limit(EMAIL_LOOKUP_FETCH_LIMIT).get();
  if (snap.empty) return { status: 'unmatched', reason: 'not_found', email };
  if (snap.size > 1) return { status: 'unmatched', reason: 'ambiguous', email, matchCount: snap.size };
  return { status: 'matched', uid: snap.docs[0].id };
}

/**
 * Idempotency guard: Whop retries webhooks that don't 2xx quickly, and can
 * redeliver even after a success in rare cases. We record each processed
 * webhook-id and skip reprocessing it.
 */
async function alreadyProcessed(webhookId: string): Promise<boolean> {
  const ref = db.collection(WEBHOOK_EVENTS_COLLECTION).doc(webhookId);
  const snap = await ref.get();
  return snap.exists;
}

/**
 * Records the outcome of a processed webhook for later auditing.
 * `status: 'unmatched'` means a real Whop event (payment or membership
 * change) could not be tied to a Firebase user — e.g. money came in but
 * nobody got Pro — and is left in whopWebhookEvents for manual follow-up:
 * find the Whop customer by email/membership id and fix the user doc or
 * the email mismatch by hand.
 */
async function markProcessed(webhookId: string, action: string, lookup: EmailLookupResult): Promise<void> {
  const base = {
    action,
    status: lookup.status,
    processedAt: FieldValue.serverTimestamp(),
  };

  if (lookup.status === 'unmatched') {
    logger.error('Whop webhook unmatched — no unique Firebase user for this event, Pro NOT granted', {
      webhookId,
      action,
      reason: lookup.reason,
      email: lookup.email,
      matchCount: lookup.reason === 'ambiguous' ? lookup.matchCount : undefined,
    });
    await db.collection(WEBHOOK_EVENTS_COLLECTION).doc(webhookId).set({
      ...base,
      unmatchedReason: lookup.reason,
      email: lookup.email ?? null,
      matchCount: lookup.reason === 'ambiguous' ? lookup.matchCount : null,
    });
    return;
  }

  await db.collection(WEBHOOK_EVENTS_COLLECTION).doc(webhookId).set({
    ...base,
    uid: lookup.uid,
  });
}

/** Converts whatever Whop sends for valid_until into a Firestore Timestamp, or null for lifetime/none. */
function toProUntilTimestamp(validUntil: string | number | null | undefined): Timestamp | null {
  if (validUntil === null || validUntil === undefined) return null;
  const millis = typeof validUntil === 'number' ? validUntil * 1000 : new Date(validUntil).getTime();
  if (Number.isNaN(millis)) {
    logger.warn('Could not parse valid_until value, leaving proUntil unset', { validUntil });
    return null;
  }
  return Timestamp.fromMillis(millis);
}

async function applyUserPlanUpdate(uid: string, fields: Partial<WhopManagedUserFields>): Promise<void> {
  await db.collection('users').doc(uid).set(
    {
      ...fields,
      planUpdatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Event handlers below are scaffolding: the field names/shapes are our
 * best read of docs.whop.com, NOT yet confirmed against a live delivery.
 * Each one logs the raw event first so the first real webhooks can be
 * inspected in Cloud Logging and the mapping corrected before trusting it.
 */

async function handlePaymentSucceeded(data: WhopPaymentData): Promise<EmailLookupResult> {
  const lookup = await findUserByEmail(data.email);
  if (lookup.status !== 'matched') {
    return lookup;
  }
  await applyUserPlanUpdate(lookup.uid, {
    paymentStatus: 'active',
    whopMembershipId: (data.membership_id as string | undefined) ?? null,
    whopCustomerId: (data.user_id as string | undefined) ?? null,
    planSource: 'whop',
  });
  return lookup;
}

async function handleMembershipValid(data: WhopMembershipData): Promise<EmailLookupResult> {
  const lookup = await findUserByEmail(data.email);
  if (lookup.status !== 'matched') {
    return lookup;
  }
  await applyUserPlanUpdate(lookup.uid, {
    plan: 'pro',
    proUntil: toProUntilTimestamp(data.valid_until),
    whopMembershipId: data.id,
    whopCustomerId: (data.user_id as string | undefined) ?? null,
    paymentStatus: 'active',
    planSource: 'whop',
  });
  return lookup;
}

async function handleMembershipInvalid(data: WhopMembershipData): Promise<EmailLookupResult> {
  const lookup = await findUserByEmail(data.email);
  if (lookup.status !== 'matched') {
    return lookup;
  }
  // Deliberately do NOT flip `plan` back to 'free' or clear `proUntil` here:
  // isPro() already treats an expired/past proUntil as not-Pro, and access
  // should revoke itself at the paid-through date rather than the instant
  // Whop marks the membership invalid (covers e.g. a failed-renewal grace
  // period). We only record paymentStatus for support/visibility.
  await applyUserPlanUpdate(lookup.uid, {
    paymentStatus: 'canceled',
    planSource: 'whop',
  });
  return lookup;
}

export const whopWebhook = onRequest(
  { secrets: [WHOP_WEBHOOK_SECRET], region: 'us-central1', cors: false, invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const webhookId = req.header('webhook-id');
    if (!webhookId) {
      logger.error('Whop webhook missing webhook-id header');
      res.status(400).send('Missing webhook-id');
      return;
    }

    let event: WhopWebhookEvent;
    try {
      event = verifySignature(req.rawBody, req.headers as Record<string, string | undefined>, WHOP_WEBHOOK_SECRET.value());
    } catch (err) {
      logger.error('Whop webhook signature verification failed', { error: String(err) });
      res.status(400).send('Invalid signature');
      return;
    }

    if (await alreadyProcessed(webhookId)) {
      logger.info('Whop webhook already processed, skipping', { webhookId, action: event.action });
      res.status(200).send('OK (duplicate)');
      return;
    }

    try {
      let lookup: EmailLookupResult | null = null;

      switch (event.action) {
        case 'payment.succeeded':
          lookup = await handlePaymentSucceeded(event.data as WhopPaymentData);
          break;
        case 'membership.went_valid':
        case 'membership.activated':
          lookup = await handleMembershipValid(event.data as WhopMembershipData);
          break;
        case 'membership.went_invalid':
        case 'membership.canceled':
          lookup = await handleMembershipInvalid(event.data as WhopMembershipData);
          break;
        default:
          logger.info('Whop webhook: unhandled action, ignoring', { action: event.action });
      }

      if (lookup) {
        await markProcessed(webhookId, event.action, lookup);
      } else {
        // Event type we don't act on at all — nothing to match, nothing to mark unmatched.
        await db.collection(WEBHOOK_EVENTS_COLLECTION).doc(webhookId).set({
          action: event.action,
          status: 'ignored',
          processedAt: FieldValue.serverTimestamp(),
        });
      }

      res.status(200).send('OK');
    } catch (err) {
      // Unexpected failure (not a bad signature, not an unhandled event type) —
      // let Whop retry by returning 5xx.
      logger.error('Whop webhook processing failed', { webhookId, action: event.action, error: String(err) });
      res.status(500).send('Internal error');
    }
  }
);
