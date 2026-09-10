# PostgreSQL Bot Runtime Data Migration Rehearsal

תאריך אימות v2: 2026-08-25

## 1. תוצאה

1.1 ‏Slice 7 עבר חזרה נקייה מול SQLite/D1 ומול PostgreSQL 16 אמיתי:

```text
PASS (42 D1 migrations, 42 PostgreSQL migrations, 3 tables, 7 rows,
replay rejected, tenant isolation verified, deferred retry verified,
bot payload private,
9 parity scenarios)
```

1.2 שלוש הטבלאות הן `bot_flows`, ‏`bot_flow_versions` ו־
`bot_reply_deliveries`. הראיה הנוכחית כוללת Delivery דחוי לא־ריק עם
`claim_version=1`, ‏`PROVIDER_RATE_LIMITED` וזמן Retry חוקי בתוך חלון
השירות. Registry ההעברה המלא מכסה 55 טבלאות.

## 2. מה החוזה מגן עליו

2.1 כל Flow חייב מפתח דטרמיניסטי, שם חתוך וללא תווי בקרה, Lifecycle חוקי,
Version חיובי וזמנים מסודרים.

2.2 כל Flow version חייב להשתייך ל־Flow באותו Tenant, להכיל Definition
שעובר את Validator העסקי המלא ולהתאים בין `status` לבין `published_at`.

2.3 כל Delivery חייב להכיל Reply JSON שה־Runtime יודע לעבד, מספר E.164,
זהות שולח, Lifecycle עקבי והתאמה מלאה בין Status, מספר ניסיונות,
`claim_version`, ‏Provider ID, ‏Error code ו־`accepted_at`.

2.4 לפני Commit מתבצעות שתי בדיקות קישור נוספות:

1. `latest_version_key` ו־`active_version_key` מצביעים לגרסה של אותו
   Flow באותו Tenant; מספר הגרסה האחרונה תואם.
2. כל Delivery מצביע להודעת Inbound באותה Conversation ולצמד
   Flow/Version מלא באותו Tenant.

2.5 הבדיקה השנייה סוגרת פער מקור: ה־Foreign key הישן של D1 מקשר Delivery
רק לפי Tenant ו־Version key. PostgreSQL וה־Migration verifier דורשים גם את
ה־Flow key, ולכן Payload שמחליף Flow בלי להחליף Version נכשל לפני Commit.

2.6 עבור Delivery דחוי, החוזה דורש `updated_at === deferred_at`, זמן Retry
מאוחר מזמן הדחייה אך מוקדם באופן מחמיר מ־24 שעות לאחר הודעת ה־Inbound.
USER triggers של `bot_reply_deliveries` נבדקים, מושבתים רק בתוך Transaction
הטעינה ומאומתים שוב לאחר החזרתם.

## 3. פרטיות וראיות

3.1 ה־Plan payload מכיל את הנתונים הדרושים לטעינה ולכן הוא Artifact תפעולי
רגיש. אין לשמור אותו ב־Git, ‏Logs או מערכת Tickets.

3.2 ‏Manifest ו־Evidence ציבוריים מכילים רק Table name, ‏Count ו־HMAC
digests. הם אינם מכילים:

1. שמות Flow או Definitions.
2. טקסט תשובה או אפשרויות Button.
3. מספר טלפון.
4. Provider message ID או Error code.
5. מפתחות Conversation, ‏Message, ‏Flow, ‏Version או Delivery.

## 4. Semantic parity שנבדק

4.1 תשעת התרחישים שהורצו בשני המנועים והשוו Accepted/Rejected ומצב סופי:

1. שינוי שם Flow עם Optimistic version.
2. יצירת Draft version הבא.
3. עדכון Projection של הגרסה האחרונה.
4. חסימת Version number כפול.
5. חסימת Version של Flow מ־Tenant אחר.
6. Claim אטומי של Delivery מ־Pending ל־Sending.
7. השלמת Delivery ל־Accepted עם Provider identity.
8. חסימת Reply index כפול לאותה הודעת Inbound.
9. חסימת Lifecycle סותר של Delivery.

4.2 לאחר התרחישים נקראו שלוש הטבלאות מחדש בשני המנועים והושוו Row-for-row
באמצעות Snapshot קנוני ודטרמיניסטי. בנוסף אומתו במפורש שדות ה־Deferral
והחזרת שני ה־USER triggers למצב פעיל.

## 5. פער Hardening מכוון

5.1 ‏D1 ו־Constraint היעד ב־PostgreSQL בודקים אורך שם לאחר `trim`, אך אינם
מחייבים שהערך המאוחסן עצמו יהיה חתוך. ה־Runtime כן דורש Name חתוך.

5.2 חוזה ההעברה דוחה Legacy name עם רווחים חיצוניים לפני טעינה. הוא אינו
מנרמל או משנה נתון בשקט. אם יימצא ערך כזה ב־Export חי, יש לתקן אותו במקור
ולהפיק Snapshot חדש.

## 6. הפעלה מקומית בטוחה

6.1 יש ליצור PostgreSQL מקומי, ריק וללא Password בשם:

```text
connect_bot_runtime_data_migration_rehearsal
```

6.2 הפקודה מקבלת רק Host מסוג loopback, ‏Port מפורש, שם המסד הקבוע וללא
Query string:

```bash
CONNECT_POSTGRES_BOT_RUNTIME_DATA_MIGRATION_REHEARSAL_URL="postgresql://<local-user>@127.0.0.1:<local-port>/connect_bot_runtime_data_migration_rehearsal" \
  npm run verify:postgres-bot-runtime-data-migration
```

6.3 הסקריפט מסרב למסד שאינו ריק. בסיום החזרה יש לעצור את השרת הזמני
ולמחוק את תיקייתו.

## 7. מה עדיין חסר

7.1 ‏Rehearsal מקומי אינו Cutover. לפני Production עדיין נדרשים Export חי
עקבי, ‏Staging, ‏Load/Recovery rehearsal, בדיקות עומס, ערכי Railway חיים
וחלון Cutover מאושר.

7.2 עדיין נדרש Full integration מאוכלס לכל 55 הטבלאות מול baseline של
42 migrations, ולא רק Rehearsal נפרד לכל Slice.
