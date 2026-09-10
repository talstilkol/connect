# 1. Connect — Independent hostile review of Source-universe and custody successor requirements

## 1.1 Review identity

1.1.1 `artifactId=CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-2026-08-29`.

1.1.2 `reviewId=SURS-HR-2026-08-29`.

1.1.3 review date=`2026-08-29`.

1.1.4 subject path=`web/docs/planning/source-universe-and-custody-successor-requirements-2026-08-29.md`.

1.1.5 required subject SHA-256=`f38b23aa130ad1c8ab4157e10e3de73160682d9c79e5decdf1e04c75fd696695`.

1.1.6 observed subject SHA-256=`f38b23aa130ad1c8ab4157e10e3de73160682d9c79e5decdf1e04c75fd696695`.

1.1.7 subject identity result=`PASS`.

1.1.8 subject size=`359 lines; 20474 bytes`.

1.1.9 findings manifest path=`web/docs/planning/source-universe-and-custody-requirements-hostile-review-findings-manifest-2026-08-29.md`.

1.1.10 findings manifest SHA-256=`a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b`.

1.1.11 findings manifest size=`505 lines; 32716 bytes`.

## 1.2 Independence and boundary

1.2.1 this was a reviewer-local hostile planning review of the exact immutable subject bytes.

1.2.2 the subject was not modified.

1.2.3 no later Producer review was used as authority or as a substitute for this reviewer's analysis.

1.2.4 no finding is merged, reconciled, accepted or closed by this report.

1.2.5 no Product code, Git state, Build, Push, Deploy, provider, credential or external system was changed.

1.2.6 the report evaluates whether a future independent implementation could derive one deterministic answer from the requirements, not whether the current Product happens to behave safely.

## 1.3 Method

1.3.1 pass 1 verified exact subject identity, byte size and full-file readability.

1.3.2 pass 2 checked the requirement schema, identifiers, typed states, record canonicalization and acceptance semantics.

1.3.3 pass 3 traced source-universe discovery, source classes, Git roots, exclusions, authority, Decisions and D31.

1.3.4 pass 4 modeled custody and the intentionally Public repository as hostile egress boundaries.

1.3.5 pass 5 challenged raw/derived media locators, implementation graphs, mutable official sources and provider receipts.

1.3.6 pass 6 checked forward and inverse closure, denominators, SourceSet identity, invalidation, archive/replay and QA acceptance.

1.3.7 each defect was retained separately when it has a distinct failure cause, repair object or acceptance predicate.

# 2. Executive verdict

## 2.1 Result

2.1.1 verdict=`REJECT AS ACCEPTANCE-READY; SUCCESSOR REQUIRED`.

2.1.2 total reviewer-local findings=`32`.

2.1.3 P0=`18`.

2.1.4 P1=`13`.

2.1.5 P2=`1`.

2.1.6 P3=`0`.

2.1.7 open=`32/32`.

2.1.8 closed=`0/32`.

2.1.9 SURS requirements accepted by this review=`0/26`.

2.1.10 exact SourceCandidate denominator remains=`unknown/unavailable`.

2.1.11 exact AdmittedSource denominator remains=`unknown/unavailable`.

2.1.12 Product completion, remaining hours and ETA remain=`unknown/unavailable`.

2.1.13 Gate29=`BLOCKED`.

2.1.14 development freeze=`ACTIVE`.

## 2.2 Why the rejection is mandatory

2.2.1 the Candidate universe is circular: “everything discovered” is not a finite denominator until discovery inputs, traversal and termination are rooted.

2.2.2 authority and precedence depend on undefined enums, subject keys, intervals and conflict rules.

2.2.3 custody and Public-repository safety do not cover the complete egress surface or prove authenticity and authorized acquisition.

2.2.4 source/locator/SourceSet records lack canonical machine-readable byte grammars, so exact roots are not reproducible.

2.2.5 mutable-source freshness and provider entitlement cannot be evaluated from the specified observations.

2.2.6 D31 is forced into admitted/rejected even when authority remains Unknown, contradicting the rest of the state model.

2.2.7 forward and inverse closure is absent across sources, custody objects, locators, assertions and claims.

2.2.8 QA explicitly allows open blocking P0/P1/P2 findings alongside acceptance and uses an unbounded mutation predicate.

# 3. Coverage of the requested hostile-review dimensions

## 3.1 Source classes

3.1.1 result=`REJECT`.

3.1.2 positive seed=`SURS-005 recognizes that specifications, Decisions, code, schema, tests, workflows and dynamic sources are different families`.

3.1.3 blocking defects=`SURS-HR-F001; SURS-HR-F005; SURS-HR-F006; SURS-HR-F025`.

3.1.4 cause-and-effect=`without a closed discovery input/traversal contract and an Unknown-family terminal, family counts cannot prove global completeness`.

## 3.2 Custody

3.2.1 result=`REJECT`.

3.2.2 positive seed=`SURS-009 correctly refuses silent copies and distinguishes missing custody as a blocking condition`.

3.2.3 blocking defects=`SURS-HR-F007; SURS-HR-F008; SURS-HR-F029`.

3.2.4 cause-and-effect=`hash equality proves copied bytes only; it does not prove origin authenticity, acquisition authority, immutable storage, retention or lawful replay`.

## 3.3 Authority and precedence

3.3.1 result=`REJECT`.

3.3.2 positive seed=`SURS-002 correctly states that evidence role and authority class are orthogonal`.

3.3.3 blocking defects=`SURS-HR-F002; SURS-HR-F003; SURS-HR-F019; SURS-HR-F020; SURS-HR-F023; SURS-HR-F024`.

3.3.4 cause-and-effect=`undefined authority and Decision reducers allow two compliant selectors to authorize opposite outcomes`.

## 3.4 Intentionally Public repository safety

3.4.1 result=`REJECT`.

3.4.2 positive seed=`SURS-010 recognizes that a valid private source can still cause a Public-repository data incident`.

3.4.3 blocking defects=`SURS-HR-F006; SURS-HR-F009; SURS-HR-F010; SURS-HR-F011; SURS-HR-F018; SURS-HR-F029`.

3.4.4 cause-and-effect=`checking final paths cannot prevent leakage through Git history, CI output, metadata, provider receipts, archives or third-party redistribution`.

## 3.5 Mutable-source capture

3.5.1 result=`REJECT`.

3.5.2 positive seed=`SURS-016 records retrieval time, version/effective date, expiry and change trigger separately`.

3.5.3 blocking defects=`SURS-HR-F016; SURS-HR-F017; SURS-HR-F018; SURS-HR-F028`.

3.5.4 cause-and-effect=`without a canonical fetch observation, trusted clock, freshness function and failed-refresh invalidation, stale provider facts can stay operational`.

## 3.6 Media locators

3.6.1 result=`REJECT`.

3.6.2 positive seed=`SURS-012 and SURS-013 preserve raw roots and require media-specific locations`.

3.6.3 blocking defects=`SURS-HR-F012; SURS-HR-F013; SURS-HR-F032`.

3.6.4 cause-and-effect=`missing media profiles and coordinate/canonicalization rules prevent exact claim readback across independent tools`.

## 3.7 Git-root identity

3.7.1 result=`REJECT`.

3.7.2 positive seed=`SURS-004 and SURS-015 keep the outer repository, Product repository, local overlay and remote observation conceptually separate`.

3.7.3 blocking defects=`SURS-HR-F004; SURS-HR-F015`.

3.7.4 cause-and-effect=`commit identity alone does not reconstruct modes, overlays, LFS/submodule bytes, ignored/untracked state, runtime resolution or a moving remote ref`.

## 3.8 Exclusions

3.8.1 result=`REJECT`.

3.8.2 positive seed=`SURS-006 prevents generated/cache/dependency volume from becoming authority by default`.

3.8.3 blocking defects=`SURS-HR-F006; SURS-HR-F009; SURS-HR-F010`.

3.8.4 cause-and-effect=`without deterministic provenance and exception rules, exclusions can discard first-party authority or ignore third-party license and security evidence`.

## 3.9 D31

3.9.1 result=`REJECT`.

3.9.2 positive seed=`SURS-020 corrects the earlier factual miss by naming available candidate bytes and their SHA-256`.

3.9.3 blocking defects=`SURS-HR-F021; SURS-HR-F022`.

3.9.4 cause-and-effect=`byte availability neither resolves authority nor justifies a binary disposition, and the absolute path/whole-file locator is not portable exact-source evidence`.

## 3.10 Freshness and invalidation

3.10.1 result=`REJECT`.

3.10.2 positive seed=`SURS-024 requires successor generation instead of rewriting history`.

3.10.3 blocking defects=`SURS-HR-F016; SURS-HR-F018; SURS-HR-F028`.

3.10.4 cause-and-effect=`a successor rule without complete triggers, graph semantics and atomic invalidation can leave stale acceptance current`.

## 3.11 Forward and inverse closure

3.11.1 result=`REJECT`.

3.11.2 positive seed=`SURS-023 prohibits SourceSet self-membership and asks for dual readback`.

3.11.3 blocking defects=`SURS-HR-F002; SURS-HR-F025; SURS-HR-F026; SURS-HR-F027; SURS-HR-F028`.

3.11.4 cause-and-effect=`a set root can pass while approval, provenance, locator or inverse reference objects are orphaned`.

## 3.12 Testability and deterministic acceptance

3.12.1 result=`REJECT`.

3.12.2 positive seed=`SURS-026 asks for two discovery runs, two parsers, hostile reviews and negative/mutation evidence`.

3.12.3 blocking defects=`SURS-HR-F001; SURS-HR-F003; SURS-HR-F004; SURS-HR-F007; SURS-HR-F012; SURS-HR-F016; SURS-HR-F026; SURS-HR-F027; SURS-HR-F028; SURS-HR-F030; SURS-HR-F031`.

3.12.4 cause-and-effect=`independent readers cannot compensate for undefined byte grammars and acceptance can currently PASS with open blockers`.

# 4. Finding index

## 4.1 P0 findings

4.1.1 `SURS-HR-F001`=`unclosed/circular SourceCandidateUniverse`.

4.1.2 `SURS-HR-F002`=`unrooted sourceIds and no bidirectional source-reference resolution`.

4.1.3 `SURS-HR-F003`=`undefined authority, subject and precedence semantics`.

4.1.4 `SURS-HR-F004`=`incomplete Git and working-tree canonical identity`.

4.1.5 `SURS-HR-F007`=`non-normative source record schemas and ID/root rules`.

4.1.6 `SURS-HR-F008`=`custody conflates raw copy and derivative and cannot prove authenticity/authorization`.

4.1.7 `SURS-HR-F009`=`incomplete Public egress boundary and no pre-ingest quarantine`.

4.1.8 `SURS-HR-F011`=`underdefined hostile-content parser/network/filesystem boundary`.

4.1.9 `SURS-HR-F012`=`noncanonical and incomplete media locators`.

4.1.10 `SURS-HR-F016`=`non-deterministic mutable-source freshness and capture`.

4.1.11 `SURS-HR-F018`=`provider receipt identity, safety and lifecycle gaps`.

4.1.12 `SURS-HR-F020`=`undefined Decision/amendment event reducer`.

4.1.13 `SURS-HR-F021`=`D31 binary disposition contradicts Unknown/conflict safety`.

4.1.14 `SURS-HR-F023`=`selection, availability, lifecycle and quarantine axes conflated`.

4.1.15 `SURS-HR-F026`=`SourceSet canonical byte/root contract absent`.

4.1.16 `SURS-HR-F027`=`forward/inverse closure absent`.

4.1.17 `SURS-HR-F028`=`invalidation graph and atomic successor semantics absent`.

4.1.18 `SURS-HR-F030`=`acceptance can PASS with blockers and unrooted mutation corpus`.

## 4.2 P1 findings

4.2.1 `SURS-HR-F005`=`incomplete family registry and Unknown-family workflow`.

4.2.2 `SURS-HR-F006`=`non-deterministic exclusion/provenance/license handling`.

4.2.3 `SURS-HR-F010`=`non-deterministic classification, redaction, minimization and redistribution approval`.

4.2.4 `SURS-HR-F013`=`non-hermetic/non-independent derivative reproduction`.

4.2.5 `SURS-HR-F014`=`incomplete implementation dependency/load graph`.

4.2.6 `SURS-HR-F015`=`runtime/toolchain and remote observation not bound`.

4.2.7 `SURS-HR-F017`=`official publisher/URI authenticity not proven`.

4.2.8 `SURS-HR-F019`=`Appointment, SoD, expiry and revocation undefined`.

4.2.9 `SURS-HR-F022`=`D31 locator is machine-specific and whole-file`.

4.2.10 `SURS-HR-F024`=`selection assertion identity/replay/conflict scope undefined`.

4.2.11 `SURS-HR-F025`=`overlapping denominator dimensions and no CandidateSet root`.

4.2.12 `SURS-HR-F029`=`archive retention, Legal Hold, keys, access and scoped replay absent`.

4.2.13 `SURS-HR-F031`=`run/reviewer/acceptance independence and signer lifecycle absent`.

## 4.3 P2 findings

4.3.1 `SURS-HR-F032`=`raw-byte fidelity is mislabeled as authority`.

# 5. Required successor sequence

## 5.1 Phase 1 — Freeze normative identities

5.1.1 define algorithm-tagged digest and domain separation.

5.1.2 define canonical serialization, Unicode, path, URI, time and null/Unknown primitives.

5.1.3 define deterministic IDs and versioned machine-readable schemas.

5.1.4 resolve `SURS-HR-F007`, `SURS-HR-F026` and the identity portions of all later findings.

## 5.2 Phase 2 — Root the discovery universe

5.2.1 define the finite DiscoveryInputSet and cutoff.

5.2.2 define traversal, recursion, external URI and terminal rules.

5.2.3 define SourceCandidateSet root, family registry and exclusions.

5.2.4 resolve `SURS-HR-F001`, `SURS-HR-F004`, `SURS-HR-F005` and `SURS-HR-F006`.

## 5.3 Phase 3 — Root traceability and authority

5.3.1 create the exact SourceReferenceIndex.

5.3.2 define authority, evidence roles, subject keys and precedence/conflict algorithm.

5.3.3 define Appointment/Approval eligibility and lifecycle.

5.3.4 resolve `SURS-HR-F002`, `SURS-HR-F003` and `SURS-HR-F019`.

## 5.4 Phase 4 — Separate lifecycle axes

5.4.1 define SelectionState, AvailabilityState, LifecycleState and SafetyState.

5.4.2 define append-only SelectionAssertion events and reducers.

5.4.3 define disagreement-to-claim closure.

5.4.4 resolve `SURS-HR-F023` and `SURS-HR-F024`.

## 5.5 Phase 5 — Build custody and Public-safety contracts

5.5.1 separate raw custody from public derivatives.

5.5.2 define acquisition authenticity/authorization and immutable custody events.

5.5.3 define the complete Public Egress Surface and pre-ingest quarantine.

5.5.4 define classification, minimization, license and redaction verification.

5.5.5 define hostile-file/network/parser boundaries.

5.5.6 resolve `SURS-HR-F008`, `SURS-HR-F009`, `SURS-HR-F010` and `SURS-HR-F011`.

## 5.6 Phase 6 — Complete media and implementation evidence

5.6.1 define the media locator registry and exact coordinate profiles.

5.6.2 define hermetic extraction/render envelopes and ambiguity handling.

5.6.3 define Git overlay, dependency/load graph, runtime and toolchain identity.

5.6.4 resolve `SURS-HR-F004`, `SURS-HR-F012`, `SURS-HR-F013`, `SURS-HR-F014`, `SURS-HR-F015` and `SURS-HR-F032`.

## 5.7 Phase 7 — Make dynamic and provider evidence temporal

5.7.1 define canonical fetch observations and publisher authenticity.

5.7.2 define freshness states, refresh triggers and failed-refresh behavior.

5.7.3 define private provider receipts and public-safe projections.

5.7.4 resolve `SURS-HR-F016`, `SURS-HR-F017` and `SURS-HR-F018`.

## 5.8 Phase 8 — Normalize Decisions and D31

5.8.1 define DecisionEvent identity and state reducer.

5.8.2 capture exact directive/amendment provenance and field-level supersession.

5.8.3 replace the D31 absolute path with portable custody identity and exact claim locator.

5.8.4 permit safe unresolved D31 terminals.

5.8.5 resolve `SURS-HR-F020`, `SURS-HR-F021` and `SURS-HR-F022`.

## 5.9 Phase 9 — Prove sets, closure and lifecycle propagation

5.9.1 define CandidateSet and SourceSet canonical roots and dimensional set equations.

5.9.2 define forward/inverse relation cardinalities and reachability.

5.9.3 define complete invalidation triggers and least-fixed-point traversal.

5.9.4 define atomic successor/current-state semantics.

5.9.5 define confidentiality-aware archive, Legal Hold and scoped offline replay.

5.9.6 resolve `SURS-HR-F025`, `SURS-HR-F026`, `SURS-HR-F027`, `SURS-HR-F028` and `SURS-HR-F029`.

## 5.10 Phase 10 — Make acceptance executable

5.10.1 publish finite rooted positive, negative and mutation manifests with exact oracles.

5.10.2 prove discoverer/parser and reviewer independence.

5.10.3 define detached exact-root acceptance authority, signature, expiry and revocation.

5.10.4 require open P0/P1/P2=`0` for ACCEPTED and keep blocking findings in `REVIEW_BLOCKED`.

5.10.5 resolve `SURS-HR-F030` and `SURS-HR-F031`.

# 6. Acceptance conditions for a successor review

## 6.1 Intake conditions

6.1.1 create a successor artifact rather than patching the reviewed subject root.

6.1.2 enumerate every `SURS-HR-F001–SURS-HR-F032` in a rooted remediation matrix.

6.1.3 map each finding to exact successor clauses, test IDs and evidence IDs.

6.1.4 preserve this reviewer-local manifest unchanged until protocol-governed reconciliation.

## 6.2 Structural conditions

6.2.1 all normative schemas and registries are exact-rooted and machine readable.

6.2.2 every source reference resolves forward and inverse with no ambiguity.

6.2.3 all sets, counters and roots reconstruct from exact member IDs.

6.2.4 all lifecycle and invalidation transitions have deterministic state machines.

## 6.3 Security conditions

6.3.1 prohibited content cannot enter any Public egress surface.

6.3.2 hostile content cannot trigger authority, network, filesystem or executable side effects.

6.3.3 provider/private evidence has secret-free public projection and lifecycle invalidation.

6.3.4 archives honor confidentiality, retention, Legal Hold, keys and access evidence.

## 6.4 Review conditions

6.4.1 reviewer independence is proven under an accepted protocol.

6.4.2 every required mutation is rooted and killed by an exact expected failure.

6.4.3 open P0/P1/P2 count is zero before acceptance.

6.4.4 detached acceptance binds the exact successor root and an eligible unexpired signer.

# 7. Final disposition

## 7.1 Reviewer statement

7.1.1 the subject is a useful planning seed and contains several correct safety directions.

7.1.2 it is not a deterministic Source-universe/custody contract and cannot support a complete requirement denominator or Gate29 opening.

7.1.3 the next safe planning action is a successor generation that closes or explicitly carries every reviewer-local finding; it is not Product implementation.

7.1.4 no exact Product percentage, remaining hours or ETA can be derived from this subject.

7.1.5 final verdict=`REJECT AS ACCEPTANCE-READY; SUCCESSOR REQUIRED`.
