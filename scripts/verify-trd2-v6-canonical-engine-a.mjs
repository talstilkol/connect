#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { prettyV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS2_PATHS,
  makeCanonicalEngineReport,
  validateClosedSchemaRegistry,
} from './trd2-v6-pass2-core.mjs';

const [REGISTRY_PATH, REPORT_PATH] = TRD2_V6_PASS2_PATHS;
const SCRIPT_PATH = 'scripts/verify-trd2-v6-canonical-engine-a.mjs';

function runGit(args) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function assertExpectedWorktree() {
  const paths = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0').filter(Boolean).map((record) => record.slice(3));
  if (paths.length !== 1 || paths[0] !== REGISTRY_PATH || fs.existsSync(REPORT_PATH)) throw new Error('Canonical Engine A requires exactly the immutable untracked schema registry');
}

function patchFor(content) {
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Begin Patch\n*** Add File: ${REPORT_PATH}\n${lines.map((line) => `+${line}`).join('\n')}\n*** End Patch\n`;
}

function main() {
  if (!process.argv.includes('--emit-patch')) throw new Error('use --emit-patch; Canonical Engine A never writes repository files directly');
  assertExpectedWorktree();
  const registry = validateClosedSchemaRegistry(JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')));
  const sourceSha256 = sha256Bytes(fs.readFileSync(SCRIPT_PATH));
  const frozen = registry.provenance.toolchain.find(({ logicalPath }) => logicalPath === SCRIPT_PATH);
  if (frozen === undefined || frozen.sha256 !== sourceSha256) throw new Error('Canonical Engine A source differs from the frozen toolchain');
  const report = makeCanonicalEngineReport({
    engineId: 'CANONICAL-ENGINE-A',
    implementation: 'NODE-STRICT-CLOSED-SCHEMA-ENGINE-V1',
    registry,
    sourceSha256,
  });
  process.stdout.write(patchFor(prettyV6(report)));
}

main();
