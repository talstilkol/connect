# 1. Connect — D02-A8 detached Producer QA

## 1.1 Identity, boundary and verdict

1.1.1 `qaId=CONNECT-D02-A8-DETACHED-PRODUCER-QA-2026-08-30`.

1.1.2 This QA is mechanical producer evidence only. It is not an independent hostile review, Finding closure, Program acceptance, AiAdmission, RuntimePermit, Gate29 permit or freeze lift.

1.1.3 Mechanical verdict=`PASS`; candidate Finding remediation=`7/7`; independently accepted Finding closure=`0/7`; Producer self-acceptance=`0`.

1.1.4 Current terminal=`PROFILE-NOT-ADMITTED`; AI runtime=`OFF`; Gate29=`BLOCKED`; development freeze=`ACTIVE`; repository policy=`PUBLIC`.

## 1.2 Frozen top-level artifacts

| Artifact | Logical path | SHA-256 | wc `lines/words/bytes` |
|---|---|---|---:|
| Subject | `docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-immutable-successor-2026-08-30.md` | `61774fd3f54bf39d727ff7cdc09ef475fff9bd2b2561e5639e1b947dbbcaec0b` | `174/1675/17302` |
| Closure crosswalk | `docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md` | `859f721f09b7af35bf0810cdae0dd9beebe84f126d6d05ba6b605a23633a06ad` | `37/557/6223` |
| Package manifest | `docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/package-manifest.json` | `d5e60ec07595a5a55db40e029b815805c28a19ecbba9b0d6e1136af762461de6` | `141/247/5239` |

1.2.1 Package root=`docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/`; namespaceRoot=`web`; payloadRoot=`0027d09a844eaa79ac8d779e2691e5af77c8c3ffd1321c0b65b48f7fb085b636`; packageCoreRoot=`a1ce88c079503cade993bc11cf8f6f3be7ea13f5db990780030355d4fab8ef53`.

## 1.3 Exact package payload freeze

| Member | SHA-256 | wc `lines/words/bytes` | Role |
|---|---|---:|---|
| `schema.json` | `703a680bc35dbd7cffe1f98f785abe7d103a09bfc4a496bb1ea3412b3c2f505a` | `985/1515/22542` | normative schema |
| `registry.json` | `751d0b1e702656b1fbaa7ee91a7d14e0966d1d1beb6cbc116ea855391d2c862a` | `1359/2391/44206` | normative registry |
| `dependency-dag.json` | `b3a6bb3b341a78946d110b3d7094cd8a5a49a733060ed927a301da21efb670ae` | `362/622/9794` | normative DAG |
| `mutation-corpus.json` | `f6a1a15e35fd43e841296eed8f0ac93f5b4f7dbbbb95ee9af407702eba8566f3` | `1619/2809/42853` | reader input; no oracle |
| `mutation-oracle.json` | `6f166a9cd6661439bd15bd6ff54377e107f6cea6a6042701778a2836a40dcaf0` | `726/1091/18325` | detached expected oracle |
| `root-instances.json` | `37a7f70420970de8dd7e1252c8e0c080170d5efd126c2c4c36aa3ee4996c39f2` | `112/184/4461` | detached root freeze |
| `reader-a.mjs` | `c415af83d535e463b14661aa0270f4049d72669c192d57c449a64932db8ec333` | `511/2134/23964` | Node.js read-only reader |
| `reader-b.rb` | `18e4490b43d2e09b0f4925cab4f1b12cb05787245b6092ad2c7c71d5baa3d982` | `466/1669/21190` | Ruby read-only reader |
| `reader-a-report.json` | `bde8eb1e5ff0f0d56965302cc0fbbe67f9b6f1a72c032822cec30846c7ba4297` | `911/1416/25669` | detached actual report A |
| `reader-b-report.json` | `0db7d37b763e410443f0e153c5a3315f09620f634925318cf71c73480dea506a` | `913/1417/25709` | detached actual report B |

1.3.1 Payload members=`10`; manifest self-membership=`excluded`; missing/extra/duplicate payload members=`0`.

## 1.4 Deterministic QA checks

| QA ID | Check | Exact result | Verdict |
|---|---|---|---|
| `D02A8-Q01` | all package JSON parses; duplicate-key guards run in both readers | four reader inputs accepted independently; errors=`0` | `PASS` |
| `D02A8-Q02` | frozen physical input denominator | `13/13` exact SHA/lines/bytes; mismatch=`0` | `PASS` |
| `D02A8-Q03` | authority/predecessor chain | nodes=`6`; order/predecessor mismatch=`0`; unresolved operational model selection=`0` because policy is no selection | `PASS` |
| `D02A8-Q04` | predecessor clause derivation | universes=`6`; counts=`8+21+67+50+213+114=473`; holes/duplicate dispositions=`0` | `PASS` |
| `D02A8-Q05` | typed profile/account/legal denominators | AiProfile=`17`; account parents=`9`; independent children=`2`; Legal/Privacy=`7` | `PASS` |
| `D02A8-Q06` | provider/Finance authority separation | provider child and Finance child have distinct authority, issuer, scope and freshness; cross-satisfaction vectors killed=`2/2` | `PASS` |
| `D02A8-Q07` | durable PUBLIC derivation | dependencies exactly `D02A8-IN-013` + `D18-A2:1.1.4`; substitute/add/missing vectors block | `PASS` |
| `D02A8-Q08` | Connect prompt ownership/lifecycle | Connect exact bytes required; reusable prompts OFF; `/v1/prompts` and prompt-object field forbidden; missing bytes remain typed block | `PASS` |
| `D02A8-Q09` | official source receipt denominator | receipts=`11`; official-domain escapes=`0`; observation commitments=`11`; accepted=`0`; page bytes published=`0` | `PASS` |
| `D02A8-Q10` | three-root separation | PlanningAcceptance/AiAdmission/RuntimePermit are distinct classes/producers; substitutions=`0` | `PASS` |
| `D02A8-Q11` | cross-program DAG | nodes=`22`; edges=`23`; cycles=`0`; dangling=`0` | `PASS` |
| `D02A8-Q12` | reader independence | languages/algorithms differ; `oracleRead=false`; `rootInstancesRead=false`; expected-to-actual=`0` | `PASS` |
| `D02A8-Q13` | reader parity | packageCore parity=`true`; root instances=`15`; root mismatches=`0`; terminal mismatches=`0` | `PASS` |
| `D02A8-Q14` | full mutation corpus | vectors/evaluated/killed=`179/179/179`; surviving negative vector=`0` | `PASS` |
| `D02A8-Q15` | detached oracle comparison | Reader A mismatches=`0`; Reader B mismatches=`0`; oracle never enters reader execution | `PASS` |
| `D02A8-Q16` | exact A7 Finding crosswalk | rows=`7`; unique Findings=`7`; noMergeKey mismatches=`0`; accepted closure=`0` | `PASS` |
| `D02A8-Q17` | A6 Finding carry | rows=`5`; unique=`5`; accepted closure=`0`; merge/waiver=`0` | `PASS` |
| `D02A8-Q18` | deterministic and disclosure guards | absolute local paths=`0`; repository-physical-prefix logical paths=`0`; random-ID APIs=`0`; secrets/PII introduced=`0` | `PASS` |
| `D02A8-Q19` | mutation boundary | product/Git/GitHub/provider/account/deployment mutations=`0` | `PASS` |
| `D02A8-Q20` | negative-to-success and Acceptance | success from negative/unknown=`0`; PlanningAcceptance/AiAdmission/RuntimePermit=`0/0/0`; self-acceptance=`0` | `PASS` |

## 1.5 Root and parity counters

1.5.1 Frozen input root=`e045191b25bd8e1cc840b1b7cee3ec43ce6d7061e9a826b6cfda9d66ec31dec4`; authority root=`df945c2b9a4a39f35828f80bcec53df736a3fc5f24dc872e0b1c100bfff36060`; predecessor-clause root=`f41790638619261da3ff71c47008feebd5f16485091f2bb10393f52e6ae11811`.

1.5.2 PUBLIC root=`b06aff4c20112596e51659b5ec8eeb688b0b58b9733a81876ef2a64fda27b7d8`; model-authority root=`6c51e3a11bd050607b66b85a29169ac681f6bbf4f7d03cf51ffff2ce2fe9b485`; prompt root=`0a5dad570aebe426c2407fbb4f730ff59ffccd9f3721b2ce60e988b701617b4d`.

1.5.3 AiProfile root=`40829b09992a1ff2ae8e313f26bc2b7801041bec66bbf5e8f7070f695977af21`; account root=`b32181c09070f729075396b959cad775ac657a06e1337ec2fb186753396ecc9e`; Legal/Privacy root=`fa75d8dd52fd9bc19a63f200655e9ea0b3143f1bc8741ba1bb9d9e6f9dc3bc81`.

1.5.4 Source observation root=`b2305d4413492ce9efcf12d252e7e90c9b8f42adf1faff685a4c367671f931d0`; approval root=`e87bbec5fadb1807e4d009826ba13b0c005c346b935ca43667380f07591ee1e3`; A6 carry root=`a43954c03a539d8a3ba5360e6e9f3578d9987a38270108013624395a423aca7d`; A7 candidate root=`167f930075a3412772574b66abddabf47a64ab16fc58d0b0ceedc82c4dfc9084`.

1.5.5 Root-definition root=`d1ed325c76fb1b920177f32eb3aa6cc63dd2aa5f84e9936e781a0ac945ff5a1e`; cross-program DAG root=`8823b355bd9a75dd72c7cafa67f024f58dd426af13c92f16a4c9b80165639a09`.

## 1.6 Residual limits and required independent work

1.6.1 Producer QA does not prove legal sufficiency, privacy acceptance, account entitlement, provider availability, Finance budget, model fitness, eval fitness, live GitHub visibility or runtime safety.

1.6.2 External missing inputs remain typed blocks: independent A8 review and seven-Finding disposition; Program acceptance; typed model authority; Connect prompt bytes; profile/account/legal/source-acceptance/approval/eval roots; Gate29; freeze lift; runtime readback, trusted time, revocation, CAS/single-use consume and post-readback.

1.6.3 The eleven official receipts prove only the exact observed claim cut. A future use requires fresh retrieval; unavailable, stale, changed or conflicting sources block.

1.6.4 `finalProducerVerdict=MECHANICAL-PASS-CANDIDATE-REMEDIATION-7-OF-7-INDEPENDENT-ACCEPTANCE-0`.

1.6.5 Required handoff=`INDEPENDENT-HOSTILE-REVIEW-OF-EXACT-FROZEN-A8-BYTES`; this producer must not perform or close it.
