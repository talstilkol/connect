#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  contentRoot,
  pretty,
  sha256Bytes,
} from './b0-v8-core.mjs';
import {
  SOURCE_UNIVERSE_V4_TOOLCHAIN_REGISTRY_PATH,
  validateReaderReport,
  validateSourceUniverseOutputRegistry,
  validateToolchainPathRegistry,
} from './source-universe-v4-core.mjs';

const REGISTRY_PATH = 'docs/planning/source-universe-v4-output-path-registry-v1-2026-08-30.json';
const CUTOFF_DIRECTORY = 'docs/planning/discovery-cutoff-candidate-v3-2026-08-30';
const CUTOFF_PATHS = Object.freeze([
  `${CUTOFF_DIRECTORY}/manifest.json`,
  `${CUTOFF_DIRECTORY}/receipt.json`,
  `${CUTOFF_DIRECTORY}/source-candidates.json`,
  `${CUTOFF_DIRECTORY}/verification-report.json`,
]);
function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const message = encoding === null ? result.stderr.toString('utf8') : result.stderr;
    throw new Error(`git ${args.join(' ')} failed: ${message.trim()}`);
  }
  return result.stdout;
}

function parseNull(buffer) {
  return buffer.length === 0 ? [] : buffer.toString('utf8').split('\0').filter(Boolean);
}

function patchFor(path, content) {
  if (fs.existsSync(path)) throw new Error(`immutable final output already exists: ${path}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Add File: ${path}\n${lines.map((line) => `+${line}`).join('\n')}\n`;
}

function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--emit-patch') throw new Error('usage: node scripts/finalize-source-universe-v4-candidate.mjs --emit-patch');
  const registryBytes = fs.readFileSync(REGISTRY_PATH);
  const registry = JSON.parse(registryBytes.toString('utf8'));
  validateSourceUniverseOutputRegistry(registry);
  const toolchainRegistry = JSON.parse(
    fs.readFileSync(SOURCE_UNIVERSE_V4_TOOLCHAIN_REGISTRY_PATH, 'utf8'),
  );
  validateToolchainPathRegistry(toolchainRegistry);
  const expected = new Set([...CUTOFF_PATHS, ...registry.packageMemberPaths.slice(0, 21)]);
  const observed = parseNull(runGit([
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
  ], null)).map((record) => record.slice(3));
  if (observed.length !== expected.size || observed.some((path) => !expected.has(path)) || new Set(observed).size !== expected.size) {
    throw new Error('finalizer requires exactly Cutoff v3, 19 normative members and two Reader reports');
  }
  const subject = JSON.parse(fs.readFileSync(registry.packageMemberPaths[0], 'utf8'));
  const observedHead = subject.sourceCommit;
  if (runGit(['rev-parse', 'HEAD']).trim() !== observedHead) throw new Error('finalizer observed head mismatch');
  const readerA = JSON.parse(fs.readFileSync(registry.packageMemberPaths[19], 'utf8'));
  const readerB = JSON.parse(fs.readFileSync(registry.packageMemberPaths[20], 'utf8'));
  validateReaderReport(readerA);
  validateReaderReport(readerB);
  if (readerA.verificationRoot !== readerB.verificationRoot) throw new Error('Reader verification roots differ');

  const members = registry.packageMemberPaths.slice(0, 21).map((path, index) => {
    const bytes = fs.readFileSync(path);
    return {
      byteLength: bytes.length,
      ordinal: index + 1,
      path,
      role: index < 19 ? 'NORMATIVE-CANDIDATE-CONTENT' : 'PRODUCER-CONTROLLED-READER-EVIDENCE',
      sha256: sha256Bytes(bytes),
    };
  });
  const normativeMembers = members.slice(0, 19);
  const readerMembers = members.slice(19);
  const toolchain = toolchainRegistry.toolchainPaths.map((path, index) => {
    const bytes = runGit(['show', `${observedHead}:${path}`], null);
    const mode = runGit(['ls-tree', observedHead, '--', path]).trim().split(/\s+/u)[0];
    return {
      byteLength: bytes.length,
      mode,
      ordinal: index + 1,
      path,
      sha256: sha256Bytes(bytes),
    };
  });
  const manifest = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-PACKAGE-MANIFEST-2026-08-30-G0',
    developmentFreeze: 'ACTIVE',
    gate29: 'BLOCKED',
    manifestMembership: false,
    memberCount: members.length,
    members,
    normativeContentRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-NORMATIVE-CONTENT-V1', normativeMembers),
    observedHead,
    packageContentRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-PACKAGE-CONTENT-V1', members),
    producerQaMembership: false,
    readerEvidenceRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-READER-EVIDENCE-V1', readerMembers),
    repositoryVisibility: 'PUBLIC',
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-PACKAGE-MANIFEST-V1',
    toolchain,
    toolchainRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-TOOLCHAIN-V1', toolchain),
  };
  if (
    readerA.toolchainRoot !== manifest.toolchainRoot
    || readerB.toolchainRoot !== manifest.toolchainRoot
  ) throw new Error('Reader toolchain roots do not match the package toolchain root');
  const qaBase = {
    acceptance: 0,
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-PRODUCER-QA-2026-08-30-G0',
    developmentFreeze: 'ACTIVE',
    findingClosureCount: 0,
    gate29: 'BLOCKED',
    localControlPassCount: 24,
    mutationBlockedCount: 102,
    observedHead,
    packageContentRoot: manifest.packageContentRoot,
    readerRootsEqual: true,
    result: 'PASS-LOCAL-CANDIDATE-NOT-ACCEPTED',
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-PRODUCER-QA-V1',
    verificationRoot: readerA.verificationRoot,
  };
  const producerQa = {
    ...qaBase,
    reportRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-PRODUCER-QA-V1', qaBase),
  };
  const files = [
    [registry.packageMemberPaths[21], pretty(manifest)],
    [registry.packageMemberPaths[22], pretty(producerQa)],
  ];
  process.stdout.write(`*** Begin Patch\n${files.map(([path, content]) => patchFor(path, content)).join('')}*** End Patch\n`);
}

main();
