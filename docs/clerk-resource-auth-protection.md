# חוזה הגנת משאבי Clerk

## 1. מטרה

1.1 ההרשאה אינה נקבעת עוד לפי התאמת URL בתוך `proxy.ts`.

1.2 כל משאב שרת רגיש חייב להגן על עצמו לפני קריאת פרטי בקשה,
Tenant או System Admin.

1.3 המבנה תואם את [מדריך ההגירה הרשמי של Clerk](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher):
ה־Proxy ממשיך להפעיל `clerkMiddleware()`, ואילו `page`, ‏`layout`,
Route Handler ו־Server Function אחראים להרשאה במקום שבו נעשה שימוש
במידע המוגן.

## 2. משאבי React המוגנים ישירות

2.1 כל אחד מהמשאבים הבאים קורא ישירות ל־`await auth.protect()` לפני
קריאת מידע רגיש:

2.1.1 `app/workspace/layout.tsx`.

2.1.2 `app/workspace/page.tsx`.

2.1.3 `app/workspace/[section]/page.tsx`.

2.1.4 `app/admin/page.tsx`.

2.1.5 `app/admin/decisions/page.tsx`.

2.1.6 `app/admin/whatsapp-delivery-policy/[tenantId]/page.tsx`.

2.2 הגנה ב־Layout אינה נחשבת תחליף להגנה ב־Page. כל משאב מוגן
בנפרד כדי ששינוי ב־React rendering או מעבר ישיר למשאב לא יעקוף את
בדיקת ההתחברות.

## 3. מצב Rehearsal מקומי

3.1 כאשר שני מפתחות Clerk חסרים, המערכת נמצאת במצב `disabled`
מכוון ומאפשרת בדיקות UI מקומיות ללא חשבון אמיתי.

3.2 כאשר רק מפתח אחד קיים, ה־Proxy מחזיר `503` ונכשל סגור.

3.3 כאשר שני המפתחות קיימים, ששת המשאבים מפעילים
`auth.protect()` לפני כל קריאת מידע רגישה.

3.4 כלל ה־ESLint הרשמי של Clerk הוא ניסיוני ואינו מזהה את ענף
ה־Rehearsal המותנה. לכן קיימת החרגה מקומית רק בששת המשאבים הידועים,
ובדיקת Source Contract מאמתת את הסדר בפועל. משאב חדש בתיקיות
`app/workspace/**` או `app/admin/**` ייכשל ב־Lint עד שיקבל הגנה או
החרגה מנומקת ובדיקה מתאימה.

## 4. Server Functions

4.1 כל 22 הקבצים שמתחילים ב־`"use server"` נמצאים ברשימת ביקורת
סגורה בבדיקה `tests/server-function-auth-inventory.test.mjs`.

4.2 כל קובץ חייב להשתמש בגבול זהות או Session מרכזי שנבדק עבורו,
כגון Tenant Session, ‏Tenant Mutation Session, ‏System Admin Session
או Clerk Identity.

4.3 הוספה, הסרה או העברה של Server Function נכשלת בבדיקה עד לעדכון
מפורש של הרשימה ושל גבול ההרשאה המתאים.

4.4 מנגנון זה משלים את
[כלל ה־ESLint הרשמי של Clerk](https://clerk.com/docs/reference/nextjs/eslint-plugin),
שאינו עוקב אחרי Wrapper מיובא של Session ואינו מאמת את ההרשאות
העסקיות המדויקות.

## 5. תנאי קבלה

5.1 `proxy.ts` אינו מכיל `createRouteMatcher` או `auth.protect`.

5.2 ששת משאבי React קוראים ל־`auth.protect()` לפני הקריאה הרגישה
הראשונה כאשר Clerk מוגדר.

5.3 רשימת 22 ה־Server Functions תואמת בדיוק לקבצים בקוד וכל קובץ
עובר דרך גבול ההרשאה שאושר עבורו.

5.4 ESLint, ‏TypeScript, בדיקות המקור, Build ושער ה־Release המקומי
עוברים.

5.5 בדיקת Login אמיתית ב־Staging נשארת תלויה במפתחות Clerk,
זהויות בדיקה ו־D1 שהוגדרו מחוץ ל־Git.
