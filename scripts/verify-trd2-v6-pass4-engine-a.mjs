#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { attachContentIdentity, canonicalV6, prettyV6, rootV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  PASS4_MUTATION_EXPECTATIONS,
  TRD2_V6_PASS4_INPUT_PATHS,
  TRD2_V6_PASS4_OUTPUTS,
  createPass4Mutations,
} from './trd2-v6-pass4-core.mjs';

const [GRAPH_PATH, REPORT_PATH] = TRD2_V6_PASS4_OUTPUTS;
const SCRIPT_PATH = 'scripts/verify-trd2-v6-pass4-engine-a.mjs';
const NODE_KEYS = ['boundRoot', 'family', 'nodeKey', 'producerMode', 'recordId', 'recordKind', 'recordRoot', 'schemaVersion', 'status'];
const EDGE_KEYS = ['edgeKey', 'edgeType', 'fromNodeRoot', 'qualifier', 'recordId', 'recordKind', 'recordRoot', 'schemaVersion', 'toNodeRoot'];
const GRAPH_KEYS = ['artifactId', 'artifactRoot', 'edgeCollectionRoot', 'edgeCount', 'edges', 'expectedFamilies', 'expectedFamilyCount', 'nodeCollectionRoot', 'nodeCount', 'nodes', 'omittedFamilies', 'recordKind', 'schemaVersion', 'typedGraphRoot', 'umbrellaEdgesCountTowardCausality'];
const EDGE_TYPES = new Set(['PRODUCES', 'CONSUMES', 'INVALIDATES', 'FAILS-TO', 'BLOCKS-AT', 'SUPERSEDES', 'BINDS-EXACTLY']);

const utf8Compare = (left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
const sorted = (values) => [...values].sort(utf8Compare);

class EngineAError extends Error {
  constructor(terminal, message) {
    super(message);
    this.terminal = terminal;
  }
}

function fail(terminal, message) {
  throw new EngineAError(terminal, message);
}

function check(condition, terminal, message) {
  if (!condition) fail(terminal, message);
}

function exactKeys(value, keys, terminal) {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), terminal, 'object required');
  check(canonicalV6(sorted(Object.keys(value))) === canonicalV6(sorted(keys)), terminal, 'exact keys mismatch');
}

function identityRoot(record, typeTag, schemaVersion) {
  return rootV6(typeTag, schemaVersion, Object.fromEntries(Object.entries(record).filter(([key]) => !['recordId', 'recordRoot', 'artifactId', 'artifactRoot'].includes(key))));
}

function validateNode(node) {
  exactKeys(node, NODE_KEYS, 'GRAPH-NODE-IDENTITY-MISMATCH');
  const root = identityRoot(node, 'GRAPH-NODE-V3', 'CONNECT-TRD2-V6-GRAPH-NODE-V3');
  check(node.recordRoot === root && node.recordId === `TRD2V6-GRAPH-NODE-V3-${root}`, 'GRAPH-NODE-IDENTITY-MISMATCH', node.nodeKey);
  check(/^[0-9a-f]{64}$/.test(node.boundRoot) && typeof node.family === 'string' && node.family.length > 0 && typeof node.nodeKey === 'string' && node.nodeKey.length > 0, 'GRAPH-NODE-IDENTITY-MISMATCH', node.nodeKey);
  check(['SOLE', 'EXTERNAL', 'COLLECTION'].includes(node.producerMode) && ['DECLARED', 'PRODUCED', 'BLOCKED', 'INVALIDATED'].includes(node.status), 'GRAPH-NODE-IDENTITY-MISMATCH', node.nodeKey);
}

function validateEdge(edge) {
  exactKeys(edge, EDGE_KEYS, 'GRAPH-EDGE-IDENTITY-MISMATCH');
  const root = identityRoot(edge, 'GRAPH-EDGE-V3', 'CONNECT-TRD2-V6-GRAPH-EDGE-V3');
  check(edge.recordRoot === root && edge.recordId === `TRD2V6-GRAPH-EDGE-V3-${root}`, 'GRAPH-EDGE-IDENTITY-MISMATCH', edge.edgeKey);
  check(EDGE_TYPES.has(edge.edgeType) && edge.fromNodeRoot !== edge.toNodeRoot, 'GRAPH-EDGE-IDENTITY-MISMATCH', edge.edgeKey);
  check(edge.edgeKey === `${edge.edgeType}::${edge.fromNodeRoot}::${edge.toNodeRoot}::${edge.qualifier}`, 'GRAPH-EDGE-IDENTITY-MISMATCH', edge.edgeKey);
}

function validateDag(nodes, edges) {
  const adjacent = new Map(nodes.map(({ recordRoot }) => [recordRoot, []]));
  const indegree = new Map(nodes.map(({ recordRoot }) => [recordRoot, 0]));
  for (const edge of edges.filter(({ edgeType }) => edgeType !== 'INVALIDATES')) {
    adjacent.get(edge.fromNodeRoot).push(edge.toNodeRoot);
    indegree.set(edge.toNodeRoot, indegree.get(edge.toNodeRoot) + 1);
  }
  const queue = sorted([...indegree].filter(([, count]) => count === 0).map(([root]) => root));
  let count = 0;
  while (queue.length > 0) {
    const root = queue.shift();
    count += 1;
    for (const next of adjacent.get(root)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) {
        queue.push(next);
        queue.sort(utf8Compare);
      }
    }
  }
  check(count === nodes.length, 'GRAPH-PROHIBITED-CYCLE', `${count}/${nodes.length}`);
}

function reachability(nodes, edges) {
  const anchors = nodes.filter(({ nodeKey }) => nodeKey.startsWith('SCHEMA::')).map(({ recordRoot }) => recordRoot);
  const adjacent = new Map(nodes.map(({ recordRoot }) => [recordRoot, []]));
  for (const edge of edges.filter(({ edgeType }) => edgeType !== 'INVALIDATES')) adjacent.get(edge.fromNodeRoot).push(edge.toNodeRoot);
  const reached = new Set(anchors);
  const queue = [...anchors];
  while (queue.length > 0) {
    const root = queue.shift();
    for (const next of adjacent.get(root)) if (!reached.has(next)) {
      reached.add(next);
      queue.push(next);
    }
  }
  const produced = nodes.filter(({ status }) => status === 'PRODUCED');
  const missing = produced.find(({ recordRoot }) => !reached.has(recordRoot));
  check(missing === undefined, 'GRAPH-PRODUCED-NODE-UNREACHABLE', missing?.nodeKey ?? 'unknown');
  return produced.length;
}

function validateGraph(graph, registry) {
  exactKeys(graph, GRAPH_KEYS, 'GRAPH-ARTIFACT-IDENTITY-MISMATCH');
  graph.nodes.forEach(validateNode);
  const nodeKeys = graph.nodes.map(({ nodeKey }) => nodeKey);
  const nodeRoots = graph.nodes.map(({ recordRoot }) => recordRoot);
  check(new Set(nodeKeys).size === nodeKeys.length && new Set(nodeRoots).size === nodeRoots.length, 'GRAPH-DUPLICATE-NODE', 'duplicate node');
  const expectedFamilies = sorted(new Set(registry.schemas.map(({ family }) => family)));
  const actualFamilies = sorted(new Set(graph.nodes.map(({ family }) => family)));
  const omitted = expectedFamilies.filter((family) => !actualFamilies.includes(family));
  const unexpected = actualFamilies.filter((family) => !expectedFamilies.includes(family));
  check(omitted.length === 0, 'GRAPH-MANDATORY-FAMILY-OMITTED', omitted[0]);
  check(unexpected.length === 0, 'GRAPH-UNEXPECTED-FAMILY', unexpected[0]);
  check(canonicalV6(graph.expectedFamilies) === canonicalV6(expectedFamilies) && graph.expectedFamilyCount === expectedFamilies.length && graph.omittedFamilies.length === 0, 'GRAPH-FAMILY-DECLARATION-MISMATCH', 'family declaration');
  const falseExternal = graph.nodes.find(({ producerMode, status }) => producerMode === 'EXTERNAL' && status === 'PRODUCED');
  check(falseExternal === undefined, 'GRAPH-FALSE-PRODUCER-CLAIM', falseExternal?.nodeKey ?? 'unknown');

  graph.edges.forEach(validateEdge);
  const edgeKeys = graph.edges.map(({ edgeKey }) => edgeKey);
  const edgeRoots = graph.edges.map(({ recordRoot }) => recordRoot);
  check(new Set(edgeKeys).size === edgeKeys.length && new Set(edgeRoots).size === edgeRoots.length, 'GRAPH-DUPLICATE-EDGE', 'duplicate edge');
  const nodeSet = new Set(nodeRoots);
  for (const edge of graph.edges) check(nodeSet.has(edge.fromNodeRoot) && nodeSet.has(edge.toNodeRoot), 'GRAPH-DANGLING-EDGE', edge.edgeKey);
  const orderedNodeRoots = [...graph.nodes].sort((left, right) => utf8Compare(left.nodeKey, right.nodeKey)).map(({ recordRoot }) => recordRoot);
  const orderedEdgeRoots = [...graph.edges].sort((left, right) => utf8Compare(left.edgeKey, right.edgeKey)).map(({ recordRoot }) => recordRoot);
  check(graph.nodeCount === graph.nodes.length && graph.edgeCount === graph.edges.length, 'GRAPH-COUNT-MISMATCH', 'counts');
  check(graph.nodeCollectionRoot === rootV6('TRD2V6-GRAPH-NODE-COLLECTION-V3', 'CONNECT-TRD2-V6-GRAPH-NODE-COLLECTION-V3', orderedNodeRoots), 'GRAPH-NODE-COLLECTION-ROOT-MISMATCH', 'nodes root');
  check(graph.edgeCollectionRoot === rootV6('TRD2V6-GRAPH-EDGE-COLLECTION-V3', 'CONNECT-TRD2-V6-GRAPH-EDGE-COLLECTION-V3', orderedEdgeRoots), 'GRAPH-EDGE-COLLECTION-ROOT-MISMATCH', 'edges root');
  check(graph.typedGraphRoot === rootV6('TRD2V6-TYPED-CAUSAL-GRAPH-V3', 'CONNECT-TRD2-V6-TYPED-CAUSAL-GRAPH-V3', { edgeRoots: orderedEdgeRoots, expectedFamilies, nodeRoots: orderedNodeRoots }), 'GRAPH-TYPED-ROOT-MISMATCH', 'typed root');
  const artifactRoot = rootV6('CAUSAL-GRAPH-V3', 'CONNECT-TRD2-V6-CAUSAL-GRAPH-V3', Object.fromEntries(Object.entries(graph).filter(([key]) => !['artifactId', 'artifactRoot'].includes(key))));
  check(graph.artifactRoot === artifactRoot && graph.artifactId === `TRD2V6-CAUSAL-GRAPH-V3-${artifactRoot}`, 'GRAPH-ARTIFACT-IDENTITY-MISMATCH', 'graph identity');
  check(graph.umbrellaEdgesCountTowardCausality === false, 'GRAPH-UMBRELLA-POLICY-MISMATCH', 'umbrella policy');
  validateDag(graph.nodes, graph.edges);
  const producedCount = reachability(graph.nodes, graph.edges);
  const acceptance = graph.nodes.find(({ nodeKey }) => nodeKey === 'EXTERNAL::DEFINITION-ACCEPTANCE-V3');
  check(acceptance !== undefined && graph.edges.some(({ edgeType, toNodeRoot }) => edgeType !== 'INVALIDATES' && toNodeRoot === acceptance.recordRoot), 'GRAPH-ACCEPTANCE-PATH-MISSING', 'acceptance path');
  const preHead = graph.nodes.find(({ nodeKey }) => nodeKey === 'DECLARED-HEAD::PRE-REVIEW');
  const successorHead = graph.nodes.find(({ nodeKey }) => nodeKey === 'DECLARED-HEAD::SUCCESSOR');
  check(preHead !== undefined && successorHead !== undefined && preHead.recordRoot !== successorHead.recordRoot, 'GRAPH-HEAD-SEPARATION-MISSING', 'head separation');
  check(!graph.edges.some(({ edgeType, toNodeRoot }) => edgeType === 'INVALIDATES' && toNodeRoot === preHead.recordRoot), 'GRAPH-SELF-INVALIDATION', 'pre-head invalidation');
  const invalidationEdgeCount = graph.edges.filter(({ edgeType, toNodeRoot }) => edgeType === 'INVALIDATES' && toNodeRoot === successorHead.recordRoot).length;
  check(invalidationEdgeCount > 0, 'GRAPH-INVALIDATION-MAP-MISSING', 'invalidation map');
  return { invalidationEdgeCount, producedCount };
}

function evaluateMutations(graph, registry) {
  const outcomes = [];
  for (const { expectedTerminal, graph: mutation, mutation: name } of createPass4Mutations(graph, registry)) {
    let terminal = 'ACCEPT';
    try {
      validateGraph(mutation, registry);
    } catch (error) {
      if (!(error instanceof EngineAError)) throw error;
      terminal = error.terminal;
    }
    check(terminal === expectedTerminal, 'GRAPH-MUTATION-TERMINAL-MISMATCH', `${name}:${terminal}/${expectedTerminal}`);
    outcomes.push({ mutation: name, result: 'BLOCKED', terminal });
  }
  return outcomes;
}

function buildReport(graph, registry) {
  const validation = validateGraph(graph, registry);
  const mutationOutcomes = evaluateMutations(graph, registry);
  const body = {
    edgeCount: graph.edgeCount,
    expectedFamiliesRoot: rootV6('TRD2V6-PASS4-EXPECTED-FAMILY-SET', 'CONNECT-TRD2-V6-PASS4-EXPECTED-FAMILY-SET-V1', graph.expectedFamilies),
    graphRoot: graph.artifactRoot,
    invalidationEdgeCount: validation.invalidationEdgeCount,
    mutationOutcomes,
    nodeCount: graph.nodeCount,
    producedNodeCount: validation.producedCount,
    reachableProducedCount: validation.producedCount,
    typedGraphRoot: graph.typedGraphRoot,
  };
  const outcomeRoot = rootV6('TRD2V6-PASS4-GRAPH-OUTCOME', 'CONNECT-TRD2-V6-PASS4-GRAPH-OUTCOME-V1', body);
  return attachContentIdentity('TRD2V6-GRAPH-REPORT-V3', 'GRAPH-REPORT-V3', 'CONNECT-TRD2-V6-GRAPH-REPORT-V3', {
    edgeCount: graph.edgeCount,
    engineId: 'GRAPH-V3-ENGINE-A',
    failureCount: 0,
    graphRoot: graph.artifactRoot,
    mutationCount: PASS4_MUTATION_EXPECTATIONS.length,
    nodeCount: graph.nodeCount,
    outcomeRoot,
    recordKind: 'GRAPH-REPORT-V3',
    schemaVersion: 'CONNECT-TRD2-V6-GRAPH-REPORT-V3',
    sourceSha256: sha256Bytes(fs.readFileSync(SCRIPT_PATH)),
    status: 'PASS',
  });
}

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 512 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
  return result.stdout;
}

function observedHead(graph) {
  const key = graph.nodes.find(({ nodeKey }) => nodeKey.startsWith('TOOLCHAIN-COMMIT::'))?.nodeKey;
  const match = key?.match(/^TOOLCHAIN-COMMIT::([0-9a-f]{40}(?:[0-9a-f]{24})?)$/);
  if (match === undefined || match === null) throw new Error('Pass 4 graph lacks frozen toolchain commit');
  return match[1];
}

function verifyFrozenSource(graph) {
  const head = observedHead(graph);
  const frozen = runGit(['show', `${head}:${SCRIPT_PATH}`], null);
  const current = fs.readFileSync(SCRIPT_PATH);
  if (!frozen.equals(current)) throw new Error('Engine A differs from frozen Pass 4 toolchain');
}

function assertEmitWorktree() {
  const paths = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null).toString('utf8').split('\0').filter(Boolean).map((record) => record.slice(3));
  if (paths.length !== 1 || paths[0] !== GRAPH_PATH || fs.existsSync(REPORT_PATH) || fs.existsSync(TRD2_V6_PASS4_OUTPUTS[2])) throw new Error('Engine A emit requires only the completed graph candidate');
}

function patch(report) {
  return `*** Begin Patch\n*** Add File: ${REPORT_PATH}\n${prettyV6(report).trimEnd().split('\n').map((line) => `+${line}`).join('\n')}\n*** End Patch\n`;
}

function main() {
  const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
  const registry = JSON.parse(fs.readFileSync(TRD2_V6_PASS4_INPUT_PATHS[0], 'utf8'));
  verifyFrozenSource(graph);
  const report = buildReport(graph, registry);
  if (process.argv.includes('--emit-patch')) {
    assertEmitWorktree();
    process.stdout.write(patch(report));
  } else process.stdout.write(prettyV6(report));
}

main();
