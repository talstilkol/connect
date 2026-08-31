# PostgreSQL Full Data Migration Cutover Runbook

תאריך אימות מקומי: 2026-08-20

## 1. מטרה

1.1 ה־Runbook מפעיל את ה־Full Migration בשני שלבים נפרדים:

1. `preflight` — אימות מקור ויצירת זהות מאושרת ללא כתיבה ל־PostgreSQL.
2. `execute` — טעינה אטומית רק לאחר אישור מפורש של אותה זהות.

1.2 ההפרדה מונעת מצב שבו בחירת קובץ בטעות מתחילה מיד טעינה. ה־Operator
רואה קודם את מספר ה־Slices, הטבלאות והשורות ואת `sourceDigest`, ורק לאחר
Review מאפשר את ה־Execute.

1.3 הכלי אינו יוצר Export, אינו יוצר HMAC key, אינו מתקין Migrations ואינו
מוחק קבצים. פעולות אלה נשארות באחריות תהליך תפעולי מאושר.

## 2. גבולות בטיחות

2.1 קובץ המקור חייב להיות Export ‏SQLite מוחלט, רגיל, בבעלות המשתמש המריץ,
עם הרשאות Owner בלבד וללא Symbolic link או Hard link.

2.2 כל 55 הטבלאות נקראות תחת Transaction מקור יחיד במצב Read-only. ‏Schema,
‏Integrity ו־Foreign keys נבדקים לפני שנוצר Digest.

2.3 ה־HMAC key חייב להיות בדיוק 32 bytes ב־Base64 קנוני. הכלי מקבל אותו
רק דרך `CONNECT_POSTGRES_FULL_MIGRATION_HMAC_KEY`, אינו מדפיס אותו ואינו
מייצר לו ברירת מחדל.

2.4 ה־Plan מכיל את שורות המקור ולכן נשאר בזיכרון התהליך בלבד. אין לכתוב
Plan, ‏Snapshot או Process environment ל־Log, ל־Ticket או ל־Artifact.

2.5 ‏Execute דורש את שתי ההוכחות הבאות יחד:

1. `CONNECT_POSTGRES_FULL_MIGRATION_APPROVED_SOURCE_DIGEST` — העתק מדויק
   של `sourceDigest` שהוחזר ב־Preflight.
2. `CONNECT_POSTGRES_FULL_MIGRATION_CONFIRMATION` — הערך המדויק
   `execute-full-d1-cutover`.

2.6 הקוד מכיר רק `staging` או `production`, וכל הגדרות ה־PostgreSQL Pool
נבדקות דרך החוזה המרכזי; יעד מרוחק דורש `POSTGRES_TLS_MODE=verify-full`.
כל עוד D14 פתוחה ואין Readiness v2 פעיל הקשור לאותו Release, מותר לבצע
Execute רק ב־Staging. בחירת הערך `production` אינה אישור Go-live; עד
להוספת אכיפה בקוד נדרש Gate חיצוני מחייב של Security ו־Operations.

## 3. שלב Preflight

3.1 יש להזריק לתהליך, ממקור Secrets מאושר, את שלושת המשתנים:

1. `CONNECT_POSTGRES_FULL_MIGRATION_COMMAND=preflight`.
2. `CONNECT_D1_FULL_MIGRATION_SOURCE_PATH` — נתיב ה־Export המוגן.
3. `CONNECT_POSTGRES_FULL_MIGRATION_HMAC_KEY` — מפתח זמני מאושר.

3.2 לאחר ההזרקה מריצים:

```bash
npm run cutover:postgres-full
```

3.3 הפלט הוא JSON מצומצם בלבד: Version, חלון של עשר דקות, `sourceDigest`,
עשרה Slice summaries, מספר 55 הטבלאות ומספר השורות הכולל. אין בו Payload,
נתיב מקור, Database URL או HMAC key.

3.4 Operator שני צריך לבדוק את מקור ה־Export, המונים, סביבת היעד וחלון
השינוי לפני אישור ה־Digest. אין להשתמש ב־Digest שנוצר מ־Export אחר.

## 4. שלב Execute

4.1 לפני Execute יש לוודא שביעד מותקנות בדיוק 42 ה־Migrations הנוכחיות,
`0000` עד `0041`,
שהטבלאות העסקיות ריקות ושלא קיים Receipt עבור `full-d1-cutover`.

4.2 משאירים את נתיב המקור ואת אותו HMAC key, משנים את Command ל־`execute`,
מוסיפים את שתי הוכחות האישור ומזריקים את כל משתני ה־PostgreSQL Pool:

1. `APP_RUNTIME_ENVIRONMENT`; כל עוד D14 פתוחה הערך חייב להיות `staging`
   ולא `production`.
2. `DATABASE_URL`.
3. `POSTGRES_APPLICATION_NAME`.
4. `POSTGRES_MAX_CONNECTIONS`.
5. `POSTGRES_CONNECTION_TIMEOUT_MS`.
6. `POSTGRES_IDLE_TIMEOUT_MS`.
7. `POSTGRES_STATEMENT_TIMEOUT_MS`.
8. `POSTGRES_QUERY_TIMEOUT_MS`.
9. `POSTGRES_LOCK_TIMEOUT_MS`.
10. `POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS`.
11. `POSTGRES_MAX_LIFETIME_SECONDS`.
12. `POSTGRES_TLS_MODE` ו־`POSTGRES_TLS_CA_PEM` כאשר נדרש CA פרטי.

4.3 אותה פקודה מריצה את Execute. לפני פתיחת Pool נבדקים Environment,
TLS, ‏Confirmation והמבנה של ה־Digest. לאחר קריאת המקור מחושב Digest חדש;
אי־התאמה לאישור חוסמת את היעד לפני Transaction.

4.4 הצלחה מחזירה Evidence מצומצם עם Bundle, ‏Source ו־Evidence digests,
Environment, זמן התחלה/סיום ומונים. כל 10 ה־Slices, אימות 55 הטבלאות
וה־Receipt מתבצעים תחת Transaction יעד יחיד.

## 5. כשל ו־Rollback

5.1 כשל באימות, בטבלה, ב־Digest, ב־Trigger, ב־Sequence או בכתיבת Receipt
גורם ל־Rollback מלא. אין Evidence של הצלחה ללא Commit.

5.2 ניסיון נוסף לאחר הצלחה מוחזר כ־`target-already-cut-over` לפני Child
slice ראשון. אין להסיר או לשנות Receipt כדי לעקוף את ההגנה.

5.3 אם תוצאת ה־Commit החיצונית אינה ודאית, אין להריץ שוב אוטומטית. יש
לבדוק את Receipt ואת מצב היעד בתהליך Recovery מאושר.

5.4 הכלי הנוכחי אינו מחליף Point-in-time recovery, ‏Backup/Restore או
Rollback תפעולי. אלה עדיין תנאי חובה לפני Staging sign-off או Production.

## 6. ראיות מקומיות ומגבלות

6.1 בדיקות שליליות מאמתות חסימה לפני יעד עבור Environment שגוי, אישור חסר,
Digest שונה, HMAC key שגוי ושדות מורחבים.

6.2 ה־Full integration החי האחרון מול PostgreSQL 16.13 עבר עם 40
Migrations, עשרה Slices, ‏55 טבלאות, Receipt יחיד, Replay חסום ו־87
תרחישי Concurrency. ה־baseline הנוכחי הוא 42 Migrations; Migration 0041
עברה הוכחה חיה ממוקדת, אך Full integration של כל 42 עדיין נדרש.

6.3 החזרה המקומית השתמשה ב־D1 schema אמיתי ללא שורות לקוח. היא מוכיחה את
הכלי ואת גבולות הבטיחות, אך אינה Evidence של Export חי, Staging או Production.

6.4 ‏D12 בחרה Railway PostgreSQL עבור ה־Pilot. לפני שימוש חיצוני עדיין
נדרשים Plan ו־Region, ערכי Pool ו־TLS חיים, ‏PITR ותקציב, Export מורשה,
אישור Security/Operations, ‏Load/Recovery, ‏Backup/Restore, חלון Cutover
וראיית Rollback חתומה.

6.5 ה־Preflight מציג חלון של עשר דקות, אך ה־Execute הנוכחי מאשר
`sourceDigest` יציב ויוצר Plan חדש. לכן `expiresAt` המוצג אינו לבדו תפוגת
האישור. עד לחוזה v2 הקושר גם `bundleDigest` וחלון זמן, ה־Operator חייב
להגביל חיצונית את תוקף האישור לעשר דקות ולבטל אישור שלא הופעל בחלון.
