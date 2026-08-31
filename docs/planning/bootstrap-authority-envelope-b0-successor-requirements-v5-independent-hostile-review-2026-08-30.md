# 1. Connect — B0 v5 independent hostile review

## 1.1 Review identity, scope and claim limit

1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-V5-INDEPENDENT-HOSTILE-REVIEW-2026-08-30-G0`.

1.1.2 `artifactClass=DETACHED-INDEPENDENT-HOSTILE-REVIEW;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE`.

1.1.3 Frozen Subject: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-2026-08-30.md`, SHA-256 `bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92`.

1.1.4 Frozen atomic manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-atomic-package-manifest-2026-08-30.json`, SHA-256 `5a054f5d4a482a0e74a9146dd3aeee865a5f28ee245d76784dbaa03ed3a118c4`.

1.1.5 Declared `packageContentRoot=666e121d998445e3134f3a1978ee9b7c5962324bd51376e2ebc5bf2646d689f8`.

1.1.6 Companion non-merged Findings manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-independent-hostile-review-findings-manifest-2026-08-30.md`.

1.1.7 Review boundary: only the frozen B0 v5 eight-member package and the frozen source bytes it names were read. The Subject, package members, code, Git state, GitHub state and providers were not changed.

1.1.8 Independence rule: Producer QA and packaged Reader A/Reader B results were not used as evidence. All reported counts, hashes, byte slices, roots, path resolution, graph properties and mutations were recomputed directly with review-local Node.js and Python standard-library implementations.

1.1.9 This review is evidence, not authority. It cannot instantiate L0 authority, a Genesis foundation, a Permit, an Acceptance envelope, an Acceptance pointer, operational vector receipts or Gate 29.

## 1.2 Verdict first

1.2.1 `verdict=REJECT`.

1.2.2 The package's cryptographic envelope is internally reproducible, but the package is not semantically executable or portable from the actual public Git root. Exact physical preservation does not cure the unresolved authority, Acceptance, witness, Permit, CAS, Genesis, recovery and causal-proof defects.

1.2.3 New independent Findings: `20`; severity distribution `P0=18`, `P1=2`, `P2=0`, `P3=0`; `OPEN-BLOCKING=20`, `CLOSED=0/20`.

1.2.4 Inherited v4 hostile Findings remain identity-preserved at `12/12`. Strict independent disposition is `OPEN-BLOCKING=11`, `CLOSED-INDEPENDENT-MECHANICAL=1/12`. Only `B0V4-HR-F012` closes, and that closure grants `authorityCredit=0` and `acceptanceCredit=0`.

1.2.5 Final state: `authorityCredit=0`; `acceptanceCredit=0`; accepted Requirements `0/96`; implemented Outputs `0/96`; operational vector executions `0/288`; `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.

# 2. Frozen-package identity and mechanical verification

## 2.1 Exact eight-member identity

| Ordinal | Actual repository-relative member | SHA-256 | Bytes | Independent byte result |
|---:|---|---|---:|---|
| 1 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-normative-registry-2026-08-30.json` | `6c5f9be8d61b684e3239fb30696e480dbc8138600bddd77d51c396c553bc97fc` | 393514 | MATCH |
| 2 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-2026-08-30.md` | `bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92` | 167079 | MATCH |
| 3 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-source-member-span-index-2026-08-30.json` | `41204bbabfd32521f5ce13fbe8321099fb59e9881a9de64e5d1fcdab9aedb325` | 2511616 | MATCH |
| 4 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-closure-crosswalk-2026-08-30.json` | `89e8846ad28e4b157fd638eef56ebc72a02ab63e2b94e63608ee83be291e3b31` | 3084549 | MATCH |
| 5 | `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-executable-vector-corpus-2026-08-30.json` | `4bb7f44bc175b93fb8f616f75455a55cadd96c002db175857d53229bc6afd7e6` | 3213227 | MATCH |
| 6 | `docs/planning/qa/generate-b0-v5-package.mjs` | `65faf5dc2b2d3ea31ec4b8721b4e5bc1286f5f2cf39e4e67550cff0d75c7c261` | 111356 | MATCH |
| 7 | `docs/planning/qa/b0-v5-qa-reader-a.mjs` | `e30410def5c1b79e8b49ca3c85bbfed3ee8579c223769fbc34da9f6c5781e21b` | 25215 | MATCH |
| 8 | `docs/planning/qa/b0-v5-qa-reader-b.py` | `ce52df9d637cf27b52848c8586b3ede55d92acd5b4548b3a8c7fab140d20214b` | 26255 | MATCH |

2.1.1 The manifest has exactly eight rows, ordinals are contiguous `1..8`, paths are unique as stored, and every row is `required=true`.

2.1.2 The stored base64 preimage decodes byte-for-byte to `UTF8(domain) || 0x0A || canonical-json(projection)` using exactly `[ordinal,logicalPath,sha256,bytes,required]`.

2.1.3 Independent Node.js and Python canonicalizers both derive `666e121d998445e3134f3a1978ee9b7c5962324bd51376e2ebc5bf2646d689f8`. Both reject unchanged-root claims after member reorder, path change, omission, byte-count change, duplicate ordinal, member-hash change and domain change.

2.1.4 This proves the stored root formula. It does not prove that the stored paths resolve. From the actual public Git root, `0/8` stored manifest paths and `0/22` stored source-index artifact paths exist. All resolve only after an undocumented removal of one extra leading `web/` segment. That is Finding `B0V5-IHR-F001`.

## 2.2 Source-member index and exact inherited bytes

2.2.1 The source index declares and contains `22/22` artifacts and `7973/7973` member records.

2.2.2 After applying the undocumented prefix removal only for forensic byte access, every one of the 22 artifact byte counts, line counts and SHA-256 values matches; all 7,973 spans have valid bounds, exact byte length and exact SHA-256; duplicate locator count is `0`; one-byte span count is `0`.

2.2.3 The imported Requirement/Finding identity population contains `394` full members and has minimum length `569` bytes. The v4 heading-marker collapse is therefore materially removed, but the full two-parser/negative-vector closure predicate is not satisfied by this review.

2.2.4 The inherited v4 crosswalk has exactly `84` contiguous source Requirements and `420` five-field records. For all `420/420`, the selected raw bytes equal `exactOldValue`, decoded base64 equals those bytes, field SHA-256 matches, and the domain-separated five-field root recomputes. Error count is `0`.

2.2.5 The v5 Subject independently parses to `96` contiguous Requirements and `480` five-field values. The crosswalk values and v5 five-field roots match the frozen Subject.

2.2.6 The inherited source-basis population has `373/373` alias/root/locator references. Their hashes, locators and byte spans resolve in the indexed universe after the same undocumented prefix removal. The 27 original `§2.1..§2.27` references are now explicitly present, but strict public-root portability remains failed.

## 2.3 Exact non-merged v4 Finding identity

2.3.1 The crosswalk contains `12/12` closure rows with unique source Finding IDs, unique `noMergeKey` values, unique target Requirements, unique target Outputs and unique replacement IDs.

2.3.2 Every source-Finding span selects the exact frozen bytes in `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v4-independent-hostile-review-findings-manifest-2026-08-30.md`; all 12 byte lengths and member SHA-256 values match.

2.3.3 The exact mapping is ordinal: `B0V4-HR-F001..012` to `B0V5REQ-000..011`, `B0V5OUT-000..011` and `B0V5-FIX-001..012`. No inherited Finding is merged in this review.

# 3. Exact disposition of all 12 inherited hostile Findings

## 3.1 Identity-preserving disposition ledger

| Source Finding | Severity | Exact `noMergeKey` | Independent evidence and closure-test result | Disposition |
|---|---|---|---|---|
| `B0V4-HR-F001` | P0 | `B0V4-SOURCE-MEMBER-SPAN-IDENTITY-COLLAPSE` | `7973/7973` indexed spans validate and no span is one byte; however the required two independent boundary reconstructions and complete body-substitution/cross-ID negative suite are not present as detached evidence. | `OPEN-BLOCKING;MECHANICAL-DELTA-PASS;NO-CLOSURE-CREDIT` |
| `B0V4-HR-F002` | P0 | `B0V4-TYPED-SUPERSESSION-NONLITERAL-UNRESOLVED` | All `10/10` exact old atoms are literal, unique and hash-valid, but 128 inherited selectors contain 10 overlap pairs and there is no executable before/after, confluence or non-weakening predicate. | `OPEN-BLOCKING` |
| `B0V4-HR-F003` | P1 | `B0V4-PRESERVED-B0V1-SOURCE-LOCATORS-UNRESOLVED` | All `27/27` original section locators exist in the index; strict clean resolution from the public Git root is `0/22` artifacts because the stored path namespace is wrong. | `OPEN-BLOCKING;LOCATOR-DELTA-PASS;PORTABILITY-FAIL` |
| `B0V4-HR-F004` | P0 | `B0V4-NAMEDUSE-SEMANTIC-UNIVERSE-AND-INTERFACE-INSTANCES-ABSENT` | Explicit wrapper markers produce `3471` NamedUses and 17 interfaces, but active inherited machine-semantic bytes are outside extraction and all 17 interface predicates are identical label lists without actual provider result instances. | `OPEN-BLOCKING` |
| `B0V4-HR-F005` | P0 | `B0V4-MUTABLE-HEAD-MEMBERSHIP-SELF-CYCLES` | `94/94` object classes and `36/36` heads have exact two-edge, continuous, non-self paths to SecurityUniverse; independent Node.js and Python shape/DAG checks pass. The full required mutation set and head-advance/current-receipt proof are absent. | `OPEN-BLOCKING;MECHANICAL-GRAPH-DELTA-PASS` |
| `B0V4-HR-F006` | P0 | `B0V4-VECTOR-PROGRAMS-SCENARIO-VACUOUS-NO-CAUSAL-ORACLE` | `288/288` fixture bytes and stored roots are mechanically consistent, but the corpus does not carry portable oracle bodies, the causal meta-oracle reads stored verdict labels, coverage is incomplete, and operational evidence is `0/288`. | `OPEN-BLOCKING` |
| `B0V4-HR-F007` | P0 | `B0V4-PERMIT-REVISION-FENCE-TIME-REPLAY-FIELDS-NOT-CLOSED` | Acceptance has 156 field rows and three Permit field-name lists, but Permit fields have no per-field type/cardinality/equality/invalidation rules, 107 Acceptance invalidations name v4 heads, and relevant vector state is placeholder-only. | `OPEN-BLOCKING` |
| `B0V4-HR-F008` | P0 | `B0V4-TWO-WITNESS-AND-PROOF-CLASS-INDEPENDENCE-DENOMINATORS-ABSENT` | Two witness field families and nine profile schemas exist, but four producer classes are outside the role universe, witness/ledger/work-role exclusions are incomplete, and all nine current profile instance roots are null. | `OPEN-BLOCKING` |
| `B0V4-HR-F009` | P0 | `B0V4-ACCEPTANCE-CAS-EXPECTED-POINTER-FENCE-ATTEMPT-COMPARES-ABSENT` | Fifteen ordered labels mention the required compares, reserve, consume, pointer and receipt actions, but no rooted executable transition, interleaving or crash program exists; the CAS vector omits the 36 heads and exact Permit/revocation transition state. | `OPEN-BLOCKING` |
| `B0V4-HR-F010` | P0 | `B0V4-GENESIS-FOUNDATION-LABELS-NOT-CLOSED-CAUSAL-SCHEMAS` | `33/33` slots and slot roots exist, but all 33 share one generic nine-name field list and no class-specific validation or typed acyclic Authority bootstrap graph is supplied. Foundation and first-Permit receipts are null. | `OPEN-BLOCKING` |
| `B0V4-HR-F011` | P1 | `B0V4-RECOVERY-MEMBER-SCHEMA-AND-AUTHORITYOWNER-SEPARATION-GAP` | AuthorityOwner now appears in the exclusion list and the denominator is five members plus two witnesses, but records are field-name arrays without field types or rooted admitted instances, and the negative schedule is incomplete. | `OPEN-BLOCKING;AUTHORITYOWNER-DELTA-PASS` |
| `B0V4-HR-F012` | P2 | `B0V4-PACKAGE-CONTENT-ROOT-DERIVATION-UNSPECIFIED` | The domain, algorithm, canonical projection and preimage are frozen. Independent Node.js and Python implementations derive the exact declared root and reject seven mutation classes. | `CLOSED-INDEPENDENT-MECHANICAL;AUTHORITY-CREDIT-0;ACCEPTANCE-CREDIT-0` |

3.1.1 Closure is not transferable. In particular, the new path Finding does not reopen or substitute for the independently closed root-formula Finding, and the valid head shape does not close vector, CAS or current-state requirements.

# 4. Semantic executability audit

## 4.1 Authority bootstrap and Genesis

4.1.1 The registry freezes 33 Genesis slot identifiers and 33 slot-schema roots, but all slots use the same nine generic field names. A time profile, algorithm member set, store capability receipt, witness appointment and validator profile therefore lack class-specific type and validation semantics.

4.1.2 The external ceremony is a 13-name list plus prose rules. The first-Permit transaction is one semicolon-delimited string. There is no rooted transition program that proves every prerequisite preexists B0, no typed Authority-edge graph, and no causal reduction from external L0 inputs to one first Permit.

4.1.3 `CREATE-DETACHED-ACCEPTANCE-ARTIFACT` is an allowed Genesis Act, while no detached Acceptance artifact schema, identity construction, producer, validation predicate, lifecycle or receipt exists in the normative registry. Active inherited bytes require that artifact class.

4.1.4 Result: Genesis is not executable and cannot bootstrap authority. See `B0V5-IHR-F017..019`.

## 4.2 Recovery

4.2.1 Recovery cardinalities are explicit: threshold `3`, members `5`, witnesses `2`, and all eight work roles are named in exclusions.

4.2.2 Member, witness and attempt schemas are arrays of field-name strings with no field types, domain roots, exact equality predicates or admitted instances. The vector tests only AuthorityOwner overlap, below-threshold and replay; it does not test witness/custodian overlap, alias-equivalent controllers, mixed challenges, expiry, dual-current profiles or equal-revision compromise.

4.2.3 Result: recovery remains a planning label schema, not an executable recovery protocol. See `B0V5-IHR-F020`.

## 4.3 Sole producers, roles and two-witness independence

4.3.1 Each Acceptance field contains one producer string, and the output mapping is one Requirement to one Output. Mechanical uniqueness passes.

4.3.2 The closed role universe contains eight roles and 28 prohibited pairs, but Acceptance producers additionally include `Witness1`, `Witness2`, `WitnessQuorum` and `EvidenceLedgerWriter`. Those four are absent from the universe and pair matrix.

4.3.3 The two-witness rule requires only witness-to-witness controller inequality and the same checkpoint. It does not itself prohibit either witness from being the ledger writer or a work-role controller. The nine IndependenceProfile records are schemas with null `currentInstanceRoot`, not transitive-dependency evidence.

4.3.4 Result: sole-producer and two-witness independence cannot be decided from the closed role graph. See `B0V5-IHR-F013..014`.

## 4.4 NamedUses and prior interfaces

4.4.1 The explicit marker graph is mechanically coherent: `3471/3471` NamedUses, `2741/2741` build edges, 17 consume edges, 17 implement edges, 288 vector edges, 84 preservation edges, 96 output edges, 12 address edges, 12 no-merge edges and 192 citation edges. `unclassifiedMarkerUses=[]`; build edges are backward-only and acyclic.

4.4.2 The extractor reads only the five wrapper fields of each v5 Requirement. It does not classify the exact inherited bytes that the wrapper declares active. Concrete active tokens absent as exact NamedUse targets include `GenesisPermit` (`5` active occurrences), `AuthorityRevision` (`7`), `CommitReceipt` (`1`), `AcceptancePointer` (`1`), `IndependenceProfile` (`2`), `L0TrustAnchorAdmission` (`1`) and `TrustedTimeDecision` (`1`).

4.4.3 All 17 interfaces have roots, but all use the same five label checks. They contain no actual/current provider output or validation-receipt value. Their input/output roots authenticate promised schemas rather than an independently produced instance.

4.4.4 Result: syntactic marker closure is not semantic-use closure, and the claimed cycle breaks are not executable prior interfaces. See `B0V5-IHR-F004..005`.

## 4.5 Supersession and non-weakening

4.5.1 All ten registry supersessions select exact source bytes: member hash, old-atom bounds, base64, SHA-256 and replacement root recompute.

4.5.2 The inherited crosswalk contains 128 exact selectors but ten overlapping selector pairs. Eight involve a whole field overlapping a vector-tail selector; `B0V4REQ-008.statement` has two identical whole-field selectors; `B0V4REQ-008.requiredProof` has two identical whole-field selectors plus the nested vector-tail selector.

4.5.3 No ordering, composition, confluence, executable before/after reducer or non-weakening predicate is frozen. `replacementNorm`, `retainedSafetyIntent` and `surroundingMemberBytesRemainMandatory=true` are assertions, not a decidable relation.

4.5.4 Result: exact byte selection passes, but replacement semantics are multi-valued. See `B0V5-IHR-F002..003`.

## 4.6 Permit, time, revocation, replay and Acceptance

4.6.1 GenesisPermit and OperationalPermit each list 20 field names; ConformancePermit lists 23. Each carries one aggregate `schemaRoot`, but no per-field type, cardinality, equality, freshness or invalidation rules.

4.6.2 Acceptance has `156/156` fields and 49 required causal names. Of the 156 fields, 107 use a `B0V5-HEAD-*` source while their literal invalidation rule refers to `B0V4-HEAD-*`; a v5 head advance therefore does not satisfy the stored invalidation label.

4.6.3 Acceptance contains `all84OutputsRoot` and no `all96OutputsRoot`. The twelve remediation Outputs `B0V5OUT-000..011` are outside that literal denominator.

4.6.4 All 96 Outputs are `PLANNED;NOT-IMPLEMENTED;NOT-ACCEPTED`; all implementation roots are null; evidence arrays are empty; authority and acceptance credit are zero.

4.6.5 Result: Permit validity, time boundary, revocation, replay and exact output closure are not executable. See `B0V5-IHR-F011..012` and `B0V5-IHR-F015`.

## 4.7 CAS and response-loss recovery

4.7.1 `acceptanceCas.orderedTransaction` has 15 ordinal records whose `op` values are natural-language labels. There is no canonical state schema, executable transition body, transaction-program root, error semantics, crash point set or interleaving model.

4.7.2 The CAS oracle used by the packaged generator compares pointer values, one-use state, a nondecreasing fence, revision ordering and time. It does not consume all 36 expected head tuples, exact Permit/revocation-head transitions, store topology, actual fence advancement, outbox state or crash recovery.

4.7.3 Result: the prose transaction cannot prove one linearization point, revoke-wins behavior, ABA resistance or no duplicate external effect. See `B0V5-IHR-F016`.

## 4.8 Portable causal vectors and non-vacuity

4.8.1 The corpus contains `288/288` fixtures and vectors, uses only the `SET` operation, has `observed=null` and `evidenceRoot=null` for `288/288`, and correctly reports `operationalVectorExecutionCount=0`.

4.8.2 Each stored `program.oracle` contains only `kind`, `readsMutatedDomainState` and `storedExpectedValueIsOracleInput`. The corpus contains no oracle equations or bodies and no root binding an oracle kind to executable semantics. Those bodies exist only inside generator source.

4.8.3 The `VECTOR-CAUSAL-SPEC` oracle is circular: it accepts because the fixture stores `controlDecision=ELIGIBLE` and `mutationDecision=BLOCKED`; it does not derive either decision from a domain transition.

4.8.4 The 252 inherited vectors cover only `statement`, `requiredProof` and `sourceBasis` once per inherited Requirement. They do not cover `threatCauseImpact` or `dependencies`. Each of the first 12 closure classes has only three vectors for one selected instance; the supersession vectors test only the first of ten supersessions.

4.8.5 The package-root closure vectors build their state from the v4 atomic manifest, not the v5 eight-member manifest under review.

4.8.6 Fixtures contain unresolved planning placeholders such as pointer, Permit, revocation, witness, controller and recovery-controller labels plus invented numeric times, while every fixture asserts `mockData=false`, `sampleData=false` and `syntheticBusinessData=false`.

4.8.7 Result: root consistency does not supply portable causal execution or mutation sensitivity for the claimed domains. See `B0V5-IHR-F006..010`.

# 5. Non-circularity, identity, path and disclosure checks

## 5.1 Mutable heads and membership

5.1.1 `94/94` object classes, `36/36` heads and all 36 current tuple schemas are unique. Every object maps to one declared head; every path is exactly object-to-head-to-SecurityUniverse; no self-edge, discontinuity or cycle was found.

5.1.2 Independent Node.js and Python validators agree on the valid graph and reject tested self-edge, duplicate-object, unmapped-head and discontinuity mutations. Current head versions/roots and `currentHeadVectorReceipt` remain null, so this is planning-schema validation only.

## 5.2 Deterministic identity and randomness

5.2.1 The registry freezes SHA-256 over a domain plus canonical JSON and declares `randomnessAllowed=false`.

5.2.2 Exact scans of all eight package members found no use of `Math.random()`, `crypto.randomUUID()` or `randomUUID()`.

## 5.3 Absolute paths, traversal and public disclosure

5.3.1 No concrete absolute filesystem path, filesystem URI, symlink, private key, credential, token, email address or phone number was found in the six normative/data members. Detector literals in QA source are not path instances or secrets.

5.3.2 No source-index path contains `..` or begins with `/`. The failure is instead the extra leading repository segment described in `B0V5-IHR-F001`.

5.3.3 The package is explicitly `PUBLIC`. It contains labels for restricted concepts and a named identity-binding class, but no operational instance, private digest or PII value was found. This review grants no disclosure-policy credit because all runtime roots remain absent.

# 6. Exact counters and final state

## 6.1 Review ledger

| Denominator | Independent result |
|---|---:|
| Frozen package members | `8/8` byte/hash match |
| Stored package-root derivations | `2/2` exact |
| Stored manifest paths resolving from public Git root | `0/8` |
| Stored source-index artifact paths resolving from public Git root | `0/22` |
| Source-index artifacts | `22/22` byte/hash/line match after forensic prefix removal |
| Source-index spans | `7973/7973` valid; `0` duplicate; `0` one-byte |
| Inherited v4 Requirements | `84/84` exact |
| Inherited v4 fields | `420/420` exact |
| Inherited source references | `373/373` indexed after forensic prefix removal |
| v5 Requirements | `96/96` |
| v5 fields | `480/480` |
| Inherited hostile Findings | `12/12` distinct |
| Independently closed inherited Findings | `1/12` (`B0V4-HR-F012` only) |
| New independent Findings | `20` |
| Closed new Findings | `0/20` |
| Open new P0 | `18/18` |
| Open new P1 | `2/2` |
| Open new P2 | `0/0` |
| Open new P3 | `0/0` |
| NamedUses | `3471/3471` syntactic-marker records |
| Mutable objects / heads | `94/94`; `36/36` mechanical graph pass |
| Acceptance fields | `156/156` present; semantic closure failed |
| Outputs | `96/96` planned; `0/96` implemented; `0/96` accepted |
| Vectors | `288/288` specifications; `0/288` operational executions |
| Authority credit | `0` |
| Acceptance credit | `0` |

## 6.2 Final immutable-review disposition

6.2.1 `verdict=REJECT`; `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.

6.2.2 No packaged self-attestation, stored expected result, syntactic count, hash consistency, preserved predecessor byte, closed individual P2 Finding or existence of this review may be used as B0, authority, Acceptance or Gate 29 evidence.

6.2.3 Remediation requires a new immutable successor package. The frozen v5 Subject and its package members must remain unchanged, and every inherited and new Finding must retain its exact ID and `noMergeKey` until its own closure test passes.
