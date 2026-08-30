#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  TRD2_V6_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS1_PATHS,
  prettyV6,
  sha256Bytes,
  validateContentIdentity,
  validateOutputPathRegistry,
  validateParserGrammarAndCorpus,
  validateSourceCaptureManifest,
} from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS2_PATHS,
  TRD2_V6_PASS2_TOOLCHAIN_PATHS,
  TRD2_V6_PASS2_TOOLCHAIN_REGISTRY_PATH,
  makeClosedSchemaRegistry,
  pass2ToolchainRoot,
  validateClosedSchemaRegistry,
  validatePass2ToolchainRegistry,
} from './trd2-v6-pass2-core.mjs';

const [REGISTRY_PATH] = TRD2_V6_PASS2_PATHS;
const [SOURCE_CAPTURE_PATH, PARSER_CORPUS_PATH, , , , PASS1_QA_PATH] = TRD2_V6_PASS1_PATHS;
const PATCH_PART_COUNT = 16;

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
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
  if (part === 1 && paths.length !== 0) throw new Error('Pass 2 registry construction requires a clean worktree for part 1');
  if (part > 1 && (paths.length !== 1 || paths[0] !== REGISTRY_PATH)) throw new Error('Pass 2 registry continuation requires only the partial registry path');
  for (const logicalPath of TRD2_V6_PASS2_PATHS.slice(1)) if (fs.existsSync(logicalPath)) throw new Error(`Pass 2 output appeared before its construction step: ${logicalPath}`);
}

function toolchainRows(observedHead) {
  return TRD2_V6_PASS2_TOOLCHAIN_PATHS.map((logicalPath) => {
    const bytes = readCommitBlob(observedHead, logicalPath);
    return { byteLength: bytes.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(bytes) };
  });
}

function buildRegistry() {
  const observedHead = runGit(['rev-parse', 'HEAD']).trim();
  const observedObjectFormat = runGit(['rev-parse', '--show-object-format']).trim();
  const outputRegistryBytes = readCommitBlob(observedHead, TRD2_V6_OUTPUT_REGISTRY_PATH);
  const toolchainRegistryBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_TOOLCHAIN_REGISTRY_PATH);
  validateOutputPathRegistry(JSON.parse(outputRegistryBytes.toString('utf8')));
  validatePass2ToolchainRegistry(JSON.parse(toolchainRegistryBytes.toString('utf8')));
  const sourceCapture = validateSourceCaptureManifest(JSON.parse(readCommitBlob(observedHead, SOURCE_CAPTURE_PATH).toString('utf8')));
  const parserCorpus = validateParserGrammarAndCorpus(JSON.parse(readCommitBlob(observedHead, PARSER_CORPUS_PATH).toString('utf8')));
  const pass1Qa = JSON.parse(readCommitBlob(observedHead, PASS1_QA_PATH).toString('utf8'));
  validateContentIdentity(pass1Qa, 'TRD2V6-PASS1-QA', 'PASS1-PRODUCER-QA', 'CONNECT-TRD2-V6-PASS1-PRODUCER-QA-V1');
  if (pass1Qa.status !== 'PASS-1-LOCAL-CANDIDATE-COMPLETE-EXTERNAL-CLOSURE-ZERO' || pass1Qa.acceptanceState.acceptedRequirements !== 0 || pass1Qa.acceptanceState.findingClosure !== '0/15') throw new Error('Pass 1 QA is not a safe zero-credit predecessor');
  const toolchain = toolchainRows(observedHead);
  const provenance = {
    observedHead,
    observedObjectFormat,
    outputRegistrySha256: sha256Bytes(outputRegistryBytes),
    parserCorpusRoot: parserCorpus.artifactRoot,
    pass1QaRoot: pass1Qa.artifactRoot,
    sourceCaptureRoot: sourceCapture.artifactRoot,
    toolchain,
    toolchainRegistrySha256: sha256Bytes(toolchainRegistryBytes),
    toolchainRoot: pass2ToolchainRoot(toolchain),
  };
  return validateClosedSchemaRegistry(makeClosedSchemaRegistry(provenance));
}

function marker(part, prefixLines) {
  const prefixBytes = Buffer.from(`${prefixLines.join('\n')}\n`, 'utf8');
  return `__TRD2_V6_PASS2_PART_${String(part).padStart(2, '0')}_PREFIX_SHA256_${sha256Bytes(prefixBytes)}__`;
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
