# D31 — הפרדת זהויות PostgreSQL ל־Migration, API, Worker ו־Verifier

תאריך: 2026-08-25

סטטוס: החלטה חיצונית חוסמת Activation

בעל החלטה מומלץ: Tal + Deployment owner + Database owner

## 1. תשובה קצרה

1.1 ההמלצה המעודכנת היא לבחור בארבע יכולות PostgreSQL נפרדות:

1.1.1 `migration owner` — Role מסוג `NOLOGIN` שמחזיק את הטבלאות ואת
פונקציות `SECURITY DEFINER`; Migrator ייעודי ב־CI רשאי לבצע אליו `SET ROLE`.

1.1.2 `api role` — קריאות API בלבד והרשאות `SELECT` מצומצמות; ללא כתיבה
ישירה לראיות המוגנות.

1.1.3 `worker role` — עבודות Worker בלבד; ללא גישה ל־Release evidence,
ל־Operator events או ל־Nonce ledger.

1.1.4 `verifier capability role` — שירות Verifier מבודד. מקבל `EXECUTE`
רק על Wrapper חיצוני אחד שמאמת את כל ה־bindings ומבצע nonce + Evidence +
Audit באותה Transaction. אין לו `EXECUTE` על פונקציות 0044, 0046 או 0047.

1.2 עד שכל ארבע היכולות קיימות ומוכחות, Bot Release Evidence נשאר
Fail-closed ואסור לסמן את Operator כ־Ready.

## 2. הסבר למתחילים

2.1 כיום אותו `DATABASE_URL` משמש גם את האפליקציה וגם כלים בעלי כוח גבוה.

2.2 המשמעות היא שגם אם הקוד הרגיל כותב Audit, חיבור ישיר עם אותה זהות יכול
לעדכן את הטבלה בלי לעבור במסלול המאודט. גם הפרדה לשתי זהויות בלבד אינה
מספיקה: API או Worker שמחזיקים באותו Runtime login יכולים לעקוף את שירות
האימות ולקרוא לפונקציה פנימית חלקית.

2.3 ההפרדה יוצרת את הגבול הבא:

```text
CI / one-shot migrator ── POSTGRES_MIGRATION_URL ──► Migration owner
                                                        │ owns schema
API ──────────────── POSTGRES_API_URL ────────────────► │ SELECT only
Worker ───────────── POSTGRES_WORKER_URL ─────────────► │ no protected access
Verifier service ─── POSTGRES_VERIFIER_URL ──────────► │ EXECUTE outer wrapper
                                                        ▼
                Direct protected-table DML: BLOCKED
                Internal 0044/0046/0047 EXECUTE: BLOCKED
```

## 3. אפשרויות החלטה

3.1 אפשרות A — ארבע יכולות ו־Verifier מבודד — **מומלץ**

3.1.1 יתרונות:

- Direct DML ניתן לחסימה אמיתית.
- Secrets בעלי כוח גבוה אינם מגיעים ל־API או ל־Worker.
- רק ה־Verifier יכול לבצע את ה־Wrapper האטומי המלא.
- Worker שנפרץ אינו יכול לפרסם Evidence, ו־API שנפרץ אינו יכול לצרוך nonce.
- אפשר להוכיח הרשאות בבדיקת PostgreSQL חיה.
- מאפשר Expand/Contract ו־Rollback מסודרים.

3.1.2 חסרונות:

- דורש Roles ו־Credentials נפרדים ל־API, Worker, Verifier ו־Migrator.
- דורש Railway service או Job מבודד עבור ה־Verifier.
- דורש Deployment מתוזמן וניקוז Connections ישנים.

3.2 אפשרות B — Migration owner + Runtime משותף — **לא מספיק ל־Commit C**

3.2.1 יתרון: פשוט יותר מהפרדה מלאה.

3.2.2 סיכון: API ו־Worker חולקים יכולת, ולכן אחד מהם יכול לעקוף את גבול
ה־Verifier. אפשרות זו אינה מאושרת להפעלת Attested Evidence.

3.3 אפשרות C — להשאיר `DATABASE_URL` יחיד ולהסתמך על Repository — **לא מאושר ל־Production**

3.3.1 יתרון: פחות עבודת תשתית.

3.3.2 סיכון: מי שמחזיק באותו Login יכול לעקוף את ה־Audit; לכן זו אינה בקרת אבטחה.

3.4 אפשרות D — מסד נפרד ל־Evidence — לא מומלץ ל־Pilot

3.4.1 יתרון: בידוד חזק.

3.4.2 חסרונות: תפעול, עלות, Consistency ושחזור מורכבים יותר בלי צורך מוכח בשלב זה.

## 4. חוזה מומלץ

4.1 Secrets:

4.1.1 `POSTGRES_API_URL` — API בלבד.

4.1.2 `POSTGRES_WORKER_URL` — Worker בלבד.

4.1.3 `POSTGRES_VERIFIER_URL` — Verifier מבודד בלבד; אסור לחשוף ל־API
או ל־Worker.

4.1.4 `POSTGRES_MIGRATION_URL` — CI או one-shot migrator בלבד; אסור לחשוף
לאף Runtime service.

4.2 הרשאות משותפות לשלושת Runtime roles:

4.2.1 ללא `SUPERUSER`,‏ `BYPASSRLS`,‏ `CREATEROLE` או בעלות על הטבלאות.

4.2.2 ללא חברות ב־migration-owner role.

4.2.3 ללא `CREATE` ב־Schema וללא `TEMPORARY` כברירת מחדל.

4.3 מטריצת Capability:

4.3.1 API — `SELECT` רק על Release evidence ו־Readiness הדרושים לקריאה.

4.3.2 Worker — ללא הרשאה לשלוש הטבלאות המוגנות וללא פונקציות הפרסום.

4.3.3 Verifier — `SELECT` מצומצם ל־Release/Operator readback ו־`EXECUTE`
רק על Wrapper Commit C החיצוני.

4.3.4 כל שלושת ה־Runtime roles — ללא `EXECUTE` על 0044, 0046 ו־0047;
ללא `INSERT`,‏ `UPDATE`,‏ `DELETE` או `TRUNCATE` ישיר בטבלאות המוגנות.

4.4 פונקציות `SECURITY DEFINER`:

4.4.1 `search_path` נעול ל־Schema אמין, כאשר `pg_temp` אחרון.

4.4.2 שמות Tables ו־Functions מלאים וללא Dynamic SQL.

4.4.3 `PUBLIC EXECUTE` מבוטל מיד באותה Transaction שבה נוצרת הפונקציה.

## 5. סדר ביצוע

5.1 Expand:

5.1.1 ליצור פונקציות CAS + Audit אטומיות בלי להפעיל עדיין Trigger חוסם.

5.1.2 להעביר את Repositories לקריאה לפונקציות.

5.2 Identity rollout:

5.2.1 ליצור API, Worker ו־Verifier logins נפרדים עם Credentials שמיוצרים
ומאוחסנים על ידי בעל התשתית; אין לשמור אותם בקוד.

5.2.2 להגדיר `POSTGRES_API_URL`,‏ `POSTGRES_WORKER_URL`
ו־`POSTGRES_VERIFIER_URL` רק בשירות המתאים.

5.2.3 להגדיר `POSTGRES_MIGRATION_URL` רק ב־CI/migrator.

5.3 Drain:

5.3.1 להפעיל Kill switch לשליחה.

5.3.2 לעצור Ingress, לסיים Jobs פעילים ולוודא שאין Sessions ישנים.

5.4 Contract:

5.4.1 להעביר Ownership ל־migration owner.

5.4.2 לבטל Direct DML על טבלאות Evidence המוגנות.

5.4.3 להעניק `EXECUTE` על ה־Wrapper החיצוני ל־Verifier capability בלבד.

5.4.4 להפעיל מחדש Worker, אחריו API, ורק אז לפתוח Kill switch.

## 6. בדיקות קבלה

6.1 Verifier מצליח לפרסם Evidence רק דרך ה־Wrapper החיצוני.

6.2 API, Worker ו־Verifier נכשלים ב־`UPDATE`,‏ `INSERT`,‏ `DELETE`
ו־`TRUNCATE` ישיר לטבלאות המוגנות.

6.3 API, Worker, Verifier, Role זר ו־`PUBLIC` נכשלים ב־`EXECUTE` על
0044, 0046 ו־0047.

6.4 API מצליח רק ב־`SELECT` שאושר; Worker נכשל בכל גישה לפרוסת הראיות;
Verifier מצליח רק ב־Wrapper ובקריאות Readback המצומצמות.

6.5 כשל Audit מבטל את ה־nonce ואת ה־CAS באותה Transaction.

6.6 Conflict אינו משאיר nonce או Audit event, ו־Replay אינו יוצר Event כפול.

6.7 Migration owner יכול להחיל Migration נוסף לאחר ההקשחה.

6.8 `PUBLIC` אינו מחזיק `EXECUTE`; ה־Function owner וה־`search_path` תואמים לחוזה.

## 7. תשובה נדרשת

7.1 האם מאשרים את אפשרות A — ארבע יכולות PostgreSQL ו־Verifier מבודד?

7.2 אם כן, יש למנות:

7.2.1 בעל `POSTGRES_MIGRATION_URL` ראשי וגיבוי.

7.2.2 בעל ביצוע Role creation ו־Grant/Revoke ב־Railway.

7.2.3 בעל שירות ה־Verifier ו־`POSTGRES_VERIFIER_URL` ראשי וגיבוי.

7.2.4 חלון Maintenance/Drain ראשון ל־Staging.

## 8. מקורות רשמיים

8.1 Railway מתעדת יצירת Role נוסף ומעבר Credentials ללא השבתה מלאה: <https://docs.railway.com/guides/rotate-credentials-zero-downtime>

8.2 Railway PostgreSQL חושפת `PGUSER`,‏ `PGPASSWORD` ו־`DATABASE_URL` וניתנת לניהול כ־PostgreSQL רגיל: <https://docs.railway.com/databases/postgresql>

8.3 PostgreSQL דורשת `search_path` בטוח וביטול `PUBLIC EXECUTE` עבור פונקציות `SECURITY DEFINER`: <https://www.postgresql.org/docs/current/sql-createfunction.html>
