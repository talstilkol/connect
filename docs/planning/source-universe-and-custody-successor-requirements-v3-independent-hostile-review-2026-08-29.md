# 1. Connect — Source-universe and custody successor requirements v3 independent hostile review

## 1.1 Review identity

1.1.1 `artifactId=CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V3-INDEPENDENT-HOSTILE-REVIEW-2026-08-29`.

1.1.2 `reviewId=SURS3-HR-2026-08-29`.

1.1.3 review mode=`INDEPENDENT-HOSTILE-PLANNING-REVIEW`.

1.1.4 reviewer disposition=`REVIEWER-LOCAL; NOT-RECONCILED; NOT-ACCEPTED`.

1.1.5 subject path=`web/docs/planning/source-universe-and-custody-successor-requirements-v3-2026-08-29.md`; exact SHA-256=`6cb64b3877f194302a25fd25f5fa73c76a4d06d208f0e62a124e5591e5247092`; observed size=`793 lines; 72652 bytes`.

1.1.6 SourceReferenceIndex path=`web/docs/planning/source-universe-and-custody-successor-requirements-v3-source-reference-index-2026-08-29.md`; exact SHA-256=`a36a71f9ecd30ceaad7a696c91ac144a7dcd527dfbbb0ab9cffff2f871cfcc20`; observed size=`211 lines; 37979 bytes`.

1.1.7 conformance/mutation-manifest path=`web/docs/planning/source-universe-and-custody-successor-requirements-v3-conformance-mutation-manifest-2026-08-29.md`; exact SHA-256=`980c27ab127a81ca8dcb0c7ab6b7ad8fdabf857a1d7ba0a9beb09e14ad046e2e`; observed size=`111 lines; 19334 bytes`.

1.1.8 predecessor subject path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-2026-08-29.md`; exact SHA-256=`5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe`.

1.1.9 predecessor independent-review path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-independent-hostile-review-2026-08-29.md`; exact SHA-256=`59f83f8d68439c404a10857bcd18535bbc826f12eb7c3e0da06106d7e6d4a923`.

1.1.10 predecessor findings path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-independent-hostile-review-findings-manifest-2026-08-29.md`; exact SHA-256=`4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea`.

1.1.11 first-generation findings path=`web/docs/planning/source-universe-and-custody-requirements-hostile-review-findings-manifest-2026-08-29.md`; exact SHA-256=`a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b`.

1.1.12 D31 source path=`web/docs/postgresql-runtime-role-decision.md`; exact SHA-256=`8816a77739a17e94cf9ffcbf5a586db00e001d9d5fdff3bd8e801a0e33e79bb0`.

1.1.13 findings-manifest path=`web/docs/planning/source-universe-and-custody-successor-requirements-v3-independent-hostile-review-findings-manifest-2026-08-29.md`; the manifest binds this report after this report is frozen, so this report does not create a circular self-reference by embedding the later manifest root.

## 1.2 Independence and boundary

1.2.1 the Producer-QA artifact was deliberately excluded and was not read, cited or used as evidence, remediation authority or closure credit.

1.2.2 the reviewed subject, SourceReferenceIndex and conformance/mutation manifest were not modified.

1.2.3 this review created only reviewer-local planning artifacts; it performed no source collection, Product extraction, Product code, Git mutation, Build, runtime test, Push, Deploy, provider, account, credential or external-state mutation.

1.2.4 repository visibility remains `Public`; no finding proposes a Private-repository substitution.

1.2.5 no Finding below is merged, suppressed, reconciled, risk-accepted or closed by this reviewer.

1.2.6 exact SourceCandidate, Product Requirement, Program Task, Product completion, remaining-hours and ETA denominators remain `unknown/unavailable`.

# 2. Review method

## 2.1 Mechanical checks

2.1.1 recompute each reviewed input SHA-256 and byte/line count from the local immutable bytes.

2.1.2 enumerate `SURS3-REQ-001..046`, require exactly five named fields per row and reject duplicate or missing numbered clauses.

2.1.3 parse every declared dependency as `consumer -> prerequisite producer`, count edges and detect unknown, self, duplicate, forward and cyclic edges.

2.1.4 enumerate SourceReferenceIndex namespaces, targets, target roots, locators, claims, evidence roles, inverse consumers and occurrence records.

2.1.5 compare every literal `sourceBasis` and predecessor-crosswalk token with the index, then separately compare literal source-reference occurrences with the index's occurrence identity rule.

2.1.6 recompute the D31 raw and span roots, line count and byte count.

2.1.7 enumerate conformance, mutation and generation test IDs and detect duplicate or missing ID sequences.

## 2.2 Semantic hostile checks

2.2.1 translate every consumed object, state, registry, algorithm, policy and evidence type into an independent producer-consumer graph rather than trusting the printed dependency list.

2.2.2 attempt adversarial scheduling of Bootstrap, custody, ingestion, selection, admission, Public handling, dynamic/provider/Decision sources, archive, invalidation, review and Acceptance.

2.2.3 compare each of the 26 v2 requirements at clause level, not merely by token presence, against its claimed dedicated v3 preservation destination.

2.2.4 compare each of the 20 v2-review Finding remediations and each of the 32 predecessor-Finding safety predicates against the v3 statements and frozen test manifest.

2.2.5 attempt clean-room execution of each purported deterministic test using only the frozen roots; a prose instruction to evaluate another prose predicate receives no executable-oracle credit.

2.2.6 require every claimed two-generation test to bind exact A/B roots, one exact Delta, exact preimage and postimage, exact affected Set and exact oracle bytes.

# 3. Mechanical results

## 3.1 Subject structure

3.1.1 requirement rows=`46/46 present`; sequence=`SURS3-REQ-001..046`; duplicate requirement IDs=`0`.

3.1.2 five-field instances=`230/230 present`; field names per row=`statement, defect/cause/impact, proof/predicate, dependencies, sourceBasis`.

3.1.3 numbered clauses=`266`; unique numbered clauses=`266`; duplicate numbered clauses=`0`.

3.1.4 declared dependency nodes=`46`; declared edges=`336`; unknown IDs=`0`; self edges=`0`; duplicate row edges=`0`; forward edges=`0`; syntactic cycles=`0`.

3.1.5 syntactic DAG result=`PASS`; semantic producer-consumer DAG result=`FAIL`.

## 3.2 SourceReferenceIndex

3.2.1 namespace roots=`5`; canonical target rows=`79`; unique target tokens=`79`; duplicate target tokens=`0`.

3.2.2 indexed ordered `(token,consumer)` pairs=`80`; unique pair IDs=`80`; duplicate pairs=`0`.

3.2.3 literal source-token occurrences in the reviewed subject=`126`; unique literal tokens=`79`.

3.2.4 literal occurrences by namespace=`SRC-V2 52; SRC-SURS2-FINDINGS 40; SRC-SURS1-FINDINGS 32; SRC-D31 2`.

3.2.5 the index's pair ledger equals the 48 `sourceBasis` pairs plus the 32 `PCW` pairs, but it collapses the repeated 26 v2-preservation and 20 new-Finding-closure crosswalk literals into existing pairs and therefore is not an occurrence-complete ledger.

3.2.6 physical upstream roots checked=`5/5 match`; unresolved target roots=`0`.

3.2.7 D31 raw root=`MATCH`; lines `747–751` span root=`6a13c3d00d7576d97cbcbe69340a019a83b79831987942d7c39534a49ec97578`; line count=`5`; byte count=`464`; all match the index.

3.2.8 target identity/root presence result=`PASS`; literal-occurrence completeness result=`FAIL`; non-D31 exact byte-locator executability result=`FAIL`.

## 3.3 Frozen test manifest

3.3.1 conformance IDs=`46/46`; mutation IDs=`20/20`; generation IDs=`4/4`; total IDs=`70`; duplicate IDs=`0`.

3.3.2 the 46 conformance rows all reuse the same generic operation, `evaluate the row's canonical proof/predicate`, and the same generic oracle form, `all conjuncts true`; exact executable fixture bytes and expected output bytes are absent.

3.3.3 the 20 mutation rows name mutation classes but do not materialize canonical operation bytes, target locators, preimages, postimages or expected state/output roots.

3.3.4 the four generation rows use placeholders for A, B, Delta and affected Set rather than frozen identities.

3.3.5 structural ID result=`PASS`; finite executable conformance/oracle result=`FAIL`.

# 4. Semantic dependency analysis

## 4.1 Public-safety lineage

4.1.1 `SURS3-REQ-014` creates and tests a Public projection before `SURS3-REQ-023` produces the authoritative Public-safe classification, minimization, redaction and re-identification policy.

4.1.2 `SURS3-REQ-015` creates `DerivedPublicObject` and redaction events before that same policy exists.

4.1.3 `SURS3-REQ-018` requires disclosure-safe redacted failure evidence but depends only on the ingestion contract, while the normative Public policy is later and depends back on `SURS3-REQ-014`, `015`, `017`, `021` and `022`.

4.1.4 the semantic edges from Public projections and disclosure-safe evidence to the later policy close a forward cycle even though the printed graph is acyclic.

## 4.2 Custody, ingestion, selection and admission

4.2.1 `SURS3-REQ-017` claims coverage for every admitted content family, but `AdmittedSource` is produced by `SURS3-REQ-021`, which depends on `SURS3-REQ-017`.

4.2.2 `SURS3-REQ-021` requires exact failure-axis terminals, but the total cause-to-axis table is produced later by `SURS3-REQ-022`, which depends on `SURS3-REQ-021`.

4.2.3 `SURS3-REQ-021` embeds locator and claim-limit fields, but the locator registry is produced later by `SURS3-REQ-024`, which depends on `SURS3-REQ-021`.

4.2.4 `SURS3-REQ-021` does not consume the recursive-taint closure in `SURS3-REQ-018`; an implementation can satisfy its printed dependencies while admitting content whose nested derivative path has not passed the stronger safe-fetch/taint rules.

4.2.5 these are semantic cycles and a missing safety edge, not merely optional direct-edge optimizations.

## 4.3 Archive, invalidation, review and Acceptance

4.3.1 `SURS3-REQ-041` consumes review and Acceptance-envelope types that are first produced by `SURS3-REQ-046`, while `SURS3-REQ-046` depends on `SURS3-REQ-041`.

4.3.2 `SURS3-REQ-043` derives triggers for test-oracle and reviewer-eligibility changes, but the independence/test binding is produced by `SURS3-REQ-045`, while `SURS3-REQ-045` depends on `SURS3-REQ-043`.

4.3.3 `SURS3-REQ-030` requires an exact indexed source locator yet declares no dependency path to the SourceReferenceIndex validator or the locator-profile producer; its later D31 specialization adds those edges, but the generic DecisionEvent contract remains under-specified.

4.3.4 the sole-producer table therefore does not equal the semantic graph, and `SURS2-HR-F003` is not closed.

# 5. Preservation and closure analysis

## 5.1 Twenty-six v2 requirements

5.1.1 exact v2 token presence=`26/26`; dedicated mapping row presence=`26/26`; evidentiary preservation accepted=`0/26`.

5.1.2 the dedicated-only crosswalk is not lossless for at least these obligations:

5.1.2.1 v2 `SURS-004` includes toolchain-binding inputs but maps only to `SURS3-REQ-009`; the toolchain contract is in `SURS3-REQ-026`.

5.1.2.2 v2 `SURS-008` requires independent review of every admission, but `SURS3-REQ-021` does not retain that predicate.

5.1.2.3 v2 `SURS-010` combines Public-safe policy and complete egress coverage but maps only to `SURS3-REQ-023`; the egress contract is in `SURS3-REQ-039`.

5.1.2.4 v2 `SURS-020` includes D31 failure outcomes but maps only to `SURS3-REQ-031`; the total outcome table is in `SURS3-REQ-032`.

5.1.2.5 v2 `SURS-021` includes minimal-conservative disagreement scope but maps only to `SURS3-REQ-020`; its oracle is in `SURS3-REQ-033`.

5.1.2.6 v2 `SURS-022` includes equations but maps only to `SURS3-REQ-036`; exact equations are in `SURS3-REQ-037`.

5.1.2.7 v2 `SURS-023` includes relation closure/cardinality but maps only to `SURS3-REQ-034`; relation cardinalities are in `SURS3-REQ-035`.

5.1.2.8 v2 `SURS-024` includes complete triggers and atomic publication but maps only to `SURS3-REQ-040`; closed triggers and publication fencing are in `SURS3-REQ-043`.

5.1.2.9 v2 `SURS-026` includes the independence matrix and finite tests but maps only to `SURS3-REQ-046`; those contracts are in `SURS3-REQ-045`.

5.1.3 the claim `26/26 preserved` is therefore syntactic presence, not clause-level lossless preservation.

## 5.2 Twenty v2-review findings

5.2.1 direct dedicated token mapping=`20/20`; reviewer Finding identities merged=`0`; evidentiary closures accepted=`0/20`.

5.2.2 material closure failures remain for `SURS2-HR-F001`, `F003`, `F006`, `F007`, `F008`, `F013`, `F014`, `F019` and `F020`; their exact defect identities are preserved separately in the reviewer-local findings manifest.

5.2.3 direct Finding-token presence does not close a Finding when the index collapses occurrences, the semantic DAG still cycles, the Public policy is ordered after Public objects, or the test/oracle records remain prose templates.

## 5.3 Thirty-two predecessor findings

5.3.1 exact predecessor token presence=`32/32`; unique PCW identities=`32`; evidentiary closures accepted=`0/32`.

5.3.2 predecessor `SURS-HR-F007` required rejection of arbitrary counters and random values; v3's deterministic wording does not preserve the explicit `Math.random()` and unapproved-randomness prohibition or a corresponding negative vector.

5.3.3 predecessor `SURS-HR-F010` required accepted per-class detection thresholds and zero critical-secret false negatives; v3 names an unrooted positive/negative corpus but provides neither thresholds nor an executable detector oracle.

5.3.4 predecessor Acceptance, independence, exact-oracle and lifecycle findings remain unproved because the frozen 70-ID manifest is not an executable corpus.

# 6. Security and lifecycle analysis

## 6.1 Public repository and egress

6.1.1 retaining Public visibility is correct and binding; the defect is ordering and proof, not the visibility decision.

6.1.2 the Public opaque projection has no selected construction, key/indirection lifecycle, collision/linkability rule or rooted adversarial corpus; a deterministic projection can remain dictionary-reidentifiable.

6.1.3 `SURS3-REQ-039` derives sinks only from configurations already observed, without a separate finite `EgressDiscoveryInputSet`, traversal frontier, cutoff and withheld/inaccessible-source ledger; an unseen configuration can therefore remain outside both the sink Set and the Unknown Set.

6.1.4 a detector claim without exact per-class thresholds, critical-secret false-negative rule and rooted mutations can overclaim safety on a Public repository.

## 6.2 Dynamic, provider and Decision sources

6.2.1 the dynamic-source requirements improve cache, Grace, stale and residual-uncertainty handling, but the authenticity evidence schema does not close TLS/proxy/CDN/publisher-key lineage, DNS observation identity, `Vary` and authenticated-cache partition semantics.

6.2.2 `SURS3-REQ-029` names runtime evidence without assigning it an exact sole producer or explicit dependency path to `SURS3-REQ-026`; observer/acquisition authority and the exact provider-response evidence edge are also not total.

6.2.3 `SURS3-REQ-030` gives directive, research and reconciliation events the same generic field-level patch shape without a closed event-type capability matrix; this leaves room for non-authoritative research or reconciliation evidence to mutate authoritative current fields.

## 6.3 Archive, replay and invalidation

6.3.1 erasure-safe replay is materially stronger than v2, but cryptographic key destruction is not tied to a complete storage-copy, replica, cache, backup, escrow and wrapping-key lineage, so an erasure proof can ignore another recoverable copy.

6.3.2 the trigger rule quantifies over every mutable authoritative field without first materializing a canonical versioned field registry; a missing field therefore also disappears from the trigger denominator.

6.3.3 archive, restore, erasure, invalidation and current-pointer publication require separate atomic contract identities; bundling them into broad rows obstructs minimal rework and exact producer ownership.

# 7. Acceptance and two-generation analysis

## 7.1 Terminal and oracle defects

7.1.1 `SURS3-REQ-003` requires a future TerminalRegistry, but no finite terminal-record root is supplied to the 70-test manifest.

7.1.2 `SURS3-CONF-032` assigns `D31-LOCATOR-BLOCKED` as the row failure terminal even though the requirement's valid negative causes include authority, custody, unsafe-content, amendment-conflict and authority-conflict terminals; one fallback terminal cannot prove the total table.

7.1.3 `SURS3-MUT-020` tests only removal or ambiguity of a mapping and supplies no canonical cause/axis/capability-effect output bytes.

## 7.2 Independence and review lifecycle

7.2.1 `non-collusion limits` and `prohibited dependency` are not closed typed relations; owner, employer, team, repository, transitive library, model/provider and execution-infrastructure correlation can be classified differently by eligible evaluators.

7.2.2 `SURS3-REQ-046` bundles Producer QA, two hostile reviews, reconciliation, veto, Acceptance, two generations, stale receipt handling and replay into one row without a complete state machine, event ordering, quorum, veto precedence, appeal/revocation or protected current-pointer transition.

7.2.3 an externally accepted review protocol may supply generic lifecycle rules, but v3 does not state the exact mapping from those protocol types to the source-universe-specific envelopes and gates.

## 7.3 Controlled generations

7.3.1 the generation table contains no exact Generation-A subject/input roots, Generation-B subject/input roots, Delta target locator, canonical Delta bytes, expected affected member IDs or expected output roots.

7.3.2 `rootB != rootA` and `affected set equals exact oracle` are assertions about unknown future values, not frozen expected oracles.

7.3.3 the current subject cannot receive two-generation Acceptance merely because four generic IDs exist; an immutable successor with a frozen GenerationPair vector is required.

# 8. Positive results preserved

## 8.1 Material improvements over v2

8.1.1 exact requirement identity and five-field structure are complete and mechanically clean.

8.1.2 all named upstream physical files and full roots in the SourceReferenceIndex match the local bytes.

8.1.3 D31 now has a portable repository-relative source path, exact raw root, exact line span, exact span root and matching line/byte counts.

8.1.4 the printed dependency graph is syntactically topological and has no unknown, duplicate, self or forward edge.

8.1.5 provider-independent Bootstrap, pre-admission custody, orthogonal state axes, residual uncertainty, SourceSet membership, Public unknown-sink blocking, erasure-safe replay and fenced publication are materially better requirement directions than v2.

8.1.6 current status counters remain honest: `0/46` requirements accepted, `0/70` tests executed and accepted, Gate29 blocked and the development freeze active.

# 9. Finding counters and verdict

## 9.1 Reviewer-local counters

9.1.1 total Findings=`24`.

9.1.2 P0=`12`.

9.1.3 P1=`12`.

9.1.4 P2=`0`.

9.1.5 P3=`0`.

9.1.6 open=`24/24`; closed=`0/24`; reconciled=`0/24`; suppressed=`0/24`; risk-accepted=`0/24`; merged=`0/24`.

## 9.2 Verdict

9.2.1 reviewer verdict=`REJECT AS DEFINITION-ACCEPTANCE-READY; IMMUTABLE SUCCESSOR REQUIRED`.

9.2.2 acceptance terminal=`REVIEW-BLOCKED`.

9.2.3 the subject is a materially improved requirements seed, but it cannot yet prove literal source-reference completeness, semantic DAG closure, pre-egress Public safety, lossless v2 preservation, executable conformance, total terminal behavior, complete egress discovery or controlled two-generation Acceptance.

9.2.4 the safe next action is to preserve these exact roots, reconcile all 24 reviewer-local Findings under an accepted protocol, create an immutable v4 successor plus exact SourceReferenceIndex and executable test roots, then perform a new review without using Producer QA as closure authority.

9.2.5 no Product/Git/Build/test/Push/Deploy/provider/account/credential action is authorized by this verdict.

9.2.6 exact Product completion percentage, remaining hours and ETA remain `unknown/unavailable`.

9.2.7 Gate29=`BLOCKED`; development freeze=`ACTIVE`; repository visibility=`Public`.
