# Meta Bot Reply Staging Runner

תאריך אימות: 2026-08-24

## 1. מטרת המסמך

1.1 מסמך זה מגדיר את שרשרת הראיות עבור ניסוי Bot reply מול WABA מורשה
ב־Staging.

1.2 השרשרת בנויה משלושה גבולות נפרדים:

1.2.1 ‏Live driver מפעיל תרחישים רק דרך מסלולי Railway המאובטחים ומפיק
Receipt מוגבל.

1.2.2 ‏Evidence generator מאמת את ה־Receipt ומפיק Evidence ללא מזהי ספק
גולמיים.

1.2.3 ‏Production verifier מאמת את הקובץ, את ערך ה־Runtime ואת זהות
ה־Release לפני Production Readiness.

1.3 נכון לעדכון זה גבולות 1.2.2 ו־1.2.3 הושלמו מקומית. גם ליבת
ה־Live driver, פעולת ה־System Admin האופציונלית, ה־Durable runner,
ה־PostgreSQL ledger, ‏Queue envelope, ‏BullMQ handoff ו־Scenario executor
הושלמו. ה־API Publisher וה־Worker מחוברים דרך Composition אופציונלי.
גם ליבת ה־Provider driver, הקצאת המקרים העמידה, HMAC ייעודי לנמען, מקור
חלון השירות מ־PostgreSQL ומקור Secret פרטי ומוגבל בזמן למקרי WABA
הושלמו מקומית. גם ליבת Observation source הסגורה ו־PostgreSQL durable
observation Reader/Writer קונקרטיים הושלמו. Readers קונקרטיים ל־Graph
ול־Security/Telemetry מחוברים כעת לאותו Railway/PostgreSQL Worker.
Producer קונקרטי לסטטוסי Webhook
‏sent/delivered/read, ‏Provider deferrals, ‏Send, ‏Button reply, ‏131047
ו־Duplicate safety הושלמו. גם Kill-switch Producer עמיד הושלם מקומית;
גם ה־Kill-switch adapter האטומי וכל חיבור ה־Provider driver אל Railway
BullMQ Worker Main הושלמו מקומית. ההפעלה נשארת כבויה כברירת מחדל עד
לבחירת Tenant staging, הגדרת Secrets ו־Evidence חיים והרצה מאושרת; לכן
עדיין אין ראיה חיה ואין לפתוח את ה־Production Adapter.

## 2. חוזה Receipt

2.1 ה־Receipt חייב להגיע מ־Staging ומ־Runner בגרסה
`connect-bot-reply-staging-runner-v1`.

2.2 הוא נקשר ל־Release ID, ‏Commit SHA, ‏Artifact digest ו־Graph API
version המדויקים.

2.3 הוא מכיל Proof נפרד לכל נכס ולכל תרחיש, אבל אינו מאפשר Token, תוכן
הודעה, שם לקוח, Tenant, כתובת או Payload. מבנה Exact-key דוחה כל שדה
נוסף במקום למחוק אותו בשקט.

2.4 נדרשים Text, ‏Button, ‏Button reply, ‏sent, ‏delivered, ‏read,
‏131047, ‏Graph throughput, ‏130429 עם Retry-After, ‏131056, ‏Kill switch,
‏Duplicate safety, ‏Vault boundary ו־Redaction.

2.5 ‏Receipt עתידי או Receipt שנוצר לפני יותר משעה נדחה. כל התצפיות
עצמן חייבות לעמוד גם בחלון 24 השעות של חוזה ה־Evidence.

## 3. יצירת Evidence

3.1 קובץ ה־Receipt חייב להיות קובץ רגיל בבעלות המשתמש המריץ, ללא
Symbolic link וללא הרשאת כתיבה ל־Group או Others.

3.2 לאחר הגדרת `APP_DEPLOYMENT_ARTIFACT_DIGEST` של ה־Build הנבדק מריצים:

```bash
npm run evidence:bot-reply-staging -- --receipt /absolute/path/to/receipt.json
```

3.3 המחולל יוצר את
`.artifacts/bot-reply-staging-evidence.json` בהרשאות `0600`. הוא אינו
דורס קובץ קיים; לפני ניסיון חדש המפעיל חייב לארכב או להסיר במודע Evidence
ישן לפי מדיניות הראיות.

3.4 Proofs מה־Receipt מומרים ל־SHA-256 fingerprints נפרדים. הם אינם
מועתקים לפלט ואינם מודפסים ל־Console.

3.5 הקובץ נכתב בצורה קומפקטית עם Newline סופי. יש להעלות את תוכנו המדויק
ל־Secret Store כ־`BOT_REPLY_STAGING_EVIDENCE_JSON`; שינוי Whitespace או
Newline ייכשל בבדיקת Runtime mismatch.

## 4. אימות Release

4.1 מאותו Environment של ה־Runtime מריצים:

```bash
npm run verify:bot-reply-staging-evidence
```

4.2 המאמת בודק קובץ מהימן, התאמה byte-for-byte ל־Runtime, תוקף קצר,
Digest סמנטי והתאמה ל־Release, ‏Commit ו־Artifact.

4.3 Production Release Gate מפעיל את המאמת אוטומטית לפני Production
Readiness. השער המקומי אינו דורש חשבון Meta ואינו מייצר Evidence.

## 5. גבול Live driver

5.1 אין לממש Live driver באמצעות POST ישיר ל־Graph API מתוך Script.
מסלול כזה היה עוקף את Credential Vault, ‏Audit, ‏Admission, ‏Rate limits,
‏Outbox ו־Ambiguity safety.

5.2 **הושלם בליבת ה־Orchestrator:** הפעולה
`system-admin.bot-reply-staging.run` זמינה רק כאשר ה־Railway Runtime
מקבל Driver מפורש. היא דורשת System Admin allowlist, מכסת Mutation,
Idempotency key דטרמיניסטי ו־Confirmation מדויק. כאשר Driver לא סופק,
הפעולה אינה נרשמת כלל.

5.2.1 הבקשה אינה מאפשרת Token, מספר נמען, WABA ID, ‏Phone Number ID,
Payload או Proof. היא מכילה רק Tenant staging מורשה בצד השרת, גרסאות
צפויות, זמן בקשה וזהות Release/Commit/Artifact.

5.2.2 לפני Durable run הליבה דורשת Environment מסוג `staging`, חיבור
מאושר ופעיל, מדיניות משלוח פעילה ולא פגת תוקף, Credential Vault מוצפן,
נמען בדיקה עם Opt-in ואישור בתוקף, Evidence עמיד ב־PostgreSQL וגבול
ביצוע מסוג `railway-bullmq-bot-reply-worker`.

5.2.3 בדיקות `130429` ו־`131056` דורשות אישור מתודה מתוארך של טל,
המקושר ל־Fingerprint. אישור חסר, עתידי או פג תוקף חוסם את ההרצה לפני
פנייה ל־Durable runner.

5.2.4 ה־Run key נגזר באופן דטרמיניסטי מכל גבולות הבטיחות. Lease פעיל
מוחזר כ־Conflict ואינו הופך להרצה שנייה. רק תוצאה עמידה מסוג
`completed` או `replayed`, עם Audit key ו־Receipt תואם, יכולה לעבור.

5.2.5 תוצאת ה־API הציבורית מחזירה רק Run key, ‏Audit key, זמן אימות,
תפוגה ו־Evidence digest. ה־Receipt וה־Proofs אינם מוחזרים ללקוח.

5.3 אין להריץ את תרחישי `130429` או `131056` באמצעות עומס לא מבוקר.
טל מאשר מראש את מתודת הבדיקה לפי מצב החשבון החי ומדיניות Meta העדכנית.

5.4 **הושלם מקומית:** Durable runner ו־Repository עמיד מממשים Claim
אטומי, Lease של 60–3,600 שניות, Fencing version, Replay, Conflict
ו־Completion בלתי־שינוי. Actor מגיע מה־Session בצד השרת ונקשר ל־Request
digest; זמן Confirmation מחודש אינו יוצר Run נוסף.

5.4.1 Migration 0033 שומרת Run identity, ‏Audit key ו־Receipt מוגבל
ב־PostgreSQL. Trigger אטומי יוצר אירועי `started` ו־`completed`, ומונע
Update/Delete של ה־Run ושל אירועי ה־Audit. שתי תביעות מקבילות הוכחו מול
PostgreSQL 16.13 כריצה אחת ו־`in-progress` אחד.

5.4.2 ‏Queue envelope v1 הוא מבנה Exact-key. הוא מאמת מחדש את כל זהות
ה־Run, את ה־Request digest וה־Audit key, קושר את ה־Job ל־Claim version
וגוזר Job ID דטרמיניסטי. Extension שיכול לשאת Token או נתון ספק נדחה.

5.4.3 ה־Durable runner מאמת Receipt סגור לפני קריאת `complete`, ולכן
Executor אינו יכול להכניס Receipt מורחב ל־PostgreSQL. הוא מאמת שוב גם
Receipt שמוחזר מה־Repository או מ־Replay לפני החזרתו למפעיל.

5.4.4 **הושלם מקומית:** נוסף BullMQ adapter ייעודי עם Publisher ו־Worker.
הפרסום משתמש ב־Job ID דטרמיניסטי וב־attempt יחיד; תרחיש חי שנכשל אינו
נשלח אוטומטית פעם נוספת. Envelope פגום, Lease שפג או כשל Consumer עוברים
ל־DLQ מוגבל ששומר Digests וזהות Run בלבד, בלי ה־Payload החשוד.

5.4.5 ‏Queue consumer מאמת את ה־Receipt לפני Persistence וסוגר את ה־Run
ישירות ב־PostgreSQL תחת Claim version זהה. ‏Queued executor בצד ה־API
מפרסם פעם אחת וקורא את מצב ה־Run מ־PostgreSQL עד Completion; הוא אינו
מתייחס ל־Redis כאל מקור האמת. אם ה־API נופל אחרי ביצוע Worker, ניסיון
מחודש משחזר את ה־Receipt העמיד ואינו דורש הרצת תרחיש נוספת.

5.4.6 קריאות `running` ו־`completed` של ה־Ledger נבדקו על PostgreSQL
16.13 אמיתי כחלק מ־36 migrations ו־82 תרחישי concurrency.

5.4.7 **הושלם מקומית:** Migration 0034 מוסיפה Ledger נפרד, Versioned
ו־Append-only לאישור נמען הבדיקה ולאישור מתודת ה־Rate limit של טל.
ה־Ledger שומר רק Fingerprints, גרסאות וזמנים; מספר הטלפון, Access token,
Ciphertext או Provider payload אינם חלק מהחוזה.

5.4.8 אישור חדש מתקבל רק מול Meta connection מחובר בגרסה המדויקת,
Delivery policy פעילה ועדכנית, Credential envelope קיים ו־Evidence שטרם
פג. כל Event נכתב ל־Audit בלתי־ניתן לשינוי. Replay זהה נשאר Idempotent,
אך גרסה מתחרה, דילוג גרסה או שינוי ראיה קיימת נכשלים סגור.

5.4.9 ‏Revocation הוא Event עוקב שחייב להעתיק במדויק את הראיה המאושרת.
קריאת ה־Safety מביטה רק ב־Event האחרון ובגרסאות החיבור והמדיניות
הנוכחיות, ולכן ביטול, תפוגה, החלפת Connection, ‏Kill switch או הסרת
Credential חוסמים את ה־Live driver. החוזה עבר על PostgreSQL 16.13 אמיתי
עם שני כותבים מקבילים, Audit guards וקריאה שנחסמה לאחר Revocation.

5.5 **הושלם מקומית:** Scenario executor מפעיל את שבעת התרחישים בסדר
הקנוני ולאחריהם Throughput, ‏130429, ‏131056, ‏Duplicate safety,
Credential boundary, ‏Redaction ו־Kill switch. ‏Kill switch רץ אחרון כך
שלא תיתכן פעולת ספק נוספת לאחר בדיקתו.

5.5.1 לכל צעד נגזרים Operation key ו־Bot reply delivery key
דטרמיניסטיים מ־Run key ומזהות הצעד, בלי Claim version. לכן Reclaim לאחר
Lease משתמש באותה זהות משלוח ולא הופך Retry להרשאת שליחה חדשה. כל
Observation חייב להחזיר את אותו Operation key ואת גבול הביצוע
`railway-bot-reply-worker` לפני בניית Receipt.

5.5.2 ה־Executor קורא מחדש את Safety snapshot העמיד לפני כל אחד מ־15
הצעדים. Revocation, החלפת Connection או Policy, תפוגת אישור, שינוי
Fingerprint או Lease שפג עוצרים את יתר ההרצה. כל שלוש ההרשאות חייבות
להישאר בתוקף עד סוף ה־Lease המלא. Receipt מורכב רק מתוצאות Exact-key,
נבדק מיד דרך Evidence builder ורק אז מוחזר ל־Queue consumer.

5.5.3 חיבור Worker אופציונלי קיים לכל השרשרת:
BullMQ worker → Queue consumer → Scenario executor → PostgreSQL Safety
ו־Run ledgers → Bot reply delivery worker. החיבור מתקבל רק יחד עם Bot
reply runtime ו־Meta webhook runtime, ונכשל סגור ללא Driver מלא.

5.5.4 חיבור API אופציונלי קיים לכל השרשרת:
System Admin operation → Live driver → Durable runner → BullMQ publisher
→ Polling מול PostgreSQL. ה־Publisher מוכיח Redis ready לפני חשיפת ה־API
ונסגר יחד עם ה־API. ללא System Admin מלא או Staging configuration הפעולה
אינה נרשמת כלל.

5.6 **הושלם מקומית:** ליבת Provider-bound Scenario driver מממשת את גבול
הביצוע בין מלאי מקרים פרטי, PostgreSQL, ‏Bot reply worker ומקור Observation
עמיד. אין בה Graph transport, ‏Token, מספר נמען או Payload של ספק.

5.6.1 כל תרחיש מוקצה בזהות Exact-key הקשורה ל־Run, ‏Operation,
‏Delivery, ‏Tenant, גרסאות Connection/Policy, ‏Claim, ‏Lease ו־Recipient
fingerprint. הקצאה שאינה מכסה את ה־Lease המלא או משנה זהות נכשלת לפני
Dispatch.

5.6.2 מספר הנמען נשאר בתוך גבול המלאי הפרטי וה־Repository. התאמתו
לאישור מתבצעת בעזרת HMAC ייעודי
`BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1`; ה־Driver מקבל רק Fingerprint
מסוג `sha256:`. המפתח אינו נופל חזרה למפתח ה־Rate limit.

5.6.3 לפני Dispatch, המקרה נשמר באופן Idempotent דרך
`BotReplyDeliveryRepository.stage`. חלון השירות נקרא מחדש מהודעת Inbound
אמיתית ב־PostgreSQL ונבדק כחלון של 24 שעות; זמן שהגיע מהגדרה פרטית אינו
נחשב ראיה.

5.6.4 ‏Text ו־Button דורשים `accepted` או Replay מסוג `duplicate`.
‏131047 דורש `rejected`; ‏130429 ו־131056 דורשים `deferred`. ‏Duplicate
safety מפעיל את אותו Delivery key פעמיים ודורש שההפעלה השנייה תהיה
`duplicate`. ‏Ambiguous או In-progress אינם הופכים ל־Proof.

5.6.5 ‏Button reply והסטטוסים sent/delivered/read הם Observe-only. הם
חייבים להיקשר ל־Subject delivery key הדטרמיניסטי של `button-send`; אין
עבורם הודעה נוספת. קשר לתוצאת משלוח אחרת נדחה לפני Observation.

5.6.6 ‏Kill switch משבית את גרסת המדיניות הבאה לפני ניסיון המשלוח,
מקבל רק `rejected`, ‏`deferred` או Replay בטוח, ורק אז מאפשר ל־Observation
source להוכיח אפס Provider requests. הוא נשאר הצעד האחרון ואינו מבצע
Re-enable אוטומטי.

5.6.7 ‏Railway factory מרכיב בעצמו את ה־Observation source משלושה
Readers מפורשים בלבד: Graph, ‏Durable PostgreSQL ו־Security/Telemetry.
אי אפשר עוד להזריק Observation source מוכן. כל ה־Readers, מלאי המקרים,
שני מפתחות ה־HMAC ו־Kill switch חייבים לדווח `Configured`.

5.7 **הושלם מקומית:** נוסף מקור המקרים הפרטי
`connect-bot-reply-staging-private-case-source-v1`. הוא קורא את
`BOT_REPLY_STAGING_PRIVATE_CASES_JSON` רק מ־Environment חיצוני ואינו
קורא קובץ Working tree. הוא פעיל רק כאשר `APP_RUNTIME_ENVIRONMENT` הוא
`staging` וכל זהויות ה־Runtime תואמות.

5.7.1 ה־Inventory הוא חוזה Exact-key בגודל מרבי 64 KiB ובחיים מרביים של
שעתיים. הוא נקשר ל־`APP_RELEASE_ID`, ‏`APP_DEPLOYED_COMMIT_SHA`,
‏`APP_DEPLOYMENT_ARTIFACT_DIGEST`, ‏`META_GRAPH_API_VERSION` ול־Tenant
החיובי שב־`BOT_REPLY_STAGING_TENANT_ID`. הוא מכיל גם את גרסאות
Connection/Policy; סטייה בכל אחד מהערכים חוסמת Resolution.

5.7.2 נדרשים בדיוק 11 מקרים בסדר הקנוני: שבעת התרחישים וארבע בקרות
Provider retry, ‏Pair limit, ‏Duplicate safety ו־Kill switch. ארבעת מקרי
ה־Observe-only חייבים להיות עותק זהה של Subject ה־`button-send`, כולל
נמען ו־Delivery. זהויות Dispatch כפולות נדחות.

5.7.3 Payload מסוג Text או Buttons נבדק שוב לפי גבולות ה־Meta adapter:
מפתחות Domain דטרמיניסטיים, E.164, ‏Phone Number ID מספרי, עד שלושה
Buttons, כותרות ייחודיות ושדות ללא Control characters. כל Extension field
נדחה; אין שדה שמסוגל לשאת Token או Credential.

5.7.4 בקשת Case כוללת כעת את זהות ה־Release/Commit/Artifact/Graph המדויקת
של ה־Run. ה־Inventory חייב להישאר בתוקף עד סוף ה־Lease. ‏Case fingerprint
נגזר ב־HMAC מהבתים המדויקים של ה־Secret ומזהות המקרה, כדי לא לאפשר ניחוש
Offline של מספר טלפון; ה־Secret, המספר והתוכן אינם מודפסים בדוח האימות.

5.7.5 ‏Railway factory בונה את המקור הפרטי בעצמו מתוך ה־Environment
וה־Clock של ה־Worker; הוא אינו מקבל עוד Source חלופי או In-memory. ניתן
לבצע Preflight בטוח, שאינו שולח הודעה, בעזרת:

```bash
npm run verify:bot-reply-staging-private-cases
```

5.7.6 גם `BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1` וגם
`BOT_REPLY_STAGING_PRIVATE_CASES_JSON` נוספו ל־Secret hygiene guard. אין
להכניס ערך של אחד מהם ל־Git, ל־`.env.example`, ל־Log או ל־Evidence.

5.8 **הושלם מקומית:** נוסף
`connect-bot-reply-staging-observation-source-v1`. הוא מקבל עובדות
Exact-key בלבד וקושר כל עובדה ל־Run, ‏Operation, ‏Release, ‏Commit,
Artifact, ‏Graph version, ‏Tenant, ‏Connection, ‏Policy, ‏Lease ובמקרים
הרלוונטיים גם ל־Case ולתוצאת ה־Dispatch בפועל.

5.8.1 מזהי App, ‏Business Portfolio, ‏WABA ו־Phone number אינם יוצאים
מהמקור. הם משתתפים ב־HMAC ייעודי
`BOT_REPLY_STAGING_OBSERVATION_HMAC_KEY_V1`, וב־Receipt נשמר Proof אטום
בלבד. אין Fallback למפתח הנמען או למפתח ה־Rate limit.

5.8.2 עובדה ישנה, עתידית, Cross-run, בעלת Extension field או שאינה
תואמת ל־Dispatch/Case נדחית. כשל Reader מסונן לקוד מוגבל ואינו חושף
Provider response. ‏Redaction כולל מעתה Timestamp ו־Proof חתום; ב־Evidence
נשמר Fingerprint בלבד, כמו בשאר בקרות האבטחה.

5.8.3 ‏Railway factory מקבל רק את שלושת ה־Readers הגולמיים ובונה את
המקור בעצמו עם Worker clock. כך Reader לא יכול להחזיר ישירות Observation
שעוקף את אימות הזהויות.

5.8.4 **הושלם מקומית:** Migration 0035 מוסיפה Ledger ‏Append-only,
PII-free ו־Exact-key עבור עובדות Scenario, ‏130429, ‏131056, ‏Duplicate
safety ו־Kill switch. כל Event קשור ל־Run פעיל, Claim version, ‏Operation,
Delivery, ‏Tenant, ‏Recipient fingerprint ולחלון ה־Lease. ‏Update/Delete,
שדה שאינו שייך לסוג העובדה או Subject מ־Tenant אחר נחסמים במסד.

5.8.5 ‏`postgresBotReplyStagingDurableObservationReader.ts` קורא בדיוק
רשומה אחת ומאמת מחדש את כל זהויות ה־Run, ‏Release, ‏Commit, ‏Artifact,
Graph, ‏Connection ו־Policy ואת הצורה הסמנטית של כל Fact. הוא מחובר ל־
Railway PostgreSQL Foundation. החוזה הוחל ונקרא בפועל על PostgreSQL 16.13
נקי כחלק מ־36 migrations ו־82 תרחישי concurrency.

5.8.6 **הושלם מקומית:** ‏Writer קונקרטי מקבל Union סגור של חמש משפחות
Fact, דוחה Extension fields וגוזר Event key דטרמיניסטי מכל הרשומה
הקנונית. הוא כותב בתוך Transaction, טוען מחדש תחת Lock ומחזיר
`unchanged` רק ל־Replay זהה; אותו Operation עם עובדה שונה נכשל ואינו
מחליף את הראיה הקיימת. ‏Railway Foundation חושף את ה־Writer ואת ה־Reader
מאותו Pool, וה־PostgreSQL rehearsal מפעיל בפועל את המסלול
Writer → Ledger → Reader במקום SQL ישיר.

5.8.7 **הושלם מקומית:** ‏Webhook status Producer קורא מ־PostgreSQL רק
את Projection ה־Provider העמיד עבור Subject delivery וה־Tenant המדויקים.
הוא מקבל התאמה סגורה בלבד: `sent` ל־`status-sent`, ‏`delivered` ל־
`status-delivered` ו־`read` ל־`status-read`. הוא דורש Event key תקין,
Timestamp שאינו ישן או עתידי ושנמצא בתוך ה־Run lease, ואז כותב דרך
ה־Writer. ‏Observation source מפעיל אותו לפני קריאת ה־Fact מה־Ledger.
‏Replay זהה נשאר Idempotent ו־Status שכבר התקדם אינו מוצג כאילו הוא
הסטטוס הקודם. המסלול המלא עבר בפועל על PostgreSQL 16.13 כחלק מ־36
מיגרציות ו־82 תרחישי concurrency.

5.8.8 **הושלם מקומית:** Migration ‏0036 ו־Repository path חדש שומרים
Provider-deferral provenance עמיד עבור 130429/`sender` ועבור
131056/`pair`. ה־Processor מחזיר את Reservation המדויק רק אחרי שה־Cooldown
נשמר; ה־Worker מעביר Delivery, ‏Claim, ‏Reservation, ‏Code/Scope וכל זמני
ה־Retry ל־PostgreSQL Transaction אחת שמעדכנת את ה־Delivery ומוסיפה Event
Append-only. ‏Trigger משווה את הנתונים ל־Reservation, ‏Settlement,
Cooldown ולמצב ה־Delivery בפועל. ללא המסלול האטומי התוצאה היא
`ambiguous`, לא Retry בלתי מוכח. אין ב־Event מספר טלפון, תוכן הודעה או
Provider payload. המסלול עבר על PostgreSQL 16.13 אמיתי כחלק מ־**37
מיגרציות ו־83 תרחישי concurrency**, כולל Replay מקביל וחסימת Mutation.

5.8.9 **הושלם מקומית:** Producers עמידים עבור Provider deferrals,
‏Accepted send, ‏Button reply, ‏Meta 131047 ו־Duplicate safety כותבים דרך
אותו Writer לפני קריאת ה־Fact. ‏Duplicate safety דורש Provider-request
fence בלתי־משתנה שנכתב לפני POST, ‏Acceptance יחידה ושתי תוצאות Dispatch
בפועל כשהשנייה `duplicate`. השאילתה אינה נוגעת ב־Provider message ID,
מספר טלפון, תוכן או Credentials. ‏Kill-switch Producer דורש Policy מעבר
מדויק מ־enabled ל־disabled, ‏Audit יחיד, Delivery שנדחה מקומית, אפס
Provider-request claims ואפס Acceptances. ‏PostgreSQL 16.13 אמיתי עבר עם
**40 מיגרציות ו־87 תרחישי concurrency**.

5.8.10 **הושלם מקומית:** ‏Graph observation reader קונקרטי קורא את
ה־Connection המחובר ואת ה־Credential המוצפן מאותו Railway/PostgreSQL
runtime. עבור Assets הוא מאמת ב־`debug_token` שה־Token תקף ושייך ל־App
המאושר, מאמת ב־Graph שה־WABA שייך ל־Business Portfolio ושהמספר מופיע תחת
אותו WABA. עבור Throughput הוא קורא רק
`id,throughput,is_on_biz_app,platform_type` מן המספר המאושר.

5.8.11 המיפוי נכשל סגור: ‏Coexistence תקין עם `STANDARD` מפיק 20,
`STANDARD` רגיל מפיק 80 ו־`HIGH` רגיל מפיק 1,000. רמה לא מוכרת, ‏HIGH
ב־Coexistence, ‏Platform שאינו `CLOUD_API`, מזהה מספר אחר, Connection שאינו
`connected`, גרסה ישנה או Graph version שונה נדחים בלי Default. ‏Raw Meta
IDs קיימים רק ב־Fact הפנימי הדרוש לגזירת HMAC; ה־Evidence הציבורי ממשיך
להכיל Proofs ו־Digest בלבד, ללא Token, ‏App secret או Provider payload.

5.8.12 ‏Railway PostgreSQL worker יוצר את ה־Reader מתוך Meta connection,
Credential envelope וה־Clock שלו ומעביר אותו ל־Provider driver. לכן אי־אפשר
להזריק ל־Driver Reader סטטי שאינו קשור ל־Runtime שבו ה־Run מתבצע.

5.8.13 **הושלם מקומית:** ‏Security/Telemetry observation reader קונקרטי
טוען את מעטפת ה־Credential המוצפנת מאותו PostgreSQL Foundation ודורש
Projection מסוג Exact-key הכולל רק Tenant, ‏Key version, ‏IV, ‏Ciphertext
ו־Timestamps. הוא מאמת שה־Vault מסוגל לפענח את המעטפת רק בתוך callback
תחום, אך אינו מחזיר, שומר ב־Fact או גוזר Digest מן ה־Access token.

5.8.14 מסלול Redaction מקבל רק Better Stack staging evidence מלא שעבר את
ה־Verifier הקיים: Evidence digest תקין, חלון חיים קצר, אפס Findings, לפחות
12 שדות שנבדקו והתאמה מדויקת ל־Release, ‏Commit ו־Artifact של ה־Run.
`verifiedAt` חייב להיות בתוך חלון ה־Run וה־Lease; Evidence קודם להרצה,
עתידי, פג או Cross-release נדחה.

5.8.15 ‏Railway worker יוצר את ה־Security reader מתוך Credential
repository, ‏Environment ו־Clock של אותו Runtime. גם Security reader אינו
עוד אפשרות Factory סטטית. ה־Facts כוללים רק מונים, Timestamps ו־Digest
קשור־Run; ‏Token, ‏Ciphertext ו־Better Stack payload אינם יוצאים ל־Receipt.

5.8.16 **הושלם מקומית:** ‏Kill-switch adapter קונקרטי קורא את גרסת
המדיניות הפעילה והמדויקת מאותו PostgreSQL Foundation, דורש התאמת Tenant,
Connection version ו־Policy version, וכותב גרסה עוקבת במצב `disabled`
באמצעות Repository אטומי. הגרסה החדשה מעתיקה את Snapshot הבטיחות במדויק;
Replay מתקבל רק עבור אותו Actor ואותה גרסה. הוא אינו מפעיל מחדש Policy
ואינו מסתמך על בדיקה שאחרי המחיקה או אחרי פניית Provider כמנגנון בטיחות.

5.8.17 ‏Provider factory אינו מקבל עוד Ports עמידים או Kill-switch
סטטיים. ‏Graph, ‏Security, ‏Durable observations, ‏Webhook, ‏Provider
deferrals, ‏Send ו־Kill-switch מגיעים כולם מאותו Foundation שבו נמצאים
ה־Delivery worker, ‏Policies, ‏Service windows וה־Clock. כל Port חסר,
לא מוגדר או שזורק בזמן `isConfigured` חוסם את ההפעלה לפני Dispatch.

5.8.18 ‏Railway BullMQ Worker Main מחבר את השרשרת המלאה רק כאשר
`BOT_REPLY_STAGING_ENABLED` שווה בדיוק `true`. ברירת המחדל ו־`false`
משאירות ארבעה Queues בסיסיים בלבד; ערך אחר או Configuration חלקי
נכשלים לפני פתיחת Worker. במצב מאושר נפתח Queue חמישי ייעודי ל־Staging
עם Telemetry ו־DLQ תחומים. אין בכך אישור לשליחה חיה או שינוי Readiness.

5.8.19 **הושלם מקומית:** ‏Activation preflight משותף ל־CLI ול־Railway
Worker Main בודק שבעה גבולות לפני פתיחת Worker: סביבת Staging, מלאי מקרים
פרטי ובתוקף, HMAC לנמען, HMAC ל־Observation, תצורת Meta Graph, הצפנת
Credential ו־Better Stack evidence תואם־Release. הפלט כולל רק מזהי בדיקה,
מונים וסטטוס; אין בו ערכי Environment, ‏Tenant, טלפון, App ID, ‏Token,
Secret או Payload. יש להריץ מתוך סביבת Railway המיועדת:

```bash
npm run preflight:bot-reply-staging
```

Exit code ‏0 מתקבל רק כאשר `BOT_REPLY_STAGING_ENABLED=true` וכל שבע
הבדיקות עברו. מצב כבוי, Opt-in לא חוקי, Evidence פג או Configuration
חלקי מחזירים Exit code ‏1. ה־Main מפעיל את אותו Inspector ואינו מסתמך רק
על הפעלת הפקודה הידנית.

5.8.20 **הושלם מקומית:** נוסף Operation ייעודי לכתיבת Ledger ההרשאה
העמיד. אישור חדש אפשרי רק לזהות Tal המוגדרת במפורש ונמצאת גם ב־System
Admin allowlist; מנהל גיבוי מורשה יכול לבטל אישור אך אינו יכול ליצור
אישור חדש. ביטול טוען את האירוע המאושר האחרון מאותו PostgreSQL
Foundation, מעתיק בדיוק את כל גרסאות ה־Connection/Policy ואת Fingerprints
הראיה, וכותב אירוע `revoked` עוקב ו־Append-only.

5.8.21 הבקשות דורשות Confirmation מדויק, Timestamp קנוני וקצר־חיים,
Idempotency key דטרמיניסטי, גרסה עוקבת ו־System Admin rate limit. ‏Replay
מתקבל רק לאחר אימות מלא של צורת הבקשה ורק לאותו Actor, סטטוס, גרסה וזמן;
שדה עודף או Confirmation שגוי נדחים. התוצאה הציבורית כוללת רק Event key,
גרסה, סטטוס וזמן — ללא מספר טלפון, Token, ‏Provider ID או Evidence גולמי.
ה־Operation מחובר ל־Railway API Runtime ול־PostgreSQL/BullMQ composition
כאשר תצורת Bot-reply staging נמסרת במפורש.

5.8.22 **הושלם מקומית:** ‏Railway BullMQ API executable קורא כעת תצורה
ייעודית ואינו מפעיל את Queue ה־Staging ללא `BOT_REPLY_STAGING_ENABLED=true`.
במצב מופעל הוא דורש סביבת `staging`, ‏Tenant חיובי, זהות Clerk מפורשת של
טל הנמצאת גם ב־System Admin allowlist, ‏Lease של 60–3,600 שניות ו־Polling
של 50–5,000 מילישניות. תצורה חלקית, Opt-in לא קנוני או Tal שאינו Admin
נחסמים לפני יצירת Telemetry, ‏Redis publisher או PostgreSQL runtime.

5.8.23 ה־API מקבל רק את ערכי התזמון והזהות הדרושים ל־Authorization ול־
Run queue. ‏Meta token, מספר טלפון, מלאי מקרים פרטי, מפתחות HMAC וראיות
Better Stack של ה־Worker אינם מועברים אליו. כשלי Queue מפיקים רק קודי
Telemetry תחומים ללא ערכי Configuration.

5.8.24 **הושלם מקומית:** נוסף Cross-service activation checker גרסה 1.
הוא מקבל בזיכרון בלבד שני Environment snapshots מבודדים, מפעיל את
Inspector ה־API ואת Activation preflight של ה־Worker, ודורש ארבעה תנאים:
API configured, ‏Worker ready, שתי סביבות `staging` ואותו Tenant. שני
שירותים כבויים מחזירים `disabled`; הפעלה א־סימטרית, Tenant שונה, Worker
חסום או קלט מורחב מחזירים `blocked`.

5.8.25 הפלט כולל רק Version, ‏Status, ‏Code, מונים וארבעה מזהי בדיקה
קבועים. הוא אינו כולל Tenant, ‏Clerk ID, ‏Meta ID, מספר טלפון, Token,
‏HMAC, ‏Private inventory או Environment value. אין קובץ Environment חדש
ואין CLI שטוען Secrets מדיסק. החיבור ל־Railway deployment orchestration
דורש גישה לחשבונות החיים ונשאר שלב חיצוני.

5.8.26 **הושלם מקומית:** נוסף Evidence contract גרסה 1 עבור דוח
ה־Cross-service. המחולל מקבל רק דוח `ready` שבו ארבע הבדיקות עברו, קושר
אותו ל־Release ID, ‏Commit SHA ו־Artifact digest הנוכחיים, ומחייב תפוגה
מפורשת של 60–900 שניות. ה־Verifier דורש מבנה סגור, סדר בדיקות קבוע,
Timestamps קנוניים ו־SHA-256 digest מדויק; Evidence עתידי, פג, מורחב,
שונה או קשור ל־Release אחר נחסם.

5.8.27 ‏`productionReadiness` אינו מוסיף שורת Ready מלאכותית. השער הקיים
`automation.bot-reply-adapter` דורש יחד מימוש Delivery adapter, ‏Evidence
חי של תרחישי ספק ה־WhatsApp ו־Cross-service Evidence תקף ל־Release
הנוכחי. ה־Digest מספק שלמות תוכן ולא חתימה מאומתת; לכן מקור ה־Evidence
חייב להישאר Railway deployment orchestration המורשה.

5.8.28 **הושלם מקומית:** נוסף Release evidence issuer גרסה 1 שאינו מקבל
Environment snapshots או Secrets. ה־Orchestrator החיצוני מספק לו רק
פונקציה הקוראת זהות Release תחומה ופונקציה המחזירה Cross-service report
תחום. ה־Issuer קורא את Release ID, ‏Commit SHA ו־Artifact digest לפני
ה־Activation ואחריו ומפיק Evidence רק אם שלושתם נותרו זהים לערכים
הצפויים.

5.8.29 ‏Release drift לפני ה־Activation מונע אפילו את הפעלת הבדיקה;
Release drift אחריה, דוח שאינו `ready`, Dependency שנכשלה או Clock לא
תקין מחזירים תוצאה חסומה ללא Evidence. הפלט המוצלח כולל רק JSON תחום,
Digest ותאריך תפוגה. הודעת Dependency, ‏Environment value או Provider
identity אינם מוחזרים.

5.8.30 ה־Issuer אינו כותב ל־Railway ואינו משנה Environment variable.
Railway deployment orchestration המורשה עדיין חייב לספק את שני ה־Readers,
לשמור את ה־JSON באופן אטומי עבור אותו Release ולהריץ את ה־Verifier לאחר
השמירה. כך חוזה הקוד מוכן בלי לטעון שבוצעה אינטגרציה חיה.

5.8.31 **הושלם מקומית:** נוסף Release evidence publisher גרסה 1 עם Port
מפורש של Compare-and-set. הקלט כולל את ה־Release הצפוי, גרסת ה־Evidence
הנוכחית, Digest קודם וה־Evidence שהונפק בשלב 5.8.28. לפני Storage access
ה־Publisher מריץ את ה־Verifier ודוחה Evidence ששונה, פג או שייך ל־Release
אחר.

5.8.32 ה־Storage adapter חייב להשוות אטומית Release, גרסה ו־Digest קודם
לפני החלפת ה־JSON. לאחר הצלחה ה־Publisher קורא את המצב מחדש, דורש גרסה
עוקבת, התאמה byte-for-byte של ה־JSON וה־Digest, ומריץ שוב את ה־Verifier.
Conflict, ‏State קודם פגום, Write failure ו־Read-back mismatch נשמרים
כקודים נפרדים ללא הודעות ספק.

5.8.33 Retry שרואה כבר את אותה גרסה עוקבת ואת אותו JSON מוחזר כ־Replay
ואינו כותב שוב. החוזה אינו ממציא Railway API או Storage mechanism;
Adapter חי שמספק Compare-and-set אמיתי עדיין חסר עד בחירת מנגנון כתיבת
ה־Environment המאושר בחשבון Railway.

5.8.34 **הושלם מקומית:** בדיקת התיעוד הרשמי העלתה ש־Railway Variables
מספקים Upsert ושינויים מדורגים שנכנסים ל־Runtime רק לאחר Deployment,
אך לא מתועד בהם Compare-and-set לפי Version/Digest. לכן הם אינם מומלצים
כמקור אמת ל־Evidence שתוקפו 60–900 שניות.

5.8.35 נוסף ADR-0005 במצב `proposed`, הממליץ על רשומת PostgreSQL גרסתית
בתוך אותה Railway Environment. ‏Transaction עם תנאי Release, ‏Version
ו־Digest ו־`RETURNING` יכול לממש את ה־Port של שלב 5.8.31 ללא Redeploy.
התעבורה בין השירותים למסד נשארת ב־Railway private network.

5.8.36 נוסף Configuration inspector שנכשל סגור ללא בחירה מפורשת ומקבל
רק `BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE=postgresql`. ערכי
`railway-variables`, ‏Redis, ‏Memory או וריאציות לא קנוניות נדחים. ההחלטה
אינה פותחת Production gate עד ש־ADR-0005 יאושר פורמלית, Migration ו־
Repository יושלמו, וקריאת ה־Environment JSON הזמנית תוחלף במקור Repository.

5.8.37 **הושלם מקומית:** Migration ‏0040 יוצר
`bot_reply_staging_release_evidence` עם שורה נפרדת לכל Release, ‏Version
עולה, זוג JSON/Digest עקבי, זהות Release בלתי משתנה ותפוגה של 60–900
שניות. Check constraints קושרים את הזהות, ה־Digest והזמנים שבתוך ה־JSON
לעמודות המוגנות.

5.8.38 נוסף PostgreSQL Repository גרסה 1. אתחול Release הוא Idempotent;
הקריאה נכשלת סגור לפני אתחול; והכתיבה משתמשת ב־Update יחיד המותנה ב־
Release ID, ‏Commit, ‏Artifact, ‏Version ו־Digest קודם. ‏`RETURNING` עם
שורה אחת הוא הצלחה, ואפס שורות הוא Conflict תחום.

5.8.39 בדיקת Concurrency מקומית הפעילה שתי כתיבות עם אותו Precondition
והוכיחה Winner יחיד. עדיין נדרשים Loopback PostgreSQL חי למיגרציה 0040,
חיבור ה־Repository ל־Runtime reader ואישור פורמלי של ADR-0005.

5.9 **עדיין חסר בכוונה:** בחירת Tenant ו־Staging WABA מאושרים, הגדרת
המלאי הפרטי ושלושת ה־Secrets, טעינת Better Stack evidence עדכני, אישור
מתודת הבדיקה של טל, מעבר Activation preflight והרצה חיה מורשית של כל
התרחישים. אין בקוד Endpoint או
Field של Meta שלא אומת, ואסור להשתמש ב־Proof מומצא או ב־Graph POST ישיר
כתחליף להרצה דרך השרשרת המאובטחת.

5.10 עד השלמת 5.9, יצירת Cross-service Evidence מתוך שני השירותים החיים
והרצה חיה מאושרת, ‏`botReplyDeliveryAdapter` נשאר `false` וכל Production
Evidence חסר נשאר Blocked.
