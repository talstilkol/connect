# מצב השלמה ומשימות מקומיות

תאריך בדיקה: 2026-08-16

## 1. אחוזי השלמה

1.1 תוכנית ה־Baseline המקומית המקורית: **100%**.

1.1.1 כל 14 שלבי ה־Master Plan הושלמו בקוד המקומי.

1.1.2 Build, ‏TypeScript, ‏ESLint וכל 1,238 הבדיקות עוברים.

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

2.7 **בביצוע:** פיצול `app/globals.css` לקובצי Feature ושכבת Tokens.

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

2.7.10 `app/globals.css` ירד מ־7,890 ל־3,466 שורות. פיצול Contact
Import ויתר השכבות המשותפות מוערך ב־**0.5–1 שעה**.

2.8 בדיקות עומס וכשל מקומיות נוספות.

2.8.1 תכולה: Queue backlog, ‏DLQ, ‏Retry, ‏Provider timeout,
Retention plan expiry ו־Restore evidence mismatch.

2.8.2 אומדן: **8–12 שעות**.

2.9 Release rehearsal מקומי ותיעוד מפעיל.

2.9.1 תכולה: Fail-closed production gate, סדר הורדת Artifacts,
הזרקת Evidence, Rollback/Forward-fix ו־Smoke checklist.

2.9.2 אומדן: **4–6 שעות**.

2.10 סך העבודה המקומית שנותרה:

2.10.1 סכום האומדנים המפורטים הוא **12.5–19 שעות**: 0.5–1 שעה
לסיום שלב 7, ‏8–12 שעות לשלב 8 ו־4–6 שעות לשלב 9. זהו תיקון חשבוני
לאומדן הקודם.

2.10.2 עם Review, תיקוני Regression ותיעוד: **6–10 ימי עבודה**.

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

3.6 במסלול המקומי אנחנו בשלב 7 מתוך 9. לסיום החלק הנוכחי נשאר
תת־שלב אחד בלבד: Contact Import, ‏CSV, ‏Mapping והשכבות המשותפות.
אחריו נשארים שני שלבים מלאים, 8 ו־9.

## 4. פערים שנוספו לאחר אימות PDF המקור

4.1 המסמך המקורי אומת ב־2026-08-16 לפי SHA-256 המתועד במטריצת
העקיבות. נמצאו ארבעה פערים פונקציונליים שאינם חלק מסיום ה־Baseline:

4.1.1 Excel/XLSX import: ‏6–10 שעות פיתוח מקומי.

4.1.2 Recurring Campaign domain ו־Scheduler: ‏10–16 שעות לאחר
החלטת Product על מדיניות recurrence.

4.1.3 Flow Builder חזותי ונגיש עם Drag-and-drop ו־Keyboard parity:
‏24–40 שעות.

4.1.4 עריכת Package, ‏Quota ופרטי קשר ב־Admin: ‏6–10 שעות.

4.2 מסלול Rate Limiting נמצא בשלב 3 מתוך 4. חוזה Admission מחובר
לפני Claim ב־Campaign Queue, כולל `deferred`, ‏Delay תחום,
Reservation key ושחרור לפני Submit. ה־Runtime בונה את ה־Adapter מעל
אותו D1 ומקבל רק Context Resolver חיצוני; ה־Resolver הזמני נכשל
סגור. השלמת גזירת המפתחות, טעינת Capacity חיה ו־Webhook
reconciliation מוערכת ב־8–14 שעות. Adapter חי ל־Meta נשאר זמן
`unknown/unavailable` עד קבלת WABA, ‏Credentials ו־Live capacity
state.

4.3 לכן סך העבודה המקומית הידועה אינו עוד 12.5–19 שעות. לאחר
הוספת פערי ה־PDF וה־Rate Limiting הוא **66.5–109 שעות פיתוח נטו**,
ללא המתנה לספקים וללא זמן Adapter חי שאינו ניתן לאומדן כעת.
