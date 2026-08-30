# 1. Connect — ביקורת Hostile עצמאית על Master Plan successor control sequence

## 1.1 זהות, נושא וגבולות

1.1.1 `artifactId=CONNECT-MASTER-PLAN-SUCCESSOR-CONTROL-SEQUENCE-HOSTILE-REVIEW-2026-08-29-R1`.

1.1.2 `reviewClass=INDEPENDENT-HOSTILE-PLANNING-CONTROL-SEQUENCE-REVIEW`.

1.1.3 נושא הביקורת הוא `/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-2026-08-29.md`.

1.1.4 Root הנושא שנבדק הוא SHA-256=`85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970`, ‏`339` שורות ו־`16,129` בתים.

1.1.5 כל מסקנה חלה רק על Root הנושא שב־1.1.4. שינוי Byte יחיד יוצר Subject חדש והופך ביקורת זו ל־`STALE-FOR-CURRENT`.

1.1.6 הביקורת תכנונית בלבד. היא אינה משנה את הנושא, אינה יוצרת Program Tasks, אינה כותבת Product code, אינה מריצה Build, אינה משנה Git/GitHub/Provider ואינה מעניקה Permit, Credit או Acceptance.

1.1.7 ביקורת Producer מאוחרת על הנושא לא שימשה כקלט. הממצאים נגזרו באופן עצמאי מן ה־Subject הקפוא ומן המקורות המשווים המוצהרים בלבד.

## 1.2 מקורות השוואה קפואים

1.2.1 החלטת Public repository היא `/Users/tal/Documents/connect/web/docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md`, ‏SHA-256=`448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`.

1.2.2 דרישות Bootstrap/Lifecycle הן `/Users/tal/Documents/connect/web/docs/planning/bootstrap-lifecycle-successor-requirements-2026-08-29.md`, ‏SHA-256=`f35ae1f0c8cf22ec379e0bf8b4f264a30c254df68181d25e3d4fe33ef46f20aa`.

1.2.3 ביקורת Schedule/Estimate היא `/Users/tal/Documents/connect/web/docs/planning/master-plan-schedule-and-estimate-audit-2026-08-29.md`, ‏SHA-256=`35869ec7bbd04eaf5db3f7e6637276bb7d35c7d942f20fc6ab1457c24da95fee`.

1.2.4 ביקורת Security/Semantic היא `/Users/tal/Documents/connect/web/docs/planning/master-plan-security-semantic-audit-2026-08-29.md`, ‏SHA-256=`d0d19b90b07f6e59bdef63b5eaaabe5c2ffa162fe90371fdd135876c264855b6`.

1.2.5 ה־Master הדחוי שמגדיר בין היתר את Gate30 הוא `/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`, ‏SHA-256=`643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

1.2.6 חוזה Progress/Estimate/ETA הוא `/Users/tal/Documents/connect/web/docs/planning/progress-estimate-and-eta-mathematical-contract-2026-08-29.md`, ‏SHA-256=`d539927f18c6e7d7a718947c6f9e160fd09a780ca5d3d2f1fce2c3dc9c863110`.

## 1.3 שיטת הביקורת

1.3.1 נסרקו כל `25` מזהי השלבים `PG00`–`PG24`, כל Objective, Prerequisite, Output, Exit ו־Current, וכן ה־Core flow וה־Current phase vector.

1.3.2 נבנה גרף תלות לוגי מן ה־Prerequisites המפורשים והמשתמעים ונבדקו Cycles, Joins, Parallel branches, Successor loops, safe terminals ו־Reachability אל Gate29.

1.3.3 לכל שלב נבדקו: Subject root, Input root, Output identity, Producer, Reviewer, Acceptance writer, authority, expiry, invalidation, deterministic predicate ו־Failure terminal.

1.3.4 נבדקו בנפרד Bootstrap/self-authorization, Review Protocol, Source universe, Program acceptance, Public-repository hardening, exact-root human approval, protected CAS, Gate29, Gate30, planning-only boundary, progress denominators ו־ETA publication.

1.3.5 `P0` הוא כשל שמאפשר Self-authorization, Gate/Permit שגוי, Deadlock, stale acceptance, Push לא מוגן, hidden implementation או אי־יכולת עקרונית להגיע ל־Root קביל. `P1` הוא חוזה מהותי חסר או עמום שיכול לשנות סדר, Scope, Evidence או Status. `P2` הוא ליקוי זהות/מינוח/תצפית שאינו לבדו פותח Gate.

## 1.4 פסק דין וסיכום מספרי

1.4.1 `verdict=REJECT-AS-DETERMINISTIC-CONTROL-SEQUENCE`.

1.4.2 הנושא הוא Map מועיל המפריד היטב בין Planning ל־Product ומקבע נכון שהמאגר נשאר Public, אך הוא אינו עדיין Phase registry בר־ביצוע או בר־קבלה.

1.4.3 נמצאו בדיוק `32` Findings עצמאיים: `15 P0`, ‏`14 P1`, ‏`3 P2`, ‏`0 P3`.

1.4.4 קיימת לפחות לולאת תלות חוסמת אחת: `PG04 frozen SourceSet → PG06 → PG07 → PG08 → PG09 Admitted SourceSet → PG04` כאשר `frozen source set` מפורש כ־SourceSet הקנוני היחיד שהרצף מגדיר.

1.4.5 אין Root accepted שמסיים את `PG18` לפני ש־`PG20` דורש Program root accepted/current; לכן גם ללא הלולאה אין Path דטרמיניסטי אל `PG20`.

1.4.6 `Gate29=BLOCKED`, ‏`development freeze=ACTIVE`, וה־Subject accepted=`0/1`.

1.4.7 Product percentage, Product remaining person-hours, Planning remaining person-hours, Critical path ו־Calendar ETA נשארים `unknown/unavailable`.

# 2. Findings P0

## 2.1 `MPSC-HR-F001` — Bootstrap root מקבל Acceptance לפני שקיים חוזה Acceptance לא־עצמי

2.1.1 `severity=P0`.

2.1.2 `location=§2.1.3; §2.3.1–§2.3.4; §3.1.6`.

2.1.3 `defect`: ‏`PG00` דורש `accepted successor baseline root`, ו־`PG02` דורש External acceptance של ה־Bootstrap lifecycle, אך הרצף אינו מגדיר `BootstrapAuthorityEnvelope B0`, ‏Genesis mandate receipt, detached Act instances או Generation קטן יותר שמסמיך פעולות אלה.

2.1.4 `consequence`: Baseline או BCA2 יכולים לאשר את עצמם, או שהרצף נתקע משום שכל Acceptance ממתין לחוזה שעדיין לא התקבל.

2.1.5 `requiredFix`: להוסיף לפני PG00/PG02 Bootstrap generation חיצוני ומוגבל הקושר את מנדט Tal, SourceFreezeRoot, Policy version, Actor appointments, Subject root ו־Evidence root; ה־Subject לא יהיה Member/Ancestor של פעולות יצירתו ואישורו.

2.1.6 `acceptancePredicate`: Traversal בלתי־תלוי מוכיח אפס self-membership/authority edge; כל Bootstrap Act פותר ל־B0 אחד; B0 מקבל exact-root QA, Review ו־Tal approval חיצוניים; Missing/ambiguous authority מחזיר `BLOCKED-NO-BOOTSTRAP-AUTHORITY`.

## 2.2 `MPSC-HR-F002` — PG02 דורש Review לפני ש־PG03 מגדיר את Review Protocol

2.2.1 `severity=P0`.

2.2.2 `location=§2.3.4; §2.4.2–§2.4.4; §2.6.4`.

2.2.3 `defect`: יציאת PG02 דורשת `exact-root independent reviews`, אך Protocol הביקורת נבנה רק ב־PG03 שתלוי ב־PG02 accepted. גם PG05 רשאי להגיע ל־Acceptance בלי Prerequisite מפורש של PG03.

2.2.4 `consequence`: או שמופעל Protocol לא מוגדר, או שמופעל Protocol עתידי כדי לאשר את התנאי שמסמיך אותו; בשני המקרים עצמאות וזהות Review אינן ניתנות להוכחה.

2.2.5 `requiredFix`: להגדיר BootstrapReviewProtocol מינימלי חיצוני וקפוא עבור PG02 בלבד; לאחר PG03 כל Subject אחר, לרבות PG05, יחויב ב־PG03 accepted. אין להשתמש ב־PG03 רטרואקטיבית כדי לקבל PG02.

2.2.6 `acceptancePredicate`: גרף הסמכה מוכיח ש־PG02 Reviews נשענים רק על Protocol מוקדם וחיצוני, ו־PG03/PG05 Reviews נשענים על Root accepted מתאים; cycle count=`0` ו־undefined-review edge count=`0`.

## 2.3 `MPSC-HR-F003` — מעגל תלות בין Audit reconciliation ל־Admitted SourceSet

2.3.1 `severity=P0`.

2.3.2 `location=§2.5.2; §2.7.2; §2.8.2; §2.9.2; §2.10.1–§2.10.4; §3.1.6`.

2.3.3 `defect`: PG04 דורש `frozen source set`, אך ה־Admitted SourceSet היחיד נוצר ב־PG09. PG09 תלוי PG08, PG08 תלוי PG07, PG07 תלוי PG06, ו־PG06 תלוי ב־PG04 `where required`.

2.3.4 `consequence`: אין סדר Topological מלא; פירוש מחמיר חוסם לנצח, ופירוש מקל מאפשר ל־PG04 להשתמש ב־SourceSet שאינו מוגדר או אינו קביל.

2.3.5 `requiredFix`: להפריד `ReviewInputFreeze` מוקדם ומצומצם מ־`ProgramAdmittedSourceSet`; לקשור את PG04 לראשון בלבד, וליצור Edges מפורשים ללא חזרה מ־PG09 אל PG04.

2.3.6 `acceptancePredicate`: שני Graph parsers מפיקים DAG זהה; topological sort מכסה כל Phase instance פעם אחת; cycle/orphan count=`0`; כל מופע `source set` פותר ל־Type+Root יחיד.

## 2.4 `MPSC-HR-F004` — יקום הקלט של PG06 עדיין אינו קיים וה־Prerequisite מותנה בפרוזה

2.4.1 `severity=P0`.

2.4.2 `location=§2.7.1–§2.7.4; §2.6.4; §2.10.3–§2.10.4`.

2.4.3 `defect`: PG06 מבטיח Total coverage של `all ... source requirements` ושל `every admitted input`, אך SURS אינו חייב להיות accepted לפני PG06, וה־Admitted SourceSet נוצר רק ב־PG09. הביטוי `PG04 reconciliation available where required` אינו Predicate שמכריע מתי הוא Required.

2.4.4 `consequence`: PG06 יכול לדווח `dangling=0` מול מכנה חלקי או משתנה, ושינוי מאוחר ב־SURS/SourceSet אינו מחויב לפתוח Successor.

2.4.5 `requiredFix`: להקפיא `TRD2RequirementInputManifest` מפורש עם כל member IDs ו־roots; להחליף `where required` ב־Boolean applicability record; להגדיר האם PG06 תלוי ב־SURS requirements accepted או ב־SourceSet, ולבטל כל טענה על קלט שטרם קיים.

2.4.6 `acceptancePredicate`: Forward/inverse comparison נותן `100%` מול InputManifest קפוא ולא־ריק; unresolved applicability=`0`; שינוי member/root מבטל PG06 וכל Descendant תלוי.

## 2.5 `MPSC-HR-F005` — Outputs אינם Artifacts מדויקים ולכן אי־אפשר לקבל Phase

2.5.1 `severity=P0`.

2.5.2 `location=כל שדות outputs ב־§2.1.2–§2.25.3; בפרט §2.3.3, §2.13.3, §2.21.3`.

2.5.3 `defect`: Outputs הם רשימות שמיות בפרוזה ללא `artifactId`, schema/version, durable locator, raw/canonical digest, byte length, producer, input roots, generatedAt, expiry ו־supersession relation.

2.5.4 `consequence`: Phase יכול להיחשב Complete על קובץ שגוי, ישן או ששונה; downstream אינו יכול להוכיח שהוא צרך את אותם Bytes שנבדקו.

2.5.5 `requiredFix`: ליצור Output registry קנוני לכל Phase instance, עם Artifact records אטומיים ו־Root manifest חיצוני; כל Output נוצר בידי Producer יחיד ונקשר לכל Input root.

2.5.6 `acceptancePredicate`: שני Readers משחזרים אותו Output set ו־Merkle/root digest; missing/duplicate/collision/stale artifact count=`0`; כל Prerequisite edge קושר exact accepted output root.

## 2.6 `MPSC-HR-F006` — אין מודל Phase Acceptance וסמכויות מופרדות

2.6.1 `severity=P0`.

2.6.2 `location=כל שדות exit/current; §2.3.4; §2.4.4; §2.6.4; §2.24.2–§2.24.4`.

2.6.3 `defect`: המונח `accepted` חוזר ללא `PhaseCandidate`, ‏`EvidenceBundle`, ‏QA, Review A/B, Reconciliation, VetoSet, exact-root approver, AcceptanceWriter, authority epoch או protected pointer לכל Phase.

2.6.4 `consequence`: Presence, Producer assertion או Current label יכולים להפוך ל־Acceptance; אותו אדם/Artifact יכול לייצר, לבדוק ולאשר את עצמו.

2.6.5 `requiredFix`: להגדיר Lifecycle envelope אחיד לכל Phase generation, Role/Conflict matrix, named appointments, exact roots, expiry/revocation ו־CAS/readback; Subject, lifecycle acts ו־acceptance pointer נשארים Domains נפרדים.

2.6.6 `acceptancePredicate`: לכל Phase accepted קיים Envelope מלא ושני Readers מאמתים root/roles/current pointer; Producer∩Reviewer∩Reconciler∩AcceptanceWriter עומד במטריצת אי־התלות; אחרת Accepted=false.

## 2.7 `MPSC-HR-F007` — לולאות Rework אינן סגורות ואינן סופיות

2.7.1 `severity=P0`.

2.7.2 `location=§1.2.2; §2.19.1–§2.19.4; §2.22.3–§2.22.4`.

2.7.3 `defect`: `repeated QA/Reviews as needed`, ‏`successor loops` ו־`relevant QA/Review phase` אינם מציינים Return edge, Delta classification, generation number, maximum attempts, escalation, safe terminal או מתי Crosswalk/Schedule/Source work חייב להתחדש.

2.7.4 `consequence`: Rework יכול לדלג על Derived artifacts, למחזר Review ישן או להמשיך ללא Bound, בניגוד לטענת `finite control path`.

2.7.5 `requiredFix`: להגדיר Rework routing table לפי Defect class ו־changed root; כל Cycle יקבל Instance/Actual/Parent reconciliation; להגדיר monotonic closure invariant ו־`BLOCKED-REQUIRES-NEW-AUTHORITY` כאשר אין התקדמות או Bound.

2.7.6 `acceptancePredicate`: Mutation corpus מפעיל כל Defect class ומחזיר Return phase יחיד; כל Successor עובר מחדש בכל Descendant מושפע; אין edge אל Review receipt ישן; graph termination policy Total לכל outcome.

## 2.8 `MPSC-HR-F008` — Invalidation ו־Freshness אינם מתפשטים לאורך הרצף

2.8.1 `severity=P0`.

2.8.2 `location=§1.2.2; §2.6.1; §2.9–§2.24`.

2.8.3 `defect`: רק שינוי Byte ב־Subject מוזכר. אין Invalidation graph עבור Source expiry, Decision amendment, authority/role epoch, policy/provider/legal delta, capacity/calendar change, Git HEAD/settings change, Evidence expiry או revocation.

2.8.4 `consequence`: SourceSet, schedule, Review, approval, Public hardening או Gate29 יכולים להישאר Current לאחר שהנחה סמכותית השתנתה.

2.8.5 `requiredFix`: להוסיף InvalidationTrigger registry ו־reverse dependency graph מכל Artifact/Decision/Authority אל כל Descendant, עם `asOf`, ‏`validThrough`, revokedAt ו־current-pointer clearing semantics.

2.8.6 `acceptancePredicate`: לכל Trigger קיימת בדיקת Mutation שמבטלת בדיוק את Descendants הנכונים; stale artifact מקבל zero Credit ואינו Current; no-trigger/no-owner count=`0`.

## 2.9 `MPSC-HR-F009` — Program Candidate אינו מקבל Acceptance לפני Master assembly

2.9.1 `severity=P0`.

2.9.2 `location=§2.17–§2.19; §2.21.1–§2.21.2`.

2.9.3 `defect`: PG16 מבצע Producer QA, PG17 Reviews ו־PG18 Reconciliation, אך אין Phase או Exit שמפיק detached Program Acceptance envelope/current root. למרות זאת PG20 דורש `accepted/current` Program root.

2.9.4 `consequence`: PG20 צורך Candidate בלתי־קביל, או שה־Prerequisite בלתי־אפשרי ולכן Gate29 אינו Reachable.

2.9.5 `requiredFix`: להוסיף ProgramCandidate acceptance phase חיצוני אחרי Successor loop, או להגדיר במפורש ש־Master Candidate הוא ה־Acceptance envelope הראשון ולהסיר את הדרישה ל־Program accepted root לפניו; אין ערבוב בין שתי האפשרויות.

2.9.6 `acceptancePredicate`: Path analyzer מוצא Producer→QA→Reviews→Reconciliation→Veto→exact-root approval→CAS→accepted Program root לפני consumer ראשון; missing acceptance edge count=`0`.

## 2.10 `MPSC-HR-F010` — PublicRepoHardening נשאר Readiness בלבד ללא Gate תפעולי לפני Push

2.10.1 `severity=P0`.

2.10.2 `location=§1.2.3; §2.20.1–§2.20.5; §2.25.2; §3.1.6`.

2.10.3 `defect`: PG19 מכין Candidate ו־Permit request בלבד. ה־actual GitHub mutation נמסר ל־`separate exact permit` שאינו Phase/Edge/Artifact ברצף; PG24 מסתפק ב־`where applicable` ואינו מחייב remote hardening PASS לפני כל Push.

2.10.4 `consequence`: הרצף אינו מוכיח כיצד המאגר Public עובר מ־unprotected ל־hardened, מי מבצע, מתי Gate נבדק, וכיצד Push edge נשאר חסום במקרה של Feature unavailable או Readback conflict.

2.10.5 `requiredFix`: להגדיר `PublicRepoHardeningGate` חיצוני לפני כל Push, ExactDiffPermit חד־ניסיוני, admin mutation instance, two live readbacks, compensating-control Decision ו־terminal מפורש; להפריד אותו מ־Visibility שאסור לשנות ל־Private.

2.10.6 `acceptancePredicate`: כל Push edge תלוי ב־Gate instance טרי הכולל כל בקרות D18-A2; wrong repo/diff/head, expiry, replay, missing platform feature או readback mismatch מחזירים `PUSH-BLOCKED`; Visibility נשאר Public.

## 2.11 `MPSC-HR-F011` — חוזה Gate29 CAS אינו שלם

2.11.1 `severity=P0`.

2.11.2 `location=§2.24.1–§2.24.4`.

2.11.3 `defect`: ה־CAS אינו מחויב במפורש ל־Master subject root, Evidence root, Parser comparison, Producer QA, Review A/B, Reconciliation, VetoSet, Tal approval, domain approvals, previous accepted root, authority epoch, trusted time ו־single-attempt ID. יש רק `authoritative current-head readback` יחיד.

2.11.4 `consequence`: Wrong/stale root, ABA head, response loss או Acceptance writer שגוי יכולים להפיק Planning handoff שאינו ניתן להבחנה מהצלחה תקפה.

2.11.5 `requiredFix`: לאמץ Envelope מלא, expected-head/version, one-use attempt, two independent readbacks ו־TerminalReconcile XOR; Acceptance pointer חיצוני ואינו Member ב־Master.

2.11.6 `acceptancePredicate`: two-readback tuple=`pointerId,envelopeDigest,subjectRoot,authorityEpoch`; שני ה־tuples זהים ל־Attempt; replay/timeout/conflict/response-loss/ABA tests מפיקים רק `BLOCKED|REJECTED`, ולעולם לא Handoff משוער.

## 2.12 `MPSC-HR-F012` — Hidden implementation נמצא בתוך מסלול שמוצהר Planning-only

2.12.1 `severity=P0`.

2.12.2 `location=§1.1.5; §2.8.3; §2.17.3; §2.25.1–§2.25.4`.

2.12.3 `defect`: כל 25 השלבים מוגדרים Planning-generation ללא implementation authority, אך PG07 מפיק `parser/graph implementations`, PG16 מפיק mutation/attack execution results, ו־PG24 אומר `execute only the accepted scope` בתוך אותו Phase namespace.

2.12.4 `consequence`: ניתן לפרש את הרצף כהיתר לכתוב כלי קוד או להתחיל Product/external mutation לפני Exact-root Master והוראת User חדשה, בניגוד ל־Freeze.

2.12.5 `requiredFix`: להפריד Specification/vector authoring נטול קוד מן Implemented validator tooling; כל Code/Build/runtime/external mutation יעבור ל־Post-Gate29 execution registry שמופעל רק ב־ImplementationInstructionReceipt מפורש.

2.12.6 `acceptancePredicate`: Pre-Gate29 reachable task scan מחזיר zero Code/Build/runtime/Git/Provider mutation; כל executable action נמצא רק ב־future ProgramTask root bound ל־PG23+instruction; מונח `implementation` לפני הגבול מסווג או מוסר.

## 2.13 `MPSC-HR-F013` — אין מכנה עבודה לתכנון ולכן הטענה למסלול סופי אינה ניתנת להוכחה

2.13.1 `severity=P0`.

2.13.2 `location=§1.1.4–§1.1.6; §2.13; §2.16; §3.1.5`.

2.13.3 `defect`: 25 Phase labels אינם Planning Task leaves. אין Bootstrap/Lifecycle/Planning-generation Work registry, effort ranges, assignments, capacity או ExternalWait instances לעבודת PG00–PG24. PG15 מתזמן Program leaves שנוצרו מאוחר, לא את העבודה שכבר דרושה להגיע אליו.

2.13.4 `consequence`: Remaining planning hours ו־Calendar ETA יישארו `unknown/unavailable`; אי־אפשר להוכיח Finiteness, Critical path או עלות השלמת ה־Master.

2.13.5 `requiredFix`: ליצור Registry נפרד של atomic Planning work authorized by B0/accepted predecessor, כולל Actual, ETC, resources, calendars, mutexes, waits ו־generation rework; לא לערבב אותו עם Product denominator.

2.13.6 `acceptancePredicate`: כל Phase outcome מקבל producer Work leaf אחד לפחות; Parent/Phase מקבלים zero hours; unique union/assignment/schedule parsers מסכימים; critical unbounded wait מבטל ETA; Product percentage נשאר נפרד.

## 2.14 `MPSC-HR-F014` — רוב השלבים חסרים Safe failure terminals

2.14.1 `severity=P0`.

2.14.2 `location=כל §2.1–§2.25; בפרט §2.9.4, §2.18.4, §2.23.4, §2.24.4`.

2.14.3 `defect`: Exit מתאר כמעט רק Success. אין Total transition עבור Missing source, rejected review, role unavailable, approval expiry/revocation, parser disagreement, external timeout, unknown bound, provider limitation, corrupt evidence או repeated failure.

2.14.4 `consequence`: Orchestrator יכול להשאיר Phase ב־undefined state, להניח Retry אינסופי או לפרש חסר כ־Success.

2.14.5 `requiredFix`: לכל Phase להגדיר Enum סופי `NOT-ENTERED|ACTIVE|BLOCKED|REJECTED|SUPERSEDED|ACCEPTED`, failure reason, retry/escalation policy, expiry ו־permitted transitions.

2.14.6 `acceptancePredicate`: State-machine model checker מכסה כל Event/State pair; undefined transition count=`0`; כל Unknown/timeout/conflict מגיע ל־BLOCKED/REJECTED בלי Output acceptance או downstream permit.

## 2.15 `MPSC-HR-F015` — ה־Control sequence עצמו חסר מסלול Review ו־Acceptance חיצוני

2.15.1 `severity=P0`.

2.15.2 `location=§1.1.2–§1.1.4; §2 כולו; §3 כולו`.

2.15.3 `defect`: ה־Subject הוא `draft/not-accepted`, אך אין Phase חיצוני שמקפיא, בודק, מיישב ומאשר את רצף השלבים עצמו לפני שהוא משמש סמכות סדר. הכנסת Acceptance שלו לתוך עצמו תהיה self-authorization.

2.15.4 `consequence`: אף Prerequisite או Current status במסמך אינו מחייב; שימוש בו כמפת ביצוע יכול לעקוף את Bootstrap שהמסמך מבקש ליצור.

2.15.5 `requiredFix`: ליצור Successor control-sequence Candidate חדש תחת B0 חיצוני, לבצע Reviews בלתי־תלויים על exact root, ליישב Findings אלה ולהפיק detached ControlSequenceAcceptance שאינו Member ב־Subject.

2.15.6 `acceptancePredicate`: accepted pointer חיצוני קושר Subject/Evidence/Reviews/Reconciliation/Tal root; Subject graph אינו כולל את lifecycle acts שלו; כל Consumer מסרב ל־draft/rejected/stale sequence root.

# 3. Findings P1

## 3.1 `MPSC-HR-F016` — אין Phase DAG פורמלי וה־Ordering המודפס אינו מלא

3.1.1 `severity=P1`.

3.1.2 `location=§2 heading; §3.1.6`.

3.1.3 `defect`: הרצף נקרא `Twenty-five ordered`, אך רשימת ה־known ordering משמיטה PG00, PG01, PG05 ו־PG19 מן השרשרת הראשית, ואינה מגדירה AND/OR joins, edge type, optionality או parallel completion join.

3.1.4 `consequence`: שני קוראים יכולים להפיק סדרים שונים; PG20 עלול להתחיל בלי PG19, או PG06 לפני PG05/PG04 לפי פירוש מקומי.

3.1.5 `requiredFix`: להחליף prose ב־typed Edge registry וב־Join records לכל 25 Phase types/instances, כולל conditional predicate ו־topological tie-break.

3.1.6 `acceptancePredicate`: שני parsers מחזירים אותו DAG, אותו topological order equivalence class ואותם Joins; every phase reachable; missing/extra edge count=`0`.

## 3.2 `MPSC-HR-F017` — ה־Core flow סותר את סדר המספור של Source universe ו־TRD-2

3.2.1 `severity=P1`.

3.2.2 `location=§1.2.1; §2.6–§2.8`.

3.2.3 `defect`: Core flow מציב `TRD-2 → Source universe`, בעוד PG05 Source-universe Definition ממוספר לפני PG06/PG07, ו־PG08 Source inventory אחרי TRD-2. שלושת המונחים אינם מסווגים ל־Definition/Requirements/Inventory.

3.2.4 `consequence`: Reader אינו יודע אם Source Definition קודם ל־TRD-2, רק Inventory אחריו, או שכל Source work מאוחר; הדבר משנה את קלט PG06.

3.2.5 `requiredFix`: לפרט ב־Core flow שמות Type מלאים ולהפיקו אוטומטית מן Phase DAG, לא לכתוב Flow עצמאי.

3.2.6 `acceptancePredicate`: Core view regenerated מן DAG תואם לכל Edge; textual order contradiction count=`0`.

## 3.3 `MPSC-HR-F018` — Current active status אינו מובחן מ־Phase entry

3.3.1 `severity=P1`.

3.3.2 `location=§2.4.2/§2.4.5; §2.6.2/§2.6.5; §2.7.2/§2.7.5; §3.1.2`.

3.3.3 `defect`: PG03, PG05 ו־PG06 מוגדרים Active authoring/review אף שה־Prerequisites שלהם אינם accepted/complete. אין State נפרד ל־`preparatory-authoring-not-entered`.

3.3.4 `consequence`: עבודת הכנה יכולה לקבל בטעות Phase progress או להיחשב authorized execution למרות ש־Entry gate חסום.

3.3.5 `requiredFix`: להפריד `artifact-preparation observation` מ־`PhaseInstance state`; Entry receipt נדרש למעבר NOT-ENTERED→ACTIVE ואינו רטרואקטיבי.

3.3.6 `acceptancePredicate`: כל ACTIVE Phase כולל exact EntryReceipt לכל prerequisites; Prework ללא Receipt מקבל zero phase credit וסטטוס `PREPARATORY-UNACCEPTED` בלבד.

## 3.4 `MPSC-HR-F019` — Vocabulary של Complete, Pass, Frozen, Accepted ו־Current אינו קנוני

3.4.1 `severity=P1`.

3.4.2 `location=§2.10.2; §2.15.2; §2.17.2; §2.18.2; §2.19.2; §2.21.2; §2.22.2`.

3.4.3 `defect`: Prerequisites משתמשים לסירוגין ב־`complete`, ‏`frozen Candidate`, ‏`frozen roots`, ‏`pass`, ‏`accepted`, ‏`clean Candidate` ו־`current roots` בלי Relation פורמלי ביניהם.

3.4.4 `consequence`: Phase יכול לצרוך frozen-but-rejected או complete-but-unaccepted artifact.

3.4.5 `requiredFix`: להגדיר State enum ו־eligibility predicate יחיד לכל Input edge; `FROZEN` הוא immutability state ולא Acceptance, ו־`PASS` הוא Test result בלבד.

3.4.6 `acceptancePredicate`: Type checker דוחה כל edge שדורש Accepted ומקבל Frozen/Complete/Pass; coercion count=`0`.

## 3.5 `MPSC-HR-F020` — PG20 משתמש בטווח `PG10–PG19 accepted/current` שאינו Predicate

3.5.1 `severity=P1`.

3.5.2 `location=§2.21.2`.

3.5.3 `defect`: Range אינו מונה Artifact roots, אינו מבהיר אם כל עשרת השלבים נדרשים, ומאפשר לכל Input להיות `accepted` או `current` בלי הבחנה.

3.5.4 `consequence`: Master assembly יכול להשמיט Phase, לצרוך Artifact transitional או לקבל Root שלא נבדק.

3.5.5 `requiredFix`: להחליף Range ב־MasterAssemblyInputManifest מפורש של Artifact IDs, exact roots, required state, schema version ו־freshness לכל member.

3.5.6 `acceptancePredicate`: manifest cardinality נגזרת מן DAG; Range token count=`0`; כל member resolves/accepted/current/fresh לפי Type; extra/missing member חוסם assembly.

## 3.6 `MPSC-HR-F021` — מטריצת Exact-root approvals אינה מפורטת

3.6.1 `severity=P1`.

3.6.2 `location=§2.23.1–§2.23.4; §2.24.2`.

3.6.3 `defect`: `Tal and named domain authorities` ו־`all mandatory approvals` אינם מונים Approval types, Scope, PersonId, eligibility, Primary/Backup, conflict rules, signature/receipt schema, expiry, revocation ו־Veto behavior.

3.6.4 `consequence`: Approval חסר יכול להיעלם מן המכנה, Blanket approval יכול להתפרש כ־root approval, או approver לא מוסמך יכול לסגור תחום.

3.6.5 `requiredFix`: ליצור ApprovalRequirementManifest נגזר מ־Scope/Threat/Data/Gate roots ומטריצת Appointments נפרדת; כל Approval נקשר לכל roots ול־claim scope המדויק.

3.6.6 `acceptancePredicate`: required approval denominator סופי ולא־ריק; 100% receipts exact/unexpired/unrevoked; missing, rejected, conflicted או blanket response מפיק no acceptance.

## 3.7 `MPSC-HR-F022` — Gate30 ונתיב GA אינם חלק מחוזה ה־Handoff

3.7.1 `severity=P1`.

3.7.2 `location=§1.1.4; §1.2.1; §2.15.1; §2.25; §3.1.7`.

3.7.3 `defect`: ה־Subject מסתיים ב־Gate29 ובהוראת implementation. הוא אינו מחייב במפורש ש־PG13/PG14 יכללו Gate30 canonical, GA Scope Manifest, release evidence, vetoes, staged rollout, post-GA observation ו־service lifecycle, ואינו מציג Gate30 state.

3.7.4 `consequence`: Master יכול להתקבל כתוכנית implementation בלי להבטיח נתיב מוגדר לטענת GA/Full product; קורא עלול לפרש PG24 כסיום התוכנית כולה.

3.7.5 `requiredFix`: לקשור את Handoff ל־Program registry שחייב לכלול Gate30 ו־Post-GA lifecycle; להצהיר במפורש ש־PG24 אינו Product completion וש־Gate30 נשאר BLOCKED/CLOSED עד Release-specific acceptance.

3.7.6 `acceptancePredicate`: Gate universe coverage כולל exact canonical Gate30 record ו־all applicable instances; Program graph מכיל path Implementation→Release certification→Gate30→Observation/Service; אין GA claim ב־PG23/PG24.

## 3.8 `MPSC-HR-F023` — PG19 מאבד בקרות חובה של D18-A2 בתוך ניסוח מקוצר

3.8.1 `severity=P1`.

3.8.2 `location=§2.20.1–§2.20.4`.

3.8.3 `defect`: PG19 מזכיר משפחות בקרות אך אינו מחייב Work ID, Owner, Evidence, Negative bypass test, private Evidence boundary, OIDC, fork/`pull_request_target` policy, alert disposition, compensating-control Decision, wrong-root tests ושני live readbacks לכל Control.

3.8.4 `consequence`: `planning evidence complete` יכול להיקבע על Checklist חלקי שאינו עומד בהחלטת Public המחייבת.

3.8.5 `requiredFix`: לייבא את D18-A2 ואת BCA2-REQ-047–050 ברמת Control ID מפורשת, ללא קיצור סמנטי, וליצור disposition לכל Control.

3.8.6 `acceptancePredicate`: forward/inverse coverage של כל Control מחזיר 100%; כל Control מקבל owner/work/test/evidence/disposition; unsupported feature אינו PASS ללא compensating Decision accepted.

## 3.9 `MPSC-HR-F024` — Canonical repository root אינו קשור ל־PG19

3.9.1 `severity=P1`.

3.9.2 `location=§2.1.1; §2.20.2–§2.20.4`.

3.9.3 `defect`: `exact canonical repo/diff` אינו Artifact type ואינו מקבע `/Users/tal/Documents/connect/web` מול ה־outer Git root, branch, HEAD, remote ו־repo ID בכל Git operation.

3.9.4 `consequence`: Hardening/scan/permit יכולים להיות מוכנים נגד repository שגוי, בעוד ה־Public repo האמיתי נשאר לא מוגן.

3.9.5 `requiredFix`: ליצור RepoAuthorityRegistry ו־Wrong-root guard; כל planned/external Git act נקשר ל־repoRootId, gitDir, branch, expected HEAD ו־remote repository ID.

3.9.6 `acceptancePredicate`: פעולה מן outer root נכשלת; שני Readbacks מאמתים אותו repo/branch/head/settings; unresolved or fallback root count=`0`.

## 3.10 `MPSC-HR-F025` — Phase outputs מרובי־תוצרים אינם אטומיים ואין Unique producer

3.10.1 `severity=P1`.

3.10.2 `location=§2.1.2; §2.3.3; §2.4.3; §2.5.3; §2.8.3; §2.14.3; §2.16.3; §2.17.3; §2.22.3`.

3.10.3 `defect`: Phase אחד מייצר אוספים הטרוגניים רבים, אך אין Output graph שמפריד Primary output, supporting evidence, reports, manifests ו־pointers או מונע שני Producers לאותו Artifact.

3.10.4 `consequence`: Partial output יכול לסמן Phase complete, ו־Artifact collision יכול להסתיר גרסה חסרה.

3.10.5 `requiredFix`: לפרק כל Output ל־Artifact record אטומי עם producerTaskId יחיד ו־mandatory join שמגדיר Complete רק כאשר כל required members accepted.

3.10.6 `acceptancePredicate`: output collision=`0`; every required output exactly one producer; Join membership complete; missing optionality decision מפיק BLOCKED.

## 3.11 `MPSC-HR-F026` — חוזה Schedule/ETA של PG15 אינו מספיק לפרסום מספר

3.11.1 `severity=P1`.

3.11.2 `location=§2.16.1–§2.16.4; §3.1.5`.

3.11.3 `defect`: `all critical nodes bounded for any published ETA` אינו מגדיר solver/version, graph semantics, anchor, low/high same-root relation, calendar/capacity cut, wait overlap, optimality claim, freshness או terminal כאשר critical wait חסר upper bound.

3.11.4 `consequence`: שני Schedulers יכולים להפיק ETA שונה מאותו Root, או לפרסם High ETA למרות Wait חיצוני לא חסום.

3.11.5 `requiredFix`: לקשור PG15 במפורש לכל MATH-001–MATH-032 ול־ScheduleSnapshot schema, algorithm/version/tie-break/input roots/asOf/validThrough/publication policy.

3.11.6 `acceptancePredicate`: שני schedulers מחזירים אותו result או verified tolerance policy; unbounded critical wait מחזיר ETA=`unknown/unavailable`; stale/mismatched input מבטל publication.

## 3.12 `MPSC-HR-F027` — `0/25 accepted control phases` אינו מגובה ב־Acceptance registry

3.12.1 `severity=P1`.

3.12.2 `location=§3.1.1; §3.1.4`.

3.12.3 `defect`: המכנה 25 הוא Count של Phase definitions ב־draft, לא Denominator accepted; המונה 0 נגזר מהיעדר Evidence לא מוגדר ולא משאילתת closed-world על Acceptance envelopes.

3.12.4 `consequence`: המספר יכול להיראות כמדד תכנון סמכותי למרות שה־Sequence עצמו לא התקבל וייתכן שיתווספו/יתפצלו Phases.

3.12.5 `requiredFix`: לסמן `candidate phase-definition count=25`; לחשב Accepted count רק מ־accepted ControlSequence root ו־PhaseAcceptance registry קפוא, או להחזיר `unknown/unavailable`.

3.12.6 `acceptancePredicate`: כל published fraction כולל denominatorRoot, numerator query, asOf ו־metric name; draft denominator אינו מפורסם כ־Accepted closure; no blended Product inference.

## 3.13 `MPSC-HR-F028` — Counts קבועים אינם נגזרים מ־Root סמכותי

3.13.1 `severity=P1`.

3.13.2 `location=§2.2.2; §2.4.2–§2.4.4; §2.6.4; §2.7.1; §2.9.1; §2.11.1/§2.11.4; §2.12.1; §2.16.4`.

3.13.3 `defect`: `73`, ‏`12`, ‏`35`, ‏`26`, ‏`64`, ‏`91+`, ‏`83`, ‏`D01–D31`, ‏`S00–S28`, ‏`21`, ‏`32` מודפסים ידנית ללא Denominator manifest/root ובלי כלל invalidation כאשר היקום משתנה.

3.13.4 `consequence`: Successor source או Finding חדש יכול להשאיר Count ישן שנראה Complete.

3.13.5 `requiredFix`: כל Count נגזר מ־typed manifest accepted, עם member list מפורש, root, query/version ו־asOf; Prose count הוא View בלבד.

3.13.6 `acceptancePredicate`: regeneration נותן parity ל־Count ול־members; changed member/root invalidates dependent count; magic-count linter מוצא אפס Claims לא קשורים.

## 3.14 `MPSC-HR-F029` — PG24 אינו Exit סופי ואינו מגדיר Evidence-return loop

3.14.1 `severity=P1`.

3.14.2 `location=§2.25.1–§2.25.4`.

3.14.3 `defect`: Exit נדחה אל `future accepted Program registry and instruction`; אין schema ל־ImplementationInstructionReceipt, allowed action classes, exact roots/diff/environment, expiry/revocation או graph שמחזיר execution Evidence/Findings ל־Master successor.

3.14.4 `consequence`: ה־25-Phase sequence אינו נסגר; instruction כללי עלול להתפרש כהרשאת ביצוע רחבה, ו־Execution delta עלול לא לבטל את Master planning claim.

3.14.5 `requiredFix`: להפוך PG24 ל־Handoff terminal בלבד; להגדיר Receipt schema exact-scope וליצור Program execution lifecycle נפרד עם evidence/finding/invalidation feedback.

3.14.6 `acceptancePredicate`: PG24 מפיק רק bounded Handoff ונסגר `HANDED-OFF|BLOCKED`; zero Product mutation בתוך Phase; כל future action resolves ל־accepted Task+Permit+environment root וה־Evidence חוזר ל־current/revalidation path.

# 4. Findings P2

## 4.1 `MPSC-HR-F030` — Domain terminology אינו חד־משמעי

4.1.1 `severity=P2`.

4.1.2 `location=§1.1.4–§1.1.5; §2.13 heading/objective; §2.25 heading/objective`.

4.1.3 `defect`: `Program planning`, ‏`Planning-generation`, ‏`execution planning`, ‏`Program records` ו־`execute accepted scope` משמשים בלי Definitions ויכולים לתאר גם יצירת תוכנית וגם ביצוע מוצר.

4.1.4 `consequence`: Boundaries של authority, hours ו־credit עלולים להשתנות לפי Reader.

4.1.5 `requiredFix`: להוסיף Glossary עם ארבעה Domains נפרדים: BootstrapAct, CandidateLifecycleAct, PlanningGenerationTask, ProgramTask; כל Phase ו־Output מקבל Domain יחיד.

4.1.6 `acceptancePredicate`: terminology linter ממפה כל action noun ל־Domain אחד; ambiguous/unclassified action count=`0`.

## 4.2 `MPSC-HR-F031` — Gate namespace של Definition CAS, Gate29 ו־Gate30 אינו מפורש

4.2.1 `severity=P2`.

4.2.2 `location=§2.8.4; §2.24; §3.1.7`.

4.2.3 `defect`: PG07 `protected current-root CAS` אינו מזוהה כ־DefinitionAcceptance gate נפרד; Gate29 מזוהה, ו־Gate30 אינו מופיע. אין `gateId`, ‏`gateType`, ‏`scopeRoot` או prohibition על authority inheritance ביניהם.

4.2.4 `consequence`: הצלחת Definition CAS עלולה להיקרא בטעות Gate29, או Gate29 כהיתר GA.

4.2.5 `requiredFix`: ליצור Gate registry עם namespaces נפרדים ל־Definition acceptance, Planning Gate29, PublicRepoHardeningGate ו־Release Gate30; no implication edges אלא אם מוגדרים במפורש.

4.2.6 `acceptancePredicate`: Gate identity traversal מחזיר ארבע ישויות נפרדות; passing one אינו משנה state/authority של האחרות; free-text gate alias count=`0`.

## 4.3 `MPSC-HR-F032` — Current phase vector חסר Observation identity ו־Freshness

4.3.1 `severity=P2`.

4.3.2 `location=§2.1.4–§2.25.5; §3.1.1–§3.1.7`.

4.3.3 `defect`: שדות `current` ו־phase vector אינם כוללים `observedAt`, ‏observer, source roots, query/version, validThrough או supersedes relation.

4.3.4 `consequence`: Status היסטורי יכול להישאר מוצג לאחר יצירת Artifact, Review או Decision חדש.

4.3.5 `requiredFix`: להעביר Status ל־append-only PhaseObservation records חיצוניים; ה־ControlSequence Subject יכיל Definitions בלבד.

4.3.6 `acceptancePredicate`: כל Current view נגזר מן Observation cut/root; stale observation מזוהה ולא מוצג כ־current; שינוי Status אינו משנה את Sequence Subject bytes.

# 5. בדיקות סגירה נדרשות ל־Successor

## 5.1 Graph ו־Bootstrap

5.1.1 `required`: accepted B0, typed 25+ Phase DAG, no self-authority, no cycle, all joins and safe terminals Total.

5.1.2 `pass`: שני Graph readers מפיקים cardinality, edges, topological ordering, reachability ו־terminal set זהים; cycle/orphan/undefined transition=`0`.

## 5.2 Artifacts, Acceptance ו־Invalidation

5.2.1 `required`: exact Input/Output/Evidence roots, detached lifecycle envelopes, role matrix, two readbacks, reverse invalidation graph ו־freshness לכל Phase generation.

5.2.2 `pass`: כל mutation vector מבטל את כל ורק ה־Descendants הנכונים; no stale Receipt grants Acceptance/Credit/Permit.

## 5.3 Public repository

5.3.1 `required`: Public remains binding; D18-A2 controls imported one-to-one; canonical `/web` root; pre-Push hardening Gate; exact-diff permit; two remote readbacks.

5.3.2 `pass`: direct/wrong-root/wrong-head/replayed/expired/unscanned Push paths חסומים; Visibility-change task count=`0`.

## 5.4 Gate29, Gate30 ו־Execution boundary

5.4.1 `required`: Definition CAS, Gate29, Public hardening ו־Gate30 מופרדים; PG24 הוא Handoff; no Pre-Gate29 executable work.

5.4.2 `pass`: Gate29 protected CAS עומד ב־§2.11.6; Gate30 canonical נמצא ב־Program graph אך נשאר blocked עד Release-specific evidence; Product mutation requires new exact instruction.

## 5.5 Metrics ו־ETA

5.5.1 `required`: חמישה Denominator domains נפרדים; accepted Planning work leaves; unique union; Actual/ETC; capacities/calendars/mutexes/waits; no blended metric.

5.5.2 `pass`: כאשר Root/Task/Assignment/critical bound חסר, metric=`unknown/unavailable`; כל מספר מפורסם כולל metric name, denominator root, asOf, basis ו־claim limit.

# 6. Disposition

## 6.1 מצב מחייב של ביקורת זו

6.1.1 כל `MPSC-HR-F001`–`MPSC-HR-F032` במצב `OPEN`.

6.1.2 אסור לתקן את Subject הקפוא in-place; נדרש Successor root חדש עם disposition אחד־לאחד לכל Finding.

6.1.3 אין Merge סמנטי אוטומטי בין Findings, גם כאשר הם חולקים Required fix או Source.

6.1.4 `ControlSequence acceptance=0/1`; ‏`Gate29=BLOCKED`; ‏`Gate30=BLOCKED/NOT-REACHED`; ‏`development freeze=ACTIVE`.

6.1.5 אין Product code, Build, Git/Push, Deployment, provider/account mutation, credential use או implementation authority מכוח דוח זה.
