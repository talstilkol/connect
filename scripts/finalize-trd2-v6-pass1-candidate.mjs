#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  TRD2_V6_PASS1_PATHS,
  attachContentIdentity,
  canonicalV6,
  validateParserGrammarAndCorpus,
  validateParserReport,
  validatePass1GenerationReceipt,
  validateSourceCaptureManifest,
} from './trd2-v6-core.mjs';

const [SOURCE_CAPTURE_PATH, CORPUS_PATH, RECEIPT_PATH, PARSER_A_PATH, PARSER_B_PATH, QA_PATH] = TRD2_V6_PASS1_PATHS;

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 128 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function assertExpectedWorktree() {
  const records = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null)
    .toString('utf8').split('\0').filter(Boolean);
  const observed = records.map((record) => record.slice(3));
  const allowed = new Set([SOURCE_CAPTURE_PATH, CORPUS_PATH, RECEIPT_PATH, PARSER_A_PATH, PARSER_B_PATH]);
  if (observed.length !== allowed.size || observed.some((logicalPath) => !allowed.has(logicalPath))) throw new Error('Pass 1 finalizer requires exactly the five immutable untracked base/parser outputs');
  if (fs.existsSync(QA_PATH)) throw new Error('Pass 1 Producer QA already exists');
}

function patchFor(logicalPath, content) {
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Begin Patch\n*** Add File: ${logicalPath}\n${lines.map((line) => `+${line}`).join('\n')}\n*** End Patch\n`;
}

function main() {
  if (!process.argv.includes('--emit-patch')) throw new Error('use --emit-patch; the finalizer never writes repository files directly');
  assertExpectedWorktree();
  const sourceCapture = validateSourceCaptureManifest(JSON.parse(fs.readFileSync(SOURCE_CAPTURE_PATH, 'utf8')));
  const corpus = validateParserGrammarAndCorpus(JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8')));
  const receipt = validatePass1GenerationReceipt(JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8')));
  const parserA = validateParserReport(JSON.parse(fs.readFileSync(PARSER_A_PATH, 'utf8')), corpus);
  const parserB = validateParserReport(JSON.parse(fs.readFileSync(PARSER_B_PATH, 'utf8')), corpus);
  if (parserA.parserId !== 'PARSER-A' || parserB.parserId !== 'PARSER-B') throw new Error('Pass 1 parser identities are not disjoint');
  if (parserA.sourceSha256 === parserB.sourceSha256) throw new Error('Pass 1 parser source identities unexpectedly match');
  if (parserA.toolchainRoot !== receipt.toolchainRoot || parserB.toolchainRoot !== receipt.toolchainRoot) throw new Error('Pass 1 parser toolchain binding mismatch');
  const disagreementCount = canonicalV6(parserA.outcomes) === canonicalV6(parserB.outcomes) ? 0 : 1;
  if (disagreementCount !== 0 || parserA.outcomeRoot !== parserB.outcomeRoot || parserA.mismatchCount !== 0 || parserB.mismatchCount !== 0) throw new Error('Pass 1 parser disagreement blocks finalization');
  const body = {
    acceptanceState: {
      acceptedRequirements: 0,
      definitionAcceptance: 'ABSENT',
      findingClosure: '0/15',
      reconciliation: 'ABSENT',
      reviewGenerations: '0/2',
    },
    artifactClass: 'PRODUCER-ONLY; PASS-1-QA; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE',
    claimLimit: 'PASS-1-LOCAL-MECHANICAL-EVIDENCE-ONLY; PASSES-2-TO-6-AND-EXTERNAL-REVIEW-REMAIN-MANDATORY',
    developmentFreeze: 'ACTIVE',
    f015: {
      branch: sourceCapture.f015Disposition.branch,
      closureCredit: 0,
      exactBlobMatches: sourceCapture.f015Disposition.exactBlobMatches,
      rederivationState: sourceCapture.f015Disposition.rederivationState,
      silentSubstitutionCount: sourceCapture.f015Disposition.silentSubstitutionCount,
    },
    gate29: 'BLOCKED',
    generationReceiptRoot: receipt.artifactRoot,
    observedHead: receipt.observedHead,
    parserAgreement: {
      disagreementCount,
      outcomeCount: parserA.outcomeCount,
      outcomeRoot: parserA.outcomeRoot,
      parserAReportRoot: parserA.artifactRoot,
      parserBReportRoot: parserB.artifactRoot,
      status: 'PASS-LOCAL-TWO-IMPLEMENTATION-AGREEMENT-NOT-INDEPENDENT-ACCEPTANCE',
    },
    parserCorpusRoot: corpus.artifactRoot,
    passState: {
      pass1: 'COMPLETE-LOCAL-CANDIDATE-NOT-ACCEPTED',
      pass2: 'PENDING',
      pass3: 'PENDING',
      pass4: 'PENDING',
      pass5: 'PENDING',
      pass6: 'PENDING',
    },
    repositoryVisibility: 'PUBLIC',
    schemaVersion: 'CONNECT-TRD2-V6-PASS1-PRODUCER-QA-V1',
    sourceCaptureRoot: sourceCapture.artifactRoot,
    status: 'PASS-1-LOCAL-CANDIDATE-COMPLETE-EXTERNAL-CLOSURE-ZERO',
    toolchainRoot: receipt.toolchainRoot,
  };
  const qa = attachContentIdentity('TRD2V6-PASS1-QA', 'PASS1-PRODUCER-QA', body.schemaVersion, body);
  process.stdout.write(patchFor(QA_PATH, `${JSON.stringify(qa, null, 2)}\n`));
}

main();
