# קליטת החלטות Connect — 21.08.2026

> מסמך היסטורי: החלטות D02, D03, D05, D14, D29 ו-D30 נחקרו
> והוכרעו לאחר מכן. הרשומה הקובעת היא
> [`researched-decision-approval-2026-08-26.md`](./researched-decision-approval-2026-08-26.md).
> הנתונים והסטטוסים שלהלן נשמרים כפי שהיו ביום הקליטה ואינם משקפים
> מוכנות חיה.

## 1. מטרת המסמך

1.1 זהו תיעוד של התשובות שטל ייצא מתוך
`connect-all-remaining-decisions.html` בתאריך
`2026-08-21T06:44:20.273Z`.

1.2 המסמך שומר את כיוון המוצר והארכיטקטורה. הוא אינו הופך ספק,
Policy או יכולת ל־Production Ready ללא Approver, תצורה חיה ו־Evidence
כפי שנדרש בשער השחרור.

1.3 אין במסמך Secrets, ‏Tokens, ‏Credentials או מידע אישי.

## 2. סיכום

2.1 נבחרה אפשרות מפורשת ב־25 מתוך 30 קבוצות החלטה.

2.2 עבור D03 ניתנה הנחיית ארכיטקטורה ללא בחירת ספק פעיל: להכין
Adapters ל־Paddle ול־Stripe.

2.3 בארבע החלטות לא נבחרה אפשרות ולא ניתנה הנחיה: D05, ‏D14,
D29 ו־D30.

2.4 לכן קיימות 26 תשובות או הנחיות, וחמש החלטות פורמליות עדיין
דורשות הכרעה: ספק Billing פעיל ב־D03 וארבע ההחלטות שלא נענו.

## 3. החלטות Production Registry

| מספר | Registry check | תשובת טל | סטטוס אחרי הקליטה | מה עדיין נדרש |
|---|---|---|---|---|
| D01 | `identity.team-invitation-policy` | 72 שעות; הזמנה מחדש רק אחרי מצב סופי | כיוון נבחר | אישור Product + Security ורשומת Decision חיה |
| D02 | `ai.provider` | OpenAI Responses API עם Eval gate | כיוון נבחר | Model allowlist, תקציב, Timeout, Key ownership, Privacy approval ו־Eval evidence |
| D03 | `billing.provider` | להכין Paddle ו־Stripe | חלקי | לבחור ספק פעיל יחיד, ישות משפטית, מס, החזרים, Dunning ו־Webhook authority |
| D04 | `security.rate-limit-policy` | Limiter רב־שכבתי הנגזר ממצב Meta חי | כיוון נבחר | ערכי WABA/Phone חיים, מכסות Connect, אישורי Product/Security, Load ו־Kill-switch evidence |
| D05 | `security.file-scanner` | לא נענתה | פתוח | לבחור Scanner, משאבים, עדכון חתימות, Timeout ו־Recovery |
| D06 | `security.knowledge-upload-policy` | עד 10 MiB; ‏PDF, TXT ו־DOCX | כיוון נבחר | אישור Security, MIME/signature validation, Scanner ו־Object storage |
| D07 | `operations.knowledge-scan-recovery` | תקועה אחרי 15 דקות; שלושה ניסיונות | כיוון נבחר | Manual-review owner, Alert ו־Staging evidence |
| D08 | `operations.backup-policy` | יומי; 90 יום; PITR; תרגול חודשי | כיוון נבחר | חלון PITR חי, Storage, Region ו־Restore evidence מקושר ל־backupId/digests |
| D09 | `operations.slo-measurement` | Better Stack עם OpenTelemetry | כיוון נבחר | Exporters הושלמו; עדיין נדרשים Source/SQL schema חי, Retention, PII redaction, Cost cap ו־Staging evidence |
| D10 | `operations.slo-alert-policy` | Pilot בשעות פעילות עם הסלמה | חלקי | Incident adapter הושלם; עדיין נדרשים שעות מדויקות, Primary, Backup, ערוצים, זמני תגובה ותרגיל Alert |
| D11 | `governance.data-retention-policy` | Policy v2 בכפוף ל־Legal review | חלקי | Legal + Security מאשרים 25 Data classes, Triggers, periods ו־Legal Hold |

## 4. החלטות תשתית ו־Pilot

| מספר | נושא | תשובת טל | סטטוס אחרי הקליטה | מה עדיין נדרש |
|---|---|---|---|---|
| D12 | PostgreSQL | Railway PostgreSQL ל־Pilot | כיוון נבחר | Plan, Region, Pool, PITR, Budget, live migration rehearsal ו־RPO/RTO evidence |
| D13 | Queue/DLQ | Railway Redis + BullMQ | כיוון נבחר | Plan, AOF/noeviction, Adapters, DLQs, Retention, Load ו־Staging evidence |
| D14 | Object Storage | לא נענתה | פתוח | לבחור AWS S3, Vercel Blob או חלופה שעוברת Encryption/Versioning/Lifecycle/Legal Hold |
| D15 | Secrets | Vaults של הפלטפורמות עם בעלים שמיים | חלקי | שמות Primary/Backup, Inventory, Rotation ו־Break-glass rehearsal |
| D16 | סביבות | Production ו־Staging נפרדים | חלקי | Domains, Origins, Regions, Preview policy ו־Resource fingerprints |
| D17 | Identity | Clerk חובה; Organizations; MFA ל־Admin | בסיס מקומי, Invitation Adapter, Worker factory, ‏shared rate-limit, ‏Start command ו־Deferral עמיד ל־429/Retry-After ממומשים | ערכי Railway חיים, ראיית 429 חיה, Dashboard settings, Session policy, authorized parties, Admin allowlist, Backfill ו־live identity evidence |
| D18 | GitHub | Repo פרטי קיים ומוגן; מעבר ל־Organization בהמשך | חלקי | Branch protection חי, Required checks, CODEOWNERS, Collaborators ו־signed CI evidence |
| D19 | RACI | Primary ו־Backup שמיים לכל תחום | חלקי | למלא שמות לכל תפקיד, Approvers ו־On-call |
| D20 | Meta assets | Test WABA תחילה; Pilot מאושר עם נכסי האב | חלקי | Asset IDs, בעלות, Opt-in, Coexistence, Test number והרשאות כתובות |
| D21 | Pilot | Tenant יחיד ו־Closed pilot | חלקי | שמות משתתפים, תקרות נמענים/קמפיינים/AI, משך ו־Stop conditions |
| D22 | ICP | עסקים קטנים ישירים בישראל; עברית תחילה | כיוון נבחר | רשימת Design partners וקריטריוני הצלחה מדידים |
| D23 | Packages | Plan ידני יחיד ל־Pilot | חלקי | מחיר, Currency, Quotas, Overages ופרטי קשר חוקיים |
| D24 | Recurring campaigns | אחרי Pilot | נדחה במכוון | לא לפתח לפני Gate post-Pilot |
| D25 | AI autonomy | תשובה רק אחרי אישור נציג | כיוון נבחר | Permission, Audit, timeout, stale approval ו־handoff evidence |
| D26 | Legal/Privacy | ישראל תחילה ובדיקת Legal | חלקי | Privacy policy, Terms, DPA, deletion/export rights ו־Data residency approval |
| D27 | Release | Staged rollout, Canary ו־Rollback | חלקי | אחוזי Canary, Owners, Thresholds, Freeze window ותרגיל Rollback |
| D28 | Budgets | תקרה נפרדת לכל ספק | חלקי | סכום ומטבע לכל ספק, Alerts ו־Kill switch |

## 5. החלטות לאחר Pilot

| מספר | נושא | תשובת טל | סטטוס | כלל ביצוע |
|---|---|---|---|---|
| D29 | עדיפות Roadmap | לא נענתה | פתוח, לא חוסם Pilot | להחליט לפי נתוני שימוש, Support והכנסה מה־Pilot |
| D30 | Enterprise/Integrations/Mobile | לא נענתה | פתוח, לא חוסם Pilot | לא לבנות Feature רחב ללא לקוח, הכנסה או דרישת Compliance |

## 6. שאלות שחייבים להשלים עכשיו

6.1 D03 — איזה ספק יהיה פעיל ראשון ב־Pilot: Paddle או Stripe?
הכנת שני Adapters מותרת; הפעלת שני מקורות אמת במקביל אינה מותרת.

6.2 D05 — האם לאשר ClamAV `clamd` כשירות Railway פרטי לסריקת
PDF/TXT/DOCX, בכפוף לבדיקת זיכרון, עדכוני חתימות ו־Failure recovery?

6.3 D14 — האם לבחור AWS S3 כ־Object storage הראשי, כולל Encryption,
Versioning, Lifecycle ו־Object Lock רק למחלקות שמחייבות WORM/Legal
Hold?

6.4 D19 — מי הם Primary ו־Backup עבור Deployment, Backend/Queues,
Security/Privacy, Legal, Billing, On-call ו־Product Go/No-Go?

6.5 D20–D21 — מהם נכסי Meta המאושרים ומהן תקרות ה־Pilot: מספר
משתמשים, נמענים ייחודיים, הודעות ביום, קמפיינים ביום, AI requests
ותאריך סיום?

6.6 D23 ו־D28 — מהם המטבע, מחיר ה־Pilot ותקרת ההוצאה החודשית לכל
אחד מהספקים: Vercel, Railway, Redis/PostgreSQL, Storage, Better Stack,
OpenAI, Meta, Clerk, Scanner ו־Billing?

6.7 D10, D16 ו־D27 — מהם שעות התמיכה, Domains, Regions, אחוזי Canary,
ספי Rollback וזהות המאשר?

6.8 D11 ו־D26 — Legal צריך לאשר את Retention v2, Privacy, Terms,
DPA, זכויות מחיקה/ייצוא ו־Data residency. עד אז Adapter המחיקה נשאר
מנותק.

## 7. החלטות שאפשר לדחות

7.1 D29 ו־D30 נדחות עד שקיימים נתוני Pilot. אין צורך לענות עליהן
כדי להתחיל Staging או Closed pilot.

7.2 Recurring campaigns ב־D24 נשארות מחוץ ל־Pilot.

## 8. כללי מימוש שנגזרו

8.1 OpenAI נשאר מאחורי Provider port. ברירת Connect היא
`store: false`; אין להעביר מספרי טלפון, Tenant IDs או מידע שאינו
דרוש. Dataset של Evals יכיל מידע מושחר בלבד, משום ש־`/v1/evals`
אינו זכאי ל־Zero Data Retention לפי OpenAI Docs.

8.2 Billing יוגדר כ־Provider-neutral port עם Paddle ו־Stripe
Adapters נפרדים. Adapter פעיל יחיד ייבחר באמצעות תצורת Server
מאושרת; אין Fallback אוטומטי בין ספקי Billing עבור אותו Event.

8.3 PostgreSQL הוא מקור האמת העסקי. Redis/BullMQ מנהל Delivery,
Delay ו־Backpressure בלבד; Job payload אינו מכיל PII.

8.4 Production readiness נשאר Fail-closed. תשובה בשאלון אינה
מחליפה Decision record מאושר, Secret/configuration, Adapter או
Evidence חי.

8.5 ‏D17 מיושמת מקומית באמצעות `orgId` חתום, מיפוי אטומי
Tenant↔Clerk Organization ב־PostgreSQL, Adapter הזמנות ו־Token bucket ייעודי
המשותף לכל Workers. ‏Clerk auto-create/MFA, ‏Session policy, ‏Backfill,
תצורת Rate limit והזמנות Organization חיים עדיין חיצוניים.

## 9. מקורות

9.1 [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create).

9.2 [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data#default-usage-policies-by-endpoint).

9.3 [Railway databases](https://docs.railway.com/databases).

9.4 [Railway queues guide](https://docs.railway.com/guides/cron-workers-queues).

9.5 [Better Stack OpenTelemetry](https://betterstack.com/docs/logs/open-telemetry/).

9.6 [AWS S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html).
