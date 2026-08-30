# חוזה API בין Vercel ל־Railway

תאריך הקפאה: 2026-08-21

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

2.6 ‏Correlation משתמש רק ב־W3C `traceparent` מגרסה `00`. הוא אינו
מתקבל מה־Browser ואינו חלק מה־Payload. ‏Vercel גוזר Trace ID ו־Span ID
אטומים באמצעות HMAC-SHA256 מ־`x-vercel-id` שהפלטפורמה מוסיפה לבקשה.

2.7 ‏`CONNECT_TRACE_CONTEXT_HMAC_KEY` הוא מפתח Base64URL קנוני של 32
בתים, נשמר רק ב־Vercel Vault ואינו מועבר ל־Railway. המימוש אינו משתמש
ב־`Math.random()`, ב־`randomUUID()` או בנתון Tenant/User/Recipient.

2.8 ‏Preview ו־Production נכשלים סגור כאשר המפתח או `x-vercel-id`
חסרים או פגומים. ‏Development ללא מפתח משמיט Correlation ואינו ממציא
מזהה. ה־Client מעביר רק `traceparent`; הוא אינו מעביר `tracestate` או
`baggage`.

2.9 ‏Railway קורא ומאמת `traceparent` רק לאחר ש־Vercel OIDC עבר אימות.
Context פגום מחזיר `INVALID_REQUEST` לפני אימות המשתמש ולפני Dispatch.
ה־Operation מקבל Context אטום בלבד; ה־HTTP response אינו חושף אותו.

2.10 ‏Vercel מפיק Root Client Span בעל ה־Trace ID וה־Span ID האטומים,
ו־Railway מפיק Server Span שהוא Child דטרמיניסטי שלו. לוגי OTLP בכל שירות
מקושרים ל־Span המקומי. Attributes אינם כוללים את ה־IDs, את `x-vercel-id`,
‏Headers, ‏Tokens, ‏Payload או Identity.

2.11 שני השירותים מפיקים מונה בקשות והיסטוגרמת משך בעלות Cardinality
תחומה. המימוש המקומי מכסה את נתיב ה־API בלבד ואינו מוכיח Ingestion חי,
Waterfall ב־Better Stack או כיסוי מלא לתורי Worker ולפעולות ספק אחרות.

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

5.5 Correlation חסר או פגום ב־Hosted environment נעצר לפני קריאת
Tokens ולפני Network call עם `CORRELATION_UNAVAILABLE` תחום.

## 6. גבולות Handler

6.1 ה־Handler מקבל `POST` ו־JSON לא דחוס בלבד.

6.2 ‏Vercel OIDC מאומת לפני Clerk; Clerk מאומת לפני קריאת ה־Payload;
ה־Payload מאומת לפני Dispatch.

6.3 ‏Preview identity אינו מתקבל ב־Production גם אם ה־JWT עצמו תקין.

6.4 גוף הבקשה נקרא כ־Stream ונעצר ברגע שעבר את המכסה. אין קריאת
`arrayBuffer()` בלתי־מוגבלת לפני בדיקת הגודל.

6.5 לכל Operation ננעל מראש `id` ו־`requestKind`. Caller אינו יכול
להציג Mutation כ־Query כדי לעקוף Idempotency.

6.6 ‏Railway אינו סומך על `traceparent` לפני אימות זהות השירות. לאחר
האימות הוא מקבל רק Version `00`, תווי Hex קטנים ו־Trace/Span שאינם אפס.
‏Version עתידי, Uppercase, מזהה אפס או Suffix נוסף נדחים.

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
Refill לפי זמן PostgreSQL. ‏Harness אמיתי עדכני עבר עם 27 Migrations ו־61
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

7.1.63 טעינת Contact Directory הועברה מקומית מ־D1 ל־Railway API
ול־PostgreSQL ללא Fallback, הן לטעינה הראשונה והן ל־Pagination. הפעולה
`contacts.list` פותרת Tenant והרשאת `contacts.read` ב־Railway ומחזירה באותה
תגובה גם Snapshot של Tags, ‏Lists והשיוכים עבור עד 50 אנשי הקשר שבדף.
ה־Payload מכיל רק Cursor חיובי או `null`; ‏Tenant או זהות משתמש אינם חוצים
את הגבול. ה־Vercel BFF מאמת מפתחות מדויקים, Contact IDs בסדר יורד, Cursor
התואם לרשומה האחרונה בדף מלא, Contact profile ו־timestamps קנוניים, Scope
זהה לדף, Group IDs ייחודיים ו־Relationships מסודרים המצביעים רק על Contact
ו־Group קיימים. טעינת Contacts וארגון בשתי קריאות PostgreSQL נפרדות שומרת
את הסמנטיקה הקיימת ואינה מבטיחה Snapshot טרנזקציוני חדש. פעולות שמירת
Contact, ‏Consent ושינוי Tags/Lists נשארו בשלב Mutation נפרד. עדיין נדרשים
Origin, ‏OIDC, Clerk, ‏PostgreSQL וראיית Staging חיים לפני Cutover.

7.1.64 שמירת Contact profile הועברה מקומית מ־D1 ל־Railway operation
`contacts.save`. ‏Vercel מנרמל את חמשת שדות הפרופיל ומצרף
`submissionOccurredAt` קנוני ומונוטוני שנוצר פעם אחת בכל Submit. השדה אינו
זמן עסקי, אינו מחליף את זמן ה־Audit שמופק בצד Railway ואינו משמש להכרעת
Conflict; תפקידו היחיד הוא להבדיל בין פעולה חדשה לבין Retry של אותה בקשה.
מפתח ה־Idempotency נגזר מכל ה־Payload, ו־Railway מחשב אותו מחדש ודוחה מפתח
שאינו תואם לפני צריכת מכסה או כתיבת PostgreSQL. לאחר מכן נשמר סדר ההגנות:
Tenant/Permission, ‏Rate limit, קבלת Receipt אטומית, השוואת Request digest,
Contact upsert, ‏Audit בלתי־משתנה ושמירת Replay response באותה Transaction.
ה־BFF מאמת תגובה בעלת מפתחות מדויקים, Replay flag בוליאני ו־Contact קנוני
התואם לפרופיל שנשלח לפני עדכון React. פעולות Tags/Lists עדיין נשארות
במסלול Mutation נפרד. עדיין נדרשים ערכי Policy, ‏Origin, ‏OIDC,
Clerk, ‏PostgreSQL וראיית Staging חיים לפני Cutover.

7.1.65 פעולות תיעוד Consent ו־Unsubscribe הועברו מקומית מ־D1 לשתי
Operations נפרדות: `contacts.consent.grant` ו־
`contacts.consent.unsubscribe`. ה־Payload כולל רק Contact ID חיובי ו־Evidence
מנורמל; Tenant ו־Actor נגזרים ב־Railway. כל בקשה דורשת הרשאת
`contacts.write`, מפתח Idempotency המחושב מחדש לפני צריכת מכסה ו־Rate limit
משותף. בניגוד ל־`contacts.save`, ה־Replay נשען על Domain event דטרמיניסטי
ובלתי־משתנה שנשמר יחד עם הקרנת מצב ה־Contact באותה PostgreSQL Transaction;
החוזה אינו טוען ל־Request receipt שאינו קיים. ה־BFF מקבל רק Contact קנוני
באותו ID, מסיר Tenant, ‏Actor, ‏Evidence reference וזמני Database, ואין
Fallback ל־D1. עדיין נדרשים ערכי Policy, ‏Origin, ‏OIDC, Clerk, ‏PostgreSQL
וראיית Staging חיים לפני Cutover.

7.1.66 ארבע פעולות Contact organization הועברו מקומית מ־D1 ל־Railway:
`contacts.organization.tag.save`, ‏`contacts.organization.list.save`,
`contacts.organization.tag-assignment` ו־
`contacts.organization.list-membership`. שמות Group מוגבלים ל־128 תווים
ללא תווי בקרה, ו־Assignment מקבל רק Contact ID, ‏Group ID ו־Boolean מדויקים.
Tenant ו־Actor נגזרים בצד Railway ואינם חוצים את ה־Payload.

7.1.67 כל פעולה מחשבת מחדש מפתח Idempotency לפני צריכת מכסת
`tenant-mutation`. ‏Receipt claim, כתיבת Tag/List או Relationship, קריאת
Snapshot, ‏Audit בלתי־משתנה ושמירת Replay response מבוצעים באותה PostgreSQL
Transaction ברמת `read-committed`. ‏Conflict, יעד חסר ותלות לא זמינה
נשמרים כמצבים נפרדים. ה־BFF מקבל רק Replay flag בוליאני ו־Snapshot קנוני
ב־Scope ריק ליצירת Group או ב־Scope של Contact יחיד לשינוי Relationship;
אין D1 fallback. עדיין נדרשים ערכי Policy, ‏Origin, ‏OIDC, Clerk,
PostgreSQL וראיית Staging חיים לפני Cutover.

7.1.68 ‏Contact Import הועבר מקומית מ־D1 לשתי Operations:
`contacts.import.start` ו־`contacts.import.chunk`. ה־BFF מאמת File metadata,
Digest, ‏Mapping ו־Rows ללא Tenant או Actor, ומחשב מפתח Idempotency
דטרמיניסטי מה־Payload הקנוני. Railway פותר Session והרשאת `contacts.write`
וצורך מכסת `tenant-mutation` לפני כתיבה.

7.1.69 ‏Chunk נועל את Import Job לפני עיבוד כדי לסדר בקשות מקבילות. פתיחת
Job או עיבוד Chunk, עדכון Contact/Row/counters, כתיבת Audit, שמירת Response
והשלמת Receipt מתבצעים באותה PostgreSQL Transaction ברמת
`read-committed`. ‏Replay מחזיר את אותה תגובה, Digest סותר מחזיר Conflict,
ו־Job חסר נבדל מתלות לא זמינה. תגובת ה־BFF כוללת רק Job summary ועד שישה
Contact records קנוניים ללא Evidence פנימי; אין D1 fallback. עדיין נדרשים
ערכי Policy, ‏Origin, ‏OIDC, Clerk, ‏PostgreSQL וראיית Staging חיים לפני
Cutover.

7.1.70 ‏Message Template Directory ו־Draft Save הועברו יחד כדי למנוע
Split-brain. ‏`templates.list` קוראת עד 100 תבניות Tenant-scoped מ־PostgreSQL
ומחזירה רק DTO קנוני והרשאת כתיבה נגזרת. ‏`templates.draft.save` מקבלת Draft
במבנה מדויק ללא Tenant, ‏Actor, ‏Meta ID או שדות Lifecycle.

7.1.71 שמירת Draft דורשת `templates.write`, מכסת `tenant-mutation` ומפתח
Idempotency דטרמיניסטי הנבדק מחדש. ‏Receipt claim, יצירה/עדכון של Draft,
Audit בלתי־משתנה ושמירת Replay response מתבצעים באותה PostgreSQL Transaction
ברמת `read-committed`. ‏Draft נעול, Digest סותר ותלות לא זמינה נשמרים
כמצבים נפרדים. ה־BFF של List ושל Save דוחים שדות עודפים, Lifecycle לא עקבי,
כפילויות וסדר שגוי; לשניהם אין D1 fallback. ‏Sync הישן נשמר בקוד לצורך
המעבר ונכשל סגור. ‏Submit מחובר כעת ל־BFF ול־Operation
`templates.submit`, אך דגל ה־UI נשאר כבוי עד השלמת ראיות חיות.

7.1.72 ‏`templates.submit` אינו פונה ל־Meta מתוך בקשת המשתמש. Railway
מאמת `templates.write`, צורך מכסת `tenant-mutation`, נועל Receipt, חיבור
Meta ותבנית, ואז שומר Template claim, ‏Outbox במצב `pending`, אירוע
`staged`, ‏Audit ו־Replay response באותה Transaction ברמת
`read-committed`. כך בקשה זהה שממתינה ל־Receipt מקביל רואה את ה־Commit
ומחזירה `replayed`; ‏Template version ו־row locks מגנים בנפרד על מצב העסק.
ה־Outbox מקבע Template version, ‏Meta connection version,
‏WABA, ‏Graph API version ומפתח הבקשה. אין D1 fallback ואין Secret בתגובה.

7.1.73 ‏Worker נפרד נועל את הרשומה ומבצע לכל היותר Meta `POST` אחד.
Success או Rejection ידוע נכתבים יחד עם שינוי התבנית ו־Event בלתי־משתנה.
Timeout, ‏Network failure, תגובה לא תקינה או קריסה לאחר Claim מסומנים
`ambiguous`; הם אינם נשלחים אוטומטית פעם נוספת. Reconciliation משתמש רק
ב־`GET /{waba-id}/message_templates`, דורש התאמה יחידה של
`name+language+category`, וממתין חלון חסד תחום לפני שחרור התבנית כשאין
התאמה. התאמות מרובות או כשל קריאה נשארים `deferred`.

7.1.74 ‏Migration `0026_message_template_submission_outbox.sql` מוסיפה
Outbox ו־Transition events עם Constraints, ‏Triggers ו־Audit linkage.
נוספו Candidate scans תחומים ל־`pending` ול־`ambiguous`, ‏Queue consumer
של עד 10 הודעות ו־Maintenance cycle ספק־נייטרלי. פרסום הוא At-least-once;
נעילת ה־Claim היא גבול ה־Idempotency שמונע POST כפול. ה־Registry כולל כעת
27 Migrations, מהן חמש Railway-only, וה־Foundation כולל 45 Adapters.
ה־Migration והזרימות עברו Contract/Mock tests וגם Harness חי מול
PostgreSQL 16.13. עדיין אין ספק Queue/DLQ, ‏Publisher adapter, ‏Credentials
חיים או ראיית Railway Staging; לכן ה־UI נשאר מושבת ואין טענת Provider
readiness או Cutover.

7.1.75 ‏Maintenance cycle של `templates.submit` מחובר כעת ל־Railway
Worker scheduler תחת אותו Lease ו־Fencing של יתר המשימות הדקתיות. ה־Service
מרכיב אותו מאותו PostgreSQL Foundation רק כאשר מוזנים Environment מלא
ו־Queue publisher מפורש. כשל תחזוקה מונע השלמת Tick, אך אינו גורם ל־POST
נוסף לרשומה `ambiguous`; התאוששות ממנה נשארת GET-only. החיבור אינו מממש
Queue adapter ואינו משנה את מצב ה־Cutover: ספק Queue/DLQ, ‏Telemetry sink חי,
Credentials וראיית Staging עדיין חסרים.

7.1.76 ‏Maintenance telemetry כוללת רק Outcome, זמן ותשעה מונים תחומים;
אין בה Tenant, ‏WABA, ‏Template/Submission identity, ‏Payload או Credential.
ה־Worker composition דורש Sink מפורש כאשר המשימה מופעלת. כשל Sink אינו
משנה את תוצאת העבודה, אך כשל Runner נרשם כ־Failed ומונע השלמת Tick. זהו
חוזה מקומי בלבד: לא נבחרו Monitoring sink, ‏Alert policy או Dashboard חיים.

7.1.77 נוסף Bootstrap ספק־נייטרלי ל־Railway Worker. הוא מקבל רק
`RAILWAY_WORKER_SCHEDULER_OWNER_KEY` במבנה דטרמיניסטי, יוצר Service לפני
Process, מבודד כשלים של Telemetry ומנקה את ה־Service אם בניית ה־Process או
הפעלתו נכשלות. שגיאות Environment, ‏Service ו־Process ממופות לקודים תחומים
ללא פרטים פנימיים. ה־Bootstrap אינו בוחר Queue או Sink; לכן עדיין אין
Executable entry point אמיתי עד שה־Adapters המאושרים מוזרקים ל־Factory.

7.1.78 נוסף `railwayWorkerExecutable` כ־Composition root אחרון לפני
Adapter הספק. הוא מעביר ל־Bootstrap רק Owner key, ומחזיק את PostgreSQL
Environment, ‏Campaign queue, ‏Template publisher ו־Telemetry sink בתוך
Service factory. אין Fallback: Campaign queue חסר, Publisher/Sink חלקיים,
Clock לא תקין או אפשרות מורחבת נדחים לפני Start. כאשר Template maintenance
אינה מוגדרת היא נשארת כבויה במפורש. עדיין חסרים Entry module ו־Package
script שמייבאים Adapters של ספק שנבחר בפועל.

7.1.79 נוסף חוזה קבלה גרסה 1 לכל ארבעת ה־Queues. הוא מקבע At-least-once,
Batch של 10, עשרה Retries, ‏DLQ, ‏Ack מפורש, שימור Payload וחמש הוכחות
התנהגות ב־Staging. ‏Campaign דורש Delay מוגדר של 24 שעות;
Invitation ו־Template submission דורשים 30 שניות. ראיה קשורה ל־Commit
ול־Artifact, תקפה עד 24 שעות ואינה כוללת זהויות משאב או חשבון. זהו Connect
policy לשימור התנהגות, לא מגבלת Meta או הבטחת יכולת של ספק שטרם נבחר.

7.1.80 נוסף CLI שנכשל סגור לאימות קובץ Queue evidence. הוא קורא קובץ
רגיל ובבעלות המשתמש בלבד, חוסם Symlink, הרשאות כתיבה משותפות, שינוי בזמן
קריאה וגודל מעל 48,000 Bytes. לאחר מכן הוא דורש התאמה מלאה ל־Commit של
Release נקי, ל־Artifact digest מפורש ולחלון התוקף, ומדפיס רק תוצאה תחומה.
ה־CLI אינו מייצר Evidence ולכן אינו משנה את מצב הספק: עדיין נדרשים Adapter
וראיית Staging אמיתיים.

7.1.81 ‏Production Readiness כולל כעת שער נפרד ל־Target Queue Adapter.
בדיקות ה־Queue הישנות נשארות Ready רק כראיה שה־Cloudflare baseline קיים;
הן אינן מוכיחות את יעד Vercel/Railway. השער החדש נשאר חסום בקוד
`TARGET_QUEUE_ADAPTER_REQUIRED` עד חיבור Adapter אמיתי, בלי להסיק שבחירת
Redis/BullMQ המוצעת כבר אושרה.

7.1.82 ‏Harness האינטגרציה החי מחיל כעת את כל 27 ה־Migrations ומוכיח
61 תרחישי Concurrency. עבור `templates.submit` הוא מוכיח שתי בקשות זהות
במקביל שמסתיימות `committed + replayed`, את מחזור
`pending → submitting → ambiguous → submitted`, את הקרנת התבנית ל־
`pending_review` ואת חסימת שינוי אירועי ה־Audit. במהלך ההוכחה אותר ותוקן
Race Condition: ‏`repeatable-read` הסתיר מהבקשה הממתינה Receipt שהושלם;
כל ארבעת ה־Executors המבוססים על Receipt משתמשים כעת ב־`read-committed`,
בהתאם לחוזה ה־Receipt. ‏Receipt uniqueness, ‏row locks ו־version guards
ממשיכים להגן על הכתיבות העסקיות.

7.1.83 כל מסלול השיחות הועבר מקומית כיחידה אחת כדי למנוע Split-brain:
`conversations.list`, ‏`conversations.thread.read`, ‏`conversations.mark-read`
ו־`conversations.assignment.change`. שתי הקריאות דורשות
`conversations.read`; שתי המוטציות דורשות `conversations.reply`, מכסת
`tenant-mutation`, מפתח Idempotency דטרמיניסטי, Receipt, שינוי מצב, Audit
ותגובת Replay באותה Transaction ברמת `read-committed`.

7.1.83.1 ה־Vercel BFF מאמת Filters, מפתחות, גרסאות וכל DTO שחוזר מ־Railway,
ומסיר Tenant, ‏Contact, ‏Provider ו־External-user identities. ‏Current inbox,
Refresh, ‏Thread, ‏Mark-read ו־Assignment אינם משתמשים עוד ב־D1 fallback.
ה־Harness החי הוכיח את ארבע פעולות ה־HTTP מול PostgreSQL 16.13, כולל שני
Races נפרדים שהחזירו `committed + replayed`, שני Receipts, שני Audit records
ומצב סופי עקבי. בכך עלה הסך ל־61 תרחישי Concurrency.

7.1.84 קריאות Bot flow הועברו ל־Railway/PostgreSQL בשתי פעולות תחומות:
`bot.flows.list` ו־`bot.flows.details.read`. שתיהן דורשות `bot.read` ומחזירות
רק Summary/Version/Definition ציבוריים; ‏Tenant ו־External-user identities
אינם עוברים ל־BFF. ה־BFF מאמת מפתחות, סטטוסים, timestamps, סדר גרסאות,
Latest/Active version consistency והגדרת Flow לפני הצגה. ‏Current directory
ו־Load details אינם משתמשים עוד ב־D1 fallback. כתיבות Draft/Publish עדיין
נשארות מחוץ ל־Cutover עד שיושלם עבורן חוזה Mutation אטומי עם Receipt ו־Audit.

7.1.85 כתיבות Bot flow הועברו גם הן ל־Railway/PostgreSQL. הפעולות
`bot.flows.draft.save` ו־`bot.flows.publish` דורשות `bot.write`, מכסת
`tenant-mutation`, מפתח Idempotency ו־Request digest דטרמיניסטיים. ‏Receipt,
שינוי ה־Draft או ה־Publication, ‏Audit ותגובת Replay נשמרים באותה Transaction
ברמת `read-committed`. ה־BFF דוחה Tenant, ‏Actor ושדות Lifecycle מהדפדפן,
ומאמת תשובה ציבורית תחומה. יחד עם List ו־Details, כל ארבע פעולות ה־Feature
פועלות כעת ללא D1 fallback. ה־Foundation כולל 46 Adapters; ה־Harness החי
הוכיח Draft ו־Publish מקבילים דרך HTTP והעלה את הסך ל־63 תרחישי Concurrency.

7.1.86 ‏Campaign directory, ‏Snapshot ו־Activation הועברו יחד
ל־Railway/PostgreSQL כדי למנוע Split-brain. הקריאה דורשת `campaigns.read`;
המוטציות דורשות `campaigns.write`, מכסת `tenant-mutation`, מפתח Idempotency
ו־Request digest דטרמיניסטיים. ‏Receipt, ‏Snapshot/Activation, ‏Audit ותגובת
Replay נשמרים באותה Transaction ברמת `read-committed`. ‏Activation נכשלת
סגור כל עוד Queue/Scheduler היעד אינם מוגדרים. ה־BFF מאמת קלט ופלט תחומים
ואינו חושף Tenant או מזהי ספק. כל שלוש הפעולות פועלות ללא D1 fallback.
ה־Foundation כולל 47 Adapters; ‏PostgreSQL 16.13 חי הוכיח Snapshot ו־Activation
מקבילים דרך HTTP והעלה את הסך ל־65 תרחישי Concurrency.

7.1.87 ‏AI reply approval list ו־decide הועברו יחד ל־Railway/PostgreSQL כדי
למנוע Split-brain בין רשימת ההמתנה לבין החלטת הסוכן. הקריאה דורשת
`conversations.read`; ההחלטה דורשת `conversations.reply`, מכסת
`tenant-mutation`, מפתח Idempotency ו־Request digest דטרמיניסטיים. ‏Receipt,
שינוי ה־Outbox, ‏Audit ותגובת Replay נשמרים באותה Transaction ברמת
`read-committed`. ה־BFF דוחה Tenant, ‏Actor ושדות פנימיים, ומחזיר DTO ציבורי
תחום. שתי הפעולות פועלות ללא D1 fallback. ה־Foundation כולל 48 Adapters;
‏PostgreSQL 16.13 חי הוכיח שתי החלטות זהות במקביל דרך HTTP עם שינוי,
Receipt ו־Audit יחידים והעלה את הסך ל־67 תרחישי Concurrency.

7.1.88 ‏Onboarding business profile read ו־save הועברו יחד
ל־Railway/PostgreSQL. הקריאה מאפשרת למשתמש מאומת שטרם קיבל Tenant לקבל
`profile:null`; השמירה הראשונה יוצרת Tenant, ‏Owner ו־Profile אטומיים.
משתמש קיים נדרש ל־`workspace.manage`. המכסה נצרכת לפי זהות המשתמש לפני
פתרון Tenant, ולאחר מכן Receipt, ‏Request digest, ‏Provisioning/Update,
‏Audit ותגובת Replay נשמרים ב־Transaction אחת מסוג `read-committed`.

7.1.88.1 ה־BFF מנרמל את שלושת שדות הפרופיל בלבד, דוחה שדות מורחבים ומאמת
פלט ציבורי שאינו כולל Tenant, ‏Actor, ‏Receipt או Digest. שכבות
`currentBusinessProfile` ו־`saveBusinessProfileAction` אינן משתמשות עוד
ב־D1 fallback. ‏PostgreSQL 16.13 חי הוכיח שתי שמירות ראשונות זהות במקביל:
Tenant, ‏Owner, ‏Profile, ‏Receipt ו־Audit יחידים ו־`committed + replayed`.
ה־Foundation כולל 49 Adapters והסך עלה ל־69 תרחישי Concurrency.

7.1.88.2 ‏Optional tenant resolution מבדיל כעת בין שני מצבים: רק אפס
Memberships פעילים הוא משתמש חדש ומחזיר `profile:null`; Membership קיים
ששייך ל־Tenant במצב לא כשיר נכשל ב־`PERMISSION_DENIED`. לכן Workspace
`suspended`, ‏`cancelled`, ‏`expired` או `blocked` אינו יכול לעקוף את חסימת
הגישה דרך מסלול Onboarding. ה־Harness החי הוכיח `403` לקריאה ולשמירה לאחר
חסימת ה־Tenant, וכן הוכיח שלא נוצרו Profile update, ‏Receipt או Audit נוספים.

7.1.89 מסלול בחירת סביבת העבודה הפעיל הועבר במלואו ל־Railway/PostgreSQL:
`tenant-selection.directory.read` מחזיר עד 100 אפשרויות עם Selection key
אטום, Display name, ‏Role ומצב בחירה בלבד. `tenant-selection.save` מקבל רק
Selection key ו־Expected version; Tenant ו־Actor נגזרים בצד השרת מזהות Clerk
ומ־Membership כשירה, ולא מקלט הדפדפן.

7.1.89.1 השמירה משתמשת במכסת Tenant mutation לפי זהות המשתמש, במפתח
Idempotency וב־Request digest דטרמיניסטיים. ה־Executor נועל Membership
ו־Tenant, ושומר Selection, ‏Receipt, ‏Audit ותגובת Replay באותה Transaction.
הוא בודק שוב את ההרשאה גם לפני Replay כדי למנוע החזרת תוצאה לאחר ביטול גישה.

7.1.89.2 ‏PostgreSQL 16.13 אמיתי הוכיח Directory של שני Tenants ושתי
בחירות זהות במקביל: Selection אחת בגרסה 1, ‏Receipt אחד, ‏Audit אחד ותשובות
`committed + replayed`. הפלט לא כלל Tenant ID, ‏External user ID או Digest.
ה־Foundation כולל 50 Adapters והסך עומד על 71 תרחישי Concurrency. שכבות
`tenantSelectionActions` ו־Current handler אינן משתמשות עוד ב־D1 fallback.

7.1.90 ‏Team Directory הפעיל הועבר לקריאה דרך Railway/PostgreSQL:
`team.directory.read` מקבלת Payload ריק בלבד, פותרת את סביבת העבודה דרך
Vercel OIDC, ‏Clerk session ו־Tenant selection מאומתת, ודורשת `team.manage`
לפני גישה ל־Membership repository.

7.1.90.1 התגובה מחזירה עד 100 חברים באמצעות Member key ו־Reference code
אטומים, Role, ‏Version וסימון Current user. היא אינה כוללת Tenant ID או
External user ID. ‏BFF נכשלת סגור מול שדות מורחבים, מפתחות כפולים, Reference
code סותר, Current user חסר או יותר מאחד ונתוני Identity חלקיים.

7.1.90.2 ספק Identity Directory טרם נבחר. לכן המסלול מחזיר במפורש
`identityStatus=unavailable` ו־`displayName/primaryEmail=null`; הוא אינו
ממציא פרופילים. ‏PostgreSQL 16.13 אמיתי הוכיח את הקריאה דרך HTTP לאחר בחירת
Tenant. שכבת `currentTeamDirectory` אינה משתמשת עוד ב־D1 fallback.

7.1.91 פעולות Membership הפעילות הועברו במלואן ל־Railway/PostgreSQL:
`team.membership.role.change`, ‏`team.membership.status.change`
ו־`team.membership.owner.transfer`. כל Payload כולל רק Member key אטום,
Expected versions והמצב המבוקש. Tenant, ‏Actor ו־External user IDs נגזרים
מ־Vercel OIDC, ‏Clerk session ו־Tenant selection מאומתת.

7.1.91.1 כל פעולה דורשת Owner פעיל, `workspace.manage`, מכסת
`tenant-mutation` ו־Idempotency key דטרמיניסטי התואם ל־Payload. שינוי הנתונים
ו־Membership event בלתי־משתנה נכתבים באותה PostgreSQL Transaction. החוזה
מוסיף `STALE_SESSION` ככשל 409 תחום כאשר סמכות ה־Owner השתנתה בין אימות
ה־Session לנעילת ה־Membership.

7.1.91.2 ‏BFF מחזיר רק Member key, ‏Role, ‏Status ו־Version. Parsers
נכשלים־סגור מול שדות מורחבים, תפקיד Owner בפעולת Role רגילה, גרסה שאינה
הגרסה הצפויה או הבאה וזהויות גולמיות. PostgreSQL 16.13 אמיתי הוכיח שתי
בקשות Role זהות במקביל: שינוי אחד, Event אחד ותוצאות `updated + unchanged`.
ה־Foundation נשאר על 50 Adapters והסך עלה ל־73 תרחישי Concurrency.

7.1.92 בקשת הזמנה פעילה הועברה ל־Railway/PostgreSQL באמצעות
`team.invitation.request`. ה־BFF מנרמל Email ותפקיד, גוזר Idempotency key
מה־Payload ואינו מקבל או מחזיר Tenant, ‏Actor, ‏Invitation key או Delivery
key. Railway פותר Session נבחר, דורש `team.manage` ומכסת
`tenant-mutation`, ואז מפעיל את חוזה Invitation הקיים.

7.1.92.1 ‏Invitation, ‏Event ו־Delivery נשמרים אטומית לפני Publication.
ה־Publisher מוזרק ואינו קשור לספק; בהיעדר Policy מתקבל
`CONFIGURATION_REQUIRED`, ובהיעדר Queue מתקבל `DEPENDENCY_UNAVAILABLE`.
אין Adapter מדומה שמסמן הצלחה. Retry רשאי לפרסם שוב אותו Delivery key כדי
לאפשר Recovery, וה־Consumer נשאר Idempotent.

7.1.92.2 ‏PostgreSQL 16.13 אמיתי הוכיח שתי בקשות זהות במקביל: תוצאות
`queued + already-pending`, ‏Invitation אחת, ‏Event אחד ו־Delivery אחד.
שתי פרסומות נשאו אותו Delivery key ולא חשפו זהויות בתגובה. הסך עלה ל־75
תרחישי Concurrency. קבלת ההזמנה אינה חלק מה־Cutover הזה: היא דורשת Resolver
מאומת ל־Primary email בצד Railway וראיות Activation חיות של Clerk.

7.1.93 קבלת הזמנה פעילה הועברה ל־Railway/PostgreSQL באמצעות
`team.invitation.accept`. ‏Vercel BFF שולחת רק Invitation key מנורמל ומפתח
Idempotency דטרמיניסטי. היא אינה שולחת Email, ‏Tenant ID או External user ID.

7.1.93.1 Railway מאמת תחילה Vercel OIDC ו־Clerk session, מפעיל מכסה לפי
המשתמש, ואז קורא ישירות מ־Clerk את ה־Primary Email של אותו User ID ודורש
`verification.status=verified`. אימייל שהדפדפן מנסה להוסיף ל־Payload נדחה
לפני Clerk ולפני PostgreSQL. כשל אימות מקבל `IDENTITY_VERIFICATION_REQUIRED`;
מצבי הזמנה שונים מקבלים כולם `INVITATION_UNAVAILABLE` ללא דליפת מצב פנימי.

7.1.93.2 ה־Repository האטומי הקיים יוצר Membership ו־Acceptance, מקדם את
גרסת ההזמנה ומבטל Delivery ממתינה באותה Transaction. ‏PostgreSQL 16.13
אמיתי הוכיח שתי קבלות מקביליות: `accepted + already-accepted`, Membership
אחת, Acceptance אחת ו־Delivery אחת במצב `cancelled`. הסך עלה ל־77 תרחישי
Concurrency. הפעלת Staging/Production עדיין דורשת Clerk keys ו־Browser E2E
evidence אמיתיים; הקוד המקומי אינו מסמן אותם כמוכנים.

7.1.94 ניהול מדיניות שליחת WhatsApp הועבר ל־Railway/PostgreSQL בשלוש
פעולות System Admin: קריאה, אישור Evidence והפעלת Kill Switch. ה־BFF מאמת
Input לפני Identity access, גוזר Idempotency key דטרמיניסטי לכתיבות ומעביר
OIDC ו־Clerk session בלבד. Railway דורש Allowlist ומכסת
`system-admin-mutation`, וקורא את Meta connection ואת Policy repository
מאותו PostgreSQL Foundation.

7.1.94.1 החוזה אינו מחזיר שדות בשם `tenantId`, ‏`businessPortfolioId`,
`wabaId`, ‏`phoneNumberId` או `externalUserId`. מזהי הספק נשלחים בשמות
Expected ייעודיים ונבדקים מול הרשומה הנעולה; Vercel משחזר רק את ההקשר
המקומי ומוודא שהתוצאה תואמת במדויק למכסה, Throughput, ‏Evidence digest,
Graph version, תוקף, Connection version ו־Policy version שנשלחו.

7.1.94.2 ‏PostgreSQL 16.13 אמיתי הוכיח שתי פעולות Approve זהות ושתי פעולות
Kill Switch זהות במקביל דרך HTTP מאומת. בכל זוג התקבלו
`updated + unchanged`, בלי Event כפול. באותה הרצה תוקן Replay של בקשת
Invitation כאשר שני Clocks שונים במילישנייה: ה־Event וה־Delivery השמורים הם
מקור האמת ל־Replay. אותה הגנה חלה על Approval ו־Kill Switch: ‏Retry זהה
שכבר יצר את הגרסה הבאה חוזר כ־`unchanged` גם אם Timestamp השרת השתנה.
הסך נשאר 79 תרחישי Concurrency בשלוש ההרצות המתועדות בסעיף זה; האחרונה אימתה גם
Retry סדרתי לאחר שני המרוצים.

7.1.95 ספריית AI Agents, קריאת פרטים, שמירת Draft ופרסום Draft הועברו
ל־Railway/PostgreSQL. ה־Vercel BFF משתמש ב־Vercel OIDC וב־Clerk session,
שולח DTO קנוני ומוגבל, וגוזר Idempotency key דטרמיניסטי לשתי הכתיבות. אין
D1 fallback באף אחד מארבעת המסלולים.

7.1.95.1 Railway גוזר Tenant ו־Role מהזהות המאומתת, דורש `ai.read` או
`ai.write`, ומחזיר רק Agent keys, גרסאות, תצורת Agent תחומה ומקורות ידע ללא
Tenant ID, ‏External user ID, ‏Storage object key או Content digest. שמירת
Draft, ‏Receipt ו־Audit מתבצעת ב־Transaction אחת; Retry זהה מחזיר Replay של
התוצאה שכבר נשמרה.

7.1.95.2 פרסום נשאר חסום־בטוח עד שקיימות החלטות ותצורות AI תפעוליות.
Activation blockers מוחזרים כרשימה סגורה, וה־Transaction מתבטלת בלי Receipt
חלקי. PostgreSQL 16.13 אמיתי הוכיח שתי שמירות Draft מקבילות, קריאת Directory
ופרסום חסום; הסך עלה ל־80 תרחישי Concurrency. במהלך האימות נחשף ותוקן Fixture
Reporting ישן בעל זהות AI Agent לא־קנונית.

7.1.96 עובדות Staging עבור Deferral של Bot reply מחוברות כעת ל־PostgreSQL
Provenance העמיד. ‏Railway Foundation חושף Producer שמאמת את ה־Delivery
הפעיל, Claim, ‏Reservation-derived event digest, ‏Code/Scope, ‏Retry וזמני
Run לפני כתיבה ל־Observation ledger. ‏130429 ו־131056 אינם נגזרים משם
תרחיש או מ־Expected result; חסר או Drift נכשלים סגור. הרצה חיה ב־Railway
עם WABA מורשה עדיין חסרה ואינה נרמזת מן ההוכחה המקומית.

7.1.97 תרחישי `text-send` ו־`button-send` מחוברים כעת ל־Provider
acceptance העמיד. ‏Producer חדש דורש Delivery במצב `accepted`, ‏Provider
link תואם, זמן Acceptance זהה וסוג Payload מתאים לפני כתיבת Observation.
‏Replay מסוג `duplicate` אינו ראיה בפני עצמו; הוא מתקבל רק כאשר אותה
Acceptance כבר קיימת. ‏Button reply עדיין חסום בכוונה עד לשמירת
`selectedBotOptionKey` והקישור להודעת המקור כ־Provenance עמיד.

7.1.98 תרחיש `button-reply` מחובר כעת ל־Provenance עמיד במקום להיסק
מ־Webhook זמני. ‏D1 ו־PostgreSQL שומרים באופן אטומי ובלתי־משתנה את מפתח
האפשרות שנבחרה ואת הקישור ל־Delivery היוצא, ורק לאחר אימות Provider link,
Tenant, סוג Payload והאפשרות המקורית. ‏Producer ייעודי קורא מן ה־Ledger
רק מזהים פנימיים, מפתח אפשרות וזמן; הוא אינו קורא או מעביר מספר טלפון,
תוכן הודעה, Provider message ID או Credentials. ‏Button reply חסר, חלקי
או סותר נכשל סגור לפני יצירת Observation.

7.1.99 תרחיש `customer-window-expired` מחובר כעת לדחיית Meta עמידה בקוד
131047. ‏D1 ו־PostgreSQL כותבים באופן אטומי ובלתי־משתנה את דחיית ה־Delivery
ואת ה־Provenance רק לאחר התאמת Inbound source, חלון 24 שעות, Claim,
`service-reply` reservation ו־`provider-failed` settlement. ‏Producer
ייעודי מפיק Observation רק מן ה־Ledger הזה ומתוצאת Dispatch תואמת; הוא
אינו קורא מספר טלפון, תוכן, Provider payload, ‏Provider message ID או
Credential. קוד חסר, מומצא, ישן או סותר נכשל סגור.

7.1.100 תרחיש `duplicate-safety` מחובר כעת ל־Provider-request fence עמיד
לפני גבול ה־Meta POST. ‏Railway PostgreSQL מאפשר Fence יחיד לכל
Delivery/Claim ו־Reservation מסוג `service-reply`; ה־Processor אינו קורא
לספק כאשר אותו Fence כבר קיים. ‏Producer דורש Fence יחיד, Acceptance יחידה
ושתי תוצאות Dispatch בפועל כשהשנייה `duplicate`, ורק אז כותב ספירה של שתי
הפעלות ובקשת Provider אחת. השאילתה אינה קוראת Provider message ID, מספר
טלפון, תוכן הודעה, Reply JSON, ‏Token או Credential.

7.1.101 תרחיש `kill-switch` מפיק Observation רק אחרי הצלבה עמידה של
Policy גרסה N במצב `enabled`, גרסה N+1 במצב `disabled`, Audit יחיד,
Delivery שנדחה עם `WHATSAPP_ADMISSION_UNAVAILABLE`, זמן Retry זהה לתוצאת
ה־Worker, אפס `bot_reply_provider_request_claims` ואפס Provider
acceptances. כל Policy מאוחר שהיה פעיל בזמן הדחייה מבטל את הראיה. השאילתה
אינה בוחרת מספר טלפון, Reply JSON, תוכן או Provider message ID.

7.1.102 ‏Railway bot-reply staging worker יוצר כעת Graph reader חי מאותו
PostgreSQL Meta connection ומאותו Credential envelope שמשמשים את ה־Worker.
ה־Reader מאמת App דרך `debug_token`, קשר Portfolio→WABA→Phone דרך Graph,
וקורא מן המספר את `throughput`, ‏`is_on_biz_app` ו־`platform_type`.
המיפוי היחיד שמתקבל הוא 20 ל־Coexistence STANDARD, ‏80 ל־STANDARD רגיל
ו־1,000 ל־HIGH רגיל; ערך חסר, חדש או סותר נכשל סגור. גרסת ה־Graph,
Connection version, ‏Run, ‏Operation, ‏Release, ‏Commit, ‏Artifact ו־Lease
נכללים ב־Digest הקנוני. אין Token, ‏App secret או מזהה Provider גולמי
בתוצאת ה־Evidence.

7.1.103 ‏Security/Telemetry reader קונקרטי מחובר כעת לאותו Railway
PostgreSQL worker. גבול ה־Credential דורש מעטפת מוצפנת Exact-key ומבצע
פענוח רק בתוך callback של ה־Vault; ה־Access token אינו נכתב ל־Fact או
ל־Digest. גבול ה־Redaction מקבל רק Better Stack evidence מאומת, בתוקף
ותואם ל־Release/Commit/Artifact, ודורש `verifiedAt` בתוך חלון ה־Run וה־
Lease. ה־Factory אינו יכול עוד לקבל Security reader סטטי שאינו קשור לאותו
Runtime.

7.1.104 ‏Bot-reply staging מחובר כעת אל Railway BullMQ Worker Main
מאחורי Opt-in מפורש. ‏Kill-switch אטומי דורש Tenant, ‏Connection version
ו־Policy version מדויקים, מעתיק את Snapshot המדיניות לגרסת `disabled`
עוקבת ומאפשר Replay רק לאותו Actor. כל Readers, ‏Producers וה־Kill-switch
מגיעים מאותו PostgreSQL Foundation. ארבעת ה־Queues הבסיסיים אינם משתנים;
Queue חמישי נפתח רק כאשר `BOT_REPLY_STAGING_ENABLED=true` וכל Configuration
הפרטי, ה־Telemetry וגבולות הבטיחות תקינים לפני Worker startup.

7.1.105 נוסף Activation preflight משותף לפקודת CLI ול־Worker Main. הוא
בודק שבעה גבולות Staging ללא חיבור ל־PostgreSQL/Redis וללא פנייה ל־Meta:
Environment, מלאי פרטי, שני מפתחות HMAC, ‏Meta Graph configuration,
Credential encryption ו־Better Stack evidence. הפלט תחום למזהי בדיקה
וסטטוסים ואינו חושף ערכים. ‏Worker Main דוחה Opt-in חלקי לפני פתיחת
Connections גם אם המפעיל דילג על פקודת ה־Preflight הידנית.

7.1.106 נוסף `system-admin.bot-reply-staging.authorization` כחוזה Mutation
ייעודי. רק זהות Tal המוגדרת במפורש רשאית לכתוב אישור `approved`; כל System
Admin מורשה רשאי לכתוב ביטול עוקב בלבד. הביטול קורא את האירוע המאושר
האחרון מאותו PostgreSQL Foundation ומעתיק את ראיות ה־Connection, ‏Policy,
Opt-in ו־Rate-limit במדויק לאירוע Append-only חדש. Confirmation, צורת
Payload, זמן קצר־חיים, גרסה עוקבת, Idempotency ו־Rate limit נבדקים לפני
Replay או כתיבה. הפלט תחום ואינו מחזיר פרטי נמען, Meta IDs, ‏Token או
Evidence גולמי. החוזה מחובר ל־Railway API Runtime ול־PostgreSQL/BullMQ
composition, אך עדיין אינו מופעל אוטומטית ב־API executable ללא תצורה חיה.

7.1.107 ‏Railway BullMQ API executable מחבר כעת את ה־Staging publisher
ואת שני ה־Operations רק מאחורי Opt-in מדויק. Inspector ייעודי דורש סביבת
`staging`, ‏Tenant, זהות Clerk של Tal הנמצאת ב־System Admin allowlist,
‏Lease ו־Polling בעלי גבולות מפורשים. מצב כבוי אינו יוצר Queue נוסף;
תצורה חלקית, מורחבת או לא מורשית נכשלת לפני Telemetry ולפני פתיחת Redis
או PostgreSQL. ה־API אינו קורא את Meta credentials, מספר הנמען, HMACs או
מלאי המקרים הפרטי של ה־Worker.

7.1.108 נוסף Cross-service activation contract המפעיל את שני ה־Inspectors
על Snapshots מבודדים בזיכרון. הוא דורש API configured, ‏Worker preflight
ready, שתי סביבות `staging` ואותו Tenant. ‏Disabled סימטרי נשמר כמצב
נפרד; הפעלה של שירות אחד בלבד או Tenant drift נחסמים. הפלט כולל רק ארבעה
מזהי Check וסטטוסים ואינו חושף Tenant, ‏Clerk ID, ‏Meta IDs, מספר נמען,
Credentials או Inventory. חיבור ה־Contract ל־Railway deployment
orchestration נשאר חסום עד קבלת גישה לחשבונות.

7.1.109 נוסף Cross-service Evidence contract קצר־חיים. הוא נוצר רק מדוח
`ready` מלא, נקשר ל־Release ID, ‏Commit SHA ו־Artifact digest, ותקף
60–900 שניות. ה־Verifier דוחה Schema מורחב, שינוי Digest, זמן עתידי או
פג ותלות ב־Release אחר. ‏Production readiness דורש אותו לצד ה־Evidence
החי של ספק ה־WhatsApp באותה שורת Bot-reply adapter; אין בכך אישור Cutover
או תחליף ל־Railway orchestration מורשה.

7.1.110 נוסף Release evidence issuer דו־שלבי. הוא קורא זהות Release
תחומה לפני ואחרי Cross-service activation ומנפיק Evidence רק כאשר
Release ID, ‏Commit SHA ו־Artifact digest נשארו זהים לערכים הצפויים.
ה־Issuer אינו מקבל את Secrets או Environment snapshots של השירותים,
אינו כותב ל־Railway ומחזיר כשל תחום במקרה של Drift, ‏Activation חסום,
Dependency כושלת או Clock לא תקין. כתיבה אטומית ואימות לאחר כתיבה נשארים
באחריות Railway deployment orchestration החי.

7.1.111 נוסף Release evidence publisher ספק־נייטרלי. הוא מאמת את
ה־Evidence לפני Storage access, דורש Compare-and-set אטומי על Release,
גרסה ו־Digest קודם, ואז מבצע Read-after-write והשוואת JSON byte-for-byte
לפני הרצת Verifier נוספת. Retry זהה אינו כותב שוב. ‏Conflict, State קודם
פגום, כשל כתיבה ו־Read-back mismatch נחסמים בנפרד. עדיין אין טענה שקיים
Railway adapter חי או ש־Environment variable שונה בפועל.

7.1.112 בדיקת Railway הרשמית הראתה ש־Variable upsert אינו חוזה CAS
מתועד וששינוי Variable דורש Deployment כדי להיכנס ל־Runtime. ‏ADR-0005
נוסף במצב `proposed` וממליץ על PostgreSQL transactional row באותה Railway
Environment. ‏Configuration inspector מקבל רק Storage mode קנוני
`postgresql` ואוסר Environment-variable publication. ‏Migration,
Repository, אישור ADR וחיבור Runtime read עדיין חסרים ולכן אין שינוי
ב־Production readiness.

7.1.113 ‏Migration ו־Repository הושלמו מקומית לאחר ניסוח 7.1.112.
מיגרציה 0040 יוצרת State נפרד לכל Release, ו־Repository גרסה 1 מספק
אתחול Idempotent, קריאה נכשלת־סגור ו־CAS יחיד עם
`UPDATE ... WHERE ... RETURNING`. בדיקת Executor תחרותית הוכיחה Winner
יחיד, אך PostgreSQL Loopback חי, חיבור Runtime read ואישור ADR-0005 עדיין
חסרים; לכן Production readiness אינו משתנה.

7.2 עדיין חסר:

7.2.1 ערכי Team, ‏Project, ‏Environment ו־`APP_PUBLIC_ORIGIN` אמיתיים
בכל חשבון וסביבה, יחד עם Evidence שה־Claims בפועל תואמים לחוזה.

7.2.2 ‏Clerk keys אמיתיים בכל סביבה והוכחת `authorizedParties` מול
Production ו־Preview origins המאושרים.

7.2.3 הרחבת ה־Registry לשאר פעולות המוצר ולשאר ה־Mutations. עבור
`contacts.save`, פעולות Consent, ‏Contact organization ו־Bot flow כבר כוללים
Idempotency, ‏Rate limiting, ‏Audit ו־Transaction לפי מנגנון ה־Persistence
המתאים לכל אחד; לשמירת Contact ול־Organization קיימים גם Executors
אטומיים ו־Node driver adapter. עדיין חסרים
ערכי Production pool ו־Rate-limit policy מאושרים, תצורת Railway Service חיה,
‏Data migration ו־Semantic parity מקומיים הושלמו לכל 51 הטבלאות. עדיין
קיים גם Full-source preflight אטומי ל־Export SQLite במצב Read-only. עדיין
קיים גם Signed bundle אטומי לכל עשרת ה־Slices עם Receipt בלתי־משתנה ודחיית
Replay. עדיין חסרים Export חי, טעינה ו־Recovery ב־Staging וכיסוי Concurrency
למסלולים שאינם כלולים ב־Harness.

7.2.4 Routes נפרדים ל־Vercel ול־Railway ו־Repository adapters עבור
PostgreSQL במקום D1. עבור Template submission נותרו גם בחירת Queue/DLQ,
מימוש Publisher וראיית Scheduler/Provider אמיתית ב־Staging; ‏Migration 0026
ומחזור ה־Outbox כבר הוכחו מול PostgreSQL מקומי חי.

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

8.6.2 `CONNECT_TRACE_CONTEXT_HMAC_KEY` — Secret שרתי שנשמר רק ב־Vercel
ומקודד כ־Base64URL קנוני של 32 בתים. הוא גוזר הקשר Trace אטום מ־
`x-vercel-id`; אין להעתיק אותו ל־Railway, ל־Browser, ל־Logs או ל־Evidence.
ב־Preview וב־Production ערך חסר או פגום חוסם את הקריאה לפני קריאת אסימוני
זהות או פנייה לרשת.

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

8.10.3 ‏`BOT_REPLY_STAGING_ENABLED` נשאר `false` כברירת מחדל. להפעלה
ב־Railway API נדרשים במפורש `BOT_REPLY_STAGING_TENANT_ID`,
`BOT_REPLY_STAGING_TAL_EXTERNAL_USER_ID`,
`BOT_REPLY_STAGING_LEASE_DURATION_SECONDS` ו־
`BOT_REPLY_STAGING_POLL_INTERVAL_MILLISECONDS`. סביבת Runtime חייבת להיות
`staging`, וזהות טל חייבת להופיע גם ב־
`CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS`. אין Defaults סמויים ל־Tenant,
זהות או זמני ההרצה.

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
