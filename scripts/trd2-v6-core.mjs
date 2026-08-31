import crypto from 'node:crypto';

export const TRD2_V6_DATE = '2026-08-30';
export const TRD2_V6_DIRECTORY = `docs/planning/trd2-v6-candidate-${TRD2_V6_DATE}`;
export const TRD2_V6_OUTPUT_REGISTRY_PATH = `docs/planning/trd2-v6-output-path-registry-v1-${TRD2_V6_DATE}.json`;
export const TRD2_V6_TOOLCHAIN_REGISTRY_PATH = `docs/planning/trd2-v6-pass1-toolchain-path-registry-v1-${TRD2_V6_DATE}.json`;
export const TRD2_V6_PARSER_FIXTURE_SCHEMA = 'CONNECT-TRD2-V6-PARSER-FIXTURE-V1';
export const TRD2_V6_EXPECTED_LEDGER_SHA256 = 'c0feec2e5c37ca134240c5b164d2014df927dad5abd8df8863e40818fc540755';

export const TRD2_V6_NORMATIVE_PATHS = Object.freeze([
  `${TRD2_V6_DIRECTORY}/subject.json`,
  `${TRD2_V6_DIRECTORY}/source-capture-manifest.json`,
  `${TRD2_V6_DIRECTORY}/closed-schema-registry.json`,
  `${TRD2_V6_DIRECTORY}/parser-grammar-and-corpus.json`,
  `${TRD2_V6_DIRECTORY}/clause-ast-registry.json`,
  `${TRD2_V6_DIRECTORY}/causal-graph.json`,
  `${TRD2_V6_DIRECTORY}/state-machine-registry.json`,
  `${TRD2_V6_DIRECTORY}/executable-vector-corpus.json`,
  `${TRD2_V6_DIRECTORY}/raw-root-overlay-and-invalidation.json`,
  `${TRD2_V6_DIRECTORY}/detached-acceptance-packet.json`,
  `${TRD2_V6_DIRECTORY}/finding-closure-crosswalk.json`,
  `${TRD2_V6_DIRECTORY}/atomic-package-manifest.json`,
]);

export const TRD2_V6_PRODUCER_PATHS = Object.freeze([
  `${TRD2_V6_DIRECTORY}/generation-receipt.json`,
  `${TRD2_V6_DIRECTORY}/parser-engine-a-report.json`,
  `${TRD2_V6_DIRECTORY}/parser-engine-b-report.json`,
  `${TRD2_V6_DIRECTORY}/canonical-engine-a-report.json`,
  `${TRD2_V6_DIRECTORY}/canonical-engine-b-report.json`,
  `${TRD2_V6_DIRECTORY}/graph-engine-a-report.json`,
  `${TRD2_V6_DIRECTORY}/graph-engine-b-report.json`,
  `${TRD2_V6_DIRECTORY}/vector-runner-a-report.json`,
  `${TRD2_V6_DIRECTORY}/vector-runner-b-report.json`,
  `${TRD2_V6_DIRECTORY}/pass-1-producer-qa.json`,
  `${TRD2_V6_DIRECTORY}/producer-qa.json`,
]);

export const TRD2_V6_EXTERNAL_PATHS = Object.freeze([
  `${TRD2_V6_DIRECTORY}/reviewer-appointment-set.json`,
  `${TRD2_V6_DIRECTORY}/evidence-custody-receipt.json`,
  `${TRD2_V6_DIRECTORY}/fresh-independent-hostile-review.json`,
  `${TRD2_V6_DIRECTORY}/review-generation-a.json`,
  `${TRD2_V6_DIRECTORY}/review-generation-b.json`,
  `${TRD2_V6_DIRECTORY}/review-reconciliation.json`,
  `${TRD2_V6_DIRECTORY}/definition-acceptance.json`,
]);

export const TRD2_V6_PASS1_PATHS = Object.freeze([
  `${TRD2_V6_DIRECTORY}/source-capture-manifest.json`,
  `${TRD2_V6_DIRECTORY}/parser-grammar-and-corpus.json`,
  `${TRD2_V6_DIRECTORY}/generation-receipt.json`,
  `${TRD2_V6_DIRECTORY}/parser-engine-a-report.json`,
  `${TRD2_V6_DIRECTORY}/parser-engine-b-report.json`,
  `${TRD2_V6_DIRECTORY}/pass-1-producer-qa.json`,
]);

export const TRD2_V6_TOOLCHAIN_PATHS = Object.freeze([
  `docs/planning/section-35-6-trd-2-v6-successor-build-charter-${TRD2_V6_DATE}.md`,
  TRD2_V6_OUTPUT_REGISTRY_PATH,
  TRD2_V6_TOOLCHAIN_REGISTRY_PATH,
  'scripts/b0-v8-core.mjs',
  'scripts/verify-secret-hygiene.mjs',
  'scripts/trd2-v6-core.mjs',
  'scripts/create-trd2-v6-pass1-candidate.mjs',
  'scripts/verify-trd2-v6-parser-a.mjs',
  'scripts/verify-trd2-v6-parser-b.py',
  'scripts/finalize-trd2-v6-pass1-candidate.mjs',
  'scripts/verify-trd2-v6-pass1-candidate.mjs',
  'tests/trd2-v6-core.test.mjs',
  'package.json',
]);

export const TRD2_V6_PREDECESSOR_SOURCES = Object.freeze([
  ['V5-SUBJECT', 'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-2026-08-29.md', '933b5d68f765afbe5df792051f8b01441d2e0b6043eb3745aea3f593cadcf2be'],
  ['V5-INHERITED-MANIFEST', 'docs/planning/section-35-6-trd-2-v5-inherited-v4-requirement-byte-manifest-2026-08-29.json', '85783c16a14b84d66cdf08220ced97d7d8e89602b1fc2ab1fe6f4e92ae9c7bba'],
  ['V5-EXECUTABLE-CONTRACT', 'docs/planning/section-35-6-trd-2-v5-executable-definition-contract-2026-08-29.json', 'c30727d07c28697899299af552ac3fbf6ce6e16a22de81a4dce31b703d0c1dc4'],
  ['V5-SEMANTIC-GRAPH', 'docs/planning/section-35-6-trd-2-v5-complete-semantic-graph-2026-08-29.json', '92845a0f60b71491538ae9161da08b32730a3a4cf26edd4c6a477f85ca9abfda'],
  ['V5-DETACHED-PACKET', 'docs/planning/section-35-6-trd-2-v5-detached-candidate-packet-binding-2026-08-29.json', 'd9ce7f0785801062c3711503b8a808c9c25fa523e9fe8e1325a553621bcf3f4e'],
  ['V5-REQUIREMENT-BINDINGS', 'docs/planning/section-35-6-trd-2-v5-requirement-root-bindings-2026-08-29.json', '67dd12d206e6c133d9ebdb71f5d2cb0c8a4227e95dd1a27e69f448f421b7d80d'],
  ['V5-INDEPENDENT-REVIEW', 'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-independent-hostile-review-2026-08-30.md', '123b3f1a08b9388a0368042ea32a08a3408b813016bc259b4293215dc723547b'],
  ['V5-FINDINGS', 'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md', '05b752be0bbbb5bdb789df31dcf72b69a69e1da9d55f38d1349b94af0a975ce8'],
]);

export const TRD2_V6_REQUIRED_CAPTURE_SOURCES = Object.freeze([
  ...TRD2_V6_PREDECESSOR_SOURCES,
  ['V6-CONSTRUCTION-CHARTER', 'docs/planning/section-35-6-trd-2-v6-successor-build-charter-2026-08-30.md', null],
  ['CURRENT-RECOVERY-LEDGER', 'docs/planning/master-plan-recovery-ledger-2026-08-29.md', null],
  ['V4-REVIEW-F015-SOURCE', 'docs/planning/section-35-6-trd-2-v4-immutable-successor-requirements-independent-hostile-review-2026-08-29.md', null],
  ['V4-FINDINGS-F015-SOURCE', 'docs/planning/section-35-6-trd-2-v4-immutable-successor-requirements-independent-hostile-review-findings-manifest-2026-08-29.md', null],
]);

export const TRD2_V6_F015_OBSERVATION_PATHS = Object.freeze([
  'docs/planning/section-35-6-trd-2-v4-immutable-successor-requirements-independent-hostile-review-2026-08-29.md',
  'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-independent-hostile-review-2026-08-30.md',
  'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md',
  'docs/planning/section-35-6-trd-2-v6-successor-build-charter-2026-08-30.md',
]);

export const TRD2_V6_F015_DEPENDENT_PATHS = Object.freeze([
  'docs/planning/master-plan-recovery-ledger-2026-08-29.md',
  'docs/planning/section-35-6-trd-2-v4-immutable-successor-requirements-independent-hostile-review-2026-08-29.md',
  'docs/planning/section-35-6-trd-2-v4-immutable-successor-requirements-independent-hostile-review-findings-manifest-2026-08-29.md',
  'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-2026-08-29.md',
  'docs/planning/section-35-6-trd-2-v5-inherited-v4-requirement-byte-manifest-2026-08-29.json',
  'docs/planning/section-35-6-trd-2-v5-executable-definition-contract-2026-08-29.json',
  'docs/planning/section-35-6-trd-2-v5-complete-semantic-graph-2026-08-29.json',
  'docs/planning/section-35-6-trd-2-v5-detached-candidate-packet-binding-2026-08-29.json',
  'docs/planning/section-35-6-trd-2-v5-requirement-root-bindings-2026-08-29.json',
  'docs/planning/section-35-6-trd-2-v5-portable-candidate-capture-2026-08-29.bin',
  'docs/planning/section-35-6-trd-2-v5-mechanical-qa-engine-a-2026-08-29.json',
  'docs/planning/section-35-6-trd-2-v5-mechanical-qa-engine-b-2026-08-29.json',
  'docs/planning/section-35-6-trd-2-v5-dual-qa-reconciliation-2026-08-29.json',
  'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-producer-qa-2026-08-29.md',
  'docs/planning/section-35-6-trd-2-v5-support-manifests-2026-08-29.md',
  'docs/planning/trd2-v5-planning-artifact-generator.mjs',
  'docs/planning/trd2-v5-mechanical-qa-engine-a.mjs',
  'docs/planning/trd2-v5-mechanical-qa-engine-b.py',
  'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-independent-hostile-review-2026-08-30.md',
  'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md',
  'docs/planning/section-35-6-trd-2-v6-successor-build-charter-2026-08-30.md',
]);

const SHA256_RE = /^[0-9a-f]{64}$/;
const COMMIT_RE = /^[0-9a-f]{40}([0-9a-f]{24})?$/;

export class V6ValidationError extends Error {}

export class V6ParseError extends Error {
  constructor(terminal, message) {
    super(message);
    this.terminal = terminal;
  }
}

export function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export function assertUnicodeScalarAndNfc(value, label = 'string') {
  if (typeof value !== 'string') throw new V6ValidationError(`${label}: expected string`);
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new V6ValidationError(`${label}: unpaired high surrogate`);
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new V6ValidationError(`${label}: unpaired low surrogate`);
    }
  }
  if (value.normalize('NFC') !== value) throw new V6ValidationError(`${label}: NFC required`);
  return value;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

export function canonicalV6(value) {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') {
    assertUnicodeScalarAndNfc(value);
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new V6ValidationError('canonical number must be a safe integer');
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalV6).join(',')}]`;
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort((left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')));
    return `{${keys.map((key) => `${canonicalV6(key)}:${canonicalV6(value[key])}`).join(',')}}`;
  }
  throw new V6ValidationError(`unsupported canonical type: ${typeof value}`);
}

function u32(value) {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(value);
  return bytes;
}

function u64(value) {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64BE(BigInt(value));
  return bytes;
}

export function rootV6(typeTag, schemaVersion, value) {
  assertUnicodeScalarAndNfc(typeTag, 'typeTag');
  assertUnicodeScalarAndNfc(schemaVersion, 'schemaVersion');
  const prefix = Buffer.from('CONNECT-TRD2-V6-ROOT-V1\0', 'utf8');
  const typeBytes = Buffer.from(typeTag, 'utf8');
  const schemaBytes = Buffer.from(schemaVersion, 'utf8');
  const bodyBytes = Buffer.from(canonicalV6(value), 'utf8');
  return sha256Bytes(Buffer.concat([
    prefix,
    u32(typeBytes.length),
    typeBytes,
    u32(schemaBytes.length),
    schemaBytes,
    u64(bodyBytes.length),
    bodyBytes,
  ]));
}

export function attachContentIdentity(prefix, typeTag, schemaVersion, body, idKey = 'artifactId', rootKey = 'artifactRoot') {
  const root = rootV6(typeTag, schemaVersion, body);
  return { ...body, [idKey]: `${prefix}-${root}`, [rootKey]: root };
}

export function validateContentIdentity(value, prefix, typeTag, schemaVersion, idKey = 'artifactId', rootKey = 'artifactRoot') {
  if (!isPlainObject(value)) throw new V6ValidationError(`${typeTag}: expected plain object`);
  const body = Object.fromEntries(Object.entries(value).filter(([key]) => key !== idKey && key !== rootKey));
  const root = rootV6(typeTag, schemaVersion, body);
  if (value[rootKey] !== root || value[idKey] !== `${prefix}-${root}`) throw new V6ValidationError(`${typeTag}: content identity mismatch`);
  return value;
}

export function prettyV6(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function assertClosedObject(value, expectedKeys, label) {
  if (!isPlainObject(value)) throw new V6ValidationError(`${label}: expected plain object`);
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new V6ValidationError(`${label}: exact keys mismatch; expected ${expected.join(',')}; actual ${actual.join(',')}`);
  }
  return value;
}

export function assertRepoRelativePath(logicalPath) {
  assertUnicodeScalarAndNfc(logicalPath, 'logicalPath');
  if (logicalPath.startsWith('/') || logicalPath.includes('\\') || logicalPath.includes('//')) throw new V6ValidationError('logicalPath: forbidden separator');
  if (!(logicalPath === 'package.json' || ['docs/planning/', 'scripts/', 'tests/'].some((prefix) => logicalPath.startsWith(prefix)))) {
    throw new V6ValidationError('logicalPath: outside the closed public planning/toolchain surface');
  }
  if (logicalPath.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) throw new V6ValidationError('logicalPath: traversal or empty segment');
  return logicalPath;
}

function assertExactArray(actual, expected, label) {
  if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) throw new V6ValidationError(`${label}: exact ordered array mismatch`);
}

export function validateOutputPathRegistry(registry) {
  assertClosedObject(registry, ['artifactId', 'candidateDirectory', 'externalReviewAndAcceptancePaths', 'normativePackageMemberPaths', 'owner', 'passOneEmittedPaths', 'producerOnlyPaths', 'schema', 'version'], 'outputRegistry');
  if (registry.schema !== 'CONNECT-TRD2-V6-OUTPUT-PATH-REGISTRY-V1' || registry.version !== 1 || registry.owner !== 'Tal') throw new V6ValidationError('outputRegistry: identity mismatch');
  if (registry.candidateDirectory !== TRD2_V6_DIRECTORY) throw new V6ValidationError('outputRegistry: candidate directory mismatch');
  assertExactArray(registry.normativePackageMemberPaths, TRD2_V6_NORMATIVE_PATHS, 'outputRegistry.normativePackageMemberPaths');
  assertExactArray(registry.producerOnlyPaths, TRD2_V6_PRODUCER_PATHS, 'outputRegistry.producerOnlyPaths');
  assertExactArray(registry.externalReviewAndAcceptancePaths, TRD2_V6_EXTERNAL_PATHS, 'outputRegistry.externalReviewAndAcceptancePaths');
  assertExactArray(registry.passOneEmittedPaths, TRD2_V6_PASS1_PATHS, 'outputRegistry.passOneEmittedPaths');
  const all = [...TRD2_V6_NORMATIVE_PATHS, ...TRD2_V6_PRODUCER_PATHS, ...TRD2_V6_EXTERNAL_PATHS];
  if (new Set(all).size !== all.length) throw new V6ValidationError('outputRegistry: duplicate path');
  all.forEach(assertRepoRelativePath);
  if (registry.passOneEmittedPaths.some((candidate) => !all.includes(candidate))) throw new V6ValidationError('outputRegistry: pass-one path outside closed universe');
  return registry;
}

export function validateToolchainPathRegistry(registry) {
  assertClosedObject(registry, ['schema', 'toolchainPaths', 'version'], 'toolchainRegistry');
  if (registry.schema !== 'CONNECT-TRD2-V6-PASS1-TOOLCHAIN-PATH-REGISTRY-V1' || registry.version !== 1) throw new V6ValidationError('toolchainRegistry: identity mismatch');
  assertExactArray(registry.toolchainPaths, TRD2_V6_TOOLCHAIN_PATHS, 'toolchainRegistry.toolchainPaths');
  if (new Set(registry.toolchainPaths).size !== registry.toolchainPaths.length) throw new V6ValidationError('toolchainRegistry: duplicate path');
  registry.toolchainPaths.forEach(assertRepoRelativePath);
  return registry;
}

function parseJsonText(text) {
  let index = 0;

  function fail(terminal, message) {
    throw new V6ParseError(terminal, `${message} at character ${index}`);
  }

  function skipWhitespace() {
    while (index < text.length && /[\u0009\u000a\u000d\u0020]/.test(text[index])) index += 1;
  }

  function parseString() {
    if (text[index] !== '"') fail('JSON-SYNTAX-ERROR', 'expected string');
    const start = index;
    index += 1;
    let closed = false;
    while (index < text.length) {
      const code = text.charCodeAt(index);
      const character = text[index];
      if (character === '"') {
        index += 1;
        closed = true;
        break;
      }
      if (code < 0x20) fail('JSON-SYNTAX-ERROR', 'unescaped control character');
      if (character === '\\') {
        index += 1;
        if (index >= text.length) fail('JSON-SYNTAX-ERROR', 'truncated escape');
        if (text[index] === 'u') {
          const digits = text.slice(index + 1, index + 5);
          if (!/^[0-9a-fA-F]{4}$/.test(digits)) fail('JSON-SYNTAX-ERROR', 'invalid Unicode escape');
          index += 5;
          continue;
        }
        if (!/["\\/bfnrt]/.test(text[index])) fail('JSON-SYNTAX-ERROR', 'invalid escape');
      }
      index += 1;
    }
    if (!closed) fail('JSON-SYNTAX-ERROR', 'unterminated string');
    let value;
    try {
      value = JSON.parse(text.slice(start, index));
    } catch {
      fail('JSON-SYNTAX-ERROR', 'invalid string literal');
    }
    try {
      assertUnicodeScalarAndNfc(value, 'decoded string');
    } catch (error) {
      if (error.message.includes('NFC')) throw new V6ParseError('UNICODE-NORMALIZATION-INVALID', error.message);
      throw new V6ParseError('UNICODE-SCALAR-INVALID', error.message);
    }
    return value;
  }

  function parseNumber() {
    const match = text.slice(index).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
    if (!match) fail('JSON-SYNTAX-ERROR', 'invalid number');
    index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) fail('NUMBER-DOMAIN-INVALID', 'number must decode to safe integer');
    return value;
  }

  function parseArray() {
    index += 1;
    skipWhitespace();
    const values = [];
    if (text[index] === ']') {
      index += 1;
      return values;
    }
    while (index < text.length) {
      values.push(parseValue());
      skipWhitespace();
      if (text[index] === ']') {
        index += 1;
        return values;
      }
      if (text[index] !== ',') fail('JSON-SYNTAX-ERROR', 'expected array comma');
      index += 1;
      skipWhitespace();
    }
    fail('JSON-SYNTAX-ERROR', 'unterminated array');
  }

  function parseObject() {
    index += 1;
    skipWhitespace();
    const pairs = [];
    const keys = new Set();
    if (text[index] === '}') {
      index += 1;
      return {};
    }
    while (index < text.length) {
      const key = parseString();
      if (keys.has(key)) throw new V6ParseError('DUPLICATE-KEY', `duplicate key ${key}`);
      keys.add(key);
      skipWhitespace();
      if (text[index] !== ':') fail('JSON-SYNTAX-ERROR', 'expected object colon');
      index += 1;
      skipWhitespace();
      pairs.push([key, parseValue()]);
      skipWhitespace();
      if (text[index] === '}') {
        index += 1;
        return Object.fromEntries(pairs);
      }
      if (text[index] !== ',') fail('JSON-SYNTAX-ERROR', 'expected object comma');
      index += 1;
      skipWhitespace();
    }
    fail('JSON-SYNTAX-ERROR', 'unterminated object');
  }

  function parseValue() {
    skipWhitespace();
    const character = text[index];
    if (character === '"') return parseString();
    if (character === '{') return parseObject();
    if (character === '[') return parseArray();
    if (character === '-' || /[0-9]/.test(character ?? '')) return parseNumber();
    for (const [token, value] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(token, index)) {
        index += token.length;
        return value;
      }
    }
    fail('JSON-SYNTAX-ERROR', 'unexpected token');
  }

  const value = parseValue();
  skipWhitespace();
  if (index !== text.length) fail('JSON-SYNTAX-ERROR', 'trailing bytes');
  return value;
}

export function parseCanonicalJsonBytes(bytes) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new V6ParseError('UTF8-INVALID', 'input is not valid UTF-8');
  }
  const value = parseJsonText(text);
  let canonical;
  try {
    canonical = Buffer.from(canonicalV6(value), 'utf8');
  } catch (error) {
    if (error.message.includes('NFC')) throw new V6ParseError('UNICODE-NORMALIZATION-INVALID', error.message);
    if (error.message.includes('surrogate')) throw new V6ParseError('UNICODE-SCALAR-INVALID', error.message);
    throw error;
  }
  if (!Buffer.from(bytes).equals(canonical)) throw new V6ParseError('NON-CANONICAL-ENCODING', 'input bytes differ from canonical encoding');
  return value;
}

function fixtureSchemaFailure(terminal, message) {
  throw new V6ParseError(terminal, message);
}

export function validateParserFixtureEnvelope(value) {
  if (!isPlainObject(value)) fixtureSchemaFailure('SCHEMA-TYPE-ERROR', 'fixture envelope must be an object');
  const expectedTop = ['kind', 'ordinal', 'payload', 'schemaVersion'];
  const actualTop = Object.keys(value);
  const extraTop = actualTop.filter((key) => !expectedTop.includes(key));
  if (extraTop.length > 0) fixtureSchemaFailure('UNKNOWN-FIELD', `unknown top-level field ${extraTop[0]}`);
  const missingTop = expectedTop.filter((key) => !Object.hasOwn(value, key));
  if (missingTop.length > 0) fixtureSchemaFailure('MISSING-FIELD', `missing top-level field ${missingTop[0]}`);
  if (value.schemaVersion !== TRD2_V6_PARSER_FIXTURE_SCHEMA) fixtureSchemaFailure('SCHEMA-VALUE-ERROR', 'wrong fixture schemaVersion');
  if (!['FINDING', 'REQUIREMENT'].includes(value.kind)) fixtureSchemaFailure('SCHEMA-VALUE-ERROR', 'unsupported fixture kind');
  if (!Number.isSafeInteger(value.ordinal) || value.ordinal < 1 || value.ordinal > 999999) fixtureSchemaFailure('SCHEMA-TYPE-ERROR', 'ordinal outside UIntSafe range');
  if (!isPlainObject(value.payload)) fixtureSchemaFailure('SCHEMA-TYPE-ERROR', 'payload must be an object');
  const expectedPayload = ['claim', 'enabled', 'evidenceRoots'];
  const actualPayload = Object.keys(value.payload);
  const extraPayload = actualPayload.filter((key) => !expectedPayload.includes(key));
  if (extraPayload.length > 0) fixtureSchemaFailure('UNKNOWN-FIELD', `unknown payload field ${extraPayload[0]}`);
  const missingPayload = expectedPayload.filter((key) => !Object.hasOwn(value.payload, key));
  if (missingPayload.length > 0) fixtureSchemaFailure('MISSING-FIELD', `missing payload field ${missingPayload[0]}`);
  if (typeof value.payload.claim !== 'string' || value.payload.claim.length < 1 || Buffer.byteLength(value.payload.claim, 'utf8') > 512) fixtureSchemaFailure('SCHEMA-TYPE-ERROR', 'claim must be a bounded non-empty string');
  if (typeof value.payload.enabled !== 'boolean') fixtureSchemaFailure('SCHEMA-TYPE-ERROR', 'enabled must be boolean');
  if (!Array.isArray(value.payload.evidenceRoots) || value.payload.evidenceRoots.length < 1 || value.payload.evidenceRoots.length > 8) fixtureSchemaFailure('SCHEMA-TYPE-ERROR', 'evidenceRoots must contain 1..8 roots');
  if (value.payload.evidenceRoots.some((root) => typeof root !== 'string' || !SHA256_RE.test(root))) fixtureSchemaFailure('SCHEMA-TYPE-ERROR', 'evidenceRoots member is not SHA-256');
  const sorted = [...value.payload.evidenceRoots].sort();
  if (new Set(value.payload.evidenceRoots).size !== value.payload.evidenceRoots.length || JSON.stringify(sorted) !== JSON.stringify(value.payload.evidenceRoots)) fixtureSchemaFailure('SCHEMA-INVARIANT-ERROR', 'evidenceRoots must be unique and sorted');
  return value;
}

export function executeParserFixture(bytes) {
  try {
    const value = validateParserFixtureEnvelope(parseCanonicalJsonBytes(bytes));
    return {
      decodedRoot: rootV6('PARSER-TYPED-MAP', TRD2_V6_PARSER_FIXTURE_SCHEMA, value),
      status: 'PASS',
      terminal: 'NONE',
      value,
    };
  } catch (error) {
    if (error instanceof V6ParseError) return { decodedRoot: null, status: 'BLOCKED', terminal: error.terminal, value: null };
    throw error;
  }
}

function fixtureRecord(body) {
  const bytes = Buffer.from(body.bytes);
  const sha256 = sha256Bytes(bytes);
  const recordBody = {
    byteLength: bytes.length,
    bytesBase64: bytes.toString('base64'),
    captureId: `TRD2V6-FIXTURE-CAPTURE-${sha256}`,
    captureSha256: sha256,
    endByte: bytes.length,
    expectedDecodedRoot: body.expectedDecodedRoot,
    expectedStatus: body.expectedStatus,
    expectedTerminal: body.expectedTerminal,
    expectedTypedMap: body.expectedTypedMap,
    mutation: body.mutation,
    sha256,
    startByte: 0,
  };
  return attachContentIdentity('TRD2V6-FIXTURE', 'PARSER-FIXTURE', 'CONNECT-TRD2-V6-PARSER-CORPUS-RECORD-V1', recordBody, 'fixtureId', 'fixtureRoot');
}

function canonicalFixture(value) {
  return Buffer.from(canonicalV6(value), 'utf8');
}

export function makeParserGrammarAndCorpus() {
  const grammarBody = {
    notation: 'EBNF-EQUIVALENT-UTF8-BYTE-GRAMMAR',
    productions: [
      'document = value EOF',
      'value = object | array | string | integer | true | false | null',
      'object = "{" [ member *( "," member ) ] "}"',
      'member = string ":" value',
      'array = "[" [ value *( "," value ) ] "]"',
      'string = QUOTATION-MARK *unicode-scalar-or-json-escape QUOTATION-MARK',
      'integer = [ "-" ] ( "0" | nonzero-digit *digit )',
      'unicode-scalar-or-json-escape excludes unpaired surrogates and requires decoded NFC',
      'object member names are unique and ordered by unsigned UTF-8 byte comparison',
      'whitespace, BOM, trailing bytes, alternate escapes and non-integer number forms are non-canonical',
    ],
    terminals: {
      BOM: 'EF BB BF; forbidden',
      EOF: 'zero bytes after the canonical value',
      'QUOTATION-MARK': '22',
      digit: '30..39',
      'nonzero-digit': '31..39',
      'unicode-scalar-or-json-escape': 'valid UTF-8 Unicode scalar or one of JSON escapes quote, reverse-solidus, solidus, b, f, n, r, t, uXXXX',
    },
  };
  const grammar = attachContentIdentity('TRD2V6-GRAMMAR', 'PARSER-GRAMMAR', 'CONNECT-TRD2-V6-PARSER-GRAMMAR-V1', grammarBody, 'grammarId', 'grammarRoot');
  const fixtureSchemaBody = {
    additionalFields: 'REJECT-UNKNOWN',
    fields: {
      kind: { enum: ['FINDING', 'REQUIREMENT'], required: true, type: 'String' },
      ordinal: { maximum: 999999, minimum: 1, required: true, type: 'UIntSafe' },
      payload: {
        additionalFields: 'REJECT-UNKNOWN',
        fields: {
          claim: { maxUtf8Bytes: 512, minUtf8Bytes: 1, normalization: 'NFC', required: true, type: 'String' },
          enabled: { required: true, type: 'Boolean' },
          evidenceRoots: { items: 'Bytes32LowerHex', maxItems: 8, minItems: 1, required: true, sorted: true, type: 'Array', unique: true },
        },
        required: true,
        type: 'Object',
      },
      schemaVersion: { const: TRD2_V6_PARSER_FIXTURE_SCHEMA, required: true, type: 'String' },
    },
    name: 'ParserFixtureEnvelope',
  };
  const fixtureSchema = attachContentIdentity('TRD2V6-SCHEMA', 'PARSER-FIXTURE-SCHEMA', 'CONNECT-TRD2-V6-PARSER-FIXTURE-SCHEMA-V1', fixtureSchemaBody, 'schemaId', 'schemaRoot');
  const values = [
    { kind: 'REQUIREMENT', ordinal: 1, payload: { claim: 'exact-root-binding', enabled: true, evidenceRoots: ['0'.repeat(64)] }, schemaVersion: TRD2_V6_PARSER_FIXTURE_SCHEMA },
    { kind: 'FINDING', ordinal: 2, payload: { claim: 'שמירת מקור מדויקת', enabled: false, evidenceRoots: ['1'.repeat(64)] }, schemaVersion: TRD2_V6_PARSER_FIXTURE_SCHEMA },
    { kind: 'REQUIREMENT', ordinal: 3, payload: { claim: 'line\nbreak', enabled: true, evidenceRoots: ['2'.repeat(64), '3'.repeat(64)] }, schemaVersion: TRD2_V6_PARSER_FIXTURE_SCHEMA },
  ];
  const positives = values.map((value) => fixtureRecord({
    bytes: canonicalFixture(value),
    expectedDecodedRoot: rootV6('PARSER-TYPED-MAP', TRD2_V6_PARSER_FIXTURE_SCHEMA, value),
    expectedStatus: 'PASS',
    expectedTerminal: 'NONE',
    expectedTypedMap: value,
    mutation: 'NONE',
  }));
  const base = canonicalV6(values[0]);
  const unknownTop = { futureField: false, ...values[0] };
  const missingTop = { kind: values[0].kind, ordinal: values[0].ordinal, schemaVersion: values[0].schemaVersion };
  const payloadUnknown = structuredClone(values[0]);
  payloadUnknown.payload.futureField = false;
  const unsortedRoots = structuredClone(values[2]);
  unsortedRoots.payload.evidenceRoots = ['3'.repeat(64), '2'.repeat(64)];
  const reordered = `{"schemaVersion":"${TRD2_V6_PARSER_FIXTURE_SCHEMA}","payload":{"evidenceRoots":["${'0'.repeat(64)}"],"enabled":true,"claim":"exact-root-binding"},"ordinal":1,"kind":"REQUIREMENT"}`;
  const duplicate = base.replace('{"kind":"REQUIREMENT",', '{"kind":"REQUIREMENT","kind":"FINDING",');
  const invalidEscape = base.replace('exact-root-binding', 'bad\\qescape');
  const ambiguousQuote = base.replace('exact-root-binding', 'ambiguous"quote');
  const alternateEscape = base.replace('exact-root-binding', 'ex\\u0061ct-root-binding');
  const precomposed = canonicalV6({ ...values[0], payload: { ...values[0].payload, claim: 'é' } });
  const decomposed = precomposed.replace('é', 'e\u0301');
  const unpairedSurrogate = base.replace('exact-root-binding', '\\ud800');
  const nonCanonicalNumber = base.replace('"ordinal":1', '"ordinal":1.0');
  const negativeDefinitions = [
    ['DUPLICATE-FIELD', Buffer.from(duplicate, 'utf8'), 'DUPLICATE-KEY'],
    ['UNKNOWN-FIELD', canonicalFixture(unknownTop), 'UNKNOWN-FIELD'],
    ['MISSING-FIELD', canonicalFixture(missingTop), 'MISSING-FIELD'],
    ['INVALID-UTF8', Buffer.from([0x7b, 0xff, 0x7d]), 'UTF8-INVALID'],
    ['AMBIGUOUS-QUOTE', Buffer.from(ambiguousQuote, 'utf8'), 'JSON-SYNTAX-ERROR'],
    ['TRUNCATED-RECORD', Buffer.from(base.slice(0, -1), 'utf8'), 'JSON-SYNTAX-ERROR'],
    ['INVALID-ESCAPE', Buffer.from(invalidEscape, 'utf8'), 'JSON-SYNTAX-ERROR'],
    ['REORDERED-NON-CANONICAL-KEY', Buffer.from(reordered, 'utf8'), 'NON-CANONICAL-ENCODING'],
    ['TRAILING-BYTES', Buffer.from(`${base}x`, 'utf8'), 'JSON-SYNTAX-ERROR'],
    ['ALTERNATE-ESCAPE', Buffer.from(alternateEscape, 'utf8'), 'NON-CANONICAL-ENCODING'],
    ['NON-NFC-STRING', Buffer.from(decomposed, 'utf8'), 'UNICODE-NORMALIZATION-INVALID'],
    ['UNPAIRED-SURROGATE', Buffer.from(unpairedSurrogate, 'utf8'), 'UNICODE-SCALAR-INVALID'],
    ['NON-CANONICAL-NUMBER', Buffer.from(nonCanonicalNumber, 'utf8'), 'NON-CANONICAL-ENCODING'],
    ['UNKNOWN-NESTED-FIELD', canonicalFixture(payloadUnknown), 'UNKNOWN-FIELD'],
    ['UNSORTED-ROOTS', canonicalFixture(unsortedRoots), 'SCHEMA-INVARIANT-ERROR'],
  ];
  const negatives = negativeDefinitions.map(([mutation, bytes, terminal]) => fixtureRecord({
    bytes,
    expectedDecodedRoot: null,
    expectedStatus: 'BLOCKED',
    expectedTerminal: terminal,
    expectedTypedMap: null,
    mutation,
  }));
  const allFixtures = [...positives, ...negatives];
  const body = {
    artifactClass: 'PLANNING-ONLY; PASS-1-NORMATIVE-CANDIDATE-MEMBER; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE',
    canonicalProfile: {
      byteEncoding: 'UTF-8-WITHOUT-BOM',
      collectionOrder: 'DECLARED-ARRAY-ORDER; SET-LIKE-ARRAYS-DECLARE-SORT-RULE',
      duplicateKeys: 'REJECT-DUPLICATE-KEY',
      lineEndings: 'NO-WHITESPACE-IN-CANONICAL-BODY',
      normalization: 'DECODED-UNICODE-SCALAR-NFC',
      numberDomain: 'IEEE-754-SAFE-INTEGERS-ONLY; CANONICAL-DECIMAL; NO-NEGATIVE-ZERO',
      objectKeyOrder: 'UNSIGNED-UTF8-BYTE-LEXICOGRAPHIC',
      rootPreimage: 'UTF8(CONNECT-TRD2-V6-ROOT-V1)+NUL+U32BE(typeTagBytes)+typeTag+U32BE(schemaBytes)+schema+U64BE(canonicalBodyBytes)+canonicalBody',
      stringEscapes: 'JSON-ESCAPES; RE-ENCODE-BYTE-EQUALITY-REQUIRED',
      unknownFields: 'REJECT-UNKNOWN-FIELD',
    },
    claimLimit: 'LOCAL-PARSER-DEFINITION-AND-CORPUS-ONLY; ZERO-FINDING-CLOSURE; ZERO-ACCEPTANCE',
    fixtureCollectionRoot: rootV6('PARSER-FIXTURE-COLLECTION', 'CONNECT-TRD2-V6-PARSER-CORPUS-V1', allFixtures),
    fixtureSchema,
    grammar,
    negativeFixtureCount: negatives.length,
    negativeFixtures: negatives,
    positiveFixtureCount: positives.length,
    positiveFixtures: positives,
    schemaVersion: 'CONNECT-TRD2-V6-PARSER-GRAMMAR-AND-CORPUS-V1',
  };
  return attachContentIdentity('TRD2V6-PARSER-CORPUS', 'PARSER-GRAMMAR-AND-CORPUS', body.schemaVersion, body);
}

function validateFixtureRecord(record, label) {
  assertClosedObject(record, ['byteLength', 'bytesBase64', 'captureId', 'captureSha256', 'endByte', 'expectedDecodedRoot', 'expectedStatus', 'expectedTerminal', 'expectedTypedMap', 'fixtureId', 'fixtureRoot', 'mutation', 'sha256', 'startByte'], label);
  validateContentIdentity(record, 'TRD2V6-FIXTURE', 'PARSER-FIXTURE', 'CONNECT-TRD2-V6-PARSER-CORPUS-RECORD-V1', 'fixtureId', 'fixtureRoot');
  const bytes = Buffer.from(record.bytesBase64, 'base64');
  if (
    bytes.toString('base64') !== record.bytesBase64
    || bytes.length !== record.byteLength
    || sha256Bytes(bytes) !== record.sha256
    || record.captureSha256 !== record.sha256
    || record.captureId !== `TRD2V6-FIXTURE-CAPTURE-${record.sha256}`
    || record.startByte !== 0
    || record.endByte !== record.byteLength
  ) throw new V6ValidationError(`${label}: byte or capture identity mismatch`);
  const outcome = executeParserFixture(bytes);
  if (
    outcome.status !== record.expectedStatus
    || outcome.terminal !== record.expectedTerminal
    || outcome.decodedRoot !== record.expectedDecodedRoot
    || canonicalV6(outcome.value) !== canonicalV6(record.expectedTypedMap)
  ) throw new V6ValidationError(`${label}: expected outcome mismatch`);
  return record;
}

export function validateParserGrammarAndCorpus(artifact) {
  assertClosedObject(artifact, ['artifactClass', 'artifactId', 'artifactRoot', 'canonicalProfile', 'claimLimit', 'fixtureCollectionRoot', 'fixtureSchema', 'grammar', 'negativeFixtureCount', 'negativeFixtures', 'positiveFixtureCount', 'positiveFixtures', 'schemaVersion'], 'parserCorpus');
  if (artifact.schemaVersion !== 'CONNECT-TRD2-V6-PARSER-GRAMMAR-AND-CORPUS-V1') throw new V6ValidationError('parserCorpus: schema mismatch');
  validateContentIdentity(artifact, 'TRD2V6-PARSER-CORPUS', 'PARSER-GRAMMAR-AND-CORPUS', artifact.schemaVersion);
  validateContentIdentity(artifact.grammar, 'TRD2V6-GRAMMAR', 'PARSER-GRAMMAR', 'CONNECT-TRD2-V6-PARSER-GRAMMAR-V1', 'grammarId', 'grammarRoot');
  validateContentIdentity(artifact.fixtureSchema, 'TRD2V6-SCHEMA', 'PARSER-FIXTURE-SCHEMA', 'CONNECT-TRD2-V6-PARSER-FIXTURE-SCHEMA-V1', 'schemaId', 'schemaRoot');
  if (!Array.isArray(artifact.positiveFixtures) || !Array.isArray(artifact.negativeFixtures)) throw new V6ValidationError('parserCorpus: fixtures must be arrays');
  if (artifact.positiveFixtureCount !== artifact.positiveFixtures.length || artifact.negativeFixtureCount !== artifact.negativeFixtures.length) throw new V6ValidationError('parserCorpus: fixture count mismatch');
  if (artifact.positiveFixtureCount < 3 || artifact.negativeFixtureCount < 9) throw new V6ValidationError('parserCorpus: insufficient exact corpus');
  const fixtures = [...artifact.positiveFixtures, ...artifact.negativeFixtures];
  fixtures.forEach((fixture, index) => validateFixtureRecord(fixture, `parserCorpus.fixture[${index}]`));
  if (new Set(fixtures.map(({ fixtureId }) => fixtureId)).size !== fixtures.length) throw new V6ValidationError('parserCorpus: duplicate fixture identity');
  if (rootV6('PARSER-FIXTURE-COLLECTION', 'CONNECT-TRD2-V6-PARSER-CORPUS-V1', fixtures) !== artifact.fixtureCollectionRoot) throw new V6ValidationError('parserCorpus: fixture collection root mismatch');
  const requiredMutations = ['DUPLICATE-FIELD', 'UNKNOWN-FIELD', 'MISSING-FIELD', 'INVALID-UTF8', 'AMBIGUOUS-QUOTE', 'TRUNCATED-RECORD', 'INVALID-ESCAPE', 'REORDERED-NON-CANONICAL-KEY', 'TRAILING-BYTES'];
  if (requiredMutations.some((mutation) => !artifact.negativeFixtures.some((fixture) => fixture.mutation === mutation))) throw new V6ValidationError('parserCorpus: required mutation missing');
  return artifact;
}

export function makeParserReport({ artifact, implementation, parserId, sourceSha256, toolchainRoot }) {
  validateParserGrammarAndCorpus(artifact);
  if (!['PARSER-A', 'PARSER-B'].includes(parserId) || !SHA256_RE.test(sourceSha256) || !SHA256_RE.test(toolchainRoot)) throw new V6ValidationError('parserReport: invalid producer identity');
  const fixtures = [...artifact.positiveFixtures, ...artifact.negativeFixtures];
  const outcomes = fixtures.map((fixture) => {
    const observed = executeParserFixture(Buffer.from(fixture.bytesBase64, 'base64'));
    return {
      decodedRoot: observed.decodedRoot,
      expectedStatus: fixture.expectedStatus,
      expectedTerminal: fixture.expectedTerminal,
      fixtureId: fixture.fixtureId,
      fixtureSha256: fixture.sha256,
      observedStatus: observed.status,
      observedTerminal: observed.terminal,
    };
  });
  const mismatchCount = outcomes.filter((row, index) => {
    const fixture = fixtures[index];
    return row.expectedStatus !== row.observedStatus
      || row.expectedTerminal !== row.observedTerminal
      || row.decodedRoot !== fixture.expectedDecodedRoot;
  }).length;
  const body = {
    artifactClass: 'PRODUCER-ONLY; LOCAL-PARSER-REPORT; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE',
    claimLimit: 'MECHANICAL-PARSER-AGREEMENT-ONLY; EXTERNAL-CLOSURE-CREDIT-ZERO',
    corpusRoot: artifact.artifactRoot,
    fixtureCollectionRoot: artifact.fixtureCollectionRoot,
    implementation,
    mismatchCount,
    outcomeCount: outcomes.length,
    outcomeRoot: rootV6('PARSER-OUTCOME-COLLECTION', 'CONNECT-TRD2-V6-PARSER-REPORT-V1', outcomes),
    outcomes,
    parserId,
    schemaVersion: 'CONNECT-TRD2-V6-PARSER-REPORT-V1',
    sourceSha256,
    status: mismatchCount === 0 ? 'PASS-LOCAL-CANDIDATE-NOT-ACCEPTED' : 'BLOCKED-PARSER-DISAGREEMENT',
    toolchainRoot,
  };
  return attachContentIdentity('TRD2V6-PARSER-REPORT', 'PARSER-REPORT', body.schemaVersion, body);
}

export function validateParserReport(report, artifact) {
  assertClosedObject(report, ['artifactClass', 'artifactId', 'artifactRoot', 'claimLimit', 'corpusRoot', 'fixtureCollectionRoot', 'implementation', 'mismatchCount', 'outcomeCount', 'outcomeRoot', 'outcomes', 'parserId', 'schemaVersion', 'sourceSha256', 'status', 'toolchainRoot'], 'parserReport');
  if (report.schemaVersion !== 'CONNECT-TRD2-V6-PARSER-REPORT-V1' || !['PARSER-A', 'PARSER-B'].includes(report.parserId)) throw new V6ValidationError('parserReport: identity mismatch');
  validateContentIdentity(report, 'TRD2V6-PARSER-REPORT', 'PARSER-REPORT', report.schemaVersion);
  if (report.corpusRoot !== artifact.artifactRoot || report.fixtureCollectionRoot !== artifact.fixtureCollectionRoot) throw new V6ValidationError('parserReport: corpus binding mismatch');
  if (!SHA256_RE.test(report.sourceSha256) || !SHA256_RE.test(report.toolchainRoot)) throw new V6ValidationError('parserReport: invalid source/toolchain root');
  if (!Array.isArray(report.outcomes) || report.outcomeCount !== report.outcomes.length) throw new V6ValidationError('parserReport: outcome count mismatch');
  report.outcomes.forEach((row, index) => {
    assertClosedObject(row, ['decodedRoot', 'expectedStatus', 'expectedTerminal', 'fixtureId', 'fixtureSha256', 'observedStatus', 'observedTerminal'], `parserReport.outcomes[${index}]`);
    if (!(row.decodedRoot === null || SHA256_RE.test(row.decodedRoot)) || !SHA256_RE.test(row.fixtureSha256)) throw new V6ValidationError(`parserReport: malformed outcome ${index}`);
  });
  if (rootV6('PARSER-OUTCOME-COLLECTION', 'CONNECT-TRD2-V6-PARSER-REPORT-V1', report.outcomes) !== report.outcomeRoot) throw new V6ValidationError('parserReport: outcome root mismatch');
  const fixtures = [...artifact.positiveFixtures, ...artifact.negativeFixtures];
  if (report.outcomes.length !== fixtures.length) throw new V6ValidationError('parserReport: outcome denominator differs from corpus');
  const mismatchCount = report.outcomes.filter((row, index) => {
    const fixture = fixtures[index];
    const observed = executeParserFixture(Buffer.from(fixture.bytesBase64, 'base64'));
    if (
      row.fixtureId !== fixture.fixtureId
      || row.fixtureSha256 !== fixture.sha256
      || row.expectedStatus !== fixture.expectedStatus
      || row.expectedTerminal !== fixture.expectedTerminal
      || row.observedStatus !== observed.status
      || row.observedTerminal !== observed.terminal
      || row.decodedRoot !== observed.decodedRoot
    ) throw new V6ValidationError(`parserReport: outcome does not bind corpus fixture ${index}`);
    return row.expectedStatus !== row.observedStatus
      || row.expectedTerminal !== row.observedTerminal
      || row.decodedRoot !== fixture.expectedDecodedRoot;
  }).length;
  if (report.mismatchCount !== mismatchCount || report.status !== (mismatchCount === 0 ? 'PASS-LOCAL-CANDIDATE-NOT-ACCEPTED' : 'BLOCKED-PARSER-DISAGREEMENT')) throw new V6ValidationError('parserReport: status mismatch');
  return report;
}

export function validateSourceCaptureManifest(manifest) {
  assertClosedObject(manifest, ['artifactClass', 'artifactId', 'artifactRoot', 'claimLimit', 'developmentFreeze', 'f015Disposition', 'gate29', 'observedHead', 'observedObjectFormat', 'repositoryVisibility', 'schemaVersion', 'sourceCollectionRoot', 'sourceCount', 'sources'], 'sourceCapture');
  if (manifest.schemaVersion !== 'CONNECT-TRD2-V6-SOURCE-CAPTURE-MANIFEST-V1') throw new V6ValidationError('sourceCapture: schema mismatch');
  validateContentIdentity(manifest, 'TRD2V6-SOURCE-CAPTURE', 'SOURCE-CAPTURE-MANIFEST', manifest.schemaVersion);
  if (!COMMIT_RE.test(manifest.observedHead) || !['sha1', 'sha256'].includes(manifest.observedObjectFormat)) throw new V6ValidationError('sourceCapture: invalid Git identity');
  if (manifest.repositoryVisibility !== 'PUBLIC' || manifest.developmentFreeze !== 'ACTIVE' || manifest.gate29 !== 'BLOCKED') throw new V6ValidationError('sourceCapture: invariant mismatch');
  if (!Array.isArray(manifest.sources) || manifest.sourceCount !== manifest.sources.length || manifest.sourceCount !== TRD2_V6_REQUIRED_CAPTURE_SOURCES.length) throw new V6ValidationError('sourceCapture: source count mismatch');
  if (new Set(manifest.sources.map(({ sourceId }) => sourceId)).size !== manifest.sources.length) throw new V6ValidationError('sourceCapture: duplicate source');
  const expectedByPath = new Map(TRD2_V6_REQUIRED_CAPTURE_SOURCES.map(([role, logicalPath, expectedSha256]) => [logicalPath, { expectedSha256, role }]));
  if (new Set(manifest.sources.map(({ logicalPath }) => logicalPath)).size !== expectedByPath.size) throw new V6ValidationError('sourceCapture: source path denominator mismatch');
  for (const source of manifest.sources) {
    assertClosedObject(source, ['byteLength', 'capture', 'logicalPath', 'observedCommit', 'role', 'sha256', 'sourceId', 'sourceRoot'], `sourceCapture.sources.${source.logicalPath ?? 'unknown'}`);
    assertClosedObject(source.capture, ['captureSha256', 'contentAddress', 'endByte', 'kind', 'observedCommit', 'repositoryRelativePath', 'startByte'], `sourceCapture.sources.${source.logicalPath ?? 'unknown'}.capture`);
    validateContentIdentity(source, 'TRD2V6-SOURCE', 'SOURCE-CAPTURE-ROW', 'CONNECT-TRD2-V6-SOURCE-CAPTURE-ROW-V1', 'sourceId', 'sourceRoot');
    assertRepoRelativePath(source.logicalPath);
    const expected = expectedByPath.get(source.logicalPath);
    if (
      expected === undefined
      || source.role !== expected.role
      || (expected.expectedSha256 !== null && source.sha256 !== expected.expectedSha256)
      || source.observedCommit !== manifest.observedHead
      || !SHA256_RE.test(source.sha256)
      || source.capture.captureSha256 !== source.sha256
      || source.capture.contentAddress !== `sha256:${source.sha256}`
      || source.capture.kind !== 'GIT-COMMIT-PATH-FULL-MEMBER'
      || source.capture.observedCommit !== manifest.observedHead
      || source.capture.repositoryRelativePath !== source.logicalPath
      || source.capture.startByte !== 0
      || source.capture.endByte !== source.byteLength
    ) throw new V6ValidationError(`sourceCapture: invalid source ${source.logicalPath}`);
  }
  const sortedSourceIds = manifest.sources.map(({ sourceId }) => sourceId).sort((left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')));
  assertExactArray(manifest.sources.map(({ sourceId }) => sourceId), sortedSourceIds, 'sourceCapture.sourceOrder');
  if (rootV6('SOURCE-CAPTURE-COLLECTION', 'CONNECT-TRD2-V6-SOURCE-CAPTURE-MANIFEST-V1', manifest.sources) !== manifest.sourceCollectionRoot) throw new V6ValidationError('sourceCapture: collection root mismatch');
  const disposition = manifest.f015Disposition;
  assertClosedObject(disposition, ['acquisitionScope', 'branch', 'candidateBlobCountOfExpectedSize', 'closureCredit', 'dependentArtifacts', 'directOccurrenceCount', 'directOccurrences', 'exactBlobMatchOids', 'exactBlobMatches', 'expectedLedgerByteLength', 'expectedLedgerLineCount', 'expectedLedgerSha256', 'observationPaths', 'rederivationState', 'replacementLedger', 'silentSubstitutionCount'], 'sourceCapture.f015Disposition');
  if (
    disposition.acquisitionScope !== 'ALL-GIT-BLOBS-REACHABLE-FROM-OBSERVED-HEAD; EXPECTED-SIZE-AND-SHA256-MATCH'
    || disposition.expectedLedgerByteLength !== 98306
    || disposition.expectedLedgerLineCount !== 993
    || !Number.isSafeInteger(disposition.candidateBlobCountOfExpectedSize)
    || disposition.candidateBlobCountOfExpectedSize < 0
    || !Array.isArray(disposition.exactBlobMatchOids)
    || disposition.exactBlobMatchOids.length !== 0
    || disposition.silentSubstitutionCount !== 0
  ) throw new V6ValidationError('sourceCapture: invalid F015 acquisition envelope');
  if (disposition.expectedLedgerSha256 !== TRD2_V6_EXPECTED_LEDGER_SHA256 || disposition.branch !== 'INVALIDATE-AND-REDERIVE' || disposition.exactBlobMatches !== 0 || disposition.closureCredit !== 0 || disposition.rederivationState !== 'PENDING-PASSES-2-TO-6-AND-INDEPENDENT-REVIEW') throw new V6ValidationError('sourceCapture: unsafe F015 disposition');
  assertExactArray(disposition.observationPaths, TRD2_V6_F015_OBSERVATION_PATHS, 'sourceCapture.f015Disposition.observationPaths');
  if (!Array.isArray(disposition.directOccurrences) || disposition.directOccurrenceCount !== disposition.directOccurrences.length || disposition.directOccurrenceCount !== 5) throw new V6ValidationError('sourceCapture: F015 direct occurrence denominator mismatch');
  for (const row of disposition.directOccurrences) {
    assertClosedObject(row, ['endByte', 'line', 'logicalPath', 'matchedSha256Literal', 'occurrenceId', 'occurrenceRoot', 'sourceSha256', 'startByte'], `sourceCapture.f015Disposition.directOccurrences.${row.occurrenceId ?? 'unknown'}`);
    validateContentIdentity(row, 'TRD2V6-F015-OCCURRENCE', 'F015-DIRECT-OCCURRENCE', 'CONNECT-TRD2-V6-F015-OCCURRENCE-V1', 'occurrenceId', 'occurrenceRoot');
    if (!disposition.observationPaths.includes(row.logicalPath) || row.matchedSha256Literal !== TRD2_V6_EXPECTED_LEDGER_SHA256 || !SHA256_RE.test(row.sourceSha256) || !Number.isSafeInteger(row.startByte) || !Number.isSafeInteger(row.endByte) || row.startByte < 0 || row.endByte - row.startByte !== 64 || !Number.isSafeInteger(row.line) || row.line < 1) throw new V6ValidationError(`sourceCapture: malformed F015 occurrence ${row.occurrenceId}`);
  }
  if (new Set(disposition.directOccurrences.map(({ occurrenceId }) => occurrenceId)).size !== disposition.directOccurrences.length) throw new V6ValidationError('sourceCapture: duplicate F015 occurrence');
  if (!Array.isArray(disposition.dependentArtifacts)) throw new V6ValidationError('sourceCapture: F015 dependent artifacts must be an array');
  assertExactArray(disposition.dependentArtifacts.map(({ logicalPath }) => logicalPath), TRD2_V6_F015_DEPENDENT_PATHS, 'sourceCapture.f015Disposition.dependentArtifacts');
  for (const row of disposition.dependentArtifacts) {
    assertClosedObject(row, ['byteLength', 'disposition', 'logicalPath', 'observedSha256'], `sourceCapture.f015Disposition.dependentArtifacts.${row.logicalPath ?? 'unknown'}`);
    const expectedDisposition = row.logicalPath === 'docs/planning/master-plan-recovery-ledger-2026-08-29.md'
      ? 'NEW-FROZEN-REPLACEMENT-SOURCE'
      : row.logicalPath === 'docs/planning/section-35-6-trd-2-v6-successor-build-charter-2026-08-30.md'
        ? 'RETAINED-BRANCH-INSTRUCTION'
        : 'INVALIDATED-F015-DEPENDENCY-PENDING-REDERIVATION';
    if (row.disposition !== expectedDisposition || !SHA256_RE.test(row.observedSha256) || !Number.isSafeInteger(row.byteLength) || row.byteLength < 1) throw new V6ValidationError(`sourceCapture: invalid F015 dependent disposition for ${row.logicalPath}`);
  }
  assertClosedObject(disposition.replacementLedger, ['byteLength', 'logicalPath', 'observedCommit', 'sha256'], 'sourceCapture.f015Disposition.replacementLedger');
  const replacementSource = manifest.sources.find(({ logicalPath }) => logicalPath === disposition.replacementLedger.logicalPath);
  if (
    replacementSource === undefined
    || disposition.replacementLedger.logicalPath !== 'docs/planning/master-plan-recovery-ledger-2026-08-29.md'
    || disposition.replacementLedger.observedCommit !== manifest.observedHead
    || disposition.replacementLedger.byteLength !== replacementSource.byteLength
    || disposition.replacementLedger.sha256 !== replacementSource.sha256
  ) throw new V6ValidationError('sourceCapture: replacement ledger binding mismatch');
  return manifest;
}

export function validatePass1GenerationReceipt(receipt) {
  assertClosedObject(receipt, ['artifactClass', 'artifactId', 'artifactRoot', 'claimLimit', 'developmentFreeze', 'f015Branch', 'gate29', 'generatedArtifacts', 'observedHead', 'outputRegistry', 'pass', 'repositoryVisibility', 'schemaVersion', 'status', 'toolchain', 'toolchainRegistry', 'toolchainRoot'], 'generationReceipt');
  if (receipt.schemaVersion !== 'CONNECT-TRD2-V6-PASS1-GENERATION-RECEIPT-V1' || receipt.pass !== 1) throw new V6ValidationError('generationReceipt: schema or pass mismatch');
  validateContentIdentity(receipt, 'TRD2V6-GENERATION-RECEIPT', 'PASS1-GENERATION-RECEIPT', receipt.schemaVersion);
  if (!COMMIT_RE.test(receipt.observedHead) || receipt.repositoryVisibility !== 'PUBLIC' || receipt.developmentFreeze !== 'ACTIVE' || receipt.gate29 !== 'BLOCKED') throw new V6ValidationError('generationReceipt: invariant mismatch');
  if (receipt.f015Branch !== 'INVALIDATE-AND-REDERIVE' || receipt.status !== 'BASE-GENERATED-PENDING-PARSER-A-AND-PARSER-B') throw new V6ValidationError('generationReceipt: unsafe status');
  assertClosedObject(receipt.outputRegistry, ['logicalPath', 'sha256'], 'generationReceipt.outputRegistry');
  assertClosedObject(receipt.toolchainRegistry, ['logicalPath', 'sha256'], 'generationReceipt.toolchainRegistry');
  if (receipt.outputRegistry.logicalPath !== TRD2_V6_OUTPUT_REGISTRY_PATH || !SHA256_RE.test(receipt.outputRegistry.sha256)) throw new V6ValidationError('generationReceipt: output registry mismatch');
  if (receipt.toolchainRegistry.logicalPath !== TRD2_V6_TOOLCHAIN_REGISTRY_PATH || !SHA256_RE.test(receipt.toolchainRegistry.sha256)) throw new V6ValidationError('generationReceipt: toolchain registry mismatch');
  if (!Array.isArray(receipt.toolchain) || receipt.toolchain.length !== TRD2_V6_TOOLCHAIN_PATHS.length) throw new V6ValidationError('generationReceipt: toolchain denominator mismatch');
  assertExactArray(receipt.toolchain.map(({ logicalPath }) => logicalPath), TRD2_V6_TOOLCHAIN_PATHS, 'generationReceipt.toolchainPaths');
  receipt.toolchain.forEach((row, index) => assertClosedObject(row, ['byteLength', 'logicalPath', 'observedCommit', 'sha256'], `generationReceipt.toolchain[${index}]`));
  if (receipt.toolchain.some((row) => row.observedCommit !== receipt.observedHead || !SHA256_RE.test(row.sha256) || !Number.isSafeInteger(row.byteLength) || row.byteLength < 1)) throw new V6ValidationError('generationReceipt: malformed toolchain row');
  if (toolchainRoot(receipt.toolchain) !== receipt.toolchainRoot) throw new V6ValidationError('generationReceipt: toolchain root mismatch');
  const expectedGenerated = [TRD2_V6_PASS1_PATHS[0], TRD2_V6_PASS1_PATHS[1]];
  if (!Array.isArray(receipt.generatedArtifacts)) throw new V6ValidationError('generationReceipt: generated artifacts must be an array');
  assertExactArray(receipt.generatedArtifacts.map(({ logicalPath }) => logicalPath), expectedGenerated, 'generationReceipt.generatedArtifacts');
  const expectedSchemas = new Map([
    [TRD2_V6_PASS1_PATHS[0], 'CONNECT-TRD2-V6-SOURCE-CAPTURE-MANIFEST-V1'],
    [TRD2_V6_PASS1_PATHS[1], 'CONNECT-TRD2-V6-PARSER-GRAMMAR-AND-CORPUS-V1'],
  ]);
  receipt.generatedArtifacts.forEach((row, index) => assertClosedObject(row, ['artifactRoot', 'logicalPath', 'schemaVersion'], `generationReceipt.generatedArtifacts[${index}]`));
  if (receipt.generatedArtifacts.some((row) => !SHA256_RE.test(row.artifactRoot) || row.schemaVersion !== expectedSchemas.get(row.logicalPath))) throw new V6ValidationError('generationReceipt: malformed generated artifact');
  return receipt;
}

export function toolchainRoot(rows) {
  return rootV6('TOOLCHAIN-FILE-COLLECTION', 'CONNECT-TRD2-V6-PASS1-TOOLCHAIN-V1', rows);
}
