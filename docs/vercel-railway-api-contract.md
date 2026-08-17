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

7.1.15 נוספו ארבע Migrations מסודרות ל־Critical Path ומסמך
[חוזה PostgreSQL ל־Railway Mutations](postgresql-mutation-contract.md).
הראשונה יוצרת Tenant, ‏Audit ו־Contact prerequisites והשנייה את Receipt.
השלישית יוצרת Membership, ‏Selection ו־Business profile, והרביעית את
Membership event ledger.
ה־Executor וה־SQL נבדקים מקומית, אך אין עדיין Driver, ‏Schema parity מלאה,
Migration שרץ מול Database אמיתי או Integration evidence.

7.1.16 נוספו Membership, ‏Tenant selection ו־Business profile repositories
ספק־נייטרליים. מסלולי Selection ו־Profile משתמשים ב־Transaction, וקריאות
Membership נכשלות סגור על תוצאה חוצה User/Tenant או על יותר מ־100 רשומות.
החוזה המלא מתועד ב־
[PostgreSQL Tenant Access](postgresql-tenant-access-contract.md).

7.1.17 נוסף Team membership mutation repository ספק־נייטרלי. שינויי
Role/Status והעברת Owner נועלים את ה־Tenant ואת הרשומות הרלוונטיות באמצעות
`FOR UPDATE`, כותבים State ו־Event באותה Transaction ומזהים Retry לפי מפתחות
SHA-256 דטרמיניסטיים. אין בכך הוכחת Concurrency מול PostgreSQL חי.

7.2 עדיין חסר:

7.2.1 ערכי Team, ‏Project, ‏Environment ו־`APP_PUBLIC_ORIGIN` אמיתיים
בכל חשבון וסביבה, יחד עם Evidence שה־Claims בפועל תואמים לחוזה.

7.2.2 ‏Clerk keys אמיתיים בכל סביבה והוכחת `authorizedParties` מול
Production ו־Preview origins המאושרים.

7.2.3 הרחבת ה־Registry לשאר פעולות המוצר ולשאר ה־Mutations. עבור
`contacts.save` כבר קיים חוזה Idempotency, ‏Rate limiting, ‏Audit
ו־Transaction וכן Executor ספק־נייטרלי. עדיין חסרים Driver מאושר,
Migration מלא ובדיקת Concurrency מול PostgreSQL אמיתי.

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

8.7 כל הערכים נשארים `unknown/unavailable` עד להגדרת החשבונות. ערך
חסר, חלקי או לא חוקי מונע יצירת Verifier.

## 9. מקורות רשמיים

9.1 [Vercel — Connect OIDC to your own API](https://vercel.com/docs/oidc/api).

9.2 [Vercel — OIDC Federation](https://vercel.com/docs/oidc).

9.3 [Clerk — authenticateRequest](https://clerk.com/docs/reference/backend/authenticate-request).

9.4 [Clerk — Authenticated requests](https://clerk.com/docs/guides/development/making-requests).

9.5 תאריך אימות: `2026-08-17`. ערכי Team, ‏Project, ‏Issuer,
Audience, ‏authorized parties ו־Production origin נשארים
`unknown/unavailable` עד אישור Accounts.
