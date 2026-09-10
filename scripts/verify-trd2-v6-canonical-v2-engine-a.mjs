#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { assertRepoRelativePath, assertUnicodeScalarAndNfc, canonicalV6, prettyV6, rootV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS2_V2_PATHS,
  makeCanonicalV2Report,
  validateClosedSchemaRegistryV2,
} from './trd2-v6-pass2-v2-core.mjs';

const [REGISTRY_PATH, REPORT_PATH] = TRD2_V6_PASS2_V2_PATHS;
const SCRIPT_PATH = 'scripts/verify-trd2-v6-canonical-v2-engine-a.mjs';
const SHA256_RE = /^[0-9a-f]{64}$/;
const COMMIT_RE = /^[0-9a-f]{40}([0-9a-f]{24})?$/;

class EngineAError extends Error {
  constructor(terminal, message) {
    super(message);
    this.terminal = terminal;
  }
}

function runGit(args) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function assertExpectedWorktree() {
  const paths = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0').filter(Boolean).map((record) => record.slice(3));
  if (paths.length !== 1 || paths[0] !== REGISTRY_PATH || fs.existsSync(REPORT_PATH)) throw new Error('Canonical Engine A v2 requires exactly the completed untracked v2 registry');
}

function fail(terminal, message) {
  throw new EngineAError(terminal, message);
}

function plain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function validate(value, spec, label = '$') {
  if (value === null && !['Null', 'Nullable'].includes(spec.kind) && !(spec.kind === 'Const' && spec.value === null)) fail('NULLABILITY-MISMATCH', `${label}: null forbidden`);
  switch (spec.kind) {
    case 'Null': if (value !== null) fail('TYPE-MISMATCH', `${label}: null required`); break;
    case 'Nullable': if (value !== null) validate(value, spec.inner, label); break;
    case 'OneOf': {
      let accepted = 0;
      for (const branch of spec.variants) {
        try { validate(value, branch, label); accepted += 1; } catch (error) { if (!(error instanceof EngineAError)) throw error; }
      }
      if (accepted !== 1) fail('UNION-MISMATCH', `${label}: exactly one branch required`);
      break;
    }
    case 'Const': if (canonicalV6(value) !== canonicalV6(spec.value)) fail('CONST-MISMATCH', `${label}: const mismatch`); break;
    case 'Boolean': if (typeof value !== 'boolean') fail('TYPE-MISMATCH', `${label}: boolean required`); break;
    case 'UIntSafe':
      if (!Number.isSafeInteger(value) || value < 0) fail('TYPE-MISMATCH', `${label}: UIntSafe required`);
      if (value < spec.minimum || value > spec.maximum) fail('RANGE-ERROR', `${label}: integer range`);
      break;
    case 'String': {
      if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: string required`);
      try { assertUnicodeScalarAndNfc(value, label); } catch (error) { fail('FORMAT-ERROR', error.message); }
      const size = Buffer.byteLength(value, 'utf8');
      if (size < spec.minBytes || size > spec.maxBytes) fail('RANGE-ERROR', `${label}: string range`);
      break;
    }
    case 'Bytes32LowerHex':
      if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: digest string required`);
      if (!SHA256_RE.test(value)) fail('FORMAT-ERROR', `${label}: digest format`);
      break;
    case 'CommitHex':
      if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: commit string required`);
      if (!COMMIT_RE.test(value)) fail('FORMAT-ERROR', `${label}: commit format`);
      break;
    case 'LogicalPath':
      if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: path string required`);
      try { assertRepoRelativePath(value); } catch (error) { fail('FORMAT-ERROR', error.message); }
      break;
    case 'ContentId':
      if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: content id string required`);
      if (!value.startsWith(`${spec.prefix}-`) || !SHA256_RE.test(value.slice(spec.prefix.length + 1))) fail('FORMAT-ERROR', `${label}: content id format`);
      break;
    case 'Enum':
      if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: enum string required`);
      if (!spec.values.includes(value)) fail('ENUM-MISMATCH', `${label}: enum member`);
      break;
    case 'Array': {
      if (!Array.isArray(value)) fail('TYPE-MISMATCH', `${label}: array required`);
      if (value.length < spec.minItems || value.length > spec.maxItems) fail('RANGE-ERROR', `${label}: array range`);
      value.forEach((member, index) => validate(member, spec.items, `${label}[${index}]`));
      const encoded = value.map(canonicalV6);
      if (spec.unique && new Set(encoded).size !== encoded.length) fail('INVARIANT-MISMATCH', `${label}: duplicate array member`);
      if (spec.sorted && canonicalV6(encoded) !== canonicalV6([...encoded].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))))) fail('INVARIANT-MISMATCH', `${label}: array order`);
      break;
    }
    case 'Object': {
      if (!plain(value)) fail('TYPE-MISMATCH', `${label}: object required`);
      const keys = Object.keys(value);
      const unknown = keys.filter((key) => !Object.hasOwn(spec.properties, key)).sort();
      if (unknown.length > 0) fail('UNKNOWN-FIELD', `${label}: unknown ${unknown[0]}`);
      const missing = spec.required.filter((key) => !Object.hasOwn(value, key)).sort();
      if (missing.length > 0) fail('MISSING-FIELD', `${label}: missing ${missing[0]}`);
      for (const key of keys.sort()) validate(value[key], spec.properties[key], `${label}.${key}`);
      break;
    }
    default: throw new Error(`${label}: Engine A unimplemented kind ${spec.kind}`);
  }
}

function valueAt(value, path) {
  return path.reduce((current, segment) => current[segment], value);
}

function validateIdentity(record, identity) {
  if (identity === null) return null;
  const body = identity.mode === 'EXCLUDE-IDENTITY-KEYS'
    ? Object.fromEntries(Object.entries(record).filter(([key]) => key !== identity.idKey && key !== identity.rootKey))
    : valueAt(record, identity.bodyPath);
  const expectedRoot = rootV6(identity.typeTag, identity.schemaVersion, body);
  if (record[identity.rootKey] !== expectedRoot) fail('CONTENT-IDENTITY-MISMATCH', 'content root mismatch');
  if (identity.idKey !== null && record[identity.idKey] !== `${identity.prefix}-${expectedRoot}`) fail('CONTENT-IDENTITY-MISMATCH', 'content id mismatch');
  return expectedRoot;
}

function evaluateFixture(fixture, schema) {
  let observedStatus = 'PASS';
  let observedTerminal = 'ACCEPT';
  let contentRoot = null;
  try {
    const bytes = Buffer.from(fixture.bytesBase64, 'base64');
    if (bytes.toString('base64') !== fixture.bytesBase64 || bytes.length !== fixture.byteLength || sha256Bytes(bytes) !== fixture.sha256) fail('FIXTURE-BYTES-INVALID', 'fixture byte binding mismatch');
    const text = bytes.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(bytes)) fail('FIXTURE-BYTES-INVALID', 'fixture UTF-8 mismatch');
    const value = JSON.parse(text);
    if (canonicalV6(value) !== text) fail('FIXTURE-BYTES-INVALID', 'fixture is not canonical JSON');
    validate(value, schema.rootSpec, schema.family);
    contentRoot = validateIdentity(value, schema.contentIdentity);
  } catch (error) {
    if (!(error instanceof EngineAError)) throw error;
    observedStatus = 'BLOCK';
    observedTerminal = error.terminal;
    contentRoot = null;
  }
  const matchesExpectation = observedStatus === fixture.expectedStatus
    && observedTerminal === fixture.expectedTerminal
    && contentRoot === fixture.expectedContentRoot;
  return {
    contentRoot,
    expectedStatus: fixture.expectedStatus,
    expectedTerminal: fixture.expectedTerminal,
    fixtureId: fixture.fixtureId,
    fixtureSha256: fixture.sha256,
    matchesExpectation,
    observedStatus,
    observedTerminal,
    schemaId: fixture.schemaId,
  };
}

function patchFor(content) {
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Begin Patch\n*** Add File: ${REPORT_PATH}\n${lines.map((line) => `+${line}`).join('\n')}\n*** End Patch\n`;
}

function main() {
  if (!process.argv.includes('--emit-patch')) throw new Error('use --emit-patch; Canonical Engine A v2 never writes repository files directly');
  assertExpectedWorktree();
  const registry = validateClosedSchemaRegistryV2(JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')));
  const sourceSha256 = sha256Bytes(fs.readFileSync(SCRIPT_PATH));
  const frozen = registry.provenance.toolchain.find(({ logicalPath }) => logicalPath === SCRIPT_PATH);
  if (frozen === undefined || frozen.sha256 !== sourceSha256) throw new Error('Canonical Engine A v2 source differs from frozen toolchain');
  const schemaById = new Map(registry.schemas.map((schema) => [schema.schemaId, schema]));
  const outcomes = registry.fixtures.map((fixture) => evaluateFixture(fixture, schemaById.get(fixture.schemaId)));
  const report = makeCanonicalV2Report({
    engineId: 'CANONICAL-V2-ENGINE-A',
    implementation: 'NODE-INDEPENDENT-RECURSIVE-CLOSED-VALIDATOR-V2',
    outcomes,
    registry,
    sourceSha256,
  });
  process.stdout.write(patchFor(prettyV6(report)));
}

main();
