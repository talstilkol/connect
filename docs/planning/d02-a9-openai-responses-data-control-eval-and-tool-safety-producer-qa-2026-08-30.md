# 1. Connect — D02-A9 detached Producer QA

## 1.1 Identity, boundary and verdict

1.1.1 `qaId=CONNECT-D02-A9-DETACHED-PRODUCER-QA-2026-08-30`.

1.1.2 This QA is mechanical producer evidence only. It is not an independent review, Finding closure, D02 acceptance, source/legal/account/model acceptance, AiAdmission, RuntimePermit, Gate29 permit or freeze lift.

1.1.3 Inner mechanical verdict=`PASS`; candidate Finding remediation=`7/7`; independent Finding closure=`0/7`; Producer self-acceptance=`0`; Acceptance=`0`.

1.1.4 Current terminal=`PROFILE-NOT-ADMITTED`; AI runtime=`OFF`; Gate29=`BLOCKED`; development freeze=`ACTIVE`; repository policy=`PUBLIC`.

## 1.2 Frozen top-level artifacts

| Artifact | Logical path | SHA-256 | wc `lines/words/bytes` |
|---|---|---|---:|
| Subject | `docs/planning/d02-a9-openai-responses-data-control-eval-and-tool-safety-immutable-successor-2026-08-30.md` | `29b2dbd2e89b2aee362659891a9734539714d159b69f5a41a0e6918c0feef5ad` | `135/1418/14559` |
| Closure crosswalk | `docs/planning/d02-a9-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md` | `dbf5ab4abc8e052001a13880944888619bb722034a6f0e864cfe5cd6c51a8d76` | `37/570/5837` |
| A8 hostile review | `docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-2026-08-30.md` | `d1ae799f46af8cce25eb447898591d7f3f2151faf7e6491a02440e29a166b2c8` | `207/2235/19033` |
| A8 Findings Manifest | `docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-findings-manifest-2026-08-30.md` | `455679d450c7b9c20b2cc4358ad580224a439185410574e71bd9e733d281b32d` | `41/729/6457` |

1.2.1 Package path=`docs/planning/d02-a9-openai-responses-data-control-eval-tool-safety-package-2026-08-30/`; materialized pre-envelope package members=`51`; aggregate pre-envelope extent=`53,953 lines/106,738 words/2,276,494 bytes`.

1.2.2 The external `package-envelope.json` is intentionally created after this QA freezes, binds this QA and all other declared members, and excludes itself. Its SHA/content root therefore cannot be embedded here without circularity.

## 1.3 Deterministic generator and primary package roots

| Artifact | SHA-256 | Exact result |
|---|---|---|
| `generate.mjs` | `ac59b0f1f731fa70208a4832c778d43cb6deb28c9b13b7592555bb9a4032cbee` | deterministic outputs=`45` including semantic shards; random APIs=`0` |
| `generation-report.json` | `b3465d85bc0c3c81947e73179a33f4e88dd1ed248bde839dc420d4e774221347` | inputs=`13`; semantic members=`2,864`; sources=`11`; controls=`9`; mutations=`94` |
| `admitted-input-manifest.json` | `ac0cb55796d8682eed0d87283c806aca226834d055bc5ac696047fc6626a852a` | root=`d4d0a384b05897522ab9a3e96dd626cede14c9e4e0351906acd3201fd6dfd630` |
| `predecessor-semantic-universe.json` | `23fb849590b29601c319d86e323b4129ff7671ad2ce92c2be82cf1da9ba5d770` | root=`1a7e0f90fca63f87e0a243a9738d2e2a1a17334a61bf2cabedf9a34070f186e4` |
| `source-receipts.json` | `879e4a056ec0887cf21f95f371226a1d8d28b343cab9597aa0f50e4461576d4d` | root=`5d2ced7611fb4975715037a0e7261bedfd0454b8b8c882f3e48b638f0dc81ef2` |
| `dependency-dag.json` | `92cd2a3e37e7375fd0d49e32eddd497f2b066a0d7b649cc627c979cb8c309c28` | node/edge roots=`f6fe5da0…/46021684…` |
| `producer-appointments.json` | `63f2cf6f4c6558e61b26611f27396084be0ffeb94dbbd419c042d4ae64754d71` | root=`aa3a873c798fdbd6dfe17c737fc099d370f600b4109700e19a3aea475bfd7bbf` |
| `semantic-registry.json` | `be8ff1d6509df8c9703cbbef6fb7ec7492e51a81b7eec52941abc873cff1d551` | exact authority/profile/account/legal/root state |
| `execution-receipts.json` | `cdd78396170329e8131147e44a4ae9215becb48a225f43bf8edb509b35966037` | root=`7331a5855aaa5e1a9a0ab00404066e8654033e05ba920f515d90fb550492ee66` |

## 1.4 Deterministic QA checks

| QA ID | Check | Exact result | Verdict |
|---|---|---|---|
| `D02A9-Q01` | frozen A8 rejection inputs | review/manifest roots=`d1ae799f…/455679d4…`; mismatch=`0` | `PASS` |
| `D02A9-Q02` | exact admitted input manifest | entries=`13/13`; exact IDs/paths/roles/hashes/extents; unconsumed=`0`; reader embedded-root parity=`true` | `PASS` |
| `D02A9-Q03` | total predecessor semantics | sources=`18`; members=`2,864`; shards=`29`; table rows=`295`; undispositioned=`0`; reader reconstruction parity=`true` | `PASS` |
| `D02A9-Q04` | snapshot schema execution | two engines; baseline schema errors=`0/0`; closed-world keyword mutations block | `PASS` |
| `D02A9-Q05` | transition schema execution | instances=`9`; errors=`0/0`; operation-key/version/CAS/replay rules agree | `PASS` |
| `D02A9-Q06` | positive-model satisfiability | controls=`9`; planning/AI/runtime positive models plus five safe invalidations; actual/control-oracle mismatches=`0/9` | `PASS` |
| `D02A9-Q07` | safe current snapshot | root states=`MISSING/MISSING/MISSING`; credit=`0/0/0`; negative-to-success=`0` | `PASS` |
| `D02A9-Q08` | exact authority chain | nodes=`7`; order/predecessor mismatch=`0`; operational model selection=`0`; ambiguity=`0` | `PASS` |
| `D02A9-Q09` | profile/account/legal preservation | AiProfile=`17`; account parents/children=`9/2`; Legal/Privacy=`7`; provider/Finance cross-authority=`0` | `PASS` |
| `D02A9-Q10` | durable PUBLIC derivation | input=`D02A9-IN-013`; locator=`D18-A2:1.1.4`; live inference/readback credit=`0` | `PASS` |
| `D02A9-Q11` | official-source receipts | exact official URLs=`11`; raw+normalized digests=`11`; detached refresh match=`11/11` in both readers; accepted=`0` | `PASS` |
| `D02A9-Q12` | exact DAG | nodes/edges=`30/34`; cycles/dangling=`0/0`; exact-root parity=`true`; prohibited reverse edges present=`0` | `PASS` |
| `D02A9-Q13` | producer appointments | rows=`24`; missing/extra output mappings=`0`; self-authority=`0`; external missing appointments remain blocking | `PASS` |
| `D02A9-Q14` | A6/A7 carry | A6=`5 OPEN`; A7=`7 OPEN`; independently closed=`0`; merge/waiver=`0` | `PASS` |
| `D02A9-Q15` | exact A8 Finding crosswalk | rows/unique/noMergeKeys=`7/7/7`; candidate=`7`; independent=`0`; merge/range credit=`0` | `PASS` |
| `D02A9-Q16` | inner mutation corpus | vectors=`82`; Reader A/B killed=`82/82` each; survivors=`0`; actual parity=`true` | `PASS` |
| `D02A9-Q17` | detached oracle comparison | inner actual/oracle mismatches=`0/82` for each reader; oracle enters actual evaluation=`0` | `PASS` |
| `D02A9-Q18` | reader independence | Node/Kahn/index scan versus Ruby/DFS/byte slicing; reader hashes distinct; shared expected-terminal input=`0` | `PASS` |
| `D02A9-Q19` | execution provenance | readers/reports/toolchains/input-set roots/exit codes/source refresh bound by execution receipt; exit codes=`0/0` | `PASS` |
| `D02A9-Q20` | deterministic/disclosure guards | random-ID APIs=`0`; repository page bytes=`0`; local absolute paths in logical artifacts=`0`; secrets/PII introduced=`0` | `PASS` |
| `D02A9-Q21` | mutation boundary | product/Git/GitHub/provider/account/deployment/repository-visibility mutations=`0` | `PASS` |
| `D02A9-Q22` | acceptance boundary | PlanningAcceptance/AiAdmission/RuntimePermit=`0/0/0`; QA authority=`0`; self-acceptance=`0` | `PASS` |

## 1.5 Two-reader evidence

1.5.1 Reader A=`reader-a.mjs` SHA-256=`c38043328d8bfe6b1938d3bb08c30a9a0959da6e2407ce55dcff30a0033428b3`; report SHA-256=`72abce7438bc91a2f88753e6b3864e9039fe1f0d47fa872e735d4593f0104a2d`; verdict=`PASS`.

1.5.2 Reader B=`reader-b.rb` SHA-256=`e4fa82ff8733f0fb1bd2ca3b9b549fa3037ffa6e0f05f07cecf60ee60a63153f`; report SHA-256=`05a8e1f5b2025aeeeed5c0cb73740fb4b019b4e2a82c7526497c7a095b8c8e0b`; verdict=`PASS`.

1.5.3 Root/count/control/mutation-actual parity=`true/true/true/true`; expected-to-actual count=`0/0`; oracle read=`false/false`; source refresh changed/unavailable=`0/0` for each.

1.5.4 Mutation denominator by Finding=`F001 44; F002 9; F003 12 post-seal; F004 6; F005 7; F006 8; F007 8`; total=`94`; no group or credit is merged.

## 1.6 External-envelope seal rule

1.6.1 Expected external envelope member count=`83`: admitted inputs=`13`; immediate A8 top-level=`5`; A8 package=`11`; A9 top-level=`3`; fixed A9 package members=`22`; semantic shards=`29`.

1.6.2 Envelope self-membership=`EXCLUDED-NON-SELF-REFERENTIAL`; exact role/path order is embedded independently in both readers.

1.6.3 Post-seal outer vectors=`12`: omit, substitute, add, reorder, Reader A, Reader B, toolchain receipt, Report A, Report B, Subject, crosswalk and this Producer QA.

1.6.4 Post-seal invocation is necessarily detached from the envelope it verifies. Its exact results and final envelope SHA/content root are handoff metadata, not Acceptance and not an envelope member.

## 1.7 Residual blocks and required review

1.7.1 Producer QA does not prove legal/privacy sufficiency, account entitlement, provider availability, Finance budget, model fitness, eval fitness, source semantic truth, live GitHub state or runtime safety.

1.7.2 External missing inputs remain typed blocks: independent A9 disposition; seven-Finding closure root; Program acceptance; model/prompt/profile/account/legal/source/approval/eval roots; Gate29; freeze lift; runtime readback/time/revocation/CAS/single-use/post-readback.

1.7.3 `finalProducerVerdict=MECHANICAL-PASS-CANDIDATE-REMEDIATION-7-OF-7-INDEPENDENT-ACCEPTANCE-0`.

1.7.4 Required handoff=`INDEPENDENT-HOSTILE-REVIEW-OF-EXACT-FROZEN-A9-SUBJECT-CROSSWALK-QA-PACKAGE-ENVELOPE`; this producer must not perform or close it.
