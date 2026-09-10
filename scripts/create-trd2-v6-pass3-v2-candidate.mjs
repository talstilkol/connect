#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { prettyV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS3_V2_INPUT_PATHS,
  TRD2_V6_PASS3_V2_OUTPUTS,
  TRD2_V6_PASS3_V2_TOOLCHAIN_PATHS,
  TRD2_V6_PASS3_V2_TOOLCHAIN_REGISTRY_PATH,
  buildPass3V2Artifacts,
  validatePass3V2ToolchainRegistry,
} from './trd2-v6-pass3-v2-core.mjs';

const PART_COUNTS = Object.freeze({ clause: 8, state: 48, subject: 8 });
const OUTPUT_BY_NAME = Object.freeze({
  clause: TRD2_V6_PASS3_V2_OUTPUTS[1],
  state: TRD2_V6_PASS3_V2_OUTPUTS[2],
  subject: TRD2_V6_PASS3_V2_OUTPUTS[0],
});

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
  return result.stdout;
}

function readCommitBlob(commitId, logicalPath) {
  return runGit(['show', `${commitId}:${logicalPath}`], null);
}

function changedPaths() {
  return runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null)
    .toString('utf8').split('\0').filter(Boolean).map((record) => record.slice(3));
}

function assertGenerationBoundary(targetPath, part) {
  const unrelated = changedPaths().filter((logicalPath) => !TRD2_V6_PASS3_V2_OUTPUTS.includes(logicalPath));
  if (unrelated.length !== 0) throw new Error(`Pass 3 generation requires a frozen toolchain and no unrelated changes: ${unrelated.join(', ')}`);
  const targetExists = fs.existsSync(targetPath);
  if (part === 1 && targetExists) throw new Error(`Pass 3 output already exists: ${targetPath}`);
  if (part > 1 && !targetExists) throw new Error(`Pass 3 partial output is missing: ${targetPath}`);
  const targetIndex = TRD2_V6_PASS3_V2_OUTPUTS.indexOf(targetPath);
  for (const later of TRD2_V6_PASS3_V2_OUTPUTS.slice(targetIndex + 1)) if (fs.existsSync(later)) throw new Error(`later Pass 3 output appeared before ${targetPath}: ${later}`);
}

function inputRow(observedHead, logicalPath) {
  const bytes = readCommitBlob(observedHead, logicalPath);
  return { byteLength: bytes.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(bytes) };
}

function readJsonBlob(observedHead, logicalPath) {
  return JSON.parse(readCommitBlob(observedHead, logicalPath).toString('utf8'));
}

function build(observedHead) {
  const toolchainRegistry = readJsonBlob(observedHead, TRD2_V6_PASS3_V2_TOOLCHAIN_REGISTRY_PATH);
  validatePass3V2ToolchainRegistry(toolchainRegistry, TRD2_V6_PASS3_V2_TOOLCHAIN_PATHS);
  for (const logicalPath of TRD2_V6_PASS3_V2_TOOLCHAIN_PATHS) readCommitBlob(observedHead, logicalPath);
  const inputRows = TRD2_V6_PASS3_V2_INPUT_PATHS.map((logicalPath) => inputRow(observedHead, logicalPath));
  return buildPass3V2Artifacts({
    contract: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[4]),
    inputRows,
    observedHead,
    parserCorpus: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[2]),
    registry: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[0]),
    sourceCapture: readJsonBlob(observedHead, TRD2_V6_PASS3_V2_INPUT_PATHS[1]),
  });
}

function byteBalancedBoundaries(lines, partCount) {
  const offsets = [0];
  for (const line of lines) offsets.push(offsets.at(-1) + Buffer.byteLength(line, 'utf8') + 1);
  const totalBytes = offsets.at(-1);
  const boundaries = [0];
  let cursor = 0;
  for (let part = 1; part < partCount; part += 1) {
    const target = Math.floor((part * totalBytes) / partCount);
    while (cursor < lines.length && offsets[cursor] < target) cursor += 1;
    boundaries.push(cursor);
  }
  boundaries.push(lines.length);
  if (boundaries.some((boundary, index) => index > 0 && boundary <= boundaries[index - 1])) throw new Error('Pass 3 byte-balanced patch produced an empty part');
  return boundaries;
}

function marker(name, part, prefixLines) {
  return `__TRD2_V6_PASS3_V2_${name.toUpperCase()}_PART_${String(part).padStart(2, '0')}_PREFIX_SHA256_${sha256Bytes(Buffer.from(`${prefixLines.join('\n')}\n`, 'utf8'))}__`;
}

function patchPart(name, logicalPath, content, part, partCount) {
  if (!Number.isSafeInteger(part) || part < 1 || part > partCount) throw new Error(`${name} part must be 1..${partCount}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  const boundaries = byteBalancedBoundaries(lines, partCount);
  const start = boundaries[part - 1];
  const end = boundaries[part];
  const chunk = lines.slice(start, end);
  if (part === 1) return `*** Begin Patch\n*** Add File: ${logicalPath}\n${[...chunk.map((line) => `+${line}`), `+${marker(name, part, lines.slice(0, end))}`].join('\n')}\n*** End Patch\n`;
  const oldMarker = marker(name, part - 1, lines.slice(0, start));
  const replacement = chunk.map((line) => `+${line}`);
  if (part < partCount) replacement.push(`+${marker(name, part, lines.slice(0, end))}`);
  return `*** Begin Patch\n*** Update File: ${logicalPath}\n@@\n-${oldMarker}\n${replacement.join('\n')}\n*** End Patch\n`;
}

function main() {
  const nameArgument = process.argv.find((value) => value.startsWith('--artifact='));
  const partArgument = process.argv.find((value) => value.startsWith('--part='));
  if (nameArgument === undefined || partArgument === undefined) throw new Error('use --artifact=subject|clause|state --part=N; this builder never writes repository files directly');
  const name = nameArgument.split('=')[1];
  const part = Number(partArgument.split('=')[1]);
  const logicalPath = OUTPUT_BY_NAME[name];
  const partCount = PART_COUNTS[name];
  if (logicalPath === undefined || partCount === undefined) throw new Error(`unknown Pass 3 artifact: ${name}`);
  assertGenerationBoundary(logicalPath, part);
  const observedHead = runGit(['rev-parse', 'HEAD']).trim();
  const built = build(observedHead);
  process.stdout.write(patchPart(name, logicalPath, prettyV6(built.artifacts[logicalPath]), part, partCount));
}

main();
