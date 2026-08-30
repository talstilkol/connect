#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  contentRoot,
  pretty,
  sha256Bytes,
} from './b0-v8-core.mjs';
import { inspectSecretText } from './verify-secret-hygiene.mjs';
import {
  evaluateLocalControls,
  makeReaderChecks,
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
  verificationRoot,
} from './source-universe-v4-core.mjs';

const OUTPUT_REGISTRY_PATH = 'docs/planning/source-universe-v4-output-path-registry-v1-2026-08-30.json';
const CUTOFF_DIRECTORY = 'docs/planning/discovery-cutoff-candidate-v3-2026-08-30';
const CUTOFF_MANIFEST_PATH = `${CUTOFF_DIRECTORY}/manifest.json`;
const CUTOFF_RECEIPT_PATH = `${CUTOFF_DIRECTORY}/receipt.json`;
const CUTOFF_PATHS = Object.freeze([
  CUTOFF_MANIFEST_PATH,
  CUTOFF_RECEIPT_PATH,
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

function readJson(path) {
  const bytes = fs.readFileSync(path);
  return { bytes, value: JSON.parse(bytes.toString('utf8')) };
}

function readCommitBlob(commit, path) {
  return runGit(['show', `${commit}:${path}`], null);
}

function patchFor(path, content) {
  if (fs.existsSync(path)) throw new Error(`immutable Reader A report already exists: ${path}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Begin Patch\n*** Add File: ${path}\n${lines.map((line) => `+${line}`).join('\n')}\n*** End Patch\n`;
}

function assertExpectedWorktree(registry) {
  const expected = new Set([...CUTOFF_PATHS, ...registry.packageMemberPaths.slice(0, 19)]);
  const observed = parseNull(runGit(['status', '--porcelain=v1', '-z'], null)).map((record) => record.slice(3));
  if (observed.length !== expected.size || observed.some((path) => !expected.has(path)) || new Set(observed).size !== expected.size) {
    throw new Error('Reader A requires exactly Cutoff v3 plus the 19 normative v4 outputs');
  }
}

function assertPublicSafeBytes(files) {
  for (const [path, bytes] of files) {
    const text = bytes.toString('utf8');
    if (text.includes('/Users/') || text.includes('file:') || /[A-Za-z]:\\/u.test(text)) throw new Error(`private locator in ${path}`);
    if (inspectSecretText(text).length > 0) throw new Error(`secret-shaped content in ${path}`);
  }
}

function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--emit-report') throw new Error('usage: node scripts/verify-source-universe-v4-reader-a.mjs --emit-report');
  const registryFile = readJson(OUTPUT_REGISTRY_PATH);
  const registry = registryFile.value;
  validateSourceUniverseOutputRegistry(registry);
  const toolchainRegistryFile = readJson(SOURCE_UNIVERSE_V4_TOOLCHAIN_REGISTRY_PATH);
  const toolchainRegistry = toolchainRegistryFile.value;
  validateToolchainPathRegistry(toolchainRegistry);
  assertExpectedWorktree(registry);
  const artifacts = new Map();
  const rawFiles = new Map();
  for (const path of registry.packageMemberPaths.slice(0, 19)) {
    const file = readJson(path);
    const name = path.slice(path.lastIndexOf('/') + 1);
    artifacts.set(name, file.value);
    rawFiles.set(path, file.bytes);
  }
  const subject = artifacts.get('subject.json');
  const observedHead = subject.sourceCommit;
  if (
    subject.repositoryVisibility !== 'PUBLIC'
    || subject.developmentFreeze !== 'ACTIVE'
    || subject.gate29 !== 'BLOCKED'
    || subject.acceptance !== 0
    || subject.independentClosureCount !== 0
    || subject.status !== 'CANDIDATE-NOT-ACCEPTED'
    || runGit(['rev-parse', 'HEAD']).trim() !== observedHead
  ) throw new Error('Reader A: subject invariants failed');
  validateFindingControls(subject.findingControls);

  const cutoffReceipt = readJson(`${CUTOFF_DIRECTORY}/receipt.json`);
  const cutoffManifest = readJson(`${CUTOFF_DIRECTORY}/manifest.json`);
  if (
    cutoffReceipt.value.payload.productRepository.observedHead !== observedHead
    || cutoffManifest.value.payload.observedHead !== observedHead
    || cutoffReceipt.value.payload.repositoryVisibilityInvariant !== 'PUBLIC'
  ) throw new Error('Reader A: Cutoff v3 binding failed');
  const discovery = artifacts.get('discovery-input-manifest.json');
  if (
    discovery.observedHead !== observedHead
    || discovery.cutoffReceiptSha256 !== sha256Bytes(cutoffReceipt.bytes)
    || discovery.cutoffManifestSha256 !== sha256Bytes(cutoffManifest.bytes)
    || discovery.outputRegistrySha256 !== sha256Bytes(registryFile.bytes)
    || discovery.toolchainRegistrySha256 !== sha256Bytes(toolchainRegistryFile.bytes)
  ) throw new Error('Reader A: discovery input manifest failed');

  const inventory = artifacts.get('source-candidate-inventory.json');
  const publicProjection = artifacts.get('public-source-projection.json');
  const privateCustody = artifacts.get('private-custody-reference-manifest.json');
  const treeCount = parseNull(runGit(['ls-tree', '-r', '-z', '--full-tree', observedHead], null)).length;
  if (
    inventory.observedHead !== observedHead
    || inventory.trackedFileCount !== treeCount
    || inventory.trackedRows.length !== treeCount
    || publicProjection.metadataRows.length !== treeCount
    || publicProjection.byteProjectionIncluded !== false
    || privateCustody.rows.length !== 2
    || privateCustody.rows.some((row) => row.admissionEnabled !== false || row.custodyStatus !== 'PRIVATE-CUSTODY-ABSENT-BLOCKING')
  ) throw new Error('Reader A: inventory or custody projection failed');

  const sourceBytesByPath = new Map();
  const targetLedger = artifacts.get('target-span-ledger.json');
  for (const row of targetLedger.rows) {
    const bytes = row.sourceCommit === 'DETACHED-CUTOFF-V3' ? fs.readFileSync(row.path) : readCommitBlob(observedHead, row.path);
    sourceBytesByPath.set(row.path, bytes);
  }
  const mutationCorpus = artifacts.get('hostile-mutation-vectors.json');
  for (const path of new Set(mutationCorpus.vectors.map((row) => row.path))) {
    if (!sourceBytesByPath.has(path)) sourceBytesByPath.set(path, readCommitBlob(observedHead, path));
  }
  const occurrencePass = validateOccurrenceLedger(artifacts.get('source-occurrence-ledger.json'), rawFiles.get(registry.packageMemberPaths[0]));
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

  const toolchainBytes = toolchainRegistry.toolchainPaths.map((path) => ({
    bytes: readCommitBlob(observedHead, path),
    path,
  }));
  const toolchainRows = toolchainBytes.map(({ bytes, path }, index) => ({
    byteLength: bytes.length,
    mode: runGit(['ls-tree', observedHead, '--', path]).trim().split(/\s+/u)[0],
    ordinal: index + 1,
    path,
    sha256: sha256Bytes(bytes),
  }));
  const toolchainRoot = contentRoot(
    'CONNECT-SOURCE-UNIVERSE-V4-TOOLCHAIN-V1',
    toolchainRows,
  );
  const noRandomPass = validateNoRandomSources(toolchainBytes);
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
  if (localControls.length !== 24 || localControls.some(({ result }) => result !== 'PASS')) throw new Error('Reader A: local controls failed');
  assertPublicSafeBytes(new Map([...rawFiles, [CUTOFF_RECEIPT_PATH, cutoffReceipt.bytes], [CUTOFF_MANIFEST_PATH, cutoffManifest.bytes]]));

  const checks = makeReaderChecks();
  const report = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-READER-A-REPORT-2026-08-30-G0',
    checks,
    limitations: [
      'PRODUCER-CONTROLLED-READER-NOT-INDEPENDENT-REVIEW',
      'GENERATION-B-ABSENT',
      'B0-AND-REVIEW-PROTOCOL-NOT-ACCEPTED',
      'TRUSTED-TIME-ABSENT',
      'PRIVATE-CUSTODY-ABSENT',
    ],
    normativeMemberCount: 19,
    observedHead,
    readerId: 'READER-A',
    readerImplementation: 'NODE-STDLIB',
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-READER-REPORT-V1',
    status: 'PASS-LOCAL-CANDIDATE-NOT-ACCEPTED',
    toolchainRoot,
    verificationRoot: verificationRoot(checks),
  };
  validateReaderReport(report);
  const reportPath = registry.packageMemberPaths[19];
  process.stdout.write(patchFor(reportPath, pretty(report)));
}

main();
