# חוזה PostgreSQL ל־Railway Mutations

## 1. מטרה ומצב

1.1 מסמך זה מקפיא את החוזה המקומי של `contacts.save` בין Railway API
לבין PostgreSQL. ‏`node-postgres` נבחר כ־Node driver המקומי; ספק Database,
‏Plan, ‏Region ותצורת Pool ל־Production עדיין לא נבחרו.

1.2 מימוש ספק־נייטרלי קיים ב־
`server/platform/postgresRailwayApiMutationExecutor.ts`. הוא מקבל
`PostgresTransactionManager`. ה־Adapter ב־`nodePostgresAdapter.ts` מחבר אליו
`pg@8.23.0` בלי לשנות את כללי ה־Use case.

1.3 התיקייה `postgres/migrations` מכילה כעת חמש Migrations מסודרות עבור
ה־Critical Path בלבד: הראשונה יוצרת `tenants`, ‏`audit_logs` ו־`contacts`,
השנייה יוצרת את `railway_api_mutation_receipts`, השלישית את Tenant access
foundation, הרביעית את Membership event ledger והחמישית את Team invitation
lifecycle. השרשרת הוחלה בהצלחה על PostgreSQL 16.13 מקומי ומבודד, אך אינה
מוכיחה עדיין Parity עם כל 35 ה־Migrations של D1 או מוכנות לפריסה.

1.4 תסריט `verify:node-postgres-integration` מקים את החוזה רק מול Database
Loopback ייעודי וריק. הוא החיל את חמש ה־Migrations על PostgreSQL 16.13,
הפעיל DML אמיתי והוכיח שני תרחישי Concurrency. הוא אינו מקבל URL מרוחק,
Credentials ב־URL או שם Database שאינו `connect_driver_integration`.

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

5.6 ‏Migration guard עצמאי מאמת את סדר הקבצים ואת 12 טבלאות ה־Critical
Path, וחוסם תחביר SQLite, ‏Seed data, פעולות הרסניות ויצירת מזהים אקראית.

5.7 סכמת ה־Critical Path משתמשת ב־Identity columns, ‏`TIMESTAMPTZ` ו־`JSONB`.
Audit idempotency מבודד לפי `(tenant_id, action, idempotency_key)`.

5.8 ‏7 בדיקות Adapter מוכיחות Connection מוצמד, ‏Commit, ‏Rollback והשמדת
Client לאחר כשל BEGIN/COMMIT/ROLLBACK. ה־Harness האמיתי הוכיח גם
`committed + replayed` עבור שתי בקשות `contacts.save` מקבילות.

## 6. החלטות וראיות שעדיין חסרות

6.1 ספק PostgreSQL, ‏Plan, ‏Region, ‏HA, ‏PgBouncer ו־PITR —
`unknown/unavailable` עד אישור רועי והצוות.

6.2 ‏`node-postgres` וה־Adapter המקומי קיימים. עדיין חסרים אישור Production,
תצורת Pool/TLS/Timeouts/Telemetry וכלי Migration מאושר ב־Railway.

6.3 סכמת ה־Critical Path קיימת, אך Parity מלאה והמרה של כל סט 35 ה־Migrations
של D1 עדיין לא קיימות.

6.4 Contact ו־Invitation DML ושני תרחישי Concurrency נבדקו מול PostgreSQL
מקומי אמיתי. עדיין חסרים כיסוי DML/Concurrency לכל יתר ה־Repositories,
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
