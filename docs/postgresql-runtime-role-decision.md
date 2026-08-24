# D31 — הפרדת זהויות PostgreSQL ל־Migration ול־Runtime

תאריך: 2026-08-25

סטטוס: החלטה חיצונית חוסמת Activation

בעל החלטה מומלץ: Tal + Deployment owner + Database owner

## 1. תשובה קצרה

1.1 ההמלצה היא לבחור בשתי זהויות PostgreSQL נפרדות:

1.1.1 `migration owner` — מחזיק את הטבלאות, מחיל Migrations ומחזיק פונקציות `SECURITY DEFINER`.

1.1.2 `runtime login` — משמש את ה־API וה־Worker, אינו בעל הטבלאות ומקבל רק הרשאות שימוש נדרשות.

1.2 עד שההפרדה אינה קיימת ומוכחת, Bot Release Evidence נשאר Fail-closed ואסור לסמן את Operator כ־Ready.

## 2. הסבר למתחילים

2.1 כיום אותו `DATABASE_URL` משמש גם את האפליקציה וגם כלים בעלי כוח גבוה.

2.2 המשמעות היא שגם אם הקוד הרגיל כותב Audit, חיבור ישיר עם אותה זהות יכול לעדכן את הטבלה בלי לעבור במסלול המאודט.

2.3 ההפרדה יוצרת את הגבול הבא:

```text
CI / one-shot migrator
        │ POSTGRES_MIGRATION_URL
        ▼
Migration owner ── owns schema + functions
        │
        │ grants EXECUTE / least privilege
        ▼
Runtime login ◄── DATABASE_URL ── API + Worker
        │
        └── Direct protected-table DML: BLOCKED
```

## 3. אפשרויות החלטה

3.1 אפשרות A — שתי זהויות ו־Migration runner ייעודי — **מומלץ**

3.1.1 יתרונות:

- Direct DML ניתן לחסימה אמיתית.
- Secrets בעלי כוח גבוה אינם מגיעים ל־API או ל־Worker.
- אפשר להוכיח הרשאות בבדיקת PostgreSQL חיה.
- מאפשר Expand/Contract ו־Rollback מסודרים.

3.1.2 חסרונות:

- דורש יצירת Role נוסף והגדרת Secret נוסף ב־Railway/CI.
- דורש Deployment מתוזמן וניקוז Connections ישנים.

3.2 אפשרות B — להשאיר `DATABASE_URL` יחיד ולהסתמך על Repository — **לא מאושר ל־Production**

3.2.1 יתרון: פחות עבודת תשתית.

3.2.2 סיכון: מי שמחזיק באותו Login יכול לעקוף את ה־Audit; לכן זו אינה בקרת אבטחה.

3.3 אפשרות C — מסד נפרד ל־Evidence — לא מומלץ ל־Pilot

3.3.1 יתרון: בידוד חזק.

3.3.2 חסרונות: תפעול, עלות, Consistency ושחזור מורכבים יותר בלי צורך מוכח בשלב זה.

## 4. חוזה מומלץ

4.1 Secrets:

4.1.1 `DATABASE_URL` — Runtime בלבד; זמין ל־API ול־Worker.

4.1.2 `POSTGRES_MIGRATION_URL` — CI או one-shot migrator בלבד; אסור לחשוף ל־API או ל־Worker.

4.2 הרשאות Runtime:

4.2.1 ללא `SUPERUSER`,‏ `BYPASSRLS`,‏ `CREATEROLE` או בעלות על הטבלאות.

4.2.2 ללא חברות ב־migration-owner role.

4.2.3 `EXECUTE` רק על פונקציות כתיבה מאושרות ו־DML רגיל רק על הטבלאות שנדרשות לאפליקציה.

4.3 פונקציות `SECURITY DEFINER`:

4.3.1 `search_path` נעול ל־Schema אמין, כאשר `pg_temp` אחרון.

4.3.2 שמות Tables ו־Functions מלאים וללא Dynamic SQL.

4.3.3 `PUBLIC EXECUTE` מבוטל מיד באותה Transaction שבה נוצרת הפונקציה.

## 5. סדר ביצוע

5.1 Expand:

5.1.1 ליצור פונקציות CAS + Audit אטומיות בלי להפעיל עדיין Trigger חוסם.

5.1.2 להעביר את Repositories לקריאה לפונקציות.

5.2 Identity rollout:

5.2.1 ליצור Runtime login נפרד עם Credential שמיוצר ומאוחסן על ידי בעל התשתית; אין לשמור אותו בקוד.

5.2.2 להגדיר `DATABASE_URL` נפרד ל־API ול־Worker.

5.2.3 להגדיר `POSTGRES_MIGRATION_URL` רק ב־CI/migrator.

5.3 Drain:

5.3.1 להפעיל Kill switch לשליחה.

5.3.2 לעצור Ingress, לסיים Jobs פעילים ולוודא שאין Sessions ישנים.

5.4 Contract:

5.4.1 להעביר Ownership ל־migration owner.

5.4.2 לבטל Direct DML על טבלאות Evidence המוגנות.

5.4.3 להעניק `EXECUTE` ל־Runtime capability בלבד.

5.4.4 להפעיל מחדש Worker, אחריו API, ורק אז לפתוח Kill switch.

## 6. בדיקות קבלה

6.1 Runtime מצליח לפרסם Evidence דרך הפונקציה.

6.2 Runtime נכשל ב־`UPDATE` או `INSERT` ישיר לטבלאות המוגנות.

6.3 Role לא מורשה נכשל גם ב־DML וגם ב־`EXECUTE`.

6.4 כשל Audit מבטל את ה־CAS באותה Transaction.

6.5 Conflict אינו יוצר Audit event, ו־Replay אינו יוצר Event כפול.

6.6 Migration owner יכול להחיל Migration נוסף לאחר ההקשחה.

6.7 `PUBLIC` אינו מחזיק `EXECUTE`; ה־Function owner וה־`search_path` תואמים לחוזה.

## 7. תשובה נדרשת

7.1 האם מאשרים את אפשרות A — שתי זהויות PostgreSQL ו־Migration runner ייעודי?

7.2 אם כן, יש למנות:

7.2.1 בעל `POSTGRES_MIGRATION_URL` ראשי וגיבוי.

7.2.2 בעל ביצוע Role creation ו־Grant/Revoke ב־Railway.

7.2.3 חלון Maintenance/Drain ראשון ל־Staging.

## 8. מקורות רשמיים

8.1 Railway מתעדת יצירת Role נוסף ומעבר Credentials ללא השבתה מלאה: <https://docs.railway.com/guides/rotate-credentials-zero-downtime>

8.2 Railway PostgreSQL חושפת `PGUSER`,‏ `PGPASSWORD` ו־`DATABASE_URL` וניתנת לניהול כ־PostgreSQL רגיל: <https://docs.railway.com/databases/postgresql>

8.3 PostgreSQL דורשת `search_path` בטוח וביטול `PUBLIC EXECUTE` עבור פונקציות `SECURITY DEFINER`: <https://www.postgresql.org/docs/current/sql-createfunction.html>
