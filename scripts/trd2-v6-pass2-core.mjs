import {
  V6ValidationError,
  assertClosedObject,
  assertRepoRelativePath,
  assertUnicodeScalarAndNfc,
  attachContentIdentity,
  canonicalV6,
  rootV6,
  sha256Bytes,
  validateContentIdentity,
  parseCanonicalJsonBytes,
} from './trd2-v6-core.mjs';

export const TRD2_V6_PASS2_TOOLCHAIN_REGISTRY_PATH = 'docs/planning/trd2-v6-pass2-toolchain-path-registry-v1-2026-08-30.json';
export const TRD2_V6_PASS2_PATHS = Object.freeze([
  'docs/planning/trd2-v6-candidate-2026-08-30/closed-schema-registry.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/canonical-engine-a-report.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/canonical-engine-b-report.json',
]);
export const TRD2_V6_PASS2_TOOLCHAIN_PATHS = Object.freeze([
  'docs/planning/trd2-v6-output-path-registry-v1-2026-08-30.json',
  TRD2_V6_PASS2_TOOLCHAIN_REGISTRY_PATH,
  'docs/planning/trd2-v6-candidate-2026-08-30/source-capture-manifest.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/parser-grammar-and-corpus.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/pass-1-producer-qa.json',
  'package.json',
  'scripts/trd2-v6-core.mjs',
  'scripts/trd2-v6-pass2-core.mjs',
  'scripts/create-trd2-v6-pass2-candidate.mjs',
  'scripts/verify-trd2-v6-canonical-engine-a.mjs',
  'scripts/verify-trd2-v6-canonical-engine-b.py',
  'scripts/verify-trd2-v6-pass2-candidate.mjs',
  'tests/trd2-v6-pass2-core.test.mjs',
]);

const SHA256_RE = /^[0-9a-f]{64}$/;
const COMMIT_RE = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const SAFE_MAX = Number.MAX_SAFE_INTEGER;

export class SchemaValidationError extends Error {
  constructor(terminal, message) {
    super(message);
    this.terminal = terminal;
  }
}

export function pass2ToolchainRoot(rows) {
  return rootV6('TOOLCHAIN-FILE-COLLECTION', 'CONNECT-TRD2-V6-PASS2-TOOLCHAIN-V1', rows);
}

const spec = Object.freeze({
  array: (items, minItems = 0, maxItems = 32, unique = false, sorted = false) => ({ items, kind: 'Array', maxItems, minItems, sorted, unique }),
  boolean: () => ({ kind: 'Boolean' }),
  bytes32: () => ({ kind: 'Bytes32LowerHex' }),
  commit: () => ({ kind: 'CommitHex' }),
  constant: (value) => ({ kind: 'Const', value }),
  contentId: (prefix) => ({ kind: 'ContentId', prefix }),
  enumeration: (...values) => ({ kind: 'Enum', values }),
  logicalPath: () => ({ kind: 'LogicalPath' }),
  string: (minBytes = 1, maxBytes = 512) => ({ kind: 'String', maxBytes, minBytes }),
  uint: (minimum = 0, maximum = SAFE_MAX) => ({ kind: 'UIntSafe', maximum, minimum }),
});

const root = (value) => (value % 16).toString(16).repeat(64);
const roots = (start = 1) => [root(start), root(start + 1)];
const logicalPath = 'docs/planning/trd2-v6-candidate-2026-08-30/subject.json';
const commit = '1'.repeat(40);
const field = (name, fieldSpec, sample) => ({ name, sample, spec: fieldSpec });
const invariant = Object.freeze({
  arrayLength: (arrayField, numberField) => ({ arrayField, kind: 'ARRAY-LENGTH-EQUALS-FIELD', numberField }),
  equal: (left, right) => ({ kind: 'EQUAL-FIELDS', left, right }),
  lte: (left, right) => ({ kind: 'LTE-FIELDS', left, right }),
  notEqual: (left, right) => ({ kind: 'NOT-EQUAL-FIELDS', left, right }),
  subset: (subsetField, supersetField) => ({ kind: 'SUBSET-ARRAY', subsetField, supersetField }),
});

function define(family, fields, invariants = []) {
  return { family, fields, invariants };
}

const FAMILY_DEFINITIONS = Object.freeze([
  define('REQUIREMENT', [
    field('ordinal', spec.uint(1, 999999), 1), field('sourceRoot', spec.bytes32(), root(1)),
    field('statement', spec.string(1, 4096), 'כל תנאי מחייב תוצאה ניתנת לבדיקה.'),
    field('requirementClass', spec.enumeration('BUSINESS', 'DATA', 'SECURITY', 'OPERATIONS'), 'SECURITY'),
    field('clauseAstRoot', spec.bytes32(), root(2)), field('positiveFixtureRoots', spec.array(spec.bytes32(), 1, 16, true, true), roots(3)),
    field('negativeFixtureRoots', spec.array(spec.bytes32(), 1, 16, true, true), roots(5)),
    field('failureTerminal', spec.string(1, 128), 'REQUIREMENT-BLOCKED'),
    field('acceptanceState', spec.enumeration('PENDING', 'ACCEPTED', 'REJECTED'), 'PENDING'),
  ]),
  define('SUPERSESSION-RECORD', [
    field('predecessorRoot', spec.bytes32(), root(1)), field('successorRoot', spec.bytes32(), root(2)),
    field('reasonCode', spec.enumeration('DEFECT-REMEDIATION', 'REVOCATION', 'EXPIRY'), 'DEFECT-REMEDIATION'),
    field('effectiveHead', spec.bytes32(), root(3)), field('state', spec.enumeration('PENDING', 'COMMITTED', 'REVOKED'), 'PENDING'),
  ], [invariant.notEqual('predecessorRoot', 'successorRoot')]),
  define('NORMATIVE-REGISTRY', [
    field('registryName', spec.string(1, 128), 'REQUIREMENT-REGISTRY'),
    field('memberRoots', spec.array(spec.bytes32(), 1, 4096, true, true), roots(1)),
    field('denominator', spec.uint(1, 4096), 2), field('collectionRoot', spec.bytes32(), root(3)),
  ], [invariant.arrayLength('memberRoots', 'denominator')]),
  define('SOURCE-CAPTURE-ROW', [
    field('logicalPath', spec.logicalPath(), logicalPath), field('observedCommit', spec.commit(), commit),
    field('sha256', spec.bytes32(), root(1)), field('byteLength', spec.uint(1), 64),
    field('startByte', spec.uint(), 0), field('endByte', spec.uint(1), 64),
    field('captureSha256', spec.bytes32(), root(1)), field('role', spec.string(1, 128), 'NORMATIVE-SOURCE'),
  ], [invariant.lte('startByte', 'endByte'), invariant.equal('sha256', 'captureSha256')]),
  define('SOURCE-CAPTURE-MANIFEST', [
    field('observedCommit', spec.commit(), commit), field('sourceRoots', spec.array(spec.bytes32(), 1, 1024, true, true), roots(1)),
    field('sourceCount', spec.uint(1, 1024), 2), field('sourceCollectionRoot', spec.bytes32(), root(3)),
    field('repositoryVisibility', spec.constant('PUBLIC'), 'PUBLIC'), field('developmentFreeze', spec.constant('ACTIVE'), 'ACTIVE'),
  ], [invariant.arrayLength('sourceRoots', 'sourceCount')]),
  define('PARSER-FIXTURE', [
    field('captureId', spec.string(1, 160), 'TRD2V6-CAPTURE-0001'), field('captureSha256', spec.bytes32(), root(1)),
    field('startByte', spec.uint(), 0), field('endByte', spec.uint(1), 64), field('expectedStatus', spec.enumeration('ACCEPT', 'REJECT'), 'ACCEPT'),
    field('expectedTerminal', spec.string(1, 128), 'ACCEPT'), field('expectedTypedMapRoot', spec.bytes32(), root(2)),
  ], [invariant.lte('startByte', 'endByte')]),
  define('CLAUSE-AST-PROGRAM', [
    field('requirementRoot', spec.bytes32(), root(1)), field('operator', spec.enumeration('ALL', 'ANY', 'NOT', 'EQUAL', 'LTE'), 'ALL'),
    field('argumentTypes', spec.array(spec.enumeration('BOOLEAN', 'UINT', 'ROOT', 'STRING'), 1, 32), ['BOOLEAN', 'ROOT']),
    field('argumentRoots', spec.array(spec.bytes32(), 1, 32, true, true), roots(2)), field('argumentCount', spec.uint(1, 32), 2),
    field('resultType', spec.constant('BOOLEAN'), 'BOOLEAN'),
    field('evaluationOrder', spec.constant('LEFT-TO-RIGHT-FAIL-CLOSED'), 'LEFT-TO-RIGHT-FAIL-CLOSED'),
    field('sourceSpanRoot', spec.bytes32(), root(4)), field('failureTerminal', spec.string(1, 128), 'CLAUSE-BLOCKED'),
  ], [invariant.arrayLength('argumentTypes', 'argumentCount'), invariant.arrayLength('argumentRoots', 'argumentCount')]),
  define('CAUSAL-GRAPH-NODE', [
    field('nodeFamily', spec.enumeration('REQUIREMENT', 'EVENT', 'RECEIPT', 'RESULT', 'HEAD', 'TERMINAL'), 'REQUIREMENT'),
    field('boundRoot', spec.bytes32(), root(1)), field('producerId', spec.string(1, 160), 'SOLE-PRODUCER'),
    field('state', spec.enumeration('DECLARED', 'PRODUCED', 'INVALIDATED'), 'DECLARED'),
  ]),
  define('CAUSAL-GRAPH-EDGE', [
    field('fromNodeRoot', spec.bytes32(), root(1)), field('toNodeRoot', spec.bytes32(), root(2)),
    field('edgeType', spec.enumeration('PRODUCES', 'CONSUMES', 'INVALIDATES', 'FAILS_TO', 'BLOCKS_AT', 'SUPERSEDES', 'BINDS_EXACTLY'), 'PRODUCES'),
    field('qualifier', spec.string(1, 256), 'EXACT-TYPED-DEPENDENCY'),
  ], [invariant.notEqual('fromNodeRoot', 'toNodeRoot')]),
  define('STATE-MACHINE', [
    field('machineFamily', spec.enumeration('REVIEW', 'MISSING-VALUE', 'LIFECYCLE', 'RETENTION', 'BACKUP-RESTORE', 'PUBLIC-FLOW', 'SEVERITY'), 'REVIEW'),
    field('stateNames', spec.array(spec.string(1, 96), 1, 64, true, true), ['BLOCKED', 'PENDING']),
    field('eventNames', spec.array(spec.string(1, 96), 1, 64, true, true), ['APPEAL', 'SUBMIT']),
    field('initialState', spec.string(1, 96), 'PENDING'), field('transitionRoots', spec.array(spec.bytes32(), 1, 4096, true, true), roots(1)),
    field('defaultTerminal', spec.string(1, 128), 'UNDECLARED-TRANSITION-BLOCKED'),
  ]),
  define('STATE-TRANSITION', [
    field('machineRoot', spec.bytes32(), root(1)), field('fromState', spec.string(1, 96), 'PENDING'),
    field('event', spec.string(1, 96), 'SUBMIT'), field('toState', spec.string(1, 96), 'BLOCKED'),
    field('guardAstRoot', spec.bytes32(), root(2)), field('authorityRoot', spec.bytes32(), root(3)),
    field('expectedHead', spec.bytes32(), root(4)), field('terminal', spec.string(1, 128), 'SAFE-BLOCKED'),
    field('sideEffectRoots', spec.array(spec.bytes32(), 0, 32, true, true), []),
  ]),
  define('EXECUTABLE-VECTOR', [
    field('targetRoot', spec.bytes32(), root(1)), field('mode', spec.enumeration('POSITIVE', 'NEGATIVE', 'FAILURE', 'CONCURRENCY', 'RECOVERY'), 'NEGATIVE'),
    field('preStateRoot', spec.bytes32(), root(2)), field('operationRoots', spec.array(spec.bytes32(), 1, 64, true, true), roots(3)),
    field('trustedInputRoots', spec.array(spec.bytes32(), 1, 64, true, true), roots(5)), field('expectedPostStateRoot', spec.bytes32(), root(7)),
    field('expectedTerminal', spec.string(1, 128), 'SAFE-BLOCKED'), field('expectedSideEffectRoots', spec.array(spec.bytes32(), 0, 64, true, true), []),
    field('recoveryStateRoot', spec.bytes32(), root(8)), field('fixtureCaptureRoot', spec.bytes32(), root(9)),
  ]),
  define('ROOT-OVERLAY', [
    field('subjectRoot', spec.bytes32(), root(1)), field('schemaRegistryRoot', spec.bytes32(), root(2)),
    field('graphRoot', spec.bytes32(), root(3)), field('vectorCorpusRoot', spec.bytes32(), root(4)),
    field('bindingRoot', spec.bytes32(), root(5)), field('packetRoot', spec.bytes32(), root(6)),
    field('preReviewHead', spec.bytes32(), root(7)), field('successorHead', spec.bytes32(), root(8)),
  ], [invariant.notEqual('preReviewHead', 'successorHead')]),
  define('INVALIDATION-RULE', [
    field('dependencyRoot', spec.bytes32(), root(1)), field('headRoot', spec.bytes32(), root(2)),
    field('invalidatingEvents', spec.array(spec.enumeration('MISSING', 'STALE', 'SUBSTITUTED', 'ADVANCED', 'REVOKED'), 1, 8, true, true), ['ADVANCED', 'STALE']),
    field('safeTerminal', spec.string(1, 128), 'ROOT-OVERLAY-BLOCKED'), field('selfInvalidationAllowed', spec.constant(false), false),
  ]),
  define('DETACHED-ACCEPTANCE-PACKET', [
    field('normativeMemberRoots', spec.array(spec.bytes32(), 1, 64, true, true), roots(1)), field('memberCount', spec.uint(1, 64), 2),
    field('packageRoot', spec.bytes32(), root(3)), field('preReviewHead', spec.bytes32(), root(4)),
    field('futureResultCount', spec.constant(0), 0), field('claimState', spec.constant('NOT-ACCEPTED'), 'NOT-ACCEPTED'),
  ], [invariant.arrayLength('normativeMemberRoots', 'memberCount')]),
  define('FINDING-CLOSURE', [
    field('findingKey', spec.string(1, 96), 'TRD2V5-IHR-F001'), field('noMergeKey', spec.string(1, 96), 'TRD2V5-IHR-F001'),
    field('severity', spec.enumeration('P0', 'P1', 'P2', 'P3'), 'P0'), field('remediationRequirementRoot', spec.bytes32(), root(1)),
    field('evidenceRoots', spec.array(spec.bytes32(), 1, 64, true, true), roots(2)), field('disposition', spec.enumeration('OPEN', 'CLOSED', 'REJECTED'), 'OPEN'),
    field('accepted', spec.boolean(), false), field('closureCredit', spec.uint(0, 1), 0),
  ], [invariant.equal('findingKey', 'noMergeKey')]),
  define('PACKAGE-MEMBER', [
    field('logicalPath', spec.logicalPath(), logicalPath), field('sha256', spec.bytes32(), root(1)),
    field('byteLength', spec.uint(1), 64), field('memberClass', spec.enumeration('NORMATIVE', 'PRODUCER', 'EXTERNAL'), 'NORMATIVE'),
    field('contentRoot', spec.bytes32(), root(2)),
  ]),
  define('ATOMIC-PACKAGE-MANIFEST', [
    field('memberRoots', spec.array(spec.bytes32(), 1, 64, true, true), roots(1)), field('memberCount', spec.uint(1, 64), 2),
    field('packageRoot', spec.bytes32(), root(3)), field('manifestSelfReferenceCount', spec.constant(0), 0),
    field('assemblyState', spec.enumeration('CANDIDATE', 'SEALED', 'SUPERSEDED'), 'CANDIDATE'),
  ], [invariant.arrayLength('memberRoots', 'memberCount')]),
  define('GENERATION-RECEIPT', [
    field('generationId', spec.string(1, 160), 'GENERATION-A'), field('inputHead', spec.commit(), commit),
    field('inputRoots', spec.array(spec.bytes32(), 1, 128, true, true), roots(1)), field('outputRoots', spec.array(spec.bytes32(), 1, 128, true, true), roots(3)),
    field('toolchainRoot', spec.bytes32(), root(5)), field('startedAt', spec.uint(1), 10), field('endedAt', spec.uint(1), 20),
    field('status', spec.enumeration('PASS', 'BLOCKED', 'FAILED'), 'BLOCKED'),
  ], [invariant.lte('startedAt', 'endedAt')]),
  define('PARSER-REPORT', [
    field('parserName', spec.string(1, 96), 'PARSER-A'), field('corpusRoot', spec.bytes32(), root(1)),
    field('outcomeRoot', spec.bytes32(), root(2)), field('outcomeCount', spec.uint(1, 65535), 18),
    field('mismatchCount', spec.uint(0, 65535), 0), field('sourceSha256', spec.bytes32(), root(3)),
    field('status', spec.enumeration('PASS', 'BLOCKED'), 'PASS'),
  ]),
  define('CANONICAL-REPORT', [
    field('engineName', spec.string(1, 96), 'CANONICAL-A'), field('schemaRegistryRoot', spec.bytes32(), root(1)),
    field('outcomeRoot', spec.bytes32(), root(2)), field('outcomeCount', spec.uint(1, 65535), 318),
    field('mismatchCount', spec.uint(0, 65535), 0), field('sourceSha256', spec.bytes32(), root(3)),
    field('status', spec.enumeration('PASS', 'BLOCKED'), 'PASS'),
  ]),
  define('GRAPH-REPORT', [
    field('engineName', spec.string(1, 96), 'GRAPH-A'), field('graphRoot', spec.bytes32(), root(1)),
    field('nodeCount', spec.uint(1), 1), field('edgeCount', spec.uint(1), 1), field('mutationCount', spec.uint(1), 1),
    field('failureCount', spec.uint(), 0), field('status', spec.enumeration('PASS', 'BLOCKED'), 'PASS'),
  ]),
  define('VECTOR-RUNNER-REPORT', [
    field('runnerName', spec.string(1, 96), 'RUNNER-A'), field('vectorCorpusRoot', spec.bytes32(), root(1)),
    field('outcomeRoot', spec.bytes32(), root(2)), field('vectorCount', spec.uint(1), 1),
    field('disagreementCount', spec.uint(), 0), field('status', spec.enumeration('PASS', 'BLOCKED'), 'PASS'),
  ]),
  define('PRODUCER-QA', [
    field('packageRoot', spec.bytes32(), root(1)), field('checkRoots', spec.array(spec.bytes32(), 1, 512, true, true), roots(2)),
    field('checkCount', spec.uint(1, 512), 2), field('failureCount', spec.uint(), 0),
    field('acceptanceCredit', spec.constant(0), 0), field('status', spec.enumeration('PASS-LOCAL', 'BLOCKED'), 'PASS-LOCAL'),
  ], [invariant.arrayLength('checkRoots', 'checkCount')]),
  define('REVIEWER-APPOINTMENT', [
    field('controllerRoot', spec.bytes32(), root(1)), field('reviewerIdentityRoot', spec.bytes32(), root(2)),
    field('role', spec.enumeration('REVIEWER', 'RECONCILER', 'ACCEPTOR'), 'REVIEWER'), field('scopeRoots', spec.array(spec.bytes32(), 1, 64, true, true), roots(3)),
    field('issuedAt', spec.uint(1), 10), field('expiresAt', spec.uint(1), 20), field('revocationHead', spec.bytes32(), root(5)),
    field('oneUse', spec.constant(true), true), field('state', spec.enumeration('ACTIVE', 'USED', 'REVOKED', 'EXPIRED'), 'ACTIVE'),
  ], [invariant.lte('issuedAt', 'expiresAt')]),
  define('REVIEW-AUTHORITY', [
    field('appointmentRoot', spec.bytes32(), root(1)), field('actorRoot', spec.bytes32(), root(2)),
    field('controllerRoot', spec.bytes32(), root(3)), field('role', spec.enumeration('REVIEWER', 'RECONCILER', 'ACCEPTOR'), 'REVIEWER'),
    field('trustedTimeRoot', spec.bytes32(), root(4)), field('expectedAppointmentHead', spec.bytes32(), root(5)),
    field('fence', spec.uint(1), 1), field('state', spec.enumeration('ELIGIBLE', 'REVOKED', 'EXPIRED', 'USED'), 'ELIGIBLE'),
  ]),
  define('EVIDENCE-CUSTODY-RECEIPT', [
    field('evidenceClass', spec.enumeration('PUBLIC', 'PRIVATE-RECEIPT', 'DISCLOSURE-SAFE'), 'DISCLOSURE-SAFE'),
    field('contentSha256', spec.bytes32(), root(1)), field('classificationRoot', spec.bytes32(), root(2)),
    field('custodianRoot', spec.bytes32(), root(3)), field('verifiedAt', spec.uint(1), 10), field('expiresAt', spec.uint(1), 20),
    field('verifierResult', spec.enumeration('PASS', 'BLOCKED', 'REJECTED'), 'PASS'), field('privateBytesEmbedded', spec.constant(false), false),
  ], [invariant.lte('verifiedAt', 'expiresAt')]),
  define('INDEPENDENT-REVIEW', [
    field('subjectRoot', spec.bytes32(), root(1)), field('appointmentRoot', spec.bytes32(), root(2)),
    field('reviewerRoot', spec.bytes32(), root(3)), field('evidenceCustodyRoot', spec.bytes32(), root(4)),
    field('findingRoots', spec.array(spec.bytes32(), 1, 128, true, true), roots(5)), field('findingCount', spec.uint(1, 128), 2),
    field('verdict', spec.enumeration('ACCEPT', 'REJECT', 'BLOCKED'), 'REJECT'), field('selfReview', spec.constant(false), false),
  ], [invariant.arrayLength('findingRoots', 'findingCount')]),
  define('REVIEW-GENERATION', [
    field('generationName', spec.enumeration('A', 'B'), 'A'), field('subjectRoot', spec.bytes32(), root(1)),
    field('reviewRoot', spec.bytes32(), root(2)), field('reviewerRoot', spec.bytes32(), root(3)),
    field('appointmentRoot', spec.bytes32(), root(4)), field('inputHead', spec.bytes32(), root(5)),
    field('committedHead', spec.bytes32(), root(6)), field('state', spec.enumeration('PENDING', 'COMMITTED', 'REVOKED'), 'PENDING'),
  ], [invariant.notEqual('inputHead', 'committedHead')]),
  define('RECONCILIATION', [
    field('generationARoot', spec.bytes32(), root(1)), field('generationBRoot', spec.bytes32(), root(2)),
    field('reconcilerAppointmentRoot', spec.bytes32(), root(3)), field('findingDispositionRoots', spec.array(spec.bytes32(), 1, 128, true, true), roots(4)),
    field('findingCount', spec.uint(1, 128), 2), field('lossless', spec.constant(true), true),
    field('unresolvedCount', spec.uint(), 2), field('state', spec.enumeration('PENDING', 'COMMITTED', 'BLOCKED'), 'PENDING'),
  ], [invariant.notEqual('generationARoot', 'generationBRoot'), invariant.arrayLength('findingDispositionRoots', 'findingCount')]),
  define('APPEAL', [
    field('targetRoot', spec.bytes32(), root(1)), field('appellantRoot', spec.bytes32(), root(2)),
    field('authorityRoot', spec.bytes32(), root(3)), field('reasonRoot', spec.bytes32(), root(4)),
    field('expectedHead', spec.bytes32(), root(5)), field('submittedAt', spec.uint(1), 10),
    field('state', spec.enumeration('PENDING', 'UPHELD', 'DENIED', 'EXPIRED'), 'PENDING'),
  ]),
  define('REVOCATION', [
    field('targetAuthorityRoot', spec.bytes32(), root(1)), field('controllerRoot', spec.bytes32(), root(2)),
    field('reasonCode', spec.enumeration('COMPROMISE', 'ROLE-END', 'SUPERSEDED'), 'SUPERSEDED'),
    field('expectedHead', spec.bytes32(), root(3)), field('successorHead', spec.bytes32(), root(4)),
    field('effectiveAt', spec.uint(1), 10), field('state', spec.constant('REVOKED'), 'REVOKED'),
  ], [invariant.notEqual('expectedHead', 'successorHead')]),
  define('EXPIRY', [
    field('targetRoot', spec.bytes32(), root(1)), field('trustedTimeRoot', spec.bytes32(), root(2)),
    field('validFrom', spec.uint(1), 10), field('validUntil', spec.uint(1), 20), field('observedAt', spec.uint(1), 21),
    field('terminal', spec.constant('AUTHORITY-EXPIRED'), 'AUTHORITY-EXPIRED'),
  ], [invariant.lte('validFrom', 'validUntil'), invariant.lte('validUntil', 'observedAt')]),
  define('DEFINITION-ACCEPTANCE', [
    field('packageRoot', spec.bytes32(), root(1)), field('generationARoot', spec.bytes32(), root(2)),
    field('generationBRoot', spec.bytes32(), root(3)), field('reconciliationRoot', spec.bytes32(), root(4)),
    field('acceptorAppointmentRoot', spec.bytes32(), root(5)), field('acceptedRequirementCount', spec.uint(0, 128), 0),
    field('closedFindingCount', spec.uint(0, 15), 0), field('openP0P1Count', spec.uint(0, 15), 14),
    field('state', spec.enumeration('BLOCKED', 'ACCEPTED', 'REVOKED'), 'BLOCKED'),
  ], [invariant.notEqual('generationARoot', 'generationBRoot')]),
  define('MISSING-VALUE-RECORD', [
    field('targetRoot', spec.bytes32(), root(1)), field('missingFieldName', spec.string(1, 128), 'providerRegion'),
    field('state', spec.enumeration('MISSING', 'CONFLICT', 'PROPOSED', 'RESOLVED', 'REVOKED', 'EXPIRED'), 'MISSING'),
    field('version', spec.uint(), 0), field('currentHead', spec.bytes32(), root(2)),
    field('authorityRoot', spec.bytes32(), root(3)), field('inferredValueAllowed', spec.constant(false), false),
    field('safeTerminal', spec.string(1, 128), 'MISSING-VALUE-BLOCKED'),
  ]),
  define('LIFECYCLE-EVENT', [
    field('dataClassRoot', spec.bytes32(), root(1)), field('recordIdentityRoot', spec.bytes32(), root(2)),
    field('eventType', spec.enumeration('CREATE', 'ACTIVATE', 'DEACTIVATE', 'EXPIRE', 'DELETE', 'RESTORE', 'HOLD', 'RELEASE-HOLD'), 'EXPIRE'),
    field('priorState', spec.enumeration('ABSENT', 'ACTIVE', 'INACTIVE', 'HELD', 'PURGED'), 'INACTIVE'),
    field('expectedState', spec.enumeration('ACTIVE', 'INACTIVE', 'HELD', 'PURGED', 'BLOCKED'), 'PURGED'),
    field('guardAstRoot', spec.bytes32(), root(3)), field('authorityRoot', spec.bytes32(), root(4)),
    field('trustedTimeRoot', spec.bytes32(), root(5)), field('expectedHead', spec.bytes32(), root(6)),
  ]),
  define('LIFECYCLE-GUARD-AST', [
    field('operator', spec.enumeration('ALL', 'ANY', 'NOT', 'EQUAL', 'LTE', 'MEMBER'), 'ALL'),
    field('argumentTypes', spec.array(spec.enumeration('BOOLEAN', 'STATE', 'TIME', 'ROOT'), 1, 16), ['BOOLEAN', 'STATE']),
    field('argumentRoots', spec.array(spec.bytes32(), 1, 16, true, true), roots(1)), field('argumentCount', spec.uint(1, 16), 2),
    field('resultType', spec.constant('BOOLEAN'), 'BOOLEAN'), field('failureTerminal', spec.string(1, 128), 'LIFECYCLE-GUARD-BLOCKED'),
  ], [invariant.arrayLength('argumentTypes', 'argumentCount'), invariant.arrayLength('argumentRoots', 'argumentCount')]),
  define('DATA-CLASS', [
    field('className', spec.string(1, 128), 'CONVERSATION-MESSAGE'), field('authorityClass', spec.enumeration('TENANT', 'LEGAL', 'PROVIDER', 'SYSTEM'), 'TENANT'),
    field('retentionPolicyRoot', spec.bytes32(), root(1)), field('allowedStates', spec.array(spec.enumeration('ACTIVE', 'INACTIVE', 'HELD', 'PURGED'), 1, 8, true, true), ['ACTIVE', 'HELD']),
    field('storeRoots', spec.array(spec.bytes32(), 1, 16, true, true), roots(2)), field('mixedLifecycleAllowed', spec.constant(false), false),
  ]),
  define('DATA-RECORD', [
    field('dataClassRoot', spec.bytes32(), root(1)), field('opaqueIdentityRoot', spec.bytes32(), root(2)),
    field('state', spec.enumeration('ACTIVE', 'INACTIVE', 'HELD', 'PURGED'), 'ACTIVE'), field('createdAt', spec.uint(1), 10),
    field('lastTransitionAt', spec.uint(1), 20), field('currentHead', spec.bytes32(), root(3)),
    field('legalHoldRoot', spec.bytes32(), root(4)), field('providerStoreRoot', spec.bytes32(), root(5)),
  ], [invariant.lte('createdAt', 'lastTransitionAt')]),
  define('LEGAL-HOLD', [
    field('recordIdentityRoot', spec.bytes32(), root(1)), field('legalAuthorityRoot', spec.bytes32(), root(2)),
    field('issuedAt', spec.uint(1), 10), field('expiresAt', spec.uint(1), 20),
    field('expectedHead', spec.bytes32(), root(3)), field('state', spec.enumeration('ACTIVE', 'RELEASED', 'EXPIRED'), 'ACTIVE'),
    field('deleteAllowed', spec.constant(false), false),
  ], [invariant.lte('issuedAt', 'expiresAt')]),
  define('PROVIDER-STORE', [
    field('providerClass', spec.enumeration('DATABASE', 'OBJECT-STORAGE', 'QUEUE', 'EXTERNAL-PROVIDER'), 'DATABASE'),
    field('providerIdentityRoot', spec.bytes32(), root(1)), field('regionCode', spec.string(2, 32), 'il-central-1'),
    field('capabilityClass', spec.enumeration('ATOMIC', 'PREPARE-FINALIZE', 'BEST-EFFORT-READBACK'), 'PREPARE-FINALIZE'),
    field('connectionEvidenceRoot', spec.bytes32(), root(2)), field('active', spec.boolean(), false),
  ]),
  define('TRUSTED-TIME-RECEIPT', [
    field('clockAuthorityRoot', spec.bytes32(), root(1)), field('observedAt', spec.uint(1), 10),
    field('uncertaintyMillis', spec.uint(0, 60000), 100), field('validUntil', spec.uint(1), 20),
    field('nonceDigest', spec.bytes32(), root(2)), field('verifierResult', spec.enumeration('PASS', 'BLOCKED'), 'PASS'),
  ], [invariant.lte('observedAt', 'validUntil')]),
  define('HEAD-POINTER', [
    field('namespaceRoot', spec.bytes32(), root(1)), field('objectRoot', spec.bytes32(), root(2)),
    field('version', spec.uint(1), 1), field('fence', spec.uint(1), 1), field('commitIndex', spec.uint(1), 1),
    field('state', spec.enumeration('CURRENT', 'SUPERSEDED', 'REVOKED'), 'CURRENT'),
  ]),
  define('CAS-RECEIPT', [
    field('namespaceRoot', spec.bytes32(), root(1)), field('expectedHead', spec.bytes32(), root(2)),
    field('committedHead', spec.bytes32(), root(3)), field('expectedVersion', spec.uint(), 0),
    field('committedVersion', spec.uint(1), 1), field('fence', spec.uint(1), 1),
    field('winnerCount', spec.uint(0, 1), 1), field('result', spec.enumeration('COMMITTED', 'CONFLICT', 'BLOCKED'), 'COMMITTED'),
  ], [invariant.notEqual('expectedHead', 'committedHead')]),
  define('RETENTION-PLAN', [
    field('policyVersionRoot', spec.bytes32(), root(1)), field('cutoffTime', spec.uint(1), 10),
    field('candidateIdentityRoots', spec.array(spec.bytes32(), 1, 1024, true, true), roots(2)),
    field('providerConfirmedRoots', spec.array(spec.bytes32(), 1, 1024, true, true), [root(2)]),
    field('authorizedDeleteRoots', spec.array(spec.bytes32(), 1, 1024, true, true), [root(2)]),
    field('excludedActiveRoots', spec.array(spec.bytes32(), 0, 1024, true, true), []),
    field('excludedHoldRoots', spec.array(spec.bytes32(), 0, 1024, true, true), []), field('expectedHeadsRoot', spec.bytes32(), root(4)),
    field('fence', spec.uint(1), 1), field('issuedAt', spec.uint(1), 11), field('expiresAt', spec.uint(1), 20),
    field('state', spec.enumeration('FRESH', 'EXPIRED', 'CONSUMED', 'REVOKED'), 'FRESH'),
  ], [invariant.subset('authorizedDeleteRoots', 'candidateIdentityRoots'), invariant.subset('authorizedDeleteRoots', 'providerConfirmedRoots'), invariant.lte('cutoffTime', 'issuedAt'), invariant.lte('issuedAt', 'expiresAt')]),
  define('PROVIDER-CONFIRMATION', [
    field('planRoot', spec.bytes32(), root(1)), field('providerStoreRoot', spec.bytes32(), root(2)),
    field('confirmedIdentityRoots', spec.array(spec.bytes32(), 1, 1024, true, true), roots(3)),
    field('confirmedAt', spec.uint(1), 10), field('cutoffTime', spec.uint(1), 10), field('expectedHead', spec.bytes32(), root(5)),
    field('capabilityClass', spec.enumeration('ATOMIC', 'PREPARE-FINALIZE', 'BEST-EFFORT-READBACK'), 'PREPARE-FINALIZE'),
  ], [invariant.lte('cutoffTime', 'confirmedAt')]),
  define('DELETE-RECEIPT', [
    field('planRoot', spec.bytes32(), root(1)), field('providerConfirmationRoot', spec.bytes32(), root(2)),
    field('deletedIdentityRoots', spec.array(spec.bytes32(), 1, 1024, true, true), roots(3)),
    field('preparedAt', spec.uint(1), 10), field('finalizedAt', spec.uint(1), 20), field('expectedHead', spec.bytes32(), root(5)),
    field('committedHead', spec.bytes32(), root(6)), field('fence', spec.uint(1), 1),
    field('effectState', spec.enumeration('NONE', 'PREPARED', 'COMMITTED', 'PARTIAL', 'UNKNOWN'), 'COMMITTED'),
    field('postDeleteReadbackRole', spec.constant('AUDIT-ONLY'), 'AUDIT-ONLY'),
  ], [invariant.lte('preparedAt', 'finalizedAt'), invariant.notEqual('expectedHead', 'committedHead')]),
  define('BACKUP-EVIDENCE', [
    field('sourceSnapshotRoot', spec.bytes32(), root(1)), field('objectVersionRoots', spec.array(spec.bytes32(), 1, 4096, true, true), roots(2)),
    field('inventoryRoot', spec.bytes32(), root(4)), field('providerStoreRoot', spec.bytes32(), root(5)),
    field('regionCode', spec.string(2, 32), 'il-central-1'), field('consistencyProofRoot', spec.bytes32(), root(6)),
    field('startedAt', spec.uint(1), 10), field('endedAt', spec.uint(1), 20), field('retentionBoundaryObservedAt', spec.uint(1), 20),
    field('immutable', spec.constant(true), true),
  ], [invariant.lte('startedAt', 'endedAt'), invariant.lte('endedAt', 'retentionBoundaryObservedAt')]),
  define('RESTORE-EVIDENCE', [
    field('backupEvidenceRoot', spec.bytes32(), root(1)), field('targetStoreRoot', spec.bytes32(), root(2)),
    field('restoredObjectVersionRoots', spec.array(spec.bytes32(), 1, 4096, true, true), roots(3)),
    field('restoredInventoryRoot', spec.bytes32(), root(5)), field('privacyObligationRoots', spec.array(spec.bytes32(), 1, 256, true, true), roots(6)),
    field('redeleteReceiptRoots', spec.array(spec.bytes32(), 0, 256, true, true), []),
    field('startedAt', spec.uint(1), 10), field('endedAt', spec.uint(1), 20),
    field('privacyReplayState', spec.enumeration('PENDING', 'PASS', 'BLOCKED'), 'PENDING'),
    field('activationState', spec.constant('BLOCKED'), 'BLOCKED'),
  ], [invariant.lte('startedAt', 'endedAt'), invariant.notEqual('backupEvidenceRoot', 'targetStoreRoot')]),
  define('PUBLIC-FLOW-CONTROL', [
    field('sourceClass', spec.enumeration('PUBLIC', 'PRIVATE', 'SECRET', 'PERSONAL'), 'PRIVATE'),
    field('sinkClass', spec.enumeration('PUBLIC-GIT', 'LOG', 'ARTIFACT', 'PROVIDER', 'PRIVATE-STORE'), 'PUBLIC-GIT'),
    field('declassificationRuleRoot', spec.bytes32(), root(1)), field('allowed', spec.boolean(), false),
    field('positiveFixtureRoot', spec.bytes32(), root(2)), field('negativeFixtureRoot', spec.bytes32(), root(3)),
    field('safeTerminal', spec.string(1, 128), 'PUBLIC-FLOW-BLOCKED'),
  ]),
  define('PUBLIC-SURFACE-INVENTORY', [
    field('surfaceRoots', spec.array(spec.bytes32(), 1, 4096, true, true), roots(1)), field('surfaceCount', spec.uint(1, 4096), 2),
    field('gitHistoryIncluded', spec.constant(true), true), field('logsIncluded', spec.constant(true), true),
    field('artifactsIncluded', spec.constant(true), true), field('providerResponsesIncluded', spec.constant(true), true),
    field('inventoryRoot', spec.bytes32(), root(3)),
  ], [invariant.arrayLength('surfaceRoots', 'surfaceCount')]),
  define('SEVERITY-EVENT', [
    field('findingRoot', spec.bytes32(), root(1)), field('priorVersion', spec.uint(), 0),
    field('priorSeverity', spec.enumeration('UNSET', 'P0', 'P1', 'P2', 'P3'), 'UNSET'), field('newSeverity', spec.enumeration('P0', 'P1', 'P2', 'P3'), 'P2'),
    field('reasonCode', spec.enumeration('GENESIS', 'REACHABILITY', 'APPEAL-CORRECTION'), 'GENESIS'),
    field('triggerPredicateRoot', spec.bytes32(), root(2)), field('triggerEvidenceRoot', spec.bytes32(), root(3)),
    field('evaluatorRoot', spec.bytes32(), root(4)), field('authorityRoot', spec.bytes32(), root(5)),
    field('appointmentRoot', spec.bytes32(), root(6)), field('trustedTimeRoot', spec.bytes32(), root(7)),
    field('expectedHead', spec.bytes32(), root(8)), field('fence', spec.uint(1), 1), field('commitIndex', spec.uint(1), 1),
  ]),
  define('RESULT-RECEIPT', [
    field('targetRoot', spec.bytes32(), root(1)), field('operationRoot', spec.bytes32(), root(2)),
    field('inputRoots', spec.array(spec.bytes32(), 1, 128, true, true), roots(3)), field('outputRoots', spec.array(spec.bytes32(), 0, 128, true, true), []),
    field('terminal', spec.string(1, 128), 'SAFE-BLOCKED'), field('sideEffectRoots', spec.array(spec.bytes32(), 0, 128, true, true), []),
    field('committedHead', spec.bytes32(), root(5)), field('trustedTimeRoot', spec.bytes32(), root(6)),
  ]),
]);

export const TRD2_V6_SCHEMA_FAMILIES = Object.freeze(FAMILY_DEFINITIONS.map(({ family }) => family));

const SCHEMA_DEFINITION_VERSION = 'CONNECT-TRD2-V6-CLOSED-SCHEMA-DEFINITION-V1';
const REGISTRY_VERSION = 'CONNECT-TRD2-V6-CLOSED-SCHEMA-REGISTRY-V1';
const FIXTURE_VERSION = 'CONNECT-TRD2-V6-SCHEMA-ORACLE-FIXTURE-V1';
const REPORT_VERSION = 'CONNECT-TRD2-V6-CANONICAL-ENGINE-REPORT-V1';

const CANONICAL_PROFILE = Object.freeze({
  duplicateKeyRule: 'REJECT-BEFORE-SCHEMA-VALIDATION',
  encoding: 'UTF-8-WITHOUT-BOM',
  escapeTable: [
    { bytes: '22', codePoint: 'U+0022', encoding: '\\"' },
    { bytes: '5c', codePoint: 'U+005C', encoding: '\\\\' },
    { bytes: '08', codePoint: 'U+0008', encoding: '\\b' },
    { bytes: '0c', codePoint: 'U+000C', encoding: '\\f' },
    { bytes: '0a', codePoint: 'U+000A', encoding: '\\n' },
    { bytes: '0d', codePoint: 'U+000D', encoding: '\\r' },
    { bytes: '09', codePoint: 'U+0009', encoding: '\\t' },
    { bytes: '00-1f-excluding-short-escapes', codePoint: 'OTHER-C0', encoding: '\\u00xx-lowercase' },
  ],
  floatRule: 'FORBIDDEN',
  integerRule: 'BASE10-SAFE-INTEGER-NO-LEADING-ZERO',
  normalization: 'NFC',
  objectKeyOrder: 'ASCENDING-UTF8-BYTE-ORDER',
  optionalWhitespace: 'FORBIDDEN',
  slashEscaping: 'SOLIDUS-IS-NOT-ESCAPED',
  trailingNewline: 'FORBIDDEN-IN-CANONICAL-PREIMAGE',
  unknownFieldRule: 'REJECT-UNKNOWN-FIELD',
});

const CONSTRUCTORS = Object.freeze({
  collection: {
    algorithm: 'SHA-256',
    preimage: 'CONNECT-TRD2-V6-ROOT-V1\\0 || U32BE(typeTagBytes) || typeTag || U32BE(schemaVersionBytes) || schemaVersion || U64BE(canonicalBodyBytes) || canonicalBody',
    rule: 'ORDERED-ARRAY-OF-CONTENT-IDENTIFIED-RECORDS; DUPLICATE-IDS-FORBIDDEN',
  },
  domain: {
    algorithm: 'SHA-256',
    exclusionRule: 'REMOVE-EXACT-ID-KEY-AND-ROOT-KEY-BEFORE-CANONICALIZATION',
    idRule: 'PREFIX-HYPHEN-LOWERCASE-HEX-ROOT',
    preimage: 'CONNECT-TRD2-V6-ROOT-V1\\0 || U32BE(typeTagBytes) || typeTag || U32BE(schemaVersionBytes) || schemaVersion || U64BE(canonicalBodyBytes) || canonicalBody',
  },
});

function lowerCamel(family) {
  const parts = family.toLowerCase().split('-');
  return parts[0] + parts.slice(1).map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join('');
}

function schemaVersionFor(family) {
  return `CONNECT-TRD2-V6-${family}-V1`;
}

function identityFor(family) {
  const stem = lowerCamel(family);
  return { idKey: `${stem}Id`, prefix: `TRD2V6-${family}`, rootKey: `${stem}Root` };
}

function validateSpecDefinition(fieldSpec, label) {
  if (fieldSpec === null || typeof fieldSpec !== 'object' || Array.isArray(fieldSpec)) throw new V6ValidationError(`${label}: spec must be an object`);
  const keySets = {
    Array: ['items', 'kind', 'maxItems', 'minItems', 'sorted', 'unique'],
    Boolean: ['kind'],
    Bytes32LowerHex: ['kind'],
    CommitHex: ['kind'],
    Const: ['kind', 'value'],
    ContentId: ['kind', 'prefix'],
    Enum: ['kind', 'values'],
    LogicalPath: ['kind'],
    String: ['kind', 'maxBytes', 'minBytes'],
    UIntSafe: ['kind', 'maximum', 'minimum'],
  };
  if (!(fieldSpec.kind in keySets)) throw new V6ValidationError(`${label}: unknown spec kind ${fieldSpec.kind}`);
  assertClosedObject(fieldSpec, keySets[fieldSpec.kind], label);
  if (fieldSpec.kind === 'Array') {
    if (!Number.isSafeInteger(fieldSpec.minItems) || !Number.isSafeInteger(fieldSpec.maxItems) || fieldSpec.minItems < 0 || fieldSpec.maxItems < fieldSpec.minItems || typeof fieldSpec.unique !== 'boolean' || typeof fieldSpec.sorted !== 'boolean') throw new V6ValidationError(`${label}: invalid array bounds`);
    validateSpecDefinition(fieldSpec.items, `${label}.items`);
  }
  if (fieldSpec.kind === 'String' && (!Number.isSafeInteger(fieldSpec.minBytes) || !Number.isSafeInteger(fieldSpec.maxBytes) || fieldSpec.minBytes < 0 || fieldSpec.maxBytes < fieldSpec.minBytes)) throw new V6ValidationError(`${label}: invalid string bounds`);
  if (fieldSpec.kind === 'UIntSafe' && (!Number.isSafeInteger(fieldSpec.minimum) || !Number.isSafeInteger(fieldSpec.maximum) || fieldSpec.minimum < 0 || fieldSpec.maximum < fieldSpec.minimum)) throw new V6ValidationError(`${label}: invalid integer bounds`);
  if (fieldSpec.kind === 'Enum' && (!Array.isArray(fieldSpec.values) || fieldSpec.values.length < 1 || new Set(fieldSpec.values).size !== fieldSpec.values.length || fieldSpec.values.some((value) => typeof value !== 'string'))) throw new V6ValidationError(`${label}: invalid enum`);
  if (fieldSpec.kind === 'ContentId' && (typeof fieldSpec.prefix !== 'string' || fieldSpec.prefix.length < 1)) throw new V6ValidationError(`${label}: invalid ContentId prefix`);
  return fieldSpec;
}

function makeSchema(definition) {
  const schemaVersion = schemaVersionFor(definition.family);
  const identity = identityFor(definition.family);
  const declaredFields = [
    { name: 'recordKind', required: true, spec: spec.constant(definition.family) },
    { name: 'schemaVersion', required: true, spec: spec.constant(schemaVersion) },
    ...definition.fields.map(({ name, spec: fieldSpec }) => ({ name, required: true, spec: fieldSpec })),
    { name: identity.idKey, required: true, spec: spec.contentId(identity.prefix) },
    { name: identity.rootKey, required: true, spec: spec.bytes32() },
  ].sort((left, right) => Buffer.compare(Buffer.from(left.name, 'utf8'), Buffer.from(right.name, 'utf8')));
  const body = {
    additionalProperties: false,
    collectionConstructor: { schemaVersion: `${schemaVersion}-COLLECTION`, typeTag: `${definition.family}-COLLECTION` },
    domainConstructor: { excludedFields: [identity.idKey, identity.rootKey], idKey: identity.idKey, prefix: identity.prefix, rootKey: identity.rootKey, schemaVersion, typeTag: definition.family },
    family: definition.family,
    fields: declaredFields,
    invariants: definition.invariants,
    schemaVersion,
    terminals: {
      constMismatch: 'CONST-MISMATCH',
      contentIdentityMismatch: 'CONTENT-IDENTITY-MISMATCH',
      enumMismatch: 'ENUM-MISMATCH',
      formatError: 'FORMAT-ERROR',
      invariantError: 'CROSS-FIELD-INVARIANT',
      missingField: 'MISSING-FIELD',
      rangeError: 'RANGE-ERROR',
      typeMismatch: 'TYPE-MISMATCH',
      unknownField: 'UNKNOWN-FIELD',
    },
  };
  return attachContentIdentity('TRD2V6-SCHEMA', 'CLOSED-SCHEMA-DEFINITION', SCHEMA_DEFINITION_VERSION, body, 'schemaId', 'schemaRoot');
}

function positiveRecord(definition, schema) {
  const body = {
    recordKind: definition.family,
    schemaVersion: schema.schemaVersion,
    ...Object.fromEntries(definition.fields.map(({ name, sample }) => [name, structuredClone(sample)])),
  };
  return attachContentIdentity(
    schema.domainConstructor.prefix,
    schema.domainConstructor.typeTag,
    schema.domainConstructor.schemaVersion,
    body,
    schema.domainConstructor.idKey,
    schema.domainConstructor.rootKey,
  );
}

function wrongType(fieldSpec) {
  if (fieldSpec.kind === 'Boolean') return 'NOT-A-BOOLEAN';
  if (fieldSpec.kind === 'UIntSafe') return 'NOT-AN-INTEGER';
  if (fieldSpec.kind === 'Array') return 'NOT-AN-ARRAY';
  return false;
}

function schemaFailure(terminal, message) {
  throw new SchemaValidationError(terminal, message);
}

function validateValue(value, fieldSpec, label) {
  if (fieldSpec.kind === 'Const') {
    if (typeof value !== typeof fieldSpec.value) schemaFailure('TYPE-MISMATCH', `${label}: const type mismatch`);
    if (canonicalV6(value) !== canonicalV6(fieldSpec.value)) schemaFailure('CONST-MISMATCH', `${label}: const mismatch`);
    return;
  }
  if (fieldSpec.kind === 'Boolean') {
    if (typeof value !== 'boolean') schemaFailure('TYPE-MISMATCH', `${label}: expected boolean`);
    return;
  }
  if (fieldSpec.kind === 'UIntSafe') {
    if (!Number.isSafeInteger(value) || value < 0) schemaFailure('TYPE-MISMATCH', `${label}: expected UIntSafe`);
    if (value < fieldSpec.minimum || value > fieldSpec.maximum) schemaFailure('RANGE-ERROR', `${label}: integer out of range`);
    return;
  }
  if (fieldSpec.kind === 'String') {
    if (typeof value !== 'string') schemaFailure('TYPE-MISMATCH', `${label}: expected string`);
    try { assertUnicodeScalarAndNfc(value, label); } catch { schemaFailure('FORMAT-ERROR', `${label}: invalid Unicode/NFC`); }
    const byteLength = Buffer.byteLength(value, 'utf8');
    if (byteLength < fieldSpec.minBytes || byteLength > fieldSpec.maxBytes) schemaFailure('RANGE-ERROR', `${label}: string byte length out of range`);
    return;
  }
  if (fieldSpec.kind === 'Bytes32LowerHex') {
    if (typeof value !== 'string') schemaFailure('TYPE-MISMATCH', `${label}: expected Bytes32 string`);
    if (!SHA256_RE.test(value)) schemaFailure('FORMAT-ERROR', `${label}: invalid Bytes32`);
    return;
  }
  if (fieldSpec.kind === 'CommitHex') {
    if (typeof value !== 'string') schemaFailure('TYPE-MISMATCH', `${label}: expected commit string`);
    if (!COMMIT_RE.test(value)) schemaFailure('FORMAT-ERROR', `${label}: invalid commit identity`);
    return;
  }
  if (fieldSpec.kind === 'LogicalPath') {
    if (typeof value !== 'string') schemaFailure('TYPE-MISMATCH', `${label}: expected path string`);
    try { assertRepoRelativePath(value); } catch { schemaFailure('FORMAT-ERROR', `${label}: invalid logical path`); }
    return;
  }
  if (fieldSpec.kind === 'ContentId') {
    if (typeof value !== 'string') schemaFailure('TYPE-MISMATCH', `${label}: expected content ID string`);
    if (!new RegExp(`^${fieldSpec.prefix}-[0-9a-f]{64}$`).test(value)) schemaFailure('FORMAT-ERROR', `${label}: invalid content ID`);
    return;
  }
  if (fieldSpec.kind === 'Enum') {
    if (typeof value !== 'string') schemaFailure('TYPE-MISMATCH', `${label}: expected enum string`);
    if (!fieldSpec.values.includes(value)) schemaFailure('ENUM-MISMATCH', `${label}: undeclared enum member`);
    return;
  }
  if (fieldSpec.kind === 'Array') {
    if (!Array.isArray(value)) schemaFailure('TYPE-MISMATCH', `${label}: expected array`);
    if (value.length < fieldSpec.minItems || value.length > fieldSpec.maxItems) schemaFailure('RANGE-ERROR', `${label}: array length out of range`);
    value.forEach((member, index) => validateValue(member, fieldSpec.items, `${label}[${index}]`));
    const canonicalMembers = value.map(canonicalV6);
    if (fieldSpec.unique && new Set(canonicalMembers).size !== canonicalMembers.length) schemaFailure('CROSS-FIELD-INVARIANT', `${label}: duplicate array member`);
    if (fieldSpec.sorted) {
      const sorted = [...canonicalMembers].sort((left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')));
      if (JSON.stringify(sorted) !== JSON.stringify(canonicalMembers)) schemaFailure('CROSS-FIELD-INVARIANT', `${label}: array is not sorted`);
    }
    return;
  }
  throw new V6ValidationError(`${label}: validator has no implementation for ${fieldSpec.kind}`);
}

function validateInvariant(record, rule, label) {
  if (rule.kind === 'ARRAY-LENGTH-EQUALS-FIELD' && record[rule.arrayField].length !== record[rule.numberField]) schemaFailure('CROSS-FIELD-INVARIANT', `${label}: array denominator mismatch`);
  if (rule.kind === 'EQUAL-FIELDS' && canonicalV6(record[rule.left]) !== canonicalV6(record[rule.right])) schemaFailure('CROSS-FIELD-INVARIANT', `${label}: fields differ`);
  if (rule.kind === 'NOT-EQUAL-FIELDS' && canonicalV6(record[rule.left]) === canonicalV6(record[rule.right])) schemaFailure('CROSS-FIELD-INVARIANT', `${label}: fields must differ`);
  if (rule.kind === 'LTE-FIELDS' && record[rule.left] > record[rule.right]) schemaFailure('CROSS-FIELD-INVARIANT', `${label}: ordering invariant failed`);
  if (rule.kind === 'SUBSET-ARRAY' && record[rule.subsetField].some((member) => !record[rule.supersetField].includes(member))) schemaFailure('CROSS-FIELD-INVARIANT', `${label}: subset invariant failed`);
}

export function validateRecordAgainstSchema(record, schema) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) schemaFailure('TYPE-MISMATCH', `${schema.family}: record must be an object`);
  const expected = schema.fields.map(({ name }) => name);
  const actual = Object.keys(record);
  const unknown = actual.filter((name) => !expected.includes(name)).sort()[0];
  if (unknown !== undefined) schemaFailure('UNKNOWN-FIELD', `${schema.family}: unknown field ${unknown}`);
  const missing = expected.filter((name) => !(name in record)).sort()[0];
  if (missing !== undefined) schemaFailure('MISSING-FIELD', `${schema.family}: missing field ${missing}`);
  for (const declared of schema.fields) validateValue(record[declared.name], declared.spec, `${schema.family}.${declared.name}`);
  for (const rule of schema.invariants) validateInvariant(record, rule, schema.family);
  const { idKey, prefix, rootKey, schemaVersion, typeTag } = schema.domainConstructor;
  const body = Object.fromEntries(Object.entries(record).filter(([name]) => name !== idKey && name !== rootKey));
  const expectedRoot = rootV6(typeTag, schemaVersion, body);
  if (record[rootKey] !== expectedRoot || record[idKey] !== `${prefix}-${expectedRoot}`) schemaFailure('CONTENT-IDENTITY-MISMATCH', `${schema.family}: content identity mismatch`);
  return { recordRoot: expectedRoot, status: 'ACCEPT', terminal: 'ACCEPT' };
}

function makeFixture(schema, mutation, value, expectedStatus, expectedTerminal, expectedRecordRoot) {
  const bytes = Buffer.from(canonicalV6(value), 'utf8');
  const sha256 = sha256Bytes(bytes);
  const body = {
    byteLength: bytes.length,
    bytesBase64: bytes.toString('base64'),
    captureId: `TRD2V6-SCHEMA-CAPTURE-${sha256}`,
    captureSha256: sha256,
    endByte: bytes.length,
    expectedRecordRoot,
    expectedStatus,
    expectedTerminal,
    mutation,
    schemaId: schema.schemaId,
    sha256,
    startByte: 0,
  };
  return attachContentIdentity('TRD2V6-SCHEMA-FIXTURE', 'SCHEMA-ORACLE-FIXTURE', FIXTURE_VERSION, body, 'fixtureId', 'fixtureRoot');
}

function fixturesFor(definition, schema) {
  const positive = positiveRecord(definition, schema);
  const idKey = schema.domainConstructor.idKey;
  const rootKey = schema.domainConstructor.rootKey;
  const unknown = structuredClone(positive);
  unknown.undeclaredField = 'BLOCK';
  const missing = structuredClone(positive);
  delete missing.schemaVersion;
  const typeMismatch = structuredClone(positive);
  const targetField = definition.fields[0];
  typeMismatch[targetField.name] = wrongType(targetField.spec);
  const constMismatch = structuredClone(positive);
  constMismatch.schemaVersion = `${schema.schemaVersion}-ALTERED`;
  const identityMismatch = structuredClone(positive);
  identityMismatch[rootKey] = identityMismatch[rootKey] === root(15) ? root(14) : root(15);
  if (!(idKey in identityMismatch)) throw new V6ValidationError(`${definition.family}: missing content ID in positive fixture`);
  return [
    makeFixture(schema, 'POSITIVE', positive, 'ACCEPT', 'ACCEPT', positive[rootKey]),
    makeFixture(schema, 'UNKNOWN-FIELD', unknown, 'REJECT', 'UNKNOWN-FIELD', null),
    makeFixture(schema, 'MISSING-FIELD', missing, 'REJECT', 'MISSING-FIELD', null),
    makeFixture(schema, 'TYPE-MISMATCH', typeMismatch, 'REJECT', 'TYPE-MISMATCH', null),
    makeFixture(schema, 'CONST-MISMATCH', constMismatch, 'REJECT', 'CONST-MISMATCH', null),
    makeFixture(schema, 'CONTENT-IDENTITY-MISMATCH', identityMismatch, 'REJECT', 'CONTENT-IDENTITY-MISMATCH', null),
  ];
}

export function makeSchemaCatalog() {
  const schemas = FAMILY_DEFINITIONS.map(makeSchema);
  const schemaByFamily = new Map(schemas.map((schema) => [schema.family, schema]));
  const fixtures = FAMILY_DEFINITIONS.flatMap((definition) => fixturesFor(definition, schemaByFamily.get(definition.family)));
  return { fixtures, schemas };
}

function validateInvariantDefinition(rule, schema, label) {
  const keys = {
    'ARRAY-LENGTH-EQUALS-FIELD': ['arrayField', 'kind', 'numberField'],
    'EQUAL-FIELDS': ['kind', 'left', 'right'],
    'LTE-FIELDS': ['kind', 'left', 'right'],
    'NOT-EQUAL-FIELDS': ['kind', 'left', 'right'],
    'SUBSET-ARRAY': ['kind', 'subsetField', 'supersetField'],
  };
  if (rule === null || typeof rule !== 'object' || Array.isArray(rule) || !(rule.kind in keys)) throw new V6ValidationError(`${label}: unknown invariant`);
  assertClosedObject(rule, keys[rule.kind], label);
  const names = new Set(schema.fields.map(({ name }) => name));
  for (const [name, value] of Object.entries(rule)) if (name !== 'kind' && !names.has(value)) throw new V6ValidationError(`${label}: invariant references undeclared field ${value}`);
}

function validateSchema(schema, expectedFamily) {
  assertClosedObject(schema, ['additionalProperties', 'collectionConstructor', 'domainConstructor', 'family', 'fields', 'invariants', 'schemaId', 'schemaRoot', 'schemaVersion', 'terminals'], `schema.${expectedFamily}`);
  if (schema.family !== expectedFamily || schema.schemaVersion !== schemaVersionFor(expectedFamily) || schema.additionalProperties !== false) throw new V6ValidationError(`schema.${expectedFamily}: identity mismatch`);
  validateContentIdentity(schema, 'TRD2V6-SCHEMA', 'CLOSED-SCHEMA-DEFINITION', SCHEMA_DEFINITION_VERSION, 'schemaId', 'schemaRoot');
  assertClosedObject(schema.domainConstructor, ['excludedFields', 'idKey', 'prefix', 'rootKey', 'schemaVersion', 'typeTag'], `schema.${expectedFamily}.domainConstructor`);
  assertClosedObject(schema.collectionConstructor, ['schemaVersion', 'typeTag'], `schema.${expectedFamily}.collectionConstructor`);
  const identity = identityFor(expectedFamily);
  if (
    schema.domainConstructor.idKey !== identity.idKey
    || schema.domainConstructor.rootKey !== identity.rootKey
    || schema.domainConstructor.prefix !== identity.prefix
    || schema.domainConstructor.typeTag !== expectedFamily
    || schema.domainConstructor.schemaVersion !== schema.schemaVersion
    || canonicalV6(schema.domainConstructor.excludedFields) !== canonicalV6([identity.idKey, identity.rootKey])
    || schema.collectionConstructor.typeTag !== `${expectedFamily}-COLLECTION`
    || schema.collectionConstructor.schemaVersion !== `${schema.schemaVersion}-COLLECTION`
  ) throw new V6ValidationError(`schema.${expectedFamily}: constructor mismatch`);
  if (!Array.isArray(schema.fields) || schema.fields.length < 5) throw new V6ValidationError(`schema.${expectedFamily}: insufficient fields`);
  const names = schema.fields.map(({ name }) => name);
  const sortedNames = [...names].sort((left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')));
  if (new Set(names).size !== names.length || JSON.stringify(names) !== JSON.stringify(sortedNames)) throw new V6ValidationError(`schema.${expectedFamily}: field names must be unique and byte-sorted`);
  schema.fields.forEach((declared, index) => {
    assertClosedObject(declared, ['name', 'required', 'spec'], `schema.${expectedFamily}.fields[${index}]`);
    if (typeof declared.name !== 'string' || declared.required !== true) throw new V6ValidationError(`schema.${expectedFamily}: optional or malformed field`);
    validateSpecDefinition(declared.spec, `schema.${expectedFamily}.fields.${declared.name}`);
  });
  if (!names.includes(identity.idKey) || !names.includes(identity.rootKey) || !names.includes('schemaVersion') || !names.includes('recordKind')) throw new V6ValidationError(`schema.${expectedFamily}: identity envelope fields missing`);
  if (!Array.isArray(schema.invariants)) throw new V6ValidationError(`schema.${expectedFamily}: invariants must be an array`);
  schema.invariants.forEach((rule, index) => validateInvariantDefinition(rule, schema, `schema.${expectedFamily}.invariants[${index}]`));
  assertClosedObject(schema.terminals, ['constMismatch', 'contentIdentityMismatch', 'enumMismatch', 'formatError', 'invariantError', 'missingField', 'rangeError', 'typeMismatch', 'unknownField'], `schema.${expectedFamily}.terminals`);
  return schema;
}

export function executeSchemaFixture(fixture, schema) {
  let bytes;
  try {
    bytes = Buffer.from(fixture.bytesBase64, 'base64');
    if (bytes.toString('base64') !== fixture.bytesBase64 || bytes.length !== fixture.byteLength || sha256Bytes(bytes) !== fixture.sha256 || fixture.captureSha256 !== fixture.sha256 || fixture.startByte !== 0 || fixture.endByte !== bytes.length || fixture.captureId !== `TRD2V6-SCHEMA-CAPTURE-${fixture.sha256}`) throw new Error('fixture byte/capture identity mismatch');
    const record = parseCanonicalJsonBytes(bytes);
    const result = validateRecordAgainstSchema(record, schema);
    return { observedRecordRoot: result.recordRoot, status: 'ACCEPT', terminal: 'ACCEPT' };
  } catch (error) {
    if (error instanceof SchemaValidationError) return { observedRecordRoot: null, status: 'REJECT', terminal: error.terminal };
    throw error;
  }
}

function validateFixture(fixture, schema, index) {
  assertClosedObject(fixture, ['byteLength', 'bytesBase64', 'captureId', 'captureSha256', 'endByte', 'expectedRecordRoot', 'expectedStatus', 'expectedTerminal', 'fixtureId', 'fixtureRoot', 'mutation', 'schemaId', 'sha256', 'startByte'], `schemaFixture[${index}]`);
  validateContentIdentity(fixture, 'TRD2V6-SCHEMA-FIXTURE', 'SCHEMA-ORACLE-FIXTURE', FIXTURE_VERSION, 'fixtureId', 'fixtureRoot');
  if (fixture.schemaId !== schema.schemaId || !SHA256_RE.test(fixture.sha256) || !(fixture.expectedRecordRoot === null || SHA256_RE.test(fixture.expectedRecordRoot))) throw new V6ValidationError(`schemaFixture[${index}]: identity mismatch`);
  const observed = executeSchemaFixture(fixture, schema);
  if (observed.status !== fixture.expectedStatus || observed.terminal !== fixture.expectedTerminal || observed.observedRecordRoot !== fixture.expectedRecordRoot) throw new V6ValidationError(`schemaFixture[${index}]: oracle mismatch`);
  return fixture;
}

export function validatePass2ToolchainRegistry(registry) {
  assertClosedObject(registry, ['passTwoEmittedPaths', 'schema', 'toolchainPaths', 'version'], 'pass2ToolchainRegistry');
  if (registry.schema !== 'CONNECT-TRD2-V6-PASS2-TOOLCHAIN-PATH-REGISTRY-V1' || registry.version !== 1) throw new V6ValidationError('pass2ToolchainRegistry: identity mismatch');
  if (JSON.stringify(registry.passTwoEmittedPaths) !== JSON.stringify(TRD2_V6_PASS2_PATHS) || JSON.stringify(registry.toolchainPaths) !== JSON.stringify(TRD2_V6_PASS2_TOOLCHAIN_PATHS)) throw new V6ValidationError('pass2ToolchainRegistry: closed path set mismatch');
  if (new Set(registry.toolchainPaths).size !== registry.toolchainPaths.length || new Set(registry.passTwoEmittedPaths).size !== registry.passTwoEmittedPaths.length) throw new V6ValidationError('pass2ToolchainRegistry: duplicate path');
  [...registry.toolchainPaths, ...registry.passTwoEmittedPaths].forEach(assertRepoRelativePath);
  return registry;
}

export function makeClosedSchemaRegistry(provenance) {
  const { fixtures, schemas } = makeSchemaCatalog();
  const body = {
    artifactClass: 'PASS-2-NORMATIVE-CANDIDATE-MEMBER; PRODUCER-GENERATED; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE',
    canonicalProfile: CANONICAL_PROFILE,
    claimLimit: 'CLOSED-SCHEMA-AND-CANONICAL-CONSTRUCTOR-MECHANICS-ONLY; SEMANTICS-AND-EXTERNAL-CLOSURE-REMAIN-PENDING',
    constructors: CONSTRUCTORS,
    fixtureCollectionRoot: rootV6('SCHEMA-ORACLE-FIXTURE-COLLECTION', FIXTURE_VERSION, fixtures),
    fixtureCount: fixtures.length,
    fixtures,
    provenance,
    schemaCollectionRoot: rootV6('CLOSED-SCHEMA-COLLECTION', SCHEMA_DEFINITION_VERSION, schemas),
    schemaCount: schemas.length,
    schemas,
    schemaVersion: REGISTRY_VERSION,
  };
  return attachContentIdentity('TRD2V6-CLOSED-SCHEMA-REGISTRY', 'CLOSED-SCHEMA-REGISTRY', REGISTRY_VERSION, body);
}

export function validateClosedSchemaRegistry(registry) {
  assertClosedObject(registry, ['artifactClass', 'artifactId', 'artifactRoot', 'canonicalProfile', 'claimLimit', 'constructors', 'fixtureCollectionRoot', 'fixtureCount', 'fixtures', 'provenance', 'schemaCollectionRoot', 'schemaCount', 'schemas', 'schemaVersion'], 'closedSchemaRegistry');
  if (registry.schemaVersion !== REGISTRY_VERSION) throw new V6ValidationError('closedSchemaRegistry: schema version mismatch');
  if (
    registry.artifactClass !== 'PASS-2-NORMATIVE-CANDIDATE-MEMBER; PRODUCER-GENERATED; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE'
    || registry.claimLimit !== 'CLOSED-SCHEMA-AND-CANONICAL-CONSTRUCTOR-MECHANICS-ONLY; SEMANTICS-AND-EXTERNAL-CLOSURE-REMAIN-PENDING'
  ) throw new V6ValidationError('closedSchemaRegistry: claim boundary mismatch');
  validateContentIdentity(registry, 'TRD2V6-CLOSED-SCHEMA-REGISTRY', 'CLOSED-SCHEMA-REGISTRY', REGISTRY_VERSION);
  if (canonicalV6(registry.canonicalProfile) !== canonicalV6(CANONICAL_PROFILE) || canonicalV6(registry.constructors) !== canonicalV6(CONSTRUCTORS)) throw new V6ValidationError('closedSchemaRegistry: canonical profile or constructors changed');
  if (!Array.isArray(registry.schemas) || registry.schemaCount !== registry.schemas.length || registry.schemaCount !== TRD2_V6_SCHEMA_FAMILIES.length) throw new V6ValidationError('closedSchemaRegistry: schema denominator mismatch');
  if (JSON.stringify(registry.schemas.map(({ family }) => family)) !== JSON.stringify(TRD2_V6_SCHEMA_FAMILIES)) throw new V6ValidationError('closedSchemaRegistry: family order mismatch');
  registry.schemas.forEach((schema, index) => validateSchema(schema, TRD2_V6_SCHEMA_FAMILIES[index]));
  const expectedCatalog = makeSchemaCatalog();
  if (canonicalV6(registry.schemas) !== canonicalV6(expectedCatalog.schemas)) throw new V6ValidationError('closedSchemaRegistry: schemas differ from the deterministic closed catalog');
  if (rootV6('CLOSED-SCHEMA-COLLECTION', SCHEMA_DEFINITION_VERSION, registry.schemas) !== registry.schemaCollectionRoot) throw new V6ValidationError('closedSchemaRegistry: schema collection root mismatch');
  if (!Array.isArray(registry.fixtures) || registry.fixtureCount !== registry.fixtures.length || registry.fixtureCount !== registry.schemaCount * 6) throw new V6ValidationError('closedSchemaRegistry: fixture denominator mismatch');
  if (new Set(registry.fixtures.map(({ fixtureId }) => fixtureId)).size !== registry.fixtures.length) throw new V6ValidationError('closedSchemaRegistry: duplicate fixture identity');
  const schemaById = new Map(registry.schemas.map((schema) => [schema.schemaId, schema]));
  registry.fixtures.forEach((fixture, index) => {
    const schema = schemaById.get(fixture.schemaId);
    if (schema === undefined) throw new V6ValidationError(`closedSchemaRegistry: fixture ${index} references an unknown schema`);
    validateFixture(fixture, schema, index);
  });
  if (canonicalV6(registry.fixtures) !== canonicalV6(expectedCatalog.fixtures)) throw new V6ValidationError('closedSchemaRegistry: fixtures differ from the deterministic exact corpus');
  if (rootV6('SCHEMA-ORACLE-FIXTURE-COLLECTION', FIXTURE_VERSION, registry.fixtures) !== registry.fixtureCollectionRoot) throw new V6ValidationError('closedSchemaRegistry: fixture collection root mismatch');
  assertClosedObject(registry.provenance, ['observedHead', 'observedObjectFormat', 'outputRegistrySha256', 'parserCorpusRoot', 'pass1QaRoot', 'sourceCaptureRoot', 'toolchain', 'toolchainRegistrySha256', 'toolchainRoot'], 'closedSchemaRegistry.provenance');
  if (!COMMIT_RE.test(registry.provenance.observedHead) || !['sha1', 'sha256'].includes(registry.provenance.observedObjectFormat) || !SHA256_RE.test(registry.provenance.outputRegistrySha256) || !SHA256_RE.test(registry.provenance.toolchainRegistrySha256) || !SHA256_RE.test(registry.provenance.sourceCaptureRoot) || !SHA256_RE.test(registry.provenance.parserCorpusRoot) || !SHA256_RE.test(registry.provenance.pass1QaRoot)) throw new V6ValidationError('closedSchemaRegistry: provenance identity mismatch');
  if (!Array.isArray(registry.provenance.toolchain) || registry.provenance.toolchain.length !== TRD2_V6_PASS2_TOOLCHAIN_PATHS.length || JSON.stringify(registry.provenance.toolchain.map(({ logicalPath: candidate }) => candidate)) !== JSON.stringify(TRD2_V6_PASS2_TOOLCHAIN_PATHS)) throw new V6ValidationError('closedSchemaRegistry: toolchain denominator mismatch');
  registry.provenance.toolchain.forEach((row, index) => {
    assertClosedObject(row, ['byteLength', 'logicalPath', 'observedCommit', 'sha256'], `closedSchemaRegistry.provenance.toolchain[${index}]`);
    if (row.observedCommit !== registry.provenance.observedHead || !SHA256_RE.test(row.sha256) || !Number.isSafeInteger(row.byteLength) || row.byteLength < 1) throw new V6ValidationError(`closedSchemaRegistry: malformed toolchain row ${index}`);
  });
  if (pass2ToolchainRoot(registry.provenance.toolchain) !== registry.provenance.toolchainRoot) throw new V6ValidationError('closedSchemaRegistry: toolchain root mismatch');
  return registry;
}

export function makeCanonicalEngineReport({ engineId, implementation, registry, sourceSha256 }) {
  validateClosedSchemaRegistry(registry);
  if (!['CANONICAL-ENGINE-A', 'CANONICAL-ENGINE-B'].includes(engineId) || !SHA256_RE.test(sourceSha256)) throw new V6ValidationError('canonicalEngineReport: invalid engine identity');
  const schemaById = new Map(registry.schemas.map((schema) => [schema.schemaId, schema]));
  const outcomes = registry.fixtures.map((fixture) => {
    const observed = executeSchemaFixture(fixture, schemaById.get(fixture.schemaId));
    return {
      expectedRecordRoot: fixture.expectedRecordRoot,
      expectedStatus: fixture.expectedStatus,
      expectedTerminal: fixture.expectedTerminal,
      fixtureId: fixture.fixtureId,
      fixtureSha256: fixture.sha256,
      observedRecordRoot: observed.observedRecordRoot,
      observedStatus: observed.status,
      observedTerminal: observed.terminal,
      schemaId: fixture.schemaId,
    };
  });
  const mismatchCount = outcomes.filter((row) => row.expectedRecordRoot !== row.observedRecordRoot || row.expectedStatus !== row.observedStatus || row.expectedTerminal !== row.observedTerminal).length;
  const body = {
    artifactClass: 'PRODUCER-ONLY; LOCAL-CANONICAL-ENGINE-REPORT; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE',
    claimLimit: 'SCHEMA-ORACLE-AND-CANONICAL-ROOT-AGREEMENT-ONLY; FINDING-CLOSURE-CREDIT-ZERO',
    engineId,
    fixtureCount: registry.fixtureCount,
    implementation,
    mismatchCount,
    outcomeRoot: rootV6('CANONICAL-ENGINE-OUTCOME-COLLECTION', REPORT_VERSION, outcomes),
    outcomes,
    registryRoot: registry.artifactRoot,
    schemaCount: registry.schemaCount,
    schemaVersion: REPORT_VERSION,
    sourceSha256,
    status: mismatchCount === 0 ? 'PASS-LOCAL-CANDIDATE-NOT-ACCEPTED' : 'BLOCKED-CANONICAL-DISAGREEMENT',
    toolchainRoot: registry.provenance.toolchainRoot,
  };
  return attachContentIdentity('TRD2V6-CANONICAL-REPORT', 'CANONICAL-ENGINE-REPORT', REPORT_VERSION, body);
}

export function validateCanonicalEngineReport(report, registry) {
  assertClosedObject(report, ['artifactClass', 'artifactId', 'artifactRoot', 'claimLimit', 'engineId', 'fixtureCount', 'implementation', 'mismatchCount', 'outcomeRoot', 'outcomes', 'registryRoot', 'schemaCount', 'schemaVersion', 'sourceSha256', 'status', 'toolchainRoot'], 'canonicalEngineReport');
  if (report.schemaVersion !== REPORT_VERSION || !['CANONICAL-ENGINE-A', 'CANONICAL-ENGINE-B'].includes(report.engineId)) throw new V6ValidationError('canonicalEngineReport: identity mismatch');
  validateContentIdentity(report, 'TRD2V6-CANONICAL-REPORT', 'CANONICAL-ENGINE-REPORT', REPORT_VERSION);
  if (report.registryRoot !== registry.artifactRoot || report.schemaCount !== registry.schemaCount || report.fixtureCount !== registry.fixtureCount || report.toolchainRoot !== registry.provenance.toolchainRoot || !SHA256_RE.test(report.sourceSha256)) throw new V6ValidationError('canonicalEngineReport: registry/provenance mismatch');
  if (!Array.isArray(report.outcomes) || report.outcomes.length !== registry.fixtures.length) throw new V6ValidationError('canonicalEngineReport: outcome denominator mismatch');
  report.outcomes.forEach((row, index) => assertClosedObject(row, ['expectedRecordRoot', 'expectedStatus', 'expectedTerminal', 'fixtureId', 'fixtureSha256', 'observedRecordRoot', 'observedStatus', 'observedTerminal', 'schemaId'], `canonicalEngineReport.outcomes[${index}]`));
  const schemaById = new Map(registry.schemas.map((schema) => [schema.schemaId, schema]));
  const mismatchCount = report.outcomes.filter((row, index) => {
    const fixture = registry.fixtures[index];
    const observed = executeSchemaFixture(fixture, schemaById.get(fixture.schemaId));
    if (row.fixtureId !== fixture.fixtureId || row.fixtureSha256 !== fixture.sha256 || row.schemaId !== fixture.schemaId || row.expectedRecordRoot !== fixture.expectedRecordRoot || row.expectedStatus !== fixture.expectedStatus || row.expectedTerminal !== fixture.expectedTerminal || row.observedRecordRoot !== observed.observedRecordRoot || row.observedStatus !== observed.status || row.observedTerminal !== observed.terminal) throw new V6ValidationError(`canonicalEngineReport: outcome binding mismatch at ${index}`);
    return row.expectedRecordRoot !== row.observedRecordRoot || row.expectedStatus !== row.observedStatus || row.expectedTerminal !== row.observedTerminal;
  }).length;
  if (rootV6('CANONICAL-ENGINE-OUTCOME-COLLECTION', REPORT_VERSION, report.outcomes) !== report.outcomeRoot || report.mismatchCount !== mismatchCount || report.status !== (mismatchCount === 0 ? 'PASS-LOCAL-CANDIDATE-NOT-ACCEPTED' : 'BLOCKED-CANONICAL-DISAGREEMENT')) throw new V6ValidationError('canonicalEngineReport: root/status mismatch');
  return report;
}
