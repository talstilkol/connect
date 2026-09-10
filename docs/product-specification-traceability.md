# מטריצת עקיבות לאפיון המוצר

תאריך אימות: 2026-08-17

עדכון סקירת תכנון: 2026-09-09. טבלת סעיף 3 היא הבסיס ההיסטורי;
התחולה וסדר הביצוע המעודכנים לכל 27 הדרישות נמצאים בסעיף 6 וב־
[Master Plan הפעיל](planning/launch-master-plan-2026-09-09.md).
המונח local-complete בטבלה ההיסטורית אינו מוכנות לענן או להשקה.

## 1. מקור האפיון

1.1 שם הקובץ שנבדק:
`אפיון מערכת - דיוור WhatsApp ובוט AI.docx.pdf`.

1.2 הקובץ כולל ארבעה עמודי A4 ונבדק גם בחילוץ טקסט וגם ברינדור
חזותי של כל העמודים.

1.3 SHA-256 של הקובץ שנבדק:
`48e87c0a5ca6a40cbd3f320f08dfd3ca946c31a6f3409aafbfff6b9642302f6a`.

1.4 האפיון הוא High-Level Specification. הוא מגדיר יכולות מוצר
וגבולות, אך מצהיר במפורש שאינו אפיון UI/UX, ‏Wireframes או Technical
Design מלא.

## 2. משמעות הסטטוסים

2.1 `local-complete` — היכולת קיימת בקוד המקומי ונבדקה, אך אינה
מוכיחה ספק או Production חי.

2.2 `partial` — קיים חלק מהמסלול, אך חסרה יכולת מפורשת מהאפיון.

2.3 `external-blocked` — חוזה מקומי קיים, אך השלמה דורשת החלטה,
חשבון, Credentials או ספק חיצוני.

2.4 `planned` — הדרישה מאושרת כמטרת מוצר, אך טרם מומשה.

## 3. מטריצת דרישה מול המערכת

| מזהה | דרישת PDF | סטטוס | ראיה קיימת | פער לסגירה |
| --- | --- | --- | --- | --- |
| SPEC-01 | SaaS ‏Multi-Tenant | local-complete | Tenant, Membership, Selection, RBAC ובידוד D1 | הוכחת בידוד בסביבות ענן |
| SPEC-02 | Landing Page וחבילות | partial | דף ציבורי ו־Pricing section | חבילות, מחירים ומגבלות מאושרים |
| SPEC-03 | Checkout וחיוב חודשי מתחדש | external-blocked | Billing domain, Webhook contracts ו־Fail-closed adapter | בחירת ספק, Checkout, אמצעי תשלום וחשבוניות |
| SPEC-04 | Failed Payment, חיוב חוזר והשעיה | partial | מצבי Subscription ו־Tenant תומכים בכשל/השעיה | Dunning policy ואירועי ספק חיים |
| SPEC-05 | רשימת מנויים וסינון Admin | local-complete | System Admin tenant directory עם חיפוש שרתי מלא לפי שם/מזהה, סינון מצב וסינון קיום מנוי מעל Keyset pagination | בדיקת Staging עם זהות Admin ו־D1 אמיתיים |
| SPEC-06 | יצירת מנוי ידני | local-complete | פעולת Admin עם RBAC, Version ו־Audit | בדיקת Staging עם זהות Admin אמיתית |
| SPEC-07 | הארכה וביטול עם היסטוריה | local-complete | Subscription transitions ואירועים Immutable | בדיקת Staging |
| SPEC-08 | עריכת לקוח, חבילה, מגבלות ופרטי קשר | partial | שינוי Status ותקופה; עריכת Business Profile קיים עם Expected Version ו־Audit מבוסס Digests | החלטה ומימוש של Package/Quota ושדות קשר ייעודיים |
| SPEC-09 | Facebook Embedded Signup | external-blocked | UI, SDK adapter, Authorization exchange ו־Asset verification | Meta App, WABA ו־Credentials מורשים |
| SPEC-10 | יצירת Templates ושליחה לאישור | external-blocked | Draft, Header/Body/Buttons/Variables ומחזור Submission | בדיקת Graph API חיה ואישור Template אמיתי |
| SPEC-11 | נמענים במאגר פנימי | local-complete | Contacts, Consent, Lists ו־Tags | בדיקת Staging |
| SPEC-12 | ייבוא נמענים מ־Excel | local-complete | CSV/XLSX מאומתים מעל Mapping ו־Import jobs משותפים; Parser נעול, גבולות משאבים, בדיקות קלט עוין ו־Browser acceptance מקומי חיובי/שלילי | בדיקת Staging על קובץ מורשה אמיתי, Tenant מורשה ו־D1 מבודד |
| SPEC-13 | Segments לפי Tags | local-complete | Tags, Lists ו־Campaign audience snapshot | מדדי ביצועים על קהל גדול |
| SPEC-14 | שיגור Template המוני | partial | Campaign snapshot, Queue, Scheduler, DLQ, Meta sender, Provider cooldown אטומי, מקור Policy מתכלה ומסלול System Admin מאובטח עם Kill switch עמיד | Live capacity evidence, Retry evidence, חיבור Sender ל־Worker וניסוי WABA |
| SPEC-15 | דוח נשלח/נמסר/נקרא/נכשל | partial | Recipient statuses, Message statuses ו־Operational reports | Campaign report חי מקצה לקצה |
| SPEC-16 | תזמון חד־פעמי | local-complete | Scheduled campaign ו־Cron promotion | פריסה ובדיקת Cron אמיתי |
| SPEC-17 | Recurring Campaigns | planned | אין recurrence model | החלטת Policy, Schema, next-run claim וביטול סדרה |
| SPEC-18 | Flow Builder ויזואלי Drag-and-drop | local-complete | Flow domain, Versioning, Runtime, עורך Graph כללי ליצירה, חיבור, עריכה, מחיקה וסידור של כל סוגי ה־Nodes; Drag-and-drop כולל חלופת מקלדת, Canvas נגיש עם מפת Connections חזותית, Compiler/Reader שאינם חושפים זהויות מתמידות ו־Browser E2E מקומי ב־Chromium | בדיקת שמירה ופרסום ב־Staging עם Clerk ו־D1 מורשים |
| SPEC-19 | תנאים, Text, Buttons ו־Human handoff | local-complete | העורך הכללי תומך ברצפים חופשיים ומרובי Text, ‏Buttons, ‏Conditions, ‏Handoff ו־End; Cycles ו־Nodes מנותקים חוסמים שמירה, כל המפתחות נגזרים בשרת וכל סוגי ה־Nodes והחיבורים אומתו ב־Browser E2E מקומי | בדיקת End-to-End ב־Staging ומול WABA מורשה |
| SPEC-20 | System Prompt | local-complete | AI Agent versioned definition | ספק AI חי ו־Eval |
| SPEC-21 | Knowledge Base ו־RAG | external-blocked | Upload contract, R2 port, Scanner port, Passages ו־Retrieval | R2, Scanner, Extraction ו־Vector/Retrieval חיים |
| SPEC-22 | Fallback בין Bot, ‏AI ואדם | partial | Inbound routing, Handoff ו־Fail-closed AI policy | Provider E2E ו־Product policy מאושרת |
| SPEC-23 | WhatsApp רשמי: שליחה וקבלה | partial | Webhook ingress, הודעות נכנסות, Status events, Queues, Campaign sender ו־Bot reply adapter מקומיים עם Vault, Scope, Ambiguity safety, שני Gates לחלון השירות, קישור Button context ל־Delivery מדויק, Reservation class נפרד ל־Service reply, ‏Durable deferral עם Due scan ו־fenced Retry claim, ‏Admission ו־Due worker מחוברים למסלול Railway/BullMQ, ‏Telemetry מוגבל, חילוץ Status error code ללא טקסט ספק, Cooldown אטומי לדחיות Graph מאומתות, חסימת Publication מעל 3 כפתורים/20 תווים ללא המרה שקטה, קישור Bot provider status אל ה־Reservation המדויק עם Settlement טרמינלי וחוזה Evidence קצר־חיים הקשור ל־Release/Commit/Artifact | Credentials, ערכי Capacity/Retry חיים, Runner מאושר וניסוי WABA/Staging |
| SPEC-24 | הצפנת Tokens ו־PCI-DSS | partial | Credential envelope ו־Secret hygiene | Billing hosted checkout, Key rotation וראיות ספק |
| SPEC-25 | Queue scalability ו־99.5% availability | partial | Queues, Backpressure, SLO domain ו־Alert ports | Load test, Metrics ו־Alert provider חיים |
| SPEC-26 | Data isolation, הרשאות ו־Audit | local-complete | Tenant guards, RBAC, Audit ו־Source boundaries | Cloud evidence ו־adversarial staging test |
| SPEC-27 | עברית, אנגלית וערבית | local-complete | Language domain ו־RTL foundation; דף הנחיתה, מעטפת Login/Register, מסך קבלת ההזמנה, כל Surface ה־Workspace וכל מסכי System Admin מתורגמים בשלוש השפות. המימוש כולל Registry ניווט ושלבי הקמה, Locale מתמשך, Tenant switcher, מצבי Meta, Form labels, מצבי SDK, קודי כשל, פריסת LTR/RTL, עדכון `html lang/dir`, שימור שפה בקישורי Admin, מובייל ו־Browser acceptance מקומי | Browser acceptance של Widget Clerk, תוצאות הזמנה חיות ופעולות Admin מורשות ב־Staging |

## 4. עדכון תוכנית הביצוע

4.1 מסלול P0 — פתיחת יכולת שליחה בטוחה:

4.1.1 הושלם מקומית: Rate Limiting, ‏Provider cooldown, מקור Policy
מתכלה ומסלול System Admin מורשה עם Kill switch עמיד של Campaign
Queue. נותר אימות המדיניות מול חשבון Meta חי.

4.1.2 הושלם מקומית: Reservation קשורה לתוצאת Delivery ול־Status
webhook באמצעות ראיות D1 אטומיות ו־Idempotent.

4.1.3 לחבר Meta sender רק לאחר WABA מורשה ו־Live capacity state.

4.1.4 להריץ Sandbox, ‏Load test ו־Kill-switch rehearsal.

4.2 מסלול P1 — פערים פונקציונליים מפורשים מה־PDF:

4.2.1 הושלם מקומית: Excel/XLSX import משתמש באותו Pipeline מאומת של
CSV. קבצי XLS ישנים, נוסחאות, Macros, קישורים חיצוניים, גיליונות
נסתרים או מרובים וארכיונים החורגים מגבולות המשאבים נחסמים לפני
ה־Mapping. Browser acceptance מקומי חיובי/שלילי הושלם; נותר Staging
acceptance עם קובץ מורשה אמיתי, Tenant מורשה ו־D1 מבודד.

4.2.2 להוסיף Recurring Campaign domain רק לאחר החלטת Product על
תדירות, אזור זמן, End condition, שינוי Template וביטול סדרה.

4.2.3 הושלמו חמישה Slices של Bot Graph editor נגיש: רצף Text, שאלת
Buttons מסיימת, שתי שאלות Buttons עוקבות שבהן כל בחירה ראשונה פותחת
שאלה שנייה ייעודית וכל בחירה שנייה שולחת Text ומתכנסת ל־End משותף,
פיצול Condition יחיד לפי טקסט נכנס או מצב שיחה,
מסלול Handoff לפי Keyword שמעביר ללא Reply ורק בעת התאמה, ו־Handoff
מתוך כל אחד מענפי ה־Condition. ענף פנימי שמעביר אינו יכול לשלוח
Intro באותו Turn; ה־UI מסיר אותו והשרת דוחה ניסיון לעקוף את הגבול.
אפשר להגדיר תשובת Text נפרדת לכל ענף שאינו מעביר, והמנוע גוזר בשרת
את כל מפתחות ה־Block וה־Option. המשך בחירת Button נשען רק על ראיית
Accepted תחומה לכל שאלת Buttons. ה־Slices הייעודיים סיפקו את בסיס
המקלדת וה־Preview לעורך ה־Graph הכללי המתועד בסעיף הבא.

4.2.3.1 הושלם עורך ה־Graph הכללי מעל תשתית ה־Graph Draft: הדפדפן שולח
רק מפתחות Draft
זמניים לצורך חיבור בין Nodes. השרת קובע סדר קנוני לפי הטופולוגיה,
גוזר את כל מפתחות ה־Block וה־Option, ומאמת שאין Cycle, ‏Node מנותק,
Reference חסר או זהות מתמידה שסופקה מהדפדפן. Reader הופך Graph קיים
בחזרה ל־Draft דטרמיניסטי ללא חשיפת המפתחות השמורים. ב־UI ניתן ליצור,
לערוך, למחוק, לסדר ולחבר את כל סוגי ה־Nodes באמצעות Selects נגישים,
כפתורי מקלדת או Drag-and-drop לסדר הכרטיסים. ה־Preview מתאר כל Connection
בעץ סמנטי ומציג עותק חזותי ומפת Connections עם חצים, המוסתרים מקוראי
מסך כדי למנוע הקראה כפולה. Browser E2E מקומי מרכיב את רכיבי ה־Production
ב־Chromium ובודק את כל סוגי ה־Nodes, מקלדת, Drag-and-drop, חיבורים,
מחיקה, Focus וה־Preview. נותרה בדיקת שמירה ופרסום ב־Staging מורשה.

4.2.4 הושלמה עריכת שדות Business Profile הקיימים ב־Admin. יש
להשלים Package, ‏Quota ושדות קשר רק לאחר אישור המודל המפורט בסעיף
18 של `docs/external-decisions-recommendations.md`.

4.2.5 הושלם מקומית חיפוש וסינון מלא ב־System Admin. החיפוש מתבצע
בשרת על כל ה־Directory ולא רק על 50 הרשומות שכבר נטענו, תומך בשם או
מזהה, במצב Tenant ובקיום מנוי, ושומר את אותם פילטרים בכל עמוד Keyset.
ה־Repository משתמש ב־`INSTR` עם Bindings ולא ב־`LIKE`, ולכן `%` ו־`_`
אינם Wildcards. נותרה בדיקת Staging עם Clerk System Admin ו־D1
אמיתיים.

4.3 מסלול P2 — אינטגרציות חיות:

4.3.1 לבחור ולחבר Billing provider עם Hosted Checkout כדי לצמצם
PCI scope.

4.3.2 לבחור ולחבר AI provider, ‏Scanner, ‏Extraction ו־Retrieval.

4.3.3 להשלים Monitoring, ‏Alerting, ‏Backup/Restore ו־Retention
evidence בסביבות אמיתיות.

4.4 מסלול P3 — השלמת מוצר:

4.4.1 Slices דף הנחיתה, מעטפת Login/Register, מסך קבלת ההזמנה, כל
תוכן ה־Feature pages ב־Workspace וכל מסכי System Admin בעברית,
אנגלית וערבית הושלמו מקומית. את Widget ה־Auth, תוצאות ההזמנה החיות
ופעולות Admin ב־Ready-state יש לאמת בנפרד ב־Staging מורשה.

4.4.2 לבצע UX/UI acceptance בכל מסכי האפיון.

4.4.3 לבצע Pilot, לאסוף מדדים ולסגור GA checklist.

## 5. תנאי קבלה מול האפיון

5.1 אין לסמן דרישה `complete` על סמך UI בלבד כאשר Provider נשאר
Fail-closed.

5.2 אין לסמן Campaign delivery כמושלם לפני Send, ‏Delivered, ‏Read
ו־Failed אמיתיים דרך Meta Sandbox/WABA.

5.3 אין לסמן Billing כמושלם לפני Checkout, ‏Webhook verification,
Idempotency, ‏Dunning ו־Suspension שנבדקו מול הספק שנבחר.

5.4 אין לסמן Flow Builder כמושלם לפני שכל הבלוקים שבאפיון ניתנים
ליצירה, חיבור, עריכה ופרסום גם עם מקלדת.

5.5 כל פער במסמך זה יישאר חלק מה־Master Plan גם אם אינו נכלל
בגבול ה־Pilot הראשון.

## 6. מיפוי כל דרישות האפיון לתוכנית השחרור המעודכנת

6.1 סקירה מ־09.09.2026: נבדקו תחולת כל 27 הדרישות וקישורן לתוכנית
הפעילה. זו סקירת עקיבות, לא בדיקת E2E חדשה של כל אחת מהיכולות.
בחירות ספק, תכולה וסדר הוכרעו במסמך ההחלטות; אין לחזור לשאלון הישן.

| מזהה | יעד בתוכנית הפעילה | הכרעה / תנאי סיום |
|---|---|---|
| SPEC-01 | 3.1–3.4 | PostgreSQL, Clerk ובידוד Tenant מוכח ב־Staging |
| SPEC-02 | 5.5, 11.1 | דף ציבורי וחבילה אחת לפי עלות אמת; אין מחיר דוגמה |
| SPEC-03 | 11.1–11.4 | Paddle אחרי Pilot; החלטת ספק כבר התקבלה |
| SPEC-04 | 11.3 | Dunning, ביטול ו־reconciliation מול אירועים אמיתיים |
| SPEC-05 | 3.3, 7.2 | מעבר מסלול Admin למסד היעד ובדיקת הרשאות חיה |
| SPEC-06 | 3.4, 11.2 | מנוי ידני עם Audit וטרנזקציה; בדיקה ב־PostgreSQL |
| SPEC-07 | 3.4, 11.3 | היסטוריה, Version וביטול שאינם יוצרים הרשאה כפולה |
| SPEC-08 | 5.5, 11.1–11.2 | חבילה ומכסות תחומות; Billing כבוי בתחילת Pilot |
| SPEC-09 | 4.5–4.9 | חלקי בקוד, בנוסף לחסם חשבון: Coexistence, סנכרון ו־Railway |
| SPEC-10 | 4.2, 5.3 | Template אמיתי עובר אישור/דחייה ועדכון מצב |
| SPEC-11 | 5.1 | אנשי קשר, consent ו־suppression ב־PostgreSQL |
| SPEC-12 | 5.1, 7.2 | CSV/XLSX מורשה אמיתי; אין שינוי לייבוא XLS/מאקרו |
| SPEC-13 | 5.1, 7.3 | Segments ו־snapshot; בדיקת ביצועים עם קלט מורשה |
| SPEC-14 | 4.1–4.4, 5.3 | קמפיין חד־פעמי עם קיבולת Meta חיה ו־kill switch |
| SPEC-15 | 5.2, 12.1 | התאמת דוחות ל־provider receipts; אין ספירת echo כשליחה חדשה |
| SPEC-16 | 4.4, 5.3 | Scheduler ב־Worker רציף; אין תלות ב־Cron הישן של Cloudflare |
| SPEC-17 | Backlog מחוץ לגרסה, D24 | Recurring campaigns הוצאו במפורש; לא ממומש ולא Complete |
| SPEC-18 | 5.4, 7.2–7.3 | שימור העורך הקיים; שמירה/פרסום והרשאות ב־Staging |
| SPEC-19 | 5.4, 7.2 | Bot בסיסי ו־handoff נבדקים מקצה לקצה |
| SPEC-20 | 10.2–10.3 | System Prompt וטיוטות; מודל נבחר לפי זמינות ו־Eval |
| SPEC-21 | 10.1–10.4 | יעד S3/GuardDuty, לא R2; סריקה ובידוד לפני קריאה |
| SPEC-22 | 5.4, 10.2–10.4 | AI דורש אישור אדם; היסטוריה ו־echo אינם טריגר לתשובה |
| SPEC-23 | 4.1–4.9, 7.2 | שליחה/קבלה/סנכרון/ניתוק עם מספר מורשה; QR אינו גמור |
| SPEC-24 | 6.1, 11.2–11.4 | Vault/Rotation ו־Hosted Checkout; אין טענת PCI ללא ראיה |
| SPEC-25 | 4.4, 6.2–6.3, 7.3 | בדיקות עומס ושחזור; 99.5% יעד פנימי מוגבל, לא SLA שהוכח |
| SPEC-26 | 3.3–3.4, 6.4, 7.4 | הרשאות ואירועים אטומיים; בדיקות שליליות ב־Staging |
| SPEC-27 | 7.2–7.3 | שלוש שפות קיימות נשמרות; ספקי Login ו־Meta נבדקים בנפרד |

6.2 תוקנו שלוש הנחות מיושנות בתכנון: Billing כבר נבחר, R2 אינו יעד
האחסון, וקמפיינים חוזרים אינם תנאי לסיום הגרסה. ההיסטוריה בסעיפים
3–4 נשמרת לצורך עקיבות בלבד. דרישות אבטחה לא נסגרות בגלל שינוי תחולה.

6.3 [מפת מימוש מ־10.09.2026](planning/workflow-implementation-map-2026-09-10.md)
מחברת 21 תהליכים למסכים, פעולות שרת ומאגרי PostgreSQL. נמצאו חסמי קוד
בהגשה/סנכרון Templates, מוכנות משלוח קמפיינים, Pause/Cancel ומענה ידני
ב־Inbox; הם אינם מסווגים כחסמי ספק בלבד. Knowledge Upload נשאר חסום
בשרת עד מעבר המסלול הישן D1/R2 ליעד Railway/S3.
