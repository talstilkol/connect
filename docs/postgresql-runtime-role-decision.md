# D31 — הפרדת זהויות PostgreSQL ל־Migration, API, Worker ו־Verifier

תאריך: 2026-08-25

סטטוס: החלטה חיצונית חוסמת Activation

בעל החלטה מומלץ: Tal + Deployment owner + Database owner

## 1. תשובה קצרה

1.1 ההמלצה המעודכנת היא לבחור בחמישה Principals נפרדים, שמתוכם ארבעה
מחזיקים ב־Login capability:

1.1.1 `connect_migration_owner` — Role מסוג `NOLOGIN` שמחזיק את הטבלאות ואת
פונקציות `SECURITY DEFINER`; Migrator ייעודי ב־CI רשאי לבצע אליו `SET ROLE`.

1.1.2 `connect_migrator_login` — Login ייעודי ל־CI או one-shot migration. הוא
אינו Owner ואינו מקבל הרשאות Owner בירושה; מותר לו `SET ROLE` מפורש בלבד.

1.1.3 `connect_api_runtime` — קריאות API עסקיות בלבד; ללא `SELECT` ישיר על טבלאות
Release evidence,‏ Receipt,‏ Nonce או Operator events וללא כתיבה ישירה
לראיות המוגנות.

1.1.4 `connect_worker_runtime` — עבודות Worker בלבד; ללא גישה ל־Release evidence,
ל־Operator events או ל־Nonce ledger.

1.1.5 `connect_verifier_runtime` — שירות Verifier מבודד. מקבל `EXECUTE`
רק על Wrapper פרסום חיצוני אחד ועל Readback function מצומצמת אחת. פונקציית
הקריאה מחזירה רק Snapshot עבור זהות Release מפורשת; היא אינה מעניקה ל־Role
`SELECT` ישיר על ארבע הטבלאות. אין לו `EXECUTE` על פונקציות 0044, 0046 או
0047.

1.2 עד שכל חמשת ה־Principals וארבע יכולות ה־Login קיימים ומוכחים, Bot Release Evidence נשאר
Fail-closed ואסור לסמן את Operator כ־Ready.

## 2. הסבר למתחילים

2.1 כיום אותו `DATABASE_URL` משמש גם את האפליקציה וגם כלים בעלי כוח גבוה.

2.2 המשמעות היא שגם אם הקוד הרגיל כותב Audit, חיבור ישיר עם אותה זהות יכול
לעדכן את הטבלה בלי לעבור במסלול המאודט. גם הפרדה לשתי זהויות בלבד אינה
מספיקה: API או Worker שמחזיקים באותו Runtime login יכולים לעקוף את שירות
האימות ולקרוא לפונקציה פנימית חלקית.

2.3 ההפרדה יוצרת את הגבול הבא:

```text
CI / one-shot migrator ── POSTGRES_MIGRATION_URL ──► connect_migrator_login
                                                        │ explicit SET ROLE
                                                        ▼
                                             connect_migration_owner NOLOGIN
                                                        │ owns schema
API ──────────────── POSTGRES_API_URL ────────────────► │ business data only
Worker ───────────── POSTGRES_WORKER_URL ─────────────► │ no protected access
Verifier service ─── POSTGRES_VERIFIER_URL ──────────► │ EXECUTE publish + readback
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

4.1.5 אין `POSTGRES_OWNER_URL`: ‏`connect_migration_owner` הוא `NOLOGIN`
ואסור ליצור עבורו Credential שניתן לחיבור.

4.2 הרשאות משותפות לשלושת Runtime roles:

4.2.1 ללא `SUPERUSER`,‏ `BYPASSRLS`,‏ `CREATEROLE` או בעלות על הטבלאות.

4.2.2 ללא חברות ב־migration-owner role.

4.2.3 ללא `CREATE` ב־Schema וללא `TEMPORARY` כברירת מחדל.

4.3 מטריצת Capability:

4.3.1 API — ללא גישה ישירה לארבע טבלאות הראיות המוגנות. הוא רשאי לקבל רק
תוצאת Readiness מצומצמת משירות Verifier מבודד, לאחר שיוגדר חוזה שירות נפרד.

4.3.2 Worker — ללא הרשאה לארבע הטבלאות המוגנות וללא פונקציות הפרסום ב־D31-A.
ה־Worker הנוכחי תלוי ב־`bot_reply_staging_runs`; לפני Activation נדרש לבחור
Wrapper מצומצם או לפצל בין נתוני תזמון לבין Receipt מוגן. עד אז אין Grant.

4.3.3 Verifier — ללא `SELECT` ישיר על הטבלאות. הוא מקבל `EXECUTE` רק על
Wrapper הפרסום של Commit C ועל Readback function בעלת SQL קבוע, זהות Release
מלאה, `LIMIT 2` ופלט עמודות סגור הדרוש לאימות חתימה וקשרים.

4.3.4 כל שלושת ה־Runtime roles — ללא `EXECUTE` על 0044, 0046 ו־0047;
ללא `INSERT`,‏ `UPDATE`,‏ `DELETE` או `TRUNCATE` ישיר בטבלאות המוגנות.

4.4 פונקציות `SECURITY DEFINER`:

4.4.1 `search_path` נעול ל־Schema אמין, כאשר `pg_temp` אחרון.

4.4.2 שמות Tables ו־Functions מלאים וללא Dynamic SQL.

4.4.3 `PUBLIC EXECUTE` מבוטל מיד באותה Transaction שבה נוצרת הפונקציה.

4.4.4 Readback function רצה כ־`SECURITY DEFINER`, אינה מקבלת שם טבלה או SQL
דינמי, ואינה מחזירה את ה־Snapshot ל־API או ל־Worker. רק הקוד המבודד של
Verifier ממיר אותו לפלט Readiness המצומצם.

4.5 מצב המימוש הנוכחי:

4.5.1 Migration 0049 וה־Read repository משתמשים כעת ב־Readback function
מצומצמת במקום `SELECT` ישיר. הפונקציה נשארת `SECURITY INVOKER`, ללא Grant
ל־Runtime, ולכן היא Dormant ואינה עוקפת הרשאות Table.

4.5.2 לפני Activation יש להעביר את בעלות הפונקציה ל־`connect_migration_owner`, להפוך
אותה ל־`SECURITY DEFINER` רק באותה Transaction שבה נבדק ה־ACL המלא, ולהעניק
`EXECUTE` רק ל־`connect_verifier_runtime`.

4.6 חוזה Configuration מקומי:

4.6.1 `postgresRuntimeCapabilityConfiguration.ts` מגדיר ארבעה URL keys
וארבעה Login roles קנוניים. כל Service configuration חייב להעביר Environment
מצומצם ומפורש ולקבל URL אחד בלבד; אין קריאת `process.env` מרומזת.

4.6.2 ה־Inspector נכשל סגור אם קיים `DATABASE_URL`, אם Secret של Capability
אחר נמצא ב־Environment snapshot שסופק, אם ה־Username אינו תואם ל־Role הצפוי או אם Runtime
של Railway משתמש ב־Loopback/Public host. ‏Migration מרוחק מוגבל ל־Railway
private hostname או ל־Railway TCP proxy.

4.6.3 החוזה Dormant ואינו מחובר ל־Startup. ‏Development/Test/Integration
הקיימים יכולים להמשיך להשתמש זמנית ב־`DATABASE_URL` דרך ה־Pool הישן, אך אין
Fallback כזה בתוך חוזה ה־Capability החדש.

4.6.4 מצב Configured מחזיר Metadata לא־רגיש בלבד. URL,‏ Password
ו־Connection string אינם נכללים בתוצאה הניתנת ל־Serialization.

## 5. סדר ביצוע

5.1 Expand:

5.1.1 ליצור פונקציות CAS + Audit אטומיות בלי להפעיל עדיין Trigger חוסם.

5.1.2 להעביר את Repositories לקריאה לפונקציות.

5.1.3 ליצור Readback function מצומצמת עבור Snapshot האימות, ללא Grant
ישיר על הטבלאות.

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

5.4.3 להעניק `EXECUTE` על Wrapper הפרסום ועל Readback function ל־Verifier
capability בלבד.

5.4.4 להפעיל מחדש Worker, אחריו API, ורק אז לפתוח Kill switch.

## 6. בדיקות קבלה

6.1 Verifier מצליח לפרסם Evidence רק דרך ה־Wrapper החיצוני.

6.2 API, Worker ו־Verifier נכשלים ב־`UPDATE`,‏ `INSERT`,‏ `DELETE`
ו־`TRUNCATE` ישיר לטבלאות המוגנות.

6.3 API, Worker, Verifier, Role זר ו־`PUBLIC` נכשלים ב־`EXECUTE` על
0044, 0046 ו־0047.

6.4 API ו־Worker נכשלים בכל גישה לארבע טבלאות הראיות וב־`EXECUTE` על
Readback; Verifier מצליח רק בשני ה־Wrappers ואינו מצליח ב־`SELECT` ישיר.

6.4.1 ה־Readback מחזיר אפס או שורה אחת לזהות Release מדויקת, ושתי התאמות,
זהות שגויה או Row מורחב נכשלות סגור ב־Repository.

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
