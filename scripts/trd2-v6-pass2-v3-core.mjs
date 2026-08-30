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
import {
  TRD2_V6_PASS1_REUSED_PATHS,
  TRD2_V6_PASS2_V1_REJECTED_PATHS,
  TRD2_V6_PASS2_V2_PATHS,
  TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH,
  V2SchemaValidationError,
  validateCanonicalV2Report,
  validateClosedSchemaRegistryV2,
} from './trd2-v6-pass2-v2-core.mjs';
import {
  TRD2_V6_PASS2_V3_FUTURE_DEFINITIONS,
  TRD2_V6_PASS2_V3_OUTPUT_SCHEMA_FAMILIES,
} from './trd2-v6-pass2-v3-schema-catalog.mjs';

export const TRD2_V6_PASS2_V3_DIRECTORY = 'docs/planning/trd2-v6-candidate-v3-2026-08-31';
export const TRD2_V6_PASS2_V3_OUTPUT_REGISTRY_PATH = 'docs/planning/trd2-v6-output-path-registry-v3-2026-08-31.json';
export const TRD2_V6_PASS2_V3_TOOLCHAIN_REGISTRY_PATH = 'docs/planning/trd2-v6-pass2-v3-toolchain-path-registry-v1-2026-08-31.json';
export const TRD2_V6_PASS2_V3_RESTART_CHARTER_PATH = 'docs/planning/section-35-6-trd-2-v6-pass2-v3-restart-charter-2026-08-31.md';
export const TRD2_V6_PASS2_V3_CATALOG_PATH = 'scripts/trd2-v6-pass2-v3-schema-catalog.mjs';
export const TRD2_V6_PASS2_V3_PATHS = Object.freeze([
  `${TRD2_V6_PASS2_V3_DIRECTORY}/closed-schema-registry-v3.json`,
  `${TRD2_V6_PASS2_V3_DIRECTORY}/canonical-engine-a-report-v3.json`,
  `${TRD2_V6_PASS2_V3_DIRECTORY}/canonical-engine-b-report-v3.json`,
]);

export const TRD2_V6_PASS2_V3_TOOLCHAIN_PATHS = Object.freeze([
  TRD2_V6_PASS2_V3_RESTART_CHARTER_PATH,
  TRD2_V6_PASS2_V3_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS2_V3_TOOLCHAIN_REGISTRY_PATH,
  ...TRD2_V6_PASS2_V2_PATHS,
  TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH,
  ...TRD2_V6_PASS1_REUSED_PATHS,
  'package.json',
  'scripts/trd2-v6-core.mjs',
  'scripts/trd2-v6-pass2-v2-core.mjs',
  TRD2_V6_PASS2_V3_CATALOG_PATH,
  'scripts/trd2-v6-pass2-v3-core.mjs',
  'scripts/create-trd2-v6-pass2-v3-candidate.mjs',
  'scripts/verify-trd2-v6-canonical-v3-engine-a.mjs',
  'scripts/verify-trd2-v6-canonical-v3-engine-b.py',
  'scripts/verify-trd2-v6-pass2-v3-candidate.mjs',
  'tests/trd2-v6-pass2-v3-core.test.mjs',
]);

export const TRD2_V6_PASS2_V3_DSL_KINDS = Object.freeze([
  'Array', 'Boolean', 'Bytes32LowerHex', 'CommitHex', 'Const', 'ContentId', 'Enum',
  'LogicalPath', 'Null', 'Nullable', 'Object', 'OneOf', 'Ref', 'String', 'UIntSafe',
]);

export const TRD2_V6_PASS2_V3_INVARIANT_KINDS = Object.freeze([
  'ARRAY-LENGTH-EQUALS-FIELD', 'LTE-FIELDS', 'NOT-EQUAL-FIELDS', 'SUBSET-ARRAY',
]);

const SAFE_MAX = Number.MAX_SAFE_INTEGER;
const SHA256_RE = /^[0-9a-f]{64}$/;
const COMMIT_RE = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const BUILTIN_SCHEMA_IDS = Object.freeze([
  'BUILTIN-CONNECT-TRD2-V6-CANONICAL-ENGINE-REPORT-V3',
  'BUILTIN-CONNECT-TRD2-V6-CLOSED-SCHEMA-REGISTRY-V3',
]);

export class V3SchemaValidationError extends Error {
  constructor(terminal, message) {
    super(message);
    this.terminal = terminal;
  }
}

function fail(terminal, message) {
  throw new V3SchemaValidationError(terminal, message);
}

function plain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function sortedUtf8(values) {
  return [...values].sort((left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')));
}

function assertExactArray(actual, expected, label) {
  if (!Array.isArray(actual) || canonicalV6(actual) !== canonicalV6(expected)) throw new Error(`${label}: exact ordered array mismatch`);
}

function assertExactSet(actual, expected, label) {
  if (!Array.isArray(actual) || canonicalV6(sortedUtf8(actual)) !== canonicalV6(sortedUtf8(expected))) throw new Error(`${label}: exact set mismatch`);
}

export function pass2V3ToolchainRoot(rows) {
  return rootV6('TOOLCHAIN-FILE-COLLECTION', 'CONNECT-TRD2-V6-PASS2-V3-TOOLCHAIN-V1', rows);
}

export function validateOutputPathRegistryV3(registry) {
  assertClosedObject(registry, [
    'artifactId', 'candidateDirectory', 'externalReviewAndAcceptancePaths', 'normativePackageMemberPaths',
    'owner', 'passTwoV3EmittedPaths', 'plannedTopLevelSchemas', 'producerOnlyPaths',
    'reusedImmutablePassOnePaths', 'schema', 'supersededRejectedPaths', 'version',
  ], 'outputRegistryV3');
  if (registry.schema !== 'CONNECT-TRD2-V6-OUTPUT-PATH-REGISTRY-V3' || registry.version !== 3 || registry.owner !== 'Tal') throw new Error('outputRegistryV3: identity mismatch');
  if (registry.artifactId !== 'CONNECT-TRD2-V6-CANDIDATE-V3-2026-08-31' || registry.candidateDirectory !== TRD2_V6_PASS2_V3_DIRECTORY) throw new Error('outputRegistryV3: candidate mismatch');
  assertExactArray(registry.reusedImmutablePassOnePaths, TRD2_V6_PASS1_REUSED_PATHS, 'outputRegistryV3.reusedImmutablePassOnePaths');
  assertExactArray(registry.supersededRejectedPaths, [...TRD2_V6_PASS2_V1_REJECTED_PATHS, ...TRD2_V6_PASS2_V2_PATHS], 'outputRegistryV3.supersededRejectedPaths');
  assertExactArray(registry.passTwoV3EmittedPaths, TRD2_V6_PASS2_V3_PATHS, 'outputRegistryV3.passTwoV3EmittedPaths');
  if (!plain(registry.plannedTopLevelSchemas)) throw new Error('outputRegistryV3.plannedTopLevelSchemas: object required');
  const allPaths = [...registry.normativePackageMemberPaths, ...registry.producerOnlyPaths, ...registry.externalReviewAndAcceptancePaths];
  if (allPaths.length !== 30 || new Set(allPaths).size !== 30) throw new Error(`outputRegistryV3: planned path denominator ${allPaths.length}/30`);
  assertExactSet(Object.keys(registry.plannedTopLevelSchemas), allPaths, 'outputRegistryV3.plannedTopLevelSchemas.keys');
  for (const logicalPath of [...allPaths, ...registry.supersededRejectedPaths]) assertRepoRelativePath(logicalPath);
  for (const schemaId of Object.values(registry.plannedTopLevelSchemas)) if (typeof schemaId !== 'string' || schemaId.length === 0) throw new Error('outputRegistryV3: malformed planned schema id');
  return registry;
}

export function validatePass2V3ToolchainRegistry(registry) {
  assertClosedObject(registry, ['passTwoV3EmittedPaths', 'schema', 'toolchainPaths', 'version'], 'pass2V3ToolchainRegistry');
  if (registry.schema !== 'CONNECT-TRD2-V6-PASS2-V3-TOOLCHAIN-PATH-REGISTRY-V1' || registry.version !== 1) throw new Error('pass2V3ToolchainRegistry: identity mismatch');
  assertExactArray(registry.passTwoV3EmittedPaths, TRD2_V6_PASS2_V3_PATHS, 'pass2V3ToolchainRegistry.passTwoV3EmittedPaths');
  assertExactArray(registry.toolchainPaths, TRD2_V6_PASS2_V3_TOOLCHAIN_PATHS, 'pass2V3ToolchainRegistry.toolchainPaths');
  if (new Set(registry.toolchainPaths).size !== registry.toolchainPaths.length) throw new Error('pass2V3ToolchainRegistry: duplicate path');
  registry.toolchainPaths.forEach(assertRepoRelativePath);
  return registry;
}

const SPEC_KEYS = Object.freeze({
  Array: ['items', 'kind', 'maxItems', 'minItems', 'sorted', 'unique'],
  Boolean: ['kind'], Bytes32LowerHex: ['kind'], CommitHex: ['kind'], Const: ['kind', 'value'],
  ContentId: ['kind', 'prefix'], Enum: ['kind', 'values'], LogicalPath: ['kind'], Null: ['kind'],
  Nullable: ['inner', 'kind'], Object: ['additionalProperties', 'kind', 'properties', 'required'],
  OneOf: ['kind', 'variants'], Ref: ['kind', 'schemaId'], String: ['kind', 'maxBytes', 'minBytes'],
  UIntSafe: ['kind', 'maximum', 'minimum'],
});

export function validateV3SpecDefinition(spec, schemaIds, label = 'spec') {
  if (!plain(spec) || !TRD2_V6_PASS2_V3_DSL_KINDS.includes(spec.kind)) throw new Error(`${label}: unknown spec kind`);
  assertClosedObject(spec, SPEC_KEYS[spec.kind], label);
  if (spec.kind === 'Array') {
    if (!Number.isSafeInteger(spec.minItems) || !Number.isSafeInteger(spec.maxItems) || spec.minItems < 0 || spec.minItems > spec.maxItems || typeof spec.sorted !== 'boolean' || typeof spec.unique !== 'boolean') throw new Error(`${label}: invalid Array bounds`);
    validateV3SpecDefinition(spec.items, schemaIds, `${label}.items`);
  } else if (spec.kind === 'Nullable') validateV3SpecDefinition(spec.inner, schemaIds, `${label}.inner`);
  else if (spec.kind === 'OneOf') {
    if (!Array.isArray(spec.variants) || spec.variants.length < 2 || new Set(spec.variants.map(canonicalV6)).size !== spec.variants.length) throw new Error(`${label}: invalid OneOf variants`);
    spec.variants.forEach((variant, index) => validateV3SpecDefinition(variant, schemaIds, `${label}.variants[${index}]`));
  } else if (spec.kind === 'Object') {
    if (spec.additionalProperties !== false || !plain(spec.properties) || !Array.isArray(spec.required)) throw new Error(`${label}: Object must be recursively closed`);
    const keys = sortedUtf8(Object.keys(spec.properties));
    if (new Set(spec.required).size !== spec.required.length || spec.required.some((key) => !keys.includes(key))) throw new Error(`${label}: invalid required set`);
    keys.forEach((key) => validateV3SpecDefinition(spec.properties[key], schemaIds, `${label}.properties.${key}`));
  } else if (spec.kind === 'Enum') {
    if (!Array.isArray(spec.values) || spec.values.length === 0 || spec.values.some((value) => typeof value !== 'string') || new Set(spec.values).size !== spec.values.length) throw new Error(`${label}: invalid Enum`);
  } else if (spec.kind === 'String') {
    if (!Number.isSafeInteger(spec.minBytes) || !Number.isSafeInteger(spec.maxBytes) || spec.minBytes < 0 || spec.minBytes > spec.maxBytes) throw new Error(`${label}: invalid String bounds`);
  } else if (spec.kind === 'UIntSafe') {
    if (!Number.isSafeInteger(spec.minimum) || !Number.isSafeInteger(spec.maximum) || spec.minimum < 0 || spec.minimum > spec.maximum || spec.maximum > SAFE_MAX) throw new Error(`${label}: invalid UIntSafe bounds`);
  } else if (spec.kind === 'ContentId') assertUnicodeScalarAndNfc(spec.prefix, `${label}.prefix`);
  else if (spec.kind === 'Const') canonicalV6(spec.value);
  else if (spec.kind === 'Ref') {
    if (typeof spec.schemaId !== 'string' || !schemaIds.has(spec.schemaId)) throw new Error(`${label}: unresolved Ref ${String(spec.schemaId)}`);
  }
  return spec;
}

function referenceIds(spec, destination = []) {
  if (spec.kind === 'Ref') destination.push(spec.schemaId);
  else if (spec.kind === 'Array') referenceIds(spec.items, destination);
  else if (spec.kind === 'Nullable') referenceIds(spec.inner, destination);
  else if (spec.kind === 'OneOf') spec.variants.forEach((branch) => referenceIds(branch, destination));
  else if (spec.kind === 'Object') Object.values(spec.properties).forEach((member) => referenceIds(member, destination));
  return destination;
}

function validateReferenceGraph(schemas) {
  const schemaIds = new Set(schemas.map(({ schemaId }) => schemaId));
  const edges = schemas.flatMap((schema) => sortedUtf8(new Set(referenceIds(schema.rootSpec))).map((toSchemaId) => ({ fromSchemaId: schema.schemaId, toSchemaId })));
  const adjacency = new Map(schemas.map(({ schemaId }) => [schemaId, []]));
  for (const edge of edges) {
    if (!schemaIds.has(edge.toSchemaId)) throw new Error(`unresolved schema Ref ${edge.fromSchemaId} -> ${edge.toSchemaId}`);
    adjacency.get(edge.fromSchemaId).push(edge.toSchemaId);
  }
  const active = new Set();
  const complete = new Set();
  const visit = (schemaId) => {
    if (active.has(schemaId)) throw new Error(`cyclic schema Ref at ${schemaId}`);
    if (complete.has(schemaId)) return;
    active.add(schemaId);
    adjacency.get(schemaId).forEach(visit);
    active.delete(schemaId);
    complete.add(schemaId);
  };
  schemas.forEach(({ schemaId }) => visit(schemaId));
  return edges;
}

function validateIdentityDefinition(identity, label) {
  assertClosedObject(identity, ['bodyPath', 'idKey', 'mode', 'prefix', 'rootKey', 'schemaVersion', 'typeTag'], label);
  if (identity.mode !== 'EXCLUDE-IDENTITY-KEYS' || identity.bodyPath !== null || typeof identity.idKey !== 'string' || typeof identity.rootKey !== 'string' || typeof identity.prefix !== 'string' || typeof identity.typeTag !== 'string' || typeof identity.schemaVersion !== 'string') throw new Error(`${label}: only closed exclusion identity is permitted in v3 future schemas`);
}

function validateInvariantDefinition(invariant, rootSpec, label) {
  if (!plain(invariant) || !TRD2_V6_PASS2_V3_INVARIANT_KINDS.includes(invariant.kind)) throw new Error(`${label}: unknown invariant`);
  const keys = {
    'ARRAY-LENGTH-EQUALS-FIELD': ['arrayField', 'kind', 'numberField'],
    'LTE-FIELDS': ['kind', 'left', 'right'],
    'NOT-EQUAL-FIELDS': ['kind', 'left', 'right'],
    'SUBSET-ARRAY': ['kind', 'subsetField', 'supersetField'],
  }[invariant.kind];
  assertClosedObject(invariant, keys, label);
  if (rootSpec.kind !== 'Object') throw new Error(`${label}: invariant root must be Object`);
  for (const field of keys.filter((key) => key !== 'kind')) if (typeof invariant[field] !== 'string' || !Object.hasOwn(rootSpec.properties, invariant[field])) throw new Error(`${label}: missing field ${String(invariant[field])}`);
  if (invariant.kind === 'ARRAY-LENGTH-EQUALS-FIELD' && (rootSpec.properties[invariant.arrayField].kind !== 'Array' || !['UIntSafe', 'Const'].includes(rootSpec.properties[invariant.numberField].kind))) throw new Error(`${label}: incompatible count fields`);
  if (invariant.kind === 'LTE-FIELDS' && ![invariant.left, invariant.right].every((field) => rootSpec.properties[field].kind === 'UIntSafe')) throw new Error(`${label}: LTE requires UIntSafe fields`);
  if (invariant.kind === 'SUBSET-ARRAY' && ![invariant.subsetField, invariant.supersetField].every((field) => rootSpec.properties[field].kind === 'Array')) throw new Error(`${label}: subset requires Array fields`);
}

function validateInvariants(value, invariants, label) {
  for (const invariant of invariants) {
    let accepted = false;
    if (invariant.kind === 'ARRAY-LENGTH-EQUALS-FIELD') accepted = value[invariant.arrayField].length === value[invariant.numberField];
    else if (invariant.kind === 'NOT-EQUAL-FIELDS') accepted = canonicalV6(value[invariant.left]) !== canonicalV6(value[invariant.right]);
    else if (invariant.kind === 'LTE-FIELDS') accepted = value[invariant.left] <= value[invariant.right];
    else if (invariant.kind === 'SUBSET-ARRAY') {
      const superset = new Set(value[invariant.supersetField].map(canonicalV6));
      accepted = value[invariant.subsetField].every((member) => superset.has(canonicalV6(member)));
    }
    if (!accepted) fail('INVARIANT-MISMATCH', `${label}: ${invariant.kind}`);
  }
}

export function validateBySpecV3(value, spec, schemaById, label = '$') {
  if (spec.kind === 'Ref') {
    const target = schemaById.get(spec.schemaId);
    if (target === undefined) fail('UNRESOLVED-REF', `${label}: ${spec.schemaId}`);
    validateV3Record(value, target, schemaById, label);
    return value;
  }
  if (value === null && !['Null', 'Nullable'].includes(spec.kind) && !(spec.kind === 'Const' && spec.value === null)) fail('NULLABILITY-MISMATCH', `${label}: null forbidden`);
  if (spec.kind === 'Null') { if (value !== null) fail('TYPE-MISMATCH', `${label}: null required`); }
  else if (spec.kind === 'Nullable') { if (value !== null) validateBySpecV3(value, spec.inner, schemaById, label); }
  else if (spec.kind === 'OneOf') {
    let count = 0;
    for (const branch of spec.variants) {
      try { validateBySpecV3(value, branch, schemaById, label); count += 1; } catch (error) { if (!(error instanceof V3SchemaValidationError)) throw error; }
    }
    if (count !== 1) fail('UNION-MISMATCH', `${label}: exactly one branch required`);
  } else if (spec.kind === 'Const') { if (canonicalV6(value) !== canonicalV6(spec.value)) fail('CONST-MISMATCH', `${label}: const mismatch`); }
  else if (spec.kind === 'Boolean') { if (typeof value !== 'boolean') fail('TYPE-MISMATCH', `${label}: boolean required`); }
  else if (spec.kind === 'UIntSafe') {
    if (!Number.isSafeInteger(value) || value < 0) fail('TYPE-MISMATCH', `${label}: UIntSafe required`);
    if (value < spec.minimum || value > spec.maximum) fail('RANGE-ERROR', `${label}: integer range`);
  } else if (spec.kind === 'String') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: string required`);
    try { assertUnicodeScalarAndNfc(value, label); } catch (error) { fail('FORMAT-ERROR', error.message); }
    const size = Buffer.byteLength(value, 'utf8');
    if (size < spec.minBytes || size > spec.maxBytes) fail('RANGE-ERROR', `${label}: string range`);
  } else if (spec.kind === 'Bytes32LowerHex') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: digest string required`);
    if (!SHA256_RE.test(value)) fail('FORMAT-ERROR', `${label}: digest format`);
  } else if (spec.kind === 'CommitHex') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: commit string required`);
    if (!COMMIT_RE.test(value)) fail('FORMAT-ERROR', `${label}: commit format`);
  }
  else if (spec.kind === 'LogicalPath') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: path string required`);
    try { assertRepoRelativePath(value); } catch (error) { fail('FORMAT-ERROR', error.message); }
  } else if (spec.kind === 'ContentId') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: content id string required`);
    if (!value.startsWith(`${spec.prefix}-`) || !SHA256_RE.test(value.slice(spec.prefix.length + 1))) fail('FORMAT-ERROR', `${label}: content id format`);
  } else if (spec.kind === 'Enum') {
    if (typeof value !== 'string') fail('TYPE-MISMATCH', `${label}: enum string required`);
    if (!spec.values.includes(value)) fail('ENUM-MISMATCH', `${label}: enum member`);
  }
  else if (spec.kind === 'Array') {
    if (!Array.isArray(value)) fail('TYPE-MISMATCH', `${label}: array required`);
    if (value.length < spec.minItems || value.length > spec.maxItems) fail('RANGE-ERROR', `${label}: array range`);
    value.forEach((member, index) => validateBySpecV3(member, spec.items, schemaById, `${label}[${index}]`));
    const encoded = value.map(canonicalV6);
    if (spec.unique && new Set(encoded).size !== encoded.length) fail('INVARIANT-MISMATCH', `${label}: duplicate array member`);
    if (spec.sorted && canonicalV6(encoded) !== canonicalV6(sortedUtf8(encoded))) fail('INVARIANT-MISMATCH', `${label}: array order`);
  } else if (spec.kind === 'Object') {
    if (!plain(value)) fail('TYPE-MISMATCH', `${label}: object required`);
    const unknown = sortedUtf8(Object.keys(value).filter((key) => !Object.hasOwn(spec.properties, key)));
    if (unknown.length > 0) fail('UNKNOWN-FIELD', `${label}: unknown ${unknown[0]}`);
    const missing = sortedUtf8(spec.required.filter((key) => !Object.hasOwn(value, key)));
    if (missing.length > 0) fail('MISSING-FIELD', `${label}: missing ${missing[0]}`);
    for (const key of sortedUtf8(Object.keys(value))) validateBySpecV3(value[key], spec.properties[key], schemaById, `${label}.${key}`);
  } else throw new Error(`${label}: unimplemented kind ${spec.kind}`);
  return value;
}

function identityBody(record, identity) {
  if (identity.mode === 'EXCLUDE-IDENTITY-KEYS') return Object.fromEntries(Object.entries(record).filter(([key]) => key !== identity.idKey && key !== identity.rootKey));
  if (identity.mode === 'BODY-PATH') return identity.bodyPath.reduce((current, segment) => current[segment], record);
  throw new Error(`unknown identity mode ${identity.mode}`);
}

export function validateV3Record(record, schema, schemaById) {
  validateBySpecV3(record, schema.rootSpec, schemaById, schema.family);
  validateInvariants(record, schema.invariants, schema.family);
  if (schema.contentIdentity === null) return null;
  const identity = schema.contentIdentity;
  const expectedRoot = rootV6(identity.typeTag, identity.schemaVersion, identityBody(record, identity));
  if (record[identity.rootKey] !== expectedRoot) fail('CONTENT-IDENTITY-MISMATCH', `${schema.family}: root mismatch`);
  if (identity.idKey !== null && record[identity.idKey] !== `${identity.prefix}-${expectedRoot}`) fail('CONTENT-IDENTITY-MISMATCH', `${schema.family}: id mismatch`);
  return expectedRoot;
}

function normalizeActualSchema(schema) {
  const body = {
    actualPositiveCount: schema.actualPositiveCount,
    constructionFixtureCount: 0,
    contentIdentity: schema.contentIdentity,
    family: schema.family,
    familyStatus: 'ACTUAL-POSITIVE',
    invariants: [],
    predecessorSchemaRoot: schema.schemaRoot,
    rootSpec: schema.rootSpec,
    schemaId: schema.schemaId,
    sourcePaths: schema.sourcePaths,
  };
  return { ...body, schemaRoot: rootV6('CLOSED-SCHEMA-DEFINITION-V3', 'CONNECT-TRD2-V6-CLOSED-SCHEMA-DEFINITION-V3', body) };
}

function normalizeFutureSchema(definition) {
  const body = {
    actualPositiveCount: 0,
    constructionFixtureCount: 1,
    contentIdentity: definition.contentIdentity,
    family: definition.family,
    familyStatus: 'FUTURE-CONSTRUCTION',
    invariants: definition.invariants,
    predecessorSchemaRoot: null,
    rootSpec: definition.rootSpec,
    schemaId: definition.schemaId,
    sourcePaths: [TRD2_V6_PASS2_V3_CATALOG_PATH],
  };
  return { ...body, schemaRoot: rootV6('CLOSED-SCHEMA-DEFINITION-V3', 'CONNECT-TRD2-V6-CLOSED-SCHEMA-DEFINITION-V3', body) };
}

function seedDigest(label) {
  return sha256Bytes(Buffer.from(`CONNECT-TRD2-V6-PASS2-V3-DETERMINISTIC-SAMPLE\0${label}`, 'utf8'));
}

function sampleString(spec, label) {
  const seed = `v3-${seedDigest(label)}`;
  const length = Math.max(spec.minBytes, Math.min(spec.maxBytes, seed.length));
  return seed.padEnd(length, 'x').slice(0, length);
}

function generateBySpec(spec, schemaById, actualSampleBySchemaId, label, stack) {
  if (spec.kind === 'Ref') {
    if (actualSampleBySchemaId.has(spec.schemaId)) return structuredClone(actualSampleBySchemaId.get(spec.schemaId));
    return generateFutureSample(schemaById.get(spec.schemaId), schemaById, actualSampleBySchemaId, `${label}.ref`, stack);
  }
  if (spec.kind === 'Const') return structuredClone(spec.value);
  if (spec.kind === 'Boolean') return false;
  if (spec.kind === 'UIntSafe') return spec.minimum;
  if (spec.kind === 'String') return sampleString(spec, label);
  if (spec.kind === 'Bytes32LowerHex') return seedDigest(label);
  if (spec.kind === 'CommitHex') return seedDigest(label).slice(0, 40);
  if (spec.kind === 'LogicalPath') return `docs/planning/v3/${seedDigest(label)}.json`;
  if (spec.kind === 'ContentId') return `${spec.prefix}-${seedDigest(label)}`;
  if (spec.kind === 'Enum') return spec.values[0];
  if (spec.kind === 'Null' || spec.kind === 'Nullable') return null;
  if (spec.kind === 'OneOf') return generateBySpec(spec.variants[0], schemaById, actualSampleBySchemaId, `${label}.variant0`, stack);
  if (spec.kind === 'Array') {
    const members = Array.from({ length: spec.minItems }, (_unused, index) => generateBySpec(spec.items, schemaById, actualSampleBySchemaId, `${label}[${index}]`, stack));
    if (spec.sorted) members.sort((left, right) => Buffer.compare(Buffer.from(canonicalV6(left)), Buffer.from(canonicalV6(right))));
    return members;
  }
  if (spec.kind === 'Object') return Object.fromEntries(sortedUtf8(spec.required).map((key) => [key, generateBySpec(spec.properties[key], schemaById, actualSampleBySchemaId, `${label}.${key}`, stack)]));
  throw new Error(`${label}: sample generator missing ${spec.kind}`);
}

function satisfyInvariants(record, schema, schemaById, actualSampleBySchemaId, label, stack) {
  for (const invariant of schema.invariants) {
    if (invariant.kind === 'ARRAY-LENGTH-EQUALS-FIELD') record[invariant.numberField] = record[invariant.arrayField].length;
    else if (invariant.kind === 'NOT-EQUAL-FIELDS' && canonicalV6(record[invariant.left]) === canonicalV6(record[invariant.right])) record[invariant.right] = generateBySpec(schema.rootSpec.properties[invariant.right], schemaById, actualSampleBySchemaId, `${label}.${invariant.right}.distinct`, stack);
    else if (invariant.kind === 'LTE-FIELDS' && record[invariant.left] > record[invariant.right]) record[invariant.right] = record[invariant.left];
    else if (invariant.kind === 'SUBSET-ARRAY') {
      const target = record[invariant.supersetField];
      const subsetSpec = schema.rootSpec.properties[invariant.subsetField];
      record[invariant.subsetField] = target.slice(0, Math.max(subsetSpec.minItems, Math.min(target.length, subsetSpec.maxItems)));
    }
  }
}

function generateFutureSample(schema, schemaById, actualSampleBySchemaId, label = schema.schemaId, stack = []) {
  if (schema === undefined) throw new Error(`${label}: missing schema`);
  if (stack.includes(schema.schemaId)) throw new Error(`${label}: cyclic sample construction`);
  const nextStack = [...stack, schema.schemaId];
  const record = generateBySpec(schema.rootSpec, schemaById, actualSampleBySchemaId, label, nextStack);
  satisfyInvariants(record, schema, schemaById, actualSampleBySchemaId, label, nextStack);
  const identity = schema.contentIdentity;
  const body = identityBody(record, identity);
  const contentRoot = rootV6(identity.typeTag, identity.schemaVersion, body);
  record[identity.rootKey] = contentRoot;
  record[identity.idKey] = `${identity.prefix}-${contentRoot}`;
  validateV3Record(record, schema, schemaById);
  return record;
}

function fixtureBody({ expectedContentRoot, expectedStatus, expectedTerminal, fixtureClass, mutation, schemaId, sourceFixtureId, sourceFixtureRoot, sourceLocator, value }) {
  const bytes = Buffer.from(canonicalV6(value), 'utf8');
  return {
    byteLength: bytes.length,
    bytesBase64: bytes.toString('base64'),
    expectedContentRoot,
    expectedStatus,
    expectedTerminal,
    fixtureClass,
    mutation,
    schemaId,
    sha256: sha256Bytes(bytes),
    sourceFixtureId,
    sourceFixtureRoot,
    sourceLocator,
  };
}

function makeV3Fixture(argumentsValue) {
  return attachContentIdentity('TRD2V6-V3-FIXTURE', 'CANONICAL-SCHEMA-FIXTURE-V3', 'CONNECT-TRD2-V6-CANONICAL-SCHEMA-FIXTURE-V3', fixtureBody(argumentsValue), 'fixtureId', 'fixtureRoot');
}

export function evaluateV3Value(value, schema, schemaById) {
  try {
    return { contentRoot: validateV3Record(value, schema, schemaById), status: 'PASS', terminal: 'ACCEPT' };
  } catch (error) {
    if (!(error instanceof V3SchemaValidationError) && !(error instanceof V2SchemaValidationError)) throw error;
    return { contentRoot: null, status: 'BLOCK', terminal: error.terminal };
  }
}

export function evaluateV3Fixture(fixture, schema, schemaById) {
  let outcome;
  try {
    const bytes = Buffer.from(fixture.bytesBase64, 'base64');
    if (bytes.toString('base64') !== fixture.bytesBase64 || bytes.length !== fixture.byteLength || sha256Bytes(bytes) !== fixture.sha256) fail('FIXTURE-BYTES-INVALID', 'fixture byte binding mismatch');
    outcome = evaluateV3Value(parseCanonicalJsonBytes(bytes), schema, schemaById);
  } catch (error) {
    if (!(error instanceof V3SchemaValidationError) && !(error instanceof V2SchemaValidationError)) throw error;
    outcome = { contentRoot: null, status: 'BLOCK', terminal: error.terminal };
  }
  return {
    contentRoot: outcome.contentRoot,
    expectedStatus: fixture.expectedStatus,
    expectedTerminal: fixture.expectedTerminal,
    fixtureId: fixture.fixtureId,
    fixtureSha256: fixture.sha256,
    matchesExpectation: outcome.status === fixture.expectedStatus && outcome.terminal === fixture.expectedTerminal && outcome.contentRoot === fixture.expectedContentRoot,
    observedStatus: outcome.status,
    observedTerminal: outcome.terminal,
    schemaId: fixture.schemaId,
  };
}

function mutateRoot(record, rootKey) {
  const clone = structuredClone(record);
  clone[rootKey] = clone[rootKey] === '0'.repeat(64) ? '1'.repeat(64) : '0'.repeat(64);
  return clone;
}

function invariantMutation(record, schema, invariant, ordinal) {
  const clone = structuredClone(record);
  if (invariant.kind === 'NOT-EQUAL-FIELDS') clone[invariant.right] = structuredClone(clone[invariant.left]);
  else if (invariant.kind === 'LTE-FIELDS') {
    const leftSpec = schema.rootSpec.properties[invariant.left];
    const rightSpec = schema.rootSpec.properties[invariant.right];
    if (leftSpec.maximum <= rightSpec.minimum) return null;
    clone[invariant.left] = Math.min(leftSpec.maximum, rightSpec.minimum + 1);
    clone[invariant.right] = rightSpec.minimum;
  } else if (invariant.kind === 'SUBSET-ARRAY') {
    const subsetSpec = schema.rootSpec.properties[invariant.subsetField];
    if (subsetSpec.maxItems === 0) return null;
    const outsider = generateBySpec(subsetSpec.items, new Map(), new Map(), `${schema.schemaId}.invariant.${ordinal}.outsider`, []);
    clone[invariant.subsetField] = [outsider];
  } else if (invariant.kind === 'ARRAY-LENGTH-EQUALS-FIELD') {
    const numberSpec = schema.rootSpec.properties[invariant.numberField];
    const current = clone[invariant.arrayField].length;
    if (numberSpec.kind === 'UIntSafe' && current < numberSpec.maximum) clone[invariant.numberField] = current + 1;
    else if (numberSpec.kind === 'UIntSafe' && current > numberSpec.minimum) clone[invariant.numberField] = current - 1;
    else return null;
  }
  return clone;
}

function futureFixtures(schemas, v2Registry) {
  const schemaById = new Map(schemas.map((schema) => [schema.schemaId, schema]));
  const actualSampleBySchemaId = new Map();
  for (const fixture of v2Registry.fixtures.filter(({ fixtureClass }) => fixtureClass === 'ACTUAL-POSITIVE')) if (!actualSampleBySchemaId.has(fixture.schemaId)) actualSampleBySchemaId.set(fixture.schemaId, parseCanonicalJsonBytes(Buffer.from(fixture.bytesBase64, 'base64')));
  const fixtures = [];
  for (const schema of schemas.filter(({ familyStatus }) => familyStatus === 'FUTURE-CONSTRUCTION')) {
    const sample = generateFutureSample(schema, schemaById, actualSampleBySchemaId);
    const accepted = evaluateV3Value(sample, schema, schemaById);
    if (accepted.status !== 'PASS') throw new Error(`${schema.family}: construction sample rejected at ${accepted.terminal}`);
    fixtures.push(makeV3Fixture({ expectedContentRoot: accepted.contentRoot, expectedStatus: 'PASS', expectedTerminal: 'ACCEPT', fixtureClass: 'FUTURE-CONSTRUCTION', mutation: 'NONE', schemaId: schema.schemaId, sourceFixtureId: null, sourceFixtureRoot: null, sourceLocator: null, value: sample }));
    const hostile = [
      ['UNKNOWN-FIELD', { ...structuredClone(sample), __undeclaredV3: true }],
      ['MISSING-FIELD', (() => { const value = structuredClone(sample); delete value[schema.rootSpec.required[0]]; return value; })()],
      ['CONTENT-IDENTITY-MISMATCH', mutateRoot(sample, schema.contentIdentity.rootKey)],
    ];
    schema.invariants.forEach((invariant, index) => {
      const value = invariantMutation(sample, schema, invariant, index);
      if (value !== null) hostile.push([`INVARIANT-${index}-${invariant.kind}`, value]);
    });
    for (const [mutation, value] of hostile) {
      const rejected = evaluateV3Value(value, schema, schemaById);
      if (rejected.status !== 'BLOCK') throw new Error(`${schema.family}.${mutation}: hostile mutation passed`);
      fixtures.push(makeV3Fixture({ expectedContentRoot: null, expectedStatus: 'BLOCK', expectedTerminal: rejected.terminal, fixtureClass: 'MUTATION', mutation, schemaId: schema.schemaId, sourceFixtureId: null, sourceFixtureRoot: null, sourceLocator: null, value }));
    }
  }
  return fixtures;
}

function actualFixtures(v2Registry) {
  return v2Registry.fixtures.map((fixture) => makeV3Fixture({
    expectedContentRoot: fixture.expectedContentRoot,
    expectedStatus: fixture.expectedStatus,
    expectedTerminal: fixture.expectedTerminal,
    fixtureClass: fixture.fixtureClass,
    mutation: fixture.mutation,
    schemaId: fixture.schemaId,
    sourceFixtureId: fixture.fixtureId,
    sourceFixtureRoot: fixture.fixtureRoot,
    sourceLocator: fixture.sourceLocator,
    value: parseCanonicalJsonBytes(Buffer.from(fixture.bytesBase64, 'base64')),
  }));
}

function outputBindings(outputRegistry, schemas) {
  const schemaById = new Map(schemas.map((schema) => [schema.schemaId, schema]));
  return sortedUtf8(Object.keys(outputRegistry.plannedTopLevelSchemas)).map((logicalPath) => {
    const schemaId = outputRegistry.plannedTopLevelSchemas[logicalPath];
    const builtin = BUILTIN_SCHEMA_IDS.includes(schemaId);
    const schema = schemaById.get(schemaId);
    if (!builtin && schema === undefined) throw new Error(`planned output has unknown schema: ${logicalPath} -> ${schemaId}`);
    const filename = logicalPath.split('/').at(-1);
    if (Object.hasOwn(TRD2_V6_PASS2_V3_OUTPUT_SCHEMA_FAMILIES, filename)) {
      const expected = `CONNECT-TRD2-V6-${TRD2_V6_PASS2_V3_OUTPUT_SCHEMA_FAMILIES[filename]}-SCHEMA`;
      if (schemaId !== expected) throw new Error(`catalog/output map disagreement: ${logicalPath}`);
    }
    return { builtin, logicalPath, schemaId, schemaRoot: builtin ? null : schema.schemaRoot };
  });
}

export function makeClosedSchemaRegistryV3({ outputRegistry, provenance, v2Registry, v2ReportA, v2ReportB }) {
  validateOutputPathRegistryV3(outputRegistry);
  validateClosedSchemaRegistryV2(v2Registry);
  validateCanonicalV2Report(v2ReportA, v2Registry);
  validateCanonicalV2Report(v2ReportB, v2Registry);
  if (v2ReportA.status !== 'PASS' || v2ReportB.status !== 'PASS' || v2ReportA.outcomeRoot !== v2ReportB.outcomeRoot || canonicalV6(v2ReportA.outcomes) !== canonicalV6(v2ReportB.outcomes)) throw new Error('v2 actual-record evidence is not dual-engine stable');
  const schemas = [
    ...v2Registry.schemas.map(normalizeActualSchema),
    ...TRD2_V6_PASS2_V3_FUTURE_DEFINITIONS.map(normalizeFutureSchema),
  ].sort((left, right) => Buffer.compare(Buffer.from(left.schemaId), Buffer.from(right.schemaId)));
  if (new Set(schemas.map(({ schemaId }) => schemaId)).size !== schemas.length) throw new Error('v3 duplicate schema id');
  const schemaIds = new Set(schemas.map(({ schemaId }) => schemaId));
  for (const schema of schemas) {
    validateV3SpecDefinition(schema.rootSpec, schemaIds, `${schema.schemaId}.rootSpec`);
    if (schema.familyStatus === 'FUTURE-CONSTRUCTION') {
      validateIdentityDefinition(schema.contentIdentity, `${schema.schemaId}.contentIdentity`);
      schema.invariants.forEach((invariant, index) => validateInvariantDefinition(invariant, schema.rootSpec, `${schema.schemaId}.invariants[${index}]`));
    }
    const body = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== 'schemaRoot'));
    if (schema.schemaRoot !== rootV6('CLOSED-SCHEMA-DEFINITION-V3', 'CONNECT-TRD2-V6-CLOSED-SCHEMA-DEFINITION-V3', body)) throw new Error(`${schema.schemaId}: schema root mismatch`);
  }
  const referenceEdges = validateReferenceGraph(schemas);
  const fixtures = [...actualFixtures(v2Registry), ...futureFixtures(schemas, v2Registry)];
  const bindings = outputBindings(outputRegistry, schemas);
  const actualPositiveCount = fixtures.filter(({ fixtureClass }) => fixtureClass === 'ACTUAL-POSITIVE').length;
  const futureConstructionCount = fixtures.filter(({ fixtureClass }) => fixtureClass === 'FUTURE-CONSTRUCTION').length;
  const actualMutationCount = fixtures.filter(({ fixtureClass, sourceFixtureId }) => fixtureClass === 'MUTATION' && sourceFixtureId !== null).length;
  const futureMutationCount = fixtures.filter(({ fixtureClass, sourceFixtureId }) => fixtureClass === 'MUTATION' && sourceFixtureId === null).length;
  const body = {
    acceptance: 0,
    actualMutationCount,
    actualPositiveCount,
    artifactClass: 'PLANNING-ONLY;LOCAL-CANDIDATE;NOT-ACCEPTANCE',
    builtinSchemaCount: BUILTIN_SCHEMA_IDS.length,
    claimLimit: 'LOCAL-COMPLETE-SCHEMA-UNIVERSE-EVIDENCE;FUTURE-CONSTRUCTIONS-NOT-PRODUCTION-EVIDENCE',
    developmentFreeze: 'ACTIVE',
    dslProfile: { additionalProperties: false, canonicalJson: 'CONNECT-TRD2-V6-CANONICAL-JSON-V1', kinds: TRD2_V6_PASS2_V3_DSL_KINDS, recursiveClosedObjects: true, referenceCyclesAllowed: false, unionRule: 'EXACTLY-ONE-BRANCH' },
    findingClosure: '0/15',
    fixtureCollectionRoot: rootV6('CANONICAL-SCHEMA-FIXTURE-COLLECTION-V3', 'CONNECT-TRD2-V6-CANONICAL-SCHEMA-FIXTURE-COLLECTION-V3', fixtures.map(({ fixtureRoot }) => fixtureRoot)),
    fixtureCount: fixtures.length,
    fixtures,
    futureConstructionCount,
    futureMutationCount,
    gate29: 'BLOCKED',
    outputBindingCount: bindings.length,
    outputBindingRoot: rootV6('OUTPUT-SCHEMA-BINDING-COLLECTION-V3', 'CONNECT-TRD2-V6-OUTPUT-SCHEMA-BINDING-COLLECTION-V3', bindings),
    outputBindings: bindings,
    provenance,
    referenceEdgeCount: referenceEdges.length,
    referenceEdgeRoot: rootV6('SCHEMA-REFERENCE-EDGE-COLLECTION-V3', 'CONNECT-TRD2-V6-SCHEMA-REFERENCE-EDGE-COLLECTION-V3', referenceEdges),
    referenceEdges,
    repositoryVisibility: 'PUBLIC',
    reviewGenerations: '0/2',
    schemaCount: schemas.length,
    schemaVersion: 'CONNECT-TRD2-V6-CLOSED-SCHEMA-REGISTRY-V3',
    schemas,
    v2Disposition: { reusableForPass3: false, status: 'REJECTED-AS-COMPLETE-REGISTRY;BOUNDED-ACTUAL-EVIDENCE-REVALIDATED', supersededPaths: TRD2_V6_PASS2_V2_PATHS },
  };
  return validateClosedSchemaRegistryV3(attachContentIdentity('TRD2V6-CLOSED-SCHEMA-REGISTRY-V3', 'CLOSED-SCHEMA-REGISTRY-V3', body.schemaVersion, body));
}

export function validateClosedSchemaRegistryV3(registry) {
  assertClosedObject(registry, [
    'acceptance', 'actualMutationCount', 'actualPositiveCount', 'artifactClass', 'artifactId', 'artifactRoot',
    'builtinSchemaCount', 'claimLimit', 'developmentFreeze', 'dslProfile', 'findingClosure', 'fixtureCollectionRoot',
    'fixtureCount', 'fixtures', 'futureConstructionCount', 'futureMutationCount', 'gate29', 'outputBindingCount',
    'outputBindingRoot', 'outputBindings', 'provenance', 'referenceEdgeCount', 'referenceEdgeRoot', 'referenceEdges',
    'repositoryVisibility', 'reviewGenerations', 'schemaCount', 'schemaVersion', 'schemas', 'v2Disposition',
  ], 'closedSchemaRegistryV3');
  validateContentIdentity(registry, 'TRD2V6-CLOSED-SCHEMA-REGISTRY-V3', 'CLOSED-SCHEMA-REGISTRY-V3', registry.schemaVersion);
  if (registry.schemaVersion !== 'CONNECT-TRD2-V6-CLOSED-SCHEMA-REGISTRY-V3' || registry.repositoryVisibility !== 'PUBLIC' || registry.developmentFreeze !== 'ACTIVE' || registry.gate29 !== 'BLOCKED' || registry.acceptance !== 0 || registry.findingClosure !== '0/15' || registry.reviewGenerations !== '0/2') throw new Error('closedSchemaRegistryV3: safety boundary mismatch');
  if (registry.schemaCount !== 82 || registry.schemas.length !== 82 || registry.actualPositiveCount !== 391 || registry.futureConstructionCount !== 57 || registry.outputBindingCount !== 30 || registry.builtinSchemaCount !== 2) throw new Error('closedSchemaRegistryV3: denominator mismatch');
  const schemaById = new Map(registry.schemas.map((schema) => [schema.schemaId, schema]));
  if (schemaById.size !== registry.schemaCount) throw new Error('closedSchemaRegistryV3: duplicate schema');
  const schemaIds = new Set(schemaById.keys());
  for (const schema of registry.schemas) {
    assertClosedObject(schema, ['actualPositiveCount', 'constructionFixtureCount', 'contentIdentity', 'family', 'familyStatus', 'invariants', 'predecessorSchemaRoot', 'rootSpec', 'schemaId', 'schemaRoot', 'sourcePaths'], `schema.${schema.schemaId}`);
    validateV3SpecDefinition(schema.rootSpec, schemaIds, `schema.${schema.schemaId}.rootSpec`);
    if (!['ACTUAL-POSITIVE', 'FUTURE-CONSTRUCTION'].includes(schema.familyStatus)) throw new Error(`schema.${schema.schemaId}: status`);
    const expectedCounts = schema.familyStatus === 'ACTUAL-POSITIVE' ? [schema.actualPositiveCount > 0, schema.constructionFixtureCount === 0] : [schema.actualPositiveCount === 0, schema.constructionFixtureCount === 1];
    if (expectedCounts.some((value) => !value)) throw new Error(`schema.${schema.schemaId}: fixture class counts`);
    const body = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== 'schemaRoot'));
    if (schema.schemaRoot !== rootV6('CLOSED-SCHEMA-DEFINITION-V3', 'CONNECT-TRD2-V6-CLOSED-SCHEMA-DEFINITION-V3', body)) throw new Error(`schema.${schema.schemaId}: root`);
  }
  const edges = validateReferenceGraph(registry.schemas);
  if (registry.referenceEdgeCount !== edges.length || canonicalV6(registry.referenceEdges) !== canonicalV6(edges) || registry.referenceEdgeRoot !== rootV6('SCHEMA-REFERENCE-EDGE-COLLECTION-V3', 'CONNECT-TRD2-V6-SCHEMA-REFERENCE-EDGE-COLLECTION-V3', edges)) throw new Error('closedSchemaRegistryV3: reference graph mismatch');
  if (registry.fixtures.length !== registry.fixtureCount) throw new Error('closedSchemaRegistryV3: fixture count mismatch');
  const classCounts = { actual: 0, actualMutation: 0, future: 0, futureMutation: 0 };
  for (const fixture of registry.fixtures) {
    assertClosedObject(fixture, ['byteLength', 'bytesBase64', 'expectedContentRoot', 'expectedStatus', 'expectedTerminal', 'fixtureClass', 'fixtureId', 'fixtureRoot', 'mutation', 'schemaId', 'sha256', 'sourceFixtureId', 'sourceFixtureRoot', 'sourceLocator'], `fixture.${fixture.fixtureId}`);
    validateContentIdentity(fixture, 'TRD2V6-V3-FIXTURE', 'CANONICAL-SCHEMA-FIXTURE-V3', 'CONNECT-TRD2-V6-CANONICAL-SCHEMA-FIXTURE-V3', 'fixtureId', 'fixtureRoot');
    if (!schemaById.has(fixture.schemaId)) throw new Error(`fixture.${fixture.fixtureId}: unknown schema`);
    const outcome = evaluateV3Fixture(fixture, schemaById.get(fixture.schemaId), schemaById);
    if (!outcome.matchesExpectation) throw new Error(`fixture.${fixture.fixtureId}: producer oracle mismatch; schema=${fixture.schemaId}; class=${fixture.fixtureClass}; mutation=${fixture.mutation}; expected=${fixture.expectedStatus}/${fixture.expectedTerminal}/${fixture.expectedContentRoot}; observed=${outcome.observedStatus}/${outcome.observedTerminal}/${outcome.contentRoot}`);
    if (fixture.fixtureClass === 'ACTUAL-POSITIVE') classCounts.actual += 1;
    else if (fixture.fixtureClass === 'FUTURE-CONSTRUCTION') classCounts.future += 1;
    else if (fixture.fixtureClass === 'MUTATION' && fixture.sourceFixtureId !== null) classCounts.actualMutation += 1;
    else if (fixture.fixtureClass === 'MUTATION' && fixture.sourceFixtureId === null) classCounts.futureMutation += 1;
    else throw new Error(`fixture.${fixture.fixtureId}: invalid class`);
  }
  if (classCounts.actual !== registry.actualPositiveCount || classCounts.actualMutation !== registry.actualMutationCount || classCounts.future !== registry.futureConstructionCount || classCounts.futureMutation !== registry.futureMutationCount) throw new Error('closedSchemaRegistryV3: fixture class mismatch');
  if (registry.fixtureCollectionRoot !== rootV6('CANONICAL-SCHEMA-FIXTURE-COLLECTION-V3', 'CONNECT-TRD2-V6-CANONICAL-SCHEMA-FIXTURE-COLLECTION-V3', registry.fixtures.map(({ fixtureRoot }) => fixtureRoot))) throw new Error('closedSchemaRegistryV3: fixture root mismatch');
  if (registry.outputBindings.length !== registry.outputBindingCount || registry.outputBindingRoot !== rootV6('OUTPUT-SCHEMA-BINDING-COLLECTION-V3', 'CONNECT-TRD2-V6-OUTPUT-SCHEMA-BINDING-COLLECTION-V3', registry.outputBindings)) throw new Error('closedSchemaRegistryV3: output binding mismatch');
  const boundPaths = new Set();
  for (const row of registry.outputBindings) {
    assertClosedObject(row, ['builtin', 'logicalPath', 'schemaId', 'schemaRoot'], `outputBinding.${row.logicalPath}`);
    assertRepoRelativePath(row.logicalPath);
    if (boundPaths.has(row.logicalPath)) throw new Error(`outputBinding duplicate: ${row.logicalPath}`);
    boundPaths.add(row.logicalPath);
    if (row.builtin !== BUILTIN_SCHEMA_IDS.includes(row.schemaId) || (!row.builtin && schemaById.get(row.schemaId)?.schemaRoot !== row.schemaRoot) || (row.builtin && row.schemaRoot !== null)) throw new Error(`outputBinding invalid: ${row.logicalPath}`);
  }
  if (registry.v2Disposition.reusableForPass3 !== false || !registry.v2Disposition.status.startsWith('REJECTED-AS-COMPLETE-REGISTRY')) throw new Error('closedSchemaRegistryV3: v2 disposition');
  return registry;
}

export function makeCanonicalV3Report({ engineId, implementation, registry, sourceSha256, outcomes }) {
  const mismatchCount = outcomes.filter(({ matchesExpectation }) => !matchesExpectation).length;
  const body = {
    actualMutationCount: registry.actualMutationCount,
    actualPositiveCount: registry.actualPositiveCount,
    claimLimit: 'LOCAL-INDEPENDENT-CANONICAL-V3-EVIDENCE;NO-EXTERNAL-CLOSURE',
    engineId,
    fixtureCollectionRoot: registry.fixtureCollectionRoot,
    futureConstructionCount: registry.futureConstructionCount,
    futureMutationCount: registry.futureMutationCount,
    implementation,
    mismatchCount,
    outcomeCount: outcomes.length,
    outcomeRoot: rootV6('CANONICAL-V3-OUTCOME-COLLECTION', 'CONNECT-TRD2-V6-CANONICAL-V3-OUTCOME-COLLECTION-V1', outcomes),
    outcomes,
    registryRoot: registry.artifactRoot,
    schemaVersion: 'CONNECT-TRD2-V6-CANONICAL-ENGINE-REPORT-V3',
    sourceSha256,
    status: mismatchCount === 0 ? 'PASS' : 'BLOCKED',
  };
  return attachContentIdentity('TRD2V6-CANONICAL-V3-REPORT', 'CANONICAL-ENGINE-REPORT-V3', body.schemaVersion, body);
}

export function validateCanonicalV3Report(report, registry) {
  assertClosedObject(report, ['actualMutationCount', 'actualPositiveCount', 'artifactId', 'artifactRoot', 'claimLimit', 'engineId', 'fixtureCollectionRoot', 'futureConstructionCount', 'futureMutationCount', 'implementation', 'mismatchCount', 'outcomeCount', 'outcomeRoot', 'outcomes', 'registryRoot', 'schemaVersion', 'sourceSha256', 'status'], `canonicalV3Report.${report.engineId}`);
  validateContentIdentity(report, 'TRD2V6-CANONICAL-V3-REPORT', 'CANONICAL-ENGINE-REPORT-V3', report.schemaVersion);
  if (report.schemaVersion !== 'CONNECT-TRD2-V6-CANONICAL-ENGINE-REPORT-V3' || report.registryRoot !== registry.artifactRoot || report.fixtureCollectionRoot !== registry.fixtureCollectionRoot || report.actualPositiveCount !== registry.actualPositiveCount || report.actualMutationCount !== registry.actualMutationCount || report.futureConstructionCount !== registry.futureConstructionCount || report.futureMutationCount !== registry.futureMutationCount || report.outcomeCount !== registry.fixtureCount || report.outcomes.length !== report.outcomeCount || !SHA256_RE.test(report.sourceSha256)) throw new Error(`canonicalV3Report.${report.engineId}: binding mismatch`);
  for (const outcome of report.outcomes) assertClosedObject(outcome, ['contentRoot', 'expectedStatus', 'expectedTerminal', 'fixtureId', 'fixtureSha256', 'matchesExpectation', 'observedStatus', 'observedTerminal', 'schemaId'], `outcome.${outcome.fixtureId}`);
  const mismatchCount = report.outcomes.filter(({ matchesExpectation }) => !matchesExpectation).length;
  if (mismatchCount !== report.mismatchCount || report.outcomeRoot !== rootV6('CANONICAL-V3-OUTCOME-COLLECTION', 'CONNECT-TRD2-V6-CANONICAL-V3-OUTCOME-COLLECTION-V1', report.outcomes) || report.status !== (mismatchCount === 0 ? 'PASS' : 'BLOCKED')) throw new Error(`canonicalV3Report.${report.engineId}: outcome mismatch`);
  return report;
}
