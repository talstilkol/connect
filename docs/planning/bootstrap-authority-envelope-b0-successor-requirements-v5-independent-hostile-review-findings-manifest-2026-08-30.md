# 1. Connect — B0 v5 independent hostile-review Findings manifest

## 1.1 Manifest identity and claim limit

1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-V5-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30-G0`.

1.1.2 `artifactClass=DETACHED-NON-MERGED-INDEPENDENT-FINDINGS-MANIFEST;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE;NOT-CLOSURE-TRANSFER`.

1.1.3 Frozen Subject: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-2026-08-30.md`, SHA-256 `bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92`.

1.1.4 Frozen atomic manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-atomic-package-manifest-2026-08-30.json`, SHA-256 `5a054f5d4a482a0e74a9146dd3aeee865a5f28ee245d76784dbaa03ed3a118c4`; declared package content root `666e121d998445e3134f3a1978ee9b7c5962324bd51376e2ebc5bf2646d689f8`.

1.1.5 Companion review: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-independent-hostile-review-2026-08-30.md`.

1.1.6 New-Finding denominator: `20`; `P0=18`, `P1=2`, `P2=0`, `P3=0`; `OPEN-BLOCKING=20`, `CLOSED=0/20`.

1.1.7 Inherited-Finding denominator: `12`; identities retained `12/12`; `OPEN-BLOCKING=11`, `CLOSED-INDEPENDENT-MECHANICAL=1/12`. Closure of `B0V4-HR-F012` is isolated to its own root-derivation predicate and grants no authority or Acceptance.

1.1.8 Every Finding is atomic and non-merged. Evidence, remediation or closure for one ID and `noMergeKey` cannot satisfy another.

1.1.9 Severity semantics:

| Severity | Meaning |
|---|---|
| P0 | A defect can make authority, Acceptance, preservation or closure non-single-valued, non-causal or falsely satisfiable. |
| P1 | A mandatory integrity, provenance or role-proof defect blocks successor acceptance but is not itself an immediate authority grant. |
| P2 | A mandatory portability/verification defect that does not independently grant authority. |
| P3 | Advisory only; none found. |

# 2. Exact inherited-Finding ledger

## 2.1 Twelve identities, no merge

| Finding | Severity | `noMergeKey` | v5 target | Independent disposition |
|---|---|---|---|---|
| `B0V4-HR-F001` | P0 | `B0V4-SOURCE-MEMBER-SPAN-IDENTITY-COLLAPSE` | `B0V5REQ-000`; `B0V5OUT-000`; `B0V5-FIX-001` | `OPEN-BLOCKING;MECHANICAL-DELTA-PASS;FULL-CLOSURE-TEST-NOT-MET` |
| `B0V4-HR-F002` | P0 | `B0V4-TYPED-SUPERSESSION-NONLITERAL-UNRESOLVED` | `B0V5REQ-001`; `B0V5OUT-001`; `B0V5-FIX-002` | `OPEN-BLOCKING;B0V5-IHR-F002+B0V5-IHR-F003` |
| `B0V4-HR-F003` | P1 | `B0V4-PRESERVED-B0V1-SOURCE-LOCATORS-UNRESOLVED` | `B0V5REQ-002`; `B0V5OUT-002`; `B0V5-FIX-003` | `OPEN-BLOCKING;LOCATOR-DELTA-PASS;B0V5-IHR-F001` |
| `B0V4-HR-F004` | P0 | `B0V4-NAMEDUSE-SEMANTIC-UNIVERSE-AND-INTERFACE-INSTANCES-ABSENT` | `B0V5REQ-003`; `B0V5OUT-003`; `B0V5-FIX-004` | `OPEN-BLOCKING;B0V5-IHR-F004+B0V5-IHR-F005` |
| `B0V4-HR-F005` | P0 | `B0V4-MUTABLE-HEAD-MEMBERSHIP-SELF-CYCLES` | `B0V5REQ-004`; `B0V5OUT-004`; `B0V5-FIX-005` | `OPEN-BLOCKING;MECHANICAL-GRAPH-DELTA-PASS;FULL-CLOSURE-TEST-NOT-MET` |
| `B0V4-HR-F006` | P0 | `B0V4-VECTOR-PROGRAMS-SCENARIO-VACUOUS-NO-CAUSAL-ORACLE` | `B0V5REQ-005`; `B0V5OUT-005`; `B0V5-FIX-006` | `OPEN-BLOCKING;B0V5-IHR-F006..010` |
| `B0V4-HR-F007` | P0 | `B0V4-PERMIT-REVISION-FENCE-TIME-REPLAY-FIELDS-NOT-CLOSED` | `B0V5REQ-006`; `B0V5OUT-006`; `B0V5-FIX-007` | `OPEN-BLOCKING;B0V5-IHR-F011+B0V5-IHR-F015` |
| `B0V4-HR-F008` | P0 | `B0V4-TWO-WITNESS-AND-PROOF-CLASS-INDEPENDENCE-DENOMINATORS-ABSENT` | `B0V5REQ-007`; `B0V5OUT-007`; `B0V5-FIX-008` | `OPEN-BLOCKING;B0V5-IHR-F013+B0V5-IHR-F014` |
| `B0V4-HR-F009` | P0 | `B0V4-ACCEPTANCE-CAS-EXPECTED-POINTER-FENCE-ATTEMPT-COMPARES-ABSENT` | `B0V5REQ-008`; `B0V5OUT-008`; `B0V5-FIX-009` | `OPEN-BLOCKING;B0V5-IHR-F016` |
| `B0V4-HR-F010` | P0 | `B0V4-GENESIS-FOUNDATION-LABELS-NOT-CLOSED-CAUSAL-SCHEMAS` | `B0V5REQ-009`; `B0V5OUT-009`; `B0V5-FIX-010` | `OPEN-BLOCKING;B0V5-IHR-F017+B0V5-IHR-F018+B0V5-IHR-F019` |
| `B0V4-HR-F011` | P1 | `B0V4-RECOVERY-MEMBER-SCHEMA-AND-AUTHORITYOWNER-SEPARATION-GAP` | `B0V5REQ-010`; `B0V5OUT-010`; `B0V5-FIX-011` | `OPEN-BLOCKING;AUTHORITYOWNER-DELTA-PASS;B0V5-IHR-F020` |
| `B0V4-HR-F012` | P2 | `B0V4-PACKAGE-CONTENT-ROOT-DERIVATION-UNSPECIFIED` | `B0V5REQ-011`; `B0V5OUT-011`; `B0V5-FIX-012` | `CLOSED-INDEPENDENT-MECHANICAL;AUTHORITY-CREDIT-0;ACCEPTANCE-CREDIT-0` |

2.1.1 All 12 source spans, byte lengths and SHA-256 values match the frozen v4 Findings manifest. The 12 IDs, `noMergeKey` values, target Requirements, target Outputs and replacement IDs are each unique.

2.1.2 `B0V4-HR-F012` alone meets its exact closure test: two independent standard-library implementations derive the declared root and reject reorder, path, omission, byte-count, duplicate-ordinal, member-hash and domain mutations.

# 3. New independent Findings index

## 3.1 Exact denominator and counters

| Finding | Severity | State | `noMergeKey` |
|---|---|---|---|
| `B0V5-IHR-F001` | P0 | OPEN-BLOCKING | `B0V5-PUBLIC-GIT-ROOT-LOGICAL-PATH-NAMESPACE-MISMATCH` |
| `B0V5-IHR-F002` | P0 | OPEN-BLOCKING | `B0V5-SUPERSESSION-SELECTOR-OVERLAP-WITHOUT-COMPOSITION-ORDER` |
| `B0V5-IHR-F003` | P0 | OPEN-BLOCKING | `B0V5-SUPERSESSION-NONWEAKENING-RELATION-NOT-EXECUTABLE` |
| `B0V5-IHR-F004` | P0 | OPEN-BLOCKING | `B0V5-ACTIVE-INHERITED-SEMANTIC-BYTES-OUTSIDE-NAMEDUSE-GRAPH` |
| `B0V5-IHR-F005` | P0 | OPEN-BLOCKING | `B0V5-PRIOR-INTERFACE-ROOTS-BIND-PROMISES-NOT-PROVIDER-INSTANCES` |
| `B0V5-IHR-F006` | P0 | OPEN-BLOCKING | `B0V5-VECTOR-CORPUS-OMITS-PORTABLE-ROOTED-ORACLE-SEMANTICS` |
| `B0V5-IHR-F007` | P0 | OPEN-BLOCKING | `B0V5-VECTOR-DENOMINATOR-DOES-NOT-COVER-CLAIMED-DOMAINS` |
| `B0V5-IHR-F008` | P1 | OPEN-BLOCKING | `B0V5-VECTOR-PLACEHOLDERS-MISCLASSIFIED-AS-NONMOCK-REAL-STATE` |
| `B0V5-IHR-F009` | P0 | OPEN-BLOCKING | `B0V5-VECTOR-CAUSAL-SPEC-ORACLE-READS-ASSERTED-VERDICTS` |
| `B0V5-IHR-F010` | P0 | OPEN-BLOCKING | `B0V5-PACKAGE-ROOT-CLOSURE-VECTOR-TARGETS-V4-NOT-V5` |
| `B0V5-IHR-F011` | P0 | OPEN-BLOCKING | `B0V5-ACCEPTANCE-INVALIDATION-RULES-REFERENCE-V4-HEADS` |
| `B0V5-IHR-F012` | P0 | OPEN-BLOCKING | `B0V5-ACCEPTANCE-OUTPUT-ROOT-DENOMINATOR-STOPS-AT-84` |
| `B0V5-IHR-F013` | P0 | OPEN-BLOCKING | `B0V5-ACCEPTANCE-PRODUCER-CLASSES-OUTSIDE-CLOSED-ROLE-UNIVERSE` |
| `B0V5-IHR-F014` | P0 | OPEN-BLOCKING | `B0V5-WITNESS-AND-INDEPENDENCE-INSTANCES-NOT-CLOSED` |
| `B0V5-IHR-F015` | P0 | OPEN-BLOCKING | `B0V5-PERMIT-SCHEMAS-ARE-UNTYPED-FIELD-NAME-LISTS` |
| `B0V5-IHR-F016` | P0 | OPEN-BLOCKING | `B0V5-ACCEPTANCE-CAS-IS-UNROOTED-STRING-OP-SEQUENCE` |
| `B0V5-IHR-F017` | P0 | OPEN-BLOCKING | `B0V5-GENESIS-CLASS-SLOTS-SHARE-ONE-GENERIC-SCHEMA` |
| `B0V5-IHR-F018` | P0 | OPEN-BLOCKING | `B0V5-GENESIS-EXTERNAL-ADMISSION-AND-FIRST-PERMIT-LACK-CAUSAL-PROGRAM` |
| `B0V5-IHR-F019` | P0 | OPEN-BLOCKING | `B0V5-DETACHED-ACCEPTANCE-ARTIFACT-SCHEMA-ABSENT` |
| `B0V5-IHR-F020` | P1 | OPEN-BLOCKING | `B0V5-RECOVERY-MEMBER-WITNESS-ATTEMPT-SCHEMAS-NOT-EXECUTABLE` |

# 4. Individual non-merged Findings

## 4.1 `B0V5-IHR-F001` — stored paths do not resolve from the public Git root

4.1.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-PUBLIC-GIT-ROOT-LOGICAL-PATH-NAMESPACE-MISMATCH`.

4.1.2 `predicateUnderTest`: every manifest and source-index `logicalPath` must resolve exactly, without rewriting, from the top level of the public repository whose bytes are being authenticated.

4.1.3 `evidence`: the actual Git top level contains `docs/` directly. Strict resolution succeeds for `0/8` manifest paths and `0/22` source-index artifact paths. Every stored path has one extra leading `web/` segment; removing it makes `8/8` and `22/22` resolve and match hashes. The packaged `LOCATOR-RESOLUTION` oracle explicitly requires the wrong prefix.

4.1.4 `impact`: a clean verifier cannot open any authenticated member, so exact source, portable vectors and atomic package verification fail before semantics are evaluated. A verifier that strips the prefix applies an unfrozen transformation.

4.1.5 `remediation`: issue a new immutable package with paths relative to the actual Git top level; recompute every affected artifact/member/root/reference and prohibit repository-layout prefix inference.

4.1.6 `closureTest`: in two clean public clones, resolve all manifest and index paths byte-for-byte without transformation; recompute every artifact/member hash; reject extra-prefix, missing-prefix, traversal, absolute-path, symlink and wrong-root mutations.

4.1.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.2 `B0V5-IHR-F002` — supersession selectors overlap without an application order

4.2.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-SUPERSESSION-SELECTOR-OVERLAP-WITHOUT-COMPOSITION-ORDER`.

4.2.2 `predicateUnderTest`: every active predecessor field must reduce to one canonical successor value independent of reducer traversal order.

4.2.3 `evidence`: the 128 exact inherited selectors contain 10 overlap pairs. They occur in `B0V4REQ-000.requiredProof`, `003.requiredProof`, `004.requiredProof`, `005.requiredProof`, `008.statement`, `008.requiredProof` (three pairs), `010.requiredProof` and `011.requiredProof`. Two `B0V4REQ-008` pairs select identical whole fields; the others nest a vector-tail selector inside a whole-field selector. No precedence, composition or confluence rule exists.

4.2.4 `impact`: applying inner-first, outer-first or rejecting overlap produces different active bytes and replacement sets. Preservation and non-merge become multi-valued.

4.2.5 `remediation`: make selectors disjoint, or freeze an exact typed composition order and conflict rule that produces one canonical result while retaining every unaffected conjunct.

4.2.6 `closureTest`: two independent byte reducers must derive identical before/after fields for all 128 selectors under forward, reverse and every deterministically enumerated applicable order; every overlap ambiguity, duplicate selector and partial containment mutation must block.

4.2.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.3 `B0V5-IHR-F003` — replacement safety and non-weakening are prose assertions

4.3.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-SUPERSESSION-NONWEAKENING-RELATION-NOT-EXECUTABLE`.

4.3.2 `predicateUnderTest`: each exact old atom and replacement must have a decidable typed before/after relation proving retained mandatory safety properties and non-weakening.

4.3.3 `evidence`: all `10/10` supersession objects have exact bytes and a valid replacement root, but their schema has no before-state, after-state, transition program, invariant predicate, proof root or non-weakening decision. `replacementNorm`, `retainedSafetyIntent` and `surroundingMemberBytesRemainMandatory=true` are text/boolean claims.

4.3.4 `impact`: two reducers can agree on literal bytes yet disagree on lifecycle, Permit, witness or recovery semantics while both accept the same stored assertion.

4.3.5 `remediation`: add a versioned typed semantic domain, canonical before/after state, executable replacement reducer, retained-invariant set and non-weakening oracle per supersession.

4.3.6 `closureTest`: independent reducers must agree for all ten rows and reject deletion, weakening, widened replacement span, altered invariant, ambiguous occurrence and surrounding-conjunct loss.

4.3.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.4 `B0V5-IHR-F004` — active inherited semantics are outside the NamedUse graph

4.4.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-ACTIVE-INHERITED-SEMANTIC-BYTES-OUTSIDE-NAMEDUSE-GRAPH`.

4.4.2 `predicateUnderTest`: every active machine-semantic relation in the full normative value set, including exact inherited bytes, appears exactly once in the closed typed semantic graph.

4.4.3 `evidence`: the graph has 3,471 marker-derived uses and no unclassified explicit marker, but inherited exact values are represented only by one `PRESERVES-V4-REQUIREMENT` wrapper edge. Active inherited bytes contain exact untargeted tokens including `GenesisPermit` 5 times, `AuthorityRevision` 7, `CommitReceipt` 1, `AcceptancePointer` 1, `IndependenceProfile` 2, `L0TrustAnchorAdmission` 1 and `TrustedTimeDecision` 1.

4.4.4 `impact`: runtime construction, verification and Authority edges can remain hidden while the marker graph and build DAG appear closed and acyclic.

4.4.5 `remediation`: define a grammar for all active inherited atoms, classify semantic occurrences rather than wrappers, and derive build, Authority, Membership and verification projections from one canonical graph.

4.4.6 `closureTest`: two independent extractors over wrapper plus active inherited bytes must produce byte-identical edge multisets; symmetric difference with normative machine tokens must be zero; unknown, duplicate, hidden-construction and cycle mutations must block.

4.4.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.5 `B0V5-IHR-F005` — prior-interface roots bind promises, not provider instances

4.5.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-PRIOR-INTERFACE-ROOTS-BIND-PROMISES-NOT-PROVIDER-INSTANCES`.

4.5.2 `predicateUnderTest`: every cycle-breaking prior interface must be usable and independently decidable before its later provider is constructed.

4.5.3 `evidence`: all 17 interface records use one identical five-label check set. Each carries roots over input/output schema promises, but none has an actual/current provider output, validation-receipt value or transition semantics. `NO-PROVIDER-CONSTRUCTION-REQUIRED-BY-CONSUMER` is a stored label, not an executable dependency check.

4.5.4 `impact`: the consumer must trust a promised root or inspect the later provider to decide validity, recreating the hidden forward edge the interface claims to break.

4.5.5 `remediation`: freeze typed input/output instance records, actual producer-independent validation semantics, receipt roots, freshness/invalidation rules and the exact pre-provider availability proof.

4.5.6 `closureTest`: instantiate all 17 interfaces before providers exist; two independent validators must accept valid instances and reject null, stale, wrong-provider, future-dependent, input-substitution and output-substitution mutations.

4.5.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.6 `B0V5-IHR-F006` — vector oracle semantics are not portable or root-bound

4.6.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-VECTOR-CORPUS-OMITS-PORTABLE-ROOTED-ORACLE-SEMANTICS`.

4.6.2 `predicateUnderTest`: a clean runner must derive each decision from the corpus alone using versioned, rooted, executable operation and oracle semantics.

4.6.3 `evidence`: each `program.oracle` stores only a kind name and two booleans. The corpus supplies no oracle body/equation and no root from oracle kind to implementation. `programRoot` hashes only operations and those metadata fields. Oracle bodies are discoverable only in generator source and are not a portable corpus DSL.

4.6.4 `impact`: independent runners can assign different meanings to the same oracle kind and still verify every stored vector root; stored expected values can become the de facto oracle.

4.6.5 `remediation`: embed a versioned closed oracle AST/bytecode or separately rooted executable module mapping, including canonical state types, errors and total evaluation semantics.

4.6.6 `closureTest`: two independently implemented clean runners must execute only frozen corpus semantics, derive identical decisions/reasons and reject altered oracle code, unknown kind, missing mapping, non-total evaluation and expected-value-reading mutations.

4.6.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`; `operationalExecutionCredit=0/288`.

## 4.7 `B0V5-IHR-F007` — vector coverage does not match the normative denominator

4.7.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-VECTOR-DENOMINATOR-DOES-NOT-COVER-CLAIMED-DOMAINS`.

4.7.2 `predicateUnderTest`: vector cardinality must cover every mandatory field, replacement row, interface, head rule, Permit/CAS/Genesis/recovery state and threat schedule claimed by closure.

4.7.3 `evidence`: the 252 inherited vectors cover exactly 84 `statement`, 84 `requiredProof` and 84 `sourceBasis` fields; coverage for `threatCauseImpact` and `dependencies` is zero. The first 12 Finding classes receive only three mutations each. Supersession tests use only the first of ten rows; interface tests use only the first of 17; several graph and transaction predicates have no crash/interleaving matrix.

4.7.4 `impact`: a defective untested field, supersession, interface or schedule can pass the vector count and be falsely treated as closed.

4.7.5 `remediation`: freeze an exact claim-to-vector coverage matrix and add a positive control plus mutation-sensitive negative cases for every denominator member and every required schedule.

4.7.6 `closureTest`: independently derive the coverage matrix from normative predicates; require zero uncovered claims and zero duplicate-credit vectors; delete or corrupt each denominator member and prove at least one uniquely attributable vector fails.

4.7.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.8 `B0V5-IHR-F008` — placeholders are marked as real, non-mock domain state

4.8.1 `severity=P1`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-VECTOR-PLACEHOLDERS-MISCLASSIFIED-AS-NONMOCK-REAL-STATE`.

4.8.2 `predicateUnderTest`: a fixture claiming real frozen or exact schema-derived state must resolve every authority-relevant identity/root/time value to frozen evidence and accurately declare synthetic content.

4.8.3 `evidence`: fixtures use unresolved literals for pointer, Permit, revocation, witness, implementation-controller and recovery-controller values and invented numeric times `90/100/110`. All `288/288` fixtures nevertheless set `mockData=false`, `sampleData=false` and `syntheticBusinessData=false`.

4.8.4 `impact`: placeholder equality can satisfy shallow oracles while proving nothing about real roots, controller equivalence, trusted time or current heads; provenance flags mislead downstream evidence selection.

4.8.5 `remediation`: either bind every value to exact frozen zero-authority evidence or classify deterministic planning placeholders honestly and forbid them from operational/closure credit.

4.8.6 `closureTest`: every authority-relevant fixture leaf must resolve through an authenticated source locator or explicit non-operational placeholder type; unresolved strings, invented time, false provenance flags and placeholder-to-operational promotion must block.

4.8.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.9 `B0V5-IHR-F009` — the causal meta-oracle trusts asserted verdicts

4.9.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-VECTOR-CAUSAL-SPEC-ORACLE-READS-ASSERTED-VERDICTS`.

4.9.2 `predicateUnderTest`: the vector-framework closure test must derive control and mutation decisions from actual state transitions and oracle reads, never from verdict fields inside its own fixture.

4.9.3 `evidence`: the generator's `VECTOR-CAUSAL-SPEC` evaluator explicitly requires fixture fields `controlDecision === ELIGIBLE` and `mutationDecision === BLOCKED`. Its mutations change metadata such as operation-path labels, oracle-kind labels or encoded fixture bytes; no domain reducer derives those verdicts.

4.9.4 `impact`: a self-declared passing framework can certify every other stored expected result while remaining non-causal.

4.9.5 `remediation`: remove verdict inputs from domain state and define an external meta-evaluator that runs control and mutation programs, traces oracle reads and derives both decisions.

4.9.6 `closureTest`: flip or remove stored verdict labels without changing domain behavior and require no effect; then disable one real oracle read or transition and require the meta-test to fail.

4.9.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.10 `B0V5-IHR-F010` — package-root closure vectors test the v4 package

4.10.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-PACKAGE-ROOT-CLOSURE-VECTOR-TARGETS-V4-NOT-V5`.

4.10.2 `predicateUnderTest`: vectors claiming to close the v5 package-root requirement must use the exact eight-member v5 manifest projection and declared v5 root.

4.10.3 `evidence`: the package-root vector blueprint constructs `members` from the v4 atomic manifest and computes a v5-domain root over those v4 rows. It never loads the frozen v5 eight-member manifest under review.

4.10.4 `impact`: all three stored package-root vectors can pass while a v5 member, ordinal, path or byte count is wrong. They provide zero closure evidence for the claimed Subject package.

4.10.5 `remediation`: bind the fixture to the exact v5 manifest SHA and preimage bytes and mutate every participating v5 field and member.

4.10.6 `closureTest`: prove fixture membership equals the eight exact v5 rows, derive the declared root, and reject reorder, omission, duplication, path, byte, required flag, hash, domain and canonicalization mutations.

4.10.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`. Independent review closure of inherited `B0V4-HR-F012` is separate and is not borrowed from these vectors.

## 4.11 `B0V5-IHR-F011` — 107 Acceptance invalidation rules name v4 heads

4.11.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-ACCEPTANCE-INVALIDATION-RULES-REFERENCE-V4-HEADS`.

4.11.2 `predicateUnderTest`: every Acceptance field sourced from a current v5 head must be invalidated by advancement of that exact source head.

4.11.3 `evidence`: `107/156` Acceptance rows combine `sourceHead=B0V5-HEAD-*` with a literal invalidation value `ANY-B0V4-HEAD-*-ADVANCE-INVALIDATES`. Example: `B0V5-AF-001` is sourced from head 35 but names the v4 head 35 in invalidation.

4.11.4 `impact`: a literal evaluator does not invalidate on a v5 head advance; a normalizing evaluator silently rewrites immutable semantics. The freshness decision is non-single-valued.

4.11.5 `remediation`: bind invalidation to typed v5 head IDs, exact before/after tuples and one executable freshness predicate; recompute the registry root.

4.11.6 `closureTest`: advance each of 36 v5 heads independently and prove every dependent field invalidates; v4-name, wrong-head, stale-root and same-version/different-root mutations must block.

4.11.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.12 `B0V5-IHR-F012` — Acceptance binds 84 Outputs, not all 96

4.12.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-ACCEPTANCE-OUTPUT-ROOT-DENOMINATOR-STOPS-AT-84`.

4.12.2 `predicateUnderTest`: Acceptance must bind the exact complete v5 Output denominator, including all 12 remediation Outputs and all 84 preserved Outputs.

4.12.3 `evidence`: the 156-field registry contains `all84OutputsRoot` and no `all96OutputsRoot`. The output registry itself contains 96 rows, including `B0V5OUT-000..011` for the 12 inherited-Finding remediations.

4.12.4 `impact`: an envelope can be field-complete while omitting every remediation Output whose implementation is necessary to close the inherited blockers.

4.12.5 `remediation`: replace the stale denominator with a canonical root over all 96 ordered Output IDs, implementation roots, evidence roots, states and acceptance predicates.

4.12.6 `closureTest`: independently derive the 96-row root; omit, duplicate, reorder or null each remediation Output and require Acceptance to block.

4.12.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.13 `B0V5-IHR-F013` — four Acceptance producer classes are outside the role universe

4.13.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-ACCEPTANCE-PRODUCER-CLASSES-OUTSIDE-CLOSED-ROLE-UNIVERSE`.

4.13.2 `predicateUnderTest`: every sole producer named by an Acceptance field must be a typed role with Appointment, EffectiveController and pairwise-conflict semantics in the closed role universe.

4.13.3 `evidence`: Acceptance producers include `Witness1`, `Witness2`, `WitnessQuorum` and `EvidenceLedgerWriter`; none is among the eight roles or 28 pair-matrix rows. Mechanical one-string-per-field cardinality does not type or separate these producers.

4.13.4 `impact`: one controller can occupy an undefined producer class and a work role without violating the frozen matrix, defeating sole-producer and independence claims.

4.13.5 `remediation`: add every producer class to one closed role/Appointment universe, define exact producer-to-field cardinality and complete all pairwise controller exclusions including aliases, backups, delegations and sessions.

4.13.6 `closureTest`: derive the complete producer set from all Acceptance fields and require set equality with the role universe; test every cross-role shared-controller pair and duplicate/missing producer assignment.

4.13.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.14 `B0V5-IHR-F014` — witness and proof-class independence has no admitted instances

4.14.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-WITNESS-AND-INDEPENDENCE-INSTANCES-NOT-CLOSED`.

4.14.2 `predicateUnderTest`: Acceptance must bind two controller-independent witnesses to one checkpoint and one current transitive-independence instance for each of nine proof classes.

4.14.3 `evidence`: the two-witness rule checks witness-to-witness distinctness and checkpoint equality but does not itself exclude ledger-writer/work-role overlap. All nine IndependenceProfile rows are 14-name schemas with `currentInstanceRoot=null`; no transitive dependency graph or actual paired result exists.

4.14.4 `impact`: shared-control witnesses or two executions of one common implementation/runtime can satisfy field presence and aggregate-root checks.

4.14.5 `remediation`: freeze admitted witness Appointments/acknowledgements, complete controller exclusions, and bind nine current profile instances containing two code, dependency, runtime, author-controller and context roots plus presealed packet and comparison oracle.

4.14.6 `closureTest`: reject one witness, different checkpoints, witness/ledger overlap, witness/work-role overlap, shared transitive dependency, shared runtime/controller/context, missing class, stale profile and result disclosure before both submissions.

4.14.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.15 `B0V5-IHR-F015` — Permit schemas are untyped name lists

4.15.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-PERMIT-SCHEMAS-ARE-UNTYPED-FIELD-NAME-LISTS`.

4.15.2 `predicateUnderTest`: GenesisPermit, ConformancePermit and OperationalPermit must have exact field types, cardinalities, canonical encodings, equality/freshness/invalidation rules and one-use transition semantics.

4.15.3 `evidence`: the three schemas list 20, 23 and 20 strings respectively and one aggregate schema root. No per-field record defines type, cardinality, relation, invalidation or decode policy. All current Permit instance roots are null.

4.15.4 `impact`: validators can disagree on ID construction, Act equality, time boundaries, fence comparison, head equality, issuer/signature meaning and one-use state while verifying the same schema root.

4.15.5 `remediation`: create closed typed per-field registries and executable Permit issue/validate/reserve/consume/revoke/replay reducers, with exact head/time/fence relations.

4.15.6 `closureTest`: forward/inverse schema traversal and one mutation per field/rule across all three Permit types; two reducers must agree at expiry equality, revocation equality, stale fence, head mismatch, second consume, Act/environment/root substitution and cross-generation replay.

4.15.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.16 `B0V5-IHR-F016` — Acceptance CAS is an unrooted string operation sequence

4.16.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-ACCEPTANCE-CAS-IS-UNROOTED-STRING-OP-SEQUENCE`.

4.16.2 `predicateUnderTest`: one canonical rooted transaction program must define state, compares, writes, failures, receipt/outbox behavior and the sole linearization point for every schedule.

4.16.3 `evidence`: `orderedTransaction` is 15 objects whose executable content is a natural-language `op` label. There is no transaction-program root, typed store state, pre/postcondition function, error map, crash-point set or interleaving semantics. The CAS vector omits all 36 head tuples and most receipt/outbox transitions.

4.16.4 `impact`: stores can implement different atomic boundaries, fence rules, revoke order and response-loss recovery while claiming the same 15 labels; stale or replayed writers may commit.

4.16.5 `remediation`: freeze an executable state machine and rooted transaction bytecode/AST over co-resident keys, including exact CAS comparisons, Attempt reservation, fence advance, Permit consume, finalization, signed receipt and transactional outbox.

4.16.6 `closureTest`: exhaustive two-writer interleavings and crash injection before/after every operation; reject stale pointer/root, ABA, stale fence, equal-revision revoke, consumed Permit and repeated Attempt; prove one durable effect and authoritative response-loss readback.

4.16.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.17 `B0V5-IHR-F017` — all Genesis classes share one generic slot schema

4.17.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-GENESIS-CLASS-SLOTS-SHARE-ONE-GENERIC-SCHEMA`.

4.17.2 `predicateUnderTest`: each of 33 heterogeneous Genesis prerequisites must have class-specific typed fields and validation semantics sufficient to decide its content and cardinality.

4.17.3 `evidence`: all `33/33` slots use the same nine required names: member/schema/content/issuer/controller, epoch, two time bounds and invalidation. The schema does not expose class-specific members for algorithms, keys, store capabilities, heads, witness acknowledgements, validators or time-source policy. All instance roots are null.

4.17.4 `impact`: a generic root can stand in for the wrong prerequisite class or omit nested denominators while the slot count and schema root still validate.

4.17.5 `remediation`: define one typed schema per class, including nested denominators, exact algorithms/keys/capabilities/head tuples/witness and validator evidence, plus class-validity and substitution rules.

4.17.6 `closureTest`: construct one valid typed instance per slot and reject wrong-class substitution, omitted nested member, aggregate-two-as-one, invalid key/time/store capability and stale/revoked input for every class.

4.17.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.18 `B0V5-IHR-F018` — external admission and first Permit lack a causal program

4.18.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-GENESIS-EXTERNAL-ADMISSION-AND-FIRST-PERMIT-LACK-CAUSAL-PROGRAM`.

4.18.2 `predicateUnderTest`: an executable acyclic Authority graph and transition program must prove every first-authority prerequisite is externally admitted before B0 and that one first Permit creates none of its own prerequisites.

4.18.3 `evidence`: the external ceremony is a 13-name list with prose issuer/witness/validator rules; the first-Permit rule is one semicolon-delimited string. No typed Authority edges, verifier program, prerequisite partial order, canonical transition root or negative causal schedule exists. Current foundation and first-Permit receipt roots are null.

4.18.4 `impact`: a package-selected verifier, self-issued anchor or B0-created prerequisite can satisfy label presence, recreating self-admission and circular bootstrap.

4.18.5 `remediation`: freeze exact pre-B0 inputs, admitted instances, controller quorum, validator profiles, causal Authority DAG and executable first-Permit transition rooted only in external L0 state.

4.18.6 `closureTest`: two independent evaluators derive the same acyclic graph and first transition; reject self-issued anchor, package-selected verifier, missing external member, shared validator/controller, first-Permit-created prerequisite, altered empty ledger/head and substituted output manifest.

4.18.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`; `currentFoundationReceipt=ABSENT`; `currentFirstGenesisPermitReceipt=ABSENT`.

## 4.19 `B0V5-IHR-F019` — detached Acceptance artifact has no schema

4.19.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-DETACHED-ACCEPTANCE-ARTIFACT-SCHEMA-ABSENT`.

4.19.2 `predicateUnderTest`: every allowed Genesis Act and active inherited artifact class must resolve to one exact typed output schema, deterministic identity, producer, validation predicate, lifecycle and receipt binding.

4.19.3 `evidence`: `CREATE-DETACHED-ACCEPTANCE-ARTIFACT` is in the GenesisPermit `allowedActs`, and active inherited bytes require detached acceptance artifacts. The normative registry contains no detached Acceptance artifact record or schema; within that registry, the only occurrence is the Act label.

4.19.4 `impact`: a first Permit can name an output class whose bytes, authority limit, detachment, validation and relationship to canonical Acceptance are undefined.

4.19.5 `remediation`: add a closed detached-artifact schema with deterministic ID/root, exact fields, zero-authority semantics, producer role, source Acceptance binding, freshness/invalidation, publication rules and receipt.

4.19.6 `closureTest`: create and independently validate one exact zero-authority detached artifact; reject canonical-pointer mutation, missing source Acceptance, producer conflict, stale head, private-data disclosure, authority-bit addition and replay.

4.19.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 4.20 `B0V5-IHR-F020` — recovery records are not executable schemas

4.20.1 `severity=P1`; `state=OPEN-BLOCKING`; `noMergeKey=B0V5-RECOVERY-MEMBER-WITNESS-ATTEMPT-SCHEMAS-NOT-EXECUTABLE`.

4.20.2 `predicateUnderTest`: the 3-of-5 recovery profile, two witnesses and one-use attempt must have typed rooted records, exact controller equivalence, time/revision validity and an executable rotation/compromise reducer.

4.20.3 `evidence`: five member slots, two witness slots and one attempt list exact field-name strings, but fields have no types or per-record schema roots and no admitted instances. Controller, rotation and compromise semantics are prose. The vector checks only AuthorityOwner overlap, below threshold and replay; it omits witness overlap, aliases, mixed challenge, expiry, dual profiles and equal-revision compromise.

4.20.4 `impact`: distinct strings can represent one EffectiveController, stale or mixed-challenge acknowledgements can be counted, and two profiles can be current under divergent implementations.

4.20.5 `remediation`: freeze typed member/witness/attempt records, deterministic IDs, controller-equivalence graph, validity/revocation fields and an executable one-use recovery/rotation state machine with exact ordering.

4.20.6 `closureTest`: two reducers must agree on a valid 3-of-5 plus two-witness trace and reject AuthorityOwner/work-role/witness/custodian overlap, alias equivalence, stale/expired member, below threshold, mixed challenge, replay, dual-current profile and equal-revision compromise.

4.20.7 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`; `currentRecoveryProfileReceipt=ABSENT`.

# 5. Closure counters and immutable state

## 5.1 Exact new-Finding ledger

| Counter | Value |
|---|---:|
| New Findings | `20` |
| Open blocking | `20/20` |
| Closed | `0/20` |
| P0 | `18`; all open |
| P1 | `2`; all open |
| P2 | `0` |
| P3 | `0` |
| Authority credit | `0` |
| Acceptance credit | `0` |

## 5.2 Exact inherited-Finding ledger

| Counter | Value |
|---|---:|
| Inherited Findings preserved distinctly | `12/12` |
| Open inherited P0/P1 blockers | `11/11` |
| Closed inherited Findings | `1/12` (`B0V4-HR-F012` only) |
| Closure transfer | `0` |
| Acceptance transfer | `0` |

## 5.3 Final state and future closure rule

5.3.1 `verdict=REJECT`; accepted v5 Requirements `0/96`; implemented v5 Outputs `0/96`; operational vector executions `0/288`; `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.

5.3.2 Remediation requires a new immutable successor. A future review must cite the exact Finding ID and `noMergeKey`, satisfy that Finding's own remediation and closure test, and must not borrow evidence from a sibling Finding, Producer QA, stored expected result, hash-only consistency or the closed P2 root-formula Finding.
