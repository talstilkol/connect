# 1. Connect — מפת מימוש ופערים בתהליכי המוצר

1.1 נבדק ב־10.09.2026 מול בסיס קוד `801d7d868c6107fe37f3f569d3bcb05491ddc340`.
המפה משלימה את [עקיבות 27 דרישות האפיון](../product-specification-traceability.md)
ואת משימה 1.2 ב־[Master Plan](launch-master-plan-2026-09-09.md).
היא מתארת קוד וחיבורי רכיבים; היא אינה ראיית שימוש ב־Staging.

1.2 **ממצא מרכזי:** חסרות גם פעולות מוצר וחיבורי Runtime. פתיחת החשבונות
לבד אינה משלימה Templates, הפעלת קמפיינים, השהיה/ביטול או מענה ידני ב־Inbox.

1.3 משמעות הסיווג: **KEEP** — לשמר את המימוש הקיים; **VERIFY** — להוכיח
את התהליך בשילוב אמיתי; **REFACTOR** — להשלים או להחליף חיבור קוד חסר.
אותו תהליך יכול לדרוש גם KEEP וגם VERIFY. רכיב שנדחה לאחר הפיילוט נשאר
בתוכנית, ואינו מסומן כמושלם.

# 2. מסלול הבקשה הקיים

2.1 מסכי Workspace נטענים דרך [עמוד המקטע](../../app/workspace/[section]/page.tsx)
ומוצגים ב־[WorkspaceSectionContent](../../features/workspace/WorkspaceSectionContent.tsx).
פעולות המשתמש עוברות ב־Server Actions ל־Railway Handler וללקוח API.

2.2 נקודת הכניסה העסקית היא `POST /v1/connect`, עם שם Operation במעטפה —
לפי [חוזה ה־API](../../server/platform/railwayApiContract.ts).
[מרשם הפעולות הראשי](../../server/platform/railwayApiOperationRegistry.ts)
מכיל כעת 35 מדיניות־פעולה, לאחר הוספת סנכרון תבניות, בקרות קמפיין ומענה ידני. פעולות זהות, צוות, Meta ו־System Admin מצורפות
בנפרד ב־[Railway API Runtime](../../server/platform/railwayApiRuntime.ts);
35 אינו מספר כל הפעולות במערכת.

2.3 [PostgreSQL API Runtime](../../server/platform/railwayPostgresApiRuntime.ts)
מחבר Services ל־[PostgreSQL Foundation](../../server/platform/railwayPostgresFoundation.ts).
קיומו של Adapter אינו מוכיח שה־Executable מעביר אליו את התצורה הנדרשת.
זהו ההבדל שנמצא במסלול הקמפיינים והתבניות.

# 3. מפת תהליכים

| מזהה ותהליך | UI / Server Action | Operation / מאגר יעד | סיווג ופער שנותר |
|---|---|---|---|
| W01 הרשמה וכניסה | [Login](../../app/login/page.tsx), [Register](../../app/register/page.tsx) | Clerk; [זהות שרת Railway](../../server/platform/currentRailwayApiServerIdentity.ts) | KEEP + VERIFY: אפליקציית Clerk, Organization ו־MFA אמיתיים; אין ראיית כניסה חיה |
| W02 הקמת עסק | [Onboarding](../../features/workspace/WorkspaceOnboarding.tsx), [שמירת פרופיל](../../server/onboarding/saveBusinessProfileAction.ts) | `onboarding.business-profile.read/save`; [Profile](../../server/platform/postgresBusinessProfileRepository.ts), [Provisioning](../../server/platform/postgresTenantProvisioningRepository.ts) | KEEP + VERIFY: יצירת בעלים ועסק, Replay ובידוד בשתי כניסות מקבילות |
| W03 מעבר עסק | [Tenant switcher](../../features/workspace/TenantWorkspaceSwitcher.tsx), [פעולות בחירה](../../server/auth/tenantSelectionActions.ts) | [פעולות Tenant selection](../../server/platform/railwayTenantSelectionOperations.ts), [מאגר הבחירה](../../server/platform/postgresTenantSelectionRepository.ts) | KEEP + VERIFY: Membership עדכני ובקשת מעבר שלא מעבירה נתוני עסק אחר |
| W04 צוות והזמנות | [Team directory](../../features/team/TeamDirectory.tsx), [עמוד קבלה](../../app/invite/[invitationKey]/page.tsx) | [Directory](../../server/platform/railwayTeamDirectoryOperation.ts), [Membership](../../server/platform/railwayTeamMembershipOperations.ts), [בקשה](../../server/platform/railwayTeamInvitationRequestOperation.ts), [קבלה](../../server/platform/railwayTeamInvitationAcceptanceOperation.ts) | KEEP + VERIFY: הזמנה מול Clerk, תפוגה, ביטול, העברת בעלות ו־429; נדרש ספק אמיתי |
| W05 אנשי קשר | [Contact directory](../../features/contacts/ContactDirectory.tsx), [פעולות](../../server/contacts/contactActions.ts) | `contacts.list/save`; [קריאה](../../server/platform/postgresContactReadRepository.ts), [Mutation executor](../../server/platform/postgresRailwayApiMutationExecutor.ts) | KEEP + VERIFY: הרשאות, עימוד, שינוי מקביל ושחזור לאחר שגיאה |
| W06 רשימות, תגיות והסכמה | [Contact organization](../../features/contacts/ContactOrganization.tsx), [פעולות ארגון](../../server/contacts/contactOrganizationActions.ts) | `contacts.organization.*`, `contacts.consent.grant/unsubscribe`; [ארגון](../../server/platform/postgresContactOrganizationRepository.ts), [הסכמה](../../server/platform/postgresContactConsentRepository.ts) | KEEP + VERIFY: הסרה לפני שליחה, Snapshot וקלט מורשה |
| W07 ייבוא אנשי קשר | [Import](../../features/contacts/ContactImport.tsx), [פעולות ייבוא](../../server/contacts/contactImportActions.ts) | `contacts.import.start/chunk`; [מאגר ייבוא](../../server/platform/postgresContactImportRepository.ts) | KEEP + VERIFY: CSV/XLSX אמיתיים ומורשים, שגיאה באמצע, כפילות והסכמה |
| W08 חיבור WhatsApp | [Onboarding](../../features/workspace/WorkspaceOnboarding.tsx), [פעולות Embedded Signup](../../server/meta/metaEmbeddedSignupActions.ts) | [פעולות Meta signup](../../server/platform/railwayMetaSignupOperations.ts), [Runtime](../../server/platform/railwayMetaSignupRuntime.ts), [מאגר Meta](../../server/platform/postgresMetaRepository.ts) | KEEP + VERIFY: קוד/QR רשמי, מספר Business זכאי, ביטול ופקיעה; אין הוכחת מכשיר |
| W09 היסטוריה, Echo וניתוק | [Inbox](../../features/conversations/ConversationInbox.tsx) | [סנכרון](../../server/platform/railwayMetaDataSyncRuntime.ts), [Echo](../../server/platform/postgresMetaMessageEchoRepository.ts), [Lifecycle](../../server/platform/postgresMetaAccountLifecycleRepository.ts) | KEEP + VERIFY + REFACTOR: תוקן סדר Projection → Binding ונוספה בדיקת Coexistence ב־CI (סעיף 66 ב־Master). עריכות כיתוב מדיה ומיגרציה 0074 נוספו בסעיף 70; השלמת ייבוא וחידוש אחרי Offboarding עם שיוך לדור הנכון עדיין דורשים קבלה, כמפורט במשימות 4.6–4.8 |
| W10 מדיה מהיסטוריה | [הצגת הודעה](../../features/conversations/ConversationMessageView.tsx), [אבחון משימות](../../app/workspace/media-tasks/page.tsx) | [קריאת קובץ](../../server/platform/railwayMetaMediaFileReadRuntime.ts), [ניקוי](../../server/platform/postgresMetaMediaCleanupRepository.ts) | KEEP + VERIFY + REFACTOR: S3/סריקה חיים, גרסאות סותרות וניקוי אוטומטי; ההפעלה נשארת מוגבלת |
| W11 טיוטת Template | [Template editor](../../features/templates/TemplateDraftEditor.tsx), [פעולות](../../server/templates/messageTemplateActions.ts) | `templates.list/draft.save`; [מאגר Templates](../../server/platform/postgresMessageTemplateRepository.ts) | KEEP + VERIFY: כתיבה וקריאה ב־PostgreSQL קיימות; זו אינה הגשה ל־Meta |
| W12 הגשה וסנכרון Template | אותו Editor ו־Action של W11 | `templates.submit/sync`; [Submission executor](../../server/platform/postgresRailwayMessageTemplateSubmissionMutationExecutor.ts), [Outbox](../../server/platform/postgresMessageTemplateSubmissionOutboxRepository.ts) | KEEP + VERIFY: הגשה וסנכרון מחוברים ל־Railway; ההפעלה נפרדת וכבויה כברירת מחדל. נדרשים Staging, Meta אמיתי ובדיקת התאוששות |
| W13 יצירת קמפיין ותזמון | [Campaign manager](../../features/campaigns/CampaignManager.tsx), [פעולות](../../server/campaigns/campaignActions.ts) | `campaigns.directory.read/snapshot.save/activate`; [קמפיין](../../server/platform/postgresCampaignRepository.ts), [Dispatch](../../server/platform/postgresCampaignDispatchRepository.ts) | KEEP + VERIFY: ה־API Executable מחבר כעת את CAMPAIGN_ACTIVATION_ENABLED למוכנות ההפעלה; כבוי כברירת מחדל. הפעלה ב־Staging ובדיקת משלוח חי עדיין פתוחות |
| W14 השהיית וביטול קמפיין | [Campaign manager](../../features/campaigns/CampaignManager.tsx), [פעולות קמפיין](../../server/campaigns/campaignActions.ts) | `campaigns.control`; [Mutation executor](../../server/platform/railwayCampaignMutationExecutor.ts) | KEEP + VERIFY: Pause/Resume/Cancel מומשו עם Receipt, הרשאות ותיאום לתור; נותרו קבלת Staging וספק חי, כמפורט בסעיף 8 |
| W15 קריאה ושיוך Inbox | [Inbox](../../features/conversations/ConversationInbox.tsx), [פעולות שיחה](../../server/conversations/conversationActions.ts) | `conversations.list/thread.read/mark-read/assignment.change`; [מאגר שיחות](../../server/platform/postgresConversationRepository.ts) | KEEP + VERIFY: הרשאות, פילטרים, Unread, שיוך ו־Polling; יש לבדוק עומס ועימוד בשילוב |
| W16 מענה ידני לאחר Handoff | [Composer](../../features/conversations/ConversationComposerBoundary.tsx), [מצב בקשה](../../features/conversations/manualReplyDraft.ts) | `conversations.reply.send`; [Outbox](../../server/platform/postgresManualReplyRepository.ts), [Worker](../../server/conversations/manualReplyWorker.ts) | KEEP + VERIFY: מענה ידני מומש; בקשות שלא אושרו נשמרות גם כשהסינון מסתיר את השיחה. קבלת UI וספק חי נשארת פתוחה, כמפורט בסעיפים 9–10 |
| W17 Bot בסיסי | [Flow builder](../../features/bot/BotFlowBuilder.tsx), [פעולות Bot](../../server/bot/botFlowActions.ts) | `bot.flows.list/details.read/draft.save/publish`; [Flows](../../server/platform/postgresBotFlowRepository.ts), [Runtime](../../server/platform/postgresBotRuntimeRepository.ts) | KEEP + VERIFY: שמירה/פרסום, גרסאות, כפתורים, עצירת Bot ב־Handoff ושליחה אמיתית; W16 נשאר תלות נפרדת |
| W18 דוחות ו־Dashboard | [Reports](../../features/reports/OperationalReports.tsx), [Dashboard](../../features/workspace/WorkspaceDashboard.tsx) | `reports.read`; [מאגר דוחות](../../server/platform/postgresOperationalReportRepository.ts) | KEEP + VERIFY: סיכום Dashboard מחובר לדוח מורשה לפי R207 וסעיף 16: הודעות, שיחות בטווח, קמפיינים שנוצרו והחלטות AI. טווח ושעת Snapshot מוצגים; קבלה מול Receipts חיים ו־QA עדיין נדרשים |
| W19 AI ו־Knowledge אחרי פיילוט | [AI editor](../../features/ai/AiAgentEditor.tsx), [Upload action](../../server/ai/knowledgeUploadActions.ts) | `ai.agents.*`, `ai.reply-approvals.*`; [AI agents](../../server/platform/postgresAiAgentRepository.ts), [Reply outbox](../../server/platform/postgresAiReplyOutboxRepository.ts) | KEEP + REFACTOR + VERIFY: Draft/Approval אינם שליחה. Upload הישן D1/R2; נוספה חסימה שרתית מפורשת לפני הגישה אליו. הפיתוח של יעד S3 וה־AI Sender קודם כעת לפני החיבורים לפי R208; מתאם Responses, אחזור PostgreSQL ויומן/שריון עמיד מחוברים ב־Worker לפי R209; השלמת Knowledge, אישור/שליחה וקבלה חיה עדיין פתוחות |
| W20 Billing וניהול מערכת | [Billing](../../features/workspace/WorkspaceSectionContent.tsx), [Admin](../../app/admin/page.tsx), [פעולות מנוי](../../server/billing/systemAdminSubscriptionActions.ts) | `system-admin.subscription.*`; [מאגר מנויים](../../server/platform/postgresTenantSubscriptionRepository.ts) | KEEP למנוי ידני + REFACTOR/VERIFY ל־Paddle בשלב 11. אין Checkout פעיל במסך Billing; זכאות, Webhooks ו־Dunning טרם הוכחו |
| W21 בקרות השקה ותפעול | [Decision center](../../features/workspace/DecisionCenter.tsx), [מדיניות WhatsApp](../../app/admin/whatsapp-delivery-policy/[tenantId]/page.tsx) | [Runtime V2](../../server/platform/currentRailwayProductionReadinessV2.ts), [מדיניות](../../server/platform/postgresWhatsappCampaignDeliveryPolicyRepository.ts) | KEEP + VERIFY: V2 אינו בדיקת מוצר; נדרשים ניטור, Restore, Retention ו־Kill switch חיים בשלבים 6–7 |

3.1 קמפיינים חוזרים, Enterprise, API ציבורי ויישומון Native מחוץ לגרסה
לפי ההכרעות הקיימות. AI/Knowledge ו־Billing הם שלבים מאוחרים בתוך היעד,
ולכן אינם נמחקים מהמפה או מהערכת ההשלמה.

# 4. תור מימוש שנגזר מהממצאים

| סדר | משימות קיימות | עבודה קונקרטית | אומדן ראשוני לשעות הנדסה |
|---|---|---|---|
| G01 | 4.2, 5.3 | לחבר הגשת Template מה־UI דרך API ל־Outbox/Worker, לחבר Sync ל־Railway ולהחליף חסימה קבועה במצב מוכנות שרתי שנבדק | 8–12 |
| G02 | 4.4, 5.3 | לחבר מוכנות Campaign delivery ב־API Executable מול תצורת Worker; לבדוק כיבוי ותצורה חלקית | 4–8 |
| G03 | 5.3 | לממש Pause/Resume/Cancel עם הרשאות, Version, Receipt/Audit ו־Queue; להגדיר תוצאה לבקשה שכבר החלה לצאת לספק | 12–20 |
| G04 | 5.2, 5.4 | מענה טקסט ידני מתוך Inbox: Composer, הרשאות, חלון שירות, Outbox, מניעת כפילות ותוצאת מסירה | 16–32 |

4.1 **40–72 שעות** הן הערכה ראשונית לקבוצת ארבעת הפערים בלבד, בביטחון
נמוך. זו אינה הערכת סיום המוצר ואינה תוספת אוטומטית לאומדן הישן, שיש בו
חפיפה לתהליכים אלה. לא נכללו זמני המתנה לספק או בדיקות מכשיר.

4.2 סדר הביצוע: השלמת המפה וחסימת Upload בפיילוט; אחריה G01, G02, G03
ו־G04. ניתן להשלים קוד מקומי בזמן המתנה לחשבונות. הפעלה ובדיקות קבלה
של ספקים דורשות Staging אמיתי. אין להסיר קבועי חסימה בלבד ולכנות זאת
השלמת האינטגרציה.

4.3 מענה מהטלפון במסגרת Coexistence הוא תרחיש חשוב ל־Echo. הוא אינו
מוכיח שהנציג יכול לכתוב ולשלוח מתוך Connect. R153 מחייב להציג את שני
התהליכים בנפרד ולסגור את W16 לפני הכרזה על השלמת Inbox לשחרור הליבה.

# 5. אימות וגבולות הדוח

5.1 נקראו מסכי הכניסה והניתוב הרלוונטיים, Server Actions, מרשם הפעולות,
Composition roots ומאגרי היעד המצוטטים. רשימת 32 הפעולות חולצה מייצוא
הקוד עצמו ללא יצירת לקוח API, חיבור למסד או נתוני לקוחות.

5.2 הורצו 19 בדיקות קיימות של Upload policy/service/handler ושל גבולות
Templates ו־Inbox. הן עברו, ו־ESLint עבר בקובץ Upload ששונה. הצלחת
בדיקת Composer disabled מאמתת חסימה קיימת; אינה הוכחת Composer פעיל.

5.3 תוצאות הפרסום, אימות המקורות וה־CI נשמרות
ב־[דוח האימות](../../outputs/launch-validation-2026-09-09/workflow-map-validation.json).
לא בוצעו פריסה, גישה חוזרת לדפדפן הנעול, שליחה לספק או בדיקת QR.

5.4 נותרו **12 שלבי־על**. מפת התהליכים מקדמת את 1.2, אך אין בכך סגירה
של כל הממצאים ההיסטוריים ב־1.1, בדיקות המוצר או שלב 1 כולו. אומדן הסיום
הכולל המעודכן עדיין אינו ידוע; 10–16 שבועות ב־30 שעות בשבוע נשאר אומדן
התכנון המקורי בלבד.


# 6. עדכון מימוש G01 — 10.09.2026

6.1 G01.1 הושלם בקוד: הגשת גרסה מוגדרת מהממשק ל־Outbox, מוכנות שרת
מפורשת כבויה כברירת מחדל, דחיית גרסה שהתיישנה ומניעת כפילות לפי גרסה.
ה־Worker וההתאוששות הקיימים לא הוחלפו. המימוש טרם הופעל מול Meta.

6.2 G01.2 הושלם בקוד: Sync ל־PostgreSQL עם כתיבה אטומית, Audit,
אימות הרשאה וחיבור אחרי GET, ו־Replay ללא GET נוסף. עברו שש בדיקות
PostgreSQL אמיתי, כולל כשל SQL מאוחר; אין בכך ראיית ספק חי.
G01.3 פתוח: קבלה חיה של הגשה, Status webhook, כפילות והתאוששות.
טבלת סעיף 4 מתארת את אומדן הבסיס, ואינה אומדן יתרה לאחר עדכון זה.

6.3 [פירוט ומצב בדיקות — סעיפים 60–61](launch-master-plan-2026-09-09.md).
G01.3 נשארת תלויה בסביבה ובספק אמיתי; מצב G02 מעודכן בסעיף 7.


# 7. עדכון מימוש G02 — 10.09.2026

7.1 G02 הושלם בקוד: CAMPAIGN_ACTIVATION_ENABLED נקרא ב־Executable
ומועבר כהחלטה קבועה לתהליך אל campaignDeliveryConfigured. אותו מקור
משמש את Directory ואת PostgreSQL mutation executor. רק true מדויק
עם Graph version מפורש מאפשר הפעלה חדשה; תצורה פגומה עוצרת Startup
לפני Telemetry/Redis/PostgreSQL. שמירת טיוטות אינה תלויה במתג.

7.2 המתג אינו Health probe ואינו מפסיק תור או Worker. כיבויו חוסם
הפעלות חדשות, אך Receipt קיים ניתן לשחזור וקמפיין שכבר הופעל ממשיך
לפי מצבו. Pause/Resume/Cancel נשארים G03. הפעלה אמיתית דורשת Worker,
אותה גרסת שחרור ו־Graph, Credentials, מדיניות מאושרת ותרגיל התאוששות.

7.3 הבא בקוד: G03 ולאחריו G04. סכום אומדני התכנון של שני הפערים
שטרם מומשו הוא 28–52 שעות הנדסה, בביטחון נמוך. זהו חיבור של 12–20
ו־16–32 מסעיף 4; לא מדידת יתרה חדשה ולא אומדן לסיום כל התוכנה.
בדיקות ספק, תיקוני שילוב ושאר ה־Master Plan אינם נכללים בו.

7.4 [מימוש, בדיקות וגבולות — סעיף 62](launch-master-plan-2026-09-09.md).
נותרו 12 שלבי־על; זמן הסיום הכולל המעודכן עדיין אינו ידוע.

# 8. עדכון מימוש G03 — 10.09.2026

8.1 G03 הושלם בקוד: Pause/Resume/Cancel עם UI, API, הרשאות שנבדקות
מחדש בטרנזקציה, Version, Receipt ו־Audit. הודעות מושהות נשארות בתור
בלי לצרוך תקציב כשל, ו־send claim מתואם עם הבקרות בנעילת PostgreSQL.
בדיקות מסד ותור אמיתיות כוללות מרוצים, Rollback והפעלה מחדש של Worker.

8.2 הבא בקוד G04, לפי סעיף 4: 16–32 שעות הנדסה כאומדן תכנון ראשוני
בביטחון נמוך, ללא ספקים, תיקוני שילוב, המתנות או יתר שלבי־העל.
G01/G02/G03 עדיין ממתינים לקבלה חיה. אין בכך סגירה של שלב 5 כולו.

8.3 [מימוש, בדיקות וסדר הפריסה — סעיף 63](launch-master-plan-2026-09-09.md).
נותרו 12 שלבי־על; זמן סיום כולל מעודכן עדיין אינו ידוע.


# 9. עדכון מימוש G04 — 10.09.2026

9.1 נוסף Composer בעברית, אנגלית וערבית, API עם הרשאות ו־Quota, Outbox ייעודי, Worker עם Admission משותף ו־POST יחיד, ו־Inbox עם מזהה ספק אמיתי ועדכוני מסירה. נשמרים pending/failed/unknown בלי נתוני הדגמה. [פרטים וראיות — סעיף 64](launch-master-plan-2026-09-09.md).

9.2 G01–G04 כוללים מימוש מקומי. עדיין נדרשת קבלה חיה לכולם, כולל התאוששות כשהתגובה מ־Meta אבדה, QA של הדפדפן ופריסה מתואמת. יתר תתי־השלבים ב־Master Plan אינם נסגרים מכוח מימוש ארבעת הפערים.

9.3 נותרו 12 שלבי־על. 16–32 שעות הוא אומדן התכנון ההיסטורי של G04 ואינו יתרת עבודה חדשה או זמן סיום כולל. השלב הבא הוא תנאי הקבלה והמוכנות בסעיפים 3–5; משך ההמתנה לחשבונות/ספקים והיקף תיקוני השילוב אינם ידועים.

# 10. תיקון שילוב Inbox — 10.09.2026

10.1 נמצאו ותוקנו שני פערים אחרי מימוש G04: מחיקת בקשה לא מאושרת כאשר סינון מסיר את ה־Composer מעץ הרכיבים, וחפיפה בין Polling לפעולות שינוי שיוך/קריאה/מענה. טיוטות ובקשות שייכות כעת ל־Inbox, ומנגנון תפיסה משותף מתאם את הבקשות לפני התחלתן.

10.2 נעילת המענה נשמרת עד סיום קריאת האישור; כשל בקריאה אינו הופך שמירה שאושרה לתוצאה לא ידועה. הטקסט נשמר בזיכרון המסך בלבד. אין הבטחת שימור לאחר טעינת עמוד מחדש או יציאה מה־Inbox, ואין שמירה ב־localStorage.

10.3 שורות W14/W16 ומספר פעולות המרשם עודכנו כדי להסיר סתירות עם המימוש. סעיפי 6–9 והאומדנים בסעיף 4 נשמרים כתיעוד היסטורי. ההמשך הוא קבלת UI וספק חי, ושאר פערי שלבים 3–5. נותרו 12 שלבי־על; אומדן סיום כולל לא זמין. [פירוט ובדיקות — סעיף 65](launch-master-plan-2026-09-09.md#65-תיקון-שילוב-inbox--10092026).

# 11. השלמת הצגת כיתוב מקורי ב־W09 — 10.09.2026

11.1 כיתובים קיימים באצוות היסטוריה של תמונה, וידאו ומסמך מוצגים כעת בשיחה ובתצוגה המקדימה. הקורא אינו משכתב אצווה או יוצר הודעה חיה, ועריכה/מחיקה או ביטול שיתוף ממשיכים לחול. [מימוש, בדיקות וגבולות — סעיף 73](launch-master-plan-2026-09-09.md#73-הצגת-כיתובים-מקוריים-מהיסטוריית-whatsapp--10092026).

11.2 במועד סעיף 11 נשארו פתוחים Echo חי עם כיתוב מקורי, placeholders, הרשאת קובץ לאחר עריכה, השלמת ייבוא וחידוש חיבור, וקבלה מול ספק. עדכון ה־Placeholder בסעיף 12; W09/W10 לא נסגרו. נותרו 12 שלבים ראשיים; זמן ההשקה הכולל אינו ידוע.

# 12. הצגת Placeholder אחרי קישור מדיה ב־W09/W10 — 10.09.2026

12.1 סוג מדיה וכיתוב אופציונלי מוצגים בשיחה ובתצוגה המקדימה אחרי Binding מאומת, תוך שימור מקורות ההיסטוריה וזמן ההודעה. הקורא בודק מחדש את ההסכמה והחיבור הנוכחי. עריכת כיתוב משתמשת בסוג שהוכח בקישור, בלי לשנות הרשאת הורדת קובץ. [מימוש ובדיקות — סעיף 74](launch-master-plan-2026-09-09.md#74-הצגת-מדיה-שקושרה-להודעת-היסטוריה--10092026).

12.2 במועד סעיף 12 נשארו פתוחים עריכה לפני Binding, חידוש הרשאת קובץ אחרי עריכה, כיתוב מקורי של Echo חי, השלמת ייבוא וחידוש חיבור, S3/סריקה וקבלה מול ספק. סדר ההגעה של עריכה לפני Binding טופל בסעיף 13. אין סגירה של W09/W10 או של שלב ראשי. נותרו 12 שלבים ראשיים; זמן ההשקה הכולל אינו ידוע.

# 13. קישור מדיה אחרי עריכת כיתוב ב־W09/W10 — 10.09.2026

13.1 Binding יכול כעת להוכיח את סוג המקור גם אם עריכת כיתוב תואמת הגיעה לפני ההיסטוריה או לפני אירוע המדיה. ההרשאה נבדקת מחדש תחת נעילה, וכל המקורות וה־Digests נשמרים. מסלול הורדת הקובץ ממשיך לדרוש מקור שלא נערך. [מימוש ובדיקות — סעיף 75](launch-master-plan-2026-09-09.md#75-קישור-מדיה-אחרי-הגעת-עריכת-כיתוב--10092026).

13.2 נשארו חידוש הרשאת קובץ אחרי עריכה, כיתוב מקורי של Echo חי, השלמת ייבוא וחידוש חיבור, תשתית S3/סריקה וקבלת ספק. נותרו 12 שלבים ראשיים; זמן ההשקה הכולל אינו ידוע.

# 14. כיתוב מקורי של Echo חי ב־W09 — 10.09.2026

14.1 כיתובים מקוריים חדשים מתמונה, וידאו ומסמך נתמכים כעת מקומית לאורך Parser → PostgreSQL → Inbox. זהות הכיתוב החדשה נפרדת מ־v1; הודעות Legacy אינן מועשרות מאירועים חוזרים. עריכה, הסרת כיתוב, סתירה ומחיקה ממשיכות לגבור על המקור גם בסדר הגעה שונה. [מימוש, בדיקות ופריסה מתואמת — סעיף 76](launch-master-plan-2026-09-09.md#76-כיתוב-מקורי-של-הודעת-business-app-חיה--10092026).

14.2 נדרשות מיגרציה 0075 וקבלת ספק חיה; עדיין פתוחים חידוש הרשאת קובץ אחרי עריכה, השלמת ייבוא וחידוש חיבור, S3/סריקה ו־Staging. W09/W10 אינם סגורים. נותרו **12 שלבים ראשיים**; זמן ההשקה הכולל אינו ידוע.


# 15. קריאת עותק מדיה קיים לאחר עריכת כיתוב — 11.09.2026

15.1 פער הקריאה לאחר עריכת כיתוב מסעיף 14.2 טופל בקוד: המסך מציע בקשת קובץ להיסטוריית תמונה/וידאו/מסמך שנערך כיתובה. גבול קריאת הקובץ בשרת מאמת את המקור המקורי ואת המשימה, האובייקט והסריקה הקיימים. מסלול Acquisition נשאר חסום אחרי עריכה; הוא אינו יוצר Upload חדש, מחליף קובץ או פותר גרסה לא ידועה.

15.2 מחיקה, כיתוב סותר, סוג עריכה לא תואם, סריקה חוסמת, Tenant זר וביטול הרשאה מונעים מסירה, לרבות שינוי במהלך קריאת הגוף. [הכרעה R206](launch-decisions-2026-09-09.md#7202-r206--קריאת-הקובץ-המקורי-לאחר-עריכת-כיתוב-11092026), [דוח האימות](../../outputs/launch-validation-2026-09-09/media-caption-file-validation.json).

15.3 נדרשות עדיין קבלת דפדפן וספק, תשתית S3/סריקה, השלמת ייבוא וחידוש חיבור. אין סגירת W09/W10 או שלב ראשי. נותרו 12 שלבים ראשיים; זמן ההשקה הכולל אינו ידוע.


# 16. חיבור סיכום Dashboard — 11.09.2026

16.1 R207 החליף את הכרטיסים חסרי המקור בארבעה מדדי דוח קיימים עם כותרות מדויקות, תקופת UTC מפורשת ושעת יצירת Snapshot. שתי כניסות Dashboard משתמשות ב־reports.read ובהרשאתו הקיימת. מצב שגיאה או הרשאה חסרה מסתיר את הערכים; אין מנגנון Polling או קריאה לספק מתוך הרכיב.

16.2 [מקור מצב המימוש והבדיקות](../../outputs/launch-validation-2026-09-09/dashboard-report-validation.json). שינוי כרטיסי הסיכום אינו מימוש של ספירת כלל אנשי הקשר או כלל הקמפיינים הפעילים; הוא שינוי מתוחם לפיילוט. עלויות AI לפי מטבע נשארות בדוח המפורט. W18 אינו מסומן כמאומת בסביבה חיה.

# 17. תכנות AI/Knowledge לפני חיבורים — 11.09.2026

17.1 לפי R208, כתיבת הקוד של W19/W20 קודמת כעת לחיבור החשבונות. פיתוח מקומי של שלבים 10–11 אינו תלוי בהמתנה לפיילוט, אך פתיחה ללקוחות עדיין כפופה לשערי ההפעלה.

17.2 W19 כולל כעת מתאם Responses עם תצורה ו־Rate card, ציטוטים מובנים ו־Usage בסירוב; אחזור PostgreSQL מחובר ל־Worker, ומפענח UTF-8 ל־TXT/Markdown קיים. מתאם Responses עצמו אינו מחובר ל־Worker עד יומן Generation ושריון תקציב עמידים. Upload ל־S3 ו־Sender נשארים פתוחים.

17.3 [תור הפיתוח והאומדנים](code-completion-plan-2026-09-11.md), [אימות מקומי](../../outputs/launch-validation-2026-09-09/code-first-validation-20260911.json). W19/W20 ו־12 השלבים הראשיים לא נסגרו.


17.4 עדכון R209: C2.1/C2.2 מאומתים מקומית, כולל 16 תרחישי PostgreSQL על 16.13/17.11. W19 נשאר פתוח בשל C1.1/C1.2, C2.3 ו־Reconciliation תפעולי; W20 נשאר פתוח. [תור הקוד המעודכן](code-completion-plan-2026-09-11.md), [דוח R209](../../outputs/launch-validation-2026-09-09/ai-journal-validation-20260911.json).


17.5 עדכון R210: C2.3 מאומת מקומית — אישור אדם עד הודעת Inbox וסטטוס מסירה, עם תור עמיד, בדיקת הרשאה/עדכניות חוזרת ומכסות משותפות. W19 נשאר פתוח להשלמת Knowledge ולבירור תפעולי ב־C4.1; W20 נשאר פתוח. נותרו 5 תתי־שלבי פיתוח ו־12 שלבים ראשיים. [התוכנית המעודכנת](code-completion-plan-2026-09-11.md), [דוח R210](../../outputs/launch-validation-2026-09-09/ai-delivery-validation-20260911.json).

### 17.6 R211 — מקורות ידע, 11.09.2026

מסלול Knowledge ממומש מקומית מטופס ההעלאה ועד Ready אחרי סריקת גרסת S3, אימות Hash וחילוץ אטומי. אין חיבור חי. היקף הגרסה הראשונה: TXT/Markdown עד 128 KiB. C1.1/C1.2 סגורים מקומית; C3.1/C3.2/C4.1 נותרים פתוחים, בסיס 24–48 שעות הנדסה בביטחון נמוך; 12 השלבים הראשיים טרם נסגרו. תפעול כשלי סריקה/תשובה לא ודאית ומחיקת S3 נכללים ב־C4.1.


### 17.7 R212 — Paddle Checkout, 11.09.2026

C3.1 מאומת מקומית: יצירת עסקה עמידה, בדיקת Owner, חתימת Webhook, שיוך באמצעות Transaction ID שמור ו־UI בשלוש שפות. W20 נשאר פתוח משום ש־C3.2 עדיין דורש אכיפת זכאות, Portal, רכישה חוזרת ו־Reconciliation תפעולי. C4.1 נשאר פתוח גם עבור W19. נותרו שתי חבילות פיתוח ובדיקות, אומדן בסיס 16–32 שעות הנדסה בביטחון נמוך ו־12 שלבים ראשיים. [פרטים](../paddle-checkout-runtime.md).

### 17.8 R213 — אכיפת זכאות, 11.09.2026

C3.2.1/C3.2.2 הושלמו מקומית עם מדיניות במסד ואכיפת API/Worker. W20 עדיין פתוח לניהול/ביטול, משלם משותף, רכישה חוזרת ו־Reconciliation. W19/C4.1 נשארים לביקורת ותפעול. נותרו 8 תתי־משימות ב־2 חבילות, בסיס 16–32 שעות הנדסה בביטחון נמוך ו־12 שלבים ראשיים. [פרטים](../paddle-paid-access-runtime.md).

### 17.9 R214 — ניהול מנוי ורכישה חוזרת, 11.09.2026

C3.2.3/C3.2.4 הושלמו מקומית: Portal עם אימות המשלם, Customer משותף עם Subscription נפרד לכל עסק ורכישה חדשה לאחר ביטול סופי מאומת. W20 עדיין פתוח לבירור תוצאות לא ודאיות/סתירות ולקבלה חיה; W19/C4.1 נשארים לביקורת ותפעול. נותרו 6 תתי־משימות בשתי חבילות; אומדן 12–24 שעות הנדסה בביטחון נמוך ו־12 שלבי השקה ראשיים. [תוכנית סיום](code-completion-plan-2026-09-11.md#9-r214--ניהול-מנוי-ורכישה-חוזרת-11092026).

### 17.10 R215 — שחזור Checkout ותיקוני Bot, 11.09.2026

W20 כולל כעת שחזור לפי מזהה מהתשובה המקורית וסגירת ניסיון שלא נשלח/עסקה שבוטלה, עם ראיות עמידות וללא POST כפול. C3.2.5 נשאר לבירור unknown ללא זהות ולסתירת מנוי. W19/C4.1.4 התקדם לכל הסכמה ולתיקוני נעילות; Fixture ספק היסטורי עדיין אינו עומד בדרישת גבול הספק. נותרו 6 תתי־משימות קוד ו־12 שלבים ראשיים; 12–24 שעות הנדסה בביטחון נמוך. [התוכנית הפעילה](code-completion-plan-2026-09-11.md#10-r215--שחזור-checkout-ותיקון-שילוב-postgresql-11092026).

### 17.11 R216 — פרסום AI לפי מוכנות Runtime, 11.09.2026

C4.1.1 הושלם מקומית: Worker מדווח ללא סודות, וה־API בודק מוכנות, זכאות, תקציב USD, אישור נציג ומקורות באותה טרנזקציה עם פרסום ו־Audit. W19 עדיין דורש טיפול תפעולי וקבלה חיה; W20 עדיין דורש בירור C3.2.5. נותרו 5 תתי־משימות קוד ו־12 שלבים ראשיים, באומדן 10–20 שעות הנדסה בביטחון נמוך. [התור המעודכן](code-completion-plan-2026-09-11.md#11-r216--פרסום-ai-לפי-תנאים-עדכניים-11092026).


## 17.12 R217 — בירור חיובים פרטי

W20/C3.2.5 הושלם מקומית: בירור תמיכה מתועד → הכנת פעולה → הרשאה לפי Login/עסק/סביבה → GET חוזר → הכרעה ו־Audit אטומיים. 47 תרחישי Paddle עברו בכל PostgreSQL 16/17. נדרשים עדיין חשבון ספק וקבלה חיה; W19 ממשיך לדרוש בירור AI/מסירה/העלאה. נותרו 4 תתי־משימות קוד ו־12 שלבי השקה, 8–16 שעות הנדסה בביטחון נמוך. [התוכנית הפעילה](code-completion-plan-2026-09-11.md#12-r217--סגירת-שחזור-paddle-תפעולי-11092026).


## 17.13 R218 — Retention למקורות Knowledge

W19/C4.1.3 הושלם מקומית: סגירה מנהלית ותקופת שמירה → בדיקת עיכוב משפטי → הצעה מוגבלת בזמן → פרישת מקור ויומן אטומי → מחיקת גרסת S3 המדויקת בהרשאה נפרדת. 26 תרחישי Knowledge עברו בכל PostgreSQL 16/17. קבלות ומידע שחולץ אינם נמחקים במסלול זה; C4.1.2 עדיין נדרש לתוצאות AI/מסירה/העלאה לא ודאיות. נותרו 3 תתי־משימות קוד ו־12 שלבי השקה, 7–14 שעות הנדסה בביטחון נמוך. [התוכנית הפעילה](code-completion-plan-2026-09-11.md#13-r218--סגירת-retention-לקובצי-ידע-11092026), [תפעול](../knowledge-object-retention.md).
