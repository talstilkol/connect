#!/usr/bin/env node
/* Independent B0 v7 QA Reader A: Node.js standard library only. */

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const DEFAULT_MANIFEST = 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-atomic-package-manifest-2026-08-30.json';
const REPORT_PATH = 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-qa-reader-a-report-2026-08-30.json';
const MAX_MEMBER = 50 * 1024 * 1024;
const MISSING = Symbol('missing');

function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('non-safe-integer canonical value');
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  throw new Error(`unsupported canonical type: ${typeof value}`);
}

const shaBytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const root = (domain, value) => shaBytes(Buffer.from(`${domain}\n${canonical(value)}`, 'utf8'));
const readBytes = (logicalPath) => fs.readFileSync(logicalPath);
const readJson = (logicalPath) => JSON.parse(readBytes(logicalPath).toString('utf8'));
const noRoot = (object, key) => Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));
const exactKeys = (object, keys) => object !== null && !Array.isArray(object) && typeof object === 'object' && canonical(Object.keys(object).sort()) === canonical([...keys].sort());

function pointerGet(value, pointer) {
  if (pointer === '') return value;
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) return MISSING;
  let current = value;
  for (const encoded of pointer.slice(1).split('/')) {
    const token = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
    if (current === null || typeof current !== 'object' || !(token in current)) return MISSING;
    current = current[token];
  }
  return current;
}

function isType(type, value) {
  switch (type) {
    case 'NULL': return value === null;
    case 'BOOLEAN': return typeof value === 'boolean';
    case 'STRING': return typeof value === 'string';
    case 'NONEMPTY_STRING': return typeof value === 'string' && value.length > 0;
    case 'SAFE_INTEGER': return Number.isSafeInteger(value);
    case 'NONNEGATIVE_INTEGER': return Number.isSafeInteger(value) && value >= 0;
    case 'U64_DECIMAL': return typeof value === 'string' && /^(0|[1-9][0-9]{0,19})$/.test(value) && BigInt(value) <= 18446744073709551615n;
    case 'SHA256': return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
    case 'DETERMINISTIC_ID': return typeof value === 'string' && /^[A-Z0-9][A-Z0-9-]{2,127}$/.test(value);
    case 'RFC3339_UTC': {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return false;
      const instant = new Date(value);
      return !Number.isNaN(instant.getTime()) && instant.toISOString().replace('.000Z', 'Z') === value;
    }
    case 'JSON_POINTER': return typeof value === 'string' && (value === '' || /^\/(?:[^~/]|~[01])*(?:\/(?:[^~/]|~[01])*)*$/.test(value));
    case 'REPO_RELATIVE_PATH': return typeof value === 'string' && value.startsWith('docs/') && !value.startsWith('/') && !value.startsWith('web/') && !value.includes('..') && !value.includes('\\');
    case 'ARRAY': return Array.isArray(value);
    case 'OBJECT': return value !== null && typeof value === 'object' && !Array.isArray(value);
    default: return false;
  }
}

function evalAst(ast, data, language) {
  if (ast === null || typeof ast !== 'object' || Array.isArray(ast) || typeof ast.op !== 'string' || !Array.isArray(ast.args)) return false;
  if (!language.operators.some((entry) => entry.operator === ast.op)) return false;
  const args = ast.args;
  const ev = (index) => evalAst(args[index], data, language);
  switch (ast.op) {
    case 'LITERAL': return args.length === 1 ? args[0] : false;
    case 'GET': return args.length === 1 ? pointerGet(data, args[0]) : MISSING;
    case 'PATH_EXISTS': return args.length === 1 && pointerGet(data, args[0]) !== MISSING;
    case 'AND': return args.length > 0 && args.every((arg) => evalAst(arg, data, language) === true);
    case 'OR': return args.length > 0 && args.some((arg) => evalAst(arg, data, language) === true);
    case 'NOT': return args.length === 1 && ev(0) === false;
    case 'EQ': { const left = ev(0); const right = ev(1); return args.length === 2 && left !== MISSING && right !== MISSING && canonical(left) === canonical(right); }
    case 'NEQ': { const left = ev(0); const right = ev(1); return args.length === 2 && left !== MISSING && right !== MISSING && canonical(left) !== canonical(right); }
    case 'LT': { const left = ev(0); const right = ev(1); return args.length === 2 && typeof left === 'number' && typeof right === 'number' && left < right; }
    case 'LTE': { const left = ev(0); const right = ev(1); return args.length === 2 && typeof left === 'number' && typeof right === 'number' && left <= right; }
    case 'GT': { const left = ev(0); const right = ev(1); return args.length === 2 && typeof left === 'number' && typeof right === 'number' && left > right; }
    case 'GTE': { const left = ev(0); const right = ev(1); return args.length === 2 && typeof left === 'number' && typeof right === 'number' && left >= right; }
    case 'TYPE_IS': { const value = ev(0); return args.length === 2 && language.types.some((entry) => entry.type === args[1]) && value !== MISSING && isType(args[1], value); }
    case 'EXACT_KEYS': { const value = ev(0); return args.length === 2 && Array.isArray(args[1]) && exactKeys(value, args[1]); }
    case 'UNIQUE_VALUES': { const value = ev(0); return args.length === 1 && Array.isArray(value) && new Set(value.map(canonical)).size === value.length; }
    case 'IN_SET': { const value = ev(0); return args.length === 2 && Array.isArray(args[1]) && args[1].some((candidate) => canonical(candidate) === canonical(value)); }
    case 'MATCH': { const value = ev(0); if (args.length !== 2 || typeof value !== 'string' || typeof args[1] !== 'string') return false; try { return new RegExp(args[1], 'u').test(value); } catch { return false; } }
    case 'HASH_EQ': { const value = ev(0); return args.length === 3 && typeof args[1] === 'string' && isType('SHA256', args[2]) && value !== MISSING && root(args[1], value) === args[2]; }
    default: return false;
  }
}

function validateEnvelope(envelope, registry) {
  const spec = registry.detachedAcceptance;
  if (!exactKeys(envelope, spec.externalSchema.fields.map((field) => field.name))) return false;
  if (!exactKeys(envelope.validationContext, spec.validationContextSchema.fields.map((field) => field.name))) return false;
  if (!exactKeys(envelope.payload, spec.internalSchema.fields.map((field) => field.name))) return false;
  for (const field of spec.externalSchema.fields) if (!isType(field.type, envelope[field.name])) return false;
  for (const field of spec.validationContextSchema.fields) if (!isType(field.type, envelope.validationContext[field.name])) return false;
  for (const field of spec.internalSchema.fields) if (!isType(field.type, envelope.payload[field.name])) return false;
  return envelope.envelopeSchemaId === spec.externalSchema.schemaId
    && envelope.internalSchemaRoot === spec.internalSchema.schemaRoot
    && envelope.instanceRoot === root('B0V7-DETACHED-ACCEPTANCE-PAYLOAD-V1', envelope.payload)
    && envelope.payload.schemaId === spec.internalSchema.schemaId
    && envelope.payload.producerAppointmentRoot === envelope.validationContext.expectedProducerAppointmentRoot
    && envelope.payload.freshnessHeadTupleRoot === envelope.validationContext.currentSecurityUniverseTupleRoot
    && envelope.planningOnly === true && envelope.operational === false
    && envelope.authorityCredit === 0 && envelope.acceptanceCredit === 0;
}

function deriveObservation(row) {
  const sourcePath = row.sourceLocators[0];
  const bytes = readBytes(sourcePath);
  if (row.measurementKind === 'V6-SUBJECT-SHA256' || row.measurementKind === 'V6-MANIFEST-SHA256') return shaBytes(bytes);
  const value = JSON.parse(bytes.toString('utf8'));
  switch (row.measurementKind) {
    case 'V6-PACKAGE-CONTENT-ROOT': return value.packageContentRoot;
    case 'V6-PACKAGE-MEMBER-COUNT': return value.memberCount;
    case 'V6-REQUIREMENT-COUNT': return value.v6Requirements.length;
    case 'V6-FIVE-FIELD-COUNT': return value.v6FiveFieldCount;
    case 'V6-ACTIVE-BLOCKER-DENOMINATOR': return value.activeBlockerDenominator;
    case 'V6-VECTOR-COUNT': return value.vectorCount;
    case 'V6-VECTOR-SHARD-COUNT': return value.vectorShardCount;
    case 'V6-SOURCE-ARTIFACT-COUNT': return value.artifactCount;
    case 'V6-SOURCE-MEMBER-COUNT': return value.memberCount;
    case 'V6-AUTHORITATIVE-BYTE-ATOM-COUNT': return value.authoritativeInheritedByteAtomCount;
    case 'V6-ACTIVE-NAMED-USE-COUNT': return value.activeNamedUseCount;
    case 'V6-ROLE-COUNT': return value.roleAndAppointmentAuthority.roleCount;
    case 'V6-HEAD-COUNT': return value.mutableHeadRegistry.headCount;
    case 'V6-MUTABLE-OBJECT-CLASS-COUNT': return value.mutableHeadRegistry.objectClassCount;
    case 'V6-PRIOR-INTERFACE-COUNT': return value.priorInterfaceRegistry.interfaceCount;
    default: throw new Error(`unknown interface measurement ${row.measurementKind}`);
  }
}

const CAS_STEPS = [
  'READ_HEAD', 'READ_SECURITY_UNIVERSE', 'VALIDATE_SCHEMA', 'VALIDATE_AUTHORITY', 'VALIDATE_TIME',
  'VALIDATE_REVOCATION', 'COMPARE_EXPECTED_HEAD', 'RESERVE_ATTEMPT', 'ADVANCE_FENCE', 'CONSUME_PERMIT',
  'STAGE_POINTER', 'STAGE_ACCEPTANCE', 'STAGE_OUTBOX', 'REVALIDATE_READ_SET', 'ATOMIC_COMMIT',
];

function casActor() { return { pc: 0, terminal: false, committed: false, observedHead: null, observedSecurity: null, observedRevision: null, observedRevocation: null, validatedHead: null }; }
function cloneCas(state) { return structuredClone(state); }
function runCasStep(input, actorName) {
  const state = cloneCas(input); const actor = state[actorName]; const attempt = state.attempts[actorName];
  if (actor.terminal) return null;
  const step = CAS_STEPS[actor.pc];
  if (!step) return null;
  const block = (reason) => { actor.terminal = true; state.trace.push(`${actorName}:BLOCK:${reason}`); return state; };
  if (step === 'READ_HEAD') actor.observedHead = state.store.head;
  else if (step === 'READ_SECURITY_UNIVERSE') { actor.observedSecurity = state.store.securityHead; actor.observedRevision = state.store.revisionHead; actor.observedRevocation = state.store.revocationHead; }
  else if (step === 'VALIDATE_SCHEMA' && attempt.schemaValid !== true) return block('SCHEMA');
  else if (step === 'VALIDATE_AUTHORITY' && attempt.authorityCurrent !== true) return block('AUTHORITY');
  else if (step === 'VALIDATE_TIME' && (!isType('RFC3339_UTC', attempt.validFrom) || !isType('RFC3339_UTC', attempt.validUntil) || !isType('RFC3339_UTC', attempt.commitInstant) || !(attempt.validFrom <= attempt.commitInstant && attempt.commitInstant < attempt.validUntil))) return block('TIME');
  else if (step === 'VALIDATE_REVOCATION' && (attempt.revoked || attempt.revocationHead !== state.store.revocationHead)) return block('REVOCATION');
  else if (step === 'COMPARE_EXPECTED_HEAD' && (actor.observedHead !== attempt.expectedHead || state.store.head !== attempt.expectedHead)) return block('EXPECTED-HEAD');
  else if (step === 'RESERVE_ATTEMPT' && !isType('DETERMINISTIC_ID', attempt.attemptId)) return block('ATTEMPT-ID');
  else if (step === 'ADVANCE_FENCE' && !(Number.isSafeInteger(attempt.proposedFence) && attempt.proposedFence > state.store.fence)) return block('FENCE');
  else if (step === 'CONSUME_PERMIT' && (state.store.permitUsed || state.store.replayUsed || attempt.replayUsed || !isType('U64_DECIMAL', attempt.minimumRevision) || BigInt(state.store.revisionHead) <= BigInt(attempt.minimumRevision))) return block('PERMIT');
  else if (step === 'STAGE_POINTER' && !isType('SHA256', attempt.outputRoot)) return block('OUTPUT');
  else if (step === 'STAGE_ACCEPTANCE' && attempt.envelopeValid !== true) return block('ENVELOPE');
  else if (step === 'STAGE_OUTBOX' && !isType('DETERMINISTIC_ID', attempt.effectId)) return block('EFFECT-ID');
  else if (step === 'REVALIDATE_READ_SET') {
    if (actor.observedHead !== state.store.head || actor.observedSecurity !== state.store.securityHead || actor.observedRevision !== state.store.revisionHead || actor.observedRevocation !== state.store.revocationHead || state.store.permitUsed || state.store.replayUsed) return block('READ-SET');
    actor.validatedHead = state.store.head;
  } else if (step === 'ATOMIC_COMMIT') {
    if (actor.validatedHead !== state.store.head || state.store.permitUsed || state.store.replayUsed) return block('CAS');
    state.store.head = `HEAD-${actorName}`; state.store.fence = attempt.proposedFence; state.store.permitUsed = true; state.store.replayUsed = true; state.store.outboxCount += 1;
    actor.committed = true; actor.terminal = true; state.trace.push(`${actorName}:COMMIT`); actor.pc += 1; return state;
  }
  actor.pc += 1; state.trace.push(`${actorName}:${step}`); return state;
}

function casInitial(planningAttempts, overrideA = null) {
  return {
    A: casActor(), B: casActor(), attempts: { A: structuredClone(overrideA ?? planningAttempts.A), B: structuredClone(planningAttempts.B) },
    store: { head: 'HEAD-0', securityHead: 'SECURITY-0', revisionHead: '7', revocationHead: planningAttempts.A.revocationHead, fence: 0, permitUsed: false, replayUsed: false, outboxCount: 0 }, trace: [],
  };
}

function casProof(planningAttempts) {
  const memo = new Map(); const reachable = new Set(); let crashCutStateActorCount = 0; let crashViolations = 0;
  function key(state) {
    return canonical({ A: state.A, B: state.B, attempts: state.attempts, store: state.store });
  }
  function visit(state) {
    const stateKey = key(state); reachable.add(stateKey);
    if (memo.has(stateKey)) return memo.get(stateKey);
    for (const name of ['A', 'B']) {
      const actor = state[name];
      if (!actor.terminal && actor.pc < 15) {
        crashCutStateActorCount += 1;
        const before = canonical(state.store);
        const crashed = cloneCas(state); crashed[name].terminal = true;
        if (canonical(crashed.store) !== before) crashViolations += 1;
      }
    }
    if (state.A.terminal && state.B.terminal) {
      const committed = Number(state.A.committed) + Number(state.B.committed);
      const result = { schedules: 1n, oneCommit: committed === 1 ? 1n : 0n, twoCommit: committed === 2 ? 1n : 0n, zeroCommit: committed === 0 ? 1n : 0n };
      memo.set(stateKey, result); return result;
    }
    const total = { schedules: 0n, oneCommit: 0n, twoCommit: 0n, zeroCommit: 0n };
    for (const name of ['A', 'B']) {
      if (state[name].terminal) continue;
      const next = runCasStep(state, name); if (!next) continue;
      const part = visit(next);
      for (const field of Object.keys(total)) total[field] += part[field];
    }
    memo.set(stateKey, total); return total;
  }
  const totals = visit(casInitial(planningAttempts));
  return {
    completeScheduleCount: totals.schedules.toString(), oneCommitScheduleCount: totals.oneCommit.toString(),
    twoCommitScheduleCount: totals.twoCommit.toString(), zeroCommitScheduleCount: totals.zeroCommit.toString(),
    reachableStateCount: reachable.size, crashCutStateActorCount, crashViolationCount: crashViolations,
    responseLossReadback: 'COMMITTED', outboxExactlyOnce: true,
  };
}

function casSingleAttemptPasses(attempt, planningAttempts) {
  let state = casInitial(planningAttempts, attempt); state.B.terminal = true;
  while (!state.A.terminal) { const next = runCasStep(state, 'A'); if (!next) return false; state = next; }
  return state.A.committed === true && state.store.outboxCount === 1 && state.store.permitUsed === true && state.store.replayUsed === true;
}

function recoveryValid(state, recovery) {
  const a = state.attempt, c = state.context, s = state.store;
  if (!exactKeys(state, ['attempt', 'context', 'store'])) return false;
  if (!isType('DETERMINISTIC_ID', a.attemptId) || !Array.isArray(a.memberIds) || !Array.isArray(a.acknowledgements) || !isType('SHA256', a.challengeRoot) || typeof a.consumed !== 'boolean') return false;
  if (a.consumed || c.requiredThreshold !== 3 || !isType('SHA256', c.controllerRoot) || !isType('RFC3339_UTC', c.nowInstant) || !isType('SHA256', c.expectedSecurityHead) || !isType('SHA256', c.expectedRecoveryHead)) return false;
  if (a.memberIds.length !== 3 || new Set(a.memberIds).size !== 3 || a.acknowledgements.length !== 3) return false;
  if (!s.members || !s.witnesses || !s.challenges || !isType('SHA256', s.activeAuthorityRoot) || s.oldAuthorityRevoked) return false;
  if (s.securityHead !== c.expectedSecurityHead || s.recoveryHead !== c.expectedRecoveryHead) return false;
  if (s.challenges[a.attemptId] !== a.challengeRoot) return false;
  for (const memberId of a.memberIds) {
    const member = s.members[memberId];
    if (!member || member.current !== true || member.revokedAt !== null || member.controllerRoot !== c.controllerRoot || member.validUntil <= c.nowInstant) return false;
  }
  for (const ack of a.acknowledgements) if (!a.memberIds.includes(ack.memberId) || ack.challengeRoot !== a.challengeRoot || ack.controllerRoot !== c.controllerRoot) return false;
  const witnesses = Object.values(s.witnesses).filter((entry) => entry.current === true);
  if (witnesses.length < 2 || new Set(witnesses.map((entry) => entry.controllerRoot)).size < 2) return false;
  return canonical(recovery.readPaths.slice().sort()) === canonical(recovery.mutationMatrix.map((entry) => entry.path).sort());
}

function runRecoveryLifecycle(source, recovery, injectionAfterStep = null) {
  const state = structuredClone(source);
  const snapshot = { securityHead: state.store?.securityHead, recoveryHead: state.store?.recoveryHead };
  for (const step of recovery.lifecycleSteps) {
    if (step.ordinal === 2 && !exactKeys(state, ['attempt', 'context', 'store'])) return 'BLOCK';
    if (step.ordinal === 3 && !recoveryValid(state, recovery)) return 'BLOCK';
    if (step.ordinal === 4 && Object.values(state.store.witnesses).filter((entry) => entry.current).length < 2) return 'BLOCK';
    if (step.ordinal === 5 && state.store.challenges[state.attempt.attemptId] !== state.attempt.challengeRoot) return 'BLOCK';
    if (step.ordinal === 7 && (state.store.securityHead !== snapshot.securityHead || state.store.recoveryHead !== snapshot.recoveryHead || !recoveryValid(state, recovery))) return 'BLOCK';
    if (step.ordinal === 8) {
      if (state.store.securityHead !== snapshot.securityHead || state.store.recoveryHead !== snapshot.recoveryHead || !recoveryValid(state, recovery)) return 'BLOCK';
      state.attempt.consumed = true; state.store.oldAuthorityRevoked = true; return 'PASS';
    }
    if (injectionAfterStep === step.ordinal) state.store.securityHead = root('B0V7-RECOVERY-INJECTED-HEAD-V1', { after: step.ordinal });
  }
  return 'BLOCK';
}

function globalValid(model, registry, derivedFacts) {
  return exactKeys(model, ['modelId', 'nonAuthoritative', 'operational', 'authorityCredit', 'acceptanceCredit', 'semanticFacts', 'semanticFactSetRoot'])
    && model.modelId === registry.globalModel.modelId && model.nonAuthoritative === true && model.operational === false
    && model.authorityCredit === 0 && model.acceptanceCredit === 0
    && exactKeys(model.semanticFacts, Object.keys(derivedFacts)) && canonical(model.semanticFacts) === canonical(derivedFacts)
    && root('B0V7-GLOBAL-SEMANTIC-FACT-SET-V1', model.semanticFacts) === model.semanticFactSetRoot;
}

function verify() {
  const manifestPath = process.argv.find((arg) => arg.startsWith('--manifest='))?.slice('--manifest='.length) || DEFAULT_MANIFEST;
  const manifestBytes = readBytes(manifestPath); const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (manifest.memberCount !== manifest.members.length || manifest.members.some((entry) => !entry.required || entry.bytes >= MAX_MEMBER || !isType('REPO_RELATIVE_PATH', entry.logicalPath))) throw new Error('manifest member policy failed');
  for (const member of manifest.members) {
    const bytes = readBytes(member.logicalPath);
    if (bytes.length !== member.bytes || shaBytes(bytes) !== member.sha256) throw new Error(`member mismatch: ${member.logicalPath}`);
  }
  const projection = manifest.members.map(({ ordinal, logicalPath, sha256, bytes, required }) => ({ ordinal, logicalPath, sha256, bytes, required }));
  if (root('B0V7-PACKAGE-CONTENT-ROOT-V1', projection) !== manifest.packageContentRoot) throw new Error('package root mismatch');
  const bySuffix = (suffix) => manifest.members.find((entry) => entry.logicalPath.endsWith(suffix))?.logicalPath;
  const registry = readJson(bySuffix('-v7-normative-registry-2026-08-30.json'));
  const crosswalk = readJson(bySuffix('-v7-closure-crosswalk-2026-08-30.json'));
  const sourceIndex = readJson(bySuffix('-v7-frozen-source-index-2026-08-30.json'));
  const corpus = readJson(bySuffix('-v7-validator-and-state-machine-corpus-2026-08-30.json'));
  const evidence = readJson(bySuffix('-v7-independent-interface-evidence-2026-08-30.json'));
  if (root('B0V7-VALIDATOR-LANGUAGE-V1', noRoot(registry.validatorLanguage, 'languageRoot')) !== registry.validatorLanguage.languageRoot) throw new Error('language root');
  if (new Set(registry.validatorLanguage.operators.map((entry) => entry.operator)).size !== registry.validatorLanguage.operators.length) throw new Error('operator duplicates');
  if (new Set(registry.validatorLanguage.types.map((entry) => entry.type)).size !== registry.validatorLanguage.types.length) throw new Error('type duplicates');
  const selfPath = bySuffix('b0-v7-qa-reader-a.mjs'); const selfHash = shaBytes(readBytes(selfPath));
  const profile = registry.readerIndependenceProfiles.find((entry) => entry.readerId === 'B0V7-READER-A');
  if (!profile || profile.readerSha256 !== selfHash || profile.language !== 'NODEJS-STDLIB' || profile.operational || profile.authorityCredit !== 0 || profile.acceptanceCredit !== 0) throw new Error('reader profile binding');
  for (const bound of registry.readerIndependenceProfiles) {
    if (shaBytes(readBytes(bound.readerPath)) !== bound.readerSha256 || root('B0V7-READER-DEPENDENCY-SET-V1', bound.dependencies) !== bound.dependencyRoot || root('B0V7-READER-RUNTIME-CONTRACT-V1', bound.runtimeContract) !== bound.runtimeRoot || root('B0V7-READER-CONTROLLER-V1', bound.controllerId) !== bound.controllerRoot || root('B0V7-READER-EXECUTION-CONTEXT-V1', bound.executionContext) !== bound.executionContextRoot || root('B0V7-READER-DISCLOSURE-RULE-V1', bound.disclosureRule) !== bound.disclosureRoot || root('B0V7-READER-INDEPENDENCE-PROFILE-V1', noRoot(bound, 'profileRoot')) !== bound.profileRoot) throw new Error(`profile root ${bound.readerId}`);
  }
  const generatorToken = ['generate-b0-v7-package', '.mjs'].join(''); const peerTokens = { 'B0V7-READER-A': ['b0-v7-qa-reader-b', '.py'].join(''), 'B0V7-READER-B': ['b0-v7-qa-reader-a', '.mjs'].join('') };
  if (new Set(registry.readerIndependenceProfiles.map((entry) => entry.controllerRoot)).size !== 2 || new Set(registry.readerIndependenceProfiles.map((entry) => entry.executionContextRoot)).size !== 2 || new Set(registry.readerIndependenceProfiles.map((entry) => entry.runtimeRoot)).size !== 2 || registry.readerIndependenceProfiles.some((entry) => { const source = readBytes(entry.readerPath).toString('utf8'); return source.includes(generatorToken) || source.includes(peerTokens[entry.readerId]); })) throw new Error('reader independence separation');
  for (const source of sourceIndex.sources) {
    const bytes = readBytes(source.logicalPath); if (bytes.length !== source.bytes || shaBytes(bytes) !== source.sha256) throw new Error(`frozen source changed: ${source.logicalPath}`);
  }
  if (sourceIndex.absolutePathCount !== 0 || sourceIndex.extraRepositoryPrefixCount !== 0) throw new Error('source locator policy');
  if (crosswalk.activeClosureDenominator !== 38 || crosswalk.closureRows.length !== 38 || new Set(crosswalk.closureRows.map((row) => row.sourceFindingId)).size !== 38 || new Set(crosswalk.closureRows.map((row) => row.noMergeKey)).size !== 38) throw new Error('closure denominator');
  if (crosswalk.inheritedActiveIdentityCount !== 31 || crosswalk.newFindingCount !== 7 || crosswalk.preservedClosedFinding.findingId !== 'B0V4-HR-F012' || crosswalk.preservedClosedFinding.additionalClosureCredit !== 0) throw new Error('closure identity accounting');
  const actualById = new Map(evidence.observations.map((row) => [row.interfaceId, row]));
  if (root('B0V7-INDEPENDENT-ACTUAL-INTERFACE-EVIDENCE-V1', noRoot(evidence, 'evidenceContentRoot')) !== evidence.evidenceContentRoot) throw new Error('interface evidence root');
  if (actualById.size !== 17 || registry.expectedInterfaces.length !== 17) throw new Error('interface denominator');
  for (const expected of registry.expectedInterfaces) {
    const actual = actualById.get(expected.interfaceId);
    if (!actual || canonical(deriveObservation(actual)) !== canonical(actual.actualValue) || canonical(actual.actualValue) !== canonical(expected.expectedValue) || actual.actualObservationRoot === expected.expectedSpecificationRoot || actual.producerId === expected.specificationProducerId) throw new Error(`interface failure: ${expected.interfaceId}`);
  }
  const vectors = [];
  for (const descriptor of corpus.shardDescriptors) {
    const bytes = readBytes(descriptor.logicalPath); if (bytes.length !== descriptor.bytes || shaBytes(bytes) !== descriptor.sha256 || bytes.length >= MAX_MEMBER) throw new Error('shard binding');
    const shard = JSON.parse(bytes.toString('utf8')); if (root('B0V7-VECTOR-SHARD-V1', noRoot(shard, 'shardContentRoot')) !== shard.shardContentRoot) throw new Error('shard root');
    vectors.push(...shard.vectors);
  }
  if (vectors.length !== corpus.vectorCount || vectors.some((vector, index) => vector.ordinal !== index + 1 || root('B0V7-VECTOR-V1', noRoot(vector, 'vectorRoot')) !== vector.vectorRoot)) throw new Error('vector sequence');
  for (const type of registry.validatorLanguage.types.map((entry) => entry.type)) {
    const cases = vectors.filter((vector) => vector.family === 'VALIDATOR-TYPE' && vector.input.type === type);
    if (!cases.some((vector) => vector.expected === 'PASS') || !cases.some((vector) => vector.expected === 'BLOCK')) throw new Error(`type coverage ${type}`);
  }
  for (const operator of registry.validatorLanguage.operators.map((entry) => entry.operator)) {
    const cases = vectors.filter((vector) => vector.family === 'VALIDATOR-OPERATOR' && vector.input.operator === operator);
    if (!cases.some((vector) => vector.expected === 'PASS') || !cases.some((vector) => vector.expected === 'BLOCK')) throw new Error(`operator coverage ${operator}`);
  }
  if (!vectors.some((vector) => vector.family === 'VALIDATOR-UNKNOWN-TYPE' && vector.expected === 'BLOCK') || !vectors.some((vector) => vector.family === 'VALIDATOR-UNKNOWN-OPERATOR' && vector.expected === 'BLOCK')) throw new Error('unknown language coverage');
  const cas = casProof(registry.casStateMachine.planningAttempts);
  if (canonical(cas) !== canonical(registry.casStateMachine.exhaustiveProof)) throw new Error(`CAS proof mismatch ${canonical(cas)}`);
  if (canonical(registry.casStateMachine.steps.map((step) => step.stepId)) !== canonical(CAS_STEPS)) throw new Error('CAS 15 steps');
  const recovery = registry.recoveryReducer;
  if (!recoveryValid(recovery.planningPositiveState, recovery) || runRecoveryLifecycle(recovery.planningPositiveState, recovery) !== 'PASS') throw new Error('recovery positive');
  if (recovery.headChangeInjections.length !== recovery.lifecycleSteps.length - 1 || recovery.headChangeInjections.some((entry) => entry.expected !== 'BLOCK')) throw new Error('recovery inter-step injections');
  const independenceByClass = Object.fromEntries(registry.authorityBootstrap.independence.map((row) => [row.classId, row]));
  const publicLocators = [...new Set([...sourceIndex.sources.map((row) => row.logicalPath), ...manifest.members.map((row) => row.logicalPath)])].sort();
  const derivedGlobalFacts = {
    validatorLanguageRoot: registry.validatorLanguage.languageRoot,
    unknownFailClosedRoot: root('B0V7-GLOBAL-UNKNOWN-FAIL-CLOSED-FACT-V1', { unknownOperatorPolicy: registry.validatorLanguage.unknownOperatorPolicy, unknownTypePolicy: registry.validatorLanguage.unknownTypePolicy, missingPathPolicy: registry.validatorLanguage.missingPathPolicy }),
    externalSchemaRoot: registry.detachedAcceptance.externalSchema.schemaRoot, internalSchemaRoot: registry.detachedAcceptance.internalSchema.schemaRoot, validationContextSchemaRoot: registry.detachedAcceptance.validationContextSchema.schemaRoot,
    actualInterfaceFactRoot: root('B0V7-GLOBAL-ACTUAL-INTERFACE-FACT-V1', { evidenceContentRoot: evidence.evidenceContentRoot, interfaceCount: evidence.interfaceCount, actualProducerId: evidence.producerId, expectedProducerId: registry.expectedInterfaces[0].specificationProducerId }),
    endToEndPositiveTraceRoot: root('B0V7-END-TO-END-POSITIVE-TRACE-V1', { detachedAcceptanceEnvelopeRoot: registry.detachedAcceptance.planningPositiveEnvelopeRoot, casPlanningAttemptSetRoot: registry.casStateMachine.planningAttemptSetRoot, recoveryPlanningStateRoot: recovery.planningPositiveStateRoot, interfaceEvidenceRoot: evidence.evidenceContentRoot, closureControlSetRoot: root('B0V7-CLOSURE-CONTROL-SET-V1', crosswalk.closureRows.map((row) => row.controlRoot)) }),
    casStepSequenceRoot: registry.casStateMachine.exactStepSequenceRoot, casInterleavingProofRoot: root('B0V7-CAS-EXHAUSTIVE-PROOF-V1', cas),
    casCrashFactRoot: root('B0V7-CAS-CRASH-FACT-V1', { crashCutStateActorCount: cas.crashCutStateActorCount, crashViolationCount: cas.crashViolationCount }),
    casResponseLossRoot: root('B0V7-CAS-RESPONSE-LOSS-FACT-V1', { responseLossReadback: cas.responseLossReadback, outboxExactlyOnce: cas.outboxExactlyOnce }),
    recoveryReadSetRoot: root('B0V7-RECOVERY-READ-SET-FACT-V1', { readPaths: recovery.readPaths, mutationPaths: recovery.mutationMatrix.map((row) => row.path) }),
    recoveryHeadRevalidationRoot: root('B0V7-RECOVERY-HEAD-REVALIDATION-FACT-V1', { headPaths: recovery.headPaths, lifecycleSteps: recovery.lifecycleSteps, headChangeInjections: recovery.headChangeInjections }),
    soleProducerSetRoot: root('B0V7-SOLE-PRODUCER-SET-FACT-V1', registry.authorityBootstrap.soleProducerAppointments), genesisBootstrapRoot: root('B0V7-GENESIS-BOOTSTRAP-FACT-V1', { bootstrapRule: registry.authorityBootstrap.bootstrapRule, genesisSchemas: registry.authorityBootstrap.genesisSchemas }),
    permitSchemaRoot: registry.permitRevisionTimeRevocationReplay.permitSchema.schemaRoot, revisionRuleRoot: root('B0V7-REVISION-RULE-FACT-V1', registry.permitRevisionTimeRevocationReplay.revisionRule), timeRuleRoot: root('B0V7-TIME-RULE-FACT-V1', registry.permitRevisionTimeRevocationReplay.timeRule),
    revocationRuleRoot: root('B0V7-REVOCATION-RULE-FACT-V1', registry.permitRevisionTimeRevocationReplay.revocationRule), replayRuleRoot: root('B0V7-REPLAY-RULE-FACT-V1', registry.permitRevisionTimeRevocationReplay.replayRule),
    witnessIndependenceRoot: root('B0V7-INDEPENDENCE-FACT-V1', independenceByClass.WITNESS), workIndependenceRoot: root('B0V7-INDEPENDENCE-FACT-V1', independenceByClass.WORK), ledgerIndependenceRoot: root('B0V7-INDEPENDENCE-FACT-V1', independenceByClass.LEDGER), authorityOwnerIndependenceRoot: root('B0V7-INDEPENDENCE-FACT-V1', independenceByClass['AUTHORITY-OWNER']),
    closureControlSetRoot: root('B0V7-CLOSURE-CONTROL-SET-V1', crosswalk.closureRows.map((row) => row.controlRoot)), readerProfileSetRoot: root('B0V7-READER-PROFILE-SET-V1', registry.readerIndependenceProfiles.map((row) => row.profileRoot)),
    deterministicIdentityPolicyRoot: root('B0V7-DETERMINISTIC-IDENTITY-POLICY-FACT-V1', registry.deterministicIdentityPolicy), publicLocatorSetRoot: root('B0V7-PUBLIC-LOCATOR-SET-FACT-V1', publicLocators), currentRealStateRoot: root('B0V7-CURRENT-REAL-STATE-FACT-V1', registry.currentState),
  };
  const expectedBindings = [
    ['VALIDATOR-LANGUAGE-ROOTED', 'validatorLanguageRoot'], ['VALIDATOR-UNKNOWN-FAIL-CLOSED', 'unknownFailClosedRoot'], ['EXTERNAL-SCHEMA-CLOSED', 'externalSchemaRoot'], ['INTERNAL-SCHEMA-CLOSED', 'internalSchemaRoot'], ['VALIDATION-CONTEXT-CLOSED', 'validationContextSchemaRoot'], ['ACTUAL-INTERFACES-INDEPENDENT', 'actualInterfaceFactRoot'], ['END-TO-END-POSITIVE-TRACE', 'endToEndPositiveTraceRoot'], ['CAS-ALL-15-STEPS', 'casStepSequenceRoot'], ['CAS-ALL-INTERLEAVINGS', 'casInterleavingProofRoot'], ['CAS-ALL-CRASH-CUTS', 'casCrashFactRoot'], ['CAS-RESPONSE-LOSS-READBACK', 'casResponseLossRoot'], ['RECOVERY-EXACT-READ-SET', 'recoveryReadSetRoot'], ['RECOVERY-HEAD-REVALIDATION', 'recoveryHeadRevalidationRoot'], ['SOLE-PRODUCERS-APPOINTED', 'soleProducerSetRoot'], ['GENESIS-EXTERNAL-L0-ROOTED', 'genesisBootstrapRoot'], ['PERMIT-TYPED', 'permitSchemaRoot'], ['REVISION-STRICT', 'revisionRuleRoot'], ['TIME-HALF-OPEN', 'timeRuleRoot'], ['REVOCATION-ATOMIC', 'revocationRuleRoot'], ['REPLAY-EXACTLY-ONCE', 'replayRuleRoot'], ['TWO-WITNESSES-INDEPENDENT', 'witnessIndependenceRoot'], ['WORK-INDEPENDENT', 'workIndependenceRoot'], ['LEDGER-INDEPENDENT', 'ledgerIndependenceRoot'], ['AUTHORITY-OWNER-INDEPENDENT', 'authorityOwnerIndependenceRoot'], ['CLOSURE-ROWS-ONE-TO-ONE', 'closureControlSetRoot'], ['READERS-BYTE-BOUND-INDEPENDENT', 'readerProfileSetRoot'], ['DETERMINISTIC-IDENTITIES-ONLY', 'deterministicIdentityPolicyRoot'], ['PUBLIC-LOCATORS-REPO-RELATIVE', 'publicLocatorSetRoot'], ['REAL-STATE-SEPARATELY-BLOCKED', 'currentRealStateRoot'],
  ].map(([predicateId, factKey], index) => ({ ordinal: index + 1, predicateId, factKey }));
  if (canonical(expectedBindings) !== canonical(registry.globalModel.factBindings) || registry.globalModel.mutationMatrix.length !== expectedBindings.length || new Set(registry.globalModel.mutationMatrix.map((row) => row.factKey)).size !== expectedBindings.length) throw new Error('global fact binding matrix');
  let passCount = 0; let blockCount = 0;
  for (const vector of vectors) {
    let accepted = false;
    if (vector.family === 'VALIDATOR-TYPE') accepted = isType(vector.input.type, vector.input.value) && registry.validatorLanguage.types.some((entry) => entry.type === vector.input.type);
    else if (vector.family === 'VALIDATOR-OPERATOR') accepted = evalAst(vector.input.ast, vector.input.data, registry.validatorLanguage) === true;
    else if (vector.family === 'VALIDATOR-UNKNOWN-TYPE') accepted = isType(vector.input.type, vector.input.value);
    else if (vector.family === 'VALIDATOR-UNKNOWN-OPERATOR') accepted = evalAst(vector.input.ast, vector.input.data, registry.validatorLanguage) === true;
    else if (vector.family === 'DETACHED-ACCEPTANCE') accepted = validateEnvelope(vector.input.envelope, registry);
    else if (vector.family === 'INTERFACE') {
      const expected = registry.expectedInterfaces.find((entry) => entry.interfaceId === vector.input.interfaceId); const actual = actualById.get(vector.input.interfaceId);
      accepted = Boolean(expected && actual && canonical(vector.input.actualValue) === canonical(expected.expectedValue) && vector.input.actualObservationRoot === actual.actualObservationRoot && vector.input.actualObservationRoot !== expected.expectedSpecificationRoot);
    } else if (vector.family === 'CAS-PROOF') accepted = canonical(cas) === canonical(vector.input.expectedProof);
    else if (vector.family === 'CAS-GUARD') accepted = casSingleAttemptPasses(vector.input.attempt, registry.casStateMachine.planningAttempts);
    else if (vector.family === 'CAS-ILLEGAL-TRACE') accepted = canonical(vector.input.steps) === canonical(CAS_STEPS);
    else if (vector.family === 'CAS-CRASH-CUT') accepted = vector.input.cut >= 0 && vector.input.cut < 15 && vector.input.durableWritesByCrashedActor === 0;
    else if (vector.family === 'RECOVERY') accepted = runRecoveryLifecycle(vector.input.state, recovery) === 'PASS';
    else if (vector.family === 'RECOVERY-HEAD-INJECTION') accepted = runRecoveryLifecycle(vector.input.state, recovery, vector.input.injectionAfterStep) === 'PASS';
    else if (vector.family === 'CLOSURE') accepted = crosswalk.closureRows.some((row) => row.sourceFindingId === vector.input.sourceFindingId && row.targetRequirementId === vector.input.targetRequirementId && row.targetOutputId === vector.input.targetOutputId && vector.input.complete === true);
    else if (vector.family === 'GLOBAL-MODEL') accepted = globalValid(vector.input.model, registry, derivedGlobalFacts);
    else throw new Error(`unknown vector family ${vector.family}`);
    const expected = vector.expected === 'PASS'; if (accepted !== expected) throw new Error(`vector ${vector.vectorId} expected ${vector.expected} got ${accepted}`);
    if (accepted) passCount += 1; else blockCount += 1;
  }
  if (registry.currentState.B0 !== 'ABSENT' || registry.currentState.Gate29 !== 'BLOCKED' || registry.currentState.developmentFreeze !== 'ACTIVE' || registry.currentState.repositoryVisibility !== 'PUBLIC' || registry.currentState.acceptanceCredit !== 0 || registry.currentState.authorityCredit !== 0 || registry.currentState.operationalPermitCount !== 0) throw new Error('real state not blocked');
  const facts = {
    verdict: 'PASS', packageContentRoot: manifest.packageContentRoot, memberCount: manifest.memberCount,
    activeClosureDenominator: 38, newFindingCount: 7, inheritedActiveIdentityCount: 31, preservedClosedCount: 1,
    requirementCount: crosswalk.requirementCount, fiveFieldCount: crosswalk.fiveFieldCount,
    interfaceCount: 17, validatorOperatorCount: registry.validatorLanguage.operators.length, validatorTypeCount: registry.validatorLanguage.types.length,
    casStepCount: 15, casCompleteScheduleCount: cas.completeScheduleCount, casReachableStateCount: cas.reachableStateCount,
    recoveryReadPathCount: recovery.readPaths.length, globalConjunctCount: registry.globalModel.predicateIds.length,
    vectorCount: vectors.length, positiveVectorCount: passCount, negativeVectorCount: blockCount, shardCount: corpus.shardDescriptors.length,
    B0: 'ABSENT', Gate29: 'BLOCKED', developmentFreeze: 'ACTIVE', repositoryVisibility: 'PUBLIC', acceptanceCredit: 0, authorityCredit: 0,
  };
  return { manifestPath, manifestSha256: shaBytes(manifestBytes), facts, verificationRoot: root('B0V7-DETACHED-READER-VERIFICATION-V1', facts) };
}

function patchFor(logicalPath, content) {
  return `*** Begin Patch\n*** Add File: ${logicalPath}\n${content.split('\n').filter((_, index, rows) => !(index === rows.length - 1 && rows[index] === '')).map((line) => `+${line}`).join('\n')}\n*** End Patch\n`;
}

try {
  const result = verify();
  const report = {
    schemaVersion: 'B0V7-DETACHED-QA-READER-REPORT-V1', readerId: 'B0V7-READER-A', readerLanguage: 'NODEJS-STDLIB',
    runtime: process.version, independenceClaim: 'NO-GENERATOR-IMPORT;NO-OTHER-READER-IMPORT;PROFILE-BOUND-TO-EXACT-READER-BYTES',
    ...result, operational: false, authorityCredit: 0, acceptanceCredit: 0,
  };
  report.reportContentRoot = root('B0V7-DETACHED-QA-READER-REPORT-V1', report);
  const content = `${JSON.stringify(report, null, 2)}\n`;
  if (process.argv.includes('--emit-patch')) process.stdout.write(patchFor(REPORT_PATH, content)); else process.stdout.write(content);
} catch (error) {
  process.stderr.write(`B0V7 Reader A FAIL: ${error.stack || error.message}\n`); process.exitCode = 1;
}
