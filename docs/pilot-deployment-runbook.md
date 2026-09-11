# 1. Connect — פריסת פיילוט ב־Vercel וב־Railway

1.1 עודכן ב־11.09.2026. זהו מדריך ביצוע לשלב הסביבות ב־[Master Plan](planning/launch-master-plan-2026-09-09.md),
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

3.1 **גישה וזהות — עדכון 11.09.2026:** Vercel CLI התחבר בהצלחה לחשבון
`talstilkol-4667`. בפרויקט החדש `connect-staging` בצוות `raceisrael` הוגדרו
Next.js, Node 24 ופקודות Build/Install/Output מהמאגר; קריאה חוזרת אישרה אותן.
הגנת הגישה לפריסות נשמרה. [ראיות ספק](../outputs/launch-validation-2026-09-09/staging-access-20260911-vercel-project-settings.json).
אין עדיין Deployment, משתני זהות/שרת או הוכחת Staging פועל.
ההמשך דורש אימות גישה ל־Railway, Clerk ו־Meta ובחירת סביבות בפועל.
אין צורך באישור תכנון נוסף או בקוד Vercel חדש; אימות זהות אצל ספק נוסף נעשה
אצל אותו ספק. פתיחה ידנית של ה־Mac לא אושרה, ולא חודשה אוטומציית מחשב.

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

3.3 **פריסה מתואמת:** לבחור קובצי Release, לאמת CI על הגרסה ולהחיל את כל
מיגרציות PostgreSQL שב־Release Manifest המאומת שלה, במסד Staging מתאים.
לפרוס API/Worker/Web עם אותה זהות
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

5.7 בודק הפיילוט משתמש גם בחוזי ההפעלה של תכונות המוצר שנוספו ל־Runtime:

| שירות | בדיקה | תנאים כשהמסלול מופעל |
|---|---|---|
| API | template-submission | MESSAGE_TEMPLATE_SUBMISSION_ENABLED וגרסת Graph מפורשת |
| API | template-sync | MESSAGE_TEMPLATE_SYNC_ENABLED, גרסת Graph ומפתח הצפנת Credentials |
| API | campaign-activation | CAMPAIGN_ACTIVATION_ENABLED וגרסת Graph מפורשת |
| API ו־Worker | manual-replies | MANUAL_REPLY_ENABLED, גרסת Graph, מפתח הצפנה ומפתח HMAC של מכסות |

5.8 המתגים נבדקים באותם Validators שה־Runtime משתמש בהם. מצב disabled
מותר בשלב הכנת התצורה ומוצג במפורש; מצב invalid חוסם את הדוח גם בתכונה
אופציונלית. במענה ידני ערך ריק אינו שקול למתג חסר ונכשל, בהתאם לחוזה
ה־Runtime הקיים. אין כאן הפעלת מתגים או בדיקת חשבון, ואין שינוי בחוזי ההפעלה.

5.9 בקבלת המוצר יש לדרוש configured במסלולים שנבחרו להפעלה ולבדוק אותם
מול הספק. configuration-valid אינו מוכיח שכל התכונות פעילות או שה־Worker
בריא. הדוח ממשיך לפרסם רק שמות משתנים ומצבים; מפתחות וערכי תצורה אינם
נכללים בו. [אימות ההרחבה](../outputs/launch-validation-2026-09-09/pilot-feature-preflight-validation.json).

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

6.5 עדכון לאחר מיזוג PR #2: ב־main ‏4ee61e0 יש **74 מיגרציות PostgreSQL**,
עד 0073_manual_reply_outbox.sql. המספר 73 בסעיף 6.2 מתעד את חבילת הגרסה
הקודמת. בכל פריסה יש להשתמש ברשימה וב־Hashes של ה־Manifest לאותו Commit,
ולא במספר היסטורי ממדריך זה.

# 7. סביבת Clerk — הכרעה לפני יצירת האפליקציה

7.1 נבדק מול התיעוד הרשמי ב־10.09.2026. תוקם אפליקציית Clerk נפרדת
ל־Connect Staging. בדיקות שילוב פנימיות יכולות להתחיל ב־Development ללא
מנוי בתשלום, כולל ניסוי MFA. ראיית הקבלה לשימוש חיצוני תיאסף מול Production
instance של אפליקציית ה־Staging, עם דומיין בשליטת Tal. אין העברת משתמשי
Development ל־Production; פרטי משתמש ומפתחות ייבחרו מהסביבה בפועל.
[Clerk — Environments](https://clerk.com/docs/guides/development/managing-environments).

7.2 כתובת Preview שהספק מייצר תחת vercel.app יכולה לשמש בדיקות פנימיות
עם Development keys. Clerk אינה מאפשרת Production keys בדומיין Preview
זה. שם הדומיין המותאם ובעלות עליו עדיין לא אומתו. APP_RUNTIME_ENVIRONMENT=staging
ו־VERCEL_OIDC_ENVIRONMENT=preview נשארים ערכי מסלול Connect; הם אינם קובעים
את סוג ה־instance ב־Clerk.
[Clerk — Preview environments](https://clerk.com/docs/guides/development/managing-environments#preview-environments).

7.3 בהקמה יופעלו Organizations, ‏Membership required ו־Create first
organization automatically, בהתאם לחוזה Tenant הקיים. תפקיד מוזמן יישאר
org:member, והרשאות העסק ימשיכו להיקבע במסד Connect. אין צורך ב־Custom roles
של Clerk למסלול זה. ההגדרות עדיין לא נשמרו בחשבון.
[Clerk — Configure Organizations](https://clerk.com/docs/guides/organizations/configure).

7.4 בסביבת ה־Staging תידרש MFA לכל משתמש, באמצעות Authenticator app ו־Backup
codes. כך נבדקת גם דרישת MFA למנהלים ללא מנגנון נפרד שמסתמך על בחירה ידנית
של כל מנהל. יש להשלים את Session task מסוג setup-mfa לפני שה־Session פעיל;
יש לבדוק זאת עם רכיבי ההתחברות הקיימים. המשתמש יגדיר את ה־Authenticator
וישמור את קודי הגיבוי ישירות אצל Clerk; לא בשיחה או בדוחות.
[Clerk — MFA](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options#multi-factor-authentication).

7.5 MFA ו־Session lifetime מותאם דורשים Pro בשימוש Production. אם החשבון
אינו כבר זכאי למסלול זה, המחירון מציג $25 בחיוב חודשי, או $20 לחודש בחיוב
שנתי. נבחר מסלול חודשי כשיידרש תשלום; לא נרכש מנוי. העלות נוספת להצעת
Vercel/Railway של $25 ואינה כלולה בה. אין צורך לרכוש B2B Authentication
Enhanced רק עבור Admin/Member והזמנות בסיסיות.
[Clerk — Pricing](https://clerk.com/pricing).

7.6 סדר האימות: אפליקציה וסביבה נכונות; הגדרות Organizations/MFA; מפתחות
מאותו instance; Origin מדויק ב־Web וב־API; משתמש אמיתי עם Session פעיל
ו־orgId; Onboarding; ביטול Session; ניסיון מעבר ארגון לא מורשה. כל אלה
נותרו בדיקות חיות, ולא נחשבים מאומתים בעקבות עדכון המסמך.


# 10. פריסת עריכות כיתוב מדיה — 10.09.2026

10.1 גרסה הכוללת 0074 דורשת **75 מיגרציות PostgreSQL**. סעיף 6.5 מתאר את המיזוג הקודם עם 74. להשהות Worker שמעבד Webhooks, להחיל מיגרציות ולפרוס קודם API ו־Web שתומכים ב־edited עבור image/video/document, ורק אז לחדש Worker תואם. קבצי פריסה אינם מבצעים מיגרציה בעצמם.

10.2 לבדוק מקור → עריכה → הסרת כיתוב → מחיקה, ועריכה שמגיעה לפני המקור. לוודא שסוג ההודעה, סדר הזמן, סטטוס המסירה ו־unread נשמרים. כיתוב אינו הרשאה לקובץ: URL או מזהה מדיה באירוע לא מחליפים את מסלול S3/סריקה, ו־media_placeholder נשאר מוגבל. אין החזרת קורא Inbox ישן לאחר כתיבת כיתובי מדיה; בעת כשל יש להשהות Worker ולתקן קדימה, בלי למחוק ראיות או תוכן לצורך Rollback.

10.3 [Master — תכולה וגבולות](planning/launch-master-plan-2026-09-09.md#70-עריכות-כיתוב-מדיה-בbusiness-app--10092026), [תוצאות האימות](../outputs/launch-validation-2026-09-09/meta-media-caption-validation.json). קבלת מכשיר, ספק, Browser ופריסה נשארת תנאי נפרד.

# 11. המשך ל־Staging לאחר מיגרציה 0075 — 11.09.2026

11.1 סעיף 10 מתאר את גרסת עריכות הכיתוב עם 0074. הגרסה שנבדקה ומוזגה ב־[PR #23](https://github.com/talstilkol/connect/pull/23), Commit `671f8183f150bc7d1f9887ee5f9d2ec7b9fac136`, כוללת גם כיתובים מקוריים ומיגרציה 0075: **76 מיגרציות PostgreSQL**. מספר זה מתאר את הגרסה המסוימת; רשימת הקבצים וה־Hashes המחייבת לביצוע נמצאת ב־`postgres.migrations` של ה־Manifest שלה. אין להשתמש במספר מסעיף היסטורי כתחליף לרשימה.

11.2 להשהות עיבוד Echo, להחיל את המיגרציות ולפרוס קוראי API/Web שמקבלים כיתובים מקוריים של תמונה, וידאו ומסמך, ורק אז לחדש Worker תואם. שינוי סכמת המסד אינו מתקן קורא ישן. אין להסיר כיתובים או Digests כדי לאפשר חזרה לגרסה שאינה תואמת. [תכולה, סדר פריסה ובדיקות — Master 76](planning/launch-master-plan-2026-09-09.md#76-כיתוב-מקורי-של-הודעת-business-app-חיה--10092026).

11.3 אימות Vercel דרך `vercel login` יכול להתבצע ידנית גם במכשיר אחר עם דפדפן, לפי [מסלול ה־Device Flow הרשמי](https://vercel.com/changelog/new-vercel-cli-login-flow), שנבדק ב־11.09.2026. סיום ההתחברות נבדק ב־CLI לפני בחירת חשבון ופרויקט Connect. התחלת Flow או הצגת קישור אינן הוכחת כניסה. קישור וקוד חד־פעמיים אינם נשמרים במאגר או במדריך; אין לשלוח Token או סיסמה בשיחה.

11.4 כניסה ל־Vercel אינה מספקת גישה ל־Railway, Clerk או Meta ואינה סוגרת את שלב הסביבות. לאחריה: לזהות פרויקט וצוות מורשים, להקים את שירותי Staging והמסד/תור המבודדים, להגדיר זהות ו־Origins, לאמת תצורה ובריאות מול אותו Release, ורק אז לבדוק Coexistence במכשיר Business זכאי. בדיקות המסך שנעצרו כשה־Mac היה נעול דורשות פתיחה ידנית לפני חידוש אוטומציית המחשב.

# 12. הכרעות חיבור ומיגרציות Railway — 11.09.2026

12.1 **מיקום המיגרציה:** ב־Railway רשת פרטית זמינה בזמן Runtime וב־Pre-deploy, אך לא בזמן Build. נבחר מבצע מיגרציות חד־פעמי ומבודד באותה סביבת Staging, עם הרשאת migration בלבד; API ו־Worker לא יקבלו את הרשאתו. אין להגדיר מיגרציה מקבילה בשני השירותים. `verify-railway-api-startup.mjs` הוא תרגיל מקומי מוגבל למסד ריק, ואינו פקודת פריסה לספק. מימוש המבצע ובדיקתו מול הסכמה וההרשאות האמיתיות הם תת־שלב פתוח של שלב 3, לפני הפעלת השירותים. [רשת פרטית וזמן Build](https://docs.railway.com/networking/private-networking/how-it-works), [Pre-deploy והרשאות הסביבה](https://docs.railway.com/deployments/pre-deploy-command).

12.2 **PostgreSQL:** להמשיך במסלול Railway עם `POSTGRES_TLS_MODE=verify-full`. לפני הפעלת API/Worker, לקרוא בערוץ ניהול מאומת את תעודת ה־CA הציבורית של שירות המסד, להגדיר אותה ב־`POSTGRES_TLS_CA_PEM` ולבדוק שהתעודה המוצגת תקפה ומתאימה ל־Hostname הפרטי שבחיבור. אין צורך להעביר מפתח פרטי ללקוחות. קוד האתחול הרשמי שנבדק מוסיף לתעודה את `RAILWAY_PRIVATE_DOMAIN` כשקיים, אך אין זו הוכחה לגרסת Image או לתעודה שכבר מותקנות בחשבון. יש לאמת גם חידוש תעודה והפצת CA לפני תפוגה. [תבנית PostgreSQL הרשמית](https://docs.railway.com/databases/postgresql), [מימוש התעודה](https://github.com/railwayapp-templates/postgres-ssl/blob/main/init-ssl.sh), [חוזה החיבור בקוד](../server/platform/nodePostgresPoolConfiguration.ts).

12.3 **Redis:** להגדיר את כתובת Redis הפרטית באותו Project ו־Environment. הקוד כבר משתמש ב־`family: 0` לתמיכה ב־IPv4/IPv6; אין להוסיף `?family=0` ל־URL, משום שחוזה Connect אוסר Query בחיבור. נדרשים שם משתמש וסיסמה אמיתיים, Volume מתמיד, AOF ו־`noeviction`, לפי [מדריך העמידות הקיים](railway-redis-durability-rehearsal.md). ברירות המחדל בחשבון טרם נקראו. [הנחיות Railway לחיבור](https://docs.railway.com/databases/troubleshooting/enotfound-redis-railway-internal), [חוזה Connect](../server/platform/railwayBullMqConfiguration.ts).

12.4 סדר האימות: לזהות סביבה ומשאבים → לאמת תעודה והרשאות PostgreSQL → לאמת תצורת Redis ועמידותו → להכין ולאמת מבצע מיגרציות לגרסה → לפרוס API/Web/Worker → לבדוק QR חי. כתובות, מזהי שירות ותעודות ייקראו מהספק לאחר התחברות; לא נוצרו משאבי ענן בסבב המחקר.

12.5 **הוכנה חבילת אתחול מקומית לגרסה 671f8183:** כל 76 המיגרציות נכללות בטרנזקציה אחת, עם תנאי מסד Staging חדש וריק, תפקידי המיגרציה הקנוניים, בדיקות הרשאות ונעילה למניעת שני מבצעים במקביל. 13 בדיקות עברו מול PostgreSQL 17.11 מקומי, כולל כשל מאוחר וניתוק חיבור. [החבילה והוראותיה](../outputs/launch-validation-2026-09-09/postgres-bootstrap-671f8183/README.md). זוהי השלמה מקומית למסלול מסד חדש בסעיף 12.1; התאמה לחשבון ול־TLS, אריזת המבצע בסביבה ופריסה חיה נשארו פתוחות. אין Retry אוטומטי אחרי תוצאה לא ידועה, ואין שימוש בחבילה לשדרוג מסד קיים.

12.6 **אריזת המבצע הושלמה מקומית:** [תמונת AMD64 והוראות Railway](../outputs/launch-validation-2026-09-09/postgres-bootstrap-runner-671f8183/README.md) משתמשות בבסיס PostgreSQL 17.11 המקובע ל־Digest, במשתמש שאינו root, ב־SQL מאומת וב־TLS מלא עם קובצי סיסמה ו־CA חיצוניים. הוגדרו מופע אחד ו־NEVER ללא Cron או HTTP Healthcheck. 16 בדיקות חסימה ו־13 בדיקות SQL ב־AMD64 עברו. יש לפרוס את תיקיית context כשורש שירות ייעודי, להכין את קובצי החיבור בזמן Runtime ולאמת את ההגדרות בחשבון לפני התנעה. חיבור TLS מאומת ופריסה אצל הספק עדיין לא בוצעו.
