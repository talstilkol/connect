# חוזה PostgreSQL ל־Railway Mutations

## 1. מטרה ומצב

1.1 מסמך זה מקפיא את החוזה המקומי של `contacts.save` בין Railway API
לבין PostgreSQL. הוא אינו בוחר ספק Database, ‏Node driver, ‏Plan או Region.

1.2 מימוש ספק־נייטרלי קיים ב־
`server/platform/postgresRailwayApiMutationExecutor.ts`. הוא מקבל
`PostgresTransactionManager`, ולכן Driver עתידי יכול לחבר `pg`, ‏Postgres.js
או חלופה מאושרת בלי לשנות את כללי ה־Use case.

1.3 הקובץ `postgres/schema/railway_api_mutation_receipts.sql` הוא Schema
contract. אין להריץ אותו עד שקיימת סכמת PostgreSQL בסיסית עבור `tenants`,
`contacts` ו־`audit_logs`, ונבחר כלי Migration אמיתי.

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

## 6. החלטות וראיות שעדיין חסרות

6.1 ספק PostgreSQL, ‏Plan, ‏Region, ‏HA, ‏PgBouncer ו־PITR —
`unknown/unavailable` עד אישור רועי והצוות.

6.2 ‏Node driver וכלי Migration — `unknown/unavailable` עד אישור דוד ובדיקת
Compatibility עם Railway ו־Node 24.

6.3 סכמת PostgreSQL מלאה ו־Migration מכל 35 סכמות D1 עדיין לא קיימות.

6.4 עדיין חסרים Integration tests מול PostgreSQL אמיתי, בדיקת שתי Transactions
מקבילות, Staging evidence, ‏Backup/Restore rehearsal ו־Load test.

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
