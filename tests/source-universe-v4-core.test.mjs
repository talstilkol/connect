import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  contentRoot,
} from '../scripts/b0-v8-core.mjs';
import {
  SOURCE_UNIVERSE_V4_FINDINGS,
  SOURCE_UNIVERSE_V4_TOOLCHAIN_PATHS,
  SOURCE_UNIVERSE_V4_TOOLCHAIN_REGISTRY_PATH,
  evaluateLocalControls,
  expectedMutationIdentities,
  makeByteDeletionMutationVector,
  makeControlRegistry,
  makeFindingControls,
  makeLifecycleContracts,
  makePublicContracts,
  makeReaderChecks,
  scanSourceReferenceOccurrences,
  validateControlRegistry,
  validateControlledGeneration,
  validateDependencyGraph,
  validateFindingControls,
  validateGraphPair,
  validateLifecycleContracts,
  validatePublicContracts,
  validateReaderReport,
  validateSourceUniverseOutputRegistry,
  validateToolchainPathRegistry,
  verificationRoot,
} from '../scripts/source-universe-v4-core.mjs';

function makeGraph(pairs) {
  const nodeIds = [...new Set(pairs.flat())].sort();
  const nodes = nodeIds.map((nodeId, index) => ({ nodeId, ordinal: index + 1 }));
  const edges = pairs.map(([from, to], index) => ({
    edgeId: `TEST-EDGE-${String(index + 1).padStart(3, '0')}`,
    edgeType: 'REQUIRES',
    from,
    to,
  }));
  return {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-TEST-GRAPH',
    cycleCount: 0,
    edgeCount: edges.length,
    edges,
    graphRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-DEPENDENCY-GRAPH-V1', { edges, nodes }),
    hiddenEdgeCount: 0,
    nodeCount: nodes.length,
    nodes,
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-DEPENDENCY-GRAPH-V1',
    selfEdgeCount: 0,
    unknownNodeCount: 0,
  };
}

function baseControlInput() {
  const pairs = [
    ['BOOTSTRAP-TYPES', 'ADMISSION'],
    ['BOOTSTRAP-TYPES', 'LIFECYCLE'],
    ['BOOTSTRAP-TYPES', 'PUBLIC-POLICY'],
    ['PUBLIC-POLICY', 'PUBLIC-PROJECTION'],
  ];
  const explicitGraph = makeGraph(pairs);
  const semanticGraph = structuredClone(explicitGraph);
  semanticGraph.artifactId = 'CONNECT-SOURCE-UNIVERSE-V4-TEST-SEMANTIC-GRAPH';
  return {
    conformanceCorpus: { passCount: 24, vectorCount: 24 },
    controlRegistry: makeControlRegistry(),
    controlledGeneration: {
      acceptanceCandidate: null,
      artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-TEST-GENERATION',
      generationA: { observedHead: '0000000000000000000000000000000000000000' },
      generationB: null,
      schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-CONTROLLED-GENERATION-V1',
      status: 'BLOCKED-PENDING-GENERATION-B',
      terminal: 'STALE-GENERATION-BLOCKED',
    },
    explicitGraph,
    findingCrosswalk: { closureCount: 0 },
    lifecycleContracts: makeLifecycleContracts(),
    mutationCorpus: { blockedCount: 102, vectorCount: 102 },
    noRandomSourcesPass: true,
    objectRegistry: { dualClassCount: 0, missingProducerCount: 0, semanticAtomicityViolationCount: 0 },
    occurrenceLedgerPass: true,
    preservationCrosswalk: { fullLocalCount: 78, rowCount: 78 },
    publicContracts: makePublicContracts(),
    semanticGraph,
    targetSpanLedgerPass: true,
  };
}

test('finding controls preserve all 24 identities and 12/12 severity split', () => {
  const controls = makeFindingControls();
  assert.equal(validateFindingControls(controls), true);
  assert.deepEqual(
    controls.map(({ findingId }) => findingId),
    SOURCE_UNIVERSE_V4_FINDINGS.map(([findingId]) => findingId),
  );
  assert.equal(controls.filter(({ severity }) => severity === 'P0').length, 12);
  assert.equal(controls.filter(({ severity }) => severity === 'P1').length, 12);
  assert.equal(controls.filter(({ closureStatus }) => closureStatus.startsWith('OPEN')).length, 24);
});

test('actual output registry freezes 23 package and 5 review paths', () => {
  const registry = JSON.parse(fs.readFileSync('docs/planning/source-universe-v4-output-path-registry-v1-2026-08-30.json', 'utf8'));
  assert.equal(validateSourceUniverseOutputRegistry(registry), true);
  assert.equal(registry.packageMemberPaths.length, 23);
  assert.equal(registry.reviewAndAcceptancePaths.length, 5);
});

test('toolchain registry closes every local runtime dependency and command surface', () => {
  const registry = JSON.parse(
    fs.readFileSync(SOURCE_UNIVERSE_V4_TOOLCHAIN_REGISTRY_PATH, 'utf8'),
  );
  assert.equal(validateToolchainPathRegistry(registry), true);
  assert.deepEqual(registry.toolchainPaths, SOURCE_UNIVERSE_V4_TOOLCHAIN_PATHS);
  for (const requiredPath of [
    'scripts/b0-v8-core.mjs',
    'scripts/verify-secret-hygiene.mjs',
    'scripts/source-universe-v4-core.mjs',
    'package.json',
  ]) assert.equal(registry.toolchainPaths.includes(requiredPath), true);
  const weakened = structuredClone(registry);
  weakened.toolchainPaths.splice(1, 1);
  assert.throws(() => validateToolchainPathRegistry(weakened));
});

test('every v4 worktree guard enumerates files inside untracked directories', () => {
  for (const path of [
    'scripts/create-source-universe-v4-candidate.mjs',
    'scripts/verify-source-universe-v4-reader-a.mjs',
    'scripts/verify-source-universe-v4-reader-b.py',
    'scripts/finalize-source-universe-v4-candidate.mjs',
    'scripts/verify-source-universe-v4-candidate.mjs',
  ]) {
    const source = fs.readFileSync(path, 'utf8');
    assert.match(
      source,
      /--untracked-files=all/,
      `${path} may collapse an untracked output directory`,
    );
  }
});

test('Reader reports bind the exact toolchain root', () => {
  const checks = makeReaderChecks();
  const report = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-TEST-READER',
    checks,
    limitations: ['PRODUCER-CONTROLLED-READER-NOT-INDEPENDENT-REVIEW'],
    normativeMemberCount: 19,
    observedHead: '0'.repeat(40),
    readerId: 'READER-A',
    readerImplementation: 'NODE-STDLIB',
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-READER-REPORT-V1',
    status: 'PASS-LOCAL-CANDIDATE-NOT-ACCEPTED',
    toolchainRoot: '0'.repeat(64),
    verificationRoot: verificationRoot(checks),
  };
  assert.equal(validateReaderReport(report), true);
  const weakened = structuredClone(report);
  delete weakened.toolchainRoot;
  assert.throws(() => validateReaderReport(weakened));
});

test('mutation identity denominator is exact 26 plus 20 plus 32 plus 24', () => {
  const identities = expectedMutationIdentities();
  assert.equal(identities.length, 102);
  assert.equal(new Set(identities.map(({ sourceIdentity }) => sourceIdentity)).size, 102);
  assert.deepEqual(
    Object.fromEntries([...new Set(identities.map(({ category }) => category))].sort().map((category) => [category, identities.filter((row) => row.category === category).length])),
    {
      'V1-REVIEW-FINDING': 32,
      'V2-REQUIREMENT': 26,
      'V2-REVIEW-FINDING': 20,
      'V3-REVIEW-FINDING': 24,
    },
  );
});

test('literal source occurrences retain distinct byte identities', () => {
  const bytes = Buffer.from('{"a":"SRC-CHARTER-V2#WHOLE-FILE","b":"SRC-CHARTER-V2#WHOLE-FILE"}\n', 'utf8');
  const rows = scanSourceReferenceOccurrences(bytes);
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].occurrenceId, rows[1].occurrenceId);
  assert.equal(rows[0].token, rows[1].token);
  assert.notEqual(rows[0].startByte, rows[1].startByte);
});

test('byte deletion vector binds exact preimage and postimage', () => {
  const sourceBytes = Buffer.from('abcdef', 'utf8');
  const vector = makeByteDeletionMutationVector({
    category: 'V2-REQUIREMENT',
    endByte: 4,
    path: 'docs/planning/source.md',
    sourceBytes,
    sourceCommit: '0000000000000000000000000000000000000000',
    sourceIdentity: 'SURS-001',
    startByte: 2,
    unaffectedSet: ['SURS-002'],
  });
  assert.equal(vector.delta.operation, 'DELETE-EXACT-BYTE');
  assert.equal(vector.delta.deleteByteCount, 1);
  assert.deepEqual(vector.affectedSet, ['SURS-001']);
  assert.deepEqual(vector.unaffectedSet, ['SURS-002']);
  assert.notEqual(vector.preimageSha256, vector.postimageSha256);
});

test('dependency graph rejects executable cycles and graph-pair drift', () => {
  const valid = makeGraph([
    ['BOOTSTRAP-TYPES', 'ADMISSION'],
    ['ADMISSION', 'PUBLIC-PROJECTION'],
  ]);
  assert.equal(validateDependencyGraph(valid), true);
  const cyclic = makeGraph([
    ['BOOTSTRAP-TYPES', 'ADMISSION'],
    ['ADMISSION', 'BOOTSTRAP-TYPES'],
  ]);
  assert.throws(() => validateDependencyGraph(cyclic));
  const drift = makeGraph([
    ['BOOTSTRAP-TYPES', 'ADMISSION'],
    ['BOOTSTRAP-TYPES', 'PUBLIC-PROJECTION'],
  ]);
  assert.throws(() => validateGraphPair(valid, drift));
});

test('control, public and lifecycle registries remain fail closed', () => {
  assert.equal(validateControlRegistry(makeControlRegistry()), true);
  assert.equal(validatePublicContracts(makePublicContracts()), true);
  assert.equal(validateLifecycleContracts(makeLifecycleContracts()), true);
  const generation = baseControlInput().controlledGeneration;
  assert.equal(validateControlledGeneration(generation), true);
  const unsafe = structuredClone(makePublicContracts());
  unsafe.opaqueProjection.publicOpaqueProjectionEnabled = true;
  assert.throws(() => validatePublicContracts(unsafe));
});

test('all 24 local controls pass only in the fail-closed base state', () => {
  const rows = evaluateLocalControls(baseControlInput());
  assert.equal(rows.length, 24);
  assert.equal(rows.filter(({ result }) => result === 'PASS').length, 24);
});

test('one deterministic weakening blocks each of the 24 controls', () => {
  const mutations = [
    (value) => { value.occurrenceLedgerPass = false; },
    (value) => { value.targetSpanLedgerPass = false; },
    (value) => { value.objectRegistry.dualClassCount = 1; },
    (value) => { value.publicContracts.policy.policyPrecedesAllPublicAdjacentWrites = false; },
    (value) => { value.explicitGraph = makeGraph([['BOOTSTRAP-TYPES', 'PUBLIC-POLICY'], ['PUBLIC-POLICY', 'PUBLIC-PROJECTION']]); value.semanticGraph = structuredClone(value.explicitGraph); },
    (value) => { value.explicitGraph = makeGraph([['BOOTSTRAP-TYPES', 'ADMISSION'], ['PUBLIC-POLICY', 'PUBLIC-PROJECTION']]); value.semanticGraph = structuredClone(value.explicitGraph); },
    (value) => { value.conformanceCorpus.passCount = 23; },
    (value) => { value.mutationCorpus.blockedCount = 101; },
    (value) => { value.controlledGeneration.status = 'PASS'; },
    (value) => { value.controlRegistry.terminals.pop(); },
    (value) => { value.preservationCrosswalk.fullLocalCount = 77; },
    (value) => { value.controlRegistry.admission.selectorMayReviewOwnAdmission = true; },
    (value) => { value.noRandomSourcesPass = false; },
    (value) => { value.publicContracts.detector.publicWritesEnabled = true; },
    (value) => { value.publicContracts.opaqueProjection.publicOpaqueProjectionEnabled = true; },
    (value) => { value.publicContracts.egress.unknownSinkAction = 'ALLOW'; },
    (value) => { value.controlRegistry.authorityEventMatrix.missingEffectCount = 1; },
    (value) => { value.controlRegistry.providerRuntime.admissionEnabled = true; },
    (value) => { value.controlRegistry.dynamicSources.unknownPartitionAction = 'ALLOW'; },
    (value) => { value.lifecycleContracts.erasureRequiresEveryCopyClass.pop(); },
    (value) => { value.controlRegistry.authoritativeFields.triggerFieldIds.pop(); },
    (value) => { value.controlRegistry.independenceRelations.closed = false; },
    (value) => { value.objectRegistry.semanticAtomicityViolationCount = 1; },
    (value) => { value.findingCrosswalk.closureCount = 1; },
  ];
  assert.equal(mutations.length, 24);
  mutations.forEach((mutate, index) => {
    const value = baseControlInput();
    mutate(value);
    const rows = evaluateLocalControls(value);
    assert.equal(rows[index].result, 'BLOCK', `mutation ${index + 1} did not block its control`);
  });
});
