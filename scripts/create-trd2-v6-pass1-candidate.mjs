#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  TRD2_V6_DATE,
  TRD2_V6_EXPECTED_LEDGER_SHA256,
  TRD2_V6_EXTERNAL_PATHS,
  TRD2_V6_F015_DEPENDENT_PATHS,
  TRD2_V6_F015_OBSERVATION_PATHS,
  TRD2_V6_NORMATIVE_PATHS,
  TRD2_V6_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS1_PATHS,
  TRD2_V6_PREDECESSOR_SOURCES,
  TRD2_V6_PRODUCER_PATHS,
  TRD2_V6_TOOLCHAIN_PATHS,
  TRD2_V6_TOOLCHAIN_REGISTRY_PATH,
  attachContentIdentity,
  makeParserGrammarAndCorpus,
  prettyV6,
  rootV6,
  sha256Bytes,
  toolchainRoot,
  validateOutputPathRegistry,
  validateParserGrammarAndCorpus,
  validateSourceCaptureManifest,
  validateToolchainPathRegistry,
} from './trd2-v6-core.mjs';

const SOURCE_CAPTURE_PATH = TRD2_V6_PASS1_PATHS[0];
const PARSER_CORPUS_PATH = TRD2_V6_PASS1_PATHS[1];
const GENERATION_RECEIPT_PATH = TRD2_V6_PASS1_PATHS[2];
const CHARTER_PATH = `docs/planning/section-35-6-trd-2-v6-successor-build-charter-${TRD2_V6_DATE}.md`;
const CURRENT_LEDGER_PATH = 'docs/planning/master-plan-recovery-ledger-2026-08-29.md';
const V4_REVIEW_PATH = 'docs/planning/section-35-6-trd-2-v4-immutable-successor-requirements-independent-hostile-review-2026-08-29.md';
const V4_FINDINGS_PATH = 'docs/planning/section-35-6-trd-2-v4-immutable-successor-requirements-independent-hostile-review-findings-manifest-2026-08-29.md';

function runGit(args, encoding = 'utf8', input) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding,
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const stderr = encoding === null ? result.stderr.toString('utf8') : result.stderr;
    throw new Error(`git ${args.join(' ')} failed: ${stderr.trim()}`);
  }
  return result.stdout;
}

function readCommitBlob(commit, logicalPath) {
  return runGit(['show', `${commit}:${logicalPath}`], null);
}

function patchFor(logicalPath, content) {
  if (fs.existsSync(logicalPath)) throw new Error(`immutable output already exists: ${logicalPath}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Add File: ${logicalPath}\n${lines.map((line) => `+${line}`).join('\n')}\n`;
}

function emitPatch(files) {
  let patch = '*** Begin Patch\n';
  for (const [logicalPath, content] of files) patch += patchFor(logicalPath, content);
  patch += '*** End Patch\n';
  process.stdout.write(patch);
}

function assertCleanAndOutputsAbsent() {
  const status = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null);
  if (status.length !== 0) throw new Error('TRD-2 v6 Pass 1 requires a completely clean worktree');
  for (const logicalPath of [...TRD2_V6_NORMATIVE_PATHS, ...TRD2_V6_PRODUCER_PATHS, ...TRD2_V6_EXTERNAL_PATHS]) {
    if (fs.existsSync(logicalPath)) throw new Error(`predeclared immutable output already exists: ${logicalPath}`);
  }
}

function sourceRow(commit, role, logicalPath, expectedSha256 = null) {
  const bytes = readCommitBlob(commit, logicalPath);
  const sha256 = sha256Bytes(bytes);
  if (expectedSha256 !== null && sha256 !== expectedSha256) throw new Error(`${role}: frozen predecessor root mismatch`);
  const body = {
    byteLength: bytes.length,
    capture: {
      captureSha256: sha256,
      contentAddress: `sha256:${sha256}`,
      endByte: bytes.length,
      kind: 'GIT-COMMIT-PATH-FULL-MEMBER',
      observedCommit: commit,
      repositoryRelativePath: logicalPath,
      startByte: 0,
    },
    logicalPath,
    observedCommit: commit,
    role,
    sha256,
  };
  return attachContentIdentity('TRD2V6-SOURCE', 'SOURCE-CAPTURE-ROW', 'CONNECT-TRD2-V6-SOURCE-CAPTURE-ROW-V1', body, 'sourceId', 'sourceRoot');
}

function localLedgerBlobAcquisition(observedHead) {
  const objectLines = runGit(['rev-list', '--objects', observedHead]).trim().split('\n').filter(Boolean);
  const objectIds = objectLines.map((line) => line.split(' ', 1)[0]);
  const checkInput = `${objectIds.join('\n')}\n`;
  const checks = runGit(['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], 'utf8', checkInput)
    .trim().split('\n').filter(Boolean);
  const candidates = checks
    .map((line) => line.split(' '))
    .filter(([, type, size]) => type === 'blob' && Number(size) === 98306)
    .map(([objectId]) => objectId);
  const matches = candidates.filter((objectId) => sha256Bytes(runGit(['cat-file', 'blob', objectId], null)) === TRD2_V6_EXPECTED_LEDGER_SHA256);
  return { candidateBlobCountOfExpectedSize: candidates.length, exactBlobMatchOids: matches };
}

function directOccurrences(observedHead) {
  const needle = Buffer.from(TRD2_V6_EXPECTED_LEDGER_SHA256, 'utf8');
  const rows = [];
  for (const logicalPath of TRD2_V6_F015_OBSERVATION_PATHS) {
    const bytes = readCommitBlob(observedHead, logicalPath);
    let cursor = 0;
    while (cursor <= bytes.length - needle.length) {
      const startByte = bytes.indexOf(needle, cursor);
      if (startByte === -1) break;
      const endByte = startByte + needle.length;
      const line = bytes.subarray(0, startByte).toString('utf8').split('\n').length;
      const body = {
        endByte,
        line,
        logicalPath,
        matchedSha256Literal: TRD2_V6_EXPECTED_LEDGER_SHA256,
        sourceSha256: sha256Bytes(bytes),
        startByte,
      };
      rows.push(attachContentIdentity('TRD2V6-F015-OCCURRENCE', 'F015-DIRECT-OCCURRENCE', 'CONNECT-TRD2-V6-F015-OCCURRENCE-V1', body, 'occurrenceId', 'occurrenceRoot'));
      cursor = endByte;
    }
  }
  return rows;
}

function buildSourceCapture(observedHead, observedObjectFormat) {
  const rows = TRD2_V6_PREDECESSOR_SOURCES.map(([role, logicalPath, expectedSha256]) => sourceRow(observedHead, role, logicalPath, expectedSha256));
  for (const [role, logicalPath] of [
    ['V6-CONSTRUCTION-CHARTER', CHARTER_PATH],
    ['CURRENT-RECOVERY-LEDGER', CURRENT_LEDGER_PATH],
    ['V4-REVIEW-F015-SOURCE', V4_REVIEW_PATH],
    ['V4-FINDINGS-F015-SOURCE', V4_FINDINGS_PATH],
  ]) {
    if (!rows.some((row) => row.logicalPath === logicalPath)) rows.push(sourceRow(observedHead, role, logicalPath));
  }
  rows.sort((left, right) => Buffer.compare(Buffer.from(left.sourceId, 'utf8'), Buffer.from(right.sourceId, 'utf8')));
  const acquisition = localLedgerBlobAcquisition(observedHead);
  if (acquisition.exactBlobMatchOids.length !== 0) throw new Error('F015 exact predecessor appeared; freeze and review the ACQUIRE branch instead of emitting INVALIDATE-AND-REDERIVE');
  const observations = directOccurrences(observedHead);
  if (observations.length !== 5) throw new Error(`F015 direct occurrence denominator changed: ${observations.length}`);
  const dependentArtifacts = TRD2_V6_F015_DEPENDENT_PATHS.map((logicalPath) => {
    const bytes = readCommitBlob(observedHead, logicalPath);
    let disposition = 'INVALIDATED-F015-DEPENDENCY-PENDING-REDERIVATION';
    if (logicalPath === CURRENT_LEDGER_PATH) disposition = 'NEW-FROZEN-REPLACEMENT-SOURCE';
    if (logicalPath === CHARTER_PATH) disposition = 'RETAINED-BRANCH-INSTRUCTION';
    return {
      byteLength: bytes.length,
      disposition,
      logicalPath,
      observedSha256: sha256Bytes(bytes),
    };
  });
  const replacementLedger = rows.find((row) => row.logicalPath === CURRENT_LEDGER_PATH);
  const body = {
    artifactClass: 'PLANNING-ONLY; PASS-1-NORMATIVE-CANDIDATE-MEMBER; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE',
    claimLimit: 'EXACT-SOURCE-CUSTODY-AND-F015-BRANCH-ONLY; REDERIVATION-AND-CLOSURE-PENDING',
    developmentFreeze: 'ACTIVE',
    f015Disposition: {
      acquisitionScope: 'ALL-GIT-BLOBS-REACHABLE-FROM-OBSERVED-HEAD; EXPECTED-SIZE-AND-SHA256-MATCH',
      branch: 'INVALIDATE-AND-REDERIVE',
      candidateBlobCountOfExpectedSize: acquisition.candidateBlobCountOfExpectedSize,
      closureCredit: 0,
      dependentArtifacts,
      directOccurrenceCount: observations.length,
      directOccurrences: observations,
      exactBlobMatchOids: acquisition.exactBlobMatchOids,
      exactBlobMatches: acquisition.exactBlobMatchOids.length,
      expectedLedgerByteLength: 98306,
      expectedLedgerLineCount: 993,
      expectedLedgerSha256: TRD2_V6_EXPECTED_LEDGER_SHA256,
      observationPaths: TRD2_V6_F015_OBSERVATION_PATHS,
      rederivationState: 'PENDING-PASSES-2-TO-6-AND-INDEPENDENT-REVIEW',
      replacementLedger: {
        byteLength: replacementLedger.byteLength,
        logicalPath: replacementLedger.logicalPath,
        observedCommit: replacementLedger.observedCommit,
        sha256: replacementLedger.sha256,
      },
      silentSubstitutionCount: 0,
    },
    gate29: 'BLOCKED',
    observedHead,
    observedObjectFormat,
    repositoryVisibility: 'PUBLIC',
    schemaVersion: 'CONNECT-TRD2-V6-SOURCE-CAPTURE-MANIFEST-V1',
    sourceCollectionRoot: rootV6('SOURCE-CAPTURE-COLLECTION', 'CONNECT-TRD2-V6-SOURCE-CAPTURE-MANIFEST-V1', rows),
    sourceCount: rows.length,
    sources: rows,
  };
  const manifest = attachContentIdentity('TRD2V6-SOURCE-CAPTURE', 'SOURCE-CAPTURE-MANIFEST', body.schemaVersion, body);
  validateSourceCaptureManifest(manifest);
  return manifest;
}

function buildToolchainRows(observedHead) {
  return TRD2_V6_TOOLCHAIN_PATHS.map((logicalPath) => {
    const bytes = readCommitBlob(observedHead, logicalPath);
    return { byteLength: bytes.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(bytes) };
  });
}

function build() {
  if (!process.argv.includes('--emit-patch')) throw new Error('use --emit-patch; the builder never writes repository files directly');
  assertCleanAndOutputsAbsent();
  const outputRegistryBytes = fs.readFileSync(TRD2_V6_OUTPUT_REGISTRY_PATH);
  const toolchainRegistryBytes = fs.readFileSync(TRD2_V6_TOOLCHAIN_REGISTRY_PATH);
  const outputRegistry = validateOutputPathRegistry(JSON.parse(outputRegistryBytes.toString('utf8')));
  const toolchainRegistry = validateToolchainPathRegistry(JSON.parse(toolchainRegistryBytes.toString('utf8')));
  if (JSON.stringify(toolchainRegistry.toolchainPaths) !== JSON.stringify(TRD2_V6_TOOLCHAIN_PATHS)) throw new Error('toolchain registry drift');
  if (JSON.stringify(outputRegistry.passOneEmittedPaths) !== JSON.stringify(TRD2_V6_PASS1_PATHS)) throw new Error('Pass 1 registry drift');
  const observedHead = runGit(['rev-parse', 'HEAD']).trim();
  const observedObjectFormat = runGit(['rev-parse', '--show-object-format']).trim();
  const sourceCapture = buildSourceCapture(observedHead, observedObjectFormat);
  const parserCorpus = makeParserGrammarAndCorpus();
  validateParserGrammarAndCorpus(parserCorpus);
  const toolchain = buildToolchainRows(observedHead);
  const frozenToolchainRoot = toolchainRoot(toolchain);
  const receiptBody = {
    artifactClass: 'PRODUCER-ONLY; PASS-1-GENERATION-RECEIPT; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE',
    claimLimit: 'PASS-1-BASE-ARTIFACT-GENERATION-ONLY; PARSER-REPORTS-AND-ALL-LATER-PASSES-PENDING',
    developmentFreeze: 'ACTIVE',
    f015Branch: sourceCapture.f015Disposition.branch,
    gate29: 'BLOCKED',
    generatedArtifacts: [
      { artifactRoot: sourceCapture.artifactRoot, logicalPath: SOURCE_CAPTURE_PATH, schemaVersion: sourceCapture.schemaVersion },
      { artifactRoot: parserCorpus.artifactRoot, logicalPath: PARSER_CORPUS_PATH, schemaVersion: parserCorpus.schemaVersion },
    ],
    observedHead,
    outputRegistry: { logicalPath: TRD2_V6_OUTPUT_REGISTRY_PATH, sha256: sha256Bytes(outputRegistryBytes) },
    pass: 1,
    repositoryVisibility: 'PUBLIC',
    schemaVersion: 'CONNECT-TRD2-V6-PASS1-GENERATION-RECEIPT-V1',
    status: 'BASE-GENERATED-PENDING-PARSER-A-AND-PARSER-B',
    toolchain,
    toolchainRegistry: { logicalPath: TRD2_V6_TOOLCHAIN_REGISTRY_PATH, sha256: sha256Bytes(toolchainRegistryBytes) },
    toolchainRoot: frozenToolchainRoot,
  };
  const receipt = attachContentIdentity('TRD2V6-GENERATION-RECEIPT', 'PASS1-GENERATION-RECEIPT', receiptBody.schemaVersion, receiptBody);
  emitPatch([
    [SOURCE_CAPTURE_PATH, prettyV6(sourceCapture)],
    [PARSER_CORPUS_PATH, prettyV6(parserCorpus)],
    [GENERATION_RECEIPT_PATH, prettyV6(receipt)],
  ]);
}

build();
