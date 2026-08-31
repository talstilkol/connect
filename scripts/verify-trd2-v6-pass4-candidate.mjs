#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { canonicalV6, prettyV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS3_V2_INPUT_PATHS,
  TRD2_V6_PASS3_V2_OUTPUTS,
  buildPass3V2Artifacts,
} from './trd2-v6-pass3-v2-core.mjs';
import {
  TRD2_V6_PASS4_DEFERRED_OUTPUTS,
  TRD2_V6_PASS4_INPUT_PATHS,
  TRD2_V6_PASS4_OUTPUTS,
  TRD2_V6_PASS4_TOOLCHAIN_PATHS,
  TRD2_V6_PASS4_TOOLCHAIN_REGISTRY_PATH,
  buildInvalidationBlueprint,
  buildPass4Graph,
  pass4Outcome,
  pass4ToolchainRoot,
  validateCausalGraph,
  validatePass4GraphReport,
  validatePass4ToolchainRegistry,
} from './trd2-v6-pass4-core.mjs';

const ENGINE_A = 'scripts/verify-trd2-v6-pass4-engine-a.mjs';
const ENGINE_B = 'scripts/verify-trd2-v6-pass4-engine-b.py';

function run(command, args, encoding = 'utf8') {
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding, maxBuffer: 1024 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
  return result.stdout;
}

function runGit(args, encoding = 'utf8') {
  return run('git', args, encoding);
}

function readCommitBlob(commitId, logicalPath) {
  return runGit(['show', `${commitId}:${logicalPath}`], null);
}

function readJsonBlob(commitId, logicalPath) {
  return JSON.parse(readCommitBlob(commitId, logicalPath).toString('utf8'));
}

function worktreeMode() {
  const paths = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null).toString('utf8').split('\0').filter(Boolean).map((record) => record.slice(3));
  if (paths.length === 0) return 'COMMITTED-CLEAN';
  if (paths.length === TRD2_V6_PASS4_OUTPUTS.length && paths.every((path) => TRD2_V6_PASS4_OUTPUTS.includes(path))) return 'WORKTREE-CANDIDATE';
  throw new Error(`Pass 4 verifier found unrelated or incomplete worktree changes: ${paths.join(', ')}`);
}

function readOutputs() {
  return Object.fromEntries(TRD2_V6_PASS4_OUTPUTS.map((logicalPath) => {
    const bytes = fs.readFileSync(logicalPath);
    const value = JSON.parse(bytes.toString('utf8'));
    if (!bytes.equals(Buffer.from(prettyV6(value), 'utf8'))) throw new Error(`Pass 4 output is not exact pretty JSON: ${logicalPath}`);
    return [logicalPath, value];
  }));
}

function observedHead(graph) {
  const rows = graph.nodes.filter(({ nodeKey }) => nodeKey.startsWith('TOOLCHAIN-COMMIT::'));
  if (rows.length !== 1) throw new Error('Pass 4 graph must bind exactly one toolchain commit');
  const commit = rows[0].nodeKey.slice('TOOLCHAIN-COMMIT::'.length);
  if (!/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(commit)) throw new Error('Pass 4 toolchain commit format');
  return { commit, node: rows[0] };
}

function verifyToolchain(commit, toolchainNode) {
  const registry = readJsonBlob(commit, TRD2_V6_PASS4_TOOLCHAIN_REGISTRY_PATH);
  validatePass4ToolchainRegistry(registry, TRD2_V6_PASS4_TOOLCHAIN_PATHS);
  const rows = TRD2_V6_PASS4_TOOLCHAIN_PATHS.map((logicalPath) => {
    const frozen = readCommitBlob(commit, logicalPath);
    const current = fs.readFileSync(logicalPath);
    if (!frozen.equals(current)) throw new Error(`runtime differs from frozen Pass 4 toolchain: ${logicalPath}`);
    const source = logicalPath.endsWith('.mjs') || logicalPath.endsWith('.py') ? current.toString('utf8') : '';
    if (source.includes('Math' + '.random(') || source.includes('crypto' + '.randomUUID(')) throw new Error(`forbidden randomness in ${logicalPath}`);
    return { byteLength: frozen.length, logicalPath, observedCommit: commit, sha256: sha256Bytes(frozen) };
  });
  const root = pass4ToolchainRoot(rows);
  if (toolchainNode.boundRoot !== root) throw new Error('Pass 4 graph toolchain root mismatch');
  return { root, rows };
}

function rebuild(commit, toolchainRoot) {
  const registry = readJsonBlob(commit, TRD2_V6_PASS4_INPUT_PATHS[0]);
  const sourceCapture = readJsonBlob(commit, TRD2_V6_PASS4_INPUT_PATHS[4]);
  const parserCorpus = readJsonBlob(commit, TRD2_V6_PASS4_INPUT_PATHS[5]);
  const contract = readJsonBlob(commit, TRD2_V6_PASS4_INPUT_PATHS[6]);
  const subject = readJsonBlob(commit, TRD2_V6_PASS4_INPUT_PATHS[1]);
  const pass3Heads = new Set(subject.provenance.map(({ observedCommit }) => observedCommit));
  if (pass3Heads.size !== 1) throw new Error('Pass 3 Subject must bind exactly one frozen source/toolchain commit');
  const pass3Head = [...pass3Heads][0];
  const inputRows = TRD2_V6_PASS3_V2_INPUT_PATHS.map((logicalPath) => {
    const bytes = readCommitBlob(pass3Head, logicalPath);
    return { byteLength: bytes.length, logicalPath, observedCommit: pass3Head, sha256: sha256Bytes(bytes) };
  });
  const pass3 = buildPass3V2Artifacts({
    contract: readJsonBlob(pass3Head, TRD2_V6_PASS3_V2_INPUT_PATHS[4]),
    inputRows,
    observedHead: pass3Head,
    parserCorpus: readJsonBlob(pass3Head, TRD2_V6_PASS3_V2_INPUT_PATHS[2]),
    registry: readJsonBlob(pass3Head, TRD2_V6_PASS3_V2_INPUT_PATHS[0]),
    sourceCapture: readJsonBlob(pass3Head, TRD2_V6_PASS3_V2_INPUT_PATHS[1]),
  });
  for (const path of TRD2_V6_PASS3_V2_OUTPUTS) if (canonicalV6(pass3.artifacts[path]) !== canonicalV6(readJsonBlob(commit, path))) throw new Error(`Pass 3 reconstruction mismatch at ${path}`);
  return {
    graph: buildPass4Graph({
      clause: readJsonBlob(commit, TRD2_V6_PASS4_INPUT_PATHS[2]),
      contract,
      observedHead: commit,
      outputRegistry: readJsonBlob(commit, TRD2_V6_PASS4_INPUT_PATHS[7]),
      parserCorpus,
      registry,
      sourceCapture,
      state: readJsonBlob(commit, TRD2_V6_PASS4_INPUT_PATHS[3]),
      subject,
      toolchainRoot,
      virtualClauseNodes: pass3.clauseNodes,
      virtualObligations: pass3.obligations,
    }),
    registry,
  };
}

function verifyReports(outputs, graph, registry, toolchainRows) {
  const actualA = validatePass4GraphReport(outputs[TRD2_V6_PASS4_OUTPUTS[1]], graph, registry);
  const actualB = validatePass4GraphReport(outputs[TRD2_V6_PASS4_OUTPUTS[2]], graph, registry);
  const expectedA = JSON.parse(run('node', [ENGINE_A]));
  const expectedB = JSON.parse(run('python3', [ENGINE_B]));
  if (canonicalV6(actualA) !== canonicalV6(expectedA) || canonicalV6(actualB) !== canonicalV6(expectedB)) throw new Error('Pass 4 report differs from independent runtime reconstruction');
  if (actualA.engineId !== 'GRAPH-V3-ENGINE-A' || actualB.engineId !== 'GRAPH-V3-ENGINE-B' || actualA.sourceSha256 === actualB.sourceSha256) throw new Error('Pass 4 independent engine separation mismatch');
  if (actualA.status !== 'PASS' || actualB.status !== 'PASS' || actualA.outcomeRoot !== actualB.outcomeRoot) throw new Error('Pass 4 independent engines disagree');
  const rowA = toolchainRows.find(({ logicalPath }) => logicalPath === ENGINE_A);
  const rowB = toolchainRows.find(({ logicalPath }) => logicalPath === ENGINE_B);
  if (rowA?.sha256 !== actualA.sourceSha256 || rowB?.sha256 !== actualB.sourceSha256) throw new Error('Pass 4 report source digest mismatch');
  return actualA;
}

function verifyBoundaryAndSafety(outputs) {
  for (const path of TRD2_V6_PASS4_DEFERRED_OUTPUTS) if (fs.existsSync(path)) throw new Error(`Pass 4 deferred output appeared early: ${path}`);
  const text = canonicalV6(outputs);
  if (text.includes('/Users/') || text.includes('file://') || /(?:password|private[_-]?key|access[_-]?token)\s*[:=]/i.test(text)) throw new Error('Pass 4 output contains workstation path or possible Secret');
}

function main() {
  const mode = worktreeMode();
  const outputs = readOutputs();
  const graph = outputs[TRD2_V6_PASS4_OUTPUTS[0]];
  const frozen = observedHead(graph);
  const toolchain = verifyToolchain(frozen.commit, frozen.node);
  const expected = rebuild(frozen.commit, toolchain.root);
  if (canonicalV6(graph) !== canonicalV6(expected.graph)) throw new Error('Pass 4 graph differs from deterministic reconstruction');
  const validation = validateCausalGraph(graph, expected.registry);
  verifyBoundaryAndSafety(outputs);
  const report = verifyReports(outputs, graph, expected.registry, toolchain.rows);
  const outcome = pass4Outcome(graph, expected.registry);
  if (report.outcomeRoot !== outcome.outcomeRoot) throw new Error('Pass 4 report/core outcome mismatch');
  const blueprint = buildInvalidationBlueprint(graph, expected.registry);
  process.stdout.write(`${JSON.stringify({
    acceptance: 0,
    developmentFreeze: 'ACTIVE',
    edgeCount: graph.edgeCount,
    engineAgreement: '2/2',
    expectedFamilyCoverage: `${graph.expectedFamilyCount}/${graph.expectedFamilyCount}`,
    findingClosure: '0/15',
    gate29: 'BLOCKED',
    graphRoot: graph.artifactRoot,
    hostileMutationCoverage: `${report.mutationCount}/${report.mutationCount}`,
    invalidationDependencyCount: blueprint.dependencyRoots.length,
    invalidationEdgeCount: validation.invalidationEdgeCount,
    mode,
    nodeCount: graph.nodeCount,
    observedHead: frozen.commit,
    outcomeRoot: report.outcomeRoot,
    pass: '4',
    repositoryVisibility: 'PUBLIC',
    reviewGenerations: '0/2',
    status: 'PASS-LOCAL-CAUSAL-GRAPH-COMPLETE;OVERLAY-DEFERRED;NO-ACCEPTANCE-CREDIT',
    toolchainRoot: toolchain.root,
    typedGraphRoot: graph.typedGraphRoot,
  }, null, 2)}\n`);
}

main();
