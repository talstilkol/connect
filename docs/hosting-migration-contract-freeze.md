# Contract freeze ל־Vercel ול־Railway

תאריך מיפוי: 2026-08-19

## 1. מטרה

1.1 המסמך מקבע את כל היכולות שתלויות כיום ב־Cloudflare לפני שינוי
קוד. מקור האמת ה־Machine-readable הוא
`shared/domain/hostingMigrationRegistry.ts`.

1.2 ‏Contract freeze אינו Migration ואינו Deployment. הוא מונע מצב
שבו מחליפים את ה־Web runtime ושוכחים Database, ‏Queue, ‏DLQ,
Scheduler, ‏Rate limit, ‏Evidence או Recovery.

1.3 הרשימה כוללת 19 יכולות: תשע מהן כבר קיבלו ספק/מיקום יעד ברמת
Vercel/Railway, ועשר עדיין דורשות בחירת ספק משותף. אף יכולת אינה
`ready` ל־Cutover.

## 2. מפת היכולות

| מזהה | היום | יעד | הצעד הבא |
| --- | --- | --- | --- |
| `web.build-runtime` | Vinext + Cloudflare Vite/Sites נשאר ברירת המחדל | Vercel Web | ‏`build:vercel` מפיק Next.js 16 Production build מקומי ללא הורדת Fonts. ‏Cloudflare virtual bindings מוחלפים ב־Environment ריק וקפוא ולכן מסלולים ישנים נכשלים סגור. חסרים Project config, ערכי Environment, ‏Preview, ‏Route smoke והעברת יתר המסלולים. |
| `web.server-api-boundary` | Web ו־Business services באותו Worker | Vercel Web מול Railway API | החוזה המקומי כולל Authenticated API ו־PostgreSQL foundation של 54 Adapters. מסלולי Onboarding business profile, ‏Tenant selection עם מזהים אטומים, ‏Team directory/membership/invitation request/invitation acceptance, ‏System Admin WhatsApp policy read/approve/kill switch, ‏Bot-reply staging run והרשאת Staging שרק Tal רשאי לאשר, ‏Contacts, ‏Conversations, ‏Templates, ארבע פעולות Bot flow, ‏Campaign directory/snapshot/activation, ‏AI Agent directory/details/draft/publish ו־AI reply approval list/decide עוברים ללא D1 fallback; שמירת Onboarding כוללת יצירת Tenant/Owner/Profile, מכסה, Receipt ו־Audit אטומיים. קבלת הזמנה פותרת Primary Email מאומת מול Clerk בצד Railway ואינה מקבלת Email מהדפדפן. ‏`templates.submit` כולל Receipt, ‏Audit, ‏Outbox ו־Transition events אטומיים. Worker מבצע לכל היותר Meta POST אחד; תוצאה לא ידועה עוברת ל־GET-only reconciliation. ‏Railway BullMQ API executable מחבר את Bot-reply staging רק ב־Staging, מאחורי Opt-in, Tenant וזהות Tal הנמצאת ב־System Admin allowlist, ונכשל לפני Connections בתצורה חלקית. Cross-service checker תחום דורש שגם ה־Worker עבר Preflight וששני השירותים משתמשים באותו Tenant ובאותה סביבת Staging. Migration 0026, מחזור ה־Outbox ומסלולי ה־Onboarding, בחירת ה־Tenant, הצוות, השיחות, הבוט, הקמפיין, AI Agents ואישורי תשובות AI הוכחו מול PostgreSQL 16.13 מקומי. ה־Maintenance cycle מחובר ללולאת ה־Worker המקומית, אך נותרו ראיית Clerk/Browser חיה לקבלת הזמנה, יתר Route wiring, ערכי Pool/Rate-limit, ‏Export/Recovery וראיות Staging. |
| `web.static-assets` | `ASSETS` | Vercel Web | תצורת Assets |
| `web.image-optimization` | `IMAGES` | Vercel Web | Adapter ובדיקות גבול |
| `api.meta-webhook-ingress` | Worker route | Railway API | Route Node חתום ומוגבל, PostgreSQL WABA lookup, מכסה משותפת ו־BullMQ Publisher הושלמו מקומית. Better Stack OTLP Logs מחובר עם Redaction מבני ו־Flush בסגירה. ללא Secrets, ערכי Policy, Source חי, Load ו־Staging route אינו מוכן ל־Cutover. |
| `data.relational-database` | D1/SQLite | Railway PostgreSQL ל־Pilot | ‏Foundation של 54 Adapters ו־Registry של 40 Migrations, מהן שתים־עשרה Railway-only. חוזי ה־Harness כוללים את כל 40 ה־Migrations עד 0039; ראיית Loopback חיה עברה מול PostgreSQL 16.13 עבור 40 migrations ו־87 תרחישי concurrency, כולל Provider-request fence בלתי־משתנה, Duplicate observation המוכיח בקשת Provider יחידה ו־Kill-switch observation המוכיח אפס בקשות ואפס Acceptances בזמן Policy מושבת. ‏Graph reader קונקרטי מחובר ל־Meta connection ול־Credential envelope של אותו Railway Worker ומאמת App, ‏Portfolio, ‏WABA, ‏Phone ו־Throughput בלי להוציא Provider IDs ל־Evidence. גם Security/Telemetry reader נטען מאותו Foundation, מאמת מעטפת Credential מוצפנת ו־Better Stack evidence הקשור ל־Release ולחלון ה־Run, בלי להוציא Token, ‏Ciphertext או Telemetry payload. ‏Kill-switch קונקרטי דורש Tenant, ‏Connection version ו־Policy version מדויקים וכותב גרסת `disabled` עוקבת ואטומית מאותו Foundation. Ledger הרשאת ה־Staging חושף כעת גם קריאת אירוע אחרון ו־Operation עמיד: רק Tal יכול לאשר ומנהל גיבוי יכול רק לבטל תוך העתקה מדויקת של הראיה הקודמת. ‏Data migration ו־Semantic parity ממופים לכל 55 טבלאות D1. נדרשת עדיין חזרה חיה עם Export מורשה ועדכני בן 55 טבלאות; בנוסף נותרו Plan, ‏Region, ערכי Pool חיים, ‏PITR, ‏Export/Restore מבוקרים וראיות Staging. |
| `data.object-storage` | R2 | Object storage | בחירת ספק ו־Adapter |
| `queue.meta-webhook` | Cloudflare Queue + DLQ | Railway Redis + BullMQ Worker | ‏BullMQ adapter מקומי הושלם עם Payload קנוני, Job ID דטרמיניסטי, 10 Retries, ‏DLQ וחיבור API/Worker. בדיקות Redis אמיתיות הוכיחו שחזור בתים ודדופליקציה; תרגיל Crash משותף הוכיח מקומית AOF `everysec`, ‏`noeviction`, כשל Publisher בזמן השבתה, שחזור עבודה ו־500/500 עבודות. נדרשים Secrets/Policy, ‏Telemetry provider וראיית Durability/Load מורשית מ־Railway Staging. |
| `queue.campaign-delivery` | Cloudflare Queue + DLQ | Railway Redis + BullMQ Worker | ‏BullMQ v5 adapter מקומי הושלם עם Batch של 10, ‏Job ID דטרמיניסטי, Retry דינמי עד 24 שעות ללא Jitter, ‏DLQ/Retention, שמירת Ambiguous ללא שליחה חוזרת וחיבור ל־PostgreSQL/Meta/Rate-limit consumer. מקור Retry תחום לקודי Meta ‏130429/131049/131056 ופקודת Start מקומית מחוברים. בדיקות Redis אמיתיות הוכיחו Delay/Ack; תרגיל Crash משותף הוכיח מקומית AOF `everysec`, ‏`noeviction`, כשל Publisher בזמן השבתה, שחזור עבודה ו־500/500 עבודות. נדרשים אימות מול Meta חי, ערכי Retention, ‏Telemetry provider וראיית Durability/Load מורשית מ־Railway Staging. |
| `queue.team-invitation` | Cloudflare Queue + DLQ | Railway Redis + BullMQ Worker | ‏BullMQ adapter מקומי הושלם עם Delivery key דטרמיניסטי, 10 Retries, ‏Delay תחום של 1–86,400 שניות, DLQ וחיבור API/PostgreSQL Worker. Clerk Organization adapter, ‏shared PostgreSQL guard ופקודת Start fail-closed מחוברים. ‏Clerk 429 תקין נשמר כ־Deferral עמיד לפני שחרור Claim; Replay מוקדם אינו פונה לספק וערך חסר או פגום אינו מומצא. בדיקות Redis אמיתיות הוכיחו Delivery יחיד ודדופליקציה; תרגיל Crash משותף הוכיח מקומית AOF `everysec`, ‏`noeviction`, כשל Publisher בזמן השבתה, שחזור עבודה ו־500/500 עבודות. נדרשים חשבון Clerk חי, ראיית 429 חיה, ‏Telemetry provider וראיית Durability/Load מורשית מ־Railway Staging. |
| `queue.message-template-submission` | חוזה חדש ללא ספק | Railway Redis + BullMQ Worker | ‏Message, ‏Consumer, ‏single-POST worker, Relay תחום, ‏GET-only reconciliation, חיבור Scheduler, ‏Telemetry ללא זהויות, חוזה קבלה ו־Verifier הושלמו. ‏BullMQ v5 Publisher/Worker adapter עם Job ID דטרמיניסטי, 10 Retries, ‏Delay של 30 שניות, DLQ, ‏Retention cleanup וחיבור Railway-private נכשל־סגור הושלם ונבדק מול Redis מקומי אמיתי. ‏Provider-bound composition ופקודת Start מרימים את כל ארבעת התורים לפני Scheduler, מנקים DLQ ב־Maintenance ומנקזים Queue לפני סגירת PostgreSQL. תרגיל Crash משותף הוכיח מקומית AOF `everysec`, ‏`noeviction`, כשל Publisher בזמן השבתה, שחזור עבודה ו־500/500 עבודות. נדרשים ערכי Retention מאושרים, ‏Telemetry provider חי וראיית Durability/Load מורשית מ־Railway Staging. |
| `worker.scheduler` | Cloudflare Cron של דקה | Railway Worker קבוע | Lease אטומי, Fencing, ‏Catch-up של עד חמישה Ticks, ‏Timer מיושר לדקה, מניעת overlap, ‏Signal shutdown, ‏Composition של Campaign/Invitation ושל Maintenance cycles, ‏Bootstrap שנכשל סגור ו־Executable composition root הושלמו. תהליך Provider-bound יחיד ופקודת Package מחזיקים את ארבעת תורי BullMQ הבסיסיים ומנקים את ה־DLQ תחת ה־Lease. Queue חמישי של Bot-reply staging מחובר רק עם Opt-in מפורש ולאחר Activation preflight משותף ל־CLI ול־Main הבודק שבעה גבולות בלי לחשוף ערכים. טיפול Clerk ‏429/Retry-After הושלם מקומית עם Evidence עמיד; נותרו ערכים חיים, ראיית 429 חיה, ‏Telemetry provider, תצורת Railway וראיית Staging. ‏Railway Cron אינו מתאים. |
| `security.distributed-rate-limits` | Cloudflare bindings + D1 ledger | Shared service | חוזה PostgreSQL token bucket אטומי ומבודד הושלם עבור Tenant mutation, ‏System Admin mutation ו־Meta webhook; שלושתם מחוברים מקומית ל־Railway composition. נותרו ערכי Policy חיים, Telemetry, ‏Load evidence וראיית Staging |
| `security.secret-management` | Worker secrets | Vercel + Railway | Inventory, חלוקה ו־Rotation |
| `operations.environment-isolation-evidence` | Cloudflare evidence v2 | Vercel + Railway | Evidence חדש רב־ספקי |
| `operations.deployment-provenance-evidence` | Cloudflare deployment | Vercel + שני שירותי Railway | Provenance משותף ל־Release |
| `operations.backup-restore` | D1/R2 evidence | PostgreSQL + Storage | בחירת PITR, אזור ו־Restore |
| `operations.browser-database-proof` | Cloudflare D1 API | PostgreSQL read-only | Proof adapter חדש |
| `operations.observability` | המלצת Workers logs/traces | Better Stack + OpenTelemetry מ־Vercel/Railway | ‏Railway Worker, ‏Railway API ו־Vercel Web OTLP Logs adapters, ‏Redaction מבני, Batch ו־Lifecycle-aware Flush הושלמו מקומית. נתיב Vercel–Railway API מפיק Root/Child Spans ושני Metrics תחומים. ה־Worker מפיק Root Spans לאירועים מדודים וארבעה Metrics תחומים לארבעת התורים הבסיסיים וגם ל־Queue ה־Staging כאשר הוא מופעל במפורש; להזמנות צוות ולהגשת Templates יש Delivery spans, ו־Meta template POST מקבל Child span עם זמן HTTP אמיתי. הכול ללא זהויות ועם Fail-closed ב־Hosted environments. חסרים Child spans לקמפיינים, Reconciliation ו־Clerk, ‏Source חי, ‏Retention, ‏Alert channel, תקציב וראיית Staging. |

הערת Evidence ל־`web.server-api-boundary`: דוח ה־Cross-service נקשר כעת
ל־Release, ‏Commit ו־Artifact באמצעות Evidence קצר־חיים של 60–900 שניות.
הוא אינו מחליף Railway orchestration חי ומורשה או Evidence מספק
ה־WhatsApp. ‏Issuer דו־שלבי מונע הנפקה כאשר זהות ה־Release משתנה בזמן
הבדיקה. ‏Publisher ספק־נייטרלי דורש Compare-and-set ו־Read-after-write,
אך Railway adapter חי עדיין אינו מחובר. ‏ADR-0005 מציע PostgreSQL
transactional row כמקור האמת משום ש־Railway Variables דורשים Deployment
ואינם מספקים CAS מתועד; ההחלטה עדיין `proposed`.

## 3. סדר ביצוע מחייב

3.1 שלב A — סגירת החלטות ותצורות ספקים, 4–8 שעות עבודה נטו לאחר
קבלת תקציב ו־Accounts: Railway PostgreSQL ו־Redis/BullMQ נבחרו
ל־Pilot, Better Stack/OpenTelemetry נבחרו ל־Observability ו־Rate
limit רב־שכבתי נבחר. עדיין פתוחים Object storage, תצורות חיות,
תקציב, Backup evidence ואישורי Security/Operations.

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

3.4 שלב D — ארבעת ה־Queues, ‏DLQs, ‏Delays, ‏Consumers ו־Scheduler,
20–40 שעות.

3.4.1 טל בחר את כיוון Redis + BullMQ לתורים ו־Railway Worker קבוע
ל־Scheduler ב־[ADR-0004](adr/0004-target-service-topology.md).
Railway Cron אינו יכול להחליף את ה־Cron הנוכחי משום שהתדירות
המינימלית שלו היא חמש דקות ואינה מדויקת לדקה. ה־ADR נשאר `proposed`
עד אישורי תקציב, Deployment, Backend ו־Security המנויים בו.

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

4.1 כל 19 הרשומות נשארות ב־Registry עד שיש להן Adapter או תצורה,
בדיקת Contract, בעלים וראיית Staging.

4.2 אין למחוק D1/R2/Queue implementation לפני Export, ‏Rehearsal
ו־Rollback שנבדקו מול נתונים מורשים בסביבה מבודדת.

4.3 אין לסמן את יעד ה־Production כ־Ready על בסיס Build של Vercel או
Health check של Railway בלבד.
