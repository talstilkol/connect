# 1. Connect — ביקורת עוינת למטריצת עקיבות אפיון המוצר

1.1 תאריך הביקורת: `2026-08-29`.

1.2 Artifact ID: `CONNECT-PRODUCT-SPECIFICATION-TRACEABILITY-ADVERSARIAL-AUDIT-2026-08-29`.

1.3 סטטוס: `PLANNING-ONLY; PRODUCER-MATERIALIZED; NOT-INDEPENDENTLY-REVIEWED; NOT-ACCEPTED`.

1.4 יעד הביקורת הוא `TR=/Users/tal/Documents/connect/web/docs/product-specification-traceability.md`, ‏162 שורות, 14,493 בתים, SHA-256=`ca069fc6187e23d720f4654d2df1a58a8d58666d2bc29bb8454cfe51c1532acb`.

1.5 הביקורת אינה טוענת שקוד קיים או חסר. היא בודקת אם `TR` מוכיח עקיבות, כיסוי ומעמד באופן בטוח מתוך המקורות המדויקים.

1.6 לא שונו Product Code, ‏Git, ‏Build, ‏Tests, ‏Runtime, ‏Deploy, ‏Provider, חשבון או Credentials.

# 2. פסק דין

2.1 Verdict=`REJECT-AS-CANONICAL-TRACEABILITY; RETAIN-AS-HISTORICAL-CATEGORY-LEVEL-NAVIGATION-ONLY`.

2.2 ‏27 רשומות `SPEC-01`–`SPEC-27` אינן מכסות באופן מוכח כל Statement בשני מקורות האפיון.

2.3 אין מכנה מאושר של Statements אטומיים. לכן אחוז הכיסוי המדויק של כלל האפיון הוא `unknown/unavailable`; אין לחשב `27 / N` עד ש־`N` נוצר ומתקבל.

2.4 במקור הטקסט קיימות בדיוק 83 שאלות ממוספרות ורציפות, 1–83. ב־`TR` קיימות `0/83` רשומות Question מזוהות ו־`0/83` קישורי Question→Decision מפורשים.

2.5 ב־27 שורות המטריצה קיימים `0/27` locators מדויקים למקור, `0/27` Evidence locators בעלי נתיב ו־digest, ו־`0/27` שרשראות מלאות `Source→Requirement→Decision→Stage→Task→Test→Evidence→Gate`.

2.6 שלוש־עשרה רשומות מסומנות `local-complete`. אף אחת מהן אינה ניתנת לקבלה מתוך `TR` בלבד, משום שאין בה child Requirement denominator, ‏commit/artifact binding, ‏Test identity, תוצאה, reviewer ו־evidence digest. מצבן בביקורת זו הוא `UNVERIFIED-LOCAL-CLAIM`, לא `false` ולא `complete`.

2.7 טענת השלמות המקומית, טענת כיסוי האפיון וטענת התאמה להחלטות מאוחרות אינן בטוחות לשימוש ב־Gate, באחוז התקדמות או בהחלטת Restart.

2.8 סיכום ממצאים: `P0=8`, ‏`P1=7`, ‏`P2=4`, ‏`P3=2`, סך הכול `21` Findings פתוחים.

# 3. מקורות ושיטת הבדיקה

3.1 `TXT=/Users/tal/.codex/attachments/b2c4be15-c1e2-4414-8452-3d79aca8d94a/pasted-text.txt`; זהות=`818 lines/33,837 bytes`; SHA-256=`52eb4f838d876ae30ff60dd93b1295a3d57759a08c2929787c07d5c4fcf7bb6b`.

3.2 `PDF=/Users/tal/Downloads/אפיון מערכת - דיוור WhatsApp ובוט AI.docx.pdf`; זהות=`129,784 bytes/PDF1.4/4 A4 pages`; SHA-256=`48e87c0a5ca6a40cbd3f320f08dfd3ca946c31a6f3409aafbfff6b9642302f6a`.

3.3 `RCP=/Users/tal/Documents/connect/web/docs/planning/source-pdf-visual-and-text-verification-2026-08-29.md`; SHA-256=`030502fafc90e5a7ed1a02da1ddb7ff0c091473ec25af3d0bd452f288f53f8db`.

3.4 `LED=/Users/tal/Documents/connect/web/docs/planning/user-directive-and-source-precedence-ledger-2026-08-29.md`; SHA-256=`b012a479b18e162f5f759b49e033eb3856a4637cc0e91a8a36f1d06043813342`.

3.5 `DI=/Users/tal/Documents/connect/web/docs/decision-intake-2026-08-21.md`; SHA-256=`052297f38f63d6e525641a5e1d044267cf7d553fd3e7a9d2d469669eca090937`.

3.6 `RDA=/Users/tal/Documents/connect/web/docs/researched-decision-approval-2026-08-26.md`; SHA-256=`f981cf9313e08fe0cfbd0603717af1a999fd1a367b5521d4191d0cfc3b27128b`.

3.7 `D02A4=/Users/tal/Documents/connect/web/docs/planning/d02-a4-openai-model-routing-reconciliation-2026-08-29.md`; SHA-256=`221af06420bd0d5680ae708c997e9f22b7b48eecc9278dbe740cb66346c68d54`.

3.8 `D03A4=/Users/tal/Documents/connect/web/docs/planning/d03-a4-billing-provider-reconciliation-2026-08-29.md`; SHA-256=`d57a5d2510d773c5b154908cf46b0b8dd510d7e2c3a254d1ee7f50df2ee71801`.

3.9 `D0514A4=/Users/tal/Documents/connect/web/docs/planning/d05-d14-a4-object-storage-and-malware-scanning-reconciliation-2026-08-29.md`; SHA-256=`af79eaa1ff0046f8cad0a7cc6904f4ab75b549285cc0a27b6f082c8b088f9a78`.

3.10 `D2930A4=/Users/tal/Documents/connect/web/docs/planning/d29-d30-a4-post-pilot-roadmap-enterprise-integrations-mobile-reconciliation-2026-08-29.md`; SHA-256=`b30fe8fe609b0710193dd67f951ec41fa543644a403869e211bf41d2dea8cf0f`.

3.11 ‏`TR`, ‏`TXT`, ‏`RCP`, ‏`LED`, ‏`DI`, ‏`RDA`, ‏`D02A4`, ‏`D03A4`, ‏`D0514A4` ו־`D2930A4` נקראו במלואם.

3.12 כל ארבעת עמודי `PDF` רונדרו מחדש ב־144 DPI ונבדקו חזותית. Hashes העמודים שהתקבלו זהים ל־`RCP§2.1.3–2.1.6`: ‏`e46439…`, ‏`465c42…`, ‏`3436b3…`, ‏`af3d16…`.

3.13 חילוץ `pdftotext -layout` שוחזר כ־155 שורות/14,093 בתים, SHA-256=`6800eaf2a76b41440c3a0fc9bd61d2b421ace3f431a1235b993dd63bf389fe3d`, זהה ל־`RCP§2.2.2–2.2.3`.

3.14 ה־receipt מאמת זהות, רינדור ומלאי סמנטי מועמד בלבד. לפי `RCP§1.1.5–1.1.6` ו־`RCP§6.1–6.5`, הוא אינו מקבל Requirement universe, ‏forward/inverse coverage או מוכנות מוצר.

3.15 אין בביקורת זו ניסיון להמיר אוטומטית כל Bullet לדרישה. פיצול סמנטי לפי Actor, Action, Object, Condition, Scope ו־Acceptance effect עדיין נדרש; לכן המכנה הסופי נשאר `unknown/unavailable`.

3.16 מסמכי D02/D03/D05/D14/D29/D30-A4 הם Planning selections שמצהירים בעצמם `accepted=0/1` או equivalent. הם נדרשים כ־Decision/status/safe-state edges, אך אינם מוכיחים אישור חיצוני, מימוש או Ready.

# 4. חוזה Findings

4.1 לכל Finding יש מזהה report-local יציב, Severity, ‏Subject locator, ‏Defect, ‏Impact, ‏Required remediation, ‏Acceptance predicate ו־Dependencies.

4.2 `P0` פירושו שהמסמך אינו יכול לשמש מקור אמת או Gate; ‏`P1` הוא אובדן דרישות או Drift מהותי; ‏`P2` הוא כשל תחזוקה/בקרה שעלול להפוך למהותי; ‏`P3` הוא פגם ביקורתיות או קריאות.

4.3 כל Finding הוא יחידה נפרדת. כותרת או נושא דומים אינם מתירים Merge, Alias או Dedup.

# 5. עובדות כמותיות

5.1 ב־`TR:L36–L62` קיימות 27 שורות SPEC ייחודיות ורציפות.

5.2 התפלגות הסטטוסים היא `local-complete=13`, ‏`partial=9`, ‏`external-blocked=4`, ‏`planned=1`.

5.3 ב־`TXT:L643–L765` קיימים בדיוק 83 מספרי Question ייחודיים ורציפים.

5.4 `TR` אינו מכיל את הנתיב, ה־SHA או מזהה המקור של `TXT`.

5.5 `TR` אינו מכיל `D01`–`D30`, ‏Question IDs, ‏PDF page/region locators, ‏TXT line locators, ‏Task IDs, ‏Test IDs, ‏Evidence IDs או Gate IDs.

5.6 עצם העובדה ש־prose ב־`TR` מזכיר Feature הדומה לשאלה או לדרישה אינה מעניקה כיסוי, תשובה, supersession או closure credit.

# 6. ממצאי P0

## 6.1 PSTA-20260829-P0-001 — מקור האפיון המפורט הושמט מן ה־Source root

6.1.1 Severity=`P0`.

6.1.2 Subject locator=`TR:L5–L18;TR:L34;TXT:L1–L818;LED§4.1.1–4.1.4`.

6.1.3 Defect=`TR` מזהה רק את ה־PDF וקורא לעמודה שלו "דרישת PDF". מקור `TXT` בן 818 השורות, שהוא מקור A3 ראשי ומפורט, אינו רשום ואינו מקושר.

6.1.4 Impact=כל דרישה שקיימת רק ב־`TXT`, וכל פירוט שמרחיב את ה־PDF, יכולים להיעלם בלי שהמטריצה תיכשל.

6.1.5 Required remediation=ליצור Source Manifest קנוני הכולל את שני המקורות עם Artifact ID, נתיב, bytes, digest, media type, authority, scope ויחסי conflict/variant; לקשור כל Requirement ל־source root מדויק.

6.1.6 Acceptance predicate=`2/2` מקורות A3 נפתרים לבתים ול־SHA הצפוי; שינוי Byte פוסל את ה־Candidate; אין Source fallback לפי filename בלבד.

6.1.7 Dependencies=`none`.

## 6.2 PSTA-20260829-P0-002 — אין Requirement universe אטומי או מכנה

6.2.1 Severity=`P0`.

6.2.2 Subject locator=`TR:L32–L62;TXT:L1–L818;PDF:p2–p4;RCP§6.1–6.3;LED§5.2`.

6.2.3 Defect=‏27 שורות Feature גסות מחברות Statements רבים ללא כלל פיצול, מונה statements או Definition of Requirement.

6.2.4 Impact=לא ניתן לדעת כמה דרישות קיימות, מה הושמט או מהו אחוז הכיסוי; סימון Parent category אינו מוכיח את ילדיו.

6.2.5 Required remediation=לנרמל כל Statement עצמאי לפי actor/action/object/condition/scope/acceptance ולתת `REQ-*` דטרמיניסטי; context, definition ו־non-requirement נשמרים אך אינם נספרים כדרישה.

6.2.6 Acceptance predicate=שני reviewers מפיקים אותו Manifest מאותו Root; `zero unclassified semantic spans`, ‏`zero duplicate requirements`, ‏`zero orphan source spans`; המכנה נגזר בלבד.

6.2.7 Dependencies=`PSTA-20260829-P0-001`.

## 6.3 PSTA-20260829-P0-003 — כל 83 השאלות חסרות כמערכת החלטות

6.3.1 Severity=`P0`.

6.3.2 Subject locator=`TXT:L637–L765;TXT:L803–L818;TR:L1–L162`.

6.3.3 Defect=מקור `TXT` מונה 83 שאלות בתשע קבוצות ועוד עשר החלטות קריטיות. ב־`TR` אין Question record אחד, אין answer status ואין קישור ל־D01–D30.

6.3.4 Impact=שאלה פתוחה יכולה להופיע בטעות כדרישה מאושרת, להיעלם, או להיחשב פתורה משום שקיים קוד דומה.

6.3.5 Required remediation=ליצור `Q001`–`Q083` עם exact line locator, subject, priority, status=`unanswered|answered|superseded|deferred|not-applicable`, Decision edge, effective scope ו־safe state; למפות בנפרד את עשר החלטות §16.

6.3.6 Acceptance predicate=`83/83` Question IDs קיימים פעם אחת; הרצף 1–83 ללא Gap; כל Answer קשור למקור החלטה עמיד; unanswered נשאר `unknown/unavailable` ו־fail-closed.

6.3.7 Dependencies=`PSTA-20260829-P0-001;PSTA-20260829-P0-002`.

## 6.4 PSTA-20260829-P0-004 — אין locators גרנולריים למקורות

6.4.1 Severity=`P0`.

6.4.2 Subject locator=`TR:L34–L62;RCP§2.2.4–2.2.5;RCP§6.1–6.2`.

6.4.3 Defect=כל שורת SPEC מכילה paraphrase בלבד. אין line range ל־`TXT`, ואין page+region או reproducible text span ל־`PDF`.

6.4.4 Impact=Reviewer אינו יכול להוכיח שהפרפרזה מלאה, להבחין בשינוי מקור, או לזהות ש־Example/Open question הומרו לדרישה.

6.4.5 Required remediation=לכל statement להצמיד `sourceArtifactId`, ‏raw digest ו־exact locator; PDF מחייב page+bounding region או span הניתן לשחזור ומאומת מול render.

6.4.6 Acceptance predicate=`100%` מן הרשומות פותרות לבתים המדויקים; locator mutation test נכשל; `zero dangling`, ‏`zero broad whole-document locator` לדרישה אטומית.

6.4.7 Dependencies=`PSTA-20260829-P0-001;PSTA-20260829-P0-002`.

## 6.5 PSTA-20260829-P0-005 — אין כיסוי קדימה או הפוך

6.5.1 Severity=`P0`.

6.5.2 Subject locator=`TR:L32–L62;TR:L64–L145;LED§5.2.6;RCP§6.2–6.3`.

6.5.3 Defect=Schema בן חמש עמודות אינו כולל Decision, Scope, Stage, Task, Test, Evidence או Gate IDs. טקסט כללי בעמודת "ראיה" אינו Edge.

6.5.4 Impact=אין הוכחה שכל Requirement מיושם ונבדק, ואין הוכחה שכל Task או Gate נובע מסמכות מוצר/בקרה מוכרת. Feature creep ו־orphan work אינם ניתנים לזיהוי.

6.5.5 Required remediation=ליצור Forward graph ‏`Source→Statement→Requirement→Decision→Scope→Stage→Task→Test→Evidence→Gate` ו־Inverse graph מכל node ביצועי חזרה לסמכות.

6.5.6 Acceptance predicate=`100%` Requirements admitted ממופים ל־Disposition; כל in-scope Requirement מגיע ל־Task/Test/Evidence/Gate או ל־ExternalWait מפורש; `zero inverse orphan`, ‏`zero dangling edge`, ‏`zero cycle`.

6.5.7 Dependencies=`PSTA-20260829-P0-002;PSTA-20260829-P0-004;PSTA-20260829-P0-007`.

## 6.6 PSTA-20260829-P0-006 — `local-complete` אינו ניתן לאימות

6.6.1 Severity=`P0`.

6.6.2 Subject locator=`TR:L20–L30;TR:L36,L40–L42,L46–L48,L51,L53–L55,L61–L62;TR:L149–L159`.

6.6.3 Defect=‏13 טענות `local-complete` נשענות על תיאור prose ללא child requirements, ‏repository root, ‏HEAD, file/test IDs, command/result artifact, timestamp, reviewer או digest. חלקן מאגדות דרישות שלא פורטו כלל.

6.6.4 Impact=Category יכולה להיראות מושלמת אף שילד אחד חסר; טענה היסטורית יכולה לשרוד שינוי קוד; אין אפשרות לשחזר את האימות.

6.6.5 Required remediation=להחליף זמנית ל־`unverified-local-claim`; לפצל axes ל־requirementState, implementationState, verificationState, externalReadiness, applicability ו־approvalState; לקשור Evidence immutable לכל ילד.

6.6.6 Acceptance predicate=Parent מקבל `local-complete` רק אם כל ילד in-scope סגור; כל closure מקושר ל־exact repo root+HEAD+test+result digest+review; negative and adversarial acceptance נדרשים לפי הסיכון.

6.6.7 Dependencies=`PSTA-20260829-P0-002;PSTA-20260829-P0-005`.

## 6.7 PSTA-20260829-P0-007 — החלטות מאוחרות אינן חלק מן המיפוי

6.7.1 Severity=`P0`.

6.7.2 Subject locator=`TR:L36–L62;TR:L87–L88;TR:L115–L131;TR:L138–L145;DI§4:D21–D28;D02A4§4,§7;D03A4§2,§4,§8;D0514A4§4,§9;D2930A4§4–§5,§8;LED§2,§4.2`.

6.7.3 Defect=‏`TR` מכיל אפס Decision IDs. הוא אינו מבדיל יעד רחב מ־Pilot: ‏D21 single-tenant closed pilot מול SPEC-01; ‏D23 plan ידני מול SPEC-02/03; ‏D24 Recurring אחרי Pilot מול SPEC-17; ‏D25 approval-only מול AI אוטומטי; ‏D22 Hebrew-first מול SPEC-27. הוא גם אינו משקף את safe states המאוחרים: D02-A4 ‏AI-OFF, ‏D03-A4 Checkout-OFF/Pilot ללא provider פעיל, ‏D05/D14-A4 Uploads-OFF/S3+GuardDuty Candidate, ו־D29/D30-A4 conditional capabilities OFF.

6.7.4 Impact=Requirement תקפה יכולה להופעל בסביבה הלא נכונה, Capability שנדחתה יכולה להיכנס ל־Pilot, ו־provider/architecture שכבר הוחלפו יכולים להמשיך להופיע כפער הפעיל.

6.7.5 Required remediation=לכל Requirement להוסיף Decision edges versioned עם predecessor, scope, applicability, status, external approvals, effectiveAt, expiry/change triggers ו־safe state. החלטה תוחמת אינה מוחקת את Requirement היעד.

6.7.6 Acceptance predicate=כל D01–D30 וכל amendment/reconciliation ממופים ל־Requirements המושפעים; Pilot/Post-Pilot נגזרים; `zero silent conflict`; Decision שאינו מאושר חיצונית אינו מקבל Ready.

6.7.7 Dependencies=`PSTA-20260829-P0-001;PSTA-20260829-P0-002`.

## 6.8 PSTA-20260829-P0-008 — Requirements, Questions, Examples ו־Future הוטחו לאותו סוג

6.8.1 Severity=`P0`.

6.8.2 Subject locator=`TXT:L132–L146;TXT:L637–L765;TXT:L769–L800;PDF:p3 §6 recommendation and §7.4;PDF:p4 §10;TR:L52,L62`.

6.8.3 Defect=אין `statementClass`. מספרי החבילה ב־`TXT:L134–L144` מסומנים במפורש "דוגמה"; 83 פריטים הם שאלות; §15 הוא חלוקה מומלצת; PDF §6 כולל המלצה עתידית ו־PDF §10 נושאים פתוחים. למרות זאת SPEC-27 מציג שלוש שפות כ"דרישת PDF" ו־`local-complete`, אף שבמקור זה נושא פתוח ובהחלטה D22 הכיוון הוא Hebrew-first.

6.8.4 Impact=דוגמה עלולה להפוך ל־Quota מחייב, שאלה לתשובה, והרחבת מוצר לדרישת מקור; מנגד Future אמיתי עלול להיעלם משום שאינו ב־Pilot.

6.8.5 Required remediation=לסווג כל Statement כ־`must|should|may|question|example|future|definition|context|non-requirement`; לשמור Decision/applicability בנפרד ולא לשנות את סוג המקור בדיעבד.

6.8.6 Acceptance predicate=כל span מסווג פעם אחת; Example אינו מזין Acceptance value; Question אינו Requirement מאושר; Future נשמר עם Gate; SPEC-27 מפוצל ל־open-source-question, ‏D22 Pilot decision ו־Roadmap targets נפרדים.

6.8.7 Dependencies=`PSTA-20260829-P0-002;PSTA-20260829-P0-003;PSTA-20260829-P0-007`.

# 7. ממצאי P1

## 7.1 PSTA-20260829-P1-001 — כיסוי חסר של משתמשים, רכישה, Onboarding ו־Admin

7.1.1 Severity=`P1`.

7.1.2 Subject locator=`TXT:L29–L40;TXT:L44–L89;TXT:L93–L159;TR:L36–L43`.

7.1.3 Defect=שורות SPEC מכסות Multi-Tenant, Landing, Billing ומספר פעולות Admin, אך אין Atomic rows לששת התפקידים, Wizard בן עשרה שלבים, שבעת מצבי המנוי, מדדי Dashboard, freeze/block/reset-password/support-login, credits, billing history, Package lifecycle והגדרות מערכת.

7.1.4 Impact=Authorization-sensitive operations ו־Onboarding acceptance יכולים להישמט תחת Feature כללי שנראה מכוסה.

7.1.5 Required remediation=לפרק כל Role, permission, onboarding transition, subscription state, metric ו־Admin command ל־Requirement/Question/Example record מתאים.

7.1.6 Acceptance predicate=כל span בטווחים המצוטטים מקבל classification ו־disposition; כל privileged command מקבל actor, authorization, audit, negative test ו־safe failure.

7.1.7 Dependencies=`PSTA-20260829-P0-001;PSTA-20260829-P0-002;PSTA-20260829-P0-004`.

## 7.2 PSTA-20260829-P1-002 — כיסוי חסר של Contacts, Templates, Campaigns, Scheduler ו־Inbox

7.2.1 Severity=`P1`.

7.2.2 Subject locator=`TXT:L163–L180;TXT:L184–L208;TXT:L212–L366;TR:L44–L52,L57–L58`.

7.2.3 Defect=קטגוריות גסות אינן מייצגות את כל פעולות Contacts ושדותיהם, Template media/preview/status/resubmission/clone, Campaign steps/status/cost/rate/test/progress, timezone/quiet-hours/calendar, ואת תיבת השיחות המרכזית עם assignment, transfer, notes, locks/statuses, search, media, notifications ו־bot return.

7.2.4 Impact=זרימות יומיומיות מרכזיות, Consent ו־Human-service controls חסרות ממכנה הקבלה.

7.2.5 Required remediation=ליצור Requirements אטומיים לכל פעולה ומצב; לקשור שאלות 19–45 ו־58–65 להחלטות ול־safe defaults.

7.2.6 Acceptance predicate=כל פעולה/שדה/state transition בטווח מקבל ID ו־acceptance; אין Category closure כאשר ילד אחד unknown או deferred.

7.2.7 Dependencies=`PSTA-20260829-P0-001;PSTA-20260829-P0-002;PSTA-20260829-P0-003;PSTA-20260829-P0-004`.

## 7.3 PSTA-20260829-P1-003 — כיסוי חסר של Bot, AI, Knowledge ו־Safety

7.3.1 Severity=`P1`.

7.3.2 Subject locator=`TXT:L370–L486;TR:L53–L57`.

7.3.3 Defect=SPEC-18–22 אינם מפרטים את 17 סוגי הבלוקים, delays, template/media/list/contact/tag/webhook/API nodes, draft/publish/history/clone/test/analytics, 12 הגדרות Agent, שבעת סוגי מקורות הידע, שמונת שדות metadata, תהליך תשובה בן עשרה שלבים ותשעת מנגנוני הבטיחות.

7.3.4 Impact=הביטוי "כל סוגי ה־Nodes" מתייחס ליקום קוד לא מוגדר ולא מוכיח את Universe המקורי; Safety או Approval יכולים להיראות מכוסים בלי Requirement/Test נפרד.

7.3.5 Required remediation=ליצור child Requirements לפי כל row/bullet ולמפות D02, D05, D06, D07, D14 ו־D25 לכל ילד מושפע.

7.3.6 Acceptance predicate=כל block/settings/source/metadata/process/safety span מקבל ID; compiler/runtime/UI/tests מקושרים בנפרד; AI send נשאר OFF עד approval evidence.

7.3.7 Dependencies=`PSTA-20260829-P0-001;PSTA-20260829-P0-002;PSTA-20260829-P0-003;PSTA-20260829-P0-006;PSTA-20260829-P0-007`.

## 7.4 PSTA-20260829-P1-004 — כיסוי חסר של Reports, Billing, Security, Performance ו־Data model

7.4.1 Severity=`P1`.

7.4.2 Subject locator=`TXT:L490–L633;TR:L38–L39,L50,L59–L61`.

7.4.3 Defect=אין Atomic coverage לדוחות Bot/AI, תשע פעולות billing self-service ושמונה אירועי payment/subscription, ‏MFA/session/backups/delete/export/retention/scanning/webhook-signature/rate-limit, 23 ישויות הנתונים, שכבות המערכת, screen≤3s, webhook≤5s, daily backup, scalable Workers ומזהה הודעה ייחודי.

7.4.4 Impact=דרישות אבטחה, פרטיות והתאוששות עלולות לא להיכנס ל־Gate; מודל הנתונים וביצועים אינם ניתנים להצלבה עם Tasks/Tests.

7.4.5 Required remediation=לנרמל את כל הטווח; להפריד Product Requirement, Security control, candidate architecture, performance SLO ו־open policy.

7.4.6 Acceptance predicate=כל span מסווג וממופה; כל Security/Privacy requirement מקבל threat/control/test/evidence; כל מספר performance מקבל scope, measurement source ו־decision/conflict status.

7.4.7 Dependencies=`PSTA-20260829-P0-001;PSTA-20260829-P0-002;PSTA-20260829-P0-004`.

## 7.5 PSTA-20260829-P1-005 — אין Conflict/Variant records בין שני מקורות A3

7.5.1 Severity=`P1`.

7.5.2 Subject locator=`TXT:L29–L38,TXT:L219,TXT:L625–L633;PDF:p2 §4;PDF:p3 §7.3;PDF:p4 §9;LED§4.1.4`.

7.5.3 Defect=ה־PDF מתאר שלושה מעגלי משתמשים והטקסט שישה תפקידים; ה־PDF מציין Excel והטקסט Excel או CSV; ה־PDF קובע יעד זמינות `99.5%+` והטקסט אומר שה־SLA יוגדר. `TR` בוחר paraphrase אחד בלי relation מסוג refine/variant/conflict.

7.5.4 Impact=שוני בפרטים מתפרש בשקט כאיחוד או overwrite; לא ניתן לדעת איזו גרסה מחייבת, לאיזה Scope ובאיזה זמן.

7.5.5 Required remediation=להשוות לפי subject+scope+environment+effective-time; ליצור `refines|compatible-variant|conflicts|superseded-by-decision` edges; unresolved conflict נשאר fail-closed.

7.5.6 Acceptance predicate=כל subject חופף בין שני המקורות מקבל relation מפורש; `zero silent union`; ערך מספרי סותר אינו נבחר ללא Decision.

7.5.7 Dependencies=`PSTA-20260829-P0-001;PSTA-20260829-P0-002;PSTA-20260829-P0-004;PSTA-20260829-P0-007`.

## 7.6 PSTA-20260829-P1-006 — Evidence prose אינו קשור לגרסת ארכיטקטורה או החלטה

7.6.1 Severity=`P1`.

7.6.2 Subject locator=`TR:L36,L40,L47,L53–L56,L61;TR:L68–L73,L81–L85,L119–L134;DI§4:D12–D14;D02A4§4,§7;D03A4§2,§4,§8;D0514A4§4,§9`.

7.6.3 Defect=‏`TR` מציג D1 ו־R2 כראיה/פער פעילים ומורה "לבחור" Billing/AI/Scanner, בעוד החלטות מאוחרות בחרו Railway PostgreSQL, ‏S3+GuardDuty, OpenAI ו־Pilot Billing ידני. ייתכן שה־prose מתאר Legacy implementation, אך אין `appliesToHEAD`, architecture version או supersession edge.

7.6.4 Impact=Evidence אמיתי לגרסה ישנה עלול לקבל closure לגרסה חדשה; פער שכבר הוכרע מחקרית עלול להישאר פתוח בניסוח שגוי; אין להכריע אם המצב שקרי או היסטורי.

7.6.5 Required remediation=לקשור כל implementation/evidence claim ל־repo root, HEAD/artifact digest, architecture profile, Decision version, environment ו־observedAt; לסמן Legacy בנפרד.

7.6.6 Acceptance predicate=כל claim פותר לגרסה מדויקת; Decision supersession משנה applicability ולא מוחק provenance; `unknown/unavailable` כאשר Artifact אינו נגיש.

7.6.7 Dependencies=`PSTA-20260829-P0-005;PSTA-20260829-P0-006;PSTA-20260829-P0-007`.

## 7.7 PSTA-20260829-P1-007 — Status אחד מערבב שישה ממדים שונים

7.7.1 Severity=`P1`.

7.7.2 Subject locator=`TR:L20–L30;TR:L36–L62`.

7.7.3 Defect=‏`local-complete|partial|external-blocked|planned` מערבבים סמכות Requirement, מימוש, בדיקה, readiness חיצונית, applicability ו־approval. שורת Parent אחת מקבלת Status אף שילדיה במצבים שונים.

7.7.4 Impact=Parser אינו יכול להבדיל "implemented but unverified", "out of Pilot", "decision pending", "provider unavailable" ו־"requirement partially implemented".

7.7.5 Required remediation=להגדיר enums גרסאיים ונפרדים: `requirementDisposition`, ‏`scopeApplicability`, ‏`implementationState`, ‏`verificationState`, ‏`externalReadiness`, ‏`approvalState` ו־transition table.

7.7.6 Acceptance predicate=כל atomic Requirement מקבל ערך חוקי בכל axis; Parent נגזר בלבד; unknown transition נכשל; אין compound status חופשי.

7.7.7 Dependencies=`PSTA-20260829-P0-002;PSTA-20260829-P0-006;PSTA-20260829-P0-007`.

# 8. ממצאי P2

## 8.1 PSTA-20260829-P2-001 — אין Lifecycle של Candidate, Root ו־Review

8.1.1 Severity=`P2`.

8.1.2 Subject locator=`TR:L1–L18;TR:L147–L162;RCP§1.1;LED§4.4.2`.

8.1.3 Defect=‏`TR` נושא תאריך 17.08.2026 ומזהה רק PDF digest, אך אין document version, source-set root, normalized-manifest digest, candidate digest, reviewer, acceptance manifest או supersession record.

8.1.4 Impact=שינוי במקור, החלטה או Evidence אינו מבטל אוטומטית את הסטטוסים; מסמך ישן יכול להמשיך להיראות Current.

8.1.5 Required remediation=Lifecycle מנותק: immutable source-set→normalized manifests→traceability candidate→independent QA/review→acceptance manifest→CAS pointer; כל שינוי יוצר Generation חדשה.

8.1.6 Acceptance predicate=שתי Generations משוחזרות בלי post-freeze edit; Review קשור ל־candidateDigest; current pointer חיצוני ואטומי.

8.1.7 Dependencies=`PSTA-20260829-P0-001;PSTA-20260829-P0-002;PSTA-20260829-P0-004`.

## 8.2 PSTA-20260829-P2-002 — תוכנית ביצוע mutable משולבת בתוך מטריצת המקור

8.2.1 Severity=`P2`.

8.2.2 Subject locator=`TR:L64–L145`.

8.2.3 Defect=‏82 שורות של סטטוס מימוש, Roadmap והוראות פעולה משולבות בתוך Artifact שאמור למפות Requirements. אין Task IDs, predecessors או Evidence binding.

8.2.4 Impact=עדכון מימוש משנה ידנית את מסמך הסמכות; Claim יכול להופיע פעמיים בטבלה ובתוכנית ולהיסחף בנפרד.

8.2.5 Required remediation=להוציא תוכנית וסטטוס ל־Task/Evidence registries קנוניים; ב־Traceability להשאיר edges בלבד.

8.2.6 Acceptance predicate=אין free-form completion claim ב־Traceability; כל plan item הוא Task ID קיים; rendering נגזר אוטומטית מן registries.

8.2.7 Dependencies=`PSTA-20260829-P0-005;PSTA-20260829-P0-006`.

## 8.3 PSTA-20260829-P2-003 — תנאי הקבלה אינם בודקים שלמות עקיבות

8.3.1 Severity=`P2`.

8.3.2 Subject locator=`TR:L147–L162`.

8.3.3 Defect=חמשת הכללים מתייחסים ל־UI/provider, delivery, billing, flow builder ושימור פערים. הם אינם דורשים 2/2 source roots, all statements classified, ‏83/83 questions, Decision mapping, forward/inverse coverage או verifiable evidence.

8.3.4 Impact=המסמך יכול לעבור את תנאי הקבלה של עצמו גם כאשר מרבית ה־Source universe אינו ממופה.

8.3.5 Required remediation=להוסיף Acceptance gate מבני לפני gates פונקציונליים: source identity, denominator, locators, classification, decisions, graph integrity, evidence binding ו־independent review.

8.3.6 Acceptance predicate=כל תנאי §11 בדוח זה נמדד ממכנים נגזרים; כל failure חוסם canonical status; אין prose-only waiver.

8.3.7 Dependencies=`PSTA-20260829-P0-001;PSTA-20260829-P0-002;PSTA-20260829-P0-003;PSTA-20260829-P0-004;PSTA-20260829-P0-005;PSTA-20260829-P0-006;PSTA-20260829-P0-007;PSTA-20260829-P0-008`.

## 8.4 PSTA-20260829-P2-004 — אין Schema או Validator דטרמיניסטי

8.4.1 Severity=`P2`.

8.4.2 Subject locator=`TR:L1–L162`.

8.4.3 Defect=אין machine-readable records, field schema, enum validation, reference resolver, source-span coverage audit, question sequence audit, graph audit או count digest.

8.4.4 Impact=כפילויות, orphan, dangling references ו־status drift ניתנים לזיהוי רק ידנית ולא באופן חוזר.

8.4.5 Required remediation=ליצור canonical JSON/YAML/DB export ו־validator דטרמיניסטי; Markdown יהיה view נגזר ולא source of truth.

8.4.6 Acceptance predicate=אותם bytes מפיקים אותם IDs/counts/digests בשתי ריצות; zero duplicate/orphan/dangling/cycle/unclassified span; validator negative tests עוברים.

8.4.7 Dependencies=`PSTA-20260829-P0-002;PSTA-20260829-P0-004;PSTA-20260829-P0-005;PSTA-20260829-P1-007`.

# 9. ממצאי P3

## 9.1 PSTA-20260829-P3-001 — `SPEC-*` הם Category IDs ולא Requirement IDs

9.1.1 Severity=`P3`.

9.1.2 Subject locator=`TR:L34–L62`.

9.1.3 Defect=זהות השורה נשארת אחת כאשר נוספות או מוסרות דרישות־ילד. אין Scope/version/semantic digest המגדירים מה SPEC-18 או SPEC-23 כוללים.

9.1.4 Impact=Diff נראה קטן אף שהמשמעות השתנתה; reviewer עלול לפרש ID כדרישה אטומית ויציבה.

9.1.5 Required remediation=לשמור `SPEC-CAT-*` לניווט בלבד ולתת `REQ-*` לכל Statement אטומי; Parent composition נגזר מרשימת child IDs.

9.1.6 Acceptance predicate=שינוי child set משנה composition digest; Requirement ID אינו משנה משמעות; split/merge מקבלים IDs חדשים ומפת migration.

9.1.7 Dependencies=`PSTA-20260829-P0-002`.

## 9.2 PSTA-20260829-P3-002 — תאי Evidence ארוכים מסתירים Drift

9.2.1 Severity=`P3`.

9.2.2 Subject locator=`TR:L49,L53–L58,L62;TR:L90–L124`.

9.2.3 Defect=שורות prose ארוכות, במיוחד SPEC-23 ו־Flow Builder, מערבבות עשרות claims ללא field-level identity.

9.2.4 Impact=שינוי סמנטי קטן קשה לביקורת, ו־claim יחיד אינו ניתן לביטול בלי לשכתב את כל התא.

9.2.5 Required remediation=רשומת Evidence אחת לכל claim עם ID, producer, subject, environment, observedAt, expiry, input/output digests ו־review status.

9.2.6 Acceptance predicate=field-level diff; כל claim ניתן לביטול עצמאי; Markdown נוצר מן הרשומות ללא עריכה ידנית.

9.2.7 Dependencies=`PSTA-20260829-P0-006;PSTA-20260829-P2-004`.

# 10. Probe שיטתי של כיסוי מקור הטקסט

10.1 הטבלה הבאה אינה Requirement Manifest ואינה מחליפה נרמול. היא מציגה Counterexamples מספיקים להפרכת 100% coverage בכל אזור עיקרי.

| אזור מקור | Locator | מה קיים ב־TR | פער מוכח |
| --- | --- | --- | --- |
| זהות המוצר | `TXT:L1–L25` | Multi-Tenant ו־WhatsApp מפוזרים במספר SPEC | אין Requirement אטומי ל־Web responsive למחשב ולמובייל ולעשרת יעדי המערכת |
| Roles | `TXT:L29–L40` | SPEC-26 כללי | אין ששת Role profiles וההרשאות שלהם |
| רכישה ו־Onboarding | `TXT:L44–L89` | SPEC-02–04 | אין שדות הרשמה, Wizard בן עשרה שלבים וכל שבעת מצבי המנוי |
| Admin | `TXT:L93–L159` | SPEC-05–08 | אין Dashboard metrics, רוב privileged commands, Package lifecycle והגדרות מערכת |
| Client dashboard/Meta | `TXT:L163–L208` | SPEC-09 ו־SPEC-23 | אין Dashboard metrics, תשעת צעדי החיבור ושבעת מצבי החיבור כילדים |
| Contacts | `TXT:L212–L246` | SPEC-11–13 | אין כל פעולות CRUD/import/export/consent וכל שדות Contact כילדים |
| Templates | `TXT:L250–L277` | SPEC-10 | אין 13 פעולות וששת מצבי Template כילדים |
| Campaign/Scheduler | `TXT:L281–L331` | SPEC-14–17 | אין כל 12 הצעדים, שבעת המצבים, timezone, quiet-hours, edit/pause/calendar |
| Inbox | `TXT:L335–L366` | Handoff/Inbound מוזכרים | אין Surface עצמאי, 15 פעולות וששת מצבי השיחה |
| Bot | `TXT:L370–L418` | SPEC-18–19 | אין כל block type ו־lifecycle/analytics כילדים מזוהים |
| AI/Knowledge/Safety | `TXT:L421–L486` | SPEC-20–22 | אין settings, formats, metadata, response pipeline ו־safety controls אטומיים |
| Reports | `TXT:L490–L518` | SPEC-15 חלקי | אין Bot/AI reports ורוב מדדי Campaign כילדים |
| Billing | `TXT:L521–L545` | SPEC-03–04 | אין self-service actions וכל payment/subscription event כילדים |
| Security/Privacy | `TXT:L548–L569` | SPEC-24/26 | אין MFA, sessions, backup, delete/export, retention, scanning, webhook signature ו־rate limit כילדים |
| Data/Architecture | `TXT:L572–L617` | אין מיפוי אטומי | 23 entities ו־12 architecture layers אינם מסווגים Requirement מול candidate design |
| Performance | `TXT:L621–L633` | SPEC-25 כללי | אין 3s, 5s, daily backup, worker expansion ו־unique message ID כילדים |
| Questions | `TXT:L637–L765` | אין Question IDs | `0/83` mapped |
| Roadmap recommendation | `TXT:L769–L800` | Recurring בלבד מופיע | אין classification של MVP מול Version2 recommendation |
| Critical decisions | `TXT:L803–L818` | אין Decision IDs | `0/10` critical-decision source rows mapped |

# 11. סדר תיקון מחייב

11.1 שלב 1 — להקפיא את `TR` כ־Historical category view; אין למחוק אותו ואין להשתמש בסטטוסים שלו ל־Gate.

11.2 שלב 2 — לקבל Source Manifest של `TXT` ו־`PDF`, כולל ה־receipt כ־Evidence בלבד.

11.3 שלב 3 — להפיק Statement inventory גרנולרי, לסווג כל span וליצור Requirement ו־Question manifests.

11.4 שלב 4 — לבצע cross-source reconciliation עם variant/conflict records; אין silent union.

11.5 שלב 5 — למפות Decisions וה־amendments לפי precedence, scope ו־safe state.

11.6 שלב 6 — ליצור forward/inverse graphs ולהוסיף Task/Test/Evidence/Gate IDs רק לאחר שהמכנים התקבלו.

11.7 שלב 7 — להפריד status axes, להריץ Evidence audit מחדש ולחשב Parent state רק מילדים.

11.8 שלב 8 — להפיק Candidate immutable, שני Reviews בלתי תלויים, Acceptance manifest ו־CAS pointer חיצוני.

11.9 Earliest traceability restart=`לאחר קבלת שלבים 2–7`; Product restart אינו מוסק מדוח זה ונשאר כפוף ל־Master/Gate29.

# 12. תנאי קבלה כוללים

12.1 `2/2` מקורות A3 קשורים ל־raw digest הנכון.

12.2 כל span סמנטי בשני המקורות מסווג; exact Requirement denominator נגזר ומתקבל.

12.3 `83/83` שאלות ו־`10/10` החלטות קריטיות מן המקור מקבלות record ו־disposition; unanswered נשאר fail-closed.

12.4 Examples, recommendations, future work, definitions ו־context אינם מקבלים Requirement closure.

12.5 לכל Requirement יש locator מדויק ו־Decision/applicability edges; כל conflict מפורש.

12.6 Forward coverage=`100%` לפי scope; inverse orphan count=`0`; dangling/cycle/duplicate count=`0`.

12.7 כל `local-complete` עתידי נגזר מכל ילד ומגובה ב־repo root, ‏HEAD, ‏Test ID, result digest, environment ו־review.

12.8 Provider/Legal/Finance/Security readiness נשאר axis נפרד ואינו נגזר מקוד מקומי.

12.9 שני validators/reviewers בלתי תלויים מקבלים אותם counts, IDs ו־digests לאותו Candidate.

12.10 רק Acceptance manifest הקשור ל־candidateDigest מדויק רשאי להחליף את Verdict של §2.

# 13. Unknowns שנשמרו במפורש

13.1 מספר ה־Requirements האטומיים הכולל=`unknown/unavailable` עד נרמול וקבלה.

13.2 אחוז כיסוי statement-level של `TR`=`unknown/unavailable`; Counterexamples מוכיחים שאינו 100%.

13.3 מצב המימוש האמיתי של 13 טענות `local-complete`=`unknown/unavailable` במסגרת ביקורת Planning-only זו.

13.4 האם כל Statement ארכיטקטוני ב־`TXT§11–§13` הוא Requirement מחייב, design candidate או context=`unknown/unavailable` עד Classification/Decision.

13.5 Provider, account, live configuration, Legal approval ו־Production evidence אינם נבדקים או נלמדים מן המטריצה.

# 14. הכרעה סופית

14.1 ‏`TR` שימושי כרשימת ניווט היסטורית ל־27 קטגוריות מן ה־PDF.

14.2 ‏`TR` אינו Requirement Manifest, אינו Question/Decision Register, אינו forward/inverse traceability graph ואינו Evidence ledger.

14.3 כל 21 Findings נשארים `OPEN` עד Acceptance predicate המתאים; אין ממצא שנסגר על סמך יצירת דוח זה.

14.4 Verdict סופי=`REJECT-AS-CANONICAL; SOURCE-NORMALIZATION-REQUIRED; LOCAL-COMPLETE-CLAIMS-NOT-ACCEPTED; PRODUCT-STATE-UNKNOWN`.
