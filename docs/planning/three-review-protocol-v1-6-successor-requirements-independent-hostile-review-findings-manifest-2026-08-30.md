# Protocol v1.6 Successor Requirements — Independent Hostile Review Findings Manifest

## 1. זהות, כללים ומונים

### 1.1 Frozen Subject

1.1.1 subjectPath=docs/planning/three-review-protocol-v1-6-successor-requirements-2026-08-30.md.

1.1.2 subjectSHA256=618b18c4ce61f066f7e400fe0ed9d0fec16c08a8a936f7559be1b9f0850b3a34.

1.1.3 subjectLines=5619.

1.1.4 subjectBytes=4465608.

### 1.2 Manifest rules

1.2.1 כל Finding הוא atomic closure obligation.

1.2.2 mergePolicy=PROHIBITED. אסור לסגור Finding באמצעות evidence של Finding אחר, ואסור למזג Findings בלי לשמר לכל אחד predicate ו-closure receipt נפרדים.

1.2.3 acceptanceCreditPerOpenFinding=0.

1.2.4 severityCounts: P0=18, P1=12, P2=1, P3=0, TOTAL=31.

1.2.5 stateCounts: OPEN=31, CLOSED=0.

1.2.6 predecessorSemanticClosure: CLOSED=0, PARTIAL=16, TOTAL=16.

## 2. P0 Findings

### 2.1 MPRR-V16-IHR-F001 — Invalid repository-root custody locators

2.1.1 severity=P0.

2.1.2 state=OPEN.

2.1.3 evidenceLocator=Subject §5.1.1 and SOURCE_CARRIERS rows in §5.2; all 21 custodyLocator values begin with web/docs/ although the frozen repository-relative Subject path begins with docs/.

2.1.4 observation=21/21 carrier paths fail when resolved from the repository root. All 21 roots, byte counts and line counts reproduce only after deleting the extra leading web/ component.

2.1.5 impact=An external verifier following the declared repository-root rule cannot open any carrier. The bundled readers hide the defect by choosing the parent directory as their repository root.

2.1.6 remediation=Emit repository-relative carrier paths from the actual repository root and bind the repository-root identity in the parser profile.

2.1.7 closureTest=From a clean checkout root, resolve all 21 emitted paths without fallback, prefix stripping or parent traversal; require existence=21, rootMatch=21, sizeMatch=21, lineMatch=21.

2.1.8 acceptanceCredit=0.

### 2.2 MPRR-V16-IHR-F002 — Circular member-set schema with silent field exclusion

2.2.1 severity=P0.

2.2.2 state=OPEN.

2.2.3 evidenceLocator=Subject §5.1.2; SOURCE_NAMESPACES and SOURCE_MEMBERS blocks in §5.2.

2.2.4 observation=The text defines memberSetRoot as the sorted set of full canonical member records. Every emitted member contains namespaceRoot, while namespaceRoot depends on memberSetRoot. Literal construction is circular. Observed roots reproduce 27/27 only after silently removing namespaceRoot from each member; full-record reproduction is 0/27.

2.2.5 impact=The normative identity cannot be implemented from the published schema, and a producer may choose an undocumented projection while claiming the same contract.

2.2.6 remediation=Define a non-circular MemberCore schema that excludes namespaceRoot, bind its exact ordered fields and version, then derive memberSetRoot and namespaceRoot in a one-way sequence.

2.2.7 closureTest=Two implementations construct all 27 member sets solely from the normative MemberCore schema, with no field deletion or special case, and reproduce all roots byte-for-byte.

2.2.8 acceptanceCredit=0.

### 2.3 MPRR-V16-IHR-F003 — Requirement outputs are declarations, not materialized outputs

2.3.1 severity=P0.

2.3.2 state=OPEN.

2.3.3 evidenceLocator=Subject §2 requirement clauses and REQUIREMENT_OUTPUTS block in §3.

2.3.4 observation=112/112 rows contain a constructor string and independentProofRoot=ABSENT-BLOCKING, but do not carry the sourceMemberDigest or canonicalFiveFieldDigestVector values required by that constructor. No materialized output root is emitted.

2.3.5 impact=The atomicOutput claims cannot be recomputed, compared or consumed. Requirement completeness is asserted, not proven.

2.3.6 remediation=Emit a canonical output record per requirement with every constructor input, output root, producer identity, custody locator and independent receipt.

2.3.7 closureTest=Two independent constructors recompute 112/112 output roots from emitted inputs; missingInputs=0, rootMismatch=0, absentIndependentReceipt=0.

2.3.8 acceptanceCredit=0.

### 2.4 MPRR-V16-IHR-F004 — NamedUse implicit-zero predicate is vacuous

2.4.1 severity=P0.

2.4.2 state=OPEN.

2.4.3 evidenceLocator=Subject MPRR-V16-REQ-003, §4.3 and NAMED_USES block in §7.

2.4.4 observation=The use grammar recognizes producer-inserted @local[...] and @source[...] tokens. It does not independently discover semantic references through output IDs, registry rows, Sections, target paths or prose. Therefore implicit=0 only means no implicit item exists inside a domain that contains explicit markers by construction.

2.4.5 impact=Unannotated dependencies can remain invisible while the graph reports implicit=0, unknown=0 and cycle=0.

2.4.6 remediation=Define an independent parser over the normative AST and registry schemas, enumerate every semantic identifier use, and compare that population to annotations.

2.4.7 closureTest=Seed unannotated local, source, registry and output references; both independent parsers must discover every seed and fail closure until explicitly resolved.

2.4.8 acceptanceCredit=0.

### 2.5 MPRR-V16-IHR-F005 — Closure crosswalk uses candidate-owned self-reference

2.5.1 severity=P0.

2.5.2 state=OPEN.

2.5.3 evidenceLocator=Subject §6.1.2 and CROSSWALK rows MPRR-V16-XW-113 through MPRR-V16-XW-323.

2.5.4 observation=211/323 rows contain 3376 conjunct locators that point back to cells in the candidate crosswalk itself. Their targetRequirementPath values lead to generic preservation statements rather than externally bound target bytes and executable predicates.

2.5.5 impact=The candidate can claim that an inherited obligation is preserved by citing its own claim. This is circular authority, not semantic Closure.

2.5.6 remediation=Bind every inherited obligation to immutable predecessor source bytes and to an independently materialized successor predicate/output root outside the crosswalk.

2.5.7 closureTest=Delete the crosswalk and rebuild it solely from immutable source members plus materialized successor outputs; require selfOwnedLocator=0 and independent semantic-equivalence receipts for 323/323 rows.

2.5.8 acceptanceCredit=0.

### 2.6 MPRR-V16-IHR-F006 — Crosswalk vectors inject the expected failure

2.6.1 severity=P0.

2.6.2 state=OPEN.

2.6.3 evidenceLocator=Subject §15, vectors MPRR-V16-VEC-XW-001 through MPRR-V16-VEC-XW-323; reader A terminal execution block and reader B terminal execution block.

2.6.4 observation=323/323 fixtures are empty and every program mutates one source byte, then explicitly performs SET_TRIGGER_SET with FC-SOURCE-GRAPH before terminal evaluation. The source verifier or closure predicate never derives that trigger.

2.6.5 impact=The vector proves only that a supplied trigger maps to a terminal. It does not prove detection of source corruption or crosswalk invalidity.

2.6.6 remediation=Remove SET_TRIGGER_SET from test programs. Execute the actual source-index and closure evaluators against mutated bytes and derive the failure condition only from observed state.

2.6.7 closureTest=Mutation survives only if the real evaluator misses it; require all 323 mutations to be detected without trigger injection and require a clean corpus to remain untriggered.

2.6.8 acceptanceCredit=0.

### 2.7 MPRR-V16-IHR-F007 — Opaque policy roots lack a normative registry

2.7.1 severity=P0.

2.7.2 state=OPEN.

2.7.3 evidenceLocator=Subject §15 vector rows and the complete list of machine-readable blocks in §§3-16.

2.7.4 observation=The 471 vectors reference three distinct policyRoot values, but no policy schema, policy registry, source member, custody locator or reconstruction algorithm is emitted.

2.7.5 impact=A policyRoot can name unknown bytes or no bytes at all. The runner can implement a different policy while still echoing the advertised root.

2.7.6 remediation=Publish canonical policy records, their exact bytes, roots, version, custody locators and a binding from each vector family to one record.

2.7.7 closureTest=Two readers resolve and hash every referenced policy root from repository-relative custody; unresolvedPolicyRoot=0 and policyByteMismatch=0.

2.7.8 acceptanceCredit=0.

### 2.8 MPRR-V16-IHR-F008 — Runner independence and provenance are not proven

2.8.1 severity=P0.

2.8.2 state=OPEN.

2.8.3 evidenceLocator=Subject §15 runnerRoots; docs/planning/three-review-protocol-v1-6-qa-reader-a-2026-08-29.mjs; docs/planning/three-review-protocol-v1-6-qa-reader-b-2026-08-29.rb.

2.8.4 observation=The vector records bind two file hashes but no author root, appointment root, toolchain root, environment root, derivation provenance or independence receipt. Both readers are direct ports of the same bespoke algorithm and both accept an explicitly supplied Subject path despite stale default filenames.

2.8.5 impact=Language diversity alone does not prevent common-mode implementation errors or producer-controlled conformance.

2.8.6 remediation=Use externally appointed implementations with separately derived normative parsers, bind toolchain/environment/source roots, and issue independent signed receipts.

2.8.7 closureTest=Verify distinct appointments and provenance chains, run hidden adversarial fixtures, and require both independently derived engines to agree without shared producer code or expected-result injection.

2.8.8 acceptanceCredit=0.

### 2.9 MPRR-V16-IHR-F009 — Acceptance path does not consume three reviews or quorum

2.9.1 severity=P0.

2.9.2 state=OPEN.

2.9.3 evidenceLocator=Subject §15 REVIEW-LIFECYCLE vectors; §16 commit member threeDistinctReviewRoots; REVIEW interpreter in both bundled readers.

2.9.4 observation=Lifecycle fixtures contain severity counters and booleans, not three Review roots, reviewer signatures, seals or a reconciliation root. The interpreter can reach ACCEPTED_FINAL without loading any of those artifacts.

2.9.5 impact=A producer can satisfy the executable acceptance path with counters alone while the commit schema merely names absent review evidence.

2.9.6 remediation=Make three sealed Review envelopes and one reconciliation receipt mandatory typed inputs to the acceptance transition and verify identities, subject binding, generation and quorum before state change.

2.9.7 closureTest=For each of the three Review envelopes, delete, duplicate, reorder, alter subject root, alter generation or reuse reviewer identity; every case must fail before ACCEPTED_PROVISIONAL with zero authority.

2.9.8 acceptanceCredit=0.

### 2.10 MPRR-V16-IHR-F010 — Separation rules have no appointments or evaluator

2.10.1 severity=P0.

2.10.2 state=OPEN.

2.10.3 evidenceLocator=Subject §12 SEPARATION_RULES block and MPRR-V16-REQ-008.

2.10.4 observation=15 dimension rules exist, but role-instance records=0, appointment records=0 and eligibility-evaluator records=0. All comparedRoles fields name role categories rather than bound principals.

2.10.5 impact=CandidateAuthor, ProducerQA, reviewers, reconciler, acceptor and appeal decider cannot be compared against real identities; separation remains prose.

2.10.6 remediation=Materialize externally issued appointments, canonical principal roots, dimension evidence and a deterministic eligibility decision per role pair.

2.10.7 closureTest=Run the evaluator on bound role instances and adversarial same-author, same-employer, same-toolchain, same-credential, shared-control and missing-evidence cases; all must block with a signed decision receipt.

2.10.8 acceptanceCredit=0.

### 2.11 MPRR-V16-IHR-F011 — Foundational Review-envelope contract is omitted

2.11.1 severity=P0.

2.11.2 state=OPEN.

2.11.3 evidenceLocator=Subject SOURCE_CARRIERS in §5.2; docs/planning/master-plan-three-review-reconciliation-protocol-2026-08-29.md §7.4.6; docs/planning/three-review-intake-and-reconciliation-eligibility-assessment-2026-08-29.md §4.

2.11.4 observation=The governing three-review protocol is not one of the 21 carriers. Its mandatory Review-envelope schema is not materialized: no bound reviewId, domain, reviewer identity, independence claim, instruction root, observed Subject bytes/root, tool versions, timing, finding manifest root or raw evidence root.

2.11.5 impact=The successor can redefine Review semantics without binding the contract that gives three-review evidence meaning.

2.11.6 remediation=Admit the governing protocol through an external source member and emit its complete Review-envelope schema and validation producer.

2.11.7 closureTest=Construct three full envelopes from the admitted contract, reproduce every field root, and prove that omission or mutation of any mandatory field fails seal verification.

2.11.8 acceptanceCredit=0.

### 2.12 MPRR-V16-IHR-F012 — DependencyHeadUniverse is not closed

2.12.1 severity=P0.

2.12.2 state=OPEN.

2.12.3 evidenceLocator=Subject MPRR-V16-REQ-013, §14 DEPENDENCY_FAMILIES, and registries in §§3,5,7,10,11,12,15,16.

2.12.4 observation=48/48 rows have discoveryAuthority=UNKNOWN, headRoot=UNKNOWN and absent membership/non-membership proofs. The registry omits current families consumed by the candidate, including CONTROL-MACHINE, CONTROL-TRANSITION, CONTROL-GUARD, SEPARATION-RULE, REQUIREMENT-OUTPUT, COMMIT-MEMBER, SOURCE-CARRIER, SOURCE-MEMBER and NAMED-USE.

2.12.5 impact=The dependency snapshot can exclude mutable evidence used by proof, policy and commit while still claiming complete discovery.

2.12.6 remediation=Define an externally authoritative closed-world discovery mechanism, include every actually consumed family, and emit membership plus non-membership proofs at a bound universe Head.

2.12.7 closureTest=Instrument all producer reads, compare them to the universe, inject a new/renamed/removed/revoked member in every family, and require uncoveredRead=0 and staleHeadAcceptance=0.

2.12.8 acceptanceCredit=0.

### 2.13 MPRR-V16-IHR-F013 — Operation key omits material identity inputs

2.13.1 severity=P0.

2.13.2 state=OPEN.

2.13.3 evidenceLocator=Subject BOOTSTRAP-COMMIT machine in §10 and §16.1.1.

2.13.4 observation=operationKey binds candidateRoot, B0AuthorityRoot, operationPurpose and epoch only. It omits expectedProtocolHead, subjectRoot, review roots, approval root, reconciliation root, dependency/trust/clock/finality/public/appeal roots and the acceptance envelope root.

2.13.5 impact=Different commit intents can alias to one idempotency key; RETRY_SAME_KEY may replay stale or detached evidence.

2.13.6 remediation=Derive operationKey from the canonical complete precommit envelope and every expected Head, with an explicit one-use purpose and epoch.

2.13.7 closureTest=Mutate each commit member independently; every mutation must change operationKey. Replay after any Head change, expiry, revocation or response loss must return the original exact receipt or fail closed.

2.13.8 acceptanceCredit=0.

### 2.14 MPRR-V16-IHR-F014 — Detached envelope bindings are absent

2.14.1 severity=P0.

2.14.2 state=OPEN.

2.14.3 evidenceLocator=Subject §16 COMMIT_MEMBERS and §16.1 commit contract.

2.14.4 observation=The commit list names candidateRoot and subjectRoot separately but emits no equality or derivation constraint. It likewise does not bind B0AuthorityRoot in operationKey to consumedBootstrapAuthorityRoot and externalB0ProcedureRoot in the commit.

2.14.5 impact=A valid approval, B0 authority or Review set can be attached to a different candidate/Subject while individual roots remain syntactically present.

2.14.6 remediation=Add typed equality and derivation predicates that bind Subject, candidate, B0 procedure, consumed authority, reviews, approval and envelope to one operation.

2.14.7 closureTest=Swap each root with a valid root from another operation; every detached-envelope case must abort before CAS with zero durable authority.

2.14.8 acceptanceCredit=0.

### 2.15 MPRR-V16-IHR-F015 — CAS does not fence every dependency and revocation head

2.15.1 severity=P0.

2.15.2 state=OPEN.

2.15.3 evidenceLocator=Subject MPRR-V16-REQ-013 and §14.1.3 versus §16 COMMIT_MEMBERS.

2.15.4 observation=The dependency contract promises one CAS over the universe Head plus every member and revocation root. The 22-member commit contains only one aggregate dependencyUniverseRoot and no per-member, universe-Head or revocation-Head entries.

2.15.5 impact=A dependency, membership or revocation state can change between proof and commit without causing CAS failure.

2.15.6 remediation=Materialize the exact CAS comparison set, including universe Head, every consumed member Head and every applicable revocation Head, and bind it to the precommit envelope.

2.15.7 closureTest=Race one update against each CAS member and revocation Head; every stale comparison must abort atomically, create no Permit and leave no partial write.

2.15.8 acceptanceCredit=0.

### 2.16 MPRR-V16-IHR-F016 — Post-readback divergence does not revoke issued authority

2.16.1 severity=P0.

2.16.2 state=OPEN.

2.16.3 evidenceLocator=Subject BOOTSTRAP-COMMIT-TRANSITION-006 in §10; §16.1.3; commit member issuedPermitRoot.

2.16.4 observation=After COMMITTED, DIVERGENCE changes state to POSTREADBACK_DIVERGED with authorityEffect=NONE. No REVOKE event, revocation write, Permit state transition or consuming-verifier rule links that divergence to the already issued Permit.

2.16.5 impact=Post-readback can detect corruption while previously granted authority remains consumable.

2.16.6 remediation=Define an atomic revocation-head update and Permit invalidation path, and require every consumer to check that head at use time.

2.16.7 closureTest=Commit, issue Permit, induce post-readback divergence, then attempt consumption before and after revocation propagation; all post-divergence consumption must fail and a durable revocation receipt must exist.

2.16.8 acceptanceCredit=0.

### 2.17 MPRR-V16-IHR-F017 — Negative lifecycle finals are labeled success

2.17.1 severity=P0.

2.17.2 state=OPEN.

2.17.3 evidenceLocator=Subject §15 vectors MPRR-V16-VEC-LIFECYCLE-003, -004, -007, -008 and -010; TERMINALS in §8.

2.17.4 observation=REJECTED_FINAL, CONFLICT_FINAL and REVOKED_FINAL are mapped to expectedTerminal TERM-SUCCESS in 5/10 lifecycle vectors, despite dedicated rejected/conflict/revoked terminal rows.

2.17.5 impact=Automation can report a successful acceptance result for rejection, conflict or revocation.

2.17.6 remediation=Define one normative mapping from lifecycle final states to terminal IDs and resultStatus, shared by registry, interpreter and vectors.

2.17.7 closureTest=Enumerate every lifecycle final state and assert its exact terminal. Negative finals must never produce resultStatus=SUCCESS or authority output.

2.17.8 acceptanceCredit=0.

### 2.18 MPRR-V16-IHR-F018 — Risk disposition is an unbound boolean

2.18.1 severity=P0.

2.18.2 state=OPEN.

2.18.3 evidenceLocator=Subject §15 vector MPRR-V16-VEC-LIFECYCLE-005-P2-WITH-DISPOSITION-ACCEPT and REVIEW interpreter in both readers.

2.18.4 observation=p2=1 is accepted when validRiskDisposition=true. The fixture carries no risk ID, three reviewer recommendations, owner, disposition text, authority root, HumanApproval, validity interval, trusted time or revocation state.

2.18.5 impact=Any caller can flip one boolean and convert an unresolved P2 into acceptance.

2.18.6 remediation=Replace the boolean with a canonical signed RiskDisposition record bound to the exact Finding, reviewers, approver, Subject, validity interval and revocation Head.

2.18.7 closureTest=Mutate or omit each disposition field, expire or revoke it, or bind it to another Finding/Subject; every case must reject acceptance. A valid record must verify independently.

2.18.8 acceptanceCredit=0.

## 3. P1 Findings

### 3.1 MPRR-V16-IHR-F019 — CPB1 version framing differs from the written schema

3.1.1 severity=P1.

3.1.2 state=OPEN.

3.1.3 evidenceLocator=Subject §4.1.1, §4.1.4, PARSER_PROFILES in §4.2, and namespace construction in §5.1.2.

3.1.4 observation=Parser roots reproduce 0/3 and namespace roots 0/27 when version is a separate CPB1 field as written. They reproduce only when the version is appended to the domain token.

3.1.5 impact=Conforming implementations following the normative prose disagree with emitted identities.

3.1.6 remediation=Choose one version-framing rule, specify its exact bytes, regenerate every affected root and add cross-language canonical vectors.

3.1.7 closureTest=Node and Ruby independently serialize fixed domain/version/field vectors and reproduce all parser and namespace roots without compatibility branches.

3.1.8 acceptanceCredit=0.

### 3.2 MPRR-V16-IHR-F020 — All line spans violate the inclusive contract

3.2.1 severity=P1.

3.2.2 state=OPEN.

3.2.3 evidenceLocator=Subject §5.1.3 and all 675 SOURCE_MEMBERS rows in §5.2.

3.2.4 observation=The schema says lineStart/lineEnd are one-based inclusive, but 0/675 rows follow that rule. All 675 use an exclusive lineEnd. Example: MPRR-V15-REQ-001 declares 57-69 while its bytes cover lines 57-68.

3.2.5 impact=Line-based evidence locators select an extra line and disagree with byte custody.

3.2.6 remediation=Either regenerate inclusive lineEnd values or normatively declare one-based half-open ranges; bind line and byte span equivalence.

3.2.7 closureTest=For every member, extract bytes through the declared line range under the chosen rule and require exact byteStart/byteEnd and digest equality for 675/675.

3.2.8 acceptanceCredit=0.

### 3.3 MPRR-V16-IHR-F021 — Most closure conjuncts lack exact source-relative spans

3.3.1 severity=P1.

3.3.2 state=OPEN.

3.3.3 evidenceLocator=Subject §6.1.2 and CROSSWALK rows MPRR-V16-XW-113 through MPRR-V16-XW-323.

3.3.4 observation=3376/4016 conjuncts use the symbolic locator TABLE-CELL-CANONICAL-TRIMMED rather than numeric source-relative byte start/end, despite the exact-span requirement.

3.3.5 impact=An independent reader cannot select the same bytes from the source member without reusing producer-specific table logic.

3.3.6 remediation=Emit numeric member-relative byte spans for every conjunct and define normalization independently of the target digest.

3.3.7 closureTest=Select and hash all 4016 conjuncts by numeric offsets alone; require missingSpan=0, overlapAmbiguity=0 and digestMismatch=0.

3.3.8 acceptanceCredit=0.

### 3.4 MPRR-V16-IHR-F022 — Failure predicates are not executable observed-state predicates

3.4.1 severity=P1.

3.4.2 state=OPEN.

3.4.3 evidenceLocator=Subject §9 FAILURE_CONDITIONS and §8 terminal selection rule.

3.4.4 observation=All 16 predicate fields are English descriptions such as stale CAS, invalid evidence or divergence. No input schema, boolean evaluator, error semantics or mapping from machine observation to trigger ID is defined.

3.4.5 impact=Runners can choose trigger IDs directly and still claim compliance; terminal precedence is disconnected from real failure detection.

3.4.6 remediation=Define typed observed-state records and total deterministic evaluators for every failure condition.

3.4.7 closureTest=Generate positive, negative, malformed and unknown-state fixtures per condition; two independent evaluators must derive identical trigger sets without caller-supplied IDs.

3.4.8 acceptanceCredit=0.

### 3.5 MPRR-V16-IHR-F023 — Control machines reference undefined guards and initial states

3.5.1 severity=P1.

3.5.2 state=OPEN.

3.5.3 evidenceLocator=Subject §10 CONTROL_MACHINES and CONTROL_TRANSITIONS.

3.5.4 observation=106 transitions reference 106 guard IDs, but executable guard definitions=0. Machine records omit initialState and typed state/event/context schemas.

3.5.5 impact=Allowed transitions, failure paths and reachability cannot be reproduced from the registry.

3.5.6 remediation=Publish a guard registry with typed inputs and algorithms, declare initial state and context schema per machine, and define malformed/unknown handling.

3.5.7 closureTest=Schema-validate and model-check all state/event pairs; require undefinedGuard=0, missingInitialState=0, nondeterministicTransition=0 and unhandledPair=0.

3.5.8 acceptanceCredit=0.

### 3.6 MPRR-V16-IHR-F024 — Trust/key/signature control is non-executable

3.6.1 severity=P1.

3.6.2 state=OPEN.

3.6.3 evidenceLocator=Subject MPRR-V16-REQ-005; TRUST machine and transitions in §10; absence of key/signature registries in the machine-readable blocks.

3.6.4 observation=No canonical KeyRecord, SignatureRecord, trust-anchor set, chain validator, signature algorithm policy or revocation lookup is emitted. TRUST state INVALID is not a target of any declared transition.

3.6.5 impact=Identity, signature validity, expiry and revocation can be asserted by an undefined guard.

3.6.6 remediation=Materialize all trust records and a total validator bound to external trust anchors and revocation Heads.

3.6.7 closureTest=Run valid, unknown-key, wrong-domain, expired, revoked, malformed-signature and chain-conflict fixtures through two independent validators; every failure must reach the defined invalid terminal.

3.6.8 acceptanceCredit=0.

### 3.7 MPRR-V16-IHR-F025 — Trusted-time control lacks observations and reachable split state

3.7.1 severity=P1.

3.7.2 state=OPEN.

3.7.3 evidenceLocator=Subject MPRR-V16-REQ-006; CLOCK machine and transitions in §10; lifecycle vectors in §15.

3.7.4 observation=No ClockObservation schema, source quorum, skew calculation, freshness rule or signed time receipt is emitted. SPLIT is listed as a state but no transition targets it. Lifecycle events use trustedTime=true as a caller boolean.

3.7.5 impact=Expiry and appeal-window decisions can be accepted without trustworthy time or split-clock detection.

3.7.6 remediation=Define signed multi-source observations, quorum/skew/freshness algorithms, explicit SPLIT transitions and time receipts consumed by lifecycle guards.

3.7.7 closureTest=Exercise good quorum, stale source, rollback, excessive skew, split quorum and missing source; only good quorum may authorize time-dependent transitions.

3.7.8 acceptanceCredit=0.

### 3.8 MPRR-V16-IHR-F026 — Finality control lacks receipts and reachable conflict

3.8.1 severity=P1.

3.8.2 state=OPEN.

3.8.3 evidenceLocator=Subject MPRR-V16-REQ-007 and FINALITY machine/transitions in §10.

3.8.4 observation=No FinalityReceipt schema, checkpoint source, confirmation rule, reorg/conflict evidence or validator is emitted. CONFLICT is listed but no transition targets it.

3.8.5 impact=The commit can consume finalityCheckpointRoot without a reproducible proof that the checkpoint is final or non-conflicting.

3.8.6 remediation=Materialize checkpoint and conflict receipts, define confirmation/finality rules and make conflict reachable from observed evidence.

3.8.7 closureTest=Run valid checkpoint, stale checkpoint, reorg, conflicting checkpoint, missing receipt and source rollback fixtures; all non-final cases must block before commit.

3.8.8 acceptanceCredit=0.

### 3.9 MPRR-V16-IHR-F027 — REVIEW/APPEAL registry and interpreter disagree

3.9.1 severity=P1.

3.9.2 state=OPEN.

3.9.3 evidenceLocator=Subject REVIEW control transitions in §10 and REVIEW-LIFECYCLE vectors in §15; lifecycle interpreter in both readers.

3.9.4 observation=All ten fixtures start REVIEWING and call CLOSE_REVIEW, while the registry permits CLOSE_REVIEW only from RECONCILED. The table has two RECONCILED+CLOSE_REVIEW transitions to different states, distinguished only by undefined guards. FILE_APPEAL and REVOKE coverage also differs between table and interpreter.

3.9.5 impact=The same event trace can be valid, invalid or reach a different final state depending on which claimed protocol is used.

3.9.6 remediation=Use one normative transition engine for registry and vectors, define guards, eliminate ambiguous state/event pairs and make appeal/revocation total.

3.9.7 closureTest=Replay every lifecycle vector through the generated normative machine and require exact state/terminal agreement; exhaustive state/event model checking must report ambiguity=0 and unhandled=0.

3.9.8 acceptanceCredit=0.

### 3.10 MPRR-V16-IHR-F028 — Custody lifecycle lacks executable records and concurrency proof

3.10.1 severity=P1.

3.10.2 state=OPEN.

3.10.3 evidenceLocator=Subject MPRR-V16-REQ-010; CUSTODY-CONTENT and CUSTODY-TOMBSTONE machines in §10.

3.10.4 observation=No content, tombstone, hold, deletion, custody receipt or conflict schema is emitted. DELETE_IN_PROGRESS is listed but not targeted by a transition, and no concurrent hold/delete/retry vectors exist.

3.10.5 impact=Retention, deletion, appeal hold and tombstone behavior cannot be proven under races or crash recovery.

3.10.6 remediation=Publish canonical custody records, atomic transition producers, hold precedence, deletion receipts and deterministic retry/conflict behavior.

3.10.7 closureTest=Model and execute hold-vs-delete, duplicate delete, crash at each write boundary, stale tombstone, concurrent retry and appeal races; require no forbidden deletion and exact durable receipts.

3.10.8 acceptanceCredit=0.

### 3.11 MPRR-V16-IHR-F029 — Public-projection safety is unproven

3.11.1 severity=P1.

3.11.2 state=OPEN.

3.11.3 evidenceLocator=Subject MPRR-V16-REQ-012, §13, PUBLIC machine in §10 and vector families in §15; public/cyber contract §2.9.6 and §2.9.8.

3.11.4 observation=No materialized PublicProjectionPolicy record, dictionary, information-flow evaluator, cadence proof or event-state vectors exist. The lexical scan found no concrete secret/PII value, but that does not prove non-interference.

3.11.5 impact=Private-derived metadata, count, timing, identifier or content commitments may reach the permanent Public repository without detection.

3.11.6 remediation=Materialize the fixed Public projection and a typed non-interference policy with dictionary/version custody and externally sealed event evidence.

3.11.7 closureTest=Run valid, conflicting, vetoed, appealed, expired, revoked, duplicate, reordered and concurrent publication cases plus seeded secret/PII/timing/count leakage; every unsafe projection must block before Public write.

3.11.8 acceptanceCredit=0.

### 3.12 MPRR-V16-IHR-F030 — Most control families have no executable or model-check producer

3.12.1 severity=P1.

3.12.2 state=OPEN.

3.12.3 evidenceLocator=Subject §§10-15 and the complete VECTORS block.

3.12.4 observation=The 471 vectors cover only crosswalk mutation, terminal pair ordering and a bespoke review interpreter. There are no normative-machine vectors for trust, clock, finality, public, dependency, commit, custody, media, generation, sealing, reconciliation, risk, acceptance or appeal.

3.12.5 impact=Claims of total transitions, fail-closed behavior, crash safety and concurrency safety are not exercised.

3.12.6 remediation=Generate executable state/event, malformed-input, crash-boundary, duplicate, reorder and concurrent schedules for every control family from the normative schemas.

3.12.7 closureTest=Independent model check plus implementation run covers every listed state/event pair and required adversarial schedule; require unreachableRequiredState=0, ambiguous=0, mismatch=0 and missingFamily=0.

3.12.8 acceptanceCredit=0.

## 4. P2 Findings

### 4.1 MPRR-V16-IHR-F031 — Media safety contract is not materialized

4.1.1 severity=P2.

4.1.2 state=OPEN.

4.1.3 evidenceLocator=Subject MPRR-V16-REQ-011; MEDIA machine in §10; absence of a MEDIA vector family in §15.

4.1.4 observation=The candidate names media safety states and guards but emits no media record schema, decoder/toolchain identity, resource bounds, content-policy evaluator, quarantine receipt or test corpus. MEDIA INVALID is not reached by an executable defined guard.

4.1.5 impact=Malformed, oversized or unsafe media handling remains implementation-dependent and may escape fail-closed behavior.

4.1.6 remediation=Materialize media input/output schemas, deterministic resource limits, decoder identities, safety policy and quarantine receipts.

4.1.7 closureTest=Run malformed headers, decompression bombs, oversized dimensions, unsupported codecs, policy violations, decoder disagreement and clean media through independent constrained validators.

4.1.8 acceptanceCredit=0.

## 5. Cross-cutting scan results

### 5.1 Forbidden or sensitive constructs

5.1.1 rawAbsoluteUnixPathCount=0.

5.1.2 decodedCrosswalkAbsoluteUnixPathCount=0.

5.1.3 Math.randomCount=0.

5.1.4 crypto.randomUUIDCount=0.

5.1.5 detectedPrivateKeyHeaderCount=0.

5.1.6 detectedCommonSecretPrefixCount=0.

5.1.7 detectedJWTShapeCount=0.

5.1.8 detectedEmailShapeCount=0.

5.1.9 scanDisposition=NO-CONCRETE-LEAK-DETECTED;NON-INTERFERENCE-NOT-PROVEN;SEE-F029.

## 6. Closure and verdict counters

### 6.1 Current review

| Severity | OPEN | CLOSED |
|---|---:|---:|
| P0 | 18 | 0 |
| P1 | 12 | 0 |
| P2 | 1 | 0 |
| P3 | 0 | 0 |
| TOTAL | 31 | 0 |

### 6.2 Predecessor semantic closure

6.2.1 predecessorFindings=16.

6.2.2 closed=0.

6.2.3 partial=16.

6.2.4 unresolvedForAcceptance=16.

### 6.3 Final authority state

6.3.1 verdict=REJECT-AS-NONEXECUTABLE-CANDIDATE.

6.3.2 Acceptance=0.

6.3.3 Gate29=BLOCKED.

6.3.4 developmentFreeze=ACTIVE.

6.3.5 repository=PUBLIC-PERMANENT.

6.3.6 independentReceipt=ABSENT-BLOCKING.

6.3.7 authorityOutputs=0.
