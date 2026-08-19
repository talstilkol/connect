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
