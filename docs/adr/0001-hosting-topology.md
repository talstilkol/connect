---
id: ADR-0001
title: Hosting topology for Pilot
status: proposed
decision_owner: רועי
approved_option: unknown/unavailable
approved_at: unknown/unavailable
supersedes: none
---

# ADR-0001 — Hosting topology for Pilot

## 1. מצב ההחלטה

1.1 סטטוס: `proposed`.

1.2 בעל ההחלטה: רועי — Accounts, תקציב ו־Hosting topology.

1.3 אפשרות שאושרה: `unknown/unavailable`.

1.4 מועד אישור: `unknown/unavailable`.

1.5 המשמעות: המסמך מכיל המלצה בלבד. הוא אינו מתיר Deployment ואינו
מסמן את Gate 0 כ־`verified`.

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

## 4. ההמלצה

4.1 לבחור באפשרות A — Cloudflare מלא ל־Pilot.

4.2 הסיבה היא יחס סיכון־זמן: זו האפשרות היחידה שמשתמשת בארכיטקטורה
ובבדיקות הקיימות בלי Migration לפני שנאסף Pilot evidence.

4.3 אם הנהלה מחייבת Vercel ו־Railway, יש לבחור באפשרות B במפורש,
לעצור Deployment ולפתוח תוכנית Migration נפרדת. אין לאשר אפשרות C.

## 5. תנאי קבלה לפני שינוי ל־accepted

5.1 רועי בוחר במפורש אפשרות A או B ומאשר תקציב ובעלות חשבונות.

5.2 ראשה מאשרת שה־Deployment, ‏Rollback ו־Least-privilege access
ישימים ב־Topology שנבחרה.

5.3 דוד מאשר שה־Meta webhook, ‏API, ‏Queues ו־Schedulers נתמכים
ב־Topology שנבחרה.

5.4 אבטחה מאשרת הפרדת סביבות, Secret management, ‏Audit,
Backup/Restore ו־Incident access.

5.5 שמות המאשרים, האפשרות שנבחרה ומועד UTC קנוני נכתבים במסמך.

5.6 ‏Release checklist, ‏Runbook ו־Evidence generators תואמים לספק
שנבחר ואינם מניחים Topology אחרת.

## 6. השלכות לאחר אישור

6.1 אם אפשרות A מתקבלת, ראשה יכולה להתחיל Provisioning של Staging
מבודד ב־Cloudflare לפי ה־Release runbook.

6.2 אם אפשרות B מתקבלת, אין לפרוס את הקוד הנוכחי כפתרון זמני.
נדרש ADR נוסף לתוכנית ה־Migration ולמיפוי כל Binding למחליף מאושר.

6.3 בכל אפשרות, אין לשתף Deployment token. לכל חבר צוות נדרשת זהות
אישית והרשאת Least privilege.

## 7. אישורים

7.1 רועי — `unknown/unavailable`.

7.2 ראשה — `unknown/unavailable`.

7.3 דוד — `unknown/unavailable`.

7.4 אבטחה — `unknown/unavailable`.

## 8. Evidence מקומי

8.1 [`vite.config.ts`](../../vite.config.ts) — Worker bindings,
Queues, ‏DLQs ו־Cron המקומיים.

8.2 [`package.json`](../../package.json) — Vinext, ‏Cloudflare Vite
Plugin ו־Wrangler.

8.3 [`source-control-and-release.md`](../source-control-and-release.md)
— חוזי Cloudflare Evidence והאיסור לראות ב־Vercel/Railway ספק מאושר
לפני ADR.

8.4 [`team-operating-plan.md`](../team-operating-plan.md) — בעלי
התפקידים, החלופות ושערי הקבלה.

8.5 Evidence של חשבון, Staging ו־Deployment חי:
`unknown/unavailable`.
