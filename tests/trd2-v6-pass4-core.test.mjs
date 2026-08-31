import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { canonicalV6, rootV6, sha256Bytes } from '../scripts/trd2-v6-core.mjs';
import {
  TRD2_V6_PASS3_V2_INPUT_PATHS,
  buildPass3V2Artifacts,
} from '../scripts/trd2-v6-pass3-v2-core.mjs';
import {
  TRD2_V6_PASS4_INPUT_PATHS,
  TRD2_V6_PASS4_TOOLCHAIN_PATHS,
  buildInvalidationBlueprint,
  buildPass4Graph,
  deriveExpectedFamilies,
  evaluatePass4Mutations,
  pass4Outcome,
  validateCausalGraph,
  validateOverlayPrerequisites,
} from '../scripts/trd2-v6-pass4-core.mjs';

function git(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 512 * 1024 * 1024 });
  assert.equal(result.status, 0, String(result.stderr));
  return result.stdout;
}

function read(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

let cached;
function fixture() {
  if (cached !== undefined) return cached;
  const observedHead = git(['rev-parse', 'HEAD']).trim();
  const row = (logicalPath) => {
    const bytes = fs.readFileSync(logicalPath);
    return { byteLength: bytes.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(bytes) };
  };
  const registry = read(TRD2_V6_PASS4_INPUT_PATHS[0]);
  const sourceCapture = read(TRD2_V6_PASS4_INPUT_PATHS[4]);
  const parserCorpus = read(TRD2_V6_PASS4_INPUT_PATHS[5]);
  const contract = read(TRD2_V6_PASS4_INPUT_PATHS[6]);
  const pass3 = buildPass3V2Artifacts({ contract, inputRows: TRD2_V6_PASS3_V2_INPUT_PATHS.map(row), observedHead, parserCorpus, registry, sourceCapture });
  const toolRows = TRD2_V6_PASS4_TOOLCHAIN_PATHS.map(row);
  const toolchainRoot = rootV6('TRD2V6-PASS4-TEST-TOOLCHAIN', 'CONNECT-TRD2-V6-PASS4-TEST-TOOLCHAIN-V1', toolRows);
  const graph = buildPass4Graph({
    clause: read(TRD2_V6_PASS4_INPUT_PATHS[2]),
    contract,
    observedHead,
    outputRegistry: read(TRD2_V6_PASS4_INPUT_PATHS[7]),
    parserCorpus,
    registry,
    sourceCapture,
    state: read(TRD2_V6_PASS4_INPUT_PATHS[3]),
    subject: read(TRD2_V6_PASS4_INPUT_PATHS[1]),
    toolchainRoot,
    virtualClauseNodes: pass3.clauseNodes,
    virtualObligations: pass3.obligations,
  });
  cached = { graph, registry };
  return cached;
}

test('Pass 4 derives every expected family from the frozen schema registry', () => {
  const { graph, registry } = fixture();
  const expected = deriveExpectedFamilies(registry);
  assert.equal(expected.length, 82);
  assert.deepEqual(graph.expectedFamilies, expected);
  assert.deepEqual(graph.omittedFamilies, []);
  assert.equal(new Set(graph.nodes.map(({ family }) => family)).size, expected.length);
});

test('Pass 4 graph covers exact Requirements, clauses, fixtures, vectors and transitions', () => {
  const { graph } = fixture();
  const count = (prefix) => graph.nodes.filter(({ nodeKey }) => nodeKey.startsWith(prefix)).length;
  assert.equal(count('REQUIREMENT::'), 128);
  assert.equal(count('PROGRAM::'), 128);
  assert.equal(count('CLAUSE::'), 492);
  assert.equal(count('COUNTEREXAMPLE::'), 492);
  assert.equal(count('VECTOR::'), 640);
  assert.equal(count('SCHEMA-FIXTURE::'), 789);
  assert.equal(count('PARSER-FIXTURE::'), 18);
  assert.equal(count('TRANSITION::'), 3554);
});

test('Pass 4 graph has no dangling edge, duplicate identity or prohibited causal cycle', () => {
  const { graph, registry } = fixture();
  const result = validateCausalGraph(graph, registry);
  assert.equal(result.producedCount, result.reachableProducedCount);
  assert.equal(new Set(graph.nodes.map(({ recordRoot }) => recordRoot)).size, graph.nodeCount);
  assert.equal(new Set(graph.edges.map(({ recordRoot }) => recordRoot)).size, graph.edgeCount);
});

test('Pass 4 invalidation maps dependencies only to the successor head', () => {
  const { graph, registry } = fixture();
  const pre = graph.nodes.find(({ nodeKey }) => nodeKey === 'DECLARED-HEAD::PRE-REVIEW');
  const successor = graph.nodes.find(({ nodeKey }) => nodeKey === 'DECLARED-HEAD::SUCCESSOR');
  const invalidations = graph.edges.filter(({ edgeType }) => edgeType === 'INVALIDATES');
  assert.ok(invalidations.length > 0);
  assert.ok(invalidations.every(({ toNodeRoot }) => toNodeRoot === successor.recordRoot));
  assert.ok(invalidations.every(({ toNodeRoot }) => toNodeRoot !== pre.recordRoot));
  const blueprint = buildInvalidationBlueprint(graph, registry);
  assert.ok(blueprint.dependencyRoots.length > 0);
  assert.equal(blueprint.excludedSelfHeadRole, 'PRE-REVIEW-HEAD');
});

test('Pass 4 blocks all nine graph mutations at their exact terminals', () => {
  const { graph, registry } = fixture();
  const outcomes = evaluatePass4Mutations(graph, registry);
  assert.equal(outcomes.length, 9);
  assert.ok(outcomes.every(({ result }) => result === 'BLOCKED'));
  assert.equal(new Set(outcomes.map(({ terminal }) => terminal)).size, 9);
});

test('Pass 4 refuses to fabricate the deferred overlay', () => {
  assert.deepEqual(validateOverlayPrerequisites({}), {
    missing: ['bindingRoot', 'graphRoot', 'packetRoot', 'preReviewHead', 'schemaRegistryRoot', 'subjectRoot', 'successorHead', 'vectorCorpusRoot'],
    status: 'BLOCKED',
    terminal: 'ROOT-OVERLAY-PREREQUISITES-MISSING',
  });
  const same = 'a'.repeat(64);
  assert.throws(() => validateOverlayPrerequisites({ bindingRoot: same, graphRoot: same, packetRoot: same, preReviewHead: same, schemaRegistryRoot: same, subjectRoot: same, successorHead: same, vectorCorpusRoot: same }), /pre-review and successor heads must differ/);
});

test('Pass 4 outcome is deterministic and grants zero implied Acceptance', () => {
  const { graph, registry } = fixture();
  const first = pass4Outcome(graph, registry);
  const second = pass4Outcome(structuredClone(graph), registry);
  assert.equal(canonicalV6(first), canonicalV6(second));
  assert.match(first.outcomeRoot, /^[0-9a-f]{64}$/);
  assert.equal(graph.nodes.filter(({ producerMode, status }) => producerMode === 'EXTERNAL' && status === 'PRODUCED').length, 0);
});
