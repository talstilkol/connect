#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { prettyV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS2_V3_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS2_V3_PATHS,
  TRD2_V6_PASS2_V3_RESTART_CHARTER_PATH,
  TRD2_V6_PASS2_V3_TOOLCHAIN_PATHS,
  TRD2_V6_PASS2_V3_TOOLCHAIN_REGISTRY_PATH,
  makeClosedSchemaRegistryV3,
  pass2V3ToolchainRoot,
  validateOutputPathRegistryV3,
  validatePass2V3ToolchainRegistry,
} from './trd2-v6-pass2-v3-core.mjs';

const [REGISTRY_PATH] = TRD2_V6_PASS2_V3_PATHS;
const V2_DIRECTORY = 'docs/planning/trd2-v6-candidate-v2-2026-08-31';
const V2_REGISTRY_PATH = `${V2_DIRECTORY}/closed-schema-registry-v2.json`;
const V2_REPORT_A_PATH = `${V2_DIRECTORY}/canonical-engine-a-report-v2.json`;
const V2_REPORT_B_PATH = `${V2_DIRECTORY}/canonical-engine-b-report-v2.json`;
const PATCH_PART_COUNT = 64;

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
  return result.stdout;
}

function readCommitBlob(commitId, logicalPath) {
  return runGit(['show', `${commitId}:${logicalPath}`], null);
}

function worktreePaths() {
  return runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null).toString('utf8').split('\0').filter(Boolean).map((record) => record.slice(3));
}

function assertWorktree(part) {
  const paths = worktreePaths();
  if (part === 1 && paths.length !== 0) throw new Error('Pass 2 v3 construction requires a clean worktree for part 1');
  if (part > 1 && (paths.length !== 1 || paths[0] !== REGISTRY_PATH)) throw new Error('Pass 2 v3 continuation requires only the partial registry path');
  for (const logicalPath of TRD2_V6_PASS2_V3_PATHS.slice(1)) if (fs.existsSync(logicalPath)) throw new Error(`Pass 2 v3 report appeared before registry completion: ${logicalPath}`);
}

function rowFor(observedHead, logicalPath) {
  const bytes = readCommitBlob(observedHead, logicalPath);
  return { byteLength: bytes.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(bytes) };
}

function evidenceRow(observedHead, logicalPath) {
  const bytes = readCommitBlob(observedHead, logicalPath);
  const value = JSON.parse(bytes.toString('utf8'));
  return { artifactRoot: value.artifactRoot, byteLength: bytes.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(bytes) };
}

function buildRegistry() {
  const observedHead = runGit(['rev-parse', 'HEAD']).trim();
  const observedObjectFormat = runGit(['rev-parse', '--show-object-format']).trim();
  const outputRegistryBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_V3_OUTPUT_REGISTRY_PATH);
  const toolchainRegistryBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_V3_TOOLCHAIN_REGISTRY_PATH);
  const outputRegistry = validateOutputPathRegistryV3(JSON.parse(outputRegistryBytes.toString('utf8')));
  validatePass2V3ToolchainRegistry(JSON.parse(toolchainRegistryBytes.toString('utf8')));
  const toolchain = TRD2_V6_PASS2_V3_TOOLCHAIN_PATHS.map((logicalPath) => rowFor(observedHead, logicalPath));
  const v2RegistryBytes = readCommitBlob(observedHead, V2_REGISTRY_PATH);
  const v2ReportABytes = readCommitBlob(observedHead, V2_REPORT_A_PATH);
  const v2ReportBBytes = readCommitBlob(observedHead, V2_REPORT_B_PATH);
  const v2Registry = JSON.parse(v2RegistryBytes.toString('utf8'));
  const v2ReportA = JSON.parse(v2ReportABytes.toString('utf8'));
  const v2ReportB = JSON.parse(v2ReportBBytes.toString('utf8'));
  const provenance = {
    observedHead,
    observedObjectFormat,
    outputRegistrySha256: sha256Bytes(outputRegistryBytes),
    restartCharterSha256: sha256Bytes(readCommitBlob(observedHead, TRD2_V6_PASS2_V3_RESTART_CHARTER_PATH)),
    toolchain,
    toolchainRegistrySha256: sha256Bytes(toolchainRegistryBytes),
    toolchainRoot: pass2V3ToolchainRoot(toolchain),
    v2Evidence: {
      outcomeRoot: v2ReportA.outcomeRoot,
      registry: evidenceRow(observedHead, V2_REGISTRY_PATH),
      reportA: evidenceRow(observedHead, V2_REPORT_A_PATH),
      reportB: evidenceRow(observedHead, V2_REPORT_B_PATH),
      status: 'BOUNDED-ACTUAL-EVIDENCE-REVALIDATED;NOT-COMPLETE-SCHEMA-REGISTRY',
    },
  };
  return makeClosedSchemaRegistryV3({ outputRegistry, provenance, v2Registry, v2ReportA, v2ReportB });
}

function marker(part, prefixLines) {
  return `__TRD2_V6_PASS2_V3_PART_${String(part).padStart(2, '0')}_PREFIX_SHA256_${sha256Bytes(Buffer.from(`${prefixLines.join('\n')}\n`, 'utf8'))}__`;
}

function patchPart(content, part) {
  if (!Number.isSafeInteger(part) || part < 1 || part > PATCH_PART_COUNT) throw new Error(`patch part must be 1..${PATCH_PART_COUNT}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  const start = Math.floor(((part - 1) * lines.length) / PATCH_PART_COUNT);
  const end = Math.floor((part * lines.length) / PATCH_PART_COUNT);
  const chunk = lines.slice(start, end);
  if (part === 1) return `*** Begin Patch\n*** Add File: ${REGISTRY_PATH}\n${[...chunk.map((line) => `+${line}`), `+${marker(part, lines.slice(0, end))}`].join('\n')}\n*** End Patch\n`;
  const oldMarker = marker(part - 1, lines.slice(0, start));
  const replacement = chunk.map((line) => `+${line}`);
  if (part < PATCH_PART_COUNT) replacement.push(`+${marker(part, lines.slice(0, end))}`);
  return `*** Begin Patch\n*** Update File: ${REGISTRY_PATH}\n@@\n-${oldMarker}\n${replacement.join('\n')}\n*** End Patch\n`;
}

function main() {
  const argument = process.argv.find((value) => value.startsWith('--emit-patch-part='));
  if (argument === undefined) throw new Error(`use --emit-patch-part=N where N is 1..${PATCH_PART_COUNT}; the builder never writes repository files directly`);
  const part = Number(argument.split('=')[1]);
  assertWorktree(part);
  process.stdout.write(patchPart(prettyV6(buildRegistry()), part));
}

main();
