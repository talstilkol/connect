# 1. Connect — Section 35.6 Bootstrap and Candidate Generation Architecture

## 1.1 Identity and disposition

1.1.1 `artifactId=CONNECT-SECTION-35-6-BOOTSTRAP-AND-CANDIDATE-GENERATION-ARCHITECTURE-2026-08-29`.

1.1.2 `architectureVersion=BCA-1.0-draft`.

1.1.3 durable Master input raw SHA-256=`643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

1.1.4 Task Registry Definition input raw SHA-256=`1e3b0a3d64a60108db358d52d98b399e8739e489a3ebb6742e9b10f20ea60beb`.

1.1.5 recovery ledger input raw SHA-256 before the user-approval interpretation amendment=`unknown/unavailable`; current recovery ledger root must be frozen again before Candidate construction.

1.1.6 status=`DRAFT-NOT-REVIEWED-NOT-ACCEPTED`.

1.1.7 this artifact is a planning correction only. It authorizes no Product Code, Build, runtime Test, Git mutation, Push, Deployment, provider/account mutation, credential use, procurement or Production change.

## 1.2 P0 problem being corrected

1.2.1 Section35.6 is intended to be the sole executable Task registry and the source of completion, hours, DAG and Gate coverage.

1.2.2 Work that creates, parses, reviews, reconciles or accepts a Candidate cannot be a member of the same Candidate root whose validity that Work is intended to establish.

1.2.3 placing such Work inside the subject root creates one or more of the following invalid states: self-membership, backward acceptance edge, circular dependency, self-authorization, mutable review subject, or completion credit granted by the object seeking approval.

1.2.4 `findingId=REC-P0-002`; severity=`P0`; status=`OPEN`; safe terminal=`BLOCKED`; impact=`no Definition permit, Task-registry acceptance or Gate29 acceptance may be issued under a single-generation model`.

1.2.5 the earlier provisional list of sixty-three S00 operations is rejected as a Task-leaf universe because it mixed bootstrap acts, external appointments, Candidate review, Candidate acceptance and post-acceptance derivation inside one identity domain.

# 2. Separate identity domains and denominators

## 2.1 BootstrapAct domain

2.1.1 `BootstrapAct` is a detached, zero-product-credit governance act used only to create and validate the first accepted Definition.

2.1.2 its identity domain is `connect-bootstrap-act-v1`; it is never serialized as a `TaskLeafDefinition` and never appears in a Task predecessor list.

2.1.3 Bootstrap effort is reported in a separate `BootstrapHours` denominator; it is never included in Product completion, Stage hours or Section35.6 Task totals.

2.1.4 Bootstrap completion cannot be inferred from document presence. It requires exact Output, Evidence and external attestation roots.

## 2.2 CandidateLifecycleAct domain

2.2.1 `CandidateLifecycleAct` is a detached act that performs Producer QA, independent review, comparison, reconciliation, veto evaluation, exact-root user approval observation or protected acceptance for an already frozen subject root.

2.2.2 its identity domain is `connect-candidate-lifecycle-act-v1`.

2.2.3 it is not a member of the subject Candidate, does not receive subject completion credit and cannot change the subject bytes.

2.2.4 every Lifecycle act binds one immutable `subjectRoot`, one immutable `evidenceBundleRoot`, one instruction root, one authority epoch and one expected acceptance head/version.

## 2.3 PlanningGenerationTask domain

2.3.1 `PlanningGenerationTask` is a Task governed by the accepted Definition and an accepted Generation Plan.

2.3.2 it derives or materializes one planning Output such as one Stage leaf partition, one Crosswalk partition, one DAG partition or one schedule partition.

2.3.3 its Outputs become inputs to a later Program Task Registry Candidate; they cannot retroactively enter the accepted Generation Plan root.

2.3.4 Planning-generation effort is reported in a separate `PlanningGenerationHours` denominator and does not count as Product implementation completion.

## 2.4 ProgramTask domain

2.4.1 `ProgramTask` is an atomic Product, Engineering, Security, QA, UX, Operations, Legal-request, provider-request, evidence, release or recovery Task intended for execution only after Gate29 and a new explicit implementation instruction.

2.4.2 Program Tasks form the Section35.6 implementation denominator from which Scope1, Scope3 and Scope4 completion and Remaining person-hours are derived.

2.4.3 external waits, authority receipts and observation windows remain typed non-hour records; request Work and receipt-observation Work remain separate Program Tasks.

## 2.5 Percentage reporting

2.5.1 before all four identity domains have accepted finite denominators, one exact whole-program percentage is `unknown/unavailable`.

2.5.2 permitted interim reporting is a vector only: `Bootstrap accepted acts/total accepted acts`, `Planning-generation accepted Tasks/total accepted Tasks`, `Program accepted Tasks/total accepted Tasks`, and `Gate acceptance state`.

2.5.3 after denominators and estimates are accepted, hour-weighted progress is calculated independently per domain as `sum accepted baseline maxHours for terminal accepted leaves / sum accepted baseline maxHours for all in-scope leaves`.

2.5.4 count-weighted and hour-weighted percentages are reported together and never merged; external calendar waits are reported separately.

# 3. Ordered generation model

## 3.1 Generation G0 — Observed baseline

3.1.1 freeze the durable Master bytes, current repository state, available durable specifications, answers, Decisions, Findings and surviving evidence without granting correctness credit.

3.1.2 output=`ObservedBaselineCandidate`; status=`MATERIALIZED-NOT-ACCEPTED` only after exact roots and inventory completeness are independently reproduced.

3.1.3 temporary paths, remembered digests, historical claims and absent subjects remain excluded or explicitly marked `DELETED-TEMPORARY-NOT-ADMISSIBLE`.

## 3.2 Generation G1 — Definition Candidate

3.2.1 produce a finite Definition Candidate containing scalar types, schemas, canonical serialization, deterministic identity constructors, role conflicts, time, source/legal chronology, evidence, tests, mutations, dependencies, resources, waits, lifecycle states, acceptance algorithms and invalidation.

3.2.2 G1 contains no Task leaves and no claim about a final leaf denominator.

3.2.3 detached BootstrapActs run two parsers, Producer QA, pre-sealed blind Review B preparation, Review A, boolean-only B eligibility, Review B, assertion comparison and evidence-based reconciliation.

3.2.4 named veto appointments, Tal exact-root approval and protected DefinitionAcceptance readback are external attestations; missing, stale, conflicting, timed-out, ambiguous or revoked state emits no MaterializationPermit.

3.2.5 confirmed G1 acceptance emits one scoped, expiring and revocable `DefinitionMaterializationPermit` bound to the exact Definition root.

## 3.3 Generation G2 — Planning Generation Plan Candidate

3.3.1 under the accepted G1 Definition, materialize a finite Generation Plan containing atomic Tasks for complete source-partition inventory, Stage S00–S28 obligation derivation, Task materialization, crosswalk construction, DAG construction, schedule derivation and Master assembly inputs.

3.3.2 every G2 Task has one Action, one primary Output, exact inputs, all mandatory fields, `maxHours≤8`, exact Tests and no inherited fields.

3.3.3 G2 is frozen before execution; detached CandidateLifecycleActs perform QA, blind reviews, reconciliation and protected acceptance.

3.3.4 confirmed G2 acceptance emits one `PlanningGenerationExecutionPermit`; no G2 Task runs before that receipt.

## 3.4 Generation G3 — Program Task Registry Candidate

3.4.1 execute accepted G2 Tasks to derive every atomic Program Task and all supporting Output, Test, Evidence, Edge, Join, branch, external wait, authority slot, role, calendar, resource, mutex, invalidation and crosswalk records.

3.4.2 G3 includes every in-scope leaf for Scope1, Scope3, Scope4 and conditional packages, but excludes all acts that review or accept G3 itself.

3.4.3 the G3 root is immutable and non-self-referential; detached Evidence, Producer QA, Review A, blind Review B, comparison and reconciliation bind the same exact root.

3.4.4 any change requested by a review creates G3 successor bytes and restarts both reviews; a review never patches its subject in place.

3.4.5 confirmed G3 acceptance emits one `ProgramTaskRegistryAcceptanceReceipt`; it grants no implementation authority.

## 3.5 Generation G4 — Master Acceptance Candidate

3.5.1 deterministically assemble the new Master from accepted G1 Definition, accepted G2 Generation Plan results, accepted G3 Program Task Registry, exact crosswalks, DAGs, Bottom-up estimates, role-capacity constraints, external waits, risks, Gates and all current Decisions.

3.5.2 G4 contains readable numbered trees and machine-replayable registries but excludes all acts that review or accept G4 itself.

3.5.3 detached lifecycle acts perform full QA, Review A, pre-sealed blind Review B, comparison, reconciliation, named veto evaluation and Tal exact-root approval observation.

3.5.4 Gate29 uses a protected compare-and-swap over exact G4 Candidate, Evidence, Review/Reconciliation, VetoSet, Tal approval, authority epoch and expected-head roots.

3.5.5 two independent authoritative readbacks must agree. Conflict, timeout, response loss or ambiguity yields `BLOCKED` and no PlanningAcceptanceHandoff.

3.5.6 confirmed G4 acceptance emits one `PlanningAcceptanceHandoff`; Product mutation remains frozen until a later explicit implementation instruction.

# 4. BootstrapAct sequence for G1

## 4.1 Baseline acts

4.1.1 `B001`: freeze the exact durable Master root; Output=`MasterInputRootReceipt`; estimate=`0.50–1.00 net person-hours`.

4.1.2 `B002`: inventory current Git branch, history, remotes, tracked/untracked state and claim mismatch; Output=`RepositoryTruthReceipt`; estimate=`0.50–1.00`.

4.1.3 `B003`: register every reset-lost temporary subject and remove it from admissible evidence sets; Output=`TemporaryLossRegister`; estimate=`0.50–1.00`.

4.1.4 `B004`: reproduce Master physical identity, numbered-clause count, duplicate scan and section sequence; Output=`StructuralScanReceipt`; estimate=`1.00–2.00`.

4.1.5 `B005`: run independent structural review of the exact Master root; Output=`MasterStructuralReview`; estimate=`4.00–8.00`.

4.1.6 `B006`: run independent security-semantic review of the exact Master root; Output=`MasterSecuritySemanticReview`; estimate=`4.00–8.00`.

4.1.7 `B007`: run independent schedule-estimate review of the exact Master root; Output=`MasterScheduleEstimateReview`; estimate=`4.00–8.00`.

4.1.8 `B008`: compare all three review assertion universes and register every agreement, conflict, omission and root mismatch; Output=`MasterReviewComparison`; estimate=`2.00–4.00`.

## 4.2 Definition construction acts

4.2.1 `B009`: enumerate every required Definition type and invariant from G0 plus B005–B008; Output=`DefinitionRequirementManifest`; estimate=`3.00–6.00`.

4.2.2 `B010`: materialize Definition Candidate G1 without Task leaves; Output=`DefinitionCandidateG1`; estimate=`6.00–8.00`.

4.2.3 `B011`: freeze canonical serialization, raw root, normalized root and detached Evidence root; Output=`DefinitionFreezeReceipt`; estimate=`1.00–2.00`.

4.2.4 `B012`: execute independent Definition Parser A; Output=`DefinitionParseA`; estimate=`2.00–4.00`.

4.2.5 `B013`: execute independent Definition Parser B; Output=`DefinitionParseB`; estimate=`2.00–4.00`.

4.2.6 `B014`: compare Parser A/B typed outputs, denominators and roots; Output=`DefinitionParserComparison`; estimate=`1.00–2.00`.

4.2.7 `B015`: run Producer QA and all finite valid/invalid/mutation vectors; Output=`DefinitionProducerQA`; estimate=`4.00–8.00`.

## 4.3 External role and review acts

4.3.1 `B016`: issue an exact request for named Primary, Backup, Review A, blind Review B, Reconciler, Veto and Acceptance authorities; Output=`RoleAppointmentRequest`; estimate=`0.50–1.00`; external wait=`unknown/unavailable`.

4.3.2 `B017`: observe and verify appointment receipts without inventing missing roles; Output=`RoleAppointmentSet`; estimate=`1.00–2.00`; missing or conflicting receipt terminal=`BLOCKED`.

4.3.3 `B018`: construct identical Review A/B packets and pre-seal the Review B envelope before A begins; Output=`DefinitionReviewPacketSeal`; estimate=`1.00–2.00`.

4.3.4 `B019`: perform Independent Review A; Output=`DefinitionReviewA`; estimate=`4.00–8.00`.

4.3.5 `B020`: evaluate only the configured zero-open policy and emit a boolean-only Review B eligibility token; Output=`ReviewBEligibilityToken`; estimate=`0.50–1.00`.

4.3.6 `B021`: perform blind Independent Review B from the pre-sealed packet; Output=`DefinitionReviewB`; estimate=`4.00–8.00`.

4.3.7 `B022`: compare every A/B assertion and reject mismatched subjects, instructions, evidence or tool lineage; Output=`DefinitionReviewComparison`; estimate=`1.00–2.00`.

4.3.8 `B023`: reconcile every difference by evidence; any subject-byte change creates a new G1 Candidate and restarts B011–B023; Output=`DefinitionReviewReconciliation`; estimate=`2.00–6.00` per unchanged-root cycle.

## 4.4 Definition acceptance acts

4.4.1 `B024`: create immutable veto and residual-risk dispositions for the exact G1 root; Output=`DefinitionVetoSet`; estimate=`1.00–3.00`; external authority wait=`unknown/unavailable`.

4.4.2 `B025`: present the exact G1, Evidence, QA, Review/Reconciliation and Veto roots to Tal; Output=`TalExactRootApprovalRequest`; estimate=`0.50–1.00`; external wait=`unknown/unavailable`.

4.4.3 `B026`: observe Tal's exact-root response and verify scope, expiry and root parity; Output=`TalExactRootApprovalObservation`; estimate=`0.50–1.00`; blanket or changed-root response terminal=`BLOCKED`.

4.4.4 `B027`: execute protected DefinitionAcceptance against expected head/version and authority epoch; Output=`DefinitionAcceptanceAttempt`; estimate=`1.00–2.00`.

4.4.5 `B028`: perform authoritative readback A; Output=`DefinitionAcceptanceReadbackA`; estimate=`0.50–1.00`.

4.4.6 `B029`: perform independent authoritative readback B; Output=`DefinitionAcceptanceReadbackB`; estimate=`0.50–1.00`.

4.4.7 `B030`: reconcile attempt and readbacks into exactly one terminal; Output=`DefinitionMaterializationPermitOrRejection`; estimate=`0.50–1.00`.

# 5. Bootstrap topology and accounting

## 5.1 Exact topology classes

5.1.1 baseline chain=`B001→[B002,B003,B004]→[B005,B006,B007]→B008`.

5.1.2 construction chain=`B008→B009→B010→B011→[B012,B013]→B014→B015`.

5.1.3 authority chain=`B015→B016→ExternalWait(RoleAppointments)→B017`.

5.1.4 review chain=`[B015,B017]→B018→B019→B020→B021→B022→B023`.

5.1.5 acceptance chain=`[B023,B017]→B024→B025→ExternalWait(TalExactRootResponse)→B026→B027→[B028,B029]→B030`.

5.1.6 the arrows in 5.1 are explanatory topology only. The material Bootstrap registry must replace every bracket and arrow with explicit Act, Output and Edge rows before any acceptance credit.

## 5.2 Estimates

5.2.1 preliminary Bootstrap net effort range from the thirty atomic acts=`54.00–107.00 person-hours`.

5.2.2 this range excludes all external waiting, repeat-review cycles, unavailable named-role capacity, tooling repair and any scope discovered by the three independent audits.

5.2.3 it is a draft Bottom-up range for the Bootstrap domain only; it is not the total Remaining program time and is not yet accepted.

5.2.4 calendar ETA=`unknown/unavailable` because named people, capacity calendars, external wait durations and review-restart count are not accepted.

# 6. Safe-state and acceptance rules

6.1 no subject may contain its own QA, Review, approval, acceptance, root or Handoff receipt.

6.2 no Lifecycle act can change subject bytes; a requested change creates a successor Candidate with a new root.

6.3 no producer, parser, reviewer, reconciler, veto authority, approval observer or acceptance writer may occupy an incompatible role for the same root.

6.4 no document-presence, prose-status, prior summary, blanket approval or remembered evidence receives completion credit.

6.5 no absent, expired, revoked, ambiguous or conflicting external receipt is converted to success or guessed calendar duration.

6.6 no use of `Math.random()` is permitted.

6.7 no use of `crypto.randomUUID()` or other CSPRNG is permitted without future exact use-specific X24 approval; the current blanket planning approval is not X24.

6.8 no fake, mock, demo, sample or synthetic business data is readiness or acceptance evidence.

6.9 current Bootstrap accepted acts=`0/30`; G1 accepted=`0/1`; G2 accepted=`0/1`; G3 accepted=`0/1`; G4/Gate29 accepted=`0/1`; development freeze=`ACTIVE`.

6.10 exact whole-program percentage, Product Remaining hours, critical path and calendar ETA remain `unknown/unavailable` until G3 and G4 denominators are accepted.
