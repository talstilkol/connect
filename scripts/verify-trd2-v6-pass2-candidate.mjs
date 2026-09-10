#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  TRD2_V6_EXTERNAL_PATHS,
  TRD2_V6_NORMATIVE_PATHS,
  TRD2_V6_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS1_PATHS,
  TRD2_V6_PRODUCER_PATHS,
  canonicalV6,
  sha256Bytes,
  validateContentIdentity,
  validateOutputPathRegistry,
} from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS2_PATHS,
  TRD2_V6_PASS2_TOOLCHAIN_REGISTRY_PATH,
  validateCanonicalEngineReport,
  validateClosedSchemaRegistry,
  validatePass2ToolchainRegistry,
} from './trd2-v6-pass2-core.mjs';

const [REGISTRY_PATH, REPORT_A_PATH, REPORT_B_PATH] = TRD2_V6_PASS2_PATHS;

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function readCommitBlob(commitId, logicalPath) {
  return runGit(['show', `${commitId}:${logicalPath}`], null);
}

function assertWorktreeMode() {
  const paths = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null)
    .toString('utf8').split('\0').filter(Boolean).map((record) => record.slice(3));
  if (paths.length === 0) return 'COMMITTED-CLEAN';
  const allowed = new Set(TRD2_V6_PASS2_PATHS);
  if (paths.length !== allowed.size || paths.some((logicalPath) => !allowed.has(logicalPath))) throw new Error('Pass 2 verifier found an unrelated or incomplete worktree change');
  return 'WORKTREE-CANDIDATE';
}

function verifyOutputBoundary() {
  for (const logicalPath of [...TRD2_V6_PASS1_PATHS, ...TRD2_V6_PASS2_PATHS]) if (!fs.existsSync(logicalPath)) throw new Error(`required predecessor/current output missing: ${logicalPath}`);
  const future = [
    ...TRD2_V6_NORMATIVE_PATHS.filter((logicalPath) => !TRD2_V6_PASS1_PATHS.includes(logicalPath) && !TRD2_V6_PASS2_PATHS.includes(logicalPath)),
    ...TRD2_V6_PRODUCER_PATHS.filter((logicalPath) => !TRD2_V6_PASS1_PATHS.includes(logicalPath) && !TRD2_V6_PASS2_PATHS.includes(logicalPath)),
    ...TRD2_V6_EXTERNAL_PATHS,
  ];
  for (const logicalPath of future) if (fs.existsSync(logicalPath)) throw new Error(`future/external output appeared during Pass 2: ${logicalPath}`);
}

function main() {
  const worktreeMode = assertWorktreeMode();
  verifyOutputBoundary();
  const registry = validateClosedSchemaRegistry(JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')));
  const observedHead = registry.provenance.observedHead;
  const outputRegistryBytes = readCommitBlob(observedHead, TRD2_V6_OUTPUT_REGISTRY_PATH);
  const toolchainRegistryBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_TOOLCHAIN_REGISTRY_PATH);
  validateOutputPathRegistry(JSON.parse(outputRegistryBytes.toString('utf8')));
  validatePass2ToolchainRegistry(JSON.parse(toolchainRegistryBytes.toString('utf8')));
  if (sha256Bytes(outputRegistryBytes) !== registry.provenance.outputRegistrySha256 || sha256Bytes(toolchainRegistryBytes) !== registry.provenance.toolchainRegistrySha256) throw new Error('Pass 2 registry path-set provenance mismatch');
  for (const row of registry.provenance.toolchain) {
    const bytes = readCommitBlob(observedHead, row.logicalPath);
    if (bytes.length !== row.byteLength || sha256Bytes(bytes) !== row.sha256) throw new Error(`Pass 2 frozen toolchain mismatch: ${row.logicalPath}`);
  }
  const sourceCapture = JSON.parse(readCommitBlob(observedHead, TRD2_V6_PASS1_PATHS[0]).toString('utf8'));
  const parserCorpus = JSON.parse(readCommitBlob(observedHead, TRD2_V6_PASS1_PATHS[1]).toString('utf8'));
  const pass1Qa = JSON.parse(readCommitBlob(observedHead, TRD2_V6_PASS1_PATHS[5]).toString('utf8'));
  validateContentIdentity(sourceCapture, 'TRD2V6-SOURCE-CAPTURE', 'SOURCE-CAPTURE-MANIFEST', 'CONNECT-TRD2-V6-SOURCE-CAPTURE-MANIFEST-V1');
  validateContentIdentity(parserCorpus, 'TRD2V6-PARSER-CORPUS', 'PARSER-GRAMMAR-AND-CORPUS', 'CONNECT-TRD2-V6-PARSER-GRAMMAR-AND-CORPUS-V1');
  validateContentIdentity(pass1Qa, 'TRD2V6-PASS1-QA', 'PASS1-PRODUCER-QA', 'CONNECT-TRD2-V6-PASS1-PRODUCER-QA-V1');
  if (registry.provenance.sourceCaptureRoot !== sourceCapture.artifactRoot || registry.provenance.parserCorpusRoot !== parserCorpus.artifactRoot || registry.provenance.pass1QaRoot !== pass1Qa.artifactRoot) throw new Error('Pass 2 predecessor root binding mismatch');
  const reportA = validateCanonicalEngineReport(JSON.parse(fs.readFileSync(REPORT_A_PATH, 'utf8')), registry);
  const reportB = validateCanonicalEngineReport(JSON.parse(fs.readFileSync(REPORT_B_PATH, 'utf8')), registry);
  if (reportA.engineId !== 'CANONICAL-ENGINE-A' || reportB.engineId !== 'CANONICAL-ENGINE-B' || reportA.sourceSha256 === reportB.sourceSha256) throw new Error('Pass 2 engine separation mismatch');
  const frozenA = registry.provenance.toolchain.find(({ logicalPath }) => logicalPath === 'scripts/verify-trd2-v6-canonical-engine-a.mjs');
  const frozenB = registry.provenance.toolchain.find(({ logicalPath }) => logicalPath === 'scripts/verify-trd2-v6-canonical-engine-b.py');
  if (frozenA?.sha256 !== reportA.sourceSha256 || frozenB?.sha256 !== reportB.sourceSha256) throw new Error('Pass 2 engine source provenance mismatch');
  if (canonicalV6(reportA.outcomes) !== canonicalV6(reportB.outcomes) || reportA.outcomeRoot !== reportB.outcomeRoot || reportA.mismatchCount !== 0 || reportB.mismatchCount !== 0) throw new Error('Pass 2 canonical engines disagree');
  process.stdout.write(`${JSON.stringify({
    acceptance: 0,
    engineAgreement: `${registry.fixtureCount}/${registry.fixtureCount}`,
    findingClosure: '0/15',
    fixtureCount: registry.fixtureCount,
    observedHead,
    outcomeRoot: reportA.outcomeRoot,
    pass: 2,
    reviewGenerations: '0/2',
    schemaCount: registry.schemaCount,
    status: 'PASS-2-LOCAL-CANDIDATE-COMPLETE-EXTERNAL-CLOSURE-ZERO',
    worktreeMode,
  }, null, 2)}\n`);
}

main();
