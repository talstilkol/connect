#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  canonical,
  contentRoot,
  sha256Bytes,
} from './b0-v8-core.mjs';
import { inspectSecretText } from './verify-secret-hygiene.mjs';
import {
  evaluateLocalControls,
  SOURCE_UNIVERSE_V4_TOOLCHAIN_REGISTRY_PATH,
  validateConformanceVectors,
  validateControlRegistry,
  validateControlledGeneration,
  validateFindingControls,
  validateFindingCrosswalk,
  validateGraphPair,
  validateLifecycleContracts,
  validateMutationVectors,
  validateNoRandomSources,
  validateObjectRegistry,
  validateOccurrenceLedger,
  validatePreservationCrosswalk,
  validatePublicContracts,
  validateReaderReport,
  validateSourceUniverseOutputRegistry,
  validateTargetSpanLedger,
  validateToolchainPathRegistry,
} from './source-universe-v4-core.mjs';

const REGISTRY_PATH = 'docs/planning/source-universe-v4-output-path-registry-v1-2026-08-30.json';
const CUTOFF_DIR = 'docs/planning/discovery-cutoff-candidate-v3-2026-08-30';
const CUTOFF_PATHS = Object.freeze([
  `${CUTOFF_DIR}/manifest.json`,
  `${CUTOFF_DIR}/receipt.json`,
  `${CUTOFF_DIR}/source-candidates.json`,
  `${CUTOFF_DIR}/verification-report.json`,
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

function readJson(path) {
  const bytes = fs.readFileSync(path);
  return { bytes, value: JSON.parse(bytes.toString('utf8')) };
}

function readCommitBlob(commit, path) {
  return runGit(['show', `${commit}:${path}`], null);
}

function assertWorktree(mode, registry) {
  const observed = parseNull(runGit([
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
  ], null)).map((record) => record.slice(3));
  if (mode === 'check-existing') {
    if (observed.length !== 0) throw new Error('existing v4 verification requires a clean worktree');
    return;
  }
  const expected = new Set([...CUTOFF_PATHS, ...registry.packageMemberPaths]);
  if (observed.length !== expected.size || observed.some((path) => !expected.has(path)) || new Set(observed).size !== expected.size) {
    throw new Error('uncommitted v4 verification requires exactly Cutoff v3 and all 23 package outputs');
  }
}

function assertPublicSafe(files) {
  for (const [path, bytes] of files) {
    const text = bytes.toString('utf8');
    if (text.includes('/Users/') || text.includes('file:') || /[A-Za-z]:\\/u.test(text)) throw new Error(`private locator in ${path}`);
    if (inspectSecretText(text).length > 0) throw new Error(`secret-shaped content in ${path}`);
  }
}

function main() {
  const argument = process.argv[2];
  if (process.argv.length !== 3 || !['--verify-uncommitted', '--check-existing'].includes(argument)) {
    throw new Error('usage: node scripts/verify-source-universe-v4-candidate.mjs --verify-uncommitted|--check-existing');
  }
  const mode = argument.slice(2);
  const registryFile = readJson(REGISTRY_PATH);
  const registry = registryFile.value;
  validateSourceUniverseOutputRegistry(registry);
  const toolchainRegistryFile = readJson(SOURCE_UNIVERSE_V4_TOOLCHAIN_REGISTRY_PATH);
  const toolchainRegistry = toolchainRegistryFile.value;
  validateToolchainPathRegistry(toolchainRegistry);
  assertWorktree(mode, registry);
  registry.reviewAndAcceptancePaths.forEach((path) => {
    if (fs.existsSync(path)) throw new Error(`external review or acceptance output exists prematurely: ${path}`);
  });
  const files = new Map();
  const artifacts = new Map();
  for (const path of registry.packageMemberPaths) {
    const file = readJson(path);
    files.set(path, file.bytes);
    artifacts.set(path.slice(path.lastIndexOf('/') + 1), file.value);
  }
  const subject = artifacts.get('subject.json');
  const observedHead = subject.sourceCommit;
  runGit(['cat-file', '-e', `${observedHead}^{commit}`]);
  if (
    subject.repositoryVisibility !== 'PUBLIC'
    || subject.developmentFreeze !== 'ACTIVE'
    || subject.gate29 !== 'BLOCKED'
    || subject.acceptance !== 0
    || subject.independentClosureCount !== 0
    || subject.status !== 'CANDIDATE-NOT-ACCEPTED'
    || (mode === 'verify-uncommitted' && runGit(['rev-parse', 'HEAD']).trim() !== observedHead)
  ) throw new Error('v4 subject invariants failed');
  validateFindingControls(subject.findingControls);
  const cutoffReceipt = readJson(`${CUTOFF_DIR}/receipt.json`);
  const cutoffManifest = readJson(`${CUTOFF_DIR}/manifest.json`);
  if (
    cutoffReceipt.value.payload.productRepository.observedHead !== observedHead
    || cutoffManifest.value.payload.observedHead !== observedHead
    || cutoffReceipt.value.payload.declaredOutputRegistry.successorOutputRegistry.sha256 !== sha256Bytes(registryFile.bytes)
  ) throw new Error('v4 Cutoff binding failed');
  const discovery = artifacts.get('discovery-input-manifest.json');
  if (
    discovery.observedHead !== observedHead
    || discovery.cutoffReceiptSha256 !== sha256Bytes(cutoffReceipt.bytes)
    || discovery.cutoffManifestSha256 !== sha256Bytes(cutoffManifest.bytes)
    || discovery.outputRegistrySha256 !== sha256Bytes(registryFile.bytes)
    || discovery.toolchainRegistrySha256 !== sha256Bytes(toolchainRegistryFile.bytes)
  ) throw new Error('v4 discovery manifest failed');

  const sourceBytesByPath = new Map();
  const targetLedger = artifacts.get('target-span-ledger.json');
  for (const row of targetLedger.rows) {
    sourceBytesByPath.set(row.path, row.sourceCommit === 'DETACHED-CUTOFF-V3' ? fs.readFileSync(row.path) : readCommitBlob(observedHead, row.path));
  }
  const mutationCorpus = artifacts.get('hostile-mutation-vectors.json');
  for (const path of new Set(mutationCorpus.vectors.map((row) => row.path))) {
    if (!sourceBytesByPath.has(path)) sourceBytesByPath.set(path, readCommitBlob(observedHead, path));
  }
  const occurrencePass = validateOccurrenceLedger(artifacts.get('source-occurrence-ledger.json'), files.get(registry.packageMemberPaths[0]));
  const targetPass = validateTargetSpanLedger(targetLedger, sourceBytesByPath);
  const objectRegistry = artifacts.get('object-class-sole-producer-registry.json');
  const explicitGraph = artifacts.get('explicit-dependency-graph.json');
  const semanticGraph = artifacts.get('semantic-dependency-graph.json');
  const controlRegistry = artifacts.get('authority-admission-state-terminal-field-registries.json');
  const publicContracts = artifacts.get('public-handling-egress-detector-contracts.json');
  const lifecycleContracts = artifacts.get('lifecycle-contracts.json');
  const preservationCrosswalk = artifacts.get('clause-preservation-crosswalk.json');
  const findingCrosswalk = artifacts.get('finding-closure-crosswalk.json');
  const conformanceCorpus = artifacts.get('conformance-vectors.json');
  const controlledGeneration = artifacts.get('controlled-generation-vectors.json');
  validateObjectRegistry(objectRegistry);
  validateGraphPair(explicitGraph, semanticGraph);
  validateControlRegistry(controlRegistry);
  validatePublicContracts(publicContracts);
  validateLifecycleContracts(lifecycleContracts);
  validatePreservationCrosswalk(preservationCrosswalk);
  validateFindingCrosswalk(findingCrosswalk);
  validateConformanceVectors(conformanceCorpus);
  validateMutationVectors(mutationCorpus, sourceBytesByPath);
  validateControlledGeneration(controlledGeneration);

  const manifest = artifacts.get('package-manifest.json');
  const readerA = artifacts.get('reader-a-report.json');
  const readerB = artifacts.get('reader-b-report.json');
  validateReaderReport(readerA);
  validateReaderReport(readerB);
  if (readerA.verificationRoot !== readerB.verificationRoot) throw new Error('v4 Reader roots differ');
  const expectedMembers = registry.packageMemberPaths.slice(0, 21).map((path, index) => {
    const bytes = files.get(path);
    return {
      byteLength: bytes.length,
      ordinal: index + 1,
      path,
      role: index < 19 ? 'NORMATIVE-CANDIDATE-CONTENT' : 'PRODUCER-CONTROLLED-READER-EVIDENCE',
      sha256: sha256Bytes(bytes),
    };
  });
  if (
    manifest.observedHead !== observedHead
    || manifest.repositoryVisibility !== 'PUBLIC'
    || manifest.developmentFreeze !== 'ACTIVE'
    || manifest.gate29 !== 'BLOCKED'
    || manifest.manifestMembership !== false
    || manifest.producerQaMembership !== false
    || manifest.memberCount !== 21
    || canonical(manifest.members) !== canonical(expectedMembers)
    || manifest.normativeContentRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-NORMATIVE-CONTENT-V1', expectedMembers.slice(0, 19))
    || manifest.readerEvidenceRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-READER-EVIDENCE-V1', expectedMembers.slice(19))
    || manifest.packageContentRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-PACKAGE-CONTENT-V1', expectedMembers)
  ) throw new Error('v4 package manifest failed');
  if (
    canonical(manifest.toolchain.map((row) => row.path))
    !== canonical(toolchainRegistry.toolchainPaths)
  ) throw new Error('v4 toolchain path registry mismatch');
  const expectedToolchain = toolchainRegistry.toolchainPaths.map((path, index) => {
    const row = manifest.toolchain[index];
    if (row.path !== path) throw new Error('v4 toolchain ordinal mismatch');
    const bytes = readCommitBlob(observedHead, row.path);
    const modeValue = runGit(['ls-tree', observedHead, '--', row.path]).trim().split(/\s+/u)[0];
    return {
      byteLength: bytes.length,
      mode: modeValue,
      ordinal: index + 1,
      path: row.path,
      sha256: sha256Bytes(bytes),
    };
  });
  if (canonical(manifest.toolchain) !== canonical(expectedToolchain) || manifest.toolchainRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-TOOLCHAIN-V1', expectedToolchain)) throw new Error('v4 toolchain binding failed');
  if (
    readerA.toolchainRoot !== manifest.toolchainRoot
    || readerB.toolchainRoot !== manifest.toolchainRoot
  ) throw new Error('v4 Reader toolchain roots differ from the package toolchain root');
  const noRandomPass = validateNoRandomSources(expectedToolchain.map((row) => ({ path: row.path, bytes: readCommitBlob(observedHead, row.path) })));
  const localControls = evaluateLocalControls({
    conformanceCorpus,
    controlRegistry,
    controlledGeneration,
    explicitGraph,
    findingCrosswalk,
    lifecycleContracts,
    mutationCorpus,
    noRandomSourcesPass: noRandomPass,
    objectRegistry,
    occurrenceLedgerPass: occurrencePass,
    preservationCrosswalk,
    publicContracts,
    semanticGraph,
    targetSpanLedgerPass: targetPass,
  });
  if (localControls.length !== 24 || localControls.some(({ result }) => result !== 'PASS')) throw new Error('v4 local controls failed');
  const qa = artifacts.get('producer-qa.json');
  const qaBase = { ...qa };
  delete qaBase.reportRoot;
  if (
    qa.acceptance !== 0
    || qa.findingClosureCount !== 0
    || qa.localControlPassCount !== 24
    || qa.mutationBlockedCount !== 102
    || qa.packageContentRoot !== manifest.packageContentRoot
    || qa.readerRootsEqual !== true
    || qa.verificationRoot !== readerA.verificationRoot
    || qa.reportRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-PRODUCER-QA-V1', qaBase)
  ) throw new Error('v4 Producer QA failed');
  assertPublicSafe(new Map([...files, [`${CUTOFF_DIR}/receipt.json`, cutoffReceipt.bytes], [`${CUTOFF_DIR}/manifest.json`, cutoffManifest.bytes]]));
  process.stdout.write(`${JSON.stringify({
    currentHead: runGit(['rev-parse', 'HEAD']).trim(),
    findingClosureCount: 0,
    localControlPassCount: 24,
    mutationBlockedCount: 102,
    observedHead,
    packageContentRoot: manifest.packageContentRoot,
    status: 'PASS-LOCAL-CANDIDATE-NOT-ACCEPTED',
    verificationRoot: readerA.verificationRoot,
  })}\n`);
}

main();
