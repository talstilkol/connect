# 1. Connect — Section 35.6 Task Registry Definition Candidate

## 1.1 Identity and status

1.1.1 `artifactId=CONNECT-SECTION-35-6-TASK-REGISTRY-DEFINITION-CANDIDATE-2026-08-29`.

1.1.2 `definitionVersion=TRD-1.0-draft`.

1.1.3 durable Master input path=`/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`.

1.1.4 observed Master raw SHA-256=`643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

1.1.5 recovery input path=`/Users/tal/Documents/connect/web/docs/planning/master-plan-recovery-ledger-2026-08-29.md`.

1.1.6 definition status=`DRAFT-NOT-REVIEWED-NOT-ACCEPTED`.

1.1.7 materialized Task leaves=`0`; accepted Task leaves=`0`; Gate29=`BLOCKED`; development freeze=`ACTIVE`.

1.1.8 No product Code, Build, runtime Test, Git mutation, Push, Deployment, provider/account action, credential use, purchase or Production change is authorized by this Definition.

## 1.2 Goal

1.2.1 Section35.6 will be the one executable planning registry from which task counts, Bottom-up hours, DAGs, resource bottlenecks, external waits, progress and Gate coverage are derived.

1.2.2 prose in Sections1–34, Findings, Frameworks, Decisions or status documents is not an executable task unless it maps to an accepted Section35.6 leaf.

1.2.3 every leaf has one action, one primary Output, at most eight net person-hours and all mandatory fields written locally without inheritance.

1.2.4 no numeric progress or Remaining ETA may be published until a complete Task universe is accepted and Gate1 binds current code/evidence to exact leaves.

# 2. Canonical scalar and collection types

## 2.1 Scalar types

2.1.1 `NonEmptyUtf8`: Unicode string normalized to NFC, with no NUL, CR, leading/trailing whitespace or control characters other than LF where explicitly permitted.

2.1.2 `Slug`: lowercase ASCII `[a-z0-9]+(?:-[a-z0-9]+)*`, length `1..64`.

2.1.3 `Sha256Hex`: exactly 64 lowercase hexadecimal characters representing raw SHA-256 bytes.

2.1.4 `AbsoluteWorkspacePath`: normalized absolute path contained within `/Users/tal/Documents/connect`; no symlink escape, traversal, alias or unresolved case-equivalent path.

2.1.5 `ExternalLocator`: canonical HTTPS URL or provider-native immutable identifier; never a credential, bearer token, signed URL or secret-bearing query.

2.1.6 `Hours`: decimal in quarter-hour units, inclusive range `0.25..8.00` for a Task leaf.

2.1.7 `UtcInstant`: RFC3339 UTC timestamp with seconds and `Z`; trusted producer required.

2.1.8 `DateOnly`: ISO `YYYY-MM-DD` for planning dates that are not authority timestamps.

2.1.9 `VersionId`: positive integer with no leading zero.

2.1.10 `Boolean`: exact `true` or `false`; unknown is not encoded as false.

## 2.2 Enumerations

2.2.1 `TaskStatus={הושלם ומוכח,הושלם מקומית,בביקורת,ממתין,חסום חיצונית}`.

2.2.2 `DependencyClass={TASK,COMPATIBILITY,SEMANTIC,DERIVED,CARRIER,EXTERNAL-AUTHORITY,EXTERNAL-WAIT,FORBIDDEN}`.

2.2.3 `EvidenceState={ABSENT,PLANNED,CAPTURED,VERIFIED,EXPIRED,REVOKED,INVALIDATED}`.

2.2.4 `OutputState={ABSENT,MATERIALIZED,VERIFIED,REVIEWED,ACCEPTED,SUPERSEDED,REJECTED}`.

2.2.5 `TestMode={POSITIVE,NEGATIVE,FAILURE,CONCURRENCY,RECOVERY,ATTACK}`.

2.2.6 `Terminal={PASS,FAIL,BLOCKED,UNKNOWN,CONFLICT,AMBIGUOUS,REJECTED,SUPERSEDED}`.

2.2.7 `RiskSeverity={P0,P1,P2,P3}`.

2.2.8 `ScopeClass={SCOPE-1-PILOT,SCOPE-3-GA,SCOPE-4-BEST-IN-CLASS,CONDITIONAL,EXTERNAL,PLANNING}`.

## 2.3 Collection rules

2.3.1 arrays are finite, explicitly ordered, duplicate-free and serialized by their declared comparator.

2.3.2 sets are serialized as sorted arrays under the Definition comparator; prose ranges, ellipses and slash-combined IDs are forbidden.

2.3.3 empty arrays are valid only when the field permits them and the associated N/A proof is present.

2.3.4 `unknown/unavailable` is a typed blocking value, never an empty string, zero, false, omitted field or success terminal.

# 3. Deterministic identities

## 3.1 Task identity

3.1.1 canonical preimage=`UTF8("connect-task-leaf-v1") || 0x00 || stageId || 0x00 || scopeId || 0x00 || operationId || 0x00 || requirementSetRoot`.

3.1.2 `taskDigest=SHA-256(canonical preimage)`.

3.1.3 `taskId="CTW-" + first 20 lowercase hexadecimal characters of taskDigest`.

3.1.4 the full `taskDigest` is stored and checked. A truncated-ID collision rejects both records until a deterministic longer-prefix Definition version is approved; no suffix, counter or randomness may resolve it silently.

3.1.5 a semantic change to Stage, Scope, Operation or Requirement set creates a new task identity and an explicit predecessor/supersession relation.

3.1.6 changing status, evidence observation or actual hours does not change task identity; it creates a new record version bound to the same taskDigest and previous record root.

## 3.2 Other identities

3.2.1 `outputId="CTO-" + first20(SHA-256("connect-output-v1" || 0x00 || taskDigest || 0x00 || outputType || 0x00 || canonicalLocation))`.

3.2.2 `testId="CTT-" + first20(SHA-256("connect-test-v1" || 0x00 || taskDigest || 0x00 || mode || 0x00 || assertionId))`.

3.2.3 `edgeId="CTE-" + first20(SHA-256("connect-edge-v1" || 0x00 || predecessorTaskDigest || 0x00 || successorTaskDigest || 0x00 || edgeType))`.

3.2.4 `evidenceId="CTV-" + first20(SHA-256("connect-evidence-v1" || 0x00 || taskDigest || 0x00 || evidenceType || 0x00 || evidenceLocation))`.

3.2.5 `waitId="CTX-" + first20(SHA-256("connect-external-wait-v1" || 0x00 || authorityId || 0x00 || requestOutputId || 0x00 || expectedReceiptType))`.

3.2.6 all constructors use domain separation, unambiguous length/framing and exact UTF-8/NFC encoding; string concatenation without framing is forbidden.

3.2.7 no `Math.random()`.

3.2.8 no `crypto.randomUUID()` or cryptographic randomness without future exact use-specific X24 approval.

# 4. TaskLeafDefinition

## 4.1 Required local fields

4.1.1 `field01_identity={taskId,taskDigest,recordVersion,previousRecordRoot,definitionVersion}`.

4.1.2 `field02_action={operationId,verb,object,oneActionProof}`.

4.1.3 `field03_input={inputIds,inputKinds,inputRoots,inputFreshness,inputClaimLimits}`.

4.1.4 `field04_output={outputId,outputType,canonicalLocation,mediaType,schemaVersion,claimLimits}`.

4.1.5 `field05_predecessors={taskIds}`; only exact existing Task leaf IDs are legal.

4.1.6 `field06_primary={personId,appointmentReceiptId,scope,validFrom,expiresAt}`.

4.1.7 `field07_backup={personId,appointmentReceiptId,scope,validFrom,expiresAt}` or exact N/A proof where continuity is not required.

4.1.8 `field08_reviewers={reviewerA,reviewerBRequirement,appointmentReceipts,incompatibilityProof}`.

4.1.9 `field09_estimate={minHours,maxHours,estimateBasisId,confidenceClass}` with `0.25≤min≤max≤8.00`.

4.1.10 `field10_tests={positiveTestIds,negativeTestIds,failureTestIds,concurrencyTestIds,recoveryTestIds,attackTestIds,naProofs}`.

4.1.11 `field11_acceptance={binaryPredicates,requiredTerminal,denominators,zeroOpenConditions}`.

4.1.12 `field12_evidence={evidenceIds,locations,redactionProfile,producerIds,checkedAt,expiresAt,digests}`.

4.1.13 `field13_detection={detectorIds,signals,thresholdSources,runCadence,ownerIds}`.

4.1.14 `field14_rollbackOrDisable={targetId,authorityId,procedureId,testId,safeTerminal}`.

4.1.15 `field15_gate={blockedGateIds,openedGateIds,gateClaimLimits}`.

4.1.16 `field16_requirements={requirementIds,decisionIds,frameworkRequirementIds}`.

4.1.17 `field17_risk={threatIds,riskIds,findingIds,controlIds,residualRiskIds}`.

4.1.18 `field18_status={taskStatus,statusEvidenceId,updatedAt,updatedBy}`.

## 4.2 Additional non-credit metadata

4.2.1 `stageId`, `scopeClass`, `capabilityId`, `dataClassIds`, `providerIds`, `environmentIds` and `authorityEpoch` are required routing metadata but do not replace any of the eighteen fields.

4.2.2 `externalAuthoritySlotIds`, `externalWaitIds`, `mutexIds`, `resourceRoleIds`, `calendarIds`, `invalidationTriggers` and `supersedesTaskIds` are separate typed arrays and cannot appear in `predecessors`.

4.2.3 `notes` is optional non-normative text; it cannot add requirements, dependencies, evidence, authority or acceptance.

## 4.3 One-action and one-output invariants

4.3.1 one Task leaf has exactly one primary business or planning Action.

4.3.2 one Task leaf has exactly one primary Output ID and one authoritative producer.

4.3.3 preparation, execution, readback, reconciliation, review, approval and rollback are distinct leaves when each changes a different state or has a different producer.

4.3.4 a Task that says `and`, emits a set of unrelated Outputs, exceeds eight hours or needs two independent authorities is rejected and split before Candidate freeze.

4.3.5 a parent heading has no hours, status, evidence or completion credit.

# 5. Dependency, resource and wait contracts

## 5.1 Task DAG

5.1.1 every `TASK` predecessor is an exact Task leaf identity in the same Candidate universe.

5.1.2 self, future, dangling, duplicate and cyclic edges are forbidden.

5.1.3 a success Join lists every required predecessor Output and rejects ABSENT, UNKNOWN, EXPIRED, REVOKED, INVALIDATED, CONFLICT and AMBIGUOUS.

5.1.4 conditional branches use explicit condition, authority, source, true target, false target, unknown target, expiry, invalidators and Join.

5.1.5 a downstream Gate, final Master, Tal approval or Production result cannot be an ancestor of the Work it is intended to approve.

## 5.2 External authorities and waits

5.2.1 human appointment, Legal, Finance, provider entitlement, account/KYC, Meta asset state, Terms acceptance, DNS, procurement and observation windows are not Task predecessors unless a Task produces a typed receipt.

5.2.2 request Work and receipt-observation Work are separate leaves around an `ExternalWait` record.

5.2.3 external wait duration is Calendar time and never included in net engineering hours.

5.2.4 timeout, decline, stale evidence, changed terms and unavailable authority reach explicit safe terminals and cannot be converted into a guessed duration or PASS.

## 5.3 Resources and mutexes

5.3.1 each Task binds exact required roles, capacity units and calendars; named availability remains `unknown/unavailable` until an accepted appointment/calendar receipt exists.

5.3.2 a person cannot satisfy incompatible producer, approver, reviewer, reconciler, verifier or acceptance roles on the same root.

5.3.3 mutable database, namespace, release, credential, retention, billing and provider operations bind single-writer mutexes and fence epochs.

5.3.4 calendar computation is forbidden until role capacity, mutex occupancy, external waits and task durations are complete.

# 6. Test and Evidence contracts

## 6.1 TestDefinition

6.1.1 every test has exact subject, preconditions, authorized input provenance, action, oracle, expected terminal, evidence output and safe cleanup.

6.1.2 every leaf requires a Positive, Negative, Failure and Concurrency test unless a field-level N/A proof is independently reviewed.

6.1.3 Recovery and Attack modes are mandatory where mutable Effects, security boundaries, provider calls, queues, files, AI, retention, backup/restore or privileged actions apply.

6.1.4 generic shared tests receive no credit unless an exact selector proves the leaf-specific assertion and output.

6.1.5 no fake, mock, demo, sample or synthetic business data is readiness Evidence.

6.1.6 allowed test inputs are only an approved minimized/redacted real artifact, official provider sandbox/store artifact, normative standard vector or deterministic non-business attack literal, each with provenance, purpose, expiry and destruction.

## 6.2 MutationDefinition

6.2.1 one Mutation changes exactly one semantic target and records unchanged non-target bytes.

6.2.2 every Mutation binds exact detector IDs, expected failing assertions and a kill predicate.

6.2.3 required Mutations run under two independent runners or implementations; a surviving Mutation blocks the Candidate.

## 6.3 EvidenceDefinition

6.3.1 Evidence binds subject root, producer, method/tool version, raw result root, parsed assertion root, trusted time, redaction, retention, expiry and invalidators.

6.3.2 documentation/source observation, Legal interpretation, provider account state, runtime observation and reviewer assertion are distinct Evidence classes.

6.3.3 a post-delete query is Audit Evidence only and never the safety mechanism for deletion scope.

6.3.4 Restore Evidence binds exact backupId, database/object digests, consistency point, isolated target, retention-window proof and resurrection suppression.

# 7. Source, Legal and provider chronology

7.1 every external source begins with metadata-only discovery and an operation-specific Legal/Terms decision before content capture.

7.2 exact lifecycle=`MetadataObservation→LegalAssessment→LegalPermit→CapturePermit→AuthorizedCapture→RawDigest→SourceVerification→Parse→SourceUse→SourceSeal`.

7.3 Legal interpretation is stored in a separate `LegalSeal`; neither SourceSeal nor LegalSeal proves live provider entitlement.

7.4 live provider state requires an authorized account/plan/region observer, exact response digest, observedAt, expiry and safe state.

7.5 stale, missing, changed or ambiguous source/provider evidence invalidates all dependent Outputs transitively and reopens their Gates through protected CAS.

# 8. Data, Security and side-effect contracts

8.1 every physical copy is assigned one lifecycle-specific DataClass; mixed retention lifecycles are split.

8.2 retention uses a per-DataClass trigger matrix, blocks active records, gives Legal Hold precedence and never infers a trigger from absence.

8.3 deletion requires a short-lived immutable DeletionPlan with ID, digest, policy version, cutoff, provider-confirmed identity set and atomic execution bound to exactly that set.

8.4 every external or irreversible side effect uses separate Intent, Permit, Attempt and ProviderFact ledgers; timeout after the boundary is UNKNOWN and never blindly retried.

8.5 every sensitive identifier, key, digest, capability and randomness need is a SecurityValue record.

8.6 cryptographic randomness requires an exact use-specific X24 Decision with purpose, algorithm, scope, owner, expiry, revocation and negative branch; blanket approval is invalid.

# 9. Candidate, reviews and acceptance

## 9.1 Definition Candidate

9.1.1 freezes all Definitions, constructors, authorities, dependency topology, role matrix, test/mutation oracles and acceptance algorithms before Task materialization.

9.1.2 receives Producer QA, Source/Legal verification, Independent Review A and blind Review B on the same exact root.

9.1.3 Review B envelope is sealed before Review A begins and becomes eligible through a boolean-only token after A satisfies the configured zero-open policy.

9.1.4 protected DefinitionAcceptance CAS issues a scoped MaterializationPermit or exact rejection terminal.

## 9.2 Task Registry Candidate

9.2.1 contains every Task leaf, Output, Edge, Join, conditional branch, mutex, resource, calendar, external wait, requirement/threat/control/gate crosswalk and invalidation trigger.

9.2.2 Candidate root is non-self-referential and domain-separated from the detached EvidenceBundle root.

9.2.3 two structural parsers and semantic mutation runners independently reconstruct denominators, DAGs, sums and coverage.

9.2.4 Review A and Review B consume identical immutable Candidate/Evidence/coverage roots; Review B remains blind under the sealed-envelope rule.

9.2.5 Comparison covers every assertion pair and Reconciliation resolves every difference through evidence, never waiver.

## 9.3 Gate29 planning acceptance

9.3.1 exact veto scopes include Product, Engineering, Architecture, Security, Privacy/Legal, Database, SRE, QA, UX/Accessibility, Finance and WhatsApp safety.

9.3.2 acceptance requires zero open P0/P1/P2 and one exact scoped, unexpired, revocable RiskAcceptance for every P3.

9.3.3 protected Gate29 CAS binds expected head/version, Candidate root, Evidence root, Review/Reconciliation root, VetoSet root, Tal exact-root approval, authority epoch and trusted time.

9.3.4 two independent readbacks must agree on the accepted head. Conflict, timeout, response loss or ambiguity emits no PlanningAcceptanceHandoff.

9.3.5 Gate29 approval authorizes only implementation planning according to accepted leaves. A new explicit user instruction is still required before product mutation under the current freeze contract.

# 10. Universe derivation

## 10.1 Mandatory source partitions

10.1.1 `P01=MasterSections1To34`.

10.1.2 `P02=RequirementsFromTwoSpecificationsAnd83Questions`.

10.1.3 `P03=DecisionsD01ToD31AndAmendments`.

10.1.4 `P04=FindingsMPF001ToMPF052`.

10.1.5 `P05=FrameworkAndProcessFR001ToFR076RG001ToRG002`.

10.1.6 `P06=DynamicSourcesDS001ToDS025`.

10.1.7 `P07=ThreatsTH001ToTH032`.

10.1.8 `P08=ControlsCTL001ToCTL020`.

10.1.9 `P09=GateAndGateInstanceUniverse`.

10.1.10 `P10=Scope1Scope3Scope4AndConditionalPackages`.

10.1.11 `P11=ExternalDecisionsX01ToX27`.

10.1.12 `P12=CurrentCodeMigrationRouteRuntimeUiAndEvidenceInventory`.

## 10.2 Derivation algorithm

10.2.1 freeze exact input roots and enumerate each partition without ranges in the material Candidate.

10.2.2 derive one obligation for every Action+Scope+Requirement combination and record exact source lineage.

10.2.3 split compound obligations by state transition, authority, Output, test oracle or rollback boundary.

10.2.4 create discovery, appointment, source capture, external request, receipt observation, Definition, implementation, verification, review, rollback drill, evidence and acceptance leaves separately where applicable.

10.2.5 deduplicate only when operation, scope, input, output, authority, tests, risks and Gates are semantically identical; preserve a reviewed equivalence receipt.

10.2.6 derive Crosswalks both directions and reject any orphan Requirement, Decision, Finding, Framework, Dynamic source, Threat, Control, Gate or Task.

10.2.7 materialize exact Stage/Scope totals only from unique leaves; parent prose and external waits contribute zero person-hours.

10.2.8 run topological sort, SCC, reachability, one-root/one-sink policy where applicable, mutex conflict, role-capacity and conditional-leakage checks.

## 10.3 Initial ordered Stage partitions

10.3.1 `S00=MasterPlanningAndGate29`.

10.3.2 `S01=InventoryAndSourceOfTruth`.

10.3.3 `S02=GitGitHubAndSupplyChain`.

10.3.4 `S03=GovernanceRACIAccountsBudgets`.

10.3.5 `S04=ArchitectureAndTrustBoundaries`.

10.3.6 `S05=ThreatModelAndSecurityControls`.

10.3.7 `S06=InfrastructureNetworkAndConfiguration`.

10.3.8 `S07=PostgreSQLDataModelAndTenantIsolation`.

10.3.9 `S08=IdentityOrganizationsRolesInvitations`.

10.3.10 `S09=MetaOnboardingAssetsCredentials`.

10.3.11 `S10=WebhookIngress`.

10.3.12 `S11=WhatsAppRateQualityCapacity`.

10.3.13 `S12=TrustedOutboundInstances`.

10.3.14 `S13=ContactsConsentImportSegmentsSuppression`.

10.3.15 `S14=TemplatesContentMedia`.

10.3.16 `S15=CampaignsSchedulingRecipientExecution`.

10.3.17 `S16=SharedInboxHumanCollaboration`.

10.3.18 `S17=FlowBuilderAndBotRuntime`.

10.3.19 `S18=AIKnowledgeRAGAndFilePipeline`.

10.3.20 `S19=BillingEntitlementsAndFinance`.

10.3.21 `S20=SystemAdminSupportBreakGlass`.

10.3.22 `S21=PrivacyRetentionLegalHoldAndRights`.

10.3.23 `S22=ObservabilitySLOOnCallIncidentResponse`.

10.3.24 `S23=BackupRestoreBCPAndRansomware`.

10.3.25 `S24=QAPerformanceSecurityAdversarialVerification`.

10.3.26 `S25=UXAccessibilityRTLi18nProductClarity`.

10.3.27 `S26=StagingCanaryClosedPilotGoNoGo`.

10.3.28 `S27=CompetitorResearchAndEvidenceRoadmap`.

10.3.29 `S28=EnterpriseIntegrationsMobileAndScale`.

# 11. Required Producer QA

11.1 raw Candidate identity and normalized-self identity replay by two implementations.

11.2 duplicate clause, Task, Output, Test, Evidence, Edge, Wait, role, appointment, resource, mutex, Requirement, Decision, Finding, Framework, Dynamic source, Threat, Control and Gate IDs=`0`.

11.3 missing fields, inherited fields, unknown hidden as empty/zero/false, invalid enums/types, unframed digest preimages and invalid paths=`0`.

11.4 Tasks with more than one Action, more than one primary Output, `maxHours>8`, parent hours/status/credit or nonnumeric estimate=`0`.

11.5 dangling, self, future, duplicate, cyclic and backward-acceptance edges=`0`.

11.6 Work/Output producer parity and one-authority-per-output defects=`0`.

11.7 missing Positive/Negative/Failure/Concurrency coverage or unreviewed N/A proofs=`0`.

11.8 required Recovery/Attack gaps, generic test reuse, semantic noun/state mismatch and surviving Mutations=`0`.

11.9 orphan forward/inverse Crosswalk references and denominator mismatches=`0`.

11.10 double-counted Task hours, external waits counted as hours, conditional package leakage and Scope denominator ambiguity=`0`.

11.11 role conflicts, self-review, unsealed Review B, missing boolean-only eligibility and shared producer/acceptance authority=`0`.

11.12 source/legal/provider class conflation, stale source credit, documentation-as-entitlement and live-vs-sandbox confusion=`0`.

11.13 accepted or completed credit without exact Evidence/Review/Acceptance receipt=`0`.

# 12. Current disposition

12.1 Definition rows materialized=`1 document`; independently reviewed=`0`; accepted=`0`.

12.2 Task leaves materialized=`0`; exact denominator=`unknown/unavailable`.

12.3 Task DAGs materialized for Scope1/Scope3/Scope4=`0/3`.

12.4 Bottom-up hours and exact remaining hours=`unknown/unavailable`.

12.5 exact progress percentage=`unknown/unavailable`; accepted planning closure remains `0/21=0%` under the historical 21-stage planning denominator.

12.6 next valid action=`derive and materialize the complete S00 planning/acceptance leaf partition, then run fresh Producer QA before expanding S01–S28`.

12.7 Gate29=`BLOCKED`; development freeze=`ACTIVE`.
