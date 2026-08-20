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
זהות משתמש, Evidence ו־Database timestamps. בשלב זה היה קיים Port בלבד;
ליבת ה־Executor המקומית שנוספה אחריו מתועדת בסעיף 2.22.

2.22 **הושלם מקומית:** ליבת PostgreSQL ספק־נייטרלית ל־`contacts.save`.

2.22.1 ‏`PostgresTransactionManager` מקפיא חוזה של Connection אחד,
`BEGIN`, ‏`COMMIT` ו־`ROLLBACK`. בשלב זה Driver טרם נבחר; הבחירה והמימוש
שנוספו לאחר מכן מתועדים בסעיף 2.29.

2.22.2 ה־Executor תובע Receipt אטומי לפי Tenant, ‏Operation ומפתח
Idempotency. מתחרה על אותו מפתח ממתין דרך Unique conflict ואז נועל את
התוצאה ב־`FOR UPDATE`. Digest שונה מחזיר Conflict ו־Digest זהה מחזיר Replay.

2.22.3 Contact upsert, ‏Audit ללא PII והשלמת Receipt מבוצעים באותה
Transaction. ‏`IS DISTINCT FROM` מונע הגדלת Version כאשר הפרופיל לא השתנה.
תוצאה פגומה או Cross-tenant גורמת ל־Rollback ול־`unavailable`. ‏Replay JSON
שומר רק את תגובת ה־API הציבורית ואינו משכפל Tenant, ‏Evidence או timestamps
פנימיים.

2.22.4 נוסף Schema contract עבור `railway_api_mutation_receipts` ומסמך
`docs/postgresql-mutation-contract.md`. ספק, Schema parity מול 35 ה־Migrations
ו־Production evidence עדיין חסרים. Driver ובדיקת Concurrency מוגדרת שנוספו
לאחר מכן מתועדים בסעיף 2.29; אין טענה שה־Database adapter מוכן לפריסה.

2.23 **הושלם מקומית:** PostgreSQL Critical-path schema ו־Migration guard.

2.23.1 נוספו שתי Migrations מסודרות: `tenants`, ‏`audit_logs` ו־`contacts`
נוצרים לפני `railway_api_mutation_receipts`. המזהים הם Identity columns,
הזמנים הם `TIMESTAMPTZ` והשדות המובנים הם `JSONB`.

2.23.2 Audit idempotency מבודד לפי Tenant, פעולה ומפתח. Contact uniqueness
נשמר לפי Tenant ומספר E.164, וכל Lifecycle constraints הדרושים ל־Executor
נשארו Fail-closed.

2.23.3 נוסף Gate מקומי שמכשיל סדר קבצים שגוי, תחביר SQLite, Seed data,
פעולות הרסניות ויצירת מזהים אקראית. הוא צורף ל־Release Gate הקיים.

2.23.4 זהו Critical Path בלבד. בשלב זה הוא לא בחר Driver ולא הוכיח הרצה
מול PostgreSQL אמיתי; הראיות שנוספו אחר כך מתועדות בסעיף 2.29. המרה של מלוא
35 ה־Migrations עדיין חסרה.

2.24 **הושלם מקומית:** PostgreSQL Tenant access foundation.

2.24.1 Migration שלישית מוסיפה `tenant_memberships`, ‏`tenant_selections`
ו־`business_profiles`. ‏Composite Foreign Key קושר Selection ל־Membership
המדויק, ו־Trigger אוכף מעבר Version מדויק בשינוי Role או Status.

2.24.2 Membership repository ספק־נייטרלי משתמש ב־Parameters, מגביל תוצאה
ל־100 ונכשל סגור על Cross-user, ‏Cross-tenant או Row shape פגום.

2.24.3 Selection repository יוצר בחירה רק עבור Membership פעיל ו־Tenant
מורשה. כתיבה משתמשת ב־Expected version וב־Transaction; Replay נטען עם
`FOR UPDATE`, ‏Version מתקדם מחזיר Conflict והיעדר הרשאה מחזיר Rejected.

2.24.4 Business profile repository שומר את שם ה־Tenant ואת הפרופיל באותה
Transaction, משתמש ב־`IS DISTINCT FROM` ומאמת את הרשומה לפני Commit.

2.24.5 החוזה מתועד ב־`docs/postgresql-tenant-access-contract.md`. ‏Driver
ו־Database חי עבור המסלולים המוגדרים מתועדים בסעיף 2.29; ל־Tenant access
עצמו עדיין חסרים DML/Concurrency evidence, ‏Full schema parity ו־Staging.

2.25 **הושלם מקומית:** PostgreSQL Team membership mutation ledger.

2.25.1 Migration רביעית מוסיפה `tenant_membership_events` עם מפתחות פעולה
ו־Event דטרמיניסטיים, מעברי State/Version מוגבלים, Unique idempotency ו־Trigger
שחוסם Update/Delete. ‏Trigger נוסף דורש שה־Event יתאים למצב שכבר נשמר ומונע
הסרה של ה־Owner הפעיל האחרון.

2.25.2 Repository ספק־נייטרלי מבצע שינוי Role/Status והעברת Owner בתוך
`read-committed` Transaction. הוא נועל קודם את ה־Tenant, נועל את ה־Members,
מעדכן State וכותב Event; כשל Event מבטל את כל הפעולה.

2.25.3 Retry מדויק מוחזר כ־`unchanged`, ‏Expected version ישן מחזיר
`conflict`, מעבר Owner שאינו חוקי נחסם ותוצאה חוצה Tenant או Row shape פגום
נכשלות סגור.

2.25.4 הבדיקות המקומיות משתמשות ב־Transaction adapter דטרמיניסטי ומוכיחות
Commit/Rollback ברמת החוזה. שרשרת ה־Schema עברה על PostgreSQL מקומי. ‏Driver
ושני Races מוגדרים שנוספו אחר כך מתועדים בסעיף 2.29; יתר Repository integration
ו־Concurrency coverage עדיין חסרים ולכן אין טענה שהמסלול מוכן לפריסה.

2.26 **הושלם מקומית:** PostgreSQL Team invitation lifecycle schema.

2.26.1 Migration חמישית מוסיפה `team_invitations`,
`team_invitation_events`, ‏`team_invitation_deliveries` ו־
`team_invitation_acceptances` בסדר התלויות הנכון.

2.26.2 ‏16 Triggers מפורשים אוכפים זהות immutable, מעברי State/Version,
Event ו־Acceptance ledgers בלתי־ניתנים לשינוי, Delivery reconciliation,
חסימת שינוי בזמן מסירה פעילה ו־Expiration רק על ידי Actor מערכתי קבוע.

2.26.3 כל שרשרת חמש ה־Migrations הוחלה בהצלחה על PostgreSQL 16.13 מקומי
ומבודד. נוצרו 12 טבלאות, ובהן ארבע טבלאות ההזמנה, ללא שגיאת Syntax או
Dependency. הראיה מתועדת ב־
`docs/postgresql-team-invitation-contract.md`.

2.26.4 Repositories של Request/Transition/Expiration שנוספו לאחר ה־Schema
מתועדים בסעיף 2.27. ‏Node driver ותרחיש Acceptance מקביל שנוספו אחר כך
מתועדים בסעיף 2.29; עדיין חסרים Runtime integration, כיסוי מקביל מלא
ו־Staging evidence, ולכן אין טענה שמחזור החיים מוכן לפריסה.

2.27 **הושלם מקומית:** PostgreSQL Invitation request ו־expiration repositories.

2.27.1 Repository ספק־נייטרלי נועל Tenant ואז Invitation, מסווג Replay,
Conflict ו־Invalid transition, ושומר Request/Re-request או Revoke/Expiration
יחד עם Event immutable ו־Delivery outbox באותה `read-committed` Transaction.

2.27.2 Expiration repository נפרד מחזיר לכל היותר 50 הזמנות בסדר
`expiresAt + invitationKey`, משתמש ב־Cursor בלעדי ואינו מחזיר הזמנה שהתקבלה
או הזמנה אחרי Cutoff.

2.27.3 שבע בדיקות חוזה מוכיחות את מחזור החיים, Rollback, גבולות תוצאה
ו־Keyset pagination. כל 13 משפטי ה־SQL עברו `PREPARE` על PostgreSQL 16.13
מקומי לאחר החלת חמש ה־Migrations.

2.27.4 Delivery ו־Acceptance repositories שנוספו אחר כך מתועדים בסעיף 2.28.
Driver ו־DML/Concurrency מוגדרים שנוספו אחר כך מתועדים בסעיף 2.29. יתר
Integration ו־Concurrency, ‏Runtime ו־Staging עדיין חסרים; לכן המימוש אינו
מוכן לפריסה.

2.28 **הושלם מקומית:** PostgreSQL Invitation delivery ו־acceptance repositories.

2.28.1 Delivery repository תובע Pending delivery פעם אחת, מחזיר Prepared
invitation רק לאחר Claim, שומר Submitted/Blocked/Ambiguous ומאפשר
Reconciliation מ־Ambiguous ללא שליחה חוזרת.

2.28.2 Acceptance repository נועל Invitation, ‏Membership ו־Delivery בסדר
קבוע. הוא מבטל Pending delivery ושומר Version חדש, Membership פעיל ו־Acceptance
immutable באותה Transaction; Retry מדויק מוחזר כ־`unchanged`.

2.28.3 תשע בדיקות חדשות מכסות Provider acceptance, ‏Ambiguous reconciliation,
ביטול Delivery לא כשיר, קבלה כפולה, אימייל שגוי, חבר קיים ו־Rollback של כל
ארבע הישויות. יחד עם 4.2ב קיימות 16 בדיקות Invitation PostgreSQL.

2.28.4 כל 27 משפטי ה־Invitation SQL עברו `PREPARE` על PostgreSQL 16.13 לאחר
החלת חמש ה־Migrations. ‏Driver, ‏DML ושני תרחישי Concurrency שנוספו אחר כך
מתועדים בסעיף 2.29. עדיין חסרים כיסוי מלא ו־Staging evidence; לכן אין טענה
למוכנות פריסה.

2.29 **הושלם מקומית:** Node PostgreSQL driver ו־Integration rehearsal חוזר.

2.29.1 ‏`pg@8.23.0` ו־`@types/pg@8.21.0` ננעלו ב־Lockfile. ‏Adapter אחד
מחבר Pool לקריאות בודדות ומצמיד Client יחיד לכל Transaction מסוג
`read-committed`; כשל BEGIN/COMMIT/ROLLBACK משמיד את ה־Client במקום להחזירו
ל־Pool.

2.29.2 ‏7 בדיקות Adapter מכסות Query, ‏Commit, ‏Rollback, כשלי Transaction
control, תוצאה פגומה ותצורה לא חוקית. ‏3 בדיקות Harness מגבילות אותו ל־URL
Loopback ללא Password ול־Database הייעודי `connect_driver_integration`.

2.29.3 ‏`verify:node-postgres-integration` הוחל על PostgreSQL 16.13 נקי.
הוא החיל את חמש ה־Migrations, הוכיח Contact commit/replay/rollback,
Invitation delivery/acceptance ושני תרחישי Concurrency אמיתיים: Contact
Idempotency וקבלת Invitation יחידה. התוצאה הייתה `PASS (5 migrations,
2 concurrency scenarios)` והסביבה הזמנית נמחקה לאחר מכן.

2.29.4 עדיין חסרים ספק ותצורת Pool/TLS/Timeouts ל־Production, כלי Migration,
כיסוי DML/Concurrency ליתר ה־Repositories, ‏Parity מול כל 35 ה־Migrations,
Runtime composition ו־Staging evidence.

2.30 **הושלם מקומית:** חוזה Production Pool מאובטח ל־PostgreSQL.

2.30.1 כל 12 ערכי החיבור, Pool ו־Timeouts נדרשים במפורש. אין שימוש בברירות
המחדל של `pg`; מצב חסר, חלקי ולא חוקי נשמרים נפרדים בלי להחזיר את ערכי
ה־Environment.

2.30.2 ‏Staging/Production מחייבים `verify-full`. ‏TLS כבוי מותר רק
ב־Development/Test. ‏URL עם Query parameters, ‏Fragment או Loopback בסביבה
מרוחקת נחסם, כדי ש־`sslmode` מתוך URL לא ידרוס את אובייקט ה־TLS המאומת.

2.30.3 ‏Pool size, ‏Connection/Idle/Statement/Query/Lock/Idle-transaction
timeouts ו־Client lifetime מוגבלים לטווחים סגורים. ‏Application name מוגבל
לתווים בטוחים; Custom CA, אם קיים, עובר Parser של X.509.

2.30.4 ‏Idle-client error מפיק Signal ללא Error object. גם Configuration
מורחב או מזויף נבדק מחדש לפני יצירת Pool. ‏6 בדיקות מכסות Production,
Development, חסר/חלקי, TLS/URL זדוני, גבולות מספריים ו־Telemetry.

2.30.5 עדיין חסרים ערכי ספק אמיתיים, אישור Pool sizing, ‏CA/TLS evidence,
Telemetry sink, ‏Migration identity ו־Staging connection proof.

2.31 **הושלם מקומית:** PostgreSQL persistence foundation ל־Railway.

2.31.1 Composition יחיד יוצר מאותו Pool את כל 11 ה־Adapters שכבר קיימים:
Membership reads/mutations, ‏Tenant selection, ‏Business profile,
`contacts.save`, ‏`contacts.list`, ‏`reports.read` וכל ארבעת מסלולי
Invitation lifecycle.

2.31.2 ה־Foundation אינו מחזיר Pool, ‏Driver, ‏Query executor או Connection
string ל־Caller. הוא חושף רק Ports עסקיים ו־`close()` אידמפוטנטי. ‏Options
מורחבים, Telemetry חסר או Configuration חסר/חלקי/לא חוקי נחסמים לפני יצירה.

2.31.3 ה־Harness החוזר הופעל שוב על PostgreSQL 16.13 ריק דרך ה־Foundation
והחזיר `PASS (5 migrations, 2 concurrency scenarios)`. סביבת הבדיקה הזמנית
נעצרה ונמחקה לאחר מכן.

2.31.4 אין עדיין Full Railway API runtime על PostgreSQL: ‏`reports.read`
עדיין דורש Repository מקביל, ו־Hybrid שמערב D1 ו־PostgreSQL אינו מאושר.
גם Routes, ‏Live values ו־Staging evidence חסרים.

2.32 **הושלם מקומית:** PostgreSQL read path ל־`contacts.list`.

2.32.1 לוגיקת הרשימה הופרדה מ־Contact mutations ל־`createContactListService`,
בלי לשנות הרשאות, Cursor או מבנה תשובה. כך Railway יכול להשתמש באותו Use case
מבלי להזדקק ל־D1 consent mutation repository.

2.32.2 ‏`postgresContactReadRepository.ts` מסנן תמיד לפי Tenant, משתמש ב־
Keyset pagination יורד לפי `id`, מגביל עמוד ל־100 ומאמת במדויק את Row shape,
פרופיל, Consent, Timeline, ‏Tenant, Cursor וסדר לפני החזרת נתונים.

2.32.3 ה־Foundation כולל כעת עשרה Adapters ופורט עסקי `contacts`. ה־Harness
החוזר הופעל מול PostgreSQL 16.13 ריק והחזיר
`PASS (5 migrations, 2 concurrency scenarios)`, כולל יצירת שני Contacts
וקריאתם דרך `contacts.list`. סביבת הבדיקה הזמנית נעצרה ונמחקה.

2.32.4 ‏`reports.read` היה מסלול הקריאה הבא. ה־Adapter שלו מתועד בסעיף 2.33,
אך סכמת המקור עדיין חוסמת חיבור מלא. בנוסף נשארים Routes, ‏Live pool values,
Schema parity ו־Staging evidence; לכן אין עדיין טענת Cutover.

2.33 **הושלם מקומית ברמת Adapter:** PostgreSQL read path ל־`reports.read`.

2.33.1 ‏`postgresOperationalReportRepository.ts` מחשב Campaign, ‏Message,
Conversation, ‏Bot, ‏AI ו־AI usage בשאילתת PostgreSQL יחידה. כך כל המדדים
נקראים מאותו Statement snapshot ולא משישה רגעים שונים.

2.33.2 ה־Adapter מסנן כל CTE לפי Tenant וחלון זמן, מחזיר Counts כמחרוזות כדי
למנוע איבוד דיוק ב־`bigint`, ומאמת בדיוק 35 שדות, סכומי קטגוריות, מטבעות
מסודרים ומספרים בטווח JavaScript בטוח. ארבע בדיקות שליליות/חיוביות עברו.

2.33.3 ה־Foundation חושף כעת Port עסקי `reports` ומחבר 11 Adapters לאותו
Pool. ‏Conversations ו־Messages הומרו בסעיף 2.34; ארבע טבלאות המקור האחרות
עדיין חסרות ולכן לא נרשמה עדיין ראיית Database מלאה עבור הדוח, וה־Cutover
נשאר חסום במפורש.

2.34 **הושלם מקומית:** PostgreSQL Conversations ו־Messages schema.

2.34.1 Migration מספר `0005_conversations_messages.sql` ממיר את שתי טבלאות
המקור הראשונות של הדוח עם Tenant/Contact foreign keys, זהויות Deterministic,
מצבי Conversation/Message סגורים, התאמת Direction ל־Status, התאמת Content,
ציר זמן במילישניות ו־Unique constraints לכל Tenant.

2.34.2 נוספו Indexes ייעודיים ל־Tenant + activity time ול־Tenant + message
time, כדי ששאילתת הדוח לא תיאלץ לסרוק Tenant אחר. ה־Migration guard מכסה כעת
שש Migrations ו־14 טבלאות בסדר תלות קבוע.

2.34.3 ה־Harness החוזר החיל את כל שש ה־Migrations על PostgreSQL 16.13 ריק,
יצר Conversation ו־Message תקינים, קישר את ההודעה האחרונה וחסם Outbound
Message במצב `received` עם Constraint violation. התוצאה הייתה
`PASS (6 migrations, 2 concurrency scenarios)`. סביבת הבדיקה נעצרה ונמחקה.

2.34.4 לדוח מלא עדיין חסרות ארבע טבלאות מקור: `campaigns`,
`bot_reply_deliveries`, ‏`ai_runtime_audit_events` ו־`ai_runtime_usage`, יחד
עם טבלאות התלות שלהן. אין לחבר את Route הדוחות לפני השלמתן.

2.35 **הושלם מקומית:** PostgreSQL Message templates ו־Campaigns schema.

2.35.1 Migration מספר `0006_message_templates_campaigns.sql` ממיר את מצב
הסכמה הסופי של Templates, כולל Submission lifecycle ו־Status evidence,
ואת Campaigns עם Tenant+Template foreign key, ‏JSONB snapshots, ‏Delivery
mode, ‏Schedule, מכסת נמענים וזהויות Deterministic.

2.35.2 נוספו Constraints למעברי Template, זוגות Status event, תזמוני
Campaign, ‏JSONB bounded ו־Tenant isolation. ‏Index `tenant_id + created_at`
משרת ישירות את Aggregate הדוחות. ה־Guard מכסה כעת שבע Migrations ו־16 טבלאות.

2.35.3 ה־Harness החיל את שבע ה־Migrations על PostgreSQL 16.13 ריק, יצר
Template ו־Campaign תקינים, קרא את הקשר ביניהם וחסם Campaign מתוזמן ללא
`scheduled_at`. התוצאה: `PASS (7 migrations, 2 concurrency scenarios)`.
סביבת הבדיקה הזמנית נעצרה ונמחקה.

2.35.4 לדוח מלא נותרו שלוש טבלאות מקור: `bot_reply_deliveries`,
`ai_runtime_audit_events` ו־`ai_runtime_usage`, יחד עם טבלאות התלות שלהן.

2.36 **הושלם מקומית:** PostgreSQL Bot flows ו־Reply deliveries schema.

2.36.1 Migration מספר `0007_bot_flows_deliveries.sql` ממיר Bot flows,
גרסאות Immutable ו־Delivery state machine. הוא מקשר Delivery לאותו Tenant,
Conversation, Inbound message ולצמד Flow+Version המדויק.

2.36.2 Constraints אוכפים Draft/Published lifecycle, גרסה Published יחידה,
זהויות Deterministic, ‏JSONB bounded ואת חמשת מצבי Delivery עם השילוב המדויק
של Attempt, Provider ID, Error ו־Accepted timestamp. ה־Guard מכסה שמונה
Migrations ו־19 טבלאות.

2.36.3 ה־Harness החיל את שמונה ה־Migrations על PostgreSQL 16.13 ריק, יצר
Flow, Version ו־Pending delivery מקושרים, וקיבל Constraint violation כשניסה
להגדיל Attempt בלי להעביר את מצב ה־Delivery. התוצאה:
`PASS (8 migrations, 2 concurrency scenarios)`. סביבת הבדיקה נעצרה ונמחקה.

2.36.4 לדוח מלא נותרו רק `ai_runtime_audit_events` ו־`ai_runtime_usage`,
יחד עם טבלאות התלות `ai_agents`, ‏`ai_agent_versions` ו־
`ai_runtime_cost_authorizations`.

2.37 **הושלם מקומית:** PostgreSQL AI reporting schema ודוח תפעולי מלא.

2.37.1 Migration מספר `0008_ai_reporting.sql` מוסיף את חמש טבלאות ה־AI:
Agents, גרסאות Immutable, הרשאות עלות, Usage ו־Audit events. הוא משתמש
ב־`JSONB`, ‏`DATE`, ‏`BIGINT`, ‏`BOOLEAN` ו־`TIMESTAMPTZ` ומקשר כל רשומה
ל־Tenant, ל־Agent ולגרסה המדויקת שלה.

2.37.2 Constraints אוכפים זהויות דטרמיניסטיות, Lifecycle של Agent וגרסה,
חודש ומטבע תקינים, מספרי Tokens ועלות בטווח JavaScript בטוח, וכן התאמה בין
`reply-planned` לבין Handoff מנומק. Indexes לפי Tenant וזמן משרתים את שני
Aggregates של AI בדוח. ה־Guard מכסה תשע Migrations ו־24 טבלאות.

2.37.3 ה־Harness החיל את תשע ה־Migrations על PostgreSQL 16.13 ריק, יצר את
כל שרשרת ה־AI, חסם מעבר Handoff ללא Reason, וקרא דרך ה־Foundation דוח מלא
המכיל Campaign, Message, Conversation, Bot, ‏AI ו־AI usage. התוצאה:
`PASS (9 migrations, 2 concurrency scenarios)`. סביבת הבדיקה נעצרה ונמחקה.

2.37.4 מסלול `reports.read` הושלם מקומית ואינו עוד חסם Schema. המסלול
המקומי הקריטי שנותר הוא Runtime composition ל־Routes בפועל, יתר ה־Mutations,
Parity מול כל 35 ה־Migrations והקשחת הוכחות הפריסה. בחירת ספק, ערכי Pool חיים
ו־Staging נשארים עבודה חיצונית.

2.38 **הושלם מקומית:** PostgreSQL API runtime composition ומסלול HTTP מלא.

2.38.1 ‏`railwayPostgresApiRuntime.ts` מחבר PostgreSQL Foundation יחיד אל
גבול הזהות והפעולות. הוא חושף רק Handler ו־`close`, דוחה Options מורחבים,
ושומר את Environment הזהות נפרד מ־Environment מסד הנתונים.

2.38.2 אם בניית Identity adapters נכשלת לאחר יצירת ה־Foundation, ה־Factory
סוגר את ה־Pool לפני החזרת השגיאה. פעולת הסגירה Idempotent ואינה חושפת Pool,
Connection string או Credentials.

2.38.3 ה־Harness החוזר הוסיף Membership אמיתי וביצע `reports.read` דרך
בקשת HTTP מלאה: Vercel OIDC, ‏Clerk session, ‏Tenant resolution, ‏Permission
ו־PostgreSQL. כל ששת מקורות הדוח הוחזרו ותגובה ללא Tenant/User internals
אומתה. תוצאת מסד הנתונים נשארה
`PASS (9 migrations, 2 concurrency scenarios)`.

2.38.4 בשלב זה נותר מקומית Node HTTP entrypoint עם Route קשיח, Health endpoints,
Graceful shutdown ו־Contract tests לתהליך. לאחריו יישארו בעיקר הרחבת
Operations/Parity וחסמי Environment חיצוניים.

2.39 **הושלם מקומית:** Node HTTP adapter, ‏PostgreSQL readiness ו־Service
lifecycle.

2.39.1 ‏`postgresReadinessProbe.ts` מריץ שאילתת `SELECT 1` קבועה ללא קלט,
מקבל רק שורה ושדה מדויקים ונכשל סגור ל־`unavailable` בלי לחשוף Error.
ה־Harness אימת את ה־Probe מול PostgreSQL 16.13 אמיתי כחלק מתוצאת
`PASS (9 migrations, 2 concurrency scenarios)`.

2.39.2 ‏`railwayNodeHttpServer.ts` מקבל רק Origin-form request targets,
משתמש ב־Origin פנימי קבוע במקום לסמוך על Host, ומנתב רק `health/live`,
‏`health/ready` ו־`/v1/connect`. ‏Headers מוגבלים ל־16KB, מספר Headers ל־64,
מספר בקשות לחיבור ל־100 ו־Timeouts מפורשים. תגובות Health אינן נשמרות ב־Cache.

2.39.3 ‏`railwayNodeService.ts` הוא בעל החיים של Listener ושל PostgreSQL
runtime. הוא מפעיל פעם אחת, עוצר HTTP לפני סגירת Pool, מנסה את שתי הסגירות
גם בכשל ומחזיר רק קוד כשל תחום. כל Start/Close/Failure contracts נבדקו.

2.39.4 בשלב זה נותר מקומית לחבר Startup executable אל `PORT` ואל Process signals.
החיבור ל־Mutation rate limiter מבוזר אינו מקומי בלבד ותלוי בהחלטת Provider
וב־Credentials; אין להפעיל `contacts.save` ללא Adapter כזה. לאחר מכן יישארו
הרחבת Operations ו־Parity מול יתר ה־D1 schema.

2.40 **הושלם מקומית:** Railway process configuration ו־Signal lifecycle.

2.40.1 ‏`railwayNodeProcess.ts` מקבל רק `PORT` קנוני בטווח 1–65535 ודוחה
אפס, Leading zero, חריגה ושדה Environment נוסף. הוא אינו מאפשר ללקוח לבחור
Host; ה־Listener נשאר על `0.0.0.0` מתוך קוד השרת בלבד.

2.40.2 ‏`SIGINT` ו־`SIGTERM` נרשמים רק אחרי Start מוצלח ומוסרים לפני
Shutdown. שני Signals משתמשים באותו Close Idempotent. כשל חלקי ברישום Signal
מסיר Listener שכבר נרשם, סוגר את השירות ומחזיר קוד `start-failed` תחום.

2.40.3 לא נוצר Bootstrap executable לא בטוח. כדי להרכיב Runtime מלא נדרש
`mutationRateLimit` מבוזר אמיתי; Stub מקומי שיחזיר תמיד `allowed` יהפוך את
`contacts.save` למסלול Production ללא הגנה משותפת ולכן אסור. זהו כעת חסם
Provider/Environment, לא חוסר ב־Node process lifecycle.

2.41 **הושלם מקומית:** PostgreSQL schema לארגון אנשי קשר ולייבוא מתחדש.

2.41.1 ‏Migration מספר `0009_contact_organization_imports.sql` מוסיף Tags,
Lists, שיוכים, Import jobs ו־Import row outcomes. ה־Guard מכסה כעת עשר
Migrations ו־30 טבלאות לפי סדר דטרמיניסטי, ללא Seed, מחיקה או זהות אקראית.

2.41.2 כל קשר בין Contact, ‏Tag, ‏List, ‏Import job ו־Import row כולל
`tenant_id` בתוך ה־Foreign Key. לכן מזהה תקין מעסק אחר אינו יכול להיכנס
לשיוך או לייבוא של העסק הנוכחי. מונים, מצב השלמה, סוגי Outcome, סיבות דחייה,
מפתחות SHA-256, שמות קבצים וטווחי שורות נאכפים גם ברמת PostgreSQL.

2.41.3 ה־Harness החיל את כל עשר ה־Migrations על PostgreSQL 16.13 ריק, יצר
Tag, ‏List, שני שיוכים ו־Import שהושלם עם שורה שנוצרה ושורה שנדחתה. ניסיון
לסמן Job לא עקבי נכשל ב־`23514`, ושני ניסיונות Cross-tenant נכשלו ב־`23503`.
התוצאה: `PASS (10 migrations, 2 concurrency scenarios)`. סביבת הבדיקה
הזמנית נעצרה ונמחקה.

2.41.4 בשלב זה ה־Schema היה מוכן אך עדיין לא מחובר ל־Railway operations.
Adapter ארגון אנשי הקשר הושלם בסעיף 2.42; השלב המקומי הבא הוא
`contactImportRepository`, כולל Atomic import row write ו־Job refresh.

2.42 **הושלם מקומית:** PostgreSQL Contact organization adapter.

2.42.1 ‏`postgresContactOrganizationRepository.ts` מממש Upsert של Tag/List,
קריאת Counts ושיוכים, והוספה/הסרה Idempotent. כל Query מסונן לפי Tenant;
רשימת Contact IDs מוגבלת ל־50 ומייצרת רק Placeholders מספריים מתוך אורך
שאומת, ללא הכנסת קלט לתוך SQL.

2.42.2 כתיבת שיוך משתמשת ב־Data-modifying CTE יחיד: היא מוכיחה תחילה ש־
Contact וה־Group נמצאים באותו Tenant, מבצעת Insert/Delete ומחזירה רק `found`
בוליאני. Target חסר ממופה לאותה שגיאת Domain של D1; Row shape, Scope, סדר,
כפילויות ומונים חריגים נכשלים סגור.

2.42.3 ה־Adapter מחובר ל־Contact organization service מתוך Foundation אחד,
שמכיל כעת 12 Adapters. שבע בדיקות יחידה חדשות עברו, וה־Harness הפעיל בפועל
Create tag/list ושני שיוכים דרך Session, ‏RBAC, ‏Service ו־Repository מול
PostgreSQL 16.13. התוצאה נשארה
`PASS (10 migrations, 2 concurrency scenarios)`. סביבת הבדיקה נעצרה ונמחקה.

2.42.4 נותרה באותו Feature המרת `contactImportRepository` ל־PostgreSQL.
אין לחבר Import Route ל־Railway לפני שה־Contact upsert וכתיבת Row outcome
מתבצעים באותה Transaction וש־Job counters נטענים מחדש מאותו Tenant. דרישה
זו הושלמה לאחר מכן בסעיף 2.43.

2.43 **הושלם מקומית:** PostgreSQL Contact import adapter אטומי.

2.43.1 ‏`postgresContactImportRepository.ts` מממש פתיחת Job, נעילת Job,
כתיבת תוצאות `accepted`/`rejected`/`duplicate`, טעינת Job ורענון מונים. פתיחת
Job חוזרת בטוחה תחת Race, וטווח Source rows מוגבל לשורות 2–50001.

2.43.2 Contact profile ותוצאת Import מאושרת נכתבים באותה Transaction.
ה־Status בפועל — `created`, ‏`updated` או `unchanged` — נגזר מהמצב הנעול
ב־PostgreSQL ולא מרמז שסיפק ה־Caller. Replay זהה הוא Idempotent; Evidence
שונה לאותה שורה נכשל סגור. כל תוצאה נבדקת מחדש מול Tenant, ‏Job, ‏Row,
Contact וטלפון קנוני.

2.43.3 ‏`postgresContactReadRepository.ts` מספק כעת גם חיפוש Contact לפי
טלפון קנוני בתוך Tenant, וה־Foundation מחבר 13 Adapters וחושף
`contactImports` דרך אותו Service, ‏Session ו־RBAC.

2.43.4 שמונה בדיקות Adapter ושתי בדיקות Contact lookup חדשות עברו. ה־Harness
הפעיל Import מלא דרך Service מול PostgreSQL 16.13 ובדק גם שתי בקשות מקבילות
לאותו Chunk. נוצרו Contact יחיד ותוצאת Import יחידה, ושני ה־Callers קיבלו
תוצאה עקבית. התוצאה: `PASS (10 migrations, 3 concurrency scenarios)`.
סביבת הבדיקה הזמנית נעצרה ונמחקה.

2.44 **הושלם מקומית:** PostgreSQL Meta connection, Webhook receipts ו־
Credential envelopes.

2.44.1 ‏`0010_meta_connection_credentials.sql` מוסיף שלוש טבלאות. ‏Meta
connection מבודד לפי Tenant ומחזיק WABA ו־Phone number גלובליים ייחודיים;
Webhook receipt קשור ב־Foreign Key מורכב לאותו Tenant ול־WABA. ‏Lifecycle,
גרסאות, SHA-256, Error code וזמנים במילישניות נאכפים במסד.

2.44.2 ‏`postgresMetaRepository.ts` מממש קריאות Connection, ‏Asset snapshot,
מעברי מצב ו־Webhook claim/complete/fail. ‏Asset snapshot ומעבר מצב נכתבים
ונקראים חזרה באותה Transaction. ‏Webhook claim משתמש ב־`ON CONFLICT` אטומי;
Replay זהה אינו מעובד שוב ו־WABA/Object סותרים לאותו Event key נכשלים סגור.

2.44.3 ‏`postgresMetaCredentialRepository.ts` שומר רק `keyVersion`, ‏IV ו־
Ciphertext מוצפן; אין שדה Access token או Payload גלוי. Row shape, ‏Base64,
Tenant ותוצאת Upsert נבדקים לפני החזרה. ה־Foundation כולל כעת 15 Adapters
וחושף Meta connection service, ‏Webhook port ו־Encrypted-envelope port בלי
ליצור Vault ללא מפתח Environment אמיתי.

2.44.4 שתים־עשרה בדיקות Repository חדשות עברו. ה־Harness הפעיל חיבור Meta,
Credential envelope ושתי תביעות Webhook מקבילות מול PostgreSQL 16.13. נוצר
Receipt יחיד, אחת התביעות אושרה והשנייה סווגה Duplicate; Replay לאחר Completion
לא הופעל שוב ו־Evidence סותר נדחה. התוצאה:
`PASS (11 migrations, 4 concurrency scenarios)`. סביבת הבדיקה נעצרה ונמחקה.

2.45 **הושלם מקומית:** PostgreSQL WhatsApp delivery policy מאומת ואטומי.

2.45.1 ‏`0011_whatsapp_delivery_policy.sql` מוסיף Ledger בלתי־ניתן לשינוי
של החלטות השליחה. כל Event קשור לגרסה המדויקת של חיבור Meta, מתקדם בגרסה
עוקבת בלבד, ומאפשר `enabled` רק כשהחיבור פעיל וה־Evidence עדיין בתוקף.

2.45.2 מעבר `disabled` משמש Kill switch: הוא חייב לרשת בדיוק את Snapshot
המכסה הקודם ואינו יכול לשנות מכסה תוך כדי עצירה. Trigger נועל את שורת חיבור
Meta, ו־Trigger נוסף כותב Audit באותה Transaction. ‏Update ו־Delete נדחים.

2.45.3 ‏`postgresWhatsappCampaignDeliveryPolicyRepository.ts` מבצע נעילת
`FOR UPDATE`, מזהה Replay באמצעות Event key דטרמיניסטי, מחזיר Conflict על
גרסה ישנה ומאמת מחדש כל Row ו־Tenant. ה־Foundation כולל כעת 16 Adapters
וחושף את ה־Policy repository בלי לחבר עדיין Sender חי.

2.45.4 שמונה בדיקות Repository וארבע בדיקות Contract/Composition רלוונטיות
עברו. ה־Harness הריץ שתי בקשות Policy זהות במקביל מול PostgreSQL 16.13:
נוצר Event יחיד, והשנייה הוחזרה כ־Replay. הוכחו גם Audit אטומי, Kill switch
ו־Immutability. התוצאה: `PASS (12 migrations, 5 concurrency scenarios)`.
סביבת הבדיקה הזמנית נעצרה ונמחקה.

2.46 **הושלם מקומית:** PostgreSQL WhatsApp rate-limit ledger אטומי.

2.46.1 ‏`0012_whatsapp_rate_limit_ledger.sql` מוסיף Reservation, ‏Pair state,
Portfolio-recipient state, ‏Settlement ו־Provider cooldown event/state ללא
מספר טלפון או מזהה Meta גלוי. המפתחות הם HMAC אטומים קיימים.

2.46.2 ‏Transaction-scoped advisory locks מסדרים בקשות לפי Pair ו־Portfolio
לפני בדיקת חלון שש השניות, נמען פעיל, Cooldown ומכסת נמענים ייחודיים ב־24
שעות. Trigger חוזר על בדיקות הבטיחות כדי שגם כתיבה שעוקפת Repository תיכשל.

2.46.3 ‏`postgresWhatsappRateLimitRepository.ts` מחזיר תוצאות תחומות עבור
Replay, ‏Pair limit, ‏Recipient in-flight, ‏Portfolio limit ו־Provider
cooldown. ‏Settlement ו־Cooldown נכתבים באותה Transaction; אירוע חסר הוכחת
`provider-failed` נדחה. ה־Foundation כולל כעת 17 Adapters.

2.46.4 שמונה בדיקות Repository ושתי בדיקות Contract/Composition חדשות עברו.
ה־Harness הוכיח Race של שתי Reservations זהות, שחרור לפני Submit, חסימת Pair,
Cooldown, חסימת ניסיון חדש ודחיית State מזויף. התוצאה:
`PASS (13 migrations, 6 concurrency scenarios)`. סביבת הבדיקה הזמנית נעצרה
ונמחקה. עדיין חסרים Provider throughput limiter, ‏Queue worker ו־Load test.

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

4.4 ‏Provider Throughput Limiter המקומי הושלם. ‏Policy חדש מחייב
Phone throughput רשמי של `20/80/1000` ותקרת Outbound נמוכה ממנו;
Legacy Policy נכשל סגור אך נשאר ניתן להשבתה. ‏D1 ו־PostgreSQL אוכפים
חלון מתגלגל של שנייה לפני פנייה ל־Meta, ו־PostgreSQL מגן גם על כתיבה
ישירה באמצעות Trigger ו־Advisory lock. מסך System Admin, החוזה המשותף,
ה־Registry והבדיקות משתמשים באותה Evidence. בדיקת PostgreSQL 16.13
זמנית עברה עם `PASS (14 migrations, 7 concurrency scenarios)`; השרת
הזמני נעצר והתיקייה נמחקה. ערך החשבון החי, Queue worker, ‏Sender חי
ו־Load evidence נשארים חסומים עד Credentials ואישור חיצוני של טל.

4.5 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **86–188 שעות פיתוח
נטו**. הטווח אינו כולל המתנה לחשבונות, אישורי Meta, פריסת Staging או
חלון Pilot; הוא יתעדכן לאחר כל Slice שנבדק ונדחף.

4.6 ‏Railway Worker scheduler lease המקומי הושלם. מיגרציה `0014` מוסיפה
Claim אטומי לכל Tick של דקה, Lease שפג ו־Fencing token עולה. שני Workers
מתחרים אינם יכולים לקבל אותו Tick, ו־Worker ישן אינו יכול להשלים לאחר
השתלטות. ה־Orchestrator מריץ יחד את Campaign scheduler ואת Team invitation
expiration scheduler, ממתין לשניהם ומבצע Catch-up של עד חמישה Ticks בלבד.
בדיקת PostgreSQL 16.13 זמנית עברה עם
`PASS (15 migrations, 9 concurrency scenarios)`; השרת נעצר והתיקייה נמחקה.
חיבור Timer תמידי, ‏Redis/BullMQ ו־Queue adapters חיים עדיין חסרים.

4.7 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **82–182 שעות פיתוח
נטו**. הירידה משקפת את השלמת ה־Lease וה־Catch-up בלבד; היא אינה מניחה שספק
Queue, ‏Credentials או סביבת Railway כבר קיימים.

4.8 ‏Railway Always-on Worker timer ו־Process lifecycle הושלמו מקומית.
השירות מתזמן ריצה מיידית, מתיישר מחדש לגבול הדקה אחרי כל ריצה, אינו משתמש
ב־`setInterval`, מדכא callback חופף וממשיך לאחר כשל Tick באמצעות Signal
תחום בלבד. בסגירה הוא מבטל Timer ממתין, מחכה לריצה פעילה ורק אז סוגר את
PostgreSQL runtime. ‏`SIGINT` ו־`SIGTERM` משתמשים באותו מסלול סגירה
אידמפוטנטי. עדיין חסרים Composition למשימות Campaign על PostgreSQL,
‏Redis/BullMQ ו־Queue adapters חיים.

4.9 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **78–174 שעות פיתוח
נטו**. הטווח אינו כולל המתנה לבחירת ספק Queue, ‏Credentials, ‏Railway
Environment או בדיקות Staging.

4.10 ‏PostgreSQL Campaign dispatch ו־Railway Worker composition הושלמו
מקומית. מיגרציה `0015` מוסיפה `campaign_recipients` עם Tenant-bound foreign
keys, ‏JSONB bounded, זהויות דטרמיניסטיות ואינדקסי Dispatch. ה־Repository
מממש Activation, ‏Promotion, ‏Claim, ‏Consent revalidation, ‏Retry,
Release ו־Completion. בחירת Campaigns ונמענים משתמשת ב־
`FOR UPDATE SKIP LOCKED`, ומעברי Delivery הם אטומיים.

4.10.1 ‏Harness זמני על PostgreSQL 16.13 נקי עבר עם
`PASS (16 migrations, 13 concurrency scenarios)`. הוא הוכיח Activation
יחיד, Promotion יחיד, Claims שונים, Prepare יחיד, Retry, משיכת Consent
ו־Completion. השרת הזמני נעצר והתיקייה נמחקה.

4.10.2 ‏`railwayWorkerRuntime.ts` מחבר את Campaign scheduler ואת Team
invitation expiration scheduler לאותו Lease. ‏`railwayPostgresWorkerService.ts`
מחבר אותם לאותו Pool, ל־Timer ולמסלול הסגירה. ‏Queue adapter אמיתי,
Executable bootstrap, ערכי Railway ו־Load evidence עדיין חסרים.

4.11 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **68–158 שעות פיתוח
נטו**. הירידה משקפת את השלמת Schema, ‏Repository, ארבעה תרחישי Concurrency
נוספים ו־Worker composition. הטווח אינו כולל המתנה לבחירת Queue provider,
Credentials, ‏Railway environment או Staging/Pilot.

4.12 ‏PostgreSQL Campaign snapshot persistence הושלם מקומית.
`postgresCampaignRepository.ts` שומר Campaign ואת כל Recipient snapshots
ב־Transaction אחת, מאמת Template מאושר וזהה, Contact version ו־Consent חי,
ומבצע Replay רק לאחר השוואה מלאה של כל השדות וכל הנמענים. קונפליקט בעל אותו
Campaign key ואותו Recipient count אך תוכן אחר נכשל סגור. ה־Repository מחובר
ל־`railwayPostgresFoundation.ts`, שמכיל כעת 20 Adapters.

4.12.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (16 migrations, 14 concurrency scenarios)`. הוא הוכיח שתי כתיבות
Snapshot מקבילות וזהות, רשומה יחידה, קריאה מבודדת Tenant והמשך מחזור
Activation, ‏Promotion, ‏Claim, ‏Retry, משיכת Consent ו־Completion. שרת
PostgreSQL הזמני נעצר והתיקייה נמחקה לאחר האימות.

4.13 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **60–144 שעות פיתוח
נטו**. הירידה משקפת את Repository ה־Snapshot, בדיקות Conflict/Rollback
ותרחיש Concurrency אמיתי נוסף. הטווח אינו כולל המתנה לבחירת ספקים,
Credentials, ‏Railway environment, ‏Staging או Pilot.

4.14 ‏PostgreSQL Message Template lifecycle הושלם מקומית.
`postgresMessageTemplateRepository.ts` מממש Draft insert/update/replay,
קריאה לפי Key ו־Meta ID, רשימת Tenant, ‏Submission claim/complete/release
והחלת Status events. שתי זהויות Unique מטופלות בלי Race; אירועים ננעלים
ומסווגים ל־Applied, ‏Duplicate, ‏Stale, ‏Not-found או Identity conflict.
ה־Repository מחובר ל־`railwayPostgresFoundation.ts`, שמכיל כעת 21 Adapters.

4.14.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (16 migrations, 17 concurrency scenarios)`. הוא הוכיח שני Draft
writes מקבילים, Submission claim יחיד, ‏Status event יחיד לצד Duplicate,
Template מאושר וצריכתו המיידית ב־Campaign snapshot וב־Dispatch המלא. שרת
PostgreSQL הזמני נעצר והתיקייה נמחקה לאחר האימות.

4.15 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **48–120 שעות פיתוח
נטו**. הירידה משקפת את השלמת כל חוזה Message Template ושלושה תרחישי
Concurrency אמיתיים. הטווח אינו כולל המתנה לבחירת ספקים, Credentials,
Railway environment, ‏Staging או Pilot.

4.16 ‏PostgreSQL Conversation/Message lifecycle הושלם מקומית.
`postgresConversationRepository.ts` מממש Contact resolution, קליטת הודעה
נכנסת אטומית, Replay/Identity conflict, קריאות Inbox והיסטוריית הודעות,
Mark-read, ‏Assignment ועדכוני Delivery status. כל הקריאות מבודדות Tenant;
הכתיבות משתמשות ב־Transaction, ‏Optimistic version ובנעילת שורה לפי הצורך.
ה־Repository מחובר ל־`railwayPostgresFoundation.ts`, שמכיל כעת 22 Adapters.

4.16.1 ‏Harness נקי על PostgreSQL 16 עבר עם
`PASS (16 migrations, 22 concurrency scenarios)`. הוא הוכיח Contact upsert
מקביל יחיד, שתי קליטות Inbound זהות עם הגדלת Unread יחידה, זוכה יחיד ב־
Mark-read וב־Assignment, וכן Delivery event יחיד לצד Duplicate ו־Stale.
שרת PostgreSQL הזמני נעצר והתיקייה נמחקה לאחר האימות.

4.17 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **32–88 שעות פיתוח
נטו**. הירידה משקפת את השלמת כל חוזה Conversation/Message וחמישה תרחישי
Concurrency אמיתיים. הטווח אינו כולל המתנה לבחירת ספקים, Credentials,
Railway environment, ‏Staging או Pilot.

4.18 ‏PostgreSQL Bot Flow ו־Reply Delivery lifecycle הושלם מקומית.
`postgresBotFlowRepository.ts` מממש Draft creation/versioning, קריאות,
Publication replacement ו־Replay אטומי. ‏`postgresBotReplyDeliveryRepository.ts`
מממש Stage, ‏Claim והמעברים Accepted/Rejected/Ambiguous, עם בדיקה שהודעת
Inbound שייכת לאותה Conversation ולגרסת Flow התואמת. שני ה־Repositories
מחוברים ל־`railwayPostgresFoundation.ts`, שמכיל כעת 24 Adapters.

4.18.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (16 migrations, 27 concurrency scenarios)`. הוא הוכיח Flow create,
Publish ו־Version append מקבילים, Reply stage יחיד ו־Delivery claim יחיד.
שרת PostgreSQL הזמני נעצר והתיקייה נמחקה לאחר האימות.

4.19 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **16–56 שעות פיתוח
נטו**. הירידה משקפת שני Repositories מלאים וחמישה תרחישי Concurrency
אמיתיים. הטווח אינו כולל המתנה לבחירת ספקים, Credentials, ‏Railway
environment, ‏Staging או Pilot.

4.20 ‏PostgreSQL Knowledge Source ו־Passage lifecycle הושלם מקומית.
Migration מספר `0016_ai_knowledge.sql` מוסיף את טבלאות המקור, המקטעים וקישור
המקורות לגרסאות AI. ‏`postgresKnowledgeSourceRepository.ts` מממש רישום,
קריאות ומעברי מצב תחת נעילה. ‏`postgresKnowledgePassageRepository.ts`
מבצע אימות SHA-256, כתיבת כל המקטעים וסימון Ready באותה Transaction. שני
ה־Repositories מחוברים ל־`railwayPostgresFoundation.ts`, שמכיל כעת 26
Adapters.

4.20.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (17 migrations, 32 concurrency scenarios)`. הוא הוכיח Registration,
Validation, ‏Scanning, ‏Recovery ו־Passage processing מקבילים, Replay מדויק,
Tenant isolation ו־Rollback כאשר מספר המקטעים שנשמר אינו מלא. השרת הזמני
נעצר והתיקייה נמחקה לאחר האימות.

4.21 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **8–32 שעות פיתוח נטו**.
הירידה משקפת Migration אחת, שני Repositories וחמישה תרחישי Concurrency
אמיתיים. הטווח אינו כולל המתנה לבחירת ספקים, Credentials, ‏Railway
environment, ‏Staging או Pilot.

4.22 ‏PostgreSQL AI Agent lifecycle הושלם מקומית.
`postgresAiAgentRepository.ts` מממש Draft creation, היסטוריית Version
בלתי־משתנה, קישורי Knowledge Source מדויקים ו־Publication replacement.
כל שינוי נועל את ה־Agent, מאמת את המקורות באותו Tenant ושומר Version
וקישורים לפני עדכון המצביע. ה־Repository מחובר ל־
`railwayPostgresFoundation.ts`, שמכיל כעת 27 Adapters.

4.22.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (17 migrations, 36 concurrency scenarios)`. הוא הוכיח Create,
Publish, ‏Version append ו־Publication replacement תחת בקשות מקבילות,
כולל Archive לגרסה הקודמת ושני קישורי מקור מדויקים. השרת הזמני נעצר
והתיקייה נמחקה לאחר האימות.

4.23 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **4–16 שעות פיתוח נטו**.
הירידה משקפת Repository מלא וארבעה תרחישי Concurrency אמיתיים. הטווח אינו
כולל החלטות ספקים, Credentials, ‏Railway environment, ‏Staging או Pilot.

4.24 ‏PostgreSQL AI Runtime persistence הושלם מקומית.
`postgresAiRuntimeRepository.ts` מממש Cost authorization, רישום Usage,
Audit ו־Handoff. כל פעולת עלות נועלת את ה־AI Agent המשותף לפני חישוב
ההוצאה החודשית, כך שבקשות שונות אינן יכולות לעקוף זו את זו. Audit נועל את
השיחה ומבצע את שינוי ה־Handoff באותה Transaction. ‏Replay זהה מוחזר באופן
Idempotent, בעוד Payload סותר או שורת PostgreSQL לא תקינה נכשלים סגור.
ה־Repository מחובר ל־`railwayPostgresFoundation.ts`, שמכיל כעת 28 Adapters.

4.24.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (17 migrations, 40 concurrency scenarios)`. הוא הוכיח Cost
authorization ו־Usage replay מקבילים, שתי הוצאות שונות המתחרות על אותו
תקציב חודשי, ו־Handoff מקביל יחיד עם תוצאה עקבית לשני ה־Callers. השרת
הזמני נעצר והתיקייה נמחקה לאחר האימות.

4.25 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **2–10 שעות פיתוח נטו**.
הטווח מיועד להשלמת Adapters מקומיים שנותרו ולסנכרון חוזי השחרור; הוא אינו
כולל החלטות ספקים, Credentials, ‏Railway environment, ‏Staging או Pilot.

4.26 ‏PostgreSQL AI Reply Outbox הושלם מקומית.
Migration מספר `0017_ai_reply_outbox.sql` מוסיף Outbox מאומת ל־Reply
מתוכנן, כולל Foreign Key ל־Audit, מצב Approval עקבי וייחודיות לפי Request
והודעת Inbound. ‏`postgresAiReplyOutboxRepository.ts` מממש Stage, קריאות,
רשימת אישורים ו־Approve/Reject תחת נעילות שורה. אישור נחסם אם הגיעה הודעת
לקוח חדשה. ה־Repository מחובר ל־Foundation, שמכיל כעת 29 Adapters.

4.26.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (18 migrations, 42 concurrency scenarios)`. הוא הוכיח Stage מקביל
יחיד ו־Approval מקביל יחיד עם Replay עקבי. השרת הזמני נעצר והתיקייה נמחקה.

4.27 לאחר מיפוי מחודש של כל שמות ה־D1 Repositories, האומדן המקומי הכולל
מתוקן ל־**16–48 שעות פיתוח נטו**. האומדן הקודם בסעיף 4.25 היה אופטימי מדי:
נותרו חוזים שאינם רק AI, ובהם Subscription, ‏Provisioning, ‏Production
decisions וקריאות System Admin; חלק משמות ה־D1 כבר מכוסים ב־Adapters אחרים
ודורשים אימות Parity ולא Repository חדש. הטווח אינו כולל ספקים, Credentials,
Staging, ‏Load test או Pilot.

אם מאשרים את המודל המומלץ בסעיף 18 של מסמך ההחלטות, הטווח התכנוני
למימוש השדות והחוזים הנלווים הוא **6–12 שעות פיתוח נטו**.
הטווח אינו כולל המתנה לספקים, בדיקות Staging מורשות או זמן Adapter
חי שאינו ניתן לאומדן אמין לפני בחירת ספק וקבלת Credentials.

4.28 ‏PostgreSQL Bot Runtime הושלם מקומית.
`postgresBotRuntimeRepository.ts` מממש קריאת מצב שיחה, זיהוי המשך רק מתוך
תשובת Buttons מאושרת להודעת Inbound הקודמת המיידית ובחלון של 24 שעות,
והעברה אטומית לנציג. יותר מראיית המשך אחת מוחזרת כ־`ambiguous`; Handoff
נועל את השיחה ומחזיר Replay כ־`unchanged`. ה־Repository מחובר ל־Foundation,
שמכיל כעת 30 Adapters.

4.28.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (18 migrations, 43 concurrency scenarios)`. הוא הוכיח Continuation
מתשובת Buttons אמיתית ו־Handoff מקביל יחיד עם תוצאה עקבית. בדרך תוקנו גם
ספירת Version שהוכפלה ב־Join והתנגשות בין מפתחות בדיקה. השרת הזמני נעצר
והתיקייה נמחקה.

4.29 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **14–44 שעות פיתוח
נטו**. הירידה משקפת Adapter מלא ותרחיש Concurrency אמיתי נוסף. הטווח אינו
כולל החלטות ספקים, Credentials, ‏Railway environment, ‏Staging, ‏Load test
או Pilot.

4.30 ‏PostgreSQL Tenant Subscription persistence הושלם מקומית.
Migration מספר `0018_tenant_subscriptions.sql` מוסיף מצב מנוי מסונכרן עם
Tenant, היסטוריית Events דטרמיניסטית ו־Audit הנוצר ב־Trigger. ‏
`postgresTenantSubscriptionRepository.ts` מממש יצירה Idempotent, הארכה,
שינוי מצב וביטול תחת נעילות שורה ו־Optimistic Version. ‏Events אינם ניתנים
לעדכון או למחיקה. ה־Repository מחובר ל־`railwayPostgresFoundation.ts`,
שמכיל כעת 31 Adapters.

4.30.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (19 migrations, 47 concurrency scenarios)`. הוא הוכיח יצירה כפולה
Idempotent וכן הארכה, השעיה וביטול מקבילים, שבכל אחד מהם רק שינוי אחד
מצליח והשני מסווג כ־Conflict. ארבעת ה־Events וארבעת רישומי ה־Audit אומתו,
והשרת הזמני נעצר והתיקייה נמחקה.

4.31 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **10–36 שעות פיתוח
נטו**. הירידה משקפת Migration, ‏Repository וארבעה תרחישי Concurrency
אמיתיים. הטווח אינו כולל החלטות ספקים, Credentials, ‏Railway environment,
Staging, ‏Load test או Pilot.

4.32 ‏PostgreSQL Tenant Provisioning הושלם מקומית ללא Migration חדשה.
`postgresTenantProvisioningRepository.ts` יוצר או טוען Tenant לפי מפתח
דטרמיניסטי, נועל אותו לפני יצירת Owner ושומר Owner membership, ‏Business
Profile ו־Audit באותה Transaction. ‏Retry זהה אינו מעלה את Version ואינו
מכפיל רשומות. Provisioning key קיים עם Owner אחר נכשל סגור. ה־Repository
מחובר ל־`railwayPostgresFoundation.ts`, שמכיל כעת 32 Adapters.

4.32.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (19 migrations, 49 concurrency scenarios)`. הוא הוכיח יצירה כפולה
Idempotent וכן מרוץ בין שתי זהויות על אותו מפתח, שבו נשמרו Owner ו־Audit
יחידים ורק בקשה אחת הצליחה. במהלך הבדיקה אותרה ותוקנה אי־התאמת טיפוס
`BIGINT`/`TEXT` בכתיבת Audit. השרת הזמני נעצר והתיקייה נמחקה.

4.33 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **6–28 שעות פיתוח
נטו**. הירידה משקפת Repository מלא ושני תרחישי Concurrency אמיתיים. הטווח
אינו כולל החלטות ספקים, Credentials, ‏Railway environment, ‏Staging,
Load test או Pilot.

4.34 ‏PostgreSQL Production Decisions הושלם מקומית.
Migration מספר `0019_production_decisions.sql` מוסיף Records ו־Events עבור
11 מזהי ההחלטות שב־Registry בלבד. Trigger כותב Event לכל יצירה או עדכון;
קפיצת Version ושינוי או מחיקת Event חסומים במסד. ‏
`postgresProductionDecisionRepository.ts` מממש List, ‏Read ו־Save עם נעילת
שורה, Replay דטרמיניסטי ו־Conflict מפורש. ה־Repository מחובר ל־Foundation,
שמכיל כעת 33 Adapters.

4.34.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (20 migrations, 51 concurrency scenarios)`. הוא הוכיח יצירה ועדכון
מקבילים של אותה החלטה, שתי גרסאות ושני Events מדויקים, וחסימה של Tampering
או Version skip בכתיבה ישירה. השרת הזמני נעצר והתיקייה נמחקה.

4.35 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **3–20 שעות פיתוח
נטו**. הירידה משקפת Migration, ‏Repository ושני תרחישי Concurrency אמיתיים.
הטווח אינו כולל החלטות ספקים, Credentials, ‏Railway environment, ‏Staging,
Load test או Pilot.

4.36 ‏PostgreSQL System Admin הושלם מקומית ברמת Persistence.
`postgresSystemAdminTenantDirectoryRepository.ts` קורא עד 50 Tenants בכל דף,
מבצע Search ללא Wildcards ומוודא ש־Business Profile ו־Subscription שייכים
לאותו Tenant. ‏`postgresSystemAdminBusinessProfileRepository.ts` נועל את
ה־Profile, מסווג Retry ו־Conflict, מסנכרן את שם ה־Tenant ושומר Event ו־Audit
באותה Transaction. ‏Migration מספר
`0020_system_admin_business_profiles.sql` מונע שינוי או מחיקה של Events.
ה־Foundation מכיל כעת 35 Adapters.

4.36.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (21 migrations, 53 concurrency scenarios)`. הוא הוכיח Retry מקביל
זהה, שתי עריכות מתחרות, Version עוקב, שני Events ושני Audit records בלבד,
וכן חסימת Tampering ישיר. השרת הזמני נעצר והתיקייה נמחקה.

4.37 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **1–12 שעות פיתוח
נטו**. הטווח מיועד למיפוי ה־D1 האחרון מול ה־Adapters הקיימים, סנכרון חוזי
השחרור ותיקון פער מקומי נוסף אם יימצא. הוא אינו כולל החלטות ספקים,
Credentials, ‏Railway environment, ‏Staging, ‏Load test או Pilot.

4.38 ‏PostgreSQL Contact Consent הושלם מקומית.
Migration מספר `0021_contact_consent_events.sql` מוסיף Ledger בלתי־משתנה של
Grant ו־Unsubscribe, עם Foreign Key מורכב ל־Tenant ול־Contact ומפתח Event
דטרמיניסטי. ‏`postgresContactConsentRepository.ts` מאמת את המפתח, נועל את
ה־Contact, שומר Evidence ומקרין רק את ה־Event העדכני ביותר באותה Transaction.
Retry זהה אינו מעלה Version ו־Event ישן אינו דורס מצב חדש. ה־Repository מחובר
ל־`railwayPostgresFoundation.ts`, שמכיל כעת 36 Adapters.

4.38.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (22 migrations, 55 concurrency scenarios)`. הוא הוכיח Retry מקביל
יחיד, סדר אירועים לפי זמן, שמירת Grant ו־Withdrawal מדויקים וחסימת Update או
Delete ישירים של ה־Evidence. במהלך ההרצה אותרה ותוקנה התנגשות בין מספרי טלפון
של שני תרחישי Integration. השרת הזמני נעצר והתיקייה נמחקה.

4.39 מיפוי D1 מול PostgreSQL מצא שני פערי Persistence מקומיים שנותרו:
קריאת קהל Campaign ו־Provider reconciliation של משלוחי Campaign. יתר השמות
שנבדקו מכוסים ב־Adapters קיימים בשם זהה או בשם ספק־נייטרלי, או שהם פורטים של
Evidence/Runtime שאינם Repository PostgreSQL.

4.40 אומדן העבודה המקומית שנותרה לאחר Slice זה הוא **6–18 שעות פיתוח נטו**:
כ־2–6 שעות ל־Campaign Audience read, כ־3–8 שעות ל־Provider reconciliation,
וכ־1–4 שעות לסנכרון חוזים ושער מלא. הטווח אינו כולל החלטות ספקים, Credentials,
Railway environment, ‏Staging, ‏Load test או Pilot.

4.41 ‏PostgreSQL Campaign Audience הושלם מקומית ללא Migration חדשה.
`postgresCampaignAudienceRepository.ts` קורא רק Contacts באותו Tenant עם
`subscribed + granted`, לפי `all`, ‏List או Tag. הוא מגביל תוצאה ל־100,001,
מאמת את Tenant המקור, צורת השורה, סדר ומזהים ייחודיים. ה־Repository מחובר
ל־`railwayPostgresFoundation.ts`, שמכיל כעת 37 Adapters.

4.41.1 ‏Harness נקי על PostgreSQL 16.13 עבר עם
`PASS (22 migrations, 55 concurrency scenarios)`. הוא הוכיח קהל מלא, List,
Tag, בידוד Group של Tenant אחר והסרה מיידית מהקהל לאחר Unsubscribe. מספר
תרחישי ה־Concurrency לא השתנה מפני שה־Slice הוא Read-only. השרת הזמני נעצר
והתיקייה נמחקה.

4.42 נותר פער Persistence מקומי ממופה אחד: PostgreSQL Provider
reconciliation עבור משלוחי Campaign. אומדן העבודה המקומית שנותרה הוא
**3–10 שעות פיתוח נטו**: כ־2–6 שעות ל־Repository ולתרחישי מרוץ, וכ־1–4 שעות
לסנכרון חוזים ושער מלא. הטווח אינו כולל החלטות ספקים, Credentials, ‏Railway
environment, ‏Staging, ‏Load test או Pilot.

4.43 ‏PostgreSQL Campaign Provider Reconciliation הושלם מקומית.
Migration מספר `0022_campaign_delivery_provider_links.sql` מוסיף Evidence
קשיח בין Campaign delivery, ‏Provider message ו־Rate-limit reservation.
`postgresCampaignDeliveryProviderRepository.ts` מסווג Acceptance replay,
Event conflict, ‏Terminal conflict ו־Stale events, ומקרין Status ו־Settlement
באותה Transaction. ‏Triggers חוסמים Provider ID שכבר שייך ל־Message רגיל,
שינוי זהות, Status שאינו מתקדם ומחיקת Evidence. ה־Repository מחובר ל־
`railwayPostgresFoundation.ts`, שמכיל כעת 38 Adapters.

4.43.1 ‏Harness נקי על PostgreSQL 16 עבר עם
`PASS (23 migrations, 57 concurrency scenarios)`. במהלך ההרצה אותר ותוקן
באג MVCC: לאחר המתנה ל־Transaction מקבילה, ה־Link יכול היה להיקרא מהמצב
החדש וה־Recipient מ־Snapshot ישן. התיקון נועל את שתי השורות יחד, ונוספה
בדיקת רגרסיה. ההרצה הוכיחה Acceptance ו־Delivery מקבילים, Settlement ו־
Portfolio projection אטומיים, ‏Read advancement וחסימת Tampering. השרת
הזמני נעצר והתיקייה נמחקה.

4.44 לא נותר פער Repository מקומי ברשימת ה־D1 שמופה ל־PostgreSQL.
עדיין אין להסיק מכך שה־Migration ל־Railway מוכן ל־Production. נותרו הוכחת
Semantic parity, ‏Data migration rehearsal, ספק וערכי Pool חיים, ‏Queues,
‏Runtime routes, ‏Staging, ‏Load/Recovery evidence ו־Cutover.

4.45 שער השחרור המקומי המלא עבר לאחר Slice זה. ‏Build, ‏TypeScript,
ESLint, ‏Source guard, ‏Secret hygiene עם היסטוריית Git, כל 36 מיגרציות D1,
חוזה 23 מיגרציות PostgreSQL וכל **1,994 הבדיקות** עברו יחד. סטטוס
Production נשאר חסום רק על עבודה חיה והחלטות שאינן מוכחות מקומית; אין להפוך
את ה־Gate ל־Ready ללא Accounts, ‏Credentials ו־Staging evidence אמיתיים.

4.46 ‏PostgreSQL migration source parity הושלם מקומית. Registry
Machine-readable ממפה בדיוק פעם אחת את כל 36 מיגרציות D1 אל 24 מיגרציות
PostgreSQL, מאמת שכל 51 טבלאות D1 קיימות, ומסווג בנפרד שלוש מיגרציות
Railway-only: ‏API mutation receipts, ‏Scheduler lease ו־API mutation token
buckets. ה־Verifier מחובר
ל־Release gate ול־Pull Request `migrations` check. בכך נסגר פער הכיסוי
המבני; עדיין חסרים Data conversion, ‏Semantic parity ו־Staging evidence.

4.46.1 שער השחרור המקומי המלא עבר לאחר הוספת ה־Registry וה־Verifier.
‏Build, ‏TypeScript, ‏ESLint, ‏Source guard, ‏Secret hygiene, כל 36 מיגרציות
D1, חוזה 23 מיגרציות PostgreSQL, בדיקת כיסוי 51 הטבלאות וכל **1,998
הבדיקות** עברו יחד. תוצאה זו מוכיחה את תקינות ה־Source המקומי בלבד ואינה
מחליפה Migration rehearsal או Evidence מסביבת Railway חיה.

4.47 ‏Distributed tenant mutation rate limiting הושלם מקומית עבור Railway
API. ‏Migration מספר `0023_api_mutation_rate_limits.sql` מוסיף Token buckets
משותפים ואטומיים. ה־Binding שומר רק מפתח SHA-256 אטום, משתמש ב־Advisory lock
וב־`FOR UPDATE`, מחשב Continuous refill לפי זמן PostgreSQL ונכשל סגור כאשר
אותה Policy version מקבלת Capacity או חלון שונים. ‏Policy version, ‏Capacity
ו־Refill period הם Environment חובה ללא Defaults. ה־Foundation מכיל כעת
39 Adapters וה־API Runtime יוצר ממנו את Guard של `contacts.save`.

4.47.1 ‏Harness נקי על PostgreSQL 16 עבר עם
`PASS (24 migrations, 58 concurrency scenarios)`. הוא הוכיח שבמכסה `2`,
שלוש צריכות מקבילות מחזירות בדיוק שתי הצלחות וחסימה אחת, ש־Scope אחר מבודד,
ששינוי Policy ללא העלאת גרסה נכשל וש־Refill מאפשר בקשה נוספת. במהלך האימות
אותר ותוקן Cast לא עקבי בין `INTEGER` ל־`NUMERIC`, וכן תוקן Assertion שהיה
תלוי בטעות באפס זמן מוחלט. שרת הבדיקה נעצר והתיקייה הזמנית נמחקה.

4.47.2 שער השחרור המקומי המלא עבר לאחר ה־Staging. ‏Source guard סרק 544
קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,089 קבצים והיסטוריית Git,
ו־Build, ‏TypeScript, ‏ESLint, חוזה 24 מיגרציות PostgreSQL, ‏Migration parity
וכל **2,007 הבדיקות** עברו יחד. ‏Production נשאר חסום על ערכי Policy חיים,
Startup executable, ‏Data migration rehearsal, ‏Semantic parity וראיות
Staging/Load; תוצאת Local זו אינה מחליפה אותם.

4.48 ‏PostgreSQL Core data migration rehearsal הושלם מקומית לשבע טבלאות:
Tenants, ‏Memberships, ‏Selections, ‏Business profiles, ‏Contacts, ‏Consent
events ו־Audit logs. ה־Snapshot בודק Schema, ‏Integrity ו־Foreign keys;
Plan קצר־תוקף קשור ל־HMAC; PostgreSQL ננעל, חייב להיות ריק, נטען ומאומת
באותה Transaction. ‏Evidence אינו מכיל PII. ‏Consent legacy ללא Actor או
מפתח תקני נחסם במקום לעבור Backfill שקט.

4.48.1 ‏Rehearsal נקי עבר מול SQLite ו־PostgreSQL 16 אמיתיים עם
`PASS (36 D1 migrations, 24 PostgreSQL migrations, 7 tables, 7 rows, replay rejected)`.
כל חמשת Identity sequences סונכרנו. במהלך ההרצה אותר ותוקן פער ב־Node
adapter עבור `LOCK TABLE`, ש־PostgreSQL מחזיר עבורו `rowCount=null`; הקבלה
מוגבלת כעת במפורש לפקודת `LOCK` חוקית ללא Rows. השרת הזמני נעצר ותיקייתו
נמחקה.

4.48.2 נותרו Data conversion ל־44 טבלאות, Export חי מ־D1, ‏Staging rehearsal,
Semantic parity, ‏Load/Recovery ו־Cutover evidence. לכן Production נשאר
חסום ואין לפרש את ה־Core rehearsal כהשלמת Migration מלאה.

4.48.3 שער השחרור המקומי המלא עבר לאחר ה־rehearsal. ‏Source guard סרק 545
קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,094 קבצים והיסטוריית Git,
ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,017 הבדיקות** עברו
יחד. ‏Production נשאר חסום על 44 הטבלאות הנותרות ועל ראיות חיות בלבד.

4.49 ‏Railway API Startup executable הושלם מקומית. ‏`railwayApiMain.ts`
מאמת `PORT` לפני יצירת Pool, מרכיב את PostgreSQL Runtime מתוך Environment
מלא ללא Defaults ומוסר אותו ל־Process controller. ‏`start-railway-api.mjs`
הוא Entry point תחום שאינו מדפיס Configuration או Error פנימי. כשל Startup
מנסה לסגור כל Runtime שכבר נוצר.

4.49.1 ‏Rehearsal הפעיל Child process אמיתי מול PostgreSQL 16 עם כל 24
המיגרציות. `GET /health/live` ו־`GET /health/ready` עברו, `SIGTERM` סגר HTTP
לפני Pool והתהליך יצא בקוד `0` ללא stdout/stderr. במהלך ההרצה אותר ותוקן באג
Composition: ‏Runtime עם `postgresEnvironment` חסר העביר בטעות
`environment: undefined` במקום להשמיט את השדה, ולכן ה־Bootstrap לא יכול היה
לקרוא את `process.env`. שרת הבדיקה נעצר ותיקייתו נמחקה.

4.49.2 עדיין חסרים Railway Project/Service ו־Environment values חיים,
Healthcheck ו־Grace period מאומתים, Deployment evidence, וה־Worker Startup
הנפרד. אין ליצור `railway.json` עם Project או Service מומצאים לפני שראשה/רועי
מספקים את היעד החי.

4.49.3 שער השחרור המקומי המלא עבר לאחר ה־Startup executable. ‏Source guard
סרק 546 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,099 קבצים והיסטוריית
Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,024 הבדיקות**
עברו יחד ללא כשל או Skip.

4.50 ‏PostgreSQL Core semantic parity הושלם מקומית עבור אותן שבע טבלאות
Core. ה־Verifier מתחיל מ־D1 אמיתי בזיכרון, טוען את ה־Snapshot דרך מנגנון
ה־Migration ל־PostgreSQL ומריץ את אותם Repository contracts בשני המנועים.
הוא משווה Memberships, ‏Selection optimistic concurrency, ‏Business profile
idempotency, ‏Contact isolation/pagination ו־Consent ordering/idempotency.

4.50.1 הרצה נקייה מול PostgreSQL 16 אמיתי עברה עם
`PASS (19 scenarios, 7 tables, 19 rows)`. בנוסף לתוצאות הפעולות הושווה מצב
סופי קנוני של כל שבע הטבלאות באמצעות SHA-256 digests. במהלך האימות נמצאו
רק שני הבדלי ייצוג של Driver — `BIGINT` כמחרוזת ו־`JSONB` כאובייקט —
ונוסף נרמול מוגבל לעמודות הידועות. לא נמצא פער עסקי. השרת הזמני נעצר
ותיקייתו נמחקה.

4.50.2 ה־Core parity אינו מוכיח את 44 הטבלאות הנותרות, Export חי, עומס,
Recovery, ‏Staging או Cutover. אלו נשארים חסמי Production מפורשים.

4.50.3 שער השחרור המקומי המלא עבר לאחר הוספת ה־Verifier. ‏Source guard סרק
546 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,099 קבצים והיסטוריית Git,
ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,026 הבדיקות** עברו
יחד ללא כשל או Skip.

4.51 ‏PostgreSQL Data migration slice registry הושלם מקומית. הוא מחלק את
כל 51 טבלאות D1 בדיוק פעם אחת לעשרה Slices בסדר תלות מפורש. שבע טבלאות
Core מסומנות `rehearsed`, חמש טבלאות Tenant Access מסומנות `next`, ו־39
טבלאות נוספות נשארות `planned`. בדיקה מריצה את כל 36 מיגרציות D1, קוראת
את ה־Schema הסופי ומשווה אותו גם ל־51 טבלאות PostgreSQL שאינן Railway-only.

4.51.1 ה־Slice הבא הוא Tenant Access: ‏Membership events, ‏Invitations,
Invitation events, ‏Delivery outbox ו־Acceptance evidence. הוא תלוי רק ב־
Tenants/Memberships שכבר עברו ב־Core ואינו תלוי בהחלטת Queue, ‏Meta,
Storage או AI. ה־Registry הוא תכנון מאומת בלבד; הוא אינו מסמן Data
conversion או Parity של חמש הטבלאות כהושלמו.

4.51.2 שער השחרור המקומי המלא עבר לאחר הוספת מפת ה־Slices. ‏Build,
TypeScript, ‏ESLint, ‏Source/Secret/Interface guards, כל חוזי המיגרציה וכל
**2,029 הבדיקות** עברו יחד ללא כשל או Skip.

4.52 ‏PostgreSQL Tenant Access data migration ו־Semantic parity הושלמו
מקומית עבור חמש הטבלאות ב־Slice השני. נוסף Protocol כללי עם Plan קצר־תוקף,
HMAC לכל טבלה, Advisory/Exclusive locks, יעד ריק, Batch insert, ‏Read-back
ואימות Digest לפני Commit. ‏D1 reader בודק Schema מדויק, ‏Integrity ו־Foreign
keys בתוך Snapshot יחיד.

4.52.1 ארבע טבלאות Ledger דורשות כיבוי זמני של `USER triggers`, משום
שאירוע היסטורי חוקי אינו תואם בהכרח למצב הסופי. המנגנון מאמת תחילה שכל
ה־Triggers פעילים, משבית רק את ארבע הטבלאות המוגדרות, מפעיל אותם מחדש
ומאמת Lineage, מצב נוכחי וקשרי Delivery/Acceptance לפני Commit. כשל מבצע
Rollback גם לשינוי מצב ה־Triggers.

4.52.2 Rehearsal נקי מול SQLite ו־PostgreSQL 16 אמיתיים עבר עם
`PASS (36 D1 migrations, 24 PostgreSQL migrations, 5 tables, 11 rows, replay rejected, triggers restored, 7 parity scenarios)`.
שבעת התרחישים הוכיחו Immutability, הגנת Owner אחרון, חסימת נסיגת Delivery
ושני מעברי Lifecycle חוקיים; המצב הסופי היה זהה בשני המנועים. שרת הבדיקה
נעצר ותיקייתו נמחקה.

4.52.3 במהלך ההרצה אותר ותוקן פער ב־Node adapter: גם `ALTER TABLE`, כמו
`LOCK`, מוחזר על ידי `node-postgres` עם `rowCount=null`. הקבלה הוגבלה
במפורש לפקודות `ALTER` או `LOCK` ללא Rows, ונוספה בדיקת Regression.

4.52.4 12 מתוך 51 טבלאות הוכחו כעת ב־Data migration ו־Parity. נותרו 39
טבלאות, ‏Export חי, ‏Staging, ‏Load/Recovery ו־Cutover. ה־Slice הבא הוא
Contact Organization & Import.

4.52.5 שער השחרור המקומי המלא עבר לאחר השלמת ה־Slice. ‏Source guard סרק
548 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,105 קבצים והיסטוריית
Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,042
הבדיקות** עברו יחד ללא כשל או Skip.

4.53 ‏PostgreSQL Contact Organization & Import data migration ו־Semantic
parity הושלמו מקומית עבור שש הטבלאות ב־Slice השלישי. חוזה ה־Snapshot חוסם
Legacy rows שאינם עומדים בשמות חתוכים, ‏Import keys, ‏Filename, ‏Actor,
50,000 rows, ‏Counters, ‏Timestamps, ‏Fingerprint ו־Outcome של היעד.

4.53.1 לפני Commit ה־Protocol משווה כל Counter של Import job לשורות
האמיתיות לפי Status, מוודא ש־Source row אינו עובר את Total, מסנכרן ארבעה
Identity sequences וקורא את שש הטבלאות בחזרה ל־Count/HMAC. שגיאת Driver
גולמית בזמן INSERT ממופה כעת לשגיאה מוגבלת שאינה מחזירה ערכי שורה רגישים.

4.53.2 Rehearsal נקי מול SQLite ו־PostgreSQL 16 אמיתיים עבר עם
`PASS (36 D1 migrations, 24 PostgreSQL migrations, 6 tables, 10 rows, replay rejected, tenant isolation verified, 7 parity scenarios)`.
נבדקו Upsert, קשרי Tag/List, כפילויות, מוני Import, Job חדש ובידוד Tenant
ברמת Foreign keys מורכבים. השרת הזמני נעצר ותיקייתו נמחקה.

4.53.3 18 מתוך 51 טבלאות הוכחו כעת ב־Data migration ו־Parity. נותרו 33
טבלאות, ‏Export חי, ‏Staging, ‏Load/Recovery ו־Cutover. ה־Slice הבא הוא
Meta Connection ובו שלוש טבלאות; Credentials גולמיים אינם חלק מההעברה.

4.53.4 שער השחרור המקומי המלא עבר לאחר השלמת ה־Slice. ‏Source guard סרק
549 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,113 קבצים והיסטוריית
Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,049
הבדיקות** עברו יחד ללא כשל או Skip.

4.54 ‏PostgreSQL Meta Connection data migration ו־Semantic parity הושלמו
מקומית עבור שלוש הטבלאות ב־Slice הרביעי. ה־Snapshot בודק מזהי Meta,
Lifecycle, ‏SHA-256, ‏Error codes, זמנים ומבנה Base64 של IV/Ciphertext בלי
לפענח או להחזיר Access token.

4.54.1 ‏Connected connection חייב Envelope מוצפן, ו־Envelope ללא Connection
נחסם לפני Commit. ‏Receipt מקושר ל־Connection באמצעות Foreign key מורכב
של `tenant_id` ו־`waba_id`. ה־Manifest וה־Evidence מכילים רק Counts ו־HMAC;
ה־Plan payload נשאר Artifact תפעולי סודי ואינו מיועד ל־Git או Logs.

4.54.2 Rehearsal נקי מול SQLite ו־PostgreSQL 16 אמיתיים עבר עם
`PASS (36 D1 migrations, 24 PostgreSQL migrations, 3 tables, 6 rows, replay rejected, tenant isolation verified, no plaintext columns, 8 parity scenarios)`.
Inventory חי הוכיח שאין עמודת Plaintext או Access token. השרת הזמני נעצר
ותיקייתו נמחקה.

4.54.3 בהרצה הראשונה נמצא פער Legacy אמיתי: D1 מאפשר Padding של Base64
באמצע Ciphertext, בעוד PostgreSQL דוחה. התרחיש הוצא מ־Semantic parity וסווג
כ־Security hardening; ה־Snapshot והיעד דוחים אותו במפורש.

4.54.4 בנקודת השלמת Slice 4, ‏21 מתוך 51 טבלאות הוכחו ב־Data migration
ו־Parity ונשארו 30. התכנון המקורי מנה ארבע טבלאות ב־Templates & Campaigns;
סעיף 4.55 מתעד את תיקון התלות והמצב העדכני.

4.54.5 שער השחרור המקומי המלא עבר לאחר השלמת ה־Slice. ‏Source guard סרק
550 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,118 קבצים והיסטוריית
Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,055
הבדיקות** עברו יחד ללא כשל או Skip.

4.55 ‏PostgreSQL Templates & Campaigns data migration ו־Semantic parity
הושלמו מקומית עבור `message_templates`, ‏`campaigns` ו־
`campaign_recipients`. ה־Snapshot דורש JSON shape מדויק, מפעיל את Validators
של ה־Runtime, קושר את ה־Template key ל־Frozen snapshot ומאמת Lifecycle של
Template ושל Recipient.

4.55.1 לפני Commit המנגנון משווה `recipient_count` למספר הנמענים בפועל,
קורא את שלוש הטבלאות בחזרה ומשווה Count/HMAC. ‏Manifest ו־Evidence אינם
מכילים טקסט תבנית, טלפון, Personalization, שם או Meta Template ID.

4.55.2 Rehearsal נקי מול SQLite ו־PostgreSQL 16 אמיתיים עבר עם
`PASS (36 D1 migrations, 24 PostgreSQL migrations, 3 tables, 8 rows, replay rejected, tenant isolation verified, provider evidence deferred, 8 parity scenarios)`.
השרת הזמני נעצר ותיקייתו נמחקה.

4.55.3 במהלך ניתוח התלויות נמצא ש־`campaign_delivery_provider_links`
מחזיקה Foreign key אל `whatsapp_rate_limit_reservations`. הטבלה הועברה
מ־Slice 5 ל־`whatsapp-delivery-policy`, כדי שה־Provider identity,
Reservation ו־Settlement יועברו וייבדקו יחד ולא באמצעות עקיפת Constraint.

4.55.4 ‏24 מתוך 51 טבלאות הוכחו כעת ב־Data migration ו־Parity. נותרו 27
טבלאות, ‏Export חי, ‏Staging, ‏Load/Recovery ו־Cutover. ה־Slice הבא הוא
Conversations & Messages ובו שתי טבלאות.

4.55.5 שער השחרור המקומי המלא עבר לאחר השלמת ה־Slice. ‏Source guard סרק
551 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,123 קבצים והיסטוריית
Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,062
הבדיקות** עברו יחד ללא כשל או Skip.

4.56 ‏PostgreSQL Conversations & Messages data migration ו־Semantic parity
הושלמו מקומית עבור שתי הטבלאות ב־Slice השישי. ה־Snapshot חוסם Provider
identity לא חתוכה, כשלי Direction/Status, ‏Content shape סותר וסדר זמנים
שאינו עומד בחוזה PostgreSQL.

4.56.1 לפני Commit המנגנון מוכיח שכל Last-message projection מצביע ל־
Message באותו Tenant, באותה Conversation ובאותו `occurred_at`. ‏Manifest
ו־Evidence אינם מכילים Text content, ‏Provider message ID, שיוך או סטטוס
שיחה.

4.56.2 Rehearsal נקי מול SQLite ו־PostgreSQL 16 אמיתיים עבר עם
`PASS (36 D1 migrations, 24 PostgreSQL migrations, 2 tables, 5 rows, replay rejected, tenant isolation verified, message content private, 9 parity scenarios)`.
השרת הזמני נעצר ותיקייתו נמחקה.

4.56.3 ‏26 מתוך 51 טבלאות הוכחו כעת ב־Data migration ו־Parity. נותרו 25
טבלאות, ‏Export חי, ‏Staging, ‏Load/Recovery ו־Cutover. ה־Slice הבא הוא
Bot Runtime ובו שלוש טבלאות.

4.56.4 שער השחרור המקומי המלא עבר לאחר השלמת ה־Slice. ‏Source guard סרק
552 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,128 קבצים והיסטוריית
Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,068
הבדיקות** עברו יחד ללא כשל או Skip.

4.57 ‏PostgreSQL Bot Runtime data migration ו־Semantic parity הושלמו
מקומית עבור `bot_flows`, ‏`bot_flow_versions` ו־`bot_reply_deliveries`.
ה־Snapshot מפעיל את Validator העסקי המלא על Definition ועל Reply, ודורש
Lifecycle עקבי לכל Flow, ‏Version ו־Delivery.

4.57.1 לפני Commit המנגנון מוכיח שמפתחות הגרסה האחרונה והפעילה שייכים
לאותו Flow ו־Tenant, ושכל Delivery מקושר להודעת Inbound באותה Conversation
ולצמד Flow/Version מלא. בכך נסגר פער D1 ישן שאינו כולל `bot_flow_key`
ב־Foreign key של Delivery.

4.57.2 Rehearsal נקי מול SQLite ו־PostgreSQL 16 אמיתיים עבר עם
`PASS (36 D1 migrations, 24 PostgreSQL migrations, 3 tables, 6 rows, replay rejected, tenant isolation verified, bot payload private, 9 parity scenarios)`.
השרת הזמני נעצר ותיקייתו נמחקה לאחר הרצת הפקודה הרשמית האחרונה.

4.57.3 נמצא פער Hardening: שני מנועי ה־Schema מאפשרים שם Flow עם רווחים
חיצוניים, אך ה־Runtime אינו מאפשר זאת. חוזה ה־Migration דוחה Legacy row כזה
במקום לשנות נתון בשקט.

4.57.4 ‏29 מתוך 51 טבלאות הוכחו כעת ב־Data migration ו־Parity. נותרו 22
טבלאות, ‏Export חי, ‏Staging, ‏Load/Recovery ו־Cutover. ה־Slice הבא הוא
AI & Knowledge Runtime ובו תשע טבלאות.

4.57.5 שער השחרור המקומי המלא עבר לאחר השלמת ה־Slice. ‏Source guard סרק
553 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,133 קבצים והיסטוריית
Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,075
הבדיקות** עברו יחד ללא כשל או Skip.

4.58 ‏PostgreSQL AI & Knowledge Runtime data migration ו־Semantic parity
הושלמו מקומית עבור תשע הטבלאות של Agent, ‏Version, ‏Knowledge,
Cost/Usage, ‏Audit ו־Reply outbox.

4.58.1 ה־Snapshot מאמת מחדש את כל המפתחות הדטרמיניסטיים, מפעיל את
Validator העסקי המלא על הגדרת Agent ודורש Lifecycle עקבי. לפני Commit
נבדקים Projection של גרסה אחרונה/פעילה, מיפוי Version/Source, רציפות
Passages, התאמת Usage להרשאת עלות וקישור Audit/Outbox מלא להודעת Inbound,
ל־Contact ולמקורות Knowledge.

4.58.2 חוזה ה־Migration המשותף הורחב ל־Boolean של D1/PostgreSQL ול־Date
קלנדרי. ‏`DATE` נקרא חזרה כ־Text ונכתב עם `::date`, ולכן אין שינוי יום עקב
Timezone. ערכי 0/1 של D1 מושווים דטרמיניסטית ל־Boolean של PostgreSQL.

4.58.3 Rehearsal נקי מול SQLite ו־PostgreSQL 16 אמיתיים עבר עם
`PASS (36 D1 migrations, 24 PostgreSQL migrations, 9 tables, 9 rows, replay rejected, tenant isolation verified, AI payload private, 9 parity scenarios)`.
‏Prompt, תוכן Passage, תשובת AI, טלפון ו־Provider ID לא נחשפו ב־Manifest
או ב־Evidence.

4.58.4 ‏38 מתוך 51 טבלאות הוכחו כעת ב־Data migration ו־Parity. נותרו 13
טבלאות, ‏Export חי, ‏Staging, ‏Load/Recovery ו־Cutover. ה־Slice הבא הוא
Governance & Billing ובו חמש טבלאות. אומדן העבודה המקומית לשני ה־Slices
שנותרו הוא **15–36 שעות פיתוח ואימות נטו**.

4.58.5 שער השחרור המקומי המלא עבר לאחר השלמת ה־Slice. ‏Source guard סרק
554 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,138 קבצים והיסטוריית
Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,083
הבדיקות** עברו יחד ללא כשל או Skip.

4.59 ‏PostgreSQL Governance & Billing data migration ו־Semantic parity
הושלמו מקומית עבור חמש טבלאות Subscription, ‏Production Decisions ו־
Business Profile Admin events.

4.59.1 ה־Snapshot מאמת מפתחות Event דטרמיניסטיים, סטטוסים, זמנים,
Check IDs מתוך Registry ו־Profile digests. לפני Commit נבדקים רצף מלא של
Subscription Events, התאמת החלטה לאירוע האחרון וקישור Subscription/Admin
events ל־Audit המקורי שכבר הועבר ב־Core.

4.59.2 Triggers שיוצרים Audit או Decision Events מושבתים רק בתוך
Transaction ההעברה ומופעלים מחדש לפני האימות. בכך נמנעת יצירת ראיות כפולות
בזמן טעינת Ledger היסטורי.

4.59.3 Rehearsal נקי מול SQLite ו־PostgreSQL 16 אמיתיים עבר עם
`PASS (36 D1 migrations, 24 PostgreSQL migrations, 5 tables, 7 rows, replay rejected, audit lineage verified, governance payload private, 9 parity scenarios)`.
Selection, ‏Rationale, ‏Actor ונתוני Profile לא נחשפו ב־Manifest או Evidence.

4.59.4 נמצאו שני פערי Hardening קיימים ב־D1: ‏Subscription Event בעל קפיצת
Version מתקבל ב־SQL ישיר, ו־Subscription/Production Decision events אינם
מוגנים שם מ־Update/Delete. ה־Repositories אינם מציעים פעולות כאלה,
ה־Migration verifier דוחה Ledger לא רציף, ו־PostgreSQL חוסם Mutation. הפערים
מתועדים ואינם מסומנים כ־Parity.

4.59.5 ‏43 מתוך 51 טבלאות הוכחו כעת ב־Data migration ו־Parity. נותרו 8
טבלאות ב־Slice האחרון — WhatsApp Delivery Policy — בהערכת **10–24 שעות
פיתוח ואימות נטו**, בנוסף ל־Export חי, ‏Staging, ‏Load/Recovery ו־Cutover.

4.59.6 שער השחרור המקומי המלא עבר לאחר השלמת ה־Slice. ‏Source guard סרק
555 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,143 קבצים והיסטוריית
Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,089
הבדיקות** עברו יחד ללא כשל או Skip.

4.60 ‏PostgreSQL WhatsApp Delivery Policy data migration ו־Semantic parity
הושלמו מקומית עבור שמונה טבלאות Policy, ‏Reservation, ‏Pair/Portfolio,
‏Settlement, ‏Cooldown ו־Provider link.

4.60.1 ה־Snapshot מאמת מפתחות Policy דטרמיניסטיים, רצף גרסאות, ‏Audit,
תוקף Evidence וקשר לחיבור Meta. לפני Commit נבדקים Settlement מלא לכל
Reservation, הקרנות Pair/Portfolio, רצף Cooldown וקישור Provider link
ל־Campaign delivery ול־Settlement הטרמינלי.

4.60.2 ‏D1 אינו שומר `template_category` היסטורי. ‏PostgreSQL מייצג את
הערך החסר כ־`NULL` מפורש במקום להמציא Category. ‏Runtime inserts חדשים
עדיין חייבים `MARKETING` או `UTILITY`; ‏Legacy settlement נתמך ו־Replay
עמום נחסם.

4.60.3 Rehearsal נקי מול SQLite ו־PostgreSQL 16 אמיתיים עבר עם
`PASS (36 D1 migrations, 25 PostgreSQL migrations, 8 tables, 12 rows, replay rejected, legacy category unknown, delivery evidence private, 9 parity scenarios)`.
‏Provider ID, מספר טלפון, Actor, ‏Policy evidence ו־Delivery keys לא נחשפו
ב־Manifest או ב־Evidence. השרת הזמני נעצר ותיקייתו נמחקה.

4.60.4 כל 10 ה־Slices וכל 51 טבלאות D1 הוכחו כעת ב־Data migration
וב־Semantic parity מקומיים. לא נותר Slice מקומי. עדיין נדרשים Export חי
ועקבי, ‏Staging, ‏Load/Recovery, ערכי Railway/Meta חיים, ‏Cutover ו־Rollback
בסביבה מבוקרת.

4.60.5 שער השחרור המקומי המלא עבר לאחר השלמת ה־Slice האחרון. ‏Source
guard סרק 556 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,148 קבצים
והיסטוריית Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל
**2,097 הבדיקות** עברו יחד ללא כשל או Skip.

4.61 ‏Full-source D1 migration snapshot הושלם מקומית. מנגנון משותף קורא
את כל 10 ה־Slices ואת כל 51 הטבלאות תחת `BEGIN DEFERRED` יחיד, ומריץ Schema,
‏Integrity ו־Foreign-key verification פעם אחת על אותו מצב מקור.

4.61.1 ‏Registry coverage נבדק Fail-closed: עשרה IDs באותו סדר, כל Slice
במצב `rehearsed`, וכל טבלה בדיוק פעם אחת. שינוי Schema בטבלה האחרונה או
כשל Validator גורמים ל־Rollback של כל ה־Snapshot; אין תוצאה חלקית.

4.61.2 פקודת `verify:d1-full-migration-snapshot` פותחת רק קובץ `.sqlite`
מוחלט, רגיל ובבעלות המפעיל, עם הרשאות Owner בלבד, ללא Symbolic/Hard links,
במצב `readOnly` וללא SQLite extensions. לאחר הקריאה היא בודקת מחדש Device,
‏Inode, גודל וזמן שינוי כדי לזהות החלפת מקור תוך כדי הבדיקה.

4.61.3 הפלט מכיל רק מספר Slices, טבלאות ושורות כולל; נתיב ה־Export ותוכן
השורות אינם מודפסים. המנגנון אינו מסומן כ־Export חי או Staging evidence —
עדיין נדרשים Export מורשה, טעינת כל ה־Plans, ‏Recovery ו־Rollback בסביבה
מבוקרת.

4.61.4 שער השחרור המקומי המלא עבר לאחר הוספת חוזה ה־Source. ‏Source guard
סרק 556 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,154 קבצים והיסטוריית
Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,103
הבדיקות** עברו יחד ללא כשל או Skip.

4.62 ‏Signed all-slice PostgreSQL migration bundle הושלם מקומית. עשרת
ה־Child plans נוצרים עם אותו חלון קצר־תוקף, נקשרים ב־HMAC ל־Source digest
יציב ול־Bundle digest תלוי־חלון, ונבדקים במלואם לפני פתיחת Transaction יעד.

4.62.1 הביצוע רוכש לפי סדר קבוע את כל ששת ה־Advisory locks הקיימים ומריץ
את כל עשרת ה־Slice protocols דרך Transaction manager מקונן תחת Transaction
חיצוני יחיד. בדיקה שלילית הוכיחה שכשל ב־Slice מאוחר מבטל גם Slice מוקדם
ואינו כותב Receipt.

4.62.2 ‏Migration `0025_data_migration_bundle_receipts.sql` מוסיפה Receipt
בלתי־משתנה וייחודי לפי Bundle, ‏Source, חתימת Bundle וחתימת Evidence. כך גם
Source ריק אינו יכול להיטען שוב באמצעות Plan חדש. ‏Execution scope יחיד
חוסם Cutover מלא שני גם לאחר החלפת HMAC key. ה־Receipt נכתב רק לאחר
אימות Target digests של כל 51 הטבלאות ובאותו Transaction.

4.62.3 חזרה נקייה מול PostgreSQL 16.13 אמיתי עברה עם כל 26 ה־Migrations,
עשרה Slices, ‏51 טבלאות, Receipt יחיד ודחיית Replay. כל 58 תרחישי
ה־Concurrency הקיימים עברו לאחר מכן. ה־Harness תוקן גם להסרת תלות בשעת
מערכת קשיחה: זמני עדכון Admin נגזרים כעת מזמן יצירת ה־Profile שנשמר בפועל.

4.62.4 שער השחרור המקומי המלא עבר לאחר התיקון. ‏Source guard סרק 558
קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,163 קבצים והיסטוריית Git,
ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,110 הבדיקות**
עברו יחד ללא כשל או Skip.

4.62.5 החזרה המלאה עדיין אינה ראיית Staging: היא השתמשה ב־D1 schema אמיתי
ללא שורות לקוח. עדיין נדרשים Export מורשה, ספק PostgreSQL וערכי Pool חיים,
הרצת אותו Bundle בסביבה מבוקרת, ‏Load/Recovery ו־Evidence חתום לשחרור.

4.63 ‏PostgreSQL Full Data Migration Cutover runner הושלם מקומית. הוא
מפריד בין `preflight` ללא כתיבה לבין `execute`, ומחזיר בשני השלבים רק DTO
מצומצם ללא Payload, נתיב מקור, Database URL או HMAC key.

4.63.1 ‏Preflight קורא Export מוגן דרך אותו Full-source verifier ויוצר
`sourceDigest` יציב וחלון Plan של עשר דקות. ה־Plan ו־51 טבלאות המקור נשארים
בזיכרון בלבד ואינם נכתבים ל־stdout או לקובץ.

4.63.2 ‏Execute נכשל לפני קריאת המקור כאשר Environment, ‏TLS/Pool,
Confirmation או מבנה ה־Digest אינם תקינים. לאחר הקריאה הוא מחשב מחדש את
ה־Source HMAC ודורש התאמה בזמן קבוע ל־Digest שאושר ב־Preflight. רק
`staging` או `production` מותרים ואין ברירת מחדל למפתח או לאישור.

4.63.3 חזרה נקייה מול PostgreSQL 16.13 אמיתי עברה דרך שכבת ה־Cutover עם
כל 26 ה־Migrations, עשרה Slices, ‏51 טבלאות, Receipt יחיד ודחיית ניסיון
שני כ־`target-already-cut-over`. כל 58 תרחישי ה־Concurrency עברו.

4.63.4 נותרו לפני ראיית Staging: Export מורשה עם נתונים, ספק וערכי Pool
חיים, Approval תפעולי, ‏Load/Recovery, ‏Backup/Restore, חלון Cutover
ו־Rollback חתום. הכלי אינו מסמן אף אחד מהם כ־Ready.

4.63.5 שער השחרור המקומי המלא עבר לאחר הוספת ה־Runner. ‏Source guard סרק
559 קבצים ו־35 גרפי Client, ‏Secret hygiene סרק 1,167 קבצים והיסטוריית
Git, ו־Build, ‏TypeScript, ‏ESLint, חוזי D1/PostgreSQL וכל **2,115
הבדיקות** עברו יחד ללא כשל או Skip.

4.64 בדיקת Dependabot חוזרת הוכיחה ששלוש ההתראות הפתוחות שייכות עדיין
ל־`main` הישן, ולא לגרף הנעול בענף העבודה: שתי התראות High של
`image-size@2.0.2` והתראת Moderate של `esbuild@0.18.20`.

4.64.1 בענף העבודה `image-size` אינו קיים ועותקי esbuild הם `0.25.12`
ו־`0.28.1`. ההתראות יישארו פתוחות עד שהשינויים יגיעו לענף ברירת המחדל;
אין לדחות אותן ידנית.

4.64.2 תוקן פער אבחוני בשער ה־Development dependency audit: שגיאת npm
Registry נחסמת כעת בקוד `DEVELOPMENT_DEPENDENCY_AUDIT_REGISTRY_FAILED`
ואינה מסווגת בטעות כ־Advisory לא מאושר. בדיקה שלילית מקבעת את ההבחנה.

4.64.3 Build, ‏TypeScript, ‏ESLint, ‏Dependency Lock, ‏Source Guard,
‏Secret Hygiene וכל **2,116 הבדיקות** עברו. Audit חי לא רוענן משום
שהחיבור ל־npm Registry לא היה זמין; הוא נשאר תנאי חיצוני Fail-closed.
שלושה Attempts של GitHub CI נכשלו לפני Step ראשון בגלל Billing או
Spending limit בחשבון. אין בכך כשל קוד, אך גם אין CI Evidence תקף.

4.65 חוזה Distributed rate limiting של PostgreSQL הורחב מקומית לשלושה
Policy IDs נפרדים: `tenant-mutation`, ‏`system-admin-mutation` ו־
`meta-webhook`. לכל Policy קיימים Environment keys נפרדים עבור Version,
Capacity ו־Refill period. אין Defaults; מצב חסר, חלקי או לא חוקי נכשל סגור.
מפתח ה־Subject נשאר SHA-256 אטום, וה־Policy ID משתתף ב־Advisory lock ובמפתח
הראשי ולכן שלושת ה־Buckets אינם צורכים מכסה זה של זה.

4.65.1 Build, ‏TypeScript, ‏ESLint, חוזה 26 מיגרציות PostgreSQL וכל
**2,119 הבדיקות** עברו ללא כשל, Skip או Todo. חזרה נקייה מול PostgreSQL 16
אמיתי עברה עם `PASS (26 migrations, 58 concurrency scenarios)`; שרת הבדיקה
הזמני נעצר והתיקייה נמחקה.

4.65.2 העבודה המקומית אינה ראיית Production: רק `tenant-mutation` מחובר
כעת ל־Railway API route. עדיין נדרשים חיבור System Admin ו־Meta webhook
ל־Railway routes, ערכי Policy חיים באישור טל והצוות, Telemetry, ‏Load
evidence ותצורת Railway פעילה.

4.66 ‏Railway Meta webhook ingress הושלם מקומית ברמת Route composition.
ה־Publisher משתמש כעת ב־Queue port ספק־נייטרלי; Adapter קטן שומר את חוזה
Cloudflare הקיים עם `contentType: v8`. ה־Railway runtime דורש Meta secrets
ו־Policy `meta-webhook` מלאים, מאמת חתימה, צורך מכסה אטומית, טוען רק WABA
מחובר מ־PostgreSQL ומפרסם לתור לפני החזרת `200`.

4.66.1 ‏Node dispatcher מכיר רק את הנתיב הקשיח `/webhooks/meta`, מעביר
Query של Meta verification ל־Handler ואינו סומך על Host שסיפק הלקוח. כאשר
ה־Composition או Queue adapter חסרים הוא מחזיר `503 WEBHOOK_UNAVAILABLE`
עם `no-store`; אין Fallback ל־D1 ואין סימון Readiness שגוי.

4.66.2 בדיקות חיוביות ושליליות מוכיחות Verification ללא גישה למסד או
לתור, סדר Signature → Rate limit → PostgreSQL connection → Queue, חסימה
לפני מסד, סניטציית כשל Queue ודחיית Options מורחבים. עדיין חסרים בחירת
Queue/DLQ, ‏Adapter חי, Secrets וערכי Policy, ‏Telemetry, ‏Load evidence
ו־Railway staging proof. ‏System Admin route wiring נשאר פער מקומי נפרד.

4.66.3 ‏Build, ‏TypeScript, ‏ESLint וכל **2,127 הבדיקות** עברו ללא כשל,
Skip או Todo. בדיקות היעד עברו `42/42`. ‏Source guard סרק 561 קבצים ו־35
Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene סרק 1,167
קבצים כולל היסטוריית Git ו־Dependency lock אימת 30 תלויות ישירות.
`git diff --check` נשאר נקי.

4.67 ‏System Admin Business Profile מחובר מקומית ל־Railway API כפעולת
Mutation נפרדת: `system-admin.business-profile.update`. הפעולה אינה עוברת
ב־Tenant session resolver ואינה מקבלת Tenant מהזהות הרגילה; היא דורשת
Clerk identity מאומתת שנמצאת ב־Server allowlist ומקבלת Target מפורש רק בשדה
`targetTenantId` הסגור.

4.67.1 לפני PostgreSQL הפעולה מאמתת Operation/Request kind, דורשת מפתח
Idempotency דטרמיניסטי הקשור ל־Payload הקנוני וצורכת מכסה מבודדת מסוג
`system-admin-mutation`. זהות שאינה ב־allowlist, מפתח שאינו תואם, Payload
מורחב, מכסה חסומה או תלות לא זמינה נעצרים ללא כתיבה.

4.67.2 הכתיבה משתמשת ב־PostgreSQL Repository הקיים: נעילת Profile,
`expectedVersion`, זיהוי Retry זהה לפי Event דטרמיניסטי, סנכרון Display name
וכתיבת Event ו־Audit בלתי־משתנים באותה Transaction. התגובה כוללת רק View
ציבורי של הפרופיל ואינה חושפת Tenant ID, ‏External user ID או פרטי מסד.

4.67.3 הרכבת ה־Route אופציונלית רק כאשר גם
`CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS` וגם שלושת ערכי Policy של System
Admin מוגדרים ותקינים. אם שניהם חסרים הפעולה אינה נרשמת; מצב חלקי או לא
חוקי מפיל את ה־Runtime סגור. Build וכל **2,137 הבדיקות** עברו ללא כשל, Skip
או Todo; 22 בדיקות היעד עברו יחד. חזרת PostgreSQL 16 זמנית ונקייה עברה עם
`PASS (26 migrations, 58 concurrency scenarios)` ולאחריה השרת והתיקייה
הזמניים הוסרו. ערכי Allowlist ו־Policy חיים, Telemetry, ‏Load evidence
וראיית Railway Staging עדיין חיצוניים ולא הושלמו. גם פעולת ה־Vercel/React
הקיימת עדיין צריכה לעבור מה־D1 action אל ה־Railway operation לפני Cutover.

4.68 פעולת React/Vercel לעריכת System Admin Business Profile הועברה מקומית
מ־D1 ל־Railway API. קובץ ה־Server Action הפעיל אינו מייבא עוד Runtime D1,
Repository D1 או Cloudflare System Admin rate limiter, ואין בו Fallback
שקט. ה־UI ממשיך לקבל בדיוק את אותו `SystemAdminBusinessProfileActionResult`.

4.68.1 נוסף חוזה `RAILWAY_API_ORIGIN` fail-closed: ‏HTTPS קנוני בלבד ללא
Path, ‏Query, ‏Fragment או Credentials; HTTP מותר רק ל־Loopback וב־
`development`. מצב חסר, חלקי או לא חוקי מוחזר כ־`configuration-required`
לפני Identity או Network.

4.68.2 ‏Clerk session token מתקבל בזמן הבקשה מ־`auth().getToken()` ו־Vercel
OIDC token מתקבל מ־`@vercel/oidc` הרשמי. Resolver טהור מפריד בין Signed-out
לבין Dependency unavailable, דורש שני JWTs תחומים ואינו מחזיר טוקן חלקי.
ה־Framework adapter מבודד מהלוגיקה הנבדקת ואינו קורא ידנית
`VERCEL_OIDC_TOKEN`.

4.68.3 ה־BFF מנרמל את קלט הפרופיל, גוזר מפתח Idempotency מתוכן Canonical,
שולח רק `targetTenantId`, ‏`expectedVersion` ושלושת שדות הפרופיל, ומאמת
Response מול הפרופיל המבוקש, Version ו־timestamps לפני עדכון React state.
עדיין חסרים Origin ו־OIDC חיים, פריסת Railway/Vercel וראיית Staging; העבודה
המקומית אינה מסמנת Cutover או Production readiness.

4.68.4 ‏Build, ‏TypeScript, ‏ESLint וכל **2,153 הבדיקות** עברו ללא כשל,
Skip או Todo. בדיקות היעד עברו `39/39`, ולאחר עדכון רשימת גבולות האימות
נבדקו שוב `19/19` תרחישי Boundary ו־Identity. ‏Source guard סרק 566 קבצים
ו־35 Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene סרק
1,172 קבצים כולל היסטוריית Git ו־Dependency lock אימת 31 תלויות ישירות.
התקנת `@vercel/oidc@3.8.4` דיווחה על אפס חולשות ו־`git diff --check` עבר.

4.69 ארבע פעולות React/Vercel לניהול System Admin Tenant Subscription
הועברו מקומית מ־D1 ל־Railway API ללא Fallback: יצירה, הארכה, שינוי סטטוס
וביטול. כל פעולה משתמשת ב־Operation ID וב־Payload מצומצמים משלה, ומפתח
Idempotency נגזר מה־Operation ומהתוכן הקנוני. ה־Server Action הפעיל אינו
מייבא עוד Runtime D1, ‏D1 Repository או Cloudflare mutation session.

4.69.1 ‏Railway מאמת Vercel OIDC ו־Clerk session, דורש System Admin
Allowlist, צורך מכסת `system-admin-mutation` עם Operation ID ב־Subject ורק
אז קורא ל־PostgreSQL Repository. ה־Repository נועל את הרשומה, בודק Version,
מסנכרן Tenant status וכותב Subscription event בלתי־משתנה באותה Transaction.
Actor ו־timestamp נגזרים בצד השרת ואינם מתקבלים מ־Vercel.

4.69.2 תגובת Railway אינה כוללת Tenant ID או Audit identity. ה־BFF מאמת
Status, ‏Window, ‏Cancellation timestamp, ‏Version והתאמה לפעולה לפני החזרת
`saved` ל־React. נוסף לחוזה קוד `INVALID_TRANSITION` שמוחזר כ־`409` ונשמר
כסטטוס UI נפרד. ארבעת ה־Operations אינם עוברים דרך Tenant membership
resolver, ותלויות Runtime מוקרנות בנפרד כדי לחסום Options מורחבים.

4.69.3 ‏Build, ‏TypeScript, ‏ESLint וכל **2,170 הבדיקות** עברו ללא כשל,
Skip או Todo; בדיקות היעד עברו `90/90`. ‏Source guard סרק 568 קבצים ו־35
Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene סרק 1,179
קבצים כולל היסטוריית Git ו־Dependency lock אימת 31 תלויות ישירות.
`git diff --check` עבר. עדיין חסרים Origin, ‏OIDC, ‏Allowlist ו־Policy חיים,
פריסת Railway/Vercel וראיית Staging; לכן אין עדיין טענת Production cutover.

4.70 מרכז החלטות ה־Production של System Admin הועבר מקומית במלואו מ־D1
ל־Railway API ול־PostgreSQL ללא Fallback. הקריאה והשמירה חולקו ל־Operations
נפרדים. ה־Query דורשת Allowlist אך אינה צורכת מכסת Mutation; השמירה דורשת
Allowlist, מפתח Idempotency דטרמיניסטי ומכסת `system-admin-mutation` לפני
Repository access.

4.70.1 ‏PostgreSQL מגביל Check IDs לאותו Registry שמשמש את
`productionReadiness`, נועל רשומה, אוכף `expectedVersion`, מזהה Retry זהה
וכותב Event בלתי־משתנה. Actor ו־timestamp נגזרים בצד Railway ואינם מתקבלים
מ־Vercel. התגובה כוללת רק Check ID, ‏Selection, ‏Rationale, ‏Version
ו־timestamps; ‏External user ID ו־Event key אינם חוצים את הגבול.

4.70.2 ‏Vercel handler אחד משרת את ה־Loader ואת ה־Server Action, מאמת
Registry membership, רשימה ללא כפילויות, תוכן מנורמל, Version ו־timestamps
לפני הצגה או עדכון React state. שני קובצי ה־Runtime הפעילים אינם מייבאים עוד
D1 repository, ‏Runtime database או Cloudflare System Admin session. בדיקות
Boundary מקבעות את ההפרדה.

4.70.3 ‏Build, ‏TypeScript, ‏ESLint וכל **2,187 הבדיקות** עברו ללא כשל,
Skip או Todo; בדיקות היעד עברו `41/41`. ‏Source guard סרק 571 קבצים ו־35
Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene סרק 1,184
קבצים כולל היסטוריית Git ו־Dependency lock אימת 31 תלויות ישירות.
`git diff --check` עבר. עדיין חסרים Origin, ‏OIDC, ‏Allowlist ו־Policy חיים,
פריסת Railway/Vercel וראיית Staging; אין עדיין טענת Production cutover.

4.71 ספריית ה־Tenants של System Admin הועברה מקומית במלואה מ־D1 ל־Railway
API ול־PostgreSQL ללא Fallback. ‏Operation יחידה לקריאה בלבד מקבלת Cursor,
חיפוש, סטטוס Tenant ומצב Subscription, דורשת Allowlist ומעבירה ל־Repository
רק Query מנורמלת. היא אינה פותרת Tenant membership ואינה צורכת מכסת
`system-admin-mutation`.

4.71.1 ‏PostgreSQL Repository הקיים מחזיר עד 50 רשומות בסדר עולה עם
Keyset cursor. תגובת Railway מחליפה את שדה ה־Tenant הפנימי ב־
`targetTenantId`, ואינה כוללת External user ID, ‏Audit actor או פרטי מסד.
ה־Vercel handler מאמת מחדש את כל מפתחות התגובה, מזהים, Profile,
Subscription, ‏Status, ‏Version, ‏timestamps, סדר, Cursor והתאמה ל־Filters
לפני החזרת View ל־React.

4.71.2 גם טעינת עמוד Admin הראשונה וגם חיפוש, Filter ו־Pagination משתמשים
באותו Handler ובאותו Railway operation. שני קובצי ה־Runtime הפעילים אינם
מייבאים עוד D1 repository, ‏Runtime database או System Admin session מקומי;
בדיקת Boundary מקבעת שאין Fallback. שכבות D1 הישנות נשארו כרגע כקוד Legacy
לא פעיל עד להסרה מבוקרת נפרדת.

4.71.3 ‏Build, ‏TypeScript, ‏ESLint וכל **2,202 הבדיקות** עברו ללא כשל,
Skip או Todo; בדיקות היעד עברו `41/41`. ‏Source guard סרק 574 קבצים ו־35
Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene סרק 1,190
קבצים כולל היסטוריית Git ו־Dependency lock אימת 31 תלויות ישירות.
`git diff --check` עבר. עדיין חסרים Origin, ‏OIDC ו־Allowlist חיים, פריסת
Railway/Vercel וראיית Staging; אין עדיין טענת Production cutover.

4.72 ‏Operational Reports הועברו מקומית במלואם מ־D1 ל־Railway API
ול־PostgreSQL ללא Fallback. ה־Railway operation `reports.read` שהיה קיים
מחובר כעת גם לטעינת עמוד Reports הראשונה וגם ל־Server Action של שינוי טווח.
ה־Payload מכיל רק שני תאריכי UTC; Tenant, ‏Membership, ‏Selection והרשאת
`reports.read` נגזרים ונבדקים בצד Railway.

4.72.1 תגובת ה־Operation צומצמה מ־Repository result ל־
`OperationalReportView`, כך שחלון `startAt/endAt` ושדות פנימיים אינם חוזרים
ל־Vercel. ה־BFF דורש Response בעלת מפתחות מדויקים, Period תואם, timestamp
קנוני, מונים שלמים ולא־שליליים, סכומי קטגוריות עקביים ו־AI usage מסודר ללא
Currency כפולה. Response מורחבת, סותרת או לא קנונית נכשלת לפני React state.

4.72.2 כדי לשמר את התנהגות ה־UI, חוזה Railway v1 הורחב באופן תואם לאחור
בשלושה Failure codes: ‏`TENANT_MEMBERSHIP_REQUIRED`,‏
`TENANT_SELECTION_REQUIRED` ו־`PERMISSION_DENIED`. כולם מוחזרים כ־HTTP 403,
אך ה־BFF ממפה אותם בנפרד ל־Onboarding, בחירת Workspace או חסימת הרשאה.
‏System Admin ממשיך להשתמש ב־`AUTHORIZATION_DENIED` ואינו מושפע.

4.72.3 ‏Build, ‏TypeScript, ‏ESLint וכל **2,215 הבדיקות** עברו ללא כשל,
Skip או Todo; בדיקות היעד עברו `95/95`. ‏Source guard סרק 576 קבצים ו־35
Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene סרק 1,196
קבצים כולל היסטוריית Git ו־Dependency lock אימת 31 תלויות ישירות.
עדיין חסרים Origin, ‏OIDC, Clerk ו־PostgreSQL חיים, פריסת Railway/Vercel
וראיית Staging; אין עדיין טענת Production cutover.

4.73 טעינת Contact Directory הועברה מקומית מ־D1 ל־Railway API
ול־PostgreSQL ללא Fallback. גם הקריאה הראשונית של מסך Contacts וגם פעולת
“טען עוד” משתמשות ב־`contacts.list`. ה־Payload כולל רק Cursor חיובי או
`null`; ‏Tenant, ‏Membership, ‏Selection והרשאת `contacts.read` נגזרים
ונבדקים בצד Railway.

4.73.1 ה־Operation מחזירה יחד את עד 50 אנשי הקשר ואת Snapshot ה־Tags,
ה־Lists והשיוכים עבור אותם Contact IDs. ה־BFF מאמת Response בעלת מפתחות
מדויקים, IDs חיוביים וייחודיים בסדר יורד, Cursor של דף מלא, פרופיל ו־Consent
timestamps קנוניים, Scope זהה לדף ו־Relationships מסודרים שאינם מצביעים
מחוץ ל־Scope או לקבוצה חסרה. Response מורחבת, כפולה, לא מסודרת או חוצת־Scope
נכשלת לפני React state.

4.73.2 `currentContacts.ts` אינו מייבא עוד Runtime D1, ‏D1 repositories או
Tenant session מקומי. גם גוף `loadMoreContactsAction` עובר ישירות דרך ה־
Railway handler; בדיקת Boundary מקבעת שאין בו Fallback. פעולות שמירת Contact,
תיעוד Consent ושינוי Tags/Lists עדיין משתמשות במסלול Mutation הקיים ויועברו
בנפרד עם Idempotency, ‏Rate limiting ו־Audit מתאימים.

4.73.3 ‏Build, ‏TypeScript, ‏ESLint וכל **2,226 הבדיקות** עברו ללא כשל,
Skip או Todo; בדיקות היעד עברו `43/43`. ‏Source guard סרק 579 קבצים ו־35
Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene סרק 1,200
קבצים כולל היסטוריית Git ו־Dependency lock אימת 31 תלויות ישירות.
`git diff --check` עבר. עדיין חסרים Origin, ‏OIDC, Clerk ו־PostgreSQL חיים,
פריסת Railway/Vercel וראיית Staging; אין עדיין טענת Production cutover.

4.74 שמירת Contact profile הועברה מקומית מ־D1 ל־Railway API ול־PostgreSQL
ללא Fallback. ‏`saveContactAction` מנרמל את חמשת שדות הפרופיל, משתמש ב־Vercel
OIDC וב־Clerk session בצד השרת ושולח `contacts.save`; ‏Tenant וזהות Actor
נגזרים ב־Railway ואינם מתקבלים מה־Browser או מ־Vercel payload.

4.74.1 לכל Submit מוצמד `submissionOccurredAt` קנוני ומונוטוני שנוצר פעם
אחת לפני הפעלת ה־Server Action. הוא אינו זמן עסקי ואינו זמן Audit; הוא מבדיל
פעולה חדשה מ־Retry של אותה בקשה בלי Randomness. מפתח ה־Idempotency נגזר מכל
ה־Payload ונבדק מחדש ב־Railway לפני Rate limit או Persistence. כך Retry זהה
נשאר Replay, אך שמירה חדשה של אותו פרופיל אינה מקבלת Contact response ישנה.

4.74.2 Railway אוכף Permission, צורך מכסת `tenant-mutation`, משווה Request
digest ושומר Receipt, ‏Contact upsert, ‏Audit ו־Replay response באותה
Transaction. ה־BFF מקבל רק Response מדויקת עם Replay flag ו־Contact קנוני
התואם לפרופיל שנשלח. Response מורחבת, סותרת או בעלת שדה פנימי נכשלת לפני
React state. פעולות Consent ו־Tags/Lists נשארו במסלול D1 הקיים עד שיוגדרו
להן Operations אטומיים נפרדים.

4.74.3 ‏Build, ‏TypeScript, ‏ESLint וכל **2,236 הבדיקות** עברו ללא כשל,
Skip או Todo; בדיקות היעד עברו `43/43`. ‏Source guard סרק 581 קבצים ו־35
Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene סרק 1,208
קובצי Working tree כולל היסטוריית Git ו־Dependency lock אימת 31 תלויות ישירות.
`git diff --check` עבר. עדיין חסרים Origin, ‏OIDC, Clerk, ‏PostgreSQL וערכי
Rate-limit policy חיים, פריסת Railway/Vercel וראיית Staging; אין עדיין טענת
Production cutover.

4.74.4 שער Secret hygiene הוקשח לאחר שהתגלה כי `git ls-files` לבדו אינו
כולל קבצים חדשים שטרם נוספו ל־Git. השער מאחד כעת קבצים מנוהלים עם קובצי
Working tree שאינם מנוהלים ואינם מוחרגים, סורק את שמם ואת תוכנם, ובנפרד
סורק את היסטוריית Git. באימות הנוכחי נסרקו **1,208 קובצי Working tree** —
1,205 מנוהלים ושלושת קובצי המימוש החדשים — והיסטוריית Git; בדיקת Regression
מקבעת שגם קובץ חדש נכלל במלאי הסריקה.

4.75 פעולות מתן הסכמה והסרה מרשימת דיוור של Contact הועברו מקומית מ־D1
ל־Railway API ול־PostgreSQL ללא Fallback. נוספו שתי Operations נפרדות:
`contacts.consent.grant` ו־`contacts.consent.unsubscribe`. ה־Payload מכיל רק
Contact ID, מקור, זמן האירוע והפניה לראיה; Tenant וזהות Actor נגזרים בצד
Railway ואינם מתקבלים מה־Browser או מ־Vercel.

4.75.1 ‏Railway מאמת Vercel OIDC ו־Clerk session, דורש `contacts.write`,
צורך מכסת `tenant-mutation` ורק אז מפעיל את שירות ה־Consent. מפתח הבקשה
נגזר באופן דטרמיניסטי מה־Operation ומה־Payload הקנוני. מנגנון ה־Replay נשען
על Domain event בלתי־משתנה שמפתחו כולל Tenant, ‏Actor, ‏Contact, פעולה
וראיה, ונכתב באותה Transaction עם הקרנת מצב ה־Contact. זה אינו API receipt:
Retry מחזיר את מצב ה־Contact התקף כעת ולכן התגובה אינה מציגה `replayed`.

4.75.2 ה־BFF מאמת גבולות אורך ותווי בקרה, שולח רק Payload מדויק ומקבל רק
`Contact` קנוני שמזההו תואם לבקשה. קודי כשל מוכרים ממופים לתוצאה מצומצמת;
Response מורחבת, סותרת או חוצת Contact נכשלת לפני React state. כל
`contactActions.ts` משתמש כעת ב־Railway לקריאה, שמירת פרופיל ושינוי Consent,
ואינו מייבא Runtime D1, ‏D1 repositories או Tenant session מקומי.

4.75.3 ‏TypeScript, ‏ESLint וכל **2,247 הבדיקות** עברו ללא כשל, Skip או
Todo. בדיקות היעד עברו `69/69`, ובדיקות Boundary ו־Authentication ממוקדות
עברו `5/5`. ‏Source guard סרק 583 קבצים ו־35 Client graphs, ‏Interface
guard עבר 15 בדיקות, ‏Secret hygiene סרק 1,211 קובצי Working tree — 1,208
מנוהלים ושלושה חדשים — כולל היסטוריית Git, ו־Dependency lock אימת 31
תלויות ישירות. `git diff --check` עבר. עדיין חסרים Origin, ‏OIDC, Clerk,
PostgreSQL וערכי Rate-limit policy חיים, פריסת Railway/Vercel וראיית
Staging; אין עדיין טענת Production cutover.

4.76 ארבע פעולות Contact organization הועברו מקומית מ־D1 ל־Railway API
ול־PostgreSQL ללא Fallback: שמירת Tag, שמירת List, הגדרת Tag assignment
והגדרת List membership. ה־Payloads אינם מקבלים Tenant או Actor; השניים
נגזרים מ־Clerk session, ‏Membership ו־Selection בצד Railway. שמות Group
מוגבלים ל־128 תווים ללא תווי בקרה, ו־Assignment דורש שלושה שדות מדויקים.

4.76.1 לכל פעולה מפתח Idempotency דטרמיניסטי הנבדק מחדש לפני צריכת מכסת
`tenant-mutation`. ‏Receipt claim, שינוי ה־Domain, קריאת Snapshot, ‏Audit
בלתי־משתנה ושמירת Replay response מבוצעים באותה PostgreSQL Transaction.
‏node-postgres adapter הורחב באופן מפורש ל־`repeatable-read`, כך שכל שאילתות
ה־Snapshot רואות תמונת מסד עקבית יחד עם כתיבת הפעולה. ‏Conflict, יעד חסר
ותלות לא זמינה נשמרים כתוצאות נפרדות ונכשלים באופן סגור.

4.76.2 ה־Vercel BFF מקבל רק Replay flag בוליאני ו־Organization snapshot
קנוני: Scope ריק לאחר שמירת Group או Contact יחיד לאחר שינוי Relationship.
Response מורחבת, Relationship חוצה־Scope או Group/Contact לא תקינים נדחים
לפני React state. בדיקת Failure path חשפה ותיקנה סיווג Audit שגוי של
`tag-assignment` כ־`list-membership`. קובץ ה־Server Actions הפעיל אינו מייבא
עוד Runtime D1, ‏D1 repository או Tenant mutation session מקומי.

4.76.3 ‏Build, ‏TypeScript, ‏ESLint וכל **2,268 הבדיקות** עברו ללא כשל,
Skip או Todo; בדיקות היעד עברו `86/86`. ‏Source guard סרק 588 קבצים ו־35
Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene סרק 1,219
קובצי Working tree — 1,211 מנוהלים ושמונה חדשים — כולל היסטוריית Git,
ו־Dependency lock אימת 31 תלויות ישירות. `git diff --check` עבר. עדיין
חסרים Origin, ‏OIDC, Clerk, ‏PostgreSQL וערכי Rate-limit policy חיים,
פריסת Railway/Vercel וראיית Staging; אין עדיין טענת Production cutover.
