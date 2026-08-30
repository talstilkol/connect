# מצב השלמה ומשימות מקומיות

תאריך בדיקה אחרון: 2026-08-24

מקור האמת הקצר למצב הנוכחי הוא
[`current-audit-and-forward-plan-2026-08-24.md`](current-audit-and-forward-plan-2026-08-24.md).
המשך המסמך הוא יומן Evidence היסטורי מצטבר.

## 1. אחוזי השלמה

1.1 תוכנית ה־Baseline המקומית המקורית: **100%**.

1.1.1 כל 14 שלבי ה־Master Plan הושלמו בקוד המקומי.

1.1.2 Build, ‏TypeScript, ‏ESLint וכל בדיקות השער המקומי עוברים.
מספר הבדיקות המדויק מתעדכן לאחר כל הרחבת אפיון ואינו תנאי להגדרת
ה־Baseline המקורי.

1.1.3 נתון זה אינו אומר שכל דרישות ה־PDF הושלמו. מטריצת הכיסוי
המדויקת נמצאת ב־`docs/product-specification-traceability.md`.

1.2 מוכנות פורמלית ל־Production: **14.7%**.

1.2.1 חמש מתוך 34 בדיקות ה־Production Readiness הן `ready`.

1.2.2 18 בדיקות חסומות על תצורה, ספק, תשתית או Evidence חיצוני.

1.2.3 11 בדיקות ממתינות להחלטת מוצר או מדיניות.

1.3 אין אחוז יחיד אמין לכל הדרך מהאפיון עד Best-in-class.

1.3.1 בסיס הקוד המקומי של המוצר הנוכחי: **80%–85%**, אומדן.

1.3.2 מוכנות ל־Closed Pilot מוכח: **30%–40%**, אומדן.

1.3.3 השלמת חזון Best-in-class: **15%–25%**, אומדן.

1.3.4 נתון ה־Production הפורמלי, **14.7%**, מדויק לשער הקיים אך עדיין
כולל D1/R2 מהארכיטקטורה הישנה. יש לחשבו מחדש לאחר Readiness Registry v2.

1.3.5 הנתון ההיסטורי `92% ±4%` מבוטל כמדד לכל התוכנית. הוא תיאר
בעיקר מאמץ מקומי בהיקף מצומצם ולא שקלל נכון Staging, ספקים, Evidence
ועשרת שלבי המוצר שאחרי Pilot.

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
בגרסה 1 הכולל רק סטטוס, מונים ו־`id/status/code` עבור 34 השערים.
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

4.77 ‏Contact Import הועבר מקומית מ־D1 ל־Railway API ול־PostgreSQL ללא
Fallback. נוספו שתי Operations נפרדות: `contacts.import.start` לפתיחת Job
או Replay שלו, ו־`contacts.import.chunk` לעיבוד עד שישה Rows. ה־Payloads
מקבלים רק File metadata, ‏Digest, ‏Mapping או Job/Rows; ‏Tenant, ‏Actor,
Membership והרשאת `contacts.write` נגזרים ונבדקים בצד Railway.

4.77.1 לכל בקשה מפתח Idempotency דטרמיניסטי הנבדק מחדש לפני צריכת מכסת
`tenant-mutation`. ‏Chunk נועל את Job לפני העיבוד כדי לסדר בקשות מקבילות.
פתיחת Job או עיבוד כל ה־Chunk, כתיבת Contact ו־Import outcomes, רענון מונים,
Audit בלתי־משתנה ושמירת Replay response מתבצעים באותה PostgreSQL Transaction
ברמת `repeatable-read`. ‏Conflict, ‏Job חסר ותלות לא זמינה נשמרים כמצבים
נפרדים; כשל בכל כתיבה מבטל את כל הפעולה.

4.77.2 ה־Vercel BFF מאמת Input בעל מפתחות מדויקים ותגובה הכוללת רק Replay
flag, ‏Job summary ועד שישה Contact records קנוניים. תגובה מורחבת, מונים
סותרים או Consent state לא עקבי נדחים לפני React state. קובץ ה־Server
Actions הפעיל אינו מייבא עוד Runtime D1, ‏D1 repository או Tenant mutation
session מקומי. בנוסף, הודעת Service ישנה שהזכירה D1 הוחלפה בניסוח
Provider-neutral.

4.77.3 ‏Build, ‏TypeScript, ‏ESLint וכל **2,281 הבדיקות** עברו ללא כשל,
Skip או Todo; בדיקות היעד עברו `70/70`. ‏Source guard סרק 594 קבצים ו־35
Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene סרק 1,227
קובצי Working tree — 1,219 מנוהלים ושמונה חדשים — כולל היסטוריית Git,
ו־Dependency lock אימת 31 תלויות ישירות. `git diff --check` עבר. עדיין
חסרים Origin, ‏OIDC, Clerk, ‏PostgreSQL וערכי Rate-limit policy חיים,
פריסת Railway/Vercel וראיית Staging; אין עדיין טענת Production cutover.

4.78 ‏Message Template Directory ו־Draft Save הועברו מקומית מ־D1 ל־Railway
API ול־PostgreSQL כיחידה אחת. במהלך הבדיקה אותר ש־Save בלבד היה יוצר
Split-brain: הטיוטה הייתה נכתבת ל־PostgreSQL אך נטענת לאחר Refresh מ־D1.
לכן נוספו `templates.list` ו־`templates.draft.save`, ושני מסלולי ה־UI משתמשים
כעת באותו מקור אמת ללא D1 fallback.

4.78.1 ‏List דורשת `templates.read`, מחזירה עד 100 DTOs קנוניים ומאמתת
מפתחות ייחודיים, סדר `updatedAt DESC, templateKey ASC`, ‏Lifecycle וזמנים.
‏Save דורשת `templates.write`, מכסת `tenant-mutation` ומפתח Idempotency
דטרמיניסטי. ‏Receipt, כתיבת Draft, ‏Audit ושמירת Replay response אטומיים
ב־Transaction ברמת `repeatable-read`; ‏Conflict, ‏Draft נעול וכשל תלות
ממופים בנפרד בלי לחשוף פרטי Database.

4.78.2 ‏Vercel BFF מאמת Payload ותגובה בעלי מפתחות מדויקים, חוסם Tenant,
Actor, ‏Meta identifiers ושדות Lifecycle מהדפדפן, ודוחה Response מורחב,
כפול, לא מסודר או לא קנוני. ‏Foundation כולל כעת 42 Adapters. ‏Submit ו־Sync
לא הועברו: ה־Server Actions נכשלים סגור והכפתורים מושבתים עם הסבר נגיש
בשלוש שפות. Runtime מאובטח חדש כבר מרכיב Railway/PostgreSQL repositories,
מעטפת Credential מוצפנת ו־Graph adapters בלי לחשוף Secret. הפעולות אינן
נרשמות כ־Ready עד השלמת Outbox, ‏Audit והתאוששות אטומיים סביב Side effect
חיצוני.

4.78.3 ‏Build וכל **2,302 הבדיקות** עברו ללא כשל, Skip או Todo; בדיקות
היעד עברו `72/72`, ובדיקות ה־Fail-closed והנגישות החדשות עברו `3/3`.
‏TypeScript ו־ESLint עברו ללא שגיאות או אזהרות. ‏Source guard סרק 601
קבצים ו־35 Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene
סרק 1,238 קובצי Working tree — 1,219 מנוהלים ו־19 חדשים — כולל היסטוריית
Git, ו־Dependency lock אימת 31 תלויות ישירות. `git diff --check` עבר.
עדיין חסרים Origin, ‏OIDC, Clerk, ‏PostgreSQL וערכי Rate-limit policy חיים,
חוזה Outbox/Audit/Recovery עבור פעולות Meta, פריסת Railway/Vercel וראיית
Staging; אין טענת Production cutover.

4.79 נוסף Runtime מאובטח בצד Railway לפעולות Message Template מול Meta.
הוא דורש יחד Graph API version מפורש ומפתח AES-GCM תקין, מחבר את Repository
התבניות, חיבור Meta ומעטפת ה־Credential של PostgreSQL אל Submit/Sync,
ומחזיר רק שני Services ללא Repository, ‏Token או Secret. מצב Disabled,
Configuration חלקי, Dependencies חסרים או Option מורחב נכשלים סגור.

4.79.1 מבחן אינטגרציה מקומי שומר Token במעטפה מוצפנת, מפענח אותו רק בתוך
Callback השרת, מאמת שהוא נשלח ל־Meta רק ב־Authorization header ושאינו מופיע
ב־Runtime המסודר. ‏Build וכל **2,305 הבדיקות** עברו ללא כשל, Skip או Todo;
בדיקות היעד עברו `18/18`. ‏TypeScript ו־ESLint עברו, ‏Source guard סרק 602
קבצים ו־35 Client graphs, ‏Interface guard עבר 15 בדיקות, ‏Secret hygiene
סרק 1,240 קובצי Working tree — 1,219 מנוהלים ו־21 חדשים — כולל היסטוריית
Git, ‏Dependency lock אימת 31 תלויות ישירות ו־`git diff --check` עבר.
הכפתורים נשארים מושבתים בכוונה: ה־Runtime פותר את גבול ה־Secret, אך עדיין
נדרש Outbox אטומי הקושר Request, ‏Template version, ‏Meta connection version,
‏Audit ותוצאת התאוששות לפני פתיחת Side effect ב־API הציבורי.

4.80 חוזה Message Template submission הבטוח הושלם מקומית ללא פתיחת ה־UI.
‏Operation `templates.submit` מעבירה רק Draft key/version ו־Submission key
דטרמיניסטי. ‏Railway פותר Tenant, ‏Actor, הרשאה וחיבור Meta בצד השרת;
Receipt, ‏Template claim, ‏Outbox, אירוע `staged`, ‏Audit ו־Replay response
נשמרים יחד ב־Transaction ברמת `repeatable-read`. ה־Vercel BFF מאמת מבנה
מדויק ואינו מחזיר Tenant, ‏WABA, ‏Meta connection version או Credential.

4.80.1 ‏Migration `0026_message_template_submission_outbox.sql` מגדירה
State machine תחום: `pending → submitting → submitted|rejected|ambiguous`
ו־`ambiguous → submitted|rejected`. ‏Constraints, ‏Triggers ואירועים
בלתי־משתנים מונעים שינוי Identity, דילוג Version או שינוי מצב ללא Evidence
תואם. ה־Repository נועל Outbox, חיבור ותבנית יחד; שינוי WABA, ‏Connection
version, ‏Graph API version או Template claim חוסם את הפעולה לפני Meta.

4.80.2 ‏Worker מבצע לכל היותר Provider POST אחד. תוצאה ידועה נסגרת אטומית;
Timeout, כשל רשת, Response לא תקין או Claim שני עוברים ל־`ambiguous` בלי
Retry של ה־POST. Reconciliation נפרד קורא בלבד את רשימת התבניות מ־Meta,
מקבל רק התאמה יחידה של `name+language+category`, ודוחה בחירה שרירותית בין
כפילויות. אפס התאמות משחרר את ה־Draft רק אחרי חלון חסד של 15 דקות; שגיאת
Credential או Provider נשארת `deferred` ואינה נחשבת הוכחה לאי־שליחה.

4.81 נוסף Maintenance cycle ספק־נייטרלי. PostgreSQL מחזיר לכל היותר 100
Candidates מסודרים, והמחזור מפרסם לכל היותר 10 הודעות `pending` ומיישב עד
10 רשומות `ambiguous` באופן סדרתי. פרסום Queue הוא At-least-once; Claim
אטומי לפני ה־POST הוא גבול ה־Idempotency ולכן Duplicate delivery אינו יוצר
שליחה כפולה. כשל Reconciliation בפריט אחד נספר ואינו עוצר את יתר הפריטים.

4.81.1 ‏Registry המיגרציה כולל כעת 19 יכולות, ובהן יכולת נפרדת
`queue.message-template-submission`. ה־Registry של PostgreSQL כולל 27
Migrations, מהן חמש Railway-only, וה־Foundation כולל 44 Adapters. לא נבחר
ספק Queue/DLQ ולא נכתב Adapter מדומה. עדיין נדרשים Publisher אמיתי, חיבור
ה־Maintenance cycle ל־Scheduler executable, ‏Retry/DLQ policy, ‏Telemetry,
Credentials, הרצת Migration 0026 מול PostgreSQL חי וראיית Railway Staging.
ה־UI נשאר מושבת בכוונה עד שכל אלה מוכחים.

4.81.2 ‏Build וכל **2,357 הבדיקות** עברו ללא כשל, Skip או Todo; בדיקות
ההקשחה האחרונות עברו `14/14`. במהלך ה־Full gate אותרו ותוקנו שתי
סתירות: רשימת הטבלאות Railway-only לא כללה את שתי טבלאות ה־Outbox, ובדיקת
הלוקליזציה עדיין ציפתה ל־17 תוצאות Submit במקום 18. לאחר התיקון הריצה
המלאה עברה מחדש. ‏TypeScript, ‏ESLint ו־`git diff --check` עברו.

4.81.3 ‏Source guard סרק 617 קבצים ו־35 Client graphs; ‏Interface guard
עבר 15 בדיקות; ‏Secret hygiene סרק 1,268 קובצי Working tree — 1,219
מנוהלים ו־49 חדשים — כולל היסטוריית Git; ‏Dependency lock אימת 31 תלויות
ישירות; Drizzle validation עבר עבור 36 Migrations; ‏PostgreSQL contract
ו־parity עברו עבור 27 Migrations ו־51 טבלאות D1. אין
`CONNECT_POSTGRES_INTEGRATION_URL`, ולכן אין לייחס לתוצאות אלה הרצת
Migration 0026 או Concurrency proof מול PostgreSQL חי.

4.82 ‏Maintenance cycle של Message Template submissions מחובר כעת ללולאת
ה־Railway Worker הדקתית, תחת אותו Lease מגודר שמפעיל Campaigns ופקיעת
הזמנות צוות. המשימה של התבניות אופציונלית ברמת ה־Composition: ללא Environment
מלא ו־Queue publisher מפורש היא אינה נוצרת, ואי אפשר להסיק מכך שספק Queue
נבחר או ש־Provider side effects מוכנים. כאשר היא מחוברת, כשל שלה משאיר את
ה־Tick לא מושלם ואינו נבלע כ־Success.

4.82.1 ‏`createRailwayPostgresWorkerService` מרכיב את ה־Maintenance runtime
מאותו PostgreSQL Foundation ומאותם Repositories של Outbox, תבניות ומעטפות
Credential. השעון משותף ל־Scheduler ולסריקות, ו־Close נשאר חד־פעמי על אותו
Pool. בדיקות שליליות דוחות Publisher חסר, Task לא תקין ואפשרויות מורחבות;
בדיקה ייעודית מוכיחה שה־Tick מושלם רק אחרי משימת התחזוקה.

4.82.2 ‏Build וכל **2,360 הבדיקות** עברו ללא כשל, Skip או Todo. בדיקות
היעד עברו `15/15`, ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. נותרו
בחירת Queue/DLQ, מימוש Publisher/Consumer adapters חיים, ‏Retry/DLQ policy,
Sink תפעולי חי, הרצת Migration 0026 ותרחישי מרוץ מול PostgreSQL חי, חשבון Meta
מורשה, ערכי Secrets/Origin/OIDC/Clerk/Rate limits, פריסת Railway/Vercel
וראיית Staging. לכן ה־UI נשאר מושבת ואין טענת Production readiness.

4.83 נוספה Telemetry תחומה ל־Message Template submission maintenance.
אירוע גרסה 1 כולל רק Outcome, זמנים ותשעה מונים: Candidates, ‏Published,
Resolved, ‏Deferred, ‏Duplicates, ‏Missing ו־Failed. הוא אינו כולל Tenant,
‏WABA, ‏Template/Submission keys, ‏Payload או Credential. מבנה מורחב, מונה
שלילי, זמן סותר או תוצאת Sink לא מוכרת נדחים כ־`unavailable`.

4.83.1 ‏Railway PostgreSQL Worker דורש כעת `telemetrySink` מפורש בכל פעם
ש־Template maintenance מופעל. ה־Observer שומר את תוצאת ה־Runner ללא שינוי;
כשל Sink אינו מפיל עבודה תקינה, וכשל Runner נרשם במונים מאופסים ומועבר
ל־Scheduler כדי שה־Tick לא יסומן כהצלחה. עדיין לא נבחר Sink תפעולי ואין
לייחס לחוזה המקומי Monitoring או Alerting חיים.

4.83.2 ‏Build וכל **2,362 הבדיקות** עברו ללא כשל, Skip או Todo; בדיקות
Telemetry, ‏Worker composition ו־Hosting Registry הממוקדות עברו `22/22`.
‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ה־Registry אינו מציג עוד
את חיבור ה־Scheduler או חוזה ה־Telemetry כחסרים, אך ממשיך לחסום Cutover עד
בחירת Queue/DLQ publisher ו־Telemetry sink חיים, ‏Migration rehearsal,
Credentials, ‏Load evidence ו־Railway Staging proof.

4.84 נוסף Railway Worker bootstrap ספק־נייטרלי. הוא מקבל Environment בעל
מפתח יחיד `RAILWAY_WORKER_SCHEDULER_OWNER_KEY`, דורש Owner key אטום בפורמט
הקיים, מרכיב Service לפני Process ומחזיר Controller רק לאחר Start מוצלח.
Environment חסר, מורחב או לא חוקי נכשל לפני יצירת Service.

4.84.1 כשבניית ה־Process או Start נכשלים, ה־Service נסגר פעם אחת גם אם
ה־Close עצמו נכשל. פרטי השגיאה המקוריים אינם יוצאים מהגבול. ארבעת Hooks של
PostgreSQL/Scheduler telemetry עטופים כך שכשל Sink אינו שולט ב־Lifecycle.
ה־Bootstrap אינו כולל Default factory ואינו בוחר Queue/DLQ או Monitoring
sink; ‏Executable קשור־ספק יתווסף רק לאחר החלטה ואספקת Adapter אמיתי.

4.84.2 ‏Build וכל **2,368 הבדיקות** עברו ללא כשל, Skip או Todo. בדיקות
Bootstrap, ‏Process, ‏Worker service ו־Hosting Registry הממוקדות עברו
`17/17`; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ה־Registry מציג
כעת את ה־Bootstrap המקומי כהשלמה, אך משאיר את היכולת `adapter-required`
עד קיום Queue adapter, ‏Telemetry sink, ‏Executable entry point ותצורת
Railway חיים.

4.85 נוסף Railway Worker executable composition root ספק־נייטרלי. הוא
קושר Environment, ‏PostgreSQL, ‏Scheduler, ‏Campaign queue ו־Template
maintenance אופציונלי, אך מעביר ל־Bootstrap רק את ה־Owner key. ‏Queue
bindings, ‏Meta configuration ו־Telemetry sink נשארים בתוך Service factory
ואינם מועתקים לתצורת ה־Main.

4.85.1 אין Adapters חלופיים או מצב Demo. ‏Campaign queue חסר, ‏Template
Publisher/Sink חלקיים, Clock לא תקין, Option מורחבת או Composition dependency
נוסף נדחים לפני Start. היעדר Template configuration משאיר את המשימה כבויה
במפורש. עדיין לא קיים Entry module/package script פעיל, מפני שיצירתו דורשת
Queue/DLQ ו־Telemetry providers מאושרים.

4.85.2 ‏Build וכל **2,372 הבדיקות** עברו ללא כשל, Skip או Todo; בדיקות
Executable composition, ‏Bootstrap ו־Hosting Registry הממוקדות עברו
`21/21`. ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ה־Composition root
הוא השלב המקומי האחרון שאינו דורש בחירת Queue; ה־Entry module הפעיל נשאר
חסום בכוונה עד קבלת החלטת ספק ו־Credentials מתאימים.

4.86 נוסף חוזה קבלה Machine-readable ל־Queue/DLQ עבור Meta webhook,
Campaign delivery, ‏Team invitation ו־Message template submission. מקור
קיבולת ה־Batch הועבר ל־Shared policy יחיד כדי שה־Runtime והראיה ישתמשו
באותו ערך. המדיניות דורשת At-least-once, ‏Batch של 10, עשרה Retries,
DLQ, ‏Ack מפורש, שימור Body וחמש בדיקות התנהגות שעברו ב־Staging.

4.86.1 הראיה קשורה ל־Commit ול־Artifact, תקפה עד 24 שעות ומחזירה רק
Digest, זמנים ומספר תורים. מבנה מורחב, Resource/Account identity, תור חסר
או כפול, סדר שגוי, Delay חסר, בדיקה שנכשלה או Environment שאינו Staging
נדחים. המדיניות היא Connect migration baseline ואינה מוצגת כמגבלת Meta.

4.86.2 ‏Build וכל **2,381 הבדיקות** עברו ללא כשל, Skip או Todo. בדיקות
Queue acceptance, ‏Hosting Registry ו־Backpressure הממוקדות עברו `24/24`;
‏TypeScript, ‏ESLint ו־`git diff --check` עברו. כל ארבע יכולות ה־Queue
ב־Migration Registry מפנות כעת לאותו חוזה קבלה, אך נשארות
`decision-required` עד בחירת ספק והפקת ראיית Staging אמיתית.

4.87 נוסף CLI שנכשל סגור לאימות Queue adapter evidence מהגרסה הנוכחית.
הוא אינו מייצר Evidence ואינו מאפשר Mock: הוא דורש קובץ Staging אמיתי,
Commit של Release נקי ו־Artifact digest זהים לחלוטין, וכן חלון תוקף פעיל
של עד 24 שעות.

4.87.1 קריאת הקובץ משתמשת בגבול Trusted-file המשותף: קובץ רגיל בבעלות
המשתמש, Link יחיד, ללא הרשאות כתיבה ל־Group/Others, ללא Symlink, ללא שינוי
בזמן הקריאה ועד 48,000 Bytes. ‏JSON מורחב, UTF-8 לא תקין, Release או
Artifact שונים, זמן עתידי וראיה שפג תוקפה נדחים בקודים תחומים. הפלט המאושר
כולל רק Commit, ‏Digests, זמנים ומספר תורים — ללא Provider, ‏Resource,
Account, ‏Payload או Secret.

4.87.2 ‏Build וכל **2,386 הבדיקות** עברו ללא כשל, Skip או Todo. בדיקות
Queue acceptance, ‏Evidence file ו־Hosting Registry הממוקדות עברו `25/25`;
‏TypeScript, ‏ESLint, ‏Source guard על 622 קבצים ו־35 Client graphs,
`git diff --check` ו־Secret hygiene על 1,279 קבצים — 1,219 מנוהלים ו־60
חדשים, כולל היסטוריית Git — עברו. כל ארבע יכולות ה־Queue מפנות גם ל־Verifier,
אך נשארות `decision-required`: טרם נבחר ספק ולא קיימת ראיית Staging אמיתית.

4.88 נוסף שער Production נפרד בשם `messaging.target-queue-adapter`.
הגדרות ה־Meta webhook וה־Campaign queues הקיימות ממשיכות להוכיח רק את
Baseline של Cloudflare; הן אינן יכולות עוד להספיק לבדן למוכנות ב־Topology
המאושר של Vercel/Railway. עד קיום Adapter יעד אמיתי השער מחזיר
`TARGET_QUEUE_ADAPTER_REQUIRED`.

4.88.1 השינוי אינו בוחר Redis/BullMQ ואינו משנה את שאלון ההחלטות. הוא
מפריד בין עובדה קיימת — Cloudflare queues ממומשים — לבין חסם היעד — ספק,
Adapter וראיית Staging טרם קיימים. מוכנות Production הפורמלית היא כעת
5 מתוך 34: ‏18 חסומים ו־11 דורשים החלטה.

4.88.2 ‏Build וכל **2,386 הבדיקות** עברו שוב ללא כשל, Skip או Todo.
בדיקות Readiness, ‏Decision Registry והשאלון הממוקדות עברו `12/12`;
‏TypeScript, ‏ESLint, ‏Source guard על 622 קבצים ו־35 Client graphs,
`git diff --check` ו־Secret hygiene על 1,279 קבצים, כולל היסטוריית Git,
עברו. השער יישאר חסום עד מימוש Adapter אמיתי; חוזה ו־Verifier לבדם אינם
נחשבים Production capability.

4.89 ‏Migration `0026_message_template_submission_outbox.sql` ומחזור
ה־Template Submission Outbox הוכחו כעת מול PostgreSQL 16.13 אמיתי ומקומי.
ה־Harness החיל את כל 27 ה־Migrations ועבר עם **59 תרחישי Concurrency**.
התרחיש החדש מוכיח שתי בקשות `templates.submit` זהות במקביל שמחזירות
`committed + replayed`, מעבר `pending → submitting → ambiguous → submitted`,
הקרנת התבנית ל־`pending_review` וחסימת שינוי של Transition event קיים.

4.89.1 במהלך ההוכחה אותר Race Condition ממשי: ה־Executor פתח Transaction
ברמת `repeatable-read`; בקשה זהה שהמתינה ל־Unique Receipt של בקשה מקבילה
לא ראתה את ה־Receipt לאחר ה־Commit והחזירה `unavailable`. ה־Executor משתמש
כעת ב־`read-committed`, בעוד Receipt uniqueness, ‏row locks ו־Template
version שומרים על Atomicity ועל Idempotency. ההוכחה החיה החזירה לאחר התיקון
`Node PostgreSQL integration: PASS (27 migrations, 59 concurrency scenarios)`.

4.89.1.1 ‏Audit המשך מצא את אותו Receipt pattern ב־Contact Organization,
‏Contact Import וב־Message Template Draft. שלושת ה־Executors הועברו גם הם
ל־`read-committed`; בדיקות יחידה מפורשות מקבעות את רמת הבידוד לכל ארבעת
המסלולים. ההוכחה החיה הישירה בסבב זה היא ל־`templates.submit`; יתר המסלולים
עברו Contract tests ואינם מוצגים כראיית Staging.

4.89.2 תוקנו גם שתי סטיות ב־Harness עצמו: תגובת `reports.read` נבדקת לפי
המבנה הציבורי השטוח הנוכחי; ‏`contacts.save` כולל `submissionOccurredAt`
ומפיק Idempotency key מה־Payload הקנוני. תרחיש ה־Outbox משתמש ב־Tenant
וב־External identity נפרדים, כדי שלא להפוך את בדיקת ה־HTTP למשתמש בעל שתי
חברויות שדורש Tenant selection. אין שינוי בנתוני מוצר ואין נתוני Demo.

4.89.3 ‏Build, ‏TypeScript, ‏ESLint וכל **2,386 הבדיקות** עברו ללא כשל,
Skip או Todo. בדיקות ה־PostgreSQL/Registry/Runbook הממוקדות עברו `20/20`,
ובדיקות ארבעת ה־Receipt Executors עברו `22/22`; ‏Source guard סרק 622 קבצים
ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות; ‏Secret hygiene סרק
1,279 קבצים — 1,219 מנוהלים ו־60 חדשים — כולל היסטוריית Git;
`git diff --check` עבר. שרת PostgreSQL הזמני נעצר ותיקיית ה־Cluster הזמנית
נמחקה. בחירת Queue/DLQ, ‏Adapter ו־Telemetry sink חיים, ‏Credentials,
ערכי Production וראיית Railway Staging נשארו חסמים חיצוניים אמיתיים.

4.90 הושלם מסלול Conversations מלא ב־Vercel/Railway/PostgreSQL. ארבע
הפעולות `conversations.list`, ‏`conversations.thread.read`,
`conversations.mark-read` ו־`conversations.assignment.change` עוברות כעת
דרך חוזה Railway המאומת. שכבת ה־BFF ופעולות ה־UI אינן קוראות או משנות עוד
Conversation דרך D1, ואין במסלול הפעיל Fallback שקט לתשתית הישנה.

4.90.1 פעולות הקריאה דורשות `conversations.read` ומחזירות DTO ציבורי תחום
שאינו חושף Tenant, ‏Provider או External user identifiers. פעולות השינוי
דורשות `conversations.reply`, מכסת Tenant mutation, ‏Request digest
דטרמיניסטי, ‏Receipt ו־Audit אטומיים. שתי פעולות השינוי רצות ב־Transaction
ברמת `read-committed`, נועלות את ה־Receipt ומאמתות Replay מול אותה פקודה
ואותה תוצאה לפני החזרת תשובה.

4.90.2 ה־PostgreSQL harness החיל את כל 27 ה־Migrations על PostgreSQL 16.13
ועבר עם **61 תרחישי Concurrency**. דרך HTTP מאומת הוכחו רשימת שיחות, קריאת
Thread, שתי בקשות `mark-read` זהות במקביל ושתי בקשות Assignment זהות
במקביל. בכל זוג התקבלו `committed + replayed`; לאחר מכן אומתו בדיוק שני
Receipts, שני Audit events והמצב הסופי של unread, ‏version ו־assignee.
הפקודה החזירה
`Node PostgreSQL integration: PASS (27 migrations, 61 concurrency scenarios)`;
שרת PostgreSQL הזמני נעצר ותיקיית ה־Cluster הזמנית נמחקה.

4.90.3 ‏Build וכל **2,405 הבדיקות** עברו ללא כשל, Skip או Todo.
‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ה־Hosting Migration Registry
מייצג כעת 45 Adapters ואת מסלול Conversations כהשלמה מקומית. אין בכך ראיית
Railway Staging או Production: בחירת Queue/DLQ ו־Telemetry providers,
Credentials, ערכי חשבון חיים, ‏Migration rehearsal וראיות Load/Restore
נשארו חסמים חיצוניים ואינם מסומנים כמוכנים.

4.91 קריאות Bot flow הועברו מה־Runtime הישן אל Railway/PostgreSQL.
הפעולות `bot.flows.list` ו־`bot.flows.details.read` דורשות `bot.read`; הרשאת
כתיבה נגזרת בצד Railway מתפקיד ה־Tenant ואינה מתקבלת מן הדפדפן. ה־Current
directory ופעולת Load details משתמשים כעת באותה זהות Vercel OIDC + Clerk
ובאותו Tenant resolver כמו יתר ה־API, ללא D1 fallback במסלולי הקריאה.

4.91.1 נוסף Parser נכשל־סגור ל־Bot DTO. הוא דוחה שדות נוספים, מפתחות או
סטטוסים לא חוקיים, timestamps לא קנוניים, גרסאות כפולות או בסדר שגוי,
סתירה בין Latest/Active versions והגדרת Flow לא תקינה. פלט תקין כולל רק את
השדות הציבוריים ואינו חושף `tenantId`, ‏`externalUserId` או זהויות ספק.

4.91.2 כתיבות Draft ו־Publish עדיין משתמשות במסלול הקיים ואינן מסומנות
כמועברות. השלב הבא הוא Executor אטומי עבורן עם מכסה, Idempotency receipt,
Audit ו־PostgreSQL transaction; רק לאחר השלמתו ניתן להסיר את תלות D1 מכל
Feature הבוט. בדיקות API/BFF/Auth/Registry הממוקדות עברו **75/75**. ‏Build
וכל **2,414 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint
ו־`git diff --check` עברו.

4.92 כתיבות Bot flow הועברו גם הן ל־Railway/PostgreSQL. הפעולות
`bot.flows.draft.save` ו־`bot.flows.publish` דורשות `bot.write`, מכסת
`tenant-mutation`, מפתח Idempotency ו־Request digest דטרמיניסטיים. ‏Receipt,
שינוי ה־Draft או ה־Publication, ‏Audit ותגובת Replay נשמרים באותה Transaction
ברמת `read-committed`. בקשה זהה מוחזרת כ־Replay; שימוש באותו מפתח עם Digest
אחר נכשל כ־Conflict. יחד עם List ו־Details, כל Feature הבוט הפעיל פועל כעת
ללא D1 fallback.

4.92.1 ה־BFF דוחה Tenant, ‏Actor, מזהי ספק ושדות Lifecycle מהדפדפן ומאמת
תגובה ציבורית תחומה. ה־Executor מאמת מחדש את הפקודה, את הגדרת ה־Flow ואת
תגובת ה־Replay, וממפה Missing, ‏Stale version, ‏Invalid state ו־Storage outage
לכשלים נפרדים. ה־Foundation כולל כעת **46 Adapters**.

4.92.2 ‏PostgreSQL 16.13 אמיתי הוכיח שתי בקשות Draft זהות ושתי בקשות
Publish זהות דרך מסלול HTTP מאומת. בכל זוג התקבלו `committed + replayed`,
ונשמרו Receipt ו־Audit יחידים. ההוכחה החזירה
`Node PostgreSQL integration: PASS (27 migrations, 63 concurrency scenarios)`;
השרת הזמני נעצר ותיקיית ה־Cluster הזמנית נמחקה.

4.92.3 בדיקות היעד עברו **92/92**, ה־Build הושלם, וכל **2,425 הבדיקות**
עברו ללא כשל, Skip או Todo. ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. אין בכך ראיית
Railway Staging או Production: ספקי Queue/DLQ ו־Telemetry, ‏Credentials,
ערכי חשבון ו־Rate-limit חיים, ‏Export/Restore מבוקר, ‏Load evidence ופריסת
Vercel/Railway נשארו חסמים חיצוניים אמיתיים.

4.93 מסלול Campaigns הפעיל הועבר כיחידה אחת ל־Railway/PostgreSQL:
`campaigns.directory.read`, ‏`campaigns.snapshot.save` ו־`campaigns.activate`.
קריאה, שמירת Snapshot ו־Activation אינן משתמשות עוד ב־D1 fallback. ‏DTO
ציבורי נכשל־סגור מונע חשיפת Tenant ומזהי ספק; כתיבות דורשות הרשאה, מכסת
Tenant, ‏Idempotency key ו־Request digest דטרמיניסטיים.

4.93.1 ‏Receipt, ‏Snapshot או Activation, ‏Audit ותגובת Replay נשמרים באותה
Transaction ברמת `read-committed`. ‏Activation חדשה נשארת חסומה כאשר
Queue/Scheduler היעד אינם מוגדרים; Replay של Activation שכבר הושלמה נשאר
זמין גם אם התצורה מושבתת לאחר מכן. כך Recovery אינו תלוי בזמינות הנוכחית
של הספק, בלי לאפשר משלוח חדש ללא תשתית יעד מאושרת.

4.93.2 במהלך ה־Harness החי אותרה הפרעה בין Campaign מתוזמן שנוצר במסלול
HTTP לבין בדיקת Dispatch מאוחרת יותר. תרחיש ה־HTTP קיבל זמן עתידי מפורש,
וכך כל בדיקה מוכיחה Scope נפרד ודטרמיניסטי. ההרצה הרשמית החזירה
`Node PostgreSQL integration: PASS (27 migrations, 65 concurrency scenarios)`.
ה־Foundation כולל כעת **47 Adapters**. שרת PostgreSQL הזמני נעצר ותיקיית
ה־Cluster הזמנית נמחקה.

4.93.3 בדיקות היעד עברו **90/90** וכל **2,438 הבדיקות** עברו ללא כשל,
Skip או Todo. ‏Build, ‏TypeScript, ‏ESLint ו־`git diff --check` עברו.
‏Source guard סרק 637 קבצים ו־35 Client graphs; ‏Interface guard עבר 15
בדיקות; ‏Secret hygiene סרק 1,300 קבצים — 1,219 מנוהלים ו־81 חדשים — כולל
היסטוריית Git; חוזי Migration ו־Parity עברו עבור 27 Migrations וכל 51
טבלאות D1. אין בכך ראיית Railway Staging או Production: ספק Queue/DLQ,
Telemetry sink, ‏Credentials, ערכי Rate-limit/Pool חיים, ‏Export/Restore,
Load evidence ופריסת Vercel/Railway נשארו חסמים חיצוניים אמיתיים.

4.94 מסלול אישור תשובות AI הפעיל הועבר במלואו ל־Railway/PostgreSQL:
`ai.reply-approvals.list` ו־`ai.reply-approvals.decide`. שכבות ה־Current
ו־Server Action אינן משתמשות עוד ב־D1 fallback. הקריאה דורשת
`conversations.read`; ההחלטה דורשת `conversations.reply`, מכסת Tenant,
מפתח Idempotency ו־Request digest דטרמיניסטיים. קלט ופלט עוברים Parsers
נכשלים־סגור שאינם מאפשרים לדפדפן לספק Tenant, ‏Actor או שדות Persistence.

4.94.1 ה־Executor שומר Receipt, החלטת Outbox, ‏Audit ותגובת Replay באותה
Transaction ברמת `read-committed`. תגובת Replay נבדקת מחדש מול המפתח,
ההחלטה, הגרסה והמצב הצפוי. ‏Not found, ‏Stale version, מצב לא חוקי,
Idempotency conflict וכשל מסד נשארים כשלים תחומים ואינם חושפים שגיאות
פנימיות. ה־Foundation כולל כעת **48 Adapters**.

4.94.2 ‏PostgreSQL 16.13 אמיתי הוכיח קריאת Approval תחומה ושתי החלטות
זהות במקביל דרך HTTP מאומת. נשמרו שינוי Outbox אחד, Receipt אחד ו־Audit
אחד; התשובות היו `committed + replayed`, וללא Tenant, ‏External user,
Provider request או Audit keys בפלט. ההרצה הרשמית החזירה
`Node PostgreSQL integration: PASS (27 migrations, 67 concurrency scenarios)`.
השרת הזמני נעצר ותיקיית ה־Cluster הזמנית נמחקה.

4.94.3 ‏Build וכל **2,450 הבדיקות** עברו ללא כשל, Skip או Todo.
‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ‏Source guard סרק 642 קבצים
ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות; ‏Secret hygiene סרק
1,307 קבצים — 1,219 מנוהלים ו־88 חדשים — כולל היסטוריית Git. חוזי Drizzle,
‏PostgreSQL Migration ו־Parity עברו עבור 36 מיגרציות D1, ‏27 מיגרציות
PostgreSQL וכל 51 טבלאות D1. אין בכך ראיית Railway Staging או Production:
ספקי Queue/DLQ ו־Telemetry, ‏Credentials, ערכי Rate-limit/Pool חיים,
‏Export/Restore, ‏Load evidence ופריסת Vercel/Railway נשארו חסמים חיצוניים.

4.95 מסלול פרופיל העסק של ה־Onboarding הועבר במלואו
ל־Railway/PostgreSQL: ‏`onboarding.business-profile.read` מחזיר למשתמש
מאומת ללא Tenant פרופיל ריק, ו־`onboarding.business-profile.save` יוצר
בשמירה הראשונה Tenant, ‏Owner ו־Profile. למשתמש קיים נדרשת הרשאת
`workspace.manage`. שכבות `currentBusinessProfile` ו־Server Action אינן
משתמשות עוד ב־D1 fallback.

4.95.1 המכסה נצרכת לפי זהות המשתמש לפני פתרון Tenant. לאחר מכן ה־Executor
שומר Provisioning או Profile update, ‏Receipt, ‏Request digest, ‏Audit ותגובת
Replay ב־Transaction אחת מסוג `read-committed`. בקשה זהה שכבר הושלמה
מוחזרת ללא כתיבה נוספת; Digest סותר גורם Conflict ו־Rollback. ה־Foundation
כולל כעת **49 Adapters**.

4.95.2 ‏PostgreSQL 16.13 אמיתי הוכיח קריאה לפני Provisioning ושתי שמירות
ראשונות זהות במקביל דרך HTTP מאומת. נוצרו Tenant, ‏Owner, ‏Profile, ‏Receipt
ו־Audit יחידים; התשובות היו `committed + replayed`, ללא Tenant, ‏External
user, ‏Receipt או Digest בפלט. ההרצה הרשמית החזירה
`Node PostgreSQL integration: PASS (27 migrations, 69 concurrency scenarios)`.
השרת והמסד הזמניים נעצרו ונמחקו.

4.95.3 שער השחרור המקומי המלא עבר. ‏Build וכל **2,466 הבדיקות** עברו ללא
כשל, Skip או Todo. ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ‏Source
guard סרק 650 קבצים ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות;
‏Secret hygiene סרק 1,318 קבצים — 1,219 מנוהלים ו־99 חדשים — כולל היסטוריית
Git. חוזי Drizzle, ‏PostgreSQL Migration ו־Parity עברו עבור 36 מיגרציות D1,
‏27 מיגרציות PostgreSQL וכל 51 טבלאות D1.

4.95.4 שער Production נשאר חסום כצפוי: 5 בדיקות Ready, ‏18 Blocked ו־11
Decision required. החסמים הם תצורה, ספקים והוכחות חיצוניות אמיתיות — בין
השאר Clerk/Meta, ‏Queue/DLQ, ‏Monitoring, ‏Backup/Restore, ‏Production
Rate-limit/Pool values, ‏CI/GitHub governance evidence ופריסות
Vercel/Railway — ולא כשל במסלול ה־Onboarding המקומי.

4.96 נסגר באג הרשאות במסלול Onboarding: קודם, שגיאת
`TENANT_MEMBERSHIP_REQUIRED` הומרה תמיד למצב של משתמש חדש. לכן Membership
פעילה ששויכה ל־Tenant חסום הייתה עלולה להיכנס למסלול Provisioning. כעת
`resolveOptional` מחזיר `null` רק כאשר אין כלל Membership פעילה; Membership
קיימת אך לא־כשירה נכשלת ב־`PERMISSION_DENIED` לפני Mutation executor.

4.96.1 נוספו בדיקות שליליות ל־Resolver, ל־Railway operation ול־Vercel BFF.
הן מוכיחות שהמצב החסום אינו מוצג כחשבון חדש ושאין פנייה ל־Mutation executor.
‏PostgreSQL 16.13 אמיתי הוכיח גם דרך HTTP תגובות `403` לקריאה ולשמירה לאחר
חסימת ה־Tenant, ללא שינוי Profile וללא Receipt או Audit נוספים. ההרצה
החזירה `PASS (27 migrations, 69 concurrency scenarios)`.

4.96.2 שער השחרור המקומי המלא עבר. ‏Build וכל **2,469 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ‏Source
guard סרק 650 קבצים ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות;
‏Secret hygiene סרק 1,318 קבצים — 1,219 מנוהלים ו־99 חדשים — כולל היסטוריית
Git. חוזי Drizzle, ‏PostgreSQL Migration ו־Parity עברו עבור 36 מיגרציות D1,
‏27 מיגרציות PostgreSQL וכל 51 טבלאות D1. חסמי Production החיצוניים נשארים
ללא שינוי.

4.97 מסלול בחירת סביבת העבודה הפעיל הועבר במלואו
ל־Railway/PostgreSQL: ‏`tenant-selection.directory.read` מחזיר עד 100
אפשרויות באמצעות Selection keys אטומים; `tenant-selection.save` מקבל רק Key
ו־Expected version. ה־Server גוזר את Tenant ואת Actor מזהות מאומתת
ומ־Membership כשירה. שכבות ה־Current וה־Server Action אינן משתמשות עוד
ב־D1 fallback.

4.97.1 השמירה צורכת מכסת `tenant-mutation` לפי זהות המשתמש, נועלת מחדש את
ה־Membership וה־Tenant בתוך Transaction, ושומרת Selection, ‏Receipt, ‏Request
digest, ‏Audit ותגובת Replay אטומית. Replay מתבצע רק לאחר בדיקת הרשאה חוזרת.
קלט או פלט אינם חושפים Tenant ID, ‏External user ID או שדות Persistence.
ה־Foundation כולל כעת **50 Adapters**.

4.97.2 ‏PostgreSQL 16.13 אמיתי הוכיח Directory של שני Tenants ושתי בחירות
זהות במקביל. נשמרו Selection אחת בגרסה 1, ‏Receipt אחד ו־Audit אחד;
התשובות היו `committed + replayed`. ההרצה הרשמית החזירה
`Node PostgreSQL integration: PASS (27 migrations, 71 concurrency scenarios)`.
שרת PostgreSQL הזמני נעצר ותיקיית האשכול הזמנית נמחקה.

4.97.3 שער השחרור המקומי המלא עבר. ‏Build וכל **2,488 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו. ‏Source guard סרק 657 קבצים
ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות; ‏Secret hygiene סרק
1,328 קבצים — 1,219 מנוהלים ו־109 חדשים — כולל היסטוריית Git. חוזי Drizzle,
‏PostgreSQL Migration ו־Parity עברו עבור 36 מיגרציות D1, ‏27 מיגרציות
PostgreSQL וכל 51 טבלאות D1.

4.97.4 שער Production נשאר חסום כצפוי: **5 Ready, ‏18 Blocked ו־11
Decision required**. אלה חסמי Accounts, ספקים, Secrets, ‏Queue/DLQ,
Monitoring, ‏Backup/Restore, ‏Rate-limit policy, ‏CI/GitHub governance,
Staging ופריסה אמיתיים — לא רגרסיה מקומית במסלול Tenant Selection.

4.98 מסלול קריאת ספריית הצוות הפעיל הועבר במלואו
ל־Railway/PostgreSQL: ‏`team.directory.read` מקבלת Query ריק בלבד, פותרת את
סביבת העבודה מהזהות המאומתת ומהבחירה השמורה ודורשת `team.manage` לפני
קריאת החברים. שכבת `currentTeamDirectory` אינה משתמשת עוד ב־D1 fallback.

4.98.1 התגובה מוגבלת ל־100 חברים ומחזירה רק Member keys אטומים, Reference
codes, תפקיד, מצב, גרסה וסימון המשתמש הנוכחי. היא נכשלת־סגור אם חסר המשתמש
הנוכחי, אם קיימת כפילות או אם מבנה הנתונים אינו מדויק. ספק Identity
Directory עדיין `unknown/unavailable`; לכן שמות וכתובות דוא״ל מוחזרים
במפורש כ־`null`, ולא מומצאים מנתונים מקומיים.

4.98.2 ‏PostgreSQL 16.13 אמיתי הוכיח דרך HTTP מאומת שהקריאה משתמשת ב־Tenant
שנבחר מבין שני Tenants, מחזירה חבר אחד בלבד בתחום הנכון ואינה חושפת Tenant
ID או External user ID. ההרצה הרשמית החזירה
`Node PostgreSQL integration: PASS (27 migrations, 71 concurrency scenarios)`.
שרת PostgreSQL הזמני נעצר ותיקיית האשכול הזמנית נמחקה.

4.98.3 שער השחרור המקומי המלא עבר. ‏Build וכל **2,500 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו. ‏Source guard סרק 661 קבצים
ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות; ‏Secret hygiene סרק
1,334 קבצים — 1,219 מנוהלים ו־115 חדשים — כולל היסטוריית Git. חוזי Drizzle,
‏PostgreSQL Migration ו־Parity עברו עבור 36 מיגרציות D1, ‏27 מיגרציות
PostgreSQL וכל 51 טבלאות D1.

4.98.4 שער Production נשאר חסום כצפוי: **5 Ready, ‏18 Blocked ו־11
Decision required**. החסמים הם תצורת Clerk ו־Meta, ספקי Queue/DLQ,
Monitoring, ‏Backup/Restore, ‏Rate-limit policy, ‏CI/GitHub governance,
Staging ופריסות חיות — לא רגרסיה מקומית במסלול Team Directory.

4.99 מסלולי שינוי החברות בצוות הועברו במלואם ל־Railway/PostgreSQL:
‏`team.membership.role.change`, ‏`team.membership.status.change`
ו־`team.membership.owner.transfer`. שכבת `teamMembershipActions` היא כעת
BFF דקה בלבד ואינה פותחת חיבור D1. הדפדפן מוסר רק Member key אטום,
Expected version והפעולה המבוקשת; השרת גוזר Tenant, ‏Actor וזמן מה־Session
המאומת ודורש `team.manage` לפני הכתיבה.

4.99.1 כל Mutation עוברת מכסת Tenant, וליבת הדומיין שומרת את שינוי
ה־Membership ואת אירוע ה־Audit הבלתי־משתנה באופן אטומי. מפתח האירוע
הדטרמיניסטי מספק Idempotency: שתי בקשות זהות אינן מעלות גרסה פעמיים ואינן
יוצרות אירוע כפול. שינוי Owner נשאר מוגבל לבעלים מאומת, חוסם יעד לא פעיל
ומעדכן את שתי החברויות באותה Transaction. נוספה גם הבחנה תחומה של
`STALE_SESSION` בתגובה `409`, בלי לחשוף מזהי Tenant, משתמש או Persistence.

4.99.2 ‏PostgreSQL 16.13 אמיתי הוכיח דרך HTTP מאומת שתי בקשות שינוי תפקיד
זהות במקביל. התקבלו `updated + unchanged`, גרסת החברות עלתה פעם אחת בלבד
ל־2, ונשמר אירוע Membership יחיד ללא דליפת זהויות פנימיות. ההרצה הרשמית
החזירה `Node PostgreSQL integration: PASS (27 migrations, 73 concurrency
scenarios)`. ה־Foundation נשאר עם **50 Adapters**, משום שהמסלול משתמש
ב־Repository האטומי הקיים. השרת הזמני נעצר ותיקיית האשכול הזמנית נמחקה;
בנוסף הוסרו 31 מקטעי Shared Memory יתומים של הרצות PostgreSQL קודמות לאחר
שאומת כי תהליכי היוצר שלהם אינם פעילים. מקטע השרת הקבוע לא שונה.

4.99.3 שער השחרור המקומי המלא עבר. ‏Build וכל **2,513 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ‏Source
guard סרק 665 קבצים ו־35 Client graphs; ‏Secret hygiene סרק 1,340 קבצים —
1,219 מנוהלים ו־121 חדשים — כולל היסטוריית Git. חוזי Drizzle,
‏PostgreSQL Migration ו־Parity עברו עבור 36 מיגרציות D1, ‏27 מיגרציות
PostgreSQL וכל 51 טבלאות D1.

4.99.4 שער Production נשאר חסום כצפוי: **5 Ready, ‏18 Blocked ו־11
Decision required**. החסמים הם תצורת Clerk ו־System Admin, מדיניות הזמנות,
Meta, ספקי Queue/DLQ ומשלוח, ‏AI/Billing/File scanning, ‏Monitoring,
Backup/Restore, ‏Rate-limit policy, ‏Secrets, ‏CI/GitHub governance,
Environment isolation ופריסות חיות — לא רגרסיה מקומית במסלולי הצוות.

4.100 מסלול בקשת ההזמנה הפעיל הועבר ל־Railway/PostgreSQL:
‏`team.invitation.request`. ‏`teamInvitationActions` היא כעת BFF דקה ללא
D1 fallback. הקלט כולל Email מנורמל ותפקיד שאינו Owner בלבד; Railway גוזר
Tenant ו־Actor מ־Vercel OIDC, ‏Clerk session וה־Tenant selection המאומתת,
ודורש `team.manage`, מכסת `tenant-mutation` ו־Idempotency key דטרמיניסטי.

4.100.1 ליבת ההזמנות שומרת Invitation, ‏Event ו־Delivery באותה
PostgreSQL Transaction. רק לאחר השמירה היא מפרסמת Tenant ID ו־Delivery key
ל־Publisher המוזרק. Retry זהה רשאי לפרסם שוב את אותו Delivery key כדי לאפשר
Recovery, אך אינו יוצר הזמנה, Event או Delivery נוספים. Policy חסר מחזיר
`CONFIGURATION_REQUIRED`; Queue חסר מחזיר `DEPENDENCY_UNAVAILABLE`. אין
Adapter מדומה שמחזיר הצלחה.

4.100.2 ‏PostgreSQL 16.13 אמיתי הוכיח שתי בקשות זהות במקביל דרך HTTP
מאומת. התוצאות היו `queued + already-pending`; נשמרו Invitation אחת בגרסה
1, ‏Event אחד ו־Delivery אחד. שתי פרסומות ה־Queue נשאו אותו Delivery key,
ותגובות הדפדפן לא חשפו Email, ‏Tenant, ‏Actor, ‏Invitation key או Delivery
key. ההרצה הרשמית החזירה
`Node PostgreSQL integration: PASS (27 migrations, 75 concurrency scenarios)`.
ה־Foundation נשאר עם **50 Adapters**. השרת הזמני נעצר ותיקייתו נמחקה.

4.100.3 שער השחרור המקומי המלא עבר. ‏Build וכל **2,524 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ‏Source
guard סרק 669 קבצים ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות;
‏Secret hygiene סרק 1,346 קבצים — 1,219 מנוהלים ו־127 חדשים — כולל היסטוריית
Git. חוזי Drizzle, ‏PostgreSQL Migration ו־Parity עברו עבור 36 מיגרציות D1,
‏27 מיגרציות PostgreSQL וכל 51 טבלאות D1.

4.100.4 קבלת הזמנה עדיין לא הועברה: היא נשארת חסומה עד ש־Railway יאמת
Primary email ישירות מול Clerk ולא יבטח ב־Email מהדפדפן, ועד שיהיו ראיות
Activation ו־Browser E2E חיות. גם Queue/DLQ adapter אמיתי להזמנות טרם נבחר.
שער Production נשאר כצפוי על **5 Ready, ‏18 Blocked ו־11 Decision
required**; זהו חסם חיצוני מפורש ולא כשל במסלול הבקשה המקומי.

4.101 מסלול קבלת ההזמנה הפעיל הועבר מ־D1 אל Railway/PostgreSQL:
`team.invitation.accept`. ‏`teamInvitationAcceptanceActions` היא כעת BFF
דקה. הדפדפן שולח רק Invitation key; Railway גוזר את המשתמש מה־Clerk session
וקורא ישירות מ־Clerk את ה־Primary Email המאומת. אין אמון ב־Email או בזהות
שמקורם ב־Payload.

4.101.1 מכסת ה־Mutation מופעלת לפני Clerk ולפני PostgreSQL. לאחר אימות
הזהות, ה־Repository האטומי יוצר Membership ו־Acceptance, מקדם את גרסת
ההזמנה ומבטל Delivery ממתינה באותה Transaction. ‏Not found, ‏Email mismatch,
הזמנה לא פעילה ו־Conflict מוחזרים כולם כ־`INVITATION_UNAVAILABLE`, ללא מידע
שמאפשר לנחש אם Invitation key קיים.

4.101.2 ‏PostgreSQL 16.13 אמיתי הוכיח שתי בקשות קבלה זהות במקביל דרך HTTP
מאומת. התוצאות היו `accepted + already-accepted`; נשמרו Membership אחת,
Acceptance אחת ו־Delivery אחת במצב `cancelled`, וגרסת ההזמנה התקדמה פעם
אחת בלבד. ההרצה הרשמית החזירה
`Node PostgreSQL integration: PASS (27 migrations, 77 concurrency scenarios)`.
ה־Foundation נשאר עם **50 Adapters**. שרת הבדיקה הזמני נעצר ותיקייתו נמחקה.

4.101.3 ‏Build וכל **2,539 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript
ו־ESLint עברו. ‏Source guard סרק 675 קבצים ו־35 Client graphs; ‏Interface
guard עבר 15 בדיקות; ‏Secret hygiene סרק 1,355 קבצים — 1,219 מנוהלים ו־136
חדשים — כולל היסטוריית Git. שער Production אינו משתנה עקב ה־Cutover המקומי:
הוא נשאר על **5 Ready, ‏18 Blocked ו־11 Decision required**. נדרשים עדיין
Clerk/Browser E2E evidence חיים, Queue/DLQ adapter להזמנות, Secrets, ‏Staging
ופריסות חיות.

4.102 מסלול System Admin למדיניות שליחת WhatsApp הועבר במלואו מ־D1 אל
Railway/PostgreSQL. שלוש הפעולות
`system-admin.whatsapp-delivery-policy.read`,
`system-admin.whatsapp-delivery-policy.approve` ו־
`system-admin.whatsapp-delivery-policy.kill-switch` מאמתות Vercel OIDC,
Clerk session ו־System Admin allowlist. שתי הכתיבות דורשות Idempotency key
דטרמיניסטי ומכסת `system-admin-mutation`; הקריאה אינה צורכת מכסת כתיבה.

4.102.1 ה־Payload החיצוני משתמש ב־`targetTenantId` ובשמות Provider
ייעודיים שאינם שדות הזהות האסורים בחוזה הכללי. Railway משווה את כל מזהי
Meta ואת Expected versions למצב PostgreSQL לפני כתיבה. התגובה אינה מחזירה
Tenant ID, ‏WABA ID, ‏Phone number ID או Actor גולמיים; Vercel משחזר רק את
ה־Tenant שכבר ביקש ומאמת מחדש את כל ה־Evidence, המכסות, ה־Timeline והגרסאות
לפני עדכון ה־UI. ‏`systemAdminWhatsappDeliveryPolicyActions` וקריאת ה־Current
אינן פותחות עוד D1 fallback.

4.102.2 במהלך ההרצה התגלה ותוקן באג Concurrency ותיק במסלול בקשת הזמנה.
שתי בקשות זהות קיבלו אותו Idempotency key אך חותמות זמן שונות במילישניות;
הבקשה השנייה סווגה לעיתים כ־Conflict. כעת ה־Replay מאומת מול חותמות הזמן של
Invitation, ‏Event ו־Delivery שכבר נשמרו, בעוד שינוי Email, ‏Role, ‏Actor או
גרסה עדיין נחסם. בדיקת Regression מוכיחה Clock drift ללא Event או Delivery
כפולים. אותה הקשחה הוחלה גם על מדיניות WhatsApp: ‏Approval זהה שכבר יצר את
הגרסה הבאה ו־Kill Switch שכבר השבית אותה מוחזרים כ־`unchanged`, גם אם שעון
ה־Retry שונה, בעוד Snapshot, ‏Actor או גרסה שונים נשארים Conflict.

4.102.3 ‏PostgreSQL 16.13 אמיתי הוכיח שלוש פעמים ממסד ריק אישור מדיניות
מקביל ו־Kill Switch מקביל דרך HTTP מאומת, לצד מרוץ ההזמנה המתוקן. בכל
Mutation נשמר Event אחד בלבד והתוצאות היו `updated + unchanged`. ההרצה
האחרונה הוסיפה גם Retry סדרתי לאחר כל מרוץ והחזירה `unchanged` באותה גרסה.
כל ההרצות הרשמיות החזירו
`Node PostgreSQL integration: PASS (27 migrations, 79 concurrency scenarios)`.
שרת הבדיקה הזמני נעצר ותיקיית האשכול המדויקת נמחקה. ה־Foundation עדיין
מורכב מ־**50 Adapters**; נוספה רק הקרנה תחומה של Meta connection עבור
ה־Operation, לא Adapter Persistence חדש.

4.102.4 שער השחרור המקומי המלא עבר. ‏Build וכל **2,558 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו. ‏Source guard סרק 678 קבצים
ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות; ‏Secret hygiene סרק
1,360 קבצים — 1,219 מנוהלים ו־141 חדשים — כולל היסטוריית Git. ‏Drizzle,
36 מיגרציות D1, ‏27 מיגרציות PostgreSQL וכל 51 טבלאות D1 עברו. שער
Production נשאר כצפוי על **5 Ready, ‏18 Blocked ו־11 Decision required**;
החסמים שנותרו הם Accounts, ספקים, Secrets, ‏Queue/DLQ, ‏Monitoring,
Backup/Restore, ערכי Rate-limit/Pool חיים, ‏Staging ופריסות — לא המסלול
המקומי של מדיניות WhatsApp.

4.103 ארבעת מסלולי AI Agents הפעילים הועברו במלואם מ־D1 אל
Railway/PostgreSQL: ‏`ai.agents.directory.read`,
`ai.agents.details.read`, ‏`ai.agents.draft.save` ו־`ai.agents.publish`.
שכבות `currentAiAgents` ו־`aiAgentActions` הן כעת BFF דקות ללא D1 fallback.
הן מאמתות Vercel OIDC ו־Clerk session, ו־Railway גוזר Tenant והרשאות
`ai.read`/`ai.write` מהזהות המאומתת.

4.103.1 תגובות הקריאה מוגבלות ל־100 Agents ול־100 Knowledge sources,
ומחזירות רק DTO ציבורי ללא Tenant ID, ‏External user ID, ‏Storage object key,
Content digest או שגיאת Scanner פנימית. שמירת Draft ופרסום משתמשים במפתחות
Idempotency דטרמיניסטיים, מכסת `tenant-mutation`, ‏Receipt ו־Audit שנשמרים
אטומית עם מצב הדומיין. ‏Publication נשאר Fail-closed: בהיעדר ספק AI ותנאי
הפעלה מאושרים מוחזרת רשימת חסמים תחומה וה־Transaction מתבטלת בלי Receipt
חלקי.

4.103.2 במהלך האימות התגלו ותוקנו שני פערי Regression. מאמת ה־DTO דרש
בטעות שסוכן פעיל יהפוך ל־`draft` כאשר נשמרת לו גרסת Draft חדשה; כעת הסוכן
נשאר `active` וה־Latest version החדשה נשארת `draft`. בנוסף, Fixture ותיק של
AI Reporting הכניס Agent בדיקה עם מפתח ותצורה שאינם נגזרים מחוזה הדומיין.
ה־Fixture משתמש כעת ב־`deriveAiAgentKey`, ‏`deriveAiAgentVersionKey` ובתצורה
קנונית, ולכן ספריית ה־AI אינה נדרשת לסבול נתון בלתי־חוקי.

4.103.3 ‏PostgreSQL 16.13 אמיתי הוכיח שתי שמירות Draft זהות במקביל,
`created + replayed`, ‏Receipt יחיד, ‏Audit יחיד, קריאת Directory תחומה
ופרסום שנחסם ללא כתיבה חלקית. ההרצה הרשמית החזירה
`Node PostgreSQL integration: PASS (27 migrations, 80 concurrency scenarios)`.
שרת PostgreSQL הזמני נעצר ותיקיית האשכול המדויקת נמחקה.

4.103.4 שער השחרור המקומי המלא עבר. ‏Build וכל **2,567 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ‏Source
guard סרק 683 קבצים ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות;
‏Secret hygiene סרק 1,367 קבצים — 1,219 מנוהלים ו־148 חדשים — כולל היסטוריית
Git. ‏Dependency lock עבר עבור 31 תלויות ישירות; 36 מיגרציות D1, ‏27
מיגרציות PostgreSQL וכל 51 טבלאות D1 עברו את חוזי ה־Migration וה־Parity.

4.103.5 שער Production נשאר חסום כצפוי על **5 Ready, ‏18 Blocked ו־11
Decision required**. הפרסום החסום של AI Agent הוא התנהגות בטיחותית נכונה עד
לבחירת AI provider, ‏Billing ויתר מדיניות ההפעלה. יתר החסמים הם Accounts,
Secrets, ‏Queue/DLQ ומשלוח, ‏File scanning, ‏Monitoring, ‏Backup/Restore,
Rate-limit policy, ‏CI/GitHub governance, ‏Staging וראיות פריסה חיות — לא
רגרסיה מקומית בארבעת מסלולי AI Agents.

4.104 נבנה Adapter מקומי ראשון ל־BullMQ עבור
`message-template-submission-v1`, על בסיס BullMQ ‏5.81.3 ו־ioredis ‏5.11.1
המוצמדים לגרסאות מדויקות. הוא מקבל רק הודעת Queue תחומה, משתמש ב־Submission
key הדטרמיניסטי כ־Job ID, מפריד בין חיבור Producer לבין חיבור Worker ומגדיר
`family: 0` עבור Railway private networking. אין כתובת Redis, סיסמה או
ברירת מחדל סמויה בקוד.

4.104.1 מדיניות הכשל היא Fail-closed: ‏Retry קבוע של 30 שניות ללא Jitter,
עד 10 ניסיונות חוזרים; הודעה לא תקינה או Retry שמוצה עוברים ל־DLQ עם Reason
Code תחום. אם גם כתיבת ה־DLQ נכשלת, משימת המקור נשארת ב־BullMQ failed set
במקום להיעלם. Retention של Completed, ‏Failed ו־DLQ נדרש במפורש מהסביבה,
נבדק מול גבולות קשיחים ואינו מנוקה ללא Batch תחום.

4.104.2 בדיקת Redis אמיתית מקומית הורצה פעמיים ברצף והוכיחה Publish,
Consume ו־Deduplication של אותו Job ID. בהרצה הראשונה התגלה שבשילוב
`enableOfflineQueue: false`, האפשרות `skipWaitingForReady` עלולה לאפשר ל־BullMQ
לשלוח `INFO` לפני שה־Stream מוכן. האפשרות הוסרה מהחוזה ומהמימוש; שתי הרצות
האימות לאחר התיקון עברו, ותהליך Redis הזמני נעצר באופן מסודר.

4.104.3 שער השחרור המקומי המלא עבר. ‏Build וכל **2,589 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ‏Source
guard סרק 685 קבצים ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות;
‏Secret hygiene סרק 1,377 קבצים — 1,219 מנוהלים ו־158 חדשים — כולל היסטוריית
Git. ‏Dependency lock עבר עבור 33 תלויות ישירות; 36 מיגרציות D1, ‏27
מיגרציות PostgreSQL וכל 51 טבלאות D1 עברו את חוזי ה־Migration וה־Parity.

4.104.4 ה־Adapter עדיין אינו ראיית Production: הוא טרם חובר ל־Worker entry
הפעיל ב־Railway, לא נבדק מול Redis פרטי ב־Staging, ולא אושרו עבורו AOF,
`maxmemory-policy=noeviction`, ‏Retention, ‏Secrets rotation, ‏Telemetry sink,
עומס ו־Alerting חיים. שלושת מסלולי ה־Queue הנוספים נשארו ללא Adapter. לכן
שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11 Decision
required**; תשובות ה־Decision intake הן בחירות Product חשובות, אך אינן
מחליפות Approval וראיות Runtime חתומות.

4.105 ‏BullMQ Adapter של `message-template-submission` חובר ל־Provider-bound
Railway Worker composition המקומי. ‏PostgreSQL foundation יוצר את ה־Domain
worker וה־Consumer מתוך ה־Outbox וה־Credential repositories האמיתיים;
Factory מפורש יוצר מעליהם Publisher, ‏BullMQ Worker ו־DLQ. אין Queue fallback
ואין אפשרות לבחור בו־זמנית Publisher חיצוני ו־Provider runtime.

4.105.1 סדר ה־Lifecycle נאכף: BullMQ מסיים Readiness לפני שה־Scheduler
מתחיל לפרסם; כיבוי מבטל את ה־Scheduler וממתין לריצה פעילה, מנקז את BullMQ
Worker ורק אז סוגר את PostgreSQL pool. כשל Queue startup או כשל Composition
מאוחר מנקים גם Queue וגם Database, ושגיאה פרטית אינה יוצאת מגבול ה־Runtime.
קריאה חוזרת ל־Start או Close היא Idempotent, ו־Start לאחר Close נחסם.

4.105.2 ניקוי DLQ התחום מחובר ל־Maintenance task של התבניות. ‏Relay,
GET-only reconciliation ו־Cleanup רצים באותו Tick מאושר; כשל באחד מהם מונע
השלמת Lease ומאפשר Recovery בטוח. מחיקה עדיין מוגבלת לערכי Retention ו־Batch
המפורשים, שאינם מקבלים ברירת מחדל.

4.105.3 שער השחרור המקומי המלא עבר. ‏Build וכל **2,596 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ‏Source
guard סרק 686 קבצים ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות;
‏Secret hygiene סרק 1,379 קבצים — 1,219 מנוהלים ו־160 חדשים — כולל היסטוריית
Git. ‏Dependency lock עבר עבור 33 תלויות ישירות; 36 מיגרציות D1, ‏27
מיגרציות PostgreSQL וכל 51 טבלאות D1 עברו את חוזי ה־Migration וה־Parity.

4.105.4 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. אין עדיין Start command לכל ה־Railway Worker מפני
ש־Campaign, ‏Meta webhook ו־Invitation Queue adapters ו־Telemetry providers
חיים אינם מוכנים. לתשתית ה־Queue נותרו כעת כ־**14–24 שעות** עבודה מקומית,
לפני זמן המתנה לחשבון Redis, ערכי Retention, ‏AOF/noeviction, ‏Load test
וראיית Staging חתומה.

4.106 ‏BullMQ Adapter שני הושלם עבור `campaign-delivery-v1`. ‏Campaign
Scheduler עדיין טוען עד 50 נמענים מ־PostgreSQL, אך מפרסם אותם בקבוצות של
עד 10 לפי חוזה הקבלה. אם קבוצה מאוחרת נכשלת, רק הנמענים שטרם פורסמו
משוחררים; נמענים שכבר נכנסו לתור נשארים Queued ואינם נפתחים לשליחה כפולה.
כל הודעה משתמשת ב־Delivery key האטום גם כ־Job ID דטרמיניסטי.

4.106.1 ה־Adapter ממפה Ack ו־Retry מפורשים, תומך ב־Delay תחום של שנייה עד
24 שעות באמצעות Custom backoff ללא Jitter, ומאפשר עד 10 Retries אחרי
הניסיון הראשון. Envelope פגום או Retry שמוצה עוברים ל־DLQ נפרד; כשל כתיבת
DLQ משאיר את Job המקור ב־Failed set. ‏Retention cleanup נשאר תחום לערכי
הסביבה ול־Batch המאושר.

4.106.2 ‏Provider-bound consumer נוצר ממאגרי Campaign, ‏Meta, ‏Credential,
WhatsApp policy ו־Rate-limit האמיתיים של PostgreSQL foundation. לפני Meta
נשמרת Reservation אטומית. תוצאה חיצונית לא ודאית נשמרת `ambiguous` ומקבלת
Ack בלי שליחה חוזרת אוטומטית. מקור Retry חי מ־Meta נשאר Dependency חובה;
אין ערך מומצא או Fallback שמסמן את הספק כמוכן.

4.106.3 תהליך Provider-bound יחיד מחזיק כעת את שני תורי BullMQ שמומשו:
Campaign delivery ו־Message template submission. שניהם משלימים Readiness
לפני ה־Scheduler, שני ה־DLQ מתנקים תחת אותו Fenced lease, ובכיבוי Redis
נסגר לפני PostgreSQL. כשל Startup חלקי מנקה את כל המשאבים שנוצרו.

4.106.4 בדיקת Redis אמיתית עברה והוכיחה Retry של שנייה אחת ולאחריו Ack
בניסיון השני. בדיקות Scheduler הוכיחו Batch של `10 + 10 + 5` ושחרור של רק
15 עבודות שלא פורסמו לאחר כשל בקבוצה השנייה.

4.106.5 שער השחרור המקומי המלא עבר. ‏Build וכל **2,615 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ‏Source
guard סרק 689 קבצים ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות;
‏Secret hygiene סרק 1,386 קבצים — 1,219 מנוהלים ו־167 חדשים — כולל היסטוריית
Git. ‏Dependency lock עבר עבור 33 תלויות ישירות; 36 מיגרציות D1, ‏27
מיגרציות PostgreSQL וכל 51 טבלאות D1 עברו את חוזי ה־Migration וה־Parity.

4.106.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. Adapter מקומי אינו ראיית Production. לתשתית ארבעת
התורים נותרו Meta webhook ו־Team invitation adapters, תהליך Start מלא,
Telemetry והוכחת Staging; ההערכה לעבודה המקומית היא כ־**9–16 שעות**, לפני
זמן המתנה ל־Railway Redis, ‏Retention, ‏AOF/noeviction, ‏Load test, Secrets
וראיית Staging חתומה.

4.107 ‏BullMQ Adapter שלישי הושלם עבור `meta-webhook-v1`, כולל שני גבולות
Process נפרדים. ה־Railway API מחזיק Producer בלבד ומוכיח Redis readiness
לפני פתיחת HTTP. ה־Railway Worker מחזיק Consumer ו־DLQ ומחבר את גוף
ה־Webhook החתום למאגרי PostgreSQL, לשיחות, לסטטוסי מסירה, ל־Bot ול־AI.

4.107.1 ‏`ArrayBuffer` אינו נשלח ישירות דרך JSON של BullMQ. הגוף מקודד
ל־Base64 קנוני, נבדק ומשוחזר byte-for-byte לפני אימות חתימה חוזר. ‏SHA-256
של הגוף הוא Job ID דטרמיניסטי; PostgreSQL Receipt נשאר מקור ה־Idempotency
הסמכותי גם לאחר Retention של BullMQ.

4.107.2 ה־API מחזיר הצלחה רק לאחר כתיבה לתור. חיבור ה־Producer משתמש ב־
`maxRetriesPerRequest: 1` וב־`enableOfflineQueue: false`, ולכן כשל Redis
אינו הופך ל־Ack מאוחר ולא ודאי. ‏Envelope פגום או Digest mismatch עוברים
ל־DLQ; לאחר ניסיון ראשון ועוד 10 Retries הודעה שלא הושלמה עוברת ל־DLQ.
כשל גם בכתיבת DLQ משאיר את Job המקור Failed.

4.107.3 תהליך Worker המאוחד מחזיק כעת שלושה תורי BullMQ: הגשת Templates,
מסירת Campaign ו־Meta webhook. שלושתם משלימים Readiness לפני ה־Scheduler,
שלושת ה־DLQ מתנקים תחת אותו Fenced lease, ומשאבי Redis נסגרים לפני
PostgreSQL. נוסף גם `npm run start:railway-api:bullmq` כ־Composition מפורש
ל־API שמחזיק את ה־Publisher.

4.107.4 בדיקת Redis 8.6.1 אמיתית וזמנית עברה עבור כל שלושת התורים. מסלול
Meta הוכיח Payload round-trip זהה, Delivery יחיד ו־Duplicate suppression.
שרת Redis הזמני כובה בסיום ולא נשמרו URL, ‏Payload או Secret ב־Artifact.

4.107.5 שער השחרור המקומי המלא עבר. ‏Build וכל **2,627 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ‏Source
guard סרק 692 קבצים ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות;
‏Secret hygiene סרק 1,394 קבצים — 1,219 מנוהלים ו־175 חדשים — כולל
היסטוריית Git. ‏Dependency lock עבר עבור 33 תלויות ישירות; 36 מיגרציות D1,
‏27 מיגרציות PostgreSQL וכל 51 טבלאות D1 עברו את חוזי ה־Migration וה־Parity.

4.107.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. ה־Adapter המקומי אינו ראיית Production. מתוך ארבעת
התורים נותר Adapter מקומי אחד — Team invitation — וכן Start command מלא
ל־Worker, ‏Telemetry, ‏Retention/AOF/noeviction, ‏Load/Outage rehearsal
וראיית Railway Staging חתומה. הערכת העבודה המקומית לתשתית התורים היא
 כ־**5–9 שעות**, לפני זמן המתנה לחשבונות, Secrets ואישורי ספק.

4.108 ‏BullMQ Adapter רביעי ואחרון הושלם עבור
`team-invitation-v1`. ה־Railway API מחזיק Producer נפרד, משתמש ב־Delivery
key העמיד כ־Job ID דטרמיניסטי, ומעלה אותו יחד עם Meta webhook Producer לפני
פתיחת HTTP. ה־Railway Worker יוצר את ה־Consumer ממאגר ה־Invitation delivery
של PostgreSQL ומחבר אותו לתהליך ארבעת התורים.

4.108.1 ספק הזמנות שאינו מוגדר גורם ל־Retry של 60 שניות **לפני Claim**,
ולכן אינו משנה מצב ואינו מנסה שליחה. כשל Storage/Processor מקבל Retry של 30
שניות. שני ה־Delays עוברים Custom backoff ללא Jitter. לאחר ניסיון ראשון
ועוד 10 Retries, העבודה עוברת ל־DLQ; כשל כתיבת DLQ משאיר את המקור Failed.

4.108.2 אחרי Claim אטומי, תוצאה חיצונית לא ודאית נשמרת `ambiguous` ומקבלת
Ack בלי שליחה חוזרת אוטומטית. ‏PostgreSQL נשאר מקור האמת ל־Idempotency גם
לאחר Retention של BullMQ. מעטפת פגומה אינה מגיעה ל־Domain consumer.

4.108.3 תהליך Worker המאוחד מחזיק כעת את כל ארבעת תורי BullMQ: הגשת
Templates, מסירת Campaign, ‏Meta webhook והזמנות צוות. כולם משלימים
Readiness לפני ה־Scheduler, ארבעת ה־DLQ מתנקים תחת אותו Fenced lease,
ומשאבי Redis נסגרים לפני PostgreSQL.

4.108.4 בדיקת Redis 8.6.1 אמיתית וזמנית עברה עבור כל ארבעת התורים. מסלול
ההזמנות הוכיח Delivery יחיד בין Publisher ו־Worker נפרדים ו־Duplicate
suppression לאחר פרסום חוזר של אותו Delivery key. שרת Redis הזמני כובה
בסיום.

4.108.5 שער השחרור המקומי המלא עבר. ‏Build וכל **2,635 הבדיקות** עברו ללא
כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. ‏Source
guard סרק 693 קבצים ו־35 Client graphs; ‏Interface guard עבר 15 בדיקות;
‏Secret hygiene סרק 1,397 קבצים — 1,219 מנוהלים ו־178 חדשים — כולל
היסטוריית Git. ‏Dependency lock עבר עבור 33 תלויות ישירות; 36 מיגרציות D1,
‏27 מיגרציות PostgreSQL וכל 51 טבלאות D1 עברו את חוזי ה־Migration וה־Parity.

4.108.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. ארבעת Adapter-י התורים הושלמו מקומית, אך אין לחבר
Worker חי באמצעות `createUnavailableTeamInvitationProvider`. לפני Start
command מלא נדרש ספק הזמנות חי ומיפוי סמכותי בין Tenant לבין Clerk
Organization; בנוסף חסרים Telemetry, ‏Retention/AOF/noeviction,
‏Load/Outage rehearsal וראיית Railway Staging חתומה. זמן העבודה המקומי
הבא תלוי בהחלטת מיפוי ה־Identity ובחשבונות, ולכן הוא `unknown/unavailable`
עד לסגירת החוזה.

4.109 ‏D17 התקדמה ממסמך החלטה לגבול Identity מקומי אכיף: כל Clerk Session
ב־Railway חייב לכלול `userId` ו־`orgId` חתומים, וכל Tenant קיים נפתר רק
כאשר ה־Organization הפעיל תואם למיפוי הסמכותי ב־PostgreSQL.

4.109.1 ‏Migration `0027_clerk_organization_binding.sql` מוסיפה
`clerk_organization_id` ל־Tenant, בדיקות קנוניות ו־Unique index חלקי.
Existing tenants נשארים לא ממופים במכוון עד Backfill מאושר; אין יצירת
מזהה או שיוך מלאכותי.

4.109.2 ‏Onboarding קושר את ה־Organization בתוך אותה Transaction של
Tenant, ‏Owner, ‏Business profile, ‏Receipt ו־Audit. Replay מדויק נשאר
Idempotent; ‏Tenant שממופה ל־Organization אחר או Organization שכבר שייך
ל־Tenant אחר נכשל סגור בלי דריסה.

4.109.3 ‏Clerk לא נקרא ליצור Organization מתוך Transaction. ההמלצה היא
להפעיל `Create first organization automatically` ב־Clerk ולקבל את `orgId`
מה־Session. כך אין Side effect חיצוני עם תוצאה לא ידועה ואין תלות ב־Slug,
שכבוי כברירת מחדל ביישומי Clerk חדשים.

4.109.4 בדיקות Unit/Contract הממוקדות עברו **138/138**. לאחר מכן Build וכל
**2,640 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint,
`git diff --check`, ‏Source guard, ‏Secret hygiene, ‏Interface guard,
Dependency lock, ‏36 מיגרציות D1, ‏28 מיגרציות PostgreSQL ו־Parity של כל
51 טבלאות D1 עברו.

4.109.5 ‏PostgreSQL 16 זמני ונקי הורץ מקומית. הפקודה הסמכותית החזירה:
`Node PostgreSQL integration: PASS (28 migrations, 80 concurrency scenarios)`.
השרת הזמני כובה מיד אחרי התרגיל.

4.109.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. עדיין נדרשים Clerk Organizations/MFA/Session/Revocation
settings חיים, Backfill מאושר, Browser E2E ו־Evidence; בנוסף Adapter הזמנות
Clerk, ‏Reconciliation לפי Provider invitation identity ו־Rate policy של
הספק טרם חוברו. אין Commit או Push במסגרת שלב זה.
# עדכון 4.110 — Clerk Organization invitation adapter

4.110.1 **הושלם מקומית:** Adapter הזמנות ל־Clerk Organizations עם מיפוי
Tenant סמכותי מ־PostgreSQL, ‏TTL של 72 שעות ו־`org:member` בלבד.

4.110.2 כל הזמנה כוללת ב־`privateMetadata` את גרסת החוזה,
`deliveryKey` הדטרמיניסטי ו־Tenant ID. לפני POST מתבצע Lookup על כל מצבי
ההזמנה, ולכן timeout אחרי קבלת Clerk ניתן ליישוב בלי POST נוסף.

4.110.3 הסריקה מוגבלת ל־500 תוצאות ונכשלת סגור אם אינה מלאה, Evidence
מ־Clerk נבדק מול Organization, ‏Tenant, ‏Email, Role ו־Metadata, ויצירה
דורשת Rate-limit guard משותף. אין `Math.random()` ואין מזהה אקראי מקומי.

4.110.4 **עדיין חסום חיצונית/תפעולית:** חיבור ה־Adapter ל־Worker,
תצורת Rate limit שאושרה מול מגבלת Clerk של 250 יצירות בשעה לכל
application instance, טיפול תפעולי ב־`Retry-After`, Clerk Dashboard,
Backfill, ‏MFA ו־Staging evidence חי.

4.110.5 Build וכל **2,649 הבדיקות** עברו ללא כשל. ‏TypeScript, ‏ESLint,
`git diff --check`, ‏Source guard על 696 קבצים ו־35 Client graphs,
‏Secret hygiene על 1,404 קבצים כולל היסטוריית Git ו־15 בדיקות Interface
guard עברו. שער Production לא שונה על סמך Adapter מקומי בלבד.

# עדכון 4.111 — Clerk invitation worker wiring ו־shared rate limit

4.111.1 **הושלם מקומית:** Worker composition מקבל כעת Provider factory
במקום Provider שנבנה מחוץ ל־PostgreSQL foundation. ה־Factory מקבל רק את
Clerk Organization binding repository ואת יוצר ה־Rate-limit binding מאותו
Foundation, ולכן כל מופעי ה־Worker משתמשים באותו מסד ובאותו Bucket.

4.111.2 נוספה תצורה מפורשת ללא ברירות מחדל עבור Policy
`clerk-organization-invitation`. ‏Capacity יכול להיות לכל היותר 125
ו־Refill period לפחות 3,600 שניות. גם Factory ישיר מאמת שוב את הגבולות
ונכשל סגור לפני בניית Provider אם Policy עלול לעבור את תקציב ה־Endpoint.

4.111.3 ‏Migration `0028_clerk_invitation_rate_limit.sql` מוסיפה את
ה־Policy ל־Constraint הסגור של ה־Token buckets. ‏PostgreSQL 16.13 זמני
ונקי עבר בפועל את כל 29 המיגרציות ואת 80 תרחישי ה־Concurrency; השרת כובה
בסיום. גם Migration contract ו־Parity עברו עבור 36 מיגרציות D1, ‏29
מיגרציות PostgreSQL וכל 51 טבלאות D1.

4.111.4 שער השחרור המקומי עבר במלואו. ‏Build וכל **2,653 הבדיקות** עברו
ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint, ‏`git diff --check`, ‏Source
guard על 697 קבצים ו־35 Client graphs, ‏Secret hygiene על 1,406 קבצים
כולל היסטוריית Git, ‏15 בדיקות Interface ו־Dependency lock ל־33 תלויות
ישירות עברו.

4.111.5 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. המימוש המקומי אינו מוכיח Clerk Dashboard, ‏MFA,
Backfill, ‏429/`Retry-After`, הזמנה חיה או Railway Staging. עדיין נדרש Start
command תפעולי שמקבל את ערכי ה־Identity וה־Policy המאושרים, Telemetry וראיית
Staging חתומה. אין Commit או Push במסגרת שלב זה.

# עדכון 4.112 — Railway BullMQ Worker start command

4.112.1 **הושלם מקומית:** נוספה פקודת
`npm run start:railway-worker:bullmq` שמרכיבה תהליך Worker יחיד עבור ארבעת
התורים: Campaign delivery, ‏Message template submission, ‏Meta webhook
ו־Team invitation. כל התורים משלימים Readiness לפני ה־Scheduler ונסגרים
לפני PostgreSQL.

4.112.2 הפקודה מחברת את Clerk Organization provider ואת ה־shared
PostgreSQL invitation guard מאותו Foundation. תצורת Identity או Rate limit
חסרה נעצרת לפני פתיחת Worker connections; גם Dependency או Environment
זדוניים ממופים לשגיאה תחומה ללא דליפת ערכים פרטיים.

4.112.3 תוקן כשל Startup שבו Environment מלא הועבר אל חוזה BullMQ הסגור.
כעת רק שמונת מפתחות BullMQ מוקרנים לתצורת Redis, ולכן מפתחות PostgreSQL,
Meta ו־Clerk הנדרשים ל־Worker אינם נדחים בטעות כ־Unknown fields.

4.112.4 נוסף מקור Meta Retry תחום לתגובת הספק: קוד 130429 משתמש רק ב־
`Retry-After` חי ובטוח; 131049 מחיל את Cooldown ה־Marketing המאושר; 131056
גוזר Backoff ממונה הניסיונות העמיד. קוד, Scope או שדה מורחב שאינם תואמים
נכשלים סגור, ואין Retry מומצא.

4.112.5 נוסף Structured JSON logger מקומי ללא Tenant, ‏Delivery identity,
Payload או Secret. הוא מכסה כשלי Connection/Worker/Publisher, ‏DLQ,
Cleanup ו־Scheduler. הוא אינו מחליף Better Stack/OpenTelemetry חי.

4.112.6 שער השחרור המקומי עבר במלואו. ‏Build וכל **2,665 הבדיקות** עברו
ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו.
Source guard עבר על 700 קבצים ו־35 Client graphs; ‏Secret hygiene עבר על
1,413 קבצי עבודה — 1,219 מנוהלים ו־194 חדשים — כולל היסטוריית Git;
Interface guard עבר 15 בדיקות, Dependency lock עבר 33 תלויות ישירות,
וחוזי Migration/Parity עברו עבור 36 מיגרציות D1, ‏29 מיגרציות PostgreSQL
וכל 51 טבלאות D1.

4.112.7 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. חסרים עדיין ערכים וחשבונות חיים, טיפול תפעולי ב־Clerk
429/`Retry-After`, ‏Better Stack/OpenTelemetry, ערכי Retention, ‏Redis
AOF/noeviction, ‏Load/Outage rehearsal וראיית Railway Staging חתומה. אין
Commit או Push במסגרת שלב זה.

# עדכון 4.113 — Clerk 429 durable deferral

4.113.1 **הושלם מקומית:** שגיאת Clerk מזוהה מסוג 429 משתמשת רק ב־
`retryAfter` שלם וחי בטווח 1–86,400 שניות. ערך חסר, לא־שלם או מחוץ לטווח
אינו מוחלף בברירת מחדל ומסווג `unavailable`.

4.113.2 ‏Migrations `0036_team_invitation_delivery_deferrals.sql` ו־
`0029_team_invitation_delivery_deferrals.sql` מוסיפות Evidence עמיד. לפני
Delay בתור, ה־Processor שומר `retryAfterAt` ומחזיר אטומית את ה־Delivery
מ־`sending` ל־`pending`. מעבר SQL ישיר ללא Evidence תואם נדחה; Replay מוקדם
אינו פונה שוב ל־Clerk, ו־Claim חדש מותר רק לאחר ה־cutoff.

4.113.3 ‏BullMQ שומר כעת כל Delay שלם בתחום 1–86,400 שניות ללא Jitter.
בדיקות שליליות מכסות ערכי Clerk חסרים או פגומים, Deferral עמיד, Replay
מוקדם, Claim לאחר תפוגה וניסיון לעקוף את מכונת המצבים ב־SQL ישיר.

4.113.4 שער השחרור המקומי עבר במלואו. ‏Build וכל **2,671 הבדיקות** עברו
ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו.
Source guard סרק 700 קבצים ו־35 Client graphs; ‏Secret hygiene סרק 1,415
קבצים — 1,219 מנוהלים ו־196 חדשים — כולל היסטוריית Git. ‏Interface guard
עבר 15 בדיקות, Dependency lock עבר עבור 33 תלויות ישירות, וחוזי
Migration/Parity עברו עבור 37 מיגרציות D1, ‏30 מיגרציות PostgreSQL וכל 52
טבלאות D1.

4.113.5 ‏PostgreSQL 16.13 זמני ונקי הורץ בפועל. הפקודה הסמכותית החזירה:
`Node PostgreSQL integration: PASS (30 migrations, 80 concurrency scenarios)`.
השרת כובה ותיקייתו הזמנית נמחקה בסיום.

4.113.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. עדיין חסרים Clerk/Railway Staging עם 429 חי,
Telemetry של Better Stack/OpenTelemetry, ערכי Policy ו־Retention מאושרים,
Redis AOF/noeviction, ‏Load/Outage rehearsal ו־Export D1 מורשה ועדכני בן 52
טבלאות. ה־Export הישן בן 51 הטבלאות נדחה כ־`source-invalid` ולא שונה. אין
Commit או Push במסגרת שלב זה.

# עדכון 4.114 — Redis durability, crash recovery and load

4.114.1 **הושלם מקומית:** נוסף חוזה ראיה סגור וקצר־חיים עבור Railway
Redis. החוזה דורש Commit ו־Artifact digest קנוניים, AOF פעיל עם
`appendfsync everysec`, ‏`maxmemory-policy noeviction`, בריאות כתיבה
ושכתוב, Restart, כשל Publisher בזמן Outage, שחזור עבודה ולפחות 500 עבודות
שהושלמו ללא כשל.

4.114.2 זמן הבדיקה חייב להיות בתוך חלון הראיה של עד 24 שעות. Evidence
עתידי, שפג תוקפו, מורחב או שאינו תואם ל־Railway Staging נדחה. החוזה אינו
מקבל או מחזיר Redis URL, ‏Resource, ‏Account, ‏Credential, ‏Payload או
Tenant identity.

4.114.3 תרגיל Redis מקומי אמיתי הורץ מול Redis ‏8.6.1. התהליך הפעיל AOF
`everysec` ו־`noeviction`, כתב Job מתוזמן, הפיל באמצעות `SIGKILL` רק את
שרת Redis הזמני שיצר, הוכיח שה־Publisher נכשל בזמן ההשבתה, הפעיל מחדש את
אותו Data directory ושחזר את ה־Job. לאחר מכן הושלמו **500/500 עבודות** עם
אפס Failed, ‏Waiting, ‏Active או Delayed. משך מקטע העומס המקומי היה 49ms;
זהו נתון אבחוני של המכונה המקומית ולא יעד ביצועים.

4.114.4 במהלך בניית התרגיל זוהו ותוקנו שתי שגיאות ב־Test harness עצמו:
חיבור Readiness מוצלח נותק בטעות ב־`finally`, וסיום העומס נספר מתוך
Processor לפני מעבר BullMQ האטומי ל־`completed`. החוזה הסופי ממתין כעת
לאירוע `completed`, מנקה תהליכים ותיקיות גם בכשל ואינו משתמש ב־Randomness.

4.114.5 שער השחרור המקומי עבר במלואו. ‏Build וכל **2,678 הבדיקות** עברו
ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו.
Source guard סרק 701 קבצים ו־35 Client graphs; ‏Secret hygiene סרק 1,420
קבצים — 1,219 מנוהלים ו־201 חדשים — כולל היסטוריית Git. ‏Interface guard
עבר 15 בדיקות, Dependency lock עבר עבור 33 תלויות ישירות, וחוזי
Migration/Parity עברו עבור 37 מיגרציות D1, ‏30 מיגרציות PostgreSQL וכל 52
טבלאות D1.

4.114.6 שער Production נשאר בכוונה חסום. התרגיל המקומי אינו מוכיח את
Railway Plan, ‏Region, ‏Volume/Persistence, ‏Retention, ‏Memory/Cost caps,
Restart/Failover של הספק, Backlog של ארבעת התורים או Telemetry חי. נדרשת
ראיית Railway Staging מורשית הקשורה ל־Release הנוכחי; אין Commit או Push
במסגרת שלב זה.

# עדכון 4.115 — Better Stack OTLP Logs for Railway Worker

4.115.1 **הושלם מקומית:** ה־Railway Worker מחובר ל־Better Stack באמצעות
חבילות OpenTelemetry הרשמיות והנעולות. ‏OTLP Logs נשלחים ב־Batch עם gzip,
Connection יחיד, Queue פנימי תחום ו־Timeout של חמש שניות; Structured JSON
נשאר במקביל ב־`stdout`.

4.115.2 ‏Staging ו־Production דורשים Release SHA קנוני, Endpoint מסוג
HTTPS תחת Domain של Better Stack ובנתיב `/v1/logs`, ו־Source token מלא.
Endpoint עם Credentials, ‏Port, ‏Query, ‏Fragment, Domain מתחזה או נתיב
אחר נדחה. תצורה חסרה או פגומה עוצרת את ה־Worker לפני פתיחת חיבורי Queue.

4.115.3 ה־Resource מכיל רק Service, ‏Release ו־Environment. האירועים
מכילים רק Kind, ‏Code, שם תור מהרשימה הסגורה, Outcome, ‏Duration ומונים.
Tenant, ‏Delivery key, ‏Recipient, ‏Email, ‏Payload, ‏Redis URL, ‏Provider
response, ‏Credential, ‏Endpoint ו־Token אינם מיוצאים.

4.115.4 ‏`SIGINT` ו־`SIGTERM` סוגרים תחילה את ה־Worker, מבצעים
`forceFlush` ואז `shutdown` Idempotent. כשל Emit/Flush/Shutdown נשאר תחום,
אינו מדליף הודעת ספק ואינו משנה Ack, ‏Retry או State עסקי.

4.115.5 חמש תלויות OpenTelemetry נוספו בגרסאות מדויקות; ‏Dependency lock
עבר עבור **38 תלויות ישירות** ו־`npm audit` בזמן ההתקנה דיווח על אפס
חולשות ידועות.

4.115.6 שער השחרור המקומי עבר במלואו. ‏Build וכל **2,685 הבדיקות** עברו
ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו.
Source guard סרק 702 קבצים ו־35 Client graphs; ‏Secret hygiene סרק 1,423
קבצים — 1,219 מנוהלים ו־204 חדשים — כולל היסטוריית Git. ‏Interface guard
עבר 15 בדיקות, וחוזי Migration/Parity עברו עבור 37 מיגרציות D1, ‏30
מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.115.7 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. המימוש המקומי אינו מוכיח Source/Token חיים, Live-tail,
Retention, ‏Alerts, תקציב, Outage behavior או ראיית Staging. בנוסף טרם
נבנו Exporters עבור Railway API ו־Vercel, ‏Metrics, ‏Traces וחוזה Correlation
אטום. אין Commit או Push במסגרת שלב זה.

# עדכון 4.116 — Better Stack OTLP Logs for Railway API

4.116.1 **הושלם מקומית:** תשתית Better Stack המשותפת יוצרת כעת Runtime
נפרד ל־`connect-railway-api` ול־`connect-railway-worker`, עם אותם חוזי
תצורה, Redaction, ‏Batching ו־Lifecycle אך עם `service.name` מובחן לכל
תהליך.

4.116.2 ה־Railway API מפיק רק חמישה Signals תחומים: כשל PostgreSQL idle
client, כשל חיבור או פרסום של Meta webhook queue, וכשל חיבור או פרסום של
Team invitation queue. האירועים אינם כוללים Request URL, ‏Headers, ‏Body,
Tenant, ‏Payload, ‏Connection string, ‏Token או הודעת שגיאה חופשית.

4.116.3 ב־Staging וב־Production תצורת Telemetry מלאה ומאומתת נבדקת לפני
פתיחת ה־HTTP service. תצורה חסרה או פגומה נכשלת סגור. ‏`SIGINT` ו־
`SIGTERM` סוגרים את ה־API, מבצעים `forceFlush` ואז `shutdown` פעם אחת גם
כאשר מספר קריאות סגירה מתחרות זו בזו.

4.116.4 ה־ADR, חוזה ה־Hosting migration ומסמך התפעול עודכנו כך שאינם
מציגים עוד את Railway API exporter כחסר. הם ממשיכים להבחין בין Adapter
מקומי שעבר בדיקות לבין Source חי וראיית Ingestion שטרם קיימים.

4.116.5 שער השחרור המקומי עבר במלואו. ‏Build וכל **2,688 הבדיקות** עברו
ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו.
Source guard סרק 702 קבצים ו־35 Client graphs; ‏Secret hygiene סרק 1,423
קבצים — 1,219 מנוהלים ו־204 חדשים — כולל היסטוריית Git. ‏Interface guard
עבר 15 בדיקות, Dependency lock עבר עבור 38 תלויות ישירות, וחוזי
Migration/Parity עברו עבור 37 מיגרציות D1, ‏30 מיגרציות PostgreSQL וכל 52
טבלאות D1.

4.116.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. חסרים עדיין Source ו־Token חיים, ראיית Live-tail
ו־Staging הקשורה ל־Release, ‏Retention, ‏Alerts, תקציב, בדיקת Outage,
Vercel exporter, ‏Metrics, ‏Traces וחוזה Correlation אטום. אין Commit או
Push במסגרת שלב זה.

# עדכון 4.117 — Vercel Next.js production build boundary

4.117.1 **הושלם מקומית:** נוספה פקודת `build:vercel` נפרדת שמפיקה
Production build של Next.js 16 באמצעות Webpack. כל מסלולי App Router,
כולל מסלולי Auth, ‏Admin, ‏Invitation ו־Workspace, נבנו בהצלחה.

4.117.2 הוסרה תלות ה־Build ב־Google Fonts. במקום `next/font/google`,
Design tokens מגדירים Font stacks מקומיים ומערכתיים עבור Sans ו־Mono.
כך Build אינו דורש הורדת Font ואינו תלוי בזמינות רשת חיצונית.

4.117.3 ‏Next Webpack מחליף רק ביעד Vercel את ה־virtual module של
`cloudflare:workers` ב־Environment ריק וקפוא. ‏D1, ‏R2, ‏Queues ו־Secrets
אינם זמינים ב־Vercel; מסלולים ישנים שטרם הועברו ל־Railway נשארים
Fail-closed. ‏Vinext ממשיך להשתמש ב־Cloudflare bindings האמיתיים שלו.

4.117.4 פקודת `npm test` מריצה כעת את שני ה־Production builds לפני כל
הבדיקות: Cloudflare/Vinext וגם Vercel/Next.js. בכך Regression באחד משני
יעדי המעבר חוסם את שער השחרור המקומי ואת Job ה־`tests-and-build` הקיים.

4.117.5 שער השחרור המקומי עבר במלואו. שני ה־Builds וכל **2,692
הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 703 קבצים ו־35 Client graphs;
Secret hygiene סרק 1,425 קבצים — 1,219 מנוהלים ו־206 חדשים — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency lock עבר עבור
38 תלויות ישירות, וחוזי Migration/Parity עברו עבור 37 מיגרציות D1, ‏30
מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.117.6 זה עדיין אינו Vercel Cutover. חסרים Project configuration, ערכי
Environment, ‏Preview deployment, ‏Route smoke, ‏Vercel Better Stack
exporter והשלמת מסלולים שעדיין תלויים ב־Cloudflare. שער Production נשאר
בכוונה על **5 Ready, ‏18 Blocked ו־11 Decision required**. אין Commit או
Push במסגרת שלב זה.

# עדכון 4.118 — Better Stack OTLP Logs for Vercel Web

4.118.1 **הושלם מקומית:** שכבת יצירת ה־OTLP exporter חולצה למודול
משותף, ולכן `connect-vercel-web`, ‏`connect-railway-api` ו־
`connect-railway-worker` משתמשים באותו Validator, ‏HTTPS endpoint policy,
Resource attributes, ‏Batch limits, ‏gzip, ‏Timeout ו־Connection limit.

4.118.2 ‏Vercel Preview ו־Production דורשים `VERCEL=1`, ‏`VERCEL_ENV`,
`VERCEL_GIT_COMMIT_SHA`, ‏Better Stack endpoint ו־Source token. ערך חסר
או פגום גורם ליצירת Railway API client להיכשל סגור. ‏Local ו־Development
ללא ערכי ספק אינם שולחים Telemetry חיצוני.

4.118.3 כל קריאת Vercel Web ל־Railway API מפיקה רק Operation קנוני,
Query/Mutation, ‏Outcome, קוד תחום ומשך תחום. ‏Payload, ‏Request URL,
Headers, ‏OIDC token, ‏Clerk token, ‏Tenant, ‏Response body ופרטי ספק אינם
נרשמים.

4.118.4 ‏Vercel מחזיק Logger provider אחד לכל Warm instance ורושם
`forceFlush` באמצעות `after()` של Next.js אחרי הקריאה. כשל Record,
Scheduling או Flush נשאר תחום ואינו משנה הצלחה, שגיאת ספק, Timeout או
תוצאה עסקית של Railway API.

4.118.5 שער השחרור המקומי עבר במלואו. שני ה־Production builds וכל
**2,697 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 705 קבצים ו־35 Client graphs;
Secret hygiene סרק 1,428 קבצים — 1,219 מנוהלים ו־209 חדשים — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency lock עבר עבור
38 תלויות ישירות, וחוזי Migration/Parity עברו עבור 37 מיגרציות D1, ‏30
מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.118.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. שלושת Exporters הושלמו מקומית, אך חסרים Source/Token
חיים, Live ingestion, ‏Retention, ‏Alerts, תקציב, Metrics, ‏Traces,
Correlation אטום וראיית Preview/Staging הקשורה ל־Release. אין Commit או
Push במסגרת שלב זה.

# עדכון 4.119 — Opaque W3C correlation בין Vercel ל־Railway

4.119.1 **הושלם מקומית:** כל קריאת Vercel Web ל־Railway API נושאת כעת
`traceparent` תקני בגרסת W3C `00`. ‏Vercel גוזר Trace ID ו־Span ID
דטרמיניסטיים באמצעות HMAC-SHA256 מ־`x-vercel-id` ומ־Secret ייעודי. אין
Randomness, אין אימוץ של Trace שהגיע מה־Browser ואין העברת `tracestate` או
`baggage`.

4.119.2 ‏`CONNECT_TRACE_CONTEXT_HMAC_KEY` הוא Secret שנשאר רק ב־Vercel,
מקודד כ־Base64URL קנוני של 32 בתים ואינו יכול להיות כולו אפסים. ב־Preview
וב־Production מפתח חסר או פגום, או `x-vercel-id` חסר או פגום, מחזירים
`CORRELATION_UNAVAILABLE` לפני קריאת Clerk/Vercel OIDC tokens ולפני כל
פנייה לרשת. Development מקומי ללא המפתח אינו ממציא מזהה חלופי.

4.119.3 ‏Railway מאמת תחילה את זהות השירות באמצעות Vercel OIDC, ורק לאחר
הצלחה מפרש את `traceparent`. הקשר פגום נדחה ב־400 לפני אימות המשתמש ולפני
Dispatch. לאחר מכן אותו Trace context מקושר ל־OTLP log של קריאת ה־API
ב־Vercel ול־OTLP log של בקשת ה־API ב־Railway, בלי לשכפל מזהים כ־Custom
attributes ובלי לרשום Payload, ‏PII, ‏Tokens או Headers.

4.119.4 שער השחרור המקומי עבר במלואו. שני ה־Production builds וכל
**2,710 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 707 קבצים ו־35 Client graphs;
Secret hygiene סרק 1,432 קבצים — 1,219 מנוהלים ו־213 חדשים — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency lock עבר עבור
39 תלויות ישירות, וחוזי Migration/Parity עברו עבור 37 מיגרציות D1, ‏30
מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.119.5 בדיקת PostgreSQL חיה ומבודדת עברה מול מסד מקומי זמני: **30
מיגרציות ו־80 תרחישי Concurrency**. המסד והתהליך הזמניים נסגרו ונמחקו;
לא הייתה גישה למסד Production או Staging.

4.119.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. עדיין חסרים המפתח וה־`x-vercel-id` בסביבת Vercel
אמיתית, הוכחת Ingestion שבה אותו Trace ID מופיע בשני השירותים, Spans
ו־Metrics מלאים, ‏Retention, ‏Alerts, תקציב וראיית Preview/Staging הקשורה
ל־Release. אין Commit או Push במסגרת שלב זה.

# עדכון 4.120 — OTLP API Traces and Metrics

4.120.1 **הושלם מקומית:** נתיב Vercel Web → Railway API מפיק כעת
OpenTelemetry Spans אמיתיים באמצעות OTLP/HTTP. ‏Vercel מפיק Root Client
Span עם ה־Trace ID וה־Span ID האטומים שכבר נגזרו ב־HMAC; Railway מפיק
Server Span שהוא Child דטרמיניסטי שלו. ה־SDK אינו משתמש במחולל המזהים
האקראי שלו במסלול זה.

4.120.2 ‏Logs בכל שירות מקושרים ל־Span המקומי. מזהי Trace ו־Span נשארים
בשדות OpenTelemetry הייעודיים ואינם מוכפלים כ־Attributes. ה־Span attributes
כוללים רק Role, ‏Operation קנוני, Query/Mutation, ‏Outcome וקוד תחום; אין
Tenant, משתמש, URL, ‏Header, ‏Token, ‏Payload או הודעת שגיאה חופשית.

4.120.3 שני Metrics בלבד מיוצאים: `connect.railway_api.requests` כמונה
ו־`connect.railway_api.duration` כהיסטוגרמה במילישניות. ‏Cardinality מוגבלת
ל־128 סדרות לכל Instrument. ‏Spans משתמשים ב־Queue של עד 1,024 וב־Batch של
עד 128; Metrics נאספים אחת ל־60 שניות. לכל Exporter Timeout של חמש שניות,
Connection יחיד ו־gzip.

4.120.4 ‏`BETTER_STACK_OTLP_LOGS_ENDPOINT` נשאר הקלט הקנוני היחיד. לאחר
אימות HTTPS, ‏Domain ונתיב `/v1/logs`, ה־Runtime גוזר רק את הנתיבים
`/v1/traces` ו־`/v1/metrics` באותו Host ומשתמש באותו Source token. כשל
Record, ‏Flush או Shutdown נשאר תחום ואינו משנה תוצאה עסקית.

4.120.5 שער השחרור המקומי עבר במלואו. שני ה־Production builds וכל
**2,714 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 708 קבצים ו־35 Client graphs;
Secret hygiene סרק 1,434 קבצים — 1,219 מנוהלים ו־215 חדשים — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency lock עבר עבור
43 תלויות ישירות, וחוזי Migration/Parity עברו עבור 37 מיגרציות D1, ‏30
מיגרציות PostgreSQL וכל 52 טבלאות D1. התקנת התלויות דיווחה על אפס חולשות
ידועות.

4.120.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. עדיין חסרים Source/Token ו־HMAC key חיים, הוכחת
Waterfall ו־Metrics ב־Better Stack, כיסוי Spans/Metrics לתורי Worker
ולפעולות ספק נוספות, ‏Retention, ‏Alerts, תקציב וראיית Preview/Staging
הקשורה ל־Release. אין Commit או Push במסגרת שלב זה.

# עדכון 4.121 — OTLP Railway Worker Traces and Metrics

4.121.1 **הושלם מקומית:** Railway Worker מפיק כעת OTLP/HTTP Traces
ו־Metrics מאותו Event קנוני ומצומצם שמשמש את שכבת ה־Logs. לפני כתיבה
ל־stdout, ל־OTLP Logs, ל־Traces או ל־Metrics האירוע עובר Validator סגור
הדורש מבנה מדויק, קודים ו־Queue names מורשים וגבולות מספריים קשיחים.

4.121.2 פעולות Worker בעלות משך אמיתי מפיקות Root span דטרמיניסטי
באמצעות SHA-256 עם Domain separation. ה־Trace ID וה־Span ID נגזרים רק
מהאירוע הקנוני ואינם חושפים Job ID, ‏Tenant, משתמש, Payload או פרטי ספק.
אותו Span context וזמן השלמה מקשרים את ה־OTLP log לאותה פעולה. אין שימוש
במחולל המזהים האקראי של ה־SDK.

4.121.3 ארבעת התורים — Campaign delivery, ‏Message-template submission,
Meta webhook ו־Team invitation — מכוסים ב־`connect.worker.events`.
פעולות מדודות מוסיפות את `connect.worker.operation.duration`, ו־Counters
תחומים מוסיפים את `connect.worker.items`. ‏Cardinality מוגבלת ל־128,
תור ה־Batch מוגבל ל־1,024, גודל Batch ל־128, מרווח Metrics הוא 60 שניות
ו־Timeout לכל Exporter הוא חמש שניות.

4.121.4 לא נוצרים Spans מלאכותיים לאירועי Queue error, ‏DLQ או Cleanup
שאין להם זמן התחלה ומשך אמיתיים. לכן עדיין חסרים Spans ברמת Delivery
עבור Team invitation ו־Template submission, וכן Child spans לפניות HTTP
אל ספקים. זהו פער תצפיתיות מתועד ולא כיסוי מדומה.

4.121.5 שער השחרור המקומי עבר במלואו. שני ה־Production builds וכל
**2,720 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 710 קבצים ו־35 Client graphs;
Secret hygiene סרק 1,437 קבצים — 1,219 מנוהלים ו־218 חדשים — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency lock עבר עבור
43 תלויות ישירות, וחוזי Migration/Parity עברו עבור 37 מיגרציות D1, ‏30
מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.121.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. עדיין חסרים Source/Token חיים, הוכחת Ingestion של
Worker spans ו־Metrics ב־Better Stack, ‏Retention, ‏Alerts, תקציב, בדיקת
Outage וראיית Preview/Staging הקשורה ל־Release. אין Commit או Push במסגרת
שלב זה.

# עדכון 4.122 — Per-delivery ו־Meta Provider child spans

4.122.1 **הושלם מקומית:** הזמנות צוות והגשות Message template מפיקות
כעת `delivery-attempt` עם זמני התחלה, סיום ומשך אמיתיים. אירוע הזמנת צוות
נמדד סביב ה־Dispatch processor; אירוע Template נמדד סביב ניסיון ה־Outbox
כולו. תוצאת Telemetry אינה משנה Ack, ‏Retry, Persistence או תוצאה עסקית.

4.122.2 כאשר Template worker מבצע Meta POST, האירוע כולל מדידה מקוננת
רק של הקריאה לספק. ה־OTLP exporter יוצר Delivery `CONSUMER` parent span
ו־`CLIENT` child span בשם
`connect.provider.meta.message-template.submit`. שניהם משתמשים באותו
Trace ID וב־Parent Span ID תואם; הזמנת צוות אינה מקבלת Child מלאכותי.

4.122.3 חוזה האירוע דורש Keys מדויקים, Outcomes המותרים לכל Queue, זמנים
עקביים ו־Provider request שנמצא כולו בתוך חלון ה־Delivery. הוא אינו מקבל
Tenant, משתמש, Email, ‏Delivery/Submission/Template key, ‏WABA, ‏URL,
Token, ‏Payload או הודעת שגיאה חופשית. Parent ו־Child IDs נגזרים באופן
דטרמיניסטי מהאירוע הקנוני ללא Randomness.

4.122.4 ‏Worker telemetry כולל כעת ארבעה Metrics תחומים:
`connect.worker.events`, ‏`connect.worker.operation.duration`,
`connect.worker.provider.duration` ו־`connect.worker.items`. ‏Provider
labels מוגבלים ל־`meta`, הפעולה הקנונית, Outcome וגרסת Schema.

4.122.5 שער השחרור המקומי עבר במלואו. שני ה־Production builds וכל
**2,728 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 711 קבצים ו־35 Client graphs;
Secret hygiene סרק 1,439 קבצים — 1,219 מנוהלים ו־220 חדשים — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency lock עבר עבור
43 תלויות ישירות, וחוזי Migration/Parity עברו עבור 37 מיגרציות D1, ‏30
מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.122.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. עדיין חסרים Child spans לפניות Meta בקמפיינים
וב־Reconciliation ולפניות Clerk, וכן Source/Token חיים, הוכחת Waterfall
ב־Better Stack, ‏Retention, ‏Alerts, תקציב, Outage test וראיית
Preview/Staging הקשורה ל־Release. אין Commit או Push במסגרת שלב זה.

# עדכון 4.123 — Campaign, Reconciliation ו־Clerk Provider child spans

4.123.1 **הושלם מקומית:** נוספה שכבת Provider request telemetry משותפת
המבודדת מדידות באמצעות `AsyncLocalStorage`. לכל Delivery או Maintenance
נפתח Scope נפרד, הקריאות נשמרות לפי סדר ביצוען, וכל Scope מוגבל ל־64
קריאות. פעולות מקבילות אינן חולקות מדידות וקריאה מחוץ ל־Scope אינה
ממציאה Span.

4.123.2 שליחת Campaign דרך Meta מפיקה כעת Delivery `CONSUMER` parent
ו־`CLIENT` child עבור `campaign-message.send`. ‏Template reconciliation
מפיק Child נפרד עבור כל עמוד `message-template.list`, תחת Maintenance
parent. ‏Clerk מפיק Child נפרד עבור `organization-invitation.list` ועבור
`organization-invitation.create`, תחת אותו Team-invitation parent.

4.123.3 ה־Worker OTLP exporter תומך כעת במספר Child spans אחים לאותה
פעולת אב. לכל Child נגזר Span ID דטרמיניסטי נפרד לפי האירוע הקנוני וסדר
הקריאה; כולם חולקים את Trace ID של האב ומצביעים ל־Parent Span ID שלו.
Provider duration metric נרשם פעם אחת לכל קריאה אמיתית.

4.123.4 החוזה מקבל רק Provider, ‏Operation מרשימה סגורה, Outcome וזמנים
עקיבים שנמצאים בתוך חלון האב. הוא אינו מקבל Tenant, משתמש, Phone, ‏Email,
Organization/WABA ID, ‏URL, ‏Delivery/Template key, ‏Token, ‏Payload,
Provider response או הודעת שגיאה חופשית. כשל Telemetry אינו משנה תוצאה
עסקית, Ack, ‏Retry או Persistence.

4.123.5 שער השחרור המקומי עבר במלואו. שני ה־Production builds וכל
**2,735 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 713 קבצים ו־35 Client graphs;
Secret hygiene סרק 1,442 קבצים — 1,219 מנוהלים ו־223 חדשים — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency lock עבר עבור
43 תלויות ישירות, וחוזי Migration/Parity עברו עבור 37 מיגרציות D1, ‏30
מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.123.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. כיסוי ה־Provider spans המקומי הושלם לחמש פעולות
הספק שבתחום, אך עדיין חסרים Source/Token חיים, הוכחת Waterfall ו־Metrics
ב־Better Stack, ‏Retention, ‏Alerts, תקציב, Outage test וראיית
Preview/Staging הקשורה ל־Release. אין Commit, ‏Push או Deployment במסגרת
שלב זה.

# עדכון 4.124 — Better Stack Staging Evidence Contract

4.124.1 **הושלם מקומית:** נוסף חוזה Evidence סגור וקצר־חיים ל־Better
Stack Staging. ה־Artifact קשור ל־Release ID, ‏Commit SHA ו־Artifact digest
מדויקים, תקף לכל היותר 24 שעות ומוגן ב־Digest קנוני משלו. שדה חסר, שדה
עודף, ערך עתידי, Evidence שפג תוקפו או אי־התאמה ל־Release נחסמים.

4.124.2 החוזה דורש בדיוק שלושה Services, חמישה Trace waterfalls, שישה
Metrics ושתי בדיקות Alert. הוא דורש גם אפס ממצאים בבדיקת PII/Secrets,
תרגיל Outage שעבר ללא השפעה עסקית ו־Digests נפרדים למדיניות Retention
ולמדיניות תקרת העלות. כל Fingerprint הוא SHA-256; ‏Endpoint, ‏Token,
Source/Trace ID גולמי, Tenant, משתמש, נמען ו־Payload אינם מתקבלים.

4.124.3 נוסף מאמת Read-only לקובץ
`.artifacts/better-stack-staging-evidence.json`. המאמת חוסם Symlink,
קובץ Group/World-writable וקובץ גדול מ־48KB, ומפריד בין Evidence פגום,
עתידי, פג־תוקף, Release mismatch ו־Artifact mismatch. הפקודה
`npm run verify:better-stack-staging-evidence` אינה מתקשרת עם Better Stack
ואינה יוצרת או מדמה ראיה.

4.124.4 שער Production מפעיל את המאמת לפני Production Readiness. שני
הסעיפים `operations.monitoring-alerting` ו־`operations.slo-measurement`
דורשים כעת גם Implementation שהושלם וגם Evidence חי ותקף. Evidence אינו
יכול להסתיר קוד חסר, וקוד מקומי אינו יכול להוכיח ספק חיצוני חי.

4.124.5 שער השחרור המקומי עבר במלואו. שני ה־Production builds וכל
**2,749 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 714 קבצים ו־35 Client graphs;
Secret hygiene סרק 1,446 קבצים — 1,219 מנוהלים ו־227 חדשים — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency lock עבר עבור
43 תלויות ישירות, וחוזי Migration/Parity עברו עבור 37 מיגרציות D1, ‏30
מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.124.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. לא נוצר Artifact חי ולא הוגדרו Source/Token,
Retention, ‏Cost cap או Alert routing מומצאים. נדרשים חשבון Better Stack,
פריסת Staging ידועה, בדיקות Live tail/Waterfall/Metrics/Alerts/Redaction,
אישור המדיניות ותרגיל Outage אמיתי. אין Commit, ‏Push או Deployment
במסגרת שלב זה.

# עדכון 4.125 — Better Stack Incident Alert Adapter

4.125.1 **הושלם מקומית:** נוסף `OperationalAlertSink` אמיתי עבור Better
Stack Incident API. ה־Adapter שולח `SLO_BREACH` ו־
`SLO_INSUFFICIENT_DATA` רק ל־Endpoint הרשמי הקבוע, עם Bearer token ייעודי,
Timeout של חמש שניות, Redirect חסום ותגובה מוגבלת ל־32KB.

4.125.2 כל החלטות D10 נשארות מפורשות: Requester email, ‏Escalation
policy ID, חמשת ערוצי Call/SMS/Email/Push/Critical ו־`team_wait`. אין
Default לערוץ או לזמן הסלמה; לפחות ערוץ אחד נדרש ו־Critical מחייב Push.
Development/Test פועלים ללא הספק רק כאשר כל ערכי הספק חסרים; תצורה חלקית
נחסמת.

4.125.3 לפני רשת ה־Adapter מאמת מחדש מבנה סגור, Owner, ‏Route, חלון
מדידה, יעד 99.5%, מספר אירועים והקשר בין הקוד לתוצאה. Body ההתראה מכיל רק
קוד, חלון UTC, יעד, תוצאה ומספר אירועים. אין Tenant, משתמש, מספר טלפון,
תוכן הודעה, Payload, ‏Trace ID או Token. תשובת ספק אינה מחזירה או שומרת
את מזהה ה־Incident.

4.125.4 Production Readiness דורש כעת תצורת Incident תקינה בנוסף למימוש
Monitoring ול־Staging evidence. גם `operations.slo-alert-policy` אינו
Ready ללא תצורת הספק. Source guard חוסם את `BETTER_STACK_SOURCE_TOKEN`
ואת `BETTER_STACK_INCIDENT_API_TOKEN` בכל Client dependency graph.

4.125.5 ‏Better Stack SQL API אומת כממשק ה־Read-only הרשמי ל־Metrics,
אך ה־Host, ה־Credentials ושמות הטבלאות נוצרים בחשבון וב־Region החיים.
לכן לא נכתב Data-source adapter עם Query או Table name מומצאים; הוא נשאר
חסום עד Source ו־Schema מאומתים ב־Staging.

4.125.6 שער השחרור המקומי עבר במלואו. שני ה־Production builds וכל
**2,758 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 715 קבצים ו־35 Client graphs;
Secret hygiene סרק 1,448 קבצים — 1,219 מנוהלים ו־229 חדשים — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency lock עבר עבור
43 תלויות ישירות, וחוזי Migration/Parity עברו עבור 37 מיגרציות D1, ‏30
מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.125.7 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. עדיין נדרשים Primary/Backup שמיים, שעות פעילות,
ערוצים, זמן הסלמה, Team-scoped Incident token, ‏Source/SQL schema,
Retention, ‏Cost cap, ‏Alert drill ו־Staging evidence חיים. אין Commit,
Push או Deployment במסגרת שלב זה.

# עדכון 4.126 — Meta Bot Reply Adapter

4.126.1 **הושלם מקומית:** נוספו Adapter, ‏Processor ו־Runtime שרתיים
לשליחת תשובות Bot דרך Endpoint ההודעות הרשמי של Meta. Text נשלח כ־
`text`, ותפריט קצר נשלח כ־`interactive/button`. Acceptance מתקבלת רק
מתשובה יחידה בעלת `messaging_product=whatsapp` ו־`wamid` תקין.

4.126.2 ה־Processor פותר מחדש את חיבור Meta הנוכחי לפי Tenant, מחייב
Connection במצב `connected` ו־Phone Number ID זהה לזה שנקלט ב־Webhook,
ומשתמש ב־Token רק בתוך פעולת ה־Credential Vault. Cross-tenant,
Connection מבוטל, Phone mismatch ו־Credential חסר נכשלים סגור.

4.126.3 ה־Adapter דורש Contract סגור ואוכף מראש E.164, מזהים
דטרמיניסטיים, עד שלושה Reply buttons וכותרת של עד 20 תווים. אין יצירת
מזהה אקראי. Telemetry חדש מסוג `meta/bot-reply.send` שומר רק זמן,
תוצאה ושם פעולה ללא Tenant, טלפון, תוכן, Payload, ‏Delivery key או Token.

4.126.4 HTTP 4xx מפורש ממופה לקוד מוגבל, כולל חלון שירות, Pair,
Throughput ו־Quality. ‏Timeout, שגיאת רשת, HTTP 5xx או Acceptance פגומה
נשארים Outcome לא ידוע; שכבת ה־Outbox הקיימת תסמן אותם `ambiguous` ולא
תבצע Send חוזר אוטומטי.

4.126.5 ה־Runtime **לא חובר ל־Worker** ו־`botReplyDeliveryAdapter`
נשאר `false`. לפני הפעלה נדרשים Gate מתוזמן לחלון השירות, Admission
אטומי ל־Pair/Phone throughput שאינו צורך מכסת Business-initiated,
הכרעה בין שלושה Reply buttons לבין WhatsApp List עבור Flows גדולים,
וחיבור Kill switch. מסמך החוזה הוא `docs/meta-bot-reply-adapter.md`.

4.126.6 בדיקות השלב מכסות Text, ‏Buttons, גבולות 3/20, קלט מורחב,
Scope, ‏Vault, מיפוי שגיאות ותוצאות עמומות. שער השחרור המקומי עבר
במלואו: שני ה־Production builds וכל **2,768 הבדיקות** עברו ללא כשל,
Skip או Todo; ‏TypeScript, ‏ESLint ו־`git diff --check` עברו. Source
guard סרק 718 קבצים ו־35 Client graphs; ‏Secret hygiene סרק 1,453
קבצים — 1,219 מנוהלים ו־234 חדשים — כולל היסטוריית Git. ‏Interface
guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות ישירות, וחוזי
Migration/Parity עברו עבור 37 מיגרציות D1, ‏30 מיגרציות PostgreSQL וכל
52 טבלאות D1.

4.126.7 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**; בפרט `automation.bot-reply-adapter` נשאר Blocked
עד חיבור כל ההגנות וראיות Staging. אין סימון Production Ready, ‏Commit,
Push או Deployment במסגרת שלב זה.

# עדכון 4.127 — Meta Bot Service Window ו־Button Continuation

4.127.1 **הושלם מקומית:** זמן ההודעה הנכנסת המאומת מ־Meta מועבר כעת
מה־Webhook עד Bot delivery. לפני הרצת ה־Flow נאכף חלון חצי־פתוח מדויק
של `[occurredAt, occurredAt + 24h)`. זמן עתידי, זמן לא קנוני והרגע השווה
בדיוק לסוף החלון נחסמים בלי ליצור Reply ובלי להפעיל AI fallback.

4.127.2 נוסף Gate שני אחרי Claim ומיד לפני Provider I/O. אם החלון נסגר
במהלך העיבוד, ה־Delivery נדחה מקומית עם קוד מוגבל ולא מתבצעת בקשת רשת.
גם ה־Meta Processor מאמת מחדש את זמן הפתיחה, זמן התפוגה, משך 24 השעות
וזמן הניסיון לפני גישה ל־Connection, ל־Credential או ל־Sender.

4.127.3 ‏Webhook מסוג `interactive/button_reply` שומר רק כותרת מוגבלת,
Option key דטרמיניסטי ו־`context.id` מוגבל. כותרת אינה מכריעה את ענף
ה־Flow כאשר קיים Option key. ‏D1 ו־PostgreSQL קושרים את Context ל־
`provider_message_id` המדויק של Reply buttons שהתקבלו ב־Meta, להודעה
הנכנסת הקודמת ולגרסת ה־Flow הפעילה. ללא Evidence תואם, Option key חיצוני
אינו מופעל.

4.127.4 נשמרה תאימות ללקוח שמקליד ידנית את כותרת הכפתור: בהיעדר
`button_reply` ניתן להמשיך רק מתפריט Buttons שהתקבל לאחר ההודעה הנכנסת
הקודמת ובחלון Evidence קיים. הודעת Interactive עם Option key מחייבת גם
Context ID; אין Fallback שקט מה־ID לכותרת שאינה תואמת.

4.127.5 שער השחרור המקומי עבר במלואו. שני ה־Production builds וכל
**2,773 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 718 קבצים ו־35 Client graphs;
Secret hygiene סרק 1,453 קבצים — 1,219 מנוהלים ו־234 חדשים — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency lock עבר עבור
43 תלויות ישירות, וחוזי Migration/Parity עברו עבור 37 מיגרציות D1, ‏30
מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.127.6 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. ‏`automation.bot-reply-adapter` נשאר Blocked עד
Admission אטומי נפרד ל־Service reply, מדיניות פרסום לתפריטים גדולים,
Kill switch, חיבור Worker וראיית WABA/Staging חיה. אין Commit, ‏Push או
Deployment במסגרת שלב זה.

# עדכון 4.128 — WhatsApp Service Reply Admission Ledger

4.128.1 **הושלם מקומית:** חוזה ה־WhatsApp rate-limit מפריד כעת בין
`business-initiated` לבין `service-reply`. שתי המחלקות משתמשות באותם
Sender, ‏Recipient ו־Pair keys אטומים, אבל Reservation key נגזר למטרה
נפרדת. הגזירה דטרמיניסטית ואינה שומרת Phone, ‏WABA, ‏Tenant או מזהה
Provider גולמי.

4.128.2 ‏Service reply משתתף באותה מכסת Phone throughput ובאותו Pair
window של שש שניות, ונחסם ב־Sender/Pair cooldown. הוא אינו צורך את מכסת
הנמענים הייחודיים ברמת Business Portfolio, אינו יוצר Portfolio in-flight
lock ואינו מושפע מ־Marketing recipient cooldown. כל ההבחנות נאכפות
אטומית גם ב־D1 וגם ב־PostgreSQL ולא רק בקוד ה־Application.

4.128.3 מיגרציות D1 ו־PostgreSQL מסווגות רשומות היסטוריות כ־
`business-initiated`, שומרות תאימות לקטגוריה היסטורית לא ידועה, ודורשות
בכתיבה חדשה Category מפורשת של `MARKETING` או `UTILITY` לכל הודעה עסקית.
כתיבה חדשה ללא Reservation class, הודעה עסקית ללא Category ו־Service
reply עם Category נחסמות Fail-closed. בדיקה שלילית מוכיחה שגם SQL ישיר
אינו עוקף את ההגנה.

4.128.4 ‏D1/PostgreSQL repositories מספקים כעת פעולת
`reserveServiceReply` נפרדת עם Replay idempotent, Pair/Throughput
serialization ותוצאה תחומה. ‏Marketing cooldown על Service reply נחסם
לפני Settlement, ולכן ניסיון שגוי אינו מסמן Delivery כ־Provider-failed
ואינו פורש Reservation תקף.

4.128.5 שער השחרור המקומי עבר במלואו. שני ה־Production builds וכל
**2,781 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 718 קבצים ו־35 Client graphs;
Secret hygiene סרק 1,455 קבצים — 1,219 מנוהלים ו־236 חדשים — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency lock עבר עבור
43 תלויות ישירות, וחוזי Migration/Parity עברו עבור 38 מיגרציות D1, ‏31
מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.128.6 ‏`automation.bot-reply-adapter` נשאר בכוונה Blocked. חיבור
ה־Admission ל־Worker לפני מנגנון Durable deferral עלול לאבד Reply שכבר
אושר כאשר Pair או Throughput מחייבים המתנה. השלב הבא הוא להוסיף ל־Bot
outbox `nextAttemptAt`, ‏Claim חוזר עם Fence, סריקת Deliveries שהגיע זמנן
ו־Retry מוגבל לחלון השירות; רק לאחר מכן לחבר Admission resolver,
Settlement, ‏Kill switch ו־Runtime adapter.

4.128.7 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. לא שונתה מוכנות חיצונית ולא הומצאה ראיית WABA,
Staging או ספק. אין Commit, ‏Push או Deployment במסגרת שלב זה.

# עדכון 4.129 — Durable Bot Reply Deferral ו־Fenced Retry

4.129.1 **הושלם מקומית:** Bot reply outbox שומר כעת את נכס השליחה
`senderPhoneNumberId`, את Fence ה־Claim בשם `claimVersion` ואת מצב הדחייה
העמיד: `nextAttemptAt`, ‏`deferredAt` ו־`lastDeferralReasonCode`. הנתונים
קיימים באותו חוזה ב־D1 וב־PostgreSQL ואינם תלויים בזיכרון של Worker.

4.129.2 ‏Claim מתבצע רק כאשר Delivery חדש או כאשר מועד הדחייה הגיע.
סריקה תחומה ודטרמיניסטית מחזירה עד 100 Deliveries שהגיע זמנם, יחד עם
חלון השירות המקורי. דחייה מותרת רק מתוך `sending`, רק למועד עתידי ולפני
סוף חלון השירות של 24 שעות; אחרת הפעולה נכשלת סגור.

4.129.3 כל Claim מגדיל את `claimVersion`. ‏Accept, ‏Reject, ‏Ambiguous
ו־Deferral מחייבים את הגרסה המדויקת, ולכן Worker ישן שאיבד את ה־Lease
אינו יכול להשלים ניסיון חדש. טריגרים בשני מסדי הנתונים מקפיאים זהות
ומצב סופי, ודוחים מעבר ישיר או Fence שאינו תואם גם כאשר מנסים לעקוף את
ה־Repository באמצעות SQL.

4.129.4 חוזה העברת הנתונים כולל את כל השדות החדשים ומאמת את הקשר בין
מצב, Fence ומועד Retry. ‏Migration/Parity עברו עבור **39 מיגרציות D1,
32 מיגרציות PostgreSQL וכל 52 טבלאות D1**. רשימת מיגרציות בדיקת
PostgreSQL החיה עודכנה עד `0031_bot_reply_delivery_deferrals.sql`.

4.129.5 שער השחרור המקומי עבר במלואו. שני ה־Production builds וכל
**2,785 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק 718 קבצים ו־35 Client graphs;
Secret hygiene סרק **1,457 קבצים — 1,219 מנוהלים ו־238 חדשים** — כולל
היסטוריית Git. ‏Interface guard עבר 15 בדיקות ו־Dependency lock עבר
עבור 43 תלויות ישירות.

4.129.6 בדיקת PostgreSQL מול מנוע מקומי לא הורצה משום שהמשתנה
`CONNECT_POSTGRES_INTEGRATION_URL` אינו מוגדר. זהו חוסר בסביבת בדיקה,
לא כשל מוכח במיגרציה. חוזי SQL, רשימת המיגרציות, Parity ובדיקות
Repository מדומות עברו; ראיית Loopback אמיתית נשארת דרישה לפני הפעלה.

4.129.7 ‏`automation.bot-reply-adapter` נשאר בכוונה Blocked. השלב הבא
הוא לחבר Worker שמפעיל מיד לפני Provider I/O את Policy resolver ואת
`reserveServiceReply`, מתרגם Pair/Throughput blocker ל־Deferral עמיד,
סורק Due deliveries בלי להריץ שוב Webhook או Flow, ומבצע Settlement
מתואם ל־Reservation ול־Provider. לאחר מכן עדיין נדרשים מדיניות לתפריטים
גדולים, Kill switch וראיית WABA/Staging חיה.

4.129.8 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. אין סימון Production Ready, ‏Commit, ‏Push או
Deployment במסגרת שלב זה.

# עדכון 4.130 — Admitted Bot Reply Worker ו־Telemetry

4.130.1 **הושלם מקומית:** ‏Railway/BullMQ Worker מחבר כעת את Bot reply
outbox אל ה־Meta adapter דרך Current delivery policy, גזירת HMAC
דטרמיניסטית ו־`reserveServiceReply`. כל Reservation נוצר מיד לפני
Provider I/O ורק לאחר פתרון מחדש של חיבור Meta וקריאת ה־Credential דרך
ה־Vault.

4.130.2 ‏Pair, ‏Phone throughput או Provider cooldown זמניים נשמרים
כ־Durable deferral עם זמן Retry מדויק. ‏Due runner תחום לעד 100 פריטים
רץ תחת אותו Scheduler lease ומוסר ישירות מה־Outbox; הוא אינו מפעיל שוב
Webhook, ‏Flow או AI. ‏Retry שחוצה את סוף חלון השירות נדחה מקומית.

4.130.3 ‏Claim פעיל של Worker אחר מחזיר `in-progress`; הוא אינו מסומן
`ambiguous`, אינו נדרס ואינו נשלח שוב. כשל Connection, ‏Credential או
Admission לפני Provider I/O נדחה לדקה אחת כאשר החלון מאפשר זאת. רק
Timeout, שגיאת רשת, HTTP 5xx או Acceptance בלתי תקינה לאחר I/O נשארים
עמומים וללא Retry אוטומטי.

4.130.4 ‏Settlement מקומי מבדיל בין בקשה שבוטלה לפני Submit לבין HTTP
4xx מפורש שהספק דחה. Acceptance אינו מסומן `delivered`: לפני Production
עדיין נדרש לקשר את Status webhook לפי `providerMessageId` ל־Bot delivery
ול־Reservation המדויקים ולבצע Settlement על Delivery/Failure בפועל.

4.130.5 כל ניסיון Processor נעטף באירוע Telemetry מוגבל מסוג
`delivery-attempt/bot-reply`, ובקשת Meta נרשמת כ־Child timing מסוג
`bot-reply.send`. Validation דוחה Queue/Operation או Outcome שאינם
תואמים, והאירוע אינו מאפשר Tenant, טלפון, טקסט, Payload, ‏Delivery key
או Token. ה־Sink מחובר למסלול Better Stack/OpenTelemetry של ה־Worker.

4.130.6 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,802 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק **722 קבצים ו־35 Client
graphs**; ‏Secret hygiene סרק **1,465 קבצים — 1,219 מנוהלים ו־246
חדשים** — כולל היסטוריית Git. ‏Interface guard עבר 15 בדיקות,
Dependency lock עבר עבור 43 תלויות ישירות, וחוזי Migration/Parity עברו
עבור 39 מיגרציות D1, ‏32 מיגרציות PostgreSQL וכל 52 טבלאות D1.

4.130.7 ‏`automation.bot-reply-adapter` נשאר בכוונה Blocked. נותרו
Provider-status settlement וקודי Cooldown מאומתים, הכרעת Flow publication
עבור יותר משלושה כפתורים, והרצת Text/Button/Status/Pair/Kill-switch מול
WABA מורשה ב־Staging. בדיקת PostgreSQL חיה דורשת עדיין
`CONNECT_POSTGRES_INTEGRATION_URL`; לא הומצאה ראיית מנוע או ספק.

4.130.8 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. אין סימון Production Ready, ‏Commit, ‏Push או
Deployment במסגרת שלב זה.

# עדכון 4.131 — Bot Provider Status ו־Settlement אטומי

4.131.1 **הושלם מקומית:** קבלת Graph API של תשובת Bot יוצרת כעת רשומת
Evidence בלתי־ניתנת לשינוי המקשרת את `deliveryKey`, ‏`providerMessageId`
ו־`reservationKey`. ‏Trigger אטומי מעביר רק את ה־Delivery שנמצא ב־
`sending` וב־Claim הנכון אל `accepted`; קבלה ללא Reservation פעיל מסוג
`service-reply`, Tenant תואם וחלון זמן תקף נכשלת סגור.

4.131.2 ‏Meta Status webhook מפצל כל אירוע בין שלושה יעדים אפשריים:
Message רגיל, Campaign delivery או Bot reply. עבור Bot, אירועי `sent`,
`delivered`, ‏`read` ו־`failed` נשמרים עם זהות אירוע וזמן ספק מדויקים.
Replay זהה הוא Idempotent, אירוע ישן מסווג כ־Stale, וזהות אירוע או
תוצאה טרמינלית סותרות אינן משנות Evidence קיים.

4.131.3 אירוע `delivered` או `failed` הראשון יוצר אטומית Settlement של
ה־Reservation המדויק כ־`delivered` או `provider-failed`. אירוע `read`
מאוחר מתקדם במצב הספק אך משמר את זמן ה־Settlement הטרמינלי הראשון.
במהלך הבדיקות נמצא ותוקן Constraint שהיה עלול לדחות מעבר חוקי
Delivered→Read, ונוסף Fail-closed check נגד שורת Provider שחזרה מ־
Tenant או Message scope אחרים.

4.131.4 נוספו Migration ‏`0039_bot_reply_delivery_provider_links.sql`
ל־D1 ו־`0032_bot_reply_delivery_provider_links.sql` ל־PostgreSQL, כולל
הגנות נגד שימוש באותו Provider message ב־Message, ‏Campaign ו־Bot.
חוזה העברת WhatsApp delivery policy קודם ל־v2, כולל תשע טבלאות ותלוי
ב־Bot runtime. ה־Parity המלא עומד כעת על **40 מיגרציות D1, ‏33
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.131.5 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,810 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript, ‏ESLint ו־
`git diff --check` עברו. Source guard סרק **725 קבצים ו־35 Client
graphs**; ‏Secret hygiene סרק **1,471 קבצים — 1,219 מנוהלים ו־252
חדשים** — כולל היסטוריית Git. ‏Interface guard עבר 15 בדיקות ו־
Dependency lock עבר עבור 43 תלויות ישירות.

4.131.6 ‏`automation.bot-reply-adapter` נשאר בכוונה Blocked. החלק
המקומי של Provider-status settlement הושלם; עדיין חסרים חילוץ מאומת של
קודי Throttling מתוך Status errors ו־Cooldown לפי Scope, הכרעת Flow
publication לתפריטים גדולים, וראיות Text/Button/Status/Pair/Kill-switch
מול WABA מורשה ב־Staging. בדיקת Loopback מול PostgreSQL אמיתי אינה חלק
מהשער המקומי ויש להריץ אותה מחדש דרך
`CONNECT_POSTGRES_INTEGRATION_URL` לפני הפעלה.

4.131.7 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. אין סימון Production Ready, ‏Commit, ‏Push או
Deployment במסגרת שלב זה.

# עדכון 4.132 — Meta Failure Evidence ו־Bot Cooldown אטומי

4.132.1 **הושלם מקומית:** ‏Status webhook מסוג `failed` מחייב כעת מערך
`errors` תחום עם קוד מספרי יחיד ועקבי. ה־Parser מעביר רק את הקוד אל
Campaign/Bot reconcilers ואינו שומר או מפיץ את `title`, ‏`message` או
`error_data.details` של Meta. אירוע שאינו Failed ובכל זאת מכיל Errors,
אירוע Failed ללא Errors, קוד לא מספרי או קודים סותרים נכשל סגור לפני
Persistence.

4.132.2 נוסף `MetaBotReplyRetryPolicy` המסתמך רק על ראיה מה־Graph response
ועל מספר ניסיון ה־Outbox העמיד. `130429` מאפשר דחייה רק עם `Retry-After`
מספרי בטווח 1–86,400 שניות; ערך חסר אינו מוחלף בברירת מחדל. `131056`
משתמש ב־`4^X`, כאשר `X` נגזר מ־`attemptCount - 1` ומוגבל. `131049`
אינו יכול ליצור Marketing recipient cooldown עבור Service reply.

4.132.3 דחיית Provider מאומתת קוראת כעת ל־
`applyProviderCooldown` דרך Bot admission. ‏Cooldown ו־Settlement מסוג
`provider-failed` נכתבים אטומית לפני שה־Bot outbox נשמר כ־Deferred.
כשל בכתיבת הראיה אינו מוחזר כ־Retry: ה־Processor נכשל וה־Worker מסווג את
ה־Delivery כ־Ambiguous. כך ניסיון שספקו או מצבו אינם ודאיים אינו נשלח
פעמיים.

4.132.4 ‏Status webhook טרמינלי אינו מחזיר Delivery שכבר התקבל לתור
השליחה ואינו ממציא `Retry-After` או Pair exponent שאינם קיימים ב־Status
payload. הוא מסיים את ה־Reservation המדויק לפי ה־Provider evidence; קוד
הכשל התחום זמין ל־Reconciler, בעוד Cooldown מתוזמן נוצר רק מדחיית Graph
שבה קיימת ראיית Retry מספקת.

4.132.5 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,817 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **726 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,473 קבצים — 1,219 מנוהלים ו־254 חדשים** — כולל היסטוריית Git.
Interface guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות
ישירות, וחוזי Migration/Parity נשארו תקינים עבור **40 מיגרציות D1, ‏33
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.132.6 ‏`automation.bot-reply-adapter` נשאר בכוונה Blocked. נותרו
הכרעת Flow publication לתפריטים מעל שלושה כפתורים, ערכי Capacity ו־Retry
מחשבון מורשה, Credentials וראיות Text/Button/Status/Pair/Kill-switch מול
WABA מורשה ב־Staging. יש להריץ מחדש גם Loopback מלא מול PostgreSQL אמיתי
דרך `CONNECT_POSTGRES_INTEGRATION_URL`.

4.132.7 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required**. אין סימון Production Ready, ‏Commit, ‏Push או
Deployment במסגרת שלב זה.

# עדכון 4.133 — תאימות WhatsApp Flow לפני פרסום

4.133.1 **הושלם מקומית:** טיוטת Bot Flow יכולה להמשיך להכיל עד עשרה
כפתורים עם כותרות באורך הקיים, אך פעולת Publish ל־WhatsApp נעצרת אם יש
יותר משלושה כפתורי Reply או אם כותרת כפתור ארוכה מ־20 תווים. המערכת אינה
ממירה תפריט גדול ל־List באופן שקט ואינה משנה את כוונת המשתמש.

4.133.2 נוסף Validator משותף ודטרמיניסטי בשם
`validateWhatsappBotFlowPublication`. הוא מחזיר Issues תחומים ובסדר קבוע
עבור חריגה ממספר הכפתורים או מאורך הכותרת. בדיקת התאימות מתבצעת ב־Service
לאחר אימות זהות הרשומה ולפני כל קריאת Publish ל־Repository.

4.133.3 אותה חסימה חלה על שני מסלולי הכתיבה: פעולת D1 הקיימת ו־Railway
עם PostgreSQL. חריגה ממופה ל־Validation error תחום; ב־Railway היא ממופה
ל־`invalid-state`. נוספה הודעה מפורשת בעברית, אנגלית וערבית המסבירה את
גבולות WhatsApp. לא מתבצעת Mutation כאשר Flow אינו תואם לפרסום.

4.133.4 נוספו בדיקות יחידה לגבולות המדויקים, לחריגה במספר הכפתורים,
לכותרת ארוכה, לחסימה לפני Repository ולמיפוי Action. הבדיקות מאמתות גם
שהמערכת אינה מבצעת המרה אוטומטית לייצוג אחר.

4.133.5 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,820 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **727 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,475 קבצים — 1,219 מנוהלים ו־256 חדשים** — כולל היסטוריית Git.
Interface guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות
ישירות, וחוזי Migration/Parity נשארו תקינים עבור **40 מיגרציות D1, ‏33
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.133.6 ‏`automation.bot-reply-adapter` נשאר בכוונה Blocked. מדיניות
פרסום ה־Flow הושלמה מקומית; עדיין חסרים Credentials וראיות חיות של
Text/Button/Status/Capacity/Retry/Pair/Kill-switch מול WABA מורשה ב־
Staging. יש להריץ מחדש גם Loopback מלא מול PostgreSQL אמיתי דרך
`CONNECT_POSTGRES_INTEGRATION_URL` לפני הפעלה.

4.133.7 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required** לפי אימות Registry נפרד. אין סימון
Production Ready, ‏Commit, ‏Push או Deployment במסגרת שלב זה.

# עדכון 4.134 — חוזה Evidence חי ל־Bot Reply

4.134.1 **הושלם מקומית:** נוסף חוזה v1 סגור עבור
`BOT_REPLY_STAGING_EVIDENCE_JSON`. הראיה תקפה לכל היותר 24 שעות ונקשרת
ל־Release ID, ‏Commit SHA ו־Artifact digest המדויקים. ‏Release ישן,
Build אחר, Evidence עתידי, פג תוקף או Observation בן יותר מ־24 שעות
נכשלים סגור.

4.134.2 החוזה דורש שבעה תרחישי WABA בסדר קבוע: Text, ‏Button, ‏Button
reply, ‏sent, ‏delivered, ‏read ו־Customer-window expiry עם `131047`.
בנוסף נדרשים Graph throughput חי של 20/80/1,000, שגיאת `130429` עם
`Retry-After`, שגיאת Pair מסוג `131056`, ‏Kill switch עם אפס בקשות ספק,
Duplicate queue delivery עם Provider POST יחיד, שימוש ב־Credential Vault
ואפס ממצאי Redaction.

4.134.3 המבנה אינו מאפשר Tenant, ‏WABA ID, ‏Phone Number ID, ‏App ID,
Token, Payload או תוכן הודעה. זהויות נכס ותרחיש מיוצגות רק ב־SHA-256
fingerprints ייחודיים. שדה נוסף, Fingerprint כפול, Digest ששונה או ערך
מגבלה שאינו מאושר גורמים ל־Evidence להידחות.

4.134.4 שער `automation.bot-reply-adapter` דורש כעת שני תנאים יחד:
Evidence במצב `configured` וגם `botReplyDeliveryAdapter=true`. דגל
ה־Implementation נשאר בכוונה `false`; JSON לבדו אינו יכול לפתוח את
Production, וקוד לבדו אינו מספיק בלי ניסוי WABA חי ואישור Release.

4.134.5 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,827 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **728 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,477 קבצים — 1,219 מנוהלים ו־258 חדשים** — כולל היסטוריית Git.
Interface guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות
ישירות, וחוזי Migration/Parity נשארו תקינים עבור **40 מיגרציות D1, ‏33
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.134.6 לא נוצרה ראיה חיה או מדומה. עדיין נדרשים חשבון WABA מורשה,
Credentials מוצפנים, Runner של Staging, ערכי Capacity/Retry מהחשבון
האמיתי והרצת כל התרחישים. יש להריץ גם Loopback מלא מול PostgreSQL אמיתי
דרך `CONNECT_POSTGRES_INTEGRATION_URL` לפני הפעלה.

4.134.7 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required** לפי אימות Registry נפרד. אין סימון Production Ready,
‏Commit, ‏Push או Deployment במסגרת שלב זה.

# עדכון 4.135 — Trusted-file Gate לראיית Bot Reply

4.135.1 **הושלם מקומית:** נוסף CLI בשם
`npm run verify:bot-reply-staging-evidence`. הוא קורא רק את
`.artifacts/bot-reply-staging-evidence.json`, מאמת את חוזה Evidence v1
ומחזיר תוצאה מוגבלת הכוללת מספר תרחישים, גרסת Graph API, ‏Throughput,
זמנים ו־File digest בלבד.

4.135.2 הקובץ נקרא דרך `readTrustedEvidenceFile`: ‏Symbolic link,
בעלות שאינה של המשתמש המריץ, יותר מ־Hard link יחיד, קובץ שאינו רגיל,
שינוי Metadata תוך כדי הקריאה, UTF-8 לא תקין והרשאת כתיבה ל־Group או
Others נכשלים סגור. הקריאה מוגבלת ל־48,000 bytes.

4.135.3 תוכן הקובץ חייב להיות זהה byte-for-byte לערך
`BOT_REPLY_STAGING_EVIDENCE_JSON` של ה־Runtime. גם הבדל Newline נחסם.
לאחר מכן נבדקים Release ID, ‏Commit SHA, ‏Artifact digest, תוקף הראיה,
זמן התצפיות וה־Digest הסמנטי.

4.135.4 ‏Production Release Gate מפעיל את המאמת לאחר Better Stack
evidence ולפני Production Readiness. ‏Local Release Gate אינו מפעיל
Evidence חיצוני; כך בדיקות מקומיות מוכיחות את הקוד בלבד ואינן יכולות
להתחזות לניסוי WABA.

4.135.5 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,833 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **728 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,479 קבצים — 1,219 מנוהלים ו־260 חדשים** — כולל היסטוריית Git.
Interface guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות
ישירות, וחוזי Migration/Parity נשארו תקינים עבור **40 מיגרציות D1, ‏33
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.135.6 לא נוצר קובץ Evidence ולא הוגדר Runtime JSON. התרחישים החיים,
בעלות Runner, ‏WABA מורשה, Credentials וערכי Capacity/Retry אמיתיים עדיין
חיצוניים. דגל `botReplyDeliveryAdapter` נשאר `false`.

4.135.7 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required** לפי אימות Registry נפרד. אין סימון Production Ready,
‏Commit, ‏Push או Deployment במסגרת שלב זה.

# עדכון 4.136 — Receipt-to-Evidence מאובטח ל־Bot Reply

4.136.1 **הושלם מקומית:** נוסף חוזה Receipt סגור בגרסת
`connect-bot-reply-staging-runner-v1`. הוא דורש Staging, ספק Meta, מצב
WABA מאושר, Graph API version, זהות Release/Commit/Artifact, שבעה
תרחישים וכל הוכחות Rate-limit, ‏Kill switch, ‏Duplicate safety, ‏Vault
ו־Redaction. שדה נוסף נדחה ואינו נמחק בשקט.

4.136.2 ‏Receipt עתידי או בן יותר משעה נדחה. תרחיש חסר, סדר שונה, קוד
ספק לא תואם, Retry-After לא בטוח, בקשת ספק בזמן Kill switch, POST כפול,
חשיפת Credential או Proof כפול אינם יכולים להפוך ל־Evidence.

4.136.3 ‏Builder ממיר כל Proof גולמי ל־SHA-256 fingerprint נפרד ואינו
מעתיק את ה־Proof ל־Evidence. לאחר הבנייה הוא מפעיל מחדש את Validator של
Evidence v1 מול אותו Release והשעון הנוכחי; רק תוצאה `configured`
מוחזרת.

4.136.4 נוסף CLI בשם
`npm run evidence:bot-reply-staging -- --receipt <absolute-path>`.
הוא קורא Receipt דרך Trusted-file, דורש נתיב מוחלט וכותב קובץ Evidence
חדש בהרשאות `0600`. הוא מסרב לדרוס קובץ קיים ודוחה Output directory
הניתן לכתיבה בידי Group או Others.

4.136.5 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,840 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **729 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,483 קבצים — 1,219 מנוהלים ו־264 חדשים** — כולל היסטוריית Git.
Interface guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות
ישירות, וחוזי Migration/Parity נשארו תקינים עבור **40 מיגרציות D1, ‏33
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.136.6 ‏Live driver עדיין חסר בכוונה. אין לבצע Graph POST ישיר מ־Script,
משום שהוא יעקוף Vault, ‏Audit, ‏Admission, ‏Rate limits, ‏Outbox ו־
Ambiguity safety. השלב הבא חייב להפעיל את התרחישים דרך מסלולי Railway
המאובטחים, בנמען מורשה ועם Confirmation מפורש.

4.136.7 לא נוצר Receipt או Evidence חי ולא נשלחה הודעת WhatsApp. שער
Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11 Decision required**
לפי אימות Registry נפרד; ‏`botReplyDeliveryAdapter` נשאר `false`. אין
Commit, ‏Push או Deployment במסגרת שלב זה.

# עדכון 4.137 — Live-driver Safety Core ו־Railway Admin Boundary

4.137.1 **הושלם מקומית:** נוספה ליבת Live driver סגורה בגרסת
`connect-bot-reply-staging-live-driver-v1`. הבקשה דורשת Confirmation
מפורש, זמן קנוני בן עד עשר דקות, Tenant staging מורשה בצד השרת,
גרסאות Connection/Policy צפויות וזהות Release/Commit/Artifact מלאה.
שדה נוסף, לרבות Token, מספר נמען או מזהה ספק, נדחה לפני I/O.

4.137.2 לפני הרצה הליבה דורשת Snapshot בטיחות סגור: Staging, חיבור WABA
מאושר, Delivery policy פעילה ובתוקף, Credential Vault מוצפן, גבול
Railway/BullMQ, מקור Evidence עמיד ב־PostgreSQL, נמען בדיקה עם Opt-in
ואישור תקף של טל למתודת בדיקות ה־Rate-limit. ‏Kill switch, גרסה שונה,
אישור עתידי או פג תוקף נכשלים סגור.

4.137.3 ‏Run key נגזר דטרמיניסטית מכל גבולות ההרצה. Durable lease פעיל
מחזיר `in-progress` ואינו יוצר הרצה שנייה. רק `completed` או `replayed`
עם Audit key ו־Receipt מאומת מול אותו Release, ‏Artifact, ‏Graph version
וזמן השלמה מתקבלים. התוצאה הציבורית אינה מחזירה Receipt או Proofs.

4.137.4 נוספה פעולת Railway אופציונלית
`system-admin.bot-reply-staging.run`. היא עוברת דרך System Admin allowlist,
מכסת Mutation ו־Idempotency key דטרמיניסטי. ה־Runtime אינו רושם את
הפעולה אם לא סופק Driver מפורש, ולכן התצורה הנוכחית אינה יכולה להפעיל
בטעות תרחיש חי.

4.137.5 נוספו **16 בדיקות ממוקדות** עבור הליבה ופעולת Railway, ובדיקת
Runtime מלאה למסלול האופציונלי. הן מכסות Production/Direct-Graph,
Tenant לא מורשה, בקשה ישנה, Extension עם Token, ‏Kill switch, נמען ללא
Opt-in, אישור Rate-limit שאינו של טל, תפוגה, Lease פעיל, Receipt פגום,
Graph mismatch, הרשאה, מכסה ו־Idempotency.

4.137.6 **עדיין חסר בכוונה:** Durable runner שמחזיק Lease, ‏Audit ו־
Receipt ב־PostgreSQL ומריץ את התרחישים דרך BullMQ וה־Bot reply worker.
לא נשלחה הודעת WhatsApp, לא נוצר Receipt/Evidence חי, ודגל
`botReplyDeliveryAdapter` נשאר `false`.

4.137.7 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,857 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **731 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,487 קבצים — 1,219 מנוהלים ו־268 חדשים** — כולל היסטוריית Git.
Interface guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות
ישירות, וחוזי Migration/Parity נשארו תקינים עבור **40 מיגרציות D1, ‏33
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.137.8 שער Production נשאר בכוונה על **5 Ready, ‏18 Blocked ו־11
Decision required** לפי אימות Registry נפרד; המימוש החדש לא פותח שער
חיצוני בלי Durable runner וראיית WABA חיה. אין Commit, ‏Push או Deployment
במסגרת שלב זה.

# עדכון 4.138 — Durable Bot Reply Staging Ledger ו־PostgreSQL Proof

4.138.1 **הושלם מקומית:** נוסף Durable runner דטרמיניסטי עבור ניסוי
Bot reply ב־Staging. הוא גוזר Request digest ו־Audit key, תובע Lease תחום
של 60–3,600 שניות, משתמש ב־Fencing version, מחזיר `in-progress` לריצה
פעילה, משחזר Completion זהה וחוסם Actor או Payload מתנגשים.

4.138.2 זהות ה־Actor מגיעה רק מ־Session מאומת בצד Railway ונקשרת ל־
Request digest. זמן Confirmation מחודש אינו יוצר Run חדש; שינוי Actor
באותו Run key נכשל כ־Conflict. תוצאת Executor שנכשלה אינה יכולה להירשם
כ־Completion.

4.138.3 נוספו Migration
`0033_bot_reply_staging_runs.sql` ו־PostgreSQL Repository. ה־Ledger שומר
זהות Release/Commit/Artifact, גרסאות Connection/Policy, ‏Graph version,
Fingerprints, ‏Lease, ‏Claim version ו־Receipt מוגבל. Triggers אטומיים
יוצרים אירועי Audit מסוג `started` ו־`completed`; Run שהושלם, אירועי
ה־Audit ומחיקת Run הם בלתי־שינוי.

4.138.4 ה־Repository מחובר ל־Railway PostgreSQL foundation. שתי תביעות
מקבילות נבדקו על PostgreSQL 16.13 אמיתי והפיקו Claim יחיד ו־
`in-progress` יחיד. Completion, ‏Replay, Actor conflict, ‏Audit metadata,
Audit tampering ו־Delete guard הוכחו על המנוע, לא רק באמצעות Mock.

4.138.5 הריצה האמיתית חשפה ותיקנה ארבע תקלות רוחב: Receipt של Cutover
חסם Bundle בן 53 טבלאות; Service Reply SQL שלח פרמטרים לא־רציפים ולכן
נכשל ב־`42P18`; Claim מקבילי התנגש ב־Unique audit key; וה־Integration
harness הניח Policy version וזמנים ישנים. החוזים עודכנו לשמירת Receipts
היסטוריים של 51/52 טבלאות ולקבלת Bundle נוכחי בן 53 טבלאות.

4.138.6 בדיקת Loopback מלאה עברה מול PostgreSQL 16.13: **34 migrations
ו־81 תרחישי concurrency**. המופע הזמני נעצר לאחר הבדיקה.

4.138.7 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,875 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **733 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,492 קבצים — 1,219 מנוהלים ו־273 חדשים** — כולל היסטוריית Git.
Interface guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות
ישירות, וחוזי Migration/Parity תקינים עבור **40 מיגרציות D1, ‏34
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.138.8 **עדיין חסר בכוונה:** BullMQ Scenario executor שמפעיל את שבעת
התרחישים דרך ה־Bot reply worker ומחזיר Receipt סגור. לא נשלחה הודעת
WhatsApp, לא נוצרה ראיה חיה, ו־`botReplyDeliveryAdapter` נשאר `false`.
שער Production נשאר על **5 Ready, ‏18 Blocked ו־11 Decision required**.
אין Commit, ‏Push או Deployment במסגרת שלב זה.

# עדכון 4.139 — Queue Envelope ו־Receipt Trust Boundary

4.139.1 **הושלם מקומית:** נוסף Queue message contract סגור בגרסת
`connect-bot-reply-staging-queue-v1`. ההודעה מקשרת את זהות ה־Run,
‏Request digest, ‏Audit key, ‏Claim version ו־Lease, וגוזרת Job ID
דטרמיניסטי מ־Run key ומגרסת ה־Claim.

4.139.2 המבנה מאמת Exact keys גם ב־Envelope וגם ב־Run הפנימי. הוא דוחה
Extension שעלול לשאת Credential, ‏Token או מזהה ספק; Actor, ‏Release,
‏Artifact, ‏Graph version ו־Fingerprints חייבים להישאר קשורים לזהות
העמידה שנחתמה ב־Durable runner.

4.139.3 נסגר גבול אמון נוסף: Receipt מה־Scenario executor עובר אימות
סגור לפני קריאת `complete`, ולכן Receipt מורחב אינו יכול להישמר ב־
PostgreSQL. אותו אימות מופעל גם על Completion שחזר מה־Repository ועל
Replay עמיד לפני החזרת תוצאה למפעיל.

4.139.4 נוספו **9 בדיקות**: שבע בדיקות Queue message ושתי בדיקות
שליליות ל־Receipt לפני Persistence וב־Replay. יחד עם בדיקות ה־Durable
runner עברו **16/16 בדיקות ממוקדות**.

4.139.5 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,884 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **734 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,494 קבצים — 1,219 מנוהלים ו־275 חדשים** — כולל היסטוריית Git.
Interface guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות
ישירות, וחוזי Migration/Parity תקינים עבור **40 מיגרציות D1, ‏34
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.139.6 **עדיין חסר בכוונה:** BullMQ adapter וה־Scenario executor שמפרסם
את ה־Envelope, מריץ את שבעת תרחישי ה־WABA דרך ה־Bot reply worker ומרכיב
Receipt סגור מתוצאות אמת. לא נשלחה הודעת WhatsApp, לא נוצרה ראיה חיה,
ו־`botReplyDeliveryAdapter` נשאר `false`. שער Production נשאר על **5
Ready, ‏18 Blocked ו־11 Decision required**. אין Commit, ‏Push או
Deployment במסגרת שלב זה.

# עדכון 4.140 — BullMQ Durable Handoff ל־Bot Reply Staging

4.140.1 **הושלם מקומית:** נוסף BullMQ adapter ייעודי עם Publisher ו־
Worker עבור Queue בשם `bot-reply-staging-v1`. ‏Job ID נגזר דטרמיניסטית
מ־Run key ומ־Claim version. לכל Job מוגדר attempt יחיד ו־
`maxStalledCount=0`, משום שהרצה אוטומטית חוזרת של ניסוי ספק חי עלולה
ליצור side effect כפול.

4.140.2 ה־Worker דוחה Envelope פגום ו־Lease שפג לפני Consumer. כשל
Consumer עובר ל־DLQ לבדיקה ידנית ואינו נשלח שוב. רשומת ה־DLQ שומרת
Source/body digests, ‏Run key ו־Claim version בלבד; היא אינה מעתיקה את
ה־Payload החשוד או שדה Credential שניסה לחצות את הגבול.

4.140.3 נוסף Queue consumer שמריץ Executor תחת אותו Fence, מאמת Receipt
סגור לפני Persistence וסוגר את ה־Run ב־PostgreSQL. הוא מחזיר ל־BullMQ
רק Outcome, ‏Run key, ‏Audit key וזמן השלמה — לא Receipt או Proofs.

4.140.4 נוסף Queued executor בצד ה־API. הוא מפרסם Envelope פעם אחת ואז
מבצע Polling ל־PostgreSQL דרך קריאת Status חדשה; Redis אינו מקור האמת.
Worker שהשלים לפני נפילת API משאיר Completion עמיד, ולכן ניסיון API
מחודש מקבל Replay מה־Ledger ולא מפעיל שוב תרחיש חי.

4.140.5 ‏PostgreSQL Repository תומך כעת בקריאת `running` או `completed`
לפי Run key ו־Request digest ללא `FOR UPDATE`. קריאת זהות חסרה או מתנגשת
מוחזרת כמצב מאוחד שאינו חושף אם Run אחר קיים. הקריאה נבדקה גם על
PostgreSQL 16.13 אמיתי: **34 migrations ו־81 תרחישי concurrency** עברו,
והמופע הזמני נעצר בסיום.

4.140.6 נוספו **20 בדיקות** עבור BullMQ adapter, ‏Queue consumer,
‏Queued executor וקריאת ה־Repository. שער השחרור המקומי עבר במלואו: שני
ה־Production builds וכל **2,904 הבדיקות** עברו ללא כשל, Skip או Todo;
‏TypeScript ו־ESLint עברו. Source guard סרק **737 קבצים ו־35 Client
graphs**; ‏Secret hygiene סרק **1,500 קבצים — 1,219 מנוהלים ו־281
חדשים** — כולל היסטוריית Git. ‏Interface guard עבר 15 בדיקות, Dependency
lock עבר עבור 43 תלויות ישירות, וחוזי Migration/Parity תקינים עבור **40
מיגרציות D1, ‏34 מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.140.7 **עדיין חסר בכוונה:** מימוש שבעת תרחישי ה־WABA שמייצר Receipt
מתוצאות אמת, Safety source עמיד עבור נמען הבדיקה ואישור המתודה, וחיבור
מפורש של ה־Publisher וה־Worker ל־Railway entrypoints. לא נשלחה הודעת
WhatsApp, לא נוצרה ראיה חיה, ו־`botReplyDeliveryAdapter` נשאר `false`.
שער Production אומת ונשאר על **5 Ready, ‏18 Blocked ו־11 Decision
required**. אין Commit, ‏Push או Deployment במסגרת שלב זה.

# עדכון 4.141 — Durable Staging Safety Evidence

4.141.1 **הושלם מקומית:** נוספה Migration
`0034_bot_reply_staging_authorizations.sql` עם Ledger Versioned ו־
Append-only עבור נמען בדיקה מורשה ואישור מתודת Rate limit של טל. הרשומה
כוללת Fingerprints בלבד; היא אינה כוללת מספר טלפון, Access token,
Ciphertext או Payload של ספק.

4.141.2 ‏Trigger אטומי נועל את ה־Meta connection ומקבל Approval רק כאשר
החיבור במצב `connected` ובגרסה המדויקת, ה־Delivery policy האחרונה פעילה
ולא פגה, ו־Credential envelope קיים. גרסאות חייבות להתקדם באחד. Replay
זהה נשאר Idempotent, בעוד זהות מתנגשת או דילוג גרסה נכשלים סגור.

4.141.3 ‏Revocation נכתב כאירוע עוקב ואינו מוחק היסטוריה. הוא חייב לשמר
במדויק את ה־Connection, ה־Policy, ה־Recipient fingerprint ואת אישור טל
שאותם הוא מבטל. הקריאה מחזירה Safety snapshot רק מהאירוע האחרון, ורק כל
עוד כל הראיות והגרסאות עדיין נוכחיות. כל Approval ו־Revocation יוצרים
Audit עמיד; Update/Delete של Event או Audit נחסמים.

4.141.4 ה־Repository החדש חובר ל־Railway PostgreSQL foundation. הוא
מפיק עבור ה־Live driver את החוזה הסגור `durable-postgres` +
`encrypted-vault` + `railway-bullmq-bot-reply-worker`, בלי לחשוף את
Credential envelope. נוספו **6 בדיקות Repository** ובדיקת Migration
שלילית נוספת.

4.141.5 ראיית Loopback מלאה עברה מול PostgreSQL 16.13 אמיתי: **35
migrations ו־82 תרחישי concurrency**. ההרצה הוכיחה שני Approvals זהים
במקביל, Row יחיד, Snapshot פעיל, Revocation מיידי, Audit בלתי־ניתן
לשינוי וחסימת הקריאה אחרי הביטול. מופע PostgreSQL הזמני נעצר בסיום.

4.141.6 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,911 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **738 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,503 קבצים — 1,219 מנוהלים ו־284 חדשים** — כולל היסטוריית Git.
Interface guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות
ישירות, וחוזי Migration/Parity תקינים עבור **40 מיגרציות D1, ‏35
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.141.7 **עדיין חסר בכוונה:** Scenario executor שמריץ את שבעת תרחישי
ה־WABA ומייצר Receipt מתוצאות אמת, Composition של ה־Safety source ושל
תור ה־Staging ב־Railway entrypoints, וראיית Staging חיה ומורשית. לא
נשלחה הודעת WhatsApp, לא נקראו Credentials חיים, לא נוצרה ראיית ספק,
ו־`botReplyDeliveryAdapter` נשאר `false`. שער Production נשאר על **5
Ready, ‏18 Blocked ו־11 Decision required**. אין Commit, ‏Push או
Deployment במסגרת שלב זה.

# עדכון 4.142 — Bot Reply Staging Scenario Orchestration

4.142.1 **הושלם מקומית:** נוסף Scenario executor סגור שמריץ בסדר קבוע
את זיהוי נכסי Meta, שבעת תרחישי ה־WABA וכל בקרות ה־Rate limit,
Idempotency, ‏Credential, ‏Redaction ו־Kill switch. הוא אינו מקבל
Credential, מספר טלפון או Provider payload ואינו מכיל Graph transport.

4.142.2 לכל אחד מ־15 הצעדים נגזרים Operation key ו־Bot reply delivery
key דטרמיניסטיים מ־Run key ומשם הצעד, ללא Claim version. ‏Observation
חייב להיות קשור למפתח המדויק, לתרחיש הצפוי ולגבול
`railway-bot-reply-worker`. ‏Reclaim משתמש באותן זהויות ולכן אינו מעניק
הרשאה חדשה לשליחה כפולה.

4.142.3 ‏Safety snapshot העמיד נקרא מחדש לפני כל צעד. Revocation,
תפוגה, שינוי Connection/Policy/Fingerprint או Lease שפג עוצרים את יתר
ההרצה. ההרשאות חייבות לכסות מראש את ה־Lease המלא. ‏Kill switch רץ אחרון.
בסיום ה־Receipt עובר אימות Evidence מלא לפני החזרתו ל־Queue consumer
ולפני כתיבה ל־PostgreSQL.

4.142.4 ‏Railway worker composition מחבר אופציונלית את BullMQ worker,
Queue consumer, ‏Scenario executor, ‏PostgreSQL Safety/Run ledgers ואת
Bot reply delivery worker הקיים. הוא דורש גם Bot reply runtime וגם Meta
webhook runtime; ללא Driver מפורש הוא אינו עולה.

4.142.5 ‏Railway API composition מחבר אופציונלית System Admin, ‏Live
driver, ‏Durable runner, ‏BullMQ publisher ו־PostgreSQL polling. ה־API
מוכיח Redis ready לפני חשיפה, מחזיק את ה־Publisher בבעלות Lifecycle אחת
ואינו רושם את הפעולה ללא System Admin ו־Staging configuration מלאים.

4.142.6 נוספו **13 בדיקות** עבור Executor, Operation keys, Revocation
באמצע Run, ‏Lease, Observation binding, ‏Receipt proof uniqueness וחיבורי
API/Worker. שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,924 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **739 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,505 קבצים — 1,219 מנוהלים ו־286 חדשים** — כולל היסטוריית Git.
Interface guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות
ישירות, וחוזי Migration/Parity נשארו תקינים עבור **40 מיגרציות D1, ‏35
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.142.7 **עדיין חסר בכוונה:** ה־Provider-bound Scenario driver שמקשר
מקרי בדיקה אמיתיים ל־Bot reply worker ולתוצאות Webhook עמידות, בחירת
Tenant staging מורשה ב־Main, והרצת WABA חיה שמפיקה Proofs. לא נשלחה
הודעת WhatsApp, לא נקראו Credentials חיים ולא נוצרה ראיית ספק.
‏`botReplyDeliveryAdapter` נשאר `false`. שער Production אומת ונשאר על
**5 Ready, ‏18 Blocked ו־11 Decision required**. אין Commit, ‏Push או
Deployment במסגרת שלב זה.

# עדכון 4.143 — Provider Driver ו־Durable Case Boundary

4.143.1 **הושלם מקומית:** נוספה ליבת Provider driver סגורה שמחברת
מקרה בדיקה מוקצה ל־`BotReplyDeliveryWorker` ול־Observation source, בלי
Graph transport ובלי יכולת לקבל Token, מספר טלפון או Provider payload.

4.143.2 תרחישי Text, ‏Buttons ו־131047 עוברים דרך Worker עם Outcome
מוגדר. ‏130429 ו־131056 חייבים להופיע כ־Deferred. בדיקת Duplicate מפעילה
אותו Delivery key פעמיים ודורשת Duplicate בפעם השנייה. ‏Ambiguous,
‏In-progress או Outcome שאינו מתאים לתרחיש נחסמים לפני יצירת Proof.

4.143.3 נוסף `subjectDeliveryKey`: תרחישי Button reply וסטטוסי
sent/delivered/read אינם שולחים הודעה, אלא חייבים להצביע על המשלוח
הדטרמיניסטי של `button-send`. ראיית Webhook שנקשרה למשלוח אחר נדחית.

4.143.4 נוספה הקצאת מקרים שמבצעת `stage` Idempotent אל PostgreSQL לפני
Dispatch. היא מאמתת Tenant, גרסאות Connection/Policy, ‏Claim, ‏Lease
וזהות המשלוח, ומחזירה ל־Driver רק Fingerprints ומפתחות אטומים. מספר
הנמען אינו יוצא מגבול ה־Repository.

4.143.5 נוסף HMAC ייעודי לנמען staging תחת
`BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1`. אין Fallback למפתח ה־Rate
limit. מקור חלון שירות חדש קורא את הודעת ה־Inbound האמיתית מ־PostgreSQL,
דורש direction מסוג `inbound` ומחשב חלון מדויק של 24 שעות.

4.143.6 ‏Railway PostgreSQL foundation וה־Worker factory מעבירים ל־
Driver את Delivery repository ואת מקור חלון השירות. Factory ייעודי
מרכיב את Case inventory, ‏HMAC, ‏Observation source ו־Kill switch רק
כאשר כל הגבולות מוגדרים; ה־Main אינו מפעיל אותו אוטומטית.

4.143.7 נוספו **24 בדיקות** עבור Provider routing, קשר ל־Button subject,
‏Outcomes של Throttling/Duplicate/Kill switch, ‏HMAC, הקצאת מקרה,
‏PostgreSQL service window והרכבת Railway factory. שער השחרור המקומי עבר
במלואו: שני ה־Production builds וכל **2,948 הבדיקות** עברו ללא כשל,
Skip או Todo; ‏TypeScript ו־ESLint עברו. Source guard סרק **744 קבצים
ו־35 Client graphs**; ‏Secret hygiene סרק **1,515 קבצים — 1,219 מנוהלים
ו־296 חדשים** — כולל היסטוריית Git. ‏Interface guard עבר 15 בדיקות,
Dependency lock עבר עבור 43 תלויות ישירות, וחוזי Migration/Parity נשארו
תקינים עבור **40 מיגרציות D1, ‏35 מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.143.8 **עדיין חסר בכוונה:** מקור פרטי עם מקרי WABA אמיתיים,
‏Observation source חי, ‏Kill-switch adapter, בחירת Tenant staging
מורשה ב־Main והרצת WABA מאושרת. לא נשלחה הודעת WhatsApp, לא נקראו
Credentials חיים ולא נוצרה ראיית ספק. ‏`botReplyDeliveryAdapter` נשאר
`false`. שער Production אומת ונשאר על **5 Ready, ‏18 Blocked ו־11
Decision required**; אין Commit, ‏Push או Deployment במסגרת שלב זה.

# עדכון 4.144 — Release-bound Private WABA Case Source

4.144.1 **הושלם מקומית:** נוסף מקור Secret פרטי למקרי WABA שמופעל רק
ב־`staging`. ה־Inventory הוא Exact-key, מוגבל ל־64 KiB ולשעתיים, ונקשר
ל־Release ID, ‏Commit SHA, ‏Artifact digest, ‏Graph API version, ‏Tenant
ולגרסאות Connection/Policy המדויקות.

4.144.2 המקור דורש בדיוק 11 מקרים בסדר קנוני. ארבעת מקרי Button
reply/status הם Observe-only וחייבים להעתיק במדויק את הנמען וה־Delivery
של `button-send`. מקרה Dispatch כפול, Extension field, ‏Payload שאינו
תואם לסוג המקרה או Lease החורג מתפוגת ה־Inventory נדחים.

4.144.3 חוזה ה־Provider case הורחב כך שזהות ה־Release/Commit/Artifact/
Graph עוברת מה־Run למקור הפרטי ולבדיקת ההקצאה. ‏Case fingerprint נגזר
ב־HMAC מהבתים המדויקים של ה־Secret ומזהות המקרה, כדי למנוע ניחוש Offline
של מספר הנמען, בלי להחזיר את המספר או התוכן ל־Provider driver.

4.144.4 ‏Railway factory בונה את המקור הפרטי בעצמו מתוך Environment
ו־Worker clock ואינו מקבל עוד Source חלופי או In-memory. נוסף Preflight
מסונן `verify:bot-reply-staging-private-cases`, ונוספו
`BOT_REPLY_STAGING_PRIVATE_CASES_JSON` ו־HMAC הנמען לרשימת ה־Secrets
האסורים ב־Git.

4.144.5 נוספו **6 בדיקות** עבור חוזה תקין, חסימת Production, התאמת
Release/Tenant/Graph, תפוגה ו־Lease, ‏Extension fields, ‏Subject drift
ופלט Preflight ללא נתונים רגישים. שער השחרור המקומי עבר במלואו: שני
ה־Production builds וכל **2,954 הבדיקות** עברו ללא כשל, Skip או Todo;
‏TypeScript ו־ESLint עברו. Source guard סרק **745 קבצים ו־35 Client
graphs**; ‏Secret hygiene סרק **1,518 קבצים — 1,219 מנוהלים ו־299
חדשים** — כולל היסטוריית Git. ‏Interface guard עבר 15 בדיקות,
Dependency lock עבר עבור 43 תלויות ישירות, וחוזי Migration/Parity נשארו
תקינים עבור **40 מיגרציות D1, ‏35 מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.144.6 **עדיין חסר בכוונה:** Observation source חי, ‏Kill-switch
adapter, בחירת Tenant staging ב־Main, הזנת שני Secrets והרצת WABA
מאושרת. לא נשלחה הודעת WhatsApp, לא נקראו Credentials חיים ולא נוצרה
ראיית ספק. ‏`botReplyDeliveryAdapter` נשאר `false`. שער Production נשאר
על **5 Ready, ‏18 Blocked ו־11 Decision required**; אין Commit, ‏Push או
Deployment במסגרת שלב זה.

# עדכון 4.145 — Durable Observation Source Boundary

4.145.1 **הושלם מקומית:** נוספה ליבת Observation source סגורה שמקבלת
רק שלושה Readers מפורשים: ‏Meta Graph לקריאות Read-only, ‏PostgreSQL
לעובדות Delivery/Webhook עמידות ו־Security/Telemetry לבקרות Credential
ו־Redaction. ה־Railway factory בונה את המקור בעצמו; לא ניתן עוד להזריק
Observation מוכן ולעקוף את בדיקות הזהות.

4.145.2 כל Fact הוא Exact-key ונקשר ל־Run, ‏Operation, ‏Release,
Commit, ‏Artifact, ‏Graph API version, ‏Tenant, ‏Connection, ‏Policy,
זמן Observation ו־Lease. עובדות Scenario נקשרות גם ל־Case, ‏Subject
delivery, ‏Recipient fingerprint ול־Dispatch outcome בפועל. Cross-run,
עובדה ישנה או עתידית, Extension field, ‏Case drift או Outcome שונה
נכשלים סגור.

4.145.3 מזהי App, ‏Business Portfolio, ‏WABA ו־Phone number נשארים בתוך
גבול ה־Reader וה־HMAC. נוסף מפתח ייעודי
`BOT_REPLY_STAGING_OBSERVATION_HMAC_KEY_V1`, ללא Fallback למפתח הנמען או
למפתח ה־Rate limit. הפלט כולל Proof אטום בלבד, ושגיאת Reader מסוננת לקוד
מוגבל ללא Provider response.

4.145.4 חוזה Redaction הוקשח כך שהוא כולל Timestamp ו־Proof חתום. ה־
Receipt מאמת אותם, וה־Evidence שומר Fingerprint של ה־Proof בלבד. זמן
Redaction משתתף כעת גם בבדיקת Freshness יחד עם יתר תצפיות הספק והאבטחה.

4.145.5 במהלך ה־Gate נמצא ותוקן כשל תאריך בלתי־תלוי בשלב: פעולות אישור
WhatsApp policy השתמשו בשעון מערכת חבוי, ולכן Fixtures קבועים פגו עם
הזמן. הגבול מקבל כעת Clock מפורש; Production משתמש בזמן מערכת ובדיקות
משתמשות בזמן דטרמיניסטי.

4.145.6 נוספו **5 בדיקות Observation** ובדיקות החוזים הקיימות הורחבו.
שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל **2,959
הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו. Source
guard סרק **746 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק **1,520
קבצים — 1,219 מנוהלים ו־301 חדשים** — כולל היסטוריית Git. ‏Interface
guard עבר 15 בדיקות, Dependency lock עבר עבור 43 תלויות ישירות, וחוזי
Migration/Parity נשארו תקינים עבור **40 מיגרציות D1, ‏35 מיגרציות
PostgreSQL ו־53 טבלאות D1**.

4.145.7 **עדיין חסר בכוונה:** מימוש שלושת ה־Readers הקונקרטיים מול
Graph/PostgreSQL/Telemetry, ‏Kill-switch adapter, בחירת Tenant staging
ב־Main, הזנת שלושת ה־Secrets והרצת WABA מאושרת. לא הומצא Endpoint או
Field של Meta, לא נשלחה הודעת WhatsApp, לא נקראו Credentials חיים ולא
נוצרה ראיית ספק. ‏`botReplyDeliveryAdapter` נשאר `false`. שער Production
אומת ונשאר על **5 Ready, ‏18 Blocked ו־11 Decision required**; אין
Commit, ‏Push או Deployment במסגרת שלב זה.

# עדכון 4.146 — PostgreSQL Staging Observation Ledger ו־Reader

4.146.1 **הושלם מקומית:** נוספה Migration 0035 עם Ledger ‏Append-only,
PII-free ו־Exact-key לחמש משפחות העובדות העמידות: Scenario, ‏Provider
retry 130429, ‏Pair limit 131056, ‏Duplicate safety ו־Kill switch.

4.146.2 ‏Trigger ה־Insert נועל את ה־Run, דורש מצב `running`, ‏Claim version
זהה, Recipient fingerprint זהה, זמן בתוך ה־Lease ו־Subject delivery מאותו
Tenant. ‏Kill switch חייב להוכיח את גרסת המדיניות העוקבת. ‏Update/Delete
נחסמים, ואין בטבלה מספר טלפון, Token, ‏Ciphertext או Provider payload.

4.146.3 נוסף Reader קונקרטי ל־PostgreSQL שמבצע קריאת Exact-key יחידה,
דורש רשומה אחת בלבד, מאמת מחדש את זהויות Run/Release/Commit/Artifact/Graph,
Tenant/Connection/Policy ואת השדות המדויקים של כל Fact, ומפיק Record digest
דטרמיניסטי. ה־Reader מחובר ל־Railway PostgreSQL Foundation.

4.146.4 במהלך ה־PostgreSQL rehearsal זוהתה תלות תאריך בבדיקת Campaign:
קמפיין HTTP מתוזמן הפך ל־due ככל שהזמן התקדם והפריע להוכחת Worker מקביל.
מועדו נגזר כעת משעון PostgreSQL ונשאר בעתיד ביחס להרצה. נוסף גם תנאי מצב
מפורש ב־Promotion UPDATE להגנת concurrency.

4.146.5 ‏PostgreSQL 16.13 נקי החיל בהצלחה את כל **36 המיגרציות** והעביר
**82 תרחישי concurrency**. הוכחת 0035 כללה Insert תחת Run פעיל, קריאה דרך
ה־Foundation, Record digest וחסימת UPDATE. נוספו **6 בדיקות** חדשות: חמש
ל־Reader ואחת לחוזה Migration. שער השחרור המקומי עבר במלואו: שני
ה־Production builds וכל **2,965 הבדיקות** עברו ללא כשל, Skip או Todo;
‏TypeScript ו־ESLint עברו. Source guard סרק **747 קבצים ו־35 Client
graphs**; ‏Secret hygiene סרק **1,523 קבצים — 1,219 מנוהלים ו־304
חדשים** — כולל היסטוריית Git. ‏Interface guard עבר 15 בדיקות ו־Dependency
lock עבר עבור 43 תלויות ישירות.

4.146.6 **עדיין חסר בכוונה:** Writers שמפיקים את העובדות העמידות מתוך
Delivery/Webhook Runtime, ‏Graph read-only reader מאומת לפי תיעוד Meta,
Security/Telemetry reader, ‏Kill-switch adapter, בחירת Tenant staging,
הזנת Secrets והרצת WABA מאושרת. אין Commit, ‏Push או Deployment במסגרת
שלב זה. שער Production אומת ונשאר חסום רק לפי ה־Registry הקיים על **5
Ready, ‏18 Blocked ו־11 Decision required**; לא הוצגה ראיה חיה במקום
חסר חיצוני.

# עדכון 4.147 — Durable Observation Writer

4.147.1 **הושלם מקומית:** נוסף PostgreSQL Writer קונקרטי עבור חמש משפחות
ה־Fact של Migration 0035. הקלט הוא Union סגור ו־Exact-key; אין בו מספר
טלפון, Provider payload, ‏Token, ‏Credential או שדה הרחבה.

4.147.2 ה־Writer מאמת את זהויות Run/Operation/Delivery/Subject, ‏Claim,
Recipient fingerprint, ‏Timestamp ואת הצורה הסמנטית המדויקת של Scenario,
130429, ‏131056, ‏Duplicate safety ו־Kill switch. Event key נגזר
דטרמיניסטית מהגרסה ומהרשומה הקנונית.

4.147.3 הכתיבה רצה ב־Transaction. לאחר Insert או Conflict ה־Writer טוען
מחדש את הרשומה תחת `FOR UPDATE`; Replay זהה מחזיר `unchanged`, בעוד אותו
Operation עם עובדה שונה נכשל בלי לעדכן או למחוק Evidence קיים.

4.147.4 ה־Writer חובר ל־Railway PostgreSQL Foundation. ‏Rehearsal האמיתי
אינו משתמש עוד ב־SQL Insert ישיר, אלא מוכיח את מסלול
Writer → Migration 0035 Ledger → Reader, כולל Replay זהה, Conflict וחסימת
UPDATE במסד.

4.147.5 **עדיין חסר בכוונה:** Source-specific Producers שיקראו מצב אמיתי
מ־Delivery/Webhook/Telemetry ויפעילו את ה־Writer. עד אז ה־Provider driver
אינו כותב Observation בעצמו, כדי שבקשת תרחיש לא תהפוך לראיית ספק. חסרים
גם Graph reader, ‏Security/Telemetry reader, ‏Kill-switch adapter והרצת
WABA מאושרת. אין Commit, ‏Push או Deployment במסגרת שלב זה.

4.147.6 נוספו **5 בדיקות Writer**. שער השחרור המקומי עבר במלואו לאחר
תיקון שלוש ציפיות תיעוד ישנות מ־35 ל־36 מיגרציות, מתשע לעשר מיגרציות
Railway-only ומשם Foundation מספרי לתיאור Composition שאינו נשחק בכל
Adapter חדש. שני ה־Production builds וכל **2,970 הבדיקות** עברו ללא כשל,
Skip או Todo; ‏TypeScript ו־ESLint עברו. Source guard סרק **748 קבצים
ו־35 Client graphs**; ‏Secret hygiene סרק **1,525 קבצים — 1,219 מנוהלים
ו־306 חדשים** — כולל היסטוריית Git. חוזי Migration/Parity נשארו תקינים
עבור **40 מיגרציות D1, ‏36 מיגרציות PostgreSQL ו־53 טבלאות D1**.

# עדכון 4.148 — Webhook Status Observation Producer

4.148.1 **הושלם מקומית:** נוסף Producer קונקרטי לשלושת תרחישי ה־Webhook
`status-sent`, ‏`status-delivered` ו־`status-read`. הוא קורא רק את
Projection ה־Provider העמיד לפי Subject delivery ו־Tenant; אין בשאילתה
מספר טלפון, תוכן הודעה, Provider payload, ‏Token או Credential.

4.148.2 ה־Producer מקבל רק התאמה מדויקת בין התרחיש לסטטוס הנוכחי, דורש
Status event key, זמן שאינו לפני תחילת ה־Run, אינו אחרי ה־Lease ואינו
עתידי לפי Worker clock. ‏Missing, ‏Ambiguous, ‏Cross-tenant, ‏Status drift,
Extension field או זמן בלתי עקבי נכשלים סגור לפני כתיבת Evidence.

4.148.3 ‏Observation source מפעיל את ה־Producer לפני קריאת Fact עבור
שלושת התרחישים בלבד. ה־Producer מחובר ל־Railway PostgreSQL Foundation
ומשתמש באותו Writer; יתר התרחישים אינם נכתבים מהבקשה או מה־Expected
result.

4.148.4 נוספו **6 בדיקות**: חמש ל־Producer ואחת ל־Composition לפני
ה־Reader. ‏PostgreSQL 16.13 נקי החיל את כל **36 המיגרציות** והעביר את כל
**82 תרחישי ה־Concurrency**, כולל המסלול
Webhook projection → Producer → Writer → Ledger → Reader, ‏Replay זהה
וחסימת Status mismatch. במהלך ה־Rehearsal תוקנו שתי תלויות זמן בבדיקה:
Conflict timestamp ישן וסנכרון מוגבל עד חמש שניות מול Status fixture
שקידם את השעון בכל Transition; חוזה ה־Runtime לא הוחלש.

4.148.5 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,976 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **749 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,527 קבצים — 1,219 מנוהלים ו־308 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות, ו־Migration parity נשאר תקין עבור **40 מיגרציות D1, ‏36
מיגרציות PostgreSQL ו־53 טבלאות D1**.

4.148.6 **עדיין חסר בכוונה:** Producers עבור Send, ‏Button reply,
Provider retry 130429, ‏Pair limit 131056, ‏Duplicate safety ו־Kill
switch; וכן Graph ו־Security/Telemetry readers והרצה חיה מאושרת.

# עדכון 4.149 — Durable Provider-deferral Provenance

4.149.1 **הושלם מקומית:** נוספה Migration ‏0036 עם Ledger ‏Append-only
ו־PII-free שמקשר Deferral של Meta לקבוצת עובדות אחת וסגורה: Delivery key,
Tenant, ‏Claim version, ‏Service-reply reservation, ‏Provider settlement,
Cooldown event, ‏Error code/scope, זמן ניסיון, זמן Deferral ו־Retry deadline.

4.149.2 רק שתי התאמות חוקיות: ‏130429 עם `sender` ו־
`META_PHONE_THROUGHPUT_LIMITED`, או 131056 עם `pair` ו־
`META_PAIR_RATE_LIMITED`. ‏Trigger דורש Reservation מאותו Tenant ובמחלקת
`service-reply`, ‏Settlement מסוג `provider-failed`, ‏Cooldown בעל אותו
Code/Scope/ObservedAt/BlockedUntil ו־Delivery במצב `pending` עם אותו Claim
ו־Retry. ‏Update ו־Delete נחסמים. אין בטבלה מספר טלפון, תוכן הודעה,
Provider payload, ‏Token או Credential.

4.149.3 חוזה ה־Processor מעביר כעת את `reservationKey` רק לאחר שכתיבת
ה־Cooldown הצליחה. ה־Worker מבחין בין Deferral מקומי רגיל לבין Provider
deferral. האחרון נכתב דרך `deferProviderRejection`, שמעדכן את ה־Delivery
ומוסיף את Event ה־Provenance באותה PostgreSQL Transaction. אם ה־Repository
אינו מספק את המסלול או אם יחס הזמנים אינו מדויק, ה־Worker נכשל סגור למצב
`ambiguous` ואינו מסמן Retry שאינו ניתן להוכחה.

4.149.4 Event key נגזר דטרמיניסטית מהחוזה הקנוני. ‏Replay זהה מחזיר את
אותו Delivery; Conflict באותו Delivery/Claim או Reservation נכשל ואינו
מחליף Evidence. ‏PostgreSQL 16.13 אמיתי וריק החיל את כל **37 המיגרציות**
והעביר **83 תרחישי concurrency**, כולל שתי כתיבות מקבילות שיצרו Event אחד,
אימות Reservation/Cooldown/Settlement וחסימת Mutation.

4.149.5 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,982 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **749 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,528 קבצים — 1,219 מנוהלים ו־309 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות, ו־Migration parity עבר עבור **40 מיגרציות D1, ‏37 מיגרציות
PostgreSQL ו־53 טבלאות D1**. שער Production נשאר צפוי ומפורש על **5 Ready,
18 Blocked ו־11 Decision required**.

4.149.6 במהלך ה־Rehearsal תוקנו שתי הנחות בדיקה, בלי להחליש Runtime:
Reservation fixture שכבר היה בשימוש הוחלף במפתח דטרמיניסטי פנוי; ותסריט
ה־Provider קיבל Inbound עדכני כדי שה־Retry יישאר בתוך חלון השירות האמיתי.
Assertion ישן של `max(status)` נקשר ל־Delivery המקורי במקום לערבב Delivery
חדש במצב `pending`.

4.149.7 **עדיין חסר בכוונה:** Producer שקורא את Ledger החדש ומפיק ממנו
Observation עבור 130429 ו־131056; Producers ל־Send, ‏Button reply,
Duplicate safety ו־Kill switch; ‏Graph/Security/Telemetry readers והרצת
WABA מאושרת. לא בוצעו Commit, ‏Push, ‏Deployment או שליחת WhatsApp.

# עדכון 4.150 — Provider-deferral Observation Producer

4.150.1 **הושלם מקומית:** נוסף Producer קונקרטי שקורא את
`bot_reply_provider_deferral_events` ומפיק עובדות Staging רק מן ה־Ledger
העמיד. הוא אינו מסיק קוד ספק, Scope או Retry משם התרחיש או מתוצאה צפויה.

4.150.2 השאילתה מחזירה רק Event שה־Delivery הנוכחי שלו עדיין `pending`,
עם אותו Tenant, ‏Claim, ‏Retry deadline, זמן Deferral וסיבת Deferral.
ה־Producer מאמת מחדש Event digest דטרמיניסטי, יחס זמנים מדויק, Run/Operation,
Release lease, ‏Recipient fingerprint ואת תוצאת ה־Worker בפועל.

4.150.3 רק שתי צורות נכתבות: ‏130429 עם `sender`,
`META_PHONE_THROUGHPUT_LIMITED` ו־`retryAfterSeconds` המדויק; או 131056
עם `pair`, ‏`META_PAIR_RATE_LIMITED` ו־`meta-4-power-x`. ‏Replay מסוג
`duplicate` מתקבל רק כאשר אותה ראיית Deferral עדיין פעילה. Missing,
Ambiguous, ‏Cross-tenant, ‏Digest mismatch, ‏Retry conflict, זמן ישן או
Outcome אחר נכשלים סגור לפני ה־Writer.

4.150.4 ‏Observation source מפעיל את ה־Producer לפני ה־Durable reader
בשני תרחישי ה־Provider בלבד. ה־Producer חובר ל־Railway PostgreSQL
Foundation ול־Provider driver factory, ונוסף ל־Hosting migration registry.
אין בשאילתה מספר טלפון, תוכן הודעה, Provider payload, ‏Token או Credential.

4.150.5 נוספו **6 בדיקות**: חמש ל־Producer ואחת לסדר
Producer → Writer → Reader. ‏PostgreSQL 16.13 נקי החיל את כל **37
המיגרציות** והעביר **83 תרחישי concurrency**, כולל כתיבה דרך ה־Foundation,
Replay זהה וקריאה חוזרת של הקוד, הזמן וה־Retry מה־Ledger.

4.150.6 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**2,988 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **750 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,530 קבצים — 1,219 מנוהלים ו־311 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות, ו־Migration parity עבר עבור **40 מיגרציות D1, ‏37 מיגרציות
PostgreSQL ו־53 טבלאות D1**. שער Production נשאר צפוי על **5 Ready,
18 Blocked ו־11 Decision required**.

4.150.7 **עדיין חסר בכוונה:** Producers ל־Send/Button reply,
Duplicate safety ו־Kill switch; ‏Graph ו־Security/Telemetry readers;
Composition חי ב־Railway Main; Secrets, חשבונות והרצת WABA מאושרת.
לא בוצעו Commit, ‏Push, ‏Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.151 — Accepted-send Observation Producer

4.151.1 **הושלם מקומית:** נוסף Producer קונקרטי עבור `text-send`
ו־`button-send`. הוא קורא רק Delivery במצב `accepted` המחובר ל־
`bot_reply_delivery_provider_links` באותו Tenant, ‏Provider acceptance time
ו־Provider message identity. ה־Provider ID עצמו, מספר הטלפון ותוכן ההודעה
אינם נבחרים בשאילתה ואינם נכתבים ל־Observation.

4.151.2 ה־Producer דורש התאמה מלאה ל־Run, ‏Operation, ‏Claim, ‏Lease,
Recipient fingerprint, ‏Connection/Policy ול־Delivery/Subject. סוג ה־Payload
העמיד חייב להיות `text` עבור `text-send` או `buttons` עבור `button-send`.
רק Outcome אמיתי מסוג `accepted` או Replay מסוג `duplicate` מתקבל.

4.151.3 ‏Missing, ‏Ambiguous, ‏Cross-tenant, ‏Payload-kind drift,
Acceptance time mismatch, עובדה ישנה/עתידית, Extension field או Outcome אחר
נכשלים סגור לפני ה־Writer. ‏Observation source מפעיל את ה־Producer לפני
ה־Durable reader ורק בשני תרחישי השליחה.

4.151.4 ה־Producer חובר ל־Railway PostgreSQL Foundation, ל־Provider
driver factory ול־Hosting migration registry. ‏PostgreSQL 16.13 נקי החיל
את כל **37 המיגרציות** והעביר **83 תרחישי concurrency**, כולל
Provider acceptance → Producer → Writer → Ledger → Reader, ‏Replay זהה
ו־Conflict חסום.

4.151.5 נוספו **6 בדיקות**: חמש ל־Producer ואחת לסדר ה־Composition.
שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל **2,994
הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו. Source
guard סרק **751 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק **1,532
קבצים — 1,219 מנוהלים ו־313 חדשים** — כולל היסטוריית Git. ‏Interface
guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות ישירות,
ו־Migration parity נשאר על **40 מיגרציות D1, ‏37 מיגרציות PostgreSQL
ו־53 טבלאות D1**. שער Production נשאר צפוי על **5 Ready, ‏18 Blocked
ו־11 Decision required**.

4.151.6 במהלך המיפוי נמצא פער אמיתי ב־Button reply: ה־Webhook parser
מחלץ `selectedBotOptionKey` ואת `replyToProviderMessageId`, אך שכבת
ה־Conversation persistence שומרת כרגע רק Message מסוג `interactive` ואינה
שומרת את שני שדות הקישור. לכן לא נוצר Producer שמסיק לחיצה משם התרחיש.
השלב הבא חייב להוסיף Provenance עמיד, PII-bounded ובלתי־משתנה ללחיצה,
ורק אחריו להפיק Observation.

4.151.7 **עדיין חסר בכוונה:** Button-reply provenance ו־Producer,
Customer-window 131047 provenance, ‏Duplicate safety ו־Kill-switch
Producers, ‏Graph/Security/Telemetry readers, ‏Railway Main חי והרצת WABA
מאושרת. לא בוצעו Commit, ‏Push, ‏Deployment או שליחת WhatsApp.

# עדכון 4.152 — Button-reply Provenance ו־Observation Producer

4.152.1 **הושלם מקומית:** נוסף Ledger בלתי־משתנה ו־PII-bounded בשם
`inbound_button_reply_events` גם ב־D1 וגם ב־PostgreSQL. כל Event מקשר
הודעת `interactive` נכנסת ל־Delivery יוצא שנשלח כ־`buttons`, ל־Provider
link המאושר ולאפשרות שהייתה קיימת בפועל ב־`reply_json.options`. הטבלה אינה
שומרת מספר טלפון, טקסט הודעה, Provider message ID, ‏Token או Credential.

4.152.2 ה־Webhook מעביר כעת את `selectedBotOptionKey` ואת
`replyToProviderMessageId` לשכבת ה־Persistence. ‏D1 כותב Conversation,
Message ו־Provenance באותו Batch אטומי; PostgreSQL עושה זאת באותה
Transaction. זוג שדות חלקי, Payload שאינו Interactive, אפשרות שאינה קיימת,
Provider link חסר או Cross-tenant linkage נכשלים סגור. Replay מדויק נטען
מחדש, ו־Update/Delete של הראיה נחסמים ברמת מסד הנתונים.

4.152.3 ה־Accepted-send Producer הורחב במסלול `button-reply`. הוא קורא מן
ה־Ledger רק Message key, ‏Tenant, ‏Selected option key, ‏Subject delivery
וזמן הלחיצה; השאילתה אינה בוחרת Provider ID, ‏Reply JSON, מספר טלפון או
תוכן הודעה. ה־Observation source מפעיל את ה־Producer לפני ה־Durable reader
ורק עבור תרחיש `button-reply`.

4.152.4 ה־Data migration וה־Parity registry כוללים כעת את הראיה החדשה:
**41 מיגרציות D1, ‏38 מיגרציות PostgreSQL ו־54 טבלאות D1**. ‏PostgreSQL
16.13 נקי החיל את כל 38 המיגרציות; פונקציית ה־Verifier המלאה עברה עם
**84 תרחישי concurrency**, כולל כתיבת Button reply, ‏Replay מקביל, קריאת
Observation וחסימת Mutation.

4.152.5 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**3,001 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **751 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,534 קבצים — 1,219 מנוהלים ו־315 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות ו־Dependency lock עבר עבור 43 תלויות
ישירות.

4.152.6 **עדיין חסר בכוונה:** ‏Customer-window 131047 provenance,
‏Duplicate-safety ו־Kill-switch Producers, ‏Graph/Security/Telemetry
readers, ‏Railway Main חי והרצת WABA מאושרת. לא בוצעו Commit, ‏Push,
Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.153 — Meta 131047 Service-window Provenance ו־Observation Producer

4.153.1 **הושלם מקומית:** נוסף Ledger בלתי־משתנה ו־PII-bounded בשם
`bot_reply_service_window_rejection_events` גם ב־D1 וגם ב־PostgreSQL.
ה־Event נכתב רק עבור דחייה אמיתית של Meta בקוד המדויק 131047, לאחר
Reservation מסוג `service-reply` ו־Settlement מסוג `provider-failed`, והוא
נקשר לאותה הודעה נכנסת, Delivery, ‏Tenant, ‏Claim וחלון שירות של 24 שעות.
הטבלה אינה שומרת מספר טלפון, תוכן הודעה, Provider payload או Credential.

4.153.2 ‏Meta processor מחזיר Provenance של 131047 רק מתוך
`MetaGraphError` מאומת. ה־Worker מעביר אותו ל־Repository רק אחרי Settlement
מדויק; D1 מבצע את דחיית ה־Delivery ואת כתיבת ה־Event באותו Batch, ו־
PostgreSQL מבצע אותן באותה Transaction. אם יכולת ה־Repository חסרה או
נכשלת, התוצאה נשארת `ambiguous` ולא נוצרת ראיה חלשה.

4.153.3 ‏Send observation producer כולל כעת מסלול
`customer-window-expired`. הוא קורא רק Delivery key, ‏Tenant, קוד הספק,
Reason וזמני הניסיון והדחייה. הוא אינו בוחר Reservation key, ‏Provider
message ID, ‏Reply JSON, מספר טלפון או תוכן. רק Event מדויק, עדכני ותואם
Run/Operation/Lease ותוצאת Dispatch מסוג `rejected` או Replay זהה מתקבל.

4.153.4 ה־Parity וה־Data migration כוללים כעת **42 מיגרציות D1, ‏39
מיגרציות PostgreSQL ו־55 טבלאות D1**. ‏PostgreSQL 16.13 נקי החיל את כל
39 המיגרציות והעביר **85 תרחישי concurrency**, כולל שתי כתיבות מקבילות של
אותה דחיית 131047, Replay זהה, קריאת Observation וחסימת Update/Delete.

4.153.5 שער השחרור המקומי עבר במלואו: שני ה־Production builds וכל
**3,010 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **751 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,536 קבצים — 1,219 מנוהלים ו־317 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־`git diff --check` עבר. שער Production נשאר צפוי על **5 Ready,
18 Blocked ו־11 Decision required**.

4.153.6 במהלך הריצה המלאה תוקנו שתי ציפיות בדיקה ישנות: ספירת Migration
עודכנה מ־41 ל־42, ו־Test double של Railway factory קיבל את מתודת
`recordServiceWindowRejection`. בנוסף תוקן Fixture דטרמיניסטי שהתנגש במפתח
Inbound קיים ב־PostgreSQL verifier; חוזי Runtime לא הוחלשו.

4.153.7 **עדיין חסר בכוונה:** ‏Duplicate-safety ו־Kill-switch Producers,
‏Graph/Security/Telemetry readers, ‏Composition חי ב־Railway Main, ‏Secrets,
חשבונות והרצת WABA מאושרת. לא בוצעו Commit, ‏Push, ‏Deployment או שליחת
WhatsApp בשלב זה.

# עדכון 4.154 — Provider-request Fence ו־Duplicate-safety Producer

4.154.1 **הושלם מקומית:** נוספה Migration ‏0039 ל־PostgreSQL עם Ledger
בלתי־משתנה ו־PII-free בשם `bot_reply_provider_request_claims`. כל רשומה
נקשרת ל־Delivery במצב `sending`, לאותו Tenant ו־Claim, ול־Reservation פעיל
מסוג `service-reply` ללא Settlement. ‏Unique constraints מגבילים כל
Delivery/Claim וכל Reservation ל־Provider request fence יחיד. הטבלה אינה
שומרת מספר טלפון, תוכן הודעה, Provider payload, ‏Token או Credential.

4.154.2 ‏Meta processor חייב כעת לתבוע את ה־Fence אחרי Admission ולפני
`sender.send`. רק תוצאה `created` בעלת Request key קנוני רשאית להגיע ל־POST;
Replay מסוג `duplicate`, תוצאה מורחבת או Persistence חסר נכשלים סגור לפני
הספק. ‏Railway runtime דורש את היכולת במפורש, ולכן Fence שאינו מחובר אינו
נחשב תצורה תקינה.

4.154.3 ‏Send observation producer כולל כעת מסלול `duplicate-safety`.
השאילתה דורשת Delivery מאושר עם Claim יחיד, Request fence יחיד ו־Provider
acceptance יחידה הקשורה לאותו Reservation. היא אינה בוחרת או מזכירה
Provider message ID, ‏Request key, ‏Reply JSON, מספר טלפון או תוכן. שני
ה־Dispatch outcomes חייבים להגיע בפועל כ־`accepted/duplicate` או
`duplicate/duplicate`, כשהשני תמיד `duplicate`; רק אז נכתבים
`queueDeliveryCount=2` ו־`providerRequestCount=1`.

4.154.4 ‏PostgreSQL 16.13 נקי החיל את כל **40 המיגרציות** והעביר **86
תרחישי concurrency**. שתי תביעות Fence מקבילות החזירו `created + duplicate`
עם Request key זהה; Acceptance אחת נשמרה, ‏Duplicate observation נכתב
כ־`created + unchanged`, וניסיון Update על ה־Fence נחסם. פקודת ה־CLI
הרשמית עברה לאחר שימוש במשתנה הנכון `CONNECT_POSTGRES_INTEGRATION_URL`.

4.154.5 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,016 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **751 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,537 קבצים — 1,219 מנוהלים ו־318 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־`git diff --check` עבר. ‏Migration parity עומד על **42 מיגרציות
D1, ‏40 מיגרציות PostgreSQL, ‏55 טבלאות D1 ו־12 מיגרציות Railway-only**.
שער Production נשאר צפוי על **5 Ready, ‏18 Blocked ו־11 Decision required**.

4.154.6 **עדיין חסר בכוונה:** ‏Kill-switch Producer,
‏Graph/Security/Telemetry readers, ‏Composition חי ב־Railway Main, ‏Secrets,
חשבונות והרצת WABA מאושרת. לא בוצעו Commit, ‏Push, ‏Deployment או שליחת
WhatsApp בשלב זה.

# עדכון 4.155 — Kill-switch Zero-provider-request Producer

4.155.1 **הושלם מקומית:** ‏Send observation producer כולל כעת מסלול
`kill-switch` עמיד. השאילתה מצליבה Delivery שנדחה עם
`WHATSAPP_ADMISSION_UNAVAILABLE`, מעבר Policy מדויק מגרסה N במצב
`enabled` לגרסה N+1 במצב `disabled`, ‏Audit יחיד והיעדר Policy מאוחר שהיה
פעיל בזמן הדחייה.

4.155.2 הראיה מתקבלת רק כאשר תוצאת ה־Worker היא `deferred` וזמן ה־Retry
זהה ל־`next_attempt_at` העמיד. ‏PostgreSQL חייב להחזיר אפס
`bot_reply_provider_request_claims` ואפס `bot_reply_delivery_provider_links`.
השאילתה אינה בוחרת מספר טלפון, ‏Reply JSON, תוכן הודעה, Provider message
ID, ‏Token או Credential. כל שורה חסרה, מורחבת, ישנה, Cross-tenant,
לא־מאודטת, בעלת Request/Acceptance יחיד או Policy סותר נכשלת סגור.

4.155.3 ‏Observation source מפעיל את ה־Producer לפני ה־Durable reader.
שתי כתיבות מקבילות של אותה עובדה מחזירות `created + unchanged`; ה־Reader
טוען Fact יחיד עם `policyState=disabled`, ‏`providerRequestCount=0`
ו־`dispatchOutcome=deferred`.

4.155.4 ‏PostgreSQL 16.13 נקי החיל את כל **40 המיגרציות** והעביר **87
תרחישי concurrency**. תרחיש חי הפעיל את ה־Worker ואת Meta processor
האמיתיים לאחר מעבר Policy, והוכיח גם במוני הגבול וגם ב־Ledger אפס בקשות
Provider ואפס קריאות Send. לאחר הבדיקה נרשם Policy חדש במצב `enabled`,
ומפתח ה־Evidence העדכני הועבר להמשך תרחישי Campaign. ‏Fixture ישן של
`phone_number_id` תוקן למזהה Provider מספרי תקין ודטרמיניסטי.

4.155.5 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,019 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **751 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,537 קבצים — 1,219 מנוהלים ו־318 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL, ‏55 טבלאות D1 ו־12 מיגרציות Railway-only**.

4.155.6 **עדיין חסר בכוונה:** ‏Graph ו־Security/Telemetry readers
קונקרטיים, ‏Composition חי ב־Railway Main, ‏Secrets, חשבונות והרצת WABA
מאושרת. לא בוצעו Commit, ‏Push, ‏Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.156 — Meta Graph Asset/Throughput Observation Reader

4.156.1 **הושלם מקומית:** נוסף Graph observation reader קונקרטי עבור
Bot-reply staging. הוא טוען רק Meta connection במצב `connected` ובגרסה
המדויקת שה־Run אישר, מפענח את ה־Credential מתוך ה־PostgreSQL encrypted
envelope הקיים, ודורש התאמה מלאה ל־Run, ‏Operation, ‏Release, ‏Commit,
Artifact, ‏Graph API version ו־Lease.

4.156.2 במסלול Assets ה־Reader משתמש ב־`debug_token` כדי לדרוש Token תקף
השייך ל־`META_APP_ID`; לאחר מכן הוא משתמש ב־Graph verifier הקיים כדי
להוכיח את הקשרים Business Portfolio→WABA ו־WABA→Phone. App אחר, Token לא
תקף, בעלות אחרת, מספר שאינו תחת ה־WABA או תגובת Graph פגומה נכשלים סגור.

4.156.3 במסלול Throughput ה־Reader קורא מן המספר רק
`id,throughput,is_on_biz_app,platform_type`. המיפוי הסגור הוא 20 עבור
Coexistence+STANDARD, ‏80 עבור STANDARD רגיל ו־1,000 עבור HIGH רגיל.
`NOT_APPLICABLE`, ‏HIGH ב־Coexistence, שדה חסר, מספר אחר או Platform שאינו
`CLOUD_API` נדחים ללא Default. זהו מקור הקצב החי עבור טל; אין הסקה מן
התוכנית, מהיסטוריית תעבורה או מ־Fixture.

4.156.4 ‏Raw Meta IDs משמשים רק בתוך ה־Fact הפנימי ולגזירת Digest/HMAC.
ה־Evidence הסופי ממשיך לכלול Proofs ו־Fingerprint בלבד. ‏Token, ‏App
secret, ‏Provider payload ומזהי Provider גולמיים אינם נכללים בתוצאה,
בשגיאות או ב־Telemetry. שגיאות App, ‏Asset ו־Throughput ממופות לקודים
תחומים ללא פרטי ספק.

4.156.5 ‏Railway PostgreSQL worker יוצר את ה־Reader מתוך Meta connection,
Credential repository וה־Clock של אותו Runtime ומעביר אותו ל־Provider
driver. ‏`META_APP_ID` נטען כעת במפורש ב־Railway Worker Main. ‏Provider
driver factory אינו מקבל עוד Graph reader סטטי בזמן יצירתו, ולכן ה־Reader
קשור ל־Foundation שבו ה־Run מתבצע.

4.156.6 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,036 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **752 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,539 קבצים — 1,219 מנוהלים ו־320 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.156.7 **עדיין חסר בכוונה:** ‏Security/Telemetry observation reader
קונקרטי, חיבור ה־Provider driver המלא ב־Railway Main, ‏Secrets וחשבונות
חיים, והרצת Evidence נגד Staging WABA מאושר. לא בוצעו Commit, ‏Push,
Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.157 — Security/Telemetry Observation Reader

4.157.1 **הושלם מקומית:** נוסף Security/Telemetry observation reader
קונקרטי עבור Bot-reply staging. הוא נוצר בתוך Railway PostgreSQL worker
מאותו Credential repository, ‏Environment ו־Clock שמשמשים את הרצת ה־Run;
ה־Provider factory אינו מקבל עוד Security reader סטטי מבחוץ.

4.157.2 מסלול Credential boundary טוען מעטפת מוצפנת Exact-key הכוללת רק
Tenant, ‏Key version, ‏IV, ‏Ciphertext ו־Timestamps. הוא דורש Tenant תואם,
צורה קנונית, סדר זמנים תקין ויכולת פענוח דרך ה־Vault callback. ה־Access
token אינו נשמר ב־Fact, אינו משתתף ב־Digest ואינו יוצא בשגיאה. מעטפה חסרה,
Cross-tenant, עתידית או בעלת שדה נוסף כגון `accessToken` נכשלת סגור.

4.157.3 מסלול Redaction מקבל רק Better Stack staging evidence מלא שעבר
את ה־Verifier הקיים. נדרשים Evidence digest תקין, אפס Findings, לפחות 12
שדות שנבדקו, חלון חיים תקין והתאמה מדויקת ל־Release, ‏Commit ו־Artifact.
בנוסף `verifiedAt` חייב להיות לאחר בקשת ה־Run ובתוך ה־Lease שלו. Evidence
חסר, פג, קודם להרצה או Cross-release נדחה.

4.157.4 ה־Facts נקשרים ל־Run, ‏Operation, ‏Tenant, ‏Connection, ‏Policy,
Graph version ו־Deployment identities באמצעות SHA-256 קנוני. ה־Evidence
הסופי מקבל רק מונים, Timestamp ו־Proof אטום; ‏Token, ‏Ciphertext ו־Better
Stack payload אינם נכללים בו.

4.157.5 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,040 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **753 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,541 קבצים — 1,219 מנוהלים ו־322 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.157.6 **עדיין חסר בכוונה:** חיבור ה־Provider driver המלא ב־Railway
BullMQ Worker Main, ‏Kill-switch adapter חי, Secrets וחשבונות חיים והרצת
Evidence נגד Staging WABA מאושר. לא בוצעו Commit, ‏Push, ‏Deployment או
שליחת WhatsApp בשלב זה.

# עדכון 4.158 — Railway Bot-reply Staging Main ו־Kill-switch אטומי

4.158.1 **הושלם מקומית:** נוסף Kill-switch adapter קונקרטי הקורא את
ה־Policy האחרון מאותו PostgreSQL Foundation. הוא דורש Tenant,
‏Connection version ו־Policy version מדויקים, מעתיק את Snapshot הבטיחות
במלואו לגרסה עוקבת במצב `disabled`, ומקבל Replay רק כאשר אותה גרסה כבר
נכתבה בידי אותו Actor. תוצאת הכתיבה נבדקת מחדש לצורכי Audit, אך בטיחות
הכיבוי נשענת על פעולת ה־Repository האטומית ולא על בדיקה מאוחרת.

4.158.2 ‏Provider driver מקבל מעתה גם `expectedConnectionVersion` ומעביר
אותו ל־Kill-switch. ‏Graph, ‏Security, ‏Durable observations, ‏Webhook,
‏Provider deferrals, ‏Send ו־Kill-switch מגיעים כולם מן ה־Foundation של
אותו Worker; ‏Factory אינו יכול לקבל Ports סטטיים ממקור אחר. כל Dependency
חסר, לא מוגדר או שזורק בזמן Preflight נכשל סגור לפני Dispatch.

4.158.3 ‏Railway BullMQ Worker Main מחבר כעת את ה־Scenario driver המלא.
ארבעת ה־Queues הבסיסיים נשארים ללא שינוי. Queue חמישי עבור Bot-reply
staging נפתח רק כאשר `BOT_REPLY_STAGING_ENABLED=true`; ברירת המחדל,
מחרוזת ריקה ו־`false` משאירות אותו כבוי, וכל ערך אחר או Configuration
חלקי חוסמים Startup. ל־Queue יש Telemetry ו־DLQ reason types תחומים.

4.158.4 נוספו בדיקות שליליות וחיוביות עבור כיבוי אטומי, Replay לפי Actor,
Policy ישן, Connection לא תואם, תוצאת Repository ששונתה, סינון שגיאות,
Opt-in של Main ו־Configuration חלקי. בדיקות Registry עודכנו לדרוש ארבעה
Queues בסיסיים ו־Queue Staging חמישי אופציונלי, במקום לשמר הנחה ישנה של
ארבעה בלבד.

4.158.5 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,046 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **754 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,543 קבצים — 1,219 מנוהלים ו־324 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.158.6 **עדיין חסר בכוונה:** חשבונות ו־Credentials חיים, בחירת Tenant
ו־Staging WABA מאושרים, מלאי מקרים פרטי, Better Stack evidence עדכני,
אישור מתודת הבדיקה של טל והרצת Evidence חיה ומורשית. עד קבלת הראיה הזאת
`botReplyDeliveryAdapter` נשאר `false`. לא בוצעו Commit, ‏Push,
Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.159 — Bot-reply Staging Activation Preflight

4.159.1 **הושלם מקומית:** נוסף Activation preflight גרסה 1 המשותף
ל־Railway BullMQ Worker Main ולפקודת CLI. הוא מבצע שבע בדיקות לפני פתיחת
Worker: סביבת `staging`, מלאי מקרים פרטי ובתוקף, HMAC לנמען, HMAC ל־
Observation proofs, תצורת Meta Graph, מפתח הצפנת Credential ו־Better
Stack evidence בתוקף ותואם־Release.

4.159.2 הפלט הוא Contract סגור הכולל רק Version, ‏Status, ‏Code, מונים
ושבעה מזהי בדיקה קבועים. הוא אינו מחזיר ערכי Environment, ‏Tenant, מספר
טלפון, App ID, ‏Token, ‏Secret, ‏Credential, ‏Evidence payload או פרטי
Provider. מצב כבוי נשמר נפרד מ־Configuration פגום; שניהם מחזירים Exit
code ‏1 בפקודת Activation.

4.159.3 נוספה הפקודה `npm run preflight:bot-reply-staging`. היא אינה
פותחת PostgreSQL או Redis connections, אינה פונה ל־Meta ואינה שולחת
הודעות. Exit code ‏0 מתקבל רק עם `BOT_REPLY_STAGING_ENABLED=true` וכל
שבע הבדיקות במצב `passed`.

4.159.4 ‏Railway Worker Main משתמש באותו Inspector ולא רק בפקודה ידנית.
Opt-in לא חוקי, Clock פגום, מלאי פג, מפתח חסר או Evidence לא תואם חוסמים
את Startup לפני יצירת ה־Provider factory ולפני פתיחת Connections. ברירת
המחדל ו־`false` ממשיכות להפעיל רק את ארבעת ה־Queues הבסיסיים.

4.159.5 נוספו ארבע בדיקות עבור Preflight מלא, כל אחת משבע הבדיקות,
הפרדת Disabled מ־Blocked ופלט CLI ללא ערכים. בדיקות ה־Main וה־Registry
עודכנו לקבע שימוש באותו Inspector ובאותה פקודה. לא נעשה שימוש ב־
`Math.random()` או `crypto.randomUUID()`.

4.159.6 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,050 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **755 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,546 קבצים — 1,219 מנוהלים ו־327 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.159.7 **עדיין חסר בכוונה:** הגדרת הערכים החיים ב־Railway, מעבר
ה־Preflight בפועל, בחירת Tenant ו־Staging WABA מאושרים, אישור מתודת
הבדיקה של טל והרצת Evidence חיה ומורשית. עד אז
`botReplyDeliveryAdapter` נשאר `false`. לא בוצעו Commit, ‏Push,
Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.160 — Bot-reply Staging Authorization API

4.160.1 **הושלם מקומית:** נוסף Operation בשם
`system-admin.bot-reply-staging.authorization` לכתיבת Ledger ההרשאה העמיד.
אישור `approved` אפשרי רק לזהות Tal המוגדרת במפורש וגם נמצאת ב־System
Admin allowlist. מנהל גיבוי מורשה יכול לבטל אישור קיים, אך אינו יכול ליצור
אישור חדש בשם טל.

4.160.2 ‏PostgreSQL safety repository חושף כעת `findLatest`, הקורא את
אירוע ההרשאה האחרון של ה־Tenant לפי גרסה. ביטול דורש שהאירוע האחרון יהיה
`approved`, דורש גרסה עוקבת ומעתיק ממנו בדיוק את Connection version,
‏Policy version, ‏Recipient fingerprint, ‏Opt-in evidence ו־Rate-limit
evidence. כך מנהל גיבוי אינו יכול להחליף ראיה בזמן הביטול.

4.160.3 הבקשה דורשת Payload בעל Exact keys, ‏Confirmation מפורש,
Timestamp קנוני בן לכל היותר עשר דקות, Idempotency key דטרמיניסטי ו־System
Admin rate limit. ‏Replay נבדק רק לאחר אימות מלא של הבקשה; Confirmation
שגוי או Extension field אינם יכולים לקבל תשובת Replay. הפלט הציבורי
כולל רק Outcome, ‏Event key, גרסה, סטטוס וזמן ואינו חושף מספר טלפון,
Token, ‏Meta ID, ‏Actor או Evidence גולמי.

4.160.4 ה־Operation מחובר ל־Railway API Runtime ול־PostgreSQL/BullMQ API
composition כאשר אפשרויות Bot-reply staging נמסרות במפורש. Registry
ה־Migration דורש כעת את פעולות ההרצה וההרשאה גם תחת
`web.server-api-boundary` וגם תחת `data.relational-database`. בדיקת
Foundation מוכיחה ש־`findLatest`, ‏`read` ו־`record` זמינים מאותו Pool.

4.160.5 נוספו שבע בדיקות: קריאת האירוע האחרון מן Repository, Policy
Tal-only, אישור, ביטול בידי גיבוי, Replay/גרסאות ובקשות או תלויות כושלות.
נוספה גם בדיקת Integration דרך HTTP API. בדיקת ה־Replay כוללת Confirmation
שגוי ושדה עודף. לא נעשה שימוש ב־
`Math.random()` או `crypto.randomUUID()`.

4.160.6 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,057 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **756 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,548 קבצים — 1,219 מנוהלים ו־329 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.160.7 **עדיין חסר בכוונה:** טעינת תצורת Bot-reply staging לתוך
Railway BullMQ API executable, ערכי Accounts/Credentials חיים, בחירת
Tenant ו־Staging WABA מאושרים, אישור מתודת הבדיקה של טל, מעבר Preflight
והרצת Evidence חיה ומורשית. עד אז `botReplyDeliveryAdapter` נשאר `false`.
לא בוצעו Commit, ‏Push, ‏Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.161 — Bot-reply Staging API Executable Activation

4.161.1 **הושלם מקומית:** נוסף Inspector ייעודי לתצורת Bot-reply staging
של Railway API. ברירת המחדל, מחרוזת ריקה ו־`false` משאירות את היכולת
כבויה ואינן יוצרות Queue נוסף. רק `BOT_REPLY_STAGING_ENABLED=true` מפעיל
את מסלול האימות.

4.161.2 במצב מופעל נדרשים ללא Defaults: סביבת `staging`, ‏Tenant חיובי,
זהות Clerk מפורשת של טל, ‏Lease של 60–3,600 שניות ו־Polling של 50–5,000
מילישניות. זהות טל חייבת להופיע גם ב־
`CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS`. ‏Opt-in לא קנוני, תצורה חלקית,
שדה מורחב, גבול זמן שגוי או Tal שאינו Admin נכשלו סגור.

4.161.3 ‏Railway BullMQ API Main מפעיל את ה־Publisher ואת פעולות ה־Run
וה־Authorization רק לאחר שה־Inspector החזיר `configured`. כשל תצורה נחסם
לפני יצירת Telemetry runtime ולפני פתיחת Redis או PostgreSQL. במצב כבוי
ארבעת ה־Queues הבסיסיים נשארים ללא שינוי.

4.161.4 נשמרה הפרדת Secrets בין Services: ה־API מקבל רק Tenant, זהות טל
וזמני ההרצה. ‏Meta credentials, מספר הנמען, מלאי המקרים הפרטי, מפתחות
HMAC ו־Better Stack staging evidence של ה־Worker אינם מועברים אליו.
כשלי Staging queue נרשמים בשני קודי Telemetry תחומים ללא ערכי תצורה.

4.161.5 נוספו שבע בדיקות עבור מצב כבוי, תצורה תקינה, תצורה חסרה, גבולות
פגומים, Extension fields, חיבור מלא של ה־Executable וחסימה לפני Startup.
‏Registry, ‏`.env.example`, חוזה API, ‏Release checklist ומסמך ההרצה
עודכנו. לא נעשה שימוש ב־`Math.random()` או `crypto.randomUUID()`.

4.161.6 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,064 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **757 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,550 קבצים — 1,219 מנוהלים ו־331 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.161.7 **עדיין חסר בכוונה:** הזנת הערכים החיים בשני Railway Services,
בחירת Tenant ו־Staging WABA מאושרים, מלאי מקרים פרטי, Credentials,
‏Better Stack evidence עדכני, אישור מתודת הבדיקה של טל, מעבר Activation
preflight והרצת Evidence חיה ומורשית. עד אז `botReplyDeliveryAdapter`
נשאר `false`. לא בוצעו Commit, ‏Push, ‏Deployment או שליחת WhatsApp בשלב
זה.

# עדכון 4.162 — Bot-reply Cross-service Activation Check

4.162.1 **הושלם מקומית:** נוסף Cross-service activation checker גרסה 1
המקבל בזיכרון בלבד Snapshot מבודד של Railway API ו־Snapshot מבודד של
Railway Worker. הוא מפעיל את Inspector ה־API ואת Activation preflight
המלא של ה־Worker ואינו יוצר Parser חלופי או מסלול שמדלג עליהם.

4.162.2 הדוח דורש ארבעה תנאים יחד: API במצב `configured`, ‏Worker במצב
`ready`, שתי הסביבות שוות במפורש ל־`staging` וה־Tenant זהה. שני שירותים
כבויים מחזירים `disabled`; הפעלה א־סימטרית, Tenant drift, ‏Worker חסום,
קלט מורחב או Dependency כושל מחזירים `blocked`.

4.162.3 הפלט הוא Contract סגור הכולל רק Schema version, ‏Activation
version, ‏Status, ‏Code, מונים וארבעה מזהי Check קבועים. הוא אינו מחזיר
Tenant, זהות Clerk, ‏Meta IDs, מספר טלפון, Token, ‏HMAC, ‏Private
inventory, ערך Environment או הודעת Dependency פרטית.

4.162.4 לא נוסף קובץ Environment משותף ולא נוסף CLI הקורא Secrets
מדיסק. בכך נשמרת הפרדת ה־Credentials בין ה־API ל־Worker. ‏Release
orchestration עתידי יצטרך לספק את שני ה־Snapshots בזיכרון ולשמור רק את
הדוח התחום.

4.162.5 נוספו שש בדיקות עבור Disabled סימטרי, התאמה מלאה, Tenant drift,
הפעלה א־סימטרית, Worker preflight אמיתי שנחסם בלי Secrets וקלט או
Dependencies פגומים. ‏Registry, חוזה API, ‏Release checklist ומסמך
ההרצה עודכנו. לא נעשה שימוש ב־`Math.random()` או
`crypto.randomUUID()`.

4.162.6 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,070 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **758 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,552 קבצים — 1,219 מנוהלים ו־333 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.162.7 **עדיין חסר בכוונה:** חיבור ה־Checker ל־Railway deployment
orchestration עם שני Snapshots חיים, הזנת Accounts/Credentials, בחירת
Tenant ו־Staging WABA מאושרים, אישור מתודת הבדיקה של טל, מעבר Preflight
והרצת Evidence חיה ומורשית. עד אז `botReplyDeliveryAdapter` נשאר `false`.
לא בוצעו Commit, ‏Push, ‏Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.163 — Release-bound Cross-service Evidence

4.163.1 **הושלם מקומית:** נוסף מחולל ו־Verifier ל־Cross-service Evidence
גרסה 1. המחולל מקבל רק Activation report מלא במצב `ready`, שבו כל ארבע
הבדיקות עברו בסדר הקבוע, וקושר אותו ל־Release ID, ‏Commit SHA ו־Artifact
digest הנוכחיים.

4.163.2 זמן החיים מפורש ותחום ל־60–900 שניות. ה־Verifier דורש Schema
סגור, Timestamps קנוניים, ארבע בדיקות מדויקות ו־SHA-256 digest תואם.
Evidence עתידי, פג, ארוך מדי, מורחב, ששונה לאחר יצירתו או ששייך ל־Release,
Commit או Artifact אחרים נחסם בקוד תוצאה תחום.

4.163.3 הפלט המאומת כולל רק Release ID, ‏Commit SHA, ‏Artifact digest,
זמני אימות ותפוגה ומספר הבדיקות. הוא אינו כולל Tenant, ‏Clerk ID,
Meta IDs, מספר טלפון, Token, ‏HMAC, מלאי פרטי או Payload. ה־Digest מוכיח
שלמות תוכן ואינו חתימה מאומתת; מקור הראיה נשאר Railway deployment
orchestration המורשה.

4.163.4 השער הקיים `automation.bot-reply-adapter` הוקשח ללא הוספת שורת
Readiness חדשה. הוא דורש כעת יחד: Delivery adapter ממומש, Evidence חי של
תרחישי ספק ה־WhatsApp ו־Cross-service Evidence תקף ל־Release הנוכחי.
חסרון של כל אחד משלושת התנאים משאיר אותו `blocked`.

4.163.5 נוספו שש בדיקות עבור יצירה ואימות תקינים, דוח חלקי, זמן חיים
לא בטוח, Extension fields, בדיקה שנכשלה, Digest ששונה, זמן עתידי או פג
והתאמה נפרדת ל־Release, ‏Commit ו־Artifact. ‏Registry, ‏`.env.example`,
חוזה API, ‏Release checklist, חוזה Hosting ומסמך ההרצה עודכנו. לא נעשה
שימוש ב־`Math.random()` או `crypto.randomUUID()`.

4.163.6 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,076 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **759 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,554 קבצים — 1,219 מנוהלים ו־335 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.163.7 **עדיין חסר בכוונה:** יצירת ה־Evidence מתוך שני Railway Services
חיים באותו Release, הזנת Accounts/Credentials, בחירת Tenant ו־Staging
WABA מאושרים, אישור מתודת הבדיקה של טל, מעבר Preflight והרצת Evidence
חיה ומורשית מול ספק ה־WhatsApp. עד אז `botReplyDeliveryAdapter` נשאר
`false`. לא בוצעו Commit, ‏Push, ‏Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.164 — Two-phase Release Evidence Issuer

4.164.1 **הושלם מקומית:** נוסף Release evidence issuer גרסה 1. הוא אינו
מקבל Environment snapshots או Secrets של Railway API/Worker; Dependencies
תחומות מספקות רק זהות Release נוכחית ו־Cross-service activation report.

4.164.2 ה־Issuer קורא את Release ID, ‏Commit SHA ו־Artifact digest לפני
ה־Activation ואחריו. הוא מפיק Evidence רק כאשר שתי הקריאות זהות זו לזו
ולזהות הצפויה. Release drift לפני הבדיקה מונע את הפעלתה; Drift אחריה
מונע את ההנפקה.

4.164.3 דוח שאינו `ready`, ‏Dependency שנכשלה או Clock לא תקין מחזירים
תוצאה חסומה ללא Evidence. הפלט המוצלח כולל רק JSON תחום, Evidence digest
ותאריך תפוגה. הפלט החסום אינו מחזיר הודעת Dependency, ‏Environment value,
Tenant, ‏Provider identity או Secret.

4.164.4 ה־JSON המונפק עובר את ה־Verifier של שלב 4.163 ונשאר קשור לאותו
Release, ‏Commit ו־Artifact למשך 60–900 שניות. ה־Issuer אינו כותב
Environment variable ואינו מבצע Deployment; כתיבה אטומית ואימות לאחר
כתיבה נשארים באחריות Railway deployment orchestration המורשה.

4.164.5 נוספו שש בדיקות עבור סדר `release → activation → release`, הנפקה
ואימות תקינים, Release צפוי שונה, Drift לאחר Activation, דוח חסום, כשלי
Dependency/Clock וקלט או Dependencies מורחבים. ‏Registry, חוזה API,
Release checklist, חוזה Hosting ומסמך ההרצה עודכנו. לא נעשה שימוש
ב־`Math.random()` או `crypto.randomUUID()`.

4.164.6 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,082 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **760 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,556 קבצים — 1,219 מנוהלים ו־337 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.164.7 **עדיין חסר בכוונה:** Railway adapters חיים לקריאת זהות ה־Release
ול־Cross-service activation, כתיבה אטומית של ה־JSON עבור אותו Release
ואימות לאחר כתיבה. עדיין נדרשים Accounts/Credentials, ‏Tenant ו־Staging
WABA מאושרים, אישור מתודת הבדיקה של טל והרצת ספק חיה ומורשית. עד אז
`botReplyDeliveryAdapter` נשאר `false`. לא בוצעו Commit, ‏Push,
Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.165 — Atomic Release Evidence Publication Contract

4.165.1 **הושלם מקומית:** נוסף Release evidence publisher גרסה 1 עם
Storage Port ספק־נייטרלי של Compare-and-set. הקלט כולל Release צפוי,
גרסת Evidence נוכחית, Digest קודם וה־Evidence שהונפק בשלב 4.164.

4.165.2 לפני Storage access ה־Publisher מריץ את ה־Verifier ודוחה Evidence
ששונה, פג או שייך ל־Release אחר. גם State קודם שאינו זוג עקבי של JSON
ו־Digest, או שאינו עובר אימות עצמי בזמן יצירתו, נחסם לפני כתיבה.

4.165.3 ה־Adapter חייב להשוות אטומית Release, גרסה ו־Digest קודם. לאחר
כתיבה מוצלחת ה־Publisher קורא את המצב מחדש, דורש גרסה עוקבת, התאמה
byte-for-byte של JSON ו־Digest, ומריץ שוב את ה־Verifier. ‏CAS conflict,
כשל Dependency ו־Read-back mismatch מחזירים קודים נפרדים ותחומים.

4.165.4 Retry שרואה כבר את הגרסה העוקבת ואת אותו JSON מוחזר כ־Replay ללא
כתיבה נוספת. התוצאה הציבורית כוללת רק Version, ‏Replay flag, ‏Digest
ותאריך תפוגה; היא אינה כוללת את ה־JSON, ‏Tenant, ‏Environment values,
Provider identity או הודעת שגיאה פנימית.

4.165.5 נוספו שבע בדיקות עבור פרסום CAS וקריאה חוזרת, Replay ללא כתיבה,
Release/Version/Digest mismatch, ‏State קודם פגום, Conflict, ‏Read-back
mismatch, Evidence שונה או פג, כשלי Storage וקלט או תשובות מורחבים.
‏Registry, חוזה API, ‏Release checklist, חוזה Hosting ומסמך ההרצה עודכנו.
לא נעשה שימוש ב־`Math.random()` או `crypto.randomUUID()`.

4.165.6 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,089 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **761 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,558 קבצים — 1,219 מנוהלים ו־339 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.165.7 **עדיין חסר בכוונה:** Railway adapter חי המממש Compare-and-set
אמיתי עבור Environment של אותו Release. מנגנון כתיבה כזה טרם נבחר ולא
הומצא API של Railway. עדיין נדרשים Accounts/Credentials, ‏Tenant ו־Staging
WABA מאושרים, אישור מתודת הבדיקה של טל והרצה חיה ומורשית. עד אז
`botReplyDeliveryAdapter` נשאר `false`. לא בוצעו Commit, ‏Push,
Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.166 — Release Evidence Storage Decision

4.166.1 **הושלם מקומית:** נבדק התיעוד הרשמי העדכני של Railway Public
API, ‏Variables, ‏Deployment, ‏PostgreSQL ו־Private Networking, יחד עם
חוזה `UPDATE ... WHERE ... RETURNING` הרשמי של PostgreSQL.

4.166.2 ‏Railway Variables נפסלו כהמלצת מקור אמת ל־Evidence קצר־חיים.
ה־API מתעד Upsert אך לא Compare-and-set לפי Version/Digest, ושינוי Variable
נכנס ל־Runtime רק לאחר Staged change ו־Deployment. עטיפת Read ואז Upsert
לא הייתה אטומית, ו־Redeploy אינו מתאים לראיה שתוקפה 60–900 שניות.

4.166.3 נוסף ADR-0005 במצב `proposed`, הממליץ על רשומת PostgreSQL גרסתית
בתוך אותה Railway Environment. התנאים Release, ‏Version ו־Digest ייבדקו
באותה פעולת Update, ו־`RETURNING` יבדיל הצלחה מ־Conflict. החיבור בין
השירותים למסד נשאר ב־Railway private network.

4.166.4 נוסף Configuration inspector גרסה 1. הוא נכשל סגור ללא
`BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE` ומקבל רק ערך קנוני
`postgresql`. ‏Railway Variables, ‏Redis, ‏Memory, אותיות שונות או
Whitespace נדחים. הפלט אינו מחזיר את הערך שסופק ותמיד מציין ש־Environment
variable publication אסור.

4.166.5 ‏ADR-0005 לא סומן `accepted` משום שאין עדיין בעל החלטה ואישור
פורמלי מתועדים. לכן ההמלצה אינה פותחת Production gate. נוספו ארבע בדיקות
Configuration ובדיקת ADR נוספת; ‏Registry, ‏`.env.example`, ‏README,
ADR index, חוזה API, ‏Release checklist, חוזה Hosting ומסמך ההרצה עודכנו.
לא נעשה שימוש ב־`Math.random()` או `crypto.randomUUID()`.

4.166.6 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,094 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **762 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,561 קבצים — 1,219 מנוהלים ו־342 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity נשאר על **42 מיגרציות D1, ‏40 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.166.7 **עדיין חסר בכוונה:** אישור פורמלי ל־ADR-0005, Migration ורשומת
State, ‏PostgreSQL Repository המממש את Port ה־CAS, חיבור ל־Foundation
והחלפת קריאת ה־Environment JSON הזמנית ב־Repository reader. עדיין נדרשים
Accounts/Credentials, ‏Tenant ו־Staging WABA מאושרים ואישור מתודת הבדיקה
של טל. לא בוצעו Commit, ‏Push, ‏Deployment או שליחת WhatsApp בשלב זה.

# עדכון 4.167 — PostgreSQL Release Evidence CAS Repository

4.167.1 **הושלם מקומית:** נוספה מיגרציה
`0040_bot_reply_staging_release_evidence.sql`. היא יוצרת שורת State נפרדת
לכל Release עם Release ID, ‏Commit SHA, ‏Artifact digest, גרסת Evidence,
JSON byte-exact, ‏Digest, זמני אימות ותפוגה וזמני אתחול ועדכון.

4.167.2 ‏Check constraints אוכפים זהות ודפוסי Digest, זוג עקבי של
JSON/Digest, Version 0 ריק, גודל מרבי 8,192 בתים, Timestamps ברמת
Milliseconds וחלון חיים של 60–900 שניות. הזהות, ה־Digest והזמנים שבתוך
ה־JSON חייבים להתאים לעמודות. לא נוספו Seed data, מזהים אקראיים או
פעולות הרסניות.

4.167.3 נוסף PostgreSQL Repository גרסה 1 המקושר ל־Release יחיד. אתחול
השורה הוא Idempotent; קריאה לפני אתחול נכשלת סגור; ו־CAS מתבצע באמצעות
`UPDATE ... WHERE ... RETURNING` יחיד. התנאים כוללים Release ID, ‏Commit,
Artifact, גרסה ו־Digest קודם באמצעות `IS NOT DISTINCT FROM`.

4.167.4 לפני Database access ה־Repository מאמת מבנה מדויק, מגבלת בתים,
JSON קנוני, זהות Release, ‏Digest, ‏Verified timestamp ו־Expiry באמצעות
ה־Cross-service verifier הקיים. אפס שורות שהוחזרו הוא Conflict תחום;
Version שאינו עוקב או Row מורחבת גורמים לכשל סגור.

4.167.5 נוספו שבע בדיקות Repository: אתחול וקריאה, כשל לפני אתחול, כתיבה
byte-exact, ‏Conflict, שתי כתיבות מתחרות עם Winner יחיד, דחיית Tampering
ותוצאות Persistence לא תקינות, וחוזה קפוא ללא Randomness. נוספה גם בדיקת
Migration וה־Inventory עודכן ל־41 מיגרציות PostgreSQL ו־13 מיגרציות
Railway-only.

4.167.6 שער השחרור המקומי הרשמי עבר במלואו: שני ה־Production builds וכל
**3,102 הבדיקות** עברו ללא כשל, Skip או Todo; ‏TypeScript ו־ESLint עברו.
Source guard סרק **763 קבצים ו־35 Client graphs**; ‏Secret hygiene סרק
**1,564 קבצים — 1,219 מנוהלים ו־345 חדשים** — כולל היסטוריית Git.
‏Interface guard עבר 15 בדיקות, ‏Dependency lock עבר עבור 43 תלויות
ישירות ו־Migration parity עבר על **42 מיגרציות D1, ‏41 מיגרציות
PostgreSQL ו־55 טבלאות D1**. ‏Production readiness נשאר צפוי על **5
Ready, ‏18 Blocked ו־11 Decision required**.

4.167.7 **עדיין חסר בכוונה:** אין PostgreSQL Loopback פעיל או
`CONNECT_POSTGRES_INTEGRATION_URL`, ולכן מיגרציה 0040 וה־CAS טרם הוכחו
מול PostgreSQL אמיתי. נדרשים גם חיבור ה־Repository ל־Runtime composition,
החלפת Environment reader במקור Repository, אישור פורמלי של ADR-0005,
Accounts/Credentials, ‏Tenant ו־Staging WABA מאושרים ואישור מתודת הבדיקה
של טל. לא בוצעו Commit, ‏Push, ‏Deployment או שליחת WhatsApp בשלב זה.
