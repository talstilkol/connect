# מטריצת עקיבות לאפיון המוצר

תאריך אימות: 2026-08-16

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
| SPEC-05 | רשימת מנויים וסינון Admin | partial | System Admin tenant directory | סינון מוצר מלא ו־Browser acceptance |
| SPEC-06 | יצירת מנוי ידני | local-complete | פעולת Admin עם RBAC, Version ו־Audit | בדיקת Staging עם זהות Admin אמיתית |
| SPEC-07 | הארכה וביטול עם היסטוריה | local-complete | Subscription transitions ואירועים Immutable | בדיקת Staging |
| SPEC-08 | עריכת לקוח, חבילה, מגבלות ופרטי קשר | partial | שינוי Status ותקופה קיימים | מודל Package/Quota ועריכת פרטי קשר |
| SPEC-09 | Facebook Embedded Signup | external-blocked | UI, SDK adapter, Authorization exchange ו־Asset verification | Meta App, WABA ו־Credentials מורשים |
| SPEC-10 | יצירת Templates ושליחה לאישור | external-blocked | Draft, Header/Body/Buttons/Variables ומחזור Submission | בדיקת Graph API חיה ואישור Template אמיתי |
| SPEC-11 | נמענים במאגר פנימי | local-complete | Contacts, Consent, Lists ו־Tags | בדיקת Staging |
| SPEC-12 | ייבוא נמענים מ־Excel | planned | CSV מאומת עם Mapping ו־Import jobs | Parser ל־XLSX, גבולות קובץ ובדיקות אבטחה |
| SPEC-13 | Segments לפי Tags | local-complete | Tags, Lists ו־Campaign audience snapshot | מדדי ביצועים על קהל גדול |
| SPEC-14 | שיגור Template המוני | partial | Campaign snapshot, Queue, Scheduler, DLQ, Meta sender ו־Provider cooldown אטומי | Live capacity, Retry evidence, Kill switch, חיבור Worker וניסוי WABA |
| SPEC-15 | דוח נשלח/נמסר/נקרא/נכשל | partial | Recipient statuses, Message statuses ו־Operational reports | Campaign report חי מקצה לקצה |
| SPEC-16 | תזמון חד־פעמי | local-complete | Scheduled campaign ו־Cron promotion | פריסה ובדיקת Cron אמיתי |
| SPEC-17 | Recurring Campaigns | planned | אין recurrence model | החלטת Policy, Schema, next-run claim וביטול סדרה |
| SPEC-18 | Flow Builder ויזואלי Drag-and-drop | partial | Flow domain, Versioning, Runtime ו־MVP composer | Canvas אינטראקטיבי, Drag-and-drop ועריכת Graph מלאה |
| SPEC-19 | תנאים, Text, Buttons ו־Human handoff | partial | Domain ו־Runtime תומכים בבלוקים; Composer מצומצם | עריכה חזותית מלאה ובדיקות E2E |
| SPEC-20 | System Prompt | local-complete | AI Agent versioned definition | ספק AI חי ו־Eval |
| SPEC-21 | Knowledge Base ו־RAG | external-blocked | Upload contract, R2 port, Scanner port, Passages ו־Retrieval | R2, Scanner, Extraction ו־Vector/Retrieval חיים |
| SPEC-22 | Fallback בין Bot, ‏AI ואדם | partial | Inbound routing, Handoff ו־Fail-closed AI policy | Provider E2E ו־Product policy מאושרת |
| SPEC-23 | WhatsApp רשמי: שליחה וקבלה | partial | Webhook ingress, הודעות נכנסות, Status events, Queues ו־Outbound adapter מקומי | חיבור Runtime, Credentials וניסוי WABA |
| SPEC-24 | הצפנת Tokens ו־PCI-DSS | partial | Credential envelope ו־Secret hygiene | Billing hosted checkout, Key rotation וראיות ספק |
| SPEC-25 | Queue scalability ו־99.5% availability | partial | Queues, Backpressure, SLO domain ו־Alert ports | Load test, Metrics ו־Alert provider חיים |
| SPEC-26 | Data isolation, הרשאות ו־Audit | local-complete | Tenant guards, RBAC, Audit ו־Source boundaries | Cloud evidence ו־adversarial staging test |
| SPEC-27 | עברית, אנגלית וערבית | partial | Language domain ו־RTL foundation | תרגומים מלאים ובדיקות Browser לכל שפה |

## 4. עדכון תוכנית הביצוע

4.1 מסלול P0 — פתיחת יכולת שליחה בטוחה:

4.1.1 הושלם מקומית: Rate Limiting ו־Provider cooldown של Campaign
Queue. נותר אימות המדיניות מול חשבון Meta חי.

4.1.2 לקשור Reservation לתוצאת Delivery ול־Status webhook.

4.1.3 לחבר Meta sender רק לאחר WABA מורשה ו־Live capacity state.

4.1.4 להריץ Sandbox, ‏Load test ו־Kill-switch rehearsal.

4.2 מסלול P1 — פערים פונקציונליים מפורשים מה־PDF:

4.2.1 להוסיף Excel/XLSX import מעל אותו Pipeline מאומת של CSV.

4.2.2 להוסיף Recurring Campaign domain רק לאחר החלטת Product על
תדירות, אזור זמן, End condition, שינוי Template וביטול סדרה.

4.2.3 להרחיב את Bot composer ל־Graph editor נגיש. Drag-and-drop
אינו יכול להיות דרך הקלט היחידה; נדרש גם מסלול Keyboard מלא.

4.2.4 להשלים עריכת Package, ‏Quota ופרטי קשר ב־Admin.

4.3 מסלול P2 — אינטגרציות חיות:

4.3.1 לבחור ולחבר Billing provider עם Hosted Checkout כדי לצמצם
PCI scope.

4.3.2 לבחור ולחבר AI provider, ‏Scanner, ‏Extraction ו־Retrieval.

4.3.3 להשלים Monitoring, ‏Alerting, ‏Backup/Restore ו־Retention
evidence בסביבות אמיתיות.

4.4 מסלול P3 — השלמת מוצר:

4.4.1 להשלים תרגומים עברית/אנגלית/ערבית.

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
