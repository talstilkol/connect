# 1. Connect — Three-review Protocol v1.2 Hostile Review Findings Manifest

## 1.1 זהות וחוזה

1.1.1 `manifestId=CONNECT-THREE-REVIEW-PROTOCOL-V1-2-SUCCESSOR-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-2026-08-29`.

1.1.2 reviewed Subject=`/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-2-successor-requirements-2026-08-29.md`.

1.1.3 reviewed Subject raw SHA-256=`90d3a33aa11204afc6ea1fc92ba31acf615729617470b3137418a71a618c6461`.

1.1.4 source review=`/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-2-successor-requirements-hostile-review-2026-08-29.md`.

1.1.5 source review raw SHA-256=`bb9878b5d0a107cb8a7c240459de7a87d6f6f34e743b1bdb3ed13dc1773cb1ea`.

1.1.6 status=`INDEPENDENT-HOSTILE-REVIEW-OBSERVATION-MANIFEST; NOT-ACCEPTANCE; NOT-PROTOCOL; NOT-GATE-CREDIT`.

1.1.7 record denominator=`22`; severity vector=`P0=9,P1=12,P2=1,P3=0`; open=`22`; closed=`0`; merged=`0`; suppressed=`0`; riskAccepted=`0`.

1.1.8 כל רשומה מכילה בדיוק: `findingId`, ‏`severity`, ‏`locator`, ‏`defect`, ‏`impact`, ‏`requiredFix`, ‏`acceptancePredicate`, ‏`sourceIds`, ‏`status`, ‏`mergeKey`.

1.1.9 `mergeKey` חייב להיות זהה ל־`findingId`. דמיון נושא, Source, Terminal או Remediation אינו מעניק Merge, Alias, Closure transfer או parent credit.

# 2. P0 records

## 2.1 `MPRR-V12-HR-F001`

2.1.1 `findingId`: `MPRR-V12-HR-F001`.

2.1.2 `severity`: `P0`.

2.1.3 `locator`: `subject:§2.3 MPRR-003;§8.4 MPRR-035`.

2.1.4 `defect`: `Conformance generations must pass a Freeze that requires an already accepted Protocol and ProtocolUsePermit even though both generations occur before that Permit exists`.

2.1.5 `impact`: `the bootstrap proof is impossible or silently relies on an undefined exception`.

2.1.6 `requiredFix`: `define closed BOOTSTRAP-CONFORMANCE and FORMAL-RUN modes with distinct authority and phase Freeze schemas`.

2.1.7 `acceptancePredicate`: `A/B conformance runs bind BootstrapUseAuthority only; missing accepted Protocol/Permit is valid only in the typed bootstrap mode; any formal pre-Permit run reaches PROTOCOL-INELIGIBLE`.

2.1.8 `sourceIds`: `MPRR-MATH-HR-F001,INTAKE-E001,INTAKE-E012`.

2.1.9 `status`: `OPEN`.

2.1.10 `mergeKey`: `MPRR-V12-HR-F001`.

## 2.2 `MPRR-V12-HR-F002`

2.2.1 `findingId`: `MPRR-V12-HR-F002`.

2.2.2 `severity`: `P0`.

2.2.3 `locator`: `subject:§2.1 MPRR-001;§2.2 MPRR-002;§8.4 MPRR-035;§10.1.5`.

2.2.4 `defect`: `the Candidate requires its own QA, reviews, reconciliation and acceptance before ProtocolUsePermit but no frozen external BootstrapReviewProcedure governs those acts`.

2.2.5 `impact`: `the unaccepted Protocol can indirectly define the rules by which it is accepted`.

2.2.6 `requiredFix`: `freeze a predecessor external BootstrapReviewProcedure with exact actor, review, reconciliation and acceptance schemas limited to Protocol admission`.

2.2.7 `acceptancePredicate`: `every Protocol-admission attestation resolves to the predecessor procedure; Candidate-as-rule or stale/wrong procedure reaches SELF-AUTHORITY-BLOCKED`.

2.2.8 `sourceIds`: `MPRR-MATH-HR-F001,INTAKE-E001`.

2.2.9 `status`: `OPEN`.

2.2.10 `mergeKey`: `MPRR-V12-HR-F002`.

## 2.3 `MPRR-V12-HR-F003`

2.3.1 `findingId`: `MPRR-V12-HR-F003`.

2.3.2 `severity`: `P0`.

2.3.3 `locator`: `subject:§1.1;all sourceIds;§9`.

2.3.4 `defect`: `BCA2, TRD2-REQ, MSSA-F and TRD2-SHR-F member labels are not bound to exact source artifact roots`.

2.3.5 `impact`: `a label can resolve to no record or to a different record while appearing directly covered`.

2.3.6 `requiredFix`: `create an exact SourceNamespaceRegistry and represent every source edge as namespaceRoot plus memberId`.

2.3.7 `acceptancePredicate`: `all 193 source references resolve uniquely under frozen roots; dangling, ambiguous, stale or wrong-subject edges equal zero`.

2.3.8 `sourceIds`: `INTAKE-E012,MPRR-MATH-HR-F022`.

2.3.9 `status`: `OPEN`.

2.3.10 `mergeKey`: `MPRR-V12-HR-F003`.

## 2.4 `MPRR-V12-HR-F004`

2.4.1 `findingId`: `MPRR-V12-HR-F004`.

2.4.2 `severity`: `P0`.

2.4.3 `locator`: `subject:§2.4 MPRR-004;§3.3 MPRR-007;§3.4 MPRR-008`.

2.4.4 `defect`: `RunRequestId and RunResultId use H(exact inputs,...) without closed schemas, projections, domain tags or a normative dependency on the serialization/digest profile`.

2.4.5 `impact`: `independent implementations can assign different identities to the same Run`.

2.4.6 `requiredFix`: `define closed Request/Result schemas and versioned constructors over the single canonical framing and digest pipeline`.

2.4.7 `acceptancePredicate`: `two encoders reproduce exact bytes and IDs; alternate field sets, order, framing or hash reach RUN-IDENTITY-BLOCKED`.

2.4.8 `sourceIds`: `MPRR-MATH-HR-F003,MPRR-MATH-HR-F004,INTAKE-E004,INTAKE-E010`.

2.4.9 `status`: `OPEN`.

2.4.10 `mergeKey`: `MPRR-V12-HR-F004`.

## 2.5 `MPRR-V12-HR-F005`

2.5.1 `findingId`: `MPRR-V12-HR-F005`.

2.5.2 `severity`: `P0`.

2.5.3 `locator`: `subject:§2.3 MPRR-003;§5.2 MPRR-018;§6.1–§6.4 MPRR-022–MPRR-025`.

2.5.4 `defect`: `one Reconciliation-oriented SourceFreeze does not enumerate immutable inputs and predecessor Result roots separately for Normalization, Comparison and Reconciliation`.

2.5.5 `impact`: `intermediate normalized, comparison, conflict or resolution input can drift without invalidating the consumed Freeze`.

2.5.6 `requiredFix`: `define a PhaseFreezeRegistry with required roles and cardinalities for every Run type and bind each Result to that exact Freeze`.

2.5.7 `acceptancePredicate`: `every consumed intermediate root is a role-correct Freeze member; any mutation creates a successor Request and invalidates descendants`.

2.5.8 `sourceIds`: `MPRR-MATH-HR-F015,INTAKE-E011,INTAKE-E012`.

2.5.9 `status`: `OPEN`.

2.5.10 `mergeKey`: `MPRR-V12-HR-F005`.

## 2.6 `MPRR-V12-HR-F006`

2.6.1 `findingId`: `MPRR-V12-HR-F006`.

2.6.2 `severity`: `P0`.

2.6.3 `locator`: `subject:§7.4 MPRR-030;§7.5 MPRR-031`.

2.6.4 `defect`: `Acceptance CAS does not require Fresh(input,t) and does not require one atomic commit across operation ledger, Head and Acceptance envelope`.

2.6.5 `impact`: `stale exact roots or a partially committed acceptance can become current`.

2.6.6 `requiredFix`: `move Freshness before Acceptance and define an atomic commit set plus crash-recovery state machine`.

2.6.7 `acceptancePredicate`: `stale input never commits; every injected crash yields zero commit or one recoverable operation-bound envelope; split Head/envelope/ledger state equals zero`.

2.6.8 `sourceIds`: `MPRR-MATH-HR-F019,MPRR-MATH-HR-F020`.

2.6.9 `status`: `OPEN`.

2.6.10 `mergeKey`: `MPRR-V12-HR-F006`.

## 2.7 `MPRR-V12-HR-F007`

2.7.1 `findingId`: `MPRR-V12-HR-F007`.

2.7.2 `severity`: `P0`.

2.7.3 `locator`: `subject:§4.5 MPRR-014;§5.1 MPRR-017;§6.3 MPRR-024`.

2.7.4 `defect`: `an identity-changing Resolution may select new predicates and create a Semantic successor without a new Eligible Reviewer Amendment or ReObservation`.

2.7.5 `impact`: `a Resolver can become an unauthorized semantic author and bypass reviewer provenance`.

2.7.6 `requiredFix`: `make identity-changing Resolution emit REOBSERVATION-REQUIRED; only new eligible reviewer-authored records may enter normalization`.

2.7.7 `acceptancePredicate`: `Resolver-only key predicate reaches NORMALIZATION-INELIGIBLE; every successor semantic predicate traces to an eligible Review envelope`.

2.7.8 `sourceIds`: `MPRR-MATH-HR-F007,MPRR-MATH-HR-F013,INTAKE-E003,INTAKE-E008`.

2.7.9 `status`: `OPEN`.

2.7.10 `mergeKey`: `MPRR-V12-HR-F007`.

## 2.8 `MPRR-V12-HR-F008`

2.8.1 `findingId`: `MPRR-V12-HR-F008`.

2.8.2 `severity`: `P0`.

2.8.3 `locator`: `subject:§8.1 MPRR-032;§8.2 MPRR-033`.

2.8.4 `defect`: `exact offline archive and Public-safe redaction/reference are required without separate Private and Public custody tiers`.

2.8.5 `impact`: `either sensitive exact bytes leak to the Public repository or replay evidence ceases to be exact`.

2.8.6 `requiredFix`: `define sealed Private evidence custody and content-safe Public receipts with access, retention and root-binding rules`.

2.8.7 `acceptancePredicate`: `Public clone/history has zero prohibited bytes; authorized Private replay reproduces roots; Public receipts verify integrity without payload disclosure`.

2.8.8 `sourceIds`: `INTAKE-E011`.

2.8.9 `status`: `OPEN`.

2.8.10 `mergeKey`: `MPRR-V12-HR-F008`.

## 2.9 `MPRR-V12-HR-F009`

2.9.1 `findingId`: `MPRR-V12-HR-F009`.

2.9.2 `severity`: `P0`.

2.9.3 `locator`: `subject:§2.1 MPRR-001;§7.5 MPRR-031;§8.4 MPRR-035`.

2.9.4 `defect`: `Bootstrap authority and ProtocolUsePermit lack closed issuer, scope, epoch, validity, revocation, consumption and replay schemas`.

2.9.5 `impact`: `a predecessor authority can be replayed for another Candidate or remain usable after revocation`.

2.9.6 `requiredFix`: `define external Authority and Permit state machines with operation binding, validity interval, revocation, use cardinality and successor rules`.

2.9.7 `acceptancePredicate`: `wrong Candidate/scope/epoch, replay, expiry, revocation or consumed authority reaches AUTHORITY-INELIGIBLE with no historical fallback`.

2.9.8 `sourceIds`: `MPRR-MATH-HR-F001,MPRR-MATH-HR-F018,MPRR-MATH-HR-F020,INTAKE-E001,INTAKE-E012`.

2.9.9 `status`: `OPEN`.

2.9.10 `mergeKey`: `MPRR-V12-HR-F009`.

# 3. P1 records

## 3.1 `MPRR-V12-HR-F010`

3.1.1 `findingId`: `MPRR-V12-HR-F010`.

3.1.2 `severity`: `P1`.

3.1.3 `locator`: `subject:§2.4 MPRR-004`.

3.1.4 `defect`: `the Result lifecycle does not define unique finality, conflict selection or the transition from unresolved attempts to one authoritative Result`.

3.1.5 `impact`: `one Request can retain competing signed Results or be resolved by an unsafe latest-result convention`.

3.1.6 `requiredFix`: `define a total append-only Request/Attempt/Result finality state machine`.

3.1.7 `acceptancePredicate`: `at most one authoritative Result exists per Request; competing terminals reach RUN-RESULT-CONFLICT-BLOCKED`.

3.1.8 `sourceIds`: `MPRR-MATH-HR-F003,INTAKE-E010`.

3.1.9 `status`: `OPEN`.

3.1.10 `mergeKey`: `MPRR-V12-HR-F010`.

## 3.2 `MPRR-V12-HR-F011`

3.2.1 `findingId`: `MPRR-V12-HR-F011`.

3.2.2 `severity`: `P1`.

3.2.3 `locator`: `subject:§6.1 MPRR-022`.

3.2.4 `defect`: `presence states overlap and assertion cardinality is not defined for null, inapplicable, Set or multi-valued fields`.

3.2.5 `impact`: `Comparators can omit or duplicate a domain or field while returning different valid-looking counts`.

3.2.6 `requiredFix`: `define a disjoint state classifier and a closed assertion-cardinality equation`.

3.2.7 `acceptancePredicate`: `each domain has one state and every expected assertion count is derivable before execution; two Comparators agree for all boundary vectors`.

3.2.8 `sourceIds`: `MPRR-MATH-HR-F012,INTAKE-E005,INTAKE-E006,INTAKE-E007`.

3.2.9 `status`: `OPEN`.

3.2.10 `mergeKey`: `MPRR-V12-HR-F011`.

## 3.3 `MPRR-V12-HR-F012`

3.3.1 `findingId`: `MPRR-V12-HR-F012`.

3.3.2 `severity`: `P1`.

3.3.3 `locator`: `subject:§4.3 MPRR-012;§5.5 MPRR-021`.

3.3.4 `defect`: `the disjoint Local partition has no deterministic classifier or precedence for records satisfying multiple failure/legacy conditions`.

3.3.5 `impact`: `implementations can assign the same local identity to different partitions and denominators`.

3.3.6 `requiredFix`: `define one classification function, reason registry and precedence while preserving all non-primary reasons`.

3.3.7 `acceptancePredicate`: `two classifiers produce identical tag and reasons; overlap=0; unclassified=0; LegacyLocalKey never changes`.

3.3.8 `sourceIds`: `MPRR-MATH-HR-F006,MPRR-MATH-HR-F011`.

3.3.9 `status`: `OPEN`.

3.3.10 `mergeKey`: `MPRR-V12-HR-F012`.

## 3.4 `MPRR-V12-HR-F013`

3.4.1 `findingId`: `MPRR-V12-HR-F013`.

3.4.2 `severity`: `P1`.

3.4.3 `locator`: `subject:§5.2 MPRR-018;§8.3 MPRR-034;§8.4 MPRR-035`.

3.4.4 `defect`: `the independence rule permits only common schema/specification while conformance requires a common normative corpus, creating an undefined shared-fixture edge`.

3.4.5 `impact`: `valid implementations may be rejected or correlated implementations may receive parity credit`.

3.4.6 `requiredFix`: `separate allowed normative vectors, independently authored fixtures and sealed adversarial holdouts in the independence matrix`.

3.4.7 `acceptancePredicate`: `every shared root has an allowed class; shared implementation/mapping fails; sealed holdout remains undisclosed until output sealing`.

3.4.8 `sourceIds`: `MPRR-MATH-HR-F009`.

3.4.9 `status`: `OPEN`.

3.4.10 `mergeKey`: `MPRR-V12-HR-F013`.

## 3.5 `MPRR-V12-HR-F014`

3.5.1 `findingId`: `MPRR-V12-HR-F014`.

3.5.2 `severity`: `P1`.

3.5.3 `locator`: `subject:§5.2 MPRR-018;§8.3 MPRR-034`.

3.5.4 `defect`: `parsers, Comparators and graph engines are duplicated but receive no independence proof equivalent to the Normalizers`.

3.5.5 `impact`: `shared code or dependency defects can produce false agreement`.

3.5.6 `requiredFix`: `define an independence contract and sealed-output protocol for every duplicated Engine pair`.

3.5.7 `acceptancePredicate`: `forbidden shared edge yields zero parity credit and a typed independence-blocked terminal for that Engine class`.

3.5.8 `sourceIds`: `MPRR-MATH-HR-F009,MPRR-MATH-HR-F012,MPRR-MATH-HR-F014`.

3.5.9 `status`: `OPEN`.

3.5.10 `mergeKey`: `MPRR-V12-HR-F014`.

## 3.6 `MPRR-V12-HR-F015`

3.6.1 `findingId`: `MPRR-V12-HR-F015`.

3.6.2 `severity`: `P1`.

3.6.3 `locator`: `subject:§3.3 MPRR-007`.

3.6.4 `defect`: `canonical encoded key and duplicate equality are not defined recursively for nested Set values`.

3.6.5 `impact`: `equivalent nested Sets can hash differently or duplicate members can be inconsistently rejected`.

3.6.6 `requiredFix`: `define recursive ElementCanonicalBytes, duplicate equality and depth/size limits`.

3.6.7 `acceptancePredicate`: `nested permutation, duplicate and collision vectors produce identical bytes or one named terminal in two encoders`.

3.6.8 `sourceIds`: `MPRR-MATH-HR-F005`.

3.6.9 `status`: `OPEN`.

3.6.10 `mergeKey`: `MPRR-V12-HR-F015`.

## 3.7 `MPRR-V12-HR-F016`

3.7.1 `findingId`: `MPRR-V12-HR-F016`.

3.7.2 `severity`: `P1`.

3.7.3 `locator`: `subject:§2.3 MPRR-003;§6.1 MPRR-022;§7.1 MPRR-027;§7.2 MPRR-028`.

3.7.4 `defect`: `three raw Reviews and three presence domains are not mapped unambiguously to QA, Review A and Review B actors`.

3.7.5 `impact`: `a required domain can be missing, duplicated or filled by the wrong role without a deterministic orphan`.

3.7.6 `requiredFix`: `create a closed ReviewDomain registry with role mapping, cardinality, replacement and succession rules`.

3.7.7 `acceptancePredicate`: `every review and presence slot resolves to exactly one domain and eligible actor; wrong-role or duplicate domain reaches REVIEW-INELIGIBLE`.

3.7.8 `sourceIds`: `INTAKE-E005,MPRR-MATH-HR-F012`.

3.7.9 `status`: `OPEN`.

3.7.10 `mergeKey`: `MPRR-V12-HR-F016`.

## 3.8 `MPRR-V12-HR-F017`

3.8.1 `findingId`: `MPRR-V12-HR-F017`.

3.8.2 `severity`: `P1`.

3.8.3 `locator`: `subject:§7.3 MPRR-029`.

3.8.4 `defect`: `P2/P3 risk acceptance lacks non-waivable classes, maximum expiry, aggregate-risk thresholds, renewal/revocation and actor separation`.

3.8.5 `impact`: `multiple individually accepted findings can aggregate into an unreviewed critical risk`.

3.8.6 `requiredFix`: `define frozen risk policy, aggregate evaluator, maximum TTL and forbidden Resolver/risk-owner/Acceptor overlap`.

3.8.7 `acceptancePredicate`: `non-waivable, over-TTL, over-threshold, stale or actor-conflicted risk remains blocking`.

3.8.8 `sourceIds`: `MPRR-MATH-HR-F013,MPRR-MATH-HR-F018,MPRR-MATH-HR-F020`.

3.8.9 `status`: `OPEN`.

3.8.10 `mergeKey`: `MPRR-V12-HR-F017`.

## 3.9 `MPRR-V12-HR-F018`

3.9.1 `findingId`: `MPRR-V12-HR-F018`.

3.9.2 `severity`: `P1`.

3.9.3 `locator`: `subject:§8.2 MPRR-033`.

3.9.4 `defect`: `Public scans do not enumerate Git objects, LFS, submodules, archives, encoded/binary media, CI artifacts/logs, generated reports or collaboration metadata`.

3.9.5 `impact`: `sensitive bytes can bypass staged/history/export scans and become durable in a Public surface`.

3.9.6 `requiredFix`: `define a PublicationSurface registry, bounded decoding/decompression and quarantine-before-persist policy`.

3.9.7 `acceptancePredicate`: `every surface has an enforced scanner and owner; unsupported or incomplete scans block publication; nested/encoded corpus passes`.

3.9.8 `sourceIds`: `INTAKE-E011`.

3.9.9 `status`: `OPEN`.

3.9.10 `mergeKey`: `MPRR-V12-HR-F018`.

## 3.10 `MPRR-V12-HR-F019`

3.10.1 `findingId`: `MPRR-V12-HR-F019`.

3.10.2 `severity`: `P1`.

3.10.3 `locator`: `subject:§8.4 MPRR-035`.

3.10.4 `defect`: `roots differ only through the declared Delta does not distinguish direct changes, transitive affected descendants and invariant nodes`.

3.10.5 `impact`: `valid generation metadata changes can fail the proof or unexpected descendant drift can be hidden as Delta`.

3.10.6 `requiredFix`: `define a Delta Manifest with changedInputSet, expectedAffectedClosure and expectedInvariantSet`.

3.10.7 `acceptancePredicate`: `direct changes equal Delta; all and only expected descendants change; nodes outside closure remain invariant`.

3.10.8 `sourceIds`: `MPRR-MATH-HR-F021`.

3.10.9 `status`: `OPEN`.

3.10.10 `mergeKey`: `MPRR-V12-HR-F019`.

## 3.11 `MPRR-V12-HR-F020`

3.11.1 `findingId`: `MPRR-V12-HR-F020`.

3.11.2 `severity`: `P1`.

3.11.3 `locator`: `subject:dependencies of MPRR-004,010,016,018,024,030,031,032,033`.

3.11.4 `defect`: `the DAG is acyclic but omits semantic dependencies for identity constructors, actor independence, Freshness-before-CAS and Public-safety-before-archive`.

3.11.5 `impact`: `a topologically valid implementation order can execute a control before the prerequisite that gives it meaning or safety`.

3.11.6 `requiredFix`: `derive machine uses/dependsOn edges from every referenced type, constructor, authority, policy and safety control, then regenerate the DAG`.

3.11.7 `acceptancePredicate`: `semantic missing edges=0; unknown/self/duplicate/cycle edges=0; every used registry/control is an ancestor`.

3.11.8 `sourceIds`: `MPRR-MATH-HR-F004,MPRR-MATH-HR-F009,MPRR-MATH-HR-F014,MPRR-MATH-HR-F019,MPRR-MATH-HR-F020`.

3.11.9 `status`: `OPEN`.

3.11.10 `mergeKey`: `MPRR-V12-HR-F020`.

## 3.12 `MPRR-V12-HR-F021`

3.12.1 `findingId`: `MPRR-V12-HR-F021`.

3.12.2 `severity`: `P1`.

3.12.3 `locator`: `subject:§1.2.4;§9.1–§9.3;§10.1.1`.

3.12.4 `defect`: `the closure crosswalk is prose, F022 maps to Sections instead of a five-field Requirement row, and Intake rows use non-exact terminal references without status or residual risk`.

3.12.5 `impact`: `direct mention can later be mistaken for machine-proven semantic closure`.

3.12.6 `requiredFix`: `create a detached root-qualified machine closure manifest with one row per source Finding and exact rule, field, vector, terminal, status and residual-risk fields`.

3.12.7 `acceptancePredicate`: `forward/inverse orphan=0; every source row resolves uniquely; FULL requires independent exact-root receipt; PARTIAL/ABSENT remain blocking`.

3.12.8 `sourceIds`: `MPRR-MATH-HR-F022,INTAKE-E001,INTAKE-E002,INTAKE-E003,INTAKE-E004,INTAKE-E005,INTAKE-E006,INTAKE-E007,INTAKE-E008,INTAKE-E009,INTAKE-E010,INTAKE-E011,INTAKE-E012`.

3.12.9 `status`: `OPEN`.

3.12.10 `mergeKey`: `MPRR-V12-HR-F021`.

# 4. P2 record

## 4.1 `MPRR-V12-HR-F022`

4.1.1 `findingId`: `MPRR-V12-HR-F022`.

4.1.2 `severity`: `P2`.

4.1.3 `locator`: `subject:acceptancePredicate across MPRR-001–MPRR-035;§9`.

4.1.4 `defect`: `safe-terminal literals, unknown/unavailable state and prose references to dependent or named terminals have no closed typed registry`.

4.1.5 `impact`: `engines can encode the same failure with different values and break deterministic comparison or automation`.

4.1.6 `requiredFix`: `define a closed Terminal registry separating result status, block reason and human-readable explanation`.

4.1.7 `acceptancePredicate`: `every terminal literal resolves once; unknown aliases=0; each negative vector returns one identical typed terminal in two engines`.

4.1.8 `sourceIds`: `MPRR-MATH-HR-F022`.

4.1.9 `status`: `OPEN`.

4.1.10 `mergeKey`: `MPRR-V12-HR-F022`.

# 5. Counters and disposition

## 5.1 Exact counters

5.1.1 records=`22/22`; unique IDs=`22`; duplicate IDs=`0`; missing required fields=`0`.

5.1.2 `P0=9`; `P1=12`; `P2=1`; `P3=0`; severity sum=`22`.

5.1.3 `OPEN=22`; `CLOSED=0`; `MERGED=0`; `SUPPRESSED=0`; `RISK-ACCEPTED=0`.

5.1.4 mathematical sufficiency=`14/22 FULL,8/22 PARTIAL,0/22 ABSENT`.

5.1.5 Intake sufficiency=`3/12 FULL,9/12 PARTIAL,0/12 ABSENT`.

## 5.2 Verdict

5.2.1 `verdict=REJECT-AS-PROTOCOL-DEFINITION-REQUIREMENT-BASELINE`.

5.2.2 `Requirement accepted=0/35`; `Protocol accepted=NO`; `Gate29=BLOCKED`; `development freeze=ACTIVE`.

5.2.3 Product completion, remaining hours, critical path and ETA remain `unknown/unavailable`.

5.2.4 כל תיקון מחייב Successor root חדש וביקורות חדשות; אין לערוך את ה־Subject שנבדק במקום.
