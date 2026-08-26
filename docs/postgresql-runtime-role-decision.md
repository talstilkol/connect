# D31 — הפרדת זהויות PostgreSQL ל־Migration, API, Worker ו־Verifier

תאריך: 2026-08-26

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

4.3.1 API — ללא גישה ישירה לארבע טבלאות הראיות המוגנות. עבור תיאום Run עתידי
הוא יוכל לקבל `EXECUTE` רק על Claim ו־Read המצומצמים; עבור Release evidence
הוא רשאי לקבל רק תוצאת Readiness מצומצמת משירות Verifier מבודד. כרגע אין
Grant לאף אחת מהיכולות.

4.3.2 Worker — ללא הרשאה לארבע הטבלאות המוגנות וללא פונקציות הפרסום ב־D31-A.
עבור תיאום Run עתידי הוא יוכל לקבל `EXECUTE` רק על Complete ועל Fence נפרד
לפעולת Provider/Observation. הוא אינו מקבל Claim או Read. עד אז אין Grant.

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

4.7.7 Migration ‏`0050_bot_reply_staging_trigger_hardening.sql` פתר את תת־החסם
של Migration ‏0033: שתי כתיבות ה־Audit משתמשות כעת ב־`public.audit_logs`, כל
חמש פונקציות ה־Trigger נעולות ל־`pg_catalog, pg_temp`, נשארות
`SECURITY INVOKER`, ו־`PUBLIC EXECUTE` מבוטל. Rehearsal מקומי מבודד מול
PostgreSQL 16.13 הוכיח שגם תחת `search_path` עוין שני אירועי ה־Audit נכתבים
רק לטבלה המלאה. זו הוכחה מקומית ולא Evidence של Railway או Production.
ההקשחה חלה בדיוק על חמש פונקציות ה־Trigger של Migration ‏0033 בלבד; היא
אינה טענה שכל פונקציות ה־Trigger במסד כבר מוקשחות. הקשחת הפונקציות של
Migrations ‏0034 ו־0035, ושאר Inventory ה־Triggers, נשארת שלב נפרד ופתוח.

4.7.7.1 ה־Blocker הרחב עדיין פתוח: קוד ה־API וה־Worker ניגש ישירות
ל־`bot_reply_staging_runs`. לפני Activation יש להעביר Claim,‏ Reclaim,‏ Poll
ו־Complete ל־Wrappers מצומצמים, להסיר Direct table grants, ולצרף Manifest
חתום עם Digests מלאים של Function bodies ו־Trigger inventory. ‏Migration
0050 אינה יוצרת Wrapper, Role,‏ Grant או חיבור Runtime.

4.7.7.2 Migration ‏`0051_bot_reply_staging_run_capability_wrappers.sql`
מכינה שלוש יכולות Lifecycle רדומות: Claim/Reclaim אטומי, Read/Poll מצומצם
ו־Complete/Replay אטומי. כל שלוש הפונקציות משתמשות בשמות `public.*` מלאים,
ב־`pg_catalog, pg_temp`, ב־`ROWS 1`, ב־`SECURITY INVOKER` וב־Database clock.
Lease מחושב במסד למשך 60–3,600 שניות; Complete מותר רק בטווח חצי־פתוח
`database_now < lease_expires_at`, בעוד Reclaim מותר החל מנקודת התפוגה.
הפונקציות מחזירות פלט סגור ונכשלות ללא Row oracle מול Tenant,‏ Request,
Audit,‏ Release,‏ Commit,‏ Artifact,‏ Claim version ו־Lease שונים.
Replay של Completion דורש גם Digest קנוני זהה וגם את אותם bytes של
`receipt_json`; שינוי ייצוג, גם אם ה־JSON שקול סמנטית, נכשל סגור כ־Conflict.
ה־bytes נוצרים רק באמצעות
`serializeCanonicalBotReplyStagingReceipt()` — לא באמצעות `JSON.stringify()`
של ה־Repository הישן.

4.7.7.3 ‏0051 אינה Activation ואינה סוגרת עדיין את חסם Direct DML. אין בה
`SECURITY DEFINER`,‏ Role,‏ Grant,‏ שינוי Startup או Importer. לפני שימוש חי
נדרשים לכל הפחות: הקשחת שש פונקציות 0034/0035; Wrapper אטומי ששומר Provider
operation reservation ו־Observation תחת אותו Claim fence; Request identity
חדש שקושר גם `requestedAt`; מניעת Audit insert מזויף; מעבר Repositories
מה־SQL הישיר; Adapter שמוסר ל־Complete רק bytes של JSON קנוני כך שה־Digest
שנגזר באפליקציה זהה ל־SHA-256 שהמסד גוזר מה־UTF-8 המדויק; Owner/Role
transaction אטומית; ו־Manifest חתום. Legacy direct
release-evidence repository חייב לצאת מה־API לפני Activation. בנוסף, ה־API
המקומי עדיין קורא `complete()` פעם נוספת אחרי השלמת Worker; לפני Grants יש
להסיר את ה־double-complete או לעצב חוזה Replay נפרד שאינו נותן ל־API הרשאת
Complete של Worker.

4.7.7.4 Migration
`0052_bot_reply_staging_authorization_observation_hardening.sql` מקשיחה את
שש פונקציות ה־Trigger של 0034/0035, ומקשיחה מחדש גם את Guard שינוי ה־Audit
של Run. כל הפונקציות נשארות `SECURITY INVOKER`, ננעלות ל־
`pg_catalog, pg_temp`, משתמשות בשמות `public.*` מלאים ומאבדות
`PUBLIC EXECUTE`. ‏Observation מתקבל רק כאשר זמן המסד עדיין בתוך Lease
חצי־פתוח, ורק כאשר `observedAt` אינו בעתיד ואינו שווה לנקודת התפוגה.

4.7.7.5 ‏0052 מוסיפה Guard רדום ל־`audit_logs`. ארבע פעולות ה־Audit שבבעלות
Triggers נדחות ב־Insert ישיר, ב־Trigger זר וב־Update מפעולה רגילה לפעולה
שמורה. Insert חוקי חייב להגיע כ־Trigger מקונן וגם להתאים בדיוק ל־Run או
ל־Authorization המקוריים לפי Tenant,‏ Actor,‏ Target,‏ Idempotency key,
Timestamp ו־Metadata. הוכחת ה־Commit המבודד מול PostgreSQL 16.13 עברה עם
53 Migrations ו־63 תרחישי מקביליות. הוכחת Working Tree רחבה יותר עברה עם
אותן 53 Migrations ו־92 תרחישים, כולל `search_path` עוין, Source spoof
ו־ACL/Trigger drift. אף אחת מהן אינה הוכחת Railway או Production.

4.7.7.6 גם 0052 אינה Activation. היא אינה מוסיפה Role,‏ Grant,
`SECURITY DEFINER`, Repository importer או Provider call. לפני כל Grant
נותרו חסומים: Authorization שמסתמך עדיין על `recordedAt` של ה־Caller במקום
על שעון המסד; Provider side effect שאינו שמור לפני Meta תחת Staging claim;
Observation ישיר שאינו נגזר אטומית מרשומות Provider;‏ `requestedAt` שאינו
קשור ל־Claim attempt; ה־Repository הישיר; API double-complete; ומעבר
Owner/Role עם Manifest חתום. גבול Provider בטוח חייב להיות Two-phase:
Reservation יחידה לפני Meta, ולאחר התוצאה Completion/Observation אטומי.
Crash אחרי Meta ולפני Completion מסומן `indeterminate` ואסור לבצע לו Retry
אוטומטי.

4.7.7.7 ‏D31-D1c מוסיף Candidate Adapter רדום בלבד עבור שלוש פונקציות
0051. הוא רשאי לבצע רק `SELECT` אל
`claim_bot_reply_staging_run_v1`,‏ `read_bot_reply_staging_run_v1` ו־
`complete_bot_reply_staging_run_v1`. ה־Adapter בודק קלט ופלט בעלי Shape
מדויק, דורש שורה יחידה, מנרמל Timestamps ומפיק בעצמו Canonical receipt JSON
ו־Digest. אסורים בו Direct DML, יצירת Pool, קריאת Environment, Transaction
orchestration, Startup wiring ו־Runtime importer.

4.7.7.8 ה־Source Guard מחזיק את ה־Adapter ואת ה־Dependency closure המדויק
שלו במצב Dormant. Import מ־API,‏ Worker,‏ Startup או קובץ Server לא מאושר,
וכן Dependency נוסף שאינו ב־Allowlist, חייבים להפיל את השער. הסלייס אינו
מתקן עדיין API double-complete,‏ `requestedAt`, Provider fence או Roles/
Grants, ולכן אינו משנה את החלטת ה־NO-GO להפעלה.

4.7.7.9 ‏D31-D1c-B מפריד את חוזי היכולת לפי Least privilege. קובץ ה־Domain
`botReplyStagingRunCapabilityPorts.ts` הוא Type-only: ל־API מותרות רק פעולות
`claim` ו־`read`, ול־Worker מותרת רק `complete`. אין חוזה ציבורי משולב עם
שלוש הפעולות. ה־PostgreSQL Adapter מפיק שני אובייקטים קפואים בעלי מפתחות
מדויקים, וכל Factory מאמת ותופס את פונקציית ה־Query בנפרד. מפת ה־SQL נשארת
פרטית למודול ואינה Runtime API.

4.7.7.10 גם שני ה־Ports וה־Factories נשארים Dormant. ה־Source Guard מתיר
רק `import type` של ה־Ports, אוסר בהם הצהרת Runtime ואוסר `module
augmentation` חיצוני שמרחיב את סמכויותיהם. הוא ממשיך לחסום כל Import פעיל
של ה־Adapter מתוך API,‏ Worker או Startup. הפיצול אינו Grant במסד ואינו גבול
אבטחה מספק בפני עצמו. אין לחברו לפני ביטול API double-complete, קשירת
`requestedAt`, השלמת Provider fence והפרדת Roles/Credentials בפועל.

4.7.7.11 Migration
`0053_bot_reply_staging_provider_operation_fence.sql` מוסיפה גבול Two-phase
רדום לפני פעולת Provider. היא יוצרת שני Ledgers מצומצמים, PII-free
ו־Append-only: Reservation של Operation תחת זהות מדויקת של Run,‏ Release,
Claim,‏ Delivery ו־Rate-limit reservation; ו־Outcome יחיד לאותה Operation.
`reserve_bot_reply_staging_provider_operation_v1` שומר את ה־Operation ואת
`bot_reply_provider_request_claims` באותה Transaction ובזמן Database clock.
רק Insert חדש מחזיר `authorized`,‏ `providerRequestKey` ו־`requestedAt`;
Replay תואם מחזיר `replay-blocked` ללא Token וללא Timestamp, ו־Replay בזהות
שונה נכשל סגור. הפונקציה דורשת `READ COMMITTED`, נועלת לפי הסדר Run,‏ Meta
connection,‏ Delivery ו־Rate-limit reservation, ורק לאחר כל המתנה ל־Lock
דוגמת מחדש את שעון המסד ובודקת את ה־Lease, ה־Policy וה־Authorization
האחרונים. Settlement מסוג `cancelled-before-submit` ו־Reserve מתחרים על אותה
Reservation: הראשון שמתחייב מנצח, והפעולה הסותרת נכשלת סגור.

4.7.7.12
`finalize_bot_reply_staging_provider_operation_v1` אינו מקבל Verdict,‏ זמן,
Provider message id או שגיאת Provider מה־Caller. הוא נועל את ה־Operation,
ואחריו את ה־Delivery, ה־Rate-limit reservation ואת Request fence. גם כותבי
עובדות ה־Provider נועלים Delivery,‏ Reservation ו־Request באותו סדר, והשעון
נדגם רק לאחר הנעילות. כך Finalize גוזר תוצאה רק מעובדות Durable ומקושרות:
Acceptance,‏ Sender/Pair deferral,‏ שגיאת חלון שירות 131047 או Delivery
`ambiguous`. לפני תפוגת ה־Lease, היעדר עובדה מחזיר `pending`; לאחר התפוגה הוא
נסגר כ־`lease-expired-without-outcome` במצב `indeterminate`, ולכן אינו יוצר
Retry אוטומטי. הכנסת Outcome PII-free והחזרת Finalization הן פעולה אטומית.
Guard נוסף חוסם Reclaim או Complete של Run כל עוד אין Outcome במצב
`completed`; גם Outcome מסוג `indeterminate` מחייב Reconciliation ידני.

4.7.7.13 ה־Candidate Adapter של D31-D1d-A הוא Worker-only ומפרסם רק
`reserve` ו־`finalize` מעל שתי שאילתות `SELECT` קבועות. הוא דורש Dependency
מדויק בשם `committedQueries.queryCommitted`, מאמת את 14 שדות הזהות ואת
`providerRequestKey` הדטרמיניסטי, ודוחה Result shape,‏ Null matrix או
Timestamp עוינים. ה־Source Guard נועל גם את Union branches של תוצאות
Reserve/Finalize, כך ש־Token ב־Replay או ערבוב בין `completed` ל־
`indeterminate` מפילים את השער. אין ב־0053 או ב־Adapter Role,‏ Grant,
`SECURITY DEFINER`,‏ Startup wiring,‏ Meta transport או Provider I/O.

4.7.7.14 ‏D31-D1d-A אינו Activation והחלטת ה־NO-GO נשארת. השם
`queryCommitted` הוא Misuse fence ברמת האפליקציה בלבד; הוא אינו הוכחה
קריפטוגרפית או תפעולית שה־Transaction בוצעה לפני שה־Token הגיע ל־Worker.
לפני חיבור חי נדרש Trusted autocommit driver או Outbox/Commit acknowledgment
שמוכיחים Commit-before-token. בנוסף נדרשים Recheck מיידי לפי Database clock
של חלון השירות בן 24 השעות, ה־Lease וה־Credential לפני `sender.send`, הכללת
ה־Functions וה־Digests ב־Manifest, חיבור Runtime מבוקר, הפרדת Roles/Grants
ומסלול Audit מבוקר ליישוב `indeterminate` ועובדות Provider מאוחרות. עד שכל
אלה נבדקים ב־Staging, אסור ל־Adapter או ל־Migration החדשים לאשר קריאת Meta
אמיתית.

4.7.7.15 ההוכחה ההתנהגותית של D31-D1d-A רצה על PostgreSQL 16 נקי והחילה
את כל 54 ה־Migrations. היא הוסיפה תשע קבוצות בדיקה: Reserve/Replay מקבילים,
Rollback, דחיית Isolation שאינו `READ COMMITTED`, תפוגת Run ו־Reservation
בזמן המתנה ל־Lock, שני סדרי המרוץ מול Cancellation,‏ Provider acceptance
שמתחייב לאחר תפוגת ה־Lease, ו־Finalize ללא עובדה עם חסימת ראיה מאוחרת,
Settlement ו־Reclaim. ההרצה הסתיימה ב־101 תרחישי Concurrency שעברו. זו הוכחת
Database ל־Migration הרדומה בלבד; היא אינה מוכיחה Commit-before-token,
חלון שירות בן 24 שעות ברגע השליחה או Least privilege של Runtime.

4.7.7.16 ה־Postcondition של 0053 מאמת את שמות וטיפוסי 29 העמודות, את
Bindings של ה־Functions/Triggers ואת היעדר הרשאות `PUBLIC`. אין לכנותו
הוכחת Catalog מלאה: הוא עדיין אינו מקבע כל `NOT NULL`,‏ Constraint,‏ Index,
`tgtype` או Grant ל־Role מזוהה. חוזים אלה שייכים להקשחת D31-D1e ול־Manifest
ההרשאות לפני Deployment.

4.7.7.17 ‏D31-D1d-B-A מוסיף Factory רדום ומצומצם בשם
`nodePostgresBotReplyStagingProviderFenceWorkerCapability.ts`. ה־Factory
מחזיק את `queryCommitted` בתוך Closure פרטי ומחזיר רק את ה־Worker capability
הקיים. הוא אינו חושף Pool,‏ Client,‏ SQL,‏ Raw row או Query executor ואינו
קורא Environment,‏ Credential או Meta transport.

4.7.7.18 בכל Reserve או Finalize ה־Factory מקבל Client ייעודי מה־Pool,
מבצע `ROLLBACK` קבוע כדי לסגור Transaction שנשארה פתוחה, ואחריו `DISCARD ALL`
כדי לאפס Role,‏ Session settings ו־GUCs. רק אז הוא מאפשר אחת משתי שאילתות
ה־SELECT הקבועות בעלות 14 Parameters. אין `BEGIN` או Callback חיצוני. התוצאה
עוברת Validation מבני ומועתקת רק לאחר שה־Promise של `node-postgres` הושלם
ב־`ReadyForQuery`; כשל Query,‏ Transport,‏ Validation מבני או Commit מסמן
את ה־Client להשמדה ואינו מחזיר `providerRequestKey`. גם כשל ב־`release`
נכשל סגור. Validation סמנטי נוסף של Identity ו־Union branch מתבצע ב־Repository
לאחר השחרור, אך כשל בו עדיין אינו מוסר מפתח ל־Caller.

4.7.7.19 ההוכחה ההתנהגותית רצה מול PostgreSQL 16 נקי עם כל 54 ה־Migrations.
Constraint ‏`DEFERRABLE INITIALLY DEFERRED` מכוון גרם ל־SELECT להפיק Row
אך ל־implicit Commit להיכשל. Sequence לא־טרנזקציוני הוכיח שה־Trigger הדחוי
אכן הופעל; אותו Fixture הצליח לאחר הסרת Target החסימה. ה־Caller לא קיבל
מפתח, ולאחר Rollback נמצאו אפס רשומות Operation ואפס Provider request
claims עבור זהות הניסיון.
שני Reserve מקבילים דרך
ה־Factory החזירו Authorization יחיד ו־Replay חסום ללא מפתח, ונשמרו בדיוק
Operation אחת ו־Request claim אחד. הרצת האינטגרציה המלאה דיווחה PASS עבור
54 Migrations ו־101 תרחישי Verification ו־Concurrency.

4.7.7.20 זהו GO רק ל־Commit-before-`providerRequestKey` בקוד רדום. ה־Source
Guard חוסם Import ישיר ועקיף מ־API,‏ Worker,‏ Startup ו־Runtime ומתיר Import
יחיד מסקריפט האינטגרציה. ה־Activation נשאר NO-GO: מסלול השליחה החי עדיין
מפענח Access token מוקדם מדי, ואין עדיין Credential revision,‏ tenant submit
barrier או pre-send permit שבודק לפי Database clock את חלון 24 השעות, ה־Lease,
ה־Policy, ה־Authorization, ה־Connection, ה־Reservation וה־Kill switch.
לפני Activation נדרשים גם Pool ייעודי שמקובע ל־`pg` ול־Role המזוהה של D1e,
חסימת A2 של Child processes ושל Package execution graph בכל Scripts/Startup,
‏Deadline וראיית Reconciliation למקרה שבו Commit הצליח אך `ReadyForQuery`
לא הגיע ל־Worker.

4.7.7.21 ‏D31-D1d-B-A1 מקשיח את ה־Source Guard באמצעות ניתוח AST מודע
ל־Lexical scope בכל קובצי המקור ובכל קובצי `scripts/**` שהתגלו ישירות. הוא
חוסם רכישת יכולת `eval` או `Function`, לרבות Alias דרך Declaration או
Assignment,‏ Indirect eval,‏ שרשרת או Comma expression של `globalThis`,
‏`Reflect.get` בעל מפתח סטטי, מפתח Computed שניתן לקיפול סטטי ו־Function
constructor הנרכש מ־Callable מזוהה, מ־Bound callable או משרשרת default
`constructor` מזוהה; הוא חוסם Runtime acquisition של
`node:vm`, לרבות Alias או שרשרת של `process`; והוא חוסם
`createRequire`,‏ `register`,‏ `registerHooks`,‏ `runMain`,‏ Namespace/default
של `node:module`, כל רכישה של אובייקט CommonJS `module` או `require`,
‏`module.require` ו־`process.getBuiltinModule`. שמות מקומיים שמסתירים
`eval`,‏ `Function`,‏ `Reflect`,‏ `process`,‏ `require` או `module`, מאפייני
Object בעלי שם דומה, Type-only references וה־Import המצומצם `builtinModules`
אינם מסווגים כיכולת הרצה. Contract test מקבע גם את Runtime self-binding של
Named function/class expressions שעליו נשען ה־Binder. בדיקות שליליות ייעודיות
מקבעות גבולות אלה גם סביב ה־Provider fence הרדום. A1 אינו Sandbox ואינו סוגר
את A2: ‏`spawn`,‏ `execFile`,‏ `fork`, Node loader flags,‏ `NODE_OPTIONS`,‏
Shell commands,‏ `package.json.scripts`,‏ Directory symlinks תחת `scripts`
ו־Script-to-Script execution edges טרם נכנסו ל־Execution graph. לכן
ה־Activation נשאר NO-GO.

| A1 acceptance case | תוצאה נדרשת |
| --- | --- |
| `eval`,‏ `Function`,‏ Assignment alias,‏ Global chain,‏ Comma,‏ `Reflect.get`, מפתח סטטי מקופל, Bound callable או שרשרת `.constructor` מזוהה | חסימה באמצעות `DYNAMIC_CODE_EXECUTION_FORBIDDEN` |
| `node:vm` דרך ESM,‏ CommonJS,‏ Process alias/chain או `process.getBuiltinModule` | חסימה באמצעות `VM_RUNTIME_EXECUTION_FORBIDDEN` |
| `createRequire`,‏ Module hooks,‏ Global `require`, כל אובייקט CommonJS `module` או `module.require` | חסימה באמצעות `RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN` |
| Lexical shadow מקומי, Object property דומה או Type-only reference | מותר, ללא False positive |
| `declare` ללא Runtime binding | אינו נחשב Shadow ואינו עוקף חסימה |
| Child process,‏ Node flags,‏ Shell,‏ Directory symlink או Package/script execution edge | A2 — עדיין חוסם Activation, ללא טענת כיסוי ב־A1 |

4.7.7.22 Migration
‏`0054_meta_credential_revision_ledger.sql` מוסיפה חוזה B1 רדום וזהות Revision
ל־Meta credentials. PostgreSQL מוסיף ל־`meta_credential_envelopes` את
`credential_revision` ואת `envelope_digest`, וגוזר את שניהם בעצמו. Insert ראשון
מקבל Revision ‏1; Replay של אותם Bytes אינו משנה Revision, Digest או Timestamp;
Rotation אמיתי מגדיל Revision בדיוק באחד; וכל ניסיון לחזור ל־Digest היסטורי של
אותו Tenant נכשל סגור. גם `created_at` וגם `updated_at` נגזרים מ־Database clock
ברזולוציית Millisecond ואינם מתקבלים מהקורא כראיית Audit מהימנה.

4.7.7.23 הטבלה `meta_credential_revision_events` היא Ledger מצומצם ו־Append-only.
היא שומרת רק Event key דטרמיניסטי, Tenant,‏ Revision,‏ Digest,‏ Key format וזמן
מסד; היא אינה שומרת IV,‏ Ciphertext,‏ Access token,‏ Provider identifier או PII.
Insert מותר רק מתוך Trigger העומק המדויק שמקליט את גרסת ה־Envelope הפעילה;
`UPDATE`,‏ `DELETE` ו־`TRUNCATE` ישירים נחסמים. ה־Postcondition וה־Verifier
מקבעים לכל שבעת ה־Triggers גם את `tgfoid` ואת Function ה־`pg_proc` המדויק, ולא
רק את שם ה־Trigger או `tgtype`.

4.7.7.24 ה־Verifier של B1 מקבל רק URL ללא Userinfo,‏ Query או Fragment אל מסד
מקומי ייעודי בשם `connect_meta_credential_revision_ledger`, עם Loopback ו־Port
מפורש. הוא החיל את כל 55 ה־Migrations על PostgreSQL 16.13, הוכיח Backfill,
Replay,‏ Rotation מקביל,‏ Rollback,‏ Atomic failure,‏ Spoofing,‏ Digest reuse,
Redaction ו־Catalog, ונבדק בשתי הרצות רצופות לאחר Cleanup שמוגבל למסד המקומי
הריק הזה. Rehearsal ה־Meta הקיים העתיק תחילה את חוזה Legacy בן שש העמודות,
החיל לאחר מכן את 0054, ואימת שמונה עמודות, Revision ‏1, Ledger ו־Database clock.

4.7.7.25 ‏B1 אינו Activation. Migration ‏0054 אינה מוסיפה `GRANT`, אינה משתמשת
ב־`SECURITY DEFINER` ואינה מחברת Repository,‏ Startup או Meta I/O. Runtime role
מוגבל אינו יכול עדיין להשתמש בשרשרת בלי Wrapper והרשאות Least-privilege
נפרדות; אסור לפתור זאת באמצעות גישה גולמית ל־Ledger. לפני Deployment חייב
Migration executor מוכח להריץ את כל 0054 ב־Transaction אחת. לפני שליחה נדרשים
גם B2 שקושר Authorization,‏ Run ו־Operation ל־Revision ול־Digest המדויקים,
One-shot pre-send permit,‏ Pinned client,‏ Tenant advisory-lock barrier
ו־Reconciliation למצב `indeterminate`. לכן Activation נשאר NO-GO.

4.7.7.26 Migration
‏`0055_bot_reply_staging_credential_bound_pre_send_permit.sql` מוסיפה את חוזה
B2a1 הרדום. `claim_bot_reply_staging_run_v2` פועל רק ב־`READ COMMITTED`, נועל
את זהות ה־Authorization וה־Credential הפעילה, וקושר את ה־Run ל־Revision,
ל־Envelope digest ולאירוע ה־Ledger המדויקים. תוצאת ה־Claim היא Digest-only:
היא יכולה להחזיר `completedAt` ו־`receiptDigest`, אך אינה מחזירה את
`receiptJson` הגולמי.

4.7.7.27 טבלת Admission binding בלתי־משתנה קושרת במדויק Tenant,‏ Run binding,
Run claim,‏ Authorization,‏ Credential identity,‏ Delivery,‏ Delivery claim,
Rate-limit reservation,‏ Sender,‏ Recipient,‏ Policy event,‏ Throughput וזמני
ה־Database. Composite foreign key קושר אותה לאותה רשומת Run credential
binding, ולא רק לאותו Tenant. אין ב־0055 פונקציית כתיבה לטבלה זו ואין Backfill.
לכן `reserve_bot_reply_staging_credential_bound_pre_send_permit_v2` נכשל סגור
ללא Binding שכבר
נוצר במסלול Admission מורשה עתידי; אין אפשרות להרכיב Authorization/Run של נמען
אחד עם חבילת Delivery/Reservation/Admission מלאה של נמען אחר, גם כאשר כולם
שייכים לאותו Tenant.

4.7.7.28 מפתח ה־One-shot permit אינו קלט של הקורא. הוא נגזר רק לאחר הנעילות
ומ־Database clock, וכולל Tenant, זהות Credential שמורה ו־`reserved_at`
שבבעלות מסד הנתונים. Replay מאותר לפי ה־Scopes הייחודיים, קורא מחדש את הרשומה
ומחשב את המפתח מתוך הזהות השמורה; Conflict שאינו זהה נכשל סגור. טבלאות
Consumption ו־Resolution נשארות ללא פונקציות כתיבה. Composite foreign keys
קושרים Consumption לאותו Permit ולאותו Provider request, ו־Resolution מסוג
`released` מחייב את זוג ה־Permit וה־Provider request שכבר נצרך.

4.7.7.29 ‏B2a1 אינו Activation. אין ב־0055 `GRANT`,‏ `SECURITY DEFINER`,
Provider I/O,‏ Runtime importer, פונקציות Consume/Release/Finalize/Reconcile או
Admission writer. ‏B2a2 חייב להוסיף Session advisory-lock שמקורו ב־DB על Client
מוצמד אחד, להחזיק אותו לאורך Consume, אישור Commit, קריאת Meta ו־Finalize, ולא
לשלוח כאשר אישור ה־Commit אינו ודאי. D1e חייב להוכיח Writer barrier לכל שינוי
רלוונטי, להפוך את `messages.occurred_at` לבלתי־משתנה, לבצע Recheck ל־Provider
cooldown ולספק Admission writer מצומצם. המסלול הישן
`reserve_bot_reply_staging_provider_operation_v1` נשאר ללא הרשאת Runtime.
עד להשלמת כל אלה Activation נשאר NO-GO.

4.7.7.30 Migration
`0056_bot_reply_staging_credential_bound_pre_send_session_barrier.sql` מוסיפה
את חוזה B2a2 הרדום. מפתח ה־Session advisory lock נגזר מאותו Tenant hash שכבר
משמש את מחסומי ה־Transaction ב־0054–0055. פעולת Acquire מקבלת רק `permitKey`,
מחשבת מחדש את זהות ה־Permit מתוך הרשומה הבלתי־משתנה, ואינה מקבלת או מחזירה
Tenant או Lock key. ‏Client שנכנס ל־Acquire חייב להיות נקי: Client שכבר מחזיק
Advisory lock כלשהו נחשב מזוהם ונכשל סגור; Backend אחר
שתפוס מחזיר `busy` בלי המתנה בלתי־מוגבלת. לאחר רכישת ה־Lock נבדקות גם
Provider operations לא־סופיות של אותו Tenant, אותו Sender scope או אותו
Recipient scope. כך גם העברת נכס בין Tenants אינה פותחת מסלול Send חדש מעל
Operation ישנה. Operation של Permit אחר מחזירה `blocked-unresolved` לאחר
Unlock מאומת. Operation יחידה של אותו Permit מחזירה
`reconciliation-required` רק כאשר שרשרת Released מלאה מוכחת, ובמצב זה נרכש
גם Reconciliation marker דטרמיניסטי נפרד. ה־Marker מבדיל בין חיבור שנרכש
לשליחה חדשה לבין חיבור שנרכש לפיוס בלבד; Proof ו־Consume דורשים בדיוק את
ה־Tenant lock היחיד ולכן אינם יכולים להפוך Reconciliation ל־Send. כל חריגה
לאחר הרכישה מפעילה Cleanup מפורש, משום ש־Session lock אינו מתבטל ב־Rollback.

4.7.7.31 פעולת Consume מקבלת רק `permitKey`, דורשת `READ COMMITTED` ובעלות
של ה־Backend הנוכחי על ה־Session lock המדויק, ונועלת מחדש את כל שרשרת Run,
Credential,‏ Authorization,‏ Connection,‏ Policy,‏ Delivery,‏ Message,
Reservation,‏ Cooldown,‏ Admission ו־Permit לפני דגימת Database clock אחת.
רק `text-send` ו־`button-send` הם Send-capable; תרחישי
`customer-window-expired`,‏ `provider-retry`,‏ `pair-limit` ו־
`duplicate-safety` אינם יכולים לפתוח Meta POST במסלול זה.

4.7.7.32 Consume מורשה מכניס באותה Transaction את ה־Provider operation,
ה־Provider request claim,‏ Consumption, Binding מדויק ו־Resolution מסוג
`released`. ה־Binding החדש הוא Append-only, ללא Payload או PII, ומקשר באמצעות
Composite foreign keys את ה־Permit, ה־Credential revision, ה־Consumption,
ה־Operation וה־Request לאותו Database timestamp. ‏`providerRequestKey` נגזר
רק במסד ואינו מוחזר מתוצאת Consume; Replay או Denial אינם מחזירים Capability.

4.7.7.33 `released` פירושו שהמסד התחייב לשחרור Capability חד־פעמי; הוא אינו
טענה ש־Meta קיבל הודעה. B2b רשאי לחצות את גבול ה־HTTP רק לאחר ACK חיובי ל־
`COMMIT`,‏ `ReadyForQuery`, וקריאת Proof נפרדת על אותו Client פיזי. ה־Proof
מאמת שאין Outcome סופי, מאמת את שרשרת Released המלאה ומכניס Claim חד־פעמי
ל־`bot_reply_staging_provider_boundary_claims`. שלושת ה־Unique constraints
על Permit,‏ Operation ו־Provider request מונעים Proof חוזר גם באותו Session.
רק לאחר ACK חד־משמעי ל־Commit של ה־Claim מותר להתקדם; אובדן ACK של ה־Proof
מחייב לא לשלוח ולסמן פיוס ידני. הפלט מחזיר את `backendPid` השמור להשוואה ל־PID
שנדגם לפני Acquire ואת `sendBefore` עם מרווח בטיחות של 15 שניות. אם ACK,‏ PID
או Proof חסרים או לא ודאיים, אסור לבצע Meta POST וה־Client מושמד. Commit שנשמר
יוצר Durable uncertainty fence; לאחר Crash אין מסלול Acquire חדש שמחזיר
Capability לשליחה חוזרת.

4.7.7.34 Finalize ו־Reconcile מקבלים רק `permitKey`, דורשים את אותו Session
barrier ומפיקים מצב רק מעובדות Provider עמידות שכבר קשורות ל־Request של 0053.
הקורא אינו יכול לספק Verdict,‏ Provider timestamp,‏ Provider ID או Error
payload. ‏Accepted,‏ 130429,‏ 131056 ו־131047 יוצרים Outcome סופי רק כאשר
נמצאה עובדה מדויקת. HTTP ambiguity או תפוגת Lease ללא עובדה אינם יוצרים
Outcome בלתי־הפיך; הם נרשמים באופן Idempotent ב־Append-only nonterminal
uncertainty ledger ומחזירים `manual-reconciliation-required`. כך Callback
מאוחר אינו נחסם על ידי Outcome מקומי, ובמקביל Durable uncertainty fence מונע
Retry אוטומטי ל־Meta. מסלול B2b חייב להשאיר את Delivery במצב `sending` בזמן
אי־ודאות; מעבר ל־`ambiguous` במסלול הישן עדיין דורש חוזה D2 מוגן לעובדה
מאוחרת.

4.7.7.35 גם B2a2 אינו Activation. ‏0056 אינה מוסיפה `GRANT`, אינה מחברת
Runtime או Meta adapter ואינה מוכיחה Client פיזי מוצמד, Commit ACK אמיתי,
היעדר Multiplexing או Writer cooperation. ‏0056 כן מוסיפה Preflight לפורמט
המספרי הקנוני של שלושת מזהי Meta ו־Unique ownership ל־Business Portfolio;
יחד עם ה־Unique הקיימים ל־WABA ול־Phone הדבר מונע משני Tenants תקינים לחלוק
Scope גלובלי. הוא עדיין אינו מוכיח שמפתחות ה־HMAC ברשומת Reservation נגזרו
מנכסי ה־Tenant הנכון. ‏B2b עדיין חייב להוכיח את הרצף Acquire → Consume →
Commit ACK → Proof Claim ו־Commit ACK חד־משמעי → Meta יחיד → Fact/Finalize →
Release ואת הרס החיבור בכל כשל. חיבור Reconciliation מחזיק Tenant lock יחד
עם Marker, רשאי לבצע Finalize/Release בלבד ואינו רשאי לבצע Proof או Consume.
D1e עדיין חייב לסגור את המסלול הישן, להוסיף Admission writer,
Credential-by-revision,‏ Scope binding או Reservation writer מהימן ללא Direct
DML,‏ Writer barriers,‏ Cooldown cooperation ואי־שינוי של
`messages.occurred_at`. עד אז Activation נשאר NO-GO.

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
