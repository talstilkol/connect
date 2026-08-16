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

1.3 אומדן ניהולי לכל הדרך מהאפיון עד מערכת חיה: **70% ±5%**.

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
פיצול Condition יחיד ומסלולי Handoff לפי Keyword או מתוך כל אחד
מענפי ה־Condition הושלמו. Handoff מעביר רק בענף שנבחר, ללא Reply
באותו Turn; בחירת Handoff פנימי מסירה וחוסמת הודעות Intro, ו־Payload
שמנסה לשלב תוכן נסתר עם ההעברה נדחה בשרת. אי־התאמת Keyword במסלול
Handoff ישיר מסתיימת ללא Mutation. לכל Button ולכל תוצאת Condition
שאינה Handoff תשובת Text נפרדת; הגרף והמפתחות נגזרים בשרת, והמשך
בחירה נשען על Outbox Accepted של ההודעה הקודמת באותה גרסה ובחלון 24
שעות. נותרו מסלולים מרובי Conditions או שאלות, חיבור Graph מלא,
Drag-and-drop ובדיקות Browser. אומדן ה־8–16 שעות נשמר בשלב זה משום
שה־Canvas, ריבוי הענפים וה־Browser E2E הם רוב אי־הוודאות שנותרה.

4.1.4 עריכת Business Profile הקיים ב־Admin הושלמה. מודל Package,
‏Quota ופרטי קשר נשאר החלטת Product פתוחה. לאחר אישור המודל, אומדן
היישום המקומי הוא 8–14 שעות; חיבור Billing חי אינו כלול.

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

4.3 סך העבודה המקומית הידועה, ללא Package/Quota/Contact שטרם
הוכרעו, הוא **46–78 שעות פיתוח נטו**. אם מאשרים את המודל המומלץ
בסעיף 18 של מסמך ההחלטות, הטווח התכנוני הופך ל־**54–92 שעות**.
הטווח אינו כולל המתנה לספקים או זמן Adapter חי שאינו ניתן לאומדן.
