# Private media retention and exact-version recovery

1. This local operator path removes S3 media versions whose configured retention period is due. It handles both stored upload receipts and ambiguous uploads with multiple versions. It does not reset an upload, clear scan evidence, read message bodies, or reactivate media. No account provisioning or live deletion is implied by local tests.

1.1 The entry point is `scripts/meta-media-retention.mjs`. It is separate from the Web/API/Worker. Configuration, database URL, inventory, proposals and support evidence belong in the private operator environment. The `sweep` command automatically selects and deletes due versions under an approved tenant policy. Scheduling it is a deployment task; no local cron is installed.

2. Apply ordered PostgreSQL migrations through `0090_meta_media_retention.sql`. A separate identifiable LOGIN needs the following privileges; runtime principals must not inherit it. The operator is trusted operational staff with SQL access, not a customer-facing tenant-isolation boundary.

| Resource | Private operator privilege |
|---|---|
| `public` schema | USAGE |
| `tenants`, `meta_media_upload_jobs` | SELECT, UPDATE (row locks; closure capture) |
| `meta_media_tasks`, `meta_media_cleanup_jobs` | SELECT |
| `meta_media_retention_reviews`, `meta_media_retention_jobs` | SELECT, INSERT, UPDATE |
| `meta_media_retention_authorize_v1(bigint)`, tenant barrier function | EXECUTE |

2.1 An administrator grants the actual `session_user` an expiring tenant scope in `meta_media_retention_grants`. The operator has no write access to this grant table or the event journal, and no schema/role creation, superuser or owner membership. `SET ROLE` does not substitute another authenticated login. Database time determines expiry.

2.2 API/Worker need only SELECT on the new `meta_media_withdrawals` and `meta_media_retention_holds` views, in addition to their existing media capabilities. These projections expose withdrawal keys and held tenant IDs, without private operator identities or evidence digests. Do not grant them direct access to retention tables or the authorization function. The migration creates no automatic runtime/operator grants. Privileged trigger helpers are not executable by PUBLIC, so a login cannot attach them to a temporary table to forge audit events; new media helpers also check their exact trigger relation. The same PUBLIC restriction is applied to existing Knowledge retention trigger helpers.

2.3 `META_MEDIA_RETENTION_DATABASE_URL` accepts a dedicated PostgreSQL URL; a remote host requires one `sslmode=verify-full` parameter. `META_MEDIA_RETENTION_POLICY_JSON` requires exactly `version` (1), `trigger` (`record-created` or `tenant-closed`) and positive integer `retainForDays`. There is no default duration. This media policy is separate from the existing v2 database/Knowledge retention policy; do not change that policy's coverage by implication.

2.4 For record age, the immutable upload creation timestamp is the basis. For closure, the database-owned `knowledge_retention_closed_at` introduced in migration 0085 is reused as the conservative tenant closure timestamp. Reopening clears it; closing again restarts it. An already cancelled tenant without a captured timestamp starts its clock on review. A hold review must cover the current basis. The test-only clock override must never be installed in a deployed environment.

3. Commands accept private, owner-only regular files (0600), not symlinks. Input is at most 64 KiB; external evidence at most 1 MiB. Output creation is exclusive and 0600. The database stores the evidence SHA-256 only. A hash identifies a reviewed document; it does not prove that document's truth. Private operators must review the proposal and exact-version metadata, and cannot treat hand-edited input as provider evidence.

| Command and arguments after the script name | Input |
|---|---|
| `status INPUT` | tenantId, jobKey |
| `review INPUT EVIDENCE CONFIRMATION` | tenantId, expectedVersion (0 initially), legalHold |
| `versions INPUT OUTPUT` | tenantId, jobKey |
| `prepare INPUT OUTPUT` | tenantId, jobKey, objectVersionId |
| `enqueue PROPOSAL EVIDENCE CONFIRM_EXACT_VERSION_DELETION` | unchanged prepared proposal |
| `run INPUT RUN_APPROVED_DELETION` | tenantId, jobKey, objectVersionId |
| `sweep INPUT EVIDENCE RUN_POLICY_RETENTION` | tenantId, afterJobKey (null initially), maximumJobs (1–10) |

3.1 Review confirmation is `APPLY_LEGAL_HOLD` or `CONFIRM_NO_LEGAL_HOLD`, matching the input. `versions` lists at most ten pages of 100 entries under the exact stored key prefix, selects only exact-key object versions, excludes delete markers and fails on incomplete/repeating pagination. The inventory is a point-in-time read; it does not claim all remote copies are permanently gone. Re-run inventory after uncertain or late upload outcomes. Unknown versions are never replaced by `latest` or an unversioned deletion.

3.2 `prepare` performs an exact-version HEAD and checks the expected bucket owner, tenant, original generation, message/source/content metadata, length and KMS key. It checks permission before transport, including after the real SDK credential provider, then rechecks the database snapshot. This verifies recorded object ownership metadata for deletion; it does not claim bytes are clean or rehashed. Each version receives its own proposal. The proposal expires after five minutes and is bound to actor, current snapshot and policy.

3.3 `enqueue` atomically creates the durable version deletion job and its audit, withdrawing the whole upload from use immediately. It rejects active upload/task leases and competing legacy cleanup jobs. Original uploads, receipts, scans and Inbox messages remain unchanged. Late original upload/scan facts remain recordable but cannot restore access. The legacy owner cleanup and inspection retry paths respect withdrawal and holds.

3.4 `run` claims one version for at most ten minutes and rechecks policy, hold review, scope, age and claim before DELETE. No database lock is held across S3 I/O. At most three attempts are allowed, with at least one minute between uncertain outcomes. A blocked attempt needs a fresh review/proposal to resume. A positive acknowledgement remains recordable under the current claim if a hold or authorization changes during transport. A stale claim cannot replace a later attempt. `status` reports only versions present in the private journal, not a global assertion that all S3 versions are absent.

3.5 `sweep` automatically inventories eligible uploads, verifies each exact version, prepares/enqueues new deletion intent and runs due claims. The supplied document digest must match the current tenant hold review. Each call processes at most ten upload keys and twenty versions. Persist and follow `nextJobKey`; `cycleComplete` means the database candidate traversal finished, not proof that every remote object was deleted. On a version-budget stop, the cursor deliberately resumes the same upload; removed versions are skipped. Restart with a null cursor for a new policy cycle, including late versions. Existing blocked jobs never have their attempt count reset automatically. Every inventory/prepare/enqueue/dispatch retains the manual path's authorization checks. Use the recorded journal and per-key results to resolve unknown or blocked outcomes.

4. `versions`/`prepare` use the existing media quarantine environment and a private read identity with the six bucket-control checks, `s3:ListBucketVersions` and `s3:GetObjectVersion`, restricted to the required bucket/prefix. HEAD does not enable checksum mode or retrieve content. `run` uses a separate deletion identity with the bucket-control checks and `s3:DeleteObjectVersion`. An automated private `sweep` identity needs both of those capability sets and must remain separate from ordinary API/Worker identities. Neither identity needs upload, tag mutation, unversioned delete or Object Lock bypass. Restrict AWS credentials independently from the database scope.

4.1 Delete rejection (including Object Lock) blocks the job. Uncertain transport results retain withdrawal and retry only the same version. Shutdown or unresolved timed-out SDK requests cannot be reused for another storage operation. The same stored intent and `ExpectedBucketOwner` are used throughout.

4.2 Official AWS references checked on 12.09.2026: [HeadObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html), [ListObjectVersions](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectVersions.html), [DeleteObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html). Account IAM, bucket configuration, retention duration and live acceptance still belong to the connection/Staging phase.
