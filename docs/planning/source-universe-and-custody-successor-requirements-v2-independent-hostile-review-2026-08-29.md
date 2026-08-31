# 1. Connect — Independent hostile review of Source-universe and custody successor requirements v2

## 1.1 Review identity

1.1.1 `artifactId=CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-2026-08-29`.

1.1.2 `reviewId=SURS2-HR-2026-08-29`.

1.1.3 `reviewMode=INDEPENDENT-HOSTILE-PLANNING-REVIEW`.

1.1.4 subject path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-2026-08-29.md`.

1.1.5 binding subject SHA-256=`5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe`.

1.1.6 observed subject size=`437 lines; 36330 bytes`.

1.1.7 predecessor hostile-review root=`a9c479e0b066b781f5d742c63439f94d31811e3949e1823dae6824e5b4a225fa`.

1.1.8 predecessor findings-manifest root=`a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b`.

1.1.9 independently observed D31 candidate path=`web/docs/postgresql-runtime-role-decision.md`; observed raw SHA-256=`8816a77739a17e94cf9ffcbf5a586db00e001d9d5fdff3bd8e801a0e33e79bb0`.

1.1.10 review boundary=`planning artifact only; no Product code, Git mutation, Build, Push, Deploy, provider, credential, account or external-state mutation`.

1.1.11 independence statement=`the reviewer did not read or use the Producer-QA artifact; Producer-QA identifiers already embedded in the subject were treated as unresolved literal tokens, not as authority or evidence`.

1.1.12 subject mutation=`none`.

1.1.13 review status=`RAW REVIEWER-LOCAL; NOT RECONCILED; NOT ACCEPTED`.

## 1.2 Review question

1.2.1 determine whether the exact subject root is sufficiently closed, finite, traceable, testable and safe to serve as the accepted requirements contract for Source-universe discovery, authority, custody, Public-repository handling, replay, invalidation and Acceptance.

1.2.2 distinguish three different facts:

1.2.2.1 `directMappingPresence` asks whether each predecessor Finding ID is named.

1.2.2.2 `requirementTranslationAdequacy` asks whether the subject states the needed future contract without erasing the predecessor defect.

1.2.2.3 `evidentiaryClosure` asks whether exact schemas, indices, algorithms, rooted tests and eligible Acceptance actually prove the Finding closed.

1.2.3 a `FULL` translation is not an accepted closure and does not authorize implementation.

# 2. Mechanical and structural audit

## 2.1 Subject identity

2.1.1 binding-root readback=`PASS`; the file bytes hash to the root in 1.1.5.

2.1.2 line/byte readback=`PASS`; the observed values equal 1.1.6.

2.1.3 numbered-clause inventory=`180 total; 180 unique; 0 duplicate`.

## 2.2 Requirement rows and five-field schema

2.2.1 requirement IDs=`SURS-001..SURS-026`.

2.2.2 required row count=`26`; observed row count=`26`; missing IDs=`0`; duplicate IDs=`0`; non-sequential IDs=`0`.

2.2.3 required field instances=`26 × 5 = 130`.

2.2.4 observed `rule` fields=`26/26`.

2.2.5 observed `causeAndEffect` fields=`26/26`.

2.2.6 observed `sourceIds` fields=`26/26`.

2.2.7 observed `acceptancePredicate` fields=`26/26`.

2.2.8 observed `dependencies` fields=`26/26`.

2.2.9 five-field structural completeness=`PASS`.

2.2.10 five-field semantic completeness=`FAIL`; structural presence does not cure unresolved source tokens, hidden semantic dependencies, non-normative terminals or non-executable predicates.

## 2.3 Literal source-reference audit

2.3.1 literal `sourceIds` occurrences=`124`.

2.3.2 unique literal `sourceIds` tokens=`88`.

2.3.3 frozen `SourceReferenceIndex` artifact/root supplied by the subject=`0`.

2.3.4 index-resolved unique tokens credited=`0/88`.

2.3.5 direct predecessor Finding-ID presence=`32/32`.

2.3.6 exact artifact/root/locator/bounded-claim/inverse resolution proof=`0/32`.

2.3.7 result=`FAIL`; Section 1.2.3 states a future rule but the subject itself continues to depend on the unresolved references that caused `SURS-HR-F002`.

## 2.4 Declared dependency graph

2.4.1 graph nodes=`26`.

2.4.2 declared directed edges=`74`.

2.4.3 syntactically dangling SURS dependency IDs=`0`.

2.4.4 syntactic dependency cycles=`0`.

2.4.5 declared-DAG result=`PASS only at token level`.

2.4.6 semantic-DAG result=`FAIL`; multiple rules consume concepts defined only by later rows while omitting the dependency, and at least three hidden producer-consumer cycles result.

2.4.7 hidden cycle A=`AdmittedSource requires custody/locator/selection roots in SURS-008; custody is defined by SURS-009; SURS-009 declares SURS-008 as a predecessor`.

2.4.8 hidden cycle B=`Provider receipt requires legal approval in SURS-017; Approval is defined by SURS-018; SURS-018 declares SURS-017 as a predecessor`.

2.4.9 hidden cycle C=`SURS-022 requires a CandidateSet snapshot root whose canonical root contract is introduced by SURS-023; SURS-023 declares SURS-022 as a predecessor`.

2.4.10 additional undeclared consumers include SURS-016 consuming safe-fetch, Public-safe, authority-approval and invalidation semantics, and SURS-024 registering Decision/provider/approval/locator triggers without their defining nodes.

## 2.5 Crosswalk and terminal audit

2.5.1 predecessor Finding mappings=`32/32 present; sequential; unique`.

2.5.2 terminal text occurrences in the crosswalk=`32`; distinct text values=`32`.

2.5.3 normative TerminalRegistry supplied=`0`.

2.5.4 terminals that appear only as crosswalk prose are not bound to state axes, schema, transition, error identity or exact oracle.

2.5.5 `SURS-HR-F021` is especially non-deterministic because its terminal value is a three-way phrase—`AUTHORITY_UNKNOWN,QUARANTINED or CONFLICT_BLOCKED`—instead of a cause-to-one-terminal mapping.

2.5.6 terminal testability=`FAIL`.

# 3. Requirement-translation adequacy for SURS-HR-F001..F032

## 3.1 Scoring rule

3.1.1 `FULL` means the successor expresses every material obligation of the predecessor Finding as a future requirement and deterministic acceptance direction.

3.1.2 `PARTIAL` means direct mapping exists but at least one predecessor obligation is omitted, ambiguous or contradicted.

3.1.3 `ABSENT` means the original defect remains materially present in this exact requirements artifact.

3.1.4 none of these scores grants evidentiary closure; the accepted-closure counter remains separate.

## 3.2 Mapping results

3.2.1 `SURS-HR-F001=FULL`; SURS-001 names a finite frozen input, traversal policy, cutoff and incomplete-discovery behavior, but actual proof remains future work.

3.2.2 `SURS-HR-F002=ABSENT`; the required index is stated but not supplied, so 88 unique tokens remain unbound in the subject that needs the index.

3.2.3 `SURS-HR-F003=FULL`; SURS-002/SURS-003 require orthogonal registries, exact subjects, intervals and deterministic incomparable-authority blocking.

3.2.4 `SURS-HR-F004=FULL relative to the predecessor list`; SURS-004/SURS-015 carry every predecessor Git/worktree/LFS item, although Finding `SURS2-HR-F004` below identifies additional hostile states.

3.2.5 `SURS-HR-F005=FULL relative to the predecessor list`; missing families and Unknown quarantine are named, although derived registry closure remains defective under `SURS2-HR-F005`.

3.2.6 `SURS-HR-F006=FULL relative to the predecessor list`; classifier precedence, symlink, origin and license dispositions are required.

3.2.7 `SURS-HR-F007=FULL relative to the predecessor list`; typed schemas, canonical bytes, deterministic identities and Unknown rules are required, but Public-safe identity and immutable-state defects remain under `SURS2-HR-F006`.

3.2.8 `SURS-HR-F008=FULL relative to the predecessor list`; raw/private/public identities, authorization, provenance and custody transitions are separated, but admission ordering remains unsafe under `SURS2-HR-F007`.

3.2.9 `SURS-HR-F009=PARTIAL`; major Public surfaces and pre-egress quarantine are added, but the required incident/revocation lifecycle and unknown-sink terminal are not defined.

3.2.10 `SURS-HR-F010=PARTIAL`; rooted classification and independent approval are required, but detector thresholds, coverage bounds, detector-Unknown and post-leak limits are absent.

3.2.11 `SURS-HR-F011=FULL relative to the predecessor list`; the named parser/network/filesystem threats and quarantine state are required, while `SURS2-HR-F009` adds lifecycle and recursive-ingestion gaps.

3.2.12 `SURS-HR-F012=FULL relative to the predecessor list`; the missing media profiles, coordinate origins, parser version and unsupported terminal are required.

3.2.13 `SURS-HR-F013=PARTIAL`; hermetic independent envelopes are named, but accepted nondeterminism, OCR confidence thresholds and shared-parser rejection are not locally specified.

3.2.14 `SURS-HR-F014=FULL relative to the predecessor list`; every listed implicit/dynamic/mixed loader class and forbidden boundary is required, while `SURS2-HR-F010` identifies uncovered runtime-entry families.

3.2.15 `SURS-HR-F015=FULL relative to the predecessor list`; local/remote identity, overlays, lockfiles, runtime and toolchain profiles are separated.

3.2.16 `SURS-HR-F016=FULL relative to the predecessor list`; fetch observations, response cases, time/freshness states and invalidation direction are named, while unseen-change proof remains unsafe under `SURS2-HR-F011`.

3.2.17 `SURS-HR-F017=FULL relative to the predecessor list`; publisher/domain, redirects, authenticity and locale conflict are represented.

3.2.18 `SURS-HR-F018=FULL relative to the predecessor list`; private/provider receipts, Public projections, subject binding, expiry and revocation are required, while the approval dependency cycle remains under `SURS2-HR-F012`.

3.2.19 `SURS-HR-F019=FULL relative to the predecessor list`; Appointment, delegation, quorum, separation, expiry and revocation are required, while bootstrap authority remains unresolved.

3.2.20 `SURS-HR-F020=FULL relative to the predecessor list`; append-only canonical Decision events, actor authority, intervals, patches and deterministic reduction are required.

3.2.21 `SURS-HR-F021=PARTIAL`; blocking states exist, but the acceptance predicate does not map each cause to exactly one state-axis terminal.

3.2.22 `SURS-HR-F022=PARTIAL`; portable ID and raw hash are supplied, but the repository/custody-relative locator and exact Decision span are still future nouns rather than materialized values.

3.2.23 `SURS-HR-F023=FULL relative to the predecessor list`; four orthogonal state axes and transition vectors are required, while admission semantics remain contradictory under `SURS2-HR-F007`.

3.2.24 `SURS-HR-F024=FULL relative to the predecessor list`; immutable selection events, idempotency, canonical reduction and claim-graph traversal are required, while minimality lacks an oracle under `SURS2-HR-F014`.

3.2.25 `SURS-HR-F025=FULL relative to the predecessor list`; snapshot-bound member sets, equations and multi-tag treatment are required, while the CandidateSet root dependency remains unresolved.

3.2.26 `SURS-HR-F026=FULL relative to the predecessor list`; byte grammar, field order, Unicode/path/null/sort and domain-separated SHA-256 requirements are present.

3.2.27 `SURS-HR-F027=FULL relative to the predecessor list`; typed bidirectional relations, cardinality and reachability mutations are required, while exact relation inventory remains open under `SURS2-HR-F016`.

3.2.28 `SURS-HR-F028=FULL relative to the predecessor list`; typed triggers, least fixed point, cycle/Unknown and atomic-successor directions are required, while distributed atomicity and trigger closure remain unsafe under `SURS2-HR-F017`.

3.2.29 `SURS-HR-F029=FULL relative to the predecessor list`; retention, Hold, key/access/region/license and Backup/Restore linkage are required, while immutable-history versus erasure remains unresolved.

3.2.30 `SURS-HR-F030=FULL as a future acceptance rule`; zero open P0/P1/P2 and a finite rooted test/mutation manifest are mandatory, but no such manifest currently exists.

3.2.31 `SURS-HR-F031=FULL relative to the predecessor list`; exact-root detached Acceptance, eligibility, expiration, revocation and shared-envelope rejection are required, while not every dual-engine predicate is represented in the matrix.

3.2.32 `SURS-HR-F032=FULL`; raw-byte identity is explicitly separated from authenticity, authority, freshness and sufficiency.

## 3.3 Translation counters

3.3.1 direct mapping presence=`32/32`.

3.3.2 `FULL=26/32`.

3.3.3 `PARTIAL=5/32`.

3.3.4 `ABSENT=1/32`.

3.3.5 evidentiary closure accepted=`0/32`.

3.3.6 the subject's own `0/32` acceptance statement is consistent with this review.

# 4. New hostile findings

## 4.1 Finding inventory

4.1.1 reviewer-local Finding IDs=`SURS2-HR-F001..SURS2-HR-F020`.

4.1.2 total=`20`.

4.1.3 P0=`11`.

4.1.4 P1=`9`.

4.1.5 P2=`0`.

4.1.6 P3=`0`.

4.1.7 exact defects, impacts, remediation requirements and acceptance predicates are recorded in the companion findings manifest.

## 4.2 P0 summary

4.2.1 `SURS2-HR-F001`: the frozen SourceReferenceIndex required to make the subject self-traceable does not exist.

4.2.2 `SURS2-HR-F002`: finite discovery is asserted without a closed finite frontier construction and exact outside-boundary proof.

4.2.3 `SURS2-HR-F003`: the syntactic DAG hides custody, approval, CandidateSet and invalidation producer-consumer cycles.

4.2.4 `SURS2-HR-F007`: admission can depend on custody that depends on admission and can ambiguously retain missing authority as an admitted record.

4.2.5 `SURS2-HR-F008`: Public-egress coverage is not complete or observationally bounded for a Public repository.

4.2.6 `SURS2-HR-F009`: hostile ingestion does not preserve quarantine/control-data separation across recursive fetch, extraction and derivative processing.

4.2.7 `SURS2-HR-F011`: dynamic-source freshness treats an unseen publisher change as testable fact and omits required trust/safety dependencies.

4.2.8 `SURS2-HR-F012`: provider receipt and legal/authority Approval form a hidden bootstrap cycle.

4.2.9 `SURS2-HR-F013`: D31 has no materialized portable locator/exact span and its failure terminal is non-deterministic.

4.2.10 `SURS2-HR-F016`: SourceSet membership and relation cardinalities are not normatively enumerated and still depend on the absent reference index.

4.2.11 `SURS2-HR-F017`: invalidation lacks a closed trigger-to-edge registry and an implementable cross-store atomicity/failure contract.

## 4.3 P1 summary

4.3.1 `SURS2-HR-F004`: Git/LFS identity omits filters/attributes, promisor/alternate/replace/shallow states, nested repositories and object-availability verification.

4.3.2 `SURS2-HR-F005`: family/exclusion completeness is not derived from the admitted media/runtime/egress registries.

4.3.3 `SURS2-HR-F006`: deterministic public identity can leak private locators and immutable records improperly carry a mutable current pointer.

4.3.4 `SURS2-HR-F010`: locator and loader registries omit admission-scoped coverage equations and multiple runtime-entry classes.

4.3.5 `SURS2-HR-F014`: “minimally conservative” disagreement scope has no formal order, oracle or proof obligation.

4.3.6 `SURS2-HR-F015`: denominator equations do not define primary-versus-secondary family projection and depend on a later CandidateSet root.

4.3.7 `SURS2-HR-F018`: archive/replay does not reconcile immutable history with mandatory erasure or declare all custody/invalidation/replay dependencies.

4.3.8 `SURS2-HR-F019`: Acceptance independence omits several required dual-engine roles and no finite rooted test manifest is present.

4.3.9 `SURS2-HR-F020`: crosswalk terminal strings have no closed normative registry or total cause-to-terminal mapping.

# 5. Acceptance, safe terminals and verdict

## 5.1 Acceptance result

5.1.1 exact subject root reviewed=`PASS`.

5.1.2 structural 26-by-5 row shape=`PASS`.

5.1.3 syntactic DAG acyclicity=`PASS`.

5.1.4 exact source-reference closure=`FAIL`.

5.1.5 semantic dependency closure=`FAIL`.

5.1.6 complete Public-egress safety=`FAIL`.

5.1.7 hostile-ingestion closure=`FAIL`.

5.1.8 canonical terminal/state testability=`FAIL`.

5.1.9 open P0/P1/P2 required for Acceptance=`0`; observed open P0/P1/P2=`20`.

5.1.10 acceptance result=`REVIEW_BLOCKED`.

## 5.2 Safe successor conditions

5.2.1 preserve the exact subject root and this raw review; do not patch either after review.

5.2.2 create a successor requirements generation that consumes every `SURS2-HR-F001..F020` by exact ID and exact review/manifest roots.

5.2.3 materialize the frozen SourceReferenceIndex and inverse index before claiming that successor self-traceable.

5.2.4 split bootstrap schemas from later operational records so the declared dependency graph and semantic producer-consumer graph are the same acyclic graph.

5.2.5 bind Public safety to an actual source-to-transform-to-egress inventory and an explicit `UNKNOWN_EGRESS_BLOCKED` terminal.

5.2.6 materialize D31's repository/custody-relative path and exact Decision span, then map each failure cause to one state-axis terminal.

5.2.7 create an accepted TerminalRegistry, rooted real-source-derived conformance/mutation manifest, complete independence matrix and detached exact-root Acceptance only after all open P0/P1/P2 are zero.

## 5.3 Reviewer verdict

5.3.1 verdict=`REJECT AS ACCEPTANCE-READY; SUCCESSOR REQUIRED`.

5.3.2 disposition=`the subject is a materially improved requirements seed with 26/32 predecessor translations assessed FULL, but it is not self-traceable, semantically acyclic, Public-egress complete or acceptance-testable`.

5.3.3 Source-universe denominator, Product Requirement denominator, Program Task denominator, Product completion, remaining hours and ETA remain `unknown/unavailable`.

5.3.4 Gate29=`BLOCKED`.

5.3.5 development freeze=`ACTIVE`.

5.3.6 no Product/Git/Build/Push/Deploy/provider action is authorized by this review.
