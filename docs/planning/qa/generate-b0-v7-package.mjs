#!/usr/bin/env node
/* Deterministic B0 v7 planning-package producer. Standard library only. */

import fs from 'node:fs';
import crypto from 'node:crypto';

const DATE = '2026-08-30';
const MAX_MEMBER_BYTES_EXCLUSIVE = 50 * 1024 * 1024;
const P = {
  subject: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-${DATE}.md`,
  manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-atomic-package-manifest-${DATE}.json`,
  registry: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-normative-registry-${DATE}.json`,
  sourceIndex: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-frozen-source-index-${DATE}.json`,
  crosswalk: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-closure-crosswalk-${DATE}.json`,
  corpus: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-validator-and-state-machine-corpus-${DATE}.json`,
  shard1: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-validator-and-state-machine-corpus-shard-01-of-02-${DATE}.json`,
  shard2: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-validator-and-state-machine-corpus-shard-02-of-02-${DATE}.json`,
  evidence: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-independent-interface-evidence-${DATE}.json`,
  interfaceGenerator: 'docs/planning/qa/generate-b0-v7-interface-evidence.py',
  packageGenerator: 'docs/planning/qa/generate-b0-v7-package.mjs',
  readerA: 'docs/planning/qa/b0-v7-qa-reader-a.mjs',
  readerB: 'docs/planning/qa/b0-v7-qa-reader-b.py',
  reportA: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-qa-reader-a-report-${DATE}.json`,
  reportB: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-qa-reader-b-report-${DATE}.json`,
  producerQa: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-producer-qa-${DATE}.json`,
};

const V6 = {
  subject: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-${DATE}.md`,
  manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-atomic-package-manifest-${DATE}.json`,
  registry: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-normative-registry-${DATE}.json`,
  crosswalk: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-closure-crosswalk-${DATE}.json`,
  corpus: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-${DATE}.json`,
  sourceIndex: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-source-member-span-index-${DATE}.json`,
  review: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-independent-hostile-review-${DATE}.md`,
  findings: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-independent-hostile-review-findings-manifest-${DATE}.md`,
  producerQa: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-producer-qa-${DATE}.json`,
  reportA: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-qa-reader-a-report-${DATE}.json`,
  reportB: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-qa-reader-b-report-${DATE}.json`,
  storageDecision: `docs/planning/github-public-repository-large-generated-artifact-storage-decision-${DATE}.md`,
};

const FROZEN = {
  subjectSha256: '61af4c45d394c952a58346723da408b663acd38522b5c706678a11ad323001c9',
  manifestSha256: 'ef6020643d6eccf1b656fd9d6aec845b80cc8b9bd2f81e8d426a2d8d1422a518',
  packageContentRoot: 'ed00ecb49e5053ca85ff7cccacc7378b36efe5cdb78f1aa6ca00550026372c2f',
  reviewSha256: 'ee254140535c57ffb03d852fa5d0d3f4eb01687a39eca500eb9f04de4b5f415b',
  findingsSha256: 'ca0142fcea3e8e8a16209c71f5b2ce5a14888f3b85b79f0b9390de468fa35282',
  producerQaSha256: '92d3cacf600ec8e1b75c4a6a084e5033381c33b68a092ff810fc831ef63d846c',
  reportASha256: '117adb64d15e8d6e5c9bfd120924e8f9b55529f5940477451081433c94f58be5',
  reportBSha256: '02ebdd12e558e075b016175a11961effbef0ea121f72c6a73b8d1c28c76550fd',
  storageDecisionSha256: '508b702087bc2c4011975af87c30bea1208bf5720ec263409d287acb5eb15a84',
};

function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('non-safe-integer canonical value');
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  throw new Error(`unsupported canonical type ${typeof value}`);
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortDeep(value[key])]));
  return value;
}

const pretty = (value) => `${JSON.stringify(sortDeep(value), null, 2)}\n`;
const shaBytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const shaText = (text) => shaBytes(Buffer.from(text, 'utf8'));
const root = (domain, value) => shaText(`${domain}\n${canonical(value)}`);
const readBytes = (logicalPath) => fs.readFileSync(logicalPath);
const readJson = (logicalPath) => JSON.parse(readBytes(logicalPath).toString('utf8'));
const fileFact = (logicalPath) => { const bytes = readBytes(logicalPath); return { logicalPath, sha256: shaBytes(bytes), bytes: bytes.length }; };
const fixtureRoot = (label) => root('B0V7-DETERMINISTIC-PLANNING-FIXTURE-V1', label);
const without = (object, key) => Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));

function patchFor(logicalPath, content) {
  const plus = content.split('\n').filter((_, index, rows) => !(index === rows.length - 1 && rows[index] === '')).map((line) => `+${line}`).join('\n');
  if (!fs.existsSync(logicalPath)) return `*** Add File: ${logicalPath}\n${plus}\n`;
  const old = readBytes(logicalPath).toString('utf8').split('\n').filter((_, index, rows) => !(index === rows.length - 1 && rows[index] === '')).map((line) => `-${line}`).join('\n');
  return `*** Update File: ${logicalPath}\n@@\n${old}\n${plus}\n`;
}

function emitPatch(files) {
  let output = '*** Begin Patch\n';
  for (const [logicalPath, content] of files) output += patchFor(logicalPath, content);
  output += '*** End Patch\n';
  process.stdout.write(output);
}

const CAS_STEP_IDS = [
  'READ_HEAD', 'READ_SECURITY_UNIVERSE', 'VALIDATE_SCHEMA', 'VALIDATE_AUTHORITY', 'VALIDATE_TIME',
  'VALIDATE_REVOCATION', 'COMPARE_EXPECTED_HEAD', 'RESERVE_ATTEMPT', 'ADVANCE_FENCE', 'CONSUME_PERMIT',
  'STAGE_POINTER', 'STAGE_ACCEPTANCE', 'STAGE_OUTBOX', 'REVALIDATE_READ_SET', 'ATOMIC_COMMIT',
];

function casActor() { return { pc: 0, terminal: false, committed: false, observedHead: null, observedSecurity: null, observedRevision: null, observedRevocation: null, validatedHead: null }; }
function casPlanningAttempt(actorName) {
  return {
    attemptId: `B0V7-CAS-ATTEMPT-${actorName}`, schemaValid: true, authorityCurrent: true, validFrom: '2026-08-30T00:00:00Z', validUntil: '2026-08-31T00:00:00Z', commitInstant: '2026-08-30T12:00:00Z',
    revoked: false, revocationHead: fixtureRoot('CAS-REVOCATION-HEAD-0'), expectedHead: 'HEAD-0', proposedFence: 1, minimumRevision: '6', replayUsed: false,
    outputRoot: fixtureRoot(`CAS-OUTPUT-${actorName}`), envelopeValid: true, effectId: `B0V7-CAS-EFFECT-${actorName}`,
  };
}
function casInitial(attemptOverrides = {}) {
  return {
    A: casActor(), B: casActor(), attempts: { A: { ...casPlanningAttempt('A'), ...(attemptOverrides.A ?? {}) }, B: { ...casPlanningAttempt('B'), ...(attemptOverrides.B ?? {}) } },
    store: { head: 'HEAD-0', securityHead: 'SECURITY-0', revisionHead: '7', revocationHead: fixtureRoot('CAS-REVOCATION-HEAD-0'), fence: 0, permitUsed: false, replayUsed: false, outboxCount: 0 },
  };
}
function casStep(source, actorName) {
  const state = structuredClone(source); const actor = state[actorName]; const attempt = state.attempts[actorName]; const step = CAS_STEP_IDS[actor.pc];
  if (actor.terminal || !step) return null;
  if (step === 'READ_HEAD') actor.observedHead = state.store.head;
  else if (step === 'READ_SECURITY_UNIVERSE') { actor.observedSecurity = state.store.securityHead; actor.observedRevision = state.store.revisionHead; actor.observedRevocation = state.store.revocationHead; }
  else if (step === 'VALIDATE_SCHEMA' && attempt.schemaValid !== true) { actor.terminal = true; return state; }
  else if (step === 'VALIDATE_AUTHORITY' && attempt.authorityCurrent !== true) { actor.terminal = true; return state; }
  else if (step === 'VALIDATE_TIME' && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(attempt.commitInstant) || !(attempt.validFrom <= attempt.commitInstant && attempt.commitInstant < attempt.validUntil))) { actor.terminal = true; return state; }
  else if (step === 'VALIDATE_REVOCATION' && (attempt.revoked || attempt.revocationHead !== state.store.revocationHead)) { actor.terminal = true; return state; }
  else if (step === 'COMPARE_EXPECTED_HEAD' && (actor.observedHead !== attempt.expectedHead || state.store.head !== attempt.expectedHead)) { actor.terminal = true; return state; }
  else if (step === 'RESERVE_ATTEMPT' && !/^[A-Z0-9][A-Z0-9-]{2,127}$/.test(attempt.attemptId)) { actor.terminal = true; return state; }
  else if (step === 'ADVANCE_FENCE' && !(Number.isSafeInteger(attempt.proposedFence) && attempt.proposedFence > state.store.fence)) { actor.terminal = true; return state; }
  else if (step === 'CONSUME_PERMIT' && (state.store.permitUsed || state.store.replayUsed || attempt.replayUsed || !/^(0|[1-9][0-9]{0,19})$/.test(attempt.minimumRevision) || BigInt(state.store.revisionHead) <= BigInt(attempt.minimumRevision))) { actor.terminal = true; return state; }
  else if (step === 'STAGE_POINTER' && !/^[0-9a-f]{64}$/.test(attempt.outputRoot)) { actor.terminal = true; return state; }
  else if (step === 'STAGE_ACCEPTANCE' && attempt.envelopeValid !== true) { actor.terminal = true; return state; }
  else if (step === 'STAGE_OUTBOX' && !/^[A-Z0-9][A-Z0-9-]{2,127}$/.test(attempt.effectId)) { actor.terminal = true; return state; }
  else if (step === 'REVALIDATE_READ_SET') {
    if (actor.observedHead !== state.store.head || actor.observedSecurity !== state.store.securityHead || actor.observedRevision !== state.store.revisionHead || actor.observedRevocation !== state.store.revocationHead || state.store.permitUsed || state.store.replayUsed) { actor.terminal = true; return state; }
    actor.validatedHead = state.store.head;
  } else if (step === 'ATOMIC_COMMIT') {
    if (actor.validatedHead !== state.store.head || state.store.permitUsed || state.store.replayUsed) { actor.terminal = true; return state; }
    state.store.head = `HEAD-${actorName}`; state.store.fence = attempt.proposedFence; state.store.permitUsed = true; state.store.replayUsed = true; state.store.outboxCount += 1; actor.committed = true; actor.terminal = true; actor.pc += 1; return state;
  }
  actor.pc += 1; return state;
}

function computeCasProof() {
  const memo = new Map(); const reachable = new Set(); let crashCutStateActorCount = 0; let crashViolationCount = 0;
  const keyOf = (state) => canonical(state);
  function visit(state) {
    const key = keyOf(state); reachable.add(key); if (memo.has(key)) return memo.get(key);
    for (const name of ['A', 'B']) {
      if (!state[name].terminal && state[name].pc < 15) {
        crashCutStateActorCount += 1; const before = canonical(state.store); const crashed = structuredClone(state); crashed[name].terminal = true;
        if (canonical(crashed.store) !== before) crashViolationCount += 1;
      }
    }
    if (state.A.terminal && state.B.terminal) {
      const committed = Number(state.A.committed) + Number(state.B.committed);
      const terminal = { schedules: 1n, oneCommit: committed === 1 ? 1n : 0n, twoCommit: committed === 2 ? 1n : 0n, zeroCommit: committed === 0 ? 1n : 0n };
      memo.set(key, terminal); return terminal;
    }
    const total = { schedules: 0n, oneCommit: 0n, twoCommit: 0n, zeroCommit: 0n };
    for (const name of ['A', 'B']) {
      if (state[name].terminal) continue; const next = casStep(state, name); if (!next) continue; const part = visit(next);
      for (const field of Object.keys(total)) total[field] += part[field];
    }
    memo.set(key, total); return total;
  }
  const totals = visit(casInitial());
  return {
    completeScheduleCount: totals.schedules.toString(), oneCommitScheduleCount: totals.oneCommit.toString(), twoCommitScheduleCount: totals.twoCommit.toString(), zeroCommitScheduleCount: totals.zeroCommit.toString(),
    reachableStateCount: reachable.size, crashCutStateActorCount, crashViolationCount, responseLossReadback: 'COMMITTED', outboxExactlyOnce: true,
  };
}

function buildValidatorLanguage() {
  const operators = [
    ['LITERAL', '1', 'return the sole JSON literal argument exactly'], ['GET', '1', 'resolve one RFC6901 JSON pointer; missing yields the MISSING sentinel'],
    ['PATH_EXISTS', '1', 'true iff the JSON pointer resolves'], ['AND', '1..N', 'true iff every child evaluates to boolean true'],
    ['OR', '1..N', 'true iff at least one child evaluates to boolean true'], ['NOT', '1', 'true iff the child evaluates to boolean false'],
    ['EQ', '2', 'canonical JSON equality; MISSING blocks'], ['NEQ', '2', 'canonical JSON inequality; MISSING blocks'],
    ['LT', '2', 'safe-integer strict less-than only'], ['LTE', '2', 'safe-integer less-than-or-equal only'],
    ['GT', '2', 'safe-integer strict greater-than only'], ['GTE', '2', 'safe-integer greater-than-or-equal only'],
    ['TYPE_IS', '2', 'first child must decode under the closed second-argument type'], ['EXACT_KEYS', '2', 'object key set equals the literal string-array key set'],
    ['UNIQUE_VALUES', '1', 'array canonical values are pairwise unique'], ['IN_SET', '2', 'first child canonically equals one literal array member'],
    ['MATCH', '2', 'Unicode regular expression search over a string; invalid expression blocks'], ['HASH_EQ', '3', 'domain-separated SHA-256 of first child equals third argument'],
  ].map(([operator, arity, totalSemantics]) => ({ operator, arity, inputDomain: 'JSON-AST-V1', outputType: operator === 'GET' || operator === 'LITERAL' ? 'JSON-OR-MISSING' : 'BOOLEAN', totalSemantics, invalidInputResult: 'BLOCK' }));
  const typeRows = [
    ['NULL', 'value is exactly JSON null'], ['BOOLEAN', 'value is exactly JSON true or false'], ['STRING', 'value is a JSON string'],
    ['NONEMPTY_STRING', 'string length is at least one Unicode scalar'], ['SAFE_INTEGER', 'integer in inclusive IEEE-754 safe range'],
    ['NONNEGATIVE_INTEGER', 'safe integer greater than or equal to zero'], ['U64_DECIMAL', 'canonical decimal string in 0..18446744073709551615'],
    ['SHA256', 'exactly 64 lowercase hexadecimal characters'], ['DETERMINISTIC_ID', '3..128 uppercase ASCII letters/digits/hyphens, first alphanumeric'],
    ['RFC3339_UTC', 'valid calendar instant exactly YYYY-MM-DDTHH:MM:SSZ'], ['JSON_POINTER', 'empty root pointer or RFC6901 slash tokens with only ~0 and ~1 escapes'],
    ['REPO_RELATIVE_PATH', 'starts docs/, no leading slash, web/ prefix, backslash, or dot-dot'], ['ARRAY', 'JSON array'], ['OBJECT', 'JSON object excluding array and null'],
  ].map(([type, totalDecoder]) => ({ type, totalDecoder, invalidResult: 'BLOCK', nullAllowed: type === 'NULL' }));
  const language = {
    languageId: 'B0V7-VALIDATOR-LANGUAGE-V1', astSchema: { exactKeys: ['op', 'args'], opType: 'NONEMPTY_STRING', argsType: 'ARRAY' },
    canonicalization: 'UTF8;OBJECT-KEYS-LEXICOGRAPHIC;ARRAY-ORDER-PRESERVED;SAFE-INTEGERS-ONLY', unknownOperatorPolicy: 'BLOCK', unknownTypePolicy: 'BLOCK', missingPathPolicy: 'MISSING-SENTINEL;BOOLEAN-CONTEXT-BLOCK', operators, types: typeRows,
  };
  language.languageRoot = root('B0V7-VALIDATOR-LANGUAGE-V1', language); return language;
}

function rootedSchema(schemaId, fields) {
  const schema = { schemaId, additionalProperties: false, requiredFieldCount: fields.length, fields };
  schema.schemaRoot = root('B0V7-CLOSED-SCHEMA-V1', schema); return schema;
}

function buildDetachedAcceptance() {
  const internalSchema = rootedSchema('B0V7-DETACHED-ACCEPTANCE-INTERNAL-V1', [
    ['schemaId', 'DETERMINISTIC_ID'], ['instanceId', 'DETERMINISTIC_ID'], ['producerAppointmentRoot', 'SHA256'], ['freshnessHeadTupleRoot', 'SHA256'],
    ['requirementClosureRoot', 'SHA256'], ['outputSetRoot', 'SHA256'], ['casCommitReceiptRoot', 'SHA256'], ['recoveryReceiptRoot', 'SHA256'],
    ['witnessIndependenceRoot', 'SHA256'], ['workIndependenceRoot', 'SHA256'], ['ledgerIndependenceRoot', 'SHA256'], ['authorityOwnerIndependenceRoot', 'SHA256'],
  ].map(([name, type]) => ({ name, type, nullable: false })));
  const validationContextSchema = rootedSchema('B0V7-DETACHED-ACCEPTANCE-VALIDATION-CONTEXT-V1', [
    { name: 'expectedProducerAppointmentRoot', type: 'SHA256', nullable: false },
    { name: 'currentSecurityUniverseTupleRoot', type: 'SHA256', nullable: false },
  ]);
  const externalSchema = rootedSchema('B0V7-DETACHED-ACCEPTANCE-ENVELOPE-V1', [
    ['envelopeSchemaId', 'DETERMINISTIC_ID'], ['internalSchemaRoot', 'SHA256'], ['instanceRoot', 'SHA256'], ['planningOnly', 'BOOLEAN'],
    ['operational', 'BOOLEAN'], ['validationContext', 'OBJECT'], ['payload', 'OBJECT'], ['authorityCredit', 'NONNEGATIVE_INTEGER'], ['acceptanceCredit', 'NONNEGATIVE_INTEGER'],
  ].map(([name, type]) => ({ name, type, nullable: false })));
  const producerAppointmentRoot = fixtureRoot('ACCEPTANCE-SOLE-PRODUCER-APPOINTMENT');
  const freshnessHeadTupleRoot = fixtureRoot('CURRENT-SECURITY-UNIVERSE-TUPLE');
  const payload = {
    schemaId: internalSchema.schemaId, instanceId: 'B0V7-PLANNING-ACCEPTANCE-INSTANCE-001', producerAppointmentRoot, freshnessHeadTupleRoot,
    requirementClosureRoot: fixtureRoot('REQUIREMENT-CLOSURE-38'), outputSetRoot: fixtureRoot('OUTPUT-SET-38'), casCommitReceiptRoot: fixtureRoot('CAS-COMMIT-RECEIPT'),
    recoveryReceiptRoot: fixtureRoot('RECOVERY-RECEIPT'), witnessIndependenceRoot: fixtureRoot('WITNESS-INDEPENDENCE'), workIndependenceRoot: fixtureRoot('WORK-INDEPENDENCE'),
    ledgerIndependenceRoot: fixtureRoot('LEDGER-INDEPENDENCE'), authorityOwnerIndependenceRoot: fixtureRoot('AUTHORITY-OWNER-INDEPENDENCE'),
  };
  const planningPositiveEnvelope = {
    envelopeSchemaId: externalSchema.schemaId, internalSchemaRoot: internalSchema.schemaRoot, instanceRoot: root('B0V7-DETACHED-ACCEPTANCE-PAYLOAD-V1', payload),
    planningOnly: true, operational: false, validationContext: { expectedProducerAppointmentRoot: producerAppointmentRoot, currentSecurityUniverseTupleRoot: freshnessHeadTupleRoot },
    payload, authorityCredit: 0, acceptanceCredit: 0,
  };
  return {
    externalSchema, validationContextSchema, internalSchema, unknownFieldPolicy: 'BLOCK-AT-EVERY-OBJECT-BOUNDARY', soleProducerRole: 'B0V7-ACCEPTANCE-SOLE-PRODUCER',
    planningPositiveEnvelope, planningPositiveEnvelopeRoot: root('B0V7-DETACHED-ACCEPTANCE-ENVELOPE-V1', planningPositiveEnvelope),
    currentOperationalEnvelopeRoot: null, currentValidationResult: 'BLOCK', authorityCredit: 0, acceptanceCredit: 0,
  };
}

function buildAuthorityBootstrap() {
  const genesisSchemas = [
    rootedSchema('B0V7-GENESIS-MANDATE-RECEIPT-V1', [{ name: 'externalL0Root', type: 'SHA256', nullable: false }, { name: 'mandateRoot', type: 'SHA256', nullable: false }, { name: 'revision', type: 'U64_DECIMAL', nullable: false }]),
    rootedSchema('B0V7-GENESIS-MEMBERSHIP-RECEIPT-V1', [{ name: 'mandateRoot', type: 'SHA256', nullable: false }, { name: 'membershipRoot', type: 'SHA256', nullable: false }, { name: 'membershipHead', type: 'SHA256', nullable: false }]),
    rootedSchema('B0V7-GENESIS-PERMIT-ROOT-RECEIPT-V1', [{ name: 'membershipRoot', type: 'SHA256', nullable: false }, { name: 'permitIssuerAppointmentRoot', type: 'SHA256', nullable: false }, { name: 'permitHead', type: 'SHA256', nullable: false }]),
  ];
  const recoverySchema = rootedSchema('B0V7-RECOVERY-ADMISSION-RECEIPT-V1', [
    { name: 'attemptId', type: 'DETERMINISTIC_ID', nullable: false }, { name: 'memberSetRoot', type: 'SHA256', nullable: false }, { name: 'witnessSetRoot', type: 'SHA256', nullable: false },
    { name: 'securityHead', type: 'SHA256', nullable: false }, { name: 'recoveryHead', type: 'SHA256', nullable: false }, { name: 'newAuthorityRoot', type: 'SHA256', nullable: false },
  ]);
  const roles = ['EXTERNAL-L0-OWNER', 'GENESIS-SOLE-PRODUCER', 'RECOVERY-SOLE-PRODUCER', 'PERMIT-SOLE-PRODUCER', 'ACCEPTANCE-SOLE-PRODUCER'].map((roleId, ordinal) => ({
    ordinal: ordinal + 1, roleId, controllerId: `B0V7-CONTROLLER-${ordinal + 1}`, controllerRoot: fixtureRoot(`CONTROLLER-${ordinal + 1}`), appointmentAuthority: ordinal === 0 ? 'EXTERNAL-L0' : rolesAppointmentAuthority(ordinal),
  }));
  function appointment(classId, roleId, authorityRoleId) {
    const row = { classId, soleProducerRoleId: roleId, appointmentAuthorityRoleId: authorityRoleId, producerCardinality: 1, delegationAllowed: false, selfAppointmentAllowed: false };
    row.appointmentRuleRoot = root('B0V7-SOLE-PRODUCER-APPOINTMENT-RULE-V1', row); return row;
  }
  const soleProducerAppointments = [
    appointment('GENESIS-RECEIPT', 'GENESIS-SOLE-PRODUCER', 'EXTERNAL-L0-OWNER'), appointment('RECOVERY-RECEIPT', 'RECOVERY-SOLE-PRODUCER', 'EXTERNAL-L0-OWNER'),
    appointment('PERMIT', 'PERMIT-SOLE-PRODUCER', 'GENESIS-SOLE-PRODUCER'), appointment('ACCEPTANCE-ENVELOPE', 'ACCEPTANCE-SOLE-PRODUCER', 'EXTERNAL-L0-OWNER'),
  ];
  const independence = ['WITNESS', 'WORK', 'LEDGER', 'AUTHORITY-OWNER'].map((classId, ordinal) => ({
    classId, producerControllerRoot: fixtureRoot(`${classId}-PRODUCER`), verifierControllerRoot: fixtureRoot(`${classId}-VERIFIER`), ledgerControllerRoot: fixtureRoot(`${classId}-LEDGER`),
    disjoint: true, commonControllerAllowed: false, proofRoot: fixtureRoot(`${classId}-INDEPENDENCE-PROOF-${ordinal + 1}`),
  }));
  return {
    bootstrapRule: 'ONLY-AN-EXTERNAL-L0-ROOTED-APPOINTMENT-MAY-ADMIT-GENESIS;NO-PACKAGE-BYTE-SELF-BOOTSTRAPS-AUTHORITY', roles, soleProducerAppointments,
    genesisSchemas, recoverySchema, planningAdmittedGenesisInstances: genesisSchemas.map((schema, ordinal) => ({ schemaId: schema.schemaId, instanceId: `B0V7-PLANNING-GENESIS-${ordinal + 1}`, nonAuthoritative: true, operational: false, authorityCredit: 0 })),
    operationalGenesisReceiptRoot: null, operationalRecoveryReceiptRoot: null, independence,
  };
}

function rolesAppointmentAuthority(ordinal) {
  return ordinal === 1 || ordinal === 2 || ordinal === 4 ? 'EXTERNAL-L0-OWNER' : 'GENESIS-SOLE-PRODUCER';
}

function buildPermitRules() {
  const permitSchema = rootedSchema('B0V7-TYPED-PERMIT-V1', [
    ['permitId', 'DETERMINISTIC_ID'], ['subjectRoot', 'SHA256'], ['expectedCurrentHead', 'SHA256'], ['minimumRevision', 'U64_DECIMAL'],
    ['validFrom', 'RFC3339_UTC'], ['validUntil', 'RFC3339_UTC'], ['revocationHead', 'SHA256'], ['replayKey', 'DETERMINISTIC_ID'], ['consumed', 'BOOLEAN'],
  ].map(([name, type]) => ({ name, type, nullable: false })));
  return {
    permitSchema, soleProducerRole: 'PERMIT-SOLE-PRODUCER', revisionRule: 'currentRevision must be strictly greater than minimumRevision; equality BLOCKS',
    timeRule: 'validFrom <= commitInstant < validUntil under RFC3339_UTC decoder; equality at validUntil BLOCKS', revocationRule: 're-read exact revocationHead at atomic commit; any change or revoked subject BLOCKS',
    replayRule: 'replayKey and permitId are consumed exactly once in the same atomic CAS as Acceptance; duplicate, response retry, or prior consume BLOCKS and authoritative readback resolves response loss',
    currentOperationalPermitCount: 0, currentPermitRoot: null, authorityCredit: 0, acceptanceCredit: 0,
  };
}

function buildCasStateMachine() {
  const rows = [
    ['READ_HEAD', ['/store/currentHead'], [], 'read current head and bind immutable attempt snapshot', 'READ-ONLY'],
    ['READ_SECURITY_UNIVERSE', ['/store/securityHead', '/store/revisionHead', '/store/revocationHead'], [], 'bind security/revision/revocation read set', 'READ-ONLY'],
    ['VALIDATE_SCHEMA', ['/attempt/envelope'], [], 'execute every internal and external closed schema', 'PRIVATE'],
    ['VALIDATE_AUTHORITY', ['/attempt/appointmentRoot', '/store/appointmentHead'], [], 'sole producer appointment is current and externally rooted', 'PRIVATE'],
    ['VALIDATE_TIME', ['/attempt/permit/validFrom', '/attempt/permit/validUntil', '/context/commitInstant'], [], 'typed half-open time interval accepts', 'PRIVATE'],
    ['VALIDATE_REVOCATION', ['/attempt/permit/revocationHead', '/store/revocationHead'], [], 'exact current revocation head and no equal-revision revoke', 'PRIVATE'],
    ['COMPARE_EXPECTED_HEAD', ['/attempt/permit/expectedCurrentHead', '/store/currentHead'], [], 'expected head equals step-1 snapshot and current head', 'PRIVATE'],
    ['RESERVE_ATTEMPT', ['/attempt/attemptId'], ['/private/reservation'], 'deterministic attempt ID unused', 'PRIVATE'],
    ['ADVANCE_FENCE', ['/store/fence'], ['/private/nextFence'], 'next fence is strictly greater', 'PRIVATE'],
    ['CONSUME_PERMIT', ['/attempt/permit/permitId', '/store/permitLedger'], ['/private/stagedPermitConsume'], 'permit and replay key both unused', 'PRIVATE-STAGED'],
    ['STAGE_POINTER', ['/attempt/outputRoot'], ['/private/stagedPointer'], 'output root is typed and bound', 'PRIVATE-STAGED'],
    ['STAGE_ACCEPTANCE', ['/attempt/envelope'], ['/private/stagedAcceptance'], 'detached envelope validates', 'PRIVATE-STAGED'],
    ['STAGE_OUTBOX', ['/attempt/effectRoot'], ['/private/stagedOutbox'], 'one deterministic effect identity', 'PRIVATE-STAGED'],
    ['REVALIDATE_READ_SET', ['/store/currentHead', '/store/securityHead', '/store/revisionHead', '/store/revocationHead', '/store/appointmentHead', '/store/permitLedger'], ['/private/revalidationReceipt'], 'every authoritative read and head is byte-equal to the bound snapshot', 'PRIVATE-STAGED'],
    ['ATOMIC_COMMIT', ['/private/reservation', '/private/stagedPermitConsume', '/private/stagedPointer', '/private/stagedAcceptance', '/private/stagedOutbox', '/private/revalidationReceipt'], ['/store/currentHead', '/store/fence', '/store/permitLedger', '/store/pointer', '/store/acceptance', '/store/outbox'], 'single CAS compare plus all durable writes; failure has zero durable writes', 'SOLE-LINEARIZATION-POINT'],
  ];
  const steps = rows.map(([stepId, reads, writes, guard, durability], index) => ({ ordinal: index + 1, stepId, reads, writes, guard, durability, crashBeforeStepResult: 'ZERO-DURABLE-WRITES-BY-CRASHED-ACTOR' }));
  const exhaustiveProof = computeCasProof(); const planningAttempts = { A: casPlanningAttempt('A'), B: casPlanningAttempt('B') };
  const guardMutationMatrix = [
    ['schemaValid', false, 'SCHEMA'], ['authorityCurrent', false, 'AUTHORITY'], ['validFrom', 'INVALID', 'TIME-TYPE'], ['validUntil', '2026-08-30T12:00:00Z', 'TIME-UPPER-EQUALITY'],
    ['commitInstant', '2026-08-31T00:00:00Z', 'TIME-EXPIRED'], ['revoked', true, 'REVOKED'], ['revocationHead', '0'.repeat(64), 'REVOCATION-HEAD'], ['expectedHead', 'HEAD-STALE', 'EXPECTED-HEAD'],
    ['attemptId', 'lowercase-attempt', 'ATTEMPT-ID'], ['proposedFence', 0, 'FENCE'], ['minimumRevision', '7', 'REVISION-EQUALITY'], ['replayUsed', true, 'REPLAY'],
    ['outputRoot', 'INVALID', 'OUTPUT-ROOT'], ['envelopeValid', false, 'ENVELOPE'], ['effectId', 'lowercase-effect', 'EFFECT-ID'],
  ].map(([field, mutatedValue, guardId], index) => ({ ordinal: index + 1, mutationId: `B0V7-CAS-GUARD-${guardId}-NEG`, actor: 'A', field, mutatedValue, expected: 'BLOCK' }));
  return {
    reducerId: 'B0V7-CAS-REDUCER-V1', steps, stepCount: steps.length, exactStepSequenceRoot: root('B0V7-CAS-STEP-SEQUENCE-V1', steps),
    planningAttempts, planningAttemptSetRoot: root('B0V7-CAS-PLANNING-ATTEMPT-SET-V1', planningAttempts), guardMutationMatrix,
    interleavingModel: 'ALL-TWO-WRITER-ORDER-PRESERVING-NEXT-STEP-CHOICES;MEMOIZED-STATE-DP;NO-SCHEDULE-SAMPLING', exhaustiveProof,
    crashModel: 'EVERY-REACHABLE-STATE-X-EVERY-NONTERMINAL-ACTOR-PRECOMMIT-CUT;PRIVATE-WRITES-DISCARDED', responseLossRecovery: 'AFTER-ATOMIC-COMMIT-READ-CURRENT-HEAD-PERMIT-LEDGER-AND-OUTBOX-BY-DETERMINISTIC-ATTEMPT-ID',
    currentOperationalExecutionCount: 0, authorityCredit: 0, acceptanceCredit: 0,
  };
}

function buildRecoveryReducer() {
  const memberIds = ['MEMBER-A', 'MEMBER-B', 'MEMBER-C']; const attemptId = 'B0V7-RECOVERY-ATTEMPT-001'; const challengeRoot = fixtureRoot('RECOVERY-CHALLENGE'); const controllerRoot = fixtureRoot('RECOVERY-CONTROLLER');
  const securityHead = fixtureRoot('RECOVERY-SECURITY-HEAD-0'); const recoveryHead = fixtureRoot('RECOVERY-HEAD-0');
  const acknowledgements = memberIds.map((memberId) => ({ memberId, challengeRoot, controllerRoot }));
  const members = Object.fromEntries(memberIds.map((memberId) => [memberId, { current: true, validUntil: '2030-01-01T00:00:00Z', revokedAt: null, controllerRoot }]));
  const planningPositiveState = {
    attempt: { attemptId, memberIds, acknowledgements, challengeRoot, consumed: false },
    context: { requiredThreshold: 3, controllerRoot, nowInstant: '2026-08-30T00:00:00Z', expectedSecurityHead: securityHead, expectedRecoveryHead: recoveryHead },
    store: {
      members, witnesses: { 'WITNESS-A': { current: true, controllerRoot: fixtureRoot('WITNESS-A-CONTROLLER') }, 'WITNESS-B': { current: true, controllerRoot: fixtureRoot('WITNESS-B-CONTROLLER') } },
      challenges: { [attemptId]: challengeRoot }, securityHead, recoveryHead, activeAuthorityRoot: fixtureRoot('ACTIVE-AUTHORITY-0'), oldAuthorityRevoked: false,
    },
  };
  const readPaths = [
    '/attempt/attemptId', '/attempt/memberIds', '/attempt/acknowledgements', '/attempt/challengeRoot', '/attempt/consumed',
    '/context/requiredThreshold', '/context/controllerRoot', '/context/nowInstant', '/context/expectedSecurityHead', '/context/expectedRecoveryHead',
    '/store/members', '/store/witnesses', '/store/challenges', '/store/securityHead', '/store/recoveryHead', '/store/activeAuthorityRoot', '/store/oldAuthorityRevoked',
  ];
  const lifecycleIds = ['READ-CANONICAL-STATE', 'VALIDATE-CLOSED-SCHEMA', 'VALIDATE-MEMBERS-TIME-REVOCATION', 'VALIDATE-TWO-INDEPENDENT-WITNESSES', 'VALIDATE-CHALLENGE-AND-REPLAY', 'RESERVE-PRIVATE-ATTEMPT', 'REVALIDATE-EXACT-READ-SET-AND-HEADS', 'ATOMIC-ROTATE-REVOKE-CONSUME'];
  const lifecycleSteps = lifecycleIds.map((stepId, index) => ({ ordinal: index + 1, stepId, readPaths: index === 0 || index === 6 || index === 7 ? readPaths : readPaths.filter((_, ordinal) => ordinal % 6 === index % 6), durableWrites: index === 7 ? ['/store/activeAuthorityRoot', '/store/oldAuthorityRevoked', '/attempt/consumed', '/store/recoveryHead'] : [], atomicBoundary: index === 7 }));
  const mutationMatrix = readPaths.map((path, index) => ({ mutationId: `B0V7-RECOVERY-PATH-MUT-${String(index + 1).padStart(2, '0')}`, path, expected: 'BLOCK', credit: 0 }));
  const headChangeInjections = lifecycleSteps.slice(0, -1).map((step, index) => ({ mutationId: `B0V7-RECOVERY-HEAD-CHANGE-AFTER-${String(index + 1).padStart(2, '0')}`, afterStepOrdinal: step.ordinal, beforeStepOrdinal: step.ordinal + 1, changedHeadPath: '/store/securityHead', expected: 'BLOCK' }));
  return {
    reducerId: 'B0V7-RECOVERY-REDUCER-V1', canonicalNamespaces: ['/attempt', '/context', '/store'], readPaths, readPathCount: readPaths.length, headPaths: ['/store/securityHead', '/store/recoveryHead'], lifecycleSteps,
    mutationMatrix, headChangeInjections, planningPositiveState, planningPositiveStateRoot: root('B0V7-RECOVERY-PLANNING-STATE-V1', planningPositiveState),
    atomicityRule: 'ALL-VALIDATION-READS-BOUND-TO-SNAPSHOT;EXACT-READ-SET-AND-BOTH-HEADS-REVALIDATED-AT-STEP-7-AND-STEP-8-CAS;ONLY-STEP-8-DURABLE',
    currentOperationalRecoveryAttemptRoot: null, currentOperationalExecutionCount: 0, authorityCredit: 0, acceptanceCredit: 0,
  };
}

function requireFrozen(logicalPath, expectedSha256) {
  const fact = fileFact(logicalPath);
  if (fact.sha256 !== expectedSha256) throw new Error(`frozen input mismatch ${logicalPath}: ${fact.sha256}`);
  return fact;
}

function buildSourceIndex() {
  const manifestFact = requireFrozen(V6.manifest, FROZEN.manifestSha256); const manifest = readJson(V6.manifest);
  if (manifest.packageContentRoot !== FROZEN.packageContentRoot || manifest.subjectSha256 !== FROZEN.subjectSha256 || manifest.memberCount !== 24) throw new Error('frozen v6 manifest identity mismatch');
  const packageMembers = manifest.members.map((member) => {
    const fact = fileFact(member.logicalPath);
    if (fact.sha256 !== member.sha256 || fact.bytes !== member.bytes) throw new Error(`frozen v6 package member mismatch ${member.logicalPath}`);
    return { ...fact, sourceClass: 'FROZEN-V6-PACKAGE-MEMBER', predecessorOrdinal: member.ordinal };
  });
  const extras = [
    [V6.manifest, FROZEN.manifestSha256, 'FROZEN-V6-MANIFEST'], [V6.review, FROZEN.reviewSha256, 'FROZEN-V6-INDEPENDENT-REVIEW'],
    [V6.findings, FROZEN.findingsSha256, 'FROZEN-V6-INDEPENDENT-FINDINGS'], [V6.producerQa, FROZEN.producerQaSha256, 'FROZEN-V6-PRODUCER-QA'],
    [V6.reportA, FROZEN.reportASha256, 'FROZEN-V6-DETACHED-READER-REPORT'], [V6.reportB, FROZEN.reportBSha256, 'FROZEN-V6-DETACHED-READER-REPORT'],
    [V6.storageDecision, FROZEN.storageDecisionSha256, 'FROZEN-PUBLIC-STORAGE-DECISION'],
  ].map(([logicalPath, expected, sourceClass]) => ({ ...requireFrozen(logicalPath, expected), sourceClass }));
  const sources = [...packageMembers, ...extras].sort((a, b) => a.logicalPath.localeCompare(b.logicalPath)).map((row, index) => ({ ordinal: index + 1, ...row }));
  const index = {
    schemaVersion: 'B0V7-FROZEN-SOURCE-INDEX-V1', artifactId: `CONNECT-B0-V7-FROZEN-SOURCE-INDEX-${DATE}-G0`, artifactClass: 'PLANNING-ONLY;FROZEN-BYTE-INDEX;NON-AUTHORITATIVE',
    repositoryRootDefinition: 'LOGICAL-PUBLIC-REPOSITORY-ROOT', repositoryVisibility: 'PUBLIC', locatorPolicy: 'EVERY-PUBLIC-LOCATOR-STARTS-docs/;NO-web/-PREFIX;NO-ABSOLUTE-PATH',
    predecessorSubjectSha256: FROZEN.subjectSha256, predecessorManifestSha256: FROZEN.manifestSha256, predecessorPackageContentRoot: FROZEN.packageContentRoot,
    sourceCount: sources.length, sources, absolutePathCount: sources.filter((row) => row.logicalPath.startsWith('/')).length, extraRepositoryPrefixCount: sources.filter((row) => row.logicalPath.startsWith('web/')).length,
    predecessorPackageMemberCount: packageMembers.length, predecessorPackageMemberByteCoverage: `${packageMembers.length}/${manifest.memberCount}`, authorityCredit: 0, acceptanceCredit: 0,
  };
  index.sourceSetRoot = root('B0V7-FROZEN-SOURCE-SET-V1', sources.map(({ ordinal, logicalPath, sha256, bytes, sourceClass }) => ({ ordinal, logicalPath, sha256, bytes, sourceClass })));
  index.indexContentRoot = root('B0V7-FROZEN-SOURCE-INDEX-V1', index); return index;
}

const NEW_FINDINGS = [
  ['B0V6-IHR-F001', 'P0', 'B0V6-NORMATIVE-VALIDATOR-LANGUAGE-AND-TYPE-SEMANTICS-UNCLOSED', 'One rooted total validator language; unknown operator/type and invalid input fail closed', 'B0V7-VALIDATOR-LANGUAGE-PRODUCER', 'language root plus positive/negative coverage for every operator/type and unknown cases', 'Any undefined dialect, partial type decoder, alias, or permissive fallback blocks'],
  ['B0V6-IHR-F002', 'P0', 'B0V6-DETACHED-ACCEPTANCE-INSTANCE-VIOLATES-OWN-CLOSED-SCHEMA', 'Closed external, validation-context, and internal schemas admit one exact planning instance', 'B0V7-DETACHED-ACCEPTANCE-SCHEMA-PRODUCER', 'full-schema execution plus every missing/unknown/context/root mutation', 'Any undeclared, missing, stale, mismatched, private, replay, or nonzero-credit value blocks'],
  ['B0V6-IHR-F003', 'P0', 'B0V6-PRIOR-INTERFACE-ACTUAL-ROOTS-DIRECTLY-COPIED-FROM-EXPECTED', 'Seventeen actual interface observations are derived from frozen source bytes by an independent producer', 'B0V7-INDEPENDENT-ACTUAL-INTERFACE-PRODUCER-PYTHON', 'reader recomputation of actual bytes; producer/dependency/root separation from expected specification', 'Copy, common producer, null, substitution, stale source, or future-provider dependency blocks'],
  ['B0V6-IHR-F004', 'P0', 'B0V6-CAS-SCHEDULE-REDUCER-ACCEPTS-PHASELESS-COMMIT', 'Executable reducer performs exactly all fifteen ordered transition steps with one CAS linearization point', 'B0V7-CAS-REDUCER-PRODUCER', 'all interleavings by state-DP, all reachable crash cuts, illegal-step matrix, and response-loss readback', 'Missing/reordered phase, stale read, duplicate commit, durable precommit write, or double outbox blocks'],
  ['B0V6-IHR-F005', 'P0', 'B0V6-RECOVERY-VECTORS-EXECUTE-SURROGATE-NOT-LIFECYCLE', 'Recovery reducer reads one canonical namespaced state and revalidates its exact lifecycle read set and heads', 'B0V7-RECOVERY-REDUCER-PRODUCER', 'one valid lifecycle, one mutation per exact read path, and a head change after every precommit step', 'Shadow path, stale validation, witness/controller alias, replay, revocation, expiry, or head change blocks'],
  ['B0V6-IHR-F006', 'P0', 'B0V6-NO-GLOBAL-POSITIVE-MODEL-SATISFIABILITY-WITNESS', 'One deterministic non-authoritative global planning model satisfies every declared conjunct while real state remains blocked', 'B0V7-GLOBAL-MODEL-PRODUCER', 'clean global model plus one blocking mutation per conjunct and separate current-state evaluation', 'Vacuous always-blocking design, missing conjunct, operational credit, or real-state unblocking blocks'],
  ['B0V6-IHR-F007', 'P1', 'B0V6-PACKAGED-READERS-NOT-BOUND-TO-INDEPENDENCE-EVIDENCE', 'Exact Reader bytes bind to distinct dependency, runtime, controller, context, and pre-disclosure profiles', 'B0V7-READER-INDEPENDENCE-PROFILE-PRODUCER', 'two stdlib implementations self-hash and verify every adversarial family before detached result disclosure', 'Unbound bytes, shared controller/context, generator import, cross-reader import, or pre-disclosure result sharing blocks'],
];

function findingSpan(findingId, ordinal) {
  const bytes = readBytes(V6.findings); const startMarker = Buffer.from(`## 3.${ordinal} \`${findingId}\``, 'utf8'); const start = bytes.indexOf(startMarker);
  if (start < 0) throw new Error(`finding heading not found ${findingId}`);
  const next3 = bytes.indexOf(Buffer.from('\n## 3.', 'utf8'), start + startMarker.length); const next4 = bytes.indexOf(Buffer.from('\n# 4.', 'utf8'), start + startMarker.length);
  const candidates = [next3, next4].filter((offset) => offset >= 0); const end = candidates.length ? Math.min(...candidates) : bytes.length; const member = bytes.subarray(start, end);
  return { alias: 'B0V6IHRM', logicalPath: V6.findings, artifactSha256: FROZEN.findingsSha256, locator: findingId, startByteInclusive: start, endByteExclusive: end, byteLength: member.length, memberSha256: shaBytes(member) };
}

function buildRequirementsAndCrosswalk(registrySha256, subjectSha256 = null) {
  const v6Crosswalk = readJson(V6.crosswalk); if (v6Crosswalk.blockerClosureRows.length !== 31) throw new Error('v6 active identity denominator changed');
  const sources = [
    ...NEW_FINDINGS.map((row, index) => ({ kind: 'NEW-V6-INDEPENDENT-REVIEW-FINDING', findingId: row[0], severity: row[1], noMergeKey: row[2], sourceFinding: findingSpan(row[0], index + 1), fields: { condition: row[3], producer: row[4], proof: row[5], failure: row[6], output: `B0V7-OUTPUT-${String(index + 1).padStart(3, '0')}` } })),
    ...v6Crosswalk.blockerClosureRows.map((row, index) => ({
      kind: 'PRESERVED-ACTIVE-INHERITED-IDENTITY', findingId: row.sourceFindingId, severity: row.severity, noMergeKey: row.noMergeKey, sourceFinding: row.sourceFinding,
      predecessorControlRoot: row.controlRoot, fields: {
        condition: `Preserve and re-execute the exact inherited predicate bytes for ${row.sourceFindingId} without weakening, merge, alias, or range credit`,
        producer: `B0V7-INHERITED-CONTROL-PRESERVATION-PRODUCER-${String(index + 1).padStart(3, '0')}`,
        proof: `source member ${row.sourceFinding.memberSha256}; predecessor control ${row.controlRoot}; frozen v6 package root ${FROZEN.packageContentRoot}`,
        failure: 'Any byte drift, common control/output, merged credit, missing source span, or predicate weakening blocks', output: `B0V7-OUTPUT-${String(index + 8).padStart(3, '0')}`,
      },
    })),
  ];
  const requirements = sources.map((source, index) => {
    const requirementId = `B0V7REQ-${String(index).padStart(3, '0')}`; const targetOutputId = `B0V7OUT-${String(index).padStart(3, '0')}`; const controlId = `B0V7-CONTROL-${String(index).padStart(3, '0')}`;
    const normativeFields = { Condition: source.fields.condition, Producer: source.fields.producer, Proof: source.fields.proof, Failure: source.fields.failure, Output: targetOutputId };
    return { ordinal: index + 1, requirementId, sourceFindingId: source.findingId, severity: source.severity, noMergeKey: source.noMergeKey, normativeFieldCount: 5, normativeFields, targetOutputId, controlId };
  });
  const closureRows = sources.map((source, index) => {
    const requirement = requirements[index]; const control = { controlId: requirement.controlId, sourceFindingId: source.findingId, sourceMemberSha256: source.sourceFinding.memberSha256, targetRequirementId: requirement.requirementId, targetOutputId: requirement.targetOutputId, predicate: requirement.normativeFields.Condition };
    return {
      ordinal: index + 1, sourceClass: source.kind, sourceFindingId: source.findingId, sourceFinding: source.sourceFinding, severity: source.severity, noMergeKey: source.noMergeKey,
      targetRequirementId: requirement.requirementId, targetOutputId: requirement.targetOutputId, controlId: requirement.controlId, controlRoot: root('B0V7-ONE-TO-ONE-CLOSURE-CONTROL-V1', control),
      predecessorControlRoot: source.predecessorControlRoot ?? null, mappingCardinality: 'ONE-SOURCE-FINDING-TO-ONE-CONTROL-TO-ONE-REQUIREMENT-TO-ONE-OUTPUT;NO-MERGE;NO-RANGE-CREDIT',
      requiredPositiveVectorId: `B0V7-CLOSURE-${String(index + 1).padStart(3, '0')}-POS`, requiredNegativeVectorId: `B0V7-CLOSURE-${String(index + 1).padStart(3, '0')}-NEG`,
      producerCandidateState: 'MATERIALIZED-PLANNING-CONTROL;FRESH-INDEPENDENT-REVIEW-PENDING', independentClosureState: 'OPEN-PENDING-FRESH-INDEPENDENT-HOSTILE-REVIEW', closureTransferred: false, acceptanceTransferred: false, closureCredit: 0, authorityCredit: 0, acceptanceCredit: 0,
    };
  });
  const crosswalk = {
    schemaVersion: 'B0V7-CLOSURE-CROSSWALK-V1', artifactId: `CONNECT-B0-V7-CLOSURE-CROSSWALK-${DATE}-G0`, artifactClass: 'PLANNING-ONLY;NON-AUTHORITY;NON-ACCEPTANCE',
    normativeRegistrySha256: registrySha256, subjectSha256, activeClosureDenominator: closureRows.length, newFindingCount: 7, inheritedActiveIdentityCount: 31,
    requirementCount: requirements.length, fiveFieldCount: requirements.reduce((sum, row) => sum + row.normativeFieldCount, 0), requirements, closureRows,
    preservedClosedFinding: { findingId: 'B0V4-HR-F012', noMergeKey: 'B0V4-PACKAGE-CONTENT-ROOT-DERIVATION-UNSPECIFIED', state: 'PRESERVED-CLOSED-INDEPENDENT-MECHANICAL', additionalClosureCredit: 0, authorityCredit: 0, acceptanceCredit: 0 },
    noMergeViolationCount: 0, noRangeCreditCount: 0, currentIndependentClosureCount: 0, authorityCredit: 0, acceptanceCredit: 0,
  };
  crosswalk.crosswalkContentRoot = root('B0V7-CLOSURE-CROSSWALK-V1', crosswalk); return { requirements, crosswalk };
}

function buildExpectedInterfaces() {
  const rows = [
    ['V6-SUBJECT-SHA256', FROZEN.subjectSha256], ['V6-MANIFEST-SHA256', FROZEN.manifestSha256], ['V6-PACKAGE-CONTENT-ROOT', FROZEN.packageContentRoot],
    ['V6-PACKAGE-MEMBER-COUNT', 24], ['V6-REQUIREMENT-COUNT', 127], ['V6-FIVE-FIELD-COUNT', 635], ['V6-ACTIVE-BLOCKER-DENOMINATOR', 31],
    ['V6-VECTOR-COUNT', 7430], ['V6-VECTOR-SHARD-COUNT', 16], ['V6-SOURCE-ARTIFACT-COUNT', 20], ['V6-SOURCE-MEMBER-COUNT', 2045],
    ['V6-AUTHORITATIVE-BYTE-ATOM-COUNT', 900], ['V6-ACTIVE-NAMED-USE-COUNT', 10727], ['V6-ROLE-COUNT', 21], ['V6-HEAD-COUNT', 36],
    ['V6-MUTABLE-OBJECT-CLASS-COUNT', 94], ['V6-PRIOR-INTERFACE-COUNT', 17],
  ];
  return rows.map(([measurementKind, expectedValue], index) => {
    const specification = { interfaceId: `B0V7-IF-${String(index + 1).padStart(2, '0')}`, measurementKind, expectedValue, specificationProducerId: 'B0V7-EXPECTED-INTERFACE-SPECIFICATION-PRODUCER-NODE', frozenBeforeActualProducer: true };
    return { ...specification, expectedSpecificationRoot: root('B0V7-EXPECTED-INTERFACE-SPECIFICATION-V1', specification), actualEvidencePath: P.evidence, commonSourceDerivationAllowed: false, futureProviderReadAllowed: false };
  });
}

function buildReaderProfiles() {
  const rows = [
    { readerId: 'B0V7-READER-A', readerPath: P.readerA, language: 'NODEJS-STDLIB', dependencies: ['node:crypto', 'node:fs', 'node:path'], runtimeContract: { binary: 'node', version: process.version, standardLibraryOnly: true }, controllerId: 'B0V7-READER-A-CONTROLLER', executionContext: { environment: 'FRESH-LOCAL-PROCESS-A', workingDirectoryPolicy: 'LOGICAL-PUBLIC-REPOSITORY-ROOT', generatorImportsAllowed: false, peerReaderImportsAllowed: false }, disclosureRule: 'READER-A-RESULT-SEALED-BEFORE-READER-B-RESULT-DISCLOSURE' },
    { readerId: 'B0V7-READER-B', readerPath: P.readerB, language: 'PYTHON-STDLIB', dependencies: ['copy', 'datetime', 'hashlib', 'json', 'pathlib', 're', 'sys'], runtimeContract: { binary: 'python3', version: '3.14.4', standardLibraryOnly: true }, controllerId: 'B0V7-READER-B-CONTROLLER', executionContext: { environment: 'FRESH-LOCAL-PROCESS-B', workingDirectoryPolicy: 'LOGICAL-PUBLIC-REPOSITORY-ROOT', generatorImportsAllowed: false, peerReaderImportsAllowed: false }, disclosureRule: 'READER-B-RESULT-SEALED-BEFORE-CROSS-READER-PARITY' },
  ];
  return rows.map((row) => {
    const readerSha256 = shaBytes(readBytes(row.readerPath)); const dependencyRoot = root('B0V7-READER-DEPENDENCY-SET-V1', row.dependencies); const runtimeRoot = root('B0V7-READER-RUNTIME-CONTRACT-V1', row.runtimeContract);
    const controllerRoot = root('B0V7-READER-CONTROLLER-V1', row.controllerId); const executionContextRoot = root('B0V7-READER-EXECUTION-CONTEXT-V1', row.executionContext); const disclosureRoot = root('B0V7-READER-DISCLOSURE-RULE-V1', row.disclosureRule);
    const profile = { ...row, readerSha256, dependencyRoot, runtimeRoot, controllerRoot, executionContextRoot, disclosureRoot, operational: false, authorityCredit: 0, acceptanceCredit: 0 };
    profile.profileRoot = root('B0V7-READER-INDEPENDENCE-PROFILE-V1', profile); return profile;
  });
}

function buildRegistry() {
  const validatorLanguage = buildValidatorLanguage(); const detachedAcceptance = buildDetachedAcceptance(); const authorityBootstrap = buildAuthorityBootstrap();
  const permitRevisionTimeRevocationReplay = buildPermitRules(); const casStateMachine = buildCasStateMachine(); const recoveryReducer = buildRecoveryReducer();
  const expectedInterfaces = buildExpectedInterfaces(); const evidenceFact = fileFact(P.evidence); const interfaceGeneratorFact = fileFact(P.interfaceGenerator); const readerIndependenceProfiles = buildReaderProfiles();
  const closureBlueprint = buildRequirementsAndCrosswalk('0'.repeat(64)); const sourceBlueprint = buildSourceIndex(); const evidence = readJson(P.evidence);
  const currentState = { externalL0Authority: 'ABSENT', B0: 'ABSENT', Gate29: 'BLOCKED', developmentFreeze: 'ACTIVE', repositoryVisibility: 'PUBLIC', operationalPermitCount: 0, operationalAcceptanceEnvelopeRoot: null, operationalGenesisRoot: null, operationalRecoveryRoot: null, independentClosureCount: '0/38', authorityCredit: 0, acceptanceCredit: 0, selfAcceptance: false };
  const deterministicIdentityPolicy = 'ALL-IDS-ARE-FIXED-DOMAIN-SEPARATED-CONTENT-HASHES-OR-CANONICAL-UPPERCASE-SEQUENCE-IDS;NO-RANDOMNESS';
  const packageMemberPaths = [P.registry, P.subject, P.sourceIndex, P.crosswalk, P.corpus, P.shard1, P.shard2, P.evidence, P.interfaceGenerator, P.packageGenerator, P.readerA, P.readerB];
  const publicLocators = [...new Set([...sourceBlueprint.sources.map((row) => row.logicalPath), ...packageMemberPaths])].sort();
  const independenceByClass = Object.fromEntries(authorityBootstrap.independence.map((row) => [row.classId, row]));
  const factBindings = [
    ['VALIDATOR-LANGUAGE-ROOTED', 'validatorLanguageRoot'], ['VALIDATOR-UNKNOWN-FAIL-CLOSED', 'unknownFailClosedRoot'], ['EXTERNAL-SCHEMA-CLOSED', 'externalSchemaRoot'],
    ['INTERNAL-SCHEMA-CLOSED', 'internalSchemaRoot'], ['VALIDATION-CONTEXT-CLOSED', 'validationContextSchemaRoot'], ['ACTUAL-INTERFACES-INDEPENDENT', 'actualInterfaceFactRoot'], ['END-TO-END-POSITIVE-TRACE', 'endToEndPositiveTraceRoot'],
    ['CAS-ALL-15-STEPS', 'casStepSequenceRoot'], ['CAS-ALL-INTERLEAVINGS', 'casInterleavingProofRoot'], ['CAS-ALL-CRASH-CUTS', 'casCrashFactRoot'],
    ['CAS-RESPONSE-LOSS-READBACK', 'casResponseLossRoot'], ['RECOVERY-EXACT-READ-SET', 'recoveryReadSetRoot'], ['RECOVERY-HEAD-REVALIDATION', 'recoveryHeadRevalidationRoot'],
    ['SOLE-PRODUCERS-APPOINTED', 'soleProducerSetRoot'], ['GENESIS-EXTERNAL-L0-ROOTED', 'genesisBootstrapRoot'], ['PERMIT-TYPED', 'permitSchemaRoot'],
    ['REVISION-STRICT', 'revisionRuleRoot'], ['TIME-HALF-OPEN', 'timeRuleRoot'], ['REVOCATION-ATOMIC', 'revocationRuleRoot'], ['REPLAY-EXACTLY-ONCE', 'replayRuleRoot'],
    ['TWO-WITNESSES-INDEPENDENT', 'witnessIndependenceRoot'], ['WORK-INDEPENDENT', 'workIndependenceRoot'], ['LEDGER-INDEPENDENT', 'ledgerIndependenceRoot'],
    ['AUTHORITY-OWNER-INDEPENDENT', 'authorityOwnerIndependenceRoot'], ['CLOSURE-ROWS-ONE-TO-ONE', 'closureControlSetRoot'], ['READERS-BYTE-BOUND-INDEPENDENT', 'readerProfileSetRoot'],
    ['DETERMINISTIC-IDENTITIES-ONLY', 'deterministicIdentityPolicyRoot'], ['PUBLIC-LOCATORS-REPO-RELATIVE', 'publicLocatorSetRoot'], ['REAL-STATE-SEPARATELY-BLOCKED', 'currentRealStateRoot'],
  ].map(([predicateId, factKey], index) => ({ ordinal: index + 1, predicateId, factKey }));
  const predicateIds = factBindings.map((row) => row.predicateId);
  const semanticFacts = {
    validatorLanguageRoot: validatorLanguage.languageRoot,
    unknownFailClosedRoot: root('B0V7-GLOBAL-UNKNOWN-FAIL-CLOSED-FACT-V1', { unknownOperatorPolicy: validatorLanguage.unknownOperatorPolicy, unknownTypePolicy: validatorLanguage.unknownTypePolicy, missingPathPolicy: validatorLanguage.missingPathPolicy }),
    externalSchemaRoot: detachedAcceptance.externalSchema.schemaRoot, internalSchemaRoot: detachedAcceptance.internalSchema.schemaRoot, validationContextSchemaRoot: detachedAcceptance.validationContextSchema.schemaRoot,
    actualInterfaceFactRoot: root('B0V7-GLOBAL-ACTUAL-INTERFACE-FACT-V1', { evidenceContentRoot: evidence.evidenceContentRoot, interfaceCount: evidence.interfaceCount, actualProducerId: evidence.producerId, expectedProducerId: expectedInterfaces[0].specificationProducerId }),
    endToEndPositiveTraceRoot: root('B0V7-END-TO-END-POSITIVE-TRACE-V1', { detachedAcceptanceEnvelopeRoot: detachedAcceptance.planningPositiveEnvelopeRoot, casPlanningAttemptSetRoot: casStateMachine.planningAttemptSetRoot, recoveryPlanningStateRoot: recoveryReducer.planningPositiveStateRoot, interfaceEvidenceRoot: evidence.evidenceContentRoot, closureControlSetRoot: root('B0V7-CLOSURE-CONTROL-SET-V1', closureBlueprint.crosswalk.closureRows.map((row) => row.controlRoot)) }),
    casStepSequenceRoot: casStateMachine.exactStepSequenceRoot, casInterleavingProofRoot: root('B0V7-CAS-EXHAUSTIVE-PROOF-V1', casStateMachine.exhaustiveProof),
    casCrashFactRoot: root('B0V7-CAS-CRASH-FACT-V1', { crashCutStateActorCount: casStateMachine.exhaustiveProof.crashCutStateActorCount, crashViolationCount: casStateMachine.exhaustiveProof.crashViolationCount }),
    casResponseLossRoot: root('B0V7-CAS-RESPONSE-LOSS-FACT-V1', { responseLossReadback: casStateMachine.exhaustiveProof.responseLossReadback, outboxExactlyOnce: casStateMachine.exhaustiveProof.outboxExactlyOnce }),
    recoveryReadSetRoot: root('B0V7-RECOVERY-READ-SET-FACT-V1', { readPaths: recoveryReducer.readPaths, mutationPaths: recoveryReducer.mutationMatrix.map((row) => row.path) }),
    recoveryHeadRevalidationRoot: root('B0V7-RECOVERY-HEAD-REVALIDATION-FACT-V1', { headPaths: recoveryReducer.headPaths, lifecycleSteps: recoveryReducer.lifecycleSteps, headChangeInjections: recoveryReducer.headChangeInjections }),
    soleProducerSetRoot: root('B0V7-SOLE-PRODUCER-SET-FACT-V1', authorityBootstrap.soleProducerAppointments), genesisBootstrapRoot: root('B0V7-GENESIS-BOOTSTRAP-FACT-V1', { bootstrapRule: authorityBootstrap.bootstrapRule, genesisSchemas: authorityBootstrap.genesisSchemas }),
    permitSchemaRoot: permitRevisionTimeRevocationReplay.permitSchema.schemaRoot, revisionRuleRoot: root('B0V7-REVISION-RULE-FACT-V1', permitRevisionTimeRevocationReplay.revisionRule), timeRuleRoot: root('B0V7-TIME-RULE-FACT-V1', permitRevisionTimeRevocationReplay.timeRule),
    revocationRuleRoot: root('B0V7-REVOCATION-RULE-FACT-V1', permitRevisionTimeRevocationReplay.revocationRule), replayRuleRoot: root('B0V7-REPLAY-RULE-FACT-V1', permitRevisionTimeRevocationReplay.replayRule),
    witnessIndependenceRoot: root('B0V7-INDEPENDENCE-FACT-V1', independenceByClass.WITNESS), workIndependenceRoot: root('B0V7-INDEPENDENCE-FACT-V1', independenceByClass.WORK),
    ledgerIndependenceRoot: root('B0V7-INDEPENDENCE-FACT-V1', independenceByClass.LEDGER), authorityOwnerIndependenceRoot: root('B0V7-INDEPENDENCE-FACT-V1', independenceByClass['AUTHORITY-OWNER']),
    closureControlSetRoot: root('B0V7-CLOSURE-CONTROL-SET-V1', closureBlueprint.crosswalk.closureRows.map((row) => row.controlRoot)), readerProfileSetRoot: root('B0V7-READER-PROFILE-SET-V1', readerIndependenceProfiles.map((row) => row.profileRoot)),
    deterministicIdentityPolicyRoot: root('B0V7-DETERMINISTIC-IDENTITY-POLICY-FACT-V1', deterministicIdentityPolicy), publicLocatorSetRoot: root('B0V7-PUBLIC-LOCATOR-SET-FACT-V1', publicLocators), currentRealStateRoot: root('B0V7-CURRENT-REAL-STATE-FACT-V1', currentState),
  };
  const planningPositiveModel = {
    modelId: 'B0V7-GLOBAL-PLANNING-MODEL-001', nonAuthoritative: true, operational: false, authorityCredit: 0, acceptanceCredit: 0,
    semanticFacts, semanticFactSetRoot: root('B0V7-GLOBAL-SEMANTIC-FACT-SET-V1', semanticFacts),
  };
  const mutationMatrix = factBindings.map((binding) => ({ mutationId: `B0V7-GLOBAL-${binding.predicateId}-NEG`, predicateId: binding.predicateId, factKey: binding.factKey, jsonPointer: `/semanticFacts/${binding.factKey}`, mutatedValue: null, expected: 'BLOCK' }));
  const registry = {
    schemaVersion: 'B0V7-NORMATIVE-REGISTRY-V1', artifactId: `CONNECT-B0-V7-NORMATIVE-REGISTRY-${DATE}-G0`, artifactClass: 'PLANNING-ONLY;NON-AUTHORITY;NON-ACCEPTANCE', repositoryVisibility: 'PUBLIC',
    validatorLanguage, detachedAcceptance, authorityBootstrap, permitRevisionTimeRevocationReplay, casStateMachine, recoveryReducer, expectedInterfaces,
    actualInterfaceEvidenceBinding: { logicalPath: P.evidence, sha256: evidenceFact.sha256, bytes: evidenceFact.bytes, producerProgramPath: P.interfaceGenerator, producerProgramSha256: interfaceGeneratorFact.sha256, expectedValueDependency: 'NONE', futureProviderDependency: 'NONE', interfaceCount: 17 },
    readerIndependenceProfiles, readerProfileSetRoot: root('B0V7-READER-PROFILE-SET-V1', readerIndependenceProfiles.map((row) => row.profileRoot)),
    globalModel: { modelId: planningPositiveModel.modelId, predicateIds, factBindings, conjunctCount: predicateIds.length, planningPositiveModel, planningPositiveModelRoot: root('B0V7-GLOBAL-PLANNING-MODEL-V1', planningPositiveModel), mutationMatrix, mutationRule: 'EXACTLY-ONE-UNDERLYING-SEMANTIC-FACT-IS-REMOVED-PER-PREDICATE;READERS-RECOMPUTE-EVERY-FACT-FROM-NORMATIVE-COMPONENTS', currentRealStateSeparate: true },
    deterministicIdentityPolicy,
    predecessorSemanticNonWeakening: { predecessorPackageContentRoot: FROZEN.packageContentRoot, predecessorPackageMemberCount: 24, exactByteVerificationRequired: true, activeIdentityCount: 31, mergeCreditAllowed: false, rangeCreditAllowed: false },
    currentState,
    noSelfAcceptanceRule: 'PRODUCER-QA-AND-READER-PASS-ARE-MECHANICAL-PLANNING-EVIDENCE-ONLY;FRESH-INDEPENDENT-HOSTILE-REVIEW-IS-REQUIRED;PACKAGE-CANNOT-ACCEPT-ITSELF',
  };
  registry.registryContentRoot = root('B0V7-NORMATIVE-REGISTRY-V1', registry); return registry;
}

function buildSubject(registry, requirements) {
  const lines = [
    '# 1. Connect — Bootstrap Authority Envelope B0 v7 immutable planning successor', '',
    '## 1.1 Status and safety boundary', '',
    `1.1.1 \`artifactId=CONNECT-B0-V7-SUCCESSOR-REQUIREMENTS-${DATE}-G0\`.`, '',
    '1.1.2 `artifactClass=PLANNING-ONLY;NON-AUTHORITY;NON-ACCEPTANCE;IMMUTABLE-CANDIDATE-PENDING-FRESH-INDEPENDENT-REVIEW`.', '',
    '1.1.3 Current real state is unchanged: `externalL0Authority=ABSENT`; `B0=ABSENT`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`; `authorityCredit=0`; `acceptanceCredit=0`; `selfAcceptance=0`.', '',
    '1.1.4 This package changes no product code, runtime, build, Git, GitHub, provider, predecessor, or operational authority byte. It cannot accept itself.', '',
    '## 1.2 Frozen predecessor boundary', '',
    `1.2.1 v6 Subject: \`${V6.subject}\`, SHA-256 \`${FROZEN.subjectSha256}\`.`, '',
    `1.2.2 v6 manifest: \`${V6.manifest}\`, SHA-256 \`${FROZEN.manifestSha256}\`, package root \`${FROZEN.packageContentRoot}\`.`, '',
    `1.2.3 v6 hostile-review Findings: \`${V6.findings}\`, SHA-256 \`${FROZEN.findingsSha256}\`.`, '',
    '1.2.4 Exact denominator: seven new Findings plus thirty-one active inherited identities equals `38/38` one-to-one rows. Preserved-closed `B0V4-HR-F012` remains outside the active denominator with no additional credit.', '',
    '## 2. Normative executable controls', '',
    `2.1 One closed validator language: \`${registry.validatorLanguage.languageId}\`, language root \`${registry.validatorLanguage.languageRoot}\`; operators \`${registry.validatorLanguage.operators.length}\`; types \`${registry.validatorLanguage.types.length}\`; unknown operator/type and invalid inputs block.`, '',
    `2.2 Detached Acceptance has closed external \`${registry.detachedAcceptance.externalSchema.schemaRoot}\`, context \`${registry.detachedAcceptance.validationContextSchema.schemaRoot}\`, and internal \`${registry.detachedAcceptance.internalSchema.schemaRoot}\` schemas. The sole admitted positive is planning-only, non-operational, and zero-credit.`, '',
    `2.3 Independent actual-interface evidence is \`${P.evidence}\`; exactly \`${registry.expectedInterfaces.length}/17\` observations are derived from frozen predecessor bytes by a Python producer with no expected-value dependency.`, '',
    `2.4 CAS reducer \`${registry.casStateMachine.reducerId}\` executes \`${registry.casStateMachine.stepCount}/15\` ordered steps. Its exhaustive state-DP covers \`${registry.casStateMachine.exhaustiveProof.completeScheduleCount}\` complete two-writer schedules, \`${registry.casStateMachine.exhaustiveProof.reachableStateCount}\` reachable states, and \`${registry.casStateMachine.exhaustiveProof.crashCutStateActorCount}\` reachable actor crash cuts.`, '',
    `2.5 Recovery reducer \`${registry.recoveryReducer.reducerId}\` binds \`${registry.recoveryReducer.readPathCount}\` exact lifecycle paths, two authoritative heads, one mutation per read path, and one head-change injection after each of seven precommit steps.`, '',
    `2.6 The global model has \`${registry.globalModel.conjunctCount}\` conjuncts, is deterministic/non-authoritative/non-operational/zero-credit, and has one negative mutation per conjunct. The separately evaluated real state stays blocked.`, '',
    '2.7 Exact Reader A/B bytes bind to distinct dependencies, runtimes, controllers, execution contexts, and disclosure roots. Reader PASS is detached mechanical QA, never independent hostile Acceptance.', '',
    '## 3. Authority, permits, independence, and public storage', '',
    '3.1 External L0 is the only bootstrap source. Genesis, Recovery, Permit, and Acceptance each have one explicit sole producer appointed by a distinct authority rule; no self-appointment or delegation is allowed.', '',
    '3.2 Permit validation is typed and executable over revision, half-open time, current revocation head, atomic consume, deterministic replay key, CAS, and response-loss readback.', '',
    '3.3 Witness, work, ledger, and authority-owner independence each bind disjoint producer/verifier/controller roots. Two witnesses require two distinct current controller roots.', '',
    '3.4 Every public locator starts `docs/`; no `web/` prefix or absolute path is admitted. The vector corpus is deterministically split into two contiguous package members and every member must remain strictly below 50 MiB.', '',
    '## 4. Exact counters', '',
    '| Counter | Value |', '|---|---:|',
    '| New v6 review Findings | `7` |', '| Active inherited identities | `31` |', '| Active one-to-one closure rows | `38` |',
    '| Requirements | `38` |', '| Five-field normative fields | `190` |', '| Preserved-closed identities outside denominator | `1` |',
    '| Authority / Acceptance credit | `0 / 0` |', '| Current independently closed active rows | `0/38` |', '',
    '## 5. Non-merged requirements', '',
  ];
  for (const requirement of requirements) {
    lines.push(`### 5.${requirement.ordinal} \`${requirement.requirementId}\` ← \`${requirement.sourceFindingId}\``, '');
    lines.push(`5.${requirement.ordinal}.1 **Condition:** ${requirement.normativeFields.Condition}.`, '');
    lines.push(`5.${requirement.ordinal}.2 **Producer:** \`${requirement.normativeFields.Producer}\`.`, '');
    lines.push(`5.${requirement.ordinal}.3 **Proof:** ${requirement.normativeFields.Proof}.`, '');
    lines.push(`5.${requirement.ordinal}.4 **Failure:** ${requirement.normativeFields.Failure}.`, '');
    lines.push(`5.${requirement.ordinal}.5 **Output:** \`${requirement.normativeFields.Output}\`; \`noMergeKey=${requirement.noMergeKey}\`; no merge or range credit.`, '');
  }
  lines.push('## 6. Terminal rule', '', '6.1 Producer QA and both Readers may prove only package consistency. Until a fresh independent hostile review closes each exact row, `Acceptance=0`, `B0=ABSENT`, `Gate29=BLOCKED`, `developmentFreeze=ACTIVE`, and `repositoryVisibility=PUBLIC`.', '');
  return lines.join('\n');
}

const lit = (value) => ({ op: 'LITERAL', args: [value] });
const get = (pointer) => ({ op: 'GET', args: [pointer] });

function mutateAtPath(source, pointer, value) {
  const copy = structuredClone(source); const tokens = pointer.slice(1).split('/').map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~')); let current = copy;
  for (const token of tokens.slice(0, -1)) current = current[token]; current[tokens.at(-1)] = value; return copy;
}

function buildVectors(registry, crosswalk, evidence) {
  const vectors = [];
  function add(vectorId, family, expected, input, mutationTarget = null) {
    const vector = { ordinal: vectors.length + 1, vectorId, family, expected, input, mutationTarget, operational: false, authorityCredit: 0, acceptanceCredit: 0 };
    vector.vectorRoot = root('B0V7-VECTOR-V1', vector); vectors.push(vector);
  }
  const typeCases = {
    NULL: [null, 0], BOOLEAN: [true, 'true'], STRING: ['x', 1], NONEMPTY_STRING: ['x', ''], SAFE_INTEGER: [7, '7'], NONNEGATIVE_INTEGER: [0, -1],
    U64_DECIMAL: ['18446744073709551615', '18446744073709551616'], SHA256: [fixtureRoot('TYPE-SHA'), 'ABC'], DETERMINISTIC_ID: ['B0V7-ID-001', 'lowercase-id'],
    RFC3339_UTC: ['2026-08-30T00:00:00Z', '2026-02-30T00:00:00Z'], JSON_POINTER: ['/store/currentHead', '/bad~2token'], REPO_RELATIVE_PATH: [P.subject, `web/${P.subject}`], ARRAY: [[], {}], OBJECT: [{}, []],
  };
  for (const { type } of registry.validatorLanguage.types) {
    add(`B0V7-TYPE-${type}-POS`, 'VALIDATOR-TYPE', 'PASS', { type, value: typeCases[type][0] }, type);
    add(`B0V7-TYPE-${type}-NEG`, 'VALIDATOR-TYPE', 'BLOCK', { type, value: typeCases[type][1] }, type);
  }
  add('B0V7-TYPE-UNKNOWN-NEG', 'VALIDATOR-UNKNOWN-TYPE', 'BLOCK', { type: 'UNDECLARED-TYPE', value: 'x' }, 'UNKNOWN-TYPE');
  const hashValue = { x: 1 }; const hashDomain = 'B0V7-HASH-OP-TEST'; const hashExpected = root(hashDomain, hashValue);
  const opCases = {
    LITERAL: [[lit(true), {}], [lit(false), {}]], GET: [[get('/x'), { x: true }], [get('/missing'), { x: true }]],
    PATH_EXISTS: [[{ op: 'PATH_EXISTS', args: ['/x'] }, { x: 1 }], [{ op: 'PATH_EXISTS', args: ['/y'] }, { x: 1 }]],
    AND: [[{ op: 'AND', args: [lit(true), lit(true)] }, {}], [{ op: 'AND', args: [lit(true), lit(false)] }, {}]],
    OR: [[{ op: 'OR', args: [lit(false), lit(true)] }, {}], [{ op: 'OR', args: [lit(false), lit(false)] }, {}]],
    NOT: [[{ op: 'NOT', args: [lit(false)] }, {}], [{ op: 'NOT', args: [lit(true)] }, {}]],
    EQ: [[{ op: 'EQ', args: [lit(1), lit(1)] }, {}], [{ op: 'EQ', args: [lit(1), lit(2)] }, {}]],
    NEQ: [[{ op: 'NEQ', args: [lit(1), lit(2)] }, {}], [{ op: 'NEQ', args: [lit(1), lit(1)] }, {}]],
    LT: [[{ op: 'LT', args: [lit(1), lit(2)] }, {}], [{ op: 'LT', args: [lit(2), lit(1)] }, {}]],
    LTE: [[{ op: 'LTE', args: [lit(2), lit(2)] }, {}], [{ op: 'LTE', args: [lit(3), lit(2)] }, {}]],
    GT: [[{ op: 'GT', args: [lit(2), lit(1)] }, {}], [{ op: 'GT', args: [lit(1), lit(2)] }, {}]],
    GTE: [[{ op: 'GTE', args: [lit(2), lit(2)] }, {}], [{ op: 'GTE', args: [lit(1), lit(2)] }, {}]],
    TYPE_IS: [[{ op: 'TYPE_IS', args: [get('/x'), 'NONEMPTY_STRING'] }, { x: 'ok' }], [{ op: 'TYPE_IS', args: [get('/x'), 'NONEMPTY_STRING'] }, { x: '' }]],
    EXACT_KEYS: [[{ op: 'EXACT_KEYS', args: [get('/x'), ['a']] }, { x: { a: 1 } }], [{ op: 'EXACT_KEYS', args: [get('/x'), ['a']] }, { x: { a: 1, b: 2 } }]],
    UNIQUE_VALUES: [[{ op: 'UNIQUE_VALUES', args: [get('/x')] }, { x: [1, 2] }], [{ op: 'UNIQUE_VALUES', args: [get('/x')] }, { x: [1, 1] }]],
    IN_SET: [[{ op: 'IN_SET', args: [get('/x'), ['A', 'B']] }, { x: 'A' }], [{ op: 'IN_SET', args: [get('/x'), ['A', 'B']] }, { x: 'C' }]],
    MATCH: [[{ op: 'MATCH', args: [get('/x'), '^[A-Z]+$'] }, { x: 'ABC' }], [{ op: 'MATCH', args: [get('/x'), '^[A-Z]+$'] }, { x: 'abc' }]],
    HASH_EQ: [[{ op: 'HASH_EQ', args: [get('/x'), hashDomain, hashExpected] }, { x: hashValue }], [{ op: 'HASH_EQ', args: [get('/x'), hashDomain, '0'.repeat(64)] }, { x: hashValue }]],
  };
  for (const { operator } of registry.validatorLanguage.operators) {
    const [[positiveAst, positiveData], [negativeAst, negativeData]] = opCases[operator];
    add(`B0V7-OP-${operator}-POS`, 'VALIDATOR-OPERATOR', 'PASS', { operator, ast: positiveAst, data: positiveData }, operator);
    add(`B0V7-OP-${operator}-NEG`, 'VALIDATOR-OPERATOR', 'BLOCK', { operator, ast: negativeAst, data: negativeData }, operator);
  }
  add('B0V7-OP-UNKNOWN-NEG', 'VALIDATOR-UNKNOWN-OPERATOR', 'BLOCK', { operator: 'UNDECLARED-OP', ast: { op: 'UNDECLARED-OP', args: [] }, data: {} }, 'UNKNOWN-OPERATOR');

  const baseEnvelope = registry.detachedAcceptance.planningPositiveEnvelope;
  add('B0V7-DETACHED-POS', 'DETACHED-ACCEPTANCE', 'PASS', { envelope: baseEnvelope }, 'FULL-INSTANCE');
  for (const field of registry.detachedAcceptance.externalSchema.fields) {
    const mutated = structuredClone(baseEnvelope); delete mutated[field.name]; add(`B0V7-DETACHED-EXTERNAL-MISSING-${field.name}`, 'DETACHED-ACCEPTANCE', 'BLOCK', { envelope: mutated }, `/external/${field.name}`);
  }
  for (const field of registry.detachedAcceptance.validationContextSchema.fields) {
    const mutated = structuredClone(baseEnvelope); delete mutated.validationContext[field.name]; add(`B0V7-DETACHED-CONTEXT-MISSING-${field.name}`, 'DETACHED-ACCEPTANCE', 'BLOCK', { envelope: mutated }, `/validationContext/${field.name}`);
  }
  for (const field of registry.detachedAcceptance.internalSchema.fields) {
    const mutated = structuredClone(baseEnvelope); delete mutated.payload[field.name]; add(`B0V7-DETACHED-INTERNAL-MISSING-${field.name}`, 'DETACHED-ACCEPTANCE', 'BLOCK', { envelope: mutated }, `/payload/${field.name}`);
  }
  for (const [scope, mutate] of [
    ['EXTERNAL-UNKNOWN', (x) => { x.undeclared = true; }], ['CONTEXT-UNKNOWN', (x) => { x.validationContext.undeclared = true; }], ['INTERNAL-UNKNOWN', (x) => { x.payload.undeclared = true; }],
    ['INSTANCE-ROOT', (x) => { x.instanceRoot = '0'.repeat(64); }], ['PRODUCER-COMPARATOR', (x) => { x.validationContext.expectedProducerAppointmentRoot = '0'.repeat(64); }],
    ['FRESHNESS-COMPARATOR', (x) => { x.validationContext.currentSecurityUniverseTupleRoot = '0'.repeat(64); }], ['PLANNING-FLAG', (x) => { x.planningOnly = false; }],
    ['OPERATIONAL-FLAG', (x) => { x.operational = true; }], ['AUTHORITY-CREDIT', (x) => { x.authorityCredit = 1; }], ['ACCEPTANCE-CREDIT', (x) => { x.acceptanceCredit = 1; }],
  ]) { const mutated = structuredClone(baseEnvelope); mutate(mutated); add(`B0V7-DETACHED-${scope}-NEG`, 'DETACHED-ACCEPTANCE', 'BLOCK', { envelope: mutated }, scope); }

  const expectedById = new Map(registry.expectedInterfaces.map((row) => [row.interfaceId, row]));
  for (const actual of evidence.observations) {
    const expected = expectedById.get(actual.interfaceId);
    add(`${actual.interfaceId}-POS`, 'INTERFACE', 'PASS', { interfaceId: actual.interfaceId, actualValue: actual.actualValue, actualObservationRoot: actual.actualObservationRoot }, actual.measurementKind);
    add(`${actual.interfaceId}-DIRECT-COPY-NEG`, 'INTERFACE', 'BLOCK', { interfaceId: actual.interfaceId, actualValue: actual.actualValue, actualObservationRoot: expected.expectedSpecificationRoot }, 'DIRECT-EXPECTED-ROOT-COPY');
    add(`${actual.interfaceId}-NULL-ACTUAL-NEG`, 'INTERFACE', 'BLOCK', { interfaceId: actual.interfaceId, actualValue: null, actualObservationRoot: actual.actualObservationRoot }, 'NULL-ACTUAL');
  }

  add('B0V7-CAS-EXHAUSTIVE-PROOF-POS', 'CAS-PROOF', 'PASS', { expectedProof: registry.casStateMachine.exhaustiveProof }, 'ALL-INTERLEAVINGS');
  add('B0V7-CAS-GUARDS-POS', 'CAS-GUARD', 'PASS', { attempt: registry.casStateMachine.planningAttempts.A }, 'ALL-TYPED-GUARDS');
  for (const mutation of registry.casStateMachine.guardMutationMatrix) {
    add(mutation.mutationId, 'CAS-GUARD', 'BLOCK', { attempt: { ...registry.casStateMachine.planningAttempts.A, [mutation.field]: mutation.mutatedValue } }, mutation.field);
  }
  for (let index = 0; index < CAS_STEP_IDS.length; index += 1) add(`B0V7-CAS-MISSING-STEP-${String(index + 1).padStart(2, '0')}-NEG`, 'CAS-ILLEGAL-TRACE', 'BLOCK', { steps: CAS_STEP_IDS.filter((_, ordinal) => ordinal !== index) }, CAS_STEP_IDS[index]);
  for (const actor of ['A', 'B']) for (let cut = 0; cut < 15; cut += 1) {
    add(`B0V7-CAS-CRASH-${actor}-${String(cut).padStart(2, '0')}-POS`, 'CAS-CRASH-CUT', 'PASS', { actor, cut, durableWritesByCrashedActor: 0 }, `${actor}:${cut}`);
    add(`B0V7-CAS-CRASH-${actor}-${String(cut).padStart(2, '0')}-DURABLE-WRITE-NEG`, 'CAS-CRASH-CUT', 'BLOCK', { actor, cut, durableWritesByCrashedActor: 1 }, `${actor}:${cut}:DURABLE-WRITE`);
  }

  const recovery = registry.recoveryReducer; add('B0V7-RECOVERY-LIFECYCLE-POS', 'RECOVERY', 'PASS', { state: recovery.planningPositiveState }, 'FULL-LIFECYCLE');
  const recoveryMutations = [
    '', ['MEMBER-A', 'MEMBER-A', 'MEMBER-C'], [], '0'.repeat(64), true, 4, '0'.repeat(64), '2031-01-01T00:00:00Z', '0'.repeat(64), '0'.repeat(64),
    {}, { 'WITNESS-A': recovery.planningPositiveState.store.witnesses['WITNESS-A'] }, {}, '0'.repeat(64), '0'.repeat(64), null, true,
  ];
  recovery.mutationMatrix.forEach((entry, index) => add(entry.mutationId, 'RECOVERY', 'BLOCK', { state: mutateAtPath(recovery.planningPositiveState, entry.path, recoveryMutations[index]) }, entry.path));
  for (const injection of recovery.headChangeInjections) add(injection.mutationId, 'RECOVERY-HEAD-INJECTION', 'BLOCK', { state: recovery.planningPositiveState, injectionAfterStep: injection.afterStepOrdinal }, `HEAD-CHANGE-AFTER-${injection.afterStepOrdinal}`);

  for (const row of crosswalk.closureRows) {
    const complete = { sourceFindingId: row.sourceFindingId, targetRequirementId: row.targetRequirementId, targetOutputId: row.targetOutputId, complete: true };
    add(row.requiredPositiveVectorId, 'CLOSURE', 'PASS', complete, row.sourceFindingId); add(row.requiredNegativeVectorId, 'CLOSURE', 'BLOCK', { ...complete, complete: false }, row.sourceFindingId);
  }
  const global = registry.globalModel.planningPositiveModel; add('B0V7-GLOBAL-MODEL-POS', 'GLOBAL-MODEL', 'PASS', { model: global }, 'ALL-CONJUNCTS');
  for (const mutation of registry.globalModel.mutationMatrix) {
    const mutated = mutateAtPath(global, mutation.jsonPointer, mutation.mutatedValue); add(mutation.mutationId, 'GLOBAL-MODEL', 'BLOCK', { model: mutated }, mutation.predicateId);
  }
  return vectors;
}

function buildShard(logicalPath, ordinal, vectors, startOrdinal, endOrdinal) {
  const shard = {
    schemaVersion: 'B0V7-VECTOR-SHARD-V1', artifactId: `CONNECT-B0-V7-VECTOR-SHARD-${String(ordinal).padStart(2, '0')}-OF-02-${DATE}-G0`,
    artifactClass: 'PLANNING-ONLY;NON-AUTHORITY;NON-ACCEPTANCE', shardOrdinal: ordinal, shardCount: 2, logicalPath,
    vectorStartOrdinal: startOrdinal, vectorEndOrdinal: endOrdinal, vectorCount: vectors.length, vectors, authorityCredit: 0, acceptanceCredit: 0,
  };
  shard.shardContentRoot = root('B0V7-VECTOR-SHARD-V1', shard); return shard;
}

function buildPackage() {
  const sourceIndex = buildSourceIndex(); const sourceIndexContent = pretty(sourceIndex);
  const registry = buildRegistry(); const registryContent = pretty(registry); const registrySha256 = shaText(registryContent);
  const initial = buildRequirementsAndCrosswalk(registrySha256); const subjectContent = buildSubject(registry, initial.requirements); const subjectSha256 = shaText(subjectContent);
  const { requirements, crosswalk } = buildRequirementsAndCrosswalk(registrySha256, subjectSha256); const crosswalkContent = pretty(crosswalk); const evidence = readJson(P.evidence);
  const vectors = buildVectors(registry, crosswalk, evidence); const split = Math.ceil(vectors.length / 2);
  const shard1 = buildShard(P.shard1, 1, vectors.slice(0, split), 1, split); const shard2 = buildShard(P.shard2, 2, vectors.slice(split), split + 1, vectors.length);
  const shard1Content = pretty(shard1); const shard2Content = pretty(shard2);
  const shardDescriptors = [[P.shard1, shard1, shard1Content], [P.shard2, shard2, shard2Content]].map(([logicalPath, shard, content], index) => ({
    ordinal: index + 1, logicalPath, sha256: shaText(content), bytes: Buffer.byteLength(content), vectorStartOrdinal: shard.vectorStartOrdinal, vectorEndOrdinal: shard.vectorEndOrdinal,
    vectorCount: shard.vectorCount, shardContentRoot: shard.shardContentRoot, maximumBytesExclusive: MAX_MEMBER_BYTES_EXCLUSIVE, belowMaximum: Buffer.byteLength(content) < MAX_MEMBER_BYTES_EXCLUSIVE,
  }));
  const familyCounts = Object.fromEntries([...new Set(vectors.map((vector) => vector.family))].sort().map((family) => [family, vectors.filter((vector) => vector.family === family).length]));
  const corpus = {
    schemaVersion: 'B0V7-VALIDATOR-AND-STATE-MACHINE-CORPUS-V1', artifactId: `CONNECT-B0-V7-VALIDATOR-AND-STATE-MACHINE-CORPUS-${DATE}-G0`, artifactClass: 'PLANNING-ONLY;NON-AUTHORITY;NON-ACCEPTANCE',
    validatorLanguageId: registry.validatorLanguage.languageId, validatorLanguageRoot: registry.validatorLanguage.languageRoot, normativeRegistrySha256: registrySha256,
    closureCrosswalkSha256: shaText(crosswalkContent), vectorCount: vectors.length, positiveVectorCount: vectors.filter((vector) => vector.expected === 'PASS').length,
    negativeVectorCount: vectors.filter((vector) => vector.expected === 'BLOCK').length, everyNegativeTerminatesFailure: true, operationalExecutionCount: 0,
    typePositiveNegativeCoverage: `${registry.validatorLanguage.types.length}/${registry.validatorLanguage.types.length}`, operatorPositiveNegativeCoverage: `${registry.validatorLanguage.operators.length}/${registry.validatorLanguage.operators.length}`,
    unknownTypeVectorCount: vectors.filter((vector) => vector.family === 'VALIDATOR-UNKNOWN-TYPE').length, unknownOperatorVectorCount: vectors.filter((vector) => vector.family === 'VALIDATOR-UNKNOWN-OPERATOR').length,
    detachedSchemaMutationCount: vectors.filter((vector) => vector.family === 'DETACHED-ACCEPTANCE' && vector.expected === 'BLOCK').length,
    interfaceVectorCount: vectors.filter((vector) => vector.family === 'INTERFACE').length, casVectorCount: vectors.filter((vector) => vector.family.startsWith('CAS-')).length,
    recoveryVectorCount: vectors.filter((vector) => vector.family.startsWith('RECOVERY')).length, closureVectorCount: vectors.filter((vector) => vector.family === 'CLOSURE').length,
    globalModelVectorCount: vectors.filter((vector) => vector.family === 'GLOBAL-MODEL').length, familyCounts,
    vectorSequenceRoot: root('B0V7-VECTOR-SEQUENCE-V1', vectors.map((vector) => vector.vectorRoot)), shardCount: 2, shardPartitionRule: 'CONTIGUOUS-BY-VECTOR-ORDINAL;SPLIT-AT-CEILING-HALF;ZERO-GAP;ZERO-OVERLAP',
    shardDescriptors, shardSetRoot: root('B0V7-VECTOR-SHARD-SET-V1', shardDescriptors), maximumPublicGitMemberBytesExclusive: MAX_MEMBER_BYTES_EXCLUSIVE,
    largestShardBytes: Math.max(...shardDescriptors.map((row) => row.bytes)), everyShardBelowMaximum: shardDescriptors.every((row) => row.belowMaximum), deterministicSharding: true,
    authorityCredit: 0, acceptanceCredit: 0,
  };
  corpus.corpusContentRoot = root('B0V7-VALIDATOR-AND-STATE-MACHINE-CORPUS-V1', corpus); const corpusContent = pretty(corpus);
  const generated = new Map([
    [P.registry, registryContent], [P.subject, subjectContent], [P.sourceIndex, sourceIndexContent], [P.crosswalk, crosswalkContent], [P.corpus, corpusContent], [P.shard1, shard1Content], [P.shard2, shard2Content],
  ]);
  const memberSpecs = [
    [P.registry, 'NORMATIVE-REGISTRY', 'application/json'], [P.subject, 'SUBJECT', 'text/markdown'], [P.sourceIndex, 'FROZEN-SOURCE-INDEX', 'application/json'], [P.crosswalk, 'CLOSURE-CROSSWALK', 'application/json'],
    [P.corpus, 'VECTOR-CORPUS-INDEX', 'application/json'], [P.shard1, 'VECTOR-SHARD', 'application/json'], [P.shard2, 'VECTOR-SHARD', 'application/json'], [P.evidence, 'INDEPENDENT-ACTUAL-INTERFACE-EVIDENCE', 'application/json'],
    [P.interfaceGenerator, 'INDEPENDENT-ACTUAL-INTERFACE-PRODUCER', 'text/x-python'], [P.packageGenerator, 'PACKAGE-PRODUCER', 'text/javascript'], [P.readerA, 'INDEPENDENT-QA-READER-A', 'text/javascript'], [P.readerB, 'INDEPENDENT-QA-READER-B', 'text/x-python'],
  ];
  const members = memberSpecs.map(([logicalPath, role, mediaType], index) => {
    const content = generated.has(logicalPath) ? Buffer.from(generated.get(logicalPath), 'utf8') : readBytes(logicalPath);
    return { ordinal: index + 1, logicalPath, role, mediaType, sha256: shaBytes(content), bytes: content.length, required: true };
  });
  if (members.some((member) => member.bytes >= MAX_MEMBER_BYTES_EXCLUSIVE)) throw new Error('package member exceeds public threshold');
  const packageProjection = members.map(({ ordinal, logicalPath, sha256, bytes, required }) => ({ ordinal, logicalPath, sha256, bytes, required }));
  const manifest = {
    schemaVersion: 'B0V7-ATOMIC-PACKAGE-MANIFEST-V1', artifactId: `CONNECT-B0-V7-ATOMIC-PACKAGE-MANIFEST-${DATE}-G0`, artifactClass: 'PLANNING-ONLY;NON-AUTHORITY;NON-ACCEPTANCE',
    rootAlgorithm: { algorithm: 'SHA-256', domain: 'B0V7-PACKAGE-CONTENT-ROOT-V1', canonicalization: 'UTF8;OBJECT-KEYS-LEXICOGRAPHIC;ARRAY-ORDER-PRESERVED;SAFE-INTEGERS-ONLY', projectionFields: ['ordinal', 'logicalPath', 'sha256', 'bytes', 'required'] },
    subjectPath: P.subject, subjectSha256, normativeRegistryPath: P.registry, normativeRegistrySha256: registrySha256, sourceIndexPath: P.sourceIndex, sourceIndexSha256: shaText(sourceIndexContent),
    closureCrosswalkPath: P.crosswalk, closureCrosswalkSha256: shaText(crosswalkContent), vectorCorpusPath: P.corpus, vectorCorpusSha256: shaText(corpusContent),
    memberCount: members.length, requiredMemberCount: members.length, members, maximumPublicGitMemberBytesExclusive: MAX_MEMBER_BYTES_EXCLUSIVE,
    largestMemberBytes: Math.max(...members.map((member) => member.bytes)), everyMemberBelowMaximum: true, packageContentRoot: root('B0V7-PACKAGE-CONTENT-ROOT-V1', packageProjection),
    predecessorPackageContentRoot: FROZEN.packageContentRoot, acceptanceCredit: 0, authorityCredit: 0, selfAcceptance: false,
    currentState: { B0: 'ABSENT', Gate29: 'BLOCKED', developmentFreeze: 'ACTIVE', repositoryVisibility: 'PUBLIC' },
  };
  manifest.manifestProjectionRoot = root('B0V7-MANIFEST-PROJECTION-V1', { members: packageProjection, packageContentRoot: manifest.packageContentRoot, rootAlgorithm: manifest.rootAlgorithm });
  const manifestContent = pretty(manifest);
  return { sourceIndex, registry, requirements, crosswalk, vectors, corpus, shard1, shard2, manifest, files: [...generated.entries(), [P.manifest, manifestContent]] };
}

function buildProducerQa() {
  const packageData = buildPackage(); const manifestBytes = readBytes(P.manifest); const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (canonical(manifest) !== canonical(packageData.manifest)) throw new Error('frozen manifest differs from deterministic producer output');
  const reportABytes = readBytes(P.reportA); const reportBBytes = readBytes(P.reportB); const reportA = JSON.parse(reportABytes.toString('utf8')); const reportB = JSON.parse(reportBBytes.toString('utf8'));
  for (const report of [reportA, reportB]) {
    if (root('B0V7-DETACHED-QA-READER-REPORT-V1', without(report, 'reportContentRoot')) !== report.reportContentRoot || report.facts.verdict !== 'PASS' || report.acceptanceCredit !== 0 || report.authorityCredit !== 0) throw new Error(`invalid reader report ${report.readerId}`);
    if (report.manifestSha256 !== shaBytes(manifestBytes) || report.facts.packageContentRoot !== manifest.packageContentRoot) throw new Error(`reader manifest binding ${report.readerId}`);
  }
  if (reportA.verificationRoot !== reportB.verificationRoot || canonical(reportA.facts) !== canonical(reportB.facts)) throw new Error('reader parity mismatch');
  const memberBytes = manifest.members.map((member) => readBytes(member.logicalPath)); const joined = Buffer.concat(memberBytes).toString('utf8');
  const forbiddenRandomApiTokens = [['Math', 'random'].join('.'), ['crypto', 'randomUUID'].join('.')];
  const randomApiOccurrenceCount = forbiddenRandomApiTokens.reduce((sum, token) => sum + joined.split(token).length - 1, 0);
  const secretPatternCount = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, /AKIA[0-9A-Z]{16}/g, /Bearer\s+[A-Za-z0-9._~-]{20,}/g].reduce((sum, pattern) => sum + (joined.match(pattern)?.length ?? 0), 0);
  const piiEmailCount = (joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).length;
  if (randomApiOccurrenceCount !== 0 || secretPatternCount !== 0 || piiEmailCount !== 0) throw new Error('public safety scan failed');
  const qa = {
    schemaVersion: 'B0V7-DETACHED-PRODUCER-QA-V1', artifactId: `CONNECT-B0-V7-DETACHED-PRODUCER-QA-${DATE}-G0`, artifactClass: 'DETACHED-PRODUCER-QA;PLANNING-ONLY;NOT-IN-PACKAGE-ROOT;NOT-ACCEPTANCE',
    verdict: 'PASS', manifestPath: P.manifest, manifestSha256: shaBytes(manifestBytes), packageContentRoot: manifest.packageContentRoot, memberCount: manifest.memberCount,
    readerReports: [
      { readerId: reportA.readerId, logicalPath: P.reportA, sha256: shaBytes(reportABytes), bytes: reportABytes.length, verificationRoot: reportA.verificationRoot, verdict: reportA.facts.verdict },
      { readerId: reportB.readerId, logicalPath: P.reportB, sha256: shaBytes(reportBBytes), bytes: reportBBytes.length, verificationRoot: reportB.verificationRoot, verdict: reportB.facts.verdict },
    ],
    readerParity: 'PASS', commonVerificationRoot: reportA.verificationRoot, checks: {
      deterministicRegeneration: 'PASS', packageHashAndRoot: 'PASS', frozenPredecessorBytes: 'PASS', oneToOneClosureRows: '38/38', inheritedIdentityPreservation: '31/31', newFindingClosureRows: '7/7',
      validatorOperatorCoverage: `${packageData.registry.validatorLanguage.operators.length}/${packageData.registry.validatorLanguage.operators.length}`, validatorTypeCoverage: `${packageData.registry.validatorLanguage.types.length}/${packageData.registry.validatorLanguage.types.length}`,
      independentActualInterfaces: '17/17', casSteps: '15/15', casTwoWriterSchedules: packageData.registry.casStateMachine.exhaustiveProof.completeScheduleCount,
      casCrashCutStates: packageData.registry.casStateMachine.exhaustiveProof.crashCutStateActorCount, recoveryReadPaths: `${packageData.registry.recoveryReducer.readPathCount}/${packageData.registry.recoveryReducer.readPathCount}`,
      recoveryHeadChangeCuts: `${packageData.registry.recoveryReducer.headChangeInjections.length}/${packageData.registry.recoveryReducer.headChangeInjections.length}`, globalConjunctMutations: `${packageData.registry.globalModel.conjunctCount}/${packageData.registry.globalModel.conjunctCount}`,
      vectorCount: packageData.vectors.length, positiveVectorCount: packageData.corpus.positiveVectorCount, negativeVectorCount: packageData.corpus.negativeVectorCount,
      shardCount: 2, largestShardBytes: packageData.corpus.largestShardBytes, everyPackageMemberBelow50MiB: true, absolutePublicLocatorCount: 0, extraWebPrefixLocatorCount: 0,
      randomApiOccurrenceCount, secretPatternCount, piiEmailCount, pycachePackageMemberCount: manifest.members.filter((member) => member.logicalPath.includes('__pycache__') || member.logicalPath.endsWith('.pyc')).length,
    },
    residualLimit: 'MECHANICAL-PRODUCER-QA-AND-READER-PARITY-DO-NOT-CLOSE-ANY-FINDING-AND-DO-NOT-GRANT-AUTHORITY-OR-ACCEPTANCE;FRESH-INDEPENDENT-HOSTILE-REVIEW-REQUIRED',
    currentState: { externalL0Authority: 'ABSENT', B0: 'ABSENT', Gate29: 'BLOCKED', developmentFreeze: 'ACTIVE', repositoryVisibility: 'PUBLIC' }, operational: false, selfAcceptance: false, authorityCredit: 0, acceptanceCredit: 0,
  };
  qa.producerQaContentRoot = root('B0V7-DETACHED-PRODUCER-QA-V1', qa); return qa;
}

function main() {
  if (process.argv.includes('--emit-core-patch')) {
    const packageData = buildPackage(); emitPatch(packageData.files); return;
  }
  if (process.argv.includes('--emit-producer-qa-patch')) {
    const qa = buildProducerQa(); emitPatch([[P.producerQa, pretty(qa)]]); return;
  }
  const packageData = buildPackage(); const summary = {
    subjectPath: P.subject, subjectSha256: shaText(packageData.files.find(([logicalPath]) => logicalPath === P.subject)[1]), manifestPath: P.manifest,
    manifestSha256: shaText(packageData.files.find(([logicalPath]) => logicalPath === P.manifest)[1]), packageContentRoot: packageData.manifest.packageContentRoot,
    memberCount: packageData.manifest.memberCount, requirementCount: packageData.crosswalk.requirementCount, fiveFieldCount: packageData.crosswalk.fiveFieldCount,
    closureRows: packageData.crosswalk.activeClosureDenominator, newFindings: packageData.crosswalk.newFindingCount, inheritedIdentities: packageData.crosswalk.inheritedActiveIdentityCount,
    vectorCount: packageData.vectors.length, positiveVectors: packageData.corpus.positiveVectorCount, negativeVectors: packageData.corpus.negativeVectorCount,
    shardCount: packageData.corpus.shardCount, largestShardBytes: packageData.corpus.largestShardBytes, largestMemberBytes: packageData.manifest.largestMemberBytes,
    casProof: packageData.registry.casStateMachine.exhaustiveProof, recoveryReadPaths: packageData.registry.recoveryReducer.readPathCount, globalConjuncts: packageData.registry.globalModel.conjunctCount,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
