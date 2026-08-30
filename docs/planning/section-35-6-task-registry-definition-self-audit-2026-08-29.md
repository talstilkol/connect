# 1. Connect — Section 35.6 Task Registry Definition Self-audit

## 1.1 Identity and scope

1.1.1 `artifactId=CONNECT-SECTION-35-6-TASK-REGISTRY-DEFINITION-SELF-AUDIT-2026-08-29`.

1.1.2 subject path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-task-registry-definition-candidate-2026-08-29.md`.

1.1.3 subject raw SHA-256=`1e3b0a3d64a60108db358d52d98b399e8739e489a3ebb6742e9b10f20ea60beb`.

1.1.4 companion architecture path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-bootstrap-and-candidate-generation-architecture-2026-08-29.md`.

1.1.5 companion architecture raw SHA-256=`3341f8aefad38f52921287ccc6224b7ab8a5b1c17e730b420508812b72d7fac6`.

1.1.6 audit class=`PRODUCER-SELF-AUDIT-NOT-INDEPENDENT-REVIEW-NOT-ACCEPTANCE`.

1.1.7 verdict=`REJECT-TRD-1.0-DRAFT-AS-FREEZE-CANDIDATE; BUILD-TRD-2.0-SUCCESSOR-AFTER-INDEPENDENT-MASTER-AUDITS`.

1.1.8 new findings=`P0=8/P1=19/P2=7/P3=0`; accepted closure=`0/34`.

1.1.9 Task leaves remain `0`; no Product Code, Build, runtime Test, Git mutation, Push, Deployment, provider/account mutation, credential use, procurement or Production action was performed or authorized.

# 2. P0 findings

## 2.1 `TRD-P0-001` — Same-generation self-authorization is possible

2.1.1 the subject describes Definition and Task-registry reviews but does not prohibit their Work records from being members of the exact subject they validate.

2.1.2 impact=`self-membership, circular dependency, backward acceptance edge or self-issued completion credit`.

2.1.3 remediation=`adopt separate BootstrapAct, CandidateLifecycleAct, PlanningGenerationTask and ProgramTask identity domains from the companion architecture`.

2.1.4 acceptance=`no Candidate contains its own QA, Review, reconciliation, veto, Tal approval, acceptance, root or Handoff receipt; mutation vector must reject each attempted cycle`.

## 2.2 `TRD-P0-002` — Canonical serialization and root construction are incomplete

2.2.1 field ordering is described at a high level, but there is no byte-level canonical serializer for records, arrays, typed unknowns, Unicode normalization, decimal hours, timestamps, paths or the Candidate manifest.

2.2.2 impact=`two honest parsers can compute different roots while both claim conformance`.

2.2.3 remediation=`define exact UTF-8 byte grammar, domain separation, length framing, field order, array comparators, newline policy, numeric encoding and rejection vectors`.

2.2.4 acceptance=`two independent implementations reproduce every valid vector root and reject every invalid or ambiguous vector`.

## 2.3 `TRD-P0-003` — Candidate, Evidence, Review and Acceptance objects lack finite schemas

2.3.1 Sections9.1–9.3 name objects and algorithms but do not define complete local fields, constructors, state machines or XOR result unions for them.

2.3.2 impact=`a prose receipt could be treated as authority without exact subject, Evidence, expected head, epoch, time, veto or readback binding`.

2.3.3 remediation=`add DefinitionCandidate, CandidateManifest, EvidenceBundle, ReviewPacket, ReviewAssertion, ReviewComparison, Reconciliation, VetoSet, RiskAcceptance, ApprovalObservation, AcceptanceAttempt, Readback and AcceptanceReceipt schemas`.

2.3.4 acceptance=`missing, stale, changed-root, conflict, timeout, response-loss and ambiguous vectors all emit no permit or Handoff`.

## 2.4 `TRD-P0-004` — Authority and role separation are not executable

2.4.1 Task fields name people and reviewers, but Role, Person, Appointment, authority scope, authority epoch, revocation, incompatibility and trusted-time objects are not defined.

2.4.2 impact=`unknown or self-appointed actors can appear syntactically complete`.

2.4.3 remediation=`finite RoleDefinition, PersonReference, AppointmentReceipt, IncompatibleRolePair, AuthorityHead and TimeEvidence registries with revocation and expiry`.

2.4.4 acceptance=`no producer/reviewer/reconciler/veto/approval-observer/acceptance-writer conflict survives either parser or mutation runner`.

## 2.5 `TRD-P0-005` — External request, wait and receipt-observation chronology is incomplete

2.5.1 Section5.2 states the rule but provides no schemas or identity constructors for request Work, ExternalWait, external authority receipt, observation Work, timeout, decline, revocation or stale receipt.

2.5.2 impact=`human, Legal, Finance, provider, Meta or Tal approval can be silently modeled as a normal Task predecessor or guessed duration`.

2.5.3 remediation=`define RequestOutput, ExternalWait, ReceiptObservation and ExternalDisposition unions; bind each to exact authority, expected receipt class, expiry and invalidators`.

2.5.4 acceptance=`absence, timeout, decline, stale, changed terms and ambiguity are distinct safe terminals and never PASS`.

## 2.6 `TRD-P0-006` — Requirement universe and Stage partition are not rooted

2.6.1 P01–P12 and S00–S28 are prose labels without exact member manifests, roots, accepted equivalence rules or mapping to the historical twenty-one capability packages and twenty-nine execution stages.

2.6.2 impact=`a Requirement, Finding, Decision, conditional capability or whole Stage can disappear while coverage still reports complete`.

2.6.3 remediation=`materialize exact partition-member manifests, forward/inverse crosswalks and a reviewed mapping among source sections, 21 capability packages, S00–S28 and Scope1/3/4`.

2.6.4 acceptance=`zero orphan, duplicate, overlapping-without-equivalence or unmapped identity in both directions`.

## 2.7 `TRD-P0-007` — Protected state mutation is unspecified

2.7.1 protected CAS is required for Definition acceptance, Candidate acceptance, Gate29 and transitive reopen, but the storage authority, expected-head object, compare bytes, idempotency, fence epoch, retry prohibition and authoritative readback mechanism are not defined.

2.7.2 impact=`lost response, concurrent writer or stale approval can produce split-brain acceptance`.

2.7.3 remediation=`define one append-only AcceptanceHead authority and exact Attempt/Result/ObserverA/ObserverB/Reconciliation state machine before any acceptance`.

2.7.4 acceptance=`all concurrent, stale, partial, lost-response and recovery mutations converge to one verified result or BLOCKED; automatic second write is forbidden`.

## 2.8 `TRD-P0-008` — Materialization before accepted Definition is not mechanically blocked

2.8.1 the subject says materialization is forbidden, but no exact `DefinitionMaterializationPermit` schema, scope, expiry, revocation or validator is defined.

2.8.2 impact=`draft rules can generate identities that later appear canonical`.

2.8.3 remediation=`add a permit verifier as a hard precondition for G2 and G3 construction and namespace publication`.

2.8.4 acceptance=`absent, draft-root, superseded-root, expired, revoked or wrong-scope permit makes every generated record INVALIDATED with zero credit`.

# 3. P1 findings

## 3.1 `TRD-P1-001` — Scalar and union type set is not total

3.1.1 missing definitions include `Null/Genesis`, typed `Unknown`, `ConfidenceClass`, `ScopeId`, `PersonId`, `RoleId`, `GateId`, `RequirementId`, `Claim`, `RecordRoot`, `AuthorityEpoch`, `Duration` and bounded integer cardinalities.

3.1.2 remediation=`define every referenced scalar/union and valid/invalid vector`.

## 3.2 `TRD-P1-002` — `scopeId` is used but never defined

3.2.1 Task identity uses `scopeId`; metadata defines only `scopeClass`.

3.2.2 remediation=`define exact ScopeDefinition and distinguish unique Scope instance from Scope class`.

## 3.3 `TRD-P1-003` — Record-version chain is incomplete

3.3.1 `previousRecordRoot` has no version-one Genesis value, record-root constructor, expected-head CAS or fork/conflict rule.

3.3.2 remediation=`define immutable record envelope, Genesis, successor constructor, supersession and fork rejection`.

## 3.4 `TRD-P1-004` — Task status cannot represent the full lifecycle

3.4.1 the five Hebrew values omit candidate, accepted-plan, invalidated, superseded, rejected and ambiguous states, while `OutputState` uses a different lifecycle.

3.4.2 remediation=`separate planning lifecycle, execution status, evidence status and acceptance status; define legal transitions`.

## 3.5 `TRD-P1-005` — OutputDefinition is only an inline field list

3.5.1 it lacks producer parity, content root, lifecycle transitions, publication state, supersession, consumer claim limits and one-authority invariant.

3.5.2 remediation=`create a finite OutputDefinition schema and constructor with inverse Task parity check`.

## 3.6 `TRD-P1-006` — TestDefinition is not machine-complete

3.6.1 Section6.1 omits typed fields, identity framing, selectors, runner authority, fixtures/provenance, cleanup evidence, result schema and recurrence rules.

3.6.2 remediation=`materialize exact Positive, Negative, Failure, Concurrency, Recovery and Attack definitions before runs`.

## 3.7 `TRD-P1-007` — MutationDefinition is not machine-complete

3.7.1 exact transformation encoding, unchanged-byte proof, clean control, runner isolation, result comparison and surviving-mutation disposition are absent.

3.7.2 remediation=`define finite one-delta Mutation rows and two independent run schemas`.

## 3.8 `TRD-P1-008` — EvidenceDefinition is not machine-complete

3.8.1 trusted time, collection tool lineage, raw/parsed binding, redaction verification, custody, retention, expiry, invalidation and restoration are prose only.

3.8.2 remediation=`define evidence classes and detached EvidenceBundle schema with no secret-bearing locator`.

## 3.9 `TRD-P1-009` — Edge, Join and conditional branch schemas are absent

3.9.1 dependency classes are enumerated but exact Edge fields, Output-to-input bindings, Join truth table, unknown branch and terminal leakage rules are not defined.

3.9.2 remediation=`define typed Edge/Join/Condition records and exhaustive truth vectors`.

## 3.10 `TRD-P1-010` — Resource, mutex and calendar algorithms are absent

3.10.1 roles and capacities are mentioned without exact units, calendars, timezone/DST, parallel capacity, mutex interval, acquisition order, deadlock or release rules.

3.10.2 remediation=`define ResourceRequirement, CapacityCalendar, Mutex and deterministic schedule algorithms`.

## 3.11 `TRD-P1-011` — Estimate and actual-work accounting are incomplete

3.11.1 there is no baseline freeze, actual-hours ledger, re-estimate trigger, rework accounting, conditional probability rule, confidence enum or double-credit prevention.

3.11.2 remediation=`define EstimateBasis, BaselineEstimate, ActualWork, WorkCredit and change-control records`.

## 3.12 `TRD-P1-012` — Error and safe-terminal taxonomy is fragmented

3.12.1 `Terminal` lacks retryability, side-effect certainty, severity, recovery authority and escalation mapping.

3.12.2 remediation=`define ErrorDisposition with XOR terminal, side-effect knowledge and allowed next action`.

## 3.13 `TRD-P1-013` — Source, Legal and provider records are not defined

3.13.1 chronology is strong prose but lacks finite MetadataObservation, LegalAssessment, Permit, Capture, SourceSeal, LegalSeal, ProviderObservation and SourceUse schemas.

3.13.2 remediation=`materialize each state transition, authority, expiry and invalidator separately`.

## 3.14 `TRD-P1-014` — Data and Security lifecycle records are not defined

3.14.1 DataClass, trigger matrix, active-record block, Legal Hold, DeletionPlan v2, SecurityValue, use-specific X24 and provider identity set are requirements without schemas.

3.14.2 remediation=`define finite lifecycle records and negative/concurrency/recovery vectors`.

## 3.15 `TRD-P1-015` — Backup/Restore Evidence v2 is incomplete

3.15.1 exact backupId, database/object consistency point, R2/retention proof, WORM, key revision, isolated target, privacy replay and resurrection suppression lack schemas and acceptance predicates.

3.15.2 remediation=`define BackupManifestV2, RestorePlanV2, RestoreEvidenceV2 and cohort-window proof`.

## 3.16 `TRD-P1-016` — Change invalidation and reopen are not executable

3.16.1 transitive invalidation is stated without ChangeEvent, ImpactSet, stale-output exclusion, protected Reopen CAS or post-acceptance successor rules.

3.16.2 remediation=`define recurring change-detection and atomic reopen lifecycle`.

## 3.17 `TRD-P1-017` — Archive, custody and offline replay are absent

3.17.1 Definitions, source bytes, generators, parsers, runners, raw results, reviews and acceptance receipts are not guaranteed restorable.

3.17.2 remediation=`define immutable Archive/Custody manifest, restore test and offline replay parity`.

## 3.18 `TRD-P1-018` — Workspace path safety is underspecified

3.18.1 containment is required but Unicode/case normalization, symlink, alias, traversal, separator, reserved-name, hard-link and platform-equivalence scans are not defined.

3.18.2 remediation=`define canonical path profile and dual path scanners with attack vectors`.

## 3.19 `TRD-P1-019` — No finite conformance vector corpus exists

3.19.1 no exact valid bytes, expected roots, invalid bytes, parser terminal or mutation kill predicate is supplied for any schema.

3.19.2 remediation=`freeze a versioned Definition-conformance corpus before Parser A/B execution`.

# 4. P2 findings

## 4.1 `TRD-P2-001` — Human-readable and machine-readable views are not separated

4.1.1 remediation=`derive the numbered Hebrew Master view and machine registry from one accepted source without hand-maintained duplicate facts`.

## 4.2 `TRD-P2-002` — Reporting vector is not defined

4.2.1 remediation=`publish separate Bootstrap, Planning-generation, Program and Gate denominators plus count/hour progress; no blended percentage before all roots exist`.

## 4.3 `TRD-P2-003` — Claim vocabulary is not finite

4.3.1 remediation=`define claim IDs for planned, local, live, provider-verified, legally-reviewed, production-ready and accepted; reject stronger synonyms`.

## 4.4 `TRD-P2-004` — Secret/PII minimization for planning records is incomplete

4.4.1 remediation=`define forbidden field patterns, redaction profiles, locator allowlists and leak-response invalidation`.

## 4.5 `TRD-P2-005` — Version migration and legacy alias lifecycle are absent

4.5.1 remediation=`define successor mapping, tombstones, last-reader proof and zero silent fallback for every Definition version`.

## 4.6 `TRD-P2-006` — Observability for the planning control plane is absent

4.6.1 remediation=`define PII-safe events and detectors for stale roots, changed bytes, parser drift, role expiry, review leakage, veto change, CAS conflict and invalidation backlog`.

## 4.7 `TRD-P2-007` — Beginner-facing explanation is incomplete

4.7.1 remediation=`for every domain add a short Hebrew purpose, cause-effect explanation, safe-state example and verification path without weakening normative rules`.

# 5. Successor construction order

5.1 wait for the three independent Master audits bound to root `643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

5.2 build an identity-level Review Comparison and merge no Finding by severity or topic without reviewed equivalence.

5.3 materialize every schema and algorithm required by P0 findings first, then P1 and P2.

5.4 produce `TRD-2.0-draft` as a new immutable successor; do not patch or relabel TRD-1.0 as accepted.

5.5 freeze finite conformance vectors and execute Parser A/B plus mutation runners on the same exact root.

5.6 obtain named independent roles, pre-seal Review B, execute A/B, compare and reconcile without subject mutation.

5.7 present exact roots to Tal; only a matching response may enter protected DefinitionAcceptance.

5.8 current disposition=`TRD-1.0-REJECTED-AS-FREEZE-CANDIDATE`; accepted findings=`0/34`; Definition accepted=`0/1`; Gate29=`BLOCKED`; development freeze=`ACTIVE`.
