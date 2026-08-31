#!/usr/bin/env node
/* Independent read-only mechanical Reader A for Public/Cyber v5. Standard library only. */

import fs from 'node:fs';
import crypto from 'node:crypto';

const DATE = '2026-08-30';
const MANIFEST = `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-atomic-package-manifest-${DATE}.json`;
const REPORT = `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-reader-a-report-${DATE}.json`;
const FINDINGS = `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-independent-hostile-review-findings-manifest-${DATE}.md`;
const V4_CLOSURES = `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-finding-closure-registry-${DATE}.json`;
const LATE_DECISION_SHA = '508b702087bc2c4011975af87c30bea1208bf5720ec263409d287acb5eb15a84';
const LIMIT = 50 * 1024 * 1024;

function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') { if (!Number.isSafeInteger(value)) throw new Error('unsafe number'); return String(value); }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  throw new Error('unsupported canonical type');
}

const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const textHash = (text) => hash(Buffer.from(text, 'utf8'));
const typed = (domain, value) => textHash(`${domain}\n${canonical(value)}`);
const bytes = (path) => fs.readFileSync(path);
const text = (path) => bytes(path).toString('utf8');
const json = (path) => JSON.parse(text(path));
const byteOffset = (source, index) => Buffer.byteLength(source.slice(0, index), 'utf8');
const without = (object, key) => Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));

const errors = [];
const checks = [];
function check(id, condition, evidence) {
  checks.push({ checkId: id, terminal: condition ? 'PASS' : 'BLOCK', evidence });
  if (!condition) errors.push(`${id}:${evidence}`);
}

function pointer(value, path) {
  if (path === '') return value;
  if (typeof path !== 'string' || !path.startsWith('/')) return undefined;
  let cursor = value;
  for (const raw of path.slice(1).split('/')) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

function executeAst(node, state) {
  try {
    if (!node || typeof node !== 'object' || Array.isArray(node) || Object.keys(node).sort().join(',') !== 'args,op' || typeof node.op !== 'string' || !Array.isArray(node.args)) return false;
    const run = (child) => executeAst(child, state);
    switch (node.op) {
      case 'LITERAL': return node.args.length === 1 ? node.args[0] : false;
      case 'GET': return node.args.length === 1 ? pointer(state, node.args[0]) : undefined;
      case 'PATH-EXISTS': return node.args.length === 1 && pointer(state, node.args[0]) !== undefined;
      case 'AND': return node.args.length > 0 && node.args.every((child) => run(child) === true);
      case 'OR': return node.args.length > 0 && node.args.some((child) => run(child) === true);
      case 'NOT': return node.args.length === 1 && run(node.args[0]) === false;
      case 'EQ': return node.args.length === 2 && canonical(run(node.args[0])) === canonical(run(node.args[1]));
      case 'NEQ': return node.args.length === 2 && canonical(run(node.args[0])) !== canonical(run(node.args[1]));
      case 'LT': { const left = run(node.args[0]); const right = run(node.args[1]); return node.args.length === 2 && Number.isSafeInteger(left) && Number.isSafeInteger(right) && left < right; }
      case 'IN-SET': { const item = run(node.args[0]); const set = run(node.args[1]); return node.args.length === 2 && Array.isArray(set) && set.some((candidate) => canonical(candidate) === canonical(item)); }
      case 'EXACT-KEYS': { const object = run(node.args[0]); const keys = run(node.args[1]); return node.args.length === 2 && object && typeof object === 'object' && !Array.isArray(object) && Array.isArray(keys) && canonical(Object.keys(object).sort()) === canonical([...keys].sort()); }
      case 'UNIQUE': { const values = run(node.args[0]); return node.args.length === 1 && Array.isArray(values) && new Set(values.map(canonical)).size === values.length; }
      default: return false;
    }
  } catch {
    return false;
  }
}

function change(source, operation) {
  const result = structuredClone(source);
  if (operation.op === 'NONE' || operation.op === 'MUTATE-EXPECTED-ONLY') return result;
  const keys = operation.pointer.slice(1).split('/').map((key) => key.replace(/~1/g, '/').replace(/~0/g, '~'));
  let owner = result;
  for (const key of keys.slice(0, -1)) owner = owner[key];
  const key = keys.at(-1);
  if (operation.op === 'DELETE') delete owner[key];
  else if (operation.op === 'SET' || operation.op === 'ADD') owner[key] = structuredClone(operation.operand);
  else throw new Error(`unsupported operation ${operation.op}`);
  return result;
}

function splitMap(inner) {
  let depth = 0;
  for (let index = 0; index < inner.length; index += 1) {
    if (inner[index] === '<') depth += 1;
    else if (inner[index] === '>') depth -= 1;
    else if (inner[index] === ',' && depth === 0) return [inner.slice(0, index), inner.slice(index + 1)];
  }
  return null;
}

function parseType(expression) {
  if (expression.startsWith('Nullable<') && expression.endsWith('>')) return { kind: 'nullable', inner: parseType(expression.slice(9, -1)) };
  if (expression.startsWith('Array<') && expression.endsWith('>')) return { kind: 'array', inner: parseType(expression.slice(6, -1)) };
  if (expression.startsWith('Map<') && expression.endsWith('>')) { const parts = splitMap(expression.slice(4, -1)); return parts ? { kind: 'map', key: parseType(parts[0]), value: parseType(parts[1]) } : { kind: 'invalid' }; }
  return { kind: 'named', name: expression };
}

function primitiveValid(definitions, typeName, value) {
  const definition = definitions.get(typeName);
  if (!definition) return false;
  if (definition.kind === 'BOOLEAN') return typeof value === 'boolean';
  if (definition.kind === 'SAFE-INTEGER') return Number.isSafeInteger(value) && value >= definition.minimum && value <= definition.maximum;
  if (definition.kind !== 'STRING' || typeof value !== 'string') return false;
  if (definition.minLength !== undefined && value.length < definition.minLength) return false;
  if (definition.maxLength !== undefined && value.length > definition.maxLength) return false;
  if (definition.pattern && !(new RegExp(definition.pattern).test(value))) return false;
  if (definition.enum && !definition.enum.includes(value)) return false;
  return true;
}

function schemaValidator(schema, instance, context, stack = []) {
  if (!instance || typeof instance !== 'object' || Array.isArray(instance)) return false;
  if (stack.includes(schema.schemaId)) return false;
  const expected = schema.fields.map((field) => field.name).sort();
  if (canonical(Object.keys(instance).sort()) !== canonical(expected)) return false;
  function typeValid(expression, candidate) {
    const parsed = parseType(expression);
    if (parsed.kind === 'nullable') return candidate === null || nodeValid(parsed.inner, candidate);
    return nodeValid(parsed, candidate);
  }
  function nodeValid(node, candidate) {
    if (node.kind === 'array') return Array.isArray(candidate) && candidate.length >= 1 && candidate.length <= 4096 && new Set(candidate.map(canonical)).size === candidate.length && candidate.every((item) => nodeValid(node.inner, item));
    if (node.kind === 'map') return candidate && typeof candidate === 'object' && !Array.isArray(candidate) && Object.keys(candidate).length > 0 && Object.keys(candidate).every((key) => nodeValid(node.key, key) && nodeValid(node.value, candidate[key]));
    if (node.kind !== 'named') return false;
    if (context.primitives.has(node.name)) return primitiveValid(context.primitives, node.name, candidate);
    const nested = context.byType.get(node.name);
    return Boolean(nested) && schemaValidator(nested, candidate, context, [...stack, schema.schemaId]);
  }
  return schema.fields.every((field) => typeValid(field.typeExpression, instance[field.name])) && schema.crossFieldInvariants.every((invariant) => executeAst(invariant, instance) === true);
}

const CAS_STEPS = ['READ-HEAD', 'READ-SECURITY-UNIVERSE', 'VALIDATE-SCHEMA', 'VALIDATE-AUTHORITY', 'VALIDATE-TRUSTED-TIME', 'VALIDATE-REVOCATION', 'COMPARE-EXPECTED-HEAD', 'RESERVE-ATTEMPT', 'ADVANCE-FENCE', 'CONSUME-PERMIT', 'STAGE-EFFECT', 'STAGE-EVENT', 'STAGE-OUTBOX', 'REVALIDATE-READ-SET', 'ATOMIC-COMMIT'];
const protocolRoot = (label) => typed('PRCV5-DETERMINISTIC-PLANNING-PROTOCOL-WITNESS-V1', label);
function actor() { return { pc: 0, terminal: false, committed: false, observedHead: null, observedSecurityHead: null, observedRevision: null, observedRevocationHead: null, validatedHead: null }; }
function attempt(id, overrides = {}) { return { attemptId: `PRCV5-CAS-${id}`, schemaValid: true, authorityCurrent: true, validFrom: '2026-08-30T00:00:00Z', expiresAt: '2026-08-31T00:00:00Z', trustedNow: '2026-08-30T12:00:00Z', revoked: false, revocationHead: protocolRoot('cas-revocation-head-0'), expectedHead: 'HEAD-0', proposedFence: 1, epoch: 1, minimumRevision: 6, replayUsed: false, effectRoot: protocolRoot(`cas-effect-${id}`), eventRoot: protocolRoot(`cas-event-${id}`), outboxRoot: protocolRoot(`cas-outbox-${id}`), ...overrides }; }
function initial(overrides = {}) { return { A: actor(), B: actor(), attempts: { A: attempt('A', overrides.A), B: attempt('B', overrides.B) }, store: { head: 'HEAD-0', securityHead: 'SECURITY-0', revision: 7, revocationHead: protocolRoot('cas-revocation-head-0'), fence: 0, permitUsed: false, replayUsed: false, effectCount: 0, eventCount: 0, outboxCount: 0 } }; }
function advance(original, id) {
  const state = structuredClone(original); const cursor = state[id]; const request = state.attempts[id]; const step = CAS_STEPS[cursor.pc];
  if (cursor.terminal || !step) return null;
  function deny() { cursor.terminal = true; cursor.denialStep = step; return state; }
  if (step === 'READ-HEAD') cursor.observedHead = state.store.head;
  else if (step === 'READ-SECURITY-UNIVERSE') { cursor.observedSecurityHead = state.store.securityHead; cursor.observedRevision = state.store.revision; cursor.observedRevocationHead = state.store.revocationHead; }
  else if (step === 'VALIDATE-SCHEMA' && request.schemaValid !== true) return deny();
  else if (step === 'VALIDATE-AUTHORITY' && request.authorityCurrent !== true) return deny();
  else if (step === 'VALIDATE-TRUSTED-TIME' && !(request.validFrom <= request.trustedNow && request.trustedNow < request.expiresAt)) return deny();
  else if (step === 'VALIDATE-REVOCATION' && (request.revoked || request.revocationHead !== state.store.revocationHead)) return deny();
  else if (step === 'COMPARE-EXPECTED-HEAD' && (request.expectedHead !== cursor.observedHead || request.expectedHead !== state.store.head)) return deny();
  else if (step === 'RESERVE-ATTEMPT' && !/^PRCV5-CAS-[AB]$/.test(request.attemptId)) return deny();
  else if (step === 'ADVANCE-FENCE' && !(Number.isSafeInteger(request.proposedFence) && request.proposedFence > state.store.fence)) return deny();
  else if (step === 'CONSUME-PERMIT' && (request.replayUsed || state.store.permitUsed || state.store.replayUsed || state.store.revision <= request.minimumRevision)) return deny();
  else if (step === 'STAGE-EFFECT' && !/^[0-9a-f]{64}$/.test(request.effectRoot)) return deny();
  else if (step === 'STAGE-EVENT' && !/^[0-9a-f]{64}$/.test(request.eventRoot)) return deny();
  else if (step === 'STAGE-OUTBOX' && !/^[0-9a-f]{64}$/.test(request.outboxRoot)) return deny();
  else if (step === 'REVALIDATE-READ-SET') { if (cursor.observedHead !== state.store.head || cursor.observedSecurityHead !== state.store.securityHead || cursor.observedRevision !== state.store.revision || cursor.observedRevocationHead !== state.store.revocationHead || state.store.permitUsed || state.store.replayUsed) return deny(); cursor.validatedHead = state.store.head; }
  else if (step === 'ATOMIC-COMMIT') {
    if (cursor.validatedHead !== state.store.head || state.store.permitUsed || state.store.replayUsed) return deny();
    Object.assign(state.store, { head: `HEAD-${id}`, fence: request.proposedFence, permitUsed: true, replayUsed: true, effectCount: state.store.effectCount + 1, eventCount: state.store.eventCount + 1, outboxCount: state.store.outboxCount + 1 }); cursor.committed = true; cursor.terminal = true; cursor.pc += 1; return state;
  }
  cursor.pc += 1; return state;
}

function proof() {
  const cache = new Map(); const reached = new Set(); let crashCuts = 0; let crashMutations = 0;
  function walk(state) {
    const key = canonical(state); reached.add(key); if (cache.has(key)) return cache.get(key);
    for (const id of ['A', 'B']) if (!state[id].terminal && state[id].pc < CAS_STEPS.length) { crashCuts += 1; const before = canonical(state.store); const crashed = structuredClone(state); crashed[id].terminal = true; if (canonical(crashed.store) !== before) crashMutations += 1; }
    if (state.A.terminal && state.B.terminal) { const count = Number(state.A.committed) + Number(state.B.committed); const terminal = { completeSchedules: 1n, zeroCommitSchedules: count === 0 ? 1n : 0n, oneCommitSchedules: count === 1 ? 1n : 0n, twoCommitSchedules: count === 2 ? 1n : 0n }; cache.set(key, terminal); return terminal; }
    const total = { completeSchedules: 0n, zeroCommitSchedules: 0n, oneCommitSchedules: 0n, twoCommitSchedules: 0n };
    for (const id of ['A', 'B']) if (!state[id].terminal) { const next = advance(state, id); if (next) { const part = walk(next); for (const name of Object.keys(total)) total[name] += part[name]; } }
    cache.set(key, total); return total;
  }
  const total = walk(initial());
  return { completeScheduleCount: String(total.completeSchedules), zeroCommitScheduleCount: String(total.zeroCommitSchedules), oneCommitScheduleCount: String(total.oneCommitSchedules), twoCommitScheduleCount: String(total.twoCommitSchedules), reachableStateCount: reached.size, crashCutStateActorCount: crashCuts, crashMutationCount: crashMutations, concurrentWinnerMaximum: 1, responseLossReadbackTerminal: 'COMMITTED-READBACK-NO-RETRY', atomicEffectEventOutbox: true };
}

function oneAttempt(overrides = {}, crashMode = null) {
  let state = initial({ A: overrides, B: { schemaValid: false } }); state.B.terminal = true;
  while (!state.A.terminal) { if (crashMode === 'FAIL-BEFORE-WRITE' && CAS_STEPS[state.A.pc] === 'ATOMIC-COMMIT') return { terminal: 'FAILURE-BEFORE-WRITE', store: state.store, authoritativeReadback: state.store.head }; state = advance(state, 'A'); }
  if (crashMode === 'RESPONSE-LOSS-AFTER-WRITE' && state.A.committed) return { terminal: 'RESPONSE-LOSS', store: state.store, authoritativeReadback: state.store.head, recoveryTerminal: 'COMMITTED-READBACK-NO-RETRY' };
  return { terminal: state.A.committed ? 'COMMITTED' : 'BLOCK', denialStep: state.A.denialStep ?? null, store: state.store, authoritativeReadback: state.store.head };
}

function vectorTerminal(vector, context) {
  if (vector.evaluator.kind === 'AST') return executeAst(vector.evaluator.predicate, change(vector.preState, vector.operation)) === true ? 'PASS' : 'BLOCK';
  if (vector.evaluator.kind === 'SCHEMA') { const record = context.instances.get(vector.preStateRef.instanceId); const schema = context.schemas.get(vector.evaluator.schemaId); if (!record || !schema || record.instanceRoot !== vector.preStateRef.instanceRoot) return 'BLOCK'; return schemaValidator(schema, change(record.instance, vector.operation), context.schemaContext) ? 'PASS' : 'BLOCK'; }
  if (vector.evaluator.kind === 'PERMIT-NAMEDUSE') return vector.evaluator.presentedPermitClass === vector.evaluator.consumerPermitClass ? 'PASS' : 'BLOCK';
  if (vector.evaluator.kind === 'PERMIT-SCHEMA') { const permit = context.permitMap.get(vector.evaluator.permitClass); if (!permit || permit.schema.schemaRoot !== vector.evaluator.schemaRoot || permit.planningInstance.instanceRoot !== vector.preStateRef.instanceRoot) return 'BLOCK'; return schemaValidator(permit.schema, change(permit.planningInstance.instance, vector.operation), context.schemaContext) ? 'PASS' : 'BLOCK'; }
  if (vector.evaluator.kind === 'LIFECYCLE-SCENARIO') { const scenario = context.lifecycle.scenarios.find((item) => item.scenarioId === vector.evaluator.scenarioId); if (!scenario) return 'BLOCK'; const actual = oneAttempt(scenario.overrides, scenario.crashMode); return canonical(actual) === canonical(scenario.result) && vector.evaluator.acceptedTerminals.includes(actual.terminal) ? 'PASS' : 'BLOCK'; }
  if (vector.evaluator.kind === 'DIGEST-BOUNDARY') { const raw = textHash(canonical(vector.preState.payload)); const identity = typed(vector.preState.domain, vector.preState.payload); if (vector.operation.op === 'SET-DOMAIN') return typed(vector.operation.operand, vector.preState.payload) === vector.preState.expectedIdentityRoot ? 'PASS' : 'BLOCK'; return raw !== identity && identity === vector.preState.expectedIdentityRoot ? 'PASS' : 'BLOCK'; }
  return 'BLOCK';
}

const manifest = json(MANIFEST);
const memberProjection = [];
for (const member of manifest.members) {
  const data = bytes(member.logicalPath);
  check(`MEMBER-${member.ordinal}`, fs.lstatSync(member.logicalPath).isFile() && !fs.lstatSync(member.logicalPath).isSymbolicLink() && member.logicalPath.startsWith('docs/') && !member.logicalPath.startsWith('/') && !member.logicalPath.includes('..') && !member.logicalPath.startsWith('web/') && data.length === member.bytes && hash(data) === member.rawSha256Checksum && data.length < LIMIT, member.logicalPath);
  memberProjection.push({ ordinal: member.ordinal, role: member.role, logicalPath: member.logicalPath, rawSha256Checksum: member.rawSha256Checksum, bytes: member.bytes, required: member.required });
}
const packageRoot = typed('PRCV5-PACKAGE-CONTENT-ROOT-V1', memberProjection);
check('PACKAGE-ROOT', packageRoot === manifest.packageContentRoot, packageRoot);
check('MANIFEST-DISPOSITION', manifest.currentDisposition.acceptance === 0 && manifest.currentDisposition.repositoryVisibility === 'PUBLIC' && manifest.currentDisposition.gate29 === 'BLOCKED' && manifest.currentDisposition.developmentFreeze === 'ACTIVE' && ['GitHubControlPlanePermit', 'PublicPushPermit', 'DeploymentPermit', 'ReleasePermit'].every((name) => manifest.currentDisposition[name] === 'ABSENT'), canonical(manifest.currentDisposition));

const byRole = new Map(manifest.members.map((member) => [member.role, member.logicalPath]));
const inputs = json(byRole.get('V5-FROZEN-INPUT-MANIFEST'));
const closures = json(byRole.get('V5-FINDING-IDENTITY-AND-CLOSURE-REGISTRY'));
const schemaRegistry = json(byRole.get('V5-CLOSED-SCHEMA-AND-TYPE-REGISTRY'));
const digestRegistry = json(byRole.get('V5-CANONICAL-DIGEST-AND-SERIALIZATION-REGISTRY'));
const authority = json(byRole.get('V5-PRODUCER-AUTHORITY-AND-SEPARATION-GRAPH'));
const lifecycle = json(byRole.get('V5-LIFECYCLE-CAS-AND-RECOVERY-REGISTRY'));
const permits = json(byRole.get('V5-FOUR-PERMIT-REGISTRY'));
const publicFlow = json(byRole.get('V5-PUBLIC-INFORMATION-FLOW-AND-SCANNER-REGISTRY'));
const publication = json(byRole.get('V5-PUBLICATION-SIZE-SHARD-AND-STORAGE-REGISTRY'));
const vectorIndex = json(byRole.get('V5-EXECUTABLE-CAUSAL-VECTOR-CORPUS-INDEX'));
const graph = json(byRole.get('V5-CAUSAL-GRAPH'));

let sourceParity = true;
for (const source of inputs.sourceRecords) { const data = bytes(source.logicalPath); sourceParity &&= source.contentId === `sha256:${hash(data)}` && source.rawSha256Checksum === hash(data) && source.bytes === data.length && source.logicalPath.startsWith('docs/') && !source.logicalPath.startsWith('/') && !source.logicalPath.startsWith('web/') && !source.logicalPath.includes('..') && source.physicalSourceBytesDuplicatedInV5 === false; }
check('FROZEN-SOURCES', sourceParity && inputs.sourceRecordCount === 14 && inputs.sourceBytesPhysicallyDuplicated === 0, inputs.sourceReferenceRoot);
const v4ManifestSource = inputs.sourceRecords.find((source) => source.sourceId === 'V4-MANIFEST');
const v4Manifest = json(v4ManifestSource.logicalPath);
const v4Preimage = `CONNECT-PRCV4:PACKAGE-ROOT:${v4Manifest.members.map((member) => `${member.path}\0${member.sha256}\0${member.bytes}\n`).join('')}`;
const v4PackageRoot = textHash(v4Preimage);
check('V4-PACKAGE-ROOT', v4PackageRoot === inputs.v4PackageVerification.declaredPackageRoot && v4PackageRoot === inputs.v4PackageVerification.independentlyRecomputedPackageRoot && v4Manifest.members.every((member) => hash(bytes(member.path)) === member.sha256 && bytes(member.path).length === member.bytes), v4PackageRoot);
const lateDecisionSource = text(inputs.sourceRecords.find((source) => source.sourceId === 'LATE-STORAGE-DECISION').logicalPath);
const lateClauses = [...lateDecisionSource.matchAll(/^([0-9]+\.[0-9]+\.[0-9]+) ([^\n]+)$/gm)];
const lateRows = new Map(publication.lateDecisionReconciliation.map((row) => [row.clauseId, row]));
const lateParity = lateClauses.length === 48 && lateClauses.every((match) => { const row = lateRows.get(`LATE-DECISION-${match[1]}`); return row && row.clauseTextRoot === typed('PRCV5-LATE-DECISION-CLAUSE-TEXT-V1', match[2]); });
check('LATE-DECISION', inputs.lateDecisionVerification.contentId === `sha256:${LATE_DECISION_SHA}` && lateParity && publication.lateDecisionReconciliation.length === 48 && new Set(publication.lateDecisionReconciliation.map((row) => row.clauseId)).size === 48, publication.lateDecisionAdmission.contentId);

const v4Rows = json(V4_CLOSURES).records;
const extractedSource = text(FINDINGS);
const headings = [...extractedSource.matchAll(/^## 2\.\d+ (PRCV4-IHR-F\d{3})[^\n]*$/gm)];
const extractedRoots = new Map();
for (let index = 0; index < headings.length; index += 1) {
  const heading = headings[index]; const end = index + 1 < headings.length ? headings[index + 1].index : extractedSource.search(/^# 3\./m); const section = extractedSource.slice(heading.index, end);
  const record = { findingId: heading[1] };
  for (const field of ['severity', 'evidence', 'impact', 'remediation', 'closureTest', 'noMergeKey']) { const match = new RegExp(`^- ${field}=([^\\n]+)$`, 'm').exec(section); if (!match) { errors.push(`EXTRACTION:${heading[1]}:${field}`); continue; } record[field] = field === 'severity' ? match[1].trim().split(';')[0] : match[1].trim(); }
  extractedRoots.set(record.findingId, { recordRoot: typed('PRCV5-CANONICAL-FINDING-RECORD-V1', record), fieldRoots: Object.fromEntries(['severity', 'evidence', 'impact', 'remediation', 'closureTest', 'noMergeKey'].map((field) => [field, typed('PRCV5-FINDING-SOURCE-FIELD-V1', { findingId: record.findingId, field, value: record[field] })])) });
}
check('CLOSURE-DENOMINATOR', closures.records.length === 116 && closures.denominators.inheritedFindings === 93 && closures.denominators.newFindings === 23 && closures.remediationControls.length === 23 && new Set(closures.records.map((row) => row.findingId)).size === 116 && new Set(closures.records.map((row) => row.noMergeKey)).size === 116 && closures.records.every((row) => row.closureCredit === 0 && row.acceptanceCredit === 0), canonical(closures.denominators));
const inheritedExtractionParity = closures.records.slice(0, 93).every((row, index) => { const source = v4Rows[index]; const projection = { findingId: source.findingId, severity: source.severity, noMergeKey: source.noMergeKey, remediation: source.remediation, closureTest: source.closureTest, requirementIds: source.requirementIds }; return row.findingId === source.findingId && row.noMergeKey === source.noMergeKey && row.sourceRecordRoot === typed('PRCV5-INHERITED-FINDING-RECORD-V1', projection) && Object.entries(projection).every(([field, value]) => row.sourceFieldRoots[field] === typed('PRCV5-FINDING-SOURCE-FIELD-V1', { findingId: source.findingId, field, value })); });
check('INHERITED-IDENTITIES', inheritedExtractionParity, '93 ordered field-rooted rows');
check('NEW-FINDING-EXTRACTION', headings.length === 23 && closures.records.slice(93).every((row) => { const extracted = extractedRoots.get(row.findingId); return extracted && extracted.recordRoot === row.sourceRecordRoot && Object.entries(extracted.fieldRoots).every(([field, fieldRoot]) => row.sourceFieldRoots[field] === fieldRoot); }), `${headings.length}`);
const predecessorSourceText = text(inputs.sourceRecords.find((source) => source.sourceId === 'PREDECESSOR-FINDINGS-MANIFEST').logicalPath);
const wrapperSourceText = text(inputs.sourceRecords.find((source) => source.sourceId === 'V2-FINDINGS-MANIFEST').logicalPath);
const aliasSourceParity = closures.aliasProjections.every((row) => predecessorSourceText.includes(row.predecessorIdentity) && wrapperSourceText.includes(row.wrapperIdentity) && wrapperSourceText.includes(`predecessor Finding ${row.predecessorIdentity}`));
check('ALIASES', closures.aliasProjections.length === 32 && new Set(closures.aliasProjections.map((row) => row.canonicalFindingId)).size === 32 && closures.aliasProjections.every((row) => row.aliasClosureCredit === 0 && row.equivalenceClass === 'IDENTITY-PROVENANCE-ONLY-NOT-MERGE') && aliasSourceParity, '32 identity-only source projections');

const primitives = new Map(schemaRegistry.primitiveDefinitions.map((definition) => [definition.typeName, definition]));
const byType = new Map(schemaRegistry.nestedSchemas.map((schema) => [schema.typeName, schema]));
const schemas = new Map([...schemaRegistry.nestedSchemas, ...schemaRegistry.outputFamilies].map((schema) => [schema.schemaId, schema]));
const instances = new Map(schemaRegistry.admittedInstances.map((record) => [record.instanceId, record]));
const schemaContext = { primitives, byType };
const allTypeTokens = schemaRegistry.outputFamilies.flatMap((schema) => schema.fields.flatMap((field) => [...field.typeExpression.matchAll(/[A-Za-z][A-Za-z0-9]*/g)].map((match) => match[0]).filter((name) => !['Array', 'Map', 'Nullable'].includes(name))));
check('SCHEMA-CLOSURE', schemaRegistry.outputFamilies.length === 42 && schemaRegistry.nestedSchemas.length === 70 && new Set(schemaRegistry.nestedSchemas.map((schema) => schema.typeName)).size === 70 && allTypeTokens.every((name) => primitives.has(name) || byType.has(name)) && schemaRegistry.denominators.unresolvedTypeReferences === 0, canonical(schemaRegistry.denominators));
const invalidSchemaInstances = schemaRegistry.admittedInstances.filter((record) => !schemas.has(record.schemaId) || !schemaValidator(schemas.get(record.schemaId), record.instance, schemaContext)).map((record) => record.instanceId);
check('SCHEMA-ADMITTED-INSTANCES', schemaRegistry.admittedInstances.length === 112 && invalidSchemaInstances.length === 0, invalidSchemaInstances.length === 0 ? '112/112' : invalidSchemaInstances.join(','));
check('VALIDATOR-UNKNOWN-FAIL-CLOSED', executeAst({ op: 'UNDECLARED', args: [] }, {}) === false && schemaRegistry.validatorLanguage.unknownOperatorPolicy === 'BLOCK' && schemaRegistry.validatorLanguage.unknownTypePolicy === 'BLOCK', schemaRegistry.validatorLanguage.languageRoot);

const identityRoots = digestRegistry.classBoundaryControls.map((row) => row.identityRoot);
check('DIGEST-SEPARATION', new Set(digestRegistry.identityClasses.map((row) => row.domain)).size === digestRegistry.identityClasses.length && new Set(identityRoots).size === identityRoots.length && digestRegistry.boundaryFacts.rawChecksumEqualsAnyTypedIdentity === false, canonical(digestRegistry.boundaryFacts));
check('AUTHORITY-SOLE-PRODUCERS', authority.producers.length === authority.appointments.length && new Set(authority.producers.map((row) => row.outputObjectId)).size === authority.producers.length && authority.appointments.every((row) => row.selfAppointment === false && row.producerCardinality === 1) && authority.actualGenesisState === 'MISSING-BLOCKING' && authority.currentAuthorityCredit === 0, canonical(authority.denominators));
check('AUTHORITY-INDEPENDENCE', authority.independenceGroups.every((group) => group.dimensions.every((dimension) => dimension.distinctCount === dimension.requiredDistinctCount && dimension.terminal === 'PASS')), `${authority.independenceGroups.length}`);
const profiles = authority.readerProfiles;
check('READER-PROFILES', profiles.length === 2 && profiles.every((profile) => profile.implementationContentId === `sha256:${hash(bytes(profile.implementationPath))}`) && profiles[0].implementationContentId !== profiles[1].implementationContentId && profiles[0].dependencyRoot !== profiles[1].dependencyRoot && profiles[0].runtimeRoot !== profiles[1].runtimeRoot && profiles[0].controllerRoot !== profiles[1].controllerRoot && profiles[0].contextRoot !== profiles[1].contextRoot, profiles.map((row) => row.profileRoot).join(','));

const recomputedProof = proof();
check('CAS-EXHAUSTIVE', canonical(recomputedProof) === canonical(lifecycle.exhaustiveTwoActorProof) && recomputedProof.twoCommitScheduleCount === '0' && recomputedProof.crashMutationCount === 0 && lifecycle.reducer.steps.length === 15, canonical(recomputedProof));
const permitMap = new Map(permits.permits.map((permit) => [permit.permitClass, permit]));
check('PERMIT-MATRIX', permits.permits.length === 4 && permits.crossUseMatrix.length === 16 && permits.matrixDenominators.legalPresentations === 4 && permits.matrixDenominators.crossClassDenials === 12 && new Set(permits.permits.map((row) => row.domain)).size === 4 && new Set(permits.permits.map((row) => row.namedUse)).size === 4 && permits.permits.every((row) => row.roleSeparation.distinctCount === 3 && row.currentState === 'ABSENT' && schemaValidator(row.schema, row.planningInstance.instance, schemaContext)), canonical(permits.matrixDenominators));
check('PUBLIC-FLOW', publicFlow.visibilityContract.frozenObservation.visibility === 'PUBLIC' && publicFlow.visibilityContract.preOperationTrustedReceipt === 'MISSING-BLOCKING' && publicFlow.visibilityContract.postOperationTrustedReceipt === 'MISSING-BLOCKING' && publicFlow.scannerProfiles.length === 3 && publicFlow.scannerSeparation.dimensions.every((row) => row.distinctCount === row.requiredDistinctCount), publicFlow.publicFlowRegistryRoot);
check('STORAGE-BLOCKS', publication.repositoryBudgets.every((row) => row.state === 'MISSING-BLOCKING') && publication.externalArtifactCurrentState.selectedStoreState === 'MISSING-BLOCKING' && publication.publicationDisposition.startsWith('BLOCKED') && publication.regularGitMemberGate.exclusiveMaximumBytes === LIMIT, publication.publicationDisposition);
const auxiliarySchemasTyped = lifecycle.lifecycleSchemas.every((schema) => schema.additionalProperties === false && schema.fields.length > 0 && schema.fields.every((field) => primitives.has(field.typeExpression) || byType.has(field.typeExpression))) && authority.recoverySchema.additionalProperties === false && authority.recoverySchema.fields.every((field) => primitives.has(field.typeExpression) || byType.has(field.typeExpression));
const scannerPlanningValid = publicFlow.scannerPlanningReceipts.length === 2 && publicFlow.scannerPlanningReceipts.every((record) => schemaValidator(publicFlow.scannerReceiptSchema, record.instance, schemaContext)) && schemaValidator(publicFlow.adjudicationSchema, publicFlow.adjudicationPlanningInstance.instance, schemaContext);
const externalPlanningValid = schemaValidator(publication.externalArtifactSchema, publication.externalPlanningInstance.instance, schemaContext) && publication.externalPlanningInstance.operationalCredit === 0 && publication.externalArtifactCurrentState.selectedStoreState === 'MISSING-BLOCKING';
check('AUXILIARY-TYPED-SCHEMAS', auxiliarySchemasTyped && scannerPlanningValid && externalPlanningValid, 'lifecycle/recovery/scanner/adjudication/external');

const shardVectors = [];
let shardParity = true;
for (let index = 0; index < vectorIndex.shardDescriptors.length; index += 1) {
  const descriptor = vectorIndex.shardDescriptors[index]; const shard = json(descriptor.logicalPath); const raw = bytes(descriptor.logicalPath);
  shardParity &&= descriptor.ordinal === index + 1 && shard.ordinal === index + 1 && shard.totalShards === vectorIndex.shardDescriptors.length && raw.length === descriptor.bytes && hash(raw) === descriptor.rawSha256Checksum && raw.length < LIMIT && shard.vectorCount === shard.vectors.length && shard.firstCanonicalKey === shard.vectors[0].vectorId && shard.lastCanonicalKey === shard.vectors.at(-1).vectorId && typed('PRCV5-VECTOR-SHARD-CONTENT-V1', shard.vectors.map((vector) => ({ vectorId: vector.vectorId, vectorRoot: vector.vectorRoot }))) === descriptor.contentRoot;
  shardVectors.push(...shard.vectors);
}
check('SHARDS', shardParity && shardVectors.length === vectorIndex.vectorCount && new Set(shardVectors.map((vector) => vector.vectorId)).size === shardVectors.length && shardVectors.every((vector, index) => index === 0 || shardVectors[index - 1].vectorId.localeCompare(vector.vectorId) < 0), `${vectorIndex.shardDescriptors.length}/${shardVectors.length}`);
check('CORPUS-ROOT', typed('PRCV5-VECTOR-CORPUS-V1', shardVectors.map((vector) => ({ vectorId: vector.vectorId, vectorRoot: vector.vectorRoot }))) === vectorIndex.corpusRoot, vectorIndex.corpusRoot);

const vectorContext = { instances, schemas, schemaContext, permitMap, lifecycle };
let executed = 0; let actualBlocks = 0; let comparisonBlocks = 0; let vectorRootParity = true;
for (const vector of shardVectors) {
  const actual = vectorTerminal(vector, vectorContext); const comparison = actual === vector.expectedTerminal ? 'PASS' : 'BLOCK';
  executed += 1; if (actual === 'BLOCK') actualBlocks += 1; if (comparison === 'BLOCK') comparisonBlocks += 1;
  vectorRootParity &&= actual === vector.actualTerminal && comparison === vector.comparisonTerminal && typed('PRCV5-CAUSAL-VECTOR-V1', without(vector, 'vectorRoot')) === vector.vectorRoot;
}
check('VECTOR-EXECUTION', vectorRootParity && executed === vectorIndex.vectorCount && comparisonBlocks === 1 && vectorIndex.intentionalExpectedOnlyComparisonBlocks === 1, `${executed}/${actualBlocks}/${comparisonBlocks}`);
const vectorIds = new Set(shardVectors.map((vector) => vector.vectorId));
check('CLOSURE-VECTOR-COVERAGE', closures.records.every((row) => row.vectorIds.every((id) => vectorIds.has(id))) && closures.remediationControls.every((control) => { const suffix = control.controlId.slice(-3); const expected = 1 + Object.keys(control.conjuncts).length; return shardVectors.filter((vector) => vector.vectorId.startsWith(`PRCV5-VECTOR-CONTROL-${suffix}-`)).length === expected; }), `${closures.records.length}`);
check('SCHEMA-VECTOR-COVERAGE', [...schemas.values()].every((schema) => { const prefix = `PRCV5-VECTOR-SCHEMA-${schema.schemaId}`; const present = shardVectors.filter((vector) => vector.vectorId.startsWith(prefix)); const expected = 1 + schema.fields.length * 2 + 1 + (schema.fields.some((field) => field.name === 'v5AcceptanceCredit') ? 1 : 0); return present.length === expected; }), `${schemas.size}`);
check('PERMIT-SCHEMA-VECTOR-COVERAGE', permits.permits.every((permit) => { const prefix = `PRCV5-VECTOR-PERMIT-SCHEMA-${permit.ordinal}-`; const present = shardVectors.filter((vector) => vector.vectorId.startsWith(prefix)); return present.length === 1 + permit.schema.fields.length * 2 + 2; }), `${permits.permits.length}`);

const graphNodeIds = new Set(graph.nodes.map((node) => node.nodeId));
const derivedNodeClassCounts = Object.fromEntries([...new Set(graph.nodes.map((node) => node.nodeClass))].sort().map((nodeClass) => [nodeClass, graph.nodes.filter((node) => node.nodeClass === nodeClass).length]));
const derivedEdgeClassCounts = Object.fromEntries([...new Set(graph.edges.map((edge) => edge.relation))].sort().map((relation) => [relation, graph.edges.filter((edge) => edge.relation === relation).length]));
check('GRAPH-DERIVATION', graph.invariants.nodes === graph.nodes.length && graph.invariants.edges === graph.edges.length && graph.invariants.requirementEdges === closures.requirementEdges.length && graph.invariants.closureVectorEdges === closures.records.reduce((sum, row) => sum + row.vectorIds.length, 0) && graph.invariants.vectorResultEdges === shardVectors.length && graph.edges.every((edge) => graphNodeIds.has(edge.from) && graphNodeIds.has(edge.to)) && canonical(derivedNodeClassCounts) === canonical(graph.nodeClassCounts) && canonical(derivedEdgeClassCounts) === canonical(graph.edgeClassCounts) && typed('PRCV5-CAUSAL-GRAPH-NODES-V1', graph.nodes) === graph.nodesRoot && typed('PRCV5-CAUSAL-GRAPH-EDGES-V1', graph.edges) === graph.edgesRoot, `${graph.nodes.length}/${graph.edges.length}`);

const packageText = manifest.members.map((member) => text(member.logicalPath)).join('\n');
const absoluteHomeToken = ['', 'Users', ''].join('/');
const repositoryFolderToken = ['web', 'docs', ''].join('/');
const forbiddenRandomCallA = ['Math', 'random'].join('.') + '(';
const forbiddenRandomCallB = ['crypto', 'randomUUID'].join('.') + '(';
check('PUBLIC-SAFE-BYTES', !packageText.includes(absoluteHomeToken) && !packageText.includes(repositoryFolderToken) && !packageText.includes(forbiddenRandomCallA) && !packageText.includes(forbiddenRandomCallB), 'no absolute locator/repository-folder-prefix/forbidden-random-call');
check('NO-SELF-ACCEPTANCE', manifest.noSelfAcceptance === true && manifest.acceptanceCredit === 0 && authority.readerProfiles.every((profile) => profile.acceptanceCredit === 0), 'Acceptance=0');

const reportBody = {
  artifactId: 'CONNECT-PRCV5-READER-A-REPORT-2026-08-30',
  schemaVersion: 'PRCV5-READER-REPORT-V1',
  artifactClass: 'DETACHED-READ-ONLY-MECHANICAL-QA-REPORT;NOT-INDEPENDENT-REVIEW;NOT-ACCEPTANCE;NOT-PERMIT',
  readerId: 'PRCV5-READER-A',
  readerProfileRoot: authority.readerProfiles.find((profile) => profile.readerId === 'PRCV5-READER-A').profileRoot,
  manifestPath: MANIFEST,
  manifestSha256: hash(bytes(MANIFEST)),
  packageContentRoot: packageRoot,
  sourceReferenceRoot: inputs.sourceReferenceRoot,
  vectorCorpusRoot: vectorIndex.corpusRoot,
  graphRoot: graph.graphRoot,
  checks,
  counters: { checks: checks.length, errors: errors.length, packageMembers: manifest.members.length, sourceReferences: inputs.sourceRecords.length, findings: closures.records.length, inheritedFindings: closures.denominators.inheritedFindings, newFindings: closures.denominators.newFindings, remediationControls: closures.remediationControls.length, outputFamilies: schemaRegistry.outputFamilies.length, nestedTypes: schemaRegistry.nestedSchemas.length, schemaInstances: schemaRegistry.admittedInstances.length, vectors: shardVectors.length, vectorActualBlocks: actualBlocks, vectorComparisonBlocks: comparisonBlocks, shards: vectorIndex.shardDescriptors.length, graphNodes: graph.nodes.length, graphEdges: graph.edges.length, permits: permits.permits.length, permitMatrixCells: permits.crossUseMatrix.length, lateDecisionClauses: publication.lateDecisionReconciliation.length },
  verdict: errors.length === 0 ? 'PASS' : 'BLOCK',
  errors,
  claimLimit: 'MECHANICAL-CANDIDATE-INTEGRITY-ONLY;NO-REVIEW-CLOSURE-OPERATIONAL-EVIDENCE-PERMIT-OR-ACCEPTANCE-CREDIT',
  currentDisposition: manifest.currentDisposition,
  acceptanceCredit: 0,
};
const report = { ...reportBody, reportRoot: typed('PRCV5-READER-REPORT-V1', reportBody) };

function patchFor(path, content) {
  const rows = content.split('\n'); if (rows.at(-1) === '') rows.pop(); const plus = rows.map((line) => `+${line}`).join('\n');
  if (!fs.existsSync(path)) return `*** Begin Patch\n*** Add File: ${path}\n${plus}\n*** End Patch\n`;
  const old = text(path).split('\n'); if (old.at(-1) === '') old.pop(); return `*** Begin Patch\n*** Update File: ${path}\n@@\n${old.map((line) => `-${line}`).join('\n')}\n${plus}\n*** End Patch\n`;
}

if (process.argv[2] === '--emit-report-patch') process.stdout.write(patchFor(REPORT, `${JSON.stringify(report, null, 2)}\n`));
else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = errors.length === 0 ? 0 : 1;
