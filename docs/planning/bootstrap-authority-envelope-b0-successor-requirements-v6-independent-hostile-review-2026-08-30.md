# 1. Connect — B0 v6 independent hostile review

## 1.1 Review identity, frozen scope and claim limit

1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-V6-INDEPENDENT-HOSTILE-REVIEW-2026-08-30-G0`.

1.1.2 `artifactClass=DETACHED-INDEPENDENT-HOSTILE-REVIEW;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE`.

1.1.3 Frozen Subject: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-2026-08-30.md`, expected and independently observed SHA-256 `61af4c45d394c952a58346723da408b663acd38522b5c706678a11ad323001c9`.

1.1.4 Frozen atomic manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-atomic-package-manifest-2026-08-30.json`, expected and independently observed SHA-256 `ef6020643d6eccf1b656fd9d6aec845b80cc8b9bd2f81e8d426a2d8d1422a518`.

1.1.5 Independently derived `packageContentRoot=ed00ecb49e5053ca85ff7cccacc7378b36efe5cdb78f1aa6ca00550026372c2f`.

1.1.6 Frozen Producer QA: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-producer-qa-2026-08-30.json`, expected and independently observed SHA-256 `92d3cacf600ec8e1b75c4a6a084e5033381c33b68a092ff810fc831ef63d846c`.

1.1.7 Companion Findings manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-independent-hostile-review-findings-manifest-2026-08-30.md`.

1.1.8 Review boundary: the frozen Subject, all 24 manifest members, both packaged Readers, detached Reader reports, Producer QA and frozen predecessor bytes were read only. No Subject, package, Reader, Producer QA, predecessor, product-code, Git, GitHub or provider byte/state was changed.

1.1.9 Producer QA was treated as a claim under review, not as independent evidence. Counts, hashes, source slices, roots, ordering, uniqueness, graph shape, schema closure and vector semantics were recomputed directly from frozen bytes.

1.1.10 This review is not Acceptance and grants no authority, closure transfer, implementation credit or Gate credit.

## 1.2 Verdict first

1.2.1 `verdict=REJECT`.

1.2.2 The 24-member cryptographic envelope, 31-row identity ledger, 900 inherited atoms, 2,045 source members, 127 Requirements and 16-shard/7,430-vector transport are mechanically reproducible. Semantic execution is not closed: the validator dialect is undefined/inconsistent, one admitted detached instance violates its own closed schema, prior-interface actual values are copied from expected values, CAS and recovery vectors accept shadow reductions rather than the normative transitions, no global positive model exists, and packaged Reader independence is not bound to the actual Reader bytes.

1.2.3 New independent Findings: `7`; severity distribution `P0=6`, `P1=1`, `P2=0`, `P3=0`; `OPEN-BLOCKING=7/7`, `CLOSED=0/7`.

1.2.4 The active inherited denominator remains identity-preserved at `31/31`, with no merge/range credit. Strict predicate dispositions are `INDEPENDENT-PLANNING-CLOSURE-PASS=15/31` and `OPEN-BLOCKING=16/31`. These review dispositions do not mutate the frozen crosswalk and grant `authorityCredit=0`, `acceptanceCredit=0` and `closureTransfer=0`.

1.2.5 The separately preserved predecessor Finding `B0V4-HR-F012` remains `CLOSED-INDEPENDENT-MECHANICAL` and is not part of the active 31-row denominator. Its credit remains zero.

1.2.6 Final state: accepted Requirements `0/127`; implemented Outputs `0/127`; operational vector executions `0/7430`; `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.

# 2. Frozen package and exact denominator verification

## 2.1 Exact 24-member package identity

| Ordinal | Repository-relative member | SHA-256 | Bytes | Result |
|---:|---|---|---:|---|
| 1 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-normative-registry-2026-08-30.json` | `330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4` | 2722820 | MATCH |
| 2 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-2026-08-30.md` | `61af4c45d394c952a58346723da408b663acd38522b5c706678a11ad323001c9` | 171455 | MATCH |
| 3 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-source-member-span-index-2026-08-30.json` | `70185876e137f9981ab3dbcfa942ecdbbf2ce99e0e32750801db4a7a0791e6b5` | 541149 | MATCH |
| 4 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-closure-crosswalk-2026-08-30.json` | `a31533ded7b7f960802a6b83849df44e5dfa15b2fe03313748389c787cc22141` | 24936053 | MATCH |
| 5 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-2026-08-30.json` | `78f95bb843fe70ebb5c0caa3e113c145ead43508444f529317d01aef909da185` | 19808 | MATCH |
| 6 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-01-of-16-2026-08-30.json` | `2ccac7d352fe331da42d9eec3fa945058b1d00b37ec7ca354bd8e3a7bab85175` | 1851835 | MATCH |
| 7 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-02-of-16-2026-08-30.json` | `3396913e6c3cba86d52c48ca1c6450293741e653000a8e9498f916e465f99f3d` | 1941353 | MATCH |
| 8 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-03-of-16-2026-08-30.json` | `2133d801a5a18ea07adea52485d1526ec82098ed9a558344990045a6bb2a1932` | 1865873 | MATCH |
| 9 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-04-of-16-2026-08-30.json` | `e866bf10e74596ef3e73b86420525ba9f86c631e7bc57589f688575f4b852540` | 1856860 | MATCH |
| 10 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-05-of-16-2026-08-30.json` | `9c7c8e355061877f28aa8de6cbe99ae7fd03a8239eb09d25da8c4ef4da469aad` | 1852809 | MATCH |
| 11 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-06-of-16-2026-08-30.json` | `fc797b86196010a3a78ff49390e65609288808e6db8e6208ab0eb0a40bbeed35` | 1948505 | MATCH |
| 12 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-07-of-16-2026-08-30.json` | `ff65d0a929b51125baf8dd743877e30ea187e02fe94cedcb7376351c37d789e4` | 11090782 | MATCH |
| 13 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-08-of-16-2026-08-30.json` | `80689e37e4e82e2b0deac48deb3181329dcbc6cd8cfe159ce254c07e2e03313f` | 20528156 | MATCH |
| 14 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-09-of-16-2026-08-30.json` | `085d0108f727bf4a91a093c2caba52a33519041e463ef565086caebfb67f7aa1` | 3919262 | MATCH |
| 15 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-10-of-16-2026-08-30.json` | `1dc00d7b518b3ebd62c474783275c434da20626abc802753b7ce70737190f53a` | 3342259 | MATCH |
| 16 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-11-of-16-2026-08-30.json` | `11834600f665d8a394aeddcd8dc0e3990097c1bb402f4f9794bd2586f659bbfa` | 5983088 | MATCH |
| 17 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-12-of-16-2026-08-30.json` | `2998df14881dc2e46c632c2edea404bcb73fbafba949e9bc30396be4f9eb6b20` | 2976490 | MATCH |
| 18 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-13-of-16-2026-08-30.json` | `e3f5689dfb7d664f85375235f79b39667a2a6435d128057d230baf28efb7fbdd` | 13209971 | MATCH |
| 19 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-14-of-16-2026-08-30.json` | `ad72a995d18597f4f6cc1da73993b387256ab8dbcb4dd88cad47a1d79b0d7149` | 19525972 | MATCH |
| 20 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-15-of-16-2026-08-30.json` | `34ca65da181220bc54d57cdc31781a30491dc132d3b578e950390e84bb9fff46` | 2152670 | MATCH |
| 21 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-shard-16-of-16-2026-08-30.json` | `dd2d2bcff0875e6726140ec6ead883fada79dcd20125fc6e52951ad316d8ccca` | 3342775 | MATCH |
| 22 | `docs/planning/qa/generate-b0-v6-package.mjs` | `b2b6514bf3583426187ac4a74efa681588cccda2e4eec4d2068149f7fccdbdeb` | 232985 | MATCH |
| 23 | `docs/planning/qa/b0-v6-qa-reader-a.mjs` | `a78c0935a795d0c9ef03bce5e736f66eeabd35c30fa5dd9c5f54d50b9e08955a` | 51737 | MATCH |
| 24 | `docs/planning/qa/b0-v6-qa-reader-b.py` | `2ecc906d14d15f1ffb1d5eaa431b22ec339d5bf005f19033edd43fd0d3328810` | 53165 | MATCH |

2.1.1 The manifest contains exactly `24/24` required rows, ordinals are contiguous `1..24`, path count and unique-path count are both 24, every file is regular/non-symlink, and byte/hash mismatches are zero.

2.1.2 Independent canonicalization of `[ordinal,logicalPath,sha256,bytes,required]`, prefixed by the declared domain and LF, reproduces the stored base64 preimage and root `ed00ecb49e5053ca85ff7cccacc7378b36efe5cdb78f1aa6ca00550026372c2f`.

2.1.3 Largest package member is `24,936,053` bytes and largest vector shard is `20,528,156` bytes; every member is below the frozen exclusive `52,428,800`-byte public-Git limit.

## 2.2 Source members, inherited atoms and Subject

2.2.1 The source index contains `20/20` artifacts and `2,045/2,045` distinct member records. All artifact hashes/byte lengths and all slice hashes/bounds/byte lengths recompute with zero errors. `collapsedSpanCount=0`, `absolutePathCount=0`, and `extraRepositoryPrefixCount=0`.

2.2.2 The crosswalk contains exactly `31/31` active blocker rows. Source Finding IDs, `noMergeKey` values, target Requirement IDs and target Output IDs each have cardinality 31; every mapping has cardinality one and frozen state `OPEN-PENDING-FRESH-INDEPENDENT-HOSTILE-REVIEW`. No range or merged credit exists.

2.2.3 All `900/900` authoritative inherited byte atoms select exact predecessor bytes and reproduce artifact, member and atom hashes. The semantic extraction denominator is `900/900`; the active semantic graph has `10,727` unique NamedUses and zero declared unclassified tokens.

2.2.4 The Subject parses to exactly `127` unique Requirements, contiguous `B0V6REQ-000..126`, and exactly `635` five-field rows.

## 2.3 Authority, selectors and non-weakening

2.3.1 The Genesis Authority graph contains `35` unique nodes and `66` edges. Independent traversal finds zero dangling edges, zero self-edges and zero cycles. The only indegree-zero authority source is the typed external pre-B0 node; its operational root and the first operational GenesisPermit root are null, so this shape grants no current authority.

2.3.2 The closed role universe contains `21` roles and all 21 planning Appointment controller roots are distinct. Current operational authority remains absent.

2.3.3 The inherited selector reducer contains `128` exact occurrences over `119` fields. Independent interval comparison reproduces exactly `10` overlap pairs. All 119 stored forward/reverse order projections converge to one root.

2.3.4 All `10/10` predecessor non-weakening rows retain exact prefix/suffix hashes, contain every mandatory before-state safety intent in the after state, and carry `nonWeakeningDecision=true`. This is planning evidence only.

## 2.4 Vector corpus and expected-result separation

2.4.1 The 16 shard descriptors cover contiguous ordinals `1..7430`; every shard byte/hash/content root and descriptor binding matches. Vector IDs, fixture IDs and domain unique-credit keys have exact unique cardinalities `7,430`, `7,430` and `6,795`.

2.4.2 Exact counts are `635` base five-field vectors plus `6,795` domain vectors equals `7,430`. Complete fixture/vector sequence roots and the shard-set root recompute.

2.4.3 Both packaged Readers execute all stored vectors and independently report `7,430/7,430` local control/mutation pairs. Review of both Reader sources finds no read of `planningObserved`, `expectedControlDecision`, `expectedMutationDecision`, `expectedDecision` or stored `reasonCode`. The two corpus occurrences of `/planningObserved` are negative read-set mutations and are rejected. No stored verdict is used as the direct oracle for the 7,430 vector decisions.

2.4.4 This expected-result separation passes for the portable vector loop. It does not cure `B0V6-IHR-F003`, where the producer assigns prior-interface `actual*Root` values directly from `expected*Root` before vector execution.

## 2.5 Public-safe locators and secret-shaped data

2.5.1 All 24 manifest locators and all 20 source-index locators begin `docs/`; none begins `web/` or `/`, contains traversal, or requires repository-prefix inference.

2.5.2 A raw-byte scan of all 24 package members finds zero local-home absolute-path markers, file-scheme locators, private-key headers, common OpenAI/GitHub/AWS token shapes, or symlink members. This bounded pattern scan is not a general proof that arbitrary prose can never contain sensitive information; it is the exact public-safety check performed here.

# 3. One-to-one disposition of all 31 active inherited Findings

## 3.1 Exact non-merged ledger

| Ordinal | Source Finding | Exact independent result | Disposition |
|---:|---|---|---|
| 1 | `B0V5-IHR-F001` | All live locators resolve from the repository root with no `web/` rewrite. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 2 | `B0V5-IHR-F002` | `128` selectors, `10` overlaps and all deterministic order projections converge. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 3 | `B0V5-IHR-F003` | All 10 byte reducers retain exact prefix/suffix and mandatory intents. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 4 | `B0V5-IHR-F004` | `900` exact atoms yield `10,727` unique active NamedUses with full byte segmentation. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 5 | `B0V5-IHR-F005` | All 17 positive interface records copy `expected*Root` into `actual*Root`; provider roots are null. | `OPEN-BLOCKING;B0V6-IHR-F003` |
| 6 | `B0V5-IHR-F006` | Rooted portable vector AST is present and stored verdicts are not read by the vector loop. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 7 | `B0V5-IHR-F007` | Counts are complete, but CAS/recovery/schema vectors execute shadow predicates and no global positive model exists. | `OPEN-BLOCKING;B0V6-IHR-F001+F004+F005+F006` |
| 8 | `B0V5-IHR-F008` | All fixtures are explicitly rooted planning/non-operational fixtures and grant zero credit. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 9 | `B0V5-IHR-F009` | Control and mutation decisions derive from mutated domain state, not asserted verdict fields. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 10 | `B0V5-IHR-F010` | Package-root vectors bind the exact v5 package preimage/domain and reject participating-field mutations. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 11 | `B0V5-IHR-F011` | All 36 v6 heads have exact typed invalidation predicates; no v4-head literal remains. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 12 | `B0V5-IHR-F012` | Acceptance denominator is exactly all 127 ordered Outputs; omission/duplicate/reorder/null matrices are present. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 13 | `B0V5-IHR-F013` | All 12 Acceptance producer roles are inside the 21-role/210-pair universe and 156 fields have sole producers. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 14 | `B0V5-IHR-F014` | Nine planning profiles exist, but no profile is operational and actual Reader bytes are not bound to their independence roots. | `OPEN-BLOCKING;B0V6-IHR-F007` |
| 15 | `B0V5-IHR-F015` | Permit field records are typed, but their validator dialect/type semantics are not closed or executed end to end. | `OPEN-BLOCKING;B0V6-IHR-F001+F006` |
| 16 | `B0V5-IHR-F016` | Fifteen transaction operations exist, but the accepted schedule reducer permits commits without required phases. | `OPEN-BLOCKING;B0V6-IHR-F004+F006` |
| 17 | `B0V5-IHR-F017` | Thirty-three class-specific records exist, but their named validation language is not defined by the rooted oracle. | `OPEN-BLOCKING;B0V6-IHR-F001+F006` |
| 18 | `B0V5-IHR-F018` | Graph shape is acyclic, but external admission/first-Permit validation has an undefined operator dialect and no positive trace. | `OPEN-BLOCKING;B0V6-IHR-F001+F006` |
| 19 | `B0V5-IHR-F019` | Detached schema exists, but its admitted instance violates `unknownFieldPolicy=BLOCK` and relies on undeclared fields. | `OPEN-BLOCKING;B0V6-IHR-F002` |
| 20 | `B0V5-IHR-F020` | Typed records exist, but the vector reducer is disconnected from the lifecycle state machine and freshness guards. | `OPEN-BLOCKING;B0V6-IHR-F005+F006` |
| 21 | `B0V4-HR-F001` | `2,045/2,045` exact source-member spans verify; collapsed spans are zero. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 22 | `B0V4-HR-F002` | Exact selectors and typed non-weakening reduction pass, including all 10 overlaps. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 23 | `B0V4-HR-F003` | All current public locators resolve as repository-relative `docs/` paths. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 24 | `B0V4-HR-F004` | NamedUse extraction passes, but prior-interface provider-independent instances remain contaminated by expected values. | `OPEN-BLOCKING;B0V6-IHR-F003` |
| 25 | `B0V4-HR-F005` | `94` mutable objects have continuous two-edge, non-self membership paths to one SecurityUniverse head. | `INDEPENDENT-PLANNING-CLOSURE-PASS;CREDIT-0` |
| 26 | `B0V4-HR-F006` | Portable vectors are rooted, but domain coverage is non-isomorphic to normative validators and lacks a global positive model. | `OPEN-BLOCKING;B0V6-IHR-F001+F004+F005+F006` |
| 27 | `B0V4-HR-F007` | Typed Permit/head rows exist; the closed validator/type and positive-success semantics do not. | `OPEN-BLOCKING;B0V6-IHR-F001+F006` |
| 28 | `B0V4-HR-F008` | Role denominators exist, but actual Reader/proof independence and operational profiles are not established. | `OPEN-BLOCKING;B0V6-IHR-F007` |
| 29 | `B0V4-HR-F009` | CAS fields/operations exist; the schedule reducer accepts phaseless commits and does not execute the 15-step state transition. | `OPEN-BLOCKING;B0V6-IHR-F004+F006` |
| 30 | `B0V4-HR-F010` | Genesis/detached records exist, but validator-language, detached-schema and positive-model defects remain. | `OPEN-BLOCKING;B0V6-IHR-F001+F002+F006` |
| 31 | `B0V4-HR-F011` | Recovery records exist, but lifecycle/currentness/atomic-validation semantics remain unexecuted. | `OPEN-BLOCKING;B0V6-IHR-F005+F006` |

3.1.1 The 31 rows above are separate. No disposition, evidence or credit is transferred across a source Finding ID or a `noMergeKey`.

3.1.2 A planning-closure pass means only that the exact predecessor defect's frozen planning predicate was independently reproduced. It is not implementation, operational evidence, Acceptance or authority.

# 4. Semantic hostile analysis

## 4.1 Validator language and typed-field closure

4.1.1 The registry roots one language named `B0V6-PORTABLE-ORACLE-AST-V1`, but `69` normative validation/invalidation programs name `B0V6-ORACLE-AST-V1`. No language definition or language root for that second identifier exists.

4.1.2 The undefined dialect contains `11` `UNIQUE-COUNT` operations, while the rooted constraint language and both Readers implement `UNIQUE_COUNT`. Unknown operators are required to block.

4.1.3 All `156` Acceptance field validation predicates use `TYPE`; `TYPE` is absent from the rooted `constraintAstSemantics` and from both Readers' constraint evaluators. The Readers' separate `isTypedValue` function falls through to “non-null” for `83/156` Acceptance types, including `MONOTONIC-U64`, trusted-time, head tuples, closed Act IDs and opaque references.

4.1.4 None of the 560 `TYPED_FIELD_VALID` vectors targets the 156 Acceptance fields. Their mutation distribution is 558 nulls and two strings across Permit, Genesis, detached and recovery families. Therefore a wrong non-null Acceptance value can evade the packaged type checks. See `B0V6-IHR-F001`.

## 4.2 Detached Acceptance contradiction

4.2.1 `detachedAcceptanceSchema.fields` declares 12 names and `unknownFieldPolicy=BLOCK`. Its admitted instance has five additional keys: `schemaRoot`, `instanceRoot`, `operational`, `expectedProducerAppointmentRoot` and `currentSecurityUniverseTupleRoot`.

4.2.2 The validation AST explicitly reads the two undeclared comparator fields. Removing them makes validation encounter missing paths; retaining them violates the unknown-field policy. Both packaged Readers check only roots/null operational state and never execute this schema or its unknown-field rule.

4.2.3 The 24 detached-field vectors mutate one declared field to null at a time. No vector validates the full instance, unknown-key rejection or the impossible declared-field/comparator combination. See `B0V6-IHR-F002`.

## 4.3 Expected-to-actual contamination in prior interfaces

4.3.1 All `17/17` prior-interface records have `actualInputRoot == expectedInputRoot`, `actualOutputRoot == expectedOutputRoot`, and `providerInstanceRoot=null`.

4.3.2 The frozen generator constructs each expected root and then assigns `actualInputRoot: expectedInputRoot` and `actualOutputRoot: expectedOutputRoot`. The validation receipt is derived from that producer-built self-equality. Interface vectors only disturb one side after this copy.

4.3.3 Consequently no detached provider-independent observation supplies either “actual” root, and the cycle-breaking interface can pass by construction. See `B0V6-IHR-F003`.

## 4.4 CAS and response-loss semantics

4.4.1 The normative transaction contains 15 typed operations, but the vector runner never executes that transition. It evaluates aggregate eligibility booleans, a response-loss classifier and a separate `reduceCasSchedule` helper.

4.4.2 The reducer requires only contiguous ordinals, two actors, one `COMMIT`, and a loser ending `BLOCK` or `CRASH-PRECOMMIT`. It does not require the winner to compare, reserve, validate, advance the fence or consume the Permit before commit.

4.4.3 Frozen eligible classes 03 and 04 begin with the winner's `COMMIT` and contain no winner compare/reserve; classes 05 and 06 have reserve/commit but no winner compare. A two-event trace `[W1 COMMIT, W2 BLOCK]` is therefore accepted by both reducer implementations although it cannot be a legal execution of operations 1..15.

4.4.4 The response-loss state `RESERVED-NOT-COMMITTED` also conflicts with the declared atomic private-write semantics: reservation is operation 7, all writes 1..14 are private, every precommit crash has zero durable effects, and operation 15 publishes all writes atomically. No reachable trace from that transaction produces a durable reservation without finalization/outbox. See `B0V6-IHR-F004`.

## 4.5 Recovery lifecycle semantics

4.5.1 The stored recovery vector family evaluates an 11-field flat surrogate. The normative lifecycle reads `/attempt/*`, `/context/*` and `/store/*`; zero of the 11 mutation-matrix JSON pointers exactly matches a lifecycle read pointer.

4.5.2 Material guards `allMembersCurrent`, `allMembersWithinValidity` and `compromiseBeforeCommitAtEquality` appear in the surrogate and mutation matrix but are absent from every lifecycle precondition. The vector can reject these mutations while the normative lifecycle remains unchanged.

4.5.3 Lifecycle steps 1..3 validate time/revision, controller separation and challenge/threshold outside the declared atomic boundary `steps 4..7`. The transaction does not re-CAS the validated member/witness currentness, validity or controller heads. State can change after validation and before reservation/revocation.

4.5.4 The Readers check record counts, distinct planning controllers and transition shape, not an executed valid trace or the mutation-to-lifecycle path correspondence. See `B0V6-IHR-F005`.

## 4.6 Positive-model satisfiability versus the current blocked state

4.6.1 The current blocked model is honest and safe: every operational foundation, Permit, profile, detached Acceptance, recovery attempt and Acceptance root is null/zero, and operational execution is `0/7430`.

4.6.2 The corpus supplies 7,430 independent local positive-control/negative-mutation pairs. It supplies no one canonical global state or trace that simultaneously satisfies Genesis, authority, roles, Permit, CAS, recovery, all 156 Acceptance fields, all 127 Outputs and all freshness/invalidation predicates.

4.6.3 A set of local controls is not a satisfiability witness: their roots, contexts and state shapes differ, and the detached/CAS/recovery contradictions above are never composed. Thus the design can demonstrate “everything blocks when locally mutated” without demonstrating one legal success path. See `B0V6-IHR-F006`.

## 4.7 Actual Reader independence

4.7.1 Reader A and Reader B are distinct Node/Python source files with distinct hashes and no imports of the generator or one another. Both execute the same 93 named check classes and report 34,931 invocations.

4.7.2 Their independence declarations prove only non-import/non-execution. The nine `independenceProfileRegistry` rows are planning-only opaque roots with `operationalCurrentProfileCount=0`; none binds Reader A hash `a78c0935a795d0c9ef03bce5e736f66eeabd35c30fa5dd9c5f54d50b9e08955a` or Reader B hash `2ecc906d14d15f1ffb1d5eaa431b22ec339d5bf005f19033edd43fd0d3328810` to implementation, dependency, runtime, author/controller, execution-context or disclosure receipts.

4.7.3 Both Readers share the same material omissions: neither executes the detached schema, neither supports the normative `TYPE`/`UNIQUE-COUNT` dialect, both accept the same phaseless CAS schedules, and both structurally accept recovery. Matching PASS results therefore do not establish common-mode independence. See `B0V6-IHR-F007`.

# 5. Exact counters and immutable terminal state

## 5.1 Review counters

| Counter | Independent result |
|---|---:|
| Frozen package members | `24/24 MATCH` |
| Active source Findings | `31/31 identity-preserved; no merge` |
| Independent planning-closure predicate passes | `15/31` |
| Active source Findings still open | `16/31` |
| Source artifacts / members | `20 / 2,045` |
| Exact inherited byte atoms | `900/900` |
| Active NamedUses | `10,727` |
| Subject Requirements / fields | `127 / 635` |
| Outputs materialized as planning artifacts | `127/127` |
| Vector shards / fixtures / vectors | `16 / 7,430 / 7,430` |
| Base / domain vectors | `635 / 6,795` |
| Operational vector executions | `0/7,430` |
| New Findings | `7` |
| New P0 / P1 / P2 / P3 | `6 / 1 / 0 / 0` |
| New open / closed | `7 / 0` |
| Authority / Acceptance credit | `0 / 0` |

## 5.2 Terminal state

5.2.1 `B0=ABSENT`.

5.2.2 `Gate29=BLOCKED` and `ControlSequenceAcceptance=BLOCKED`.

5.2.3 `developmentFreeze=ACTIVE`.

5.2.4 `repositoryVisibility=PUBLIC`.

5.2.5 `reviewIsAcceptance=false`; `selfAcceptance=0`; `authorityCredit=0`; `acceptanceCredit=0`.
