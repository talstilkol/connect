#!/usr/bin/env node
/* Deterministic Public/Cyber v5 planning-package producer. Standard library only. */

import fs from 'node:fs';
import crypto from 'node:crypto';

const DATE = '2026-08-30';
const MAX_MEMBER_BYTES_EXCLUSIVE = 50 * 1024 * 1024;
const SHARD_TARGET_PAYLOAD_BYTES_EXCLUSIVE = 256 * 1024;
const P = {
  subject: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-${DATE}.md`,
  inputs: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-frozen-input-manifest-${DATE}.json`,
  closures: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-finding-identity-and-closure-registry-${DATE}.json`,
  schemas: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-closed-schema-and-type-registry-${DATE}.json`,
  digests: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-canonical-digest-and-serialization-registry-${DATE}.json`,
  authority: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-producer-authority-and-separation-graph-${DATE}.json`,
  lifecycle: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-lifecycle-cas-and-recovery-registry-${DATE}.json`,
  permits: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-four-permit-registry-${DATE}.json`,
  publicFlow: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-public-information-flow-and-scanner-registry-${DATE}.json`,
  publication: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-publication-size-shard-and-storage-registry-${DATE}.json`,
  vectorIndex: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-executable-causal-vector-corpus-${DATE}.json`,
  graph: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-causal-graph-${DATE}.json`,
  manifest: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-atomic-package-manifest-${DATE}.json`,
  generator: 'docs/planning/qa/generate-public-cyber-v5-package.mjs',
  readerA: 'docs/planning/qa/public-cyber-v5-reader-a.mjs',
  readerB: 'docs/planning/qa/public-cyber-v5-reader-b.py',
  reportA: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-reader-a-report-${DATE}.json`,
  reportB: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-reader-b-report-${DATE}.json`,
  producerQa: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-producer-qa-${DATE}.json`,
};

const I = {
  charter: `docs/planning/public-repository-and-cyber-hardening-v5-successor-build-charter-${DATE}.md`,
  v4Subject: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-${DATE}.md`,
  v4Manifest: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-atomic-package-manifest-${DATE}.json`,
  v4Registry: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-schema-and-typed-registries-${DATE}.json`,
  v4Graph: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-producer-dependency-graph-${DATE}.json`,
  v4Vectors: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-operation-oracle-vector-pack-${DATE}.json`,
  v4Closures: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-finding-closure-registry-${DATE}.json`,
  v4ReaderA: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-reader-a-${DATE}.mjs`,
  v4ReaderB: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-reader-b-${DATE}.rb`,
  review: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-independent-hostile-review-${DATE}.md`,
  findings: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-independent-hostile-review-findings-manifest-${DATE}.md`,
  lateDecision: `docs/planning/github-public-repository-large-generated-artifact-storage-decision-${DATE}.md`,
  v2Findings: `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-independent-hostile-review-findings-manifest-${DATE}.md`,
  predecessorFindings: 'docs/planning/public-repository-and-cyber-source-hostile-review-findings-manifest-2026-08-29.md',
};

const FROZEN = {
  charter: 'fc0577a54917abe81030d9543b3478d1dc0d72627fb7ea37d0ebab78d6b077c4',
  v4Subject: '0f1f5cc9fb349f999b0bbff3f6f683c47c951b793ce3ef847388530717ff7257',
  v4Manifest: '43bd110cd8b59c0a3ea6086203d804df7b0dc6dd3441ec443d7ec740c4e65ed5',
  v4PackageRoot: 'f799c154c695034935c480a57b6a0047d8e2b67d318e42b0d9b88a0ea78f92cf',
  review: 'f656b182f617c67ec7d56c37b45a467c70e681863a48487be2d42408cb36b79f',
  findings: '23df19ec6dffb1933489eabf49a78c4ef3c88657d840408284267a8f18c0a760',
  lateDecision: '508b702087bc2c4011975af87c30bea1208bf5720ec263409d287acb5eb15a84',
};

function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('non-safe-integer canonical value');
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  throw new Error(`unsupported canonical type ${typeof value}`);
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortDeep(value[key])]));
  return value;
}

const pretty = (value) => `${JSON.stringify(sortDeep(value), null, 2)}\n`;
const shaBytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const shaText = (text) => shaBytes(Buffer.from(text, 'utf8'));
const root = (domain, value) => shaText(`${domain}\n${canonical(value)}`);
const readBytes = (logicalPath) => fs.readFileSync(logicalPath);
const readText = (logicalPath) => readBytes(logicalPath).toString('utf8');
const readJson = (logicalPath) => JSON.parse(readText(logicalPath));
const without = (object, key) => Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));
const typedRoot = (domain, value, rootField = 'root') => ({ ...value, [rootField]: root(domain, value) });
const protocolRoot = (label) => root('PRCV5-DETERMINISTIC-PLANNING-PROTOCOL-WITNESS-V1', label);
const mapV4Id = (value) => typeof value === 'string' ? value.replace(/^PRCV4-/, 'PRCV5-') : value;

function lineCount(bytes) {
  const text = bytes.toString('utf8');
  return text.length === 0 ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
}

function fileFact(logicalPath) {
  const bytes = readBytes(logicalPath);
  return { logicalPath, contentId: `sha256:${shaBytes(bytes)}`, rawSha256Checksum: shaBytes(bytes), bytes: bytes.length, lines: lineCount(bytes), regularFile: fs.statSync(logicalPath).isFile(), symlink: fs.lstatSync(logicalPath).isSymbolicLink() };
}

function patchFor(logicalPath, content) {
  const rows = content.split('\n');
  if (rows.at(-1) === '') rows.pop();
  const plus = rows.map((line) => `+${line}`).join('\n');
  if (!fs.existsSync(logicalPath)) return `*** Add File: ${logicalPath}\n${plus}\n`;
  const oldRows = readText(logicalPath).split('\n');
  if (oldRows.at(-1) === '') oldRows.pop();
  const minus = oldRows.map((line) => `-${line}`).join('\n');
  return `*** Update File: ${logicalPath}\n@@\n${minus}\n${plus}\n`;
}

function emitPatch(files) {
  let output = '*** Begin Patch\n';
  for (const [logicalPath, content] of files) output += patchFor(logicalPath, content);
  output += '*** End Patch\n';
  process.stdout.write(output);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getPointer(value, pointer) {
  if (pointer === '') return value;
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) return undefined;
  let current = value;
  for (const raw of pointer.slice(1).split('/')) {
    const token = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!current || typeof current !== 'object' || !(token in current)) return undefined;
    current = current[token];
  }
  return current;
}

function mutate(source, operation) {
  const value = structuredClone(source);
  if (operation.op === 'NONE' || operation.op === 'MUTATE-EXPECTED-ONLY') return value;
  const parts = operation.pointer.slice(1).split('/').map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));
  let parent = value;
  for (const token of parts.slice(0, -1)) parent = parent[token];
  const last = parts.at(-1);
  if (operation.op === 'DELETE') delete parent[last];
  else if (operation.op === 'SET' || operation.op === 'ADD') parent[last] = structuredClone(operation.operand);
  else throw new Error(`unknown mutation ${operation.op}`);
  return value;
}

function evaluateAst(ast, value) {
  try {
    if (!ast || typeof ast !== 'object' || Array.isArray(ast) || typeof ast.op !== 'string' || !Array.isArray(ast.args)) return false;
    const ev = (node) => evaluateAst(node, value);
    if (ast.op === 'LITERAL') return ast.args.length === 1 ? ast.args[0] : false;
    if (ast.op === 'GET') return ast.args.length === 1 ? getPointer(value, ast.args[0]) : undefined;
    if (ast.op === 'PATH-EXISTS') return ast.args.length === 1 && getPointer(value, ast.args[0]) !== undefined;
    if (ast.op === 'AND') return ast.args.length > 0 && ast.args.every((node) => ev(node) === true);
    if (ast.op === 'OR') return ast.args.length > 0 && ast.args.some((node) => ev(node) === true);
    if (ast.op === 'NOT') return ast.args.length === 1 && ev(ast.args[0]) === false;
    if (ast.op === 'EQ') return ast.args.length === 2 && canonical(ev(ast.args[0])) === canonical(ev(ast.args[1]));
    if (ast.op === 'NEQ') return ast.args.length === 2 && canonical(ev(ast.args[0])) !== canonical(ev(ast.args[1]));
    if (ast.op === 'LT') { const a = ev(ast.args[0]); const b = ev(ast.args[1]); return ast.args.length === 2 && Number.isSafeInteger(a) && Number.isSafeInteger(b) && a < b; }
    if (ast.op === 'IN-SET') { const a = ev(ast.args[0]); const b = ev(ast.args[1]); return ast.args.length === 2 && Array.isArray(b) && b.some((item) => canonical(item) === canonical(a)); }
    if (ast.op === 'EXACT-KEYS') { const a = ev(ast.args[0]); const b = ev(ast.args[1]); return ast.args.length === 2 && a && typeof a === 'object' && !Array.isArray(a) && Array.isArray(b) && canonical(Object.keys(a).sort()) === canonical([...b].sort()); }
    if (ast.op === 'UNIQUE') { const a = ev(ast.args[0]); return ast.args.length === 1 && Array.isArray(a) && new Set(a.map(canonical)).size === a.length; }
    return false;
  } catch {
    return false;
  }
}

const lit = (value) => ({ op: 'LITERAL', args: [value] });
const get = (pointer) => ({ op: 'GET', args: [pointer] });
const eq = (pointer, value) => ({ op: 'EQ', args: [get(pointer), lit(value)] });
const and = (...args) => ({ op: 'AND', args });

const NEW_CONTROLS = [
  ['001', 'GRAPH-DERIVATION', 'PRCV5-REQ-038', 'PRCV5-OBJECT-038', 'Derive every node, edge and denominator from one canonical set and reject declared/physical disagreement.', { canonicalNodeDerivation: 'REQUIRED', canonicalEdgeDerivation: 'REQUIRED', declaredPhysicalParity: 'EXACT', independentReconstruction: 'TWO-READERS' }],
  ['002', 'READER-INDEPENDENCE', 'PRCV5-REQ-006', 'PRCV5-OBJECT-006', 'Bind independently specified Readers to distinct implementations, dependencies, runtimes, controllers and input cuts; disagreement blocks.', { implementationRoots: 'DISJOINT', dependencyRoots: 'DISJOINT', controllers: 'DISJOINT', inputCut: 'IDENTICAL', disagreement: 'BLOCKED-PENDING-INDEPENDENT-ADJUDICATION' }],
  ['003', 'CLOSED-SCHEMAS', 'PRCV5-REQ-008', 'PRCV5-OBJECT-008', 'Materialize all 42 output schemas and every referenced nested type with executable closed validation.', { outputFamilies: 42, unresolvedTypes: 0, unknownFields: 'BLOCK', admittedInstances: 'REQUIRED', fieldAndInvariantMutations: 'REQUIRED' }],
  ['004', 'DIGEST-TYPE-SEPARATION', 'PRCV5-REQ-001', 'PRCV5-OBJECT-001', 'Separate raw byte checksums from domain-separated typed identities and reject cross-class substitution.', { rawChecksumType: 'RawSha256Checksum', typedIdentityType: 'TypedIdentityRoot', uniqueClassDomains: 'REQUIRED', substitution: 'BLOCK' }],
  ['005', 'GENESIS-APPOINTMENT-RECOVERY', 'PRCV5-REQ-003', 'PRCV5-OBJECT-003', 'Define external Genesis, sole-producer appointments, expected-empty/current heads and independent recovery ownership.', { genesisPreimage: 'EXTERNAL-NON-OUTPUT', soleProducer: true, selfAppointment: 'BLOCK', expectedEmptyHead: 'REQUIRED', recoveryOwner: 'INDEPENDENT' }],
  ['006', 'LIFECYCLE-CAS', 'PRCV5-REQ-005', 'PRCV5-OBJECT-005', 'Execute issue, consume, revoke, expire, crash and response-loss transitions through one atomic CAS reducer.', { transitionSteps: 15, concurrentWinners: 1, replay: 'BLOCK', responseLoss: 'AUTHORITATIVE-READBACK', revocationReachability: 'ALL-DESCENDANTS' }],
  ['007', 'FINDING-EXTRACTION', 'PRCV5-REQ-007', 'PRCV5-OBJECT-007', 'Root canonical Finding fields with byte-span provenance and one-to-one identity-only Alias projections.', { extractedFields: 6, sourceSpans: 'UTF8-BYTE-EXACT', aliasCount: 32, aliasCredit: 0, similarityAlias: 'BLOCK' }],
  ['008', 'CAUSAL-VECTORS', 'PRCV5-REQ-037', 'PRCV5-OBJECT-037', 'Materialize pre-state, mutation, evaluator, actual terminal and effect set for every vector.', { preState: 'CONTENT-ADDRESSED-OR-INLINE', evaluator: 'ROOTED', actualTerminal: 'EXECUTED', expectedFeedsEvaluator: false, negativeTermination: 'BLOCK' }],
  ['009', 'CLOSURE-COVERAGE', 'PRCV5-REQ-038', 'PRCV5-OBJECT-038', 'Provide forward and inverse coverage for every Finding, mapped Requirement and atomic predicate without shared credit.', { findings: 116, inheritedRequirementEdges: 204, rangeCredit: 0, aliasCredit: 0, missingVector: 'BLOCK' }],
  ['010', 'DUAL-ALLOWLIST', 'PRCV5-REQ-027', 'PRCV5-OBJECT-027', 'Appoint two allowlist builders and a separate adjudicator with disjoint work, ledger, implementation and owners.', { roles: 3, implementation: 'DISJOINT', work: 'DISJOINT', ledger: 'DISJOINT', authorityOwner: 'DISJOINT', inputCut: 'IDENTICAL' }],
  ['011', 'SCANNER-INDEPENDENCE', 'PRCV5-REQ-019', 'PRCV5-OBJECT-019', 'Appoint two scanners and an adjudicator with distinct engines, rulesets, work, ledgers and owners on one byte cut.', { roles: 3, engines: 'DISJOINT', rulesets: 'DISJOINT', workLedgersOwners: 'DISJOINT', byteCut: 'IDENTICAL', missingOrDisagreement: 'BLOCK-PUBLIC-PERMIT' }],
  ['012', 'CONTROL-PERMIT', 'PRCV5-REQ-025', 'PRCV5-OBJECT-025', 'Define a typed one-use GitHub control-plane Permit transaction with ordered steps, security floor and recovery.', { permitClass: 'GITHUB-CONTROL-PLANE', ttl: 'TRUSTED', permitHeadCas: 'ATOMIC', orderedSteps: 'EXACT', recovery: 'FORWARD-NON-WEAKENING' }],
  ['013', 'PUBLIC-PUSH-PERMIT', 'PRCV5-REQ-029', 'PRCV5-OBJECT-029', 'Bind Push Permit CAS to exact repository/ref/OID and sent, accepted and quarantined object sets plus PUBLIC readback.', { permitClass: 'PUBLIC-PUSH', objectSets: 'EXACT', refLease: 'EXPECTED-OLD-OID', permitHeadCas: 'ATOMIC', responseLoss: 'REMOTE-READBACK', visibility: 'PUBLIC' }],
  ['014', 'DEPLOYMENT-PERMIT', 'PRCV5-REQ-031', 'PRCV5-OBJECT-031', 'Separate deployment issuer, consumer and reader and bind target digests, heads, TTL, failure and recovery.', { permitClass: 'DEPLOYMENT', roles: 'THREE-WAY-DISJOINT', targetDigests: 'EXACT', ttl: 'TRUSTED', responseLoss: 'TARGET-READBACK', crossAuthority: 'DENY' }],
  ['015', 'RELEASE-PERMIT', 'PRCV5-REQ-032', 'PRCV5-OBJECT-032', 'Separate release issuer, publisher and reader and bind immutable public identities with successor-only recovery.', { permitClass: 'RELEASE', roles: 'THREE-WAY-DISJOINT', publicIdentity: 'IMMUTABLE', ttl: 'TRUSTED', responseLoss: 'PUBLIC-READBACK', recovery: 'YANK-DEPRECATE-SUCCESSOR' }],
  ['016', 'FOUR-PERMIT-SEPARATION', 'PRCV5-REQ-041', 'PRCV5-OBJECT-041', 'Define four disjoint schemas, domains and NamedUses and execute the complete 4x4 presentation matrix.', { permitTypes: 4, matrixCells: 16, legalPresentations: 4, crossClassDenials: 12, rootAlias: 'BLOCK' }],
  ['017', 'DETACHED-ACCEPTANCE-CUT', 'PRCV5-REQ-040', 'PRCV5-OBJECT-040', 'Keep the package root cycle-free and bind manifest and detached Reader receipts only in a higher envelope.', { packageRoot: 'CYCLE-FREE', manifestBinding: 'HIGHER-ENVELOPE', readerReports: 2, expectedHeadCas: 'REQUIRED', acceptanceCredit: 0 }],
  ['018', 'NO-SELF-ACCEPTANCE', 'PRCV5-REQ-039', 'PRCV5-OBJECT-039', 'Separate implementation, evidence, reviewers, veto, reconciliation and acceptance across every independence dimension.', { peopleKeys: 'DISJOINT', implementations: 'DISJOINT', workLedgers: 'DISJOINT', authorityOwners: 'DISJOINT', producerQaAcceptanceCredit: 0, readerAcceptanceCredit: 0 }],
  ['019', 'SECRET-COORDINATE-PRIVACY', 'PRCV5-REQ-018', 'PRCV5-OBJECT-018', 'Prohibit public low-entropy equality commitments and require an approved private mechanism before validation.', { publicCoordinateDigest: 'PROHIBITED', publicEqualityOracle: 'PROHIBITED', privateMechanismDecision: 'MISSING-BLOCKING', publicProjection: 'APPROVED-AGGREGATE-ONLY' }],
  ['020', 'LATE-DECISION-ADMISSION', 'PRCV5-REQ-000', 'PRCV5-OBJECT-000', 'Admit the exact late storage decision and reconcile every numbered clause forward and inverse.', { decisionSha256: FROZEN.lateDecision, numberedClauses: 48, reconciliation: 'BIJECTION', omission: 'BLOCK', v4Bytes: 'UNCHANGED' }],
  ['021', 'SIZE-GROWTH-CLONE-GATES', 'PRCV5-REQ-015', 'PRCV5-OBJECT-015', 'Enforce strict member size and block unknown or exceeded repository total, growth and clone budgets.', { memberBytesExclusiveMaximum: MAX_MEMBER_BYTES_EXCLUSIVE, thresholdPass: MAX_MEMBER_BYTES_EXCLUSIVE - 1, thresholdBlock: MAX_MEMBER_BYTES_EXCLUSIVE, repositoryBudgets: 'MISSING-BLOCKING', staleMeasurement: 'BLOCK' }],
  ['022', 'GENERATOR-FIRST-SHARDS', 'PRCV5-REQ-037', 'PRCV5-OBJECT-037', 'Generate ordered deterministic shards from frozen roots and reject every range, root, count or generator drift.', { generatorFirst: true, canonicalOrder: 'VECTOR-ID-ASCENDING', shardOrdinals: 'CONTIGUOUS', reconstructedRoot: 'REQUIRED', independentRegeneration: 2, randomness: 'PROHIBITED' }],
  ['023', 'EXTERNAL-ARTIFACT-LIFECYCLE', 'PRCV5-REQ-034', 'PRCV5-OBJECT-034', 'Define a provider-neutral immutable external-artifact lifecycle and keep selection missing and blocking.', { selectedStore: 'MISSING-BLOCKING', classification: 'PUBLIC-SAFE-ONLY', immutableIdentity: 'REQUIRED', ownerRecovery: 'REQUIRED', costRetentionDeletionAvailability: 'REQUIRED', operationalCredit: 0 }],
].map(([suffix, name, requirementId, outputObjectId, remediationStatement, conjuncts]) => typedRoot('PRCV5-REMEDIATION-CONTROL-V1', {
  controlId: `PRCV5-CTRL-${suffix}`,
  findingId: `PRCV4-IHR-F${suffix}`,
  name,
  requirementId,
  outputObjectId,
  remediationStatement,
  conjuncts,
  currentState: 'MATERIALIZED-PLANNING-CONTROL-PENDING-INDEPENDENT-REVIEW',
  operationalCredit: 0,
  acceptanceCredit: 0,
}, 'controlRoot'));

function buildFrozenInputManifest() {
  for (const [key, expected] of Object.entries({ charter: FROZEN.charter, v4Subject: FROZEN.v4Subject, v4Manifest: FROZEN.v4Manifest, review: FROZEN.review, findings: FROZEN.findings, lateDecision: FROZEN.lateDecision })) {
    assert(shaBytes(readBytes(I[key])) === expected, `frozen input drift ${key}`);
  }
  const v4Manifest = readJson(I.v4Manifest);
  assert(v4Manifest.packageRoot === FROZEN.v4PackageRoot, 'declared v4 package root drift');
  const v4Projection = v4Manifest.members.map((member) => ({ path: member.path, sha256: member.sha256, bytes: member.bytes }));
  const v4RecomputedRoot = shaText(`CONNECT-PRCV4:PACKAGE-ROOT:${v4Projection.map((member) => `${member.path}\0${member.sha256}\0${member.bytes}\n`).join('')}`);
  assert(v4RecomputedRoot === FROZEN.v4PackageRoot, 'v4 package root derivation failure');
  for (const member of v4Manifest.members) {
    const fact = fileFact(member.path);
    assert(fact.rawSha256Checksum === member.sha256 && fact.bytes === member.bytes, `v4 member drift ${member.path}`);
  }
  const sourceSpecs = [
    ['V5-BUILD-CHARTER', I.charter, 'BUILDER-INSTRUCTION'],
    ['V4-SUBJECT', I.v4Subject, 'FROZEN-PREDECESSOR-SUBJECT'],
    ['V4-MANIFEST', I.v4Manifest, 'FROZEN-PREDECESSOR-MANIFEST'],
    ['V4-SCHEMA-REGISTRY', I.v4Registry, 'FROZEN-PREDECESSOR-MEMBER'],
    ['V4-GRAPH', I.v4Graph, 'FROZEN-PREDECESSOR-MEMBER'],
    ['V4-VECTORS', I.v4Vectors, 'FROZEN-PREDECESSOR-MEMBER'],
    ['V4-CLOSURES', I.v4Closures, 'FROZEN-93-FINDING-UNIVERSE'],
    ['V4-READER-A', I.v4ReaderA, 'FROZEN-PREDECESSOR-MEMBER'],
    ['V4-READER-B', I.v4ReaderB, 'FROZEN-PREDECESSOR-MEMBER'],
    ['V4-INDEPENDENT-REVIEW', I.review, 'FROZEN-INDEPENDENT-REVIEW'],
    ['V4-FINDINGS-MANIFEST', I.findings, 'FROZEN-23-FINDING-UNIVERSE'],
    ['LATE-STORAGE-DECISION', I.lateDecision, 'MANDATORY-LATE-DECISION'],
    ['V2-FINDINGS-MANIFEST', I.v2Findings, 'ALIAS-PROJECTION-SOURCE'],
    ['PREDECESSOR-FINDINGS-MANIFEST', I.predecessorFindings, 'ALIAS-PROJECTION-SOURCE'],
  ];
  const sourceRecords = sourceSpecs.map(([sourceId, logicalPath, role], index) => ({
    ordinal: index + 1,
    sourceId,
    ...fileFact(logicalPath),
    role,
    acquisitionRule: 'READ-EXACT-REPOSITORY-RELATIVE-REGULAR-FILE-BYTES',
    admissionDisposition: 'ADMITTED-CONTENT-ADDRESSED-REFERENCE-ONLY',
    physicalSourceBytesDuplicatedInV5: false,
  }));
  for (const record of sourceRecords) {
    assert(record.logicalPath.startsWith('docs/'), `non-portable source path ${record.logicalPath}`);
    assert(!record.logicalPath.startsWith('/') && !record.logicalPath.includes('..') && !record.symlink && record.regularFile, `unsafe source ${record.logicalPath}`);
  }
  const manifest = {
    artifactId: 'CONNECT-PRCV5-FROZEN-INPUT-MANIFEST-2026-08-30',
    schemaVersion: 'PRCV5-FROZEN-INPUT-MANIFEST-V1',
    artifactClass: 'PLANNING-CONTENT-ADDRESSED-SOURCE-REFERENCE-INDEX;NO-SOURCE-BYTE-DUPLICATION;NOT-ACCEPTANCE',
    sourceRecords,
    sourceRecordCount: sourceRecords.length,
    sourceBytesPhysicallyDuplicated: 0,
    sourceReferenceRoot: root('PRCV5-FROZEN-SOURCE-REFERENCE-SET-V1', sourceRecords.map(({ ordinal, sourceId, logicalPath, contentId, bytes, role, admissionDisposition }) => ({ ordinal, sourceId, logicalPath, contentId, bytes, role, admissionDisposition }))),
    v4PackageVerification: { manifestContentId: `sha256:${FROZEN.v4Manifest}`, declaredPackageRoot: FROZEN.v4PackageRoot, independentlyRecomputedPackageRoot: v4RecomputedRoot, memberCount: v4Manifest.members.length, terminal: 'PASS' },
    lateDecisionVerification: { contentId: `sha256:${FROZEN.lateDecision}`, disposition: 'ADMITTED-MANDATORY-LATE-INPUT' },
    currentVisibilityObservation: { repositoryLogicalId: 'github.com/talstilkol/connect', visibility: 'PUBLIC', isPrivate: false, observedDate: DATE, receiptClass: 'POINT-IN-TIME-OBSERVATION-NOT-CONTINUOUS-RECEIPT' },
    typedMissingExternalInputs: ['B0', 'TAL-MANDATE', 'TRUSTED-TIME', 'SELECTED-EXTERNAL-STORE-CONTRACT', 'REPOSITORY-TOTAL-BUDGET', 'REPOSITORY-GROWTH-BUDGET', 'CLONE-TIME-BUDGET', 'OPERATIONAL-SCANNER-RECEIPTS', 'PRE-POST-VISIBILITY-RECEIPTS'].map((inputId) => ({ inputId, state: 'MISSING-BLOCKING', authorityCredit: 0, acceptanceCredit: 0 })),
  };
  return typedRoot('PRCV5-FROZEN-INPUT-MANIFEST-V1', manifest, 'inputManifestRoot');
}

function byteOffset(text, characterIndex) {
  return Buffer.byteLength(text.slice(0, characterIndex), 'utf8');
}

function parseNewFindings() {
  const text = readText(I.findings);
  const heading = /^## 2\.\d+ (PRCV4-IHR-F\d{3})[^\n]*$/gm;
  const matches = [...text.matchAll(heading)];
  const fields = ['severity', 'evidence', 'impact', 'remediation', 'closureTest', 'noMergeKey'];
  const records = matches.map((match, index) => {
    const startChar = match.index;
    const endChar = index + 1 < matches.length ? matches[index + 1].index : text.search(/^# 3\./m);
    const section = text.slice(startChar, endChar < 0 ? text.length : endChar);
    const values = {};
    const fieldSpans = {};
    for (const field of fields) {
      const expression = new RegExp(`^- ${field}=([^\\n]+)$`, 'm');
      const fieldMatch = expression.exec(section);
      assert(fieldMatch, `missing ${field} in ${match[1]}`);
      const raw = fieldMatch[1].trim();
      const normalized = field === 'severity' ? raw.split(';')[0] : raw;
      values[field] = normalized;
      const localValueStart = fieldMatch.index + fieldMatch[0].indexOf(fieldMatch[1]);
      fieldSpans[field] = {
        startByteInclusive: byteOffset(text, startChar + localValueStart),
        endByteExclusive: byteOffset(text, startChar + localValueStart + fieldMatch[1].length),
        fieldRoot: root('PRCV5-FINDING-SOURCE-FIELD-V1', { findingId: match[1], field, value: normalized }),
      };
    }
    const record = { findingId: match[1], ...values };
    return {
      ...record,
      sourceContentId: `sha256:${FROZEN.findings}`,
      sourceLogicalPath: I.findings,
      sectionSpan: { startByteInclusive: byteOffset(text, startChar), endByteExclusive: byteOffset(text, endChar < 0 ? text.length : endChar) },
      fieldSpans,
      sourceRecordRoot: root('PRCV5-CANONICAL-FINDING-RECORD-V1', record),
    };
  });
  assert(records.length === 23, `new finding extraction expected 23 got ${records.length}`);
  assert(new Set(records.map((row) => row.findingId)).size === 23, 'duplicate new finding ID');
  return records;
}

function findSection(text, findingId) {
  const escaped = findingId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp('^## 2\\.\\d+ (?:`' + escaped + '`|' + escaped + ')(?:[^\\n]*)$', 'm');
  const match = expression.exec(text);
  return match ? { startByteInclusive: byteOffset(text, match.index), headingRoot: root('PRCV5-ALIAS-SOURCE-HEADING-V1', match[0]) } : null;
}

function buildClosures() {
  const v4 = readJson(I.v4Closures);
  assert(v4.records.length === 93, 'v4 inherited denominator drift');
  const inherited = v4.records.map((record, index) => {
    const sourceProjection = {
      findingId: record.findingId,
      severity: record.severity,
      noMergeKey: record.noMergeKey,
      remediation: record.remediation,
      closureTest: record.closureTest,
      requirementIds: record.requirementIds,
    };
    const requirementIds = record.requirementIds.map(mapV4Id);
    return {
      ordinal: index + 1,
      findingId: record.findingId,
      generation: 'INHERITED-V4-PRESERVED-OPEN',
      sourceReference: { logicalPath: I.v4Closures, contentId: `sha256:${shaBytes(readBytes(I.v4Closures))}`, recordOrdinal: index + 1, sourceFindingContentId: `sha256:${record.sourceFindingRoot}` },
      sourceRecordRoot: root('PRCV5-INHERITED-FINDING-RECORD-V1', sourceProjection),
      sourceFieldRoots: Object.fromEntries(['findingId', 'severity', 'noMergeKey', 'remediation', 'closureTest', 'requirementIds'].map((field) => [field, root('PRCV5-FINDING-SOURCE-FIELD-V1', { findingId: record.findingId, field, value: sourceProjection[field] })])),
      severity: record.severity,
      noMergeKey: record.noMergeKey,
      requirementIds,
      outputObjectIds: requirementIds.map((id) => id.replace('REQ', 'OBJECT')),
      remediationControlId: null,
      atomicPredicateIds: [`PRCV5-PRED-${String(index + 1).padStart(3, '0')}-IDENTITY`],
      vectorIds: [`PRCV5-VECTOR-CLOSURE-${String(index + 1).padStart(3, '0')}-POS`, `PRCV5-VECTOR-CLOSURE-${String(index + 1).padStart(3, '0')}-NEG-NOMERGE`],
      residualState: 'OPEN-PENDING-INDEPENDENT-REVIEW-AND-OPERATIONAL-EVIDENCE',
      closureCredit: 0,
      acceptanceCredit: 0,
    };
  });
  const extracted = parseNewFindings();
  const newer = extracted.map((record, index) => {
    const control = NEW_CONTROLS[index];
    assert(record.findingId === control.findingId, `control/finding mismatch ${record.findingId}`);
    const ordinal = inherited.length + index + 1;
    const controlPredicateIds = Object.keys(control.conjuncts).sort().map((key) => `PRCV5-PRED-${record.findingId}-CONTROL-${key}`);
    const controlVectorIds = [`PRCV5-VECTOR-CONTROL-${String(index + 1).padStart(3, '0')}-POS`, ...Object.keys(control.conjuncts).sort().map((key, fieldIndex) => `PRCV5-VECTOR-CONTROL-${String(index + 1).padStart(3, '0')}-NEG-${String(fieldIndex + 1).padStart(2, '0')}`)];
    return {
      ordinal,
      findingId: record.findingId,
      generation: 'NEW-V4-INDEPENDENT-HOSTILE-REVIEW',
      sourceReference: { logicalPath: record.sourceLogicalPath, contentId: record.sourceContentId, sectionSpan: record.sectionSpan, fieldSpans: record.fieldSpans },
      sourceRecordRoot: record.sourceRecordRoot,
      sourceFieldRoots: Object.fromEntries(Object.entries(record.fieldSpans).map(([field, span]) => [field, span.fieldRoot])),
      severity: record.severity,
      noMergeKey: record.noMergeKey,
      requirementIds: [control.requirementId],
      outputObjectIds: [control.outputObjectId],
      remediationControlId: control.controlId,
      atomicPredicateIds: [`PRCV5-PRED-${String(ordinal).padStart(3, '0')}-IDENTITY`, ...controlPredicateIds],
      vectorIds: [`PRCV5-VECTOR-CLOSURE-${String(ordinal).padStart(3, '0')}-POS`, `PRCV5-VECTOR-CLOSURE-${String(ordinal).padStart(3, '0')}-NEG-NOMERGE`, ...controlVectorIds],
      residualState: 'OPEN-PENDING-FRESH-INDEPENDENT-REVIEW;EXTERNAL-EVIDENCE-MISSING-BLOCKING',
      closureCredit: 0,
      acceptanceCredit: 0,
    };
  });
  const predecessorText = readText(I.predecessorFindings);
  const wrapperText = readText(I.v2Findings);
  const aliasProjections = v4.aliasRecords.map((alias, index) => {
    const predecessorSpan = findSection(predecessorText, alias.predecessorIdentity);
    const wrapperSpan = findSection(wrapperText, alias.wrapperIdentity);
    assert(predecessorSpan && wrapperSpan, `alias source missing ${alias.aliasId}`);
    const wrapperNeedle = `predecessor Finding ${alias.predecessorIdentity}`;
    assert(wrapperText.includes(wrapperNeedle), `alias wrapper does not name predecessor ${alias.aliasId}`);
    return typedRoot('PRCV5-ALIAS-IDENTITY-PROJECTION-V1', {
      ordinal: index + 1,
      aliasId: `PRCV5-ALIAS-${String(index + 1).padStart(3, '0')}`,
      predecessorIdentity: alias.predecessorIdentity,
      wrapperIdentity: alias.wrapperIdentity,
      canonicalFindingId: alias.predecessorIdentity,
      predecessorSource: { contentId: `sha256:${alias.predecessorRoot}`, ...predecessorSpan },
      wrapperSource: { contentId: `sha256:${alias.wrapperRoot}`, ...wrapperSpan },
      projectionRule: 'WRAPPER-EVIDENCE-EXACTLY-NAMES-PREDECESSOR;ONE-TO-ONE-IDENTITY-PROVENANCE;NO-SEMANTIC-SIMILARITY-CREDIT',
      equivalenceClass: 'IDENTITY-PROVENANCE-ONLY-NOT-MERGE',
      aliasClosureCredit: 0,
    }, 'projectionRoot');
  });
  const records = [...inherited, ...newer];
  assert(records.length === 116 && new Set(records.map((row) => row.findingId)).size === 116 && new Set(records.map((row) => row.noMergeKey)).size === 116, '116 closure identity invariant failed');
  const requirementEdges = records.flatMap((row) => row.requirementIds.map((requirementId) => ({ findingId: row.findingId, requirementId })));
  const registry = {
    artifactId: 'CONNECT-PRCV5-FINDING-IDENTITY-AND-CLOSURE-REGISTRY-2026-08-30',
    schemaVersion: 'PRCV5-CLOSURE-REGISTRY-V1',
    artifactClass: 'PLANNING-NON-MERGED-CLOSURE-CROSSWALK;NOT-INDEPENDENT-REVIEW;NOT-ACCEPTANCE',
    records,
    remediationControls: NEW_CONTROLS,
    aliasProjections,
    requirementEdges,
    denominators: { findings: records.length, inheritedFindings: inherited.length, newFindings: newer.length, uniqueNoMergeKeys: new Set(records.map((row) => row.noMergeKey)).size, remediationControls: NEW_CONTROLS.length, aliases: aliasProjections.length, requirementEdges: requirementEdges.length, inheritedRequirementEdges: inherited.reduce((sum, row) => sum + row.requirementIds.length, 0), closureCredit: 0, acceptanceCredit: 0 },
    closureRule: 'EACH-FINDING-REQUIRES-ITS-OWN-SOURCE-ROOT-REQUIREMENT-OUTPUT-ATOMIC-PREDICATES-VECTORS-INDEPENDENT-DISPOSITION;NO-RANGE-ALIAS-MERGE-WAIVER-SUPPRESSION-CREDIT',
    currentDisposition: { accepted: 0, open: 116, repositoryVisibility: 'PUBLIC', gate29: 'BLOCKED', developmentFreeze: 'ACTIVE' },
  };
  return typedRoot('PRCV5-CLOSURE-REGISTRY-V1', registry, 'closureRegistryRoot');
}

const PRIMITIVE_TYPES = {
  Id: { kind: 'STRING', pattern: '^[A-Z0-9][A-Z0-9._:-]{1,255}$' },
  Hash: { kind: 'STRING', pattern: '^[0-9a-f]{64}$' },
  GitOid: { kind: 'STRING', pattern: '^(sha1|sha256):[0-9a-f]{40,64}$' },
  SafeInteger: { kind: 'SAFE-INTEGER', minimum: -9007199254740991, maximum: 9007199254740991 },
  TrustedTime: { kind: 'STRING', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z#[0-9a-f]{64}$' },
  Rfc3339Utc: { kind: 'STRING', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$' },
  State: { kind: 'STRING', enum: ['ABSENT', 'ACTIVE', 'BLOCKED', 'MISSING-BLOCKING', 'PLANNING-BLOCKED', 'PUBLIC'] },
  String: { kind: 'STRING', minLength: 1, maxLength: 4096 },
  Boolean: { kind: 'BOOLEAN' },
};

function typeTokens(expression) {
  return [...expression.matchAll(/[A-Za-z][A-Za-z0-9]*/g)].map((match) => match[0]).filter((token) => !['Array', 'Map', 'Nullable'].includes(token));
}

function descriptor(name, typeExpression) {
  const array = typeExpression.startsWith('Array<');
  return { name, typeExpression, required: true, nullable: typeExpression.startsWith('Nullable<'), minItems: array ? 1 : null, maxItems: array ? 4096 : null, uniqueItems: array, order: array ? 'PRESERVE-CANONICAL-INPUT-ORDER' : 'NOT-APPLICABLE', referenceRule: typeTokens(typeExpression).filter((token) => !(token in PRIMITIVE_TYPES)).length ? 'RESOLVE-EACH-NAMED-TYPE-EXACTLY-ONCE' : 'PRIMITIVE-OR-COMPOUND' };
}

function instanceForPrimitive(typeName, label) {
  if (typeName === 'Id') return `PRCV5-${shaText(label).slice(0, 16).toUpperCase()}`;
  if (typeName === 'Hash') return protocolRoot(label);
  if (typeName === 'GitOid') return `sha256:${protocolRoot(label)}`;
  if (typeName === 'SafeInteger') return 0;
  if (typeName === 'TrustedTime') return `2026-08-30T00:00:00Z#${protocolRoot(label)}`;
  if (typeName === 'Rfc3339Utc') return '2026-08-30T00:00:00Z';
  if (typeName === 'State') return 'PLANNING-BLOCKED';
  if (typeName === 'String') return `PLANNING-PROTOCOL-WITNESS-${shaText(label).slice(0, 12).toUpperCase()}`;
  if (typeName === 'Boolean') return false;
  throw new Error(`unknown primitive ${typeName}`);
}

function splitMapArguments(inner) {
  let depth = 0;
  for (let index = 0; index < inner.length; index += 1) {
    if (inner[index] === '<') depth += 1;
    else if (inner[index] === '>') depth -= 1;
    else if (inner[index] === ',' && depth === 0) return [inner.slice(0, index), inner.slice(index + 1)];
  }
  throw new Error(`invalid map expression ${inner}`);
}

function genericNestedInstance(typeName, label) {
  return { v5TypeName: typeName, v5RecordId: instanceForPrimitive('Id', `${label}:id`), v5PlanningOnly: true, v5OperationalCredit: 0, v5AcceptanceCredit: 0, v5RecordState: 'PLANNING-BLOCKED', v5RecordRoot: protocolRoot(`${label}:root`) };
}

function instanceForType(expression, label) {
  if (expression.startsWith('Nullable<') && expression.endsWith('>')) return null;
  if (expression.startsWith('Array<') && expression.endsWith('>')) return [instanceForType(expression.slice(6, -1), `${label}:0`)];
  if (expression.startsWith('Map<') && expression.endsWith('>')) {
    const [keyType, valueType] = splitMapArguments(expression.slice(4, -1));
    const candidateKey = instanceForType(keyType, `${label}:key`);
    assert(typeof candidateKey === 'string', `JSON map key type must produce string ${expression}`);
    return { [candidateKey]: instanceForType(valueType, `${label}:value`) };
  }
  if (expression in PRIMITIVE_TYPES) return instanceForPrimitive(expression, label);
  return genericNestedInstance(expression, label);
}

function buildSchemas() {
  const v4 = readJson(I.v4Registry);
  assert(v4.requirementDefinitions.length === 42, 'v4 output family denominator drift');
  const customTypes = new Set();
  for (const requirement of v4.requirementDefinitions) for (const expression of Object.values(requirement.outputSchema.required)) for (const token of typeTokens(expression)) if (!(token in PRIMITIVE_TYPES)) customTypes.add(token);
  const nestedSchemas = [...customTypes].sort().map((typeName, index) => {
    const fields = [
      descriptor('v5TypeName', 'String'), descriptor('v5RecordId', 'Id'), descriptor('v5PlanningOnly', 'Boolean'), descriptor('v5OperationalCredit', 'SafeInteger'), descriptor('v5AcceptanceCredit', 'SafeInteger'), descriptor('v5RecordState', 'State'), descriptor('v5RecordRoot', 'Hash'),
    ];
    const body = { ordinal: index + 1, schemaId: `PRCV5-NESTED-SCHEMA-${String(index + 1).padStart(3, '0')}`, typeName, additionalProperties: false, fields, crossFieldInvariants: [eq('/v5TypeName', typeName), eq('/v5PlanningOnly', true), eq('/v5OperationalCredit', 0), eq('/v5AcceptanceCredit', 0)] };
    return typedRoot('PRCV5-CLOSED-NESTED-SCHEMA-V1', body, 'schemaRoot');
  });
  const outputFamilies = v4.requirementDefinitions.map((requirement, index) => {
    const requirementId = mapV4Id(requirement.requirementId);
    const envelopeFields = [descriptor('v5SchemaId', 'Id'), descriptor('v5RecordId', 'Id'), descriptor('v5PlanningOnly', 'Boolean'), descriptor('v5OperationalCredit', 'SafeInteger'), descriptor('v5AcceptanceCredit', 'SafeInteger')];
    const inheritedFields = Object.entries(requirement.outputSchema.required).map(([name, expression]) => descriptor(name, expression));
    const names = [...envelopeFields, ...inheritedFields].map((field) => field.name);
    assert(new Set(names).size === names.length, `schema field collision ${requirementId}`);
    const body = {
      ordinal: index + 1,
      schemaId: `PRCV5-OUTPUT-SCHEMA-${String(index).padStart(3, '0')}`,
      requirementId,
      outputObjectId: mapV4Id(requirement.outputObjectId),
      outputType: requirement.outputType,
      soleProducerId: mapV4Id(requirement.soleProducerId),
      failureTerminal: requirement.failure.replace(/V4/g, 'V5'),
      additionalProperties: false,
      fields: [...envelopeFields, ...inheritedFields],
      crossFieldInvariants: [eq('/v5SchemaId', `PRCV5-OUTPUT-SCHEMA-${String(index).padStart(3, '0')}`), eq('/v5PlanningOnly', true), eq('/v5OperationalCredit', 0), eq('/v5AcceptanceCredit', 0)],
      inheritedInvariantCount: requirement.outputSchema.invariants.length,
      inheritedInvariantTextRoots: requirement.outputSchema.invariants.map((value) => root('PRCV5-INHERITED-INVARIANT-TEXT-V1', value)),
    };
    return typedRoot('PRCV5-CLOSED-OUTPUT-SCHEMA-V1', body, 'schemaRoot');
  });
  const admittedInstances = [];
  for (const schema of nestedSchemas) {
    const instance = genericNestedInstance(schema.typeName, schema.schemaId);
    admittedInstances.push(typedRoot('PRCV5-ADMITTED-SCHEMA-INSTANCE-V1', { instanceId: `${schema.schemaId}-INSTANCE`, schemaId: schema.schemaId, instance, fixtureClass: 'DETERMINISTIC-NON-AUTHORITATIVE-PROTOCOL-WITNESS', operationalCredit: 0, acceptanceCredit: 0 }, 'instanceRoot'));
  }
  for (const schema of outputFamilies) {
    const instance = Object.fromEntries(schema.fields.map((field) => [field.name, instanceForType(field.typeExpression, `${schema.schemaId}:${field.name}`)]));
    instance.v5SchemaId = schema.schemaId;
    instance.v5PlanningOnly = true;
    instance.v5OperationalCredit = 0;
    instance.v5AcceptanceCredit = 0;
    if ('repositoryVisibility' in instance) instance.repositoryVisibility = 'PUBLIC';
    if ('gate29State' in instance) instance.gate29State = 'BLOCKED';
    if ('developmentFreezeState' in instance) instance.developmentFreezeState = 'ACTIVE';
    for (const name of ['controlPlanePermitState', 'publicPushPermitState', 'deploymentPermitState', 'releasePermitState']) if (name in instance) instance[name] = 'ABSENT';
    admittedInstances.push(typedRoot('PRCV5-ADMITTED-SCHEMA-INSTANCE-V1', { instanceId: `${schema.schemaId}-INSTANCE`, schemaId: schema.schemaId, instance, fixtureClass: 'DETERMINISTIC-NON-AUTHORITATIVE-PROTOCOL-WITNESS', operationalCredit: 0, acceptanceCredit: 0 }, 'instanceRoot'));
  }
  const primitiveDefinitions = Object.entries(PRIMITIVE_TYPES).map(([typeName, definition], index) => typedRoot('PRCV5-PRIMITIVE-TYPE-V1', { ordinal: index + 1, typeName, ...definition, invalidInputTerminal: 'BLOCK' }, 'typeRoot'));
  const registry = {
    artifactId: 'CONNECT-PRCV5-CLOSED-SCHEMA-AND-TYPE-REGISTRY-2026-08-30',
    schemaVersion: 'PRCV5-CLOSED-SCHEMA-TYPE-REGISTRY-V1',
    artifactClass: 'CLOSED-EXECUTABLE-PLANNING-SCHEMA-REGISTRY;NOT-OPERATIONAL-EVIDENCE;NOT-ACCEPTANCE',
    validatorLanguage: {
      languageId: 'PRCV5-VALIDATOR-LANGUAGE-V1',
      serialization: 'UTF8-CANONICAL-JSON-OBJECT-KEYS-CODEPOINT-ASCENDING-ARRAY-ORDER-PRESERVED-SAFE-INTEGERS',
      astExactKeys: ['op', 'args'],
      operators: ['LITERAL', 'GET', 'PATH-EXISTS', 'AND', 'OR', 'NOT', 'EQ', 'NEQ', 'LT', 'IN-SET', 'EXACT-KEYS', 'UNIQUE'].map((operator) => ({ operator, unknownInputTerminal: 'BLOCK' })),
      unknownOperatorPolicy: 'BLOCK',
      unknownTypePolicy: 'BLOCK',
      unknownFieldPolicy: 'BLOCK-AT-EVERY-OBJECT-BOUNDARY',
    },
    primitiveDefinitions,
    nestedSchemas,
    outputFamilies,
    admittedInstances,
    denominators: { primitiveTypes: primitiveDefinitions.length, nestedTypes: nestedSchemas.length, outputFamilies: outputFamilies.length, admittedInstances: admittedInstances.length, unresolvedTypeReferences: 0 },
  };
  registry.validatorLanguage.languageRoot = root('PRCV5-VALIDATOR-LANGUAGE-V1', registry.validatorLanguage);
  return typedRoot('PRCV5-CLOSED-SCHEMA-TYPE-REGISTRY-V1', registry, 'schemaRegistryRoot');
}

function buildDigests() {
  const identityClasses = [
    'FROZEN-INPUT-MANIFEST', 'FINDING-RECORD', 'CLOSURE-REGISTRY', 'SCHEMA', 'SCHEMA-REGISTRY', 'DIGEST-REGISTRY', 'GENESIS', 'APPOINTMENT', 'RECOVERY', 'AUTHORITY-GRAPH', 'LIFECYCLE', 'PERMIT-CONTROL', 'PERMIT-PUSH', 'PERMIT-DEPLOY', 'PERMIT-RELEASE', 'PUBLIC-FLOW', 'SCANNER-RECEIPT', 'PUBLICATION', 'EXTERNAL-ARTIFACT', 'VECTOR', 'VECTOR-SHARD', 'VECTOR-CORPUS', 'CAUSAL-GRAPH', 'PACKAGE-CONTENT', 'READER-REPORT', 'PRODUCER-QA', 'DETACHED-ACCEPTANCE',
  ].map((identityClass, index) => ({ ordinal: index + 1, identityClass, domain: `PRCV5-${identityClass}-V1`, digest: 'SHA-256', preimage: 'UTF8(DOMAIN)||LF||CANONICAL-JSON-BYTES', outputType: 'TypedIdentityRoot' }));
  assert(new Set(identityClasses.map((row) => row.domain)).size === identityClasses.length, 'duplicate digest domain');
  const payload = { exact: 'SAME-CANONICAL-PAYLOAD' };
  const classBoundaryControls = identityClasses.slice(0, 6).map((row) => ({ identityClass: row.identityClass, domain: row.domain, identityRoot: root(row.domain, payload) }));
  const registry = {
    artifactId: 'CONNECT-PRCV5-CANONICAL-DIGEST-AND-SERIALIZATION-REGISTRY-2026-08-30',
    schemaVersion: 'PRCV5-DIGEST-SERIALIZATION-REGISTRY-V1',
    artifactClass: 'PLANNING-CANONICAL-IDENTITY-REGISTRY;NOT-ACCEPTANCE',
    canonicalProfile: { profileId: 'PRCV5-CANONICAL-JSON-V1', encoding: 'UTF-8', objectKeyOrder: 'UNICODE-CODEPOINT-ASCENDING', arrayOrder: 'SCHEMA-DECLARED-PRESERVED', duplicateKeys: 'REJECT', numbers: 'SAFE-INTEGER-ONLY', negativeZero: 'REJECT', nonFinite: 'REJECT', stringNormalization: 'NFC-REQUIRED', unknownValueType: 'BLOCK' },
    checksumType: { typeName: 'RawSha256Checksum', input: 'EXACT-FILE-BYTES', domainPrefix: null, use: 'TRANSPORT-INTEGRITY-ONLY', substitutionForTypedIdentity: 'BLOCK' },
    identityType: { typeName: 'TypedIdentityRoot', input: 'DOMAIN-LF-CANONICAL-OBJECT', domainRequired: true, use: 'SEMANTIC-IDENTITY-AND-CAS', substitutionByRawChecksum: 'BLOCK' },
    identityClasses,
    classBoundaryControls,
    boundaryFacts: { payloadRawChecksum: shaText(canonical(payload)), distinctIdentityRootCount: new Set(classBoundaryControls.map((row) => row.identityRoot)).size, testedClassCount: classBoundaryControls.length, rawChecksumEqualsAnyTypedIdentity: classBoundaryControls.some((row) => row.identityRoot === shaText(canonical(payload))) },
    locatorProfile: { profileId: 'PRCV5-REPO-RELATIVE-PUBLIC-LOCATOR-V1', requiredPrefix: 'docs/', absolute: false, parentTraversal: false, backslash: false, repositoryFolderPrefix: false, privateCoordinates: false, contentAddressedExternalReferenceRequired: true },
  };
  return typedRoot('PRCV5-DIGEST-SERIALIZATION-REGISTRY-V1', registry, 'digestRegistryRoot');
}

function producerRow(producerId, outputObjectId, roleClass, ordinal) {
  return typedRoot('PRCV5-PRODUCER-DEFINITION-V1', {
    ordinal,
    producerId,
    outputObjectId,
    roleClass,
    controllerId: `PRCV5-CONTROLLER-${String(ordinal).padStart(3, '0')}`,
    controllerRoot: protocolRoot(`${producerId}:controller`),
    implementationRoot: protocolRoot(`${producerId}:implementation`),
    workReceiptRoot: protocolRoot(`${producerId}:work`),
    ledgerRoot: protocolRoot(`${producerId}:ledger`),
    authorityOwnerRoot: protocolRoot(`${producerId}:authority-owner`),
    soleProducer: true,
    selfAppointmentAllowed: false,
    operationalCredit: 0,
    acceptanceCredit: 0,
  }, 'producerRoot');
}

function buildAuthority(schemas) {
  const baseProducers = schemas.outputFamilies.map((schema, index) => producerRow(schema.soleProducerId, schema.outputObjectId, 'OUTPUT-FAMILY-SOLE-PRODUCER', index + 1));
  const specials = [
    ['PRCV5-ALLOWLIST-BUILDER-A', 'PRCV5-ALLOWLIST-A-OUTPUT', 'ALLOWLIST-BUILDER'],
    ['PRCV5-ALLOWLIST-BUILDER-B', 'PRCV5-ALLOWLIST-B-OUTPUT', 'ALLOWLIST-BUILDER'],
    ['PRCV5-ALLOWLIST-ADJUDICATOR', 'PRCV5-ALLOWLIST-ADJUDICATION', 'ALLOWLIST-ADJUDICATOR'],
    ['PRCV5-SCANNER-A', 'PRCV5-SCAN-A-RECEIPT', 'SECRET-SCANNER'],
    ['PRCV5-SCANNER-B', 'PRCV5-SCAN-B-RECEIPT', 'SECRET-SCANNER'],
    ['PRCV5-SCANNER-ADJUDICATOR', 'PRCV5-SCAN-ADJUDICATION', 'SCANNER-ADJUDICATOR'],
    ['PRCV5-REVIEWER-A', 'PRCV5-REVIEW-A-DISPOSITION', 'INDEPENDENT-REVIEWER'],
    ['PRCV5-REVIEWER-B', 'PRCV5-REVIEW-B-DISPOSITION', 'INDEPENDENT-REVIEWER'],
    ['PRCV5-VETO-OWNER', 'PRCV5-VETO-DISPOSITION', 'VETO'],
    ['PRCV5-RECONCILIATION-PRODUCER', 'PRCV5-RECONCILIATION', 'RECONCILIATION'],
    ['PRCV5-ACCEPTANCE-PRODUCER', 'PRCV5-DETACHED-ACCEPTANCE', 'ACCEPTANCE'],
    ['PRCV5-RECOVERY-PRODUCER', 'PRCV5-RECOVERY-RECEIPT', 'RECOVERY'],
  ].map(([producerId, outputObjectId, roleClass], index) => producerRow(producerId, outputObjectId, roleClass, baseProducers.length + index + 1));
  const producers = [...baseProducers, ...specials];
  const genesisSchema = typedRoot('PRCV5-GENESIS-SCHEMA-V1', { schemaId: 'PRCV5-EXTERNAL-GENESIS-SCHEMA-V1', additionalProperties: false, requiredFields: ['schemaId', 'externalMandateRoot', 'repositoryIdentityRoot', 'expectedEmptyAppointmentHead', 'authorityEpoch', 'planningOnly', 'operationalCredit', 'acceptanceCredit'], fieldTypes: { schemaId: 'Id', externalMandateRoot: 'Hash', repositoryIdentityRoot: 'Hash', expectedEmptyAppointmentHead: 'Hash', authorityEpoch: 'SafeInteger', planningOnly: 'Boolean', operationalCredit: 'SafeInteger', acceptanceCredit: 'SafeInteger' }, unknownFields: 'BLOCK' }, 'schemaRoot');
  const genesisInstance = typedRoot('PRCV5-GENESIS-INSTANCE-V1', { schemaId: genesisSchema.schemaId, externalMandateRoot: protocolRoot('external-mandate-missing-planning-preimage'), repositoryIdentityRoot: root('PRCV5-REPOSITORY-IDENTITY-V1', 'github.com/talstilkol/connect'), expectedEmptyAppointmentHead: protocolRoot('expected-empty-appointment-head'), authorityEpoch: 0, planningOnly: true, operationalCredit: 0, acceptanceCredit: 0 }, 'instanceRoot');
  const appointments = producers.map((producer, index) => typedRoot('PRCV5-SOLE-PRODUCER-APPOINTMENT-V1', {
    appointmentId: `PRCV5-APPOINTMENT-${String(index + 1).padStart(3, '0')}`,
    producerId: producer.producerId,
    outputObjectId: producer.outputObjectId,
    appointingAuthorityId: 'PRCV5-EXTERNAL-GENESIS-AUTHORITY',
    genesisInstanceRoot: genesisInstance.instanceRoot,
    expectedOldAppointmentHead: index === 0 ? genesisInstance.expectedEmptyAppointmentHead : protocolRoot(`appointment-head-${index}`),
    newAppointmentHead: protocolRoot(`appointment-head-${index + 1}`),
    producerCardinality: 1,
    selfAppointment: false,
    operationalState: 'MISSING-BLOCKING',
    authorityCredit: 0,
  }, 'appointmentRoot'));
  const recoveryFieldTypes = { attemptId: 'Id', compromisedAuthorityRoot: 'Hash', independentRecoveryOwnerRoot: 'Hash', expectedCurrentHead: 'Hash', newAuthorityRoot: 'Hash', revocationClosureRoot: 'Hash', readbackRoot: 'Hash', planningOnly: 'Boolean', operationalCredit: 'SafeInteger' };
  const recoverySchema = typedRoot('PRCV5-RECOVERY-SCHEMA-V1', { schemaId: 'PRCV5-AUTHORITY-RECOVERY-SCHEMA-V1', additionalProperties: false, fields: Object.entries(recoveryFieldTypes).map(([name, typeExpression]) => descriptor(name, typeExpression)), crossFieldInvariants: [eq('/planningOnly', true), eq('/operationalCredit', 0), { op: 'NEQ', args: [get('/compromisedAuthorityRoot'), get('/independentRecoveryOwnerRoot')] }], unknownFields: 'BLOCK' }, 'schemaRoot');
  const recoveryInstance = typedRoot('PRCV5-RECOVERY-INSTANCE-V1', { attemptId: 'PRCV5-RECOVERY-PLANNING-WITNESS-001', compromisedAuthorityRoot: protocolRoot('compromised-authority'), independentRecoveryOwnerRoot: protocolRoot('independent-recovery-owner'), expectedCurrentHead: protocolRoot('recovery-current-head'), newAuthorityRoot: protocolRoot('recovered-authority'), revocationClosureRoot: protocolRoot('revocation-descendant-closure'), readbackRoot: protocolRoot('recovery-readback'), planningOnly: true, operationalCredit: 0 }, 'instanceRoot');
  const independenceGroups = [
    ['ALLOWLIST', ['PRCV5-ALLOWLIST-BUILDER-A', 'PRCV5-ALLOWLIST-BUILDER-B', 'PRCV5-ALLOWLIST-ADJUDICATOR']],
    ['SCANNER', ['PRCV5-SCANNER-A', 'PRCV5-SCANNER-B', 'PRCV5-SCANNER-ADJUDICATOR']],
    ['REVIEW-ACCEPTANCE', ['PRCV5-REVIEWER-A', 'PRCV5-REVIEWER-B', 'PRCV5-VETO-OWNER', 'PRCV5-RECONCILIATION-PRODUCER', 'PRCV5-ACCEPTANCE-PRODUCER']],
    ['IMPLEMENTATION-REVIEW-ACCEPTANCE', ['PRCV5-PRODUCER-040', 'PRCV5-REVIEWER-A', 'PRCV5-REVIEWER-B', 'PRCV5-ACCEPTANCE-PRODUCER']],
  ].map(([groupId, producerIds]) => {
    const rows = producerIds.map((id) => producers.find((producer) => producer.producerId === id));
    assert(rows.every(Boolean), `missing independence producer ${groupId}`);
    const dimensions = ['controllerRoot', 'implementationRoot', 'workReceiptRoot', 'ledgerRoot', 'authorityOwnerRoot'].map((dimension) => ({ dimension, roots: rows.map((row) => row[dimension]), distinctCount: new Set(rows.map((row) => row[dimension])).size, requiredDistinctCount: rows.length, terminal: new Set(rows.map((row) => row[dimension])).size === rows.length ? 'PASS' : 'BLOCK' }));
    return typedRoot('PRCV5-INDEPENDENCE-GROUP-V1', { groupId, producerIds, dimensions, commonInputCutRule: 'IDENTICAL-FROZEN-PACKAGE-CONTENT-ROOT', disagreementTerminal: 'BLOCKED-PENDING-INDEPENDENT-ADJUDICATION' }, 'groupRoot');
  });
  const readerProfiles = [
    { readerId: 'PRCV5-READER-A', language: 'ECMASCRIPT-ES2023', runtime: 'NODE-STANDARD-LIBRARY', implementationPath: P.readerA, dependencyProfile: ['node:fs', 'node:crypto'], controllerId: 'PRCV5-READER-A-CONTROLLER', contextProfile: 'DIRECT-BYTES-CANONICAL-JSON-AST-AND-REDUCER' },
    { readerId: 'PRCV5-READER-B', language: 'PYTHON-3', runtime: 'PYTHON-STANDARD-LIBRARY', implementationPath: P.readerB, dependencyProfile: ['hashlib', 'json', 'pathlib', 're'], controllerId: 'PRCV5-READER-B-CONTROLLER', contextProfile: 'DATACLASS-FREE-DICTIONARY-WALK-AND-SEPARATE-REDUCER' },
  ].map((profile) => {
    const fact = fileFact(profile.implementationPath);
    return typedRoot('PRCV5-READER-INDEPENDENCE-PROFILE-V1', { ...profile, implementationContentId: fact.contentId, implementationBytes: fact.bytes, dependencyRoot: root('PRCV5-READER-DEPENDENCIES-V1', profile.dependencyProfile), runtimeRoot: root('PRCV5-READER-RUNTIME-V1', profile.runtime), controllerRoot: protocolRoot(profile.controllerId), contextRoot: root('PRCV5-READER-CONTEXT-V1', profile.contextProfile), authorClass: 'MECHANICAL-QA-IMPLEMENTATION-NOT-PRODUCER-REVIEWER-OR-ACCEPTOR', inputCut: 'EXACT-V5-PACKAGE-MANIFEST-AND-FROZEN-SOURCE-BYTES', reportWriteAuthority: 'STDOUT-ONLY;DETACHED-APPLICATION-BY-PRODUCER', acceptanceCredit: 0 }, 'profileRoot');
  });
  const registry = {
    artifactId: 'CONNECT-PRCV5-PRODUCER-AUTHORITY-AND-SEPARATION-GRAPH-2026-08-30',
    schemaVersion: 'PRCV5-PRODUCER-AUTHORITY-SEPARATION-V1',
    artifactClass: 'PLANNING-AUTHORITY-AND-INDEPENDENCE-MODEL;NOT-AUTHORITY;NOT-APPOINTMENT-EVIDENCE;NOT-ACCEPTANCE',
    genesisSchema,
    admittedPlanningGenesisInstance: genesisInstance,
    actualGenesisState: 'MISSING-BLOCKING',
    producers,
    appointments,
    recoverySchema,
    admittedPlanningRecoveryInstance: recoveryInstance,
    actualRecoveryReceiptState: 'MISSING-BLOCKING',
    independenceGroups,
    readerProfiles,
    authorityEdges: appointments.map((appointment) => ({ from: appointment.appointingAuthorityId, to: appointment.producerId, relation: 'APPOINTS-SOLE-PRODUCER' })),
    authorityRootRoles: ['PRCV5-EXTERNAL-GENESIS-AUTHORITY'],
    currentAuthorityCredit: 0,
    currentAcceptanceCredit: 0,
    denominators: { outputFamilyProducers: baseProducers.length, specialProducers: specials.length, producers: producers.length, appointments: appointments.length, independenceGroups: independenceGroups.length, readerProfiles: readerProfiles.length },
  };
  return typedRoot('PRCV5-PRODUCER-AUTHORITY-SEPARATION-V1', registry, 'authorityRegistryRoot');
}

const CAS_STEPS = ['READ-HEAD', 'READ-SECURITY-UNIVERSE', 'VALIDATE-SCHEMA', 'VALIDATE-AUTHORITY', 'VALIDATE-TRUSTED-TIME', 'VALIDATE-REVOCATION', 'COMPARE-EXPECTED-HEAD', 'RESERVE-ATTEMPT', 'ADVANCE-FENCE', 'CONSUME-PERMIT', 'STAGE-EFFECT', 'STAGE-EVENT', 'STAGE-OUTBOX', 'REVALIDATE-READ-SET', 'ATOMIC-COMMIT'];

function casActor() { return { pc: 0, terminal: false, committed: false, observedHead: null, observedSecurityHead: null, observedRevision: null, observedRevocationHead: null, validatedHead: null }; }
function casAttempt(actorId, overrides = {}) {
  return { attemptId: `PRCV5-CAS-${actorId}`, schemaValid: true, authorityCurrent: true, validFrom: '2026-08-30T00:00:00Z', expiresAt: '2026-08-31T00:00:00Z', trustedNow: '2026-08-30T12:00:00Z', revoked: false, revocationHead: protocolRoot('cas-revocation-head-0'), expectedHead: 'HEAD-0', proposedFence: 1, epoch: 1, minimumRevision: 6, replayUsed: false, effectRoot: protocolRoot(`cas-effect-${actorId}`), eventRoot: protocolRoot(`cas-event-${actorId}`), outboxRoot: protocolRoot(`cas-outbox-${actorId}`), ...overrides };
}
function casInitial(overrides = {}) {
  return { A: casActor(), B: casActor(), attempts: { A: casAttempt('A', overrides.A), B: casAttempt('B', overrides.B) }, store: { head: 'HEAD-0', securityHead: 'SECURITY-0', revision: 7, revocationHead: protocolRoot('cas-revocation-head-0'), fence: 0, permitUsed: false, replayUsed: false, effectCount: 0, eventCount: 0, outboxCount: 0 } };
}
function casStep(source, actorId) {
  const state = structuredClone(source);
  const actor = state[actorId];
  const attempt = state.attempts[actorId];
  const step = CAS_STEPS[actor.pc];
  if (actor.terminal || !step) return null;
  const deny = () => { actor.terminal = true; actor.denialStep = step; return state; };
  if (step === 'READ-HEAD') actor.observedHead = state.store.head;
  else if (step === 'READ-SECURITY-UNIVERSE') { actor.observedSecurityHead = state.store.securityHead; actor.observedRevision = state.store.revision; actor.observedRevocationHead = state.store.revocationHead; }
  else if (step === 'VALIDATE-SCHEMA' && attempt.schemaValid !== true) return deny();
  else if (step === 'VALIDATE-AUTHORITY' && attempt.authorityCurrent !== true) return deny();
  else if (step === 'VALIDATE-TRUSTED-TIME' && !(attempt.validFrom <= attempt.trustedNow && attempt.trustedNow < attempt.expiresAt)) return deny();
  else if (step === 'VALIDATE-REVOCATION' && (attempt.revoked || attempt.revocationHead !== state.store.revocationHead)) return deny();
  else if (step === 'COMPARE-EXPECTED-HEAD' && (attempt.expectedHead !== actor.observedHead || attempt.expectedHead !== state.store.head)) return deny();
  else if (step === 'RESERVE-ATTEMPT' && !/^PRCV5-CAS-[AB]$/.test(attempt.attemptId)) return deny();
  else if (step === 'ADVANCE-FENCE' && !(Number.isSafeInteger(attempt.proposedFence) && attempt.proposedFence > state.store.fence)) return deny();
  else if (step === 'CONSUME-PERMIT' && (attempt.replayUsed || state.store.permitUsed || state.store.replayUsed || state.store.revision <= attempt.minimumRevision)) return deny();
  else if (step === 'STAGE-EFFECT' && !/^[0-9a-f]{64}$/.test(attempt.effectRoot)) return deny();
  else if (step === 'STAGE-EVENT' && !/^[0-9a-f]{64}$/.test(attempt.eventRoot)) return deny();
  else if (step === 'STAGE-OUTBOX' && !/^[0-9a-f]{64}$/.test(attempt.outboxRoot)) return deny();
  else if (step === 'REVALIDATE-READ-SET') {
    if (actor.observedHead !== state.store.head || actor.observedSecurityHead !== state.store.securityHead || actor.observedRevision !== state.store.revision || actor.observedRevocationHead !== state.store.revocationHead || state.store.permitUsed || state.store.replayUsed) return deny();
    actor.validatedHead = state.store.head;
  } else if (step === 'ATOMIC-COMMIT') {
    if (actor.validatedHead !== state.store.head || state.store.permitUsed || state.store.replayUsed) return deny();
    state.store.head = `HEAD-${actorId}`;
    state.store.fence = attempt.proposedFence;
    state.store.permitUsed = true;
    state.store.replayUsed = true;
    state.store.effectCount += 1;
    state.store.eventCount += 1;
    state.store.outboxCount += 1;
    actor.committed = true;
    actor.terminal = true;
    actor.pc += 1;
    return state;
  }
  actor.pc += 1;
  return state;
}

function computeCasProof() {
  const memo = new Map();
  const reachable = new Set();
  let crashCutStateActorCount = 0;
  let crashMutationCount = 0;
  function visit(state) {
    const key = canonical(state);
    reachable.add(key);
    if (memo.has(key)) return memo.get(key);
    for (const actorId of ['A', 'B']) {
      if (!state[actorId].terminal && state[actorId].pc < CAS_STEPS.length) {
        crashCutStateActorCount += 1;
        const before = canonical(state.store);
        const crashed = structuredClone(state);
        crashed[actorId].terminal = true;
        if (canonical(crashed.store) !== before) crashMutationCount += 1;
      }
    }
    if (state.A.terminal && state.B.terminal) {
      const commits = Number(state.A.committed) + Number(state.B.committed);
      const result = { completeSchedules: 1n, zeroCommitSchedules: commits === 0 ? 1n : 0n, oneCommitSchedules: commits === 1 ? 1n : 0n, twoCommitSchedules: commits === 2 ? 1n : 0n };
      memo.set(key, result);
      return result;
    }
    const total = { completeSchedules: 0n, zeroCommitSchedules: 0n, oneCommitSchedules: 0n, twoCommitSchedules: 0n };
    for (const actorId of ['A', 'B']) {
      if (state[actorId].terminal) continue;
      const next = casStep(state, actorId);
      if (!next) continue;
      const part = visit(next);
      for (const field of Object.keys(total)) total[field] += part[field];
    }
    memo.set(key, total);
    return total;
  }
  const totals = visit(casInitial());
  return { completeScheduleCount: totals.completeSchedules.toString(), zeroCommitScheduleCount: totals.zeroCommitSchedules.toString(), oneCommitScheduleCount: totals.oneCommitSchedules.toString(), twoCommitScheduleCount: totals.twoCommitSchedules.toString(), reachableStateCount: reachable.size, crashCutStateActorCount, crashMutationCount, concurrentWinnerMaximum: 1, responseLossReadbackTerminal: 'COMMITTED-READBACK-NO-RETRY', atomicEffectEventOutbox: true };
}

function runSingleAttempt(overrides = {}, crashMode = null) {
  let state = casInitial({ A: overrides, B: { schemaValid: false } });
  state.B.terminal = true;
  while (!state.A.terminal) {
    const step = CAS_STEPS[state.A.pc];
    if (crashMode === 'FAIL-BEFORE-WRITE' && step === 'ATOMIC-COMMIT') return { terminal: 'FAILURE-BEFORE-WRITE', store: state.store, authoritativeReadback: state.store.head };
    state = casStep(state, 'A');
  }
  if (crashMode === 'RESPONSE-LOSS-AFTER-WRITE' && state.A.committed) return { terminal: 'RESPONSE-LOSS', store: state.store, authoritativeReadback: state.store.head, recoveryTerminal: 'COMMITTED-READBACK-NO-RETRY' };
  return { terminal: state.A.committed ? 'COMMITTED' : 'BLOCK', denialStep: state.A.denialStep ?? null, store: state.store, authoritativeReadback: state.store.head };
}

function buildLifecycle() {
  const scenarios = [
    ['SUCCESS', {}, null],
    ['EXPIRED', { trustedNow: '2026-09-01T00:00:00Z' }, null],
    ['REVOKED', { revoked: true }, null],
    ['STALE-HEAD', { expectedHead: 'HEAD-STALE' }, null],
    ['REPLAY', { replayUsed: true }, null],
    ['TIME-ROLLBACK', { validFrom: '2026-08-30T13:00:00Z' }, null],
    ['FAILURE-BEFORE-WRITE', {}, 'FAIL-BEFORE-WRITE'],
    ['RESPONSE-LOSS-AFTER-WRITE', {}, 'RESPONSE-LOSS-AFTER-WRITE'],
  ].map(([scenarioId, overrides, crashMode]) => typedRoot('PRCV5-LIFECYCLE-SCENARIO-V1', { scenarioId, overrides, crashMode, result: runSingleAttempt(overrides, crashMode) }, 'scenarioRoot'));
  const lifecycleFieldTypes = { attemptId: 'Id', permitClass: 'Id', actorRoot: 'Hash', expectedHead: 'Hash', newHead: 'Hash', revision: 'SafeInteger', epoch: 'SafeInteger', fence: 'SafeInteger', trustedTimeRoot: 'Hash', revocationHead: 'Hash', appendOnlyEventRoot: 'Hash', terminal: 'String' };
  const lifecycleSchemas = ['ISSUE', 'CONSUME', 'REVOKE', 'EXPIRE', 'FAILURE', 'READBACK', 'FORWARD-RECOVERY'].map((eventClass, index) => typedRoot('PRCV5-LIFECYCLE-EVENT-SCHEMA-V1', { ordinal: index + 1, schemaId: `PRCV5-${eventClass}-EVENT-SCHEMA-V1`, eventClass, additionalProperties: false, fields: Object.entries(lifecycleFieldTypes).map(([name, typeExpression]) => descriptor(name, typeExpression)), crossFieldInvariants: [eq('/permitClass', 'PRCV5-PERMIT-CLASS-PLANNING-WITNESS')], unknownFields: 'BLOCK' }, 'schemaRoot'));
  const registry = {
    artifactId: 'CONNECT-PRCV5-LIFECYCLE-CAS-AND-RECOVERY-REGISTRY-2026-08-30',
    schemaVersion: 'PRCV5-LIFECYCLE-CAS-RECOVERY-V1',
    artifactClass: 'EXECUTABLE-PLANNING-STATE-MACHINE;NOT-OPERATIONAL-EXECUTION;NOT-PERMIT;NOT-ACCEPTANCE',
    reducer: { reducerId: 'PRCV5-ATOMIC-PERMIT-CAS-REDUCER-V1', steps: CAS_STEPS.map((stepId, index) => ({ ordinal: index + 1, stepId })), stateFields: ['head', 'securityHead', 'revision', 'revocationHead', 'fence', 'permitUsed', 'replayUsed', 'effectCount', 'eventCount', 'outboxCount'], commitAtomicSet: ['head', 'fence', 'permitUsed', 'replayUsed', 'effectCount', 'eventCount', 'outboxCount'], failureBeforeWriteMutationCount: 0, failureAfterWriteResolution: 'AUTHORITATIVE-READBACK', unknownTransitionTerminal: 'BLOCK' },
    lifecycleSchemas,
    scenarios,
    exhaustiveTwoActorProof: computeCasProof(),
    revocationRule: { ancestorRevocationTraversal: 'TRANSITIVE-CLOSURE', descendantOmissionTerminal: 'BLOCK', currentOperationalRevocationReceipt: 'MISSING-BLOCKING' },
    recoveryRule: { failureBeforeWrite: 'NO-STORE-MUTATION;SAFE-RETRY-WITH-FRESH-HEAD', failureAfterWrite: 'READBACK-BEFORE-ANY-RETRY', responseLoss: 'AUTHORITATIVE-HEAD-AND-EFFECT-READBACK', nonWeakening: 'SECURITY-UNIVERSE-MUST-BE-EQUAL-OR-STRONGER', rollback: 'PROHIBITED' },
    currentHeadState: 'MISSING-BLOCKING',
    currentTrustedTimeState: 'MISSING-BLOCKING',
    currentOperationalCredit: 0,
  };
  return typedRoot('PRCV5-LIFECYCLE-CAS-RECOVERY-V1', registry, 'lifecycleRegistryRoot');
}

const PERMIT_CLASSES = [
  { ordinal: 1, permitClass: 'GITHUB-CONTROL-PLANE', typeTag: 'PRCV5-GITHUB-CONTROL-PLANE-PERMIT-V1', domain: 'PRCV5-PERMIT-CONTROL-V1', issuerRole: 'PRCV5-CONTROL-PERMIT-ISSUER', consumerRole: 'PRCV5-CONTROL-PLANE-EXECUTOR', readerRole: 'PRCV5-CONTROL-PLANE-READER', namedUse: 'consumeGitHubControlPlanePermit', classFields: ['repositoryIdentityRoot', 'orderedStepSetRoot', 'securityFloorRoot', 'perStepReceiptSetRoot'] },
  { ordinal: 2, permitClass: 'PUBLIC-PUSH', typeTag: 'PRCV5-PUBLIC-PUSH-PERMIT-V1', domain: 'PRCV5-PERMIT-PUSH-V1', issuerRole: 'PRCV5-PUSH-PERMIT-ISSUER', consumerRole: 'PRCV5-PUSH-EXECUTOR', readerRole: 'PRCV5-REMOTE-REF-OBJECT-VISIBILITY-READER', namedUse: 'consumePublicPushPermit', classFields: ['repositoryIdentityRoot', 'refName', 'expectedOldOid', 'sentObjectSetRoot', 'acceptedObjectSetRoot', 'quarantinedObjectSetRoot'] },
  { ordinal: 3, permitClass: 'DEPLOYMENT', typeTag: 'PRCV5-DEPLOYMENT-PERMIT-V1', domain: 'PRCV5-PERMIT-DEPLOY-V1', issuerRole: 'PRCV5-DEPLOYMENT-PERMIT-ISSUER', consumerRole: 'PRCV5-DEPLOYMENT-APPLIER', readerRole: 'PRCV5-DEPLOYMENT-TARGET-READER', namedUse: 'consumeDeploymentPermit', classFields: ['environmentRoot', 'targetDigest', 'currentDigest', 'healthPolicyRoot', 'driftPolicyRoot', 'applyReceiptRoot'] },
  { ordinal: 4, permitClass: 'RELEASE', typeTag: 'PRCV5-RELEASE-PERMIT-V1', domain: 'PRCV5-PERMIT-RELEASE-V1', issuerRole: 'PRCV5-RELEASE-PERMIT-ISSUER', consumerRole: 'PRCV5-RELEASE-PUBLISHER', readerRole: 'PRCV5-PUBLIC-RELEASE-READER', namedUse: 'consumeReleasePermit', classFields: ['commitOid', 'tagIdentityRoot', 'assetSetRoot', 'packageSetRoot', 'coordinateSetRoot', 'publicReadbackRoot'] },
];

function buildPermits() {
  const commonFieldTypes = {
    permitId: 'Id', typeTag: 'Id', issuedAt: 'Rfc3339Utc', expiresAt: 'Rfc3339Utc', trustedTimeReceiptRoot: 'Hash', issuerRoot: 'Hash', consumerRoot: 'Hash', independentReaderRoot: 'Hash', expectedPermitHead: 'Hash', newPermitHead: 'Hash', revision: 'SafeInteger', epoch: 'SafeInteger', fence: 'SafeInteger', revocationHead: 'Hash', oneUseLedgerRoot: 'Hash', attemptId: 'Id', failureReceiptRoot: 'Hash', responseLossReadbackRoot: 'Hash', preVisibilityReceiptRoot: 'Hash', postVisibilityReceiptRoot: 'Hash', v5PlanningOnly: 'Boolean', v5OperationalCredit: 'SafeInteger', v5AcceptanceCredit: 'SafeInteger',
  };
  const classFieldTypes = {
    'GITHUB-CONTROL-PLANE': { repositoryIdentityRoot: 'Hash', orderedStepSetRoot: 'Hash', securityFloorRoot: 'Hash', perStepReceiptSetRoot: 'Hash' },
    'PUBLIC-PUSH': { repositoryIdentityRoot: 'Hash', refName: 'String', expectedOldOid: 'GitOid', sentObjectSetRoot: 'Hash', acceptedObjectSetRoot: 'Hash', quarantinedObjectSetRoot: 'Hash' },
    DEPLOYMENT: { environmentRoot: 'Hash', targetDigest: 'Hash', currentDigest: 'Hash', healthPolicyRoot: 'Hash', driftPolicyRoot: 'Hash', applyReceiptRoot: 'Hash' },
    RELEASE: { commitOid: 'GitOid', tagIdentityRoot: 'Hash', assetSetRoot: 'Hash', packageSetRoot: 'Hash', coordinateSetRoot: 'Hash', publicReadbackRoot: 'Hash' },
  };
  const permits = PERMIT_CLASSES.map((permit) => {
    const issuerRoot = protocolRoot(`${permit.permitClass}:issuer`);
    const consumerRoot = protocolRoot(`${permit.permitClass}:consumer`);
    const readerRoot = protocolRoot(`${permit.permitClass}:reader`);
    const fields = [...Object.entries(commonFieldTypes), ...Object.entries(classFieldTypes[permit.permitClass])].map(([name, typeExpression]) => descriptor(name, typeExpression));
    const schema = typedRoot(`${permit.domain}-SCHEMA-V1`, { schemaId: `${permit.typeTag}-SCHEMA`, permitClass: permit.permitClass, typeTag: permit.typeTag, additionalProperties: false, fields, crossFieldInvariants: [eq('/typeTag', permit.typeTag), eq('/v5PlanningOnly', true), eq('/v5OperationalCredit', 0), eq('/v5AcceptanceCredit', 0), { op: 'NEQ', args: [get('/issuerRoot'), get('/consumerRoot')] }, { op: 'NEQ', args: [get('/issuerRoot'), get('/independentReaderRoot')] }, { op: 'NEQ', args: [get('/consumerRoot'), get('/independentReaderRoot')] }], unknownFields: 'BLOCK', namedUseSignature: `${permit.namedUse}(${permit.typeTag},${permit.consumerRole})->PERMIT-TERMINAL` }, 'schemaRoot');
    const instance = Object.fromEntries(fields.map((field) => [field.name, instanceForType(field.typeExpression, `${permit.permitClass}:${field.name}`)]));
    Object.assign(instance, { permitId: `PRCV5-${permit.permitClass}-PERMIT-PLANNING-WITNESS`, typeTag: permit.typeTag, issuedAt: '2026-08-30T00:00:00Z', expiresAt: '2026-08-31T00:00:00Z', issuerRoot, consumerRoot, independentReaderRoot: readerRoot, v5PlanningOnly: true, v5OperationalCredit: 0, v5AcceptanceCredit: 0 });
    const planningInstance = typedRoot(`${permit.domain}-PLANNING-INSTANCE-V1`, { instanceId: `${permit.typeTag}-PLANNING-INSTANCE`, schemaId: schema.schemaId, instance, fixtureClass: 'DETERMINISTIC-NON-AUTHORITATIVE-PROTOCOL-WITNESS', operationalCredit: 0, acceptanceCredit: 0 }, 'instanceRoot');
    return typedRoot('PRCV5-PERMIT-CLASS-DEFINITION-V1', { ...permit, issuerRoot, consumerRoot, independentReaderRoot: readerRoot, schema, planningInstance, roleSeparation: { roots: [issuerRoot, consumerRoot, readerRoot], distinctCount: new Set([issuerRoot, consumerRoot, readerRoot]).size, requiredDistinctCount: 3 }, consumeReducerId: 'PRCV5-ATOMIC-PERMIT-CAS-REDUCER-V1', visibilityInvariant: { requiredBefore: 'PUBLIC', requiredAfter: 'PUBLIC', missingReceiptTerminal: 'BLOCK', privateTerminal: 'BLOCK' }, currentState: 'ABSENT', actualIssueReceiptRoot: null, actualConsumeReceiptRoot: null, operationalCredit: 0, acceptanceCredit: 0 }, 'permitDefinitionRoot');
  });
  const crossUseMatrix = permits.flatMap((presented) => permits.map((consumer) => ({
    cellId: `PRCV5-PERMIT-MATRIX-${presented.ordinal}-${consumer.ordinal}`,
    presentedPermitClass: presented.permitClass,
    consumerPermitClass: consumer.permitClass,
    namedUse: consumer.namedUse,
    expectedTerminal: presented.permitClass === consumer.permitClass ? 'PASS-PLANNING-PROTOCOL-WITNESS' : 'BLOCK-PERMIT-CLASS-MISMATCH',
    operationalCredit: 0,
  })));
  const registry = {
    artifactId: 'CONNECT-PRCV5-FOUR-PERMIT-REGISTRY-2026-08-30',
    schemaVersion: 'PRCV5-FOUR-PERMIT-REGISTRY-V1',
    artifactClass: 'TYPED-PLANNING-PERMIT-PROTOCOLS;NO-ISSUED-PERMIT;NOT-AUTHORITY;NOT-ACCEPTANCE',
    permits,
    crossUseMatrix,
    matrixDenominators: { permitTypes: permits.length, cells: crossUseMatrix.length, legalPresentations: crossUseMatrix.filter((cell) => cell.presentedPermitClass === cell.consumerPermitClass).length, crossClassDenials: crossUseMatrix.filter((cell) => cell.presentedPermitClass !== cell.consumerPermitClass).length },
    commonConsumePreconditions: ['SCHEMA-VALID', 'TYPE-TAG-EXACT', 'ISSUER-CURRENT', 'CONSUMER-NAMEDUSE-EXACT', 'INDEPENDENT-READER-DISJOINT', 'TRUSTED-TIME-IN-RANGE', 'REVOCATION-CLEAR', 'EXPECTED-PERMIT-HEAD-CURRENT', 'REVISION-EPOCH-FENCE-CURRENT', 'ONE-USE-LEDGER-UNUSED', 'PRE-VISIBILITY-PUBLIC', 'CLASS-SPECIFIC-PREDICATES', 'ATOMIC-CAS-COMMIT', 'POST-VISIBILITY-PUBLIC'],
    currentState: { GitHubControlPlanePermit: 'ABSENT', PublicPushPermit: 'ABSENT', DeploymentPermit: 'ABSENT', ReleasePermit: 'ABSENT', reason: 'REQUIRED-EXTERNAL-EVIDENCE-AND-AUTHORITY-MISSING-BLOCKING' },
    crossAuthorityRule: 'NO-PERMIT-AUTHORIZES-ANOTHER-PERMIT-CLASS',
  };
  return typedRoot('PRCV5-FOUR-PERMIT-REGISTRY-V1', registry, 'permitRegistryRoot');
}

function buildPublicFlow(inputs, authority) {
  const flowNodes = [
    ['SOURCE-FROZEN-INPUTS', 'SOURCE', 'PUBLIC-SAFE-CLASSIFIED-REFERENCES'],
    ['SOURCE-PRIVATE-EVIDENCE', 'SOURCE', 'PRIVATE-NOT-IN-PUBLIC-GIT'],
    ['TRANSFORM-GENERATOR', 'TRANSFORM', 'DETERMINISTIC'],
    ['TRANSFORM-SCANNER-A', 'TRANSFORM', 'INDEPENDENT-SCANNER'],
    ['TRANSFORM-SCANNER-B', 'TRANSFORM', 'INDEPENDENT-SCANNER'],
    ['TRANSFORM-ADJUDICATOR', 'TRANSFORM', 'INDEPENDENT-ADJUDICATION'],
    ['STORE-REGULAR-GIT', 'STORE', 'PUBLIC'],
    ['STORE-EXTERNAL', 'STORE', 'MISSING-BLOCKING'],
    ['SINK-PUBLIC-REPOSITORY', 'SINK', 'PUBLIC'],
    ['SINK-PRIVATE-CUSTODY', 'SINK', 'PRIVATE'],
  ].map(([nodeId, nodeClass, state], index) => ({ ordinal: index + 1, nodeId, nodeClass, state }));
  const flowEdges = [
    ['SOURCE-FROZEN-INPUTS', 'TRANSFORM-GENERATOR', 'CONTENT-ADDRESSED-REFERENCE'],
    ['TRANSFORM-GENERATOR', 'TRANSFORM-SCANNER-A', 'EXACT-PACKAGE-BYTE-CUT'],
    ['TRANSFORM-GENERATOR', 'TRANSFORM-SCANNER-B', 'EXACT-PACKAGE-BYTE-CUT'],
    ['TRANSFORM-SCANNER-A', 'TRANSFORM-ADJUDICATOR', 'ROOTED-SCAN-RECEIPT'],
    ['TRANSFORM-SCANNER-B', 'TRANSFORM-ADJUDICATOR', 'ROOTED-SCAN-RECEIPT'],
    ['TRANSFORM-ADJUDICATOR', 'STORE-REGULAR-GIT', 'PUBLIC-SAFE-ALLOW-ONLY'],
    ['STORE-REGULAR-GIT', 'SINK-PUBLIC-REPOSITORY', 'PUBLIC-PUSH-PERMIT-ONLY'],
    ['SOURCE-PRIVATE-EVIDENCE', 'SINK-PRIVATE-CUSTODY', 'NO-PUBLIC-PROJECTION-WITH-EQUALITY-ORACLE'],
    ['TRANSFORM-GENERATOR', 'STORE-EXTERNAL', 'SELECTED-CONTRACT-ONLY'],
  ].map(([from, to, relation], index) => ({ ordinal: index + 1, edgeId: `PRCV5-FLOW-EDGE-${String(index + 1).padStart(3, '0')}`, from, to, relation }));
  const scannerIds = ['PRCV5-SCANNER-A', 'PRCV5-SCANNER-B', 'PRCV5-SCANNER-ADJUDICATOR'];
  const scannerRows = scannerIds.map((id) => authority.producers.find((producer) => producer.producerId === id));
  assert(scannerRows.every(Boolean), 'scanner producer missing');
  const scannerProfiles = scannerRows.map((producer, index) => typedRoot('PRCV5-SCANNER-PROFILE-V1', {
    scannerId: producer.producerId,
    engineRoot: protocolRoot(`scanner-engine-${index + 1}`),
    rulesetRoot: protocolRoot(`scanner-ruleset-${index + 1}`),
    implementationRoot: producer.implementationRoot,
    workReceiptRoot: producer.workReceiptRoot,
    ledgerRoot: producer.ledgerRoot,
    authorityOwnerRoot: producer.authorityOwnerRoot,
    exactByteCutBinding: 'RESOLVE-PACKAGE-CONTENT-ROOT-FROM-FROZEN-MANIFEST',
    receiptState: 'MISSING-BLOCKING',
    receiptRoot: null,
    operationalCredit: 0,
  }, 'profileRoot'));
  const scannerReceiptSchema = typedRoot('PRCV5-SCANNER-RECEIPT-SCHEMA-V1', { schemaId: 'PRCV5-SCANNER-RECEIPT-V1', additionalProperties: false, fields: Object.entries({ scannerId: 'Id', implementationRoot: 'Hash', engineRoot: 'Hash', rulesetRoot: 'Hash', inputCutRoot: 'Hash', classCoverageRoot: 'Hash', providerPatternCoverageRoot: 'Hash', findingSetRoot: 'Hash', issuedAt: 'Rfc3339Utc', expiresAt: 'Rfc3339Utc', receiptRoot: 'Hash' }).map(([name, typeExpression]) => descriptor(name, typeExpression)), crossFieldInvariants: [], unknownFields: 'BLOCK' }, 'schemaRoot');
  const scannerPlanningReceipts = scannerProfiles.slice(0, 2).map((profile, index) => {
    const instance = { scannerId: profile.scannerId, implementationRoot: profile.implementationRoot, engineRoot: profile.engineRoot, rulesetRoot: profile.rulesetRoot, inputCutRoot: protocolRoot('scanner-exact-byte-cut-planning-witness'), classCoverageRoot: protocolRoot(`scanner-${index + 1}-class-coverage`), providerPatternCoverageRoot: protocolRoot(`scanner-${index + 1}-provider-pattern-coverage`), findingSetRoot: protocolRoot(`scanner-${index + 1}-finding-set`), issuedAt: '2026-08-30T00:00:00Z', expiresAt: '2026-08-31T00:00:00Z', receiptRoot: protocolRoot(`scanner-${index + 1}-receipt`) };
    return typedRoot('PRCV5-SCANNER-PLANNING-RECEIPT-V1', { instanceId: `PRCV5-SCANNER-PLANNING-RECEIPT-${index + 1}`, schemaId: scannerReceiptSchema.schemaId, instance, fixtureClass: 'DETERMINISTIC-NON-AUTHORITATIVE-PROTOCOL-WITNESS', operationalCredit: 0, acceptanceCredit: 0 }, 'instanceRoot');
  });
  const adjudicationSchema = typedRoot('PRCV5-SCANNER-ADJUDICATION-SCHEMA-V1', { schemaId: 'PRCV5-SCANNER-ADJUDICATION-V1', additionalProperties: false, fields: Object.entries({ scannerAReceiptRoot: 'Hash', scannerBReceiptRoot: 'Hash', equalInputCut: 'Boolean', disagreementSetRoot: 'Hash', adjudicatorRoot: 'Hash', terminal: 'String' }).map(([name, typeExpression]) => descriptor(name, typeExpression)), crossFieldInvariants: [eq('/equalInputCut', true)], disagreementWithoutResolution: 'BLOCK', unknownFields: 'BLOCK' }, 'schemaRoot');
  const adjudicationPlanningInstance = typedRoot('PRCV5-SCANNER-ADJUDICATION-PLANNING-INSTANCE-V1', { instanceId: 'PRCV5-SCANNER-ADJUDICATION-PLANNING-INSTANCE', schemaId: adjudicationSchema.schemaId, instance: { scannerAReceiptRoot: scannerPlanningReceipts[0].instanceRoot, scannerBReceiptRoot: scannerPlanningReceipts[1].instanceRoot, equalInputCut: true, disagreementSetRoot: protocolRoot('scanner-empty-disagreement-set'), adjudicatorRoot: scannerProfiles[2].authorityOwnerRoot, terminal: 'PASS-PLANNING-PROTOCOL-WITNESS' }, fixtureClass: 'DETERMINISTIC-NON-AUTHORITATIVE-PROTOCOL-WITNESS', operationalCredit: 0, acceptanceCredit: 0 }, 'instanceRoot');
  const registry = {
    artifactId: 'CONNECT-PRCV5-PUBLIC-INFORMATION-FLOW-AND-SCANNER-REGISTRY-2026-08-30',
    schemaVersion: 'PRCV5-PUBLIC-FLOW-SCANNER-V1',
    artifactClass: 'PLANNING-PUBLIC-INFORMATION-FLOW;NO-SCAN-CLAIM;NO-PERMIT;NOT-ACCEPTANCE',
    flowNodes,
    flowEdges,
    scannerProfiles,
    scannerSeparation: { dimensions: ['engineRoot', 'rulesetRoot', 'implementationRoot', 'workReceiptRoot', 'ledgerRoot', 'authorityOwnerRoot'].map((dimension) => ({ dimension, distinctCount: new Set(scannerProfiles.map((profile) => profile[dimension])).size, requiredDistinctCount: scannerProfiles.length })), exactInputCut: 'IDENTICAL-PACKAGE-CONTENT-ROOT', disagreementTerminal: 'BLOCKED-PENDING-INDEPENDENT-ADJUDICATION' },
    scannerReceiptSchema,
    scannerPlanningReceipts,
    adjudicationSchema,
    adjudicationPlanningInstance,
    privateEvidencePolicy: { publicSecretValue: 'PROHIBITED', publicPii: 'PROHIBITED', publicCustomerData: 'PROHIBITED', publicCredential: 'PROHIBITED', publicPrivateLocator: 'PROHIBITED', publicLowEntropyCoordinateDigest: 'PROHIBITED', privateValidationMechanism: 'MISSING-SECURITY-DECISION-BLOCKING', permittedPublicProjection: 'APPROVED-NON-GUESSABLE-AGGREGATE-ONLY' },
    visibilityContract: { repositoryLogicalId: 'github.com/talstilkol/connect', invariant: 'PUBLIC-AT-EVERY-STATE', frozenObservation: inputs.currentVisibilityObservation, preOperationTrustedReceipt: 'MISSING-BLOCKING', postOperationTrustedReceipt: 'MISSING-BLOCKING', privateTransitionTerminal: 'BLOCK', continuousReceiptState: 'MISSING-BLOCKING' },
    currentScannerDisposition: 'OPERATIONAL-RECEIPTS-MISSING-BLOCKING',
    publicPermitCredit: 0,
  };
  return typedRoot('PRCV5-PUBLIC-FLOW-SCANNER-V1', registry, 'publicFlowRegistryRoot');
}

function parseLateDecisionClauses() {
  const text = readText(I.lateDecision);
  const matches = [...text.matchAll(/^([0-9]+\.[0-9]+\.[0-9]+) ([^\n]+)$/gm)];
  assert(matches.length === 48, `late decision clause count ${matches.length}`);
  return matches.map((match, index) => {
    const clauseId = `LATE-DECISION-${match[1]}`;
    const controlId = match[1].startsWith('3.1') || match[1].startsWith('4.1') ? 'PRCV5-CTRL-021' : match[1].startsWith('3.2') ? 'PRCV5-CTRL-022' : match[1].startsWith('3.3') || match[1].startsWith('3.4') || match[1].startsWith('4.2') ? 'PRCV5-CTRL-023' : 'PRCV5-CTRL-020';
    return typedRoot('PRCV5-LATE-DECISION-CLAUSE-RECONCILIATION-V1', { ordinal: index + 1, clauseId, sourceContentId: `sha256:${FROZEN.lateDecision}`, sourceSpan: { startByteInclusive: byteOffset(text, match.index), endByteExclusive: byteOffset(text, match.index + match[0].length) }, clauseTextRoot: root('PRCV5-LATE-DECISION-CLAUSE-TEXT-V1', match[2]), remediationControlId: controlId, forwardDisposition: 'ADMITTED-EXACTLY-ONCE', inverseDisposition: 'ONE-CLAUSE-TO-ONE-ROW', typedSupersession: 'V4-OMISSION-SUPERSEDED-BY-V5-CONTROL;V4-BYTES-UNCHANGED', acceptanceCredit: 0 }, 'reconciliationRoot');
  });
}

function buildPublication(shardDescriptors) {
  const lateDecisionReconciliation = parseLateDecisionClauses();
  const generatorFact = fileFact(P.generator);
  const externalArtifactSchema = typedRoot('PRCV5-EXTERNAL-ARTIFACT-SCHEMA-V1', { schemaId: 'PRCV5-EXTERNAL-ARTIFACT-CONTRACT-V1', additionalProperties: false, fields: Object.entries({ classification: 'String', immutableLocator: 'String', identityRoot: 'Hash', rawSha256Checksum: 'Hash', mediaType: 'String', bytes: 'SafeInteger', provenanceReceiptRoot: 'Hash', costPolicyRoot: 'Hash', retentionPolicyRoot: 'Hash', deletionPolicyRoot: 'Hash', expiresAt: 'Rfc3339Utc', availabilityPolicyRoot: 'Hash', ownerRoot: 'Hash', disasterRecoveryRoot: 'Hash', restoreReceiptRoot: 'Hash', v5PlanningOnly: 'Boolean', v5OperationalCredit: 'SafeInteger', v5AcceptanceCredit: 'SafeInteger' }).map(([name, typeExpression]) => descriptor(name, typeExpression)), crossFieldInvariants: [eq('/classification', 'PUBLIC-SAFE'), eq('/v5PlanningOnly', true), eq('/v5OperationalCredit', 0), eq('/v5AcceptanceCredit', 0)], classificationEnum: ['PUBLIC-SAFE'], immutableIdentityRequired: true, privateLocatorAllowed: false, unknownFields: 'BLOCK' }, 'schemaRoot');
  const planningShard = shardDescriptors[0];
  const externalPlanningInstance = typedRoot('PRCV5-EXTERNAL-ARTIFACT-PLANNING-INSTANCE-V1', { instanceId: 'PRCV5-EXTERNAL-ARTIFACT-PLANNING-INSTANCE', schemaId: externalArtifactSchema.schemaId, instance: { classification: 'PUBLIC-SAFE', immutableLocator: `content-addressed:sha256:${planningShard.rawSha256Checksum}`, identityRoot: planningShard.contentRoot, rawSha256Checksum: planningShard.rawSha256Checksum, mediaType: 'application/json', bytes: planningShard.bytes, provenanceReceiptRoot: protocolRoot('external-artifact-provenance-planning-witness'), costPolicyRoot: protocolRoot('external-artifact-cost-policy-planning-witness'), retentionPolicyRoot: protocolRoot('external-artifact-retention-policy-planning-witness'), deletionPolicyRoot: protocolRoot('external-artifact-deletion-policy-planning-witness'), expiresAt: '2027-08-30T00:00:00Z', availabilityPolicyRoot: protocolRoot('external-artifact-availability-policy-planning-witness'), ownerRoot: protocolRoot('external-artifact-owner-planning-witness'), disasterRecoveryRoot: protocolRoot('external-artifact-disaster-recovery-planning-witness'), restoreReceiptRoot: protocolRoot('external-artifact-restore-planning-witness'), v5PlanningOnly: true, v5OperationalCredit: 0, v5AcceptanceCredit: 0 }, fixtureClass: 'DETERMINISTIC-NON-AUTHORITATIVE-PROTOCOL-WITNESS', operationalCredit: 0, acceptanceCredit: 0 }, 'instanceRoot');
  const registry = {
    artifactId: 'CONNECT-PRCV5-PUBLICATION-SIZE-SHARD-AND-STORAGE-REGISTRY-2026-08-30',
    schemaVersion: 'PRCV5-PUBLICATION-SIZE-SHARD-STORAGE-V1',
    artifactClass: 'PLANNING-PUBLICATION-AND-STORAGE-GATES;NOT-PUBLICATION-PERMIT;NOT-ACCEPTANCE',
    lateDecisionAdmission: { logicalPath: I.lateDecision, contentId: `sha256:${FROZEN.lateDecision}`, clauseCount: lateDecisionReconciliation.length, forwardUniqueCount: new Set(lateDecisionReconciliation.map((row) => row.clauseId)).size, inverseUniqueCount: new Set(lateDecisionReconciliation.map((row) => row.reconciliationRoot)).size, reconciliationTerminal: 'PASS' },
    lateDecisionReconciliation,
    regularGitMemberGate: { predicate: 'ACTUAL-RAW-BYTES-STRICTLY-LESS-THAN-52428800', exclusiveMaximumBytes: MAX_MEMBER_BYTES_EXCLUSIVE, boundaryPassBytes: MAX_MEMBER_BYTES_EXCLUSIVE - 1, boundaryBlockBytes: MAX_MEMBER_BYTES_EXCLUSIVE, unknownMeasurementTerminal: 'BLOCK', staleMeasurementTerminal: 'BLOCK' },
    repositoryBudgets: [
      ['REPOSITORY-TOTAL-BYTES', 'MISSING-BLOCKING'],
      ['PER-TRANSACTION-GROWTH-BYTES', 'MISSING-BLOCKING'],
      ['CLEAN-CLONE-TIME', 'MISSING-BLOCKING'],
    ].map(([budgetClass, state], index) => ({ ordinal: index + 1, budgetClass, acceptedPolicyRoot: null, acceptedOwnerRoot: null, frozenMeasurementRoot: null, state, publicPushCredit: 0 })),
    generatorFirstContract: { generatorPath: P.generator, generatorContentId: generatorFact.contentId, generatorBytes: generatorFact.bytes, runtime: 'NODE-ES2023-STANDARD-LIBRARY', dependencyRoot: root('PRCV5-GENERATOR-DEPENDENCIES-V1', ['node:fs', 'node:crypto']), canonicalAlgorithm: 'PRCV5-GENERATOR-FIRST-SHARDING-V1', inputRootRule: 'FROZEN-INPUT-MANIFEST-ROOT-PLUS-CLOSURE-SCHEMA-CONTROL-ROOTS', outputClass: 'DERIVED-EVIDENCE', independentRegenerators: ['PRCV5-READER-A', 'PRCV5-READER-B'], driftTerminal: 'BLOCK-PENDING-TYPED-SUPERSESSION-AND-INDEPENDENT-REVIEW' },
    shardAlgorithm: { algorithmId: 'PRCV5-GREEDY-CANONICAL-VECTOR-SHARD-V1', canonicalKey: 'vectorId', order: 'ASCENDING-UNICODE-CODEPOINT', targetCanonicalPayloadBytesExclusive: SHARD_TARGET_PAYLOAD_BYTES_EXCLUSIVE, memberMaximumBytesExclusive: MAX_MEMBER_BYTES_EXCLUSIVE, boundaryRule: 'ADD-NEXT-RECORD-IFF-CURRENT-CANONICAL-RECORD-BYTES-PLUS-NEXT-RECORD-BYTES-PLUS-SEPARATOR-IS-BELOW-TARGET;OVERSIZE-SINGLE-RECORD-BLOCKS', randomnessAllowed: false },
    shardDescriptors,
    shardDenominators: { shards: shardDescriptors.length, vectors: shardDescriptors.reduce((sum, row) => sum + row.vectorCount, 0), bytes: shardDescriptors.reduce((sum, row) => sum + row.bytes, 0), largestShardBytes: Math.max(...shardDescriptors.map((row) => row.bytes)), membersAtOrAbove50MiB: shardDescriptors.filter((row) => row.bytes >= MAX_MEMBER_BYTES_EXCLUSIVE).length },
    externalArtifactSchema,
    externalPlanningInstance,
    externalArtifactCurrentState: { selectedStore: null, selectedStoreState: 'MISSING-BLOCKING', contractRoot: null, lifecycleOwnerRoot: null, operationalReceiptRoot: null, publicPushCredit: 0, reviewCredit: 0, acceptanceCredit: 0 },
    publicationDisposition: 'BLOCKED-BUDGETS-AND-EXTERNAL-EVIDENCE-MISSING',
  };
  return typedRoot('PRCV5-PUBLICATION-SIZE-SHARD-STORAGE-V1', registry, 'publicationRegistryRoot');
}

function parseTypeExpression(expression) {
  if (expression.startsWith('Nullable<') && expression.endsWith('>')) return { kind: 'Nullable', inner: parseTypeExpression(expression.slice(9, -1)) };
  if (expression.startsWith('Array<') && expression.endsWith('>')) return { kind: 'Array', inner: parseTypeExpression(expression.slice(6, -1)) };
  if (expression.startsWith('Map<') && expression.endsWith('>')) {
    const [keyType, valueType] = splitMapArguments(expression.slice(4, -1));
    return { kind: 'Map', key: parseTypeExpression(keyType), value: parseTypeExpression(valueType) };
  }
  return { kind: 'Named', name: expression };
}

function validatePrimitive(typeName, value) {
  const definition = PRIMITIVE_TYPES[typeName];
  if (!definition) return false;
  if (definition.kind === 'BOOLEAN') return typeof value === 'boolean';
  if (definition.kind === 'SAFE-INTEGER') return Number.isSafeInteger(value) && value >= definition.minimum && value <= definition.maximum;
  if (definition.kind !== 'STRING' || typeof value !== 'string') return false;
  if (definition.minLength !== undefined && value.length < definition.minLength) return false;
  if (definition.maxLength !== undefined && value.length > definition.maxLength) return false;
  if (definition.pattern && !(new RegExp(definition.pattern).test(value))) return false;
  if (definition.enum && !definition.enum.includes(value)) return false;
  return true;
}

function validateSchemaInstance(schema, instance, schemaMap) {
  if (!instance || typeof instance !== 'object' || Array.isArray(instance)) return false;
  const expectedKeys = schema.fields.map((field) => field.name).sort();
  if (canonical(Object.keys(instance).sort()) !== canonical(expectedKeys)) return false;
  function validateExpression(expression, value) {
    const parsed = parseTypeExpression(expression);
    function visit(node, candidate) {
      if (node.kind === 'Nullable') return candidate === null || visit(node.inner, candidate);
      if (node.kind === 'Array') return Array.isArray(candidate) && candidate.length >= 1 && candidate.length <= 4096 && new Set(candidate.map(canonical)).size === candidate.length && candidate.every((item) => visit(node.inner, item));
      if (node.kind === 'Map') return candidate && typeof candidate === 'object' && !Array.isArray(candidate) && Object.keys(candidate).length > 0 && Object.keys(candidate).every((key) => visit(node.key, key) && visit(node.value, candidate[key]));
      if (node.name in PRIMITIVE_TYPES) return validatePrimitive(node.name, candidate);
      const nested = schemaMap.get(node.name);
      return Boolean(nested) && validateSchemaInstance(nested, candidate, schemaMap);
    }
    return visit(parsed, value);
  }
  for (const field of schema.fields) if (!validateExpression(field.typeExpression, instance[field.name])) return false;
  return schema.crossFieldInvariants.every((predicate) => evaluateAst(predicate, instance) === true);
}

function wrongValueFor(expression) {
  const parsed = parseTypeExpression(expression);
  if (parsed.kind === 'Array' || parsed.kind === 'Map') return false;
  if (parsed.kind === 'Nullable') return { invalid: true };
  if (parsed.name === 'Boolean') return 'INVALID-BOOLEAN';
  if (parsed.name === 'SafeInteger') return 'INVALID-INTEGER';
  if (parsed.name === 'String' || parsed.name === 'Id' || parsed.name === 'Hash' || parsed.name === 'GitOid' || parsed.name === 'TrustedTime' || parsed.name === 'State') return false;
  return false;
}

function vectorRooted(body) {
  return typedRoot('PRCV5-CAUSAL-VECTOR-V1', body, 'vectorRoot');
}

function terminalForVector(vector, context) {
  if (vector.evaluator.kind === 'AST') {
    const after = mutate(vector.preState, vector.operation);
    return evaluateAst(vector.evaluator.predicate, after) === true ? 'PASS' : 'BLOCK';
  }
  if (vector.evaluator.kind === 'SCHEMA') {
    const instanceRecord = context.instanceMap.get(vector.preStateRef.instanceId);
    if (!instanceRecord || instanceRecord.instanceRoot !== vector.preStateRef.instanceRoot) return 'BLOCK';
    const schema = context.schemaIdMap.get(vector.evaluator.schemaId);
    if (!schema) return 'BLOCK';
    const after = mutate(instanceRecord.instance, vector.operation);
    return validateSchemaInstance(schema, after, context.schemaTypeMap) ? 'PASS' : 'BLOCK';
  }
  if (vector.evaluator.kind === 'PERMIT-NAMEDUSE') return vector.evaluator.presentedPermitClass === vector.evaluator.consumerPermitClass ? 'PASS' : 'BLOCK';
  if (vector.evaluator.kind === 'PERMIT-SCHEMA') {
    const permit = context.permitMap.get(vector.evaluator.permitClass);
    if (!permit || permit.schema.schemaRoot !== vector.evaluator.schemaRoot || permit.planningInstance.instanceRoot !== vector.preStateRef.instanceRoot) return 'BLOCK';
    return validateSchemaInstance(permit.schema, mutate(permit.planningInstance.instance, vector.operation), context.schemaTypeMap) ? 'PASS' : 'BLOCK';
  }
  if (vector.evaluator.kind === 'LIFECYCLE-SCENARIO') {
    const scenario = context.lifecycle.scenarios.find((row) => row.scenarioId === vector.evaluator.scenarioId);
    if (!scenario) return 'BLOCK';
    const rerun = runSingleAttempt(scenario.overrides, scenario.crashMode);
    const accepted = vector.evaluator.acceptedTerminals;
    return accepted.includes(rerun.terminal) && canonical(rerun) === canonical(scenario.result) ? 'PASS' : 'BLOCK';
  }
  if (vector.evaluator.kind === 'DIGEST-BOUNDARY') {
    const raw = shaText(canonical(vector.preState.payload));
    const typed = root(vector.preState.domain, vector.preState.payload);
    if (vector.operation.op === 'SET-DOMAIN') return root(vector.operation.operand, vector.preState.payload) === vector.preState.expectedIdentityRoot ? 'PASS' : 'BLOCK';
    return raw !== typed && typed === vector.preState.expectedIdentityRoot ? 'PASS' : 'BLOCK';
  }
  return 'BLOCK';
}

function finishVector(body, context, expectedTerminalOverride = null) {
  const provisional = { ...body, actualTerminal: null, comparisonTerminal: null };
  const actualTerminal = terminalForVector(provisional, context);
  const expectedTerminal = expectedTerminalOverride ?? body.expectedTerminal;
  const comparisonTerminal = actualTerminal === expectedTerminal ? 'PASS' : 'BLOCK';
  return vectorRooted({ ...body, expectedTerminal, actualTerminal, comparisonTerminal });
}

function closureState(row) {
  return { findingId: row.findingId, noMergeKey: row.noMergeKey, sourceRecordRoot: row.sourceRecordRoot, requirementIds: row.requirementIds, outputObjectIds: row.outputObjectIds, residualState: row.residualState, closureCredit: 0, acceptanceCredit: 0 };
}

function closurePredicate(row) {
  return and(
    eq('/findingId', row.findingId),
    eq('/noMergeKey', row.noMergeKey),
    eq('/sourceRecordRoot', row.sourceRecordRoot),
    eq('/requirementIds', row.requirementIds),
    eq('/outputObjectIds', row.outputObjectIds),
    eq('/residualState', row.residualState),
    eq('/closureCredit', 0),
    eq('/acceptanceCredit', 0),
  );
}

function mutatedConjunctValue(value) {
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'number') return value + 1;
  return `${value}-MUTATED`;
}

function buildVectors(closures, schemas, lifecycle, permits, authority, publicFlow, digests) {
  const schemaIdMap = new Map([...schemas.nestedSchemas, ...schemas.outputFamilies].map((schema) => [schema.schemaId, schema]));
  const schemaTypeMap = new Map(schemas.nestedSchemas.map((schema) => [schema.typeName, schema]));
  const instanceMap = new Map(schemas.admittedInstances.map((record) => [record.instanceId, record]));
  const permitMap = new Map(permits.permits.map((permit) => [permit.permitClass, permit]));
  const context = { schemaIdMap, schemaTypeMap, instanceMap, permitMap, lifecycle };
  const vectors = [];
  for (const row of closures.records) {
    const suffix = String(row.ordinal).padStart(3, '0');
    const preState = closureState(row);
    const evaluator = { kind: 'AST', languageId: schemas.validatorLanguage.languageId, languageRoot: schemas.validatorLanguage.languageRoot, predicateId: row.atomicPredicateIds[0], predicate: closurePredicate(row) };
    vectors.push(finishVector({ vectorId: `PRCV5-VECTOR-CLOSURE-${suffix}-POS`, vectorClass: 'FINDING-CLOSURE-POSITIVE-CONTROL', targetFindingId: row.findingId, targetPredicateId: row.atomicPredicateIds[0], preState, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', preState), operation: { op: 'NONE' }, evaluator, expectedTerminal: 'PASS', effectSet: [] }, context));
    vectors.push(finishVector({ vectorId: `PRCV5-VECTOR-CLOSURE-${suffix}-NEG-NOMERGE`, vectorClass: 'FINDING-CLOSURE-SINGLE-FAULT-NEGATIVE', targetFindingId: row.findingId, targetPredicateId: row.atomicPredicateIds[0], preState, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', preState), operation: { op: 'SET', pointer: '/noMergeKey', operand: `${row.noMergeKey}-MUTATED` }, evaluator, expectedTerminal: 'BLOCK', effectSet: [] }, context));
  }
  for (const control of closures.remediationControls) {
    const suffix = control.controlId.slice(-3);
    const keys = Object.keys(control.conjuncts).sort();
    const preState = { controlId: control.controlId, findingId: control.findingId, ...control.conjuncts, operationalCredit: 0, acceptanceCredit: 0 };
    const predicate = and(eq('/controlId', control.controlId), eq('/findingId', control.findingId), ...keys.map((key) => eq(`/${key}`, control.conjuncts[key])), eq('/operationalCredit', 0), eq('/acceptanceCredit', 0));
    const evaluator = { kind: 'AST', languageId: schemas.validatorLanguage.languageId, languageRoot: schemas.validatorLanguage.languageRoot, predicateId: `PRCV5-PRED-${control.findingId}-CONTROL-ALL`, predicate };
    vectors.push(finishVector({ vectorId: `PRCV5-VECTOR-CONTROL-${suffix}-POS`, vectorClass: 'REMEDIATION-CONTROL-POSITIVE', targetFindingId: control.findingId, targetControlId: control.controlId, targetPredicateIds: keys.map((key) => `PRCV5-PRED-${control.findingId}-CONTROL-${key}`), preState, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', preState), operation: { op: 'NONE' }, evaluator, expectedTerminal: 'PASS', effectSet: [] }, context));
    keys.forEach((key, index) => vectors.push(finishVector({ vectorId: `PRCV5-VECTOR-CONTROL-${suffix}-NEG-${String(index + 1).padStart(2, '0')}`, vectorClass: 'REMEDIATION-CONTROL-SINGLE-CONJUNCT-NEGATIVE', targetFindingId: control.findingId, targetControlId: control.controlId, targetPredicateIds: [`PRCV5-PRED-${control.findingId}-CONTROL-${key}`], preState, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', preState), operation: { op: 'SET', pointer: `/${key}`, operand: mutatedConjunctValue(control.conjuncts[key]) }, evaluator, expectedTerminal: 'BLOCK', effectSet: [] }, context)));
  }
  for (const instanceRecord of schemas.admittedInstances) {
    const schema = schemaIdMap.get(instanceRecord.schemaId);
    const base = `PRCV5-VECTOR-SCHEMA-${schema.schemaId}`;
    const evaluator = { kind: 'SCHEMA', validatorLanguageId: schemas.validatorLanguage.languageId, validatorLanguageRoot: schemas.validatorLanguage.languageRoot, schemaId: schema.schemaId, schemaRoot: schema.schemaRoot };
    const preStateRef = { instanceId: instanceRecord.instanceId, instanceRoot: instanceRecord.instanceRoot };
    vectors.push(finishVector({ vectorId: `${base}-POS`, vectorClass: 'SCHEMA-ADMITTED-INSTANCE-POSITIVE', targetSchemaId: schema.schemaId, preStateRef, operation: { op: 'NONE' }, evaluator, expectedTerminal: 'PASS', effectSet: [] }, context));
    for (let index = 0; index < schema.fields.length; index += 1) {
      const field = schema.fields[index];
      const escaped = field.name.replace(/~/g, '~0').replace(/\//g, '~1');
      vectors.push(finishVector({ vectorId: `${base}-NEG-MISSING-${String(index + 1).padStart(3, '0')}`, vectorClass: 'SCHEMA-SINGLE-FIELD-MISSING-NEGATIVE', targetSchemaId: schema.schemaId, targetField: field.name, preStateRef, operation: { op: 'DELETE', pointer: `/${escaped}` }, evaluator, expectedTerminal: 'BLOCK', effectSet: [] }, context));
      vectors.push(finishVector({ vectorId: `${base}-NEG-TYPE-${String(index + 1).padStart(3, '0')}`, vectorClass: 'SCHEMA-SINGLE-FIELD-TYPE-NEGATIVE', targetSchemaId: schema.schemaId, targetField: field.name, preStateRef, operation: { op: 'SET', pointer: `/${escaped}`, operand: wrongValueFor(field.typeExpression) }, evaluator, expectedTerminal: 'BLOCK', effectSet: [] }, context));
    }
    vectors.push(finishVector({ vectorId: `${base}-NEG-UNKNOWN`, vectorClass: 'SCHEMA-UNKNOWN-FIELD-NEGATIVE', targetSchemaId: schema.schemaId, preStateRef, operation: { op: 'ADD', pointer: '/unknownField', operand: true }, evaluator, expectedTerminal: 'BLOCK', effectSet: [] }, context));
    const creditField = schema.fields.find((field) => field.name === 'v5AcceptanceCredit');
    if (creditField) vectors.push(finishVector({ vectorId: `${base}-NEG-INVARIANT`, vectorClass: 'SCHEMA-CROSS-FIELD-INVARIANT-NEGATIVE', targetSchemaId: schema.schemaId, preStateRef, operation: { op: 'SET', pointer: '/v5AcceptanceCredit', operand: 1 }, evaluator, expectedTerminal: 'BLOCK', effectSet: [] }, context));
  }
  for (const cell of permits.crossUseMatrix) {
    vectors.push(finishVector({ vectorId: `PRCV5-VECTOR-${cell.cellId}`, vectorClass: cell.presentedPermitClass === cell.consumerPermitClass ? 'PERMIT-NAMEDUSE-POSITIVE' : 'PERMIT-CROSS-CLASS-NEGATIVE', targetPermitCellId: cell.cellId, preState: { presentedPermitClass: cell.presentedPermitClass, consumerPermitClass: cell.consumerPermitClass, namedUse: cell.namedUse }, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', cell), operation: { op: 'NONE' }, evaluator: { kind: 'PERMIT-NAMEDUSE', presentedPermitClass: cell.presentedPermitClass, consumerPermitClass: cell.consumerPermitClass, namedUse: cell.namedUse }, expectedTerminal: cell.presentedPermitClass === cell.consumerPermitClass ? 'PASS' : 'BLOCK', effectSet: [] }, context));
  }
  for (const permit of permits.permits) {
    const prefix = `PRCV5-VECTOR-PERMIT-SCHEMA-${permit.ordinal}`;
    const evaluator = { kind: 'PERMIT-SCHEMA', permitClass: permit.permitClass, schemaRoot: permit.schema.schemaRoot, validatorLanguageId: schemas.validatorLanguage.languageId, validatorLanguageRoot: schemas.validatorLanguage.languageRoot };
    const preStateRef = { instanceId: permit.planningInstance.instanceId, instanceRoot: permit.planningInstance.instanceRoot };
    vectors.push(finishVector({ vectorId: `${prefix}-POS`, vectorClass: 'PERMIT-SCHEMA-POSITIVE', targetPermitClass: permit.permitClass, preStateRef, operation: { op: 'NONE' }, evaluator, expectedTerminal: 'PASS', effectSet: [] }, context));
    permit.schema.fields.forEach((field, index) => {
      const escaped = field.name.replace(/~/g, '~0').replace(/\//g, '~1');
      vectors.push(finishVector({ vectorId: `${prefix}-NEG-MISSING-${String(index + 1).padStart(3, '0')}`, vectorClass: 'PERMIT-SCHEMA-SINGLE-FIELD-MISSING-NEGATIVE', targetPermitClass: permit.permitClass, targetField: field.name, preStateRef, operation: { op: 'DELETE', pointer: `/${escaped}` }, evaluator, expectedTerminal: 'BLOCK', effectSet: [] }, context));
      vectors.push(finishVector({ vectorId: `${prefix}-NEG-TYPE-${String(index + 1).padStart(3, '0')}`, vectorClass: 'PERMIT-SCHEMA-SINGLE-FIELD-TYPE-NEGATIVE', targetPermitClass: permit.permitClass, targetField: field.name, preStateRef, operation: { op: 'SET', pointer: `/${escaped}`, operand: wrongValueFor(field.typeExpression) }, evaluator, expectedTerminal: 'BLOCK', effectSet: [] }, context));
    });
    vectors.push(finishVector({ vectorId: `${prefix}-NEG-UNKNOWN`, vectorClass: 'PERMIT-SCHEMA-UNKNOWN-FIELD-NEGATIVE', targetPermitClass: permit.permitClass, preStateRef, operation: { op: 'ADD', pointer: '/unknownField', operand: true }, evaluator, expectedTerminal: 'BLOCK', effectSet: [] }, context));
    vectors.push(finishVector({ vectorId: `${prefix}-NEG-INVARIANT`, vectorClass: 'PERMIT-SCHEMA-CROSS-FIELD-INVARIANT-NEGATIVE', targetPermitClass: permit.permitClass, preStateRef, operation: { op: 'SET', pointer: '/v5AcceptanceCredit', operand: 1 }, evaluator, expectedTerminal: 'BLOCK', effectSet: [] }, context));
  }
  for (const scenario of lifecycle.scenarios) {
    vectors.push(finishVector({ vectorId: `PRCV5-VECTOR-LIFECYCLE-${scenario.scenarioId}`, vectorClass: 'LIFECYCLE-EXECUTION', targetScenarioId: scenario.scenarioId, preStateRef: { scenarioId: scenario.scenarioId, scenarioRoot: scenario.scenarioRoot }, operation: { op: 'EXECUTE-REDUCER' }, evaluator: { kind: 'LIFECYCLE-SCENARIO', reducerId: lifecycle.reducer.reducerId, scenarioId: scenario.scenarioId, acceptedTerminals: [scenario.result.terminal] }, expectedTerminal: 'PASS', effectSet: scenario.result.store.effectCount === 1 ? [scenario.result.store.head] : [] }, context));
  }
  const sizeCases = [
    ['BOUNDARY-PASS', MAX_MEMBER_BYTES_EXCLUSIVE - 1, 'PASS'],
    ['BOUNDARY-BLOCK', MAX_MEMBER_BYTES_EXCLUSIVE, 'BLOCK'],
    ['ABOVE-BLOCK', MAX_MEMBER_BYTES_EXCLUSIVE + 1, 'BLOCK'],
  ];
  for (const [caseId, bytes, expectedTerminal] of sizeCases) {
    const preState = { bytes };
    vectors.push(finishVector({ vectorId: `PRCV5-VECTOR-SIZE-${caseId}`, vectorClass: 'PUBLICATION-SIZE-BOUNDARY', preState, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', preState), operation: { op: 'NONE' }, evaluator: { kind: 'AST', languageId: schemas.validatorLanguage.languageId, languageRoot: schemas.validatorLanguage.languageRoot, predicateId: 'PRCV5-SIZE-STRICT-PREDICATE', predicate: { op: 'LT', args: [get('/bytes'), lit(MAX_MEMBER_BYTES_EXCLUSIVE)] } }, expectedTerminal, effectSet: [] }, context));
  }
  const visibilityCases = [['PUBLIC-PUBLIC', 'PUBLIC', 'PUBLIC', 'PASS'], ['PRIVATE-PRE', 'PRIVATE', 'PUBLIC', 'BLOCK'], ['PRIVATE-POST', 'PUBLIC', 'PRIVATE', 'BLOCK'], ['MISSING-POST', 'PUBLIC', 'MISSING-BLOCKING', 'BLOCK']];
  for (const [caseId, pre, post, expectedTerminal] of visibilityCases) {
    const preState = { pre, post };
    vectors.push(finishVector({ vectorId: `PRCV5-VECTOR-VISIBILITY-${caseId}`, vectorClass: 'CONTINUOUS-PUBLIC-INVARIANT', preState, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', preState), operation: { op: 'NONE' }, evaluator: { kind: 'AST', languageId: schemas.validatorLanguage.languageId, languageRoot: schemas.validatorLanguage.languageRoot, predicateId: 'PRCV5-PRE-POST-PUBLIC', predicate: and(eq('/pre', 'PUBLIC'), eq('/post', 'PUBLIC')) }, expectedTerminal, effectSet: [] }, context));
  }
  const scannerState = Object.fromEntries(publicFlow.scannerProfiles.flatMap((profile, index) => [[`engine${index + 1}`, profile.engineRoot], [`ruleset${index + 1}`, profile.rulesetRoot], [`owner${index + 1}`, profile.authorityOwnerRoot]]));
  const scannerPredicate = and(eq('/engine1', publicFlow.scannerProfiles[0].engineRoot), eq('/engine2', publicFlow.scannerProfiles[1].engineRoot), { op: 'NEQ', args: [get('/engine1'), get('/engine2')] }, { op: 'NEQ', args: [get('/ruleset1'), get('/ruleset2')] }, { op: 'NEQ', args: [get('/owner1'), get('/owner2')] });
  vectors.push(finishVector({ vectorId: 'PRCV5-VECTOR-SCANNER-INDEPENDENCE-POS', vectorClass: 'SCANNER-INDEPENDENCE-POSITIVE', preState: scannerState, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', scannerState), operation: { op: 'NONE' }, evaluator: { kind: 'AST', languageId: schemas.validatorLanguage.languageId, languageRoot: schemas.validatorLanguage.languageRoot, predicateId: 'PRCV5-SCANNER-INDEPENDENCE', predicate: scannerPredicate }, expectedTerminal: 'PASS', effectSet: [] }, context));
  vectors.push(finishVector({ vectorId: 'PRCV5-VECTOR-SCANNER-INDEPENDENCE-NEG-ALIAS', vectorClass: 'SCANNER-INDEPENDENCE-NEGATIVE', preState: scannerState, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', scannerState), operation: { op: 'SET', pointer: '/engine2', operand: scannerState.engine1 }, evaluator: { kind: 'AST', languageId: schemas.validatorLanguage.languageId, languageRoot: schemas.validatorLanguage.languageRoot, predicateId: 'PRCV5-SCANNER-INDEPENDENCE', predicate: scannerPredicate }, expectedTerminal: 'BLOCK', effectSet: [] }, context));
  function addConjunctMatrix(prefix, vectorClass, predicateId, state) {
    const keys = Object.keys(state).sort();
    const predicate = and(...keys.map((key) => eq(`/${key}`, state[key])));
    const evaluator = { kind: 'AST', languageId: schemas.validatorLanguage.languageId, languageRoot: schemas.validatorLanguage.languageRoot, predicateId, predicate };
    vectors.push(finishVector({ vectorId: `${prefix}-POS`, vectorClass: `${vectorClass}-POSITIVE`, targetPredicateIds: keys.map((key) => `${predicateId}-${key}`), preState: state, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', state), operation: { op: 'NONE' }, evaluator, expectedTerminal: 'PASS', effectSet: [] }, context));
    keys.forEach((key, index) => vectors.push(finishVector({ vectorId: `${prefix}-NEG-${String(index + 1).padStart(2, '0')}`, vectorClass: `${vectorClass}-SINGLE-CONJUNCT-NEGATIVE`, targetPredicateIds: [`${predicateId}-${key}`], preState: state, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', state), operation: { op: 'SET', pointer: `/${key}`, operand: mutatedConjunctValue(state[key]) }, evaluator, expectedTerminal: 'BLOCK', effectSet: [] }, context)));
  }
  addConjunctMatrix('PRCV5-VECTOR-ALLOWLIST-MATRIX', 'DUAL-ALLOWLIST-INDEPENDENCE', 'PRCV5-ALLOWLIST-INDEPENDENCE', { implementations: 'DISJOINT', workReceipts: 'DISJOINT', ledgers: 'DISJOINT', authorityOwners: 'DISJOINT', inputCuts: 'IDENTICAL', outputs: 'BYTE-IDENTICAL', adjudicatorSeparate: true });
  addConjunctMatrix('PRCV5-VECTOR-SCANNER-MATRIX', 'SCANNER-FULL-INDEPENDENCE', 'PRCV5-SCANNER-FULL-INDEPENDENCE', { engines: 'DISJOINT', rulesets: 'DISJOINT', implementations: 'DISJOINT', workLedgersOwners: 'DISJOINT', inputCuts: 'IDENTICAL', scanReceipts: 'PRESENT-PLANNING-WITNESS', adjudicatorSeparate: true, disagreement: 'BLOCK' });
  addConjunctMatrix('PRCV5-VECTOR-SHARD-MATRIX', 'DETERMINISTIC-SHARD-RECONSTRUCTION', 'PRCV5-SHARD-RECONSTRUCTION', { ordinals: 'CONTIGUOUS', ranges: 'GAP-FREE-NON-OVERLAPPING', canonicalKeys: 'STRICTLY-ORDERED-UNIQUE', counts: 'MATCH', rawBytes: 'MATCH', contentRoots: 'MATCH', corpusRoot: 'MATCH', generatorRoot: 'MATCH', memberSize: 'BELOW-52428800' });
  addConjunctMatrix('PRCV5-VECTOR-BUDGET-MATRIX', 'REPOSITORY-BUDGET-GATE', 'PRCV5-REPOSITORY-BUDGET-GATE', { policyAccepted: true, ownerAccepted: true, measurementFresh: true, repositoryTotalWithinBudget: true, transactionGrowthWithinBudget: true, cloneTimeWithinBudget: true });
  addConjunctMatrix('PRCV5-VECTOR-EXTERNAL-ARTIFACT-MATRIX', 'EXTERNAL-ARTIFACT-LIFECYCLE', 'PRCV5-EXTERNAL-ARTIFACT-LIFECYCLE', { classification: 'PUBLIC-SAFE', forbiddenContent: false, immutableIdentity: true, digestMatches: true, attestationSubjectMatches: true, expired: false, deleted: false, accessible: true, ownerPresent: true, budgetWithin: true, restoreMatches: true, locatorPublicApproved: true });
  for (const row of digests.classBoundaryControls.slice(0, 3)) {
    const preState = { payload: { exact: 'SAME-CANONICAL-PAYLOAD' }, domain: row.domain, expectedIdentityRoot: row.identityRoot };
    vectors.push(finishVector({ vectorId: `PRCV5-VECTOR-DIGEST-${row.identityClass}-POS`, vectorClass: 'DIGEST-DOMAIN-BOUNDARY-POSITIVE', preState, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', preState), operation: { op: 'NONE' }, evaluator: { kind: 'DIGEST-BOUNDARY' }, expectedTerminal: 'PASS', effectSet: [] }, context));
    const otherDomain = digests.classBoundaryControls.find((candidate) => candidate.domain !== row.domain).domain;
    vectors.push(finishVector({ vectorId: `PRCV5-VECTOR-DIGEST-${row.identityClass}-NEG-SUBSTITUTION`, vectorClass: 'DIGEST-DOMAIN-SUBSTITUTION-NEGATIVE', preState, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', preState), operation: { op: 'SET-DOMAIN', operand: otherDomain }, evaluator: { kind: 'DIGEST-BOUNDARY' }, expectedTerminal: 'BLOCK', effectSet: [] }, context));
  }
  const expectationPreState = { value: 'VALID' };
  vectors.push(finishVector({ vectorId: 'PRCV5-VECTOR-EXPECTED-TERMINAL-NOT-ORACLE', vectorClass: 'EXPECTED-TERMINAL-COMPARISON-ONLY-NEGATIVE', preState: expectationPreState, preStateRoot: root('PRCV5-VECTOR-PRESTATE-V1', expectationPreState), operation: { op: 'MUTATE-EXPECTED-ONLY' }, evaluator: { kind: 'AST', languageId: schemas.validatorLanguage.languageId, languageRoot: schemas.validatorLanguage.languageRoot, predicateId: 'PRCV5-EXPECTED-NOT-INPUT', predicate: eq('/value', 'VALID') }, expectedTerminal: 'BLOCK', effectSet: [] }, context, 'BLOCK'));
  vectors.sort((a, b) => a.vectorId.localeCompare(b.vectorId));
  assert(new Set(vectors.map((vector) => vector.vectorId)).size === vectors.length, 'duplicate vector id');
  return vectors;
}

function shardVectors(vectors) {
  const groups = [];
  let current = [];
  let currentPayloadBytes = 0;
  for (const vector of vectors) {
    const recordBytes = Buffer.byteLength(canonical(vector), 'utf8') + 1;
    assert(recordBytes < SHARD_TARGET_PAYLOAD_BYTES_EXCLUSIVE, `single vector exceeds shard target ${vector.vectorId}`);
    if (current.length > 0 && currentPayloadBytes + recordBytes >= SHARD_TARGET_PAYLOAD_BYTES_EXCLUSIVE) {
      groups.push(current);
      current = [];
      currentPayloadBytes = 0;
    }
    current.push(vector);
    currentPayloadBytes += recordBytes;
  }
  if (current.length) groups.push(current);
  const total = groups.length;
  const files = new Map();
  const descriptors = [];
  groups.forEach((records, index) => {
    const ordinal = index + 1;
    const path = `docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-executable-causal-vector-corpus-shard-${String(ordinal).padStart(2, '0')}-of-${String(total).padStart(2, '0')}-${DATE}.json`;
    const contentRoot = root('PRCV5-VECTOR-SHARD-CONTENT-V1', records.map((record) => ({ vectorId: record.vectorId, vectorRoot: record.vectorRoot })));
    const shard = { artifactId: `CONNECT-PRCV5-VECTOR-SHARD-${String(ordinal).padStart(2, '0')}-OF-${String(total).padStart(2, '0')}-2026-08-30`, schemaVersion: 'PRCV5-VECTOR-SHARD-V1', artifactClass: 'DERIVED-EXECUTABLE-PLANNING-VECTOR-SHARD;NOT-SOURCE;NOT-ACCEPTANCE', ordinal, totalShards: total, firstCanonicalKey: records[0].vectorId, lastCanonicalKey: records.at(-1).vectorId, vectorCount: records.length, canonicalPayloadBytes: records.reduce((sum, record) => sum + Buffer.byteLength(canonical(record), 'utf8') + 1, 0), contentRoot, vectors: records };
    const content = pretty(shard);
    const bytes = Buffer.byteLength(content, 'utf8');
    assert(bytes < MAX_MEMBER_BYTES_EXCLUSIVE, `vector shard too large ${path}`);
    files.set(path, content);
    descriptors.push({ ordinal, logicalPath: path, firstCanonicalKey: shard.firstCanonicalKey, lastCanonicalKey: shard.lastCanonicalKey, vectorCount: records.length, canonicalPayloadBytes: shard.canonicalPayloadBytes, bytes, rawSha256Checksum: shaText(content), contentRoot, sourceClass: 'DERIVED-EVIDENCE' });
  });
  return { files, descriptors };
}

function buildVectorIndex(vectors, descriptors) {
  const corpusProjection = vectors.map((vector) => ({ vectorId: vector.vectorId, vectorRoot: vector.vectorRoot }));
  const classCounts = Object.fromEntries([...new Set(vectors.map((vector) => vector.vectorClass))].sort().map((vectorClass) => [vectorClass, vectors.filter((vector) => vector.vectorClass === vectorClass).length]));
  const index = {
    artifactId: 'CONNECT-PRCV5-EXECUTABLE-CAUSAL-VECTOR-CORPUS-2026-08-30',
    schemaVersion: 'PRCV5-EXECUTABLE-CAUSAL-VECTOR-CORPUS-V1',
    artifactClass: 'GENERATOR-FIRST-DERIVED-VECTOR-CORPUS-INDEX;NOT-SOURCE;NOT-OPERATIONAL-EVIDENCE;NOT-ACCEPTANCE',
    generatorId: 'PRCV5-GENERATOR-FIRST-SHARDING-V1',
    canonicalKey: 'vectorId',
    vectorCount: vectors.length,
    vectorClassCounts: classCounts,
    comparisonPassCount: vectors.filter((vector) => vector.comparisonTerminal === 'PASS').length,
    comparisonBlockCount: vectors.filter((vector) => vector.comparisonTerminal === 'BLOCK').length,
    intentionalExpectedOnlyComparisonBlocks: vectors.filter((vector) => vector.vectorClass === 'EXPECTED-TERMINAL-COMPARISON-ONLY-NEGATIVE' && vector.comparisonTerminal === 'BLOCK').length,
    negativeVectorCount: vectors.filter((vector) => vector.vectorClass.includes('NEGATIVE') || vector.expectedTerminal === 'BLOCK').length,
    negativeActualBlockCount: vectors.filter((vector) => (vector.vectorClass.includes('NEGATIVE') || vector.expectedTerminal === 'BLOCK') && vector.actualTerminal === 'BLOCK').length,
    corpusRoot: root('PRCV5-VECTOR-CORPUS-V1', corpusProjection),
    shardDescriptors: descriptors,
    shardManifestRoot: root('PRCV5-VECTOR-SHARD-MANIFEST-V1', descriptors),
    coverageRule: 'EVERY-CLOSURE-PREDICATE-AND-SCHEMA-FIELD-HAS-EXACT-POSITIVE-AND-SINGLE-FAULT-NEGATIVE-COVERAGE;NO-SHARED-CREDIT',
  };
  return typedRoot('PRCV5-VECTOR-CORPUS-INDEX-V1', index, 'vectorIndexRoot');
}

function addGraphNode(nodes, nodeId, nodeClass, state = 'MATERIALIZED-PLANNING') {
  nodes.push({ nodeId, nodeClass, state });
}

function addGraphEdge(edges, from, to, relation) {
  edges.push({ edgeId: `PRCV5-EDGE-${String(edges.length + 1).padStart(6, '0')}`, from, to, relation });
}

function buildGraph(inputs, closures, schemas, authority, permits, vectorIndex, shardDescriptors) {
  const nodes = [];
  const edges = [];
  for (const source of inputs.sourceRecords) addGraphNode(nodes, source.sourceId, 'FROZEN-INPUT', 'ADMITTED-CONTENT-ADDRESSED');
  for (const row of closures.records) addGraphNode(nodes, row.findingId, 'FINDING', row.residualState);
  for (const requirement of schemas.outputFamilies) {
    addGraphNode(nodes, requirement.requirementId, 'REQUIREMENT');
    addGraphNode(nodes, requirement.outputObjectId, 'OUTPUT-OBJECT', 'PLANNING-ONLY');
    addGraphNode(nodes, requirement.schemaId, 'SCHEMA');
  }
  for (const schema of schemas.nestedSchemas) addGraphNode(nodes, schema.schemaId, 'NESTED-SCHEMA');
  for (const producer of authority.producers) addGraphNode(nodes, producer.producerId, 'PRODUCER', 'PLANNING-APPOINTMENT-ONLY');
  for (const control of closures.remediationControls) addGraphNode(nodes, control.controlId, 'REMEDIATION-CONTROL');
  for (const row of closures.records) for (const predicateId of row.atomicPredicateIds) addGraphNode(nodes, predicateId, 'ATOMIC-PREDICATE');
  for (const descriptor of shardDescriptors) addGraphNode(nodes, `PRCV5-VECTOR-SHARD-${descriptor.ordinal}`, 'VECTOR-SHARD');
  const vectorRecords = shardDescriptors.flatMap((descriptor) => readVectorShardFromGenerated(descriptor.logicalPath).vectors);
  for (const vector of vectorRecords) {
    addGraphNode(nodes, vector.vectorId, 'VECTOR');
    addGraphNode(nodes, `${vector.vectorId}-RESULT`, 'VECTOR-RESULT', vector.actualTerminal);
  }
  for (const permit of permits.permits) {
    addGraphNode(nodes, permit.typeTag, 'PERMIT', 'ABSENT');
    addGraphNode(nodes, permit.consumerRole, 'PERMIT-CONSUMER');
  }
  for (const node of [['PRCV5-MANIFEST-ENVELOPE', 'MANIFEST'], ['PRCV5-READER-A-REPORT', 'DETACHED-RECEIPT'], ['PRCV5-READER-B-REPORT', 'DETACHED-RECEIPT'], ['PRCV5-FRESH-INDEPENDENT-REVIEW', 'REVIEW'], ['PRCV5-DETACHED-ACCEPTANCE', 'ACCEPTANCE']]) addGraphNode(nodes, node[0], node[1], node[1] === 'ACCEPTANCE' ? 'ABSENT' : 'PENDING');
  for (const row of closures.records) {
    addGraphEdge(edges, row.generation.startsWith('INHERITED') ? 'V4-CLOSURES' : 'V4-FINDINGS-MANIFEST', row.findingId, 'SOURCES-FINDING');
    for (const requirementId of row.requirementIds) addGraphEdge(edges, row.findingId, requirementId, 'REQUIRES');
    if (row.remediationControlId) addGraphEdge(edges, row.findingId, row.remediationControlId, 'REMEDIATED-BY-PLANNING-CONTROL');
    for (const predicateId of row.atomicPredicateIds) addGraphEdge(edges, row.findingId, predicateId, 'HAS-ATOMIC-PREDICATE');
    for (const vectorId of row.vectorIds) addGraphEdge(edges, row.findingId, vectorId, 'TESTED-BY');
  }
  for (const family of schemas.outputFamilies) {
    addGraphEdge(edges, family.requirementId, family.outputObjectId, 'PRODUCES-OUTPUT');
    addGraphEdge(edges, family.soleProducerId, family.outputObjectId, 'SOLE-PRODUCES');
    addGraphEdge(edges, family.schemaId, family.outputObjectId, 'VALIDATES');
  }
  for (const vector of vectorRecords) addGraphEdge(edges, vector.vectorId, `${vector.vectorId}-RESULT`, 'EXECUTES-TO');
  for (const descriptor of shardDescriptors) {
    const shardNode = `PRCV5-VECTOR-SHARD-${descriptor.ordinal}`;
    for (const vector of readVectorShardFromGenerated(descriptor.logicalPath).vectors) addGraphEdge(edges, shardNode, vector.vectorId, 'CONTAINS');
  }
  for (const permit of permits.permits) addGraphEdge(edges, permit.typeTag, permit.consumerRole, 'CONSUMED-ONLY-BY-NAMEDUSE');
  addGraphEdge(edges, 'LATE-STORAGE-DECISION', 'PRCV5-CTRL-020', 'MANDATORY-LATE-INPUT');
  addGraphEdge(edges, 'PRCV5-MANIFEST-ENVELOPE', 'PRCV5-READER-A-REPORT', 'VERIFIED-BY');
  addGraphEdge(edges, 'PRCV5-MANIFEST-ENVELOPE', 'PRCV5-READER-B-REPORT', 'VERIFIED-BY');
  addGraphEdge(edges, 'PRCV5-READER-A-REPORT', 'PRCV5-DETACHED-ACCEPTANCE', 'REQUIRED-BY-HIGHER-CUT');
  addGraphEdge(edges, 'PRCV5-READER-B-REPORT', 'PRCV5-DETACHED-ACCEPTANCE', 'REQUIRED-BY-HIGHER-CUT');
  addGraphEdge(edges, 'PRCV5-FRESH-INDEPENDENT-REVIEW', 'PRCV5-DETACHED-ACCEPTANCE', 'REQUIRED-BY-HIGHER-CUT');
  nodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  assert(new Set(nodes.map((node) => node.nodeId)).size === nodes.length, 'duplicate graph node');
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  assert(edges.every((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)), 'dangling graph edge');
  assert(new Set(edges.map((edge) => `${edge.from}\0${edge.to}\0${edge.relation}`)).size === edges.length, 'duplicate graph relation');
  const nodeClassCounts = Object.fromEntries([...new Set(nodes.map((node) => node.nodeClass))].sort().map((nodeClass) => [nodeClass, nodes.filter((node) => node.nodeClass === nodeClass).length]));
  const edgeClassCounts = Object.fromEntries([...new Set(edges.map((edge) => edge.relation))].sort().map((relation) => [relation, edges.filter((edge) => edge.relation === relation).length]));
  const graph = {
    artifactId: 'CONNECT-PRCV5-CAUSAL-GRAPH-2026-08-30',
    schemaVersion: 'PRCV5-CAUSAL-GRAPH-V1',
    artifactClass: 'DERIVED-CAUSAL-GRAPH;COUNTERS-FROM-ARRAYS;NOT-AUTHORITY;NOT-ACCEPTANCE',
    nodes,
    edges,
    nodeClassCounts,
    edgeClassCounts,
    invariants: { nodes: nodes.length, edges: edges.length, requirementEdges: closures.requirementEdges.length, closureVectorEdges: closures.records.reduce((sum, row) => sum + row.vectorIds.length, 0), vectorResultEdges: vectorRecords.length, danglingEdges: 0, duplicateNodes: 0, duplicateRelations: 0 },
    nodesRoot: root('PRCV5-CAUSAL-GRAPH-NODES-V1', nodes),
    edgesRoot: root('PRCV5-CAUSAL-GRAPH-EDGES-V1', edges),
    derivationInputs: { inputManifestRoot: inputs.inputManifestRoot, closureRegistryRoot: closures.closureRegistryRoot, schemaRegistryRoot: schemas.schemaRegistryRoot, authorityRegistryRoot: authority.authorityRegistryRoot, permitRegistryRoot: permits.permitRegistryRoot, vectorCorpusRoot: vectorIndex.corpusRoot },
  };
  return typedRoot('PRCV5-CAUSAL-GRAPH-V1', graph, 'graphRoot');
}

let generatedShardFilesForGraph = new Map();
function readVectorShardFromGenerated(logicalPath) {
  const content = generatedShardFilesForGraph.get(logicalPath);
  assert(content, `missing generated shard ${logicalPath}`);
  return JSON.parse(content);
}

function buildSubject(counts) {
  return `# 1. Connect — Public Repository and Cyber Hardening v5 immutable planning successor

## 1.1 Identity and claim boundary

1.1.1 \`artifactId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-SUCCESSOR-REQUIREMENTS-V5-2026-08-30\`.

1.1.2 \`artifactClass=PLANNING-ONLY;IMMUTABLE-SUCCESSOR-CANDIDATE;NOT-INDEPENDENT-REVIEW;NOT-ACCEPTANCE;NOT-PERMIT;NOT-OPERATIONAL-EVIDENCE\`.

1.1.3 The active Finding denominator is exactly \`${counts.findings}=${counts.inheritedFindings}+${counts.newFindings}\`. Every identity, noMergeKey, Requirement mapping, output, atomic predicate, vector set and residual state remains separate.

1.1.4 The exact late-decision bytes are admitted by content ID \`sha256:${FROZEN.lateDecision}\`; all \`${counts.lateDecisionClauses}\` numbered clauses have one forward and inverse reconciliation row.

1.1.5 No predecessor, Review, Findings Manifest, decision, Product, Git, GitHub or provider byte/state was mutated by this planning build.

## 2. Normative package model

2.1 The frozen input manifest contains content-addressed repo-relative references only. Physical source-byte duplication inside v5 is zero.

2.2 The closure registry contains \`${counts.findings}\` records: \`${counts.inheritedFindings}\` inherited open identities and \`${counts.newFindings}\` new hostile-review identities with \`${counts.remediationControls}\` distinct remediation controls. Range, Alias, merge, waiver, suppression and shared vector credit are forbidden.

2.3 The schema registry closes \`${counts.outputFamilies}\` output families and \`${counts.nestedTypes}\` nested types. Its versioned validator language is total for all declared operators and types; unknown operators, types, paths and fields terminate \`BLOCK\`.

2.4 RawSha256Checksum is transport integrity over exact bytes. TypedIdentityRoot is domain-separated identity over canonical JSON. They are non-substitutable types.

2.5 External Genesis, sole-producer appointments, expected-empty/current heads, complete controller/implementation/work/ledger/authority-owner separation and independent Recovery are materialized as non-authoritative planning witnesses. Actual authority remains missing and blocking.

2.6 The lifecycle registry executes a 15-step atomic CAS reducer over issue, consume, revoke, expire, failure-before-write, failure-after-write, response loss and authoritative readback. Only the atomic commit changes head, fence, one-use ledger, effect, event and outbox together.

2.7 GitHub Control Plane, Public Push, Deployment and Release Permits have distinct schemas, domains, issuer/consumer/reader roles and NamedUses. The complete 4x4 matrix admits four same-class planning presentations and rejects twelve cross-class presentations.

2.8 The repository visibility invariant is \`PUBLIC\` before, during and after every allowed operation. A missing pre/post trusted receipt or any \`PRIVATE\` observation blocks. The current point-in-time observation remains PUBLIC; no continuous or operational receipt is claimed.

2.9 Two scanners and a separate adjudicator have disjoint engine, ruleset, implementation, work, ledger and authority-owner roots on one exact byte cut. Actual scanner receipts are missing and block every Public Permit.

2.10 Every Regular Git member must have actual raw bytes \`<52428800\`. Repository-total, transaction-growth and clean-clone budgets remain missing and blocking. External store selection and lifecycle evidence remain \`MISSING-BLOCKING\`.

2.11 The vector corpus is generator-first, ordered by vectorId, deterministically sharded into \`${counts.shards}\` members, and reconstructed from \`${counts.vectors}\` vector roots. Expected terminals are comparison-only and never feed evaluators.

2.12 The causal graph contains \`${counts.graphNodes}\` derived nodes and \`${counts.graphEdges}\` derived edges; every counter is recomputed from the physical arrays.

## 3. Current disposition

3.1 Mechanical Readers may report package parity only. They are not Reviewers and cannot emit closure or Acceptance credit.

3.2 \`Acceptance=0\`; \`acceptedFindings=0/${counts.findings}\`; \`GitHubControlPlanePermit=ABSENT\`; \`PublicPushPermit=ABSENT\`; \`DeploymentPermit=ABSENT\`; \`ReleasePermit=ABSENT\`.

3.3 \`repositoryVisibility=PUBLIC\`; \`Gate29=BLOCKED\`; \`developmentFreeze=ACTIVE\`.

3.4 Fresh independent hostile review of all ${counts.findings} identities and all ${counts.newFindings} new remediation controls is mandatory before any closure or Acceptance claim.
`;
}

function generatedFileFact(logicalPath, content, ordinal, role) {
  const bytes = Buffer.from(content, 'utf8');
  return { ordinal, role, logicalPath, rawSha256Checksum: shaBytes(bytes), bytes: bytes.length, required: true };
}

function sourceMemberFact(logicalPath, ordinal, role) {
  const bytes = readBytes(logicalPath);
  return { ordinal, role, logicalPath, rawSha256Checksum: shaBytes(bytes), bytes: bytes.length, required: true };
}

function buildAll() {
  const inputs = buildFrozenInputManifest();
  const closures = buildClosures();
  const schemas = buildSchemas();
  const digests = buildDigests();
  const authority = buildAuthority(schemas);
  const lifecycle = buildLifecycle();
  const permits = buildPermits();
  const publicFlow = buildPublicFlow(inputs, authority);
  const vectors = buildVectors(closures, schemas, lifecycle, permits, authority, publicFlow, digests);
  const sharded = shardVectors(vectors);
  generatedShardFilesForGraph = sharded.files;
  const vectorIndex = buildVectorIndex(vectors, sharded.descriptors);
  const publication = buildPublication(sharded.descriptors);
  const graph = buildGraph(inputs, closures, schemas, authority, permits, vectorIndex, sharded.descriptors);
  const counts = { findings: closures.records.length, inheritedFindings: closures.denominators.inheritedFindings, newFindings: closures.denominators.newFindings, remediationControls: closures.remediationControls.length, lateDecisionClauses: publication.lateDecisionReconciliation.length, outputFamilies: schemas.outputFamilies.length, nestedTypes: schemas.nestedSchemas.length, vectors: vectors.length, shards: sharded.descriptors.length, graphNodes: graph.nodes.length, graphEdges: graph.edges.length };
  const subject = buildSubject(counts);
  const generated = new Map([
    [P.subject, subject],
    [P.inputs, pretty(inputs)],
    [P.closures, pretty(closures)],
    [P.schemas, pretty(schemas)],
    [P.digests, pretty(digests)],
    [P.authority, pretty(authority)],
    [P.lifecycle, pretty(lifecycle)],
    [P.permits, pretty(permits)],
    [P.publicFlow, pretty(publicFlow)],
    [P.publication, pretty(publication)],
    [P.vectorIndex, pretty(vectorIndex)],
    ...sharded.files,
    [P.graph, pretty(graph)],
  ]);
  const roleByPath = new Map([
    [P.subject, 'V5-SUBJECT'], [P.inputs, 'V5-FROZEN-INPUT-MANIFEST'], [P.closures, 'V5-FINDING-IDENTITY-AND-CLOSURE-REGISTRY'], [P.schemas, 'V5-CLOSED-SCHEMA-AND-TYPE-REGISTRY'], [P.digests, 'V5-CANONICAL-DIGEST-AND-SERIALIZATION-REGISTRY'], [P.authority, 'V5-PRODUCER-AUTHORITY-AND-SEPARATION-GRAPH'], [P.lifecycle, 'V5-LIFECYCLE-CAS-AND-RECOVERY-REGISTRY'], [P.permits, 'V5-FOUR-PERMIT-REGISTRY'], [P.publicFlow, 'V5-PUBLIC-INFORMATION-FLOW-AND-SCANNER-REGISTRY'], [P.publication, 'V5-PUBLICATION-SIZE-SHARD-AND-STORAGE-REGISTRY'], [P.vectorIndex, 'V5-EXECUTABLE-CAUSAL-VECTOR-CORPUS-INDEX'], [P.graph, 'V5-CAUSAL-GRAPH'], [P.generator, 'V5-DETERMINISTIC-GENERATOR'], [P.readerA, 'V5-READ-ONLY-READER-A'], [P.readerB, 'V5-READ-ONLY-READER-B'],
  ]);
  for (const descriptor of sharded.descriptors) roleByPath.set(descriptor.logicalPath, 'V5-EXECUTABLE-CAUSAL-VECTOR-SHARD');
  const orderedPaths = [P.subject, P.inputs, P.closures, P.schemas, P.digests, P.authority, P.lifecycle, P.permits, P.publicFlow, P.publication, P.vectorIndex, ...sharded.descriptors.map((row) => row.logicalPath), P.graph, P.generator, P.readerA, P.readerB];
  const members = orderedPaths.map((logicalPath, index) => generated.has(logicalPath) ? generatedFileFact(logicalPath, generated.get(logicalPath), index + 1, roleByPath.get(logicalPath)) : sourceMemberFact(logicalPath, index + 1, roleByPath.get(logicalPath)));
  const packageProjection = members.map(({ ordinal, role, logicalPath, rawSha256Checksum, bytes, required }) => ({ ordinal, role, logicalPath, rawSha256Checksum, bytes, required }));
  const packageContentRoot = root('PRCV5-PACKAGE-CONTENT-ROOT-V1', packageProjection);
  const manifest = {
    artifactId: 'CONNECT-PRCV5-ATOMIC-PACKAGE-MANIFEST-2026-08-30',
    schemaVersion: 'PRCV5-ATOMIC-PACKAGE-MANIFEST-V1',
    artifactClass: 'EXTERNAL-CYCLE-FREE-PACKAGE-ENVELOPE;NOT-A-MEMBER;NOT-REVIEW;NOT-ACCEPTANCE',
    repositoryBinding: { logicalId: 'github.com/talstilkol/connect', visibility: 'PUBLIC', logicalRepositoryRoot: 'PUBLIC-REPOSITORY-ROOT;ALL-PUBLIC-LOCATORS-REPO-RELATIVE' },
    rootAlgorithm: { digest: 'SHA-256', domain: 'PRCV5-PACKAGE-CONTENT-ROOT-V1', normalization: 'NONE-FOR-RAW-FILE-CHECKSUMS', serialization: 'CANONICAL-JSON-OBJECT-KEYS-ASCENDING-ARRAY-ORDER-PRESERVED-SAFE-INTEGERS', ordering: 'MEMBER-ORDINAL-ASCENDING', includedFields: ['ordinal', 'role', 'logicalPath', 'rawSha256Checksum', 'bytes', 'required'], excludedFields: ['manifest bytes', 'detached reports', 'Producer QA', 'independent Review', 'Acceptance'], separator: 'DOMAIN-LF-CANONICAL-JSON' },
    members,
    packageContentRoot,
    packageMemberCount: members.length,
    semanticRoots: { inputManifestRoot: inputs.inputManifestRoot, closureRegistryRoot: closures.closureRegistryRoot, schemaRegistryRoot: schemas.schemaRegistryRoot, digestRegistryRoot: digests.digestRegistryRoot, authorityRegistryRoot: authority.authorityRegistryRoot, lifecycleRegistryRoot: lifecycle.lifecycleRegistryRoot, permitRegistryRoot: permits.permitRegistryRoot, publicFlowRegistryRoot: publicFlow.publicFlowRegistryRoot, publicationRegistryRoot: publication.publicationRegistryRoot, vectorCorpusRoot: vectorIndex.corpusRoot, vectorIndexRoot: vectorIndex.vectorIndexRoot, graphRoot: graph.graphRoot },
    denominators: { ...counts, packageMembers: members.length, sourceReferences: inputs.sourceRecords.length, sourceByteDuplicates: 0, aliases: closures.aliasProjections.length, requirementEdges: closures.requirementEdges.length, primitiveTypes: schemas.primitiveDefinitions.length, schemaInstances: schemas.admittedInstances.length, permitTypes: permits.permits.length, permitMatrixCells: permits.crossUseMatrix.length, permitCrossClassDenials: permits.matrixDenominators.crossClassDenials, readers: authority.readerProfiles.length, membersAtOrAbove50MiB: members.filter((member) => member.bytes >= MAX_MEMBER_BYTES_EXCLUSIVE).length },
    detachedCompanions: { readerAReport: P.reportA, readerBReport: P.reportB, producerQa: P.producerQa, independentReview: 'REQUIRED-NOT-YET-MATERIALIZED', acceptance: 'ABSENT' },
    currentDisposition: { acceptance: 0, acceptedFindings: 0, totalFindings: 116, GitHubControlPlanePermit: 'ABSENT', PublicPushPermit: 'ABSENT', DeploymentPermit: 'ABSENT', ReleasePermit: 'ABSENT', repositoryVisibility: 'PUBLIC', gate29: 'BLOCKED', developmentFreeze: 'ACTIVE' },
    unresolvedBlocking: ['B0-AND-TAL-AUTHORITY', 'TRUSTED-TIME', 'OPERATIONAL-SCANNER-RECEIPTS', 'PRE-POST-TRUSTED-VISIBILITY-RECEIPTS', 'REPOSITORY-TOTAL-GROWTH-CLONE-BUDGETS', 'SELECTED-EXTERNAL-STORE-CONTRACT', 'FRESH-INDEPENDENT-HOSTILE-REVIEW', 'DETACHED-ACCEPTANCE'],
    noSelfAcceptance: true,
    acceptanceCredit: 0,
  };
  generated.set(P.manifest, pretty(manifest));
  return { generated, manifest, inputs, closures, schemas, digests, authority, lifecycle, permits, publicFlow, publication, vectorIndex, vectors, graph, counts };
}

function verifyGenerated(build) {
  const expectedPaths = new Set(build.generated.keys());
  const shardPrefix = 'public-repository-and-cyber-hardening-successor-requirements-v5-executable-causal-vector-corpus-shard-';
  const physicalShards = fs.readdirSync('docs/planning').filter((name) => name.startsWith(shardPrefix)).map((name) => `docs/planning/${name}`);
  for (const path of physicalShards) assert(expectedPaths.has(path), `unexpected stale shard ${path}`);
  const mismatches = [];
  for (const [logicalPath, content] of build.generated) {
    if (!fs.existsSync(logicalPath) || !readBytes(logicalPath).equals(Buffer.from(content, 'utf8'))) mismatches.push(logicalPath);
  }
  return { verdict: mismatches.length === 0 ? 'PASS' : 'BLOCK', mismatches, generatedArtifactCount: build.generated.size, packageContentRoot: build.manifest.packageContentRoot, denominators: build.manifest.denominators };
}

function buildProducerQa(build) {
  assert(fs.existsSync(P.reportA) && fs.existsSync(P.reportB), 'detached reader reports missing');
  const reportA = readJson(P.reportA);
  const reportB = readJson(P.reportB);
  const manifestSha256 = shaBytes(readBytes(P.manifest));
  const qaEnvelope = {
    artifactId: 'CONNECT-PRCV5-PRODUCER-QA-2026-08-30',
    schemaVersion: 'PRCV5-PRODUCER-QA-V1',
    artifactClass: 'DETACHED-PRODUCER-MECHANICAL-QA;NOT-INDEPENDENT-REVIEW;NOT-ACCEPTANCE;NOT-PERMIT',
    manifest: { logicalPath: P.manifest, rawSha256Checksum: manifestSha256, packageContentRoot: build.manifest.packageContentRoot },
    readerReports: [P.reportA, P.reportB].map((logicalPath, index) => { const report = index === 0 ? reportA : reportB; const fact = fileFact(logicalPath); return { readerId: report.readerId, logicalPath, contentId: fact.contentId, bytes: fact.bytes, reportRoot: report.reportRoot, verdict: report.verdict }; }),
    detachedMechanicalEnvelope: { manifestSha256, packageContentRoot: build.manifest.packageContentRoot, reportRoots: [reportA.reportRoot, reportB.reportRoot], expectedAcceptanceHead: null, state: 'MECHANICAL-CANDIDATE-ONLY' },
    counters: build.manifest.denominators,
    mechanicalVerdict: reportA.verdict === 'PASS' && reportB.verdict === 'PASS' && reportA.packageContentRoot === reportB.packageContentRoot && reportA.packageContentRoot === build.manifest.packageContentRoot ? 'PASS' : 'BLOCK',
    generatorByteIdentityVerification: verifyGenerated(build),
    predecessorVerification: { v4SubjectSha256: shaBytes(readBytes(I.v4Subject)), v4ManifestSha256: shaBytes(readBytes(I.v4Manifest)), v4PackageRoot: build.inputs.v4PackageVerification.independentlyRecomputedPackageRoot, reviewSha256: shaBytes(readBytes(I.review)), findingsSha256: shaBytes(readBytes(I.findings)), lateDecisionSha256: shaBytes(readBytes(I.lateDecision)), terminal: 'PASS' },
    currentDisposition: build.manifest.currentDisposition,
    residualLimits: build.manifest.unresolvedBlocking,
    independentReviewState: 'REQUIRED-NOT-PERFORMED-BY-PRODUCER',
    acceptanceCredit: 0,
  };
  return typedRoot('PRCV5-PRODUCER-QA-V1', qaEnvelope, 'producerQaRoot');
}

const mode = process.argv[2] ?? '--verify';
const build = buildAll();
if (mode === '--emit-patch') emitPatch(build.generated);
else if (mode === '--verify') process.stdout.write(`${JSON.stringify(verifyGenerated(build), null, 2)}\n`);
else if (mode === '--emit-qa-patch') emitPatch(new Map([[P.producerQa, pretty(buildProducerQa(build))]]));
else if (mode === '--summary') process.stdout.write(`${JSON.stringify({ packageContentRoot: build.manifest.packageContentRoot, counts: build.counts, artifacts: [...build.generated.keys()] }, null, 2)}\n`);
else throw new Error(`unknown mode ${mode}`);
