# 1. Connect — Canonical bootstrap mandate candidate

## 1.1 זהות ומעמד

1.1.1 `artifactId=CONNECT-CANONICAL-BOOTSTRAP-MANDATE-CANDIDATE-2026-08-29-G0`.

1.1.2 `artifactClass=PROPOSED-CANONICAL-MANDATE; NOT-A-USER-RECEIPT; NOT-ACCEPTED`.

1.1.3 המסמך מרכז לנוסח אחד את גבול העבודה העדכני שנצפה; הוא אינו מחליף את הודעות המשתמש ואינו טוען ל־raw transcript identity שאינה זמינה.

1.1.4 מקור העקיבות הוא `/Users/tal/Documents/connect/web/docs/planning/user-directive-and-source-precedence-ledger-2026-08-29.md`, ‏SHA-256=`b012a479b18e162f5f759b49e033eb3856a4637cc0e91a8a36f1d06043813342`.

1.1.5 `rawConversationExportRoot=unknown/unavailable`; אין להמציא Message ID, server timestamp או transcript digest.

# 2. מנדט העבודה המוצע לאישור exact-root עתידי

## 2.1 תוצאה נדרשת

2.1.1 להשלים Master Plan מלא, ממוספר, עקיב ובר־בדיקה עבור Connect לפני חזרה לפיתוח המוצר.

2.1.2 ה־Master Plan יכסה דרישות מוצר, ארכיטקטורה, נתונים, אבטחת סייבר, פרטיות, ספקים, WhatsApp, AI, Billing, אחסון, תפעול, בדיקות, Deployment, Release, Rollback ו־Post-GA lifecycle.

2.1.3 כל שלב, תת־שלב, משימה ותת־משימה יוגדרו בזהות נפרדת, Inputs, Outputs, Dependencies, Owner, Tests, Evidence, Exit, Failure, Recovery והערכת עבודה כאשר קיימים נתונים קבילים.

2.1.4 אין לפרסם אחוז, שעות, Critical path או ETA מדויקים לפני קבלת מכנה Tasks/Resources/Waits מתאים; הערך הבטוח בינתיים הוא `unknown/unavailable`.

## 2.2 פעולות שמותרות כעת

2.2.1 לקרוא ולנתח קבצי Workspace ומקורות שהמשתמש העמיד בהיקף.

2.2.2 לבצע מחקר אינטרנט עדכני ממקורות רשמיים ולהפריד עובדה, Recommendation, Decision, Live evidence ו־Unknown.

2.2.3 ליצור ולתקן מסמכי Planning בלבד בתוך Workspace באמצעות Successor generations.

2.2.4 לבצע QA מכני, ביקורות עצמאיות, Threat modeling, Comparison ו־Reconciliation על Planning artifacts קפואים.

2.2.5 להפעיל Agents לביקורות ומשימות תכנון עצמאיות בלי להרחיב את גבול הסמכות.

2.2.6 לקרוא מצב Git/GitHub ו־Provider באופן Read-only כאשר נדרש לתכנון ואינו חושף Secret.

## 2.3 פעולות שאסורות עד Gate29 והוראה חדשה

2.3.1 כתיבה או שינוי של Product code, Runtime configuration, Database schema/data או Production artifact.

2.3.2 Build, Runtime test, Migration, Release, Cutover, Rollback או Deployment.

2.3.3 Git add, Commit, Merge, Push, Tag, Release או Package publication.

2.3.4 שינוי GitHub repository settings, Rulesets, Branch protection, Actions, Secrets, Collaborators או Visibility.

2.3.5 חיבור, שינוי או שימוש ב־Provider account, API credential, Meta/WhatsApp asset, Billing, Storage, AI, Monitoring או Deployment platform.

2.3.6 Purchase, subscription, paid resource, Legal approval, financial commitment או פעולה בשם אדם אחר.

2.3.7 שימוש ב־Secret, PII, Customer data או private operational Evidence בתוך Artifact שמיועד למאגר Public.

## 2.4 החלטות מוצר מחייבות שאינן היתר יישום

2.4.1 ה־Client העיקרי הוא React Web; Windows Forms מוחרג.

2.4.2 חיבור WhatsApp יהיה דרך Meta WhatsApp Business Platform הרשמי; Automation לא־רשמי מוחרג.

2.4.3 מאגר המקור הקנוני של Connect חייב להישאר Public; מעבר ל־Private אינו פתרון אבטחה מותר.

2.4.4 Public מחייב הקשחה, Secret prevention, least privilege, protected change path, supply-chain controls ו־Evidence שאינו ציבורי כאשר נדרש.

2.4.5 טל הוא בעל מחקר Rate limiting ומגבלות WhatsApp/Connect; כל מגבלה מספרית תסומן לפי Source, date, account scope ו־live verification.

2.4.6 Research recommendations של Codex הן Planning selections בלבד עד אישור Domain מתאים, entitlement, live evidence ו־Task accepted.

## 2.5 כללי בטיחות ואיכות

2.5.1 אין להמציא API, Endpoint, Library, Date, Data, Identity, Approval, Limit, Capacity, Cost, Evidence או Test result.

2.5.2 Missing או Unverified נשמר `unknown/unavailable` ומייצר Decision, ExternalWait או Blocker לפי ההקשר.

2.5.3 אין להשתמש ב־Mock, Demo, Sample או Synthetic business data ללא בקשה מפורשת.

2.5.4 אין להשתמש ב־`Math.random` לשום מטרה.

2.5.5 אין להשתמש ב־`crypto.randomUUID` ללא אישור X24 ייעודי למקרה שימוש מדויק.

2.5.6 כל Byte change לאחר Freeze יוצר Successor root וביקורות חדשות; אין Patch in place ל־Subject reviewed/accepted.

2.5.7 P0/P1 פתוח חוסם; אין Auto-close, Merge, downgrade או Risk acceptance ללא חוזה מפורש וראיה מתאימה.

2.5.8 כל תשובת עבודה למשתמש מסתיימת בהמלצה לרמת Reasoning של ההודעה הבאה; ברירת המחדל הנוכחית היא Ultra.

## 2.6 גבול Bootstrap B0

2.6.1 מנדט זה רשאי להסמיך B0 רק עבור Control-sequence successor, Recovery baseline, ReviewInputFreeze, Raw-review custody, Bootstrap lifecycle successor ו־Review Protocol successor.

2.6.2 כל Bootstrap Act דורש Permit חד־ניסיוני, exact roots, Actor appointment, Scope, Time, Expiry ו־Evidence; אין Wildcard authority.

2.6.3 B0 אינו Master Acceptance, אינו Gate29, אינו Gate30 ואינו Implementation instruction.

2.6.4 לאחר קבלת Review Protocol, כל Subject מאוחר משתמש ב־Protocol accepted ולא ב־Bootstrap Protocol.

## 2.7 תנאי מעבר חזרה לפיתוח

2.7.1 Source Universe, Requirement/Decision Universe, TRD-2 Definition, Program Task registry, Crosswalks, Resources, Schedules, Public-hardening specification ו־Master root חייבים להשלים את מחזורי QA/Review/Reconciliation/Acceptance שלהם.

2.7.2 טל ו־Domain authorities הנדרשים מאשרים את ה־Master exact root, Evidence, Reviews, Reconciliation ו־Vetoes.

2.7.3 Gate29 עובר protected CAS ושתי קריאות Readback תואמות.

2.7.4 נוצר PlanningHandoffReceipt ולאחריו מתקבלת הוראת יישום חדשה המוגבלת ל־Task slice מדויק.

2.7.5 לפני Push נדרש PublicRepositoryHardeningGate חי, Permit ל־diff מדויק ושתי קריאות Remote readback; Public visibility נשמרת.

# 3. Acceptance contract

## 3.1 Exact-root approval

3.1.1 לאחר Freeze יפורסמו Path, SHA-256, line count ו־byte count של Candidate זה.

3.1.2 טל יתבקש לאשר או לדחות את אותו Root מדויק; אישור Root אחר או נוסח כללי אינו Receipt למסמך זה.

3.1.3 Receipt יקשור Subject root, Scope, exclusions, authority epoch, `notBefore`, ‏`validThrough` ו־revocation semantics.

3.1.4 validity duration ו־Actor appointments עדיין `unknown/unavailable` ולא יומצאו לפני החלטה/ראיה.

3.1.5 עד Receipt תקף: `CanonicalMandate=PROPOSED`, ‏`B0=ABSENT`, ‏`Gate29=BLOCKED`, ‏`developmentFreeze=ACTIVE`.
