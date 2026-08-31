# 1. Connect — B0 v4 independent hostile-review Findings manifest

## 1.1 Manifest identity and claim limit

1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-V4-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30-G0`.

1.1.2 `artifactClass=DETACHED-NON-MERGED-INDEPENDENT-FINDINGS-MANIFEST;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE;NOT-CLOSURE`.

1.1.3 Frozen Subject: `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v4-2026-08-29.md`, SHA-256 `4a45fd1b9e2aeefefff28862676f5cfa7c87f5141d81edcf9691a908c7c8f0c9`.

1.1.4 Frozen atomic manifest: `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v4-atomic-package-manifest-2026-08-29.json`, SHA-256 `8a782b55eb92768288a5f1d64e04f76869c4af739e1e2f997a257c34c65709ad`.

1.1.5 Companion hostile review: `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v4-independent-hostile-review-2026-08-30.md`.

1.1.6 Frozen denominator: `12` distinct Findings. Identity-preserving state: `P0=9`, `P1=2`, `P2=1`, `P3=0`; `OPEN-BLOCKING=11`, `OPEN-NONBLOCKING=1`, `CLOSED=0/12`.

1.1.7 Findings are non-merged. One Finding's remediation, evidence or closure cannot close another. Every future disposition must cite the exact Finding ID and `noMergeKey`.

1.1.8 Severity semantics:

| Severity | Meaning in this manifest |
|---|---|
| P0 | authority, acceptance, exact-import or proof-model failure capable of granting false closure or making the machine predicate non-causal |
| P1 | mandatory integrity/role/provenance defect that blocks successor acceptance but is not itself an immediate authority grant |
| P2 | portability or verification defect that must be repaired but is not independently sufficient to grant authority |
| P3 | advisory-only defect; none found |

## 1.2 Index

| Finding | Severity | State | `noMergeKey` | Acceptance credit |
|---|---|---|---|---:|
| `B0V4-HR-F001` | P0 | OPEN-BLOCKING | `B0V4-SOURCE-MEMBER-SPAN-IDENTITY-COLLAPSE` | 0 |
| `B0V4-HR-F002` | P0 | OPEN-BLOCKING | `B0V4-TYPED-SUPERSESSION-NONLITERAL-UNRESOLVED` | 0 |
| `B0V4-HR-F003` | P1 | OPEN-BLOCKING | `B0V4-PRESERVED-B0V1-SOURCE-LOCATORS-UNRESOLVED` | 0 |
| `B0V4-HR-F004` | P0 | OPEN-BLOCKING | `B0V4-NAMEDUSE-SEMANTIC-UNIVERSE-AND-INTERFACE-INSTANCES-ABSENT` | 0 |
| `B0V4-HR-F005` | P0 | OPEN-BLOCKING | `B0V4-MUTABLE-HEAD-MEMBERSHIP-SELF-CYCLES` | 0 |
| `B0V4-HR-F006` | P0 | OPEN-BLOCKING | `B0V4-VECTOR-PROGRAMS-SCENARIO-VACUOUS-NO-CAUSAL-ORACLE` | 0 |
| `B0V4-HR-F007` | P0 | OPEN-BLOCKING | `B0V4-PERMIT-REVISION-FENCE-TIME-REPLAY-FIELDS-NOT-CLOSED` | 0 |
| `B0V4-HR-F008` | P0 | OPEN-BLOCKING | `B0V4-TWO-WITNESS-AND-PROOF-CLASS-INDEPENDENCE-DENOMINATORS-ABSENT` | 0 |
| `B0V4-HR-F009` | P0 | OPEN-BLOCKING | `B0V4-ACCEPTANCE-CAS-EXPECTED-POINTER-FENCE-ATTEMPT-COMPARES-ABSENT` | 0 |
| `B0V4-HR-F010` | P0 | OPEN-BLOCKING | `B0V4-GENESIS-FOUNDATION-LABELS-NOT-CLOSED-CAUSAL-SCHEMAS` | 0 |
| `B0V4-HR-F011` | P1 | OPEN-BLOCKING | `B0V4-RECOVERY-MEMBER-SCHEMA-AND-AUTHORITYOWNER-SEPARATION-GAP` | 0 |
| `B0V4-HR-F012` | P2 | OPEN-NONBLOCKING | `B0V4-PACKAGE-CONTENT-ROOT-DERIVATION-UNSPECIFIED` | 0 |

# 2. Individual non-merged Findings

## 2.1 `B0V4-HR-F001` — source-member identity collapses to a one-byte heading marker

2.1.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V4-SOURCE-MEMBER-SPAN-IDENTITY-COLLAPSE`.

2.1.2 `predicateUnderTest`: every imported Requirement/Finding member must resolve to one exact, physically bounded byte member whose digest authenticates the full member content used by preservation, supersession and vector fixtures.

2.1.3 `affectedClaims`: Subject §§1.2.1, 1.3.3, 2.2 and all preserved Requirements `B0V4REQ-014..083`; crosswalk source-member identity; vector fixture provenance; v3 Findings `B0V3-HR-F002` and `B0V3-HR-F008`.

2.1.4 `observedEvidence`:

- Exactly `202` predecessor ID locators span one byte and all hash to `334359b90efed75da5f0ada1d5e6b256f4a6bd0aee7eb39c0f90182a021ffc8b`, the SHA-256 of `#`.
- Distribution is v3 Requirements `70`, v3 Findings `13`, v2 Requirements `49`, v2 Findings `21`, originals `27`, legacy Findings `22`.
- Examples: source-index locator `B0V3REQ-000` spans bytes `[5270,5271)`; `B0V3-HR-F001` spans `[3111,3112)`. Both select only `#`.
- All `202` corresponding crosswalk rows reuse that same digest.
- `249/252` vector fixtures use the same one-byte source-member digest.

2.1.5 `failureTrace`: change every byte in a predecessor Requirement/Finding body while retaining its heading marker `#`. The crosswalk's `sourceMemberSha256` and the vector fixture's selected member digest remain unchanged, so the purported member identity does not authenticate the preserved member. Independently copied field strings may still match a generator's expectation, but they are not derived from the claimed source member.

2.1.6 `requiredDelta`: in a new successor, define a canonical whole-member grammar; bind every Requirement/Finding ID to the complete contiguous member byte range; separately bind the five exact field ranges; recompute all member digests, crosswalk rows and fixtures from those ranges; prohibit zero/one-marker member ranges.

2.1.7 `requiredNegativeVectors`: body substitution with unchanged `#`; two distinct IDs mapped to the same span; heading-only span; field outside member bounds; reordered fields; changed field with stale member digest.

2.1.8 `closureEvidenceRequired`: two independent parsers reconstruct all source members and fields from raw frozen bytes, agree on byte ranges/digests, prove uniqueness and complete coverage, and fail every negative vector. Stored crosswalk strings alone receive zero closure credit.

2.1.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 2.2 `B0V4-HR-F002` — typed supersessions are neither locator-resolved nor atom-literal

2.2.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V4-TYPED-SUPERSESSION-NONLITERAL-UNRESOLVED`.

2.2.2 `predicateUnderTest`: each of the only ten permitted contradictory-atom replacements must select one exact predecessor field/clause byte range, contain the old atom literally, bind a canonical replacement, preserve surrounding mandatory conjuncts and prove non-weakening.

2.2.3 `affectedClaims`: `B0V4REQ-000`, `001`, `002`, `039`, `040`, `055`, `057`, `062`, `069`, `070`, `078`; lifecycle, portable path, G1/G2 and Approver import; v3 Findings `B0V3-HR-F001`, `F002`, `F003`, `F007`.

2.2.4 `observedEvidence`:

- All `10/10` `typedSupersessions[].sourceReference` locators are absent from the frozen source index. They include field forms such as `B0V2REQ-022.requiredProof`, `B0V3REQ-062.statement` and clause form `§6.2.2.clause`.
- `9/10` `oldAtom` values are not literal substrings of the named predecessor field bytes. They normalize punctuation, backticks or surrounding terms and thereby become paraphrases.
- `B0V4-SUP-GEN-003` is the only literal old-atom match; its clause locator still does not resolve.
- Example: `B0V4-SUP-LIFE-001` says `response loss may yield COMMITTED-UNCONFIRMED as an immutable terminal`, while the predecessor contains backticks and additional exact wording. No byte span identifies the replacement target.

2.2.5 `failureTrace`: one reducer treats the paraphrase as replacing the entire predecessor sentence; another replaces only the normalized phrase; a third rejects the nonexistent field locator. Each preserves a different set of safety conjuncts, so lifecycle/finalization or Permit parity is not single-valued.

2.2.6 `requiredDelta`: provide an exact field locator present in the source index, byte offsets for the literal old atom, old-atom digest, surrounding-field digest, canonical replacement bytes, type-level before/after semantics and a non-weakening predicate for each of ten rows.

2.2.7 `requiredNegativeVectors`: punctuation/backtick mismatch; two occurrences of the same atom; locator to wrong field; stale field digest; replacement expanding outside selected bytes; surrounding-conjunct deletion; normalized Unicode mismatch.

2.2.8 `closureEvidenceRequired`: two independent byte-level supersession engines derive the same ten before/after fields, reject ambiguity and prove all non-replaced predecessor bytes remain mandatory.

2.2.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 2.3 `B0V4-HR-F003` — 27 mandatory original-source section locators do not resolve

2.3.1 `severity=P1`; `state=OPEN-BLOCKING`; `noMergeKey=B0V4-PRESERVED-B0V1-SOURCE-LOCATORS-UNRESOLVED`.

2.3.2 `predicateUnderTest`: every mandatory `sourceBasis` reference in every five-field row resolves by exact alias, root and member locator.

2.3.3 `affectedClaims`: Subject §§1.2.1, 1.3.3; preserved rows `B0V4REQ-014..040` and their nested lineages; exact-source closure generally.

2.3.4 `observedEvidence`: independent extraction found `373` alias/root/locator source references in the 84 v4 rows. `346` resolve against the frozen source index. The remaining `27` are precisely the preserved `B0V1@6785...bddb::§2.1` through `::§2.27` references. The index contains narrower locators such as `§2.1.1` and one-byte ID locators such as `B0REQ-000`, but not `§2.1` through `§2.27`.

2.3.5 `failureTrace`: a strict resolver blocks all 27 mandatory references; a permissive resolver invents a section-range rule absent from the frozen grammar. The two implementations can select different end boundaries, so exact physical identity is not portable.

2.3.6 `requiredDelta`: add exact canonical section locators and byte spans, or rewrite successor references to existing exact member locators whose ranges cover the intended original member. Do not infer ranges from heading levels.

2.3.7 `requiredNegativeVectors`: missing locator; ambiguous prefix; section with nested headings; neighboring-section bleed; same textual locator under wrong root; symlink/path substitution.

2.3.8 `closureEvidenceRequired`: two clean-workspace resolvers resolve `100%` of mandatory source references to identical bytes and reject every ambiguous or missing locator.

2.3.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 2.4 `B0V4-HR-F004` — NamedUse closure and the 17 cycle-break interfaces are schema-only

2.4.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V4-NAMEDUSE-SEMANTIC-UNIVERSE-AND-INTERFACE-INSTANCES-ABSENT`.

2.4.2 `predicateUnderTest`: every machine-semantic relation in all 84 five-field rows must appear once in a closed typed graph; every hidden forward construction use must be replaced by one independently rooted, fully instantiated prior interface available before its later provider.

2.4.3 `affectedClaims`: `B0V4REQ-003`, `015`, `051`, `080`; all dependency and semantic-use claims; v3 Finding `B0V3-HR-F004`; preserved `B0V3REQ-051` typed graph.

2.4.4 `observedEvidence`:

- The graph contains `3,135` uses and `unclassifiedTokenUses=[]`, but recognizes only seven broad classes: supersession, build dependency, vector, three predecessor-preservation families and Output.
- Runtime machine tokens including `GenesisPermit`, `L0TrustAnchorAdmission`, `AuthorityRevision`, `CommitReceipt`, `IndependenceProfile` and the `B0V4-IFACE-*` family are not typed target nodes/relations.
- All uses of `B0V3REQ-*` are classified as preservation/citation even when predecessor semantics express runtime construction or verification dependencies.
- All `17/17` hidden-cycle records include an `interfaceSchema` that lists seven field names. None supplies values for `consumerClass`, `providerClass`, `inputRoot`, `outputRoot` or `validationPredicate`; no separately rooted interface instance is present.

2.4.5 `failureTrace`: a consumer Requirement claims dependency only on `B0V4-IFACE-001`, but that interface has no input/output roots or validation predicate. To implement or validate it, the consumer must inspect the later provider Requirement, recreating the hidden forward construction edge. The declared build graph stays acyclic while the semantic graph retains the cycle.

2.4.6 `requiredDelta`: freeze a token grammar and closed typed edge enum covering every normative machine relation; classify each occurrence by semantics, not token family; instantiate and root all 17 prior interfaces with concrete field values and provider-independent validation predicates; derive build and semantic projections from the same canonical graph.

2.4.7 `requiredNegativeVectors`: unknown runtime token; preserved Requirement used as constructor; missing semantic edge; duplicate edge under two classes; interface with null root; interface whose predicate imports future provider; reverse hidden edge; class-invalid edge.

2.4.8 `closureEvidenceRequired`: two independent extractors produce byte-identical complete token/edge multisets, symmetric difference with normative prose is zero, all 17 interface instances validate before provider construction, and both build and Authority/Membership projections satisfy their declared cycle predicates.

2.4.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 2.5 `B0V4-HR-F005` — ten authoritative membership paths contain self-cycles

2.5.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V4-MUTABLE-HEAD-MEMBERSHIP-SELF-CYCLES`.

2.5.2 `predicateUnderTest`: all 94 mutable authority-bearing object classes must map through exactly one immutable, continuous and acyclic membership path into `SecurityUniverseHead`.

2.5.3 `affectedClaims`: `B0V4REQ-005`, `054`; Acceptance snapshot freshness; v3 Finding `B0V3-HR-F006`; preserved `B0V3REQ-051` and `054`.

2.5.4 `observedEvidence`: object/head cardinalities pass at `94/94` and `36/36`, but the following ten paths contain literal `X->X` edges: `AlgorithmRegistry`, `TrustedTimeDecision`, `CanonicalMandate`, `EffectClassifier`, `RequirementSet`, `OutputRegistry`, `AcceptancePointer`, `PublicDisclosurePolicy`, `WitnessPolicy`, `ExceptionRegistry`.

2.5.5 `failureTrace`: graph projection includes an edge from a node to itself. A self-edge is a directed cycle of length one, so any acyclicity validator must reject. A validator that discards self-edges applies an unstated normalization and can hide malformed membership.

2.5.6 `requiredDelta`: replace every self-edge with an exact object-instance-to-authoritative-head edge and then a head-to-`SecurityUniverseHead` edge; declare node classes and prohibit self, duplicate, discontinuous, multi-head and missing-terminal paths.

2.5.7 `requiredNegativeVectors`: self-edge; two-node cycle; discontinuous adjacent edge; wrong terminal; duplicate class mapping; second head; head change without SecurityUniverse revision advance.

2.5.8 `closureEvidenceRequired`: two independent graph engines derive the same 94 mappings/36 heads, validate path continuity and acyclicity, and reject one mutation per object/head/path condition.

2.5.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 2.6 `B0V4-HR-F006` — vector programs are rooted but scenario-vacuous and have no causal oracle

2.6.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V4-VECTOR-PROGRAMS-SCENARIO-VACUOUS-NO-CAUSAL-ORACLE`.

2.6.2 `predicateUnderTest`: each of 252 negative vectors must bind a real non-vacuous fixture, execute exact threat-relevant operations against a closed state machine and independently derive the exact expected terminal/reason without relying on absent future authority.

2.6.3 `affectedClaims`: `B0V4REQ-007`, all 84 `requiredProof` vector clauses, every v3 Finding remediation, lifecycle, Genesis, Permit, CAS, recovery, witnesses, Public, directives and convergence.

2.6.4 `observedEvidence`:

- All 252 fixture/program/precondition roots recompute, but `249/252` fixtures bind the one-byte `#` source member identified in F001.
- For every Requirement, A/B/C fixture payload bytes are identical before the program; only fixture metadata/root differs.
- Every A vector deletes `/fields/requiredProof`; every B replaces `/source/memberSha256`; every vector sets `/attack` to a descriptive object.
- Only `11/252` programs contain `EVENT`; `82/84` C programs contain only the descriptive `SET /attack`.
- Operation census is SET `252`, REMOVE `84`, REPLACE `84`, EVENT `11`; program lengths are one=`82`, two=`161`, three=`9`.
- Expected terminals/reasons are stored fields. No oracle program maps post-state to terminal/reason.
- `observed=null` and `evidenceRoot=null` for `252/252`; operational execution remains correctly `0/252`.

2.6.5 `failureTrace`: an A vector for any scenario blocks because a universally required proof field was removed, even if the named domain attack never occurred. A B vector blocks because source authentication was corrupted. A typical C vector changes only a description field. An evaluator can return the stored expected terminal without reducing a Permit, ledger, time, revision, role or recovery state. Therefore “pass” is vacuous and does not prove the named threat behavior.

2.6.6 `requiredDelta`: define rooted domain-state fixtures containing the exact preexisting authority data needed by each scenario; define typed operations that mutate those states; define a closed transition/reducer and executable assertion oracle; keep setup authority zero by using admitted planning schemas and explicitly impossible/pre-authority states rather than fabricated future receipts.

2.6.7 `requiredNegativeVectors`: each threat needs a positive-control trace and at least one single-fault mutation that would be accepted by a defective reducer: response-loss before/after commit; stale/replayed Permit; exact expiry boundary; revoke/commit same revision; pointer ABA; shared controller; split-view witnesses; Genesis self-admission; recovery below threshold/overlap; private projection oracle; convergence non-decrease.

2.6.8 `closureEvidenceRequired`: frozen fixture/operation/oracle roots, independent runner and evaluator profiles, mutation sensitivity showing the oracle fails when the control is removed, byte-equal results from independent implementations and detached receipts. Generic malformed-schema rejection receives zero scenario credit.

2.6.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`; `operationalExecutionCredit=0/252`.

## 2.7 `B0V4-HR-F007` — Permit/revision/fence/time/replay data is not closed by the 107 fields

2.7.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V4-PERMIT-REVISION-FENCE-TIME-REPLAY-FIELDS-NOT-CLOSED`.

2.7.2 `predicateUnderTest`: the closed Acceptance/Permit schema must literally bind all values required to decide one-use eligibility, expiry, revocation, stale-fence rejection and exact predecessor state.

2.7.3 `affectedClaims`: `B0V4REQ-008`, `010`, `050`, `052`, `053`, `054`, `058`, `065`, `071`, `073`, `079`; v3 Findings `B0V3-HR-F009` and `F011`; preserved v3 Requirements `050`, `052`, `053`, `054`, `057`, `065`.

2.7.4 `observedEvidence`:

- The Acceptance registry has `107/107` rows and does include `securityRevision`, Permit roots, `revocationHead`, `acceptancePointerExpectedVersion` and 36 head tuples.
- Neither those rows nor another frozen exact-rooted Permit record supplies literal `authorityEpoch`, deterministic `attemptId`, `fencingToken`, `expectedPermitHead`, `expectedRevocationHead`, `notBefore`, `validThrough` and one-use Permit state/equality relations.
- The Genesis `firstGenesisPermit` object supplies source/action labels, not a typed field schema for deterministic Permit/Attempt IDs, exact Act, actor Appointment, environment, input/output roots, expected ledger head, epoch, time bounds and consumption state.
- Opaque `genesisPermitRoot`/`operationalPermitRoot` values cannot prove which fields are inside the referenced object because no closed Permit schema is frozen.

2.7.5 `failureTrace`: two validators dereference the same opaque Permit root using different schemas. One enforces `validThrough` and a monotonic fence; the other treats the root as current if its ledger head matches. Both can satisfy the 107 top-level rows, but they disagree on expiry/revoke/replay. The Acceptance predicate is therefore not single-valued.

2.7.6 `requiredDelta`: freeze exact GenesisPermit, ConformancePermit and OperationalPermit field registries and bind their roots into Acceptance; include deterministic Permit/Attempt IDs, one Act, actor/controller Appointment, environment, input/output roots, expected relevant ledger/pointer/revocation heads, AuthorityRevision/epoch, fencing token, `notBefore`, `validThrough`, one-use state and invalidation/equality rules.

2.7.7 `requiredNegativeVectors`: missing/duplicate Attempt ID; stale fence; valid-through equality boundary; trusted time rollback; expected Permit/revocation head mismatch; second consume; cross-generation replay; Act substitution; environment/output-root substitution.

2.7.8 `closureEvidenceRequired`: exact field counts and roots for all three Permit types, forward/inverse schema traversal, one mutation per field, two independent expiry/revoke/replay reducers and causal vector receipts.

2.7.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 2.8 `B0V4-HR-F008` — two-witness and proof-class independence denominators are absent

2.8.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V4-TWO-WITNESS-AND-PROOF-CLASS-INDEPENDENCE-DENOMINATORS-ABSENT`.

2.8.2 `predicateUnderTest`: Acceptance must bind two independently controlled acknowledgements to the same evidence checkpoint and bind one exact independence profile for every required proof class before either duplicate result can count.

2.8.3 `affectedClaims`: `B0V4REQ-008`, `006`, `067`, `068`, `071`, `079`, `081`, `082`; role/readback/witness/validator claims; preserved v3 Requirements `067` and `068`.

2.8.4 `observedEvidence`:

- Acceptance fields `evidenceLedgerHead` and `witnessCheckpointRoot` are both produced by `Witness1`.
- There is no Witness2 acknowledgement/root field, no per-witness Appointment/controller binding and no literal equality predicate requiring both acknowledgements for the same checkpoint.
- The registry contains one `readbackIndependenceProofRoot` and one `securityHead_IndependenceProfiles` tuple, but no exact per-class records for `PARSER`, `SERIALIZER`, `GRAPH`, `SIGNATURE`, `TIME`, `ENVELOPE`, `STATE-REDUCER`, `VECTOR-RUNNER`, `READBACK`.
- No record binds each pair's two code roots, transitive dependencies, authors/controllers, runtime/context roots, presealed packet and comparison oracle.

2.8.5 `failureTrace`: Witness1 produces both ledger and checkpoint fields while Witness2 is offline or disagrees; the envelope remains field-complete. Separately, two invocations of one parser/runtime can be declared independent under one aggregate root. Acceptance can therefore count a split-view history or common-mode validator error as independently confirmed.

2.8.6 `requiredDelta`: add exactly two witness acknowledgement records with distinct controller/Appointments and same-checkpoint equality; add a closed nine-row IndependenceProfile registry with every required root and exclusion predicate; bind both registries and their exact instances into Acceptance.

2.8.7 `requiredNegativeVectors`: one witness; same controller; different checkpoint roots; stale acknowledgement; witness also ledger writer; same code/dependency/runtime/controller across a proof pair; missing class; result disclosure before both submissions.

2.8.8 `closureEvidenceRequired`: rooted two-witness and nine-class registries, exact cardinality proofs, controller/dependency transitive comparison, split-view/common-mode mutants and two independent validator results for every class.

2.8.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 2.9 `B0V4-HR-F009` — Acceptance CAS does not compare expected pointer, fence or Attempt

2.9.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V4-ACCEPTANCE-CAS-EXPECTED-POINTER-FENCE-ATTEMPT-COMPARES-ABSENT`.

2.9.2 `predicateUnderTest`: one serializable transaction must bind the caller's exact expected Current predecessor, AuthorityRevision/fence and one-use Attempt/Permit to snapshot/revocation validation, pointer transition, finalization and signed CommitReceipt.

2.9.3 `affectedClaims`: `B0V4REQ-010`, `050`, `052`, `053`, `054`, `058`, `065`, `079`; v3 Finding `B0V3-HR-F011`; expiry/revoke/replay/response-loss handling.

2.9.4 `observedEvidence`:

- `acceptancePointerExpectedVersion` exists in the field registry and the store advertises compare-expected-version and monotonic-fence capabilities.
- The frozen `acceptanceCas.orderedTransaction` compares SecurityUniverse, Permit and revocation heads, validates the envelope, then directly advances `ACCEPTANCE-POINTER-EXACTLY-ONE-VERSION`.
- No step reads and compares the expected pointer version/root supplied by the caller.
- No step compares/advances a target-enforced fencing token or reserves/consumes a deterministic one-use Attempt ID.
- Readbacks occur after commit and cannot retroactively restore the missing commit-time compare.

2.9.5 `failureTrace`: writers W1 and W2 read pointer version N and build distinct otherwise valid envelopes. W1 commits N→N+1. W2 then serializes after W1; because the transaction does not compare W2's expected N, it can advance N+1→N+2. Serializability is preserved, yet W2 commits against a predecessor it never observed. A replayed Attempt or stale target fence is not rejected by any listed transaction step.

2.9.6 `requiredDelta`: insert explicit compare operations for expected pointer version and root, AuthorityRevision/fencing token, exact Permit/Attempt one-use reservation and expected Permit/revocation heads; bind before/after values into the commit/finalization receipt; define response-loss recovery by receipt lookup without replaying effect.

2.9.7 `requiredNegativeVectors`: two stale writers; ABA pointer root with higher version; replayed Attempt after lost response; revocation at equal revision; stale fence at target; Permit consumed between validation and commit; receipt/outbox failure at every crash point.

2.9.8 `closureEvidenceRequired`: rooted transaction program and store topology; exhaustive interleaving/crash model; two independent reducers; authoritative receipt/readback traces showing at most one valid transition for each expected predecessor and zero stale-fence effects.

2.9.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 2.10 `B0V4-HR-F010` — Genesis foundation labels do not form a closed causal admission schema

2.10.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V4-GENESIS-FOUNDATION-LABELS-NOT-CLOSED-CAUSAL-SCHEMAS`.

2.10.2 `predicateUnderTest`: every prerequisite for first authority and first GenesisPermit must preexist B0 as an exact typed, rooted and externally admitted member; no B0 descendant may create, select or validate its own prerequisite.

2.10.3 `affectedClaims`: `B0V4REQ-002`, `004`, `049`, `050`, `064`, `077`, `078`; v3 Findings `B0V3-HR-F003` and `F005`; G1/G2, first Permit, L0 admission and Genesis authority.

2.10.4 `observedEvidence`:

- The list has `24/24` unique labels, but several compound multiple members/cardinalities: `AlgorithmRegistryHeadAndMembers`, `AuthorityStoreIdentityAndCapabilityReceipt`, `InitialSecurityUniverseHeadAndRevision`, `WitnessPolicyAndAppointments`, `TwoIndependentFoundationValidatorRoots`.
- The single `EACH-EXACTLY-ONE` rule does not define the nested denominator, typed field schema, identity/root domain, issuer, controller, freshness or invalidation of those compounds.
- `externalCeremony` names `EXTERNAL-L0-QUORUM`, two witnesses and `PREPROVISIONED-OUTSIDE-B0`, but supplies no exact anchor/admission bytes or root, quorum Appointment/member records, verifier input roots or validation predicate.
- `firstGenesisPermit` points to selected member labels and an action label; it is not a closed Permit record. Both current receipts are correctly null.

2.10.5 `failureTrace`: validator A interprets `TwoIndependentFoundationValidatorRoots` as two root strings under distinct controllers; validator B treats it as one aggregate root produced by one controller. Both satisfy “one compound member.” Likewise, the unnamed external verifier inputs can include the package's own admission rule, recreating self-admission. No frozen predicate distinguishes the invalid foundation.

2.10.6 `requiredDelta`: replace compound labels with exact member registries and schemas; freeze external anchor/admission input roots, quorum/controller Appointments, algorithms/keys/time/store capabilities, every initial head/version, witness acknowledgements, two validator independence profiles, ceremony transcript schema and first-Permit schema; define a typed acyclic Authority graph rooted only in preexisting L0 inputs.

2.10.7 `requiredNegativeVectors`: missing nested member; aggregate “two validators” under one controller; self-signed anchor; verifier selected by package; store capability omitted; initial head mismatch; witness/quorum overlap; first Permit creates Appointment/time/ledger prerequisite; substituted output manifest.

2.10.8 `closureEvidenceRequired`: exact foundation member/field denominator and content root; external admission transcript rooted in pre-B0 inputs; two independent validators derive the same acyclic authority graph; causal first-Permit model accepts one valid foundation and blocks every single-fault mutation.

2.10.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`; `currentFoundationReceipt=ABSENT`; `currentFirstGenesisPermitReceipt=ABSENT`.

## 2.11 `B0V4-HR-F011` — recovery members are labels and AuthorityOwner separation is omitted

2.11.1 `severity=P1`; `state=OPEN-BLOCKING`; `noMergeKey=B0V4-RECOVERY-MEMBER-SCHEMA-AND-AUTHORITYOWNER-SEPARATION-GAP`.

2.11.2 `predicateUnderTest`: the offline L0 recovery quorum must have a closed 3-of-5 member/Appointment schema, validity and one-use attempt semantics, and every custodian/witness controller must be distinct from every protected work-role controller, including AuthorityOwner.

2.11.3 `affectedClaims`: `B0V4REQ-006`, `011`, `063`, `076`, `077`; v3 Finding `B0V3-HR-F012`; cryptographic compromise recovery and eight-role separation.

2.11.4 `observedEvidence`:

- Recovery declares five slot strings, threshold `3`, two witness controllers, activation-challenge labels, ordering prose and null current receipt.
- It does not freeze five exact member/Appointment record roots with profile revision/epoch, controller root, key/status, activation, expiry, revocation and individual acknowledgement fields.
- `controllerRule` excludes Producer, QA, Reviewer1, Reviewer2, Reconciler, Approver and AcceptanceWriter, but does not exclude `AuthorityOwner`.
- The Subject's recovery proof claims work-role overlap zero; AuthorityOwner is one of the eight work roles.

2.11.5 `failureTrace`: the same EffectiveController acts as AuthorityOwner and controls recovery custodian 01. The 3-of-5 registry's literal exclusion rule still passes. That controller can combine current authority selection and one recovery share, narrowing the intended independence denominator and potentially selecting its own replacement profile.

2.11.6 `requiredDelta`: define rooted member/Appointment records, profile revision and validity, exact controller-equivalence checks, share/key status, one-use signed attempt acknowledgements and same-challenge equality; exclude all eight roles including AuthorityOwner and apply conflicts transitively to backups/delegations/sessions.

2.11.7 `requiredNegativeVectors`: AuthorityOwner/custodian overlap; witness/custodian overlap; duplicate controller under aliases; stale/expired member; below threshold; mixed challenge; replayed Attempt ID; two simultaneous active profiles; compromised member at equal revision.

2.11.8 `closureEvidenceRequired`: complete 5-member/two-witness registry roots, pairwise controller matrix including all work roles, threshold/replay/rotation state machine and independent results for each overlap and failure schedule.

2.11.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`; `recoveryQuorum.currentProfileReceipt=ABSENT`.

## 2.12 `B0V4-HR-F012` — packageContentRoot has no canonical derivation

2.12.1 `severity=P2`; `state=OPEN-NONBLOCKING`; `noMergeKey=B0V4-PACKAGE-CONTENT-ROOT-DERIVATION-UNSPECIFIED`.

2.12.2 `predicateUnderTest`: a claimed atomic package content root must be independently reproducible from a frozen canonical serialization, domain separator, ordered member data and hash algorithm.

2.12.3 `affectedClaims`: atomic package manifest `packageContentRoot`; portable all-or-nothing package verification. This Finding does not dispute the separately verified eight member hashes.

2.12.4 `observedEvidence`:

- All eight listed paths, byte counts and SHA-256 values match repository bytes.
- The manifest supplies `packageContentRoot=2b37ec92c5445848b4a9c3d202215f392681242382ac17fc2652fb198f553446`.
- None of the six frozen inputs declares the content-root hash algorithm, domain string, canonical member encoding, whether path/ordinal/bytes/required/authority fields participate, or a verification equation.
- Common plausible concatenations do not establish intent. This review therefore makes no claim that the value is wrong; only that it is not specification-reproducible.

2.12.5 `failureTrace`: two clean implementations serialize the same eight member rows differently—hash-only concatenation versus canonical path-plus-hash objects—and derive different roots. Neither can determine which one the frozen field means.

2.12.6 `requiredDelta`: define a versioned domain-separated canonical JSON/CBOR or length-prefixed byte formula, exact ordered participating fields and SHA-256 equation; include an independently recomputable test vector.

2.12.7 `requiredNegativeVectors`: member reorder; path normalization change; omitted member; changed byte count; duplicate ordinal; unknown field; alternate Unicode normalization; stale root after member change.

2.12.8 `closureEvidenceRequired`: two independent clean-workspace implementations derive the same root from the eight exact rows and reject each mutation. The manifest's own file SHA remains useful physical binding while this Finding is open.

2.12.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

# 3. Closure ledger and successor rule

## 3.1 Exact zero ledger

| Denominator | State |
|---|---:|
| New Findings | `12/12` preserved distinctly |
| Closed new Findings | `0/12` |
| Open P0 | `9/9` |
| Open P1 | `2/2` |
| Open P2 | `1/1` |
| Open P3 | `0/0` |
| Independently closed v3 Findings | `0/13` |
| Accepted v4 Requirements | `0/84` |
| Implemented v4 Outputs | `0/84` |
| Operationally executed vectors | `0/252` |
| Authority credit | `0` |
| Acceptance credit | `0` |

3.1.1 `verdict=REJECT`; `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.

## 3.2 Non-merge and future closure rules

3.2.1 The frozen v4 inputs must not be edited. Remediation requires a new immutable successor with new Subject, registry, index, crosswalk, vector-pack and atomic-manifest roots.

3.2.2 The successor must carry one literal disposition row for each `B0V4-HR-F001..012`. A single broad statement such as “provenance fixed,” “vectors executable,” “Genesis closed” or “CAS atomic” cannot merge identities or reduce the denominator.

3.2.3 Closure requires the `requiredDelta`, `requiredNegativeVectors` and `closureEvidenceRequired` of the same Finding. Mechanical presence, producer self-attestation, inherited QA, this review's existence, or another Finding's evidence transfers no closure.

3.2.4 P0/P1 Findings are immutable-successor blockers. P2 remains mandatory remediation but does not independently change the zero-authority state. No P3 Finding exists; that is an explicit zero, not an omitted severity class.
