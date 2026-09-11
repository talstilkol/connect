# 1. Private Paddle recovery — R217, 11.09.2026

1.1 C3.2.5 is implemented locally. The private CLI supports three explicit operator decisions. It has no HTTP route, customer button or POST capability. Account connections and Sandbox acceptance are still required before billing is enabled.

| Action | Required investigation | Effect |
|---|---|---|
| `bind-transaction` | Paddle support establishes that the exact original request for this account/environment/intent created the specified transaction | GET validates that identity and the immutable plan; the existing worker subsequently verifies the subscription. No paid access is granted just by binding. |
| `close-absent` | Support conclusively confirms that the original request is terminal and created no transaction | Closes the retained sealed attempt; the owner may explicitly request a new generation. |
| `resolve-review` | Operator investigates conflicting subscription evidence and confirms the authoritative current state | Re-reads the recorded transaction and subscription, then atomically installs the exact approved projection and clears only the current review revision. |

1.2 The evidence document is an operator attestation trust boundary. Software verifies its digest, authority, scope, freshness, provider projection and database state; it cannot independently determine whether a human support statement is true. A file hash, elapsed time, 404, empty list, email, metadata or request ID alone is **not** proof of absence or identity. Retain the actual support exchange in restricted case storage, indexed by its SHA-256 digest. A case must identify the Paddle account/environment, intent, original attempt window, any original request ID, exact finding and transaction ID when applicable. Do not create a replacement document with an invented finding.

1.3 If support cannot establish a conclusive result, keep the hold. This is an operational unresolved case, not permission to reset a dispatch seal or repeat POST. Paddle documents request IDs as support references. [Error reference](https://developer.paddle.com/errors/). Canceled subscriptions cannot be reinstated, including by this tool. [Cancellation lifecycle](https://developer.paddle.com/build/subscriptions/cancel-subscriptions/).

# 2. Provision a private operator

2.1 Apply migration `0084_paddle_operator_recovery.sql` using the established migration owner, with customer billing disabled. It grants no operator authority automatically. A database administrator provisions a separate identifiable LOGIN with no superuser, role creation, database creation, schema creation, migration-owner or runtime-role membership. Never deploy its URL in Web/API/Worker. Store `PADDLE_RECOVERY_DATABASE_URL` only in the private operator environment; remote connections require `sslmode=verify-full`.

2.2 The administrator grants only the capabilities exercised by the local restricted-login test:

| Resource | Privilege |
|---|---|
| `public` schema | USAGE |
| `paddle_checkout_intents`, `paddle_accounts` | SELECT, UPDATE |
| `paddle_creation_observations` | SELECT |
| `paddle_operator_recoveries`, `paddle_checkout_closures`, `audit_logs` | SELECT, INSERT |
| Audit log identity sequence | USAGE on its actual sequence, resolved with `pg_get_serial_sequence('public.audit_logs','id')` |
| `paddle_recovery_authorize_v1(bigint,text)`, `derive_bot_reply_staging_tenant_barrier_key_v1(bigint)` | EXECUTE |

2.3 Separately, the administrator inserts an expiring authorization into `paddle_recovery_authorizations` for the actual authenticated database login, exact tenant and environment. Do not grant the operator writes to this table. Revocation deletes the authorization; expiry uses database time. The authenticated `session_user` is recorded rather than a caller-supplied actor. Tenant owners and API/Worker/Verifier/Migrator logins are not recovery operators. These are private operational database read/write privileges, not a general tenant-isolated customer database interface.

2.4 GET-based actions use the existing Paddle configuration in the isolated CLI environment, with a provider key restricted to transaction/subscription reads. The provider environment must match the intent. `close-absent` requires no provider connection; it depends on the conclusive retained support evidence instead. Do not interpret a missing provider configuration as absence.

# 3. Prepare, inspect and apply

3.1 Use Node 24. All file arguments must be absolute, owned by the operating-system user, regular files rather than symbolic links, and private (`0600`). JSON inputs/proposals are at most 64 KiB; support evidence is at most 1 MiB. Preserve larger original case material in restricted storage and use a reviewed, faithfully linked case record within this limit.

3.2 Build the request JSON from the real private database record. Exact fields are `tenantId`, `environment`, `intentKey`, `action`, `transactionId`. For absence closure only, `transactionId` must be null. For review, it must be the already recorded transaction; for support binding it must be the identity conclusively established by support. No generated business records or guessed identifiers are appropriate.

3.3 After setting `RECOVERY_REQUEST_PATH`, `RECOVERY_PROPOSAL_PATH` and `RECOVERY_EVIDENCE_PATH` to the real private files:

```sh
node scripts/paddle-operator-recovery.mjs prepare "$RECOVERY_REQUEST_PATH" "$RECOVERY_PROPOSAL_PATH"
```

3.4 Inspect the proposal and support case before applying. Preparation never changes billing state. The output is created exclusively and does not overwrite an existing file. The proposal is bound to the actual login, full current database snapshot, exact GET projection and database observation time. It expires after five minutes. Select the confirmation matching the reviewed finding:

| Action | `RECOVERY_CONFIRMATION` |
|---|---|
| `bind-transaction` | `CONFIRM_SUPPORT_BOUND_ORIGINAL_REQUEST` |
| `close-absent` | `CONFIRM_SUPPORT_TERMINAL_NO_TRANSACTION` |
| `resolve-review` | `CONFIRM_AUTHORITATIVE_SUBSCRIPTION_STATE` |

```sh
node scripts/paddle-operator-recovery.mjs apply "$RECOVERY_PROPOSAL_PATH" "$RECOVERY_EVIDENCE_PATH" "$RECOVERY_CONFIRMATION"
```

3.5 Apply authorizes the actual login, re-reads provider facts for GET-based actions, then rechecks the snapshot and authorization under the tenant barrier. A concurrent webhook, worker claim, new review revision, changed provider response, expired proposal or revoked authorization rejects the decision. Prepare again from the current state; do not edit a proposal to bypass the check. Provider timestamps retain microsecond ordering. Older facts and canceled-subscription resurrection stay blocked.

3.6 The immutable recovery record and billing mutation commit in the same transaction. A lost acknowledgment can be recovered by replaying the exact proposal and evidence with current authorization; this returns the saved receipt without another provider request. Replay cannot clear a later review episode. The original observation, dispatch seal and generation history are retained. Recovery receipts reject UPDATE, DELETE and TRUNCATE. Errors print a bounded message rather than database URLs, raw provider bodies or support content.

# 4. Acceptance and limits

4.1 Local acceptance covers both PostgreSQL 16 and 17: scoped/expired/revoked authority, actual separate restricted login, support binding and absence closure, exact concurrent replay, fresh GET changes, webhook and review races, atomic rollback, immutable evidence, current paid access, stale provider versions and permanent cancellation. Existing billing/provider tests remain enabled. This does not prove the content of a real support statement or live Paddle permissions.

4.2 Before enabling billing in Sandbox, provision the real operator login and scoped grant, verify certificate validation and real read-only Paddle permissions, retain an actual support case if a recovery is needed, and rehearse the workflow against the deployed uniform revision. Revoke the grant afterward. Never manufacture an unknown transaction or send a charge merely to populate a recovery case.
