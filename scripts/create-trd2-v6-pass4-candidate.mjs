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
  TRD2_V6_PASS4_INPUT_PATHS,
  TRD2_V6_PASS4_OUTPUTS,
  TRD2_V6_PASS4_TOOLCHAIN_PATHS,
  TRD2_V6_PASS4_TOOLCHAIN_REGISTRY_PATH,
  buildPass4Graph,
  pass4ToolchainRoot,
  validatePass4ToolchainRegistry,
} from './trd2-v6-pass4-core.mjs';

const GRAPH_PATH = TRD2_V6_PASS4_OUTPUTS[0];
const PATCH_PART_COUNT = 128;

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 512 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
  return result.stdout;
}

function readCommitBlob(commitId, logicalPath) {
  return runGit(['show', `${commitId}:${logicalPath}`], null);
}

function readJsonBlob(commitId, logicalPath) {
  return JSON.parse(readCommitBlob(commitId, logicalPath).toString('utf8'));
}

function worktreePaths() {
  return runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null).toString('utf8').split('\0').filter(Boolean).map((record) => record.slice(3));
}

function assertWorktree(part) {
  const paths = worktreePaths();
  if (part === 1 && paths.length !== 0) throw new Error('Pass 4 construction requires a clean worktree for part 1');
  if (part > 1 && (paths.length !== 1 || paths[0] !== GRAPH_PATH)) throw new Error('Pass 4 continuation requires only the partial causal graph path');
  for (const path of TRD2_V6_PASS4_OUTPUTS.slice(1)) if (fs.existsSync(path)) throw new Error(`Pass 4 report appeared before graph completion: ${path}`);
}

function rowFor(observedHead, logicalPath) {
  const bytes = readCommitBlob(observedHead, logicalPath);
  return { byteLength: bytes.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(bytes) };
}

function buildGraph() {
  const observedHead = runGit(['rev-parse', 'HEAD']).trim();
  const toolchainRegistry = readJsonBlob(observedHead, TRD2_V6_PASS4_TOOLCHAIN_REGISTRY_PATH);
  validatePass4ToolchainRegistry(toolchainRegistry, TRD2_V6_PASS4_TOOLCHAIN_PATHS);
  const toolchainRows = TRD2_V6_PASS4_TOOLCHAIN_PATHS.map((logicalPath) => rowFor(observedHead, logicalPath));
  const registry = readJsonBlob(observedHead, TRD2_V6_PASS4_INPUT_PATHS[0]);
  const sourceCapture = readJsonBlob(observedHead, TRD2_V6_PASS4_INPUT_PATHS[4]);
  const parserCorpus = readJsonBlob(observedHead, TRD2_V6_PASS4_INPUT_PATHS[5]);
  const contract = readJsonBlob(observedHead, TRD2_V6_PASS4_INPUT_PATHS[6]);
  const pass3InputRows = TRD2_V6_PASS3_V2_INPUT_PATHS.map((logicalPath) => rowFor(observedHead, logicalPath));
  const pass3 = buildPass3V2Artifacts({ contract, inputRows: pass3InputRows, observedHead, parserCorpus, registry, sourceCapture });
  for (const path of TRD2_V6_PASS3_V2_OUTPUTS) {
    const frozen = readJsonBlob(observedHead, path);
    if (canonicalV6(frozen) !== canonicalV6(pass3.artifacts[path])) throw new Error(`Pass 3 input differs from deterministic reconstruction: ${path}`);
  }
  return buildPass4Graph({
    clause: readJsonBlob(observedHead, TRD2_V6_PASS4_INPUT_PATHS[2]),
    contract,
    observedHead,
    outputRegistry: readJsonBlob(observedHead, TRD2_V6_PASS4_INPUT_PATHS[7]),
    parserCorpus,
    registry,
    sourceCapture,
    state: readJsonBlob(observedHead, TRD2_V6_PASS4_INPUT_PATHS[3]),
    subject: readJsonBlob(observedHead, TRD2_V6_PASS4_INPUT_PATHS[1]),
    toolchainRoot: pass4ToolchainRoot(toolchainRows),
    virtualClauseNodes: pass3.clauseNodes,
    virtualObligations: pass3.obligations,
  });
}

function marker(part, prefixLines) {
  return `__TRD2_V6_PASS4_GRAPH_PART_${String(part).padStart(3, '0')}_PREFIX_SHA256_${sha256Bytes(Buffer.from(`${prefixLines.join('\n')}\n`, 'utf8'))}__`;
}

function byteBalancedBoundaries(lines) {
  const offsets = [0];
  for (const line of lines) offsets.push(offsets.at(-1) + Buffer.byteLength(line, 'utf8') + 1);
  const totalBytes = offsets.at(-1);
  const boundaries = [0];
  let cursor = 0;
  for (let part = 1; part < PATCH_PART_COUNT; part += 1) {
    const target = Math.floor((part * totalBytes) / PATCH_PART_COUNT);
    while (cursor < lines.length && offsets[cursor] < target) cursor += 1;
    boundaries.push(cursor);
  }
  boundaries.push(lines.length);
  if (boundaries.some((boundary, index) => index > 0 && boundary <= boundaries[index - 1])) throw new Error('Pass 4 byte-balanced patch produced an empty part');
  return boundaries;
}

function patchPart(content, part) {
  if (!Number.isSafeInteger(part) || part < 1 || part > PATCH_PART_COUNT) throw new Error(`patch part must be 1..${PATCH_PART_COUNT}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  const boundaries = byteBalancedBoundaries(lines);
  const start = boundaries[part - 1];
  const end = boundaries[part];
  const chunk = lines.slice(start, end);
  if (part === 1) return `*** Begin Patch\n*** Add File: ${GRAPH_PATH}\n${[...chunk.map((line) => `+${line}`), `+${marker(part, lines.slice(0, end))}`].join('\n')}\n*** End Patch\n`;
  const replacement = chunk.map((line) => `+${line}`);
  if (part < PATCH_PART_COUNT) replacement.push(`+${marker(part, lines.slice(0, end))}`);
  return `*** Begin Patch\n*** Update File: ${GRAPH_PATH}\n@@\n-${marker(part - 1, lines.slice(0, start))}\n${replacement.join('\n')}\n*** End Patch\n`;
}

function main() {
  const argument = process.argv.find((value) => value.startsWith('--emit-patch-part='));
  if (argument === undefined) throw new Error(`use --emit-patch-part=N where N is 1..${PATCH_PART_COUNT}; the builder never writes repository files directly`);
  const part = Number(argument.split('=')[1]);
  assertWorktree(part);
  process.stdout.write(patchPart(prettyV6(buildGraph()), part));
}

main();
