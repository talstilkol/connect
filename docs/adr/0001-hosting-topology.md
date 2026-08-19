---
id: ADR-0001
title: Hosting topology for Pilot
status: accepted
decision_owner: טל
approved_option: full-migration-vercel-railway
approved_at: 2026-08-17T05:17:48Z
supersedes: none
---

# ADR-0001 — Hosting topology for Pilot

## 1. מצב ההחלטה

1.1 סטטוס: `accepted`.

1.2 בעל ההחלטה: טל — בחירת כיוון המוצר וה־Hosting topology.

1.3 אפשרות שאושרה: אפשרות B — Migration מלא ל־Vercel ול־Railway.

1.4 מועד אישור: `2026-08-17T05:17:48Z`.

1.5 המשמעות: בחירת הספקים נסגרה, אך האישור אינו מתיר Deployment
של הקוד הנוכחי. ‏Topology מפורטת, תקציב, Accounts, ‏Adapters,
Migration evidence ואישורי המימוש עדיין חייבים לעבור את תנאי סעיף 5.

## 2. הבעיה שצריך לפתור

2.1 תוכנית הצוות הציעה להתחיל עם Vercel ו־Railway.

2.2 ה־Repository הקיים בנוי בפועל כיישום React/Next.js מלא שרץ
באמצעות Vinext כ־Cloudflare Worker.

2.3 חוזי ה־Runtime הקיימים משתמשים ב־D1, ‏R2, שלושה Queues, שלושה
DLQs, ‏Cron, ‏Rate-limit bindings ו־Cloudflare deployment evidence.

2.4 לכן Vercel ו־Railway אינם שינוי כתובת פריסה בלבד. מעבר אליהם
דורש החלפה או התאמה של מסד הנתונים, Queues, ‏Workers, ‏Scheduler,
Storage, ‏Rate limiting, ‏Backup, ‏Observability ו־Release evidence.

## 3. החלופות

### 3.1 אפשרות A — Cloudflare מלא ל־Pilot

3.1.1 ה־UI, ‏Server Actions, ‏API, ‏Webhooks ו־Queue consumers נשארים
ב־Worker הקיים.

3.1.2 ‏D1 נשאר מקור הנתונים, R2 נשאר Object storage וה־Queues,
DLQs ו־Cron נשארים תחת אותה Topology.

3.1.3 יתרון: שימוש בקוד, בבדיקות, ב־Evidence ובגבולות האבטחה שכבר
קיימים.

3.1.4 חיסרון: נדרשים חשבון Cloudflare ארגוני, Members אישיים,
תקציב, משאבי Staging מבודדים ו־Evidence חי שעדיין אינם זמינים.

### 3.2 אפשרות B — Migration מלא ל־Vercel ול־Railway

3.2.1 ‏Vercel מארח את ה־UI בלבד.

3.2.2 ‏Railway מארח API ו־Workers נפרדים.

3.2.3 ‏PostgreSQL מחליף את D1; תשתית Queue חלופית מחליפה את
Cloudflare Queues; Storage, ‏Cron ו־Rate limiting מקבלים Adapters
חדשים.

3.2.4 יתרון: התאמה לדרישת הנהלה, אם זו דרישה מחייבת.

3.2.5 חיסרון: זהו פרויקט Migration שדורש תכנון, מימוש ובדיקת חוזי
Auth, ‏Data, ‏Concurrency, ‏Recovery, ‏Evidence ו־Release מחדש.

### 3.3 אפשרות C — Hybrid זמני

3.3.1 דוגמה: UI ב־Vercel, חלק מה־API ב־Railway ו־D1/Queues עדיין
ב־Cloudflare.

3.3.2 האפשרות אינה מומלצת. היא יוצרת כמה גבולות Auth, כמה מסלולי
Deployment ו־Failure modes שקשה לשחזר ולנטר לפני Pilot.

## 4. ההחלטה

4.1 נבחרה אפשרות B — Migration מלא ל־Vercel ול־Railway.

4.2 ‏Vercel יארח את שכבת ה־Web; ‏Railway יארח API ו־Worker כשני
שירותים נפרדים. אין לחבר את ה־Browser ישירות ל־Meta או למסד הנתונים.

4.3 Cloudflare נשאר בסיס המימוש הקיים ונקודת השוואה לבדיקות בלבד עד
השלמת ה־Migration. הוא אינו יעד ה־Production המאושר לאחר החלטה זו.

4.4 אפשרות C נדחית. אין להפעיל Hybrid לא מתועד או לפרוס חלקים
מהמערכת לפני שמפת הנתונים, ה־Queues, ה־Secrets וה־Rollback שלמה.

## 5. תנאי קבלה לפני Deployment או Cutover

5.1 רועי מאשר תקציב, Plans ובעלות חשבונות Vercel ו־Railway.

5.2 ראשה מאשרת שה־Deployment, ‏Rollback ו־Least-privilege access
ישימים ב־Topology שנבחרה.

5.3 דוד מאשר שה־Meta webhook, ‏API, ‏Queues ו־Schedulers נתמכים
ב־Topology שנבחרה.

5.4 אבטחה מאשרת הפרדת סביבות, Secret management, ‏Audit,
Backup/Restore ו־Incident access.

5.5 Architecture owner מתעד ADR המשך שמכריע PostgreSQL, ‏Queue,
DLQ, ‏Object storage, ‏Cron, ‏Rate limiting, ‏Secrets ו־Observability.

5.6 ‏Release checklist, ‏Runbook ו־Evidence generators תואמים לספק
שנבחר ואינם מניחים Topology אחרת.

5.7 Contract tests, ‏Migration rehearsal, ‏Load tests, ‏Backup/Restore,
Rollback ו־Staging smoke עוברים מול אותו Commit ואותו Artifact.

## 6. השלכות לאחר אישור

6.1 ראשה יכולה להתחיל Provisioning רק לאחר שסעיפים 5.1–5.5 הושלמו.
היא אינה מקבלת Token משותף; הגישה היא Membership אישי ו־Least
privilege בכל ספק.

6.2 אין לפרוס את הקוד הנוכחי ל־Vercel או ל־Railway כפתרון זמני.
נדרש למפות כל Binding קיים ל־Port ול־Adapter מאושר לפני Cutover.

6.3 בכל אפשרות, אין לשתף Deployment token. לכל חבר צוות נדרשת זהות
אישית והרשאת Least privilege.

6.4 תוכנית ה־Migration מחולקת לארבעה שלבים סגורים:

6.4.1 Contract freeze — מיפוי D1, ‏R2, ‏Queues, ‏DLQs, ‏Cron,
Rate limits, ‏Secrets ו־Evidence, ללא שינוי התנהגות עסקית.

6.4.2 Adapter parity — מימוש PostgreSQL, ‏Queue, ‏Storage,
Scheduler ו־Secret ports עם אותה סמנטיקת Idempotency ו־Fail-closed.

6.4.3 Isolated staging — פריסת Vercel UI ושירותי Railway מבודדים,
Migration rehearsal, ‏Load, ‏Recovery, ‏Observability ו־Security tests.

6.4.4 Controlled cutover — Backup אחרון, חלון שינוי, Smoke, ניטור,
Rollback מתורגל ורק לאחר מכן Pilot מוגבל.

## 7. אישורים

7.1 טל — החלטת הספקים: `approved` ב־`2026-08-17T05:17:48Z`.

7.2 רועי — תקציב, Plans וחשבונות: `unknown/unavailable`.

7.3 ראשה — Deployment ו־Rollback: `unknown/unavailable`.

7.4 דוד — API, ‏Meta, ‏Queues ו־Schedulers: `unknown/unavailable`.

7.5 אבטחה — בידוד, Secrets, ‏Backup ו־Incident access:
`unknown/unavailable`.

## 8. Evidence מקומי

8.1 [`vite.config.ts`](../../vite.config.ts) — Worker bindings,
Queues, ‏DLQs ו־Cron המקומיים.

8.2 [`package.json`](../../package.json) — Vinext, ‏Cloudflare Vite
Plugin ו־Wrangler.

8.3 [`source-control-and-release.md`](../source-control-and-release.md)
— חוזי ה־Evidence הקיימים והפער שיש להחליף לפני פריסת ה־Topology
המאושרת.

8.4 [`team-operating-plan.md`](../team-operating-plan.md) — בעלי
התפקידים, החלופות ושערי הקבלה.

8.5 Evidence של חשבון, Staging ו־Deployment חי:
`unknown/unavailable`.

8.6 [`hosting-migration-contract-freeze.md`](../hosting-migration-contract-freeze.md)
ו־`shared/domain/hostingMigrationRegistry.ts` — מיפוי דטרמיניסטי של
18 היכולות שחייבות Adapter, תצורה, החלטת ספק או Evidence חדש.

8.7 מצב Adapter parity המקומי: Foundation של 30 Adapters ו־Harness על
PostgreSQL 16.13 שעבר 18 Migrations ו־43 תרחישי Concurrency, לרבות מחזור
Draft/Version/Source-link/Publication של AI Agent וכן Cost/Usage/Audit/
Handoff ו־Reply approval outbox של AI Runtime, וכן Bot continuation ו־
Handoff אטומי. זו אינה ראיית Staging או
הרשאה ל־Cutover.
