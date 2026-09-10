# 1. Connect — B0 v4 independent hostile review

## 1.1 Review identity

1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-V4-INDEPENDENT-HOSTILE-REVIEW-2026-08-30-G0`.

1.1.2 `artifactClass=DETACHED-INDEPENDENT-HOSTILE-REVIEW;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE;NOT-PRODUCT-EVIDENCE`.

1.1.3 Review cut: `2026-08-30`, repository visibility permanently `PUBLIC`.

1.1.4 Subject under review: `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v4-2026-08-29.md`, SHA-256 `4a45fd1b9e2aeefefff28862676f5cfa7c87f5141d81edcf9691a908c7c8f0c9`.

1.1.5 Atomic package manifest: `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v4-atomic-package-manifest-2026-08-29.json`, SHA-256 `8a782b55eb92768288a5f1d64e04f76869c4af739e1e2f997a257c34c65709ad`.

1.1.6 Detached companion: `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v4-independent-hostile-review-findings-manifest-2026-08-30.md`.

## 1.2 Verdict first

1.2.1 **Verdict: `REJECT`.** The package is mechanically dense and internally count-complete, but it does not supply an operationally closed, causally executable authority design. Eleven open P0/P1 findings block immutable-successor credit.

1.2.2 Frozen finding denominator: `12/12` distinct new Findings reviewed; `P0=9`, `P1=2`, `P2=1`, `P3=0`; `OPEN-BLOCKING=11`, `OPEN-NONBLOCKING=1`, `CLOSED=0/12`.

1.2.3 This verdict rejects the v4 Candidate's claimed remediation sufficiency. It does **not** claim that product code was executed, that an exploit was demonstrated, that B0 exists, or that any external authority was exercised. No product, build, runtime, provider, credential, Git or GitHub operation was performed.

1.2.4 Mechanical integrity that did pass is not discarded: the six supplied frozen-input byte roots match, all eight files named by the atomic manifest physically match their listed byte counts and SHA-256 values, the declared denominators are present, and the package consistently declares zero authority. Those facts prove package identity and planning structure only.

1.2.5 Required state remains exact and unchanged:

| State | Independent result |
|---|---:|
| `acceptedRequirementCount` | `0/84` |
| `implementedOutputCount` | `0/84` |
| `independentlyClosedV3FindingCount` | `0/13` |
| `operationalVectorExecutionCount` | `0/252` |
| `independentlyClosedNewFindingCount` | `0/12` |
| `externalL0Authority` | `ABSENT` |
| `genesisFoundationReceipt` | `ABSENT` |
| `canonicalMandateReceipt` | `ABSENT` |
| `B0` | `ABSENT` |
| `ControlSequenceAcceptance` | `BLOCKED` |
| `Gate29` | `BLOCKED` |
| `developmentFreeze` | `ACTIVE` |

# 2. Independence, scope and method

## 2.1 Inputs actually read

2.1.1 The following six frozen inputs were read and parsed end-to-end before substantive review. The roots, physical line counts and byte counts were recalculated from the bytes in the repository.

| Frozen input | Expected and observed SHA-256 | Lines | Bytes |
|---|---|---:|---:|
| Subject | `4a45fd1b9e2aeefefff28862676f5cfa7c87f5141d81edcf9691a908c7c8f0c9` | 1,081 | 266,839 |
| Normative registry | `94a4d151425325e43832e57b2579e78bf7fa1e56bcdfda1ec704137eb53501d2` | 6,390 | 256,828 |
| Source/member/span index | `641459c7a09b30eb0c5ea48359194b092f0d5d00109c7df3f43a3bf53030ad7a` | 31,924 | 1,120,580 |
| Closure/NamedUse crosswalk | `24d3d90b404847d7a7ca5a457edf8117cca0f12a79cbc552eac8ef47d1763451` | 44,975 | 1,696,229 |
| Executable vector program pack | `a004e0dfed0e7741d5a1f9c02b7fa9a4efef644209ff730041aaf8cb819d9fbd` | 21,811 | 1,651,477 |
| Atomic package manifest | `8a782b55eb92768288a5f1d64e04f76869c4af739e1e2f997a257c34c65709ad` | 85 | 3,759 |
| **Total** | six exact inputs | **106,266** | **4,995,712** |

2.1.2 The exact predecessor roots required by the assignment were also read end-to-end:

| v3 root | Observed SHA-256 | Lines | Bytes |
|---|---|---:|---:|
| v3 Subject | `872ffc806ac35614a9cba33cc9cbe5bc1a0f0cf7675d578183a60ca55d9611e9` | 1,527 | 149,668 |
| v3 independent hostile review | `987b6d92c750dc8c94c9c113e45a3b41c723a2b1d5d8abbe5afd2f3a2d7c36f7` | 378 | 30,548 |
| v3 independent Findings manifest | `b62f0a0202e4b2b0eb4e58eebebe5bfc923ba7bcd32f19a83b3035b97490717f` | 323 | 33,401 |
| **Total** | three exact roots | **2,228** | **213,617** |

2.1.3 No v4 Producer-QA report, v4 QA-engine report, prior builder message or later review was read or used. The v3 Producer-QA source bytes were also deliberately not opened. Its 41 index records were parsed because they occur inside the frozen source/member/span index, but their raw source spans were not independently recalculated.

2.1.4 The three executable source files named as atomic-manifest members were hash/byte checked only. Their source semantics were not used as review evidence, and no engine was run. This preserves the review boundary while still testing the manifest's physical member claims.

## 2.2 Independent parsing and adversarial checks

2.2.1 The review independently parsed every one of the 84 v4 Requirements and verified exactly five fields per row: `statement`, `threatCauseImpact`, `requiredProof`, `dependencies`, `sourceBasis`. It separately parsed all 70 v3 preserved rows and their 350 predecessor field values.

2.2.2 It recomputed canonical JSON roots for all 252 fixtures, all 252 programs and all 252 preconditions using recursive key ordering; checked the complete dependency relation, crosswalk cardinalities, source spans, NamedUses, cycle-break records, head paths, acceptance fields, Genesis members, role pairs, directives, output projections and current-state zeros.

2.2.3 Threat traces were evaluated for exact-import lifecycle, Genesis/first Permit, G1/G2, L0 recovery, Approver/role separation, CAS/readback, expiry/revoke/replay, directive precedence, Public projections/privacy, deterministic identity/no randomness and bounded convergence.

2.2.4 The review distinguishes four predicates that the package sometimes places near one another:

| Predicate | Meaning | Result |
|---|---|---|
| Physical identity | supplied bytes match named SHA/size | PASS within stated scope |
| Mechanical preservation | rows, fields and labels are present and countable | Mostly PASS |
| Semantic closure | the frozen machine schema preserves the exact causal safety requirement | REJECT |
| Operational proof | independent executions/receipts demonstrate the schema in operation | `0`; absent by design |

# 3. Mechanical results that passed

## 3.1 Requirement and dependency structure

3.1.1 Requirements: `84/84` unique contiguous IDs; five-field values: `420/420`; unique aligned Outputs: `84/84`.

3.1.2 Parsed build dependencies: `1,667`; every edge is unique, targets a lower-numbered Requirement, and has no self or forward edge. The declared build graph is therefore acyclic under its own edge definition.

3.1.3 v3 preservation: `70/70` literal v3 rows and `350/350` field-crosswalk rows are present. Independent comparison of the crosswalk's stored field strings and digests against the v3 Subject found no field-value mismatch.

## 3.2 Nested lineage denominators

| Lineage | Rows | Field rows | Mechanical result |
|---|---:|---:|---|
| v3 hostile Findings | 13 | n/a | `13/13`; closure and acceptance false |
| v3 Requirements | 70 | 350 | `70/70`; `350/350` |
| v2 Requirements | 49 | 245 | `49/49`; `245/245` |
| original Requirements | 27 | 135 | `27/27`; `135/135` |
| legacy hostile Findings | 22 | n/a | `22/22` |
| v2 hostile Findings | 21 | n/a | `21/21` |

3.2.1 These counts are preservation evidence, not closure evidence. Findings `B0V4-HR-F001` through `B0V4-HR-F004` show why the same rows do not establish exact resolvable membership or a complete semantic graph.

## 3.3 Registries and projections

3.3.1 Output registry: `84/84`; every row is `repositoryVisibility=PUBLIC`; planning classifications are `84 PUBLIC`; runtime classifications are `55 INTERNAL` and `29 RESTRICTED`; implementation roots are null and Evidence-root arrays are empty. All Public representations use the disclosure-safe planning-only string and expose no restricted digest, equality oracle, membership oracle or machine-local path.

3.3.2 Role universe: `8/8` roles and `28/28` unordered prohibited pairs; `Approver` is distinct; the `AuthorityOwner` exact-root act is separately represented. This is a real mechanical improvement, but recovery-controller coverage remains incomplete under `B0V4-HR-F011`.

3.3.3 Mutable map: `94/94` unique object classes, `36/36` generated heads and coverage of every head. Ten membership paths nevertheless contain self-edges, so cardinality does not establish the required acyclic membership proof.

3.3.4 Acceptance field registry: `107/107` unique fields, exactly-one cardinality and non-null field schemas; classifications are `35 PUBLIC`, `49 INTERNAL`, `23 RESTRICTED`. Literal causal fields and witness/independence denominators remain missing under `B0V4-HR-F007` and `B0V4-HR-F008`.

3.3.5 Genesis foundation: `24/24` unique member labels and two explicit null receipt slots. Labels are present; the external admission and member schemas are not closed enough to causally validate the first Permit.

3.3.6 Applicable directives: `5/5` rows with exact roots; the Public invariant is explicit and non-waivable. The planning table is present. There is no operational precedence receipt, and no such receipt receives credit here.

3.3.7 Public scan: no absolute `/Users/...` path or `file://` locator occurs in the six frozen inputs; no actual secret/PII instance was found. Prohibition prose containing words such as “secret” is not treated as a leak.

3.3.8 Deterministic identity: no random-ID construction or randomness call appears in the frozen planning inputs. Presence of deterministic-ID declarations receives planning credit only.

3.3.9 Bounded convergence: the registry states a maximum of three remediation iterations per review epoch, prohibits automatic recursion and requires a strict lexicographic decrease. This is a coherent planning bound. There are no operational convergence receipts and no closure credit.

## 3.4 Span and manifest checks

3.4.1 The source index contains `3,961` member records across `16` artifacts. Raw artifact root, physical count, member bounds, ordering, uniqueness and member digest were independently recalculated for `3,920/3,961` members across `15/16` artifacts. The omitted `41` raw-source recalculations are exclusively the forbidden v3 Producer-QA source; their frozen index structures were still parsed.

3.4.2 All eight atomic-manifest member paths physically exist and match their listed byte count and SHA-256. This proves member identity only. `B0V4-HR-F012` limits the independent meaning of the separate `packageContentRoot` field.

## 3.5 Vector pack mechanical profile

3.5.1 Identities and roots: `252/252` fixture IDs, vector IDs, fixture roots, program roots and precondition roots recomputed correctly; all IDs align as `000-A` through `083-C`; observed result and Evidence root are null for `252/252`; operational execution is `0/252`.

3.5.2 Program-shape census:

| Property | Count |
|---|---:|
| `SET /attack` | 252 |
| `REMOVE /fields/requiredProof` | 84 |
| `REPLACE /source/memberSha256` | 84 |
| `EVENT` | 11 |
| one-operation programs | 82 |
| two-operation programs | 161 |
| three-operation programs | 9 |
| fixtures bound to one-byte `#` member | 249 |
| fixtures bound to another member | 3 |
| requirements whose A/B/C payload bytes are identical | 84 |

3.5.3 Expected-terminal census: `BLOCKED=221`, `CONFLICT=7`, `REVOKED=9`, `UNCERTAIN=7`, `QUARANTINED=3`, `REJECTED=3`, `EXPIRED=1`, `COLLISION=1`.

3.5.4 These are well-rooted declarative records, not non-vacuous scenario executions. `B0V4-HR-F006` demonstrates that A/B fail for generic schema corruption and C normally only attaches a label; the stored expected terminal is not caused by an executable domain transition/oracle.

# 4. Frozen finding summary

| New Finding | Severity | State | Distinct failure identity | Principal affected claims |
|---|---|---|---|---|
| `B0V4-HR-F001` | P0 | OPEN-BLOCKING | 202 source-member identities collapse to the one-byte `#` span | exact import, lineage, fixtures |
| `B0V4-HR-F002` | P0 | OPEN-BLOCKING | typed supersessions do not resolve their field locators and 9/10 old atoms are not literal | lifecycle, path, G1/G2, role import |
| `B0V4-HR-F003` | P1 | OPEN-BLOCKING | 27 mandatory preserved B0V1 source locators do not resolve | exact sourceBasis closure |
| `B0V4-HR-F004` | P0 | OPEN-BLOCKING | NamedUse classification is token-family-presence, while 17 prior interfaces have schemas but no instances | hidden semantic cycles |
| `B0V4-HR-F005` | P0 | OPEN-BLOCKING | ten mutable membership paths contain literal self-cycles | authoritative-head acyclicity |
| `B0V4-HR-F006` | P0 | OPEN-BLOCKING | 252 vectors are rooted but scenario-vacuous and lack causal oracles | all negative proof claims |
| `B0V4-HR-F007` | P0 | OPEN-BLOCKING | 107-field envelope omits required permit/revision/replay/fence/time literals | expiry, revoke, replay, acceptance |
| `B0V4-HR-F008` | P0 | OPEN-BLOCKING | envelope has only Witness1-produced witness fields and no per-proof-class independence bindings | anti-equivocation, independent proof |
| `B0V4-HR-F009` | P0 | OPEN-BLOCKING | Acceptance CAS advances the pointer without comparing its expected predecessor and has no fence/Attempt reservation step | atomicity, response loss, replay |
| `B0V4-HR-F010` | P0 | OPEN-BLOCKING | Genesis member labels and external ceremony are not closed typed instances | first authority, first Permit, G1/G2 |
| `B0V4-HR-F011` | P1 | OPEN-BLOCKING | L0 recovery slots are labels and controller exclusion omits AuthorityOwner | recovery quorum, role separation |
| `B0V4-HR-F012` | P2 | OPEN-NONBLOCKING | packageContentRoot has no canonical derivation/domain | portable atomic-root verification |

# 5. Hostile analysis by authority surface

## 5.1 Exact import and supersession

5.1.1 Every predecessor Requirement/Finding ID locator used as a source member for six lineages spans only the heading marker byte `#`. Exactly `202` such locators share SHA-256 `334359b90efed75da5f0ada1d5e6b256f4a6bd0aee7eb39c0f90182a021ffc8b`: v3 Requirements `70`, v3 Findings `13`, v2 Requirements `49`, v2 Findings `21`, originals `27`, legacy Findings `22`.

5.1.2 The crosswalk repeats that same digest for all `202` source rows, and `249/252` vector fixtures bind it. Stored field strings can be compared to raw subjects, as this review did, but the package's claimed member identity cannot derive or authenticate the whole source member. Exact-member provenance and fixture causality therefore fail independently of count preservation.

5.1.3 All ten typed-supersession `sourceReference` locators use field or clause locators absent from the source index. Nine `oldAtom` strings are paraphrases rather than literal byte substrings of the named predecessor field. Only `B0V4-SUP-GEN-003` has a literal old-atom match; its `§6.2.2.clause` locator still does not resolve.

5.1.4 This is not a cosmetic locator defect. Typed supersession is the sole permitted way to replace mandatory contradictory predecessor text. If the old atom is neither byte-selected nor literal, an implementation cannot prove which exact conjunct was replaced and which surrounding safety terms remain mandatory.

5.1.5 Separately, all 27 preserved original `sourceBasis` references of form `B0V1::§2.1` through `B0V1::§2.27` lack matching source-index locators. The index contains narrower paragraph locators such as `§2.1.1`, and one-byte Requirement-ID locators, but not the mandatory section locators used in the v4 rows.

## 5.2 NamedUse graph and semantic cycles

5.2.1 The crosswalk declares an extraction rule covering every machine-ID token, yet its `3,135` use records recognize only seven edge classes: typed supersession `45`, build dependency `1,667`, vector `84`, original preservation `151`, v2 preservation `333`, v3 preservation `771`, and Output `84`.

5.2.2 Runtime machine concepts present in the five fields—such as `GenesisPermit`, `L0TrustAnchorAdmission`, `AuthorityRevision`, `CommitReceipt`, `IndependenceProfile` and `B0V4-IFACE-*`—are not represented as typed target nodes/relations. A preserved `B0V3REQ-*` token is uniformly called a citation/preservation even when the predecessor prose used that Requirement as a construction dependency. `unclassified=0` is therefore true only under an incomplete extractor/class universe.

5.2.3 All 17 hidden-cycle rows name a prior interface and list seven field **names**, but provide no consumer/provider class values, input/output roots or validation predicate values. No separately rooted interface instance exists. Replacing a forward semantic construction use with an uninstantiated schema does not prove that the consumer can be built or evaluated without future provider authority.

## 5.3 Mutable heads and snapshot fencing

5.3.1 The `94/94` object and `36/36` head counts pass. Ten immutable membership paths nevertheless contain a self-edge before reaching `SecurityUniverseHead`:

`AlgorithmRegistry`, `TrustedTimeDecision`, `CanonicalMandate`, `EffectClassifier`, `RequirementSet`, `OutputRegistry`, `AcceptancePointer`, `PublicDisclosurePolicy`, `WitnessPolicy`, and `ExceptionRegistry` each map `X->X`.

5.3.2 The preserved v3 predicate requires acyclic Authority and Membership projections. A literal self-edge is a one-node cycle. A count-complete map with a cyclic membership path cannot close that predicate.

## 5.4 Executable vectors and causal authority

5.4.1 A vector is non-vacuous only if the mutation changes the domain state relevant to its threat, and an independent oracle derives the terminal from that state. Merely deleting a universally required proof field or corrupting an authenticated source digest establishes only that generic malformed input blocks.

5.4.2 Every A program deletes `requiredProof`; every B program replaces `source.memberSha256`; every program writes an `/attack` description. Only 11 programs emit any domain-like `EVENT`. Eighty-two of 84 C programs do nothing beyond attaching the description.

5.4.3 Consequently, the package does not causally exercise first-Permit reservation, shared-revision revoke-wins, expiry boundary, replay, response-loss reconciliation, two-witness split view, CAS crash points, L0 recovery, role-controller overlap or G1/G2 capability separation. The expected terminal/reason is an input record, not an executable assertion over a closed transition system.

5.4.4 Two engine roots are listed, but the same pair is used as both runner and evaluator for all 252 records and there is no declarative oracle program. Root presence cannot turn a missing oracle into causal execution. Operational receipts correctly remain null; specification credit also fails because the programs are scenario-vacuous.

## 5.5 Genesis, first Permit and G1/G2

5.5.1 The 24-member Genesis list is a list of labels, several of which compound multiple authorities: for example `AlgorithmRegistryHeadAndMembers`, `AuthorityStoreIdentityAndCapabilityReceipt`, `InitialSecurityUniverseHeadAndRevision`, `WitnessPolicyAndAppointments`, and `TwoIndependentFoundationValidatorRoots`.

5.5.2 The one global cardinality string `EACH-EXACTLY-ONE` does not define submember cardinality, canonical field schemas, controller identities, root domains, issuance/invalidation rules or equality relations for those compounds. The external ceremony supplies only strings such as `EXTERNAL-L0-QUORUM` and `PREPROVISIONED-OUTSIDE-B0`; it supplies no exact admitted anchor bytes/root, quorum Appointment set, verifier input roots or validation predicate.

5.5.3 The first GenesisPermit references selected member labels and an action label, but lacks a closed Permit record binding deterministic Permit/Attempt IDs, exact Act, expected ledger head, security epoch/revision, `notBefore`, `validThrough`, one-use state, actor Appointment and output manifest into one typed object. The frozen package therefore correctly grants no current authority, but also fails to define a causally checkable path to first authority.

5.5.4 G1/G2 ConformancePermit separation is textually declared and current receipts are absent. Its atom-exact import depends on unresolved/nonliteral supersessions, its first foundation is underdefined, and its vectors do not exercise capability-sink effects. G1/G2 operational-equivalence proof is therefore zero, not closed planning proof.

## 5.6 Acceptance envelope, CAS, readbacks, expiry/revoke/replay

5.6.1 The 107 literal rows are mechanically valid, but closed-field cardinality is insufficient if mandatory predecessor atoms have no field. The registry has no literal `authorityEpoch`, `attemptId`, `fencingToken`, `expectedPermitHead`, `expectedRevocationHead`, `notBefore` or `validThrough`. Opaque permit roots and generic head tuples do not state those values or their equality/freshness relations.

5.6.2 The registry does include `acceptancePointerExpectedVersion`. The ordered CAS transaction, however, never reads and compares that field. It compares the SecurityUniverse, Permit and revocation heads, validates the envelope and then directly advances the pointer exactly one version. It also has no explicit monotonic fencing-token compare/advance or one-use Attempt-ID reservation/consume step.

5.6.3 Therefore two individually valid envelopes can serialize and sequentially advance/overwrite the Current pointer without each caller being bound to the exact predecessor it observed. Serializable execution orders transactions; it does not itself enforce caller-specific expected state, replay identity or stale-fence rejection.

5.6.4 Two readback receipt fields and one readback-independence root exist. That does not repair the missing commit compares, nor does it satisfy the preserved nine proof-class independence profiles.

5.6.5 Anti-equivocation is also field-incomplete: `evidenceLedgerHead` and `witnessCheckpointRoot` are both produced by `Witness1`; there is no Witness2 acknowledgement/root or a same-checkpoint two-witness equality/cardinality field. A single compound Genesis witness-policy label cannot substitute for the Acceptance envelope's exact proof denominator.

## 5.7 L0 recovery and role separation

5.7.1 The recovery registry declares a 3-of-5 threshold, five labels, two witnesses and useful ordering prose. It does not define five rooted Appointment/member records with profile epoch, activation/expiry bounds, key status, controller root and individual acknowledgement semantics.

5.7.2 Its controller exclusion lists Producer, QA, Reviewer1, Reviewer2, Reconciler, Approver and AcceptanceWriter, but omits `AuthorityOwner`. A recovery custodian could therefore share the AuthorityOwner controller while the eight-role matrix still reports `28/28`. That defeats the claimed “work-role overlap=0” recovery predicate.

## 5.8 Directives, Public projections and privacy

5.8.1 The permanently Public repository constraint is preserved. All output rows have a disclosure-safe Public planning projection, actual restricted runtime bytes are absent, and this review found no machine-local path or actual secret/PII instance in the frozen inputs.

5.8.2 The five-row directive table and numeric precedences are present. No operational resolver result is present, so precedence execution gets zero proof credit. The explicit non-waivable Public invariant prevents a lower-priority privacy directive from selecting a Private repository; no new contradiction was found on that limited planning predicate.

## 5.9 Atomic package root

5.9.1 Every listed manifest member hash and byte count matches. The separate `packageContentRoot=2b37ec92...3446` has no declared canonical serialization, member ordering input, domain separator or hash equation in any of the six frozen inputs.

5.9.2 This review does not claim that value is mathematically wrong. It claims the value is not independently portable or reproducible from the frozen specification. The manifest's own file root still binds its explicit member list, so this is classified P2 rather than a second P0 atomicity failure.

# 6. Every-Requirement disposition

## 6.1 Reading rule

6.1.1 `MECH-PASS` means the literal five-field row, Output and declared dependency shape exist. `OPEN-BLOCKED` means one or more frozen Findings prevents semantic or operational credit. Every row remains `acceptanceCredit=0`.

| Requirement | Mechanical row | Independent disposition | Blocking/new Finding identities | Acceptance |
|---|---|---|---|---:|
| `B0V4REQ-000` | MECH-PASS | OPEN-BLOCKED | F002, F006 | 0 |
| `B0V4REQ-001` | MECH-PASS | OPEN-BLOCKED | F001, F002, F003, F006 | 0 |
| `B0V4REQ-002` | MECH-PASS | OPEN-BLOCKED | F002, F006, F010 | 0 |
| `B0V4REQ-003` | MECH-PASS | OPEN-BLOCKED | F004, F006 | 0 |
| `B0V4REQ-004` | MECH-PASS | OPEN-BLOCKED | F006, F010 | 0 |
| `B0V4REQ-005` | MECH-PASS | OPEN-BLOCKED | F005, F006 | 0 |
| `B0V4REQ-006` | MECH-PASS | OPEN-BLOCKED | F006, F011 | 0 |
| `B0V4REQ-007` | MECH-PASS | OPEN-BLOCKED | F001, F006 | 0 |
| `B0V4REQ-008` | MECH-PASS | OPEN-BLOCKED | F006, F007, F008 | 0 |
| `B0V4REQ-009` | MECH-PASS | OPEN-BLOCKED | F006 | 0 |
| `B0V4REQ-010` | MECH-PASS | OPEN-BLOCKED | F006, F007, F009 | 0 |
| `B0V4REQ-011` | MECH-PASS | OPEN-BLOCKED | F006, F011 | 0 |
| `B0V4REQ-012` | MECH-PASS | OPEN-BLOCKED | F006 | 0 |
| `B0V4REQ-013` | MECH-PASS | OPEN-BLOCKED | F006 | 0 |
| `B0V4REQ-014` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-015` | MECH-PASS | OPEN-BLOCKED | F001, F003, F004, F006 | 0 |
| `B0V4REQ-016` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-017` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-018` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-019` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-020` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-021` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-022` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-023` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-024` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-025` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-026` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-027` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-028` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-029` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-030` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-031` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-032` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-033` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-034` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-035` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-036` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-037` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-038` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-039` | MECH-PASS | OPEN-BLOCKED | F001, F002, F003, F006 | 0 |
| `B0V4REQ-040` | MECH-PASS | OPEN-BLOCKED | F001, F002, F003, F006 | 0 |
| `B0V4REQ-041` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-042` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-043` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-044` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-045` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-046` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-047` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-048` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-049` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F010 | 0 |
| `B0V4REQ-050` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F007, F009, F010 | 0 |
| `B0V4REQ-051` | MECH-PASS | OPEN-BLOCKED | F001, F003, F004, F006 | 0 |
| `B0V4REQ-052` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F007, F009 | 0 |
| `B0V4REQ-053` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F007, F009 | 0 |
| `B0V4REQ-054` | MECH-PASS | OPEN-BLOCKED | F001, F003, F005, F006, F007 | 0 |
| `B0V4REQ-055` | MECH-PASS | OPEN-BLOCKED | F001, F002, F003, F006 | 0 |
| `B0V4REQ-056` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-057` | MECH-PASS | OPEN-BLOCKED | F001, F002, F003, F006 | 0 |
| `B0V4REQ-058` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F007 | 0 |
| `B0V4REQ-059` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-060` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-061` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-062` | MECH-PASS | OPEN-BLOCKED | F001, F002, F003, F006 | 0 |
| `B0V4REQ-063` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F011 | 0 |
| `B0V4REQ-064` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F010 | 0 |
| `B0V4REQ-065` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F007, F008, F009 | 0 |
| `B0V4REQ-066` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-067` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F008 | 0 |
| `B0V4REQ-068` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F008 | 0 |
| `B0V4REQ-069` | MECH-PASS | OPEN-BLOCKED | F001, F002, F003, F006 | 0 |
| `B0V4REQ-070` | MECH-PASS | OPEN-BLOCKED | F001, F002, F003, F006 | 0 |
| `B0V4REQ-071` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F007, F008 | 0 |
| `B0V4REQ-072` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-073` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F007 | 0 |
| `B0V4REQ-074` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-075` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |
| `B0V4REQ-076` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F011 | 0 |
| `B0V4REQ-077` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F010, F011 | 0 |
| `B0V4REQ-078` | MECH-PASS | OPEN-BLOCKED | F001, F002, F003, F006, F010 | 0 |
| `B0V4REQ-079` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F007, F008, F009 | 0 |
| `B0V4REQ-080` | MECH-PASS | OPEN-BLOCKED | F001, F003, F004, F006 | 0 |
| `B0V4REQ-081` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F008 | 0 |
| `B0V4REQ-082` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006, F008 | 0 |
| `B0V4REQ-083` | MECH-PASS | OPEN-BLOCKED | F001, F003, F006 | 0 |

6.1.2 Requirement-row denominator is `84/84`; no row was merged, omitted, accepted or assigned inherited closure.

# 7. The 13 v3 Finding dispositions

## 7.1 No inherited closure

| v3 Finding | Candidate delta | Independent disposition | New blockers | Closure |
|---|---|---|---|---:|
| `B0V3-HR-F001` | lifecycle supersessions | REJECT | F002, F006 | 0 |
| `B0V3-HR-F002` | portable source identity | REJECT | F001, F002, F003, F006 | 0 |
| `B0V3-HR-F003` | Permit generation separation | REJECT | F002, F006, F010 | 0 |
| `B0V3-HR-F004` | NamedUse/cycle breaks | REJECT | F004, F006 | 0 |
| `B0V3-HR-F005` | Genesis foundation | REJECT | F006, F010 | 0 |
| `B0V3-HR-F006` | mutable-head derivation | REJECT | F005, F006 | 0 |
| `B0V3-HR-F007` | eight-role matrix | PARTIAL-ONLY | F006, F008, F011 | 0 |
| `B0V3-HR-F008` | vector program pack | REJECT | F001, F006 | 0 |
| `B0V3-HR-F009` | Acceptance field denominator | REJECT | F006, F007, F008 | 0 |
| `B0V3-HR-F010` | Output custody/Public projection | PARTIAL-ONLY | F006; operational proof absent | 0 |
| `B0V3-HR-F011` | Acceptance CAS | REJECT | F006, F007, F009 | 0 |
| `B0V3-HR-F012` | L0 recovery quorum | REJECT | F006, F011 | 0 |
| `B0V3-HR-F013` | directives/convergence | PARTIAL-ONLY | F006; operational proof absent | 0 |

7.1.1 `independentlyClosedV3FindingCount=0/13`. Materialized text and mechanical denominator improvements do not transfer closure.

# 8. Required successor and closure boundary

## 8.1 Frozen package handling

8.1.1 The six reviewed v4 inputs are frozen. They must not be edited in place. Any remediation must be a new immutable successor package with new roots and an explicit non-merged disposition for every Finding in the companion manifest.

8.1.2 At minimum, the successor must provide: whole-member byte spans and resolvable locators; atom-literal supersessions; a complete semantic token/edge graph; instantiated prior interfaces; acyclic membership paths; causally executable vector fixtures/operations/oracles; a literal Permit/revision/fence/time/Attempt envelope; two-witness and nine-class independence bindings; expected-pointer/fence/Attempt CAS compares; closed typed Genesis and recovery schemas; and a canonical package-root equation.

8.1.3 Closure requires fresh independent evidence against each Finding's predicate and negative vectors. Editing a label, increasing a count, or pointing back to this review is not closure evidence.

## 8.2 Final zero claims

8.2.1 `findingDenominator=12`; `closedFindingCount=0`; `acceptedRequirementCount=0`; `acceptedOutputCount=0`; `acceptedVectorCount=0`; `authorityCredit=0`; `acceptanceCredit=0`.

8.2.2 `verdict=REJECT`; `B0=ABSENT`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`.
