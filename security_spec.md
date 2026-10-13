# Security Specification - Life OS

## 1. Data Invariants
- All application data belongs exclusively to the authenticated user identified by `request.auth.uid`.
- User account documents live at `/users/{userId}` where `userId == request.auth.uid`.
- Account plan cannot be elevated or altered by client writes: on creation it must be "free", and on update the `plan` field is immutable (`request.resource.data.plan == resource.data.plan`).
- All other collections outside `/users/{userId}` are denied by default.
- Non-owners cannot read, write, or list any documents belonging to other users.
- `whopMembershipId`, `whopCustomerId`, `paymentStatus`, `planSource`, and `planUpdatedAt` on `/users/{userId}` are admin-only: the client's `create`/`update` `hasOnly()` lists deliberately exclude them, so any client write containing one of these fields is rejected in full (not just that field). The only writer is the `whopWebhook` Cloud Function (`functions/src/whopWebhook.ts`), via the Admin SDK, which bypasses these rules entirely. The owner can still read them (`allow get`) — they are write-protected, not read-protected. See `functions/src/whopWebhook.ts` for the full payment-to-Firestore pipeline this protects.

## 2. Dirty Dozen Attack Payloads & Test Scenarios
1. **Unauthenticated Read**: Attempt to read `/users/user123` with `request.auth = null` -> DENIED
2. **Unauthenticated Write**: Attempt to write to `/users/user123` with `request.auth = null` -> DENIED
3. **Cross-User Snooping**: Authenticated as `userA`, attempt `get(/users/userB)` -> DENIED
4. **Cross-User Modification**: Authenticated as `userA`, attempt `update(/users/userB)` -> DENIED
5. **Cross-User Subcollection Access**: Authenticated as `userA`, attempt `get(/users/userB/transactions/tx1)` -> DENIED
6. **Cross-User Subcollection Write**: Authenticated as `userA`, attempt `create(/users/userB/days/2026-10-05)` -> DENIED
7. **Privilege Escalation on Create**: Authenticated as `userA`, attempt `create(/users/userA)` with `plan: "pro"` -> DENIED (must be "free")
8. **Privilege Escalation on Update**: Authenticated as `userA`, attempt `update(/users/userA)` with `plan: "premium"` -> DENIED (immutable plan)
9. **Global Collection Scraping**: Authenticated user attempts `list(/users)` -> DENIED
10. **Shadow Collection Hijack**: Authenticated user attempts write to `/system/config` or any root-level collection -> DENIED
11. **Foreign User Account Deletion**: Authenticated as `userA`, attempt `delete(/users/userB)` -> DENIED
12. **Foreign Subcollection Bulk List**: Authenticated as `userA`, attempt query on `/users/userB/tasks` -> DENIED
13. **Self-Granted Pro via Admin-Only Field (Create)**: Authenticated as `userA`, attempt `create(/users/userA)` with an otherwise-valid free-plan profile plus `whopMembershipId: "mem_fake"` -> DENIED (field absent from `hasOnly()`, whole write rejected)
14. **Self-Granted Pro via Admin-Only Field Smuggled Into a Legitimate Update**: Authenticated as `userA`, attempt `update(/users/userA)` with `{ displayName: "New Name", paymentStatus: "active" }` -> DENIED in full, including the otherwise-valid `displayName` change (`hasOnly()` rejects the whole document, not a per-field strip)

Scenarios 13–14 are covered by `tests/rules.test.ts` Tests 19 and 20 respectively; Test 21 additionally confirms the owner CAN still read these fields once set by the webhook — write-protected, not read-protected.
