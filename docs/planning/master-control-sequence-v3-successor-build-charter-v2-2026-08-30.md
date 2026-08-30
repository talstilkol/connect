# 1. Connect — אמנת בנייה מתוקנת ל־Master Control Sequence v3

## 1.1 זהות ומעמד

1.1.1 `charterId=CONNECT-MASTER-CONTROL-SEQUENCE-V3-SUCCESSOR-BUILD-CHARTER-V2-2026-08-30`.

1.1.2 מסמך זה הוא הוראות Builder בלבד; הוא אינו Subject, Review, Acceptance, Permit או סמכות לביצוע.

1.1.3 Subject קודֵם=`docs/planning/master-plan-successor-control-sequence-v2-2026-08-29.md`; raw SHA-256=`403a9f77d85c67ebc4498c12a0c74912f8c015cfbccd665f3043a99c9d98310e`.

1.1.4 Review מחייב=`docs/planning/master-plan-successor-control-sequence-v2-independent-hostile-review-2026-08-30.md`; raw SHA-256=`06283b49e49207173d6e55b3130098d824c0d6fc5181d666ea75a5afb2453392`.

1.1.5 Findings Manifest מחייב=`docs/planning/master-plan-successor-control-sequence-v2-independent-hostile-review-findings-manifest-2026-08-30.md`; raw SHA-256=`06a05196fbce6e1166a02961bacadc063a9834cd90a78617ffe642895ec79b94`.

1.1.6 אמנת v1 שקודמת למסמך זה=`docs/planning/master-control-sequence-v3-successor-build-charter-2026-08-29.md`; raw SHA-256=`84fa64fd9fa1fd6b53785c0bcbf7e7e77dc1a82444f95b2cdbe53f6e358ec35b`.

1.1.7 מסמך זה מחליף את אמנת v1 משום ש־v1 כיסתה רק `32` Findings קודמים, השתמשה בנתיבי workstation ולא כללה את `35` Findings החדשים.

1.1.8 Denominator בלתי־מתמזג=`MPSC2-IHR-F001..MPSC2-IHR-F067`; חלוקה=`40 P0+24 P1+3 P2`; סגור=`0/67`.

1.1.9 המאגר נשאר `PUBLIC`; `Gate29=BLOCKED`; `Gate30=BLOCKED/NOT-REACHED`; development freeze=`ACTIVE`.

1.1.10 אסורים בשלב זה Product code, Build, Runtime tests, Git/GitHub mutation, Credential use, Provider mutation, Deployment ו־Release.

## 1.2 עקרונות אי־איבוד

1.2.1 כל `67` Findings נשמר בנפרד עם אותו `findingId` ו־`noMergeKey`.

1.2.2 תיקון משותף רשאי לשמש מספר Findings, אך נדרש Closure record נפרד ו־negative vector נפרד לכל Finding.

1.2.3 יש לשמר כל `PGV2-00..PGV2-29`, כל `PXV2-00..PXV2-05`, כל `79` ה־edges וכל שדה מקור במיפוי forward+inverse.

1.2.4 Split, rename, removal או supersession מחייבים old root+member/span, new root+member/span, rationale, authority, invalidation ו־negative vector.

1.2.5 Prose אינו מקור סמכות; כל Noun מחייב typed member, producer, current pointer, state, edge, freshness, invalidation ו־terminal.

1.2.6 Missing, Unknown, ambiguous, stale, expired, revoked, conflicted או inaccessible לעולם אינם הופכים ל־PASS, Authority, Estimate או ETA.

# 2. חבילת היעד האטומית

## 2.1 חברי החבילה

2.1.1 `ImmutableV3Subject` — ההגדרות והכללים בלבד, ללא מצב נוכחי.

2.1.2 `PredecessorByteAndSemanticMap` — מיפוי מלא של כל Subject member קודֵם.

2.1.3 `CanonicalNodeRegistry` — כל Phase, Authority, Artifact head, Appointment, Policy, Observation, Permit, Condition ו־Post-Gate instruction.

2.1.4 `CanonicalEdgeJoinRegistry` — edge, source member, target member, state, AND/OR/XOR/K-of-N, Condition, failure terminal ו־invalidation.

2.1.5 `SoleProducerAndPointerRegistry` — producer אחד לכל type/generation ו־current pointer מפורש.

2.1.6 `AuthorityUniverseAndAppointmentRegistry` — issuer, role, scope, conflict, epoch, expiry, revocation ו־delegation prohibition.

2.1.7 `PolicyAndDecisionHeadRegistry` — policy type, source, version, head, applicability, as-of ו־invalidation.

2.1.8 `PermitRegistry` — permit class נפרד לכל Act, one-use consumption, scope, actor, environment, expiry, revocation ו־receipt.

2.1.9 `PhaseLifecycleStateMachineRegistry` — Candidate, QA, Review, Reconciliation, Acceptance, Current, Invalidated ו־terminal states.

2.1.10 `CASAndReadbackRegistry` — attempt, expected head, authority cut, trusted time, write result, two readbacks ו־terminal reconciliation.

2.1.11 `ConditionRegistry` — producer, truth domain, Unknown rule, as-of, expiry, head ו־reverse invalidation.

2.1.12 `AuthoritativeFieldTriggerRegistry` — כל mutable field וכל trigger המשנה אותו.

2.1.13 `ReverseDependencyAndInvalidationRegistry` — exact affected descendants, pointer clearing ו־stale rejection.

2.1.14 `ReworkAndTerminationRegistry` — defect class, route, generation, measure, budget, safe terminal ו־authority escalation.

2.1.15 `PublicControlRequirementManifest` — exact D18/Public/Cyber denominator עם forward+inverse disposition.

2.1.16 `PostGateAuthorityRegistry` — Task, instruction, actor, environment, repository, provider, data, legal, deploy, release ו־rollback authority.

2.1.17 `ConformanceVectorCorpus` — vector נפרד לכל Requirement, Noun, edge, Finding, trigger, state transition ו־Post-Gate bypass.

2.1.18 `IndependentReaderA` ו־`IndependentReaderB` — implementations שונות הבונות אותו semantic graph.

2.1.19 `FindingClosureRegistry` — `67` רשומות closure נפרדות.

2.1.20 `AtomicPackageManifest` — ordered member list, raw SHA-256, size, schema version ו־packageContentRoot.

2.1.21 `DetachedProducerQA` — QA מכני וסמנטי שאינו חבר ב־Subject ואינו מעניק Acceptance.

## 2.2 Root ו־serialization

2.2.1 יש לבחור UTF-8, LF, key order, array order, number grammar ו־Unicode normalization קנוניים.

2.2.2 כל ID נגזר באופן דטרמיניסטי מתוכן אמיתי ומ־namespace קפוא.

2.2.3 `Math.random()` אסור.

2.2.4 `crypto.randomUUID()` אסור ללא אישור מדויק ונפרד לשימוש מסוים.

2.2.5 `packageContentRoot` נגזר מרשימה ממוינת ומקודדת קנונית של member path, member role, raw SHA-256 ו־size.

2.2.6 ה־Manifest החיצוני אינו נכלל בתוך root של עצמו.

2.2.7 כל נתיב בחבילה הוא repo-relative; מספר נתיבי workstation חייב להיות אפס.

# 3. מודל גרף מחייב

## 3.1 Node

3.1.1 לכל Node יש `nodeId`,‏ `nodeClass`,‏ `generation`,‏ `subjectRoot`,‏ `soleProducerId`,‏ `currentPointerId`,‏ `requiredState`,‏ `authorityRoot`,‏ `freshnessRule`,‏ `invalidationHead` ו־`failureTerminal`.

3.1.2 Node ללא sole producer או accepted external authority אינו יכול להיכנס ל־Join.

3.1.3 Aggregate מרובה־מחברים כולל member manifest, cardinality, issuer לכל member ו־assembler נפרד.

3.1.4 Alias מותר רק ברשומת one-to-one מפורשת; semantic similarity אינה Alias.

## 3.2 Edge ו־Join

3.2.1 לכל Edge יש source node+member+root+state, target node+entry member, edge class, join ID, Condition ID, freshness, invalidation ו־terminal.

3.2.2 כל Entry מופק אוטומטית מן ה־canonical join; אין registry נוסף שנכתב ידנית.

3.2.3 שני Readers חייבים לשחזר byte-identical Entry membership ו־Edge membership לכל Phase.

3.2.4 AND אינו רשאי להפוך ל־OR כאשר Edge מותנה אינו applicable.

3.2.5 Condition=`FALSE` מחזיר `NOT-APPLICABLE` לכל ה־Node; הוא אינו מסיר רק ancestry Edge.

3.2.6 Condition=`UNKNOWN|STALE|REVOKED` חוסם ואינו מעניק reachability.

## 3.3 Authority ו־Atomic attempt

3.3.1 כל Acceptance attempt קושר Subject/output roots, QA, Reviews, Reconciliation, approvals, vetoes, appointments, authority epoch, trusted time, expected head ו־revocation cut.

3.3.2 Permit consumption ו־CAS effect חייבים linearization אחת או prepare/commit/reconcile מוכח.

3.3.3 revoke-wins מוגדר לכל B0, Protocol, Appointment, Policy, Approval ו־Permit.

3.3.4 response loss מוביל ל־terminal reconciliation עם XOR תוצאה: `ACCEPTED-CURRENT`,‏ `REJECTED`,‏ `CONFLICT` או `UNKNOWN-BLOCKED`.

3.3.5 שני readbacks בלתי־תלויים מאמתים head, subject root, attempt, effect ו־authority cut.

3.3.6 stale, wrong-head, ABA, replay, expired, revoked, partition או conflicting readback אינם מעניקים Handoff.

# 4. מפת סגירה נפרדת לכל Finding

## 4.1 Findings קודמים שנשמרו

| Finding | שינוי מחייב ב־v3 | הוכחת סגירה נפרדת |
|---|---|---|
| `F001` | לקשור B0 accepted root מוקדם ולא־מעגלי | הסרת B0/שינוי root חוסמים את phase הראשון |
| `F002` | Bootstrap Protocol כ־external typed authority | Protocol חסר/מחזורי מחזיר missing-authority |
| `F003` | Review SourceSet ו־Program SourceSet מסוגים ושורשים שונים | שני Readers מוכיחים אפס alias ואפס return edge |
| `F004` | TRD2 input/result roots כ־members ו־edges | השמטת כל root חוסמת בנפרד |
| `F005` | Phase-instance manifest/result לכל Phase | `36/36` phase families עם exact schema ו־root |
| `F006` | lifecycle כולל ובלתי־רקורסיבי | כל transition וכל failure מגיעים ל־terminal אחד |
| `F007` | typed rework graph מלא | mutation מכל defect class בוחר route יחיד |
| `F008` | typed trigger/invalidation graph | כל trigger פוסל all-and-only descendants |
| `F009` | Program candidate, reviews, reconciliation ו־CAS נפרדים | אין successor acceptance ללא כל roots |
| `F010` | Public gate עם exact controls ו־Post-Gate ancestry | כל bypass mutant נדחה |
| `F011` | atomic CAS ושני readbacks | response-loss/replay/ABA corpus נדחה |
| `F012` | Planning handoff ancestry מחייבת בכל Post-Gate node | מחיקת ancestry Edge חוסמת כל Act |
| `F013` | bootstrap work ledger מוקדם ו־final closure output | כל work leaf מאושר לפני execution |
| `F014` | state/terminal/event registry כולל | undefined emitted token count=`0` |
| `F015` | external lifecycle לכל Authority/Policy/Permit | expiry/revoke/head-change פוסלים current |
| `F016` | canonical semantic edge graph | prose view ו־edge view זהים |
| `F017` | Framework/Public/Program/Review source types נפרדים | cross-type substitution count=`0` |
| `F018` | preparatory state עם תוצאה מאומתת | prose-only enforcement אינו מקבל credit |
| `F019` | no-coercion schema ואכיפה | Candidate/Frozen/Pass אינם Accepted |
| `F020` | Entry ו־Join מופקים מאותו registry | `PGV2-05` parity מלאה בשני Readers |
| `F021` | Appointment/Approval producers ו־heads | missing/revoked actor blocks each act |
| `F022` | Gate30 state machine ו־inputs מלאים | Gate30 אינו reachable ללא release-specific packet |
| `F023` | Public-control denominator מדויק | forward+inverse coverage=`100%` |
| `F024` | live repository authority accepted, לא Candidate | wrong/stale repository blocks mutation |
| `F025` | atomic member manifests עבור multi-author sets | remove/substitute/duplicate member mutants נדחים |
| `F026` | exact MATH root, solvers, equality/tolerance | שני schedulers מסכימים או ETA נשאר Unknown |
| `F027` | accepted denominator לכל metric | denominator חסר מחזיר Unknown |
| `F028` | counters נגזרים משני Readers | hard-coded/edited count mutant נדחה |
| `F029` | bounded handoff receipt+invalidation fence | event בין check ל־handoff חוסם |
| `F030` | domain-path linter | workstation path count=`0` |
| `F031` | Gate identities ולייפסייקל נפרדים | cross-gate alias/reuse count=`0` |
| `F032` | current claims מחוץ ל־immutable Subject | status transition אינו משנה Subject bytes |

## 4.2 Findings חדשים מסוג P0

| Finding | שינוי מחייב ב־v3 | הוכחת סגירה נפרדת |
|---|---|---|
| `F033` | Genesis authority/protocol generation מוקדמת ומנותקת | authority order קטן ממש; cycle count=`0` |
| `F034` | B0/Protocol freshness+revocation edges לכל bootstrap acceptance | revoke בין phases מחזיר expired/block |
| `F035` | sole-producer AppointmentRegistry | כל role חסר/ambiguous/revoked חוסם |
| `F036` | Handling/precedence/extraction/scope policies מוקדמים | policy cycle/missing/stale corpus נדחה |
| `F037` | PlanningPermit issuer ו־one-use accepted Permit | Request לעולם אינו נצרך כ־Permit |
| `F038` | Phase מוקדם ל־estimate-state/capacity/wait observations | scheduler אינו self-require; unbounded נשאר Unknown |
| `F039` | שני Normalizer run nodes עצמאיים | missing/same-actor/same-runtime run נדחה לפי policy |
| `F040` | Acceptance envelope מנותק ו־base lifecycle לא־רקורסיבי | self/member/ancestor edges=`0` |
| `F041` | sole producer ל־frozen successor Program root | consumed root פותר member אחד בלבד |
| `F042` | CAS join אטומי ל־head/time/appointment/revocation | concurrent revoke/head-change corpus נדחה |
| `F043` | `TERMINAL-RECONCILE` כאלגוריתם ו־XOR states | response-loss אינו יכול להפוך להצלחה משוערת |
| `F044` | FrameworkSourceSet ו־PublicControlRequirementManifest נפרדים ומוקדמים | alias/cycle/missing count=`0` |
| `F045` | global Post-Gate AND guard לכל executable node | השמטת כל prerequisite חוסמת בנפרד |
| `F046` | Condition applicability ברמת Node | false=`NOT-APPLICABLE`; Unknown=`BLOCKED` |
| `F047` | Gate30 packet, veto, approvals, CAS/readbacks | partial release packet אינו מתקבל |
| `F048` | permit classes נפרדים לכל Act | cross-class substitution/replay corpus נדחה |
| `F049` | accepted live repository registry/readbacks | Candidate אינו coerced ל־live authority |
| `F050` | external-origin invalidation edges מלאים | every authoritative-field mutation נבדקת |
| `F051` | Handoff קשור ל־invalidation log head ו־fence | TOCTOU mutant מחזיר conflict/expired |
| `F052` | complete rework routes ו־well-founded measure | כל trace finite ומסתיים ב־accepted או safe block |
| `F053` | staged candidate lifecycle נפרד מ־accepted outputs | rejected candidate אינו זורם כתלות רגילה |
| `F054` | QA, Review A, Review B ו־Reconciliation כ־nodes מסודרים | wrong-role/wrong-order/missing-seal נדחים |
| `F055` | exact final Planning closure output או edge מתוקן | entry/output/edge resolution=`1:1` |
| `F056` | ControlSequenceAcceptance עם כל שדות atomic lifecycle | missing field/revoke/response-loss חוסמים |
| `F057` | closed AuthorityUniverse ו־deterministic no-inference query | omitted row אינו יכול להוכיח absence |

## 4.3 Findings חדשים מסוג P1

| Finding | שינוי מחייב ב־v3 | הוכחת סגירה נפרדת |
|---|---|---|
| `F058` | rooted PhaseDefinition עם כל עשרת השדות | שני Readers משחזרים אותה רשומה בדיוק |
| `F059` | Entry ו־Edge מאותו canonical join | member/state parity=`100%` בכל Phase |
| `F060` | exact member IDs או accepted one-to-one aliases | missing/ambiguous/collision count=`0` |
| `F061` | external bootstrap work ledger + successor registry | אין retroactive work authorization |
| `F062` | MATH contract/solver/version/tie-break/serialization/tolerance | same-input schedule-class parity מוכחת |
| `F063` | current observations חיצוניות ל־Subject | Subject root יציב על פני status changes |
| `F064` | rooted PublicControlRequirementManifest | omitted-control mutant נכשל |
| `F065` | accepted Condition records עם heads ו־invalidation | invented/stale/unknown Condition נכשל |
| `F066` | typed cross-domain terminal registry | undefined outcome token count=`0` |
| `F067` | member/issuer manifests ו־assembler separation | forward+inverse member/issuer parity=`100%` |

## 4.4 כלל Closure

4.4.1 כל שורה בסעיפים 4.1–4.3 מקבלת `FindingClosureRecord` נפרד.

4.4.2 כל Record קושר predecessor finding root, exact v3 clause/member, implementation artifact, vector ID, runner A result, runner B result ו־independent review disposition.

4.4.3 `PASS-PRESENCE` אסור; נדרש causal negative vector שמבדיל בין הפעלת הבקרה להסרתה.

4.4.4 תיקון משותף אינו מאפשר `range closure`; כל Finding נסגר או נשאר פתוח בנפרד.

# 5. סדר בנייה מחייב

## 5.1 הקפאת Inputs

5.1.1 לאמת מחדש את ארבעת roots בסעיף 1.1.

5.1.2 להפיק immutable input manifest עם line/byte counts ו־acquisition method.

5.1.3 להוכיח שכל הנתיבים repo-relative ושאין Secret או מידע אישי בחבילת היעד.

5.1.4 להקפיא `67/67` Findings כ־non-merged denominator.

## 5.2 בניית schemas ו־grammar

5.2.1 להגדיר JSON Schemas לכל `21` חברי החבילה בסעיף 2.1.

5.2.2 להגדיר parser grammar אחד ו־canonical serializer אחד.

5.2.3 לבנות parser conformance corpus חיובי ושלילי.

5.2.4 להוכיח ששני Parsers שונים מקבלים ודוחים אותן קבוצות.

## 5.3 בניית Genesis ו־Authority

5.3.1 לבנות generation order קשיח ומקטין ל־B0 ול־Bootstrap Protocol.

5.3.2 לבטל כל self/member/ancestor authority edge.

5.3.3 לבנות AuthorityUniverse, Appointments, Policies, Permits ו־trusted-time heads.

5.3.4 להוסיף revoke-wins, expiry, conflict ו־no-inference queries.

5.3.5 להריץ את vectors של `F001,F002,F015,F021,F033..F037,F040,F042,F048,F056,F057`.

## 5.4 בניית Phase graph

5.4.1 להמיר כל Noun ב־`36` Phase/Post-Gate entries ל־Node member.

5.4.2 ליצור sole producer ו־current pointer לכל output type.

5.4.3 להפיק Entry prose מן ה־canonical join בלבד.

5.4.4 להוכיח `entry-view=edge-view` עבור כל Phase.

5.4.5 להריץ delete-one-edge, wrong-state, alias ו־missing-producer corpus.

## 5.5 בניית lifecycle ו־CAS

5.5.1 להפריד Candidate artifacts מ־Acceptance acts.

5.5.2 לפצל QA, Reviews, Reconciliation, Approval ו־CAS ל־nodes מסודרים.

5.5.3 לבנות one-use attempts, expected heads, atomic cuts ושני readbacks.

5.5.4 לבנות terminal reconciliation ל־response loss, ABA, replay ו־partition.

5.5.5 להוכיח שאף stale/revoked/conflicting artifact אינו הופך Current.

## 5.6 בניית invalidation ו־rework

5.6.1 להפיק authoritative-field denominator מן ה־schemas.

5.6.2 לקשור לכל field trigger אחד לפחות.

5.6.3 לבנות reverse dependency graph ולחשב all-and-only descendants.

5.6.4 להגדיר rework route לכל defect class, לרבות כל `PXV3` class.

5.6.5 להגדיר well-founded measure, maximum attempts ו־safe escalation.

5.6.6 להריץ שתי generations נשלטות לכל external node class.

## 5.7 בניית Post-Gate ו־Public controls

5.7.1 לקשור כל executable node ל־Gate29 handoff ול־new exact instruction ב־AND guard שאינו ניתן להסרה.

5.7.2 לקשור Task, actor, environment, repository, scope, permit ו־evidence destination.

5.7.3 להפריד Push, provider, credential, data, legal, deploy, release ו־rollback permits.

5.7.4 להגדיר Condition applicability ו־Unknown semantics.

5.7.5 לבנות Gate30 lifecycle נפרד; Gate29 לעולם אינו Gate30.

5.7.6 להוכיח repository visibility=`PUBLIC` בכל readback; שינוי Visibility אינו remediation.

## 5.8 בניית MATH, Metrics ו־ETA

5.8.1 לקשור Task denominator, estimates, typed Unknown, capacity, calendars ו־external waits.

5.8.2 לקפוא solver profile, version, tie-break, equality, tolerance ו־serialization.

5.8.3 שני Schedulers שונים חייבים להסכים תחת אותה equivalence relation.

5.8.4 כל critical unbounded wait משאיר Completion, hours ו־ETA=`unknown/unavailable`.

5.8.5 אין לפרסם מספר מדויק לפני Acceptance של Task Registry, resources, dependencies ו־calendar cut.

## 5.9 הפקת vectors ו־שני Readers

5.9.1 vector נפרד לכל `67` Findings.

5.9.2 vector נפרד לכל Entry member, edge, state transition, Condition, authoritative field ו־Permit class.

5.9.3 כל vector כולל exact input bytes, operation, expected result, terminal ו־causal control delta.

5.9.4 Reader A ו־Reader B נכתבים בטכנולוגיות שונות ואינם משתפים parser implementation.

5.9.5 byte-identical semantic graph, invalidation set ו־result ledger נדרשים.

## 5.10 הקפאה ו־QA

5.10.1 להפיק את כל חברי החבילה לפני Manifest חיצוני.

5.10.2 לחשב raw roots ו־packageContentRoot פעם אחת.

5.10.3 להריץ את שני Readers מחדש מול השורש הקפוא.

5.10.4 ליצור detached Producer QA שאינו משנה את Subject.

5.10.5 כל תיקון לאחר freeze יוצר v4 generation חדשה; אין patch-in-place עם Review ישן.

## 5.11 ביקורת עצמאית וקבלה

5.11.1 למנות Reviewer שלא יצר את Subject, generator, Readers או Producer QA.

5.11.2 Reviewer מקבל רק exact frozen roots ואת ה־67-Finding denominator.

5.11.3 Reviewer בונה graph ו־attack corpus עצמאיים ואינו מסתפק בהרצת Producer tools.

5.11.4 כל Finding נשאר פתוח עד exact independent closure.

5.11.5 אם נמצא Finding חדש, הוא נוסף בנפרד; אין מיזוג ואין Acceptance.

5.11.6 לאחר Review A, Review B ו־Review C עצמאיים על אותם bytes יש לבצע Reconciliation.

5.11.7 exact-root Tal approval נדרש רק לאחר reconciliation ו־veto closure.

# 6. תנאי קבלה מלאים

## 6.1 תנאים מכניים

6.1.1 כל member root וגודל תואמים ל־Manifest.

6.1.2 כל schema ו־parser corpus עוברים בשני Readers.

6.1.3 count mismatch, unresolved member, alias collision, duplicate producer, missing edge ו־undefined terminal שווים אפס.

6.1.4 workstation path, Secret value, PII, `Math.random()` ו־unauthorized `crypto.randomUUID()` שווים אפס.

## 6.2 תנאים סמנטיים

6.2.1 authority graph acyclic ומתחיל ב־accepted detached Genesis.

6.2.2 כל Entry Noun נפתר ל־Node אחד, producer אחד ו־edge אחד לפחות.

6.2.3 כל Acceptance atomic, current, fresh, unrevoked ו־replay-safe.

6.2.4 כל trigger פוסל all-and-only descendants.

6.2.5 כל rework trace finite ומגיע ל־Accepted או explicit safe block.

6.2.6 כל Post-Gate execution מחייב Gate29+instruction+exact authority; Gate30 נפרד.

6.2.7 כל `67/67` Findings סגור בנפרד בידי Reviews עצמאיים.

## 6.3 מצב נוכחי

6.3.1 v3 Subject=`ABSENT`.

6.3.2 package members implemented=`0/21`.

6.3.3 Finding closures=`0/67`.

6.3.4 independent review generations=`0/3`.

6.3.5 ControlSequenceAcceptance=`0/1`.

6.3.6 Product/Planning completion percentage, remaining hours, critical path ו־ETA=`unknown/unavailable`.

6.3.7 `Gate29=BLOCKED`; `Gate30=BLOCKED/NOT-REACHED`; development freeze=`ACTIVE`; repository=`PUBLIC`.
