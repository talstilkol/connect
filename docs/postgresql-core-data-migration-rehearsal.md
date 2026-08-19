# PostgreSQL Core Data Migration Rehearsal

## 1. מטרה וסטטוס

1.1 מסמך זה מגדיר את ה־rehearsal המקומי להעברת Core data מ־D1/SQLite אל
PostgreSQL לפני מעבר Hosting ל־Railway.

1.2 ה־rehearsal המקומי עבר ב־2026-08-19 מול SQLite אמיתי ו־PostgreSQL 16
אמיתי: 36 מיגרציות D1, ‏24 מיגרציות PostgreSQL, ‏7 טבלאות ו־7 שורות
מבוקרות. ניסיון Replay נוסף נחסם.

1.3 זו אינה ראיית Production או Staging. היא אינה מאשרת Cutover ואינה
מוכיחה המרה של כל 51 טבלאות D1.

## 2. ה־Core slice שנבדק

2.1 סדר הטעינה נקבע לפי Foreign keys:

2.1.1 `tenants`.

2.1.2 `tenant_memberships`.

2.1.3 `tenant_selections`.

2.1.4 `business_profiles`.

2.1.5 `contacts`.

2.1.6 `contact_consent_events`.

2.1.7 `audit_logs`.

2.2 מזהי המקור נשמרים. לאחר הטעינה כל Identity sequence מסונכרן אל המזהה
הבא כדי שכתיבה חדשה לא תתנגש בנתונים שהועברו.

## 3. זרימת הבטיחות

3.1 `readD1CoreDataSnapshot` פותח Snapshot transaction ב־SQLite.

3.2 לפני קריאה הוא דורש Schema מדויק, `integrity_check=ok` וללא הפרות
`foreign_key_check`.

3.3 `createPostgresCoreDataMigrationPlan` מנרמל Timestamps ל־UTC ו־JSON
לייצוג קנוני, ומחשב HMAC-SHA-256 נפרד לכל טבלה.

3.4 תוקף Plan מוגבל ל־15 דקות. שינוי ב־Payload, ב־Manifest, במונים או
ב־Digests לאחר יצירתו גורם לכשל לפני חיבור ל־Transaction.

3.5 ההעברה ל־PostgreSQL משתמשת ב־Advisory lock וב־`ACCESS EXCLUSIVE` על כל
שבע הטבלאות. היעד חייב להיות ריק; אין Merge, ‏Upsert או Overwrite.

3.6 כל הטעינה, סנכרון ה־Sequences וקריאת האימות מתבצעים באותה Transaction.
אי־התאמה במספר השורות או ב־HMAC גורמת ל־Rollback מלא.

3.7 ה־Evidence המוחזר מכיל רק Plan ID, ‏Manifest digest, זמן, שמות טבלאות,
מונים ו־HMACs. הוא אינו מכיל שמות לקוחות, מספרי טלפון, אימיילים, Metadata או
Database credentials.

## 4. פער Consent שנחסם במפורש

4.1 D1 הישן מאפשר ב־`contact_consent_events` Actor חסר ומפתח Idempotency
חופשי. PostgreSQL דורש Actor מפורש ומפתח
`contact_consent_v1_<sha256>`.

4.2 הכלי אינו ממציא Actor ואינו משכתב Evidence. שורה ישנה שאינה עומדת
בחוזה גורמת לכשל `row-invalid` לפני טעינה.

4.3 לפני Staging יש להפיק Report של הרשומות החסומות ולקבל החלטת Legal/Product
מפורשת על Backfill או על מסלול Archive. אין לבצע Backfill אוטומטי.

## 5. הרצה מקומית

5.1 יש ליצור PostgreSQL 16 מקומי וריק בשם
`connect_data_migration_rehearsal` ללא Password וללא Query string ב־URL.

5.2 הפקודה היא:

```bash
CONNECT_POSTGRES_DATA_MIGRATION_REHEARSAL_URL=postgresql://127.0.0.1:<port>/connect_data_migration_rehearsal npm run verify:postgres-core-data-migration
```

5.3 ה־Verifier מקבל Loopback בלבד ואת שם המסד המדויק. הוא דוחה מסד מרוחק,
Password בתוך URL, ‏Query string, ‏Fragment, Port חסר או מסד שאינו ריק.

5.4 מפתח ה־HMAC בתוך ה־Verifier הוא מפתח בדיקה דטרמיניסטי ואינו נשמר
ב־Evidence. כלי Staging/Production עתידי חייב לקבל Secret ייעודי ממנהל
Secrets; אסור להשתמש במפתח הבדיקה מחוץ ל־rehearsal המקומי.

## 6. תנאי הקבלה שעברו

6.1 כל 36 מיגרציות D1 וכל 24 מיגרציות PostgreSQL נטענו למנועים נקיים.

6.2 שבע הטבלאות עברו עם Count ו־HMAC זהים במקור וביעד.

6.3 JSON בסדר מפתחות שונה ו־Timestamps בייצוג SQLite/Node נורמלו לאותה
משמעות לפני Digest.

6.4 כל חמשת Identity sequences החזירו את המזהה הבא הצפוי.

6.5 ניסיון הפעלה שני על יעד שכבר מכיל נתונים נכשל `target-not-empty`.

6.6 בדיקות שליליות מכסות Plan שפג תוקפו, Manifest ששונה, Schema D1 שונה,
יעד לא ריק ו־Consent legacy שאינו תואם.

## 7. מה עדיין נדרש לפני Cutover

7.1 להגדיר המרה ואימות ל־44 טבלאות D1 שאינן ב־Core slice.

7.2 לבנות Export מאושר מ־Cloudflare D1 ו־Importer תפעולי עם Secrets, הרשאות,
Audit, ‏Dry run ו־Artifact retention מאושרים.

7.3 להריץ Staging rehearsal עם Snapshot מייצג ומושחר, כולל נפח אמיתי,
Timeouts, ‏Rollback ו־אישור בעלי הנתונים.

7.4 להשלים Semantic parity למסלולי קריאה וכתיבה, Load test, ‏Backup/Restore
ו־Cutover/Rollback runbook.

7.5 רק לאחר ארבעת התנאים האלה מותר לשנות את שער Hosting migration ל־Ready.
