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
async function findUserIdByEmail(email: string | undefined): Promise<string | null> {
  if (!email) return null;
  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].id;
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

async function markProcessed(webhookId: string, action: string): Promise<void> {
  await db.collection(WEBHOOK_EVENTS_COLLECTION).doc(webhookId).set({
    action,
    processedAt: FieldValue.serverTimestamp(),
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

async function handlePaymentSucceeded(data: WhopPaymentData): Promise<void> {
  const uid = await findUserIdByEmail(data.email);
  if (!uid) {
    logger.warn('payment.succeeded: no matching Firebase user for email', { email: data.email, whopPaymentId: data.id });
    return;
  }
  await applyUserPlanUpdate(uid, {
    paymentStatus: 'active',
    whopMembershipId: (data.membership_id as string | undefined) ?? null,
    whopCustomerId: (data.user_id as string | undefined) ?? null,
    planSource: 'whop',
  });
}

async function handleMembershipValid(data: WhopMembershipData): Promise<void> {
  const uid = await findUserIdByEmail(data.email);
  if (!uid) {
    logger.warn('membership.went_valid: no matching Firebase user for email', { email: data.email, whopMembershipId: data.id });
    return;
  }
  await applyUserPlanUpdate(uid, {
    plan: 'pro',
    proUntil: toProUntilTimestamp(data.valid_until),
    whopMembershipId: data.id,
    whopCustomerId: (data.user_id as string | undefined) ?? null,
    paymentStatus: 'active',
    planSource: 'whop',
  });
}

async function handleMembershipInvalid(data: WhopMembershipData): Promise<void> {
  const uid = await findUserIdByEmail(data.email);
  if (!uid) {
    logger.warn('membership.went_invalid: no matching Firebase user for email', { email: data.email, whopMembershipId: data.id });
    return;
  }
  // Deliberately do NOT flip `plan` back to 'free' or clear `proUntil` here:
  // isPro() already treats an expired/past proUntil as not-Pro, and access
  // should revoke itself at the paid-through date rather than the instant
  // Whop marks the membership invalid (covers e.g. a failed-renewal grace
  // period). We only record paymentStatus for support/visibility.
  await applyUserPlanUpdate(uid, {
    paymentStatus: 'canceled',
    planSource: 'whop',
  });
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
      switch (event.action) {
        case 'payment.succeeded':
          await handlePaymentSucceeded(event.data as WhopPaymentData);
          break;
        case 'membership.went_valid':
        case 'membership.activated':
          await handleMembershipValid(event.data as WhopMembershipData);
          break;
        case 'membership.went_invalid':
        case 'membership.canceled':
          await handleMembershipInvalid(event.data as WhopMembershipData);
          break;
        default:
          logger.info('Whop webhook: unhandled action, ignoring', { action: event.action });
      }

      await markProcessed(webhookId, event.action);
      res.status(200).send('OK');
    } catch (err) {
      // Unexpected failure (not a bad signature, not an unhandled event type) —
      // let Whop retry by returning 5xx.
      logger.error('Whop webhook processing failed', { webhookId, action: event.action, error: String(err) });
      res.status(500).send('Internal error');
    }
  }
);
