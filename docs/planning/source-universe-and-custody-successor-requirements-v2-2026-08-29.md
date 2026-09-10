# 1. Connect — Source-universe and custody successor requirements v2

## 1.1 Identity and limits

1.1.1 `artifactId=CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29`.

1.1.2 `requirementsVersion=SURS-2.0-draft`.

1.1.3 status=`AUTHORING-SUCCESSOR-CANDIDATE; NOT-INDEPENDENTLY-REVIEWED; NOT-ACCEPTED`.

1.1.4 inputs include producer Finding root=`8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f`, source-precedence root=`b012a479b18e162f5f759b49e033eb3856a4637cc0e91a8a36f1d06043813342`, rejected SURS-1 root=`f38b23aa130ad1c8ab4157e10e3de73160682d9c79e5decdf1e04c75fd696695`, hostile-review root=`a9c479e0b066b781f5d742c63439f94d31811e3949e1823dae6824e5b4a225fa` and findings-manifest root=`a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b`.

1.1.5 this artifact defines planning requirements only. It copies no source, extracts no Product Requirement, creates no Program identity and authorizes no Product/Git/Push/Deploy/provider/credential action.

1.1.6 exact source-universe, Requirement denominator, Product percentage, remaining hours and ETA remain `unknown/unavailable`.

## 1.2 Requirement schema

1.2.1 every `SURS-*` row contains `rule`, `causeAndEffect`, `sourceIds`, `acceptancePredicate` and `dependencies`.

1.2.2 source selection and Evidence sufficiency are different predicates; file presence never proves authority or correctness.

1.2.3 every literal source reference must resolve through a frozen `SourceReferenceIndex` to one artifact ID, exact root, locator and bounded claim, with an inverse source-to-SURS index; shorthand ranges receive zero coverage credit.

# 2. Universe, authority and discovery

## 2.1 `SURS-001` — Separate source Candidate universe from admitted set

2.1.1 `rule`: define one finite canonical `DiscoveryInputSet` with exact seed records, repository/external boundaries, traversal grammar/depth, URI-follow policy, cutoff instant and terminal policy; derive `SourceCandidateUniverse` only from that closed input, and derive `AdmittedSourceSet` as an independently selected finite subset.

2.1.2 `causeAndEffect`: starting from known documents omits sources, while defining the universe as “everything discovered” makes completeness depend circularly on the run claiming it.

2.1.3 `sourceIds`: `TRD2-PQA-P0-004`; `TRD2-REQ-001`; `SURS-HR-F001`.

2.1.4 `acceptancePredicate`: two independent discoverers on the same frozen inputs/policy return byte-identical sorted IDs and terminals; every traversable edge is visited or reaches typed blocking Unknown; adding one unvisited eligible edge fails completeness; no candidate disappears between discovery and selection.

2.1.5 `dependencies`: `none`.

## 2.2 `SURS-002` — Authority class is orthogonal to evidence role

2.2.1 `rule`: publish closed typed registries for authority class, evidence role, subject-key grammar, canonical field path, Scope, entity, environment, provider, region, effective interval and claim predicate; authority and Evidence role remain orthogonal.

2.2.2 `causeAndEffect`: without closed types, the same source can receive different authority, role or subject interpretation; code bytes and provider documentation can be mistaken for intent or entitlement.

2.2.3 `sourceIds`: `CONNECT-USER-DIRECTIVE-AND-SOURCE-PRECEDENCE-LEDGER-2026-08-29`; `TRD2-REQ-016`; `TRD2-REQ-022`; `SURS-HR-F003`; `SURS-HR-F032`.

2.2.4 `acceptancePredicate`: every admitted source has valid typed authority, role, subject and claim limits; `byteIdentity,provenanceAuthenticity,authority,freshness,sufficiency` are separate predicates and no transition derives one solely from another.

2.2.5 `dependencies`: `SURS-001`.

## 2.3 `SURS-003` — Exact-subject precedence

2.3.1 `rule`: define a total deterministic precedence/conflict algorithm over the exact typed claim fields from SURS-002, including equal, disjoint, nested, partial, expired, future and incomparable claims; recency alone is insufficient and incomparable authority blocks.

2.3.2 `causeAndEffect`: undefined overlap and interval semantics can let a narrow Public-repository amendment rewrite unrelated controls or let two evaluators choose different winners.

2.3.3 `sourceIds`: `CONNECT-USER-DIRECTIVE-AND-SOURCE-PRECEDENCE-LEDGER-2026-08-29`; `TRD2-REQ-020`; `TRD2-REQ-025`; `SURS-HR-F003`.

2.3.4 `acceptancePredicate`: two independent evaluators return byte-identical results for the rooted overlap corpus; D18-A2 selects Public only for visibility; every predecessor/unaffected field is reconstructible; ambiguous or incomparable overlap reaches `AUTHORITY-CONFLICT-BLOCKED`.

2.3.5 `dependencies`: `SURS-002`.

## 2.4 `SURS-004` — Deterministic discovery roots

2.4.1 `rule`: define versioned `GitRepositoryIdentity`, `GitSnapshot` and `WorkingTreeOverlay` schemas covering object format, common-dir/worktree, commit, tree, index stages, deletions, modes, symlinks, submodules, LFS pointers/objects, sparse checkout, ignored/untracked policy, Unicode/case collision, external paths and separately authenticated remote/ref observations.

2.4.2 `causeAndEffect`: running from the outer repository or omitting a Git/index/LFS/overlay state can create the wrong universe or hide unsafe bytes.

2.4.3 `sourceIds`: `MSSA-F013`; `TRD2-REQ-014`; `TRD2-REQ-053`; `SURS-HR-F004`; `SURS-HR-F015`.

2.4.4 `acceptancePredicate`: two independent readers reconstruct identical membership, metadata, tree/overlay roots and toolchain-binding inputs for every supported fixture; product and outer roots remain distinct; moving a remote ref invalidates only that observation; every unsupported state blocks instead of disappearing.

2.4.5 `dependencies`: `SURS-001`.

## 2.5 `SURS-005` — Discovery families

2.5.1 `rule`: use a rooted extensible family registry and classifier precedence covering conversation directives, attachments/specifications, Decisions/amendments, ADR/policy/runbook, registries/contracts, schemas/migrations, code/runtime/config, tests/Evidence, dependency/lock/workflow/package/license/security-advisory, tickets/collaboration, deployed-state, live database/catalog, official dynamic/provider/legal sources and media extensions.

2.5.2 `causeAndEffect`: a binding or risk-bearing source can otherwise remain outside every denominator even when document and code families are scanned.

2.5.3 `sourceIds`: `TRD2-PQA-P0-004`; `TRD2-PQA-P1-003`; `SREQ-034`; `SURS-HR-F005`.

2.5.4 `acceptancePredicate`: every candidate maps to exactly one primary family plus allowed secondary tags or `UNKNOWN_FAMILY_QUARANTINED`; each family has derived members/counts and explicit zero reason; unknown extension cannot be admitted or omitted silently.

2.5.5 `dependencies`: `SURS-004`.

## 2.6 `SURS-006` — Excluded generated/cache/dependency classes

2.6.1 `rule`: define rooted exclusion predicates and ordered exception rules for dependencies, build/cache/coverage/temp/OS/generated paths, authored files within generated paths, symlinks and third-party Evidence; record origin, license/redistribution and security-advisory disposition for every exception.

2.6.2 `causeAndEffect`: a vague path exclusion can discard first-party authority, follow a symlink escape or promote third-party/derived bytes while missing license obligations.

2.6.3 `sourceIds`: `MPSA-20260829-P0-005`; `TRD2-REQ-016`; `SURS-HR-F006`.

2.6.4 `acceptancePredicate`: two classifiers return identical included/excluded/quarantined outcomes on the rooted path/provenance corpus; ambiguous origin, license or symlink escape blocks; every exception has exact root/claim/license limit; ignored source-like files are surfaced.

2.6.5 `dependencies`: `SURS-004`; `SURS-005`.

# 3. Source records, custody and safety

## 3.1 `SURS-007` — Total SourceCandidate record

3.1.1 `rule`: publish a versioned machine-readable `SourceCandidate` schema with closed enums, required/optional/typed-Unknown rules, deterministic ID preimage, canonical serialization and domain-separated digest for repository/custody identity, locator, media, raw size/root, discovery, ownership, candidate authority/roles, availability, confidentiality and four orthogonal state axes.

3.1.2 `causeAndEffect`: prose fields cannot support deterministic equality, duplicate detection, sorting, hashing or valid treatment of Unknown and compound state.

3.1.3 `sourceIds`: `TRD2-REQ-016`; `SREQ-007`; `SURS-HR-F007`; `SURS-HR-F023`.

3.1.4 `acceptancePredicate`: two independent implementations emit exact expected bytes/roots for valid and invalid vectors; every record has one valid `SelectionState`, `AvailabilityState`, `LifecycleState` and `SafetyState` combination with append-only transitions; aliases resolve explicitly; no arbitrary counter, `Math.random()` or unapproved randomness.

3.1.5 `dependencies`: `SURS-001`; `SURS-004`.

## 3.2 `SURS-008` — Admitted Source record

3.2.1 `rule`: publish a versioned machine-readable `AdmittedSource` schema that references one Candidate version and adds typed authority scope, subject keys, effective/expiry/change triggers, supersession/conflict edges, custody, locator profile, claim limit, safe state and current selection-event root without collapsing availability, lifecycle or safety state.

3.2.2 `causeAndEffect`: presence does not establish authority, and one exactly-one disposition cannot represent an admitted historical source that later becomes unavailable, superseded or quarantined.

3.2.3 `sourceIds`: `TRD2-REQ-016`; `SREQ-006`; `SREQ-007`; `SURS-HR-F007`; `SURS-HR-F023`.

3.2.4 `acceptancePredicate`: every admission has a current authorized selection-event root and independent review; state-transition corpus preserves all valid axes/history and rejects impossible combinations; missing authority/custody remains `AUTHORITY_UNKNOWN` or quarantined, never invented.

3.2.5 `dependencies`: `SURS-002`; `SURS-007`.

## 3.3 `SURS-009` — External source custody

3.3.1 `rule`: define separate immutable `RawCustodyObject`, `DerivedPrivateObject` and `DerivedPublicObject` identities; authenticated provenance/authorization receipts and append-only custody events bind acquisition actor/time/method, original root, immutable-storage Evidence, derivative tool/profile, redaction and every custody transition.

3.3.2 `causeAndEffect`: an external attachment can disappear or be forged; equating raw and redacted roots makes legitimate derivatives impossible and mutable custody look authoritative.

3.3.3 `sourceIds`: `CONNECT-G0-OBSERVED-BASELINE-CANDIDATE-2026-08-29#2.4`; `TRD2-REQ-062`; `SURS-HR-F008`.

3.3.4 `acceptancePredicate`: Raw-custody readback equals the captured original root; each derivative has its own root and exact parent/tool edge; missing authorization, authenticated provenance or immutable-storage Evidence yields `SOURCE-CUSTODY-BLOCKED`; mutation or silent copy fails.

3.3.5 `dependencies`: `SURS-007`; `SURS-008`.

## 3.4 `SURS-010` — Public-safe source handling

3.4.1 `rule`: define a complete `PublicEgressSurface` covering pre-ingest buffers, workspace paths, Git objects/history/index/stash/refs/tags/forks/LFS, CI logs/artifacts/caches, Issues/PRs, releases/packages/assets, previews, filenames, URIs and tool output; apply rooted Secret/PII/customer/provider/proprietary/license classification and minimization in isolated pre-content quarantine before any public-system write.

3.4.2 `causeAndEffect`: prohibited bytes or metadata can leak through history, CI or collaboration surfaces without appearing in the final Public workspace path.

3.4.3 `sourceIds`: `CONNECT-D18-A2-PUBLIC-REPOSITORY-SECURITY-DECISION-2026-08-29`; `MSSA-F014`; `TRD2-REQ-052`; `TRD2-REQ-053`; `SURS-HR-F009`; `SURS-HR-F010`.

3.4.4 `acceptancePredicate`: rooted positive/negative corpus places prohibited values in every egress surface and is blocked before egress with redacted Evidence only; admitted snapshot Git objects/LFS/CI/release/metadata contain zero prohibited objects; every public derivative passes re-identification, metadata, quotation/license and independent-approval checks and resolves to a protected original reference.

3.4.5 `dependencies`: `SURS-003`; `SURS-009`.

## 3.5 `SURS-011` — Untrusted-content boundary

3.5.1 `rule`: use an allowlisted no-network-by-default ingestion state machine with bounded CPU/memory/time/output, isolated filesystem, safe URL fetcher, redirect/SSRF policy, archive and active-document handling, MIME/content validation, malware-scanner decision and typed quarantine for source text, HTML, PDF, office/archive/media, links, comments, fixtures and provider content.

3.5.2 `causeAndEffect`: discovery or parsing can trigger prompt/authority injection, SSRF, redirects, traversal, decompression bomb, macro/XXE/polyglot/parser exploit, credential access or resource exhaustion before quarantine.

3.5.3 `sourceIds`: `TRD2-REQ-030`; `TRD2-REQ-052`; `SURS-HR-F011`.

3.5.4 `acceptancePredicate`: rooted malicious corpus covering prompt injection, SSRF/redirect, traversal, archive bomb, macro, XXE, polyglot, malformed parser input and embedded credential causes no external request, escape, execution, secret read or authority transition and reaches the exact terminal within fixed limits.

3.5.5 `dependencies`: `SURS-007`; `SURS-010`.

# 4. Locators and source-specific verification

## 4.1 `SURS-012` — Raw-byte fidelity and derivative provenance

4.1.1 `rule`: preserve raw byte identity and bind every decoded, extracted, rendered, OCR or indexed derivative to the raw object through exact provenance/tool/profile roots; raw byte identity never implies publisher authenticity, authority, freshness or claim sufficiency.

4.1.2 `causeAndEffect`: normalization can change meaning, while wording raw bytes as “authoritative” can falsely promote a faithful copy into an approved or genuine source.

4.1.3 `sourceIds`: `SREQ-003`; `SREQ-008`; `SREQ-009`; `SREQ-010`; `SURS-HR-F008`; `SURS-HR-F032`.

4.1.4 `acceptancePredicate`: derivative readback reaches the exact parent raw root; byte change invalidates locators; the five predicates `byteIdentity,provenanceAuthenticity,authority,freshness,sufficiency` remain distinct and none is derived solely from byte identity.

4.1.5 `dependencies`: `SURS-007`.

## 4.2 `SURS-013` — Media-specific locator profiles

4.2.1 `rule`: publish a rooted media-profile registry with one raw digest profile and canonical locator schemas for text, PDF page box/rotation, code/config syntax node, database/migration, web capture/selector, DOCX/package part, raster/OCR, audio/video timecode, email/chat message, API/JSON, archive member and every admitted extension; define byte/decoded coordinate unit/origin, parser version and unsupported terminal.

4.2.2 `causeAndEffect`: whole-file labels and underspecified coordinates cannot reconstruct an exact statement across tools or admitted media types.

4.2.3 `sourceIds`: `TRD2-REQ-017`; `SREQ-008`; `SREQ-009`; `SURS-HR-F012`; `SURS-HR-F013`.

4.2.4 `acceptancePredicate`: two independent hermetic resolver envelopes with separately rooted executable/dependency/font/locale environments reconstruct identical raw spans and canonical outputs or the same typed ambiguity; unsupported/moved/mismatched locator fails closed; environment perturbation invalidates the derivative.

4.2.5 `dependencies`: `SURS-012`.

## 4.3 `SURS-014` — Dependency-graph implementation inventory

4.3.1 `rule`: publish a closed implementation-language/loader and boundary-policy registry covering TypeScript/JavaScript, framework-implicit entries, exports/conditions, aliases, server actions, workers, config/workflows/shell/SQL loaders, dynamic import/require, generated route manifests and environment-dependent resolution; derive every executable entry and transitive edge under an exact resolution environment.

4.3.2 `causeAndEffect`: two TypeScript-only walks can agree while framework, generated, dynamic or other loader paths hide a server-only Secret consumer or forbidden Client edge.

4.3.3 `sourceIds`: `TRD2-PQA-P1-003`; `MSSA-F019`; `TRD2-REQ-030`; `SURS-HR-F014`.

4.3.4 `acceptancePredicate`: two independent engines return identical rooted mixed-loader graphs; every executable entry/transitive edge is classified; hidden/dynamic/unsupported edge yields blocking Unknown and every forbidden-boundary mutation fails admission.

4.3.5 `dependencies`: `SURS-004`; `SURS-005`; `SURS-013`.

## 4.4 `SURS-015` — Current implementation snapshot is Evidence, not intent

4.4.1 `rule`: bind observed code/docs/schema/routes/tests/dependencies/config/workflows to exact GitRepositoryIdentity, commit/tree, index/overlay operations, tracked/untracked/generated state, remote/ref observation receipt, lockfiles, package-manager, runtime, toolchain and dependency-resolution profiles; unsupported environmental input is typed Unknown.

4.4.2 `causeAndEffect`: byte-identical sources can behave differently under unbound toolchains, and a moving remote ref can be reported falsely as the pushed state.

4.4.3 `sourceIds`: `MSSA-F013`; `TRD2-REQ-031`; `SURS-002`; `SURS-HR-F004`; `SURS-HR-F015`.

4.4.4 `acceptancePredicate`: offline replay reconstructs identical tree, overlay and resolution graph from exact objects; local and remote observations remain separate; remote move or toolchain change invalidates only affected claims; current code receives no Requirement authority.

4.4.5 `dependencies`: `SURS-004`; `SURS-014`.

# 5. Dynamic, provider, legal and Decision sources

## 5.1 `SURS-016` — Official dynamic-source observation

5.1.1 `rule`: define a canonical `FetchObservation` with approved publisher/domain authority, request method/headers/auth class, redirect chain/restrictions, final URI, status, cache/content-encoding validation, raw response/root, trusted clock, locale, version/effective date, claim-specific TTL/recheck policy and `Fresh,Grace,Stale,Unavailable,AuthenticityUnknown` states.

5.1.2 `causeAndEffect`: stale/cached/authentication-error or lookalike content can appear current; a failed refresh or unseen source change may never invalidate downstream use.

5.1.3 `sourceIds`: `MSSA-F012`; `TRD2-REQ-021`; `TRD2-REQ-022`; `SURS-HR-F016`; `SURS-HR-F017`.

5.1.4 `acceptancePredicate`: two evaluators agree on official/mirror/lookalike/cross-domain redirect/locale conflict plus clock-boundary, 200-error-page, 304, encoding, 401/403/404/429/5xx and failed-refresh fixtures; only proven publisher path can carry current-official role; stale/unavailable/authenticity-Unknown content cannot enable capability.

5.1.5 `dependencies`: `SURS-008`; `SURS-012`.

## 5.2 `SURS-017` — Provider account and live entitlement receipts

5.2.1 `rule`: define separate typed private Provider receipts and Public-safe projections for documentation, pseudonymous tenant/account/asset/environment identity, authenticated plan/region/capability/quota/config observation, legal approval and runtime Evidence, with exact subject binding, validity interval, expiry/revocation and source-lifecycle invalidators.

5.2.2 `causeAndEffect`: documentation does not prove entitlement; a receipt from the wrong/expired account can enable a capability or expose private identifiers in the Public repository.

5.2.3 `sourceIds`: `MSSA-F005`; `MSSA-F016`; `TRD2-REQ-022`; `SURS-HR-F018`.

5.2.4 `acceptancePredicate`: wrong-account/asset/environment, expired, revoked or unauthenticated fixtures keep capability OFF; accepted public projection contains no prohibited identifier/credential; receipt expiry invalidates dependent capability; documentation-only state remains OFF.

5.2.5 `dependencies`: `SURS-010`; `SURS-016`; `SURS-024`.

## 5.3 `SURS-018` — Source research and authority approval separation

5.3.1 `rule`: publish rooted Person, Role, Appointment, Delegation and Approval schemas with subject/environment scope, separation of duties, quorum/signature, conflict-of-interest, expiry/revocation and appeal/reconciliation; Researcher may collect/interpret, while only the exact eligible authority set may approve operational use.

5.3.2 `causeAndEffect`: technical recommendation cannot create authority, and an undefined “eligible Appointment” can allow self, expired, delegated or wrong-scope approval.

5.3.3 `sourceIds`: `MSSA-F005`; `MSSA-F023`; `TRD2-REQ-026`; `SURS-HR-F019`.

5.3.4 `acceptancePredicate`: two evaluators agree on valid, self, expired, revoked, delegated, wrong-scope and conflicting approval fixtures; only the valid exact-subject quorum changes authority; missing authority reaches a typed blocking terminal.

5.3.5 `dependencies`: `SURS-002`; `SURS-017`.

## 5.4 `SURS-019` — Decision and amendment discovery

5.4.1 `rule`: define append-only canonical `DecisionEvent` records for D01–D31 and later directives/research/reconciliation, with deterministic Decision/event IDs, exact source locator, authenticated actor/authority, event type, effective interval, prior root and canonical field-level patch; reduce events deterministically into current state without erasing history.

5.4.2 `causeAndEffect`: without a state machine and patch algorithm, duplicate/reordered chat directives and partial amendments can override too much or too little.

5.4.3 `sourceIds`: `TRD2-REQ-019`; `TRD2-REQ-020`; `SREQ-020`; `SREQ-022`; `SURS-HR-F020`.

5.4.4 `acceptancePredicate`: two independent reducers return identical bytes/root for reordered, duplicate, partial, revoked, future and conflicting events; missing source yields Finding; unresolved conflict cannot yield an admitted answer; every amendment is an explicit edge.

5.4.5 `dependencies`: `SURS-003`; `SURS-005`; `SURS-008`.

## 5.5 `SURS-020` — D31 exact-source evaluation

5.5.1 `rule`: evaluate portable source identity `CONNECT-D31-POSTGRESQL-RUNTIME-ROLE-DECISION-CANDIDATE` with raw SHA-256 `8816a77739a17e94cf9ffcbf5a586db00e001d9d5fdff3bd8e801a0e33e79bb0`, canonical repository/custody-relative locator and exact Decision span; absolute path, line count and byte count are non-authoritative observations only.

5.5.2 `causeAndEffect`: absolute path is not portable, whole-file identity is not an exact Decision locator, and durable bytes do not prove authority, conflict resolution or live provisioning.

5.5.3 `sourceIds`: `TRD2-PQA-P1-002`; `SREQ-021`; `SURS-HR-F021`; `SURS-HR-F022`.

5.5.4 `acceptancePredicate`: clean-room resolver reconstructs the exact span/root without the original absolute path; selector verifies authority/amendments/conflicts/scope; complete unconflicted evidence may admit or reject, while valid bytes with missing authority, unresolved amendment or conflict reach `AUTHORITY_UNKNOWN`, `QUARANTINED` or `CONFLICT_BLOCKED` rather than invented certainty.

5.5.5 `dependencies`: `SURS-019`.

# 6. Selection, roots, completeness and lifecycle

## 6.1 `SURS-021` — Source selection assertions

6.1.1 `rule`: define immutable `SelectionAssertionEvent` identity, idempotency key, prior state root, authenticated selector Appointment, rule, subject/claim scope, Evidence/conflicts, event time/expiry and updates to the four orthogonal state machines; reduce an append-only canonical order and traverse a typed claim-dependency graph for minimally conservative disagreement scope.

6.1.2 `causeAndEffect`: informal, duplicate or reordered selection can alter current state, erase history or block too little/much when selectors disagree.

6.1.3 `sourceIds`: `TRD2-REQ-016`; `TRD2-REQ-025`; `SURS-018`; `SURS-HR-F023`; `SURS-HR-F024`.

6.1.4 `acceptancePredicate`: duplicate/reorder/replay yields one state root; unauthorized/tampered event fails; every candidate has one valid current value per state axis; two graph engines return identical minimally conservative affected claims; disagreement stays explicit and blocking.

6.1.5 `dependencies`: `SURS-007`; `SURS-008`; `SURS-018`.

## 6.2 `SURS-022` — Derived denominators by source class

6.2.1 `rule`: bind every report to one CandidateSet snapshot root and publish member-level sets for global CandidateSet, each state axis, discovery family, authority class and evidence role, with explicit union/intersection/disjointness equations and typed Unknown members; multi-tag projections never duplicate a global member.

6.2.2 `causeAndEffect`: overlapping dimensional counts can double count, omit candidates or change between reports while every subtotal appears reconstructible.

6.2.3 `sourceIds`: `TRD2-PQA-P0-004`; `MATH-001`; `MATH-002`; `MATH-031`; `SURS-HR-F025`.

6.2.4 `acceptancePredicate`: member reconstruction satisfies every equation; global union equals CandidateSet exactly; duplicate roles never duplicate global members; all counts share one snapshot; missing projection member or incomplete discovery fails completeness.

6.2.5 `dependencies`: `SURS-005`; `SURS-006`; `SURS-021`.

## 6.3 `SURS-023` — Immutable SourceSet root and dual readback

6.3.1 `rule`: define versioned canonical SourceSet byte grammar with exact field order, UTF-8/NFC and confusable rules, typed null/Unknown, canonical path/URI treatment, bytewise sort key, uniqueness/cardinality, schema-inclusion rules, domain-separated full SHA-256 and typed bidirectional relation graph across CandidateSet, SourceSet, raw/derivative objects, locators, authority/conflict edges, selection events and claim references; exclude self digest, QA, Review, Acceptance and current pointer.

6.3.2 `causeAndEffect`: underspecified serialization creates different roots, while missing inverse relations permit orphan admission/provenance or inflated unreferenced membership.

6.3.3 `sourceIds`: `SREQ-006`; `TRD2-REQ-001`; `TRD2-REQ-002`; `SURS-HR-F002`; `SURS-HR-F026`; `SURS-HR-F027`.

6.3.4 `acceptancePredicate`: two independent canonicalizers and closure walkers return identical bytes, roots, nodes and edges; every source token resolves exactly once with inverse readback; self/dangling/duplicate/orphan/wrong-cardinality/unreachable/cross-snapshot=0; Unicode/path/null/order mutations fail `SOURCE-SET-CONFLICT-BLOCKED`.

6.3.5 `dependencies`: `SURS-008`; `SURS-021`; `SURS-022`.

## 6.4 `SURS-024` — Change invalidation and successor generation

6.4.1 `rule`: define an immutable versioned typed dependency graph and complete trigger registry covering discovery input/policy, raw bytes, membership, provenance/authenticity, availability, confidentiality/safety, authority/Appointment/revocation, Decision, expiry/freshness, locator/tool profile and claim limit; use a deterministic least-fixed-point minimal-conservative affected-set algorithm and atomic successor/current-pointer transaction.

6.4.2 `causeAndEffect`: missing edge/cycle/race or incomplete triggers can leave stale work current or invalidate unrelated work nondeterministically.

6.4.3 `sourceIds`: `SREQ-012`; `TRD2-REQ-061`; `SURS-HR-F016`; `SURS-HR-F018`; `SURS-HR-F024`; `SURS-HR-F028`.

6.4.4 `acceptancePredicate`: two independent graph engines match expected minimal-conservative Sets for trigger, chain, fan-out, missing-edge, cycle and concurrent-successor fixtures; unsupported/Unknown blocks; atomic commit leaves no old Acceptance current; history remains immutable and closure never transfers.

6.4.5 `dependencies`: `SURS-002`; `SURS-007`; `SURS-008`.

## 6.5 `SURS-025` — Archive and offline replay

6.5.1 `rule`: define per-DataClass archive policies for permitted bytes/protected references, locators, profiles, selection/conflict/review/acceptance records, with retention/deletion/Legal Hold, encryption/key custody, access audit, region, license/copyright, private-reference availability and exact Backup/Restore linkage; replay terminals are claim-scope aware.

6.5.2 `causeAndEffect`: disappearing sources prevent replay, while unspecified retention/keys/license can leak private Evidence, violate deletion/Hold or make backups undecryptable.

6.5.3 `sourceIds`: `TRD2-REQ-049`; `TRD2-REQ-050`; `TRD2-REQ-062`; `SURS-009`; `SURS-010`; `SURS-HR-F009`; `SURS-HR-F029`.

6.5.4 `acceptancePredicate`: authorized restore/replay reconstructs exact roots, key/access receipts and policy state; expired non-held data is absent, held data preserved, public projection licensed, private bytes unexposed; missing source blocks exactly its dependency closure.

6.5.5 `dependencies`: `SURS-010`; `SURS-012`; `SURS-023`.

## 6.6 `SURS-026` — QA, hostile review and acceptance

6.6.1 `rule`: define independence matrices and rooted run/reviewer envelopes for two discoverers, two SourceSet canonicalizers/walkers, structural/security reviews, finite rooted test/mutation manifest with exact oracle and detached exact-root Acceptance under eligible expiring/revocable Appointment/signature; acceptance is a distinct state from `REVIEW_BLOCKED`.

6.6.2 `causeAndEffect`: one or correlated run can repeat its defect, and allowing open blockers or an undefined mutation corpus can produce an unreproducible PASS with critical weaknesses.

6.6.3 `sourceIds`: `TRD2-REQ-030`; `TRD2-REQ-057`; `TRD2-REQ-064`; `SREQ-037`; `SREQ-038`; `SREQ-039`; `SURS-HR-F030`; `SURS-HR-F031`.

6.6.4 `acceptancePredicate`: `ACCEPTED` requires exact-root parity, independent eligibility, every required rooted test ID passing, dangling/duplicate/self/orphan=0, prohibited Public content=0, family gaps=0 and open P0/P1/P2=`0`; one surviving mutation or blocker returns `REVIEW_BLOCKED`; shared owner/library/envelope and unauthorized/expired/revoked Acceptance are rejected.

6.6.5 `dependencies`: `SURS-001`; `SURS-002`; `SURS-003`; `SURS-004`; `SURS-005`; `SURS-006`; `SURS-007`; `SURS-008`; `SURS-009`; `SURS-010`; `SURS-011`; `SURS-012`; `SURS-013`; `SURS-014`; `SURS-015`; `SURS-016`; `SURS-017`; `SURS-018`; `SURS-019`; `SURS-020`; `SURS-021`; `SURS-022`; `SURS-023`; `SURS-024`; `SURS-025`.

# 7. Hostile-review semantic-closure crosswalk requirements

## 7.1 Crosswalk contract

7.1.1 direct identity presence is not closure. Every mapping below requires independent proof that the exact future schemas, algorithms, vectors and safe terminal fully satisfy the source Finding.

7.1.2 any absent/partial mapping, stale root, missing vector, surviving mutation or different terminal leaves the Finding open and rejects this generation.

## 7.2 Finding mappings

7.2.1 `SURS-HR-F001 → SURS-001`; vector=`unvisited eligible edge, recursion/cutoff divergence`; terminal=`DISCOVERY-INCOMPLETE-BLOCKED`.

7.2.2 `SURS-HR-F002 → Section 1.2.3,SURS-023,SURS-026`; vector=`dangling, ambiguous, stale-root or inverse-missing source token`; terminal=`SOURCE-REFERENCE-BLOCKED`.

7.2.3 `SURS-HR-F003 → SURS-002,SURS-003`; vector=`equal, disjoint, nested, partial, expired, future and incomparable claims`; terminal=`AUTHORITY-CONFLICT-BLOCKED`.

7.2.4 `SURS-HR-F004 → SURS-004,SURS-015`; vector=`worktree/common-dir, index stage, deletion, mode, symlink, submodule, LFS, sparse, Unicode/case and remote-ref states`; terminal=`GIT-SNAPSHOT-BLOCKED`.

7.2.5 `SURS-HR-F005 → SURS-005`; vector=`unknown and every enumerated missing source family`; terminal=`UNKNOWN_FAMILY_QUARANTINED`.

7.2.6 `SURS-HR-F006 → SURS-006`; vector=`authored-generated-path, symlink escape, ambiguous origin and license`; terminal=`SOURCE-CLASSIFICATION-BLOCKED`.

7.2.7 `SURS-HR-F007 → SURS-007,SURS-008`; vector=`schema, Unknown, ID, canonical bytes and state-combination mutations`; terminal=`SOURCE-RECORD-BLOCKED`.

7.2.8 `SURS-HR-F008 → SURS-009,SURS-012`; vector=`forged raw copy, redacted derivative root equality, missing authorization and mutable storage`; terminal=`SOURCE-CUSTODY-BLOCKED`.

7.2.9 `SURS-HR-F009 → SURS-010,SURS-025`; vector=`prohibited value in every PublicEgressSurface`; terminal=`PUBLIC-EGRESS-BLOCKED`.

7.2.10 `SURS-HR-F010 → SURS-010`; vector=`classification false negative, reversible redaction, metadata and license failure`; terminal=`PUBLIC-CLASSIFICATION-BLOCKED`.

7.2.11 `SURS-HR-F011 → SURS-011`; vector=`prompt injection, SSRF, redirect, traversal, bomb, macro, XXE, polyglot and parser exploit`; terminal=`SOURCE-INGEST-QUARANTINED`.

7.2.12 `SURS-HR-F012 → SURS-012,SURS-013`; vector=`every admitted media profile, coordinate ambiguity and unsupported format`; terminal=`SOURCE-LOCATOR-BLOCKED`.

7.2.13 `SURS-HR-F013 → SURS-013`; vector=`tool/dependency/font/locale perturbation and shared-parser ambiguity`; terminal=`DERIVATIVE-AMBIGUOUS-BLOCKED`.

7.2.14 `SURS-HR-F014 → SURS-014`; vector=`implicit, dynamic, generated and mixed-loader hidden edges`; terminal=`IMPLEMENTATION-GRAPH-BLOCKED`.

7.2.15 `SURS-HR-F015 → SURS-004,SURS-015`; vector=`remote race and runtime/toolchain/lockfile change`; terminal=`IMPLEMENTATION-SNAPSHOT-BLOCKED`.

7.2.16 `SURS-HR-F016 → SURS-016,SURS-024`; vector=`redirect, 200-error, 304, encoding, HTTP failure, clock boundary and unseen change`; terminal=`DYNAMIC-SOURCE-STALE-BLOCKED`.

7.2.17 `SURS-HR-F017 → SURS-016`; vector=`mirror, lookalike, cross-domain redirect, expired auth and locale conflict`; terminal=`SOURCE-AUTHENTICITY-UNKNOWN`.

7.2.18 `SURS-HR-F018 → SURS-010,SURS-017,SURS-024`; vector=`wrong account/asset/environment, expiry, revocation and secret-bearing projection`; terminal=`PROVIDER-ENTITLEMENT-BLOCKED`.

7.2.19 `SURS-HR-F019 → SURS-018`; vector=`self, expired, revoked, delegated, wrong-scope and conflicting approval`; terminal=`SOURCE-AUTHORITY-BLOCKED`.

7.2.20 `SURS-HR-F020 → SURS-019,SURS-021`; vector=`reordered, duplicate, partial, revoked, future and conflicting Decision events`; terminal=`DECISION-CONFLICT-BLOCKED`.

7.2.21 `SURS-HR-F021 → SURS-020`; vector=`D31 bytes valid but authority missing, amendment unresolved or scope conflicting`; terminal=`AUTHORITY_UNKNOWN,QUARANTINED or CONFLICT_BLOCKED`.

7.2.22 `SURS-HR-F022 → SURS-020`; vector=`clean-room path move and exact-span byte mutation`; terminal=`D31-LOCATOR-BLOCKED`.

7.2.23 `SURS-HR-F023 → SURS-007,SURS-008,SURS-021`; vector=`admitted-then-unavailable, admitted-then-superseded, quarantined-cleared and impossible state combination`; terminal=`SOURCE-STATE-BLOCKED`.

7.2.24 `SURS-HR-F024 → SURS-021,SURS-024`; vector=`selection duplicate/reorder/replay, unauthorized actor and disagreement traversal`; terminal=`SELECTION-STATE-BLOCKED`.

7.2.25 `SURS-HR-F025 → SURS-022`; vector=`multi-family/role overlap, Unknown member and missing projection`; terminal=`SOURCE-DENOMINATOR-BLOCKED`.

7.2.26 `SURS-HR-F026 → SURS-023`; vector=`Unicode, URI/path, null, reorder, duplicate and framing variants`; terminal=`SOURCE-SET-CONFLICT-BLOCKED`.

7.2.27 `SURS-HR-F027 → SURS-023,SURS-026`; vector=`orphan, missing inverse, wrong cardinality, unreachable and cross-snapshot edge`; terminal=`SOURCE-CLOSURE-BLOCKED`.

7.2.28 `SURS-HR-F028 → SURS-024`; vector=`trigger, fan-out, cycle, missing edge and concurrent successor`; terminal=`SOURCE-INVALIDATION-BLOCKED`.

7.2.29 `SURS-HR-F029 → SURS-025`; vector=`retention expiry, Legal Hold, wrong key/region/access, restore mismatch and scoped missing source`; terminal=`SOURCE-REPLAY-BLOCKED`.

7.2.30 `SURS-HR-F030 → SURS-026`; vector=`one open P0/P1/P2 or one surviving rooted mutation`; terminal=`REVIEW_BLOCKED`.

7.2.31 `SURS-HR-F031 → SURS-026`; vector=`shared implementation/actor/envelope and unauthorized/expired/revoked Acceptance`; terminal=`SOURCE-ACCEPTANCE-BLOCKED`.

7.2.32 `SURS-HR-F032 → SURS-002,SURS-012`; vector=`derive authenticity, authority, freshness or sufficiency from byte identity alone`; terminal=`SOURCE-PREDICATE-CONFLATION-BLOCKED`.

7.2.33 required direct mapping=`32/32`; required semantic sufficiency=`32/32 FULL`; any PARTIAL/ABSENT is blocking and receives zero closure credit.

# 8. Current disposition

## 8.1 Counters

8.1.1 requirement denominator=`26`; current accepted=`0/26`; hostile-review Finding mappings accepted=`0/32`.

8.1.2 exact SourceCandidate and admitted-source denominators=`unknown/unavailable`.

8.1.3 exact Product Requirement, Program Task, completion, hour and ETA denominators=`unknown/unavailable`.

8.1.4 earliest safe next action=`Producer QA and independent hostile reviews of this exact successor root; then create a successor rather than patch a reviewed root if any blocker remains`.

8.1.5 no source custody, extraction, Program materialization, Product change, Git mutation, Push, Deploy or provider action is authorized.

8.1.6 Gate29=`BLOCKED`; development freeze=`ACTIVE`.
