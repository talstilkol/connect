#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { canonicalV6, rootV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS3_V2_INPUT_PATHS,
  TRD2_V6_PASS3_V2_OUTPUTS,
  TRD2_V6_PASS3_V2_TOOLCHAIN_PATHS,
  TRD2_V6_PASS3_V2_TOOLCHAIN_REGISTRY_PATH,
  buildPass3V2Artifacts,
  pass3V2Outcome,
  validatePass3V2ToolchainRegistry,
} from './trd2-v6-pass3-v2-core.mjs';

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
  return result.stdout;
}

function readCommitBlob(commitId, logicalPath) {
  return runGit(['show', `${commitId}:${logicalPath}`], null);
}

function readJsonBlob(commitId, logicalPath) {
  return JSON.parse(readCommitBlob(commitId, logicalPath).toString('utf8'));
}

function main() {
  const actual = Object.fromEntries(TRD2_V6_PASS3_V2_OUTPUTS.map((logicalPath) => [logicalPath, JSON.parse(fs.readFileSync(logicalPath, 'utf8'))]));
  const subject = actual[TRD2_V6_PASS3_V2_OUTPUTS[0]];
  const commits = new Set(subject.provenance.map(({ observedCommit }) => observedCommit));
  if (commits.size !== 1) throw new Error('Engine A: Subject provenance has multiple observed commits');
  const observedHead = [...commits][0];
  const toolchainRegistry = readJsonBlob(observedHead, TRD2_V6_PASS3_V2_TOOLCHAIN_REGISTRY_PATH);
  validatePass3V2ToolchainRegistry(toolchainRegistry, TRD2_V6_PASS3_V2_TOOLCHAIN_PATHS);
  for (const logicalPath of TRD2_V6_PASS3_V2_TOOLCHAIN_PATHS) {
    const frozen = readCommitBlob(observedHead, logicalPath);
    if (sha256Bytes(frozen) !== sha256Bytes(fs.readFileSync(logicalPath))) throw new Error(`Engine A: runtime differs from frozen toolchain: ${logicalPath}`);
    const source = logicalPath.endsWith('.mjs') || logicalPath.endsWith('.py') ? frozen.toString('utf8') : '';
    if (source.includes('Math' + '.random(') || source.includes('crypto' + '.randomUUID(')) throw new Error(`Engine A: forbidden randomness in ${logicalPath}`);
  }
  const inputRows = TRD2_V6_PASS3_V2_INPUT_PATHS.map((logicalPath) => {
    const bytes = readCommitBlob(observedHead, logicalPath);
    return { byteLength: bytes.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(bytes) };
  });
  const built = buildPass3V2Artifacts({
    contract: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[4]),
    inputRows,
    observedHead,
    parserCorpus: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[2]),
    registry: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[0]),
    sourceCapture: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[1]),
  });
  const comparisons = TRD2_V6_PASS3_V2_OUTPUTS.map((logicalPath) => ({
    actualRoot: actual[logicalPath].artifactRoot,
    expectedRoot: built.artifacts[logicalPath].artifactRoot,
    exactCanonicalMatch: canonicalV6(actual[logicalPath]) === canonicalV6(built.artifacts[logicalPath]),
    logicalPath,
  }));
  if (comparisons.some(({ actualRoot, exactCanonicalMatch, expectedRoot }) => !exactCanonicalMatch || actualRoot !== expectedRoot)) throw new Error('Engine A: generated outputs differ from independently regenerated outputs');
  const outcome = pass3V2Outcome(actual);
  process.stdout.write(`${JSON.stringify({
    ...outcome,
    claimLimit: 'LOCAL-PASS3-COMPILATION-EVIDENCE;NO-SEMANTIC-ACCEPTANCE-CREDIT',
    comparisons,
    engineId: 'TRD2-V6-PASS3-V2-ENGINE-A',
    observedHead,
    outcomeRoot: rootV6('TRD2V6-PASS3-V2-ENGINE-OUTCOME', 'CONNECT-TRD2-V6-PASS3-V2-ENGINE-OUTCOME-V1', outcome),
    sourceSha256: sha256Bytes(fs.readFileSync('scripts/verify-trd2-v6-pass3-v2-engine-a.mjs')),
    status: 'PASS',
  }, null, 2)}\n`);
}

main();
