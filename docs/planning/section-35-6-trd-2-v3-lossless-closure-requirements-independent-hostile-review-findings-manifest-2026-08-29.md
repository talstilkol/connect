# 1. Connect — TRD-2 v3 lossless-closure independent hostile-review findings manifest

## 1.1 זהות וגבול סמכות

1.1.1 `artifactId=CONNECT-SECTION-35-6-TRD-2-V3-LOSSLESS-CLOSURE-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-2026-08-29-V1`.

1.1.2 reviewed Subject path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v3-lossless-closure-requirements-2026-08-29.md`; exact raw SHA-256=`797a027f604a6963758770fa9825345e4f0f636f1575be5370098b12806d772c`.

1.1.3 source independent-review path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v3-lossless-closure-requirements-independent-hostile-review-2026-08-29.md`; exact raw SHA-256=`143358b01da788dc7f38fa014d06f677b6d03ab48fb58a82ebfa3474083ca9de`; physical identity=`315 lines/28593 bytes`.

1.1.4 support roots=`8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec;392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3;caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de`.

1.1.5 artifactClass=`PLANNING-ONLY; REVIEWER-LOCAL-FINDINGS; OPEN; NOT-RECONCILED; NOT-ACCEPTED; NOT-GATE-CREDIT`.

1.1.6 namespace=`TRD2V3-IHR-F001..TRD2V3-IHR-F012`; exact count=`12`; severity=`P0=8,P1=4,P2=0,P3=0`.

1.1.7 Public repository intent=`BINDING-PUBLIC`; Private remediation=`FORBIDDEN`; Product/Git/Build/Push/Merge/Release/Deploy/Provider authority=`NONE`.

## 1.2 Record contract

1.2.1 every Finding contains exactly and in order: `findingId`, `severity`, `location`, `defect`, `cause`, `consequence`, `requiredFix`, `acceptancePredicate`, `status`, `noMergeKey`.

1.2.2 `noMergeKey` equals its own `findingId`. Similarity, shared predecessor, common output or common remediation grants no Merge, Closure or Credit transfer.

1.2.3 all predicates below are future closure requirements only. Presence in this manifest proves no remediation or acceptance.

# 2. Findings

## 2.1 `TRD2V3-IHR-F001`

- `findingId`: TRD2V3-IHR-F001

- `severity`: P0

- `location`: observation manifest §§1.3.4–1.4.5,2,3.1.2–3.1.3; Subject §§2.1.5,3.4 and every CP-INH row

- `defect`: SourceObservationEnvelope preserves exact source slices but contains no typed decoded field map, field locators/digests or executable parser grammar; CP-003 references SOE-006.d31RawSha256 although that key is absent from the logical-envelope schema

- `cause`: byte addressability and human profile-name lists were treated as field-complete semantic reconstruction

- `consequence`: two extractors can agree on all source bytes and observation digests while disagreeing on fields consumed by closure predicates

- `requiredFix`: define parser grammars, typed SourceFieldValue/Conflict, exact per-field locators/digests and a canonical reconstructed-field-map root for every envelope

- `acceptancePredicate`: two independent parsers reconstruct equal typed field maps for 84/84; present/missing/conflict disposition is total and CP inputs resolve only to declared members; parser mutants fail

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F001

## 2.2 `TRD2V3-IHR-F002`

- `findingId`: TRD2V3-IHR-F002

- `severity`: P0

- `location`: Subject §§2.1.1–2.1.3,3.2; observation manifest §§1.3.3–1.3.7

- `defect`: schemaVersion value, sourceParts JSON type, Requirement-record grammar, logical-record digests and expected collectionRoot are absent; real rows yield different roots under string versus array interpretations

- `cause`: an algorithm sketch was supplied without a complete canonical schema instance and root oracle

- `consequence`: conforming serializers can derive different roots without a machine-verifiable winner

- `requiredFix`: publish closed schemas/types and full Requirement/envelope canonicalization, then bind exact logical-record and collection roots to the frozen Candidate

- `acceptancePredicate`: two independent serializers equal the published roots and all alternative type/field/delimiter/Unicode/Bidi/order/hidden-field mutants fail

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F002

## 2.3 `TRD2V3-IHR-F003`

- `findingId`: TRD2V3-IHR-F003

- `severity`: P0

- `location`: Subject §§2.1.4,3.8,6.1.2 and all dependencies fields; Control Registries §§5.1–5.2

- `defect`: 1114 concrete dependencies are untyped Requirement-ID lists while SourceObservation, Provenance, Validation and Invalidation edge types have zero concrete records; detached Freeze is not a graph node

- `cause`: connected untyped DAG shape and a narrative type taxonomy were counted as a typed semantic graph

- `consequence`: source, predicate-input, external and invalidation edges can be omitted while mechanical graph QA remains green

- `requiredFix`: materialize every qualified typed edge and all external/source/result/status nodes; publish exact graph and invalidation roots

- `acceptancePredicate`: two graph readers derive identical typed sets; Freeze reaches all mandatory nodes; every input/invalidation target has an edge; wrong-type, omission, hidden-edge, cycle and stale-root mutants fail

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F003

## 2.4 `TRD2V3-IHR-F004`

- `findingId`: TRD2V3-IHR-F004

- `severity`: P0

- `location`: Subject §§2.1.3,3.1–3.16 and all proofPredicate fields; Control Registries §§4.1–4.2

- `defect`: proof descriptors omit declared predicate-envelope roots/times/evidence fields; the DSL has no executable grammar or typed operator semantics; test vectors have IDs but no immutable inputs or expected evidence

- `cause`: predicate-like expressions and vector labels were treated as executable contracts

- `consequence`: future runners can resolve identifiers and MissingValue differently or accept non-existent vectors

- `requiredFix`: define grammar/typed semantics, instantiate full predicate envelopes and materialize rooted vector records with evidence schemas

- `acceptancePredicate`: independent parsers/runners produce identical AST, input, result and evidence roots; all IDs resolve; unknown syntax/type/input stays BLOCKED

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F004

## 2.5 `TRD2V3-IHR-F005`

- `findingId`: TRD2V3-IHR-F005

- `severity`: P0

- `location`: all 101 statement fields, especially Subject §§3.1–3.16; Control Registries §§4,6

- `defect`: named ValidationResult and InheritedRequirementPreservationResult outputs have no canonical schema binding subject/input/result/evidence/evaluator/runner/vector roots, detailed subresults, validity or invalidation

- `cause`: one output type name was used to satisfy shape without defining its receipt object

- `consequence`: arbitrary prose, omitted failures and wrong-root receipt reuse can masquerade as the required sole output

- `requiredFix`: define closed immutable Result/Receipt schemas for every output family and one rooted collection of all 101 results

- `acceptancePredicate`: 101/101 outputs are schema-valid sole-producer receipts; wrong subject, omitted subcheck, stale/replayed/duplicate result and wrong evidence mutants fail

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F005

## 2.6 `TRD2V3-IHR-F006`

- `findingId`: TRD2V3-IHR-F006

- `severity`: P0

- `location`: Subject §§1.2.3,3.10,6.1.3–6.1.5; Control Registries §§2.1–2.2 EXT-003,EXT-005,EXT-006 and §5.2.1

- `defect`: Definition Acceptance omits several mandatory predecessor/result roots; ReviewGenerationReceipt and Reconciliation schemas are absent; count=2 plus receipt disjointness does not prove complete eligible generations or finding closure

- `cause`: external Protocol semantics were assumed without locally binding proof that they were applied to this exact Candidate

- `consequence`: arbitrary generation/reconciliation roots can omit SourceUniverse, DataLifecycle, Public, predicate results or vetoes

- `requiredFix`: define and root complete generation, finding-set, reconciliation and acceptance schemas binding Protocol, appointments, Candidate/Freeze/Source, all 101 result receipts and vetoes

- `acceptancePredicate`: two eligible generations have exact inputs and complete distinct receipt sets; all findings have one disposition; all mandatory roots pass; carry-over/omission/stale/arbitrary-reconciliation mutants fail

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F006

## 2.7 `TRD2V3-IHR-F007`

- `findingId`: TRD2V3-IHR-F007

- `severity`: P1

- `location`: Subject §§3.6–3.7; Control Registries §§3.1–3.3

- `defect`: 27 safe unresolved rows exist, but MVR-001..027 have no predicate records, authority-role roots, transition receipts, CAS, expiry, revocation or conflict lifecycle

- `cause`: fail-closed current state was modeled while future authorized resolution remained prose

- `consequence`: future resolution cannot prove authority, freshness or exactly-once successor behavior

- `requiredFix`: materialize MVR predicates, role/appointment roots and time/CAS/revocation/conflict-bound transition receipts

- `acceptancePredicate`: 27/27 MVRs execute; each transition has one authorized receipt; default, direct, stale, revoked, double and race mutants remain UNRESOLVED or CONFLICT

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F007

## 2.8 `TRD2V3-IHR-F008`

- `findingId`: TRD2V3-IHR-F008

- `severity`: P1

- `location`: Subject §3.5; observation manifest §2 SOE-050 and §3.1.4

- `defect`: effectiveSeverity includes non-severity P2-CONDITIONAL-P0 and lacks source/condition/evaluation/history roots; original and effective aggregates differ without a defined derivation

- `cause`: a conditional human label replaced evaluated severity state and transition receipt

- `consequence`: SOE-050 can be counted as P2, P0 or a fifth category and late promotion need not invalidate the aggregate

- `requiredFix`: separate current severity from pending transition and bind enum, condition, evaluator, result, time and append-only history roots

- `acceptancePredicate`: 84/84 current severities are P0..P3; current/history aggregates are rooted; reachability, reassignment, downgrade, late-promotion and stale mutants fail

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F008

## 2.9 `TRD2V3-IHR-F009`

- `findingId`: TRD2V3-IHR-F009

- `severity`: P1

- `location`: Subject §3.3; observation manifest §§1.2–1.4 and §2; inherited-v2 manifest §§1.2–2

- `defect`: local locators replay exactly but SourceArtifactIndex lacks content-addressed acquisition, bytes, authority class, parser-schema root and unavailable terminal; sourcePart strings have no qualified locator IDs

- `cause`: current-workspace success was treated as a portable offline resolver contract

- `consequence`: clean-room replay can require filesystem search or ad-hoc handling of moved/missing/ambiguous artifacts

- `requiredFix`: create qualified SourceArtifact and SourceRecordLocator records with capture address, roots/bytes/encoding/authority/parser and unavailable terminal

- `acceptancePredicate`: two clean-room resolvers recover all artifacts and 169 record bindings without search; missing/moved/repeated/wrong-authority/parser/root cases reach the exact terminal

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F009

## 2.10 `TRD2V3-IHR-F010`

- `findingId`: TRD2V3-IHR-F010

- `severity`: P0

- `location`: Subject §§2.1.2,3.12 and inherited Requirements; Control Registries §6.2

- `defect`: no compound-parent classifier, finite parent denominator, concrete child registry or mandatory-child set exists; empty or partial child registries can satisfy CP-011 counters

- `cause`: a future child schema was treated as a complete decomposition obligation

- `consequence`: compound Requirements can remain opaque or receive partial/full credit with omitted actions

- `requiredFix`: disposition all 101 parents as atomic/compound and enumerate non-empty frozen mandatory child sets for every compound parent

- `acceptancePredicate`: atomic plus compound equals 101 without overlap/gap; every compound has complete children; empty/omitted/extra-child mutants fail; parent credit remains zero

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F010

## 2.11 `TRD2V3-IHR-F011`

- `findingId`: TRD2V3-IHR-F011

- `severity`: P0

- `location`: Subject §3.14; Control Registries §§7.1–7.2

- `defect`: data classes are not mapped to an accepted finite store/provider universe; concrete lineage/transition edges are absent; Hold release, partial/unknown resolution, retention plan/cutoff and cascade membership are incomplete

- `cause`: safety examples and forbidden transitions were substituted for a total lifecycle graph

- `consequence`: omitted stores/derivatives, stranded holds, unresolved provider outcomes and unsafe restore/retention claims remain possible

- `requiredFix`: derive the full denominator and materialize every state/event transition with guard, authority, CAS, evidence, lineage and terminal, including hold release and provider reconciliation

- `acceptancePredicate`: every admitted identity/store/provider has one lifecycle; state/event matrix is total; hold, partial/unknown, cutoff, cascade, resurrection and restore-redelete vectors pass independently

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F011

## 2.12 `TRD2V3-IHR-F012`

- `findingId`: TRD2V3-IHR-F012

- `severity`: P1

- `location`: Subject §§3.13–3.15; Control Registries §§8.1–8.2

- `defect`: the profile labels predecessor review roots current but omits the already-present earlier-mtime Public/cyber successor candidate root 322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a; control membership and test/evidence/gate mappings remain prose

- `cause`: predecessor hostile review was treated as the current source while its successor generation was omitted

- `consequence`: historical roots can resolve while current Public controls are missing; complete Public closure remains false despite correct PUBLIC invariant

- `requiredFix`: disposition the 322c... source under the accepted cut and enumerate qualified controls with exact vector/evidence/gate edges; keep Private paths zero

- `acceptancePredicate`: current Public source/control sets have total disjoint dispositions; 322c... is dispositioned; all admitted controls map to tests/evidence/gates; stale/omitted/bypass/Private mutants fail

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V3-IHR-F012

# 3. Manifest QA and safe terminal

## 3.1 Shape and totals

3.1.1 exact IDs=`TRD2V3-IHR-F001..TRD2V3-IHR-F012`; unique=`12`; missing=`0`; duplicate=`0`.

3.1.2 exact ten-field records=`12/12`; missing field=`0`; extra field=`0`; reordered field=`0`.

3.1.3 severity partition=`P0=8,P1=4,P2=0,P3=0`; total=`12`.

3.1.4 status=`OPEN-REVIEWER-LOCAL` for `12/12`; noMergeKey equals findingId=`12/12`; closed=`0`; merged=`0`; suppressed=`0`; accepted=`0`.

## 3.2 Disposition

3.2.1 review verdict=`REJECT-AS-LOSSLESS-EXECUTABLE-TRD2-CLOSURE-REQUIREMENTS`.

3.2.2 next artifact=`IMMUTABLE-TRD2-V4-SUCCESSOR-REQUIRED`; v3 mutation or relabel=`FORBIDDEN`.

3.2.3 accepted Protocol=`ABSENT`; accepted Source universe=`ABSENT`; two eligible review generations=`0/2`; Definition Acceptance=`ABSENT`; no state is inferred from candidate or QA prose.

3.2.4 Gate29=`BLOCKED`; Development freeze=`ACTIVE`; repository visibility=`PUBLIC`; Private remediation=`FORBIDDEN`; Product/Git/GitHub/Provider authority=`NONE`.

3.2.5 Product completion, remaining person-hours, critical path and calendar ETA=`unknown/unavailable`.
