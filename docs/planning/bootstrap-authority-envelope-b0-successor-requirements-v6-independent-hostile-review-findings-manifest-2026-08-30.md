# 1. Connect — B0 v6 independent hostile review Findings manifest

## 1.1 Manifest identity and frozen Subject

1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-V6-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30-G0`.

1.1.2 `artifactClass=DETACHED-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE`.

1.1.3 Frozen Subject: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-2026-08-30.md`, SHA-256 `61af4c45d394c952a58346723da408b663acd38522b5c706678a11ad323001c9`.

1.1.4 Frozen manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-atomic-package-manifest-2026-08-30.json`, SHA-256 `ef6020643d6eccf1b656fd9d6aec845b80cc8b9bd2f81e8d426a2d8d1422a518`, `packageContentRoot=ed00ecb49e5053ca85ff7cccacc7378b36efe5cdb78f1aa6ca00550026372c2f`.

1.1.5 Frozen Producer QA: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-producer-qa-2026-08-30.json`, SHA-256 `92d3cacf600ec8e1b75c4a6a084e5033381c33b68a092ff810fc831ef63d846c`.

1.1.6 Parent Review: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-independent-hostile-review-2026-08-30.md`.

1.1.7 The Subject, package, Readers, Producer QA, predecessor bytes, product code, Git, GitHub and providers were not modified. This manifest records review Findings only.

## 1.2 Verdict and exact denominator

1.2.1 `verdict=REJECT`.

1.2.2 `findingCount=7`; `OPEN-BLOCKING=7`; `CLOSED=0`; severity `P0=6`, `P1=1`, `P2=0`, `P3=0`.

1.2.3 All Finding IDs and `noMergeKey` values below are unique. Closure, authority and Acceptance credit are separately zero for every Finding.

1.2.4 `B0=ABSENT`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.

# 2. New independent Findings index

## 2.1 Exact non-merged index

| Finding | Severity | State | `noMergeKey` |
|---|---|---|---|
| `B0V6-IHR-F001` | P0 | OPEN-BLOCKING | `B0V6-NORMATIVE-VALIDATOR-LANGUAGE-AND-TYPE-SEMANTICS-UNCLOSED` |
| `B0V6-IHR-F002` | P0 | OPEN-BLOCKING | `B0V6-DETACHED-ACCEPTANCE-INSTANCE-VIOLATES-OWN-CLOSED-SCHEMA` |
| `B0V6-IHR-F003` | P0 | OPEN-BLOCKING | `B0V6-PRIOR-INTERFACE-ACTUAL-ROOTS-DIRECTLY-COPIED-FROM-EXPECTED` |
| `B0V6-IHR-F004` | P0 | OPEN-BLOCKING | `B0V6-CAS-SCHEDULE-REDUCER-ACCEPTS-PHASELESS-COMMIT` |
| `B0V6-IHR-F005` | P0 | OPEN-BLOCKING | `B0V6-RECOVERY-VECTORS-EXECUTE-SURROGATE-NOT-LIFECYCLE` |
| `B0V6-IHR-F006` | P0 | OPEN-BLOCKING | `B0V6-NO-GLOBAL-POSITIVE-MODEL-SATISFIABILITY-WITNESS` |
| `B0V6-IHR-F007` | P1 | OPEN-BLOCKING | `B0V6-PACKAGED-READERS-NOT-BOUND-TO-INDEPENDENCE-EVIDENCE` |

# 3. Individual non-merged Findings

## 3.1 `B0V6-IHR-F001` — normative validators name an undefined dialect and omit closed type semantics

3.1.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V6-NORMATIVE-VALIDATOR-LANGUAGE-AND-TYPE-SEMANTICS-UNCLOSED`.

3.1.2 `predicateUnderTest`: every normative schema and transition guard must use one versioned, rooted, closed operator/type language that two clean evaluators can execute without inference or permissive fallback.

3.1.3 `evidence`: the registry defines and roots `B0V6-PORTABLE-ORACLE-AST-V1`, but 69 validation/invalidation programs name `B0V6-ORACLE-AST-V1`, for which there is no definition or language root. Those programs include 11 `UNIQUE-COUNT` operations, while the rooted constraint semantics and Readers implement only `UNIQUE_COUNT`.

3.1.4 `evidence`: all 156 Acceptance fields use a `TYPE` validation operator that is absent from the rooted constraint semantics and both Reader constraint evaluators. The Readers' alternate type helper treats 83/156 Acceptance types as valid whenever they are merely non-null. No Acceptance-field `TYPED_FIELD_VALID` vector exists.

3.1.5 `impact`: validators can disagree or fail closed on the named dialect, while the packaged Readers can grant a local PASS without executing the normative schema. Wrong non-null revisions, time instants, head tuples, Act IDs and opaque references are not rejected by the claimed complete type semantics.

3.1.6 `remediation`: issue an immutable successor with one exact language identifier/root, one closed operator registry, total type decoders for every declared type, explicit unknown-type blocking, and end-to-end schema execution rather than structural field checks.

3.1.7 `closureTest`: two independently implemented clean validators must execute every normative program and every field type; reject undefined language ID, `UNIQUE-COUNT`/`UNIQUE_COUNT` substitution, unknown type, wrong non-null scalar/tuple/time/revision, missing operator and one mutation per declared type. Coverage must be derived from the normative programs, not a parallel family list.

3.1.8 `affectedInheritedFindings=B0V5-IHR-F007,B0V5-IHR-F015,B0V5-IHR-F017,B0V5-IHR-F018,B0V4-HR-F006,B0V4-HR-F007,B0V4-HR-F010`.

3.1.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.2 `B0V6-IHR-F002` — the detached Acceptance planning instance violates its own closed schema

3.2.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V6-DETACHED-ACCEPTANCE-INSTANCE-VIOLATES-OWN-CLOSED-SCHEMA`.

3.2.2 `predicateUnderTest`: the admitted detached Acceptance instance must contain exactly the declared fields and satisfy its validation program under `unknownFieldPolicy=BLOCK`.

3.2.3 `evidence`: the schema declares 12 fields. The frozen admitted instance contains five undeclared keys: `schemaRoot`, `instanceRoot`, `operational`, `expectedProducerAppointmentRoot` and `currentSecurityUniverseTupleRoot`.

3.2.4 `evidence`: the validation AST compares `/producerAppointmentRoot` with `/expectedProducerAppointmentRoot` and `/freshnessHeadTupleRoot` with `/currentSecurityUniverseTupleRoot`. The latter two paths are undeclared. Keeping them violates the unknown-field rule; removing them yields missing paths and must block.

3.2.5 `evidence`: both Readers' `DETACHED-ACCEPTANCE-SCHEMA` check asserts only non-null roots, root equality and `operationalCurrentInstanceRoot=null`. The 24 detached vectors mutate one declared field to null; none executes the full validation AST or unknown-field policy.

3.2.6 `impact`: the only admitted positive instance cannot be valid under the schema as frozen, so detached Acceptance is not positively satisfiable or independently decidable.

3.2.7 `remediation`: distinguish envelope metadata from schema members with an explicit rooted outer schema, declare every validation-context input with source/authority/freshness semantics, and validate one exact instance under the full closed schema.

3.2.8 `closureTest`: two clean validators must accept one exact declared instance and reject each unknown field, each missing comparator, a comparator supplied from an unrooted context, stale head, producer mismatch, pointer mutation, private disclosure and nonzero credit.

3.2.9 `affectedInheritedFindings=B0V5-IHR-F019,B0V4-HR-F010`.

3.2.10 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.3 `B0V6-IHR-F003` — prior-interface actual roots are producer copies of expected roots

3.3.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V6-PRIOR-INTERFACE-ACTUAL-ROOTS-DIRECTLY-COPIED-FROM-EXPECTED`.

3.3.2 `predicateUnderTest`: each of the 17 cycle-breaking prior interfaces must bind an actual observation produced independently of the expected value and independently of the later provider.

3.3.3 `evidence`: all 17 planning instances satisfy `actualInputRoot == expectedInputRoot`, `actualOutputRoot == expectedOutputRoot`, and `providerInstanceRoot == null`.

3.3.4 `evidence`: the frozen generator computes `expectedInputRoot` and `expectedOutputRoot`, then assigns `actualInputRoot: expectedInputRoot` and `actualOutputRoot: expectedOutputRoot`. The receipt is rooted after that copy. The vector controls therefore start from equality by construction and only prove that changing one copied side causes inequality.

3.3.5 `impact`: an absent or incorrect provider-independent interface value can be replaced by the expected value and still receive a planning validation receipt, recreating the hidden dependency/circularity that the interface is intended to break.

3.3.6 `remediation`: materialize actual interface bytes/roots in a detached producer-owned artifact whose producer, dependency graph and receipt are distinct from the specification/expected-value producer; bind freshness and provenance before the later provider exists.

3.3.7 `closureTest`: freeze expected values before the actual producer runs; independently derive every actual value; prove producer/controller/dependency separation; reject direct copy, common-source derivation, null actual, substituted expected, future-provider read and stale-head mutations.

3.3.8 `affectedInheritedFindings=B0V5-IHR-F005,B0V4-HR-F004`.

3.3.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.4 `B0V6-IHR-F004` — CAS schedule reduction accepts commits without the required causal phases

3.4.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V6-CAS-SCHEDULE-REDUCER-ACCEPTS-PHASELESS-COMMIT`.

3.4.2 `predicateUnderTest`: every accepted schedule must be a legal projection of the 15-step transaction, preserving compare, validation, reservation, fence, Permit consume, pointer CAS, finalization/outbox and the sole commit linearization point.

3.4.3 `evidence`: both reducer implementations require only two actors, contiguous ordinals, exactly one `COMMIT`, and a losing actor with `BLOCK` or `CRASH-PRECOMMIT`. They do not require any compare/reserve event for the winner or bind events to transaction operations/keys.

3.4.4 `evidence`: frozen eligible interleaving classes 03 and 04 start with the winner's `COMMIT` and contain no winner compare/reserve. Classes 05 and 06 contain reserve/commit but no winner compare. The reducer also accepts the two-event trace `W1:COMMIT; W2:BLOCK`.

3.4.5 `evidence`: the 15-step transaction is only structurally checked. The vectors execute an aggregate constraint AST and the permissive schedule helper, not the normative state transition. `RESERVED-NOT-COMMITTED` is classified as a response-loss state even though reservation is a private write and all precommit crashes have zero durable effects.

3.4.6 `impact`: phaseless, stale, unvalidated or unreserved winners can be classified as the sole valid commit; the schedule proof does not establish CAS, replay, recovery or exactly-once external effect semantics.

3.4.7 `remediation`: define one executable state reducer over the actual 15 operations and store keys, derive schedule projections from its trace, and derive response-loss states only from reachable durable cuts.

3.4.8 `closureTest`: enumerate/reduce all two-writer traces and every crash cut; reject commit before each mandatory predecessor, missing compare/reserve/validation/Permit consume/outbox, stale pointer/head/fence, equal-revision revoke, duplicate attempt and unreachable readback states. Two independent reducers must agree.

3.4.9 `affectedInheritedFindings=B0V5-IHR-F016,B0V4-HR-F009`.

3.4.10 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.5 `B0V6-IHR-F005` — recovery vectors validate a shadow predicate rather than the lifecycle program

3.5.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V6-RECOVERY-VECTORS-EXECUTE-SURROGATE-NOT-LIFECYCLE`.

3.5.2 `predicateUnderTest`: each recovery mutation must alter a value actually read by the rooted recovery lifecycle, and one valid 3-of-5 plus two-witness trace must execute atomically against current authority state.

3.5.3 `evidence`: the recovery vector family evaluates an 11-field flat surrogate. The lifecycle reads namespaced `/attempt/*`, `/context/*` and `/store/*` paths; zero of the 11 mutation-matrix JSON pointers exactly matches a lifecycle read pointer.

3.5.4 `evidence`: `allMembersCurrent`, `allMembersWithinValidity` and `compromiseBeforeCommitAtEquality` are tested in the surrogate but are absent from all lifecycle preconditions. The corresponding negative vectors can pass while no normative recovery transition changes.

3.5.5 `evidence`: time/revision, controller and challenge validations are lifecycle steps 1..3, while only steps 4..7 are declared atomic. The transaction does not re-read/CAS the validated member, witness, validity, revocation or controller-equivalence heads before rotation.

3.5.6 `impact`: stale, expired, revoked, alias-equivalent or post-validation-changed acknowledgements can reach reservation/rotation even though every surrogate vector reports BLOCK for a similarly named field.

3.5.7 `remediation`: use one namespaced canonical recovery state, make every matrix mutation point to an actual lifecycle read, and bring validation plus reservation/revocation/admission/consume under one versioned CAS boundary or revalidate all heads at commit.

3.5.8 `closureTest`: execute one valid full trace and reject each exact currentness, validity, challenge, threshold, alias/controller, replay, dual-current and equal-revision mutation at the lifecycle path; inject state changes between every pair of steps and prove stale validation cannot commit.

3.5.9 `affectedInheritedFindings=B0V5-IHR-F020,B0V4-HR-F011`.

3.5.10 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.6 `B0V6-IHR-F006` — no global positive-model satisfiability witness exists

3.6.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V6-NO-GLOBAL-POSITIVE-MODEL-SATISFIABILITY-WITNESS`.

3.6.2 `predicateUnderTest`: the planning specification must exhibit at least one canonical, non-authoritative model/trace in which every mandatory schema, guard, authority edge, role separation, Permit, CAS/recovery rule, Acceptance field, Output and freshness predicate can be satisfied simultaneously, while separately proving that the current real state remains blocked.

3.6.3 `evidence`: the corpus has 7,430 distinct local fixtures, each proving one local control plus one negative mutation. There is no single global fixture, model root, satisfying assignment, end-to-end success trace or cross-domain consistency receipt.

3.6.4 `evidence`: operational execution is `0/7430`; operational Genesis, first-Permit, Permit, profile, detached Acceptance, recovery attempt and Acceptance roots are null. This correctly proves the current blocked state, but it does not prove design satisfiability.

3.6.5 `evidence`: the detached-schema contradiction, phaseless CAS abstraction and recovery shadow state are never composed. Local controls can all pass even if their combined constraints are inconsistent or no legal success transition exists.

3.6.6 `impact`: an always-blocking or mutually inconsistent protocol can satisfy all negative-vector counters and be mistaken for a complete successor. Safety of the current blocked state is preserved, but liveness/non-vacuity and successor closure are unproven.

3.6.7 `remediation`: materialize one deterministic planning-only full-state model and executable trace from external L0 admission through one legal Acceptance commit, with all roots/inputs typed and zero authority/Acceptance credit; keep current real-state evaluation separate and blocked.

3.6.8 `closureTest`: two independent solvers/reducers derive the same positive model/trace and every intermediate root; mutate each conjunct and require the trace to block; independently evaluate the actual current state and require `B0=ABSENT`, `Gate29=BLOCKED` until genuine external inputs exist.

3.6.9 `affectedInheritedFindings=B0V5-IHR-F007,B0V5-IHR-F015,B0V5-IHR-F016,B0V5-IHR-F017,B0V5-IHR-F018,B0V5-IHR-F020,B0V4-HR-F006,B0V4-HR-F007,B0V4-HR-F009,B0V4-HR-F010,B0V4-HR-F011`.

3.6.10 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.7 `B0V6-IHR-F007` — packaged Reader bytes are not bound to the claimed independence evidence

3.7.1 `severity=P1`; `state=OPEN-BLOCKING`; `noMergeKey=B0V6-PACKAGED-READERS-NOT-BOUND-TO-INDEPENDENCE-EVIDENCE`.

3.7.2 `predicateUnderTest`: Reader parity may count as independent evidence only when the exact Reader bytes are bound to distinct implementation, dependency, runtime, author/controller, execution-context and disclosure receipts, and common-mode semantic omissions are excluded.

3.7.3 `evidence`: Reader A and B have distinct hashes and Node/Python runtimes, and neither imports/executes the generator or the other Reader. Their stored independence statements assert only that limited property.

3.7.4 `evidence`: the nine planning IndependenceProfile rows contain opaque A/B roots and `operationalCurrentProfileCount=0`, but none binds the actual Reader hashes `a78c0935a795d0c9ef03bce5e736f66eeabd35c30fa5dd9c5f54d50b9e08955a` and `2ecc906d14d15f1ffb1d5eaa431b22ec339d5bf005f19033edd43fd0d3328810`.

3.7.5 `evidence`: both Readers run the same 93 named check classes and share every material omission in Findings F001, F002, F004 and F005. Both produce PASS because both structurally accept the same invalid/unchecked semantics.

3.7.6 `impact`: language diversity and non-import do not prevent a shared specification/transcription defect from receiving two votes. Producer QA parity is mechanical, not independent hostile assurance.

3.7.7 `remediation`: bind exact Reader content/dependency/runtime/controller/context hashes to detached precommitted profiles; use independently authored semantic implementations; disclose results only after both submissions; include adversarial conformance cases for every normative operator and state transition.

3.7.8 `closureTest`: verify exact transitive independence receipts for both Reader hashes, rerun a presealed corpus containing the seven Findings' counterexamples, and require both implementations to reject them without sharing code, generated oracle tables, controller or disclosed results.

3.7.9 `affectedInheritedFindings=B0V5-IHR-F014,B0V4-HR-F008`.

3.7.10 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

# 4. Active inherited-Finding mapping and counters

## 4.1 One-to-one affected-row map

4.1.1 The exact 31-row disposition ledger is frozen in section 3.1 of the parent Review and is incorporated by reference by repository-relative path and section identifier only; no source Finding is merged here.

4.1.2 `INDEPENDENT-PLANNING-CLOSURE-PASS=15/31`: `B0V5-IHR-F001`, `B0V5-IHR-F002`, `B0V5-IHR-F003`, `B0V5-IHR-F004`, `B0V5-IHR-F006`, `B0V5-IHR-F008`, `B0V5-IHR-F009`, `B0V5-IHR-F010`, `B0V5-IHR-F011`, `B0V5-IHR-F012`, `B0V5-IHR-F013`, `B0V4-HR-F001`, `B0V4-HR-F002`, `B0V4-HR-F003`, `B0V4-HR-F005`.

4.1.3 `OPEN-BLOCKING=16/31`: `B0V5-IHR-F005`, `B0V5-IHR-F007`, `B0V5-IHR-F014`, `B0V5-IHR-F015`, `B0V5-IHR-F016`, `B0V5-IHR-F017`, `B0V5-IHR-F018`, `B0V5-IHR-F019`, `B0V5-IHR-F020`, `B0V4-HR-F004`, `B0V4-HR-F006`, `B0V4-HR-F007`, `B0V4-HR-F008`, `B0V4-HR-F009`, `B0V4-HR-F010`, `B0V4-HR-F011`.

4.1.4 The separately preserved `B0V4-HR-F012` is not in the active denominator and remains closed only for its exact package-root derivation predicate, with zero credit.

## 4.2 Exact terminal counters

| Counter | Value |
|---|---:|
| New Findings | `7` |
| New open / closed | `7 / 0` |
| New P0 / P1 / P2 / P3 | `6 / 1 / 0 / 0` |
| Active inherited identities | `31/31; non-merged` |
| Active planning-closure passes / open | `15 / 16` |
| Authority credit | `0` |
| Acceptance credit | `0` |
| Self-acceptance | `0` |
| Operational vector executions | `0/7430` |

4.2.1 `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.

4.2.2 `reviewIsAcceptance=false`; no Finding is self-closed by its author; a future immutable successor and fresh independent review are required.
