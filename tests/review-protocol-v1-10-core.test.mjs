import assert from 'node:assert/strict';
import test from 'node:test';

import { makeRoot } from '../scripts/b0-v8-core.mjs';
import {
  REVIEW_PROTOCOL_FINDINGS,
  REVIEW_ROLE_SLOTS,
  REVIEW_VALIDATOR_IDS,
  deriveDuplicateGrowth,
  evaluateCurrentReviewProtocolState,
  evaluateReviewProtocolInput,
  makeReviewProtocolVector,
  runReviewProtocolMutationCampaign,
  validateReviewAppointments,
  validateReviewEvidenceReceipt,
} from '../scripts/review-protocol-v1-10-core.mjs';

function clone(value) {
  return structuredClone(value);
}

test('complete typed protocol vector executes all 15 validators', () => {
  const result = evaluateReviewProtocolInput(makeReviewProtocolVector());
  assert.equal(result.status, 'ELIGIBLE-PLANNING-VECTOR-NOT-AUTHORITY');
  assert.equal(result.validatorCount, 15);
  assert.equal(result.blockedCount, 0);
  assert.deepEqual(result.results.map((row) => row.validatorId), REVIEW_VALIDATOR_IDS);
  assert.ok(result.results.every((row) => row.status === 'PASS'));
});

test('actual current protocol state remains blocked and grants no authority', () => {
  const state = evaluateCurrentReviewProtocolState();
  assert.equal(state.status, 'BLOCKED');
  assert.equal(state.acceptance, 0);
  assert.equal(state.authorityOutputs, 0);
  assert.equal(state.b0, 'ABSENT');
  assert.equal(state.gate29, 'BLOCKED');
  assert.ok(state.missingExternalEvidence.length >= 10);
});

test('appointments require seven exact slots with distinct controllers', () => {
  const vector = makeReviewProtocolVector();
  assert.equal(validateReviewAppointments(vector.evidence.appointments, vector.packageRoot).length, 7);
  assert.deepEqual(vector.evidence.appointments.map((row) => row.roleSlotId), REVIEW_ROLE_SLOTS);
  const duplicate = clone(vector.evidence.appointments);
  duplicate[1].controllerRoot = duplicate[0].controllerRoot;
  assert.throws(() => validateReviewAppointments(duplicate, vector.packageRoot), /receipt does not bind|duplicate identity or controller/);
  const wrongSlot = clone(vector.evidence.appointments);
  wrongSlot[0].roleSlotId = 'ROLE-REVIEWER-01';
  assert.throws(() => validateReviewAppointments(wrongSlot, vector.packageRoot), /role slot mismatch/);
});

test('receipt schema is exact, package-bound and root-bound', () => {
  const vector = makeReviewProtocolVector();
  const receipt = vector.evidence.remotePublicReceipt;
  assert.equal(validateReviewEvidenceReceipt(receipt, 'REMOTE-PUBLIC', vector.packageRoot, 'remote'), receipt);
  const extra = clone(receipt);
  extra.callerValid = true;
  assert.throws(() => validateReviewEvidenceReceipt(extra, 'REMOTE-PUBLIC', vector.packageRoot, 'remote'), /exact keys mismatch/);
  const otherPackage = clone(receipt);
  otherPackage.packageRoot = makeRoot('OTHER-PACKAGE');
  assert.throws(() => validateReviewEvidenceReceipt(otherPackage, 'REMOTE-PUBLIC', vector.packageRoot, 'remote'), /class, package or validity mismatch/);
});

test('each missing or mutated validator prerequisite blocks eligibility', () => {
  const mutations = [
    ['packageReceipt', 'VALIDATOR-PACKAGE'],
    ['frozenSourcesReceipt', 'VALIDATOR-FROZEN-SOURCES'],
    ['schemaReceipt', 'VALIDATOR-SCHEMAS'],
    ['closureReceipt', 'VALIDATOR-CLOSURE'],
    ['semanticEntailmentReceipt', 'VALIDATOR-SEMANTIC-ENTAILMENT'],
    ['predecessorBehaviorReceipt', 'VALIDATOR-PREDECESSOR-BEHAVIOR'],
    ['causalTraceReceipt', 'VALIDATOR-CAUSAL-TRACE'],
    ['remotePublicReceipt', 'VALIDATOR-REMOTE-PUBLIC'],
    ['casReceipt', 'VALIDATOR-CAS'],
    ['recoveryReceipt', 'VALIDATOR-RECOVERY'],
  ];
  for (const [key, validatorId] of mutations) {
    const vector = makeReviewProtocolVector();
    vector.evidence[key].verificationReceiptRoot = makeRoot(`FORGED-${validatorId}`);
    const result = evaluateReviewProtocolInput(vector);
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.results.find((row) => row.validatorId === validatorId).status, 'BLOCK');
  }
});

test('review quorum rejects duplicate or wrongly appointed reviewers', () => {
  const vector = makeReviewProtocolVector();
  vector.evidence.reviewReceipts[1].reviewerAppointmentId = vector.evidence.reviewReceipts[0].reviewerAppointmentId;
  const result = evaluateReviewProtocolInput(vector);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.results.find((row) => row.validatorId === 'VALIDATOR-THREE-REVIEWS-AND-HUMAN-APPROVAL').status, 'BLOCK');
});

test('review quorum requires Structural, Semantic/Security and Estimate/Schedule classes', () => {
  const vector = makeReviewProtocolVector();
  assert.deepEqual(vector.evidence.reviewReceipts.map((row) => row.reviewClass), ['STRUCTURAL', 'SEMANTIC-SECURITY', 'ESTIMATE-SCHEDULE']);
  vector.evidence.reviewReceipts[2].reviewClass = 'STRUCTURAL';
  const result = evaluateReviewProtocolInput(vector);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.results.find((row) => row.validatorId === 'VALIDATOR-THREE-REVIEWS-AND-HUMAN-APPROVAL').status, 'BLOCK');
});

test('growth accounting derives duplicate bytes from content roots', () => {
  const rows = [
    { bytes: 10, contentRoot: makeRoot('CONTENT-A'), logicalPath: 'docs/planning/a.json' },
    { bytes: 20, contentRoot: makeRoot('CONTENT-B'), logicalPath: 'docs/planning/b.json' },
    { bytes: 10, contentRoot: makeRoot('CONTENT-A'), logicalPath: 'docs/planning/c.json' },
  ];
  assert.deepEqual(deriveDuplicateGrowth(rows), { duplicateBytes: 10, totalBytes: 40, uniqueBytes: 30, uniqueRootCount: 2 });
  const declaredOverride = clone(rows[0]);
  declaredOverride.duplicateSourceBytesAdded = 0;
  assert.throws(() => deriveDuplicateGrowth([declaredOverride]), /exact keys mismatch/);
});

test('17-case mutation campaign blocks every v1.9 finding identity', () => {
  const cases = runReviewProtocolMutationCampaign();
  assert.equal(cases.length, 17);
  assert.deepEqual(cases.map((row) => row.findingId), REVIEW_PROTOCOL_FINDINGS.map(([findingId]) => findingId));
  assert.ok(cases.every((row) => row.actual === 'BLOCK'));
  assert.equal(new Set(cases.map((row) => row.testRoot)).size, 17);
});
