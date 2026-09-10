# 1. Connect — Source-universe and custody successor requirements v3

## 1.1 Identity, frozen inputs and boundary

1.1.1 `artifactId=CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V3-2026-08-29`.

1.1.2 `requirementsVersion=SURS-3.0-draft`; status=`AUTHORING-SUCCESSOR-CANDIDATE; NOT-INDEPENDENTLY-REVIEWED; NOT-ACCEPTED`.

1.1.3 rejected v2 subject path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-2026-08-29.md`; exact SHA-256=`5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe`.

1.1.4 independent hostile-review path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-independent-hostile-review-2026-08-29.md`; exact SHA-256=`59f83f8d68439c404a10857bcd18535bbc826f12eb7c3e0da06106d7e6d4a923`.

1.1.5 findings-manifest path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-independent-hostile-review-findings-manifest-2026-08-29.md`; exact SHA-256=`4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea`.

1.1.6 frozen SourceReferenceIndex path=`web/docs/planning/source-universe-and-custody-successor-requirements-v3-source-reference-index-2026-08-29.md`; exact SHA-256=`a36a71f9ecd30ceaad7a696c91ac144a7dcd527dfbbb0ab9cffff2f871cfcc20`.

1.1.7 finite conformance and mutation manifest path=`web/docs/planning/source-universe-and-custody-successor-requirements-v3-conformance-mutation-manifest-2026-08-29.md`; exact SHA-256=`980c27ab127a81ca8dcb0c7ab6b7ad8fdabf857a1d7ba0a9beb09e14ad046e2e`.

1.1.8 the repository visibility requirement remains `Public`; this artifact treats Public boundaries as mandatory safety constraints and never proposes a Private-repository substitution.

1.1.9 boundary=`planning only; no source collection, Product extraction, Product code, Git mutation, Build, test execution, Push, Deploy, provider, account, credential or external-state mutation`.

1.1.10 exact SourceCandidate, Product Requirement, Program Task, Product completion, remaining-hours and ETA denominators remain `unknown/unavailable`.

## 1.2 Requirement row contract

1.2.1 the denominator is exactly `46` unique sequential rows; every row contains exactly five normative fields named `statement`, `defect/cause/impact`, `proof/predicate`, `dependencies` and `sourceBasis`.

1.2.2 a row states one contract object or one reviewer-Finding closure; no Finding identity is merged with another, no semantic range receives coverage and no direct mapping grants evidentiary Acceptance.

1.2.3 every `sourceBasis` token is exact and case-sensitive and must appear in the frozen SourceReferenceIndex with this row or crosswalk as inverse consumer.

1.2.4 dependency direction is `consumer -> prerequisite producer`; every dependency must name an earlier row; undeclared forward consumption is blocking.

# 2. Atomic requirements in topological order

## 2.1 `SURS3-REQ-001` — Frozen SourceReferenceIndex as an actual input

2.1.1 `statement`: consume only the immutable SourceReferenceIndex at path web/docs/planning/source-universe-and-custody-successor-requirements-v3-source-reference-index-2026-08-29.md and SHA-256 a36a71f9ecd30ceaad7a696c91ac144a7dcd527dfbbb0ab9cffff2f871cfcc20; every upstream token occurrence must resolve through its exact target and inverse-consumer record before any requirement may become eligible.

2.1.2 `defect/cause/impact`: v2 stated a future indexing rule while leaving 124 occurrences and 88 unique tokens unresolved, so provenance could be dangling, ambiguous, stale or spoofed and evidentiary closure could not be reconstructed.

2.1.3 `proof/predicate`: two independently implemented resolvers emit byte-identical 79-target and 80-occurrence ledgers; unresolved, ambiguous, duplicate-target, stale-root, inverse-missing, cross-snapshot and out-of-bounds counts are all zero; deleting or changing one edge returns SOURCE-REFERENCE-BLOCKED.

2.1.4 `dependencies`: `none; external input only`.

2.1.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F001`.

## 2.2 `SURS3-REQ-002` — Provider-independent external Bootstrap

2.2.1 `statement`: require one detached ExternalBootstrapEnvelope that predates this subject and binds exact IdentityRegistry, RoleRegistry, AppointmentRegistry, ApprovalPolicy, trusted-clock profile, accepted review-protocol root and ProtocolUsePermit root; no source candidate, provider receipt, Decision, reviewer output or same-generation artifact may create or widen that authority.

2.2.2 `defect/cause/impact`: v2 made Approval depend on ProviderReceipt while ProviderReceipt depended on Approval, allowing self-bootstrap or permanent deadlock and leaving Decision actor authority without a prior trust root.

2.2.3 `proof/predicate`: the authority-ancestry graph is acyclic and has exactly one externally rooted bootstrap lineage; valid pre-existing Appointment succeeds, while self, same-generation, provider-derived, missing, expired, revoked, delegated and wrong-scope fixtures each return SOURCE-AUTHORITY-BLOCKED; formal operational authority issued by conformance generations equals zero.

2.2.4 `dependencies`: `none; external input only`.

2.2.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F012`.

## 2.3 `SURS3-REQ-003` — Closed normative TerminalRegistry

2.3.1 `statement`: publish one closed canonical TerminalRegistry whose every record contains terminalId, owning state axis, causeCode, retryability, capability effect, disclosure-safe payload schema, allowed transition and deterministic precedence for an explicitly ordered compound transition.

2.3.2 `defect/cause/impact`: v2 used free-text terminal labels and one unordered three-choice outcome, so equal failures could change different state axes or capability effects and exact oracle comparison was impossible.

2.3.3 `proof/predicate`: every negative vector in the frozen 70-test manifest resolves to exactly one registry record or one explicitly ordered compound transition; undefined, unused, duplicate-cause, ambiguous and free-text-alternative counts are zero; changing cause or axis changes canonical terminal bytes and omission returns TERMINAL-REGISTRY-BLOCKED.

2.3.4 `dependencies`: `SURS3-REQ-001`.

2.3.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F020`.

## 2.4 `SURS3-REQ-004` — Orthogonal authority and evidence registries

2.4.1 `statement`: publish closed typed registries for authority class, evidence role, exact subject-key grammar, canonical field path, scope, entity, environment, provider, region, effective interval and claim predicate, keeping byteIdentity, provenanceAuthenticity, authority, freshness and sufficiency as five independent predicates.

2.4.2 `defect/cause/impact`: without orthogonal closed types, faithful bytes or provider documentation can be promoted incorrectly into current intent, entitlement or sufficient evidence.

2.4.3 `proof/predicate`: every admitted claim has exactly one valid typed subject and separately evaluated five-predicate vector; no transition derives one predicate solely from another; Unknown or unsupported input reaches SOURCE-PREDICATE-CONFLATION-BLOCKED under two independent evaluators.

2.4.4 `dependencies`: `SURS3-REQ-001`; `SURS3-REQ-002`; `SURS3-REQ-003`.

2.4.5 `sourceBasis`: `SRC-V2#SURS-002`.

## 2.5 `SURS3-REQ-005` — Deterministic exact-subject precedence

2.5.1 `statement`: define one total deterministic precedence and conflict reducer over the exact typed claim fields from SURS3-REQ-004 for equal, disjoint, nested, partial, expired, future and incomparable claims, with field-level amendment reconstruction and no recency-only shortcut.

2.5.2 `defect/cause/impact`: undefined overlap lets a narrow amendment rewrite unrelated controls or lets evaluators select different winners, while incomparable authority can be admitted silently.

2.5.3 `proof/predicate`: two independent reducers return identical bytes for the rooted overlap corpus; D18-A2 affects visibility only; every predecessor and unaffected field is reconstructible; ambiguous or incomparable overlap returns AUTHORITY-CONFLICT-BLOCKED.

2.5.4 `dependencies`: `SURS3-REQ-004`.

2.5.5 `sourceBasis`: `SRC-V2#SURS-003`.

## 2.6 `SURS3-REQ-006` — Typed producer-consumer inventory and semantic DAG

2.6.1 `statement`: materialize one typed inventory that assigns every schema, state, registry, algorithm, relation and evidence object consumed by the 46 requirements to exactly one earlier requirement producer or to the exact external Bootstrap or SourceReferenceIndex input, then derive the declared dependency edges from that inventory.

2.6.2 `defect/cause/impact`: v2 had a syntactically acyclic 74-edge graph but hid admission-custody, provider-approval, CandidateSet-denominator and invalidation producer cycles, so valid scheduling either ran before a type existed or deadlocked.

2.6.3 `proof/predicate`: two independent extractors return identical producer-consumer and dependency graphs; every consumer has exactly one valid earlier producer or external root; hidden, forward, dangling, self and cyclic edge counts are zero; deleting one required edge returns DEPENDENCY-CLOSURE-BLOCKED.

2.6.4 `dependencies`: `SURS3-REQ-001`; `SURS3-REQ-003`.

2.6.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F003`.

## 2.7 `SURS3-REQ-007` — Finite Candidate discovery contract

2.7.1 `statement`: define one closed DiscoveryInputSet with exact seed records, repository and external boundaries, traversal grammar and depth, URI policy, cutoff instant, per-family terminal policy and deterministic derivation of SourceCandidateUniverse followed by a separately selected AdmittedSourceSet.

2.7.2 `defect/cause/impact`: starting from a hand-picked document list omits binding sources, while defining completeness by whatever the run happened to discover makes the denominator circular.

2.7.3 `proof/predicate`: two discoverers on the same frozen inputs and policy return byte-identical sorted candidate IDs and terminals; every eligible edge is visited or explicitly blocked; no candidate disappears between discovery and selection; incompleteness returns DISCOVERY-INCOMPLETE-BLOCKED.

2.7.4 `dependencies`: `SURS3-REQ-001`; `SURS3-REQ-003`; `SURS3-REQ-006`.

2.7.5 `sourceBasis`: `SRC-V2#SURS-001`.

## 2.8 `SURS3-REQ-008` — Content-addressed discovery frontier closure

2.8.1 `statement`: materialize a finite canonical FrontierLedger containing seed-authority proof, edge identity and order, visited state, pagination and continuation state, observation window, mutation-during-traversal disposition, per-family budgets and one typed record for every visited, excluded or unvisited edge; COMPLETE, BOUNDED_INCOMPLETE and POLICY_EXCLUDED remain distinct.

2.8.2 `defect/cause/impact`: v2 named limits and cutoff but did not prove all eligible roots were seeded or represent withheld pages, mutations and limits, so two discoverers could agree on the same incomplete frontier.

2.8.3 `proof/predicate`: independent runs emit identical seed, frontier, visited, excluded and blocked Sets; omitted eligible root, withheld continuation, in-window mutation or reached limit makes COMPLETE impossible and returns DISCOVERY-INCOMPLETE-BLOCKED with the exact frontier member.

2.8.4 `dependencies`: `SURS3-REQ-007`.

2.8.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F002`.

## 2.9 `SURS3-REQ-009` — Deterministic Git repository and overlay identity

2.9.1 `statement`: publish canonical GitRepositoryIdentity, GitSnapshot and WorkingTreeOverlay schemas covering object format, common-dir and worktree, commit and tree, index stages, deletions, modes, symlinks, submodules, LFS pointers and objects, sparse checkout, ignored and untracked policy, Unicode and case collisions, external paths, and separately authenticated remote and ref observations.

2.9.2 `defect/cause/impact`: using the outer repository or omitting index, LFS or overlay state can create the wrong universe, hide unsafe bytes or confuse a moving remote observation with local truth.

2.9.3 `proof/predicate`: two offline readers reconstruct identical membership, metadata, tree and overlay roots across the supported real-repository-derived fixtures; outer and Product repositories remain distinct; unsupported state returns GIT-SNAPSHOT-BLOCKED.

2.9.4 `dependencies`: `SURS3-REQ-006`; `SURS3-REQ-007`.

2.9.5 `sourceBasis`: `SRC-V2#SURS-004`.

## 2.10 `SURS3-REQ-010` — Hostile Git and object-availability states

2.10.1 `statement`: extend Git identity with shallow and partial or promisor state, alternates, replace refs or grafts, missing and corrupt objects, nested repositories, .git indirection, effective config, attributes, clean/smudge or filter-process behavior, line-ending conversion, global and info excludes, submodule object availability, and authenticated LFS pointer-to-object observations; implicit network or filter execution is forbidden.

2.10.2 `defect/cause/impact`: equal apparent commits can resolve to different or unavailable bytes, execute an unapproved filter or fetch, omit nested history, or accept an unverified LFS pointer.

2.10.3 `proof/predicate`: independent offline readers emit identical objects, modes, overlays and typed unavailable results; missing or corrupt object, unapproved network or filter, unresolved submodule or LFS object, replace-ref or alternate ambiguity returns GIT-SNAPSHOT-BLOCKED.

2.10.4 `dependencies`: `SURS3-REQ-009`.

2.10.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F004`.

## 2.11 `SURS3-REQ-011` — Closed discovery-family registry

2.11.1 `statement`: publish a rooted primary-family and secondary-tag registry covering directives, attachments, Decisions, policies, registries, schemas, code and runtime, tests and evidence, dependencies and workflows, tickets, deployed and live state, official dynamic, provider and legal sources, plus every admitted media extension.

2.11.2 `defect/cause/impact`: a binding or risk-bearing source can remain outside every denominator when families are manual, incomplete or inconsistently tagged.

2.11.3 `proof/predicate`: every candidate receives exactly one primary family plus allowed secondary tags or UNKNOWN_FAMILY_QUARANTINED; each family has exact members and an explicit zero reason; an unregistered family cannot be admitted.

2.11.4 `dependencies`: `SURS3-REQ-009`; `SURS3-REQ-010`.

2.11.5 `sourceBasis`: `SRC-V2#SURS-005`.

## 2.12 `SURS3-REQ-012` — Rooted exclusion and exception dispositions

2.12.1 `statement`: define ordered include, exclude and quarantine predicates for dependency, build, cache, coverage, temporary, OS and generated paths, authored files inside generated paths, symlinks, nested repositories, ignored source-like files and third-party evidence, recording origin, authority, license, redistribution and security-advisory limits for each exception.

2.12.2 `defect/cause/impact`: vague path exclusions can discard first-party authority, follow symlink escapes or promote third-party bytes while losing license and safety obligations.

2.12.3 `proof/predicate`: two classifiers produce identical outcomes over rooted real-repository-derived paths; every Candidate has one disposition; ambiguous origin, license, symlink, ignored authority or prohibited content returns SOURCE-CLASSIFICATION-BLOCKED.

2.12.4 `dependencies`: `SURS3-REQ-004`; `SURS3-REQ-009`; `SURS3-REQ-010`; `SURS3-REQ-011`.

2.12.5 `sourceBasis`: `SRC-V2#SURS-006`.

## 2.13 `SURS3-REQ-013` — Canonical SourceCandidate record

2.13.1 `statement`: publish one immutable versioned SourceCandidate schema with closed enums, typed Unknown rules, private deterministic identity preimage, canonical serialization, domain-separated SHA-256, custody locator, media, raw size and root, discovery, ownership, candidate authority and roles, confidentiality, plus four orthogonal Selection, Availability, Lifecycle and Safety axes.

2.13.2 `defect/cause/impact`: prose records cannot support deterministic equality, sorting, hashing, duplicate detection or valid Unknown and compound-state behavior.

2.13.3 `proof/predicate`: two independent serializers emit exact expected bytes and roots for valid and invalid vectors; every record has one valid value on each axis and append-only transitions; aliases are explicit and unsupported identity input returns SOURCE-RECORD-BLOCKED.

2.13.4 `dependencies`: `SURS3-REQ-004`; `SURS3-REQ-009`; `SURS3-REQ-011`; `SURS3-REQ-012`.

2.13.5 `sourceBasis`: `SRC-V2#SURS-007`.

## 2.14 `SURS3-REQ-014` — Private identity, Public projection and current-state separation

2.14.1 `statement`: keep private stable Source identity separate from a rooted Public-safe opaque projection with a non-reidentification policy, and keep every immutable Candidate or Admitted record bound only to event roots present at creation while current state resides in a separate derived snapshot and fenced pointer.

2.14.2 `defect/cause/impact`: v2 allowed deterministic IDs to encode private locators or provider data and embedded a mutable current selection pointer in an immutable record, risking Public correlation leakage and ambiguous mutation semantics.

2.14.3 `proof/predicate`: the approved adversarial corpus cannot recover private locator, owner, provider or raw-root values from Public projections; later events leave prior bytes unchanged and produce one deterministic successor and current-state root; leakage returns PUBLIC-CLASSIFICATION-BLOCKED.

2.14.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-013`.

2.14.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F006`.

## 2.15 `SURS3-REQ-015` — Pre-admission external custody

2.15.1 `statement`: define immutable RawCustodyCandidate, DerivedPrivateObject and DerivedPublicObject identities plus authenticated acquisition authorization, provenance and append-only custody events binding actor, time, method, original root, immutable-storage readback, derivative tool and profile, redaction and every custody transition before admission is evaluated.

2.15.2 `defect/cause/impact`: an external source may disappear or be forged, and making custody depend on an already admitted record creates a bootstrap cycle or permits admission without verifiable bytes.

2.15.3 `proof/predicate`: a candidate enters verified immutable custody before any ADMITTED state; raw readback equals the captured root; each derivative has one exact parent and tool edge; missing authorization, provenance or storage proof returns SOURCE-CUSTODY-BLOCKED.

2.15.4 `dependencies`: `SURS3-REQ-002`; `SURS3-REQ-003`; `SURS3-REQ-013`; `SURS3-REQ-014`.

2.15.5 `sourceBasis`: `SRC-V2#SURS-009`.

## 2.16 `SURS3-REQ-016` — Raw-byte fidelity and derivative provenance

2.16.1 `statement`: preserve raw byte identity and bind every decode, extraction, render, OCR or index derivative to its raw or prior derivative parent through exact tool, profile and environment roots without deriving authenticity, authority, freshness or sufficiency from byte fidelity.

2.16.2 `defect/cause/impact`: normalization can change meaning, while treating faithful bytes as authoritative can falsely promote a copy into approved, genuine or current evidence.

2.16.3 `proof/predicate`: each derivative resolves to one exact parent and reproducible root; raw mutation invalidates locators; the five predicates remain independent; environment ambiguity returns DERIVATIVE-AMBIGUOUS-BLOCKED.

2.16.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-013`; `SURS3-REQ-015`.

2.16.5 `sourceBasis`: `SRC-V2#SURS-012`.

## 2.17 `SURS3-REQ-017` — Bounded untrusted-content ingestion

2.17.1 `statement`: define an allowlisted no-network-by-default ingestion state machine with isolated filesystem, bounded CPU, memory, time and streaming output, safe URL policy, redirect and SSRF controls, archive and active-document handling, MIME and content validation, malware-scanner decision and typed quarantine for every admitted content family.

2.17.2 `defect/cause/impact`: parsing or discovery can trigger authority injection, SSRF, traversal, decompression bomb, macro, XXE, polyglot or parser exploit before quarantine.

2.17.3 `proof/predicate`: the rooted hostile corpus causes no external request, escape, execution, secret read or unbounded output and each invalid input reaches its exact TerminalRegistry record, otherwise SOURCE-INGEST-QUARANTINED.

2.17.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-013`; `SURS3-REQ-015`; `SURS3-REQ-016`.

2.17.5 `sourceBasis`: `SRC-V2#SURS-011`.

## 2.18 `SURS3-REQ-018` — Recursive taint and safe-fetch closure

2.18.1 `statement`: carry an untrusted-data taint across every fetch, decode, extraction, OCR, archive member and model-derived value; revalidate each network hop and DNS result for scheme, port, IPv4, IPv6, private, link-local and metadata targets; enforce recursion, member, ratio and streaming limits; bind scanner version, freshness, unavailable, error and encrypted-content outcomes; emit metadata-only redacted failure evidence.

2.18.2 `defect/cause/impact`: nested content could regain control authority, redirects or DNS rebinding could reach internal addresses, unavailable scanners could default allow and quarantine logs could repeat prohibited payloads.

2.18.3 `proof/predicate`: all acquisition and derivative paths preserve taint and cannot create instructions or authority; DNS rebind, redirect rebind, nested archive, stale or unavailable scanner and encrypted input each reach one exact quarantine terminal with zero prohibited log bytes.

2.18.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-017`.

2.18.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F009`.

## 2.19 `SURS3-REQ-019` — Research, Appointment and Approval separation

2.19.1 `statement`: publish immutable Person, Role, Appointment, Delegation and Approval schemas rooted exclusively in SURS3-REQ-002, with subject and environment scope, separation of duties, quorum, signature, conflict of interest, validity, revocation and appeal; research may recommend but only the exact eligible authority set may approve.

2.19.2 `defect/cause/impact`: technical recommendation or provider data must not create authority, and undefined eligibility permits self, expired, delegated or wrong-scope approval.

2.19.3 `proof/predicate`: two evaluators agree on valid, self, expired, revoked, delegated, wrong-scope and conflicting approvals; only an exact valid quorum changes authority and all failures return SOURCE-AUTHORITY-BLOCKED.

2.19.4 `dependencies`: `SURS3-REQ-002`; `SURS3-REQ-003`; `SURS3-REQ-004`; `SURS3-REQ-005`.

2.19.5 `sourceBasis`: `SRC-V2#SURS-018`.

## 2.20 `SURS3-REQ-020` — Candidate-level SelectionAssertion events

2.20.1 `statement`: define immutable SelectionAssertionEvent identity, idempotency key, prior Candidate state root, eligible selector Appointment, exact claim scope, evidence and conflict roots, event time and validity, canonical ordering and four-axis transitions; selection operates on a Candidate in verified custody and produces an admission decision before any AdmittedSource exists.

2.20.2 `defect/cause/impact`: informal, duplicate or reordered selection can erase history, and selection that depends on an already admitted record recreates the admission-custody cycle.

2.20.3 `proof/predicate`: duplicate, reorder and replay yield one state root; unauthorized or tampered events fail; missing authority, missing custody and unsafe bytes affect distinct axes; no event may select itself or a future AdmittedSource; failure returns SELECTION-STATE-BLOCKED.

2.20.4 `dependencies`: `SURS3-REQ-002`; `SURS3-REQ-003`; `SURS3-REQ-004`; `SURS3-REQ-005`; `SURS3-REQ-013`; `SURS3-REQ-015`; `SURS3-REQ-019`.

2.20.5 `sourceBasis`: `SRC-V2#SURS-021`.

## 2.21 `SURS3-REQ-021` — AdmittedSource derived after custody, authority and selection

2.21.1 `statement`: publish an immutable AdmittedSource schema referencing one Candidate version and one verified RawCustodyCandidate, exact authority scope and subject, current eligible SelectionAssertion event at creation, locator and claim limits, effective and expiry triggers, conflict and supersession edges, without embedding a mutable current pointer.

2.21.2 `defect/cause/impact`: presence alone does not establish authority, and v2 could call a record admitted while authority or custody remained Unknown or quarantined.

2.21.3 `proof/predicate`: ADMITTED is reachable only when custody, authority and selection are all proven and SafetyState is allowed; missing authority, custody or safety produces the exact non-admitted axis terminal; all histories replay to identical roots.

2.21.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-004`; `SURS3-REQ-005`; `SURS3-REQ-013`; `SURS3-REQ-015`; `SURS3-REQ-016`; `SURS3-REQ-017`; `SURS3-REQ-019`; `SURS3-REQ-020`.

2.21.5 `sourceBasis`: `SRC-V2#SURS-008`.

## 2.22 `SURS3-REQ-022` — Total admission-axis cause mapping

2.22.1 `statement`: publish a total cause-to-axis transition table in which missing authority changes SelectionState to AUTHORITY_UNKNOWN, missing custody changes AvailabilityState to UNAVAILABLE, unsafe content changes SafetyState to QUARANTINED and supersession changes LifecycleState to SUPERSEDED; no cause may substitute another axis and terminal precedence is inherited only from SURS3-REQ-003.

2.22.2 `defect/cause/impact`: v2 used AUTHORITY_UNKNOWN or quarantine interchangeably, conflating selection authority with safety and permitting inconsistent capability outcomes.

2.22.3 `proof/predicate`: each single-cause and ordered multi-cause vector yields exactly the expected orthogonal transitions and terminal bytes; impossible combinations and ADMITTED with any blocking axis return SOURCE-STATE-BLOCKED.

2.22.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-019`; `SURS3-REQ-020`; `SURS3-REQ-021`.

2.22.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F007`.

## 2.23 `SURS3-REQ-023` — Public-safe source policy

2.23.1 `statement`: define rooted Secret, PII, customer, provider, proprietary and license classifications plus minimization, redaction, quotation, re-identification and independent-approval rules applied in isolated pre-content quarantine before any write to a Public-repository or public-adjacent surface.

2.23.2 `defect/cause/impact`: prohibited bytes or metadata can leak through history, identities or collaboration surfaces even when the final workspace file looks redacted.

2.23.3 `proof/predicate`: the rooted positive and negative corpus is blocked before public egress with disclosure-safe evidence; every public derivative resolves to a protected original reference and passes metadata, reversibility and license checks; failure returns PUBLIC-EGRESS-BLOCKED.

2.23.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-005`; `SURS3-REQ-014`; `SURS3-REQ-015`; `SURS3-REQ-016`; `SURS3-REQ-017`; `SURS3-REQ-021`; `SURS3-REQ-022`.

2.23.5 `sourceBasis`: `SRC-V2#SURS-010`.

## 2.24 `SURS3-REQ-024` — Media-specific locator profiles

2.24.1 `statement`: publish a rooted media-profile registry with canonical raw digest and locator schemas for text, PDF page geometry, syntax nodes, database and migration, captured web selectors, DOCX parts, raster and OCR, audio and video timecode, email and chat, API and JSON, archive members and each admitted extension, binding coordinate unit, origin, parser and environment roots.

2.24.2 `defect/cause/impact`: whole-file labels and underspecified coordinates cannot reconstruct an exact claim across tools or media, and shared parser or OCR uncertainty can appear deterministic.

2.24.3 `proof/predicate`: two independent hermetic resolver envelopes reconstruct identical spans and outputs or the same typed ambiguity; unsupported format, moved or mismatched locator, shared prohibited parser lineage or below-policy OCR confidence returns SOURCE-LOCATOR-BLOCKED.

2.24.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-016`; `SURS3-REQ-017`; `SURS3-REQ-021`.

2.24.5 `sourceBasis`: `SRC-V2#SURS-013`.

## 2.25 `SURS3-REQ-025` — Complete implementation loader graph

2.25.1 `statement`: publish a closed language, loader and boundary registry covering TypeScript, JavaScript, framework entries, exports and conditions, aliases, server actions, workers, configuration, workflows, shell, SQL, dynamic import or require, generated routes, container, buildpack, Procfile, infrastructure-as-code, scheduler, cron, queue, webhook, database trigger or function, service worker, WASM, native addon and provider-generated entries under an exact resolution environment.

2.25.2 `defect/cause/impact`: two TypeScript-only graphs can agree while an implicit, generated, mixed-loader or deployed entry hides a server-only Secret consumer or forbidden Client edge.

2.25.3 `proof/predicate`: two independent engines return identical rooted entry and transitive-edge graphs; every observed executable entry has one loader; hidden, dynamic, unsupported or boundary-violating edge returns IMPLEMENTATION-GRAPH-BLOCKED.

2.25.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-009`; `SURS3-REQ-010`; `SURS3-REQ-011`; `SURS3-REQ-012`; `SURS3-REQ-024`.

2.25.5 `sourceBasis`: `SRC-V2#SURS-014`.

## 2.26 `SURS3-REQ-026` — Implementation snapshot as evidence only

2.26.1 `statement`: bind observed code, schema, routes, tests, dependencies, configuration and workflows to exact repository, commit and tree, index and overlay, tracked, untracked and generated state, remote observation, lockfiles, package manager, runtime, loader and toolchain profiles, while assigning no intent authority to current code.

2.26.2 `defect/cause/impact`: equal source bytes can behave differently under unbound toolchains and a moving remote may be reported falsely as pushed state or intended behavior.

2.26.3 `proof/predicate`: offline replay reconstructs identical tree, overlay and resolution graph; local and remote observations remain separate; object, toolchain or ref changes invalidate only affected claims; unsupported input returns IMPLEMENTATION-SNAPSHOT-BLOCKED.

2.26.4 `dependencies`: `SURS3-REQ-009`; `SURS3-REQ-010`; `SURS3-REQ-025`.

2.26.5 `sourceBasis`: `SRC-V2#SURS-015`.

## 2.27 `SURS3-REQ-027` — Official dynamic-source observations

2.27.1 `statement`: define a canonical FetchObservation binding approved publisher Appointment, request method and disclosure-safe headers, authentication class, per-hop redirect record, final URI, status, cache validator, content encoding, raw response root, trusted time, locale, version, effective date, claim-specific reliance interval and Fresh, Grace, Stale, Unavailable or AuthenticityUnknown state.

2.27.2 `defect/cause/impact`: stale, cached, authentication-error or lookalike content can appear current and safe, while fetch metadata or credentials can leak into a Public surface.

2.27.3 `proof/predicate`: two evaluators agree on official, mirror, lookalike, redirect, locale, clock-boundary, 200-error, 304, encoding, authentication, 429 and server-error vectors; only a proven publisher path can carry current-official role; failure returns DYNAMIC-SOURCE-STALE-BLOCKED.

2.27.4 `dependencies`: `SURS3-REQ-002`; `SURS3-REQ-003`; `SURS3-REQ-016`; `SURS3-REQ-017`; `SURS3-REQ-018`; `SURS3-REQ-019`; `SURS3-REQ-023`.

2.27.5 `sourceBasis`: `SRC-V2#SURS-016`.

## 2.28 `SURS3-REQ-028` — Executable freshness and residual uncertainty

2.28.1 `statement`: bind every FetchObservation to prior cache object and validator, per-claim maximum reliance interval and exact capability policy for Fresh, Grace, Stale and Unavailable; treat a publisher change without authenticated new bytes or event as residual uncertainty, never as an observed change.

2.28.2 `defect/cause/impact`: v2 omitted Grace semantics and 304 linkage and claimed unseen changes could be tested, permitting stale capability or a false proof about unobserved publisher state.

2.28.3 `proof/predicate`: independent evaluators agree on all response, clock and cache states; Grace enables only policy-named capabilities; failed refresh or expired reliance blocks; 304 without matching prior root blocks; no oracle asserts unseen change and failure returns DYNAMIC-SOURCE-STALE-BLOCKED.

2.28.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-019`; `SURS3-REQ-023`; `SURS3-REQ-027`.

2.28.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F011`.

## 2.29 `SURS3-REQ-029` — Provider entitlement receipts

2.29.1 `statement`: define private ProviderReceipt and Public-safe projection records for documentation, pseudonymous account, tenant, asset and environment identity, authenticated plan, region, capability, quota and configuration observation, prior eligible Approval, runtime evidence, validity, expiry, revocation and lifecycle triggers; a receipt cannot create its own approver.

2.29.2 `defect/cause/impact`: documentation does not prove entitlement and wrong-account or expired receipts can enable capability or expose identifiers; provider-to-Approval bootstrap is unsafe.

2.29.3 `proof/predicate`: wrong account, asset, environment, expiry, revocation, missing Approval or unauthenticated observation keeps capability OFF with PROVIDER-ENTITLEMENT-BLOCKED; public projection contains no prohibited identifier; receipt ancestry cannot reach its Approval issuer.

2.29.4 `dependencies`: `SURS3-REQ-002`; `SURS3-REQ-003`; `SURS3-REQ-019`; `SURS3-REQ-023`; `SURS3-REQ-027`; `SURS3-REQ-028`.

2.29.5 `sourceBasis`: `SRC-V2#SURS-017`.

## 2.30 `SURS3-REQ-030` — Append-only Decision and amendment reduction

2.30.1 `statement`: define canonical DecisionEvent records for each Decision and later directive, research and reconciliation event with deterministic IDs, exact indexed source locator, authenticated actor Appointment, event type, effective interval, prior root and field-level patch, then reduce canonical ordered events without erasing history.

2.30.2 `defect/cause/impact`: duplicate, reordered or partial directives can override too much or too little when actor authority, patch scope or conflicts are implicit.

2.30.3 `proof/predicate`: two reducers emit identical bytes and root for reordered, duplicate, partial, revoked, future and conflicting events; missing indexed source or unresolved conflict cannot yield an admitted answer and returns DECISION-CONFLICT-BLOCKED.

2.30.4 `dependencies`: `SURS3-REQ-002`; `SURS3-REQ-003`; `SURS3-REQ-004`; `SURS3-REQ-005`; `SURS3-REQ-013`; `SURS3-REQ-019`; `SURS3-REQ-021`.

2.30.5 `sourceBasis`: `SRC-V2#SURS-019`.

## 2.31 `SURS3-REQ-031` — D31 exact-source evaluation

2.31.1 `statement`: evaluate CONNECT-D31-POSTGRESQL-RUNTIME-ROLE-DECISION-CANDIDATE at raw SHA-256 8816a77739a17e94cf9ffcbf5a586db00e001d9d5fdff3bd8e801a0e33e79bb0 using repository-relative path web/docs/postgresql-runtime-role-decision.md and UTF-8/LF lines 747–751 inclusive, whose exact span is 5 lines, 464 bytes and SHA-256 6a13c3d00d7576d97cbcbe69340a019a83b79831987942d7c39534a49ec97578.

2.31.2 `defect/cause/impact`: v2 named a portable locator and exact span without materializing them, so a clean-room resolver could not execute D31 selection from the requirements bytes.

2.31.3 `proof/predicate`: a clean-room resolver using the frozen index reconstructs exactly the stated span bytes and root without an absolute path; a recorded move can preserve identity, while a span-byte or raw-root mutation returns D31-LOCATOR-BLOCKED; authority and provisioning remain separate.

2.31.4 `dependencies`: `SURS3-REQ-001`; `SURS3-REQ-003`; `SURS3-REQ-016`; `SURS3-REQ-019`; `SURS3-REQ-024`; `SURS3-REQ-030`.

2.31.5 `sourceBasis`: `SRC-V2#SURS-020`; `SRC-D31#DECISION-7.1`.

## 2.32 `SURS3-REQ-032` — D31 total failure-to-axis and terminal table

2.32.1 `statement`: bind D31 causes exactly as follows: missing authority to SelectionState AUTHORITY_UNKNOWN and SOURCE-AUTHORITY-BLOCKED; unsafe content to SafetyState QUARANTINED and SOURCE-INGEST-QUARANTINED; missing custody to AvailabilityState UNAVAILABLE and SOURCE-CUSTODY-BLOCKED; amendment conflict to SelectionState CONFLICT_BLOCKED and DECISION-CONFLICT-BLOCKED; subject-authority conflict to SelectionState CONFLICT_BLOCKED and AUTHORITY-CONFLICT-BLOCKED; simultaneous causes use the TerminalRegistry order safety, custody, authority-conflict, amendment-conflict.

2.32.2 `defect/cause/impact`: v2 returned an unordered choice among AUTHORITY_UNKNOWN, QUARANTINED and CONFLICT_BLOCKED, allowing equal evidence to produce different state axes and terminals.

2.32.3 `proof/predicate`: each single cause and every ordered multi-cause combination returns exactly the listed axis transition and terminal record; moving the valid file changes no decision identity, while changing span bytes returns D31-LOCATOR-BLOCKED before authority evaluation.

2.32.4 `dependencies`: `SURS3-REQ-001`; `SURS3-REQ-003`; `SURS3-REQ-022`; `SURS3-REQ-031`.

2.32.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F013`; `SRC-D31#DECISION-7.1`.

## 2.33 `SURS3-REQ-033` — Minimal-conservative claim-closure oracle

2.33.1 `statement`: define typed claim-edge direction, reachability, strongly connected component handling, safety-closure operator and subset minimality order; for each rooted disagreement or trigger graph publish the exact oracle affected Set, distinguishing proven minimality from conservative Unknown.

2.33.2 `defect/cause/impact`: v2 required two engines to agree on a minimally conservative Set without a formal order or oracle, so both could over-block or under-block identically.

2.33.3 `proof/predicate`: each engine output equals the rooted exact oracle; removing one required member violates closure, adding one unrelated member violates minimality, and a missing or Unknown edge returns SOURCE-INVALIDATION-BLOCKED rather than claiming minimality.

2.33.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-005`; `SURS3-REQ-006`; `SURS3-REQ-020`; `SURS3-REQ-022`; `SURS3-REQ-030`; `SURS3-REQ-032`.

2.33.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F014`.

## 2.34 `SURS3-REQ-034` — Canonical CandidateSet and SourceSet roots

2.34.1 `statement`: define CandidateSet first as every discovered Candidate at one snapshot root and AdmittedSourceSet as the subset with current ADMITTED selection; define SourceSet as the typed graph containing both sets, raw and derivative objects, locators, authority and conflict edges, selection events and claim references under one canonical byte grammar, field order, UTF-8 NFC and confusable policy, typed null and Unknown, bytewise sort, uniqueness and domain-separated full SHA-256.

2.34.2 `defect/cause/impact`: v2 left SourceSet membership ambiguous and made denominators produce a CandidateSet root while SourceSet hashing depended on those denominators, creating a semantic cycle.

2.34.3 `proof/predicate`: two canonicalizers emit identical CandidateSet, AdmittedSourceSet and SourceSet bytes and roots before any projection count; self, duplicate, framing, Unicode, path, URI, null or order mutation returns SOURCE-SET-CONFLICT-BLOCKED.

2.34.4 `dependencies`: `SURS3-REQ-001`; `SURS3-REQ-003`; `SURS3-REQ-013`; `SURS3-REQ-014`; `SURS3-REQ-015`; `SURS3-REQ-016`; `SURS3-REQ-020`; `SURS3-REQ-021`; `SURS3-REQ-024`; `SURS3-REQ-030`; `SURS3-REQ-033`.

2.34.5 `sourceBasis`: `SRC-V2#SURS-023`.

## 2.35 `SURS3-REQ-035` — Normative SourceSet relation cardinalities

2.35.1 `statement`: publish one closed relation registry with exact source and target types and min and max cardinality: every Candidate has exactly one current-state edge; each AdmittedSource has exactly one Candidate, current eligible SelectionAssertion, authority scope and required custody edge; each claim has exactly one locator target; many distinct claims may share one source; every forward edge has its typed inverse.

2.35.2 `defect/cause/impact`: v2 named relations collectively but did not define membership or cardinality, so candidates could disappear, admission could lack custody, or lawful many-to-one references could be rejected.

2.35.3 `proof/predicate`: independent walkers emit identical nodes, edges and per-relation counts; dangling, orphan, missing inverse, wrong cardinality, unreachable and cross-snapshot counts are zero; one relation mutation returns SOURCE-CLOSURE-BLOCKED.

2.35.4 `dependencies`: `SURS3-REQ-001`; `SURS3-REQ-003`; `SURS3-REQ-014`; `SURS3-REQ-015`; `SURS3-REQ-016`; `SURS3-REQ-020`; `SURS3-REQ-021`; `SURS3-REQ-024`; `SURS3-REQ-030`; `SURS3-REQ-034`.

2.35.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F016`.

## 2.36 `SURS3-REQ-036` — Snapshot-bound source denominators

2.36.1 `statement`: derive member-level Sets for CandidateSet, every state axis, primary discovery family, secondary tag, authority class and evidence role from the already canonical SURS3-REQ-034 root, preserving typed Unknown members and preventing multi-tag projections from changing global membership.

2.36.2 `defect/cause/impact`: overlapping dimensions can double-count or omit candidates and v2's denominator root depended on a later producer.

2.36.3 `proof/predicate`: every report binds one CandidateSet root; all member sets reconstruct exactly; no projection introduces or drops a global member; missing member or mixed snapshot returns SOURCE-DENOMINATOR-BLOCKED.

2.36.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-011`; `SURS3-REQ-012`; `SURS3-REQ-013`; `SURS3-REQ-020`; `SURS3-REQ-022`; `SURS3-REQ-034`; `SURS3-REQ-035`.

2.36.5 `sourceBasis`: `SRC-V2#SURS-022`.

## 2.37 `SURS3-REQ-037` — Exact primary, secondary and per-dimension equations

2.37.1 `statement`: publish one separate equation per dimension: primary-family Sets are pairwise disjoint and their union equals CandidateSet; secondary-tag Sets may overlap but their union and counts are reported only as projections; each state, authority and evidence-role dimension has its own complete union with explicit Unknown partition and never mixes with another dimension.

2.37.2 `defect/cause/impact`: v2 did not say whether family counts used primary or secondary tags and used an undefined global union, allowing different valid counts and roots.

2.37.3 `proof/predicate`: two evaluators reconstruct identical member Sets and equations; primary intersection cardinality is zero, primary union equals CandidateSet, secondary tags never change global cardinality, and every dimension closes exactly or returns SOURCE-DENOMINATOR-BLOCKED.

2.37.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-011`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-036`.

2.37.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F015`.

## 2.38 `SURS3-REQ-038` — Locator and loader coverage equations

2.38.1 `statement`: derive locator coverage from CandidateSet media and extension membership and loader coverage from package, build, deploy, runtime and provider entry manifests; publish total forward and inverse equations, explicit unsupported records, parser-family independence and OCR confidence or ambiguity policy.

2.38.2 `defect/cause/impact`: v2 could prove two engines agreed only over an incomplete registry while an admitted format or executable entry stayed outside the Client, Server or Secret boundary.

2.38.3 `proof/predicate`: every admitted source maps to exactly one compatible locator profile or SOURCE-LOCATOR-BLOCKED; every observed executable entry maps to exactly one loader and complete transitive graph or IMPLEMENTATION-GRAPH-BLOCKED; injecting one unmapped member fails.

2.38.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-011`; `SURS3-REQ-013`; `SURS3-REQ-024`; `SURS3-REQ-025`; `SURS3-REQ-026`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-036`.

2.38.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F010`.

## 2.39 `SURS3-REQ-039` — Actual Public egress graph and incident lifecycle

2.39.1 `statement`: derive a rooted source-to-transform-to-egress graph from observed repository, GitHub collaboration and automation, CI, deployment, container, storage and CDN, telemetry and error, browser and cache, DNS and certificate, backup and AI-assistant configurations; every private or Public sink records detector coverage and limits, accessibility, reversibility and incident, revocation and credential-rotation actions; unknown sinks block.

2.39.2 `defect/cause/impact`: v2 used a hand-written Public surface list that omitted material sinks and could overclaim zero leakage across inaccessible history, forks or detector false negatives.

2.39.3 `proof/predicate`: every configured or observed sink has one classified node and policy; deterministic prohibited-content mutations are blocked before every accessible sink; unknown or inaccessible coverage returns UNKNOWN-EGRESS-BLOCKED; detection-after-egress yields exact incident, revocation and rotation evidence without payload disclosure.

2.39.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-014`; `SURS3-REQ-015`; `SURS3-REQ-016`; `SURS3-REQ-018`; `SURS3-REQ-023`; `SURS3-REQ-026`; `SURS3-REQ-029`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-038`.

2.39.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F008`.

## 2.40 `SURS3-REQ-040` — Typed change invalidation graph

2.40.1 `statement`: define an immutable versioned dependency graph and deterministic least-fixed-point traversal for changes to discovery, bytes, membership, provenance, authenticity, availability, confidentiality, safety, authority, Appointment, Decision, freshness, locator, tool profile and claim limits, producing a minimal-conservative affected Set and an immutable successor generation.

2.40.2 `defect/cause/impact`: missing edges, cycles or races can leave stale work current or invalidate unrelated work nondeterministically.

2.40.3 `proof/predicate`: two engines equal the SURS3-REQ-033 oracle for trigger, chain, fan-out, cycle, missing-edge and concurrent-successor cases; Unknown blocks and no old Acceptance transfers; failure returns SOURCE-INVALIDATION-BLOCKED.

2.40.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-005`; `SURS3-REQ-006`; `SURS3-REQ-020`; `SURS3-REQ-022`; `SURS3-REQ-027`; `SURS3-REQ-028`; `SURS3-REQ-029`; `SURS3-REQ-030`; `SURS3-REQ-033`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-036`; `SURS3-REQ-037`; `SURS3-REQ-038`; `SURS3-REQ-039`.

2.40.5 `sourceBasis`: `SRC-V2#SURS-024`.

## 2.41 `SURS3-REQ-041` — Archive and offline replay contract

2.41.1 `statement`: publish per-DataClass policies for raw and derivative payloads, protected references, locators, selections, conflicts, review and Acceptance-envelope types, with retention, deletion, Legal Hold, encryption and key custody, access audit, region, license, backup and restore linkage; restored generations are quarantined and cannot become current.

2.41.2 `defect/cause/impact`: disappearing sources prevent replay, while unspecified retention, key and protected-record boundaries can leak evidence, violate deletion or resurrect stale Acceptance.

2.41.3 `proof/predicate`: authorized restore reconstructs only policy-permitted exact roots and records; expired non-held data is absent, held data remains, public projections are licensed and private bytes unexposed; restored current-pointer count is zero and failure returns SOURCE-REPLAY-BLOCKED.

2.41.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-015`; `SURS3-REQ-016`; `SURS3-REQ-021`; `SURS3-REQ-023`; `SURS3-REQ-024`; `SURS3-REQ-032`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-039`; `SURS3-REQ-040`.

2.41.5 `sourceBasis`: `SRC-V2#SURS-025`.

## 2.42 `SURS3-REQ-042` — Erasure-safe claim-scoped replay

2.42.1 `statement`: separate immutable non-sensitive event metadata from erasable or encrypted protected payload references per DataClass, define tombstone and erasure proof, cryptographic key-destruction semantics, restored-generation quarantine and mandatory fresh validation and invalidation before any current pointer.

2.42.2 `defect/cause/impact`: v2 did not reconcile immutable history with mandatory erasure, so restore could resurrect deleted bytes or stale Acceptance or global replay could fail because one scoped payload was erased.

2.42.3 `proof/predicate`: erased non-held payload is unrecoverable while its disclosure-safe tombstone proves scoped absence; no restored Acceptance becomes current without fresh exact-root validation; missing payload blocks exactly the inverse claim closure and returns SOURCE-REPLAY-BLOCKED.

2.42.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-015`; `SURS3-REQ-016`; `SURS3-REQ-021`; `SURS3-REQ-023`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-040`; `SURS3-REQ-041`.

2.42.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F018`.

## 2.43 `SURS3-REQ-043` — Closed invalidation triggers and fenced cross-store publication

2.43.1 `statement`: derive one trigger for every versioned authoritative field and external lifecycle, including schema, algorithm, policy, test oracle, reviewer eligibility, security advisory, scanner version, retention, Hold, key and region; bind each trigger to exact typed edges; choose one transactional current-pointer boundary and use outbox, fencing, idempotency and reconciliation for all other stores.

2.43.2 `defect/cause/impact`: v2 omitted material triggers and called a multi-store update atomic without failure boundaries, permitting stale accepted work, mixed generations or deletion-policy violations.

2.43.3 `proof/predicate`: every mutable field has at least one trigger and inverse edge; crash, retry and concurrent writers expose only the complete old or complete new generation; deletion and Hold retain only permitted history; any mixed state or missing trigger returns SOURCE-INVALIDATION-BLOCKED.

2.43.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-006`; `SURS3-REQ-018`; `SURS3-REQ-019`; `SURS3-REQ-020`; `SURS3-REQ-022`; `SURS3-REQ-027`; `SURS3-REQ-028`; `SURS3-REQ-029`; `SURS3-REQ-030`; `SURS3-REQ-033`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-036`; `SURS3-REQ-037`; `SURS3-REQ-038`; `SURS3-REQ-039`; `SURS3-REQ-040`; `SURS3-REQ-041`; `SURS3-REQ-042`.

2.43.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F017`.

## 2.44 `SURS3-REQ-044` — Derived family and exclusion completeness

2.44.1 `statement`: derive the final discovery-family equation from every accepted locator, loader, provider, Decision, egress and archive DataClass registry and require one include, exclude or quarantine disposition for every CandidateSet member and every effective ignore or exclusion rule.

2.44.2 `defect/cause/impact`: v2's manual family and exclusion registries could omit a type present elsewhere or discard a source-like ignored or generated member before authority and safety disposition.

2.44.3 `proof/predicate`: derived family members plus UNKNOWN_FAMILY_QUARANTINED equal CandidateSet exactly; all contributing registries have forward and inverse coverage; adding one locator, loader, sink or DataClass without mapping or excluding one source-like member returns SOURCE-CLASSIFICATION-BLOCKED.

2.44.4 `dependencies`: `SURS3-REQ-003`; `SURS3-REQ-011`; `SURS3-REQ-012`; `SURS3-REQ-013`; `SURS3-REQ-023`; `SURS3-REQ-024`; `SURS3-REQ-025`; `SURS3-REQ-029`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-036`; `SURS3-REQ-037`; `SURS3-REQ-038`; `SURS3-REQ-039`; `SURS3-REQ-041`; `SURS3-REQ-042`; `SURS3-REQ-043`.

2.44.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F005`.

## 2.45 `SURS3-REQ-045` — Complete independence matrix and immutable test root

2.45.1 `statement`: derive an independence role for every proof requiring multiple evaluators and bind each role's implementation, library, owner, execution envelope and non-collusion limits; consume the finite conformance and mutation manifest at SHA-256 980c27ab127a81ca8dcb0c7ab6b7ad8fdabf857a1d7ba0a9beb09e14ad046e2e and require an externally accepted review-protocol root before any formal review.

2.45.2 `defect/cause/impact`: v2 omitted many paired evaluator roles and had no finite immutable test root, allowing correlated engines or a changing test set to satisfy nominal parity.

2.45.3 `proof/predicate`: every dual-run predicate has two eligible non-correlated envelopes over identical subject and test roots; all 70 immutable test IDs exist; removing a role or test or sharing a prohibited dependency returns SOURCE-ACCEPTANCE-BLOCKED; open P0, P1 and P2 must each be zero.

2.45.4 `dependencies`: `SURS3-REQ-001`; `SURS3-REQ-002`; `SURS3-REQ-003`; `SURS3-REQ-005`; `SURS3-REQ-006`; `SURS3-REQ-007`; `SURS3-REQ-008`; `SURS3-REQ-009`; `SURS3-REQ-010`; `SURS3-REQ-012`; `SURS3-REQ-013`; `SURS3-REQ-014`; `SURS3-REQ-016`; `SURS3-REQ-017`; `SURS3-REQ-018`; `SURS3-REQ-019`; `SURS3-REQ-020`; `SURS3-REQ-022`; `SURS3-REQ-024`; `SURS3-REQ-025`; `SURS3-REQ-026`; `SURS3-REQ-027`; `SURS3-REQ-028`; `SURS3-REQ-029`; `SURS3-REQ-030`; `SURS3-REQ-031`; `SURS3-REQ-032`; `SURS3-REQ-033`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-036`; `SURS3-REQ-037`; `SURS3-REQ-038`; `SURS3-REQ-039`; `SURS3-REQ-040`; `SURS3-REQ-041`; `SURS3-REQ-042`; `SURS3-REQ-043`; `SURS3-REQ-044`.

2.45.5 `sourceBasis`: `SRC-SURS2-FINDINGS#SURS2-HR-F019`.

## 2.46 `SURS3-REQ-046` — Detached QA, hostile review and two-generation Acceptance

2.46.1 `statement`: define Producer QA, independent structural and security reviews, reconciliation, veto and detached exact-root Acceptance as separate immutable envelopes; require controlled Generation A and Generation B with distinct subject roots, one declared Delta, exact affected Set, stale-A receipt rejection, Generation-B recovery and offline replay; conformance generations issue no formal authority.

2.46.2 `defect/cause/impact`: a correlated or single generation can repeat defects, reuse stale receipts or accept an undefined mutation corpus, and same-generation Acceptance creates self-authority.

2.46.3 `proof/predicate`: all 70 frozen tests pass in both eligible generations; A receipts accepted by B equal zero; B bytes, roots, terminals and affected Set replay identically; self, same-owner, same-library, same-envelope, unauthorized, expired or revoked acceptance is rejected; dangling, duplicate, orphan, Public prohibited content, family gaps and open P0, P1 and P2 all equal zero, otherwise REVIEW-BLOCKED.

2.46.4 `dependencies`: `SURS3-REQ-001`; `SURS3-REQ-002`; `SURS3-REQ-003`; `SURS3-REQ-004`; `SURS3-REQ-005`; `SURS3-REQ-006`; `SURS3-REQ-007`; `SURS3-REQ-008`; `SURS3-REQ-009`; `SURS3-REQ-010`; `SURS3-REQ-011`; `SURS3-REQ-012`; `SURS3-REQ-013`; `SURS3-REQ-014`; `SURS3-REQ-015`; `SURS3-REQ-016`; `SURS3-REQ-017`; `SURS3-REQ-018`; `SURS3-REQ-019`; `SURS3-REQ-020`; `SURS3-REQ-021`; `SURS3-REQ-022`; `SURS3-REQ-023`; `SURS3-REQ-024`; `SURS3-REQ-025`; `SURS3-REQ-026`; `SURS3-REQ-027`; `SURS3-REQ-028`; `SURS3-REQ-029`; `SURS3-REQ-030`; `SURS3-REQ-031`; `SURS3-REQ-032`; `SURS3-REQ-033`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-036`; `SURS3-REQ-037`; `SURS3-REQ-038`; `SURS3-REQ-039`; `SURS3-REQ-040`; `SURS3-REQ-041`; `SURS3-REQ-042`; `SURS3-REQ-043`; `SURS3-REQ-044`; `SURS3-REQ-045`.

2.46.5 `sourceBasis`: `SRC-V2#SURS-026`.

# 3. Lossless v2 preservation crosswalk

## 3.1 Contract and mappings

3.1.1 preservation means every material rule, cause, proof direction and safe-failure intent from the exact v2 row remains represented; v3 may reorder producers to remove cycles but may not erase the predecessor obligation.

| preservationId | exact v2 token | dedicated v3 requirement | disposition |
|---|---|---|---|
| `V2P-001` | `SRC-V2#SURS-001` | `SURS3-REQ-007` | preserved and strengthened; independent proof pending |
| `V2P-002` | `SRC-V2#SURS-002` | `SURS3-REQ-004` | preserved and strengthened; independent proof pending |
| `V2P-003` | `SRC-V2#SURS-003` | `SURS3-REQ-005` | preserved and strengthened; independent proof pending |
| `V2P-004` | `SRC-V2#SURS-004` | `SURS3-REQ-009` | preserved and strengthened; independent proof pending |
| `V2P-005` | `SRC-V2#SURS-005` | `SURS3-REQ-011` | preserved and strengthened; independent proof pending |
| `V2P-006` | `SRC-V2#SURS-006` | `SURS3-REQ-012` | preserved and strengthened; independent proof pending |
| `V2P-007` | `SRC-V2#SURS-007` | `SURS3-REQ-013` | preserved and strengthened; independent proof pending |
| `V2P-008` | `SRC-V2#SURS-008` | `SURS3-REQ-021` | preserved and strengthened; independent proof pending |
| `V2P-009` | `SRC-V2#SURS-009` | `SURS3-REQ-015` | preserved and strengthened; independent proof pending |
| `V2P-010` | `SRC-V2#SURS-010` | `SURS3-REQ-023` | preserved and strengthened; independent proof pending |
| `V2P-011` | `SRC-V2#SURS-011` | `SURS3-REQ-017` | preserved and strengthened; independent proof pending |
| `V2P-012` | `SRC-V2#SURS-012` | `SURS3-REQ-016` | preserved and strengthened; independent proof pending |
| `V2P-013` | `SRC-V2#SURS-013` | `SURS3-REQ-024` | preserved and strengthened; independent proof pending |
| `V2P-014` | `SRC-V2#SURS-014` | `SURS3-REQ-025` | preserved and strengthened; independent proof pending |
| `V2P-015` | `SRC-V2#SURS-015` | `SURS3-REQ-026` | preserved and strengthened; independent proof pending |
| `V2P-016` | `SRC-V2#SURS-016` | `SURS3-REQ-027` | preserved and strengthened; independent proof pending |
| `V2P-017` | `SRC-V2#SURS-017` | `SURS3-REQ-029` | preserved and strengthened; independent proof pending |
| `V2P-018` | `SRC-V2#SURS-018` | `SURS3-REQ-019` | preserved and strengthened; independent proof pending |
| `V2P-019` | `SRC-V2#SURS-019` | `SURS3-REQ-030` | preserved and strengthened; independent proof pending |
| `V2P-020` | `SRC-V2#SURS-020` | `SURS3-REQ-031` | preserved and strengthened; independent proof pending |
| `V2P-021` | `SRC-V2#SURS-021` | `SURS3-REQ-020` | preserved and strengthened; independent proof pending |
| `V2P-022` | `SRC-V2#SURS-022` | `SURS3-REQ-036` | preserved and strengthened; independent proof pending |
| `V2P-023` | `SRC-V2#SURS-023` | `SURS3-REQ-034` | preserved and strengthened; independent proof pending |
| `V2P-024` | `SRC-V2#SURS-024` | `SURS3-REQ-040` | preserved and strengthened; independent proof pending |
| `V2P-025` | `SRC-V2#SURS-025` | `SURS3-REQ-041` | preserved and strengthened; independent proof pending |
| `V2P-026` | `SRC-V2#SURS-026` | `SURS3-REQ-046` | preserved and strengthened; independent proof pending |

3.1.2 exact v2 rows mapped=`26/26`; duplicate v2 mappings=`0`; unmapped v2 rows=`0`; merged v2 identities=`0`; accepted preservation proofs=`0/26`.

# 4. One-to-one closure of the twenty v2-review findings

## 4.1 Dedicated closure mappings

4.1.1 every new reviewer Finding has one and only one dedicated atomic closure requirement; another row may depend on it but never shares its closure identity.

| closureId | exact reviewer token | dedicated v3 requirement | semantic translation |
|---|---|---|---|
| `NFC-001` | `SRC-SURS2-FINDINGS#SURS2-HR-F001` | `SURS3-REQ-001` | FULL candidate; evidentiary Acceptance pending |
| `NFC-002` | `SRC-SURS2-FINDINGS#SURS2-HR-F002` | `SURS3-REQ-008` | FULL candidate; evidentiary Acceptance pending |
| `NFC-003` | `SRC-SURS2-FINDINGS#SURS2-HR-F003` | `SURS3-REQ-006` | FULL candidate; evidentiary Acceptance pending |
| `NFC-004` | `SRC-SURS2-FINDINGS#SURS2-HR-F004` | `SURS3-REQ-010` | FULL candidate; evidentiary Acceptance pending |
| `NFC-005` | `SRC-SURS2-FINDINGS#SURS2-HR-F005` | `SURS3-REQ-044` | FULL candidate; evidentiary Acceptance pending |
| `NFC-006` | `SRC-SURS2-FINDINGS#SURS2-HR-F006` | `SURS3-REQ-014` | FULL candidate; evidentiary Acceptance pending |
| `NFC-007` | `SRC-SURS2-FINDINGS#SURS2-HR-F007` | `SURS3-REQ-022` | FULL candidate; evidentiary Acceptance pending |
| `NFC-008` | `SRC-SURS2-FINDINGS#SURS2-HR-F008` | `SURS3-REQ-039` | FULL candidate; evidentiary Acceptance pending |
| `NFC-009` | `SRC-SURS2-FINDINGS#SURS2-HR-F009` | `SURS3-REQ-018` | FULL candidate; evidentiary Acceptance pending |
| `NFC-010` | `SRC-SURS2-FINDINGS#SURS2-HR-F010` | `SURS3-REQ-038` | FULL candidate; evidentiary Acceptance pending |
| `NFC-011` | `SRC-SURS2-FINDINGS#SURS2-HR-F011` | `SURS3-REQ-028` | FULL candidate; evidentiary Acceptance pending |
| `NFC-012` | `SRC-SURS2-FINDINGS#SURS2-HR-F012` | `SURS3-REQ-002` | FULL candidate; evidentiary Acceptance pending |
| `NFC-013` | `SRC-SURS2-FINDINGS#SURS2-HR-F013` | `SURS3-REQ-032` | FULL candidate; evidentiary Acceptance pending |
| `NFC-014` | `SRC-SURS2-FINDINGS#SURS2-HR-F014` | `SURS3-REQ-033` | FULL candidate; evidentiary Acceptance pending |
| `NFC-015` | `SRC-SURS2-FINDINGS#SURS2-HR-F015` | `SURS3-REQ-037` | FULL candidate; evidentiary Acceptance pending |
| `NFC-016` | `SRC-SURS2-FINDINGS#SURS2-HR-F016` | `SURS3-REQ-035` | FULL candidate; evidentiary Acceptance pending |
| `NFC-017` | `SRC-SURS2-FINDINGS#SURS2-HR-F017` | `SURS3-REQ-043` | FULL candidate; evidentiary Acceptance pending |
| `NFC-018` | `SRC-SURS2-FINDINGS#SURS2-HR-F018` | `SURS3-REQ-042` | FULL candidate; evidentiary Acceptance pending |
| `NFC-019` | `SRC-SURS2-FINDINGS#SURS2-HR-F019` | `SURS3-REQ-045` | FULL candidate; evidentiary Acceptance pending |
| `NFC-020` | `SRC-SURS2-FINDINGS#SURS2-HR-F020` | `SURS3-REQ-003` | FULL candidate; evidentiary Acceptance pending |

4.1.2 direct dedicated mappings=`20/20`; Finding identities merged=`0`; semantic ranges=`0`; missing remediation clauses=`0`; accepted evidentiary closures=`0/20`.

# 5. Preservation of the thirty-two predecessor-Finding translations

## 5.1 Exact mappings

5.1.1 each predecessor Finding token is resolved by the frozen index and maps to an explicit v3 requirement Set; no shorthand range or inherited credit is permitted.

| crosswalkId | exact predecessor token | explicit v3 requirement Set | disposition |
|---|---|---|---|
| `PCW-001` | `SRC-SURS1-FINDINGS#SURS-HR-F001` | `SURS3-REQ-007`; `SURS3-REQ-008` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-002` | `SRC-SURS1-FINDINGS#SURS-HR-F002` | `SURS3-REQ-001`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-046` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-003` | `SRC-SURS1-FINDINGS#SURS-HR-F003` | `SURS3-REQ-004`; `SURS3-REQ-005` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-004` | `SRC-SURS1-FINDINGS#SURS-HR-F004` | `SURS3-REQ-009`; `SURS3-REQ-010`; `SURS3-REQ-026` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-005` | `SRC-SURS1-FINDINGS#SURS-HR-F005` | `SURS3-REQ-011`; `SURS3-REQ-044` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-006` | `SRC-SURS1-FINDINGS#SURS-HR-F006` | `SURS3-REQ-012`; `SURS3-REQ-044` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-007` | `SRC-SURS1-FINDINGS#SURS-HR-F007` | `SURS3-REQ-013`; `SURS3-REQ-014`; `SURS3-REQ-021`; `SURS3-REQ-022` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-008` | `SRC-SURS1-FINDINGS#SURS-HR-F008` | `SURS3-REQ-015`; `SURS3-REQ-016`; `SURS3-REQ-022`; `SURS3-REQ-042` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-009` | `SRC-SURS1-FINDINGS#SURS-HR-F009` | `SURS3-REQ-023`; `SURS3-REQ-039`; `SURS3-REQ-041`; `SURS3-REQ-042` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-010` | `SRC-SURS1-FINDINGS#SURS-HR-F010` | `SURS3-REQ-014`; `SURS3-REQ-023`; `SURS3-REQ-039` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-011` | `SRC-SURS1-FINDINGS#SURS-HR-F011` | `SURS3-REQ-017`; `SURS3-REQ-018` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-012` | `SRC-SURS1-FINDINGS#SURS-HR-F012` | `SURS3-REQ-016`; `SURS3-REQ-024`; `SURS3-REQ-038` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-013` | `SRC-SURS1-FINDINGS#SURS-HR-F013` | `SURS3-REQ-016`; `SURS3-REQ-024`; `SURS3-REQ-038`; `SURS3-REQ-045` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-014` | `SRC-SURS1-FINDINGS#SURS-HR-F014` | `SURS3-REQ-025`; `SURS3-REQ-026`; `SURS3-REQ-038` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-015` | `SRC-SURS1-FINDINGS#SURS-HR-F015` | `SURS3-REQ-009`; `SURS3-REQ-010`; `SURS3-REQ-026` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-016` | `SRC-SURS1-FINDINGS#SURS-HR-F016` | `SURS3-REQ-027`; `SURS3-REQ-028`; `SURS3-REQ-040`; `SURS3-REQ-043` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-017` | `SRC-SURS1-FINDINGS#SURS-HR-F017` | `SURS3-REQ-027`; `SURS3-REQ-028` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-018` | `SRC-SURS1-FINDINGS#SURS-HR-F018` | `SURS3-REQ-029`; `SURS3-REQ-039`; `SURS3-REQ-043` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-019` | `SRC-SURS1-FINDINGS#SURS-HR-F019` | `SURS3-REQ-002`; `SURS3-REQ-019`; `SURS3-REQ-045` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-020` | `SRC-SURS1-FINDINGS#SURS-HR-F020` | `SURS3-REQ-005`; `SURS3-REQ-030`; `SURS3-REQ-020`; `SURS3-REQ-045` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-021` | `SRC-SURS1-FINDINGS#SURS-HR-F021` | `SURS3-REQ-003`; `SURS3-REQ-031`; `SURS3-REQ-032` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-022` | `SRC-SURS1-FINDINGS#SURS-HR-F022` | `SURS3-REQ-001`; `SURS3-REQ-031`; `SURS3-REQ-032` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-023` | `SRC-SURS1-FINDINGS#SURS-HR-F023` | `SURS3-REQ-003`; `SURS3-REQ-013`; `SURS3-REQ-014`; `SURS3-REQ-021`; `SURS3-REQ-022`; `SURS3-REQ-020`; `SURS3-REQ-035` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-024` | `SRC-SURS1-FINDINGS#SURS-HR-F024` | `SURS3-REQ-020`; `SURS3-REQ-033`; `SURS3-REQ-040`; `SURS3-REQ-043` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-025` | `SRC-SURS1-FINDINGS#SURS-HR-F025` | `SURS3-REQ-011`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-036`; `SURS3-REQ-037`; `SURS3-REQ-044` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-026` | `SRC-SURS1-FINDINGS#SURS-HR-F026` | `SURS3-REQ-013`; `SURS3-REQ-014`; `SURS3-REQ-034` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-027` | `SRC-SURS1-FINDINGS#SURS-HR-F027` | `SURS3-REQ-001`; `SURS3-REQ-034`; `SURS3-REQ-035`; `SURS3-REQ-046` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-028` | `SRC-SURS1-FINDINGS#SURS-HR-F028` | `SURS3-REQ-033`; `SURS3-REQ-040`; `SURS3-REQ-043` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-029` | `SRC-SURS1-FINDINGS#SURS-HR-F029` | `SURS3-REQ-039`; `SURS3-REQ-041`; `SURS3-REQ-042`; `SURS3-REQ-043` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-030` | `SRC-SURS1-FINDINGS#SURS-HR-F030` | `SURS3-REQ-045`; `SURS3-REQ-046` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-031` | `SRC-SURS1-FINDINGS#SURS-HR-F031` | `SURS3-REQ-002`; `SURS3-REQ-045`; `SURS3-REQ-046` | translation preserved and strengthened; evidentiary Acceptance pending |
| `PCW-032` | `SRC-SURS1-FINDINGS#SURS-HR-F032` | `SURS3-REQ-004`; `SURS3-REQ-016`; `SURS3-REQ-027`; `SURS3-REQ-028` | translation preserved and strengthened; evidentiary Acceptance pending |

5.1.2 exact predecessor Finding mappings=`32/32`; unresolved predecessor tokens=`0`; semantic ranges=`0`; accepted evidentiary closures=`0/32`.

# 6. Exact producer-consumer and dependency DAG contract

## 6.1 Normative object producers

| canonical object | sole normative producer |
|---|---|
| SourceReferenceIndex | `SURS3-REQ-001` |
| ExternalBootstrapEnvelope and authority roots | `SURS3-REQ-002` |
| TerminalRegistry | `SURS3-REQ-003` |
| authority and evidence registries | `SURS3-REQ-004` |
| precedence reducer | `SURS3-REQ-005` |
| producer-consumer inventory | `SURS3-REQ-006` |
| DiscoveryInputSet and SourceCandidateUniverse | `SURS3-REQ-007` |
| FrontierLedger | `SURS3-REQ-008` |
| GitRepositoryIdentity, GitSnapshot and WorkingTreeOverlay | `SURS3-REQ-009` |
| hostile Git object-availability profile | `SURS3-REQ-010` |
| discovery-family registry | `SURS3-REQ-011` |
| exclusion and exception disposition | `SURS3-REQ-012` |
| SourceCandidate | `SURS3-REQ-013` |
| Public identity projection and current-state snapshot | `SURS3-REQ-014` |
| RawCustodyCandidate and derivative custody events | `SURS3-REQ-015` |
| raw and derivative provenance graph | `SURS3-REQ-016` |
| ingestion state machine | `SURS3-REQ-017` |
| recursive taint and safe-fetch policy | `SURS3-REQ-018` |
| Person, Role, Appointment and Approval | `SURS3-REQ-019` |
| SelectionAssertionEvent | `SURS3-REQ-020` |
| AdmittedSource | `SURS3-REQ-021` |
| admission-axis table | `SURS3-REQ-022` |
| Public-safe source policy | `SURS3-REQ-023` |
| media locator registry | `SURS3-REQ-024` |
| implementation loader registry and graph | `SURS3-REQ-025` |
| implementation snapshot | `SURS3-REQ-026` |
| FetchObservation | `SURS3-REQ-027` |
| freshness and residual-uncertainty policy | `SURS3-REQ-028` |
| ProviderReceipt | `SURS3-REQ-029` |
| DecisionEvent reducer | `SURS3-REQ-030` |
| D31 exact claim record | `SURS3-REQ-031` |
| D31 failure table | `SURS3-REQ-032` |
| claim-closure oracle | `SURS3-REQ-033` |
| CandidateSet, AdmittedSourceSet and SourceSet roots | `SURS3-REQ-034` |
| SourceSet relation registry | `SURS3-REQ-035` |
| source denominators | `SURS3-REQ-036` |
| projection equations | `SURS3-REQ-037` |
| locator and loader coverage equations | `SURS3-REQ-038` |
| PublicEgressGraph | `SURS3-REQ-039` |
| base invalidation graph | `SURS3-REQ-040` |
| archive and replay policy | `SURS3-REQ-041` |
| erasure-safe replay policy | `SURS3-REQ-042` |
| closed trigger registry and fenced publication | `SURS3-REQ-043` |
| derived family closure | `SURS3-REQ-044` |
| independence matrix and finite test binding | `SURS3-REQ-045` |
| detached Acceptance envelope | `SURS3-REQ-046` |

## 6.2 Mechanical DAG invariants

6.2.1 node count=`46`; declared edge count=`336`; topological order is the exact numeric order printed in Section 2.

6.2.2 unknown dependency IDs=`0`; self dependencies=`0`; duplicate edges within a row=`0`; forward dependencies=`0`; syntactic cycles=`0`.

6.2.3 semantic rule=`a consumer may use only an object from the sole producer table after declaring that producer directly or through a complete transitive dependency path; independent extraction must report zero hidden producer edges and zero hidden cycles`.

6.2.4 deleted-edge, swapped-producer and future-producer mutations each return `DEPENDENCY-CLOSURE-BLOCKED`.

# 7. Two-generation and evidentiary-closure policy

## 7.1 Controlled proof

7.1.1 Generation A and Generation B are detached conformance generations under the external Bootstrap and accepted review protocol; neither can approve itself, create a ProtocolUsePermit or process real Product work.

7.1.2 Generation B must have a different exact subject root caused by one declared controlled Delta; the exact affected Set is computed by SURS3-REQ-033 and SURS3-REQ-043; every Generation-A receipt is stale for B.

7.1.3 both generations must pass every immutable test in root `980c27ab127a81ca8dcb0c7ab6b7ad8fdabf857a1d7ba0a9beb09e14ad046e2e`; Generation B must replay byte-identically in two independent envelopes after the controlled failure and recovery.

7.1.4 requirement translation, test PASS, review reconciliation, eligible human Approval and protected detached Acceptance are distinct predicates; no counter below may be promoted by direct ID presence alone.

# 8. Current disposition

## 8.1 Counters and safe next action

8.1.1 requirement denominator=`46`; currently accepted requirements=`0/46`.

8.1.2 v2 preservation candidates=`26/26`; new reviewer-Finding translations=`20/20`; predecessor-Finding translations=`32/32`; evidentiary closures accepted=`0/26, 0/20 and 0/32 respectively`.

8.1.3 SourceReferenceIndex targets=`79`; indexed occurrences=`80`; finite tests=`70`; tests executed=`0/70`; tests accepted=`0/70`.

8.1.4 external Bootstrap envelopes accepted=`0/1`; accepted review-protocol roots available to this candidate=`0/1`; two-generation proof accepted=`0/1`.

8.1.5 earliest safe next action=`mechanical Producer QA of this exact root, followed by independent hostile review without using Producer QA as closure authority; any blocker requires an immutable successor rather than patching the reviewed root`.

8.1.6 exact SourceCandidate, Product Requirement, Program Task, Product completion, remaining-hour and ETA denominators remain `unknown/unavailable`.

8.1.7 Gate29=`BLOCKED`; development freeze=`ACTIVE`; Public-repository requirement=`UNCHANGED`.

8.1.8 no source ingestion, Product extraction, Product/Git/Build/test/Push/Deploy/provider/account/credential action is authorized.
