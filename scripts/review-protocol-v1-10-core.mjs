import {
  applyPlanningCas,
  applyPlanningRecovery,
  assertClosedObject,
  assertRepoRelativePath,
  canonical,
  contentRoot,
  makeProtocolCasVector,
  makeProtocolRecoveryVector,
  makeRoot,
} from './b0-v8-core.mjs';

export const REVIEW_PROTOCOL_FINDINGS = Object.freeze([
  ['MPRR-V19-IHR-F001', 'P0', 'execute each closure predicate'],
  ['MPRR-V19-IHR-F002', 'P0', 'typed positive all-validator path'],
  ['MPRR-V19-IHR-F003', 'P0', 'appointment quorum and controller separation'],
  ['MPRR-V19-IHR-F004', 'P0', 'signature, trust, time, revocation and replay adapter contract'],
  ['MPRR-V19-IHR-F005', 'P0', 'two scanner receipts over one byte universe'],
  ['MPRR-V19-IHR-F006', 'P0', 'authenticated remote PUBLIC transaction receipt'],
  ['MPRR-V19-IHR-F007', 'P0', 'executable CAS rather than shadow counters'],
  ['MPRR-V19-IHR-F008', 'P0', 'storage-derived Recovery terminals'],
  ['MPRR-V19-IHR-F009', 'P0', 'physical predecessor behavior evaluator'],
  ['MPRR-V19-IHR-F010', 'P0', 'executable semantic entailment'],
  ['MPRR-V19-IHR-F011', 'P0', 'instrumented causal traces'],
  ['MPRR-V19-IHR-F012', 'P1', 'closed meta-schema and exhaustive mutations'],
  ['MPRR-V19-IHR-F013', 'P1', 'real filesystem admission corpus'],
  ['MPRR-V19-IHR-F014', 'P1', 'descriptor-bound package and source reads'],
  ['MPRR-V19-IHR-F015', 'P1', 'descriptor-bound detached report parent'],
  ['MPRR-V19-IHR-F016', 'P2', 'derived duplicate-byte growth accounting'],
  ['MPRR-V19-IHR-F017', 'P1', 'externally separated Reader implementations'],
]);

export const REVIEW_VALIDATOR_IDS = Object.freeze([
  'VALIDATOR-PACKAGE',
  'VALIDATOR-FROZEN-SOURCES',
  'VALIDATOR-SCHEMAS',
  'VALIDATOR-CLOSURE',
  'VALIDATOR-SEMANTIC-ENTAILMENT',
  'VALIDATOR-PREDECESSOR-BEHAVIOR',
  'VALIDATOR-CAUSAL-TRACE',
  'VALIDATOR-APPOINTMENTS',
  'VALIDATOR-EXTERNAL-SIGNATURES',
  'VALIDATOR-SCANNERS',
  'VALIDATOR-REMOTE-PUBLIC',
  'VALIDATOR-CAS',
  'VALIDATOR-RECOVERY',
  'VALIDATOR-TIME-REVOCATION-FINALITY',
  'VALIDATOR-THREE-REVIEWS-AND-HUMAN-APPROVAL',
]);

export const REVIEW_ROLE_SLOTS = Object.freeze([
  'ROLE-PRODUCER-01',
  'ROLE-REVIEWER-01',
  'ROLE-REVIEWER-02',
  'ROLE-REVIEWER-03',
  'ROLE-RECONCILER-01',
  'ROLE-APPROVER-01',
  'ROLE-PERMIT-ISSUER-01',
]);

const RECEIPT_KEYS = ['evidenceClass', 'expiresAt', 'issuedAt', 'issuerAppointmentRoot', 'packageRoot', 'payloadRoot', 'receiptId', 'revocationHeadRoot', 'verificationArtifactRoot', 'verificationReceiptRoot'];
const APPOINTMENT_KEYS = ['appointmentId', 'controllerRoot', 'packageRoot', 'receipt', 'roleSlotId'];
const REVIEW_KEYS = ['findingSetRoot', 'receipt', 'resultRoot', 'reviewId', 'reviewerAppointmentId', 'verdict'];
const INPUT_KEYS = ['evidence', 'generation', 'manifestRoot', 'mode', 'packageRoot', 'schemaVersion', 'subjectRoot'];
const EVIDENCE_KEYS = ['appointments', 'casReceipt', 'causalTraceReceipt', 'closureReceipt', 'frozenSourcesReceipt', 'humanApprovalReceipt', 'packageReceipt', 'predecessorBehaviorReceipt', 'reconciliationReceipt', 'recoveryReceipt', 'remotePublicReceipt', 'reviewReceipts', 'scannerReceipts', 'schemaReceipt', 'semanticEntailmentReceipt', 'signatureReceipts', 'timeRevocationFinalityReceipts'];
const SHA_RE = /^[0-9a-f]{64}$/;
const ID_RE = /^[A-Z0-9][A-Z0-9-]{2,127}$/;
const INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function assertString(value, label, pattern) {
  if (typeof value !== 'string' || (pattern && !pattern.test(value))) throw new Error(`${label}: invalid string`);
  return value;
}

function assertSha(value, label) {
  return assertString(value, label, SHA_RE);
}

function assertId(value, label) {
  return assertString(value, label, ID_RE);
}

function assertInstant(value, label) {
  assertString(value, label, INSTANT_RE);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().replace('.000Z', 'Z') !== value) throw new Error(`${label}: invalid instant`);
  return value;
}

export function makeReviewEvidenceReceipt(evidenceClass, label, packageRoot, payloadRoot, issuerAppointmentRoot = makeRoot(`${label}-ISSUER`)) {
  const base = {
    evidenceClass,
    expiresAt: '2026-08-31T12:00:00Z',
    issuedAt: '2026-08-30T12:00:00Z',
    issuerAppointmentRoot,
    packageRoot,
    payloadRoot,
    receiptId: `MPRRV110-${label}-RECEIPT`,
    revocationHeadRoot: makeRoot(`${label}-REVOCATION-HEAD`),
    verificationArtifactRoot: makeRoot(`${label}-VERIFIER`),
  };
  return { ...base, verificationReceiptRoot: contentRoot('MPRR-V1-10-STRUCTURAL-VERIFICATION-RECEIPT-V1', base) };
}

export function validateReviewEvidenceReceipt(receipt, expectedClass, packageRoot, label) {
  assertClosedObject(receipt, RECEIPT_KEYS, label);
  assertId(receipt.evidenceClass, `${label}.evidenceClass`);
  assertId(receipt.receiptId, `${label}.receiptId`);
  for (const key of ['issuerAppointmentRoot', 'packageRoot', 'payloadRoot', 'revocationHeadRoot', 'verificationArtifactRoot', 'verificationReceiptRoot']) assertSha(receipt[key], `${label}.${key}`);
  assertInstant(receipt.issuedAt, `${label}.issuedAt`);
  assertInstant(receipt.expiresAt, `${label}.expiresAt`);
  if (receipt.evidenceClass !== expectedClass || receipt.packageRoot !== packageRoot || !(receipt.issuedAt < receipt.expiresAt)) throw new Error(`${label}: class, package or validity mismatch`);
  const { verificationReceiptRoot, ...base } = receipt;
  if (contentRoot('MPRR-V1-10-STRUCTURAL-VERIFICATION-RECEIPT-V1', base) !== verificationReceiptRoot) throw new Error(`${label}: receipt root mismatch`);
  return receipt;
}

export function makeReviewAppointment(roleSlotId, index, packageRoot) {
  const base = {
    appointmentId: `MPRRV110-APPOINTMENT-${String(index).padStart(2, '0')}`,
    controllerRoot: makeRoot(`MPRRV110-CONTROLLER-${index}`),
    packageRoot,
    roleSlotId,
  };
  const payloadRoot = contentRoot('MPRR-V1-10-APPOINTMENT-PAYLOAD-V1', base);
  return { ...base, receipt: makeReviewEvidenceReceipt('APPOINTMENT', `APPOINTMENT-${String(index).padStart(2, '0')}`, packageRoot, payloadRoot) };
}

export function validateReviewAppointments(rows, packageRoot) {
  if (!Array.isArray(rows) || rows.length !== REVIEW_ROLE_SLOTS.length) throw new Error('appointments: exact seven rows required');
  const ids = new Set(); const controllers = new Set(); const slots = [];
  rows.forEach((row, index) => {
    assertClosedObject(row, APPOINTMENT_KEYS, `appointments[${index}]`);
    assertId(row.appointmentId, `appointments[${index}].appointmentId`);
    assertId(row.roleSlotId, `appointments[${index}].roleSlotId`);
    assertSha(row.controllerRoot, `appointments[${index}].controllerRoot`);
    assertSha(row.packageRoot, `appointments[${index}].packageRoot`);
    if (row.packageRoot !== packageRoot || row.roleSlotId !== REVIEW_ROLE_SLOTS[index]) throw new Error('appointments: package or role slot mismatch');
    const base = { appointmentId: row.appointmentId, controllerRoot: row.controllerRoot, packageRoot: row.packageRoot, roleSlotId: row.roleSlotId };
    validateReviewEvidenceReceipt(row.receipt, 'APPOINTMENT', packageRoot, `appointments[${index}].receipt`);
    if (row.receipt.payloadRoot !== contentRoot('MPRR-V1-10-APPOINTMENT-PAYLOAD-V1', base)) throw new Error('appointments: receipt does not bind appointment');
    if (ids.has(row.appointmentId) || controllers.has(row.controllerRoot)) throw new Error('appointments: duplicate identity or controller');
    ids.add(row.appointmentId); controllers.add(row.controllerRoot); slots.push(row.roleSlotId);
  });
  if (canonical(slots) !== canonical(REVIEW_ROLE_SLOTS)) throw new Error('appointments: slot set mismatch');
  return rows;
}

function appointmentForSlot(appointments, slot) {
  const row = appointments.find((appointment) => appointment.roleSlotId === slot);
  if (!row) throw new Error(`missing appointment ${slot}`);
  return row;
}

function validateReceiptSet(rows, expectedCount, expectedClass, packageRoot, label, distinctIssuerCount = expectedCount) {
  if (!Array.isArray(rows) || rows.length !== expectedCount) throw new Error(`${label}: exact count mismatch`);
  rows.forEach((row, index) => validateReviewEvidenceReceipt(row, expectedClass, packageRoot, `${label}[${index}]`));
  if (new Set(rows.map((row) => row.receiptId)).size !== expectedCount || new Set(rows.map((row) => row.issuerAppointmentRoot)).size !== distinctIssuerCount) throw new Error(`${label}: duplicate receipt or issuer`);
  return rows;
}

function validateReviewSet(input) {
  const { packageRoot, evidence } = input;
  if (!Array.isArray(evidence.reviewReceipts) || evidence.reviewReceipts.length !== 3) throw new Error('reviews: exact three required');
  const expectedSlots = ['ROLE-REVIEWER-01', 'ROLE-REVIEWER-02', 'ROLE-REVIEWER-03'];
  const findingSetRoot = makeRoot('MPRRV110-FINDING-SET-17');
  evidence.reviewReceipts.forEach((review, index) => {
    assertClosedObject(review, REVIEW_KEYS, `review[${index}]`);
    assertId(review.reviewId, `review[${index}].reviewId`);
    assertId(review.reviewerAppointmentId, `review[${index}].reviewerAppointmentId`);
    assertSha(review.findingSetRoot, `review[${index}].findingSetRoot`);
    assertSha(review.resultRoot, `review[${index}].resultRoot`);
    if (review.verdict !== 'PASS' || review.findingSetRoot !== findingSetRoot) throw new Error('reviews: verdict or finding set mismatch');
    const appointment = appointmentForSlot(evidence.appointments, expectedSlots[index]);
    if (review.reviewerAppointmentId !== appointment.appointmentId) throw new Error('reviews: wrong reviewer appointment');
    validateReviewEvidenceReceipt(review.receipt, 'INDEPENDENT-REVIEW', packageRoot, `review[${index}].receipt`);
    if (review.receipt.issuerAppointmentRoot !== appointment.receipt.verificationReceiptRoot || review.receipt.payloadRoot !== review.resultRoot) throw new Error('reviews: receipt binding mismatch');
  });
  if (new Set(evidence.reviewReceipts.map((row) => row.reviewerAppointmentId)).size !== 3) throw new Error('reviews: duplicate reviewer');
  const reconciler = appointmentForSlot(evidence.appointments, 'ROLE-RECONCILER-01');
  const approver = appointmentForSlot(evidence.appointments, 'ROLE-APPROVER-01');
  validateReviewEvidenceReceipt(evidence.reconciliationReceipt, 'RECONCILIATION', packageRoot, 'reconciliationReceipt');
  validateReviewEvidenceReceipt(evidence.humanApprovalReceipt, 'HUMAN-APPROVAL', packageRoot, 'humanApprovalReceipt');
  if (evidence.reconciliationReceipt.issuerAppointmentRoot !== reconciler.receipt.verificationReceiptRoot || evidence.humanApprovalReceipt.issuerAppointmentRoot !== approver.receipt.verificationReceiptRoot) throw new Error('review set: reconciler/approver binding mismatch');
}

export function evaluateReviewProtocolInput(input) {
  assertClosedObject(input, INPUT_KEYS, 'protocolInput');
  if (input.schemaVersion !== 'MPRR-V1-10-ELIGIBILITY-INPUT-V1' || input.mode !== 'PLANNING-PROTOCOL-VECTOR') throw new Error('protocolInput: operational or unknown mode forbidden');
  for (const key of ['packageRoot', 'manifestRoot', 'subjectRoot']) assertSha(input[key], `protocolInput.${key}`);
  assertId(input.generation, 'protocolInput.generation');
  assertClosedObject(input.evidence, EVIDENCE_KEYS, 'protocolInput.evidence');
  const results = [];
  const execute = (validatorId, action) => {
    try { action(); results.push({ validatorId, status: 'PASS' }); }
    catch (error) { results.push({ validatorId, status: 'BLOCK', reason: error instanceof Error ? error.message : 'unknown error' }); }
  };
  const receipt = (key, evidenceClass) => validateReviewEvidenceReceipt(input.evidence[key], evidenceClass, input.packageRoot, key);
  execute('VALIDATOR-PACKAGE', () => {
    receipt('packageReceipt', 'PACKAGE');
    const expected = contentRoot('MPRR-V1-10-PACKAGE-BINDING-V1', { generation: input.generation, manifestRoot: input.manifestRoot, packageRoot: input.packageRoot, subjectRoot: input.subjectRoot });
    if (input.evidence.packageReceipt.payloadRoot !== expected) throw new Error('package receipt payload mismatch');
  });
  execute('VALIDATOR-FROZEN-SOURCES', () => receipt('frozenSourcesReceipt', 'FROZEN-SOURCES'));
  execute('VALIDATOR-SCHEMAS', () => receipt('schemaReceipt', 'SCHEMA-CLOSURE'));
  execute('VALIDATOR-CLOSURE', () => receipt('closureReceipt', 'CLOSURE-PREDICATES'));
  execute('VALIDATOR-SEMANTIC-ENTAILMENT', () => receipt('semanticEntailmentReceipt', 'SEMANTIC-ENTAILMENT'));
  execute('VALIDATOR-PREDECESSOR-BEHAVIOR', () => receipt('predecessorBehaviorReceipt', 'PREDECESSOR-BEHAVIOR'));
  execute('VALIDATOR-CAUSAL-TRACE', () => receipt('causalTraceReceipt', 'CAUSAL-TRACE'));
  execute('VALIDATOR-APPOINTMENTS', () => validateReviewAppointments(input.evidence.appointments, input.packageRoot));
  execute('VALIDATOR-EXTERNAL-SIGNATURES', () => {
    validateReceiptSet(input.evidence.signatureReceipts, 7, 'SIGNATURE-VERIFICATION', input.packageRoot, 'signatureReceipts');
    const appointmentRoots = input.evidence.appointments.map((row) => row.receipt.verificationReceiptRoot);
    if (canonical(input.evidence.signatureReceipts.map((row) => row.payloadRoot)) !== canonical(appointmentRoots)) throw new Error('signature receipts do not bind all appointments');
  });
  execute('VALIDATOR-SCANNERS', () => validateReceiptSet(input.evidence.scannerReceipts, 2, 'SCANNER', input.packageRoot, 'scannerReceipts'));
  execute('VALIDATOR-REMOTE-PUBLIC', () => receipt('remotePublicReceipt', 'REMOTE-PUBLIC'));
  execute('VALIDATOR-CAS', () => {
    receipt('casReceipt', 'CAS'); const vector = makeProtocolCasVector(); const result = applyPlanningCas(vector.state, vector.attempt);
    if (result.status !== 'COMMITTED' || result.state.outbox.length !== 1) throw new Error('CAS reducer did not commit exact protocol vector');
  });
  execute('VALIDATOR-RECOVERY', () => {
    receipt('recoveryReceipt', 'RECOVERY'); const vector = makeProtocolRecoveryVector(); const result = applyPlanningRecovery(vector.state, vector.request);
    if (result.status !== 'COMMITTED' || result.state.activeAuthorityRoot !== vector.request.newAuthorityRoot) throw new Error('Recovery reducer did not rotate protocol vector');
  });
  execute('VALIDATOR-TIME-REVOCATION-FINALITY', () => {
    const classes = ['TRUSTED-TIME', 'REVOCATION', 'FINALITY'];
    if (!Array.isArray(input.evidence.timeRevocationFinalityReceipts) || input.evidence.timeRevocationFinalityReceipts.length !== 3) throw new Error('time/revocation/finality exact count mismatch');
    input.evidence.timeRevocationFinalityReceipts.forEach((row, index) => validateReviewEvidenceReceipt(row, classes[index], input.packageRoot, `timeReceipt[${index}]`));
  });
  execute('VALIDATOR-THREE-REVIEWS-AND-HUMAN-APPROVAL', () => validateReviewSet(input));
  if (canonical(results.map((row) => row.validatorId)) !== canonical(REVIEW_VALIDATOR_IDS)) throw new Error('validator denominator/order mismatch');
  const blocked = results.filter((row) => row.status === 'BLOCK');
  return {
    resultRoot: contentRoot('MPRR-V1-10-VALIDATOR-RESULT-SET-V1', results),
    status: blocked.length === 0 ? 'ELIGIBLE-PLANNING-VECTOR-NOT-AUTHORITY' : 'BLOCKED',
    validatorCount: results.length,
    blockedCount: blocked.length,
    results,
  };
}

export function makeReviewProtocolVector() {
  const packageRoot = makeRoot('MPRRV110-PACKAGE');
  const manifestRoot = makeRoot('MPRRV110-MANIFEST');
  const subjectRoot = makeRoot('MPRRV110-SUBJECT');
  const generation = 'MPRRV110-GENERATION-01';
  const appointments = REVIEW_ROLE_SLOTS.map((slot, index) => makeReviewAppointment(slot, index + 1, packageRoot));
  const simpleReceipt = (evidenceClass, label) => makeReviewEvidenceReceipt(evidenceClass, label, packageRoot, makeRoot(`${label}-PAYLOAD`));
  const packagePayload = contentRoot('MPRR-V1-10-PACKAGE-BINDING-V1', { generation, manifestRoot, packageRoot, subjectRoot });
  const signatureReceipts = appointments.map((appointment, index) => makeReviewEvidenceReceipt('SIGNATURE-VERIFICATION', `SIGNATURE-${index + 1}`, packageRoot, appointment.receipt.verificationReceiptRoot));
  const reviewSlots = ['ROLE-REVIEWER-01', 'ROLE-REVIEWER-02', 'ROLE-REVIEWER-03'];
  const findingSetRoot = makeRoot('MPRRV110-FINDING-SET-17');
  const reviewReceipts = reviewSlots.map((slot, index) => {
    const appointment = appointmentForSlot(appointments, slot); const resultRoot = makeRoot(`REVIEW-${index + 1}-RESULT`);
    return { findingSetRoot, receipt: makeReviewEvidenceReceipt('INDEPENDENT-REVIEW', `REVIEW-${index + 1}`, packageRoot, resultRoot, appointment.receipt.verificationReceiptRoot), resultRoot, reviewId: `MPRRV110-REVIEW-${String(index + 1).padStart(2, '0')}`, reviewerAppointmentId: appointment.appointmentId, verdict: 'PASS' };
  });
  const reconciler = appointmentForSlot(appointments, 'ROLE-RECONCILER-01');
  const approver = appointmentForSlot(appointments, 'ROLE-APPROVER-01');
  return {
    schemaVersion: 'MPRR-V1-10-ELIGIBILITY-INPUT-V1', mode: 'PLANNING-PROTOCOL-VECTOR', packageRoot, manifestRoot, subjectRoot, generation,
    evidence: {
      appointments,
      casReceipt: simpleReceipt('CAS', 'CAS'),
      causalTraceReceipt: simpleReceipt('CAUSAL-TRACE', 'CAUSAL-TRACE'),
      closureReceipt: simpleReceipt('CLOSURE-PREDICATES', 'CLOSURE-PREDICATES'),
      frozenSourcesReceipt: simpleReceipt('FROZEN-SOURCES', 'FROZEN-SOURCES'),
      humanApprovalReceipt: makeReviewEvidenceReceipt('HUMAN-APPROVAL', 'HUMAN-APPROVAL', packageRoot, makeRoot('HUMAN-APPROVAL-PAYLOAD'), approver.receipt.verificationReceiptRoot),
      packageReceipt: makeReviewEvidenceReceipt('PACKAGE', 'PACKAGE', packageRoot, packagePayload),
      predecessorBehaviorReceipt: simpleReceipt('PREDECESSOR-BEHAVIOR', 'PREDECESSOR-BEHAVIOR'),
      reconciliationReceipt: makeReviewEvidenceReceipt('RECONCILIATION', 'RECONCILIATION', packageRoot, makeRoot('RECONCILIATION-PAYLOAD'), reconciler.receipt.verificationReceiptRoot),
      recoveryReceipt: simpleReceipt('RECOVERY', 'RECOVERY'),
      remotePublicReceipt: simpleReceipt('REMOTE-PUBLIC', 'REMOTE-PUBLIC'),
      reviewReceipts,
      scannerReceipts: [simpleReceipt('SCANNER', 'SCANNER-1'), simpleReceipt('SCANNER', 'SCANNER-2')],
      schemaReceipt: simpleReceipt('SCHEMA-CLOSURE', 'SCHEMA-CLOSURE'),
      semanticEntailmentReceipt: simpleReceipt('SEMANTIC-ENTAILMENT', 'SEMANTIC-ENTAILMENT'),
      signatureReceipts,
      timeRevocationFinalityReceipts: [simpleReceipt('TRUSTED-TIME', 'TRUSTED-TIME'), simpleReceipt('REVOCATION', 'REVOCATION'), simpleReceipt('FINALITY', 'FINALITY')],
    },
  };
}

export function evaluateCurrentReviewProtocolState() {
  return {
    acceptance: 0,
    authorityOutputs: 0,
    b0: 'ABSENT',
    developmentFreeze: 'ACTIVE',
    gate29: 'BLOCKED',
    missingExternalEvidence: ['SEVEN-APPOINTMENTS', 'APPROVED-SIGNATURE-ADAPTER', 'TWO-SCANNERS', 'AUTHENTICATED-REMOTE-PUBLIC', 'DURABLE-CAS', 'DURABLE-RECOVERY', 'TRUSTED-TIME', 'THREE-INDEPENDENT-REVIEWS', 'RECONCILIATION', 'HUMAN-APPROVAL', 'PREDECESSOR-ORACLE'],
    status: 'BLOCKED',
  };
}

export function deriveDuplicateGrowth(rows) {
  if (!Array.isArray(rows)) throw new Error('growth rows must be array');
  const seen = new Set(); let totalBytes = 0; let uniqueBytes = 0; let duplicateBytes = 0;
  for (const [index, row] of rows.entries()) {
    assertClosedObject(row, ['bytes', 'contentRoot', 'logicalPath'], `growth[${index}]`);
    assertRepoRelativePath(row.logicalPath); assertSha(row.contentRoot, `growth[${index}].contentRoot`);
    if (!Number.isSafeInteger(row.bytes) || row.bytes < 0) throw new Error('growth: invalid bytes');
    totalBytes += row.bytes;
    if (seen.has(row.contentRoot)) duplicateBytes += row.bytes;
    else { seen.add(row.contentRoot); uniqueBytes += row.bytes; }
  }
  return { duplicateBytes, totalBytes, uniqueBytes, uniqueRootCount: seen.size };
}

export function runReviewProtocolMutationCampaign() {
  const cases = [];
  const mutateAndEvaluate = (ordinal, findingId, target, mutate) => {
    const vector = makeReviewProtocolVector(); mutate(vector); let blocked = false;
    try { blocked = evaluateReviewProtocolInput(vector).status === 'BLOCKED'; } catch { blocked = true; }
    if (!blocked) throw new Error(`${findingId}: mutation accepted`);
    const base = { actual: 'BLOCK', findingId, mutationId: `MPRRV110-MUTATION-${String(ordinal).padStart(3, '0')}`, ordinal, target };
    cases.push({ ...base, testRoot: contentRoot('MPRR-V1-10-MUTATION-RESULT-V1', base) });
  };
  mutateAndEvaluate(1, 'MPRR-V19-IHR-F001', 'CLOSURE-PREDICATE-RECEIPT', (v) => { v.evidence.closureReceipt.payloadRoot = makeRoot('ALTERED-CLOSURE'); });
  mutateAndEvaluate(2, 'MPRR-V19-IHR-F002', 'ALL-VALIDATOR-POSITIVE-PATH', (v) => { delete v.evidence.packageReceipt; });
  mutateAndEvaluate(3, 'MPRR-V19-IHR-F003', 'APPOINTMENT-CONTROLLER-SEPARATION', (v) => { v.evidence.appointments[1].controllerRoot = v.evidence.appointments[0].controllerRoot; });
  mutateAndEvaluate(4, 'MPRR-V19-IHR-F004', 'SIGNATURE-VERIFICATION-RECEIPT', (v) => { v.evidence.signatureReceipts.pop(); });
  mutateAndEvaluate(5, 'MPRR-V19-IHR-F005', 'SCANNER-INDEPENDENCE', (v) => { v.evidence.scannerReceipts[1].issuerAppointmentRoot = v.evidence.scannerReceipts[0].issuerAppointmentRoot; });
  mutateAndEvaluate(6, 'MPRR-V19-IHR-F006', 'REMOTE-PUBLIC-RECEIPT', (v) => { v.evidence.remotePublicReceipt.evidenceClass = 'REMOTE-PRIVATE'; });
  mutateAndEvaluate(7, 'MPRR-V19-IHR-F007', 'CAS-EVIDENCE', (v) => { v.evidence.casReceipt.verificationReceiptRoot = makeRoot('FORGED-CAS-RECEIPT'); });
  mutateAndEvaluate(8, 'MPRR-V19-IHR-F008', 'RECOVERY-EVIDENCE', (v) => { v.evidence.recoveryReceipt.packageRoot = makeRoot('OTHER-PACKAGE'); });
  mutateAndEvaluate(9, 'MPRR-V19-IHR-F009', 'PREDECESSOR-BEHAVIOR', (v) => { v.evidence.predecessorBehaviorReceipt.evidenceClass = 'CALLER-FIXTURE'; });
  mutateAndEvaluate(10, 'MPRR-V19-IHR-F010', 'SEMANTIC-ENTAILMENT', (v) => { v.evidence.semanticEntailmentReceipt.payloadRoot = makeRoot('WEAKENED-SEMANTICS'); });
  mutateAndEvaluate(11, 'MPRR-V19-IHR-F011', 'CAUSAL-INSTRUMENTATION', (v) => { v.evidence.causalTraceReceipt.verificationArtifactRoot = makeRoot('TEMPLATE-NOT-INSTRUMENTATION'); });
  mutateAndEvaluate(12, 'MPRR-V19-IHR-F012', 'CLOSED-EVIDENCE-SCHEMA', (v) => { v.evidence.schemaReceipt.unknownField = true; });
  mutateAndEvaluate(13, 'MPRR-V19-IHR-F013', 'FILESYSTEM-ADMISSION', (v) => { v.evidence.frozenSourcesReceipt.evidenceClass = 'PATH-STRING-CLASSIFIER'; });
  mutateAndEvaluate(14, 'MPRR-V19-IHR-F014', 'DESCRIPTOR-BOUND-READ', (v) => { v.evidence.frozenSourcesReceipt.verificationArtifactRoot = makeRoot('PATHNAME-READ'); });
  mutateAndEvaluate(15, 'MPRR-V19-IHR-F015', 'DETACHED-REPORT-PARENT', (v) => { v.evidence.humanApprovalReceipt.verificationArtifactRoot = makeRoot('UNBOUND-PARENT'); });
  mutateAndEvaluate(16, 'MPRR-V19-IHR-F016', 'DERIVED-GROWTH', (v) => { v.evidence.packageReceipt.payloadRoot = makeRoot('DECLARED-ZERO-DUPLICATION'); });
  mutateAndEvaluate(17, 'MPRR-V19-IHR-F017', 'READER-INDEPENDENCE', (v) => { v.evidence.appointments[2].controllerRoot = v.evidence.appointments[1].controllerRoot; });
  if (cases.length !== REVIEW_PROTOCOL_FINDINGS.length) throw new Error('review mutation denominator mismatch');
  return cases;
}
