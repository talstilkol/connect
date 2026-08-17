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

7.2 עדיין חסר:

7.2.1 ‏Vercel OIDC Adapter אמיתי עם `jose`, ‏JWKS, ‏Issuer, ‏Audience
ו־Subject מאושרים.

7.2.2 ‏Clerk Adapter אמיתי עם `authenticateRequest`, ‏authorized
parties ו־Session-token-only policy.

7.2.3 ‏Operation registry שמחבר Use cases אמיתיים ובודק Permission.

7.2.4 Route ו־Runtime נפרדים ל־Vercel ול־Railway.

7.2.5 Live accounts, ‏Secrets, ‏Staging, ‏Load test ו־Deployment
evidence.

7.3 לכן `web.server-api-boundary` נשאר `adapter-required` ואינו
`ready` ל־Cutover.

## 8. מקורות רשמיים

8.1 [Vercel — Connect OIDC to your own API](https://vercel.com/docs/oidc/api).

8.2 [Vercel — OIDC Federation](https://vercel.com/docs/oidc).

8.3 [Clerk — authenticateRequest](https://clerk.com/docs/reference/backend/authenticate-request).

8.4 [Clerk — Authenticated requests](https://clerk.com/docs/guides/development/making-requests).

8.5 תאריך אימות: `2026-08-17`. ערכי Team, ‏Project, ‏Issuer,
Audience, ‏authorized parties ו־Production origin נשארים
`unknown/unavailable` עד אישור Accounts.
