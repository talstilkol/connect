# 1. Connect — קליטת החלטות Tal ועדכון תוכנית

## 1.1 זהות ומעמד

1.1.1 `artifactId=CONNECT-TAL-PROJECT-STATUS-DECISIONS-INTAKE-AND-PLAN-RECONCILIATION-2026-08-30`.

1.1.2 מקור=`connect-project-status-decisions.json`, גרסה `4`, שיוצא ב־`2026-08-30T16:05:42.732Z`.

1.1.3 SHA-256 של קובץ המקור=`5aece466c4c3c1bf6fe3bbb0ec4b7525028c65ac2dd39d396ca4d339e7828af4`.

1.1.4 נקלטו `38` תשובות=`4` החלטות אסטרטגיות + `5` בחירות טיפול ב־Audit + `29` מסלולי Gate.

1.1.5 המעמד=`USER-SELECTED-PLANNING-DIRECTION;NOT-PROVIDER-EVIDENCE;NOT-LEGAL-APPROVAL;NOT-PRODUCTION-ACCEPTANCE`.

1.1.6 המאגר נשאר `PUBLIC`; ‏`Gate29=BLOCKED`; הקפאת הפיתוח נשארת `ACTIVE`.

1.1.7 קובץ זה אינו שומר Secret, Token, מזהה חשבון, מספר טלפון, מידע לקוח או Credential.

1.1.8 נקלט מענה חלקי נוסף שהמשתמש ייצא ב־`2026-08-30T16:27:50.794Z` והדביק בשיחה.

1.1.9 בתמונת הביניים שכבר הוחלפה הוכרעו `5/6` החלטות: `V02=per-use`, ‏`V03=wait-live`, ‏`V04=defer`, ‏`V05=wait-eligible`, ‏`V06=keep-active`; תמונה זו נשמרת רק לצורכי עקיבות ואינה המצב העדכני.

1.1.10 באותה תמונת ביניים `V01` נשארה ללא תשובה וכל `15` פריטי ה־Needs נשארו במצב `missing`; V01 הוכרעה לאחר מכן בסעיף 1.1.14, בעוד מצב ה־Needs לא השתנה.

1.1.11 אין לקלט המודבק SHA-256 מאומת כקובץ עצמאי; לכן מקורו מתועד כ־`USER-SUPPLIED-CONVERSATION-JSON` ולא כ־digest-bound artifact.

1.1.12 נקלט ייצוא הצבעות נוסף: `CONNECT-STATUS-GUIDE-V2-2026-08-30`, ‏exportedAt=`2026-08-30T16:37:24.883Z`, ‏observedAt=`2026-08-30T19:28:56+03:00`.

1.1.13 הייצוא מצהיר `statusSnapshotSha256=3fd7ec06f9201200ebaa608ad39a48659ab84f4efc7c42535b82034549b230b1` ו־`choiceUniverseSha256=95feab1238fafbd03154583325188549ebab2f91578e478f4ca92b79e1faf5ee`; הוא סווג בעצמו `DETACHED-NON-AUTHORITATIVE-PLANNING-VOTE-EXPORT`.

1.1.14 הוראת Tal בשיחה מעניקה סמכות כוונת תכנון לבחירות: `V01=public-no-license-until-legal` ו־`V02=approve-each-security-use`; היא אינה Legal approval, Provider Evidence, Permit או Production Acceptance.

1.1.15 כל `2/2` ההצבעות הזכאיות ב־`CONNECT-ELIGIBLE-TAL-VOTES-V2` נענו; מספר ההצבעות הזכאיות הפתוחות כעת=`0`.

1.1.16 הוראת Tal המאוחרת מבטלת את חלוקת התפקידים הקודמת: [Tal הוא האחראי היחיד](sole-owner-operating-model-2026-08-30.md) לכל משימה, Gate, חיבור, בדיקה ותיאום. שמות או תפקידי Primary/Backup/RACI ישנים נשארים היסטוריים בלבד.

## 1.2 כלל פרשנות

1.2.1 בחירה של Tal סוגרת את שאלת הכיוון התכנוני בלבד.

1.2.2 בחירה אינה מוכיחה שחיבור ספק קיים, שהרשאה עובדת, שהחוק מאפשר את הפעולה או שהמערכת עברה בדיקה חיה.

1.2.3 מסמכי Planning קפואים שכבר קיבלו digest אינם משתנים בעקבות הקליטה; החלטות אלה נכנסות כ־successor input למסמכים הבאים.

1.2.4 נתוני Audit שבתוך ה־JSON הם snapshot שיוצא על ידי המשתמש. הם אינם תחליף להרצה חדשה או ל־readback חי.

# 2. החלטות אסטרטגיות שנקלטו

## 2.1 O03 — Region ו־Data residency

2.1.1 בחירה=`ישראל-first, בכפוף לאימות`.

2.1.2 השפעה על התוכנית=`כל ספק ושירות נבדק בנפרד לזמינות, חוזה, DPA, גיבוי, תמיכה והעברת מידע; אין fallback שקט לאזור אחר`.

2.1.3 חסם שנשאר=`Legal review + live account/service availability readback`.

## 2.2 O11 — מודל אחריות יחיד

2.2.1 הבחירה הקודמת `Primary + Backup לכל תפקיד` הוחלפה בהוראה מאוחרת ומפורשת: `Tal הוא האחראי היחיד`.

2.2.2 השפעה על התוכנית=`כל Task, Gate, Incident path, Release coordination וחיבור ספק מקבלים Owner=Tal`.

2.2.3 חסם שנשאר=`רק קיבולת העבודה השבועית וזמינות Tal לטיפול בתקלות טרם נמסרו; אין חסם של שמות נוספים`.

## 2.3 O12 — עדיפות אחרי Pilot

2.3.1 בחירה=`אמינות ליבה ו־Inbox`.

2.3.2 סדר Roadmap לאחר Pilot=`Inbox/WhatsApp reliability → Consent/opt-out → Reporting/observability → Billing בסיסי → הרחבות Enterprise/Mobile רק לפי Evidence`.

2.3.3 Native Mobile, Public API, Marketplace, SAML/SCIM והרחבות Enterprise נשארים מחוץ ל־Pilot.

## 2.4 O13 — חישוב זמן ואחוז

2.4.1 בחירה=`Task Registry ואז אומדן`.

2.4.2 אחוז השלמה רשמי, שעות ו־ETA נשארים `unknown/unavailable` עד שקיימים Task denominator, weights, dependencies וקיבולת עבודה מאושרת של Tal.

2.4.3 אין לחשב אחוז לפי מספר קבצים, Commits, בדיקות או מסמכים בלבד.

# 3. החלטות Audit שנקלטו

## 3.1 A01 — עץ עבודה מקומי

3.1.1 בחירה=`להקפיא ולבדוק בקבוצות`.

3.1.2 תוכנית=`מלאי בעלות וכוונה לכל path → חלוקה ל־Slices קטנים → Review ובדיקות לכל Slice → Commit/Push רק בהרשאה נפרדת ומפורשת`.

## 3.2 A03 — PostgreSQL

3.2.1 בחירה=`להקים סביבת בדיקה מבודדת`.

3.2.2 תוכנית=`Database זמני שאינו מכיל Production data → Migrations → parity → concurrency → backup/restore → teardown מבוקר`.

## 3.3 A08 — ESLint

3.3.1 בחירה=`לנקות אזהרות לפני baseline`.

3.3.2 תוכנית=`למיין כל warning לבאג, debt מאושר או false positive; אין blanket disable`.

## 3.4 A09 — Runtime

3.4.1 בחירה=`לבחור runtime ראשי ולבדוק parity`.

3.4.2 על בסיס החלטת hosting הקודמת, מועמד ה־Launch הראשי נשאר `Vercel/Next.js` וה־Backend נשאר `Railway`; ‏Vinext/Cloudflare הוא מסלול compatibility בלבד עד החלטה מפורשת אחרת.

3.4.3 חסם=`build/runtime parity אמיתי על אותו Commit ואותם acceptance cases`.

## 3.5 A11 — Clerk Admin lint exception

3.5.1 בחירה=`להשאיר fail-closed עם בדיקות`.

3.5.2 תוכנית=`החרגה צרה ומוסברת בלבד; בדיקות חיוביות ושליליות; אין הרחבת bypass`.

# 4. מסלולי Gate שנבחרו

## 4.1 חסמי חיבור והוכחה

| מזהה | כיוון שנבחר | אחראי נוכחי | מה עדיין חסר |
|---|---|---|---|
| `G01` | Clerk ב־Staging והוכחה | Tal | חשבון, Vault config ו־E2E |
| `G02` | Admins שמיים ב־Staging עם MFA | Tal | MFA readback |
| `G03` | Invitation E2E ב־Staging | Tal | סביבת בדיקה ושני actors מבודדים |
| `G04` | Activation והפרדת Tenant | Tal | runtime/database Evidence |
| `G05` | Staging ו־Production נפרדים | Tal | projects, domains ו־secrets נפרדים |
| `G06` | Deployment קשור ל־CI ול־digest | Tal | provenance ו־readback |
| `G07` | Meta Test/WABA רשמי | Tal | Meta assets והרשאות חיות |
| `G08` | Webhook חתום ב־Staging | Tal | endpoint, signature ו־replay tests |
| `G09` | Queue מבודד והוכחה | Tal | Redis/BullMQ live Evidence |
| `G10` | Delivery ב־WABA בדיקה | Tal | approved recipient/template/limits |
| `G11` | Bot עם אישור אדם | Tal | approval-bound dispatch proof |
| `G12` | Secret inventory בכספת | Tal | expiry ו־rotation לכל Secret |
| `G13` | Rulesets ו־CI למאגר PUBLIC | Tal | GitHub mutation + post-readback |
| `G14` | CI מוגן עם ראיה | Tal | required checks על exact Commit |
| `G15` | Dependency audit חתום | Tal | CI result bound to release |
| `G16` | Monitoring ותרגיל Alert | Tal | Better Stack/OTel + alert routing |
| `G17` | Restore מבודד | Tal | exact backup-to-restore Evidence |
| `G18` | Policy + safe-delete test | Tal | אישור משפטי חיצוני + execution proof |

## 4.2 החלטות מוצר ותפעול שנבחרו

| מזהה | כיוון שנבחר | מגבלה שנשארת |
|---|---|---|
| `D01` | הזמנה ל־72 שעות; הזמנה חדשה אחרי מצב סופי | Acceptance/expiry E2E |
| `D02` | OpenAI Responses עם אישור אדם | AI נשאר OFF עד account/eval/review Evidence |
| `D03` | להכין Stripe ו־Paddle | Pilot ללא Checkout אוטומטי; ספק פעיל ייבחר בעתיד |
| `D04` | Limiter חי ורב־שכבתי | מספרים חיים ותוקף Snapshot חסרים |
| `D05` | GuardDuty + Quarantine | AWS account/Region/IAM/KMS/plan חסרים |
| `D06` | עד 10 MiB; ‏PDF/TXT/DOCX | Uploads נשארים OFF עד scan path מוכח |
| `D07` | 15 דקות ושלושה ניסיונות | Worker/queue/recovery Evidence חסרים |
| `D08` | יומי, 90 יום, PITR ותרגול חודשי | ספק ו־Restore Evidence חסרים |
| `D09` | Better Stack + OpenTelemetry | חשבון, endpoint, redaction ו־SLO חסרים |
| `D10` | שעות עסקים + escalation | שמות, שעות ומסלול חירום חסרים |
| `D11` | Retention Policy v2 + Legal review | Legal approval ו־safe-delete proof חסרים |

# 5. מצב המחקר לאחר הקליטה

## 5.1 מה הושלם

5.1.1 נאספו ונחקרו כיווני ספק, אבטחה, פרטיות, WhatsApp, AI, Billing, Storage, Monitoring, Backup ו־Public GitHub.

5.1.2 החלטות המשתמש שב־JSON נקלטו במלואן: `38/38`.

5.1.3 קיימים Candidate packages וביקורות עוינות ל־B0 v7, Review Protocol v1.9, D02-A9 ו־Public/Cyber v5.

## 5.2 מה לא הושלם

5.2.1 המחקר אינו סופי: Source custody, exact version admission, legal applicability ו־live account facts עדיין חסרים.

5.2.2 ביקורות עצמאיות דחו את המועמדים הנוכחיים: B0 v7=`14` Findings; Review Protocol v1.9=`17`; D02-A9=`8`; Public/Cyber v5=`18`.

5.2.3 WhatsApp numerical rate limits נשארים `unknown/unavailable` עד readback רשמי מה־Meta assets והחשבון הרלוונטיים.

5.2.4 Source Universe, TRD-2, Master Control Sequence, Atomic Task Registry, לוח זמנים ו־Final Master Plan עדיין אינם Accepted.

# 6. החלטות ההמשך לאחר המענה החלקי

## 6.1 רישיון למאגר PUBLIC

6.1.1 תשובת Tal=`public-no-license-until-legal`.

6.1.2 מצב מחייב נוכחי=`המאגר נשאר PUBLIC; אין רישיון שימוש חדש ואין Contributions חיצוניים עד Legal/ownership review`.

6.1.3 כל הצעה עתידית ל־`MIT` או `Apache-2.0` דורשת בדיקת זכויות, בעלות, צדדים שלישיים, Patent/NOTICE ואישור משפטי חדש; אין שינוי אוטומטי בעקבות פרסום המאגר.

## 6.2 אקראיות קריפטוגרפית

6.2.1 תשובת Tal=`approve-each-security-use`; נדרש אישור נפרד לכל שימוש ביטחוני מדויק.

6.2.2 `Math.random()` נשאר אסור תמיד; אין blanket approval ואין שימוש ב־`crypto.randomUUID()` ל־business IDs.

## 6.3 פרופיל WhatsApp מספרי

6.3.1 תשובת Tal=`wait-live`; Capacity נשאר אפס עד Evidence חי.

6.3.2 לאחר Evidence Tal עדיין יצטרך לאשר את ה־LimitSnapshot וה־Connect cap המספריים המדויקים.

## 6.4 ספק Billing פעיל אחרי Pilot

6.4.1 תשובת Tal=`defer`; שני adapters מתוכננים ונשארים כבויים ב־Pilot.

6.4.2 בחירת Stripe או Paddle נדחית עד eligibility, legal, tax, cost ו־sandbox Evidence.

## 6.5 אישור ה־Planning root

6.5.1 תשובת Tal=`wait-eligible`; אין אישור מוקדם לחבילה הנוכחית.

6.5.2 Tal יצטרך לאשר או לדחות את ה־root הקפוא המדויק רק לאחר Review, closure ו־reconciliation תקינים.

## 6.6 הסרת הקפאת הפיתוח

6.6.1 תשובת Tal=`keep-active`; ההקפאה נשארת `ACTIVE`.

6.6.2 הסרה עתידית תתאפשר רק ל־work package מדויק לאחר Gate29 ואישור סמכויות התחום.

# 7. מידע וחיבורים שנדרשים מ־Tal והצוות

## 7.1 מצב המענה

7.1.1 ‏`N01` נסגר באמצעות מודל האחריות היחיד של Tal. יתר `14` הפריטים `N02–N15` טרם הוכחו כמוכנים.

7.1.2 אין צורך למסור Token כדי להמשיך בתכנון. חיבור עתידי יתבצע ב־Membership או Vault בלבד.

## 7.2 מידע שאפשר למסור בלי Secrets

7.2.1 שעות העבודה השבועיות של Tal, חלונות זמינות לטיפול בתקלות ודרך ההודעה המועדפת אליו.

7.2.2 שמות דומיין ל־Staging/Production וכתובות Origin מתוכננות.

7.2.3 Pilot charter: העסק/ה־Tenant המאושר, משתתפים, תקופת Pilot, stop authority וקריטריוני יציאה.

7.2.4 תקציב ותקרה כספית לכל ספק; אין להכניס פרטי תשלום למסמך Public.

7.2.5 זהות הישות המשפטית ופרטי יועץ משפטי/חשבונאי חיצוני כאשר ייבחרו; Tal נשאר האחראי להשגת האישורים.

## 7.3 חיבורים שצריך לבצע באמצעות Membership או Vault

7.3.1 GitHub=`Rulesets, CI, security features, collaborators`; המאגר נשאר PUBLIC.

7.3.2 Clerk=`Staging app, Organizations, MFA/admin policy`.

7.3.3 Vercel=`Staging/Production projects, domains, server origins`.

7.3.4 Railway=`API/Worker/PostgreSQL/Redis environments`.

7.3.5 Meta=`App, Test WABA, phone, templates, webhook, permissions and live limits`.

7.3.6 AWS=`account, il-central-1 availability, private S3, customer-managed KMS, GuardDuty Malware Protection`.

7.3.7 Better Stack/OpenTelemetry=`project, ingestion endpoint, redaction and alert routing`.

7.3.8 OpenAI=`company project, approved data controls, model/profile readbacks, budget and eval environment`.

7.3.9 Stripe/Paddle=`accounts and sandbox only when post-Pilot billing selection begins`.

## 7.4 Secret-handling rule

7.4.1 אין לשלוח Secret, Token, password, private key או customer data ב־JSON, HTML, Chat, Git, Issue או מסמך Public.

7.4.2 הדרך המועדפת=`Tal מתחבר בעצמו; Codex משתמש רק ב־session/CLI מאומת שכבר אושר, או ב־Membership שניתן דרך הספק. Secret נשמר ב־Vault; במסמך רושמים רק שם לוגי, scope, expiry ומצב חיבור`.

# 8. סדר תוכנית מעודכן

8.1 להחיל את `V01–V06` כאילוצי תכנון; מספר ההצבעות הזכאיות הפתוחות הנוכחי=`0`; להתייחס ל־`N01` כסגור ול־`N02–N15` כחסרים עד Evidence.

8.2 לשמור את Development freeze ואת המאגר PUBLIC.

8.3 לבנות successor לכל ארבעת ה־Candidates שנדחו ולבצע ביקורת עצמאית חדשה.

8.4 להקפיא Source Universe ו־Discovery Cutoff עם מקורות רשמיים ו־live account receipts.

8.5 להשלים TRD-2 ו־Master Control Sequence.

8.6 לבנות Atomic Task Registry עם `Owner=Tal`, ‏resources, dependencies ו־acceptance tests.

8.7 רק אז לחשב אחוז, שעות ולוח זמנים.

8.8 לבצע שלבי Staging שנבחרו ב־G01–G18 אחרי קבלת החיבורים והסמכויות הנדרשים.

8.9 לבצע שלוש ביקורות, reconciliation ואישור Tal ל־root המדויק.

8.10 להעריך מחדש Gate29; אין מעבר אוטומטי לפיתוח או Production.
