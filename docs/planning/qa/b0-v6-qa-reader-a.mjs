#!/usr/bin/env node

import fs from 'node:fs';
import crypto from 'node:crypto';

const P = 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6';
const VECTOR_SHARD_COUNT = 16;
const PACKAGE_MEMBER_COUNT = 24;
const MAX_PUBLIC_GIT_FILE_BYTES = 50 * 1024 * 1024;
const paths = {
  subject: `${P}-2026-08-30.md`, registry: `${P}-normative-registry-2026-08-30.json`, sourceIndex: `${P}-source-member-span-index-2026-08-30.json`,
  crosswalk: `${P}-closure-crosswalk-2026-08-30.json`, vectors: `${P}-portable-causal-vector-corpus-2026-08-30.json`, manifest: `${P}-atomic-package-manifest-2026-08-30.json`,
  vectorShards: Array.from({ length: VECTOR_SHARD_COUNT }, (_, index) => `${P}-portable-causal-vector-corpus-shard-${String(index + 1).padStart(2, '0')}-of-${VECTOR_SHARD_COUNT}-2026-08-30.json`),
  generator: 'docs/planning/qa/generate-b0-v6-package.mjs', readerA: 'docs/planning/qa/b0-v6-qa-reader-a.mjs', readerB: 'docs/planning/qa/b0-v6-qa-reader-b.py',
};
const errors = [];
const checks = [];
function check(condition, code, detail = '') { checks.push(code); if (!condition) errors.push({ code, detail }); }
function bytes(file) { return fs.readFileSync(file); }
function load(file) { return JSON.parse(bytes(file)); }
function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function canonical(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function domainRoot(domain, value) { return sha(Buffer.from(`${domain}\n${canonical(value)}`, 'utf8')); }
function deterministicId(prefix, domain, value) { return `${prefix}-${domainRoot(domain, value).slice(0, 24)}`; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function publicLocatorViolations(value, trail = [], result = []) {
  if (Array.isArray(value)) { value.forEach((item, index) => publicLocatorViolations(item, [...trail, index], result)); return result; }
  if (!value || typeof value !== 'object') return result;
  for (const [key, child] of Object.entries(value)) {
    const nextTrail = [...trail, key];
    if (typeof child === 'string' && /(?:logicalPath|repositoryPath|artifactPath|filePath)$/i.test(key) && (!child.startsWith('docs/') || child.startsWith('web/') || child.startsWith('/') || child.includes('..'))) result.push({ trail: nextTrail.join('/'), value: child });
    publicLocatorViolations(child, nextTrail, result);
  }
  return result;
}
function isAcyclic(nodes, edges) {
  const adjacency = new Map(nodes.map((node) => [typeof node === 'string' ? node : node.nodeId, []]));
  for (const edge of edges) { if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) return false; adjacency.get(edge.source).push(edge.target); }
  const visiting = new Set(); const visited = new Set();
  const visit = (node) => { if (visiting.has(node)) return false; if (visited.has(node)) return true; visiting.add(node); for (const target of adjacency.get(node)) if (!visit(target)) return false; visiting.delete(node); visited.add(node); return true; };
  return [...adjacency.keys()].every(visit);
}
function getPointer(document, pointer) {
  let value = document;
  for (const part of pointer.split('/').slice(1).map((item) => item.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (value === null || value === undefined || !(part in value)) throw new Error(`Missing ${pointer}`);
    value = value[part];
  }
  return value;
}
function setPointer(document, pointer, value) {
  const parts = pointer.split('/').slice(1).map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
  let target = document;
  for (let index = 0; index < parts.length - 1; index += 1) { if (!(parts[index] in target)) throw new Error(`Missing ${pointer}`); target = target[parts[index]]; }
  if (!(parts.at(-1) in target)) throw new Error(`Missing ${pointer}`);
  target[parts.at(-1)] = clone(value);
}
function evaluateAxis(axis) {
  if (axis.kind === 'EQUAL') return canonical(axis.actual) === canonical(axis.expected);
  if (axis.kind === 'NON_NULL') return axis.actual !== null && axis.actual !== '';
  if (axis.kind === 'ZERO') return axis.actual === 0;
  if (axis.kind === 'COUNT_EQUAL') return Number.isInteger(axis.actual) && axis.actual >= 0 && axis.actual === axis.expected;
  if (axis.kind === 'UNIQUE_COUNT') return Array.isArray(axis.actual) && axis.actual.length === axis.expected && new Set(axis.actual.map(canonical)).size === axis.expected;
  if (axis.kind === 'DISTINCT') return canonical(axis.actualLeft) !== canonical(axis.actualRight);
  if (axis.kind === 'SET_CONTAINS_ALL') return axis.required.every((item) => axis.actual.some((actual) => canonical(actual) === canonical(item)));
  if (axis.kind === 'PATH_REPO_RELATIVE') return typeof axis.actual === 'string' && axis.actual.startsWith('docs/') && !axis.actual.startsWith('web/') && !axis.actual.startsWith('/') && !axis.actual.includes('..');
  if (axis.kind === 'BOOLEAN_TRUE') return axis.actual === true;
  return false;
}
function isTypedValue(value, type) {
  if (type === 'NULL-CONSTANT') return value === null;
  if (type === 'BOOLEAN' || type.startsWith('BOOLEAN-')) return typeof value === 'boolean';
  if (/^(U8|U64)/.test(type)) return Number.isInteger(value) && value >= 0;
  if (type === 'SHA256') return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
  if (type === 'SHA256-ARRAY' || /ARRAY/.test(type)) return Array.isArray(value) && value.length > 0;
  if (type === 'RFC3339-UTC') return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value);
  if (type.includes('DETERMINISTIC-ID')) return typeof value === 'string' && value.length > 8;
  if (type.includes('ENUM') || type.includes('ALGORITHM-ID') || type === 'CANONICAL-UTF8') return typeof value === 'string' && value.length > 0;
  return value !== null && value !== undefined;
}
function isTypedField(value, field) {
  if (!field || field.cardinality !== 'EXACTLY-ONE' || !isTypedValue(value, field.type)) return false;
  if (Object.hasOwn(field, 'constant') && canonical(value) !== canonical(field.constant)) return false;
  if (Array.isArray(field.enum) && !field.enum.some((item) => canonical(item) === canonical(value))) return false;
  if (Array.isArray(value)) {
    const embeddedExact = field.type.match(/EXACTLY-(\d+)$/)?.[1]; const exact = field.elementCardinality?.exact ?? (embeddedExact ? Number(embeddedExact) : undefined);
    if (exact !== undefined && value.length !== exact) return false;
    if (field.elementCardinality?.minimum !== undefined && value.length < field.elementCardinality.minimum) return false;
    if (field.elementCardinality?.maximum !== undefined && value.length > field.elementCardinality.maximum) return false;
    if (field.type.startsWith('SHA256-ARRAY') && !value.every((item) => typeof item === 'string' && /^[0-9a-f]{64}$/.test(item))) return false;
  }
  return true;
}
function expressionValue(expression, side, state) {
  if (Object.hasOwn(expression, `${side}Const`)) return expression[`${side}Const`];
  return getPointer(state, expression[`${side}Path`]);
}
function evaluateConstraint(expression, state) {
  if (!expression || typeof expression !== 'object') return false;
  if (expression.op === 'AND') return Array.isArray(expression.args) && expression.args.length > 0 && expression.args.every((item) => evaluateConstraint(item, state));
  if (expression.op === 'EQ') return canonical(expressionValue(expression, 'left', state)) === canonical(expressionValue(expression, 'right', state));
  if (expression.op === 'NEQ') return canonical(expressionValue(expression, 'left', state)) !== canonical(expressionValue(expression, 'right', state));
  if (expression.op === 'LT') return expressionValue(expression, 'left', state) < expressionValue(expression, 'right', state);
  if (expression.op === 'LTE') return expressionValue(expression, 'left', state) <= expressionValue(expression, 'right', state);
  if (expression.op === 'GT') return expressionValue(expression, 'left', state) > expressionValue(expression, 'right', state);
  if (expression.op === 'COUNT_EQ') { const actual = getPointer(state, expression.path); return Array.isArray(actual) && actual.length === expression.expected; }
  if (expression.op === 'UNIQUE_COUNT') { const actual = getPointer(state, expression.path); return Array.isArray(actual) && actual.length === expression.expected && new Set(actual.map(canonical)).size === expression.expected; }
  if (expression.op === 'NON_NULL') { const actual = getPointer(state, expression.path); return actual !== null && actual !== ''; }
  if (expression.op === 'ZERO') return getPointer(state, expression.path) === 0;
  if (expression.op === 'BOOLEAN_TRUE') return getPointer(state, expression.path) === true;
  if (expression.op === 'SET_CONTAINS_ALL') { const actual = getPointer(state, expression.actualPath); const required = getPointer(state, expression.requiredPath); return Array.isArray(actual) && Array.isArray(required) && required.every((item) => actual.some((candidate) => canonical(candidate) === canonical(item))); }
  if (expression.op === 'PATH_REPO_RELATIVE') { const actual = getPointer(state, expression.path); if (typeof actual !== 'string' || !actual.startsWith('docs/') || actual.startsWith('web/') || actual.startsWith('/') || actual.includes('..')) return false; const stat = fs.lstatSync(actual); return stat.isFile() && !stat.isSymbolicLink(); }
  if (expression.op === 'TYPE_VALID') return isTypedValue(getPointer(state, expression.valuePath), getPointer(state, expression.typePath));
  return false;
}
function reduceCasSchedule(state) {
  if (!Array.isArray(state.schedule) || state.schedule.length < 2) return false;
  const allowedOps = new Set(['COMPARE', 'RESERVE', 'BLOCK', 'CRASH-PRECOMMIT', 'COMMIT']);
  if (!state.schedule.every((event, index) => event && event.ordinal === index + 1 && ['W1', 'W2'].includes(event.actor) && allowedOps.has(event.op))) return false;
  if (new Set(state.schedule.map((event) => event.actor)).size !== 2) return false;
  const commits = state.schedule.filter((event) => event.op === 'COMMIT');
  if (commits.length !== 1) return false;
  const loser = commits[0].actor === 'W1' ? 'W2' : 'W1';
  const loserEvents = state.schedule.filter((event) => event.actor === loser);
  if (!loserEvents.some((event) => ['BLOCK', 'CRASH-PRECOMMIT'].includes(event.op)) || loserEvents.some((event) => event.op === 'COMMIT')) return false;
  const terminalIndex = state.schedule.findIndex((event) => event.actor === loser && ['BLOCK', 'CRASH-PRECOMMIT'].includes(event.op));
  return terminalIndex >= 0 && !state.schedule.slice(terminalIndex + 1).some((event) => event.actor === loser && ['RESERVE', 'COMMIT'].includes(event.op));
}
function classifyResponseLoss(state) {
  if (state.retryEffectRequested === true) return 'BLOCK';
  if (state.independentReadbacksAgree !== true) return 'CONFLICT';
  if (state.reservationPresent === false && state.finalizationPresent === false && state.outboxPresent === false) return 'NO-RESERVATION';
  if (state.reservationPresent === true && state.finalizationPresent === false && state.outboxPresent === false) return 'RESERVED-NOT-COMMITTED';
  if (state.reservationPresent === true && state.finalizationPresent === true && state.pointerMatches === true && state.outboxPresent === true && state.receiptConfirmed === false) return 'COMMITTED-UNCONFIRMED';
  if (state.reservationPresent === true && state.finalizationPresent === true && state.pointerMatches === true && state.outboxPresent === true && state.receiptConfirmed === true) return 'COMMITTED-CONFIRMED';
  return 'CONFLICT';
}
function evaluateProgram(program, state) {
  if (program.oracleBody.op === 'ASSERT_TYPED_AXIS') return evaluateAxis(state.axis);
  if (program.oracleBody.op === 'EXACT_UTF8_FIELD') {
    const source = Buffer.from(state.sourceValueBase64, 'base64'); const candidate = Buffer.from(state.candidateValueBase64, 'base64');
    return source.equals(candidate) && sha(candidate) === state.sourceSha256;
  }
  if (program.oracleBody.op === 'EVAL_CONSTRAINT_AST') return evaluateConstraint(program.oracleBody.expression, state);
  if (program.oracleBody.op === 'FILE_SPAN_SHA256') {
    if (!evaluateConstraint({ op: 'PATH_REPO_RELATIVE', path: '/logicalPath' }, state)) return false;
    const artifact = bytes(state.logicalPath);
    if (sha(artifact) !== state.artifactSha256 || state.startByteInclusive < 0 || state.endByteExclusive > artifact.length || state.startByteInclusive >= state.endByteExclusive) return false;
    const selected = artifact.subarray(state.startByteInclusive, state.endByteExclusive);
    return selected.length === state.byteLength && sha(selected) === state.memberSha256;
  }
  if (program.oracleBody.op === 'EXACT_SELECTOR_IN_FIELD') {
    if (!evaluateProgram({ oracleBody: { op: 'FILE_SPAN_SHA256' } }, state.sourceField)) return false;
    const artifact = bytes(state.sourceField.logicalPath); const fieldBytes = artifact.subarray(state.sourceField.startByteInclusive, state.sourceField.endByteExclusive);
    if (state.selector.startByteWithinField < 0 || state.selector.endByteWithinField > fieldBytes.length || state.selector.startByteWithinField >= state.selector.endByteWithinField) return false;
    const selected = fieldBytes.subarray(state.selector.startByteWithinField, state.selector.endByteWithinField);
    return selected.length === state.selector.byteLength && sha(selected) === state.selector.exactOldAtomSha256 && selected.equals(Buffer.from(state.selector.exactOldAtomUtf8Base64, 'base64'));
  }
  if (program.oracleBody.op === 'SEMANTIC_EXTRACTION_EQ') {
    const value = Buffer.from(state.exactValueUtf8Base64, 'base64').toString('utf8'); const tokens = semanticTokens(value); const coverage = semanticCoverage(value, tokens, state.atomId);
    return canonical({ tokens, coverageSegments: coverage.segments, namedUses: coverage.namedUses, coveredByteLength: coverage.coveredByteLength, exactCoverage: coverage.exactCoverage }) === canonical(state.extractionProjection);
  }
  if (program.oracleBody.op === 'PACKAGE_ROOT_EQ') {
    const projection = [];
    for (const { ordinal, legacyFrozenLogicalPathUtf8Base64, sha256, bytes: byteCount, required } of state.members) {
      if (typeof legacyFrozenLogicalPathUtf8Base64 !== 'string') return false;
      const logicalPathBytes = Buffer.from(legacyFrozenLogicalPathUtf8Base64, 'base64');
      if (logicalPathBytes.toString('base64') !== legacyFrozenLogicalPathUtf8Base64) return false;
      const logicalPath = logicalPathBytes.toString('utf8');
      if (!Buffer.from(logicalPath, 'utf8').equals(logicalPathBytes)) return false;
      projection.push({ ordinal, logicalPath, sha256, bytes: byteCount, required });
    }
    const preimage = Buffer.from(`${state.domain}\n${canonical(projection)}`, 'utf8');
    return preimage.toString('base64') === state.preimageBase64 && sha(preimage) === state.expectedRoot;
  }
  if (program.oracleBody.op === 'CAS_SCHEDULE_REDUCE') return reduceCasSchedule(state);
  if (program.oracleBody.op === 'RESPONSE_LOSS_CLASSIFY') return classifyResponseLoss(state) === program.oracleBody.requiredClass;
  if (program.oracleBody.op === 'TYPED_FIELD_VALID') return isTypedField(state.value, state.field);
  return false;
}
function semanticTokens(value) {
  const pattern = /\b[A-Za-z][A-Za-z0-9]*=|\bB0[A-Z0-9-]{3,}\b|\b[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]+)+\b|\b[A-Z][A-Z0-9_-]{2,}\b/g;
  const tokens = [];
  for (const match of value.matchAll(pattern)) {
    const raw = match[0]; let tokenClass; let token = raw;
    if (raw.endsWith('=')) { tokenClass = 'RELATION'; token = raw.slice(0, -1); }
    else if (/^B0[A-Z0-9-]{3,}$/.test(raw)) tokenClass = 'ARTIFACT-ID';
    else if (/^[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]+)+$/.test(raw)) tokenClass = 'TYPE';
    else tokenClass = 'ENUM';
    tokens.push({ tokenClass, token, rawUtf8Base64: Buffer.from(raw).toString('base64'), startByteInclusive: Buffer.byteLength(value.slice(0, match.index)), endByteExclusive: Buffer.byteLength(value.slice(0, match.index + raw.length)) });
  }
  return tokens;
}
function semanticCoverage(value, tokens, atomId) {
  const valueBytes = Buffer.from(value); const segments = []; let cursor = 0;
  tokens.forEach((token, index) => {
    if (cursor < token.startByteInclusive) { const literal = valueBytes.subarray(cursor, token.startByteInclusive); segments.push({ segmentClass: 'LITERAL-TEXT', startByteInclusive: cursor, endByteExclusive: token.startByteInclusive, utf8Base64: literal.toString('base64'), sha256: sha(literal) }); }
    const semantic = valueBytes.subarray(token.startByteInclusive, token.endByteExclusive);
    segments.push({ segmentClass: 'MACHINE-SEMANTIC', tokenOrdinal: index + 1, tokenClass: token.tokenClass, token: token.token, startByteInclusive: token.startByteInclusive, endByteExclusive: token.endByteExclusive, utf8Base64: semantic.toString('base64'), sha256: sha(semantic) }); cursor = token.endByteExclusive;
  });
  if (cursor < valueBytes.length) { const literal = valueBytes.subarray(cursor); segments.push({ segmentClass: 'LITERAL-TEXT', startByteInclusive: cursor, endByteExclusive: valueBytes.length, utf8Base64: literal.toString('base64'), sha256: sha(literal) }); }
  const rebuilt = Buffer.concat(segments.map((segment) => Buffer.from(segment.utf8Base64, 'base64')));
  const namedUses = tokens.map((token, index) => ({ namedUseId: deterministicId('B0V6-NAMED-USE', 'CONNECT-B0-V6-NAMED-USE-ID-V1', { atomId, index, tokenClass: token.tokenClass, token: token.token, start: token.startByteInclusive, end: token.endByteExclusive }), atomId, tokenOrdinal: index + 1, edgeClass: token.tokenClass === 'RELATION' ? 'RELATION-NAMES-VALUE' : token.tokenClass === 'ARTIFACT-ID' ? 'NAMES-ARTIFACT' : token.tokenClass === 'TYPE' ? 'NAMES-TYPE' : 'NAMES-ENUM', sourceNode: `Atom:${atomId}`, targetNode: `${token.tokenClass}:${token.token}`, sourceSpan: { startByteInclusive: token.startByteInclusive, endByteExclusive: token.endByteExclusive } }));
  return { segments, namedUses, coveredByteLength: rebuilt.length, exactCoverage: rebuilt.equals(valueBytes) };
}
function selectorReductionProjection(fieldBytes, occurrences, order) {
  const byId = new Map(occurrences.map((item) => [item.occurrenceId, item]));
  const selected = order.map((id) => byId.get(id));
  if (selected.some((item) => !item)) throw new Error('unknown selector occurrence');
  const intervals = selected.map((item) => [item.startByteWithinField, item.endByteWithinField]).sort((left, right) => left[0] - right[0] || right[1] - left[1]);
  const merged = [];
  for (const interval of intervals) {
    const tail = merged.at(-1);
    if (!tail || interval[0] > tail[1]) merged.push([...interval]); else tail[1] = Math.max(tail[1], interval[1]);
  }
  const activeRemainderSegments = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (cursor < start) { const segment = fieldBytes.subarray(cursor, start); activeRemainderSegments.push({ startByteWithinField: cursor, endByteWithinField: start, utf8Base64: segment.toString('base64'), sha256: sha(segment) }); }
    cursor = Math.max(cursor, end);
  }
  if (cursor < fieldBytes.length) { const segment = fieldBytes.subarray(cursor); activeRemainderSegments.push({ startByteWithinField: cursor, endByteWithinField: fieldBytes.length, utf8Base64: segment.toString('base64'), sha256: sha(segment) }); }
  return { activeRemainderSegments, replacementIds: [...new Set(selected.map((item) => item.replacementId))].sort(), consumedOccurrenceIds: selected.map((item) => item.occurrenceId).sort() };
}

const manifest = load(paths.manifest);
const registry = load(paths.registry);
const sourceIndex = load(paths.sourceIndex);
const crosswalk = load(paths.crosswalk);
const vectorIndex = load(paths.vectors);
const vectorShards = paths.vectorShards.map(load);
const vectors = {
  ...vectorIndex,
  fixtures: vectorShards.flatMap((shard) => shard.fixtures),
  vectors: vectorShards.flatMap((shard) => shard.vectors),
  domainMutationCoverageMatrix: vectorShards.flatMap((shard) => shard.domainMutationCoverageMatrix),
};
const subject = bytes(paths.subject);
check(publicLocatorViolations([registry, sourceIndex, crosswalk, vectorIndex, ...vectorShards, manifest]).length === 0, 'ALL-STRUCTURED-PUBLIC-LOCATORS-REPO-RELATIVE', canonical(publicLocatorViolations([registry, sourceIndex, crosswalk, vectorIndex, ...vectorShards, manifest])));

check(manifest.memberCount === PACKAGE_MEMBER_COUNT && manifest.members.length === PACKAGE_MEMBER_COUNT, 'MANIFEST-MEMBER-DENOMINATOR');
check(manifest.members.every((member, index) => member.ordinal === index + 1 && member.required === true), 'MANIFEST-ORDINALS');
check(new Set(manifest.members.map((member) => member.logicalPath)).size === PACKAGE_MEMBER_COUNT, 'MANIFEST-PATH-UNIQUE');
const expectedPackagePaths = [paths.registry, paths.subject, paths.sourceIndex, paths.crosswalk, paths.vectors, ...paths.vectorShards, paths.generator, paths.readerA, paths.readerB];
check(canonical([...manifest.members.map((member) => member.logicalPath)].sort()) === canonical([...expectedPackagePaths].sort()), 'MANIFEST-EXACT-PACKAGE-MEMBER-SET');
for (const member of manifest.members) {
  check(member.logicalPath.startsWith('docs/') && !member.logicalPath.startsWith('web/') && !member.logicalPath.startsWith('/') && !member.logicalPath.includes('..'), 'MANIFEST-REPO-RELATIVE-PATH', member.logicalPath);
  const actual = bytes(member.logicalPath); check(actual.length === member.bytes && sha(actual) === member.sha256, 'MANIFEST-MEMBER-BYTES', member.logicalPath);
  const stat = fs.lstatSync(member.logicalPath); check(stat.isFile() && !stat.isSymbolicLink(), 'MANIFEST-MEMBER-REGULAR-NONSYMLINK', member.logicalPath);
  check(actual.length < MAX_PUBLIC_GIT_FILE_BYTES, 'PUBLIC-GIT-MEMBER-BELOW-50-MIB', `${member.logicalPath}:${actual.length}`);
}
const projection = manifest.members.map(({ ordinal, logicalPath, sha256, bytes: memberBytes, required }) => ({ ordinal, logicalPath, sha256, bytes: memberBytes, required }));
const preimage = Buffer.from(`${manifest.packageContentRootAlgorithm.domainUtf8}\n${canonical(projection)}`);
check(Buffer.from(manifest.packageRootPreimageBase64, 'base64').equals(preimage), 'MANIFEST-PREIMAGE');
check(sha(preimage) === manifest.packageContentRoot, 'MANIFEST-PACKAGE-ROOT');

const { registryContentRoot, ...registryBase } = registry;
check(domainRoot('CONNECT-B0-V6-NORMATIVE-REGISTRY-CONTENT-V1', registryBase) === registryContentRoot, 'REGISTRY-CONTENT-ROOT');
check(registry.blockerDenominator.activeBlockerCount === 31 && registry.blockerClosureControls.length === 31, 'BLOCKER-DENOMINATOR');
check(new Set(registry.blockerClosureControls.map((item) => item.findingId)).size === 31 && new Set(registry.blockerClosureControls.map((item) => item.noMergeKey)).size === 31, 'BLOCKER-NO-MERGE-IDENTITY');
check(registry.preservedClosedFinding.findingId === 'B0V4-HR-F012' && registry.preservedClosedFinding.additionalClosureCredit === 0, 'PRESERVED-CLOSED-F012');
check(registry.blockerClosureControls.every((control) => control.axes.length === 5 && control.axes.every(evaluateAxis)), 'CONTROL-AXES-EXECUTE');
check(registry.inheritedSelectorReducer.selectorOccurrenceCount === 128 && registry.inheritedSelectorReducer.selectorBearingFieldCount === 119 && registry.inheritedSelectorReducer.inheritedOverlapPairCount === 10 && registry.inheritedSelectorReducer.fieldReductions.every((row) => row.confluenceDecision === true && new Set(row.orderResults.map((item) => item.projectionRoot)).size === 1), 'INHERITED-SELECTOR-CONFLUENCE');
const selectorOccurrenceById = new Map(registry.inheritedSelectorReducer.selectorOccurrences.map((item) => [item.occurrenceId, item]));
for (const reduction of registry.inheritedSelectorReducer.fieldReductions) {
  const fieldBytes = Buffer.from(reduction.exactFieldUtf8Base64, 'base64');
  const sourceBytes = bytes(reduction.sourceField.logicalPath).subarray(reduction.sourceField.startByteInclusive, reduction.sourceField.endByteExclusive);
  check(fieldBytes.equals(sourceBytes) && sha(fieldBytes) === reduction.exactFieldSha256 && reduction.reducerProgram.operations.length === 6 && reduction.reducerProgram.operations.every((operation, index) => operation.ordinal === index + 1 && typeof operation.op === 'string'), 'SELECTOR-REDUCER-EXACT-TYPED-PROGRAM', reduction.fieldLocator);
  const occurrences = reduction.selectorOccurrenceIds.map((id) => selectorOccurrenceById.get(id));
  const canonicalProjection = selectorReductionProjection(fieldBytes, occurrences, [...reduction.selectorOccurrenceIds].sort());
  check(canonical(canonicalProjection) === canonical(reduction.canonicalProjection), 'SELECTOR-REDUCER-CANONICAL-PROJECTION', reduction.fieldLocator);
  for (const orderResult of reduction.orderResults) check(domainRoot('CONNECT-B0-V6-INHERITED-SELECTOR-REDUCTION-PROJECTION-V1', selectorReductionProjection(fieldBytes, occurrences, orderResult.order)) === orderResult.projectionRoot, 'SELECTOR-REDUCER-ALL-ORDERS', reduction.fieldLocator);
}
check(registry.predecessorSemanticNonWeakening.rowCount === 10 && registry.predecessorSemanticNonWeakening.rows.every((row) => row.nonWeakeningDecision === true && row.beforeState.mandatorySafetyIntents.every((intent) => row.afterState.mandatorySafetyIntents.includes(intent)) && row.beforeState.prefixSha256 === row.afterState.retainedPrefixSha256 && row.beforeState.suffixSha256 === row.afterState.retainedSuffixSha256), 'PREDECESSOR-SEMANTIC-NONWEAKENING');
for (const row of registry.predecessorSemanticNonWeakening.rows) {
  const artifact = bytes(row.sourceMember.logicalPath); const member = artifact.subarray(row.sourceMember.startByteInclusive, row.sourceMember.endByteExclusive);
  const atom = member.subarray(row.atomSelector.startByteWithinMember, row.atomSelector.endByteWithinMember);
  check(sha(artifact) === row.sourceMember.artifactSha256 && sha(member) === row.sourceMember.memberSha256 && sha(atom) === row.atomSelector.exactOldAtomSha256 && atom.equals(Buffer.from(row.atomSelector.exactOldAtomUtf8Base64, 'base64')) && sha(member.subarray(0, row.atomSelector.startByteWithinMember)) === row.beforeState.prefixSha256 && sha(member.subarray(row.atomSelector.endByteWithinMember)) === row.beforeState.suffixSha256 && row.reducerProgram.operations.length === 6 && row.reducerProgram.operations.every((operation, index) => operation.ordinal === index + 1 && typeof operation.op === 'string'), 'NONWEAKENING-EXACT-TYPED-REDUCER', row.rowId);
}

const supersessions = registry.typedSupersessionEngine.rows;
check(supersessions.length === 31 && registry.typedSupersessionEngine.overlapCount === 0, 'SUPERSESSION-DENOMINATOR');
let overlap = 0;
for (let left = 0; left < supersessions.length; left += 1) for (let right = left + 1; right < supersessions.length; right += 1) {
  const a = supersessions[left].sourceFinding; const b = supersessions[right].sourceFinding;
  if (a.artifactSha256 === b.artifactSha256 && Math.max(a.startByteInclusive, b.startByteInclusive) < Math.min(a.endByteExclusive, b.endByteExclusive)) overlap += 1;
}
check(overlap === 0, 'SUPERSESSION-NO-OVERLAP');
check(supersessions.every((row) => row.beforeState.mandatorySafetyIntents.every((intent) => row.afterState.mandatorySafetyIntents.includes(intent))), 'SUPERSESSION-NONWEAKENING');

const roles = registry.roleAndAppointmentAuthority;
check(roles.roleCount === 21 && roles.roles.length === 21 && roles.pairCount === 210 && roles.pairMatrix.length === 210, 'ROLE-PAIR-DENOMINATOR');
check(new Set(roles.planningAdmittedAppointments.map((item) => item.effectiveControllerRoot)).size === 21, 'APPOINTMENT-CONTROLLER-DISTINCT');
check(['AuthorityOwner', 'AcceptanceWriter', 'Witness1', 'Witness2', 'WitnessQuorum', 'EvidenceLedgerWriter'].every((role) => roles.roles.includes(role)), 'SOLE-PRODUCER-ROLE-CLOSURE');
check(registry.acceptanceSoleProducerRegistry.assignmentCount === 156 && registry.acceptanceSoleProducerRegistry.acceptanceProducerRoleCount === 12 && registry.acceptanceSoleProducerRegistry.assignments.every((item) => item.assignmentCardinality === 1 && item.soleProducer === true && item.producerAppointmentRoot), 'ACCEPTANCE-SOLE-PRODUCER-ASSIGNMENTS');
const acceptanceFieldById = new Map(registry.acceptanceEnvelopeSchema.fields.map((field) => [field.fieldId, field]));
check(new Set(registry.acceptanceSoleProducerRegistry.assignments.map((item) => item.fieldId)).size === 156 && registry.acceptanceSoleProducerRegistry.assignments.every((item) => acceptanceFieldById.get(item.fieldId)?.producerRole === item.producerRole) && canonical([...new Set(registry.acceptanceEnvelopeSchema.fields.map((field) => field.producerRole))].sort()) === canonical([...registry.acceptanceSoleProducerRegistry.acceptanceProducerRoles].sort()), 'SOLE-PRODUCER-COMPLETE-SET-EQUALITY');
check(registry.independenceProfileRegistry.profileCount === 9 && registry.independenceProfileRegistry.planningAdmittedProfiles.every((item) => item.planningAdmittedInstanceRoot && item.operationalCurrentInstanceRoot === null), 'INDEPENDENCE-PROFILES');
check(registry.independenceProfileRegistry.planningAdmittedProfiles.every((item) => item.implementationRootA !== item.implementationRootB && item.transitiveDependencyRootA !== item.transitiveDependencyRootB && item.runtimeRootA !== item.runtimeRootB && item.authorControllerRootA !== item.authorControllerRootB && item.executionContextRootA !== item.executionContextRootB && item.resultRootA !== item.resultRootB && item.resultDisclosedBeforeBothSubmissions === false && item.operational === false), 'INDEPENDENCE-PROFILE-FULL-PAIR-SEPARATION');
check(registry.witnessAndProofIndependence.planningAdmittedAcknowledgements.length === 2 && new Set(registry.witnessAndProofIndependence.planningAdmittedAcknowledgements.map((item) => item.effectiveControllerRoot)).size === 2 && new Set(registry.witnessAndProofIndependence.planningAdmittedAcknowledgements.map((item) => item.checkpointRoot)).size === 1 && registry.witnessAndProofIndependence.twoWitnessIndependenceProgram.programRoot, 'TWO-WITNESS-ADMITTED-INDEPENDENCE');

check(registry.priorInterfaceRegistry.interfaceCount === 17 && registry.priorInterfaceRegistry.interfaces.every((item) => item.interfaceSchemaRoot && item.planningAdmittedInstance.instanceRoot && item.planningAdmittedInstance.validationReceiptRoot && item.planningAdmittedInstance.actualInputRoot === item.planningAdmittedInstance.expectedInputRoot && item.planningAdmittedInstance.actualOutputRoot === item.planningAdmittedInstance.expectedOutputRoot && item.planningAdmittedInstance.providerInstanceRoot === null && item.planningAdmittedInstance.availableAtOrdinal < item.planningAdmittedInstance.providerConstructionOrdinal && item.operationalCurrentInstanceRoot === null), 'PRIOR-INTERFACE-INSTANCES');
check(registry.permitAndTemporalAuthority.permitSchemas.length === 3 && registry.permitAndTemporalAuthority.permitSchemas.every((schema) => schema.fields.every((field) => field.name && field.type && field.cardinality) && schema.planningAdmittedInstance.instanceRoot && schema.operationalCurrentInstanceRoot === null) && registry.permitAndTemporalAuthority.permitLifecycleProgram.transitions.length === 8 && registry.permitAndTemporalAuthority.permitRuleMutationMatrix.length === 10, 'TYPED-PERMIT-SCHEMAS');
check(registry.genesisFoundation.memberCount === 33 && new Set(registry.genesisFoundation.classSpecificSchemas.map((item) => item.schemaRoot)).size === 33 && registry.genesisFoundation.classSpecificSchemas.every((item) => item.classSpecificFieldCount >= 3 && item.planningAdmittedInstance.instanceRoot && item.planningAdmissionReceipt.receiptRoot && item.operationalCurrentInstanceRoot === null), 'GENESIS-CLASS-SPECIFIC-INSTANCES');
check(registry.genesisFoundation.authorityGraph.nodes.length === 35 && registry.genesisFoundation.planningExternalAdmission.foundationMemberRoots.length === 33 && registry.genesisFoundation.firstGenesisPermitTransitionProgram.operations.length === 6 && registry.genesisFoundation.firstGenesisPermitTransitionProgram.forbiddenWrites.length === 6 && registry.genesisFoundation.externalOperationalAdmissionRoot === null && registry.genesisFoundation.firstOperationalGenesisPermitRoot === null, 'GENESIS-AUTHORITY-GRAPH');
check(isAcyclic(registry.genesisFoundation.authorityGraph.nodes, registry.genesisFoundation.authorityGraph.edges) && registry.genesisFoundation.authorityGraph.edges.every((edge) => edge.source !== edge.target), 'GENESIS-AUTHORITY-DAG-ACYCLIC');
check(registry.recoveryQuorum.threshold === 3 && registry.recoveryQuorum.memberSchemas.length === 5 && registry.recoveryQuorum.witnessSchemas.length === 2 && new Set([...registry.recoveryQuorum.memberSchemas, ...registry.recoveryQuorum.witnessSchemas].map((item) => item.planningAdmittedInstance.effectiveControllerRoot)).size === 7 && registry.recoveryQuorum.planningAdmittedAttempt.memberAcknowledgementRoots.length === 3 && registry.recoveryQuorum.planningAdmittedAttempt.witnessAcknowledgementRoots.length === 2 && registry.recoveryQuorum.lifecycleProgram.transitions.length === 7, 'RECOVERY-TYPED-DISTINCT');
check(registry.recoveryQuorum.lifecycleProgram.transitions.every((transition, index) => transition.ordinal === index + 1 && typeof transition.precondition === 'object' && (!transition.writes || transition.writes.every((write) => typeof write === 'object' && typeof write.op === 'string'))), 'RECOVERY-EXECUTABLE-NONLABEL-TRANSITIONS');
check(registry.detachedAcceptanceSchema.schemaRoot && registry.detachedAcceptanceSchema.planningAdmittedInstanceRoot && registry.detachedAcceptanceSchema.planningAdmittedInstance.instanceRoot === registry.detachedAcceptanceSchema.planningAdmittedInstanceRoot && registry.detachedAcceptanceSchema.planningValidationReceipt.receiptRoot && registry.detachedAcceptanceSchema.operationalCurrentInstanceRoot === null, 'DETACHED-ACCEPTANCE-SCHEMA');

check(registry.mutableHeadRegistry.objectClassCount === 94 && registry.mutableHeadRegistry.headCount === 36, 'HEAD-DENOMINATOR');
check(registry.mutableHeadRegistry.objectToHead.every((row) => row.membershipPath.length === 2 && row.membershipPath[0].targetNode === row.membershipPath[1].sourceNode && row.membershipPath.every((edge) => edge.sourceNode !== edge.targetNode) && row.membershipPath[1].targetNode === 'Head:SecurityUniverseHead'), 'HEAD-PATHS-ACYCLIC');
check(registry.acceptanceCas.transactionProgram.operations.length === 15 && registry.acceptanceCas.crashMatrix.length === 16 && registry.acceptanceCas.twoWriterInterleavingClasses.length === 6 && registry.acceptanceCas.mutationMatrix.length === 13 && registry.acceptanceCas.responseLossRecoveryProgram.programRoot && registry.acceptanceCas.transactionProgram.programRoot, 'CAS-PROGRAM-CRASH-MATRIX');
check(registry.acceptanceCas.transactionProgram.operations.every((operation, index) => operation.ordinal === index + 1 && operation.typed === true && typeof operation.op === 'string') && typeof registry.acceptanceCas.transactionProgram.stateTransitionSemantics === 'object' && typeof registry.acceptanceCas.transactionProgram.crashSemantics === 'object' && !Object.hasOwn(registry.acceptanceCas.transactionProgram.operations[8], 'predicates'), 'CAS-TYPED-NONLABEL-AST');
check(registry.acceptanceCas.twoWriterInterleavingClasses.every((row) => Array.isArray(row.schedule) && row.schedule.every((event) => typeof event === 'object') && reduceCasSchedule({ schedule: row.schedule }) && row.scheduleRoot) && registry.acceptanceCas.responseLossRecoveryProgram.operations[3].orderedRules.length === 6 && registry.acceptanceCas.responseLossRecoveryProgram.operations[3].orderedRules.every((rule) => typeof rule === 'object') && registry.acceptanceCas.mutationMatrix.every((row) => !Object.hasOwn(row.domainState, 'predicateSatisfied')), 'CAS-EXECUTABLE-SCHEDULE-READBACK');
check(registry.acceptanceEnvelopeSchema.fieldCount === 156 && registry.acceptanceEnvelopeSchema.completeOutputDenominator.outputCount === 127 && registry.outputRegistry.length === 127, 'ACCEPTANCE-OUTPUT-DENOMINATOR');
check(registry.outputRegistry.every((row) => domainRoot('CONNECT-B0-V6-PLANNING-OUTPUT-ARTIFACT-V1', row.planningArtifact) === row.planningArtifactRoot && domainRoot('CONNECT-B0-V6-PLANNING-OUTPUT-VALIDATION-RECEIPT-V1', row.planningValidationReceipt) === row.planningValidationReceiptRoot && row.operationalImplementationRoot === null && row.implementationRoot === null && row.authorityCredit === 0 && row.acceptanceCredit === 0), 'ALL-127-PLANNING-OUTPUTS-MATERIALIZED-OPERATIONAL-ZERO');
check(registry.acceptanceEnvelopeSchema.completeOutputDenominator.mutationMatrixCount === 508 && registry.acceptanceEnvelopeSchema.headInvalidationMatrixCount === 36 && registry.acceptanceEnvelopeSchema.headInvalidationMatrix.flatMap((row) => row.dependentFieldIds).length === 156, 'ACCEPTANCE-FULL-MUTATION-DENOMINATORS');
check(registry.acceptanceEnvelopeSchema.fields.some((field) => field.name === 'all127OutputsRoot') && !registry.acceptanceEnvelopeSchema.fields.some((field) => field.name === 'all84OutputsRoot'), 'ACCEPTANCE-ALL127-FIELD');
check(!JSON.stringify(registry.acceptanceEnvelopeSchema.fields).includes('B0V4-HEAD'), 'ACCEPTANCE-V6-HEAD-INVALIDATION');
check(registry.currentAuthorityState.B0 === 'ABSENT' && registry.currentAuthorityState.Gate29 === 'BLOCKED' && registry.currentAuthorityState.developmentFreeze === 'ACTIVE', 'ZERO-AUTHORITY-STATE');

check([...subject.toString('utf8').matchAll(/^## \d+\.\d+ `B0V6REQ-\d{3}`/gm)].length === 127, 'SUBJECT-REQUIREMENT-COUNT');
check([...subject.toString('utf8').matchAll(/^\d+\.\d+\.\d+ `(statement|threatCauseImpact|requiredProof|dependencies|sourceBasis)`: /gm)].length === 635, 'SUBJECT-FIELD-COUNT');

const { indexContentRoot, ...indexBase } = sourceIndex;
check(domainRoot('CONNECT-B0-V6-SOURCE-INDEX-CONTENT-V1', indexBase) === indexContentRoot, 'SOURCE-INDEX-CONTENT-ROOT');
check(sourceIndex.absolutePathCount === 0 && sourceIndex.extraRepositoryPrefixCount === 0 && sourceIndex.collapsedSpanCount === 0, 'SOURCE-INDEX-PATH-SPAN-POLICY');
let indexedMembers = 0;
for (const artifact of sourceIndex.artifacts) {
  check(artifact.logicalPath.startsWith('docs/') && !artifact.logicalPath.startsWith('web/') && !artifact.logicalPath.includes('..'), 'SOURCE-ARTIFACT-PATH', artifact.logicalPath);
  const artifactBytes = bytes(artifact.logicalPath); check(artifactBytes.length === artifact.bytes && sha(artifactBytes) === artifact.sha256, 'SOURCE-ARTIFACT-BYTES', artifact.alias);
  check(artifact.memberCount === artifact.members.length, 'SOURCE-MEMBER-DECLARED-COUNT', artifact.alias);
  for (const member of artifact.members) { indexedMembers += 1; const selected = artifactBytes.subarray(member.startByteInclusive, member.endByteExclusive); check(selected.length === member.byteLength && sha(selected) === member.sha256 && member.byteLength > 1, 'SOURCE-MEMBER-SPAN', `${artifact.alias}::${member.locator}`); }
}
check(indexedMembers === sourceIndex.memberCount, 'SOURCE-MEMBER-TOTAL');

const { crosswalkContentRoot, ...crosswalkBase } = crosswalk;
check(domainRoot('CONNECT-B0-V6-CROSSWALK-CONTENT-V1', crosswalkBase) === crosswalkContentRoot, 'CROSSWALK-CONTENT-ROOT');
check(crosswalk.activeBlockerDenominator === 31 && crosswalk.blockerClosureRows.length === 31, 'CROSSWALK-BLOCKERS');
check(crosswalk.inheritedV5RequirementCount === 96 && crosswalk.inheritedV5FieldCount === 480 && crosswalk.authoritativeInheritedByteAtomCount === 900, 'CROSSWALK-INHERITANCE-DENOMINATORS');
for (const row of crosswalk.inheritedV5Requirements) for (const field of row.fields) {
  const artifact = sourceIndex.artifacts.find((item) => item.alias === field.sourceField.alias); const artifactBytes = bytes(artifact.logicalPath);
  const selected = artifactBytes.subarray(field.sourceField.startByteInclusive, field.sourceField.endByteExclusive);
  check(selected.equals(Buffer.from(field.exactOldValue, 'utf8')) && Buffer.from(field.exactOldValueUtf8Base64, 'base64').equals(selected) && sha(selected) === field.exactOldValueSha256, 'INHERITED-V5-EXACT-FIELD', field.sourceField.locator);
}
check(crosswalk.semanticExtractionRecordCount === 900 && crosswalk.unclassifiedSemanticTokenCount === 0, 'SEMANTIC-EXTRACTION-DENOMINATOR');
for (let index = 0; index < crosswalk.authoritativeInheritedByteAtoms.length; index += 1) {
  const atom = crosswalk.authoritativeInheritedByteAtoms[index]; const extraction = crosswalk.semanticExtraction[index]; const tokens = semanticTokens(atom.exactValue);
  const sourceArtifact = sourceIndex.artifacts.find((item) => item.alias === atom.sourceField.alias); const sourceArtifactBytes = bytes(sourceArtifact.logicalPath);
  const exactSourceBytes = sourceArtifactBytes.subarray(atom.sourceField.startByteInclusive, atom.sourceField.endByteExclusive);
  check(atom.sourceField.logicalPath === sourceArtifact.logicalPath && sha(sourceArtifactBytes) === atom.sourceField.artifactSha256 && exactSourceBytes.equals(Buffer.from(atom.exactValue, 'utf8')) && exactSourceBytes.length === atom.sourceField.byteLength && sha(exactSourceBytes) === atom.exactValueSha256 && atom.exactValueSha256 === atom.sourceField.memberSha256, 'ALL-900-INHERITED-ATOMS-EXACT-SOURCE-BYTES', atom.atomId);
  const coverage = semanticCoverage(atom.exactValue, tokens, atom.atomId);
  check(extraction.atomId === atom.atomId && canonical(tokens) === canonical(extraction.tokens) && canonical(coverage.segments) === canonical(extraction.coverageSegments) && canonical(coverage.namedUses) === canonical(extraction.namedUses) && coverage.exactCoverage === true && extraction.exactCoverage === true && domainRoot('CONNECT-B0-V6-SEMANTIC-TOKEN-STREAM-V1', tokens) === extraction.tokenStreamRoot && extraction.unclassifiedTokens.length === 0, 'SEMANTIC-TOKEN-STREAM', atom.atomId);
}
check(crosswalk.activeSemanticGraph.authoritativeAtomCount === 900 && crosswalk.activeSemanticGraph.extractionRecordCount === 900 && crosswalk.activeSemanticGraph.namedUseCount === crosswalk.activeNamedUseCount && new Set(crosswalk.activeSemanticGraph.namedUses.map((item) => item.namedUseId)).size === crosswalk.activeNamedUseCount && crosswalk.activeSemanticGraph.duplicateNamedUseCount === 0 && crosswalk.activeSemanticGraph.unclassifiedMachineTokenCount === 0, 'ACTIVE-SEMANTIC-NAMEDUSE-GRAPH');

const { vectorCorpusContentRoot, ...vectorIndexBase } = vectorIndex;
check(domainRoot('CONNECT-B0-V6-VECTOR-CORPUS-CONTENT-V1', vectorIndexBase) === vectorCorpusContentRoot, 'VECTOR-CORPUS-CONTENT-ROOT');
check(!Object.hasOwn(vectorIndex, 'fixtures') && !Object.hasOwn(vectorIndex, 'vectors') && !Object.hasOwn(vectorIndex, 'domainMutationCoverageMatrix'), 'VECTOR-INDEX-CONTAINS-DESCRIPTORS-NOT-BULK-ARRAYS');
check(vectorIndex.vectorShardCount === VECTOR_SHARD_COUNT && vectorIndex.vectorShardDescriptors.length === VECTOR_SHARD_COUNT && vectorShards.length === VECTOR_SHARD_COUNT && vectorIndex.maximumPublicGitMemberBytesExclusive === MAX_PUBLIC_GIT_FILE_BYTES && vectorIndex.everyVectorShardBelowMaximum === true, 'VECTOR-SHARD-DENOMINATOR-POLICY');
check(domainRoot('CONNECT-B0-V6-VECTOR-CORPUS-SHARD-SET-V1', vectorIndex.vectorShardDescriptors) === vectorIndex.vectorShardSetRoot && vectorIndex.vectorShardSetRoot === manifest.portableCausalVectorCorpusShardSetRoot && canonical(vectorIndex.vectorShardDescriptors) === canonical(manifest.portableCausalVectorCorpusShardDescriptors), 'VECTOR-SHARD-SET-ROOT-MANIFEST-BINDING');
for (let index = 0; index < VECTOR_SHARD_COUNT; index += 1) {
  const descriptor = vectorIndex.vectorShardDescriptors[index]; const shard = vectorShards[index]; const logicalPath = paths.vectorShards[index]; const actual = bytes(logicalPath);
  const expectedStart = Math.floor((index * 7430) / VECTOR_SHARD_COUNT) + 1; const expectedEnd = Math.floor(((index + 1) * 7430) / VECTOR_SHARD_COUNT);
  const { shardContentRoot, ...shardBase } = shard;
  check(descriptor.shardOrdinal === index + 1 && descriptor.shardCount === VECTOR_SHARD_COUNT && descriptor.logicalPath === logicalPath && descriptor.startVectorOrdinalInclusive === expectedStart && descriptor.endVectorOrdinalInclusive === expectedEnd && descriptor.vectorCount === expectedEnd - expectedStart + 1 && descriptor.fixtureCount === descriptor.vectorCount, 'VECTOR-SHARD-CONTIGUOUS-RANGE', logicalPath);
  check(actual.length === descriptor.bytes && sha(actual) === descriptor.sha256 && actual.length < MAX_PUBLIC_GIT_FILE_BYTES && descriptor.bytes < MAX_PUBLIC_GIT_FILE_BYTES, 'VECTOR-SHARD-PUBLIC-GIT-SIZE-HASH', `${logicalPath}:${actual.length}`);
  check(domainRoot('CONNECT-B0-V6-VECTOR-CORPUS-SHARD-CONTENT-V1', shardBase) === shardContentRoot && shardContentRoot === descriptor.shardContentRoot, 'VECTOR-SHARD-CONTENT-ROOT', logicalPath);
  check(shard.shardOrdinal === descriptor.shardOrdinal && shard.shardCount === descriptor.shardCount && shard.startVectorOrdinalInclusive === descriptor.startVectorOrdinalInclusive && shard.endVectorOrdinalInclusive === descriptor.endVectorOrdinalInclusive && shard.fixtureCount === shard.fixtures.length && shard.vectorCount === shard.vectors.length && shard.domainMutationVectorCount === shard.domainMutationCoverageMatrix.length, 'VECTOR-SHARD-DESCRIPTOR-PAYLOAD-PARITY', logicalPath);
  const shardVectorIds = new Set(shard.vectors.map((vector) => vector.vectorId));
  check(shard.fixtures.every((fixture, offset) => fixture.fixtureId === shard.vectors[offset]?.fixtureId) && shard.domainMutationCoverageMatrix.every((row) => shardVectorIds.has(row.vectorId)), 'VECTOR-SHARD-FIXTURE-VECTOR-COVERAGE-COLOCATION', logicalPath);
  const manifestMember = manifest.members.find((member) => member.logicalPath === logicalPath);
  check(manifestMember?.sha256 === descriptor.sha256 && manifestMember?.bytes === descriptor.bytes && manifestMember?.required === true, 'VECTOR-SHARD-MANIFEST-MEMBER-BINDING', logicalPath);
}
check(vectorIndex.largestVectorShardBytes === Math.max(...vectorIndex.vectorShardDescriptors.map((descriptor) => descriptor.bytes)), 'VECTOR-SHARD-LARGEST-BYTE-COUNT');
check(domainRoot('CONNECT-B0-V6-COMPLETE-FIXTURE-SEQUENCE-V1', vectors.fixtures.map((fixture, index) => ({ ordinal: index + 1, fixtureId: fixture.fixtureId, fixtureSha256: fixture.fixtureSha256, byteLength: fixture.byteLength }))) === vectorIndex.completeFixtureSequenceRoot, 'VECTOR-COMPLETE-FIXTURE-SEQUENCE-ROOT');
check(domainRoot('CONNECT-B0-V6-COMPLETE-VECTOR-SEQUENCE-V1', vectors.vectors.map((vector, index) => ({ ordinal: index + 1, vectorId: vector.vectorId, fixtureId: vector.fixtureId, programRoot: vector.programRoot }))) === vectorIndex.completeVectorSequenceRoot, 'VECTOR-COMPLETE-VECTOR-SEQUENCE-ROOT');
check(domainRoot('CONNECT-B0-V6-COMPLETE-DOMAIN-MUTATION-COVERAGE-MATRIX-V1', vectors.domainMutationCoverageMatrix) === vectorIndex.completeDomainMutationCoverageMatrixRoot, 'VECTOR-COMPLETE-DOMAIN-MATRIX-ROOT');
check(domainRoot('CONNECT-B0-V6-REQUIRED-DOMAIN-VECTOR-FAMILY-MAP-V1', vectorIndex.requiredDomainVectorFamilies) === vectorIndex.requiredDomainVectorFamiliesRoot, 'VECTOR-REQUIRED-FAMILY-MAP-ROOT');
check(vectors.fixtureCount === 7430 && vectors.vectorCount === 7430 && vectors.fixtures.length === 7430 && vectors.vectors.length === 7430 && vectors.baseFiveFieldVectorCount === 635 && vectors.domainMutationVectorCount === 6795 && vectors.domainMutationCoverageMatrix.length === 6795 && vectors.domainMutationUniqueCreditKeyCount === 6795, 'VECTOR-DENOMINATOR');
const domainFindingFamilyKeys = new Set(vectors.domainMutationCoverageMatrix.map((item) => `${item.findingId}\u0000${item.family}`));
check(new Set(vectors.domainMutationCoverageMatrix.map((item) => item.findingId)).size === 31, 'DOMAIN-VECTORS-ALL-31-NO-MERGE-FINDINGS');
for (const control of registry.blockerClosureControls) check(control.requiredDomainVectorFamilies.length > 0 && control.requiredDomainVectorFamilies.every((family) => domainFindingFamilyKeys.has(`${control.findingId}\u0000${family}`)), 'CONTROL-REQUIRED-DOMAIN-FAMILIES', control.findingId);
for (const row of crosswalk.blockerClosureRows) {
  const control = registry.blockerClosureControls.find((item) => item.findingId === row.sourceFindingId);
  check(canonical(row.requiredDomainVectorFamilies) === canonical(control.requiredDomainVectorFamilies) && row.requiredDomainVectorFamilies.every((family) => domainFindingFamilyKeys.has(`${row.sourceFindingId}\u0000${family}`)), 'CROSSWALK-NO-MERGE-DOMAIN-FAMILIES', row.sourceFindingId);
}
const fixtureMap = new Map(vectors.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
let planningPass = 0;
for (const vector of vectors.vectors) {
  const fixture = fixtureMap.get(vector.fixtureId); const { fixtureBytesBase64, fixtureSha256, byteLength, ...fixtureBody } = fixture;
  const fixtureBytes = Buffer.from(canonical(fixtureBody));
  check(sha(fixtureBytes) === fixtureSha256 && fixtureBytes.toString('base64') === fixtureBytesBase64 && fixtureBytes.length === byteLength, 'VECTOR-FIXTURE-ROOT', fixture.fixtureId);
  check(domainRoot('CONNECT-B0-V6-PORTABLE-VECTOR-PROGRAM-V1', vector.program) === vector.programRoot, 'VECTOR-PROGRAM-ROOT', vector.vectorId);
  const control = clone(fixture.domainState); const controlDecision = evaluateProgram(vector.program, control); const mutated = clone(control);
  for (const operation of vector.program.operations) { check(operation.op === 'SET', 'VECTOR-OP-ENUM', vector.vectorId); setPointer(mutated, operation.path, operation.value); }
  const mutationDecision = evaluateProgram(vector.program, mutated);
  check(controlDecision === true && mutationDecision === false && vector.operationalObserved === null && vector.operationalEvidenceRoot === null, 'VECTOR-CAUSAL-TERMINATION', vector.vectorId);
  if (controlDecision && !mutationDecision) planningPass += 1;
}
check(planningPass === 7430 && vectors.planningExecutionCount === '7430/7430' && vectors.operationalVectorExecutionCount === '0/7430', 'VECTOR-PLANNING-PASS-OPERATIONAL-ZERO');

const report = {
  artifactId: 'CONNECT-B0-V6-QA-READER-A-REPORT-2026-08-30-G0', artifactClass: 'DETACHED-INDEPENDENT-STDLIB-QA-REPORT;NOT-AUTHORITY;NOT-ACCEPTANCE',
  readerId: 'B0V6-QA-READER-A-NODE-STDLIB', independence: 'DOES-NOT-IMPORT-OR-EXECUTE-PRODUCER-GENERATOR-OR-READER-B',
  readerSha256: sha(bytes('docs/planning/qa/b0-v6-qa-reader-a.mjs')), packageManifestSha256: sha(bytes(paths.manifest)), packageContentRoot: manifest.packageContentRoot,
  pass: errors.length === 0, errorCount: errors.length, errors, checkInvocationCount: checks.length, uniqueCheckClasses: [...new Set(checks)].length,
  counts: { blockers: 31, requirements: 127, fields: 635, outputs: 127, sourceArtifacts: sourceIndex.artifactCount, sourceMembers: sourceIndex.memberCount, authoritativeAtoms: 900, activeNamedUses: crosswalk.activeNamedUseCount, baseVectors: 635, domainMutationVectors: 6795, vectors: 7430, vectorShards: VECTOR_SHARD_COUNT, packageMembers: PACKAGE_MEMBER_COUNT, largestVectorShardBytes: vectorIndex.largestVectorShardBytes, planningVectorPass: planningPass, operationalVectors: 0, inheritedSelectors: 128, selectorBearingFields: 119, selectorOverlapPairs: 10, nonWeakeningRows: 10, genesisSchemas: 33, recoveryMembers: 5, recoveryWitnesses: 2, roles: 21, rolePairs: 210, heads: 36, mutableObjects: 94 },
  state: { authorityCredit: 0, acceptanceCredit: 0, B0: 'ABSENT', Gate29: 'BLOCKED', developmentFreeze: 'ACTIVE', repositoryVisibility: 'PUBLIC', freshIndependentHostileReview: 'PENDING' },
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
