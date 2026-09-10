# Protocol v1.8 immutable successor requirements

## 1. Identity and non-authority

1.1 Artifact=CONNECT-THREE-REVIEW-PROTOCOL-V1-8-IMMUTABLE-SUCCESSOR-2026-08-30.

1.2 This package is a formal non-authoritative successor to Protocol v1.7 and its independent hostile review.

1.3 Acceptance=0; Gate29=BLOCKED; developmentFreeze=ACTIVE; repository=PUBLIC; authorityOutputs=0.

1.4 Mechanical PASS is not semantic Acceptance, HumanApproval, B0 authority, a CommitReceipt, a Permit or deployment authority.

1.5 v1.7 bytes, its 31 predecessor finding closures, 4016 semantic predicates and 53450 semantic uses remain normative only by exact content-addressed inclusion; no translation or weakening is allowed.

1.6 All external review, semantic, trust, time, finality, live-head and continuous-PUBLIC receipts remain missing. No package member can self-supply them.

## 2. Exact one-to-one closure requirements

### 2.1 MPRR-V18-REQ-001 — Readers trust, but do not recompute, packageRoot

2.1.1 sourceFinding=MPRR-V17-IHR-F001;severity=P0;control=MPRR-V18-CONTROL-F001.

2.1.2 requiredClosure=both readers independently recompute the exact CPB1 root from an exact closed member set and physical tool bytes, reject any mismatch before vector execution, and pass packageRoot substitution/removal/reordering negative vectors.

2.1.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.2 MPRR-V18-REQ-002 — Producer-tool roots are not verified

2.2.1 sourceFinding=MPRR-V17-IHR-F002;severity=P0;control=MPRR-V18-CONTROL-F002.

2.2.2 requiredClosure=hash all three exact physical tools before use, compare path/role/root against a unique closed tool universe, include them in independently recomputed packageRoot, and pass one-byte mutation and tool-swap vectors.

2.2.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.3 MPRR-V18-REQ-003 — Manifest payload/frozen-input universe is not closed

2.3.1 sourceFinding=MPRR-V17-IHR-F003;severity=P0;control=MPRR-V18-CONTROL-F003.

2.3.2 requiredClosure=define and enforce an exact unique payload/tool/frozen-input schema and set equality; reject missing, extra, duplicate, wrong-role and wrong-path members; recompute the constructor.

2.3.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.4 MPRR-V18-REQ-004 — Repository root and origin are not identity-bound

2.4.1 sourceFinding=MPRR-V17-IHR-F004;severity=P1;control=MPRR-V18-CONTROL-F004.

2.4.2 requiredClosure=bind a canonical realpath plus immutable repository identity and intended Git state; reject symlink escapes, alternate roots/origins and dirty/unintended worktree/index states with dedicated negative vectors.

2.4.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.5 MPRR-V18-REQ-005 — Parser profiles are not executed by readers

2.5.1 sourceFinding=MPRR-V17-IHR-F005;severity=P1;control=MPRR-V18-CONTROL-F005.

2.5.2 requiredClosure=implement the four normative parser profiles independently in both readers, rediscover the universe from carrier bytes, enforce unique IDs/exact span set equality and pass omission/duplicate/overlap/heading-confusion vectors.

2.5.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.6 MPRR-V18-REQ-006 — Schema conformance is not enforced

2.6.1 sourceFinding=MPRR-V17-IHR-F006;severity=P0;control=MPRR-V18-CONTROL-F006.

2.6.2 requiredClosure=materialize complete field types and bounds for every normative schema; independently recompute schema roots; recursively validate every record; reject missing/extra/type/range/duplicate violations before any semantic or authority decision.

2.6.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.7 MPRR-V18-REQ-007 — 114 schema-reference occurrences are unresolved

2.7.1 sourceFinding=MPRR-V17-IHR-F007;severity=P0;control=MPRR-V18-CONTROL-F007.

2.7.2 requiredClosure=define all 21 schemas or remove their uses, index every schema-reference field, enforce set equality and run missing/unknown/wrong-version schema vectors in both readers.

2.7.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.8 MPRR-V18-REQ-008 — Canonical JSON is ambiguous across readers

2.8.1 sourceFinding=MPRR-V17-IHR-F008;severity=P1;control=MPRR-V18-CONTROL-F008.

2.8.2 requiredClosure=adopt a byte-level canonical parser profile; reject duplicate keys, non-NFC, invalid Unicode, floats and out-of-range integers; sort by one explicitly tested scalar/byte rule; pass a shared cross-language conformance corpus.

2.8.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.9 MPRR-V18-REQ-009 — Output identity omits authority/custody envelope fields

2.9.1 sourceFinding=MPRR-V17-IHR-F009;severity=P1;control=MPRR-V18-CONTROL-F009.

2.9.2 requiredClosure=bind every semantics-bearing envelope field into the output root or a strictly coupled envelope root; validate locator/block identity and pass field-swap vectors.

2.9.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.10 MPRR-V18-REQ-010 — Detached evidence binds Subject, not package

2.10.1 sourceFinding=MPRR-V17-IHR-F010;severity=P0;control=MPRR-V18-CONTROL-F010.

2.10.2 requiredClosure=every appointment, review, reconciliation, approval, semantic receipt and Permit must bind exact packageRoot, manifestRoot, subjectRoot, generation, purpose, epoch and relevant head roots; add cross-package substitution vectors.

2.10.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.11 MPRR-V18-REQ-011 — Detached-binding vectors test literals, not evidence

2.11.1 sourceFinding=MPRR-V17-IHR-F011;severity=P1;control=MPRR-V18-CONTROL-F011.

2.11.2 requiredClosure=execute all declared binding operators over typed evidence records; include missing/malformed/swap/multiplicity failures and at least one non-authoritative correctly-bound positive control.

2.11.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.12 MPRR-V18-REQ-012 — Semantic predecessor preservation is asserted, not evaluated

2.12.1 sourceFinding=MPRR-V17-IHR-F012;severity=P0;control=MPRR-V18-CONTROL-F012.

2.12.2 requiredClosure=define an independently executable semantic proof/translation language; prove every conjunct against exact target bytes with no weakening, collisions or generic presence credit; obtain an external package-bound semantic receipt.

2.12.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.13 MPRR-V18-REQ-013 — 387 vectors inject expected values into actual evaluation

2.13.1 sourceFinding=MPRR-V17-IHR-F013;severity=P0;control=MPRR-V18-CONTROL-F013.

2.13.2 requiredClosure=remove all expected/oracle values from evaluator inputs, derive actual observations from mutated physical bytes/state, compare to the oracle only after execution, and pass oracle-mutation/metamorphic tests proving actual output is unchanged.

2.13.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.14 MPRR-V18-REQ-014 — Causal graph is partial and under-validated

2.14.1 sourceFinding=MPRR-V17-IHR-F014;severity=P0;control=MPRR-V18-CONTROL-F014.

2.14.2 requiredClosure=materialize one rooted graph path per vector, bind every raw input/read/derivation/effect/oracle node, validate exact grammar and bijection independently, and reject missing/extra/duplicate/injected edges.

2.14.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.15 MPRR-V18-REQ-015 — Machine runner skips guards

2.15.1 sourceFinding=MPRR-V17-IHR-F015;severity=P0;control=MPRR-V18-CONTROL-F015.

2.15.2 requiredClosure=resolve exactly one guard, validate its context schema, execute it before lookup/effect, and test false/malformed/unknown/missing/ambiguous guard cases.

2.15.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.16 MPRR-V18-REQ-016 — Guard events have no typed derivation evaluator

2.16.1 sourceFinding=MPRR-V17-IHR-F016;severity=P0;control=MPRR-V18-CONTROL-F016.

2.16.2 requiredClosure=define typed raw context schemas and total deterministic derivation functions; forbid caller event IDs; bind derivation roots to machines and pass adversarial raw-observation vectors.

2.16.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.17 MPRR-V18-REQ-017 — Model check omits authority and terminal consistency

2.17.1 sourceFinding=MPRR-V17-IHR-F017;severity=P0;control=MPRR-V18-CONTROL-F017.

2.17.2 requiredClosure=prove exact cross-table invariants for every transition/state/terminal/effect, forbid authority on every negative/malformed path, and exhaustively model-check all registered states with executed guards.

2.17.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.18 MPRR-V18-REQ-018 — Acceptance and authority output are hardcoded

2.18.1 sourceFinding=MPRR-V17-IHR-F018;severity=P0;control=MPRR-V18-CONTROL-F018.

2.18.2 requiredClosure=derive report authority fields from validated immutable state, enforce cross-artifact equality, reject any unauthorized nonzero value, and add mutations for Acceptance, Gate29, freeze, repository and authority outputs.

2.18.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.19 MPRR-V18-REQ-019 — No non-vacuous positive acceptance control exists

2.19.1 sourceFinding=MPRR-V17-IHR-F019;severity=P0;control=MPRR-V18-CONTROL-F019.

2.19.2 requiredClosure=add a synthetic, non-authoritative, fully typed externally supplied positive-control path that reaches Permit-eligible state only after every predicate; mutate each prerequisite independently to a fail-closed terminal; do not issue real authority during QA.

2.19.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.20 MPRR-V18-REQ-020 — CAS admission is non-executable

2.20.1 sourceFinding=MPRR-V17-IHR-F020;severity=P0;control=MPRR-V18-CONTROL-F020.

2.20.2 requiredClosure=implement a transactional CAS interface over the exact 65-member comparison set and durable member set, with expected/observed/revocation equality, one operation key, zero-or-one Permit and atomic no-write failure; pass concurrent schedule tests.

2.20.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.21 MPRR-V18-REQ-021 — Crash recovery and durable replay are prose-only

2.21.1 sourceFinding=MPRR-V17-IHR-F021;severity=P1;control=MPRR-V18-CONTROL-F021.

2.21.2 requiredClosure=materialize a rooted recovery protocol and storage adapter contract; inject every crash boundary; prove idempotent exact receipt recovery, no partial authority and durable revocation consumption.

2.21.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.22 MPRR-V18-REQ-022 — External-input gates do not validate evidence

2.22.1 sourceFinding=MPRR-V17-IHR-F022;severity=P0;control=MPRR-V18-CONTROL-F022.

2.22.2 requiredClosure=define all external schemas, canonical byte envelopes, trust chains, freshness/revocation checks and package binding; execute them before state transition; test malformed, stale, replayed, cross-package and wrong-authority inputs.

2.22.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.23 MPRR-V18-REQ-023 — Continuous PUBLIC invariant is not executed

2.23.1 sourceFinding=MPRR-V17-IHR-F023;severity=P1;control=MPRR-V18-CONTROL-F023.

2.23.2 requiredClosure=bind repository identity, remote visibility, ref/head and exact push transaction; run two independent scanners over the finite write/object universe; require fresh external dictionary/seal; abort on any non-PUBLIC or secret/PII candidate.

2.23.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.24 MPRR-V18-REQ-024 — Dependency/live-head proof is count-only

2.24.1 sourceFinding=MPRR-V17-IHR-F024;severity=P1;control=MPRR-V18-CONTROL-F024.

2.24.2 requiredClosure=enforce exact rooted set equality and instrument actual reads; fetch and bind every live head/revocation value at CAS; add same-cardinality substitution and stale/revoked dependency vectors.

2.24.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

### 2.25 MPRR-V18-REQ-025 — Readers overwrite reports inside the frozen package

2.25.1 sourceFinding=MPRR-V17-IHR-F025;severity=P2;control=MPRR-V18-CONTROL-F025.

2.25.2 requiredClosure=make readers read-only by default and emit reports only to an explicit detached output directory or stdout; bind report inputs and test that package bytes and metadata remain unchanged.

2.25.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.

## 3. Executable contracts

3.1 Both readers independently recompute packageRoot from the exact 9-member payload and all three physical tool roots.

3.2 Both readers require exact canonical JSON bytes, NFC, UTF-8 byte key order, duplicate rejection, safe integers and no floats.

3.3 Every schema reference resolves to a non-empty closed typed schema. Every normative record rejects missing, extra and ill-typed fields.

3.4 semanticPreservationRows=57466; predecessorFindingRows=31; relation=exact canonical byte identity, not asserted equivalence.

3.5 causalVectors=649; predecessorVectors=574; successorVectors=75; graphNodes=3245; graphEdges=2596.

3.6 Evaluators receive only vector.input. vector.oracle is read only after actual evaluation. Every vector has one five-node/four-edge causal path, and oracle has no path to evaluator.

3.7 Machine events derive from typed raw context. Exactly one registered guard executes before transition and authority effect.

3.8 Acceptance is derived from exact closure, valid package-bound external receipts, semantic proof, independent principals, CAS, PUBLIC, time and finality. Producer/readers cannot satisfy external roles.

3.9 The positive acceptance control is synthetic and non-authoritative: it may reach Permit-eligible but always emits zero authority outputs.

3.10 CAS and recovery have executable reference evaluators covering stale heads, atomic commit, response loss, exact receipt replay, partial writes, readback divergence and revocation.

3.11 Production CAS/public/trust adapters remain absent. Current admission is blocked and no Permit can be issued.

3.12 Readers are read-only by default. Reports require an explicit detached output path during Producer QA before freeze.

## 4. Freeze and review boundary

4.1 This Subject and all normative payload members freeze only after manifest/tool roots, two-reader parity and Producer QA are materialized.

4.2 Producer QA cannot close any of the 25 findings. A later independent hostile review must verify every row separately.

4.3 Repository visibility must remain PUBLIC. No product, Git, GitHub, provider or deployment mutation is authorized by this package.

