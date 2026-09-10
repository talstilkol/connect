# 1. Connect — תצפית מסלול קריטי לבקרות היסוד, גרסה 3

## 1.1 זהות ומגבלת טענה

1.1.1 `observationId=CONNECT-FOUNDATIONAL-CONTROL-CRITICAL-PATH-O3-2026-08-30`.

1.1.2 predecessor=`docs/planning/foundational-control-critical-path-observation-v2-2026-08-29.md`.

1.1.3 `observationClass=PLANNING-STATUS-AND-ORDER;NOT-ACCEPTANCE;NOT-PRODUCT-METRIC;NOT-ETA`.

1.1.4 validity=`until any listed Subject,Review,Findings,successor or authority root changes`.

1.1.5 repository=`PUBLIC`; `Gate29=BLOCKED`; `Gate30=BLOCKED/NOT-REACHED`; development freeze=`ACTIVE`.

1.1.6 currently allowed=`Planning authoring,research,independent review,read-only local/provider observation`.

1.1.7 currently prohibited=`Product code,Build,runtime test,Git/GitHub mutation,Commit,Push,provider/credential mutation,purchase,deployment,release`.

# 2. ששת Nodes החוסמים את ה־Foundational Join

## 2.1 Node 1 — B0 Bootstrap Authority

2.1.1 current candidate=`B0 v5`.

2.1.2 Subject root=`bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92`.

2.1.3 packageContentRoot=`666e121d998445e3134f3a1978ee9b7c5962324bd51376e2ebc5bf2646d689f8`.

2.1.4 mechanical denominator=`96 Requirements;288 vectors`;mechanical Readers=`PASS`.

2.1.5 independent hostile review=`IN-PROGRESS`.

2.1.6 accepted Requirements=`0/96`; operational vectors=`0/288`; B0 Definition/Instance/current receipt=`ABSENT`.

2.1.7 next transition=`review verdict→if REJECT create immutable v6; otherwise still require independent closure and current authority receipt`.

## 2.2 Node 2 — Three-review Protocol

2.2.1 reviewed candidate=`Protocol v1.6`.

2.2.2 Subject root=`618b18c4ce61f066f7e400fe0ed9d0fec16c08a8a936f7559be1b9f0850b3a34`.

2.2.3 independent Review root=`1d20ee7d8fd3dcfaf4a9d82369c38c658f895835c5a0d1b5422f7d0ef8dc55f3`.

2.2.4 independent Findings root=`acdc17a0ee6b77a0cfa9dda0c00dbd5999e6518488c35667857f25d21517abbb`.

2.2.5 verdict=`REJECT-AS-NONEXECUTABLE-CANDIDATE`;Findings=`31=18 P0+12 P1+1 P2`.

2.2.6 Protocol v1.7 successor=`IN-PROGRESS`;closure denominator=`31/31 non-merged`.

2.2.7 accepted Protocol root/current receipt=`ABSENT`;Acceptance=`0`.

## 2.3 Node 3 — Source Universe ו־Custody

2.3.1 reviewed candidate=`Source Universe v3`.

2.3.2 Subject root=`6cb64b3877f194302a25fd25f5fa73c76a4d06d208f0e62a124e5591e5247092`.

2.3.3 independent Review root=`8c4bce0652c5a126f88449135370f2a4b1ef35dd582f1c518083a0911e08a7c9`.

2.3.4 independent Findings root=`e94273e22a07f498b40de34e2a5dc406b94b28bbef5e5ca9e2735b7302a14b1b`.

2.3.5 verdict=`REJECT`;Findings=`24=12 P0+12 P1`.

2.3.6 v4 build charter=`MATERIALIZED`;v4 Subject/package=`ABSENT`.

2.3.7 accepted SourceSet/current pointer=`ABSENT`;accepted Requirements=`0`.

## 2.4 Node 4 — TRD-2 Task Registry Definition

2.4.1 reviewed candidate=`TRD-2 v5`.

2.4.2 Subject root=`933b5d68f765afbe5df792051f8b01441d2e0b6043eb3745aea3f593cadcf2be`.

2.4.3 independent Review root=`123b3f1a08b9388a0368042ea32a08a3408b813016bc259b4293215dc723547b`.

2.4.4 independent Findings root=`05b752be0bbbb5bdb789df31dcf72b69a69e1da9d55f38d1349b94af0a975ce8`.

2.4.5 verdict=`REJECT-AS-SEMANTICALLY-NON-EXECUTABLE`;Findings=`15=12 P0+2 P1+1 P2`.

2.4.6 v6 build charter=`MATERIALIZED`;v6 Subject/package=`ABSENT`.

2.4.7 accepted TRD-2/current pointer=`ABSENT`;accepted Requirements=`0/128` for reviewed v5.

## 2.5 Node 5 — Master Control Sequence

2.5.1 reviewed candidate=`Control Sequence v2`.

2.5.2 Subject root=`403a9f77d85c67ebc4498c12a0c74912f8c015cfbccd665f3043a99c9d98310e`.

2.5.3 independent Review root=`06283b49e49207173d6e55b3130098d824c0d6fc5181d666ea75a5afb2453392`.

2.5.4 independent Findings root=`06a05196fbce6e1166a02961bacadc063a9834cd90a78617ffe642895ec79b94`.

2.5.5 verdict=`REJECT-AS-DETERMINISTIC-CONTROL-SEQUENCE`;Findings=`67=40 P0+24 P1+3 P2`.

2.5.6 v3 build charter v2 root=`ab541e8cc5cc0b0e2f2989ba4c90334659d8d0ca624ae669912a605f66a586cb`.

2.5.7 v3 Subject/package=`ABSENT`;ControlSequenceAcceptance=`0/1`.

## 2.6 Node 6 — Public Repository ו־Cyber Hardening

2.6.1 candidate=`Public/Cyber v2`.

2.6.2 Subject root=`322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a`.

2.6.3 structural denominator=`52 Requirements`;accepted=`0/52`.

2.6.4 independent hostile review=`IN-PROGRESS`.

2.6.5 current live baseline=`repository PUBLIC;main unprotected;0 Rulesets;GitHub hardening Acceptance 0`.

2.6.6 remote-history scan=`307 reachable Commits;15 detector rows;6 open coordinates;0 cleared candidates`.

2.6.7 Public Push Permit=`ABSENT`;exact Public allowlist=`ABSENT`;license Acceptance=`0/1`.

# 3. Foundational Join

## 3.1 Join rule

3.1.1 required Join=`Node1 AND Node2 AND Node3 AND Node4 AND Node5 AND Node6`.

3.1.2 כל Node נדרש ל־exact frozen Subject/package, Producer QA, independent Reviews, Reconciliation, veto closure, exact-root Tal approval ו־accepted current pointer.

3.1.3 Mechanical PASS, Candidate status, prose completeness או מספר קבצים אינם ממלאים Node.

3.1.4 Node חסר, stale, revoked, rejected או conflicting משאיר את ה־Join חסום.

3.1.5 current accepted nodes=`0/6`.

3.1.6 `0/6` אינו אחוז התקדמות, משום שגודל ה־Nodes ואפשרות successor generation אינם אחידים.

# 4. Nodes לאחר ה־Foundational Join

## 4.1 Node 7 — ReviewInput Freeze

4.1.1 להקפיא exact roots של כל Subjects, Reviews, Findings, Decisions, Observations ו־source captures המותרים.

4.1.2 להוכיח eligibility, independence, freshness, custody ו־no hidden input.

4.1.3 להפיק ReviewInputManifest ו־accepted current pointer.

## 4.2 Node 8 — Program SourceSet Admission

4.2.1 לגלות PDF, initial specification, code/Git overlays, D01–D31, provider observations, standards ו־superseded claims.

4.2.2 לבצע custody, authenticity, Public classification, provenance ו־source sufficiency.

4.2.3 להפיק accepted Program SourceSet עם forward/inverse occurrence coverage.

## 4.3 Node 9 — Semantic Universe Extraction

4.3.1 לחלץ Requirement,Question,Decision,Conflict,Assumption,Scope,Package,Gate,Threat,Control ו־Evidence universes.

4.3.2 לשמר locators ו־roots לכל assertion.

4.3.3 לפתור conflicts לפי accepted precedence ולהשאיר Unknowns חסומים.

## 4.4 Node 10 — Program Task Registry

4.4.1 להפוך כל Requirement/Gate/Finding למשימות־עלה אטומיות של עד שמונה שעות נטו.

4.4.2 לכל עלה: owner role,backup,reviewer,input,output,predecessors,tests,evidence,rollback,terminal,status ו־estimate distribution.

4.4.3 להוכיח forward/inverse parity בין Source,Requirement,Control,Threat ו־Task.

## 4.5 Node 11 — Resources, Estimates ו־Schedule

4.5.1 לקלוט named capacity, calendars, skills, external waits, provider/Legal windows ו־cost caps.

4.5.2 להשאיר כל נתון חסר כ־typed Unknown.

4.5.3 להריץ שני Schedulers מול אותו Task DAG ו־MATH contract.

4.5.4 להפיק critical path, scenarios ו־ETA רק אם כל critical bound סופי ומאושר.

## 4.6 Node 12 — Master Plan Assembly

4.6.1 להרכיב Human Master Plan ו־machine manifests מאותו Registry.

4.6.2 לשמור את כל IDs, roots, Tasks, dependencies, decisions, gates ו־unknowns.

4.6.3 להפריד Planning completion, Product-local, Pilot-live, GA ו־Best-in-class.

## 4.7 Node 13 — Three independent reviews

4.7.1 Review Structural/Traceability.

4.7.2 Review Security/Semantic/Threat.

4.7.3 Review Schedule/Resources/Estimate.

4.7.4 Reconciliation אינו ממזג Findings ומחייב exact same Subject root.

## 4.8 Node 14 — Exact-root approval

4.8.1 להציג לטל exact Master root, package root, review roots, Finding status ו־safe claim limits.

4.8.2 האישור הכללי להמשיך אינו exact-root Master Acceptance.

4.8.3 שינוי byte לאחר האישור מבטל אותו ודורש successor generation.

## 4.9 Node 15 — Gate29 reassessment

4.9.1 רק לאחר Node 14 ניתן להעריך Gate29.

4.9.2 Gate29 אינו Gate30 ואינו Deployment authority.

4.9.3 נדרשת הוראת ביצוע חדשה ומפורשת לפני Product/Git/GitHub/provider mutation.

# 5. סדר קדימה

## 5.1 עבודה מקבילה נוכחית

5.1.1 `B0 v5 independent review`.

5.1.2 `Protocol v1.7 successor construction`.

5.1.3 `Public/Cyber v2 independent review`.

## 5.2 תור מיידי לאחר פינוי Reviewer/Builder

5.2.1 `TRD-2 v6 successor construction`.

5.2.2 `Source Universe v4 successor construction`.

5.2.3 `Control Sequence v3 successor construction`.

5.2.4 לכל successor: freeze→two mechanical Readers→detached Producer QA→fresh independent hostile review.

## 5.3 סדר Join

5.3.1 B0 ו־Protocol נסגרים לפני Acceptance של Reviews אחרים, משום שהם מגדירים authority ו־review lifecycle.

5.3.2 Source Universe נסגר לפני Program SourceSet.

5.3.3 TRD-2 נסגר לפני Task Registry.

5.3.4 Control Sequence נסגר לפני Handoff.

5.3.5 Public/Cyber נסגר לפני כל Public Push.

# 6. אחוזים, שעות ו־ETA

## 6.1 נתונים שאינם זמינים עדיין

6.1.1 exact Planning completion percentage=`unknown/unavailable`.

6.1.2 exact Product completion percentage=`unknown/unavailable`.

6.1.3 remaining person-hours=`unknown/unavailable`.

6.1.4 calendar ETA=`unknown/unavailable`.

6.1.5 recent velocity percentage=`unknown/unavailable`.

## 6.2 סיבת אי־הזמינות

6.2.1 accepted Program Task denominator אינו קיים.

6.2.2 successor review עשוי להוסיף Findings ועבודה מחייבת.

6.2.3 named resources, availability calendars ו־skill allocation אינם מאושרים.

6.2.4 external provider, Meta, Legal, Finance ו־account-owner waits אינם bounded.

6.2.5 כל מספר מדויק לפני Nodes 10–11 יהיה ניחוש ולא Evidence.

## 6.3 נקודת החישוב הראשונה

6.3.1 לאחר accepted Task Registry, Resource Calendar, Estimate Quality Gate ושני Schedulers תתאפשר תשובה מספרית.

6.3.2 עד אז ניתן לדווח רק states, exact roots, accepted denominators ו־blocking conditions.

# 7. מצב סופי של התצפית

7.1 Foundational nodes accepted=`0/6`.

7.2 post-foundational nodes accepted=`0/9`.

7.3 candidate ordered nodes=`15`;מספר זה אינו work denominator.

7.4 Gate29=`BLOCKED`;Gate30=`BLOCKED/NOT-REACHED`;development freeze=`ACTIVE`.

7.5 repository=`PUBLIC`;Public Push Permit=`ABSENT`.

7.6 Product/Build/Runtime/Git/GitHub/provider changes שבוצעו במסגרת התצפית=`0`.
