# 1. Connect — Source-universe and custody successor requirements v2 hostile-review findings manifest

## 1.1 Manifest identity

1.1.1 `artifactId=CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29`.

1.1.2 `reviewId=SURS2-HR-2026-08-29`.

1.1.3 subject path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-2026-08-29.md`.

1.1.4 binding subject SHA-256=`5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe`.

1.1.5 review report path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-independent-hostile-review-2026-08-29.md`.

1.1.6 binding review-report SHA-256=`59f83f8d68439c404a10857bcd18535bbc826f12eb7c3e0da06106d7e6d4a923`.

1.1.7 review boundary=`planning artifact only; no Product code, Git mutation, Build, Push, Deploy, provider, credential, account or external-state mutation`.

1.1.8 independence statement=`the reviewer did not read or use the Producer-QA artifact and did not modify the subject`.

1.1.9 manifest status=`RAW REVIEWER-LOCAL FINDINGS; NOT RECONCILED; NOT ACCEPTED`.

## 1.2 Finding schema

1.2.1 every Finding contains one unique ID, reviewer-local severity, exact subject locator, defect, impact, remediation requirement, deterministic acceptance predicate and affected predecessor mappings.

1.2.2 severities and closures remain reviewer-local until an accepted review protocol reconciles them.

# 2. Findings

## 2.1 `SURS2-HR-F001` — Frozen SourceReferenceIndex is absent

2.1.1 severity=`P0`.

2.1.2 exactSubjectLocator=`1.2.3 at line 23; every sourceIds field in SURS-001..SURS-026 at lines 33–341; SURS-023 at 6.3.3–6.3.4, lines 305–307; 7.2.2, line 359; 8.1.1, line 427`.

2.1.3 defect=`the subject requires a future SourceReferenceIndex but supplies no index artifact or root; 124 source-token occurrences and 88 unique tokens therefore have no exact artifact/root/locator/bounded-claim resolution or inverse readback`.

2.1.4 impact=`the subject cannot prove which exact upstream bytes any requirement consumes; a dangling, ambiguous, stale or spoofed token can survive, and SURS-HR-F002 remains materially present`.

2.1.5 remediationRequirement=`materialize one immutable SourceReferenceIndex and inverse index as inputs to the successor; each token occurrence must bind namespace, artifactId, full SHA-256, media locator, bounded claim, authority/evidence role and originating SURS row; unsupported or unavailable references must be explicit blocking records`.

2.1.6 acceptancePredicate=`two independent resolvers over the frozen successor and index return identical 124 occurrence records and 88 unique target identities; unresolved, ambiguous, stale-root, inverse-missing, cross-snapshot and claim-out-of-bounds counts all equal zero; removing or changing one index edge returns SOURCE-REFERENCE-BLOCKED`.

2.1.7 affectedPredecessorMappings=`SURS-HR-F002 directly; every SURS-HR-F001..F032 evidentiary-closure claim indirectly`.

## 2.2 `SURS2-HR-F002` — Finite discovery frontier is not closed against outside edges

2.2.1 severity=`P0`.

2.2.2 exactSubjectLocator=`SURS-001 at 2.1.1 and 2.1.4, lines 29 and 35; 7.2.1, line 357`.

2.2.3 defect=`finite inputs, grammar, depth and cutoff are named, but no canonical frontier record, visited-edge identity, external-observation budget, pagination/continuation rule, mutation-during-discovery rule or proof that every eligible root is seeded is required; the mutation “add one unvisited eligible edge” only tests edges already declared eligible by the policy under test`.

2.2.4 impact=`two discoverers can agree perfectly on the same incomplete seed/frontier and claim completeness; dynamic or paginated sources can grow past the cutoff without an exact incomplete-member record`.

2.2.5 remediationRequirement=`require a finite content-addressed frontier ledger with seed-authority proof, canonical edge identity/order, page/continuation state, per-family limits, observation-window semantics and one terminal record for every unvisited edge; distinguish COMPLETE from BOUNDED-INCOMPLETE and POLICY-EXCLUDED`.

2.2.6 acceptancePredicate=`independent discovery from the exact seed/root produces identical frontier, visited, excluded and blocked sets; a real eligible root omitted from the seed, a continuation page withheld, a source mutated during traversal or a limit reached makes COMPLETE impossible and yields DISCOVERY-INCOMPLETE-BLOCKED with the exact affected frontier`.

2.2.7 affectedPredecessorMappings=`SURS-HR-F001`.

## 2.3 `SURS2-HR-F003` — Syntactic DAG hides semantic dependency cycles

2.3.1 severity=`P0`.

2.3.2 exactSubjectLocator=`SURS-008 at 3.2.1/3.2.5, lines 115/123; SURS-009 at 3.3.1/3.3.5, lines 127/135; SURS-016 at 5.1.1/5.1.5, lines 215/223; SURS-017 at 5.2.1/5.2.5, lines 227/235; SURS-018 at 5.3.1/5.3.5, lines 239/247; SURS-022 at 6.2.1/6.2.5, lines 289/297; SURS-023 at 6.3.1/6.3.5, lines 301/309; SURS-024 at 6.4.1/6.4.5, lines 313/321; SURS-025 at 6.5.1/6.5.5, lines 325/333`.

2.3.3 defect=`the declared graph has 26 nodes, 74 edges and zero syntactic cycles, but rules consume undeclared later producers: admission consumes custody/locator/selection; custody declares admission as predecessor; provider receipts consume Approval while Approval declares provider receipts as predecessor; denominators consume CandidateSet root while SourceSet root declares denominators as predecessor; invalidation consumes later Decision/provider/approval/locator types without their dependencies`.

2.3.4 impact=`a topological executor can mark a row Ready before its normative type exists, while a correct semantic executor deadlocks on hidden cycles; review and schedule order are therefore not reproducible`.

2.3.5 remediationRequirement=`construct a typed producer-consumer inventory from every noun, state, schema, algorithm, registry and Evidence object in all 26 rows; split bootstrap identity/custody/approval/root primitives from operational records; regenerate the dependency DAG from that inventory and prohibit undeclared forward consumption`.

2.3.6 acceptancePredicate=`two independent dependency extractors return the same node/edge graph; every consumed type has exactly one earlier producer or exact external rooted input; syntactic and semantic graphs are identical, topologically sortable and cycle-free; deleting one required edge fails DEPENDENCY-CLOSURE-BLOCKED`.

2.3.7 affectedPredecessorMappings=`SURS-HR-F007; F008; F016; F018; F019; F025; F028; F029; F031`.

## 2.4 `SURS2-HR-F004` — Git/worktree/LFS identity omits hostile repository states

2.4.1 severity=`P1`.

2.4.2 exactSubjectLocator=`SURS-004 at 2.4.1–2.4.4, lines 65–71; SURS-015 at 4.4.1–4.4.4, lines 201–207; 7.2.4 and 7.2.15, lines 363 and 385`.

2.4.3 defect=`the lists omit shallow and partial/promisor clones, alternates, replace refs/grafts, missing/corrupt objects, nested repositories, .git file indirection details, attributes and clean/smudge/filter-process behavior, end-of-line/working-tree conversion, global/info excludes, submodule object availability and authenticated LFS-object retrieval`.

2.4.4 impact=`the same apparent commit/overlay can resolve to different or unavailable bytes, trigger network through filters/LFS, omit nested history or accept a pointer whose content was never verified`.

2.4.5 remediationRequirement=`extend GitRepositoryIdentity/GitSnapshot/WorkingTreeOverlay with every listed state, exact effective Git config/attributes/excludes, object-availability map, submodule repository identity and LFS pointer-to-object/root/auth observation; no filter or object fetch may run implicitly`.

2.4.6 acceptancePredicate=`independent offline readers over rooted real-repository-derived fixtures reconstruct identical objects, modes, overlay bytes and unavailable terminals for every state; any missing object, unapproved filter/network action, unresolved submodule/LFS object or replace/alternate ambiguity yields GIT-SNAPSHOT-BLOCKED`.

2.4.7 affectedPredecessorMappings=`SURS-HR-F004; SURS-HR-F015`.

## 2.5 `SURS2-HR-F005` — Family and exclusion completeness are not derived

2.5.1 severity=`P1`.

2.5.2 exactSubjectLocator=`SURS-005 at 2.5.1–2.5.4, lines 77–83; SURS-006 at 2.6.1–2.6.4, lines 89–95; SURS-014 at 4.3.1, line 189; SURS-022 at 6.2.1, line 289`.

2.5.3 defect=`the extensible family registry is enumerated manually and is not required to be the exact union of admitted media profiles, implementation loaders, external/provider inputs, egress sinks and archive DataClasses; exclusions are not required to reconcile Git ignore/attributes, nested repositories, generated-authority provenance and quarantined Secret/credential-bearing candidates`.

2.5.4 impact=`a source kind can exist in another accepted registry yet remain outside the discovery-family denominator, or a source-like ignored/generated item can be excluded before its authority/safety disposition exists`.

2.5.5 remediationRequirement=`derive and root family coverage equations from every admitted locator, loader, provider, Decision, egress and DataClass registry; require an explicit include/exclude/quarantine record for every CandidateSet member and every effective ignore/exclusion rule`.

2.5.6 acceptancePredicate=`the union of derived family members plus UNKNOWN_FAMILY_QUARANTINED equals CandidateSet exactly; all registries have forward/inverse family coverage; adding a new admitted media/loader/sink/DataClass without a family mapping or excluding one source-like ignored member returns SOURCE-CLASSIFICATION-BLOCKED`.

2.5.7 affectedPredecessorMappings=`SURS-HR-F005; SURS-HR-F006; SURS-HR-F014; SURS-HR-F025`.

## 2.6 `SURS2-HR-F006` — Record identity can leak private material and immutable records carry mutable state

2.6.1 severity=`P1`.

2.6.2 exactSubjectLocator=`SURS-007 at 3.1.1/3.1.4, lines 103/109; SURS-008 at 3.2.1/3.2.4, lines 115/121; SURS-010 at 3.4.1–3.4.4, lines 139–145; SURS-023 at 6.3.1, line 301`.

2.6.3 defect=`the deterministic ID preimage may include private locator, ownership, provider or raw-root material without a separate Public projection, enabling dictionary/re-identification leakage; AdmittedSource is described as versioned/immutable yet embeds a “current selection-event root,” which is a mutable pointer rather than immutable event history`.

2.6.4 impact=`Public IDs and manifests can expose or correlate private sources even when content is redacted, and two readers can disagree whether an AdmittedSource version mutates or a successor record is required`.

2.6.5 remediationRequirement=`separate private stable identity from Public-safe opaque projection with rooted non-reidentification policy; keep immutable records bound only to event roots that existed at creation and materialize current state in a separate derived snapshot/current-pointer record`.

2.6.6 acceptancePredicate=`a Public projection contains no private locator/owner/provider/raw-root value or deterministically recoverable equivalent under the approved adversarial corpus; replaying later selection events leaves prior record bytes unchanged and deterministically produces one successor/current-state root`.

2.6.7 affectedPredecessorMappings=`SURS-HR-F007; SURS-HR-F010; SURS-HR-F023; SURS-HR-F026`.

## 2.7 `SURS2-HR-F007` — Admission, custody and state-axis semantics are circular

2.7.1 severity=`P0`.

2.7.2 exactSubjectLocator=`SURS-008 at 3.2.1–3.2.5, lines 115–123; SURS-009 at 3.3.1–3.3.5, lines 127–135; SURS-021 at 6.1.1–6.1.5, lines 277–285; 7.2.7–7.2.8 and 7.2.23, lines 369–371 and 401`.

2.7.3 defect=`AdmittedSource requires custody and an authorized current selection event, but custody is defined only by SURS-009 after SURS-008 and SURS-009 depends on SURS-008; the acceptance text also allows missing authority/custody to remain AUTHORITY_UNKNOWN “or quarantined,” conflating selection/authority with SafetyState and allowing an apparently admitted unresolved record`.

2.7.4 impact=`an external source cannot acquire pre-admission custody without an admitted record, or can be called admitted before authority/custody exists; identical causes may change different axes and yield different capability decisions`.

2.7.5 remediationRequirement=`split pre-admission RawCustodyCandidate from post-selection AdmittedSource; require verified custody, exact authority and eligible SelectionAssertion before ADMITTED; map missing authority to Selection/Authority state and unsafe content to SafetyState without substituting one for the other`.

2.7.6 acceptancePredicate=`a candidate can enter immutable custody before admission; no record reaches ADMITTED while custody or authority is Unknown; missing authority, missing custody and unsafe bytes each yield one distinct expected axis/terminal; all transition histories replay to identical roots`.

2.7.7 affectedPredecessorMappings=`SURS-HR-F007; SURS-HR-F008; SURS-HR-F021; SURS-HR-F023; SURS-HR-F024`.

## 2.8 `SURS2-HR-F008` — PublicEgressSurface is neither complete nor bounded

2.8.1 severity=`P0`.

2.8.2 exactSubjectLocator=`SURS-010 at 3.4.1–3.4.4, lines 139–145; SURS-017 at 5.2.1–5.2.4, lines 227–233; SURS-025 at 6.5.1–6.5.4, lines 325–331; 7.2.9–7.2.10, lines 373–375`.

2.8.3 defect=`the surface list omits or does not derive actual GitHub Discussions/Wiki/Pages/check annotations/job summaries/SARIF/security alerts/webhooks/apps/Codespaces, container images/layers/registries, SBOM/provenance attestations, deployment-provider build/runtime logs and UIs, telemetry/APM/error traces, object-storage/CDN/browser/source-map/service-worker caches, DNS/certificate metadata, backup copies and AI-assistant prompts/telemetry; no Unknown-sink or post-egress incident/revocation state exists`.

2.8.4 impact=`Secret, PII, customer, provider or proprietary bytes/metadata can leave quarantine through a sink outside the hand-written list; “zero prohibited objects” can overclaim certainty across inaccessible forks/history or detector false negatives`.

2.8.5 remediationRequirement=`derive a rooted source-to-transform-to-egress graph from actual repository, CI, deployment, observability, storage and collaboration configuration; inventory private and Public sinks, detector coverage/limitations and irreversible external copies; add UNKNOWN_EGRESS_BLOCKED and post-egress incident/revocation/credential-rotation terminals`.

2.8.6 acceptancePredicate=`every configured or observed sink has one classified graph node and policy; the rooted corpus reaches every accessible sink and is blocked before egress; unconfigured/unknown/inaccessible coverage cannot report zero and returns UNKNOWN_EGRESS_BLOCKED; a simulated detection-after-egress produces the exact incident, revocation and rotation evidence without exposing prohibited bytes`.

2.8.7 affectedPredecessorMappings=`SURS-HR-F009; SURS-HR-F010; SURS-HR-F018; SURS-HR-F029`.

## 2.9 `SURS2-HR-F009` — Hostile ingestion does not close recursive control-data boundaries

2.9.1 severity=`P0`.

2.9.2 exactSubjectLocator=`SURS-011 at 3.5.1–3.5.4, lines 151–157; SURS-012 at 4.1.1–4.1.4, lines 165–171; SURS-016 at 5.1.1–5.1.4, lines 215–221; 7.2.11, line 377`.

2.9.3 defect=`no normative rule keeps every fetched, decoded, extracted, OCR, archive-member and model-derived value in untrusted-data state through recursive processing; safe fetch lacks per-hop scheme/port/private-link-local/IPv4/IPv6/DNS-rebinding/cloud-metadata rules and streaming byte limits; scanner stale/unavailable/error/encrypted-content states and redacted quarantine logging are absent`.

2.9.4 impact=`nested content or a derived prompt can regain control authority, a fetch can cross to an internal address after resolution/redirect, an unavailable scanner can default allow, or quarantine Evidence can leak the same prohibited payload`.

2.9.5 remediationRequirement=`define a recursive content graph and taint/control policy from acquisition through every derivative; define per-hop fetch validation and re-resolution, bounded streaming, nested-depth/member/ratio limits, scanner-version/freshness/error/encrypted terminals and metadata-only/redacted failure Evidence`.

2.9.6 acceptancePredicate=`the rooted hostile corpus traverses every acquisition/derivative path without producing tool instructions, authority changes, internal/network access, filesystem escape, unbounded output or prohibited log bytes; DNS/redirect rebind, nested archive, stale/unavailable scanner and encrypted content each reach one exact quarantine terminal`.

2.9.7 affectedPredecessorMappings=`SURS-HR-F011; SURS-HR-F012; SURS-HR-F013; SURS-HR-F016`.

## 2.10 `SURS2-HR-F010` — Locator and mixed-loader registries have no coverage closure

2.10.1 severity=`P1`.

2.10.2 exactSubjectLocator=`SURS-013 at 4.2.1–4.2.4, lines 177–183; SURS-014 at 4.3.1–4.3.4, lines 189–195; SURS-005 at 2.5.1–2.5.4, lines 77–83; 7.2.12–7.2.14, lines 379–383`.

2.10.3 defect=`the subject does not require exact equations proving that every admitted media extension has one supported locator profile and every executable/deployed entry has one loader; runtime entry inventory omits explicit container/buildpack/Procfile, infrastructure-as-code, scheduler/cron/queue/webhook, database trigger/function, service-worker/WASM/native-addon and provider-generated entry classes; shared-parser and OCR-confidence rejection are deferred but not linked`.

2.10.4 impact=`two engines can agree on a complete graph for the registry they were given while an admitted format or executable entry remains outside that registry and its Client/Server/Secret boundary`.

2.10.5 remediationRequirement=`derive locator and loader coverage sets from CandidateSet families, package/build/deploy/runtime manifests and observed provider entries; publish total forward/inverse equations, explicit unsupported records, parser-family independence and confidence/ambiguity rules`.

2.10.6 acceptancePredicate=`every admitted source resolves to exactly one compatible locator profile or blocking unsupported state; every observed executable/deployed entry resolves to exactly one loader and full transitive graph; injecting one admitted extension or runtime entry without mapping yields SOURCE-LOCATOR-BLOCKED or IMPLEMENTATION-GRAPH-BLOCKED`.

2.10.7 affectedPredecessorMappings=`SURS-HR-F005; SURS-HR-F012; SURS-HR-F013; SURS-HR-F014`.

## 2.11 `SURS2-HR-F011` — Dynamic-source freshness overclaims unseen-change knowledge

2.11.1 severity=`P0`.

2.11.2 exactSubjectLocator=`SURS-016 at 5.1.1–5.1.5, lines 215–223; SURS-024 at 6.4.1–6.4.5, lines 313–321; 7.2.16–7.2.17, lines 387–389`.

2.11.3 defect=`SURS-016 consumes approved publisher authority, safe fetching, Public-safe request/log handling and lifecycle invalidation without dependencies on SURS-010/SURS-011/SURS-018/SURS-024; Grace capability semantics and 304-to-prior-object linkage are absent; an “unseen change” cannot be detected from a failed or absent observation and therefore cannot be an executable oracle`.

2.11.4 impact=`stale or wrong-publisher data may retain capability during Grace/failed refresh, authenticated headers may leak, and a test can falsely claim it proved no unseen upstream change`.

2.11.5 remediationRequirement=`bind every observation to approved publisher Appointment, safe-fetch and Public-log policies, prior cache object/validator and invalidation graph; define per-claim maximum reliance interval and capability behavior for Fresh/Grace/Stale/Unavailable; describe unseen change as residual uncertainty, never as observed fact`.

2.11.6 acceptancePredicate=`two independent evaluators agree on all response/clock/cache states; Grace enables only capabilities explicitly allowed by the rooted policy; a failed refresh or expired reliance interval blocks; 304 without matching prior root blocks; no test claims discovery of a change absent authenticated new bytes/event and residual uncertainty is reported`.

2.11.7 affectedPredecessorMappings=`SURS-HR-F016; SURS-HR-F017; SURS-HR-F018; SURS-HR-F028; SURS-HR-F032`.

## 2.12 `SURS2-HR-F012` — Provider entitlement and Approval form a bootstrap cycle

2.12.1 severity=`P0`.

2.12.2 exactSubjectLocator=`SURS-017 at 5.2.1 and 5.2.5, lines 227 and 235; SURS-018 at 5.3.1 and 5.3.5, lines 239 and 247; SURS-019 at 5.4.1 and 5.4.5, lines 251 and 259`.

2.12.3 defect=`ProviderReceipt includes legal Approval but Approval depends on ProviderReceipt; general Person/Role/Appointment authority therefore cannot be established until a provider receipt exists, while that receipt cannot be valid until authority exists; Decision actor authority also consumes the missing bootstrap trust root without declaring SURS-018`.

2.12.4 impact=`an unauthorized actor may self-bootstrap provider/legal approval, or all provider/Decision evidence remains permanently blocked despite valid organizational appointments`.

2.12.5 remediationRequirement=`define a provider-independent bootstrap Identity/Role/Appointment trust-root input and Approval schema before provider receipts; make provider entitlement consume that approval; make Decision selection consume the same actor authority; keep provider account observations unable to create their own approver authority`.

2.12.6 acceptancePredicate=`the regenerated semantic DAG is acyclic; an eligible pre-existing Appointment can approve a provider receipt, while a receipt alone can never create or widen Appointment authority; self, wrong-scope, expired, revoked and missing-bootstrap fixtures all block deterministically`.

2.12.7 affectedPredecessorMappings=`SURS-HR-F018; SURS-HR-F019; SURS-HR-F020`.

## 2.13 `SURS2-HR-F013` — D31 locator and terminal remain non-executable

2.13.1 severity=`P0`.

2.13.2 exactSubjectLocator=`SURS-020 at 5.5.1–5.5.5, lines 263–271; 7.2.21–7.2.22, lines 397–399`.

2.13.3 defect=`the raw root and portable candidate ID are present, but “canonical repository/custody-relative locator and exact Decision span” are not populated; the independently observed matching file is web/docs/postgresql-runtime-role-decision.md, yet the subject gives no exact span; missing authority, unresolved amendment and conflict map to an unordered three-terminal phrase rather than one cause-to-state rule`.

2.13.4 impact=`a clean-room resolver cannot execute the predicate from subject bytes alone, and two selectors can assign AUTHORITY_UNKNOWN, QUARANTINED or CONFLICT_BLOCKED differently for the same evidence`.

2.13.5 remediationRequirement=`materialize the repository/custody-relative source identity, raw-root profile and exact media locator for the D31 decision claim; define one total table mapping missing authority, unsafe content, missing custody, amendment conflict and subject conflict to their orthogonal state axes and exact terminal IDs`.

2.13.6 acceptancePredicate=`a clean-room resolver using only frozen inputs resolves the exact D31 claim bytes/root at the portable locator; moving the file preserves source identity through an explicit event while changing span bytes invalidates it; each failure cause returns exactly one expected axis transition and terminal`.

2.13.7 affectedPredecessorMappings=`SURS-HR-F021; SURS-HR-F022; SURS-HR-F023`.

## 2.14 `SURS2-HR-F014` — “Minimally conservative” disagreement scope has no oracle

2.14.1 severity=`P1`.

2.14.2 exactSubjectLocator=`SURS-021 at 6.1.1/6.1.4, lines 277/283; SURS-024 at 6.4.1/6.4.4, lines 313/319; 7.2.24 and 7.2.28, lines 403 and 411`.

2.14.3 defect=`the subject does not define the partial order, safety closure, direction, edge semantics or proof by which one affected-claim set is minimally conservative; agreement between two engines is not correctness when both can over-block or under-block against no exact expected set`.

2.14.4 impact=`a disagreement can block the whole Program indefinitely or leave unsafe dependent claims active while satisfying byte-identical engine parity`.

2.14.5 remediationRequirement=`define typed claim-edge direction, reachability, strongly connected component handling, safety-closure operator, minimality order and exact oracle sets for every rooted graph case; distinguish conservative Unknown from proven minimality`.

2.14.6 acceptancePredicate=`for every rooted trigger/disagreement graph, each engine output equals the exact oracle affected set; removing one required member violates closure, adding one unrelated member violates minimality, and unknown/missing-edge cases reach SOURCE-INVALIDATION-BLOCKED rather than claiming minimality`.

2.14.7 affectedPredecessorMappings=`SURS-HR-F024; SURS-HR-F028`.

## 2.15 `SURS2-HR-F015` — Denominator projections and CandidateSet root are ambiguous

2.15.1 severity=`P1`.

2.15.2 exactSubjectLocator=`SURS-005 at 2.5.4, line 83; SURS-022 at 6.2.1–6.2.5, lines 289–297; SURS-023 at 6.3.1/6.3.5, lines 301/309; 7.2.25–7.2.26, lines 405–407`.

2.15.3 defect=`family classification permits one primary family and secondary tags, but SURS-022 does not state whether the family denominator projects primary membership only or all tags; “global union” does not identify which dimension's union is meant; SURS-022 consumes a CandidateSet snapshot root whose canonical production is deferred to SURS-023, while SURS-023 depends on SURS-022`.

2.15.4 impact=`valid implementations can produce different family counts and roots, and denominator/root construction has a semantic cycle even though the declared graph is acyclic`.

2.15.5 remediationRequirement=`define CandidateSet canonicalization before projections; publish one equation per dimension, primary-family partition, secondary-tag overlapping projection, Unknown partition and global CandidateSet equality without mixing dimensions`.

2.15.6 acceptancePredicate=`two independent evaluators reconstruct identical CandidateSet bytes/root and member-level projections; primary-family sets are disjoint and union to CandidateSet, secondary-tag sets may overlap but never change global cardinality, and every dimension has an explicit complete equation`.

2.15.7 affectedPredecessorMappings=`SURS-HR-F005; SURS-HR-F025; SURS-HR-F026`.

## 2.16 `SURS2-HR-F016` — SourceSet membership and relation cardinalities are not normative

2.16.1 severity=`P0`.

2.16.2 exactSubjectLocator=`SURS-023 at 6.3.1–6.3.5, lines 301–309; Section 1.2.3, line 23; SURS-021 at 6.1.1, line 277; 7.2.2 and 7.2.26–7.2.27, lines 359 and 407–409`.

2.16.3 defect=`SourceSet is not explicitly defined as CandidateSet, admitted-only set or a typed multi-set of both; relation types and exact cardinalities are named collectively but not enumerated; “every source token resolves exactly once” depends on the absent SourceReferenceIndex and does not specify lawful many-requirements-to-one-source references`.

2.16.4 impact=`an excluded/quarantined candidate may disappear, an admitted source may lack provenance/selection, or repeated legitimate references may be rejected/duplicated while both canonicalizers satisfy the prose`.

2.16.5 remediationRequirement=`publish exact CandidateSet and AdmittedSourceSet membership equations, one relation registry with source/target types and min/max cardinality, total candidate-to-current-state relation, lawful many-to-one reference semantics and SourceReferenceIndex integration before SourceSet hashing`.

2.16.6 acceptancePredicate=`independent canonicalizers/walkers produce identical bytes/nodes/edges and exact per-relation counts; every Candidate has one current state, every admitted record has required custody/authority/selection edges, every claim has one locator target while multiple claims may lawfully share a source, and every mutation reaches the defined closure terminal`.

2.16.7 affectedPredecessorMappings=`SURS-HR-F002; SURS-HR-F023; SURS-HR-F025; SURS-HR-F026; SURS-HR-F027`.

## 2.17 `SURS2-HR-F017` — Invalidation lacks closed triggers and implementable atomicity

2.17.1 severity=`P0`.

2.17.2 exactSubjectLocator=`SURS-024 at 6.4.1–6.4.5, lines 313–321; SURS-016 at 5.1.1, line 215; SURS-017 at 5.2.1/5.2.5, lines 227/235; SURS-019 at 5.4.1, line 251; SURS-025 at 6.5.1, line 325; 7.2.28, line 411`.

2.17.3 defect=`the trigger registry omits schema/algorithm/policy/test-oracle/reviewer-eligibility/security-advisory/scanner-version/retention-Hold/key/region changes and does not bind triggers to exact typed edges; “atomic successor/current-pointer transaction” spans content stores, custody, Git and acceptance state without failure, fencing, retry or reconciliation semantics; immutable history is unqualified against mandatory deletion`.

2.17.4 impact=`stale accepted work can remain current after a material control change, concurrent writers can expose mixed generations, or deletion can be violated by an immutable record containing protected bytes`.

2.17.5 remediationRequirement=`derive the trigger registry from every versioned field and external lifecycle; define exact trigger-to-edge traversal; specify one transactional boundary plus outbox/fencing/idempotency/reconciliation for other stores; separate immutable non-sensitive event metadata from erasable/encrypted protected payload references`.

2.17.6 acceptancePredicate=`every mutable authoritative field has at least one trigger and inverse dependency edge; two engines match exact oracle closure; crash/retry/concurrent-writer tests expose either the old complete generation or the new complete generation, never mixed current state; deletion/Hold tests preserve only policy-permitted history`.

2.17.7 affectedPredecessorMappings=`SURS-HR-F016; SURS-HR-F018; SURS-HR-F024; SURS-HR-F028; SURS-HR-F029; SURS-HR-F031`.

## 2.18 `SURS2-HR-F018` — Archive/replay does not reconcile erasure and hidden dependencies

2.18.1 severity=`P1`.

2.18.2 exactSubjectLocator=`SURS-025 at 6.5.1–6.5.5, lines 325–333; SURS-009 at 3.3.1, line 127; SURS-013 at 4.2.1, line 177; SURS-021 at 6.1.1, line 277; SURS-024 at 6.4.1, line 313; SURS-026 at 6.6.1, line 337`.

2.18.3 defect=`SURS-025 consumes custody, locator, selection/conflict, invalidation, review and acceptance records but declares only SURS-010/SURS-012/SURS-023 dependencies; it does not say how exact replay works after required source erasure, cryptographic erasure or key destruction, nor how a restored old Acceptance is prevented from becoming current`.

2.18.4 impact=`restore can resurrect deleted private bytes or stale Acceptance, or replay can be declared impossible globally when only one claim-scoped protected payload was lawfully erased`.

2.18.5 remediationRequirement=`declare every archive producer dependency; define per-DataClass event-metadata versus protected-payload retention, tombstone/erasure proof, key-destruction semantics, restored-generation quarantine and mandatory revalidation/invalidation before any current pointer`.

2.18.6 acceptancePredicate=`restore reconstructs exact permitted roots only; erased non-held payload remains unrecoverable while its non-sensitive tombstone proves scoped absence; no restored Acceptance becomes current without fresh exact-root validation; missing protected bytes block exactly the inverse dependency closure`.

2.18.7 affectedPredecessorMappings=`SURS-HR-F008; SURS-HR-F009; SURS-HR-F027; SURS-HR-F028; SURS-HR-F029`.

## 2.19 `SURS2-HR-F019` — Independence matrix and finite test root are incomplete

2.19.1 severity=`P1`.

2.19.2 exactSubjectLocator=`SURS-026 at 6.6.1–6.6.5, lines 337–345; dual-evaluator predicates in SURS-003/004/006/007/013/014/016/018/019/021/024, lines 53–319; 7.2.30–7.2.31, lines 415–417; 8.1.1, line 427`.

2.19.3 defect=`the independence matrix explicitly lists discoverers, SourceSet canonicalizers/walkers and structural/security reviewers but omits precedence evaluators, Git readers, exclusion classifiers, record serializers, locator resolvers, loader graph engines, dynamic-source evaluators, Approval/Decision reducers, disagreement walkers and invalidation engines that other rows require in pairs; no finite test/mutation manifest root or accepted reviewer protocol is supplied`.

2.19.4 impact=`correlated implementations can satisfy nominal “two engine” predicates, required tests can change between runs, and an Acceptance signer has no complete eligibility/coverage input`.

2.19.5 remediationRequirement=`derive the independence matrix from every acceptancePredicate requiring multiple evaluators; bind implementation/library/owner/envelope/non-collusion fields for each role; materialize a finite immutable test/mutation/oracle manifest and accepted review protocol before Acceptance`.

2.19.6 acceptancePredicate=`every dual-run predicate has two eligible non-correlated envelopes and exact shared subject/test roots; all required test IDs are immutable and pass; removing one role/test or sharing a prohibited dependency yields SOURCE-ACCEPTANCE-BLOCKED; open P0/P1/P2 remains zero`.

2.19.7 affectedPredecessorMappings=`SURS-HR-F003; F004; F006; F007; F013; F014; F016; F019; F020; F024; F028; F030; F031`.

## 2.20 `SURS2-HR-F020` — Safe terminals are prose, not a total normative registry

2.20.1 severity=`P1`.

2.20.2 exactSubjectLocator=`7.2.1–7.2.32, lines 357–419; SURS-020 at 5.5.4, line 269; SURS-026 at 6.6.4, line 343`.

2.20.3 defect=`32 distinct terminal text values are listed only in the crosswalk; no TerminalRegistry defines terminal ID, owning state axis, cause code, retryability, capability effect, disclosure-safe payload, transition or precedence; many row predicates merely say blocks/Unknown/quarantined/OFF, and F021 uses three alternatives in one terminal field`.

2.20.4 impact=`two implementations can return different terminal identifiers or state axes for the same failure while both satisfy the prose, breaking exact oracle comparison and safe capability gating`.

2.20.5 remediationRequirement=`publish a closed rooted TerminalRegistry and total cause-to-terminal/state-axis table; every acceptance predicate and crosswalk vector must reference one exact terminal ID or an explicitly ordered compound transition with no free-text alternative`.

2.20.6 acceptancePredicate=`every negative vector resolves to exactly one allowed terminal record with identical canonical bytes under two evaluators; terminal ID coverage is total, unused/undefined/ambiguous terminal counts equal zero, and changing cause or state axis changes the expected terminal deterministically`.

2.20.7 affectedPredecessorMappings=`SURS-HR-F001..F032 terminal/evidentiary closure; especially F021, F023, F024, F028, F030 and F031`.

# 3. Counters and verdict

## 3.1 Mechanical counters

3.1.1 subject requirement rows=`26/26 present`.

3.1.2 five-field instances=`130/130 present`.

3.1.3 numbered clauses=`180 total; 180 unique; 0 duplicate`.

3.1.4 declared dependency graph=`26 nodes; 74 edges; 0 syntactic dangling IDs; 0 syntactic cycles`.

3.1.5 semantic dependency closure=`FAIL`.

3.1.6 source-token occurrences=`124`; unique tokens=`88`; frozen-index-resolved=`0/88`.

3.1.7 predecessor mapping presence=`32/32`; requirement-translation adequacy=`FULL 26; PARTIAL 5; ABSENT 1`; evidentiary closure=`0/32`.

## 3.2 Finding counters

3.2.1 total findings=`20`.

3.2.2 P0=`11`.

3.2.3 P1=`9`.

3.2.4 P2=`0`.

3.2.5 P3=`0`.

3.2.6 open=`20/20`.

3.2.7 closed=`0/20`.

## 3.3 Verdict

3.3.1 reviewer verdict=`REJECT AS ACCEPTANCE-READY; SUCCESSOR REQUIRED`.

3.3.2 acceptance terminal=`REVIEW_BLOCKED`.

3.3.3 the exact subject remains a useful requirements seed but cannot prove self-traceability, finite source completeness, semantic DAG closure, full Public-egress safety, deterministic D31 handling, invalidation atomicity, replay safety or independent Acceptance.

3.3.4 Source-universe denominator, Product Requirement denominator, Program Task denominator, completion percentage, remaining hours and ETA remain `unknown/unavailable`.

3.3.5 Gate29=`BLOCKED`; development freeze=`ACTIVE`.

3.3.6 no finding is reconciled or closed by this reviewer-local manifest.

3.3.7 no Product/Git/Build/Push/Deploy/provider action is authorized.
