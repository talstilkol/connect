import {
  assertClosedObject,
  assertRepoRelativePath,
  assertUnicodeScalarAndNfc,
  attachContentIdentity,
  canonicalV6,
  parseCanonicalJsonBytes,
  rootV6,
  sha256Bytes,
  validateContentIdentity,
} from './trd2-v6-core.mjs';

export const TRD2_V6_PASS2_V2_DIRECTORY = 'docs/planning/trd2-v6-candidate-v2-2026-08-31';
export const TRD2_V6_PASS2_V2_OUTPUT_REGISTRY_PATH = 'docs/planning/trd2-v6-output-path-registry-v2-2026-08-31.json';
export const TRD2_V6_PASS2_V2_TOOLCHAIN_REGISTRY_PATH = 'docs/planning/trd2-v6-pass2-v2-toolchain-path-registry-v1-2026-08-31.json';
export const TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH = 'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-2026-08-29.md';
export const TRD2_V6_PASS2_V2_PATHS = Object.freeze([
  `${TRD2_V6_PASS2_V2_DIRECTORY}/closed-schema-registry-v2.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/canonical-engine-a-report-v2.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/canonical-engine-b-report-v2.json`,
]);
export const TRD2_V6_PASS2_V1_REJECTED_PATHS = Object.freeze([
  'docs/planning/trd2-v6-candidate-2026-08-30/closed-schema-registry.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/canonical-engine-a-report.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/canonical-engine-b-report.json',
]);
export const TRD2_V6_PASS1_REUSED_PATHS = Object.freeze([
  'docs/planning/trd2-v6-candidate-2026-08-30/source-capture-manifest.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/parser-grammar-and-corpus.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/generation-receipt.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/parser-engine-a-report.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/parser-engine-b-report.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/pass-1-producer-qa.json',
]);
export const TRD2_V6_PASS2_V2_TOOLCHAIN_PATHS = Object.freeze([
  'docs/planning/section-35-6-trd-2-v6-pass2-v2-restart-charter-2026-08-31.md',
  TRD2_V6_PASS2_V2_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS2_V2_TOOLCHAIN_REGISTRY_PATH,
  TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH,
  ...TRD2_V6_PASS1_REUSED_PATHS,
  'package.json',
  'scripts/trd2-v6-core.mjs',
  'scripts/trd2-v6-pass2-v2-core.mjs',
  'scripts/create-trd2-v6-pass2-v2-candidate.mjs',
  'scripts/verify-trd2-v6-canonical-v2-engine-a.mjs',
  'scripts/verify-trd2-v6-canonical-v2-engine-b.py',
  'scripts/verify-trd2-v6-pass2-v2-candidate.mjs',
  'tests/trd2-v6-pass2-v2-core.test.mjs',
]);

export const TRD2_V6_PASS2_V2_NORMATIVE_PATHS = Object.freeze([
  `${TRD2_V6_PASS2_V2_DIRECTORY}/subject.json`,
  TRD2_V6_PASS1_REUSED_PATHS[0],
  TRD2_V6_PASS2_V2_PATHS[0],
  TRD2_V6_PASS1_REUSED_PATHS[1],
  `${TRD2_V6_PASS2_V2_DIRECTORY}/clause-ast-registry.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/causal-graph.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/state-machine-registry.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/executable-vector-corpus.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/raw-root-overlay-and-invalidation.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/detached-acceptance-packet.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/finding-closure-crosswalk.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/atomic-package-manifest.json`,
]);
export const TRD2_V6_PASS2_V2_PRODUCER_PATHS = Object.freeze([
  TRD2_V6_PASS1_REUSED_PATHS[2],
  TRD2_V6_PASS1_REUSED_PATHS[3],
  TRD2_V6_PASS1_REUSED_PATHS[4],
  TRD2_V6_PASS2_V2_PATHS[1],
  TRD2_V6_PASS2_V2_PATHS[2],
  `${TRD2_V6_PASS2_V2_DIRECTORY}/graph-engine-a-report.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/graph-engine-b-report.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/vector-runner-a-report.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/vector-runner-b-report.json`,
  TRD2_V6_PASS1_REUSED_PATHS[5],
  `${TRD2_V6_PASS2_V2_DIRECTORY}/producer-qa.json`,
]);
export const TRD2_V6_PASS2_V2_EXTERNAL_PATHS = Object.freeze([
  `${TRD2_V6_PASS2_V2_DIRECTORY}/reviewer-appointment-set.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/evidence-custody-receipt.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/fresh-independent-hostile-review.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/review-generation-a.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/review-generation-b.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/review-reconciliation.json`,
  `${TRD2_V6_PASS2_V2_DIRECTORY}/definition-acceptance.json`,
]);

export const TRD2_V6_PASS2_V2_DSL_KINDS = Object.freeze([
  'Array', 'Boolean', 'Bytes32LowerHex', 'CommitHex', 'Const', 'ContentId', 'Enum',
  'LogicalPath', 'Null', 'Nullable', 'Object', 'OneOf', 'String', 'UIntSafe',
]);

const REQUIREMENT_FIELDS = Object.freeze(['statement', 'defectCauseImpact', 'proofPredicate', 'dependencies', 'sourceBasis']);
const SHA256_RE = /^[0-9a-f]{64}$/;
const COMMIT_RE = /^[0-9a-f]{40}([0-9a-f]{24})?$/;

export class V2SchemaValidationError extends Error {
  constructor(terminal, message) {
    super(message);
    this.terminal = terminal;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function sortedUtf8(values) {
  return [...values].sort((left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')));
}

function assertExactArray(actual, expected, label) {
  if (!Array.isArray(actual) || canonicalV6(actual) !== canonicalV6(expected)) throw new Error(`${label}: exact ordered array mismatch`);
}

export function pass2V2ToolchainRoot(rows) {
  return rootV6('TOOLCHAIN-FILE-COLLECTION', 'CONNECT-TRD2-V6-PASS2-V2-TOOLCHAIN-V1', rows);
}

export function validateOutputPathRegistryV2(registry) {
  assertClosedObject(registry, [
    'artifactId', 'candidateDirectory', 'externalReviewAndAcceptancePaths', 'normativePackageMemberPaths',
    'owner', 'passTwoV2EmittedPaths', 'producerOnlyPaths', 'reusedImmutablePassOnePaths', 'schema',
    'supersededRejectedPaths', 'version',
  ], 'outputRegistryV2');
  if (registry.schema !== 'CONNECT-TRD2-V6-OUTPUT-PATH-REGISTRY-V2' || registry.version !== 2 || registry.owner !== 'Tal') throw new Error('outputRegistryV2: identity mismatch');
  if (registry.artifactId !== 'CONNECT-TRD2-V6-CANDIDATE-V2-2026-08-31' || registry.candidateDirectory !== TRD2_V6_PASS2_V2_DIRECTORY) throw new Error('outputRegistryV2: candidate mismatch');
  assertExactArray(registry.reusedImmutablePassOnePaths, TRD2_V6_PASS1_REUSED_PATHS, 'outputRegistryV2.reusedImmutablePassOnePaths');
  assertExactArray(registry.supersededRejectedPaths, TRD2_V6_PASS2_V1_REJECTED_PATHS, 'outputRegistryV2.supersededRejectedPaths');
  assertExactArray(registry.normativePackageMemberPaths, TRD2_V6_PASS2_V2_NORMATIVE_PATHS, 'outputRegistryV2.normativePackageMemberPaths');
  assertExactArray(registry.producerOnlyPaths, TRD2_V6_PASS2_V2_PRODUCER_PATHS, 'outputRegistryV2.producerOnlyPaths');
  assertExactArray(registry.externalReviewAndAcceptancePaths, TRD2_V6_PASS2_V2_EXTERNAL_PATHS, 'outputRegistryV2.externalReviewAndAcceptancePaths');
  assertExactArray(registry.passTwoV2EmittedPaths, TRD2_V6_PASS2_V2_PATHS, 'outputRegistryV2.passTwoV2EmittedPaths');
  const allPaths = [...registry.normativePackageMemberPaths, ...registry.producerOnlyPaths, ...registry.externalReviewAndAcceptancePaths];
  if (new Set(allPaths).size !== allPaths.length) throw new Error('outputRegistryV2: duplicate package path');
  [...allPaths, ...registry.supersededRejectedPaths].forEach(assertRepoRelativePath);
  return registry;
}

export function validatePass2V2ToolchainRegistry(registry) {
  assertClosedObject(registry, ['passTwoV2EmittedPaths', 'schema', 'toolchainPaths', 'version'], 'pass2V2ToolchainRegistry');
  if (registry.schema !== 'CONNECT-TRD2-V6-PASS2-V2-TOOLCHAIN-PATH-REGISTRY-V1' || registry.version !== 1) throw new Error('pass2V2ToolchainRegistry: identity mismatch');
  assertExactArray(registry.passTwoV2EmittedPaths, TRD2_V6_PASS2_V2_PATHS, 'pass2V2ToolchainRegistry.passTwoV2EmittedPaths');
  assertExactArray(registry.toolchainPaths, TRD2_V6_PASS2_V2_TOOLCHAIN_PATHS, 'pass2V2ToolchainRegistry.toolchainPaths');
  if (new Set(registry.toolchainPaths).size !== registry.toolchainPaths.length) throw new Error('pass2V2ToolchainRegistry: duplicate path');
  registry.toolchainPaths.forEach(assertRepoRelativePath);
  return registry;
}

function byteOffset(text, characterOffset) {
  return Buffer.byteLength(text.slice(0, characterOffset), 'utf8');
}

export function parseRequirementSource(sourceBytes, sourcePath = TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH) {
  const text = Buffer.from(sourceBytes).toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(Buffer.from(sourceBytes))) throw new Error('Requirement source is not strict UTF-8');
  const headingPattern = /^## \d+\.\d+ `(?<id>TRD2V5-REQ-(?<ordinal>\d{3}))`[^\n]*$/gm;
  const headings = [...text.matchAll(headingPattern)];
  if (headings.length !== 128) throw new Error(`Requirement denominator mismatch: ${headings.length}/128`);
  const sourceSha256 = sha256Bytes(sourceBytes);
  return headings.map((heading, index) => {
    const expectedId = `TRD2V5-REQ-${String(index).padStart(3, '0')}`;
    if (heading.groups.id !== expectedId || Number(heading.groups.ordinal) !== index) throw new Error(`Requirement order mismatch at ${index}`);
    const blockStartCharacter = heading.index;
    const blockEndCharacter = index + 1 < headings.length ? headings[index + 1].index : text.length;
    const block = text.slice(blockStartCharacter, blockEndCharacter);
    const fieldMatches = [...block.matchAll(/^- `(?<name>statement|defectCauseImpact|proofPredicate|dependencies|sourceBasis)`: (?<value>[^\r\n]*)$/gm)];
    if (fieldMatches.length !== REQUIREMENT_FIELDS.length) throw new Error(`${expectedId}: field denominator mismatch`);
    assertExactArray(fieldMatches.map((match) => match.groups.name), REQUIREMENT_FIELDS, `${expectedId}.fieldOrder`);
    const content = Object.fromEntries(fieldMatches.map((match) => [match.groups.name, match.groups.value]));
    assertClosedObject(content, REQUIREMENT_FIELDS, `${expectedId}.content`);
    const schemaVersion = 'CONNECT-TRD2-V6-REQUIREMENT-RECORD-V2';
    const requirementRoot = rootV6('REQUIREMENT', schemaVersion, content);
    const record = { content, recordKind: 'REQUIREMENT', requirementId: expectedId, requirementRoot, schemaVersion };
    const headingStartByte = byteOffset(text, blockStartCharacter);
    const contentStartByte = byteOffset(text, blockStartCharacter + fieldMatches[0].index);
    const last = fieldMatches.at(-1);
    const contentEndByte = byteOffset(text, blockStartCharacter + last.index + last[0].length);
    const blockEndByte = byteOffset(text, blockEndCharacter);
    const captureSha256 = sha256Bytes(Buffer.from(sourceBytes).subarray(headingStartByte, blockEndByte));
    const binding = {
      captureSha256,
      contentEndByte,
      contentStartByte,
      headingStartByte,
      recordKind: 'REQUIREMENT-SOURCE-BINDING',
      requirementId: expectedId,
      requirementRoot,
      schemaVersion: 'CONNECT-TRD2-V6-REQUIREMENT-SOURCE-BINDING-V2',
      sourcePath,
      sourceSha256,
    };
    return { binding, blockEndByte, captureSha256, content, contentEndByte, contentStartByte, headingStartByte, record };
  });
}

function stringSpec(values, propertyName) {
  if (values.every((value) => SHA256_RE.test(value))) return { kind: 'Bytes32LowerHex' };
  if (/commit|head/i.test(propertyName) && values.every((value) => COMMIT_RE.test(value))) return { kind: 'CommitHex' };
  if (/logicalPath|repositoryRelativePath|sourcePath/i.test(propertyName)) {
    try {
      values.forEach(assertRepoRelativePath);
      return { kind: 'LogicalPath' };
    } catch {
      // Fall through to a bounded string when a value is intentionally not a repository path.
    }
  }
  const contentIdMatches = values.map((value) => value.match(/^(.+)-([0-9a-f]{64})$/));
  if (contentIdMatches.every(Boolean) && new Set(contentIdMatches.map((match) => match[1])).size === 1) return { kind: 'ContentId', prefix: contentIdMatches[0][1] };
  if (/(status|state|kind|class|mode|version|format|role|pass|gate|visibility|branch|disposition|terminal)$/i.test(propertyName)) {
    const distinct = sortedUtf8(new Set(values));
    if (distinct.length <= 32) return { kind: 'Enum', values: distinct };
  }
  const lengths = values.map((value) => Buffer.byteLength(value, 'utf8'));
  return { kind: 'String', maxBytes: Math.max(...lengths), minBytes: Math.min(...lengths) };
}

function mergeVariants(variants) {
  const flattened = variants.flatMap((variant) => variant.kind === 'OneOf' ? variant.variants : [variant]);
  const unique = new Map(flattened.map((variant) => [canonicalV6(variant), variant]));
  const ordered = [...unique.values()].sort((left, right) => Buffer.compare(Buffer.from(canonicalV6(left)), Buffer.from(canonicalV6(right))));
  return ordered.length === 1 ? ordered[0] : { kind: 'OneOf', variants: ordered };
}

export function inferClosedSpec(values, propertyName = '$') {
  if (!Array.isArray(values) || values.length === 0) throw new Error(`${propertyName}: inference requires at least one actual value`);
  const nullCount = values.filter((value) => value === null).length;
  if (nullCount > 0) {
    if (nullCount === values.length) return { kind: 'Null' };
    return { inner: inferClosedSpec(values.filter((value) => value !== null), propertyName), kind: 'Nullable' };
  }
  const categories = new Set(values.map((value) => Array.isArray(value) ? 'array' : typeof value === 'object' ? 'object' : typeof value));
  if (categories.size > 1) return mergeVariants([...categories].map((category) => inferClosedSpec(values.filter((value) => (Array.isArray(value) ? 'array' : typeof value === 'object' ? 'object' : typeof value) === category), propertyName)));
  const category = [...categories][0];
  if (category === 'string') return stringSpec(values, propertyName);
  if (category === 'boolean') return { kind: 'Boolean' };
  if (category === 'number') {
    if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) throw new Error(`${propertyName}: only UIntSafe is allowed`);
    return { kind: 'UIntSafe', maximum: Math.max(...values), minimum: Math.min(...values) };
  }
  if (category === 'array') {
    const members = values.flat();
    if (members.length === 0) return { kind: 'Const', value: [] };
    return {
      items: inferClosedSpec(members, `${propertyName}[]`),
      kind: 'Array',
      maxItems: Math.max(...values.map((value) => value.length)),
      minItems: Math.min(...values.map((value) => value.length)),
      sorted: false,
      unique: false,
    };
  }
  if (category === 'object') {
    if (values.some((value) => !isPlainObject(value))) throw new Error(`${propertyName}: plain objects required`);
    const allKeys = sortedUtf8(new Set(values.flatMap(Object.keys)));
    const required = allKeys.filter((key) => values.every((value) => Object.hasOwn(value, key)));
    const properties = Object.fromEntries(allKeys.map((key) => [key, inferClosedSpec(values.filter((value) => Object.hasOwn(value, key)).map((value) => value[key]), key)]));
    return { additionalProperties: false, kind: 'Object', properties, required };
  }
  throw new Error(`${propertyName}: unsupported actual type ${category}`);
}

export function validateSpecDefinition(spec, label = 'spec') {
  if (!isPlainObject(spec) || !TRD2_V6_PASS2_V2_DSL_KINDS.includes(spec.kind)) throw new Error(`${label}: unknown spec kind`);
  const exactKeys = {
    Array: ['items', 'kind', 'maxItems', 'minItems', 'sorted', 'unique'],
    Boolean: ['kind'], Bytes32LowerHex: ['kind'], CommitHex: ['kind'], Const: ['kind', 'value'],
    ContentId: ['kind', 'prefix'], Enum: ['kind', 'values'], LogicalPath: ['kind'], Null: ['kind'],
    Nullable: ['inner', 'kind'], Object: ['additionalProperties', 'kind', 'properties', 'required'],
    OneOf: ['kind', 'variants'], String: ['kind', 'maxBytes', 'minBytes'], UIntSafe: ['kind', 'maximum', 'minimum'],
  };
  assertClosedObject(spec, exactKeys[spec.kind], label);
  if (spec.kind === 'Array') {
    if (!Number.isSafeInteger(spec.minItems) || !Number.isSafeInteger(spec.maxItems) || spec.minItems < 0 || spec.minItems > spec.maxItems || typeof spec.sorted !== 'boolean' || typeof spec.unique !== 'boolean') throw new Error(`${label}: invalid Array bounds`);
    validateSpecDefinition(spec.items, `${label}.items`);
  } else if (spec.kind === 'Nullable') validateSpecDefinition(spec.inner, `${label}.inner`);
  else if (spec.kind === 'OneOf') {
    if (!Array.isArray(spec.variants) || spec.variants.length < 2 || new Set(spec.variants.map(canonicalV6)).size !== spec.variants.length) throw new Error(`${label}: invalid OneOf variants`);
    spec.variants.forEach((variant, index) => validateSpecDefinition(variant, `${label}.variants[${index}]`));
  } else if (spec.kind === 'Object') {
    if (spec.additionalProperties !== false || !isPlainObject(spec.properties) || !Array.isArray(spec.required)) throw new Error(`${label}: Object must be recursively closed`);
    const propertyKeys = sortedUtf8(Object.keys(spec.properties));
    assertExactArray(spec.required, spec.required.filter((key) => propertyKeys.includes(key)), `${label}.required`);
    if (new Set(spec.required).size !== spec.required.length) throw new Error(`${label}: duplicate required key`);
    propertyKeys.forEach((key) => validateSpecDefinition(spec.properties[key], `${label}.properties.${key}`));
  } else if (spec.kind === 'Enum') {
    if (!Array.isArray(spec.values) || spec.values.length === 0 || spec.values.some((value) => typeof value !== 'string') || new Set(spec.values).size !== spec.values.length) throw new Error(`${label}: invalid Enum`);
  } else if (spec.kind === 'String') {
    if (!Number.isSafeInteger(spec.minBytes) || !Number.isSafeInteger(spec.maxBytes) || spec.minBytes < 0 || spec.minBytes > spec.maxBytes) throw new Error(`${label}: invalid String bounds`);
  } else if (spec.kind === 'UIntSafe') {
    if (!Number.isSafeInteger(spec.minimum) || !Number.isSafeInteger(spec.maximum) || spec.minimum < 0 || spec.minimum > spec.maximum) throw new Error(`${label}: invalid UIntSafe bounds`);
  } else if (spec.kind === 'ContentId') assertUnicodeScalarAndNfc(spec.prefix, `${label}.prefix`);
  else if (spec.kind === 'Const') canonicalV6(spec.value);
  return spec;
}

function fail(terminal, message) {
  throw new V2SchemaValidationError(terminal, message);
}

export function validateBySpecProducer(value, spec, label = '$') {
  if (value === null && spec.kind !== 'Null' && spec.kind !== 'Nullable' && !(spec.kind === 'Const' && spec.value === null)) fail('NULLABILITY-MISMATCH', `${label}: null is not allowed`);
  if (spec.kind === 'Null') {
    if (value !== null) fail('TYPE-MISMATCH', `${label}: expected null`);
  } else if (spec.kind === 'Nullable') {
    if (value !== null) validateBySpecProducer(value, spec.inner, label);
  } else if (spec.kind === 'OneOf') {
    let matches = 0;
    for (const variant of spec.variants) {
      try { validateBySpecProducer(value, variant, label); matches += 1; } catch (error) { if (!(error instanceof V2SchemaValidationError)) throw error; }
    }
    if (matches !== 1) fail('UNION-MISMATCH', `${label}: expected exactly one union branch, observed ${matches}`);
  } else if (spec.kind === 'Const') {
    if (canonicalV6(value) !== canonicalV6(spec.value)) fail('CONST-MISMATCH', `${label}: const mismatch`);
  } else if (spec.kind === 'Boolean') {
    if (typeof value !== 'boolean') fail('TYPE-MISMATCH', `${label}: expected boolean`);
  } else if (spec.kind === 'UIntSafe') {
    if (!Number.isSafeInteger(value) || value < 0) fail('TYPE-MISMATCH', `${label}: expected UIntSafe`);
    if (value < spec.minimum || value > spec.maximum) fail('RANGE-ERROR', `${label}: UIntSafe bounds`);
  } else if (spec.kind === 'String') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: expected string`);
    try { assertUnicodeScalarAndNfc(value, label); } catch (error) { fail('FORMAT-ERROR', error.message); }
    const length = Buffer.byteLength(value, 'utf8');
    if (length < spec.minBytes || length > spec.maxBytes) fail('RANGE-ERROR', `${label}: String bounds`);
  } else if (spec.kind === 'Bytes32LowerHex') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: expected Bytes32LowerHex`);
    if (!SHA256_RE.test(value)) fail('FORMAT-ERROR', `${label}: malformed Bytes32LowerHex`);
  } else if (spec.kind === 'CommitHex') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: expected CommitHex`);
    if (!COMMIT_RE.test(value)) fail('FORMAT-ERROR', `${label}: malformed CommitHex`);
  } else if (spec.kind === 'LogicalPath') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: expected LogicalPath`);
    try { assertRepoRelativePath(value); } catch (error) { fail('FORMAT-ERROR', error.message); }
  } else if (spec.kind === 'ContentId') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: expected ContentId`);
    if (!value.startsWith(`${spec.prefix}-`) || !SHA256_RE.test(value.slice(spec.prefix.length + 1))) fail('FORMAT-ERROR', `${label}: malformed ContentId`);
  } else if (spec.kind === 'Enum') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: expected Enum string`);
    if (!spec.values.includes(value)) fail('ENUM-MISMATCH', `${label}: undeclared Enum member`);
  } else if (spec.kind === 'Array') {
    if (!Array.isArray(value)) fail('TYPE-MISMATCH', `${label}: expected Array`);
    if (value.length < spec.minItems || value.length > spec.maxItems) fail('RANGE-ERROR', `${label}: Array bounds`);
    value.forEach((member, index) => validateBySpecProducer(member, spec.items, `${label}[${index}]`));
    const encoded = value.map(canonicalV6);
    if (spec.unique && new Set(encoded).size !== encoded.length) fail('INVARIANT-MISMATCH', `${label}: duplicate array member`);
    if (spec.sorted && canonicalV6(encoded) !== canonicalV6(sortedUtf8(encoded))) fail('INVARIANT-MISMATCH', `${label}: unsorted array`);
  } else if (spec.kind === 'Object') {
    if (!isPlainObject(value)) fail('TYPE-MISMATCH', `${label}: expected Object`);
    const keys = Object.keys(value);
    const unknown = sortedUtf8(keys.filter((key) => !Object.hasOwn(spec.properties, key)));
    if (unknown.length > 0) fail('UNKNOWN-FIELD', `${label}: unknown field ${unknown[0]}`);
    const missing = sortedUtf8(spec.required.filter((key) => !Object.hasOwn(value, key)));
    if (missing.length > 0) fail('MISSING-FIELD', `${label}: missing field ${missing[0]}`);
    for (const key of sortedUtf8(keys)) validateBySpecProducer(value[key], spec.properties[key], `${label}.${key}`);
  } else throw new Error(`${label}: unimplemented spec kind ${spec.kind}`);
  return value;
}

function valueAtPath(value, path) {
  return path.reduce((current, segment) => current[segment], value);
}

function identityBody(record, identity) {
  if (identity.mode === 'EXCLUDE-IDENTITY-KEYS') return Object.fromEntries(Object.entries(record).filter(([key]) => key !== identity.idKey && key !== identity.rootKey));
  if (identity.mode === 'BODY-PATH') return valueAtPath(record, identity.bodyPath);
  throw new Error(`unknown identity mode ${identity.mode}`);
}

export function validateIdentityProducer(record, identity, label = 'record') {
  if (identity === null) return null;
  const expectedRoot = rootV6(identity.typeTag, identity.schemaVersion, identityBody(record, identity));
  if (record[identity.rootKey] !== expectedRoot) fail('CONTENT-IDENTITY-MISMATCH', `${label}: content root mismatch`);
  if (identity.idKey !== null && record[identity.idKey] !== `${identity.prefix}-${expectedRoot}`) fail('CONTENT-IDENTITY-MISMATCH', `${label}: content id mismatch`);
  return expectedRoot;
}

export function validateRecordProducer(record, schema) {
  validateBySpecProducer(record, schema.rootSpec, schema.family);
  return validateIdentityProducer(record, schema.contentIdentity, schema.family);
}

function identity(mode, idKey, rootKey, prefix, typeTag, schemaVersion, bodyPath = null) {
  return { bodyPath, idKey, mode, prefix, rootKey, schemaVersion, typeTag };
}

function familyIdentity(family, sample) {
  const configurations = {
    'SOURCE-CAPTURE-MANIFEST-V1': identity('EXCLUDE-IDENTITY-KEYS', 'artifactId', 'artifactRoot', 'TRD2V6-SOURCE-CAPTURE', 'SOURCE-CAPTURE-MANIFEST', sample.schemaVersion),
    'SOURCE-CAPTURE-ROW-V1': identity('EXCLUDE-IDENTITY-KEYS', 'sourceId', 'sourceRoot', 'TRD2V6-SOURCE', 'SOURCE-CAPTURE-ROW', 'CONNECT-TRD2-V6-SOURCE-CAPTURE-ROW-V1'),
    'F015-DIRECT-OCCURRENCE-V1': identity('EXCLUDE-IDENTITY-KEYS', 'occurrenceId', 'occurrenceRoot', 'TRD2V6-F015-OCCURRENCE', 'F015-DIRECT-OCCURRENCE', 'CONNECT-TRD2-V6-F015-OCCURRENCE-V1'),
    'PARSER-GRAMMAR-AND-CORPUS-V1': identity('EXCLUDE-IDENTITY-KEYS', 'artifactId', 'artifactRoot', 'TRD2V6-PARSER-CORPUS', 'PARSER-GRAMMAR-AND-CORPUS', sample.schemaVersion),
    'PARSER-GRAMMAR-V1': identity('EXCLUDE-IDENTITY-KEYS', 'grammarId', 'grammarRoot', 'TRD2V6-GRAMMAR', 'PARSER-GRAMMAR', 'CONNECT-TRD2-V6-PARSER-GRAMMAR-V1'),
    'PARSER-FIXTURE-SCHEMA-V1': identity('EXCLUDE-IDENTITY-KEYS', 'schemaId', 'schemaRoot', 'TRD2V6-SCHEMA', 'PARSER-FIXTURE-SCHEMA', 'CONNECT-TRD2-V6-PARSER-FIXTURE-SCHEMA-V1'),
    'PARSER-FIXTURE-V1': identity('EXCLUDE-IDENTITY-KEYS', 'fixtureId', 'fixtureRoot', 'TRD2V6-FIXTURE', 'PARSER-FIXTURE', 'CONNECT-TRD2-V6-PARSER-CORPUS-RECORD-V1'),
    'PASS1-GENERATION-RECEIPT-V1': identity('EXCLUDE-IDENTITY-KEYS', 'artifactId', 'artifactRoot', 'TRD2V6-GENERATION-RECEIPT', 'PASS1-GENERATION-RECEIPT', sample.schemaVersion),
    'PARSER-REPORT-V1': identity('EXCLUDE-IDENTITY-KEYS', 'artifactId', 'artifactRoot', 'TRD2V6-PARSER-REPORT', 'PARSER-REPORT', sample.schemaVersion),
    'PASS1-PRODUCER-QA-V1': identity('EXCLUDE-IDENTITY-KEYS', 'artifactId', 'artifactRoot', 'TRD2V6-PASS1-QA', 'PASS1-PRODUCER-QA', sample.schemaVersion),
    'REQUIREMENT-V2': identity('BODY-PATH', null, 'requirementRoot', null, 'REQUIREMENT', 'CONNECT-TRD2-V6-REQUIREMENT-RECORD-V2', ['content']),
  };
  return configurations[family] ?? null;
}

function jsonPointer(parent, segment) {
  const encoded = String(segment).replaceAll('~', '~0').replaceAll('/', '~1');
  return `${parent}/${encoded}`;
}

function wholeFileLocator(source, pointer, observedHead) {
  return {
    captureMode: 'WHOLE-FILE-WITH-JSON-POINTER',
    captureSha256: source.sha256,
    endByte: source.bytes.length,
    jsonPointer: pointer,
    logicalPath: source.logicalPath,
    sourceCommit: observedHead,
    sourceSha256: source.sha256,
    startByte: 0,
  };
}

export function collectActualPositiveRecords({ observedHead, passOneSources, requirementSource }) {
  const byPath = new Map(passOneSources.map((source) => [source.logicalPath, source]));
  const sourceCapture = byPath.get(TRD2_V6_PASS1_REUSED_PATHS[0]);
  const parserCorpus = byPath.get(TRD2_V6_PASS1_REUSED_PATHS[1]);
  const generation = byPath.get(TRD2_V6_PASS1_REUSED_PATHS[2]);
  const parserReports = [byPath.get(TRD2_V6_PASS1_REUSED_PATHS[3]), byPath.get(TRD2_V6_PASS1_REUSED_PATHS[4])];
  const qa = byPath.get(TRD2_V6_PASS1_REUSED_PATHS[5]);
  if ([sourceCapture, parserCorpus, generation, qa, ...parserReports].some((source) => source === undefined)) throw new Error('Pass 1 actual source set incomplete');
  const records = [];
  const add = (family, source, pointer, value) => records.push({ family, sourceLocator: wholeFileLocator(source, pointer, observedHead), value });
  add('SOURCE-CAPTURE-MANIFEST-V1', sourceCapture, '', sourceCapture.value);
  sourceCapture.value.sources.forEach((row, index) => {
    add('SOURCE-CAPTURE-ROW-V1', sourceCapture, jsonPointer('/sources', index), row);
    add('SOURCE-CAPTURE-V1', sourceCapture, jsonPointer(jsonPointer('/sources', index), 'capture'), row.capture);
  });
  add('F015-DISPOSITION-V1', sourceCapture, '/f015Disposition', sourceCapture.value.f015Disposition);
  sourceCapture.value.f015Disposition.dependentArtifacts.forEach((row, index) => add('F015-DEPENDENT-ARTIFACT-V1', sourceCapture, jsonPointer('/f015Disposition/dependentArtifacts', index), row));
  sourceCapture.value.f015Disposition.directOccurrences.forEach((row, index) => add('F015-DIRECT-OCCURRENCE-V1', sourceCapture, jsonPointer('/f015Disposition/directOccurrences', index), row));
  add('F015-REPLACEMENT-LEDGER-V1', sourceCapture, '/f015Disposition/replacementLedger', sourceCapture.value.f015Disposition.replacementLedger);

  add('PARSER-GRAMMAR-AND-CORPUS-V1', parserCorpus, '', parserCorpus.value);
  add('PARSER-GRAMMAR-V1', parserCorpus, '/grammar', parserCorpus.value.grammar);
  add('PARSER-FIXTURE-SCHEMA-V1', parserCorpus, '/fixtureSchema', parserCorpus.value.fixtureSchema);
  parserCorpus.value.positiveFixtures.forEach((row, index) => add('PARSER-FIXTURE-V1', parserCorpus, jsonPointer('/positiveFixtures', index), row));
  parserCorpus.value.negativeFixtures.forEach((row, index) => add('PARSER-FIXTURE-V1', parserCorpus, jsonPointer('/negativeFixtures', index), row));

  add('PASS1-GENERATION-RECEIPT-V1', generation, '', generation.value);
  generation.value.generatedArtifacts.forEach((row, index) => add('PASS1-GENERATED-ARTIFACT-V1', generation, jsonPointer('/generatedArtifacts', index), row));
  generation.value.toolchain.forEach((row, index) => add('TOOLCHAIN-FILE-V1', generation, jsonPointer('/toolchain', index), row));
  add('OUTPUT-REGISTRY-BINDING-V1', generation, '/outputRegistry', generation.value.outputRegistry);
  add('TOOLCHAIN-REGISTRY-BINDING-V1', generation, '/toolchainRegistry', generation.value.toolchainRegistry);

  parserReports.forEach((report) => {
    add('PARSER-REPORT-V1', report, '', report.value);
    report.value.outcomes.forEach((row, index) => add('PARSER-OUTCOME-V1', report, jsonPointer('/outcomes', index), row));
  });

  add('PASS1-PRODUCER-QA-V1', qa, '', qa.value);
  add('PASS1-ACCEPTANCE-STATE-V1', qa, '/acceptanceState', qa.value.acceptanceState);
  add('PASS1-F015-SUMMARY-V1', qa, '/f015', qa.value.f015);
  add('PASS1-PARSER-AGREEMENT-V1', qa, '/parserAgreement', qa.value.parserAgreement);
  add('PASS1-PASS-STATE-V1', qa, '/passState', qa.value.passState);

  const requirements = parseRequirementSource(requirementSource.bytes, requirementSource.logicalPath);
  for (const requirement of requirements) {
    const common = {
      captureMode: 'EXACT-MARKDOWN-REQUIREMENT-BLOCK',
      captureSha256: requirement.captureSha256,
      endByte: requirement.blockEndByte,
      jsonPointer: `#${requirement.record.requirementId}`,
      logicalPath: requirementSource.logicalPath,
      sourceCommit: observedHead,
      sourceSha256: requirementSource.sha256,
      startByte: requirement.headingStartByte,
    };
    records.push({ family: 'REQUIREMENT-V2', sourceLocator: common, value: requirement.record });
    records.push({ family: 'REQUIREMENT-SOURCE-BINDING-V2', sourceLocator: common, value: requirement.binding });
  }
  return records.sort((left, right) => {
    const familyOrder = Buffer.compare(Buffer.from(left.family), Buffer.from(right.family));
    if (familyOrder !== 0) return familyOrder;
    return Buffer.compare(Buffer.from(canonicalV6(left.sourceLocator)), Buffer.from(canonicalV6(right.sourceLocator)));
  });
}

function schemaFor(family, members) {
  const schemaId = `CONNECT-TRD2-V6-${family}-SCHEMA-V2`;
  const body = {
    actualPositiveCount: members.length,
    contentIdentity: familyIdentity(family, members[0].value),
    family,
    familyStatus: 'ACTUAL-POSITIVE',
    rootSpec: inferClosedSpec(members.map(({ value }) => value), family),
    schemaId,
    sourcePaths: sortedUtf8(new Set(members.map(({ sourceLocator }) => sourceLocator.logicalPath))),
  };
  validateSpecDefinition(body.rootSpec, `${family}.rootSpec`);
  return { ...body, schemaRoot: rootV6('CLOSED-SCHEMA-DEFINITION-V2', 'CONNECT-TRD2-V6-CLOSED-SCHEMA-DEFINITION-V2', body) };
}

function fixtureBody({ fixtureClass, mutation, schema, sourceLocator, value, expectedStatus, expectedTerminal, expectedContentRoot }) {
  const bytes = Buffer.from(canonicalV6(value), 'utf8');
  return {
    byteLength: bytes.length,
    bytesBase64: bytes.toString('base64'),
    expectedContentRoot,
    expectedStatus,
    expectedTerminal,
    fixtureClass,
    mutation,
    schemaId: schema.schemaId,
    sha256: sha256Bytes(bytes),
    sourceLocator,
  };
}

function makeFixture(argumentsValue) {
  const body = fixtureBody(argumentsValue);
  return attachContentIdentity('TRD2V6-V2-FIXTURE', 'CANONICAL-SCHEMA-FIXTURE-V2', 'CONNECT-TRD2-V6-CANONICAL-SCHEMA-FIXTURE-V2', body, 'fixtureId', 'fixtureRoot');
}

function producerOutcome(value, schema) {
  try {
    const contentRoot = validateRecordProducer(value, schema);
    return { contentRoot, status: 'PASS', terminal: 'ACCEPT' };
  } catch (error) {
    if (!(error instanceof V2SchemaValidationError)) throw error;
    return { contentRoot: null, status: 'BLOCK', terminal: error.terminal };
  }
}

function setAtPath(value, path, replacement) {
  const clone = structuredClone(value);
  let current = clone;
  for (const segment of path.slice(0, -1)) current = current[segment];
  current[path.at(-1)] = replacement;
  return clone;
}

function deleteAtPath(value, path) {
  const clone = structuredClone(value);
  let current = clone;
  for (const segment of path.slice(0, -1)) current = current[segment];
  delete current[path.at(-1)];
  return clone;
}

function specAccepts(value, spec) {
  try { validateBySpecProducer(value, spec); return true; } catch (error) { if (error instanceof V2SchemaValidationError) return false; throw error; }
}

function invalidForSpec(spec) {
  const candidates = [false, 'INVALID-TYPE', -1, {}, [], null, 0];
  const candidate = candidates.find((value) => !specAccepts(value, spec));
  if (candidate === undefined) throw new Error(`Unable to construct invalid value for ${spec.kind}`);
  return candidate;
}

function selectNestedPath(spec, value, predicate, path = []) {
  if (path.length > 0 && predicate(spec, value)) return { path, spec, value };
  if (spec.kind === 'Object' && isPlainObject(value)) {
    for (const key of sortedUtf8(Object.keys(value))) {
      const found = selectNestedPath(spec.properties[key], value[key], predicate, [...path, key]);
      if (found !== null) return found;
    }
  } else if (spec.kind === 'Array' && Array.isArray(value) && value.length > 0) return selectNestedPath(spec.items, value[0], predicate, [...path, 0]);
  else if (spec.kind === 'Nullable' && value !== null) return selectNestedPath(spec.inner, value, predicate, path);
  else if (spec.kind === 'OneOf') {
    const branch = spec.variants.find((variant) => specAccepts(value, variant));
    if (branch !== undefined) return selectNestedPath(branch, value, predicate, path);
  }
  return null;
}

function mutationCandidates(schema, sample) {
  const candidates = [];
  const requiredKey = schema.rootSpec.required[0];
  candidates.push(['UNKNOWN-FIELD', { ...structuredClone(sample), __undeclared: true }]);
  candidates.push(['MISSING-FIELD', deleteAtPath(sample, [requiredKey])]);
  const typeKey = schema.rootSpec.required.find((key) => schema.rootSpec.properties[key].kind !== 'Const') ?? requiredKey;
  candidates.push(['TYPE-MISMATCH', setAtPath(sample, [typeKey], invalidForSpec(schema.rootSpec.properties[typeKey]))]);
  const nonNullableKey = schema.rootSpec.required.find((key) => !['Null', 'Nullable'].includes(schema.rootSpec.properties[key].kind));
  if (nonNullableKey !== undefined) candidates.push(['NULLABILITY-MISMATCH', setAtPath(sample, [nonNullableKey], null)]);
  const nestedObject = selectNestedPath(schema.rootSpec, sample, (spec) => spec.kind === 'Object');
  if (nestedObject !== null) candidates.push(['NESTED-UNKNOWN-FIELD', setAtPath(sample, nestedObject.path, { ...structuredClone(nestedObject.value), __undeclaredNested: true })]);
  const union = selectNestedPath(schema.rootSpec, sample, (spec) => ['Nullable', 'OneOf'].includes(spec.kind));
  if (union !== null) candidates.push(['UNION-MISMATCH', setAtPath(sample, union.path, invalidForSpec(union.spec))]);
  if (schema.contentIdentity !== null) {
    const currentRoot = sample[schema.contentIdentity.rootKey];
    candidates.push(['CONTENT-IDENTITY-MISMATCH', setAtPath(sample, [schema.contentIdentity.rootKey], currentRoot === '0'.repeat(64) ? '1'.repeat(64) : '0'.repeat(64))]);
  }
  return candidates;
}

function validateIdentityDefinition(identityValue, label) {
  if (identityValue === null) return;
  assertClosedObject(identityValue, ['bodyPath', 'idKey', 'mode', 'prefix', 'rootKey', 'schemaVersion', 'typeTag'], label);
  if (!['EXCLUDE-IDENTITY-KEYS', 'BODY-PATH'].includes(identityValue.mode) || typeof identityValue.rootKey !== 'string' || typeof identityValue.typeTag !== 'string' || typeof identityValue.schemaVersion !== 'string') throw new Error(`${label}: invalid identity declaration`);
  if (identityValue.mode === 'EXCLUDE-IDENTITY-KEYS' && (typeof identityValue.idKey !== 'string' || typeof identityValue.prefix !== 'string' || identityValue.bodyPath !== null)) throw new Error(`${label}: invalid exclusion identity`);
  if (identityValue.mode === 'BODY-PATH' && (identityValue.idKey !== null || identityValue.prefix !== null || !Array.isArray(identityValue.bodyPath) || identityValue.bodyPath.length === 0)) throw new Error(`${label}: invalid body-path identity`);
}

function validateSourceLocator(locator, label) {
  assertClosedObject(locator, ['captureMode', 'captureSha256', 'endByte', 'jsonPointer', 'logicalPath', 'sourceCommit', 'sourceSha256', 'startByte'], label);
  assertRepoRelativePath(locator.logicalPath);
  if (!SHA256_RE.test(locator.captureSha256) || !SHA256_RE.test(locator.sourceSha256) || !COMMIT_RE.test(locator.sourceCommit)) throw new Error(`${label}: malformed digest/commit`);
  if (!Number.isSafeInteger(locator.startByte) || !Number.isSafeInteger(locator.endByte) || locator.startByte < 0 || locator.startByte > locator.endByte) throw new Error(`${label}: invalid byte span`);
  if (!['WHOLE-FILE-WITH-JSON-POINTER', 'EXACT-MARKDOWN-REQUIREMENT-BLOCK'].includes(locator.captureMode) || typeof locator.jsonPointer !== 'string') throw new Error(`${label}: invalid capture locator`);
}

export function makeClosedSchemaRegistryV2({ provenance, passOneSources, requirementSource }) {
  const records = collectActualPositiveRecords({ observedHead: provenance.observedHead, passOneSources, requirementSource });
  const families = sortedUtf8(new Set(records.map(({ family }) => family)));
  const schemas = families.map((family) => schemaFor(family, records.filter((record) => record.family === family)));
  const schemaByFamily = new Map(schemas.map((schema) => [schema.family, schema]));
  const positiveFixtures = records.map((record) => {
    const schema = schemaByFamily.get(record.family);
    const outcome = producerOutcome(record.value, schema);
    if (outcome.status !== 'PASS') throw new Error(`${record.family}: actual positive rejected at ${outcome.terminal}`);
    return makeFixture({
      expectedContentRoot: outcome.contentRoot,
      expectedStatus: outcome.status,
      expectedTerminal: outcome.terminal,
      fixtureClass: 'ACTUAL-POSITIVE',
      mutation: 'NONE',
      schema,
      sourceLocator: record.sourceLocator,
      value: record.value,
    });
  });
  const mutationFixtures = schemas.flatMap((schema) => {
    const source = records.find((record) => record.family === schema.family);
    return mutationCandidates(schema, source.value).map(([mutation, value]) => {
      const outcome = producerOutcome(value, schema);
      if (outcome.status !== 'BLOCK') throw new Error(`${schema.family}.${mutation}: mutation unexpectedly passed`);
      return makeFixture({
        expectedContentRoot: null,
        expectedStatus: outcome.status,
        expectedTerminal: outcome.terminal,
        fixtureClass: 'MUTATION',
        mutation,
        schema,
        sourceLocator: source.sourceLocator,
        value,
      });
    });
  });
  const fixtures = [...positiveFixtures, ...mutationFixtures];
  const body = {
    acceptance: 0,
    actualPositiveCount: positiveFixtures.length,
    actualPositiveInventoryRoot: rootV6('ACTUAL-POSITIVE-INVENTORY-V2', 'CONNECT-TRD2-V6-ACTUAL-POSITIVE-INVENTORY-V2', positiveFixtures.map(({ fixtureId, fixtureRoot, schemaId, sourceLocator }) => ({ fixtureId, fixtureRoot, schemaId, sourceLocator }))),
    artifactClass: 'PLANNING-ONLY;LOCAL-CANDIDATE;NOT-ACCEPTANCE',
    claimLimit: 'LOCAL-DUAL-ENGINE-SCHEMA-EVIDENCE-ONLY;EXTERNAL-CLOSURE-ZERO',
    developmentFreeze: 'ACTIVE',
    dslProfile: {
      additionalProperties: false,
      canonicalJson: 'CONNECT-TRD2-V6-CANONICAL-JSON-V1',
      kinds: TRD2_V6_PASS2_V2_DSL_KINDS,
      recursiveClosedObjects: true,
      unionRule: 'EXACTLY-ONE-BRANCH',
    },
    findingClosure: '0/15',
    fixtureCollectionRoot: rootV6('CANONICAL-SCHEMA-FIXTURE-COLLECTION-V2', 'CONNECT-TRD2-V6-CANONICAL-SCHEMA-FIXTURE-COLLECTION-V2', fixtures.map(({ fixtureRoot }) => fixtureRoot)),
    fixtureCount: fixtures.length,
    fixtures,
    gate29: 'BLOCKED',
    mutationFixtureCount: mutationFixtures.length,
    provenance,
    repositoryVisibility: 'PUBLIC',
    reviewGenerations: '0/2',
    schemaCount: schemas.length,
    schemas,
    schemaVersion: 'CONNECT-TRD2-V6-CLOSED-SCHEMA-REGISTRY-V2',
    selfReviewRemediation: [
      { findingId: 'PASS2V1-SELF-P0-001', status: 'REMEDIATED-LOCALLY', proof: 'ACTUAL-FAMILY-EXACT-KEY-SCHEMAS' },
      { findingId: 'PASS2V1-SELF-P0-002', status: 'REMEDIATED-LOCALLY', proof: 'REQUIREMENT-FIVE-CONTENT-FIELDS' },
      { findingId: 'PASS2V1-SELF-P0-003', status: 'REMEDIATED-LOCALLY', proof: 'COMMITTED-ACTUAL-POSITIVE-INVENTORY' },
      { findingId: 'PASS2V1-SELF-P0-004', status: 'REMEDIATED-LOCALLY', proof: 'RECURSIVE-OBJECT-NULLABLE-UNION-DSL' },
      { findingId: 'PASS2V1-SELF-P1-001', status: 'REMEDIATED-LOCALLY', proof: 'ACTUAL-POSITIVE-DENOMINATOR-VERIFIED' },
    ],
    v1Disposition: {
      reusableForPass3: false,
      status: 'REJECTED-SUPERSEDED-NOT-DELETED',
      supersededPaths: TRD2_V6_PASS2_V1_REJECTED_PATHS,
    },
  };
  return validateClosedSchemaRegistryV2(attachContentIdentity('TRD2V6-CLOSED-SCHEMA-REGISTRY-V2', 'CLOSED-SCHEMA-REGISTRY-V2', body.schemaVersion, body));
}

export function validateClosedSchemaRegistryV2(registry) {
  assertClosedObject(registry, [
    'acceptance', 'actualPositiveCount', 'actualPositiveInventoryRoot', 'artifactClass', 'artifactId', 'artifactRoot',
    'claimLimit', 'developmentFreeze', 'dslProfile', 'findingClosure', 'fixtureCollectionRoot', 'fixtureCount',
    'fixtures', 'gate29', 'mutationFixtureCount', 'provenance', 'repositoryVisibility', 'reviewGenerations',
    'schemaCount', 'schemaVersion', 'schemas', 'selfReviewRemediation', 'v1Disposition',
  ], 'closedSchemaRegistryV2');
  validateContentIdentity(registry, 'TRD2V6-CLOSED-SCHEMA-REGISTRY-V2', 'CLOSED-SCHEMA-REGISTRY-V2', registry.schemaVersion);
  if (registry.schemaVersion !== 'CONNECT-TRD2-V6-CLOSED-SCHEMA-REGISTRY-V2' || registry.repositoryVisibility !== 'PUBLIC' || registry.developmentFreeze !== 'ACTIVE' || registry.gate29 !== 'BLOCKED' || registry.acceptance !== 0 || registry.findingClosure !== '0/15' || registry.reviewGenerations !== '0/2') throw new Error('closedSchemaRegistryV2: safety boundary mismatch');
  assertClosedObject(registry.dslProfile, ['additionalProperties', 'canonicalJson', 'kinds', 'recursiveClosedObjects', 'unionRule'], 'closedSchemaRegistryV2.dslProfile');
  if (registry.dslProfile.additionalProperties !== false || registry.dslProfile.recursiveClosedObjects !== true || registry.dslProfile.unionRule !== 'EXACTLY-ONE-BRANCH') throw new Error('closedSchemaRegistryV2: DSL closure mismatch');
  assertExactArray(registry.dslProfile.kinds, TRD2_V6_PASS2_V2_DSL_KINDS, 'closedSchemaRegistryV2.dslProfile.kinds');
  if (!Array.isArray(registry.schemas) || registry.schemas.length !== registry.schemaCount || registry.schemaCount === 0) throw new Error('closedSchemaRegistryV2: schema count mismatch');
  const schemaById = new Map();
  for (const schema of registry.schemas) {
    assertClosedObject(schema, ['actualPositiveCount', 'contentIdentity', 'family', 'familyStatus', 'rootSpec', 'schemaId', 'schemaRoot', 'sourcePaths'], `schema.${schema.schemaId}`);
    if (schemaById.has(schema.schemaId) || schema.familyStatus !== 'ACTUAL-POSITIVE' || !Number.isSafeInteger(schema.actualPositiveCount) || schema.actualPositiveCount < 1) throw new Error(`schema.${schema.schemaId}: invalid identity/count`);
    validateSpecDefinition(schema.rootSpec, `schema.${schema.schemaId}.rootSpec`);
    validateIdentityDefinition(schema.contentIdentity, `schema.${schema.schemaId}.contentIdentity`);
    const body = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== 'schemaRoot'));
    if (schema.schemaRoot !== rootV6('CLOSED-SCHEMA-DEFINITION-V2', 'CONNECT-TRD2-V6-CLOSED-SCHEMA-DEFINITION-V2', body)) throw new Error(`schema.${schema.schemaId}: root mismatch`);
    if (!Array.isArray(schema.sourcePaths) || schema.sourcePaths.length === 0) throw new Error(`schema.${schema.schemaId}: missing sources`);
    schema.sourcePaths.forEach(assertRepoRelativePath);
    schemaById.set(schema.schemaId, schema);
  }
  if (!Array.isArray(registry.fixtures) || registry.fixtures.length !== registry.fixtureCount) throw new Error('closedSchemaRegistryV2: fixture count mismatch');
  const seenFixtures = new Set();
  let positives = 0;
  let mutations = 0;
  for (const fixture of registry.fixtures) {
    assertClosedObject(fixture, ['byteLength', 'bytesBase64', 'expectedContentRoot', 'expectedStatus', 'expectedTerminal', 'fixtureClass', 'fixtureId', 'fixtureRoot', 'mutation', 'schemaId', 'sha256', 'sourceLocator'], `fixture.${fixture.fixtureId}`);
    validateContentIdentity(fixture, 'TRD2V6-V2-FIXTURE', 'CANONICAL-SCHEMA-FIXTURE-V2', 'CONNECT-TRD2-V6-CANONICAL-SCHEMA-FIXTURE-V2', 'fixtureId', 'fixtureRoot');
    if (seenFixtures.has(fixture.fixtureId) || !schemaById.has(fixture.schemaId)) throw new Error(`fixture.${fixture.fixtureId}: duplicate or unknown schema`);
    seenFixtures.add(fixture.fixtureId);
    validateSourceLocator(fixture.sourceLocator, `fixture.${fixture.fixtureId}.sourceLocator`);
    const bytes = Buffer.from(fixture.bytesBase64, 'base64');
    if (bytes.toString('base64') !== fixture.bytesBase64 || bytes.length !== fixture.byteLength || sha256Bytes(bytes) !== fixture.sha256) throw new Error(`fixture.${fixture.fixtureId}: byte binding mismatch`);
    const value = parseCanonicalJsonBytes(bytes);
    const outcome = producerOutcome(value, schemaById.get(fixture.schemaId));
    if (outcome.status !== fixture.expectedStatus || outcome.terminal !== fixture.expectedTerminal || outcome.contentRoot !== fixture.expectedContentRoot) throw new Error(`fixture.${fixture.fixtureId}: producer oracle mismatch`);
    if (fixture.fixtureClass === 'ACTUAL-POSITIVE' && fixture.mutation === 'NONE' && fixture.expectedStatus === 'PASS') positives += 1;
    else if (fixture.fixtureClass === 'MUTATION' && fixture.mutation !== 'NONE' && fixture.expectedStatus === 'BLOCK') mutations += 1;
    else throw new Error(`fixture.${fixture.fixtureId}: invalid class/outcome`);
  }
  if (positives !== registry.actualPositiveCount || mutations !== registry.mutationFixtureCount || positives + mutations !== registry.fixtureCount) throw new Error('closedSchemaRegistryV2: fixture class denominator mismatch');
  for (const schema of registry.schemas) {
    const count = registry.fixtures.filter((fixture) => fixture.schemaId === schema.schemaId && fixture.fixtureClass === 'ACTUAL-POSITIVE').length;
    if (count !== schema.actualPositiveCount) throw new Error(`schema.${schema.schemaId}: actual positive denominator mismatch`);
  }
  const positiveRows = registry.fixtures.filter(({ fixtureClass }) => fixtureClass === 'ACTUAL-POSITIVE').map(({ fixtureId, fixtureRoot, schemaId, sourceLocator }) => ({ fixtureId, fixtureRoot, schemaId, sourceLocator }));
  if (registry.actualPositiveInventoryRoot !== rootV6('ACTUAL-POSITIVE-INVENTORY-V2', 'CONNECT-TRD2-V6-ACTUAL-POSITIVE-INVENTORY-V2', positiveRows)) throw new Error('closedSchemaRegistryV2: actual inventory root mismatch');
  if (registry.fixtureCollectionRoot !== rootV6('CANONICAL-SCHEMA-FIXTURE-COLLECTION-V2', 'CONNECT-TRD2-V6-CANONICAL-SCHEMA-FIXTURE-COLLECTION-V2', registry.fixtures.map(({ fixtureRoot }) => fixtureRoot))) throw new Error('closedSchemaRegistryV2: fixture collection root mismatch');
  if (!Array.isArray(registry.selfReviewRemediation) || registry.selfReviewRemediation.length !== 5 || registry.selfReviewRemediation.some(({ status }) => status !== 'REMEDIATED-LOCALLY')) throw new Error('closedSchemaRegistryV2: self-review remediation mismatch');
  assertClosedObject(registry.v1Disposition, ['reusableForPass3', 'status', 'supersededPaths'], 'closedSchemaRegistryV2.v1Disposition');
  if (registry.v1Disposition.reusableForPass3 !== false || registry.v1Disposition.status !== 'REJECTED-SUPERSEDED-NOT-DELETED') throw new Error('closedSchemaRegistryV2: rejected v1 boundary mismatch');
  assertExactArray(registry.v1Disposition.supersededPaths, TRD2_V6_PASS2_V1_REJECTED_PATHS, 'closedSchemaRegistryV2.v1Disposition.supersededPaths');
  return registry;
}

export function makeCanonicalV2Report({ engineId, implementation, registry, sourceSha256, outcomes }) {
  const mismatchCount = outcomes.filter(({ matchesExpectation }) => !matchesExpectation).length;
  const body = {
    actualPositiveCount: registry.actualPositiveCount,
    claimLimit: 'LOCAL-INDEPENDENT-CANONICAL-ENGINE-EVIDENCE;NO-EXTERNAL-CLOSURE',
    engineId,
    fixtureCollectionRoot: registry.fixtureCollectionRoot,
    implementation,
    mismatchCount,
    mutationFixtureCount: registry.mutationFixtureCount,
    outcomeCount: outcomes.length,
    outcomeRoot: rootV6('CANONICAL-V2-OUTCOME-COLLECTION', 'CONNECT-TRD2-V6-CANONICAL-V2-OUTCOME-COLLECTION-V1', outcomes),
    outcomes,
    registryRoot: registry.artifactRoot,
    schemaVersion: 'CONNECT-TRD2-V6-CANONICAL-ENGINE-REPORT-V2',
    sourceSha256,
    status: mismatchCount === 0 ? 'PASS' : 'BLOCKED',
  };
  return attachContentIdentity('TRD2V6-CANONICAL-V2-REPORT', 'CANONICAL-ENGINE-REPORT-V2', body.schemaVersion, body);
}

export function validateCanonicalV2Report(report, registry) {
  assertClosedObject(report, ['actualPositiveCount', 'artifactId', 'artifactRoot', 'claimLimit', 'engineId', 'fixtureCollectionRoot', 'implementation', 'mismatchCount', 'mutationFixtureCount', 'outcomeCount', 'outcomeRoot', 'outcomes', 'registryRoot', 'schemaVersion', 'sourceSha256', 'status'], `canonicalV2Report.${report.engineId}`);
  validateContentIdentity(report, 'TRD2V6-CANONICAL-V2-REPORT', 'CANONICAL-ENGINE-REPORT-V2', report.schemaVersion);
  if (report.schemaVersion !== 'CONNECT-TRD2-V6-CANONICAL-ENGINE-REPORT-V2' || report.registryRoot !== registry.artifactRoot || report.fixtureCollectionRoot !== registry.fixtureCollectionRoot || report.actualPositiveCount !== registry.actualPositiveCount || report.mutationFixtureCount !== registry.mutationFixtureCount || report.outcomeCount !== registry.fixtureCount || report.outcomes.length !== report.outcomeCount || !SHA256_RE.test(report.sourceSha256)) throw new Error(`canonicalV2Report.${report.engineId}: binding mismatch`);
  for (const outcome of report.outcomes) assertClosedObject(outcome, ['contentRoot', 'expectedStatus', 'expectedTerminal', 'fixtureId', 'fixtureSha256', 'matchesExpectation', 'observedStatus', 'observedTerminal', 'schemaId'], `outcome.${outcome.fixtureId}`);
  const mismatchCount = report.outcomes.filter(({ matchesExpectation }) => !matchesExpectation).length;
  if (mismatchCount !== report.mismatchCount || report.outcomeRoot !== rootV6('CANONICAL-V2-OUTCOME-COLLECTION', 'CONNECT-TRD2-V6-CANONICAL-V2-OUTCOME-COLLECTION-V1', report.outcomes) || report.status !== (mismatchCount === 0 ? 'PASS' : 'BLOCKED')) throw new Error(`canonicalV2Report.${report.engineId}: outcome mismatch`);
  return report;
}
