# Protocol v1.7 — independent hostile review findings manifest

## 1. Manifest contract

1.1 ManifestId=`MPRR-V17-IHR-FINDINGS-2026-08-30`.

1.2 SubjectRoot=`495ba345115f7623802adef7d7268ba7a6fe7049e68f9b04866f77f3602b5d39`.

1.3 ReviewPath=`docs/planning/three-review-protocol-v1-7-independent-hostile-review-2026-08-30.md`.

1.4 Denominator=`25` exact non-merged findings.

1.5 Severity denominator=`P0:16;P1:8;P2:1;P3:0`.

1.6 State denominator=`OPEN:25;CLOSED:0`.

1.7 Acceptance credit=`0` for every row.

1.8 Closure requires the row-specific predicate, immutable evidence bytes, two independent readers where applicable, and a later independent hostile review. Producer declarations and self-generated reports cannot close a row.

1.9 Authority state=`Acceptance=0;Gate29=BLOCKED;developmentFreeze=ACTIVE;repository=PUBLIC;authorityOutputs=0`.

## 2. Findings

### 2.1 `MPRR-V17-IHR-F001` — Readers trust, but do not recompute, packageRoot

2.1.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.1.2 Evidence=`docs/planning/three-review-protocol-v1-7-package-2026-08-30/reader-a.mjs:95,477`; `docs/planning/three-review-protocol-v1-7-package-2026-08-30/reader-b.rb:73,530`; manifest line 1.

2.1.3 Observation=both readers validate listed members, then consume `manifest.packageRoot` directly. Neither executes the declared CPB1 package-root constructor.

2.1.4 Impact=a forged or stale packageRoot can enter a PASS report and `commonResultRoot`; the bundled PASS is not proof of package identity.

2.1.5 Closure=both readers independently recompute the exact CPB1 root from an exact closed member set and physical tool bytes, reject any mismatch before vector execution, and pass packageRoot substitution/removal/reordering negative vectors.

### 2.2 `MPRR-V17-IHR-F002` — Producer-tool roots are not verified

2.2.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.2.2 Evidence=Reader A lines 158–165; Reader B lines 138–145; `producerTools` at manifest line 1.

2.2.3 Observation=the manifest-declared generator root is used to recompute Producer receipts, while neither reader hashes the generator or either reader. The two reader roots are unused.

2.2.4 Impact=tool substitution is outside bundled verification, even though tool roots are inputs to the claimed package root.

2.2.5 Closure=hash all three exact physical tools before use, compare path/role/root against a unique closed tool universe, include them in independently recomputed packageRoot, and pass one-byte mutation and tool-swap vectors.

### 2.3 `MPRR-V17-IHR-F003` — Manifest payload/frozen-input universe is not closed

2.3.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.3.2 Evidence=Reader A lines 95–103; Reader B lines 73–81; no reader reference to `frozenInputs` or `packageRootConstructor`.

2.3.3 Observation=readers iterate whatever payload list is supplied; they do not require the exact 10 paths, uniqueness, roles, order rule, frozen-input set or constructor grammar.

2.3.4 Impact=omitted, duplicated or relabelled package members can fall outside the declared root while still being read mechanically from fixed filenames.

2.3.5 Closure=define and enforce an exact unique payload/tool/frozen-input schema and set equality; reject missing, extra, duplicate, wrong-role and wrong-path members; recompute the constructor.

### 2.4 `MPRR-V17-IHR-F004` — Repository root and origin are not identity-bound

2.4.1 Severity=`P1`; state=`OPEN`; acceptanceCredit=`0`.

2.4.2 Evidence=Reader A lines 7–9 and 101–116; Reader B lines 7–9 and 79–95; repository root policy at registry line 1.

2.4.3 Observation=root is positional `packageDir/../../..`; containment is lexical. No realpath, symlink, Git top-level, repository ID, origin, ref, worktree or index identity is bound.

2.4.4 Impact=an attacker-controlled mirror or symlinked tree with matching files can receive the same mechanical result.

2.4.5 Closure=bind a canonical realpath plus immutable repository identity and intended Git state; reject symlink escapes, alternate roots/origins and dirty/unintended worktree/index states with dedicated negative vectors.

### 2.5 `MPRR-V17-IHR-F005` — Parser profiles are not executed by readers

2.5.1 Severity=`P1`; state=`OPEN`; acceptanceCredit=`0`.

2.5.2 Evidence=Reader A lines 123–156; Reader B lines 102–136.

2.5.3 Observation=the readers hash parser-profile prose and validate emitted spans; they never rerun the heading/span selectors or prove unique discovered membership. Current independent rescan happened to match 112 requirements and 31 findings.

2.5.4 Impact=a producer omission can remain invisible if the supplied registry, namespace roots and manifest are regenerated consistently.

2.5.5 Closure=implement the four normative parser profiles independently in both readers, rediscover the universe from carrier bytes, enforce unique IDs/exact span set equality and pass omission/duplicate/overlap/heading-confusion vectors.

### 2.6 `MPRR-V17-IHR-F006` — Schema conformance is not enforced

2.6.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.6.2 Evidence=registry line 1 contains 63 schemas, 61 with empty `fieldTypes`; neither reader references `schemaRoot`, `requiredFields`, `unknownFieldPolicy` or `fieldTypes`.

2.6.3 Observation=JSON parsing and selected ad-hoc field checks replace schema validation.

2.6.4 Impact=missing, extra or ill-typed authority, transition, receipt, custody and policy fields may pass.

2.6.5 Closure=materialize complete field types and bounds for every normative schema; independently recompute schema roots; recursively validate every record; reject missing/extra/type/range/duplicate violations before any semantic or authority decision.

### 2.7 `MPRR-V17-IHR-F007` — 114 schema-reference occurrences are unresolved

2.7.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.7.2 Evidence=registry line 1; 150 `*SchemaId` occurrences, 114 unresolved, 21 unique unresolved identifiers; semantic-use reference map omits `contextSchemaId` and `expectedSchemaId`.

2.7.3 Observation=all 15 machine context schemas and six external schemas are undefined, yet stored `unresolvedSemanticUses=0`.

2.7.4 Impact=guards and future external authority inputs have no closed executable type contract.

2.7.5 Closure=define all 21 schemas or remove their uses, index every schema-reference field, enforce set equality and run missing/unknown/wrong-version schema vectors in both readers.

### 2.8 `MPRR-V17-IHR-F008` — Canonical JSON is ambiguous across readers

2.8.1 Severity=`P1`; state=`OPEN`; acceptanceCredit=`0`.

2.8.2 Evidence=Reader A canonicalizer lines 24–31; Reader B lines 19–33; only one `CPB1_FRAMING` vector among 574.

2.8.3 Observation=duplicate keys and NFC are not enforced; JavaScript and Ruby key sorting can differ for non-BMP Unicode; lexical integer and surrogate constraints are incomplete.

2.8.4 Impact=the same hostile logical input can produce ambiguous parse or divergent cross-language roots.

2.8.5 Closure=adopt a byte-level canonical parser profile; reject duplicate keys, non-NFC, invalid Unicode, floats and out-of-range integers; sort by one explicitly tested scalar/byte rule; pass a shared cross-language conformance corpus.

### 2.9 `MPRR-V17-IHR-F009` — Output identity omits authority/custody envelope fields

2.9.1 Severity=`P1`; state=`OPEN`; acceptanceCredit=`0`.

2.9.2 Evidence=requirement output contract at registry line 1; Reader A lines 158–170; Reader B lines 138–150.

2.9.3 Observation=`outputRoot` binds constructor inputs and five-field digests, but excludes `authorityState`, `custodyLocator`, `independentReceiptBlockId` and `title`.

2.9.4 Impact=records with different authority/custody/receipt semantics can retain the same output identity.

2.9.5 Closure=bind every semantics-bearing envelope field into the output root or a strictly coupled envelope root; validate locator/block identity and pass field-swap vectors.

### 2.10 `MPRR-V17-IHR-F010` — Detached evidence binds Subject, not package

2.10.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.10.2 Evidence=review governance, role slots, appointments and commit bindings at registry line 1 use Subject root `240781...50a`; package root `495ba3...5d39` is absent from those records.

2.10.3 Observation=independent reviews can identify `subject.md` without identifying the registry, predicates, vectors, graph, manifest or readers actually reviewed.

2.10.4 Impact=a detached receipt may be replayed or swapped across different evidence packages sharing the Subject bytes.

2.10.5 Closure=every appointment, review, reconciliation, approval, semantic receipt and Permit must bind exact packageRoot, manifestRoot, subjectRoot, generation, purpose, epoch and relevant head roots; add cross-package substitution vectors.

### 2.11 `MPRR-V17-IHR-F011` — Detached-binding vectors test literals, not evidence

2.11.1 Severity=`P1`; state=`OPEN`; acceptanceCredit=`0`.

2.11.2 Evidence=Reader A lines 424–425; Reader B lines 461–462; 12 `DETACHED_BINDING` vectors.

2.11.3 Observation=the evaluator only asks whether fixture `leftValue != rightValue`; it does not resolve declared binding paths against a typed concrete envelope.

2.11.4 Impact=path-resolution, missing-field, array-cardinality, type and correctly-bound success behavior remain untested.

2.11.5 Closure=execute all declared binding operators over typed evidence records; include missing/malformed/swap/multiplicity failures and at least one non-authoritative correctly-bound positive control.

### 2.12 `MPRR-V17-IHR-F012` — Semantic predecessor preservation is asserted, not evaluated

2.12.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.12.2 Evidence=Reader A lines 196–234; Reader B lines 187–242; 4016 predicates and 19456 translated target clauses.

2.12.3 Observation=readers verify source digests, target roots and relation-record roots, but not semantic entailment or no-omission. 3376 predicates fan out to generic multi-target mappings.

2.12.4 Impact=renamed or generic target text can be mechanically linked while weakening or omitting predecessor meaning.

2.12.5 Closure=define an independently executable semantic proof/translation language; prove every conjunct against exact target bytes with no weakening, collisions or generic presence credit; obtain an external package-bound semantic receipt.

### 2.13 `MPRR-V17-IHR-F013` — 387 vectors inject expected values into actual evaluation

2.13.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.13.2 Evidence=Reader A lines 389–395, 416–418, 431–447; corresponding Reader B lines 430–497; contaminated vector count=`387`.

2.13.3 Observation=`expectedPostDigest`, `expectedState` or `expectedDecision` affects terminal selection before the final oracle comparison.

2.13.4 Impact=expected results can manufacture their own observed result; the claimed post-execution oracle separation is false.

2.13.5 Closure=remove all expected/oracle values from evaluator inputs, derive actual observations from mutated physical bytes/state, compare to the oracle only after execution, and pass oracle-mutation/metamorphic tests proving actual output is unchanged.

### 2.14 `MPRR-V17-IHR-F014` — Causal graph is partial and under-validated

2.14.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.14.2 Evidence=graph has 2832 nodes/2478 edges and models 354 source mutations; total vectors=574; Reader A lines 280–303.

2.14.3 Observation=220 vectors lack complete graph paths. Readers do not validate declared counts, unique node IDs, node roots, exact relation grammar, required order, vector bijection or a graph root.

2.14.4 Impact=missing or fabricated causal steps and unmodelled oracle dependencies can still produce PASS.

2.14.5 Closure=materialize one rooted graph path per vector, bind every raw input/read/derivation/effect/oracle node, validate exact grammar and bijection independently, and reject missing/extra/duplicate/injected edges.

### 2.15 `MPRR-V17-IHR-F015` — Machine runner skips guards

2.15.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.15.2 Evidence=Reader A lines 436–447; Reader B lines 485–497; vector programs claim `EXECUTE-DEFINED-GUARD`.

2.15.3 Observation=machine vectors select the registered transition directly and never execute `guardId`.

2.15.4 Impact=a malformed or false guard cannot block the transition; vector claims exceed executed behavior.

2.15.5 Closure=resolve exactly one guard, validate its context schema, execute it before lookup/effect, and test false/malformed/unknown/missing/ambiguous guard cases.

### 2.16 `MPRR-V17-IHR-F016` — Guard events have no typed derivation evaluator

2.16.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.16.2 Evidence=93 guards at registry line 1 compare `derivedEvent STRICT-EQUALS literal`; 15 context schemas are undefined.

2.16.3 Observation=no function derives the event from raw signed observations. A caller can supply the event that selects the transition.

2.16.4 Impact=the control plane is table-driven by asserted event names, not causal evidence; fail-closed guarantees are bypassable in a future admission implementation.

2.16.5 Closure=define typed raw context schemas and total deterministic derivation functions; forbid caller event IDs; bind derivation roots to machines and pass adversarial raw-observation vectors.

### 2.17 `MPRR-V17-IHR-F017` — Model check omits authority and terminal consistency

2.17.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.17.2 Evidence=Reader A lines 240–278 and 459–460; Reader B lines 249–270 and 511–513; three transitions reach `TERM-ACCEPTED`.

2.17.3 Observation=checks cover table cardinality/reachability and a regex over lifecycle states, not guard truth, transition/terminal/lifecycle agreement, authority effects or Permit eligibility.

2.17.4 Impact=an authority-granting or inconsistent transition may survive model-check PASS.

2.17.5 Closure=prove exact cross-table invariants for every transition/state/terminal/effect, forbid authority on every negative/malformed path, and exhaustively model-check all registered states with executed guards.

### 2.18 `MPRR-V17-IHR-F018` — Acceptance and authority output are hardcoded

2.18.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.18.2 Evidence=Reader A lines 463 and 478–490; Reader B lines 516 and 531–544.

2.18.3 Observation=every vector returns `actualAuthorityOutputs=0`; reports hardcode Acceptance=0, Gate29, freeze and repository instead of validating registry/manifest authority state.

2.18.4 Impact=current safety is preserved, but an inconsistent or self-accepting package claim can be hidden behind a PASS report that always prints zero.

2.18.5 Closure=derive report authority fields from validated immutable state, enforce cross-artifact equality, reject any unauthorized nonzero value, and add mutations for Acceptance, Gate29, freeze, repository and authority outputs.

### 2.19 `MPRR-V17-IHR-F019` — No non-vacuous positive acceptance control exists

2.19.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.19.2 Evidence=574/574 vectors expect authority outputs 0; zero vectors expect `TERM-ACCEPTED`; the sole ACCEPTANCE-family vector expects BLOCKED.

2.19.3 Observation=the suite proves only blocked/negative/mechanical behavior.

2.19.4 Impact=it cannot prove that a complete valid external quorum is sufficient, or that no incomplete quorum can reach Permit eligibility.

2.19.5 Closure=add a synthetic, non-authoritative, fully typed externally supplied positive-control path that reaches Permit-eligible state only after every predicate; mutate each prerequisite independently to a fail-closed terminal; do not issue real authority during QA.

### 2.20 `MPRR-V17-IHR-F020` — CAS admission is non-executable

2.20.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.20.2 Evidence=`commitContract.admissionExecutable=false`; 65 comparisons: 33 missing external, 32 missing live revocation; Subject lines 179 and 1927–1935.

2.20.3 Observation=CAS vectors compare fixture values/nulls. No atomic implementation compares all heads and writes all durable members or none.

2.20.4 Impact=atomicity, sole Permit production, stale-head exclusion and durable receipt behavior are unproven. Current admission correctly remains blocked.

2.20.5 Closure=implement a transactional CAS interface over the exact 65-member comparison set and durable member set, with expected/observed/revocation equality, one operation key, zero-or-one Permit and atomic no-write failure; pass concurrent schedule tests.

### 2.21 `MPRR-V17-IHR-F021` — Crash recovery and durable replay are prose-only

2.21.1 Severity=`P1`; state=`OPEN`; acceptanceCredit=`0`.

2.21.2 Evidence=registry replay/post-readback strings; four `REPLAY_CASE` vectors; one `READBACK_DIVERGENCE` vector; no recovery contract object.

2.21.3 Observation=no crash-boundary state machine, persisted receipt lookup, partial-write detection, durability acknowledgment or atomic revocation-head recovery is executed.

2.21.4 Impact=response loss, crash after commit/before response, crash during revocation, and partial durable writes may produce duplicates or stale usable permits.

2.21.5 Closure=materialize a rooted recovery protocol and storage adapter contract; inject every crash boundary; prove idempotent exact receipt recovery, no partial authority and durable revocation consumption.

### 2.22 `MPRR-V17-IHR-F022` — External-input gates do not validate evidence

2.22.1 Severity=`P0`; state=`OPEN`; acceptanceCredit=`0`.

2.22.2 Evidence=Reader A lines 416–418; Reader B lines 453–455; 20 external blocks are currently missing.

2.22.3 Observation=the gate compares a registry missing-state and missing-root literal to fixture expectations. It has no input-byte parser, schema/signature/appointment/trust/time/finality/revocation validator.

2.22.4 Impact=future external bytes cannot be safely admitted; changing a state label is not evidence validation.

2.22.5 Closure=define all external schemas, canonical byte envelopes, trust chains, freshness/revocation checks and package binding; execute them before state transition; test malformed, stale, replayed, cross-package and wrong-authority inputs.

### 2.23 `MPRR-V17-IHR-F023` — Continuous PUBLIC invariant is not executed

2.23.1 Severity=`P1`; state=`OPEN`; acceptanceCredit=`0`.

2.23.2 Evidence=registry public projection policy line 1; Reader A lines 448–450; current GitHub read-only result is PUBLIC.

2.23.3 Observation=the package trusts a repository-state literal and fixture-supplied field classes. It does not bind remote/ref or inspect actual prospective public-write bytes with the required external dictionary/seal and two scanners.

2.23.4 Impact=a later visibility or content change is not detected by this protocol package.

2.23.5 Closure=bind repository identity, remote visibility, ref/head and exact push transaction; run two independent scanners over the finite write/object universe; require fresh external dictionary/seal; abort on any non-PUBLIC or secret/PII candidate.

### 2.24 `MPRR-V17-IHR-F024` — Dependency/live-head proof is count-only

2.24.1 Severity=`P1`; state=`OPEN`; acceptanceCredit=`0`.

2.24.2 Evidence=Reader A lines 457–458; Reader B lines 508–510; 32 dependency comparisons currently lack live revocation heads.

2.24.3 Observation=the coverage vector compares array lengths and unique instrumented-read count, not exact set membership, actual instrumented consumption, member heads or live revocation state.

2.24.4 Impact=wrong, duplicated or unconsumed dependencies can satisfy the same cardinality while stale heads remain undetected.

2.24.5 Closure=enforce exact rooted set equality and instrument actual reads; fetch and bind every live head/revocation value at CAS; add same-cardinality substitution and stale/revoked dependency vectors.

### 2.25 `MPRR-V17-IHR-F025` — Readers overwrite reports inside the frozen package

2.25.1 Severity=`P2`; state=`OPEN`; acceptanceCredit=`0`.

2.25.2 Evidence=Reader A line 506; Reader B line 559; report files live inside the frozen package directory.

2.25.3 Observation=verification has a write side effect in the frozen Subject directory, even though reports are detached from packageRoot.

2.25.4 Impact=a review rerun changes physical non-payload artifacts, complicates custody, reproducibility and read-only verification.

2.25.5 Closure=make readers read-only by default and emit reports only to an explicit detached output directory or stdout; bind report inputs and test that package bytes and metadata remain unchanged.

## 3. Exact closure accounting

3.1 No finding is merged with another finding.

3.2 A control that contributes to multiple findings must satisfy every row-specific closure predicate independently.

3.3 Partial remediation does not change row state.

3.4 P0 closure required before any semantic acceptance evaluation=`16/16`.

3.5 P1 closure required before any semantic acceptance evaluation=`8/8`.

3.6 P2 closure required before production-readiness claim=`1/1`.

3.7 Current closure=`0/25`.

3.8 Current independent semantic receipts=`0`.

3.9 Current Permit eligibility=`0`.

3.10 Final disposition=`REJECT;Acceptance=0;Gate29=BLOCKED;developmentFreeze=ACTIVE;repository=PUBLIC;authorityOutputs=0`.
