# 1. Connect — D02-A8 independent hostile review Findings Manifest

## 1.1 Identity and denominator

1.1.1 `manifestId=CONNECT-D02-A8-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30-R1`.

1.1.2 Reviewed Subject root=`61774fd3f54bf39d727ff7cdc09ef475fff9bd2b2561e5639e1b947dbbcaec0b`; crosswalk root=`859f721f09b7af35bf0810cdae0dd9beebe84f126d6d05ba6b605a23633a06ad`; Producer-QA root=`d648af6042f8cd8a5a98cf504c567d2a6806cf25f693a2812578897b38978476`; package-manifest root=`d5e60ec07595a5a55db40e029b815805c28a19ecbba9b0d6e1136af762461de6`.

1.1.3 Exact non-merged Finding denominator=`7`; IDs=`D02-A8-IHR-F001`–`D02-A8-IHR-F007`; holes/duplicates=`0`.

1.1.4 Severity denominator=`0 P0+6 P1+1 P2+0 P3`; state denominator=`7 OPEN+0 CLOSED`.

1.1.5 This manifest grants no closure, waiver, merge, D02 acceptance, source acceptance, model selection, AiAdmission, RuntimePermit, Gate29 authority, freeze lift or implementation permission.

# 2. Atomic Findings

## 2.1 Complete one-to-one manifest

| Finding ID | Severity | State | Exact evidence | Defect | Failure/attack | Required remediation | Independent closure predicate | noMergeKey |
|---|---:|---|---|---|---|---|---|---|
| `D02-A8-IHR-F001` | `P1` | `OPEN` | `schema.json`; Reader A 430–433 and 384–394; Reader B matching blocks; reports hardcode three zero counters | Readers do not execute the normative schema and inspect only selected nested fields. | Invalid nested type/enum/unknown field or inconsistent root state can coexist with Reader PASS. | Execute the exact closed-world schema independently in both readers and add complete schema-keyword mutations. | Valid instance yields schema errors=`0`; every required/type/enum/const/pattern/bound/ref/unknown-field mutation blocks in both readers; parsed state drives counters. | `D02-A8-IHR-F001` |
| `D02-A8-IHR-F002` | `P1` | `OPEN` | schema definitions for model/profile/account/approval/legal/source/root states; mutation corpus `179` negative vectors; no positive instance | Schema permits only MISSING/ABSENT/unaccepted/null roots; no accepted evidence/transition contract or positive control exists. | Future builders must invent success, expiry, revocation, replay and CAS semantics outside the frozen contract. | Split snapshot and transition/evidence schemas; materialize valid populated planning/admission/runtime fixtures and complete state machine. | Two readers accept the same positive planning fixture, keep higher roots blocked until all conjuncts exist, and reject every negative/expiry/revocation/replay mutation. | `D02-A8-IHR-F002` |
| `D02-A8-IHR-F003` | `P1` | `OPEN` | package manifest payload=`10`; reader allowlist=`4`; denylisted manifest/root-instances/reports; `rootInstancesRead=false` | Full payload, readers and detached outputs are not one atomically verified package. | Code/report/oracle/root/manifest drift can coexist with four-file Reader PASS; execution provenance is unbound. | Add an outer non-self-referential package verifier binding all planning artifacts, members, executables, toolchains and execution receipts. | Any member/executable/toolchain/report/top-document mutation blocks both outer verifiers; one complete admitted package root remains. | `D02-A8-IHR-F003` |
| `D02-A8-IHR-F004` | `P1` | `OPEN` | `D02A8-PCU-003..006`; Reader A 283–315; A7 predecessor=`114` numbered lines plus `92` table-form lines | Regex clause universe omits normative A7 table rows and stores no exact per-member content digest. | Approval/profile/account/legal/invalidation/Finding table semantics can be reinterpreted without a total succession disposition. | Extract every normative block, bind exact bytes/digest/locator/disposition/successor target and classify all remaining bytes. | Two extractors agree on total member universe/order/root; any omitted/changed/reordered/undispositioned table row blocks. | `D02-A8-IHR-F004` |
| `D02-A8-IHR-F005` | `P2` | `OPEN` | `D02A8-SRC-001..011`; Reader A 354–369; `observationCommitmentMode=...NO-PAGE-BYTES` | Receipts hash producer-authored claim labels, not reproducible source observations. | Real source changes remain invisible if claim labels are unchanged; historical cut cannot be reproduced. | Bind disclosure-safe retrieval metadata, relevant content/section digest or permitted surrogate, locators, extractor/version, freshness and conflicts. | Offline readers reproduce historical observation; fresh retrieval detects change/unavailable/conflict; observation remains separate from acceptance. | `D02-A8-IHR-F005` |
| `D02-A8-IHR-F006` | `P1` | `OPEN` | Reader A 375–390; DAG `22/23`; DAG producers `D02A8-PRODUCER-*`; unrelated `rootDefinitions.soleProducer` labels | Exact edge set/types and producer appointments are not enforced. | Required acyclic edges can disappear and unappointed producers can change while acyclic/dangling checks still pass. | Freeze exact edges and one typed producer-appointment registry with authority, scope, subject, time, expiry/revocation and allowed outputs. | Every edge/producer/appointment mutation blocks; two builders derive identical nodes, edges, producers, order and authority closure. | `D02-A8-IHR-F006` |
| `D02-A8-IHR-F007` | `P1` | `OPEN` | Reader A 266–271 and 434–450; thirteen registry inputs; detached unread frozenInputManifestRoot | Readers trust a self-described 13-entry list and do not require exact IDs/paths/roles or compare an admitted input root. | Inputs 7–12 can be replaced by self-consistent files while the reader derives a new root and still reports PASS. | Independently root the exact ordered input manifest and require one typed consumer/disposition for every input. | Substitute/duplicate/omit/reorder/path/orphan mutation of any input blocks; readers reproduce one admitted root; unconsumed=`0`. | `D02-A8-IHR-F007` |

# 3. Counts, verdict and safe state

## 3.1 Deterministic disposition

3.1.1 Findings=`7`; severity=`P0 0+P1 6+P2 1+P3 0`; states=`OPEN 7+CLOSED 0`; accepted/waived/merged=`0`.

3.1.2 `reviewVerdict=REJECT-D02-A8-EXECUTABLE-AND-SEMANTIC-SUCCESSOR-REQUIRED`.

3.1.3 Required response to every unresolved P1=`NEW-IMMUTABLE-D02-A9-SUCCESSOR`; Producer QA or this review cannot self-close it.

3.1.4 A8 proposed A7 closure=`7/7`; independently accepted closure=`0/7`; A8 acceptance=`0/1`.

3.1.5 `AI runtime=OFF`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository=`PUBLIC`; Product/Git/GitHub/provider/deployment mutations=`0`.
