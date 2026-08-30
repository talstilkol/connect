#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { prettyV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS1_REUSED_PATHS,
  TRD2_V6_PASS2_V1_REJECTED_PATHS,
  TRD2_V6_PASS2_V2_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS2_V2_PATHS,
  TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH,
  TRD2_V6_PASS2_V2_TOOLCHAIN_PATHS,
  TRD2_V6_PASS2_V2_TOOLCHAIN_REGISTRY_PATH,
  makeClosedSchemaRegistryV2,
  pass2V2ToolchainRoot,
  validateOutputPathRegistryV2,
  validatePass2V2ToolchainRegistry,
} from './trd2-v6-pass2-v2-core.mjs';

const [REGISTRY_PATH] = TRD2_V6_PASS2_V2_PATHS;
const RESTART_CHARTER_PATH = 'docs/planning/section-35-6-trd-2-v6-pass2-v2-restart-charter-2026-08-31.md';
const PATCH_PART_COUNT = 24;

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
  return result.stdout;
}

function readCommitBlob(commitId, logicalPath) {
  return runGit(['show', `${commitId}:${logicalPath}`], null);
}

function worktreePaths() {
  return runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null)
    .toString('utf8').split('\0').filter(Boolean).map((record) => record.slice(3));
}

function assertWorktree(part) {
  const paths = worktreePaths();
  if (part === 1 && paths.length !== 0) throw new Error('Pass 2 v2 construction requires a clean worktree for part 1');
  if (part > 1 && (paths.length !== 1 || paths[0] !== REGISTRY_PATH)) throw new Error('Pass 2 v2 continuation requires only the partial registry path');
  for (const logicalPath of TRD2_V6_PASS2_V2_PATHS.slice(1)) if (fs.existsSync(logicalPath)) throw new Error(`Pass 2 v2 report appeared before registry completion: ${logicalPath}`);
}

function rowFor(observedHead, logicalPath) {
  const bytes = readCommitBlob(observedHead, logicalPath);
  return { byteLength: bytes.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(bytes) };
}

function artifactRow(observedHead, logicalPath, disposition) {
  const bytes = readCommitBlob(observedHead, logicalPath);
  const parsed = JSON.parse(bytes.toString('utf8'));
  return {
    artifactRoot: parsed.artifactRoot,
    byteLength: bytes.length,
    disposition,
    logicalPath,
    observedCommit: observedHead,
    sha256: sha256Bytes(bytes),
  };
}

function buildRegistry() {
  const observedHead = runGit(['rev-parse', 'HEAD']).trim();
  const observedObjectFormat = runGit(['rev-parse', '--show-object-format']).trim();
  const outputRegistryBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_V2_OUTPUT_REGISTRY_PATH);
  const toolchainRegistryBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_V2_TOOLCHAIN_REGISTRY_PATH);
  validateOutputPathRegistryV2(JSON.parse(outputRegistryBytes.toString('utf8')));
  validatePass2V2ToolchainRegistry(JSON.parse(toolchainRegistryBytes.toString('utf8')));
  const toolchain = TRD2_V6_PASS2_V2_TOOLCHAIN_PATHS.map((logicalPath) => rowFor(observedHead, logicalPath));
  const passOneSources = TRD2_V6_PASS1_REUSED_PATHS.map((logicalPath) => {
    const bytes = readCommitBlob(observedHead, logicalPath);
    return { bytes, logicalPath, sha256: sha256Bytes(bytes), value: JSON.parse(bytes.toString('utf8')) };
  });
  const requirementBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH);
  const requirementSource = {
    bytes: requirementBytes,
    logicalPath: TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH,
    sha256: sha256Bytes(requirementBytes),
  };
  const restartCharterBytes = readCommitBlob(observedHead, RESTART_CHARTER_PATH);
  const provenance = {
    observedHead,
    observedObjectFormat,
    outputRegistrySha256: sha256Bytes(outputRegistryBytes),
    rejectedPassTwoV1: TRD2_V6_PASS2_V1_REJECTED_PATHS.map((logicalPath) => artifactRow(observedHead, logicalPath, 'REJECTED-SUPERSEDED-NOT-REUSABLE')),
    requirementSource: {
      byteLength: requirementBytes.length,
      logicalPath: TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH,
      observedCommit: observedHead,
      requirementCount: 128,
      sha256: requirementSource.sha256,
    },
    restartCharterSha256: sha256Bytes(restartCharterBytes),
    reusedPassOne: TRD2_V6_PASS1_REUSED_PATHS.map((logicalPath) => artifactRow(observedHead, logicalPath, 'IMMUTABLE-REUSED')),
    toolchain,
    toolchainRegistrySha256: sha256Bytes(toolchainRegistryBytes),
    toolchainRoot: pass2V2ToolchainRoot(toolchain),
  };
  return makeClosedSchemaRegistryV2({ passOneSources, provenance, requirementSource });
}

function marker(part, prefixLines) {
  return `__TRD2_V6_PASS2_V2_PART_${String(part).padStart(2, '0')}_PREFIX_SHA256_${sha256Bytes(Buffer.from(`${prefixLines.join('\n')}\n`, 'utf8'))}__`;
}

function patchPart(content, part) {
  if (!Number.isSafeInteger(part) || part < 1 || part > PATCH_PART_COUNT) throw new Error(`patch part must be 1..${PATCH_PART_COUNT}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  const start = Math.floor(((part - 1) * lines.length) / PATCH_PART_COUNT);
  const end = Math.floor((part * lines.length) / PATCH_PART_COUNT);
  const chunk = lines.slice(start, end);
  if (part === 1) {
    return `*** Begin Patch\n*** Add File: ${REGISTRY_PATH}\n${[...chunk.map((line) => `+${line}`), `+${marker(part, lines.slice(0, end))}`].join('\n')}\n*** End Patch\n`;
  }
  const oldMarker = marker(part - 1, lines.slice(0, start));
  const replacement = chunk.map((line) => `+${line}`);
  if (part < PATCH_PART_COUNT) replacement.push(`+${marker(part, lines.slice(0, end))}`);
  return `*** Begin Patch\n*** Update File: ${REGISTRY_PATH}\n@@\n-${oldMarker}\n${replacement.join('\n')}\n*** End Patch\n`;
}

function fullPatch(content) {
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Begin Patch\n*** Add File: ${REGISTRY_PATH}\n${lines.map((line) => `+${line}`).join('\n')}\n*** End Patch\n`;
}

function main() {
  const partArgument = process.argv.find((argument) => argument.startsWith('--emit-patch-part='));
  if (!process.argv.includes('--emit-patch') && partArgument === undefined) throw new Error('use --emit-patch or --emit-patch-part=N; the builder never writes repository files directly');
  const part = partArgument === undefined ? 1 : Number(partArgument.split('=')[1]);
  assertWorktree(part);
  const content = prettyV6(buildRegistry());
  process.stdout.write(partArgument === undefined ? fullPatch(content) : patchPart(content, part));
}

main();
