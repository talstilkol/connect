import {
  assertClosedObject,
  canonical,
  contentRoot,
  sha256Bytes,
} from './b0-v8-core.mjs';

export const SOURCE_UNIVERSE_V4_DATE = '2026-08-30';
export const SOURCE_UNIVERSE_V4_SCHEMA = 'CONNECT-SOURCE-UNIVERSE-V4-CANDIDATE-V1';
export const SOURCE_UNIVERSE_V4_TOOLCHAIN_REGISTRY_PATH =
  'docs/planning/source-universe-v4-toolchain-path-registry-v1-2026-08-30.json';
export const SOURCE_UNIVERSE_V4_TOOLCHAIN_PATHS = Object.freeze([
  SOURCE_UNIVERSE_V4_TOOLCHAIN_REGISTRY_PATH,
  'scripts/b0-v8-core.mjs',
  'scripts/verify-secret-hygiene.mjs',
  'scripts/source-universe-v4-core.mjs',
  'scripts/create-source-universe-v4-candidate.mjs',
  'scripts/verify-source-universe-v4-reader-a.mjs',
  'scripts/verify-source-universe-v4-reader-b.py',
  'scripts/finalize-source-universe-v4-candidate.mjs',
  'scripts/verify-source-universe-v4-candidate.mjs',
  'tests/source-universe-v4-core.test.mjs',
  'package.json',
]);

export function validateToolchainPathRegistry(registry) {
  assertClosedObject(
    registry,
    ['schema', 'toolchainPaths', 'version'],
    'toolchainPathRegistry',
  );
  if (
    registry.schema !== 'CONNECT-SOURCE-UNIVERSE-V4-TOOLCHAIN-PATH-REGISTRY-V1'
    || registry.version !== 1
  ) throw fail('toolchainPathRegistry: identity mismatch');
  assertExactArray(
    registry.toolchainPaths,
    SOURCE_UNIVERSE_V4_TOOLCHAIN_PATHS,
    'toolchainPathRegistry paths',
  );
  return true;
}

export const SOURCE_UNIVERSE_V4_FINDINGS = Object.freeze([
  ['SURS3-HR-F001', 'P0', 'literal source occurrence identity'],
  ['SURS3-HR-F002', 'P1', 'byte-executable target locators'],
  ['SURS3-HR-F003', 'P1', 'external input and normative output separation'],
  ['SURS3-HR-F004', 'P0', 'public policy before public-adjacent output'],
  ['SURS3-HR-F005', 'P0', 'admission dependency acyclicity'],
  ['SURS3-HR-F006', 'P0', 'archive and invalidation dependency acyclicity'],
  ['SURS3-HR-F007', 'P0', 'executable conformance envelopes'],
  ['SURS3-HR-F008', 'P0', 'one-to-one predecessor mutation identities'],
  ['SURS3-HR-F009', 'P0', 'controlled generation pair'],
  ['SURS3-HR-F010', 'P0', 'finite terminal and cause registry'],
  ['SURS3-HR-F011', 'P0', 'clause-lossless preservation'],
  ['SURS3-HR-F012', 'P1', 'independent source-admission review'],
  ['SURS3-HR-F013', 'P1', 'explicit no-random identity rule'],
  ['SURS3-HR-F014', 'P0', 'public detector thresholds'],
  ['SURS3-HR-F015', 'P1', 'opaque projection and key lifecycle'],
  ['SURS3-HR-F016', 'P0', 'finite public-egress discovery frontier'],
  ['SURS3-HR-F017', 'P1', 'decision-event authority-effect matrix'],
  ['SURS3-HR-F018', 'P1', 'provider runtime evidence producer'],
  ['SURS3-HR-F019', 'P1', 'dynamic authenticity and cache partitions'],
  ['SURS3-HR-F020', 'P1', 'erasure copy and key lineage'],
  ['SURS3-HR-F021', 'P1', 'authoritative-field trigger denominator'],
  ['SURS3-HR-F022', 'P1', 'closed independence relations'],
  ['SURS3-HR-F023', 'P1', 'semantic atomicity'],
  ['SURS3-HR-F024', 'P0', 'deterministic review and acceptance lifecycle'],
]);

export const SOURCE_UNIVERSE_V4_OUTPUT_NAMES = Object.freeze([
  'subject.json',
  'discovery-input-manifest.json',
  'cutoff-detached-envelope.json',
  'source-candidate-inventory.json',
  'public-source-projection.json',
  'private-custody-reference-manifest.json',
  'source-occurrence-ledger.json',
  'target-span-ledger.json',
  'object-class-sole-producer-registry.json',
  'explicit-dependency-graph.json',
  'semantic-dependency-graph.json',
  'authority-admission-state-terminal-field-registries.json',
  'public-handling-egress-detector-contracts.json',
  'lifecycle-contracts.json',
  'clause-preservation-crosswalk.json',
  'finding-closure-crosswalk.json',
  'conformance-vectors.json',
  'hostile-mutation-vectors.json',
  'controlled-generation-vectors.json',
  'reader-a-report.json',
  'reader-b-report.json',
  'package-manifest.json',
  'producer-qa.json',
]);

export function validateSourceUniverseOutputRegistry(registry) {
  assertClosedObject(registry, ['artifactId', 'outputDirectory', 'owner', 'packageMemberPaths', 'reviewAndAcceptancePaths', 'schema', 'version'], 'sourceUniverseOutputRegistry');
  if (
    registry.schema !== 'CONNECT-SOURCE-UNIVERSE-V4-OUTPUT-PATH-REGISTRY-V1'
    || registry.version !== 1
    || registry.owner !== 'Tal'
    || registry.artifactId !== 'CONNECT-SOURCE-UNIVERSE-V4-CANDIDATE-2026-08-30'
    || registry.packageMemberPaths.length !== 23
    || registry.reviewAndAcceptancePaths.length !== 5
  ) throw fail('sourceUniverseOutputRegistry: identity or denominator mismatch');
  const prefix = `${registry.outputDirectory}/`;
  const names = registry.packageMemberPaths.map((path) => {
    if (!path.startsWith(prefix)) throw fail('sourceUniverseOutputRegistry: member outside directory');
    return path.slice(prefix.length);
  });
  assertExactArray(names, SOURCE_UNIVERSE_V4_OUTPUT_NAMES, 'sourceUniverseOutputRegistry package names');
  const all = [...registry.packageMemberPaths, ...registry.reviewAndAcceptancePaths];
  if (new Set(all).size !== 28 || all.some((path) => !path.startsWith(prefix))) throw fail('sourceUniverseOutputRegistry: duplicate or escaped output');
  return true;
}

const SHA256_RE = /^[0-9a-f]{64}$/;
const GIT_OID_RE = /^[0-9a-f]{40}$/;
const SOURCE_TOKEN_RE = /SRC-[A-Z0-9-]+#[A-Z0-9._-]+/gu;
const FORBIDDEN_RANDOM_RE = /Math\.random\s*\(|crypto\.randomUUID\s*\(|\brandomUUID\s*\(/u;

function fail(message) {
  const error = new Error(message);
  error.code = 'INVALID_SOURCE_UNIVERSE_V4';
  return error;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) throw fail(`${label}: expected array`);
  return value;
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw fail(`${label}: expected non-empty string`);
  return value;
}

function assertSha(value, label) {
  if (typeof value !== 'string' || !SHA256_RE.test(value)) throw fail(`${label}: expected SHA-256`);
  return value;
}

function assertUnique(rows, key, label) {
  const values = rows.map((row) => row[key]);
  if (new Set(values).size !== values.length) throw fail(`${label}: duplicate ${key}`);
}

function assertExactArray(actual, expected, label) {
  if (canonical(actual) !== canonical(expected)) throw fail(`${label}: exact array mismatch`);
}

export function findMarkdownLevelTwoSectionSpan(bytes, identity) {
  if (!Buffer.isBuffer(bytes)) throw fail('sectionSpan: expected Buffer');
  assertString(identity, 'sectionSpan identity');
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) {
    throw fail(`sectionSpan: invalid UTF-8 source for ${identity}`);
  }

  const token = `\`${identity}\``;
  let searchFrom = 0;
  let tokenIndex = -1;
  let startCharacter = -1;
  while (searchFrom < text.length) {
    const candidate = text.indexOf(token, searchFrom);
    if (candidate < 0) break;
    const lineStart = text.lastIndexOf('\n', candidate) + 1;
    if (text.slice(lineStart, candidate).startsWith('## ')) {
      tokenIndex = candidate;
      startCharacter = lineStart;
      break;
    }
    searchFrom = candidate + token.length;
  }
  if (tokenIndex < 0) {
    throw fail(`sectionSpan: level-two heading not found for ${identity}`);
  }

  const nextHeading = text.indexOf(
    '\n## ',
    tokenIndex + token.length,
  );
  const endCharacter =
    nextHeading < 0 ? text.length : nextHeading + 1;
  return Object.freeze({
    endByte: Buffer.byteLength(
      text.slice(0, endCharacter),
      'utf8',
    ),
    startByte: Buffer.byteLength(
      text.slice(0, startCharacter),
      'utf8',
    ),
  });
}

export function makeFindingControls() {
  return SOURCE_UNIVERSE_V4_FINDINGS.map(([findingId, severity, description], index) => ({
    closureStatus: 'OPEN-INDEPENDENT-CLOSURE-REQUIRED',
    controlId: `SURS4-CTL-${String(index + 1).padStart(3, '0')}`,
    description,
    findingId,
    localStatus: 'PASS-FAIL-CLOSED-CANDIDATE-CONTROL',
    noMergeKey: `SURS4-NOMERGE-${findingId}`,
    ordinal: index + 1,
    severity,
  }));
}

export function validateFindingControls(rows) {
  assertArray(rows, 'findingControls');
  if (rows.length !== 24) throw fail('findingControls: expected 24 rows');
  assertUnique(rows, 'findingId', 'findingControls');
  assertUnique(rows, 'controlId', 'findingControls');
  assertUnique(rows, 'noMergeKey', 'findingControls');
  rows.forEach((row, index) => {
    assertClosedObject(row, ['closureStatus', 'controlId', 'description', 'findingId', 'localStatus', 'noMergeKey', 'ordinal', 'severity'], `findingControls[${index}]`);
    const [findingId, severity, description] = SOURCE_UNIVERSE_V4_FINDINGS[index];
    if (
      row.findingId !== findingId
      || row.severity !== severity
      || row.description !== description
      || row.ordinal !== index + 1
      || row.controlId !== `SURS4-CTL-${String(index + 1).padStart(3, '0')}`
      || row.localStatus !== 'PASS-FAIL-CLOSED-CANDIDATE-CONTROL'
      || row.closureStatus !== 'OPEN-INDEPENDENT-CLOSURE-REQUIRED'
    ) throw fail(`findingControls[${index}]: exact row mismatch`);
  });
  const p0 = rows.filter((row) => row.severity === 'P0').length;
  const p1 = rows.filter((row) => row.severity === 'P1').length;
  if (p0 !== 12 || p1 !== 12) throw fail('findingControls: severity denominator mismatch');
  return true;
}

export function scanSourceReferenceOccurrences(subjectBytes) {
  if (!Buffer.isBuffer(subjectBytes)) throw fail('subjectBytes: expected Buffer');
  const text = subjectBytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(subjectBytes)) throw fail('subjectBytes: invalid UTF-8');
  const matches = [...text.matchAll(SOURCE_TOKEN_RE)];
  return matches.map((match, index) => {
    const startByte = Buffer.byteLength(text.slice(0, match.index), 'utf8');
    const endByte = startByte + Buffer.byteLength(match[0], 'utf8');
    const basis = `${match[0]}\n${startByte}\n${endByte}`;
    return {
      consumerId: 'SOURCE-UNIVERSE-V4-SUBJECT',
      endByte,
      occurrenceId: `SURS4-OCC-${sha256Bytes(Buffer.from(basis, 'utf8')).slice(0, 24).toUpperCase()}`,
      ordinal: index + 1,
      startByte,
      targetId: match[0],
      token: match[0],
    };
  });
}

export function validateOccurrenceLedger(ledger, subjectBytes) {
  assertClosedObject(ledger, ['artifactId', 'occurrenceCount', 'occurrenceRoot', 'rows', 'schemaVersion', 'subjectSha256'], 'occurrenceLedger');
  assertSha(ledger.subjectSha256, 'occurrenceLedger.subjectSha256');
  if (ledger.subjectSha256 !== sha256Bytes(subjectBytes)) throw fail('occurrenceLedger: subject root mismatch');
  const expectedRows = scanSourceReferenceOccurrences(subjectBytes);
  assertExactArray(ledger.rows, expectedRows, 'occurrenceLedger.rows');
  if (ledger.occurrenceCount !== expectedRows.length) throw fail('occurrenceLedger: count mismatch');
  const projection = { rows: expectedRows, subjectSha256: ledger.subjectSha256 };
  if (ledger.occurrenceRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-OCCURRENCES-V1', projection)) throw fail('occurrenceLedger: root mismatch');
  assertUnique(ledger.rows, 'occurrenceId', 'occurrenceLedger.rows');
  return true;
}

export function validateTargetSpanLedger(ledger, sourceBytesByPath) {
  assertClosedObject(ledger, ['artifactId', 'rowCount', 'rows', 'schemaVersion', 'targetRoot'], 'targetSpanLedger');
  assertArray(ledger.rows, 'targetSpanLedger.rows');
  if (ledger.rowCount !== ledger.rows.length) throw fail('targetSpanLedger: count mismatch');
  assertUnique(ledger.rows, 'targetId', 'targetSpanLedger.rows');
  ledger.rows.forEach((row, index) => {
    assertClosedObject(row, ['byteLength', 'endByte', 'path', 'sourceBlobSha256', 'sourceCommit', 'spanSha256', 'startByte', 'targetId'], `targetSpanLedger.rows[${index}]`);
    const bytes = sourceBytesByPath.get(row.path);
    if (!Buffer.isBuffer(bytes)) throw fail(`targetSpanLedger.rows[${index}]: source bytes missing`);
    if (!Number.isSafeInteger(row.startByte) || !Number.isSafeInteger(row.endByte) || row.startByte < 0 || row.endByte <= row.startByte || row.endByte > bytes.length) throw fail(`targetSpanLedger.rows[${index}]: invalid byte bounds`);
    if (row.sourceBlobSha256 !== sha256Bytes(bytes)) throw fail(`targetSpanLedger.rows[${index}]: source root mismatch`);
    const span = bytes.subarray(row.startByte, row.endByte);
    if (row.byteLength !== span.length || row.spanSha256 !== sha256Bytes(span)) throw fail(`targetSpanLedger.rows[${index}]: span mismatch`);
  });
  const projection = { rows: ledger.rows };
  if (ledger.targetRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-TARGET-SPANS-V1', projection)) throw fail('targetSpanLedger: root mismatch');
  return true;
}

export function validateObjectRegistry(registry) {
  assertClosedObject(registry, ['artifactId', 'dualClassCount', 'missingProducerCount', 'objectCount', 'objects', 'registryRoot', 'schemaVersion', 'semanticAtomicityViolationCount'], 'objectRegistry');
  assertArray(registry.objects, 'objectRegistry.objects');
  if (registry.objectCount !== registry.objects.length) throw fail('objectRegistry: count mismatch');
  if (registry.dualClassCount !== 0 || registry.missingProducerCount !== 0 || registry.semanticAtomicityViolationCount !== 0) throw fail('objectRegistry: blocking counters are non-zero');
  assertUnique(registry.objects, 'objectId', 'objectRegistry.objects');
  registry.objects.forEach((row, index) => {
    assertClosedObject(row, ['objectClass', 'objectId', 'path', 'producerId'], `objectRegistry.objects[${index}]`);
    if (!['EXTERNAL-INPUT', 'NORMATIVE-OUTPUT', 'OBSERVATION', 'EVIDENCE'].includes(row.objectClass)) throw fail(`objectRegistry.objects[${index}]: invalid class`);
    assertString(row.producerId, `objectRegistry.objects[${index}].producerId`);
  });
  if (registry.registryRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-OBJECT-REGISTRY-V1', { objects: registry.objects })) throw fail('objectRegistry: root mismatch');
  return true;
}

function graphProjection(graph) {
  return { edges: graph.edges, nodes: graph.nodes };
}

export function validateDependencyGraph(graph) {
  assertClosedObject(graph, ['artifactId', 'cycleCount', 'edgeCount', 'edges', 'graphRoot', 'hiddenEdgeCount', 'nodeCount', 'nodes', 'schemaVersion', 'selfEdgeCount', 'unknownNodeCount'], 'dependencyGraph');
  assertArray(graph.nodes, 'dependencyGraph.nodes');
  assertArray(graph.edges, 'dependencyGraph.edges');
  if (graph.nodeCount !== graph.nodes.length || graph.edgeCount !== graph.edges.length) throw fail('dependencyGraph: count mismatch');
  if (graph.cycleCount !== 0 || graph.hiddenEdgeCount !== 0 || graph.selfEdgeCount !== 0 || graph.unknownNodeCount !== 0) throw fail('dependencyGraph: blocking counters are non-zero');
  assertUnique(graph.nodes, 'nodeId', 'dependencyGraph.nodes');
  assertUnique(graph.edges, 'edgeId', 'dependencyGraph.edges');
  const nodeIds = new Set(graph.nodes.map((row) => row.nodeId));
  const adjacency = new Map(graph.nodes.map((row) => [row.nodeId, []]));
  const incoming = new Map(graph.nodes.map((row) => [row.nodeId, 0]));
  graph.edges.forEach((edge, index) => {
    assertClosedObject(edge, ['edgeId', 'edgeType', 'from', 'to'], `dependencyGraph.edges[${index}]`);
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to) || edge.from === edge.to) throw fail(`dependencyGraph.edges[${index}]: invalid endpoint`);
    adjacency.get(edge.from).push(edge.to);
    incoming.set(edge.to, incoming.get(edge.to) + 1);
  });
  const queue = [...incoming.entries()].filter(([, count]) => count === 0).map(([nodeId]) => nodeId).sort();
  let visited = 0;
  while (queue.length > 0) {
    const nodeId = queue.shift();
    visited += 1;
    for (const target of adjacency.get(nodeId).sort()) {
      const next = incoming.get(target) - 1;
      incoming.set(target, next);
      if (next === 0) {
        queue.push(target);
        queue.sort();
      }
    }
  }
  if (visited !== graph.nodes.length) throw fail('dependencyGraph: executable cycle detected');
  if (graph.graphRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-DEPENDENCY-GRAPH-V1', graphProjection(graph))) throw fail('dependencyGraph: root mismatch');
  return true;
}

export function validateGraphPair(explicitGraph, semanticGraph) {
  validateDependencyGraph(explicitGraph);
  validateDependencyGraph(semanticGraph);
  if (canonical(graphProjection(explicitGraph)) !== canonical(graphProjection(semanticGraph))) throw fail('dependency graphs: explicit and semantic projections differ');
  return true;
}

export function expectedMutationIdentities() {
  const ranges = [
    ['V2-REQUIREMENT', 'SURS', '-', 26],
    ['V2-REVIEW-FINDING', 'SURS2-HR-F', '', 20],
    ['V1-REVIEW-FINDING', 'SURS-HR-F', '', 32],
    ['V3-REVIEW-FINDING', 'SURS3-HR-F', '', 24],
  ];
  return ranges.flatMap(([category, prefix, separator, count]) => Array.from({ length: count }, (_, index) => ({
    category,
    sourceIdentity: `${prefix}${separator}${String(index + 1).padStart(3, '0')}`,
  })));
}

export function makeByteDeletionMutationVector({ category, sourceIdentity, path, sourceBytes, sourceCommit, startByte, endByte, unaffectedSet = [] }) {
  if (!Buffer.isBuffer(sourceBytes)) throw fail('sourceBytes: expected Buffer');
  if (!Number.isSafeInteger(startByte) || !Number.isSafeInteger(endByte) || startByte < 0 || endByte <= startByte || endByte > sourceBytes.length) throw fail('mutation vector: invalid bounds');
  const postimage = Buffer.concat([sourceBytes.subarray(0, startByte), sourceBytes.subarray(startByte + 1)]);
  const vectorId = `SURS4-MUT-${sha256Bytes(Buffer.from(`${category}\n${sourceIdentity}\n${path}\n${startByte}`, 'utf8')).slice(0, 24).toUpperCase()}`;
  return {
    affectedSet: [sourceIdentity],
    category,
    delta: { deleteByteCount: 1, operation: 'DELETE-EXACT-BYTE', startByte },
    endByte,
    expectedTerminal: 'CLAUSE-PRESERVATION-BLOCKED',
    path,
    postimageSha256: sha256Bytes(postimage),
    preimageSha256: sha256Bytes(sourceBytes),
    sourceCommit,
    sourceIdentity,
    startByte,
    unaffectedSet,
    vectorId,
  };
}

export function validateMutationVectors(corpus, sourceBytesByPath) {
  assertClosedObject(corpus, ['artifactId', 'blockedCount', 'categoryCounts', 'schemaVersion', 'vectorCount', 'vectors', 'vectorsRoot'], 'mutationCorpus');
  assertArray(corpus.vectors, 'mutationCorpus.vectors');
  if (corpus.vectorCount !== 102 || corpus.vectors.length !== 102 || corpus.blockedCount !== 102) throw fail('mutationCorpus: expected 102 blocked vectors');
  const identities = expectedMutationIdentities();
  assertExactArray(corpus.vectors.map(({ category, sourceIdentity }) => ({ category, sourceIdentity })), identities, 'mutationCorpus identities');
  assertUnique(corpus.vectors, 'vectorId', 'mutationCorpus.vectors');
  corpus.vectors.forEach((vector, index) => {
    assertClosedObject(vector, ['affectedSet', 'category', 'delta', 'endByte', 'expectedTerminal', 'path', 'postimageSha256', 'preimageSha256', 'sourceCommit', 'sourceIdentity', 'startByte', 'unaffectedSet', 'vectorId'], `mutationCorpus.vectors[${index}]`);
    const bytes = sourceBytesByPath.get(vector.path);
    if (!Buffer.isBuffer(bytes) || sha256Bytes(bytes) !== vector.preimageSha256) throw fail(`mutationCorpus.vectors[${index}]: preimage mismatch`);
    const postimage = Buffer.concat([bytes.subarray(0, vector.delta.startByte), bytes.subarray(vector.delta.startByte + vector.delta.deleteByteCount)]);
    if (vector.delta.operation !== 'DELETE-EXACT-BYTE' || vector.delta.deleteByteCount !== 1 || vector.postimageSha256 !== sha256Bytes(postimage) || vector.expectedTerminal !== 'CLAUSE-PRESERVATION-BLOCKED') throw fail(`mutationCorpus.vectors[${index}]: operation mismatch`);
  });
  const expectedCounts = {
    'V1-REVIEW-FINDING': 32,
    'V2-REQUIREMENT': 26,
    'V2-REVIEW-FINDING': 20,
    'V3-REVIEW-FINDING': 24,
  };
  if (canonical(corpus.categoryCounts) !== canonical(expectedCounts)) throw fail('mutationCorpus: category counts mismatch');
  if (corpus.vectorsRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-MUTATION-VECTORS-V1', { vectors: corpus.vectors })) throw fail('mutationCorpus: root mismatch');
  return true;
}

export function validateNoRandomSources(sourceRows) {
  assertArray(sourceRows, 'sourceRows');
  for (const row of sourceRows) {
    if (FORBIDDEN_RANDOM_RE.test(row.bytes.toString('utf8'))) throw fail(`forbidden randomness API in ${row.path}`);
  }
  return true;
}

export function makeControlRegistry() {
  const terminalIds = [
    'SOURCE-REFERENCE-BLOCKED',
    'DEPENDENCY-CLOSURE-BLOCKED',
    'PUBLIC-EGRESS-BLOCKED',
    'ADMISSION-REVIEW-BLOCKED',
    'PROVIDER-EVIDENCE-BLOCKED',
    'STALE-GENERATION-BLOCKED',
    'CLAUSE-PRESERVATION-BLOCKED',
    'LIFECYCLE-BLOCKED',
    'REVIEW-LIFECYCLE-BLOCKED',
  ];
  const authoritativeFieldIds = [
    'SOURCE-BYTES',
    'SOURCE-AUTHORITY',
    'SOURCE-CUSTODY',
    'SOURCE-FRESHNESS',
    'SOURCE-LOCATOR',
    'SOURCE-LEGAL-BASIS',
    'SOURCE-RETENTION',
  ];
  return {
    admission: {
      admissionWithoutIndependentReview: 'BLOCK',
      candidateFamiliesClosed: true,
      independentReviewRequired: true,
      selectorMayReviewOwnAdmission: false,
    },
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-CONTROL-REGISTRY-2026-08-30-G0',
    authorityEventMatrix: {
      eventTypes: ['DIRECTIVE', 'AMENDMENT', 'PROVIDER-OBSERVATION', 'REVOCATION', 'EXPIRY'],
      missingEffectCount: 0,
      unknownEventEffect: 'BLOCK',
    },
    authoritativeFields: {
      fieldIds: authoritativeFieldIds,
      triggerFieldIds: [...authoritativeFieldIds],
    },
    independenceRelations: {
      closed: true,
      relationIds: ['SELECTOR-REVIEWER', 'PRODUCER-READER', 'REVIEWER-RECONCILER', 'RECONCILER-APPROVER'],
      unknownRelation: 'BLOCK',
    },
    noRandomIdentity: {
      cryptoRandomRequiresPerUseApproval: true,
      deterministicContentIdsRequired: true,
      mathRandomForbidden: true,
      processLocalCountersForbidden: true,
    },
    dynamicSources: {
      authenticityRequired: true,
      cachePartitionKeys: ['PROVIDER', 'ACCOUNT', 'ENVIRONMENT', 'ASSET', 'GRAPH-VERSION'],
      staleAction: 'BLOCK',
      unknownPartitionAction: 'BLOCK',
    },
    providerRuntime: {
      acquisitionEdgePresent: true,
      admissionEnabled: false,
      liveEvidenceStatus: 'ABSENT-BLOCKING',
      producerId: 'EXTERNAL-PROVIDER-OBSERVATION-ADAPTER',
    },
    reviewLifecycle: {
      acceptanceRequiresExactPackageRoot: true,
      deterministicTransitions: true,
      selfAcceptanceForbidden: true,
      states: ['CANDIDATE', 'UNDER-REVIEW', 'RECONCILING', 'AWAITING-TAL-APPROVAL', 'ACCEPTED', 'REJECTED', 'SUPERSEDED'],
      currentState: 'CANDIDATE',
    },
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-CONTROL-REGISTRY-V1',
    stateAxes: ['AUTHENTICITY', 'AUTHORITY', 'CUSTODY', 'FRESHNESS', 'SUFFICIENCY', 'PUBLIC-SAFETY', 'LIFECYCLE'],
    terminals: terminalIds,
  };
}

export function validateControlRegistry(registry) {
  assertClosedObject(registry, ['admission', 'artifactId', 'authorityEventMatrix', 'authoritativeFields', 'dynamicSources', 'independenceRelations', 'noRandomIdentity', 'providerRuntime', 'reviewLifecycle', 'schemaVersion', 'stateAxes', 'terminals'], 'controlRegistry');
  if (
    registry.admission.independentReviewRequired !== true
    || registry.admission.selectorMayReviewOwnAdmission !== false
    || registry.authorityEventMatrix.missingEffectCount !== 0
    || registry.independenceRelations.closed !== true
    || registry.noRandomIdentity.mathRandomForbidden !== true
    || registry.noRandomIdentity.cryptoRandomRequiresPerUseApproval !== true
    || registry.reviewLifecycle.selfAcceptanceForbidden !== true
    || registry.reviewLifecycle.currentState !== 'CANDIDATE'
    || registry.providerRuntime.acquisitionEdgePresent !== true
    || registry.providerRuntime.liveEvidenceStatus !== 'ABSENT-BLOCKING'
    || registry.providerRuntime.admissionEnabled !== false
    || registry.dynamicSources.authenticityRequired !== true
    || registry.dynamicSources.staleAction !== 'BLOCK'
    || registry.dynamicSources.unknownPartitionAction !== 'BLOCK'
  ) throw fail('controlRegistry: fail-closed invariants missing');
  assertExactArray(registry.authoritativeFields.fieldIds, registry.authoritativeFields.triggerFieldIds, 'controlRegistry authoritative triggers');
  if (new Set(registry.terminals).size !== registry.terminals.length || registry.terminals.length !== 9) throw fail('controlRegistry: terminal denominator mismatch');
  return true;
}

export function makePublicContracts() {
  return {
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-PUBLIC-CONTRACTS-2026-08-30-G0',
    detector: {
      criticalFalseNegativeMaximum: 0,
      evidenceStatus: 'ABSENT-BLOCKING',
      publicWritesEnabled: false,
      thresholdProfileStatus: 'DEFINED-NOT-LIVE-VALIDATED',
    },
    egress: {
      discoveryFrontier: 'DECLARED-SINKS-PLUS-UNKNOWN-BLOCK',
      knownSinkClasses: ['PUBLIC-GIT', 'LOG', 'REPORT', 'HTTP-RESPONSE', 'PROVIDER-WRITE'],
      unknownSinkAction: 'BLOCK',
    },
    opaqueProjection: {
      keyLifecycleStatus: 'ABSENT-BLOCKING',
      publicOpaqueProjectionEnabled: false,
      status: 'BLOCKED-PENDING-PER-USE-CRYPTO-APPROVAL',
    },
    policy: {
      acceptedPolicyRootPresent: false,
      policyPrecedesAllPublicAdjacentWrites: true,
      prePolicyWriteAction: 'BLOCK-WITHOUT-PAYLOAD',
    },
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-PUBLIC-CONTRACTS-V1',
  };
}

export function validatePublicContracts(contracts) {
  assertClosedObject(contracts, ['artifactId', 'detector', 'egress', 'opaqueProjection', 'policy', 'schemaVersion'], 'publicContracts');
  if (
    contracts.policy.policyPrecedesAllPublicAdjacentWrites !== true
    || contracts.policy.prePolicyWriteAction !== 'BLOCK-WITHOUT-PAYLOAD'
    || contracts.detector.criticalFalseNegativeMaximum !== 0
    || contracts.detector.evidenceStatus !== 'ABSENT-BLOCKING'
    || contracts.detector.publicWritesEnabled !== false
    || contracts.egress.unknownSinkAction !== 'BLOCK'
    || contracts.opaqueProjection.status !== 'BLOCKED-PENDING-PER-USE-CRYPTO-APPROVAL'
    || contracts.opaqueProjection.publicOpaqueProjectionEnabled !== false
  ) throw fail('publicContracts: fail-closed invariants missing');
  return true;
}

export function makeLifecycleContracts() {
  const copyClasses = ['PRIMARY', 'BACKUP', 'RESTORE', 'ARCHIVE', 'CACHE', 'LOG', 'DERIVATIVE', 'KEY-MATERIAL'];
  return {
    archiveRestoreSeparation: true,
    artifactId: 'CONNECT-SOURCE-UNIVERSE-V4-LIFECYCLE-CONTRACTS-2026-08-30-G0',
    atomicStateTransitionRequired: true,
    copyClasses,
    erasureRequiresEveryCopyClass: [...copyClasses],
    keyLineageClosureRequired: true,
    legalHoldBlocksDeletion: true,
    resurrectionAction: 'BLOCK',
    schemaVersion: 'CONNECT-SOURCE-UNIVERSE-V4-LIFECYCLE-CONTRACTS-V1',
    tombstoneRequired: true,
  };
}

export function validateLifecycleContracts(contracts) {
  assertClosedObject(contracts, ['archiveRestoreSeparation', 'artifactId', 'atomicStateTransitionRequired', 'copyClasses', 'erasureRequiresEveryCopyClass', 'keyLineageClosureRequired', 'legalHoldBlocksDeletion', 'resurrectionAction', 'schemaVersion', 'tombstoneRequired'], 'lifecycleContracts');
  if (
    contracts.archiveRestoreSeparation !== true
    || contracts.atomicStateTransitionRequired !== true
    || contracts.keyLineageClosureRequired !== true
    || contracts.legalHoldBlocksDeletion !== true
    || contracts.resurrectionAction !== 'BLOCK'
    || contracts.tombstoneRequired !== true
  ) throw fail('lifecycleContracts: fail-closed invariants missing');
  assertExactArray(contracts.copyClasses, contracts.erasureRequiresEveryCopyClass, 'lifecycleContracts copy closure');
  return true;
}

export function validatePreservationCrosswalk(crosswalk) {
  assertClosedObject(crosswalk, ['artifactId', 'fullLocalCount', 'rowCount', 'rows', 'schemaVersion', 'crosswalkRoot'], 'preservationCrosswalk');
  const expected = expectedMutationIdentities().filter(({ category }) => category !== 'V3-REVIEW-FINDING');
  assertArray(crosswalk.rows, 'preservationCrosswalk.rows');
  if (crosswalk.rowCount !== 78 || crosswalk.fullLocalCount !== 78 || crosswalk.rows.length !== 78) throw fail('preservationCrosswalk: expected 78 local rows');
  assertExactArray(crosswalk.rows.map(({ category, sourceIdentity }) => ({ category, sourceIdentity })), expected, 'preservationCrosswalk identities');
  assertUnique(crosswalk.rows, 'rowId', 'preservationCrosswalk.rows');
  crosswalk.rows.forEach((row, index) => {
    assertClosedObject(row, ['category', 'destinationControlIds', 'mutationVectorId', 'rowId', 'sourceIdentity', 'sourcePath', 'sourceSpanSha256', 'status'], `preservationCrosswalk.rows[${index}]`);
    if (row.status !== 'FULL-LOCAL-NOT-INDEPENDENTLY-ACCEPTED' || row.destinationControlIds.length === 0) throw fail(`preservationCrosswalk.rows[${index}]: invalid status`);
    assertSha(row.sourceSpanSha256, `preservationCrosswalk.rows[${index}].sourceSpanSha256`);
  });
  if (crosswalk.crosswalkRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-PRESERVATION-CROSSWALK-V1', { rows: crosswalk.rows })) throw fail('preservationCrosswalk: root mismatch');
  return true;
}

export function validateFindingCrosswalk(crosswalk) {
  assertClosedObject(crosswalk, ['artifactId', 'closureCount', 'findingCount', 'rows', 'schemaVersion', 'crosswalkRoot'], 'findingCrosswalk');
  assertArray(crosswalk.rows, 'findingCrosswalk.rows');
  if (crosswalk.findingCount !== 24 || crosswalk.closureCount !== 0 || crosswalk.rows.length !== 24) throw fail('findingCrosswalk: denominator mismatch');
  const controls = makeFindingControls();
  assertExactArray(crosswalk.rows.map(({ findingId }) => findingId), controls.map(({ findingId }) => findingId), 'findingCrosswalk identities');
  assertUnique(crosswalk.rows, 'findingId', 'findingCrosswalk.rows');
  assertUnique(crosswalk.rows, 'noMergeKey', 'findingCrosswalk.rows');
  crosswalk.rows.forEach((row, index) => {
    assertClosedObject(row, ['closureStatus', 'controlId', 'findingId', 'localStatus', 'mutationVectorId', 'noMergeKey', 'severity', 'sourceSpanSha256'], `findingCrosswalk.rows[${index}]`);
    if (
      row.closureStatus !== 'OPEN-INDEPENDENT-CLOSURE-REQUIRED'
      || row.localStatus !== 'PASS-FAIL-CLOSED-CANDIDATE-CONTROL'
      || row.controlId !== controls[index].controlId
      || row.severity !== controls[index].severity
    ) throw fail(`findingCrosswalk.rows[${index}]: invalid status`);
  });
  if (crosswalk.crosswalkRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-FINDING-CROSSWALK-V1', { rows: crosswalk.rows })) throw fail('findingCrosswalk: root mismatch');
  return true;
}

export function validateConformanceVectors(corpus) {
  assertClosedObject(corpus, ['artifactId', 'passCount', 'schemaVersion', 'vectorCount', 'vectors', 'vectorsRoot'], 'conformanceCorpus');
  assertArray(corpus.vectors, 'conformanceCorpus.vectors');
  if (corpus.vectorCount !== 24 || corpus.passCount !== 24 || corpus.vectors.length !== 24) throw fail('conformanceCorpus: expected 24 local vectors');
  const controls = makeFindingControls();
  assertExactArray(corpus.vectors.map(({ controlId }) => controlId), controls.map(({ controlId }) => controlId), 'conformanceCorpus controls');
  assertUnique(corpus.vectors, 'vectorId', 'conformanceCorpus.vectors');
  corpus.vectors.forEach((row, index) => {
    assertClosedObject(row, ['controlId', 'expectedTerminal', 'findingId', 'inputArtifactIds', 'operationId', 'status', 'vectorId'], `conformanceCorpus.vectors[${index}]`);
    if (row.findingId !== controls[index].findingId || row.expectedTerminal !== 'LOCAL-CONTROL-PASS' || row.status !== 'PASS-LOCAL-CANDIDATE-NOT-CLOSURE' || row.inputArtifactIds.length === 0) throw fail(`conformanceCorpus.vectors[${index}]: invalid vector`);
  });
  if (corpus.vectorsRoot !== contentRoot('CONNECT-SOURCE-UNIVERSE-V4-CONFORMANCE-VECTORS-V1', { vectors: corpus.vectors })) throw fail('conformanceCorpus: root mismatch');
  return true;
}

export function validateControlledGeneration(contract) {
  assertClosedObject(contract, ['acceptanceCandidate', 'artifactId', 'generationA', 'generationB', 'schemaVersion', 'status', 'terminal'], 'controlledGeneration');
  if (
    contract.status !== 'BLOCKED-PENDING-GENERATION-B'
    || contract.terminal !== 'STALE-GENERATION-BLOCKED'
    || contract.acceptanceCandidate !== null
    || contract.generationB !== null
    || contract.generationA === null
  ) throw fail('controlledGeneration: missing fail-closed Generation B state');
  return true;
}

function graphHasEdge(graph, from, to) {
  return graph.edges.some((edge) => edge.from === from && edge.to === to);
}

export function evaluateLocalControls({
  conformanceCorpus,
  controlRegistry,
  controlledGeneration,
  explicitGraph,
  findingCrosswalk,
  lifecycleContracts,
  mutationCorpus,
  noRandomSourcesPass,
  objectRegistry,
  occurrenceLedgerPass,
  preservationCrosswalk,
  publicContracts,
  semanticGraph,
  targetSpanLedgerPass,
}) {
  const controls = makeFindingControls();
  const check = (ordinal, condition, evidence) => ({
    controlId: controls[ordinal - 1].controlId,
    evidence,
    findingId: controls[ordinal - 1].findingId,
    result: condition ? 'PASS' : 'BLOCK',
  });
  const graphPairPass = (() => {
    try {
      validateGraphPair(explicitGraph, semanticGraph);
      return true;
    } catch {
      return false;
    }
  })();
  const rows = [
    check(1, occurrenceLedgerPass === true, 'SOURCE-OCCURRENCE-LEDGER'),
    check(2, targetSpanLedgerPass === true, 'TARGET-SPAN-LEDGER'),
    check(3, objectRegistry.dualClassCount === 0 && objectRegistry.missingProducerCount === 0, 'OBJECT-CLASS-SOLE-PRODUCER-REGISTRY'),
    check(4, publicContracts.policy.policyPrecedesAllPublicAdjacentWrites === true && graphHasEdge(explicitGraph, 'PUBLIC-POLICY', 'PUBLIC-PROJECTION'), 'PUBLIC-POLICY-ORDER'),
    check(5, graphPairPass && graphHasEdge(explicitGraph, 'BOOTSTRAP-TYPES', 'ADMISSION'), 'ADMISSION-GRAPH'),
    check(6, graphPairPass && graphHasEdge(explicitGraph, 'BOOTSTRAP-TYPES', 'LIFECYCLE'), 'LIFECYCLE-GRAPH'),
    check(7, conformanceCorpus.vectorCount === 24 && conformanceCorpus.passCount === 24, 'CONFORMANCE-VECTORS'),
    check(8, mutationCorpus.vectorCount === 102 && mutationCorpus.blockedCount === 102, 'HOSTILE-MUTATION-VECTORS'),
    check(9, controlledGeneration.status === 'BLOCKED-PENDING-GENERATION-B' && controlledGeneration.generationB === null, 'CONTROLLED-GENERATION-FAIL-CLOSED'),
    check(10, controlRegistry.terminals.length === 9 && new Set(controlRegistry.terminals).size === 9, 'FINITE-TERMINAL-REGISTRY'),
    check(11, preservationCrosswalk.rowCount === 78 && preservationCrosswalk.fullLocalCount === 78, 'CLAUSE-PRESERVATION-CROSSWALK'),
    check(12, controlRegistry.admission.independentReviewRequired === true && controlRegistry.admission.selectorMayReviewOwnAdmission === false, 'ADMISSION-REVIEW-CONTRACT'),
    check(13, noRandomSourcesPass === true && controlRegistry.noRandomIdentity.mathRandomForbidden === true, 'NO-RANDOM-SOURCE-SCAN'),
    check(14, publicContracts.detector.criticalFalseNegativeMaximum === 0 && publicContracts.detector.publicWritesEnabled === false, 'PUBLIC-DETECTOR-FAIL-CLOSED'),
    check(15, publicContracts.opaqueProjection.publicOpaqueProjectionEnabled === false && publicContracts.opaqueProjection.status === 'BLOCKED-PENDING-PER-USE-CRYPTO-APPROVAL', 'OPAQUE-PROJECTION-BLOCK'),
    check(16, publicContracts.egress.discoveryFrontier === 'DECLARED-SINKS-PLUS-UNKNOWN-BLOCK' && publicContracts.egress.unknownSinkAction === 'BLOCK', 'PUBLIC-EGRESS-FRONTIER'),
    check(17, controlRegistry.authorityEventMatrix.missingEffectCount === 0 && controlRegistry.authorityEventMatrix.unknownEventEffect === 'BLOCK', 'AUTHORITY-EFFECT-MATRIX'),
    check(18, controlRegistry.providerRuntime.acquisitionEdgePresent === true && controlRegistry.providerRuntime.admissionEnabled === false, 'PROVIDER-EVIDENCE-PRODUCER'),
    check(19, controlRegistry.dynamicSources.authenticityRequired === true && controlRegistry.dynamicSources.unknownPartitionAction === 'BLOCK', 'DYNAMIC-SOURCE-PARTITIONS'),
    check(20, canonical(lifecycleContracts.copyClasses) === canonical(lifecycleContracts.erasureRequiresEveryCopyClass) && lifecycleContracts.keyLineageClosureRequired === true, 'ERASURE-COPY-KEY-LINEAGE'),
    check(21, canonical(controlRegistry.authoritativeFields.fieldIds) === canonical(controlRegistry.authoritativeFields.triggerFieldIds), 'AUTHORITATIVE-FIELD-TRIGGERS'),
    check(22, controlRegistry.independenceRelations.closed === true && controlRegistry.independenceRelations.unknownRelation === 'BLOCK', 'INDEPENDENCE-RELATIONS'),
    check(23, objectRegistry.semanticAtomicityViolationCount === 0 && lifecycleContracts.atomicStateTransitionRequired === true, 'SEMANTIC-ATOMICITY'),
    check(24, findingCrosswalk.closureCount === 0 && controlRegistry.reviewLifecycle.currentState === 'CANDIDATE' && controlRegistry.reviewLifecycle.selfAcceptanceForbidden === true, 'REVIEW-ACCEPTANCE-LIFECYCLE'),
  ];
  return rows;
}

export function verificationRoot(checks) {
  return contentRoot('CONNECT-SOURCE-UNIVERSE-V4-READER-CHECKS-V1', checks);
}

export const SOURCE_UNIVERSE_V4_READER_CHECKS = Object.freeze([
  ['SURS4-READ-001', 'OUTPUT-REGISTRY'],
  ['SURS4-READ-002', 'SUBJECT-INVARIANTS'],
  ['SURS4-READ-003', 'CUTOFF-BINDING'],
  ['SURS4-READ-004', 'DISCOVERY-MANIFEST'],
  ['SURS4-READ-005', 'CANDIDATE-INVENTORY'],
  ['SURS4-READ-006', 'PUBLIC-METADATA-PROJECTION'],
  ['SURS4-READ-007', 'PRIVATE-CUSTODY-FAIL-CLOSED'],
  ['SURS4-READ-008', 'SOURCE-OCCURRENCES'],
  ['SURS4-READ-009', 'TARGET-SPANS'],
  ['SURS4-READ-010', 'OBJECT-CLASS-SOLE-PRODUCER'],
  ['SURS4-READ-011', 'EXPLICIT-SEMANTIC-GRAPH-IDENTITY'],
  ['SURS4-READ-012', 'CONTROL-REGISTRIES'],
  ['SURS4-READ-013', 'PUBLIC-CONTRACTS'],
  ['SURS4-READ-014', 'LIFECYCLE-CONTRACTS'],
  ['SURS4-READ-015', 'CLAUSE-PRESERVATION-78'],
  ['SURS4-READ-016', 'FINDING-CROSSWALK-24'],
  ['SURS4-READ-017', 'CONFORMANCE-VECTORS-24'],
  ['SURS4-READ-018', 'MUTATION-VECTORS-102'],
  ['SURS4-READ-019', 'CONTROLLED-GENERATION-FAIL-CLOSED'],
  ['SURS4-READ-020', 'NO-RANDOM-TOOLCHAIN-SCAN'],
  ['SURS4-READ-021', 'LOCAL-CONTROLS-24'],
  ['SURS4-READ-022', 'NO-PRIVATE-LOCATOR'],
  ['SURS4-READ-023', 'NO-SECRET-SHAPED-CONTENT'],
  ['SURS4-READ-024', 'PUBLIC-FREEZE-GATE-INVARIANTS'],
]);

export function makeReaderChecks() {
  return SOURCE_UNIVERSE_V4_READER_CHECKS.map(([checkId, evidence], index) => ({
    checkId,
    evidence,
    ordinal: index + 1,
    result: 'PASS',
  }));
}

export function validateReaderReport(report) {
  assertClosedObject(report, ['artifactId', 'checks', 'limitations', 'normativeMemberCount', 'observedHead', 'readerId', 'readerImplementation', 'schemaVersion', 'status', 'toolchainRoot', 'verificationRoot'], 'readerReport');
  assertExactArray(report.checks, makeReaderChecks(), 'readerReport checks');
  if (
    report.normativeMemberCount !== 19
    || report.status !== 'PASS-LOCAL-CANDIDATE-NOT-ACCEPTED'
    || !['READER-A', 'READER-B'].includes(report.readerId)
    || !['NODE-STDLIB', 'PYTHON-STDLIB'].includes(report.readerImplementation)
    || !SHA256_RE.test(report.toolchainRoot)
    || report.verificationRoot !== verificationRoot(report.checks)
  ) throw fail('readerReport: identity or result mismatch');
  if (!GIT_OID_RE.test(report.observedHead)) throw fail('readerReport: invalid observedHead');
  return true;
}
