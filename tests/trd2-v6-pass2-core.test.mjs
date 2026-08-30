import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  TRD2_V6_PASS2_PATHS,
  TRD2_V6_PASS2_TOOLCHAIN_PATHS,
  TRD2_V6_PASS2_TOOLCHAIN_REGISTRY_PATH,
  TRD2_V6_SCHEMA_FAMILIES,
  makeCanonicalEngineReport,
  makeClosedSchemaRegistry,
  makeSchemaCatalog,
  pass2ToolchainRoot,
  validateCanonicalEngineReport,
  validateClosedSchemaRegistry,
  validatePass2ToolchainRegistry,
} from '../scripts/trd2-v6-pass2-core.mjs';
import { attachContentIdentity, canonicalV6 } from '../scripts/trd2-v6-core.mjs';

function provenance() {
  const observedHead = '1'.repeat(40);
  const toolchain = TRD2_V6_PASS2_TOOLCHAIN_PATHS.map((logicalPath) => ({
    byteLength: 1,
    logicalPath,
    observedCommit: observedHead,
    sha256: '2'.repeat(64),
  }));
  return {
    observedHead,
    observedObjectFormat: 'sha1',
    outputRegistrySha256: '3'.repeat(64),
    parserCorpusRoot: '4'.repeat(64),
    pass1QaRoot: '5'.repeat(64),
    sourceCaptureRoot: '6'.repeat(64),
    toolchain,
    toolchainRegistrySha256: '7'.repeat(64),
    toolchainRoot: pass2ToolchainRoot(toolchain),
  };
}

test('Pass 2 catalog closes every declared family with six exact oracle fixtures', () => {
  const catalog = makeSchemaCatalog();
  assert.equal(TRD2_V6_SCHEMA_FAMILIES.length, 53);
  assert.equal(catalog.schemas.length, 53);
  assert.equal(catalog.fixtures.length, 318);
  for (const schema of catalog.schemas) {
    const fixtures = catalog.fixtures.filter(({ schemaId }) => schemaId === schema.schemaId);
    assert.deepEqual(fixtures.map(({ mutation }) => mutation), [
      'POSITIVE',
      'UNKNOWN-FIELD',
      'MISSING-FIELD',
      'TYPE-MISMATCH',
      'CONST-MISMATCH',
      'CONTENT-IDENTITY-MISMATCH',
    ]);
    assert.equal(new Set(schema.fields.map(({ name }) => name)).size, schema.fields.length);
  }
});

test('critical safety families expose their complete v6 fields without parallel short schemas', () => {
  const byFamily = new Map(makeSchemaCatalog().schemas.map((schema) => [schema.family, schema]));
  const names = (family) => new Set(byFamily.get(family).fields.map(({ name }) => name));
  for (const required of ['candidateIdentityRoots', 'providerConfirmedRoots', 'authorizedDeleteRoots', 'excludedActiveRoots', 'excludedHoldRoots', 'expectedHeadsRoot', 'fence', 'expiresAt']) assert.equal(names('RETENTION-PLAN').has(required), true, required);
  for (const required of ['sourceSnapshotRoot', 'objectVersionRoots', 'inventoryRoot', 'consistencyProofRoot', 'retentionBoundaryObservedAt']) assert.equal(names('BACKUP-EVIDENCE').has(required), true, required);
  for (const required of ['backupEvidenceRoot', 'restoredObjectVersionRoots', 'privacyObligationRoots', 'redeleteReceiptRoots', 'privacyReplayState', 'activationState']) assert.equal(names('RESTORE-EVIDENCE').has(required), true, required);
  for (const required of ['triggerPredicateRoot', 'triggerEvidenceRoot', 'authorityRoot', 'appointmentRoot', 'trustedTimeRoot', 'expectedHead', 'fence']) assert.equal(names('SEVERITY-EVENT').has(required), true, required);
});

test('closed registry validates all 53 schemas and all 318 actual byte fixtures', () => {
  const registry = makeClosedSchemaRegistry(provenance());
  validateClosedSchemaRegistry(registry);
  assert.equal(registry.schemaCount, 53);
  assert.equal(registry.fixtureCount, 318);
  assert.equal(registry.fixtures.every(({ bytesBase64, byteLength }) => Buffer.from(bytesBase64, 'base64').length === byteLength), true);
});

test('registry canonical profile fixes control escapes, key order, NFC and unknown-field behavior', () => {
  const registry = makeClosedSchemaRegistry(provenance());
  assert.equal(registry.canonicalProfile.unknownFieldRule, 'REJECT-UNKNOWN-FIELD');
  assert.equal(registry.canonicalProfile.objectKeyOrder, 'ASCENDING-UTF8-BYTE-ORDER');
  assert.equal(registry.canonicalProfile.normalization, 'NFC');
  assert.equal(canonicalV6({ z: '\n', a: '\b' }), '{"a":"\\b","z":"\\n"}');
});

test('Canonical Engine A report binds every fixture and rejects an authenticated undeclared outcome field', () => {
  const registry = makeClosedSchemaRegistry(provenance());
  const report = makeCanonicalEngineReport({
    engineId: 'CANONICAL-ENGINE-A',
    implementation: 'NODE-TEST-ENGINE',
    registry,
    sourceSha256: '8'.repeat(64),
  });
  validateCanonicalEngineReport(report, registry);
  assert.equal(report.mismatchCount, 0);
  assert.equal(report.outcomes.length, 318);
  const body = structuredClone(report);
  delete body.artifactId;
  delete body.artifactRoot;
  body.outcomes[0].undeclared = true;
  const weakened = attachContentIdentity('TRD2V6-CANONICAL-REPORT', 'CANONICAL-ENGINE-REPORT', report.schemaVersion, body);
  assert.throws(() => validateCanonicalEngineReport(weakened, registry), /exact keys mismatch/);
});

test('Pass 2 path registry freezes three emitted paths and every toolchain member exists', () => {
  const registry = validatePass2ToolchainRegistry(JSON.parse(fs.readFileSync(TRD2_V6_PASS2_TOOLCHAIN_REGISTRY_PATH, 'utf8')));
  assert.deepEqual(registry.passTwoEmittedPaths, TRD2_V6_PASS2_PATHS);
  assert.deepEqual(registry.toolchainPaths, TRD2_V6_PASS2_TOOLCHAIN_PATHS);
  for (const logicalPath of registry.toolchainPaths) assert.equal(fs.existsSync(logicalPath), true, logicalPath);
});

test('Pass 2 worktree guards enumerate individual files inside untracked directories', () => {
  for (const logicalPath of [
    'scripts/create-trd2-v6-pass2-candidate.mjs',
    'scripts/verify-trd2-v6-canonical-engine-a.mjs',
    'scripts/verify-trd2-v6-canonical-engine-b.py',
    'scripts/verify-trd2-v6-pass2-candidate.mjs',
  ]) assert.match(fs.readFileSync(logicalPath, 'utf8'), /--untracked-files=all/, logicalPath);
});

test('Pass 2 toolchain contains no forbidden random source', () => {
  for (const logicalPath of TRD2_V6_PASS2_TOOLCHAIN_PATHS.filter((candidate) => candidate.endsWith('.mjs') || candidate.endsWith('.py'))) {
    const source = fs.readFileSync(logicalPath, 'utf8');
    assert.equal(source.includes('Math' + '.random('), false, logicalPath);
    assert.equal(source.includes('crypto' + '.randomUUID('), false, logicalPath);
  }
});
