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

4.7 חוזה Candidate evidence רדום — D31-B:

4.7.1 `postgresRuntimeCapabilityEvidence.ts` מכיל שאילתת Catalog סטטית,
Read-only ובעלת Statement יחיד. תוצאה שעוברת את כל הבדיקות מקבלת רק
`status: "candidate"`; השדה `activationAllowed` נשאר תמיד `false`. זה אינו
Live verifier, אינו Evidence מאושר ואסור לחבר אותו ל־Runtime, ל־Startup,
ל־Release gate או ל־Production readiness.

4.7.2 ה־`query` המוזרק ל־Probe הוא Dependency לא־מהימן ויכול להחזיר שורה
מזויפת. Driver חי עתידי חייב להיות רכיב פנימי בבעלות Connect, לפתוח בדיוק
ארבעה חיבורים שנלקחו בנפרד מארבעת Secrets של היכולות, ולהריץ כל Probe על
Pinned connection בתוך `REPEATABLE READ READ ONLY`. לפני השאילתה עליו להגדיר
ולאמת `search_path` בטוח בפקודה נפרדת. עליו לאמת גם את שמות העמודות ואת
PostgreSQL field OIDs, ולנרמל את תוצאת `pg` במפורש ל־`{ rowCount, rows }`;
`QueryResult` גולמי עם שדות נוספים נכשל סגור. רק לאחר מכן מותר לאגד את ארבע
התוצאות ל־Aggregate קנוני מסוג all-or-nothing. ארבע Transactions נפרדות אינן
Snapshot אטומי של PostgreSQL; Probe בודד לעולם אינו מספיק ל־Activation.

4.7.3 ה־Evidence החי חייב להיקשר ל־Release SHA מדויק, ל־Policy version,
לזמן מסד שנצפה ול־TTL קצר, ולכלול Digests של כל ארבע תוצאות היכולת. ערך
`system_identifier` הצפוי חייב להגיע Out-of-band כשהוא חתום בידי בעל
ה־Deployment; ערך שה־Database עצמו סיפק אינו מקור אמון לעצמו.

4.7.4 `pg_stat_ssl` מוכיח רק שה־Session בצד השרת מוצפן. לפני Activation נדרש
Evidence חיצוני נפרד עבור CA ו־Hostname verification עם
`rejectUnauthorized=true`, וכן עבור Railway project, environment, region,
network policy ובידוד כל Secret לשירות היחיד שמורשה להחזיק אותו.

4.7.5 בדיקת Metadata של פונקציה אינה מוכיחה שה־Body או ה־Triggers לא הוחלפו.
Driver חי חייב להשוות SHA-256 של `pg_get_functiondef()` ושל Inventory מלא של
Triggers מול Manifest דטרמיניסטי שנוצר ממסד נקי לאחר Migrations מאושרות.

4.7.5.1 ה־Probe דורש שבעלות Schema ‏`public` תהיה של
`connect_migration_owner`, ושלא תהיה הרשאת `CREATE` ל־`PUBLIC` או לשום Role
אחר. בדיקת הרשאת ה־Session לבדה אינה מספיקה, משום ש־Role זר בעל `CREATE`
יכול להפוך את ה־Schema ללא־מהימן.

4.7.6 הפלט הרדום מסונן: אין בו URL,‏ Host,‏ Database name,
`system_identifier`,‏ Password או הודעת Database גולמית. כשל Query או מבנה
שורה לא מדויק מחזיר `blocked` בלבד.

4.7.7 קיימים שני Blockers לפני הקשחת `search_path`: קוד ה־API וה־Worker עדיין
ניגש ישירות ל־`bot_reply_staging_runs`, וחלק מפונקציות ה־Trigger ב־Migration
0033 פונות ל־`audit_logs` בשם לא־מלא. לפני Activation יש להעביר Claim,
Reclaim,‏ Poll ו־Complete ל־Wrappers מצומצמים, להסיר Direct table grants,
ולשנות את ההפניה ל־`public.audit_logs` לפני נעילה ל־`pg_catalog, pg_temp`.

4.7.8 ה־Source Guard מסווג את ה־Probe כ־Dormant ללא Importer מורשה. כל Import
עתידי מתוך API,‏ Worker,‏ Startup או Runtime חייב להפיל את שער הקוד.

4.8 חוזה Trusted driver רדום — D31-C1:

4.8.1 `postgresRuntimeCapabilityTrustedDriverContract.ts` מקבע Contract בלבד.
הוא אינו מייבא `pg`, אינו קורא Environment או Secret, אינו פותח Connection
ואינו מחובר ל־Runtime. גם הוא מוגדר Dormant וללא Importer מורשה.

4.8.2 סדר ה־Session המחייב הוא:

```text
connect
→ BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY
→ SET LOCAL search_path TO pg_catalog, pg_temp
→ verify transaction + search_path
→ fixed catalog query with rowMode=array
→ ROLLBACK
→ close
```

4.8.3 ה־Probe עצמו מצפה מעתה ל־`pg_catalog, pg_temp`; ‏`public` אינו חלק
מ־`search_path`. כל גישה ל־Schema ‏`public` משתמשת בשם מלא או ב־Catalog
מפורש ולכן אינה תלויה ב־Name resolution של `public`. אותה שאילתת Read-only
בודקת גם שה־Schema בבעלות `connect_migration_owner` ושאין `CREATE` ל־Role זר;
רק תוצאה שבה הבדיקה עוברת יכולה לקבל `candidate`.

4.8.4 חוזה Field קנוני מקבע 35 עמודות Boolean בדיוק, בסדר ה־SELECT, עם
`dataTypeID=16`,‏ `format=text`,‏ `tableID=0` ו־`columnID=0`. Driver עתידי
חייב להשתמש ב־`rowMode: "array"`, לדחות Field חסר, נוסף או מוחלף, וליצור
אובייקט חדש ומצומצם במקום להעביר `QueryResult` גולמי.

4.8.4.1 שורת ה־Preflight היחידה חייבת להיות בדיוק
`[true, true, true, true]`. סדר שלושת פרמטרי ה־Catalog קבוע:
`$1=expectedDatabaseName`,‏ `$2=expectedSystemIdentifier` שמגיע מ־Binding
חתום Out-of-band, ו־`$3=expectedLoginRole` שנגזר מ־Capability registry.

4.8.5 Timeout אינו נחשב ביטול עד שה־Driver משמיד את ה־Client שבבעלותו. החוזה
דורש `destroy-client` ב־Timeout או Abort, ‏late cleanup לחיבור שהושלם לאחר
Deadline, ‏Cleanup deadline, והשמדת Client גם בכשל Close. בכל Query failure
נדרשים Rollback ולאחריו השמדה. ‏`Promise.race` לבדו אינו עומד בחוזה.

4.8.6 בדיוק ארבע היכולות נדרשות בסדר `api`,‏ `worker`,‏ `verifier`,‏
`migration`. תוצאה חלקית אסורה. גם אם כולן עוברות, הסטטוס נשאר `candidate`
ו־`activationAllowed:false`; אין לטעון ל־Snapshot אטומי בין ארבעה Sessions.

4.8.7 נותרה החלטה תפעולית חיצונית: Job מבודד וחד־פעמי שמקבל ארבעה Secrets
קצרי־חיים, או ארבע Attestations חתומות שכל שירות מפיק בנפרד. אסור לשירות
Runtime קבוע להחזיק את כל ארבעת Secrets, וה־Contract אינו בוחר אפשרות בשם טל.

4.8.8 D31-C2 יוכל לממש Client פנימי ובדיקת PostgreSQL 16 חיה רק לאחר בחירת
הטופולוגיה. D31-C3 יוסיף Release binding, זמן מסד, TTL, ארבעה Digests,
חתימת `system_identifier` ממקור Out-of-band וראיות TLS חיצוניות. עד אז
Activation נשאר NO-GO.

4.8.9 חוזה C2 העתידי מחייב כבר ב־Startup את
`default_transaction_read_only=on`, מגבלת `idle_in_transaction_session_timeout`,
אימות TLS מסוג CA + Hostname בסביבות Staging/Production ו־Extended protocol
עם שלושת הפרמטרים הקבועים. ערכים אלה הם תנאי מימוש, לא הוכחה שהם פעילים כעת.

4.8.10 Rehearsal מקומי ב־2026-08-25 מול PostgreSQL 16.13 הריץ את הסדר הקבוע
כ־`connect_api_runtime`: ארבעת שדות ה־Preflight וכל 35 שדות ה־Catalog תאמו
בשם, סדר, OID ופורמט; ה־Probe החזיר 35/35 ו־`activationAllowed:false`.
זו הוכחת תאימות מקומית בלבד, לא Evidence של Railway או אישור Production.

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
