import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const verifierUrl = new URL(
  "../scripts/verify-bot-reply-staging-attested-evidence-postgres.mjs",
  import.meta.url,
);

async function serverTypeScriptFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryUrl = new URL(entry.name, directoryUrl);
    if (entry.isDirectory()) {
      files.push(...await serverTypeScriptFiles(new URL(`${entry.name}/`, directoryUrl)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryUrl);
    }
  }
  return files;
}

test("declares the exact dormant PostgreSQL 16 attested evidence verifier", async () => {
  const source = await readFile(verifierUrl, "utf8");

  assert.match(
    source,
    /export async function verifyBotReplyStagingAttestedEvidencePostgres\(\s*pool,\s*transactions,\s*tenantId,/,
  );
  assert.match(
    source,
    /postgresBotReplyStagingAttestedReleaseEvidenceRepository\.ts/,
  );
  assert.match(
    source,
    /railwayBotReplyStagingAttestedReleaseEvidence\.ts/,
  );
  assert.match(source, /railwayBotReplyStagingReceiptAttestationSigner\.ts/);
  assert.match(source, /Published RFC 8032 test vector 1/);
  assert.match(source, /attestedEvidenceScenarioCount = 2/);
  assert.match(source, /return attestedEvidenceScenarioCount/);
  assert.match(source, /current_setting\('server_version'\)/);
  assert.match(source, /assert\.match\(result\.rows\[0\]\?\.version, \/\^16/);
  assert.doesNotMatch(source, /Math\.random|randomUUID|crypto\.randomUUID/);
});

test("pins concurrency, replay, conflict, rollback, and PUBLIC denial", async () => {
  const source = await readFile(verifierUrl, "utf8");

  assert.match(source, /Promise\.all\(\[/);
  assert.match(source, /\["replayed", "stored"\]/);
  assert.match(source, /\["consumed", "replayed"\]/);
  assert.match(source, /const replay = await repository\.publishAttestedEvidence/);
  assert.match(source, /const changedIssued = issueEvidence/);
  assert.match(source, /changedNonce\.rows, \[\{ count: 0 \}\]/);
  assert.match(source, /aa_connect_verify_0048_force_conflict/);
  assert.match(source, /RETURN NULL/);
  assert.match(source, /nonceCount: 0,[\s\S]*releaseCount: 0,[\s\S]*eventCount: 0/);
  assert.match(source, /has_function_privilege\(/);
  assert.match(source, /pg_catalog\.pg_get_function_result/);
  assert.match(source, /pg_catalog\.aclexplode/);
  assert.match(source, /securityDefiner: false/);
  assert.match(source, /parallelUnsafe: true/);
  assert.match(source, /rowsTwo: true/);
  assert.match(source, /lockedSearchPath: true/);
  assert.match(source, /ownerOnlyExecute: true/);
  assert.match(source, /outerExecute: false/);
  assert.match(source, /nonceExecute: false/);
  assert.match(source, /publisherExecute: false/);
  assert.match(source, /readbackExecute: false/);
  assert.match(source, /public\.bot_reply_staging_runs/);
  assert.match(source, /protectedTableAccess: false/);
});

test("pins the existing v1 release evidence upgrade to v2 and replay", async () => {
  const source = await readFile(verifierUrl, "utf8");

  assert.match(source, /async function seedVersionOneEvidence/);
  assert.match(
    source,
    /bot_reply_staging_cross_service_evidence_v1_/,
  );
  assert.match(source, /evidence_version,[\s\S]*1, \$4, \$5/);
  assert.match(source, /async function verifyVersionOneUpgrade/);
  assert.match(source, /issueEvidence\(fixture, "0", 1\)/);
  assert.match(
    source,
    /const command = publishCommand\(\s*fixture,\s*issued,\s*"d",\s*versionOneDigest,\s*\);/,
  );
  assert.match(source, /assert\.equal\(stored\.version, 2\)/);
  assert.match(source, /assert\.equal\(replay\.version, 2\)/);
  assert.match(source, /assert\.deepEqual\(replay\.event, stored\.event\)/);
  assert.match(
    source,
    /expected_version = 1[\s\S]*expected_evidence_digest = \$2[\s\S]*published_version = 2/,
  );
  assert.match(
    source,
    /evidenceDigest: issued\.evidence\.evidenceDigest,[\s\S]*nonceCount: 1,[\s\S]*eventCount: 1/,
  );
  assert.match(source, /await verifyVersionOneUpgrade/);
});

test("reads the published v2 PostgreSQL proof and keeps cutover blocked", async () => {
  const source = await readFile(verifierUrl, "utf8");

  assert.match(source, /nodePostgresAdapter\.ts/);
  assert.match(
    source,
    /postgresBotReplyStagingAttestedReleaseEvidenceReadRepository\.ts/,
  );
  assert.match(
    source,
    /botReplyStagingAttestedReleaseCutoverReadiness\.ts/,
  );
  assert.match(source, /async function verifyReadOnlyCutoverRemainsBlocked/);
  assert.match(source, /createNodePostgresQueryExecutor\(pool\)/);
  assert.match(source, /const verifiedEvidence = await readRepository\.readVerified\(\)/);
  assert.match(
    source,
    /status: "verified",[\s\S]*evidenceSchemaVersion: 2,[\s\S]*replayProtected: true/,
  );
  assert.match(
    source,
    /evaluateBotReplyStagingAttestedReleaseCutoverReadiness\(\s*verifiedEvidence,\s*\)/,
  );
  assert.match(source, /readiness\.code, "CAPABILITY_ROLES_REQUIRED"/);
  assert.match(source, /readiness\.activationAllowed, false/);
  assert.match(
    source,
    /assert\.equal\(replay\.replayProtected, true\);[\s\S]*await verifyReadOnlyCutoverRemainsBlocked\(pool, fixture, issued\)/,
  );
  assert.doesNotMatch(source, /activationAllowed, true/);
});

test("keeps the live verifier outside every production server module", async () => {
  const files = await serverTypeScriptFiles(
    new URL("../server/", import.meta.url),
  );
  const forbidden =
    /verifyBotReplyStagingAttestedEvidencePostgres|verify-bot-reply-staging-attested-evidence-postgres/;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, forbidden, file.pathname);
  }
});
