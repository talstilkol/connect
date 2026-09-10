# 1. Connect — TRD-2 v3 closure control registries

## 1.1 זהות ומגבלות

1.1.1 `artifactId=CONNECT-SECTION-35-6-TRD-2-V3-CLOSURE-CONTROL-REGISTRIES-2026-08-29-V1`.

1.1.2 artifactClass=`PLANNING-ONLY; CONTROL-CONTRACTS; NOT-DEFINITION; NOT-ACCEPTANCE; NOT-EXECUTION; NOT-GATE-CREDIT`.

1.1.3 reviewed v2 root=`7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d`; independent-review root=`fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b`; findings-manifest root=`7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9`.

1.1.4 כל מצב עובדתי שאינו מוכח נשאר typed `MISSING`; מסמך זה אינו ממלא Rule, Predicate, owner, evaluator, authority או live evidence חסרים.

1.1.5 Public repository intent=`BINDING-PUBLIC`; Private visibility remediation=`FORBIDDEN`; Git/Push/Merge/Release/Deploy/Provider authority=`NONE`.

# 2. Detached external prerequisites

## 2.1 Schema

2.1.1 `ExternalPrerequisite={prerequisiteId,kind,requiredFields,authoritySource,status,acceptanceEligible,safeTerminal,successorTrigger}`.

2.1.2 ExternalPrerequisite אינו Member ב־Candidate שאותו הוא מסמיך. AuthorityEnvelope חייב להיווצר לפני authoring; FreezeReceipt נוצר רק לאחר חישוב Candidate root ולפני Review packet; AcceptanceEnvelope נוצר רק לאחר Review/Reconciliation.

2.1.3 `status` מותר: `MISSING`, `PRESENT-UNVERIFIED`, `VERIFIED-CURRENT`, `REVOKED`, `EXPIRED`, `CONFLICT`. רק `VERIFIED-CURRENT` יכול לעמוד ב־precondition.

## 2.2 Registry

| prerequisiteId | kind | requiredFields | authoritySource | currentStatus | acceptanceEligible | safeTerminal | successorTrigger |
|---|---|---|---|---|---:|---|---|
| `EXT-001` | `AuthorityEnvelope` | `authorityEnvelopeId,actorId,roleId,authorityRoot,issuedAt,validThrough,revocationRoot,permittedActs,forbiddenActs` | `durable user/organizational authority preceding candidate authoring` | `MISSING/UNRESOLVED-EXACT-ROOT` | `false` | `AUTHORING-AUTHORITY-BLOCKED` | `issue detached authority envelope; never insert it into the candidate` |
| `EXT-002` | `FreezeReceipt` | `freezeReceiptId,candidateRoot,authorityEnvelopeRoot,frozenSourceRoots,createdAt,validThrough,revocationRoot` | `EXT-001` | `MISSING/WAITING-FOR-EXACT-CANDIDATE-ROOT` | `false` | `REVIEW-PACKET-BLOCKED` | `hash candidate, then issue detached receipt before any review run` |
| `EXT-003` | `ProtocolAcceptanceEnvelope` | `protocolRoot,acceptanceRoot,acceptedAt,validThrough,vetoSetRoot,currentPointerVersion` | `external bootstrap authority` | `MISSING/NO-ACCEPTED-PROTOCOL-ROOT-SUPPLIED` | `false` | `REVIEW-INELIGIBLE` | `accept an independently reviewed protocol generation outside this candidate` |
| `EXT-004` | `SourceUniverseAcceptanceEnvelope` | `sourceContractRoot,candidateSourceSetRoot,admittedSourceSetRoot,dispositionRoot,cut,acceptedAt,validThrough` | `EXT-003 eligible process` | `MISSING/NO-ACCEPTED-SOURCE-UNIVERSE-ROOT-SUPPLIED` | `false` | `COMPLETENESS-CLAIM-BLOCKED` | `accept a finite source universe, then issue a successor when its cut changes` |
| `EXT-005` | `EligibleReviewPacket` | `candidateRoot,freezeReceiptRoot,protocolAcceptanceRoot,reviewerAppointmentsRoot,independenceEvidenceRoot,normalizerRoots,inputRoot` | `EXT-001,EXT-002,EXT-003` | `MISSING/WAITING-FOR-EXTERNAL-PREDECESSORS` | `false` | `ZERO-REVIEW-OR-ACCEPTANCE-CREDIT` | `create packet only after all predecessor roots verify` |
| `EXT-006` | `DefinitionAcceptanceEnvelope` | `candidateRoot,reconciliationRoot,reviewGenerationRoots,vetoSetRoot,acceptedAt,validThrough,currentPointerVersion` | `EXT-005 plus two real generations` | `MISSING/NOT-YET-ELIGIBLE` | `false` | `TRD2-DEFINITION-BLOCKED` | `issue detached envelope only if every mandatory predicate passes` |

# 3. MissingValue registry — 27 exact records

## 3.1 Schema and resolution lifecycle

3.1.1 `MissingValue={missingValueId,targetRecordId,missingField,reasonCode,sourceRoot,sourceLocalId,blocker,requiredAuthorityRole,resolutionPredicateId,safeTerminal,successorTrigger,status,acceptanceEligible}`.

3.1.2 `reasonCode` מותר: `SOURCE-FIELD-ABSENT`, `SOURCE-EXPLICIT-UNKNOWN`, `AUTHORITY-UNRESOLVED`, `EVALUATOR-UNRESOLVED`, `EVIDENCE-UNAVAILABLE`.

3.1.3 כל Resolution חייב לעבור `UNRESOLVED→PROPOSED-IN-NEW-CANDIDATE→INDEPENDENTLY-REVIEWED→ACCEPTED-IN-SUCCESSOR`; אין מעבר ישיר, default, coercion, inference, empty string, null-as-success או mutation in place.

3.1.4 `resolutionPredicateId` דורש: exact predecessor root; exact proposed successor root; appointed author; independent reviewer; accepted Protocol root; changed-field diff; semantic-source proof; safe-terminal test; detached Acceptance. כל חסר מחזיר `UNRESOLVED`.

## 3.2 Seven missing Producer rules

| missingValueId | targetRecordId | missingField | reasonCode | sourceRoot | sourceLocalId | blocker | requiredAuthorityRole | resolutionPredicateId | safeTerminal | successorTrigger | status | acceptanceEligible |
|---|---|---|---|---|---|---|---|---|---|---|---|---:|
| `MV-001` | `V2R-001` | `rule` | `SOURCE-FIELD-ABSENT` | `8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f` | `TRD2-PQA-P0-001` | `Producer source has no requiredRemediation/requiredDefinitionDelta` | `APPOINTED-TRD2-DEFINITION-PRODUCER+INDEPENDENT-REVIEWER` | `MVR-001` | `SOURCE-REFERENCE-INVALID` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-002` | `V2R-002` | `rule` | `SOURCE-FIELD-ABSENT` | `8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f` | `TRD2-PQA-P0-002` | `Producer source has no requiredRemediation/requiredDefinitionDelta` | `APPOINTED-TRD2-DEFINITION-PRODUCER+INDEPENDENT-REVIEWER` | `MVR-002` | `COVERAGE-INCOMPLETE` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-003` | `V2R-003` | `rule` | `SOURCE-FIELD-ABSENT` | `8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f` | `TRD2-PQA-P0-003` | `Producer source has no requiredRemediation/requiredDefinitionDelta` | `APPOINTED-TRD2-DEFINITION-PRODUCER+INDEPENDENT-REVIEWER` | `MVR-003` | `SUCCESSOR-CONTRACT-UNMAPPED` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-004` | `V2R-004` | `rule` | `SOURCE-FIELD-ABSENT` | `8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f` | `TRD2-PQA-P1-001` | `Producer source has no requiredRemediation/requiredDefinitionDelta` | `APPOINTED-TRD2-DEFINITION-PRODUCER+INDEPENDENT-REVIEWER` | `MVR-004` | `RANGE-REFERENCE-INELIGIBLE` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-005` | `V2R-005` | `rule` | `SOURCE-FIELD-ABSENT` | `8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f` | `TRD2-PQA-P0-004` | `Producer source has no requiredRemediation/requiredDefinitionDelta` | `APPOINTED-TRD2-DEFINITION-PRODUCER+INDEPENDENT-REVIEWER` | `MVR-005` | `SOURCE-UNIVERSE-UNKNOWN` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-006` | `V2R-006` | `rule` | `SOURCE-FIELD-ABSENT` | `8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f` | `TRD2-PQA-P1-002` | `Producer source has no requiredRemediation/requiredDefinitionDelta and cause is also absent` | `APPOINTED-TRD2-DEFINITION-PRODUCER+INDEPENDENT-REVIEWER` | `MVR-006` | `D31-PRESENT-NOT-YET-ADMITTED` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-007` | `V2R-007` | `rule` | `SOURCE-FIELD-ABSENT` | `8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f` | `TRD2-PQA-P1-003` | `Producer source has no requiredRemediation/requiredDefinitionDelta` | `APPOINTED-TRD2-DEFINITION-PRODUCER+INDEPENDENT-REVIEWER` | `MVR-007` | `PROGRAM-MATERIALIZATION-BLOCKED` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |

## 3.3 Twenty missing Security acceptance predicates

| missingValueId | targetRecordId | missingField | reasonCode | sourceRoot | sourceLocalId | blocker | requiredAuthorityRole | resolutionPredicateId | safeTerminal | successorTrigger | status | acceptanceEligible |
|---|---|---|---|---|---|---|---|---|---|---|---|---:|
| `MV-008` | `V2R-032` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F001` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-008` | `SOURCE-GRAPH-INVALID; no Candidate freeze` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-009` | `V2R-033` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F002` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-009` | `SECURITY-UNION-INCOMPLETE; no Definition acceptance` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-010` | `V2R-034` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F003` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-010` | `D18-SOURCE-UNBOUND; no Git/Gate credit; Public remains intended` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-011` | `V2R-035` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F004` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-011` | `SOURCE-USE-BLOCKED; capability disabled` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-012` | `V2R-036` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F005` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-012` | `CAPABILITY-INSTANCE-UNBOUND; route disabled; UNKNOWN receives no retry` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-013` | `V2R-037` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F006` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-013` | `RECONCILIATION-INELIGIBLE; strict local union only` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-014` | `V2R-038` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F007` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-014` | `RISK-ACCEPTANCE-FORBIDDEN; veto open` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-015` | `V2R-039` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F008` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-015` | `CANDIDATE-REJECTED; no Acceptance envelope or permit` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-016` | `V2R-040` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F009` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-016` | `TEST-COVERAGE-INCOMPLETE; risky instance disabled` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-017` | `V2R-041` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F010` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-017` | `PRIVILEGED-ROUTE-DISABLED` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-018` | `V2R-042` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F011` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-018` | `WHATSAPP-OUTBOUND-CAP=0; no provider attempt` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-019` | `V2R-043` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F012` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-019` | `AI-DISABLED; no autonomous side effect` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-020` | `V2R-044` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F013` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-020` | `UPLOAD-OFF; OBJECT-QUARANTINED; KNOWLEDGE-DISABLED` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-021` | `V2R-045` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F014` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-021` | `MERGE/BUILD/RELEASE/DEPLOY-BLOCKED` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-022` | `V2R-046` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F015` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-022` | `DELETE-ADAPTER-DISABLED; unresolved identities remain UNKNOWN` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-023` | `V2R-047` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F016` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-023` | `RESTORE-NOT-USABLE; resilience/RPO/RTO/retention claim blocked` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-024` | `V2R-048` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F017` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-024` | `SECURITY-VALUE-USE-BLOCKED` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-025` | `V2R-049` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F018` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-025` | `EVIDENCE-REJECTED; dependent results invalidated` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-026` | `V2R-050` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F019` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-026` | `NO PUSH; NO MERGE; NO RELEASE; repository remains Public` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |
| `MV-027` | `V2R-051` | `acceptancePredicate` | `SOURCE-FIELD-ABSENT` | `3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae` | `TRD2-SHR-F020` | `Security manifest intentionally defines no predicate` | `APPOINTED-CONFORMANCE-AUTHOR+INDEPENDENT-SECURITY-REVIEWER` | `MVR-027` | `SOURCE-USE-BLOCKED; live entitlement UNKNOWN` | `NEW-TRD2-SUCCESSOR-ROOT` | `UNRESOLVED` | `false` |

# 4. Executable ConformancePredicate contract

## 4.1 Envelope and DSL

4.1.1 `ConformancePredicate={predicateId,predicateVersion,inputSchemaRoots,inputArtifactRoots,evaluatorRoot,runnerRoot,testVectorIds,expression,expectedResult,failureTerminal,evidenceSchemaRoot,asOf,validThrough}`.

4.1.2 `predicateVersion=TRD2-PRED-DSL-V1`; closed operators are `ALL,ANY,NOT,EQ,SET_EQ,COUNT_EQ,RESOLVES,SHA256_EQ,BYTES_EQ,FIELD_COUNT_EQ,UNIQUE,DISJOINT,ACYCLIC,REACHABLE,VALID_TIME,STATUS_EQ,MUTANT_FAILS,NO_SIDE_EFFECT`.

4.1.3 Values are typed `String,Boolean,UInt64,Bytes32,Instant,Duration,Array,Set,MissingValue`; implicit cast, truthiness, default, null success, floating-point comparison and unregistered operator are forbidden.

4.1.4 Evaluation result is exactly `PASS|FAIL|BLOCKED`; any missing/stale/wrong-root input, missing evaluator/runner root, non-determinism, unknown operator או evidence-schema mismatch returns `BLOCKED`.

4.1.5 `evaluatorRoot` ו־`runnerRoot` הם `MISSING/EVALUATOR-UNRESOLVED` עד Artifact חיצוני, independently reviewed ומקובל. לכן שום Predicate במסמך זה אינו executed או PASS בפועל.

## 4.2 Test-vector families for the sixteen new findings

| findingId | positiveVectorId | negativeVectorId | failureVectorId | concurrencyVectorId | recoveryVectorId | expectedFailureTerminal |
|---|---|---|---|---|---|---|
| `TRD2V2-IHR-F001` | `TV-F001-POS` | `TV-F001-OMITTED-FIELD` | `TV-F001-WRONG-DIGEST` | `TV-F001-SOURCE-CHANGE` | `TV-F001-REPLAY` | `LOSSLESS-PRESERVATION-BLOCKED` |
| `TRD2V2-IHR-F002` | `TV-F002-POS` | `TV-F002-SEVERITY-PERMUTE` | `TV-F002-DOWNGRADE` | `TV-F002-PROMOTION-RACE` | `TV-F002-HISTORY-REPLAY` | `SEVERITY-BINDING-BLOCKED` |
| `TRD2V2-IHR-F003` | `TV-F003-POS` | `TV-F003-UNICODE-BIDI` | `TV-F003-DELIMITER` | `TV-F003-ORDER-RACE` | `TV-F003-TWO-SERIALIZERS` | `CANONICALIZATION-BLOCKED` |
| `TRD2V2-IHR-F004` | `TV-F004-POS` | `TV-F004-SELF-AUTHORITY` | `TV-F004-FUTURE-ROOT` | `TV-F004-REVOCATION-RACE` | `TV-F004-FREEZE-REPLAY` | `AUTHORITY-OR-FREEZE-BLOCKED` |
| `TRD2V2-IHR-F005` | `TV-F005-POS` | `TV-F005-EDGE-REMOVE` | `TV-F005-CYCLE` | `TV-F005-INVALIDATION-RACE` | `TV-F005-DAG-REPLAY` | `SEMANTIC-DAG-BLOCKED` |
| `TRD2V2-IHR-F006` | `TV-F006-POS` | `TV-F006-COERCION` | `TV-F006-UNAUTHORIZED-RESOLUTION` | `TV-F006-DOUBLE-RESOLUTION` | `TV-F006-SUCCESSOR-REPLAY` | `MISSING-VALUE-UNRESOLVED` |
| `TRD2V2-IHR-F007` | `TV-F007-POS` | `TV-F007-WRONG-ROOT` | `TV-F007-RUNNER-MISSING` | `TV-F007-RUNNER-DIVERGENCE` | `TV-F007-TWO-RUNNERS` | `PREDICATE-EVALUATION-BLOCKED` |
| `TRD2V2-IHR-F008` | `TV-F008-POS` | `TV-F008-TERMINAL-OMIT` | `TV-F008-DEFAULT-SUCCESS` | `TV-F008-TERMINAL-RACE` | `TV-F008-TERMINAL-REPLAY` | `SAFE-TERMINAL-BINDING-BLOCKED` |
| `TRD2V2-IHR-F009` | `TV-F009-POS` | `TV-F009-LEGACY-ELIGIBLE` | `TV-F009-PROTOCOL-MISSING` | `TV-F009-RECEIPT-CARRYOVER` | `TV-F009-GENERATION-TWO` | `REVIEW-INELIGIBLE` |
| `TRD2V2-IHR-F010` | `TV-F010-POS` | `TV-F010-RESURRECTION` | `TV-F010-UNKNOWN-DELETE` | `TV-F010-HOLD-RACE` | `TV-F010-RESTORE-REDELETE` | `DATA-LIFECYCLE-BLOCKED` |
| `TRD2V2-IHR-F011` | `TV-F011-POS` | `TV-F011-AMBIGUOUS-ID` | `TV-F011-MISSING-ARTIFACT` | `TV-F011-ROOT-CHANGE` | `TV-F011-OFFLINE-REPLAY` | `SOURCE-LOCATOR-BLOCKED` |
| `TRD2V2-IHR-F012` | `TV-F012-POS` | `TV-F012-STALE-STATUS` | `TV-F012-WRONG-SUBJECT` | `TV-F012-CAS-CONFLICT` | `TV-F012-STATUS-REPLAY` | `LIFECYCLE-STATE-BLOCKED` |
| `TRD2V2-IHR-F013` | `TV-F013-POS` | `TV-F013-PARTIAL-PARENT` | `TV-F013-NONATOMIC-CHILD` | `TV-F013-CHILD-RACE` | `TV-F013-ROLLUP-REPLAY` | `ATOMICITY-BLOCKED` |
| `TRD2V2-IHR-F014` | `TV-F014-POS` | `TV-F014-PRIVATE-PATH` | `TV-F014-CONTROL-OMIT` | `TV-F014-BYPASS-RACE` | `TV-F014-TWO-READBACKS` | `PUBLIC-HARDENING-BLOCKED` |
| `TRD2V2-IHR-F015` | `TV-F015-POS` | `TV-F015-DOUBLE-DISPOSITION` | `TV-F015-LATE-SOURCE` | `TV-F015-CUT-RACE` | `TV-F015-SOURCESET-REPLAY` | `SOURCE-UNIVERSE-BLOCKED` |
| `TRD2V2-IHR-F016` | `TV-F016-POS` | `TV-F016-NEGATIVE-MUTANT` | `TV-F016-RUNNER-DRIFT` | `TV-F016-CONCURRENT-RUNS` | `TV-F016-INDEPENDENT-REPLAY` | `MECHANICAL-QA-BLOCKED` |

# 5. Typed semantic dependency overlay

## 5.1 Edge types

5.1.1 `SourceObservationDependency` משמר רק את Edge המקורי ואינו מעניק execution order.

5.1.2 `ProvenanceDependency` קושר Requirement ל־SourceObservationEnvelope ול־V2 byte record.

5.1.3 `ClosurePrerequisite` מחייב predecessor PASS לפני dependent eligibility.

5.1.4 `ValidationDependency` קושר Predicate לכל Input root שהוא קורא.

5.1.5 `InvalidationEdge` מגדיר אילו Results ו־Envelopes מתבטלים כאשר Root, state, authority, source cut או evidence משתנים.

5.1.6 כל Edge נושא `edgeId,edgeType,fromId,toId,rationale,sourceRoot,status`; ה־graph חייב להיות finite, connected מן detached Freeze root, acyclic ונטול dangling/self/duplicate edges.

## 5.2 Derived closure order

5.2.1 סדר ה־Closure המחייב הוא: external Authority→Candidate bytes→FreezeReceipt→Canonical source locators→Lossless envelopes→Severity/Missing/Safe-terminal registries→Semantic DAG→Executable predicates→accepted Protocol/eligible packet→detached lifecycle→Atomic clauses→accepted Source universe→Data/Public control graphs→detached QA→two review generations→Reconciliation→Definition Acceptance.

5.2.2 סדר זה אינו משנה את `sourceDependencies` ההיסטוריים; הוא Overlay נפרד. מחיקת Edge מחייבת יוצרת `SEMANTIC-DAG-BLOCKED`.

# 6. Detached lifecycle and AtomicClause

## 6.1 Detached lifecycle

6.1.1 Candidate bytes מכילים invariants בלבד. `StatusSnapshot={snapshotId,subjectRoot,state,asOf,validThrough,supersedesRoot,currentPointerVersion}`; `AcceptanceEnvelope` ו־`InvalidationRecord` נפרדים.

6.1.2 states=`DRAFT,FROZEN,REVIEW-ELIGIBLE,UNDER-REVIEW,REJECTED,REWORK-REQUIRED,ACCEPTED,SUPERSEDED,INVALIDATED,EXPIRED,CONFLICT`; רק detached record משנה state.

6.1.3 pointer update הוא fenced CAS על `(subjectRoot,currentPointerVersion)`; ambiguity או concurrent winner מחזירים `CONFLICT`, ללא second write אוטומטי.

## 6.2 AtomicClause

6.2.1 Parent Observation ו־inherited v2 Requirement נשארים immutable, zero-effort ו־zero-credit.

6.2.2 `AtomicClause={clauseId,parentId,oneAction,oneProductOutput,oneEvidenceOutput,ownerRole,reviewerRole,testIds,failureTerminal,reworkTarget}`.

6.2.3 Parent closure הוא `ALL(mandatory child predicates)` בלבד; Partial child PASS אינו Parent PASS. Decomposition אינו Merge ואינו משנה Parent/noMergeKey.

# 7. DataLifecycle graph

## 7.1 Data classes

| dataClassId | exact scope | forbidden conflation |
|---|---|---|
| `DL-CLASS-001` | uploaded source object and immutable object version | knowledge derivative, backup copy |
| `DL-CLASS-002` | parsed/OCR/chunk/index knowledge derivative bound to source version | source object, operational message |
| `DL-CLASS-003` | operational message/conversation/contact data | AI trace, test input |
| `DL-CLASS-004` | AI input/output/tool trace with approval state | production message side effect |
| `DL-CLASS-005` | backup cohort/object and exact backupId/digests | live store row, restored row |
| `DL-CLASS-006` | restore candidate in quarantine | active production data |
| `DL-CLASS-007` | privacy deletion intent/plan/attempt/result/audit | provider object or business record |
| `DL-CLASS-008` | Legal Hold scope/version/CAS receipt | retention policy or deletion evidence |
| `DL-CLASS-009` | real approved TestInput with consent and expiry | mock/sample/synthetic input, production corpus |
| `DL-CLASS-010` | provider-side deletion attempt with PARTIAL/UNKNOWN semantics | successful deletion result |

## 7.2 States and transitions

7.2.1 states=`ACTIVE,QUARANTINED,HOLD-ACTIVE,DELETE-PLANNED,DELETE-IN-FLIGHT,DELETE-PARTIAL,DELETE-UNKNOWN,PURGED,BACKED-UP,RESTORE-QUARANTINE,PRIVACY-REPLAY,REDELETE-PENDING,INVALIDATED,EXPIRED`.

7.2.2 permitted transitions are exact: `ACTIVE→QUARANTINED`; `ACTIVE→HOLD-ACTIVE`; `ACTIVE→DELETE-PLANNED`; `DELETE-PLANNED→DELETE-IN-FLIGHT`; `DELETE-IN-FLIGHT→PURGED`; `DELETE-IN-FLIGHT→DELETE-PARTIAL`; `DELETE-IN-FLIGHT→DELETE-UNKNOWN`; `BACKED-UP→RESTORE-QUARANTINE`; `RESTORE-QUARANTINE→PRIVACY-REPLAY`; `PRIVACY-REPLAY→REDELETE-PENDING`; `REDELETE-PENDING→PURGED`; `QUARANTINED→INVALIDATED`; `ACTIVE→EXPIRED` for TestInput only.

7.2.3 prohibited transitions include `HOLD-ACTIVE→DELETE-IN-FLIGHT`, `DELETE-PARTIAL→PURGED` without new provider evidence, `DELETE-UNKNOWN→retry`, `RESTORE-QUARANTINE→ACTIVE` before privacy replay, `PURGED→ACTIVE`, `EXPIRED→ACTIVE` and any derivative activation after source purge/opt-out.

7.2.4 every transition requires `dataIdentity,storeIdentity,tenantIdentity,version,fromState,toState,triggerId,policyRoot,holdSnapshotRoot,attemptId,CASVersion,evidenceRoot,occurredAt`; missing value fails closed.

7.2.5 Backup/Restore evidence binds exact `backupId`, cohort membership, database/object digests, R2 consistency, retention-window proof, restore quarantine, privacy replay and re-deletion. Byte consistency alone is never privacy safety.

7.2.6 Mutation tests must reject deletion under Hold, hold-race winner ambiguity, unknown provider retry, cascade omission, stale object version, resurrection, restore without privacy replay and activation of deleted/opted-out data.

# 8. Public-repository closure profile

## 8.1 Exact current planning roots and dispositions

8.1.1 binding user invariant=`repository visibility remains Public`; Private remediation paths=`0`.

8.1.2 D18-A2 root=`448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`; disposition=`CANDIDATE-PENDING-ACCEPTED-SOURCE-UNIVERSE`; claim limit=`planning decision artifact, not live GitHub evidence`.

8.1.3 Public/cyber hostile-review root=`af7bd90255fe0cb037d19ad8138609a3b35df50c33219470c845dec15919c6d5`; findings-manifest root=`a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4`; local findings=`32`; disposition=`OPEN-CANDIDATE-PENDING-SOURCE-UNIVERSE-AND-RECONCILIATION`.

8.1.4 אין Claim שכל 32 הממצאים נסגרו. עד disposition/closure מלאים: `NO PUSH; NO MERGE; NO RELEASE; NO DEPLOY`; repository remains Public.

## 8.2 PublicRepoHardeningProfile requirements

8.2.1 control denominator חייב לכלול במפורש: organization ownership/2FA/role minimization; default-branch ruleset/branch protection; tag/release/package protection; direct/force/delete/bypass denial; CODEOWNERS; stale-approval dismissal; signed/verified provenance decision; Actions allowlist, full-SHA pins, least privilege, event/actor/ref matrix, fork-secret isolation and untrusted-code isolation; OIDC subject/audience/environment claims; dependency confusion/lockfile/provenance; secret/history/LFS/release/package scans; secret scanning/push protection and bypass review; CodeQL/code scanning; Dependabot disposition; attestations; SECURITY.md/private vulnerability reporting; License/NOTICE; recovery and two live readbacks.

8.2.2 כל control ממופה `Requirement→Negative/Failure/Concurrency/Recovery tests→Evidence schema→Hardening gate`; broad policy text אינו Evidence.

8.2.3 actual settings mutation דורשת authority חדשה לאחר Gate29, exact-diff permit ו־שתי Live readbacks בלתי תלויות. מסמך זה אינו מפעיל mutation כלשהי.

8.2.4 כל bypass, stale evidence, wrong repository/root/branch/ref, fork-secret exposure או missing scan מחזיר `PUBLIC-HARDENING-BLOCKED`; אין מעבר אוטומטי ל־Private.

# 9. Safe terminal

## 9.1 Current state

9.1.1 MissingValue unresolved=`27/27`; accepted Protocol prerequisite=`0/1`; accepted Source-universe prerequisite=`0/1`; eligible review packet=`0/1`; Definition acceptance=`0/1`.

9.1.2 evaluator/runner roots=`MISSING`; executed conformance predicates=`0`; review generations completed under accepted protocol=`0/2`.

9.1.3 Gate29=`BLOCKED`; Development freeze=`ACTIVE`; Product/Git/Build/Push/Merge/Release/Deploy/Provider authority=`NONE`.

9.1.4 Product completion, remaining person-hours, critical path ו־calendar ETA=`unknown/unavailable`.
