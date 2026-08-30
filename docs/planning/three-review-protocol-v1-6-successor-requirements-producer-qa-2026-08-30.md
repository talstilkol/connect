# 1. Connect — detached Producer QA for Three-review Protocol v1.6

## 1.1 Exact immutable artifact roots

| Artifact | Path | SHA-256 | Lines | Bytes |
|---|---|---|---:|---:|
| Subject | `web/docs/planning/three-review-protocol-v1-6-successor-requirements-2026-08-30.md` | `618b18c4ce61f066f7e400fe0ed9d0fec16c08a8a936f7559be1b9f0850b3a34` | 5619 | 4465608 |
| Reader A | `web/docs/planning/three-review-protocol-v1-6-qa-reader-a-2026-08-29.mjs` | `0409301f281c27e7512c0e7b53deae01530f92fd1f9f3a6946011a6ebdf870a8` | 434 | 23675 |
| Reader B | `web/docs/planning/three-review-protocol-v1-6-qa-reader-b-2026-08-29.rb` | `418e71193cb4d392fac5763403fb049caa684ed5601de2e19e087cbbcc977ce5` | 473 | 23585 |
| Reader A report | `web/docs/planning/three-review-protocol-v1-6-qa-reader-a-report-2026-08-30.json` | `70341189ea1c9c1c9330680fecc712b1ae15f2a0fafae305edfbd4b64e2531ae` | 1 | 1082 |
| Reader B report | `web/docs/planning/three-review-protocol-v1-6-qa-reader-b-report-2026-08-30.json` | `fe7708a08880037a4375a312d96627492575ca92f3cc1f85c2aaac79f32fd068` | 1 | 1090 |

1.1.1 status=`DETACHED-PRODUCER-QA;MECHANICAL-CANDIDATE-PASS;SEMANTIC-CLOSURE=0;ACCEPTANCE=0`.

1.1.2 any byte change to the Subject, either reader or either report makes this QA stale. A defect requires a new immutable successor; none of these artifacts may be patched after review freeze.

1.1.3 this QA is Planning-only and Producer-authored. It grants no Review eligibility, Finding Closure, Requirement Acceptance, Protocol Admission, Publication authority or Gate credit.

# 2. Independent reader methods

2.1.1 Reader A is Node.js and uses byte scanning, regular-expression Requirement extraction, independent namespace discovery and an explicit vector interpreter.

2.1.2 Reader B is Ruby and uses a line state machine, independent byte-span discovery, a separately implemented canonical serializer and a separately implemented vector interpreter.

2.1.3 neither reader consumes the other's output. They agreed on the exact Subject root, physical identity, all counters, every source member digest/root, NamedUse multiset, backward DAG, Crosswalk, state-machine registries, full Terminal tuples and 471 vector post roots/terminals.

# 3. Exact mechanical counters

3.1.1 `backwardDependencyEdges=1716`.

3.1.2 `carriers=21`.

3.1.3 `commitMembers=22`.

3.1.4 `controlMachines=15`.

3.1.5 `controlTransitions=106`.

3.1.6 `crosswalkRows=323`.

3.1.7 `dependencyFamilies=48`.

3.1.8 `failureConditions=16`.

3.1.9 `findingRemediations=16`.

3.1.10 `lifecycleVectors=10`.

3.1.11 `namedUses=1828`.

3.1.12 `namespaces=27`.

3.1.13 `parserProfiles=3`.

3.1.14 `requirementFields=560`.

3.1.15 `requirementOutputs=112`.

3.1.16 `requirements=112`.

3.1.17 `residualRisks=323`.

3.1.18 `separationRules=15`.

3.1.19 `sourceMembers=675`.

3.1.20 `terminals=21`.

3.1.21 `v15Preservations=96`.

3.1.22 `vectors=471`.

# 4. Hostile invariants mechanically enforced

4.1.1 exact five fields=`560/560`; Requirement IDs=`112/112`; deterministic one-output mapping=`112/112`; unknown,self,forward or same-row local provider=`0`; dependency cycles=`0`.

4.1.2 every source carrier root and byte count matched; both readers independently re-extracted all namespace members from the parser mode and selector, then reproduced all spans,digests,member-set roots and namespace roots.

4.1.3 Crosswalk rows=`323/323`; duplicate noMergeKey=`0`; missing source conjunct=`0`; missing target=`0`; missing typed ResidualRisk=`0`; premature independent receipt=`0`.

4.1.4 Terminal corpus executed empty,16 individual,120 pairwise and all-trigger Sets. Review lifecycle executed 10 programs including generation-one success, generation-two success, generation-two P1 rejection, P2 disposition pass/fail, one appeal, second-appeal conflict, remand, revoke and self-approval conflict.

4.1.5 commit members=`22`; canonical order exact; postCommitReadbackRoot inside commit=`0`. Repository visibility invariant=`PUBLIC-PERMANENT`.

# 5. Explicit zero ledger and next action

5.1.1 independently accepted Requirements=`0/112`; independently closed Findings=`0/16`; independently FULL Crosswalk rows=`0/323`; eligible Reviews=`0/3`; external B0 admission=`0`.

5.1.2 Producer mechanical PASS cannot become semantic Closure. All P0/P1 must be zero under fresh independent review; P2/P3 require the separate authority defined by the Subject.

5.1.3 next safe action is to freeze the exact roots above and commission three pairwise-distinct exact-root reviews. Any accepted defect requires v1.7.

5.1.4 `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository=`PUBLIC-PERMANENT`; no Product, Build, Runtime, Git, GitHub, provider or deployment mutation occurred.
