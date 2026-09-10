# 1. Connect — D02-A9 one-to-one Finding closure crosswalk

## 1.1 Identity and frozen denominator

1.1.1 `crosswalkId=CONNECT-D02-A9-A8-FINDING-CLOSURE-CROSSWALK-2026-08-30`.

1.1.2 Subject=`docs/planning/d02-a9-openai-responses-data-control-eval-and-tool-safety-immutable-successor-2026-08-30.md`; SHA-256=`29b2dbd2e89b2aee362659891a9734539714d159b69f5a41a0e6918c0feef5ad`.

1.1.3 Frozen A8 review=`docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-2026-08-30.md`; SHA-256=`d1ae799f46af8cce25eb447898591d7f3f2151faf7e6491a02440e29a166b2c8`.

1.1.4 Frozen Findings Manifest=`docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-findings-manifest-2026-08-30.md`; SHA-256=`455679d450c7b9c20b2cc4358ad580224a439185410574e71bd9e733d281b32d`.

1.1.5 Exact denominator=`7`; severity=`0 P0+6 P1+1 P2+0 P3`; duplicate/hole/merge/waiver/range-credit=`0`.

## 1.2 Exact non-merged candidate closure rows

| Closure row | Finding | Severity | Exact successor evidence | Causal vectors | Candidate closure predicate | Independent state | noMergeKey |
|---|---|---:|---|---|---|---|---|
| `D02A9-CR-001` | `D02-A8-IHR-F001` | `P1` | Subject 1.3, 1.7; `snapshot.schema.json`; `transition.schema.json`; `envelope.schema.json`; two independent schema engines; schema roots `d390fefa…/3710d193…/e02dd823…` | `D02A9-MV-0001..0044`; `44/44` killed by both readers; actual/oracle mismatch=`0/44` | Both readers execute exact closed-world schemas; baseline errors=`0`; every required/type/enum/const/pattern/bound/ref/unknown-field mutation blocks; parsed state supplies counters | `OPEN`; independent closure root=`MISSING`; credit=`0` | `D02-A8-IHR-F001` |
| `D02A9-CR-002` | `D02-A8-IHR-F002` | `P1` | Subject 1.3; current snapshot; twelve-transition state machine; nine control-only satisfiability witnesses; detached control oracle; transition operation keys | `D02A9-MV-0045..0053`; `9/9` killed by both readers; control parity=`9/9` | Planning-only positive model is reachable while higher roots block; AI/runtime positive models are structurally satisfiable without authority credit; expiry/revocation/replay/CAS/post-readback return safe blocks | `OPEN`; independent closure root=`MISSING`; credit=`0` | `D02-A8-IHR-F002` |
| `D02A9-CR-003` | `D02-A8-IHR-F003` | `P1` | Subject 1.6–1.7; `envelope.schema.json`; external `package-envelope.json`; exact ordered member/role universe; reader/report/toolchain/top-document binding; self-membership excluded | `D02A9-MV-0054..0065`; `12` post-seal outer vectors; both readers independently verify exact envelope | Any member, executable, toolchain receipt, report or top-document mutation blocks; one non-self-referential externally admitted envelope SHA/content root remains | `OPEN`; independent closure root=`MISSING`; credit=`0` | `D02-A8-IHR-F003` |
| `D02A9-CR-004` | `D02-A8-IHR-F004` | `P1` | Subject 1.2; total universe root=`1a7e0f90…`; sources=`18`; members=`2,864`; shards=`29`; table rows=`295`; undispositioned=`0` | `D02A9-MV-0066..0071`; `6/6` killed by both readers | Every predecessor physical line, including every table row, has exact bytes/digests/order/type/disposition/target; two reconstructors reproduce the same universe root | `OPEN`; independent closure root=`MISSING`; credit=`0` | `D02-A8-IHR-F004` |
| `D02A9-CR-005` | `D02-A8-IHR-F005` | `P2` | Subject 1.5; receipts=`11`; observation root=`5d2ced76…`; raw and normalized digests; HTTP metadata; locators; extractor; freshness/change terminals; no page bytes published | `D02A9-MV-0072..0078`; `7/7` killed by both readers; fresh detached capture=`11/11 MATCH` | Offline readers reproduce the historical root; fresh detached retrieval detects unavailable/changed content; observation stays distinct from external source acceptance | `OPEN`; independent closure root=`MISSING`; credit=`0` | `D02-A8-IHR-F005` |
| `D02A9-CR-006` | `D02-A8-IHR-F006` | `P1` | Subject 1.4; exact DAG=`30 nodes/34 edges`; roots=`f6fe5da0…/46021684…`; appointments=`24`; appointment root=`aa3a873c…`; self-authority=`0` | `D02A9-MV-0079..0086`; `8/8` killed by both readers | Exact node/edge/order/type/endpoints and producer appointments are enforced; each producer has typed authority/scope/subject/time/revocation/allowed outputs; any mutation blocks | `OPEN`; independent closure root=`MISSING`; credit=`0` | `D02-A8-IHR-F006` |
| `D02A9-CR-007` | `D02-A8-IHR-F007` | `P1` | Subject 1.2; exact manifest root=`d4d0a384…`; ordered inputs=`13`; exact IDs/paths/roles/hashes/extents/consumer roots; unconsumed=`0` | `D02A9-MV-0087..0094`; `8/8` killed by both readers | Substitute/duplicate/omit/reorder/path/orphan mutations block; both readers compare the candidate to one embedded admitted root and reproduce all physical extents | `OPEN`; independent closure root=`MISSING`; credit=`0` | `D02-A8-IHR-F007` |

## 1.3 Accounting and safe state

1.3.1 Closure rows=`7`; unique Findings=`7`; candidate remediation=`7/7`; independently accepted closure=`0/7`; accepted/waived/merged=`0`.

1.3.2 Every row has one unique mutation group and `noMergeKey` equal to its exact source Finding. Evidence may be shared physically, but closure credit cannot be shared, ranged or merged.

1.3.3 Mutation denominator=`94=44+9+12+6+7+8+8`; inner executed=`82/82` per reader; outer post-seal denominator=`12`; expected-to-actual flow=`0`; inner oracle mismatches=`0`.

1.3.4 A6 carry=`5 OPEN/0 independently closed`; A7 carry=`7 OPEN/0 independently closed`; neither predecessor denominator is merged into these seven rows.

1.3.5 Mechanical QA is not Acceptance. `AI runtime=OFF`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository=`PUBLIC`; PlanningAcceptance/AiAdmission/RuntimePermit=`MISSING/MISSING/MISSING`; self-acceptance=`0`.
