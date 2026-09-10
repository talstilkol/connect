# 1. Connect — Source-universe and custody requirements hostile-review findings manifest

## 1.1 Review identity

1.1.1 `artifactId=CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29`.

1.1.2 `reviewId=SURS-HR-2026-08-29`.

1.1.3 `reviewMode=INDEPENDENT-HOSTILE-PLANNING-REVIEW`.

1.1.4 subject path=`web/docs/planning/source-universe-and-custody-successor-requirements-2026-08-29.md`.

1.1.5 subject SHA-256=`f38b23aa130ad1c8ab4157e10e3de73160682d9c79e5decdf1e04c75fd696695`.

1.1.6 subject size=`359 lines; 20474 bytes`.

1.1.7 review boundary=`planning artifact only; no Product code, Git mutation, Build, Push, Deploy, provider, credential or external mutation`.

1.1.8 independence statement=`the review did not use a later Producer review as authority and did not modify the subject snapshot`.

1.1.9 manifest status=`RAW REVIEWER-LOCAL FINDINGS; NOT RECONCILED; NOT ACCEPTED`.

## 1.2 Finding schema

1.2.1 every finding below has one unique ID, one reviewer-local severity, exact subject location, defect, consequence, required fix and deterministic acceptance predicate.

1.2.2 severities are reviewer-local until an accepted review protocol and reconciliation process say otherwise.

# 2. Findings

## 2.1 `SURS-HR-F001`

2.1.1 severity=`P0`.

2.1.2 exactLocation=`2.1.1–2.1.5; 2.4.1–2.4.5; 2.5.1–2.5.5`.

2.1.3 defect=`SourceCandidateUniverse is defined as every discovered potential source, but the discovery seed set, recursion boundary, traversal depth, time/cutoff terminal and closed-world rule are not defined; the universe therefore depends on the discovery run that is supposed to prove it complete`.

2.1.4 consequence=`two conforming runs may return different universes while both satisfy the prose, so no exact source denominator or completeness claim can be accepted`.

2.1.5 requiredFix=`define a finite canonical DiscoveryInputSet, traversal grammar, URI-follow policy, repository and external boundaries, cutoff instant, terminal states and an Unknown/blocked rule for every incomplete traversal`.

2.1.6 acceptancePredicate=`two independently implemented discoverers receive the same frozen DiscoveryInputSet and policy roots and return byte-identical sorted candidate IDs and terminals; adding an unvisited eligible edge makes completeness fail`.

## 2.2 `SURS-HR-F002`

2.2.1 severity=`P0`.

2.2.2 exactLocation=`1.1.4; every sourceIds field in SURS-001–SURS-026`.

2.2.3 defect=`symbolic sourceIds are not bound by this artifact to an artifact ID, exact content root and exact locator; no source-reference resolver or inverse source-to-requirement index is required`.

2.2.4 consequence=`a missing, renamed, duplicated or stale upstream finding can remain apparently traced and coverage cannot be reconstructed from exact bytes`.

2.2.5 requiredFix=`define a frozen SourceReferenceIndex whose records bind namespace, source ID, artifact ID, exact root, locator and claim; require both requirement-to-source and source-to-requirement closure`.

2.2.6 acceptancePredicate=`resolving every literal sourceIds token yields exactly one existing rooted claim and inverse readback returns the originating SURS row; dangling, ambiguous, stale-root and inverse-missing counts are all zero`.

## 2.3 `SURS-HR-F003`

2.3.1 severity=`P0`.

2.3.2 exactLocation=`2.2.1–2.2.5; 2.3.1–2.3.5`.

2.3.3 defect=`authority classes A1–A6, evidence-role vocabulary, subject-key grammar, field-path canonicalization, scope identity, interval boundary semantics and conflict winner/block rules are not defined`.

2.3.4 consequence=`the same pair of claims can be admitted, rejected or considered non-overlapping by different selectors, including an unsafe recency-based override`.

2.3.5 requiredFix=`publish closed typed registries and a total precedence/conflict algorithm covering exact-subject equality, partial overlap, interval inclusivity, incomparable authorities and blocking Unknown`.

2.3.6 acceptancePredicate=`a rooted conformance corpus covering equal, disjoint, nested, partial, expired, future and ambiguous claims produces one byte-identical result under two independent evaluators; every incomparable case blocks`.

## 2.4 `SURS-HR-F004`

2.4.1 severity=`P0`.

2.4.2 exactLocation=`2.4.1–2.4.5; 4.4.1–4.4.5`.

2.4.3 defect=`Git/root identity omits canonical treatment of object format, repository common-dir versus worktree, index stages, deletions, file modes, symlinks, submodules, Git LFS pointers/objects, sparse checkout, ignored/untracked membership, Unicode/case collisions and remote-ref observation`.

2.4.4 consequence=`the claimed product snapshot and working-tree overlay may not be reconstructible or portable, and an unsafe file can be absent from the computed root`.

2.4.5 requiredFix=`define versioned GitSnapshot and WorkingTreeOverlay schemas and canonicalization for every listed state, with explicit unsupported terminals and distinct local/remote observations`.

2.4.6 acceptancePredicate=`two independent readers reconstruct identical membership, metadata and roots for a fixture corpus containing every listed Git state; each unsupported state returns a blocking terminal rather than omission`.

## 2.5 `SURS-HR-F005`

2.5.1 severity=`P1`.

2.5.2 exactLocation=`2.5.1–2.5.5`.

2.5.3 defect=`the discovery-family list does not define a closed registry or Unknown-family workflow and does not explicitly account for conversation directives, ticketing/collaboration records, deployed-state observations, live database/catalog evidence, package/license/security advisories or future media types`.

2.5.4 consequence=`a binding or risk-bearing source class can be silently outside every denominator despite the claim that no whitelist may exclude it`.

2.5.5 requiredFix=`create an extensible but rooted family registry, classifier precedence and UNKNOWN_FAMILY_QUARANTINED terminal, and explicitly decide each identified missing family`.

2.5.6 acceptancePredicate=`every candidate maps to exactly one primary family plus allowed secondary tags or to UNKNOWN_FAMILY_QUARANTINED; an injected unknown extension cannot be admitted or omitted silently`.

## 2.6 `SURS-HR-F006`

2.6.1 severity=`P1`.

2.6.2 exactLocation=`2.6.1–2.6.5`.

2.6.3 defect=`generated/cache/dependency exclusion has no deterministic classifier, precedence for authored files inside generated paths, symlink boundary rule, third-party evidence exception schema or package-license/security evidence disposition`.

2.6.4 consequence=`first-party authority may be discarded or derived/third-party bytes may be promoted inconsistently; public redistribution obligations may be missed`.

2.6.5 requiredFix=`define rooted exclusion predicates, ordered exception rules, origin/license metadata and fail-closed handling for ambiguous provenance or symlink escape`.

2.6.6 acceptancePredicate=`a rooted path/provenance corpus yields identical included/excluded/quarantined outcomes under two classifiers, with zero ambiguous silent exclusions and explicit license disposition for admitted third-party bytes`.

## 2.7 `SURS-HR-F007`

2.7.1 severity=`P0`.

2.7.2 exactLocation=`1.2.1–1.2.2; 3.1.1–3.1.5; 3.2.1–3.2.5`.

2.7.3 defect=`SourceCandidate and AdmittedSource records are prose lists without normative field types, required/null rules, closed vocabularies, canonical serialization, deterministic-ID derivation or root algorithm; typed Unknown is named but not defined`.

2.7.4 consequence=`record equality, duplicate detection, sorting, hashing, schema validation and acceptance are implementation-dependent`.

2.7.5 requiredFix=`publish versioned machine-readable schemas, enum registries, Unknown reason codes, canonical byte serialization, ID preimage and digest profile`.

2.7.6 acceptancePredicate=`two independent implementations serialize and hash every valid/invalid conformance fixture identically; missing required data yields the same typed terminal and no arbitrary counter or random value is accepted`.

## 2.8 `SURS-HR-F008`

2.8.1 severity=`P0`.

2.8.2 exactLocation=`3.3.1–3.3.5; 4.1.1–4.1.5`.

2.8.3 defect=`external custody equates original and custody roots without separating an exact raw custody object from a redacted or normalized derivative, and records acquisition metadata without proving source authenticity, acquisition authorization, immutable storage or custody transitions`.

2.8.4 consequence=`a copied but forged source may look valid, a legitimate redaction may fail an impossible root-equality rule, or a mutable custody object may retain stale authority`.

2.8.5 requiredFix=`define distinct RawCustodyObject and DerivedPublicObject identities, authenticated provenance assertions, authorization receipts, append-only custody events, storage immutability evidence and derivative edges`.

2.8.6 acceptancePredicate=`raw copy readback equals the original raw root; every derivative has a different allowed root and exact parent/tool edge; missing authorization, provenance or immutable-storage evidence blocks admission in mutation tests`.

## 2.9 `SURS-HR-F009`

2.9.1 severity=`P0`.

2.9.2 exactLocation=`3.4.1–3.4.5; 6.5.1–6.5.5`.

2.9.3 defect=`Public-safe handling is limited to “Public paths” and does not define a pre-ingest quarantine or cover Git objects/history/index/stash, branches/tags/forks, CI logs/artifacts/caches, issues/PRs, release assets, generated previews, filenames, URIs and tool output`.

2.9.4 consequence=`a Secret, PII item, provider receipt or customer/proprietary content can leak without ever appearing in the final workspace path`.

2.9.5 requiredFix=`define the full Public Egress Surface, an isolated pre-content inspection stage, metadata-safe logging, history-aware blocking scans and incident/revocation terminals before any public-system write`.

2.9.6 acceptancePredicate=`a rooted corpus planting prohibited values in every named surface is blocked before egress and produces redacted evidence only; Git-object and CI-artifact scans report zero prohibited objects for an admissible snapshot`.

## 2.10 `SURS-HR-F010`

2.10.1 severity=`P1`.

2.10.2 exactLocation=`3.4.1–3.4.5`.

2.10.3 defect=`Secret, PII, customer, private-provider and proprietary-content classification, data-minimization, redaction irreversibility, quotation/license permission and reviewer separation have no deterministic policies or evidence schema`.

2.10.4 consequence=`sensitive content may be falsely marked public-safe, while over-redaction may destroy the bounded claim needed for traceability`.

2.10.5 requiredFix=`define rooted classification and minimization policies, deterministic detectors plus human escalation boundaries, license/redistribution decisions, irreversible-redaction tests and independent approval receipts`.

2.10.6 acceptancePredicate=`a frozen positive/negative corpus achieves the accepted per-class thresholds with zero critical-secret false negatives; every public derivative passes re-identification, metadata and license checks and resolves to a protected original reference`.

## 2.11 `SURS-HR-F011`

2.11.1 severity=`P0`.

2.11.2 exactLocation=`3.5.1–3.5.5`.

2.11.3 defect=`the untrusted-content boundary has no normative parser/network/filesystem sandbox model and omits SSRF/redirect abuse, archive traversal, decompression bombs, macro/active documents, XML entity expansion, MIME polyglots, parser exploits, embedded credentials and antivirus/file-scanner disposition`.

2.11.4 consequence=`mere discovery or extraction can trigger external actions, resource exhaustion, code execution, credential disclosure or authority injection before quarantine`.

2.11.5 requiredFix=`define an allowlisted ingestion state machine with no-network parsing by default, bounded resources, safe URL fetcher, archive and active-content policy, scanner decision terminal and isolated failure evidence`.

2.11.6 acceptancePredicate=`a rooted malicious corpus covering every vector causes no external request, filesystem escape, code/macro execution, secret read or authority transition; each item reaches the expected typed quarantine terminal within fixed limits`.

## 2.12 `SURS-HR-F012`

2.12.1 severity=`P0`.

2.12.2 exactLocation=`4.1.1–4.1.5; 4.2.1–4.2.5`.

2.12.3 defect=`digest profile, byte acquisition, encoding and canonical locator schemas are undefined; profiles omit explicit DOCX/package-part, raster/OCR, audio/video/timecode, email/chat, API/JSON and archive-member locators, while text/PDF/AST coordinates lack unit/origin/parser semantics`.

2.12.4 consequence=`an exact statement cannot be reconstructed across tools or for all admitted source types, so whole-source “read” claims can mask omissions`.

2.12.5 requiredFix=`publish a media-profile registry with canonical raw-digest algorithm, byte-versus-decoded rules and per-format locator schemas including page box/rotation, Unicode coordinate unit, parser version and unsupported-format terminal`.

2.12.6 acceptancePredicate=`each admitted media type has a rooted conformance object whose locator is resolved to identical raw byte spans by two independent resolvers; unsupported and ambiguous mappings fail closed`.

## 2.13 `SURS-HR-F013`

2.13.1 severity=`P1`.

2.13.2 exactLocation=`4.1.1–4.1.5; 4.2.1–4.2.5`.

2.13.3 defect=`tool/profile roots alone do not define reproducibility for rendering, OCR or extraction: executable identity, dependency/font/locale environment, nondeterminism policy, OCR confidence and resolver-independence criteria are absent`.

2.13.4 consequence=`the same raw bytes can yield different extracted claims while all implementations report a valid tool root`.

2.13.5 requiredFix=`define hermetic extraction/render envelopes, canonical outputs, allowed nondeterminism or blocking thresholds, confidence/ambiguity terminals and independence rules that prevent shared-parser common-mode acceptance`.

2.13.6 acceptancePredicate=`repeated runs across two accepted independent envelopes produce identical canonical claim spans or the same typed ambiguity; perturbing fonts, locale or parser version invalidates the derivative`.

## 2.14 `SURS-HR-F014`

2.14.1 severity=`P1`.

2.14.2 exactLocation=`4.3.1–4.3.5`.

2.14.3 defect=`dependency discovery is restricted to TypeScript/JavaScript and does not normatively resolve framework-implicit entry points, package exports/conditions, aliases, server actions, worker/config/workflow/shell/SQL loaders, dynamic import/require, generated route manifests or environment-dependent resolution; the boundary-policy registry is absent`.

2.14.4 consequence=`a server-only dependency, secret consumer or runtime path can remain outside the graph despite two graph walks agreeing`.

2.14.5 requiredFix=`define the complete implementation-language/loader registry, resolution environment, runtime-entry inventory, dynamic-edge terminals and explicit allowed/forbidden Client/Server edge policy`.

2.14.6 acceptancePredicate=`a rooted mixed-loader fixture graph is identical under two independent engines; every executable entry and transitive edge is classified, and each hidden/dynamic/forbidden edge mutation makes admission fail`.

## 2.15 `SURS-HR-F015`

2.15.1 severity=`P1`.

2.15.2 exactLocation=`4.4.1–4.4.5`.

2.15.3 defect=`implementation evidence does not bind toolchain/runtime/dependency resolution or canonical overlay operations, and “remote HEAD” lacks remote, ref, observation receipt and race semantics`.

2.15.4 consequence=`a source snapshot can be byte-identical while producing different runtime behavior, or a moving remote ref can be reported as the pushed state`.

2.15.5 requiredFix=`bind commit object, remote/ref observation, index/overlay operations, lockfiles, package-manager/runtime/toolchain profiles and all unsupported environmental inputs as Unknown`.

2.15.6 acceptancePredicate=`offline replay reconstructs the same tree, overlay and resolution graph from exact objects; moving the remote ref or changing any bound toolchain input invalidates only the corresponding observation and downstream claims`.

## 2.16 `SURS-HR-F016`

2.16.1 severity=`P0`.

2.16.2 exactLocation=`5.1.1–5.1.5; 6.4.1–6.4.5`.

2.16.3 defect=`mutable-source capture has no normative request/redirect/header/content-encoding profile, trusted-time definition, freshness function, refresh cadence, event detector or rule for a source that changes without a successful retrieval`.

2.16.4 consequence=`a stale page or cached/authentication error body can remain a “current official fact,” and downstream invalidation may never fire`.

2.16.5 requiredFix=`define a canonical FetchObservation, content validation, final-URI chain, trusted clock, Fresh/Grace/Stale/Unavailable states, per-claim TTL/recheck policy and conservative change/failed-refresh invalidation rules`.

2.16.6 acceptancePredicate=`clock-boundary, redirect, 200-error-page, 304, encoding, 401/403/404/429/5xx and unseen-change fixtures yield one expected state under two evaluators; stale or failed-refresh live claims cannot enable capability`.

## 2.17 `SURS-HR-F017`

2.17.1 severity=`P1`.

2.17.2 exactLocation=`5.1.1–5.1.5`.

2.17.3 defect=`“canonical official URI” and publisher authenticity are assertions without a discovery/proof rule; TLS/redirect/domain ownership, authenticated documentation, locale fallback and signed/versioned publication evidence are unspecified`.

2.17.4 consequence=`a lookalike, compromised redirect, unofficial mirror or wrong-locale page may be admitted as current authority`.

2.17.5 requiredFix=`define publisher/domain allowlists rooted in an approved authority registry, redirect restrictions, authentication and locale rules, capture-envelope evidence and an authenticity Unknown terminal`.

2.17.6 acceptancePredicate=`official, mirror, lookalike, cross-domain redirect, expired-auth and locale-conflict fixtures classify identically; only a proven publisher path can carry current-official-fact role`.

## 2.18 `SURS-HR-F018`

2.18.1 severity=`P0`.

2.18.2 exactLocation=`5.2.1–5.2.5; dependencies in 5.2.5`.

2.18.3 defect=`provider entitlement receipts lack canonical tenant/account/asset pseudonymous identity, capture/authenticity schema, secret-free projection, validity interval and revocation semantics, and SURS-017 does not depend on Public-safe handling or lifecycle invalidation`.

2.18.4 consequence=`a receipt from the wrong account or an expired entitlement can enable a capability, while credentials/account identifiers may enter the Public repository`.

2.18.5 requiredFix=`define typed private receipt and public-safe projection schemas, exact subject binding, authenticated observation, expiry/revocation triggers and mandatory dependencies on SURS-010, SURS-016 and SURS-024`.

2.18.6 acceptancePredicate=`wrong-account, wrong-asset, expired, revoked, redacted-secret and cross-environment fixtures all fail capability enablement; the accepted public projection contains no prohibited identifier or credential and invalidates on receipt expiry`.

## 2.19 `SURS-HR-F019`

2.19.1 severity=`P1`.

2.19.2 exactLocation=`5.3.1–5.3.5`.

2.19.3 defect=`authority approval references an “eligible external Appointment” without defining role registry, subject/environment scope, separation of duties, quorum, delegation, signature, expiry, revocation, conflict of interest or appeal/reconciliation`.

2.19.4 consequence=`self-approval or an obsolete/out-of-scope approver may create apparent legal, financial, security or provider authority`.

2.19.5 requiredFix=`define rooted Appointment and Approval schemas plus eligibility/SoD/quorum/revocation algorithms and typed no-authority terminals`.

2.19.6 acceptancePredicate=`two evaluators agree over fixtures for valid, self, expired, revoked, delegated, wrong-scope and conflicting approvals; only the valid exact-subject set changes authority state`.

## 2.20 `SURS-HR-F020`

2.20.1 severity=`P0`.

2.20.2 exactLocation=`5.4.1–5.4.5; 6.1.1–6.1.5`.

2.20.3 defect=`Decision/amendment discovery has no canonical Decision ID and field schema, revision/event state machine, durable-chat/directive capture method, actor authentication, effective interval, partial supersession algorithm or conflict terminal`.

2.20.4 consequence=`D01–D31 and later amendments cannot be deterministically reconstructed, and a later message may silently override too much or too little`.

2.20.5 requiredFix=`define append-only DecisionEvent records, exact-source locators, actor/authority proofs, canonical field-level patch semantics and deterministic effective-state materialization with conflict blocking`.

2.20.6 acceptancePredicate=`two independent reducers produce the same state/root for reordered, duplicate, partial, revoked, future and conflicting DecisionEvent fixtures; unresolved conflict cannot yield an admitted answer`.

## 2.21 `SURS-HR-F021`

2.21.1 severity=`P0`.

2.21.2 exactLocation=`5.5.4; 5.5.5; compared with 2.1.4 and 5.4.4`.

2.21.3 defect=`D31 evaluation is forced to “admitted or rejected” whenever bytes exist, even when authority, scope, amendment or conflict evidence is unavailable; this contradicts the candidate dispositions and typed Unknown/finding rules`.

2.21.4 consequence=`the selector must invent certainty, potentially admitting an unauthorized Decision or permanently rejecting a valid but unresolved source`.

2.21.5 requiredFix=`allow explicit QUARANTINED, CONFLICT_BLOCKED and AUTHORITY_UNKNOWN terminals distinct from availability, without treating byte presence as decision sufficiency`.

2.21.6 acceptancePredicate=`fixtures with valid bytes but missing authority, unresolved amendment and conflicting scope reach the corresponding blocking terminal; only complete unconflicted evidence can admit or definitively reject D31`.

## 2.22 `SURS-HR-F022`

2.22.1 severity=`P1`.

2.22.2 exactLocation=`5.5.1–5.5.4`.

2.22.3 defect=`D31 is identified by a machine-specific absolute path and whole-file size/line count, with no custody-relative identifier, Git/blob identity, exact Decision locator or newline/count profile`.

2.22.4 consequence=`offline or cross-machine review cannot resolve the claim, and unrelated bytes in the same rooted file can be mistaken for the D31 Decision`.

2.22.5 requiredFix=`bind the raw root to a portable source ID, repository/custody location and media-specific exact Decision span; treat line/byte counts only as non-authoritative observations with defined counting profile`.

2.22.6 acceptancePredicate=`a clean-room resolver with no access to the original absolute path reconstructs the exact D31 raw claim span and root; moving the file preserves identity while altering the span bytes invalidates it`.

## 2.23 `SURS-HR-F023`

2.23.1 severity=`P0`.

2.23.2 exactLocation=`2.1.4; 3.1.1; 3.2.1; 6.1.1–6.1.5`.

2.23.3 defect=`admission/exclusion/quarantine/supersession/unavailable are modeled as one exactly-one disposition even though selection, availability, lifecycle supersession and safety quarantine are orthogonal axes`.

2.23.4 consequence=`a source cannot truthfully be both admitted historical evidence and currently unavailable/superseded, so state updates either erase history or violate the exactly-one invariant`.

2.23.5 requiredFix=`split SelectionState, AvailabilityState, LifecycleState and SafetyState into closed state machines with allowed cross-product invariants and append-only transitions`.

2.23.6 acceptancePredicate=`a transition corpus for admitted-then-unavailable, admitted-then-superseded, quarantined-then-cleared and excluded historical candidates preserves all valid axes/history and rejects impossible combinations identically`.

## 2.24 `SURS-HR-F024`

2.24.1 severity=`P1`.

2.24.2 exactLocation=`6.1.1–6.1.5`.

2.24.3 defect=`selection assertions lack canonical event identity, idempotency/replay rules, append-only ordering, authenticated reviewer/appointment proof and a deterministic algorithm for the “affected claims” blocked by disagreement`.

2.24.4 consequence=`duplicate or reordered assertions can change state, and a disagreement may block too little or the entire program arbitrarily`.

2.24.5 requiredFix=`define immutable SelectionAssertion events, deterministic reducer/order, actor proof and claim-dependency traversal for conflict scope`.

2.24.6 acceptancePredicate=`duplicate/reorder/replay fixtures produce one state root; tampered or unauthorized assertions fail; two graph engines return the same minimally conservative affected-claim set`.

## 2.25 `SURS-HR-F025`

2.25.1 severity=`P1`.

2.25.2 exactLocation=`6.2.1–6.2.5`.

2.25.3 defect=`denominators do not define set equations, snapshot root or treatment of multi-role/multi-family records; counts by dimensions can overlap and do not prove a global union or candidate-universe commitment`.

2.25.4 consequence=`reported subtotals can double count, omit candidates or change between reports while every local count remains reconstructible`.

2.25.5 requiredFix=`define rooted CandidateSet and dimensional projection sets, union/intersection equations, disjointness rules, Unknown members and one snapshot identity for all counters`.

2.25.6 acceptancePredicate=`member-level reconstruction satisfies every published equation and the global union exactly equals CandidateSet; duplicate roles do not duplicate global members and any missing projection member fails the report`.

## 2.26 `SURS-HR-F026`

2.26.1 severity=`P0`.

2.26.2 exactLocation=`6.3.1–6.3.5`.

2.26.3 defect=`“sorted exact admitted records” has no canonical serialization, sort key/collation, Unicode normalization, URI/path normalization, null/Unknown encoding, schema inclusion rule or digest algorithm/domain separation`.

2.26.4 consequence=`two valid SourceSet parsers can compute different roots or the same ambiguous preimage, defeating exact-root acceptance`.

2.26.5 requiredFix=`define a versioned canonical SourceSet byte grammar, explicit field order, UTF-8/Unicode rules, bytewise sorting, path/URI treatment, typed-null encoding and domain-separated digest profile`.

2.26.6 acceptancePredicate=`two independently implemented canonicalizers match exact expected bytes and roots for normal, Unicode-confusable, reordered, null, duplicate and path/URI edge fixtures; every noncanonical input is rejected`.

## 2.27 `SURS-HR-F027`

2.27.1 severity=`P0`.

2.27.2 exactLocation=`6.3.1–6.3.5; 6.6.1–6.6.5`.

2.27.3 defect=`forward and inverse closure is not required across CandidateSet, SourceSet, raw objects, derivatives, locators, admissions, selection assertions, authority/conflict edges and claim references; only self-member/dangling/duplicate checks are named`.

2.27.4 consequence=`an admitted source can lack its approval/provenance, an assertion can point to no current set, or an unreferenced source can inflate membership without failing QA`.

2.27.5 requiredFix=`define a typed bidirectional relation graph with exact cardinality and reachability invariants for every record/edge class, including candidate-to-disposition totality and claim-to-locator readback`.

2.27.6 acceptancePredicate=`two independent closure walkers return identical node/edge sets; orphan, missing-inverse, wrong-cardinality, unreachable, cross-snapshot and dangling mutations are all rejected`.

## 2.28 `SURS-HR-F028`

2.28.1 severity=`P0`.

2.28.2 exactLocation=`6.4.1–6.4.5`.

2.28.3 defect=`invalidation has no versioned dependency-edge schema, traversal direction, fixed-point/cycle rule, atomic current-state update, concurrency/race semantics or conservative Unknown policy; triggers omit discovery-policy/root, provenance, availability, confidentiality and Appointment/revocation changes`.

2.28.4 consequence=`stale accepted Requirements, Tasks, Tests, Evidence, Gates or schedules can remain current after a material source/authority change, or unrelated work can be invalidated nondeterministically`.

2.28.5 requiredFix=`define immutable versioned dependency graphs, complete trigger registry, least-fixed-point affected-set algorithm, cycle/Unknown behavior and atomic successor/current-pointer transaction`.

2.28.6 acceptancePredicate=`two independently implemented engines match expected minimal-conservative sets for every trigger, chain, fan-out, cycle, missing edge and concurrent successor fixture; no old acceptance remains current after commit`.

## 2.29 `SURS-HR-F029`

2.29.1 severity=`P1`.

2.29.2 exactLocation=`6.5.1–6.5.5`.

2.29.3 defect=`archive/offline replay lacks retention, deletion, Legal Hold, encryption/key custody, access audit, region, backup/restore linkage, license/copyright and private-reference availability rules; it also treats any missing member as one undifferentiated replay block`.

2.29.4 consequence=`private evidence may leak or become undecryptable, legally required deletion may fail, and one unavailable low-scope source may block or falsely pass unrelated claims`.

2.29.5 requiredFix=`define per-class archive policy, protected-store/keys/access evidence, retention/Legal-Hold lifecycle, licensed public projection and claim-scoped replay terminals linked to immutable backup/restore evidence`.

2.29.6 acceptancePredicate=`restore/replay fixtures prove exact authorized roots, keys and access logs within policy; expired/non-held data is absent, held data preserved, and a missing source blocks exactly its dependency closure`.

## 2.30 `SURS-HR-F030`

2.30.1 severity=`P0`.

2.30.2 exactLocation=`6.6.1–6.6.5`.

2.30.3 defect=`acceptance permits P0/P1/P2 findings to be “closed or blocking,” so unresolved blocking defects can coexist with acceptance; the mutation corpus, oracle, required coverage and meaning of “every mutation killed” are not finite or rooted`.

2.30.4 consequence=`the requirements set or a future SourceSet can receive PASS with known critical defects, and the acceptance result cannot be reproduced`.

2.30.5 requiredFix=`separate REVIEW_BLOCKED from ACCEPTED, require zero open P0/P1/P2 for acceptance, define a finite rooted mutation/test manifest with expected outcomes and make every predicate executable`.

2.30.6 acceptancePredicate=`an acceptance evaluator returns ACCEPTED only when every required test ID passes and open P0/P1/P2 count is zero; inserting one blocking finding or one surviving rooted mutation deterministically returns BLOCKED`.

## 2.31 `SURS-HR-F031`

2.31.1 severity=`P1`.

2.31.2 exactLocation=`6.6.1–6.6.5`.

2.31.3 defect=`two-run/parser and hostile-review independence, execution envelopes, reviewer eligibility, semantic review framing, exact-root acceptance signer, signature verification, expiry and revocation are not defined`.

2.31.4 consequence=`correlated implementations or an unauthorized/stale acceptance can satisfy nominal review counts without independent assurance`.

2.31.5 requiredFix=`define independent implementation/reviewer criteria, rooted run envelopes, review protocol, acceptance Appointment/signature schema and expiry/revocation checks`.

2.31.6 acceptancePredicate=`shared-library/common-author/identical-envelope and unauthorized/expired/revoked acceptance fixtures are rejected; two eligible independent runs and reviews bind the exact same subject root before acceptance`.

## 2.32 `SURS-HR-F032`

2.32.1 severity=`P2`.

2.32.2 exactLocation=`4.1.1; compared with 1.2.2 and 2.2.1–2.2.5`.

2.32.3 defect=`the phrase “Raw bytes remain authoritative” conflates byte fidelity with requirement authority, publisher authenticity and evidentiary sufficiency`.

2.32.4 consequence=`readers may incorrectly treat an exact hash as proof that the source is authorized, genuine or sufficient`.

2.32.5 requiredFix=`rename the rule to raw-byte fidelity/provenance and state explicitly that byte identity never grants authority, authenticity, freshness or claim sufficiency`.

2.32.6 acceptancePredicate=`the successor uses distinct typed predicates for byteIdentity, provenanceAuthenticity, authority, freshness and sufficiency, and no transition derives one solely from byteIdentity`.

# 3. Reviewer-local counters and verdict

## 3.1 Counters

3.1.1 total findings=`32`.

3.1.2 P0=`18`.

3.1.3 P1=`13`.

3.1.4 P2=`1`.

3.1.5 P3=`0`.

3.1.6 open=`32/32`.

3.1.7 closed=`0/32`.

## 3.2 Verdict

3.2.1 reviewer verdict=`REJECT AS ACCEPTANCE-READY; SUCCESSOR REQUIRED`.

3.2.2 the subject remains useful as a requirements seed, but it cannot yet deterministically prove source-universe completeness, custody safety, Public-repository safety, exact authority, forward/inverse closure, freshness or acceptance.

3.2.3 no finding is reconciled or closed by this reviewer-local manifest.

3.2.4 Gate29 remains `BLOCKED`; development freeze remains `ACTIVE`.
