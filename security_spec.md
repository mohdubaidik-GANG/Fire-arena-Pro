# FireArena MAX - Security Specification & Test Payloads

## 1. Data Invariants

1. **Identity & User Isolation**: A user can only access their own private profile, wallet balances, and submit deposit/withdrawal requests for their own account (`request.auth.uid == userId`).
2. **Dual Wallet Protection**: Wallet balance fields (`depositBalance`, `winningsBalance`) can only be modified by whitelisted administrators (or trusted batch atomic increments during approved match payouts). Non-admins cannot self-credit wallets.
3. **Admin Exclusivity**: All administrative operations (deposits approval, payouts processing, setting UPI QR details, setting tournament room ID/password, balance adjustments, banning users) require the authenticated caller to have verified admin status (`request.auth.token.email in ['ubada900593@gmail.com', 'mohdubaid.ik@gmail.com']` or present in `/admins/{uid}`).
4. **Room Credentials Protection**: Tournament `roomId` and `roomPassword` are sensitive. Only registered players in that specific tournament or an admin may view full match room credentials when unlocked.
5. **Deposit Request Flow**: A player can create a deposit request with status `'pending'`. Only an admin can change status to `'approved'` or `'rejected'`.
6. **Withdrawal Request Flow**: A player can create a withdrawal request with status `'pending'`. Only an admin can approve/mark paid or reject.
7. **Tournament Lifecycle**: Only admins can create, update, or cancel tournaments.

---

## 2. The Dirty Dozen Malicious Payloads (Must Return PERMISSION_DENIED)

1. **Payload 1 - Wallet Self-Crediting**:
   `POST /users/attacker123 { depositBalance: 10000, winningsBalance: 5000 }` (Non-admin attempting to credit money)
2. **Payload 2 - Impersonated Registration**:
   `POST /tournaments/tour1/registrations/reg1 { userId: "victimUid", userIgn: "victim" }` with `request.auth.uid == "attacker"`
3. **Payload 3 - Self-Approval of Deposit**:
   `PATCH /depositRequests/dep1 { status: "approved" }` by the requesting user
4. **Payload 4 - UTR String Flooding / Denial of Wallet**:
   `POST /depositRequests/dep2 { utrNumber: "A".repeat(5000) }` (oversized UTR string)
5. **Payload 5 - Unauthenticated Read on Deposit Queue**:
   `GET /depositRequests` without authentication
6. **Payload 6 - Room Password Tampering**:
   `PATCH /tournaments/tour1 { roomPassword: "hackedPassword" }` by a participant
7. **Payload 7 - Unverified Email Admin Spoofing**:
   Request claim `{ email: "ubada900593@gmail.com", email_verified: false }`
8. **Payload 8 - Withdrawal Over-claim Modification**:
   `PATCH /withdrawalRequests/with1 { amount: 50000 }` after submission
9. **Payload 9 - Orphan Registration**:
   Registering to non-existent tournament ID `tour_non_existent`
10. **Payload 10 - Ghost Fields in User Creation**:
   `POST /users/user1 { isAdmin: true, role: "superadmin" }`
11. **Payload 11 - PII Leak Extraction**:
   User A reading User B's private `/users/userB` record
12. **Payload 12 - Unauthorized Match Result Declaration**:
   Non-admin declaring tournament winners and awarding prizes
