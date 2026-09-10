# 1. Connect — D02-A9 independent hostile review Findings Manifest

## 1.1 Identity and denominator

1.1.1 `manifestId=CONNECT-D02-A9-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30-R1`.

1.1.2 Reviewed Subject SHA-256=`29b2dbd2e89b2aee362659891a9734539714d159b69f5a41a0e6918c0feef5ad`; package-envelope SHA-256=`5d4ba11f4abc2a3df146b02df7c64162d6d3cbc7c59e1d31c10ae816a7f3b503`; content root=`21ff424bbc24c8b1fd7cdced4223a1c95853c6399495cdb24b1dbf4a0cd6a856`.

1.1.3 Exact non-merged Finding denominator=`8`; IDs=`D02-A9-IHR-F001`–`D02-A9-IHR-F008`; holes/duplicates=`0`.

1.1.4 Severity denominator=`0 P0+6 P1+2 P2+0 P3`; state denominator=`8 OPEN+0 CLOSED`.

1.1.5 This manifest grants no waiver, merge, D02 Acceptance, source/model/profile/account/Legal/Eval acceptance, AiAdmission, RuntimePermit, Gate29 authority, freeze lift, Push, Release or Deployment permission.

# 2. Atomic Findings

## 2.1 Complete one-to-one manifest

| Finding ID | Severity | State | Failed A8 closure | Exact evidence | Defect | Failure/attack | Required remediation | Independent closure test | noMergeKey |
|---|---:|---|---|---|---|---|---|---|---|
| `D02-A9-IHR-F001` | `P1` | `OPEN` | `D02-A8-IHR-F001` | Reader A 183–186, 233–237; no schema for semantic registry/receipts/DAG/appointments/machine/controls/reports; in-memory policy mutations=`PASS` | Closed-world schemas cover only snapshot, transition and envelope while normative policy artifacts are hand-projected. | Reusable prompt, model, tool/profile, Tenant/account, Legal/deletion and approval state changes can coexist with Reader A PASS. | Closed versioned schemas and independently executed validators for every normative artifact; parsed fields drive every predicate/counter. | Every schema field/keyword/unknown-field mutation across every artifact blocks both Readers; domain-member survivors=`0`. | `D02-A9-IHR-F001` |
| `D02-A9-IHR-F002` | `P1` | `OPEN` | `D02-A8-IHR-F002` | Reader A 167–172; Reader B 212–225; nine controls supply their own predicate Booleans | Positive satisfiability is asserted, not derived from typed rooted evidence. | All-true labels reach the positive terminal without authority or evidence instances. | Deterministic global reducer over rooted non-authorizing fixtures; real state remains blocked. | Every positive conjunct is computed from fixture bytes and its one-field mutation blocks; no expected-to-actual flow. | `D02-A9-IHR-F002` |
| `D02-A9-IHR-F003` | `P1` | `OPEN` | `D02-A8-IHR-F002` | Reader A 174, 222–231; Reader B 227–229, 329–342; critical-field operation-key counterexample | Operation identity and reducer omit authority/time/expiry/revocation/CAS/consume/post-readback fields and do not enforce machine rule prose. | Expired external ACCEPT and weakened CAS/replay/recovery rules return PASS; different critical operations share one key. | Total class-specific lifecycle reducer and key binding every authority field, current head, result and recovery state. | Full crash/interleaving/time/revocation/replay/CAS matrix; key collisions=`0`; all unsafe schedules terminate blocked. | `D02-A9-IHR-F003` |
| `D02-A9-IHR-F004` | `P1` | `OPEN` | `D02-A8-IHR-F004` | generator 163–176; semantic member `D02A9-SM-01-0060`; old D18 PRIVATE row and current D18-A2 PUBLIC row | Disposition is role/regex based and gives contradictory historical/current rules active generic preservation. | Superseded PRIVATE remains `PRESERVE-AS-SEMANTIC-CONSTRAINT`, so byte completeness does not establish semantic succession. | Active clause/table extraction, conflict sets, authority ordering and concrete preserve/supersede/reject/current-control targets. | PRIVATE row rooted as superseded by D18-A2; generic/self-target-only and contradictory active dispositions=`0`. | `D02-A9-IHR-F004` |
| `D02-A9-IHR-F005` | `P1` | `OPEN` | `D02-A8-IHR-F005` | Reader A 257–261, 287–297; Reader B 385–397, 454–464; standard rerun=`PASS` with checked=`0` | Source refresh invocation is optional and zero checked sources satisfy PASS. | Omitted capture directory is indistinguishable from `11/11 MATCH` at the verdict boundary. | Mandatory rooted capture set and `checked==11` for fresh PASS; explicit non-fresh offline terminal. | Omitted/empty/partial/unavailable capture set fails; exact eleven alone yield match. | `D02-A9-IHR-F005` |
| `D02-A9-IHR-F006` | `P2` | `OPEN` | `D02-A8-IHR-F005` | source refresh functions return only match/changed/unavailable; no age/conflict/locator evaluation | Declared stale, conflict, claim-locator and resolved-authority semantics are metadata only. | Old or internally conflicting claims can lack the promised typed failure terminal. | Executable extractor, locator outputs, trusted freshness cut, conflict set and resolved-authority checks. | Stale/missing-locator/conflict/domain/extractor/unavailable/change vectors reach exact distinct terminals in both Readers. | `D02-A9-IHR-F006` |
| `D02-A9-IHR-F007` | `P1` | `OPEN` | `D02-A8-IHR-F001` | Reader A 235 versus Reader B 348; PRIVATE live-readback mutation=`PASS/READER-EXCEPTION` | Readers implement different PUBLIC predicates and the corpus omits the divergent field. | Stored parity can remain true while one Reader accepts PRIVATE state. | Independently authored reader profiles plus complete-field shared normative mutation matrix and exact terminal parity. | Every field accepted by either Reader is mutated; survivor/parity mismatch=`0/0`, including PUBLIC live state. | `D02-A9-IHR-F007` |
| `D02-A9-IHR-F008` | `P2` | `OPEN` | `D02-A8-IHR-F003` | Reader A 91–94 and Reader B 90–96 perform lexical prefix checks only; current member symlinks=`0/83` | Member and parent symlinks are followed without realpath confinement/no-follow enforcement. | A symlink to identical outside bytes preserves SHA/extent/root while violating repository provenance. | Reject symlinks/non-regular components; no-follow read plus pre/post canonical realpath containment. | File/parent symlink, hardlink-policy, TOCTOU and outside-realpath vectors all block; regular baseline remains `83/83`. | `D02-A9-IHR-F008` |

# 3. Claimed-closure disposition

## 3.1 Exact seven-row result

| A8 Finding | Independent state | New blockers | Credit |
|---|---|---|---:|
| `D02-A8-IHR-F001` | `REJECTED-OPEN` | `D02-A9-IHR-F001`, `D02-A9-IHR-F007` | `0` |
| `D02-A8-IHR-F002` | `REJECTED-OPEN` | `D02-A9-IHR-F002`, `D02-A9-IHR-F003` | `0` |
| `D02-A8-IHR-F003` | `REJECTED-OPEN` | `D02-A9-IHR-F008` | `0` |
| `D02-A8-IHR-F004` | `REJECTED-OPEN` | `D02-A9-IHR-F004` | `0` |
| `D02-A8-IHR-F005` | `REJECTED-OPEN` | `D02-A9-IHR-F005`, `D02-A9-IHR-F006` | `0` |
| `D02-A8-IHR-F006` | `INDEPENDENTLY-SUBSTANTIATED` | none | `1` |
| `D02-A8-IHR-F007` | `INDEPENDENTLY-SUBSTANTIATED` | none | `1` |

3.1.1 Exact closure result=`2/7 substantiated`; rejected/open=`5/7`; merge/waiver/range-credit=`0`; duplicated credit=`0`.

3.1.2 The two substantiated rows are Finding dispositions only. They are not A9 Acceptance and cannot satisfy PlanningAcceptance, AiAdmission, RuntimePermit or Gate29.

# 4. Counters, verdict and safe state

## 4.1 Deterministic accounting

4.1.1 Package mechanical identity=`83 members`; roots mismatch=`0`; inputs=`13`; source receipts=`11`; DAG=`30/34`; appointments=`24`; controls=`9`; mutations=`94=82+12`; semantic universe=`18/2,864/29/295`.

4.1.2 New Findings=`8`; severity=`P0 0+P1 6+P2 2+P3 0`; states=`OPEN 8+CLOSED 0`; accepted/waived/merged=`0`.

4.1.3 `reviewVerdict=REJECT-D02-A9-IMMUTABLE-D02-A10-SUCCESSOR-REQUIRED`.

4.1.4 Required successor denominator=`8` exact non-merged rows; preserved independently substantiated A8 rows=`F006/F007` with no duplicate closure credit.

4.1.5 Current state remains `AI runtime=OFF`; `Acceptance=0`; `PlanningAcceptance/AiAdmission/RuntimePermit=MISSING/MISSING/MISSING`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository=`PUBLIC`; Product/Git/GitHub/provider/deployment/release mutations=`0`.
