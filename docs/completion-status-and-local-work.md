# מצב השלמה ומשימות מקומיות

תאריך בדיקה: 2026-08-17

## 1. אחוזי השלמה

1.1 תוכנית ה־Baseline המקומית המקורית: **100%**.

1.1.1 כל 14 שלבי ה־Master Plan הושלמו בקוד המקומי.

1.1.2 Build, ‏TypeScript, ‏ESLint וכל בדיקות השער המקומי עוברים.
מספר הבדיקות המדויק מתעדכן לאחר כל הרחבת אפיון ואינו תנאי להגדרת
ה־Baseline המקורי.

1.1.3 נתון זה אינו אומר שכל דרישות ה־PDF הושלמו. מטריצת הכיסוי
המדויקת נמצאת ב־`docs/product-specification-traceability.md`.

1.2 מוכנות פורמלית ל־Production: **15.2%**.

1.2.1 חמש מתוך 33 בדיקות ה־Production Readiness הן `ready`.

1.2.2 17 בדיקות חסומות על תצורה, ספק, תשתית או Evidence חיצוני.

1.2.3 11 בדיקות ממתינות להחלטת מוצר או מדיניות.

1.3 אומדן ניהולי לכל הדרך מהאפיון עד מערכת חיה: **90% ±5%**.

1.3.1 זהו אומדן מאמץ, לא יחס בין בדיקות. רוב עבודת ה־Domain, ה־UI,
האבטחה והבדיקות כבר בוצעה; העבודה שנותרה תלויה יותר בספקים,
חשבונות ענן, תרגילי שחזור וראיות CI.

1.3.2 אין לחשב ממוצע פשוט בין 100% ל־15.2%, משום ששני המדדים מודדים
דברים שונים וחלק מבדיקות ה־Production הן שערים ולא יחידות מאמץ.

## 2. משימות מקומיות: הושלם ונותר

האומדנים הם זמן פיתוח נטו של מפתח אחד, ללא המתנה לאישור ספק,
Credentials, בדיקת עורך דין או זמני Review.

2.1 **הושלם:** שמונת PR Checks המקומיים נוספו ל־GitHub Actions.

2.1.1 כל שער רץ כ־Job נפרד בשם החוזי שלו: Source guardrails,
‏Secret hygiene, ‏Interface guardrails, ‏Dependency lock, ‏Migrations,
‏TypeScript, ‏ESLint ו־Tests/Build.

2.1.2 יחד עם `dependency-audit` הקיים, ה־Repository מגדיר את כל תשעת
ה־Checks שדורשים חוזי Governance ו־CI Evidence. הפעלה חיה תאומת דרך
Pull Request לפני סימון Governance כמוכן.

2.2 **הושלם מקומית:** מחוללי Evidence ל־GitHub Governance ול־CI
Execution.

2.2.1 המחולל דורש `GITHUB_REPOSITORY` מפורש, קורא ארבעה Endpoints
ב־`GET` בלבד, מאמת Branch Protection, ‏CODEOWNERS, ‏Secret Scanning,
‏Push Protection ותשעת ה־Checks, וקושר את הפלט ל־Commit ול־Release.

2.2.2 הפלט תקף ל־24 שעות ואינו כולל Repository, ‏Branch, ‏URL, לוג
או Run ID גלוי. הרצה חיה נשארת חסומה עד שההגנות יופעלו ב־GitHub.

2.3 **הושלם מקומית:** כלי Evidence ל־Cloudflare Environment
Isolation ול־Deployment Provenance.

2.3.1 המחולל קורא ב־`GET` בלבד Deployments, ‏Version bindings,
Schedules ו־Queues, ומאמת שמשאבי D1, ‏R2, שלושה Queues ושלושה DLQs,
Rate Limits, ‏Secrets ו־Scheduler אינם משותפים בין ארבע הסביבות.

2.3.2 חוזה Environment Isolation שודרג ל־v2 עם 52 Fingerprints
ותפוגה של 24 שעות. Deployment Provenance נקשר ל־Release, ‏Commit,
Artifact, ‏Deployment, ‏Version ו־script ETag. אימות חי עדיין דורש
חשבון Cloudflare, ארבע פריסות מבודדות ו־Token לקריאה בלבד.

2.4 **הושלם מקומית:** קישור Browser Evidence החתום ל־JSON המדויק
של Runtime.

2.4.1 גם Verifier החתימה וגם Verifier הקובץ דורשים התאמה
byte-for-byte בין הקובץ המוגן לבין
`TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON`. שינוי תוכן או אפילו
Whitespace נכשל סגור לפני Production Readiness או מחיקת Secrets.

2.4.2 האימות מתבצע באותה קריאה שבה נבדקים קובץ ה־Evidence וה־Bundle
לפני ואחרי `gh attestation verify`, ולכן Digest תקין אינו יכול לאשר
ערך Runtime אחר.

2.5 **הושלם מקומית:** פיצול `WorkspaceApp` לפי Feature ללא שינוי התנהגות
עסקית.

2.5.1 ה־Dashboard ו־Metric cards הועברו ל־`WorkspaceDashboard`.
ה־Onboarding, שמירת פרופיל העסק ובדיקות השלמות הועברו
ל־`WorkspaceOnboarding`. עשרת שלבי ההקמה נמצאים ב־Registry משותף
וקפוא, ו־Feature heading משותף נמצא ב־`WorkspaceFeaturePage`.

2.5.2 בדיקות Boundary מונעות החזרת לוגיקת Dashboard או Onboarding
ל־`WorkspaceApp`.

2.5.3 `MetaConnectionPanel`, מחזור חיי Meta SDK, תיאום תוצאת Embedded
Signup והתנהגות ה־Dialog הועברו לגבול Feature עצמאי. בדיקת ה־Dialog
הנגישה מצביעה כעת על הקובץ החדש.

2.5.4 בחירת ה־Section ועטיפות Contacts, ‏Templates, ‏Campaigns,
Inbox, ‏Bot, ‏AI, ‏Reports ו־Billing הועברו ל־`WorkspaceSectionContent`.
ה־Shell אינו מכיל עוד תנאי רינדור Feature.

2.5.5 `WorkspaceApp` ירד מ־1,732 ל־377 שורות ללא שינוי ב־Props,
Routes או בהתנהגות העסקית. ארבע בדיקות Boundary מקבעות את ההפרדה.

2.6 **הושלם:** פיצול `ConversationInbox` ל־Thread list, ‏Message view,
Assignment ו־Composer.

2.6.1 רשימת השיחות, המסננים ומצבי הרענון הועברו
ל־`ConversationThreadList`. פעולות השרת וה־State נשארו בבקר הראשי,
ו־Labels ופונקציית בדיקת המסננים רוכזו בשכבת Presentation המשותפת.

2.6.2 ה־Message view, כותרת השיחה, אישורי AI וזרם ההודעות הועברו
ל־`ConversationMessageView`. פעולות השרת, ה־State וההרשאות נשארו
בבקר הראשי ולא הועברה אליו יכולת שליחה חדשה.

2.6.3 בקרי השיוך וסימון הקריאה הועברו
ל־`ConversationAssignmentControls`. גבול ה־Composer הועבר
ל־`ConversationComposerBoundary` ונשאר ללא שדה קלט או פעולת שליחה.

2.6.4 ארבע בדיקות Boundary מונעות החזרת Markup הרשימה, ההודעות,
השיוך או ה־Composer לקומפוננטות האב.

2.7 **הושלם:** פיצול `app/globals.css` לקובצי Feature ושכבת Tokens.

2.7.1 שכבת ה־Design Tokens הועברה ל־`styles/tokens.css`, וכללי מסמך
בסיסיים הועברו ל־`styles/foundations.css`. סדר ה־Imports משמר את סדר
ה־Cascade המקורי ושתי בדיקות Boundary מקבעות אותו.

2.7.2 כללי Inbox, שיחות, אישורי AI ו־Composer, כולל Breakpoints של
1,100, ‏820 ו־560 פיקסלים, הועברו ל־`features/conversations/conversations.css`.
כלל `panel-label` המשותף נשאר בשכבה הגלובלית כדי לשמר Cascade.

2.7.3 כללי Bot Builder, ‏Directory, ‏Editor ו־Canvas, כולל Breakpoints
של 820 ו־560 פיקסלים, הועברו ל־`features/bot/bot.css`. בדיקת Boundary
מוודאת שאין בקובץ כללי AI, ‏Reports או Public page.

2.7.4 כללי AI Workspace, ‏Directory, ‏Editor, ‏Knowledge ו־Readiness,
כולל Breakpoints של 820 ו־560 פיקסלים, הועברו ל־`features/ai/ai.css`.
כלל ה־Responsive המשותף עם Reports פוצל בלי לשנות את ערכו.

2.7.5 כללי Campaign Composer, ‏Directory, ‏Personalization,
‏Audience audit, ‏Delivery ו־Readiness, כולל Breakpoints של 820 ו־560
פיקסלים, הועברו ל־`features/campaigns/campaigns.css`. קבוצת Mobile
מעורבת פוצלה תוך השארת כללי Contacts ו־Templates ב־Global.

2.7.6 כללי Reports, ‏Toolbar, ‏Metrics, ‏Costs ומצבי Empty/Error,
כולל Breakpoints של 1,100, ‏820 ו־560 פיקסלים, הועברו
ל־`features/reports/reports.css`. כללי Billing, ‏Sidebar ו־Public page
נשארו מחוץ לגבול ה־Feature.

2.7.7 כללי דף ה־Public, כולל Header, ‏Hero, ‏Product map,
‏Capabilities, ‏Architecture, ‏Pricing, ‏Footer ושלושת ה־Breakpoints,
הועברו ל־`features/public/public.css`. רכיבי `public-brand`
ו־`hero-badge`, שמשמשים גם Auth ו־Invitation, הועברו לשכבת
`styles/brand.css` משותפת במקום ליצור תלות בין Features.

2.7.8 כללי Contact Directory, ‏Consent, ניהול קבוצות ורשומות,
כולל Breakpoints של 820 ו־560 פיקסלים, הועברו
ל־`features/contacts/directory.css`. כלל `danger-text-button` נשאר
משותף משום שהוא משמש גם את Conversation Inbox.

2.7.9 כללי Template Directory, ‏Editor, משתנים, Quick Replies, ‏CTA,
‏Phone Preview ו־Responsive הועברו ל־`features/templates/templates.css`.
קבוצות Selectors משותפות עם Mapping ו־CSV פוצלו בלי להעביר את כללי
Contact Import לתוך Feature ה־Templates.

2.7.10 כללי Contact Import, ‏CSV schema, ‏Mapping, ‏Preview ואיכות
הקובץ, יחד עם Breakpoints של 820 ו־560 פיקסלים, הועברו ל־
`features/contacts/import.css`. ‏`app/globals.css` ירד מ־7,890
ל־3,140 שורות, ובדיקת Boundary מקבעת את סדר Contact Directory,
Contact Import ו־Templates בלי להעביר את `inline-notice` המשותף.

2.8 **הושלם:** בדיקות עומס וכשל מקומיות נוספות.

2.8.1 `queue-backpressure-load.test.mjs` מעבד 100 Batches מלאים —
1,000 הודעות — בכל אחד משלושת ה־Queues, ומוכיח שרק פריט אחד נמצא
ב־flight בכל Consumer. ‏Batch גדול מהמכסה נדחה לפני גישה עסקית.

2.8.2 מסלולי DLQ של Meta, ‏Campaign ו־Team Invitation בודקים Metadata
מסוננת, Recovery key, אישור מפורש, Requeue לפני Ack וכשל Queue ללא
אובדן ההודעה. מסלול Team Invitation הושלם ב־
`server/team/teamInvitationDeadLetter.ts`.

2.8.3 ‏Retry וכשל ספק מכוסים ב־Queue consumer tests וב־
`meta-graph-transport.test.mjs`: Timeout או תוצאה חיצונית לא ודאית
אינם יוצרים שליחה אוטומטית כפולה, וכשל זמני מקבל Delay תחום בלבד.

2.8.4 ‏`retention-policy-purge.test.mjs` דוחה Plan שפג תוקפו או
Inventory שהשתנה לפני מחיקה. ‏`backup-restore-readiness.test.mjs`
דוחה Restore שאינו מקושר או שה־Digest שלו אינו תואם לגיבוי.

2.8.5 אלו בדיקות עומס דטרמיניסטיות מקומיות. הן אינן מחליפות Load
test ו־DLQ rehearsal מול Cloudflare ו־Meta בסביבת Staging אמיתית.

2.9 **הושלם:** Release rehearsal מקומי ותיעוד מפעיל.

2.9.1 `npm run release:rehearse:local` דורש Worktree נקי, מריץ את
שער השחרור המקומי, יוצר Manifest ו־Change Log, מאמת אותם ומריץ
Production Probe מבודד.

2.9.2 ה־Probe מתקבל רק כאשר כל השערים המקומיים עברו ו־Production
נחסם בדיוק ב־`DEPENDENCY_AUDIT_ATTESTATION_ARGUMENTS_INVALID`.
כשל אחר או Production PASS בלתי צפוי מכשילים את ה־Rehearsal.

2.9.3 התוצאה נשמרת ב־`.artifacts/local-release-rehearsal.json`
כראיה `local-only` ללא Secret, ‏PII, ‏Timestamp או נתוני ספק.

2.9.4 `docs/release-operator-runbook.md` מקבע את סדר ה־Artifacts,
הזרקת Evidence, בחירת Rollback/Forward Fix ו־Smoke checklist.
Smoke חיצוני עדיין דורש Staging וחשבונות אמיתיים.

2.10 סך העבודה המקומית שנותרה:

2.10.1 כל **9 מתוך 9** שלבי מסלול ה־Baseline המקומי הושלמו. לא
נשאר שלב פיתוח במסלול זה.

2.10.2 Review צוותי ותיקוני Regression, אם יימצאו, אינם ניתנים
לאומדן לפני Review ולכן הם `unknown/unavailable`.

2.11 **הושלם מקומית לאחר אימות ה־PDF:** עריכת Business Profile קיים
ב־System Admin.

2.11.1 ה־Directory טוען את שם העסק, אזור הזמן, שפת הממשק וגרסת
הפרופיל מ־D1, ונכשל סגור אם שם ה־Tenant והפרופיל אינם מסונכרנים.

2.11.2 פעולת העדכון דורשת Expected Version, גוזרת Actor וזמן
מה־Session ומהשרת, ומעדכנת אטומית את `business_profiles`, שם ה־Tenant,
אירוע Immutable ו־Audit Log.

2.11.3 אירוע ה־Audit שומר Previous/New SHA-256 Digests ורשימת שדות
שהשתנו, בלי לשכפל שם עסק, אזור זמן או שפת ממשק. Retry זהה אינו יוצר
אירוע נוסף; גרסה ישנה עם יעד אחר מוחזרת כ־Conflict.

2.11.4 אין במסלול זה Package, ‏Quota, אימייל, טלפון או Contact person.
שדות אלה אינם מוגדרים באפיון ולכן לא נוצרו כנתוני דמה.

2.12 **הושלם מקומית לאחר אימות ה־PDF:** חיפוש וסינון מלא של רשימת
ה־Tenants ב־System Admin.

2.12.1 החיפוש עבר מהדפדפן לשרת ולכן הוא חל על כל ה־Directory ולא רק
על 50 הרשומות שכבר נטענו. הוא תומך בשם Tenant או מזהה, עד 80 תווים,
ללא Control characters.

2.12.2 נוספו סינון לפי כל מצבי ה־Tenant וסינון לפי קיום או היעדר
רשומת מנוי. אותם פילטרים מועברים בכל עמוד Keyset ואינם מתאפסים
בטעינת 50 רשומות נוספות.

2.12.3 שאילתת D1 משתמשת ב־Bindings וב־`INSTR`; היא אינה מרכיבה SQL
מהקלט ואינה מפרשת `%` או `_` כ־Wildcards. קלט מורחב או לא מוכר נדחה
לפני Persistence.

2.12.4 ממשק הסינון הוא Form נגיש עם Labels, פעולת ניקוי, מצב טעינה
ו־Live region למספר התוצאות. Browser acceptance חי נשאר תלוי בזהות
Clerk System Admin וב־D1 של Staging.

2.13 **הושלם מקומית:** שלוש התראות התלויות שעליהן דיווח GitHub
טופלו בענף העבודה.

2.13.1 שתי התראות High של `image-size@2.0.2` כבר הוסרו מה־Lockfile
באמצעות שדרוג Vinext. התראות אלה יישארו מוצגות ב־GitHub כל עוד
ענף ברירת המחדל לא כולל את ה־PR.

2.13.2 שרשרת Moderate של `esbuild@0.18.20` בתוך
`@esbuild-kit/core-utils` הוחלפה ב־Override תחום אל
`esbuild@0.25.12`. ‏`npm audit` מלא מול Registry הרשמי מחזיר כעת
אפס פגיעויות.

2.13.3 Risk acceptance הקודם בוטל. שער ה־Development audit מקבל רק
אפס ממצאים ודורש את ה־Override וה־Lockfile המדויקים. שער ה־Migrations
מריץ גם `drizzle-kit check` וגם יצירת Migration מבודדת מה־Schema
האמיתי, מאמת SQL ו־Journal ומוחק את התוצר הזמני. כך עדכון התלות אינו
נסמך על Build כללי בלבד.

2.14 **הושלם מקומית:** מנגנון מניעת התיישנות תלויות.

2.14.1 ‏Dependabot בודק npm בכל יום שני ו־GitHub Actions בכל יום
שלישי. עדכוני Minor/Patch מקובצים לפי Production, ‏Development
ו־Actions; עדכוני Major נשארים מבודדים לבדיקת תאימות נפרדת.

2.14.2 אין Ignore rules, ‏Registry פרטי, Target branch חלופי או
External code execution. מספר ה־PRs מוגבל, ו־Workflow actions נשארים
מוצמדים ל־SHA מלא. בדיקות חוזה מקומיות מגינות על המדיניות. ההפעלה
ב־GitHub תתרחש רק לאחר Merge לענף ברירת המחדל, והרצת Checks על PRs
של Dependabot עדיין תלויה בפתרון חסימת ה־Billing.

2.15 **הושלם מקומית:** חוזה Machine-readable למצב Production
Readiness.

2.15.1 `npm run --silent verify:production-readiness:json` מחזיר Payload
בגרסה 1 הכולל רק סטטוס, מונים ו־`id/status/code` עבור 33 השערים.
ערכי Environment, ‏Credentials, ‏Tenant IDs ושדות מקור מורחבים אינם
מועתקים לפלט.

2.15.2 גם במצב JSON הפקודה נכשלת ב־Exit code שאינו אפס כל עוד
Production חסום. בדיקות שליליות דוחות Arguments נוספים, מונים שאינם
תואמים, מזהים כפולים וקודים שאינם בטוחים. כך צוות Deployment יכול
לצרוך את המצב באוטומציה בלי להפוך Report ל־Evidence מזויף.

2.16 **הושלם תכנונית:** החלטות Repository Authority ו־Hosting
הועברו מהשאלון ל־Architecture Decision Records.

2.16.1 ‏`talstilkol/connect` הפרטי הוא מקור האמת היחיד בבעלות טל.
ההחלטה אינה מחליפה Branch Protection, ‏Review, ‏CI, ‏Secret scanning
או Governance evidence שעדיין חסרים.

2.16.2 נבחר Migration מלא ל־Vercel ול־Railway. המסלול חולק ל־
Contract freeze, ‏Adapter parity, ‏Staging מבודד ו־Cutover מבוקר.
הקוד עדיין Cloudflare-specific ולכן Deployment ליעד החדש נשאר חסום
עד בחירת רכיבי הנתונים/Queue/Storage והשלמת ה־Migration.

2.17 **הושלם מקומית:** Contract freeze ל־Migration.

2.17.1 Registry מוקפא ממפה 18 יכולות Cloudflare אל יעד Vercel/
Railway ומקשר כל יכולת לקובצי המקור האמיתיים שלה. בדיקות מונעות
Binding חסר, כפילות, מקור שאינו קיים או ספק מומצא.

2.17.2 תשע יכולות קיבלו מיקום יעד ברמת Vercel/Railway ותשע נשארו
`decision-required`: PostgreSQL, ‏Object storage, שלושת ה־Queues,
Distributed rate limits, ‏Backup, ‏Browser proof ו־Observability.

2.17.3 טווח ה־Migration הראשוני הוא 156–312 שעות נטו לאחר קבלת
החלטות הספקים. הטווח נוסף לתוכנית בעקבות שינוי ה־Hosting ואינו חלק
מה־Baseline המקומי המקורי שהושלם.

2.18 **הושלם מקומית:** חוזה API ראשוני בין Vercel ל־Railway.

2.18.1 ‏Contract, ‏Client ו־HTTP Handler מפרידים בין Vercel OIDC
לבין Clerk session token, מאמתים Environment מדויק ומונעים קבלת
Tenant/User identity מתוך Payload.

2.18.2 ‏Query אינו מקבל Idempotency key ו־Mutation מחייב מפתח
דטרמיניסטי מבוסס SHA-256. בקשה ותגובה מוגבלות בעומק, Nodes, שדות,
מחרוזות ו־Bytes; שדות Secret/Identity ו־Prototype נדחים בכל עומק.

2.18.3 המימוש עדיין אינו Endpoint חי. שכבות האימות שנוספו בסעיף
2.19 וה־Registry הראשוני שנוסף בסעיף 2.20 משלימים את גבול הקריאה
המקומי, אך Routes מפוצלים, שאר ה־Operations, ‏Accounts, ‏Staging
ו־Evidence עדיין חסרים. לכן היכולת נשארת `adapter-required`.

2.19 **הושלם מקומית:** Adapters קריפטוגרפיים לגבול Vercel/Railway.

2.19.1 ‏Vercel OIDC מאומת באמצעות `jose` מול Remote JWKS קבוע,
Issuer, ‏Audience ו־Subject מדויקים ל־Team, ‏Project ו־Environment.

2.19.2 ‏Clerk מאמת רק `session_token` ורק מול `authorizedParties`
הנגזרים מ־`APP_PUBLIC_ORIGIN`. ה־Adapter מחזיר רק External User ID;
Tenant membership והרשאה נשארים אחריות ה־Operation ב־Railway.

2.19.3 תצורה חסרה, חלקית או לא חוקית נכשלת לפני בניית Providers.
ערכי Accounts האמיתיים נשארים `unknown/unavailable`, ולכן Routes,
שאר ה־Operations, ‏Staging ו־Deployment evidence עדיין חסרים.

2.20 **הושלם מקומית:** Operation registry והרשאות Tenant ראשונות.

2.20.1 ה־Runtime טוען Memberships לפי Clerk user. כאשר קיימים כמה
Workspaces הוא משתמש רק בבחירת ה־Tenant השמורה ומאמת אותה מחדש מול
החברויות הפעילות. אין `tenantId` ב־API Payload או בתגובה.

2.20.2 שלוש פעולות Read-only חוברו לשירותים קיימים:
`workspace.context.read`, ‏`contacts.list` ו־`reports.read`. אנשי קשר
דורשים `contacts.read`; דוחות דורשים `reports.read`; קלט לא חוקי נחסם
לפני Database access.

2.20.3 ‏Runtime factory אחד מחבר Vercel OIDC, ‏Clerk, ‏Tenant
resolution, ‏Operation registry ו־HTTP Handler. עדיין חסרים Routes,
PostgreSQL repositories, רוב פעולות ה־Mutation ו־Live evidence; חוזה
ה־Mutation הראשון מתועד בסעיף 2.21.

2.21 **הושלם מקומית:** חוזה Mutation מאובטח ראשון ל־Railway API.

2.21.1 הפעולה `contacts.save` מקבלת רק חמישה שדות מוגדרים, מנרמלת
אותם לפני גישה ל־Tenant, דורשת `contacts.write` ואינה מקבלת `tenantId`
או זהות משתמש מה־Caller.

2.21.2 לאחר הרשאה מופעל Rate limiter במצב Fail-closed. ‏SHA-256
קנוני קושר את ה־Idempotency key ל־Operation ול־Payload המנורמל; Replay
זהה מוחזר כתוצאה קיימת ושימוש חוזר במפתח עבור תוכן שונה מוחזר כ־Conflict.

2.21.3 ‏Port ייעודי מחייב את ה־Adapter העתידי לשמור Mutation, ‏Audit,
Idempotency claim, ‏Request digest ותוצאת Replay באותה PostgreSQL
Transaction. אין עדיין Adapter כזה ולכן אין טענה שכתיבה חיה מוכנה.

2.21.4 תגובת ה־API משתמשת ב־Contact mapper הקיים ומסירה `tenantId`,
זהות משתמש, Evidence ו־Database timestamps. עדיין חסרים Executor אמיתי,
שאר ה־Mutations, ‏Routes, ‏Live configuration ו־Staging evidence.

## 3. עבודה שאינה מקומית בלבד

3.1 חיבור Meta, ‏AI, ‏Billing, ‏File Scanner ו־Alert provider מתחיל
רק לאחר בחירת ספקים ופתיחת חשבונות אמיתיים.

3.2 Staging Browser E2E דורש פריסה מבודדת, שש זהויות בדיקה,
Case Inventory ו־D1 Read token.

3.3 Backup/Restore ו־Retention אינם יכולים להיחשב מוכנים עד להרצה
מול משאבי ענן אמיתיים ושמירת Evidence מתאים.

3.4 Retention deletion adapter יישאר מושבת עד אישור משפטי של
המדיניות ומימוש Legal Hold.

3.5 Workstream הצוות החדש — GitHub access, בחירת Hosting, ‏Meta
Sandbox, חיבור API, ‏Staging ו־Pilot — מתועד ב־
`docs/team-operating-plan.md`. הוא אינו כלול באומדן המקומי בסעיף
2.10, משום שזמני Accounts, ספקים ואישורים הם `unknown/unavailable`.

3.6 במסלול ה־Baseline המקומי כל 9 השלבים הושלמו. הדבר אינו סוגר
את פערי האפיון בסעיף 4 ואינו מחליף אף Gate חיצוני.

## 4. פערים שנוספו לאחר אימות PDF המקור

4.1 המסמך המקורי אומת ב־2026-08-16 לפי SHA-256 המתועד במטריצת
העקיבות. נמצאו ארבעה פערים פונקציונליים שאינם חלק מסיום ה־Baseline:

4.1.1 Excel/XLSX import הושלם מקומית. `read-excel-file@9.2.0`
ו־`fflate@0.8.3` נעולים ב־Lockfile, וקובצי XLSX עוברים בדיקת ZIP/XML
מוגבלת לפני אותו Mapping ו־Import job של CSV. נוסחאות, Macros,
קישורים חיצוניים, תוכן פעיל, גיליונות נסתרים או מרובים וחריגות גודל
נחסמים. Browser acceptance מקומי חיובי/שלילי הושלם ב־2026-08-17.
נותר Staging acceptance עם קובץ מורשה אמיתי, Tenant מורשה ו־D1 מבודד;
זמן המתנה לחשבון ולסביבה הוא `unknown/unavailable`.

4.1.2 Recurring Campaign domain ו־Scheduler: ‏10–16 שעות לאחר
החלטת Product על מדיניות recurrence.

4.1.3 Flow Builder חזותי ונגיש: עורך רצף Text, שאלת Buttons מסיימת,
ושתי שאלות Buttons עוקבות הושלמו. כל בחירה בשאלה הראשונה פותחת שאלה
שנייה ייעודית, וכל בחירה בשאלה השנייה שולחת Text ומתכנסת ל־End משותף.
פיצול Condition יחיד ומסלולי Handoff לפי Keyword או מתוך כל אחד
מענפי ה־Condition הושלמו. Handoff מעביר רק בענף שנבחר, ללא Reply
באותו Turn; בחירת Handoff פנימי מסירה וחוסמת הודעות Intro, ו־Payload
שמנסה לשלב תוכן נסתר עם ההעברה נדחה בשרת. אי־התאמת Keyword במסלול
Handoff ישיר מסתיימת ללא Mutation. לכל Button ולכל תוצאת Condition
שאינה Handoff תשובת Text נפרדת; הגרף והמפתחות נגזרים בשרת, והמשך
בחירה נשען על Outbox Accepted של ההודעה הקודמת באותה גרסה ובחלון 24
שעות. Drag-and-drop לסידור Text ואפשרויות Buttons כולל חלופת מקלדת;
גם סדר ענפי השאלה הראשונה ניתן לשינוי במקלדת. ה־Canvas החי מציג את כל
חמשת מבני הטיוטה והופרד מ־`BotFlowBuilder`;
לקורא מסך מוצג עץ סמנטי יחיד במקום הקראה כפולה של התרשים החזותי.
חוזה Graph Draft כללי, Compiler שרתי ו־Reader הושלמו עבור רצפים
שרירותיים של Text, ‏Buttons, ‏Conditions, ‏Handoff ו־End. מפתחות Draft
משמשים רק להפניות זמניות; הסדר הקנוני וכל הזהויות המתמידות נגזרים
בשרת. Cycles, ‏Nodes מנותקים, References חסרים וזהויות מוזרקות נחסמים.
עורך React כללי מחובר לחוזה ומאפשר יצירה, חיבור, עריכה, מחיקה וסידור
של כל סוגי ה־Nodes. מחיקת Node כניסה או Node שעדיין מפנים אליו חסומה;
Cycles ו־Nodes מנותקים חוסמים שמירה. לכל פעולת סדר קיימים כפתורי
מקלדת לצד Drag-and-drop, וה־Preview כולל עץ Connections סמנטי ומפת
Connections חזותית עם חצים. Browser E2E מקומי מרכיב את רכיבי
ה־Production ב־Chromium ובודק את כל סוגי ה־Nodes, הוספה ומחיקה,
Connection מפורש, Focus, מקלדת, Drag-and-drop וה־Preview ללא שגיאות
Console. הפער המקומי של SPEC-18 ו־SPEC-19 נסגר; שמירה ופרסום חיים
נשארו תלויי Clerk ו־D1 של Staging.

4.1.4 עריכת Business Profile הקיים ב־Admin הושלמה. מודל Package,
‏Quota ופרטי קשר נשאר החלטת Product פתוחה. לאחר אישור המודל, אומדן
היישום המקומי הוא 8–14 שעות; חיבור Billing חי אינו כלול.

4.1.5 Slice ראשון של לוקליזציה הושלם בדף הנחיתה הציבורי. מילונים
מלאים לעברית, אנגלית וערבית מזינים רכיב Server משותף ואת ה־Metadata
של הנתיבים `/`, ‏`/en` ו־`/ar`. כל עמוד מגדיר `lang` ו־`dir` מתאימים,
בורר השפה מסמן את השפה הפעילה, ו־Locale לא מוכר מחזיר `404` במקום
Fallback מטעה. Browser acceptance מקומי ב־Chromium אימת את שלוש
השפות, את כיוון חצי הזרימה ואת מיקוד קישור הדילוג במקלדת. במהלך
הבדיקה נמצא ותוקן שם נגישות כפול באזור עקרונות המערכת. אין שימוש
ב־Client storage או במצב דפדפן עבור בחירת השפה. לאחר השלמת ה־Slices
הנוספים נותר לתרגם את תוכן מסכי סביבת העבודה ואת ה־Admin ולבדוק כל
Surface בכל שפה.

4.1.6 Slice שני של לוקליזציה הושלם במעטפת Login/Register. הנתיבים
העבריים `/login` ו־`/register`, האנגליים `/en/login` ו־`/en/register`
והערביים `/ar/login` ו־`/ar/register` משתמשים במילון Auth משותף,
Metadata מתורגם, `lang/dir` סמנטיים ובורר שפה ששומר על פעולת ה־Auth.
גם קישורי ה־Auth בדף הנחיתה שומרים כעת על השפה. `ClerkProvider` בוחר
באופן דטרמיניסטי `heIL`, ‏`enUS` או `arSA` לפי Segment מדויק בנתיב;
ה־Client boundary מקבל רק Publishable Key, בעוד בדיקת Secret Key
נשארת בשרת. Browser acceptance מקומי ב־Chromium אימת את ששת הנתיבים
ואת 404 עבור `/fr/login`. סביבת הפיתוח אינה כוללת Clerk Keys, ולכן
ה־Widget החי נשאר `unknown/unavailable` עד Staging. ה־API הרשמי של
Clerk מסמן Localization כ־Experimental ואינו מתרגם Account Portal;
לכן נדרשת בדיקת רגרסיה חיה בכל שדרוג Clerk:
`https://clerk.com/docs/guides/customizing-clerk/localization`.

4.1.7 Slice שלישי של לוקליזציה הושלם במסך קבלת ההזמנה. המסך קורא
Locale אופציונלי ומדויק מ־`?lang=he|en|ar`, מתרגם Metadata, שלבים,
מצבי חסימה, פעולות וכל תשעת Outcomes של קבלת ההזמנה, ומגדיר `lang/dir`
מתאימים. בורר השפה משתמש רק בקישורים יחסיים `?lang=...`; הוא אינו
משכפל את ה־Invitation Key ב־DOM או ל־Form input. Locale חסר, מורחב,
כפול או לא מוכר חוזר לעברית. בדיקות Server-rendered HTML ו־Chromium
אימתו אנגלית וערבית, Focus ראשון על Skip Link, מפתח שאינו מופיע בתוך
`main`, וקישור לא תקין שנשאר חסום עם כפתור Disabled וללא Mutation.
כל תוצאות הפעולה נבדקו ברמת חוזה; תוצאות קבלה חיות נשארות תלויות
ב־Clerk, ‏D1 ו־Staging מורשים.

4.1.8 Slice רביעי של לוקליזציה הושלם במעטפת ה־Workspace. ‏Registry
ניווט יחיד מזין Labels וכותרות קבוצות בעברית, אנגלית וערבית. שני
נתיבי ה־Workspace קוראים רק `?lang=he|en|ar` מדויק, שומרים על נתיבי
ברירת המחדל בעברית ומעבירים Locale מאומת לכל ניווט פנימי. ה־Shell
מתרגם Skip Link, ‏Breadcrumb, תפריט מובייל, סביבת ההקמה, פעולות
מושבתות, מצבי Meta, ‏Tenant switcher ותפקידי משתמש. בורר שפה נגיש
שומר את ה־Section הנוכחי. אנגלית הופכת את פריסת ה־Sidebar ל־LTR,
בעוד עברית וערבית נשארות RTL. ‏Chromium אימת ניווט אנגלי עם Locale
מתמשך, מעטפת ערבית, פריסת Desktop, פתיחת תפריט מובייל ו־Console נקי.
תוכן ה־Feature pages נשאר בעברית בשלב זה ואינו מסומן כמתורגם.

4.1.9 Slice חמישי של לוקליזציה הושלם בתוכן ה־Dashboard וה־Onboarding.
ה־Dashboard מתרגם כותרת, מצב פרופיל העסק, Meta banner, ארבעה מדדים,
התקדמות, חמשת שלבי ההקמה הראשונים, מצבי שמירה, החלטות ופעולות מהירות.
ה־Onboarding מתרגם כותרות, Form labels, מצבי שמירה מקומית ושרתית,
בדיקות שלמות, ששת מצבי הכשל ו־Roadmap מלא של עשרה שלבים. Registry
השלבים קפוא ונפרד לכל שפה. כל 12 מצבי Meta מספקים Presentation מלא
בשלוש השפות בלי לשנות Tone או Readiness, וחצי הפעולה מתהפכים ב־LTR.
בדיקות Server-rendered HTML ו־Chromium אימתו Dashboard אנגלי,
Onboarding אנגלי וערבי, Locale מתמשך, Labels נגישים, RTL ו־Console
נקי. יתר Feature pages ו־Admin עדיין לא תורגמו בשלב זה.

4.1.10 Slice שישי של לוקליזציה הושלם בחלון Meta Embedded Signup.
מילון Feature תלת־לשוני מכסה את כותרת ה־Dialog, Labels נגישים, חמשת
שלבי החיבור, כל 10 מצבי טעינת ה־SDK וכל 19 מצבי ניסיון החיבור. קוד
שגיאת SDK לא מוכר נכשל סגור ל־`LOAD_FAILED` במקום ליצור טקסט חסר.
שפת ה־Workspace עוברת לחלון וגם ל־Meta Presentation הקיים בלי לשנות
Readiness, הרשאות, Timeouts או פעולות שרת. בדיקות Boundary מונעות
החזרת טקסט עברי קשיח לרכיב. Chromium אימת חלון אנגלי וערבי, `RTL`
מחושב, Focus ראשוני, סגירת `Escape`, החזרת Focus ו־Console נקי.

4.1.11 Slice שביעי של לוקליזציה הושלם בכל Surface אנשי הקשר. מסך
ה־Directory, יצירת פרופיל, טעינה מדורגת, מצבי דיוור והסכמה, עורך
אירועי הסכמה, תגיות, רשימות וכל ארבעת שלבי CSV/XLSX זמינים בעברית,
אנגלית וערבית. המילונים מכסים שמונה שדות מיפוי, 21 קודי כשל של קובץ,
תשעה כשלים תחומים של משימת ייבוא ושמונה כשלים של פעולות אנשי קשר.
ה־UI ממפה `ContactImportSourceError.code` במקום להציג `Error.message`,
בלי לשנות Parsing, מגבלות קובץ, הרשאות או פעולות שרת. בדיקות
Server-rendered HTML ו־Chromium אימתו אנגלית וערבית, `LTR/RTL`, רכיב
בחירת CSV/XLSX ו־Console נקי. בדיקות Boundary מונעות החזרת טקסט עברי
קשיח לשלושת רכיבי ה־Feature.

4.1.12 Slice שמיני של לוקליזציה הושלם בכל Surface התבניות. העורך,
רשימת התבניות, Preview, בחירת קטגוריה ושפת Template, משתנים, Examples,
Quick Reply, ‏Call to Action וכל מצבי השמירה זמינים בעברית, אנגלית
וערבית. מילון מוקלד מכסה שבעה מצבי תבנית, תשע תוצאות שמירה, 17 תוצאות
שליחה ו־13 תוצאות סנכרון. בדיקת משתני `{{1}}` מחזירה כעת קוד שגיאה
ניטרלי לשפה ושכבת ה־UI מתרגמת אותו, במקום שטקסט עברי יזלוג משכבת
ה־Validation. בדיקות Server-rendered HTML ו־Chromium אימתו אנגלית
וערבית, `LTR/RTL`, שגיאת תחביר משתנה ו־Console נקי. בדיקות Boundary
מונעות החזרת טקסט עברי קשיח לעורך ול־Validation המשותף.

4.1.13 Slice תשיעי של לוקליזציה הושלם בשני מסלולי Campaigns: המסלול
הקבוע ב־D1 וה־Rehearsal המקומי. יצירת טיוטה, בחירת Template וקהל,
Personalization, ‏Dynamic URL, ‏Audience audit, תזמון, Planning,
Readiness, רשימת הקמפיינים וכל תוצאות השמירה וההפעלה זמינים בעברית,
אנגלית וערבית. המילון המוקלד מכסה שבעה מצבי Campaign, ‏11 תוצאות שמירה
ו־10 תוצאות הפעלה בלי לשנות את חסימות Consent, ‏Delivery או Adapter.
בדיקות Server-rendered HTML ו־Chromium אימתו את ה־Rehearsal האנגלי
והערבי, פעולה Fail-closed של Readiness, ‏LTR/RTL ו־Console נקי. כדי
לא להגדיל את מעטפת ה־Workspace, ‏Campaigns פוצל ל־Route chunk של
כ־68KB וה־Chunk הראשי ירד מכ־500KB לכ־436KB ללא העלאת סף האזהרה.

4.1.14 Slice עשירי של לוקליזציה הושלם בכל Surface ה־Inbox ובזרימת
אישורי תשובות AI. רשימת השיחות, מסננים, מצבי שיחה ושיוך, זרם
ההודעות, תוכן שאינו טקסט, פעולות סימון ושיוך, Contact panel וכל מצבי
הכשל התחומים של שיחות ואישורי AI זמינים בעברית, אנגלית וערבית.
המילון המוקלד מכסה את כל מצבי ה־Directory, פעולות השיחה והחלטות AI,
בלי לשנות הרשאות, Polling, פעולות שרת או חסימת השליחה. בדיקות
Server-rendered HTML ו־Chromium אימתו אנגלית וערבית, `LTR/RTL`, טעינת
Chunk נפרד ו־Console נקי. ‏Inbox פוצל ל־Route chunk של כ־37KB
וה־Chunk הראשי ירד מכ־436KB לכ־416KB ללא העלאת סף האזהרה.

4.1.15 Slice אחד־עשר של לוקליזציה הושלם בכל Surface סוכן ה־AI,
מקורות הידע ומוכנות ההפעלה. ה־Directory, עורך ה־Definition, מדיניות
אישור תשובות, Grounding, מגבלת עלות, היסטוריית גרסאות, תשעת חוסמי
ההפעלה וכל שבעת מצבי מקור הידע זמינים בעברית, אנגלית וערבית. המילון
המוקלד מכסה גם את כל מצבי ה־Directory ותוצאות פעולות השרת, בלי לשנות
הרשאות, Validation, פעולות D1 או חסימת Provider. לכפתור העלאת המקור
החסום נוסף הסבר נגיש המפרט את R2, סוגי הקובץ, מגבלת הגודל והסריקה
החסרים. בדיקות Server-rendered HTML ו־Chromium אימתו אנגלית וערבית,
`LTR/RTL`, טעינת Chunk נפרד ו־Console נקי. ‏AI Agent פוצל ל־Route
chunk של כ־26KB וה־Chunk הראשי ירד מכ־416KB לכ־403KB.

4.1.16 Slice שנים־עשר של לוקליזציה הושלם בכל Surface ה־Bot Flow
Builder. ספריית התהליכים, עורך הרצף, שאלות Buttons ברמה אחת ובשתי
רמות, ‏Condition, ‏Handoff, עורך Graph מלא, הודעות Drag-and-drop,
מצבי כשל ו־Preview חזותי ונגיש זמינים בעברית, אנגלית וערבית. המילון
המוקלד מכסה את כל מצבי ה־Directory ותוצאות פעולות השרת, תוויות מצב
שיחה, הודעות Screen Reader והודעות שינוי מבנה, בלי לשנות Compiler,
זהויות דטרמיניסטיות, פעולות D1 או גבולות השמירה והפרסום. בדיקות
Server-rendered HTML ו־Chromium אימתו אנגלית וערבית, `LTR/RTL`, ללא
גלישה אופקית וב־Console נקי. ‏Bot Flow Builder פוצל ל־Route chunk של
כ־64KB וה־Chunk הראשי ירד מכ־403KB לכ־384KB.

4.1.17 Slice שלושה־עשר של לוקליזציה הושלם ב־Reports, ‏Billing,
‏Team וב־Decision Center. כל מצבי הדוחות, המדדים, העלות, ספריית
הצוות, תפקידי RBAC, מסך החיוב ה־Fail-closed וכל 11 החלטות ה־Production
זמינים בעברית, אנגלית וערבית. תוכן ההחלטות מתורגם לפי `checkId`, אך
ה־Registry המשותף נשאר מקור האמת היחיד לזהויות, קודים וסטטוסים.
‏Reports נטען כעת ב־Route chunk נפרד של כ־6KB; ה־Chunk הראשי הוא
כ־391KB. בדיקות Chromium אימתו את ארבעת המסכים, `html lang/dir`,
‏LTR/RTL, ‏11 החלטות, ללא גלישה אופקית וב־Console נקי. במהלך הבדיקה
תוקן גם פער נגישות שבו מעטפת ה־Workspace החליפה כיוון אך תגית
ה־HTML העליונה נשארה בעברית.

4.1.18 Slice ארבעה־עשר והאחרון של הלוקליזציה המקומית הושלם בכל
מסכי System Admin: ספריית ה־Tenants, עריכת Business Profile, מרכז
החלטות Production ומדיניות WhatsApp Delivery לכל Tenant. כל Labels,
מצבי Empty/Error/Success, פעולות, תאריכים והסברים זמינים בעברית,
אנגלית וערבית; הקישורים בין מסכי Admin ול־Workspace משמרים שפה,
ותגית `html` מקבלת `lang/dir` תואמים. ה־Registry המשותף נשאר מקור
האמת לזהויות ולסטטוסי החלטות, וכל הרשאה, Validation ופעולת D1 נשארו
ללא שינוי. Browser acceptance מקומי אימת English ב־Desktop,
Arabic/RTL ב־Mobile ונתיב Tenant-specific, ללא גלישה אופקית וללא
שגיאות או אזהרות Console. ה־Chunks הגדולים במסלול הם כ־32KB לספריית
ה־Tenants, כ־18KB למדיניות WhatsApp וכ־13KB למרכז ההחלטות. ‏Ready-state
ופעולות שינוי אמיתיות דורשים עדיין Clerk System Admin ו־D1 מורשים
ב־Staging.

4.2 מסלול Rate Limiting נמצא בשלב 4 מתוך 4. חוזה Admission מחובר
לפני Claim ב־Campaign Queue, כולל `deferred`, ‏Delay תחום,
Reservation key ושחרור לפני Submit. ה־Runtime בונה את ה־Adapter מעל
אותו D1. ‏Context Resolver מאמת Connection מחובר וגוזר מפתחות HMAC
אטומים. ‏Webhook reconciliation מקשר כעת אטומית את מזהה ההודעה של
Meta ל־Delivery ול־Reservation, ומיישב `delivered`, ‏`read` ו־`failed`
באופן Idempotent. ‏Meta sender adapter וה־Processor השרתי נבנו
ונבדקו מקומית: הם מרכיבים Template parameters, טוענים Token רק דרך
Credential Vault, מאמתים `wamid` ומסווגים תוצאה חיצונית לא ודאית
ללא Retry אוטומטי. נוסף Provider cooldown אטומי ל־Sender,
Portfolio+Recipient ו־Sender+Recipient, המקושר ל־Reservation ול־
Settlement ונשען על `MetaMessageFailurePolicy` המשותף. הם עדיין אינם
מוזרקים ל־Worker. מקור ה־Policy המבוסס D1 מחובר כעת ל־Worker ודורש
Event בלתי־ניתן לשינוי הקשור לגרסת Meta connection, לגרסת Graph API,
ל־Digest ולתפוגה. Event אחרון במצב `disabled` משמש Kill switch
עמיד. נוסף מסלול Operator מורשה תחת System Admin, כולל מסך
Tenant-specific, אימות גרסאות Connection ו־Policy, גזירת Actor וזמן
בשרת, שמירת Evidence אטומית והפעלת Kill switch שיורשת את ה־Snapshot
האחרון. ערכי Capacity חיים, מקור Retry evidence וראיות WABA נשארים
`unknown/unavailable` עד חיבור החשבון המורשה. ה־Meta sender נשאר חסום
בכוונה עד השלמת הראיות החיצוניות והתרגיל המבוקר.

4.3 לאחר השלמת כל 14 Slices — מדף הנחיתה וה־Auth ועד כל מסכי
ה־Workspace וה־System Admin — **לא נותרה עבודת לוקליזציה מקומית
ידועה** בשלוש השפות. ‏Package/Quota/Contact נשארו מחוץ למימוש מפני
שמודל המוצר טרם הוכרע, ולא מפני שחסר להם תרגום.
אם מאשרים את המודל המומלץ בסעיף 18 של מסמך ההחלטות, הטווח התכנוני
למימוש השדות והחוזים הנלווים הוא **6–12 שעות פיתוח נטו**.
הטווח אינו כולל המתנה לספקים, בדיקות Staging מורשות או זמן Adapter
חי שאינו ניתן לאומדן אמין לפני בחירת ספק וקבלת Credentials.
