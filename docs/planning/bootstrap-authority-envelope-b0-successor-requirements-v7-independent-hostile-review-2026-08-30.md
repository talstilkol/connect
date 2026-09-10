# 1. Connect — B0 v7 independent hostile review

## 1.1 Review identity, frozen scope and claim limit

1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-V7-INDEPENDENT-HOSTILE-REVIEW-2026-08-30-G0`.

1.1.2 `artifactClass=DETACHED-INDEPENDENT-HOSTILE-REVIEW;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE`.

1.1.3 Frozen Subject: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-2026-08-30.md`, expected and independently observed SHA-256 `2bc67251748cde019ffeeaf00da80f4f8f8e8d077c36ffee2c1744fab945a7c9`.

1.1.4 Frozen atomic manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-atomic-package-manifest-2026-08-30.json`, expected and independently observed SHA-256 `3492e8a0947a3c16d9a16eb5d064139a1e19109da8d3d64a5e20a9b9f9aa47ac`.

1.1.5 Independently derived `packageContentRoot=f9e634757856863458380ccb27b143086a64d5307b5652e0b5153932252cd098`.

1.1.6 Frozen Producer QA: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-producer-qa-2026-08-30.json`, independently observed SHA-256 `18457d2c8e03d821aa29eeea152e023f9fd43fc21e05e0806958b1f14b548889`.

1.1.7 Companion Findings manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-independent-hostile-review-findings-manifest-2026-08-30.md`.

1.1.8 Detached review tools: `docs/planning/qa/b0-v7-independent-hostile-root-audit.py`, SHA-256 `610db2c4206b91a3fbd4972b7627bd83caf12cd9f06ede388fbbbeb220478f36`; `docs/planning/qa/b0-v7-independent-hostile-review-harness.mjs`, SHA-256 `b16b4d060c9045e3778154e3a7285501ffcd5cea491135a2366c6de98e65d18e`.

1.1.9 The frozen Subject, all 12 manifest members, detached Producer QA and Reader reports, all 31 frozen sources and the predecessor package were read only. Mutations were materialized only under deterministic `/private/tmp/connect-b0-v7-independent-hostile-review-*` trees. No frozen v7 byte, product code, Git, GitHub, provider or deployment state was changed.

1.1.10 Producer QA and packaged Reader PASS were treated as claims under review. Acceptance was derived from independent counterexample execution and not from producer booleans, stored verdicts, stored roots or self-asserted controller labels.

1.1.11 This Review is not Acceptance and grants no authority, closure transfer, implementation credit or Gate credit.

## 1.2 Verdict first

1.2.1 `verdict=REJECT`.

1.2.2 The original package is mechanically reproducible: `12/12` exact members, `16/16` independently recomputed aggregate roots, `8/8` closed-schema roots, `17/17` interface-observation roots, `374/374` vector roots, `2/2` shard roots and `38/38` unique source Finding identities match.

1.2.3 Mechanical reproducibility is not semantic Acceptance. Both packaged Readers return `PASS` for the original package and for all `14/14` transport-consistent hostile packages, including packages with zero declared global conjuncts, collapsed authority controllers, duplicate Recovery acknowledgements, disabled Recovery atomicity, CAS with no declared durable commit writes, reversed interface independence policy, `PRIVATE` top-level visibility and a duplicate manifest member.

1.2.4 New independent Findings: `14`; severity distribution `P0=10`, `P1=4`, `P2=0`, `P3=0`; `OPEN-BLOCKING=14/14`, `CLOSED=0/14`.

1.2.5 The exact inherited denominator remains `38/38`, identity-preserved and non-merged. Independent dispositions are `INDEPENDENT-PLANNING-CLOSURE-PASS=4/38` and `OPEN-BLOCKING=34/38`. No disposition changes the frozen crosswalk; every row retains `authorityCredit=0`, `acceptanceCredit=0` and `closureTransfer=0`.

1.2.6 Producer state remains distinct from Acceptance: `ProducerQA=PASS`; `ReaderA=PASS`; `ReaderB=PASS`; `IndependentReview=REJECT`; `Acceptance=0`; `authorityOutputs=0`; `B0=ABSENT`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.

# 2. Independent mechanical reconstruction

## 2.1 Exact package and source receipt results

| Counter | Independent result |
|---|---:|
| Subject SHA-256 | `2bc67251748cde019ffeeaf00da80f4f8f8e8d077c36ffee2c1744fab945a7c9` |
| Manifest SHA-256 | `3492e8a0947a3c16d9a16eb5d064139a1e19109da8d3d64a5e20a9b9f9aa47ac` |
| Package content root | `f9e634757856863458380ccb27b143086a64d5307b5652e0b5153932252cd098` |
| Required members / unique paths / unique hashes | `12 / 12 / 12` |
| Member hash, byte, regular-file and no-symlink errors | `0` |
| Total package bytes | `869,680` |
| Largest member | `272,356` bytes |
| Frozen source rows / unique paths / unique hashes | `31 / 31 / 31` |
| Frozen source bytes referenced, not copied into v7 | `126,237,333` |
| Source hash, byte, regular-file and no-symlink errors in the original tree | `0` |
| Package/source hash intersections | `0` |
| Aggregate root checks | `16/16` |
| Closed-schema roots | `8/8` |
| Interface observation roots | `17/17` |
| Vector roots / shard roots / shard bindings | `374/374 / 2/2 / 2/2` |
| Closure source IDs / `noMergeKey` cardinality | `38 / 38` |
| `Math.random` / `crypto.randomUUID` occurrences | `0 / 0` |
| Private-key / OpenAI-token / GitHub-token / email-shaped occurrences | `0 / 0 / 0 / 0` |

2.1.1 The independently implemented Python audit produced `auditContentRoot=41853e20e3d8d589524096d92b69a6d7731b89c7841a9f972e2ce80e906bfb75`.

2.1.2 All original package members and all original source paths are regular, non-symlink files today. That observed fact is narrower than a safe Reader contract: section 3 shows that the Readers follow a substituted symlink tree and still return PASS.

2.1.3 v7 does not physically duplicate the `126,237,333` predecessor-source bytes. Its new package is `869,680` bytes and the package/source hash intersection is empty. This exact current property passes; enforcement of future non-duplication and total growth does not.

2.1.4 No fake customer, contact, campaign or business record was found. Planning fixtures contain only protocol IDs, hashes, timestamps and states and are explicitly non-operational/zero-credit.

## 2.2 Original packaged Reader execution

2.2.1 Reader A returned `PASS`, `memberCount=12`, `vectorCount=374`, `positiveVectorCount=122`, `negativeVectorCount=252`, `verificationRoot=d28002a1aba7f94c06e0973bca2d6da2f0ae5213b2af306f8f68d24b122be2b9`.

2.2.2 Reader B returned the same facts and the same verification root.

2.2.3 Both programs write no report file in normal or `--emit-patch` mode; they emit JSON or patch text to stdout. The original run therefore satisfies the narrow fail-before-write/report-path property. Their read paths do not satisfy no-follow or repository containment.

# 3. Hostile mutation campaign

## 3.1 Method and exact outcome

3.1.1 Every mutation was applied to a temporary package tree. Modified package-member hashes, byte lengths, `registryContentRoot`, source-index roots, `packageContentRoot` and `manifestProjectionRoot` were recomputed by the detached harness. The frozen package remained unchanged.

3.1.2 Both packaged Readers accepted every case below. `everyCaseAcceptedByBothPackagedReaders=true`; `caseCount=14`; `resultContentRoot=6efee7dcb0d0a490a1ae5efd4ecd52d76b1d5591e9af466d498bc543d0a2d33e`.

| Case | Semantically relevant mutation | Mutated `packageContentRoot` | A / B |
|---:|---|---|---|
| 1 | Every package/source file reached through a symlink outside the temporary repository root | `f9e634757856863458380ccb27b143086a64d5307b5652e0b5153932252cd098` | PASS / PASS |
| 2 | Detached schema `additionalProperties=true`, `requiredFieldCount=0`, nullable contract changed | `d48fd93aa9bd3081de409c144c4a5028a9c103ba3c4778e52f8cc73afa0ec561` | PASS / PASS |
| 3 | All five authority roles collapsed to one controller and self-appointed | `826a2994154f4739b13ef3a34e3fcc7667ac94791a80f048a241e223b6330b67` | PASS / PASS |
| 4 | CAS crash/response-loss rules disabled and atomic commit declares no writes | `464ff0a9f0418055c64c3cd417081ab6892bd17e092d39e32c35a59d17bab93f` | PASS / PASS |
| 5 | Three Recovery acknowledgements replaced by three copies of MEMBER-A | `51036ff88660bfe59759c9e22f3b073e9b67d421ec421d7d747159226facd39f` | PASS / PASS |
| 6 | Recovery atomicity contract replaced by `NO-ATOMICITY;NO-DURABLE-RECOVERY` | `5ed77f2016ecab0367160b91ae6b0cde2c62011ff90ec1b708ecca36244753dd` | PASS / PASS |
| 7 | Global `predicateIds=[]`, `conjunctCount=0`, separation false and positive-model root zeroed | `4e9950e06972c1f8c782193d4bf87f115244e564b6e0278dc774f93f5046a433` | PASS / PASS |
| 8 | All 17 interface independence policies reversed; expected/future dependencies declared | `a115e3dcfb712bb9b68c3eb3a2d9372e16ae0742afeec62f5c6c1c6c72c67a90` | PASS / PASS |
| 9 | Frozen-source count/coverage/root policy reversed while exact current bytes remain | `60358cd469049ed9c8e50e46a3046bcb4ebaaf652c27d901c60a2e3e78da94aa` | PASS / PASS |
| 10 | Registry and manifest top-level visibility changed to `PRIVATE` | `1f4d72c533cb643d34300c51d9bfaddbb6e65664be189fee882c5567fe883fb4` | PASS / PASS |
| 11 | Predecessor non-weakening disabled; merge/range credit enabled; count zero | `b679949a5dae55bbec51a33433565bd0d2df1c9530458c73534b671bb31ed2da` | PASS / PASS |
| 12 | `noSelfAcceptanceRule` reversed to grant Producer PASS authority/Acceptance | `3c1aa97cb99da70dd04efae9d68428529581953edff01292de3db4567c6dce15` | PASS / PASS |
| 13 | Manifest maximum changed to one byte and policy counters made contradictory | `f9e634757856863458380ccb27b143086a64d5307b5652e0b5153932252cd098` | PASS / PASS |
| 14 | Subject member duplicated as ordinal 13; manifest remains transport-root consistent | `98367ae2d249df351c043b8de5c84356225f16b3b160cbd10d48cfd8d8778f8c` | PASS / PASS |

3.1.3 The cases span every claimed semantic boundary: schema metadata/type closure, interface provenance, appointments/separation, CAS declaration/execution, Recovery quorum/durability, global conjunction, predecessor non-weakening, no-self-credit, source receipts/path containment, PUBLIC state and storage inventory. Field-instance counts inspected were `8` schemas with `47` declared fields, `15` CAS steps with `105` declared step fields, `8` Recovery lifecycle steps with `40` declared step fields, `5` role rows with `25` fields, `17` interfaces with `51` independence-policy fields and `29` global predicates.

3.1.4 The combined decision campaign executed all `374` packaged vectors plus the `14` package-level counterexamples. Packaged denominators include every declared type/operator, all `15` CAS guard mutations, all `17` Recovery read-path mutations, all `29` global fact removals, all `17 × 3` interface cases and all `38 × 2` closure cases. The package defines no closed top-level schema for the registry, manifest, source index, crosswalk, corpus or vector records; therefore no honest “every JSON leaf” denominator exists. The hostile cases cover every omitted semantic field class discovered by independent review, while the absent closed field universe is itself recorded in `B0V7-IHR-F001` and `B0V7-IHR-F013`.

# 4. Semantic hostile analysis

## 4.1 Schema dialect and recursive type closure

4.1.1 All eight stored schema roots recompute, but packaged validation does not recompute schema roots and does not honor `additionalProperties`, `requiredFieldCount` or `nullable`. Case 2 reverses those fields and both Readers still PASS.

4.1.2 Reader A accepts any AST object having string `op` and array `args`; Reader B requires exact keys `op,args`. Reader A uses JavaScript `RegExp(...,'u')`, while Reader B uses Python `re`; the declared phrase “Unicode regular expression” does not close either grammar or cross-runtime semantics. Existing MATCH vectors use only `^[A-Z]+$`.

4.1.3 `NONEMPTY_STRING` accepts an unpaired surrogate even though the declared decoder requires a Unicode scalar. `REPO_RELATIVE_PATH` is a lexical prefix check and not a resolved containment/no-follow decoder.

4.1.4 Finding: `B0V7-IHR-F001`.

## 4.2 Detached Acceptance is self-supplied, not externally admitted

4.2.1 Envelope validation compares `payload.producerAppointmentRoot` to `validationContext.expectedProducerAppointmentRoot` and freshness to another value inside the same envelope. It never resolves either value from an authenticated current Appointment or SecurityUniverse store.

4.2.2 `detachedAcceptance.soleProducerRole=B0V7-ACCEPTANCE-SOLE-PRODUCER`, but the five-role universe contains only `ACCEPTANCE-SOLE-PRODUCER`; the named role has cardinality zero.

4.2.3 CAS does not call envelope validation. It accepts the producer boolean `attempt.envelopeValid=true`.

4.2.4 Finding: `B0V7-IHR-F002`.

## 4.3 Genesis, Appointments, trust and signatures are not executable

4.3.1 Each of the three `planningAdmittedGenesisInstances` is missing all three fields required by its named closed schema and contains five undeclared metadata fields instead.

4.3.2 Controller hashes are hashes of self-declared controller strings, not authenticated Appointment receipts. Case 3 collapses all roles to one controller and self-appointment while both Readers PASS.

4.3.3 A complete raw scan finds zero `signature`, public-key, key-ID, trust-anchor, signed-receipt or trusted-time field in the Subject, registry and Readers. No asymmetric signature is verified. This Review does not choose an algorithm or create a key; it records the missing contract only.

4.3.4 Finding: `B0V7-IHR-F003`.

## 4.4 Permit, trusted time, revocation and replay reduce to producer booleans

4.4.1 The Permit schema declares `permitId`, `subjectRoot`, `replayKey` and `consumed`; none exists in either 15-field CAS attempt. The reducer uses global `permitUsed/replayUsed` booleans, not a keyed ledger.

4.4.2 `commitInstant` is supplied by the attempt, not a trusted-time receipt. `revoked` is supplied by the attempt; no subject membership lookup or signed revocation proof occurs. Revision head starts from hard-coded string `7`.

4.4.3 This cannot establish scoped one-use authorization, revoke-wins ordering or replay resistance across permits/attempts/retries.

4.4.4 Finding: `B0V7-IHR-F004`.

## 4.5 CAS enumerates a shadow reducer, not the declared transaction

4.5.1 The 15 declared steps read 24 paths and write 13 paths, including envelope, appointment head, Permit ledger, pointer, Acceptance and outbox. The executable reducer has a different flat state and replaces schema/authority/envelope with booleans.

4.5.2 Atomic commit increments `outboxCount`; it never stores pointer bytes, Acceptance bytes, effect identity or keyed Permit/replay identities. `responseLossReadback='COMMITTED'` and `outboxExactlyOnce=true` are hard-coded after schedule enumeration.

4.5.3 Crash testing marks an actor terminal before each step and confirms that the unchanged store stayed unchanged. It does not model crash during durable commit, partial persistence, restart/replay or authoritative response-loss readback.

4.5.4 Case 4 reverses the declared crash and response-loss contracts and removes every declared atomic-commit write. Both Readers still PASS because only step IDs and the separate shadow reducer matter.

4.5.5 Finding: `B0V7-IHR-F005`.

## 4.6 Recovery quorum collapses to one controller and one acknowledgement

4.6.1 The inherited predicate requires five controller-separated custodians with a 3-of-5 threshold. The positive store contains only three members and all three use one identical controller root.

4.6.2 Acknowledgement uniqueness is not checked. Case 5 replaces all three acknowledgements with the same MEMBER-A record and both Readers PASS.

4.6.3 Acknowledgements contain no signature/key/epoch receipt. The reducer tests only matching strings. Work-role overlap and five-member cardinality are absent.

4.6.4 Finding: `B0V7-IHR-F006`.

## 4.7 Recovery does not revalidate exact bytes or durably rotate authority

4.7.1 The snapshot contains only `securityHead` and `recoveryHead`; step 7 reruns permissive validity instead of byte-comparing the 17-read snapshot. A semantically still-valid change to members, witnesses or validity can pass without a changed head.

4.7.2 All seven inter-step injections change only `securityHead`; `recoveryHead` and the other 15 read paths are never changed between steps.

4.7.3 Step 8 declares four durable writes, but executable code changes only `attempt.consumed` and `oldAuthorityRevoked`. It never writes a `newAuthorityRoot`, never changes `activeAuthorityRoot`, never advances `recoveryHead`, and never models crash/restart durability.

4.7.4 Case 6 replaces the atomicity rule with no atomicity/no durability and both Readers PASS.

4.7.5 Finding: `B0V7-IHR-F007`.

## 4.8 Global conjunction is a root bag, not an entailed positive trace

4.8.1 `endToEndPositiveTraceRoot` hashes five independently produced roots. There is no event sequence connecting Genesis, Permit, envelope validation, CAS writes, Recovery outputs and the 38 closures, and no shared-state transition is executed.

4.8.2 Global vectors remove one stored semantic-fact key from a copied model and compare it with the expected fact bag. They do not weaken or mutate the underlying component.

4.8.3 `predicateIds`, `conjunctCount`, `mutationRule`, `currentRealStateSeparate`, `planningPositiveModelRoot` and `noSelfAcceptanceRule` are outside the executable global decision. Cases 7 and 12 remove every declared predicate and reverse no-self-credit; both Readers still PASS.

4.8.4 Finding: `B0V7-IHR-F008`.

## 4.9 Interface values are recomputed, but independence/provenance is asserted

4.9.1 The Python producer does independently recompute the 17 actual values from frozen v6 bytes, and this exact improvement over direct expected-root copying passes.

4.9.2 Packaged Readers do not recompute each `actualObservationRoot`, do not validate `sourceSha256`, do not bind row producer to the evidence producer, and do not execute `commonSourceDerivationAllowed`, `frozenBeforeActualProducer`, `futureProviderReadAllowed`, `expectedValueDependency` or `futureProviderDependency`.

4.9.3 Case 8 reverses all 51 interface policy fields and declares direct expected/future-provider dependencies; both Readers still PASS. There is no detached signed producer-execution receipt.

4.9.4 Finding: `B0V7-IHR-F009`.

## 4.10 Reader independence is self-declared and common-mode

4.10.1 Exact Reader bytes, standard-library dependencies and distinct language/runtime strings are rooted. That is mechanical diversity, not independent authorship or execution authority.

4.10.2 Controller and execution-context roots are hashes of assertions emitted in the same producer package. There are no detached signatures, precommit timestamps or sealed independent scanner receipts.

4.10.3 Both implementations are line-for-line semantic translations and share all 14 demonstrated omissions. A two-reader PASS therefore supplies one common-mode vote, not two independent acceptance votes.

4.10.4 Finding: `B0V7-IHR-F010`.

## 4.11 Frozen source receipt and filesystem containment are incomplete

4.11.1 The original 31 source paths and hashes match. The Readers do not recompute `sourceCount`, locator policy, predecessor coverage, source-set root or index root; case 9 reverses these fields and PASS remains.

4.11.2 Reads use current working-directory paths with no `lstat`, `realpath`, no-follow open or repository-root containment. Case 1 serves every package/source member through an escaping symlink tree and both Readers PASS.

4.11.3 There is no frozen offline repository transaction receipt binding commit/ref/object set/mode. The current local files are content-addressed, but admission remains coupled to whatever filesystem answers those paths at read time.

4.11.4 Finding: `B0V7-IHR-F011`.

## 4.12 PUBLIC is a literal, not authenticated remote evidence

4.12.1 Current package literals say PUBLIC and this Review preserves that required state. No authenticated remote URL, immutable ref, observed visibility receipt, write-object-set or signature is packaged.

4.12.2 Readers validate only `registry.currentState.repositoryVisibility`. Case 10 changes registry and manifest top-level visibility to PRIVATE while leaving the nested current-state literal unchanged; both Readers still PASS.

4.12.3 Finding: `B0V7-IHR-F012`.

## 4.13 Manifest/storage policy lacks closed inventory and total-growth budget

4.13.1 Current package size and no-duplication properties pass. The Reader hard-codes 50 MiB per member and ignores the manifest's maximum, largest-member, required-member and every-member counters.

4.13.2 Paths, hashes and ordinals are not required unique/contiguous and the exact 12-role inventory is not closed. Case 14 adds a duplicate Subject member as ordinal 13 and both Readers return PASS with `memberCount=13`.

4.13.3 No total-package or projected-repository-growth budget exists. Sub-50-MiB members can grow without a total bound. Case 13 sets the declared maximum to one byte and contradictory counters; both Readers PASS.

4.13.4 Finding: `B0V7-IHR-F013`.

## 4.14 Predecessor semantic non-weakening is not executed

4.14.1 v7 pins exact predecessor files, but its semantic non-weakening object is six counters/booleans. Neither Reader executes the predecessor selectors, 900 inherited atoms, 10,727 NamedUses, head graph, 127 Output denominator or behavior-level entailment.

4.14.2 Closure vectors accept when source Finding ID, target Requirement ID, target Output ID and a vector-owned `complete=true` match. They do not execute the source predicate or candidate control.

4.14.3 Case 11 sets active identity count to zero, disables exact-byte verification and permits merge/range credit. Both Readers still PASS.

4.14.4 Finding: `B0V7-IHR-F014`.

# 5. One-to-one disposition of all 38 inherited Findings

## 5.1 Exact non-merged ledger

| Ordinal | Source Finding | Independent disposition |
|---:|---|---|
| 1 | `B0V6-IHR-F001` | `OPEN-BLOCKING;B0V7-IHR-F001` |
| 2 | `B0V6-IHR-F002` | `OPEN-BLOCKING;B0V7-IHR-F002` |
| 3 | `B0V6-IHR-F003` | `OPEN-BLOCKING;B0V7-IHR-F009` |
| 4 | `B0V6-IHR-F004` | `OPEN-BLOCKING;B0V7-IHR-F004+F005` |
| 5 | `B0V6-IHR-F005` | `OPEN-BLOCKING;B0V7-IHR-F006+F007` |
| 6 | `B0V6-IHR-F006` | `OPEN-BLOCKING;B0V7-IHR-F008` |
| 7 | `B0V6-IHR-F007` | `OPEN-BLOCKING;B0V7-IHR-F010` |
| 8 | `B0V5-IHR-F001` | `INDEPENDENT-PLANNING-CLOSURE-PASS;EXACT-docs/-NAMESPACE-ONLY;CREDIT-0` |
| 9 | `B0V5-IHR-F002` | `OPEN-BLOCKING;B0V7-IHR-F014` |
| 10 | `B0V5-IHR-F003` | `OPEN-BLOCKING;B0V7-IHR-F014` |
| 11 | `B0V5-IHR-F004` | `OPEN-BLOCKING;B0V7-IHR-F014` |
| 12 | `B0V5-IHR-F005` | `OPEN-BLOCKING;B0V7-IHR-F009` |
| 13 | `B0V5-IHR-F006` | `OPEN-BLOCKING;B0V7-IHR-F001` |
| 14 | `B0V5-IHR-F007` | `OPEN-BLOCKING;B0V7-IHR-F001+F005+F007+F008` |
| 15 | `B0V5-IHR-F008` | `INDEPENDENT-PLANNING-CLOSURE-PASS;FIXTURES-EXPLICITLY-NONOPERATIONAL-ZERO-CREDIT;CREDIT-0` |
| 16 | `B0V5-IHR-F009` | `OPEN-BLOCKING;B0V7-IHR-F004+F005+F006` |
| 17 | `B0V5-IHR-F010` | `INDEPENDENT-PLANNING-CLOSURE-PASS;V7-PACKAGE-ROOT-TARGETS-V7;CREDIT-0` |
| 18 | `B0V5-IHR-F011` | `OPEN-BLOCKING;B0V7-IHR-F014` |
| 19 | `B0V5-IHR-F012` | `OPEN-BLOCKING;B0V7-IHR-F008+F014` |
| 20 | `B0V5-IHR-F013` | `OPEN-BLOCKING;B0V7-IHR-F002+F003` |
| 21 | `B0V5-IHR-F014` | `OPEN-BLOCKING;B0V7-IHR-F003+F006+F010` |
| 22 | `B0V5-IHR-F015` | `OPEN-BLOCKING;B0V7-IHR-F004` |
| 23 | `B0V5-IHR-F016` | `OPEN-BLOCKING;B0V7-IHR-F005` |
| 24 | `B0V5-IHR-F017` | `OPEN-BLOCKING;B0V7-IHR-F003+F014` |
| 25 | `B0V5-IHR-F018` | `OPEN-BLOCKING;B0V7-IHR-F003+F004` |
| 26 | `B0V5-IHR-F019` | `OPEN-BLOCKING;B0V7-IHR-F002` |
| 27 | `B0V5-IHR-F020` | `OPEN-BLOCKING;B0V7-IHR-F006+F007` |
| 28 | `B0V4-HR-F001` | `OPEN-BLOCKING;B0V7-IHR-F011+F014` |
| 29 | `B0V4-HR-F002` | `OPEN-BLOCKING;B0V7-IHR-F014` |
| 30 | `B0V4-HR-F003` | `INDEPENDENT-PLANNING-CLOSURE-PASS;ALL-CURRENT-LOCATORS-RESOLVE;CREDIT-0` |
| 31 | `B0V4-HR-F004` | `OPEN-BLOCKING;B0V7-IHR-F009+F014` |
| 32 | `B0V4-HR-F005` | `OPEN-BLOCKING;B0V7-IHR-F014` |
| 33 | `B0V4-HR-F006` | `OPEN-BLOCKING;B0V7-IHR-F005+F007+F008` |
| 34 | `B0V4-HR-F007` | `OPEN-BLOCKING;B0V7-IHR-F004` |
| 35 | `B0V4-HR-F008` | `OPEN-BLOCKING;B0V7-IHR-F003+F006+F010` |
| 36 | `B0V4-HR-F009` | `OPEN-BLOCKING;B0V7-IHR-F005` |
| 37 | `B0V4-HR-F010` | `OPEN-BLOCKING;B0V7-IHR-F003` |
| 38 | `B0V4-HR-F011` | `OPEN-BLOCKING;B0V7-IHR-F006+F007` |

5.1.1 Each row is independent. No source Finding, `noMergeKey`, Requirement, Output, evidence or credit is merged or transferred.

5.1.2 A planning-closure PASS is limited to the exact predecessor defect named in that row. It is not implementation, operational evidence, authority or Acceptance.

# 6. Terminal counters and safe state

## 6.1 Exact counters

| Counter | Value |
|---|---:|
| New Findings | `14` |
| New open / closed | `14 / 0` |
| New P0 / P1 / P2 / P3 | `10 / 4 / 0 / 0` |
| Active inherited identities | `38/38; exact; non-merged` |
| Active planning-closure pass / open | `4 / 34` |
| Original Producer QA / Reader A / Reader B | `PASS / PASS / PASS` |
| Hostile packages accepted by both packaged Readers | `14/14` |
| Independent Review | `REJECT` |
| Authority / Acceptance credit | `0 / 0` |
| Operational vector executions | `0/374` |

## 6.2 Terminal state

6.2.1 `B0=ABSENT`.

6.2.2 `Gate29=BLOCKED`.

6.2.3 `developmentFreeze=ACTIVE`.

6.2.4 `repositoryVisibility=PUBLIC`; authenticated remote visibility evidence is absent from the frozen package.

6.2.5 `reviewIsAcceptance=false`; `selfAcceptance=0`; `authorityOutputs=0`; `authorityCredit=0`; `acceptanceCredit=0`.

6.2.6 A future immutable successor must close each Finding separately and then undergo a fresh independent hostile review. Producer QA or packaged Reader parity cannot close any row.
