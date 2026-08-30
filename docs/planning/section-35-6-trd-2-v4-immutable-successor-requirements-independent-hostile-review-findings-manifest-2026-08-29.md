# 1. Connect — TRD-2 v4 detached hostile-review Findings manifest

## 1.1 זהות וגבול סמכות

1.1.1 artifactId=CONNECT-SECTION-35-6-TRD-2-V4-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29-V1.

1.1.2 Subject root=72c92fce01d3fd9996965469b0fbd23c32c1e43f38740ef9be6fa7bf4235d394; Subject physical identity=1442 lines/231994 bytes.

1.1.3 Producer QA root=0cc0df45885a2cdf9f1ed9a7ae324a2bd90c2c99db1de6696cab9573795d8c45. Producer QA grants zero Finding closure or semantic credit.

1.1.4 review path=/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v4-immutable-successor-requirements-independent-hostile-review-2026-08-29.md.

1.1.5 artifactClass=PLANNING-ONLY; DETACHED-REVIEWER-LOCAL-FINDINGS; NOT-PROTOCOL-GENERATION; NOT-RECONCILIATION; NOT-ACCEPTANCE.

1.1.6 reviewerAppointmentRoot=MISSING/EXTERNAL-APPOINTMENT; acceptedProtocolRoot=MISSING/EXTERNAL-PROTOCOL-ACCEPTANCE; authorityEnvelopeRoot=MISSING/EXTERNAL-AUTHORITY-ENVELOPE.

1.1.7 כל רשומה היא Finding נפרד. noMergeKey חייב להישאר שווה ל־findingId. Similarity, shared file, shared Requirement, shared fix, shared vector או shared receipt אינם Merge ואינם Closure transfer.

1.1.8 repositoryVisibility=PUBLIC; Private remediation=FORBIDDEN; Product/Git/GitHub/Build/Runtime/Deploy/Provider authority=NONE.

## 1.2 מונה

1.2.1 total=15; P0=12; P1=3; P2=0; P3=0.

1.2.2 status counts: OPEN-REVIEWER-LOCAL=15; ACCEPTED=0; CLOSED=0; MERGED=0; SUPPRESSED=0; RISK-ACCEPTED=0.

1.2.3 Acceptance credit=0; Gate29=BLOCKED; development freeze=ACTIVE.

# 2. Findings

## 2.1 TRD2V4-IHR-F001 — parser and Field-map contract is not executable

2.1.1 findingId=TRD2V4-IHR-F001.

2.1.2 severity=P0.

2.1.3 subjectLocator=TRD2V4-REQ-000; field-map manifest parserSchemas[0..3], fieldMaps[0..83].

2.1.4 evidence=4 parser schemas expose grammar as prose strings; independent replay found 84 maps, 520 byte-accurate occurrences, PRESENT=235, MISSING=664 and CONFLICT=125; no parser implementation roots or parser execution receipts exist.

2.1.5 defect=the package freezes derived Field maps without freezing an executable unambiguous grammar and without proving that two independent parsers derive them.

2.1.6 cause=the generator serialized one interpretation and then rooted its output; the root proves stability of that interpretation, not uniqueness or correctness of decoding.

2.1.7 impact=two conforming consumers can parse the same captured bytes into different fields while all published roots and the current correction predicate remain internally consistent.

2.1.8 requiredRemediation=create a new successor with a closed lexer/parser grammar, exact error semantics, parser implementation roots, independent parser receipts and field-level comparison over every source part and occurrence.

2.1.9 acceptancePredicate=two independently implemented parsers consume the same 8 content-addressed captures and 128 exact source parts; both emit exactly 84 envelopes and identical typed fields, occurrence offsets, raw values, missing terminals, conflicts and collection roots; parser ambiguity, unknown field, duplicate field, normalization, wrong offset and Bidi reordering vectors all fail closed; receipt denominator is exact and nonzero.

2.1.10 safeTerminal=SOURCE-FIELD-MAP-BLOCKED.

2.1.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.1.12 noMergeKey=TRD2V4-IHR-F001.

## 2.2 TRD2V4-IHR-F002 — canonical schema, type and root oracle is not closed

2.2.1 findingId=TRD2V4-IHR-F002.

2.2.2 severity=P0.

2.2.3 subjectLocator=TRD2V4-REQ-001; executable registries predicateDsl, evidenceSchema, resultSchemas and reviewSchemas.

2.2.4 evidence=declared DSL types=10; ASTs additionally use Array<TestVector>, Receipt, Set<String> and TransitionReceiptSet without literal declarations; encoding says RFC-8785-compatible; schema properties and constraints are descriptive strings.

2.2.5 defect=no closed machine schema or type oracle determines the only legal values, canonical bytes, constructor domains and rejection behavior for predicates, evidence, results and review records.

2.2.6 cause=type names and English constraints were hashed as data instead of being bound to a complete executable schema language and definitions.

2.2.7 impact=two validators can disagree about valid records, set ordering, Missing values, time, integers, generic types or root construction while each claims conformance.

2.2.8 requiredRemediation=freeze one exact schema language/profile, every referenced type definition, canonical serialization, domain-separated constructors, validation errors and a root oracle corpus.

2.2.9 acceptancePredicate=two independent schema engines accept exactly the same positive corpus, reject every malformed/unknown/duplicate/type-confused/Unicode/numeric mutation, and produce byte-identical logical roots and collection roots; undeclared type count=0; compatible-or-prose constraint count=0.

2.2.10 safeTerminal=CANONICAL-ROOT-ORACLE-BLOCKED.

2.2.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.2.12 noMergeKey=TRD2V4-IHR-F002.

## 2.3 TRD2V4-IHR-F003 — typed graph omits mandatory semantic families

2.3.1 findingId=TRD2V4-IHR-F003.

2.3.2 severity=P0.

2.3.3 subjectLocator=TRD2V4-REQ-002; executable registries typedGraph.

2.3.4 evidence=1207 nodes and 7356 edges are unique, acyclic and non-dangling, but node families are absent for AtomicChild, PublicControl, PublicHardeningGate, DataLifecycleClass, DataLifecycleTransition, PortableSourceLocator, BidiControl, SeverityBinding and AppointmentSet; AcceptanceInput count=8 while mandatory root field count=46.

2.3.5 defect=the graph is internally well formed but does not model the full semantic universe that Freeze, validation, review and Acceptance claim to cover.

2.3.6 cause=the generator created nodes for main Requirements, vectors, predicates and placeholder receipts, while leaving multiple registries as opaque collection roots.

2.3.7 impact=an omitted member, stale gate, changed appointment, lifecycle row or atomic child can escape reachability and dependency checks without creating a dangling edge or cycle.

2.3.8 requiredRemediation=materialize every mandatory member as a typed node, every dependency/invalidation/authority edge, exact membership/non-membership proofs and a complete Acceptance subgraph.

2.3.9 acceptancePredicate=two graph builders derive identical node and edge multisets from the entire packet; all 46 mandatory roots and all member families are reachable through typed mandatory paths from the detached Freeze to Acceptance; omitted/additional/wrong-type/wrong-direction/member-replacement vectors change the graph root or block; dangling, duplicate, self, cycle and untyped edge counts=0.

2.3.10 safeTerminal=TYPED-SEMANTIC-GRAPH-BLOCKED.

2.3.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.3.12 noMergeKey=TRD2V4-IHR-F003.

## 2.4 TRD2V4-IHR-F004 — 113 predicates are presence programs, not semantic proofs

2.4.1 findingId=TRD2V4-IHR-F004.

2.4.2 severity=P0.

2.4.3 subjectLocator=TRD2V4-REQ-003; executable registries conformancePredicates[0..112].

2.4.4 evidence=all 113 ASTs have the identical operator signature RESOLVES_EXACTLY_ONCE, COUNT_EQ, ROOT_EQ, RECEIPT_SCHEMA_VALID, MUTANT_SET_EQ; none executes the Requirement-specific statement.

2.4.5 defect=a predicate can PASS after checking identity, vector count, one source root, receipt shape and executed-vector ID set, without checking Field-map equality, graph completeness, lifecycle semantics, retention safety or Public hardening.

2.4.6 cause=the generator used one structural predicate template for all Requirements and treated result schema validation as proof of result truth.

2.4.7 impact=a schema-valid false assertion or fabricated receipt can grant apparent Requirement PASS and later be aggregated into Acceptance.

2.4.8 requiredRemediation=author one exact semantic AST per Requirement and one per mandatory atomic child, with complete typed inputs, requirement-specific checks, side effects, readbacks and failure terminals.

2.4.9 acceptancePredicate=for each of 113 Requirements, independent evaluators show that PASS implies every clause in statement and proofPredicate; at least one counterexample vector exists for each omitted clause; replacing a semantic check with presence/count/root/schema-only logic fails mutation coverage; all identifiers resolve exactly once.

2.4.10 safeTerminal=PREDICATE-PROGRAM-BLOCKED.

2.4.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.4.12 noMergeKey=TRD2V4-IHR-F004.

## 2.5 TRD2V4-IHR-F005 — 565 main vectors are generic labels, not executable vectors

2.5.1 findingId=TRD2V4-IHR-F005.

2.5.2 severity=P0.

2.5.3 subjectLocator=TRD2V4-REQ-003 and TRD2V4-REQ-004; executable registries testVectors[0..564].

2.5.4 evidence=exact vector count=565, but there are only five mutation strings, each repeated 113 times; records omit pre-state, exact operation, expected post-state, terminal tuple, side-effect oracle, readback oracle and execution receipt.

2.5.5 defect=vector identity and generic prose mutation do not define an executable adversarial test.

2.5.6 cause=vector modes were expanded combinatorially from Requirement IDs without binding Requirement-specific real inputs and operations.

2.5.7 impact=runner agreement cannot be reproduced; a runner may interpret the same label differently or record the expected vector ID without executing a mutation.

2.5.8 requiredRemediation=instantiate every vector with exact real frozen input roots, precondition, operation, post-state, terminal, side-effect and readback oracles, plus immutable runner receipts.

2.5.9 acceptancePredicate=all 565 records validate against a closed executable vector schema; genericLabel=0, missingInput=0, missingOperation=0, missingPreState=0, missingPostState=0, missingTerminal=0, missingSideEffectOracle=0, missingReadbackOracle=0; two independent runners execute each vector and agree byte-for-byte.

2.5.10 safeTerminal=VECTOR-CORPUS-BLOCKED.

2.5.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.5.12 noMergeKey=TRD2V4-IHR-F005.

## 2.6 TRD2V4-IHR-F006 — result freshness and invalidation are not exact-root closed

2.6.1 findingId=TRD2V4-IHR-F006.

2.6.2 severity=P0.

2.6.3 subjectLocator=TRD2V4-REQ-004; resultSchemas and typedGraph InvalidationEdge records.

2.6.4 evidence=1274 invalidation edges exist, but Subject root appears in 0/113 predicate inputArtifactRoots and packet raw root appears in 0/113; invalidators omit complete authority, appointment, evaluator/runner, trusted-time and mutable-head universe bindings.

2.6.5 defect=invalidationBindingRoot has no closed constructor or complete dependency membership, and receipt schemas have no CAS/fencing operation tying evaluation to one exact current snapshot.

2.6.6 cause=invalidation edges were generated from the predicate input list and Freeze placeholder rather than from a proved-complete dependency-head universe.

2.6.7 impact=a previously valid receipt can remain apparently valid after Candidate, packet, appointment, evaluator policy, runner policy, clock, revocation or other mandatory dependency changes.

2.6.8 requiredRemediation=define a complete mutable dependency universe, exact invalidation root constructor, trusted time/finality, expected head/CAS/fencing, supersession and replay rules.

2.6.9 acceptancePredicate=changing, adding, removing, revoking or concurrently updating any mandatory input or mutable head changes the invalidation root and rejects the old receipt; replay, stale clock, wrong Candidate, wrong packet, wrong evaluator and split-head vectors all block; two readbacks bind the same snapshot and receipt.

2.6.10 safeTerminal=VALIDATION-RESULT-STALE.

2.6.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.6.12 noMergeKey=TRD2V4-IHR-F006.

## 2.7 TRD2V4-IHR-F007 — review, reconciliation and acceptance lack atomic CAS semantics

2.7.1 findingId=TRD2V4-IHR-F007.

2.7.2 severity=P0.

2.7.3 subjectLocator=TRD2V4-REQ-005; reviewSchemas, actualReviewGenerations, actualReconciliation and actualDefinitionAcceptance.

2.7.4 evidence=two generation nodes are placeholders; actual generations=0, reconciliation=null and acceptance=null; schemas are required-field lists plus prose constraints and omit complete head/CAS/fencing/idempotency/consumption/readback semantics.

2.7.5 defect=there is no machine operation that proves generation isolation, immutable union, one disposition per Finding and all-or-nothing Definition Acceptance under crash, replay and concurrent writers.

2.7.6 cause=review artifacts were modeled as record shapes rather than state transitions against an authoritative current head and one-use authority.

2.7.7 impact=split generation sets, duplicate acceptance, reused authority, stale reconciliation, lost Finding, partial commit or head/envelope divergence cannot be mechanically excluded.

2.7.8 requiredRemediation=define generation seal, reconciliation and Definition Acceptance as separate exact atomic operations with expected heads, CAS, fencing, idempotency, one-use authority, revocation, trusted time, finality and pre/post readbacks.

2.7.9 acceptancePredicate=two distinct appointed generations bind the same packet and disjoint reviewer/controller roots; reconciliation equals the lossless union and preserves every noMergeKey; Acceptance commits either zero durable members or one complete set; concurrent, crash, replay, stale, revoked and duplicate operations never issue two accepted heads; two readbacks agree.

2.7.10 safeTerminal=REVIEW-ACCEPTANCE-BLOCKED.

2.7.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.7.12 noMergeKey=TRD2V4-IHR-F007.

## 2.8 TRD2V4-IHR-F008 — MissingValue transition program and 135 vectors are absent

2.8.1 findingId=TRD2V4-IHR-F008.

2.8.2 severity=P1.

2.8.3 subjectLocator=TRD2V4-REQ-006; missingValues[0..26] and missingValuePredicates[0..26].

2.8.4 evidence=27 lifecycle records and 27 predicates exist; they reference 135 test vector IDs, of which 0 resolve in the vector registry; transitionReceipts has no schema/registry and allowedTransitions are prose strings.

2.8.5 defect=current UNRESOLVED state is represented, but there is no executable authorized transition machine that can safely produce PROPOSED, UNDER-REVIEW, RESOLVED, REJECTED, REVOKED or CONFLICT.

2.8.6 cause=the package rooted current records and transition labels without materializing transition inputs, receipts, exact role evaluation, CAS or successor commit.

2.8.7 impact=future resolution can be direct, stale, double, revoked or won by both concurrent writers while the current predicate still checks only state, acceptanceEligible and an undefined receipt set.

2.8.8 requiredRemediation=freeze the transition schema/matrix, authority roles, appointment bindings, CAS/head rules, proposal/review/accept/revoke receipts and all 135 executable vectors.

2.8.9 acceptancePredicate=every legal transition has one exact prior state/version, authorized operation, immutable receipt and successor root; all illegal/direct/stale/revoked/double/CAS-race vectors fail; exactly one concurrent successor may commit; zero unresolved vector IDs.

2.8.10 safeTerminal=SOURCE-REFERENCE-INVALID.

2.8.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.8.12 noMergeKey=TRD2V4-IHR-F008.

## 2.9 TRD2V4-IHR-F009 — 59 atomic children cannot close their parents

2.9.1 findingId=TRD2V4-IHR-F009.

2.9.2 severity=P0.

2.9.3 subjectLocator=TRD2V4-REQ-009; atomicParents[0..112], atomicChildren[0..58] and parent predicates.

2.9.4 evidence=12 parents are compound and name 59 mandatory children; children reference 295 test IDs, of which 0 resolve; child predicate, result schema, receipt instance and graph node counts are zero.

2.9.5 defect=parentClosureRule states ALL-MANDATORY-CHILD-RECEIPTS-PASS, but no executable path requires or even represents those receipts before parent PASS.

2.9.6 cause=atomic children were emitted as descriptive task rows while validation remained attached only to the parent template predicate.

2.9.7 impact=a compound Requirement can appear PASS with none of its independent actions executed or proved.

2.9.8 requiredRemediation=create typed child nodes, exact child predicates, five executable child vectors, result/evidence schemas and immutable receipts; derive parent PASS only from exact complete child receipt set.

2.9.9 acceptancePredicate=mandatory child set for every compound parent is exact; every child has one action/output/evidence, executable vectors and an independent PASS receipt; missing, duplicate, shared-credit, wrong-parent, stale or failed child blocks parent; atomic parent has no hidden child; closureTransferred=0.

2.9.10 safeTerminal=ATOMIC-CLOSURE-BLOCKED.

2.9.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.9.12 noMergeKey=TRD2V4-IHR-F009.

## 2.10 TRD2V4-IHR-F010 — lifecycle matrix is global, not per data class

2.10.1 findingId=TRD2V4-IHR-F010.

2.10.2 severity=P0.

2.10.3 subjectLocator=TRD2V4-REQ-010; dataLifecycle classes, states, events and matrixRows.

2.10.4 evidence=classes=10, states=16, events=20, matrix rows=320 and unique state/event pairs=320; class-specific total would be 3200; rows containing dataClassId=0.

2.10.5 defect=one global matrix is applied to every class, so legal events, guards, providers and terminals cannot differ by data class.

2.10.6 cause=the generator formed Cartesian product states×events only and stored classes as a separate list.

2.10.7 impact=a transition legal for backup or test input can be applied to contact/message, AI trace, legal-hold or deletion-audit data; active/hold/purged constraints are not class-specific.

2.10.8 requiredRemediation=split mixed classes and publish a class×state×event total matrix or a sparse matrix with an independently proved default-deny complement; bind exact provider/store identity and executable guard for each allowed tuple.

2.10.9 acceptancePredicate=all admitted data identities resolve to one class; every class×state×event tuple has exactly one ALLOW or BLOCK disposition; missing/duplicate/ambiguous tuple count=0; active and Legal-Hold deletion paths always block; two transition engines agree under race/replay/failure vectors.

2.10.10 safeTerminal=DATA-LIFECYCLE-BLOCKED.

2.10.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.10.12 noMergeKey=TRD2V4-IHR-F010.

## 2.11 TRD2V4-IHR-F011 — Retention Plan v2 deletion safety fields and atomic delete are absent

2.11.1 findingId=TRD2V4-IHR-F011.

2.11.2 severity=P0.

2.11.3 subjectLocator=TRD2V4-REQ-010; dataLifecycle lineageSchema and DELETE transitions.

2.11.4 evidence=lineage includes deletionPlanId and retentionCutoff but omits plan digest, policyVersion, plan expiry, exact authorized provider-confirmed identity set, expected head/CAS and atomic delete transaction result.

2.11.5 defect=the deletion plan is not an immutable short-lived authorization bound to exact identities and cutoff, and deletion safety is not enforced atomically before destructive provider calls.

2.11.6 cause=the lifecycle records model state labels and audit lineage but not the complete Retention Plan v2 contract requested by the approved hardening plan.

2.11.7 impact=expired, policy-stale, overbroad, mixed-class or identity-substituted deletion can execute; a post-delete audit cannot undo destructive over-deletion.

2.11.8 requiredRemediation=define Plan ID and digest, policy version, issued/expiry, cutoff, exact eligible identity set, provider authorization set, hold/active blockers, CAS/fencing, atomic commit protocol, per-provider outcomes and audit-only readback.

2.11.9 acceptancePredicate=only unexpired current-policy plans may delete; candidate identities equal the plan set and are at/before cutoff, inactive and not held; provider-confirmed set is a subset of authorized identities; wrong/extra/newer/held/active/stale/replayed/concurrent/partial vectors never delete an unauthorized byte; crash yields no commit or one recoverable exact commit.

2.11.10 safeTerminal=RETENTION-DELETE-BLOCKED.

2.11.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.11.12 noMergeKey=TRD2V4-IHR-F011.

## 2.12 TRD2V4-IHR-F012 — backup, restore and privacy replay states conflate identities

2.12.1 findingId=TRD2V4-IHR-F012.

2.12.2 severity=P0.

2.12.3 subjectLocator=TRD2V4-REQ-010; dataLifecycle BACKUP-CAPTURED, RESTORE-STARTED, PRIVACY-REPLAY and CAS-CONFLICT rows.

2.12.4 evidence=ACTIVE transitions to BACKED-UP on BACKUP-CAPTURED; BACKED-UP transitions to RESTORE-QUARANTINE; PRIVACY-REPLAY is not a normal destination; RESTORE-QUARANTINE moves directly to ACTIVE/REDELETE-PENDING/QUARANTINED; PURGED can transition to CONFLICT.

2.12.5 defect=the state machine changes one identity between source, backup copy and restore copy instead of representing distinct lineage-bound identities and a mandatory privacy replay phase.

2.12.6 cause=source state, copy state and workflow state share one global enum and transition table.

2.12.7 impact=backup capture can erase the source's active state, restore can bypass deletion replay, and a purged terminal identity can be semantically resurrected by conflict handling.

2.12.8 requiredRemediation=define separate state machines for source, immutable backup cohort, restore copy and privacy replay/redelete obligation; bind restore to backupId and exact database/object digests, quarantine by default and prohibit activation before replay completion.

2.12.9 acceptancePredicate=backup creation never changes source lifecycle state; each restore has new identity and exact backupId/digests; quarantine is mandatory; every prior deletion/hold/retention obligation is replayed before activation; required redelete completes first; PURGED is non-resurrectable; R2 inconsistency, stale backup, missing lineage, partial replay, crash, replay and CAS-race vectors fail closed.

2.12.10 safeTerminal=RESTORE-PRIVACY-REPLAY-BLOCKED.

2.12.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.12.12 noMergeKey=TRD2V4-IHR-F012.

## 2.13 TRD2V4-IHR-F013 — 52 Public controls point to 260 nonexistent vectors and absent gates

2.13.1 findingId=TRD2V4-IHR-F013.

2.13.2 severity=P0.

2.13.3 subjectLocator=TRD2V4-REQ-011; publicCyber controls[0..51].

2.13.4 evidence=52 controls map all 52 PRCH2 Requirements, but their 260 vector IDs resolve 0/260 against the vector registry; hardeningGateId count=52 while hardening-gate record/schema/node/receipt count=0.

2.13.5 defect=Public controls are traceability rows, not executable controls or gates.

2.13.6 cause=the generator created control IDs and expected vector IDs without materializing the vector corpus, hardening-gate state machine and readback evidence.

2.13.7 impact=private path, secret/PII leakage, weak repository governance, disclosure inference or unsafe rollback can remain undetected while publicInvariant and privatePathCount fields look correct.

2.13.8 requiredRemediation=create 260 exact Public-control vectors, 52 typed hardening gates, disclosure-safe evidence schemas, information-flow inventory, operation/readback oracles and independent receipts.

2.13.9 acceptancePredicate=every PRCH2 control resolves one exact source member, five executable vectors, one hardening gate and one independent result; Public remains invariant through normal, failure, concurrency, rollback and recovery; private path, Secret/PII/Private Evidence exposure and inference vectors all fail; runtime/public-surface scan denominator is explicit and nonzero.

2.13.10 safeTerminal=PUBLIC-HARDENING-BLOCKED.

2.13.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.13.12 noMergeKey=TRD2V4-IHR-F013.

## 2.14 TRD2V4-IHR-F014 — severity history and conditional escalation are not rooted

2.14.1 findingId=TRD2V4-IHR-F014.

2.14.2 severity=P1.

2.14.3 subjectLocator=TRD2V4-REQ-007; severityBindings[0..83], especially SOE-050.

2.14.4 evidence=84/84 records use historyRoot=EMPTY-APPEND-ONLY-SEVERITY-HISTORY rather than a Bytes32 collection; SOE-050 has a pending P2-to-P0 condition with evaluatorRoot=MISSING and evaluatedAt=MISSING.

2.14.5 defect=severity provenance and conditional escalation are descriptive state, not an append-only authorized transition log with exact trigger evidence.

2.14.6 cause=current severities were projected directly, and future transition fields were left as placeholders.

2.14.7 impact=severity can be silently changed, evaluated twice, evaluated against stale reachability or fail to escalate when Push/Merge/Release/Deploy becomes reachable.

2.14.8 requiredRemediation=define severity event schema, append-only history root, trigger predicate, evaluator/authority, trusted time, CAS, revocation and invalidation rules.

2.14.9 acceptancePredicate=original severity is immutable; every effective change has one authorized event and exact prior version; SOE-050 escalates to P0 at the first accepted reachability observation and cannot downgrade without separate authority; stale/double/race/revoked/unknown-time vectors fail; two readers derive identical current aggregate.

2.14.10 safeTerminal=SEVERITY-TRANSITION-BLOCKED.

2.14.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.14.12 noMergeKey=TRD2V4-IHR-F014.

## 2.15 TRD2V4-IHR-F015 — packet portability stops before Candidate acquisition

2.15.1 findingId=TRD2V4-IHR-F015.

2.15.2 severity=P1.

2.15.3 subjectLocator=detached packet subjectPath and subjectPhysical; field-map portable capture registry.

2.15.4 evidence=8 captures and all 213 locators replay portably, but packet subjectPath is /Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v4-immutable-successor-requirements-2026-08-29.md; Candidate Subject has no packet-relative content-addressed capture or acquisition receipt.

2.15.5 defect=a consumer on another host can validate source captures but cannot follow the only Subject locator without path-specific knowledge; subjectPhysical root does not state how the reviewed bytes were acquired.

2.15.6 cause=portability remediation was applied to observation/v2 sources but not to the Candidate Subject and detached packet itself.

2.15.7 impact=reviewer tooling can read a wrong or unavailable path, or rely on an out-of-band copy, while the packet still advertises the expected root.

2.15.8 requiredRemediation=bundle or reference the Candidate by repository-relative content address, mark absolute original paths advisory-only, define acquisition and wrong-root terminals, and issue a detached acquisition receipt.

2.15.9 acceptancePredicate=a clean host with no /Users/tal path resolves the packet and Candidate solely from portable content-addressed members; acquired bytes hash exactly to 72c92fce01d3fd9996965469b0fbd23c32c1e43f38740ef9be6fa7bf4235d394; missing, path-substituted, symlink-swapped, wrong-root and post-freeze mutation vectors block before review.

2.15.10 safeTerminal=PORTABLE-PACKET-BLOCKED.

2.15.11 status=OPEN-REVIEWER-LOCAL; accepted=0; closed=0; closureTransferred=0.

2.15.12 noMergeKey=TRD2V4-IHR-F015.

# 3. Closure and successor rules

## 3.1 Non-merge

3.1.1 exact finding identity set is TRD2V4-IHR-F001 through TRD2V4-IHR-F015, each literal and distinct.

3.1.2 no range may serve as machine membership. A successor shall list all 15 identities and bind each to one exact record digest.

3.1.3 one fix may produce shared infrastructure, but each Finding still requires its own predicate, vector evidence, review disposition and closure receipt.

3.1.4 Producer QA, generated presence, shared root, shared vector family, shared terminal, shared output or a statement that the issue was addressed grants zero closure.

## 3.2 Current result

3.2.1 open=15; closed=0; accepted=0; merged=0; suppressed=0; riskAccepted=0.

3.2.2 any P0 or P1 remains an open veto. current open-veto set is nonempty.

3.2.3 current Subject cannot be patched. Remediation requires a new immutable successor root and a new detached packet.

3.2.4 external B0, Protocol acceptance, Source Universe, AuthorityEnvelope, Freeze, appointments, evaluator, runners, two review generations, reconciliation, 113 semantic result receipts and Definition Acceptance all remain absent.

3.2.5 overall disposition=REJECT-AS-DEFINITION; BLOCKED; ACCEPTANCE-ZERO; GATE29-BLOCKED; DEVELOPMENT-FREEZE-ACTIVE.
