import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../postgres/migrations/0049_bot_reply_staging_attested_evidence_readback.sql",
  import.meta.url,
);

const expectedReturnColumns = Object.freeze([
  "releaseId",
  "commitSha",
  "artifactDigest",
  "evidenceVersion",
  "evidenceDigest",
  "evidenceJson",
  "evidenceVerifiedAt",
  "evidenceExpiresAt",
  "runStatus",
  "runRunKey",
  "runClaimVersion",
  "runRequestDigest",
  "runReleaseId",
  "runCommitSha",
  "runArtifactDigest",
  "runReceiptJson",
  "runReceiptDigest",
  "runCompletedAt",
  "noncePolicyVersion",
  "nonceKeyId",
  "nonceRunKey",
  "nonceClaimVersion",
  "nonceRequestDigest",
  "nonceReleaseId",
  "nonceCommitSha",
  "nonceArtifactDigest",
  "nonceExpectedEvidenceVersion",
  "nonceReceiptDigest",
  "nonceEvidenceCoreDigest",
  "nonceAuditKey",
  "nonceNonce",
  "nonceSequence",
  "nonceIssuedAt",
  "nonceSignedAt",
  "nonceExpiresAt",
  "nonceAttestationPayloadDigest",
  "nonceConsumedAt",
  "eventKey",
  "eventReleaseId",
  "eventCommitSha",
  "eventArtifactDigest",
  "eventOperationId",
  "eventIdempotencyKey",
  "eventActorExternalUserId",
  "eventExpectedVersion",
  "eventExpectedEvidenceDigest",
  "eventPublishedVersion",
  "eventEvidenceDigest",
  "eventEvidenceExpiresAt",
  "eventOccurredAt",
  "databaseNow",
]);
const integerReturnColumns = new Set([
  "evidenceVersion",
  "runClaimVersion",
  "nonceClaimVersion",
  "nonceExpectedEvidenceVersion",
  "nonceSequence",
  "eventExpectedVersion",
  "eventPublishedVersion",
]);
const timestampReturnColumns = new Set([
  "evidenceVerifiedAt",
  "evidenceExpiresAt",
  "runCompletedAt",
  "nonceIssuedAt",
  "nonceSignedAt",
  "nonceExpiresAt",
  "nonceConsumedAt",
  "eventEvidenceExpiresAt",
  "eventOccurredAt",
  "databaseNow",
]);

async function readMigration() {
  return readFile(migrationUrl, "utf8");
}

test("returns the exact 51-column verifier contract", async () => {
  const source = await readMigration();
  const returnTable = source.match(
    /RETURNS TABLE \(([\s\S]*?)\)\s*LANGUAGE sql/,
  )?.[1];

  assert.equal(typeof returnTable, "string");
  const contract = Array.from(
    returnTable.matchAll(
      /"([A-Za-z][A-Za-z0-9]*)"\s+(TEXT|INTEGER|TIMESTAMPTZ)/g,
    ),
    (match) => Object.freeze({ name: match[1], type: match[2] }),
  );
  assert.equal(contract.length, 51);
  assert.deepEqual(
    contract,
    expectedReturnColumns.map((name) => Object.freeze({
      name,
      type: integerReturnColumns.has(name)
        ? "INTEGER"
        : timestampReturnColumns.has(name)
          ? "TIMESTAMPTZ"
          : "TEXT",
    })),
  );

  for (const column of expectedReturnColumns) {
    assert.match(source, new RegExp(`AS\\s+"${column}"(?:,|\\n)`));
  }
});

test("locks the invoker search path and exact release identity", async () => {
  const source = await readMigration();

  assert.match(
    source,
    /LANGUAGE sql\s+VOLATILE\s+STRICT\s+PARALLEL UNSAFE\s+ROWS 2\s+SECURITY INVOKER\s+SET search_path = pg_catalog, pg_temp/,
  );
  assert.match(source, /pg_catalog\.clock_timestamp\(\)/);
  assert.match(source, /pg_catalog\.date_trunc\(/);
  assert.match(source, /evidence_json::pg_catalog\.jsonb/);

  for (const identityColumn of [
    "release_id",
    "commit_sha",
    "artifact_digest",
  ]) {
    assert.match(
      source,
      new RegExp(
        `staging_run\\.${identityColumn} = release_evidence\\.${identityColumn}`,
      ),
    );
    assert.match(
      source,
      new RegExp(
        `nonce_claim\\.${identityColumn} = release_evidence\\.${identityColumn}`,
      ),
    );
    assert.match(
      source,
      new RegExp(
        `operator_event\\.${identityColumn} = release_evidence\\.${identityColumn}`,
      ),
    );
  }

  assert.match(
    source,
    /WHERE release_evidence\.release_id = requested_release_id[\s\S]*release_evidence\.commit_sha = requested_commit_sha[\s\S]*release_evidence\.artifact_digest = requested_artifact_digest[\s\S]*LIMIT 2/,
  );
  assert.match(
    source,
    /requested_release_id OPERATOR\(pg_catalog\.~\)[\s\S]*connect_release_v1_[\s\S]*requested_commit_sha OPERATOR\(pg_catalog\.~\)[\s\S]*requested_artifact_digest OPERATOR\(pg_catalog\.~\)[\s\S]*sha256:/,
  );
  assert.match(
    source,
    /octet_length\(requested_release_id\) = 83[\s\S]*octet_length\(requested_commit_sha\) = 40[\s\S]*octet_length\(requested_artifact_digest\) = 71/,
  );
});

test("keeps readback dormant and denies PUBLIC access", async () => {
  const source = await readMigration();
  const securityInvokerIndex = source.indexOf("\nSECURITY INVOKER\n");
  const publicRevocationIndexes = Array.from(
    source.matchAll(/FROM PUBLIC;/g),
    (match) => match.index,
  );

  assert.match(
    source,
    /REVOKE ALL ON FUNCTION[\s\S]*read_bot_reply_staging_attested_release_evidence_v1\([\s\S]*FROM PUBLIC/,
  );
  for (const table of [
    "bot_reply_staging_runs",
    "bot_reply_staging_release_evidence",
    "bot_reply_staging_attestation_nonces",
    "bot_reply_staging_release_evidence_operator_events",
  ]) {
    assert.match(
      source,
      new RegExp(`REVOKE ALL ON TABLE[\\s\\S]{0,120}public\\.${table}[\\s\\S]{0,40}FROM PUBLIC`),
    );
  }
  assert.equal(publicRevocationIndexes.length, 5);
  assert.equal(securityInvokerIndex > 0, true);
  assert.equal(
    publicRevocationIndexes.every((index) => index > securityInvokerIndex),
    true,
  );
  assert.doesNotMatch(source, /\bSECURITY DEFINER\b|\bALTER FUNCTION\b/);

  assert.doesNotMatch(
    source,
    /\b(?:CREATE ROLE|ALTER ROLE|GRANT|INSERT|UPDATE|DELETE|MERGE|CALL)\b/i,
  );
  assert.doesNotMatch(source, /\bEXECUTE\s+FORMAT\b|\bEXECUTE\s+IMMEDIATE\b/i);
  assert.equal((source.match(/\bSELECT\b/g) ?? []).length, 1);
});
