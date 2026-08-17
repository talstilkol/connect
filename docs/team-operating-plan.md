# תוכנית עבודה צוותית — GitHub, Hosting ו־WhatsApp רשמי

תאריך עדכון: 2026-08-17

## 1. מטרת המסמך

1.1 המסמך מתרגם את עדכון הצוות לתוכנית ביצוע עם בעלים, שערי קבלה
וגבולות אבטחה.

1.2 פתיחת חשבון או קבלת גישה אינן נחשבות השלמת Milestone. שלב
נחשב `verified` רק לאחר שהפלט שלו נבדק מול תנאי הקבלה.

1.3 המסמך אינו מאשר פריסה או שימוש ב־Credentials אמיתיים. פעולות
כאלה יבוצעו רק לאחר החלטת ארכיטקטורה, הרשאה מפורשת וסביבת יעד מבודדת.

1.4 [שאלון ההחלטות המהותיות](connect-decisions-questionnaire.html)
מרכז הסברים למתחילים, חלופות והמלצות לדיון הצוותי. בחירות בו נשמרות
בדפדפן המקומי בלבד ומשמשות טיוטת קלט לתהליך האישור.

1.5 השאלון אינו מקור אמת ואינו מאשר החלטת Production. החלטה מחייבת
נרשמת ב־ADR או ב־Policy המאושרים, מקושרת ל־Evidence הנדרש ומשתקפת
ב־`productionDecisionRegistry` כאשר היא חוסמת את שער ה־Production.

## 2. עובדות קיימות מול החלטות פתוחות

2.1 עובדות מאומתות מתוך ה־Repository:

2.1.1 קיים Repository בשם `talstilkol/connect` ב־GitHub. בבדיקת
Governance חיה מ־2026-08-16 הוא נמצא `public`; החשיפה תוקנה באותו
יום ואימות חוזר דיווח `private=true` ו־`visibility=private`. ארבעת
הענפים עדיין נמצאו לא מוגנים ולא נמצאו Rulesets. דוח הראיות נמצא
ב־`docs/github-governance-live-audit.md`.

2.1.2 האפליקציה היא Next.js/React full-stack שנבנית באמצעות Vinext
כ־Cloudflare Worker יחיד.

2.1.3 שכבת ה־Runtime משתמשת ב־D1, ‏R2, שלושה Queues, שלושה DLQs,
Rate-limit bindings ו־Cron.

2.1.4 כבר קיימים בקוד UI ל־Meta Embedded Signup, החלפת Authorization
Code, אימות נכסי WABA, ‏Webhook חתום ו־Queue לעיבוד האירועים.

2.1.5 עדיין אין Evidence של חיבור חי לחשבון Meta, פריסת Staging
מבודדת או שליחת הודעה אמיתית.

2.2 החלטות שהצוות מסר:

2.2.1 רועי הוא בעל חשבונות התשתית והמאשר שלהם.

2.2.2 דוד אחראי למסלול WhatsApp הרשמי ולחוזה ה־Backend API.

2.2.3 ראשה אחראית ל־Deployment ולחיבור ה־UI אל ה־Backend דרך GitHub.

2.2.4 טל אחראי למחקר ופיתוח של Rate Limiting ושל מגבלות
WhatsApp/Meta על שליחת הודעות, קמפיינים ובוטים.

2.2.5 כל חבר צוות יפתח זהות GitHub אישית ויעבוד דרך Pull Requests.

2.2.6 החיבור ל־WhatsApp יהיה רק דרך WhatsApp Business Platform
הרשמי.

2.2.7 ‏`talstilkol/connect` הפרטי שבבעלות טל הוא Repository
Authority היחיד בשלב הנוכחי. אין לפתוח עותק מתחרה.

2.2.8 יעד ה־Hosting שנבחר הוא Migration מלא: Vercel עבור שכבת
ה־Web ו־Railway עבור API ו־Worker נפרדים. זה אינו מתיר Hybrid זמני
ואינו הופך את הקוד הנוכחי לפריס ביעד ללא Migration.

2.3 החלטות שעדיין אינן סגורות:

2.3.1 האם כלי הפיתוח הוא Claude Team עם Seat אישי לכל מפתח או
מנוי אישי נפרד. חשבון רגיל משותף אינו חלופה מאושרת.

2.3.2 האם פרויקט ה־WordPress משתמש ב־Meta Cloud API ישיר או ב־BSP
חיצוני. המצב הוא `unknown/unavailable` עד שדוד ישלים Inventory נקי.

2.3.3 מי הבעלים החוקי והטכני של Meta Business Portfolio, ‏WABA,
מספר הטלפון וה־Templates שישמשו את ה־Pilot.

2.3.4 מי הם ספקי PostgreSQL, ‏Queue/DLQ, ‏Object storage,
Scheduler, ‏Rate limiting, ‏Secrets, ‏Monitoring ו־Backup ב־Topology
של Vercel ו־Railway. בחירת שני ספקי ה־Hosting אינה מכריעה רכיבים אלה.

## 3. הערות ותיקונים לתוכנית המקורית

3.1 Claude ו־AnyDesk:

3.1.1 ההמלצה היא Claude Team בבעלות החברה, עם Seat וזהות אישיים לכל
מפתח. אין לשתף חשבון, Cookie, קוד כניסה או Session.

3.1.2 AnyDesk יכול לשמש לגישה למחשב חברה, אך לא לעקיפת מודל הרישוי
או לשיתוף חשבון Claude.

3.1.3 אם AnyDesk נדרש, יש להשתמש ב־OS user אישי, ‏2FA, ‏Access
Control List, אישור Session ו־Permission Profile מצומצם. Clipboard,
File transfer ו־Unattended access יהיו כבויים אלא אם צורך מתועד
מחייב אותם.

3.1.4 אין להזין ל־Claude קוד או מידע עסקי לפני אישור מדיניות החברה
ל־Data retention, קניין רוחני ו־Subprocessors.

3.2 GitHub:

3.2.1 אין לפתוח Repository כפול. ‏`talstilkol/connect` הפרטי הוא
ה־Authority שאושר. העברה עתידית ל־Organization תעביר את אותו
Repository ורק לאחר בחירת ישות משפטית ונתיב התאוששות.

3.2.2 טל יזמין משתמשים אישיים כבעל ה־Repository; אין משתמש GitHub
משותף. כל משתמש
יפעיל 2FA ויקבל Least privilege לפי תפקידו.

3.2.3 לפני עבודה משותפת יוגדרו Branch Protection, ‏CODEOWNERS,
Review חובה, ביטול Approvals ישנים, פתרון Review threads, חסימת Force
push, ‏Secret scanning ו־Push protection.

3.2.4 שינוי עסקי או תשתיתי יגיע דרך Branch ו־Pull Request. אין Push
ישיר ל־`main`.

3.3 Hosting:

3.3.1 רכישת Railway ב־5 דולר אינה שקולה לקניית שרת קבוע. תוכנית
Hobby כוללת קרדיט שימוש חודשי, והחיוב עשוי לגדול לפי צריכה.

3.3.2 לפי תיעוד Railway, שיתוף Workspace עם Members מיועד ל־Pro
ול־Enterprise. לכן אי אפשר לבנות תוכנית בטוחה שבה רועי משלם Hobby
וראשה מקבלת Token משותף.

3.3.3 לפי תיעוד Vercel, ניהול Team members ותפקידי צוות רלוונטיים
לתוכניות Pro/Enterprise. יש לבחור Plan ו־Role לפני הזמנה, ולא לשתף
Access Token.

3.3.4 ‏Cloudflare הוא בסיס המימוש והבדיקות הקיימים, אך אינו יעד
ה־Production שנבחר. אין לפרוס אותו כברירת מחדל חלופית לאחר אישור
ADR-0001; הוא נשמר כנקודת השוואה עד השלמת ה־Migration.

3.3.5 Vercel + Railway נבחרו, ולכן נדרש Migration מלא:

3.3.5.1 Vercel — Next.js UI בלבד.

3.3.5.2 Railway API — REST/HTTP, ‏Meta webhook ו־Business services.

3.3.5.3 Railway Worker — Queue consumers ו־Scheduler.

3.3.5.4 PostgreSQL — מקור הנתונים המרכזי במקום D1.

3.3.5.5 Redis או Postgres job queue — Retry, ‏DLQ, ‏Backpressure,
Idempotency ו־Rate limits.

3.3.5.6 R2 יכול להישאר Object storage דרך S3 API, אך נדרש Adapter.

3.3.6 אין להתחיל פריסה היברידית. ערבוב זמני של Server Actions, ‏D1,
Cloudflare Queues, ‏Vercel UI ו־Railway API מנוגד ל־ADR-0001.

3.4 WhatsApp ופרויקט ה־WordPress:

3.4.1 פרויקט ה־WordPress הוא מקור ללמידת האינטגרציה, לא חוזה API
חדש ולא מקור ל־Credentials.

3.4.2 לפני מסירה לדוד או לכלי AI יש ליצור עותק נקי שמסיר `.env`,
Tokens, ‏Database dumps, לוגים, מספרי טלפון, נתוני לקוחות ו־PII.

3.4.3 דוד יפיק Inventory בלבד: סוג האינטגרציה, גרסת Graph API,
Endpoints, ‏Webhook payloads, ‏Permissions, ‏WABA/Phone Number IDs,
Templates, ‏Retry ו־Idempotency. ערכי Secrets לא ייכללו ב־Inventory.

3.4.4 ה־Frontend לא יתחבר ישירות ל־Meta ולא יקבל Meta Access Token.
הזרימה המאושרת היא:

```text
Browser -> Connect backend -> Meta Graph API
Meta webhook -> Connect backend -> Queue -> Domain processors
```

3.4.5 הניסוי הראשון יתבצע עם Test WABA ומספר בדיקה של Meta. רק
לאחר מעבר מלא ב־Staging יתבצע Pilot מוגבל עם נכס של האב, באישורו
המפורש, מול נמעני בדיקה מאושרים וללא דיוור המוני.

3.4.6 Credentials אמיתיים יוזנו רק ל־Secret store של סביבת Staging
או Production. הם לא יישלחו ב־WhatsApp, דוא"ל, צ'אט, Prompt, קוד,
GitHub Issue, Log או Frontend bundle.

## 4. אחריות צוותית

4.1 רועי — Account owner ו־Approver:

4.1.1 מאשר תקציב, Plans, חשבונות וגישה ל־Vercel ול־Railway.

4.1.2 פותח או מעביר חשבונות חברה ומזמין Members לפי Role.

4.1.3 אינו משתף Password או Token אישי.

4.2 דוד — WhatsApp backend owner:

4.2.1 מקבל עותק WordPress שעבר Sanitization ו־Secret scan.

4.2.2 מזהה Direct Meta מול BSP ומתעד Dependencies.

4.2.3 מתאים את ה־Meta adapter הקיים ומפרסם OpenAPI/DTO contract
גרסתי לראשה.

4.2.4 מוכיח Signature verification, ‏Idempotency, ‏Retry ו־Error
mapping באמצעות בדיקות.

4.3 ראשה — Deployment ו־UI owner:

4.3.1 מקבלת Membership אישי ולא Token משותף.

4.3.2 מגדירה Preview ו־Staging רק לאחר החלטת Hosting.

4.3.3 מחברת את ה־UI לחוזה של דוד, ללא Secret או קריאת Meta ישירה.

4.3.4 מתעדת Deployment, ‏Health check, ‏Smoke test ו־Rollback.

4.4 טל — WhatsApp limits ו־Rate Limiting R&D owner:

4.4.1 מתחזק מטריצה מתוארכת של מגבלות Meta הרשמיות, מצב ה־WABA
החי, Error codes, ‏Retry behavior ו־Policy enforcement.

4.4.2 מפריד בין מגבלות ספק Meta, קיבולת Webhook/Queue ומכסות
פנימיות של Connect. ערך שלא פורסם או לא נקרא מחשבון מורשה נשאר
`unknown/unavailable`.

4.4.3 מציע Quotas, ‏Headroom, ‏Backoff, ‏Alerts ו־Kill switch על
בסיס תיעוד רשמי, Telemetry ו־Load tests. ‏טל מאמת את העובדות; דוד
Accountable למימוש; אבטחה ומוצר מאשרים את המדיניות לפני הפעלה.

4.4.4 בודק שינויים בתיעוד ובתנאי Meta לפני Pilot, לפני כל Production
release ולפחות אחת ל־30 יום בזמן פיתוח פעיל.

4.4.5 מקור העבודה הוא `docs/whatsapp-rate-limits.md`; ערכי חשבון חיים
ודיגסט Release נשמרים ב־Evidence ולא במסמך סטטי.

4.4.6 טל הוא גם Owner של Repository Authority הנוכחי. הוא מנהל
Collaborators והגנות GitHub עד העברה עתידית מאושרת.

4.5 כלל הצוות:

4.5.1 GitHub account אישי, ‏2FA, Commit מזוהה ו־Pull Request.

4.5.2 אין Secret ב־Git, Prompt, Screenshot, Log או Ticket.

4.5.3 אין שימוש בנתוני לקוח ב־Development או Preview.

## 5. תוכנית ביצוע לפי Gates

5.1 Gate 0 — החלטות ותיחום:

5.1.1 מסמכי ההחלטה של Gate 0 מנוהלים כך:

5.1.1.1 [ADR-0001 — Hosting topology](adr/0001-hosting-topology.md).

5.1.1.2 [ADR-0002 — Repository Authority](adr/0002-repository-authority.md).

5.1.1.3 [ADR-0003 — Claude account model](adr/0003-ai-development-account-model.md).

5.1.2 ‏[ADR-0001](adr/0001-hosting-topology.md) הוא `accepted` ונבחר
Migration מלא ל־Vercel ול־Railway. בחירת PostgreSQL, ‏Queue, ‏Storage,
Scheduler, ‏Secrets ו־Observability נשארת פתוחה וחוסמת Deployment.

5.1.2.1 ‏[ADR-0002](adr/0002-repository-authority.md) הוא `accepted`:
`talstilkol/connect` הפרטי הוא מקור האמת היחיד בבעלות טל.

5.1.2.2 ‏[ADR-0003](adr/0003-ai-development-account-model.md) נשאר
`proposed` עד שבעל חשבונות החברה מאשר מודל Seats וזהויות.

5.1.3 תנאי סיום: אין סעיף Hosting או Account שמכיל שתי חלופות
סותרות.

5.1.4 הצוות עובר על כל ההחלטות המסומנות `לפני Pilot` ב־
[שאלון ההחלטות המהותיות](connect-decisions-questionnaire.html). ייצוא
JSON מהשאלון משמש סיכום לדיון בלבד; בעלי הסמכות מעבירים כל החלטה
מאושרת למסמך ה־ADR או ה־Policy המתאים.

5.1.5 תנאי קבלה נוסף: לכל חסם ב־`productionDecisionRegistry` יש
Owner, החלטה מאושרת או סטטוס פתוח מפורש, וקישור לראיה הנדרשת. אין
לסמן חסם כ־`ready` בגלל בחירה מקומית בשאלון בלבד.

5.1.6 שני ADRs נמצאים ב־`accepted` ואחד ב־`proposed`. ‏Gate 0 נשאר
`not verified` עד אישור ADR-0003 ועד שרועי, ראשה, דוד ואבטחה משלימים
את אישורי התקציב, המימוש והגישה שנדרשים ב־ADR-0001.

5.2 Gate 1 — GitHub Governance:

5.2.1 כל המשתמשים פותחים חשבון אישי ומפעילים 2FA.

5.2.2 טל מזמין Collaborators, מגדיר Roles ומפעיל את כל הגנות
ה־Repository. העברה עתידית ל־Organization אינה תנאי לעבודה, אך
Review, ‏2FA, ‏Least privilege וכל ההגנות עדיין חובה.

5.2.3 תנאי סיום: Pull Request אמיתי עובר Review ואת תשעת Checks,
ו־Governance Evidence נוצר עבור אותו Commit.

5.3 Gate 2 — WordPress Discovery בטוח:

5.3.1 מתקבל העתק מאושר מבעל הפרויקט.

5.3.2 ההעתק עובר Secret/PII scan לפני שיתוף.

5.3.3 דוד מפיק Integration Inventory וחוזה התנהגות, בלי לשכפל
Credentials ובלי לכתוב API חדש לפני הבנת הקיים.

5.3.4 תנאי סיום: Direct Meta או BSP מזוהה, והפער מול ה־Adapter
הקיים מתועד.

5.4 Gate 3 — Meta Sandbox:

5.4.1 מוגדרים Meta App, ‏Test WABA, מספר בדיקה, Webhook ו־Permissions
בסביבה מבודדת.

5.4.2 טל מפיק Baseline מאומת עבור מגבלות ה־Sandbox, ‏Error actions,
Webhook capacity ו־Kill switch, בלי להציג ערך דינמי כעובדה קבועה.

5.4.3 תנאי סיום: Challenge מאומת, Webhook חתום מתקבל פעם אחת,
Duplicate נדחה באופן Idempotent והודעת Template מאושרת נשלחת לנמען
בדיקה מורשה.

5.5 Gate 4 — Backend contract:

5.5.1 דוד משלים את ה־Adapter וה־API על בסיס הקוד הקיים.

5.5.2 החוזה כולל Authentication, ‏Authorization, DTOs, שגיאות,
Idempotency key, ‏Rate limits ו־Versioning.

5.5.3 טל מבצע Factual sign-off למגבלות Meta; דוד Accountable לכך
שהחוזה מיישם אותן; אבטחה ומוצר מאשרים מכסות פנימיות, ‏Backoff,
‏Circuit breakers ו־Telemetry לפי Scope.

5.5.4 תנאי סיום: Unit, integration ו־negative tests עוברים; Meta
Token אינו נגיש מה־Browser.

5.6 Gate 5 — UI Integration:

5.6.1 ראשה מחברת את הממשק הקיים לחוזה המאושר של דוד.

5.6.2 אין דרישה להעתיק את WordPress פיקסל־לפיקסל. יש לשמר את
ה־Workflows המאומתים ולהתאים אותם ל־Design system ולנגישות של Connect.

5.6.3 תנאי סיום: Connect, status, error, reconnect ו־permission
flows עוברים בדפדפן ללא Secret ב־Network payload או Console.

5.7 Gate 6 — Staging Deployment:

5.7.1 ראשה פורסת לפי ה־ADR בלבד, עם משאבים ו־Secrets מבודדים.

5.7.2 תנאי סיום: Build, migrations, health, webhook, smoke,
observability ו־rollback נבדקו מול Commit יחיד.

5.8 Gate 7 — Pilot עם נכס האב:

5.8.1 נדרש אישור מפורש מבעל הנכס ורשימת נמעני בדיקה מאושרים.

5.8.2 החיבור מתבצע ב־Staging/Pilot מבודד, עם Backup, מגבלת קצב,
Kill switch ו־Audit.

5.8.3 טל מאמת את מצב ה־WABA והמספר שנקראו בזמן אמת; דוד מאשר את
התאמת המימוש; אבטחה ומוצר מאשרים את תקרות ה־Pilot, ‏Alerts,
‏Queue headroom ותרגיל Kill switch.

5.8.4 תנאי סיום: חיבור, קבלה ושליחה נבדקו ללא פגיעה ב־WordPress
הקיים וללא הודעה לאדם שלא אושר.

5.9 Gate 8 — Review והמשך אפיון:

5.9.1 הצוות אוסף פערים מה־Pilot ומדרג אותם לפי סיכון וערך.

5.9.2 רק בשלב זה מחלקים Features חדשים בין המפתחים.

5.9.3 תנאי סיום: Backlog, ‏Owners, סדר תלויות ו־Definition of Done
מאושרים.

## 6. מצב והיקף שנותר

6.1 במסלול ה־Baseline המקומי כל 9 מתוך 9 השלבים הושלמו.

6.2 שלב 7 הסתיים בפיצול Contact Import ו־CSS לפי Feature; שלב 8
הסתיים בבדיקות עומס, DLQ וכשל; שלב 9 הסתיים ב־Release rehearsal
וב־`docs/release-operator-runbook.md`.

6.3 לא נשאר שלב פיתוח במסלול ה־Baseline המקומי. פערי PDF נוספים
ומשימות Rate Limiting מתועדים בנפרד ב־
`docs/completion-status-and-local-work.md` ואינם מסומנים כגמורים.

6.4 החיבור החי לצוות ולספקים הוא Workstream חיצוני נפרד בן תשעה
Gates, ‏0–8. Gate 1 ו־Gate 4 במצב `partial`; יתר ה־Gates אינם
`verified` עד לקבלת Accounts, החלטות וראיות חיות.

6.5 זמני המתנה לפתיחת חשבונות, אישור Meta, Review או רכישת Plans
אינם ניתנים לאומדן מתוך ה־Repository ולכן הם `unknown/unavailable`.

## 7. מקורות רשמיים

7.1 [GitHub — Managing repository access](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-teams-and-people-with-access-to-your-repository?apiVersion=2022-11-28).

7.2 [Railway — Pricing plans](https://docs.railway.com/pricing/plans).

7.3 [Vercel — Managing team members](https://vercel.com/docs/rbac/managing-team-members).

7.4 [Vercel — Sensitive environment variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables).

7.5 [Meta — WhatsApp Business Platform official collection](https://www.postman.com/meta/whatsapp-business-platform/overview).

7.6 [Meta — WhatsApp Cloud API](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api).

7.7 [Anthropic — Get started with Claude Team](https://support.claude.com/en/articles/9267247-get-started-with-the-team-plan).

7.8 [Anthropic — Manage Team members](https://support.claude.com/en/articles/13133750-manage-members-on-team-and-enterprise-plans).

7.9 [AnyDesk — Two-factor authentication](https://anydesk.com/en/features/2-factor-authentication).

7.10 [AnyDesk — Access Control List and settings](https://support.anydesk.com/docs/settings).
