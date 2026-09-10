# 1. Connect — B0 v7 independent hostile review Findings manifest

## 1.1 Manifest identity and frozen Subject

1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-V7-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30-G0`.

1.1.2 `artifactClass=DETACHED-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE`.

1.1.3 Frozen Subject: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-2026-08-30.md`, SHA-256 `2bc67251748cde019ffeeaf00da80f4f8f8e8d077c36ffee2c1744fab945a7c9`.

1.1.4 Frozen manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-atomic-package-manifest-2026-08-30.json`, SHA-256 `3492e8a0947a3c16d9a16eb5d064139a1e19109da8d3d64a5e20a9b9f9aa47ac`, `packageContentRoot=f9e634757856863458380ccb27b143086a64d5307b5652e0b5153932252cd098`.

1.1.5 Frozen Producer QA: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-producer-qa-2026-08-30.json`, SHA-256 `18457d2c8e03d821aa29eeea152e023f9fd43fc21e05e0806958b1f14b548889`.

1.1.6 Parent Review: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-independent-hostile-review-2026-08-30.md`.

1.1.7 Review mutation result: `caseCount=14`, `acceptedByBothReaders=14`, `resultContentRoot=6efee7dcb0d0a490a1ae5efd4ecd52d76b1d5591e9af466d498bc543d0a2d33e`.

1.1.8 The frozen Subject, package, Readers, Producer QA, predecessor bytes, product code, Git, GitHub and providers were not modified. This manifest records independent Findings only.

## 1.2 Verdict and exact denominator

1.2.1 `verdict=REJECT`.

1.2.2 `findingCount=14`; `OPEN-BLOCKING=14`; `CLOSED=0`; severity `P0=10`, `P1=4`, `P2=0`, `P3=0`.

1.2.3 All Finding IDs and `noMergeKey` values below are unique. Closure, authority and Acceptance credit are separately zero for every Finding.

1.2.4 `B0=ABSENT`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`; `authorityOutputs=0`; `Acceptance=0`.

# 2. New independent Findings index

## 2.1 Exact non-merged index

| Finding | Severity | State | `noMergeKey` |
|---|---|---|---|
| `B0V7-IHR-F001` | P0 | OPEN-BLOCKING | `B0V7-VALIDATOR-SCHEMA-DIALECT-AND-RECURSIVE-TYPE-CLOSURE-NOT-EXECUTABLE` |
| `B0V7-IHR-F002` | P0 | OPEN-BLOCKING | `B0V7-DETACHED-ACCEPTANCE-CONTEXT-SELF-SUPPLIED-AND-PRODUCER-ROLE-UNRESOLVED` |
| `B0V7-IHR-F003` | P0 | OPEN-BLOCKING | `B0V7-GENESIS-APPOINTMENT-TRUST-AND-SIGNATURE-CONTRACT-ABSENT` |
| `B0V7-IHR-F004` | P0 | OPEN-BLOCKING | `B0V7-PERMIT-TIME-REVOCATION-AND-REPLAY-REDUCE-TO-UNAUTHENTICATED-BOOLEANS` |
| `B0V7-IHR-F005` | P0 | OPEN-BLOCKING | `B0V7-CAS-REDUCER-DIVERGES-FROM-DECLARED-TRANSACTION-AND-HARDCODES-DURABILITY-CLAIMS` |
| `B0V7-IHR-F006` | P0 | OPEN-BLOCKING | `B0V7-RECOVERY-QUORUM-COLLAPSES-TO-ONE-CONTROLLER-AND-ONE-ACKNOWLEDGEMENT` |
| `B0V7-IHR-F007` | P0 | OPEN-BLOCKING | `B0V7-RECOVERY-EXACT-READ-REVALIDATION-ROTATION-AND-DURABILITY-NOT-EXECUTED` |
| `B0V7-IHR-F008` | P0 | OPEN-BLOCKING | `B0V7-GLOBAL-POSITIVE-MODEL-IS-ROOT-BAG-WITH-IGNORED-CONJUNCTION-AND-SELF-CREDIT-RULES` |
| `B0V7-IHR-F009` | P0 | OPEN-BLOCKING | `B0V7-ACTUAL-INTERFACE-INDEPENDENCE-AND-PROVENANCE-POLICY-NOT-VALIDATED` |
| `B0V7-IHR-F010` | P1 | OPEN-BLOCKING | `B0V7-PACKAGED-READERS-SHARE-COMMON-MODE-SEMANTICS-AND-SELF-ASSERT-INDEPENDENCE` |
| `B0V7-IHR-F011` | P1 | OPEN-BLOCKING | `B0V7-SOURCE-RECEIPTS-AND-READ-PATHS-LACK-NOFOLLOW-CONTAINMENT-AND-OFFLINE-TRANSACTION-BINDING` |
| `B0V7-IHR-F012` | P1 | OPEN-BLOCKING | `B0V7-PUBLIC-INVARIANT-LACKS-AUTHENTICATED-REMOTE-REF-VISIBILITY-AND-OBJECT-SET-RECEIPT` |
| `B0V7-IHR-F013` | P1 | OPEN-BLOCKING | `B0V7-MANIFEST-INVENTORY-AND-STORAGE-POLICY-LACK-UNIQUENESS-AND-TOTAL-GROWTH-BOUND` |
| `B0V7-IHR-F014` | P0 | OPEN-BLOCKING | `B0V7-PREDECESSOR-BEHAVIOR-NONWEAKENING-AND-CLOSURE-PREDICATES-NOT-REEXECUTED` |

# 3. Individual non-merged Findings

## 3.1 `B0V7-IHR-F001` — validator/schema dialect and recursive type closure are not executable

3.1.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-VALIDATOR-SCHEMA-DIALECT-AND-RECURSIVE-TYPE-CLOSURE-NOT-EXECUTABLE`.

3.1.2 `predicateUnderTest`: every schema and guard must be decided by one versioned, rooted, total and cross-runtime language; every declared schema field and metadata field must participate in validation and mutation coverage.

3.1.3 `evidence`: eight schema roots recompute, but Readers do not recompute them and ignore `additionalProperties`, `requiredFieldCount` and `nullable`. Hostile case 2 reverses those fields and both Readers PASS.

3.1.4 `evidence`: Reader A does not enforce exact AST keys while Reader B does. MATCH delegates to incompatible JavaScript and Python regular-expression dialects. `NONEMPTY_STRING` accepts an unpaired surrogate despite the declared Unicode-scalar contract.

3.1.5 `impact`: two Readers can report parity while applying different validators, and a schema can be semantically weakened without affecting PASS.

3.1.6 `remediation`: freeze exact JSON schemas for every artifact/object boundary; root every schema; define one portable regex subset or remove MATCH; require recursive exact-key/type/nullability validation and forbid unpaired surrogates.

3.1.7 `closureTest`: two clean implementations independently compile all eight schemas and every AST; mutate every schema name/type/nullability/required/additional-property field and every operator argument/metadata field; require identical BLOCK. Include AST extra key, inherited-property pointer, unpaired surrogate and cross-runtime regex divergence cases.

3.1.8 `affectedInheritedFindings=B0V6-IHR-F001,B0V5-IHR-F006,B0V5-IHR-F007,B0V4-HR-F006`.

3.1.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.2 `B0V7-IHR-F002` — detached Acceptance context is self-supplied and its producer role is unresolved

3.2.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-DETACHED-ACCEPTANCE-CONTEXT-SELF-SUPPLIED-AND-PRODUCER-ROLE-UNRESOLVED`.

3.2.2 `predicateUnderTest`: Acceptance must validate against detached, current, authenticated Appointment and SecurityUniverse state whose producer role resolves to one appointed controller.

3.2.3 `evidence`: validation compares payload roots to two values carried inside the same envelope. It performs no authoritative lookup. CAS later replaces the entire validation with `envelopeValid=true`.

3.2.4 `evidence`: named role `B0V7-ACCEPTANCE-SOLE-PRODUCER` is absent from the role universe; only `ACCEPTANCE-SOLE-PRODUCER` exists.

3.2.5 `impact`: an envelope can assert its own producer and freshness expectations, and the nominal sole producer has no closed Appointment identity.

3.2.6 `remediation`: separate untrusted envelope bytes from an authenticated validation context loaded by exact current heads; use the exact appointed role ID; bind validation receipt, context root, Appointment chain and SecurityUniverse snapshot into CAS.

3.2.7 `closureTest`: accept one externally rooted positive instance and reject attacker-equal self-supplied roots, missing/unknown context, stale head, absent role, role alias, wrong controller, revoked Appointment and `envelopeValid=true` without a rooted validation receipt.

3.2.8 `affectedInheritedFindings=B0V6-IHR-F002,B0V5-IHR-F013,B0V5-IHR-F019`.

3.2.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.3 `B0V7-IHR-F003` — Genesis, Appointment, trust and asymmetric-signature contract are absent

3.3.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-GENESIS-APPOINTMENT-TRUST-AND-SIGNATURE-CONTRACT-ABSENT`.

3.3.2 `predicateUnderTest`: Genesis and every authority-producing Appointment must be admitted by an external trust anchor with exact issuer chain, scope, controller separation, trusted time, revocation and asymmetric signature verification.

3.3.3 `evidence`: each planning Genesis instance omits every field required by its named schema and adds five undeclared fields. Controller roots are hashes of self-declared IDs, not signed Appointment receipts.

3.3.4 `evidence`: no signature, public-key/key-ID, trust-anchor, signed receipt or trusted-time field exists in the Subject, registry or Readers. Hostile case 3 collapses all five roles to one controller and self-appointment; both Readers PASS.

3.3.5 `impact`: the package has labels for authority without a verifiable chain of authority, and independence can collapse to one actor.

3.3.6 `remediation`: define planning-only external trust/signature schemas and verification inputs without creating keys or selecting unapproved cryptographic use; require exact Appointments, controller-equivalence checks, validity/revocation heads and detached signed receipts.

3.3.7 `closureTest`: use externally supplied test verification material; accept one valid chain and reject missing Genesis fields, unknown fields, invalid signature, wrong key/issuer/domain, stale/revoked Appointment, self-appointment, delegation, controller alias and any role overlap. No production key or credential may be generated by the successor.

3.3.8 `affectedInheritedFindings=B0V5-IHR-F013,B0V5-IHR-F014,B0V5-IHR-F017,B0V5-IHR-F018,B0V4-HR-F008,B0V4-HR-F010`.

3.3.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.4 `B0V7-IHR-F004` — Permit time, revocation and replay reduce to unauthenticated booleans

3.4.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-PERMIT-TIME-REVOCATION-AND-REPLAY-REDUCE-TO-UNAUTHENTICATED-BOOLEANS`.

3.4.2 `predicateUnderTest`: a typed Permit must be signature-authenticated, scoped, current, strictly newer, time-valid under trusted time, not revoked and atomically one-use by exact Permit/replay identity.

3.4.3 `evidence`: CAS attempts omit Permit fields `permitId`, `subjectRoot`, `replayKey` and `consumed`. The reducer uses global booleans `permitUsed/replayUsed`, attempt boolean `revoked`, attempt-supplied `commitInstant` and a hard-coded revision head `7`.

3.4.4 `evidence`: no trusted-time receipt, signer identity, subject lookup, keyed replay ledger or signed revocation proof is evaluated.

3.4.5 `impact`: a producer can select time/revocation booleans, unrelated permits share one global flag, and retry/replay semantics cannot be proved per identity.

3.4.6 `remediation`: execute the exact Permit schema; bind issuer/signature/scope/subject/current heads/trusted time/revision; consume `permitId+replayKey+attemptId` atomically and persist authoritative readback.

3.4.7 `closureTest`: reject absent/wrong signature, untrusted/backdated time, `validUntil` equality, equal/older revision, changed/equal-revision revocation, wrong subject/scope/head, duplicate Permit, duplicate replay key, response retry and cross-Permit key collision.

3.4.8 `affectedInheritedFindings=B0V6-IHR-F004,B0V5-IHR-F009,B0V5-IHR-F015,B0V5-IHR-F018,B0V4-HR-F007`.

3.4.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.5 `B0V7-IHR-F005` — CAS reducer diverges from the declared transaction and hard-codes durability claims

3.5.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-CAS-REDUCER-DIVERGES-FROM-DECLARED-TRANSACTION-AND-HARDCODES-DURABILITY-CLAIMS`.

3.5.2 `predicateUnderTest`: every claimed schedule/crash/replay property must derive from one executable reducer over the exact declared reads/writes and durable adapter result.

3.5.3 `evidence`: the declared 15 steps read 24 paths and write 13 paths; the reducer operates on a flat surrogate and substitutes `schemaValid`, `authorityCurrent` and `envelopeValid` booleans.

3.5.4 `evidence`: commit does not store pointer/Acceptance/outbox/effect bytes or keyed Permit identities. Crash checks compare an unchanged pre-step store. `responseLossReadback` and `outboxExactlyOnce` are literal return values.

3.5.5 `evidence`: hostile case 4 removes every declared commit write and disables crash/response recovery; both Readers PASS.

3.5.6 `impact`: the 155,117,520 schedule counter proves only the surrogate; it does not prove the declared transaction, durable recovery or exactly-once effects.

3.5.7 `remediation`: implement one pure reference reducer whose state keys exactly match the declaration and one adapter contract; derive traces, schedules, crash cuts, durable commits and response-loss readback from reducer outputs only.

3.5.8 `closureTest`: enumerate every two-writer ordering and every pre/during/post-commit cut; mutate every declared read/guard/write; require exact store delta, zero partial failure, one commit, keyed one-use, persisted pointer/Acceptance/outbox and replay-safe readback. Two independent implementations must agree.

3.5.9 `affectedInheritedFindings=B0V6-IHR-F004,B0V5-IHR-F007,B0V5-IHR-F009,B0V5-IHR-F016,B0V4-HR-F006,B0V4-HR-F009`.

3.5.10 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.6 `B0V7-IHR-F006` — Recovery quorum collapses to one controller and one acknowledgement

3.6.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-RECOVERY-QUORUM-COLLAPSES-TO-ONE-CONTROLLER-AND-ONE-ACKNOWLEDGEMENT`.

3.6.2 `predicateUnderTest`: Recovery requires one 3-of-5 quorum from five controller-separated current custodians, plus two separately controlled current witnesses and signed one-use acknowledgements.

3.6.3 `evidence`: the store contains three members, not five, and all three share one controller root. Acknowledgement uniqueness/signatures are not checked.

3.6.4 `evidence`: hostile case 5 supplies the MEMBER-A acknowledgement three times and both Readers PASS.

3.6.5 `impact`: compromise of one controller or reuse of one acknowledgement satisfies the claimed quorum and can rotate authority.

3.6.6 `remediation`: materialize five exact member Appointments with five EffectiveControllers, signature/key/epoch/currentness records, work-role separation, two separate witnesses and unique acknowledgement identities.

3.6.7 `closureTest`: accept one valid 3-of-5 trace; reject member store cardinality below five, controller alias/equality, duplicate member/ack/signature, mixed challenge, expired/revoked member, witness/member/work overlap, threshold underflow and missing signature.

3.6.8 `affectedInheritedFindings=B0V6-IHR-F005,B0V5-IHR-F014,B0V5-IHR-F020,B0V4-HR-F008,B0V4-HR-F011`.

3.6.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.7 `B0V7-IHR-F007` — Recovery exact revalidation, rotation and durability are not executed

3.7.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-RECOVERY-EXACT-READ-REVALIDATION-ROTATION-AND-DURABILITY-NOT-EXECUTED`.

3.7.2 `predicateUnderTest`: all 17 read values and both heads must be snapshot-bound and byte-revalidated at one atomic durable rotation/revoke/consume transition with crash recovery.

3.7.3 `evidence`: snapshot stores only two heads and reruns permissive validity; it never byte-compares the other 15 reads. Seven injections mutate only `securityHead`, never `recoveryHead` or another read.

3.7.4 `evidence`: declared atomic writes are active authority, old revocation, consume and recovery head; executable code writes only old revocation and consume. No new authority root exists and no crash/restart state is modeled.

3.7.5 `evidence`: hostile case 6 disables the atomicity/durability rule and both Readers PASS.

3.7.6 `impact`: stale-but-still-valid state can commit, and a PASS does not prove that authority was durably rotated or that recovery is replay-safe after a crash.

3.7.7 `remediation`: snapshot every read byte/root; inject every read/head change between every step; include new-authority target; use one CAS durable adapter with journal/restart/readback model.

3.7.8 `closureTest`: execute all `17 × 7` inter-step read mutations plus both heads, every crash cut and restart; require either exact four-write durable commit or zero writes, new authority active, old revoked, attempt consumed and recovery head advanced exactly once.

3.7.9 `affectedInheritedFindings=B0V6-IHR-F005,B0V5-IHR-F007,B0V5-IHR-F020,B0V4-HR-F006,B0V4-HR-F011`.

3.7.10 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.8 `B0V7-IHR-F008` — global positive model is a root bag with ignored conjunction/self-credit rules

3.8.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-GLOBAL-POSITIVE-MODEL-IS-ROOT-BAG-WITH-IGNORED-CONJUNCTION-AND-SELF-CREDIT-RULES`.

3.8.2 `predicateUnderTest`: one executable positive trace must entail every mandatory conjunct simultaneously while a separately evaluated real state remains blocked and self-credit is impossible.

3.8.3 `evidence`: end-to-end trace root hashes five independent roots and contains no ordered events/shared state. Negative vectors delete one copied fact key rather than mutate underlying semantics.

3.8.4 `evidence`: hostile case 7 sets zero predicate IDs/conjuncts, false separation and zero positive-model root; both Readers PASS and report `globalConjunctCount=0`. Case 12 reverses no-self-Acceptance and also PASSes.

3.8.5 `impact`: an empty or self-accepting global policy can retain Reader PASS; local positive fixtures do not prove compositional satisfiability.

3.8.6 `remediation`: encode one causal trace from external admission through Permit/Acceptance commit and Recovery semantics; derive every conjunct from trace transitions; make no-self-credit and current-state separation mandatory rooted predicates.

3.8.7 `closureTest`: two independent reducers replay the same positive trace; mutate each underlying event/state transition, remove/reorder each conjunct, reverse self-credit/separation and require BLOCK; separately require actual current state to remain B0 absent/Gate29 blocked.

3.8.8 `affectedInheritedFindings=B0V6-IHR-F006,B0V5-IHR-F007,B0V5-IHR-F012,B0V4-HR-F006`.

3.8.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.9 `B0V7-IHR-F009` — actual-interface independence and provenance policy are not validated

3.9.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-ACTUAL-INTERFACE-INDEPENDENCE-AND-PROVENANCE-POLICY-NOT-VALIDATED`.

3.9.2 `predicateUnderTest`: every actual interface value must be independently derived from exact sources under a frozen-before-actual, no-common-source/no-future-provider policy and bound by a detached producer receipt.

3.9.3 `evidence`: actual values are recomputed from predecessor bytes and match, but Readers ignore row source hashes, do not recompute observation roots, do not bind row/evidence producers and ignore all 51 policy booleans plus dependency declarations.

3.9.4 `evidence`: hostile case 8 reverses all policies and declares expected-value/future-provider dependencies; both Readers PASS.

3.9.5 `impact`: an interface can be contaminated by expected/future values or carry forged provenance while still satisfying equality and distinct-root checks.

3.9.6 `remediation`: derive expected targets from separately frozen governance; precommit them; produce actual values in a detached execution with exact source hashes/dependency graph/controller; recompute every observation root and verify a signed receipt.

3.9.7 `closureTest`: reject direct copy, common source forbidden by policy, expected-table import, future-provider read, wrong/missing source hash, forged observation root, producer alias, stale precommit and unsigned execution receipt across all 17 interfaces.

3.9.8 `affectedInheritedFindings=B0V6-IHR-F003,B0V5-IHR-F005,B0V4-HR-F004`.

3.9.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.10 `B0V7-IHR-F010` — packaged Readers share common-mode semantics and self-assert independence

3.10.1 `severity=P1`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-PACKAGED-READERS-SHARE-COMMON-MODE-SEMANTICS-AND-SELF-ASSERT-INDEPENDENCE`.

3.10.2 `predicateUnderTest`: two Reader votes require independently authored implementations and detached signed controller/runtime/execution/disclosure receipts whose results were sealed before comparison.

3.10.3 `evidence`: exact Reader hashes and language/runtime strings are rooted, but controller/context/disclosure claims are produced in the same package and unsigned.

3.10.4 `evidence`: the two implementations are semantic translations and both accept all 14 hostile packages, including contradictions they were meant to detect.

3.10.5 `impact`: parity amplifies common producer assumptions rather than providing independent assurance.

3.10.6 `remediation`: appoint independent controllers externally, precommit separate specifications/test plans, issue signed scanner/Reader receipts and prohibit result disclosure before both sealed submissions.

3.10.7 `closureTest`: verify exact Reader bytes and transitive dependencies against detached appointments/receipts, then run a blinded counterexample corpus covering every Finding; require independent rejection and compare only after sealing.

3.10.8 `affectedInheritedFindings=B0V6-IHR-F007,B0V5-IHR-F014,B0V4-HR-F008`.

3.10.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.11 `B0V7-IHR-F011` — source receipts/read paths lack no-follow containment and offline transaction binding

3.11.1 `severity=P1`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-SOURCE-RECEIPTS-AND-READ-PATHS-LACK-NOFOLLOW-CONTAINMENT-AND-OFFLINE-TRANSACTION-BINDING`.

3.11.2 `predicateUnderTest`: every input must resolve from a frozen offline repository transaction by exact regular-file, mode, bytes and hash, with no symlink/traversal/device/FIFO/oversize escape.

3.11.3 `evidence`: original 31 source hashes/bytes match, but Readers neither recompute receipt counters/roots nor call `lstat`/`realpath`/no-follow/containment. Hostile case 1 supplies all files through escaping symlinks and case 9 reverses source policy/counters; both PASS.

3.11.4 `impact`: current-working-directory substitution can redirect trusted reads outside the intended repository; asserted source coverage can disagree with the executed receipt.

3.11.5 `remediation`: bind a repo-relative frozen-input manifest to an offline transaction receipt; open with no-follow, reject non-regular/mode changes, validate realpath containment, size before read, and exact closed path set.

3.11.6 `closureTest`: reject absolute/traversal/dot/double-separator/backslash paths, symlink in every ancestor/final component, hard-link policy violation, device/FIFO/socket, oversize, mode drift, missing/extra path and live working-tree substitution; prove fail-before-write.

3.11.7 `affectedInheritedFindings=B0V4-HR-F001`; related exact current locator-path defects that independently pass retain zero credit.

3.11.8 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.12 `B0V7-IHR-F012` — PUBLIC invariant lacks authenticated remote evidence

3.12.1 `severity=P1`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-PUBLIC-INVARIANT-LACKS-AUTHENTICATED-REMOTE-REF-VISIBILITY-AND-OBJECT-SET-RECEIPT`.

3.12.2 `predicateUnderTest`: PUBLIC state must be proven by an authenticated remote visibility/ref/write-object-set receipt, not only a local literal.

3.12.3 `evidence`: package contains no remote URL/ref/object-set/authenticated visibility receipt. Readers inspect only one nested literal. Hostile case 10 changes other authoritative visibility fields to PRIVATE and both PASS.

3.12.4 `impact`: a local package can claim PUBLIC without proving what remote users can fetch or which immutable objects the ref names.

3.12.5 `remediation`: define a read-only remote receipt with repository identity, immutable ref, commit/object set, observed PUBLIC visibility, authenticated response, trusted observation time and revocation/supersession policy.

3.12.6 `closureTest`: verify the receipt independently and reject PRIVATE, missing auth, wrong repo/ref/commit, changed object set, stale observation, unreachable required object and local/remote mismatch. This task must not mutate GitHub.

3.12.7 `affectedInheritedFindings=B0V5-IHR-F001,B0V4-HR-F003` only for the broader remote invariant; their exact current `docs/` namespace predicates pass separately with zero credit.

3.12.8 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.13 `B0V7-IHR-F013` — manifest inventory/storage policy lacks uniqueness and total-growth bound

3.13.1 `severity=P1`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-MANIFEST-INVENTORY-AND-STORAGE-POLICY-LACK-UNIQUENESS-AND-TOTAL-GROWTH-BOUND`.

3.13.2 `predicateUnderTest`: package admission requires one exact closed role/path inventory, unique contiguous ordinals/paths/hashes, per-member bound, total-growth projection and no physical predecessor duplication.

3.13.3 `evidence`: current package is `869,680` bytes, unique and has no source-hash intersection. Readers hard-code only a per-member limit and ignore declared policy counters.

3.13.4 `evidence`: hostile case 13 sets the declared maximum to one byte and contradictory counters; case 14 duplicates Subject as member 13. Both Readers PASS.

3.13.5 `impact`: duplicate or unbounded small members can expand repository/package size while preserving local PASS; manifest meaning can contradict execution.

3.13.6 `remediation`: freeze exact roles/cardinality, unique paths/hashes/ordinals, per-member and total-package/repository-growth budgets; require content-addressed references or deterministic reconstruction for durable predecessor bytes.

3.13.7 `closureTest`: reject duplicate role/path/hash/ordinal, ordinal gap/reorder, missing/extra member, manifest-policy contradiction, any member at/above limit, unknown/exceeded total projection and physical source duplication. Prove current no-duplication separately.

3.13.8 `affectedInheritedFindings=B0V5-IHR-F010`; broader storage policy is new and does not revoke the exact v7 package-root recomputation pass.

3.13.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

## 3.14 `B0V7-IHR-F014` — predecessor behavior non-weakening and closure predicates are not re-executed

3.14.1 `severity=P0`; `state=OPEN-BLOCKING`; `noMergeKey=B0V7-PREDECESSOR-BEHAVIOR-NONWEAKENING-AND-CLOSURE-PREDICATES-NOT-REEXECUTED`.

3.14.2 `predicateUnderTest`: successor closure must preserve and execute every exact predecessor behavior/predicate, not merely pin files, line hashes, counters or IDs.

3.14.3 `evidence`: v7 content-addresses predecessor bytes, but Readers do not execute selector composition, 900 atom meanings, 10,727 NamedUses, 36 heads, 94 mutable classes, 127 Outputs or semantic entailment.

3.14.4 `evidence`: CLOSURE vectors accept on matching IDs plus vector-owned `complete=true`. Hostile case 11 disables non-weakening and enables merge/range credit while both Readers PASS.

3.14.5 `impact`: predecessor behavior can be omitted or weakened while identity/cardinality and transport roots remain correct.

3.14.6 `remediation`: define a behavior-level predecessor oracle with exact inputs/outputs/state transitions, map each source Finding one-to-one to one successor control, and execute semantic entailment/no-weakening under both Readers.

3.14.7 `closureTest`: reconstruct every predecessor behavior from frozen sources, execute it and its successor equivalent, reject omitted/weakened/merged/ranged/reordered behavior, source-hash-only evidence and `complete=true` without execution. Preserve exact 38-row IDs separately.

3.14.8 `affectedInheritedFindings=B0V5-IHR-F002,B0V5-IHR-F003,B0V5-IHR-F004,B0V5-IHR-F011,B0V5-IHR-F012,B0V5-IHR-F017,B0V4-HR-F001,B0V4-HR-F002,B0V4-HR-F004,B0V4-HR-F005`.

3.14.9 `authorityCredit=0`; `acceptanceCredit=0`; `closureCredit=0`.

# 4. Inherited denominator and terminal counters

## 4.1 Exact inherited dispositions

4.1.1 The exact `38/38` one-to-one ledger is section 5.1 of the parent Review and is incorporated by repository-relative path and section ID. No source Finding is merged here.

4.1.2 `INDEPENDENT-PLANNING-CLOSURE-PASS=4/38`: `B0V5-IHR-F001`, `B0V5-IHR-F008`, `B0V5-IHR-F010`, `B0V4-HR-F003`.

4.1.3 `OPEN-BLOCKING=34/38`: every other source Finding ID in the frozen 38-row crosswalk.

4.1.4 The preserved closed predecessor `B0V4-HR-F012` remains outside the active denominator and receives no additional credit.

## 4.2 Exact terminal counters

| Counter | Value |
|---|---:|
| New Findings | `14` |
| New open / closed | `14 / 0` |
| New P0 / P1 / P2 / P3 | `10 / 4 / 0 / 0` |
| Active inherited identities | `38/38; exact; non-merged` |
| Active planning-closure pass / open | `4 / 34` |
| Producer QA / packaged Reader parity | `PASS / PASS` |
| Hostile mutations accepted by both Readers | `14/14` |
| Independent review | `REJECT` |
| Authority / Acceptance / closure credit | `0 / 0 / 0` |

4.2.1 `B0=ABSENT`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.

4.2.2 `reviewIsAcceptance=false`; no Finding is self-closed; no Producer/Reader PASS creates authority or Acceptance. A fresh immutable successor and a new independent hostile review are required.
