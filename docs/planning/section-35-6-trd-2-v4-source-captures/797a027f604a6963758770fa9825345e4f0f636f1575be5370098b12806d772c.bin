# 1. Connect — Section 35.6 TRD-2 v3 lossless closure requirements

## 1.1 זהות, מקורות וגבול סמכות

1.1.1 `artifactId=CONNECT-SECTION-35-6-TRD-2-V3-LOSSLESS-CLOSURE-REQUIREMENTS-2026-08-29-V1`.

1.1.2 artifactClass=`PLANNING-ONLY; SUCCESSOR-REQUIREMENTS-CANDIDATE; NOT-DEFINITION; NOT-ACCEPTANCE; NOT-GATE-CREDIT`.

1.1.3 immutable v2 Subject path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v2-review-closure-requirements-2026-08-29.md`; exact raw SHA-256=`7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d`.

1.1.4 independent hostile-review path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v2-review-closure-requirements-independent-hostile-review-2026-08-29.md`; exact raw SHA-256=`fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b`.

1.1.5 independent findings-manifest path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v2-review-closure-requirements-independent-hostile-review-findings-manifest-2026-08-29.md`; exact raw SHA-256=`7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9`.

1.1.6 inherited-v2 byte manifest path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v3-inherited-v2-requirement-byte-manifest-2026-08-29.md`; exact raw SHA-256=`8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec`.

1.1.7 lossless SourceObservationEnvelope manifest path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v3-lossless-source-observation-envelope-manifest-2026-08-29.md`; exact raw SHA-256=`392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3`.

1.1.8 closure-control registries path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v3-closure-control-registries-2026-08-29.md`; exact raw SHA-256=`caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de`.

1.1.9 Public repository intent=`BINDING-PUBLIC`; Private visibility remediation=`FORBIDDEN`; Product/Git/Build/Push/Merge/Release/Deploy/Provider action=`OUT-OF-SCOPE-AND-NOT-AUTHORIZED`.

## 1.2 Non-self authority and lifecycle boundary

1.2.1 Candidate bytes אינם AuthorityEnvelope, FreezeReceipt, ReviewEnvelope, StatusSnapshot, AcceptanceEnvelope, InvalidationRecord או Current pointer.

1.2.2 exact Candidate root ייקבע רק לאחר השלמת bytes אלה. לאחר מכן בלבד רשאי גורם בעל סמכות קודמת ליצור FreezeReceipt חיצוני הקשור ל־Candidate root; אין להוסיף Root זה חזרה ל־Candidate ואין fixed point.

1.2.3 accepted Protocol root, accepted Source-universe root, reviewer appointments, evaluator/runner roots, two review generations ו־Definition Acceptance הם external prerequisites. ערכיהם אינם מומצאים במסמך זה.

1.2.4 Mutable lifecycle state נשמר רק ב־detached artifacts לפי Control Registries §6.1. טקסט Candidate זה מכיל invariants ודרישות בלבד.

# 2. Requirement schema and no-loss rules

## 2.1 Exact five-field contract

2.1.1 כל Requirement להלן מכיל בדיוק ובסדר את חמשת השדות: `statement`, `defectCauseImpact`, `proofPredicate`, `dependencies`, `sourceBasis`.

2.1.2 כל `statement` דורש Artifact או Validation result יחיד; Compound source semantics נשמרים ב־immutable Parent ומפורקים בעתיד ל־AtomicClause children, בלי להעניק Parent credit חלקי.

2.1.3 `proofPredicate` הוא ConformancePredicate descriptor לפי `TRD2-PRED-DSL-V1`; כל עוד evaluator/runner roots אינם externally accepted, תוצאתו `BLOCKED`, לא PASS.

2.1.4 `dependencies` הוא ClosurePrerequisite overlay מפורש. `sourceDependencies` ההיסטוריים נשמרים בנפרד ב־V2R manifest; אין Merge ביניהם.

2.1.5 `sourceBasis` חייב לפתור ל־Root ו־Record locator יחידים. Range מותר רק כניווט בפרוזה ואסור כ־membership או closure evidence.

2.1.6 Requirement, reviewer-local Observation ו־Finding identities נשמרים אחד־לאחד. Similarity, common fix, common source או common terminal אינם Merge authority.

# 3. Sixteen one-to-one review-finding closure requirements

## 3.1 `TRD2V3-REQ-000` — detached non-self authority chain

- `statement`: require exactly one detached AuthorityChainValidationResult proving that an external AuthorityEnvelope precedes authoring and that a detached FreezeReceipt binds this exact Candidate root before review packet creation

- `defectCauseImpact`: v2 embedded REQ-000 and later B0 prose inside the candidate that they purported to authorize; self or future-root authority can make an acyclic ID graph bootstrap-invalid and grant false freeze or acceptance authority

- `proofPredicate`: predicateId=CP-000;version=TRD2-PRED-DSL-V1;expression=ALL(RESOLVES(EXT-001),VALID_TIME(EXT-001),RESOLVES(EXT-002),EQ(EXT-002.candidateRoot,subjectRoot),NOT(candidateMembers contains EXT-001),NOT(candidateMembers contains EXT-002),MUTANT_FAILS(TV-F004-SELF-AUTHORITY),MUTANT_FAILS(TV-F004-FUTURE-ROOT),MUTANT_FAILS(TV-F004-REVOCATION-RACE));expected=PASS;failure=AUTHORITY-OR-FREEZE-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: []

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F004; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§5.3; controlRoot=caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de§2

## 3.2 `TRD2V3-REQ-001` — canonical serialization

- `statement`: require exactly one CanonicalSerializationValidationResult for `TRD2V3-OBS-CANON-V1` and the Candidate five-field record grammar

- `defectCauseImpact`: v2 used Markdown shape and line counts without a single UTF-8, LF, Unicode/Bidi, escaping, MissingValue, list-order, record-digest and collection-root pipeline; two parsers could pass shape while deriving different values or roots

- `proofPredicate`: predicateId=CP-001;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(allSourceParts),FIELD_COUNT_EQ(allRequirements,5),EQ(serializerA.root,serializerB.root),MUTANT_FAILS(TV-F003-UNICODE-BIDI),MUTANT_FAILS(TV-F003-DELIMITER),MUTANT_FAILS(TV-F003-ORDER-RACE));expected=PASS;failure=CANONICALIZATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F003; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§5.2; observationRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3§1.3

## 3.3 `TRD2V3-REQ-002` — exact SourceArtifactIndex and SourceRecordLocator

- `statement`: require exactly one SourceLocatorValidationResult resolving every admitted observation and inherited v2 record to one exact artifact root, path, inclusive line slice, byte count, record digest and parser profile

- `defectCauseImpact`: v2 retained mostly root plus local ID and required undefined filesystem search; missing artifacts, repeated IDs, wrong paths or locator drift could not fail deterministically or replay offline

- `proofPredicate`: predicateId=CP-002;version=TRD2-PRED-DSL-V1;expression=ALL(COUNT_EQ(sourceObservationLocators,84),COUNT_EQ(inheritedV2Locators,85),UNIQUE(allQualifiedLocators),RESOLVES(allQualifiedLocators),SHA256_EQ(allRecordSlices),MUTANT_FAILS(TV-F011-AMBIGUOUS-ID),MUTANT_FAILS(TV-F011-MISSING-ARTIFACT),MUTANT_FAILS(TV-F011-ROOT-CHANGE));expected=PASS;failure=SOURCE-LOCATOR-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-001]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F011; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§6.2; v2ByteRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec§2; observationRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3§2

## 3.4 `TRD2V3-REQ-003` — lossless full-observation preservation

- `statement`: require exactly one LosslessObservationSetValidationResult reconstructing every source field and exact observation digest for all 84 immutable SourceObservationEnvelopes

- `defectCauseImpact`: v2 preserved identities and a five-field projection but omitted severity, locators, terminals, status, merge keys, report locators, source-contract identities and D31 digest/claim-limit data; identity-only preservation could not reconstruct the reviewer-local observation

- `proofPredicate`: predicateId=CP-003;version=TRD2-PRED-DSL-V1;expression=ALL(COUNT_EQ(sourceObservationEnvelopes,84),SET_EQ(extractorA.records,extractorB.records),EQ(omittedFields,0),EQ(changedFields,0),EQ(unresolvedFields,0),EQ(SOE-006.d31RawSha256,8816a77739a17e94cf9ffcbf5a586db00e001d9d5fdff3bd8e801a0e33e79bb0),MUTANT_FAILS(TV-F001-OMITTED-FIELD),MUTANT_FAILS(TV-F001-WRONG-DIGEST));expected=PASS;failure=LOSSLESS-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-001,TRD2V3-REQ-002]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F001; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§5.1; observationRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3§§1.4,2,3.1

## 3.5 `TRD2V3-REQ-004` — row-bound severity and immutable history

- `statement`: require exactly one SeverityBindingValidationResult deriving the aggregate only from 84 row-bound original/effective severities and their transition conditions

- `defectCauseImpact`: v2 kept only family aggregates, so rows could be reassigned, downgraded or promoted late while totals stayed unchanged; Security F019 reachability promotion was not machine-bound

- `proofPredicate`: predicateId=CP-004;version=TRD2-PRED-DSL-V1;expression=ALL(COUNT_EQ(severityBindings,84),EQ(derived.P0,39),EQ(derived.P1,37),EQ(derived.P2,6),EQ(derived.P3,2),EQ(derived.total,84),MUTANT_FAILS(TV-F002-SEVERITY-PERMUTE),MUTANT_FAILS(TV-F002-DOWNGRADE),MUTANT_FAILS(TV-F002-PROMOTION-RACE));expected=PASS;failure=SEVERITY-BINDING-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-002,TRD2V3-REQ-003]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F002; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§6.1; observationRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3§§2,3.1.4

## 3.6 `TRD2V3-REQ-005` — typed resolution for 27 missing values

- `statement`: require exactly one MissingValueRegistryValidationResult proving that the seven absent Producer rules and twenty absent Security predicates remain 27 explicit unresolved records until an authorized successor resolves each one

- `defectCauseImpact`: v2 correctly avoided invention but encoded missing values as prose strings without closed states, authority, resolution predicates or successor triggers; consumers could coerce them to defaults or fill them without authority

- `proofPredicate`: predicateId=CP-005;version=TRD2-PRED-DSL-V1;expression=ALL(COUNT_EQ(missingValues,27),COUNT_EQ(missingRuleValues,7),COUNT_EQ(missingPredicateValues,20),EQ(acceptanceEligibleTrue,0),EQ(defaultedValues,0),EQ(inferredValues,0),MUTANT_FAILS(TV-F006-COERCION),MUTANT_FAILS(TV-F006-UNAUTHORIZED-RESOLUTION),MUTANT_FAILS(TV-F006-DOUBLE-RESOLUTION));expected=PASS;failure=MISSING-VALUE-UNRESOLVED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-003]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F006; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§5.5; controlRoot=caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de§3

## 3.7 `TRD2V3-REQ-006` — exact safe-terminal bindings

- `statement`: require exactly one SafeTerminalBindingValidationResult preserving the seven Producer and twenty Security source terminals and routing every missing, stale or wrong-root condition to its bound terminal

- `defectCauseImpact`: v2 omitted all 27 source terminals from successor rows; absent predicates could leave Public, provider, deletion, restore, AI, file and tenant capabilities with undefined fallback or implicit success

- `proofPredicate`: predicateId=CP-006;version=TRD2-PRED-DSL-V1;expression=ALL(COUNT_EQ(sourceSafeTerminals,27),BYTES_EQ(projectedTerminals,sourceTerminals),EQ(implicitEnabledPaths,0),EQ(defaultSuccessPaths,0),MUTANT_FAILS(TV-F008-TERMINAL-OMIT),MUTANT_FAILS(TV-F008-DEFAULT-SUCCESS),MUTANT_FAILS(TV-F008-TERMINAL-RACE));expected=PASS;failure=SAFE-TERMINAL-BINDING-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-003,TRD2V3-REQ-005]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F008; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§5.7; observationRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3§§2.1,2.3,3.1.5

## 3.8 `TRD2V3-REQ-007` — connected typed semantic DAG

- `statement`: require exactly one SemanticDependencyGraphValidationResult over separately typed source, provenance, closure-prerequisite, validation and invalidation edges

- `defectCauseImpact`: v2 preserved one untyped dependency list with two weak components; Structural records were disconnected from Freeze and other rows omitted cross-family prerequisites, permitting semantically invalid order despite zero syntactic cycles

- `proofPredicate`: predicateId=CP-007;version=TRD2-PRED-DSL-V1;expression=ALL(COUNT_EQ(weakComponents,1),REACHABLE(detachedFreezeRoot,allRequirements),ACYCLIC(allTypedEdges),EQ(danglingEdges,0),EQ(selfEdges,0),EQ(duplicateEdges,0),EQ(untypedPredicateInputs,0),MUTANT_FAILS(TV-F005-EDGE-REMOVE),MUTANT_FAILS(TV-F005-CYCLE),MUTANT_FAILS(TV-F005-INVALIDATION-RACE));expected=PASS;failure=SEMANTIC-DAG-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F005; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§5.4; controlRoot=caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de§5

## 3.9 `TRD2V3-REQ-008` — executable ConformancePredicate records

- `statement`: require exactly one ConformancePredicateRegistryValidationResult proving that every acceptance-eligible rule has a versioned evaluator-bound predicate and every unresolved source predicate remains blocked rather than invented

- `defectCauseImpact`: v2 copied prose predicates without language, evaluator, input roots, test IDs, expected result, failure terminal, evidence schema or runner identity; identical bytes could receive different PASS/FAIL/UNKNOWN outcomes

- `proofPredicate`: predicateId=CP-008;version=TRD2-PRED-DSL-V1;expression=ALL(RESOLVES(allPredicateInputRoots),RESOLVES(acceptedEvaluatorRoot),RESOLVES(acceptedRunnerRoots),EQ(unknownPredicatesAmongAcceptanceEligibleRules,0),EQ(runnerA.resultRoot,runnerB.resultRoot),MUTANT_FAILS(TV-F007-WRONG-ROOT),MUTANT_FAILS(TV-F007-RUNNER-MISSING),MUTANT_FAILS(TV-F007-RUNNER-DIVERGENCE));expected=PASS;failure=PREDICATE-EVALUATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-001,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F007; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§5.6; controlRoot=caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de§4

## 3.10 `TRD2V3-REQ-009` — accepted Protocol and two eligible generations

- `statement`: require exactly one ReviewEligibilityValidationResult binding an externally accepted Protocol root, eligible packet, reviewer appointments, independence evidence, two normalizer roots and two receipt-independent review generations to this exact Candidate root

- `defectCauseImpact`: v2 bound no accepted Protocol, complete ReviewEnvelope or appointment/independence proof and acknowledged the workflow was blocked; legacy observations could supply discovery but not closure transfer or acceptance

- `proofPredicate`: predicateId=CP-009;version=TRD2-PRED-DSL-V1;expression=ALL(RESOLVES(EXT-003),VALID_TIME(EXT-003),RESOLVES(EXT-005),EQ(EXT-005.candidateRoot,subjectRoot),EQ(reviewGenerations,2),DISJOINT(generationOne.receipts,generationTwo.receipts),EQ(normalizerA.root,normalizerB.root),MUTANT_FAILS(TV-F009-LEGACY-ELIGIBLE),MUTANT_FAILS(TV-F009-PROTOCOL-MISSING),MUTANT_FAILS(TV-F009-RECEIPT-CARRYOVER));expected=PASS;failure=REVIEW-INELIGIBLE;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-001,TRD2V3-REQ-003,TRD2V3-REQ-007,TRD2V3-REQ-008]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F009; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§5.8; controlRoot=caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de§§2,9.1.2

## 3.11 `TRD2V3-REQ-010` — detached lifecycle state and fenced CAS

- `statement`: require exactly one DetachedLifecycleValidationResult proving that all mutable state, acceptance, supersession, invalidation and Current-pointer changes occur outside Candidate bytes through time-bound fenced CAS records

- `defectCauseImpact`: v2 embedded accepted/closed/Gate/freeze/PASS states in immutable candidate bytes without time bounds; later acceptance would stale or mutate the reviewed root and CAS conflict behavior was undefined

- `proofPredicate`: predicateId=CP-010;version=TRD2-PRED-DSL-V1;expression=ALL(EQ(mutableStateFieldsInCandidate,0),VALID_TIME(allStatusSnapshots),EQ(allStatusSnapshots.subjectRoot,subjectRoot),EQ(staleSnapshotsCurrent,0),MUTANT_FAILS(TV-F012-STALE-STATUS),MUTANT_FAILS(TV-F012-WRONG-SUBJECT),MUTANT_FAILS(TV-F012-CAS-CONFLICT));expected=PASS;failure=LIFECYCLE-STATE-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-001,TRD2V3-REQ-009]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F012; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§6.3; controlRoot=caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de§6.1

## 3.12 `TRD2V3-REQ-011` — immutable parent and AtomicClause decomposition

- `statement`: require exactly one AtomicClauseRegistryValidationResult decomposing every compound inherited rule into mandatory one-action children while retaining its immutable parent at zero effort and zero credit

- `defectCauseImpact`: v2 combined multiple schemas, transitions, tests, actors and outputs in single rules; no-merge preservation was conflated with no decomposition, allowing partial work to appear as complete observation closure

- `proofPredicate`: predicateId=CP-011;version=TRD2-PRED-DSL-V1;expression=ALL(EQ(parentMutationCount,0),EQ(parentEffortCredit,0),EQ(nonAtomicMandatoryChildren,0),EQ(parentClosureWithoutAllChildren,0),MUTANT_FAILS(TV-F013-PARTIAL-PARENT),MUTANT_FAILS(TV-F013-NONATOMIC-CHILD),MUTANT_FAILS(TV-F013-CHILD-RACE));expected=PASS;failure=ATOMICITY-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-003,TRD2V3-REQ-007,TRD2V3-REQ-008]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F013; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§6.4; controlRoot=caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de§6.2

## 3.13 `TRD2V3-REQ-012` — finite accepted Source universe

- `statement`: require exactly one SourceUniverseValidationResult proving a finite discovery cut and a total disjoint admitted, excluded and blocked disposition for every candidate source

- `defectCauseImpact`: v2 froze 84 historical observations before Source-universe acceptance and omitted later Public/cyber sources; without an accepted cut it could not claim complete TRD2 or cyber coverage

- `proofPredicate`: predicateId=CP-012;version=TRD2-PRED-DSL-V1;expression=ALL(RESOLVES(EXT-004),VALID_TIME(EXT-004),SET_EQ(candidateSources,UNION(admittedSources,excludedSources,blockedSources)),DISJOINT(admittedSources,excludedSources,blockedSources),EQ(missingDispositions,0),EQ(doubleDispositions,0),MUTANT_FAILS(TV-F015-DOUBLE-DISPOSITION),MUTANT_FAILS(TV-F015-LATE-SOURCE),MUTANT_FAILS(TV-F015-CUT-RACE));expected=PASS;failure=SOURCE-UNIVERSE-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-001,TRD2V3-REQ-002,TRD2V3-REQ-009,TRD2V3-REQ-010]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F015; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§6.6; controlRoot=caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de§2.2#EXT-004

## 3.14 `TRD2V3-REQ-013` — typed DataLifecycle graph

- `statement`: require exactly one DataLifecycleValidationResult covering each data class and permitted transition from source object through derivatives, backup, restore quarantine, privacy replay and re-deletion

- `defectCauseImpact`: v2 kept file, hold, deletion, backup, restore, privacy replay, unknown attempts, test expiry and invalidation in disconnected rows; restore could bypass re-deletion, deletion could race Hold and byte consistency could be mistaken for privacy safety

- `proofPredicate`: predicateId=CP-013;version=TRD2-PRED-DSL-V1;expression=ALL(EQ(uncoveredDataClasses,0),UNIQUE(dataClassStoreCoverage),EQ(activeHoldDeletePaths,0),EQ(unknownRetryPaths,0),EQ(restoredDeletedDataActivationPaths,0),MUTANT_FAILS(TV-F010-RESURRECTION),MUTANT_FAILS(TV-F010-UNKNOWN-DELETE),MUTANT_FAILS(TV-F010-HOLD-RACE),MUTANT_FAILS(TV-F010-RESTORE-REDELETE));expected=PASS;failure=DATA-LIFECYCLE-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F010; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§5.9; controlRoot=caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de§7

## 3.15 `TRD2V3-REQ-014` — Public repository closure without Private fallback

- `statement`: require exactly one PublicRepositoryClosureValidationResult that preserves Public visibility and maps every admitted Public control to tests, evidence and a later-authority hardening gate

- `defectCauseImpact`: v2 preserved Public intent but omitted exact D18-A2/current cyber roots, the control denominator, bypass tests, readback schema and hardening gate; broad policy could appear complete while mutation paths stayed unsafe

- `proofPredicate`: predicateId=CP-014;version=TRD2-PRED-DSL-V1;expression=ALL(EQ(repositoryIntent,PUBLIC),EQ(privateRemediationPaths,0),RESOLVES(d18A2Root),RESOLVES(publicCyberReviewRoot),RESOLVES(publicCyberFindingsRoot),EQ(undispositionedAdmittedPublicControls,0),EQ(unmappedControlTests,0),EQ(mutationPathsBeforeHardeningGate,0),MUTANT_FAILS(TV-F014-PRIVATE-PATH),MUTANT_FAILS(TV-F014-CONTROL-OMIT),MUTANT_FAILS(TV-F014-BYPASS-RACE),MUTANT_FAILS(TV-F014-TWO-READBACKS));expected=PASS;failure=PUBLIC-HARDENING-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F014; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§6.5; d18A2Root=448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9; publicCyberReviewRoot=af7bd90255fe0cb037d19ad8138609a3b35df50c33219470c845dec15919c6d5; publicCyberFindingsRoot=a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4; controlRoot=caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de§8

## 3.16 `TRD2V3-REQ-015` — detached mechanical QA and independent replay

- `statement`: require exactly one detached MechanicalQAResult binding this Candidate root, runner/evaluator roots, vector root, command/config, counters, raw-output digest, execution times and an independent replay result

- `defectCauseImpact`: v2 embedded PASS-CANDIDATE prose without runner, command, input root, environment, negative vectors or independent replay; it could not detect parser drift and could be mistaken for independent acceptance credit

- `proofPredicate`: predicateId=CP-015;version=TRD2-PRED-DSL-V1;expression=ALL(EQ(qaRunA.subjectRoot,subjectRoot),EQ(qaRunB.subjectRoot,subjectRoot),EQ(qaRunA.counters,qaRunB.counters),EQ(qaRunA.rawOutputDigest,qaRunB.rawOutputDigest),EQ(selfAuthoredAcceptanceCredit,0),MUTANT_FAILS(TV-F016-NEGATIVE-MUTANT),MUTANT_FAILS(TV-F016-RUNNER-DRIFT),MUTANT_FAILS(TV-F016-CONCURRENT-RUNS));expected=PASS;failure=MECHANICAL-QA-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-001,TRD2V3-REQ-002,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-016,TRD2V3-REQ-017,TRD2V3-REQ-018,TRD2V3-REQ-019,TRD2V3-REQ-020,TRD2V3-REQ-021,TRD2V3-REQ-022,TRD2V3-REQ-023,TRD2V3-REQ-024,TRD2V3-REQ-025,TRD2V3-REQ-026,TRD2V3-REQ-027,TRD2V3-REQ-028,TRD2V3-REQ-029,TRD2V3-REQ-030,TRD2V3-REQ-031,TRD2V3-REQ-032,TRD2V3-REQ-033,TRD2V3-REQ-034,TRD2V3-REQ-035,TRD2V3-REQ-036,TRD2V3-REQ-037,TRD2V3-REQ-038,TRD2V3-REQ-039,TRD2V3-REQ-040,TRD2V3-REQ-041,TRD2V3-REQ-042,TRD2V3-REQ-043,TRD2V3-REQ-044,TRD2V3-REQ-045,TRD2V3-REQ-046,TRD2V3-REQ-047,TRD2V3-REQ-048,TRD2V3-REQ-049,TRD2V3-REQ-050,TRD2V3-REQ-051,TRD2V3-REQ-052,TRD2V3-REQ-053,TRD2V3-REQ-054,TRD2V3-REQ-055,TRD2V3-REQ-056,TRD2V3-REQ-057,TRD2V3-REQ-058,TRD2V3-REQ-059,TRD2V3-REQ-060,TRD2V3-REQ-061,TRD2V3-REQ-062,TRD2V3-REQ-063,TRD2V3-REQ-064,TRD2V3-REQ-065,TRD2V3-REQ-066,TRD2V3-REQ-067,TRD2V3-REQ-068,TRD2V3-REQ-069,TRD2V3-REQ-070,TRD2V3-REQ-071,TRD2V3-REQ-072,TRD2V3-REQ-073,TRD2V3-REQ-074,TRD2V3-REQ-075,TRD2V3-REQ-076,TRD2V3-REQ-077,TRD2V3-REQ-078,TRD2V3-REQ-079,TRD2V3-REQ-080,TRD2V3-REQ-081,TRD2V3-REQ-082,TRD2V3-REQ-083,TRD2V3-REQ-084,TRD2V3-REQ-085,TRD2V3-REQ-086,TRD2V3-REQ-087,TRD2V3-REQ-088,TRD2V3-REQ-089,TRD2V3-REQ-090,TRD2V3-REQ-091,TRD2V3-REQ-092,TRD2V3-REQ-093,TRD2V3-REQ-094,TRD2V3-REQ-095,TRD2V3-REQ-096,TRD2V3-REQ-097,TRD2V3-REQ-098,TRD2V3-REQ-099,TRD2V3-REQ-100]

- `sourceBasis`: findingsRoot=7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F016; reportRoot=fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b§6.7; controlRoot=caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de§4

# 4. Eighty-five atomic inherited-v2 preservation requirements

## 4.1 `TRD2V3-REQ-016` — preserve `TRD2V2-REQ-000`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-000` and classify its embedded self-authority claim as historical-only with zero authority, closure, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-000;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,9f5d1a9d31e601327f8e1ca4b077a6aa52d6e61cced7f50f7264da53e41cdf1f),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-000),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),EQ(authorityCredit,0),MUTANT_FAILS(TV-INH-000-BYTE),MUTANT_FAILS(TV-INH-000-FIELD),MUTANT_FAILS(TV-INH-000-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-010]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-000; sourceLocator=L33-L43; sourceRecordDigest=9f5d1a9d31e601327f8e1ca4b077a6aa52d6e61cced7f50f7264da53e41cdf1f; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-000

## 4.2 `TRD2V3-REQ-017` — preserve `TRD2V2-REQ-001`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-001`, binding exactly one `SOE-001` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-001;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,b9ee1b7711396d74bd928b5287a141886ce79828eaeac736a1a159df6c0e14df),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-001),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-001),SHA256_EQ(SOE-001,783ba500c6c9e50381fc0891e19c72de1bad0ed102e5bffc7ebb40aadfe2c237),EQ(SOE-001.localObservationId,TRD2-PQA-P0-001),EQ(MV-001.status,UNRESOLVED),EQ(MV-001.acceptanceEligible,false),MUTANT_FAILS(TV-INH-001-BYTE),MUTANT_FAILS(TV-INH-001-FIELD),MUTANT_FAILS(TV-INH-001-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-001; sourceLocator=L47-L57; sourceRecordDigest=b9ee1b7711396d74bd928b5287a141886ce79828eaeac736a1a159df6c0e14df; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-001; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-001; observationSourceParts=PR:L115-L127:757:fb05abfaaf0275a45eecee47c0ad9cebd797cdec9efc8f52b28bcffef38c1f4d; observationRecordDigest=783ba500c6c9e50381fc0891e19c72de1bad0ed102e5bffc7ebb40aadfe2c237

## 4.3 `TRD2V3-REQ-018` — preserve `TRD2V2-REQ-002`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-002`, binding exactly one `SOE-002` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-002;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,e5dd8910a3e077cf753ad0daae18bfa8bd4ce8d90db77686ee99c7800890d049),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-002),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-002),SHA256_EQ(SOE-002,67b327e45d315b835d53547ca06b8839d8951c84b449938f12a051dc1dbbcc5b),EQ(SOE-002.localObservationId,TRD2-PQA-P0-002),EQ(MV-002.status,UNRESOLVED),EQ(MV-002.acceptanceEligible,false),MUTANT_FAILS(TV-INH-002-BYTE),MUTANT_FAILS(TV-INH-002-FIELD),MUTANT_FAILS(TV-INH-002-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-002; sourceLocator=L59-L69; sourceRecordDigest=e5dd8910a3e077cf753ad0daae18bfa8bd4ce8d90db77686ee99c7800890d049; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-002; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-002; observationSourceParts=PR:L129-L141:761:ed222e9f8be5fea92771cde3f8e11be6717dd6fe9c08974fbc7978993e93cab0; observationRecordDigest=67b327e45d315b835d53547ca06b8839d8951c84b449938f12a051dc1dbbcc5b

## 4.4 `TRD2V3-REQ-019` — preserve `TRD2V2-REQ-003`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-003`, binding exactly one `SOE-003` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-003;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,d1a713efd3ef21e4c00e6dd238b55cc02802756a0f9d6d287c45804d6cfd7917),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-003),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-003),SHA256_EQ(SOE-003,5b4f8f271b018c957c7ab4f2bd637888359c9f5b81240eb9b33d270792de0819),EQ(SOE-003.localObservationId,TRD2-PQA-P0-003),EQ(MV-003.status,UNRESOLVED),EQ(MV-003.acceptanceEligible,false),MUTANT_FAILS(TV-INH-003-BYTE),MUTANT_FAILS(TV-INH-003-FIELD),MUTANT_FAILS(TV-INH-003-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-003; sourceLocator=L71-L81; sourceRecordDigest=d1a713efd3ef21e4c00e6dd238b55cc02802756a0f9d6d287c45804d6cfd7917; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-003; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-003; observationSourceParts=PR:L143-L155:721:267ca5f01f7cb512f75ece7ff569a1e081dd0c9b75ab4271ea04179360389bbc; observationRecordDigest=5b4f8f271b018c957c7ab4f2bd637888359c9f5b81240eb9b33d270792de0819

## 4.5 `TRD2V3-REQ-020` — preserve `TRD2V2-REQ-004`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-004`, binding exactly one `SOE-004` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-004;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,a75e01887659fae92ee7687b650649f765ddebdc9fbf24f09b96d897adbd8ea5),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-004),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-004),SHA256_EQ(SOE-004,15300d1c25088ff9ee5b2677d1f53d929bf3f0bd8fd2035522cfc3e7bf4daa1d),EQ(SOE-004.localObservationId,TRD2-PQA-P1-001),EQ(MV-004.status,UNRESOLVED),EQ(MV-004.acceptanceEligible,false),MUTANT_FAILS(TV-INH-004-BYTE),MUTANT_FAILS(TV-INH-004-FIELD),MUTANT_FAILS(TV-INH-004-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-004; sourceLocator=L83-L93; sourceRecordDigest=a75e01887659fae92ee7687b650649f765ddebdc9fbf24f09b96d897adbd8ea5; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-004; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-004; observationSourceParts=PR:L157-L169:620:cf7067611b3e3fcf0187f318c4d04e79d05f737d24a3ad52e24dc10f9ec6a760; observationRecordDigest=15300d1c25088ff9ee5b2677d1f53d929bf3f0bd8fd2035522cfc3e7bf4daa1d

## 4.6 `TRD2V3-REQ-021` — preserve `TRD2V2-REQ-005`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-005`, binding exactly one `SOE-005` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-005;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,b209781f4ca7a6e01a3d3c805fdfcec7ffac27881ab68ac59f3291200bdbe7d5),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-005),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-005),SHA256_EQ(SOE-005,17cc333bd3f44daefcd9daa2aa617ca9ca53b664e83553c56eeb8faca11b6fa0),EQ(SOE-005.localObservationId,TRD2-PQA-P0-004),EQ(MV-005.status,UNRESOLVED),EQ(MV-005.acceptanceEligible,false),MUTANT_FAILS(TV-INH-005-BYTE),MUTANT_FAILS(TV-INH-005-FIELD),MUTANT_FAILS(TV-INH-005-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-005; sourceLocator=L95-L105; sourceRecordDigest=b209781f4ca7a6e01a3d3c805fdfcec7ffac27881ab68ac59f3291200bdbe7d5; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-005; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-005; observationSourceParts=PR:L171-L183:1001:2f5bfb99be2f339b502afe79329d81bc1e6545d6f51a0f84fe96165fbd871d72; observationRecordDigest=17cc333bd3f44daefcd9daa2aa617ca9ca53b664e83553c56eeb8faca11b6fa0

## 4.7 `TRD2V3-REQ-022` — preserve `TRD2V2-REQ-006`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-006`, binding exactly one `SOE-006` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-006;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,df9a0c703fa0266e396d98bc3d7aeab4903e90e17d54dce10bd5da94f695b31d),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-006),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-006),SHA256_EQ(SOE-006,12ba6d0f12c6e4329e54b0c4d9f24221e60ba4dd250612932b6b94ef1514399f),EQ(SOE-006.localObservationId,TRD2-PQA-P1-002),EQ(MV-006.status,UNRESOLVED),EQ(MV-006.acceptanceEligible,false),MUTANT_FAILS(TV-INH-006-BYTE),MUTANT_FAILS(TV-INH-006-FIELD),MUTANT_FAILS(TV-INH-006-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-006; sourceLocator=L107-L117; sourceRecordDigest=df9a0c703fa0266e396d98bc3d7aeab4903e90e17d54dce10bd5da94f695b31d; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-006; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-006; observationSourceParts=PR:L185-L199:1070:ab505643cddd64e1b7823c970f80557858cac3bfe40506a35965c57ca18afc3d; observationRecordDigest=12ba6d0f12c6e4329e54b0c4d9f24221e60ba4dd250612932b6b94ef1514399f

## 4.8 `TRD2V3-REQ-023` — preserve `TRD2V2-REQ-007`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-007`, binding exactly one `SOE-007` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-007;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,dd86b18777eebfacc2d6f792d625c7b1f148e32ded2a4d2e6dffa15756a6e08c),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-007),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-007),SHA256_EQ(SOE-007,86bc3311cf315953356eb47de534a186c80a2d789a3aeb5fe18c3326815fbb2a),EQ(SOE-007.localObservationId,TRD2-PQA-P1-003),EQ(MV-007.status,UNRESOLVED),EQ(MV-007.acceptanceEligible,false),MUTANT_FAILS(TV-INH-007-BYTE),MUTANT_FAILS(TV-INH-007-FIELD),MUTANT_FAILS(TV-INH-007-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-007; sourceLocator=L119-L129; sourceRecordDigest=dd86b18777eebfacc2d6f792d625c7b1f148e32ded2a4d2e6dffa15756a6e08c; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-007; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-007; observationSourceParts=PR:L201-L213:990:de289178f9995d0aba1adb76556673fd34507e5a1c2e2760d1754ec159555035; observationRecordDigest=86bc3311cf315953356eb47de534a186c80a2d789a3aeb5fe18c3326815fbb2a

## 4.9 `TRD2V3-REQ-024` — preserve `TRD2V2-REQ-008`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-008`, binding exactly one `SOE-008` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-008;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,944470e6f612f6b3e75bbd619b203eda90e83d58ba9596ad663ff0c23b0dbcc7),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-008),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-008),SHA256_EQ(SOE-008,a7ca569526e22fd6d580f8d200df3bccb3f9b786a3591354fb8efb6559b8a4e7),EQ(SOE-008.localObservationId,TRD2-MATH-RB-F001),MUTANT_FAILS(TV-INH-008-BYTE),MUTANT_FAILS(TV-INH-008-FIELD),MUTANT_FAILS(TV-INH-008-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-008; sourceLocator=L133-L143; sourceRecordDigest=944470e6f612f6b3e75bbd619b203eda90e83d58ba9596ad663ff0c23b0dbcc7; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-008; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-008; observationSourceParts=MR:L53-L67:1311:f8b8b7fdbd9f9712b1e1ade9d18ad2aa85fa820ba139518b871fb91ffcccc82a+MM:L33:996:ed6bea29025cfe83a0771ab5a3b92d090263d51670835d09ddc51e1216746911; observationRecordDigest=a7ca569526e22fd6d580f8d200df3bccb3f9b786a3591354fb8efb6559b8a4e7

## 4.10 `TRD2V3-REQ-025` — preserve `TRD2V2-REQ-009`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-009`, binding exactly one `SOE-009` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-009;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,18c30ee7e6751cc2c95638de67dbe996719b2053a4dc3a6769f94651b8ab0d79),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-009),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-009),SHA256_EQ(SOE-009,f969351091fc834a0353fff39ad7d07df367ce26af62cf7b2ae87f06237935e1),EQ(SOE-009.localObservationId,TRD2-MATH-RB-F002),MUTANT_FAILS(TV-INH-009-BYTE),MUTANT_FAILS(TV-INH-009-FIELD),MUTANT_FAILS(TV-INH-009-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-009; sourceLocator=L145-L155; sourceRecordDigest=18c30ee7e6751cc2c95638de67dbe996719b2053a4dc3a6769f94651b8ab0d79; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-009; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-009; observationSourceParts=MR:L69-L83:1145:c2f0b2abceba79ce2d08f35c9b31ba589c47cd935778dd709142324d8094e173+MM:L34:283:135225f9cb9cf6ca58c455a19ca1e00633125cc7205439cb4e48d4a0f33c4a71; observationRecordDigest=f969351091fc834a0353fff39ad7d07df367ce26af62cf7b2ae87f06237935e1

## 4.11 `TRD2V3-REQ-026` — preserve `TRD2V2-REQ-010`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-010`, binding exactly one `SOE-010` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-010;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,bb07b84e077078279af96a6066d9982e4b2ac4a8b368275481073704d0d338a7),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-010),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-010),SHA256_EQ(SOE-010,62b8d4aaed0473af30e7cd1a39be2314f47624489cc49bd816e2b93381b9b53c),EQ(SOE-010.localObservationId,TRD2-MATH-RB-F003),MUTANT_FAILS(TV-INH-010-BYTE),MUTANT_FAILS(TV-INH-010-FIELD),MUTANT_FAILS(TV-INH-010-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-010; sourceLocator=L157-L167; sourceRecordDigest=bb07b84e077078279af96a6066d9982e4b2ac4a8b368275481073704d0d338a7; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-010; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-010; observationSourceParts=MR:L85-L99:1167:e048a52c261a10d2899a181c0d1092c56f9414780c58b518d0b17b736e0becf0+MM:L35:300:3d31d7ef4005d16b6ea5f6477fe0ecf8f9e2ea23589e09de56c247ff0776e606; observationRecordDigest=62b8d4aaed0473af30e7cd1a39be2314f47624489cc49bd816e2b93381b9b53c

## 4.12 `TRD2V3-REQ-027` — preserve `TRD2V2-REQ-011`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-011`, binding exactly one `SOE-011` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-011;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,030981677350c38842c6b84877f5f631201665a138a09d7378c8f8f6ed709c79),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-011),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-011),SHA256_EQ(SOE-011,57b58482af3ee9fafdeb0505f4015d725b2b8bd96aeefbe29d8e324a4904fdf8),EQ(SOE-011.localObservationId,TRD2-MATH-RB-F004),MUTANT_FAILS(TV-INH-011-BYTE),MUTANT_FAILS(TV-INH-011-FIELD),MUTANT_FAILS(TV-INH-011-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-011; sourceLocator=L169-L179; sourceRecordDigest=030981677350c38842c6b84877f5f631201665a138a09d7378c8f8f6ed709c79; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-011; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-011; observationSourceParts=MR:L101-L115:1233:066c4ce752026111fbbf017a16e3a00335a5662d37c7c0ebb448c49779bd9e99+MM:L36:328:c05d05aca7d11bb9cf9a50dc5337312197de3f1a00d46c2fd5fedeecba6df61b; observationRecordDigest=57b58482af3ee9fafdeb0505f4015d725b2b8bd96aeefbe29d8e324a4904fdf8

## 4.13 `TRD2V3-REQ-028` — preserve `TRD2V2-REQ-012`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-012`, binding exactly one `SOE-012` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-012;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,49321cdf5dc2c2c232d52cb309951d5d81b28fb50002b853a12405c98515dd57),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-012),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-012),SHA256_EQ(SOE-012,6074cbb498f3152b8aa7f49265f6465ef3f3a3b11d6b42975099cc6af8759298),EQ(SOE-012.localObservationId,TRD2-MATH-RB-F005),MUTANT_FAILS(TV-INH-012-BYTE),MUTANT_FAILS(TV-INH-012-FIELD),MUTANT_FAILS(TV-INH-012-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-012; sourceLocator=L181-L191; sourceRecordDigest=49321cdf5dc2c2c232d52cb309951d5d81b28fb50002b853a12405c98515dd57; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-012; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-012; observationSourceParts=MR:L117-L131:1211:19de580db8f8cfea18482094e001ceafe9c5fc48c7dae976dea18a1f838640c5+MM:L37:263:84604fcc84ae065ad9a0d0607c4e71af025980b8fbae3ab1e0cca2d30dfc70ba; observationRecordDigest=6074cbb498f3152b8aa7f49265f6465ef3f3a3b11d6b42975099cc6af8759298

## 4.14 `TRD2V3-REQ-029` — preserve `TRD2V2-REQ-013`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-013`, binding exactly one `SOE-013` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-013;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,2bf84bb9f24f1f7be977693eab57528dfa6a814e28ead64351da4bc01abc8e25),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-013),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-013),SHA256_EQ(SOE-013,b3f54b5930f073045bde8063eea51fb1dd500519c851323c54ef5d6fec1d5239),EQ(SOE-013.localObservationId,TRD2-MATH-RB-F006),MUTANT_FAILS(TV-INH-013-BYTE),MUTANT_FAILS(TV-INH-013-FIELD),MUTANT_FAILS(TV-INH-013-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-013; sourceLocator=L193-L203; sourceRecordDigest=2bf84bb9f24f1f7be977693eab57528dfa6a814e28ead64351da4bc01abc8e25; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-013; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-013; observationSourceParts=MR:L133-L147:1133:fa9259463d7a8ea0c9604c9efbb52aa02d4e7dd530ffeb9e1a69fcb46b7306ef+MM:L38:272:ff3bb989ea84e23367abfb107486c5c7a9468fbea2229f8387813eba5cffdd3b; observationRecordDigest=b3f54b5930f073045bde8063eea51fb1dd500519c851323c54ef5d6fec1d5239

## 4.15 `TRD2V3-REQ-030` — preserve `TRD2V2-REQ-014`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-014`, binding exactly one `SOE-014` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-014;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,b256b8a700cc947ec324fe1d9ddc42130b8653d5e501bac4d7a22c0d64acbdbe),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-014),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-014),SHA256_EQ(SOE-014,f734c9df52eb9b57402f580e8e0d6b7f3d4e98bbaa7de7f07a4592d4f035111b),EQ(SOE-014.localObservationId,TRD2-MATH-RB-F007),MUTANT_FAILS(TV-INH-014-BYTE),MUTANT_FAILS(TV-INH-014-FIELD),MUTANT_FAILS(TV-INH-014-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-014; sourceLocator=L205-L215; sourceRecordDigest=b256b8a700cc947ec324fe1d9ddc42130b8653d5e501bac4d7a22c0d64acbdbe; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-014; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-014; observationSourceParts=MR:L149-L163:1028:8896f172b165217d091e10501e0fedc8c1b1cfe9b8c72d3c808c51906eea4276+MM:L39:228:dab2bca56d5374ca632c78ed7c95fd4c8c716e611dddb99f90d2ca32f491b3a0; observationRecordDigest=f734c9df52eb9b57402f580e8e0d6b7f3d4e98bbaa7de7f07a4592d4f035111b

## 4.16 `TRD2V3-REQ-031` — preserve `TRD2V2-REQ-015`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-015`, binding exactly one `SOE-015` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-015;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,7dfb4eae735c39abf96005522aeb3c3b73c9463aa8eceaae5e4b53633589aad7),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-015),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-015),SHA256_EQ(SOE-015,25fc61862a05f394c523ed3b604189b6d66817f2fec1264cfc3b864a6cf99bc1),EQ(SOE-015.localObservationId,TRD2-MATH-RB-F008),MUTANT_FAILS(TV-INH-015-BYTE),MUTANT_FAILS(TV-INH-015-FIELD),MUTANT_FAILS(TV-INH-015-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-015; sourceLocator=L217-L227; sourceRecordDigest=7dfb4eae735c39abf96005522aeb3c3b73c9463aa8eceaae5e4b53633589aad7; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-015; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-015; observationSourceParts=MR:L165-L179:1183:eb607b6ddd85c0c253da34b32bc60d50d858c8e5e7bc8ec31342123b143185df+MM:L40:303:c87400ee7c68faacc04d3fd98acce0774229d8c06ff20d739cc1e7ecb16c737a; observationRecordDigest=25fc61862a05f394c523ed3b604189b6d66817f2fec1264cfc3b864a6cf99bc1

## 4.17 `TRD2V3-REQ-032` — preserve `TRD2V2-REQ-016`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-016`, binding exactly one `SOE-016` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-016;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,84185d53ebde86df5f7bf1fbd1c764fc2a1e85711a27536aa3cca75699914ebf),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-016),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-016),SHA256_EQ(SOE-016,64d96241aebb568a045bfc6bf8c22eb16fe419d4f910b2d6e72a84df7cbceb79),EQ(SOE-016.localObservationId,TRD2-MATH-RB-F009),MUTANT_FAILS(TV-INH-016-BYTE),MUTANT_FAILS(TV-INH-016-FIELD),MUTANT_FAILS(TV-INH-016-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-016; sourceLocator=L229-L239; sourceRecordDigest=84185d53ebde86df5f7bf1fbd1c764fc2a1e85711a27536aa3cca75699914ebf; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-016; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-016; observationSourceParts=MR:L181-L195:1105:1624449ebac2ac773beb40fb2886017613ca3ebd65e9daec2bea49340d7943c5+MM:L41:286:f5ecd3999f27137fb64cbad85c76a50fcfa32efbefa523ed60fb766df1a3dfe5; observationRecordDigest=64d96241aebb568a045bfc6bf8c22eb16fe419d4f910b2d6e72a84df7cbceb79


## 4.18 `TRD2V3-REQ-033` — preserve `TRD2V2-REQ-017`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-017`, binding exactly one `SOE-017` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-017;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,dbf1baddb3215408e2f64a8acdf875d1386c702e50fe600efa759835b667d759),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-017),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-017),SHA256_EQ(SOE-017,15a74877cc8149ea869f1d67b013fccee6ecdff0a576c330b4afa941031a12b2),EQ(SOE-017.localObservationId,TRD2-MATH-RB-F010),MUTANT_FAILS(TV-INH-017-BYTE),MUTANT_FAILS(TV-INH-017-FIELD),MUTANT_FAILS(TV-INH-017-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-017; sourceLocator=L241-L251; sourceRecordDigest=dbf1baddb3215408e2f64a8acdf875d1386c702e50fe600efa759835b667d759; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-017; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-017; observationSourceParts=MR:L197-L211:1037:7e30599725b82e91ee50960a0fd5069dc6385acb631144f30bf131026922d801+MM:L42:250:9d80eedfe573988eeb3def936e6b696dd3292e410a8e7b80af81d79f1a8998b9; observationRecordDigest=15a74877cc8149ea869f1d67b013fccee6ecdff0a576c330b4afa941031a12b2

## 4.19 `TRD2V3-REQ-034` — preserve `TRD2V2-REQ-018`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-018`, binding exactly one `SOE-018` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-018;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,a9b84e06e6044e73906159537b24576bb4b9a7d5e3e26576d59ba3292f58968a),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-018),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-018),SHA256_EQ(SOE-018,6d443026efdc92292cda25b7ccacb2ed3c652f9dd1006337f1de9379cc504570),EQ(SOE-018.localObservationId,TRD2-MATH-RB-F011),MUTANT_FAILS(TV-INH-018-BYTE),MUTANT_FAILS(TV-INH-018-FIELD),MUTANT_FAILS(TV-INH-018-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-018; sourceLocator=L253-L263; sourceRecordDigest=a9b84e06e6044e73906159537b24576bb4b9a7d5e3e26576d59ba3292f58968a; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-018; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-018; observationSourceParts=MR:L213-L227:1232:2cece8db32403f32606bbfe431933ced7b207b013806d24a052eb348747cac27+MM:L43:298:bd2f3cd542c40d76b2a9ea18416ad934a73de3f2e0c1fd1c30025f4366017824; observationRecordDigest=6d443026efdc92292cda25b7ccacb2ed3c652f9dd1006337f1de9379cc504570

## 4.20 `TRD2V3-REQ-035` — preserve `TRD2V2-REQ-019`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-019`, binding exactly one `SOE-019` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-019;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,085e7c1e9256b6cfde309e25a97ee27f857628c92f2104d87f50068cbec55ed7),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-019),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-019),SHA256_EQ(SOE-019,824b09796c17a55e4e80051c99a281750fa515ad236296cca03af02343f10f8b),EQ(SOE-019.localObservationId,TRD2-MATH-RB-F012),MUTANT_FAILS(TV-INH-019-BYTE),MUTANT_FAILS(TV-INH-019-FIELD),MUTANT_FAILS(TV-INH-019-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-019; sourceLocator=L265-L275; sourceRecordDigest=085e7c1e9256b6cfde309e25a97ee27f857628c92f2104d87f50068cbec55ed7; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-019; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-019; observationSourceParts=MR:L229-L243:1203:627c8cf949772476f3e169ca0eb086714600c49252c0b00f388b7a8580e95955+MM:L44:319:7db34868679bdc627a82736cd12f1665ea4cbdf50e8ebd83d66be0f17a17feaf; observationRecordDigest=824b09796c17a55e4e80051c99a281750fa515ad236296cca03af02343f10f8b

## 4.21 `TRD2V3-REQ-036` — preserve `TRD2V2-REQ-020`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-020`, binding exactly one `SOE-020` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-020;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,1f0d8ce56216a9edeef89e11ae8daa4410753a42ed2e51b19b2d71e0ee72672f),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-020),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-020),SHA256_EQ(SOE-020,d43ba30abc1b3a47b3faece771330bd40e3f1c82c0731c140ba92423eb0b6631),EQ(SOE-020.localObservationId,TRD2-MATH-RB-F013),MUTANT_FAILS(TV-INH-020-BYTE),MUTANT_FAILS(TV-INH-020-FIELD),MUTANT_FAILS(TV-INH-020-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-020; sourceLocator=L277-L287; sourceRecordDigest=1f0d8ce56216a9edeef89e11ae8daa4410753a42ed2e51b19b2d71e0ee72672f; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-020; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-020; observationSourceParts=MR:L247-L261:1011:18eb878f4dcc4c76187be113aaed3acb04c5d195e4a03dbcc886442f4842ea87+MM:L50:257:41a8145caa8d93ff88a71c5b2269544b2bf2e5c64124a32c888d6fdd309df557; observationRecordDigest=d43ba30abc1b3a47b3faece771330bd40e3f1c82c0731c140ba92423eb0b6631

## 4.22 `TRD2V3-REQ-037` — preserve `TRD2V2-REQ-021`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-021`, binding exactly one `SOE-021` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-021;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,59ab326fbfb60b3d3d4fe2c102652040fe64030ff4a176de8cf140cf12b3a0f6),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-021),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-021),SHA256_EQ(SOE-021,24e74352a54053d01188178f709e2be8ffed9025d7b28211f885a9b206a8f37e),EQ(SOE-021.localObservationId,TRD2-MATH-RB-F014),MUTANT_FAILS(TV-INH-021-BYTE),MUTANT_FAILS(TV-INH-021-FIELD),MUTANT_FAILS(TV-INH-021-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-021; sourceLocator=L289-L299; sourceRecordDigest=59ab326fbfb60b3d3d4fe2c102652040fe64030ff4a176de8cf140cf12b3a0f6; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-021; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-021; observationSourceParts=MR:L263-L277:1147:098f741049b551fd0137656ef31b21ddbda7be279c06ad250d8ca84eb8eeab53+MM:L51:322:e2821cf32c77fabeeb8b38fb90ec39d4564797b3b2230c826741f22c8776df52; observationRecordDigest=24e74352a54053d01188178f709e2be8ffed9025d7b28211f885a9b206a8f37e

## 4.23 `TRD2V3-REQ-038` — preserve `TRD2V2-REQ-022`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-022`, binding exactly one `SOE-022` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-022;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,46bdbf47d066adb4fa07ec1cc05e26dcb044b5b0eb9430eed40da114ea1aeceb),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-022),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-022),SHA256_EQ(SOE-022,b61bf74b0b7f10d10919b702e9853c3910d428c13067ffa6332efafff5c5b135),EQ(SOE-022.localObservationId,TRD2-MATH-RB-F015),MUTANT_FAILS(TV-INH-022-BYTE),MUTANT_FAILS(TV-INH-022-FIELD),MUTANT_FAILS(TV-INH-022-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-022; sourceLocator=L301-L311; sourceRecordDigest=46bdbf47d066adb4fa07ec1cc05e26dcb044b5b0eb9430eed40da114ea1aeceb; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-022; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-022; observationSourceParts=MR:L279-L293:1091:a1422e4c078772e471be6ec368abba4e4f6c89a41a705a195e97e59ae48bbf36+MM:L52:265:5936f5f28c9ab44e5985b2621ff63a3ff79bceb169c08970034a8402802180e9; observationRecordDigest=b61bf74b0b7f10d10919b702e9853c3910d428c13067ffa6332efafff5c5b135

## 4.24 `TRD2V3-REQ-039` — preserve `TRD2V2-REQ-023`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-023`, binding exactly one `SOE-023` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-023;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,70c1c105ef9b8c92e86b3b6b727a142ffb1c6e131909fa5c5426c570c66e3692),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-023),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-023),SHA256_EQ(SOE-023,958d1603b49d017f6a2056e290b60ffd3a19027926e35055eda93e4f0164440e),EQ(SOE-023.localObservationId,TRD2-MATH-RB-F016),MUTANT_FAILS(TV-INH-023-BYTE),MUTANT_FAILS(TV-INH-023-FIELD),MUTANT_FAILS(TV-INH-023-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-023; sourceLocator=L313-L323; sourceRecordDigest=70c1c105ef9b8c92e86b3b6b727a142ffb1c6e131909fa5c5426c570c66e3692; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-023; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-023; observationSourceParts=MR:L295-L309:1008:5d66a545e9140e9e6e136c2143d0eafa2e5da2cb62a154976c7a4f59f9af7669+MM:L53:251:d98b1d78bdbd9b8d5bf3f92f2d2cae8eb807efdf5aef4bc7953aae122f17c05a; observationRecordDigest=958d1603b49d017f6a2056e290b60ffd3a19027926e35055eda93e4f0164440e

## 4.25 `TRD2V3-REQ-040` — preserve `TRD2V2-REQ-024`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-024`, binding exactly one `SOE-024` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-024;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,7b841e476ec2f665f1a7153ed5c96ad6644bd59336c138301bbc9faffb4f9629),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-024),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-024),SHA256_EQ(SOE-024,6c81e8206b7e05f461be207b90c636c283ff54ddfc1f889c9d13b079a297b4c8),EQ(SOE-024.localObservationId,TRD2-MATH-RB-F017),MUTANT_FAILS(TV-INH-024-BYTE),MUTANT_FAILS(TV-INH-024-FIELD),MUTANT_FAILS(TV-INH-024-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-024; sourceLocator=L325-L335; sourceRecordDigest=7b841e476ec2f665f1a7153ed5c96ad6644bd59336c138301bbc9faffb4f9629; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-024; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-024; observationSourceParts=MR:L311-L325:1056:4262febee9602e5f019dacc6d196771ae93f2bdc290a8813283b6e6c898c2afe+MM:L54:273:accb9181ff6bf7543205cc991f67da5b2033560e33696447a6320f697dc3880c; observationRecordDigest=6c81e8206b7e05f461be207b90c636c283ff54ddfc1f889c9d13b079a297b4c8

## 4.26 `TRD2V3-REQ-041` — preserve `TRD2V2-REQ-025`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-025`, binding exactly one `SOE-025` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-025;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,34700cf752bbc04935149914e3d963423d547ebbb169e5a6853130eb6ba864fe),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-025),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-025),SHA256_EQ(SOE-025,0cfb6ee89eac22247a8e2ed8a3aae3b93b1a0f8992b1cab12a58eae37dce571f),EQ(SOE-025.localObservationId,TRD2-MATH-RB-F018),MUTANT_FAILS(TV-INH-025-BYTE),MUTANT_FAILS(TV-INH-025-FIELD),MUTANT_FAILS(TV-INH-025-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-025; sourceLocator=L337-L347; sourceRecordDigest=34700cf752bbc04935149914e3d963423d547ebbb169e5a6853130eb6ba864fe; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-025; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-025; observationSourceParts=MR:L327-L341:1034:da92af6fe30e4d630b12d063d483e671c36d3f8ca2f58413f9a147d6b2615a00+MM:L55:250:44c96a992d5600e14299eec44769de702b67587faa00ac0cc47fce8057c391d9; observationRecordDigest=0cfb6ee89eac22247a8e2ed8a3aae3b93b1a0f8992b1cab12a58eae37dce571f

## 4.27 `TRD2V3-REQ-042` — preserve `TRD2V2-REQ-026`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-026`, binding exactly one `SOE-026` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-026;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,85c5ed2d14d90cbaa2632764b3456d8e1e1b98d254ab86df42d3cfc46d3d71e4),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-026),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-026),SHA256_EQ(SOE-026,b2dfb03cc7eba8e18362c91d36ab4e223ed77fe3601072edcfd48a639869cf2b),EQ(SOE-026.localObservationId,TRD2-MATH-RB-F019),MUTANT_FAILS(TV-INH-026-BYTE),MUTANT_FAILS(TV-INH-026-FIELD),MUTANT_FAILS(TV-INH-026-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-026; sourceLocator=L349-L359; sourceRecordDigest=85c5ed2d14d90cbaa2632764b3456d8e1e1b98d254ab86df42d3cfc46d3d71e4; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-026; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-026; observationSourceParts=MR:L343-L357:1041:3b2b486bfeb33593bb1763ffbf55b3fa1974e227da2457e0340e729a9d27362e+MM:L56:270:940f67c50b038f62f81cc94eb344635be05375367069abaedeec23ab31ebe1d2; observationRecordDigest=b2dfb03cc7eba8e18362c91d36ab4e223ed77fe3601072edcfd48a639869cf2b

## 4.28 `TRD2V3-REQ-043` — preserve `TRD2V2-REQ-027`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-027`, binding exactly one `SOE-027` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-027;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,9f8e892e7a9bf774787d009c27a48d5efb3acd1016dbe592e55cfbb061df36d3),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-027),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-027),SHA256_EQ(SOE-027,5b72051a657251352042e37bbdd17a96d5853b4b16d74291936dca3733319865),EQ(SOE-027.localObservationId,TRD2-MATH-RB-F020),MUTANT_FAILS(TV-INH-027-BYTE),MUTANT_FAILS(TV-INH-027-FIELD),MUTANT_FAILS(TV-INH-027-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-027; sourceLocator=L361-L371; sourceRecordDigest=9f8e892e7a9bf774787d009c27a48d5efb3acd1016dbe592e55cfbb061df36d3; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-027; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-027; observationSourceParts=MR:L359-L373:1042:be323a8c5a606b1ca0d9d71363bd21e4b7c1e7258734c9f55103a4214f3e00b9+MM:L57:264:21ea23a59146331a697d5746845f26f9a2479f44901bc4e8f05928f54897e924; observationRecordDigest=5b72051a657251352042e37bbdd17a96d5853b4b16d74291936dca3733319865

## 4.29 `TRD2V3-REQ-044` — preserve `TRD2V2-REQ-028`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-028`, binding exactly one `SOE-028` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-028;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,e511d8aa2c60b5c2b7dd517a197d1541828782922eb61d12d0f2016040f2e36d),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-028),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-028),SHA256_EQ(SOE-028,c4177a91f5f534a69a127398a86242f385f72c6e3a4196b120ccdb2a6ca85632),EQ(SOE-028.localObservationId,TRD2-MATH-RB-F021),MUTANT_FAILS(TV-INH-028-BYTE),MUTANT_FAILS(TV-INH-028-FIELD),MUTANT_FAILS(TV-INH-028-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-028; sourceLocator=L373-L383; sourceRecordDigest=e511d8aa2c60b5c2b7dd517a197d1541828782922eb61d12d0f2016040f2e36d; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-028; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-028; observationSourceParts=MR:L375-L389:993:e124e1244c49b08c15d4d7b033baf04ec608ffedcfb8320a0b3c993739288fb4+MM:L58:244:57e3bf6e21850490e293fbf500dd7c82d77e652ac835164b1d70d9aacac0e114; observationRecordDigest=c4177a91f5f534a69a127398a86242f385f72c6e3a4196b120ccdb2a6ca85632

## 4.30 `TRD2V3-REQ-045` — preserve `TRD2V2-REQ-029`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-029`, binding exactly one `SOE-029` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-029;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,c394bd7658d5e3c4fcb496e2be81858761d802d1328a294e4c8c0118daaa19c8),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-029),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-029),SHA256_EQ(SOE-029,e5d9941d37004a08f73768287282ee98fcecd2116732fdda86fc9eb74867c229),EQ(SOE-029.localObservationId,TRD2-MATH-RB-F022),MUTANT_FAILS(TV-INH-029-BYTE),MUTANT_FAILS(TV-INH-029-FIELD),MUTANT_FAILS(TV-INH-029-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-029; sourceLocator=L385-L395; sourceRecordDigest=c394bd7658d5e3c4fcb496e2be81858761d802d1328a294e4c8c0118daaa19c8; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-029; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-029; observationSourceParts=MR:L391-L405:1055:60edf32ee38c70ea3c30b7088c17ba004f4c32280b2a4f9f7d7cc4a06af22bc7+MM:L59:277:34afa60f7dcb8d81a4e333c4734a4cb3baae59b22e59e1f8071a35976ed79ee5; observationRecordDigest=e5d9941d37004a08f73768287282ee98fcecd2116732fdda86fc9eb74867c229

## 4.31 `TRD2V3-REQ-046` — preserve `TRD2V2-REQ-030`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-030`, binding exactly one `SOE-030` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-030;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,296963b61d15341c469205ae93b2b1e04709c16b13ae90ef789c46302766c8a6),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-030),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-030),SHA256_EQ(SOE-030,ee506146231483a13ac18ff29396014c45b387349cbdb75ec9bf0f8b108f5b62),EQ(SOE-030.localObservationId,TRD2-MATH-RB-F023),MUTANT_FAILS(TV-INH-030-BYTE),MUTANT_FAILS(TV-INH-030-FIELD),MUTANT_FAILS(TV-INH-030-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-030; sourceLocator=L397-L407; sourceRecordDigest=296963b61d15341c469205ae93b2b1e04709c16b13ae90ef789c46302766c8a6; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-030; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-030; observationSourceParts=MR:L409-L423:1026:8057f63ebe61e93a9a633514a4d703419d4e01b7029fd653c1b3a4d6ac50499c+MM:L65:242:85a67b0cf3cc1c644deaf9376c268207d4714345a707e3205b77fc36f2e44d7d; observationRecordDigest=ee506146231483a13ac18ff29396014c45b387349cbdb75ec9bf0f8b108f5b62

## 4.32 `TRD2V3-REQ-047` — preserve `TRD2V2-REQ-031`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-031`, binding exactly one `SOE-031` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-031;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,61f1fa924c76183960cd0033738a983bef78a818ae614bfabbcfbd31cdfcb04d),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-031),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-031),SHA256_EQ(SOE-031,e11775da6c61680232d391d04024e757647103ae5966d0b07d6986b927d7420c),EQ(SOE-031.localObservationId,TRD2-MATH-RB-F024),MUTANT_FAILS(TV-INH-031-BYTE),MUTANT_FAILS(TV-INH-031-FIELD),MUTANT_FAILS(TV-INH-031-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-031; sourceLocator=L409-L419; sourceRecordDigest=61f1fa924c76183960cd0033738a983bef78a818ae614bfabbcfbd31cdfcb04d; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-031; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-031; observationSourceParts=MR:L425-L439:970:e15b907eefac5eb30fa7e119e72d98e4f501f7d2e90144e48b223f1b4b1d2c25+MM:L66:234:775bb0c322b74bdf57b6d4d43c3b64aee8504d9fbab96207c69afc51b51c497d; observationRecordDigest=e11775da6c61680232d391d04024e757647103ae5966d0b07d6986b927d7420c

## 4.33 `TRD2V3-REQ-048` — preserve `TRD2V2-REQ-032`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-032`, binding exactly one `SOE-032` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-032;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,cbbc9ba6781df8ca0b0377f223d3e6ce41cb7596a4490fb202c1c836e85fbed5),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-032),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-032),SHA256_EQ(SOE-032,847a6e6629d470ac363599699d86c5225e63204b4deeb4bb614d6bc1853a9cf6),EQ(SOE-032.localObservationId,TRD2-SHR-F001),EQ(MV-008.status,UNRESOLVED),EQ(MV-008.acceptanceEligible,false),MUTANT_FAILS(TV-INH-032-BYTE),MUTANT_FAILS(TV-INH-032-FIELD),MUTANT_FAILS(TV-INH-032-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-032; sourceLocator=L423-L433; sourceRecordDigest=cbbc9ba6781df8ca0b0377f223d3e6ce41cb7596a4490fb202c1c836e85fbed5; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-032; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-032; observationSourceParts=SR:L121-L135:1018:15c00cac78dc9bba9fcc1cb385479b179a0734e0682a23f607790ffccd308346+SM:L33-L53:896:494ace86e9d072e374becd891985e5928aa85ff146cdf5f2dbecabd546f6c927; observationRecordDigest=847a6e6629d470ac363599699d86c5225e63204b4deeb4bb614d6bc1853a9cf6

## 4.34 `TRD2V3-REQ-049` — preserve `TRD2V2-REQ-033`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-033`, binding exactly one `SOE-033` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-033;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,9fd68c83ca3f4cfbc704bd3a510470e424623f08e8d6c487d8f723cdeff34cb9),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-033),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-033),SHA256_EQ(SOE-033,03e31811596862d883c3fda27838a0308ecc837ec6abe76cc99b41a0c93949ff),EQ(SOE-033.localObservationId,TRD2-SHR-F002),EQ(MV-009.status,UNRESOLVED),EQ(MV-009.acceptanceEligible,false),MUTANT_FAILS(TV-INH-033-BYTE),MUTANT_FAILS(TV-INH-033-FIELD),MUTANT_FAILS(TV-INH-033-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-033; sourceLocator=L435-L445; sourceRecordDigest=9fd68c83ca3f4cfbc704bd3a510470e424623f08e8d6c487d8f723cdeff34cb9; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-033; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-033; observationSourceParts=SR:L137-L151:1085:8273f72061bba65d97b143cb5cf8272fe612a3fcce6876d9e0fd39488ec62f95+SM:L55-L75:750:d1a3269f4b6e69aabcb1098a30ea2e597ea9fdbe0d83648efab3bfc35b2f0a00; observationRecordDigest=03e31811596862d883c3fda27838a0308ecc837ec6abe76cc99b41a0c93949ff


## 4.35 `TRD2V3-REQ-050` — preserve `TRD2V2-REQ-034`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-034`, binding exactly one `SOE-034` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-034;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,6fb0605bd9881fef1d266693a42ab10043841b711ec1b51b20a716f2c4bfd7ae),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-034),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-034),SHA256_EQ(SOE-034,4cecd1af4dff90c24fd35c45b9a6dcc632b90d582f715f1ca9c73a3c8e11af0d),EQ(SOE-034.localObservationId,TRD2-SHR-F003),EQ(MV-010.status,UNRESOLVED),EQ(MV-010.acceptanceEligible,false),MUTANT_FAILS(TV-INH-034-BYTE),MUTANT_FAILS(TV-INH-034-FIELD),MUTANT_FAILS(TV-INH-034-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-034; sourceLocator=L447-L457; sourceRecordDigest=6fb0605bd9881fef1d266693a42ab10043841b711ec1b51b20a716f2c4bfd7ae; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-034; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-034; observationSourceParts=SR:L153-L167:1024:0cab9abd16d308e6a67ea0206452a6c982905d43f20293010b4ad5a5a8bfd9ae+SM:L77-L97:810:17887917bbd213dc125b247fe4551f0803f636bbc83efb91e6d971d472006b7e; observationRecordDigest=4cecd1af4dff90c24fd35c45b9a6dcc632b90d582f715f1ca9c73a3c8e11af0d

## 4.36 `TRD2V3-REQ-051` — preserve `TRD2V2-REQ-035`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-035`, binding exactly one `SOE-035` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-035;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,c8d5ee569ec499b3ecb9a474ec7133841b38f923f336bc6492446c8a9ddd5c71),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-035),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-035),SHA256_EQ(SOE-035,2ed4811c91b2ae35f122c0ce11b8617a946b994ae316d04f31facea7d236db67),EQ(SOE-035.localObservationId,TRD2-SHR-F004),EQ(MV-011.status,UNRESOLVED),EQ(MV-011.acceptanceEligible,false),MUTANT_FAILS(TV-INH-035-BYTE),MUTANT_FAILS(TV-INH-035-FIELD),MUTANT_FAILS(TV-INH-035-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-035; sourceLocator=L459-L469; sourceRecordDigest=c8d5ee569ec499b3ecb9a474ec7133841b38f923f336bc6492446c8a9ddd5c71; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-035; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-035; observationSourceParts=SR:L169-L183:1040:39c31419083dd1d259b1861541dc48eeb1210aca3f3654ad6909c4c5770d6f1d+SM:L99-L119:740:d0c463da53e2cacafb8fad795147a9270dd7dd7caa10f677dc16b56c433cb127; observationRecordDigest=2ed4811c91b2ae35f122c0ce11b8617a946b994ae316d04f31facea7d236db67

## 4.37 `TRD2V3-REQ-052` — preserve `TRD2V2-REQ-036`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-036`, binding exactly one `SOE-036` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-036;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,5943cd871785988d9987e20f94f471682853f105f6c8883e35842201cb8648ce),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-036),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-036),SHA256_EQ(SOE-036,5a205c245031d31da545c21ba79caa697ee9592e105d12e7c290e5bf057892bd),EQ(SOE-036.localObservationId,TRD2-SHR-F005),EQ(MV-012.status,UNRESOLVED),EQ(MV-012.acceptanceEligible,false),MUTANT_FAILS(TV-INH-036-BYTE),MUTANT_FAILS(TV-INH-036-FIELD),MUTANT_FAILS(TV-INH-036-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-036; sourceLocator=L471-L481; sourceRecordDigest=5943cd871785988d9987e20f94f471682853f105f6c8883e35842201cb8648ce; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-036; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-036; observationSourceParts=SR:L185-L199:1100:3beac6de5fd22811b02f426c86964b682e5c1d48b0937091f8be66286680abdc+SM:L121-L141:801:acf0ea96371247cd163784d307454e6d9cc1ae1bdd8e497b5b91de75479c0e6f; observationRecordDigest=5a205c245031d31da545c21ba79caa697ee9592e105d12e7c290e5bf057892bd

## 4.38 `TRD2V3-REQ-053` — preserve `TRD2V2-REQ-037`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-037`, binding exactly one `SOE-037` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-037;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,4d56fd7c25c78d63c552d71bf695509e7a6471c23fb4157c9cfcd768b3e50fa7),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-037),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-037),SHA256_EQ(SOE-037,74b1de7e547a13f1a07acb1d39b61ce329b4f1dbf5a7673dcab0e16c5ee1cd6c),EQ(SOE-037.localObservationId,TRD2-SHR-F006),EQ(MV-013.status,UNRESOLVED),EQ(MV-013.acceptanceEligible,false),MUTANT_FAILS(TV-INH-037-BYTE),MUTANT_FAILS(TV-INH-037-FIELD),MUTANT_FAILS(TV-INH-037-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-037; sourceLocator=L483-L493; sourceRecordDigest=4d56fd7c25c78d63c552d71bf695509e7a6471c23fb4157c9cfcd768b3e50fa7; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-037; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-037; observationSourceParts=SR:L201-L215:1306:a79c898650f63282d248a721c784d4bdadfc78b38e68eff566c4c2f6caa74b26+SM:L143-L163:887:b8367dde105be26e9bd2c04b78defafbca4fd282ac97ccdfc965ebcaa9ecc545; observationRecordDigest=74b1de7e547a13f1a07acb1d39b61ce329b4f1dbf5a7673dcab0e16c5ee1cd6c

## 4.39 `TRD2V3-REQ-054` — preserve `TRD2V2-REQ-038`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-038`, binding exactly one `SOE-038` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-038;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,43d1adbff32fdd622e112dbaa6275537d401ad726aae83319218ef191cc8075d),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-038),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-038),SHA256_EQ(SOE-038,5a5618f426eff716fb50ffff38366207905804b87b3cfeb6e4aa4773e96783ec),EQ(SOE-038.localObservationId,TRD2-SHR-F007),EQ(MV-014.status,UNRESOLVED),EQ(MV-014.acceptanceEligible,false),MUTANT_FAILS(TV-INH-038-BYTE),MUTANT_FAILS(TV-INH-038-FIELD),MUTANT_FAILS(TV-INH-038-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-038; sourceLocator=L495-L505; sourceRecordDigest=43d1adbff32fdd622e112dbaa6275537d401ad726aae83319218ef191cc8075d; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-038; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-038; observationSourceParts=SR:L217-L231:914:bb6f72da2e8da60067efcc120694df149b751ccb2628f52d1146905af408a9bd+SM:L165-L185:748:f8092bc296abd64cde65a581abfb15a3f1303d3b3f5fdc503047051981244d7a; observationRecordDigest=5a5618f426eff716fb50ffff38366207905804b87b3cfeb6e4aa4773e96783ec

## 4.40 `TRD2V3-REQ-055` — preserve `TRD2V2-REQ-039`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-039`, binding exactly one `SOE-039` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-039;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,24b3c9e731ca4cc7b3d518d52b1cb82cecb4e66c0e2db4ab44e6ffab5f909b66),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-039),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-039),SHA256_EQ(SOE-039,ccc7a56942b2c376eed8e6510346bd22c998318ae6d26049f81a8b6676be63d8),EQ(SOE-039.localObservationId,TRD2-SHR-F008),EQ(MV-015.status,UNRESOLVED),EQ(MV-015.acceptanceEligible,false),MUTANT_FAILS(TV-INH-039-BYTE),MUTANT_FAILS(TV-INH-039-FIELD),MUTANT_FAILS(TV-INH-039-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-039; sourceLocator=L507-L517; sourceRecordDigest=24b3c9e731ca4cc7b3d518d52b1cb82cecb4e66c0e2db4ab44e6ffab5f909b66; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-039; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-039; observationSourceParts=SR:L233-L247:1010:6e3aa7282a13e95bb86f929b8df3b1da790a7f7c375cfc66adc651a9a662e553+SM:L187-L207:770:4ae1e4b2db733d8dd066a1d80c784c27773a2a101459ac8d35698930a1d32d33; observationRecordDigest=ccc7a56942b2c376eed8e6510346bd22c998318ae6d26049f81a8b6676be63d8

## 4.41 `TRD2V3-REQ-056` — preserve `TRD2V2-REQ-040`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-040`, binding exactly one `SOE-040` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-040;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,d7e58dfba882ec1482f1347fb419445fa82d3c8555de42fadc25b16bfbe1e9c7),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-040),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-040),SHA256_EQ(SOE-040,4b9f04be4cc84a79d3634fd9dbb9a008216f2025bddb264516de4660672032ba),EQ(SOE-040.localObservationId,TRD2-SHR-F009),EQ(MV-016.status,UNRESOLVED),EQ(MV-016.acceptanceEligible,false),MUTANT_FAILS(TV-INH-040-BYTE),MUTANT_FAILS(TV-INH-040-FIELD),MUTANT_FAILS(TV-INH-040-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-040; sourceLocator=L519-L529; sourceRecordDigest=d7e58dfba882ec1482f1347fb419445fa82d3c8555de42fadc25b16bfbe1e9c7; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-040; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-040; observationSourceParts=SR:L249-L263:1005:0fb715d6504f81468dfe78c6d5e9df0befd38d12c0a75bca91d758337c562323+SM:L209-L229:758:df7ceaf4b0f7e154ff914306152d8c5c46759e83c65af932b6196a7003a9f236; observationRecordDigest=4b9f04be4cc84a79d3634fd9dbb9a008216f2025bddb264516de4660672032ba

## 4.42 `TRD2V3-REQ-057` — preserve `TRD2V2-REQ-041`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-041`, binding exactly one `SOE-041` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-041;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,58d50134cde3ca3d3a8de20a0162fdab4bb1e50fc9b6133f544f891458880169),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-041),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-041),SHA256_EQ(SOE-041,157ed5bf00eddf60a4982b66a511187a0d6a70f01b7df4ae927e14cb6da5b182),EQ(SOE-041.localObservationId,TRD2-SHR-F010),EQ(MV-017.status,UNRESOLVED),EQ(MV-017.acceptanceEligible,false),MUTANT_FAILS(TV-INH-041-BYTE),MUTANT_FAILS(TV-INH-041-FIELD),MUTANT_FAILS(TV-INH-041-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-041; sourceLocator=L531-L541; sourceRecordDigest=58d50134cde3ca3d3a8de20a0162fdab4bb1e50fc9b6133f544f891458880169; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-041; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-041; observationSourceParts=SR:L267-L281:879:3c4e6681016c07acbd2aae076260b81212de46d939d20d8f4e473ece96572968+SM:L233-L253:786:d9f7b5cb9332f22ee7ba7d2024fdb45944353ef3a7cfdebbcc34d98558faed66; observationRecordDigest=157ed5bf00eddf60a4982b66a511187a0d6a70f01b7df4ae927e14cb6da5b182

## 4.43 `TRD2V3-REQ-058` — preserve `TRD2V2-REQ-042`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-042`, binding exactly one `SOE-042` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-042;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,399a0b0435c9b2f403bb83f9140cd45ea574f7c7f441d98342f0a763580767b6),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-042),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-042),SHA256_EQ(SOE-042,4e73775904505cdf78f2856220b44d83431a4deb7b7d614215cdcd3a1f2b36c6),EQ(SOE-042.localObservationId,TRD2-SHR-F011),EQ(MV-018.status,UNRESOLVED),EQ(MV-018.acceptanceEligible,false),MUTANT_FAILS(TV-INH-042-BYTE),MUTANT_FAILS(TV-INH-042-FIELD),MUTANT_FAILS(TV-INH-042-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-042; sourceLocator=L543-L553; sourceRecordDigest=399a0b0435c9b2f403bb83f9140cd45ea574f7c7f441d98342f0a763580767b6; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-042; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-042; observationSourceParts=SR:L283-L297:1023:d1c76f61e337d65746032cd042cf7e05496f6d025f549a0719102279192ce516+SM:L255-L275:814:9749eaae73608aad5c52febf900f8ff039ec66bb189f6469cf1f26ee55ec1033; observationRecordDigest=4e73775904505cdf78f2856220b44d83431a4deb7b7d614215cdcd3a1f2b36c6

## 4.44 `TRD2V3-REQ-059` — preserve `TRD2V2-REQ-043`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-043`, binding exactly one `SOE-043` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-043;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,1c2000d2c0868ba820daea83662696331c80510bf5479fece0b26eacce5297e5),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-043),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-043),SHA256_EQ(SOE-043,c6db57dd54b76147ab2167587dc18b4545974a48eca72a23a8fcbdb6d9f08c71),EQ(SOE-043.localObservationId,TRD2-SHR-F012),EQ(MV-019.status,UNRESOLVED),EQ(MV-019.acceptanceEligible,false),MUTANT_FAILS(TV-INH-043-BYTE),MUTANT_FAILS(TV-INH-043-FIELD),MUTANT_FAILS(TV-INH-043-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-043; sourceLocator=L555-L565; sourceRecordDigest=1c2000d2c0868ba820daea83662696331c80510bf5479fece0b26eacce5297e5; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-043; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-043; observationSourceParts=SR:L299-L313:1037:dc6cf2849bb66c2a153ac20a36966f444319d74d99b06a5d93dbbc8ce45f4845+SM:L277-L297:885:54510525eec3f75c9c49f5f2360ff428d6456d5f9314da937215cb073940b50f; observationRecordDigest=c6db57dd54b76147ab2167587dc18b4545974a48eca72a23a8fcbdb6d9f08c71

## 4.45 `TRD2V3-REQ-060` — preserve `TRD2V2-REQ-044`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-044`, binding exactly one `SOE-044` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-044;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,034a17209e7ddc70f9bdf3a5669ea0133458749b0b7abff3ac7526786e6a0a11),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-044),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-044),SHA256_EQ(SOE-044,fecc15c09a7c7b5aa41c7c2744a5d705829a09c17c7e3567b563014d8dfab24f),EQ(SOE-044.localObservationId,TRD2-SHR-F013),EQ(MV-020.status,UNRESOLVED),EQ(MV-020.acceptanceEligible,false),MUTANT_FAILS(TV-INH-044-BYTE),MUTANT_FAILS(TV-INH-044-FIELD),MUTANT_FAILS(TV-INH-044-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-044; sourceLocator=L567-L577; sourceRecordDigest=034a17209e7ddc70f9bdf3a5669ea0133458749b0b7abff3ac7526786e6a0a11; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-044; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-044; observationSourceParts=SR:L315-L329:915:4db2c6b6442ea73e76c717ae7286290c377f8e36e38b29a9d258c92ec2521d33+SM:L299-L319:802:baf462fa1a78d35f914f782da163891d12d1b37d84e76a0bc3d7bced97e94d0a; observationRecordDigest=fecc15c09a7c7b5aa41c7c2744a5d705829a09c17c7e3567b563014d8dfab24f

## 4.46 `TRD2V3-REQ-061` — preserve `TRD2V2-REQ-045`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-045`, binding exactly one `SOE-045` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-045;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,d72cc97f1e399975e75e0392262e65f84ea02dc5b2d7a6d6f541d5ec69715fa0),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-045),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-045),SHA256_EQ(SOE-045,478170fe18f728bfc6ff37e2990a6e3b4b290e92a355c9f6dc0800e960cf3b8c),EQ(SOE-045.localObservationId,TRD2-SHR-F014),EQ(MV-021.status,UNRESOLVED),EQ(MV-021.acceptanceEligible,false),MUTANT_FAILS(TV-INH-045-BYTE),MUTANT_FAILS(TV-INH-045-FIELD),MUTANT_FAILS(TV-INH-045-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-045; sourceLocator=L579-L589; sourceRecordDigest=d72cc97f1e399975e75e0392262e65f84ea02dc5b2d7a6d6f541d5ec69715fa0; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-045; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-045; observationSourceParts=SR:L331-L345:1094:c4cfb6a946ceba5b9c34e37b029d765f13c3ed1f07b66e226914fa32f541e844+SM:L321-L341:855:e868ab5527236ebb4c81b91f6536d77431146248c66812fb6923de22110d8b71; observationRecordDigest=478170fe18f728bfc6ff37e2990a6e3b4b290e92a355c9f6dc0800e960cf3b8c

## 4.47 `TRD2V3-REQ-062` — preserve `TRD2V2-REQ-046`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-046`, binding exactly one `SOE-046` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-046;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,3214d8931e15fa81d5033fa1ab8094d6f6ef51b10830f675db0ccd54de2490ac),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-046),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-046),SHA256_EQ(SOE-046,5fbe14cbce2c766c0a8fdea78c3794500ccec0ee5d204fbf06be4530fb72e057),EQ(SOE-046.localObservationId,TRD2-SHR-F015),EQ(MV-022.status,UNRESOLVED),EQ(MV-022.acceptanceEligible,false),MUTANT_FAILS(TV-INH-046-BYTE),MUTANT_FAILS(TV-INH-046-FIELD),MUTANT_FAILS(TV-INH-046-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-046; sourceLocator=L591-L601; sourceRecordDigest=3214d8931e15fa81d5033fa1ab8094d6f6ef51b10830f675db0ccd54de2490ac; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-046; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-046; observationSourceParts=SR:L347-L361:1029:57621ebd62eeae0ecc67f5a81e16755663aea7b53e920ae237f0c91c95545ccc+SM:L343-L363:786:fc0a002d7d6539d87d35674b140a18ee20136007d358d7e328ddff3625abdbeb; observationRecordDigest=5fbe14cbce2c766c0a8fdea78c3794500ccec0ee5d204fbf06be4530fb72e057

## 4.48 `TRD2V3-REQ-063` — preserve `TRD2V2-REQ-047`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-047`, binding exactly one `SOE-047` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-047;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,0d7b8fb5a76c6f1400bbeed7048a17fdf9e283311637b9660b4e541b8a59cfa7),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-047),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-047),SHA256_EQ(SOE-047,d9f3f6370a1caf0395f9295bb12203b0e2987970118dace2d227ef0e05d0bb7f),EQ(SOE-047.localObservationId,TRD2-SHR-F016),EQ(MV-023.status,UNRESOLVED),EQ(MV-023.acceptanceEligible,false),MUTANT_FAILS(TV-INH-047-BYTE),MUTANT_FAILS(TV-INH-047-FIELD),MUTANT_FAILS(TV-INH-047-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-047; sourceLocator=L603-L613; sourceRecordDigest=0d7b8fb5a76c6f1400bbeed7048a17fdf9e283311637b9660b4e541b8a59cfa7; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-047; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-047; observationSourceParts=SR:L363-L377:1011:832448dd8ffe629cf6be5bfa2949bb760ec4d36a9d5e2e6661ed47ac2c41aa5d+SM:L365-L385:771:960dda768d029659d83ff9750ec0679347247a7faa3a0775859da48b26665756; observationRecordDigest=d9f3f6370a1caf0395f9295bb12203b0e2987970118dace2d227ef0e05d0bb7f

## 4.49 `TRD2V3-REQ-064` — preserve `TRD2V2-REQ-048`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-048`, binding exactly one `SOE-048` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-048;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,762bf4184176fa6e6b0fba02c0d0745f060d278672b6964e1921f6d50a2b41cc),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-048),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-048),SHA256_EQ(SOE-048,44b7c15fe25978ab49fb12c752274d46053de1eee561a64f746116b302f435fe),EQ(SOE-048.localObservationId,TRD2-SHR-F017),EQ(MV-024.status,UNRESOLVED),EQ(MV-024.acceptanceEligible,false),MUTANT_FAILS(TV-INH-048-BYTE),MUTANT_FAILS(TV-INH-048-FIELD),MUTANT_FAILS(TV-INH-048-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-048; sourceLocator=L615-L625; sourceRecordDigest=762bf4184176fa6e6b0fba02c0d0745f060d278672b6964e1921f6d50a2b41cc; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-048; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-048; observationSourceParts=SR:L379-L393:948:0ec4470b1f3a8529c63c7edcbf9606a084efb1e9b03cff313505a155fce55cbc+SM:L387-L407:697:db114a821dbaa2df3f3bc0953d9800e57f8b6e7bfaf874b964667ee830551a3c; observationRecordDigest=44b7c15fe25978ab49fb12c752274d46053de1eee561a64f746116b302f435fe

## 4.50 `TRD2V3-REQ-065` — preserve `TRD2V2-REQ-049`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-049`, binding exactly one `SOE-049` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-049;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,1fba0345d792578f7181c6b452aff7cb1c788ba74c49356107e56a79ea43a33d),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-049),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-049),SHA256_EQ(SOE-049,7587a82c5d578be4285ac6035f68b7fa7e4499fcccdd78b30cc29c04bab2df0a),EQ(SOE-049.localObservationId,TRD2-SHR-F018),EQ(MV-025.status,UNRESOLVED),EQ(MV-025.acceptanceEligible,false),MUTANT_FAILS(TV-INH-049-BYTE),MUTANT_FAILS(TV-INH-049-FIELD),MUTANT_FAILS(TV-INH-049-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-049; sourceLocator=L627-L637; sourceRecordDigest=1fba0345d792578f7181c6b452aff7cb1c788ba74c49356107e56a79ea43a33d; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-049; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-049; observationSourceParts=SR:L395-L409:983:c76627ea84419440304f13d4b3b70c3c1e982408a74e8a0184e40d6a590ae6a2+SM:L409-L429:785:047fc2ffa3af7182f5189ca9927564844f5db6431c2028c8220336135708cf26; observationRecordDigest=7587a82c5d578be4285ac6035f68b7fa7e4499fcccdd78b30cc29c04bab2df0a

## 4.51 `TRD2V3-REQ-066` — preserve `TRD2V2-REQ-050`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-050`, binding exactly one `SOE-050` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-050;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,aa2e1d129b3fb0a94bee7f8abd91ac65b524e843e3cedf7a82482bc51cb2d409),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-050),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-050),SHA256_EQ(SOE-050,6b0218f53d3fdbd70b7856ed0e1a0f7b086868f8619d9c6d079b39863eb3f824),EQ(SOE-050.localObservationId,TRD2-SHR-F019),EQ(MV-026.status,UNRESOLVED),EQ(MV-026.acceptanceEligible,false),MUTANT_FAILS(TV-INH-050-BYTE),MUTANT_FAILS(TV-INH-050-FIELD),MUTANT_FAILS(TV-INH-050-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-050; sourceLocator=L639-L649; sourceRecordDigest=aa2e1d129b3fb0a94bee7f8abd91ac65b524e843e3cedf7a82482bc51cb2d409; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-050; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-050; observationSourceParts=SR:L413-L427:1356:e2813f61eba9b95b1f612cceb8c28ddaad83c09b5230a58ed2025a9d011363b8+SM:L433-L453:926:ac49bc255cb51df276fc57070892e6840e4899ec76dd19eb2e6d9ad5eaa010f3; observationRecordDigest=6b0218f53d3fdbd70b7856ed0e1a0f7b086868f8619d9c6d079b39863eb3f824


## 4.52 `TRD2V3-REQ-067` — preserve `TRD2V2-REQ-051`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-051`, binding exactly one `SOE-051` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-051;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,cad855770d145e37937eca2c9b8c02527eef58b082c9ff61107aa20617cacad5),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-051),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-051),SHA256_EQ(SOE-051,21bc4348f65aa3ee572a29cf92e804392ccde866a193ca94e10bb303686d2ae1),EQ(SOE-051.localObservationId,TRD2-SHR-F020),EQ(MV-027.status,UNRESOLVED),EQ(MV-027.acceptanceEligible,false),MUTANT_FAILS(TV-INH-051-BYTE),MUTANT_FAILS(TV-INH-051-FIELD),MUTANT_FAILS(TV-INH-051-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-005,TRD2V3-REQ-006,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-051; sourceLocator=L651-L661; sourceRecordDigest=cad855770d145e37937eca2c9b8c02527eef58b082c9ff61107aa20617cacad5; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-051; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-051; observationSourceParts=SR:L429-L443:1084:0828d28d3886005383776fb3552cbe65b26ca84af07f658f24807392d2dd115c+SM:L455-L475:843:cd0f62617e2b34cf0e62dc8377eaf6ffa5b22efbe49e2c99a2ad2d486d0a006c; observationRecordDigest=21bc4348f65aa3ee572a29cf92e804392ccde866a193ca94e10bb303686d2ae1

## 4.53 `TRD2V3-REQ-068` — preserve `TRD2V2-REQ-052`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-052`, binding exactly one `SOE-052` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-052;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,dcceaae32897ac5b5ab37aab644697e840e75b72f0c553705879d5921194018f),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-052),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-052),SHA256_EQ(SOE-052,3b6c9f10352c8bfbb9b04e8f0808e18fb1472417393e03af0c1e8e82e21a62ad),EQ(SOE-052.localObservationId,TRD2-SHR-A-20260829-F001),MUTANT_FAILS(TV-INH-052-BYTE),MUTANT_FAILS(TV-INH-052-FIELD),MUTANT_FAILS(TV-INH-052-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-052; sourceLocator=L665-L675; sourceRecordDigest=dcceaae32897ac5b5ab37aab644697e840e75b72f0c553705879d5921194018f; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-052; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-052; observationSourceParts=AR:L109-L127:1258:4440a975f455671e77f901bbc2a8e0af4514cbde3def291b9fe82995ec94e476; observationRecordDigest=3b6c9f10352c8bfbb9b04e8f0808e18fb1472417393e03af0c1e8e82e21a62ad

## 4.54 `TRD2V3-REQ-069` — preserve `TRD2V2-REQ-053`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-053`, binding exactly one `SOE-053` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-053;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,eaef598923ed293f2704f7b90f6e8ad210ab8bb1d58e0dfe34d998849ca67c16),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-053),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-053),SHA256_EQ(SOE-053,f5ff98dd6a5d53d4e9c7b174ead4d76adad3d7dd0e1c267fcd627bb7cff9111f),EQ(SOE-053.localObservationId,TRD2-SHR-A-20260829-F002),MUTANT_FAILS(TV-INH-053-BYTE),MUTANT_FAILS(TV-INH-053-FIELD),MUTANT_FAILS(TV-INH-053-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-068]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-053; sourceLocator=L677-L687; sourceRecordDigest=eaef598923ed293f2704f7b90f6e8ad210ab8bb1d58e0dfe34d998849ca67c16; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-053; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-053; observationSourceParts=AR:L129-L147:1573:11876a0f613ea574c6aa53e46b3e4623fdbfbc6e511625f9b4cddd35e0d5fe78; observationRecordDigest=f5ff98dd6a5d53d4e9c7b174ead4d76adad3d7dd0e1c267fcd627bb7cff9111f

## 4.55 `TRD2V3-REQ-070` — preserve `TRD2V2-REQ-054`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-054`, binding exactly one `SOE-054` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-054;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,a5b48999af2b4bb04a7f0bf4f4a63475752e81e5061b200d894d7bd7374d3b53),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-054),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-054),SHA256_EQ(SOE-054,4f8d79a87753542b189de6178d7fb363b43a0fb399def209a58951ec8bc2a619),EQ(SOE-054.localObservationId,TRD2-SHR-A-20260829-F003),MUTANT_FAILS(TV-INH-054-BYTE),MUTANT_FAILS(TV-INH-054-FIELD),MUTANT_FAILS(TV-INH-054-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-068,TRD2V3-REQ-069]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-054; sourceLocator=L689-L699; sourceRecordDigest=a5b48999af2b4bb04a7f0bf4f4a63475752e81e5061b200d894d7bd7374d3b53; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-054; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-054; observationSourceParts=AR:L149-L167:1382:18dc9de65fc0fff57172f1082c575dafac390b6542529e33682984a54b42ac3c; observationRecordDigest=4f8d79a87753542b189de6178d7fb363b43a0fb399def209a58951ec8bc2a619

## 4.56 `TRD2V3-REQ-071` — preserve `TRD2V2-REQ-055`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-055`, binding exactly one `SOE-055` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-055;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,dc5d0227a1deb52a108a9befbe79f771ff3c57e86580f121f192d5e195b3982b),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-055),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-055),SHA256_EQ(SOE-055,3a54cb2f9e09ca2353a95547bd9d04ba03602c8b96519e79269f2020ec3a057a),EQ(SOE-055.localObservationId,TRD2-SHR-A-20260829-F004),MUTANT_FAILS(TV-INH-055-BYTE),MUTANT_FAILS(TV-INH-055-FIELD),MUTANT_FAILS(TV-INH-055-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-070]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-055; sourceLocator=L701-L711; sourceRecordDigest=dc5d0227a1deb52a108a9befbe79f771ff3c57e86580f121f192d5e195b3982b; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-055; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-055; observationSourceParts=AR:L169-L187:1412:3cefc933b254a2c26c274dba5ad751693ac1694f913f6bd5e1d13f64eb98ecff; observationRecordDigest=3a54cb2f9e09ca2353a95547bd9d04ba03602c8b96519e79269f2020ec3a057a

## 4.57 `TRD2V3-REQ-072` — preserve `TRD2V2-REQ-056`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-056`, binding exactly one `SOE-056` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-056;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,b43fc0c14e4308332834f53d5a6e8811cd3da790f09a0059cf8527e30654394f),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-056),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-056),SHA256_EQ(SOE-056,23a248d7eedc74a45576f366ea5b596a277c5063190f76580f4784a248176511),EQ(SOE-056.localObservationId,TRD2-SHR-A-20260829-F005),MUTANT_FAILS(TV-INH-056-BYTE),MUTANT_FAILS(TV-INH-056-FIELD),MUTANT_FAILS(TV-INH-056-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-071]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-056; sourceLocator=L713-L723; sourceRecordDigest=b43fc0c14e4308332834f53d5a6e8811cd3da790f09a0059cf8527e30654394f; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-056; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-056; observationSourceParts=AR:L189-L207:1381:cd71b5bc009476b3f0bca9ffb03c396a149c97ca224261606b88c35b0debc188; observationRecordDigest=23a248d7eedc74a45576f366ea5b596a277c5063190f76580f4784a248176511

## 4.58 `TRD2V3-REQ-073` — preserve `TRD2V2-REQ-057`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-057`, binding exactly one `SOE-057` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-057;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,a5841db9667627295525c2f46c7f6855e39b39546f22d842aac623576f039982),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-057),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-057),SHA256_EQ(SOE-057,3e78f15fa19a46890a5d264ced3d248ab309f0b77a11d5769f20ff3659950e88),EQ(SOE-057.localObservationId,TRD2-SHR-A-20260829-F006),MUTANT_FAILS(TV-INH-057-BYTE),MUTANT_FAILS(TV-INH-057-FIELD),MUTANT_FAILS(TV-INH-057-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-072]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-057; sourceLocator=L725-L735; sourceRecordDigest=a5841db9667627295525c2f46c7f6855e39b39546f22d842aac623576f039982; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-057; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-057; observationSourceParts=AR:L209-L227:1304:962e108819f7578728934c69f989435552944ee615a56dde543b0c9114e636d5; observationRecordDigest=3e78f15fa19a46890a5d264ced3d248ab309f0b77a11d5769f20ff3659950e88

## 4.59 `TRD2V3-REQ-074` — preserve `TRD2V2-REQ-058`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-058`, binding exactly one `SOE-058` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-058;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,0bad99c5a6215e37d8458c481857904b2c76cfa6c2930d8ee90c12a4382812f2),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-058),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-058),SHA256_EQ(SOE-058,6bbae36e3d6e5134d44c4102ebf32f8587ead3f922a4c44a730496df9d15cab7),EQ(SOE-058.localObservationId,TRD2-SHR-A-20260829-F007),MUTANT_FAILS(TV-INH-058-BYTE),MUTANT_FAILS(TV-INH-058-FIELD),MUTANT_FAILS(TV-INH-058-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-070,TRD2V3-REQ-072]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-058; sourceLocator=L737-L747; sourceRecordDigest=0bad99c5a6215e37d8458c481857904b2c76cfa6c2930d8ee90c12a4382812f2; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-058; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-058; observationSourceParts=AR:L229-L247:1364:073d2bd6c100bf88e8c12d8bc81928704d461bf26759309f0c71f2f04a30e3f0; observationRecordDigest=6bbae36e3d6e5134d44c4102ebf32f8587ead3f922a4c44a730496df9d15cab7

## 4.60 `TRD2V3-REQ-075` — preserve `TRD2V2-REQ-059`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-059`, binding exactly one `SOE-059` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-059;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,ec1b257d3490555e30b74e00f95228ebc8fb416e611c5e2bd4ddb9db774733bc),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-059),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-059),SHA256_EQ(SOE-059,96fddc2517d22571aa32e0e44901c07ebb404602d393198e7f6f89f0021e56b1),EQ(SOE-059.localObservationId,TRD2-SHR-A-20260829-F008),MUTANT_FAILS(TV-INH-059-BYTE),MUTANT_FAILS(TV-INH-059-FIELD),MUTANT_FAILS(TV-INH-059-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-071]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-059; sourceLocator=L749-L759; sourceRecordDigest=ec1b257d3490555e30b74e00f95228ebc8fb416e611c5e2bd4ddb9db774733bc; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-059; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-059; observationSourceParts=AR:L249-L267:1191:45c7603551f5bb22a1f5dc145ded4018e4e2fa10f39b240584d26645e74c6716; observationRecordDigest=96fddc2517d22571aa32e0e44901c07ebb404602d393198e7f6f89f0021e56b1

## 4.61 `TRD2V3-REQ-076` — preserve `TRD2V2-REQ-060`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-060`, binding exactly one `SOE-060` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-060;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,5bf0b33b11d2d1ffc135cd9e7b3aec517c7416c1f064587ecdb2a087ee0a2e05),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-060),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-060),SHA256_EQ(SOE-060,a656f19e65cf157f27143f153ff6bc60a80ef7271b13a288ea24404d635a172e),EQ(SOE-060.localObservationId,TRD2-SHR-A-20260829-F009),MUTANT_FAILS(TV-INH-060-BYTE),MUTANT_FAILS(TV-INH-060-FIELD),MUTANT_FAILS(TV-INH-060-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-071]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-060; sourceLocator=L761-L771; sourceRecordDigest=5bf0b33b11d2d1ffc135cd9e7b3aec517c7416c1f064587ecdb2a087ee0a2e05; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-060; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-060; observationSourceParts=AR:L269-L287:1179:8741f9c6ecb456cae5e344027a2c81d08f2485274411a5b95bc45103cb650162; observationRecordDigest=a656f19e65cf157f27143f153ff6bc60a80ef7271b13a288ea24404d635a172e

## 4.62 `TRD2V3-REQ-077` — preserve `TRD2V2-REQ-061`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-061`, binding exactly one `SOE-061` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-061;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,d8d0b218d6bc2db07f79b5be6f810efb4eb2838bb8f4bab76d453b9032c41aad),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-061),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-061),SHA256_EQ(SOE-061,2a7e60a1586bad1809a8d509949a59e7c05e8ae701e4d4ca4cf30afdf32bcef0),EQ(SOE-061.localObservationId,TRD2-SHR-A-20260829-F010),MUTANT_FAILS(TV-INH-061-BYTE),MUTANT_FAILS(TV-INH-061-FIELD),MUTANT_FAILS(TV-INH-061-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-070,TRD2V3-REQ-074]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-061; sourceLocator=L773-L783; sourceRecordDigest=d8d0b218d6bc2db07f79b5be6f810efb4eb2838bb8f4bab76d453b9032c41aad; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-061; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-061; observationSourceParts=AR:L289-L307:1295:81d1c5c0e12f96829e3f46aedae42a3185959f05803f708aff4c570ada5a1085; observationRecordDigest=2a7e60a1586bad1809a8d509949a59e7c05e8ae701e4d4ca4cf30afdf32bcef0

## 4.63 `TRD2V3-REQ-078` — preserve `TRD2V2-REQ-062`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-062`, binding exactly one `SOE-062` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-062;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,03ce14f489fec10f14ebd9279ae65f2ba8da049c81bc448ed48a12c567bbb8df),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-062),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-062),SHA256_EQ(SOE-062,90ba09353031bf8f84808720fc9090b657ba9227981666c7ed25490a5e156e44),EQ(SOE-062.localObservationId,TRD2-SHR-A-20260829-F011),MUTANT_FAILS(TV-INH-062-BYTE),MUTANT_FAILS(TV-INH-062-FIELD),MUTANT_FAILS(TV-INH-062-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-077]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-062; sourceLocator=L785-L795; sourceRecordDigest=03ce14f489fec10f14ebd9279ae65f2ba8da049c81bc448ed48a12c567bbb8df; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-062; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-062; observationSourceParts=AR:L309-L327:1399:0f9fd3d346a7acf1b2f06c06d65faaa9fc4bff2e739b4fc85488601e4afef47a; observationRecordDigest=90ba09353031bf8f84808720fc9090b657ba9227981666c7ed25490a5e156e44

## 4.64 `TRD2V3-REQ-079` — preserve `TRD2V2-REQ-063`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-063`, binding exactly one `SOE-063` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-063;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,8cd0352abdf445d88028c6e68208211a61708d91e82fac538c89c0b3ad725180),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-063),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-063),SHA256_EQ(SOE-063,4d5252bdf106b3a19c14ca0951009c79a38e9b209bc78755dc02b7626432f34a),EQ(SOE-063.localObservationId,TRD2-SHR-A-20260829-F012),MUTANT_FAILS(TV-INH-063-BYTE),MUTANT_FAILS(TV-INH-063-FIELD),MUTANT_FAILS(TV-INH-063-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-070]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-063; sourceLocator=L797-L807; sourceRecordDigest=8cd0352abdf445d88028c6e68208211a61708d91e82fac538c89c0b3ad725180; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-063; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-063; observationSourceParts=AR:L329-L347:1209:2adba4724a5feb73fcaf2a6fb96547de4f44811aa4da3d3b5c1a1690c9713840; observationRecordDigest=4d5252bdf106b3a19c14ca0951009c79a38e9b209bc78755dc02b7626432f34a

## 4.65 `TRD2V3-REQ-080` — preserve `TRD2V2-REQ-064`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-064`, binding exactly one `SOE-064` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-064;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,ae48dac33391613fa97dfbb391984a36169b5decbd2c5b973b3e98882f904ee3),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-064),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-064),SHA256_EQ(SOE-064,d78086c0bbd5459c06aed44f12bc4d7c31d13ed1e241cc428c51a1dca5a5025f),EQ(SOE-064.localObservationId,TRD2-SHR-A-20260829-F013),MUTANT_FAILS(TV-INH-064-BYTE),MUTANT_FAILS(TV-INH-064-FIELD),MUTANT_FAILS(TV-INH-064-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-079]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-064; sourceLocator=L809-L819; sourceRecordDigest=ae48dac33391613fa97dfbb391984a36169b5decbd2c5b973b3e98882f904ee3; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-064; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-064; observationSourceParts=AR:L349-L367:1180:e8326ac3a4d4217296bd2c15473e412dd8952422f3f12408cf310606f2be3f69; observationRecordDigest=d78086c0bbd5459c06aed44f12bc4d7c31d13ed1e241cc428c51a1dca5a5025f

## 4.66 `TRD2V3-REQ-081` — preserve `TRD2V2-REQ-065`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-065`, binding exactly one `SOE-065` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-065;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,c354159779c25f57d1d4ecd25f75d8c5062ea847fd970a6feaf6f1601566d278),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-065),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-065),SHA256_EQ(SOE-065,7e39264b1909c39f1dc5109d66516838d48929f769383016ce03f90417d21ce0),EQ(SOE-065.localObservationId,TRD2-SHR-A-20260829-F014),MUTANT_FAILS(TV-INH-065-BYTE),MUTANT_FAILS(TV-INH-065-FIELD),MUTANT_FAILS(TV-INH-065-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-071,TRD2V3-REQ-076]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-065; sourceLocator=L821-L831; sourceRecordDigest=c354159779c25f57d1d4ecd25f75d8c5062ea847fd970a6feaf6f1601566d278; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-065; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-065; observationSourceParts=AR:L369-L387:1310:0372ed7ccd733d6201903fbbfb4d9acd52100fb34d6fe1a5f1ef25890e84aa82; observationRecordDigest=7e39264b1909c39f1dc5109d66516838d48929f769383016ce03f90417d21ce0

## 4.67 `TRD2V3-REQ-082` — preserve `TRD2V2-REQ-066`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-066`, binding exactly one `SOE-066` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-066;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,4211ce27a87c6fffed6554604248d65ebc82e9bd13c780c66b1fcd651ffd9cd5),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-066),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-066),SHA256_EQ(SOE-066,7f077cf54b6671fc98c9d5793f1f9acbfc9fc17b34de902a1c37cc3a2cb7cdb5),EQ(SOE-066.localObservationId,TRD2-SHR-A-20260829-F015),MUTANT_FAILS(TV-INH-066-BYTE),MUTANT_FAILS(TV-INH-066-FIELD),MUTANT_FAILS(TV-INH-066-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-070]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-066; sourceLocator=L833-L843; sourceRecordDigest=4211ce27a87c6fffed6554604248d65ebc82e9bd13c780c66b1fcd651ffd9cd5; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-066; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-066; observationSourceParts=AR:L391-L409:1070:41eb4c19f0d8b3e6459631faf4e3c646a9562a252d6c5cdb5868b90331afa163; observationRecordDigest=7f077cf54b6671fc98c9d5793f1f9acbfc9fc17b34de902a1c37cc3a2cb7cdb5

## 4.68 `TRD2V3-REQ-083` — preserve `TRD2V2-REQ-067`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-067`, binding exactly one `SOE-067` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-067;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,7419b02d0c23d7d67e83488540ac9a282903573281d6ae3cf27822d00155d300),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-067),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-067),SHA256_EQ(SOE-067,83dc48b184eb5656b00954d66a7db5988e069be7c09b5248e50fbc92f70c75b1),EQ(SOE-067.localObservationId,TRD2-SHR-A-20260829-F016),MUTANT_FAILS(TV-INH-067-BYTE),MUTANT_FAILS(TV-INH-067-FIELD),MUTANT_FAILS(TV-INH-067-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-082]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-067; sourceLocator=L845-L855; sourceRecordDigest=7419b02d0c23d7d67e83488540ac9a282903573281d6ae3cf27822d00155d300; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-067; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-067; observationSourceParts=AR:L411-L429:1105:cb3659a77bda65a763a42a533e88f9d5bce92ed49ab322bad4daff959b4b91b2; observationRecordDigest=83dc48b184eb5656b00954d66a7db5988e069be7c09b5248e50fbc92f70c75b1


## 4.69 `TRD2V3-REQ-084` — preserve `TRD2V2-REQ-068`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-068`, binding exactly one `SOE-068` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-068;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,be80ad0d203b8f0a427d1dd3e1d73897d672be578f14a7c48fab9cefe8432353),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-068),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-068),SHA256_EQ(SOE-068,e140e3c1fc837091f4a8c3efd77b5dbee1638e1fd696345e4037c0575156e566),EQ(SOE-068.localObservationId,TRD2-SHR-A-20260829-F017),MUTANT_FAILS(TV-INH-068-BYTE),MUTANT_FAILS(TV-INH-068-FIELD),MUTANT_FAILS(TV-INH-068-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-076,TRD2V3-REQ-083]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-068; sourceLocator=L857-L867; sourceRecordDigest=be80ad0d203b8f0a427d1dd3e1d73897d672be578f14a7c48fab9cefe8432353; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-068; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-068; observationSourceParts=AR:L431-L449:1175:a08d3d9457f2c18f188faa8180f4f33eb0c35a07810fa0aee077a1597c8bbc80; observationRecordDigest=e140e3c1fc837091f4a8c3efd77b5dbee1638e1fd696345e4037c0575156e566

## 4.70 `TRD2V3-REQ-085` — preserve `TRD2V2-REQ-069`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-069`, binding exactly one `SOE-069` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-069;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,f74558cd756f499e0a46ebebada7cb06405c0285669cbe5b4d0e8c5c210ca785),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-069),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-069),SHA256_EQ(SOE-069,57c96dad3c43759f7ca419324a3ba581d2aca93f1899511622465db5c62fba4c),EQ(SOE-069.localObservationId,TRD2-SHR-A-20260829-F018),MUTANT_FAILS(TV-INH-069-BYTE),MUTANT_FAILS(TV-INH-069-FIELD),MUTANT_FAILS(TV-INH-069-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-082,TRD2V3-REQ-084]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-069; sourceLocator=L869-L879; sourceRecordDigest=f74558cd756f499e0a46ebebada7cb06405c0285669cbe5b4d0e8c5c210ca785; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-069; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-069; observationSourceParts=AR:L451-L469:1225:c9e219859b0b558b428d0403702a415ca19411837524e66c58154b48588a9022; observationRecordDigest=57c96dad3c43759f7ca419324a3ba581d2aca93f1899511622465db5c62fba4c

## 4.71 `TRD2V3-REQ-086` — preserve `TRD2V2-REQ-070`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-070`, binding exactly one `SOE-070` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-070;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,d63423b0ef60ac13b73c4f74d4b3ed72abc5ad5d17776f1d6a1b207b4702de05),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-070),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-070),SHA256_EQ(SOE-070,7df6db83f30a275229a74490abf9e632f41bfc943bee849f90ea73c174eb4688),EQ(SOE-070.localObservationId,TRD2-SHR-A-20260829-F019),MUTANT_FAILS(TV-INH-070-BYTE),MUTANT_FAILS(TV-INH-070-FIELD),MUTANT_FAILS(TV-INH-070-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-070]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-070; sourceLocator=L881-L891; sourceRecordDigest=d63423b0ef60ac13b73c4f74d4b3ed72abc5ad5d17776f1d6a1b207b4702de05; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-070; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-070; observationSourceParts=AR:L471-L489:1207:e85076fd42034a05a13df7569a8fc2931202a6b4c06fdd63767deb3ce4b02e4a; observationRecordDigest=7df6db83f30a275229a74490abf9e632f41bfc943bee849f90ea73c174eb4688

## 4.72 `TRD2V3-REQ-087` — preserve `TRD2V2-REQ-071`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-071`, binding exactly one `SOE-071` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-071;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,f8404b8e5c2e326acf6a2563a993cfd3b34eda1312bf1a680b49757b29873aa7),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-071),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-071),SHA256_EQ(SOE-071,a1bb7304005f8d74cddeddd613713645d3f2b328d637b1ad591d6c076ecd629c),EQ(SOE-071.localObservationId,TRD2-SHR-A-20260829-F020),MUTANT_FAILS(TV-INH-071-BYTE),MUTANT_FAILS(TV-INH-071-FIELD),MUTANT_FAILS(TV-INH-071-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-076]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-071; sourceLocator=L893-L903; sourceRecordDigest=f8404b8e5c2e326acf6a2563a993cfd3b34eda1312bf1a680b49757b29873aa7; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-071; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-071; observationSourceParts=AR:L491-L509:1088:4bbe9ffa872ffebcab33713bada8bbf11082144d566e14fcecc105164c7aee2c; observationRecordDigest=a1bb7304005f8d74cddeddd613713645d3f2b328d637b1ad591d6c076ecd629c

## 4.73 `TRD2V3-REQ-088` — preserve `TRD2V2-REQ-072`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-072`, binding exactly one `SOE-072` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-072;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,90010530e54bf985cb017f897d7b99d1a40b97271a0cbda694a99df469ba5f60),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-072),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-072),SHA256_EQ(SOE-072,2abf3da7eb1dd75968ff4affd05bf7e08db4b2a210e1116b7ccac07221d185d8),EQ(SOE-072.localObservationId,TRD2-SHR-A-20260829-F021),MUTANT_FAILS(TV-INH-072-BYTE),MUTANT_FAILS(TV-INH-072-FIELD),MUTANT_FAILS(TV-INH-072-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-070,TRD2V3-REQ-087]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-072; sourceLocator=L905-L915; sourceRecordDigest=90010530e54bf985cb017f897d7b99d1a40b97271a0cbda694a99df469ba5f60; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-072; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-072; observationSourceParts=AR:L511-L529:1281:ca6a8b735f33b49b4e1c73d67f6bbd826c3102fb4a6f8be608d05bf29353fc8c; observationRecordDigest=2abf3da7eb1dd75968ff4affd05bf7e08db4b2a210e1116b7ccac07221d185d8

## 4.74 `TRD2V3-REQ-089` — preserve `TRD2V2-REQ-073`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-073`, binding exactly one `SOE-073` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-073;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,8f8357518086a188b7b0f9c8f73274aa06d828286a527e90bf7dceda25509d94),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-073),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-073),SHA256_EQ(SOE-073,135a0394aaf37a4f8234e972f48a26d1bd20bbe2a7711c57873a87e4c1fd25ad),EQ(SOE-073.localObservationId,TRD2-SHR-A-20260829-F022),MUTANT_FAILS(TV-INH-073-BYTE),MUTANT_FAILS(TV-INH-073-FIELD),MUTANT_FAILS(TV-INH-073-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-071]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-073; sourceLocator=L917-L927; sourceRecordDigest=8f8357518086a188b7b0f9c8f73274aa06d828286a527e90bf7dceda25509d94; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-073; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-073; observationSourceParts=AR:L531-L549:1176:5ad47bf61b7578278e58f937ef85a05c52c33f78b3ba11f5a56c9fbe0c0cfdbc; observationRecordDigest=135a0394aaf37a4f8234e972f48a26d1bd20bbe2a7711c57873a87e4c1fd25ad

## 4.75 `TRD2V3-REQ-090` — preserve `TRD2V2-REQ-074`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-074`, binding exactly one `SOE-074` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-074;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,84eaa7b7e05635f56b32c32ed038151e00c1683fdebc35731a1a6cc745477ea4),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-074),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-074),SHA256_EQ(SOE-074,8ca5cfb301cf00760967fd929806acef65264709c6df46f7f9b43862410c403a),EQ(SOE-074.localObservationId,TRD2-SHR-A-20260829-F023),MUTANT_FAILS(TV-INH-074-BYTE),MUTANT_FAILS(TV-INH-074-FIELD),MUTANT_FAILS(TV-INH-074-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-076,TRD2V3-REQ-086]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-074; sourceLocator=L929-L939; sourceRecordDigest=84eaa7b7e05635f56b32c32ed038151e00c1683fdebc35731a1a6cc745477ea4; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-074; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-074; observationSourceParts=AR:L551-L569:1257:7c576ecc5a11632ea5068c7697bf0b87199527b22c8a64905dfad2d7169833d5; observationRecordDigest=8ca5cfb301cf00760967fd929806acef65264709c6df46f7f9b43862410c403a

## 4.76 `TRD2V3-REQ-091` — preserve `TRD2V2-REQ-075`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-075`, binding exactly one `SOE-075` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-075;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,9912d824d3a8d692ac78b71ca95440b92997a5cd6e1d0553eab65ef05885a097),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-075),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-075),SHA256_EQ(SOE-075,db4960a37f535ce638031bd1e9eb5268f9c2c978d5ff744d53a03dbd108254bb),EQ(SOE-075.localObservationId,TRD2-SHR-A-20260829-F024),MUTANT_FAILS(TV-INH-075-BYTE),MUTANT_FAILS(TV-INH-075-FIELD),MUTANT_FAILS(TV-INH-075-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-074,TRD2V3-REQ-090]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-075; sourceLocator=L941-L951; sourceRecordDigest=9912d824d3a8d692ac78b71ca95440b92997a5cd6e1d0553eab65ef05885a097; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-075; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-075; observationSourceParts=AR:L571-L589:1192:ee838950eaaf086cfc48862dcfd8a840f0bfdc82cc8359985bf1ef330ec88ae3; observationRecordDigest=db4960a37f535ce638031bd1e9eb5268f9c2c978d5ff744d53a03dbd108254bb

## 4.77 `TRD2V3-REQ-092` — preserve `TRD2V2-REQ-076`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-076`, binding exactly one `SOE-076` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-076;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,665f7de4fc5dbca889963569f8ac8c5d0a6c3d1cf612fb1daf30a25942fd57cd),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-076),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-076),SHA256_EQ(SOE-076,34ecdea05e22dd3ff9130ad90b1eb4fc1a581c7230bd3b681ba940758995f632),EQ(SOE-076.localObservationId,TRD2-SHR-A-20260829-F025),MUTANT_FAILS(TV-INH-076-BYTE),MUTANT_FAILS(TV-INH-076-FIELD),MUTANT_FAILS(TV-INH-076-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-090,TRD2V3-REQ-091]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-076; sourceLocator=L953-L963; sourceRecordDigest=665f7de4fc5dbca889963569f8ac8c5d0a6c3d1cf612fb1daf30a25942fd57cd; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-076; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-076; observationSourceParts=AR:L591-L609:1149:3ca6fa8ac9bcec1a186daa60ab26d4f874cdbe3885292c9822c072f380cc0967; observationRecordDigest=34ecdea05e22dd3ff9130ad90b1eb4fc1a581c7230bd3b681ba940758995f632

## 4.78 `TRD2V3-REQ-093` — preserve `TRD2V2-REQ-077`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-077`, binding exactly one `SOE-077` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-077;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,1dd1f997fb8d1e97f63df2fbedfa098a3d85e02ccfc54b2c572d8f88ab059ba8),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-077),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-077),SHA256_EQ(SOE-077,06515687a99115b4d40677df68977bc360348377eb36d239585d7e445d9b00c9),EQ(SOE-077.localObservationId,TRD2-SHR-A-20260829-F026),MUTANT_FAILS(TV-INH-077-BYTE),MUTANT_FAILS(TV-INH-077-FIELD),MUTANT_FAILS(TV-INH-077-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-084,TRD2V3-REQ-091]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-077; sourceLocator=L965-L975; sourceRecordDigest=1dd1f997fb8d1e97f63df2fbedfa098a3d85e02ccfc54b2c572d8f88ab059ba8; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-077; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-077; observationSourceParts=AR:L611-L629:1150:acc0bb0bbcadc3116f823b1b3498565216d0ca3cf17d72ff292c01dd238381da; observationRecordDigest=06515687a99115b4d40677df68977bc360348377eb36d239585d7e445d9b00c9

## 4.79 `TRD2V3-REQ-094` — preserve `TRD2V2-REQ-078`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-078`, binding exactly one `SOE-078` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-078;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,ac06d076bbff0077c6fa0f51e550095d3cf90cc8569f9e6a76947be4017d104d),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-078),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-078),SHA256_EQ(SOE-078,4e4df71a0cba97a694986e5bd121d4fe43e5df5ebe70e4fb339a79a4a07fa4f6),EQ(SOE-078.localObservationId,TRD2-SHR-A-20260829-F027),MUTANT_FAILS(TV-INH-078-BYTE),MUTANT_FAILS(TV-INH-078-FIELD),MUTANT_FAILS(TV-INH-078-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-088,TRD2V3-REQ-091]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-078; sourceLocator=L977-L987; sourceRecordDigest=ac06d076bbff0077c6fa0f51e550095d3cf90cc8569f9e6a76947be4017d104d; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-078; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-078; observationSourceParts=AR:L631-L649:1208:c457075fc25a02e5debc1e9f7662977348656681802318f31209c3cc9f54338e; observationRecordDigest=4e4df71a0cba97a694986e5bd121d4fe43e5df5ebe70e4fb339a79a4a07fa4f6

## 4.80 `TRD2V3-REQ-095` — preserve `TRD2V2-REQ-079`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-079`, binding exactly one `SOE-079` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-079;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,2903c64aa4c7500d964ada2f01abe0006e7ce66c5139353ea9ee7052363b4a66),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-079),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-079),SHA256_EQ(SOE-079,e1c0805693dc2acc75af33b31ff28fccb0f24d93cf4f1d1b92e96122eb174143),EQ(SOE-079.localObservationId,TRD2-SHR-A-20260829-F028),MUTANT_FAILS(TV-INH-079-BYTE),MUTANT_FAILS(TV-INH-079-FIELD),MUTANT_FAILS(TV-INH-079-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-091]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-079; sourceLocator=L989-L999; sourceRecordDigest=2903c64aa4c7500d964ada2f01abe0006e7ce66c5139353ea9ee7052363b4a66; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-079; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-079; observationSourceParts=AR:L651-L669:1219:fc2d0a15f2bfa56b0ff802982ecbdfc0b52866c26da427fe7f3d2471600f9380; observationRecordDigest=e1c0805693dc2acc75af33b31ff28fccb0f24d93cf4f1d1b92e96122eb174143

## 4.81 `TRD2V3-REQ-096` — preserve `TRD2V2-REQ-080`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-080`, binding exactly one `SOE-080` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-080;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,44a9bbb0c91cc647752aa9003a0be3465524b358d60dc0548d38127c3497be65),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-080),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-080),SHA256_EQ(SOE-080,9f1fb95b7ea84cf8a54a6672e7b23baf2069eb1d8cee2c7b7ed6826e871275d2),EQ(SOE-080.localObservationId,TRD2-SHR-A-20260829-F029),MUTANT_FAILS(TV-INH-080-BYTE),MUTANT_FAILS(TV-INH-080-FIELD),MUTANT_FAILS(TV-INH-080-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-081,TRD2V3-REQ-090]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-080; sourceLocator=L1001-L1011; sourceRecordDigest=44a9bbb0c91cc647752aa9003a0be3465524b358d60dc0548d38127c3497be65; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-080; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-080; observationSourceParts=AR:L671-L689:1196:494677518480c54864c94bb444f8a1dbea5dcbe827e4b668bb52645f3a115701; observationRecordDigest=9f1fb95b7ea84cf8a54a6672e7b23baf2069eb1d8cee2c7b7ed6826e871275d2

## 4.82 `TRD2V3-REQ-097` — preserve `TRD2V2-REQ-081`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-081`, binding exactly one `SOE-081` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-081;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,b9bd369a0690040f7109f3430d8a045e79447d0b586df8f8cd1eedd49c6f019f),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-081),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-081),SHA256_EQ(SOE-081,2ed2918704a8c43f3daee54aa850957f498801e8394bc68656b311f877540f5f),EQ(SOE-081.localObservationId,TRD2-SHR-A-20260829-F030),MUTANT_FAILS(TV-INH-081-BYTE),MUTANT_FAILS(TV-INH-081-FIELD),MUTANT_FAILS(TV-INH-081-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-086]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-081; sourceLocator=L1013-L1023; sourceRecordDigest=b9bd369a0690040f7109f3430d8a045e79447d0b586df8f8cd1eedd49c6f019f; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-081; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-081; observationSourceParts=AR:L693-L711:1036:8380a54a8401ed1da2f22cc3738c76655b0cdcac54b461dc87c670704a95205c; observationRecordDigest=2ed2918704a8c43f3daee54aa850957f498801e8394bc68656b311f877540f5f

## 4.83 `TRD2V3-REQ-098` — preserve `TRD2V2-REQ-082`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-082`, binding exactly one `SOE-082` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-082;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,7b51b03aecdb123bc6cebaa3b18e8e9a5d10013288a9941b7552f6828974b0cb),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-082),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-082),SHA256_EQ(SOE-082,6cf6e3b6bc10901d7e851c794efed026159886a2b023417a4ccbf0215d49de63),EQ(SOE-082.localObservationId,TRD2-SHR-A-20260829-F031),MUTANT_FAILS(TV-INH-082-BYTE),MUTANT_FAILS(TV-INH-082-FIELD),MUTANT_FAILS(TV-INH-082-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-070]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-082; sourceLocator=L1025-L1035; sourceRecordDigest=7b51b03aecdb123bc6cebaa3b18e8e9a5d10013288a9941b7552f6828974b0cb; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-082; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-082; observationSourceParts=AR:L713-L731:915:237c497a5fe240468850aca6694fdc71fd7344e1143c34049eee41bd8e996550; observationRecordDigest=6cf6e3b6bc10901d7e851c794efed026159886a2b023417a4ccbf0215d49de63

## 4.84 `TRD2V3-REQ-099` — preserve `TRD2V2-REQ-083`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-083`, binding exactly one `SOE-083` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-083;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,9c8aabf9cb4d2955ff18a0bcb044061dbecd9193a339a835b254b45c505a2ecb),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-083),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-083),SHA256_EQ(SOE-083,c39c1e9cfa308f44dfc536b29b4b490f5994b970b7487122343751b4b2f6c411),EQ(SOE-083.localObservationId,TRD2-SHR-A-20260829-F032),MUTANT_FAILS(TV-INH-083-BYTE),MUTANT_FAILS(TV-INH-083-FIELD),MUTANT_FAILS(TV-INH-083-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-098]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-083; sourceLocator=L1037-L1047; sourceRecordDigest=9c8aabf9cb4d2955ff18a0bcb044061dbecd9193a339a835b254b45c505a2ecb; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-083; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-083; observationSourceParts=AR:L733-L751:1017:0eaeef56294bf2772562e60808457e109a0a705f1bed549a9d9781d1ce6e7cd9; observationRecordDigest=c39c1e9cfa308f44dfc536b29b4b490f5994b970b7487122343751b4b2f6c411

## 4.85 `TRD2V3-REQ-100` — preserve `TRD2V2-REQ-084`

- `statement`: require exactly one InheritedRequirementPreservationResult for `V2R-084`, binding exactly one `SOE-084` without reinterpretation, merge, mutation, effort or credit

- `defectCauseImpact`: the v2 record belongs to a rejected candidate but remains an immutable requirement observation; omission, projection-only copying or semantic rewriting would lose one v2 requirement, while treating its historical bytes as accepted authority would transfer invalid closure

- `proofPredicate`: predicateId=CP-INH-084;version=TRD2-PRED-DSL-V1;expression=ALL(SHA256_EQ(v2Slice,3532ac584fa4b1b2c187a1f5fb222e9d4a8c9e9d6d3b54e310f3399f4bbd0702),FIELD_COUNT_EQ(v2Record,5),EQ(v2Record.id,TRD2V2-REQ-084),EQ(parentMutationCount,0),EQ(parentEffortCredit,0),RESOLVES(SOE-084),SHA256_EQ(SOE-084,e5a5dd6b9cc058887fa507a15364ccc5dcfad005fcfc160e8743fbfe53312604),EQ(SOE-084.localObservationId,TRD2-SHR-A-20260829-F033),MUTANT_FAILS(TV-INH-084-BYTE),MUTANT_FAILS(TV-INH-084-FIELD),MUTANT_FAILS(TV-INH-084-LINK));expected=PASS;failure=INHERITED-REQUIREMENT-PRESERVATION-BLOCKED;evaluatorRoot=MISSING/EVALUATOR-UNRESOLVED;runnerRoot=MISSING/RUNNER-UNRESOLVED

- `dependencies`: [TRD2V3-REQ-000,TRD2V3-REQ-003,TRD2V3-REQ-004,TRD2V3-REQ-007,TRD2V3-REQ-008,TRD2V3-REQ-009,TRD2V3-REQ-010,TRD2V3-REQ-011,TRD2V3-REQ-012,TRD2V3-REQ-013,TRD2V3-REQ-014,TRD2V3-REQ-072,TRD2V3-REQ-073]

- `sourceBasis`: v2SubjectRoot=7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d; sourceRequirementId=TRD2V2-REQ-084; sourceLocator=L1049-L1059; sourceRecordDigest=3532ac584fa4b1b2c187a1f5fb222e9d4a8c9e9d6d3b54e310f3399f4bbd0702; v2ByteManifestRoot=8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec#V2R-084; observationManifestRoot=392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3#SOE-084; observationSourceParts=AR:L753-L771:1451:cc985c3be4aa9f2fcb7c89d3ab05f2be602c74818f581202f1ced435cfdb255a; observationRecordDigest=e5a5dd6b9cc058887fa507a15364ccc5dcfad005fcfc160e8743fbfe53312604


# 5. Lossless closure crosswalk

## 5.1 Sixteen independent-review findings

| findingId | exact findings-manifest locator | successorRequirementId | disposition |
|---|---|---|---|
| `TRD2V2-IHR-F001` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F001` | `TRD2V3-REQ-003` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; INDEPENDENT-PROOF-PENDING` |
| `TRD2V2-IHR-F002` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F002` | `TRD2V3-REQ-004` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; INDEPENDENT-PROOF-PENDING` |
| `TRD2V2-IHR-F003` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F003` | `TRD2V3-REQ-001` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; INDEPENDENT-PROOF-PENDING` |
| `TRD2V2-IHR-F004` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F004` | `TRD2V3-REQ-000` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; EXTERNAL-AUTHORITY-PENDING` |
| `TRD2V2-IHR-F005` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F005` | `TRD2V3-REQ-007` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; INDEPENDENT-PROOF-PENDING` |
| `TRD2V2-IHR-F006` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F006` | `TRD2V3-REQ-005` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; 27-RESOLUTIONS-PENDING` |
| `TRD2V2-IHR-F007` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F007` | `TRD2V3-REQ-008` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; EVALUATOR/RUNNER-PENDING` |
| `TRD2V2-IHR-F008` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F008` | `TRD2V3-REQ-006` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; INDEPENDENT-PROOF-PENDING` |
| `TRD2V2-IHR-F009` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F009` | `TRD2V3-REQ-009` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; ACCEPTED-PROTOCOL/TWO-GENERATIONS-PENDING` |
| `TRD2V2-IHR-F010` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F010` | `TRD2V3-REQ-013` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; INDEPENDENT-PROOF-PENDING` |
| `TRD2V2-IHR-F011` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F011` | `TRD2V3-REQ-002` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; INDEPENDENT-PROOF-PENDING` |
| `TRD2V2-IHR-F012` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F012` | `TRD2V3-REQ-010` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; DETACHED-LIFECYCLE-PROOF-PENDING` |
| `TRD2V2-IHR-F013` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F013` | `TRD2V3-REQ-011` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; ATOMIC-CHILD-REGISTRY-PENDING` |
| `TRD2V2-IHR-F014` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F014` | `TRD2V3-REQ-014` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; PUBLIC-HARDENING-PROOF-PENDING` |
| `TRD2V2-IHR-F015` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F015` | `TRD2V3-REQ-012` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; ACCEPTED-SOURCE-UNIVERSE-PENDING` |
| `TRD2V2-IHR-F016` | `7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9#TRD2V2-IHR-F016` | `TRD2V3-REQ-015` | `ONE-TO-ONE-REQUIREMENT-CANDIDATE; DETACHED-QA/REPLAY-PENDING` |

## 5.2 Inherited v2 and local-observation preservation

5.2.1 פרק 4 מכיל 85 Requirements מפורשים, כל אחד קשור ל־V2R יחיד; `TRD2V3-REQ-016` משמר את `V2R-000`, וכל אחת מ־84 הרשומות הבאות משמרת V2R יחיד ו־SOE יחיד המצוינים בגופה.

5.2.2 Set equality נגזרת מן ה־101 Requirements עצמם ולא מ־Range: exactly 16 rows carry one distinct `TRD2V2-IHR-Finding`, exactly 85 rows carry one distinct `V2R`, exactly 84 of those rows carry one distinct `SOE`.

5.2.3 missing, extra, duplicate, merged, aliased, suppressed, closed או unqualified source bindings חייבים להיות אפס.

# 6. Candidate eligibility composition

## 6.1 Fail-closed conjunction

6.1.1 Candidate eligibility דורשת `ALL` של `proofPredicate` בכל 101 רשומות ה־Candidate, ולא Average, Majority, severity weighting או Partial credit.

6.1.2 כל Predicate input חייב להיות predecessor דרך typed `ValidationDependency`; כל שינוי ב־Source root, Candidate root, Authority, Protocol, Source cut, MissingValue, evaluator, runner, test vector, status snapshot או evidence יוצר Invalidation לפי ה־overlay.

6.1.3 External prerequisites `EXT-001`, `EXT-002`, `EXT-003`, `EXT-004`, `EXT-005` ו־`EXT-006` אינם Members ב־Candidate ואינם ניתנים לסיפוק בטקסט זה.

6.1.4 Review eligibility דורשת שתי Generations אמיתיות, ללא Receipt carry-over, תחת accepted Protocol root; Producer QA או self-authored PASS מעניקים אפס Acceptance credit.

6.1.5 P0/P1 open, unresolved MissingValue, Protocol missing, Source-universe missing, evaluator/runner missing, Public hardening missing, DataLifecycle failure, stale evidence, CAS conflict או wrong root מחזירים `BLOCKED` או `REJECTED` לפי ה־Safe terminal המדויק; לעולם לא PASS.

## 6.2 Immutable claim limit

6.2.1 מסמך זה מתאר Successor requirements בלבד. הוא אינו מוכיח שה־Artifacts, evaluators, reviews, two generations, Reconciliation או Acceptance קיימים.

6.2.2 אין במסמך Product Task, שעות, Percentage, Critical path, ETA, Git permission, Push, Merge, Release, Deploy, Provider mutation או שינוי repository visibility.

6.2.3 repository visibility invariant נשאר `PUBLIC`; שינוי ל־Private אינו מסלול תיקון.
