# Contract freeze ל־Vercel ול־Railway

תאריך מיפוי: 2026-08-17

## 1. מטרה

1.1 המסמך מקבע את כל היכולות שתלויות כיום ב־Cloudflare לפני שינוי
קוד. מקור האמת ה־Machine-readable הוא
`shared/domain/hostingMigrationRegistry.ts`.

1.2 ‏Contract freeze אינו Migration ואינו Deployment. הוא מונע מצב
שבו מחליפים את ה־Web runtime ושוכחים Database, ‏Queue, ‏DLQ,
Scheduler, ‏Rate limit, ‏Evidence או Recovery.

1.3 הרשימה כוללת 18 יכולות: תשע מהן כבר קיבלו ספק/מיקום יעד ברמת
Vercel/Railway, ותשע עדיין דורשות בחירת ספק משותף. אף יכולת אינה
`ready` ל־Cutover.

## 2. מפת היכולות

| מזהה | היום | יעד | הצעד הבא |
| --- | --- | --- | --- |
| `web.build-runtime` | Vinext + Cloudflare Vite/Sites | Vercel Web | החלפת Build/runtime |
| `web.server-api-boundary` | Web ו־Business services באותו Worker | Vercel Web מול Railway API | Authenticated runtime, שלוש קריאות, Mutation מאובטח, PostgreSQL `contacts.list`, ‏Contact organization/import אטומי, ‏Conversation/Message inbox אטומי, ‏Bot Flow version/publication ו־Reply Delivery אטומיים, ‏Knowledge Source/Passage אטומיים, ‏AI Agent draft/version/source-link/publication ו־AI Runtime cost/audit/handoff אטומיים, ‏Meta connection/webhook/credential ports, ‏WhatsApp delivery-policy evidence עם Kill switch ו־Reservation/Settlement/Cooldown ledger אטומי, ‏Message Template lifecycle, ‏Campaign snapshot ו־Dispatch אטומיים, ‏Adapter חד־שאילתי ל־`reports.read`, ‏Foundation של 28 Adapters, ‏Runtime composition, ‏Node HTTP, ‏Health, ‏Shutdown owner, ‏`PORT` ו־Signals הושלמו; מסלול HTTP מלא של הדוח נבדק מול PostgreSQL אמיתי. Bootstrap executable נשאר חסום עד Rate-limit adapter מבוזר; נותרו גם Live pool values, ‏Parity מלאה, יתר ה־Mutations ו־Staging evidence |
| `web.static-assets` | `ASSETS` | Vercel Web | תצורת Assets |
| `web.image-optimization` | `IMAGES` | Vercel Web | Adapter ובדיקות גבול |
| `api.meta-webhook-ingress` | Worker route | Railway API | Route חתום, מוגבל ועמיד |
| `data.relational-database` | D1/SQLite | PostgreSQL | Transaction executor, ‏Node driver, חוזה Pool מאובטח, ‏Foundation של 28 Adapters, ‏Readiness query ו־Runtime בעל סגירה מסודרת; Harness אמיתי עבר עם 17 Migrations, ‏Contact organization/import services, כתיבת Contact ותוצאת Import אטומית, ‏Conversation/Message inbox עם Idempotency ו־Optimistic locking, ‏Bot Flow ו־Reply Delivery State machines, ‏Knowledge Source/Passage lifecycle אטומי, ‏AI Agent draft/version/source-link/publication ו־AI Runtime cost/audit/handoff אטומיים, ‏Meta connection/Webhook receipts/Credential envelopes, ‏WhatsApp delivery-policy, ‏Reservation/Settlement/Cooldown evidence, ‏Worker scheduler lease, ‏Message Template lifecycle, ‏Campaign snapshot ו־Dispatch, דוח HTTP מלא, ‏Contact/Conversation/Message/Template/Campaign/Bot/AI DML ו־40 תרחישי Concurrency. נותרו ספק וערכי Pool חיים, יתר ה־Repositories, ‏Parity מלאה מול 36 Migrations וראיות Staging |
| `data.object-storage` | R2 | Object storage | בחירת ספק ו־Adapter |
| `queue.meta-webhook` | Cloudflare Queue + DLQ | Railway Worker | בחירת Queue/DLQ |
| `queue.campaign-delivery` | Cloudflare Queue + DLQ | Railway Worker | בחירת Queue/DLQ/Delay |
| `queue.team-invitation` | Cloudflare Queue + DLQ | Railway Worker | בחירת Queue/DLQ |
| `worker.scheduler` | Cloudflare Cron של דקה | Railway Worker קבוע | Lease אטומי, Fencing, ‏Catch-up של עד חמישה Ticks, ‏Timer מיושר לדקה, מניעת overlap, ‏Signal shutdown ו־Composition של Campaign/Invitation על PostgreSQL הושלמו ונבדקו; נותרו Queue adapter, ‏Bootstrap חי ותצורת Railway. ‏Railway Cron אינו מתאים |
| `security.distributed-rate-limits` | Cloudflare bindings + D1 ledger | Shared service | בחירת מנגנון אטומי |
| `security.secret-management` | Worker secrets | Vercel + Railway | Inventory, חלוקה ו־Rotation |
| `operations.environment-isolation-evidence` | Cloudflare evidence v2 | Vercel + Railway | Evidence חדש רב־ספקי |
| `operations.deployment-provenance-evidence` | Cloudflare deployment | Vercel + שני שירותי Railway | Provenance משותף ל־Release |
| `operations.backup-restore` | D1/R2 evidence | PostgreSQL + Storage | בחירת PITR, אזור ו־Restore |
| `operations.browser-database-proof` | Cloudflare D1 API | PostgreSQL read-only | Proof adapter חדש |
| `operations.observability` | המלצת Workers logs/traces | Vercel + Railway | בחירת Sink ו־Alert provider |

## 3. סדר ביצוע מחייב

3.1 שלב A — החלטות ספקים משותפים, 4–8 שעות עבודה נטו לאחר קבלת
תקציב ו־Accounts: PostgreSQL, ‏Queue/DLQ, ‏Object storage, ‏Rate
limit, ‏Monitoring ו־Backup.

3.2 שלב B — Web build וגבול Vercel/Railway API, ‏20–40 שעות.

3.2.1 החוזה המקומי הראשון הושלם ומתועד ב־
[חוזה API בין Vercel ל־Railway](vercel-railway-api-contract.md). הוא
מפריד בין Vercel OIDC לבין Clerk session, מגביל Payload/Response
ונכשל סגור מול Preview identity, ‏Origin זדוני ושדות רגישים. הוא אינו
Endpoint חי ואינו משנה את חסם ה־Deployment. ה־Cryptographic adapters
ושלוש פעולות Read-only חוברו ל־Runtime מקומי, אך ללא Accounts,
PostgreSQL adapters ו־Evidence הם אינם מוכיחים תצורת Production.

3.3 שלב C — PostgreSQL schema, ‏Repositories, טרנזקציות ו־Migration
rehearsal, ‏40–80 שעות.

3.4 שלב D — שלושת ה־Queues, ‏DLQs, ‏Delays, ‏Consumers ו־Scheduler,
20–40 שעות.

3.4.1 ‏[ADR-0004](adr/0004-target-service-topology.md) מציע Redis +
BullMQ לתורים ו־Railway Worker קבוע ל־Scheduler. Railway Cron אינו
יכול להחליף את ה־Cron הנוכחי משום שהתדירות המינימלית שלו היא חמש
דקות ואינה מדויקת לדקה. ההצעה נשארת `proposed` עד האישורים המנויים
ב־ADR.

3.5 שלב E — Object storage, ‏Scanner path ו־Browser proof,
12–24 שעות.

3.6 שלב F — Distributed rate limits, ‏Reservation ledger ו־Load
tests, ‏16–32 שעות.

3.7 שלב G — Secrets, ‏Observability, ‏Backup/Restore ושני מחוללי
Evidence, ‏20–40 שעות.

3.8 שלב H — Staging, ‏Security/Load/Recovery, ‏Cutover ו־Rollback,
24–48 שעות.

3.9 סך תכנוני: **156–312 שעות פיתוח ואימות נטו** לאחר החלטות
הספקים. זהו טווח ראשוני ל־Migration החדש ואינו כולל זמני אישור,
פתיחת חשבונות, Review או המתנה לספקים.

## 4. תנאי יציאה מ־Contract freeze

4.1 כל 18 הרשומות נשארות ב־Registry עד שיש להן Adapter או תצורה,
בדיקת Contract, בעלים וראיית Staging.

4.2 אין למחוק D1/R2/Queue implementation לפני Export, ‏Rehearsal
ו־Rollback שנבדקו מול נתונים מורשים בסביבה מבודדת.

4.3 אין לסמן את יעד ה־Production כ־Ready על בסיס Build של Vercel או
Health check של Railway בלבד.
