# Knowledge ingestion runtime — R211, 2026-09-11

The Vercel server action now uses the authenticated Railway API. `ai.knowledge.upload` resolves the tenant from the verified session, consumes the tenant mutation limiter and atomically writes a deterministic request receipt, source registration, audit and private PostgreSQL relay job. There is no D1/R2 fallback in this action.

## Product scope

- UTF-8 TXT (`text/plain`) and Markdown (`text/markdown`), 1–131,072 bytes per file. PDF, Office, archives, link fetching, markup execution and OCR are not supported. Markdown is plain text for retrieval, never executable instructions.
- The 128 KiB relay fits the existing 256 KiB API envelope. Base64 segments are at most 16 KiB each; their canonical encoding and decoded length are checked again on the API. They form one atomic upload.
- At most 10 unfinished uploads and 100 retained upload jobs per tenant. These are Connect launch bounds, not AWS quotas. Source records remain content-addressed within their tenant; exact resubmission returns the existing source without a second upload.
- The UI offers file selection, submission and manual status refresh in Hebrew, English and Arabic. Only ready sources are selectable. There is no progress percentage based on estimated provider work.

## Durable processing

1. `knowledge_ingestion_jobs` stores the bounded private payload and immutable tenant, actor, digest, media type, size, bucket, key and KMS binding. Raw relay bytes are never included in API responses or audit metadata.
2. A five-minute fenced lease is claimed under the shared tenant authorization barrier. Current tenant and uploading actor must still permit `ai.write`. Expired preparation can be reclaimed; an expired uploading claim becomes unknown.
3. Before PUT, the worker commits an uploading marker. Lost commit acknowledgement results in zero PUT from that invocation and inspection-only recovery. No automatic PUT retry is allowed after the marker.
4. S3 receives create-only `If-None-Match: *`, SHA-256, explicit owner and exact KMS key, private attachment metadata and a tenant-specific `quarantine/knowledge/v1/` key. SDK retries and generated invocation IDs are disabled. Authorization runs again after credential resolution and signing, before transport.
5. Confirmed PUT preserves its explicit, non-null `VersionId`. If the reply was lost, bounded version enumeration must find exactly one matching version and no deletion markers. An empty or ambiguous listing does not authorize another PUT.
6. Only the protected `GuardDutyMalwareScanStatus=NO_THREATS_FOUND` tag permits an exact-version GET. The body reader checks owner, version, complete-object SHA-256, length, metadata, encryption and bounds; it then checks the tag and authorization again. An inferred version is not recorded as a recovered receipt until these checks pass.
7. The UTF-8 extractor creates deterministic passages. A single PostgreSQL transaction marks the job ready and stores the exact passages/source readiness. Database guards reject changed upload identity, changed relay bytes, replacement versions and premature readiness.
8. Missing tags defer inspection by 30 seconds. Non-clean scan results and invalid content reject the source. Lease-expired or unfinished jobs become eligible for rejection and relay-byte removal after seven days **when the enabled worker runs**. This is not a wall-clock retention guarantee while workers are disabled.

## Configuration and account connection later

API and Worker must both receive `KNOWLEDGE_ENABLED=true` and all of:

- `KNOWLEDGE_S3_REGION`
- `KNOWLEDGE_S3_BUCKET`
- `KNOWLEDGE_S3_ACCOUNT_ID`
- `KNOWLEDGE_S3_KMS_KEY_ARN`
- `KNOWLEDGE_S3_SCANNER_ROLE_ARN`

No region, bucket, account, role, key or credentials are defaulted. The AWS SDK uses its configured deployment credential chain. Keep Worker credentials separate from the GuardDuty scanner role. The API only enqueues; it does not need S3 write/read permission. The flag defaults to disabled; malformed enabled configuration fails startup.

Provision a regular regional versioned AWS S3 bucket with all public-access blocks, BucketOwnerEnforced ownership and exact KMS default encryption. Apply `requiredKnowledgeQuarantineBucketPolicy(config)` as mandatory denies in addition to separately reviewed IAM grants. That policy prevents unscanned reads and protects verdict tags from application principals. A media-history prefix alone does not protect the Knowledge prefix. Enable GuardDuty protection **with tagging before the first upload**, grant the scanner the required S3/KMS permissions, and verify the configured prefix and role in the live account. Read/write adapters recheck the bucket controls and policy; they do not themselves provision or prove the GuardDuty protection plan.

AWS documents [conditional-write enforcement](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes-enforce.html), [GuardDuty tagging and results](https://docs.aws.amazon.com/guardduty/latest/ug/how-malware-protection-for-s3-gdu-works.html) and [tag-based access control](https://docs.aws.amazon.com/guardduty/latest/ug/tag-based-access-s3-malware-protection.html). These were checked on 2026-09-11. A stored clean observation is not a guarantee that an object remains available or harmless indefinitely.

## Limits and operational follow-up

- Unknown uploads do not reset automatically. In-flight completion may arrive late; persisted locators remain available even after rejection. Terminal rejection does not silently start another S3 version on same-content resubmission.
- S3 exact-version retention/deletion is implemented locally in R218 through a [separate private operator workflow](knowledge-object-retention.md). Handling a rejected source after provider configuration repair and operational reconciliation of unknown outcomes remain C4.1.2 tasks. PostgreSQL relay expiry is separate from S3 retention. Never delete an object merely because one listing was empty or one scan is pending.
- Local tests use existing isolated fixtures and SDK protocol responses. No live AWS/GuardDuty account, deployment, credentials or customer file has been exercised. Live upload/scan acceptance remains part of the final connection phase.
