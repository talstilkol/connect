import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

import { canonicalV6, sha256Bytes } from '../scripts/trd2-v6-core.mjs';
import {
  TRD2_V6_PASS1_REUSED_PATHS,
  TRD2_V6_PASS2_V2_DSL_KINDS,
  TRD2_V6_PASS2_V2_PATHS,
  TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH,
  TRD2_V6_PASS2_V2_TOOLCHAIN_PATHS,
  TRD2_V6_PASS2_V2_TOOLCHAIN_REGISTRY_PATH,
  V2SchemaValidationError,
  collectActualPositiveRecords,
  inferClosedSpec,
  makeClosedSchemaRegistryV2,
  parseRequirementSource,
  validateBySpecProducer,
  validateClosedSchemaRegistryV2,
  validatePass2V2ToolchainRegistry,
  validateRecordProducer,
  validateSpecDefinition,
} from '../scripts/trd2-v6-pass2-v2-core.mjs';

function actualInputs() {
  const passOneSources = TRD2_V6_PASS1_REUSED_PATHS.map((logicalPath) => {
    const bytes = fs.readFileSync(logicalPath);
    return { bytes, logicalPath, sha256: sha256Bytes(bytes), value: JSON.parse(bytes.toString('utf8')) };
  });
  const requirementBytes = fs.readFileSync(TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH);
  return {
    observedHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    passOneSources,
    requirementSource: {
      bytes: requirementBytes,
      logicalPath: TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH,
      sha256: sha256Bytes(requirementBytes),
    },
  };
}

let memoizedRegistry;
function actualRegistry() {
  if (memoizedRegistry === undefined) {
    const inputs = actualInputs();
    memoizedRegistry = makeClosedSchemaRegistryV2({
      passOneSources: inputs.passOneSources,
      provenance: { observedHead: inputs.observedHead },
      requirementSource: inputs.requirementSource,
    });
  }
  return memoizedRegistry;
}

test('Pass 2 v2 extracts all 128 committed requirements with exactly five ordered content fields', () => {
  const bytes = fs.readFileSync(TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH);
  const requirements = parseRequirementSource(bytes);
  assert.equal(requirements.length, 128);
  const expected = ['statement', 'defectCauseImpact', 'proofPredicate', 'dependencies', 'sourceBasis'];
  requirements.forEach((requirement, index) => {
    assert.equal(requirement.record.requirementId, `TRD2V5-REQ-${String(index).padStart(3, '0')}`);
    assert.deepEqual(Object.keys(requirement.record.content), expected);
    assert.equal(requirement.binding.requirementRoot, requirement.record.requirementRoot);
    assert.equal(requirement.headingStartByte < requirement.contentStartByte, true);
    assert.equal(requirement.contentStartByte < requirement.contentEndByte, true);
    assert.equal(requirement.contentEndByte <= requirement.blockEndByte, true);
  });
});

test('Pass 2 v2 actual-positive inventory is derived from committed sources, not schema samples', () => {
  const inputs = actualInputs();
  const records = collectActualPositiveRecords(inputs);
  assert.equal(records.length, 391);
  assert.equal(new Set(records.map(({ family }) => family)).size, 25);
  assert.equal(records.filter(({ family }) => family === 'REQUIREMENT-V2').length, 128);
  assert.equal(records.filter(({ family }) => family === 'REQUIREMENT-SOURCE-BINDING-V2').length, 128);
  assert.equal(records.every(({ sourceLocator }) => sourceLocator.sourceCommit === inputs.observedHead), true);
});

test('recursive DSL closes nested objects and implements nullable and union validation', () => {
  const spec = inferClosedSpec([
    { value: { nested: null } },
    { value: { nested: 'bound' } },
  ]);
  validateSpecDefinition(spec);
  assert.equal(TRD2_V6_PASS2_V2_DSL_KINDS.includes('Object'), true);
  assert.equal(TRD2_V6_PASS2_V2_DSL_KINDS.includes('Nullable'), true);
  assert.equal(TRD2_V6_PASS2_V2_DSL_KINDS.includes('OneOf'), true);
  validateBySpecProducer({ value: { nested: null } }, spec);
  assert.throws(
    () => validateBySpecProducer({ value: { nested: null, undeclared: true } }, spec),
    (error) => error instanceof V2SchemaValidationError && error.terminal === 'UNKNOWN-FIELD',
  );
});

test('closed registry has 25 actual families, 391 positives, mutations, and no zero-positive schema', () => {
  const registry = validateClosedSchemaRegistryV2(actualRegistry());
  assert.equal(registry.schemaCount, 25);
  assert.equal(registry.actualPositiveCount, 391);
  assert.equal(registry.mutationFixtureCount > 0, true);
  assert.equal(registry.fixtureCount, registry.actualPositiveCount + registry.mutationFixtureCount);
  assert.equal(registry.schemas.every(({ actualPositiveCount }) => actualPositiveCount > 0), true);
  assert.equal(registry.selfReviewRemediation.length, 5);
});

test('actual Requirement identity passes and its recorded identity mutation blocks', () => {
  const registry = actualRegistry();
  const schema = registry.schemas.find(({ family }) => family === 'REQUIREMENT-V2');
  const positive = registry.fixtures.find(({ schemaId, fixtureClass }) => schemaId === schema.schemaId && fixtureClass === 'ACTUAL-POSITIVE');
  const mutation = registry.fixtures.find(({ schemaId, mutation: mutationName }) => schemaId === schema.schemaId && mutationName === 'CONTENT-IDENTITY-MISMATCH');
  assert.equal(validateRecordProducer(JSON.parse(Buffer.from(positive.bytesBase64, 'base64').toString('utf8')), schema), positive.expectedContentRoot);
  assert.throws(
    () => validateRecordProducer(JSON.parse(Buffer.from(mutation.bytesBase64, 'base64').toString('utf8')), schema),
    (error) => error instanceof V2SchemaValidationError && error.terminal === 'CONTENT-IDENTITY-MISMATCH',
  );
});

test('Pass 2 v2 toolchain registry predeclares exact output and source paths', () => {
  const registry = validatePass2V2ToolchainRegistry(JSON.parse(fs.readFileSync(TRD2_V6_PASS2_V2_TOOLCHAIN_REGISTRY_PATH, 'utf8')));
  assert.deepEqual(registry.passTwoV2EmittedPaths, TRD2_V6_PASS2_V2_PATHS);
  assert.deepEqual(registry.toolchainPaths, TRD2_V6_PASS2_V2_TOOLCHAIN_PATHS);
  registry.toolchainPaths.forEach((logicalPath) => assert.equal(fs.existsSync(logicalPath), true, logicalPath));
});

test('Engine A and Engine B are separate implementations and worktree guards enumerate untracked files', () => {
  const engineA = fs.readFileSync('scripts/verify-trd2-v6-canonical-v2-engine-a.mjs', 'utf8');
  const engineB = fs.readFileSync('scripts/verify-trd2-v6-canonical-v2-engine-b.py', 'utf8');
  assert.equal(engineA.includes('verify-trd2-v6-canonical-v2-engine-b'), false);
  assert.equal(engineB.includes('verify-trd2-v6-canonical-v2-engine-a.mjs'), false);
  for (const source of [
    fs.readFileSync('scripts/create-trd2-v6-pass2-v2-candidate.mjs', 'utf8'), engineA, engineB,
    fs.readFileSync('scripts/verify-trd2-v6-pass2-v2-candidate.mjs', 'utf8'),
  ]) assert.match(source, /--untracked-files=all/);
  const finalVerifier = fs.readFileSync('scripts/verify-trd2-v6-pass2-v2-candidate.mjs', 'utf8');
  assert.match(finalVerifier, /decodeJsonPointer/);
  assert.match(finalVerifier, /reconstructRequirementValue/);
  assert.match(finalVerifier, /Runtime verifier differs from frozen toolchain/);
});

test('Pass 2 v2 toolchain uses no forbidden random source', () => {
  for (const logicalPath of TRD2_V6_PASS2_V2_TOOLCHAIN_PATHS.filter((path) => path.endsWith('.mjs') || path.endsWith('.py'))) {
    const source = fs.readFileSync(logicalPath, 'utf8');
    assert.equal(source.includes('Math' + '.random('), false, logicalPath);
    assert.equal(source.includes('crypto' + '.randomUUID('), false, logicalPath);
  }
});

test('registry roots are deterministic over the same committed actual inputs', () => {
  const first = actualRegistry();
  const inputs = actualInputs();
  const second = makeClosedSchemaRegistryV2({ passOneSources: inputs.passOneSources, provenance: { observedHead: inputs.observedHead }, requirementSource: inputs.requirementSource });
  assert.equal(first.artifactRoot, second.artifactRoot);
  assert.equal(first.fixtureCollectionRoot, second.fixtureCollectionRoot);
  assert.equal(canonicalV6(first.schemas), canonicalV6(second.schemas));
});
