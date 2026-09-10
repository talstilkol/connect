# 1. Connect — פריסת פיילוט ב־Vercel וב־Railway

1.1 עודכן ב־10.09.2026. זהו מדריך ביצוע לשלב הסביבות ב־[Master Plan](planning/launch-master-plan-2026-09-09.md),
ללא שינוי בתכולת המוצר. חשבונות, מזהי שירותים וכתובות יילקחו מהסביבות בפועל.

1.2 **תוקן בקוד:** ברירת המחדל של npm build/start מפעילה vinext. נוספו פקודות
מפורשות לכל יעד כדי ש־Vercel יבנה Next.js וש־Railway יפעיל את API/Worker של Node.
אין כעת הוכחת פריסה חיה או חיבור QR.

# 2. בחירת קובצי הפריסה

| שירות | שורש קוד במאגר Connect | קובץ | פעולה |
|---|---|---|---|
| Vercel Web | שורש המאגר | [vercel.json](../vercel.json) | npm ci --include=dev ואז npm run build:vercel; פלט .next |
| Railway API | שורש המאגר | [deploy/railway-api.json](../deploy/railway-api.json) | טעינת מודולי השרת ואז node scripts/start-railway-bullmq-api.mjs |
| Railway Worker | שורש המאגר | [deploy/railway-worker.json](../deploy/railway-worker.json) | טעינת מודולי השרת ואז node scripts/start-railway-bullmq-worker.mjs |

2.1 ב־Railway יש לבחור ב־Service Settings את Config File Path המדויק:
/deploy/railway-api.json או /deploy/railway-worker.json. נוכחות שני קבצים
במאגר אינה יוצרת שירותים או בוחרת עבורם קובץ באופן אוטומטי. אין ליצור root
railway.json משותף שעלול להפעיל את תפקיד ה־API גם בשירות Worker.

2.2 Railpack ננעל לגרסה 0.39.0. [railpack.json](../railpack.json) בוחר Node 24
ומחליף npm install ב־npm ci --include=dev. בבדיקה הרשמית נבחר Node 24.20.0,
שתואם לדרישת המינימום הקיימת >=24.18.1. בחשבון Vercel יש לאמת Node 24.x
ולשמור את הגרסה ששימשה בפועל כחלק מראיות ה־Build.

2.3 [סקריפט ה־Build לשרתים](../scripts/verify-railway-runtime-imports.mjs) טוען את
גרף התלויות של שני התפקידים בלבד. הוא אינו פותח Pool, מפעיל Worker או פונה
לספק. זהו אימות אריזת קוד, ולא בדיקת בריאות חיה. פקודות Startup נשארות
מחויבות לתצורה התקינה של המוצר. אין הורדה למסלול postgres-only לצורך פריסה.

2.4 API משתמש ב־/health/ready עם חלון התחלה של 120 שניות. Worker אינו פותח
שרת HTTP; healthcheckPath=null מבטל גם הגדרת HTTP ישנה שעלולה להישאר בחשבון.
לשניהם עד שלוש הפעלות חוזרות אחרי כשל. בריאות Worker חיה תיבדק דרך מצב התהליך,
ה־Queue וה־Telemetry. [מדריך Startup](railway-api-startup.md).

2.5 [.vercelignore](../.vercelignore) מוציא מאריזת Web קובצי env, תיקיות עבודה,
דוחות, בדיקות ותוצרי דפדפן מקומיים. Secrets יוגדרו אצל הספק. לפני העלאה יש לבדוק
את קבוצת קובצי השחרור ואת זהות הגרסה; אין לשלוח אוטומטית את כל הקבצים הלא מנוהלים.

# 3. סדר ההפעלה לאחר אימות חשבונות

3.1 **גישה וזהות:** להשלים Device Login ל־Vercel, לקרוא את רשימת הפרויקטים
ולבחור את פרויקט Connect לפי המאגר והחשבון. לאמת גישה ל־Railway, Clerk ו־Meta
ולבחור סביבות Staging בפועל. פתיחת מחשב נעול ואימות חשבון דורשים את Tal;
אין צורך באישור תכנון נוסף ואין להעביר סיסמה או Token בשיחה.

3.2 **תצורה:** להגדיר לכל שירות את החוזה המתאים מהקוד ומה־[env reference](../.env.example).
שמות וערכים אינם זהים בכל השירותים; לדוגמה APP_RUNTIME_ENVIRONMENT=staging
ו־VERCEL_OIDC_ENVIRONMENT=preview מתארים שכבות שונות ואינם תחליפים זה לזה.

| תחום | מה חייב להיות מאומת |
|---|---|
| Web ↔ API | RAILWAY_API_ORIGIN, APP_PUBLIC_ORIGIN, זהות Vercel OIDC ו־Clerk מאותו מסלול |
| PostgreSQL | מסד מבודד, הרשאות תפקיד API/Worker, TLS, גודל Pool ו־Timeouts |
| Queue | Redis מבודד, מדיניות Retention ותפקידי Worker |
| Telemetry | APP_RELEASE_SHA, יעד Better Stack ו־Source Token ל־Staging |
| WhatsApp | App, Embedded Signup Configuration, Graph API version, Webhook ומפתח הצפנה |
| מדיה | IAM/S3/KMS/סריקה ו־Origins, לפני הפעלה מפורשת של מתגי המדיה |

3.2.1 בדיקת התהליך הנוכחי מצאה חמישה תחומי תצורה disabled ו־Telemetry במצב
invalid. אלה ממצאים מקומיים בלבד. [דוח שמות משתנים ללא ערכים](../outputs/launch-validation-2026-09-09/deployment-config-environment-audit.json).
אין להציג זאת כסריקה של כל החשבונות או כבדיקת Production Readiness שעברה.

3.3 **פריסה מתואמת:** לבחור קובצי Release, לאמת CI על הגרסה, להחיל את 73
מיגרציות PostgreSQL במסד Staging מתאים ולפרוס API/Worker/Web עם אותה זהות
שחרור. קובצי הפריסה אינם מריצים מיגרציה אוטומטית. להוכיח בריאות, הרשאות,
TLS/CORS וסגירה נקייה לפני הפעלת שימוש חיצוני.

3.4 **הוכחת פיילוט:** להפעיל Coexistence מבוקר, לחבר מכשיר WhatsApp Business
זכאי דרך ההרשמה הרשמית, ולבדוק קליטה, Inbox ושליחה מורשית מקצה לקצה.
לשמור ראיה ל־QR/קוד ולזהות השירותים. רק אחר כך לסגור פערי מוצר ו־QA שמונעים
את הפיילוט. מסלול מדיה חסר תצורה נשאר disabled.

# 4. האימות שבוצע והגבולות

4.1 Build של Vercel עבר. שלושת קובצי הפריסה תאמו לכללי הערכים של הסכמות
הרשמיות שנקראו. סכמת Vercel עצמה כוללת אי־התאמה ל־Draft המוצהר באזור
experimentalServicesV2 שאינו בשימוש כאן; ממצא זה נשמר, ולא הוצג כאילו
Meta-validation של כל סכמת הספק עבר. Railway schema עבר גם Meta-validation.

4.2 Railpack הרשמי, שהורד עם אימות checksum, יצר תוכניות בנייה לשני
התפקידים. נבדקו ההתקנה מ־lockfile, פקודת ה־Build ופקודת ה־Start. בוצעה
טעינת מודולים בעותק מבודד עם תלויות Production בלבד ב־Node 24.20.0 וגם
ב־Node 25.9.0 המקומי. Startup ללא תצורה נדחה ללא פירוט Secret, וארגומנט לא
מותר לסקריפט האימות נדחה. בסבב ההמשך עבר גם אימות Linux amd64 כמפורט בסעיף 4.5;
עדיין אין הוכחת Deployment חיה.

4.3 Source Guardrails ו־lint של סקריפט האימות עברו. 4,408 בדיקות המוצר ו־185
בדיקות PostgreSQL מהסבב הקודם לא הורצו מחדש עבור קובצי תצורה אלה. אין שינוי
בסכמה, בלוגיקת המדיה או במכסות WhatsApp. [ראיות האימות](../outputs/launch-validation-2026-09-09/deployment-config-validation.json).

4.4 מקורות רשמיים שנבדקו ב־10.09.2026:
[Vercel — תצורת Build](https://vercel.com/docs/project-configuration/vercel-json#buildcommand),
[Railway — בחירת קובץ תצורה](https://docs.railway.com/config-as-code),
[Railway — חוזה התצורה](https://docs.railway.com/config-as-code/reference),
[Railpack — Node](https://railpack.com/languages/node),
[Railpack 0.39.0](https://github.com/railwayapp/railpack/releases/tag/v0.39.0).

4.5 **מועמד מבודד, המשך 10.09:** שער האיכות המלא עבר מחדש ב־Worktree של
אותו מאגר: 4,408 בדיקות, שני Builds ו־28 אזהרות lint קיימות ללא שגיאות.
חבילת Runtime נבנתה ונבדקה ב־Linux amd64 עם Node 24.20.0, תלויות Production,
משתמש node, ללא רשת ומערכת קבצים לקריאה בלבד. טעינת התלויות עברה; ה־API
וה־Worker דחו התחלה ללא תצורה עם הודעה מצומצמת. אין הוכחת PostgreSQL/Redis
או ספקים חיים מבדיקה זו. [בדיקת Linux](../outputs/launch-validation-2026-09-09/pilot-candidate-linux-validation.json).

4.6 קובץ ה־CI עודכן להתקין תלויות לפני Source Guardrails שמשתמש ב־TypeScript.
פרטי הקיבוע, רשימת הקבצים וסטטוס ה־PR/CI נשמרים ב־[דוח המועמד](../outputs/launch-validation-2026-09-09/pilot-candidate-validation.json).
מועמד זה כולל 2,534 קבצים, ללא 624 קובצי תכנון ופלט לא מנוהלים שאינם נדרשים
לשער האיכות. החשבונות והפריסה נשארים שלב נפרד מהוכחת המועמד.

# 5. בדיקת תצורה לפני פריסה — המשך 10.09.2026

5.1 [סקריפט בדיקת התצורה](../scripts/inspect-pilot-configuration.mjs) קורא את
משתני התהליך בלבד, ללא טעינת קובצי env, התחברות לספק, יצירת Pool או הפעלת
Worker. לאחר שהוגדרו הערכים האמיתיים בסביבת השירות, מריצים את התפקיד המתאים:

```sh
node scripts/inspect-pilot-configuration.mjs --service=web
node scripts/inspect-pilot-configuration.mjs --service=api
node scripts/inspect-pilot-configuration.mjs --service=worker
```

5.2 כל פקודה נבדקת מול סביבת השירות שלה. הכלי מיועד למסלול הפיילוט הנוכחי:
APP_RUNTIME_ENVIRONMENT=staging ו־VERCEL_OIDC_ENVIRONMENT=preview. תצורת Production
או Development אינה יכולה לעבור אותו. אין להזין סיסמאות או Tokens כארגומנטים.

5.3 הדוח כולל רק מזהי בדיקות, מצב ושמות משתנים. checkedKeys מציין את תחום
הבדיקה; missingKeys ו־invalidKeys כוללים רק שמות ידועים, כשיש אבחנה כזו
בבודק הקיים. רשימה ריקה אינה מבטלת מצב invalid. ערכים, כתובות, Certificates
והודעות Exception אינם נכללים בפלט. אין עקיפה באמצעות תצורה לדוגמה.

5.4 קוד יציאה 1 מציין חסם או קלט לא תקין. קוד 0 ו־configuration-valid מציינים
תקינות של **הבדיקות המפורטות בדוח בלבד**. liveReadinessVerified נשאר false;
הדוח מפרט את מה שעוד לא אומת: חשבונות וזכאות, התאמת זהות וגרסה בין שירותים,
הרשאות וסכמה במסד, קישוריות התור, תקציב ומדיניות ספק, הרשאות אחסון וסריקה ו־QR חי.
הכלי אינו מחליף Production Readiness, Startup או בדיקת שימוש מקצה לקצה.

5.5 Web בודק זהות Clerk, Origin ונתיב API. השרתים בודקים גם PostgreSQL,
Redis, Telemetry ו־Meta. API כולל מכסות, מדיניות הזמנות והפעלת Coexistence
המבוקרת; Worker כולל מכסת Clerk וזהות Scheduler. מסלולי מדיה כבויים מותרים;
מסלול מדיה שהופעל עם תצורה שגויה חוסם את הבדיקה. מתגים אינם משתנים כתוצאה מהרצה.

5.6 [ראיות הבדיקה הנוכחית](../outputs/launch-validation-2026-09-09/pilot-configuration-validation.json).

# 6. אימות קובצי המיגרציות בחבילת השחרור

6.1 לפני פריסה, מתוך מועמד Commit נקי, מריצים לפי הסדר:

```sh
npm run release:manifest
npm run release:changelog
npm run release:verify-artifacts
```

6.2 יצירת Manifest נוכחי מחייבת גם את תיקיית postgres/migrations. השדה
postgres מכיל את הנתיב, רשימת הקבצים המסודרת, SHA-256 של כל קובץ ו־Digest
של הרשימה כולה. במועמד הנוכחי יש 73 מיגרציות PostgreSQL ו־43 מיגרציות D1.
רשימת PostgreSQL ריקה, רצף שמות שגוי או קובץ SQL שאינו קובץ רגיל נדחים.

6.3 לצורך תאימות עם קוראי הראיות הקיימים, migrations ו־migrationSetSha256
הראשיים ממשיכים לתאר D1, וחוזה releaseId בגרסה 1 נשמר. Git commit/tree
קושרים גם את PostgreSQL למקור; ה־Digest הנוסף אינו קלט חדש לנוסחת releaseId.
לכן אין לאמת חבילת PostgreSQL באמצעות השוואת releaseId או Digest של D1 בלבד:
release:verify-artifacts משווה את כל ה־Manifest למקור הנוכחי ודוחה גם רשימת
PostgreSQL חסרה, מקוצרת או שונה כשה־releaseId הישן נשאר זהה.

6.4 בדיקת התוצרים דוחה JSON שאינו אובייקט, לרבות null, false, מספר, מחרוזת
או מערך. הצלחת הבדיקה מעידה על התאמת קובצי החבילה בלבד; היא אינה מחילה SQL
ואינה מוכיחה שמיגרציות הוחלו במסד, שהרשאותיו תקינות או שהפיילוט פועל.
[ראיות התיקון](../outputs/launch-validation-2026-09-09/release-postgres-validation.json).
