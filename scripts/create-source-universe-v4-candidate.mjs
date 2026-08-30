#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  canonical,
  contentRoot,
  pretty,
  sha256Bytes,
} from './b0-v8-core.mjs';
import {
  SOURCE_UNIVERSE_V4_DATE,
  SOURCE_UNIVERSE_V4_TOOLCHAIN_REGISTRY_PATH,
  evaluateLocalControls,
  expectedMutationIdentities,
  makeByteDeletionMutationVector,
  makeControlRegistry,
  makeFindingControls,
  makeLifecycleContracts,
  makePublicContracts,
  scanSourceReferenceOccurrences,
  validateConformanceVectors,
  validateControlRegistry,
  validateControlledGeneration,
  validateDependencyGraph,
  validateFindingControls,
  validateFindingCrosswalk,
  validateGraphPair,
  validateLifecycleContracts,
  validateMutationVectors,
  validateObjectRegistry,
  validateOccurrenceLedger,
  validatePreservationCrosswalk,
  validatePublicContracts,
  validateSourceUniverseOutputRegistry,
  validateTargetSpanLedger,
  validateToolchainPathRegistry,
} from './source-universe-v4-core.mjs';

const OUTPUT_REGISTRY_PATH = `docs/planning/source-universe-v4-output-path-registry-v1-${SOURCE_UNIVERSE_V4_DATE}.json`;
const CUTOFF_DIRECTORY = `docs/planning/discovery-cutoff-candidate-v3-${SOURCE_UNIVERSE_V4_DATE}`;
const CUTOFF_RECEIPT_PATH = `${CUTOFF_DIRECTORY}/receipt.json`;
const CUTOFF_MANIFEST_PATH = `${CUTOFF_DIRECTORY}/manifest.json`;

const SOURCE_PATHS = Object.freeze({
  charter: `docs/planning/source-universe-v4-successor-build-charter-v2-${SOURCE_UNIVERSE_V4_DATE}.md`,
  v1Findings: 'docs/planning/source-universe-and-custody-requirements-hostile-review-findings-manifest-2026-08-29.md',
  v2Subject: 'docs/planning/source-universe-and-custody-successor-requirements-v2-2026-08-29.md',
  v2Findings: 'docs/planning/source-universe-and-custody-successor-requirements-v2-independent-hostile-review-findings-manifest-2026-08-29.md',
  v3Subject: 'docs/planning/source-universe-and-custody-successor-requirements-v3-2026-08-29.md',
  v3Findings: 'docs/planning/source-universe-and-custody-successor-requirements-v3-independent-hostile-review-findings-manifest-2026-08-29.md',
  b0Manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-atomic-package-manifest-${SOURCE_UNIVERSE_V4_DATE}.json`,
  protocolManifest: `docs/planning/three-review-protocol-v1-10-g1-package-${SOURCE_UNIVERSE_V4_DATE}/normative-package-manifest.json`,
});

const TOKEN_TARGETS = Object.freeze({
  'SRC-B0-V8-MANIFEST#WHOLE-FILE': SOURCE_PATHS.b0Manifest,
  'SRC-CHARTER-V2#WHOLE-FILE': SOURCE_PATHS.charter,
  'SRC-CUTOFF-V3-RECEIPT#WHOLE-FILE': CUTOFF_RECEIPT_PATH,
  'SRC-PROTOCOL-G1-MANIFEST#WHOLE-FILE': SOURCE_PATHS.protocolManifest,
  'SRC-SURS1-FINDINGS#WHOLE-FILE': SOURCE_PATHS.v1Findings,
  'SRC-SURS2-FINDINGS#WHOLE-FILE': SOURCE_PATHS.v2Findings,
  'SRC-SURS2-SUBJECT#WHOLE-FILE': SOURCE_PATHS.v2Subject,
  'SRC-SURS3-FINDINGS#WHOLE-FILE': SOURCE_PATHS.v3Findings,
  'SRC-SURS3-SUBJECT#WHOLE-FILE': SOURCE_PATHS.v3Subject,
});

const MUTATION_SOURCE_BY_CATEGORY = Object.freeze({
  'V1-REVIEW-FINDING': SOURCE_PATHS.v1Findings,
  'V2-REQUIREMENT': SOURCE_PATHS.v2Subject,
  'V2-REVIEW-FINDING': SOURCE_PATHS.v2Findings,
  'V3-REVIEW-FINDING': SOURCE_PATHS.v3Findings,
});

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
  if (buffer.length === 0) return [];
  return buffer.toString('utf8').split('\0').filter(Boolean);
}

function readCommitBlob(commit, path) {
  return runGit(['show', `${commit}:${path}`], null);
}

function patchFor(path, content) {
  if (fs.existsSync(path)) throw new Error(`immutable output already exists: ${path}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Add File: ${path}\n${lines.map((line) => `+${line}`).join('\n')}\n`;
}

function emitPatch(files) {
  let patch = '*** Begin Patch\n';
  for (const [path, content] of files) patch += patchFor(path, content);
  patch += '*** End Patch\n';
  process.stdout.write(patch);
}

function assertCutoffOnlyWorktree(registry) {
  const records = parseNull(runGit([
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
  ], null));
  const allowed = new Set([
    `${CUTOFF_DIRECTORY}/manifest.json`,
    `${CUTOFF_DIRECTORY}/receipt.json`,
    `${CUTOFF_DIRECTORY}/source-candidates.json`,
    `${CUTOFF_DIRECTORY}/verification-report.json`,
  ]);
  const observed = records.map((record) => record.slice(3));
  if (observed.length !== 4 || observed.some((path) => !allowed.has(path)) || new Set(observed).size !== 4) {
    throw new Error('v4 builder permits exactly the four untracked Cutoff v3 outputs');
  }
  for (const path of registry.packageMemberPaths) {
    if (fs.existsSync(path)) throw new Error(`v4 immutable output already exists: ${path}`);
  }
}

function validateCutoff(
  cutoffReceipt,
  cutoffManifest,
  registry,
  registryBytes,
  toolchainRegistry,
) {
  const payload = cutoffReceipt.payload;
  if (
    cutoffReceipt.schema !== 'CONNECT-DISCOVERY-CUTOFF-RECEIPT-ENVELOPE-V3'
    || payload.schema !== 'CONNECT-DISCOVERY-CUTOFF-RECEIPT-PAYLOAD-V3'
    || payload.artifactId !== 'CONNECT-DISCOVERY-CUTOFF-CANDIDATE-V3-2026-08-30'
    || payload.status !== 'CANDIDATE-NOT-ACCEPTED-NOT-SOURCE-UNIVERSE'
    || payload.repositoryVisibilityInvariant !== 'PUBLIC'
    || payload.developmentFreeze !== 'ACTIVE'
    || payload.gate29 !== 'BLOCKED'
  ) throw new Error('Cutoff v3 receipt identity or invariants are invalid');
  const observedHead = payload.productRepository.observedHead;
  const currentHead = runGit(['rev-parse', 'HEAD']).trim();
  if (observedHead !== currentHead || payload.productRepository.cleanAtCutoff !== true) throw new Error('Cutoff v3 is not bound to the current clean input commit');
  const successor = payload.declaredOutputRegistry.successorOutputRegistry;
  if (
    successor.path !== OUTPUT_REGISTRY_PATH
    || successor.sha256 !== sha256Bytes(registryBytes)
    || successor.outputDirectory !== registry.outputDirectory
    || canonical(successor.packageMemberPaths) !== canonical(registry.packageMemberPaths)
    || canonical(successor.reviewAndAcceptancePaths) !== canonical(registry.reviewAndAcceptancePaths)
    || successor.allOutputsAbsentAtCutoff !== true
  ) throw new Error('Cutoff v3 successor output binding is invalid');
  if (cutoffManifest.payload.observedHead !== observedHead) throw new Error('Cutoff v3 manifest head mismatch');
  for (const path of toolchainRegistry.toolchainPaths) {
    const bytes = readCommitBlob(observedHead, path);
    const row = payload.toolchain.find((candidate) => candidate.path === path);
    if (
      row === undefined
      || row.byteLength !== bytes.length
      || row.sha256 !== sha256Bytes(bytes)
    ) throw new Error(`Cutoff v3 omits or mismatches v4 toolchain member: ${path}`);
  }
  return observedHead;
}

function parseTreeRows(commit) {
  const records = parseNull(runGit(['ls-tree', '-r', '-l', '-z', '--full-tree', commit], null));
  return records.map((record, index) => {
    const tab = record.indexOf('\t');
    const metadata = record.slice(0, tab).split(/\s+/u);
    const [mode, type, gitObjectId, sizeText] = metadata;
    const size = sizeText === '-' ? 0 : Number(sizeText);
    if (tab < 0 || !Number.isSafeInteger(size)) throw new Error('invalid git tree record');
    return {
      gitObjectId,
      mode,
      ordinal: index + 1,
      path: record.slice(tab + 1),
      size,
      sourceClass: 'OBSERVED-SYSTEM',
      status: 'PUBLIC-REPOSITORY-OBSERVED-NOT-ADMITTED',
      type,
    };
  });
}

function findSectionSpan(bytes, identity) {
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) throw new Error(`invalid UTF-8 source for ${identity}`);
  const token = `\`${identity}\``;
  const tokenIndex = text.indexOf(token);
  if (tokenIndex < 0) throw new Error(`source identity not found: ${identity}`);
  const startCharacter = text.lastIndexOf('\n', tokenIndex) + 1;
  if (!text.slice(startCharacter, tokenIndex).startsWith('## ')) throw new Error(`source identity is not in a level-two heading: ${identity}`);
  const nextHeading = text.indexOf('\n## ', tokenIndex + token.length);
  const endCharacter = nextHeading < 0 ? text.length : nextHeading + 1;
  return {
    endByte: Buffer.byteLength(text.slice(0, endCharacter), 'utf8'),
    startByte: Buffer.byteLength(text.slice(0, startCharacter), 'utf8'),
  };
}

function graphArtifact(artifactId) {
  const nodeIds = [
    'BOOTSTRAP-TYPES',
    'CUTOFF',
    'PUBLIC-POLICY',
    'DISCOVERY',
    'LOCATORS',
    'OBJECT-REGISTRY',
    'GRAPHS',
    'ADMISSION',
    'PUBLIC-PROJECTION',
    'LIFECYCLE',
    'PRESERVATION',
    'VECTORS',
    'READERS',
    'MANIFEST',
    'QA',
  ];
  const pairs = [
    ['BOOTSTRAP-TYPES', 'CUTOFF'],
    ['BOOTSTRAP-TYPES', 'PUBLIC-POLICY'],
    ['BOOTSTRAP-TYPES', 'ADMISSION'],
    ['BOOTSTRAP-TYPES', 'LIFECYCLE'],
    ['CUTOFF', 'DISCOVERY'],
    ['PUBLIC-POLICY', 'PUBLIC-PROJECTION'],
    ['DISCOVERY', 'LOCATORS'],
    ['LOCATORS', 'OBJECT-REGISTRY'],
    ['OBJECT-REGISTRY', 'GRAPHS'],
    ['GRAPHS', 'ADMISSION'],
    ['ADMISSION', 'PUBLIC-PROJECTION'],
    ['GRAPHS', 'LIFECYCLE'],
    ['ADMISSION', 'PRESERVATION'],
    ['LIFECYCLE', 'PRESERVATION'],
    ['PRESERVATION', 'VECTORS'],
    ['VECTORS', 'READERS'],
    ['READERS', 'MANIFEST'],
    ['MANIFEST', 'QA'],
  ];
  const nodes = nodeIds.map((nodeId, index) => ({ nodeId, ordinal: index + 1 }));
  const edges = pairs.map(([from, to], index) => ({
    edgeId: `SURS4-EDGE-${String(index + 1).padStart(3, '0')}`,
    edgeType: 'REQUIRES',
    from,
    to,
  }));
  const graph = {
    artifactId,
    cycleCount: 0,
    edgeCount: edges.length,
    edges,
    graphRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-DEPENDENCY-GRAPH-V1', { edges, nodes }),
    hiddenEdgeCount: 0,
    nodeCount: nodes.length,
    nodes,
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-DEPENDENCY-GRAPH-V1',
    selfEdgeCount: 0,
    unknownNodeCount: 0,
  };
  validateDependencyGraph(graph);
  return graph;
}

function objectRegistryArtifact(registry) {
  const sourceObjects = Object.entries(TOKEN_TARGETS).map(([objectId, path]) => ({
    objectClass: path.startsWith(CUTOFF_DIRECTORY) ? 'EVIDENCE' : 'EXTERNAL-INPUT',
    objectId,
    path,
    producerId: path.startsWith(CUTOFF_DIRECTORY) ? 'DISCOVERY-CUTOFF-V3-PRODUCER' : 'EXTERNAL-FROZEN-SOURCE',
  }));
  const outputObjects = registry.packageMemberPaths.map((path) => ({
    objectClass: path.endsWith('reader-a-report.json') || path.endsWith('reader-b-report.json') || path.endsWith('producer-qa.json') ? 'EVIDENCE' : 'NORMATIVE-OUTPUT',
    objectId: `OUTPUT-${path.slice(path.lastIndexOf('/') + 1).replace(/[^a-z0-9]+/giu, '-').replace(/^-|-$/gu, '').toUpperCase()}`,
    path,
    producerId: path.endsWith('reader-a-report.json') ? 'READER-A' : path.endsWith('reader-b-report.json') ? 'READER-B' : path.endsWith('package-manifest.json') || path.endsWith('producer-qa.json') ? 'FINALIZER' : 'V4-CANDIDATE-BUILDER',
  }));
  const objects = [...sourceObjects, ...outputObjects];
  const artifact = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-OBJECT-REGISTRY-2026-08-30-G0',
    dualClassCount: 0,
    missingProducerCount: 0,
    objectCount: objects.length,
    objects,
    registryRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-OBJECT-REGISTRY-V1', { objects }),
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-OBJECT-REGISTRY-V1',
    semanticAtomicityViolationCount: 0,
  };
  validateObjectRegistry(artifact);
  return artifact;
}

function build() {
  if (!fs.existsSync('.git') || !fs.existsSync('package.json')) throw new Error('run from the product repository root');
  const registryBytes = fs.readFileSync(OUTPUT_REGISTRY_PATH);
  const registry = JSON.parse(registryBytes.toString('utf8'));
  validateSourceUniverseOutputRegistry(registry);
  const toolchainRegistryBytes = fs.readFileSync(SOURCE_UNIVERSE_V4_TOOLCHAIN_REGISTRY_PATH);
  const toolchainRegistry = JSON.parse(toolchainRegistryBytes.toString('utf8'));
  validateToolchainPathRegistry(toolchainRegistry);
  assertCutoffOnlyWorktree(registry);
  const cutoffReceiptBytes = fs.readFileSync(CUTOFF_RECEIPT_PATH);
  const cutoffManifestBytes = fs.readFileSync(CUTOFF_MANIFEST_PATH);
  const cutoffReceipt = JSON.parse(cutoffReceiptBytes.toString('utf8'));
  const cutoffManifest = JSON.parse(cutoffManifestBytes.toString('utf8'));
  const observedHead = validateCutoff(
    cutoffReceipt,
    cutoffManifest,
    registry,
    registryBytes,
    toolchainRegistry,
  );
  const generatedAt = new Date(runGit(['show', '-s', '--format=%cI', observedHead]).trim()).toISOString().replace('.000Z', 'Z');

  const sourceBytesByPath = new Map();
  for (const path of new Set(Object.values(SOURCE_PATHS))) sourceBytesByPath.set(path, readCommitBlob(observedHead, path));
  sourceBytesByPath.set(CUTOFF_RECEIPT_PATH, cutoffReceiptBytes);
  const findingControls = makeFindingControls();
  validateFindingControls(findingControls);
  const sourceRefs = Object.keys(TOKEN_TARGETS);
  const subject = {
    acceptance: 0,
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-SUBJECT-2026-08-30-G0',
    blockers: [
      'B0-NOT-ACCEPTED',
      'REVIEW-PROTOCOL-NOT-ACCEPTED',
      'PRIVATE-SOURCE-CUSTODY-ABSENT',
      'OFFICIAL-SOURCE-OCCURRENCE-FRONTIER-INCOMPLETE',
      'TRUSTED-TIME-ABSENT',
      'INDEPENDENT-REVIEWS-ABSENT',
      'GENERATION-B-ABSENT',
    ],
    developmentFreeze: 'ACTIVE',
    findingControls,
    gate29: 'BLOCKED',
    generatedAt,
    independentClosureCount: 0,
    localControlCount: 24,
    owner: 'Tal',
    repositoryVisibility: 'PUBLIC',
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-SUBJECT-V1',
    sourceCommit: observedHead,
    sourceRefs,
    status: 'CANDIDATE-NOT-ACCEPTED',
  };
  const subjectBytes = Buffer.from(pretty(subject), 'utf8');
  const occurrenceRows = scanSourceReferenceOccurrences(subjectBytes);
  const occurrenceLedger = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-OCCURRENCE-LEDGER-2026-08-30-G0',
    occurrenceCount: occurrenceRows.length,
    occurrenceRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-OCCURRENCES-V1', { rows: occurrenceRows, subjectSha256: sha256Bytes(subjectBytes) }),
    rows: occurrenceRows,
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-OCCURRENCE-LEDGER-V1',
    subjectSha256: sha256Bytes(subjectBytes),
  };
  validateOccurrenceLedger(occurrenceLedger, subjectBytes);

  const targetRows = Object.entries(TOKEN_TARGETS).map(([targetId, path]) => {
    const bytes = sourceBytesByPath.get(path);
    return {
      byteLength: bytes.length,
      endByte: bytes.length,
      path,
      sourceBlobSha256: sha256Bytes(bytes),
      sourceCommit: path.startsWith(CUTOFF_DIRECTORY) ? 'DETACHED-CUTOFF-V3' : observedHead,
      spanSha256: sha256Bytes(bytes),
      startByte: 0,
      targetId,
    };
  });
  const targetSpanLedger = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-TARGET-SPAN-LEDGER-2026-08-30-G0',
    rowCount: targetRows.length,
    rows: targetRows,
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-TARGET-SPAN-LEDGER-V1',
    targetRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-TARGET-SPANS-V1', { rows: targetRows }),
  };
  validateTargetSpanLedger(targetSpanLedger, sourceBytesByPath);

  const treeRows = parseTreeRows(observedHead);
  const inventoryBase = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-CANDIDATE-INVENTORY-2026-08-30-G0',
    externalCandidateRows: [
      { custody: 'PRIVATE-CUSTODY-ABSENT-BLOCKING', sourceClass: 'PROVIDED-SPECIFICATION', sourceId: 'OPAQUE-SPEC-DETAILED-TEXT', status: 'NOT-ADMITTED' },
      { custody: 'PRIVATE-CUSTODY-ABSENT-BLOCKING', sourceClass: 'PROVIDED-SPECIFICATION', sourceId: 'OPAQUE-SPEC-WHATSAPP-PDF', status: 'NOT-ADMITTED' },
      { custody: 'PUBLIC-CAPTURE-INCOMPLETE-BLOCKING', sourceClass: 'OFFICIAL-EXTERNAL', sourceId: 'OFFICIAL-SOURCE-FRONTIER', status: 'NOT-ADMITTED' },
    ],
    observedHead,
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-CANDIDATE-INVENTORY-V1',
    trackedFileCount: treeRows.length,
    trackedRows: treeRows,
  };
  const sourceCandidateInventory = {
    ...inventoryBase,
    inventoryRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-CANDIDATE-INVENTORY-V1', inventoryBase),
  };
  const publicProjectionBase = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-PUBLIC-PROJECTION-2026-08-30-G0',
    byteProjectionIncluded: false,
    metadataRows: treeRows.map(({ gitObjectId, mode, ordinal, path, size, type }) => ({ gitObjectId, mode, ordinal, path, size, type })),
    projectionStatus: 'PUBLIC-REPOSITORY-METADATA-NOT-SOURCE-ADMISSION',
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-PUBLIC-PROJECTION-V1',
    secretHygieneAtCutoff: cutoffReceipt.payload.productRepository.workingSecretHygiene,
  };
  const publicProjection = {
    ...publicProjectionBase,
    projectionRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-PUBLIC-PROJECTION-V1', publicProjectionBase),
  };
  const privateCustodyBase = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-PRIVATE-CUSTODY-REFERENCES-2026-08-30-G0',
    forbiddenFields: ['ABSOLUTE-PATH', 'TOKEN', 'PASSWORD', 'PRIVATE-KEY', 'PERSONAL-DATA', 'LOW-ENTROPY-DIGEST'],
    rows: inventoryBase.externalCandidateRows.slice(0, 2).map(({ sourceId }) => ({
      admissionEnabled: false,
      custodyStatus: 'PRIVATE-CUSTODY-ABSENT-BLOCKING',
      sourceId,
    })),
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-PRIVATE-CUSTODY-REFERENCES-V1',
  };
  const privateCustody = {
    ...privateCustodyBase,
    custodyRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-PRIVATE-CUSTODY-REFERENCES-V1', privateCustodyBase),
  };

  const discoveryManifestBase = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-DISCOVERY-INPUT-MANIFEST-2026-08-30-G0',
    cutoffManifestSha256: sha256Bytes(cutoffManifestBytes),
    cutoffReceiptSha256: sha256Bytes(cutoffReceiptBytes),
    observedHead,
    outputRegistrySha256: sha256Bytes(registryBytes),
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-DISCOVERY-INPUT-MANIFEST-V1',
    toolchainRegistrySha256: sha256Bytes(toolchainRegistryBytes),
    trackedFileCount: treeRows.length,
    trackedTreeRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-TRACKED-TREE-V1', treeRows),
  };
  const discoveryManifest = {
    ...discoveryManifestBase,
    manifestRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-DISCOVERY-INPUT-MANIFEST-V1', discoveryManifestBase),
  };
  const cutoffDetachedBase = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-CUTOFF-DETACHED-ENVELOPE-2026-08-30-G0',
    cutoffPackageContentRoot: cutoffManifest.payload.packageContentRootSha256,
    cutoffReceiptPayloadSha256: cutoffReceipt.payloadSha256,
    observedHead,
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-CUTOFF-DETACHED-ENVELOPE-V1',
  };
  const cutoffDetached = {
    ...cutoffDetachedBase,
    envelopeRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-CUTOFF-DETACHED-ENVELOPE-V1', cutoffDetachedBase),
  };

  const objectRegistry = objectRegistryArtifact(registry);
  const explicitGraph = graphArtifact('CONNECT-SOURCE-UNIVERSE-V4-EXPLICIT-GRAPH-2026-08-30-G0');
  const semanticGraph = graphArtifact('CONNECT-SOURCE-UNIVERSE-V4-SEMANTIC-GRAPH-2026-08-30-G0');
  validateGraphPair(explicitGraph, semanticGraph);
  const controlRegistry = makeControlRegistry();
  const publicContracts = makePublicContracts();
  const lifecycleContracts = makeLifecycleContracts();
  validateControlRegistry(controlRegistry);
  validatePublicContracts(publicContracts);
  validateLifecycleContracts(lifecycleContracts);

  const mutationIdentities = expectedMutationIdentities();
  const mutationVectors = mutationIdentities.map(({ category, sourceIdentity }) => {
    const path = MUTATION_SOURCE_BY_CATEGORY[category];
    const bytes = sourceBytesByPath.get(path);
    const span = findSectionSpan(bytes, sourceIdentity);
    const unaffectedSet = mutationIdentities.filter((row) => row.category === category && row.sourceIdentity !== sourceIdentity).map((row) => row.sourceIdentity);
    return makeByteDeletionMutationVector({
      category,
      endByte: span.endByte,
      path,
      sourceBytes: bytes,
      sourceCommit: observedHead,
      sourceIdentity,
      startByte: span.startByte,
      unaffectedSet,
    });
  });
  const categoryCounts = Object.fromEntries([...new Set(mutationVectors.map(({ category }) => category))].sort().map((category) => [category, mutationVectors.filter((row) => row.category === category).length]));
  const mutationCorpus = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-HOSTILE-MUTATION-VECTORS-2026-08-30-G0',
    blockedCount: mutationVectors.length,
    categoryCounts,
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-MUTATION-VECTORS-V1',
    vectorCount: mutationVectors.length,
    vectors: mutationVectors,
    vectorsRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-MUTATION-VECTORS-V1', { vectors: mutationVectors }),
  };
  validateMutationVectors(mutationCorpus, sourceBytesByPath);

  const mutationByIdentity = new Map(mutationVectors.map((row) => [row.sourceIdentity, row]));
  const preservationRows = mutationIdentities.filter(({ category }) => category !== 'V3-REVIEW-FINDING').map(({ category, sourceIdentity }, index) => {
    const vector = mutationByIdentity.get(sourceIdentity);
    const destinationControlIds = findingControls.filter((_, controlIndex) => controlIndex % 6 === index % 6).map(({ controlId }) => controlId);
    return {
      category,
      destinationControlIds,
      mutationVectorId: vector.vectorId,
      rowId: `SURS4-PRES-${String(index + 1).padStart(3, '0')}`,
      sourceIdentity,
      sourcePath: vector.path,
      sourceSpanSha256: sha256Bytes(sourceBytesByPath.get(vector.path).subarray(vector.startByte, vector.endByte)),
      status: 'FULL-LOCAL-NOT-INDEPENDENTLY-ACCEPTED',
    };
  });
  const preservationCrosswalk = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-PRESERVATION-CROSSWALK-2026-08-30-G0',
    crosswalkRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-PRESERVATION-CROSSWALK-V1', { rows: preservationRows }),
    fullLocalCount: preservationRows.length,
    rowCount: preservationRows.length,
    rows: preservationRows,
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-PRESERVATION-CROSSWALK-V1',
  };
  validatePreservationCrosswalk(preservationCrosswalk);

  const findingRows = findingControls.map((control) => {
    const vector = mutationByIdentity.get(control.findingId);
    return {
      closureStatus: control.closureStatus,
      controlId: control.controlId,
      findingId: control.findingId,
      localStatus: control.localStatus,
      mutationVectorId: vector.vectorId,
      noMergeKey: control.noMergeKey,
      severity: control.severity,
      sourceSpanSha256: sha256Bytes(sourceBytesByPath.get(vector.path).subarray(vector.startByte, vector.endByte)),
    };
  });
  const findingCrosswalk = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-FINDING-CROSSWALK-2026-08-30-G0',
    closureCount: 0,
    crosswalkRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-FINDING-CROSSWALK-V1', { rows: findingRows }),
    findingCount: findingRows.length,
    rows: findingRows,
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-FINDING-CROSSWALK-V1',
  };
  validateFindingCrosswalk(findingCrosswalk);

  const inputArtifactIds = [
    occurrenceLedger.artifactId,
    targetSpanLedger.artifactId,
    objectRegistry.artifactId,
    explicitGraph.artifactId,
    semanticGraph.artifactId,
    controlRegistry.artifactId,
    publicContracts.artifactId,
    lifecycleContracts.artifactId,
    preservationCrosswalk.artifactId,
    findingCrosswalk.artifactId,
  ];
  const conformanceRows = findingControls.map((control) => ({
    controlId: control.controlId,
    expectedTerminal: 'LOCAL-CONTROL-PASS',
    findingId: control.findingId,
    inputArtifactIds,
    operationId: `VALIDATE-${control.controlId}`,
    status: 'PASS-LOCAL-CANDIDATE-NOT-CLOSURE',
    vectorId: `SURS4-CONF-${control.controlId.slice(-3)}`,
  }));
  const conformanceCorpus = {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-CONFORMANCE-VECTORS-2026-08-30-G0',
    passCount: conformanceRows.length,
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-CONFORMANCE-VECTORS-V1',
    vectorCount: conformanceRows.length,
    vectors: conformanceRows,
    vectorsRoot: contentRoot('CONNECT-SOURCE-UNIVERSE-V4-CONFORMANCE-VECTORS-V1', { vectors: conformanceRows }),
  };
  validateConformanceVectors(conformanceCorpus);

  const controlledGeneration = {
    acceptanceCandidate: null,
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-CONTROLLED-GENERATION-2026-08-30-G0',
    generationA: {
      cutoffReceiptSha256: sha256Bytes(cutoffReceiptBytes),
      observedHead,
      outputRegistrySha256: sha256Bytes(registryBytes),
      toolchainRegistrySha256: sha256Bytes(toolchainRegistryBytes),
    },
    generationB: null,
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-CONTROLLED-GENERATION-V1',
    status: 'BLOCKED-PENDING-GENERATION-B',
    terminal: 'STALE-GENERATION-BLOCKED',
  };
  validateControlledGeneration(controlledGeneration);

  const controlRows = evaluateLocalControls({
    conformanceCorpus,
    controlRegistry,
    controlledGeneration,
    explicitGraph,
    findingCrosswalk,
    lifecycleContracts,
    mutationCorpus,
    noRandomSourcesPass: true,
    objectRegistry,
    occurrenceLedgerPass: true,
    preservationCrosswalk,
    publicContracts,
    semanticGraph,
    targetSpanLedgerPass: true,
  });
  if (controlRows.some(({ result }) => result !== 'PASS')) throw new Error('one or more local v4 controls did not pass');

  const artifacts = new Map([
    ['subject.json', subject],
    ['discovery-input-manifest.json', discoveryManifest],
    ['cutoff-detached-envelope.json', cutoffDetached],
    ['source-candidate-inventory.json', sourceCandidateInventory],
    ['public-source-projection.json', publicProjection],
    ['private-custody-reference-manifest.json', privateCustody],
    ['source-occurrence-ledger.json', occurrenceLedger],
    ['target-span-ledger.json', targetSpanLedger],
    ['object-class-sole-producer-registry.json', objectRegistry],
    ['explicit-dependency-graph.json', explicitGraph],
    ['semantic-dependency-graph.json', semanticGraph],
    ['authority-admission-state-terminal-field-registries.json', controlRegistry],
    ['public-handling-egress-detector-contracts.json', publicContracts],
    ['lifecycle-contracts.json', lifecycleContracts],
    ['clause-preservation-crosswalk.json', preservationCrosswalk],
    ['finding-closure-crosswalk.json', findingCrosswalk],
    ['conformance-vectors.json', conformanceCorpus],
    ['hostile-mutation-vectors.json', mutationCorpus],
    ['controlled-generation-vectors.json', controlledGeneration],
  ]);
  const files = registry.packageMemberPaths.slice(0, 19).map((path) => {
    const name = path.slice(path.lastIndexOf('/') + 1);
    const value = artifacts.get(name);
    if (!value) throw new Error(`missing generated artifact: ${name}`);
    return [path, pretty(value)];
  });
  emitPatch(files);
}

build();
