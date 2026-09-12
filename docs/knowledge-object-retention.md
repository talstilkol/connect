# 1. Knowledge object retention — R218, 11.09.2026

1.1 C4.1.3 is implemented and verified locally. A private operator CLI retires an eligible Knowledge source and durably deletes only its recorded S3 object version. It is separate from the API and ingestion worker. Nothing is scheduled or enabled automatically. AWS acceptance and account provisioning remain in the connection phase.

1.2 The policy trigger is administrative tenant closure (`tenants.status='cancelled'`). Suspended, expired, payment failure and Paddle cancellation alone do not qualify. Migration `0085_knowledge_object_retention.sql` records closure using the database clock. Reopening clears the timestamp; closing again starts a new period. Existing cancelled tenants with no timestamp start conservatively on their first review; `updated_at` is never used to backdate closure.

1.3 `RETENTION_POLICY_JSON` must pass the existing complete v2 policy validator, covering all 25 data classes. The `knowledge-source-objects` rule supplies the retention days; there is no production default. The whole validated policy digest is bound to approval. Changing policy requires fresh preparation. The 30-day test fixture is not a deployment recommendation.

1.4 A versioned, explicit legal-hold review after the current closure is mandatory. Missing review blocks deletion. The review evidence is a human administrative attestation: keep the actual case and authority in restricted storage, indexed by the stored SHA-256 digest. The software does not establish the legal truth of a document. Apply a hold when the case is unresolved.

# 2. Private database and S3 capabilities

2.1 Apply all ordered migrations through 0085 with the established migration owner. Provision a separate identifiable database LOGIN, with no superuser, role/database/schema creation or owner/runtime membership. Keep `KNOWLEDGE_RETENTION_DATABASE_URL` solely in the private operator environment; remote connections require `sslmode=verify-full`. Do not distribute it to customers or Web/API/Worker.

| Resource | Operator privilege tested |
|---|---|
| `public` schema | USAGE |
| `tenants`, `knowledge_sources` | SELECT, UPDATE |
| `knowledge_ingestion_jobs`, `knowledge_retention_events` | SELECT |
| `knowledge_retention_reviews`, `knowledge_retention_jobs` | SELECT, INSERT, UPDATE |
| `knowledge_retention_authorize_v1(bigint)`, `derive_bot_reply_staging_tenant_barrier_key_v1(bigint)` | EXECUTE |

2.2 An administrator separately grants the actual authenticated login an expiring tenant scope in `knowledge_retention_grants`. The operator cannot write that table, audit events, functions or schema. Grant expiry uses database time. These are trusted private operational database privileges, not tenant-isolated customer SQL access; do not expose arbitrary SQL through the CLI. The clock function remains migration-owner controlled. The test-only clock table and function override must never be installed in a live database.

2.3 Only `run` needs the existing Knowledge configuration: `KNOWLEDGE_ENABLED=true` and the region, bucket, account, KMS and scanner-role fields documented in [Knowledge ingestion](knowledge-ingestion-runtime.md). Supply a separate AWS identity with `s3:DeleteObjectVersion` on the Knowledge prefix and the bucket-control read permissions needed for PublicAccessBlock, Versioning, OwnershipControls, Encryption, PolicyStatus and Policy checks. The cleanup role needs no object-body reads, version listing, uploads, tag mutation, unversioned delete, KMS decrypt or Object Lock bypass. Configure actual account resources; the adapter does not provision them.

2.4 The adapter verifies the six existing bucket controls and the required Knowledge quarantine policy. Every deletion includes the exact `VersionId` and `ExpectedBucketOwner`. It never sends `BypassGovernanceRetention` or MFA, never substitutes an unversioned deletion and makes one SDK attempt per claim. Object Lock may deny the request, leaving a blocked job for review. AWS documents [exact-version deletion](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html), [Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html), [governance and legal holds](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html) and [IAM actions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html). Checked 11.09.2026.

# 3. Review, prepare, enqueue and run

3.1 Use Node 24 and actual private record identifiers. Every input/evidence path must be absolute, owned by the OS user, regular rather than a symlink, and private (`0600`). JSON files are at most 64 KiB; evidence is at most 1 MiB. Preparation creates a new exclusive `0600` file and never overwrites one. Shared private-file validation is also used by Paddle recovery.

3.2 Set the shell path variables below to real private files. A target JSON has exactly `tenantId` and `sourceKey`; obtain both from the actual Knowledge record. Inspect status first:

```sh
node scripts/knowledge-object-retention.mjs status "$RETENTION_TARGET_PATH"
```

3.3 Review JSON has exactly `tenantId`, `expectedVersion` (the current review version as a safe integer, initially 0) and `legalHold` (boolean). Choose the confirmation matching the actual finding: `APPLY_LEGAL_HOLD` for true or `CONFIRM_NO_LEGAL_HOLD` for false. Review can run without AWS or a retention policy. A stale version is rejected; reread status before deciding again.

```sh
node scripts/knowledge-object-retention.mjs review "$RETENTION_REVIEW_PATH" "$RETENTION_EVIDENCE_PATH" "$RETENTION_REVIEW_CONFIRMATION"
```

3.4 After the configured period has elapsed and the review permits deletion:

```sh
node scripts/knowledge-object-retention.mjs prepare "$RETENTION_TARGET_PATH" "$RETENTION_PROPOSAL_PATH"
node scripts/knowledge-object-retention.mjs enqueue "$RETENTION_PROPOSAL_PATH" "$RETENTION_EVIDENCE_PATH" CONFIRM_EXACT_VERSION_DELETION
node scripts/knowledge-object-retention.mjs run "$RETENTION_TARGET_PATH" RUN_APPROVED_DELETION
node scripts/knowledge-object-retention.mjs status "$RETENTION_TARGET_PATH"
```

3.5 Inspect the proposal and case before enqueue. Preparation is read-only and expires after five minutes. Enqueue binds the actual login, current snapshot, policy, legal review, closure and exact known version under the tenant barrier. Only terminal ready/rejected ingestion, with no relay bytes or active ingestion claim, qualifies. Unknown object identities remain held for C4.1.2; absence is not inferred from an empty listing.

3.6 Enqueue atomically archives a ready source and writes the job plus audit. Rejected sources stay rejected. Local retirement precedes remote deletion, and a retired source cannot be reactivated even if the tenant reopens. Original same-content upload receipts continue to identify that retired source; this tool does not create a replacement upload or source identity. Failure of job/audit insertion rolls back retirement. Exact enqueue replay returns the retained approval without creating another job.

# 4. Failure handling and retained data

4.1 Each run acquires a ten-minute fenced claim. Authorization, current closure/period, policy and review are rechecked immediately before SDK transport, including after credential resolution. A hold, reopening or revocation before dispatch prevents deletion. An already dispatched request cannot be recalled; a received success is recorded even if authority changes while it is in flight. Stale claim completion cannot overwrite a newer claim.

4.2 The request timeout is 30 seconds. An unsettled transport blocks another operation in that adapter. A missing or malformed acknowledgement remains unknown. After one minute, an authorized run may retry only the same immutable S3 version, up to three attempts; then the job is blocked. An explicit new preparation and evidence-backed enqueue are required to reset the attempt budget. Never broaden the target or bypass Object Lock to resolve uncertainty. `run` reports its provider observation; use `status` for the durable job state, including a third unknown attempt that became blocked.

4.3 A revoked login cannot claim or dispatch, but its matching in-flight acknowledgement may still be persisted. A lost finish acknowledgement can be recovered from durable status without deleting again when `removed` was committed. If that commit rolled back, the fenced lease and bounded same-version retry preserve uncertainty. A blocked or removed target causes an idle run; idle alone is not a success receipt.

4.4 Events reject UPDATE/DELETE/TRUNCATE; reviews reject deletion/truncation; jobs reject deletion/truncation, identity changes, invalid transitions and changes after removal. Original ingestion receipts and extracted passages remain retained. This implements S3 source-object retention, **not full tenant/content erasure**. Other database, passage and audit retention classes remain governed separately; do not issue a full-erasure certificate from this result.

4.5 Local evidence: 26 ingestion/retention cases pass on each PostgreSQL 16.13 and 17.11 with all 86 migrations, including an actual restricted login, concurrent enqueue/run, legal holds, stale proposals, revocation, late acknowledgements, bounded retries and transactional failures. Twelve S3 tests include actual SDK signing/transport boundaries with controlled responses. No live AWS delete or customer file was used. Before operation, verify the deployed revision, real role grants, policy and Object Lock behavior in Staging. [Validation report](../outputs/launch-validation-2026-09-09/knowledge-retention-validation-20260911.json).
