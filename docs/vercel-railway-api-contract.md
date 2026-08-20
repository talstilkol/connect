# חוזה API בין Vercel ל־Railway

תאריך הקפאה: 2026-08-17

## 1. מטרה

1.1 המסמך מתעד את חוזה ה־HTTP המקומי שנבנה עבור שלב B של Migration.
הוא אינו Endpoint פרוס ואינו מוכיח ש־Vercel או Railway הוגדרו.

1.2 הסבר למתחילים: לאחר הפיצול יהיו שני שרתים. ה־UI ירוץ ב־Vercel,
אך הפעולות העסקיות ירוצו ב־Railway. כל בקשה ביניהם חייבת להוכיח גם
מי השרת השולח וגם מי המשתמש שביקש את הפעולה.

## 2. שתי הוכחות זהות נפרדות

2.1 ‏`x-vercel-oidc-token` מכיל Vercel OIDC token. הוא מוכיח שהבקשה
נשלחה מה־Team, מה־Project ומה־Environment שאושרו.

2.2 ‏`Authorization: Bearer <session-token>` מכיל Clerk session token.
הוא מוכיח את זהות המשתמש. Railway עדיין טוען Membership ממסד הנתונים
ובודק Permission עבור הפעולה.

2.3 לוגיקת הסיבה והתוצאה:

```text
Vercel proof חסר או שגוי
  -> Railway אינו מאמין לשרת
  -> 401, ללא בדיקת משתמש וללא Business action

User proof חסר או שגוי
  -> Railway אינו יודע מי המשתמש
  -> 401, ללא Business action

שתי ההוכחות תקינות
  -> Railway טוען Membership והרשאות
  -> רק אז הפעולה יכולה לרוץ
```

2.4 חלוקת שני ה־Tokens בין Headers היא **מדיניות Connect**. המקור
הרשמי של Vercel מציג OIDC ב־`Authorization`; Connect שומר את
`Authorization` ל־Clerk ומעביר את ה־OIDC ב־Header הייעודי שכבר משמש
Vercel Functions. שני הערכים רגישים וחייבים Redaction מלא בלוגים.

2.5 ‏Railway יוצר את שני ה־Verifiers מאותה תצורה Fail-closed. ה־OIDC
נבדק מול JWKS קבוע של Vercel ו־`issuer`, ‏`audience` ו־`subject`
מדויקים. Clerk מקבל רק `session_token` ורק מ־`APP_PUBLIC_ORIGIN`
שאושר באמצעות `authorizedParties`.

## 3. חוזה הבקשה

3.1 ה־Endpoint הקבוע הוא `/v1/connect`. ה־Client אינו רשאי לקבל Path,
Query או Fragment מהמשתמש.

3.2 גוף הבקשה כולל בדיוק חמישה שדות:

3.2.1 `contractVersion` — כרגע `connect.railway-api.v1`.

3.2.2 `operation` — מזהה פעולה קטן, לדוגמה `contacts.list`.

3.2.3 `requestKind` — `query` לקריאה או `mutation` לשינוי.

3.2.4 `idempotencyKey` — `null` בקריאה; בשינוי נדרש מזהה
דטרמיניסטי בפורמט `connect_idempotency_v1_<sha256>`.

3.2.5 `payload` — JSON מוגבל בלבד.

3.3 ‏Payload אינו רשאי להכיל `tenantId`, ‏`externalUserId`, ‏Token,
Password, ‏Secret, ‏Database URL, ‏Redis URL או מפתחות Prototype.
זהות ו־Tenant נגזרים בצד Railway ולא מתקבלים מה־Caller.

3.4 החוזה מגביל עומק, מספר Nodes, אורך מחרוזות, Arrays, מספר שדות
וגודל Bytes. המטרה היא למנוע בקשה קטנה לכאורה שצורכת זיכרון או CPU
ללא גבול.

## 4. חוזה התגובה

4.1 הצלחה:

```json
{
  "contractVersion": "connect.railway-api.v1",
  "outcome": "ok",
  "data": {}
}
```

4.2 כשל:

```json
{
  "contractVersion": "connect.railway-api.v1",
  "outcome": "error",
  "code": "AUTHORIZATION_DENIED"
}
```

4.3 רשימת קודי הכשל סגורה. Exception, ‏SQL, ‏Tenant ID, ‏User ID,
Token, ‏Provider response או Stack trace אינם מוחזרים ל־Vercel.

4.4 גם תגובת הצלחה עוברת בדיקת שדות רגישים וגודל. אם Operation
מנסה בטעות להחזיר `tenantId`, הגבול מחזיר `SERVER_ERROR` במקום
להדליף את הערך.

## 5. גבולות Client

5.1 ב־Preview וב־Production מותר רק Origin מסוג HTTPS ללא Credentials,
Path, ‏Query או Fragment.

5.2 ‏HTTP מותר רק ב־Development ורק עבור `localhost`, ‏`127.0.0.1`
או `::1`.

5.3 ה־Client משתמש ב־Timeout, ‏`redirect: error`, ‏`credentials: omit`,
`cache: no-store` ומגבלת תגובה שנאכפת תוך Streaming.

5.4 בקשה לא חוקית נעצרת לפני קריאת Tokens ולפני Network call.

## 6. גבולות Handler

6.1 ה־Handler מקבל `POST` ו־JSON לא דחוס בלבד.

6.2 ‏Vercel OIDC מאומת לפני Clerk; Clerk מאומת לפני קריאת ה־Payload;
ה־Payload מאומת לפני Dispatch.

6.3 ‏Preview identity אינו מתקבל ב־Production גם אם ה־JWT עצמו תקין.

6.4 גוף הבקשה נקרא כ־Stream ונעצר ברגע שעבר את המכסה. אין קריאת
`arrayBuffer()` בלתי־מוגבלת לפני בדיקת הגודל.

6.5 לכל Operation ננעל מראש `id` ו־`requestKind`. Caller אינו יכול
להציג Mutation כ־Query כדי לעקוף Idempotency.

## 7. מה הושלם ומה עדיין חסר

7.1 הושלם מקומית:

7.1.1 Contract parser ו־Response validator.

7.1.2 ‏Vercel-side HTTP client מאובטח.

7.1.3 ‏Railway-side HTTP handler מאובטח.

7.1.4 ‏Ports עבור Vercel OIDC verifier, ‏Clerk session verifier
ו־Operations.

7.1.5 בדיקות חיוביות ושליליות ל־Identity, ‏Environment, ‏Origin,
Body limits, ‏Sensitive fields, ‏Timeout ו־Error mapping.

7.1.6 ‏Vercel OIDC Adapter אמיתי עם `jose`, ‏Remote JWKS וולידציה
של Issuer/Audience/Subject. כשל חתימה או Claims מחזיר Unauthenticated;
כשל Network/JWKS מסווג כ־Dependency outage.

7.1.7 ‏Clerk Adapter אמיתי עם `authenticateRequest`, ‏
`acceptsToken: session_token` ו־`authorizedParties` קבועים. הוא מחזיר
רק `externalUserId` ואינו מקבל Tenant או Permission מה־Token.

7.1.8 ‏Environment contract נכשל סגור כאשר Origin, ‏Clerk keys,
Team, ‏Project או Vercel Environment חסרים או אינם חוקיים.

7.1.9 ‏Tenant session resolver טוען Memberships מהשרת. כאשר קיימת
חברות אחת הוא משתמש בה; כאשר קיימות כמה הוא דורש את הבחירה השמורה
ב־Database ומאמת שהיא עדיין פעילה. `tenantId` אינו מתקבל מה־Payload.

7.1.10 ‏Operation registry ראשוני כולל שלוש פעולות Read-only:
`workspace.context.read`, ‏`contacts.list` ו־`reports.read`. לכל פעולה
חוזה Payload סגור ו־Permission מפורש; קלט לא חוקי נעצר לפני Tenant
lookup ושדות Tenant/User פנימיים מוסרים מהתגובה.

7.1.11 ‏Runtime factory מחבר את שני ה־Identity verifiers, ‏Tenant
resolution, ‏Operation policies ו־HTTP Handler מאובטח לנקודת Composition
אחת. הוא עדיין אינו Route פרוס.

7.1.12 פעולת Mutation ראשונה, `contacts.save`, כוללת Payload סגור,
הרשאת `contacts.write`, ‏Rate-limit fail-closed ומפתח Idempotency. ‏SHA-256
מחושב על Operation ועל Payload מנורמל בסדר שדות קנוני, ולכן אותו תוכן מפיק
Digest זהה בלי קשר לסדר השדות ב־JSON.

7.1.13 ה־Mutation אינו כותב ישירות דרך D1. הוא עובר ב־Port שמחייב את
ה־PostgreSQL Adapter העתידי לבצע שינוי עסקי, Claim של Idempotency,
השוואת Request digest, ‏Audit immutable ושמירת תוצאת Replay באותה
Transaction. תוצאות `conflict`, ‏`rate-limited` ו־`unavailable` ממופות
לקודים סגורים ללא מידע פנימי.

7.1.14 נוסף Executor ספק־נייטרלי ל־PostgreSQL. הוא משתמש ב־Claim מסוג
`ON CONFLICT DO NOTHING`, נעילת `FOR UPDATE`, ‏Contact upsert עם
`IS DISTINCT FROM`, ‏Audit ללא PII והשלמת Receipt באותה Transaction.
תוצאת Database שאינה תואמת ל־Tenant ול־Payload נכשלת סגור. ה־Receipt
שומר רק את תגובת Contact הציבורית המדויקת, ללא Tenant, ‏Evidence או
Database timestamps.

7.1.15 נוספו 15 Migrations מסודרות ל־Critical Path ומסמך
[חוזה PostgreSQL ל־Railway Mutations](postgresql-mutation-contract.md).
הראשונה יוצרת Tenant, ‏Audit ו־Contact prerequisites והשנייה את Receipt.
השלישית יוצרת Membership, ‏Selection ו־Business profile, והרביעית את
Membership event ledger. החמישית יוצרת את כל ארבע טבלאות ה־Invitation
lifecycle ואת Triggers הבטיחותיים שלה.
השישית מוסיפה Conversations/Messages והשביעית Message templates/Campaigns.
השמינית מוסיפה Bot flows, גרסאות ו־Deliveries. התשיעית מוסיפה AI agents,
גרסאות, הרשאות עלות, Usage ו־Audit לדוח התפעולי.
העשירית מוסיפה Tags, ‏Lists, שיוכי Contact ו־Import jobs/rows בעלי Foreign
Keys מורכבים שמבודדים Tenant.
האחת־עשרה מוסיפה Meta connections, ‏Webhook receipts ו־Encrypted credential
envelopes עם קשר Tenant/WABA מורכב.
השתים־עשרה מוסיפה WhatsApp delivery-policy ledger בלתי־ניתן לשינוי עם
Audit אטומי, קישור לגרסת חיבור Meta ו־Kill switch מוגבל.
השלוש־עשרה מוסיפה Reservation, ‏Settlement ו־Provider-cooldown ledger עם
נעילות Pair/Portfolio ו־State projections מוכחי Evidence.
הרבע־עשרה מוסיפה Phone throughput מתגלגל הקשור ל־Policy המאושר, והחמש־עשרה
מוסיפה Lease עם Fencing token ו־Catch-up תחום ל־Railway Worker scheduler.
כל שרשרת ה־SQL הוחלה על PostgreSQL 16.13 מקומי. ‏Node driver adapter
ו־Integration rehearsal עבור Contact ו־Invitation קיימים, אך אין עדיין
Schema parity מלאה, ערכי Production pool חיים או Staging evidence.

7.1.16 נוספו Membership, ‏Tenant selection ו־Business profile repositories
ספק־נייטרליים. מסלולי Selection ו־Profile משתמשים ב־Transaction, וקריאות
Membership נכשלות סגור על תוצאה חוצה User/Tenant או על יותר מ־100 רשומות.
החוזה המלא מתועד ב־
[PostgreSQL Tenant Access](postgresql-tenant-access-contract.md).

7.1.17 נוסף Team membership mutation repository ספק־נייטרלי. שינויי
Role/Status והעברת Owner נועלים את ה־Tenant ואת הרשומות הרלוונטיות באמצעות
`FOR UPDATE`, כותבים State ו־Event באותה Transaction ומזהים Retry לפי מפתחות
SHA-256 דטרמיניסטיים. ה־Harness החדש הוכיח Concurrency עבור Contact
Idempotency ו־Invitation acceptance, אך עדיין לא לכל פעולות Membership.

7.1.18 נוסף [חוזה PostgreSQL למחזור חיי הזמנת צוות](postgresql-team-invitation-contract.md).
ה־Schema מאחד את State, ‏Event ledger, ‏Delivery outbox ו־Acceptance ledger.
Repositories ספק־נייטרליים מממשים Request, ‏Re-request, ‏Revoke, ‏Expiration
וסריקת Keyset, ‏Delivery settlement/reconciliation ו־Acceptance אטומי עם
Membership. כל 27 משפטי ה־SQL עברו Parser מקומי של PostgreSQL. ‏Delivery,
Acceptance ו־Concurrency מוגדרים נבדקו גם דרך `node-postgres`; עדיין חסרים
כיסוי יתר המסלולים ופעולות API מחוברות.

7.1.19 ‏`node-postgres` מחובר דרך Adapter יחיד שמפריד Query בודד מ־Transaction
מוצמדת. ‏Harness חוזר מסכים רק ל־Database Loopback ייעודי וריק, מחיל 15
Migrations ומוכיח DML, ‏Rollback ותשעה Races בלי לקבל Production credential.

7.1.20 חוזה Pool נפרד דורש TLS, ‏Pool size וכל Timeout במפורש. הוא דוחה
Loopback ב־Staging/Production וכל Query string ב־Database URL, משום ש־
`sslmode` עלול לדרוס את אובייקט ה־TLS. ‏Idle-client telemetry מקבל Signal
בלבד ולא Error או Connection string.

7.1.21 ‏PostgreSQL foundation אחד מחבר את כל 30 ה־Adapters שהושלמו לאותו
Pool ומחזיר רק Ports עסקיים ו־Close. הוא נבדק גם ב־Harness האמיתי.

7.1.22 ‏`contacts.list` משתמש כעת ב־PostgreSQL repository בעל Tenant filter,
Keyset pagination, מגבלת 100 רשומות ואימות מחמיר של מבנה הרשומה, Consent
וסדר התוצאות. הוא נבדק מול PostgreSQL אמיתי דרך אותו Foundation. אין לחבר
את ה־Foundation ל־Railway API המלא לפני שגם `reports.read` מקבל PostgreSQL
repository; תנאי זה הושלם כעת. עדיין אסור ליצור ערבוב D1/PostgreSQL לא מתועד
במסלולים האחרים.

7.1.23 ‏`reports.read` קיבל PostgreSQL Adapter בעל Statement יחיד שמחשב את
כל ששת מקורות הדוח מאותו Snapshot ומאמת 35 שדות לפני החזרתם. ה־Adapter מחובר
ל־Foundation. ‏Conversations, ‏Messages, ‏Templates, ‏Campaigns ו־Bot
deliveries, ‏AI audit ו־AI usage הומרו ונבדקו מול PostgreSQL אמיתי. ה־Harness
קרא דוח מלא מכל ששת המקורות. Route חי ו־Cutover נשארים חסומים בשל יתר
ה־Routes וה־Mutations, ‏Parity מלאה, ערכי Pool חיים וראיות Staging — לא בשל
מקורות הדוח.

7.1.24 ‏`railwayPostgresApiRuntime.ts` מחבר את גבול הזהות והפעולות אל
PostgreSQL Foundation אחד, ובעל ה־Runtime מחזיק גם בסגירת ה־Pool. ‏Harness
אמיתי ביצע `reports.read` דרך HTTP, אימת Vercel OIDC ו־Clerk, פתר Tenant מתוך
Membership ב־PostgreSQL, הפעיל Permission וקרא את כל ששת מקורות הדוח. התגובה
נבדקה ללא Tenant ID, ‏External user או Connection data. שכבת Node HTTP
ו־Service lifecycle מתועדת בסעיף הבא; Railway environment אמיתי עדיין חסר.

7.1.25 נוסף Node HTTP adapter עם Route API יחיד, Liveness, ‏Readiness מבוסס
PostgreSQL, מגבלת Header של 16KB ו־Timeouts מפורשים. Request target חייב
להיות Origin-form ואינו נגזר מ־Host לא מהימן. ‏Service owner מפעיל פעם אחת,
עוצר HTTP לפני סגירת Pool ומחזיר כשלים תחומים ללא פרטי Listener או Database.
בשלב זה Startup executable נשאר חסום עד חיבור Process signals, ‏`PORT` מאומת
ו־Distributed rate-limit adapter; ה־Process lifecycle הושלם בסעיף הבא.

7.1.26 ‏`railwayNodeProcess.ts` מאמת את `PORT`, מחבר `SIGINT` ו־`SIGTERM`
רק לאחר Start, ומנתב Signal לאותו Service shutdown שסוגר HTTP לפני Pool.
כשל ברישום Signal מסיר Wiring חלקי וסוגר את השירות. ה־Process controller
מוכן מקומית; קובץ Bootstrap שמפעיל אותו נשאר חסום עד שניתן להרכיב Runtime
עם Distributed mutation rate limiter אמיתי, ולא Stub שמאפשר כתיבות ללא
מכסה משותפת.

7.1.27 ‏`0009_contact_organization_imports.sql` ממיר שש טבלאות של Tags,
Lists ו־Contact import. קשרים אינם מסתמכים על מזהה גלובלי בלבד: כל Foreign
Key עסקי כולל `tenant_id`. ‏Harness PostgreSQL אמיתי הוכיח יצירה וקריאה של
שיוכים ו־Import שהושלם, חסם מצב Job לא עקבי וחסם שני ניסיונות Cross-tenant.
ה־Schema הושלם; שני ה־Repository adapters והפעולות העסקיות חוברו בסעיפים
7.1.28–7.1.29.

7.1.28 ‏`postgresContactOrganizationRepository.ts` ממיר את חמש פעולות
ה־Repository של Tag/List ושיוכים. Placeholders של Contact scope נוצרים רק
מאורך מערך שאומת ומוגבל ל־50. כתיבת Relationship היא Statement אטומי שמוכיח
Contact ו־Group באותו Tenant לפני שינוי. ה־Foundation חושף את ה־Service,
וה־Harness הפעיל Create ו־Assign דרך Session והרשאה מול PostgreSQL אמיתי.

7.1.29 ‏`postgresContactImportRepository.ts` ממיר את פעולות הייבוא המתחדש.
Contact ותוצאת Row מאושרת נכתבים באותה Transaction, וה־Status נגזר מהמצב
הנעול במסד. Replay זהה הוא Idempotent ו־Evidence סותר נכשל סגור. חיפוש הטלפון
הקנוני מחובר ל־PostgreSQL, וה־Foundation חושף את `contactImports` Service.
ה־Harness הפעיל Import מלא דרך Session ו־RBAC, וב־Race של שני Chunks זהים
נוצרו Contact יחיד ותוצאת Import יחידה. סך הכול עברו שלושה תרחישי Concurrency.

7.1.30 ‏`0010_meta_connection_credentials.sql` ו־שני PostgreSQL repositories
ממירים Meta connection, ‏Webhook receipts ו־Encrypted credential envelopes.
ה־Foundation חושף Connection service, ‏Webhook port ו־Encrypted-envelope
port, אך אינו ממציא Encryption key או Vault configuration. ‏Harness אמיתי
הוכיח שתי תביעות מקבילות לאותו Event, ‏Duplicate בטוח, Completion, ‏Replay
ו־Conflict על Evidence סותר. סך הכול עברו ארבעה תרחישי Concurrency.

7.1.31 ‏`0011_whatsapp_delivery_policy.sql` ו־
`postgresWhatsappCampaignDeliveryPolicyRepository.ts` ממירים את החלטת
השליחה המאומתת. Event פעיל קשור לגרסת חיבור Meta הנוכחית ולחלון Evidence
קצר; Policy versions עוקבות, היסטוריה בלתי־ניתנת לשינוי ו־Audit נאכפים במסד.
ה־Repository נועל את Connection, מזהה Replay/Conflict, ו־Kill switch רשאי
רק להשבית את ה־Snapshot הפעיל בלי להחליף מכסה. ‏Harness אמיתי הוכיח Race
של שתי בקשות זהות, Event יחיד, Replay, השבתה ו־Audit. סך הכול עברו חמישה
תרחישי Concurrency. ‏Reservation ledger, ‏Provider limiter ו־Sender חי עדיין
אינם מחוברים.

7.1.32 ‏`0012_whatsapp_rate_limit_ledger.sql` ו־
`postgresWhatsappRateLimitRepository.ts` ממירים Reservation, ‏Settlement
ו־Provider cooldown ל־PostgreSQL. ‏Transaction-scoped locks מסדרים Pair
ו־Portfolio admission, ו־Triggers אוכפים Evidence ו־Immutability גם מול
כתיבה ישירה. ‏Harness אמיתי הוכיח Race זהה, Replay, Pair limit, שחרור,
Cooldown וחסימת Tamper. סך הכול עברו שישה תרחישי Concurrency.

7.1.33 ‏`0013_whatsapp_phone_throughput.sql` מוסיף Throughput evidence
מפורשת ל־Policy ול־Reservation ואוכף חלון מתגלגל של שנייה תחת Sender
advisory lock. ‏D1 מקבל את אותו חוזה במיגרציה `0035`. ‏Harness אמיתי הוכיח
תחרות של שלוש בקשות תחת תקרה `2/s`: שתיים נשמרו והשלישית נדחתה עד קצה
החלון. סך הכול עברו שבעה תרחישי Concurrency. ‏Queue worker, ‏Sender חי,
Load evidence וערכי חשבון מאומתים עדיין חסרים.

7.1.34 ‏`0014_worker_scheduler_lease.sql` מוסיף Claim אטומי לכל Tick של
דקה, Lease שפג ו־Fencing token עולה. ‏`railwayWorkerScheduler.ts` מריץ את
שתי משימות ה־Scheduler תחת אותו Claim ומשלים עד חמישה Ticks חסרים. ‏Harness
אמיתי הוכיח ששתי תביעות מקבילות יוצרות זוכה יחיד וש־Worker ישן אינו יכול
להשלים לאחר השתלטות. סך הכול עברו תשעה תרחישי Concurrency. ‏Always-on timer,
‏Redis/BullMQ ו־Queue adapters עדיין חסרים.

7.1.35 ‏`railwayWorkerSchedulerService.ts` מפעיל ריצה מיידית ומחשב לאחר כל
ריצה את הזמן המדויק עד גבול הדקה הבא. הוא אינו משתמש ב־`setInterval`, מדכא
callback חופף, ממשיך לאחר כשל Tick תחום וממתין לריצה פעילה לפני סגירת
PostgreSQL. ‏`railwayWorkerProcess.ts` מחבר `SIGINT` ו־`SIGTERM` לאותו מסלול
סגירה אידמפוטנטי. ה־Timer וה־Process מוכנים מקומית.

7.1.36 ‏`0015_campaign_dispatch.sql` מוסיף `campaign_recipients` עם Foreign
keys מורכבים ל־Tenant, ‏Campaign ו־Contact. ‏PostgreSQL repository מממש
Activation, ‏Promotion, ‏Claim, ‏Consent revalidation, ‏Retry ו־Completion.
בחירת Campaigns ונמענים משתמשת ב־`FOR UPDATE SKIP LOCKED`; Harness אמיתי
עבר עם 16 Migrations ו־14 תרחישי Concurrency לאחר הוספת הוכחת Snapshot
אטומי בסעיף הבא. ‏`railwayWorkerRuntime.ts`
ו־`railwayPostgresWorkerService.ts` מחברים את Campaign ואת Invitation
expiration לאותו Lease, ‏Pool, ‏Timer ומסלול סגירה. ‏Queue adapter,
‏Executable bootstrap ותצורת Railway חיה עדיין חסרים.

7.1.37 ‏`postgresCampaignRepository.ts` שומר את הגדרת ה־Campaign ואת כל
Recipient snapshots ב־Transaction אחת. הכתיבה דורשת Template מאושר וזהה,
Contacts בעלי גרסה ו־Consent תקפים, וגודל JSONB תחום. ‏Replay מקביל זהה
מוחזר בבטחה לאחר `FOR UPDATE`; אותו Campaign key עם כל שינוי בשדות או
בנמענים נכשל סגור, גם אם מספר הנמענים זהה. ‏Harness אמיתי הוכיח שתי כתיבות
מקבילות, Snapshot יחיד, קריאה לפי Tenant והמשך מחזור Dispatch מלא.

7.1.38 ‏`postgresMessageTemplateRepository.ts` מממש Draft, קריאות,
Submission lifecycle ו־Status events על PostgreSQL. ‏Draft מקביל מטופל
באמצעות Insert כללי, Update מדויק ו־`FOR UPDATE`, כדי לכסות גם Primary key
וגם זהות `tenant+name+language`. אירועי Meta ננעלים ומסווגים ל־`applied`,
`duplicate`, ‏`stale`, ‏`not-found` או Identity conflict. ‏Harness אמיתי
עבר עם 16 Migrations ו־17 תרחישי Concurrency, והוכיח Template מאושר שנצרך
מיד על ידי Campaign snapshot ו־Dispatch.

7.1.39 ‏`postgresConversationRepository.ts` מממש Contact resolution,
קליטת Inbound idempotent, קריאת Inbox/Message history, ‏Mark-read, ‏Assignment
ו־Delivery status על PostgreSQL. קליטה מתבצעת ב־Transaction יחידה ומונעת
הגדלה כפולה של `unread_count`; התנגשות Provider identity מבטלת את כל
הכתיבה. ‏Mark-read ו־Assignment מוגנים בגרסה ובנעילת שורה, ו־Status events
מסווגים לפי Event key, זמן וקדימות. ‏Harness אמיתי עבר עם 16 Migrations
ו־22 תרחישי Concurrency.

7.1.40 ‏`postgresBotFlowRepository.ts` מממש יצירת Draft, הוספת Version,
קריאות ופרסום אטומי של Bot Flows. נעילת Flow מסדרת כתיבות מקבילות; Snapshot
נשמר לפני קידום הגרסה, ו־Published ישן עובר ל־Archived לפני החלפתו.
`postgresBotReplyDeliveryRepository.ts` מממש Stage, ‏Claim ו־Accepted/
Rejected/Ambiguous עם בדיקת הקשר בין Inbound message, ‏Conversation וגרסת
Flow. ‏Harness אמיתי עבר עם 16 Migrations ו־27 תרחישי Concurrency.

7.1.41 ‏`0016_ai_knowledge.sql` ו־Repositories ייעודיים ממירים את מחזור
Knowledge Source ואת ה־Passages המעובדים ל־PostgreSQL. ‏Source ננעל לפני
כל מעבר מצב; זהות ודיגסט של כל Passage נבדקים לפני כתיבה; כל המקטעים וסימון
Ready נשמרים באותה Transaction. ‏Harness אמיתי עבר עם 17 Migrations ו־32
תרחישי Concurrency, כולל Registration, ‏Validation, ‏Scanning, ‏Recovery
ו־Processing מקבילים.

7.1.42 ‏`postgresAiAgentRepository.ts` ממיר Drafts, גרסאות בלתי־משתנות,
קישורי Knowledge Source ופרסום סוכני AI ל־PostgreSQL. הכתיבה נועלת את
ה־Agent, מאמתת שכל Source שייך לאותו Tenant, שומרת Version וקישורים לפני
קידום המצביע ומעבירה Published קודם ל־Archived בזמן פרסום. ‏Replay זהה
מוחזר כ־`unchanged`, וקישור מקור חסר או סותר נכשל ללא כתיבה חלקית. ‏Harness
אמיתי עבר עם 17 Migrations ו־36 תרחישי Concurrency.

7.1.43 ‏`postgresAiRuntimeRepository.ts` ממיר Cost authorization, ‏Usage,
Audit ו־Handoff ל־PostgreSQL. נעילת Agent משותפת מסדרת את כל ההוצאות של
אותו Agent לפני חישוב התקציב; נעילת Conversation מסדרת Audit ו־Handoff
באותה Transaction. ‏Retry זהה משחזר את התוצאה, ו־Payload סותר נכשל סגור.
ה־Repository מחובר ל־Foundation, שמכיל כעת 28 Adapters. ‏Harness אמיתי
עבר עם 17 Migrations ו־40 תרחישי Concurrency.

7.1.44 ‏`0017_ai_reply_outbox.sql` ו־
`postgresAiReplyOutboxRepository.ts` ממירים Stage של תשובת AI, רשימת
אישורים והחלטת Approve/Reject ל־PostgreSQL. ה־Outbox קשור ל־Audit מתוכנן,
להודעת Inbound העדכנית ולמקורות ידע Ready. ‏Stage והחלטה ננעלים ומחזירים
Replay עקבי בלי לטעון שנשלחה הודעה לספק. ה־Foundation מכיל כעת 29 Adapters;
Harness אמיתי עבר עם 18 Migrations ו־42 תרחישי Concurrency.

7.1.45 ‏`postgresBotRuntimeRepository.ts` ממיר את קריאת מצב השיחה, המשך
לאחר תשובת כפתורים מאושרת ו־Handoff לנציג ל־PostgreSQL. ההמשך קשור להודעת
Inbound הקודמת המיידית לפי `(occurred_at, message_key)`, מוגבל ל־24 שעות
ודוחה יותר מראיית Buttons מאושרת אחת. Handoff נועל את השיחה ומספק Replay
עקבי. ה־Foundation מכיל כעת 30 Adapters; Harness אמיתי עבר עם 18 Migrations
ו־43 תרחישי Concurrency.

7.1.46 ‏`0018_tenant_subscriptions.sql` ו־
`postgresTenantSubscriptionRepository.ts` ממירים יצירה, הארכה, השעיה,
הפעלה וביטול של מנוי Tenant ל־PostgreSQL. כל שינוי משתמש ב־Optimistic
Version ובנעילת שורה, מסנכרן את מצב ה־Tenant וכותב Event ו־Audit בלתי־משתנים
באותה Transaction. ה־Foundation מכיל כעת 31 Adapters; Harness אמיתי עבר
עם 19 Migrations ו־47 תרחישי Concurrency.

7.1.47 ‏`postgresTenantProvisioningRepository.ts` ממיר יצירת Tenant ראשון,
Owner membership, ‏Business Profile ו־Audit ל־Transaction אחת. שורת ה־Tenant
ננעלת לפני בדיקת Owner; Replay זהה אינו מכפיל נתונים; Provisioning key זהה
עם זהות אחרת נחסם. ה־Foundation מכיל כעת 32 Adapters; Harness אמיתי עבר
עם 19 Migrations ו־49 תרחישי Concurrency.

7.1.48 ‏`0019_production_decisions.sql` ו־
`postgresProductionDecisionRepository.ts` ממירים קריאה ושמירה של Production
Decisions ל־PostgreSQL. ה־Schema מכיר רק את 11 מזהי ה־Registry, דורש Version
עוקב ומייצר Event בלתי־משתנה באמצעות Trigger. יצירה ועדכון מקבילים מחזירים
Replay עקבי. ה־Foundation מכיל כעת 33 Adapters; Harness אמיתי עבר עם
20 Migrations ו־51 תרחישי Concurrency.

7.1.49 ‏`0020_system_admin_business_profiles.sql`,‏
`postgresSystemAdminTenantDirectoryRepository.ts` ו־
`postgresSystemAdminBusinessProfileRepository.ts` מוסיפים קריאת System Admin
מוגבלת ועריכת Business Profile אטומית עם Version, סנכרון Tenant ו־Audit
בלתי־משתנה. ה־Foundation מכיל כעת 35 Adapters; Harness אמיתי עבר עם
21 Migrations ו־53 תרחישי Concurrency.

7.1.50 ‏`0021_contact_consent_events.sql` ו־
`postgresContactConsentRepository.ts` מוסיפים היסטוריית Consent בלתי־משתנה
והקרנת מצב אטומית לפי ה־Event העדכני ביותר. מפתח Event מחושב מחדש לפני כתיבה,
ה־Contact ננעל, Retry זהה נשאר Idempotent ו־Event ישן אינו דורס מצב חדש. ה־
Foundation מכיל כעת 36 Adapters; ‏Harness אמיתי עבר עם 22 Migrations ו־55
תרחישי Concurrency.

7.1.51 ‏`postgresCampaignAudienceRepository.ts` מוסיף קריאת קהל
PostgreSQL תחומה ל־Tenant ול־Consent פעיל עבור `all`, ‏List ו־Tag. התוצאה
מוגבלת, מסודרת ומאומתת ללא חשיפת Tenant ב־DTO. ה־Foundation מכיל כעת 37
Adapters; ‏Harness אמיתי עבר עם 22 Migrations ו־55 תרחישי Concurrency.

7.1.52 ‏`0022_campaign_delivery_provider_links.sql` ו־
`postgresCampaignDeliveryProviderRepository.ts` מוסיפים Provider
reconciliation אטומי למשלוחי Campaign. קבלת `providerMessageId` מקרינה
`accepted`, אירוע סופי מקרין את מצב ה־Recipient וכותב Settlement ל־Ledger
באותה Transaction. ‏Replay זהה נשאר Idempotent; ‏Event key עם תוכן אחר,
Terminal סותר, זהות כפולה ושינוי Evidence ישיר נחסמים. קריאת ה־Link וה־
Recipient ננעלת יחד כדי למנוע Snapshot חלקי תחת תחרות. ה־Foundation מכיל
כעת 38 Adapters; ‏Harness אמיתי עבר עם 23 Migrations ו־57 תרחישי
Concurrency.

7.1.53 ‏`postgresMigrationParityRegistry.mjs` ו־
`verify-postgres-migration-parity.mjs` מקבעים מיפוי Machine-readable של כל
36 מיגרציות D1 ושל כל 51 הטבלאות אל 26 מיגרציות PostgreSQL. ארבע מיגרציות
Railway-only—HTTP mutation receipts, ‏Scheduler lease, ‏API mutation token
buckets ו־Data migration bundle receipts—מסומנות בנפרד. ה־
Verifier דוחה Migration חסרה, כפולה, לא מוסברת או Evidence token שאינו קיים,
ורץ גם ב־Release gate וגם ב־Pull Request `migrations` check. זה סוגר את פער
Source coverage; הוא אינו מוכיח Data conversion או Semantic parity ב־Staging.

7.1.54 ‏`0023_api_mutation_rate_limits.sql` וה־PostgreSQL binding מחברים
את `contacts.save` למכסה אטומית המשותפת לכל מופעי Railway. אותו חוזה תומך
גם ב־Policies מבודדים עבור System Admin mutations ו־Meta webhook ingress.
כל Policy דורש Version, ‏Capacity וחלון Refill מפורשים; ערך חסר, חלקי או
לא חוקי נכשל סגור. ה־DB שומר רק מפתח SHA-256 אטום, נועל כל Scope ומחשב
Refill לפי זמן PostgreSQL. ‏Harness אמיתי עדכני עבר עם 26 Migrations ו־58
תרחישי Concurrency, כולל שתי הצלחות וחסימה אחת תחת שלוש בקשות מקבילות
במכסה `2`. ‏Tenant mutation ו־System Admin mutation מחוברים ל־Railway API,
ו־Meta webhook מחובר כאופציה חתומה ב־Node dispatcher עם PostgreSQL WABA
lookup ו־Queue port ספק־נייטרלי. כאשר הרכבת Meta חסרה Route זה מחזיר `503`
ולא נופל ל־D1. כל שלושת המסלולים עדיין דורשים ערכי Policy ו־Evidence חיים.

7.1.55 ‏`postgresCoreDataMigration.ts`,‏ `read-d1-core-data-snapshot.mjs`
ו־`verify-postgres-core-data-migration.mjs` מוסיפים Core data migration
fail-closed לשבע טבלאות. Snapshot D1 דורש Schema ו־Integrity תקינים; Plan
קצר־תוקף קשור ל־HMAC; היעד ננעל, חייב להיות ריק, נטען ומאומת באותה
Transaction. ‏Rehearsal אמיתי עבר עם 36 מיגרציות D1, ‏24 מיגרציות
PostgreSQL, ‏7 טבלאות ו־Replay חסום. נותרו 44 טבלאות וראיית Staging.

7.1.56 ‏`railwayApiMain.ts` ו־`start-railway-api.mjs` סוגרים את פער ה־API
Startup executable. ‏`PORT` מאומת לפני יצירת Pool, תצורת Runtime נקראת
מה־Environment ללא Defaults, וכל כשל מבצע Cleanup ומוחזר ללא פרטי תשתית.
Rehearsal הפעיל Child process אמיתי מול PostgreSQL 16 עם 24 מיגרציות, הוכיח
Liveness ו־Readiness ושלח `SIGTERM`; HTTP נסגר לפני Pool והתהליך יצא בקוד
`0` ללא פלט שגיאה. עדיין חסרים Railway Service ו־Environment חיים.

7.1.57 הפעולה `system-admin.business-profile.update` מחוברת כאופציה נפרדת
ל־Railway runtime ואינה עוברת ב־Tenant session resolver. היא דורשת Clerk
identity שנמצאת ב־`CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS`, צורכת את Policy
`system-admin-mutation` לפני כתיבת PostgreSQL ומקבלת רק `targetTenantId`,‏
`expectedVersion` ושלושת שדות הפרופיל. מפתח Idempotency מחושב דטרמיניסטית
מה־Operation ומה־Payload הקנוני; Repository קיים נועל את הפרופיל, בודק
Version, מסנכרן את שם ה־Tenant וכותב Event ו־Audit בלתי־משתנים באותה
Transaction. תגובת ה־API אינה כוללת Tenant ID, ‏External user ID או פרטי
Database. Allowlist או Rate-limit policy חלקיים/לא חוקיים נכשלים סגור;
כאשר שניהם חסרים הפעולה כלל אינה נרשמת.
חיבור פעולת ה־Vercel/React הקיימת ל־Railway operation והוכחת Staging עדיין
נדרשים לפני Cutover; ה־Route המקומי לבדו אינו ראיית Deployment.

7.1.58 פעולת ה־Server Action של עריכת Business Profile הועברה מקומית מ־D1
אל Railway API ללא Fallback. ‏Vercel BFF מנרמל את חמשת שדות הקלט, משנה רק
את שם שדה היעד מ־`tenantId` ל־`targetTenantId`, גוזר מפתח Idempotency
דטרמיניסטי ושולח את החוזה הקפוא ל־`/v1/connect`. ‏Clerk `auth().getToken()`
מספק את ה־Session token ו־`@vercel/oidc` מספק את Vercel OIDC token בזמן
הבקשה; שני הטוקנים נשארים בצד השרת בלבד. תגובה מוצלחת נבדקת שוב מול הקלט,
Version ו־timestamps לפני עדכון React state. קלט מורחב, Origin זדוני,
Identity חסרה, Response לא תואמת או Network failure נכשלים סגור. עדיין
נדרשים `RAILWAY_API_ORIGIN` חי, הגדרת OIDC ב־Vercel וראיית Staging אמיתית.

7.1.59 ארבע פעולות System Admin לניהול Tenant Subscription הועברו מקומית
מ־D1 ל־Railway API ללא Fallback: יצירה, הארכה, שינוי סטטוס וביטול. לכל
פעולה Operation ID נפרד, Payload מדויק ומפתח Idempotency דטרמיניסטי; כולן
משתמשות באותו Allowlist וב־Policy `system-admin-mutation`, אך כל Subject
כולל את ה־Operation ID ולכן נשאר ניתן למדידה. Railway מעביר ל־PostgreSQL רק
Target מפורש ושדות פעולה, וגוזר Actor וזמן בצד השרת. ה־BFF מאמת שוב Status,
Window, ‏Version, ‏Cancellation timestamp והתאמה לפעולה לפני עדכון ה־UI.
החוזה כולל כעת `INVALID_TRANSITION` ככשל `409` נפרד, כדי לא לערבב מעבר מצב
עסקי אסור עם Payload לא חוקי. המימוש עדיין דורש Origin, ‏OIDC, ‏Allowlist,
Rate-limit policy וראיית Staging חיים לפני Cutover.

7.1.60 מרכז החלטות ה־Production של System Admin הועבר מקומית במלואו מ־D1
ל־Railway API ללא Fallback. ‏`system-admin.production-decisions.list` היא
Query מאומתת שאינה צורכת Mutation quota ומחזירה רק רשומות השייכות ל־Registry
ללא Actor או Event key. ‏`system-admin.production-decisions.save` היא
Mutation בעלת Payload מצומצם, מפתח Idempotency דטרמיניסטי, Allowlist ומכסת
`system-admin-mutation`. ‏PostgreSQL נועל לפי Check ID, אוכף Version ורושם
Event בלתי־משתנה; Actor וזמן נגזרים בצד Railway. ה־Vercel handler מאמת מחדש
Registry membership, כפילויות, תוכן, Version ו־timestamps לפני הצגת הרשימה
או עדכון React state. גם ה־Loader וגם ה־Server Action הפעילים אינם מייבאים
עוד D1. עדיין נדרשים Origin, ‏OIDC, ‏Allowlist, ‏Policy וראיית Staging חיים.

7.1.61 ספריית ה־Tenants של System Admin הועברה מקומית מ־D1 ל־Railway API
ול־PostgreSQL ללא Fallback. הפעולה `system-admin.tenant-directory.list` היא
Query לקריאה בלבד: היא דורשת Clerk identity שנמצאת ב־System Admin Allowlist,
אך אינה עוברת ב־Tenant membership resolver ואינה צורכת מכסת Mutation.
ה־Payload כולל רק Cursor, חיפוש ושני Filters תחומים; ה־Repository מחזיר עד
50 רשומות בסדר Tenant עולה עם Keyset cursor. תגובת Railway משתמשת ב־
`targetTenantId` כדי לא לפתוח מחדש את שדה `tenantId` האסור בחוזה הכללי,
וה־Vercel BFF ממפה אותו חזרה רק ל־View הפנימי לאחר אימות מלא של Profile,
Subscription, ‏Status, ‏timestamps, סדר, Cursor והתאמה ל־Filters. גם ה־Loader
הראשוני וגם פעולת החיפוש/Pagination הפעילים אינם מייבאים עוד Runtime D1 או
System Admin session מקומי. עדיין נדרשים Origin, ‏OIDC, ‏Allowlist, פריסה
וראיית Staging חיים; העבודה המקומית אינה טענת Production cutover.

7.1.62 ‏Operational Reports הועברו מקומית מ־D1 ל־Railway API ול־PostgreSQL
ללא Fallback. גם טעינת ברירת המחדל של 30 ימי UTC וגם שינוי טווח התאריכים
משתמשים כעת ב־`reports.read`, עם Vercel OIDC ו־Clerk session שנקראים רק בצד
השרת. ה־Operation פותר Tenant מתוך Membership/Selection ב־Railway, אוכף
`reports.read` ואינו מקבל Tenant ID ב־Payload. התגובה צומצמה ל־
`OperationalReportView`: חלון Repository, ‏Tenant context ושדות פנימיים אינם
חוצים את הגבול. ה־BFF מאמת מחדש Period, ‏timestamp, כל מפתחות ומוני
Campaign/Message/Conversation/Bot/AI, סכומי קטגוריות, Currency ordering
ו־AI usage לפני עדכון React. חוזה הכשלים קיבל קודים נפרדים ל־Membership
חסר, Selection חסרה והרשאה חסרה, כדי לשמר את מצבי ההתאוששות הקיימים ב־UI.
עדיין נדרשים Origin, ‏OIDC, Clerk, ‏PostgreSQL וראיית Staging חיים.

7.2 עדיין חסר:

7.2.1 ערכי Team, ‏Project, ‏Environment ו־`APP_PUBLIC_ORIGIN` אמיתיים
בכל חשבון וסביבה, יחד עם Evidence שה־Claims בפועל תואמים לחוזה.

7.2.2 ‏Clerk keys אמיתיים בכל סביבה והוכחת `authorizedParties` מול
Production ו־Preview origins המאושרים.

7.2.3 הרחבת ה־Registry לשאר פעולות המוצר ולשאר ה־Mutations. עבור
`contacts.save` כבר קיים חוזה Idempotency, ‏Rate limiting, ‏Audit
ו־Transaction, ‏Executor ספק־נייטרלי ו־Node driver adapter. עדיין חסרים
ערכי Production pool ו־Rate-limit policy מאושרים, תצורת Railway Service חיה,
‏Data migration ו־Semantic parity מקומיים הושלמו לכל 51 הטבלאות. עדיין
קיים גם Full-source preflight אטומי ל־Export SQLite במצב Read-only. עדיין
קיים גם Signed bundle אטומי לכל עשרת ה־Slices עם Receipt בלתי־משתנה ודחיית
Replay. עדיין חסרים Export חי, טעינה ו־Recovery ב־Staging וכיסוי Concurrency
למסלולים שאינם כלולים ב־Harness.

7.2.4 Routes נפרדים ל־Vercel ול־Railway ו־Repository adapters עבור
PostgreSQL במקום D1.

7.2.5 Live accounts, ‏Secrets, ‏Staging, ‏Load test ו־Deployment
evidence.

7.3 לכן `web.server-api-boundary` נשאר `adapter-required` ואינו
`ready` ל־Cutover.

## 8. מפת תצורה

8.1 `APP_PUBLIC_ORIGIN` — Origin קנוני שמשמש גם Authorized Party.

8.2 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — מפתח Clerk הציבורי.

8.3 `CLERK_SECRET_KEY` — Secret שרתי בלבד.

8.4 `VERCEL_OIDC_TEAM_SLUG` — Team המדויק מתוך Vercel.

8.5 `VERCEL_OIDC_PROJECT_NAME` — Project המדויק מתוך Vercel.

8.6 `VERCEL_OIDC_ENVIRONMENT` — אחד מ־`development`, ‏`preview` או
`production` לפי ה־Environment שמורשה לפנות לשירות Railway המסוים.

8.6.1 `RAILWAY_API_ORIGIN` — Origin קנוני של Railway API ללא Path, ‏Query,
Fragment או Credentials. נדרש HTTPS; רק `development` מאפשר HTTP אל
`localhost`, ‏`127.0.0.1` או `::1`.

8.7 `DATABASE_URL` — Secret שרתי בלבד. אסור להעביר אותו ל־Vercel Web,
Browser, ‏Logs או Evidence.

8.8 `APP_RUNTIME_ENVIRONMENT`, ‏`POSTGRES_APPLICATION_NAME`, ‏
`POSTGRES_MAX_CONNECTIONS`, ‏`POSTGRES_CONNECTION_TIMEOUT_MS`, ‏
`POSTGRES_IDLE_TIMEOUT_MS`, ‏`POSTGRES_STATEMENT_TIMEOUT_MS`, ‏
`POSTGRES_QUERY_TIMEOUT_MS`, ‏`POSTGRES_LOCK_TIMEOUT_MS`, ‏
`POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS` ו־`POSTGRES_MAX_LIFETIME_SECONDS` —
חוזה Pool מפורש ללא Defaults.

8.9 `POSTGRES_TLS_MODE` חייב להיות `verify-full` ב־Staging/Production.
`POSTGRES_TLS_CA_PEM` אופציונלי רק כאשר הספק דורש Root CA מותאם.

8.10 `TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION`,‏
`TENANT_MUTATION_RATE_LIMIT_CAPACITY` ו־
`TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS` — Policy פנימית מפורשת
ל־Railway API. אין Defaults; שינוי Capacity או חלון מחייב גרסה חדשה.

8.10.1 `SYSTEM_ADMIN_MUTATION_RATE_LIMIT_POLICY_VERSION`,‏
`SYSTEM_ADMIN_MUTATION_RATE_LIMIT_CAPACITY` ו־
`SYSTEM_ADMIN_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS` — Policy נפרדת
לפעולות System Admin.

8.10.2 `META_WEBHOOK_RATE_LIMIT_POLICY_VERSION`,‏
`META_WEBHOOK_RATE_LIMIT_CAPACITY` ו־
`META_WEBHOOK_RATE_LIMIT_REFILL_PERIOD_SECONDS` — Policy נפרדת ל־Meta
webhook ingress. הערכים צריכים להיגזר מה־Throughput החי ולא מתקרה קשיחה
שמסתכנת בדחיית Webhooks תקינים.

8.11 כל הערכים נשארים `unknown/unavailable` עד להגדרת החשבונות. ערך
חסר, חלקי או לא חוקי מונע יצירת Verifier.

## 9. מקורות רשמיים

9.1 [Vercel — Connect OIDC to your own API](https://vercel.com/docs/oidc/api).

9.2 [Vercel — OIDC Federation](https://vercel.com/docs/oidc).

9.3 [Clerk — authenticateRequest](https://clerk.com/docs/reference/backend/authenticate-request).

9.4 [Clerk — Authenticated requests](https://clerk.com/docs/guides/development/making-requests).

9.5 תאריך אימות: `2026-08-17`. ערכי Team, ‏Project, ‏Issuer,
Audience, ‏authorized parties ו־Production origin נשארים
`unknown/unavailable` עד אישור Accounts.

9.6 [node-postgres — SSL](https://node-postgres.com/features/ssl).

9.7 [node-postgres — Pool](https://node-postgres.com/apis/pool).
