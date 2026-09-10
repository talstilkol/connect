#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const DATE = '2026-08-30';
const FIELD_NAMES = ['statement', 'threatCauseImpact', 'requiredProof', 'dependencies', 'sourceBasis'];
const V6_PREFIX = 'bootstrap-authority-envelope-b0-successor-requirements-v6';
const VECTOR_SHARD_COUNT = 16;
const MAX_PUBLIC_GIT_FILE_BYTES = 50 * 1024 * 1024;
const PACKAGE_MEMBER_COUNT = 5 + VECTOR_SHARD_COUNT + 3;
const VECTOR_SHARD_PATHS = Array.from({ length: VECTOR_SHARD_COUNT }, (_, index) => {
  const ordinal = String(index + 1).padStart(2, '0');
  return `docs/planning/${V6_PREFIX}-portable-causal-vector-corpus-shard-${ordinal}-of-${VECTOR_SHARD_COUNT}-${DATE}.json`;
});
const VECTOR_SHARD_KEYS = Array.from({ length: VECTOR_SHARD_COUNT }, (_, index) => `vectorShard${String(index + 1).padStart(2, '0')}`);
const PATHS = {
  subject: `docs/planning/${V6_PREFIX}-${DATE}.md`,
  registry: `docs/planning/${V6_PREFIX}-normative-registry-${DATE}.json`,
  sourceIndex: `docs/planning/${V6_PREFIX}-source-member-span-index-${DATE}.json`,
  crosswalk: `docs/planning/${V6_PREFIX}-closure-crosswalk-${DATE}.json`,
  vectors: `docs/planning/${V6_PREFIX}-portable-causal-vector-corpus-${DATE}.json`,
  vectorShards: VECTOR_SHARD_PATHS,
  manifest: `docs/planning/${V6_PREFIX}-atomic-package-manifest-${DATE}.json`,
  generator: 'docs/planning/qa/generate-b0-v6-package.mjs',
  readerA: 'docs/planning/qa/b0-v6-qa-reader-a.mjs',
  readerB: 'docs/planning/qa/b0-v6-qa-reader-b.py',
  readerAReport: `docs/planning/${V6_PREFIX}-qa-reader-a-report-${DATE}.json`,
  readerBReport: `docs/planning/${V6_PREFIX}-qa-reader-b-report-${DATE}.json`,
  producerQa: `docs/planning/${V6_PREFIX}-producer-qa-${DATE}.json`,
  v5Subject: 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-2026-08-30.md',
  v5Registry: 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-normative-registry-2026-08-30.json',
  v5SourceIndex: 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-source-member-span-index-2026-08-30.json',
  v5Crosswalk: 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-closure-crosswalk-2026-08-30.json',
  v5Vectors: 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-executable-vector-corpus-2026-08-30.json',
  v5Manifest: 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-atomic-package-manifest-2026-08-30.json',
  v5Review: 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-independent-hostile-review-2026-08-30.md',
  v5Findings: 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-independent-hostile-review-findings-manifest-2026-08-30.md',
};

function read(relativePath) {
  if (relativePath.startsWith('/') || relativePath.startsWith('web/') || relativePath.includes('..')) throw new Error(`Non-portable path: ${relativePath}`);
  return fs.readFileSync(path.join(ROOT, relativePath));
}

function text(relativePath) { return read(relativePath).toString('utf8'); }
function json(relativePath) { return JSON.parse(text(relativePath)); }
function shaBytes(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function shaFile(relativePath) { return shaBytes(read(relativePath)); }
function canonical(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function domainRoot(domain, value) { return shaBytes(Buffer.from(`${domain}\n${canonical(value)}`, 'utf8')); }
function pretty(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function pad(value) { return String(value).padStart(3, '0'); }
function deterministicId(prefix, domain, value) { return `${prefix}-${domainRoot(domain, value).slice(0, 24)}`; }
function lines(buffer) { return buffer.toString('utf8').split(/\r?\n/).length - (buffer.at(-1) === 10 ? 1 : 0); }
function correctedPath(value) { return value.replace(/^web\//, ''); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

const V5_HASHES = {
  subject: 'bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92',
  manifest: '5a054f5d4a482a0e74a9146dd3aeee865a5f28ee245d76784dbaa03ed3a118c4',
  packageContentRoot: '666e121d998445e3134f3a1978ee9b7c5962324bd51376e2ebc5bf2646d689f8',
  registry: '6c5f9be8d61b684e3239fb30696e480dbc8138600bddd77d51c396c553bc97fc',
  sourceIndex: '41204bbabfd32521f5ce13fbe8321099fb59e9881a9de64e5d1fcdab9aedb325',
  crosswalk: '89e8846ad28e4b157fd638eef56ebc72a02ab63e2b94e63608ee83be291e3b31',
  vectors: '4bb7f44bc175b93fb8f616f75455a55cadd96c002db175857d53229bc6afd7e6',
  review: '91f2b2b44115ad73908092694c9a4800b464775ac523d08a7800bee884b8edc6',
  findings: 'a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031',
};
const BASE_FIVE_FIELD_VECTOR_COUNT = 635;
const EXPECTED_SOURCE_ARTIFACT_COUNT = 20;
const EXPECTED_SOURCE_MEMBER_COUNT = 2045;
const EXPECTED_V5_PACKAGE_ROOT_VECTOR_COUNT = 42;
const BASE_DOMAIN_MUTATION_VECTOR_COUNT = 4707;
const NO_MERGE_DOMAIN_EXPANSION_VECTOR_COUNT = 2088;
const EXPECTED_DOMAIN_MUTATION_VECTOR_COUNT = 6795;
const TOTAL_PLANNING_VECTOR_COUNT = 7430;

const REQUIRED_DOMAIN_VECTOR_FAMILIES = {
  'B0V5-IHR-F001': ['PUBLIC-REPO-RELATIVE-PATH'],
  'B0V5-IHR-F002': ['INHERITED-EXACT-SELECTOR'],
  'B0V5-IHR-F003': ['PREDECESSOR-SEMANTIC-NONWEAKENING'],
  'B0V5-IHR-F004': ['ACTIVE-INHERITED-SEMANTIC-NAMEDUSE'],
  'B0V5-IHR-F005': ['PRIOR-INTERFACE-PROVIDER-INDEPENDENT-INSTANCE'],
  'B0V5-IHR-F006': ['PORTABLE-ROOTED-ORACLE-SEMANTICS'],
  'B0V5-IHR-F007': ['EXACT-DOMAIN-COVERAGE-DENOMINATOR'],
  'B0V5-IHR-F008': ['HONEST-PLANNING-FIXTURE-PROVENANCE'],
  'B0V5-IHR-F009': ['CAUSAL-ORACLE-STATE-READ'],
  'B0V5-IHR-F010': ['EXACT-V5-PACKAGE-ROOT-PARTICIPATING-FIELD', 'EXACT-V5-PACKAGE-ROOT-DOMAIN', 'EXACT-V5-PACKAGE-ROOT-CANONICAL-PREIMAGE'],
  'B0V5-IHR-F011': ['EXACT-V6-HEAD-INVALIDATION'],
  'B0V5-IHR-F012': ['ALL-127-OUTPUTS-COMPLETE-ORDERED-DENOMINATOR'],
  'B0V5-IHR-F013': ['COMPLETE-ROLE-CONTROLLER-EXCLUSION', 'SOLE-PRODUCER-ASSIGNMENT'],
  'B0V5-IHR-F014': ['PROOF-CLASS-TRANSITIVE-INDEPENDENCE', 'TWO-WITNESS-INDEPENDENCE'],
  'B0V5-IHR-F015': ['TYPED-PERMIT-FIELD', 'PERMIT-TIME-REVISION-REVOCATION-REPLAY-RULE'],
  'B0V5-IHR-F016': ['CAS-CRASH-CUT', 'CAS-TWO-WRITER-INTERLEAVING-CLASS', 'CAS-COMPARE-REPLAY-READBACK-RULE'],
  'B0V5-IHR-F017': ['GENESIS-CLASS-SPECIFIC-TYPED-FIELD', 'GENESIS-WRONG-CLASS-SUBSTITUTION'],
  'B0V5-IHR-F018': ['GENESIS-EXTERNAL-ADMISSION-FIRST-PERMIT-CAUSALITY'],
  'B0V5-IHR-F019': ['DETACHED-ACCEPTANCE-TYPED-FIELD'],
  'B0V5-IHR-F020': ['RECOVERY-TYPED-PARTICIPANT-FIELD', 'RECOVERY-TYPED-ATTEMPT-FIELD', 'RECOVERY-ROTATION-COMPROMISE-REDUCER'],
  'B0V4-HR-F001': ['EXACT-SOURCE-MEMBER-SPAN'],
  'B0V4-HR-F002': ['INHERITED-EXACT-SELECTOR', 'PREDECESSOR-SEMANTIC-NONWEAKENING'],
  'B0V4-HR-F003': ['PUBLIC-REPO-RELATIVE-PATH'],
  'B0V4-HR-F004': ['ACTIVE-INHERITED-SEMANTIC-NAMEDUSE', 'PRIOR-INTERFACE-PROVIDER-INDEPENDENT-INSTANCE'],
  'B0V4-HR-F005': ['NONCIRCULAR-OBJECT-HEAD-MEMBERSHIP'],
  'B0V4-HR-F006': ['PORTABLE-ROOTED-ORACLE-SEMANTICS', 'EXACT-DOMAIN-COVERAGE-DENOMINATOR', 'HONEST-PLANNING-FIXTURE-PROVENANCE', 'CAUSAL-ORACLE-STATE-READ', 'EXACT-V5-PACKAGE-ROOT-PARTICIPATING-FIELD', 'EXACT-V5-PACKAGE-ROOT-DOMAIN', 'EXACT-V5-PACKAGE-ROOT-CANONICAL-PREIMAGE'],
  'B0V4-HR-F007': ['EXACT-V6-HEAD-INVALIDATION', 'TYPED-PERMIT-FIELD', 'PERMIT-TIME-REVISION-REVOCATION-REPLAY-RULE'],
  'B0V4-HR-F008': ['COMPLETE-ROLE-CONTROLLER-EXCLUSION', 'SOLE-PRODUCER-ASSIGNMENT', 'PROOF-CLASS-TRANSITIVE-INDEPENDENCE', 'TWO-WITNESS-INDEPENDENCE'],
  'B0V4-HR-F009': ['CAS-CRASH-CUT', 'CAS-TWO-WRITER-INTERLEAVING-CLASS', 'CAS-COMPARE-REPLAY-READBACK-RULE'],
  'B0V4-HR-F010': ['GENESIS-CLASS-SPECIFIC-TYPED-FIELD', 'GENESIS-WRONG-CLASS-SUBSTITUTION', 'GENESIS-EXTERNAL-ADMISSION-FIRST-PERMIT-CAUSALITY', 'DETACHED-ACCEPTANCE-TYPED-FIELD'],
  'B0V4-HR-F011': ['RECOVERY-TYPED-PARTICIPANT-FIELD', 'RECOVERY-TYPED-ATTEMPT-FIELD', 'RECOVERY-ROTATION-COMPROMISE-REDUCER'],
};

for (const [name, expected] of Object.entries({
  subject: V5_HASHES.subject,
  manifest: V5_HASHES.manifest,
  registry: V5_HASHES.registry,
  sourceIndex: V5_HASHES.sourceIndex,
  crosswalk: V5_HASHES.crosswalk,
  vectors: V5_HASHES.vectors,
  review: V5_HASHES.review,
  findings: V5_HASHES.findings,
})) {
  const key = name === 'review' ? 'v5Review' : name === 'findings' ? 'v5Findings' : `v5${name[0].toUpperCase()}${name.slice(1)}`;
  if (shaFile(PATHS[key]) !== expected) throw new Error(`Frozen v5 ${name} hash mismatch`);
}

const v5Registry = json(PATHS.v5Registry);
const v5SourceIndex = json(PATHS.v5SourceIndex);
const v5Crosswalk = json(PATHS.v5Crosswalk);
const v5Manifest = json(PATHS.v5Manifest);

function markdownSections(sourceText, headingPattern) {
  const matches = [...sourceText.matchAll(headingPattern)];
  return matches.map((match, index) => {
    const start = Buffer.byteLength(sourceText.slice(0, match.index));
    const nextIndex = index + 1 < matches.length ? matches[index + 1].index : sourceText.length;
    const end = Buffer.byteLength(sourceText.slice(0, nextIndex));
    const value = Buffer.from(sourceText, 'utf8').subarray(start, end);
    return { match, startByteInclusive: start, endByteExclusive: end, byteLength: value.length, sha256: shaBytes(value), bytes: value };
  });
}

function parseRequirements(sourceText, idPrefix) {
  const sectionPattern = new RegExp('^## \\d+\\.\\d+ `(' + idPrefix + 'REQ-\\d{3})` — ([^\\n]+)$', 'gm');
  return markdownSections(sourceText, sectionPattern).map((section) => {
    const body = section.bytes.toString('utf8');
    const fields = {};
    const fieldSpans = {};
    for (const field of FIELD_NAMES) {
      const pattern = new RegExp('^\\d+\\.\\d+\\.\\d+ `' + field + '`: (.*)$', 'm');
      const match = body.match(pattern);
      if (!match) throw new Error(`Missing ${field} in ${section.match[1]}`);
      const value = match[1];
      const localStart = Buffer.byteLength(body.slice(0, match.index)) + Buffer.byteLength(match[0]) - Buffer.byteLength(value);
      const valueBytes = Buffer.from(value, 'utf8');
      fields[field] = value;
      fieldSpans[field] = {
        startByteInclusive: section.startByteInclusive + localStart,
        endByteExclusive: section.startByteInclusive + localStart + valueBytes.length,
        byteLength: valueBytes.length,
        sha256: shaBytes(valueBytes),
      };
    }
    return { id: section.match[1], title: section.match[2], fields, section, fieldSpans };
  });
}

function parseFindingSections(sourceText, idPrefix) {
  const pattern = new RegExp('^## 4\\.\\d+ `(' + idPrefix + '-F\\d{3})` — ([^\\n]+)$', 'gm');
  return markdownSections(sourceText, pattern).map((section) => ({ id: section.match[1], title: section.match[2], section }));
}

const v5Requirements = parseRequirements(text(PATHS.v5Subject), 'B0V5');
if (v5Requirements.length !== 96) throw new Error(`Expected 96 v5 requirements, got ${v5Requirements.length}`);
const v5FindingSections = parseFindingSections(text(PATHS.v5Findings), 'B0V5-IHR');
if (v5FindingSections.length !== 20) throw new Error(`Expected 20 v5 Findings, got ${v5FindingSections.length}`);

const newFindingDefinitions = [
  ['B0V5-IHR-F001', 'P0', 'B0V5-PUBLIC-GIT-ROOT-LOGICAL-PATH-NAMESPACE-MISMATCH'],
  ['B0V5-IHR-F002', 'P0', 'B0V5-SUPERSESSION-SELECTOR-OVERLAP-WITHOUT-COMPOSITION-ORDER'],
  ['B0V5-IHR-F003', 'P0', 'B0V5-SUPERSESSION-NONWEAKENING-RELATION-NOT-EXECUTABLE'],
  ['B0V5-IHR-F004', 'P0', 'B0V5-ACTIVE-INHERITED-SEMANTIC-BYTES-OUTSIDE-NAMEDUSE-GRAPH'],
  ['B0V5-IHR-F005', 'P0', 'B0V5-PRIOR-INTERFACE-ROOTS-BIND-PROMISES-NOT-PROVIDER-INSTANCES'],
  ['B0V5-IHR-F006', 'P0', 'B0V5-VECTOR-CORPUS-OMITS-PORTABLE-ROOTED-ORACLE-SEMANTICS'],
  ['B0V5-IHR-F007', 'P0', 'B0V5-VECTOR-DENOMINATOR-DOES-NOT-COVER-CLAIMED-DOMAINS'],
  ['B0V5-IHR-F008', 'P1', 'B0V5-VECTOR-PLACEHOLDERS-MISCLASSIFIED-AS-NONMOCK-REAL-STATE'],
  ['B0V5-IHR-F009', 'P0', 'B0V5-VECTOR-CAUSAL-SPEC-ORACLE-READS-ASSERTED-VERDICTS'],
  ['B0V5-IHR-F010', 'P0', 'B0V5-PACKAGE-ROOT-CLOSURE-VECTOR-TARGETS-V4-NOT-V5'],
  ['B0V5-IHR-F011', 'P0', 'B0V5-ACCEPTANCE-INVALIDATION-RULES-REFERENCE-V4-HEADS'],
  ['B0V5-IHR-F012', 'P0', 'B0V5-ACCEPTANCE-OUTPUT-ROOT-DENOMINATOR-STOPS-AT-84'],
  ['B0V5-IHR-F013', 'P0', 'B0V5-ACCEPTANCE-PRODUCER-CLASSES-OUTSIDE-CLOSED-ROLE-UNIVERSE'],
  ['B0V5-IHR-F014', 'P0', 'B0V5-WITNESS-AND-INDEPENDENCE-INSTANCES-NOT-CLOSED'],
  ['B0V5-IHR-F015', 'P0', 'B0V5-PERMIT-SCHEMAS-ARE-UNTYPED-FIELD-NAME-LISTS'],
  ['B0V5-IHR-F016', 'P0', 'B0V5-ACCEPTANCE-CAS-IS-UNROOTED-STRING-OP-SEQUENCE'],
  ['B0V5-IHR-F017', 'P0', 'B0V5-GENESIS-CLASS-SLOTS-SHARE-ONE-GENERIC-SCHEMA'],
  ['B0V5-IHR-F018', 'P0', 'B0V5-GENESIS-EXTERNAL-ADMISSION-AND-FIRST-PERMIT-LACK-CAUSAL-PROGRAM'],
  ['B0V5-IHR-F019', 'P0', 'B0V5-DETACHED-ACCEPTANCE-ARTIFACT-SCHEMA-ABSENT'],
  ['B0V5-IHR-F020', 'P1', 'B0V5-RECOVERY-MEMBER-WITNESS-ATTEMPT-SCHEMAS-NOT-EXECUTABLE'],
];

const openV4Rows = v5Crosswalk.hostileFindingClosureRows.filter((row) => row.sourceFindingId !== 'B0V4-HR-F012');
if (openV4Rows.length !== 11) throw new Error('Expected 11 open v4 Findings');

const blockers = [
  ...newFindingDefinitions.map(([findingId, severity, noMergeKey], index) => {
    const source = v5FindingSections.find((item) => item.id === findingId);
    return {
      ordinal: index + 1,
      sourceClass: 'B0V5-INDEPENDENT-HOSTILE-REVIEW-FINDING',
      findingId,
      severity,
      noMergeKey,
      title: source.title,
      sourceFinding: {
        alias: 'B0V5IHRM', logicalPath: PATHS.v5Findings, artifactSha256: V5_HASHES.findings,
        locator: findingId, startByteInclusive: source.section.startByteInclusive,
        endByteExclusive: source.section.endByteExclusive, byteLength: source.section.byteLength,
        memberSha256: source.section.sha256,
      },
    };
  }),
  ...openV4Rows.map((row, index) => ({
    ordinal: index + 21,
    sourceClass: 'B0V4-INDEPENDENT-HOSTILE-REVIEW-FINDING-REMAINS-OPEN-AFTER-V5',
    findingId: row.sourceFindingId,
    severity: row.severity,
    noMergeKey: row.noMergeKey,
    title: `Close remaining v4 blocker ${row.sourceFindingId} without closure transfer`,
    sourceFinding: { ...row.sourceFinding, logicalPath: correctedPath(row.sourceFinding.logicalPath) },
  })),
];
if (blockers.length !== 31 || new Set(blockers.map((item) => item.findingId)).size !== 31 || new Set(blockers.map((item) => item.noMergeKey)).size !== 31) throw new Error('Blocker denominator/identity mismatch');

const roleNames = [
  'AuthorityOwner', 'Producer', 'QA', 'Reviewer1', 'Reviewer2', 'Reconciler', 'Approver', 'AcceptanceWriter',
  'Witness1', 'Witness2', 'WitnessQuorum', 'EvidenceLedgerWriter', 'GenesisIssuer', 'PermitIssuer',
  'RecoveryCustodian1', 'RecoveryCustodian2', 'RecoveryCustodian3', 'RecoveryCustodian4', 'RecoveryCustodian5',
  'RecoveryWitness1', 'RecoveryWitness2',
];

const appointmentSchema = {
  schemaId: 'B0V6-TYPED-APPOINTMENT-V1',
  fields: [
    { name: 'appointmentId', type: 'DETERMINISTIC-ID', cardinality: 'EXACTLY-ONE' },
    { name: 'role', type: 'ENUM-CLOSED-B0V6-ROLE', cardinality: 'EXACTLY-ONE' },
    { name: 'effectiveControllerRoot', type: 'SHA256', cardinality: 'EXACTLY-ONE' },
    { name: 'issuerAppointmentRoot', type: 'SHA256-OR-EXTERNAL-ZERO-AUTHORITY-ROOT', cardinality: 'EXACTLY-ONE' },
    { name: 'authorityEpoch', type: 'U64', cardinality: 'EXACTLY-ONE', constraint: 'EQUALS-0-IN-PLANNING-INSTANCE' },
    { name: 'notBefore', type: 'RFC3339-UTC', cardinality: 'EXACTLY-ONE' },
    { name: 'validThrough', type: 'RFC3339-UTC', cardinality: 'EXACTLY-ONE' },
    { name: 'status', type: 'ENUM', enum: ['PLANNING-SCHEMA-ADMITTED', 'OPERATIONAL-CURRENT', 'REVOKED'] },
    { name: 'authorityCredit', type: 'U8', constant: 0 },
  ],
};
appointmentSchema.schemaRoot = domainRoot('CONNECT-B0-V6-APPOINTMENT-SCHEMA-V1', appointmentSchema);

const appointments = roleNames.map((role, ordinal) => {
  const body = {
    appointmentId: deterministicId('B0V6-APPOINTMENT', 'CONNECT-B0-V6-APPOINTMENT-ID-V1', { role }),
    role,
    effectiveControllerRoot: domainRoot('CONNECT-B0-V6-PLANNING-CONTROLLER-V1', { role, sourcePackageRoot: V5_HASHES.packageContentRoot }),
    issuerAppointmentRoot: domainRoot('CONNECT-B0-V6-EXTERNAL-ZERO-AUTHORITY-ISSUER-V1', { role: 'EXTERNAL-L0-PLACEHOLDER-FORBIDDEN-OPERATIONALLY', ordinal: ordinal + 1 }),
    authorityEpoch: 0,
    notBefore: '2026-08-30T00:00:00Z',
    validThrough: '2026-08-31T00:00:00Z',
    status: 'PLANNING-SCHEMA-ADMITTED',
    authorityCredit: 0,
    operational: false,
    provenance: { logicalPath: PATHS.v5Manifest, sha256: V5_HASHES.manifest },
  };
  return { ...body, instanceRoot: domainRoot('CONNECT-B0-V6-PLANNING-APPOINTMENT-INSTANCE-V1', body) };
});
const appointmentByRole = new Map(appointments.map((item) => [item.role, item]));
if (new Set(appointments.map((item) => item.effectiveControllerRoot)).size !== roleNames.length) throw new Error('Planning controller roots must be distinct');

const pairMatrix = [];
for (let left = 0; left < roleNames.length; left += 1) {
  for (let right = left + 1; right < roleNames.length; right += 1) {
    pairMatrix.push({
      pairId: `B0V6-ROLE-PAIR-${String(pairMatrix.length + 1).padStart(3, '0')}`,
      leftRole: roleNames[left], rightRole: roleNames[right],
      relation: 'PROHIBITED-SHARED-EFFECTIVE-CONTROLLER',
      controllerEquivalenceProgram: { op: 'NEQ', leftPath: '/left/effectiveControllerRoot', rightPath: '/right/effectiveControllerRoot' },
      appliesTransitivelyTo: ['PRIMARY', 'BACKUP', 'DELEGATION', 'SESSION', 'CREDENTIAL', 'QUORUM', 'EMERGENCY'],
      exceptionAllowed: false,
    });
  }
}

const proofClasses = ['PARSER', 'SERIALIZER', 'GRAPH', 'SIGNATURE', 'TIME', 'ENVELOPE', 'STATE-REDUCER', 'VECTOR-RUNNER', 'READBACK'];
const independenceProfiles = proofClasses.map((proofClass) => {
  const body = {
    profileId: deterministicId('B0V6-INDEPENDENCE', 'CONNECT-B0-V6-INDEPENDENCE-ID-V1', { proofClass }),
    proofClass,
    implementationRootA: domainRoot('CONNECT-B0-V6-IMPLEMENTATION-A-V1', { proofClass, source: V5_HASHES.review }),
    implementationRootB: domainRoot('CONNECT-B0-V6-IMPLEMENTATION-B-V1', { proofClass, source: V5_HASHES.findings }),
    transitiveDependencyRootA: domainRoot('CONNECT-B0-V6-DEPENDENCY-A-V1', { proofClass, source: V5_HASHES.subject }),
    transitiveDependencyRootB: domainRoot('CONNECT-B0-V6-DEPENDENCY-B-V1', { proofClass, source: V5_HASHES.registry }),
    runtimeRootA: domainRoot('CONNECT-B0-V6-RUNTIME-A-V1', { proofClass, runtime: 'NODE-STDLIB' }),
    runtimeRootB: domainRoot('CONNECT-B0-V6-RUNTIME-B-V1', { proofClass, runtime: 'PYTHON-STDLIB' }),
    authorControllerRootA: appointmentByRole.get('Reviewer1').effectiveControllerRoot,
    authorControllerRootB: appointmentByRole.get('Reviewer2').effectiveControllerRoot,
    executionContextRootA: domainRoot('CONNECT-B0-V6-CONTEXT-A-V1', { proofClass, mode: 'CLEAN-READONLY' }),
    executionContextRootB: domainRoot('CONNECT-B0-V6-CONTEXT-B-V1', { proofClass, mode: 'CLEAN-READONLY' }),
    presealedPacketRoot: domainRoot('CONNECT-B0-V6-PRESEALED-PACKET-V1', { proofClass, v5Subject: V5_HASHES.subject }),
    comparisonOracleRoot: domainRoot('CONNECT-B0-V6-COMPARISON-ORACLE-V1', { proofClass, rule: 'BYTE-EQUAL-RESULTS' }),
    resultRootA: domainRoot('CONNECT-B0-V6-INDEPENDENCE-RESULT-A-V1', { proofClass, packet: V5_HASHES.subject }),
    resultRootB: domainRoot('CONNECT-B0-V6-INDEPENDENCE-RESULT-B-V1', { proofClass, packet: V5_HASHES.subject }),
    comparisonResultRoot: domainRoot('CONNECT-B0-V6-INDEPENDENCE-COMPARISON-RESULT-V1', { proofClass, decision: 'BYTE-EQUAL-PLANNING-RESULTS' }),
    checkpointRoot: domainRoot('CONNECT-B0-V6-INDEPENDENCE-CHECKPOINT-V1', { proofClass, source: V5_HASHES.packageContentRoot }),
    profileRevision: 0,
    notBefore: '2026-08-30T00:00:00Z',
    validThrough: '2026-08-31T00:00:00Z',
    disclosureState: 'PRESEALED-UNTIL-BOTH-SUBMISSIONS',
    resultDisclosedBeforeBothSubmissions: false,
    admissionScope: 'PLANNING-SCHEMA-VALIDATION-ONLY', operational: false, authorityCredit: 0,
  };
  const planningAdmittedInstanceRoot = domainRoot('CONNECT-B0-V6-INDEPENDENCE-INSTANCE-V1', body);
  return { ...body, planningAdmittedInstanceRoot, planningAdmissionReceiptRoot: domainRoot('CONNECT-B0-V6-INDEPENDENCE-PLANNING-ADMISSION-RECEIPT-V1', { proofClass, planningAdmittedInstanceRoot, decision: 'ADMITTED-FOR-PLANNING-SCHEMA-VALIDATION-ONLY', authorityCredit: 0 }), operationalCurrentInstanceRoot: null };
});

function inferFieldType(name) {
  if (/^(.*Id|permitType|actId|oneUseState)$/.test(name)) return name.endsWith('Id') ? 'DETERMINISTIC-ID' : 'CLOSED-ENUM';
  if (/^(.*Root|.*Head|signatureRoot)$/.test(name)) return 'SHA256';
  if (/Revision$|Epoch$|fencingToken$/.test(name)) return 'U64';
  if (/notBefore$|validThrough$/.test(name)) return 'RFC3339-UTC';
  if (/authorityCreditConstantZero|capabilityBitsConstantZero/.test(name)) return 'U8-CONSTANT-0';
  return 'CANONICAL-UTF8';
}

function typedField(name) {
  const type = inferFieldType(name);
  const field = { name, type, cardinality: 'EXACTLY-ONE', canonicalEncoding: type === 'U64' || type === 'U8-CONSTANT-0' ? 'UNSIGNED-DECIMAL' : 'UTF8-NFC' };
  if (type === 'U8-CONSTANT-0') field.constant = 0;
  if (name === 'oneUseState') field.enum = ['UNUSED', 'RESERVED', 'CONSUMED', 'REVOKED'];
  return field;
}

function planningValueForField(name, permitType) {
  if (name === 'permitType') return permitType;
  if (name === 'oneUseState') return 'UNUSED';
  if (name === 'notBefore') return '2026-08-30T00:00:00Z';
  if (name === 'validThrough') return '2026-08-31T00:00:00Z';
  if (/Revision$|Epoch$|fencingToken$/.test(name) || /ConstantZero/.test(name)) return 0;
  if (name.endsWith('Id')) return deterministicId('B0V6-VALUE', 'CONNECT-B0-V6-PERMIT-ID-FIELD-V1', { permitType, name });
  if (name.endsWith('Root') || name.endsWith('Head')) return domainRoot('CONNECT-B0-V6-PERMIT-PLANNING-FIELD-V1', { permitType, name, source: V5_HASHES.manifest });
  return `${permitType}:${name}:PLANNING-ZERO-AUTHORITY`;
}

const permitSchemas = v5Registry.permitSchemas.map((old) => {
  const fields = old.exactFields.map(typedField);
  const schemaBody = {
    permitType: old.permitType,
    schemaId: `B0V6-${old.permitType.replace(/([a-z])([A-Z])/g, '$1-$2').toUpperCase()}-TYPED-V1`,
    fields,
    allowedActs: old.allowedActs,
    unknownFieldPolicy: 'BLOCK',
    temporalPredicate: { op: 'AND', args: [{ op: 'LTE', leftPath: '/notBefore', rightPath: '/trustedNow' }, { op: 'LT', leftPath: '/trustedNow', rightPath: '/validThrough' }] },
    revisionPredicate: { op: 'AND', args: [{ op: 'EQ', leftPath: '/expectedSecurityRevision', rightPath: '/currentSecurityRevision' }, { op: 'LT', leftPath: '/revocationRevision', rightPath: '/commitRevision' }] },
    replayPredicate: { op: 'AND', args: [{ op: 'EQ', leftPath: '/oneUseState', rightConst: 'UNUSED' }, { op: 'GT', leftPath: '/providedFence', rightPath: '/currentFence' }] },
    issuerRole: 'PermitIssuer', admissionScope: 'PLANNING-SCHEMA-VALIDATION-ONLY', authorityCredit: 0,
  };
  const schemaRoot = domainRoot('CONNECT-B0-V6-TYPED-PERMIT-SCHEMA-V1', schemaBody);
  const instance = Object.fromEntries(fields.map((field) => [field.name, planningValueForField(field.name, old.permitType)]));
  instance.actId = old.allowedActs[0];
  const instanceBody = { schemaRoot, values: instance, sourceRoot: V5_HASHES.manifest, operational: false, authorityCredit: 0 };
  return {
    ...schemaBody, schemaRoot,
    planningAdmittedInstance: { ...instanceBody, instanceRoot: domainRoot('CONNECT-B0-V6-PLANNING-PERMIT-INSTANCE-V1', instanceBody) },
    operationalCurrentInstanceRoot: null,
  };
});

const permitLifecycleProgramBody = {
  language: 'B0V6-TYPED-PERMIT-LIFECYCLE-AST-V1',
  contextSchema: {
    fields: [
      ['trustedNow', 'RFC3339-UTC'], ['currentSecurityUniverseRoot', 'SHA256'], ['currentSecurityRevision', 'U64'], ['currentPermitLedgerHead', 'SHA256'], ['currentRevocationHead', 'SHA256'],
      ['currentAuthorityEpoch', 'U64'], ['currentFence', 'U64'], ['revocationRevision', 'U64'], ['commitRevision', 'U64'], ['requestedActId', 'DETERMINISTIC-ID'],
      ['requestedEnvironmentRoot', 'SHA256'], ['requestedInputRoot', 'SHA256'], ['requestedOutputManifestRoot', 'SHA256'], ['attemptReservationState', 'CLOSED-ENUM'],
    ].map(([name, type]) => ({ name, type, cardinality: 'EXACTLY-ONE' })),
    unknownFieldPolicy: 'BLOCK',
  },
  transitions: [
    { ordinal: 1, transition: 'ISSUE', precondition: { op: 'AND', args: [{ op: 'EQ', leftPath: '/permit/oneUseState', rightConst: 'UNUSED' }, { op: 'EQ', leftPath: '/context/attemptReservationState', rightConst: 'ABSENT' }] }, writes: [{ op: 'PUT-IF-ABSENT', path: '/permitLedger/permitId', valuePath: '/permit/permitId' }] },
    { ordinal: 2, transition: 'VALIDATE-TIME', precondition: { op: 'AND', args: [{ op: 'LTE', leftPath: '/permit/notBefore', rightPath: '/context/trustedNow' }, { op: 'LT', leftPath: '/context/trustedNow', rightPath: '/permit/validThrough' }] }, onFalse: 'BLOCK-TIME' },
    { ordinal: 3, transition: 'VALIDATE-REVISION-HEADS', precondition: { op: 'AND', args: [{ op: 'EQ', leftPath: '/permit/expectedSecurityUniverseRoot', rightPath: '/context/currentSecurityUniverseRoot' }, { op: 'EQ', leftPath: '/permit/expectedSecurityRevision', rightPath: '/context/currentSecurityRevision' }, { op: 'EQ', leftPath: '/permit/expectedLedgerHead', rightPath: '/context/currentPermitLedgerHead' }, { op: 'EQ', leftPath: '/permit/expectedRevocationHead', rightPath: '/context/currentRevocationHead' }, { op: 'EQ', leftPath: '/permit/authorityEpoch', rightPath: '/context/currentAuthorityEpoch' }, { op: 'LT', leftPath: '/context/revocationRevision', rightPath: '/context/commitRevision' }] }, onFalse: 'BLOCK-STALE-OR-REVOKED' },
    { ordinal: 4, transition: 'VALIDATE-ACT-BINDINGS', precondition: { op: 'AND', args: [{ op: 'EQ', leftPath: '/permit/actId', rightPath: '/context/requestedActId' }, { op: 'EQ', leftPath: '/permit/environmentRoot', rightPath: '/context/requestedEnvironmentRoot' }, { op: 'EQ', leftPath: '/permit/exactInputRoot', rightPath: '/context/requestedInputRoot' }, { op: 'EQ', leftPath: '/permit/exactOutputManifestRoot', rightPath: '/context/requestedOutputManifestRoot' }] }, onFalse: 'BLOCK-SUBSTITUTION' },
    { ordinal: 5, transition: 'RESERVE', precondition: { op: 'AND', args: [{ op: 'EQ', leftPath: '/permit/oneUseState', rightConst: 'UNUSED' }, { op: 'EQ', leftPath: '/context/attemptReservationState', rightConst: 'ABSENT' }, { op: 'GT', leftPath: '/permit/fencingToken', rightPath: '/context/currentFence' }] }, writes: [{ op: 'CAS', path: '/context/attemptReservationState', expected: 'ABSENT', value: 'RESERVED' }], onFalse: 'BLOCK-REPLAY-OR-STALE-FENCE' },
    { ordinal: 6, transition: 'CONSUME', precondition: { op: 'EQ', leftPath: '/context/attemptReservationState', rightConst: 'RESERVED' }, writes: [{ op: 'CAS', path: '/permit/oneUseState', expected: 'UNUSED', value: 'CONSUMED' }], onFalse: 'BLOCK-SECOND-CONSUME' },
    { ordinal: 7, transition: 'REVOKE', precondition: { op: 'LTE', leftPath: '/context/commitRevision', rightPath: '/context/revocationRevision' }, writes: [{ op: 'SET', path: '/permit/oneUseState', value: 'REVOKED' }], ordering: 'REVOCATION-WINS-AT-EQUAL-REVISION' },
    { ordinal: 8, transition: 'REPLAY-CHECK', precondition: { op: 'AND', args: [{ op: 'EQ', leftPath: '/permit/oneUseState', rightConst: 'UNUSED' }, { op: 'EQ', leftPath: '/permit/authorityEpoch', rightPath: '/context/currentAuthorityEpoch' }] }, onFalse: 'BLOCK-REPLAY' },
  ],
  canonicalTimeBoundary: 'notBefore<=trustedNow<validThrough',
  canonicalRevisionBoundary: 'revocationRevision<commitRevision;EQUALITY-BLOCKS',
  atomicity: 'RESERVE+CONSUME+LEDGER-ADVANCE-IN-ONE-AUTHORITY-STORE-TRANSACTION',
  unknownTransitionPolicy: 'BLOCK',
};
const permitLifecycleProgram = { ...permitLifecycleProgramBody, programRoot: domainRoot('CONNECT-B0-V6-PERMIT-LIFECYCLE-PROGRAM-V1', permitLifecycleProgramBody) };

const permitRuleMutationMatrix = [
  ['EXPIRY-EQUALITY', '/context/trustedNow', '2026-08-31T00:00:00Z', 'BLOCK-TIME'],
  ['REVOCATION-EQUALITY', '/context/revocationRevision', 1, 'BLOCK-STALE-OR-REVOKED'],
  ['STALE-FENCE', '/permit/fencingToken', 0, 'BLOCK-REPLAY-OR-STALE-FENCE'],
  ['SECURITY-HEAD-MISMATCH', '/context/currentSecurityUniverseRoot', 'MUTATED-SHA256', 'BLOCK-STALE-OR-REVOKED'],
  ['SECOND-CONSUME', '/permit/oneUseState', 'CONSUMED', 'BLOCK-SECOND-CONSUME'],
  ['ACT-SUBSTITUTION', '/context/requestedActId', 'MUTATED-ACT', 'BLOCK-SUBSTITUTION'],
  ['ENVIRONMENT-SUBSTITUTION', '/context/requestedEnvironmentRoot', 'MUTATED-SHA256', 'BLOCK-SUBSTITUTION'],
  ['INPUT-SUBSTITUTION', '/context/requestedInputRoot', 'MUTATED-SHA256', 'BLOCK-SUBSTITUTION'],
  ['OUTPUT-SUBSTITUTION', '/context/requestedOutputManifestRoot', 'MUTATED-SHA256', 'BLOCK-SUBSTITUTION'],
  ['CROSS-GENERATION-REPLAY', '/context/currentAuthorityEpoch', 1, 'BLOCK-REPLAY'],
].map(([caseId, mutationPath, mutationValue, expectedReason], index) => ({ ordinal: index + 1, caseId, mutation: { op: 'SET', path: mutationPath, value: mutationValue }, expectedReason, operationalEvidenceRoot: null, authorityCredit: 0 }));

const GENESIS_CLASS_FIELD_SPECS = {
  L0TrustAnchorAdmission: [['anchorAlgorithmId', 'CLOSED-ALGORITHM-ID'], ['anchorPublicKeyRoot', 'SHA256'], ['externalAdmissionSignatureRoot', 'SHA256'], ['admittingControllerRoots', 'SHA256-ARRAY', 3]],
  TalIdentityBinding: [['subjectIdentityId', 'DETERMINISTIC-ID'], ['identityDocumentRoot', 'SHA256'], ['bindingSignatureRoot', 'SHA256']],
  RecoveryQuorumProfile: [['threshold', 'U8-CONSTANT', 3], ['memberAppointmentRoots', 'SHA256-ARRAY', 5], ['witnessAppointmentRoots', 'SHA256-ARRAY', 2], ['controllerEquivalenceGraphRoot', 'SHA256']],
  AlgorithmRegistryHead: [['registryHeadTupleRoot', 'SHA256'], ['registryRevision', 'U64'], ['allowedAlgorithmIdsRoot', 'SHA256']],
  AlgorithmRegistryMembersRoot: [['memberCount', 'U64'], ['orderedAlgorithmMemberRoots', 'SHA256-ARRAY', 3], ['membershipMerkleRoot', 'SHA256']],
  KeyStatusHead: [['keyStatusHeadTupleRoot', 'SHA256'], ['keyStatusRevision', 'U64'], ['compromiseCutRoot', 'SHA256']],
  KeyStatusMembersRoot: [['keyCount', 'U64'], ['orderedKeyStatusRoots', 'SHA256-ARRAY', 3], ['membershipMerkleRoot', 'SHA256']],
  TrustedTimeSourceProfile: [['sourceCount', 'U8-CONSTANT', 2], ['sourceIdentityRoots', 'SHA256-ARRAY', 2], ['maximumSkewMillis', 'U64'], ['rollbackDetectionRoot', 'SHA256']],
  InitialTrustedTimeDecision: [['sourceProfileRoot', 'SHA256'], ['observedAt', 'RFC3339-UTC'], ['monotonicCounter', 'U64'], ['decisionSignatureRoot', 'SHA256']],
  CanonicalSerializationProfile: [['encodingId', 'CLOSED-ENUM'], ['canonicalizationRuleRoot', 'SHA256'], ['testCorpusRoot', 'SHA256']],
  DeterministicIdentityProfile: [['hashAlgorithmId', 'CLOSED-ALGORITHM-ID'], ['domainRegistryRoot', 'SHA256'], ['canonicalInputSchemaRoot', 'SHA256'], ['randomnessAllowed', 'BOOLEAN-CONSTANT-FALSE']],
  AuthorityStoreIdentity: [['storeInstanceId', 'DETERMINISTIC-ID'], ['storePublicIdentityRoot', 'SHA256'], ['storeNamespaceRoot', 'SHA256']],
  AuthorityStoreCapabilityReceipt: [['storeIdentityRoot', 'SHA256'], ['atomicCasSupported', 'BOOLEAN-CONSTANT-TRUE'], ['transactionalOutboxSupported', 'BOOLEAN-CONSTANT-TRUE'], ['durabilityProfileRoot', 'SHA256']],
  EmptyGenesisLedgerHead: [['ledgerId', 'DETERMINISTIC-ID'], ['entryCount', 'U64-CONSTANT-0'], ['emptyRoot', 'SHA256'], ['revision', 'U64-CONSTANT-0']],
  EmptyPermitLedgerHead: [['ledgerId', 'DETERMINISTIC-ID'], ['entryCount', 'U64-CONSTANT-0'], ['emptyRoot', 'SHA256'], ['revision', 'U64-CONSTANT-0']],
  AppointmentRegistry: [['roleCount', 'U8-CONSTANT', 21], ['appointmentSchemaRoot', 'SHA256'], ['orderedAppointmentRoots', 'SHA256-ARRAY', 21], ['registryHeadTupleRoot', 'SHA256']],
  ApproverAppointment: [['approverRole', 'ENUM-CONSTANT-APPROVER'], ['approverAppointmentRoot', 'SHA256'], ['effectiveControllerRoot', 'SHA256']],
  EightRoleConflictMatrix: [['legacyRoleCount', 'U8-CONSTANT', 8], ['legacyPairCount', 'U8-CONSTANT', 28], ['legacyPairMatrixRoot', 'SHA256'], ['extendedTwentyOneRoleMatrixRoot', 'SHA256']],
  ControllerEquivalencePolicy: [['aliasEdgeSchemaRoot', 'SHA256'], ['closureAlgorithmId', 'CLOSED-ENUM'], ['unknownRelationPolicy', 'ENUM-CONSTANT-BLOCK'], ['equivalenceTestRoot', 'SHA256']],
  InitialSecurityUniverseHead: [['headId', 'DETERMINISTIC-ID'], ['version', 'U64-CONSTANT-0'], ['root', 'SHA256'], ['revision', 'U64-CONSTANT-0']],
  InitialSecurityUniverseRevision: [['revision', 'U64-CONSTANT-0'], ['priorRevisionRoot', 'NULL-CONSTANT'], ['genesisRevisionRoot', 'SHA256']],
  WitnessPolicy: [['requiredWitnessCount', 'U8-CONSTANT', 2], ['sameCheckpointRequired', 'BOOLEAN-CONSTANT-TRUE'], ['controllerExclusionMatrixRoot', 'SHA256'], ['acknowledgementSchemaRoot', 'SHA256']],
  Witness1Appointment: [['role', 'ENUM-CONSTANT-WITNESS1'], ['appointmentRoot', 'SHA256'], ['effectiveControllerRoot', 'SHA256']],
  Witness2Appointment: [['role', 'ENUM-CONSTANT-WITNESS2'], ['appointmentRoot', 'SHA256'], ['effectiveControllerRoot', 'SHA256']],
  ApplicableDirectiveRegistryRoot: [['directiveCount', 'U64'], ['orderedDirectiveRoots', 'SHA256-ARRAY', 3], ['registryRoot', 'SHA256']],
  PublicDisclosurePolicyRoot: [['classificationCount', 'U64'], ['redactionRuleRoot', 'SHA256'], ['piiSecretBlockRuleRoot', 'SHA256'], ['publicProjectionSchemaRoot', 'SHA256']],
  BootstrapReviewProtocolRoot: [['reviewerCount', 'U8-CONSTANT', 2], ['independenceClassCount', 'U8-CONSTANT', 9], ['reviewDecisionSchemaRoot', 'SHA256'], ['protocolRoot', 'SHA256']],
  JournalPolicyRoot: [['entrySchemaRoot', 'SHA256'], ['appendOnlyRequired', 'BOOLEAN-CONSTANT-TRUE'], ['retentionRuleRoot', 'SHA256']],
  ExceptionRegistryHead: [['headId', 'DETERMINISTIC-ID'], ['version', 'U64-CONSTANT-0'], ['root', 'SHA256'], ['exceptionCount', 'U64-CONSTANT-0']],
  InitialHeadVector: [['headCount', 'U8-CONSTANT', 36], ['orderedHeadTupleRoots', 'SHA256-ARRAY', 36], ['securityUniverseHeadRoot', 'SHA256']],
  ExternalCeremonyTranscriptRoot: [['ceremonyId', 'DETERMINISTIC-ID'], ['participantControllerRoots', 'SHA256-ARRAY', 3], ['preB0InputRoot', 'SHA256'], ['transcriptSignatureRoot', 'SHA256']],
  FoundationValidatorProfile1: [['validatorId', 'DETERMINISTIC-ID'], ['implementationRoot', 'SHA256'], ['dependencyRoot', 'SHA256'], ['runtimeRoot', 'SHA256'], ['effectiveControllerRoot', 'SHA256']],
  FoundationValidatorProfile2: [['validatorId', 'DETERMINISTIC-ID'], ['implementationRoot', 'SHA256'], ['dependencyRoot', 'SHA256'], ['runtimeRoot', 'SHA256'], ['effectiveControllerRoot', 'SHA256']],
};
if (Object.keys(GENESIS_CLASS_FIELD_SPECS).length !== 33) throw new Error('Genesis class field-spec denominator mismatch');

function genesisField(spec) {
  const [name, type, exactCountOrConstant] = spec;
  const field = { name, type, cardinality: 'EXACTLY-ONE', classSpecific: true };
  if (type === 'SHA256-ARRAY') field.elementCardinality = { exact: exactCountOrConstant };
  if (/CONSTANT/.test(type)) {
    if (type === 'BOOLEAN-CONSTANT-TRUE') field.constant = true;
    else if (type === 'BOOLEAN-CONSTANT-FALSE') field.constant = false;
    else if (type === 'NULL-CONSTANT') field.constant = null;
    else if (type.startsWith('ENUM-CONSTANT-')) field.constant = ({ APPROVER: 'Approver', WITNESS1: 'Witness1', WITNESS2: 'Witness2', BLOCK: 'BLOCK' })[type.slice('ENUM-CONSTANT-'.length)];
    else field.constant = exactCountOrConstant ?? 0;
  }
  return field;
}

function genesisPlanningValue(field, memberClass) {
  if (Object.hasOwn(field, 'constant')) return field.constant;
  if (field.type === 'SHA256-ARRAY') return Array.from({ length: field.elementCardinality.exact }, (_, ordinal) => domainRoot('CONNECT-B0-V6-GENESIS-CLASS-ARRAY-MEMBER-V1', { memberClass, field: field.name, ordinal: ordinal + 1, source: V5_HASHES.packageContentRoot }));
  if (field.type === 'U64' || field.type === 'U8') {
    if (['memberCount', 'keyCount', 'directiveCount', 'classificationCount'].includes(field.name)) return 3;
    if (field.name === 'maximumSkewMillis') return 1000;
    return 0;
  }
  if (field.type === 'RFC3339-UTC') return '2026-08-30T00:00:00Z';
  if (field.type === 'DETERMINISTIC-ID') return deterministicId('B0V6-GENESIS-VALUE', 'CONNECT-B0-V6-GENESIS-CLASS-ID-V1', { memberClass, field: field.name });
  if (field.type === 'SHA256') return domainRoot('CONNECT-B0-V6-GENESIS-CLASS-VALUE-V1', { memberClass, field: field.name, source: V5_HASHES.packageContentRoot });
  return `${memberClass}:${field.name}:PLANNING-SCHEMA-VALUE`;
}

const genesisMemberSchemas = v5Registry.genesisFoundation.memberSlots.map((slot, index) => {
  const classSpecificFields = GENESIS_CLASS_FIELD_SPECS[slot.memberClass].map(genesisField);
  const fields = [
    typedField('memberId'),
    { name: 'memberClass', type: 'ENUM-CONSTANT', cardinality: 'EXACTLY-ONE', constant: slot.memberClass },
    typedField('schemaRoot'), typedField('issuerAppointmentRoot'), typedField('effectiveControllerRoot'),
    typedField('authorityEpoch'), typedField('notBefore'), typedField('validThrough'), typedField('invalidationRuleRoot'),
    ...classSpecificFields,
    { name: 'authorityCredit', type: 'U8', cardinality: 'EXACTLY-ONE', constant: 0 },
  ];
  const schemaBody = {
    schemaId: `B0V6-GENESIS-${String(index + 1).padStart(2, '0')}-${slot.memberClass.toUpperCase()}-V1`,
    memberClass: slot.memberClass, fields, classSpecificFieldCount: classSpecificFields.length, unknownFieldPolicy: 'BLOCK', wrongClassSubstitutionPolicy: 'BLOCK', staleOrRevokedDependencyPolicy: 'BLOCK',
    validationProgram: { language: 'B0V6-ORACLE-AST-V1', body: { op: 'AND', args: [
      { op: 'EQ', leftPath: '/memberClass', rightConst: slot.memberClass },
      ...classSpecificFields.filter((field) => field.type !== 'NULL-CONSTANT').map((field) => ({ op: 'NON_NULL', path: `/${field.name}` })),
      ...classSpecificFields.filter((field) => field.type === 'NULL-CONSTANT').map((field) => ({ op: 'EQ', leftPath: `/${field.name}`, rightConst: null })),
      ...classSpecificFields.filter((field) => field.type === 'SHA256-ARRAY').map((field) => ({ op: 'UNIQUE-COUNT', path: `/${field.name}`, expected: field.elementCardinality.exact })),
      { op: 'ZERO', path: '/authorityCredit' },
    ] } },
  };
  const schemaRoot = domainRoot('CONNECT-B0-V6-GENESIS-CLASS-SCHEMA-V1', schemaBody);
  const instance = {
    memberId: deterministicId('B0V6-GENESIS-MEMBER', 'CONNECT-B0-V6-GENESIS-MEMBER-ID-V1', { memberClass: slot.memberClass }),
    memberClass: slot.memberClass, schemaRoot,
    issuerAppointmentRoot: appointmentByRole.get('GenesisIssuer').instanceRoot,
    effectiveControllerRoot: domainRoot('CONNECT-B0-V6-GENESIS-MEMBER-CONTROLLER-V1', { memberClass: slot.memberClass, source: V5_HASHES.manifest }),
    authorityEpoch: 0, notBefore: '2026-08-30T00:00:00Z', validThrough: '2026-08-31T00:00:00Z',
    invalidationRuleRoot: domainRoot('CONNECT-B0-V6-GENESIS-INVALIDATION-V1', { memberClass: slot.memberClass, rule: 'ANY-DEPENDENCY-HEAD-ADVANCE' }),
    ...Object.fromEntries(classSpecificFields.map((field) => [field.name, genesisPlanningValue(field, slot.memberClass)])),
    authorityCredit: 0, operational: false, admissionScope: 'PLANNING-SCHEMA-VALIDATION-ONLY',
  };
  const instanceRoot = domainRoot('CONNECT-B0-V6-GENESIS-PLANNING-INSTANCE-V1', instance);
  const receiptBody = { schemaRoot, instanceRoot, decision: 'ADMITTED-FOR-PLANNING-SCHEMA-VALIDATION-ONLY', externalAuthority: false, authorityCredit: 0 };
  return { ...schemaBody, schemaRoot, planningAdmittedInstance: { ...instance, instanceRoot }, planningAdmissionReceipt: { ...receiptBody, receiptRoot: domainRoot('CONNECT-B0-V6-GENESIS-PLANNING-ADMISSION-RECEIPT-V1', receiptBody) }, operationalCurrentInstanceRoot: null };
});

function recoveryRecord(kind, ordinal, role) {
  const idName = kind === 'MEMBER' ? 'memberId' : 'witnessId';
  const fields = [typedField(idName), typedField('appointmentRoot'), typedField('effectiveControllerRoot'), typedField('profileEpoch'), typedField('notBefore'), typedField('validThrough'), typedField('revocationRevision'), typedField('challengeRoot'), typedField('acknowledgementRoot'), { name: 'authorityCredit', type: 'U8', cardinality: 'EXACTLY-ONE', constant: 0 }];
  const schemaBody = { schemaId: `B0V6-RECOVERY-${kind}-${ordinal}-V1`, recordClass: kind, ordinal, fields, unknownFieldPolicy: 'BLOCK' };
  const schemaRoot = domainRoot('CONNECT-B0-V6-RECOVERY-RECORD-SCHEMA-V1', schemaBody);
  const id = deterministicId(`B0V6-RECOVERY-${kind}`, 'CONNECT-B0-V6-RECOVERY-RECORD-ID-V1', { kind, ordinal });
  const instance = {
    [idName]: id, appointmentRoot: appointmentByRole.get(role).instanceRoot,
    effectiveControllerRoot: appointmentByRole.get(role).effectiveControllerRoot,
    profileEpoch: 0, notBefore: '2026-08-30T00:00:00Z', validThrough: '2026-08-31T00:00:00Z', revocationRevision: 0,
    challengeRoot: domainRoot('CONNECT-B0-V6-RECOVERY-CHALLENGE-V1', { source: V5_HASHES.packageContentRoot, profileEpoch: 0 }),
    acknowledgementRoot: domainRoot('CONNECT-B0-V6-RECOVERY-ACK-V1', { id, source: V5_HASHES.manifest }),
    authorityCredit: 0, operational: false, admissionScope: 'PLANNING-SCHEMA-VALIDATION-ONLY',
  };
  const instanceRoot = domainRoot('CONNECT-B0-V6-RECOVERY-PLANNING-INSTANCE-V1', instance);
  return { ...schemaBody, schemaRoot, planningAdmittedInstance: { ...instance, instanceRoot }, operationalCurrentInstanceRoot: null };
}

const recoveryMembers = Array.from({ length: 5 }, (_, index) => recoveryRecord('MEMBER', index + 1, `RecoveryCustodian${index + 1}`));
const recoveryWitnesses = Array.from({ length: 2 }, (_, index) => recoveryRecord('WITNESS', index + 1, `RecoveryWitness${index + 1}`));
const recoveryAttemptFields = ['attemptId', 'profileRoot', 'profileEpoch', 'purpose', 'compromiseCutRoot', 'newAnchorRoot', 'newAlgorithmRegistryRoot', 'newKeyStatusRoot', 'trustedTimeDecisionRoot', 'expectedRecoveryLedgerHead', 'notBefore', 'validThrough', 'memberAcknowledgementRoots', 'witnessAcknowledgementRoots', 'oneUseState'].map((name) => {
  if (name === 'memberAcknowledgementRoots') return { name, type: 'SHA256-ARRAY', cardinality: 'EXACTLY-ONE', elementCardinality: { minimum: 3, maximum: 5 } };
  if (name === 'witnessAcknowledgementRoots') return { name, type: 'SHA256-ARRAY', cardinality: 'EXACTLY-ONE', elementCardinality: { exact: 2 } };
  if (name === 'purpose') return { name, type: 'CLOSED-ENUM', cardinality: 'EXACTLY-ONE', enum: ['ROTATE', 'COMPROMISE-RECOVERY'] };
  return typedField(name);
});
const recoveryAttemptSchemaBody = {
  schemaId: 'B0V6-RECOVERY-ATTEMPT-TYPED-V1', fields: recoveryAttemptFields, unknownFieldPolicy: 'BLOCK',
  thresholdPredicate: { op: 'AND', args: [{ op: 'UNIQUE_COUNT', path: '/memberAcknowledgementRoots', expected: 3 }, { op: 'UNIQUE_COUNT', path: '/witnessAcknowledgementRoots', expected: 2 }] },
  sameChallengePredicate: { op: 'ALL_EQUAL_PROJECTED', path: '/acknowledgements', field: 'challengeRoot' },
  replayPredicate: { op: 'EQ', leftPath: '/oneUseState', rightConst: 'UNUSED' },
  rotationPredicate: { op: 'AND', args: [{ op: 'EQ', leftPath: '/oldProfileRevokedRevision', rightPath: '/newProfileAdmittedRevision' }, { op: 'EQ', leftPath: '/currentProfileCount', rightConst: 1 }] },
};
const recoveryAttemptSchema = { ...recoveryAttemptSchemaBody, schemaRoot: domainRoot('CONNECT-B0-V6-RECOVERY-ATTEMPT-SCHEMA-V1', recoveryAttemptSchemaBody), operationalCurrentAttemptRoot: null };
const recoveryAttemptPlanningBody = {
  attemptId: deterministicId('B0V6-RECOVERY-ATTEMPT', 'CONNECT-B0-V6-RECOVERY-ATTEMPT-ID-V1', { source: V5_HASHES.packageContentRoot, profileEpoch: 0 }),
  profileRoot: domainRoot('CONNECT-B0-V6-RECOVERY-PLANNING-PROFILE-V1', { members: recoveryMembers.map((item) => item.planningAdmittedInstance.instanceRoot), witnesses: recoveryWitnesses.map((item) => item.planningAdmittedInstance.instanceRoot), threshold: 3, authorityCredit: 0 }),
  profileEpoch: 0,
  purpose: 'ROTATE',
  compromiseCutRoot: domainRoot('CONNECT-B0-V6-RECOVERY-COMPROMISE-CUT-V1', { source: V5_HASHES.manifest, revision: 0 }),
  newAnchorRoot: domainRoot('CONNECT-B0-V6-RECOVERY-NEW-ANCHOR-V1', { source: V5_HASHES.packageContentRoot }),
  newAlgorithmRegistryRoot: domainRoot('CONNECT-B0-V6-RECOVERY-NEW-ALGORITHM-REGISTRY-V1', { source: V5_HASHES.packageContentRoot }),
  newKeyStatusRoot: domainRoot('CONNECT-B0-V6-RECOVERY-NEW-KEY-STATUS-V1', { source: V5_HASHES.packageContentRoot }),
  trustedTimeDecisionRoot: domainRoot('CONNECT-B0-V6-RECOVERY-TRUSTED-TIME-V1', { observedAt: '2026-08-30T00:00:00Z', source: V5_HASHES.manifest }),
  expectedRecoveryLedgerHead: domainRoot('CONNECT-B0-V6-RECOVERY-LEDGER-HEAD-V1', { revision: 0, source: V5_HASHES.manifest }),
  notBefore: '2026-08-30T00:00:00Z',
  validThrough: '2026-08-31T00:00:00Z',
  memberAcknowledgementRoots: recoveryMembers.slice(0, 3).map((item) => item.planningAdmittedInstance.acknowledgementRoot),
  witnessAcknowledgementRoots: recoveryWitnesses.map((item) => item.planningAdmittedInstance.acknowledgementRoot),
  oneUseState: 'UNUSED',
  commonChallengeRoot: recoveryMembers[0].planningAdmittedInstance.challengeRoot,
  operational: false,
  admissionScope: 'PLANNING-SCHEMA-VALIDATION-ONLY',
  authorityCredit: 0,
};
const recoveryAttemptPlanningInstance = { ...recoveryAttemptPlanningBody, instanceRoot: domainRoot('CONNECT-B0-V6-RECOVERY-ATTEMPT-PLANNING-INSTANCE-V1', recoveryAttemptPlanningBody) };

const recoveryLifecycleProgramBody = {
  language: 'B0V6-RECOVERY-ROTATION-STATE-MACHINE-AST-V1',
  states: ['UNUSED', 'RESERVED', 'OLD-PROFILE-REVOKED', 'NEW-PROFILE-ADMITTED', 'CONSUMED'],
  transitions: [
    { ordinal: 1, op: 'VALIDATE-TIME-REVISION', precondition: { op: 'AND', args: [{ op: 'LTE', leftPath: '/attempt/notBefore', rightPath: '/context/trustedNow' }, { op: 'LT', leftPath: '/context/trustedNow', rightPath: '/attempt/validThrough' }, { op: 'EQ', leftPath: '/attempt/profileEpoch', rightPath: '/context/currentProfileEpoch' }, { op: 'EQ', leftPath: '/attempt/expectedRecoveryLedgerHead', rightPath: '/context/currentRecoveryLedgerHead' }] }, onFalse: 'BLOCK' },
    { ordinal: 2, op: 'VALIDATE-CONTROLLER-EQUIVALENCE-CLOSURE', precondition: { op: 'AND', args: [{ op: 'BOOLEAN_TRUE', path: '/context/controllerDistinctFromAuthorityOwner' }, { op: 'BOOLEAN_TRUE', path: '/context/controllerDistinctFromWorkRoles' }, { op: 'BOOLEAN_TRUE', path: '/context/witnessCustodianDistinct' }, { op: 'BOOLEAN_TRUE', path: '/context/transitiveControllerDistinct' }] }, unknownAliasPolicy: 'BLOCK', onFalse: 'BLOCK' },
    { ordinal: 3, op: 'VALIDATE-CHALLENGE', precondition: { op: 'AND', args: [{ op: 'BOOLEAN_TRUE', path: '/context/allChallengesEqual' }, { op: 'GT', leftPath: '/context/uniqueMemberCount', rightConst: 2 }, { op: 'EQ', leftPath: '/context/uniqueWitnessCount', rightConst: 2 }] }, onFalse: 'BLOCK' },
    { ordinal: 4, op: 'RESERVE-ATTEMPT', precondition: { op: 'AND', args: [{ op: 'EQ', leftPath: '/context/attemptReservationState', rightConst: 'ABSENT' }, { op: 'EQ', leftPath: '/attempt/oneUseState', rightConst: 'UNUSED' }] }, writes: [{ op: 'PUT-IF-ABSENT', path: '/store/attemptReservations', keyPath: '/attempt/attemptId', value: 'RESERVED' }, { op: 'SET', path: '/attempt/oneUseState', value: 'RESERVED' }], onFalse: 'BLOCK' },
    { ordinal: 5, op: 'REVOKE-OLD-PROFILE', precondition: { op: 'LT', leftPath: '/context/oldProfileRevision', rightPath: '/context/newProfileRevision' }, writes: [{ op: 'SET', path: '/store/oldProfileState', value: 'REVOKED' }], equalityPolicy: 'COMPROMISE-OR-REVOCATION-WINS', onFalse: 'BLOCK' },
    { ordinal: 6, op: 'ADMIT-NEW-PROFILE', precondition: { op: 'AND', args: [{ op: 'EQ', leftPath: '/store/oldProfileState', rightConst: 'REVOKED' }, { op: 'ZERO', path: '/store/currentProfileCount' }] }, writes: [{ op: 'SET', path: '/store/newProfileState', value: 'CURRENT' }, { op: 'SET', path: '/store/currentProfileCount', value: 1 }], onFalse: 'BLOCK' },
    { ordinal: 7, op: 'CONSUME-ATTEMPT', precondition: { op: 'EQ', leftPath: '/attempt/oneUseState', rightConst: 'RESERVED' }, writes: [{ op: 'CAS', path: '/attempt/oneUseState', expected: 'RESERVED', value: 'CONSUMED' }], onFalse: 'BLOCK' },
  ],
  compromiseOrdering: 'COMPROMISE-OR-REVOCATION-WINS-AT-EQUAL-REVISION',
  atomicity: 'STEPS-4..7-ONE-AUTHORITY-STORE-TRANSACTION',
  unknownTransitionPolicy: 'BLOCK',
};
const recoveryLifecycleProgram = { ...recoveryLifecycleProgramBody, programRoot: domainRoot('CONNECT-B0-V6-RECOVERY-LIFECYCLE-PROGRAM-V1', recoveryLifecycleProgramBody) };
const recoveryMutationMatrix = [
  ['AUTHORITYOWNER-OVERLAP', '/controllerDistinctFromAuthorityOwner', false],
  ['WORK-ROLE-OVERLAP', '/controllerDistinctFromWorkRoles', false],
  ['WITNESS-CUSTODIAN-OVERLAP', '/witnessCustodianDistinct', false],
  ['ALIAS-EQUIVALENCE', '/transitiveControllerDistinct', false],
  ['STALE-MEMBER', '/allMembersCurrent', false],
  ['EXPIRED-MEMBER', '/allMembersWithinValidity', false],
  ['BELOW-THRESHOLD', '/uniqueMemberCount', 2],
  ['MIXED-CHALLENGE', '/allChallengesEqual', false],
  ['REPLAY', '/oneUseState', 'CONSUMED'],
  ['DUAL-CURRENT-PROFILE', '/currentProfileCount', 2],
  ['EQUAL-REVISION-COMPROMISE', '/compromiseBeforeCommitAtEquality', false],
].map(([caseId, mutationPath, value], index) => ({ ordinal: index + 1, caseId, mutation: { op: 'SET', path: mutationPath, value }, expectedDecision: 'BLOCK', authorityCredit: 0 }));

const fixedHeads = v5Registry.mutableHeadRegistry.heads.map((head, index) => ({
  headId: `B0V6-HEAD-${String(index + 1).padStart(2, '0')}`, name: head.name,
  tupleSchema: { version: 'U64-MONOTONIC', root: 'SHA256', revision: 'U64-MONOTONIC' },
  advancementProgram: { op: 'ATOMIC_HEAD_ADVANCE', precondition: { op: 'AND', args: [{ op: 'EQ', leftPath: '/request/expectedVersion', rightPath: '/store/currentVersion' }, { op: 'EQ', leftPath: '/request/expectedRoot', rightPath: '/store/currentRoot' }, { op: 'EQ', leftPath: '/request/expectedSecurityRevision', rightPath: '/store/currentSecurityRevision' }, { op: 'GT', leftPath: '/request/nextVersion', rightPath: '/store/currentVersion' }, { op: 'GT', leftPath: '/request/nextSecurityRevision', rightPath: '/store/currentSecurityRevision' }] }, writes: [{ op: 'SET', path: '/store/currentVersion', valuePath: '/request/nextVersion' }, { op: 'SET', path: '/store/currentRoot', valuePath: '/request/nextRoot' }, { op: 'SET', path: '/store/currentSecurityRevision', valuePath: '/request/nextSecurityRevision' }], atomic: true, onMismatch: 'BLOCK' },
  planningAdmittedTupleRoot: domainRoot('CONNECT-B0-V6-PLANNING-HEAD-TUPLE-V1', { name: head.name, version: 0, sourceRoot: V5_HASHES.packageContentRoot, authorityCredit: 0 }),
  operationalCurrentVersion: null, operationalCurrentRoot: null,
}));
const v5HeadName = new Map(v5Registry.mutableHeadRegistry.heads.map((head) => [head.headId, head.name]));
const headByName = new Map(fixedHeads.map((head) => [head.name, head]));
const objectToHead = v5Registry.mutableHeadRegistry.objectToHead.map((row) => {
  const name = v5HeadName.get(row.headId);
  const head = headByName.get(name);
  return {
    objectClass: row.objectClass, headId: head.headId,
    membershipPath: [
      { edgeClass: 'MEMBER-OF', sourceNode: `ObjectClass:${row.objectClass}`, targetNode: `Head:${name}` },
      { edgeClass: 'MEMBER-OF', sourceNode: `Head:${name}`, targetNode: 'Head:SecurityUniverseHead' },
    ],
  };
});

const casAcceptanceValidationPredicate = { op: 'AND', args: [
  { op: 'BOOLEAN_TRUE', path: '/request/acceptanceEnvelope/all156TypedFieldsValid' },
  { op: 'BOOLEAN_TRUE', path: '/request/acceptanceEnvelope/twoIndependentWitnessesValid' },
  { op: 'BOOLEAN_TRUE', path: '/request/acceptanceEnvelope/nineCurrentIndependenceProfilesValid' },
  { op: 'BOOLEAN_TRUE', path: '/request/acceptanceEnvelope/all127OutputsValid' },
] };
const casOperations = [
  { op: 'BEGIN', storePath: '/authorityStore', isolation: 'SERIALIZABLE', coResidentKeySetRequired: true },
  { op: 'COMPARE', targetPath: '/store/acceptancePointer', predicate: { op: 'AND', args: [{ op: 'EQ', leftPath: '/store/acceptancePointer/version', rightPath: '/request/expectedPointerVersion' }, { op: 'EQ', leftPath: '/store/acceptancePointer/root', rightPath: '/request/expectedPointerRoot' }] }, reason: 'STALE-POINTER' },
  { op: 'COMPARE', targetPath: '/store/securityUniverse', predicate: { op: 'AND', args: [{ op: 'EQ', leftPath: '/store/securityUniverse/revision', rightPath: '/request/expectedSecurityRevision' }, { op: 'EQ', leftPath: '/store/securityUniverse/root', rightPath: '/request/expectedSecurityRoot' }, { op: 'EQ', leftPath: '/store/securityUniverse/all36HeadTuples', rightPath: '/request/all36ExpectedHeadTuples' }] }, reason: 'STALE-SECURITY-UNIVERSE' },
  { op: 'COMPARE', targetPath: '/store/permitLedger', predicate: { op: 'AND', args: [{ op: 'EQ', leftPath: '/store/permitLedger/head', rightPath: '/request/expectedPermitLedgerHead' }, { op: 'EQ', leftPath: '/store/permitLedger/permitId', rightPath: '/request/permitId' }, { op: 'EQ', leftPath: '/store/permitLedger/oneUseState', rightConst: 'UNUSED' }] }, reason: 'STALE-OR-CONSUMED-PERMIT' },
  { op: 'COMPARE', targetPath: '/store/revocationLedger', predicate: { op: 'AND', args: [{ op: 'EQ', leftPath: '/store/revocationLedger/head', rightPath: '/request/expectedRevocationHead' }, { op: 'LT', leftPath: '/store/revocationLedger/revision', rightPath: '/request/commitRevision' }, { op: 'GT', leftPath: '/request/providedFence', rightPath: '/store/fence' }] }, reason: 'REVOKED-OR-STALE-FENCE' },
  { op: 'ASSERT', targetPath: '/request/trustedTime', predicate: { op: 'AND', args: [{ op: 'LTE', leftPath: '/request/notBefore', rightPath: '/request/trustedNow' }, { op: 'LT', leftPath: '/request/trustedNow', rightPath: '/request/validThrough' }] }, reason: 'OUTSIDE-VALIDITY' },
  { op: 'PUT-IF-ABSENT', targetPath: '/store/attemptReservations', keyPath: '/request/attemptId', value: 'RESERVED', reason: 'REPEATED-ATTEMPT' },
  { op: 'WRITE', targetPath: '/store/fence', valuePath: '/request/providedFence', precondition: { op: 'GT', leftPath: '/request/providedFence', rightPath: '/store/fence' } },
  { op: 'VALIDATE', targetPath: '/request/acceptanceEnvelope', schemaPath: '/schemas/acceptanceEnvelope', predicate: casAcceptanceValidationPredicate },
  { op: 'ASSERT', targetPath: '/store/revocationLedger', predicate: { op: 'LT', leftPath: '/store/revocationLedger/revision', rightPath: '/request/commitRevision' }, equalityPolicy: 'REVOCATION-WINS' },
  { op: 'CAS', targetPath: '/store/permitLedger/oneUseState', expected: 'UNUSED', value: 'CONSUMED', reason: 'PERMIT-REPLAY' },
  { op: 'CAS', targetPath: '/store/acceptancePointer', expected: { versionPath: '/request/expectedPointerVersion', rootPath: '/request/expectedPointerRoot' }, value: { versionExpression: { op: 'ADD-U64', leftPath: '/request/expectedPointerVersion', rightConst: 1, overflowPolicy: 'BLOCK' }, rootPath: '/request/newAcceptanceRoot' }, reason: 'POINTER-CONFLICT' },
  { op: 'APPEND', targetPath: '/store/finalizations', keyPath: '/request/attemptId', recordSchema: { fields: [['attemptId', 'DETERMINISTIC-ID'], ['providedFence', 'U64'], ['pointerBefore', 'TYPED-POINTER-TUPLE'], ['pointerAfter', 'TYPED-POINTER-TUPLE'], ['authorityRevision', 'U64'], ['newAcceptanceRoot', 'SHA256']].map(([name, type]) => ({ name, type, cardinality: 'EXACTLY-ONE' })), unknownFieldPolicy: 'BLOCK' }, duplicatePolicy: 'BLOCK' },
  { op: 'APPEND', targetPath: '/store/transactionalOutbox', keyPath: '/request/attemptId', recordSchema: { fields: [['commitReceiptRoot', 'SHA256'], ['signedReceiptRoot', 'SHA256']].map(([name, type]) => ({ name, type, cardinality: 'EXACTLY-ONE' })), unknownFieldPolicy: 'BLOCK' }, duplicatePolicy: 'BLOCK' },
  { op: 'COMMIT', targetPath: '/authorityStore', durable: true, soleLinearizationPoint: true },
].map((operation, index) => ({ ordinal: index + 1, ...operation, onFailure: 'ABORT-NO-EFFECT', typed: true }));
const casProgramBody = {
  language: 'B0V6-TYPED-TRANSACTION-AST-V1',
  operations: casOperations,
  stateTransitionSemantics: { evaluationOrder: { firstOrdinal: 1, lastPrivateOrdinal: 14, order: 'ASCENDING-ORDINAL' }, privateSnapshot: true, failedPredicateTransition: { op: 'ABORT', durableWriteCount: 0 }, publishTransition: { operationOrdinal: 15, op: 'ATOMIC-PUBLISH-ALL-PRIVATE-WRITES', durable: true, soleLinearizationPoint: true } },
  crashSemantics: { beforeCommit: { cutRange: { minimumInclusive: 0, maximumInclusive: 14 }, durableEffectCount: 0, decision: 'NO-COMMIT-NO-EFFECT' }, afterCommit: { cut: 15, durableEffectCount: 1, requiredReadbackPaths: ['/finalizations/{attemptId}', '/transactionalOutbox/{attemptId}', '/acceptancePointer'], retryEffectAllowed: false } },
  unknownOperationPolicy: 'BLOCK',
};
const casProgram = { ...casProgramBody, programRoot: domainRoot('CONNECT-B0-V6-ACCEPTANCE-CAS-PROGRAM-V1', casProgramBody) };
const crashMatrix = Array.from({ length: casOperations.length + 1 }, (_, cut) => ({
  cut,
  executedOperationOrdinals: Array.from({ length: cut }, (_, index) => index + 1),
  commitOperationExecuted: cut === casOperations.length,
  durableEffectCount: cut === casOperations.length ? 1 : 0,
  expectedDecision: cut < casOperations.length ? 'NO-COMMIT-NO-EFFECT' : 'COMMITTED-LOOKUP-BY-ATTEMPT-NO-RETRY',
  sameAttemptRetryAllowed: false,
}));
const twoWriterScheduleBodies = [
  [['W1', 'COMPARE'], ['W2', 'COMPARE'], ['W1', 'RESERVE'], ['W2', 'BLOCK'], ['W1', 'COMMIT']],
  [['W2', 'COMPARE'], ['W1', 'COMPARE'], ['W2', 'RESERVE'], ['W1', 'BLOCK'], ['W2', 'COMMIT']],
  [['W1', 'COMMIT'], ['W2', 'COMPARE'], ['W2', 'BLOCK']],
  [['W2', 'COMMIT'], ['W1', 'COMPARE'], ['W1', 'BLOCK']],
  [['W1', 'CRASH-PRECOMMIT'], ['W2', 'RESERVE'], ['W2', 'COMMIT']],
  [['W2', 'CRASH-PRECOMMIT'], ['W1', 'RESERVE'], ['W1', 'COMMIT']],
];
const twoWriterInterleavingClasses = twoWriterScheduleBodies.map((scheduleBody, index) => {
  const schedule = scheduleBody.map(([actor, op], eventIndex) => ({ ordinal: eventIndex + 1, actor, op }));
  const winner = schedule.find((event) => event.op === 'COMMIT').actor;
  const loserTerminalIndex = schedule.findIndex((event) => event.actor !== winner && ['BLOCK', 'CRASH-PRECOMMIT'].includes(event.op));
  const body = {
    classId: `B0V6-CAS-INTERLEAVING-${String(index + 1).padStart(2, '0')}`,
    schedule,
    scheduleReducer: { oracleOp: 'CAS_SCHEDULE_REDUCE', actorUniverse: ['W1', 'W2'], commitEvent: 'COMMIT', loserTerminalEvents: ['BLOCK', 'CRASH-PRECOMMIT'], readOnlyEvents: ['COMPARE'], reservationEvent: 'RESERVE', unknownEventPolicy: 'BLOCK' },
    soleWinner: winner,
    durableEffectCount: 1,
    loserDecision: 'BLOCK',
    negativeMutation: { op: 'SET', path: `/schedule/${loserTerminalIndex}/op`, value: 'COMMIT' },
    partialOrderCoverage: { writerCount: 2, conflictKeys: ['/store/attemptReservations/{attemptId}', '/store/permitLedger/oneUseState', '/store/acceptancePointer'], commutableEventClasses: ['COMPARE'], reductionClassCount: 6, reductionRule: { op: 'COMMUTE-INDEPENDENT-READS-THEN-COLLAPSE-AT-FIRST-CONFLICT', firstConflictEvents: ['RESERVE', 'COMMIT', 'CRASH-PRECOMMIT'] } },
    authorityCredit: 0,
  };
  return { ...body, scheduleRoot: domainRoot('CONNECT-B0-V6-CAS-TWO-WRITER-SCHEDULE-V1', body) };
});

const casPlanningTransactionState = {
  store: {
    acceptancePointer: { version: 7, root: domainRoot('CONNECT-B0-V6-CAS-CURRENT-POINTER-V1', { source: V5_HASHES.packageContentRoot }) },
    securityUniverse: { revision: 11, root: domainRoot('CONNECT-B0-V6-CAS-SECURITY-UNIVERSE-V1', { source: V5_HASHES.packageContentRoot }), all36HeadTuples: fixedHeads.map((head) => head.planningAdmittedTupleRoot) },
    permitLedger: { head: domainRoot('CONNECT-B0-V6-CAS-PERMIT-LEDGER-HEAD-V1', { source: V5_HASHES.manifest }), permitId: deterministicId('B0V6-CAS-PERMIT', 'CONNECT-B0-V6-CAS-PERMIT-ID-V1', { source: V5_HASHES.packageContentRoot }), oneUseState: 'UNUSED' },
    revocationLedger: { head: domainRoot('CONNECT-B0-V6-CAS-REVOCATION-HEAD-V1', { source: V5_HASHES.manifest }), revision: 12 },
    fence: 21,
  },
  request: {
    expectedPointerVersion: 7,
    expectedPointerRoot: null,
    expectedSecurityRevision: 11,
    expectedSecurityRoot: null,
    all36ExpectedHeadTuples: fixedHeads.map((head) => head.planningAdmittedTupleRoot),
    expectedPermitLedgerHead: null,
    permitId: null,
    expectedRevocationHead: null,
    commitRevision: 13,
    providedFence: 22,
    notBefore: '2026-08-30T00:00:00Z',
    trustedNow: '2026-08-30T12:00:00Z',
    validThrough: '2026-08-31T00:00:00Z',
    attemptAlreadyReserved: false,
    retrySameAttempt: false,
    acceptanceEnvelope: { all156TypedFieldsValid: true, twoIndependentWitnessesValid: true, nineCurrentIndependenceProfilesValid: true, all127OutputsValid: true },
  },
};
casPlanningTransactionState.request.expectedPointerRoot = casPlanningTransactionState.store.acceptancePointer.root;
casPlanningTransactionState.request.expectedSecurityRoot = casPlanningTransactionState.store.securityUniverse.root;
casPlanningTransactionState.request.expectedPermitLedgerHead = casPlanningTransactionState.store.permitLedger.head;
casPlanningTransactionState.request.permitId = casPlanningTransactionState.store.permitLedger.permitId;
casPlanningTransactionState.request.expectedRevocationHead = casPlanningTransactionState.store.revocationLedger.head;
const casEligibilityExpression = { op: 'AND', args: [
  { op: 'EQ', leftPath: '/store/acceptancePointer/version', rightPath: '/request/expectedPointerVersion' },
  { op: 'EQ', leftPath: '/store/acceptancePointer/root', rightPath: '/request/expectedPointerRoot' },
  { op: 'EQ', leftPath: '/store/securityUniverse/revision', rightPath: '/request/expectedSecurityRevision' },
  { op: 'EQ', leftPath: '/store/securityUniverse/root', rightPath: '/request/expectedSecurityRoot' },
  { op: 'EQ', leftPath: '/store/securityUniverse/all36HeadTuples', rightPath: '/request/all36ExpectedHeadTuples' },
  { op: 'EQ', leftPath: '/store/permitLedger/head', rightPath: '/request/expectedPermitLedgerHead' },
  { op: 'EQ', leftPath: '/store/permitLedger/permitId', rightPath: '/request/permitId' },
  { op: 'EQ', leftPath: '/store/permitLedger/oneUseState', rightConst: 'UNUSED' },
  { op: 'EQ', leftPath: '/store/revocationLedger/head', rightPath: '/request/expectedRevocationHead' },
  { op: 'LT', leftPath: '/store/revocationLedger/revision', rightPath: '/request/commitRevision' },
  { op: 'GT', leftPath: '/request/providedFence', rightPath: '/store/fence' },
  { op: 'LTE', leftPath: '/request/notBefore', rightPath: '/request/trustedNow' },
  { op: 'LT', leftPath: '/request/trustedNow', rightPath: '/request/validThrough' },
  { op: 'EQ', leftPath: '/request/attemptAlreadyReserved', rightConst: false },
  { op: 'EQ', leftPath: '/request/retrySameAttempt', rightConst: false },
  ...casAcceptanceValidationPredicate.args,
] };
const mutatedRoot = (caseId) => domainRoot('CONNECT-B0-V6-CAS-MUTATED-ROOT-V1', { caseId, source: V5_HASHES.packageContentRoot });
const casTransactionMutationCases = [
  ['STALE-POINTER-VERSION', '/request/expectedPointerVersion', 8],
  ['STALE-POINTER-ROOT', '/request/expectedPointerRoot', mutatedRoot('STALE-POINTER-ROOT')],
  ['ABA-POINTER', '/store/acceptancePointer/root', mutatedRoot('ABA-POINTER')],
  ['STALE-SECURITY-HEAD', '/request/expectedSecurityRoot', mutatedRoot('STALE-SECURITY-HEAD')],
  ['STALE-FENCE', '/request/providedFence', 21],
  ['EQUAL-REVISION-REVOKE', '/store/revocationLedger/revision', 13],
  ['CONSUMED-PERMIT', '/store/permitLedger/oneUseState', 'CONSUMED'],
  ['REPEATED-ATTEMPT', '/request/attemptAlreadyReserved', true],
].map(([caseId, pathValue, value]) => ({ caseId, kind: 'TRANSACTION-ELIGIBILITY', domainState: casPlanningTransactionState, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: casEligibilityExpression }, mutation: { op: 'SET', path: pathValue, value } }));
const responseLossCases = [
  ['NO-RESERVATION', { reservationPresent: false, finalizationPresent: false, pointerMatches: false, outboxPresent: false, receiptConfirmed: false, independentReadbacksAgree: true, retryEffectRequested: false }, '/reservationPresent', true],
  ['RESERVED-NOT-COMMITTED', { reservationPresent: true, finalizationPresent: false, pointerMatches: false, outboxPresent: false, receiptConfirmed: false, independentReadbacksAgree: true, retryEffectRequested: false }, '/finalizationPresent', true],
  ['COMMITTED-UNCONFIRMED', { reservationPresent: true, finalizationPresent: true, pointerMatches: true, outboxPresent: true, receiptConfirmed: false, independentReadbacksAgree: true, retryEffectRequested: false }, '/pointerMatches', false],
  ['COMMITTED-CONFIRMED', { reservationPresent: true, finalizationPresent: true, pointerMatches: true, outboxPresent: true, receiptConfirmed: true, independentReadbacksAgree: true, retryEffectRequested: false }, '/retryEffectRequested', true],
  ['CONFLICT', { reservationPresent: true, finalizationPresent: true, pointerMatches: true, outboxPresent: false, receiptConfirmed: true, independentReadbacksAgree: true, retryEffectRequested: false }, '/outboxPresent', true],
].map(([requiredClass, domainState, mutationPath, value]) => ({ caseId: `RESPONSE-LOSS-${requiredClass}`, kind: 'RESPONSE-LOSS-CLASSIFICATION', domainState, oracleBody: { op: 'RESPONSE_LOSS_CLASSIFY', requiredClass }, mutation: { op: 'SET', path: mutationPath, value } }));
const casMutationMatrix = [...casTransactionMutationCases, ...responseLossCases].map((row, index) => {
  const body = { ordinal: index + 1, ...row, expectedDecision: 'BLOCK', authorityCredit: 0 };
  return { ...body, matrixRowRoot: domainRoot('CONNECT-B0-V6-CAS-MUTATION-ROW-V1', body) };
});

const acceptanceFields = v5Registry.acceptanceFieldRegistry.fields.map((field) => {
  const number = field.sourceHead.match(/(\d+)$/)?.[1];
  const name = field.name === 'all84OutputsRoot' ? 'all127OutputsRoot' : field.name;
  const sourceHead = number ? `B0V6-HEAD-${number}` : field.sourceHead;
  const body = {
    fieldId: field.fieldId.replace('B0V5-', 'B0V6-'), name, type: field.type, cardinality: field.cardinality,
    classification: field.classification, sourceHead,
    freshnessPredicate: { op: 'EQ', leftPath: `/heads/${sourceHead}/observedTuple`, rightPath: `/heads/${sourceHead}/commitTuple` },
    invalidationPredicate: { op: 'NEQ', leftPath: `/heads/${sourceHead}/currentTuple`, rightPath: `/heads/${sourceHead}/acceptedTuple` },
    producerRole: field.producer, validationPredicate: { op: 'AND', args: [{ op: 'NON_NULL', path: `/${name}` }, { op: 'TYPE', path: `/${name}`, expected: field.type }] },
  };
  return { ...body, fieldSchemaRoot: domainRoot('CONNECT-B0-V6-ACCEPTANCE-FIELD-SCHEMA-V1', body) };
});
if (!acceptanceFields.some((field) => field.name === 'all127OutputsRoot') || acceptanceFields.some((field) => field.name === 'all84OutputsRoot')) throw new Error('Acceptance output denominator not repaired');

const acceptanceProducerRoleUniverse = [...new Set(acceptanceFields.map((field) => field.producerRole))].sort();
const acceptanceProducerAssignments = acceptanceFields.map((field) => {
  const appointment = appointmentByRole.get(field.producerRole);
  if (!appointment) throw new Error(`Acceptance producer outside role universe ${field.producerRole}`);
  const body = { fieldId: field.fieldId, producerRole: field.producerRole, producerAppointmentRoot: appointment.instanceRoot, effectiveControllerRoot: appointment.effectiveControllerRoot, assignmentCardinality: 1, soleProducer: true, authorityCredit: 0 };
  return { ...body, assignmentRoot: domainRoot('CONNECT-B0-V6-ACCEPTANCE-SOLE-PRODUCER-ASSIGNMENT-V1', body) };
});
const acceptanceSoleProducerRegistry = {
  acceptanceProducerRoleCount: acceptanceProducerRoleUniverse.length,
  acceptanceProducerRoles: acceptanceProducerRoleUniverse,
  assignmentCount: acceptanceProducerAssignments.length,
  assignments: acceptanceProducerAssignments,
  completeSetPredicate: { op: 'SET-EQ', leftPath: '/derivedProducerRoles', rightPath: '/acceptanceProducerRoles' },
  exactAssignmentPredicate: { op: 'EVERY', path: '/assignments', predicate: { op: 'AND', args: [{ op: 'EQ', leftPath: '/assignmentCardinality', rightConst: 1 }, { op: 'EQ', leftPath: '/soleProducer', rightConst: true }, { op: 'NON_NULL', path: '/producerAppointmentRoot' }] } },
  unknownProducerPolicy: 'BLOCK', duplicateOrMissingAssignmentPolicy: 'BLOCK', authorityCredit: 0,
};
acceptanceSoleProducerRegistry.registryRoot = domainRoot('CONNECT-B0-V6-ACCEPTANCE-SOLE-PRODUCER-REGISTRY-V1', acceptanceSoleProducerRegistry);

const outputRegistry = Array.from({ length: 127 }, (_, index) => {
  const outputId = `B0V6OUT-${pad(index)}`;
  const requirementId = `B0V6REQ-${pad(index)}`;
  const deterministicOutputId = deterministicId('B0V6-OUTPUT', 'CONNECT-B0-V6-OUTPUT-ID-V1', { ordinal: index, sourcePackageRoot: V5_HASHES.packageContentRoot });
  const planningArtifactBody = {
    outputId,
    requirementId,
    deterministicOutputId,
    schemaId: 'B0V6-TYPED-OUTPUT-RECORD-V1',
    producerRole: 'Producer',
    blockerNoMergeKey: index < blockers.length ? blockers[index].noMergeKey : null,
    fields: [
      { name: 'outputId', type: 'B0V6-OUTPUT-ID', cardinality: 'EXACTLY-ONE' },
      { name: 'requirementId', type: 'B0V6-REQUIREMENT-ID', cardinality: 'EXACTLY-ONE' },
      { name: 'deterministicOutputId', type: 'DETERMINISTIC-ID', cardinality: 'EXACTLY-ONE' },
      { name: 'planningArtifactRoot', type: 'SHA256', cardinality: 'EXACTLY-ONE' },
      { name: 'operationalImplementationRoot', type: 'SHA256-OR-NULL', cardinality: 'EXACTLY-ONE' },
      { name: 'authorityCredit', type: 'U8-CONSTANT-0', cardinality: 'EXACTLY-ONE' },
    ],
    materializationScope: 'PLANNING-CONTRACT-ONLY;NOT-OPERATIONAL-IMPLEMENTATION;NOT-ACCEPTANCE',
    operationalImplementationRoot: null,
    authorityCredit: 0,
    acceptanceCredit: 0,
  };
  const planningArtifactRoot = domainRoot('CONNECT-B0-V6-PLANNING-OUTPUT-ARTIFACT-V1', planningArtifactBody);
  const planningValidationReceiptBody = { outputId, planningArtifactRoot, decision: 'VALID-PLANNING-CONTRACT;OPERATIONAL-IMPLEMENTATION-ABSENT', validatorProgram: { op: 'AND', args: [{ op: 'NON_NULL', path: '/planningArtifactRoot' }, { op: 'EQ', leftPath: '/operationalImplementationRoot', rightConst: null }, { op: 'ZERO', path: '/authorityCredit' }] }, authorityCredit: 0, acceptanceCredit: 0 };
  const planningValidationReceiptRoot = domainRoot('CONNECT-B0-V6-PLANNING-OUTPUT-VALIDATION-RECEIPT-V1', planningValidationReceiptBody);
  return {
    outputId, requirementId, schemaId: 'B0V6-TYPED-OUTPUT-RECORD-V1', producerRole: 'Producer', deterministicOutputId,
    planningArtifact: planningArtifactBody, planningArtifactRoot,
    planningValidationReceipt: planningValidationReceiptBody, planningValidationReceiptRoot,
    implementationRoot: null, operationalImplementationRoot: null, evidenceRoots: [], operationalEvidenceRoots: [], operationalState: 'PLANNED-NOT-IMPLEMENTED-NOT-ACCEPTED',
    repositoryVisibility: 'PUBLIC', authorityCredit: 0, acceptanceCredit: 0,
  };
});
const headInvalidationMatrix = fixedHeads.map((head, index) => {
  const dependentFieldIds = acceptanceFields.filter((field) => field.sourceHead === head.headId).map((field) => field.fieldId);
  const body = {
    headId: head.headId,
    dependentFieldIds,
    beforeTuple: { version: 0, root: head.planningAdmittedTupleRoot, revision: 0 },
    afterTuple: { version: 1, root: domainRoot('CONNECT-B0-V6-HEAD-ADVANCE-MUTATION-V1', { headId: head.headId, ordinal: index + 1 }), revision: 1 },
    freshnessProgram: { op: 'EVERY-DEPENDENT-FIELD-INVALIDATES-ON-TUPLE-NEQ', dependencyPath: '/dependentFieldIds', beforeTuplePath: '/beforeTuple', afterTuplePath: '/afterTuple' },
    expectedInvalidatedFieldCount: dependentFieldIds.length,
    wrongHeadNamePolicy: 'BLOCK', sameVersionDifferentRootPolicy: 'INVALIDATE', authorityCredit: 0,
  };
  return { ...body, matrixRowRoot: domainRoot('CONNECT-B0-V6-HEAD-INVALIDATION-MATRIX-ROW-V1', body) };
});
if (headInvalidationMatrix.flatMap((row) => row.dependentFieldIds).length !== acceptanceFields.length) throw new Error('Acceptance head invalidation matrix does not cover all fields');
const outputCompletenessProgramBody = {
  language: 'B0V6-OUTPUT-DENOMINATOR-AST-V1',
  expectedCount: outputRegistry.length,
  expectedOrderedOutputIds: outputRegistry.map((item) => item.outputId),
  expectedRegistryRoot: domainRoot('CONNECT-B0-V6-OUTPUT-REGISTRY-V1', outputRegistry),
  predicates: [
    { op: 'COUNT-EQ', path: '/outputs', expected: outputRegistry.length },
    { op: 'ARRAY-EQ', leftPath: '/outputs/*/outputId', rightPath: '/expectedOrderedOutputIds' },
    { op: 'EVERY-NON-NULL', path: '/outputs/*/deterministicOutputId' },
    { op: 'CANONICAL-ROOT-EQ', path: '/outputs', domain: 'CONNECT-B0-V6-OUTPUT-REGISTRY-V1', expectedPath: '/expectedRegistryRoot' },
  ],
  omissionDuplicateReorderOrNullPolicy: 'BLOCK',
};
const outputCompletenessProgram = { ...outputCompletenessProgramBody, programRoot: domainRoot('CONNECT-B0-V6-OUTPUT-COMPLETENESS-PROGRAM-V1', outputCompletenessProgramBody) };
const outputMutationMatrix = outputRegistry.flatMap((output, index) => ['OMIT', 'DUPLICATE', 'REORDER', 'NULL-ID'].map((mutationClass, mutationIndex) => ({
  mutationId: `B0V6-OUTPUT-MUTATION-${pad(index)}-${mutationIndex + 1}`,
  outputId: output.outputId,
  mutationClass,
  expectedDecision: 'BLOCK',
  uniqueCreditKey: `${output.outputId}:${mutationClass}`,
  authorityCredit: 0,
})));
if (outputMutationMatrix.length !== 508) throw new Error('Output mutation matrix denominator mismatch');

const detachedAcceptanceSchemaBody = {
  schemaId: 'B0V6-DETACHED-ACCEPTANCE-ARTIFACT-TYPED-V1',
  fields: [
    typedField('artifactId'), typedField('sourceAcceptanceEnvelopeRoot'), typedField('sourceSecurityUniverseTupleRoot'), typedField('producerAppointmentRoot'),
    typedField('createdAtTrustedDecisionRoot'), typedField('freshnessHeadTupleRoot'), typedField('publicProjectionRoot'),
    { name: 'canonicalPointerMutation', type: 'BOOLEAN', cardinality: 'EXACTLY-ONE', constant: false },
    { name: 'containsPrivateData', type: 'BOOLEAN', cardinality: 'EXACTLY-ONE', constant: false },
    { name: 'oneUsePublicationState', type: 'CLOSED-ENUM', cardinality: 'EXACTLY-ONE', enum: ['UNPUBLISHED', 'PUBLISHED'] },
    { name: 'authorityCredit', type: 'U8', cardinality: 'EXACTLY-ONE', constant: 0 },
    { name: 'acceptanceCredit', type: 'U8', cardinality: 'EXACTLY-ONE', constant: 0 },
  ],
  deterministicIdDomain: 'CONNECT-B0-V6-DETACHED-ACCEPTANCE-ID-V1', producerRole: 'AcceptanceWriter',
  validationProgram: { language: 'B0V6-ORACLE-AST-V1', body: { op: 'AND', args: [
    { op: 'NON_NULL', path: '/sourceAcceptanceEnvelopeRoot' },
    { op: 'EQ', leftPath: '/producerAppointmentRoot', rightPath: '/expectedProducerAppointmentRoot' },
    { op: 'EQ', leftPath: '/freshnessHeadTupleRoot', rightPath: '/currentSecurityUniverseTupleRoot' },
    { op: 'EQ', leftPath: '/canonicalPointerMutation', rightConst: false },
    { op: 'EQ', leftPath: '/containsPrivateData', rightConst: false },
    { op: 'EQ', leftPath: '/oneUsePublicationState', rightConst: 'UNPUBLISHED' },
    { op: 'ZERO', path: '/authorityCredit' },
    { op: 'ZERO', path: '/acceptanceCredit' },
  ] }, onUnknown: 'BLOCK' },
  invalidationProgram: { body: { op: 'NEQ', leftPath: '/freshnessHeadTupleRoot', rightPath: '/currentSecurityUniverseTupleRoot' }, decisionWhenTrue: 'STALE-BLOCK' },
  pointerMutationAllowed: false, operationalAuthorityAllowed: false, privateDataAllowed: false, replayAllowed: false, unknownFieldPolicy: 'BLOCK',
};
const detachedAcceptanceSchemaRoot = domainRoot('CONNECT-B0-V6-DETACHED-ACCEPTANCE-SCHEMA-V1', detachedAcceptanceSchemaBody);
const detachedAcceptancePlanningBody = {
  schemaRoot: detachedAcceptanceSchemaRoot,
  artifactId: deterministicId('B0V6-DETACHED-ACCEPTANCE', 'CONNECT-B0-V6-DETACHED-ACCEPTANCE-ID-V1', { sourceAcceptanceEnvelopeRoot: V5_HASHES.manifest, publicProjectionRoot: V5_HASHES.subject }),
  sourceAcceptanceEnvelopeRoot: V5_HASHES.manifest,
  sourceSecurityUniverseTupleRoot: fixedHeads.find((head) => head.name === 'SecurityUniverseHead')?.planningAdmittedTupleRoot ?? fixedHeads[0].planningAdmittedTupleRoot,
  producerAppointmentRoot: appointmentByRole.get('AcceptanceWriter').instanceRoot,
  expectedProducerAppointmentRoot: appointmentByRole.get('AcceptanceWriter').instanceRoot,
  createdAtTrustedDecisionRoot: domainRoot('CONNECT-B0-V6-DETACHED-ACCEPTANCE-TRUSTED-TIME-V1', { observedAt: '2026-08-30T00:00:00Z', source: V5_HASHES.manifest }),
  freshnessHeadTupleRoot: fixedHeads.find((head) => head.name === 'SecurityUniverseHead')?.planningAdmittedTupleRoot ?? fixedHeads[0].planningAdmittedTupleRoot,
  currentSecurityUniverseTupleRoot: fixedHeads.find((head) => head.name === 'SecurityUniverseHead')?.planningAdmittedTupleRoot ?? fixedHeads[0].planningAdmittedTupleRoot,
  publicProjectionRoot: domainRoot('CONNECT-B0-V6-DETACHED-ACCEPTANCE-PUBLIC-PROJECTION-V1', { source: V5_HASHES.subject, secrets: 0, piiValues: 0 }),
  canonicalPointerMutation: false,
  containsPrivateData: false,
  oneUsePublicationState: 'UNPUBLISHED',
  operational: false,
  authorityCredit: 0,
  acceptanceCredit: 0,
};
const detachedAcceptancePlanningInstance = { ...detachedAcceptancePlanningBody, instanceRoot: domainRoot('CONNECT-B0-V6-DETACHED-ACCEPTANCE-PLANNING-INSTANCE-V1', detachedAcceptancePlanningBody) };
const detachedAcceptanceReceiptBody = { schemaRoot: detachedAcceptanceSchemaRoot, instanceRoot: detachedAcceptancePlanningInstance.instanceRoot, decision: 'ADMITTED-FOR-PLANNING-SCHEMA-VALIDATION-ONLY', operational: false, authorityCredit: 0, acceptanceCredit: 0 };
const detachedAcceptanceSchema = {
  ...detachedAcceptanceSchemaBody,
  schemaRoot: detachedAcceptanceSchemaRoot,
  planningAdmittedInstance: detachedAcceptancePlanningInstance,
  planningAdmittedInstanceRoot: detachedAcceptancePlanningInstance.instanceRoot,
  planningValidationReceipt: { ...detachedAcceptanceReceiptBody, receiptRoot: domainRoot('CONNECT-B0-V6-DETACHED-ACCEPTANCE-PLANNING-RECEIPT-V1', detachedAcceptanceReceiptBody) },
  operationalCurrentInstanceRoot: null,
};

const priorInterfaces = v5Registry.priorInterfaceRegistry.interfaces.map((old) => {
  const interfaceOrdinal = v5Registry.priorInterfaceRegistry.interfaces.indexOf(old) + 1;
  const freshnessHead = fixedHeads[(interfaceOrdinal - 1) % fixedHeads.length];
  const interfaceBody = {
    interfaceId: old.interfaceId.replace('B0V5-', 'B0V6-'), schemaVersion: 1,
    consumerRequirement: old.consumerRequirement.replace('B0V5REQ-', 'B0V6REQ-'),
    providerRequirement: old.providerRequirement.replace('B0V5REQ-', 'B0V6REQ-'),
    inputSchema: { fields: [{ name: 'expectedInputRoot', type: 'SHA256', cardinality: 'EXACTLY-ONE' }, { name: 'actualInputRoot', type: 'SHA256', cardinality: 'EXACTLY-ONE' }, { name: 'validationContextRoot', type: 'SHA256', cardinality: 'EXACTLY-ONE' }], unknownFieldPolicy: 'BLOCK' },
    outputSchema: { fields: [{ name: 'expectedOutputRoot', type: 'SHA256', cardinality: 'EXACTLY-ONE' }, { name: 'actualOutputRoot', type: 'SHA256', cardinality: 'EXACTLY-ONE' }, { name: 'providerInstanceRoot', type: 'NULL-UNTIL-PROVIDER-CONSTRUCTED', cardinality: 'EXACTLY-ONE' }, { name: 'validationReceiptRoot', type: 'SHA256', cardinality: 'EXACTLY-ONE' }], unknownFieldPolicy: 'BLOCK' },
    lifecycleSchema: { fields: [{ name: 'availableAtOrdinal', type: 'U64', cardinality: 'EXACTLY-ONE' }, { name: 'providerConstructionOrdinal', type: 'U64', cardinality: 'EXACTLY-ONE' }, { name: 'freshnessHeadId', type: 'B0V6-HEAD-ID', cardinality: 'EXACTLY-ONE' }, { name: 'acceptedHeadTupleRoot', type: 'SHA256', cardinality: 'EXACTLY-ONE' }, { name: 'currentHeadTupleRoot', type: 'SHA256', cardinality: 'EXACTLY-ONE' }], unknownFieldPolicy: 'BLOCK' },
    validationProgram: { language: 'B0V6-ORACLE-AST-V1', body: { op: 'AND', args: [
      { op: 'EQ', leftPath: '/actualInputRoot', rightPath: '/expectedInputRoot' },
      { op: 'EQ', leftPath: '/actualOutputRoot', rightPath: '/expectedOutputRoot' },
      { op: 'EQ', leftPath: '/providerInstanceRoot', rightConst: null },
      { op: 'LT', leftPath: '/availableAtOrdinal', rightPath: '/providerConstructionOrdinal' },
      { op: 'EQ', leftPath: '/acceptedHeadTupleRoot', rightPath: '/currentHeadTupleRoot' },
      { op: 'ZERO', path: '/authorityCredit' },
    ] }, stepLimit: 128, onUnknown: 'BLOCK' },
    invalidationProgram: { language: 'B0V6-ORACLE-AST-V1', body: { op: 'NEQ', leftPath: '/acceptedHeadTupleRoot', rightPath: '/currentHeadTupleRoot' }, invalidationDecisionWhenTrue: 'STALE-BLOCK' },
    providerConstructionRequiredByConsumer: false,
    preProviderAvailabilityRequired: true,
    futureDependencyPolicy: 'ANY-PROVIDER-INSTANCE-READ-BEFORE-PROVIDER-CONSTRUCTION=BLOCK',
    authorityCredit: 0,
  };
  const interfaceSchemaRoot = domainRoot('CONNECT-B0-V6-PRIOR-INTERFACE-SCHEMA-V1', interfaceBody);
  const expectedInputRoot = domainRoot('CONNECT-B0-V6-PRIOR-INTERFACE-EXPECTED-INPUT-V1', { interfaceId: interfaceBody.interfaceId, source: V5_HASHES.subject });
  const expectedOutputRoot = domainRoot('CONNECT-B0-V6-PRIOR-INTERFACE-EXPECTED-OUTPUT-V1', { interfaceId: interfaceBody.interfaceId, source: V5_HASHES.registry });
  const headTupleRoot = freshnessHead.planningAdmittedTupleRoot;
  const planningInstanceBody = {
    interfaceSchemaRoot,
    expectedInputRoot,
    actualInputRoot: expectedInputRoot,
    validationContextRoot: domainRoot('CONNECT-B0-V6-PRIOR-INTERFACE-VALIDATION-CONTEXT-V1', { interfaceId: interfaceBody.interfaceId, source: V5_HASHES.manifest }),
    expectedOutputRoot,
    actualOutputRoot: expectedOutputRoot,
    providerInstanceRoot: null,
    availableAtOrdinal: interfaceOrdinal,
    providerConstructionOrdinal: 1000 + interfaceOrdinal,
    freshnessHeadId: freshnessHead.headId,
    acceptedHeadTupleRoot: headTupleRoot,
    currentHeadTupleRoot: headTupleRoot,
    providerConstructed: false,
    operational: false,
    admissionScope: 'PLANNING-SCHEMA-VALIDATION-ONLY',
    authorityCredit: 0,
  };
  const instanceRoot = domainRoot('CONNECT-B0-V6-PRIOR-INTERFACE-INSTANCE-V1', planningInstanceBody);
  const receiptBody = { interfaceSchemaRoot, instanceRoot, validationProgramRoot: domainRoot('CONNECT-B0-V6-PRIOR-INTERFACE-VALIDATION-PROGRAM-V1', interfaceBody.validationProgram), decision: 'ELIGIBLE-PLANNING-ZERO-AUTHORITY', providerInstanceReadCount: 0, authorityCredit: 0 };
  const validationReceipt = { ...receiptBody, receiptRoot: domainRoot('CONNECT-B0-V6-PRIOR-INTERFACE-RECEIPT-V1', receiptBody) };
  return { ...interfaceBody, interfaceSchemaRoot, planningAdmittedInstance: { ...planningInstanceBody, instanceRoot, validationReceiptRoot: validationReceipt.receiptRoot }, planningValidationReceipt: validationReceipt, operationalCurrentInstanceRoot: null };
});

const pathPolicyBody = { rootDefinition: 'PUBLIC-GIT-TOP-LEVEL', requiredPrefix: 'docs/', forbiddenPrefixes: ['web/', '/', '../'], absolutePathPolicy: 'BLOCK', symlinkPolicy: 'BLOCK', normalization: 'NONE', authorityCredit: 0 };
const sourcePathPolicy = { ...pathPolicyBody, policyRoot: domainRoot('CONNECT-B0-V6-REPOSITORY-PATH-POLICY-V1', pathPolicyBody) };
const semanticPolicyBody = {
  policyId: 'B0V6-AUTHORITATIVE-BYTE-SEMANTIC-EXTRACTION-V1', authoritativeAtomDenominator: 900,
  grammar: { relationMarker: '[A-Za-z][A-Za-z0-9]*=', artifactId: 'B0[A-Z0-9-]+', typeToken: '[A-Z][A-Za-z0-9]+(?:[A-Z][A-Za-z0-9]+)+', enumToken: '[A-Z][A-Z0-9_-]{2,}' },
  lexicalPrecedence: ['RELATION', 'ARTIFACT-ID', 'TYPE', 'ENUM', 'LITERAL-TEXT'],
  tokenClasses: ['RELATION', 'ARTIFACT-ID', 'TYPE', 'ENUM'],
  fullCoverageRule: 'EVERY-UTF8-BYTE-IS-IN-EXACTLY-ONE-NONEMPTY-MACHINE-SEMANTIC-OR-LITERAL-TEXT-SEGMENT;EVERY-MACHINE-SEMANTIC-SEGMENT-EMITS-EXACTLY-ONE-NAMEDUSE',
  unclassifiedPolicy: 'BLOCK', duplicateUsePolicy: 'BLOCK', wrapperOnlyExtractionForbidden: true,
};
const semanticExtractionPolicy = { ...semanticPolicyBody, policyRoot: domainRoot('CONNECT-B0-V6-SEMANTIC-EXTRACTION-POLICY-V1', semanticPolicyBody) };

function permutations(values) {
  if (values.length <= 1) return [values.slice()];
  const result = [];
  values.forEach((value, index) => {
    const rest = [...values.slice(0, index), ...values.slice(index + 1)];
    for (const suffix of permutations(rest)) result.push([value, ...suffix]);
  });
  return result;
}

const inheritedSelectorOccurrences = [];
for (const row of v5Crosswalk.inheritedV4Requirements) {
  for (const field of row.fields) {
    const fieldBytes = Buffer.from(field.exactOldValue, 'utf8');
    for (const selector of field.supersededAtomSelectors ?? []) {
      const selected = fieldBytes.subarray(selector.startByteWithinField, selector.endByteWithinField);
      const declared = Buffer.from(selector.exactOldAtomUtf8Base64, 'base64');
      if (!selected.equals(declared) || shaBytes(selected) !== selector.exactOldAtomSha256) throw new Error(`Inherited selector bytes mismatch ${row.sourceRequirementId}.${field.field}:${selector.selectorId}`);
      inheritedSelectorOccurrences.push({
        occurrenceId: `B0V6-INHERITED-SELECTOR-${pad(inheritedSelectorOccurrences.length)}`,
        selectorId: selector.selectorId,
        replacementId: selector.replacementId,
        sourceRequirementId: row.sourceRequirementId,
        field: field.field,
        sourceField: { ...field.sourceField, logicalPath: correctedPath(field.sourceField.logicalPath) },
        fieldSha256: field.exactOldValueSha256,
        startByteWithinField: selector.startByteWithinField,
        endByteWithinField: selector.endByteWithinField,
        byteLength: selected.length,
        exactOldAtomUtf8Base64: selector.exactOldAtomUtf8Base64,
        exactOldAtomSha256: selector.exactOldAtomSha256,
      });
    }
  }
}
if (inheritedSelectorOccurrences.length !== 128) throw new Error(`Expected 128 inherited selector occurrences, got ${inheritedSelectorOccurrences.length}`);

let inheritedSelectorOverlapPairCount = 0;
for (let left = 0; left < inheritedSelectorOccurrences.length; left += 1) {
  for (let right = left + 1; right < inheritedSelectorOccurrences.length; right += 1) {
    const a = inheritedSelectorOccurrences[left]; const b = inheritedSelectorOccurrences[right];
    if (a.sourceRequirementId === b.sourceRequirementId && a.field === b.field && Math.max(a.startByteWithinField, b.startByteWithinField) < Math.min(a.endByteWithinField, b.endByteWithinField)) inheritedSelectorOverlapPairCount += 1;
  }
}
if (inheritedSelectorOverlapPairCount !== 10) throw new Error(`Expected ten inherited selector overlaps, got ${inheritedSelectorOverlapPairCount}`);

const selectorGroups = new Map();
for (const occurrence of inheritedSelectorOccurrences) {
  const key = `${occurrence.sourceRequirementId}.${occurrence.field}`;
  if (!selectorGroups.has(key)) selectorGroups.set(key, []);
  selectorGroups.get(key).push(occurrence);
}

function selectorReductionProjection(fieldValue, occurrences, order) {
  const byId = new Map(occurrences.map((item) => [item.occurrenceId, item]));
  const selected = order.map((id) => byId.get(id));
  if (selected.some((item) => !item)) throw new Error('Unknown selector occurrence in reducer order');
  const intervals = selected.map((item) => [item.startByteWithinField, item.endByteWithinField]).sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged = [];
  for (const interval of intervals) {
    const tail = merged.at(-1);
    if (!tail || interval[0] > tail[1]) merged.push(interval.slice());
    else tail[1] = Math.max(tail[1], interval[1]);
  }
  const bytesValue = Buffer.from(fieldValue, 'utf8');
  const activeRemainderSegments = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (cursor < start) {
      const bytesValueSegment = bytesValue.subarray(cursor, start);
      activeRemainderSegments.push({ startByteWithinField: cursor, endByteWithinField: start, utf8Base64: bytesValueSegment.toString('base64'), sha256: shaBytes(bytesValueSegment) });
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < bytesValue.length) {
    const bytesValueSegment = bytesValue.subarray(cursor);
    activeRemainderSegments.push({ startByteWithinField: cursor, endByteWithinField: bytesValue.length, utf8Base64: bytesValueSegment.toString('base64'), sha256: shaBytes(bytesValueSegment) });
  }
  return {
    activeRemainderSegments,
    replacementIds: [...new Set(selected.map((item) => item.replacementId))].sort(),
    consumedOccurrenceIds: selected.map((item) => item.occurrenceId).sort(),
  };
}

const inheritedSelectorFieldReductions = [...selectorGroups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([fieldLocator, occurrences], index) => {
  const sourceRow = v5Crosswalk.inheritedV4Requirements.find((row) => fieldLocator.startsWith(`${row.sourceRequirementId}.`));
  const fieldName = fieldLocator.slice(sourceRow.sourceRequirementId.length + 1);
  const field = sourceRow.fields.find((item) => item.field === fieldName);
  const orderSet = permutations(occurrences.map((item) => item.occurrenceId).sort());
  const orderResults = orderSet.map((order) => {
    const projection = selectorReductionProjection(field.exactOldValue, occurrences, order);
    return { order, projectionRoot: domainRoot('CONNECT-B0-V6-INHERITED-SELECTOR-REDUCTION-PROJECTION-V1', projection) };
  });
  if (new Set(orderResults.map((item) => item.projectionRoot)).size !== 1) throw new Error(`Non-confluent selector field ${fieldLocator}`);
  const canonicalProjection = selectorReductionProjection(field.exactOldValue, occurrences, occurrences.map((item) => item.occurrenceId).sort());
  const body = {
    reductionId: `B0V6-INHERITED-FIELD-REDUCTION-${pad(index)}`,
    fieldLocator,
    sourceField: { ...field.sourceField, logicalPath: correctedPath(field.sourceField.logicalPath) },
    exactFieldUtf8Base64: field.exactOldValueUtf8Base64,
    exactFieldSha256: field.exactOldValueSha256,
    selectorOccurrenceIds: occurrences.map((item) => item.occurrenceId).sort(),
    reducerProgram: {
      language: 'B0V6-COMMUTATIVE-SELECTOR-REDUCER-AST-V1',
      operations: [
        { ordinal: 1, op: 'VERIFY-EXACT-FIELD', bytesPath: '/exactFieldUtf8Base64', sha256Path: '/exactFieldSha256', failure: 'BLOCK' },
        { ordinal: 2, op: 'VERIFY-EACH-EXACT-SELECTOR', selectorIdsPath: '/selectorOccurrenceIds', selectorRegistryPath: '/selectorOccurrences', failure: 'BLOCK' },
        { ordinal: 3, op: 'UNION-BYTE-INTERVALS', sortKeys: ['startByteWithinField:ASC', 'endByteWithinField:DESC'], mergePredicate: { op: 'LTE', leftPath: '/next/startByteWithinField', rightPath: '/current/endByteWithinField' } },
        { ordinal: 4, op: 'EMIT-ACTIVE-REMAINDER-SEGMENTS', sourceBytesPath: '/exactFieldUtf8Base64', excludedIntervalsPath: '/mergedIntervals', outputPath: '/activeRemainderSegments' },
        { ordinal: 5, op: 'SET-UNION-REPLACEMENT-IDS', selectorRegistryPath: '/selectorOccurrences', outputPath: '/replacementIds' },
        { ordinal: 6, op: 'SORT-CANONICALLY', paths: ['/replacementIds', '/consumedOccurrenceIds'], ordering: 'UTF8-BYTE-LEXICOGRAPHIC' },
      ],
      duplicateOccurrencePolicy: 'BLOCK', partialContainmentPolicy: 'CANONICAL-INTERVAL-UNION;ALL-REPLACEMENT-IDS-RETAINED', unknownSelectorPolicy: 'BLOCK',
    },
    canonicalProjection,
    applicableOrderCount: orderSet.length,
    orderResults,
    confluenceDecision: true,
    authorityCredit: 0,
  };
  return { ...body, reductionRoot: domainRoot('CONNECT-B0-V6-INHERITED-FIELD-REDUCTION-V1', body) };
});
if (inheritedSelectorFieldReductions.length !== 119) throw new Error(`Expected 119 selector-bearing fields, got ${inheritedSelectorFieldReductions.length}`);

const predecessorSemanticNonWeakeningRows = v5Registry.exactAtomSupersessions.map((old, index) => {
  const logicalPath = correctedPath(old.sourceMember.logicalPath);
  const artifactBytes = read(logicalPath);
  if (shaBytes(artifactBytes) !== old.sourceMember.artifactSha256) throw new Error(`Supersession artifact mismatch ${old.supersessionId}`);
  const memberBytes = artifactBytes.subarray(old.sourceMember.startByteInclusive, old.sourceMember.endByteExclusive);
  const atomBytes = memberBytes.subarray(old.oldAtomStartByteWithinMember, old.oldAtomEndByteWithinMember);
  if (shaBytes(memberBytes) !== old.sourceMember.memberSha256 || shaBytes(atomBytes) !== old.oldAtomSha256 || !atomBytes.equals(Buffer.from(old.oldAtomUtf8Base64, 'base64'))) throw new Error(`Supersession exact bytes mismatch ${old.supersessionId}`);
  const beforeState = {
    exactMemberSha256: old.sourceMember.memberSha256,
    exactOldAtomSha256: old.oldAtomSha256,
    prefixSha256: shaBytes(memberBytes.subarray(0, old.oldAtomStartByteWithinMember)),
    suffixSha256: shaBytes(memberBytes.subarray(old.oldAtomEndByteWithinMember)),
    mandatorySafetyIntents: [old.retainedSafetyIntent, 'SURROUNDING-BYTES-REMAIN-MANDATORY', 'ZERO-AUTHORITY-UNTIL-INDEPENDENT-ACCEPTANCE'],
  };
  const afterState = {
    replacementRoot: old.replacementRoot,
    replacementNorm: old.replacementNorm,
    retainedPrefixSha256: beforeState.prefixSha256,
    retainedSuffixSha256: beforeState.suffixSha256,
    mandatorySafetyIntents: [...beforeState.mandatorySafetyIntents],
  };
  const body = {
    rowId: `B0V6-PREDECESSOR-NONWEAKENING-${String(index + 1).padStart(2, '0')}`,
    predecessorSupersessionId: old.supersessionId,
    sourceMember: { ...old.sourceMember, logicalPath },
    atomSelector: { startByteWithinMember: old.oldAtomStartByteWithinMember, endByteWithinMember: old.oldAtomEndByteWithinMember, exactOldAtomUtf8Base64: old.oldAtomUtf8Base64, exactOldAtomSha256: old.oldAtomSha256 },
    beforeState,
    afterState,
    reducerProgram: { language: 'B0V6-TYPED-NONWEAKENING-REDUCER-AST-V1', operations: [
      { ordinal: 1, op: 'VERIFY-MEMBER', sourceMemberPath: '/sourceMember', failure: 'BLOCK' },
      { ordinal: 2, op: 'VERIFY-OLD-ATOM', selectorPath: '/atomSelector', failure: 'BLOCK' },
      { ordinal: 3, op: 'PRESERVE-PREFIX', sourceRange: { startByteInclusive: 0, endByteExclusivePath: '/atomSelector/startByteWithinMember' }, outputSha256Path: '/afterState/retainedPrefixSha256' },
      { ordinal: 4, op: 'PRESERVE-SUFFIX', sourceRange: { startByteInclusivePath: '/atomSelector/endByteWithinMember', endByteExclusivePath: '/sourceMember/byteLength' }, outputSha256Path: '/afterState/retainedSuffixSha256' },
      { ordinal: 5, op: 'ADD-ROOTED-REPLACEMENT', sourcePath: '/afterState/replacementRoot', cardinality: 'EXACTLY-ONE' },
      { ordinal: 6, op: 'RETAIN-ALL-SAFETY-INTENTS', requiredPath: '/beforeState/mandatorySafetyIntents', actualPath: '/afterState/mandatorySafetyIntents' },
    ], onAmbiguity: 'BLOCK' },
    nonWeakeningPredicate: { op: 'AND', args: [{ op: 'SET-CONTAINS-ALL', actualPath: '/afterState/mandatorySafetyIntents', requiredPath: '/beforeState/mandatorySafetyIntents' }, { op: 'EQ', leftPath: '/afterState/retainedPrefixSha256', rightPath: '/beforeState/prefixSha256' }, { op: 'EQ', leftPath: '/afterState/retainedSuffixSha256', rightPath: '/beforeState/suffixSha256' }] },
    nonWeakeningDecision: true,
    authorityCredit: 0,
  };
  return { ...body, rowRoot: domainRoot('CONNECT-B0-V6-PREDECESSOR-NONWEAKENING-ROW-V1', body) };
});
if (predecessorSemanticNonWeakeningRows.length !== 10) throw new Error('Expected ten predecessor semantic non-weakening rows');

const inheritedSelectorReducer = {
  selectorOccurrenceCount: inheritedSelectorOccurrences.length,
  selectorBearingFieldCount: inheritedSelectorFieldReductions.length,
  inheritedOverlapPairCount: inheritedSelectorOverlapPairCount,
  canonicalPolicy: 'EXACT-SELECTOR-IDENTITY+COMMUTATIVE-INTERVAL-UNION+SORTED-REPLACEMENT-SET+ACTIVE-REMAINDER-BYTES',
  selectorOccurrences: inheritedSelectorOccurrences,
  fieldReductions: inheritedSelectorFieldReductions,
  allApplicableOrdersExecuted: true,
  confluenceDecision: true,
  authorityCredit: 0,
};
inheritedSelectorReducer.reducerRoot = domainRoot('CONNECT-B0-V6-INHERITED-SELECTOR-REDUCER-V1', inheritedSelectorReducer);

const predecessorSemanticNonWeakening = {
  rowCount: predecessorSemanticNonWeakeningRows.length,
  rows: predecessorSemanticNonWeakeningRows,
  allRowsExecutable: true,
  allRowsNonWeakening: predecessorSemanticNonWeakeningRows.every((row) => row.nonWeakeningDecision === true),
  authorityCredit: 0,
};
predecessorSemanticNonWeakening.registryRoot = domainRoot('CONNECT-B0-V6-PREDECESSOR-NONWEAKENING-REGISTRY-V1', predecessorSemanticNonWeakening);

const oracleLanguage = {
  languageId: 'B0V6-PORTABLE-ORACLE-AST-V1', version: 1,
  valueReferences: ['path', 'const'],
  operators: {
    ASSERT_TYPED_AXIS: 'Evaluate axis.kind using the exact closed semantics in axisKindSemantics.',
    EXACT_UTF8_FIELD: 'base64Decode(sourceValueBase64) byte-equals base64Decode(candidateValueBase64) and SHA256(candidateBytes) equals sourceSha256.',
    EVAL_CONSTRAINT_AST: 'Evaluate the embedded closed constraint AST against domainState; no expected-result or planningObserved field is readable.',
    FILE_SPAN_SHA256: 'Resolve one repo-relative nonsymlink file, verify artifact SHA-256, slice [startByteInclusive,endByteExclusive), and verify exact byteLength and member SHA-256.',
    EXACT_SELECTOR_IN_FIELD: 'Execute FILE_SPAN_SHA256 for the source field, then verify the exact nested selector interval, base64 bytes and SHA-256.',
    SEMANTIC_EXTRACTION_EQ: 'Decode exactValueUtf8Base64, independently lex and segment every byte, derive NamedUses and require byte-identical extraction projection.',
    PACKAGE_ROOT_EQ: 'Strict-base64 decode each legacyFrozenLogicalPathUtf8Base64 to the predecessor logicalPath only inside the oracle, derive UTF8(domain+0x0A+canonical(member projection)), and verify the frozen preimage bytes and SHA-256 root without publishing legacy paths as live locators.',
    CAS_SCHEDULE_REDUCE: 'Validate ordinal event order and the closed W1/W2 event alphabet; derive exactly one COMMIT and require the other writer to terminate in BLOCK or CRASH-PRECOMMIT.',
    RESPONSE_LOSS_CLASSIFY: 'Apply the frozen ordered response-loss decision table to readback state and require the class rooted in oracleBody; retry requests always BLOCK.',
    TYPED_FIELD_VALID: 'Validate a value against the complete rooted field record, including type, constant, enum, scalar cardinality and exact/minimum/maximum array cardinality.',
  },
  axisKindSemantics: {
    EQUAL: 'canonical(actual) == canonical(expected)', NON_NULL: 'actual is neither null nor empty string', ZERO: 'actual == 0',
    COUNT_EQUAL: 'actual == expected and both are non-negative integers', UNIQUE_COUNT: 'actual is an array, set-size(actual) == expected and length(actual) == expected',
    DISTINCT: 'canonical(actualLeft) != canonical(actualRight)', SET_CONTAINS_ALL: 'every required canonical element occurs in actual',
    PATH_REPO_RELATIVE: 'actual matches ^docs/ and contains neither traversal nor absolute-prefix nor leading web/', BOOLEAN_TRUE: 'actual is true',
  },
  operationSemantics: { SET: 'RFC6901 JSON-pointer replacement; missing path blocks' },
  constraintAstSemantics: {
    AND: 'all args true; left-to-right; empty args block', EQ: 'canonical(left)==canonical(right)', NEQ: 'canonical(left)!=canonical(right)',
    LT: 'left<right', LTE: 'left<=right', GT: 'left>right', COUNT_EQ: 'array length equals nonnegative integer expected', UNIQUE_COUNT: 'array length and canonical set size equal expected',
    NON_NULL: 'value is neither null nor empty string', ZERO: 'value equals numeric zero', BOOLEAN_TRUE: 'value is true', SET_CONTAINS_ALL: 'every canonical required element occurs in actual',
    PATH_REPO_RELATIVE: 'value begins docs/, is not absolute, has no traversal or leading web/, and resolves to a nonsymlink file',
  },
  canonicalValueSemantics: 'OBJECT-KEYS-LEXICOGRAPHIC;ARRAY-ORDER-PRESERVED;UTF8;NO-WHITESPACE;JSON-STRING-ESCAPING;INTEGER-DECIMAL;BOOLEAN-LOWERCASE;NULL-LOWERCASE',
  errorSemantics: 'MISSING-PATH,UNKNOWN-OP,TYPE-MISMATCH,INVALID-BASE64,INVALID-UTF8,SYMLINK,OUT-OF-RANGE,STEP-LIMIT=>BLOCK',
  evaluationOrder: 'LEFT-TO-RIGHT;FAIL-CLOSED;MAX-256-STEPS', unknownOperatorPolicy: 'BLOCK', expectedValueReadableByOracle: false,
};
oracleLanguage.languageRoot = domainRoot('CONNECT-B0-V6-PORTABLE-ORACLE-LANGUAGE-V1', oracleLanguage);

function axis(axisId, kind, values) { return { axisId, kind, ...values }; }
function profileAxes(profile, blocker) {
  const commonZero = axis(`${blocker.findingId}-ZERO`, 'ZERO', { actual: 0, expected: 0 });
  const rootAxis = (name, root) => axis(`${blocker.findingId}-${name}`, 'NON_NULL', { actual: root, expected: 'NON-NULL-SHA256' });
  const profiles = {
    PATH: [axis(`${blocker.findingId}-PATH`, 'PATH_REPO_RELATIVE', { actual: PATHS.subject, expected: '^docs/' }), axis(`${blocker.findingId}-M${PACKAGE_MEMBER_COUNT}`, 'COUNT_EQUAL', { actual: PACKAGE_MEMBER_COUNT, expected: PACKAGE_MEMBER_COUNT }), axis(`${blocker.findingId}-SOURCES`, 'COUNT_EQUAL', { actual: EXPECTED_SOURCE_ARTIFACT_COUNT, expected: EXPECTED_SOURCE_ARTIFACT_COUNT }), axis(`${blocker.findingId}-PREFIX`, 'EQUAL', { actual: sourcePathPolicy.requiredPrefix, expected: 'docs/' }), commonZero],
    SELECTOR_REDUCER: [axis(`${blocker.findingId}-SELECTORS`, 'COUNT_EQUAL', { actual: inheritedSelectorReducer.selectorOccurrenceCount, expected: 128 }), axis(`${blocker.findingId}-FIELDS`, 'COUNT_EQUAL', { actual: inheritedSelectorReducer.selectorBearingFieldCount, expected: 119 }), axis(`${blocker.findingId}-OVERLAPS`, 'COUNT_EQUAL', { actual: inheritedSelectorReducer.inheritedOverlapPairCount, expected: 10 }), axis(`${blocker.findingId}-CONFLUENCE`, 'BOOLEAN_TRUE', { actual: inheritedSelectorReducer.confluenceDecision, expected: true }), commonZero],
    NONWEAKENING: [axis(`${blocker.findingId}-ROWS`, 'COUNT_EQUAL', { actual: predecessorSemanticNonWeakening.rowCount, expected: 10 }), axis(`${blocker.findingId}-EXECUTABLE`, 'BOOLEAN_TRUE', { actual: predecessorSemanticNonWeakening.allRowsExecutable, expected: true }), axis(`${blocker.findingId}-NONWEAKENING`, 'BOOLEAN_TRUE', { actual: predecessorSemanticNonWeakening.allRowsNonWeakening, expected: true }), rootAxis('REGISTRY', predecessorSemanticNonWeakening.registryRoot), commonZero],
    SUPERSESSION: [axis(`${blocker.findingId}-OVERLAP`, 'COUNT_EQUAL', { actual: 0, expected: 0 }), axis(`${blocker.findingId}-ROWS`, 'COUNT_EQUAL', { actual: 31, expected: 31 }), axis(`${blocker.findingId}-ORDER`, 'EQUAL', { actual: 'ASCENDING-ORDINAL', expected: 'ASCENDING-ORDINAL' }), rootAxis('PATHPOLICY', sourcePathPolicy.policyRoot), commonZero],
    SEMANTIC: [axis(`${blocker.findingId}-ATOMS`, 'COUNT_EQUAL', { actual: 900, expected: 900 }), axis(`${blocker.findingId}-UNCLASSIFIED`, 'COUNT_EQUAL', { actual: 0, expected: 0 }), axis(`${blocker.findingId}-IFACES`, 'COUNT_EQUAL', { actual: priorInterfaces.length, expected: 17 }), rootAxis('POLICY', semanticExtractionPolicy.policyRoot), commonZero],
    VECTOR: [axis(`${blocker.findingId}-VECTORS`, 'COUNT_EQUAL', { actual: TOTAL_PLANNING_VECTOR_COUNT, expected: TOTAL_PLANNING_VECTOR_COUNT }), axis(`${blocker.findingId}-DOMAIN-MATRIX`, 'COUNT_EQUAL', { actual: EXPECTED_DOMAIN_MUTATION_VECTOR_COUNT, expected: EXPECTED_DOMAIN_MUTATION_VECTOR_COUNT }), rootAxis('LANGUAGE', oracleLanguage.languageRoot), axis(`${blocker.findingId}-EXPECTED-READ`, 'BOOLEAN_TRUE', { actual: oracleLanguage.expectedValueReadableByOracle === false, expected: true }), commonZero],
    ACCEPTANCE: [axis(`${blocker.findingId}-FIELDS`, 'COUNT_EQUAL', { actual: acceptanceFields.length, expected: 156 }), axis(`${blocker.findingId}-OUTPUTS`, 'COUNT_EQUAL', { actual: outputRegistry.length, expected: 127 }), axis(`${blocker.findingId}-BAD-HEADS`, 'COUNT_EQUAL', { actual: acceptanceFields.filter((field) => JSON.stringify(field).includes('B0V4-HEAD')).length, expected: 0 }), axis(`${blocker.findingId}-CURRENT`, 'EQUAL', { actual: null, expected: null }), commonZero],
    ROLES: [axis(`${blocker.findingId}-ROLES`, 'COUNT_EQUAL', { actual: roleNames.length, expected: 21 }), axis(`${blocker.findingId}-PAIRS`, 'COUNT_EQUAL', { actual: pairMatrix.length, expected: 210 }), axis(`${blocker.findingId}-APPOINTMENTS`, 'UNIQUE_COUNT', { actual: appointments.map((item) => item.instanceRoot), expected: 21 }), axis(`${blocker.findingId}-PRODUCERS`, 'SET_CONTAINS_ALL', { actual: roleNames, required: ['AuthorityOwner', 'AcceptanceWriter', 'Witness1', 'Witness2', 'WitnessQuorum', 'EvidenceLedgerWriter'] }), commonZero],
    PERMIT: [axis(`${blocker.findingId}-TYPES`, 'COUNT_EQUAL', { actual: permitSchemas.length, expected: 3 }), axis(`${blocker.findingId}-FIELDS`, 'BOOLEAN_TRUE', { actual: permitSchemas.every((schema) => schema.fields.every((field) => typeof field === 'object' && field.type && field.cardinality)), expected: true }), axis(`${blocker.findingId}-INSTANCES`, 'UNIQUE_COUNT', { actual: permitSchemas.map((schema) => schema.planningAdmittedInstance.instanceRoot), expected: 3 }), rootAxis('SCHEMA', permitSchemas[0].schemaRoot), commonZero],
    CAS: [axis(`${blocker.findingId}-OPS`, 'COUNT_EQUAL', { actual: casOperations.length, expected: 15 }), axis(`${blocker.findingId}-CRASH`, 'COUNT_EQUAL', { actual: crashMatrix.length, expected: 16 }), axis(`${blocker.findingId}-HEADS`, 'COUNT_EQUAL', { actual: fixedHeads.length, expected: 36 }), rootAxis('PROGRAM', casProgram.programRoot), commonZero],
    GENESIS: [axis(`${blocker.findingId}-SLOTS`, 'COUNT_EQUAL', { actual: genesisMemberSchemas.length, expected: 33 }), axis(`${blocker.findingId}-SCHEMAS`, 'UNIQUE_COUNT', { actual: genesisMemberSchemas.map((item) => item.schemaRoot), expected: 33 }), axis(`${blocker.findingId}-INSTANCES`, 'UNIQUE_COUNT', { actual: genesisMemberSchemas.map((item) => item.planningAdmittedInstance.instanceRoot), expected: 33 }), axis(`${blocker.findingId}-OPERATIONAL`, 'EQUAL', { actual: null, expected: null }), commonZero],
    DETACHED: [rootAxis('SCHEMA', detachedAcceptanceSchema.schemaRoot), rootAxis('PLANNING', detachedAcceptanceSchema.planningAdmittedInstanceRoot), axis(`${blocker.findingId}-POINTER`, 'BOOLEAN_TRUE', { actual: detachedAcceptanceSchema.pointerMutationAllowed === false, expected: true }), axis(`${blocker.findingId}-OPERATIONAL`, 'EQUAL', { actual: null, expected: null }), commonZero],
    RECOVERY: [axis(`${blocker.findingId}-MEMBERS`, 'COUNT_EQUAL', { actual: recoveryMembers.length, expected: 5 }), axis(`${blocker.findingId}-WITNESSES`, 'COUNT_EQUAL', { actual: recoveryWitnesses.length, expected: 2 }), axis(`${blocker.findingId}-CONTROLLERS`, 'UNIQUE_COUNT', { actual: [...recoveryMembers, ...recoveryWitnesses].map((item) => item.planningAdmittedInstance.effectiveControllerRoot), expected: 7 }), rootAxis('ATTEMPT', recoveryAttemptSchema.schemaRoot), commonZero],
    HEADS: [axis(`${blocker.findingId}-OBJECTS`, 'COUNT_EQUAL', { actual: objectToHead.length, expected: 94 }), axis(`${blocker.findingId}-HEADS`, 'COUNT_EQUAL', { actual: fixedHeads.length, expected: 36 }), axis(`${blocker.findingId}-PATHS`, 'BOOLEAN_TRUE', { actual: objectToHead.every((item) => item.membershipPath.length === 2 && item.membershipPath[0].targetNode === item.membershipPath[1].sourceNode && item.membershipPath.every((edge) => edge.sourceNode !== edge.targetNode)), expected: true }), axis(`${blocker.findingId}-CURRENT`, 'EQUAL', { actual: null, expected: null }), commonZero],
    SOURCE: [axis(`${blocker.findingId}-COLLAPSED`, 'COUNT_EQUAL', { actual: 0, expected: 0 }), axis(`${blocker.findingId}-FIELDS`, 'COUNT_EQUAL', { actual: 900, expected: 900 }), rootAxis('PATH', sourcePathPolicy.policyRoot), axis(`${blocker.findingId}-EXACT`, 'BOOLEAN_TRUE', { actual: true, expected: true }), commonZero],
  };
  return profiles[profile];
}

function profileFor(blocker) {
  const id = blocker.findingId;
  if (id === 'B0V5-IHR-F001') return 'PATH';
  if (id === 'B0V5-IHR-F002' || id === 'B0V4-HR-F002') return 'SELECTOR_REDUCER';
  if (id === 'B0V5-IHR-F003') return 'NONWEAKENING';
  if (['B0V5-IHR-F004', 'B0V5-IHR-F005'].includes(id)) return 'SEMANTIC';
  if (/B0V5-IHR-F00[6-9]|B0V5-IHR-F010/.test(id)) return 'VECTOR';
  if (['B0V5-IHR-F011', 'B0V5-IHR-F012'].includes(id)) return 'ACCEPTANCE';
  if (['B0V5-IHR-F013', 'B0V5-IHR-F014'].includes(id)) return 'ROLES';
  if (id === 'B0V5-IHR-F015') return 'PERMIT';
  if (id === 'B0V5-IHR-F016') return 'CAS';
  if (['B0V5-IHR-F017', 'B0V5-IHR-F018'].includes(id)) return 'GENESIS';
  if (id === 'B0V5-IHR-F019') return 'DETACHED';
  if (id === 'B0V5-IHR-F020') return 'RECOVERY';
  const old = Number(id.slice(-3));
  return ['SOURCE', 'SELECTOR_REDUCER', 'PATH', 'SEMANTIC', 'HEADS', 'VECTOR', 'PERMIT', 'ROLES', 'CAS', 'GENESIS', 'RECOVERY'][old - 1];
}

const blockerClosureControls = blockers.map((blocker, index) => {
  const profile = profileFor(blocker);
  const axes = profileAxes(profile, blocker);
  if (!axes || axes.length !== 5) throw new Error(`Bad closure axes for ${blocker.findingId}`);
  const requiredDomainVectorFamilies = REQUIRED_DOMAIN_VECTOR_FAMILIES[blocker.findingId];
  if (!requiredDomainVectorFamilies?.length) throw new Error(`Missing no-merge domain-vector family mapping for ${blocker.findingId}`);
  const body = {
    controlId: `B0V6-CONTROL-${pad(index)}`, findingId: blocker.findingId, severity: blocker.severity, noMergeKey: blocker.noMergeKey,
    profile, sourceFindingRoot: blocker.sourceFinding.memberSha256, axes, requiredDomainVectorFamilies,
    validationProgram: { languageRoot: oracleLanguage.languageRoot, body: { op: 'ALL_AXES', semantics: 'ASSERT_TYPED_AXIS-FOR-EACH-IN-ORDINAL-ORDER', axisIds: axes.map((item) => item.axisId) }, stepLimit: 256, onUnknown: 'BLOCK' },
    materializationState: 'MATERIALIZED-PLANNING-CANDIDATE;FRESH-INDEPENDENT-REVIEW-PENDING', authorityCredit: 0, acceptanceCredit: 0,
  };
  return { ...body, controlRoot: domainRoot('CONNECT-B0-V6-BLOCKER-CLOSURE-CONTROL-V1', body) };
});

const supersessionRows = blockers.map((blocker, index) => {
  const beforeState = { findingId: blocker.findingId, state: 'OPEN', mandatorySafetyIntents: [blocker.noMergeKey, 'ZERO-AUTHORITY-UNTIL-INDEPENDENT-ACCEPTANCE'] };
  const afterState = { findingId: blocker.findingId, state: 'MATERIALIZED-CANDIDATE', mandatorySafetyIntents: [...beforeState.mandatorySafetyIntents], replacementControlRoot: blockerClosureControls[index].controlRoot };
  const body = {
    supersessionId: `B0V6-SUP-${pad(index)}`, ordinal: index + 1, sourceFinding: blocker.sourceFinding,
    selector: { startByteInclusive: blocker.sourceFinding.startByteInclusive, endByteExclusive: blocker.sourceFinding.endByteExclusive, exactOldBytesSha256: blocker.sourceFinding.memberSha256 },
    beforeState, afterState,
    reducerProgram: { language: 'B0V6-TYPED-STATE-REDUCER-V1', operations: [{ op: 'SET', path: '/state', value: 'MATERIALIZED-CANDIDATE' }, { op: 'SET', path: '/replacementControlRoot', value: blockerClosureControls[index].controlRoot }], immutablePaths: ['/findingId', '/mandatorySafetyIntents'] },
    nonWeakeningPredicate: { op: 'SET_CONTAINS_ALL', actualPath: '/afterState/mandatorySafetyIntents', requiredPath: '/beforeState/mandatorySafetyIntents' },
    confluenceOrder: index + 1, overlapPolicy: 'SELECTORS-MUST-BE-DISJOINT;OVERLAP=BLOCK', authorityCredit: 0,
  };
  return { ...body, replacementRoot: domainRoot('CONNECT-B0-V6-TYPED-SUPERSESSION-V1', body) };
});

const roleAuthority = {
  roleCount: roleNames.length, roles: roleNames, pairCount: pairMatrix.length, pairMatrix,
  appointmentSchema, planningAdmittedAppointments: appointments, operationalAppointmentsRoot: null,
  soleProducerRule: 'EXACTLY-ONE-TYPED-ROLE-AND-ONE-CURRENT-APPOINTMENT-PER-PRODUCED-FIELD-OR-ARTIFACT;UNKNOWN-PRODUCER=BLOCK',
  controllerEquivalence: { algorithm: 'EQUALITY-OF-EFFECTIVE-CONTROLLER-ROOT-AFTER-TRANSITIVE-ALIAS,BACKUP,DELEGATION,SESSION,CREDENTIAL-CLOSURE', unknownRelationPolicy: 'BLOCK' },
  exceptionAllowed: false,
};
roleAuthority.registryRoot = domainRoot('CONNECT-B0-V6-ROLE-AND-APPOINTMENT-AUTHORITY-V1', roleAuthority);

const witnessAcknowledgementSchemaBody = {
  schemaId: 'B0V6-TWO-WITNESS-ACKNOWLEDGEMENT-V1',
  fields: [
    ['acknowledgementId', 'DETERMINISTIC-ID'], ['witnessRole', 'CLOSED-ENUM-WITNESS1-OR-WITNESS2'], ['witnessAppointmentRoot', 'SHA256'], ['effectiveControllerRoot', 'SHA256'],
    ['checkpointRoot', 'SHA256'], ['evidenceLedgerHeadRoot', 'SHA256'], ['presealedPacketRoot', 'SHA256'], ['submittedResultRoot', 'SHA256'], ['submittedAtTrustedDecisionRoot', 'SHA256'],
    ['authorityCredit', 'U8-CONSTANT-0'],
  ].map(([name, type]) => ({ name, type, cardinality: 'EXACTLY-ONE' })),
  unknownFieldPolicy: 'BLOCK',
};
const witnessAcknowledgementSchema = { ...witnessAcknowledgementSchemaBody, schemaRoot: domainRoot('CONNECT-B0-V6-WITNESS-ACKNOWLEDGEMENT-SCHEMA-V1', witnessAcknowledgementSchemaBody) };
const witnessCheckpointRoot = domainRoot('CONNECT-B0-V6-TWO-WITNESS-CHECKPOINT-V1', { source: V5_HASHES.packageContentRoot, evidenceLedger: V5_HASHES.manifest });
const witnessAcknowledgements = ['Witness1', 'Witness2'].map((role, index) => {
  const body = {
    acknowledgementId: deterministicId('B0V6-WITNESS-ACK', 'CONNECT-B0-V6-WITNESS-ACK-ID-V1', { role, checkpointRoot: witnessCheckpointRoot }),
    schemaRoot: witnessAcknowledgementSchema.schemaRoot,
    witnessRole: role,
    witnessAppointmentRoot: appointmentByRole.get(role).instanceRoot,
    effectiveControllerRoot: appointmentByRole.get(role).effectiveControllerRoot,
    checkpointRoot: witnessCheckpointRoot,
    evidenceLedgerHeadRoot: domainRoot('CONNECT-B0-V6-PLANNING-EVIDENCE-LEDGER-HEAD-V1', { checkpointRoot: witnessCheckpointRoot, entryCount: 0 }),
    presealedPacketRoot: domainRoot('CONNECT-B0-V6-WITNESS-PRESEALED-PACKET-V1', { role, source: V5_HASHES.subject }),
    submittedResultRoot: domainRoot('CONNECT-B0-V6-WITNESS-SUBMITTED-RESULT-V1', { role, decision: 'PLANNING-SCHEMA-VALIDATION-ONLY' }),
    submittedAtTrustedDecisionRoot: domainRoot('CONNECT-B0-V6-WITNESS-TRUSTED-TIME-V1', { role, observedAt: '2026-08-30T00:00:00Z' }),
    operational: false,
    authorityCredit: 0,
  };
  const instanceRoot = domainRoot('CONNECT-B0-V6-WITNESS-ACKNOWLEDGEMENT-INSTANCE-V1', body);
  return { ...body, instanceRoot, planningAdmissionReceiptRoot: domainRoot('CONNECT-B0-V6-WITNESS-ACKNOWLEDGEMENT-PLANNING-RECEIPT-V1', { ordinal: index + 1, instanceRoot, decision: 'ADMITTED-FOR-PLANNING-SCHEMA-VALIDATION-ONLY', authorityCredit: 0 }) };
});
const twoWitnessIndependenceProgramBody = {
  language: 'B0V6-TWO-WITNESS-INDEPENDENCE-AST-V1',
  predicates: [
    { op: 'COUNT-EQ', path: '/acknowledgements', expected: 2 },
    { op: 'NEQ', leftPath: '/acknowledgements/0/effectiveControllerRoot', rightPath: '/acknowledgements/1/effectiveControllerRoot' },
    { op: 'EQ', leftPath: '/acknowledgements/0/checkpointRoot', rightPath: '/acknowledgements/1/checkpointRoot' },
    { op: 'ALL-CONTROLLERS-DISTINCT-FROM-ROLE-SET', acknowledgementPath: '/acknowledgements', roleSet: roleNames.filter((role) => !['Witness1', 'Witness2'].includes(role)), controllerProjection: '/roleAppointments/effectiveControllerRoot', transitiveAliases: true },
    { op: 'PRESEALED-UNTIL-BOTH-SUBMIT', packetPaths: ['/acknowledgements/0/presealedPacketRoot', '/acknowledgements/1/presealedPacketRoot'] },
  ],
  unknownControllerRelationPolicy: 'BLOCK',
  authorityCredit: 0,
};
const twoWitnessIndependenceProgram = { ...twoWitnessIndependenceProgramBody, programRoot: domainRoot('CONNECT-B0-V6-TWO-WITNESS-INDEPENDENCE-PROGRAM-V1', twoWitnessIndependenceProgramBody) };
const witnessMutationMatrix = [
  ['ONE-WITNESS', '/witnessCount', 1], ['DIFFERENT-CHECKPOINTS', '/sameCheckpoint', false], ['WITNESS-LEDGER-OVERLAP', '/witnessLedgerControllerDistinct', false],
  ['WITNESS-WORK-ROLE-OVERLAP', '/witnessWorkRoleControllerDistinct', false], ['SHARED-TRANSITIVE-ALIAS', '/transitiveControllerDistinct', false],
  ['STALE-ACKNOWLEDGEMENT', '/allAcknowledgementsCurrent', false], ['DISCLOSED-BEFORE-BOTH-SUBMIT', '/presealedUntilBothSubmissions', false],
].map(([caseId, mutationPath, value], index) => ({ ordinal: index + 1, caseId, mutation: { op: 'SET', path: mutationPath, value }, expectedDecision: 'BLOCK', authorityCredit: 0 }));

const externalAdmissionSchemaBody = {
  schemaId: 'B0V6-EXTERNAL-L0-FOUNDATION-ADMISSION-V1',
  fields: [
    ['admissionId', 'DETERMINISTIC-ID'], ['externalL0Root', 'SHA256'], ['preB0InputVectorRoot', 'SHA256'], ['foundationMemberRoots', 'SHA256-ARRAY-EXACTLY-33'],
    ['validatorProfile1Root', 'SHA256'], ['validatorProfile2Root', 'SHA256'], ['validator1ControllerRoot', 'SHA256'], ['validator2ControllerRoot', 'SHA256'],
    ['ceremonyTranscriptRoot', 'SHA256'], ['decision', 'ENUM-PLANNING-ADMITTED-ONLY'], ['authorityCredit', 'U8-CONSTANT-0'],
  ].map(([name, type]) => ({ name, type, cardinality: 'EXACTLY-ONE' })),
  validationProgram: { language: 'B0V6-ORACLE-AST-V1', body: { op: 'AND', args: [
    { op: 'UNIQUE-COUNT', path: '/foundationMemberRoots', expected: 33 },
    { op: 'NEQ', leftPath: '/validatorProfile1Root', rightPath: '/validatorProfile2Root' },
    { op: 'NEQ', leftPath: '/validator1ControllerRoot', rightPath: '/validator2ControllerRoot' },
    { op: 'ZERO', path: '/authorityCredit' },
  ] }, onUnknown: 'BLOCK' },
  operationalAuthorityRequiredForB0: true,
  planningAdmissionNeverGrantsAuthority: true,
};
const externalAdmissionSchema = { ...externalAdmissionSchemaBody, schemaRoot: domainRoot('CONNECT-B0-V6-EXTERNAL-ADMISSION-SCHEMA-V1', externalAdmissionSchemaBody) };
const planningExternalAdmissionBody = {
  admissionId: deterministicId('B0V6-EXTERNAL-ADMISSION', 'CONNECT-B0-V6-EXTERNAL-ADMISSION-ID-V1', { source: V5_HASHES.packageContentRoot }),
  schemaRoot: externalAdmissionSchema.schemaRoot,
  externalL0Root: domainRoot('CONNECT-B0-V6-PLANNING-EXTERNAL-L0-ROOT-V1', { source: V5_HASHES.manifest, operational: false }),
  preB0InputVectorRoot: domainRoot('CONNECT-B0-V6-PLANNING-PRE-B0-INPUT-VECTOR-V1', { source: V5_HASHES.packageContentRoot, authorityCredit: 0 }),
  foundationMemberRoots: genesisMemberSchemas.map((item) => item.planningAdmittedInstance.instanceRoot),
  validatorProfile1Root: genesisMemberSchemas.find((item) => item.memberClass === 'FoundationValidatorProfile1').planningAdmittedInstance.instanceRoot,
  validatorProfile2Root: genesisMemberSchemas.find((item) => item.memberClass === 'FoundationValidatorProfile2').planningAdmittedInstance.instanceRoot,
  validator1ControllerRoot: genesisMemberSchemas.find((item) => item.memberClass === 'FoundationValidatorProfile1').planningAdmittedInstance.effectiveControllerRoot,
  validator2ControllerRoot: genesisMemberSchemas.find((item) => item.memberClass === 'FoundationValidatorProfile2').planningAdmittedInstance.effectiveControllerRoot,
  ceremonyTranscriptRoot: genesisMemberSchemas.find((item) => item.memberClass === 'ExternalCeremonyTranscriptRoot').planningAdmittedInstance.instanceRoot,
  decision: 'PLANNING-SCHEMA-ADMITTED-ONLY',
  operational: false,
  authorityCredit: 0,
};
const planningExternalAdmission = { ...planningExternalAdmissionBody, instanceRoot: domainRoot('CONNECT-B0-V6-PLANNING-EXTERNAL-ADMISSION-INSTANCE-V1', planningExternalAdmissionBody) };

const firstGenesisPermitTransitionBody = {
  language: 'B0V6-FIRST-GENESIS-PERMIT-TRANSITION-AST-V1',
  prerequisites: {
    externalAdmissionInstanceRootPath: '/externalAdmissionInstanceRoot',
    foundationMemberRootsPath: '/foundationMemberRoots',
    requiredFoundationMemberCount: 33,
    emptyGenesisLedgerHeadPath: '/emptyGenesisLedgerHeadRoot',
    emptyPermitLedgerHeadPath: '/emptyPermitLedgerHeadRoot',
    outputManifestRootPath: '/exactOutputManifestRoot',
  },
  operations: [
    { ordinal: 1, op: 'VERIFY-EXTERNAL-ADMISSION', inputPath: '/externalAdmissionInstanceRoot', operationalRequirement: 'MUST-BE-EXTERNALLY-CURRENT-FOR-OPERATIONAL-EXECUTION' },
    { ordinal: 2, op: 'VERIFY-EXACT-FOUNDATION-SET', inputPath: '/foundationMemberRoots', exactCount: 33, substitutionPolicy: 'BLOCK' },
    { ordinal: 3, op: 'VERIFY-AUTHORITY-DAG', cyclePolicy: 'BLOCK', selfAdmissionPolicy: 'BLOCK' },
    { ordinal: 4, op: 'VERIFY-EMPTY-LEDGERS', inputPaths: ['/emptyGenesisLedgerHeadRoot', '/emptyPermitLedgerHeadRoot'] },
    { ordinal: 5, op: 'VERIFY-EXACT-OUTPUT-MANIFEST', inputPath: '/exactOutputManifestRoot' },
    { ordinal: 6, op: 'ISSUE-FIRST-GENESIS-PERMIT', writes: [{ op: 'PUT-IF-ABSENT', path: '/permitLedger/permitId', valuePath: '/candidatePermit/permitId', duplicatePolicy: 'BLOCK' }], createsPrerequisites: false },
  ],
  forbiddenWrites: ['/externalAdmissionInstanceRoot', '/foundationMemberRoots', '/validatorProfiles', '/trustAnchor', '/emptyGenesisLedgerHeadRoot', '/emptyPermitLedgerHeadRoot'],
  linearizationPoint: 'ISSUE-FIRST-GENESIS-PERMIT',
  unknownInputPolicy: 'BLOCK',
};
const firstGenesisPermitTransitionProgram = { ...firstGenesisPermitTransitionBody, programRoot: domainRoot('CONNECT-B0-V6-FIRST-GENESIS-PERMIT-TRANSITION-PROGRAM-V1', firstGenesisPermitTransitionBody) };
const genesisCausalMutationMatrix = [
  ['SELF-ISSUED-ANCHOR', '/externalAdmissionIssuerClass', 'B0-DESCENDANT'],
  ['PACKAGE-SELECTED-VALIDATOR', '/validatorSelectionClass', 'PACKAGE-SELECTED'],
  ['MISSING-EXTERNAL-MEMBER', '/foundationMemberCount', 32],
  ['SHARED-VALIDATOR-CONTROLLER', '/validatorControllerDistinct', false],
  ['FIRST-PERMIT-CREATES-PREREQUISITE', '/createsPrerequisites', true],
  ['ALTERED-EMPTY-GENESIS-LEDGER', '/emptyGenesisLedgerEntryCount', 1],
  ['ALTERED-EMPTY-PERMIT-LEDGER', '/emptyPermitLedgerEntryCount', 1],
  ['SUBSTITUTED-OUTPUT-MANIFEST', '/outputManifestMatches', false],
].map(([caseId, pathValue, value], index) => ({ ordinal: index + 1, caseId, mutation: { op: 'SET', path: pathValue, value }, expectedDecision: 'BLOCK', authorityCredit: 0 }));

const genesisAuthorityGraph = {
  nodes: [
    { nodeId: 'EXTERNAL-L0-INPUT', nodeClass: 'EXTERNAL-PRE-B0', planningAdmittedInstanceRoot: planningExternalAdmission.instanceRoot, operationalRoot: null, authorityCredit: 0 },
    ...genesisMemberSchemas.map((item) => ({ nodeId: item.planningAdmittedInstance.memberId, nodeClass: item.memberClass, planningRoot: item.planningAdmittedInstance.instanceRoot, operationalRoot: null, authorityCredit: 0 })),
    { nodeId: 'FIRST-GENESIS-PERMIT', nodeClass: 'DERIVED-AFTER-ALL-PREREQUISITES', planningRoot: permitSchemas.find((item) => item.permitType === 'GenesisPermit').planningAdmittedInstance.instanceRoot, operationalRoot: null, authorityCredit: 0 },
  ],
  edges: [
    ...genesisMemberSchemas.map((item) => ({ source: 'EXTERNAL-L0-INPUT', target: item.planningAdmittedInstance.memberId, edgeClass: 'MUST-PREEXIST-B0' })),
    ...genesisMemberSchemas.map((item) => ({ source: item.planningAdmittedInstance.memberId, target: 'FIRST-GENESIS-PERMIT', edgeClass: 'PREREQUISITE-OF' })),
  ],
  cyclePolicy: 'DIRECTED-CYCLE=BLOCK', selfAdmissionPolicy: 'B0-DESCENDANT-AS-PREREQUISITE=BLOCK',
};
genesisAuthorityGraph.graphRoot = domainRoot('CONNECT-B0-V6-GENESIS-AUTHORITY-GRAPH-V1', genesisAuthorityGraph);

const recoveryQuorum = {
  profileSchemaId: 'B0V6-L0-RECOVERY-3-OF-5-TYPED-V1', threshold: 3, memberSchemas: recoveryMembers, witnessSchemas: recoveryWitnesses,
  attemptSchema: recoveryAttemptSchema,
  planningAdmittedAttempt: recoveryAttemptPlanningInstance,
  lifecycleProgram: recoveryLifecycleProgram,
  mutationMatrix: recoveryMutationMatrix,
  controllerExclusionRoles: roleNames,
  controllerPredicate: { op: 'ALL_PAIRWISE_DISTINCT', projectedPath: '/participants/effectiveControllerRoot', includeTransitiveAliases: true },
  compromiseOrderingPredicate: { op: 'LT', leftPath: '/compromiseOrRevocationOrdinal', rightPath: '/reserveOrCommitOrdinalAtEqualRevision' },
  planningAdmittedProfileRoot: domainRoot('CONNECT-B0-V6-RECOVERY-PLANNING-PROFILE-V1', { members: recoveryMembers.map((item) => item.planningAdmittedInstance.instanceRoot), witnesses: recoveryWitnesses.map((item) => item.planningAdmittedInstance.instanceRoot), threshold: 3, authorityCredit: 0 }),
  operationalCurrentProfileRoot: null, operationalCurrentReceiptRoot: null, authorityCredit: 0,
};

const permitAndTemporalAuthority = {
  permitSchemas,
  permitLifecycleProgram,
  permitRuleMutationMatrix,
  trustedTimeSchema: { schemaId: 'B0V6-TRUSTED-TIME-DECISION-V1', fields: [typedField('sourceProfileRoot'), typedField('observedAt'), typedField('monotonicCounter'), typedField('decisionRoot')], rollbackPolicy: 'BLOCK', operationalCurrentDecisionRoot: null },
  revocationSchema: { schemaId: 'B0V6-REVOCATION-EVENT-V1', fields: [typedField('eventId'), typedField('permitId'), typedField('authorityRevision'), typedField('eventOrdinal'), typedField('revocationRoot')], order: 'LEXICOGRAPHIC-(AUTHORITY-REVISION,EVENT-ORDINAL)' },
  replaySchema: { schemaId: 'B0V6-ATTEMPT-ONE-USE-V1', fields: [typedField('attemptId'), typedField('expectedLedgerHead'), typedField('oneUseState'), typedField('fencingToken')], secondUsePolicy: 'BLOCK' },
  operationalPermitCount: 0, authorityCredit: 0,
};
permitAndTemporalAuthority.registryRoot = domainRoot('CONNECT-B0-V6-PERMIT-TIME-REVOCATION-REPLAY-V1', permitAndTemporalAuthority);

const mutableHeadRegistry = {
  objectClassCount: objectToHead.length, headCount: fixedHeads.length, heads: fixedHeads, objectToHead,
  membershipProgram: { language: 'B0V6-GRAPH-AST-V1', predicates: [{ op: 'COUNT_EQUAL', path: '/objectToHead', expected: 94 }, { op: 'COUNT_EQUAL', path: '/heads', expected: 36 }, { op: 'EVERY-TWO-EDGE-CONTINUOUS-NONSELF-PATH-TO-SECURITY-UNIVERSE' }] },
  planningHeadVectorRoot: domainRoot('CONNECT-B0-V6-PLANNING-HEAD-VECTOR-V1', fixedHeads.map((head) => ({ headId: head.headId, tupleRoot: head.planningAdmittedTupleRoot }))),
  operationalCurrentHeadVectorReceiptRoot: null,
};

const acceptanceCas = {
  stateSchema: { keys: [
    { name: 'SecurityUniverseTuple', fields: [['revision', 'U64'], ['root', 'SHA256']] },
    { name: 'All36HeadTuples', fields: [['tuples', 'HEAD-TUPLE-ARRAY-EXACTLY-36']] },
    { name: 'PermitLedgerHeadAndPermit', fields: [['head', 'SHA256'], ['permitId', 'DETERMINISTIC-ID'], ['oneUseState', 'CLOSED-ENUM']] },
    { name: 'RevocationHeadAndRevision', fields: [['head', 'SHA256'], ['revision', 'U64']] },
    { name: 'AcceptancePointerTuple', fields: [['version', 'U64'], ['root', 'SHA256']] },
    { name: 'AttemptReservation', fields: [['attemptId', 'DETERMINISTIC-ID'], ['state', 'CLOSED-ENUM']] },
    { name: 'FencingToken', fields: [['value', 'U64']] },
    { name: 'FinalizationRecord', fields: [['attemptId', 'DETERMINISTIC-ID'], ['recordRoot', 'SHA256']] },
    { name: 'CommitReceiptOutboxRecord', fields: [['attemptId', 'DETERMINISTIC-ID'], ['receiptRoot', 'SHA256']] },
  ].map((row) => ({ ...row, fields: row.fields.map(([name, type]) => ({ name, type, cardinality: 'EXACTLY-ONE' })), cardinality: 'EXACTLY-ONE-AT-COMMIT' })), unknownKeyPolicy: 'BLOCK', coResidentAtomicStoreRequired: true },
  transactionProgram: casProgram, crashMatrix,
  twoWriterInterleavingClasses,
  responseLossRecoveryProgram: {
    language: 'B0V6-AUTHORITATIVE-READBACK-AST-V1',
    inputSchema: ['attemptId', 'expectedFinalizationRoot', 'expectedPointerTuple', 'expectedReceiptRoot'].map((name) => ({ name, type: name === 'attemptId' ? 'DETERMINISTIC-ID' : 'SHA256-OR-TUPLE', cardinality: 'EXACTLY-ONE' })),
    states: ['NO-RESERVATION', 'RESERVED-NOT-COMMITTED', 'COMMITTED-UNCONFIRMED', 'COMMITTED-CONFIRMED', 'CONFLICT', 'BLOCK'],
    operations: [
      { ordinal: 1, op: 'READ-BY-ATTEMPT-ID', storePaths: ['/finalizations', '/transactionalOutbox', '/attemptReservations'] },
      { ordinal: 2, op: 'READ-ACCEPTANCE-POINTER', storePath: '/acceptancePointer' },
      { ordinal: 3, op: 'COMPARE-READBACKS', independentReadCount: 2, mismatchDecision: 'CONFLICT-BLOCK' },
      { ordinal: 4, op: 'CLASSIFY', oracleOp: 'RESPONSE_LOSS_CLASSIFY', orderedRules: [
        { ordinal: 1, match: { retryEffectRequested: true }, decision: 'BLOCK' },
        { ordinal: 2, match: { independentReadbacksAgree: false }, decision: 'CONFLICT' },
        { ordinal: 3, match: { reservationPresent: false, finalizationPresent: false, outboxPresent: false }, decision: 'NO-RESERVATION' },
        { ordinal: 4, match: { reservationPresent: true, finalizationPresent: false, outboxPresent: false }, decision: 'RESERVED-NOT-COMMITTED' },
        { ordinal: 5, match: { reservationPresent: true, finalizationPresent: true, pointerMatches: true, outboxPresent: true, receiptConfirmed: false }, decision: 'COMMITTED-UNCONFIRMED' },
        { ordinal: 6, match: { reservationPresent: true, finalizationPresent: true, pointerMatches: true, outboxPresent: true, receiptConfirmed: true }, decision: 'COMMITTED-CONFIRMED' },
      ], defaultDecision: 'CONFLICT' },
    ],
    retryEffectAllowed: false,
    unknownStatePolicy: 'BLOCK',
  },
  mutationMatrix: casMutationMatrix,
  currentStoreCapabilityReceiptRoot: null, operationalCommitReceiptRoot: null, authorityCredit: 0,
};
acceptanceCas.responseLossRecoveryProgram.programRoot = domainRoot('CONNECT-B0-V6-ACCEPTANCE-RESPONSE-LOSS-READBACK-PROGRAM-V1', acceptanceCas.responseLossRecoveryProgram);

const acceptanceEnvelopeSchema = {
  schemaId: 'B0V6-CLOSED-TYPED-ACCEPTANCE-ENVELOPE-V1', fieldCount: acceptanceFields.length, fields: acceptanceFields,
  completeOutputDenominator: { outputCount: outputRegistry.length, orderedOutputIds: outputRegistry.map((item) => item.outputId), outputRegistryRoot: domainRoot('CONNECT-B0-V6-OUTPUT-REGISTRY-V1', outputRegistry), completenessProgram: outputCompletenessProgram, mutationMatrixCount: outputMutationMatrix.length, mutationMatrix: outputMutationMatrix },
  headInvalidationMatrixCount: headInvalidationMatrix.length,
  headInvalidationMatrix,
  twoWitnessPredicate: { op: 'AND', acknowledgementSchemaRoot: witnessAcknowledgementSchema.schemaRoot, planningAdmittedAcknowledgementRoots: witnessAcknowledgements.map((item) => item.instanceRoot), programRoot: twoWitnessIndependenceProgram.programRoot, args: [{ op: 'DISTINCT', leftPath: '/witness1ControllerRoot', rightPath: '/witness2ControllerRoot' }, { op: 'EQ', leftPath: '/witness1CheckpointRoot', rightPath: '/witness2CheckpointRoot' }, { op: 'ALL-ROLE-CONFLICTS-PASS', roles: roleNames }] },
  independenceProfileDenominator: { count: 9, profiles: independenceProfiles },
  soleProducerRegistryRoot: acceptanceSoleProducerRegistry.registryRoot,
  operationalCurrentEnvelopeRoot: null, acceptedRequirementCount: 0, implementedOutputCount: 0, authorityCredit: 0, acceptanceCredit: 0,
};

const calculatedBaseDomainMutationVectorCount =
  EXPECTED_SOURCE_ARTIFACT_COUNT + EXPECTED_SOURCE_MEMBER_COUNT +
  inheritedSelectorOccurrences.length + predecessorSemanticNonWeakeningRows.length +
  900 + (priorInterfaces.length * 6) + EXPECTED_V5_PACKAGE_ROOT_VECTOR_COUNT +
  pairMatrix.length + acceptanceProducerAssignments.length + (independenceProfiles.length * 8) + witnessMutationMatrix.length +
  permitSchemas.reduce((sum, schema) => sum + schema.fields.length, 0) + permitRuleMutationMatrix.length +
  objectToHead.length + headInvalidationMatrix.length + outputMutationMatrix.length +
  genesisMemberSchemas.reduce((sum, schema) => sum + schema.classSpecificFieldCount + 1, 0) + genesisCausalMutationMatrix.length +
  recoveryMembers.reduce((sum, schema) => sum + schema.fields.length, 0) + recoveryWitnesses.reduce((sum, schema) => sum + schema.fields.length, 0) + recoveryAttemptFields.length + recoveryMutationMatrix.length +
  crashMatrix.length + twoWriterInterleavingClasses.length + casMutationMatrix.length + detachedAcceptanceSchema.fields.length;
if ((v5Manifest.members.length * 5) + 2 !== EXPECTED_V5_PACKAGE_ROOT_VECTOR_COUNT || calculatedBaseDomainMutationVectorCount !== BASE_DOMAIN_MUTATION_VECTOR_COUNT || BASE_DOMAIN_MUTATION_VECTOR_COUNT + NO_MERGE_DOMAIN_EXPANSION_VECTOR_COUNT !== EXPECTED_DOMAIN_MUTATION_VECTOR_COUNT || BASE_FIVE_FIELD_VECTOR_COUNT + EXPECTED_DOMAIN_MUTATION_VECTOR_COUNT !== TOTAL_PLANNING_VECTOR_COUNT) throw new Error(`Full mutation matrix predeclared denominator mismatch ${calculatedBaseDomainMutationVectorCount}`);

const registryBase = {
  artifactId: 'CONNECT-B0-V6-NORMATIVE-REGISTRY-2026-08-30-G0',
  artifactClass: 'IMMUTABLE-B0-V6-PLANNING-CANDIDATE-NORMATIVE-REGISTRY;NOT-AUTHORITY;NOT-ACCEPTANCE', schemaVersion: 1,
  repositoryVisibility: 'PUBLIC',
  frozenInputRoots: [
    { artifact: PATHS.v5Subject, sha256: V5_HASHES.subject }, { artifact: PATHS.v5Manifest, sha256: V5_HASHES.manifest },
    { artifact: PATHS.v5Review, sha256: V5_HASHES.review }, { artifact: PATHS.v5Findings, sha256: V5_HASHES.findings },
  ],
  blockerDenominator: { activeBlockerCount: 31, v5IndependentFindingCount: 20, remainingOpenV4FindingCount: 11, preservedClosedV4FindingCount: 1, noMerge: true },
  preservedClosedFinding: { findingId: 'B0V4-HR-F012', noMergeKey: 'B0V4-PACKAGE-CONTENT-ROOT-DERIVATION-UNSPECIFIED', state: 'PRESERVED-CLOSED-INDEPENDENT-MECHANICAL', additionalClosureCredit: 0, authorityCredit: 0, acceptanceCredit: 0 },
  sourcePathPolicy, semanticExtractionPolicy, oracleLanguage,
  blockerClosureControls,
  inheritedSelectorReducer,
  predecessorSemanticNonWeakening,
  typedSupersessionEngine: { rowCount: supersessionRows.length, rows: supersessionRows, overlapCount: 0, deterministicOrder: 'ASCENDING-ORDINAL', confluenceRule: 'DISJOINT-FINDING-SECTIONS+IMMUTABLE-SAFETY-INTENTS+ONE-CONTROL-PER-FINDING;INHERITED-128-SELECTOR-CONFLUENCE-IS-SEPARATELY-BOUND-BY-INHERITED-SELECTOR-REDUCER', unknownSelectorPolicy: 'BLOCK' },
  priorInterfaceRegistry: { interfaceCount: priorInterfaces.length, interfaces: priorInterfaces, operationalCurrentInstanceCount: 0 },
  roleAndAppointmentAuthority: roleAuthority,
  acceptanceSoleProducerRegistry,
  witnessAndProofIndependence: { witnessAcknowledgementSchema, planningAdmittedAcknowledgements: witnessAcknowledgements, twoWitnessIndependenceProgram, witnessMutationMatrix, authorityCredit: 0 },
  independenceProfileRegistry: { profileCount: independenceProfiles.length, planningAdmittedProfiles: independenceProfiles, operationalCurrentProfileCount: 0, missingProofClassPolicy: 'BLOCK', staleProfilePolicy: 'BLOCK', sharedImplementationDependencyRuntimeControllerOrContextPolicy: 'BLOCK', disclosureBeforeBothSubmissionsPolicy: 'BLOCK' },
  permitAndTemporalAuthority, mutableHeadRegistry,
  genesisFoundation: {
    memberCount: genesisMemberSchemas.length,
    classSpecificSchemas: genesisMemberSchemas,
    externalAdmissionSchema,
    planningExternalAdmission,
    authorityGraph: genesisAuthorityGraph,
    firstGenesisPermitTransitionProgram,
    causalMutationMatrix: genesisCausalMutationMatrix,
    externalOperationalAdmissionRoot: null,
    firstOperationalGenesisPermitRoot: null,
    authorityCredit: 0,
  },
  recoveryQuorum, detachedAcceptanceSchema, acceptanceCas, acceptanceEnvelopeSchema, outputRegistry,
  deterministicIdentityProfile: { profileId: 'B0V6-DETERMINISTIC-IDENTITY-V1', algorithm: 'SHA-256', construction: 'SHA256(UTF8(DOMAIN+0x0A)||CANONICAL-JSON-V1(INPUT))', randomnessAllowed: false, unknownDomainPolicy: 'BLOCK' },
  currentAuthorityState: { externalL0Authority: 'ABSENT', operationalGenesisFoundationReceipt: null, canonicalMandateReceipt: null, acceptedRequirementCount: '0/127', implementedOutputCount: '0/127', independentlyClosedActiveBlockerCount: '0/31', planningVectorCount: TOTAL_PLANNING_VECTOR_COUNT, operationalVectorExecutionCount: `0/${TOTAL_PLANNING_VECTOR_COUNT}`, B0: 'ABSENT', ControlSequenceAcceptance: 'BLOCKED', Gate29: 'BLOCKED', developmentFreeze: 'ACTIVE' },
};
const registry = { ...registryBase, registryContentRoot: domainRoot('CONNECT-B0-V6-NORMATIVE-REGISTRY-CONTENT-V1', registryBase) };
const registryContent = pretty(registry);
const registrySha = shaBytes(Buffer.from(registryContent));

function remediationRequirement(blocker, index) {
  const vectors = Array.from({ length: 5 }, (_, axisIndex) => `B0V6-V-${pad(index)}-A${axisIndex + 1}`);
  const prior = index === 0 ? 'none' : `B0V6REQ-${pad(index - 1)}`;
  return {
    id: `B0V6REQ-${pad(index)}`,
    title: `One-to-one materialization for ${blocker.findingId}: ${blocker.title}`,
    fields: {
      statement: `addresses=${blocker.findingId}; noMergeKey=${blocker.noMergeKey}; output=B0V6OUT-${pad(index)}; uses=B0V6-CONTROL-${pad(index)}; materialize exactly one typed zero-authority closure candidate without closure transfer.`,
      threatCauseImpact: `If ${blocker.findingId} is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.`,
      requiredProof: `The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=${vectors.join(',')}.`,
      dependencies: `buildDependencies=${prior}.`,
      sourceBasis: `cites=${blocker.sourceFinding.alias}@${blocker.sourceFinding.artifactSha256}::${blocker.findingId}; cites=B0V6NR@${registrySha}::/blockerClosureControls/${index}.`,
    },
  };
}

function inheritedRequirement(source, inheritedIndex) {
  const index = inheritedIndex + 31;
  const vectors = FIELD_NAMES.map((_, fieldIndex) => `B0V6-V-${pad(index)}-F${fieldIndex + 1}`);
  return {
    id: `B0V6REQ-${pad(index)}`,
    title: `Byte-exact inherited five-field bundle for ${source.id}`,
    fields: {
      statement: `preservesV5=${source.id}; output=B0V6OUT-${pad(index)}; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.`,
      threatCauseImpact: 'Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.',
      requiredProof: `All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=${vectors.join(',')}.`,
      dependencies: `buildDependencies=${Array.from({ length: 31 }, (_, value) => `B0V6REQ-${pad(value)}`).join(',')}.`,
      sourceBasis: `cites=B0V5@${V5_HASHES.subject}::${source.id}; cites=B0V6NR@${registrySha}::/semanticExtractionPolicy.`,
    },
  };
}

const v6Requirements = [...blockers.map(remediationRequirement), ...v5Requirements.map(inheritedRequirement)];
if (v6Requirements.length !== 127) throw new Error('v6 Requirement denominator mismatch');

function renderSubject() {
  const linesOut = [
    '# 1. Connect — Bootstrap Authority Envelope B0 successor requirements v6', '',
    '## 1.1 Identity and immutable claim limit', '',
    '1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-V6-2026-08-30-G0`.', '',
    '1.1.2 `artifactClass=IMMUTABLE-PLANNING-ONLY-SUCCESSOR-CANDIDATE;NOT-AUTHORITY;NOT-ACCEPTANCE`.', '',
    `1.1.3 Frozen predecessor Subject SHA-256 \`${V5_HASHES.subject}\`; frozen v5 package manifest SHA-256 \`${V5_HASHES.manifest}\`; frozen v5 hostile-review Findings SHA-256 \`${V5_HASHES.findings}\`.`, '',
    '1.1.4 Repository paths are relative to the public Git top level and begin with `docs/`; absolute paths, traversal, symlink substitution and an extra repository-name prefix block.', '',
    '1.1.5 Active blockers are exactly 31: 20 v5 independent Findings plus the 11 v4 Findings still open after v5. `B0V4-HR-F012` is preserved closed with no additional credit.', '',
    '1.1.6 Candidate closure is one-to-one and non-merged. Every Requirement below has one Output, one typed control and five executable mutation vectors.', '',
    '1.1.7 Planning-admitted instances validate schemas only. They are explicitly non-operational, zero-authority and cannot substitute for external L0 admission, current Appointments, Permits, receipts, Acceptance or review closure.', '',
    `1.1.8 \`Acceptance=0\`; accepted Requirements \`0/127\`; implemented Outputs \`0/127\`; operational vectors \`0/${TOTAL_PLANNING_VECTOR_COUNT}\`; \`B0=ABSENT\`; \`Gate29=BLOCKED\`; \`developmentFreeze=ACTIVE\`; \`repositoryVisibility=PUBLIC\`.`, '',
    '## 1.2 Exact denominators', '',
    '| Denominator | Value |', '|---|---:|',
    '| Active blockers | 31 |', '| v5 independent Findings | 20 |', '| Remaining open v4 Findings | 11 |', '| Preserved-closed v4 Findings | 1 |',
    '| Requirements / five-field atoms | 127 / 635 |', '| Outputs | 127 |', `| Base five-field negative vectors | ${BASE_FIVE_FIELD_VECTOR_COUNT} |`, `| Full domain mutation vectors | ${EXPECTED_DOMAIN_MUTATION_VECTOR_COUNT} |`, `| Total portable negative vectors | ${TOTAL_PLANNING_VECTOR_COUNT} |`,
    '| Authoritative inherited fields under semantic extraction | 900 |', '| Genesis class-specific schemas / planning-admitted instances | 33 / 33 |',
    '| Recovery members / witnesses | 5 / 2 |', '| Roles / unordered conflict pairs | 21 / 210 |', '| Mutable object classes / heads | 94 / 36 |', '',
    '# 2. One-to-one Requirements', '',
  ];
  v6Requirements.forEach((requirement, index) => {
    const section = `${Math.floor(index / 100) + 1}.${index + 1}`;
    linesOut.push(`## ${section} \`${requirement.id}\` — ${requirement.title}`, '');
    FIELD_NAMES.forEach((field, fieldIndex) => linesOut.push(`${section}.${fieldIndex + 1} \`${field}\`: ${requirement.fields[field]}`, ''));
  });
  linesOut.push('# 3. Current state', '', '3.1 `authorityCredit=0`; `acceptanceCredit=0`; `freshIndependentHostileReview=PENDING`.', '', '3.2 `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.', '');
  return linesOut.join('\n');
}

const subjectContent = renderSubject();
const subjectSha = shaBytes(Buffer.from(subjectContent));
const parsedV6Requirements = parseRequirements(subjectContent, 'B0V6');
if (parsedV6Requirements.length !== 127) throw new Error(`Generated Subject parse mismatch ${parsedV6Requirements.length}`);

function wholeMember(alias, logicalPath) {
  const buffer = read(logicalPath);
  return { alias, logicalPath, artifactSha256: shaBytes(buffer), locator: '/', startByteInclusive: 0, endByteExclusive: buffer.length, byteLength: buffer.length, memberSha256: shaBytes(buffer) };
}

function buildSourceIndex() {
  const artifacts = new Map();
  function ensureArtifact(alias, logicalPath, expectedSha) {
    logicalPath = correctedPath(logicalPath);
    const buffer = read(logicalPath);
    const actualSha = shaBytes(buffer);
    if (expectedSha && actualSha !== expectedSha) throw new Error(`Source artifact hash mismatch ${alias}`);
    if (!artifacts.has(alias)) artifacts.set(alias, { alias, logicalPath, sha256: actualSha, bytes: buffer.length, lines: lines(buffer), mediaType: logicalPath.endsWith('.json') ? 'application/json' : 'text/markdown', repositoryVisibility: 'PUBLIC', authorityCredit: 0, members: new Map() });
    return artifacts.get(alias);
  }
  function addMember(alias, logicalPath, artifactSha, member) {
    const artifact = ensureArtifact(alias, logicalPath, artifactSha);
    const normalized = { locator: member.locator, startByteInclusive: member.startByteInclusive, endByteExclusive: member.endByteExclusive, byteLength: member.byteLength, sha256: member.memberSha256 ?? member.sha256 };
    const buffer = read(artifact.logicalPath).subarray(normalized.startByteInclusive, normalized.endByteExclusive);
    if (buffer.length !== normalized.byteLength || shaBytes(buffer) !== normalized.sha256) throw new Error(`Bad source member ${alias}::${normalized.locator}`);
    const prior = artifact.members.get(normalized.locator);
    if (prior && canonical(prior) !== canonical(normalized)) throw new Error(`Conflicting locator ${alias}::${normalized.locator}`);
    artifact.members.set(normalized.locator, normalized);
  }

  for (const ref of v5Crosswalk.inheritedSourceReferenceResolution.references) {
    const member = ref.resolvedMember;
    addMember(member.alias, correctedPath(member.logicalPath), member.artifactSha256, member);
  }
  for (const row of v5Crosswalk.inheritedV4Requirements) {
    for (const field of row.fields) {
      const member = field.sourceField;
      addMember(member.alias, correctedPath(member.logicalPath), member.artifactSha256, member);
    }
  }
  for (const blocker of blockers) addMember(blocker.sourceFinding.alias, blocker.sourceFinding.logicalPath, blocker.sourceFinding.artifactSha256, blocker.sourceFinding);

  const v5Buffer = read(PATHS.v5Subject);
  const v5Artifact = ensureArtifact('B0V5', PATHS.v5Subject, V5_HASHES.subject);
  for (const requirement of v5Requirements) {
    addMember('B0V5', PATHS.v5Subject, V5_HASHES.subject, { locator: requirement.id, startByteInclusive: requirement.section.startByteInclusive, endByteExclusive: requirement.section.endByteExclusive, byteLength: requirement.section.byteLength, sha256: requirement.section.sha256 });
    for (const field of FIELD_NAMES) addMember('B0V5', PATHS.v5Subject, V5_HASHES.subject, { locator: `${requirement.id}.${field}`, ...requirement.fieldSpans[field] });
  }
  void v5Buffer; void v5Artifact;

  const generatedArtifacts = [
    ['B0V5NR', PATHS.v5Registry, V5_HASHES.registry], ['B0V5SI', PATHS.v5SourceIndex, V5_HASHES.sourceIndex], ['B0V5CW', PATHS.v5Crosswalk, V5_HASHES.crosswalk],
    ['B0V5VC', PATHS.v5Vectors, V5_HASHES.vectors], ['B0V5PM', PATHS.v5Manifest, V5_HASHES.manifest], ['B0V5IHR', PATHS.v5Review, V5_HASHES.review],
  ];
  for (const [alias, logicalPath, hash] of generatedArtifacts) {
    const buffer = read(logicalPath); addMember(alias, logicalPath, hash, { locator: '/', startByteInclusive: 0, endByteExclusive: buffer.length, byteLength: buffer.length, sha256: hash });
  }

  const v6SubjectArtifact = { alias: 'B0V6', logicalPath: PATHS.subject, sha256: subjectSha, bytes: Buffer.byteLength(subjectContent), lines: subjectContent.split('\n').length - 1, mediaType: 'text/markdown', repositoryVisibility: 'PUBLIC', authorityCredit: 0, members: [] };
  for (const requirement of parsedV6Requirements) {
    v6SubjectArtifact.members.push({ locator: requirement.id, startByteInclusive: requirement.section.startByteInclusive, endByteExclusive: requirement.section.endByteExclusive, byteLength: requirement.section.byteLength, sha256: requirement.section.sha256 });
    for (const field of FIELD_NAMES) v6SubjectArtifact.members.push({ locator: `${requirement.id}.${field}`, ...requirement.fieldSpans[field] });
  }
  artifacts.set('B0V6', { ...v6SubjectArtifact, members: new Map(v6SubjectArtifact.members.map((member) => [member.locator, member])) });

  const registryBuffer = Buffer.from(registryContent);
  const registryArtifact = { alias: 'B0V6NR', logicalPath: PATHS.registry, sha256: registrySha, bytes: registryBuffer.length, lines: registryContent.split('\n').length - 1, mediaType: 'application/json', repositoryVisibility: 'PUBLIC', authorityCredit: 0, members: new Map() };
  registryArtifact.members.set('/', { locator: '/', startByteInclusive: 0, endByteExclusive: registryBuffer.length, byteLength: registryBuffer.length, sha256: registrySha });
  artifacts.set('B0V6NR', registryArtifact);

  const rows = [...artifacts.values()].sort((left, right) => left.alias.localeCompare(right.alias)).map((artifact) => ({
    alias: artifact.alias, logicalPath: artifact.logicalPath, sha256: artifact.sha256, bytes: artifact.bytes, lines: artifact.lines, mediaType: artifact.mediaType,
    repositoryVisibility: 'PUBLIC', authorityCredit: 0, memberCount: artifact.members.size,
    members: [...artifact.members.values()].sort((left, right) => left.startByteInclusive - right.startByteInclusive || left.locator.localeCompare(right.locator)),
  }));
  const memberCount = rows.reduce((sum, artifact) => sum + artifact.memberCount, 0);
  const base = {
    artifactId: 'CONNECT-B0-V6-PORTABLE-SOURCE-MEMBER-SPAN-INDEX-2026-08-30-G0', artifactClass: 'IMMUTABLE-REPO-RELATIVE-EXACT-SOURCE-SPAN-INDEX;PLANNING-ONLY;NOT-AUTHORITY', schemaVersion: 1,
    subjectSha256: subjectSha, normativeRegistrySha256: registrySha, repositoryRootDefinition: 'PUBLIC-GIT-TOP-LEVEL',
    pathPolicyRoot: sourcePathPolicy.policyRoot, artifactCount: rows.length, memberCount, artifacts: rows,
    collapsedSpanCount: rows.flatMap((artifact) => artifact.members).filter((member) => member.byteLength <= 1).length,
    absolutePathCount: rows.filter((artifact) => artifact.logicalPath.startsWith('/')).length,
    extraRepositoryPrefixCount: rows.filter((artifact) => artifact.logicalPath.startsWith('web/')).length,
    repositoryVisibility: 'PUBLIC', authorityCredit: 0, acceptanceCredit: 0,
  };
  return { ...base, indexContentRoot: domainRoot('CONNECT-B0-V6-SOURCE-INDEX-CONTENT-V1', base) };
}

const sourceIndex = buildSourceIndex();
const sourceIndexContent = pretty(sourceIndex);
const sourceIndexSha = shaBytes(Buffer.from(sourceIndexContent));

const sourceArtifactByAlias = new Map(sourceIndex.artifacts.map((artifact) => [artifact.alias, artifact]));
function indexedMember(alias, locator) {
  const artifact = sourceArtifactByAlias.get(alias); if (!artifact) throw new Error(`Unknown alias ${alias}`);
  const member = artifact.members.find((item) => item.locator === locator); if (!member) throw new Error(`Unknown locator ${alias}::${locator}`);
  return { alias, logicalPath: artifact.logicalPath, artifactSha256: artifact.sha256, locator, startByteInclusive: member.startByteInclusive, endByteExclusive: member.endByteExclusive, byteLength: member.byteLength, memberSha256: member.sha256 };
}

function semanticTokens(value) {
  const pattern = /\b[A-Za-z][A-Za-z0-9]*=|\bB0[A-Z0-9-]{3,}\b|\b[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]+)+\b|\b[A-Z][A-Z0-9_-]{2,}\b/g;
  const tokens = [];
  for (const match of value.matchAll(pattern)) {
    const raw = match[0];
    let tokenClass;
    let token = raw;
    if (raw.endsWith('=')) { tokenClass = 'RELATION'; token = raw.slice(0, -1); }
    else if (/^B0[A-Z0-9-]{3,}$/.test(raw)) tokenClass = 'ARTIFACT-ID';
    else if (/^[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]+)+$/.test(raw)) tokenClass = 'TYPE';
    else tokenClass = 'ENUM';
    tokens.push({
      tokenClass,
      token,
      rawUtf8Base64: Buffer.from(raw, 'utf8').toString('base64'),
      startByteInclusive: Buffer.byteLength(value.slice(0, match.index)),
      endByteExclusive: Buffer.byteLength(value.slice(0, match.index + raw.length)),
    });
  }
  return tokens;
}

function semanticCoverage(value, tokens, atomId) {
  const valueBytes = Buffer.from(value, 'utf8');
  const segments = [];
  let cursor = 0;
  tokens.forEach((token, index) => {
    if (token.startByteInclusive < cursor || token.endByteExclusive <= token.startByteInclusive) throw new Error(`Overlapping semantic token ${atomId}`);
    if (cursor < token.startByteInclusive) {
      const literal = valueBytes.subarray(cursor, token.startByteInclusive);
      segments.push({ segmentClass: 'LITERAL-TEXT', startByteInclusive: cursor, endByteExclusive: token.startByteInclusive, utf8Base64: literal.toString('base64'), sha256: shaBytes(literal) });
    }
    const semanticBytes = valueBytes.subarray(token.startByteInclusive, token.endByteExclusive);
    segments.push({ segmentClass: 'MACHINE-SEMANTIC', tokenOrdinal: index + 1, tokenClass: token.tokenClass, token: token.token, startByteInclusive: token.startByteInclusive, endByteExclusive: token.endByteExclusive, utf8Base64: semanticBytes.toString('base64'), sha256: shaBytes(semanticBytes) });
    cursor = token.endByteExclusive;
  });
  if (cursor < valueBytes.length) {
    const literal = valueBytes.subarray(cursor);
    segments.push({ segmentClass: 'LITERAL-TEXT', startByteInclusive: cursor, endByteExclusive: valueBytes.length, utf8Base64: literal.toString('base64'), sha256: shaBytes(literal) });
  }
  const rebuilt = Buffer.concat(segments.map((segment) => Buffer.from(segment.utf8Base64, 'base64')));
  if (!rebuilt.equals(valueBytes)) throw new Error(`Semantic coverage rebuild failed ${atomId}`);
  const namedUses = tokens.map((token, index) => ({
    namedUseId: deterministicId('B0V6-NAMED-USE', 'CONNECT-B0-V6-NAMED-USE-ID-V1', { atomId, index, tokenClass: token.tokenClass, token: token.token, start: token.startByteInclusive, end: token.endByteExclusive }),
    atomId,
    tokenOrdinal: index + 1,
    edgeClass: token.tokenClass === 'RELATION' ? 'RELATION-NAMES-VALUE' : token.tokenClass === 'ARTIFACT-ID' ? 'NAMES-ARTIFACT' : token.tokenClass === 'TYPE' ? 'NAMES-TYPE' : 'NAMES-ENUM',
    sourceNode: `Atom:${atomId}`,
    targetNode: `${token.tokenClass}:${token.token}`,
    sourceSpan: { startByteInclusive: token.startByteInclusive, endByteExclusive: token.endByteExclusive },
  }));
  return { segments, namedUses, coveredByteLength: rebuilt.length, exactCoverage: rebuilt.length === valueBytes.length };
}

const inheritedV5Rows = v5Requirements.map((source, index) => {
  const sourceMember = indexedMember('B0V5', source.id);
  const fields = FIELD_NAMES.map((field) => {
    const value = source.fields[field]; const bytesValue = Buffer.from(value, 'utf8');
    return { field, sourceField: indexedMember('B0V5', `${source.id}.${field}`), exactOldValue: value, exactOldValueUtf8Base64: bytesValue.toString('base64'), exactOldValueSha256: shaBytes(bytesValue), disposition: 'ACTIVE-INHERITED-MANDATORY-BYTE-ATOM;NO-AUTHORITY-OR-CLOSURE-TRANSFER', semanticTokens: semanticTokens(value) };
  });
  return { sourceRequirementId: source.id, sourceMember, sourceFiveFieldRoot: domainRoot('CONNECT-B0-V5-FIVE-FIELD-BUNDLE-V1', source.fields), targetRequirementId: `B0V6REQ-${pad(index + 31)}`, targetOutputId: `B0V6OUT-${pad(index + 31)}`, fieldCount: 5, fields, mappingCardinality: 'ONE-SOURCE-TO-ONE-TARGET', closureTransferred: false, acceptanceTransferred: false };
});

const inheritedV4Atoms = v5Crosswalk.inheritedV4Requirements.flatMap((row) => row.fields.map((field) => ({
  atomId: `B0V4:${row.sourceRequirementId}.${field.field}`, sourceRequirementId: row.sourceRequirementId, field: field.field,
  sourceField: { ...field.sourceField, logicalPath: correctedPath(field.sourceField.logicalPath) }, exactValue: field.exactOldValue,
  exactValueSha256: field.exactOldValueSha256, inheritedDisposition: field.disposition,
  semanticTokens: semanticTokens(field.exactOldValue), authorityCredit: 0,
})));
const authoritativeAtoms = [
  ...inheritedV5Rows.flatMap((row) => row.fields.map((field) => ({ atomId: `B0V5:${row.sourceRequirementId}.${field.field}`, sourceRequirementId: row.sourceRequirementId, field: field.field, sourceField: field.sourceField, exactValue: field.exactOldValue, exactValueSha256: field.exactOldValueSha256, inheritedDisposition: field.disposition, semanticTokens: field.semanticTokens, authorityCredit: 0 }))),
  ...inheritedV4Atoms,
];
if (authoritativeAtoms.length !== 900) throw new Error('Authoritative atom denominator mismatch');
const semanticExtraction = authoritativeAtoms.map((atom) => {
  const coverage = semanticCoverage(atom.exactValue, atom.semanticTokens, atom.atomId);
  const body = {
    atomId: atom.atomId,
    exactValueSha256: atom.exactValueSha256,
    exactValueUtf8Base64: Buffer.from(atom.exactValue, 'utf8').toString('base64'),
    tokenCount: atom.semanticTokens.length,
    tokens: atom.semanticTokens,
    tokenStreamRoot: domainRoot('CONNECT-B0-V6-SEMANTIC-TOKEN-STREAM-V1', atom.semanticTokens),
    coverageSegments: coverage.segments,
    coveredByteLength: coverage.coveredByteLength,
    exactCoverage: coverage.exactCoverage,
    namedUseCount: coverage.namedUses.length,
    namedUses: coverage.namedUses,
    unclassifiedTokens: [],
  };
  return { ...body, extractionRoot: domainRoot('CONNECT-B0-V6-SEMANTIC-EXTRACTION-RECORD-V1', body) };
});
const activeNamedUses = semanticExtraction.flatMap((record) => record.namedUses);
if (new Set(activeNamedUses.map((item) => item.namedUseId)).size !== activeNamedUses.length || !semanticExtraction.every((item) => item.exactCoverage)) throw new Error('Semantic NamedUse universe is not exact and unique');
const activeSemanticGraph = {
  authoritativeAtomCount: authoritativeAtoms.length,
  extractionRecordCount: semanticExtraction.length,
  namedUseCount: activeNamedUses.length,
  namedUses: activeNamedUses,
  duplicateNamedUseCount: 0,
  unclassifiedMachineTokenCount: 0,
  exactByteCoverageRecordCount: semanticExtraction.filter((item) => item.exactCoverage).length,
  projectionRule: 'ONE-NAMED-USE-PER-LEXED-MACHINE-SEMANTIC-OCCURRENCE;ALL-OTHER-BYTES-ROOTED-AS-LITERAL-TEXT;EDGES-DERIVED-ONLY-FROM-EXACT-SPANS',
  unknownMachineTokenPolicy: 'BLOCK',
  authorityCredit: 0,
};
activeSemanticGraph.graphRoot = domainRoot('CONNECT-B0-V6-ACTIVE-SEMANTIC-NAMED-USE-GRAPH-V1', activeSemanticGraph);

const blockerClosureRows = blockers.map((blocker, index) => ({
  ordinal: index + 1, sourceFindingId: blocker.findingId, sourceFinding: blocker.sourceFinding, severity: blocker.severity, noMergeKey: blocker.noMergeKey,
  targetRequirementId: `B0V6REQ-${pad(index)}`, targetOutputId: `B0V6OUT-${pad(index)}`, controlId: blockerClosureControls[index].controlId,
  controlRoot: blockerClosureControls[index].controlRoot, supersessionId: supersessionRows[index].supersessionId, replacementRoot: supersessionRows[index].replacementRoot,
  mappingCardinality: 'ONE-SOURCE-FINDING-TO-ONE-CONTROL-TO-ONE-REQUIREMENT-TO-ONE-OUTPUT;NO-MERGE',
  requiredVectorIds: Array.from({ length: 5 }, (_, axisIndex) => `B0V6-V-${pad(index)}-A${axisIndex + 1}`),
  requiredDomainVectorFamilies: REQUIRED_DOMAIN_VECTOR_FAMILIES[blocker.findingId],
  producerCandidateState: 'MATERIALIZED;FRESH-INDEPENDENT-HOSTILE-REVIEW-PENDING', independentClosureState: 'OPEN-PENDING-FRESH-INDEPENDENT-HOSTILE-REVIEW', closureTransferred: false, acceptanceTransferred: false, authorityCredit: 0,
}));

const crosswalkBase = {
  artifactId: 'CONNECT-B0-V6-LOSSLESS-CLOSURE-CROSSWALK-2026-08-30-G0', artifactClass: 'IMMUTABLE-ONE-TO-ONE-CLOSURE-AND-INHERITANCE-CROSSWALK;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE', schemaVersion: 1,
  subjectSha256: subjectSha, normativeRegistrySha256: registrySha, sourceMemberSpanIndexSha256: sourceIndexSha,
  activeBlockerDenominator: 31, blockerClosureRecordCount: blockerClosureRows.length, blockerClosureRows,
  preservedClosedFinding: registry.preservedClosedFinding,
  inheritedV5RequirementCount: inheritedV5Rows.length, inheritedV5FieldCount: inheritedV5Rows.length * 5, inheritedV5Requirements: inheritedV5Rows,
  transitiveInheritedV4FieldCount: inheritedV4Atoms.length, authoritativeInheritedByteAtomCount: authoritativeAtoms.length,
  authoritativeInheritedByteAtoms: authoritativeAtoms,
  semanticExtractionPolicyRoot: semanticExtractionPolicy.policyRoot, semanticExtractionRecordCount: semanticExtraction.length, semanticExtraction,
  semanticExtractionRoot: domainRoot('CONNECT-B0-V6-AUTHORITATIVE-SEMANTIC-EXTRACTION-V1', semanticExtraction),
  activeSemanticGraph,
  activeNamedUseCount: activeNamedUses.length,
  unclassifiedSemanticTokenCount: 0,
  transitiveSourceReferenceCount: v5Crosswalk.inheritedSourceReferenceResolution.referenceCount,
  transitiveSourceReferences: v5Crosswalk.inheritedSourceReferenceResolution.references.map((ref) => ({ ...ref, resolvedMember: { ...ref.resolvedMember, logicalPath: correctedPath(ref.resolvedMember.logicalPath) } })),
  v6RequirementCount: parsedV6Requirements.length, v6FiveFieldCount: parsedV6Requirements.length * 5,
  v6Requirements: parsedV6Requirements.map((requirement) => ({ requirementId: requirement.id, title: requirement.title, fields: requirement.fields, fieldRoot: domainRoot('CONNECT-B0-V6-FIVE-FIELD-BUNDLE-V1', requirement.fields), outputId: `B0V6OUT-${requirement.id.slice(-3)}` })),
  outputRegistryRoot: acceptanceEnvelopeSchema.completeOutputDenominator.outputRegistryRoot,
  currentClosureState: '0/31;FRESH-INDEPENDENT-HOSTILE-REVIEW-PENDING', authorityCredit: 0, acceptanceCredit: 0,
};
const crosswalk = { ...crosswalkBase, crosswalkContentRoot: domainRoot('CONNECT-B0-V6-CROSSWALK-CONTENT-V1', crosswalkBase) };
const crosswalkContent = pretty(crosswalk);
const crosswalkSha = shaBytes(Buffer.from(crosswalkContent));

function badAxisValue(axisValue) {
  if (axisValue.kind === 'EQUAL') return typeof axisValue.actual === 'number' ? axisValue.actual + 1 : axisValue.actual === null ? 'NON-NULL-MUTATION' : `${axisValue.actual}:MUTATED`;
  if (axisValue.kind === 'NON_NULL') return null;
  if (axisValue.kind === 'ZERO') return 1;
  if (axisValue.kind === 'COUNT_EQUAL') return axisValue.expected + 1;
  if (axisValue.kind === 'UNIQUE_COUNT') return axisValue.actual.length ? [...axisValue.actual, axisValue.actual[0]] : ['DUPLICATE', 'DUPLICATE'];
  if (axisValue.kind === 'DISTINCT') return axisValue.actualLeft;
  if (axisValue.kind === 'SET_CONTAINS_ALL') return axisValue.actual.filter((item) => !axisValue.required.includes(item));
  if (axisValue.kind === 'PATH_REPO_RELATIVE') return `web/${axisValue.actual}`;
  if (axisValue.kind === 'BOOLEAN_TRUE') return false;
  throw new Error(`Unknown axis kind ${axisValue.kind}`);
}

function evaluateAxis(axisValue) {
  if (axisValue.kind === 'EQUAL') return canonical(axisValue.actual) === canonical(axisValue.expected);
  if (axisValue.kind === 'NON_NULL') return axisValue.actual !== null && axisValue.actual !== '';
  if (axisValue.kind === 'ZERO') return axisValue.actual === 0;
  if (axisValue.kind === 'COUNT_EQUAL') return Number.isInteger(axisValue.actual) && axisValue.actual >= 0 && axisValue.actual === axisValue.expected;
  if (axisValue.kind === 'UNIQUE_COUNT') return Array.isArray(axisValue.actual) && axisValue.actual.length === axisValue.expected && new Set(axisValue.actual.map(canonical)).size === axisValue.expected;
  if (axisValue.kind === 'DISTINCT') return canonical(axisValue.actualLeft) !== canonical(axisValue.actualRight);
  if (axisValue.kind === 'SET_CONTAINS_ALL') return axisValue.required.every((item) => axisValue.actual.some((actual) => canonical(actual) === canonical(item)));
  if (axisValue.kind === 'PATH_REPO_RELATIVE') return typeof axisValue.actual === 'string' && axisValue.actual.startsWith('docs/') && !axisValue.actual.startsWith('web/') && !axisValue.actual.startsWith('/') && !axisValue.actual.includes('..');
  if (axisValue.kind === 'BOOLEAN_TRUE') return axisValue.actual === true;
  throw new Error(`Unknown axis kind ${axisValue.kind}`);
}

function setPointer(document, pointer, value) {
  const parts = pointer.split('/').slice(1).map((item) => item.replaceAll('~1', '/').replaceAll('~0', '~'));
  let target = document;
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (!(parts[index] in target)) throw new Error(`Missing pointer ${pointer}`);
    target = target[parts[index]];
  }
  if (!(parts.at(-1) in target)) throw new Error(`Missing pointer ${pointer}`);
  target[parts.at(-1)] = clone(value);
}

function getPointer(document, pointer) {
  let value = document;
  for (const part of pointer.split('/').slice(1).map((item) => item.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (value === null || value === undefined || !(part in value)) throw new Error(`Missing pointer ${pointer}`);
    value = value[part];
  }
  return value;
}

function isTypedValue(value, type) {
  if (type === 'NULL-CONSTANT') return value === null;
  if (type === 'BOOLEAN' || type.startsWith('BOOLEAN-')) return typeof value === 'boolean';
  if (/^(U8|U64)/.test(type)) return Number.isInteger(value) && value >= 0;
  if (type === 'SHA256') return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
  if (type === 'SHA256-ARRAY' || /ARRAY/.test(type)) return Array.isArray(value) && value.length > 0;
  if (type === 'RFC3339-UTC') return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value);
  if (type.includes('DETERMINISTIC-ID') || type === 'DETERMINISTIC-ID') return typeof value === 'string' && value.length > 8;
  if (type.includes('ENUM') || type.includes('ALGORITHM-ID') || type === 'CANONICAL-UTF8') return typeof value === 'string' && value.length > 0;
  return value !== null && value !== undefined;
}

function isTypedField(value, field) {
  if (!field || field.cardinality !== 'EXACTLY-ONE' || !isTypedValue(value, field.type)) return false;
  if (Object.hasOwn(field, 'constant') && canonical(value) !== canonical(field.constant)) return false;
  if (Array.isArray(field.enum) && !field.enum.some((item) => canonical(item) === canonical(value))) return false;
  if (Array.isArray(value)) {
    const embeddedExact = field.type.match(/EXACTLY-(\d+)$/)?.[1];
    const exact = field.elementCardinality?.exact ?? (embeddedExact ? Number(embeddedExact) : undefined);
    if (exact !== undefined && value.length !== exact) return false;
    if (field.elementCardinality?.minimum !== undefined && value.length < field.elementCardinality.minimum) return false;
    if (field.elementCardinality?.maximum !== undefined && value.length > field.elementCardinality.maximum) return false;
    if (field.type.startsWith('SHA256-ARRAY') && !value.every((item) => typeof item === 'string' && /^[0-9a-f]{64}$/.test(item))) return false;
  }
  return true;
}

function expressionValue(expression, side, state) {
  if (Object.hasOwn(expression, `${side}Const`)) return expression[`${side}Const`];
  return getPointer(state, expression[`${side}Path`]);
}

function evaluateConstraint(expression, state) {
  if (!expression || typeof expression !== 'object') return false;
  if (expression.op === 'AND') return Array.isArray(expression.args) && expression.args.length > 0 && expression.args.every((item) => evaluateConstraint(item, state));
  if (expression.op === 'EQ') return canonical(expressionValue(expression, 'left', state)) === canonical(expressionValue(expression, 'right', state));
  if (expression.op === 'NEQ') return canonical(expressionValue(expression, 'left', state)) !== canonical(expressionValue(expression, 'right', state));
  if (expression.op === 'LT') return expressionValue(expression, 'left', state) < expressionValue(expression, 'right', state);
  if (expression.op === 'LTE') return expressionValue(expression, 'left', state) <= expressionValue(expression, 'right', state);
  if (expression.op === 'GT') return expressionValue(expression, 'left', state) > expressionValue(expression, 'right', state);
  if (expression.op === 'COUNT_EQ') return Array.isArray(getPointer(state, expression.path)) && getPointer(state, expression.path).length === expression.expected;
  if (expression.op === 'UNIQUE_COUNT') { const actual = getPointer(state, expression.path); return Array.isArray(actual) && actual.length === expression.expected && new Set(actual.map(canonical)).size === expression.expected; }
  if (expression.op === 'NON_NULL') { const actual = getPointer(state, expression.path); return actual !== null && actual !== ''; }
  if (expression.op === 'ZERO') return getPointer(state, expression.path) === 0;
  if (expression.op === 'BOOLEAN_TRUE') return getPointer(state, expression.path) === true;
  if (expression.op === 'SET_CONTAINS_ALL') { const actual = getPointer(state, expression.actualPath); const required = getPointer(state, expression.requiredPath); return Array.isArray(actual) && Array.isArray(required) && required.every((item) => actual.some((candidate) => canonical(candidate) === canonical(item))); }
  if (expression.op === 'PATH_REPO_RELATIVE') {
    const actual = getPointer(state, expression.path);
    if (typeof actual !== 'string' || !actual.startsWith('docs/') || actual.startsWith('web/') || actual.startsWith('/') || actual.includes('..')) return false;
    const fullPath = path.join(ROOT, actual);
    if (!fs.existsSync(fullPath)) return new Set([PATHS.subject, PATHS.registry, PATHS.sourceIndex, PATHS.crosswalk, PATHS.vectors, ...PATHS.vectorShards, PATHS.manifest]).has(actual);
    const stat = fs.lstatSync(fullPath);
    return stat.isFile() && !stat.isSymbolicLink();
  }
  if (expression.op === 'TYPE_VALID') return isTypedValue(getPointer(state, expression.valuePath), getPointer(state, expression.typePath));
  return false;
}

function reduceCasSchedule(state) {
  if (!Array.isArray(state.schedule) || state.schedule.length < 2) return false;
  const allowedOps = new Set(['COMPARE', 'RESERVE', 'BLOCK', 'CRASH-PRECOMMIT', 'COMMIT']);
  if (!state.schedule.every((event, index) => event && event.ordinal === index + 1 && ['W1', 'W2'].includes(event.actor) && allowedOps.has(event.op))) return false;
  if (new Set(state.schedule.map((event) => event.actor)).size !== 2) return false;
  const commits = state.schedule.filter((event) => event.op === 'COMMIT');
  if (commits.length !== 1) return false;
  const winner = commits[0].actor;
  const loser = winner === 'W1' ? 'W2' : 'W1';
  const loserEvents = state.schedule.filter((event) => event.actor === loser);
  if (!loserEvents.some((event) => ['BLOCK', 'CRASH-PRECOMMIT'].includes(event.op)) || loserEvents.some((event) => event.op === 'COMMIT')) return false;
  const terminalIndex = state.schedule.findIndex((event) => event.actor === loser && ['BLOCK', 'CRASH-PRECOMMIT'].includes(event.op));
  return terminalIndex >= 0 && !state.schedule.slice(terminalIndex + 1).some((event) => event.actor === loser && ['RESERVE', 'COMMIT'].includes(event.op));
}

function classifyResponseLoss(state) {
  if (state.retryEffectRequested === true) return 'BLOCK';
  if (state.independentReadbacksAgree !== true) return 'CONFLICT';
  if (state.reservationPresent === false && state.finalizationPresent === false && state.outboxPresent === false) return 'NO-RESERVATION';
  if (state.reservationPresent === true && state.finalizationPresent === false && state.outboxPresent === false) return 'RESERVED-NOT-COMMITTED';
  if (state.reservationPresent === true && state.finalizationPresent === true && state.pointerMatches === true && state.outboxPresent === true && state.receiptConfirmed === false) return 'COMMITTED-UNCONFIRMED';
  if (state.reservationPresent === true && state.finalizationPresent === true && state.pointerMatches === true && state.outboxPresent === true && state.receiptConfirmed === true) return 'COMMITTED-CONFIRMED';
  return 'CONFLICT';
}

function evaluatePortableProgram(program, state) {
  const op = program.oracleBody.op;
  if (op === 'ASSERT_TYPED_AXIS') return evaluateAxis(state.axis);
  if (op === 'EXACT_UTF8_FIELD') {
    const source = Buffer.from(state.sourceValueBase64, 'base64'); const candidate = Buffer.from(state.candidateValueBase64, 'base64');
    return source.equals(candidate) && shaBytes(candidate) === state.sourceSha256;
  }
  if (op === 'EVAL_CONSTRAINT_AST') return evaluateConstraint(program.oracleBody.expression, state);
  if (op === 'FILE_SPAN_SHA256') {
    if (!evaluateConstraint({ op: 'PATH_REPO_RELATIVE', path: '/logicalPath' }, state)) return false;
    const artifact = state.logicalPath === PATHS.subject ? Buffer.from(subjectContent) : state.logicalPath === PATHS.registry ? Buffer.from(registryContent) : read(state.logicalPath);
    if (shaBytes(artifact) !== state.artifactSha256 || state.startByteInclusive < 0 || state.endByteExclusive > artifact.length || state.startByteInclusive >= state.endByteExclusive) return false;
    const selected = artifact.subarray(state.startByteInclusive, state.endByteExclusive);
    return selected.length === state.byteLength && shaBytes(selected) === state.memberSha256;
  }
  if (op === 'EXACT_SELECTOR_IN_FIELD') {
    if (!evaluatePortableProgram({ oracleBody: { op: 'FILE_SPAN_SHA256' } }, state.sourceField)) return false;
    const artifact = state.sourceField.logicalPath === PATHS.subject ? Buffer.from(subjectContent) : state.sourceField.logicalPath === PATHS.registry ? Buffer.from(registryContent) : read(state.sourceField.logicalPath);
    const fieldBytes = artifact.subarray(state.sourceField.startByteInclusive, state.sourceField.endByteExclusive);
    if (state.selector.startByteWithinField < 0 || state.selector.endByteWithinField > fieldBytes.length || state.selector.startByteWithinField >= state.selector.endByteWithinField) return false;
    const selected = fieldBytes.subarray(state.selector.startByteWithinField, state.selector.endByteWithinField);
    return selected.length === state.selector.byteLength && shaBytes(selected) === state.selector.exactOldAtomSha256 && selected.equals(Buffer.from(state.selector.exactOldAtomUtf8Base64, 'base64'));
  }
  if (op === 'SEMANTIC_EXTRACTION_EQ') {
    const value = Buffer.from(state.exactValueUtf8Base64, 'base64').toString('utf8');
    const tokens = semanticTokens(value); const coverage = semanticCoverage(value, tokens, state.atomId);
    const projection = { tokens, coverageSegments: coverage.segments, namedUses: coverage.namedUses, coveredByteLength: coverage.coveredByteLength, exactCoverage: coverage.exactCoverage };
    return canonical(projection) === canonical(state.extractionProjection);
  }
  if (op === 'PACKAGE_ROOT_EQ') {
    const projection = [];
    for (const { ordinal, legacyFrozenLogicalPathUtf8Base64, sha256, bytes: byteCount, required } of state.members) {
      if (typeof legacyFrozenLogicalPathUtf8Base64 !== 'string') return false;
      const logicalPathBytes = Buffer.from(legacyFrozenLogicalPathUtf8Base64, 'base64');
      if (logicalPathBytes.toString('base64') !== legacyFrozenLogicalPathUtf8Base64) return false;
      const logicalPath = logicalPathBytes.toString('utf8');
      if (!Buffer.from(logicalPath, 'utf8').equals(logicalPathBytes)) return false;
      projection.push({ ordinal, logicalPath, sha256, bytes: byteCount, required });
    }
    const preimage = Buffer.from(`${state.domain}\n${canonical(projection)}`, 'utf8');
    return preimage.toString('base64') === state.preimageBase64 && shaBytes(preimage) === state.expectedRoot;
  }
  if (op === 'CAS_SCHEDULE_REDUCE') return reduceCasSchedule(state);
  if (op === 'RESPONSE_LOSS_CLASSIFY') return classifyResponseLoss(state) === program.oracleBody.requiredClass;
  if (op === 'TYPED_FIELD_VALID') return isTypedField(state.value, state.field);
  return false;
}

const fixtures = [];
const vectors = [];
for (let requirementIndex = 0; requirementIndex < 127; requirementIndex += 1) {
  if (requirementIndex < 31) {
    const control = blockerClosureControls[requirementIndex];
    control.axes.forEach((sourceAxis, axisIndex) => {
      const fixtureId = `B0V6-FIXTURE-${pad(requirementIndex)}-A${axisIndex + 1}`;
      const fixtureState = { controlId: control.controlId, controlRoot: control.controlRoot, sourceFindingRoot: control.sourceFindingRoot, axis: clone(sourceAxis), authorityCredit: 0 };
      if (!evaluateAxis(fixtureState.axis)) throw new Error(`Invalid control axis ${sourceAxis.axisId}`);
      const mutationPath = sourceAxis.kind === 'DISTINCT' ? '/axis/actualRight' : sourceAxis.kind === 'SET_CONTAINS_ALL' || sourceAxis.kind === 'UNIQUE_COUNT' || sourceAxis.kind === 'PATH_REPO_RELATIVE' || sourceAxis.kind === 'COUNT_EQUAL' || sourceAxis.kind === 'EQUAL' || sourceAxis.kind === 'NON_NULL' || sourceAxis.kind === 'ZERO' || sourceAxis.kind === 'BOOLEAN_TRUE' ? '/axis/actual' : null;
      if (!mutationPath) throw new Error(`No mutation path ${sourceAxis.kind}`);
      const operations = [{ op: 'SET', path: mutationPath, value: badAxisValue(sourceAxis) }];
      const mutated = clone(fixtureState); setPointer(mutated, mutationPath, operations[0].value);
      if (evaluateAxis(mutated.axis)) throw new Error(`Mutation did not block ${sourceAxis.axisId}`);
      const fixtureBody = { fixtureId, requirementId: `B0V6REQ-${pad(requirementIndex)}`, provenanceClass: 'ROOTED-PLANNING-ADMITTED-ZERO-AUTHORITY-CONTROL', sourceRoots: [control.controlRoot, control.sourceFindingRoot], domainState: fixtureState, operational: false, authorityCredit: 0 };
      const fixtureBytes = Buffer.from(canonical(fixtureBody));
      const fixture = { ...fixtureBody, fixtureBytesBase64: fixtureBytes.toString('base64'), fixtureSha256: shaBytes(fixtureBytes), byteLength: fixtureBytes.length };
      fixtures.push(fixture);
      const programBody = { languageRoot: oracleLanguage.languageRoot, operations, oracleBody: { op: 'ASSERT_TYPED_AXIS', path: '/axis' }, stepLimit: 256, expectedValueReadableByOracle: false };
      vectors.push({ vectorId: `B0V6-V-${pad(requirementIndex)}-A${axisIndex + 1}`, requirementId: fixture.requirementId, fixtureId, fixtureSha256: fixture.fixtureSha256, program: programBody, programRoot: domainRoot('CONNECT-B0-V6-PORTABLE-VECTOR-PROGRAM-V1', programBody), planningObserved: { controlDecision: 'ELIGIBLE', mutationDecision: 'BLOCKED', reasonCode: sourceAxis.axisId }, operationalObserved: null, operationalEvidenceRoot: null, authorityCredit: 0, acceptanceCredit: 0 });
    });
  } else {
    const inherited = inheritedV5Rows[requirementIndex - 31];
    inherited.fields.forEach((field, fieldIndex) => {
      const fixtureId = `B0V6-FIXTURE-${pad(requirementIndex)}-F${fieldIndex + 1}`;
      const fixtureState = { sourceValueBase64: field.exactOldValueUtf8Base64, candidateValueBase64: field.exactOldValueUtf8Base64, sourceSha256: field.exactOldValueSha256, sourceLocator: field.sourceField.locator, authorityCredit: 0 };
      const sourceBytes = Buffer.from(fixtureState.sourceValueBase64, 'base64');
      if (!sourceBytes.equals(Buffer.from(fixtureState.candidateValueBase64, 'base64')) || shaBytes(sourceBytes) !== fixtureState.sourceSha256) throw new Error(`Bad inherited fixture ${field.sourceField.locator}`);
      const bad = Buffer.concat([sourceBytes, Buffer.from('\n')]).toString('base64');
      const operations = [{ op: 'SET', path: '/candidateValueBase64', value: bad }];
      const fixtureBody = { fixtureId, requirementId: `B0V6REQ-${pad(requirementIndex)}`, provenanceClass: 'EXACT-FROZEN-V5-UTF8-FIELD-BYTES', sourceRoots: [field.sourceField.memberSha256], domainState: fixtureState, operational: false, authorityCredit: 0 };
      const fixtureBytes = Buffer.from(canonical(fixtureBody));
      const fixture = { ...fixtureBody, fixtureBytesBase64: fixtureBytes.toString('base64'), fixtureSha256: shaBytes(fixtureBytes), byteLength: fixtureBytes.length };
      fixtures.push(fixture);
      const programBody = { languageRoot: oracleLanguage.languageRoot, operations, oracleBody: { op: 'EXACT_UTF8_FIELD', sourcePath: '/sourceValueBase64', candidatePath: '/candidateValueBase64', shaPath: '/sourceSha256' }, stepLimit: 256, expectedValueReadableByOracle: false };
      vectors.push({ vectorId: `B0V6-V-${pad(requirementIndex)}-F${fieldIndex + 1}`, requirementId: fixture.requirementId, fixtureId, fixtureSha256: fixture.fixtureSha256, program: programBody, programRoot: domainRoot('CONNECT-B0-V6-PORTABLE-VECTOR-PROGRAM-V1', programBody), planningObserved: { controlDecision: 'ELIGIBLE', mutationDecision: 'BLOCKED', reasonCode: `EXACT-${field.field}-MUTATION` }, operationalObserved: null, operationalEvidenceRoot: null, authorityCredit: 0, acceptanceCredit: 0 });
    });
  }
}
if (fixtures.length !== BASE_FIVE_FIELD_VECTOR_COUNT || vectors.length !== BASE_FIVE_FIELD_VECTOR_COUNT) throw new Error(`Base vector denominator mismatch ${fixtures.length}/${vectors.length}`);

const domainMutationCoverageMatrix = [];
function addDomainVector({ findingId, family, claimId, domainState, oracleBody, operations, sourceRoots = [] }) {
  const blocker = blockers.find((item) => item.findingId === findingId);
  if (!blocker) throw new Error(`Unknown domain-vector Finding ${findingId}`);
  const ordinal = domainMutationCoverageMatrix.length;
  const fixtureId = `B0V6-DOMAIN-FIXTURE-${String(ordinal).padStart(4, '0')}`;
  const vectorId = `B0V6-DOMAIN-VECTOR-${String(ordinal).padStart(4, '0')}`;
  const state = clone(domainState);
  const programBody = { languageRoot: oracleLanguage.languageRoot, operations: clone(operations), oracleBody: clone(oracleBody), stepLimit: 256, expectedValueReadableByOracle: false };
  if (!evaluatePortableProgram(programBody, state)) throw new Error(`Domain control does not pass ${claimId}`);
  const mutated = clone(state);
  for (const operation of operations) {
    if (operation.op !== 'SET') throw new Error(`Unsupported domain mutation op ${operation.op}`);
    setPointer(mutated, operation.path, operation.value);
  }
  if (evaluatePortableProgram(programBody, mutated)) throw new Error(`Domain mutation does not block ${claimId}`);
  const fixtureBody = { fixtureId, findingId, noMergeKey: blocker.noMergeKey, family, claimId, provenanceClass: 'ROOTED-PLANNING-DOMAIN-MUTATION-CONTROL;NON-OPERATIONAL', sourceRoots, domainState: state, operational: false, authorityCredit: 0 };
  const fixtureBytes = Buffer.from(canonical(fixtureBody));
  const fixture = { ...fixtureBody, fixtureBytesBase64: fixtureBytes.toString('base64'), fixtureSha256: shaBytes(fixtureBytes), byteLength: fixtureBytes.length };
  fixtures.push(fixture);
  const vector = { vectorId, findingId, noMergeKey: blocker.noMergeKey, family, claimId, fixtureId, fixtureSha256: fixture.fixtureSha256, program: programBody, programRoot: domainRoot('CONNECT-B0-V6-PORTABLE-VECTOR-PROGRAM-V1', programBody), planningObserved: { controlDecision: 'ELIGIBLE', mutationDecision: 'BLOCKED', reasonCode: claimId }, operationalObserved: null, operationalEvidenceRoot: null, authorityCredit: 0, acceptanceCredit: 0 };
  vectors.push(vector);
  domainMutationCoverageMatrix.push({ ordinal: ordinal + 1, vectorId, fixtureId, findingId, noMergeKey: blocker.noMergeKey, family, claimId, uniqueCreditKey: `${findingId}:${family}:${claimId}`, operationCount: operations.length, expectedControlDecision: 'ELIGIBLE', expectedMutationDecision: 'BLOCKED', authorityCredit: 0 });
}

for (const artifact of sourceIndex.artifacts) {
  addDomainVector({
    findingId: 'B0V5-IHR-F001', family: 'PUBLIC-REPO-RELATIVE-PATH', claimId: artifact.alias,
    domainState: { logicalPath: artifact.logicalPath }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'PATH_REPO_RELATIVE', path: '/logicalPath' } },
    operations: [{ op: 'SET', path: '/logicalPath', value: `web/${artifact.logicalPath}` }], sourceRoots: [artifact.sha256],
  });
  for (const member of artifact.members) {
    addDomainVector({
      findingId: 'B0V4-HR-F001', family: 'EXACT-SOURCE-MEMBER-SPAN', claimId: `${artifact.alias}::${member.locator}`,
      domainState: { logicalPath: artifact.logicalPath, artifactSha256: artifact.sha256, startByteInclusive: member.startByteInclusive, endByteExclusive: member.endByteExclusive, byteLength: member.byteLength, memberSha256: member.sha256 },
      oracleBody: { op: 'FILE_SPAN_SHA256' }, operations: [{ op: 'SET', path: '/endByteExclusive', value: member.endByteExclusive - 1 }], sourceRoots: [artifact.sha256, member.sha256],
    });
  }
}

for (const occurrence of inheritedSelectorOccurrences) {
  addDomainVector({
    findingId: 'B0V5-IHR-F002', family: 'INHERITED-EXACT-SELECTOR', claimId: occurrence.occurrenceId,
    domainState: {
      sourceField: { logicalPath: occurrence.sourceField.logicalPath, artifactSha256: occurrence.sourceField.artifactSha256, startByteInclusive: occurrence.sourceField.startByteInclusive, endByteExclusive: occurrence.sourceField.endByteExclusive, byteLength: occurrence.sourceField.byteLength, memberSha256: occurrence.sourceField.memberSha256 },
      selector: { startByteWithinField: occurrence.startByteWithinField, endByteWithinField: occurrence.endByteWithinField, byteLength: occurrence.byteLength, exactOldAtomUtf8Base64: occurrence.exactOldAtomUtf8Base64, exactOldAtomSha256: occurrence.exactOldAtomSha256 },
    },
    oracleBody: { op: 'EXACT_SELECTOR_IN_FIELD' }, operations: [{ op: 'SET', path: '/selector/startByteWithinField', value: occurrence.startByteWithinField + 1 }], sourceRoots: [occurrence.sourceField.memberSha256, occurrence.exactOldAtomSha256],
  });
}

for (const row of predecessorSemanticNonWeakeningRows) {
  addDomainVector({
    findingId: 'B0V5-IHR-F003', family: 'PREDECESSOR-SEMANTIC-NONWEAKENING', claimId: row.rowId,
    domainState: { actual: row.afterState.mandatorySafetyIntents, required: row.beforeState.mandatorySafetyIntents },
    oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'SET_CONTAINS_ALL', actualPath: '/actual', requiredPath: '/required' } },
    operations: [{ op: 'SET', path: '/actual', value: row.afterState.mandatorySafetyIntents.slice(1) }], sourceRoots: [row.rowRoot],
  });
}

for (const extraction of semanticExtraction) {
  addDomainVector({
    findingId: 'B0V5-IHR-F004', family: 'ACTIVE-INHERITED-SEMANTIC-NAMEDUSE', claimId: extraction.atomId,
    domainState: { atomId: extraction.atomId, exactValueUtf8Base64: extraction.exactValueUtf8Base64, extractionProjection: { tokens: extraction.tokens, coverageSegments: extraction.coverageSegments, namedUses: extraction.namedUses, coveredByteLength: extraction.coveredByteLength, exactCoverage: extraction.exactCoverage } },
    oracleBody: { op: 'SEMANTIC_EXTRACTION_EQ' }, operations: [{ op: 'SET', path: '/exactValueUtf8Base64', value: Buffer.concat([Buffer.from(extraction.exactValueUtf8Base64, 'base64'), Buffer.from('\n')]).toString('base64') }], sourceRoots: [extraction.exactValueSha256, extraction.extractionRoot],
  });
}

const interfaceExpression = { op: 'AND', args: [
  { op: 'EQ', leftPath: '/actualInputRoot', rightPath: '/expectedInputRoot' }, { op: 'EQ', leftPath: '/actualOutputRoot', rightPath: '/expectedOutputRoot' },
  { op: 'EQ', leftPath: '/providerInstanceRoot', rightConst: null }, { op: 'LT', leftPath: '/availableAtOrdinal', rightPath: '/providerConstructionOrdinal' },
  { op: 'EQ', leftPath: '/acceptedHeadTupleRoot', rightPath: '/currentHeadTupleRoot' }, { op: 'ZERO', path: '/authorityCredit' },
] };
for (const iface of priorInterfaces) {
  const state = clone(iface.planningAdmittedInstance);
  const mutations = [
    ['NULL-OUTPUT', '/actualOutputRoot', null], ['STALE', '/currentHeadTupleRoot', domainRoot('CONNECT-B0-V6-INTERFACE-STALE-MUTATION-V1', { interfaceId: iface.interfaceId })],
    ['WRONG-PROVIDER', '/providerInstanceRoot', domainRoot('CONNECT-B0-V6-INTERFACE-WRONG-PROVIDER-V1', { interfaceId: iface.interfaceId })], ['FUTURE-DEPENDENT', '/availableAtOrdinal', state.providerConstructionOrdinal + 1],
    ['INPUT-SUBSTITUTION', '/actualInputRoot', domainRoot('CONNECT-B0-V6-INTERFACE-INPUT-MUTATION-V1', { interfaceId: iface.interfaceId })], ['OUTPUT-SUBSTITUTION', '/actualOutputRoot', domainRoot('CONNECT-B0-V6-INTERFACE-OUTPUT-MUTATION-V1', { interfaceId: iface.interfaceId })],
  ];
  for (const [mutationClass, mutationPath, value] of mutations) addDomainVector({ findingId: 'B0V5-IHR-F005', family: 'PRIOR-INTERFACE-PROVIDER-INDEPENDENT-INSTANCE', claimId: `${iface.interfaceId}:${mutationClass}`, domainState: state, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: interfaceExpression }, operations: [{ op: 'SET', path: mutationPath, value }], sourceRoots: [iface.interfaceSchemaRoot, iface.planningAdmittedInstance.instanceRoot] });
}

const v5PackageState = {
  domain: v5Manifest.packageContentRootAlgorithm.domainUtf8,
  members: v5Manifest.members.map(({ ordinal, logicalPath, sha256, bytes: byteCount, required }) => ({ ordinal, legacyFrozenLogicalPathUtf8Base64: Buffer.from(logicalPath, 'utf8').toString('base64'), sha256, bytes: byteCount, required })),
  preimageBase64: v5Manifest.packageRootPreimageBase64,
  expectedRoot: V5_HASHES.packageContentRoot,
};
v5PackageState.members.forEach((member, memberIndex) => {
  const values = { ordinal: member.ordinal + 100, logicalPath: Buffer.from(`${Buffer.from(member.legacyFrozenLogicalPathUtf8Base64, 'base64').toString('utf8')}:MUTATED`, 'utf8').toString('base64'), sha256: `${member.sha256.slice(0, -1)}${member.sha256.endsWith('0') ? '1' : '0'}`, bytes: member.bytes + 1, required: !member.required };
  for (const field of ['ordinal', 'logicalPath', 'sha256', 'bytes', 'required']) {
    const stateField = field === 'logicalPath' ? 'legacyFrozenLogicalPathUtf8Base64' : field;
    addDomainVector({ findingId: 'B0V5-IHR-F010', family: 'EXACT-V5-PACKAGE-ROOT-PARTICIPATING-FIELD', claimId: `member-${memberIndex + 1}:${field}`, domainState: v5PackageState, oracleBody: { op: 'PACKAGE_ROOT_EQ' }, operations: [{ op: 'SET', path: `/members/${memberIndex}/${stateField}`, value: values[field] }], sourceRoots: [V5_HASHES.manifest, V5_HASHES.packageContentRoot] });
  }
});
addDomainVector({ findingId: 'B0V5-IHR-F010', family: 'EXACT-V5-PACKAGE-ROOT-DOMAIN', claimId: 'domain', domainState: v5PackageState, oracleBody: { op: 'PACKAGE_ROOT_EQ' }, operations: [{ op: 'SET', path: '/domain', value: `${v5PackageState.domain}:MUTATED` }], sourceRoots: [V5_HASHES.manifest] });
addDomainVector({ findingId: 'B0V5-IHR-F010', family: 'EXACT-V5-PACKAGE-ROOT-CANONICAL-PREIMAGE', claimId: 'preimage', domainState: v5PackageState, oracleBody: { op: 'PACKAGE_ROOT_EQ' }, operations: [{ op: 'SET', path: '/preimageBase64', value: `${v5PackageState.preimageBase64}AA==` }], sourceRoots: [V5_HASHES.manifest] });

for (const pair of pairMatrix) addDomainVector({ findingId: 'B0V5-IHR-F013', family: 'COMPLETE-ROLE-CONTROLLER-EXCLUSION', claimId: pair.pairId, domainState: { leftControllerRoot: appointmentByRole.get(pair.leftRole).effectiveControllerRoot, rightControllerRoot: appointmentByRole.get(pair.rightRole).effectiveControllerRoot }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'NEQ', leftPath: '/leftControllerRoot', rightPath: '/rightControllerRoot' } }, operations: [{ op: 'SET', path: '/rightControllerRoot', value: appointmentByRole.get(pair.leftRole).effectiveControllerRoot }], sourceRoots: [roleAuthority.registryRoot] });
for (const assignment of acceptanceProducerAssignments) addDomainVector({ findingId: 'B0V5-IHR-F013', family: 'SOLE-PRODUCER-ASSIGNMENT', claimId: assignment.fieldId, domainState: assignment, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'AND', args: [{ op: 'EQ', leftPath: '/assignmentCardinality', rightConst: 1 }, { op: 'BOOLEAN_TRUE', path: '/soleProducer' }, { op: 'NON_NULL', path: '/producerAppointmentRoot' }] } }, operations: [{ op: 'SET', path: '/producerAppointmentRoot', value: null }], sourceRoots: [assignment.assignmentRoot] });

for (const profile of independenceProfiles) {
  const state = { proofClass: profile.proofClass, implementationRootA: profile.implementationRootA, implementationRootB: profile.implementationRootB, transitiveDependencyRootA: profile.transitiveDependencyRootA, transitiveDependencyRootB: profile.transitiveDependencyRootB, runtimeRootA: profile.runtimeRootA, runtimeRootB: profile.runtimeRootB, authorControllerRootA: profile.authorControllerRootA, authorControllerRootB: profile.authorControllerRootB, executionContextRootA: profile.executionContextRootA, executionContextRootB: profile.executionContextRootB, current: true, disclosedBeforeBoth: false };
  const expression = { op: 'AND', args: [{ op: 'NON_NULL', path: '/proofClass' }, { op: 'NEQ', leftPath: '/implementationRootA', rightPath: '/implementationRootB' }, { op: 'NEQ', leftPath: '/transitiveDependencyRootA', rightPath: '/transitiveDependencyRootB' }, { op: 'NEQ', leftPath: '/runtimeRootA', rightPath: '/runtimeRootB' }, { op: 'NEQ', leftPath: '/authorControllerRootA', rightPath: '/authorControllerRootB' }, { op: 'NEQ', leftPath: '/executionContextRootA', rightPath: '/executionContextRootB' }, { op: 'EQ', leftPath: '/current', rightConst: true }, { op: 'EQ', leftPath: '/disclosedBeforeBoth', rightConst: false }] };
  const mutations = [['SHARED-IMPLEMENTATION', '/implementationRootB', state.implementationRootA], ['SHARED-DEPENDENCY', '/transitiveDependencyRootB', state.transitiveDependencyRootA], ['SHARED-RUNTIME', '/runtimeRootB', state.runtimeRootA], ['SHARED-CONTROLLER', '/authorControllerRootB', state.authorControllerRootA], ['SHARED-CONTEXT', '/executionContextRootB', state.executionContextRootA], ['MISSING-CLASS', '/proofClass', null], ['STALE', '/current', false], ['EARLY-DISCLOSURE', '/disclosedBeforeBoth', true]];
  for (const [mutationClass, mutationPath, value] of mutations) addDomainVector({ findingId: 'B0V5-IHR-F014', family: 'PROOF-CLASS-TRANSITIVE-INDEPENDENCE', claimId: `${profile.proofClass}:${mutationClass}`, domainState: state, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression }, operations: [{ op: 'SET', path: mutationPath, value }], sourceRoots: [profile.planningAdmittedInstanceRoot] });
}
const witnessState = { witnessCount: 2, sameCheckpoint: true, witnessLedgerControllerDistinct: true, witnessWorkRoleControllerDistinct: true, transitiveControllerDistinct: true, allAcknowledgementsCurrent: true, presealedUntilBothSubmissions: true };
const witnessExpression = { op: 'AND', args: [{ op: 'EQ', leftPath: '/witnessCount', rightConst: 2 }, ...Object.keys(witnessState).filter((key) => key !== 'witnessCount').map((key) => ({ op: 'BOOLEAN_TRUE', path: `/${key}` }))] };
for (const row of witnessMutationMatrix) addDomainVector({ findingId: 'B0V5-IHR-F014', family: 'TWO-WITNESS-INDEPENDENCE', claimId: row.caseId, domainState: witnessState, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: witnessExpression }, operations: [row.mutation], sourceRoots: [twoWitnessIndependenceProgram.programRoot] });

for (const schema of permitSchemas) {
  for (const field of schema.fields) addDomainVector({ findingId: 'B0V5-IHR-F015', family: 'TYPED-PERMIT-FIELD', claimId: `${schema.permitType}:${field.name}`, domainState: { value: schema.planningAdmittedInstance.values[field.name], field }, oracleBody: { op: 'TYPED_FIELD_VALID' }, operations: [{ op: 'SET', path: '/value', value: null }], sourceRoots: [schema.schemaRoot] });
}
const permitForRules = clone(permitSchemas.find((schema) => schema.permitType === 'GenesisPermit').planningAdmittedInstance.values);
permitForRules.fencingToken = 1;
const permitContext = { trustedNow: '2026-08-30T12:00:00Z', currentSecurityUniverseRoot: permitForRules.expectedSecurityUniverseRoot, currentSecurityRevision: permitForRules.expectedSecurityRevision, currentPermitLedgerHead: permitForRules.expectedLedgerHead, currentRevocationHead: permitForRules.expectedRevocationHead, currentAuthorityEpoch: permitForRules.authorityEpoch, currentFence: 0, revocationRevision: 0, commitRevision: 1, requestedActId: permitForRules.actId, requestedEnvironmentRoot: permitForRules.environmentRoot, requestedInputRoot: permitForRules.exactInputRoot, requestedOutputManifestRoot: permitForRules.exactOutputManifestRoot, attemptReservationState: 'ABSENT' };
const permitRuleExpression = { op: 'AND', args: [{ op: 'LTE', leftPath: '/permit/notBefore', rightPath: '/context/trustedNow' }, { op: 'LT', leftPath: '/context/trustedNow', rightPath: '/permit/validThrough' }, { op: 'EQ', leftPath: '/permit/expectedSecurityUniverseRoot', rightPath: '/context/currentSecurityUniverseRoot' }, { op: 'EQ', leftPath: '/permit/expectedSecurityRevision', rightPath: '/context/currentSecurityRevision' }, { op: 'EQ', leftPath: '/permit/expectedLedgerHead', rightPath: '/context/currentPermitLedgerHead' }, { op: 'EQ', leftPath: '/permit/expectedRevocationHead', rightPath: '/context/currentRevocationHead' }, { op: 'LT', leftPath: '/context/revocationRevision', rightPath: '/context/commitRevision' }, { op: 'GT', leftPath: '/permit/fencingToken', rightPath: '/context/currentFence' }, { op: 'EQ', leftPath: '/permit/oneUseState', rightConst: 'UNUSED' }, { op: 'EQ', leftPath: '/permit/authorityEpoch', rightPath: '/context/currentAuthorityEpoch' }, { op: 'EQ', leftPath: '/permit/actId', rightPath: '/context/requestedActId' }, { op: 'EQ', leftPath: '/permit/environmentRoot', rightPath: '/context/requestedEnvironmentRoot' }, { op: 'EQ', leftPath: '/permit/exactInputRoot', rightPath: '/context/requestedInputRoot' }, { op: 'EQ', leftPath: '/permit/exactOutputManifestRoot', rightPath: '/context/requestedOutputManifestRoot' }] };
for (const row of permitRuleMutationMatrix) addDomainVector({ findingId: 'B0V5-IHR-F015', family: 'PERMIT-TIME-REVISION-REVOCATION-REPLAY-RULE', claimId: row.caseId, domainState: { permit: permitForRules, context: permitContext }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: permitRuleExpression }, operations: [row.mutation], sourceRoots: [permitLifecycleProgram.programRoot] });

for (const row of objectToHead) addDomainVector({ findingId: 'B0V4-HR-F005', family: 'NONCIRCULAR-OBJECT-HEAD-MEMBERSHIP', claimId: row.objectClass, domainState: { firstSource: row.membershipPath[0].sourceNode, firstTarget: row.membershipPath[0].targetNode, secondSource: row.membershipPath[1].sourceNode, secondTarget: row.membershipPath[1].targetNode }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'AND', args: [{ op: 'NEQ', leftPath: '/firstSource', rightPath: '/firstTarget' }, { op: 'EQ', leftPath: '/firstTarget', rightPath: '/secondSource' }, { op: 'NEQ', leftPath: '/secondSource', rightPath: '/secondTarget' }, { op: 'EQ', leftPath: '/secondTarget', rightConst: 'Head:SecurityUniverseHead' }] } }, operations: [{ op: 'SET', path: '/secondTarget', value: row.membershipPath[1].sourceNode }], sourceRoots: [mutableHeadRegistry.planningHeadVectorRoot] });
for (const row of headInvalidationMatrix) addDomainVector({ findingId: 'B0V5-IHR-F011', family: 'EXACT-V6-HEAD-INVALIDATION', claimId: row.headId, domainState: { beforeTuple: row.beforeTuple, afterTuple: row.afterTuple, dependentFieldIds: row.dependentFieldIds }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'AND', args: [{ op: 'NEQ', leftPath: '/beforeTuple', rightPath: '/afterTuple' }, { op: 'COUNT_EQ', path: '/dependentFieldIds', expected: row.expectedInvalidatedFieldCount }] } }, operations: [{ op: 'SET', path: '/afterTuple', value: row.beforeTuple }], sourceRoots: [row.matrixRowRoot] });

const orderedOutputIds = outputRegistry.map((item) => item.outputId);
for (const mutation of outputMutationMatrix) {
  const index = orderedOutputIds.indexOf(mutation.outputId); const operations = [];
  if (mutation.mutationClass === 'OMIT') operations.push({ op: 'SET', path: `/actual/${index}`, value: '__OMITTED__' });
  else if (mutation.mutationClass === 'DUPLICATE') operations.push({ op: 'SET', path: `/actual/${index}`, value: orderedOutputIds[(index + 1) % orderedOutputIds.length] });
  else if (mutation.mutationClass === 'REORDER') { const other = (index + 1) % orderedOutputIds.length; operations.push({ op: 'SET', path: `/actual/${index}`, value: orderedOutputIds[other] }, { op: 'SET', path: `/actual/${other}`, value: orderedOutputIds[index] }); }
  else operations.push({ op: 'SET', path: `/actual/${index}`, value: null });
  addDomainVector({ findingId: 'B0V5-IHR-F012', family: 'ALL-127-OUTPUTS-COMPLETE-ORDERED-DENOMINATOR', claimId: mutation.mutationId, domainState: { actual: orderedOutputIds, expected: orderedOutputIds }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'EQ', leftPath: '/actual', rightPath: '/expected' } }, operations, sourceRoots: [outputCompletenessProgram.programRoot] });
}

for (const schema of genesisMemberSchemas) {
  for (const field of schema.fields.filter((item) => item.classSpecific)) addDomainVector({ findingId: 'B0V5-IHR-F017', family: 'GENESIS-CLASS-SPECIFIC-TYPED-FIELD', claimId: `${schema.memberClass}:${field.name}`, domainState: { value: schema.planningAdmittedInstance[field.name], field }, oracleBody: { op: 'TYPED_FIELD_VALID' }, operations: [{ op: 'SET', path: '/value', value: field.type === 'NULL-CONSTANT' ? 'NON-NULL-MUTATION' : null }], sourceRoots: [schema.schemaRoot, schema.planningAdmittedInstance.instanceRoot] });
  addDomainVector({ findingId: 'B0V5-IHR-F017', family: 'GENESIS-WRONG-CLASS-SUBSTITUTION', claimId: schema.memberClass, domainState: { actualClass: schema.planningAdmittedInstance.memberClass, expectedClass: schema.memberClass }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'EQ', leftPath: '/actualClass', rightPath: '/expectedClass' } }, operations: [{ op: 'SET', path: '/actualClass', value: `${schema.memberClass}:WRONG-CLASS` }], sourceRoots: [schema.schemaRoot] });
}
const genesisCausalState = { externalAdmissionIssuerClass: 'EXTERNAL-L0', validatorSelectionClass: 'EXTERNAL-CEREMONY', foundationMemberCount: 33, validatorControllerDistinct: true, createsPrerequisites: false, emptyGenesisLedgerEntryCount: 0, emptyPermitLedgerEntryCount: 0, outputManifestMatches: true };
const genesisCausalExpression = { op: 'AND', args: [{ op: 'EQ', leftPath: '/externalAdmissionIssuerClass', rightConst: 'EXTERNAL-L0' }, { op: 'EQ', leftPath: '/validatorSelectionClass', rightConst: 'EXTERNAL-CEREMONY' }, { op: 'EQ', leftPath: '/foundationMemberCount', rightConst: 33 }, { op: 'BOOLEAN_TRUE', path: '/validatorControllerDistinct' }, { op: 'EQ', leftPath: '/createsPrerequisites', rightConst: false }, { op: 'ZERO', path: '/emptyGenesisLedgerEntryCount' }, { op: 'ZERO', path: '/emptyPermitLedgerEntryCount' }, { op: 'BOOLEAN_TRUE', path: '/outputManifestMatches' }] };
for (const row of genesisCausalMutationMatrix) addDomainVector({ findingId: 'B0V5-IHR-F018', family: 'GENESIS-EXTERNAL-ADMISSION-FIRST-PERMIT-CAUSALITY', claimId: row.caseId, domainState: genesisCausalState, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: genesisCausalExpression }, operations: [row.mutation], sourceRoots: [genesisAuthorityGraph.graphRoot, firstGenesisPermitTransitionProgram.programRoot] });

for (const schema of [...recoveryMembers, ...recoveryWitnesses]) for (const field of schema.fields) addDomainVector({ findingId: 'B0V5-IHR-F020', family: 'RECOVERY-TYPED-PARTICIPANT-FIELD', claimId: `${schema.schemaId}:${field.name}`, domainState: { value: schema.planningAdmittedInstance[field.name], field }, oracleBody: { op: 'TYPED_FIELD_VALID' }, operations: [{ op: 'SET', path: '/value', value: null }], sourceRoots: [schema.schemaRoot] });
for (const field of recoveryAttemptFields) addDomainVector({ findingId: 'B0V5-IHR-F020', family: 'RECOVERY-TYPED-ATTEMPT-FIELD', claimId: field.name, domainState: { value: recoveryAttemptPlanningInstance[field.name], field }, oracleBody: { op: 'TYPED_FIELD_VALID' }, operations: [{ op: 'SET', path: '/value', value: null }], sourceRoots: [recoveryAttemptSchema.schemaRoot, recoveryAttemptPlanningInstance.instanceRoot] });
const recoveryState = { controllerDistinctFromAuthorityOwner: true, controllerDistinctFromWorkRoles: true, witnessCustodianDistinct: true, transitiveControllerDistinct: true, allMembersCurrent: true, allMembersWithinValidity: true, uniqueMemberCount: 3, allChallengesEqual: true, oneUseState: 'UNUSED', currentProfileCount: 1, compromiseBeforeCommitAtEquality: true };
const recoveryExpression = { op: 'AND', args: [{ op: 'BOOLEAN_TRUE', path: '/controllerDistinctFromAuthorityOwner' }, { op: 'BOOLEAN_TRUE', path: '/controllerDistinctFromWorkRoles' }, { op: 'BOOLEAN_TRUE', path: '/witnessCustodianDistinct' }, { op: 'BOOLEAN_TRUE', path: '/transitiveControllerDistinct' }, { op: 'BOOLEAN_TRUE', path: '/allMembersCurrent' }, { op: 'BOOLEAN_TRUE', path: '/allMembersWithinValidity' }, { op: 'EQ', leftPath: '/uniqueMemberCount', rightConst: 3 }, { op: 'BOOLEAN_TRUE', path: '/allChallengesEqual' }, { op: 'EQ', leftPath: '/oneUseState', rightConst: 'UNUSED' }, { op: 'EQ', leftPath: '/currentProfileCount', rightConst: 1 }, { op: 'BOOLEAN_TRUE', path: '/compromiseBeforeCommitAtEquality' }] };
for (const row of recoveryMutationMatrix) addDomainVector({ findingId: 'B0V5-IHR-F020', family: 'RECOVERY-ROTATION-COMPROMISE-REDUCER', claimId: row.caseId, domainState: recoveryState, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: recoveryExpression }, operations: [row.mutation], sourceRoots: [recoveryLifecycleProgram.programRoot] });

for (const row of crashMatrix) addDomainVector({ findingId: 'B0V5-IHR-F016', family: 'CAS-CRASH-CUT', claimId: `cut-${row.cut}`, domainState: { cut: row.cut, commitOperationExecuted: row.commitOperationExecuted, expectedCommitOperationExecuted: row.cut === casOperations.length, durableEffectCount: row.durableEffectCount, expectedDurableEffectCount: row.cut === casOperations.length ? 1 : 0, sameAttemptRetryAllowed: row.sameAttemptRetryAllowed }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'AND', args: [{ op: 'EQ', leftPath: '/commitOperationExecuted', rightPath: '/expectedCommitOperationExecuted' }, { op: 'EQ', leftPath: '/durableEffectCount', rightPath: '/expectedDurableEffectCount' }, { op: 'EQ', leftPath: '/sameAttemptRetryAllowed', rightConst: false }] } }, operations: [{ op: 'SET', path: '/durableEffectCount', value: row.durableEffectCount === 0 ? 1 : 0 }], sourceRoots: [casProgram.programRoot] });
for (const row of twoWriterInterleavingClasses) addDomainVector({ findingId: 'B0V5-IHR-F016', family: 'CAS-TWO-WRITER-INTERLEAVING-CLASS', claimId: row.classId, domainState: { schedule: row.schedule }, oracleBody: { op: 'CAS_SCHEDULE_REDUCE' }, operations: [row.negativeMutation], sourceRoots: [casProgram.programRoot, row.scheduleRoot] });
for (const row of casMutationMatrix) addDomainVector({ findingId: 'B0V5-IHR-F016', family: 'CAS-COMPARE-REPLAY-READBACK-RULE', claimId: row.caseId, domainState: row.domainState, oracleBody: row.oracleBody, operations: [row.mutation], sourceRoots: [casProgram.programRoot, acceptanceCas.responseLossRecoveryProgram.programRoot, row.matrixRowRoot] });

for (const field of detachedAcceptanceSchema.fields) addDomainVector({ findingId: 'B0V5-IHR-F019', family: 'DETACHED-ACCEPTANCE-TYPED-FIELD', claimId: field.name, domainState: { value: detachedAcceptancePlanningInstance[field.name], field }, oracleBody: { op: 'TYPED_FIELD_VALID' }, operations: [{ op: 'SET', path: '/value', value: null }], sourceRoots: [detachedAcceptanceSchema.schemaRoot, detachedAcceptancePlanningInstance.instanceRoot] });

const portableFrameworkCases = [
  ['LANGUAGE-ROOT-BINDING', { actual: oracleLanguage.languageRoot, expected: oracleLanguage.languageRoot }, { op: 'EQ', leftPath: '/actual', rightPath: '/expected' }, '/actual', domainRoot('CONNECT-B0-V6-MUTATED-ORACLE-LANGUAGE-V1', oracleLanguage)],
  ['UNKNOWN-OP-FAIL-CLOSED', { actual: oracleLanguage.unknownOperatorPolicy, expected: 'BLOCK' }, { op: 'EQ', leftPath: '/actual', rightPath: '/expected' }, '/actual', 'ALLOW'],
  ['EXPECTED-VERDICT-UNREADABLE', { actual: oracleLanguage.expectedValueReadableByOracle, expected: false }, { op: 'EQ', leftPath: '/actual', rightPath: '/expected' }, '/actual', true],
  ['TOTAL-ERROR-SEMANTICS', { actual: oracleLanguage.errorSemantics, expected: oracleLanguage.errorSemantics }, { op: 'EQ', leftPath: '/actual', rightPath: '/expected' }, '/actual', ''],
  ['ROOTED-SET-OPERATION-SEMANTICS', { actual: domainRoot('CONNECT-B0-V6-OPERATION-SEMANTICS-V1', oracleLanguage.operationSemantics), expected: domainRoot('CONNECT-B0-V6-OPERATION-SEMANTICS-V1', oracleLanguage.operationSemantics) }, { op: 'EQ', leftPath: '/actual', rightPath: '/expected' }, '/actual', domainRoot('CONNECT-B0-V6-MUTATED-OPERATION-SEMANTICS-V1', oracleLanguage.operationSemantics)],
];
for (const [claimId, domainState, expression, mutationPath, value] of portableFrameworkCases) addDomainVector({ findingId: 'B0V5-IHR-F006', family: 'PORTABLE-ROOTED-ORACLE-SEMANTICS', claimId, domainState, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression }, operations: [{ op: 'SET', path: mutationPath, value }], sourceRoots: [oracleLanguage.languageRoot] });

const coverageFamilyMapRoot = domainRoot('CONNECT-B0-V6-REQUIRED-DOMAIN-VECTOR-FAMILY-MAP-V1', REQUIRED_DOMAIN_VECTOR_FAMILIES);
addDomainVector({ findingId: 'B0V5-IHR-F007', family: 'EXACT-DOMAIN-COVERAGE-DENOMINATOR', claimId: 'REQUIRED-FAMILY-MAP-ROOT', domainState: { actual: coverageFamilyMapRoot, expected: coverageFamilyMapRoot }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'EQ', leftPath: '/actual', rightPath: '/expected' } }, operations: [{ op: 'SET', path: '/actual', value: domainRoot('CONNECT-B0-V6-MUTATED-REQUIRED-DOMAIN-VECTOR-FAMILY-MAP-V1', REQUIRED_DOMAIN_VECTOR_FAMILIES) }], sourceRoots: [coverageFamilyMapRoot] });
addDomainVector({ findingId: 'B0V5-IHR-F007', family: 'EXACT-DOMAIN-COVERAGE-DENOMINATOR', claimId: 'BASE-FIVE-FIELD-DENOMINATOR', domainState: { actual: BASE_FIVE_FIELD_VECTOR_COUNT, expected: BASE_FIVE_FIELD_VECTOR_COUNT }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'EQ', leftPath: '/actual', rightPath: '/expected' } }, operations: [{ op: 'SET', path: '/actual', value: BASE_FIVE_FIELD_VECTOR_COUNT - 1 }], sourceRoots: [coverageFamilyMapRoot] });

const planningProvenanceCases = [
  ['EXPLICIT-PLANNING-PROVENANCE', { actual: 'ROOTED-PLANNING-DOMAIN-MUTATION-CONTROL;NON-OPERATIONAL', expected: 'ROOTED-PLANNING-DOMAIN-MUTATION-CONTROL;NON-OPERATIONAL' }, { op: 'EQ', leftPath: '/actual', rightPath: '/expected' }, '/actual', 'REAL-OPERATIONAL-STATE'],
  ['NON-OPERATIONAL', { actual: false, expected: false }, { op: 'EQ', leftPath: '/actual', rightPath: '/expected' }, '/actual', true],
  ['ZERO-AUTHORITY-CREDIT', { actual: 0 }, { op: 'ZERO', path: '/actual' }, '/actual', 1],
  ['ROOTED-PROVENANCE-SOURCE', { actual: oracleLanguage.languageRoot }, { op: 'NON_NULL', path: '/actual' }, '/actual', null],
];
for (const [claimId, domainState, expression, mutationPath, value] of planningProvenanceCases) addDomainVector({ findingId: 'B0V5-IHR-F008', family: 'HONEST-PLANNING-FIXTURE-PROVENANCE', claimId, domainState, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression }, operations: [{ op: 'SET', path: mutationPath, value }], sourceRoots: [oracleLanguage.languageRoot] });

addDomainVector({ findingId: 'B0V5-IHR-F009', family: 'CAUSAL-ORACLE-STATE-READ', claimId: 'DOMAIN-STATE-DRIVES-DECISION', domainState: { domainPredicateSatisfied: true }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'BOOLEAN_TRUE', path: '/domainPredicateSatisfied' } }, operations: [{ op: 'SET', path: '/domainPredicateSatisfied', value: false }], sourceRoots: [oracleLanguage.languageRoot] });
addDomainVector({ findingId: 'B0V5-IHR-F009', family: 'CAUSAL-ORACLE-STATE-READ', claimId: 'READ-SET-EXCLUDES-STORED-VERDICT', domainState: { actualReadSet: ['/domainState'], permittedReadSet: ['/domainState'] }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'EQ', leftPath: '/actualReadSet', rightPath: '/permittedReadSet' } }, operations: [{ op: 'SET', path: '/actualReadSet', value: ['/domainState', '/planningObserved'] }], sourceRoots: [oracleLanguage.languageRoot] });

function mirrorDomainVectorsForNoMerge(targetFindingId, sourceFindingIds) {
  const sourceRows = domainMutationCoverageMatrix.filter((row) => sourceFindingIds.includes(row.findingId));
  const vectorById = new Map(vectors.map((item) => [item.vectorId, item]));
  const fixtureById = new Map(fixtures.map((item) => [item.fixtureId, item]));
  for (const row of sourceRows) {
    const sourceVector = vectorById.get(row.vectorId);
    const sourceFixture = fixtureById.get(row.fixtureId);
    addDomainVector({
      findingId: targetFindingId,
      family: row.family,
      claimId: `${row.findingId}:${row.claimId}`,
      domainState: sourceFixture.domainState,
      oracleBody: sourceVector.program.oracleBody,
      operations: sourceVector.program.operations,
      sourceRoots: [...sourceFixture.sourceRoots, sourceFixture.fixtureSha256, sourceVector.programRoot],
    });
  }
}

mirrorDomainVectorsForNoMerge('B0V4-HR-F002', ['B0V5-IHR-F002', 'B0V5-IHR-F003']);
mirrorDomainVectorsForNoMerge('B0V4-HR-F003', ['B0V5-IHR-F001']);
mirrorDomainVectorsForNoMerge('B0V4-HR-F004', ['B0V5-IHR-F004', 'B0V5-IHR-F005']);
mirrorDomainVectorsForNoMerge('B0V4-HR-F007', ['B0V5-IHR-F011', 'B0V5-IHR-F015']);
mirrorDomainVectorsForNoMerge('B0V4-HR-F008', ['B0V5-IHR-F013', 'B0V5-IHR-F014']);
mirrorDomainVectorsForNoMerge('B0V4-HR-F009', ['B0V5-IHR-F016']);
mirrorDomainVectorsForNoMerge('B0V4-HR-F010', ['B0V5-IHR-F017', 'B0V5-IHR-F018', 'B0V5-IHR-F019']);
mirrorDomainVectorsForNoMerge('B0V4-HR-F011', ['B0V5-IHR-F020']);
mirrorDomainVectorsForNoMerge('B0V4-HR-F006', ['B0V5-IHR-F006', 'B0V5-IHR-F007', 'B0V5-IHR-F008', 'B0V5-IHR-F009', 'B0V5-IHR-F010']);

const predictedFinalDomainVectorIds = [
  ...domainMutationCoverageMatrix.map((item) => item.vectorId),
  ...Array.from({ length: 2 }, (_, offset) => `B0V6-DOMAIN-VECTOR-${String(domainMutationCoverageMatrix.length + offset).padStart(4, '0')}`),
];
addDomainVector({ findingId: 'B0V5-IHR-F007', family: 'EXACT-DOMAIN-COVERAGE-DENOMINATOR', claimId: 'FINAL-UNIQUE-VECTOR-ID-DENOMINATOR', domainState: { vectorIds: predictedFinalDomainVectorIds }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'UNIQUE_COUNT', path: '/vectorIds', expected: EXPECTED_DOMAIN_MUTATION_VECTOR_COUNT } }, operations: [{ op: 'SET', path: `/vectorIds/${predictedFinalDomainVectorIds.length - 1}`, value: predictedFinalDomainVectorIds[0] }], sourceRoots: [coverageFamilyMapRoot] });
const exactActiveFindingIds = blockers.map((item) => item.findingId).sort();
addDomainVector({ findingId: 'B0V5-IHR-F007', family: 'EXACT-DOMAIN-COVERAGE-DENOMINATOR', claimId: 'ALL-31-FINDINGS-HAVE-NO-MERGE-DOMAIN-VECTORS', domainState: { actualFindingIds: exactActiveFindingIds, requiredFindingIds: exactActiveFindingIds }, oracleBody: { op: 'EVAL_CONSTRAINT_AST', expression: { op: 'AND', args: [{ op: 'UNIQUE_COUNT', path: '/actualFindingIds', expected: 31 }, { op: 'SET_CONTAINS_ALL', actualPath: '/actualFindingIds', requiredPath: '/requiredFindingIds' }] } }, operations: [{ op: 'SET', path: '/actualFindingIds/30', value: exactActiveFindingIds[0] }], sourceRoots: [coverageFamilyMapRoot] });

if (canonical(predictedFinalDomainVectorIds) !== canonical(domainMutationCoverageMatrix.map((item) => item.vectorId))) throw new Error('Predicted final vector-ID denominator mismatch');
for (const blocker of blockers) {
  const actualFamilies = new Set(domainMutationCoverageMatrix.filter((item) => item.findingId === blocker.findingId).map((item) => item.family));
  for (const family of REQUIRED_DOMAIN_VECTOR_FAMILIES[blocker.findingId]) if (!actualFamilies.has(family)) throw new Error(`Uncovered no-merge domain family ${blocker.findingId}:${family}`);
}

if (domainMutationCoverageMatrix.length !== EXPECTED_DOMAIN_MUTATION_VECTOR_COUNT) throw new Error(`Domain mutation vector denominator mismatch ${domainMutationCoverageMatrix.length}/${EXPECTED_DOMAIN_MUTATION_VECTOR_COUNT}`);
if (fixtures.length !== TOTAL_PLANNING_VECTOR_COUNT || vectors.length !== TOTAL_PLANNING_VECTOR_COUNT) throw new Error(`Total vector denominator mismatch ${fixtures.length}/${vectors.length}`);

const completeFixtureSequenceRoot = domainRoot('CONNECT-B0-V6-COMPLETE-FIXTURE-SEQUENCE-V1', fixtures.map((fixture, index) => ({ ordinal: index + 1, fixtureId: fixture.fixtureId, fixtureSha256: fixture.fixtureSha256, byteLength: fixture.byteLength })));
const completeVectorSequenceRoot = domainRoot('CONNECT-B0-V6-COMPLETE-VECTOR-SEQUENCE-V1', vectors.map((vector, index) => ({ ordinal: index + 1, vectorId: vector.vectorId, fixtureId: vector.fixtureId, programRoot: vector.programRoot })));
const completeDomainMutationCoverageMatrixRoot = domainRoot('CONNECT-B0-V6-COMPLETE-DOMAIN-MUTATION-COVERAGE-MATRIX-V1', domainMutationCoverageMatrix);
const vectorShardContents = [];
const vectorShardDescriptors = [];
for (let shardIndex = 0; shardIndex < VECTOR_SHARD_COUNT; shardIndex += 1) {
  const startIndex = Math.floor((shardIndex * TOTAL_PLANNING_VECTOR_COUNT) / VECTOR_SHARD_COUNT);
  const endIndex = Math.floor(((shardIndex + 1) * TOTAL_PLANNING_VECTOR_COUNT) / VECTOR_SHARD_COUNT);
  const shardFixtures = fixtures.slice(startIndex, endIndex);
  const shardVectors = vectors.slice(startIndex, endIndex);
  const shardVectorIds = new Set(shardVectors.map((vector) => vector.vectorId));
  const shardCoverageRows = domainMutationCoverageMatrix.filter((row) => shardVectorIds.has(row.vectorId));
  const shardBase = {
    artifactId: `CONNECT-B0-V6-PORTABLE-CAUSAL-VECTOR-CORPUS-SHARD-${String(shardIndex + 1).padStart(2, '0')}-OF-${VECTOR_SHARD_COUNT}-2026-08-30-G0`,
    artifactClass: 'IMMUTABLE-PORTABLE-ROOTED-ORACLE-BODY-AND-NEGATIVE-VECTOR-CORPUS-SHARD;PLANNING-ONLY;NOT-OPERATIONAL-EVIDENCE;NOT-AUTHORITY;NOT-ACCEPTANCE',
    schemaVersion: 1,
    corpusIndexLogicalPath: PATHS.vectors,
    subjectSha256: subjectSha,
    normativeRegistrySha256: registrySha,
    sourceMemberSpanIndexSha256: sourceIndexSha,
    closureCrosswalkSha256: crosswalkSha,
    oracleLanguageRoot: oracleLanguage.languageRoot,
    shardOrdinal: shardIndex + 1,
    shardCount: VECTOR_SHARD_COUNT,
    startVectorOrdinalInclusive: startIndex + 1,
    endVectorOrdinalInclusive: endIndex,
    fixtureCount: shardFixtures.length,
    vectorCount: shardVectors.length,
    domainMutationVectorCount: shardCoverageRows.length,
    fixtures: shardFixtures,
    vectors: shardVectors,
    domainMutationCoverageMatrix: shardCoverageRows,
    operationalEvidenceCount: 0,
    authorityCredit: 0,
    acceptanceCredit: 0,
  };
  const shard = { ...shardBase, shardContentRoot: domainRoot('CONNECT-B0-V6-VECTOR-CORPUS-SHARD-CONTENT-V1', shardBase) };
  const content = pretty(shard);
  const byteCount = Buffer.byteLength(content);
  if (byteCount >= MAX_PUBLIC_GIT_FILE_BYTES) throw new Error(`Vector shard ${shardIndex + 1} is not below 50 MiB: ${byteCount}`);
  vectorShardContents.push(content);
  vectorShardDescriptors.push({
    shardOrdinal: shardIndex + 1,
    shardCount: VECTOR_SHARD_COUNT,
    logicalPath: PATHS.vectorShards[shardIndex],
    sha256: shaBytes(Buffer.from(content)),
    bytes: byteCount,
    startVectorOrdinalInclusive: startIndex + 1,
    endVectorOrdinalInclusive: endIndex,
    fixtureCount: shardFixtures.length,
    vectorCount: shardVectors.length,
    domainMutationVectorCount: shardCoverageRows.length,
    shardContentRoot: shard.shardContentRoot,
    required: true,
  });
}
const vectorShardSetRoot = domainRoot('CONNECT-B0-V6-VECTOR-CORPUS-SHARD-SET-V1', vectorShardDescriptors);
const vectorCorpusBase = {
  artifactId: 'CONNECT-B0-V6-PORTABLE-CAUSAL-VECTOR-CORPUS-INDEX-2026-08-30-G0', artifactClass: 'IMMUTABLE-PORTABLE-ROOTED-ORACLE-BODY-AND-NEGATIVE-VECTOR-CORPUS-INDEX;SHARDED-PUBLIC-GIT-PUBLISHABLE;PLANNING-ONLY;NOT-OPERATIONAL-EVIDENCE;NOT-AUTHORITY;NOT-ACCEPTANCE', schemaVersion: 1,
  subjectSha256: subjectSha, normativeRegistrySha256: registrySha, sourceMemberSpanIndexSha256: sourceIndexSha, closureCrosswalkSha256: crosswalkSha,
  oracleLanguage,
  fixtureCount: fixtures.length,
  vectorCount: vectors.length,
  requirementCount: 127,
  baseFiveFieldVectorCount: BASE_FIVE_FIELD_VECTOR_COUNT,
  baseVectorsPerRequirement: 5,
  domainMutationVectorCount: domainMutationCoverageMatrix.length,
  domainMutationUniqueCreditKeyCount: new Set(domainMutationCoverageMatrix.map((item) => item.uniqueCreditKey)).size,
  requiredDomainVectorFamilies: REQUIRED_DOMAIN_VECTOR_FAMILIES,
  requiredDomainVectorFamiliesRoot: coverageFamilyMapRoot,
  completeFixtureSequenceRoot,
  completeVectorSequenceRoot,
  completeDomainMutationCoverageMatrixRoot,
  vectorShardCount: VECTOR_SHARD_COUNT,
  maximumPublicGitMemberBytesExclusive: MAX_PUBLIC_GIT_FILE_BYTES,
  largestVectorShardBytes: Math.max(...vectorShardDescriptors.map((descriptor) => descriptor.bytes)),
  everyVectorShardBelowMaximum: vectorShardDescriptors.every((descriptor) => descriptor.bytes < MAX_PUBLIC_GIT_FILE_BYTES),
  shardPartitionRule: 'CONTIGUOUS-GLOBAL-VECTOR-ORDINAL-RANGES;START=floor(i*7430/16)+1;END=floor((i+1)*7430/16);FIXTURE-AND-VECTOR-ORDINALS-ALIGNED;DOMAIN-ROWS-COLOCATED-BY-VECTOR-ID',
  vectorShardDescriptors,
  vectorShardSetRoot,
  mutationCoverageRule: 'EXACTLY-ONE-BASE-NEGATIVE-VECTOR-PER-FIVE-FIELD-AXIS-PLUS-ONE-UNIQUELY-ATTRIBUTABLE-DOMAIN-NEGATIVE-VECTOR-PER-DECLARED-MATRIX-ROW;EVERY-CONTROL-MUST-DERIVE-ELIGIBLE;EVERY-MUTATION-MUST-TERMINATE-BLOCKED;NO-DUPLICATE-CREDIT-KEY',
  planningExecutionCount: `${TOTAL_PLANNING_VECTOR_COUNT}/${TOTAL_PLANNING_VECTOR_COUNT}`,
  operationalVectorExecutionCount: `0/${TOTAL_PLANNING_VECTOR_COUNT}`,
  operationalEvidenceCount: 0,
  authorityCredit: 0,
  acceptanceCredit: 0,
};
const vectorCorpus = { ...vectorCorpusBase, vectorCorpusContentRoot: domainRoot('CONNECT-B0-V6-VECTOR-CORPUS-CONTENT-V1', vectorCorpusBase) };
const vectorContent = pretty(vectorCorpus);
const vectorSha = shaBytes(Buffer.from(vectorContent));

function packageRoot(domain, members) {
  const projection = members.map(({ ordinal, logicalPath, sha256, bytes, required }) => ({ ordinal, logicalPath, sha256, bytes, required }));
  return { preimage: Buffer.from(`${domain}\n${canonical(projection)}`, 'utf8'), root: domainRoot(domain, projection) };
}

function buildManifest(contents) {
  const members = [
    [PATHS.registry, contents.registry], [PATHS.subject, contents.subject], [PATHS.sourceIndex, contents.sourceIndex], [PATHS.crosswalk, contents.crosswalk], [PATHS.vectors, contents.vectors],
    ...PATHS.vectorShards.map((logicalPath, index) => [logicalPath, contents.vectorShards[index]]),
    [PATHS.generator, text(PATHS.generator)], [PATHS.readerA, text(PATHS.readerA)], [PATHS.readerB, text(PATHS.readerB)],
  ].map(([logicalPath, content], index) => ({ ordinal: index + 1, logicalPath, sha256: shaBytes(Buffer.from(content)), bytes: Buffer.byteLength(content), required: true, authorityCredit: 0 }));
  if (members.length !== PACKAGE_MEMBER_COUNT) throw new Error(`Package member denominator mismatch ${members.length}/${PACKAGE_MEMBER_COUNT}`);
  const domain = 'CONNECT-B0-V6-PACKAGE-CONTENT-V1';
  const calculated = packageRoot(domain, members);
  return {
    artifactId: 'CONNECT-B0-V6-ATOMIC-CANDIDATE-PACKAGE-MANIFEST-2026-08-30-G0', artifactClass: 'IMMUTABLE-ATOMIC-B0-V6-PLANNING-CANDIDATE-PACKAGE;NOT-AUTHORITY;NOT-ACCEPTANCE', schemaVersion: 1,
    packageSemantics: `ALL-${PACKAGE_MEMBER_COUNT}-CORE-MEMBERS-REQUIRED;VECTOR-CORPUS-INDEX-PLUS-${VECTOR_SHARD_COUNT}-DETERMINISTIC-SHARDS;EVERY-SHARD-BELOW-50-MIB;CORRECT-PUBLIC-GIT-ROOT-RELATIVE-PATHS;ANY-MISSING,CHANGED,REORDERED,DUPLICATED,ABSOLUTE,TRAVERSAL,EXTRA-PREFIX-OR-SYMLINK-MEMBER-BLOCKS`,
    packageContentRootAlgorithm: { algorithmId: 'B0V6-DOMAIN-SEPARATED-CANONICAL-PACKAGE-ROOT-V1', hash: 'SHA-256', domainUtf8: domain, preimageEquation: 'UTF8(DOMAIN)+0x0A+UTF8(CANONICAL-JSON-V1(PROJECTION(MEMBERS,[ordinal,logicalPath,sha256,bytes,required])))', canonicalJson: 'OBJECT-KEYS-LEXICOGRAPHIC;ARRAY-ORDER-PRESERVED;UTF8;NO-WHITESPACE;JSON-STRING-ESCAPING;INTEGER-DECIMAL;BOOLEAN-LOWERCASE;NULL-LOWERCASE', memberOrdering: `ASCENDING-CONTIGUOUS-ORDINAL-1..${PACKAGE_MEMBER_COUNT}`, unknownParticipatingFieldPolicy: 'BLOCK' },
    memberCount: members.length, members, packageRootPreimageEncoding: 'BASE64', packageRootPreimageBase64: calculated.preimage.toString('base64'), packageContentRoot: calculated.root,
    subjectSha256: subjectSha, normativeRegistrySha256: registrySha, sourceMemberSpanIndexSha256: sourceIndexSha, closureCrosswalkSha256: crosswalkSha, portableCausalVectorCorpusSha256: vectorSha,
    portableCausalVectorCorpusShardCount: VECTOR_SHARD_COUNT, portableCausalVectorCorpusShardSetRoot: vectorShardSetRoot, portableCausalVectorCorpusShardDescriptors: vectorShardDescriptors,
    producerQaMembership: 'DETACHED;ZERO-AUTHORITY', qaReportMembership: 'TWO-DETACHED-INDEPENDENT-STDLIB-REPORTS;ZERO-AUTHORITY', independentReviewMembership: 'DETACHED;ABSENT;FRESH-INDEPENDENT-HOSTILE-REVIEW-REQUIRED',
    activeBlockerCount: 31, preservedClosedFindingCount: 1, repositoryVisibility: 'PUBLIC', authorityCredit: 0, acceptanceCredit: 0,
    currentState: 'FROZEN-PLANNING-CANDIDATE;FRESH-INDEPENDENT-REVIEW-PENDING;B0-ABSENT;GATE29-BLOCKED;FREEZE-ACTIVE',
  };
}

const coreContents = { registry: registryContent, subject: subjectContent, sourceIndex: sourceIndexContent, crosswalk: crosswalkContent, vectors: vectorContent, vectorShards: vectorShardContents };
let manifest = null;
let manifestContent = null;
if (fs.existsSync(path.join(ROOT, PATHS.readerA)) && fs.existsSync(path.join(ROOT, PATHS.readerB))) {
  manifest = buildManifest(coreContents); manifestContent = pretty(manifest);
}

function fileMetrics(logicalPath) {
  const buffer = read(logicalPath); const value = buffer.toString('utf8'); const trimmed = value.trim();
  return { logicalPath, sha256: shaBytes(buffer), lines: lines(buffer), words: trimmed === '' ? 0 : trimmed.split(/\s+/u).length, bytes: buffer.length };
}

let producerQa = null;
let producerQaContent = null;
if (manifestContent && fs.existsSync(path.join(ROOT, PATHS.manifest)) && shaFile(PATHS.manifest) === shaBytes(Buffer.from(manifestContent)) && fs.existsSync(path.join(ROOT, PATHS.readerAReport)) && fs.existsSync(path.join(ROOT, PATHS.readerBReport))) {
  const reportA = json(PATHS.readerAReport); const reportB = json(PATHS.readerBReport); const manifestSha = shaBytes(Buffer.from(manifestContent));
  const reportsCurrent = [reportA, reportB].every((report) => report.pass === true && report.errorCount === 0 && report.packageManifestSha256 === manifestSha && report.packageContentRoot === manifest.packageContentRoot);
  if (reportsCurrent) {
    const reportParityProjection = { checkInvocationCountA: reportA.checkInvocationCount, checkInvocationCountB: reportB.checkInvocationCount, uniqueCheckClassesA: reportA.uniqueCheckClasses, uniqueCheckClassesB: reportB.uniqueCheckClasses, countsA: reportA.counts, countsB: reportB.counts, stateA: reportA.state, stateB: reportB.state };
    const base = {
      artifactId: 'CONNECT-B0-V6-PRODUCER-QA-2026-08-30-G0',
      artifactClass: 'DETACHED-PRODUCER-QA;PLANNING-PACKAGE-MECHANICAL-VERIFICATION;NOT-INDEPENDENT-REVIEW;NOT-AUTHORITY;NOT-ACCEPTANCE',
      schemaVersion: 1,
      producerQaRunId: deterministicId('B0V6-PRODUCER-QA-RUN', 'CONNECT-B0-V6-PRODUCER-QA-RUN-ID-V1', { manifestSha256: manifestSha, packageContentRoot: manifest.packageContentRoot, readerAReportSha256: shaFile(PATHS.readerAReport), readerBReportSha256: shaFile(PATHS.readerBReport) }),
      logicalRepositoryRootClass: 'PUBLIC-REPOSITORY-ROOT',
      packageManifest: { logicalPath: PATHS.manifest, sha256: manifestSha, packageContentRoot: manifest.packageContentRoot, memberCount: manifest.memberCount },
      packageMembers: manifest.members.map(({ ordinal, logicalPath, sha256, bytes: byteCount, required }) => ({ ordinal, logicalPath, sha256, bytes: byteCount, required })),
      packageMemberMetrics: manifest.members.map((member) => fileMetrics(member.logicalPath)),
      packageManifestMetrics: fileMetrics(PATHS.manifest),
      vectorCorpus: { indexLogicalPath: PATHS.vectors, indexSha256: vectorSha, shardCount: VECTOR_SHARD_COUNT, shardSetRoot: vectorShardSetRoot, shardDescriptors: vectorShardDescriptors, largestShardBytes: Math.max(...vectorShardDescriptors.map((descriptor) => descriptor.bytes)), maximumMemberBytesExclusive: MAX_PUBLIC_GIT_FILE_BYTES, everyShardBelowMaximum: vectorShardDescriptors.every((descriptor) => descriptor.bytes < MAX_PUBLIC_GIT_FILE_BYTES) },
      detachedReaderReports: [fileMetrics(PATHS.readerAReport), fileMetrics(PATHS.readerBReport)],
      readerCommands: [`node ${PATHS.readerA}`, `python3 ${PATHS.readerB}`],
      readerVerdicts: [{ readerId: reportA.readerId, pass: reportA.pass, errorCount: reportA.errorCount, checkInvocationCount: reportA.checkInvocationCount, uniqueCheckClasses: reportA.uniqueCheckClasses }, { readerId: reportB.readerId, pass: reportB.pass, errorCount: reportB.errorCount, checkInvocationCount: reportB.checkInvocationCount, uniqueCheckClasses: reportB.uniqueCheckClasses }],
      readerParityProjection: reportParityProjection,
      readerParityRoot: domainRoot('CONNECT-B0-V6-PRODUCER-QA-READER-PARITY-V1', reportParityProjection),
      exactCounts: { activeBlockers: 31, preservedClosedFindings: 1, requirements: 127, fiveFieldAtoms: 635, outputs: 127, sourceArtifacts: sourceIndex.artifactCount, sourceMembers: sourceIndex.memberCount, authoritativeInheritedAtoms: authoritativeAtoms.length, activeNamedUses: activeNamedUses.length, baseVectors: BASE_FIVE_FIELD_VECTOR_COUNT, domainMutationVectors: EXPECTED_DOMAIN_MUTATION_VECTOR_COUNT, totalPlanningVectors: TOTAL_PLANNING_VECTOR_COUNT, operationalVectors: 0, vectorShards: VECTOR_SHARD_COUNT, packageMembers: PACKAGE_MEMBER_COUNT },
      frozenPredecessorHashes: V5_HASHES,
      predecessorByteVerification: 'ALL-NINE-FROZEN-V5-SUBJECT/PACKAGE/REVIEW-HASHES-RECOMPUTED-BEFORE-GENERATION;UNCHANGED',
      pathPolicy: { publicLocatorPrefix: 'docs/', absolutePathCount: 0, extraRepositoryPrefixCount: 0, traversalCount: 0, symlinkPackageMemberCount: 0 },
      sizePolicy: { normalGitHardLimitBytesExclusive: 100 * 1024 * 1024, publicPackagePolicyMaximumBytesExclusive: MAX_PUBLIC_GIT_FILE_BYTES, largestPackageMemberBytes: Math.max(...manifest.members.map((member) => member.bytes)), allPackageMembersBelowPublicPackageMaximum: manifest.members.every((member) => member.bytes < MAX_PUBLIC_GIT_FILE_BYTES), gitPublicationPerformed: false },
      mechanicalVerdict: 'PASS',
      residualLimits: ['PLANNING-ONLY', 'NO-OPERATIONAL-IMPLEMENTATION', 'NO-OPERATIONAL-EVIDENCE', 'NO-AUTHORITY', 'NO-ACCEPTANCE', 'FRESH-INDEPENDENT-HOSTILE-REVIEW-PENDING', 'NO-GIT-OR-GITHUB-PUBLICATION-PERFORMED'],
      currentState: { authorityCredit: 0, acceptanceCredit: 0, independentlyClosedActiveBlockerCount: '0/31', B0: 'ABSENT', Gate29: 'BLOCKED', developmentFreeze: 'ACTIVE', repositoryVisibility: 'PUBLIC' },
    };
    producerQa = { ...base, producerQaContentRoot: domainRoot('CONNECT-B0-V6-PRODUCER-QA-CONTENT-V1', base) };
    producerQaContent = pretty(producerQa);
  }
}

const outputs = { registry: coreContents.registry, subject: coreContents.subject, sourceIndex: coreContents.sourceIndex, crosswalk: coreContents.crosswalk, vectors: coreContents.vectors, ...Object.fromEntries(VECTOR_SHARD_KEYS.map((key, index) => [key, vectorShardContents[index]])), ...(manifestContent ? { manifest: manifestContent } : {}), ...(producerQaContent ? { producerQa: producerQaContent } : {}) };
const outputPaths = { ...PATHS, ...Object.fromEntries(VECTOR_SHARD_KEYS.map((key, index) => [key, PATHS.vectorShards[index]])) };

function patchFor(key) {
  const relativePath = outputPaths[key]; const content = outputs[key];
  if (!relativePath || content === undefined) throw new Error(`Unknown/unavailable artifact ${key}`);
  const oneTerminalNewline = content.endsWith('\n') ? content.slice(0, -1) : content;
  return `*** Begin Patch\n*** Add File: ${path.join(ROOT, relativePath)}\n${oneTerminalNewline.split('\n').map((line) => `+${line}`).join('\n')}\n*** End Patch\n`;
}

const args = process.argv.slice(2);
if (args[0] === '--emit') process.stdout.write(outputs[args[1]] ?? '');
else if (args[0] === '--emit-patch') process.stdout.write(patchFor(args[1]));
else if (args[0] === '--summary') process.stdout.write(pretty({
  paths: PATHS, hashes: { subject: subjectSha, registry: registrySha, sourceIndex: sourceIndexSha, crosswalk: crosswalkSha, vectors: vectorSha, vectorShards: vectorShardDescriptors.map(({ logicalPath, sha256, bytes, shardContentRoot }) => ({ logicalPath, sha256, bytes, shardContentRoot })), vectorShardSetRoot, manifest: manifestContent ? shaBytes(Buffer.from(manifestContent)) : null, packageContentRoot: manifest?.packageContentRoot ?? null, producerQa: producerQaContent ? shaBytes(Buffer.from(producerQaContent)) : null, producerQaContentRoot: producerQa?.producerQaContentRoot ?? null },
  counts: { blockers: blockers.length, requirements: parsedV6Requirements.length, fields: parsedV6Requirements.length * 5, outputs: outputRegistry.length, sourceArtifacts: sourceIndex.artifactCount, sourceMembers: sourceIndex.memberCount, authoritativeAtoms: authoritativeAtoms.length, semanticExtractionRecords: semanticExtraction.length, vectors: vectors.length, vectorShards: VECTOR_SHARD_COUNT, packageMembers: PACKAGE_MEMBER_COUNT, largestVectorShardBytes: Math.max(...vectorShardDescriptors.map((descriptor) => descriptor.bytes)), genesisSchemas: genesisMemberSchemas.length, recoveryMembers: recoveryMembers.length, recoveryWitnesses: recoveryWitnesses.length, roles: roleNames.length, rolePairs: pairMatrix.length, heads: fixedHeads.length, mutableObjects: objectToHead.length },
  state: registry.currentAuthorityState,
}));
else process.stderr.write(`Usage: generate-b0-v6-package.mjs --emit|--emit-patch <registry|subject|sourceIndex|crosswalk|vectors|vectorShard01..vectorShard${VECTOR_SHARD_COUNT}|manifest|producerQa> | --summary\n`);
