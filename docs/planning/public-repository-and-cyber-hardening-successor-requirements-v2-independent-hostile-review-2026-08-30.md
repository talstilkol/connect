# 1. Connect — Public-repository and cyber-hardening successor requirements v2 independent hostile review

## 1.1 Review identity and frozen Subject

1.1.1 artifactId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-V2-INDEPENDENT-HOSTILE-REVIEW-2026-08-30.

1.1.2 artifactClass=DETACHED-INDEPENDENT-HOSTILE-PLANNING-REVIEW;NOT-AUTHORITY;NOT-IMPLEMENTATION;NOT-ACCEPTANCE;NOT-A-GITHUB-OR-PROVIDER-RECEIPT.

1.1.3 Subject path=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md.

1.1.4 required and observed Subject SHA-256=322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a.

1.1.5 required and observed Subject physical identity=781 lines;41862 bytes.

1.1.6 companion Findings Manifest path=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-independent-hostile-review-findings-manifest-2026-08-30.md.

1.1.7 review boundary=the exact frozen Subject and the read-only predecessor/observation inputs listed in section 2. No Subject, Product code, Git object, Git ref, GitHub setting, provider state, credential, Release, Deployment or external system was changed.

1.1.8 repository visibility is a binding invariant: PUBLIC. Changing visibility to Private is not a remediation, rollback or incident action.

1.1.9 the two Producer-QA artifacts for this Subject were deliberately not opened or used. All checks and Findings below were derived independently.

## 1.2 Verdict first

1.2.1 verdict=REJECT-AS-SEMANTICALLY-EXECUTABLE-OR-ACCEPTANCE-READY.

1.2.2 The Subject is a materially stronger planning candidate than its predecessors and is mechanically well formed, but it is not an executable closed control system. It preserves 32 predecessor Finding identities while supplying zero independently accepted Requirements, zero independently closed predecessor Findings and zero operational evidence. This review adds 27 distinct non-merged Findings.

1.2.3 frozen Finding denominator=59: 32 predecessor Findings preserved separately plus 27 new Findings.

1.2.4 severity totals=P0 31;P1 27;P2 1;P3 0.

1.2.5 disposition totals=OPEN 59/59;CLOSED 0/59;ACCEPTED 0/59;MERGED 0;SUPPRESSED 0.

1.2.6 required current state:

| State | Independent result |
|---|---|
| Subject Acceptance | 0 |
| independently accepted Requirements | 0/52 |
| independently closed predecessor Findings | 0/32 |
| independently closed new Findings | 0/27 |
| Public Push Permit | ABSENT |
| privileged workflow/release Permit | ABSENT |
| repository visibility | PUBLIC |
| Gate29 | BLOCKED |
| development freeze | ACTIVE |

1.2.7 The live observations do not reveal a false explicit claim that current GitHub hardening is already active: the Subject itself states configuration credit=0. They do reveal that the acceptance model does not bind the current readback roots or all current blocking facts, so the future-looking prose cannot be promoted to current control credit.

# 2. Inputs actually read

## 2.1 Exact input identity

| Input | Observed SHA-256 | Lines | Bytes |
|---|---|---:|---:|
| Subject | 322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a | 781 | 41862 |
| predecessor hostile-review report | af7bd90255fe0cb037d19ad8138609a3b35df50c33219470c845dec15919c6d5 | 495 | 30529 |
| predecessor Findings Manifest | a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4 | 573 | 41555 |
| GitHub Public hardening live readback v3 | 0dea5b462e4bff0d1866a585a585f7e0d0405609ad21ade4e8ecac1210e521cb | 287 | 21761 |
| Legacy analysis quarantine observation v2 | 00d8c970eb6f8a747d6353f309bc0c0109df6dd454582447325f123cf512df7c | 187 | 10602 |
| Public-repository license-strategy observation | d5d8267370435cba5fcaa481f3af8a8d60641e319dfc3237ce3abd7a834b3f96 | 137 | 10798 |
| Public-repository Secret-scan observation v1 | 3ec83742da420a92d243b96cc0dae77112bb206fbe9f4d7a179a0f967d315755 | 271 | 12935 |
| Public-repository Secret-scan observation v2 | 3e8bb89858b660e8fe923643301c7225cafd622acdca6842a913a1f6d9bb9983 | 205 | 9083 |

2.1.1 all paths used by this review are repository-relative. The Subject itself contains zero host-absolute workstation paths, zero file URI locators and zero parent-relative path locators.

2.1.2 current observations are bounded read-only observations, not frozen external authority, continuous monitors or accepted operational Evidence. Secret-scan v2 supersedes v1 only for the corrected remote-history denominator and preserves v1 Directory output solely as a historical mutable snapshot.

## 2.2 Claim limits

2.2.1 no fetch, API mutation, GitHub mutation, provider mutation, workflow execution, Secret validity check, credential rotation, build, test, Commit, Push, Release or Deployment was performed.

2.2.2 the Secret-scan observation exposes counts and private-report commitments only. This review did not open either private report and records no candidate value, file locator, provider identity or exploit-enabling detail.

2.2.3 local remote-tracking refs remain stale-capable. Live branch head, complete remote ref universe, GitHub-only objects, collaborators, Webhooks, Apps, OAuth, Secrets, environments and provider state remain unknown/unavailable unless the observation explicitly states otherwise.

# 3. Independent mechanical checks

## 3.1 Requirement shape and dependency graph

3.1.1 Requirement IDs=52/52 unique and contiguous, PRCH2-REQ-000 through PRCH2-REQ-051.

3.1.2 field cardinality=52 requirement fields;52 sourceBasis fields;52 dependencies fields;52 proof fields;52 failure fields.

3.1.3 parsed dependency graph has zero unknown Requirement targets, zero self edges and zero forward-numbered edges.

3.1.4 the transitive dependency closure of PRCH2-REQ-051 contains all 52 Requirement IDs.

3.1.5 these facts establish markdown shape and declared-edge topology only. They do not establish complete semantic dependencies, unique producers, machine-executable predicates or operational effects.

## 3.2 Predecessor identity preservation

3.2.1 the section 3 crosswalk contains one row for each PRCS-HR-F001 through PRCS-HR-F032.

3.2.2 the Subject expressly limits that crosswalk to identity preservation, says it closes no Finding, and reports independently closed Findings=0/32.

3.2.3 accordingly, all 32 predecessor Findings are retained in the companion manifest under distinct records and original severities. None is merged into a new Finding or into another predecessor Finding.

## 3.3 Positive planning properties retained

3.3.1 PUBLIC is explicit and non-waivable; a spill, rollback or incident cannot use Private visibility as a repair.

3.3.2 the Subject distinguishes branch and tag Rulesets, Push and privileged Release gates, untrusted and privileged workflow jobs, provider-neutral OIDC, source versus build SLSA claims, Public versus private Evidence, and configured control versus readback.

3.3.3 unknown, stale, inaccessible and unverified inputs are stated to fail closed.

3.3.4 official URL observations are denied implementation or compliance credit until exact source custody exists.

3.3.5 these are useful planning constraints. They do not cure the Findings below because named candidate objects, future readbacks and two-reader prose are not produced or executed evidence.

# 4. Live-truth comparison

## 4.1 Current facts that agree with the Subject's zero-credit disposition

| Dimension | Read-only observed state | Independent consequence |
|---|---|---|
| visibility | talstilkol/connect displayed Public | PUBLIC remains binding; no security PASS follows |
| default Branch | main displayed; GitHub warned it is not protected | branch-governance control is absent |
| Rulesets | zero displayed | branch/tag contract is not configured |
| Actions policy | allow all; full-SHA requirement unchecked | exact Action allowlist and immutable-reference enforcement are absent |
| external contributors | approval required only for first-time contributors | the all-external policy is absent |
| workflow token defaults | read-only default; Actions PR approval off | useful baseline only; explicit job permissions still govern |
| security features | Dependency graph and Dependabot signals enabled; CodeQL, Secret Protection and Private Vulnerability Reporting disabled | detection fragments exist; hardening Acceptance remains zero |
| repository topology | an empty outer Git directory and a nested Product repository exist | every future command and receipt must bind the Product repository root |
| Product worktree | 416 status entries observed | ownership and publication classification are unresolved |
| license | interim no-license, Contributions closed, Release/package blocked | Legal/ownership decision remains absent |
| Legacy sibling | direct normal Product staging is topology-blocked, but import/build-context/history/semantic reuse remains unresolved | quarantine and taint controls remain mandatory |
| Secret scan | v2 acquired 5 heads plus 6 Pull Request refs and 307 reachable Commits;merge-aware scan returned 15 rows over 6 coordinates;0 cleared;second scanner coverage 0;current worktree denominator absent | confirmed live Secrets=0 is not cleanliness; Public Push remains rejected |

## 4.2 False-claim analysis

4.2.1 the Subject's statements that live GitHub/provider credit=0, independently accepted Requirements=0/52, independently closed Findings=0/32, Gate29=BLOCKED and PUBLIC unchanged are consistent with the later readbacks.

4.2.2 no current Ruleset, CodeQL, Secret Protection, PVR, exact remote head, complete Secret clearance, license grant or Organization ownership may be inferred from the Subject's future requirements.

4.2.3 the semantic defect is omission, not a direct current-state lie: the acceptance inputs do not name and freeze the later live-readback, Legacy, license or Secret-observation roots, and several current blocking predicates have no sole producer or gate.

# 5. Hostile semantic results

## 5.1 Finding totals

5.1.1 inherited records=32, PRCH2V2-IHR-F001 through PRCH2V2-IHR-F032. Each retains one original PRCS-HR Finding as its noMergeKey and remains open with zero closure credit.

5.1.2 new records=27, PRCH2V2-IHR-F033 through PRCH2V2-IHR-F059.

5.1.3 all individual severities, evidence, impacts, remediations, closure tests and noMergeKeys are authoritative only in the companion Findings Manifest.

## 5.2 New Finding index

| ID | Severity | Short result |
|---|---|---|
| PRCH2V2-IHR-F033 | P0 | exact content-addressed Public allowlist object is absent |
| PRCH2V2-IHR-F034 | P0 | repository-root, worktree/index and user-change preservation gate is absent |
| PRCH2V2-IHR-F035 | P0 | remote ref/object denominator and expected-old push transaction are incomplete |
| PRCH2V2-IHR-F036 | P0 | Legacy quarantine, import taint and outer-context denial have no producer |
| PRCH2V2-IHR-F037 | P1 | generated-output provenance and publication classification are incomplete |
| PRCH2V2-IHR-F038 | P0 | open Secret candidates and missing second-scanner/custom coverage are not admitted |
| PRCH2V2-IHR-F039 | P1 | PII/customer-data control denominator is under-specified |
| PRCH2V2-IHR-F040 | P0 | interim no-license/contributions/release state is not encoded |
| PRCH2V2-IHR-F041 | P0 | every-Public-byte ownership and provenance denominator is absent |
| PRCH2V2-IHR-F042 | P0 | producer registry has a bootstrap/self-production contradiction |
| PRCH2V2-IHR-F043 | P0 | conformance and negative-vector registries are self/forward circular |
| PRCH2V2-IHR-F044 | P0 | canonical machine grammar and causal evaluator operations are absent |
| PRCH2V2-IHR-F045 | P1 | two-reader/parser/runner independence predicates are vacuous |
| PRCH2V2-IHR-F046 | P0 | provider-specific OIDC policies are required but have no producer |
| PRCH2V2-IHR-F047 | P0 | Legal and D02/D25 authority inputs are undeclared hidden dependencies |
| PRCH2V2-IHR-F048 | P0 | closure hardcodes only the old 32-Finding denominator |
| PRCH2V2-IHR-F049 | P0 | scoped open-P0/P1 zero predicate can exclude Findings |
| PRCH2V2-IHR-F050 | P0 | GitHub control-plane change Permit and rollback are absent |
| PRCH2V2-IHR-F051 | P0 | current live-readback roots and deficits are not acceptance dependencies |
| PRCH2V2-IHR-F052 | P0 | deployment target/change/drift/rollback state machine is absent |
| PRCH2V2-IHR-F053 | P0 | release rollback, revoke/yank and consumer-notification workflow is absent |
| PRCH2V2-IHR-F054 | P0 | general cyber compromise incident lifecycle is absent |
| PRCH2V2-IHR-F055 | P1 | dependency/SBOM vulnerability lifecycle is incomplete |
| PRCH2V2-IHR-F056 | P1 | repository-relative path and locator grammar is not normative |
| PRCH2V2-IHR-F057 | P1 | sourceBasis shorthand is not canonically parseable |
| PRCH2V2-IHR-F058 | P1 | Evidence custody, trusted time and immutable receipt lifecycle are missing |
| PRCH2V2-IHR-F059 | P1 | reproducible build and complete build-material provenance are not required |

# 6. Requested-dimension disposition

## 6.1 Exact control audit

| Requested dimension | Result | Principal Findings |
|---|---|---|
| Public allowlist | REJECT | F033,F034,F041 |
| history, refs and objects | REJECT | F035,F038 |
| worktree/index/user changes | REJECT | F034 |
| generated artifacts/build contexts | REJECT | F036,F037,F059 |
| Secrets | REJECT | inherited F006,F021,F022;new F038 |
| PII/customer data | REJECT | inherited F006,F021;new F039 |
| license and contribution rights | REJECT | inherited F024;new F040,F041 |
| provenance and attestations | REJECT | inherited F005,F025,F031;new F041,F059 |
| dependencies and SBOM | REJECT | inherited F007,F018,F026;new F055,F059 |
| Actions and forks | REJECT | inherited F002,F003,F013-F019,F031;new F050,F051 |
| Rulesets/review | REJECT | inherited F001,F008,F013-F016,F032;new F048-F051 |
| deploy | REJECT | inherited F004,F019;new F046,F052 |
| release | REJECT | inherited F001,F005,F020,F025;new F053,F059 |
| rollback | REJECT | F050,F052,F053 |
| incidents | REJECT | inherited F006,F020-F023;new F054 |
| producer/dependency closure | REJECT | F042,F043,F046,F047 |
| executable proof | REJECT | F043-F045,F058 |
| mutable evidence/time | REJECT | inherited F010,F030;new F051,F058 |
| absolute paths/unsafe disclosure | bounded Subject scan PASS for no present host path; normative policy REJECT | F039,F056,F058 |

## 6.2 Why the declared topological order is not enough

6.2.1 declared Requirement edges are acyclic, but PRCH2-REQ-004 must catalog every output while itself being an output and its proof forbids self-production.

6.2.2 PRCH2-REQ-042 says it covers every Requirement although it precedes and does not depend on Requirements 043-051. PRCH2-REQ-043 repeats the defect for hostile vectors and includes itself in the literal every-Requirement denominator.

6.2.3 proof statements repeatedly require unnamed or unrooted external products such as provider-specific policies, Legal selection, trusted time, two independent readers and future API readbacks. These are semantic dependencies not represented by the mechanically valid edge graph.

## 6.3 Why current evidence cannot close the gap

6.3.1 the live GitHub observation is a bounded UI snapshot with several unknown surfaces and no server timestamp or response-rooted API receipt.

6.3.2 Secret-scan v2 corrected the local-only denominator by scanning a mirror with 5 heads, 6 Pull Request refs and 307 reachable Commits, including merge-aware diffs. It still used one scanner, left 15 rows over 6 coordinates unresolved, and reports no second scanner, no provider-specific custom-pattern closure, incomplete GitHub-only coverage, no unreachable-object/fork completeness and no current frozen worktree/index/allowlist scan.

6.3.3 the license observation selects only an interim fail-closed state and reports a proven Public-byte ownership denominator of zero.

6.3.4 the Legacy observation corrects the direct-staging model but preserves import, build-context, history duplication, semantic reuse and wrong-root risk.

6.3.5 therefore none of these observations grants implementation, control-operation or Acceptance credit; each instead supplies blocking facts that a successor must bind.

# 7. Required repair order

## 7.1 Core path

7.1.1 freeze a successor input manifest that includes the exact current GitHub, Legacy, license and Secret-observation roots, while retaining their bounded claim classes.

7.1.2 repair the object/producer bootstrap and define a machine grammar for every object, field, Set, terminal, locator, evaluator operation, Evidence receipt and independence proof.

7.1.3 produce repository-root, remote-ref/object, worktree/index, generated-output, Legacy-taint and exact Public-allowlist registries before any Push Permit can exist.

7.1.4 create private candidate/incident Evidence custody and complete the Secret denominator with the same frozen snapshot, a second independent scanner, real selected-provider custom patterns and private triage.

7.1.5 encode the interim no-license/contributions/release state and produce an every-Public-byte ownership/provenance denominator before any Legal target license may be admitted.

7.1.6 create separate GitHub control-plane, Push, deployment and release change state machines with expected-old state, one-use authority, post-change readback, rollback and incident transitions.

7.1.7 remove the 32-only closure ceiling. Reconciliation and Acceptance must include every open Finding from every admitted review, including all 27 new Findings, without scope suppression.

7.1.8 only after rooted negative execution and independent operational readback may a detached acceptance evaluator consider open counts. Any absent, stale, unknown, conflicting or inaccessible input remains BLOCKED.

# 8. Final disposition

8.1 mechanically well-formed Requirement rows=52/52.

8.2 semantically executable accepted Requirements=0/52.

8.3 preserved predecessor Findings=32/32;closed=0/32.

8.4 new Findings=27;closed=0/27.

8.5 total Findings=59;P0=31;P1=27;P2=1;P3=0.

8.6 verdict=REJECT;Acceptance=0;Public Push Permit=ABSENT;privileged workflow/release Permit=ABSENT.

8.7 repository remains PUBLIC;Gate29 remains BLOCKED;development freeze remains ACTIVE.

8.8 no implementation or mutation is authorized by this review.
