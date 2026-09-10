#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  TRD2_V6_PASS1_PATHS,
  makeParserReport,
  sha256Bytes,
  validateContentIdentity,
  validateParserGrammarAndCorpus,
} from './trd2-v6-core.mjs';

const SOURCE_CAPTURE_PATH = TRD2_V6_PASS1_PATHS[0];
const CORPUS_PATH = TRD2_V6_PASS1_PATHS[1];
const RECEIPT_PATH = TRD2_V6_PASS1_PATHS[2];
const REPORT_PATH = TRD2_V6_PASS1_PATHS[3];
const SCRIPT_PATH = 'scripts/verify-trd2-v6-parser-a.mjs';

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 128 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function assertExpectedWorktree() {
  const records = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null)
    .toString('utf8').split('\0').filter(Boolean);
  const observed = records.map((record) => record.slice(3));
  const allowed = new Set([SOURCE_CAPTURE_PATH, CORPUS_PATH, RECEIPT_PATH]);
  if (observed.length !== allowed.size || observed.some((logicalPath) => !allowed.has(logicalPath))) throw new Error('Parser A requires exactly the three immutable untracked Pass 1 base outputs');
  if (fs.existsSync(REPORT_PATH)) throw new Error('Parser A report already exists');
}

function patchFor(logicalPath, content) {
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Begin Patch\n*** Add File: ${logicalPath}\n${lines.map((line) => `+${line}`).join('\n')}\n*** End Patch\n`;
}

function main() {
  if (!process.argv.includes('--emit-patch')) throw new Error('use --emit-patch; Parser A never writes repository files directly');
  assertExpectedWorktree();
  const artifact = validateParserGrammarAndCorpus(JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8')));
  const receipt = JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8'));
  validateContentIdentity(receipt, 'TRD2V6-GENERATION-RECEIPT', 'PASS1-GENERATION-RECEIPT', 'CONNECT-TRD2-V6-PASS1-GENERATION-RECEIPT-V1');
  if (receipt.generatedArtifacts.find((row) => row.logicalPath === CORPUS_PATH)?.artifactRoot !== artifact.artifactRoot) throw new Error('Parser A corpus is not bound by the generation receipt');
  const sourceSha256 = sha256Bytes(fs.readFileSync(SCRIPT_PATH));
  const frozenSource = receipt.toolchain.find((row) => row.logicalPath === SCRIPT_PATH);
  if (!frozenSource || frozenSource.sha256 !== sourceSha256) throw new Error('Parser A source differs from the frozen toolchain');
  const report = makeParserReport({
    artifact,
    implementation: 'NODE-STDLIB-CUSTOM-RECURSIVE-DESCENT-V1',
    parserId: 'PARSER-A',
    sourceSha256,
    toolchainRoot: receipt.toolchainRoot,
  });
  const output = `${JSON.stringify(report, null, 2)}\n`;
  process.stdout.write(patchFor(REPORT_PATH, output));
}

main();
