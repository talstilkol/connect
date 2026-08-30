#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { assertRepoRelativePath, assertUnicodeScalarAndNfc, canonicalV6, parseCanonicalJsonBytes, prettyV6, rootV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS2_V3_PATHS,
  V3SchemaValidationError,
  makeCanonicalV3Report,
  validateClosedSchemaRegistryV3,
} from './trd2-v6-pass2-v3-core.mjs';

const [REGISTRY_PATH, REPORT_PATH] = TRD2_V6_PASS2_V3_PATHS;
const SCRIPT_PATH = 'scripts/verify-trd2-v6-canonical-v3-engine-a.mjs';
const PART_COUNT = 8;
const SAFE_MAX = Number.MAX_SAFE_INTEGER;
const SHA256_RE = /^[0-9a-f]{64}$/;
const COMMIT_RE = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const BASE64_CHUNK_CHAR_COUNT = 4096;

class EngineAError extends Error {
  constructor(terminal, message) { super(message); this.terminal = terminal; }
}

function fail(terminal, message) { throw new EngineAError(terminal, message); }
function plain(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function sorted(values) { return [...values].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))); }

function runGit(args) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function worktreePaths() {
  return runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0').filter(Boolean).map((record) => record.slice(3));
}

function assertWorktree(part) {
  const paths = worktreePaths();
  const expected = part === 1 ? [REGISTRY_PATH] : [REGISTRY_PATH, REPORT_PATH];
  if (canonicalV6(sorted(paths)) !== canonicalV6(sorted(expected))) throw new Error(`Engine A v3 part ${part} requires only ${expected.join(', ')}`);
  if (part === 1 && fs.existsSync(REPORT_PATH)) throw new Error('Engine A v3 report exists before part 1');
}

function validate(value, spec, schemaById, label = '$') {
  const kind = spec.kind;
  if (kind === 'Ref') {
    const schema = schemaById.get(spec.schemaId);
    if (schema === undefined) fail('UNRESOLVED-REF', `${label}: ${spec.schemaId}`);
    validateRecord(value, schema, schemaById, label);
    return;
  }
  if (value === null && !['Null', 'Nullable'].includes(kind) && !(kind === 'Const' && spec.value === null)) fail('NULLABILITY-MISMATCH', `${label}: null forbidden`);
  if (kind === 'Null') { if (value !== null) fail('TYPE-MISMATCH', `${label}: null required`); }
  else if (kind === 'Nullable') { if (value !== null) validate(value, spec.inner, schemaById, label); }
  else if (kind === 'OneOf') {
    let accepted = 0;
    for (const branch of spec.variants) {
      try { validate(value, branch, schemaById, label); accepted += 1; } catch (error) { if (!(error instanceof EngineAError)) throw error; }
    }
    if (accepted !== 1) fail('UNION-MISMATCH', `${label}: exactly one branch required`);
  } else if (kind === 'Const') { if (canonicalV6(value) !== canonicalV6(spec.value)) fail('CONST-MISMATCH', `${label}: const mismatch`); }
  else if (kind === 'Boolean') { if (typeof value !== 'boolean') fail('TYPE-MISMATCH', `${label}: boolean required`); }
  else if (kind === 'UIntSafe') {
    if (!Number.isSafeInteger(value) || value < 0 || value > SAFE_MAX) fail('TYPE-MISMATCH', `${label}: UIntSafe required`);
    if (value < spec.minimum || value > spec.maximum) fail('RANGE-ERROR', `${label}: integer range`);
  } else if (kind === 'String') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: string required`);
    try { assertUnicodeScalarAndNfc(value, label); } catch (error) { fail('FORMAT-ERROR', error.message); }
    const size = Buffer.byteLength(value, 'utf8');
    if (size < spec.minBytes || size > spec.maxBytes) fail('RANGE-ERROR', `${label}: string range`);
  } else if (kind === 'Bytes32LowerHex') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: digest string required`);
    if (!SHA256_RE.test(value)) fail('FORMAT-ERROR', `${label}: digest format`);
  } else if (kind === 'CommitHex') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: commit string required`);
    if (!COMMIT_RE.test(value)) fail('FORMAT-ERROR', `${label}: commit format`);
  } else if (kind === 'LogicalPath') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: path string required`);
    try { assertRepoRelativePath(value); } catch (error) { fail('FORMAT-ERROR', error.message); }
  } else if (kind === 'ContentId') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: content id string required`);
    if (!value.startsWith(`${spec.prefix}-`) || !SHA256_RE.test(value.slice(spec.prefix.length + 1))) fail('FORMAT-ERROR', `${label}: content id format`);
  } else if (kind === 'Enum') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: enum string required`);
    if (!spec.values.includes(value)) fail('ENUM-MISMATCH', `${label}: enum member`);
  } else if (kind === 'Array') {
    if (!Array.isArray(value)) fail('TYPE-MISMATCH', `${label}: array required`);
    if (value.length < spec.minItems || value.length > spec.maxItems) fail('RANGE-ERROR', `${label}: array range`);
    value.forEach((member, index) => validate(member, spec.items, schemaById, `${label}[${index}]`));
    const encoded = value.map(canonicalV6);
    if (spec.unique && new Set(encoded).size !== encoded.length) fail('INVARIANT-MISMATCH', `${label}: duplicate array member`);
    if (spec.sorted && canonicalV6(encoded) !== canonicalV6(sorted(encoded))) fail('INVARIANT-MISMATCH', `${label}: array order`);
  } else if (kind === 'Object') {
    if (!plain(value)) fail('TYPE-MISMATCH', `${label}: object required`);
    const unknown = sorted(Object.keys(value).filter((key) => !Object.hasOwn(spec.properties, key)));
    if (unknown.length > 0) fail('UNKNOWN-FIELD', `${label}: unknown ${unknown[0]}`);
    const missing = sorted(spec.required.filter((key) => !Object.hasOwn(value, key)));
    if (missing.length > 0) fail('MISSING-FIELD', `${label}: missing ${missing[0]}`);
    for (const key of sorted(Object.keys(value))) validate(value[key], spec.properties[key], schemaById, `${label}.${key}`);
  } else throw new Error(`${label}: Engine A unimplemented ${kind}`);
}

function identityBody(record, identity) {
  if (identity.mode === 'EXCLUDE-IDENTITY-KEYS') return Object.fromEntries(Object.entries(record).filter(([key]) => key !== identity.idKey && key !== identity.rootKey));
  if (identity.mode === 'BODY-PATH') return identity.bodyPath.reduce((current, segment) => current[segment], record);
  throw new Error(`unknown identity mode ${identity.mode}`);
}

function invariants(record, schema) {
  for (const invariant of schema.invariants) {
    let accepted = false;
    if (invariant.kind === 'ARRAY-LENGTH-EQUALS-FIELD') accepted = record[invariant.arrayField].length === record[invariant.numberField];
    else if (invariant.kind === 'NOT-EQUAL-FIELDS') accepted = canonicalV6(record[invariant.left]) !== canonicalV6(record[invariant.right]);
    else if (invariant.kind === 'LTE-FIELDS') accepted = record[invariant.left] <= record[invariant.right];
    else if (invariant.kind === 'SUBSET-ARRAY') {
      const superset = new Set(record[invariant.supersetField].map(canonicalV6));
      accepted = record[invariant.subsetField].every((member) => superset.has(canonicalV6(member)));
    }
    if (!accepted) fail('INVARIANT-MISMATCH', `${schema.family}: ${invariant.kind}`);
  }
}

function validateRecord(record, schema, schemaById) {
  validate(record, schema.rootSpec, schemaById, schema.family);
  invariants(record, schema);
  if (schema.contentIdentity === null) return null;
  const identity = schema.contentIdentity;
  const expectedRoot = rootV6(identity.typeTag, identity.schemaVersion, identityBody(record, identity));
  if (record[identity.rootKey] !== expectedRoot) fail('CONTENT-IDENTITY-MISMATCH', `${schema.family}: root mismatch`);
  if (identity.idKey !== null && record[identity.idKey] !== `${identity.prefix}-${expectedRoot}`) fail('CONTENT-IDENTITY-MISMATCH', `${schema.family}: id mismatch`);
  return expectedRoot;
}

function outcome(fixture, schema, schemaById) {
  let observedStatus = 'PASS';
  let observedTerminal = 'ACCEPT';
  let contentRoot = null;
  try {
    if (!Array.isArray(fixture.bytesBase64Chunks) || fixture.bytesBase64Chunks.length === 0 || fixture.bytesBase64Chunks.some((chunk, index) => typeof chunk !== 'string' || chunk.length === 0 || chunk.length > BASE64_CHUNK_CHAR_COUNT || (index < fixture.bytesBase64Chunks.length - 1 && chunk.length !== BASE64_CHUNK_CHAR_COUNT))) fail('FIXTURE-BYTES-INVALID', 'fixture chunk framing mismatch');
    const encoded = fixture.bytesBase64Chunks.join('');
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.toString('base64') !== encoded || bytes.length !== fixture.byteLength || sha256Bytes(bytes) !== fixture.sha256) fail('FIXTURE-BYTES-INVALID', 'fixture byte binding mismatch');
    contentRoot = validateRecord(parseCanonicalJsonBytes(bytes), schema, schemaById);
  } catch (error) {
    if (!(error instanceof EngineAError) && !(error instanceof V3SchemaValidationError)) throw error;
    observedStatus = 'BLOCK'; observedTerminal = error.terminal; contentRoot = null;
  }
  return {
    contentRoot,
    expectedStatus: fixture.expectedStatus,
    expectedTerminal: fixture.expectedTerminal,
    fixtureId: fixture.fixtureId,
    fixtureSha256: fixture.sha256,
    matchesExpectation: observedStatus === fixture.expectedStatus && observedTerminal === fixture.expectedTerminal && contentRoot === fixture.expectedContentRoot,
    observedStatus,
    observedTerminal,
    schemaId: fixture.schemaId,
  };
}

function marker(part, prefixLines) {
  return `__TRD2_V6_V3_ENGINE_A_PART_${part}_PREFIX_SHA256_${sha256Bytes(Buffer.from(`${prefixLines.join('\n')}\n`, 'utf8'))}__`;
}

function patchPart(content, part) {
  if (!Number.isSafeInteger(part) || part < 1 || part > PART_COUNT) throw new Error(`part must be 1..${PART_COUNT}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  const start = Math.floor(((part - 1) * lines.length) / PART_COUNT);
  const end = Math.floor((part * lines.length) / PART_COUNT);
  const chunk = lines.slice(start, end);
  if (part === 1) return `*** Begin Patch\n*** Add File: ${REPORT_PATH}\n${[...chunk.map((line) => `+${line}`), `+${marker(part, lines.slice(0, end))}`].join('\n')}\n*** End Patch\n`;
  const replacement = chunk.map((line) => `+${line}`);
  if (part < PART_COUNT) replacement.push(`+${marker(part, lines.slice(0, end))}`);
  return `*** Begin Patch\n*** Update File: ${REPORT_PATH}\n@@\n-${marker(part - 1, lines.slice(0, start))}\n${replacement.join('\n')}\n*** End Patch\n`;
}

function main() {
  const argument = process.argv.find((value) => value.startsWith('--emit-patch-part='));
  if (argument === undefined) throw new Error(`use --emit-patch-part=N where N is 1..${PART_COUNT}`);
  const part = Number(argument.split('=')[1]);
  assertWorktree(part);
  const registry = validateClosedSchemaRegistryV3(JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')));
  const sourceSha256 = sha256Bytes(fs.readFileSync(SCRIPT_PATH));
  const frozen = registry.provenance.toolchain.find(({ logicalPath }) => logicalPath === SCRIPT_PATH);
  if (frozen?.sha256 !== sourceSha256) throw new Error('Engine A v3 differs from frozen toolchain');
  const schemaById = new Map(registry.schemas.map((schema) => [schema.schemaId, schema]));
  const outcomes = registry.fixtures.map((fixture) => outcome(fixture, schemaById.get(fixture.schemaId), schemaById));
  const report = makeCanonicalV3Report({ engineId: 'CANONICAL-V3-ENGINE-A', implementation: 'NODE-INDEPENDENT-REF-INVARIANT-VALIDATOR-V3', outcomes, registry, sourceSha256 });
  process.stdout.write(patchPart(prettyV6(report), part));
}

main();
