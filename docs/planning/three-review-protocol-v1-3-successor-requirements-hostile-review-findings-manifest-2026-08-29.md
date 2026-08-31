# 1. Connect — Three-review Protocol v1.3 Hostile Review Findings Manifest

## 1.1 זהות וחוזה

1.1.1 `manifestId=CONNECT-THREE-REVIEW-PROTOCOL-V1-3-SUCCESSOR-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-2026-08-29`.

1.1.2 reviewed Subject=`/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-3-successor-requirements-2026-08-29.md`.

1.1.3 reviewed Subject raw SHA-256=`1acadac5e9e6cc814bb9699be48c47f71a974d44cecb8b3fe31395e323ab89a3`.

1.1.4 source review=`/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-3-successor-requirements-hostile-review-2026-08-29.md`.

1.1.5 source review raw SHA-256=`95b0a395d593e2bb244735ec4859dc82c6e843146648888dde2ec60477f45d71`.

1.1.6 status=`INDEPENDENT-HOSTILE-REVIEW-OBSERVATION-MANIFEST; PLANNING-ONLY; NOT-ACCEPTANCE; NOT-PROTOCOL; NOT-GATE-CREDIT`.

1.1.7 record denominator=`24`; severity vector=`P0=11,P1=11,P2=2,P3=0`; open=`24`; closed=`0`; merged=`0`; suppressed=`0`; riskAccepted=`0`.

1.1.8 לכל record בדיוק עשרה שדות: `findingId`, ‏`severity`, ‏`location`, ‏`defect`, ‏`cause`, ‏`consequence`, ‏`requiredFix`, ‏`acceptancePredicate`, ‏`status`, ‏`noMergeKey`.

1.1.9 `noMergeKey=findingId`. Topic, location, shared dependency או shared remediation אינם Merge rule ואינם מעבירים Closure.

# 2. P0 records

## 2.1 `MPRR-V13-HR-F001`

2.1.1 `findingId`: `MPRR-V13-HR-F001`.

2.1.2 `severity`: `P0`.

2.1.3 `location`: `subject:§1.2.4;§1.3;§2.1 MPRR-V13-REQ-001`.

2.1.4 `defect`: `Source edge requires namespaceRoot but a Registry entry contains report, Manifest and reviewed-subject roots without one canonical NamespaceEntryRoot or carrier-root selection rule`.

2.1.5 `cause`: `the namespace identity constructor and authoritative root field were never specified`.

2.1.6 `consequence`: `independent resolvers can bind one token to different rooted artifacts and grant false provenance`.

2.1.7 `requiredFix`: `define canonical NamespaceEntry bytes/root, separate memberCarrierRoot/reportRoot/reviewedSubjectRoot, and mandate one root kind in every source tuple`.

2.1.8 `acceptancePredicate`: `two resolvers emit identical NamespaceEntry bytes; alternate carrier choice or any associated-root substitution returns SOURCE-GRAPH-INVALID`.

2.1.9 `status`: `OPEN`.

2.1.10 `noMergeKey`: `MPRR-V13-HR-F001`.

## 2.2 `MPRR-V13-HR-F002`

2.2.1 `findingId`: `MPRR-V13-HR-F002`.

2.2.2 `severity`: `P0`.

2.2.3 `location`: `subject:§2.1 MPRR-V13-REQ-001;§1.3.9`.

2.2.4 `defect`: `the Registry binds a Member-ID Set but no canonical locator, record parser/schema, byte extent, member bytes or member digest`.

2.2.5 `cause`: `member presence was treated as byte-identical record resolution`.

2.2.6 `consequence`: `a heading, reference and actual record sharing one label can be confused while all root checks pass`.

2.2.7 `requiredFix`: `add a per-member canonical record with recordType, canonicalLocator, byteRange or extracted canonical bytes, memberDigest, parser/schema root and cardinality`.

2.2.8 `acceptancePredicate`: `all 130 cited members resolve to exactly one byte record; duplicate occurrence, locator drift, parser disagreement or same-ID/different-bytes returns SOURCE-GRAPH-INVALID`.

2.2.9 `status`: `OPEN`.

2.2.10 `noMergeKey`: `MPRR-V13-HR-F002`.

## 2.3 `MPRR-V13-HR-F003`

2.3.1 `findingId`: `MPRR-V13-HR-F003`.

2.3.2 `severity`: `P0`.

2.3.3 `location`: `subject:§4.6 MPRR-V13-REQ-019;§7.1 MPRR-V13-REQ-036;§7.2 MPRR-V13-REQ-037`.

2.3.4 `defect`: `the formal ReviewDomain Set is configurable and has no invariant cardinality of exactly three or fixed QA disposition`.

2.3.5 `cause`: `domain count is only said to be derived from a future Registry`.

2.3.6 `consequence`: `an empty or reduced Registry can make presence and assertion checks pass vacuously`.

2.3.7 `requiredFix`: `freeze three stable non-empty domain IDs, cardinality=3, required role mapping, and a single immutable classification of QA`.

2.3.8 `acceptancePredicate`: `domain counts 0,1,2,4, missing domain, role substitution or QA double-count return REVIEW-INELIGIBLE; every Finding has exactly three presence positions`.

2.3.9 `status`: `OPEN`.

2.3.10 `noMergeKey`: `MPRR-V13-HR-F003`.

## 2.4 `MPRR-V13-HR-F004`

2.4.1 `findingId`: `MPRR-V13-HR-F004`.

2.4.2 `severity`: `P0`.

2.4.3 `location`: `subject:§2.3 MPRR-V13-REQ-003;§2.4 MPRR-V13-REQ-004;§2.5 MPRR-V13-REQ-005;§10.3 MPRR-V13-REQ-055`.

2.4.4 `defect`: `BOOTSTRAP-PROTOCOL-ADMISSION is governed by a procedure root but does not require or consume the separately named BootstrapReviewAuthority`.

2.4.5 `cause`: `rule definition and use authority were conflated across the run-mode and authority requirements`.

2.4.6 `consequence`: `a procedure holder can claim Admission without operation authority, and an unused authority can be replayed`.

2.4.7 `requiredFix`: `require exact BootstrapReviewProcedure plus fresh single-use Candidate/operation/acceptor-bound BootstrapReviewAuthority in the Admission Freeze and consume it atomically`.

2.4.8 `acceptancePredicate`: `procedure-only, authority-only, wrong Candidate/operation, stale, revoked, replayed or self-issued authority fails closed with one canonical authority terminal`.

2.4.9 `status`: `OPEN`.

2.4.10 `noMergeKey`: `MPRR-V13-HR-F004`.

## 2.5 `MPRR-V13-HR-F005`

2.5.1 `findingId`: `MPRR-V13-HR-F005`.

2.5.2 `severity`: `P0`.

2.5.3 `location`: `subject:§1.2.3;MPRR-V13-REQ-003–006;MPRR-V13-REQ-014;§10.4 MPRR-V13-REQ-056`.

2.5.4 `defect`: `the explicit 247-edge DAG omits named semantic uses, including forward references from Bootstrap, run-mode, authority and Request identity requirements to later schemas and controls`.

2.5.5 `cause`: `dependencies were kept backward-only without first extracting the semantic uses graph`.

2.5.6 `consequence`: `the mechanical DAG is acyclic while the actual prerequisite graph has missing edges and bootstrap cycles, so semanticMissingEdge=0 is false`.

2.5.7 `requiredFix`: `split external foundation vocabulary from runtime controls, emit a machine uses manifest, and reorder or supersede requirements according to the full graph`.

2.5.8 `acceptancePredicate`: `two extractors report unknown=0,self=0,duplicate=0,cycle=0,forward=0,semanticMissingEdge=0 and every named use has an explicit ancestor`.

2.5.9 `status`: `OPEN`.

2.5.10 `noMergeKey`: `MPRR-V13-HR-F005`.

## 2.6 `MPRR-V13-HR-F006`

2.6.1 `findingId`: `MPRR-V13-HR-F006`.

2.6.2 `severity`: `P0`.

2.6.3 `location`: `subject:§4.1 MPRR-V13-REQ-014;§4.3 MPRR-V13-REQ-016`.

2.6.4 `defect`: `RunResultId includes finality-receipt root although that receipt selects the authoritative Result, with no prohibition on the receipt binding ResultId`.

2.6.5 `cause`: `Result payload identity and finality envelope identity were not separated`.

2.6.6 `consequence`: `the constructor can form a cryptographic fixed point or a receipt can be detached enough to authorize a different output`.

2.6.7 `requiredFix`: `define acyclic ResultPayloadRoot; finality receipt binds RequestId plus ResultPayloadRoot and excludes ResultEnvelopeId; derive a separate ResultEnvelopeId afterward`.

2.6.8 `acceptancePredicate`: `constructor graph is acyclic in two encoders; wrong payload/terminal or receipt containing ResultEnvelopeId returns RUN-IDENTITY-BLOCKED`.

2.6.9 `status`: `OPEN`.

2.6.10 `noMergeKey`: `MPRR-V13-HR-F006`.

## 2.7 `MPRR-V13-HR-F007`

2.7.1 `findingId`: `MPRR-V13-HR-F007`.

2.7.2 `severity`: `P0`.

2.7.3 `location`: `subject:§8.4 MPRR-V13-REQ-046;§8.5 MPRR-V13-REQ-047;§8.6 MPRR-V13-REQ-048`.

2.7.4 `defect`: `Freshness is checked before commit but CAS fences only a current Head and authority epoch, not every dependency head and revocation state in Fresh`.

2.7.5 `cause`: `no immutable dependency-version vector is produced and validated at the linearization point`.

2.7.6 `consequence`: `a dependency can change between Fresh evaluation and commit while the expected Head still matches`.

2.7.7 `requiredFix`: `bind a complete version vector to Freshness and atomically validate/lock or CAS all dependency current predicates and revocation ledgers`.

2.7.8 `acceptancePredicate`: `a concurrent mutation to any dependency between read and commit aborts; accepted readbacks prove the same complete version vector and operation`.

2.7.9 `status`: `OPEN`.

2.7.10 `noMergeKey`: `MPRR-V13-HR-F007`.

## 2.8 `MPRR-V13-HR-F008`

2.8.1 `findingId`: `MPRR-V13-HR-F008`.

2.8.2 `severity`: `P0`.

2.8.3 `location`: `subject:§1.1.7;§10.5 MPRR-V13-REQ-057;§11.1;§15.1.2`.

2.8.4 `defect`: `the detached machine closure denominator covers Findings and Intake defects but excludes all 35 predecessor requirements`.

2.8.5 `cause`: `Section 11 navigation mappings were treated as one-to-one semantic preservation despite split successor semantics and no field-level proof`.

2.8.6 `consequence`: `a predecessor requirement can be weakened or lost while 35/35 direct identity coverage remains green`.

2.8.7 `requiredFix`: `expand the closure manifest to all 91 obligations with complete successor target Set, field delta, vectors, terminal, residual risk and independent status`.

2.8.8 `acceptancePredicate`: `forward/inverse orphans=0/91; every V12REQ row is independently FULL and PARTIAL/ABSENT blocks`.

2.8.9 `status`: `OPEN`.

2.8.10 `noMergeKey`: `MPRR-V13-HR-F008`.

## 2.9 `MPRR-V13-HR-F009`

2.9.1 `findingId`: `MPRR-V13-HR-F009`.

2.9.2 `severity`: `P0`.

2.9.3 `location`: `subject:§9.1 MPRR-V13-REQ-049;§9.3 MPRR-V13-REQ-051;§9.4 MPRR-V13-REQ-052`.

2.9.4 `defect`: `Public receipts may expose hashes/root bindings of Private content without a non-enumerability or unlinkability profile`.

2.9.5 `cause`: `zero prohibited bytes was assumed to imply zero information disclosure`.

2.9.6 `consequence`: `low-entropy secrets, emails, phones, tokens or documents can be guessed offline or correlated across runs`.

2.9.7 `requiredFix`: `forbid raw Private-content digests on Public surfaces and define an opaque attestation/commitment profile with secret separation, rotation and metadata minimization`.

2.9.8 `acceptancePredicate`: `dictionary, equality-correlation and cross-run linking vectors reveal no Private predicate while the Public integrity claim remains verifiable at its declared limit`.

2.9.9 `status`: `OPEN`.

2.9.10 `noMergeKey`: `MPRR-V13-HR-F009`.

## 2.10 `MPRR-V13-HR-F010`

2.10.1 `findingId`: `MPRR-V13-HR-F010`.

2.10.2 `severity`: `P0`.

2.10.3 `location`: `subject:§2.5 MPRR-V13-REQ-005;§4.7 MPRR-V13-REQ-020;§5.5 MPRR-V13-REQ-025;§7.4;§8.5–§8.6`.

2.10.4 `defect`: `authority-bearing records rely on roots and the word signed without a cryptographic Signature/Key/Trust model`.

2.10.5 `cause`: `content identity was conflated with actor authenticity and authorization`.

2.10.6 `consequence`: `a Producer or attacker can fabricate a valid-root Amendment, Appointment, finality, approval or readback receipt`.

2.10.7 `requiredFix`: `define canonical detached attestations with key root, algorithm/profile, trust chain, purpose, signed payload, epoch, time, expiry, compromise/revocation and anti-equivocation rules`.

2.10.8 `acceptancePredicate`: `forged, wrong-purpose/key, expired, compromised, revoked, replayed or equivocating signatures fail with one canonical authority terminal`.

2.10.9 `status`: `OPEN`.

2.10.10 `noMergeKey`: `MPRR-V13-HR-F010`.

## 2.11 `MPRR-V13-HR-F011`

2.11.1 `findingId`: `MPRR-V13-HR-F011`.

2.11.2 `severity`: `P0`.

2.11.3 `location`: `subject:§8.6 MPRR-V13-REQ-048;§10.3 MPRR-V13-REQ-055`.

2.11.4 `defect`: `Generation A/B, Delta, stale-A attack, recovery and replay roots are not mandatory members of the Admission CAS input/envelope`.

2.11.5 `cause`: `conformance proof obligations were specified separately from protected acceptance inputs`.

2.11.6 `consequence`: `Admission can claim two-generation success without binding the accepted Head or Permit to the exact evidence`.

2.11.7 `requiredFix`: `define canonical ConformanceAdmissionEvidenceRoot and require it in Admission Freeze, human approval, Permit issuance and atomic CAS`.

2.11.8 `acceptancePredicate`: `missing, swapped, stale, different-Candidate or partial A/B evidence blocks Admission; accepted Head and Permit bind one exact evidence root`.

2.11.9 `status`: `OPEN`.

2.11.10 `noMergeKey`: `MPRR-V13-HR-F011`.

# 3. P1 records

## 3.1 `MPRR-V13-HR-F012`

3.1.1 `findingId`: `MPRR-V13-HR-F012`.

3.1.2 `severity`: `P1`.

3.1.3 `location`: `subject:§4.3 MPRR-V13-REQ-016;§4.7 MPRR-V13-REQ-020`.

3.1.4 `defect`: `finality receipt has no authorized issuer, quorum/single-writer rule, epoch, fencing, revocation or succession contract`.

3.1.5 `cause`: `finality selection was defined as a receipt property without a FinalityAuthority lifecycle`.

3.1.6 `consequence`: `an unauthorized actor can finalize, or multiple valid-looking receipts can leave a Request permanently ambiguous`.

3.1.7 `requiredFix`: `add FinalityAuthority/Appointment, issuance cardinality, quorum or writer rule, epoch, fencing, revocation and operation binding`.

3.1.8 `acceptancePredicate`: `unauthorized, duplicate, stale, revoked, competing or replayed receipts yield one authoritative Result or RUN-RESULT-CONFLICT-BLOCKED without latest-wins`.

3.1.9 `status`: `OPEN`.

3.1.10 `noMergeKey`: `MPRR-V13-HR-F012`.

## 3.2 `MPRR-V13-HR-F013`

3.2.1 `findingId`: `MPRR-V13-HR-F013`.

3.2.2 `severity`: `P1`.

3.2.3 `location`: `subject:§3.4.3;§3.7 MPRR-V13-REQ-013;§5.1.3;§6.1.3;§6.3.3`.

3.2.4 `defect`: `multiple proof predicates return terminal disjunctions although Req-013 forbids disjunction and demands one canonical terminal`.

3.2.5 `cause`: `terminal precedence was deferred to a future Registry without per-vector mapping`.

3.2.6 `consequence`: `engines can disagree on the terminal for the same failure and still claim compliance`.

3.2.7 `requiredFix`: `define a total vector-to-terminal table and deterministic precedence before referencing terminals; remove every or/alias`.

3.2.8 `acceptancePredicate`: `each negative vector resolves to exactly one canonical Terminal record and two engines agree for every overlap`.

3.2.9 `status`: `OPEN`.

3.2.10 `noMergeKey`: `MPRR-V13-HR-F013`.

## 3.3 `MPRR-V13-HR-F014`

3.3.1 `findingId`: `MPRR-V13-HR-F014`.

3.3.2 `severity`: `P1`.

3.3.3 `location`: `subject:§2.5.3;§6.3 MPRR-V13-REQ-031;§8.2.3;§10.2 MPRR-V13-REQ-054`.

3.3.4 `defect`: `independence receipts cover parser, normalizer, comparator and graph pairs but omit duplicated authority-lifecycle and risk evaluators`.

3.3.5 `cause`: `the EngineClass universe was not derived from every two-engine parity claim`.

3.3.6 `consequence`: `two copies of the same flawed evaluator can grant false authority or aggregate-risk parity`.

3.3.7 `requiredFix`: `extend EngineClass and allowed-common-root matrices to every duplicated evaluator that earns parity credit`.

3.3.8 `acceptancePredicate`: `every parity result binds an independence receipt; any forbidden common edge gives zero credit and a class-specific terminal`.

3.3.9 `status`: `OPEN`.

3.3.10 `noMergeKey`: `MPRR-V13-HR-F014`.

## 3.4 `MPRR-V13-HR-F015`

3.4.1 `findingId`: `MPRR-V13-HR-F015`.

3.4.2 `severity`: `P1`.

3.4.3 `location`: `subject:§4.5 MPRR-V13-REQ-018;§5.1 MPRR-V13-REQ-021;§8.1 MPRR-V13-REQ-043`.

3.4.4 `defect`: `Review envelope omits RunRequestId, PhaseFreezeRoot, ReviewPacketRoot and input Evidence root`.

3.4.5 `cause`: `subject and instruction roots were treated as sufficient run lineage`.

3.4.6 `consequence`: `a Review output can be reused under another Freeze or packet with different Evidence`.

3.4.7 `requiredFix`: `bind exact Request, Freeze, packet and input Evidence roots in the Review payload and Run Result lineage`.

3.4.8 `acceptancePredicate`: `any envelope reuse under a different Request/Freeze/packet/Evidence returns REVIEW-INELIGIBLE`.

3.4.9 `status`: `OPEN`.

3.4.10 `noMergeKey`: `MPRR-V13-HR-F015`.

## 3.5 `MPRR-V13-HR-F016`

3.5.1 `findingId`: `MPRR-V13-HR-F016`.

3.5.2 `severity`: `P1`.

3.5.3 `location`: `subject:§2.6 MPRR-V13-REQ-006;§4.7 MPRR-V13-REQ-020;§8.6 MPRR-V13-REQ-048`.

3.5.4 `defect`: `exact-root human approval is named but has no closed operation-bound, risk-bound, expiring and single-use record schema`.

3.5.5 `cause`: `actor Appointment was treated as approval intent for any candidate or operation`.

3.5.6 `consequence`: `an old or differently scoped approval can be replayed into a new Acceptance CAS`.

3.5.7 `requiredFix`: `define signed HumanApproval binding Candidate, conformance evidence, risk snapshot, expected Head, operation, intent, expiry, revocation and consumption`.

3.5.8 `acceptancePredicate`: `wrong Candidate/evidence/head/operation, stale risk, expiry, revocation or replay blocks commit`.

3.5.9 `status`: `OPEN`.

3.5.10 `noMergeKey`: `MPRR-V13-HR-F016`.

## 3.6 `MPRR-V13-HR-F017`

3.6.1 `findingId`: `MPRR-V13-HR-F017`.

3.6.2 `severity`: `P1`.

3.6.3 `location`: `subject:§9.2 MPRR-V13-REQ-050;§9.3 MPRR-V13-REQ-051`.

3.6.4 `defect`: `quarantine-before-persist is demanded for provider-managed surfaces that may persist before any external scanner can run`.

3.6.5 `cause`: `surface enumeration was not paired with an enforceability capability model`.

3.6.6 `consequence`: `the Definition is either impossible or can label a post-publication scan as preventive proof`.

3.6.7 `requiredFix`: `classify each surface as source-prevented, provider-native pre-persist, disabled, or post-persist containment with no zero-exposure credit; default deny unsupported surfaces`.

3.6.8 `acceptancePredicate`: `every enabled Public surface has enforceable pre-persist proof; otherwise Publication is blocked and post-persist detection is an Incident`.

3.6.9 `status`: `OPEN`.

3.6.10 `noMergeKey`: `MPRR-V13-HR-F017`.

## 3.7 `MPRR-V13-HR-F018`

3.7.1 `findingId`: `MPRR-V13-HR-F018`.

3.7.2 `severity`: `P1`.

3.7.3 `location`: `subject:§9.1 MPRR-V13-REQ-049;§9.3 MPRR-V13-REQ-051`.

3.7.4 `defect`: `an immutable exact Private archive is required together with retention, legal hold and destruction but no reconciled lifecycle exists`.

3.7.5 `cause`: `content immutability and deletion obligations were specified independently`.

3.7.6 `consequence`: `sensitive bytes can be retained forever or destroyed without auditable replay/deletion semantics`.

3.7.7 `requiredFix`: `define content/key/receipt/replica states, legal-hold precedence, deletion plan/receipt, crypto-erasure and post-destruction replay terminal`.

3.7.8 `acceptancePredicate`: `expiry, hold, key destruction, replica lag, restore copy and partial deletion vectors converge to one safe audited state`.

3.7.9 `status`: `OPEN`.

3.7.10 `noMergeKey`: `MPRR-V13-HR-F018`.

## 3.8 `MPRR-V13-HR-F019`

3.8.1 `findingId`: `MPRR-V13-HR-F019`.

3.8.2 `severity`: `P1`.

3.8.3 `location`: `subject:§9.4 MPRR-V13-REQ-052;§10.2 MPRR-V13-REQ-054`.

3.8.4 `defect`: `untrusted-content predicates protect workflow authority but not review semantic integrity against prompt/tool injection`.

3.8.5 `cause`: `control-flow non-execution was treated as sufficient isolation for AI or tool-assisted reviewers`.

3.8.6 `consequence`: `hostile content can suppress Findings, fabricate Evidence or correlate independent Reviews without changing formal authority`.

3.8.7 `requiredFix`: `require instruction/data separation, origin labels, sandboxing, output provenance, adversarial semantic holdouts and reviewer-agent/tool independence`.

3.8.8 `acceptancePredicate`: `prompt/tool/link injection neither changes authority nor creates, suppresses or alters unsupported semantic assertions; detected influence blocks eligibility`.

3.8.9 `status`: `OPEN`.

3.8.10 `noMergeKey`: `MPRR-V13-HR-F019`.

## 3.9 `MPRR-V13-HR-F020`

3.9.1 `findingId`: `MPRR-V13-HR-F020`.

3.9.2 `severity`: `P1`.

3.9.3 `location`: `subject:§9.2 MPRR-V13-REQ-050;§8.4 MPRR-V13-REQ-046`.

3.9.4 `defect`: `PublicationSurfaceRegistry has no provider capability/version root, discovery evidence, freshness TTL or new-surface invalidator`.

3.9.5 `cause`: `a closed list was assumed to remain complete as providers evolve`.

3.9.6 `consequence`: `a newly enabled or introduced Public surface can persist data without appearing in the scanner denominator`.

3.9.7 `requiredFix`: `bind provider capability inventory, discovery run, asOf/validThrough and version-change invalidation; default deny unknown surfaces`.

3.9.8 `acceptancePredicate`: `provider feature/API/schema changes or enabling any unclassified surface stale the Publication permit until a Registry successor is accepted`.

3.9.9 `status`: `OPEN`.

3.9.10 `noMergeKey`: `MPRR-V13-HR-F020`.

## 3.10 `MPRR-V13-HR-F021`

3.10.1 `findingId`: `MPRR-V13-HR-F021`.

3.10.2 `severity`: `P1`.

3.10.3 `location`: `subject:§3.1 MPRR-V13-REQ-007;§8.4 MPRR-V13-REQ-046;§8.5 MPRR-V13-REQ-047`.

3.10.4 `defect`: `trusted-clock observations have parsing and rollback rules but no authority source, monotonic epoch, signature or cross-clock trust relation`.

3.10.5 `cause`: `timestamp determinism was conflated with trusted time provenance`.

3.10.6 `consequence`: `a convenient or rolled-back clock can extend authority or reorder acceptance evidence`.

3.10.7 `requiredFix`: `define ClockAuthority/Observation with source root, epoch/counter, uncertainty interval, quorum or authoritative source, signature and rollback detection`.

3.10.8 `acceptancePredicate`: `skew, rollback, split clocks, unavailable/expired authority or forged observations prove neither Freshness nor ordering`.

3.10.9 `status`: `OPEN`.

3.10.10 `noMergeKey`: `MPRR-V13-HR-F021`.

## 3.11 `MPRR-V13-HR-F022`

3.11.1 `findingId`: `MPRR-V13-HR-F022`.

3.11.2 `severity`: `P1`.

3.11.3 `location`: `subject:§8.2 MPRR-V13-REQ-044;§8.3 MPRR-V13-REQ-045;§8.6 MPRR-V13-REQ-048`.

3.11.4 `defect`: `aggregate risk evaluates every current receipt but no authoritative closed RiskUniverseSnapshot proves complete membership`.

3.11.5 `cause`: `supplied risk roots were treated as the universe rather than a subset requiring completeness proof`.

3.11.6 `consequence`: `a caller can omit a current receipt and keep the aggregate below threshold`.

3.11.7 `requiredFix`: `bind canonical RiskUniverseSnapshotRoot from an authoritative registry head with scope, membership/non-membership proof and freshness`.

3.11.8 `acceptancePredicate`: `omitted, added, wrong-scope, stale, revoked or concurrent risk receipt changes the snapshot and blocks commit; both evaluators agree`.

3.11.9 `status`: `OPEN`.

3.11.10 `noMergeKey`: `MPRR-V13-HR-F022`.

# 4. P2 records

## 4.1 `MPRR-V13-HR-F023`

4.1.1 `findingId`: `MPRR-V13-HR-F023`.

4.1.2 `severity`: `P2`.

4.1.3 `location`: `subject:§1.2.4;§11.1;§12;§13.1;§14.1`.

4.1.4 `defect`: `crosswalk source tuple and arrow target share one code span, so a literal tuple parser can consume the arrow and target as part of memberId`.

4.1.5 `cause`: `human-readable mapping syntax was not separated into machine fields`.

4.1.6 `consequence`: `independent parsers can disagree on all 91 mapping source identities`.

4.1.7 `requiredFix`: `store source tuple and successor target Set in separate canonical columns or records`.

4.1.8 `acceptancePredicate`: `two parsers extract exactly 35+22+22+12 sources and target Sets; arrow/suffix bytes are never memberId bytes`.

4.1.9 `status`: `OPEN`.

4.1.10 `noMergeKey`: `MPRR-V13-HR-F023`.

## 4.2 `MPRR-V13-HR-F024`

4.2.1 `findingId`: `MPRR-V13-HR-F024`.

4.2.2 `severity`: `P2`.

4.2.3 `location`: `subject:§5.2 MPRR-V13-REQ-022`.

4.2.4 `defect`: `coverage requires no overlap but does not distinguish intentional overlap between tool/manual passes from forbidden inspected/excluded overlap`.

4.2.5 `cause`: `coverage regions lack a closed interval/media algebra and multiplicity semantics`.

4.2.6 `consequence`: `valid multi-pass coverage can fail or a forbidden exclusion overlap can be hidden by another pass`.

4.2.7 `requiredFix`: `define region union, boundaries, pass labels, multiplicity, allowed cross-pass overlap and forbidden class overlap`.

4.2.8 `acceptancePredicate`: `two coverage engines agree on nested, overlapping, duplicate, excluded and multi-pass vectors; only unexplained gap or forbidden class overlap fails`.

4.2.9 `status`: `OPEN`.

4.2.10 `noMergeKey`: `MPRR-V13-HR-F024`.

# 5. QA invariants ו־Disposition

## 5.1 Cardinality

5.1.1 IDs חייבים להיות בדיוק `MPRR-V13-HR-F001`–`MPRR-V13-HR-F024`, רציפים וייחודיים.

5.1.2 severity vector חייב להיות `P0=11,P1=11,P2=2,P3=0`.

5.1.3 לכל record בדיוק עשרת השדות שב־1.1.8; `noMergeKey=findingId`; subject root אחיד לפי 1.1.3.

5.1.4 `reviewResult=REJECT`; כל 24 הרשומות `OPEN`; אין Merge, Suppression, Risk acceptance או Closure.

## 5.2 Safe state

5.2.1 direct identity coverage של מקורות ה־Subject=`91/91`; independently accepted semantic closure=`0/91`.

5.2.2 Protocol Definition authoring, formal Review runs, real Finding normalization, Comparison, Reconciliation, Acceptance ו־Gate credit נשארים חסומים עד successor exact-root review.

5.2.3 `Gate29=BLOCKED`; `development freeze=ACTIVE`; Product percentage, remaining hours, critical path ו־ETA=`unknown/unavailable`.
