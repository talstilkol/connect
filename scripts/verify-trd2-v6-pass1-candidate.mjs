#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  TRD2_V6_EXPECTED_LEDGER_SHA256,
  TRD2_V6_EXTERNAL_PATHS,
  TRD2_V6_F015_DEPENDENT_PATHS,
  TRD2_V6_NORMATIVE_PATHS,
  TRD2_V6_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS1_PATHS,
  TRD2_V6_PRODUCER_PATHS,
  TRD2_V6_TOOLCHAIN_REGISTRY_PATH,
  assertClosedObject,
  canonicalV6,
  sha256Bytes,
  validateContentIdentity,
  validateOutputPathRegistry,
  validateParserGrammarAndCorpus,
  validateParserReport,
  validatePass1GenerationReceipt,
  validateSourceCaptureManifest,
  validateToolchainPathRegistry,
} from './trd2-v6-core.mjs';

const [SOURCE_CAPTURE_PATH, CORPUS_PATH, RECEIPT_PATH, PARSER_A_PATH, PARSER_B_PATH, QA_PATH] = TRD2_V6_PASS1_PATHS;

function runGit(args, encoding = 'utf8', input) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, input, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) {
    const stderr = encoding === null ? result.stderr.toString('utf8') : result.stderr;
    throw new Error(`git ${args.join(' ')} failed: ${stderr.trim()}`);
  }
  return result.stdout;
}

function readCommitBlob(commit, logicalPath) {
  return runGit(['show', `${commit}:${logicalPath}`], null);
}

function assertWorktreeMode() {
  const records = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null)
    .toString('utf8').split('\0').filter(Boolean);
  if (records.length === 0) return 'COMMITTED-CLEAN';
  const observed = records.map((record) => record.slice(3));
  const allowed = new Set(TRD2_V6_PASS1_PATHS);
  if (observed.length !== allowed.size || observed.some((logicalPath) => !allowed.has(logicalPath))) throw new Error('Pass 1 verifier found an unrelated or incomplete worktree change');
  return 'UNTRACKED-CANDIDATE';
}

function verifyLedgerBlobAbsence(observedHead) {
  const objectLines = runGit(['rev-list', '--objects', observedHead]).trim().split('\n').filter(Boolean);
  const objectIds = objectLines.map((line) => line.split(' ', 1)[0]);
  const checks = runGit(['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], 'utf8', `${objectIds.join('\n')}\n`)
    .trim().split('\n').filter(Boolean);
  const candidates = checks
    .map((line) => line.split(' '))
    .filter(([, type, size]) => type === 'blob' && Number(size) === 98306)
    .map(([objectId]) => objectId);
  const matches = candidates.filter((objectId) => sha256Bytes(runGit(['cat-file', 'blob', objectId], null)) === TRD2_V6_EXPECTED_LEDGER_SHA256);
  return { candidateCount: candidates.length, matchCount: matches.length };
}

function verifyOutputBoundary() {
  for (const logicalPath of TRD2_V6_PASS1_PATHS) if (!fs.existsSync(logicalPath)) throw new Error(`missing Pass 1 output: ${logicalPath}`);
  const futurePaths = [
    ...TRD2_V6_NORMATIVE_PATHS.filter((logicalPath) => !TRD2_V6_PASS1_PATHS.includes(logicalPath)),
    ...TRD2_V6_PRODUCER_PATHS.filter((logicalPath) => !TRD2_V6_PASS1_PATHS.includes(logicalPath)),
    ...TRD2_V6_EXTERNAL_PATHS,
  ];
  for (const logicalPath of futurePaths) if (fs.existsSync(logicalPath)) throw new Error(`future or external TRD-2 v6 output appeared during Pass 1: ${logicalPath}`);
}

function verifySourceCaptureAgainstCommit(manifest) {
  for (const source of manifest.sources) {
    validateContentIdentity(source, 'TRD2V6-SOURCE', 'SOURCE-CAPTURE-ROW', 'CONNECT-TRD2-V6-SOURCE-CAPTURE-ROW-V1', 'sourceId', 'sourceRoot');
    const bytes = readCommitBlob(manifest.observedHead, source.logicalPath);
    if (bytes.length !== source.byteLength || sha256Bytes(bytes) !== source.sha256) throw new Error(`source capture mismatch: ${source.logicalPath}`);
  }
  for (const row of manifest.f015Disposition.directOccurrences) {
    validateContentIdentity(row, 'TRD2V6-F015-OCCURRENCE', 'F015-DIRECT-OCCURRENCE', 'CONNECT-TRD2-V6-F015-OCCURRENCE-V1', 'occurrenceId', 'occurrenceRoot');
    const bytes = readCommitBlob(manifest.observedHead, row.logicalPath);
    const observedLiteral = bytes.subarray(row.startByte, row.endByte).toString('utf8');
    const observedLine = bytes.subarray(0, row.startByte).toString('utf8').split('\n').length;
    if (observedLiteral !== TRD2_V6_EXPECTED_LEDGER_SHA256 || observedLine !== row.line || sha256Bytes(bytes) !== row.sourceSha256) throw new Error(`F015 direct occurrence mismatch: ${row.occurrenceId}`);
  }
  if (manifest.f015Disposition.directOccurrences.length !== 5 || manifest.f015Disposition.directOccurrenceCount !== 5) throw new Error('F015 direct occurrence denominator mismatch');
  if (canonicalV6(manifest.f015Disposition.dependentArtifacts.map(({ logicalPath }) => logicalPath)) !== canonicalV6(TRD2_V6_F015_DEPENDENT_PATHS)) throw new Error('F015 dependent artifact path denominator mismatch');
  for (const row of manifest.f015Disposition.dependentArtifacts) {
    const bytes = readCommitBlob(manifest.observedHead, row.logicalPath);
    if (bytes.length !== row.byteLength || sha256Bytes(bytes) !== row.observedSha256) throw new Error(`F015 dependent artifact mismatch: ${row.logicalPath}`);
  }
  const acquisition = verifyLedgerBlobAbsence(manifest.observedHead);
  if (acquisition.matchCount !== 0 || acquisition.candidateCount !== manifest.f015Disposition.candidateBlobCountOfExpectedSize) throw new Error('F015 content-addressed acquisition evidence mismatch');
}

function validateQa(qa, { corpus, parserA, parserB, receipt, sourceCapture }) {
  assertClosedObject(qa, ['acceptanceState', 'artifactClass', 'artifactId', 'artifactRoot', 'claimLimit', 'developmentFreeze', 'f015', 'gate29', 'generationReceiptRoot', 'observedHead', 'parserAgreement', 'parserCorpusRoot', 'passState', 'repositoryVisibility', 'schemaVersion', 'sourceCaptureRoot', 'status', 'toolchainRoot'], 'pass1Qa');
  assertClosedObject(qa.acceptanceState, ['acceptedRequirements', 'definitionAcceptance', 'findingClosure', 'reconciliation', 'reviewGenerations'], 'pass1Qa.acceptanceState');
  assertClosedObject(qa.f015, ['branch', 'closureCredit', 'exactBlobMatches', 'rederivationState', 'silentSubstitutionCount'], 'pass1Qa.f015');
  assertClosedObject(qa.parserAgreement, ['disagreementCount', 'outcomeCount', 'outcomeRoot', 'parserAReportRoot', 'parserBReportRoot', 'status'], 'pass1Qa.parserAgreement');
  assertClosedObject(qa.passState, ['pass1', 'pass2', 'pass3', 'pass4', 'pass5', 'pass6'], 'pass1Qa.passState');
  validateContentIdentity(qa, 'TRD2V6-PASS1-QA', 'PASS1-PRODUCER-QA', 'CONNECT-TRD2-V6-PASS1-PRODUCER-QA-V1');
  if (
    qa.sourceCaptureRoot !== sourceCapture.artifactRoot
    || qa.parserCorpusRoot !== corpus.artifactRoot
    || qa.generationReceiptRoot !== receipt.artifactRoot
    || qa.parserAgreement.parserAReportRoot !== parserA.artifactRoot
    || qa.parserAgreement.parserBReportRoot !== parserB.artifactRoot
    || qa.parserAgreement.outcomeRoot !== parserA.outcomeRoot
    || qa.parserAgreement.disagreementCount !== 0
    || qa.parserAgreement.outcomeCount !== parserA.outcomeCount
    || qa.parserAgreement.status !== 'PASS-LOCAL-TWO-IMPLEMENTATION-AGREEMENT-NOT-INDEPENDENT-ACCEPTANCE'
    || qa.toolchainRoot !== receipt.toolchainRoot
  ) throw new Error('Pass 1 QA binding mismatch');
  if (
    qa.status !== 'PASS-1-LOCAL-CANDIDATE-COMPLETE-EXTERNAL-CLOSURE-ZERO'
    || qa.schemaVersion !== 'CONNECT-TRD2-V6-PASS1-PRODUCER-QA-V1'
    || qa.repositoryVisibility !== 'PUBLIC'
    || qa.developmentFreeze !== 'ACTIVE'
    || qa.gate29 !== 'BLOCKED'
    || qa.observedHead !== receipt.observedHead
    || qa.passState.pass1 !== 'COMPLETE-LOCAL-CANDIDATE-NOT-ACCEPTED'
    || Object.values(qa.passState).slice(1).some((status) => status !== 'PENDING')
    || qa.acceptanceState.acceptedRequirements !== 0
    || qa.acceptanceState.findingClosure !== '0/15'
    || qa.acceptanceState.reviewGenerations !== '0/2'
    || qa.acceptanceState.reconciliation !== 'ABSENT'
    || qa.acceptanceState.definitionAcceptance !== 'ABSENT'
    || qa.f015.branch !== sourceCapture.f015Disposition.branch
    || qa.f015.closureCredit !== 0
    || qa.f015.exactBlobMatches !== sourceCapture.f015Disposition.exactBlobMatches
    || qa.f015.rederivationState !== sourceCapture.f015Disposition.rederivationState
    || qa.f015.silentSubstitutionCount !== sourceCapture.f015Disposition.silentSubstitutionCount
  ) throw new Error('Pass 1 QA overclaims completion or Acceptance');
  return qa;
}

function main() {
  const worktreeMode = assertWorktreeMode();
  verifyOutputBoundary();
  const outputRegistryBytes = readCommitBlob(JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8')).observedHead, TRD2_V6_OUTPUT_REGISTRY_PATH);
  const toolchainRegistryBytes = readCommitBlob(JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8')).observedHead, TRD2_V6_TOOLCHAIN_REGISTRY_PATH);
  validateOutputPathRegistry(JSON.parse(outputRegistryBytes.toString('utf8')));
  validateToolchainPathRegistry(JSON.parse(toolchainRegistryBytes.toString('utf8')));
  const sourceCapture = validateSourceCaptureManifest(JSON.parse(fs.readFileSync(SOURCE_CAPTURE_PATH, 'utf8')));
  const corpus = validateParserGrammarAndCorpus(JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8')));
  const receipt = validatePass1GenerationReceipt(JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8')));
  if (sha256Bytes(outputRegistryBytes) !== receipt.outputRegistry.sha256 || sha256Bytes(toolchainRegistryBytes) !== receipt.toolchainRegistry.sha256) throw new Error('generation receipt registry binding mismatch');
  for (const row of receipt.toolchain) {
    const bytes = readCommitBlob(receipt.observedHead, row.logicalPath);
    if (bytes.length !== row.byteLength || sha256Bytes(bytes) !== row.sha256) throw new Error(`frozen toolchain mismatch: ${row.logicalPath}`);
  }
  const generatedByPath = new Map(receipt.generatedArtifacts.map((row) => [row.logicalPath, row]));
  if (generatedByPath.get(SOURCE_CAPTURE_PATH)?.artifactRoot !== sourceCapture.artifactRoot || generatedByPath.get(CORPUS_PATH)?.artifactRoot !== corpus.artifactRoot) throw new Error('generation receipt artifact binding mismatch');
  verifySourceCaptureAgainstCommit(sourceCapture);
  const parserA = validateParserReport(JSON.parse(fs.readFileSync(PARSER_A_PATH, 'utf8')), corpus);
  const parserB = validateParserReport(JSON.parse(fs.readFileSync(PARSER_B_PATH, 'utf8')), corpus);
  if (parserA.parserId !== 'PARSER-A' || parserB.parserId !== 'PARSER-B' || parserA.sourceSha256 === parserB.sourceSha256 || parserA.toolchainRoot !== receipt.toolchainRoot || parserB.toolchainRoot !== receipt.toolchainRoot) throw new Error('parser provenance or separation mismatch');
  if (canonicalV6(parserA.outcomes) !== canonicalV6(parserB.outcomes) || parserA.outcomeRoot !== parserB.outcomeRoot || parserA.mismatchCount !== 0 || parserB.mismatchCount !== 0) throw new Error('Parser A/B outcomes disagree');
  const qa = validateQa(JSON.parse(fs.readFileSync(QA_PATH, 'utf8')), { corpus, parserA, parserB, receipt, sourceCapture });
  process.stdout.write(`${JSON.stringify({
    acceptance: 0,
    f015Branch: sourceCapture.f015Disposition.branch,
    f015ClosureCredit: qa.f015.closureCredit,
    findingClosure: qa.acceptanceState.findingClosure,
    observedHead: receipt.observedHead,
    parserAgreement: `${parserA.outcomeCount}/${parserA.outcomeCount}`,
    parserOutcomeRoot: parserA.outcomeRoot,
    pass: 1,
    status: qa.status,
    worktreeMode,
  }, null, 2)}\n`);
}

main();
