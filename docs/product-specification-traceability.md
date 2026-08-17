# מטריצת עקיבות לאפיון המוצר

תאריך אימות: 2026-08-17

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
| SPEC-23 | WhatsApp רשמי: שליחה וקבלה | partial | Webhook ingress, הודעות נכנסות, Status events, Queues ו־Outbound adapter מקומי | חיבור Runtime, Credentials וניסוי WABA |
| SPEC-24 | הצפנת Tokens ו־PCI-DSS | partial | Credential envelope ו־Secret hygiene | Billing hosted checkout, Key rotation וראיות ספק |
| SPEC-25 | Queue scalability ו־99.5% availability | partial | Queues, Backpressure, SLO domain ו־Alert ports | Load test, Metrics ו־Alert provider חיים |
| SPEC-26 | Data isolation, הרשאות ו־Audit | local-complete | Tenant guards, RBAC, Audit ו־Source boundaries | Cloud evidence ו־adversarial staging test |
| SPEC-27 | עברית, אנגלית וערבית | partial | Language domain ו־RTL foundation; דף הנחיתה, מעטפת Login/Register, מסך קבלת ההזמנה, מעטפת ה־Workspace, ה־Dashboard וה־Onboarding מתורגמים בשלוש השפות. ה־Workspace כולל Registry ניווט ושלבי הקמה, Locale מתמשך, Tenant switcher, מצבי Meta, Form labels, פריסת LTR/RTL, מובייל ו־Browser acceptance מקומי | תרגום חלון Embedded Signup, יתר Feature pages ב־Workspace ו־Admin; Browser acceptance לכל שפה ואימות Widget Clerk ותוצאות הזמנה חיות ב־Staging |

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

4.4.1 Slices דף הנחיתה, מעטפת Login/Register, מסך קבלת ההזמנה,
מעטפת ה־Workspace, ה־Dashboard וה־Onboarding בעברית, אנגלית וערבית
הושלמו. להמשיך במסלול מסך־אחר־מסך עבור חלון Embedded Signup,
יתר תוכן ה־Feature pages ב־Workspace ועבור Admin, ולאמת כל Surface
בשלוש השפות. את Widget ה־Auth ותוצאות ההזמנה החיות יש לאמת בנפרד
ב־Staging מורשה.

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
