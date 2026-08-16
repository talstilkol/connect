# המלצות להחלטות החיצוניות

תאריך בדיקה: 2026-08-16

## 1. עקרונות החלטה

1.1 המסמך מציע ברירת מחדל הנדסית. הוא אינו תחליף לייעוץ משפטי,
מיסוי, פרטיות או אבטחת מידע.

1.2 אין לחבר ספק ל־Production לפני Sandbox/Staging, בדיקות כשל,
מגבלת עלות, DPA מתאים ונתיב ניתוק מתועד.

1.3 כל Adapter יישאר מאחורי הממשק הניטרלי שכבר קיים במערכת, כדי
שבחירת ספק לא תהפוך לתלות בלתי־הפיכה.

## 2. החלטה 1 — Team Invitation Policy

2.1 המלצה: `TEAM_INVITATION_TTL_HOURS=72`.

2.2 המלצה: `TEAM_INVITATION_REREQUEST_POLICY=after-terminal`.

2.3 Clerk יוכיח את זהות המשתמש והאימייל המאומת, אך D1 יישאר מקור
האמת ל־Invitation state, ‏Role, ‏Audit ו־Idempotency.

2.4 הסיבה: 72 שעות מצמצמות חשיפה של קישור ישן בלי להכביד מדי על
הזמנה עסקית. Re-request מותר רק אחרי Expired, ‏Revoked או Accepted,
ולא בזמן שהזמנה פעילה עדיין Pending.

2.5 Clerk תומך בהזמנות Organization, תפקיד, Redirect URL ותפוגה;
ברירת המחדל שלו ארוכה יותר ולכן יש להגדיר את החלון במפורש.

## 3. החלטה 2 — ספק AI

3.1 המלצה: **OpenAI דרך Responses API**, מאחורי ה־Provider Port
הקיים.

3.2 אין לקבע מודל לפני Eval על שיחות אמיתיות שעברו השחרה. יש לבחור
שני מועמדים לפי איכות, זמן תגובה ועלות, ולהעביר 5% תעבורה ב־Canary.

3.3 ברירת המחדל לפרטיות: `store: false`, ללא שליחת Tenant ID,
מספר טלפון או תוכן שאינו דרוש ליצירת התשובה.

3.4 יש להשאיר Grounding, מגבלת עלות, Handoff ו־Audit בצד Connect;
הספק אינו רשאי לשלוח הודעת WhatsApp בעצמו.

3.5 OpenAI ממליצה על Responses API לפרויקטים חדשים והיא תומכת
ב־Structured Outputs וב־Function calling.

## 4. החלטה 3 — ספק Billing

4.1 המלצה ראשית להשקת SaaS גלובלי קטן: **Paddle כ־Merchant of
Record**.

4.2 הסיבה: Paddle מרכז Checkout, ‏Subscriptions, ‏Tax, ‏Dunning,
Fraud ו־Customer portal, ולכן מפחית עומס משפטי ותפעולי בצוות קטן.

4.3 תנאי לפני אישור: Paddle חייב לאשר בכתב Onboarding, ‏Payouts
ותמיכה בישות המשפטית ובחשבון הבנק שממנו Connect יפעל. מצב זה אינו
ידוע מתוך הקוד.

4.4 חלופה: Stripe כאשר קיימת כבר ישות עם תשתית מס וחשבונאות, או
כאשר Stripe Managed Payments זמין ומתאים מסחרית. אין לשלב שני ספקים
בגרסה הראשונה.

## 5. החלטה 4 — Rate Limit Policy

5.1 המלצה התחלתית:

5.1.1 System Admin mutations: ‏10 פעולות לדקה לכל User.

5.1.2 Tenant mutations: ‏120 פעולות לדקה לכל User+Tenant.

5.1.3 Meta Webhook ingress: ‏1,500 אירועים לדקה לכל Meta App או
Phone Number ID, אחרי אימות חתימה ולפני Queue publication.

5.2 המפתחות יהיו זהויות יציבות ולא כתובת IP. Cloudflare מציינת
שמגבלת Workers היא מקומית ל־PoP ו־eventually consistent, ולכן היא
אינה מנגנון Billing או Quota מדויק.

5.3 לאחר שבועיים של Staging/Production telemetry יש לכייל את
הספים לפי p95 ועומסי Burst אמיתיים.

## 6. החלטה 5 — File Scanner

6.1 המלצה: **ClamAV `clamd` בתוך Cloudflare Container מבודד**.

6.2 Worker יקרא את האובייקט מ־R2, יזרים את הבתים ל־Scanner ולא
ישלח קישור ציבורי או Object Key לספק צד שלישי.

6.3 ה־Container יעדכן חתימות באמצעות `freshclam`, ייחסם ל־Egress
שאושר מראש ויחזיר רק `clean`, ‏`infected` או `unavailable`.

6.4 Timeout, חתימות ישנות, דוח לא מוכר או Scanner לא זמין ייכשלו
סגור. אין Extraction לפני תוצאת `clean`.

## 7. החלטה 6 — Knowledge Upload Policy

7.1 המלצה: `KNOWLEDGE_UPLOAD_MAX_BYTES=10485760` — עשרה MiB.

7.2 רשימת MIME מומלצת לגרסה הראשונה:

7.2.1 `application/pdf`.

7.2.2 `text/plain`.

7.2.3 `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

7.3 אין לאפשר ZIP, קוד, HTML, Office macros, קובץ מוצפן או MIME
שאינו תואם לחתימת הקובץ.

7.4 כל Upload יעבור Size check, ‏Digest, ‏R2 write, ‏Read-back,
Malware scan, Extraction ורק אז Passage publication.

## 8. החלטה 7 — Knowledge Scan Recovery

8.1 המלצה: `KNOWLEDGE_SCAN_RETRY_MIN_AGE_SECONDS=900` — 15 דקות.

8.2 יש להגביל לשלושה ניסיונות אוטומטיים. לאחר מכן המקור יעבור
ל־Manual review עם Error code מוגבל וללא תוכן הקובץ.

8.3 Retry ישתמש ב־Expected Version ובאותו Digest; אין ליצור Source
חדש ואין לבצע Retry מקביל.

## 9. החלטה 8 — Backup ו־Restore

9.1 המלצה:

9.1.1 `BACKUP_SCHEDULE_INTERVAL_HOURS=24`.

9.1.2 `BACKUP_RETENTION_DAYS=90`.

9.1.3 `RESTORE_REHEARSAL_INTERVAL_DAYS=30`.

9.2 D1 Time Travel מספק Point-in-time recovery של עד 30 ימים
בתוכנית Workers Paid. לצורך 90 יום יש להוסיף Export מוצפן ל־R2
Backup bucket נפרד.

9.3 R2 Lifecycle ינהל תפוגה של 90 יום. Restore rehearsal יתבצע רק
לסביבה מבודדת ויאמת D1, ‏R2 manifests ו־digests לפני יצירת Evidence.

## 10. החלטה 9 — מקור מדידת SLO

10.1 המלצה: Cloudflare Workers Logs ו־Traces כמקור התשתיתי, יחד עם
אירועי Telemetry המצומצמים שכבר קיימים באפליקציה.

10.2 תצורה התחלתית:

10.2.1 `SLO_MEASUREMENT_WINDOW_MINUTES=43200` — 30 ימים.

10.2.2 `SLO_MINIMUM_VALID_EVENTS=1000`.

10.3 בסביבה עם פחות מ־1,000 אירועים אין להציג SLO תקין; יש להציג
`insufficient-data` ולהסתמך זמנית גם על Synthetic smoke checks.

## 11. החלטה 10 — SLO Alert Policy

11.1 המלצה: בעלות של צוות `operations-oncall` ונתיב Escalation
ייעודי כגון `pagerduty-connect-primary` לאחר בחירת ספק ההתראות.

11.2 התראה תיפתח גם על SLO breach וגם על Insufficient data. אין
להכניס Tenant, תוכן הודעה או מספר טלפון להתראה.

11.3 יעד הזמינות נשאר 99.5%. לאחר צבירת נתונים יש להוסיף מדיניות
Burn-rate רב־חלונית, אך לא לשנות יעד ללא נתוני Production.

## 12. החלטה 11 — Data Retention ו־Legal Hold

12.1 המלצה: לאשר Policy v2 עם כל 25 מחלקות המידע ועם ה־Trigger
הקנוני שכבר מקודד במערכת.

12.2 Baseline הנדסי מוצע, לפני אישור משפטי:

12.2.1 30 ימים: Credentials, ‏Webhook receipts, ‏Delivery records,
Bot/AI runtime, ‏Team invitation ו־Invitation delivery אחרי סיום.

12.2.2 90 ימים: Campaigns, ‏Conversations, ‏Messages,
Subscriptions ו־Production decision state אחרי סיום.

12.2.3 30 ימים אחרי Tenant close: Tenant, ‏Contacts, ‏Meta
connection, ‏Templates, ‏Bot flows, ‏AI agents ו־Knowledge sources.

12.2.4 730 ימים: Consent events, ‏Audit logs, ‏Production decision
events ו־Team invitation events.

12.2.5 2,555 ימים: Billing events, רק לאחר אישור רואה חשבון ועורך
דין שהתקופה תואמת לחובות המס וההתיישנות החלות על החברה.

12.3 Legal Hold גובר על כל מחיקה. יש לשמור Reason, ‏Approver,
Start time ו־Release audit, ללא אפשרות ביטול על ידי אותו מאשר.

12.4 מדריך רשות הגנת הפרטיות בישראל מציין 24 חודשי שמירה לנתוני
אבטחה מסוימים ודרישות גיבוי/שחזור למאגרים ברמת אבטחה בינונית או
גבוהה. לכן 730 ימים הם Baseline סביר ל־Audit, אך נדרש אישור משפטי
למיפוי המדויק של כל מחלקה.

12.5 אין להפעיל את Adapter המחיקה לפני אישור המדיניות, בדיקת
Legal Hold, Dry run, Plan קצר־תוקף ותרגיל Restore מוצלח.

## 13. סדר אישור מומלץ

13.1 שבוע החלטות ראשון: Invitation, ‏AI, ‏Billing ו־Upload/Scanner.

13.2 שבוע החלטות שני: Rate Limits, ‏Recovery, ‏Backup/SLO ו־Retention.

13.3 לכל החלטה יירשמו Owner, ‏Approver, תאריך, חלופה שנדחתה,
עלות חודשית מקסימלית ותנאי Exit.

## 14. החלטה 12 — זהויות Claude וגישה מרחוק

14.1 המלצה: Claude Team בבעלות החברה עם Seat אישי לכל מפתח.
מנוי אישי נפרד יכול לשמש רק אם מדיניות החברה מאשרת אותו; חשבון
רגיל משותף אינו מאושר.

14.2 AnyDesk הוא ערוץ גישה למחשב חברה, לא מנגנון לשיתוף Claude.
אם הוא נדרש, יש להפעיל 2FA, ‏Access Control List, משתמש OS אישי
ו־Permission Profile מצומצם.

14.3 אין לשתף Password, ‏Cookie, ‏Session, קוד כניסה או Token דרך
AnyDesk, צ'אט, GitHub או מסמך.

## 15. החלטה 13 — GitHub ו־Repository Authority

15.1 כבר קיים Repository פרטי בשם `talstilkol/connect`. ההמלצה היא
לא לפתוח עותק נוסף, אלא להעביר את הקיים ל־Organization של החברה
ולהגדיר אותו במפורש כ־Repository Authority.

15.2 כל חבר צוות יעבוד בזהות אישית עם 2FA. רועי ינהל Membership
ו־Roles; אין משתמש משותף ואין Push ישיר ל־`main`.

15.3 Branch Protection, ‏CODEOWNERS, Review חובה, תשעת ה־Checks,
Secret scanning ו־Push protection יופעלו לפני עבודה משותפת.

## 16. החלטה 14 — Hosting

16.1 המלצה: להשאיר בשלב הנוכחי את ה־Runtime המלא על Cloudflare.
הקוד הקיים משתמש ישירות ב־Worker, ‏D1, ‏R2, ‏Queues, ‏DLQs, ‏Rate
Limits ו־Cron, ולכן Vercel + Railway הם Migration ולא פריסה רגילה.

16.2 אם Vercel + Railway הם דרישה מחייבת, יש לאשר תחילה ADR שמגדיר
Vercel UI, ‏Railway API/Worker, ‏PostgreSQL ו־Queue חלופי, ולבנות
מחדש את חוזי Auth, ‏Backup, ‏Evidence ו־Release.

16.3 אין לשתף Deployment Token. יש להזמין את ראשה כ־Member עם
Least privilege. לפי התיעוד העדכני, שיתוף Members ב־Railway מיועד
ל־Pro/Enterprise, ולכן תוכנית Hobby של 5 דולר אינה תואמת לבדה למודל
הגישה שהוצע.

## 17. החלטה 15 — WhatsApp Business Platform

17.1 המלצה: Meta Cloud API רשמי מאחורי ה־Backend הקיים. ה־Browser
לא יקבל Meta Access Token ולא יקרא ישירות ל־Graph API.

17.2 פרויקט ה־WordPress יעבור Sanitization ו־Secret/PII scan לפני
שיתוף. דוד יחלץ ממנו Integration Inventory וחוזה התנהגות בלבד.

17.3 החיבור הראשון יתבצע עם Test WABA ומספר בדיקה. נכס האב יחובר
רק ב־Pilot מבודד, באישור מפורש, עם נמענים מורשים, Rate limit,
Kill switch ו־Audit.

17.4 תוכנית הביצוע, חלוקת האחריות ותנאי הקבלה נמצאים ב־
`docs/team-operating-plan.md`.

## 18. מקורות רשמיים

18.1 [Clerk Organization invitations](https://clerk.com/docs/guides/organizations/add-members/invitations).

18.2 [OpenAI — Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses).

18.3 [Paddle for SaaS](https://developer.paddle.com/get-started/how-paddle-works/saas/).

18.4 [Stripe Managed Payments](https://docs.stripe.com/payments/managed-payments/how-it-works).

18.5 [Cloudflare Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

18.6 [Cloudflare Containers](https://developers.cloudflare.com/containers/).

18.7 [ClamAV scanning](https://docs.clamav.net/manual/Usage/Scanning.html).

18.8 [Cloudflare D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).

18.9 [Cloudflare R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).

18.10 [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/).

18.11 [Cloudflare Workers Traces](https://developers.cloudflare.com/workers/observability/traces/).

18.12 [רשות הגנת הפרטיות — משך שמירת נתוני אבטחה](https://www.gov.il/he/pages/data_security_guide?chapterIndex=19).

18.13 [רשות הגנת הפרטיות — גיבוי ושחזור](https://www.gov.il/he/pages/data_security_guide?chapterIndex=20).

18.14 [GitHub — Managing repository access](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-teams-and-people-with-access-to-your-repository?apiVersion=2022-11-28).

18.15 [Railway — Pricing plans](https://docs.railway.com/pricing/plans).

18.16 [Vercel — Managing team members](https://vercel.com/docs/rbac/managing-team-members).

18.17 [Meta — WhatsApp Business Platform](https://www.postman.com/meta/whatsapp-business-platform/overview).

18.18 [Anthropic — Claude Team](https://support.claude.com/en/articles/9267247-get-started-with-the-team-plan).

18.19 [AnyDesk — Two-factor authentication](https://anydesk.com/en/features/2-factor-authentication).
