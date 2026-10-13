# Life OS — Launch Checklist

Everything code-level is done, tested, and pushed to `claude/gracious-goodall-igueum`.
What's left requires **your** Firebase/Whop account access — an AI session cannot
do any of these steps (no login credentials, no billing access, no Whop account).
Follow this in order; each step says exactly what to run and why.

## 0. Prerequisites (one-time)

- [ ] Install the Firebase CLI if you don't have it: `npm install -g firebase-tools` (or use `npx firebase` as below).
- [ ] `firebase login` — sign in with the Google account that owns the `gen-lang-client-0671492555` project.
- [ ] **Upgrade the Firebase project to the Blaze (pay-as-you-go) plan.** Cloud Functions (used for the Whop webhook and account deletion) require it — Spark (free) cannot run them at all. Do this in the Firebase Console → Project Settings → Usage and billing. Blaze includes a free tier (2M function invocations/month) — for this app's volume, expect close to $0/month.

## 1. Deploy Firestore rules and indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

This ships `firestore.rules` (21 tests passing locally, including the
admin-only-field lockdown for the Whop integration) and the 7 composite
indexes in `firestore.indexes.json` (needed for the tombstone-purge
queries in `src/services/deltaSync.ts`). Safe to run anytime, no
dependency on anything else below.

## 2. Set the Whop webhook secret (placeholder first)

Cloud Functions with a `defineSecret()` param (see
`functions/src/whopWebhook.ts`) will refuse to deploy until that secret
exists in Secret Manager — even as a placeholder you'll overwrite in step 5.

```bash
firebase functions:secrets:set WHOP_WEBHOOK_SECRET
# paste any placeholder value when prompted, e.g. "placeholder-set-after-deploy"
```

## 3. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This builds and deploys both functions:
- `whopWebhook` — the Pro-fulfillment webhook (fails closed / returns 500
  on every request until step 5 below sets the real secret — that's
  intentional, not a bug).
- `deleteUserAccount` — the account-deletion callable (works immediately,
  no external dependency).

**Copy the `whopWebhook` URL from the deploy output** — it looks like:
`https://us-central1-gen-lang-client-0671492555.cloudfunctions.net/whopWebhook`
You need it for the next step.

## 4. Create the Whop product and webhook

On [dev.whop.com](https://dev.whop.com) / your Whop dashboard:

- [ ] Create your Pro plan (monthly, $3.99) and Lifetime plan ($59.99) under
      Checkout Links. Copy each plan's ID (`plan_XXXXXXXXX`).
- [ ] Go to Webhooks → create a new webhook endpoint, URL = the `whopWebhook`
      URL from step 3. Subscribe to: `payment.succeeded`,
      `membership.went_valid` (or `membership.activated` — the code
      handles both names; check which one your dashboard actually lists),
      `membership.went_invalid` (or `membership.canceled`).
- [ ] Copy the webhook's signing secret (starts with `ws_`).

## 5. Set the real webhook secret and redeploy

```bash
firebase functions:secrets:set WHOP_WEBHOOK_SECRET
# paste the real ws_... secret from step 4
firebase deploy --only functions
```

## 6. Put the real Whop plan IDs into the code

Edit `src/config/constants.ts` — replace both `whopPlanId: "plan_PLACEHOLDER"`
values (on the `pro` and `lifetime` entries) with the real plan IDs from
step 4. Commit, push, then:

```bash
bun run check   # must pass before deploying — this is also enforced by CI
```

## 7. Deploy the frontend

```bash
firebase deploy --only hosting
```

`firebase.json`'s `hosting.predeploy` already runs `bun run check` (type-check +
build + the design-token/banned-pattern scan) before this ships anything —
a broken build cannot be deployed by accident.

## 8. End-to-end test on the live site

- [ ] Sign in with a real Google account.
- [ ] Open the Upgrade modal, start checkout for Pro, complete a real (or
      Whop test-mode) payment.
- [ ] Confirm the UI moves `checkout → pending → success` within a few
      seconds (if it hits `timeout` after 60s instead, check Cloud Logging
      for `whopWebhook` — see the "Known limitations" section below).
- [ ] In the Firebase Console → Firestore, confirm your `users/{uid}` doc
      now has `plan: "pro"`, `paymentStatus: "active"`, `whopMembershipId`.
- [ ] Test "Delete Account" in Settings — confirm the Firestore doc AND
      the Firebase Auth user both actually disappear (this was broken
      before `functions/src/deleteAccount.ts` — see git log for
      `feeada4`; this is the exact bug it fixes, so this is the one
      explicitly worth re-checking by hand).

## 9. Confirm CI is green

GitHub Actions (`.github/workflows/ci.yml`) runs automatically on every
push — check the Actions tab on GitHub once you push anything after this.
It wasn't possible to trigger a real GitHub Actions run from this session
(no `gh`/GitHub API access here), so this is the one piece that still
needs a first real-world confirmation.

---

## Known limitations (not blockers, worth knowing)

- **Email-matching for Whop↔Firebase linking** (`functions/src/whopWebhook.ts`):
  if a buyer pays at Whop checkout with an email that doesn't match any
  Firebase account (typo, different email than their Google sign-in), the
  event is recorded as `status: "unmatched"` in the `whopWebhookEvents`
  Firestore collection instead of silently failing — check that collection
  periodically (or set up a Cloud Logging alert on `severity=ERROR` with
  `"unmatched"` in the message) for manual follow-up. This is the one
  realistic source of "customer paid, didn't get Pro automatically."
- **Bundle size**: the production build's largest chunks (`vendor-firebase`
  ~620KB, `vendor-recharts` ~400KB, gzipped to ~185KB/~114KB) trigger Vite's
  500KB chunk-size warning. Not broken, just worth knowing for mobile users
  on slow connections — a future optimization, not a launch blocker.
- **Firebase emulator warnings** you'll see locally (`EAFNOSUPPORT ::1`,
  "not authenticated... some features may not work correctly") are
  sandbox/network artifacts of this dev environment, not app bugs — they
  don't appear in a normal local dev machine or in CI.
