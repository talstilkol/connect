import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  applyPlanningCas,
  applyPlanningRecovery,
  canonical,
  contentRoot,
  evaluateAcceptanceGate,
  evaluateCausalTrace,
  makeB0V8Registry,
  makeProtocolCasVector,
  makeProtocolRecoveryVector,
  makeProtocolTrace,
  makeRoot,
  readPlanningCasResult,
  readRegularFileNoFollow,
  runB0V8MutationCampaign,
  validateB0V8Registry,
  validatePackageManifest,
} from '../scripts/b0-v8-core.mjs';

function clone(value) {
  return structuredClone(value);
}

function expectBlocked(action, pattern) {
  assert.throws(action, pattern);
}

test('canonical JSON is deterministic and rejects unsafe values', () => {
  assert.equal(canonical({ z: 1, a: ['x', true] }), '{"a":["x",true],"z":1}');
  expectBlocked(() => canonical(Number.MAX_SAFE_INTEGER + 1), /safe integers/);
  expectBlocked(() => canonical('\ud800'), /unpaired high surrogate/);
});

test('B0 v8 registry is closed and cannot overstate current evidence', () => {
  const registry = makeB0V8Registry();
  assert.equal(validateB0V8Registry(registry), registry);
  const extra = clone(registry);
  extra.unexpected = true;
  expectBlocked(() => validateB0V8Registry(extra), /exact keys mismatch/);
  const accepted = clone(registry);
  accepted.currentState.b0 = 'PRESENT';
  expectBlocked(() => validateB0V8Registry(accepted), /unsafe current-state claim/);
  const weakRecovery = clone(registry);
  weakRecovery.recoveryPolicy.memberCount = 3;
  expectBlocked(() => validateB0V8Registry(weakRecovery), /Recovery policy weakened/);
  const selfAcceptance = clone(registry);
  selfAcceptance.noSelfAcceptancePolicy.producerPassCreatesAcceptance = true;
  expectBlocked(() => validateB0V8Registry(selfAcceptance), /no-self-Acceptance weakened/);
});

test('mutation campaign blocks one case for every v7 hostile finding', () => {
  const rows = runB0V8MutationCampaign();
  assert.equal(rows.length, 14);
  assert.equal(new Set(rows.map((row) => row.findingId)).size, 14);
  assert.ok(rows.every((row) => row.actual === 'BLOCK'));
});

test('source reader rejects traversal, symlink and hard-link substitution', () => {
  const testRoot = `/private/tmp/connect-b0-v8-core-test-${process.pid}`;
  if (fs.existsSync(testRoot)) fs.rmSync(testRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(testRoot, 'docs', 'planning'), { recursive: true });
  const source = path.join(testRoot, 'docs', 'planning', 'source.txt');
  fs.writeFileSync(source, 'frozen-source\n', 'utf8');
  const fact = readRegularFileNoFollow(testRoot, 'docs/planning/source.txt', 1024);
  assert.equal(fact.byteLength, 14);
  expectBlocked(() => readRegularFileNoFollow(testRoot, 'docs/planning/../source.txt'), /traversal/);
  fs.symlinkSync(source, path.join(testRoot, 'docs', 'planning', 'link.txt'));
  expectBlocked(() => readRegularFileNoFollow(testRoot, 'docs/planning/link.txt'), /symlink rejected/);
  fs.linkSync(source, path.join(testRoot, 'docs', 'planning', 'hard.txt'));
  expectBlocked(() => readRegularFileNoFollow(testRoot, 'docs/planning/source.txt'), /hard-linked file rejected/);
  fs.rmSync(testRoot, { recursive: true, force: true });
});

test('CAS commits exact state once and supports authoritative response-loss readback', () => {
  const vector = makeProtocolCasVector();
  const committed = applyPlanningCas(vector.state, vector.attempt);
  assert.equal(committed.status, 'COMMITTED');
  assert.equal(committed.state.attemptLedger.length, 1);
  assert.equal(committed.state.outbox.length, 1);
  assert.equal(committed.state.consumedPermits.length, 1);
  assert.equal(committed.state.replayLedger.length, 1);
  const retry = applyPlanningCas(committed.state, vector.attempt);
  assert.equal(retry.status, 'ALREADY-COMMITTED');
  assert.deepEqual(retry.state, committed.state);
  const readback = readPlanningCasResult(committed.state, vector.attempt.attemptId, vector.attempt.requestRoot);
  assert.equal(readback.status, 'COMMITTED');
  assert.equal(readback.receipt.commitReceiptRoot, committed.receipt.commitReceiptRoot);
});

test('CAS blocks stale, unbound, expired and conflicting attempts without mutating source state', () => {
  const cases = [
    ['stale', (vector) => { vector.attempt.expectedRevision = 0; }, /stale read set/],
    ['self-context', (vector) => { vector.attempt.acceptanceContextReceipt.contextRoot = makeRoot('ATTACKER-CONTEXT'); }, /not detached\/current/],
    ['unbound-signature', (vector) => { vector.attempt.signatureVerificationReceipt.payloadRoot = makeRoot('OTHER-PERMIT'); }, /does not bind/],
    ['expired', (vector) => { vector.attempt.trustedTimeReceipt.trustedInstant = '2026-08-31T00:00:00Z'; vector.attempt.trustedTimeReceipt.receipt.payloadRoot = contentRoot('CONNECT-B0-V8-TRUSTED-INSTANT-V1', { trustedInstant: vector.attempt.trustedTimeReceipt.trustedInstant }); }, /outside trusted time/],
  ];
  for (const [, mutate, pattern] of cases) {
    const vector = makeProtocolCasVector();
    const before = canonical(vector.state);
    mutate(vector);
    expectBlocked(() => applyPlanningCas(vector.state, vector.attempt), pattern);
    assert.equal(canonical(vector.state), before);
  }
  const vector = makeProtocolCasVector();
  const committed = applyPlanningCas(vector.state, vector.attempt);
  const conflict = clone(vector.attempt);
  conflict.requestRoot = makeRoot('CONFLICTING-REQUEST');
  expectBlocked(() => applyPlanningCas(committed.state, conflict), /attempt identity conflict/);
});

test('Recovery requires exact 3-of-5 controller-separated quorum and atomic rotation', () => {
  const vector = makeProtocolRecoveryVector();
  const committed = applyPlanningRecovery(vector.state, vector.request);
  assert.equal(committed.status, 'COMMITTED');
  assert.equal(committed.state.activeAuthorityRoot, vector.request.newAuthorityRoot);
  assert.deepEqual(committed.state.revokedAuthorityRoots, [vector.state.activeAuthorityRoot]);
  assert.deepEqual(committed.state.consumedAttemptIds, [vector.request.attemptId]);
  assert.notEqual(committed.state.recoveryHeadRoot, vector.state.recoveryHeadRoot);

  const duplicateController = makeProtocolRecoveryVector();
  duplicateController.request.memberAppointments[1].controllerRoot = duplicateController.request.memberAppointments[0].controllerRoot;
  expectBlocked(() => applyPlanningRecovery(duplicateController.state, duplicateController.request), /controllers must be unique/);
  const duplicateAck = makeProtocolRecoveryVector();
  duplicateAck.request.acknowledgements[1].memberIdentityId = duplicateAck.request.acknowledgements[0].memberIdentityId;
  expectBlocked(() => applyPlanningRecovery(duplicateAck.state, duplicateAck.request), /duplicate acknowledgement/);
  const witnessOverlap = makeProtocolRecoveryVector();
  witnessOverlap.request.witnessAppointments[0].controllerRoot = witnessOverlap.request.memberAppointments[0].controllerRoot;
  expectBlocked(() => applyPlanningRecovery(witnessOverlap.state, witnessOverlap.request), /witness\/member controller overlap/);
});

test('global trace is causal and current state cannot self-credit', () => {
  const trace = makeProtocolTrace();
  assert.equal(evaluateCausalTrace(trace).conjunctCount, 6);
  expectBlocked(() => evaluateCausalTrace(trace.slice(0, 5)), /missing, extra or reordered/);
  const reordered = clone(trace);
  [reordered[1], reordered[2]] = [reordered[2], reordered[1]];
  expectBlocked(() => evaluateCausalTrace(reordered), /missing, extra or reordered/);
  const controller = makeRoot('TAL-CURRENT-CONTROLLER');
  const gate = evaluateAcceptanceGate({
    producerControllerRoot: controller,
    readerControllerRoots: [controller, makeRoot('SECOND-READER')],
    remoteReceiptPresent: false,
    predecessorOracleComplete: false,
    trustedTimePresent: false,
  });
  assert.deepEqual(gate, { status: 'BLOCKED', reason: 'CONTROLLER-SEPARATION-ABSENT' });
});

test('package manifest enforces exact unique inventory and total budget', () => {
  const members = [
    { bytes: 10, logicalPath: 'docs/planning/a.json', ordinal: 1, role: 'B0V8-MEMBER-A', sha256: makeRoot('MEMBER-A') },
    { bytes: 20, logicalPath: 'docs/planning/b.json', ordinal: 2, role: 'B0V8-MEMBER-B', sha256: makeRoot('MEMBER-B') },
  ];
  const projection = { packageId: 'CONNECT-B0-V8-PACKAGE-001', sourceCommit: makeRoot('SOURCE-COMMIT'), members };
  const manifest = {
    artifactClass: 'IMMUTABLE-PLANNING-PACKAGE-MANIFEST', artifactId: 'CONNECT-B0-V8-MANIFEST-001', generatedAt: '2026-08-30T12:00:00Z',
    maxMemberBytesExclusive: 1024, maxTotalBytesInclusive: 2048, memberCount: 2, members,
    packageContentRoot: contentRoot('CONNECT-B0-V8-PACKAGE-CONTENT-V1', projection), packageId: projection.packageId,
    repositoryVisibility: 'PUBLIC', schemaVersion: 'CONNECT-B0-V8-PACKAGE-MANIFEST-V1', sourceCommit: projection.sourceCommit, totalBytes: 30,
  };
  assert.equal(validatePackageManifest(manifest), manifest);
  const duplicate = clone(manifest);
  duplicate.members[1].logicalPath = duplicate.members[0].logicalPath;
  expectBlocked(() => validatePackageManifest(duplicate), /duplicate path/);
  const privateManifest = clone(manifest);
  privateManifest.repositoryVisibility = 'PRIVATE';
  expectBlocked(() => validatePackageManifest(privateManifest), /must remain PUBLIC/);
});
