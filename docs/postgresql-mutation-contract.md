# חוזה PostgreSQL ל־Railway Mutations

## 1. מטרה ומצב

1.1 מסמך זה מקפיא את החוזה המקומי של `contacts.save` בין Railway API
לבין PostgreSQL. ‏`node-postgres` נבחר כ־Node driver המקומי; ספק Database,
‏Plan, ‏Region ותצורת Pool ל־Production עדיין לא נבחרו.

1.2 מימוש ספק־נייטרלי קיים ב־
`server/platform/postgresRailwayApiMutationExecutor.ts`. הוא מקבל
`PostgresTransactionManager`. ה־Adapter ב־`nodePostgresAdapter.ts` מחבר אליו
`pg@8.23.0` בלי לשנות את כללי ה־Use case.

1.3 התיקייה `postgres/migrations` מכילה כעת 16 Migrations מסודרות עבור
ה־Critical Path בלבד: הראשונה יוצרת `tenants`, ‏`audit_logs` ו־`contacts`,
השנייה יוצרת את `railway_api_mutation_receipts`, השלישית את Tenant access
foundation, הרביעית את Membership event ledger והחמישית את Team invitation
lifecycle. השישית יוצרת `conversations` ו־`messages`, והשביעית את
`message_templates` ו־`campaigns`. השמינית יוצרת Bot flows, גרסאות ו־
Deliveries. התשיעית יוצרת AI agents, גרסאות, הרשאות עלות, Usage ו־Audit
הדרושים לדוח התפעולי. העשירית יוצרת Tags, ‏Lists, שיוכי Contact ו־Import
jobs/rows עם בידוד Tenant מורכב. האחת־עשרה יוצרת Meta connections, ‏Webhook
receipts ו־Credential envelopes מוצפנים. השתים־עשרה יוצרת Ledger בלתי־ניתן
לשינוי עבור WhatsApp delivery policy, ‏Audit אטומי ו־Kill switch. השלוש־עשרה
יוצרת WhatsApp reservation, settlement ו־provider-cooldown ledger אטומי.
הרבע־עשרה מוסיפה אכיפת Phone throughput מתגלגלת הקשורה ל־Policy המאושר,
החמש־עשרה מוסיפה Lease מגודר ל־Railway Worker scheduler, והשש־עשרה מוסיפה
את `campaign_recipients` עבור Dispatch מקביל ובטוח. השרשרת הוחלה
בהצלחה על PostgreSQL 16.13 מקומי ומבודד, אך אינה מוכיחה עדיין Parity עם
כל 36 ה־Migrations של D1 או מוכנות לפריסה.

1.4 תסריט `verify:node-postgres-integration` מקים את החוזה רק מול Database
Loopback ייעודי וריק. הוא החיל את 16 ה־Migrations על PostgreSQL 16.13,
הפעיל DML אמיתי והוכיח 17 תרחישי Concurrency. הוא אינו מקבל URL מרוחק,
Credentials ב־URL או שם Database שאינו `connect_driver_integration`.

1.5 ‏`nodePostgresPoolConfiguration.ts` מקפיא חוזה Production ללא Defaults:
TLS מאומת, Pool size, שבעה Timeouts/lifetime ו־Application name מפורשים.
הערכים החיים נשארים `unknown/unavailable` עד בחירת ספק ו־Environment.

1.6 ‏`railwayPostgresFoundation.ts` מחבר מאותו Pool את כל 21 ה־Adapters
שהושלמו. הוא אינו חושף את ה־Pool או ה־Connection string, ואינו יוצר Runtime
היברידי בפני עצמו. חיבור ה־Foundation ל־Routes מחייב שכל Operation מחובר
לקבוצת PostgreSQL מלאה; אין לבצע Fallback שקט ל־D1.

1.7 ‏`postgresContactReadRepository.ts` מממש את `contacts.list` עם סינון
Tenant מחייב, Keyset pagination לפי `id`, מגבלת עמוד של 100 ואימות מבנה,
Consent וסדר התוצאות לפני החזרתן לשכבה העסקית. ה־Harness האמיתי מאמת גם
קריאה זו דרך ה־Foundation.

1.8 ‏`postgresOperationalReportRepository.ts` מממש את `reports.read` בשאילתת
PostgreSQL יחידה, כדי שכל ששת ה־Aggregates ייקראו מאותו Statement snapshot.
הוא מאמת 35 שדות, סכומי קטגוריות, סדר מטבעות ומספרים בטווח JavaScript בטוח.
Conversations, ‏Messages, ‏Campaigns, ‏Bot deliveries, ‏AI audit ו־AI usage
נוספו ונבדקו. ה־Harness קרא בפועל דוח מלא מכל ששת מקורות הנתונים ולכן מסלול
הקריאה של הדוח מוכח מקומית. אין בכך הוכחת Staging או Parity לכל 35
ה־Migrations.

1.9 ‏`railwayPostgresApiRuntime.ts` מחבר את ה־Foundation ל־HTTP Runtime
המאומת ומחזיר רק Handler ופעולת `close` Idempotent. תצורת הזהות ותצורת מסד
הנתונים נשארות אובייקטים נפרדים כדי למנוע העברת Credential ל־Adapter הלא
נכון. ה־Harness הפעיל `reports.read` דרך Vercel OIDC, ‏Clerk, ‏Tenant
resolution והרשאה מול PostgreSQL אמיתי, ואימת שהתגובה אינה חושפת Tenant,
User או Connection data. שכבת Node HTTP ו־Service lifecycle מתועדת בסעיף
הבא; Startup executable עדיין אינו מחובר.

1.10 ‏`postgresReadinessProbe.ts` מבצע רק `SELECT 1::integer AS ready`, דורש
שורה ושדה מדויקים ומחזיר `unavailable` בלי Error פנימי בכל כשל. ‏Node HTTP
adapter מוסיף Routes קשיחים ל־Liveness, ‏Readiness ו־API, מגביל Headers,
Timeouts ו־Request target, ואינו סומך על Host שסיפק הלקוח. ‏Service owner
עוצר תחילה קבלת HTTP ורק אחר כך סוגר את PostgreSQL runtime, ומנסה את שתי
השכבות גם במקרה כשל. בשלב זה נותר לחבר Process signals ו־Rate-limit provider
אמיתי; Signal lifecycle הושלם בסעיף הבא.

1.11 ‏`railwayNodeProcess.ts` מקבל רק `PORT` עשרוני קנוני בטווח 1–65535,
מתקין `SIGINT` ו־`SIGTERM` רק לאחר Start מוצלח, ומסיר גם Wiring חלקי אם
רישום Signal נכשל. כל Signal עובר באותו Close Idempotent; כשל Shutdown מסמן
את התהליך בלי לחשוף פרטי Runtime. ‏Startup executable עדיין חסום בכוונה:
אין לחבר את `contacts.save` לפני בחירת Distributed rate limiter והזרקתו
ל־Runtime.

1.12 ‏`0009_contact_organization_imports.sql` מוסיף שש טבלאות עבור ארגון
אנשי קשר וייבוא מתחדש. ה־Foreign Keys כוללים `tenant_id`, וה־Harness חסם
בפועל שיוך Tag ושורת Import שחצו Tenant. מוני Job, מצב Completion ותוצאת כל
שורה נאכפים ב־Constraints. ה־Schema הוכח מקומית, וה־Adapters המקבילים ל־D1
מחוברים כמתואר בסעיפים 1.13–1.14.

1.13 ‏`postgresContactOrganizationRepository.ts` מחובר ל־Service בתוך
ה־Foundation. הוא קורא Counts ושיוכים רק מתוך Tenant scope, ודורש Contact
ו־Tag/List מאותו Tenant בתוך Statement הכתיבה עצמו. ה־Harness הוכיח Create
ו־Assign דרך RBAC מול PostgreSQL אמיתי.

1.14 ‏`postgresContactImportRepository.ts` מחובר ל־Contact import service
בתוך ה־Foundation. Contact ותוצאת Row מאושרת נכתבים באותה Transaction;
ה־Status נגזר מהמצב הנעול במסד ולא מ־Hint של ה־Caller. ‏Replay זהה הוא
Idempotent, תוצאה סותרת נכשלת סגור, ומונים מחושבים מחדש מתוך אותו Tenant.
ה־Harness הוכיח Import מלא ו־Race שבו שתי בקשות זהות יצרו Contact יחיד
ותוצאת Import יחידה.

1.15 ‏`0010_meta_connection_credentials.sql` מוסיף שלוש טבלאות Meta.
‏`postgresMetaRepository.ts` מממש Asset snapshot ומעברי Connection בתוך
Transaction, וכן Claim/Complete/Fail אטומיים ל־Webhook receipts. Receipt קשור
ב־Foreign Key מורכב ל־Tenant ול־WABA, ו־Replay סותר נכשל סגור.
‏`postgresMetaCredentialRepository.ts` שומר רק Encrypted envelope ומאמת
Tenant, ‏Base64 ו־Write result. ה־Foundation אינו יוצר Credential vault ללא
מפתח Environment אמיתי.

1.16 ‏`0011_whatsapp_delivery_policy.sql` ו־
`postgresWhatsappCampaignDeliveryPolicyRepository.ts` ממירים את Evidence
המאפשר שליחת WhatsApp. ה־Repository נועל את חיבור Meta, מתקדם בגרסה עוקבת,
מזהה Replay ו־Conflict, וכותב Policy ו־Audit באותה Transaction. ‏Policy פעיל
דורש Connection פעיל ו־Evidence בתוקף; Kill switch רשאי רק לשכפל את אותו
Snapshot ולשנות את המצב ל־`disabled`. אירועים קיימים אינם ניתנים לעדכון או
למחיקה. אין בכך חיבור ל־Provider sender חי.

1.17 ‏`0012_whatsapp_rate_limit_ledger.sql` ו־
`postgresWhatsappRateLimitRepository.ts` ממירים Reservation, ‏Settlement
ו־Provider cooldown. ‏Pair ו־Portfolio scopes ננעלים באותה Transaction;
State נגזר רק מ־Evidence תואם, ו־Reservation/Settlement/Cooldown events הם
Immutable. ‏Replay, ‏Collision וכל Blocker מוחזרים כתוצאה תחומה.

1.18 ‏`0013_whatsapp_phone_throughput.sql` מוסיף לתוכנית השליחה ערך Meta
מפורש ותקרת Outbound קטנה ממנו. ‏Reservation ננעל לפי Sender אטום, נספר
בחלון מתגלגל של שנייה ונקשר ל־Policy Event העדכני. Trigger מבצע את אותו
Guard גם מול INSERT ישיר. המימוש אינו מחליף Queue worker, ‏Load evidence
או אימות ערך ה־WABA/Phone החי.

1.19 ‏`0014_worker_scheduler_lease.sql` ו־
`postgresWorkerSchedulerLeaseRepository.ts` מוסיפים Claim אטומי לכל Tick של
דקה. שני Workers מתחרים אינם יכולים לקבל אותו Tick; השתלטות לאחר תפוגה
מגדילה `fencing_token`, ולכן Worker ישן אינו יכול לסמן את הריצה כהושלמה.
`railwayWorkerScheduler.ts` מריץ את Campaign scheduler ואת Expiration
scheduler יחד, משלים לכל היותר חמישה Ticks חסרים ומשאיר Tick כלא־מושלם אם
אחת המשימות נכשלה. ה־Harness הוכיח Claim מקביל, Catch-up והשתלטות מול
PostgreSQL 16.13 אמיתי. Timer תמידי ו־Process lifecycle הושלמו; ‏BullMQ
adapter ו־Bootstrap חי עדיין לא בוצעו.

1.20 ‏`0015_campaign_dispatch.sql` ו־
`postgresCampaignDispatchRepository.ts` מוסיפים את מצב הנמענים החסר
ל־PostgreSQL. ‏Activation, ‏Promotion, ‏Claim, ‏Prepare, ‏Retry ו־Completion
נעשים בפקודות אטומיות; בחירת עבודה מקבילה משתמשת ב־
`FOR UPDATE SKIP LOCKED`. ה־Harness הוכיח זוכה יחיד ב־Activation/Promotion,
Claims שונים לשני Workers, ‏Prepare יחיד, ‏Retry ושינוי Consent לפני שליחה.
`railwayWorkerRuntime.ts` מחבר את Campaign ואת Invitation expiration לאותו
Lease; ‏`railwayPostgresWorkerService.ts` מחבר אותם ל־Pool ול־Timer.

1.21 ‏`postgresCampaignRepository.ts` ממיר גם את יצירת Snapshot הקמפיין
ל־PostgreSQL. יצירת ה־Campaign וכל Recipient snapshots מתבצעת ב־Transaction
אחת, ורק מול Template מאושר וזהה ומול Contacts בעלי Consent חי וגרסה
תואמת. ‏Replay מקביל ננעל ונבדק לפי כל שדות ה־Campaign וכל רשימת הנמענים;
התנגשות בעלת אותו מספר נמענים אך תוכן אחר נכשלת סגור. ה־Harness הוכיח שתי
כתיבות מקבילות זהות, Snapshot יחיד והמשך Dispatch מלא, ובכך העלה את ההוכחה
ל־14 תרחישי Concurrency.

1.22 ‏`postgresMessageTemplateRepository.ts` ממיר את מחזור החיים המלא של
Message Templates. ‏Draft insert, עדכון ושחזור Replay מתבצעים באותה
Transaction ומטפלים בשני ה־Unique constraints בלי להחליף זהות. ‏Claim,
Complete ו־Release משתמשים במעברי מצב אטומיים. אירוע Status חדש נכתב תחת
נעילת שורה; אירוע זהה מוחזר כ־`duplicate`, אירוע ישן כ־`stale`, והתנגשות
Meta ID נכשלת כ־`IDENTITY_CONFLICT`. ה־Harness הוכיח Draft מקביל, זוכה יחיד
ב־Submission ושילוב `applied`/`duplicate` מקביל, והעלה את הסך ל־17 תרחישי
Concurrency.

## 2. הסבר למתחילים

2.1 Transaction היא קבוצה של פעולות Database שמצליחה כיחידה אחת או מתבטלת
כולה. כך לא יכול להיווצר Contact ללא Audit, או Audit ללא תוצאת Mutation.

2.2 Idempotency key הוא מזהה של ניסיון כתיבה. כאשר אותה בקשה נשלחת שוב אחרי
Timeout, המערכת מחזירה את התוצאה הקודמת במקום ליצור שינוי נוסף.

2.3 Request digest הוא SHA-256 של הפעולה ושל הקלט המנורמל. אם Caller משתמש
באותו Idempotency key עם תוכן אחר, המערכת מחזירה `CONFLICT`.

## 3. סדר הפעולות האטומי

3.1 ה־Executor פותח Transaction אחת מסוג `read-committed` על Connection אחד.

3.2 הוא מנסה ליצור Receipt עם מפתח מורכב:
`tenant_id + operation + idempotency_key`.

3.3 `ON CONFLICT DO NOTHING` גורם לבקשה מקבילה להמתין ל־Transaction הראשונה.
לאחר מכן היא נועלת את ה־Receipt הקיים באמצעות `FOR UPDATE`.

3.4 אם ה־Digest שונה מוחזר `conflict`. אם ה־Receipt הושלם, מוחזרת תוצאת
`replayed` ללא כתיבה עסקית נוספת. Receipt שנשאר `processing` אחרי Commit
נחשב מצב לא תקין ונכשל סגור.

3.5 Claim חדש מבצע Contact upsert לפי `tenant_id + phone_e164`. הביטוי
`IS DISTINCT FROM` מטפל נכון גם ב־`NULL` ומונע הגדלת `version` כאשר הפרופיל
לא השתנה.

3.6 לאחר השינוי נכתב Audit ללא PII: ‏Tenant, ‏Actor, ‏Operation, ‏Contact ID,
Idempotency key ו־Request digest בלבד.

3.7 לבסוף נשמרת תוצאת ה־API הציבורית המדויקת וה־Receipt עובר
ל־`completed`. ה־JSON אינו כולל `tenantId`, ‏External User ID, ‏Consent
evidence או Database timestamps.

3.8 כל חריגה לפני ה־Commit מחייבת Rollback מלא דרך ה־Driver adapter.

## 4. דרישות מסכמת PostgreSQL הבסיסית

4.1 `contacts` חייבת לשמור Unique constraint על
`(tenant_id, phone_e164)` ואת אותם שדות Lifecycle שקיימים היום ב־D1.

4.2 `audit_logs` חייבת לאפשר Idempotency מבודד לפי
`(tenant_id, action, idempotency_key)`. אין להשתמש ב־Unique גלובלי על
`idempotency_key`, מפני ששני Tenants עלולים להפיק אותו מפתח חוקי.

4.3 ל־API ול־Worker מותר להתחבר רק דרך Railway private networking. ל־Vercel
ול־Browser אסור לקבל Database credential.

4.4 חשבון ה־Runtime יקבל רק הרשאות DML. יצירה ושינוי של Schema יבוצעו בזהות
Migration נפרדת.

4.5 ‏`response_json` עדיין מכיל פרטי Contact ציבוריים ולכן הוא Personal data.
יש לכלול אותו ב־Retention ובמחיקת Contact, למעט Legal Hold מאושר. אין להפוך
Receipt פעיל ל־Audit נצחי.

## 5. מה נבדק מקומית

5.1 Commit של Contact, ‏Audit ו־Receipt באותה Transaction.

5.2 Replay זהה ללא כתיבה נוספת ו־Conflict כאשר ה־Digest שונה.

5.3 Contact שלא השתנה נטען מחדש בלי הגדלת Version.

5.4 Result פגום, Tenant אחר, Receipt חלקי, כשל Audit או כשל Database גורמים
ל־Rollback ולתוצאת `unavailable` ללא חשיפת שגיאה פנימית.

5.5 ערכי משתמש נשלחים רק כ־Parameters; הם אינם משורשרים אל מחרוזות SQL.

5.6 ‏Migration guard עצמאי מאמת את סדר הקבצים ואת 40 טבלאות ה־Critical
Path, וחוסם תחביר SQLite, ‏Seed data, פעולות הרסניות ויצירת מזהים אקראית.

5.7 סכמת ה־Critical Path משתמשת ב־Identity columns, ‏`TIMESTAMPTZ` ו־`JSONB`.
Audit idempotency מבודד לפי `(tenant_id, action, idempotency_key)`.

5.8 ‏7 בדיקות Adapter מוכיחות Connection מוצמד, ‏Commit, ‏Rollback והשמדת
Client לאחר כשל BEGIN/COMMIT/ROLLBACK. ה־Harness האמיתי הוכיח גם
`committed + replayed` עבור שתי בקשות `contacts.save` מקבילות.

5.9 ‏6 בדיקות Pool configuration דוחות מצב חלקי, Loopback ב־Production,
TLS כבוי, ‏`sslmode` בתוך URL, מספרים מחוץ לטווח, Custom CA פגום,
Configuration מורחב ו־Telemetry שמעביר Error פנימי.

5.10 ‏3 בדיקות Foundation מוכיחות חיבור כל 17 ה־Adapters, ‏Close אידמפוטנטי,
היעדר Secret מהפלט וחסימת Options/Configuration/Telemetry לא תקינים. ה־Harness
האמיתי משתמש ב־Foundation עבור Contact mutation/read ו־Invitation lifecycle.

## 6. החלטות וראיות שעדיין חסרות

6.1 ספק PostgreSQL, ‏Plan, ‏Region, ‏HA, ‏PgBouncer ו־PITR —
`unknown/unavailable` עד אישור רועי והצוות.

6.2 ‏`node-postgres`, ה־Adapter וחוזה Pool/TLS/Timeouts המקומיים קיימים.
עדיין חסרים ערכים ואישור Production, ‏Telemetry sink, ‏CA evidence וכלי
Migration מאושר ב־Railway.

6.3 סכמת ה־Critical Path קיימת, אך Parity מלאה והמרה של כל סט 36 ה־Migrations
של D1 עדיין לא קיימות.

6.4 Contact, ‏Contact organization/import, ‏Meta connection/webhook/credential,
‏WhatsApp delivery policy/rate-limit ledger, ‏Worker scheduler lease,
‏Invitation DML ותשעה תרחישי Concurrency נבדקו
מול PostgreSQL מקומי אמיתי.
עדיין חסרים Adapters וכיסוי
DML/Concurrency לכל יתר ה־Repositories,
Staging evidence, ‏Backup/Restore rehearsal ו־Load test.

## 7. מקורות PostgreSQL רשמיים

7.1 [PostgreSQL 18 — INSERT ו־ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
מגדיר ש־`ON CONFLICT` משתמש ב־Unique constraint כ־Arbiter, וש־`RETURNING`
מחזיר רק שורות שנוספו או עודכנו בפועל. זהו הבסיס להבחנה בין Claim חדש לבין
Receipt קיים, וכן לטעינה נפרדת כאשר Upsert לא שינה Contact.

7.2 [PostgreSQL 18 — SELECT locking clauses](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
מגדיר ש־`FOR UPDATE` נועל את השורה הנבחרת מול עדכונים מתחרים. אין שימוש
ב־`SKIP LOCKED`, מפני שהוא עלול להחזיר View לא עקבי ואינו מתאים ל־Replay.

7.3 [PostgreSQL 18 — Transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
מתעד ש־`READ COMMITTED` הוא ברירת המחדל וש־`ON CONFLICT DO NOTHING` עשוי
להימנע מהוספה עקב תוצאה של Transaction מקבילה. לכן ה־Executor טוען ונועל את
ה־Receipt לאחר Claim שלא הוסיף שורה.

7.4 [PostgreSQL — Identity columns](https://www.postgresql.org/docs/current/ddl-identity-columns.html)
מגדיר Identity column כמזהה הנוצר אוטומטית באמצעות Sequence פנימי. סכמת
Connect משתמשת ב־`GENERATED BY DEFAULT AS IDENTITY` ואינה מייצרת מזהים
אקראיים.

7.5 [PostgreSQL — Date/time types](https://www.postgresql.org/docs/current/datatype-datetime.html)
מגדיר `timestamp with time zone`, הנשמר פנימית ב־UTC. לכן ה־Migration אינה
מעתיקה את ייצוגי הטקסט וה־`strftime` של SQLite.

7.6 [PostgreSQL — JSON functions and types](https://www.postgresql.org/docs/current/functions-json.html)
מתעד תמיכה טבעית ב־`jsonb`. הוא משמש רק ל־Audit metadata ולתוצאת Replay
מוגבלת; הוא אינו מחליף עמודות Relational או Tenant constraints.

7.7 [Railway — Private Networking](https://docs.railway.com/networking/private-networking)
מתעד תקשורת מבודדת בין שירותים באותו Environment. חיבור ה־Runtime למסד
הנתונים יישאר ברשת זו; Browser ו־Vercel לא יקבלו Database credential.

7.8 [node-postgres — Transactions](https://node-postgres.com/features/transactions)
דורש שכל משפטי Transaction ירוצו על אותו Client ומזהיר מפני שימוש
ב־`pool.query` בתוך Transaction. ה־Adapter מצמיד Client יחיד עד Commit/Rollback.

7.9 [node-postgres — Pool](https://node-postgres.com/apis/pool) דורש להחזיר
כל Client ל־Pool ומאפשר להשמיד Client פגום במקום להחזירו לשימוש. ה־Adapter
עושה זאת לאחר כשל BEGIN, ‏COMMIT או ROLLBACK.

7.10 [node-postgres — SSL](https://node-postgres.com/features/ssl) מזהיר
ש־`sslmode`, ‏`sslcert`, ‏`sslkey` או `sslrootcert` בתוך Connection string
מחליפים את אובייקט ה־SSL. לכן חוזה Connect דוחה כל Query string ב־Database URL.

7.11 [node-postgres — Client](https://node-postgres.com/apis/client) מגדיר
`statement_timeout`, ‏`query_timeout`, ‏`lock_timeout` ו־
`idle_in_transaction_session_timeout`; Connect דורשת ערך מפורש ומוגבל לכל אחד.
