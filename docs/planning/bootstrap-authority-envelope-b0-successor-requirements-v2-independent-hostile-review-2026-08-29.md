# 1. Connect — B0 v2 independent hostile review

## 1.1 Review identity and isolation

1.1.1 `artifactId=CONNECT-B0-V2-INDEPENDENT-HOSTILE-REVIEW-2026-08-29`.

1.1.2 `reviewClass=INDEPENDENT-HOSTILE-REVIEW; SUBJECT-ONLY; NO-PRODUCT; NO-GIT; NO-GITHUB; NO-PROVIDER`.

1.1.3 `subjectPath=/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v2-2026-08-29.md`.

1.1.4 `subjectRawSha256=7030c7b8ce0e3c7e3c74a89fee222af87aa51e3e448cfb91988c068d66efe8a4`.

1.1.5 `subjectPhysicalIdentity=824 lines; 72393 bytes`.

1.1.6 `findingsManifestPath=/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v2-independent-hostile-review-findings-manifest-2026-08-29.md`.

1.1.7 `findingsManifestRawSha256=3b1730573462d2adbecf01a8062d27ca0cb8ac3620101d6eaa2288559d6681df`.

1.1.8 `findingsManifestPhysicalIdentity=475 lines; 35719 bytes`.

1.1.9 Producer QA was not read, searched, summarized or used before the independent Findings were frozen. It was not used by this review afterward either.

1.1.10 Only the exact Subject, its frozen predecessor and the frozen predecessor-Finding manifest were read for semantic comparison. No planning ledger was treated as authority.

## 1.2 Verdict

1.2.1 `mechanicalDisposition=PASS`.

1.2.2 `semanticDisposition=REJECT; SUCCESSOR-REQUIRED`.

1.2.3 `newFindingCount=21; severityCounts=P0:14;P1:7;P2:0;P3:0`.

1.2.4 `predecessorMapping=27/27`; `unqualifiedSemanticPreservation=8/27`; `presentButBlocked=18/27`; `materialRegression=1/27`.

1.2.5 `predecessorFindingIdentityMapping=22/22`; `sufficientRequirementDelta=3/22`; `partialRequirementDelta=19/22`; `closedFindingCount=0/22`.

1.2.6 `acceptedRequirementCount=0/49`; Output and vector-token presence is not implementation, Evidence or Acceptance.

1.2.7 `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`.

1.2.8 Repository visibility remains bindingly `PUBLIC`; this review neither changes visibility nor authorizes a future Private rollback.

1.2.9 The successor is a large and useful improvement over B0 v1, but accepting it would rely on requirements whose authority, concurrency, terminal and Public-disclosure semantics remain incomplete or contradictory.

# 2. Method and reproducibility

## 2.1 Freeze and source verification

2.1.1 The Subject SHA-256, line count and byte count matched the assigned identity before review.

2.1.2 `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb` matched `383 lines; 21252 bytes`.

2.1.3 `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355` matched `491 lines; 35747 bytes`.

2.1.4 The review compared source claims only within each frozen artifact's claim limit; no source was granted Authority credit.

## 2.2 Independent mechanical readers

2.2.1 Reader A parsed Requirement blocks with an independent Node.js reader, extracted the five fields, IDs, Outputs, vector sets, preservation/finding tags, references and dependencies, and used Kahn topological traversal for the graph.

2.2.2 Reader B independently used `awk`, `rg`, `sort` and `uniq` counts for headings, fields, Output/NVS IDs, predecessor/Finding identities and vector-table rows.

2.2.3 The two readers agreed on every requested mechanical denominator.

2.2.4 A separate resolver checked each source alias digest and normalized exact section/Finding locator against the frozen source bytes.

## 2.3 Semantic attack method

2.3.1 The review modeled an attacker able to replay or substitute receipts, race CAS/revocation/effects, control multiple nominal roles, present split ledger views, exploit filesystem path races and observe immutable Public Git history.

2.3.2 Every requirement was checked for a finite subject, authority source, input root, mutable head, linearization point, deterministic outcome, evidence root, invalidation path and non-authoritative unknown state.

2.3.3 Build-order dependencies were not accepted as proof of semantic Authority/Uses acyclicity.

2.3.4 Prose scenario names were not accepted as executable negative tests; Output tokens were not accepted as machine-bound output schemas.

# 3. Mechanical results

## 3.1 Requirement and field shape

| Check | Expected | Observed | Result |
|---|---:|---:|---|
| Requirement IDs | `B0V2REQ-000`–`048` | 49 contiguous, unique | PASS |
| Exact fields per Requirement | 5 | 49×5 = 245 | PASS |
| Missing/extra Requirement IDs | 0 | 0 | PASS |
| Unique Outputs | 49 | 49 | PASS |
| Unique NegativeVectorSet mappings | 49 | 49 | PASS |
| Predecessor `preserves` rows | 27 | 27 unique | PASS |
| Hostile `addresses` rows | 22 | 22 unique | PASS |

3.1.1 Every Requirement contained exactly one `statement`, `threatCauseImpact`, `requiredProof`, `dependencies` and `sourceBasis` field.

3.1.2 Every Requirement contained exactly one unique `B0V2OUT-nnn` and one unique `B0V2-NVS-nnn` token.

3.1.3 Token uniqueness proves registry shape only; Findings `B0V2-HR-F010` and `B0V2-HR-F011` explain why it does not prove executable vectors or implemented Outputs.

## 3.2 Dependency graph

| Check | Observed | Result |
|---|---:|---|
| Nodes | 49 | PASS |
| Edges | 233 | PASS |
| Dangling edges | 0 | PASS |
| Self edges | 0 | PASS |
| Duplicate edges | 0 | PASS |
| Forward edges | 0 | PASS |
| Topological nodes | 49/49 | PASS |
| Mechanical cycles | 0 | PASS |

3.2.1 The Requirement dependency graph is a valid backward-only DAG.

3.2.2 This PASS does not extend to the semantic Authority/Uses graph because that typed graph is absent; see `B0V2-HR-F003`.

## 3.3 Source references and locators

| Alias | Reference occurrences | Digest match | Locator resolution |
|---|---:|---:|---:|
| `B0V1` | 28 | 28/28 | 28/28 |
| `B0HR` | 0 | index entry matched | not referenced |
| `B0HRM` | 55 | 55/55 | 55/55 |
| Total sourceBasis references | 83 | 83/83 | 83/83 |

3.3.1 Unknown alias, wrong digest and unresolved locator counts were zero.

3.3.2 Claim usage was compatible: B0V1 references preserve predecessor wording/constraints and B0HRM references preserve exact Finding identities.

3.3.3 Public portability and physical-identity requirements still fail because the index mandates absolute home paths and omits current physical identity/supersession fields; see `B0V2-HR-F013`.

## 3.4 Negative-vector table

3.4.1 The table contains 49 set rows, each with exactly three semicolon-separated scenario labels, for a stated minimum denominator of 147 scenarios.

3.4.2 Executable immutable vector instances with per-vector IDs and exact inputs/mutations/results/Evidence are `0/147`; this is the blocker in `B0V2-HR-F010`.

# 4. Predecessor preservation audit

## 4.1 Interpretation

4.1.1 Structural preservation asks whether every `B0REQ-000`–`B0REQ-026` is mapped one-to-one. It passes `27/27`.

4.1.2 Semantic preservation asks whether the original obligation remains at least as strong and satisfiable. Eight rows are unqualified, eighteen remain present but blocked by successor defects, and one is materially weakened.

4.1.3 A `PRESENT-BUT-BLOCKED` row is not deleted, but its proof cannot be accepted until the referenced new Findings close.

## 4.2 One-to-one semantic table

| Predecessor | Successor | Semantic disposition | Blocking Finding(s) |
|---|---|---|---|
| `B0REQ-000` | `B0V2REQ-000` | PRESERVED | none |
| `B0REQ-001` | `B0V2REQ-001` | PRESENT-BUT-BLOCKED | `B0V2-HR-F001` |
| `B0REQ-002` | `B0V2REQ-002` | PRESENT-BUT-BLOCKED | `B0V2-HR-F003` |
| `B0REQ-003` | `B0V2REQ-003` | PRESENT-BUT-BLOCKED | `B0V2-HR-F001` |
| `B0REQ-004` | `B0V2REQ-004` | PRESERVED | none |
| `B0REQ-005` | `B0V2REQ-005` | PRESERVED | none |
| `B0REQ-006` | `B0V2REQ-006` | PRESENT-BUT-BLOCKED | `B0V2-HR-F004`, `B0V2-HR-F018` |
| `B0REQ-007` | `B0V2REQ-007` | PRESENT-BUT-BLOCKED | `B0V2-HR-F004` |
| `B0REQ-008` | `B0V2REQ-008` | PRESENT-BUT-BLOCKED | `B0V2-HR-F014` |
| `B0REQ-009` | `B0V2REQ-009` | PRESENT-BUT-BLOCKED | `B0V2-HR-F014` |
| `B0REQ-010` | `B0V2REQ-010` | PRESERVED | none |
| `B0REQ-011` | `B0V2REQ-011` | PRESERVED | none |
| `B0REQ-012` | `B0V2REQ-012` | PRESENT-BUT-BLOCKED | `B0V2-HR-F003`, `B0V2-HR-F006`, `B0V2-HR-F009` |
| `B0REQ-013` | `B0V2REQ-013` | PRESENT-BUT-BLOCKED | `B0V2-HR-F001`–`B0V2-HR-F003`, `B0V2-HR-F014` |
| `B0REQ-014` | `B0V2REQ-014` | PRESENT-BUT-BLOCKED | `B0V2-HR-F012`, `B0V2-HR-F013` |
| `B0REQ-015` | `B0V2REQ-015` | PRESERVED | none |
| `B0REQ-016` | `B0V2REQ-016` | PRESENT-BUT-BLOCKED | `B0V2-HR-F005`, `B0V2-HR-F006` |
| `B0REQ-017` | `B0V2REQ-017` | PRESENT-BUT-BLOCKED | `B0V2-HR-F005`, `B0V2-HR-F006` |
| `B0REQ-018` | `B0V2REQ-018` | PRESENT-BUT-BLOCKED | `B0V2-HR-F019` |
| `B0REQ-019` | `B0V2REQ-019` | PRESERVED | none |
| `B0REQ-020` | `B0V2REQ-020` | PRESERVED | none |
| `B0REQ-021` | `B0V2REQ-021` | PRESENT-BUT-BLOCKED | `B0V2-HR-F009`, `B0V2-HR-F011`, `B0V2-HR-F021` |
| `B0REQ-022` | `B0V2REQ-022` | PRESENT-BUT-BLOCKED | `B0V2-HR-F006`, `B0V2-HR-F007`, `B0V2-HR-F017` |
| `B0REQ-023` | `B0V2REQ-023` | PRESENT-BUT-BLOCKED | `B0V2-HR-F007`, `B0V2-HR-F017` |
| `B0REQ-024` | `B0V2REQ-024` | PRESENT-BUT-BLOCKED | `B0V2-HR-F006`, `B0V2-HR-F007` |
| `B0REQ-025` | `B0V2REQ-025` | MATERIAL-REGRESSION | `B0V2-HR-F016` |
| `B0REQ-026` | `B0V2REQ-026` | PRESENT-BUT-BLOCKED | `B0V2-HR-F008`, `B0V2-HR-F010` |

4.2.1 The material regression is precise: the predecessor required two generations to exercise QA/review/approval/CAS/readback and stale-grant behavior, while the successor shadow generations structurally exclude operational pointer/Permit behavior and supply no equivalence or later two-generation operational proof.

4.2.2 Deterministic IDs and the no-randomness invariant are preserved. The Subject explicitly requires `Math.random=0` and `crypto.randomUUID=0`; this review introduces neither.

# 5. Predecessor hostile-Finding remediation audit

## 5.1 Interpretation and counts

5.1.1 The one-to-one identity denominator passes `22/22`; no predecessor Finding is merged, omitted or renumbered.

5.1.2 `SUFFICIENT-REQUIREMENT-DELTA` means the successor text adequately specifies the missing obligation, not that its Output, tests or Evidence exist.

5.1.3 Only `B0-HR-F001`, `B0-HR-F002` and `B0-HR-F020` meet that requirement-text threshold without a new same-obligation defect. The other nineteen are partial.

5.1.4 Because all implementation Outputs, executable Evidence and accepted reviews are absent, `closedFindingCount=0/22` regardless of requirement-text sufficiency.

## 5.2 One-to-one disposition table

| Predecessor Finding | Candidate delta | Semantic disposition | New blocker(s) |
|---|---|---|---|
| `B0-HR-F001` | `B0V2REQ-027` | SUFFICIENT-REQUIREMENT-DELTA | implementation/evidence still absent |
| `B0-HR-F002` | `B0V2REQ-028` | SUFFICIENT-REQUIREMENT-DELTA | implementation/evidence still absent |
| `B0-HR-F003` | `B0V2REQ-029` | PARTIAL | `B0V2-HR-F001`, `B0V2-HR-F015` |
| `B0-HR-F004` | `B0V2REQ-030` | PARTIAL | `B0V2-HR-F002`, `B0V2-HR-F003` |
| `B0-HR-F005` | `B0V2REQ-031` | PARTIAL | `B0V2-HR-F002`, `B0V2-HR-F003`, `B0V2-HR-F014`, `B0V2-HR-F020` |
| `B0-HR-F006` | `B0V2REQ-032` | PARTIAL | `B0V2-HR-F004`, `B0V2-HR-F018` |
| `B0-HR-F007` | `B0V2REQ-033` | PARTIAL | `B0V2-HR-F004` |
| `B0-HR-F008` | `B0V2REQ-034` | PARTIAL | `B0V2-HR-F005`, `B0V2-HR-F006` |
| `B0-HR-F009` | `B0V2REQ-035` | PARTIAL | `B0V2-HR-F014` |
| `B0-HR-F010` | `B0V2REQ-036` | PARTIAL | `B0V2-HR-F015` |
| `B0-HR-F011` | `B0V2REQ-037` | PARTIAL | `B0V2-HR-F012` |
| `B0-HR-F012` | `B0V2REQ-038` | PARTIAL | `B0V2-HR-F003`, `B0V2-HR-F006`, `B0V2-HR-F009` |
| `B0-HR-F013` | `B0V2REQ-039` | PARTIAL | `B0V2-HR-F009`, `B0V2-HR-F011` |
| `B0-HR-F014` | `B0V2REQ-040` | PARTIAL | `B0V2-HR-F007`, `B0V2-HR-F017` |
| `B0-HR-F015` | `B0V2REQ-041` | PARTIAL | `B0V2-HR-F017`, `B0V2-HR-F020` |
| `B0-HR-F016` | `B0V2REQ-042` | PARTIAL | `B0V2-HR-F006`, `B0V2-HR-F007` |
| `B0-HR-F017` | `B0V2REQ-043` | PARTIAL | `B0V2-HR-F016` |
| `B0-HR-F018` | `B0V2REQ-044` | PARTIAL | `B0V2-HR-F007`, `B0V2-HR-F008` |
| `B0-HR-F019` | `B0V2REQ-045` | PARTIAL | `B0V2-HR-F019` |
| `B0-HR-F020` | `B0V2REQ-046` | SUFFICIENT-REQUIREMENT-DELTA | exact external decisions/evidence still absent and safely BLOCKED |
| `B0-HR-F021` | `B0V2REQ-047` | PARTIAL | `B0V2-HR-F004`, `B0V2-HR-F018` |
| `B0-HR-F022` | `B0V2REQ-048` | PARTIAL | `B0V2-HR-F010`, `B0V2-HR-F011`, `B0V2-HR-F021` |

# 6. New Finding summary

## 6.1 P0 blockers

| Finding | Short title |
|---|---|
| `B0V2-HR-F001` | L0 Tal trust-anchor admission is still circular |
| `B0V2-HR-F002` | Genesis receipt lacks exact atomic one-use semantics |
| `B0V2-HR-F003` | typed semantic Authority/Uses graph is absent |
| `B0V2-HR-F004` | Permit/effect atomicity has no realizable transaction boundary |
| `B0V2-HR-F005` | revoke-wins lacks shared linearization |
| `B0V2-HR-F006` | mutable security heads are not completely fenced |
| `B0V2-HR-F007` | terminal and reconciliation semantics contradict |
| `B0V2-HR-F008` | transition matrix lacks executable guards/reasons |
| `B0V2-HR-F009` | Acceptance envelope denominator remains open |
| `B0V2-HR-F010` | negative vectors are labels, not executable instances |
| `B0V2-HR-F012` | Public commitments leak membership/linkability |
| `B0V2-HR-F014` | role matrix lacks mandatory separation/effective-controller identity |
| `B0V2-HR-F015` | crypto agility/compromise transition is downgrade-unsafe |
| `B0V2-HR-F016` | G1/G2 shadows regress operational two-generation proof |

## 6.2 P1 blockers

| Finding | Short title |
|---|---|
| `B0V2-HR-F011` | Output IDs lack machine-bound schemas |
| `B0V2-HR-F013` | absolute home paths leak and are non-portable |
| `B0V2-HR-F017` | readback journal is not tied to the authoritative revision |
| `B0V2-HR-F018` | filesystem scope misses symlink/TOCTOU/durability controls |
| `B0V2-HR-F019` | evidence custody lacks anti-equivocation witnessing |
| `B0V2-HR-F020` | independent validators may share one failure mode |
| `B0V2-HR-F021` | N/A authority can waive foundational security controls |

6.2.1 Full defect, attack, impact, required delta, acceptance predicate and no-merge identity are frozen in the manifest identified in §1.1.6–§1.1.8.

# 7. Requested security-property verdicts

## 7.1 Authority and bootstrap

| Property | Verdict | Evidence |
|---|---|---|
| Tal is named as sole owner | PASS-AS-TEXT | `B0V2REQ-001` |
| Tal trust is externally non-circular | FAIL | `B0V2-HR-F001` |
| Exact mandate receipt is mandatory | PASS-AS-TEXT | `B0V2REQ-003`; blocked until real receipt |
| Genesis/Review authority is semantically acyclic | FAIL | `B0V2-HR-F002`, `B0V2-HR-F003`, `B0V2-HR-F014` |
| Subject/envelope detachment | PARTIAL | graph-reader obligation exists; typed semantic graph absent |

## 7.2 Concurrency, state and acceptance

| Property | Verdict | Evidence |
|---|---|---|
| Single-use Permit exact subject/head | PASS-AS-TEXT | `B0V2REQ-007` |
| Permit consumption atomic with effect | FAIL | `B0V2-HR-F004` |
| Revoke-wins across epoch/time/effect | FAIL | `B0V2-HR-F005`, `B0V2-HR-F006` |
| Complete Acceptance envelope | FAIL | `B0V2-HR-F009`, `B0V2-HR-F011` |
| Split-brain/readback safety | FAIL | `B0V2-HR-F007`, `B0V2-HR-F017` |
| Finite complete safe terminals | FAIL | `B0V2-HR-F007`, `B0V2-HR-F008` |
| G1/G2 zero operational authority | PASS-AS-TEXT | `B0V2REQ-025`, `B0V2REQ-043` |
| G1/G2 prove operational parity | FAIL | `B0V2-HR-F016` |

## 7.3 Cryptography, identity and Public safety

| Property | Verdict | Evidence |
|---|---|---|
| Deterministic IDs; no random ID APIs | PASS-AS-TEXT | `B0V2REQ-010` |
| SHA-256/Ed25519 explicit | PASS-AS-TEXT | `B0V2REQ-036` |
| algorithm/key/trust rotation and compromise safe | FAIL | `B0V2-HR-F001`, `B0V2-HR-F015` |
| Public visibility immutable | PASS-AS-TEXT | §§1.1.5,6.3.1 |
| Public commitments hide membership/linkability | FAIL | `B0V2-HR-F012` |
| Public provenance is portable/minimal | FAIL | `B0V2-HR-F013` |
| filesystem writes remain in exact scope | FAIL | `B0V2-HR-F018` |

## 7.4 Evidence, roles and tests

| Property | Verdict | Evidence |
|---|---|---|
| 83 source roots/locators syntactically resolve | PASS | §3.3 |
| semantic Uses graph complete | FAIL | `B0V2-HR-F003` |
| role/conflict denominator safely normative | FAIL | `B0V2-HR-F014` |
| Evidence append order/fork detection | PARTIAL | `B0V2-HR-F019` |
| 49 vector-set mappings exist | PASS | §3.4 |
| negative vectors are executable | FAIL | `B0V2-HR-F010` |
| independent parser/validator proof is meaningful | FAIL | `B0V2-HR-F020` |

# 8. Required successor acceptance path

## 8.1 Non-negotiable successor work

8.1.1 Create B0 v3 as a new immutable Subject; do not patch the reviewed v2 bytes.

8.1.2 Preserve `B0V2-HR-F001`–`B0V2-HR-F021` one-to-one with distinct noMerge identities and acceptance predicates.

8.1.3 Preserve all 27 predecessor Requirements, restore operational two-generation parity without recursive authority and retain every one of the 22 predecessor Findings in the closure denominator.

8.1.4 Add machine-bound registries for typed semantic edges, Outputs, vector instances, state/event/reason/terminal guards, security snapshot heads and the exact Acceptance envelope.

8.1.5 Replace the self-selecting trust-profile path with an independently authenticated L0 anchor and define a separate atomic GenesisPermit path.

8.1.6 Resolve cross-store atomicity and revoke-wins through explicit linearization/fencing strategies; unsupported effect classes remain denied.

8.1.7 Default Public treatment of non-public bytes to no public commitment; separately solve portable provenance, unlinkability and filesystem path safety.

8.1.8 Make foundational cryptographic, authority, role-separation, revocation, terminal and Public-disclosure invariants non-waivable.

## 8.2 Review and acceptance sequence

8.2.1 Freeze the v3 Subject exact bytes, digest and physical identity.

8.2.2 Run Producer QA only after the Subject freeze.

8.2.3 Give two independently appointed hostile Reviewers the same presealed packet; both must satisfy the effective-controller and implementation-independence predicates.

8.2.4 Compare and reconcile losslessly. Any open P0/P1 creates another successor; no in-place edit can change this v2 verdict.

8.2.5 Tal exact-root approval is meaningful only after the non-circular external trust-anchor path exists. A blanket message or this review is not approval.

8.2.6 Until all successor Requirements have implemented Outputs, executable Evidence and independently accepted closure, `acceptedRequirementCount=0`, `B0=ABSENT` and `Gate29=BLOCKED`.

# 9. Final conclusion

## 9.1 Decision

9.1.1 The assigned mechanical claims are verified: `49×5`, `27/27`, `22/22`, 49 unique Outputs, 49 unique vector-set mappings, 83 exact source references, 233 valid backward edges and an acyclic 49-node Requirement graph.

9.1.2 Those results do not prove the semantic safety of the bootstrap authority. Twenty-one distinct open blockers remain, including fourteen P0 blockers.

9.1.3 `finalVerdict=REJECT-B0-V2; BUILD-IMMUTABLE-B0-V3-SUCCESSOR; DO-NOT-ACCEPT; DO-NOT-USE-AS-AUTHORITY`.

9.1.4 No Product, Git, GitHub, provider or external-state mutation was performed or authorized by this review.
