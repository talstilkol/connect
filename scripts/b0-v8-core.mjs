import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const B0_V8_SCHEMA = 'CONNECT-B0-V8-CANDIDATE-V1';
export const B0_V8_DATE = '2026-08-30';
export const B0_V8_FINDINGS = Object.freeze([
  ['B0V7-IHR-F001', 'P0', 'closed schema dialect and recursive validation'],
  ['B0V7-IHR-F002', 'P0', 'detached authenticated Acceptance context'],
  ['B0V7-IHR-F003', 'P0', 'Genesis, Appointment, trust and signature contract'],
  ['B0V7-IHR-F004', 'P0', 'typed Permit, trusted time, revocation and keyed replay'],
  ['B0V7-IHR-F005', 'P0', 'one executable CAS transaction and durable adapter contract'],
  ['B0V7-IHR-F006', 'P0', 'controller-separated 3-of-5 Recovery quorum'],
  ['B0V7-IHR-F007', 'P0', 'exact Recovery read revalidation and atomic rotation'],
  ['B0V7-IHR-F008', 'P0', 'causal global policy and no-self-credit'],
  ['B0V7-IHR-F009', 'P0', 'actual-interface provenance and precommit policy'],
  ['B0V7-IHR-F010', 'P1', 'detached Reader provenance and independence'],
  ['B0V7-IHR-F011', 'P1', 'no-follow source reads and repository containment'],
  ['B0V7-IHR-F012', 'P1', 'authenticated PUBLIC remote evidence'],
  ['B0V7-IHR-F013', 'P1', 'closed package inventory and total growth bound'],
  ['B0V7-IHR-F014', 'P0', 'executable predecessor behavior non-weakening'],
]);

const SHA256_RE = /^[0-9a-f]{64}$/;
const GIT_OBJECT_ID_RE = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const ID_RE = /^[A-Z0-9][A-Z0-9-]{2,127}$/;
const RFC3339_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export function assertUnicodeScalars(value, label = 'string') {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error(`${label}: unpaired high surrogate`);
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error(`${label}: unpaired low surrogate`);
    }
  }
}

export function canonical(value) {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') {
    assertUnicodeScalars(value);
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('canonical JSON permits safe integers only');
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${canonical(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  throw new Error(`unsupported canonical type: ${typeof value}`);
}

export function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export function sha256Text(text) {
  return sha256Bytes(Buffer.from(text, 'utf8'));
}

export function contentRoot(domain, value) {
  return sha256Text(`${domain}\n${canonical(value)}`);
}

export function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortDeep(value[key])]));
  }
  return value;
}

export function pretty(value) {
  return `${JSON.stringify(sortDeep(value), null, 2)}\n`;
}

export function assertClosedObject(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${label}: expected plain object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (canonical(actual) !== canonical(expected)) {
    throw new Error(`${label}: exact keys mismatch; expected ${expected.join(',')}; actual ${actual.join(',')}`);
  }
  return value;
}

function assertString(value, label, pattern) {
  if (typeof value !== 'string') throw new Error(`${label}: expected string`);
  assertUnicodeScalars(value, label);
  if (pattern && !pattern.test(value)) throw new Error(`${label}: invalid string`);
  return value;
}

function assertSafeInteger(value, label, minimum = Number.MIN_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`${label}: expected safe integer >= ${minimum}`);
  return value;
}

function assertSha(value, label) {
  return assertString(value, label, SHA256_RE);
}

function assertId(value, label) {
  return assertString(value, label, ID_RE);
}

function assertInstant(value, label) {
  assertString(value, label, RFC3339_RE);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().replace('.000Z', 'Z') !== value) {
    throw new Error(`${label}: invalid RFC3339 UTC second instant`);
  }
  return value;
}

export function assertRepoRelativePath(logicalPath) {
  assertString(logicalPath, 'logicalPath');
  const allowedPrefixes = ['docs/planning/', 'scripts/', 'tests/'];
  if (!allowedPrefixes.some((prefix) => logicalPath.startsWith(prefix))) throw new Error(`logicalPath: must start ${allowedPrefixes.join(' or ')}`);
  if (logicalPath.startsWith('/') || logicalPath.includes('\\') || logicalPath.includes('//')) throw new Error('logicalPath: forbidden separator');
  const segments = logicalPath.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) throw new Error('logicalPath: traversal or empty segment');
  if (path.posix.normalize(logicalPath) !== logicalPath) throw new Error('logicalPath: non-canonical path');
  return logicalPath;
}

export function readRegularFileNoFollow(repositoryRoot, logicalPath, maxBytesExclusive = 50 * 1024 * 1024) {
  assertRepoRelativePath(logicalPath);
  const rootReal = fs.realpathSync(repositoryRoot);
  const segments = logicalPath.split('/');
  let cursor = rootReal;
  for (let index = 0; index < segments.length; index += 1) {
    cursor = path.join(cursor, segments[index]);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error(`${logicalPath}: symlink rejected at ${segments.slice(0, index + 1).join('/')}`);
    if (index < segments.length - 1 && !stat.isDirectory()) throw new Error(`${logicalPath}: ancestor is not a directory`);
    if (index === segments.length - 1 && !stat.isFile()) throw new Error(`${logicalPath}: final entry is not a regular file`);
  }
  const resolved = fs.realpathSync(cursor);
  if (!(resolved === rootReal || resolved.startsWith(`${rootReal}${path.sep}`))) throw new Error(`${logicalPath}: path escapes repository root`);
  const before = fs.statSync(cursor);
  if (before.nlink !== 1) throw new Error(`${logicalPath}: hard-linked file rejected`);
  if (before.size >= maxBytesExclusive) throw new Error(`${logicalPath}: file exceeds exclusive byte limit`);
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  const descriptor = fs.openSync(cursor, flags);
  try {
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size) {
      throw new Error(`${logicalPath}: file changed between inspection and open`);
    }
    const bytes = fs.readFileSync(descriptor);
    if (bytes.length !== opened.size) throw new Error(`${logicalPath}: short or changed read`);
    return { logicalPath, bytes, byteLength: bytes.length, sha256: sha256Bytes(bytes), mode: opened.mode & 0o777 };
  } finally {
    fs.closeSync(descriptor);
  }
}

const RECEIPT_KEYS = ['artifactRoot', 'contextRoot', 'expiresAt', 'issuedAt', 'issuerAppointmentRoot', 'payloadRoot', 'receiptId', 'verifierArtifactRoot'];

export function validateExternalReceipt(receipt, label) {
  assertClosedObject(receipt, RECEIPT_KEYS, label);
  assertId(receipt.receiptId, `${label}.receiptId`);
  for (const key of ['artifactRoot', 'contextRoot', 'issuerAppointmentRoot', 'payloadRoot', 'verifierArtifactRoot']) assertSha(receipt[key], `${label}.${key}`);
  assertInstant(receipt.issuedAt, `${label}.issuedAt`);
  assertInstant(receipt.expiresAt, `${label}.expiresAt`);
  if (!(receipt.issuedAt < receipt.expiresAt)) throw new Error(`${label}: receipt interval is empty`);
  return receipt;
}

const PERMIT_KEYS = ['issuerAppointmentRoot', 'permitId', 'permitRoot', 'replayKey', 'revision', 'scope', 'signatureReceiptRoot', 'subjectRoot', 'validFrom', 'validUntil'];

export function validatePermit(permit) {
  assertClosedObject(permit, PERMIT_KEYS, 'permit');
  assertId(permit.permitId, 'permit.permitId');
  assertId(permit.replayKey, 'permit.replayKey');
  assertId(permit.scope, 'permit.scope');
  assertSafeInteger(permit.revision, 'permit.revision', 1);
  for (const key of ['issuerAppointmentRoot', 'permitRoot', 'signatureReceiptRoot', 'subjectRoot']) assertSha(permit[key], `permit.${key}`);
  assertInstant(permit.validFrom, 'permit.validFrom');
  assertInstant(permit.validUntil, 'permit.validUntil');
  if (!(permit.validFrom < permit.validUntil)) throw new Error('permit: invalid validity interval');
  const projection = Object.fromEntries(PERMIT_KEYS.filter((key) => key !== 'permitRoot').map((key) => [key, permit[key]]));
  if (contentRoot('CONNECT-B0-V8-PERMIT-V1', projection) !== permit.permitRoot) throw new Error('permit: permitRoot mismatch');
  return permit;
}

const STATE_KEYS = ['acceptance', 'attemptLedger', 'consumedPermits', 'headRoot', 'outbox', 'permits', 'pointerRoot', 'recoveryHeadRoot', 'replayLedger', 'revision', 'revocationHeadRoot', 'schemaVersion', 'securityHeadRoot'];
const ATTEMPT_KEYS = ['acceptanceContextReceipt', 'attemptId', 'expectedHeadRoot', 'expectedRevision', 'expectedRevocationHeadRoot', 'expectedSecurityHeadRoot', 'permitId', 'proposedAcceptanceRoot', 'proposedEffectId', 'proposedPointerRoot', 'replayKey', 'requestRoot', 'scope', 'signatureVerificationReceipt', 'subjectRoot', 'trustedTimeReceipt'];

export function validateCasState(state) {
  assertClosedObject(state, STATE_KEYS, 'casState');
  if (state.schemaVersion !== 'CONNECT-B0-V8-CAS-STATE-V1') throw new Error('casState: wrong schemaVersion');
  for (const key of ['headRoot', 'recoveryHeadRoot', 'revocationHeadRoot', 'securityHeadRoot']) assertSha(state[key], `casState.${key}`);
  if (state.pointerRoot !== null) assertSha(state.pointerRoot, 'casState.pointerRoot');
  if (state.acceptance !== null) assertSha(state.acceptance, 'casState.acceptance');
  assertSafeInteger(state.revision, 'casState.revision', 0);
  for (const key of ['permits', 'consumedPermits', 'replayLedger', 'attemptLedger', 'outbox']) {
    if (!Array.isArray(state[key])) throw new Error(`casState.${key}: expected array`);
  }
  state.permits.forEach(validatePermit);
  for (const [label, rows, identity] of [
    ['permits', state.permits, (row) => row.permitId],
    ['consumedPermits', state.consumedPermits, (row) => row.permitId],
    ['replayLedger', state.replayLedger, (row) => row.replayKey],
    ['attemptLedger', state.attemptLedger, (row) => row.attemptId],
    ['outbox', state.outbox, (row) => row.effectId],
  ]) {
    const identities = rows.map(identity);
    if (new Set(identities).size !== identities.length) throw new Error(`casState.${label}: duplicate identity`);
  }
  return state;
}

export function validateCasAttempt(attempt) {
  assertClosedObject(attempt, ATTEMPT_KEYS, 'casAttempt');
  for (const key of ['attemptId', 'permitId', 'proposedEffectId', 'replayKey', 'scope']) assertId(attempt[key], `casAttempt.${key}`);
  for (const key of ['expectedHeadRoot', 'expectedRevocationHeadRoot', 'expectedSecurityHeadRoot', 'proposedAcceptanceRoot', 'proposedPointerRoot', 'requestRoot', 'subjectRoot']) assertSha(attempt[key], `casAttempt.${key}`);
  assertSafeInteger(attempt.expectedRevision, 'casAttempt.expectedRevision', 0);
  validateExternalReceipt(attempt.acceptanceContextReceipt, 'casAttempt.acceptanceContextReceipt');
  validateExternalReceipt(attempt.signatureVerificationReceipt, 'casAttempt.signatureVerificationReceipt');
  validateExternalReceipt(attempt.trustedTimeReceipt.receipt, 'casAttempt.trustedTimeReceipt.receipt');
  assertClosedObject(attempt.trustedTimeReceipt, ['receipt', 'trustedInstant'], 'casAttempt.trustedTimeReceipt');
  assertInstant(attempt.trustedTimeReceipt.trustedInstant, 'casAttempt.trustedTimeReceipt.trustedInstant');
  return attempt;
}

function clone(value) {
  return structuredClone(value);
}

export function applyPlanningCas(sourceState, attempt) {
  validateCasState(sourceState);
  validateCasAttempt(attempt);
  const existing = sourceState.attemptLedger.find((row) => row.attemptId === attempt.attemptId);
  if (existing) {
    if (existing.requestRoot !== attempt.requestRoot) throw new Error('cas: attempt identity conflict');
    return { status: 'ALREADY-COMMITTED', state: clone(sourceState), receipt: clone(existing) };
  }
  if (sourceState.headRoot !== attempt.expectedHeadRoot || sourceState.securityHeadRoot !== attempt.expectedSecurityHeadRoot || sourceState.revocationHeadRoot !== attempt.expectedRevocationHeadRoot || sourceState.revision !== attempt.expectedRevision) {
    throw new Error('cas: stale read set');
  }
  const permit = sourceState.permits.find((row) => row.permitId === attempt.permitId);
  if (!permit) throw new Error('cas: unknown permit');
  if (permit.replayKey !== attempt.replayKey || permit.subjectRoot !== attempt.subjectRoot || permit.scope !== attempt.scope) throw new Error('cas: permit scope or subject mismatch');
  if (permit.revision <= sourceState.revision) throw new Error('cas: permit revision is not strictly newer');
  if (sourceState.consumedPermits.some((row) => row.permitId === permit.permitId)) throw new Error('cas: permit already consumed');
  if (sourceState.replayLedger.some((row) => row.replayKey === attempt.replayKey)) throw new Error('cas: replay key already consumed');
  const instant = attempt.trustedTimeReceipt.trustedInstant;
  if (!(permit.validFrom <= instant && instant < permit.validUntil)) throw new Error('cas: permit outside trusted time interval');
  if (attempt.signatureVerificationReceipt.payloadRoot !== permit.permitRoot || attempt.signatureVerificationReceipt.artifactRoot !== permit.signatureReceiptRoot) throw new Error('cas: signature receipt does not bind the permit');
  if (attempt.acceptanceContextReceipt.payloadRoot !== attempt.proposedAcceptanceRoot || attempt.acceptanceContextReceipt.contextRoot !== sourceState.securityHeadRoot) throw new Error('cas: Acceptance context is not detached/current');
  if (attempt.trustedTimeReceipt.receipt.payloadRoot !== contentRoot('CONNECT-B0-V8-TRUSTED-INSTANT-V1', { trustedInstant: instant })) throw new Error('cas: trusted-time receipt payload mismatch');
  const next = clone(sourceState);
  const receiptBase = {
    attemptId: attempt.attemptId,
    committedRevision: permit.revision,
    effectId: attempt.proposedEffectId,
    pointerRoot: attempt.proposedPointerRoot,
    requestRoot: attempt.requestRoot,
  };
  const commitReceiptRoot = contentRoot('CONNECT-B0-V8-CAS-COMMIT-RECEIPT-V1', receiptBase);
  const receipt = { ...receiptBase, commitReceiptRoot };
  next.headRoot = contentRoot('CONNECT-B0-V8-CAS-HEAD-V1', { priorHeadRoot: sourceState.headRoot, commitReceiptRoot });
  next.revision = permit.revision;
  next.pointerRoot = attempt.proposedPointerRoot;
  next.acceptance = attempt.proposedAcceptanceRoot;
  next.consumedPermits.push({ permitId: permit.permitId, permitRoot: permit.permitRoot, commitReceiptRoot });
  next.replayLedger.push({ replayKey: attempt.replayKey, attemptId: attempt.attemptId, commitReceiptRoot });
  next.attemptLedger.push(receipt);
  next.outbox.push({ effectId: attempt.proposedEffectId, attemptId: attempt.attemptId, payloadRoot: attempt.proposedPointerRoot, status: 'PENDING' });
  validateCasState(next);
  return { status: 'COMMITTED', state: next, receipt };
}

export function readPlanningCasResult(state, attemptId, requestRoot) {
  validateCasState(state);
  assertId(attemptId, 'attemptId');
  assertSha(requestRoot, 'requestRoot');
  const row = state.attemptLedger.find((candidate) => candidate.attemptId === attemptId);
  if (!row) return { status: 'NOT-FOUND', receipt: null };
  if (row.requestRoot !== requestRoot) throw new Error('readback: requestRoot conflict');
  return { status: 'COMMITTED', receipt: clone(row) };
}

const RECOVERY_STATE_KEYS = ['activeAuthorityRoot', 'consumedAttemptIds', 'recoveryHeadRoot', 'revokedAuthorityRoots', 'schemaVersion', 'securityHeadRoot'];
const RECOVERY_REQUEST_KEYS = ['acknowledgements', 'attemptId', 'expectedRecoveryHeadRoot', 'expectedSecurityHeadRoot', 'memberAppointments', 'newAuthorityRoot', 'trustedTimeReceipt', 'witnessAppointments'];

export function applyPlanningRecovery(sourceState, request) {
  assertClosedObject(sourceState, RECOVERY_STATE_KEYS, 'recoveryState');
  assertClosedObject(request, RECOVERY_REQUEST_KEYS, 'recoveryRequest');
  if (sourceState.schemaVersion !== 'CONNECT-B0-V8-RECOVERY-STATE-V1') throw new Error('recoveryState: wrong schemaVersion');
  for (const key of ['activeAuthorityRoot', 'recoveryHeadRoot', 'securityHeadRoot']) assertSha(sourceState[key], `recoveryState.${key}`);
  if (!Array.isArray(sourceState.consumedAttemptIds) || !Array.isArray(sourceState.revokedAuthorityRoots)) throw new Error('recoveryState: invalid ledgers');
  assertId(request.attemptId, 'recoveryRequest.attemptId');
  for (const key of ['expectedRecoveryHeadRoot', 'expectedSecurityHeadRoot', 'newAuthorityRoot']) assertSha(request[key], `recoveryRequest.${key}`);
  validateExternalReceipt(request.trustedTimeReceipt, 'recoveryRequest.trustedTimeReceipt');
  if (sourceState.securityHeadRoot !== request.expectedSecurityHeadRoot || sourceState.recoveryHeadRoot !== request.expectedRecoveryHeadRoot) throw new Error('recovery: stale read set');
  if (sourceState.consumedAttemptIds.includes(request.attemptId)) throw new Error('recovery: attempt already consumed');
  if (!Array.isArray(request.memberAppointments) || request.memberAppointments.length !== 5) throw new Error('recovery: exactly five members required');
  if (!Array.isArray(request.acknowledgements) || request.acknowledgements.length !== 3) throw new Error('recovery: exactly three acknowledgements required');
  if (!Array.isArray(request.witnessAppointments) || request.witnessAppointments.length !== 2) throw new Error('recovery: exactly two witnesses required');
  const validateAppointment = (row, label) => {
    assertClosedObject(row, ['appointmentRoot', 'controllerRoot', 'identityId', 'signatureReceiptRoot'], label);
    assertId(row.identityId, `${label}.identityId`);
    for (const key of ['appointmentRoot', 'controllerRoot', 'signatureReceiptRoot']) assertSha(row[key], `${label}.${key}`);
  };
  request.memberAppointments.forEach((row, index) => validateAppointment(row, `member[${index}]`));
  request.witnessAppointments.forEach((row, index) => validateAppointment(row, `witness[${index}]`));
  const memberIds = request.memberAppointments.map((row) => row.identityId);
  const memberControllers = request.memberAppointments.map((row) => row.controllerRoot);
  const witnessIds = request.witnessAppointments.map((row) => row.identityId);
  const witnessControllers = request.witnessAppointments.map((row) => row.controllerRoot);
  if (new Set(memberIds).size !== 5 || new Set(memberControllers).size !== 5) throw new Error('recovery: member identities/controllers must be unique');
  if (new Set(witnessIds).size !== 2 || new Set(witnessControllers).size !== 2) throw new Error('recovery: witness identities/controllers must be unique');
  if (witnessControllers.some((root) => memberControllers.includes(root))) throw new Error('recovery: witness/member controller overlap');
  const ackIds = [];
  for (const [index, row] of request.acknowledgements.entries()) {
    assertClosedObject(row, ['acknowledgementRoot', 'challengeRoot', 'memberIdentityId', 'signatureReceiptRoot'], `ack[${index}]`);
    assertId(row.memberIdentityId, `ack[${index}].memberIdentityId`);
    for (const key of ['acknowledgementRoot', 'challengeRoot', 'signatureReceiptRoot']) assertSha(row[key], `ack[${index}].${key}`);
    if (!memberIds.includes(row.memberIdentityId)) throw new Error('recovery: acknowledgement from unknown member');
    ackIds.push(row.memberIdentityId);
  }
  if (new Set(ackIds).size !== 3) throw new Error('recovery: duplicate acknowledgement identity');
  const challengeRoots = new Set(request.acknowledgements.map((row) => row.challengeRoot));
  if (challengeRoots.size !== 1) throw new Error('recovery: mixed challenges');
  const next = clone(sourceState);
  next.revokedAuthorityRoots.push(sourceState.activeAuthorityRoot);
  next.activeAuthorityRoot = request.newAuthorityRoot;
  next.consumedAttemptIds.push(request.attemptId);
  next.recoveryHeadRoot = contentRoot('CONNECT-B0-V8-RECOVERY-HEAD-V1', {
    priorRecoveryHeadRoot: sourceState.recoveryHeadRoot,
    attemptId: request.attemptId,
    newAuthorityRoot: request.newAuthorityRoot,
    challengeRoot: request.acknowledgements[0].challengeRoot,
  });
  return { status: 'COMMITTED', state: next };
}

export function evaluateCausalTrace(events) {
  if (!Array.isArray(events)) throw new Error('trace: expected array');
  const expected = ['EXTERNAL-CONTEXT-ADMITTED', 'PERMIT-ADMITTED', 'CAS-COMMITTED', 'RESPONSE-READBACK', 'RECOVERY-COMMITTED', 'CURRENT-STATE-BLOCKED'];
  if (canonical(events.map((event) => event.eventType)) !== canonical(expected)) throw new Error('trace: missing, extra or reordered event');
  for (const [index, event] of events.entries()) {
    assertClosedObject(event, ['eventRoot', 'eventType', 'priorEventRoot'], `trace[${index}]`);
    assertId(event.eventType, `trace[${index}].eventType`);
    if (event.priorEventRoot !== null) assertSha(event.priorEventRoot, `trace[${index}].priorEventRoot`);
    const expectedPrior = index === 0 ? null : events[index - 1].eventRoot;
    if (event.priorEventRoot !== expectedPrior) throw new Error('trace: broken causal link');
    const projection = { eventType: event.eventType, priorEventRoot: event.priorEventRoot };
    if (contentRoot('CONNECT-B0-V8-CAUSAL-EVENT-V1', projection) !== event.eventRoot) throw new Error('trace: eventRoot mismatch');
  }
  return { status: 'PASS', conjunctCount: 6, traceRoot: contentRoot('CONNECT-B0-V8-CAUSAL-TRACE-V1', events) };
}

export function evaluateAcceptanceGate({ producerControllerRoot, readerControllerRoots, remoteReceiptPresent, predecessorOracleComplete, trustedTimePresent }) {
  assertSha(producerControllerRoot, 'acceptance.producerControllerRoot');
  if (!Array.isArray(readerControllerRoots) || readerControllerRoots.length !== 2) throw new Error('acceptance: two Readers required');
  readerControllerRoots.forEach((root, index) => assertSha(root, `acceptance.readerControllerRoots[${index}]`));
  if (new Set([producerControllerRoot, ...readerControllerRoots]).size !== 3) return { status: 'BLOCKED', reason: 'CONTROLLER-SEPARATION-ABSENT' };
  if (!remoteReceiptPresent) return { status: 'BLOCKED', reason: 'AUTHENTICATED-PUBLIC-RECEIPT-ABSENT' };
  if (!predecessorOracleComplete) return { status: 'BLOCKED', reason: 'PREDECESSOR-ORACLE-INCOMPLETE' };
  if (!trustedTimePresent) return { status: 'BLOCKED', reason: 'TRUSTED-TIME-ABSENT' };
  return { status: 'ELIGIBLE-FOR-EXTERNAL-ACCEPTANCE', reason: null };
}

export function validatePackageManifest(manifest) {
  const keys = ['artifactClass', 'artifactId', 'generatedAt', 'maxMemberBytesExclusive', 'maxTotalBytesInclusive', 'memberCount', 'members', 'packageContentRoot', 'packageId', 'repositoryVisibility', 'schemaVersion', 'sourceCommit', 'totalBytes'];
  assertClosedObject(manifest, keys, 'manifest');
  if (manifest.schemaVersion !== 'CONNECT-B0-V8-PACKAGE-MANIFEST-V1') throw new Error('manifest: wrong schemaVersion');
  if (manifest.repositoryVisibility !== 'PUBLIC') throw new Error('manifest: repository must remain PUBLIC');
  assertId(manifest.artifactId, 'manifest.artifactId');
  assertId(manifest.packageId, 'manifest.packageId');
  assertInstant(manifest.generatedAt, 'manifest.generatedAt');
  assertString(manifest.sourceCommit, 'manifest.sourceCommit', GIT_OBJECT_ID_RE);
  assertSha(manifest.packageContentRoot, 'manifest.packageContentRoot');
  assertSafeInteger(manifest.maxMemberBytesExclusive, 'manifest.maxMemberBytesExclusive', 1);
  assertSafeInteger(manifest.maxTotalBytesInclusive, 'manifest.maxTotalBytesInclusive', 1);
  assertSafeInteger(manifest.memberCount, 'manifest.memberCount', 1);
  assertSafeInteger(manifest.totalBytes, 'manifest.totalBytes', 1);
  if (!Array.isArray(manifest.members) || manifest.members.length !== manifest.memberCount) throw new Error('manifest: member count mismatch');
  const paths = new Set(); const hashes = new Set(); const roles = new Set(); let total = 0;
  manifest.members.forEach((member, index) => {
    assertClosedObject(member, ['bytes', 'logicalPath', 'ordinal', 'role', 'sha256'], `manifest.members[${index}]`);
    if (member.ordinal !== index + 1) throw new Error('manifest: ordinals must be contiguous and ordered');
    assertRepoRelativePath(member.logicalPath); assertId(member.role, `manifest.members[${index}].role`); assertSha(member.sha256, `manifest.members[${index}].sha256`);
    assertSafeInteger(member.bytes, `manifest.members[${index}].bytes`, 1);
    if (member.bytes >= manifest.maxMemberBytesExclusive) throw new Error('manifest: member exceeds exclusive limit');
    if (paths.has(member.logicalPath) || hashes.has(member.sha256) || roles.has(member.role)) throw new Error('manifest: duplicate path, hash or role');
    paths.add(member.logicalPath); hashes.add(member.sha256); roles.add(member.role); total += member.bytes;
  });
  if (total !== manifest.totalBytes || total > manifest.maxTotalBytesInclusive) throw new Error('manifest: total byte budget mismatch');
  const projection = { packageId: manifest.packageId, sourceCommit: manifest.sourceCommit, members: manifest.members };
  if (contentRoot('CONNECT-B0-V8-PACKAGE-CONTENT-V1', projection) !== manifest.packageContentRoot) throw new Error('manifest: packageContentRoot mismatch');
  return manifest;
}

export function makeClosedSchema(schemaId, requiredKeys, nullableKeys = []) {
  assertId(schemaId, 'schema.schemaId');
  if (!Array.isArray(requiredKeys) || requiredKeys.length === 0 || new Set(requiredKeys).size !== requiredKeys.length) throw new Error('schema: requiredKeys must be a non-empty unique array');
  if (!Array.isArray(nullableKeys) || new Set(nullableKeys).size !== nullableKeys.length) throw new Error('schema: nullableKeys must be unique');
  for (const key of [...requiredKeys, ...nullableKeys]) assertString(key, 'schema key');
  if (nullableKeys.some((key) => !requiredKeys.includes(key))) throw new Error('schema: nullable key must also be required');
  const base = { additionalProperties: false, nullableKeys: [...nullableKeys].sort(), requiredKeys: [...requiredKeys].sort(), schemaId };
  return { ...base, schemaRoot: contentRoot('CONNECT-B0-V8-CLOSED-SCHEMA-V1', base) };
}

export function validateClosedSchema(schema) {
  assertClosedObject(schema, ['additionalProperties', 'nullableKeys', 'requiredKeys', 'schemaId', 'schemaRoot'], 'closedSchema');
  if (schema.additionalProperties !== false) throw new Error('closedSchema: additionalProperties must be false');
  const rebuilt = makeClosedSchema(schema.schemaId, schema.requiredKeys, schema.nullableKeys);
  if (canonical(rebuilt) !== canonical(schema)) throw new Error('closedSchema: schemaRoot or normalized keys mismatch');
  return schema;
}

export function validateObjectAgainstClosedSchema(value, schema, label) {
  validateClosedSchema(schema);
  assertClosedObject(value, schema.requiredKeys, label);
  for (const key of schema.requiredKeys) {
    if (value[key] === null && !schema.nullableKeys.includes(key)) throw new Error(`${label}.${key}: null forbidden`);
  }
  return value;
}

export function validateB0V8Registry(registry) {
  const topKeys = ['artifactClass', 'artifactId', 'authorityModel', 'canonicalization', 'currentState', 'externalEvidence', 'findingControls', 'globalPolicy', 'interfaceProvenancePolicy', 'noSelfAcceptancePolicy', 'pathPolicy', 'permitPolicy', 'predecessorPolicy', 'recoveryPolicy', 'repositoryVisibility', 'schemaCatalog', 'schemaVersion', 'storagePolicy', 'transactionModel'];
  assertClosedObject(registry, topKeys, 'registry');
  if (registry.schemaVersion !== 'CONNECT-B0-V8-NORMATIVE-REGISTRY-V1') throw new Error('registry: wrong schemaVersion');
  if (registry.repositoryVisibility !== 'PUBLIC') throw new Error('registry: repositoryVisibility must be PUBLIC');
  assertId(registry.artifactId, 'registry.artifactId');
  assertString(registry.artifactClass, 'registry.artifactClass');
  assertClosedObject(registry.currentState, ['acceptance', 'authorityOutputs', 'b0', 'developmentFreeze', 'externalClosureCount', 'gate29', 'localControlCount', 'status'], 'registry.currentState');
  if (registry.currentState.b0 !== 'ABSENT' || registry.currentState.gate29 !== 'BLOCKED' || registry.currentState.developmentFreeze !== 'ACTIVE' || registry.currentState.status !== 'CANDIDATE-NOT-ACCEPTED') throw new Error('registry: unsafe current-state claim');
  if (registry.currentState.acceptance !== 0 || registry.currentState.authorityOutputs !== 0 || registry.currentState.externalClosureCount !== 0 || registry.currentState.localControlCount !== 14) throw new Error('registry: invalid current-state counters');
  assertClosedObject(registry.canonicalization, ['algorithm', 'domainSeparation', 'safeIntegersOnly', 'unicodeScalarStringsOnly'], 'registry.canonicalization');
  if (registry.canonicalization.algorithm !== 'UTF8-CANONICAL-JSON-LEXICOGRAPHIC-OBJECT-KEYS-V1' || registry.canonicalization.domainSeparation !== true || registry.canonicalization.safeIntegersOnly !== true || registry.canonicalization.unicodeScalarStringsOnly !== true) throw new Error('registry: canonicalization weakened');
  assertClosedObject(registry.pathPolicy, ['allowedPrefixes', 'hardLinksRejected', 'noFollowOpenRequired', 'realpathContainmentRequired', 'regularFilesOnly', 'symlinksRejected'], 'registry.pathPolicy');
  if (canonical(registry.pathPolicy.allowedPrefixes) !== canonical(['docs/planning/', 'scripts/', 'tests/']) || Object.entries(registry.pathPolicy).some(([key, value]) => key !== 'allowedPrefixes' && value !== true)) throw new Error('registry: path policy weakened');
  assertClosedObject(registry.externalEvidence, ['authenticatedPublicRemoteReceiptPresent', 'independentReviewerReceiptPresent', 'operationalEvidencePresent', 'productionKeysGenerated', 'requiredReceiptClasses', 'signatureAlgorithmSelection', 'trustedTimePresent'], 'registry.externalEvidence');
  if (registry.externalEvidence.operationalEvidencePresent !== false || registry.externalEvidence.productionKeysGenerated !== false || registry.externalEvidence.trustedTimePresent !== false || registry.externalEvidence.authenticatedPublicRemoteReceiptPresent !== false || registry.externalEvidence.independentReviewerReceiptPresent !== false) throw new Error('registry: external evidence may not be self-asserted');
  if (registry.externalEvidence.signatureAlgorithmSelection !== 'UNSELECTED-PER-USE-APPROVAL-REQUIRED') throw new Error('registry: signature algorithm selected without approval');
  if (!Array.isArray(registry.externalEvidence.requiredReceiptClasses) || registry.externalEvidence.requiredReceiptClasses.length < 5) throw new Error('registry: incomplete external receipt classes');
  assertClosedObject(registry.authorityModel, ['controllerSeparationSatisfied', 'currentAppointments', 'logicalRoles', 'ownerCount', 'primaryBackupModel', 'workOwner'], 'registry.authorityModel');
  if (registry.authorityModel.workOwner !== 'Tal' || registry.authorityModel.ownerCount !== 1 || registry.authorityModel.primaryBackupModel !== 'REMOVED' || registry.authorityModel.controllerSeparationSatisfied !== false || !Array.isArray(registry.authorityModel.currentAppointments) || registry.authorityModel.currentAppointments.length !== 0) throw new Error('registry: authority ownership or current evidence misstated');
  if (!Array.isArray(registry.authorityModel.logicalRoles) || registry.authorityModel.logicalRoles.length < 4 || new Set(registry.authorityModel.logicalRoles).size !== registry.authorityModel.logicalRoles.length) throw new Error('registry: logical roles invalid');
  assertClosedObject(registry.permitPolicy, ['consumptionIdentity', 'permitSchemaKeys', 'revokeWins', 'strictlyNewerRevision', 'trustedTimeRequired'], 'registry.permitPolicy');
  if (registry.permitPolicy.consumptionIdentity !== 'permitId+replayKey+attemptId' || registry.permitPolicy.revokeWins !== true || registry.permitPolicy.strictlyNewerRevision !== true || registry.permitPolicy.trustedTimeRequired !== true || canonical([...registry.permitPolicy.permitSchemaKeys].sort()) !== canonical([...PERMIT_KEYS].sort())) throw new Error('registry: Permit policy weakened');
  assertClosedObject(registry.transactionModel, ['atomicWriteKeys', 'attemptSchemaKeys', 'implementation', 'outboxIdentityKey', 'replayIdentityKeys', 'responseLossReadback', 'stateSchemaKeys', 'stepIds'], 'registry.transactionModel');
  const expectedSteps = ['READ-CURRENT-STATE', 'VALIDATE-CLOSED-SCHEMAS', 'VALIDATE-DETACHED-RECEIPTS', 'VALIDATE-PERMIT-AND-TIME', 'VALIDATE-REVOCATION-AND-REPLAY', 'REVALIDATE-EXACT-READ-SET', 'ATOMIC-COMMIT', 'AUTHORITATIVE-READBACK'];
  if (canonical(registry.transactionModel.stepIds) !== canonical(expectedSteps) || registry.transactionModel.implementation !== 'scripts/b0-v8-core.mjs#applyPlanningCas' || registry.transactionModel.outboxIdentityKey !== 'effectId' || registry.transactionModel.responseLossReadback !== 'attemptLedger[attemptId]+requestRoot') throw new Error('registry: transaction model weakened');
  if (canonical([...registry.transactionModel.stateSchemaKeys].sort()) !== canonical([...STATE_KEYS].sort()) || canonical([...registry.transactionModel.attemptSchemaKeys].sort()) !== canonical([...ATTEMPT_KEYS].sort())) throw new Error('registry: transaction schemas diverge from reducer');
  for (const requiredWrite of ['headRoot', 'revision', 'pointerRoot', 'acceptance', 'consumedPermits', 'replayLedger', 'attemptLedger', 'outbox']) if (!registry.transactionModel.atomicWriteKeys.includes(requiredWrite)) throw new Error(`registry: missing atomic write ${requiredWrite}`);
  if (canonical(registry.transactionModel.replayIdentityKeys) !== canonical(['permitId', 'replayKey', 'attemptId'])) throw new Error('registry: replay identity weakened');
  assertClosedObject(registry.recoveryPolicy, ['atomicWriteKeys', 'implementation', 'memberCount', 'readSetRevalidation', 'threshold', 'witnessCount'], 'registry.recoveryPolicy');
  if (registry.recoveryPolicy.memberCount !== 5 || registry.recoveryPolicy.threshold !== 3 || registry.recoveryPolicy.witnessCount !== 2 || registry.recoveryPolicy.readSetRevalidation !== 'EXACT-HEADS-AND-REQUEST-BYTES' || registry.recoveryPolicy.implementation !== 'scripts/b0-v8-core.mjs#applyPlanningRecovery') throw new Error('registry: Recovery policy weakened');
  for (const requiredWrite of ['activeAuthorityRoot', 'revokedAuthorityRoots', 'consumedAttemptIds', 'recoveryHeadRoot']) if (!registry.recoveryPolicy.atomicWriteKeys.includes(requiredWrite)) throw new Error(`registry: missing Recovery write ${requiredWrite}`);
  assertClosedObject(registry.globalPolicy, ['causalEventOrder', 'currentStateSeparated', 'implementation', 'noSelfCredit'], 'registry.globalPolicy');
  if (registry.globalPolicy.currentStateSeparated !== true || registry.globalPolicy.noSelfCredit !== true || registry.globalPolicy.implementation !== 'scripts/b0-v8-core.mjs#evaluateCausalTrace') throw new Error('registry: global policy weakened');
  assertClosedObject(registry.interfaceProvenancePolicy, ['actualProducedAfterExpectedFreeze', 'commonSourceForbidden', 'dependencyGraphRequired', 'detachedReceiptRequired', 'futureProviderReadForbidden', 'interfaceCount'], 'registry.interfaceProvenancePolicy');
  if (registry.interfaceProvenancePolicy.interfaceCount !== 17 || Object.entries(registry.interfaceProvenancePolicy).some(([key, value]) => key !== 'interfaceCount' && value !== true)) throw new Error('registry: interface provenance weakened');
  assertClosedObject(registry.noSelfAcceptancePolicy, ['acceptanceImplementation', 'producerPassCreatesAcceptance', 'readerControllersMustDiffer', 'reviewCreatesAcceptance'], 'registry.noSelfAcceptancePolicy');
  if (registry.noSelfAcceptancePolicy.acceptanceImplementation !== 'scripts/b0-v8-core.mjs#evaluateAcceptanceGate' || registry.noSelfAcceptancePolicy.producerPassCreatesAcceptance !== false || registry.noSelfAcceptancePolicy.reviewCreatesAcceptance !== false || registry.noSelfAcceptancePolicy.readerControllersMustDiffer !== true) throw new Error('registry: no-self-Acceptance weakened');
  assertClosedObject(registry.predecessorPolicy, ['activeFindingCount', 'behaviorOracleComplete', 'behaviorOracleRequired', 'closureTransfer', 'mergeAllowed', 'sourceHashOnlySufficient'], 'registry.predecessorPolicy');
  if (registry.predecessorPolicy.activeFindingCount !== 38 || registry.predecessorPolicy.behaviorOracleComplete !== false || registry.predecessorPolicy.behaviorOracleRequired !== true || registry.predecessorPolicy.closureTransfer !== 0 || registry.predecessorPolicy.mergeAllowed !== false || registry.predecessorPolicy.sourceHashOnlySufficient !== false) throw new Error('registry: predecessor non-weakening overstated');
  assertClosedObject(registry.storagePolicy, ['duplicateHashesAllowed', 'duplicatePathsAllowed', 'duplicateRolesAllowed', 'maxMemberBytesExclusive', 'maxPackageBytesInclusive', 'physicalPredecessorDuplicationAllowed'], 'registry.storagePolicy');
  if (registry.storagePolicy.duplicateHashesAllowed !== false || registry.storagePolicy.duplicatePathsAllowed !== false || registry.storagePolicy.duplicateRolesAllowed !== false || registry.storagePolicy.physicalPredecessorDuplicationAllowed !== false) throw new Error('registry: storage uniqueness weakened');
  assertSafeInteger(registry.storagePolicy.maxMemberBytesExclusive, 'registry.storagePolicy.maxMemberBytesExclusive', 1);
  assertSafeInteger(registry.storagePolicy.maxPackageBytesInclusive, 'registry.storagePolicy.maxPackageBytesInclusive', 1);
  if (!Array.isArray(registry.schemaCatalog) || registry.schemaCatalog.length < 6) throw new Error('registry: schema catalog incomplete');
  registry.schemaCatalog.forEach(validateClosedSchema);
  if (new Set(registry.schemaCatalog.map((schema) => schema.schemaId)).size !== registry.schemaCatalog.length) throw new Error('registry: duplicate schema ID');
  if (!Array.isArray(registry.findingControls) || registry.findingControls.length !== 14) throw new Error('registry: finding control count mismatch');
  const expectedFindingIds = B0_V8_FINDINGS.map(([id]) => id);
  const observedFindingIds = registry.findingControls.map((row) => row.findingId);
  if (canonical(observedFindingIds) !== canonical(expectedFindingIds)) throw new Error('registry: finding identity/order mismatch');
  registry.findingControls.forEach((row, index) => {
    assertClosedObject(row, ['closureStatus', 'controlId', 'externalEvidenceRequired', 'findingId', 'localStatus', 'severity', 'testIds'], `registry.findingControls[${index}]`);
    if (row.severity !== B0_V8_FINDINGS[index][1] || row.localStatus !== 'IMPLEMENTED-CANDIDATE' || row.closureStatus !== 'OPEN-PENDING-INDEPENDENT-EVIDENCE') throw new Error('registry: finding status overstated');
    if (!Array.isArray(row.testIds) || row.testIds.length === 0 || !Array.isArray(row.externalEvidenceRequired)) throw new Error('registry: finding tests/evidence invalid');
  });
  return registry;
}

export function makeB0V8Registry() {
  const topKeys = ['artifactClass', 'artifactId', 'authorityModel', 'canonicalization', 'currentState', 'externalEvidence', 'findingControls', 'globalPolicy', 'interfaceProvenancePolicy', 'noSelfAcceptancePolicy', 'pathPolicy', 'permitPolicy', 'predecessorPolicy', 'recoveryPolicy', 'repositoryVisibility', 'schemaCatalog', 'schemaVersion', 'storagePolicy', 'transactionModel'];
  const schemas = [
    makeClosedSchema('B0V8-NORMATIVE-REGISTRY', topKeys),
    makeClosedSchema('B0V8-EXTERNAL-RECEIPT', RECEIPT_KEYS),
    makeClosedSchema('B0V8-PERMIT', PERMIT_KEYS),
    makeClosedSchema('B0V8-CAS-STATE', STATE_KEYS, ['acceptance', 'pointerRoot']),
    makeClosedSchema('B0V8-CAS-ATTEMPT', ATTEMPT_KEYS),
    makeClosedSchema('B0V8-RECOVERY-STATE', RECOVERY_STATE_KEYS),
    makeClosedSchema('B0V8-RECOVERY-REQUEST', RECOVERY_REQUEST_KEYS),
    makeClosedSchema('B0V8-PACKAGE-MANIFEST', ['artifactClass', 'artifactId', 'generatedAt', 'maxMemberBytesExclusive', 'maxTotalBytesInclusive', 'memberCount', 'members', 'packageContentRoot', 'packageId', 'repositoryVisibility', 'schemaVersion', 'sourceCommit', 'totalBytes']),
    makeClosedSchema('B0V8-PACKAGE-MEMBER', ['bytes', 'logicalPath', 'ordinal', 'role', 'sha256']),
    makeClosedSchema('B0V8-SOURCE-INDEX', ['artifactClass', 'artifactId', 'repositoryVisibility', 'schemaVersion', 'sourceCount', 'sourceRows', 'sourceSetRoot']),
    makeClosedSchema('B0V8-SOURCE-ROW', ['bytes', 'logicalPath', 'mode', 'ordinal', 'sha256']),
    makeClosedSchema('B0V8-CLOSURE-CROSSWALK', ['artifactClass', 'artifactId', 'closureCount', 'crosswalkRoot', 'findingCount', 'repositoryVisibility', 'rows', 'schemaVersion']),
    makeClosedSchema('B0V8-CLOSURE-ROW', ['closureStatus', 'controlId', 'externalEvidenceRequired', 'findingId', 'localStatus', 'ordinal', 'severity', 'testIds']),
    makeClosedSchema('B0V8-MUTATION-CORPUS', ['artifactClass', 'artifactId', 'blockedCount', 'caseCount', 'cases', 'corpusRoot', 'repositoryVisibility', 'schemaVersion']),
    makeClosedSchema('B0V8-MUTATION-CASE', ['actual', 'findingId', 'mutationId', 'ordinal', 'target', 'testRoot']),
  ];
  const evidenceByFinding = {
    'B0V7-IHR-F001': [],
    'B0V7-IHR-F002': ['DETACHED-ACCEPTANCE-CONTEXT'],
    'B0V7-IHR-F003': ['GENESIS-APPOINTMENT-SIGNATURE', 'TRUST-ANCHOR'],
    'B0V7-IHR-F004': ['TRUSTED-TIME', 'PERMIT-SIGNATURE', 'REVOCATION-RECEIPT'],
    'B0V7-IHR-F005': ['DURABLE-TRANSACTION-ADAPTER'],
    'B0V7-IHR-F006': ['FIVE-CONTROLLER-APPOINTMENTS', 'TWO-WITNESS-APPOINTMENTS'],
    'B0V7-IHR-F007': ['DURABLE-RECOVERY-ADAPTER'],
    'B0V7-IHR-F008': ['EXTERNAL-ADMISSION-TRACE'],
    'B0V7-IHR-F009': ['DETACHED-INTERFACE-PROVENANCE-RECEIPT'],
    'B0V7-IHR-F010': ['TWO-INDEPENDENT-READER-APPOINTMENTS'],
    'B0V7-IHR-F011': [],
    'B0V7-IHR-F012': ['AUTHENTICATED-PUBLIC-REMOTE-RECEIPT'],
    'B0V7-IHR-F013': [],
    'B0V7-IHR-F014': ['INDEPENDENT-PREDECESSOR-BEHAVIOR-ORACLE'],
  };
  const findingControls = B0_V8_FINDINGS.map(([findingId, severity], index) => ({
    closureStatus: 'OPEN-PENDING-INDEPENDENT-EVIDENCE',
    controlId: `B0V8-CONTROL-${String(index + 1).padStart(3, '0')}`,
    externalEvidenceRequired: evidenceByFinding[findingId],
    findingId,
    localStatus: 'IMPLEMENTED-CANDIDATE',
    severity,
    testIds: [`B0V8-MUTATION-${String(index + 1).padStart(3, '0')}`],
  }));
  const registry = {
    artifactClass: 'IMMUTABLE-PLANNING-CANDIDATE-NOT-AUTHORITY-NOT-ACCEPTANCE',
    artifactId: 'CONNECT-B0-V8-NORMATIVE-REGISTRY-2026-08-30-G0',
    authorityModel: {
      controllerSeparationSatisfied: false,
      currentAppointments: [],
      logicalRoles: ['WORK-OWNER', 'PRODUCER', 'READER-A', 'READER-B', 'EXTERNAL-ACCEPTOR'],
      ownerCount: 1,
      primaryBackupModel: 'REMOVED',
      workOwner: 'Tal',
    },
    canonicalization: {
      algorithm: 'UTF8-CANONICAL-JSON-LEXICOGRAPHIC-OBJECT-KEYS-V1',
      domainSeparation: true,
      safeIntegersOnly: true,
      unicodeScalarStringsOnly: true,
    },
    currentState: {
      acceptance: 0,
      authorityOutputs: 0,
      b0: 'ABSENT',
      developmentFreeze: 'ACTIVE',
      externalClosureCount: 0,
      gate29: 'BLOCKED',
      localControlCount: 14,
      status: 'CANDIDATE-NOT-ACCEPTED',
    },
    externalEvidence: {
      authenticatedPublicRemoteReceiptPresent: false,
      independentReviewerReceiptPresent: false,
      operationalEvidencePresent: false,
      productionKeysGenerated: false,
      requiredReceiptClasses: ['APPOINTMENT', 'SIGNATURE-VERIFICATION', 'TRUSTED-TIME', 'REVOCATION', 'PUBLIC-REMOTE', 'DURABLE-TRANSACTION', 'DURABLE-RECOVERY', 'INTERFACE-PROVENANCE', 'INDEPENDENT-READER'],
      signatureAlgorithmSelection: 'UNSELECTED-PER-USE-APPROVAL-REQUIRED',
      trustedTimePresent: false,
    },
    findingControls,
    globalPolicy: {
      causalEventOrder: ['EXTERNAL-CONTEXT-ADMITTED', 'PERMIT-ADMITTED', 'CAS-COMMITTED', 'RESPONSE-READBACK', 'RECOVERY-COMMITTED', 'CURRENT-STATE-BLOCKED'],
      currentStateSeparated: true,
      implementation: 'scripts/b0-v8-core.mjs#evaluateCausalTrace',
      noSelfCredit: true,
    },
    interfaceProvenancePolicy: {
      actualProducedAfterExpectedFreeze: true,
      commonSourceForbidden: true,
      dependencyGraphRequired: true,
      detachedReceiptRequired: true,
      futureProviderReadForbidden: true,
      interfaceCount: 17,
    },
    noSelfAcceptancePolicy: {
      acceptanceImplementation: 'scripts/b0-v8-core.mjs#evaluateAcceptanceGate',
      producerPassCreatesAcceptance: false,
      readerControllersMustDiffer: true,
      reviewCreatesAcceptance: false,
    },
    pathPolicy: {
      allowedPrefixes: ['docs/planning/', 'scripts/', 'tests/'],
      hardLinksRejected: true,
      noFollowOpenRequired: true,
      realpathContainmentRequired: true,
      regularFilesOnly: true,
      symlinksRejected: true,
    },
    permitPolicy: {
      consumptionIdentity: 'permitId+replayKey+attemptId',
      permitSchemaKeys: [...PERMIT_KEYS],
      revokeWins: true,
      strictlyNewerRevision: true,
      trustedTimeRequired: true,
    },
    predecessorPolicy: {
      activeFindingCount: 38,
      behaviorOracleComplete: false,
      behaviorOracleRequired: true,
      closureTransfer: 0,
      mergeAllowed: false,
      sourceHashOnlySufficient: false,
    },
    recoveryPolicy: {
      atomicWriteKeys: ['activeAuthorityRoot', 'revokedAuthorityRoots', 'consumedAttemptIds', 'recoveryHeadRoot'],
      implementation: 'scripts/b0-v8-core.mjs#applyPlanningRecovery',
      memberCount: 5,
      readSetRevalidation: 'EXACT-HEADS-AND-REQUEST-BYTES',
      threshold: 3,
      witnessCount: 2,
    },
    repositoryVisibility: 'PUBLIC',
    schemaCatalog: schemas,
    schemaVersion: 'CONNECT-B0-V8-NORMATIVE-REGISTRY-V1',
    storagePolicy: {
      duplicateHashesAllowed: false,
      duplicatePathsAllowed: false,
      duplicateRolesAllowed: false,
      maxMemberBytesExclusive: 10 * 1024 * 1024,
      maxPackageBytesInclusive: 25 * 1024 * 1024,
      physicalPredecessorDuplicationAllowed: false,
    },
    transactionModel: {
      atomicWriteKeys: ['headRoot', 'revision', 'pointerRoot', 'acceptance', 'consumedPermits', 'replayLedger', 'attemptLedger', 'outbox'],
      attemptSchemaKeys: [...ATTEMPT_KEYS],
      implementation: 'scripts/b0-v8-core.mjs#applyPlanningCas',
      outboxIdentityKey: 'effectId',
      replayIdentityKeys: ['permitId', 'replayKey', 'attemptId'],
      responseLossReadback: 'attemptLedger[attemptId]+requestRoot',
      stateSchemaKeys: [...STATE_KEYS],
      stepIds: ['READ-CURRENT-STATE', 'VALIDATE-CLOSED-SCHEMAS', 'VALIDATE-DETACHED-RECEIPTS', 'VALIDATE-PERMIT-AND-TIME', 'VALIDATE-REVOCATION-AND-REPLAY', 'REVALIDATE-EXACT-READ-SET', 'ATOMIC-COMMIT', 'AUTHORITATIVE-READBACK'],
    },
  };
  validateB0V8Registry(registry);
  return registry;
}

export function makeRoot(label) {
  return contentRoot('CONNECT-B0-V8-DETERMINISTIC-PROTOCOL-VECTOR-V1', label);
}

export function makeExternalReceipt(label, payloadRoot, contextRoot = makeRoot(`${label}-CONTEXT`)) {
  const issuedAt = '2026-08-30T12:00:00Z';
  return {
    artifactRoot: makeRoot(`${label}-ARTIFACT`),
    contextRoot,
    expiresAt: '2026-08-31T12:00:00Z',
    issuedAt,
    issuerAppointmentRoot: makeRoot(`${label}-ISSUER-APPOINTMENT`),
    payloadRoot,
    receiptId: `B0V8-${label}-RECEIPT`,
    verifierArtifactRoot: makeRoot(`${label}-VERIFIER`),
  };
}

export function makeProtocolCasVector() {
  const permitProjection = {
    issuerAppointmentRoot: makeRoot('PERMIT-ISSUER'), permitId: 'B0V8-PERMIT-001', replayKey: 'B0V8-REPLAY-001', revision: 2,
    scope: 'B0V8-ACCEPTANCE-COMMIT', signatureReceiptRoot: makeRoot('PERMIT-SIGNATURE-RECEIPT'), subjectRoot: makeRoot('PERMIT-SUBJECT'),
    validFrom: '2026-08-30T00:00:00Z', validUntil: '2026-08-31T00:00:00Z',
  };
  const permit = { ...permitProjection, permitRoot: contentRoot('CONNECT-B0-V8-PERMIT-V1', permitProjection) };
  const state = {
    acceptance: null, attemptLedger: [], consumedPermits: [], headRoot: makeRoot('HEAD-1'), outbox: [], permits: [permit], pointerRoot: null,
    recoveryHeadRoot: makeRoot('RECOVERY-HEAD-1'), replayLedger: [], revision: 1, revocationHeadRoot: makeRoot('REVOCATION-HEAD-1'),
    schemaVersion: 'CONNECT-B0-V8-CAS-STATE-V1', securityHeadRoot: makeRoot('SECURITY-HEAD-1'),
  };
  const proposedAcceptanceRoot = makeRoot('ACCEPTANCE-001');
  const trustedInstant = '2026-08-30T12:00:00Z';
  const attempt = {
    acceptanceContextReceipt: makeExternalReceipt('ACCEPTANCE-CONTEXT', proposedAcceptanceRoot, state.securityHeadRoot), attemptId: 'B0V8-ATTEMPT-001',
    expectedHeadRoot: state.headRoot, expectedRevision: state.revision, expectedRevocationHeadRoot: state.revocationHeadRoot,
    expectedSecurityHeadRoot: state.securityHeadRoot, permitId: permit.permitId, proposedAcceptanceRoot, proposedEffectId: 'B0V8-EFFECT-001',
    proposedPointerRoot: makeRoot('POINTER-001'), replayKey: permit.replayKey, requestRoot: makeRoot('REQUEST-001'), scope: permit.scope,
    signatureVerificationReceipt: makeExternalReceipt('SIGNATURE-VERIFY', permit.permitRoot), subjectRoot: permit.subjectRoot,
    trustedTimeReceipt: { receipt: makeExternalReceipt('TRUSTED-TIME', contentRoot('CONNECT-B0-V8-TRUSTED-INSTANT-V1', { trustedInstant })), trustedInstant },
  };
  attempt.signatureVerificationReceipt.artifactRoot = permit.signatureReceiptRoot;
  return { state, attempt };
}

export function makeProtocolRecoveryVector() {
  const state = {
    activeAuthorityRoot: makeRoot('AUTHORITY-OLD'), consumedAttemptIds: [], recoveryHeadRoot: makeRoot('RECOVERY-HEAD-OLD'),
    revokedAuthorityRoots: [], schemaVersion: 'CONNECT-B0-V8-RECOVERY-STATE-V1', securityHeadRoot: makeRoot('SECURITY-HEAD-RECOVERY'),
  };
  const appointment = (kind, index) => ({
    appointmentRoot: makeRoot(`${kind}-${index}-APPOINTMENT`), controllerRoot: makeRoot(`${kind}-${index}-CONTROLLER`),
    identityId: `B0V8-${kind}-${String(index).padStart(2, '0')}`, signatureReceiptRoot: makeRoot(`${kind}-${index}-SIGNATURE`),
  });
  const memberAppointments = [1, 2, 3, 4, 5].map((index) => appointment('MEMBER', index));
  const witnessAppointments = [1, 2].map((index) => appointment('WITNESS', index));
  const challengeRoot = makeRoot('RECOVERY-CHALLENGE-001');
  const acknowledgements = memberAppointments.slice(0, 3).map((member, index) => ({
    acknowledgementRoot: makeRoot(`RECOVERY-ACK-${index + 1}`), challengeRoot, memberIdentityId: member.identityId, signatureReceiptRoot: makeRoot(`RECOVERY-ACK-${index + 1}-SIGNATURE`),
  }));
  const request = {
    acknowledgements, attemptId: 'B0V8-RECOVERY-ATTEMPT-001', expectedRecoveryHeadRoot: state.recoveryHeadRoot,
    expectedSecurityHeadRoot: state.securityHeadRoot, memberAppointments, newAuthorityRoot: makeRoot('AUTHORITY-NEW'),
    trustedTimeReceipt: makeExternalReceipt('RECOVERY-TRUSTED-TIME', makeRoot('RECOVERY-TRUSTED-INSTANT')), witnessAppointments,
  };
  return { state, request };
}

export function makeProtocolTrace() {
  const types = ['EXTERNAL-CONTEXT-ADMITTED', 'PERMIT-ADMITTED', 'CAS-COMMITTED', 'RESPONSE-READBACK', 'RECOVERY-COMMITTED', 'CURRENT-STATE-BLOCKED'];
  const events = [];
  for (const eventType of types) {
    const priorEventRoot = events.length === 0 ? null : events.at(-1).eventRoot;
    events.push({ eventRoot: contentRoot('CONNECT-B0-V8-CAUSAL-EVENT-V1', { eventType, priorEventRoot }), eventType, priorEventRoot });
  }
  return events;
}

export function runB0V8MutationCampaign(registry = makeB0V8Registry()) {
  const rows = [];
  const recordThrowBlock = (ordinal, findingId, mutationId, target, action) => {
    let blocked = false;
    try { action(); } catch { blocked = true; }
    if (!blocked) throw new Error(`${mutationId}: hostile mutation was accepted`);
    const base = { actual: 'BLOCK', findingId, mutationId, ordinal, target };
    rows.push({ ...base, testRoot: contentRoot('CONNECT-B0-V8-MUTATION-RESULT-V1', base) });
  };
  const recordGateBlock = (ordinal, findingId, mutationId, target, action) => {
    const result = action();
    if (result.status !== 'BLOCKED') throw new Error(`${mutationId}: hostile gate mutation was accepted`);
    const base = { actual: 'BLOCK', findingId, mutationId, ordinal, target };
    rows.push({ ...base, testRoot: contentRoot('CONNECT-B0-V8-MUTATION-RESULT-V1', base) });
  };

  recordThrowBlock(1, 'B0V7-IHR-F001', 'B0V8-MUTATION-001', 'CLOSED-SCHEMA-METADATA', () => {
    const schema = clone(registry.schemaCatalog[0]); schema.additionalProperties = true; validateClosedSchema(schema);
  });
  recordThrowBlock(2, 'B0V7-IHR-F002', 'B0V8-MUTATION-002', 'DETACHED-ACCEPTANCE-CONTEXT', () => {
    const vector = makeProtocolCasVector(); vector.attempt.acceptanceContextReceipt.contextRoot = makeRoot('ATTACKER-SELF-CONTEXT'); applyPlanningCas(vector.state, vector.attempt);
  });
  recordThrowBlock(3, 'B0V7-IHR-F003', 'B0V8-MUTATION-003', 'SIGNATURE-RECEIPT-SCHEMA', () => {
    const vector = makeProtocolCasVector(); delete vector.attempt.signatureVerificationReceipt.issuerAppointmentRoot; applyPlanningCas(vector.state, vector.attempt);
  });
  recordThrowBlock(4, 'B0V7-IHR-F004', 'B0V8-MUTATION-004', 'KEYED-REPLAY-LEDGER', () => {
    const vector = makeProtocolCasVector(); const committed = applyPlanningCas(vector.state, vector.attempt); const retry = clone(vector.attempt);
    retry.attemptId = 'B0V8-ATTEMPT-002'; retry.expectedHeadRoot = committed.state.headRoot; retry.expectedRevision = committed.state.revision; applyPlanningCas(committed.state, retry);
  });
  recordThrowBlock(5, 'B0V7-IHR-F005', 'B0V8-MUTATION-005', 'ATOMIC-CAS-WRITE-SET', () => {
    const mutated = clone(registry); mutated.transactionModel.atomicWriteKeys = mutated.transactionModel.atomicWriteKeys.filter((key) => key !== 'outbox'); validateB0V8Registry(mutated);
  });
  recordThrowBlock(6, 'B0V7-IHR-F006', 'B0V8-MUTATION-006', 'RECOVERY-CONTROLLER-SEPARATION', () => {
    const vector = makeProtocolRecoveryVector(); vector.request.memberAppointments[1].controllerRoot = vector.request.memberAppointments[0].controllerRoot; applyPlanningRecovery(vector.state, vector.request);
  });
  recordThrowBlock(7, 'B0V7-IHR-F007', 'B0V8-MUTATION-007', 'RECOVERY-READ-SET-REVALIDATION', () => {
    const vector = makeProtocolRecoveryVector(); vector.request.expectedRecoveryHeadRoot = makeRoot('STALE-RECOVERY-HEAD'); applyPlanningRecovery(vector.state, vector.request);
  });
  recordThrowBlock(8, 'B0V7-IHR-F008', 'B0V8-MUTATION-008', 'GLOBAL-CAUSAL-CONJUNCTION', () => evaluateCausalTrace(makeProtocolTrace().slice(0, 5)));
  recordThrowBlock(9, 'B0V7-IHR-F009', 'B0V8-MUTATION-009', 'INTERFACE-PROVENANCE-POLICY', () => {
    const mutated = clone(registry); mutated.interfaceProvenancePolicy.futureProviderReadForbidden = false; validateB0V8Registry(mutated);
  });
  recordGateBlock(10, 'B0V7-IHR-F010', 'B0V8-MUTATION-010', 'READER-CONTROLLER-INDEPENDENCE', () => {
    const controller = makeRoot('ONE-CONTROLLER');
    return evaluateAcceptanceGate({ producerControllerRoot: controller, readerControllerRoots: [controller, makeRoot('READER-B')], remoteReceiptPresent: true, predecessorOracleComplete: true, trustedTimePresent: true });
  });
  recordThrowBlock(11, 'B0V7-IHR-F011', 'B0V8-MUTATION-011', 'REPOSITORY-PATH-CONFINEMENT', () => assertRepoRelativePath('docs/planning/../outside'));
  recordGateBlock(12, 'B0V7-IHR-F012', 'B0V8-MUTATION-012', 'AUTHENTICATED-PUBLIC-REMOTE-RECEIPT', () => evaluateAcceptanceGate({
    producerControllerRoot: makeRoot('PRODUCER'), readerControllerRoots: [makeRoot('READER-A'), makeRoot('READER-B')], remoteReceiptPresent: false, predecessorOracleComplete: true, trustedTimePresent: true,
  }));
  recordThrowBlock(13, 'B0V7-IHR-F013', 'B0V8-MUTATION-013', 'PACKAGE-INVENTORY-UNIQUENESS', () => {
    const members = [
      { bytes: 10, logicalPath: 'docs/planning/a.json', ordinal: 1, role: 'B0V8-MEMBER-A', sha256: makeRoot('MEMBER-A') },
      { bytes: 20, logicalPath: 'docs/planning/a.json', ordinal: 2, role: 'B0V8-MEMBER-B', sha256: makeRoot('MEMBER-B') },
    ];
    const projection = { packageId: 'CONNECT-B0-V8-PACKAGE-001', sourceCommit: makeRoot('SOURCE-COMMIT'), members };
    validatePackageManifest({ artifactClass: 'IMMUTABLE-PLANNING-PACKAGE-MANIFEST', artifactId: 'CONNECT-B0-V8-MANIFEST-001', generatedAt: '2026-08-30T12:00:00Z', maxMemberBytesExclusive: 1024, maxTotalBytesInclusive: 2048, memberCount: 2, members, packageContentRoot: contentRoot('CONNECT-B0-V8-PACKAGE-CONTENT-V1', projection), packageId: projection.packageId, repositoryVisibility: 'PUBLIC', schemaVersion: 'CONNECT-B0-V8-PACKAGE-MANIFEST-V1', sourceCommit: projection.sourceCommit, totalBytes: 30 });
  });
  recordGateBlock(14, 'B0V7-IHR-F014', 'B0V8-MUTATION-014', 'PREDECESSOR-BEHAVIOR-ORACLE', () => evaluateAcceptanceGate({
    producerControllerRoot: makeRoot('PRODUCER'), readerControllerRoots: [makeRoot('READER-A'), makeRoot('READER-B')], remoteReceiptPresent: true, predecessorOracleComplete: false, trustedTimePresent: true,
  }));
  if (rows.length !== 14 || new Set(rows.map((row) => row.findingId)).size !== 14) throw new Error('mutation campaign denominator mismatch');
  return rows;
}
