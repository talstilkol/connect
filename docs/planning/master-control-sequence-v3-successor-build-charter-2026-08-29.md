# 1. Connect — Master Control Sequence v3 successor build charter

## 1.1 Identity and boundary

1.1.1 `charterId=CONNECT-MASTER-CONTROL-SEQUENCE-V3-SUCCESSOR-BUILD-CHARTER-2026-08-29`.

1.1.2 predecessor Subject=`/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-v2-2026-08-29.md`; raw SHA-256=`403a9f77d85c67ebc4498c12a0c74912f8c015cfbccd665f3043a99c9d98310e`; physical identity=`1061 lines/73895 bytes`.

1.1.3 predecessor Producer QA=`/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-v2-producer-qa-2026-08-29.md`.

1.1.4 semantic-risk observation=`/Users/tal/Documents/connect/web/docs/planning/master-control-sequence-v2-entry-graph-risk-observation-2026-08-29.md`; raw SHA-256=`42d224862a64738ab1e1f974116633a19293b3a4bd6e11c705f6ba26f199577d`.

1.1.5 predecessor Finding denominator=`MPSC-HR-F001..F032`; independently accepted closure=`0/32`.

1.1.6 `charterClass=BUILDER-INSTRUCTIONS; NOT-A-SUCCESSOR-SUBJECT; NOT-A-REVIEW; NOT-ACCEPTANCE`.

1.1.7 Repository remains `PUBLIC`; Product code, Build, Runtime test, Git/GitHub/provider/credential/deployment mutation remain prohibited.

## 1.2 Lossless preservation rules

1.2.1 preserve all 30 Planning Phase identities `PGV2-00..PGV2-29` as explicit predecessor mappings; a successor may rename to v3 identities only with one-to-one forward and inverse mapping.

1.2.2 preserve all six post-Gate identities `PXV2-00..PXV2-05`, all 79 printed predecessor edges, every Phase field and every `MPSC-HR-F001..F032` identity without Merge, range credit or presence-only closure.

1.2.3 preserve the four work domains, Public invariant, development freeze, typed gates, bounded handoff and separation of Planning percentage from Product percentage.

1.2.4 every removed, split, narrowed or superseded clause requires exact old-root+span, new-root+span, semantic rationale, authority and negative vector.

## 1.3 Canonical graph object model

1.3.1 define disjoint node classes: `PhaseDefinition`, `ExternalAuthority`, `AcceptedArtifactHead`, `Appointment`, `Policy`, `Observation`, `Permit`, `TrustedTime`, `ExpectedPointer`, `Condition`, `Assertion` and `PostGateInstruction`.

1.3.2 every non-optional entry member must resolve to exactly one canonical node identity, sole producer/current pointer, required state, freshness predicate and one or more typed incoming edges.

1.3.3 entry prose is generated from the canonical graph and receives zero authority; the graph is generated from named uses and must match the explicit edge registry under two independent semantic extractors.

1.3.4 define edge classes at minimum: `REQUIRES-OUTPUT`, `REQUIRES-AUTHORITY`, `REQUIRES-APPOINTMENT`, `REQUIRES-POLICY`, `REQUIRES-OBSERVATION`, `REQUIRES-PERMIT`, `REQUIRES-TIME`, `REQUIRES-EXPECTED-HEAD`, `CONDITION-GUARD`, `INVALIDATES`, `REWORK-RETURN` and `POST-GATE-HANDOFF`.

1.3.5 each edge binds source node/version/head, source output field, required state, target node, join, condition, freshness/expiry, invalidation route and failure terminal.

1.3.6 every Join is explicit AND/OR/XOR/K-of-N with closed membership and Unknown handling; prose words such as `plus`, `current`, `where applicable`, `if required` or `complete` cannot define a Join.

## 1.4 Mandatory entry-node closure

1.4.1 materialize exact graph nodes and edges for the mandate receipt and read-only filesystem/Git observations entering `PGV2-00`.

1.4.2 re-read B0 validity, expiry, revocation and subject scope at every phase acceptance that depends on B0; a transitive old B0 edge is insufficient.

1.4.3 materialize Reviewer packet declarations entering `PGV2-02` and distinguish packet identity, sealing, custody and reviewer appointment.

1.4.4 materialize BootstrapReviewProtocol as a detached external authority node with direct edges to each phase and acceptance attempt that consumes it.

1.4.5 materialize PhaseDefinitionSet sole-producer/current-head input for `PGV2-05`.

1.4.6 materialize Normalizer, Selector, Reviewer, Planning-role, AcceptanceWriter and other appointment nodes; identity, eligibility, conflict, expiry and revocation are checked atomically.

1.4.7 materialize authorized read-only custody scope, Public-safe handling policy, Decision-precedence policy, extraction policy and applicable Scope Decisions as distinct nodes.

1.4.8 materialize Framework SourceSet and split `AdmittedPublicCyberRequirements` from the later `AcceptedPublicHardeningSpecification`; the two types must never Alias or create a `PGV2-17`↔`PGV2-24` semantic cycle.

1.4.9 materialize task-estimate state, capacity observation, calendar observation and external-wait observation as separate fresh inputs to Scheduling.

1.4.10 materialize presealed Review-B packets, independent Normalizer runs, frozen successor Program root, Appointment registry, no-inferred-authority assertion and closed veto denominator.

1.4.11 materialize expected Program/Master pointers, trusted time and absence-of-invalidation observations; each must be re-read at the same CAS that changes the current head.

1.4.12 apply the same complete noun-to-node extraction to every `PXV2` entry, including accepted Task, exact instruction, provider/legal/data permits, release candidate, approval/veto denominator, service ownership, on-call and monitoring Evidence.

## 1.5 Authority and atomicity

1.5.1 phase acceptance must bind all entry node heads, subject/output roots, QA, reviews, reconciliation, vetoes, approvals, authority epoch, trusted time, expected pointer and attempt identity in one detached envelope.

1.5.2 one-use Permit consumption and effect/current-pointer CAS must be one atomic linearization or must use a formally specified prepare/commit/reconcile protocol that cannot double-consume or emit authority after response loss.

1.5.3 revoke-wins semantics must define the linearization order for B0, appointments, approvals, permits and policies against concurrent acceptance.

1.5.4 wrong root, stale head, expiry, revocation, access denial, conflicting readback, partition, timeout, response loss, ABA and replay must each reach one finite safe terminal.

1.5.5 each current pointer requires two independent readbacks plus terminal reconciliation; no inferred success is permitted.

## 1.6 Invalidation and rework

1.6.1 build an authoritative-field registry covering every mutable field in every external and local node class.

1.6.2 require at least one invalidation trigger and inverse dependency edge for each authoritative field; union equality with the registry is mandatory.

1.6.3 compute affected descendants from the actual graph, not from textual phase ranges; invalidated and unaffected sets must be exact and independently reproducible.

1.6.4 split defect detection, rework routing, successor generation, review invalidation, approval invalidation, permit invalidation and current-pointer fencing into atomic records.

1.6.5 prove termination for every rework class under bounded attempts and external-wait semantics; `unknown/unavailable` cannot become success or a numeric ETA.

## 1.7 Executable conformance

1.7.1 create one conformance envelope per graph/phase/authority requirement, binding exact subject-row digest, admitted inputs, evaluator profile, operation bytes, expected result bytes and one terminal.

1.7.2 create one separately traceable hostile vector for each predecessor Phase entry member, every predecessor Edge, every `MPSC-HR-F001..F032` and every new Finding.

1.7.3 mandatory mutants include deletion of each external edge, stale B0 at a later CAS, revoked appointment, changed policy head, stale trusted time, wrong expected head, condition Unknown, Public type Alias, hidden Post-Gate reachability and a prose-only prerequisite.

1.7.4 two independent semantic-use extractors and two graph solvers must produce byte-identical node/edge/join/condition/invalidation ledgers.

1.7.5 two controlled generations must prove that a change in every external node class invalidates all and only affected descendants and rejects stale review/approval/permit/readback Evidence.

## 1.8 Required successor packet and current state

1.8.1 required outputs=`immutable v3 Subject; ExternalNodeRegistry; SemanticUseLedger; TypedEdgeJoinConditionRegistry; AuthoritativeFieldTriggerRegistry; ConformanceMutationManifest; GenerationA/B proof; predecessor preservation crosswalk; Finding closure registry; detached Producer QA`.

1.8.2 Producer QA may prove mechanical and semantic candidate properties but cannot establish reviewer independence, close Findings or accept the successor.

1.8.3 after freeze, at least two eligible independent reviews must inspect the same exact bytes; any successor correction creates a new generation and makes earlier QA/reviews stale.

1.8.4 exact-root Tal approval is requested only after reconciliation, veto closure and disclosure-safe Evidence; the general continuation instruction is not exact-root Acceptance.

1.8.5 predecessor v2 accepted=`0`; v3 accepted=`0`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; Product/Planning completion and ETA remain `unknown/unavailable` until accepted denominators.
