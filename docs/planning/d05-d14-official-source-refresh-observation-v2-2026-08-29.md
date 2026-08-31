# 1. Connect — D05/D14 official-source refresh observation v2

## 1.1 Identity and boundary

1.1.1 `artifactId=CONNECT-D05-D14-OFFICIAL-SOURCE-REFRESH-OBSERVATION-V2-2026-08-29`.

1.1.2 `observedDate=2026-08-29`; exact trusted observation time=`unknown/unavailable`.

1.1.3 scope=`read-only refresh of official AWS GuardDuty and Railway storage documentation for the D05/D14 planning candidate`.

1.1.4 this observation does not approve a provider, account, Region, purchase, IAM role, Bucket, scan plan, Product change, Git act, Deployment or upload activation.

1.1.5 repository visibility remains `PUBLIC`; `KnowledgeUploads=OFF`; `Gate29=BLOCKED`; development freeze=`ACTIVE`.

## 1.2 Official source set

1.2.1 AWS GuardDuty workflow=`https://docs.aws.amazon.com/guardduty/latest/ug/how-malware-protection-for-s3-gdu-works.html`; observed through the current official page on `2026-08-29`.

1.2.2 AWS EventBridge result contract=`https://docs.aws.amazon.com/guardduty/latest/ug/monitor-with-eventbridge-s3-malware-protection.html`; observed through the current official page on `2026-08-29`.

1.2.3 AWS GuardDuty quotas=`https://docs.aws.amazon.com/guardduty/latest/ug/malware-protection-s3-quotas-guardduty.html`; observed through the current official page on `2026-08-29`.

1.2.4 Railway Storage Buckets=`https://docs.railway.com/storage-buckets`; observed through the current official page on `2026-08-29`.

1.2.5 page publication/revision identifiers and server-issued trusted timestamps were not exposed by the observation path and remain `unknown/unavailable`; live account state was not queried.

## 1.3 Confirmed AWS workflow facts

1.3.1 one Malware Protection plan is created for the selected protected Bucket and may cover the whole Bucket or at most five configured prefixes.

1.3.2 GuardDuty requires an IAM role, receives object-created notifications, reads the object through AWS PrivateLink, scans it in an isolated same-Region environment and publishes the result to the default EventBridge bus.

1.3.3 the current official workflow says the scan environment has no Internet access and the downloaded copy is deleted after scan metadata processing.

1.3.4 potential tag/result values observed are `NO_THREATS_FOUND`, `THREATS_FOUND`, `UNSUPPORTED`, `ACCESS_DENIED` and `FAILED`.

1.3.5 Event delivery is explicitly at-least-once; duplicate delivery is therefore a normal input and Connect must converge idempotently.

1.3.6 plan resource states include Active, Warning and Error; Warning/Error or a missing current plan readback cannot receive release credit.

## 1.4 Confirmed result-envelope facts and new safety conclusion

1.4.1 the current official EventBridge example binds `source`, AWS account, Region, plan resource, schema version, Bucket name, object key, ETag, `versionId`, throttling signal, scan status and scan-result status.

1.4.2 the observed scan-result example does not contain Connect's expected content SHA-256, declared MIME, observed byte length, Upload Intent identity or Tenant identity.

1.4.3 cause and effect: a clean Event alone cannot prove that the bytes approved by Connect are the bytes currently being released.

1.4.4 mandatory release rule=`NO_THREATS_FOUND Event + exact plan/account/Region/Bucket/key/versionId match + authenticated HeadObject/version readback + provider checksum/Connect SHA-256/size/metadata match + active Upload Intent match`.

1.4.5 ETag is treated only as one provider observation; it is never promoted to a universal full-object content digest.

1.4.6 a post-scan tagging failure is an independent failure signal; a clean scan result does not erase a tag/readback failure when the accepted release policy requires that control.

1.4.7 `UNSUPPORTED`, `ACCESS_DENIED`, `FAILED`, `SKIPPED`, Warning, Error, missing, stale, conflicting or unverifiable evidence remains quarantined and fail-closed.

## 1.5 Confirmed quota facts

1.5.1 the current official default maximum object size GuardDuty attempts to scan is `100 GB`.

1.5.2 the current default extraction bounds are `100,000` extracted files and `100` nesting levels.

1.5.3 the current default protected-Bucket quota is `25` per AWS account per Region.

1.5.4 Connect's D06 limit of `10 MiB` for PDF/TXT/DOCX is intentionally stricter and remains the application admission ceiling; a provider's larger maximum never widens Connect policy.

1.5.5 quota observations are documentation facts, not live account quota Evidence; activation requires authorized service-quota and plan readback from the exact selected account/Region.

## 1.6 Confirmed Railway limitation facts

1.6.1 the current Railway Storage Buckets page lists Put/Get/Head/Delete, list, copy, presigned URL, tagging and multipart upload as supported.

1.6.2 the same current page lists server-side encryption, object versioning, Object Lock and Bucket lifecycle configuration as not yet supported.

1.6.3 cause and effect: Railway Buckets cannot satisfy the selected authoritative Knowledge Quarantine, Backup, Restore, Legal Hold and retention-version identity contract without unsupported compensating infrastructure.

1.6.4 Railway Buckets therefore remain rejected for D05/D14 authoritative Data classes under this observed feature set; lower price or simpler co-location does not override missing security/lifecycle invariants.

## 1.7 Planning disposition

1.7.1 the current observation supports retaining `AWS S3 private versioned Buckets + GuardDuty Malware Protection for S3` as the Pilot candidate.

1.7.2 exact AWS account, `il-central-1` opt-in, GuardDuty plan availability, plan ID, IAM role, Bucket/prefix, EventBridge rule, checksum behavior, KMS choice, budget, DPA/residency and Legal approval remain `unknown/unavailable` until authorized live readback.

1.7.3 the D05/D14 candidate still requires a fresh independent Security/Operations/Legal review and exact-root approval; this source refresh gives no Acceptance credit.

1.7.4 activation predicate remains false; upload, parser and AI ingestion paths remain `OFF`.
