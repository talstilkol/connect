import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { canonicalV6 } from '../scripts/trd2-v6-core.mjs';
import {
  TRD2_V6_PASS2_V3_DSL_KINDS,
  TRD2_V6_PASS2_V3_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS2_V3_PATHS,
  TRD2_V6_PASS2_V3_TOOLCHAIN_PATHS,
  TRD2_V6_PASS2_V3_TOOLCHAIN_REGISTRY_PATH,
  V3SchemaValidationError,
  evaluateV3Fixture,
  makeClosedSchemaRegistryV3,
  validateClosedSchemaRegistryV3,
  validateOutputPathRegistryV3,
  validatePass2V3ToolchainRegistry,
  validateV3SpecDefinition,
} from '../scripts/trd2-v6-pass2-v3-core.mjs';
import { TRD2_V6_PASS2_V3_FUTURE_DEFINITIONS } from '../scripts/trd2-v6-pass2-v3-schema-catalog.mjs';

const V2_DIRECTORY = 'docs/planning/trd2-v6-candidate-v2-2026-08-31';
const read = (logicalPath) => JSON.parse(fs.readFileSync(logicalPath, 'utf8'));

let cached;
function registry() {
  if (cached === undefined) cached = makeClosedSchemaRegistryV3({
    outputRegistry: read(TRD2_V6_PASS2_V3_OUTPUT_REGISTRY_PATH),
    provenance: { testOnly: true },
    v2Registry: read(`${V2_DIRECTORY}/closed-schema-registry-v2.json`),
    v2ReportA: read(`${V2_DIRECTORY}/canonical-engine-a-report-v2.json`),
    v2ReportB: read(`${V2_DIRECTORY}/canonical-engine-b-report-v2.json`),
  });
  return cached;
}

test('Pass 2 v3 declares a complete actual and future schema universe', () => {
  const value = validateClosedSchemaRegistryV3(registry());
  assert.equal(value.schemaCount, 82);
  assert.equal(value.schemas.filter(({ familyStatus }) => familyStatus === 'ACTUAL-POSITIVE').length, 25);
  assert.equal(value.schemas.filter(({ familyStatus }) => familyStatus === 'FUTURE-CONSTRUCTION').length, 57);
  assert.equal(value.actualPositiveCount, 391);
  assert.equal(value.futureConstructionCount, 57);
  assert.equal(value.fixtureCount, 786);
  assert.equal(value.referenceEdgeCount, 25);
});

test('all 30 planned JSON outputs have an exact builtin or declared top-level schema', () => {
  const output = validateOutputPathRegistryV3(read(TRD2_V6_PASS2_V3_OUTPUT_REGISTRY_PATH));
  const value = registry();
  assert.equal(Object.keys(output.plannedTopLevelSchemas).length, 30);
  assert.equal(value.outputBindingCount, 30);
  assert.deepEqual(value.outputBindings.map(({ logicalPath }) => logicalPath).sort(), Object.keys(output.plannedTopLevelSchemas).sort());
  assert.equal(new Set(value.outputBindings.filter(({ builtin }) => builtin).map(({ schemaId }) => schemaId)).size, 2);
});

test('every future schema has one construction and the three baseline hostile mutations', () => {
  const value = registry();
  for (const definition of TRD2_V6_PASS2_V3_FUTURE_DEFINITIONS) {
    const fixtures = value.fixtures.filter(({ schemaId }) => schemaId === definition.schemaId);
    assert.equal(fixtures.filter(({ fixtureClass }) => fixtureClass === 'FUTURE-CONSTRUCTION').length, 1, definition.schemaId);
    for (const mutation of ['UNKNOWN-FIELD', 'MISSING-FIELD', 'CONTENT-IDENTITY-MISMATCH']) assert.equal(fixtures.some((fixture) => fixture.mutation === mutation), true, `${definition.schemaId}:${mutation}`);
  }
});

test('future invariant mutations block at the semantic invariant terminal', () => {
  const value = registry();
  const schemas = new Map(value.schemas.map((schema) => [schema.schemaId, schema]));
  const mutations = value.fixtures.filter(({ mutation }) => mutation.startsWith('INVARIANT-'));
  assert.equal(mutations.length, 43);
  for (const fixture of mutations) {
    const outcome = evaluateV3Fixture(fixture, schemas.get(fixture.schemaId), schemas);
    assert.equal(outcome.observedStatus, 'BLOCK');
    assert.equal(outcome.observedTerminal, 'INVARIANT-MISMATCH');
    assert.equal(outcome.matchesExpectation, true);
  }
});

test('all 391 actual positives and 124 historical mutations retain exact v2 fixture lineage', () => {
  const value = registry();
  const v2 = read(`${V2_DIRECTORY}/closed-schema-registry-v2.json`);
  const predecessor = new Map(v2.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const inherited = value.fixtures.filter(({ sourceFixtureId }) => sourceFixtureId !== null);
  assert.equal(inherited.length, 515);
  for (const fixture of inherited) {
    const source = predecessor.get(fixture.sourceFixtureId);
    assert.equal(source.fixtureRoot, fixture.sourceFixtureRoot);
    assert.equal(source.bytesBase64, fixture.bytesBase64Chunks.join(''));
    assert.equal(source.schemaId, fixture.schemaId);
  }
});

test('Ref is closed, typed, and rejects an unknown target', () => {
  assert.equal(TRD2_V6_PASS2_V3_DSL_KINDS.includes('Ref'), true);
  const ids = new Set(['KNOWN']);
  validateV3SpecDefinition({ kind: 'Ref', schemaId: 'KNOWN' }, ids);
  assert.throws(() => validateV3SpecDefinition({ kind: 'Ref', schemaId: 'UNKNOWN' }, ids), /unresolved Ref UNKNOWN/);
});

test('toolchain registry predeclares every v3 builder, engine, verifier, and test', () => {
  const value = validatePass2V3ToolchainRegistry(read(TRD2_V6_PASS2_V3_TOOLCHAIN_REGISTRY_PATH));
  assert.deepEqual(value.passTwoV3EmittedPaths, TRD2_V6_PASS2_V3_PATHS);
  assert.deepEqual(value.toolchainPaths, TRD2_V6_PASS2_V3_TOOLCHAIN_PATHS);
  value.toolchainPaths.forEach((logicalPath) => assert.equal(fs.existsSync(logicalPath), true, logicalPath));
});

test('dual engines are separate, enumerate untracked files, and final verifier resolves primary sources', () => {
  const engineA = fs.readFileSync('scripts/verify-trd2-v6-canonical-v3-engine-a.mjs', 'utf8');
  const engineB = fs.readFileSync('scripts/verify-trd2-v6-canonical-v3-engine-b.py', 'utf8');
  const finalVerifier = fs.readFileSync('scripts/verify-trd2-v6-pass2-v3-candidate.mjs', 'utf8');
  assert.equal(engineA.includes('verify-trd2-v6-canonical-v3-engine-b'), false);
  assert.equal(engineB.includes('verify-trd2-v6-canonical-v3-engine-a'), false);
  for (const source of [engineA, engineB, finalVerifier, fs.readFileSync('scripts/create-trd2-v6-pass2-v3-candidate.mjs', 'utf8')]) assert.match(source, /--untracked-files=all/);
  assert.match(finalVerifier, /decodeJsonPointer/);
  assert.match(finalVerifier, /reconstructRequirement/);
  assert.match(finalVerifier, /runtime differs from frozen v3 toolchain/);
});

test('v3 toolchain uses no forbidden random source', () => {
  for (const logicalPath of TRD2_V6_PASS2_V3_TOOLCHAIN_PATHS.filter((path) => path.endsWith('.mjs') || path.endsWith('.py'))) {
    const source = fs.readFileSync(logicalPath, 'utf8');
    assert.equal(source.includes('Math' + '.random('), false, logicalPath);
    assert.equal(source.includes('crypto' + '.randomUUID('), false, logicalPath);
  }
});

test('v3 registry construction is deterministic for identical bounded inputs', () => {
  const first = registry();
  const second = makeClosedSchemaRegistryV3({
    outputRegistry: read(TRD2_V6_PASS2_V3_OUTPUT_REGISTRY_PATH),
    provenance: { testOnly: true },
    v2Registry: read(`${V2_DIRECTORY}/closed-schema-registry-v2.json`),
    v2ReportA: read(`${V2_DIRECTORY}/canonical-engine-a-report-v2.json`),
    v2ReportB: read(`${V2_DIRECTORY}/canonical-engine-b-report-v2.json`),
  });
  assert.equal(first.artifactRoot, second.artifactRoot);
  assert.equal(first.fixtureCollectionRoot, second.fixtureCollectionRoot);
  assert.equal(canonicalV6(first.schemas), canonicalV6(second.schemas));
});

test('baseline future mutations expose closed-field and identity terminals', () => {
  const value = registry();
  const schemas = new Map(value.schemas.map((schema) => [schema.schemaId, schema]));
  const subjectId = 'CONNECT-TRD2-V6-SUBJECT-V3-SCHEMA';
  const fixtures = value.fixtures.filter((fixture) => fixture.schemaId === subjectId && ['UNKNOWN-FIELD', 'MISSING-FIELD', 'CONTENT-IDENTITY-MISMATCH'].includes(fixture.mutation));
  assert.equal(fixtures.length, 3);
  for (const fixture of fixtures) {
    const outcome = evaluateV3Fixture(fixture, schemas.get(subjectId), schemas);
    assert.equal(outcome.matchesExpectation, true);
    assert.throws(() => { throw new V3SchemaValidationError(outcome.observedTerminal, 'expected'); }, (error) => error.terminal === outcome.observedTerminal);
  }
});
