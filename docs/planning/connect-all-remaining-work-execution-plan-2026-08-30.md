# 1. Connect — תוכנית מלאה לכל העבודה שנותרה

## 1.1 מעמד המסמך

1.1.1 `artifactId=CONNECT-ALL-REMAINING-WORK-EXECUTION-PLAN-2026-08-30`.

1.1.2 המסמך מרכז את יתרת המחקר, התכנון, הפיתוח, האבטחה, הבדיקות, ה־Pilot, ההשקה והעבודה לאחר ההשקה.

1.1.3 זהו מסמך Planning חי. הוא אינו Acceptance, אינו אישור משפטי, אינו Permit לספק ואינו אישור Production.

1.1.4 המאגר נשאר `PUBLIC`; ‏`Gate29=BLOCKED`; ‏Development freeze=`ACTIVE`; ‏Production Acceptance=`0`.

1.1.5 אחוז ההשלמה המדויק, יתרת השעות ולוח הזמנים נשארים `unknown/unavailable` עד השלמת שלב 11: Atomic Task Registry, משקלי משימות, תלויות וקיבולת העבודה של Tal.

1.1.6 התוכנית כוללת `23` שלבים עיקריים. זהו סדר עבודה, לא מכנה שממנו מותר לחשב אחוז השלמה.

1.1.7 מודל האחריות הפעיל הוא [Tal כאחראי יחיד](sole-owner-operating-model-2026-08-30.md): כל משימה, Gate, חיבור, בדיקה ותיאום בבעלות Tal בלבד. הקצאות Primary/Backup/RACI ישנות מבוטלות לצורכי ביצוע.

1.1.8 אישור חיצוני שנדרש מ־Legal, ספק או מומחה הוא Evidence שטל אחראי להשיג; הוא אינו חלוקת בעלות לאדם אחר.

## 1.2 החלטות Tal המחייבות את התוכנית

1.2.1 `V01=public-no-license-until-legal`: המאגר נשאר ציבורי, אך אינו מעניק רישיון שימוש חדש עד Legal/ownership review.

1.2.2 `V02=approve-each-security-use`: כל שימוש באקראיות קריפטוגרפית דורש אישור נפרד, מדויק ומוגבל.

1.2.3 `V03=wait-live`: מספרי WhatsApp חיים אינם נקבעים ללא Evidence מהחשבון.

1.2.4 `V04=defer`: Billing אוטומטי נדחה עד אחרי Pilot.

1.2.5 `V05=wait-eligible`: Tal אינו מאשר Planning root לפני שהחבילה זכאית.

1.2.6 `V06=keep-active`: הקפאת הפיתוח נשארת פעילה עד שער מתאים.

1.2.7 כל `2/2` ההצבעות הזכאיות ב־`CONNECT-ELIGIBLE-TAL-VOTES-V2` נענו; אין כרגע הצבעה זכאית פתוחה.

# 2. שלב 1 — פרסום בטוח של המצב המקומי ל־GitHub

## 2.1 מה השלב אומר

2.1.1 שומרים את כל העבודה הבטוחה במאגר הציבורי בלי לפרסם Secret, מידע לקוח, קובץ סביבת עבודה פרטי או תוצר זמני מסוכן.

2.1.2 מצב ביצוע=`COMPLETED` ב־30.08.2026; Evidence מפורט ב־
[יומן הביצוע הרציף](current-sequential-execution-ledger-2026-08-30.md).

## 2.2 משימות

2.2.1 למפות כל נתיב Modified, Staged, Untracked ו־Ignored.

2.2.2 לוודא ש־`.env`, ‏`.wrangler`, Build outputs, מסדי נתונים מקומיים ומפתחות פרטיים אינם נכנסים ל־Commit.

2.2.3 לסרוק את ה־staging המדויק באמצעות Gitleaks וסריקת Secret hygiene של הפרויקט.

2.2.4 לבדוק שאין קובץ מעל מגבלת GitHub ושאין Symlink או Nested repository שנכנס בטעות.

2.2.5 להריץ בדיקות, ליצור Commit אחד המתאר את המצב, לבצע Push לענף הנוכחי ולקרוא בחזרה את ה־remote SHA.

## 2.3 מה צריך מ־Tal

2.3.1 אין צורך ב־Token בצ׳אט. נדרשת רק הרשאת GitHub שכבר מוגדרת במחשב.

## 2.4 תנאי סיום

2.4.1 `local HEAD == remote branch HEAD`, ‏Secret scan עבר או שכל Finding סווג ונחסם, והמאגר אומת `PUBLIC`.

2.4.2 תנאי 2.4.1 התקיים עבור commit
`840a46e68c2b19e32feb4b940d446350ce1f525b`. התאמת היסטוריה רחבה
נשמרה כ־false-positive candidate קיים ואינה נחשבת אישור להחלשת Scanner.

# 3. שלב 2 — הקפאת תמונת מצב ומקורות

## 3.1 מה השלב אומר

3.1.1 מצלמים במדויק מה קיים בקוד, במסמכים, בענפים ובמקורות החיצוניים כדי שהמשך התוכנית לא יתבסס על רשימה חלקית.

3.1.2 מצב ביצוע=`IN_PROGRESS`; תצפית ה־Preflight נמצאת ב־
[Discovery Cutoff preflight](discovery-cutoff-preflight-observation-2026-08-30.md).

3.1.3 Candidate מכני נוצר על observed commit `0f0b0e9`, עם Package
root `a790725dc20b73094f7317503850641bcfea748d56bea480500c00ee87a97c17`.
Verifier חוזר עבר, אך המועמד אינו Accepted וחסמי 3.3 נשארים פתוחים.

## 3.2 משימות

3.2.1 להפיק Discovery Cutoff עם HEAD, ‏tracked, modified, staged, untracked, ignored, refs ונתיבי מקור שסופקו.

3.2.2 לסווג כל מקור `PUBLIC-SAFE`, ‏`PRIVATE-REQUIRED`, ‏`PROHIBITED` או `UNKNOWN`.

3.2.3 להפריד User directive, Specification, Official source, System observation ו־Derived planning.

3.2.4 לקבע כל מקור רשמי עם URL, bytes או receipt בטוח, זמן תצפית, גרסה, תחום ותאריך תפוגה.

3.2.5 לאסור Self-membership: פלט חדש אינו יכול להיות מקור של עצמו.

## 3.3 מה צריך מ־Tal

3.3.1 את קובצי האפיון המקוריים, אם חסרים, ואת זהות הבעלים שלהם; אין לשלוח חומר שאין זכות לפרסם.

## 3.4 תנאי סיום

3.4.1 Candidate source set מלא, רשימת חסרים מפורשת ו־Cutoff receipt שניתן לשחזר.

# 4. שלב 3 — B0 Successor חדש

## 4.1 מה השלב אומר

4.1.1 B0 הוא מעטפת הסמכות הבסיסית: מי רשאי להחליט, מי בודק, כיצד מונעים אישור עצמי ואיך שינוי נכתב אטומית.

## 4.2 מצב פתיחה

4.2.1 B0 v7 נדחה; `14/14` Findings פתוחים: `P0=10`, ‏`P1=4`; ‏B0=`ABSENT`.

## 4.3 משימות

4.3.1 לבנות v8 בלתי־משתנה ולא לערוך את v7.

4.3.2 לתקן Path confinement, Symlink rejection, closed schemas ו־canonical serialization.

4.3.3 להפריד בין סמכויות לוגיות במנגנון הבקרה. Tal נשאר Owner יחיד של העבודה, אך אינו רשאי לטעון שביקורת עצמית היא ביקורת עצמאית; אם Gate דורש Reviewer עצמאי, הוא נשאר חסום עד Evidence חיצוני אמיתי.

4.3.4 להגדיר CAS, replay, response loss, outbox ו־recovery כמעבר מצב אטומי אמיתי ולא כ־Boolean נטען.

4.3.5 ליצור mutation corpus שמפיל כל החלשה של Visibility, Authority, Recovery, Acceptance או Permit.

4.3.6 להריץ Producer QA ושני Readers; לאחר מכן ביקורת עצמאית שאינה משתמשת בתוצאות ה־Producer כסמכות.

## 4.4 מה צריך מ־Tal

4.4.1 אין צורך בשמות Primary/Backup. Tal אחראי להכין את החבילה; אם תנאי הקבלה דורש סמכות מקצועית או מבקר עצמאי, Tal יתאם אותו בעתיד וישמור את ה־Evidence.

## 4.5 תנאי סיום

4.5.1 כל `14/14` Findings מקבלים Closure עצמאי, B0 current pointer נוצר ללא self-acceptance ו־Acceptance מתקבל מגורם מוסמך.

# 5. שלב 4 — Three-review Protocol Successor

## 5.1 מה השלב אומר

5.1.1 זהו ספר החוקים של הביקורת: מי בודק, באיזה סדר, אילו ראיות נדרשות ומה קורה כאשר ביקורות חולקות זו על זו.

## 5.2 מצב פתיחה

5.2.1 Protocol v1.9 נדחה; `17` Findings קיימים ורק קרדיט מכני יחיד נשמר ללא Acceptance.

## 5.3 משימות

5.3.1 לבנות v1.10 בלתי־משתנה עם schema סגור לראיות חיצוניות ולתוצאות Validators.

5.3.2 להוכיח שכל Validator חיצוני יכול לקבל Input אמיתי, להצליח במסלול חיובי ולהיחסם בכל Mutation שלילית.

5.3.3 להפריד Producer, Reader A, Reader B, Reviewers, Reconciler ו־Acceptance writer.

5.3.4 להוסיף Path safety, canonical JSON, finite denominators, trusted time, expiry, revocation ו־CAS.

5.3.5 להגדיר שלוש ביקורות: Structural, Semantic/Security ו־Estimate/Schedule, עם Findings שאסור למזג.

## 5.4 מה צריך מ־Tal

5.4.1 אישור בעלי תפקידי ביקורת כאשר יידרשו שמות; Tal אינו מאשר את עבודתו של אותו Producer במקום Reviewer עצמאי.

## 5.5 תנאי סיום

5.5.1 כל Findings נסגרו בנפרד, שני Readers הורגים את כל ה־Mutations וה־Protocol מקבל pointer Accepted מכוח B0.

# 6. שלב 5 — Source Universe ו־Custody

## 6.1 מה השלב אומר

6.1.1 יוצרים רשימה מלאה של כל העובדות, ההוראות והראיות שמותר לתוכנית להשתמש בהן, ומגדירים היכן מותר לשמור כל מקור.

## 6.2 מצב פתיחה

6.2.1 Source Universe v3 נדחה עם `24` Findings; v4 קיים כ־Build charter בלבד ואינו Source Universe Accepted.

## 6.3 משימות

6.3.1 לבצע את Discovery משלב 2 וליצור SourceOccurrenceLedger ו־TargetSpanLedger.

6.3.2 להקצות Sole producer לכל Object ולבנות Graph של שימושים מפורשים והפוכים.

6.3.3 להפריד Public projection מ־Private custody; Unknown נחסם מפרסום.

6.3.4 להגדיר Freshness, authenticity, legal basis, retention ו־invalidation לכל מקור.

6.3.5 לשמר כל Requirement ו־Finding קודם ברמת clause, בלי Range credit ובלי Merge-by-presence.

6.3.6 להריץ שתי Generations, שני Readers ושלוש ביקורות לפי Protocol Accepted בלבד.

## 6.4 מה צריך מ־Tal

6.4.1 אישור זכויות למסמכי האפיון וזהות Private evidence store אם מקור אינו בטוח לפרסום.

## 6.5 תנאי סיום

6.5.1 Source Universe current pointer Accepted, כל `24/24` Findings סגורים ורשימת מקורות חסרים מפיקה Block במקום השמטה.

# 7. שלב 6 — TRD-2 Successor

## 7.1 מה השלב אומר

7.1.1 TRD-2 מגדיר באופן טכני מה המערכת חייבת לעשות, אילו מצבים קיימים ואיך הופכים דרישות למשימות ניתנות לבדיקה.

## 7.2 מצב פתיחה

7.2.1 TRD-2 v5 נדחה; `15` Findings פתוחים: `P0=12`, ‏`P1=2`, ‏`P2=1`; accepted Requirements=`0/128`.

## 7.3 משימות

7.3.1 לבנות v6 חדש עם parser קשיח, canonical root יחיד ו־unknown-field rejection עקבי.

7.3.2 להחליף Membership graph ב־typed semantic producer graph.

7.3.3 לתת לכל Requirement predicate ותסריטי Positive/Negative ייחודיים ולא Harness גנרי בלבד.

7.3.4 לפתור מעגלי Acceptance, Generation, Reconciliation, Head ו־Invalidation.

7.3.5 להגדיר Retention, Legal Hold, Erasure, Restore ו־Backup כ־Data classes נפרדים.

7.3.6 להוכיח שתי Generations, Reconciliation ו־Definition Acceptance באמצעות ראיות חיצוניות.

## 7.4 מה צריך מ־Tal

7.4.1 תשובות עסקיות חדשות רק אם מתגלה Conflict אמיתי; אין צורך לכתוב קוד.

## 7.5 תנאי סיום

7.5.1 כל `128` Requirements נבדקים, `15/15` Findings נסגרים ו־Task Registry Definition מקבל Acceptance.

# 8. שלב 7 — Master Control Sequence Successor

## 8.1 מה השלב אומר

8.1.1 זהו סדר ההפעלה המרכזי שמונע מעבר לשלב מאוחר לפני שכל הקלטים והסמכויות קיימים.

## 8.2 מצב פתיחה

8.2.1 v2 נדחה; predecessor closures accepted=`0/32`; new finding acceptances=`0/35`; Gate30 לא הושג.

## 8.3 משימות

8.3.1 לבנות v3 ללא מעגל B0/Protocol ולתת Producer חיצוני לכל Appointment, Policy, Permit ו־trusted-time input.

8.3.2 לתקן Self-dependent estimation: Task estimates נוצרים רק לאחר Task denominator ולא נדרשים לפני יצירתו.

8.3.3 להגדיר Sole producer ל־Program root, Planning Permit ו־normalizer runs.

8.3.4 להסיר Acceptance-of-Acceptance recursion ולייצר base generation מפורש.

8.3.5 לחייב את כל Authority, environment, actor, scope, permit ו־evidence joins בכל Post-Gate edge.

8.3.6 להוכיח Safe terminals עבור missing, stale, revoked, replayed, conflict ו־response-loss states.

## 8.4 מה צריך מ־Tal

8.4.1 אין אישור root עדיין; Tal יתבקש רק לאחר שה־Sequence יעבור ביקורות.

## 8.5 תנאי סיום

8.5.1 מסלול יחיד, סופי וא־מחזורי מגיע ל־Planning handoff; כל `67` זהויות Finding נשמרות ונסגרות בנפרד.

# 9. שלב 8 — Public repository ו־Cyber hardening

## 9.1 מה השלב אומר

9.1.1 מגינים על קוד שגלוי לכל העולם ומוודאים ששום קובץ ציבורי אינו פותח דרך ל־Secrets, Supply-chain attack או שינוי לא מאושר.

## 9.2 מצב פתיחה

9.2.1 v5 נדחה; `18` Findings פתוחים: `P0=17`, ‏`P1=1`; כל ארבעת ה־Operational Permits חסרים.

## 9.3 משימות

9.3.1 לבנות v6 עם נתיבי Repo-relative נכונים ו־canonical JSON אחיד בין שפות.

9.3.2 לקשור Findings, Requirements, Outputs, Producers ו־Permits ל־Acceptance באמצעות Causal graph אמיתי.

9.3.3 להגן על `main` באמצעות Ruleset, Required CI, Code review, CODEOWNERS ו־signed provenance במגבלות חשבון GitHub.

9.3.4 להפעיל Secret scanning, Dependency review, SAST, artifact integrity ו־release attestations.

9.3.5 להגדיר Public egress policy, license state, contribution policy, issue/PR privacy ו־incident response.

9.3.6 להריץ Hostile mutations על visibility, permit class, lifecycle, schema roots ו־publication scope.

## 9.4 מה צריך מ־Tal

9.4.1 GitHub Admin או Member מתאים; אין לשלוח Personal Access Token בצ׳אט.

## 9.5 תנאי סיום

9.5.1 `18/18` Findings סגורים, ארבעת ה־Permits ניתנים רק במסלולים הנכונים ו־live GitHub readback תואם את המדיניות.

# 10. שלב 9 — OpenAI D02-A10

## 10.1 מה השלב אומר

10.1.1 מגדירים כיצד ה־AI חושב ומציע תשובה בלי לקבל סמכות עצמאית לשלוח, למחוק, לשלם או לשנות מערכת.

## 10.2 מצב פתיחה

10.2.1 D02-A9 נדחה; `8` Findings חדשים פתוחים, ורק `2/7` סגירות קודמות התקבלו; AI runtime נשאר `OFF`.

## 10.3 משימות

10.3.1 לבנות D02-A10 בלתי־משתנה עם typed evidence למודל, Prompt, Tool profile, Account, Tenant, Legal ו־approvals.

10.3.2 לקשור operation identity ל־authority, trusted time, expiry, revocation, CAS, consumption ו־post-readback.

10.3.3 לחייב Source refresh אמיתי; `checked=0` אינו PASS.

10.3.4 לחסום Symlink, path escape, stale evidence, non-admitted model ו־reusable provider prompt ללא Admission.

10.3.5 לבנות Evals חיוביים ושליליים ל־Prompt injection, data leakage, unsafe tool call, cross-tenant access והודעה ללא אישור אדם.

10.3.6 ליישם כל שימוש באקראיות קריפטוגרפית רק לאחר בקשת אישור V02 נפרדת.

## 10.4 מה צריך מ־Tal

10.4.1 OpenAI company project דרך Membership, תקציב, Data controls ואישור אדם מוגדר; אין להעביר API key במסמך.

## 10.5 תנאי סיום

10.5.1 `8/8` Findings נסגרים, Evals עוברים, AI נשאר fail-closed ו־Runtime Permit נוצר רק אחרי Gate מתאים.

# 11. שלב 10 — חיבור שש חבילות היסוד ואישור Planning

## 11.1 מה השלב אומר

11.1.1 מחברים B0, Protocol, Source Universe, TRD-2, Control Sequence ו־Public/Cyber לחבילת תכנון אחת בלי לאבד Finding או סמכות.

## 11.2 משימות

11.2.1 להקפיא exact root לכל אחת משש חבילות היסוד.

11.2.2 לבצע Structural review, Semantic/Security review ו־Estimate/Schedule review נפרדים.

11.2.3 להפיק Reconciliation שורה־לשורה לכל Finding ולכל Conflict.

11.2.4 לבנות Human view ו־machine-readable manifests מאותו מקור.

11.2.5 להציג ל־Tal את ה־root המדויק, Hashes, ממצאים ותוצאות Readers.

11.2.6 אם Tal מאשר, לפרסם current pointer אטומי; אם הוא דוחה, ליצור Successor חדש בלי לערוך את המועמד.

11.2.7 להעריך מחדש Gate29. אישור Planning אינו אישור אוטומטי ל־Production.

## 11.3 מה צריך מ־Tal

11.3.1 אישור או דחייה מפורשים של ה־root המדויק בלבד.

## 11.4 תנאי סיום

11.4.1 Planning root Accepted, כל ביקורות היסוד Accepted ו־Gate29 מקבל החלטה מפורשת עם Scope.

# 12. שלב 11 — Atomic Task Registry, קיבולת Tal וזמן

## 12.1 מה השלב אומר

12.1.1 מפרקים את כל התוכנית למשימות קטנות שניתן לבצע, לבדוק, להקצות ולמדוד.

## 12.2 משימות

12.2.1 למפות כל Requirement, Decision, Finding, Gate, External wait וקובץ קיים למשימה או להסבר מדוע אינו דורש משימה.

12.2.2 לסווג כל מימוש קיים: `KEEP`, ‏`VERIFY`, ‏`REFACTOR`, ‏`QUARANTINE` או `REMOVE-WITH-AUTHORITY`.

12.2.3 לכל Task להוסיף `Owner=Tal`, ‏dependency, environment, inputs, outputs, negative tests, Evidence ו־Definition of Done.

12.2.4 לאסור Task גדול שאינו ניתן לסיום ולפרק אותו לתת־משימות אטומיות.

12.2.5 להוסיף אומדן טווח, confidence, external wait, parallelism ו־critical path רק לאחר שהמכנה סגור.

12.2.6 לחשב לראשונה אחוז Planning, אחוז Product, שעות ותרחישי ETA; מספר חסר נשאר `unknown/unavailable`.

## 12.3 מה צריך מ־Tal

12.3.1 N01 נסגר: `Owner=Tal` לכל העבודה. כדי לחשב זמן נדרשות רק שעות העבודה השבועיות שטל מקצה לפרויקט וחלונות זמן שבהם הוא זמין לטיפול בתקלה.

## 12.4 תנאי סיום

12.4.1 `100%` מהדרישות ממופות למשימות או ל־Non-task disposition, אין Task ללא בעלים ובדיקה, והאומדן ניתן לשחזור.

# 13. שלב 12 — חיבורים, חשבונות וסביבות

## 13.1 מה השלב אומר

13.1.1 מקימים סביבת ניסוי מבודדת לכל ספק לפני שנוגעים בלקוחות או בכסף אמיתי.

## 13.2 משימות

13.2.1 N02: Clerk Staging עם Organizations, MFA ו־named admins.

13.2.2 N03: Railway Staging עם API, Worker, PostgreSQL ו־Redis/BullMQ מבודדים.

13.2.3 N04: Vercel Staging ו־Production נפרדים, Domains ו־APP_PUBLIC_ORIGIN חוקי.

13.2.4 N05: Meta Test WABA, Phone, Templates, Webhook, Permissions ו־approved recipients.

13.2.5 N06: AWS `il-central-1`, ‏private S3, customer-managed KMS, GuardDuty ו־budget alarms.

13.2.6 N07: Better Stack ו־OpenTelemetry עם Redaction ו־Alert routing.

13.2.7 N08: OpenAI company project, Data controls, budgets ו־Eval environment.

13.2.8 N09: Stripe/Paddle Sandbox נשאר אופציונלי וכבוי עד אחרי Pilot.

13.2.9 N10–N15: GitHub governance, Domains, Legal, budget caps, isolated PostgreSQL ו־Pilot charter.

13.2.10 כל Secret נשמר ב־Provider Vault או Secret manager; במסמכים נשמרים רק שם לוגי, Owner, Scope, expiry ומצב.

## 13.3 מה צריך מ־Tal והצוות

13.3.1 Memberships, שמות Domains, ישות משפטית, תקציבים ו־Pilot charter; לא Credentials בצ׳אט.

## 13.4 תנאי סיום

13.4.1 כל N01–N15 במצב `READY-WITH-EVIDENCE` או `NOT-APPLICABLE-WITH-AUTHORITY`; Staging מבודד מ־Production.

# 14. שלב 13 — ליבת הפלטפורמה

## 14.1 מה השלב אומר

14.1.1 מוודאים שהבסיס שעליו כל המסכים נשענים בטוח: התחברות, הפרדת עסקים, מסד נתונים, API ותורים.

## 14.2 משימות

14.2.1 לאמת React/Next.js ב־Vercel ו־API/Workers ב־Railway על אותו Release SHA.

14.2.2 להשלים Clerk authentication, Organization selection, MFA Admin ו־Tenant isolation fail-closed.

14.2.3 להשלים PostgreSQL migrations, constraints, idempotency, transaction boundaries ו־connection limits.

14.2.4 להשלים Redis/BullMQ queues, DLQ, retry, delay, backpressure, leases ו־recovery.

14.2.5 לחייב Authorization בכל Server action ו־API operation ולחסום Client import של Server/DB code.

14.2.6 להוסיף Audit log ללא Secrets ו־trace correlation שלא מזהה לקוח בפומבי.

## 14.3 תנאי סיום

14.3.1 בדיקות Cross-tenant שליליות עוברות, Migrations נבדקו ב־PostgreSQL מבודד וכל Runtime surface קשור ל־Release evidence.

# 15. שלב 14 — WhatsApp הרשמי ו־Rate limiting

## 15.1 מה השלב אומר

15.1.1 מחברים את Connect רק ל־WhatsApp הרשמי ומגבילים כל שליחה לפי החשבון, האיכות, הלקוח, הנמען, העלות והחוק.

## 15.2 משימות

15.2.1 להשלים Webhook verification, signature, replay defense, event deduplication ו־raw-redacted storage.

15.2.2 להשלים Template sync, status lifecycle, language, category, quality, pacing ו־rejection handling.

15.2.3 לבנות LimitSnapshot חי עם Provider, Portfolio, Phone, Pair, Quality, Template, Consent, Window, Geo, Cost, Connect, Queue ו־DB caps.

15.2.4 ברירת מחדל=`cap zero` כאשר Snapshot חסר, ישן, סותר או אינו קשור לחשבון.

15.2.5 לטפל במפורש בקודי Meta, Retry-After, Opt-out, Service window, quality downgrade ו־marketing suppression.

15.2.6 להוכיח Reservation אטומי, cancellation, concurrency ו־no double-send תחת crash ו־response loss.

15.2.7 Tal מאשר בעתיד רק את המספרים החיים וה־Connect cap המדויקים; אין מספר מומצא.

## 15.3 תנאי סיום

15.3.1 שליחה ל־approved test recipients עוברת; כל תרחיש stale/over-limit/opt-out/invalid-template נחסם ללא Attempt אסור.

# 16. שלב 15 — Inbox, אנשי קשר, Templates, Campaigns ו־Bot flows

## 16.1 מה השלב אומר

16.1.1 משלימים את העבודה היומיומית של העסק: לראות שיחות, לנהל אנשי קשר, להכין הודעות ולהפעיל תהליכים מבוקרים.

## 16.2 משימות

16.2.1 Inbox: pagination, unread state, assignment, notes, search, delivery status ו־real-time reconciliation.

16.2.2 Contacts: import validation, consent provenance, deduplication, tags, suppression ו־deletion lifecycle.

16.2.3 Templates: draft, preview, submit, reconcile, retry, outbox ו־provider status.

16.2.4 Campaigns: audience snapshot, approval, schedule, pause, cancel, quota, rate limit ו־delivery telemetry.

16.2.5 Bot flows: versioning, draft, approval, activation, rollback ו־human handoff.

16.2.6 לחסום כל כפתור ללא פעולה ולהשלים Dialog keyboard, focus trap, Escape ו־focus return.

## 16.3 תנאי סיום

16.3.1 כל Workflow עובר Positive, Negative, concurrency ו־recovery tests על Staging; אין פעולה שקטה או UI שמבטיח דבר שאינו נשמר.

# 17. שלב 16 — AI, ידע וסריקת קבצים

## 17.1 מה השלב אומר

17.1.1 מאפשרים ל־AI להציע תשובות מתוך ידע מאושר, אך אדם נשאר בעל ההחלטה לפני שליחה.

## 17.2 משימות

17.2.1 להפעיל OpenAI Responses רק דרך Adapter עם model allowlist, timeout, budget ו־redaction.

17.2.2 ליישם Prompt/version registry, Eval suite, citation provenance ו־unsafe-content policy.

17.2.3 Knowledge upload מוגבל ל־10 MiB ול־PDF/TXT/DOCX בהתאם להחלטה.

17.2.4 להעלות קובץ ל־Quarantine, להצפין ב־KMS, לסרוק, לחסום עד PASS ולמחוק לפי Retention.

17.2.5 שחזור Scan תקוע לאחר 15 דקות ועד שלושה ניסיונות; לאחר מכן DLQ והתראה אנושית.

17.2.6 למנוע Prompt injection, cross-tenant retrieval, untrusted tool call ו־AI autonomous dispatch.

## 17.3 תנאי סיום

17.3.1 AI Evals עוברים, כל תשובה קשורה למקור ול־Tenant, וקיימת הוכחה שאין שליחה ללא Human approval.

# 18. שלב 17 — Billing, Packages ו־Quotas

## 18.1 מה השלב אומר

18.1.1 מגדירים כיצד לקוחות יחויבו ומה מכסת השימוש שלהם, אך לא גובים אוטומטית ב־Pilot.

## 18.2 משימות

18.2.1 להשאיר Stripe ו־Paddle Adapters Dormant ונפרדים מליבת המוצר.

18.2.2 לאחר Pilot לבצע Eligibility, Legal, Tax, pricing, refund, invoice, DPA ו־cost comparison.

18.2.3 לבחור ספק פעיל בהחלטה חדשה; לא להפעיל את שניהם יחד ללא Contract מפורש.

18.2.4 ליישם idempotent Checkout, Webhook verification, entitlements, cancellation, refund ו־reconciliation.

18.2.5 לקשור Quotas ל־Package, Tenant, WhatsApp cap, AI cost ו־kill switch.

## 18.3 מה צריך מ־Tal

18.3.1 החלטת ספק רק אחרי Pilot ו־Finance/Legal Evidence; אין להעביר פרטי כרטיס למסמך.

## 18.4 תנאי סיום

18.4.1 Sandbox E2E, double-webhook, retry ו־refund tests עוברים; Production Billing דורש Gate נפרד.

# 19. שלב 18 — Security, Monitoring, Backup ו־Data lifecycle

## 19.1 מה השלב אומר

19.1.1 מוודאים שאפשר לזהות תקלה, להגיב, לשחזר ולמחוק מידע באופן בטוח ומוכח.

## 19.2 משימות

19.2.1 להגדיר SLO, metrics, traces, logs, redaction, business-hours on-call ו־escalation.

19.2.2 לבצע Alert drill, incident timeline, runbooks, status communication ו־postmortem template.

19.2.3 Backup יומי, 90 יום, PITR ו־monthly restore drill לפי החלטה, קשורים ל־backupId ו־digests.

19.2.4 לאמת R2/Object storage consistency אם נעשה בו שימוש ולבדוק חלון שמירה בפועל.

19.2.5 Retention Plan v2 עם ID, digest, expiry, policy version, cutoff ו־approved identities.

19.2.6 Legal Hold, active-record block ו־atomic safe delete; Post-delete query הוא Audit בלבד.

19.2.7 להגדיר Incident response ל־Secret leak במאגר PUBLIC, כולל revoke, rotate, invalidate ו־history assessment.

## 19.3 תנאי סיום

19.3.1 Monitoring drill, Backup/Restore drill ו־safe-delete drill עוברים עם Evidence; Legal מאשר את המדיניות החלה.

# 20. שלב 19 — QA, Accessibility, Performance ו־Release quality

## 20.1 מה השלב אומר

20.1.1 בודקים שהמוצר עובד נכון, מהר ונגיש גם כאשר המשתמש טועה או ספק חיצוני נכשל.

## 20.2 משימות

20.2.1 להריץ Build, TypeScript, ESLint, Unit, Integration, Contract ו־E2E יחד על Commit מדויק.

20.2.2 להוסיף Negative tests לכל Permission, Tenant boundary, expired plan, forbidden trigger, malicious Origin ו־unbound Restore.

20.2.3 לבדוק Keyboard, Screen reader, Contrast, RTL, Mobile, Focus, Error messages ו־loading states.

20.2.4 למדוד Web Vitals, API latency, Queue lag, database load, large imports ו־campaign burst.

20.2.5 לבצע Dependency audit, SAST, Secret scan, license scan, SBOM ו־artifact provenance.

20.2.6 להסיר flaky tests, warnings ו־temporary bypasses או לרשום Debt עם Owner ו־expiry.

## 20.3 תנאי סיום

20.3.1 כל שערי CI עוברים יחד, אין P0/P1 פתוח, וה־Release candidate ניתן לשחזור מאותו Commit.

# 21. שלב 20 — Staging ו־Pilot סגור

## 21.1 מה השלב אומר

21.1.1 מפעילים את המערכת עם עסק אחד ומשתתפים מאושרים, תחת יכולת עצירה מלאה וללא הרחבה שקטה.

## 21.2 משימות

21.2.1 לאשר Pilot charter: Tenant, משתתפים, תאריכים, נתונים, מטרות, Stop authority וקריטריוני יציאה.

21.2.2 לבצע Deployment provenance ל־Vercel/Railway ולהוכיח Release SHA בכל שירות.

21.2.3 להריץ Clerk invitation, Meta webhook, Template, test delivery, Inbox, Campaign, Human-approved AI ו־Observability E2E.

21.2.4 לבצע Chaos drills מבוקרים: Redis unavailable, Worker crash, DB conflict, provider 429, duplicate Webhook ו־lost response.

21.2.5 למדוד SLO, user feedback, delivery quality, opt-out, cost ו־support workload.

21.2.6 לעצור מיד כאשר Stop criterion מתקיים; אין מעבר אוטומטי ללקוח נוסף.

## 21.3 תנאי סיום

21.3.1 Pilot exit review מאשר או דוחה כל קריטריון בנפרד, וכל Incident נסגר לפני הרחבה.

# 22. שלב 21 — Production launch

## 22.1 מה השלב אומר

22.1.1 מעלים את המערכת האמיתית בהדרגה, עם אפשרות Rollback ועם אנשים שיודעים לעצור אותה.

## 22.2 משימות

22.2.1 להקפיא Release candidate, SBOM, migrations, configuration manifest ו־Rollback package.

22.2.2 לבצע Staged canary: קבוצה קטנה, מדדים, pause window והרחבה רק לאחר PASS.

22.2.3 לבצע preflight ל־Domains, TLS, Clerk, Meta, DB, Redis, AWS, OpenAI, Monitoring ו־budgets.

22.2.4 להפעיל Kill switches ל־Campaign, Bot, AI, Upload ו־Billing בנפרד.

22.2.5 להחזיק On-call, incident channel, customer communication ו־Rollback owner בזמן ההשקה.

22.2.6 לבצע Post-launch readback ולוודא שה־Production state תואם את ה־approved release.

## 22.3 מה צריך מ־Tal

22.3.1 אישור Go-live מפורש ל־Release SHA, Scope, Tenant set ו־זמן מדויק לאחר שכל ה־Gates עברו.

## 22.4 תנאי סיום

22.4.1 Production stable במשך חלון שנקבע ב־Task Registry, אין Regression חוסם ו־Rollback נבדק וזמין.

# 23. שלב 22 — שיפור לאחר ההשקה לגרסה הטובה בתחום

## 23.1 מה השלב אומר

23.1.1 משפרים את המוצר לפי שימוש אמיתי ולא לפי רשימת תכונות של מתחרים בלבד.

## 23.2 משימות

23.2.1 אמינות Inbox ו־WhatsApp, Consent ו־Opt-out נשארים עדיפות ראשונה לפי O12.

23.2.2 לבנות Benchmark תקופתי מול Twilio, Intercom, Respond.io, WATI, SleekFlow ופלטפורמות רלוונטיות על מקורות עדכניים.

23.2.3 למדוד Activation, time-to-first-value, response time, delivery quality, operator productivity, retention ו־support burden.

23.2.4 לתעדף Reporting, Automation, CRM integrations, Enterprise, Public API ו־Mobile רק לפי Evidence ו־ICP.

23.2.5 לבצע Security review, Restore drill, Legal review, Dependency refresh ו־cost review במחזור קבוע.

23.2.6 להחזיק Roadmap עם Outcome, Owner, metric, cost cap ו־kill criteria לכל Initiative.

## 23.3 תנאי סיום

23.3.1 אין נקודת “מוצר מושלם” קבועה; שלב זה הופך למחזור שיפור מתמשך עם יעדים מדידים וביקורות תקופתיות.

# 24. שלב 23 — אישור סיום התוכנית המלאה

## 24.1 מה השלב אומר

24.1.1 שלב זה קובע האם כל התוכנית שתוחמה אכן הושלמה; הוא אינו מבטל תחזוקה שוטפת.

## 24.2 משימות

24.2.1 להקפיא Final Task Registry ולוודא שאין Task ללא disposition.

24.2.2 להפיק Evidence index לכל Requirement, Decision, Finding, Gate, Test, Deployment ו־Operational drill.

24.2.3 לבצע שלוש ביקורות סופיות ולסגור כל Finding ללא Merge או suppression לא מורשים.

24.2.4 לחשב Completion רק מהמכנה המאושר ולפרסם numerator, denominator, weights ו־unknowns.

24.2.5 לקבל אישורי Product, Security, Legal, Operations ו־Tal לפי תחומי סמכותם.

24.2.6 לפרסם Final accepted root ו־current pointer אטומיים עם Rollback ו־supersession rules.

## 24.3 תנאי סיום

24.3.1 כל המשימות שבתיחום Accepted או קיבלו disposition מאושר; כל Gates עברו; אין P0/P1 פתוח; וה־Final root אושר באופן עצמאי.

# 25. סדר הביצוע המקוצר

25.1 שלבים `1–10`=`פרסום בטוח והשלמת המחקר/התכנון`.

25.2 שלב `11`=`יצירת מכנה העבודה, האחוז והזמן`.

25.3 שלב `12`=`חיבורים וסביבות`.

25.4 שלבים `13–18`=`פיתוח והקשחת המוצר`.

25.5 שלבים `19–21`=`QA, Pilot ו־Production`.

25.6 שלבים `22–23`=`Best-in-class ואישור סיום`.

25.7 תלות עליונה=`1 → 2 → (3,4,8,9 במקביל כאשר Authority מאפשר) → 5 → 6 → 7 → 10 → 11 → 12 → 13–18 → 19 → 20 → 21 → 22 → 23`.

25.8 עבודה מקבילית אינה רשאית לעקוף Authority, Gate, Legal, Secret handling או Tenant isolation.

# 26. מידע חיצוני שעדיין חסר

26.1 שעות העבודה השבועיות של Tal, זמינות לטיפול בתקלות ודרך ההודעה המועדפת אליו; מודל האחריות עצמו כבר נסגר.

26.2 Clerk, Railway, Vercel, Meta, AWS, Better Stack ו־OpenAI Memberships.

26.3 Domains ו־Origins.

26.4 ישות משפטית, Counsel, Privacy/DPA ו־Direct-marketing review.

26.5 תקציב ותקרה לכל ספק.

26.6 PostgreSQL מבודד ו־Pilot charter.

26.7 מספרי WhatsApp חיים ו־account entitlements.

26.8 אין לשלוח Secret, Token, Password, Private key, Customer data או פרטי תשלום במסמך, Chat, Issue או מאגר PUBLIC.
