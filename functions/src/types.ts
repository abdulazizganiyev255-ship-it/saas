/**
 * Minimal shape of a Whop webhook event, based on the public docs
 * (docs.whop.com/developer/guides/webhooks). The exact payload has not been
 * verified against a live event yet — do that on the first real delivery
 * (see the TODO in whopWebhook.ts) and tighten these types then.
 */
export interface WhopWebhookEvent {
  /** e.g. "payment.succeeded", "membership.went_valid", "membership.went_invalid" */
  action: string;
  data: WhopPaymentData | WhopMembershipData | Record<string, unknown>;
}

export interface WhopPaymentData {
  id: string;
  user_id?: string;
  /** Buyer's email as entered at Whop checkout — used to link to our Firebase user. */
  email?: string;
  membership_id?: string;
  status?: string;
  [key: string]: unknown;
}

export interface WhopMembershipData {
  id: string;
  user_id?: string;
  email?: string;
  plan_id?: string;
  status?: string;
  /** ISO8601 or unix seconds — confirm exact format against a live payload. */
  valid_until?: string | number | null;
  [key: string]: unknown;
}

export type PaymentStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface WhopManagedUserFields {
  plan: 'free' | 'pro';
  proUntil: unknown; // Firestore Timestamp | null — set via admin.firestore.Timestamp
  whopMembershipId: string | null;
  whopCustomerId: string | null;
  paymentStatus: PaymentStatus;
  planSource: 'manual' | 'whop';
  planUpdatedAt: unknown; // FieldValue.serverTimestamp()
}
