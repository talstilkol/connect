# 1. Connect — TRD-2 v3 lossless-closure requirements independent hostile review

## 1.1 זהות, היקף וגבול סמכות

1.1.1 `artifactId=CONNECT-SECTION-35-6-TRD-2-V3-LOSSLESS-CLOSURE-INDEPENDENT-HOSTILE-REVIEW-2026-08-29-V1`.

1.1.2 artifactClass=`PLANNING-ONLY; REVIEWER-LOCAL-OBSERVATIONS; NOT-RECONCILIATION; NOT-ACCEPTANCE; NOT-GATE-CREDIT`.

1.1.3 reviewed Subject path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v3-lossless-closure-requirements-2026-08-29.md`; frozen raw SHA-256=`797a027f604a6963758770fa9825345e4f0f636f1575be5370098b12806d772c`; physical identity=`1321 lines/210146 bytes`.

1.1.4 support subject A path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v3-inherited-v2-requirement-byte-manifest-2026-08-29.md`; frozen raw SHA-256=`8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec`; physical identity=`133 lines/17159 bytes`.

1.1.5 support subject B path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v3-lossless-source-observation-envelope-manifest-2026-08-29.md`; frozen raw SHA-256=`392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3`; physical identity=`204 lines/44125 bytes`.

1.1.6 support subject C path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v3-closure-control-registries-2026-08-29.md`; frozen raw SHA-256=`caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de`; physical identity=`223 lines/28351 bytes`.

1.1.7 reviewed predecessor v2 root=`7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d`; predecessor hostile-review root=`fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b`; predecessor findings root=`7b264d6f162af5acba91c5fec23b1bd49f2fa16b7dc7413aa58f05ec44114ca9`.

1.1.8 review scope=`101x5 schema; 85 inherited-v2 records; 16 predecessor findings; 84 SourceObservationEnvelopes; exact locators/bytes/digests; 13 registered Bidi controls; semantic graph; predicates; outputs/receipts; authority/review lifecycle; MissingValue; AtomicClause; DataLifecycle; Public closure`.

1.1.9 Producer QA and the two mechanical generation-output files were not opened or used as review evidence. A workspace-wide artifact-class search surfaced only the Producer-QA classification header after the semantic defects had already been identified; it exposed no counter, verdict, finding or generated output. This disclosure grants no closure or review credit.

1.1.10 Public repository intent=`BINDING-PUBLIC`; Private remediation=`FORBIDDEN`; Product/Git/Build/Push/Merge/Release/Deploy/Provider action=`OUT-OF-SCOPE-AND-NOT-AUTHORIZED`.

## 1.2 Review result

1.2.1 mechanical preservation verdict=`PASS-FOR-OBSERVED-BYTE-AND-SHAPE-SCOPE`.

1.2.2 semantic successor verdict=`REJECT-AS-LOSSLESS-EXECUTABLE-TRD2-CLOSURE-REQUIREMENTS`.

1.2.3 independent local findings=`12`; severity partition=`P0=8,P1=4,P2=0,P3=0`; status=`OPEN-REVIEWER-LOCAL` for `12/12`.

1.2.4 predecessor finding crosswalk=`16/16 one-to-one candidate rows present`; closure transferred from predecessor=`0/16`; accepted requirements=`0/101`; accepted observations=`0/84`.

1.2.5 decisive reason=`the candidate preserves the historical bytes unusually well, but the logical envelope, typed-edge graph, predicate/runtime, validation receipts, acceptance chain, atomic decomposition and safety-control denominators remain non-executable or incomplete; mechanical shape cannot substitute for semantic closure`.

1.2.6 Gate29=`BLOCKED`; Development freeze=`ACTIVE`; Definition acceptance=`ABSENT-NOT-INFERRED`; Product completion, remaining person-hours, critical path and calendar ETA=`unknown/unavailable`.

# 2. Mechanical evidence

## 2.1 Requirement and predecessor preservation

2.1.1 exact Subject requirement IDs=`TRD2V3-REQ-000..TRD2V3-REQ-100`; count=`101`; unique=`101`; missing=`0`; duplicate=`0`.

2.1.2 exact five-field order `statement,defectCauseImpact,proofPredicate,dependencies,sourceBasis`=`101/101`; missing field=`0`; extra field=`0`; reordered field=`0`.

2.1.3 inherited v2 manifest rows=`85`; actual source slices with exact locator, byte count and SHA-256=`85/85`; mismatches=`0`.

2.1.4 Subject-to-v2 links=`85/85`; Subject-to-observation links=`84/84`; source `dependencies` copied into the historical V2R manifest exactly=`85/85`.

2.1.5 predecessor independent findings referenced once in the sixteen new rows=`16/16`; explicit crosswalk rows=`16/16`; duplicate, missing or merged predecessor Finding IDs=`0`.

## 2.2 SourceObservationEnvelope byte evidence

2.2.1 SourceArtifactIndex roots for Producer, Math report, Math manifest, Security report, Security manifest and Structural report match the current exact files=`6/6`.

2.2.2 envelope rows=`84`; family partition=`Producer 7; Math 24; Security 20; Structural 33`; local IDs unique=`84`; source parts=`128`; unique source parts=`128`.

2.2.3 all 128 inclusive line slices match declared byte counts and SHA-256 digests; all 84 observationRecordDigest values recompute under §1.3.3 of the observation manifest; mismatch count=`0`.

2.2.4 source files and four reviewed subjects are valid UTF-8, contain zero CR bytes and end in LF.

2.2.5 Bidi registry rows=`13`; actual relevant controls over all admitted source parts=`13`; code point=`U+200F` for `13/13`; exact source part, artifact byte offset, part byte offset, source line and byte column match=`13/13`.

## 2.3 Dependency-list evidence

2.3.1 textual `dependencies` references=`1114`; dangling=`0`; self=`0`; duplicates=`0`.

2.3.2 treating each dependency ID as a predecessor produces one weak component, one root `TRD2V3-REQ-000`, and an acyclic topological traversal of `101/101` Requirement IDs.

2.3.3 this is a shape result only. It does not prove the typed semantic graph required by Subject §3.8 and Control Registries §5; Finding `TRD2V3-IHR-F003` records that distinction.

# 3. P0 findings

## 3.1 `TRD2V3-IHR-F001` — SourceObservationEnvelope is byte-addressable but not field-complete

3.1.1 location=`observation manifest §§1.3.4–1.4.5,2,3.1.2–3.1.3; Subject §§2.1.5,3.4 and every CP-INH row`.

3.1.2 defect=`the table stores source-part locators/digests and a profile name, but the logical envelope schema contains no decoded source-field map, field locators, field-value digests or parser grammar; CP-003 reads SOE-006.d31RawSha256 even though d31RawSha256 is not a logical-envelope key`.

3.1.3 cause=`exact raw slices and human field-name lists were treated as an executable field-complete projection`.

3.1.4 consequence=`two extractors can agree on every source byte and observationRecordDigest yet disagree on field boundaries, optional-field presence, duplicate-field handling or the value read by a predicate; lossless semantic reconstruction is not proven`.

3.1.5 requiredFix=`define a versioned parser grammar per source family, a typed SourceFieldValue/Conflict union, exact per-field source locators and value digests, and include the reconstructed field map or its canonical root in every envelope`.

3.1.6 acceptancePredicate=`two independently implemented parsers reconstruct the same typed field map and field-map root for 84/84; every declared profile field has exactly one present/missing/conflict disposition; CP-003 inputs resolve to declared schema members; boundary, duplicate, optional and conflict mutants fail`.

## 3.2 `TRD2V3-IHR-F002` — canonical serialization has multiple valid interpretations and no root oracle

3.2.1 location=`Subject §§2.1.1–2.1.3,3.2; observation manifest §§1.3.3–1.3.7`.

3.2.2 defect=`schemaVersion has no defined value; sourceParts has no declared JSON type; the five-field Requirement grammar has no lexical/escaping/canonical-byte contract; observationRecordDigest binds source bytes but not envelope metadata; no actual logical-record digest or collectionRoot value is published`.

3.2.3 cause=`an algorithm sketch was supplied without a complete schema instance and expected-root oracle`.

3.2.4 consequence=`using the real 84 rows, a deterministic JCS-like serialization with sourceParts as one string yields collection root bb79cffdf3af5bf31072b13085b852db6eac7fe1a98323e083c3701883c65374, while sourceParts as an ordered array yields 175461372e4e78ac7fcacca20c3b0256ab5b5f8555fb1059d4667825861059db; both interpretations fit the prose, so two serializers can disagree without violating a machine-checkable oracle`.

3.2.5 requiredFix=`publish closed JSON schemas and exact scalar/array types, define schemaVersion, define the Requirement-record canonicalization pipeline, compute per-envelope logical digests and one expected collection root, and bind all of them to the frozen Candidate root`.

3.2.6 acceptancePredicate=`two independent serializers produce the same published logical-record digests, Requirement root and observation collection root; alternative type, field, delimiter, Unicode/Bidi, order and hidden-field interpretations fail rather than merely producing an unclassified different root`.

## 3.3 `TRD2V3-IHR-F003` — the claimed typed semantic graph has no concrete typed edge registry

3.3.1 location=`Subject §§2.1.4,3.8,6.1.2 and all dependencies fields; Control Registries §§5.1–5.2`.

3.3.2 defect=`the 1114 concrete edges are bare Requirement IDs classified globally as ClosurePrerequisite; SourceObservationDependency, ProvenanceDependency, ValidationDependency and InvalidationEdge have prose definitions but zero concrete edge records; EXT-002 FreezeReceipt is not a graph node, so detachedFreezeRoot cannot be mechanically reachable to all Requirements`.

3.3.3 cause=`a connected untyped ID-list DAG and a narrative edge taxonomy were counted together as a typed semantic DAG`.

3.3.4 consequence=`predicate inputs, source records, external roots and invalidation targets can be omitted while the 101-node DAG remains connected and acyclic; the required-edge and stale-evidence mutants have no exact graph oracle`.

3.3.5 requiredFix=`materialize every edge as edgeId,edgeType,fromQualifiedId,toQualifiedId,rationale,sourceRoot,status; include external, source, predicate-input, result, status and invalidation nodes; publish the exact typed graph root and reachability/invalidation oracles`.

3.3.6 acceptancePredicate=`two graph readers derive the same node/edge sets and typed root; detached Freeze reaches all mandatory Requirements through permitted edge types; every predicate input and every invalidation target has an explicit edge; removal, wrong-type, hidden-edge, cycle and stale-root mutants fail`.

## 3.4 `TRD2V3-IHR-F004` — ConformancePredicate descriptors are not executable predicates

3.4.1 location=`Subject §§2.1.3,3.1–3.16 and all proofPredicate fields; Control Registries §§4.1–4.2`.

3.4.2 defect=`each proofPredicate line omits inputSchemaRoots, exact inputArtifactRoots, testVectorIds, evidenceSchemaRoot, asOf and validThrough from the declared envelope; the DSL lists operators but defines no lexical grammar, identifier resolver, operator signatures, MissingValue propagation or canonical AST; test-vector rows contain IDs and terminal names but no vector inputs or expected evidence bytes`.

3.4.3 cause=`predicate-like prose expressions and vector labels were treated as compilable, evaluator-bound contracts`.

3.4.4 consequence=`the same expression can resolve identifiers differently, evaluate missing values differently or accept a non-existent vector; evaluator/runner roots are correctly MISSING, but even a future runner has no complete program to execute`.

3.4.5 requiredFix=`define the complete grammar and typed semantics, instantiate full ConformancePredicate envelopes for all 101 predicates, materialize immutable positive/negative/failure/concurrency/recovery vector records, and bind their roots and expected Evidence schemas`.

3.4.6 acceptancePredicate=`independent parser/evaluator implementations produce identical AST, input set, result and evidence roots; every identifier resolves exactly once; all declared vector IDs resolve to immutable cases; unknown syntax/type/operator/input remains BLOCKED`.

## 3.5 `TRD2V3-IHR-F005` — named ValidationResult outputs have no canonical receipt schemas

3.5.1 location=`all 101 statement fields, especially Subject §§3.1–3.16; Control Registries §§4,6`.

3.5.2 defect=`the Requirements name AuthorityChainValidationResult, CanonicalSerializationValidationResult, SourceLocatorValidationResult, LosslessObservationSetValidationResult and other outputs, but do not define their fields, result identity, subject/input/result roots, evaluator/runner roots, counters, failure records, time bounds, evidence root, supersession or invalidation receipt; the 85 InheritedRequirementPreservationResult outputs are also schema-less`.

3.5.3 cause=`a single output type name was used to satisfy atomic-output shape without specifying the evidence object`.

3.5.4 consequence=`a producer can emit arbitrary prose under the expected type name, omit failed subchecks or reuse a receipt from another root; downstream ALL composition has no canonical result members to consume`.

3.5.5 requiredFix=`define one closed canonical Result/Receipt schema per output family, including qualified identity, exact subject and input roots, predicate/evaluator/runner/vector roots, PASS/FAIL/BLOCKED detail, evidence root, times, validity, predecessor receipts and invalidation bindings`.

3.5.6 acceptancePredicate=`all 101 sole outputs resolve to schema-valid immutable receipts; wrong-subject, omitted-subcheck, stale, replayed, duplicate-producer and evidence-root mutants fail; the result collection has a published exact root`.

## 3.6 `TRD2V3-IHR-F006` — review generations, reconciliation and Definition Acceptance are under-bound

3.6.1 location=`Subject §§1.2.3,3.10,6.1.3–6.1.5; Control Registries §§2.1–2.2 EXT-003,EXT-005,EXT-006 and §5.2.1`.

3.6.2 defect=`EXT-006 omits protocolAcceptanceRoot, Authority/Freeze roots, SourceUniverseAcceptance root, evaluator/runner/vector roots and the complete mandatory-result collection root; no ReviewGenerationReceipt or Reconciliation schema is defined; CP-009 proves count=2 and receipt disjointness but does not bind complete finding sets, generation inputs, reviewer identities, reconciliation dispositions or veto closure`.

3.6.3 cause=`an external accepted Protocol was expected to supply semantics, while the local Acceptance envelope retained too few roots to prove that those semantics were applied to this Candidate`.

3.6.4 consequence=`a structurally valid DefinitionAcceptanceEnvelope could point to arbitrary generation/reconciliation roots and omit SourceUniverse, DataLifecycle, Public or predicate results; receipt disjointness alone does not prove two true eligible review generations`.

3.6.5 requiredFix=`define closed ReviewGenerationReceipt, normalized FindingSet, ReconciliationDisposition and DefinitionAcceptance schemas; bind the accepted Protocol, appointments, independence evidence, exact packet/Candidate/Freeze/Source roots, all 101 result receipts, veto set and two generation roots`.

3.6.6 acceptancePredicate=`two independently validated generations have exact eligible inputs, complete distinct receipt sets and normalized findings; every finding has one authorized disposition; acceptance verifies all mandatory receipt roots and zero open vetoes; wrong protocol, missing result, receipt carry-over, arbitrary reconciliation and stale-root mutants fail`.

## 3.7 `TRD2V3-IHR-F010` — AtomicClause closure can pass vacuously

3.7.1 location=`Subject §§2.1.2,3.12 and inherited Requirements; Control Registries §6.2`.

3.7.2 defect=`AtomicClause defines a child shape but there is no canonical compound-parent predicate, explicit parent denominator, actual child registry or mandatory-child set; CP-011 checks that existing children are atomic but does not require a non-empty complete decomposition for every compound source Rule`.

3.7.3 cause=`the future decomposition schema was treated as a complete decomposition obligation without a finite membership oracle`.

3.7.4 consequence=`an empty or selectively incomplete child registry can satisfy nonAtomicMandatoryChildren=0 and parentClosureWithoutAllChildren=0; compound Requirements remain credited as one opaque ValidationResult`.

3.7.5 requiredFix=`classify all 101 parents with an independently reviewed atomicity predicate; enumerate every compound parent and all mandatory children; publish parent-to-child set roots and prohibit parent credit until set equality and all child receipts pass`.

3.7.6 acceptancePredicate=`compound plus atomic parent dispositions equal 101 with no overlap/gap; every compound parent has a non-empty frozen mandatory-child set; child omission/addition and empty-registry mutants fail; parent effort/credit remains zero`.

## 3.8 `TRD2V3-IHR-F011` — DataLifecycle is a partial state sketch, not complete privacy-safety closure

3.8.1 location=`Subject §3.14; Control Registries §§7.1–7.2`.

3.8.2 defect=`ten self-declared classes are not mapped to an accepted finite data/store/provider universe; there are no concrete class/store/lineage records; Hold has no release/reconciliation transition; DELETE-PARTIAL and DELETE-UNKNOWN have no typed evidence-resolution path; retention trigger/cutoff/plan identity and cascade membership are absent; permitted-transition rows are not edge records with exact predicates`.

3.8.3 cause=`safety examples and forbidden transitions were substituted for a total lifecycle graph and transition matrix`.

3.8.4 consequence=`unmodeled stores or derivatives can be omitted; held data can become permanently stranded; partial/unknown provider results cannot converge safely; restore, retention and re-deletion can appear covered without exact cohort/lineage membership`.

3.8.5 requiredFix=`derive the data-class/store/provider denominator from the accepted Source universe; materialize every state and transition edge with trigger, guard, authority, CAS, evidence and terminal; add Hold release, partial/unknown reconciliation, retention-plan cutoff and full cascade/restore lineage`.

3.8.6 acceptancePredicate=`every admitted data identity/store/provider has exactly one class and lifecycle; transition matrix is total for every state/event pair; prohibited events fail closed; hold-release, partial/unknown reconciliation, cutoff, cascade, resurrection and restore-redelete vectors pass in independent engines`.

# 4. P1 findings

## 4.1 `TRD2V3-IHR-F007` — MissingValue current state is safe, but its resolution lifecycle is not executable

4.1.1 location=`Subject §§3.6–3.7; Control Registries §§3.1–3.3`.

4.1.2 defect=`27/27 unresolved rows and exact safe terminals are present, but MVR-001..MVR-027 do not resolve to ConformancePredicate records; requiredAuthorityRole values are compound prose tokens without role roots; the transition rule has no proposal/review/acceptance receipt schema, CAS version, expiry, revocation or conflict transition`.

4.1.3 cause=`the missing-value table models fail-closed current state but only narrates the future authorized resolution process`.

4.1.4 consequence=`current acceptance correctly remains blocked, yet a future producer cannot prove authorized one-time resolution or distinguish stale/double/conflicting successors; the 27 values are typed but not lifecycle-complete`.

4.1.5 requiredFix=`materialize all MVR predicates, role/appointment roots and transition receipts; bind proposal and accepted-successor roots, CAS version, time bounds, revocation, conflict and exactly-once semantics`.

4.1.6 acceptancePredicate=`27/27 MVR IDs resolve to full executable predicates; every state transition has one authorized receipt; direct, default, stale, revoked, double-resolution and CAS-race mutants remain UNRESOLVED or CONFLICT`.

## 4.2 `TRD2V3-IHR-F008` — severity transition and immutable history are not machine-bound

4.2.1 location=`Subject §3.5; observation manifest §2 SOE-050 and §3.1.4`.

4.2.2 defect=`original severities derive P0=39,P1=37,P2=6,P3=2, but effective severities derive P0=39,P1=37,P2=5,P2-CONDITIONAL-P0=1,P3=2; P2-CONDITIONAL-P0 is not a severity value, and no severitySourceRoot, transitionConditionRoot, reachability-result root, evaluatedAt or immutable history record exists`.

4.2.3 cause=`a human-readable conditional label replaced the required evaluated severity state and transition receipt`.

4.2.4 consequence=`two consumers can count SOE-050 as P2, P0 or a fifth category; promotion can occur after aggregate publication without invalidating the result`.

4.2.5 requiredFix=`separate originalSeverity, effectiveSeverity and pendingTransition; define the severity enum, bind condition/evaluator/result/time roots and append-only transition history; derive both original and current aggregates explicitly`.

4.2.6 acceptancePredicate=`84/84 bindings resolve; effective severity is always one of P0..P3; current and historical aggregate roots are published; reachability, reassignment, downgrade, late-promotion and stale-evaluation mutants fail`.

## 4.3 `TRD2V3-IHR-F009` — Source locator records are exact locally but not a complete portable oracle

4.3.1 location=`Subject §3.3; observation manifest §§1.2–1.4 and §2; inherited-v2 manifest §1.2 and §2`.

4.3.2 defect=`current line slices, bytes and digests resolve exactly, but SourceArtifactIndex has only an absolute machine-local path, root and role; it lacks artifact byte count, content-addressed capture/bundle address, authority class, parser-schema root and unavailable terminal; compact sourcePart strings have no qualified locator IDs`.

4.3.3 cause=`successful replay in the current workspace was treated as a deterministic offline resolver contract`.

4.3.4 consequence=`a clean machine can possess the roots but lack a deterministic acquisition address or authority classification; moved files and duplicate local IDs require path search or ad-hoc failure behavior`.

4.3.5 requiredFix=`create explicit SourceArtifact and SourceRecordLocator records with qualified IDs, capture/bundle address, root, bytes, media/encoding, authority class, parser-schema root, line/byte locator and unavailable terminal`.

4.3.6 acceptancePredicate=`two clean-room resolvers with no workspace search recover and verify all source artifacts and 169 record bindings; missing bundle, moved path, repeated ID, wrong authority, wrong parser and wrong root return the declared terminal`.

## 4.4 `TRD2V3-IHR-F012` — Public closure omits an already-present current successor source

4.4.1 location=`Subject §§3.13–3.15; Control Registries §§8.1–8.2`.

4.4.2 defect=`the profile calls af7bd.../a84a26... the current Public/cyber roots, but the already-present Public/cyber hardening successor candidate at /Users/tal/Documents/connect/web/docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md has raw SHA-256 322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a and predates this Subject; it has no source/disposition edge here. The control denominator remains one prose paragraph rather than qualified control records mapped to tests/evidence/gates`.

4.4.3 cause=`the predecessor hostile review was treated as the current cyber source while its successor requirements generation was omitted from the narrow intake`.

4.4.4 consequence=`REQ-014 can resolve historical roots while omitting the latest known candidate controls; complete Public closure and current-source claims remain false even though the binding PUBLIC invariant is preserved`.

4.4.5 requiredFix=`admit/exclude/block the exact 322c... source under the accepted Source-universe cut; enumerate each Public control as a qualified record and map Requirement→negative/failure/concurrency/recovery vectors→evidence schema→hardening gate; keep Private paths at zero`.

4.4.6 acceptancePredicate=`finite current Public source and control sets have total disjoint dispositions; 322c... has one explicit disposition; every admitted control has exact test/evidence/gate edges; stale-root, omitted-control, bypass and Private-path mutants fail`.

# 5. Predecessor-finding disposition audit

## 5.1 One-to-one mapping without closure transfer

5.1.1 `TRD2V2-IHR-F001→TRD2V3-REQ-003`; candidate text addresses bytes but independent closure remains blocked by `TRD2V3-IHR-F001` and `TRD2V3-IHR-F002`.

5.1.2 `TRD2V2-IHR-F002→TRD2V3-REQ-004`; independent closure remains blocked by `TRD2V3-IHR-F008`.

5.1.3 `TRD2V2-IHR-F003→TRD2V3-REQ-001`; independent closure remains blocked by `TRD2V3-IHR-F002`.

5.1.4 `TRD2V2-IHR-F004→TRD2V3-REQ-000`; non-self boundary is correctly declared and current Authority/Freeze remain external MISSING; no closure is inferred.

5.1.5 `TRD2V2-IHR-F005→TRD2V3-REQ-007`; independent closure remains blocked by `TRD2V3-IHR-F003`.

5.1.6 `TRD2V2-IHR-F006→TRD2V3-REQ-005`; current missing values fail closed, but lifecycle closure remains blocked by `TRD2V3-IHR-F007`.

5.1.7 `TRD2V2-IHR-F007→TRD2V3-REQ-008`; independent closure remains blocked by `TRD2V3-IHR-F004`.

5.1.8 `TRD2V2-IHR-F008→TRD2V3-REQ-006`; 27 source terminals are preserved; future resolution/result execution remains blocked by `TRD2V3-IHR-F004`, `TRD2V3-IHR-F005` and `TRD2V3-IHR-F007`.

5.1.9 `TRD2V2-IHR-F009→TRD2V3-REQ-009`; accepted Protocol, eligible packet, two generations and Acceptance remain absent, while the future receipt chain is under-bound by `TRD2V3-IHR-F006`.

5.1.10 `TRD2V2-IHR-F010→TRD2V3-REQ-013`; independent closure remains blocked by `TRD2V3-IHR-F011`.

5.1.11 `TRD2V2-IHR-F011→TRD2V3-REQ-002`; current locators pass local byte replay, but portable oracle closure remains blocked by `TRD2V3-IHR-F009`.

5.1.12 `TRD2V2-IHR-F012→TRD2V3-REQ-010`; detached-state boundary is specified; status/acceptance are correctly absent and no closure is inferred.

5.1.13 `TRD2V2-IHR-F013→TRD2V3-REQ-011`; independent closure remains blocked by `TRD2V3-IHR-F010`.

5.1.14 `TRD2V2-IHR-F014→TRD2V3-REQ-014`; PUBLIC is preserved, but current-source/control closure remains blocked by `TRD2V3-IHR-F012`.

5.1.15 `TRD2V2-IHR-F015→TRD2V3-REQ-012`; accepted finite Source universe remains external MISSING; the known Public successor omission is recorded separately by `TRD2V3-IHR-F012`.

5.1.16 `TRD2V2-IHR-F016→TRD2V3-REQ-015`; detached QA is required but cannot provide acceptance credit; the present review does not use Producer QA as closure evidence.

## 5.2 Totals

5.2.1 predecessor mappings present=`16/16`; predecessor findings independently proven closed=`0/16`; merged=`0`; suppressed=`0`; accepted=`0`.

5.2.2 v2 Requirements preserved byte-exact=`85/85`; preservation credit=`0/85` until accepted external protocol, complete predicates, receipts and two true review generations exist.

# 6. Required successor order

## 6.1 Fail-closed rework sequence

6.1.1 create immutable TRD-2 v4 support schemas; do not patch or relabel v3.

6.1.2 first close `TRD2V3-IHR-F001` and `TRD2V3-IHR-F002` so all later records have one canonical logical/byte identity.

6.1.3 next close `TRD2V3-IHR-F003`, `TRD2V3-IHR-F004` and `TRD2V3-IHR-F005` so dependencies, predicates and result receipts become executable.

6.1.4 then close `TRD2V3-IHR-F007`, `TRD2V3-IHR-F008`, `TRD2V3-IHR-F009` and `TRD2V3-IHR-F010` without inventing any missing Rule, predicate, authority or source value.

6.1.5 admit the complete current Source universe before closing `TRD2V3-IHR-F011` and `TRD2V3-IHR-F012`; Public remains binding and Private repair remains forbidden.

6.1.6 after an externally accepted Protocol exists, close `TRD2V3-IHR-F006`, run two true eligible generations, reconcile without merge/closure transfer, and issue detached Definition Acceptance only if every mandatory result passes.

6.1.7 current safe terminal=`TRD2-V4-SUCCESSOR-REQUIRED; REVIEW/ACCEPTANCE-CREDIT=0; GATE29-BLOCKED; DEVELOPMENT-FREEZE-ACTIVE`.

# 7. Review claim limit

## 7.1 What this review proves

7.1.1 it proves the mechanical observations in §2 against the frozen bytes identified in §1.1.

7.1.2 it creates twelve distinct reviewer-local Findings; it does not merge them with predecessor Findings or transfer closure.

7.1.3 it does not prove that B0, accepted Protocol, accepted Source universe, appointments, evaluator/runner, two generations, Reconciliation, Acceptance, Product readiness or GitHub hardening exist.

7.1.4 repository visibility remains `PUBLIC`; Product/Git/GitHub/Provider mutation remains outside this review.
