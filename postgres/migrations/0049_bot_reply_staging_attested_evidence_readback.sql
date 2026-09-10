-- Dormant, release-bound read capability for attested Bot reply staging
-- evidence. PUBLIC receives no access; a dedicated verifier role must be
-- introduced and reviewed in a later migration before runtime activation.

CREATE FUNCTION public.read_bot_reply_staging_attested_release_evidence_v1(
  requested_release_id TEXT,
  requested_commit_sha TEXT,
  requested_artifact_digest TEXT
)
RETURNS TABLE (
  "releaseId" TEXT,
  "commitSha" TEXT,
  "artifactDigest" TEXT,
  "evidenceVersion" INTEGER,
  "evidenceDigest" TEXT,
  "evidenceJson" TEXT,
  "evidenceVerifiedAt" TIMESTAMPTZ,
  "evidenceExpiresAt" TIMESTAMPTZ,
  "runStatus" TEXT,
  "runRunKey" TEXT,
  "runClaimVersion" INTEGER,
  "runRequestDigest" TEXT,
  "runReleaseId" TEXT,
  "runCommitSha" TEXT,
  "runArtifactDigest" TEXT,
  "runReceiptJson" TEXT,
  "runReceiptDigest" TEXT,
  "runCompletedAt" TIMESTAMPTZ,
  "noncePolicyVersion" TEXT,
  "nonceKeyId" TEXT,
  "nonceRunKey" TEXT,
  "nonceClaimVersion" INTEGER,
  "nonceRequestDigest" TEXT,
  "nonceReleaseId" TEXT,
  "nonceCommitSha" TEXT,
  "nonceArtifactDigest" TEXT,
  "nonceExpectedEvidenceVersion" INTEGER,
  "nonceReceiptDigest" TEXT,
  "nonceEvidenceCoreDigest" TEXT,
  "nonceAuditKey" TEXT,
  "nonceNonce" TEXT,
  "nonceSequence" INTEGER,
  "nonceIssuedAt" TIMESTAMPTZ,
  "nonceSignedAt" TIMESTAMPTZ,
  "nonceExpiresAt" TIMESTAMPTZ,
  "nonceAttestationPayloadDigest" TEXT,
  "nonceConsumedAt" TIMESTAMPTZ,
  "eventKey" TEXT,
  "eventReleaseId" TEXT,
  "eventCommitSha" TEXT,
  "eventArtifactDigest" TEXT,
  "eventOperationId" TEXT,
  "eventIdempotencyKey" TEXT,
  "eventActorExternalUserId" TEXT,
  "eventExpectedVersion" INTEGER,
  "eventExpectedEvidenceDigest" TEXT,
  "eventPublishedVersion" INTEGER,
  "eventEvidenceDigest" TEXT,
  "eventEvidenceExpiresAt" TIMESTAMPTZ,
  "eventOccurredAt" TIMESTAMPTZ,
  "databaseNow" TIMESTAMPTZ
)
LANGUAGE sql
VOLATILE
STRICT
PARALLEL UNSAFE
ROWS 2
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT
    release_evidence.release_id AS "releaseId",
    release_evidence.commit_sha AS "commitSha",
    release_evidence.artifact_digest AS "artifactDigest",
    release_evidence.evidence_version AS "evidenceVersion",
    release_evidence.evidence_digest AS "evidenceDigest",
    release_evidence.evidence_json AS "evidenceJson",
    release_evidence.verified_at AS "evidenceVerifiedAt",
    release_evidence.expires_at AS "evidenceExpiresAt",
    staging_run.status AS "runStatus",
    staging_run.run_key AS "runRunKey",
    staging_run.claim_version AS "runClaimVersion",
    staging_run.request_digest AS "runRequestDigest",
    staging_run.release_id AS "runReleaseId",
    staging_run.commit_sha AS "runCommitSha",
    staging_run.artifact_digest AS "runArtifactDigest",
    staging_run.receipt_json AS "runReceiptJson",
    staging_run.receipt_digest AS "runReceiptDigest",
    staging_run.completed_at AS "runCompletedAt",
    nonce_claim.policy_version AS "noncePolicyVersion",
    nonce_claim.key_id AS "nonceKeyId",
    nonce_claim.run_key AS "nonceRunKey",
    nonce_claim.claim_version AS "nonceClaimVersion",
    nonce_claim.request_digest AS "nonceRequestDigest",
    nonce_claim.release_id AS "nonceReleaseId",
    nonce_claim.commit_sha AS "nonceCommitSha",
    nonce_claim.artifact_digest AS "nonceArtifactDigest",
    nonce_claim.expected_evidence_version AS
      "nonceExpectedEvidenceVersion",
    nonce_claim.receipt_digest AS "nonceReceiptDigest",
    nonce_claim.evidence_core_digest AS "nonceEvidenceCoreDigest",
    nonce_claim.audit_key AS "nonceAuditKey",
    nonce_claim.nonce AS "nonceNonce",
    nonce_claim.nonce_sequence AS "nonceSequence",
    nonce_claim.issued_at AS "nonceIssuedAt",
    nonce_claim.signed_at AS "nonceSignedAt",
    nonce_claim.expires_at AS "nonceExpiresAt",
    nonce_claim.attestation_payload_digest AS
      "nonceAttestationPayloadDigest",
    nonce_claim.consumed_at AS "nonceConsumedAt",
    operator_event.event_key AS "eventKey",
    operator_event.release_id AS "eventReleaseId",
    operator_event.commit_sha AS "eventCommitSha",
    operator_event.artifact_digest AS "eventArtifactDigest",
    operator_event.operation_id AS "eventOperationId",
    operator_event.idempotency_key AS "eventIdempotencyKey",
    operator_event.actor_external_user_id AS "eventActorExternalUserId",
    operator_event.expected_version AS "eventExpectedVersion",
    operator_event.expected_evidence_digest AS
      "eventExpectedEvidenceDigest",
    operator_event.published_version AS "eventPublishedVersion",
    operator_event.evidence_digest AS "eventEvidenceDigest",
    operator_event.evidence_expires_at AS "eventEvidenceExpiresAt",
    operator_event.occurred_at AS "eventOccurredAt",
    pg_catalog.date_trunc(
      'milliseconds',
      pg_catalog.clock_timestamp()
    ) AS "databaseNow"
  FROM public.bot_reply_staging_release_evidence AS release_evidence
  INNER JOIN public.bot_reply_staging_runs AS staging_run
    ON staging_run.run_key =
      release_evidence.evidence_json::pg_catalog.jsonb #>> '{core,runKey}'
   AND staging_run.release_id = release_evidence.release_id
   AND staging_run.commit_sha = release_evidence.commit_sha
   AND staging_run.artifact_digest = release_evidence.artifact_digest
  INNER JOIN public.bot_reply_staging_attestation_nonces AS nonce_claim
    ON nonce_claim.nonce =
      release_evidence.evidence_json::pg_catalog.jsonb #>>
        '{attestation,nonce}'
   AND nonce_claim.run_key = staging_run.run_key
   AND nonce_claim.claim_version = staging_run.claim_version
   AND nonce_claim.request_digest = staging_run.request_digest
   AND nonce_claim.release_id = release_evidence.release_id
   AND nonce_claim.commit_sha = release_evidence.commit_sha
   AND nonce_claim.artifact_digest = release_evidence.artifact_digest
   AND nonce_claim.receipt_digest = staging_run.receipt_digest
  INNER JOIN public.bot_reply_staging_release_evidence_operator_events
    AS operator_event
    ON operator_event.release_id = release_evidence.release_id
   AND operator_event.commit_sha = release_evidence.commit_sha
   AND operator_event.artifact_digest = release_evidence.artifact_digest
   AND operator_event.expected_version =
      nonce_claim.expected_evidence_version
   AND operator_event.published_version =
      release_evidence.evidence_version
   AND operator_event.evidence_digest = release_evidence.evidence_digest
   AND operator_event.evidence_expires_at = release_evidence.expires_at
   AND operator_event.occurred_at = release_evidence.verified_at
  WHERE release_evidence.release_id = requested_release_id
    AND release_evidence.commit_sha = requested_commit_sha
    AND release_evidence.artifact_digest = requested_artifact_digest
    AND CASE
      WHEN pg_catalog.octet_length(requested_release_id) = 83
      THEN requested_release_id OPERATOR(pg_catalog.~)
        '^connect_release_v1_[a-f0-9]{64}$'
      ELSE FALSE
    END
    AND CASE
      WHEN pg_catalog.octet_length(requested_commit_sha) = 40
      THEN requested_commit_sha OPERATOR(pg_catalog.~) '^[a-f0-9]{40}$'
      ELSE FALSE
    END
    AND CASE
      WHEN pg_catalog.octet_length(requested_artifact_digest) = 71
      THEN requested_artifact_digest OPERATOR(pg_catalog.~)
        '^sha256:[a-f0-9]{64}$'
      ELSE FALSE
    END
  LIMIT 2
$$;

REVOKE ALL ON FUNCTION
  public.read_bot_reply_staging_attested_release_evidence_v1(
    TEXT,
    TEXT,
    TEXT
  )
FROM PUBLIC;

REVOKE ALL ON TABLE public.bot_reply_staging_runs FROM PUBLIC;
REVOKE ALL ON TABLE public.bot_reply_staging_release_evidence FROM PUBLIC;
REVOKE ALL ON TABLE public.bot_reply_staging_attestation_nonces FROM PUBLIC;
REVOKE ALL ON TABLE
  public.bot_reply_staging_release_evidence_operator_events
FROM PUBLIC;

COMMENT ON FUNCTION
  public.read_bot_reply_staging_attested_release_evidence_v1(
    TEXT,
    TEXT,
    TEXT
  )
IS
  'Dormant invoker-rights readback for one exact attested staging release; definer rights and runtime grants require a later reviewed role migration.';
