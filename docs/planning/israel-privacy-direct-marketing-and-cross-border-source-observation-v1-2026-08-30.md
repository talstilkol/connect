# 1. Connect — מפת מקור וחסמים: פרטיות, דיוור, WhatsApp והעברת מידע מישראל v1

## 1.1 זהות, מטרה ומגבלת טענה

1.1.1 `artifactId=CONNECT-ISRAEL-PRIVACY-DIRECT-MARKETING-CROSS-BORDER-SOURCE-OBSERVATION-V1-2026-08-30`.

1.1.2 research cutoff=`2026-08-30 Asia/Jerusalem`.

1.1.3 repository=`PUBLIC`;Gate29=`BLOCKED`;development freeze=`ACTIVE`.

1.1.4 מטרת המסמך היא לבנות מסלול החלטה ובדיקת ציות עבור Connect; הוא אינו ייעוץ משפטי ואינו קובע ש־Connect עומדת בדין.

1.1.5 exact legal applicability=`unknown/unavailable`;legal conclusions accepted=`0`;lawyer approvals=`0`;operational evidence=`0`.

1.1.6 source policy=`חוק או תקנות עדכניים ומאוחדים > פרסום רשמי ברשומות > הנחיה סופית של הרשות > שאלות ותשובות או כלי רשמי > מסמך מגזרי > תוצאת חיפוש`.

1.1.7 תוצאת חיפוש, כותרת, תקציר או URL אינם Source capture קביל בלי bytes, תאריך, SHA-256, סוג סמכות ו־freshness rule.

1.1.8 לא בוצעו שינוי Product, Build, runtime test, Git/GitHub/provider mutation, שליחת הודעה, רכישת שירות, עיבוד מידע לקוח או החלטה משפטית בשם החברה.

# 2. ההיגיון למתחילים

## 2.1 חמש שאלות שונות שעלולות להיראות כמו שאלה אחת

2.1.1 `פרטיות`: האם מותר לאסוף, לשמור, לסווג ולהשתמש במידע על האדם למטרה המסוימת.

2.1.2 `דיוור ישיר`: האם הפנייה מבוססת על השתייכות האדם לקבוצה או על אפיון שלו, ומהן חובות המקור, הזיהוי והמחיקה.

2.1.3 `דבר פרסומת`: האם אופן ותוכן הפנייה כפופים לסעיף 30א לחוק התקשורת ומהי ההסכמה או החריג הנדרשים.

2.1.4 `WhatsApp`: האם Meta מתירה את הפנייה, ה־Template, התוכן, חלון השירות וסטטוס החשבון.

2.1.5 `סמכות הלקוח`: האם ה־Tenant שהורה ל־Connect לשלוח הוא בעל סמכות מוכחת להשתמש במידע ובערוץ למטרה זו.

2.1.6 מעבר באחת מהשאלות אינו מעביר את האחרות. החלטת שליחה תקינה היא AND בין כל הצירים החלים.

## 2.2 שרשרת ההוכחה

2.2.1 `Current law/source→Connect applicability facts→lawyer disposition→control requirement→implementation task→negative test→live evidence→independent review→release-bound acceptance`.

2.2.2 הסכמה כללית, Checkbox ללא נוסח קפוא, רשימת טלפונים או אישור Meta לבדם אינם שרשרת הוכחה.

2.2.3 כאשר ציר אחד חסר, סותר, פג או לא ניתן לשחזור, `effectiveSendAllowance=0` עבור הפעולה הרלוונטית.

# 3. מרשם מקורות רשמיים שנצפו

## 3.1 חוק הגנת הפרטיות ותיקון 13

3.1.1 [מאגר החקיקה הלאומי — חוק הגנת הפרטיות](https://main.knesset.gov.il/Activity/Legislation/Laws/pages/lawprimary.aspx?lawitemid=2000234) הוא נקודת הכניסה להיסטוריית החוק והתיקונים.

3.1.2 [פרסום תיקון 13 ברשומות](https://www.gov.il/BlobFolder/reports/13_amendment/he/%D7%AA%D7%99%D7%A7%D7%95%D7%9F%2013%20-%20%D7%A4%D7%A8%D7%A1%D7%95%D7%9D%20%D7%91%D7%A1%D7%A4%D7%A8%20%D7%94%D7%97%D7%95%D7%A7%D7%99%D7%9D.pdf) הוא מקור ראשוני לתיקון שהתקבל ב־05.08.2024 ופורסם ב־14.08.2024.

3.1.3 [שאלות ותשובות רשמיות לתיקון 13](https://www.gov.il/he/pages/tikun13_qa?chapterIndex=6) נצפו עם פרסום 14.08.2025 ועדכון 18.08.2025; הן מתארות הגדרה רחבה של מידע אישי ועיבוד, שינוי חובות רישום ואכיפה מורחבת.

3.1.4 מקור שאלות ותשובות הוא הסבר רגולטורי, לא תחליף לנוסח החוק המאוחד או לחוות דעת על עובדות Connect.

## 3.2 DPO, רישום והודעה

3.2.1 [גילוי הדעת הסופי על מינוי DPO](https://www.gov.il/he/pages/amendment-13-26-07-26) פורסם ב־26.07.2026 ועודכן ב־27.07.2026 לפי דף הרשות.

3.2.2 [מרכז המידע הרשמי ל־DPO](https://www.gov.il/he/Departments/targetaudience/dpo) מציג חומרי עבודה והנחיות המתעדכנים לאורך זמן.

3.2.3 [שירות חובת הודעה על מאגר](https://www.gov.il/he/service/notice-obligation) מתאר את המסלול למאגר הכולל מידע בעל רגישות מיוחדת בהיקף המשמעותי הקבוע בחוק.

3.2.4 `Connect חייבת DPO`, `Connect חייבת רישום` ו־`Connect חייבת הודעה` נשארות שלוש שאלות נפרדות; אין להסיק תשובה מאופי המוצר בלבד.

3.2.5 נדרשים עובדות על הישות המשפטית, מטרת העיסוק, תפקידי בעל שליטה ומחזיק, סוגי מידע, מספר נושאי מידע, ניטור, מסירה לאחר ושירותי דיוור ישיר.

## 3.3 תקנות אבטחת מידע

3.3.1 [המדריך הרשמי לתקנות הגנת הפרטיות — אבטחת מידע](https://www.gov.il/he/pages/data_security_guide?chapterIndex=9) נצפה עם עדכון 07.02.2023.

3.3.2 [שאלות ותשובות רשמיות לתקנות](https://www.gov.il/he/pages/data_security_fqa?chapterIndex=1) מדגישות שהתקנות יכולות לחול גם על מאגר המבוסס על מקורות פומביים.

3.3.3 רמת האבטחה המדויקת של כל מאגר Connect היא `unknown/unavailable`; היא חייבת להיגזר ממסמך הגדרות מאגר ועובדות חיות, לא מבחירת ארכיטקטורה בלבד.

3.3.4 דרישות כגון ניהול הרשאות, הדרכה, תיעוד, ביקורות, אירועים, גיבוי, התקנים, ספקים ותקשורת הופכות ל־Controls רק אחרי מיפוי לרמה ולתפקיד המדויקים.

## 3.4 דיוור ישיר ושירותי דיוור ישיר

3.4.1 [הנחיית הרשות 2/2017 בנוסח מעודכן בעקבות תיקון 13](https://www.gov.il/BlobFolder/legalinfo/direct_mail_2/he/DirectMail_Tikon13.pdf) היא המקור הרגולטורי המרכזי שנצפה לפרשנות הרשות.

3.4.2 ההנחיה מסבירה שדיוור ישיר נוגע גם לפגיעה האפשרית בפרטיות באמצעות סיווג אדם לקבוצה, ולא רק לעצם ההטרדה שבהודעה.

3.4.3 [לומדת הדיוור הישיר של משרד המשפטים](https://content.justice.gov.il/Guides/Privacy/DirectMail/story.html) היא חומר הסבר; היא אינה גוברת על החוק או על ההנחיה המעודכנת.

3.4.4 exact classification של כל Campaign כ־`דיוור ישיר`, `שירותי דיוור ישיר`, שניהם או אף אחד מהם=`unknown/unavailable` עד בחינת מקור הרשימה, האפיון, מטרת הפנייה ותפקיד Connect מול ה־Tenant.

3.4.5 מסמך מגזרי, לרבות מסמך בחירות, אינו מקור כללי אוטומטי למוצר מסחרי.

## 3.5 חוק התקשורת ודבר פרסומת

3.5.1 [מאגר החקיקה הלאומי — חוק התקשורת](https://main.knesset.gov.il/activity/legislation/laws/pages/LawPrimary.aspx?lawitemid=2000002&st=lawlaws) נצפה כחוק תקף; הדף מציג היסטוריית תיקונים ואינו לבדו חוות דעת על WhatsApp.

3.5.2 [תיקון 66](https://main.knesset.gov.il/apps/legislation/main/bills/563438) מתאר כלל לאחר סיום עסקה מתמשכת, אך אינו נוסח מאוחד מלא של סעיף 30א.

3.5.3 תוצאות חיפוש והצעות חוק אינן משמשות להכרעה. נדרש capture של נוסח סעיף 30א המאוחד והתקף במועד ההקפאה.

3.5.4 exact classification של WhatsApp Template, הודעת שירות, הודעת AI, תזכורת, קבלה, הצעה, תרומה או Campaign כ־`דבר פרסומת`=`unknown/unavailable` עד Legal matrix לפי תוכן, מטרה, יוזם, נמען, ערוץ ונסיבות.

3.5.5 ההנחה הבטוחה למוצר היא שאין לשלוח הודעה עסקית יזומה בלי Basis מאושר ומתועד; ההנחה אינה מוצגת כפרשנות משפטית סופית.

## 3.6 מדיניות WhatsApp Business

3.6.1 [מדיניות WhatsApp Business Messaging](https://business.whatsapp.com/policy/) נצפתה כמקור בעל הפלטפורמה.

3.6.2 המדיניות דורשת שלעסק יהיו מספר הטלפון של האדם וגם Opt-in לקבלת הודעות מאותו עסק ב־WhatsApp, ודורשת לכבד הפסקה או Opt-out.

3.6.3 המדיניות קובעת שעסק יכול לפתוח שיחה בפלטפורמה באמצעות Template מאושר, ושמחוץ לחלון שירות הלקוחות החל יש להשתמש ב־Template בהתאם למדיניות הנוכחית.

3.6.4 Meta מטילה על העסק את האחריות להודעות, להסכמות ולדין; אישור Template אינו אישור משפטי.

3.6.5 Meta יכולה לעדכן מדיניות ולהגביל חשבון; לכן נדרש capture תקופתי וגם readback חי של WABA, Template, quality, category, permission ו־limit לפני שליחה.

## 3.7 העברה מחוץ לישראל וספקי ענן

3.7.1 [גילוי דעת רשמי על תקנה 2(4)](https://www.gov.il/en/pages/article-2-4) פורסם לפי דף הרשות ב־2026 ומתייחס להתחייבות חוזית של מקבל המידע בחו״ל.

3.7.2 [כלי ה־DPIA הרשמי](https://mojforms.justice.gov.il/mojaemprivacyprotectionauthority/dpiaform.html) מפנה לתקנות העברת מידע לחו״ל, להתחייבות מקבל המידע ולבדיקת בסיס ההעברה.

3.7.3 כלי ה־DPIA מצהיר שאינו רשימה ממצה ואינו חוות דעת משפטית; תוצאה בו אינה Acceptance.

3.7.4 לכל ספק נדרש מיפוי של הישות החוזית, Region, תת־מעבדים, מטרות, Data classes, Access locations, Support access, onward transfers, retention, deletion ו־contractual safeguards.

3.7.5 בחירת Region באירופה או בישראל אינה לבדה הוכחת ציות; אנשים, גיבויים, Telemetry ותתי־מעבדים עשויים ליצור העברות נוספות.

## 3.8 מידע שהגיע מהאזור הכלכלי האירופי

3.8.1 [שאלות ותשובות רשמיות לתקנות מידע שהועבר מה־EEA](https://www.gov.il/he/pages/europe_transfer?chapterIndex=8) מתארות חובות נוספות ובהן מחיקה, צמצום מידע שאינו נחוץ, דיוק ויידוע עבור מידע שבתחולה.

3.8.2 תחולת התקנות על Connect=`unknown/unavailable` עד שמוכח מקור גאוגרפי ומשפטי של כל Data flow.

3.8.3 `Israel-first` אינו מוכיח שאין מידע שהגיע מה־EEA; נדרשת חסימת Scope או Evidence של מקור הנתונים.

## 3.9 אירוע אבטחה חמור

3.9.1 [טופס הדיווח הרשמי](https://mojforms.justice.gov.il/mojaemprivacyprotectionauthority/databreachupdate.html) מיועד לדיווח ראשוני ומיידי על אירוע אבטחה חמור כהגדרתו בתקנות.

3.9.2 [שירות דיווח הסייבר הלאומי](https://www.gov.il/he/service/cyber-event-report) מבהיר שדיווח למערך אינו מחליף דיווח לרגולטור אחר כאשר קיימת חובה.

3.9.3 classification, recipients and deadline לכל Incident חייבים Decision tree משפטי־תפעולי; `דיווח למערך` ו־`דיווח לרשות` אינם אותו Terminal.

# 4. מודל החלטת שליחה מחייב לתכנון

## 4.1 מפת ה־AND

4.1.1 `Gate 1 — Identity`: ה־Tenant, הישות השולחת וה־WABA מזוהים ומורשים.

4.1.2 `Gate 2 — Recipient source`: מקור המספר ושרשרת הרכישה או האיסוף ידועים ומותרים.

4.1.3 `Gate 3 — Purpose`: מטרת האיסוף המקורית ומטרת ההודעה קפואות ותואמות או בעלות Basis חדש מאושר.

4.1.4 `Gate 4 — Privacy/direct-mail`: סיווג פרטיות ודיוור ישיר עבר Legal disposition.

4.1.5 `Gate 5 — Communications law`: סיווג סעיף 30א והסכמה או חריג עבר Legal disposition.

4.1.6 `Gate 6 — Meta`: Opt-in, Template/category, window, content, quality, permission ו־live limits עברו.

4.1.7 `Gate 7 — Suppression`: אין Opt-out, block, complaint, legal hold conflict או instruction שאוסר שליחה.

4.1.8 `Gate 8 — Rate and safety`: Connect cap וכל מגבלות הספק החיים עברו; כל Unknown מחזיר allowance אפס.

4.1.9 `Gate 9 — Human authority`: פעולה עם סיכון, AI side effect או Campaign דורשת Role והרשאה לפי מדיניות Pilot.

4.1.10 `Gate 10 — Evidence`: לכל Gate יש root-bound evidence שאינו פג ואפשר לשחזרו.

4.1.11 terminal חוקי לשליחה=`SEND-PERMITTED-FOR-ONE-EXACT-MESSAGE-ATTEMPT`; ההיתר חד־פעמי, קשור לתוכן, לנמען, ל־Tenant, ל־WABA, לזמן ול־idempotency key.

4.1.12 כל מצב אחר מסתיים ב־`NO-SEND` עם reason code; אין coercion מ־Unknown ל־Pass ואין Retry עיוור.

## 4.2 הפרדת סוגי הודעות

4.2.1 נדרש Message-purpose Registry סופי: `authentication;transactional;service;support-reply;utility;marketing;survey;AI-generated;legal-notice;security-notice;unknown`.

4.2.2 שמות אלה הם סוגי תכנון בלבד; הם אינם זהים אוטומטית לקטגוריות משפטיות או לקטגוריות Meta.

4.2.3 לכל Purpose נדרשים `legal classification`, `Meta category`, `allowed initiators`, `consent scope`, `window rule`, `template rule`, `opt-out treatment`, `retention`, `human approval` ו־`safe state`.

4.2.4 `unknown` אינו סוג שמותר לשלוח.

# 5. עובדות תחולה שחייבים לאסוף

## 5.1 ישות, שירות ולקוחות

5.1.1 שם הישות המשפטית שתפעיל את Connect, מדינת ההתאגדות, כתובת, אנשי קשר ובעלי תפקידים=`unknown/unavailable`.

5.1.2 האם Connect רק מעבדת הוראות Tenant, קובעת מטרות בעצמה, מוכרת מידע, מספקת שירותי דיוור ישיר או משלבת תפקידים=`unknown/unavailable`.

5.1.3 נדרש role matrix נפרד לכל Flow; Label אחד לכל החברה אינו מספיק.

5.1.4 לכל Tenant נדרשים contract, instructions, permissible purposes, data ownership, subprocessor authority, deletion/export duties ו־incident contacts.

## 5.2 People ו־Data

5.2.1 נדרש Data inventory נגזר מהמערכת: משתמשי צוות, אנשי קשר, נמענים, לקוחות קצה, לידים, עובדים, אנשי תמיכה וספקים.

5.2.2 לכל Subject class נדרשים Data fields, מקור, מטרה, sensitivity, scale, geography, legal basis, access, sharing, retention, deletion ו־rights route.

5.2.3 Password, token, message content, attachment, AI prompt/context/output, profile inference, location, health, payment ו־support data חייבים Data classes נפרדים כאשר מחזור החיים או הסיכון שונים.

5.2.4 מספר נושאי המידע והיקף העיבוד אינם ניחוש; הם נמדדים ב־live inventory עם snapshot root.

## 5.3 Profiling ו־AI

5.3.1 כל סיווג, scoring, segmentation, recommendation, summarization או agent decision נבדק לשאלה אם הוא יוצר או משתמש בפרופיל של אדם.

5.3.2 רמת עצמאות AI מאושרת כרגע=`agent-approval-only`;אין סמכות ל־AI לשלוח, למחוק, לחייב, לשנות consent או לעקוף suppression.

5.3.3 שימוש ב־OpenAI Responses API נשאר מותנה ב־DPA, Region/transfer review, retention controls, subprocessor map, allowed Data classes, redaction, evaluation ו־human approval.

# 6. Consent ו־Preference Evidence

## 6.1 Consent record מחייב

6.1.1 required fields=`subject/recipient identity,tenant,sender business,channel,purpose categories,notice version,exact consent text,collection surface,affirmative action,timestamp,time basis,source system,evidence root,withdrawal route,status,expiry if applicable`.

6.1.2 אין לשמור Secret או מידע עודף במסמך Public; ה־schema ציבורי וה־Evidence האישי נשמר רק ב־private operational store מאושר.

6.1.3 Import של CSV, WordPress database או רשימת אבא אינו מוכיח Consent; נדרשת evidence migration ומצב Unknown עד הכרעה.

6.1.4 Consent אינו מורחב אוטומטית בין עסקים, Tenants, Channels, Purposes או Message categories.

6.1.5 Consent שנמשך, הוכחש, פג או אינו ניתן להוכחה אינו מאפשר שליחה.

## 6.2 Opt-out ו־Suppression

6.2.1 Opt-out בכל ערוץ מוכר חייב לעצור את הקטגוריות והערוצים שעליהם הוא חל לפני ה־dispatch הבא.

6.2.2 Suppression record שומר רק את המינימום הנדרש כדי לא ליצור קשר מחדש; מחיקה עיוורת של כל הראיה עלולה להחזיר אדם לרשימה.

6.2.3 נדרש reconciliation אטומי בין Contact store, Campaign audience, queue, retry, template job, export, backup ו־AI context.

6.2.4 הודעה שכבר ב־provider state אינה מסומנת כ־unsent; המערכת מתעדת outcome ולא מזייפת Rollback חיצוני.

6.2.5 Opt-out Terminal חזק יותר מ־Campaign scheduling; Retry לא יכול לעקוף אותו.

# 7. זכויות נושאי מידע ושקיפות

## 7.1 Notice

7.1.1 לכל איסוף נדרש Notice versioned שמכסה את הפרטים המחייבים לפי הדין החל והעובדות המדויקות.

7.1.2 Notice חייב להתאים ל־Tenant role ול־Connect role; אין להשתמש ב־Privacy policy כללית כדי להסתיר זהות בעל שליטה או מטרות שונות.

7.1.3 שינוי מטרה, ספק, AI use, recipient class או cross-border path מפעיל Notice and consent applicability review.

## 7.2 Access, correction, deletion and objection

7.2.1 נדרש Intake מאומת, tenant routing, identity verification proportional to risk, search across all stores, response approval, delivery proof ו־Audit.

7.2.2 מחיקה אינה מבוצעת אם קיימת Legal Hold חוקית; Hold אינו היתר לשימוש חדש או לשליחה.

7.2.3 Backup אינו מוחק מיד בהכרח; נדרש documented restore-time suppression כדי שמידע שנמחק לא יקום לתחייה לשימוש פעיל.

7.2.4 Conflict בין זכות, חובת שמירה, dispute, billing, security log ו־suppression מקבל Legal disposition ספציפי, לא כלל Retention יחיד.

# 8. Retention ו־Legal Hold

## 8.1 Data-class matrix

8.1.1 כל Data class מקבל `purpose,start trigger,retention period,end trigger,authorized exceptions,legal hold behavior,deletion method,backup behavior,evidence,owner,reviewer`.

8.1.2 אין לערבב message body, delivery receipt, consent proof, suppression token, security log, invoice, AI trace, attachment ו־backup תחת Lifecycle יחיד.

8.1.3 exact periods=`unknown/unavailable` עד Legal, Product, Security ו־Finance approval; מספרים ממסמך ישן אינם מועתקים אוטומטית.

8.1.4 Retention plan מחייב ID, policy version, digest, קצר־תוקף, cutoff וזהויות ספק מאושרות; deletion effect אטומי מוגבל לתוכנית.

8.1.5 post-delete query הוא Audit בלבד ולא Safety barrier.

# 9. ספקים והעברה בינלאומית

## 9.1 Provider transfer matrix

9.1.1 providers in current decisions=`Vercel;Railway;Railway PostgreSQL;Railway Redis/BullMQ;AWS S3/KMS/GuardDuty;OpenAI;Meta/WhatsApp;Clerk;Better Stack;Stripe;Paddle;file scanner unknown`.

9.1.2 הופעת ספק ברשימה אינה אומרת שהופעל, נרכש, נבחר סופית או קיבל מידע.

9.1.3 לכל ספק נדרשים `contracting entity,DPA,service terms,role,processing purpose,data classes,regions,subprocessors,support locations,onward transfer,retention,deletion,security,incident notice,audit rights,exit/export,cost owner,legal approval`.

9.1.4 Region, DPA או subprocessor list חסרים מחזירים את Data flow ל־`OFF`.

9.1.5 Stripe ו־Paddle נשארים Adapters dormant; Billing remains off. File-scanner provider and Object-storage account identities remain unresolved operationally.

## 9.2 Public repository boundary

9.2.1 אין לפרסם contracts, DPA exhibits, account IDs, WABA IDs, phone numbers, access tokens, customer evidence, recipient data או private legal advice.

9.2.2 Public artifact כולל schemas, decision IDs, redacted evidence roots ו־status בלבד.

9.2.3 חסר private evidence store מאושר הוא Blocking; אין להעתיק Evidence פרטי למאגר Public כדי לסגור ביקורת.

# 10. Incident, breach and regulatory response

## 10.1 Incident decision record

10.1.1 required fields=`incidentId,discovery time,facts known,systems,subjects,data classes,environment,tenant,unauthorized action,scope confidence,containment,evidence custody,legal classifiers,regulator/customer/subject routes,decision owners,deadlines,updates,closure`.

10.1.2 `suspected` אינו coerced ל־`no breach`; uncertainty נשמרת ומפעילה escalation.

10.1.3 evidence collection חייב לשמור chain of custody, clock source, immutable root ו־access log.

10.1.4 דיווח מוקדם אינו מחכה ל־Root cause מלא כאשר הדין דורש תגובה מיידית; exact trigger and recipient require legal runbook.

10.1.5 tabletop בלבד אינו מוכיח יכולת דיווח; נדרש Rehearsal עם בעלי תפקידים, טפסים, ערוצים ו־time evidence.

# 11. Pilot safe state

## 11.1 גבול Pilot מאושר עקרונית

11.1.1 Pilot=`single-tenant closed pilot`;market=`Israel direct SMB`;language=`Hebrew-first`;AI=`approval-only`.

11.1.2 שימוש בנכסי האב אפשרי רק אחרי הוכחת בעלות או הרשאה, הסכם תפקידים, Consent provenance, WABA approval ו־Legal approval; Credentials לבדם אינם סמכות.

11.1.3 bulk campaigns, recurring campaigns, imported unverified audiences, autonomous AI send, production billing and unrestricted uploads=`OFF`.

11.1.4 Test recipient חייב להיות אדם אמיתי שהסכים במפורש למבחן המסוים; אין ליצור פרטי אדם מדומים או להשתמש במספר שלא נמסר כדין.

11.1.5 לכל הודעת Pilot נדרש one-message Permit, human approval, valid template/window, live allowance, no suppression, audit receipt and provider outcome.

11.1.6 Pilot אינו נפתח עד שכל Legal/Meta/Privacy blockers עבור ה־Flow המדויק סגורים; אישור Flow אחד אינו אישור לכל המוצר.

# 12. חבילת שאלות ליועץ משפטי

## 12.1 עובדות לפני שאלות

12.1.1 יש לספק תרשים ישויות, חוזים, ארכיטקטורה, Data flows, Message purposes, Consent surfaces, Provider matrix, Retention matrix, rights workflow ו־incident plan.

12.1.2 אין לבקש חוות דעת כללית על "המערכת" בלי להקפיא Flow, Actor, Data, Purpose, Region ו־Message.

## 12.2 שאלות מחייבות disposition

12.2.1 מהו תפקיד Connect ומהו תפקיד ה־Tenant בכל Flow: בעל שליטה, מחזיק, ספק משנה או תפקיד משולב.

12.2.2 אילו פעולות הן דיוור ישיר ואילו הן שירותי דיוור ישיר לפי העובדות.

12.2.3 אילו Message purposes הם דבר פרסומת ומהו Basis המותר לכל ערוץ ונסיבות.

12.2.4 האם ומתי נדרשים DPO, רישום מאגר או הודעה לרשות.

12.2.5 מהי רמת אבטחת המידע החלה על כל מאגר ומהם Controls מחייבים.

12.2.6 אילו Notices, Consents, source disclosures, identity statements, opt-out and deletion paths נדרשים.

12.2.7 מהו בסיס ההעברה לכל ספק או תת־מעבד מחוץ לישראל ואילו התחייבויות חוזיות נדרשות.

12.2.8 האם תקנות מידע שהועבר מה־EEA חלות על Flow כלשהו וכיצד מבודדים Scope.

12.2.9 אילו Retention periods ו־Legal Hold exceptions חלים על כל Data class.

12.2.10 מהם triggers, recipients and timing למסירת דיווח על Incident לכל צד.

12.2.11 אילו מסמכים וראיות מותר לשמור במאגר Public, ומה חייב להישאר במאגר פרטי.

12.2.12 מהן מגבלות Pilot עם WABA והמידע הקיימים של האב.

## 12.3 צורת תשובה נדרשת

12.3.1 כל תשובה מקבלת `questionId,frozen facts,authority,analysis,disposition,conditions,prohibited cases,expiry,change triggers,lawyer identity,signature/date,evidence root`.

12.3.2 תשובת Email כללית בלי facts root, expiry ו־change triggers אינה Release authority.

# 13. תוכנית ביצוע משפטית־טכנית

## 13.1 שלבים 1–6

13.1.1 שלב 1 — ללכוד bytes רשמיים ועדכניים של החוק, התקנות, הנחיות הרשות ומדיניות Meta; לחשב SHA-256 ולתעד סמכות ותוקף.

13.1.2 שלב 2 — להקפיא Legal Source Registry עם conflict, supersession and freshness rules.

13.1.3 שלב 3 — להקפיא Entity, Actor, Role, Data, Flow, Purpose, Provider ו־Region universes.

13.1.4 שלב 4 — להפיק applicability questionnaire בלי תשובות מומצאות ולהשלים אותו עם רועי, דוד, ראשה, טל והישות המשפטית.

13.1.5 שלב 5 — להפיק controller/holder/processor matrix ו־direct-mail/communications/Meta classification matrix לכל Flow.

13.1.6 שלב 6 — להעביר את חבילת העובדות ליועץ ישראלי מוסמך ולקבל dispositions חתומים ומוגבלי תוקף.

## 13.2 שלבים 7–12

13.2.1 שלב 7 — לתרגם כל disposition ל־Control, owner, test, evidence, safe state and release gate.

13.2.2 שלב 8 — להגדיר Consent/Notice/Preference/Suppression schemas והגירת Evidence קיימת בלי להעניק Import credit.

13.2.3 שלב 9 — להגדיר rights, retention, legal-hold, backup-resurrection and incident workflows.

13.2.4 שלב 10 — להשלים Provider/DPA/subprocessor/transfer matrix; Flow ללא ראיה נשאר OFF.

13.2.5 שלב 11 — לבנות test plan שלילי: consent חסר, purpose mismatch, stale template, opt-out race, duplicate retry, cross-tenant source, expired legal decision, unknown region and restored deleted data.

13.2.6 שלב 12 — לבצע ביקורת Legal עצמאית וביקורת Security/Privacy עצמאית; ליישב כל Finding בלי merge או suppression סמוי.

## 13.3 שלבים 13–15

13.3.1 שלב 13 — להפיק Pilot Permit ל־Flow המדויק בלבד, קשור לגרסה, WABA, Tenant, recipient class, Message purpose, source roots and expiry.

13.3.2 שלב 14 — לאחר הסרת freeze בלבד, לממש Controls, להריץ Tests ולאסוף live operational evidence.

13.3.3 שלב 15 — לבצע exact-root acceptance, Gate29 reassessment ולאחריו Gate30 נפרד; אין קיצור דרך מ־Legal plan ל־Production.

# 14. תנאי קבלה ומצב נוכחי

## 14.1 Acceptance predicate

14.1.1 official source captures current and digest-bound=`100%` עבור כל מקור חלות.

14.1.2 facts universes complete=`100%`;unknown critical fact=`0`.

14.1.3 every Flow has legal roles, privacy basis, direct-mail disposition, communications-law disposition, Meta disposition, transfer disposition, retention and incident routes.

14.1.4 every permitted Message has valid consent/basis, no suppression, live provider state, exact human authority and reproducible evidence.

14.1.5 open planning P0/P1=`0`;independent Legal and Security reviews=`PASS`;exact-root Tal approval present.

14.1.6 Public repository secret/privacy boundary=`PASS`;private evidence is never copied to Public.

14.1.7 Gate29 and Gate30 remain separate and both are fail-closed.

## 14.2 Current zero ledger

14.2.1 official-source groups observed=`9`;accepted captured source groups=`0/9`.

14.2.2 entity/role facts accepted=`0`;Data-flow legal dispositions=`0`;Message-purpose legal dispositions=`0`.

14.2.3 DPO/registration/notice determinations=`0`;Provider transfer approvals=`0`;Pilot Permits=`0`.

14.2.4 exact legal completion percentage, person-hours and ETA=`unknown/unavailable` until Tasks, owners, lawyer availability and review calendars are frozen.

14.2.5 legal and policy safe state=`NO-SEND`;WhatsApp numerical allowance unknown=`0`;AI side effects=`OFF`.

14.2.6 Gate29 blocked;Gate30 not reached;development freeze active;repository remains `PUBLIC`;Public Push Permit absent.
