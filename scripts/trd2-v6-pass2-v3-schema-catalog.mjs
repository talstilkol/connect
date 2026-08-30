const SAFE_MAX = Number.MAX_SAFE_INTEGER;

export const v3Spec = Object.freeze({
  array: (items, minItems = 0, maxItems = 65535, unique = false, sorted = false) => ({ items, kind: 'Array', maxItems, minItems, sorted, unique }),
  boolean: () => ({ kind: 'Boolean' }),
  bytes32: () => ({ kind: 'Bytes32LowerHex' }),
  commit: () => ({ kind: 'CommitHex' }),
  constant: (value) => ({ kind: 'Const', value }),
  contentId: (prefix) => ({ kind: 'ContentId', prefix }),
  enumeration: (...values) => ({ kind: 'Enum', values }),
  logicalPath: () => ({ kind: 'LogicalPath' }),
  nullable: (inner) => ({ inner, kind: 'Nullable' }),
  object: (properties, required = Object.keys(properties)) => ({ additionalProperties: false, kind: 'Object', properties, required: [...required].sort() }),
  oneOf: (...variants) => ({ kind: 'OneOf', variants }),
  reference: (schemaId) => ({ kind: 'Ref', schemaId }),
  string: (minBytes = 0, maxBytes = 8192) => ({ kind: 'String', maxBytes, minBytes }),
  uint: (minimum = 0, maximum = SAFE_MAX) => ({ kind: 'UIntSafe', maximum, minimum }),
});

const s = v3Spec;
const schemaId = (family) => `CONNECT-TRD2-V6-${family}-SCHEMA`;
const ref = (family) => s.reference(schemaId(family));
const roots = (minimum = 0, maximum = 65535) => s.array(s.bytes32(), minimum, maximum, true, true);
const ids = (minimum = 0, maximum = 65535) => s.array(s.string(1, 256), minimum, maximum, true, true);
const countInvariant = (arrayField, numberField) => ({ arrayField, kind: 'ARRAY-LENGTH-EQUALS-FIELD', numberField });
const notEqualInvariant = (left, right) => ({ kind: 'NOT-EQUAL-FIELDS', left, right });
const lteInvariant = (left, right) => ({ kind: 'LTE-FIELDS', left, right });
const subsetInvariant = (subsetField, supersetField) => ({ kind: 'SUBSET-ARRAY', subsetField, supersetField });

function define(family, properties, invariants = [], { topLevel = false, source = 'PASS-3-TO-6-OR-EXTERNAL-CONSTRUCTION' } = {}) {
  const idKey = topLevel ? 'artifactId' : 'recordId';
  const rootKey = topLevel ? 'artifactRoot' : 'recordRoot';
  const prefix = `TRD2V6-${family}`;
  const schemaVersion = `CONNECT-TRD2-V6-${family}`;
  const rootSpec = s.object({
    ...properties,
    [idKey]: s.contentId(prefix),
    recordKind: s.constant(family),
    [rootKey]: s.bytes32(),
    schemaVersion: s.constant(schemaVersion),
  });
  return {
    contentIdentity: {
      bodyPath: null,
      idKey,
      mode: 'EXCLUDE-IDENTITY-KEYS',
      prefix,
      rootKey,
      schemaVersion,
      typeTag: family,
    },
    family,
    invariants,
    rootSpec,
    schemaId: schemaId(family),
    source,
  };
}

export const TRD2_V6_PASS2_V3_FUTURE_DEFINITIONS = Object.freeze([
  define('CURRENT-STATE-V3', {
    acceptedRequirements: s.constant(0), definitionAcceptance: s.constant('ABSENT'), developmentFreeze: s.constant('ACTIVE'),
    findingClosure: s.constant('0/15'), gate29: s.constant('BLOCKED'), reconciliation: s.constant('ABSENT'), reviewGenerations: s.constant('0/2'),
  }),
  define('SOURCE-PROVENANCE-V3', {
    byteLength: s.uint(1), logicalPath: s.logicalPath(), observedCommit: s.commit(), sha256: s.bytes32(), sourceRole: s.string(1, 128),
  }),
  define('SUBJECT-V3', {
    claimLimit: s.constant('LOCAL-CANDIDATE-NOT-ACCEPTED'), currentState: ref('CURRENT-STATE-V3'),
    pass1ParserCorpusRoot: s.bytes32(), pass1SourceCaptureRoot: s.bytes32(), pass2SchemaRegistryRoot: s.bytes32(),
    provenance: s.array(ref('SOURCE-PROVENANCE-V3'), 1, 64), repositoryVisibility: s.constant('PUBLIC'),
    requirementBindingCount: s.uint(128, 128), requirementBindings: s.array(s.reference('CONNECT-TRD2-V6-REQUIREMENT-SOURCE-BINDING-V2-SCHEMA-V2'), 128, 128),
    requirementCollectionRoot: s.bytes32(), requirementCount: s.uint(128, 128),
    requirements: s.array(s.reference('CONNECT-TRD2-V6-REQUIREMENT-V2-SCHEMA-V2'), 128, 128),
  }, [countInvariant('requirements', 'requirementCount'), countInvariant('requirementBindings', 'requirementBindingCount')], { topLevel: true }),

  define('OPERATOR-DEFINITION-V3', {
    argumentTypes: ids(1, 16), operator: s.string(1, 128), resultType: s.string(1, 64), semantics: s.string(1, 4096), unknownArgumentTerminal: s.string(1, 128),
  }),
  define('CLAUSE-NODE-V3', {
    argumentRoots: roots(0, 64), clauseIndex: s.uint(0, 1024), expectedResult: s.string(0, 4096), failureTerminal: s.string(1, 128), opcode: s.string(1, 128), operandType: s.string(1, 64), operandValue: s.string(0, 16384),
  }),
  define('COUNTEREXAMPLE-OBLIGATION-V3', {
    clauseRoot: s.bytes32(), expectedTerminal: s.string(1, 128), mode: s.enumeration('NEGATIVE', 'FAILURE', 'CONCURRENCY', 'RECOVERY'), requirementRoot: s.bytes32(), status: s.constant('PENDING-PASS-5'), vectorId: s.string(1, 256),
  }),
  define('CLAUSE-AST-PROGRAM-V3', {
    clauseCount: s.uint(1, 1024), clauseRoots: roots(1, 1024), counterexampleCount: s.uint(1, 1024), counterexampleRoots: roots(1, 1024),
    dependencyRequirementIds: ids(0, 128), exactStatementSha256: s.bytes32(), failureTerminal: s.string(1, 128),
    noSharedReceiptCredit: s.constant(true), passRule: s.constant('ALL-CLAUSES-PASS'), predecessorSemanticProgramRoot: s.bytes32(),
    predicateId: s.string(1, 128), requirementId: s.string(1, 128), requirementRoot: s.bytes32(), resultId: s.string(1, 128), resultType: s.string(1, 128),
    semanticExecutionState: s.constant('COMPILED-LOSSLESS-NOT-YET-EXECUTED'), sourceBindingDigest: s.bytes32(), vectorIds: ids(5, 5),
  }, [countInvariant('clauseRoots', 'clauseCount'), countInvariant('counterexampleRoots', 'counterexampleCount')]),
  define('CLAUSE-AST-REGISTRY-V3', {
    claimLimit: s.constant('LOSSLESS-TYPED-COMPILATION-NOT-SEMANTIC-ACCEPTANCE'), operatorCount: s.uint(1, 256), operatorDefinitions: s.array(ref('OPERATOR-DEFINITION-V3'), 1, 256),
    operatorRegistryRoot: s.bytes32(), programCollectionRoot: s.bytes32(), programCount: s.uint(128, 128), programs: s.array(ref('CLAUSE-AST-PROGRAM-V3'), 128, 128),
    requirementCollectionRoot: s.bytes32(), unknownOpcodeTerminal: s.constant('CLAUSE-AST-UNKNOWN-OPCODE'),
  }, [countInvariant('operatorDefinitions', 'operatorCount'), countInvariant('programs', 'programCount')], { topLevel: true }),

  define('GUARD-CONDITION-V3', {
    expectedBoolean: s.nullable(s.boolean()), expectedRoot: s.nullable(s.bytes32()), expectedString: s.nullable(s.string(0, 512)), field: s.string(1, 256), operator: s.enumeration('BOOLEAN-EQUAL', 'ROOT-EQUAL', 'STRING-EQUAL', 'ACTOR-NOT-EQUAL', 'SET-SUBSET', 'COUNT-EQUAL', 'TIME-WITHIN', 'ALWAYS-FALSE'),
  }),
  define('GUARD-PROFILE-V3', {
    conditionCount: s.uint(1, 64), conditions: s.array(ref('GUARD-CONDITION-V3'), 1, 64), failureTerminal: s.string(1, 128), guardProfileId: s.string(1, 128), passRule: s.constant('ALL-CONDITIONS-PASS'),
  }, [countInvariant('conditions', 'conditionCount')]),
  define('STATE-TRANSITION-V3', {
    disposition: s.enumeration('ALLOW', 'BLOCK'), durableEffectClass: s.enumeration('NONE', 'ATOMIC-LOCAL', 'PROVIDER-PREPARE', 'PROVIDER-FINALIZE', 'AUDIT-ONLY'),
    event: s.string(1, 128), fromState: s.string(1, 128), guardProfileRoot: s.bytes32(), safeTerminal: s.string(1, 128), toState: s.string(1, 128), transitionKey: s.string(1, 384),
  }),
  define('STATE-MACHINE-APPLICATION-V3', {
    applicationId: s.string(1, 256), currentState: s.string(1, 128), sourceBasisRoot: s.bytes32(), targetRoot: s.nullable(s.bytes32()),
  }),
  define('IDENTITY-CONSTRUCTOR-V3', {
    excludedKeys: ids(1, 16), idKey: s.string(1, 128), rootKey: s.string(1, 128), schemaVersion: s.string(1, 256), typeTag: s.string(1, 256),
  }),
  define('STATE-MACHINE-V3', {
    applicationCount: s.uint(1, 4096), applications: s.array(ref('STATE-MACHINE-APPLICATION-V3'), 1, 4096), defaultPolicy: s.constant('EXPLICIT-ROW-ONLY'),
    eventCount: s.uint(1, 128), events: ids(1, 128), expandedTransitionCount: s.uint(1), family: s.enumeration('REVIEW', 'MISSING-VALUE', 'DATA-LIFECYCLE', 'RETENTION', 'BACKUP-RESTORE', 'PUBLIC-FLOW', 'SEVERITY'),
    machineId: s.string(1, 256), stateCount: s.uint(1, 128), states: ids(1, 128), transitionCount: s.uint(1, 65535), transitions: s.array(ref('STATE-TRANSITION-V3'), 1, 65535),
  }, [countInvariant('applications', 'applicationCount'), countInvariant('events', 'eventCount'), countInvariant('states', 'stateCount'), countInvariant('transitions', 'transitionCount')]),
  define('STATE-MACHINE-REGISTRY-V3', {
    familyCount: s.uint(7, 7), guardProfileCount: s.uint(1, 512), guardProfiles: s.array(ref('GUARD-PROFILE-V3'), 1, 512),
    guardProfileRoot: s.bytes32(), identityConstructorCount: s.uint(1, 32), identityConstructors: s.array(ref('IDENTITY-CONSTRUCTOR-V3'), 1, 32),
    machineCollectionRoot: s.bytes32(), machineCount: s.uint(7, 4096), machines: s.array(ref('STATE-MACHINE-V3'), 7, 4096),
    totalExpandedTransitionCount: s.uint(1), totalTransitionCount: s.uint(1), unknownTransitionTerminal: s.constant('UNDECLARED-TRANSITION-BLOCKED'),
  }, [countInvariant('guardProfiles', 'guardProfileCount'), countInvariant('identityConstructors', 'identityConstructorCount'), countInvariant('machines', 'machineCount')], { topLevel: true }),

  define('GRAPH-NODE-V3', {
    boundRoot: s.bytes32(), family: s.string(1, 128), nodeKey: s.string(1, 384), producerMode: s.enumeration('SOLE', 'EXTERNAL', 'COLLECTION'), status: s.enumeration('DECLARED', 'PRODUCED', 'BLOCKED', 'INVALIDATED'),
  }),
  define('GRAPH-EDGE-V3', {
    edgeKey: s.string(1, 768), edgeType: s.enumeration('PRODUCES', 'CONSUMES', 'INVALIDATES', 'FAILS-TO', 'BLOCKS-AT', 'SUPERSEDES', 'BINDS-EXACTLY'), fromNodeRoot: s.bytes32(), qualifier: s.string(1, 512), toNodeRoot: s.bytes32(),
  }, [notEqualInvariant('fromNodeRoot', 'toNodeRoot')]),
  define('CAUSAL-GRAPH-V3', {
    edgeCollectionRoot: s.bytes32(), edgeCount: s.uint(1), edges: s.array(ref('GRAPH-EDGE-V3'), 1, 1000000), expectedFamilyCount: s.uint(1, 512), expectedFamilies: ids(1, 512),
    nodeCollectionRoot: s.bytes32(), nodeCount: s.uint(1), nodes: s.array(ref('GRAPH-NODE-V3'), 1, 1000000), omittedFamilies: ids(0, 512), typedGraphRoot: s.bytes32(), umbrellaEdgesCountTowardCausality: s.constant(false),
  }, [countInvariant('edges', 'edgeCount'), countInvariant('expectedFamilies', 'expectedFamilyCount'), countInvariant('nodes', 'nodeCount')], { topLevel: true }),
  define('ROOT-OVERLAY-V3', {
    bindingRoot: s.bytes32(), graphRoot: s.bytes32(), packetRoot: s.bytes32(), preReviewHead: s.bytes32(), schemaRegistryRoot: s.bytes32(), subjectRoot: s.bytes32(), successorHead: s.bytes32(), vectorCorpusRoot: s.bytes32(),
  }, [notEqualInvariant('preReviewHead', 'successorHead')]),
  define('INVALIDATION-RULE-V3', {
    dependencyRoot: s.bytes32(), excludedSelfHead: s.nullable(s.bytes32()), invalidatingEvents: ids(1, 16), safeTerminal: s.string(1, 128), trackedHeadRoot: s.bytes32(),
  }),
  define('ROOT-OVERLAY-REGISTRY-V3', {
    invalidationRuleCount: s.uint(1), invalidationRules: s.array(ref('INVALIDATION-RULE-V3'), 1, 1000000), overlayCount: s.uint(1), overlays: s.array(ref('ROOT-OVERLAY-V3'), 1, 1000000), overlayRoot: s.bytes32(), ruleCollectionRoot: s.bytes32(), selfInvalidationAllowed: s.constant(false),
  }, [countInvariant('invalidationRules', 'invalidationRuleCount'), countInvariant('overlays', 'overlayCount')], { topLevel: true }),

  define('PORTABLE-FIXTURE-V3', {
    byteLength: s.uint(1), bytesBase64: s.string(1, 10485760), captureSha256: s.bytes32(), logicalPath: s.logicalPath(), sha256: s.bytes32(), targetRoot: s.bytes32(),
  }),
  define('OPERATION-V3', {
    expectedHead: s.bytes32(), fence: s.uint(1), idempotencyKeyRoot: s.bytes32(), inputRoots: roots(1, 128), opcode: s.string(1, 128), targetRoot: s.bytes32(),
  }),
  define('EXPECTED-ORACLE-V3', {
    expectedEffectRoots: roots(0, 256), expectedPostStateRoot: s.bytes32(), expectedRecoveryRoot: s.bytes32(), expectedTerminal: s.string(1, 128), readbackRoots: roots(1, 8),
  }),
  define('EXECUTABLE-VECTOR-V3', {
    fixtureRoot: s.bytes32(), mode: s.enumeration('POSITIVE', 'NEGATIVE', 'FAILURE', 'CONCURRENCY', 'RECOVERY-PRE-COMMIT', 'RECOVERY-POST-COMMIT'), operationRoot: s.bytes32(), oracleRoot: s.bytes32(), targetRoot: s.bytes32(), vectorId: s.string(1, 256),
  }),
  define('VECTOR-OUTCOME-V3', {
    observedEffectRoots: roots(0, 256), observedPostStateRoot: s.bytes32(), observedRecoveryRoot: s.bytes32(), observedTerminal: s.string(1, 128), runnerId: s.string(1, 128), vectorRoot: s.bytes32(),
  }),
  define('VECTOR-CORPUS-V3', {
    fixtureCollectionRoot: s.bytes32(), fixtureCount: s.uint(1), fixtures: s.array(ref('PORTABLE-FIXTURE-V3'), 1, 1000000), operationCollectionRoot: s.bytes32(), operationCount: s.uint(1), operations: s.array(ref('OPERATION-V3'), 1, 1000000),
    oracleCollectionRoot: s.bytes32(), oracleCount: s.uint(1), oracles: s.array(ref('EXPECTED-ORACLE-V3'), 1, 1000000), targetCount: s.uint(1), targetRoots: roots(1, 1000000), vectorCollectionRoot: s.bytes32(), vectorCount: s.uint(1), vectors: s.array(ref('EXECUTABLE-VECTOR-V3'), 1, 1000000),
  }, [countInvariant('fixtures', 'fixtureCount'), countInvariant('operations', 'operationCount'), countInvariant('oracles', 'oracleCount'), countInvariant('targetRoots', 'targetCount'), countInvariant('vectors', 'vectorCount')], { topLevel: true }),

  define('PACKAGE-MEMBER-V3', {
    byteLength: s.uint(1), contentRoot: s.bytes32(), logicalPath: s.logicalPath(), memberClass: s.enumeration('NORMATIVE', 'PRODUCER', 'EXTERNAL'), sha256: s.bytes32(),
  }),
  define('FINDING-CLOSURE-ROW-V3', {
    accepted: s.boolean(), closureCredit: s.uint(0, 1), disposition: s.enumeration('OPEN', 'CLOSED', 'REJECTED'), evidenceRoots: roots(1, 128), findingId: s.string(1, 128), noMergeKey: s.string(1, 128), remediationRequirementRoot: s.bytes32(), severity: s.enumeration('P0', 'P1', 'P2', 'P3'),
  }),
  define('DETACHED-ACCEPTANCE-PACKET-V3', {
    claimState: s.constant('NOT-ACCEPTED'), futureResultCount: s.constant(0), memberCount: s.uint(1, 128), memberRoots: roots(1, 128), packageRoot: s.bytes32(), preReviewHead: s.bytes32(),
  }, [countInvariant('memberRoots', 'memberCount')], { topLevel: true }),
  define('FINDING-CLOSURE-CROSSWALK-V3', {
    acceptedCount: s.constant(0), closureCollectionRoot: s.bytes32(), findingCount: s.uint(15, 15), findings: s.array(ref('FINDING-CLOSURE-ROW-V3'), 15, 15),
  }, [countInvariant('findings', 'findingCount')], { topLevel: true }),
  define('ATOMIC-PACKAGE-MANIFEST-V3', {
    assemblyState: s.enumeration('CANDIDATE', 'SEALED', 'SUPERSEDED'), manifestSelfReferenceCount: s.constant(0), memberCount: s.uint(1, 128), members: s.array(ref('PACKAGE-MEMBER-V3'), 1, 128), packageRoot: s.bytes32(),
  }, [countInvariant('members', 'memberCount')], { topLevel: true }),
  define('PRODUCER-QA-V3', {
    acceptanceCredit: s.constant(0), checkCount: s.uint(1, 4096), checkRoots: roots(1, 4096), failureCount: s.uint(0), packageRoot: s.bytes32(), status: s.enumeration('PASS-LOCAL', 'BLOCKED'),
  }, [countInvariant('checkRoots', 'checkCount')], { topLevel: true }),
  define('GRAPH-REPORT-V3', {
    edgeCount: s.uint(1), engineId: s.string(1, 128), failureCount: s.uint(0), graphRoot: s.bytes32(), mutationCount: s.uint(1), nodeCount: s.uint(1), outcomeRoot: s.bytes32(), sourceSha256: s.bytes32(), status: s.enumeration('PASS', 'BLOCKED'),
  }, [], { topLevel: true }),
  define('VECTOR-RUNNER-REPORT-V3', {
    disagreementCount: s.uint(0), outcomeCount: s.uint(1), outcomeRoot: s.bytes32(), outcomes: s.array(ref('VECTOR-OUTCOME-V3'), 1, 1000000), runnerId: s.string(1, 128), sourceSha256: s.bytes32(), status: s.enumeration('PASS', 'BLOCKED'), vectorCorpusRoot: s.bytes32(),
  }, [countInvariant('outcomes', 'outcomeCount')], { topLevel: true }),

  define('REVIEWER-APPOINTMENT-V3', {
    controllerRoot: s.bytes32(), expiresAt: s.uint(1), issuedAt: s.uint(1), oneUse: s.constant(true), reviewerIdentityRoot: s.bytes32(), revocationHead: s.bytes32(), role: s.enumeration('REVIEWER', 'RECONCILER', 'ACCEPTOR'), scopeRoots: roots(1, 128), state: s.enumeration('ACTIVE', 'USED', 'REVOKED', 'EXPIRED'),
  }, [lteInvariant('issuedAt', 'expiresAt')]),
  define('REVIEWER-APPOINTMENT-SET-V3', {
    appointmentCount: s.uint(4), appointments: s.array(ref('REVIEWER-APPOINTMENT-V3'), 4, 64), appointmentSetRoot: s.bytes32(), controllerRoot: s.bytes32(),
  }, [countInvariant('appointments', 'appointmentCount')], { topLevel: true }),
  define('REVIEW-AUTHORITY-V3', {
    actorRoot: s.bytes32(), appointmentRoot: s.bytes32(), controllerRoot: s.bytes32(), expectedAppointmentHead: s.bytes32(), fence: s.uint(1), role: s.enumeration('REVIEWER', 'RECONCILER', 'ACCEPTOR'), state: s.enumeration('ELIGIBLE', 'REVOKED', 'EXPIRED', 'USED'), trustedTimeRoot: s.bytes32(),
  }),
  define('EVIDENCE-CUSTODY-RECEIPT-V3', {
    classificationRoot: s.bytes32(), contentSha256: s.bytes32(), custodianRoot: s.bytes32(), evidenceClass: s.enumeration('PUBLIC', 'PRIVATE-RECEIPT', 'DISCLOSURE-SAFE'), expiresAt: s.uint(1), privateBytesEmbedded: s.constant(false), verifiedAt: s.uint(1), verifierResult: s.enumeration('PASS', 'BLOCKED', 'REJECTED'),
  }, [lteInvariant('verifiedAt', 'expiresAt')], { topLevel: true }),
  define('FINDING-V3', {
    evidenceRoots: roots(1, 128), findingId: s.string(1, 128), noMergeKey: s.string(1, 128), remediationRoot: s.bytes32(), safeTerminal: s.string(1, 128), severity: s.enumeration('P0', 'P1', 'P2', 'P3'), state: s.enumeration('OPEN', 'CLOSED', 'REJECTED'),
  }),
  define('INDEPENDENT-REVIEW-V3', {
    appointmentRoot: s.bytes32(), evidenceCustodyRoot: s.bytes32(), findingCount: s.uint(1, 1024), findings: s.array(ref('FINDING-V3'), 1, 1024), reviewerRoot: s.bytes32(), selfReview: s.constant(false), subjectRoot: s.bytes32(), verdict: s.enumeration('ACCEPT', 'REJECT', 'BLOCKED'),
  }, [countInvariant('findings', 'findingCount')], { topLevel: true }),
  define('REVIEW-GENERATION-V3', {
    appointmentRoot: s.bytes32(), committedHead: s.bytes32(), generationName: s.enumeration('A', 'B'), inputHead: s.bytes32(), reviewRoot: s.bytes32(), reviewerRoot: s.bytes32(), state: s.enumeration('PENDING', 'COMMITTED', 'REVOKED'), subjectRoot: s.bytes32(),
  }, [notEqualInvariant('inputHead', 'committedHead')], { topLevel: true }),
  define('RECONCILIATION-V3', {
    findingCount: s.uint(1, 1024), findingDispositionRoots: roots(1, 1024), generationARoot: s.bytes32(), generationBRoot: s.bytes32(), lossless: s.constant(true), reconcilerAppointmentRoot: s.bytes32(), state: s.enumeration('PENDING', 'COMMITTED', 'BLOCKED'), unresolvedCount: s.uint(0, 1024),
  }, [notEqualInvariant('generationARoot', 'generationBRoot'), countInvariant('findingDispositionRoots', 'findingCount')], { topLevel: true }),
  define('DEFINITION-ACCEPTANCE-V3', {
    acceptanceAuthorityRoot: s.bytes32(), acceptedRequirementCount: s.uint(128, 128), committedHead: s.bytes32(), findingDispositionRoot: s.bytes32(), generationARoot: s.bytes32(), generationBRoot: s.bytes32(), openP0P1Count: s.constant(0), packageRoot: s.bytes32(), reconciliationRoot: s.bytes32(), state: s.enumeration('PENDING', 'ACCEPTED', 'REJECTED'),
  }, [notEqualInvariant('generationARoot', 'generationBRoot')], { topLevel: true }),
  define('APPEAL-V3', {
    appellantRoot: s.bytes32(), authorityRoot: s.bytes32(), expectedHead: s.bytes32(), reasonRoot: s.bytes32(), state: s.enumeration('PENDING', 'UPHELD', 'DENIED', 'EXPIRED'), submittedAt: s.uint(1), targetRoot: s.bytes32(),
  }),
  define('REVOCATION-V3', {
    controllerRoot: s.bytes32(), effectiveAt: s.uint(1), expectedHead: s.bytes32(), reasonCode: s.enumeration('COMPROMISE', 'ROLE-END', 'SUPERSEDED'), state: s.constant('REVOKED'), successorHead: s.bytes32(), targetAuthorityRoot: s.bytes32(),
  }, [notEqualInvariant('expectedHead', 'successorHead')]),
  define('EXPIRY-V3', {
    observedAt: s.uint(1), targetRoot: s.bytes32(), terminal: s.constant('AUTHORITY-EXPIRED'), trustedTimeRoot: s.bytes32(), validFrom: s.uint(1), validUntil: s.uint(1),
  }, [lteInvariant('validFrom', 'validUntil'), lteInvariant('validUntil', 'observedAt')]),

  define('LIFECYCLE-EVENT-V3', {
    activeRecord: s.boolean(), appointmentRoot: s.bytes32(), authorityRoot: s.bytes32(), dataClassId: s.string(1, 128), event: s.string(1, 128), expectedHead: s.bytes32(), fence: s.uint(1), legalHoldActive: s.boolean(), providerStoreRoot: s.bytes32(), trustedTimeRoot: s.bytes32(),
  }),
  define('LIFECYCLE-RECEIPT-V3', {
    eventRoot: s.bytes32(), fromState: s.string(1, 128), postReadbackRoot: s.bytes32(), preStateRoot: s.bytes32(), terminal: s.string(1, 128), toState: s.string(1, 128), transitionRoot: s.bytes32(),
  }),
  define('RETENTION-PLAN-V3', {
    appointmentRoot: s.bytes32(), authorityRoot: s.bytes32(), candidateIdentityRoots: roots(1, 1000000), cutoffInclusive: s.uint(1), dataClassId: s.string(1, 128), excludedActiveRoots: roots(0, 1000000), excludedHoldRoots: roots(0, 1000000), expectedLifecycleHead: s.bytes32(), expectedPolicyHead: s.bytes32(), expiresAt: s.uint(1), fence: s.uint(1), issuedAt: s.uint(1), planDigest: s.bytes32(), policyVersion: s.string(1, 128), providerAuthorizedRoots: roots(1, 1000000), providerConfirmedRoots: roots(1, 1000000),
  }, [lteInvariant('issuedAt', 'expiresAt'), subsetInvariant('providerConfirmedRoots', 'providerAuthorizedRoots')]),
  define('RETENTION-DELETE-RECEIPT-V3', {
    auditReadbackRoot: s.bytes32(), candidateIdentityRoots: roots(1, 1000000), commitReceiptRoot: s.bytes32(), expectedHead: s.bytes32(), fence: s.uint(1), planDigest: s.bytes32(), planRoot: s.bytes32(), prepareReceiptRoots: roots(1, 1024), providerConfirmedRoots: roots(1, 1000000), providerOutcomeRoots: roots(1, 1024), terminal: s.enumeration('COMMITTED', 'RETENTION-DELETE-BLOCKED', 'RETENTION-DELETE-PARTIAL-RECONCILIATION-REQUIRED', 'RETENTION-DELETE-UNKNOWN-RECONCILIATION-REQUIRED'),
  }, [subsetInvariant('providerConfirmedRoots', 'candidateIdentityRoots')]),
  define('BACKUP-EVIDENCE-V3', {
    authorityRoot: s.bytes32(), capturedAt: s.uint(1), databaseSnapshotDigest: s.bytes32(), encryptionKeyVersionRoot: s.bytes32(), objectManifestDigest: s.bytes32(), objectMemberDigestRoots: roots(1, 1000000), providerReceiptRoots: roots(1, 1024), r2ConsistencyProofRoot: s.bytes32(), r2InventoryDigest: s.bytes32(), retentionWindowEnd: s.uint(1), retentionWindowStart: s.uint(1), sourceCohortRoot: s.bytes32(), windowObservationReceiptRoots: roots(2, 16),
  }, [lteInvariant('retentionWindowStart', 'retentionWindowEnd')]),
  define('RESTORE-EVIDENCE-V3', {
    activationReceiptRoot: s.bytes32(), authorityRoot: s.bytes32(), backupEvidenceRoot: s.bytes32(), backupIdRoot: s.bytes32(), databaseSnapshotDigest: s.bytes32(), newRestoreIdentityRoot: s.bytes32(), objectManifestDigest: s.bytes32(), priorPrivacyObligationRoots: roots(0, 1000000), privacyReplayReceiptRoot: s.bytes32(), quarantineHead: s.bytes32(), r2ConsistencyProofRoot: s.bytes32(), redeletionReceiptRoots: roots(0, 1000000), retentionWindowProofRoot: s.bytes32(), sourceIdentityRoot: s.bytes32(),
  }, [notEqualInvariant('newRestoreIdentityRoot', 'sourceIdentityRoot')]),
  define('SEVERITY-EVENT-V3', {
    appointmentRoot: s.bytes32(), authorityRoot: s.bytes32(), commitIndex: s.uint(1), envelopeId: s.string(1, 128), evaluatorRoot: s.bytes32(), expectedHead: s.bytes32(), fence: s.uint(1), newSeverity: s.enumeration('P0', 'P1', 'P2', 'P3'), priorSeverity: s.nullable(s.enumeration('P0', 'P1', 'P2', 'P3')), priorVersion: s.nullable(s.uint(0)), reasonCode: s.string(1, 128), triggerEvidenceRoot: s.bytes32(), triggerPredicateRoot: s.bytes32(), trustedTimeRoot: s.bytes32(),
  }),
  define('PUBLIC-FLOW-EVIDENCE-V3', {
    classification: s.enumeration('PUBLIC', 'PRIVATE', 'SECRET', 'PII', 'BUSINESS', 'PRIVATE-EVIDENCE'), controlId: s.string(1, 128), disclosureSafeEvidenceRoot: s.bytes32(), observedFlowCount: s.uint(0), sinkRoot: s.bytes32(), sourceRoot: s.bytes32(), terminal: s.string(1, 128),
  }),
  define('MISSING-VALUE-RECEIPT-V3', {
    actorRoot: s.bytes32(), authorityRoot: s.bytes32(), expectedHead: s.bytes32(), fence: s.uint(1), fromState: s.string(1, 128), missingValueId: s.string(1, 128), postReadbackRoot: s.bytes32(), terminal: s.string(1, 128), toState: s.string(1, 128), trustedTimeRoot: s.bytes32(),
  }),
  define('REVIEW-OPERATION-RECEIPT-V3', {
    actorRoots: roots(2, 16), appointmentRoot: s.bytes32(), committedHead: s.bytes32(), custodyRoot: s.bytes32(), expectedHead: s.bytes32(), fence: s.uint(1), operation: s.enumeration('GENERATION-SEAL', 'RECONCILE', 'DEFINITION-ACCEPT', 'APPEAL', 'REVOKE', 'EXPIRE', 'CUSTODY-TRANSFER'), postReadbackRoots: roots(2, 2), trustedTimeRoot: s.bytes32(),
  }),
]);

export const TRD2_V6_PASS2_V3_FUTURE_SCHEMA_IDS = Object.freeze(TRD2_V6_PASS2_V3_FUTURE_DEFINITIONS.map(({ schemaId: value }) => value));

export const TRD2_V6_PASS2_V3_OUTPUT_SCHEMA_FAMILIES = Object.freeze({
  'subject.json': 'SUBJECT-V3',
  'clause-ast-registry.json': 'CLAUSE-AST-REGISTRY-V3',
  'causal-graph.json': 'CAUSAL-GRAPH-V3',
  'state-machine-registry.json': 'STATE-MACHINE-REGISTRY-V3',
  'executable-vector-corpus.json': 'VECTOR-CORPUS-V3',
  'raw-root-overlay-and-invalidation.json': 'ROOT-OVERLAY-REGISTRY-V3',
  'detached-acceptance-packet.json': 'DETACHED-ACCEPTANCE-PACKET-V3',
  'finding-closure-crosswalk.json': 'FINDING-CLOSURE-CROSSWALK-V3',
  'atomic-package-manifest.json': 'ATOMIC-PACKAGE-MANIFEST-V3',
  'graph-engine-a-report.json': 'GRAPH-REPORT-V3',
  'graph-engine-b-report.json': 'GRAPH-REPORT-V3',
  'vector-runner-a-report.json': 'VECTOR-RUNNER-REPORT-V3',
  'vector-runner-b-report.json': 'VECTOR-RUNNER-REPORT-V3',
  'producer-qa.json': 'PRODUCER-QA-V3',
  'reviewer-appointment-set.json': 'REVIEWER-APPOINTMENT-SET-V3',
  'evidence-custody-receipt.json': 'EVIDENCE-CUSTODY-RECEIPT-V3',
  'fresh-independent-hostile-review.json': 'INDEPENDENT-REVIEW-V3',
  'review-generation-a.json': 'REVIEW-GENERATION-V3',
  'review-generation-b.json': 'REVIEW-GENERATION-V3',
  'review-reconciliation.json': 'RECONCILIATION-V3',
  'definition-acceptance.json': 'DEFINITION-ACCEPTANCE-V3',
});
