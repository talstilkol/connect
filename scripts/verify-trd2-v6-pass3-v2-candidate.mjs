#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { canonicalV6, prettyV6, rootV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS3_V2_INPUT_PATHS,
  TRD2_V6_PASS3_V2_OUTPUTS,
  TRD2_V6_PASS3_V2_TOOLCHAIN_PATHS,
  TRD2_V6_PASS3_V2_TOOLCHAIN_REGISTRY_PATH,
  buildPass3V2Artifacts,
  pass3V2Outcome,
  validatePass3V2Artifacts,
  validatePass3V2ToolchainRegistry,
} from './trd2-v6-pass3-v2-core.mjs';

const ENGINE_A = 'scripts/verify-trd2-v6-pass3-v2-engine-a.mjs';
const ENGINE_B = 'scripts/verify-trd2-v6-pass3-v2-engine-b.py';

function run(command, args, encoding = 'utf8') {
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding, maxBuffer: 256 * 1024 * 1024 });
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
  if (paths.length === TRD2_V6_PASS3_V2_OUTPUTS.length && paths.every((path) => TRD2_V6_PASS3_V2_OUTPUTS.includes(path))) return 'WORKTREE-CANDIDATE';
  throw new Error(`Pass 3 verifier found unrelated or incomplete worktree changes: ${paths.join(', ')}`);
}

function readOutputs() {
  return Object.fromEntries(TRD2_V6_PASS3_V2_OUTPUTS.map((logicalPath) => {
    const bytes = fs.readFileSync(logicalPath);
    const value = JSON.parse(bytes.toString('utf8'));
    if (!bytes.equals(Buffer.from(prettyV6(value), 'utf8'))) throw new Error(`Pass 3 output is not exact pretty JSON: ${logicalPath}`);
    return [logicalPath, value];
  }));
}

function verifyToolchain(observedHead) {
  const registry = readJsonBlob(observedHead, TRD2_V6_PASS3_V2_TOOLCHAIN_REGISTRY_PATH);
  validatePass3V2ToolchainRegistry(registry, TRD2_V6_PASS3_V2_TOOLCHAIN_PATHS);
  const rows = TRD2_V6_PASS3_V2_TOOLCHAIN_PATHS.map((logicalPath) => {
    const frozen = readCommitBlob(observedHead, logicalPath);
    const current = fs.readFileSync(logicalPath);
    if (!frozen.equals(current)) throw new Error(`runtime differs from frozen Pass 3 toolchain: ${logicalPath}`);
    const source = logicalPath.endsWith('.mjs') || logicalPath.endsWith('.py') ? current.toString('utf8') : '';
    if (source.includes('Math' + '.random(') || source.includes('crypto' + '.randomUUID(')) throw new Error(`forbidden randomness in ${logicalPath}`);
    return { byteLength: frozen.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(frozen) };
  });
  return { rows, toolchainRoot: rootV6('TRD2V6-PASS3-V2-TOOLCHAIN', 'CONNECT-TRD2-V6-PASS3-V2-TOOLCHAIN-V1', rows) };
}

function rebuild(observedHead) {
  const inputRows = TRD2_V6_PASS3_V2_INPUT_PATHS.map((logicalPath) => {
    const bytes = readCommitBlob(observedHead, logicalPath);
    return { byteLength: bytes.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(bytes) };
  });
  return buildPass3V2Artifacts({
    contract: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[4]),
    inputRows,
    observedHead,
    parserCorpus: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[2]),
    registry: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[0]),
    sourceCapture: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[1]),
  });
}

function hostileMutations(expected, contract, registry) {
  const cases = [];
  const subjectPath = TRD2_V6_PASS3_V2_OUTPUTS[0];
  const clausePath = TRD2_V6_PASS3_V2_OUTPUTS[1];
  const statePath = TRD2_V6_PASS3_V2_OUTPUTS[2];
  const mutations = [
    ['OMITTED-REQUIREMENT', (artifacts) => artifacts[subjectPath].requirements.pop()],
    ['CROSS-REQUIREMENT-SUBSTITUTION', (artifacts) => { artifacts[clausePath].programs[0].requirementRoot = artifacts[clausePath].programs[1].requirementRoot; }],
    ['UNKNOWN-OPCODE', (_artifacts, nodes) => { nodes[0].opcode = 'UNDECLARED-OPCODE'; }],
    ['UNRESOLVABLE-CLAUSE-ROOT', (artifacts) => { artifacts[clausePath].programs[0].clauseRoots[0] = 'f'.repeat(64); }],
    ['MISSING-TRANSITION', (artifacts) => artifacts[statePath].machines[0].transitions.pop()],
    ['DUPLICATE-TRANSITION', (artifacts) => { artifacts[statePath].machines[0].transitions[1] = structuredClone(artifacts[statePath].machines[0].transitions[0]); }],
    ['PURGED-RESURRECTION', (artifacts) => { const row = artifacts[statePath].machines.find(({ family }) => family === 'DATA-LIFECYCLE').transitions.find(({ fromState }) => fromState === 'PURGED'); row.disposition = 'ALLOW'; row.toState = 'ACTIVE'; }],
    ['DUPLICATE-SOE-050-ESCALATION', (artifacts) => { const machine = artifacts[statePath].machines.find(({ machineId }) => machineId.includes('SOE-050')); const row = machine.transitions.find(({ event }) => event === 'DUPLICATE-FIRST-REACHABILITY'); row.disposition = 'ALLOW'; row.toState = 'P0'; }],
  ];
  for (const [name, mutate] of mutations) {
    const artifacts = structuredClone(expected.artifacts);
    const nodes = structuredClone(expected.clauseNodes);
    const obligations = structuredClone(expected.obligations);
    mutate(artifacts, nodes, obligations);
    let blocked = false;
    try {
      validatePass3V2Artifacts({ artifacts, clauseNodes: nodes, contract, obligations, registry });
      if (canonicalV6(artifacts) !== canonicalV6(expected.artifacts)) throw new Error('deterministic reconstruction mismatch');
    } catch {
      blocked = true;
    }
    if (!blocked) throw new Error(`hostile mutation passed: ${name}`);
    cases.push({ mutation: name, result: 'BLOCKED' });
  }
  return cases;
}

function verifyPublicSafety(outputs) {
  const text = canonicalV6(outputs);
  if (text.includes('/Users/') || text.includes('file://') || /(?:password|private[_-]?key|access[_-]?token)\s*[:=]/i.test(text)) throw new Error('Pass 3 output contains workstation path or possible Secret');
}

function main() {
  const mode = worktreeMode();
  const actual = readOutputs();
  const subject = actual[TRD2_V6_PASS3_V2_OUTPUTS[0]];
  const commits = new Set(subject.provenance.map(({ observedCommit }) => observedCommit));
  if (commits.size !== 1) throw new Error('Pass 3 Subject provenance commit mismatch');
  const observedHead = [...commits][0];
  const toolchain = verifyToolchain(observedHead);
  const expected = rebuild(observedHead);
  const registry = readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[0]);
  const contract = readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[4]);
  for (const logicalPath of TRD2_V6_PASS3_V2_OUTPUTS) if (canonicalV6(actual[logicalPath]) !== canonicalV6(expected.artifacts[logicalPath])) throw new Error(`Pass 3 output differs from deterministic reconstruction: ${logicalPath}`);
  verifyPublicSafety(actual);
  const mutations = hostileMutations(expected, contract, registry);
  const engineA = JSON.parse(run('node', [ENGINE_A]));
  const engineB = JSON.parse(run('python3', [ENGINE_B]));
  if (engineA.status !== 'PASS' || engineB.status !== 'PASS' || engineA.outcomeRoot !== engineB.outcomeRoot || engineA.sourceSha256 === engineB.sourceSha256) throw new Error('Pass 3 independent engines disagree or are not separated');
  const outcome = pass3V2Outcome(actual);
  if (engineA.outcomeRoot !== rootV6('TRD2V6-PASS3-V2-ENGINE-OUTCOME', 'CONNECT-TRD2-V6-PASS3-V2-ENGINE-OUTCOME-V1', outcome)) throw new Error('Pass 3 engine outcome binding mismatch');
  process.stdout.write(`${JSON.stringify({
    acceptance: 0,
    ...outcome,
    developmentFreeze: 'ACTIVE',
    engineAgreement: '2/2',
    engineOutcomeRoot: engineA.outcomeRoot,
    findingClosure: '0/15',
    gate29: 'BLOCKED',
    hostileMutationCoverage: `${mutations.length}/${mutations.length}`,
    mode,
    observedHead,
    pass: '3-v2',
    repositoryVisibility: 'PUBLIC',
    reviewGenerations: '0/2',
    status: 'PASS-LOCAL-COMPILATION-COMPLETE;NO-SEMANTIC-ACCEPTANCE-CREDIT',
    toolchainRoot: toolchain.toolchainRoot,
  }, null, 2)}\n`);
}

main();
