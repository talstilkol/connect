# 1. Connect — תוכנית מלאה לכל העבודה שנותרה

> עדכון 09.09.2026: מכוח הוראת Tal להכריע, לתכנן מחדש ולבצע,
> מקור העבודה הפעיל הוא [Master Plan לשחרור](launch-master-plan-2026-09-09.md)
> ו־[מסמך ההכרעות](launch-decisions-2026-09-09.md).
> תוכן מסמך זה נשמר כהיסטוריה. Planning-only ו־Development freeze
> אינם מגבילים את העבודה החדשה. אין שינוי רטרואקטיבי ב־Acceptance,
> בממצאים או ב־Gate29 ההיסטורי; דרישות מוצר ואבטחה ממופות בתוכנית החדשה.

## 1.1 מעמד המסמך

1.1.1 `artifactId=CONNECT-ALL-REMAINING-WORK-EXECUTION-PLAN-2026-08-30`.

1.1.2 המסמך מרכז את יתרת המחקר, התכנון, הפיתוח, האבטחה, הבדיקות, ה־Pilot, ההשקה והעבודה לאחר ההשקה.

1.1.3 זהו מסמך Planning חי. הוא אינו Acceptance, אינו אישור משפטי, אינו Permit לספק ואינו אישור Production.

1.1.4 המאגר נשאר `PUBLIC`; ‏`Gate29=BLOCKED`; ‏Development freeze=`ACTIVE`; ‏Production Acceptance=`0`.

1.1.5 אחוז ההשלמה המדויק, יתרת השעות ולוח הזמנים נשארים `unknown/unavailable` עד השלמת שלב 11: Atomic Task Registry, משקלי משימות, תלויות וקיבולת העבודה של Tal.

1.1.6 התוכנית כוללת `23` שלבים עיקריים. זהו סדר עבודה, לא מכנה שממנו מותר לחשב אחוז השלמה.

1.1.7 מודל האחריות הפעיל הוא [Tal כאחראי יחיד](sole-owner-operating-model-2026-08-30.md): כל משימה, Gate, חיבור, בדיקה ותיאום בבעלות Tal בלבד. הקצאות Primary/Backup/RACI ישנות מבוטלות לצורכי ביצוע.

1.1.8 אישור חיצוני שנדרש מ־Legal, ספק או מומחה הוא Evidence שטל אחראי להשיג; הוא אינו חלוקת בעלות לאדם אחר.

1.1.9 נקודת ההמשך של דרישות Eligibility היא `CONNECT-REVIEWINPUT-ELIGIBILITY-REQUIREMENTS-V5-2026-09-08`, ‏SHA-256=`65aa2dc6a15d629db8218eb3748ba16d983052fcd07dc64d15581b8edfe206bb`, ‏bytes=`1659675`. שתי ביקורות בלתי־תלויות על אותו אובייקט החזירו `PASS/PASS` בתחום התכנון הסטטי שהוגדר. V3 נפתח מחדש בביקורת הסשן ו־V4 נדחה; שניהם נשמרו ללא שינוי. V5 נשאר Planning candidate בלבד: אין שינוי ב־Gate29 או ב־Development freeze, ואין ReviewInput, Source admission, Acceptance, Authority, Permit, Completion או implementation credit.

1.1.10 נקודת ההמשך של חוזה Stage10 היא [Machine V12 / Human V11 — Reconciliation](stage10-v12-review-reconciliation-2026-09-08.md), עם שתי ביקורות עצמאיות `PASS/PASS` על אותו זוג קפוא ובתחום הסטטי שנבדק. אין ממצאים פתוחים בתחום הביקורות האחרונות; `87` Finding IDs ועוד `10` Producer IDs נשמרים בנפרד ללא accepted closure או credit. ששת roots היסוד עדיין אינם Accepted, שלב 10 נשאר פתוח, ו־Gate29 והקפאת הפיתוח נשארים במצבם.

1.1.11 נוסף [Bootstrap Input Admission Requirements V2 — Reconciliation](bootstrap-input-admission-v2-review-reconciliation-2026-09-08.md), עם שתי ביקורות עצמאיות `PASS/PASS` בתחום התכנון הסטטי. זהו supplement לקליטת `21` קלטי Bootstrap, עם `18` Predicates ושני Profiles/Guards. הוא אינו משנה את Stage10 V12, אינו מספק pin, descriptor או root מאומת, ואינו מעניק Authority או Acceptance. הראיות החיצוניות נשארות `unknown/unavailable` בהיקף שנבדק.

1.1.12 נוספה [Bootstrap descriptor topology/shape proposal V1 — Reconciliation](bootstrap-descriptor-shape-v1-review-reconciliation-2026-09-08.md), עם שתי ביקורות עצמאיות `PASS/PASS` על אותו זוג קפוא ובתחום ההצעה המוגבלת. הוגדרו `21` outer shapes ו־`10` רמות תלות מוצעות; `19` סוגי OPEN ו־`11` חובות integration נשארים פתוחים. ההצעה אינה Stage10 successor ואינה משנה ranks או משלימה descriptors מאומתים. Tal נשאר Owner היחיד; הבעלות אינה issuer, pinner או מינוי תפעולי.

1.1.13 נוספה [Bootstrap semantic grammar proposal V2 — Reconciliation](bootstrap-semantic-grammar-v2-review-reconciliation-2026-09-08.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` על אותו זוג קפוא. ההצעה מגדירה syntax ל־`19` משפחות OPEN עם `104` מיפויי שדות, `190` טיפוסים ו־`33` פרופילי arrays. V1 נשמר עם PASS של A, ‏FAIL של B ושני ממצאי producer; שלושת עדי הממצאים קיבלו תיקון תכנוני ב־V2 ללא accepted closure או credit. Actual descriptors, parameters ו־Authority נשארים חסרים.

1.1.14 נוספה [Bootstrap configuration/evidence envelopes proposal V2 — Reconciliation](bootstrap-configuration-evidence-v2-review-reconciliation-2026-09-08.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` על אותו זוג קפוא. ההצעה מגדירה `21` סוגי מעטפות לתצורה ראשונית ולראיות, `18` קשרי מקור חתימה ו־`28` שוויונות RootRef מלאים בין ראיות חלון הזמן. V1 נשמר עם FAIL/FAIL ושני ממצאים נפרדים שתוקנו תכנונית ב־V2, ללא accepted closure או credit. Actual configuration, trust origin, credentials וראיות עדכניות נשארים חסרים; זו אינה התקנה או Stage10 successor.

1.1.15 נוספה [Bootstrap Stage10 integration proposal V1 — Reconciliation](bootstrap-stage10-integration-v1-review-reconciliation-2026-09-08.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` על אותו זוג קפוא. ההצעה משלבת `45` הגדרות draft, מיפויי טיפוסים וזהויות, ודרישת מינימום של Admission Evidence ל־Subject. היא אינה Stage10 successor מאומץ או runtime registry. פרופילי אימות Anchor/Genesis, descriptor מלא של Subject, אימוץ downstream וכל `156` חובות ה־imports נשארים פתוחים.

1.1.16 נוספה [Anchor / Genesis verification proposal V2 — Reconciliation](bootstrap-anchor-genesis-verification-v2-review-reconciliation-2026-09-08.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` על אותו זוג קפוא. הוגדרו תכנונית שני Guards ופרופילים מדויקים עם `18/22` Predicates, מקור signer חיצוני, Material/Credential binding ושני preimages נפרדים. V1 נשמר עם `FAIL/FAIL` ושני ממצאים עצמאיים; V2 מפריד בין שימוש משותף לבין שתי הפעלות אימות שונות. זהו מענה תכנוני לחסמי הפרופילים שנשארו ב־BSI V1, ללא אימוץ, actual signatures או accepted closure. Descriptor מלא של Subject וכל הראיות הממשיות נשארים פתוחים.

1.1.17 נוספה [Subject Bootstrap Admission consumption V1 — Reconciliation](subject-bootstrap-admission-consumption-v1-review-reconciliation-2026-09-08.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` על דרישות הצריכה בלבד. הוגדרו Operand ייעודי ל־Subject, ‏16 Predicates ו־12 חובות תוכן חוסמות. המקורות מספקים שלוש הפניות מינימום, אך אינם מספקים תוכן Subject מלא; `completeSubjectDescriptor=false` והיעד המקורי של descriptor מלא טרם הושג. תוכן, lifecycle definitions, content verifier וראיות association/nonreuse נשארים חסרים; אין schema closure, אימוץ או credit מכוח הביקורות.

1.1.18 נוספה [Detached normative content V1 — Reconciliation](detached-normative-content-v1-review-reconciliation-2026-09-08.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` על סמנטיקה מוצעת ומיפוי מקור תחום. נכתבו 28 כללים ו־6 הרחבות סכמה נדרשות, כולל Subject→Dispatch, תוצאות SUCCESSOR מלאות ו־Comparison/Cut ישירים ל־Final. אין Subject descriptor מלא, AST executable או אימוץ; מלוא הסמנטיקה ההיסטורית וחוזי type/dispatch/rank נשארים פתוחים.

1.1.19 נוספה [Detached transaction V3 — Reconciliation](detached-transaction-v3-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` בתחום החוזה המקומי הכתוב. V1 נשמר עם FAIL/FAIL; V2 נשמר עם PASS של A ו־FAIL של B. ארבעת מזהי הממצאים קיבלו מענה תכנוני במפות Operands, בפרסום Final אטומי ובשוויון מלא של ראיות הניסיון בין כל הנתיבים וה־replay children. שמונה payloads מקומיים,40 Predicates ותשעה Profiles אינם Subject/lifecycle מלאים, אימוץ או ראיות בפועל; כל credit=0.

1.1.20 נוספה [Detached resource/policy V2 — Reconciliation](detached-resource-policy-v2-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` בתחום החוזה התכנוני הכתוב. DRP V1 נשמר עם FAIL/FAIL; V2 מתקן רשימות replay, קישור סדרת POINTER ו־fixture היסטורי. הוגדרו ארבעה payloads מוצעים למקור אמון, Credential ייעודי, RESOURCE ו־POLICY, עם צרכני DTC V5. יש12payloads מקומיים ו־45Predicates;11peer descriptors, Subject מלא וכל הראיות הממשיות נשארים חסרים. אין אימוץ או credit.

1.1.21 נוספה [Detached lifecycle payload V3 — Reconciliation](detached-lifecycle-payload-v3-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` בתחום החוזה התכנוני הכתוב. נכתבו 11 עצי payload שחסרו; כעת יש 23 עצי wire מקומיים מוצעים, עם הרשאות חתימה ופרופילי replay מפורשים. V1 ו־V2 נשמרים עם FAIL/FAIL; שבעת מזהי הממצאים קיבלו מענה תכנוני ללא acceptedClosure או credit. מלוא תוכן Subject, ראיית closure עצמאית וכל הראיות בפועל נשארים חסרים.

1.1.22 נוסף [Inherited requirement custody V1 — Reconciliation](inherited-requirement-custody-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` בתחום השחזור התיעודי בלבד. שוחזרו בדיוק 40 תנאי סגירה פרטיים מ־V1.7/V1.8 עם מקורות ו־byte spans; 17 הממצאים המאוחרים נשמרו בנפרד. התאמת טקסט אינה פירוק סמנטי, תוכנית או ראיית conformance. מלוא התוכן הטרנזיטיבי והראיות נשארים פתוחים; כל credit=0.

1.1.23 נוסף [Historical semantic obligations V2 — Reconciliation](historical-semantic-obligations-v2-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` בתחום ההצעה התיעודית הכתובה. נכתבו גרפי פעולה ותחולה ל־40 תנאי הסגירה: 146 יחידות פעולה ו־80 domains עם נימוק תחולה. V1 נשמר עם FAIL/FAIL; V2 תיקן שני corpus actor scopes ושמר בנפרד את חובות האבטחה של ה־readers. מקור התוכנית ההיסטורית של G1 שוחזר בדיוק. ששת חסמי הפירוש, מלוא הפירוק הטרנזיטיבי, תוכניות וראיות conformance נשארים פתוחים; כל credit=0.

1.1.24 נוסף [Source interpretation V1 — Reconciliation](source-interpretation-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות `PASS/PASS` בתחום החוזה התכנוני הכתוב. הוגדרו שני פרופילי extraction חדשים עם גבולות parent/terminal, עשרה owner routes ל־150 הפניות ו־grammar תחום לביטויי סכמה.61 מתוך63 schemas בעלי fieldTypes ריק משאירים full discovery חסום; מיפוי no-write ההיסטורי מול כתיבות הדחייה נשאר UNRESOLVED. אין parser שהופעל, אימוץ, semantic equivalence מלאה או credit.

1.1.25 נוסף [Source owner grammar V2 — Reconciliation](source-owner-grammar-v2-review-reconciliation-2026-09-09.md), לאחר V1 FAIL/FAIL ותיקון ב־V2 שקיבל שתי ביקורות עצמאיות PASS/PASS בתחום החוזה הכתוב. נכתבו63רשומות recovery, שלושה Core descriptors ושתי תצוגות Row עם19טיפוסים ו־51field slots. Core ו־Row מקבלים קלטים נפרדים; אין הכללת Root עצמי.61גופי fieldTypes היסטוריים נשארו ריקים; הגדרות היעד אינן אימוץ או conformance. אין credit.

1.1.26 נוסף [Source constructor/admission V2 — Reconciliation](source-constructor-admission-v2-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות PASS/PASS בתחום ההצעה הכתובה. שישה recipes ו־ASCII serialization מפורש נקשרו לשני modes ולעשרה שלבי source-use; ProfileCore4→Row7 נוסף לצד Member11→13 ו־Namespace9→10. בדיקת shape קודמת ל־projection; Root equality מאוחר. אין constructor שהופעל, conformance, אימוץ או credit.

1.1.27 נוסף [Source-use input/evidence V2 — Reconciliation](source-use-input-evidence-v2-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות PASS/PASS בתחום חוזי הנתונים המקומיים המוצעים. Context15, ingress מוקדם, six constructor branches, local prior references ו־stage-instance coverage נקשרו למסלולי הצלחה וכשל.12external evidence ports נשארים ללא actual schemas/authentication; אין ראיית ביצוע, Authority, Acceptance או adoption.

1.1.28 נוסף [Native ingress/context V2 — Reconciliation](native-ingress-context-v2-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות PASS/PASS בתחום גופי subject ויחסי consumer מוצעים. Host expectation/installation/current view, capture מאוחר ו־Context15 עם מקור לכל שדה נקשרו לשני profiles. actual native authentication/install/conformance ושני ה־external ports נשארים פתוחים; אין Authority/Acceptance/adoption.

1.1.29 נוסף [Native proof authentication V2 — Reconciliation](native-proof-authentication-v2-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות PASS/PASS בתחום חוזי origin/grant/signature/status וצריכה מוצעים. שש משפחות subject, חמשת תפקידי NEC ושלושה profiles נפרדים נקשרים לבחירת שימוש מוקדמת. Actual native authentication/status/enforcement/adoption וכל12ports נשארים פתוחים; כל credit=0.

1.1.30 נוסף [Native evidence source admission V1 — Reconciliation](native-evidence-source-admission-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות PASS/PASS בתחום דרישות לבחירת מקורות ראיה.12שורות דרישות,12ממדי מקור ושלוש רשימות NPA/NEC/SIE נפרדות שומרות מקור/אמת/אכיפה/adoption כחובות נפרדות. actual source selection, proof schemas וראיות בפועל unavailable; כלcredit0.

1.1.31 נוסף [KMS/OIDC source assessment — Reconciliation למסירת V3 / Machine V2](native-source-kms-oidc-v3-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות חדשות PASS/PASS בתחום מחקר תיעודי ותיקוני הפניות ומסגרת Human. היסטוריית V1 A=FAIL/B=PASS ו־V2 FAIL/FAIL נשמרה; Machine V2 ללא שינוי. KMS/OIDC נשארים מועמדים לרכיבי חתימה וגישה; לא נבחרו מקור NPA, runtime, מפתח, אלגוריתם או סמכות. כל 12 תלויות NPA וכל credit נשארים פתוחים/0.

1.1.32 נוסף [NEXT-01 — מסמך בחירת משפחת הרצה למנגנון אימות הראיות](native-verifier-boundary-decision-brief-v1-2026-09-09.md), עם [Reconciliation](native-verifier-boundary-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות PASS/PASS בתחום מסמך ההחלטה בלבד. שלוש חלופות: תהליך ייעודי במחשב שבשליטת Tal, משימת CI נפרדת או שירות. ההמלצה ל־batch מותנית בצורך בהערכה נקודתית. בעת הקפאת ה־brief לא התקבלה תשובה; משפחה אינה runtime/consumer/resource/action מלאים, NEXT-01..05 לא נסגרו וכל credit=0.

1.1.33 נוסף [SOURCE-CONJUNCT span contract V1](source-conjunct-span-contract-proposal-v1-2026-09-09.md), עם [Reconciliation](source-conjunct-span-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות PASS/PASS על אותו זוג קפוא. נכתב descriptor נפרד לשמונה שדות עם קשרי Member/Carrier/owner/span/digest ו־locator. אין החלפת schemaRoot היסטורי או סגירת גילוי/סמנטיקה/native source; NEXT-01..05 נשארים unknown/unavailable וכל credit=0.

1.1.34 נוסף [SOURCE-CONJUNCT owner/use V2](source-conjunct-owner-use-contract-proposal-v2-2026-09-09.md), עם [Reconciliation](source-conjunct-owner-use-v2-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות חדשות PASS/PASS על אותו זוג V2 קפוא. V1 נשמר עם FAIL/PASS וממצא SCO-A-001. הבחירות E_P/E_U קשורות ל־owners נפרדים עם שוויון מלא של בחירת המקור. שלושה מיפויי owner/occurrence/use מפרידים בחירה עצמאית מוקדמת מ־owner/Root מאוחרים וקושרים מערכי predecessor לעותקי predicate. full owner/selection grammar ואימות מקור בפועל נשארים unavailable; כל credit=0.

1.1.35 נוסף [Source occurrence inventory grammar V1](source-occurrence-inventory-grammar-proposal-v1-2026-09-09.md), עם [Reconciliation](source-occurrence-inventory-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות PASS/PASS על אותו זוג קפוא. נכתבו container ושני entry bodies סגורים לארבע משפחות7/10/5/16, עם בחירת profile עצמאית לפני I וקישור owner/selection אחריו. full O/E, מקורות האימות ואוסף השימושים המלא נשארים unavailable; כל credit=0.

1.1.36 נוסף [Source owner/selection content V1](source-owner-selection-content-proposal-v1-2026-09-09.md), עם [Reconciliation](source-owner-selection-content-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות PASS/PASS על אותו זוג קפוא. נכתבו שישה גופי expected content מקומיים ל־O/E, עם full inline parent/selection, ייבוא הגדרות מלא וקישור מפורש ל־SIE ledger, למקור I ולגבולות מוקדמים. זו הצעת תוכן חדשה; actual input/native proof schemas, מקורות האימות, collections ו־adoption נשארים unavailable; כל credit=0.

1.1.37 נוסף [Source owner diagnostic V2](source-owner-diagnostic-proposal-v2-2026-09-09.md), עם [Reconciliation](source-owner-diagnostic-v2-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות עצמאיות PASS/PASS על אותו זוג קפוא. V1 נשמרה עם FAIL/FAIL על ספירת imports סותרת; V2 מתקנת ל־13 ההגדרות הקיימות. ההצעה תחומה ל־raw/check diagnostic summaries תחת D עצמאי, עם הפרדת כשל, חוסר ראיות ו־not evaluated. אין גוף decoded מלא, מקור native או סמכות חדשה; כל credit=0.

1.1.38 נוסף [Source owner decoded view V2](source-owner-decoded-view-proposal-v2-2026-09-09.md), עם [Reconciliation](source-owner-decoded-view-v2-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות FINAL חדשות ועצמאיות PASS/PASS על אותו זוג קפוא. V1 נשמרה עם FAIL/PASS עקב SOV-A-001: meaning משותף לשלושה SCI labels הוסיף תנאים שאינם שייכים לכולם. V2 מפרידה את המשמעויות לפי המקור. נכתבה מפת 121 הגדרות מקור מול 124 טיפוסי תצפית, עם שלושה family splits וחובות השוואה מפורשות. שגיאות סמנטיות ניתנות לייצוג בלי repair או שינוי הטיפוס המצופה. זו הצעת קטלוג מקומית; native proof/decoder/installation/conformance/adoption אינם נסגרים וכל credit=0.

1.1.39 נוסף [Source value comparison V1](source-value-comparison-proposal-v1-2026-09-09.md), עם [Reconciliation](source-value-comparison-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות FINAL עצמאיות PASS/PASS על אותו זוג קפוא. שישה גופי claim מקומיים קושרים expected/observed מלאים; EQUAL דורש השוואת ערכים מלאה, ו־DIFFERENT מספק witness יחיד ללא full traversal/coverage. Q0 קודם לקליטה; Q1 קושר תצפית קיימת לפני השוואה, בלי לשנות את Q0. זו הצעת תוכן בלבד; actual native proof/result transport, הרשאות, הרצה ו־adoption נשארים פתוחים וכל credit=0.

1.1.40 נוספה [Source comparison evidence requirements V1](source-comparison-evidence-requirements-v1-2026-09-09.md), עם [Reconciliation](source-comparison-evidence-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות FINAL עצמאיות PASS/PASS על אותו זוג קפוא. המטריצה מגדירה 17 חובות ראיה ותשעה פרופילי ביקורת לפי מופע, צרכן ושלב, בלי runtime type או proof wrapper. נפרדים Q0/Q1, readiness/enforcement/capture, equality/witness ופעולות report מותנות. Actual sources/native schemas/הרשאות/ראיות/אימוץ אינם נסגרים; כל credit=0.

1.1.41 נוספה [Historical atomic footprint assessment V1](historical-atomic-footprint-assessment-v1-2026-09-09.md), עם [Reconciliation](historical-atomic-footprint-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות FINAL עצמאיות PASS/PASS על אותו זוג קפוא. נבדקו65 השוואות ו־17 זהויות durable היסטוריות מול תפקידים וכתיבות בחוזה הנוכחי, ללא התאמת שימור מוכחת. מסקנת אי־התאימות ל־no-write מותנית באותה פעולה, אותו כשל, אותו תחום כתיבות ואותו גבול אטומי; הנחות המיפוי אינן מוכחות. HSC-SG006 נשאר פתוח ושתי חלופות SIP לא נבחרו; כל credit0.

1.1.42 נוספה [Source owner/use collection content V1](source-owner-use-collection-content-proposal-v1-2026-09-09.md), עם [Reconciliation](source-owner-use-collection-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות FINAL עצמאיות PASS/PASS על אותו זוג קפוא. ארבעה גופי expected content מלאים מגדירים owner domain, source selections, predicate owners ו־predicate selections, עם שלושה bijections יחסיים, זהות אוסף לוגית וייחודיות predicates החוצה קבוצות. מקור המופעים, no-alias ושלמות התחום הצפוי נשארים דרישות חיצוניות בלתי־מוכחות; כל credit0.

1.1.43 נוספה [Independent finding closure requirements assessment V1](independent-finding-closure-requirements-assessment-v1-2026-09-09.md), עם [Reconciliation](independent-finding-closure-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות FINAL עצמאיות PASS/PASS על אותו זוג קפוא. מופו19 minimum fields, שלוש הופעות צריכה, שבע חובות בחירה ועשר הרחבות integration. Finding אינו קושר בעצמו criterion/program; נדרש מיפוי עצמאי לפי provenance מלא. authentication14/time13/phase3 אינם כוללים Closure. לא נכתב FCS wire או proof מלא ולא נבחר criterion בפועל; כל credit0.

1.1.44 נוסף [Review finding SUBJECT operand content V1](review-finding-subject-operand-content-proposal-v1-2026-09-09.md), עם [Reconciliation](review-finding-subject-operand-v1-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות FINAL עצמאיות PASS/PASS על אותו זוג קפוא. נכתב גוף קלט מקומי לשלוש הופעות SUBJECT, עם source occurrence קונקרטי, Finding מקורי, actual target ו־expected Subject עצמאי. ROOT-EQUAL ו־ROOT-PRECEDES נשארים נפרדים; אין full Review PASS כתנאי לייצוג ערכי קלט שגויים.16 imports ו־13 טיפוסים חדשים אינם native proof או קריטריון סגירה מלא; כל credit0.

1.1.45 נוסף [Review finding SUBJECT check report V2](review-finding-subject-check-report-content-proposal-v2-2026-09-09.md), עם [Reconciliation](review-finding-subject-check-report-v2-review-reconciliation-2026-09-09.md), לאחר שתי ביקורות FINAL עצמאיות PASS/PASS על אותו זוג קפוא. V1 נשמר עם FAIL/FAIL בגלל תלות מעגלית בין בחירת תקציב לבין קישור תצפית. V2 מפריד A0 מוקדם לניתוח מ־D0 מאוחר לדיווח; גוף מקומי עם שני Checks משמר claim מקורי, פעילות, תצפיות וחסמים בנפרד. אין native result/AST TRUTH/Closure או credit.

## 1.2 החלטות Tal המחייבות את התוכנית

1.2.1 `V01=public-no-license-until-legal`: המאגר נשאר ציבורי, אך אינו מעניק רישיון שימוש חדש עד Legal/ownership review.

1.2.2 `V02=approve-each-security-use`: כל שימוש באקראיות קריפטוגרפית דורש אישור נפרד, מדויק ומוגבל.

1.2.3 `V03=wait-live`: מספרי WhatsApp חיים אינם נקבעים ללא Evidence מהחשבון.

1.2.4 `V04=defer`: Billing אוטומטי נדחה עד אחרי Pilot.

1.2.5 `V05=wait-eligible`: Tal אינו מאשר Planning root לפני שהחבילה זכאית.

1.2.6 `V06=keep-active`: הקפאת הפיתוח נשארת פעילה עד שער מתאים.

1.2.7 כל `2/2` ההצבעות הזכאיות ב־`CONNECT-ELIGIBLE-TAL-VOTES-V2` נענו; אין כרגע הצבעה זכאית פתוחה.

# 2. שלב 1 — פרסום בטוח של המצב המקומי ל־GitHub

## 2.1 מה השלב אומר

2.1.1 שומרים את כל העבודה הבטוחה במאגר הציבורי בלי לפרסם Secret, מידע לקוח, קובץ סביבת עבודה פרטי או תוצר זמני מסוכן.

2.1.2 מצב ביצוע=`COMPLETED` ב־30.08.2026; Evidence מפורט ב־
[יומן הביצוע הרציף](current-sequential-execution-ledger-2026-08-30.md).

## 2.2 משימות

2.2.1 למפות כל נתיב Modified, Staged, Untracked ו־Ignored.

2.2.2 לוודא ש־`.env`, ‏`.wrangler`, Build outputs, מסדי נתונים מקומיים ומפתחות פרטיים אינם נכנסים ל־Commit.

2.2.3 לסרוק את ה־staging המדויק באמצעות Gitleaks וסריקת Secret hygiene של הפרויקט.

2.2.4 לבדוק שאין קובץ מעל מגבלת GitHub ושאין Symlink או Nested repository שנכנס בטעות.

2.2.5 להריץ בדיקות, ליצור Commit אחד המתאר את המצב, לבצע Push לענף הנוכחי ולקרוא בחזרה את ה־remote SHA.

## 2.3 מה צריך מ־Tal

2.3.1 אין צורך ב־Token בצ׳אט. נדרשת רק הרשאת GitHub שכבר מוגדרת במחשב.

## 2.4 תנאי סיום

2.4.1 `local HEAD == remote branch HEAD`, ‏Secret scan עבר או שכל Finding סווג ונחסם, והמאגר אומת `PUBLIC`.

2.4.2 תנאי 2.4.1 התקיים עבור commit
`840a46e68c2b19e32feb4b940d446350ce1f525b`. התאמת היסטוריה רחבה
נשמרה כ־false-positive candidate קיים ואינה נחשבת אישור להחלשת Scanner.

# 3. שלב 2 — הקפאת תמונת מצב ומקורות

## 3.1 מה השלב אומר

3.1.1 מצלמים במדויק מה קיים בקוד, במסמכים, בענפים ובמקורות החיצוניים כדי שהמשך התוכנית לא יתבסס על רשימה חלקית.

3.1.2 מצב ביצוע=`COMPLETED-AS-LOCAL-CANDIDATE;EXTERNAL-BLOCKED`;
תצפית ה־Preflight נמצאת ב־
[Discovery Cutoff preflight](discovery-cutoff-preflight-observation-2026-08-30.md).

3.1.3 Cutoff v1 נשמר כראיה היסטורית על observed commit `0f0b0e9`,
עם Package root
`a790725dc20b73094f7317503850641bcfea748d56bea480500c00ee87a97c17`.
הוא אינו Cutoff עדכני ל־Source Universe v4 מפני שה־Toolchains של B0,
Protocol ו־v4 נוספו לאחריו.

3.1.4 Cutoff v2 נוצר על observed commit
`4aab362fe162f421eabf3f379a3f4018f7adf516`, עם Package root
`cbf1c7a6735f3525dc149181e7a85ed635cc45e0f6dd071b63ddb39a740a7e0a`.
הוא מקפיא מראש `4` פלטי Cutoff ו־`28` פלטי Source Universe v4:
`23` חברי Candidate ו־`5` פלטי Review/Acceptance. ‏Verifier חוזר עבר,
אך המועמד אינו Accepted וחסמי 3.3 נשארים פתוחים. לאחר יצירתו נוסף
Commit `77378b0` ששינה שלושה מסמכי Planning מחוץ לנתיבי הפלט המוצהרים;
לכן status=`VALID-HISTORICAL-CANDIDATE;STALE-FOR-V4-GENERATION` ונדרש
Cutoff v3 טרי לאחר הקפאת Toolchain v4 המלא.

3.1.5 Cutoff v3 הופק על observed commit
`259bc81a667c2eeb4987d284cc4443b1db2f9e90` ושימש בפועל את Source
Universe v4 Generation A. ‏Candidate commit=`45abe51`; Cutoff package
root=`d2ac38f3799085f8db46e98f1e3da86a056a86d45b21a09cc890a2607e598930`.

## 3.2 משימות

3.2.1 להפיק Discovery Cutoff עם HEAD, ‏tracked, modified, staged, untracked, ignored, refs ונתיבי מקור שסופקו.

3.2.2 לסווג כל מקור `PUBLIC-SAFE`, ‏`PRIVATE-REQUIRED`, ‏`PROHIBITED` או `UNKNOWN`.

3.2.3 להפריד User directive, Specification, Official source, System observation ו־Derived planning.

3.2.4 לקבע כל מקור רשמי עם URL, bytes או receipt בטוח, זמן תצפית, גרסה, תחום ותאריך תפוגה.

3.2.5 לאסור Self-membership: פלט חדש אינו יכול להיות מקור של עצמו.

3.2.6 Status מקומי: `COMPLETED-AS-V3-CANDIDATE`; observed commit=
`259bc81`; Candidate commit=`45abe51`; independent review=`PENDING`.

## 3.3 מה צריך מ־Tal

3.3.1 את קובצי האפיון המקוריים, אם חסרים, ואת זהות הבעלים שלהם; אין לשלוח חומר שאין זכות לפרסם.

## 3.4 תנאי סיום

3.4.1 Candidate source set מלא, רשימת חסרים מפורשת ו־Cutoff receipt שניתן לשחזר.

# 4. שלב 3 — B0 Successor חדש

## 4.1 מה השלב אומר

4.1.1 B0 הוא מעטפת הסמכות הבסיסית: מי רשאי להחליט, מי בודק, כיצד מונעים אישור עצמי ואיך שינוי נכתב אטומית.

## 4.2 מצב פתיחה

4.2.1 B0 v7 נדחה; `14/14` Findings פתוחים: `P0=10`, ‏`P1=4`; ‏B0=`ABSENT`.

4.2.2 B0 v8 נבנה כ־Immutable local Candidate: `14/14` Controls
מומשו מקומית, `14/14` Mutations נחסמו ושני Cross-runtime Readers עברו.
זהו QA של אותו Producer: independent Closure=`0/14`, ‏B0=`ABSENT`,
‏Acceptance=`0` ו־Gate29=`BLOCKED`.

## 4.3 משימות

4.3.1 לבנות v8 בלתי־משתנה ולא לערוך את v7. Status=`COMPLETED-AS-CANDIDATE`.

4.3.2 לתקן Path confinement, Symlink rejection, closed schemas ו־canonical serialization. Status=`COMPLETED-LOCAL-CONTROL`.

4.3.3 להפריד בין סמכויות לוגיות במנגנון הבקרה. Tal נשאר Owner יחיד של העבודה, אך אינו רשאי לטעון שביקורת עצמית היא ביקורת עצמאית; אם Gate דורש Reviewer עצמאי, הוא נשאר חסום עד Evidence חיצוני אמיתי.

4.3.4 להגדיר CAS, replay, response loss, outbox ו־recovery כמעבר מצב אטומי אמיתי ולא כ־Boolean נטען. Status=`COMPLETED-REFERENCE-REDUCER;DURABLE-ADAPTER-EVIDENCE-PENDING`.

4.3.5 ליצור mutation corpus שמפיל כל החלשה של Visibility, Authority, Recovery, Acceptance או Permit. Status=`COMPLETED-14-OF-14-LOCAL`.

4.3.6 להריץ Producer QA ושני Readers; לאחר מכן ביקורת עצמאית שאינה משתמשת בתוצאות ה־Producer כסמכות. Status=`PRODUCER-QA-AND-TWO-CROSS-RUNTIME-READERS-PASS;INDEPENDENT-REVIEW-PENDING`.

## 4.4 מה צריך מ־Tal

4.4.1 אין צורך בשמות Primary/Backup. Tal אחראי להכין את החבילה; אם תנאי הקבלה דורש סמכות מקצועית או מבקר עצמאי, Tal יתאם אותו בעתיד וישמור את ה־Evidence.

## 4.5 תנאי סיום

4.5.1 כל `14/14` Findings מקבלים Closure עצמאי, B0 current pointer נוצר ללא self-acceptance ו־Acceptance מתקבל מגורם מוסמך.

# 5. שלב 4 — Three-review Protocol Successor

## 5.1 מה השלב אומר

5.1.1 זהו ספר החוקים של הביקורת: מי בודק, באיזה סדר, אילו ראיות נדרשות ומה קורה כאשר ביקורות חולקות זו על זו.

## 5.2 מצב פתיחה

5.2.1 Protocol v1.9 נדחה; `17` Findings קיימים ורק קרדיט מכני יחיד נשמר ללא Acceptance.

5.2.2 v1.10 G0 נבנה אך ביקורת עצמית גילתה שתי חולשות: מחלקות
הביקורת לא היו סגורות ותלות B0 core לא נכללה ב־Manifest. הוא נשמר
כ־`SUPERSEDED-BY-G1;NO-CLOSURE-CREDIT`.

5.2.3 v1.10 G1 נבנה כ־Immutable local Candidate: `15/15` Validators
עוברים במסלול Protocol vector, `17/17` Mutations נחסמות ושני
Cross-runtime Readers עוברים. independent Closure=`0/17` ו־Acceptance=`0`.

## 5.3 משימות

5.3.1 לבנות v1.10 בלתי־משתנה עם schema סגור לראיות חיצוניות ולתוצאות Validators. Status=`COMPLETED-AS-G1-CANDIDATE`.

5.3.2 להוכיח שכל Validator חיצוני יכול לקבל Input אמיתי, להצליח במסלול חיובי ולהיחסם בכל Mutation שלילית. Status=`PROTOCOL-VECTOR-15-OF-15;LIVE-EXTERNAL-EVIDENCE-PENDING`.

5.3.3 להפריד Producer, Reader A, Reader B, Reviewers, Reconciler ו־Acceptance writer. Status=`LOGICAL-SLOTS-COMPLETE;EXTERNAL-APPOINTMENTS-PENDING`.

5.3.4 להוסיף Path safety, canonical JSON, finite denominators, trusted time, expiry, revocation ו־CAS. Status=`LOCAL-CONTROLS-COMPLETE;TRUSTED-TIME-AND-DURABLE-ADAPTERS-PENDING`.

5.3.5 להגדיר שלוש ביקורות: Structural, Semantic/Security ו־Estimate/Schedule, עם Findings שאסור למזג. Status=`CLOSED-REVIEW-CLASSES-COMPLETE;ACTUAL-REVIEWS-PENDING`.

## 5.4 מה צריך מ־Tal

5.4.1 Tal נשאר אחראי יחיד לעבודה. אין חלוקת Primary/Backup ואין
שמות אחראים נוספים. כאשר Gate ידרוש Reviewer עצמאי בפועל, Tal יתאם
Evidence חיצוני; QA של אותו Producer לא ייחשב ביקורת עצמאית.

## 5.5 תנאי סיום

5.5.1 כל Findings נסגרו בנפרד, שני Readers הורגים את כל ה־Mutations וה־Protocol מקבל pointer Accepted מכוח B0.

# 6. שלב 5 — Source Universe ו־Custody

## 6.1 מה השלב אומר

6.1.1 יוצרים רשימה מלאה של כל העובדות, ההוראות והראיות שמותר לתוכנית להשתמש בהן, ומגדירים היכן מותר לשמור כל מקור.

## 6.2 מצב פתיחה

6.2.1 Source Universe v3 נדחה עם `24` Findings; v4 קיים כ־Build charter בלבד ואינו Source Universe Accepted.

6.2.2 Output registry סגור: `23` נתיבי Package ועוד `5` נתיבי
Review/Acceptance. ‏Cutoff v3 הופק אחרי הקפאת Toolchain מלא, ו־Source
Universe v4 local Candidate נוצר ב־Commit `45abe51`: ‏`23/23` חברי
Package קיימים, `5/5` פלטי Review/Acceptance חסרים במכוון, והשלב הוא
`COMPLETED-AS-LOCAL-CANDIDATE;EXTERNAL-BLOCKED`.

## 6.3 משימות

6.3.1 להקפיא את Toolchain v4, להפיק Discovery Cutoff v3 טרי, ורק ממנו ליצור
SourceOccurrenceLedger ו־TargetSpanLedger. אין לשנות אף אחד מ־28 נתיבי
הפלט בלי restart לדור חדש. Status=`COMPLETED-GENERATION-A`.

6.3.2 להקצות Sole producer לכל Object ולבנות Graph של שימושים מפורשים
והפוכים. Status=`COMPLETED-LOCAL-CANDIDATE`.

6.3.3 להפריד Public projection מ־Private custody; Unknown נחסם מפרסום.
Status=`COMPLETED-LOCAL-CONTROL;PRIVATE-CUSTODY-EVIDENCE-PENDING`.

6.3.4 להגדיר Freshness, authenticity, legal basis, retention
ו־invalidation לכל מקור. Status=`COMPLETED-AS-CONTRACT;LIVE-EVIDENCE-PENDING`.

6.3.5 לשמר כל Requirement ו־Finding קודם ברמת clause, בלי Range credit
ובלי Merge-by-presence. Status=`COMPLETED-LOCAL-CROSSWALK;INDEPENDENT-CLOSURE-0`.

6.3.6 להריץ שתי Generations, שני Readers ושלוש ביקורות לפי Protocol
Accepted בלבד. Status=`GENERATION-A-AND-TWO-LOCAL-READERS-PASS;
GENERATION-B-AND-THREE-INDEPENDENT-REVIEWS-PENDING`.

## 6.4 מה צריך מ־Tal

6.4.1 אישור זכויות למסמכי האפיון וזהות Private evidence store אם מקור אינו בטוח לפרסום.

## 6.5 תנאי סיום

6.5.1 Source Universe current pointer Accepted, כל `24/24` Findings סגורים ורשימת מקורות חסרים מפיקה Block במקום השמטה.

# 7. שלב 6 — TRD-2 Successor

## 7.1 מה השלב אומר

7.1.1 TRD-2 מגדיר באופן טכני מה המערכת חייבת לעשות, אילו מצבים קיימים ואיך הופכים דרישות למשימות ניתנות לבדיקה.

## 7.2 מצב פתיחה

7.2.1 TRD-2 v5 נדחה; `15` Findings פתוחים: `P0=12`, ‏`P1=2`, ‏`P2=1`; accepted Requirements=`0/128`.

## 7.3 משימות

7.3.1 לבנות v6 חדש עם parser קשיח, canonical root יחיד ו־unknown-field rejection עקבי.

7.3.2 להחליף Membership graph ב־typed semantic producer graph.

7.3.3 לתת לכל Requirement predicate ותסריטי Positive/Negative ייחודיים ולא Harness גנרי בלבד.

7.3.4 לפתור מעגלי Acceptance, Generation, Reconciliation, Head ו־Invalidation.

7.3.5 להגדיר Retention, Legal Hold, Erasure, Restore ו־Backup כ־Data classes נפרדים.

7.3.6 להוכיח שתי Generations, Reconciliation ו־Definition Acceptance באמצעות ראיות חיצוניות.

## 7.4 מה צריך מ־Tal

7.4.1 תשובות עסקיות חדשות רק אם מתגלה Conflict אמיתי; אין צורך לכתוב קוד.

## 7.5 תנאי סיום

7.5.1 כל `128` Requirements נבדקים, `15/15` Findings נסגרים ו־Task Registry Definition מקבל Acceptance.

## 7.6 עדכון ביצוע — Pass 1

7.6.1 Pass 1 הושלם כמועמד מקומי וקובע ב־Candidate commit
`b4195d86109b45bd42983d54682f1300e9177070`; Toolchain commit=
`4817c16f8be832392dfeb5d7e94378dbf9b60e61`.

7.6.2 הושלמו source custody, canonical root profile, closed parser
fixture schema, `3` positive fixtures, ‏`15` hostile negative fixtures,
שני מימושי Parser נפרדים ו־Pass 1 Producer QA.

7.6.3 שני המפרשים הסכימו על `18/18` outcomes עם `0` mismatches;
זהו Mechanical evidence בלבד ואינו סוגר Requirement או Finding.

7.6.4 סטטוס משימות 7.3: רכיב ה־parser וה־canonical foundation של
7.3.1=`COMPLETE-PASS-1-LOCAL-CANDIDATE`; יתרת 7.3.1 ו־7.3.2–7.3.6=
`PENDING-PASSES-2-TO-6-AND-EXTERNAL-REVIEW`.

7.6.5 המונים המחייבים לא השתנו: accepted Requirements=`0/128`;
Finding closure=`0/15`; review generations=`0/2`; Reconciliation ו־
Definition Acceptance=`ABSENT`; ‏Gate29=`BLOCKED`; development freeze=
`ACTIVE`.

7.6.6 Pass 2 v1=`REJECTED-LOCAL-CANDIDATE`: אמנם שני engines הסכימו
על `318/318` fixtures פנימיים, אך Self-review הוכיח שהם לא כיסו רשומות
v6 אמיתיות ולכן agreement לא היווה conformance.

7.6.7 סטטוס 7.3.1=`PASS-2-V2-RESTART-REQUIRED`; שבע מתוך שבע
משפחות אמיתיות שנדגמו נכשלו exact-key conformance; Requirement schema
חסר ארבעה מחמשת שדות התוכן המחייבים.

7.6.8 המשימה הפעילה הבאה=`Pass 2 v2`: predeclare successor paths,
לבנות nested/nullable schemas, לקפוא actual-positive inventory ולהריץ
שני engines. Pass 3 חסום עד שה־missing/extra denominator יהיה `0`.

7.6.9 Pass 2 v2=`COMPLETED-AS-LOCAL-CANDIDATE`; Candidate commit=
`b68b80e61f614c05d50093f5f9feec6d98e486d8`; Registry root=
`aa9ac9f3a6a697a13eb6fe3a236c7c7088adb5fbe63313c74a4c386d4b6ecf19`.

7.6.10 actual positives=`391/391`; Requirements=`128/128`; separate source
bindings=`128/128`; mutations blocked=`124/124`; two-engine agreement=
`515/515`; missing/extra=`0`; self-review remediation=`5/5-LOCAL`.

7.6.11 full gates=`3960/3960 tests;TypeScript PASS;ESLint 0 errors/28
historical warnings;Source guardrails PASS;Secret hygiene PASS`; post-commit
verifier=`COMMITTED-CLEAN`.

7.6.12 המשימה הפעילה הבאה=`Pass 3`: לבנות Clause AST לכל `128`
הדרישות, שבע משפחות State machine וכיסוי מלא של כל State/Event/Terminal.
ה־Candidate עדיין מעניק `0` Closure ו־`0` Acceptance.

7.6.13 Producer self-review מאוחר של Pass 2 v2 מצא `1 P0`: ‏`25`
ה־Schemas מכסים היטב רשומות קיימות, אך `FUTURE-CONSTRUCTION schemas=0`.
לכן אין Schema קפוא ל־Subject, Clause AST, State machine, Graph, Vector,
Package או Acceptance records.

7.6.14 Pass 2 v2=`REJECTED-AS-COMPLETE-REGISTRY`; ה־bytes נשמרים
כהיסטוריה, `515/515` נשאר Evidence לתחום הקיים בלבד, ו־Pass 3 נעצר
לפני יצירת כל אחד משלושת הפלטים שלו.

7.6.15 המשימה הפעילה=`Pass 2 v3`: Output Registry successor חדש,
איחוד `25` ה־Schemas האמיתיים עם קטלוג סגור לכל משפחות Passes 3–6,
מפת Output→Schema, Construction fixtures, mutations ושני engines.

7.6.16 Pass 2 v3=`COMPLETED-AS-LOCAL-CANDIDATE`; Candidate commit=
`1e33fcd78f39df9acec4a4483411b1bea8eb8820`; Registry root=
`6374ced141b6a1bafff816e1676a5004dbcb51b4fd8fc0437b1b2eb7be6c83e6`.

7.6.17 Schemas=`82=25 actual+57 future`; Output→Schema=`30/30`;
fixtures=`789=391 actual+124 actual mutations+57 constructions+217 future
mutations`; Invariants=`50/50`; two-engine agreement=`789/789`; mismatch=`0`.

7.6.18 full gates=`3972/3972 tests;two builds PASS;TypeScript PASS;ESLint 0
errors/28 historical warnings;Source guardrails PASS;Secret hygiene PASS`;
post-commit verifier=`COMMITTED-CLEAN`; remote readback exact.

7.6.19 המשימה הפעילה הבאה=`Pass 3 v2`: לבנות Subject, לקמפל `128`
Clause AST programs ולממש שבע משפחות State Machine בנתיבי v3 בלבד.
ה־Candidate ממשיך להעניק `0` Closure ו־`0` Acceptance.

7.6.20 Pass 3 v2=`COMPLETED-AS-LOCAL-CANDIDATE`; Candidate commit=
`50007de6dd7a28740514fe6070fa804f4bd0e8f5`; remote readback exact.

7.6.21 roots: Subject=
`4f02df67992c3fadbd64bc104cdff1b149889ca912370fa3f2594e4805f95fb8`;
Clause AST=
`120cac68a82eca4bb1169cabaf7a591a57ccca8498a6334306806e4bbdf79a7d`;
State Machine=
`782fdc11ee64943b174dd0616c0b7c3820537f4f991b68a2c7639db45914e04d`.

7.6.22 exact local denominators=`128 Requirements;128 Bindings;128 Programs;
44 Operators;492 Clause Nodes;492 Counterexample Obligations;7 state families;
17 machines;3554 transitions;7879 expanded transitions;3200 lifecycle tuples`.

7.6.23 full gates=`3984/3984 tests;two builds PASS;TypeScript PASS;ESLint 0
errors/28 historical warnings;Source Guard PASS;Secret hygiene PASS`;
two-engine disagreement=`0`; hostile mutations=`8/8 BLOCK`; post-commit
verifier=`COMMITTED-CLEAN`.

7.6.24 המשימה הפעילה הבאה=`Pass 4`: להפיק Causal Graph מלא ושני Graph
Engine reports. מנגנון Overlay/Invalidation ייבנה וייבדק, אך הפלט הסופי
יידחה עד שקיימים שורשי Pass 5/6 אמיתיים. Atomic Package נשאר Pass 6.

7.6.25 accepted Requirements=`0/128`; Finding closure=`0/15`; review
generations=`0/2`; Reconciliation ו־Definition Acceptance=`ABSENT`;
Gate29=`BLOCKED`; development freeze=`ACTIVE`.

# 8. שלב 7 — Master Control Sequence Successor

## 8.1 מה השלב אומר

8.1.1 זהו סדר ההפעלה המרכזי שמונע מעבר לשלב מאוחר לפני שכל הקלטים והסמכויות קיימים.

## 8.2 מצב פתיחה

8.2.1 v2 נדחה; predecessor closures accepted=`0/32`; new finding acceptances=`0/35`; Gate30 לא הושג.

## 8.3 משימות

8.3.1 לבנות v3 ללא מעגל B0/Protocol ולתת Producer חיצוני לכל Appointment, Policy, Permit ו־trusted-time input.

8.3.2 לתקן Self-dependent estimation: Task estimates נוצרים רק לאחר Task denominator ולא נדרשים לפני יצירתו.

8.3.3 להגדיר Sole producer ל־Program root, Planning Permit ו־normalizer runs.

8.3.4 להסיר Acceptance-of-Acceptance recursion ולייצר base generation מפורש.

8.3.5 לחייב את כל Authority, environment, actor, scope, permit ו־evidence joins בכל Post-Gate edge.

8.3.6 להוכיח Safe terminals עבור missing, stale, revoked, replayed, conflict ו־response-loss states.

## 8.4 מה צריך מ־Tal

8.4.1 אין אישור root עדיין; Tal יתבקש רק לאחר שה־Sequence יעבור ביקורות.

## 8.5 תנאי סיום

8.5.1 מסלול יחיד, סופי וא־מחזורי מגיע ל־Planning handoff; כל `67` זהויות Finding נשמרות ונסגרות בנפרד.

# 9. שלב 8 — Public repository ו־Cyber hardening

## 9.1 מה השלב אומר

9.1.1 מגינים על קוד שגלוי לכל העולם ומוודאים ששום קובץ ציבורי אינו פותח דרך ל־Secrets, Supply-chain attack או שינוי לא מאושר.

## 9.2 מצב פתיחה

9.2.1 v5 נדחה; `18` Findings פתוחים: `P0=17`, ‏`P1=1`; כל ארבעת ה־Operational Permits חסרים.

## 9.3 משימות

9.3.1 לבנות v6 עם נתיבי Repo-relative נכונים ו־canonical JSON אחיד בין שפות.

9.3.2 לקשור Findings, Requirements, Outputs, Producers ו־Permits ל־Acceptance באמצעות Causal graph אמיתי.

9.3.3 להגן על `main` באמצעות Ruleset, Required CI, Code review, CODEOWNERS ו־signed provenance במגבלות חשבון GitHub.

9.3.4 להפעיל Secret scanning, Dependency review, SAST, artifact integrity ו־release attestations.

9.3.5 להגדיר Public egress policy, license state, contribution policy, issue/PR privacy ו־incident response.

9.3.6 להריץ Hostile mutations על visibility, permit class, lifecycle, schema roots ו־publication scope.

## 9.4 מה צריך מ־Tal

9.4.1 GitHub Admin או Member מתאים; אין לשלוח Personal Access Token בצ׳אט.

## 9.5 תנאי סיום

9.5.1 `18/18` Findings סגורים, ארבעת ה־Permits ניתנים רק במסלולים הנכונים ו־live GitHub readback תואם את המדיניות.

# 10. שלב 9 — OpenAI D02-A10

## 10.1 מה השלב אומר

10.1.1 מגדירים כיצד ה־AI חושב ומציע תשובה בלי לקבל סמכות עצמאית לשלוח, למחוק, לשלם או לשנות מערכת.

## 10.2 מצב פתיחה

10.2.1 D02-A9 נדחה; `8` Findings חדשים פתוחים, ורק `2/7` סגירות קודמות התקבלו; AI runtime נשאר `OFF`.

## 10.3 משימות

10.3.1 לבנות D02-A10 בלתי־משתנה עם typed evidence למודל, Prompt, Tool profile, Account, Tenant, Legal ו־approvals.

10.3.2 לקשור operation identity ל־authority, trusted time, expiry, revocation, CAS, consumption ו־post-readback.

10.3.3 לחייב Source refresh אמיתי; `checked=0` אינו PASS.

10.3.4 לחסום Symlink, path escape, stale evidence, non-admitted model ו־reusable provider prompt ללא Admission.

10.3.5 לבנות Evals חיוביים ושליליים ל־Prompt injection, data leakage, unsafe tool call, cross-tenant access והודעה ללא אישור אדם.

10.3.6 ליישם כל שימוש באקראיות קריפטוגרפית רק לאחר בקשת אישור V02 נפרדת.

## 10.4 מה צריך מ־Tal

10.4.1 OpenAI company project דרך Membership, תקציב, Data controls ואישור אדם מוגדר; אין להעביר API key במסמך.

## 10.5 תנאי סיום

10.5.1 `8/8` Findings נסגרים, Evals עוברים, AI נשאר fail-closed ו־Runtime Permit נוצר רק אחרי Gate מתאים.

# 11. שלב 10 — חיבור שש חבילות היסוד ואישור Planning

## 11.1 מה השלב אומר

11.1.1 מחברים B0, Protocol, Source Universe, TRD-2, Control Sequence ו־Public/Cyber לחבילת תכנון אחת בלי לאבד Finding או סמכות.

## 11.2 משימות

11.2.1 להקפיא exact root לכל אחת משש חבילות היסוד.

11.2.2 לבצע Structural review, Semantic/Security review ו־Estimate/Schedule review נפרדים.

11.2.3 להפיק Reconciliation שורה־לשורה לכל Finding ולכל Conflict.

11.2.4 לבנות Human view ו־machine-readable manifests מאותו מקור.

11.2.5 להציג ל־Tal את ה־root המדויק, Hashes, ממצאים ותוצאות Readers.

11.2.6 אם Tal מאשר, לפרסם current pointer אטומי; אם הוא דוחה, ליצור Successor חדש בלי לערוך את המועמד.

11.2.7 להעריך מחדש Gate29. אישור Planning אינו אישור אוטומטי ל־Production.

11.2.8 ReviewInput Eligibility Requirements V5 נבדק כ־exact-object planning candidate: Operand ייעודי ל־Resolved Reference Root; שישה Predicate profiles עם `672` Predicates; קישור מדויק ל־Predicate Sets ול־Predicate IDs; מיפוי Roles ושדות לפי Profile; סריקת כל CURRENT Acceptance Attempts מול אותו root; ‏FIRST empty pointer set; ‏SUCCESSOR singleton; ‏PRIMARY+CO atomicity; ‏Final Acceptance Receipt last ו־Root DAG. קיימים `6` positive ו־`25` negative fixture specifications. אלו חוזי אכיפה שנבדקו סטטית, ללא הרצת fixtures או הוכחת Runtime.

11.2.9 ה־Subject הקפוא הוא [ReviewInput Eligibility Requirements V5](reviewinput-eligibility-requirements-v5-2026-09-08.json), ‏SHA-256=`65aa2dc6a15d629db8218eb3748ba16d983052fcd07dc64d15581b8edfe206bb`, ‏bytes=`1659675`, ‏lines=`35806`. הביקורת [המבנית A](reviewinput-eligibility-v5-structural-review-a-2026-09-08.md), ‏SHA-256=`28d44ad293c30e38900fea4f707ba7181abe7964c5b9e5e5d5b4acb76ca75187`, והביקורת [העוינת B](reviewinput-eligibility-v5-hostile-review-b-2026-09-08.md), ‏SHA-256=`bf6519ec6bb7b135c7dfe4f749b8c1972b8f331daa8fca7dfbc1464e8d4b9678`, החזירו PASS בתחום הביקורת הסטטית על אותם bytes בדיוק. עדכון סעיף זה נעשה רק לאחר סגירת שתי הביקורות.

11.2.10 status לתת־המסלול=`IDENTITY-FROZEN-STATIC-PLANNING-REVIEW-CANDIDATE;EXACT-REVIEWS=2/2-PASS;OPEN-FINDINGS-IN-REVIEW-SCOPE=0;CREDIT=0`. זהו מצב ביקורת של טיוטה; הוא אינו Planning-root Acceptance או Completion ואינו סוגר את שלב 10. קיום executable corpus, זמינות selector candidates, חתימות ו־Atomic boundary בפועל נשארים `unknown/unavailable`.

11.2.11 נקודת ההמשך והממצאים נשמרים ב־[Reconciliation של Eligibility V5](reviewinput-eligibility-v5-review-reconciliation-2026-09-08.md). V2 נשמר ב־SHA המקורי שסיפק Tal. V3/V4 ודוחותיהם נשארים היסטוריה בלתי־משתנה; ה־PASS ההיסטורי של V3 אינו מחליף את ממצאי הביקורת החוזרת או את ביקורות V5.

11.2.12 זהות המקור ההיסטורי של תוכנית עבודה זו, הקשורה מתוך Eligibility, היא `b0c5b44862a643cd9c9270ed2f0395824306446d8869a8b854d16dee3b1f46bd` ב־revision `f68cdcf69567a443784f4b12e848fd12c57e8f06` ובאותו נתיב. היא שוחזרה ואומתה בקריאה בלבד. ה־worktree המעודכן אינו תחליף לה. ה־Master הטכני הנפרד `docs/connect-master-execution-plan-2026-08-26.md` נשמר ללא שינוי ב־SHA `cd8819193075074f7ed8acb1c7ebc4eb93d34e84e7bd6dfe0a606998f98aae9b`.

11.2.13 נוצר מסלול successors תכנוניים ל־Stage10 Machine V7/Human V6 שנדחו. V8–V11, זוגות ה־Human ודוחות הביקורת שלהם נשמרו ללא שינוי. כל ממצא נשמר בזהותו; הממצאים הסטטיים החדשים תוקנו ב־successors ונבדקו מחדש. V12/Human V11 הם זוג ההמשך שנבדק בשתי ביקורות עצמאיות, ללא שינויי מוצר או הרצת Toolchain, Tests/Build, fixtures או validators/evaluators.

11.2.14 ה־Subject הקפוא הוא [Stage10 Machine V12](reviewinput-program-sourceset-blocker-reconciliation-manifest-v12-2026-09-08.json), ‏SHA-256=`9ed5efb715b17d14e80e25462e767834e6cdf0883738b72dc2d2299d662f5e82`, ‏bytes=`3035407`, ‏lines=`76482`. ההיטל המדויק הוא [Human V11](stage10-stage11-gate29-sequencing-reconciliation-v11-2026-09-08.md), ‏SHA-256=`97fa80ef67a13ca1e39a27b9b76f2d6d636fa3a732857a12e2e134b22c4ae772`, ‏bytes=`290328`, ‏lines=`5183`. ההקפאה מתועדת בנפרד ב־[Freeze V12/Human V11](stage10-v12-human-v11-freeze-2026-09-08.json).

11.2.15 הביקורת [המבנית/Authority A](stage10-v12-independent-structural-authority-review-a-2026-09-08.md) והביקורת [הסמנטית/Lifecycle B](stage10-v12-independent-hostile-semantic-review-b-2026-09-08.md) החזירו `PASS-EXACT-STATIC-PLANNING-CONTRACT` על אותם bytes. כל מבקר אימת את זהויות הזוג לפני ואחרי ביקורתו, ולא קרא או נועץ בביקורת האחרת של V12. מסקנות V11 נשמרו רק לאחר אימות הדלתא בפועל. הדוחות הם תיעוד ביקורת סוכנים שהועתק בידי המתאם; הם אינם Review Receipts מקובלים או חתימות Authority.

11.2.16 [Reconciliation V12](stage10-v12-review-reconciliation-2026-09-08.md) ו־[רשימת הממצאים המדויקת](stage10-v12-review-reconciliation-2026-09-08.json) קושרים את הזהויות, הכרעות הביקורת וכל `87` Finding IDs ועוד `10` Producer IDs, ללא מיזוג. status=`FROZEN-PLANNING-CANDIDATE;EXACT-STATIC-REVIEWS=2/2-PASS;OPEN-NEW-FINDINGS-IN-REVIEW-SCOPE=0;CREDIT=0`. אין מכך סגירת Acceptance פרטנית של ממצאים היסטוריים. נצפו `460` slots, ‏`2874` declared root-path patterns ו־`23` Human projections מדויקים. קיימים `37` positive, ‏`37` negative ו־`26` additional planning cases שלא הורצו. שדות PENDING בזוג הקפוא מתעדים את רגע ההקפאה; ההכרעות המאוחרות נשמרות ב־Reconciliation נפרד. עדכון תוכנית זו נעשה רק לאחר קבלת שתי הכרעות ה־PASS ותיעודן.

11.2.17 ההמשך נשאר Planning-only: לסגור את קלטי ה־Bootstrap והזהות החיצונית של Anchor, ‏Genesis Core והוכחותיו; להכין descriptors מאומתים שחסרים עבור `156` סכמות מיובאות; לקדם B0 successor תואם ושרשרת Protocol Acceptance; ולסגור adapter מפורש בין Eligibility V5 ל־Stage10 Assurance בלי aliases. actual roots, resource/provider capabilities ו־runtime expansion נשארים `unknown/unavailable`. לאחר קיום הראיות ממשיכים בסדר החוזה ל־Eligibility Acceptance, שש חבילות היסוד, ReviewInput, SourceSet, Semantic, Atomic Task Registry ולבסוף Stage10B. אין Product, Git/GitHub או Deployment mutations מכוח ה־PASS. ה־Master הטכני נשאר ללא שינוי עד Stage10B accepted authority.

11.2.18 הוכן ונבדק [Bootstrap Input Admission Requirements V2 — Machine](bootstrap-input-admission-requirements-v2-2026-09-08.json), ‏SHA-256=`c9f3cdd7ec50488cedf620b7836b0ac9ad3eeedba9a864592d9307ba6a823316`, ‏bytes=`160313`, ‏lines=`3188`; והיטל [Human V2](bootstrap-input-admission-requirements-v2-2026-09-08.md), ‏SHA-256=`aeff879396f6412d0891c30d10b7f172b3fe25d6a83c5df88d7ca9f36eca1ee8`, ‏bytes=`152733`, ‏lines=`3249`. הזוג מוקפא ב־[Freeze V2](bootstrap-input-admission-v2-freeze-2026-09-08.json).

11.2.19 [Review A](bootstrap-input-admission-v2-structural-review-a-2026-09-08.md) ו־[Review B](bootstrap-input-admission-v2-hostile-review-b-2026-09-08.md) החזירו `PASS-EXACT-STATIC-PLANNING-CONTRACT` על אותו זוג, לאחר אימות הזהויות לפני ואחרי ובדיקת הדלתא מול V1. המבקרים היו עצמאיים מהכותב וזה מזה ולא נועצו בביקורת האחרת של V2. שני ממצאי V1, ‏`BIA-V1-A-F001` ו־`BIA-V1-B-F001`, נשמרו בנפרד; ה־witness תוקן בחוזה התוצאות, ללא accepted closure credit. תוכנית זו עודכנה רק לאחר רישום שתי הכרעות ה־PASS ו־[Reconciliation מלא](bootstrap-input-admission-v2-review-reconciliation-2026-09-08.json).

11.2.20 ה־supplement מפריד authoring, external pin establishment ו־consumption; ממפה בדיוק `21` קלטים ו־`63` קישורים בין Core, Anchor ו־Descriptor; משמר `30` source-qualified declaration tokens כדרישות שאינן receipts; ומגדיר `18` Predicates, שני Profiles ושני Guards. שש תוצאות הקליטה כוללות הצלחת Preflight נפרדת מהצלחת full admission, עם איסור החלפה בין Profiles. קיימים `22` Human projections מדויקים, `4` positive ו־`20` negative fixture specifications שלא הורצו. `16` חובות הביקורת המקדימה נשארות פתוחות מבחינת ראיות בפועל; כתיבת המיפוי אינה מקטינה את מספר ה־imports הלא־מאומתים.

11.2.21 כדי להתקדם לקליטה אמיתית נדרשים מקור סמכות חיצוני ו־pin מדויק, בסיס metagrammar/parser ואימות חתימות שהוגדרו מחוץ למועמד, descriptors מלאים עם כל התלויות, ו־instances עם מינויים, זמן מהימן ו־revocation/security cut אמיתיים. אם descriptors חושפים תלויות בין קלטים ש־V12 מציב באותו rank, נדרש Stage10 successor נפרד עם סדר מלא; אין override סמוי ב־supplement. B0 successor, detached Protocol, adapter ל־Eligibility V5 וכל שלבי ההמשך נשארים חסומים לפי החוזה. לא נוצרו מפתחות, חתימות, Authority או runtime roots; אין שינוי ב־Gate29, בהקפאת הפיתוח או ב־Master הטכני.

11.2.22 הוכנה [Bootstrap descriptor topology/shape proposal V1 — Machine](bootstrap-descriptor-topology-shape-proposal-v1-2026-09-08.json), ‏SHA-256=`a1cca202de0400e5fc84b5a6a345b9fcf52b63d1378fb29c9d48e71e6d3c7917`, ‏bytes=`188376`, ‏lines=`4597`; ו־[Human V1](bootstrap-descriptor-topology-shape-proposal-v1-2026-09-08.md), ‏SHA-256=`1487cef48faa9aad6d23d36314689916eb1f633f293834e4a0aef5a9e210144c`, ‏bytes=`180102`, ‏lines=`4690`. הזהויות קשורות ב־[Freeze](bootstrap-descriptor-shape-v1-freeze-2026-09-08.json).

11.2.23 [Review A](bootstrap-descriptor-shape-v1-structural-review-a-2026-09-08.md) ו־[Review B](bootstrap-descriptor-shape-v1-hostile-review-b-2026-09-08.md) החזירו `PASS/PASS` בתחום outer shapes ו־topology בלבד, ללא ממצאים חדשים. המבקרים נתנו עצות pre-edit, ואז בדקו עצמאית את הזוג שנכתב בידי ההורה, ללא עריכת הזוג או התייעצות ביניהם בביקורותיו. [Reconciliation](bootstrap-descriptor-shape-v1-review-reconciliation-2026-09-08.json) קושר את שני הדוחות ואת הזוג המדויק; תוכנית זו עודכנה לאחר רישומם. הדוחות הם תמלול coordinator של תוצאות הסוכנים ואינם receipts תפעוליים.

11.2.24 נשמרו בדיוק `21` מיפויי input ו־`63` קישורי Core/Anchor/Descriptor. הוגדרו `75` דפוסי RootRef עם `86` חלופות יעד, שכולן יורדות ב־rank המוצע; `19` Human projections ו־`11` זהויות מקור תואמים. `4` positive ו־`16` negative fixture specifications נבדקו לוגית ולא הורצו. הופרדו early verification context ו־pin selection מאוחר, ונאסרו back-edges בין appointment/registry, material/policy ו־schema definition/own instance. Registry בעל ארבעה members ו־revocation target unions מוגבלים הם הצעות מותנות בהוכחת namespace שלם; universe גדול או לא ידוע מחייב הרחבה ולא truncation.

11.2.25 ב־Shape V1 הוגדרה חובת סגירת grammar מפורט לשדות, records, arrays, תנאים ו־definition metagrammar עבור `19` סוגי OPEN, ופירוט מעטפות הראיות והתלויות החסרות לפני שילוב ב־Stage10 successor קפוא ונבדק. הצעת ה־syntax שנוספה מתועדת בסעיפים 11.2.26–11.2.29; `11` חובות integration עדיין פתוחות מבחינת אימוץ וראיות, ומספר `156` ה־imports הדורשים closure מאומת לא ירד. אין שאלת Owner פתוחה לצורך הכנת התכנון הזה, ואין הסקת pinner/issuer/controller authority מבעלות Tal. Actual pin, parser/context, policy/material, מינויים וזמן/revocation דורשים ראיות ואישורים מתאימים. לא בוצעו Tests, Build, fixture execution, שינויי מוצר או Git/GitHub/Deployment mutations; ה־Master הטכני נשאר ללא שינוי.

11.2.26 הוקפאה [Bootstrap semantic grammar proposal V2 — Machine](bootstrap-semantic-grammar-proposal-v2-2026-09-08.json), ‏SHA-256=`d3399b8df3e758b0677cd7218e7100b7295ddb43e754d51449157d59bc058b6c`, ‏bytes=`268307`, ‏lines=`7621`; ו־[Human V2](bootstrap-semantic-grammar-proposal-v2-2026-09-08.md), ‏SHA-256=`478d2c11c6cabe20227c0ad81db862bda84233bc74772f2ac38fd1a4043b4ce8`, ‏bytes=`253514`, ‏lines=`7723`. [Freeze V2](bootstrap-semantic-grammar-v2-freeze-2026-09-08.json) קושר את הזוג. ה־grammar הוא הצעת syntax קונקרטית, ולא actual authenticated descriptor או שינוי אוטומטי ל־BDS/Stage10.

11.2.27 [Review A](bootstrap-semantic-grammar-v2-structural-review-a-2026-09-08.md) ו־[Review B](bootstrap-semantic-grammar-v2-hostile-review-b-2026-09-08.md) החזירו `PASS/PASS` בביקורות delta ו־regression עצמאיות, בלי לקרוא או להיוועץ בביקורת הנוכחית האחרת. V1 ותגובותיו נשמרו: A נתן PASS תחום, B מצא `BG-V1-B-F001`, וה־producer רשם `BG-V1-P-F001` ו־`BG-V1-P-F002`. שלושת ה־IDs נשמרו בנפרד ב־[Reconciliation](bootstrap-semantic-grammar-v2-review-reconciliation-2026-09-08.json), עם תיקון witness תכנוני שאומת ב־V2 אך `acceptedClosure=false` ואפס credit. תוכנית זו עודכנה אחרי רישום שתי הביקורות וה־reconciliation.

11.2.28 ההצעה משמרת `104` מיפויי שדות מדויקים, `26` מיפויי Identity פנימיים ו־`19` משפחות; `18` משפחות בשימוש ו־PROOF_BYTES ללא שדה outer. יש `190` טיפוסים, `312` הפניות טיפוסים, `33` פרופילי arrays, ‏`12` operators ו־`26` Human projections תואמים. `PinPreflightDispatch` נפתר רק בתצורת consumer חיצונית שכבר אומתה, בעוד כללי candidate מקבלים רק `InputAdmissionDispatch`. הוגדרו במפורש השוואת מפתחות מורכבים וייחודיות/repeats לכל array. קיימים `9` positive ו־`30` negative fixture specifications, כולם לא הורצו.

11.2.29 פירוט מעטפות התצורה והראיות המנותקות — issuance, credentials, membership ו־current observations — נוסף כהצעת BCE המתועדת בסעיפים 11.2.30–11.2.33, לפני שילוב נפרד ב־shape/Stage10 successor קפוא ונבדק. Actual values של `12` חובות policy ו־`33` array limits, גבולות parser, actual pin/contexts, suite/material, מינויים וראיות חיות נשארים `unknown/unavailable`; חובות אלה אינן ספירת הצבעות משתמש. ההצעה מוגבלת ל־grammar לא־רקורסיבי, BIA admission dispatch ו־namespace universe תחום; full bootstrap lifecycle או הרחבת universe/grammar דורשים תכנון וביקורת נפרדים. BDS V1, ‏Stage10 V12 ו־156 חובות ה־import closure לא השתנו. לא בוצעו Tests, Build, fixture execution, שינויי מוצר או Git/GitHub/Deployment mutations, ולא השתנה ה־Master הטכני.

11.2.30 הוקפאה [BCE V2 — Machine](bootstrap-configuration-evidence-envelopes-proposal-v2-2026-09-08.json), ‏SHA-256=`925d5d3b5f01413dd347aae86ac648207520b291d31a7a57e949722f1f99ae5e`, ‏bytes=`360756`, ‏lines=`10529`; ו־[Human V2](bootstrap-configuration-evidence-envelopes-proposal-v2-2026-09-08.md), ‏SHA-256=`29ee5af71896189465f7088b8b36a9139db557bb6ea183825427209faf2794ac`, ‏bytes=`340164`, ‏lines=`10639`. [Freeze V2](bootstrap-configuration-evidence-v2-freeze-2026-09-08.json) קושר את הזוג. זו הצעת מעטפות להתקנה ראשונה ולחלון קריאת ראיות, ללא actual key/signature/configuration operations.

11.2.31 [Review A](bootstrap-configuration-evidence-v2-structural-review-a-2026-09-08.md) ו־[Review B](bootstrap-configuration-evidence-v2-hostile-review-b-2026-09-08.md) החזירו `PASS/PASS` בביקורות delta ו־regression עצמאיות בלי לקרוא את הביקורת הנוכחית האחרת. V1 ושתי ביקורות ה־FAIL נשמרו. `BCE-V1-A-F001` תוקן באמצעות שישה מזהי מגבלות תואמי Token ומיפוי מדויק לבעליהם; `BCE-V1-B-F001` תוקן באמצעות שוויונות מלאים בין opening/selection/namespace observation roots ב־manifest וב־close. שני IDs נשמרים בנפרד ב־[Reconciliation](bootstrap-configuration-evidence-v2-review-reconciliation-2026-09-08.json), עם תיקון witness תכנוני שאומת בשתי ביקורות אך `acceptedClosure=false` ואפס credit. התוכנית החיה עודכנה לאחר רישום שתי הביקורות וה־reconciliation.

11.2.32 ההצעה כוללת `21` סוגי מעטפות, `18` signature-owner bindings, ‏`112` נתיבי RootRef ו־`164` חלופות יעד, `11` פרופילי arrays, ‏`15` מיפויי Grammar ו־`28` Human projections. נשמרו `21` קלטי המקור ו־`63` three-way bindings. `28` שוויונות החלון כוללים `11` preflight ו־`17` admission, ללא הוספת root edges. קיימים `9` positive ו־`30` negative specifications, כולם לא הורצו. סדר היצירה נפרד מסדר הקריאה: Anchor ו־issuance manifest קודמים לתצורה, אך קריאתם נדחית עד preflight של התצורה החיצונית. רק שני expectation paths המפורשים נדחים; אותו use או זמן תקין אינם תחליף לשוויון Root מלא. חלון הקריאה אינו הוכחת validity ל־transaction עתידי.

11.2.33 הצעת integration נפרדת ל־BDS shapes, ‏Grammar V2 ו־BCE V2 נוספה בסעיפים 11.2.34–11.2.37, עם מיפויי schema/domain/type/generation/rank מוצעים והקפאה לשתי ביקורות עצמאיות. אין aliases אוטומטיים לייצוגים קיימים. Actual trust premise, custody/pin, credentials/suites, מגבלות וזמן, namespace completeness, current-selection ו־anti-replay evidence נשארים `unknown/unavailable`. הוגדרו ב־BCE `6` חובות array limits נוספות, וערכיהן לא נקבעו. Configuration succession, credential delegation, history או universe רחב יותר דורשים הרחבה נבדקת. ‏BDS V1, ‏Grammar V2, ‏BIA V2 ו־Stage10 V12 לא השתנו; `156` חובות import closure לא צומצמו. Tal נשאר Owner היחיד ללא הסקת issuer/pinner/controller authority. לא בוצעו Tests/Build, fixture execution, שינויי מוצר או Git/GitHub/Deployment mutations; ה־Master הטכני נשאר ללא שינוי.

11.2.34 הוקפאה [Bootstrap Stage10 integration proposal V1 — Machine](bootstrap-stage10-integration-proposal-v1-2026-09-08.json), ‏SHA-256=`5496c62849887421a5c7c47aaab46b953f3f7d006f7ebc15dfc9c343c1c99160`, ‏bytes=`2096604`, ‏lines=`67203`; ו־[Human V1](bootstrap-stage10-integration-proposal-v1-2026-09-08.md), ‏SHA-256=`7c10b9e87a88051ca9e57d7f0be0200b783e094fbd8be40f043124dc8c592983`, ‏bytes=`1962857`, ‏lines=`67343`. [Freeze V1](bootstrap-stage10-integration-v1-freeze-2026-09-08.json) קושר את הזוג. ה־45-class prefix הוא הצעת target עם זהויות חדשות, ואינו שינוי ב־V12 או קטלוג runtime מאומץ.

11.2.35 [Review A](bootstrap-stage10-integration-v1-structural-review-a-2026-09-08.md) ו־[Review B](bootstrap-stage10-integration-v1-hostile-review-b-2026-09-08.md) החזירו `PASS/PASS` בתחום הצעת השילוב, בלי לקרוא או להיוועץ בביקורת הנוכחית האחרת. אין ממצא חדש בתחום שנבדק. [Reconciliation](bootstrap-stage10-integration-v1-review-reconciliation-2026-09-08.json) קושר את הזוג והדוחות, משמר `15` מזהי חובות pre-edit ללא accepted closure, ומשאיר ממצאים היסטוריים במקורות הקפואים. תוכנית זו עודכנה לאחר רישום שתי הביקורות וה־reconciliation; אין Authority, Acceptance או Completion credit.

11.2.36 ההצעה כוללת `104` מיפויי BDS, ‏`190` טיפוסי Grammar, ‏`11` התאמות payload בלתי תואמות למקורות, `1616` שדות בסיסיים, `926` מבנים, `323` מגבלות סוג זהות ו־`35` Human projections תואמים. `253` נתיבי RootRef ו־`316` חלופות יעד יורדים בדרגה בתוך prefix מוצע של `phase=-20`, ‏ranks `0..30`. שישה הקשרי Generation נפרדים מונעים alias בין Bootstrap, מקור מוקדם, credential, תצורה ושני שלבי use. נשמרו `18` חוזי החתימה של BCE, שני deferred paths, ארבעת preflight operands ו־`28` שוויונות החלון. דרישת מינימום חדשה ל־Subject מפנה ל־Admission Manifest מוקדם ומחייבת את כל `18` Predicates של BIA, בלי להוסיף Subject Root עתידי לראיות. אומתו `78` הפניות ישירות ב־`18` צרכנים ו־`284` צרכנים בגרף ההצהרות ההפוך; `152` שורות ללא מסלול גלוי אינן מוכחות כבלתי מושפעות. `481` logical slots ו־`3062` patterns הם חישוב מותנה בלבד. נוספו שתי חובות namespace limits שערכיהן חסרים. `8` positive ו־`24` negative specifications נשארים לא מורצים.

11.2.37 ב־BSI V1 הושארו פרופילי אימות Anchor/Genesis במצב `UNSUPPLIED-BLOCKING`: מקור signer ובעל מפתח, purpose, transcript/encoding, unsigned preimage וקשירת זהות המעטפת/generation/ordinal. Genesis unsigned-payload אינו BCE full-envelope באופן אוטומטי, ו־BIA אינו מחליף lifecycle verification. המענה התכנוני הנפרד מופיע ב־AGV V2 בסעיפים הבאים; BSI V1 עצמו נשאר קפוא. Descriptor מלא של Subject, חוזי הצרכנים המושפעים, actual semantic correspondence וכל ראיות האמון/currentness/nonreuse/limits נשארים נדרשים. ה־V5 adapter, ‏B0 successor ואימות בזמן transaction נשארים חובות נפרדות. כל `156` חובות import closure נשארות פתוחות; אין actual configuration, signatures או instances, ואין שינוי ב־Master הטכני או במקורות הקפואים.

11.2.38 הוקפאה [Anchor / Genesis verification proposal V2 — Machine](bootstrap-anchor-genesis-verification-proposal-v2-2026-09-08.json), ‏SHA-256=`e208e5b3f75161488358b9501a356008df25c3d52cb5aa9af8545b6220cb2210`, ‏bytes=`1894183`, ‏lines=`62569`; ו־[Human V2](bootstrap-anchor-genesis-verification-proposal-v2-2026-09-08.md), ‏SHA-256=`86e31f9850f370a36c394bd999acb4a3f214b543d3a2380f8a59c98d6b010fe7`, ‏bytes=`1769978`, ‏lines=`62735`. [Freeze V2](bootstrap-anchor-genesis-verification-v2-freeze-2026-09-08.json) קושר את הזוג. סכמות, profiles ו־Root/signature framing של AGV V2 הם הגדרות target חדשות; אין שימוש חוזר ב־Roots או חתימות של BSI או V1.

11.2.39 [Review A](bootstrap-anchor-genesis-verification-v2-structural-review-a-2026-09-08.md) ו־[Review B](bootstrap-anchor-genesis-verification-v2-hostile-review-b-2026-09-08.md) החזירו `PASS/PASS` בתחום החוזה התכנוני, ללא ממצא חדש ובלי לקרוא או להיוועץ בביקורת הנוכחית האחרת. [Reconciliation](bootstrap-anchor-genesis-verification-v2-review-reconciliation-2026-09-08.json) משמר בנפרד את `AGV-V1-A-F001` ו־`AGV-V1-B-F001`; [V1](bootstrap-anchor-genesis-verification-proposal-v1-2026-09-08.json) ושני דוחות ה־FAIL נשארים קפואים. התיקון מפריד `O00` משותף משני `O01` שונים; `O19` שומר את Anchor child המקורי ומשווה ל־Genesis רק shared projection מוגדר, בלי החלפת signer או שינוי ראיות משותפות. התיקון נבדק סטטית בלבד; acceptedClosure=false וכל credit=0. תוכנית זו עודכנה לאחר שני הדוחות הסופיים וה־reconciliation.

11.2.40 AGV V2 כולל שני Guards/Predicate Sets/Profiles עם `18` Predicates ל־Anchor ו־`22` ל־Genesis. Anchor חותם על full unsigned envelope; Genesis חותם על full unsigned payload הכולל `envelopeBinding` של חמשת שדות המעטפת, עם שוויון מלא לפני אימות ושימוש. שתי capabilities ושני signer pins חיצוניים, policy ייעודי ב־input18 וקישור מלא ל־Material מונעים הסקת הרשאה משם מפתח, Token או appointment role. Dispatch נפרד ב־Protocol שומר את BIA2/18 ללא הרחבה משתמעת; Overrides ל־Genesis transcript ב־Grammar/BIA מפורשים. אומתו `45` מחלקות target, הרחבות בשבע מחלקות payload, ‏`195` טיפוסים, ‏`258` נתיבי RootRef ו־`321` חלופות יעד; חמש ההפניות החדשות פונות ל־Credential מוקדם בדרגה 1. יש `1702` שדות בסיסיים, `961` מבנים, `332` מגבלות סוג זהות ו־`41` Human projections תואמים. נשמרו `18` חוזי חתימת BCE, ‏`28` שוויונות החלון, שישה הקשרי Generation ו־`18` חובות pre-edit. כל `16` source locks תואמים; `8` positive ו־`34` negative specifications לא הורצו. לא נוספה מחלקת Root או receipt עבור הקשרי ההפעלה או מסקנת האימות.

11.2.41 היעד שנקבע לאחר AGV V2 היה descriptor מלא מוצע של Subject וחוזה צריכת Bootstrap Admission Evidence תחת זהויות AGV: מיפוי Generation ו־operands, שדות typed ו־Root occurrence closure מלאים, בלי הפניית Subject עתידי מתוך ראיות מוקדמות. הבדיקה הבאה מצאה שחוזה התוכן המלא חסר במקורות; לכן סעיפים 11.2.42–11.2.45 מתעדים דרישות צריכה וחובות תוכן בלבד, והיעד של descriptor מלא נשאר פתוח. יתר lifecycle dispatch, חוזי downstream, ‏B0/Eligibility adapter ואימות בזמן transaction נשארים חובות נפרדות. Actual origin/keys/credentials/suites/configuration/custody/time/status/nonreuse/descriptors/instances נשארים `unknown/unavailable`, וכל `156` חובות import closure פתוחות. הפרופילים החדשים הם חוזים מוצעים שנבדקו, ולא פרופילים מותקנים או ראיות מאומתות בפועל.

11.2.42 הוקפאו [Subject Bootstrap Admission consumption requirements V1 — Machine](subject-bootstrap-admission-consumption-requirements-v1-2026-09-08.json), ‏SHA-256=`953c432de7e0d8378d19c084e4ef7803ddc45653d48b4d6f79f461d92da4f6ba`, ‏bytes=`182919`, ‏lines=`4261`; ו־[Human V1](subject-bootstrap-admission-consumption-requirements-v1-2026-09-08.md), ‏SHA-256=`d482a8043f430197df49cdafee44e00eb2bfef6792ab79ff66cf36bf995792ed`, ‏bytes=`175468`, ‏lines=`4369`. [Freeze V1](subject-bootstrap-admission-consumption-v1-freeze-2026-09-08.json), ‏SHA-256=`96783162012efd89ffc565fb4a73f75b01a57200775caa4dced890cedfb595ad`, קושר את הזוג ואת הגבול `completeSubjectDescriptor=false`. זהות Subject ו־Root framing הם הצעות שמורות; לא נוצרו Subject instance, Root ממשי או מחלקת descriptor סגורה.

11.2.43 [Review A](subject-bootstrap-admission-consumption-v1-structural-review-a-2026-09-08.md) ו־[Review B](subject-bootstrap-admission-consumption-v1-hostile-review-b-2026-09-08.md) החזירו `PASS/PASS` על אותו זוג קפוא, ללא ממצא חדש ובלי לקרוא או להיוועץ בביקורת הנוכחית האחרת. [Reconciliation](subject-bootstrap-admission-consumption-v1-review-reconciliation-2026-09-08.json), ‏SHA-256=`4c0876bda5d37a13035a5c1d67600cc98bdadfc9938770ec966946666aceef64`, משמר 20 חובות pre-edit ו־12 חובות תוכן, כולן ללא accepted closure. Stage10 schema80 מספק שני Root minima ו־rules ריק; BSI מוסיף Manifest כמינימום; AGV דורש Subject/lifecycle definitions מלאים אך אינו מספק אותם. Current Protocol ההיסטורי, Bootstrap verifier, הגדרות AST או body opaque אינם תחליפים לתוכן החסר. הדוחות הם תמלולי coordinator ולא receipts תפעוליים חתומים. תוכנית זו עודכנה לאחר שני הדוחות הסופיים וה־reconciliation.

11.2.44 SUB V1 כולל 14 Operands ו־16 Predicates הקשורים במדויק ל־Guard/Profile/Predicate Set אחד. S01 קושר Subject instance שנבחר חיצונית אל full Root, descriptor מלא ו־bytes; שדה Genesis אינו Subject Root. נשמרים שלושת Root minima, ‏63 קשרי הקלט, שני Core links ו־28 שוויונות החלון, BIA עם 18 Predicates ו־AGV עם 18/22. S00 הוא הקשר צריכה עוטף מורשה בנפרד, מעל parent אחד ושני AGV children בלבד; O00/O01/O19 וה־shared inventory נשמרים. Subject משתמש ב־Gboot, ללא alias ל־Use generation או Subject Root עתידי בראיות מוקדמות. שימוש יחיד ל־Subject המדויק דורש ראיית association/nonreuse ממשית; לא הוגדרו כאן store, receipt או הרשאת retry. אומתו 14 source locks ו־27 Human projections. כל 45 מחלקות AGV נשמרו; נוספו 0 מחלקות Subject סגורות. מיפוי ההצהרות מצא 14 הפניות ישירות ב־11 צרכנים ו־282 צרכנים נראים בהשפעה טרנזיטיבית; 177 השורות האחרות אינן מוכחות כבלתי מושפעות. חמש positive ו־28 negative specifications מותנות וסימבוליות לא הורצו. חוסר תוכן או ראיות חוסם גם את תוצאת ה־prerequisites הלא־מסמיכה.

11.2.45 היעד שנקבע לאחר SUB V1 הוא חוזה התוכן הנורמטיבי של detached predecessor ו־crosswalk סמנטי מלא למקורות. DNC V1 בסעיפים 11.2.46–11.2.49 מקדם כללים קונקרטיים ומיפוי בתחום מפורש, אך אינו משלים עץ שדות מלא, AST/dispatch, provenance/signature mode, association/recovery או את מלוא הסמנטיקה ההיסטורית. `completeSubjectDescriptor=false`; שלוש או ארבע הפניות מינימום אינן payload סגור. Actual authentication/evidence/adoption נשארים `unknown/unavailable`, וכל 156 חובות import נשארות פתוחות.

11.2.46 הוקפאו [Detached normative content contract proposal V1 — Machine](detached-normative-content-contract-proposal-v1-2026-09-08.json), ‏SHA-256=`d4798372aa3de33725b0c5961fdb05e5f4278f79238d8c7bf9d9aae017459113`, ‏bytes=`691671`, ‏lines=`19037`; ו־[Human V1](detached-normative-content-contract-proposal-v1-2026-09-08.md), ‏SHA-256=`1763415811dce836a1e26216a0a37bd4de13850c30a57ef9ee98f584256f6daa`, ‏bytes=`654328`, ‏lines=`19144`. [Freeze V1](detached-normative-content-v1-freeze-2026-09-08.json) קושר את הזוג. ההצעה מגדירה 28 כללים, 8 מודולים, 10 כניסות סמנטיות שאינן callable ו־17 תפקידי definition; אין להחליפם ב־runtime Guards/Predicate Sets או ב־SUB-P015 שהושלם.

11.2.47 [Review A](detached-normative-content-v1-structural-review-a-2026-09-08.md) ו־[Review B](detached-normative-content-v1-hostile-review-b-2026-09-08.md) החזירו `PASS/PASS` על אותו זוג קפוא, ללא ממצא חדש ובלי לקרוא או להיוועץ בביקורת הנוכחית האחרת. [Reconciliation](detached-normative-content-v1-review-reconciliation-2026-09-08.json), ‏SHA-256=`3abde3be6a9bd4b6a2f8416a2eeea9775e1258fa8dd21b4d10a618b94cf269eb`, משמר 24 חובות pre-edit ואת חסמי השלמות. כל 18 source locks ו־27 Human projections תואמים. נבדקו 42 שורות מקור נגישות, 190 Root patterns, ‏118 scalar patterns ו־43 הפניות rules — בסך הכול 351 occurrences נפרדים. כל 460 שורות הקטלוג מופיעות ב־inventory; 418 האחרות אינן מוכחות כבלתי מושפעות. נוספו 64 יחידות כלל ממופות, 17 בקרות היסטוריות ו־15 שמות validators עם תחולת phase וגבולות ראיות; אין status/QA transfer. ארבע positive ו־32 negative specifications לא הורצו. תוכנית זו עודכנה לאחר שני הדוחות הסופיים וה־reconciliation.

11.2.48 שישה target extensions מתעדים דרישות שאינן מיוצגות במלואן במקור: Subject→exact Bootstrap Review Dispatch ו־Scope/Generation/lifecycle; Comparison ייעודי עם expected facts בלבד; תוצאות SUCCESSOR הכוללות PRIMARY ו־CO-TRANSITION של predecessor מדויק באותה עסקה ובשני readbacks; המשכיות governing cut עם recheck של authority/time/status בזמן commit; Comparison/Cut ישירים ל־Final; וסגירת definitions/dispatch/rank/adoption. FIRST מחייב pointer ריק מאומת ו־baseline נורמטיבי מוקדם, ללא predecessor accepted מומצא. אין יבוא של Action24, base29Cut, Current Protocol או שבעת התפקידים ההיסטוריים לתוך Bootstrap ללא מיפוי מלא. Final נשאר אחרון; source LOCAL-CLOSED אינו היתר להוסיף שדה נסתר. לא שונו 45 מחלקות AGV או המקורות הקפואים, ולא נוספה מחלקת runtime סגורה.

11.2.49 היעד התחום שנקבע לאחר DNC V1 היה מיפוי סמנטי־ל־wire ל־detached Comparison, לתוצאות FIRST/SUCCESSOR, ל־readbacks ול־Final, עם governing cut וראיות commit עדכניות. DTC V3 בסעיפים 11.2.50–11.2.54 מספק שמונה חוזי payload מקומיים ומפות type/operand/profile/rank מוצעות, אך אינו משלים את כל lifecycle או Subject. מלוא inherited40 closure predicates והסמנטיקה הטרנזיטיבית שלהם עדיין דורשים crosswalk; Subject content/schema/AST/provenance/association נשארים חסמים נפרדים. completeSubjectDescriptor=false; completeHistoricalSemanticCrosswalk=false; כל156 imports פתוחים וכל credit=0.

11.2.50 הוקפאו [Detached transaction contract proposal V3 — Machine](detached-transaction-contract-proposal-v3-2026-09-08.json), ‏SHA-256=`c28783100cb0b66d94fded5e8d6fb8bfd1f3dd208cf986278c36f48eac32ade2`, ‏bytes=`4645523`, ‏lines=`125015`; ו־[Human V3](detached-transaction-contract-proposal-v3-2026-09-08.md), ‏SHA-256=`27aadca0af2994bc6b1bcdf99239cedbaf180ff40edcc9394f67c1b3d2caba54`, ‏bytes=`4396271`, ‏lines=`125172`. [Freeze V3](detached-transaction-v3-freeze-2026-09-08.json), ‏SHA-256=`75526277f092195b021171ad8a7d4e1ca182603eebab8c97c3b2a366436c7a60`, קושר את הזוג. שמונה ה־payloads המקומיים הם Cut, RequestPrestate, Comparison, CAS, Readbacks A/B, Selection ו־Final.13 מחלקות peer/resource/policy נשארות imports עם descriptor מלא חסר, לצד45 הפניות AGV מדויקות. זהות SUB ו־framing שלה נשמרו;20 זהויות DTC ו־framing הוחלפו ל־V3, ללא שימוש חוזר ב־Root V1/V2.

11.2.51 [Review A](detached-transaction-v3-structural-review-a-2026-09-09.md) ו־[Review B](detached-transaction-v3-hostile-review-b-2026-09-09.md) החזירו `PASS/PASS` על אותו זוג V3 קפוא, ללא ממצא חדש ובלי לקרוא או להיוועץ בביקורת V3 הנוכחית האחרת. [Reconciliation](detached-transaction-v3-review-reconciliation-2026-09-09.json), ‏SHA-256=`564e708de0e9ebf2f3ed6618f154f7a095b8bf1ecdfd426f06426c6fb3142422`, משמר את [V1](detached-transaction-contract-proposal-v1-2026-09-08.json) עם [FAIL של A](detached-transaction-v1-structural-review-a-2026-09-08.md) ו־[FAIL של B](detached-transaction-v1-hostile-review-b-2026-09-08.md), ואת [V2](detached-transaction-contract-proposal-v2-2026-09-08.json) עם [PASS של A](detached-transaction-v2-structural-review-a-2026-09-08.md) ו־[FAIL של B](detached-transaction-v2-hostile-review-b-2026-09-08.md). DTC-A-001 עסק ב־binding של output ותלויות עקיפות; DTC-A-002 ו־DTC-B-001 עסקו בנפרד בחיבור pending→accepted; DTC-V2-B-001 עסק באפשרות להחליף review Roots בין Final ל־Attempt/CAS למרות Intent/ID זהים. ארבעת ה־IDs נשמרו בנפרד. התיקונים נבדקו סטטית בלבד, acceptedClosure=false וכל credit=0. תוכנית זו עודכנה רק לאחר שני הדוחות הסופיים וה־reconciliation.

11.2.52 Comparison מכיל בדיוק15 members ב־FIRST ו־16 ב־SUCCESSOR, כולל PointerSet, PRIMARY חדש, Decision, association ושמונה תפקידי capability סגורים. Resolved Reference Root הוא Operand ייעודי; תשע מפות binding כוללות183 שורות OUTPUT/DIRECT/CHAIN והקשרי resolver/הפעלה נפרדים. תשע טבלאות replay קושרות exact child profiles ו־Predicate IDs תוך שמירת הקשר המקור. נוספו990 שוויונות selected field→canonical Root ו־392 שוויונות של כל full Root משותף להורה ולילד. Final, Attempt, Preimage ו־CAS חייבים לקשור אותם ReviewSet/FindingUnion/Reconciliation Roots; התאמת Intent/ID לבדה אינה מספיקה. O00/O01 ו־operation/output/signer/time נשארים נפרדים לפי תפקידם. FIRST מחייב pointer EMPTY ללא CO; SUCCESSOR מחייב singleton היסטורי מדויק וכתיבת PRIMARY ו־CO יחד. A/B, Selection ו־Final seal מבצעים בדיקות currentness נפרדות. Final seal שומר אטומית Final חתום ו־PRIMARY ACCEPTED_CURRENT עם Root Final המדויק באחסון משתנה מחוץ לגרף hash, עם stamp increment1 וללא פרסום חוזר ב־replay. Final נשאר Root אחרון; אין self-root או own-index cycle.

11.2.53 נבדקו30 כללים,69 טיפוסים,23 Operands,40 Predicates ותשעה Profiles/Predicate Sets/Guards תואמים, לרבות ששת profiles הנדרשים ל־FIRST/SUCCESSOR. נגזרו409 חלופות Root,4568 scalar/reused-type patterns ו־2252 containers; אלה הצהרות תחביריות ולא runtime occurrences. כל31 source locks ו־39 Human projections תואמים. נשמרו23 שורות מקור ו־crosswalks,13 overrides ו־24 חובות pre-edit. שמונה positive ו־55 negative specifications לא הורצו. הדוחות הם רשומות coordinator נאמנות ואינם מינויים או receipts תפעוליים. אין Tests/Build, fixture/evaluator execution, שינויי מוצר או Git/GitHub/Deployment/provider/config/key/signature operations.

11.2.54 ההמשך שנקבע לאחר DTC V3 היה סגירת RESOURCE/POLICY, peers מיובאים ותוכן Subject. DRP V2 בסעיפים11.2.55–11.2.59 מספק כעת ארבעה payloads מוצעים ואת שילוב צרכני DTC V5, לאחר תיקוני ביקורת.11peer descriptors, full Subject, AST/dispatch, parent reservation/CANCEL/LOOKUP, actual authority/resource evidence ו־156source imports נשארים פתוחים. ההשלמה היא של החוזה התחום הכתוב בלבד; runtime feasibility ואחוזים/שעות/ETA נשארים unknown/unavailable.

11.2.55 הוקפאו [Detached resource/policy contract proposal V2 — Machine](detached-resource-policy-contract-proposal-v2-2026-09-09.json), ‏SHA-256=`16e14767a2b2d46eafa0f4327157119fa9abc1bfe25ea3d3cdb4ee13acb75516`, ‏bytes=`5146984`, ‏lines=`143984`; ו־[Human V2](detached-resource-policy-contract-proposal-v2-2026-09-09.md), ‏SHA-256=`8f0bae6f5caa88f9fd5a806ef02701a089d56e040ac4c2005dde43cb6ade4903`, ‏bytes=`4859789`, ‏lines=`144193`. [Freeze V2](detached-resource-policy-v2-freeze-2026-09-09.json), ‏SHA-256=`a41e76d9a57279bce1024673032097b276251d253f29782173c21df9a87c6901`, קושר את הזוג. ארבעה payloads חדשים מוצעים הם DRP_CONTEXT, DTC_CREDENTIAL, RESOURCE ו־POLICY; יחד עם שמונת payloads הקודמים יש12 מקומיים. ארבע מחלקות DRP משתמשות בזהות/framing V2 ו־18צרכני DTC ב־V5; SUB ו־45AGV נשמרים. אין שימוש חוזר או relabeling של Root ישן.

11.2.56 [Review A](detached-resource-policy-v2-structural-review-a-2026-09-09.md) ו־[Review B](detached-resource-policy-v2-hostile-review-b-2026-09-09.md) החזירו `PASS/PASS` על אותו זוג קפוא, ללא ממצא חדש ובלי לקרוא או להיוועץ בביקורת V2 האחרת. [Reconciliation](detached-resource-policy-v2-review-reconciliation-2026-09-09.json), ‏SHA-256=`65366b10719edd9963e84f38681376f8ddbeb088edbbdf21041039ba515660ad`, משמר את [V1](detached-resource-policy-contract-proposal-v1-2026-09-09.json) עם [FAIL של A](detached-resource-policy-v1-structural-review-a-2026-09-09.md), [FAIL של B](detached-resource-policy-v1-hostile-review-b-2026-09-09.md) ו־[דוח coordinator](detached-resource-policy-v1-coordinator-static-review-2026-09-09.md). ששת מזהי הממצאים נשמרים בנפרד: DRP-A-001/B-001/COORD-001 —22רשימות replay חסרות; DRP-A-002 —קשר סדרת POINTER ל־Gboot; DRP-B-002 —positive fixture היסטורי בלתי נתמך; DRP-COORD-002 —גבול11/13peers וטקסטי המשך. V2 מחייב exact ordered child lists עם P041..P045 והגדרותיהם, שוויון Identity מלא של הסדרה, ו־historical Final בזהות V5 הנתמכת בחוזה. acceptedClosure=false וכל credit=0. עדכון תוכנית זו נעשה אחרי שני הדוחות הסופיים וה־reconciliation.

11.2.57 מקור האמון החדש חיצוני ונבחר לפני intake. Credential ה־DTC נושא grants מדויקים ל־purpose/operation/schema version/ResourceIdentity/Scope/validity; POLICY יכול רק לצמצם אותם. Material17, public bytes, principal/controller/issuance ו־suite/encoding bindings חייבים להתאים במלואם;15יכולות AGV ו־Owner אינם הרשאת CAS/Final. POLICY מכיל template נטול self Root לשמונה roles; יעד POLICY המלא נוצר רק ב־roster משתנה מחוץ לגרף hash.18external binding kinds ו־234מיפויי תלות status מחייבים ראיות סמכות מסודרות בזמן המשאב, ללא mirror או signed ACTIVE כתחליף. מקור50 נשאר import חסר ו־Anchor-to-DRP admission הוא דרישה נפרדת שטרם סופקה.

11.2.58 מפת הכתובות מונה16members ושני indexes עם codec injective, namespace/epoch וערוצים יציבים. PRIMARY ו־OLD_CO משתמשים באותה משפחת LIFECYCLE לפי Subject מקורי; ASSOCIATION לפי Parent Admission Use מלא, עם OwnerPair בתוך הערך. lifecycleSeries שווה ל־Gboot.seriesId במלואו לפני קריאת POINTER. נשמרו FIRST15/EMPTY ו־SUCCESSOR16/singleton, כתיבות4/5/2/2, PRIMARY ו־CO אטומיים ו־Final חתום עם פרסום PRIMARY accepted באותה עסקה, אחרון וללא self Root או reissue. יש93types,23Operands,45Predicates ו־9Profiles/Sets/Guards;183binding rows/184hops,990שוויונות שדות ו־392שוויונות full Root בין22children.425Root patterns,5326scalar/reused-type patterns ו־2420containers תואמים לעצי ההגדרה; Context נטול Root.43source locks ו־52Human projections תואמים, עם23source rows/crosswalks ו־15extensions. DTC8positive/55negative ו־DRP11positive/37negative specifications לא הורצו. אין Tests/Build, fixture/evaluator execution, שינויי מוצר או Git/GitHub/Deployment/provider/config/key/signature operations.

11.2.59 ההמשך שנקבע לאחר DRP V2 היה סגירת 11 peer descriptors ותוכן Subject מלא. DLP V3 בסעיפים 11.2.60–11.2.65 מספק כעת את 11 עצי ה־wire המוצעים ואת שילוב ההרשאות והפרופילים, לאחר תיקוני ביקורת. מלוא הסמנטיקה ותוכניות/ראיות conformance, חוזה ראיה עצמאית לסגירת finding, AST/dispatch, parent reservation/CANCEL/LOOKUP, ראיות סמכות ומשאב בפועל ו־156 source imports נשארים פתוחים. הושלם החוזה התחום הכתוב בלבד; יעד descriptor מלא טרם הושג. אחוזים, שעות ו־ETA נשארים unknown/unavailable.

11.2.60 הוקפאו [Detached lifecycle payload contract proposal V3 — Machine](detached-lifecycle-payload-contract-proposal-v3-2026-09-09.json), ‏SHA-256=`ad6ebd48dcdf65cbfa630bfa5f520216f9b98abcfa8404de1f58a0a9055ae5ec`, ‏bytes=`7188585`, ‏lines=`195363`; ו־[Human V3](detached-lifecycle-payload-contract-proposal-v3-2026-09-09.md), ‏SHA-256=`5efd9f3d499bf0ee9a1e7a2814ee3ab55be693e0c00a01a0572bf4e92a3b56ac`, ‏bytes=`6798983`, ‏lines=`195650`. [Freeze V3](detached-lifecycle-payload-v3-freeze-2026-09-09.json), ‏SHA-256=`4548880da8716abd4cc862b4b1a8fe18906c182524735f805ba7f000e21be4b1`, קושר את הזוג. נכתבו 11 עצים שחסרו: Subject, PointerSnapshot, Intent, שלוש ביקורות, ReviewSet, FindingUnion, Reconciliation, Attempt ו־Preimage. יחד יש 23 payloads מקומיים ו־103 types. ראיית finding closure עצמאית נשארת class מיובא אחד שחוזהו המלא חסר; אף אחד מ־156 ה־imports המקוריים לא נסגר.

11.2.61 [Review A](detached-lifecycle-payload-v3-structural-review-a-2026-09-09.md) ו־[Review B](detached-lifecycle-payload-v3-hostile-review-b-2026-09-09.md) החזירו `PASS/PASS` על אותו זוג, בלי לקרוא או להיוועץ בביקורת V3 האחרת וללא ממצא actionable חדש. [Reconciliation](detached-lifecycle-payload-v3-review-reconciliation-2026-09-09.json), ‏SHA-256=`703f4c95e0e78f45741970ac115cfd0fbe1691767dc5bc16615f91cced1f4b72`, משמר את V1 ו־V2 עם FAIL/FAIL ואת שבעת המזהים בנפרד: DLP-A-001 ‏P1 — שמונה roles ב־Predicate מול 11 בסכמה; DLP-B-001 ‏P2 — Intent עתידי; DLP-B-002 ‏P2 — descriptorSetRoot שאינו קיים; DLP-COORD-001 ‏P2 — מיפוי DRP חסר; DLP-COORD-002 ‏P3 — ordinal ונוסח גרסה; DLP-V2-A-001 ו־DLP-V2-B-001 ‏P2 — הפניות לגרסאות ישנות בתנאים פעילים. התיקונים נבדקו סטטית; acceptedClosure=false וכל credit=0. תוכנית זו עודכנה רק לאחר שני הדוחות הסופיים וה־reconciliation.

11.2.62 גרסת המסמך וה־Profiles היא DLP V3. זהויות ה־wire הן ארבע מחלקות DRP V4, ‏18 צרכני DTC V7, ‏Subject בזהות SUB V1 שמורה, ‏45 מחלקות AGV קפואות וראיית closure מיובאת מסוג DLP wire V2. כל 15 הטבלאות שנועדו להישמר זהות ל־V2; תוקנו ההפניות המחייבות וגרסת הגדרות ה־dispatch בכל 22 קריאות DTC ו־99 קריאות DLP. אין version alias או Root reuse. ‏P018 מחייב בדיוק 11 roles ואת 328 תלויות ה־status. המיפוי בין שלבי העבודה בוחר input03..06 מוקדמים בלי Intent עבור Subject/Cut/Snapshot; Intent משווה את שדות הפלט הנוכחי, והשלבים הבאים את ה־Intent המוקדם המדויק. מקור הסמכות, הזמן וה־currentness נשארים מחייבים; תצפית roster אינה הוכחה מכוח צורתה.

11.2.63 Subject מקבל עץ definitions/programs/modules/entrypoints/source-use/provenance וחתימת origin מוצעת, עם שמות SUB המקוריים ו־DNC dispatch/scope. שרשרת הבחירה היא input01.detachedSchema → input15.descriptorSet → input21.definitions, עם input15.selectedDefinitions; גם input16 משתמש בשדות המקור האמיתיים. צורת wire אינה semantic conformance. בזמן הקפאת DLP היו ממופים 17 rows בלבד; HRC V1 בסעיפים 11.2.66–69 משחזר כעת את מלוא 40 תנאי הסגירה הישירים ממניפסטי V1.7/V1.8 וטבלת V1.9. אלה 40 Findings, לא מכנה אטומי של דרישות. HSC V2 בסעיפים 11.2.70–74 מוסיף כעת גרפי פעולה ותחולה מוצעים ל־40 התנאים. אין בכך פירוק מלא לכל conjunct או מלוא הסמנטיקה הטרנזיטיבית; תוכניות והראיות עדיין חסרות. 17 controls, ‏15 validators ו־28 סעיפי DNC אינם מכנה מלא. Hash של מקור וחתימת origin אינם Typed Root, ‏Acceptance או QA. כל 12 חובות SUB וראיות הצריכה לפי 16 ה־Predicates נשארות חסומות; DLP הקפוא עצמו לא שונה.

11.2.64 שישה peers מקבלים purposes חתימה מפורשים; חמשת אובייקטי האגרגציה נגזרים בדיוק ממקורות מאומתים, עם metadata והקצאת ordinal אמיתיים. יש 16 grant cases, ‏14 חוזי חתימה מקומיים, ‏9 תפקידי credential, ‏11 תפקידי roster ו־13 מחלקות timed. סמכות אינה נובעת מ־grant ישן של Final/readback או מכך ש־Tal הוא Owner. שלוש קבוצות הביקורת נשמרות גם כשאין ממצאים; מפתח הממצא הוא (full Review Root, findingId), ללא merge או own Review Root. ‏Reconciliation משמר את originalFinding ואת סדר originalFinding.ordinal, ומחייב ראיה עצמאית לכל טענת closure; הענף חסום עד השלמת חוזה הראיה. נשמרו 690 Root patterns, ‏1,560 שוויונות Root, ‏392 שוויונות בין ילדים, אותו Attempt ושלישיית הביקורת המלאה, FIRST עם pointer ריק ו־SUCCESSOR עם singleton, כתיבות 4/5/2/2, ‏PRIMARY/CO אטומיים ו־Final אחרון. כל 62 source locks ו־71 הקרנות Human תואמים; מופו 79 הצהרות Root ו־87 הצהרות scalar, לרבות 25 הפניות Intent. ‏18 מפרטי מקרים חיוביים ו־51 שליליים של DLP, וכל מקרי העבר, לא הורצו. לא בוצעו שינויי מוצר, Tests/Build, הרצת fixtures/evaluators, פעולות Git/GitHub/Deployment או provider/config/key/signature.

11.2.65 לאחר HRC V1, ‏HSC V2 וכתיבת חוזי extraction/syntax והרחבת routes התחומה ב־SIP V1, ההמשך מתמקד ב־owner/type/Root/Markdown grammar מלא, הגדרות הסכמות החסרות, migration וראיות conformance, מיפוי atomic failure footprint והרחבה סמנטית טרנזיטיבית לכל conjunct. עדיין נדרשים representability, תוכניות וחוזי primitive/conformance ל־Subject; SIP אינו parser או adoption. בנפרד נשארים חסומים: חוזה ראיה מלא לסגירת finding, ‏AST/operand/profile dispatch, בחירת מקורות והגדרות בפועל, ‏Anchor-to-DRP admission, ראיות סמכות/משאב/זמן/status/חתימה/עמידות, ‏parent reservation/nonreuse/recovery ו־CANCEL/LOOKUP, וכן אימוץ B0/Current בהמשך. יעד full Subject descriptor טרם הושג; כל 156 ה־imports בפועל פתוחים. ממשיכים Planning-only עם ביקורת read-only לפני עריכה, apply_patch, הקפאה ושתי ביקורות לפני reconciliation ועדכון התוכנית. ‏Gate29 BLOCKED; development freeze ACTIVE; foundations 0/6; ‏Atomic Task Registry NOT-ACCEPTED; כל credit=0; אחוזים, שעות ו־ETA הם unknown/unavailable. לאחר OSG V2 בסעיפים11.2.80–84, ההמשך התחום הוא חוזי constructor ו־source admission מלאים לשלושת גופי המקור, ובהמשך שאר owner/type/Root grammar; הגדרות צורה חדשות אינן משחזרות גופים היסטוריים או ראיות. לאחר SCA V2 בסעיפים11.2.85–89, ההמשך התחום הוא closed input/evidence contracts לשלבי source-use ומיפוי סמכות וזהויות: Context, capability/budget, sealed-byte observation, discovery, constructor results ו־FinalSourceTranscript. Recipes ושלבים כתובים אינם ראיות execution. לאחר SIE V2 בסעיפים11.2.90–94 נכתבו חוזי קלט/claims מקומיים והפניות ללא Root חדש; ההמשך התחום הוא חוזי external ingress/evidence מלאים עם owner/authentication/operation/operand bindings ו־Root occurrence/rank closure ככל שנדרש.12ports נותרים requirements בלבד. לאחר NEC V2 בסעיפים11.2.95–99 נכתבו גופי subject ויחסי consumer ל־INGRESS/CONTEXT; ההמשך הוא concrete native origin/install/current-selection/role/raw-intake/conformance proof schemas ו־signed/Root-bearing mappings לפי בחירת מקור חיצונית. כל12ports עדיין פתוחים בפועל. לאחר NPA V2 בסעיפים11.2.100–104 נכתבו חוזי origin/grant/חתימה/status וצריכה ללא Runtime Root. ההמשך הוא actual native provider/origin/material/status/target/enforcement proof schemas וקישור אמת התצפיות, מעבר לאימות מקורן; כל12ports פתוחים. לאחר NESA V1 בסעיפים11.2.105–108 הוגדרו דרישות לבחירת מקורות וקריטריוני השוואה. ההמשך לסכמות ממשיות דורש תחילה החלטת runtime/origin/authority/source חיצונית ותיעוד גרסאות אמיתי; אין להשלים את החסר באמצעות mirror או provider מומצא. לאחר מחקר KMS/OIDC במסירת V3 / Machine V2 בסעיפים 11.2.109–111, ניתן לשאת את רכיבי החתימה/גישה כמועמדי השוואה בלבד; החלטת verifier control/runtime/resource/action וסמכות מדויקת עדיין נדרשת לפני מיפוי מקור בפועל.

11.2.66 הוקפאו [HRC V1 — Machine](inherited-requirement-custody-proposal-v1-2026-09-09.json), ‏SHA-256=`a2c646188c83d5ba6a8bf7c2ae3d9ebb34dfcc5adee83fec6ef06cdbbd44ec5c`, ‏bytes=`357485`, ‏lines=`8034`; ו־[Human](inherited-requirement-custody-proposal-v1-2026-09-09.md), ‏SHA-256=`2809e52bb9e9cd424f0579f61cfde20301c3aa940de8be96f58802faaec8679f`, ‏bytes=`359611`, ‏lines=`8058`. [Freeze](inherited-requirement-custody-v1-freeze-2026-09-09.json), ‏SHA-256=`cbef66b6166506401e28336ac9e76d32c9e3594783624d6decad591783d03951`, קושר את הזוג. זהו companion תיעודי ל־DLP V3, ללא שינוי wire. כל 40 התנאים נשמרו במלואם עם מקור, SHA, סעיף, שורת JSONL ו־byte span. 116 מקטעי העריכה מכסים את הטקסט בדיוק; הם אינם conjuncts מוסמכים או משימות אטומיות.

11.2.67 [Review A](inherited-requirement-custody-v1-structural-review-a-2026-09-09.md) ו־[Review B](inherited-requirement-custody-v1-hostile-review-b-2026-09-09.md) החזירו `PASS/PASS` על אותו זוג, בלי לקרוא או להיוועץ בביקורת הסופית האחרת, וללא ממצא actionable חדש. [Reconciliation](inherited-requirement-custody-v1-review-reconciliation-2026-09-09.json), ‏SHA-256=`2ef2ba8c89e8c068c9ada1692b3b5dd50f75d1bc79c65603ed66600d6afef950`, משמר את ההכרעות. כל 20 חובות ה־pre-edit נשמרו כגבול או עבודה פתוחה; acceptedClosure=false וכל credit=0. התוכנית עודכנה רק לאחר שני הדוחות וה־reconciliation. [הגרסה שלפני העדכון](inherited-requirement-custody-v1-living-plan-before-2026-09-09.md), ‏SHA-256=`25517bb13f86659ceff1cddaafc12aa204039ce0be6369bc582de08dc3cd4245`, שומרת את bytes המקור שנקרא בביקורת.

11.2.68 מכנה הממצאים הוא 25 מ־V1.7 ועוד 15 מ־V1.8. ה־17 החדשים מ־V1.9, ‏17 controls ו־15 validators נשמרים בנפרד, ללא merge או closure transfer. F008 נשאר mechanical closure היסטורי בלבד. כל 47 מקורות V1.9 ו־13 payloads תואמים לזהויותיהם התיעודיות. בעת הקפאת HRC תאמו ב־G1 רק 10 מתוך 11 מקורות. במסגרת HSC שוחזרו גם bytes התוכנית ההיסטורית בעלת SHA `aba0983bb836692bac038fa71633201ae772a07cb4ee7694988121f8f20089ec` בעותק הנפרד שבסעיף 11.2.72. תצפית HRC הקפואה נשארת היסטורית; ההעתק המאוחר בסעיף 11.2.67 אינו מחליף את מקור G1. אין טענת סגירה מלאה של source set או סמנטיקה טרנזיטיבית.

11.2.69 לכל תנאי נשמרו residual obligation ו־counterexample ייעודי. רמזי האופרטורים הם IDEA-ONLY; אין exact selectors, typed bindings, תוכניות או conformance מכוחם. שמונה חובות HRC-PC01..08 מחייבות בהמשך מקור ופירוק סמנטי מלא, target ו־phase מפורשים, Operands מטופסים, תוכנית/Profile מדויקים, primitive סגור, ראיית conformance עצמאית, corpus התנהגותי וצריכה ללא מעגלים. ההבחנה בין 65/17 והתפקידים ההיסטוריים לבין חוזי DTC/DRP הנוכחיים נשמרה. 40 positive ו־58 negative specifications לא הורצו. כל 156 imports בפועל, full Subject semantics וראיות סמכות/משאב/nonreuse/recovery נשארים פתוחים. אין שינויי מוצר, Tests/Build, הפעלת readers/evaluators או Git/GitHub/Deployment mutations; Technical Master נשאר ללא שינוי. Gate29 BLOCKED; development freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים, שעות ו־ETA unknown/unavailable.

11.2.70 הוקפאו [HSC V2 — Machine](historical-semantic-obligations-proposal-v2-2026-09-09.json), ‏SHA-256=`6abbf37f84ea524636b3985ba88871b61e71304fad93c3415b59063ad5e561b3`, ‏bytes=`1106407`, ‏lines=`20968`; ו־[Human](historical-semantic-obligations-proposal-v2-2026-09-09.md), ‏SHA-256=`357250aaf1ba75f34a1d5492c56cc7dfcba4c5cc6db081687cb091ce9269ea93`, ‏bytes=`1108079`, ‏lines=`20984`. [Freeze](historical-semantic-obligations-v2-freeze-2026-09-09.json), ‏SHA-256=`2525ec970dea30d8c661460574f18319f6c6f78b08acf556d27a413a389e64b3`, קושר את הזוג ואת מקור G1 המשוחזר. אלה גרפים מוצעים ל־40 תנאים פרטיים עם146 יחידות פעולה,80 domains,3 חלופות OR,17 יחסי סיבתיות,4 קבוצות related-run ו־5 קבוצות atomic/recovery. אין בכך משימות אטומיות מאושרות, semantic equivalence מלאה או programs מוכנים.

11.2.71 [Review A](historical-semantic-obligations-v2-structural-review-a-2026-09-09.md) ו־[Review B](historical-semantic-obligations-v2-hostile-review-b-2026-09-09.md) החזירו `PASS/PASS` על אותו זוג, ללא ממצא actionable חדש וללא קריאה או התייעצות עם הסוקר האחר בסבב. [Reconciliation](historical-semantic-obligations-v2-review-reconciliation-2026-09-09.json), ‏SHA-256=`081a7f791933f70237fb8d37138b263b675dc2592d61f532e1bd775ad723cf83`, משמר את שתי ההכרעות. V1 ודוחותיו נשמרו ללא שינוי עם FAIL/FAIL ו־FAIL של המתאם. HSC-A-001, HSC-B-001 ו־HSC-COORD-001 נשארו שלושה מזהים נפרדים; התיקון קיבל מענה תכנוני תחום עם acceptedClosure=false וכל credit=0. כמתי both readers של ה־corpus חלים רק על F007 U04 ו־F015 U05. ב־F015 חובת כל reader לאכוף admission וקריאה בטוחה קשורה בנפרד לעוגני Evidence/Impact/Closure; reader אינו הופך למחבר סכמות או לספק ה־external input. חובות העצמאות המשותפות ב־F001/F005 נשמרו.

11.2.72 [מקור התוכנית ההיסטורית של G1](historical-semantic-obligations-v1-g1-plan-source-2026-09-09.md), ‏SHA-256=`aba0983bb836692bac038fa71633201ae772a07cb4ee7694988121f8f20089ec`, ‏bytes=`35498`, ‏lines=`732`, שוחזר byte-for-byte באמצעות local Git read-only מן revision `e30a6c1cd2812c9eeaac1839e550dd5e9121da6c`, ‏blob `e9e9b5b8c5d0876414d903bd1b73dececd6ca0b6`. זמינות מקור אינה סמכות נוכחית, החלפת Root או סגירת source semantics. [עותק התוכנית שלפני עדכון HSC](historical-semantic-obligations-v2-living-plan-before-2026-09-09.md), ‏SHA-256=`e4d77c452c21a7b2000e5ec366395221252122bf3b4790714b8f58d3b7eea50a`, משמר בנפרד את הגרסה שקראו המבקרים. העדכון הנוכחי בוצע רק לאחר שני הדוחות וה־reconciliation.

11.2.73 נשמרו ארבעת parser profiles,9 carriers,14 namespaces ו־475 source-member occurrences, וכן המאגרים הנפרדים של323 crosswalks,4016 predicates,53450 uses ו־574 behaviors. ששת חסמי HSC-SG001..006 נשארו פתוחים: terminal delimiter/EOF של בלוק הדרישה האחרון ושל בלוק הממצא האחרון; grammar מפורש לכותרות; שלמות גילוי שדות SchemaId; פירוש schema expressions כגון SET; ותחולת no-write ההיסטורית מול diagnostic writes המותרים ב־DTC הנוכחי. תצפית literal של115 מופעים ו־22 raw strings אינה מחליפה את114/21 ההיסטוריים ללא grammar מפורש. התאמת475 המופעים אינה independent parser rediscovery או transitive semantic coverage. SIP V1 בסעיפים 11.2.75–79 מוסיף חוזי target מפורשים לגבולות ולתחביר והרחבת routes חלקית; חסמי המקור ההיסטורי נשמרו ללא שינוי וללא acceptedClosure.

11.2.74 כל22 חובות pre-edit נשמרו כדרישה או עבודה פתוחה.44 positive ו־70 negative specifications לא הורצו. לאחר חוזי הפירוש המוצעים ב־SIP V1, עדיין נדרשים grammar מלא, crosswalk מדויק, הרחבה טרנזיטיבית וקישור לכל source/target/phase/Operand/Program/primitive/ראיית conformance בפועל. כל156 imports, ‏full Subject descriptor, חוזה ראיית finding closure, סמכות/משאב/nonreuse/recovery ו־CANCEL/LOOKUP נשארים פתוחים. אין שינויי מוצר, Tests/Build, הפעלת readers/evaluators/fixtures, Git/GitHub/Deployment mutations או provider/config/key/signature. ה־baseline ו־Technical Master נשארו ללא שינוי. Gate29 BLOCKED; development freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים, שעות ו־ETA unknown/unavailable.

11.2.75 הוקפאו [SIP V1 — Machine](source-interpretation-contract-proposal-v1-2026-09-09.json), ‏SHA-256=`2f59ae79dfdc7dc81166ab4680d8549dbdbfc7a1ef95c0fe1aa641ddbd0283dc`, ‏bytes=`456233`, ‏lines=`9778`; ו־[Human](source-interpretation-contract-proposal-v1-2026-09-09.md), ‏SHA-256=`ed2d08936371969fd3b7d09b73703c6f6ec99d03f5448271d92c12c10a824473`, ‏bytes=`457538`, ‏lines=`9794`. [Freeze](source-interpretation-v1-freeze-2026-09-09.json), ‏SHA-256=`04ca7a09aa45f5b7ba3648a657e5657e352bd1b078eece72fe5f47ac8a920be9`, קושר את הזוג. זהו companion של target contracts חדשים: שני heading profiles, grammar לביטויי סכמה, הרחבת routes חלקית ו־failure-footprint disposition. ארבעת הפרופילים ההיסטוריים, HSC ו־DLP הקפואים לא שונו.

11.2.76 [Review A](source-interpretation-v1-structural-review-a-2026-09-09.md) ו־[Review B](source-interpretation-v1-hostile-review-b-2026-09-09.md) החזירו `PASS/PASS` על אותו זוג, ללא ממצא actionable חדש וללא קריאה או התייעצות עם הסוקר האחר. [Reconciliation](source-interpretation-v1-review-reconciliation-2026-09-09.json), ‏SHA-256=`9664c73e778104a5f80dbe82ce3f874d45914f14ebf8b87aeaf2a9f26841cd26`, משמר את ההכרעות. כל24 חובות pre-edit נשמרו כדרישה או עבודה פתוחה; כל6 חסמי HSC נשמרו עם acceptedClosure=false. [עותק התוכנית שנקראה בביקורת](source-interpretation-v1-living-plan-before-2026-09-09.md), ‏SHA-256=`65b7b2d8addd918b74da5d39a82789ab6ef51d9c67280be21a4cf9efbeae653c`, נשמר לפני העדכון. העדכון בוצע רק לאחר שני הדוחות וה־reconciliation.

11.2.77 ה־heading contracts מגדירים UTF-8/LF ללא normalization, column0 וטוקנים מילוליים, מספור מקומי/גלובלי, framing של כל carrier ו־terminal חובה ללא EOF fallback. בנוסף ל־REQ112/F031, גםF018 מסתיים ב־19777 לפני P1 ו־F030 ב־31294 לפני P2; כלל next-such-heading ההיסטורי לא הגדיר גבולות אלה. כותרת3.1/F019 דורשת local1 ו־global19 בנפרד. נשמרו143 heading occurrences מתוך475 members;323 numeric spans ו־9 whole carriers נפרדים. אימוץ הפרופילים החדשים מחייב identities חדשות של143 MemberCore ושני sets/namespaces ו־crosswalk לכל dependent reference, גם אם span digests זהים. MemberCore ממשיך להוציא namespaceRoot כדי למנוע מעגל. לא הופעל parser או independent rediscovery.

11.2.78 עשרה routes מפרידים owners של9שמות שדות ו־150 מופעים, לרבות15 machine contexts ו־93 guard contexts. ATOM/SET<ATOM> הוא grammar target חדש; parsing, resolution ו־admission נפרדים. namespace/version/fullRoot אינם נובעים מהשם, ו־SET אינו קובע cardinality/quorum/encoding/independence. DECLARATION, NAMED-REFERENCE, TYPE-EXPRESSION ו־ROOT-REFERENCE אינם מתמזגים.61 מתוך63 schema declarations בעלי fieldTypes ריק; שני הגופים הלא־ריקים אינם הוכחת הגדרות שלמות. לכן full owner/type/Root/Markdown grammar, legacy34 field classification, nested discovery ו־typed selectors נשארים חסומים.114/21 לפי פירוש leaf מוצע אינו הוכחת grammar היסטורי ואינו מחליף את literal115/22. OSG V2 בסעיפים11.2.80–84 מוסיף63-row recovery ledger ושלושה גופי יעד נפרדים;61מפות המקור הריקות נשארו ללא שינוי, ושאר owner/context/root grammar עדיין פתוח.

11.2.79 שישה branches משמרים בנפרד את atomic no-write failure ההיסטורי, כלל17durable/noPermit ואת כתיבות Decision+Outcome הנוכחיות. Decision malformed או סמכות חסרה אינם מתירים REJECTED_INVALID כותב; response loss/no-new-CAS אינם מוכיחים שלא נכתבה תוצאה קודם. Decision/Outcome משמשים ownership/arbitration/nonreuse ולכן שינוי שם phase אינו פתרון. מיפוי65comparisons/17durable identities לחוזה הנוכחי נשאר UNRESOLVED-CROSSWALK, ללא שינוי DLP.12positive/38negative specifications לא הורצו;20 source locks ו־155 עוגני ציטוט תאמו תיעודית. מלוא grammar, migration, תוכניות וראיות conformance,156imports, סמכות/משאב/nonreuse/recovery/CANCEL/LOOKUP נשארים פתוחים. לא בוצעו שינויי מוצר, Tests/Build, readers/evaluators/selectors/fixtures, Git/GitHub/Deployment mutations או פעולות רשת/provider/config/key/signature. הבסיס ו־Technical Master ללא שינוי; Gate29 BLOCKED; development freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כלcredit=0; אחוזים, שעות ו־ETA unknown/unavailable. OSG V2 מוסיף חוזי צורה לנתוני מקור בלבד ואינו משנה את ששת branches, את DLP או את UNRESOLVED-CROSSWALK.

11.2.80 הוקפאו [OSG V2 — Machine](source-owner-grammar-proposal-v2-2026-09-09.json), ‏SHA-256=`f103bbb240e85898a66cc934b094787ed7cbdcce8927bcc3dc9bcdedd242813e`, ‏bytes=`327299`, ‏lines=`8335`; ו־[Human](source-owner-grammar-proposal-v2-2026-09-09.md), ‏SHA-256=`6cbd11c5e8b4ace86a4ead5434834e514c00a726970a4d64a99ebd7473976279`, ‏bytes=`328782`, ‏lines=`8351`. [Freeze](source-owner-grammar-v2-freeze-2026-09-09.json), ‏SHA-256=`93378bdc71277a6fd79bce99dbf8671a2c4b13d6a0688b37b1db3808bb637c37`, קושר את הזוג. מדובר ב־companion של source-qualified recovery ושלושה חוזי Core מוצעים עם שתי תצוגות Row, ללא החלפת schemaRoot או גוף מקור היסטורי.

11.2.81 V1 נשמר עם [Review A FAIL](source-owner-grammar-v1-structural-review-a-2026-09-09.md) ו־[Review B FAIL](source-owner-grammar-v1-hostile-review-b-2026-09-09.md). OSG-A-001/OSG-B-001 מתעדים עמימות אחת במפרטי positive: Row מלאה הותרה כ־Core ולהפך. V2 קובע קלט יחיד לפי descriptor ומוסיף NEG180–183 לשני הכיוונים. [Review A V2](source-owner-grammar-v2-structural-review-a-2026-09-09.md) ו־[Review B V2](source-owner-grammar-v2-hostile-review-b-2026-09-09.md) החזירו PASS/PASS על אותו זוג ללא ממצא חדש וללא התייעצות הדדית. [Reconciliation](source-owner-grammar-v2-review-reconciliation-2026-09-09.json), ‏SHA-256=`214bb15e056a2a69b45c249bcd096987d78f3a3c05263675df57c5b2b041605e`, נשמר לפני העדכון. [עותק התוכנית שנקראה בביקורת](source-owner-grammar-v2-living-plan-before-2026-09-09.md), ‏SHA-256=`3927dff3e9a132f67502c4fa994d9a5be659c589db15f22f400f0b9801f946b1`, משמר את binding של V1/V2 לפני שינוי התוכנית החיה.

11.2.82 ledger שומר בדיוק63V17 declarations,519required field occurrences ו־6fieldTypes entries בשתי הסכמות הראשונות.61fieldTypes maps היסטוריות נשארות ריקות. בטבלאות V18/V19 נמצאו4same-ID candidates בלבד;59IDs אינם declarations שם. שלוש ההתאמות משנות קבוצת שדות; SOURCE-CONJUNCT משמר אותה קבוצת8שדות בסדר אחר עם type tokens, אך Root אחר וגרסה חסרה. כל4Roots שונים; version אינו מושלם ל־1.63ID/Root entries ב־V19 target registry הם reference custody, לא type bodies. V1.10/G1 receipt schemas אינם השלמה של הקטלוג; source-language tokens, observed JSON kinds ו־new target rules נשארים נפרדים.

11.2.83 הוגדרו SourceCarrier8, MemberCore11→MemberRow13 ו־NamespaceCore9→NamespaceRow10;19nominal types ו־51field slots. carrier/path/rawRoot/locator נקשרים לאותה רשומת מקור; Member ייחודי בצמד namespaceId/memberId. namespaceId הוא label מוקדם ולא namespaceRoot עתידי. exact11/9-field projections מוציאות memberCoreRoot/namespaceRoot מהקלטים המתאימים; extras נדחים לפני projection. MemberCore→memberCoreRoot→memberSetRoot→NamespaceCore→namespaceRoot→Rows שומר על סדר ללא back-edge. schema ההיסטורי הוא source echo; OSG descriptor ID אינו תחליף לו. טיפוסים, constructor, source bytes, RootRef ו־adoption אינם זהים. כל שינוי משמעות/profile/framing מחייב זהות חדשה ו־migration מפורש.

11.2.84 כל24חובות pre-edit נשמרו בחוזה או כעבודה פתוחה.43source locks ו־7עוגני ציטוט תאמו;8positive/183negative specifications לא הורצו. שלושת גופי היעד אינם השלמת61מפות המקור;58הגופים הריקים האחרים מחוץ להיקף כתיבת הגוף הזאת.37root properties ו־15context IDs ב־108occurrences, full owner/type/Root/Markdown grammar, constructor/canonicalization/conformance, acquisition/path/resource bounds, independent discovery, migration,156imports ו־failure-footprint crosswalk נשארים חסומים. ההמשך התחום הוא חוזי constructor ו־source admission מפורשים, ואז יתר grammar והראיות. לא בוצעו שינויי מוצר, Tests/Build, project programs/readers/parsers/validators/selectors/evaluators/fixtures, Git/GitHub/Deployment mutations או פעולות רשת/provider/config/key/signature. Technical Master והבסיס ללא שינוי. Gate29 BLOCKED; development freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כלcredit0; אחוזים, שעות ו־ETA unknown/unavailable. SCA V2 בסעיפים11.2.85–89 כותב שישה recipes ושלבי admission מוצעים; actual constructor/capability/typed evidence/conformance נשארים unavailable, ללא שינוי ב־OSG או במקורותיו. SCC V1 בסעיפים 11.2.115–118 מוסיף descriptor עצמאי לשמונת שדות SOURCE-CONJUNCT וקשרי טווחים; הוא אינו הרחבה תחת זהות ה־OSG grammar הסגור או מילוי מפות המקור ההיסטוריות.

11.2.85 הוקפאו [SCA V2 — Machine](source-constructor-admission-proposal-v2-2026-09-09.json), ‏SHA-256=`c8e68b401c416e39040628e6ee2d275e5f9385ef0533a79cd710d01445b9e878`, ‏bytes=`128380`, ‏lines=`2187`; ו־[Human](source-constructor-admission-proposal-v2-2026-09-09.md), ‏SHA-256=`b8f308b1eb91940277cb4328f3afb9ac7ac6bb65203fbff0eb55a4e324c63316`, ‏bytes=`129666`, ‏lines=`2201`. [Freeze](source-constructor-admission-v2-freeze-2026-09-09.json), ‏SHA-256=`b0debec40157283e186a348de55850f1d11f2445604559bc8c71fc1ffde2e54e`, קושר את הזוג. ההצעה תחומה ל־ASCII Core preimages ו־PINNED-CONTENT source-use; אינה generic canonicalizer, typed runtime/evidence schema או אימוץ.

11.2.86 [Review A](source-constructor-admission-v2-structural-review-a-2026-09-09.md) ו־[Review B](source-constructor-admission-v2-hostile-review-b-2026-09-09.md) החזירו PASS/PASS על אותו זוג, ללא ממצא חדש וללא התייעצות הדדית. V1 נשמר עם Review A FAIL ו־Review B PASS. SCA-A-001 תוקן ב־V2 באמצעות operands ייעודיים בכל12מפרטי ה־recipe החיוביים ו־3מקרים שליליים נוספים: raw B, B+span ורשימת112digests מלאה במקום קלט Core כללי. החוזים והמקורות ההיסטוריים לא שונו. [Reconciliation](source-constructor-admission-v2-review-reconciliation-2026-09-09.json), ‏SHA-256=`92e8a55f1e254e729f06a179690ff4afcfc4e8faaad3aa2bd6ed7a76829f7fc1`, נשמר לפני עדכון התוכנית. [עותק התוכנית שנקראה בביקורת](source-constructor-admission-v2-living-plan-before-2026-09-09.md), ‏SHA-256=`0b2f95f1a08c192b8685af7ea60c6aac02fce6a80bb0623e955987155e790337`, משמר את source binding הקודם; OSG/SIP custody copies נשארים בנפרד. כל24חובות pre-edit נשמרו בחוזה או כעבודה פתוחה.

11.2.87 שישה recipes קובעים: raw Carrier B; raw Member slice מאותו B; CPB1(domain,version,canonical ProfileCore4); CPB1 של MemberCore11; MemberSet עם frame נפרד לכל64ASCII digest בסדר ובמכפליות; CPB1 של NamespaceCore9. Profile Row7 מוסיף parserProfileRoot/schemaVersion/versionFraming לאחר ה־Core; הסרת Root בלבד משאירה preimage שגוי. version הוא byte ASCII1 ב־frame נפרד, לא suffix/JSON string/binary integer. כל Core הוא payload frame אחד ללא LF סופי. scalar encoding וסדר מפתחות מפורשים בתחום printable ASCII; numeric tokens נבדקים לפני coercion. observed16/3325/112string occurrences אינם הוכחת Unicode כללית או execution; פער code-point/UTF-16, constructor evidence ו־adoption נשארים פתוחים.

11.2.88 VERIFY-EXISTING-ROW: provisional shape מלאה → projection מדויק → reconstruction → equality מאוחר. CONSTRUCT-FROM-CORE: Core inputs בזמן שהתלויות המוקדמות זמינות → construction → materialization; אין expected own/late Root או Row מוקדם. עשרה שלבים משמרים context/mode/purpose/definitions/resource selections מלאים ואותו sealed immutable B. Profile/Member/Set/Namespace Roots נוצרים קדימה; namespaceId הוא label מוקדם. independent discovery ו־exact occurrence equality קודמים ל־count/set hashing; whole-carrier וילדיו אינם deduplicated. FinalSourceTranscript אחרון ומחוץ לכל preimage מוקדם; diagnostic אינו success receipt. raw pin אינו containment/currentness/atomic filesystem snapshot; capability/authority/budget/sealing evidence נדרשים בנפרד. אין AGV child, DLP Attempt/Final, operator או authority boolean חדש.

11.2.89 33source locks ו־4עוגני קוד תאמו תיעודית. 14positive/52negative specifications לא הורצו; לא חושבו candidate preimages/Roots. ההמשך התחום הוא closed input/evidence contracts ל־Context, resource/capability policy, sealed bytes, independent discovery, constructor results ו־FinalSourceTranscript, עם identity/authority mappings ובלי מעגלים. full source/owner/type/Root/Markdown grammar,61fieldTypes bodies היסטוריים,37root owners/15contexts, migration, conformance,156imports, historical no-write/current rejection crosswalk ו־nonreuse/recovery/CANCEL/LOOKUP נשארים פתוחים. לא בוצעו שינויי מוצר, Tests/Build, project/candidate programs/constructors/parsers/validators/readers/selectors/evaluators/fixtures, Git/GitHub/Deployment mutations או פעולות רשת/provider/config/key/signature. Baseline ו־Technical Master ללא שינוי. Gate29 BLOCKED; development freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כלcredit0; אחוזים, שעות ו־ETA unknown/unavailable. חוזי הנתונים המקומיים מוצעים כעת ב־SIE V2, סעיפים11.2.90–94; actual proof schemas/authentication/evidence אינם נסגרים באמצעותם.

11.2.90 נוסף [Source-use input/evidence V2 — Human](source-use-input-evidence-contract-proposal-v2-2026-09-09.md), עם [Machine](source-use-input-evidence-contract-proposal-v2-2026-09-09.json), [Freeze](source-use-input-evidence-v2-freeze-2026-09-09.json) ו־[Reconciliation](source-use-input-evidence-v2-review-reconciliation-2026-09-09.md). Machine SHA-256=`71c61f6e781f44f87d05cd889db34ced139f6ac8a3abbd574349ad8011c6c0d2`; Human SHA-256=`d088bb877f6e4f20cdd48c7f976beb73948c94a4bdd741f7beb221a5c1f6b73c`. שתי ביקורות עצמאיות PASS/PASS על אותם bytes, ללא ממצא actionable חדש, תחומות לחוזים מקומיים כתובים בלבד. V1 נשמר עם FAIL/FAIL. V2 מפריד success prerequisites מ־actual predecessors בכשל, מוסיף missingDependencies סגורים, קושר S01 ישירות ל־S00 ומגדיר bounds נפרדים לפי שלב הקליטה/הדיאגנוסטיקה. נוספו5positive/4negative מפרטים שלא הורצו.

11.2.91 212הגדרות סוג מקומיות כוללות15שדות Context מוקדמים, policy/capability, sealed-byte/discovery claims, שישה branches ותוצאות שלבים/הצלחה/כשל.19scalar types ו־5OSG shapes מיובאים תיעודית עם החובות, לצד ProfileCore4 וחוזי SCA. OSG JSON integers אינם UIntText strings; raw/digest roles נשמרים גם כאשר bytes שווים. כל record סגור, arrays מוגבלים ובעלי order/uniqueness/empty semantics; אין unknown-key/ANY/fallback או alias של AGV/DLP/ProofBytes.

11.2.92 Context אינו מאמת את parser/limits הדרושים לקריאתו: installed ingress/authentication/source/diagnostic premises קודמים לקלט. כל15הבחירות המלאות שוות בכל record; local refs פותרים פעם אחת רק target kind מוקדם באותו inventory, ללא ownRoot/content-hash/canonicalizer חדש.12resource dimensions כוללים צבירה/peak/intermediate/CPB1/diagnostic overhead וזמן תחת clock מוקדם; measurements/capability בזמן פעולה אינם מסופקים באמצעות policy או pin. sameB/EOF/framing/physical guarantees דורשים ראיה ממשית.

11.2.93 Discovery נפרד לכל reader עם full occurrence tuples ודומיין עצמאי; IDs/counts/equal lists אינם independence/completeness. R01=B; R02=B+span; R03=ProfileCore4; R04=MemberCore11; R05=רשימת R04 מלאה, ASCII digest order ושימור multiplicity; R06=NamespaceCore9 לאחר R05. VERIFY full Rows קודמים ל־projection, derived equality מאוחר; CONSTRUCT אינו דורש own/late Row. S09 אחרון עם exact S00..08 instance coverage וכל late joins. כשל מוקדם אינו דורש valid Context או תוצאות עתידיות; ידוע/חסר/notStarted/effects נשמרים, ללא zero-write inference.

11.2.94 28מקורות ננעלו;26positive/41negative מפרטים תכנוניים לא הורצו.28חובות pre-edit נשמרו.12external ports הם dependency declarations בלבד, ללא actual authenticated evidence reference/body או סגירת imports. ההמשך הוא external ingress/context/capability/resource/clock/sealing/discovery/independence/constructor/late-join/transcript evidence schemas עם exact subject/operation/purpose/operands/provenance וה־Root closures הנדרשים. full source/owner/type/Root/Markdown grammar,61fieldTypes/37Root owners/15contexts, migration, conformance,156imports, historical no-write/current DLP crosswalk ו־nonreuse/recovery/CANCEL/LOOKUP פתוחים. Baseline/Technical Master ללא שינוי; Planning-only; Gate29 BLOCKED; development freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כלcredit0; אחוזים/שעות/ETA unknown/unavailable. גופי INGRESS/CONTEXT ויחסי הצרכן מוצעים ב־NEC V2, סעיפים11.2.95–99; אין בכך סגירת native evidence או authentication.

11.2.95 נוסף [Native ingress/context V2 — Human](native-ingress-context-body-proposal-v2-2026-09-09.md), עם [Machine](native-ingress-context-body-proposal-v2-2026-09-09.json), [Freeze](native-ingress-context-v2-freeze-2026-09-09.json) ו־[Reconciliation](native-ingress-context-v2-review-reconciliation-2026-09-09.md). Machine SHA-256=`d1fcff9652856922bc07c616f8217aacef39d6220064ced6e90feefc3df1e917`; Human SHA-256=`d07fee8d501b5c6e523d2e868a6e2ee1d144feefcd8e64b4b114296c8c5dda28`. שתי ביקורות עצמאיות PASS/PASS על אותם bytes, ללא ממצא actionable חדש, בתחום subject bodies/consumer relations בלבד. V1 נשמר עם FAIL/FAIL על שוויון מוקדם שחסם mismatch. V2 משאיר את ה־frame קשור רק לבחירה המצופה, מוסיף45טיפוסי תצפית מפוענחת נפרדים ללא שינוי68ייבואי SIE, ודורש שוויון ותנאי קבלה רק ב־NEC-P15/MATCH. הבדלים נשמרים ב־COMPARED/REJECTED; אין קידום סמכות.

11.2.96 199types, מתוכם68SIE imports מדויקים ו־131סוגים נומינליים חדשים, מגדירים host/use expectation מוקדם,6BootstrapRequirementData components,2limit groups ו־8עמדות expected/observed installation/current host. native trust/parser/metagrammar/diagnostic bounds קודמים לקריאת כל NEC body ואינם נוצרים מתוכו. BCE/AGV/BIA/Grammar design references בלבד; אין signature envelope/RootRef/credential/public-key/codec או capability alias.5roles מוצעים אינם appointment או grant בפועל; Tal נשאר work owner בלבד.

11.2.97 Phase split שומר readiness מוקדם ללא candidate bytes/S00/Inventory/Final עתידיים. לאחר readiness ורשות קריאה נפרדת, capture מאוחר קושר actual raw subject/length/custody/intake event, parser/metagrammar, active host בזמן הקריאה ומדידות input/depth/token/digits/container אל decoded Context מלא. BEFORE window אינו ראיה ל־AT-CONTEXT-READ; installation receipt אינו current selection. גבולות חסרים אינם0 ואינם default; required freshness/nonreuse צריך native authoritative evidence, לא ID/hash/ordinal. אין state transition או permission שנוצרו מהגוף.

11.2.98 ExpectedContextSelection קודם לקריאת candidate ומכיל Context15 ו־15singular owner/source/path provenance slots. כל שדה וכל nested roster/definition/version/purpose מושווים במלואם; אין count/digest/ID shortcut או candidate-filled expectation.45טיפוסי תצפית נפרדים משמרים את מבנה הנתון שנקרא, כולל הבדלים ב־sourceUseIdentity/mode/purpose ובמערכים, ללא שינוי68ייבואי SIE. ה־frame קשור לבחירה המצופה בלבד; שוויון ותנאי המקור נדרשים ב־NEC-P15/MATCH. mismatch נשמר ב־COMPARED/REJECTED לצד missing evidence; אין cast לתוקף או התקנת operational limits מתצפית כושלת. שני profiles עם19predicates ו־exact operation/ordered IDs/outcomes מפרידים readiness מ־Context binding. ABSENT/MALFORMED/UNAVAILABLE משמרים raw/partial observations ו־known failures לצד missing evidence בלי Context/outputs מומצאים. inline body copies קודמים לפי ordinal וכל תוכנם זהה; אינם proof namespace או targets חדשים ל־SIE PriorRef.

11.2.99 27מקורות ננעלו;27חובות PRE ו־18positive/36negative מפרטים תכנוניים נשמרו ללא הרצה.12native dependency contracts נותנים subject/producer/consumer/phase לחסרים; actual origin/install/current-state/role authorization/parser conformance/raw intake/time/nonreuse/evaluation/signed-Root schemas אינם מסופקים. שני גופי INGRESS/CONTEXT כתובים אך שני ה־ports נשארים פתוחים, לצד יתר10ports. ההמשך הוא concrete authenticated native proof schemas ומיפויי מקור/סמכות/representation מלאים; full source/owner/type/Root grammar,61fieldTypes/37Root owners/15contexts,156imports,migration/conformance/HSC/DLP/nonreuse-recovery-CANCEL-LOOKUP פתוחים. Baseline/Technical Master ללא שינוי; Planning-only; Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כלcredit0; אחוזים/שעות/ETA unknown/unavailable. חוזי אימות מקור, direct grants, transport חתימה ו־read prerequisites מוצעים ב־NPA V2, סעיפים11.2.100–104; אין בכך actual authentication או effective permission.

11.2.100 נוסף [Native proof authentication V2 — Human](native-proof-authentication-proposal-v2-2026-09-09.md), עם [Machine](native-proof-authentication-proposal-v2-2026-09-09.json), [Freeze](native-proof-authentication-v2-freeze-2026-09-09.json) ו־[Reconciliation](native-proof-authentication-v2-review-reconciliation-2026-09-09.md). Machine SHA-256=`1a80957671834efb24df7018b621dd836f6f05403639da7537b1bfb6fe3c8568`; Human SHA-256=`631040512d2c163eca35e9ebca31dabdcc3c0161c8618124434a790045fb3227`. שתי ביקורות עצמאיות PASS/PASS על אותם bytes, ללא ממצא actionable חדש, בתחום החוזים הכתובים בלבד. V1 נשמר עם FAIL של A ו־PASS עצמאי של B. V2 מוסיף40שוויונות מלאים בין basis/request/selection/issuer rule/grant/subject/status/READ, לרבות שני profiles ומקורות status; קובע ירושת context זהה בבדיקות מקוננות; ומגדיר issuer rules כרשימה בסדר המקור, ללא comparator עמום או מיון מתקֵן. כל credit נשאר0.

11.2.101 OriginBasis מתאר מקור native שהותקן עצמאית לפני bytes מועמד; אינו self-signature או receipt שמוכיח התקנה. Per-use selection נפרדת קובעת origin/verifier/recipient/actor/controller/material/role/profiles/status/intent אחרי שהקלטים המוקדמים זמינים ולפני grant ופעולה. Grant ישיר נחתם במפתח issuer ממקור חיצוני, אינו מאומת במפתח subject שהציג; אין delegation, wildcard, capability alias או appointment ל־Tal. חומרי מפתח ציבורי וחתימה משתמשים ב־Grammar transports מדויקים; suite/encoding/implementation בפועל לא נבחרו.

11.2.102 שש משפחות חתימה סגורות: HostObservation, ExpectedContextSelection, CaptureObservation, IngressResult, ContextResult ו־ReadConfirmation. חמשת תפקידי NEC נשמרים; Host BEFORE/AT ושני result profiles נפרדים. Grant כולל כוונת פעולה וקלטים קודמים, לא פלט עתידי. Framing NPA חדש מכסה version/domain/purpose וכל המעטפה וה־grant; רק שדה signatureBytes הישיר מוחרג, חתימות nested נשארות. אין Root חדש, ProofBytes כללי, certificate chain, prehash משתמע, SIE PriorRef target או reuse של framing AGV/BCE/SCA.

11.2.103 Status readout קושר full signed target/grant/material/use/action ומקור נפרד לכל רכיב; issuer/subject/grant/authorization/nonreuse נבדקים בזמן ההנפקה, החתימה, הפעולה והצריכה לפי profile. ACTIVE או signature אינם currentness. READ origin grant קודם ל־reader confirmation, ושניהם קודמים לקריאה; full target/custody/parser/bounds/reader/recipient/earlier readiness+selection נבחרים מראש. אין captured pin, decoded output או AT close עתידי בהרשאה. Read prerequisites דורשים actual native target capability/current enforcement ואינם ראיה לפעולה שבוצעה; כיסוי מאוחר אינו מעניק הרשאה בדיעבד.

11.2.104 561 טיפוסים, מתוכם 199 NEC ו־2 Grammar imports מדויקים; 247 זוגות תצפית נפרדים, 3profiles/22predicates,26חובות PRE ו־21positive/40negative specifications ללא הרצה. 26מקורות ננעלו. Mismatches נשמרים לפני admission; failures ו־missing facts נפרדים. NPA מתקדם בחלקי schema של D01/D05/D11/D12 אך actual origin/material/crypto/status/time/nonreuse/source/enforcement/evaluation וה־Root mappings אם יידרשו נותרים unavailable. חתימה אינה התקנה/אמת/ביצוע. כל12SIEports, full source/owner/type/Root grammar,61fieldTypes/37Root owners/15contexts,156imports,migration/conformance/HSC/DLP/nonreuse-recovery-CANCEL-LOOKUP פתוחים. Baseline/Technical Master ללא שינוי; Planning-only; Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים/שעות/ETA unknown/unavailable. דרישות בחירת המקורות והמידע החיצוני מפורטות ב־NESA V1, סעיפים11.2.105–108; אין בכך source selection, schema compatibility או סגירת port בפועל.

11.2.105 נוסף [Native evidence source admission V1 — Human](native-evidence-source-admission-requirements-v1-2026-09-09.md), עם [Machine](native-evidence-source-admission-requirements-v1-2026-09-09.json), [Freeze](native-evidence-source-admission-v1-freeze-2026-09-09.json) ו־[Reconciliation](native-evidence-source-admission-v1-review-reconciliation-2026-09-09.md). Machine SHA-256=`2fc0829499066c406c6e912abf7f44869a0080cd6e93d7e5301f2f9a676d0639`; Human SHA-256=`4d4103ec6c9f798745256dc3f0db7e2f87bb21cca367331c1e869faf4af87934`. שתי ביקורות עצמאיות PASS/PASS על אותם bytes בתחום דרישות בחירת מקורות בלבד; ללא ממצא actionable חדש. NPA V2 והכרעותיו נשמרו.

11.2.106 NESA אינו runtime schema, מקור אמון, credential, provider adapter או admission receipt. הוא מגדיר12שורות דרישות ו־12ממדי מקור: scope/authority/custody/version/independent selection/observation reach/fact support/time/transport/bounds/state failure/conformance/adoption.12תלויות NPA,12חובות NEC ו־12ports של SIE נשמרים בנפרד; המספרים השווים אינם bijection ואינם מחייבים12ספקים. כל מקור שמכסה כמה חובות דורש ראיות תחולה נפרדות ומדיניות independence כשנדרשת. Tal נשאר work owner בלבד; actual issuer/observer/verifier/enforcer appointments unavailable.

11.2.107 נשמרו22predicates ושלושה profiles המקוריים,40bindings וחוזי NPA מלאים; direct IDs, nested G/S duties ו־global conditions נפרדים. X11 אינו פטור כאשר רשימת ה־IDs הישירה ריקה. X08 שומר שש חובות NEC: installation/current host/conformance/Context provenance/raw intake/evaluation. חתימה אינה אמת, ACTIVE אינו currentness/completeness, ID אינו nonreuse ו־path/pin אינם capability. early capability, actual continuous enforcement ו־late coverage נפרדים; אין future operand או retroactive permission. known failures וכל missing facts נשמרים, ללא מקור/מפתח/JSON הצלחה מומצאים.

11.2.108 ננעלו18מקורות ונשמרו29חובות PRE ו־12positive/23negative specifications ללא הרצה. השלב הבא: לקבל runtime/consumer/resource/action scope אמיתי ומקור חיצוני מורשה להתקנה/בחירת זהויות/מדיניות; לקבל תיעוד source/interface/format/version/guarantees/failure/recovery אמיתי; להשוות לכל הדרישות; ורק אז לגזור source-specific proof schemas ומיפויי signed/Root-bearing מלאים ככל שנדרש. בחירה, conformance, native truth/status/enforcement ואימוץ בפועל נשארים unknown/unavailable. מקור חסר נשאר חסם, ללא עוד mirror שמאשר עצמו. יתר historical grammar/import/migration/conformance/nonreuse/recovery/CANCEL-LOOKUP פתוחים. Baseline/Technical Master ללא שינוי; Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כלcredit0; אחוזים/שעות/ETA unknown/unavailable. מחקר רכיבי KMS/OIDC במסירת V3 / Machine V2 בסעיפים 11.2.109–111 מחדד היקפים ופערים מתוך החלטות ותיעוד רשמי, ללא בחירת ספק או מילוי מקור האמון.

11.2.109 נוסף [KMS/OIDC source assessment — Human delivery V3](native-source-kms-oidc-assessment-human-delivery-v3-2026-09-09.md), עם [Machine V2 ללא שינוי](native-source-kms-oidc-assessment-v2-2026-09-09.json), [Freeze](native-source-kms-oidc-v3-freeze-2026-09-09.json) ו־[Reconciliation](native-source-kms-oidc-v3-review-reconciliation-2026-09-09.md). Machine SHA-256=`a3e1338cd08612c76634fea444b724e9a4a7b4b555817d6ae033cc4aa1c41827`; Human SHA-256=`3d8e3bcd621b68587cb05a1aa69507bf95ab03d25925d15c9c5e969cf7bdda50`. שתי ביקורות עצמאיות חדשות PASS/PASS על אותם bytes בתחום reconciliation של החלטות, מחקר תיעודי ומסירה בלבד. 23 מקורות מקומיים ננעלו ב־Machine; חבילת המסירה נועלת בנפרד את תיקון Human והיסטוריית V2. חמש תצפיות החלטה ושמונה תצפיות רשמיות קושרו ל־12 תלויות NPA. KMS-OIDC-A-001 תוקן ב־successor של סיכום PRE A: G06/G14/G15 בשורות 126/134/135. KMS-OIDC-V2-A-001/B-001 תוקנו בפתיחת JSON fence ב־Human בלבד ובהסבר גרסת המסירה. ה־PRE המקורי, V1 A=FAIL/B=PASS ו־V2 FAIL/FAIL נשמרו; תוכן המחקר המהותי לא השתנה; acceptedClosure=false. סיכומי המקורות הציבוריים נשמרו; דפי ספק אינם pinned raw bytes או account evidence.

11.2.110 KMS/OIDC נשארים מועמדים להשוואת רכיבי חתימה וגישה, בלי בחירת מקור NPA או הנחה שהם מערכת אמון מלאה. נשמרו הפרדת product/artifact/Audit/native authority, קדימות PUBLIC מול תנאי private היסטורי והפרדת symmetric encryption ב־A5 מחתימה. מיפוי עתידי דורש full NPA transcript ומדויק לפי suite/MessageType, material/codec/owner/purpose, כל40bindings וכל profiles/status/nested/global X11. אין מיון מקור מחדש, alias continuity, no-hash גורף, hash של טקסט Base64 במקום bytes, opaque vendor proof או online-to-offline fallback שקט. תיעוד API ושם פעולת קריאה אינם ראיה לתצורה, conformance או העדר effects.

11.2.111 11 חובות מיפוי, שתי אפשרויות בדיקת חתימה להשוואה וחמש החלטות פתוחות; 3 positive ו־9 negative scenarios המקוריים ושני repair planning cases ללא הרצה. נדרשת החלטה אמיתית על verifier execution/control/resource/action, מינויים ומדיניות, בחירה תחומה ברכיבים אם מתאימים, exact material/suite/mode ומקורות status/time/nonreuse/target/enforcement. Actual selection/evidence/compatibility/adoption נשארים unknown/unavailable; כל 12 תלויות NPA ויתר NEC/SIE/historical grammar/import/migration/conformance/recovery/CANCEL-LOOKUP פתוחים. Baseline/Technical Master/NPA/NESA ללא שינוי; Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit0; אחוזים/שעות/ETA unknown/unavailable. מסמך NEXT-01 בסעיפים 11.2.112–114 מצמצם את שאלת הבחירה למשפחת הרצה ומפריד אותה מהחלטת runtime/consumer/resource/action מלאה; הוא אינו משלים מקור חסר.

11.2.112 נוסף [Native verifier boundary decision brief V1](native-verifier-boundary-decision-brief-v1-2026-09-09.md), עם [Freeze](native-verifier-boundary-v1-freeze-2026-09-09.json) ו־[Reconciliation](native-verifier-boundary-v1-review-reconciliation-2026-09-09.md). Brief SHA-256=`b546466c22458dcd910eed4cc3a7c7a5749022b4a6e44974f1755690b6c62da5`; Freeze SHA-256=`8af4f8b1a1a1493a3bbfdc5c2d56412406d3796b9d6d504f3804c1d86522f7da`. שתי ביקורות FINAL עצמאיות PASS/PASS על אותם bytes בתחום הצעת החלטה קצרה. 12 מקורות נעולים, שמונה חובות PRE, שלוש חלופות הרצה, שלוש תצפיות GitHub רשמיות וחמישה מקרי ביקורת סמליים שלא הורצו. ה־Freeze הוא metadata תיעודי; אין Machine body, schema runtime או profile חדש.

11.2.113 משפחות ההרצה להשוואה הן תהליך ייעודי במחשב שבשליטת Tal, משימת CI נפרדת ושירות אימות נפרד. batch הוא כיוון תכנוני מותנה בצורך נקודתי; אין תדירות/latency/עלות/כשירות מאומתים או בחירה בפועל. נשמרים full recipient principal/controller/host/sessionId, הפרדת nominal roles ללא דרישה אוטומטית לשני מחשבים/אנשים, bootstrap עצמאי ובחירות לפי שלב לפני intake/פעולה. שלושת profiles ו־READ-NEC-CONTEXT נפרדים מאמת התוכן, קריאה שבוצעה ואכיפה רציפה. כל NPA/NEC/SIE ו־X11 יורשים את המקורות הקפואים במלואם; אין fallback או תחליף ל־native currentness/nonreuse/target/enforcement.

11.2.114 בעת הקפאת המסמך נשארה שאלת משפחת ההרצה ללא תשובה. תשובה עתידית תירשם במדויק ב־successor או ברשומת החלטה נפרדת; אין להסיק בחירה משתיקה, preselection או “המשך”. משפחה מאפשרת לפרט lifecycle/control אך אינה סוגרת NEXT-01 ללא runtime/consumer/resource/action ממשיים, ואינה עונה על NEXT-02..05. פרטי מקור, התקנה, מינויים, חומר קריפטוגרפי, סטטוס ואכיפה בפועל unknown/unavailable; אין לבקש סודות. בחירה תכנונית אינה הרשאת התקנה/CI run/API/READ/signing או ביטול freeze. Gate29 BLOCKED; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים/שעות/ETA unknown/unavailable. יתר חובות grammar/import/migration/conformance/recovery/CANCEL-LOOKUP נשארות פתוחות. בהיעדר בחירת סביבת הרצה התקדם בנפרד חוזה SCC V1 בסעיפים 11.2.115–118; התקדמותו אינה תשובה לשאלת NEXT-01 או בחירת מקור.

11.2.115 הוקפאו [SOURCE-CONJUNCT span contract V1 — Machine](source-conjunct-span-contract-proposal-v1-2026-09-09.json), SHA-256=`e519b389902d798988022f643006f9f4f7c84dfbc85289f1ed904a87b2204e5f`, ו־[Human](source-conjunct-span-contract-proposal-v1-2026-09-09.md), SHA-256=`d1102fb5a87ec67b8f78ed50b7a9ba6a421643214eed201ca831cababb4262a5`, עם [Freeze](source-conjunct-span-v1-freeze-2026-09-09.json) ו־[Reconciliation](source-conjunct-span-v1-review-reconciliation-2026-09-09.md). שתי ביקורות FINAL עצמאיות PASS/PASS על אותם bytes; Human JSON שווה ל־Machine בבתים ובערכים. 21 מקורות ננעלו; שמונה חובות PRE, descriptor חדש אחד, שמונה שדות, חמישה scalar types נומינליים, שישה operands לוגיים מוקדמים ו־12 חובות בדיקה. זו הצעת חוזה טווחים תחומה, לא גוף היסטורי ששוחזר או runtime implementation.

11.2.116 SCC מחייב אותו sealed B, ‏Carrier8 ו־MemberRow13 מוקדמים, בחירת descriptor והקשר owner/field/span עצמאיים. בפועל full owner/selection schemas ומקורות הראיה עדיין unavailable; O/E אינם wrapper שמאמת עצמו. absolute=memberStart+relative מחושב ללא coercion/overflow, שני טווחים לא ריקים בתוך אותו Member/Carrier, עם גבולות byte מדויקים. digest הוא raw SHA-256 של ה־slice בלבד; locator משווה path#bytes=start-end בלי לפתוח קובץ או לספק סמכות. אין alias ל־OSG SYMBOL/CUSTODY-LOCATOR, ל־CPB1 Root או ל־AGV RootRef. גבולות labels/locator ו־nonempty מסומנים כבחירות target חדשות. סדר מקור/בחירה מוקדמים מונע תלות במועמד או בתוצאה מאוחרת.

11.2.117 נשמרים owner/field/occurrence ומכפליות גם כש־digest זהה. 31 closure rows מכילות217מופעים ו־323 predecessor rows מכילות4016מופעים;4016 predicate use copies הם שימושים נוספים ולא conjuncts עצמאיים. אלה תצפיות metadata, לא parser rediscovery או מכנה דרישות.4positive/20negative specifications לא הורצו. אין אימוץ column parsing/trim/indexOf/Number/Base64 מתוך generator. כל61 fieldTypes היסטוריות וכל156imports בפועל ללא closure; SCC נפרד מ־OSG ומה־Roots השונים של V17/V19, וגרסת V19 החסרה לא הושלמה.

11.2.118 ההמשך דורש הגדרות owner/selection מלאות ומקורן העצמאי, גילוי ופירוש סמנטי טרנזיטיבי, exact migration ל־descriptor/profile/consumer ומיפויי מקור/סמכות/אכיפה/conformance ממשיים. החוזה התחום אינו מוכיח שהטווחים מייצגים את מלוא ה־conjuncts האטומיים. NEXT-01..05, יתר grammar/import/migration, ה־failure-footprint ההיסטורי, recovery/CANCEL-LOOKUP, שש חבילות היסוד וה־Registry נשארים פתוחים. לא חושב digest של slice/preimage/Root מועמד ולא הורצו candidate programs/fixtures/Tests/Build. אין שינויי מוצר או Git/GitHub/Deployment/provider/key/signature operations; Baseline ו־Technical Master ללא שינוי. Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים/שעות/ETA unknown/unavailable. SCO V2 בסעיפים 11.2.119–122 מתקדם במיפוי שלושה מסלולי owner/use ובסדר התלויות בלבד; אינו משלים את גופי O/E או את מקורם העצמאי החסר.

11.2.119 הוקפאו [SOURCE-CONJUNCT owner/use V2 — Machine](source-conjunct-owner-use-contract-proposal-v2-2026-09-09.json), SHA-256=`a1021f7287c4056de9c870036804c7af3354355e055f8598436fb427197d05e1`, ו־[Human](source-conjunct-owner-use-contract-proposal-v2-2026-09-09.md), SHA-256=`d739c695daec0ac806773bb3d91924251636d129bf92fc8aa13e376196373716`, עם [Freeze](source-conjunct-owner-use-v2-freeze-2026-09-09.json) ו־[Reconciliation](source-conjunct-owner-use-v2-review-reconciliation-2026-09-09.md). שתי ביקורות FINAL עצמאיות חדשות PASS/PASS על אותם bytes; V1 נשמר עם FAIL/PASS ותיקון SCO-A-001 נבדק מחדש. Human JSON שווה ל־Machine בבתים ובערכים. 31 מקורות ננעלו, שמונה חובות PRE טופלו, שלושה route profiles מפנים ל־clause IDs מדויקים ולכל12חובות SCC, ארבעה מיפויי namespace/carrier ו־15חובות מקומיות. זהו חוזה מיפוי חדש תחום, לא schema היסטורי מלא או actual admission.

11.2.120 C15 מתקנת את SCO-A-001: ‏O_P/E_P,j הם כוונת ובחירת המקור, ו־O_U,j/E_U,j הם הקשר ובחירת השימוש הנפרדים. כל E קשור ל־O המלא שלו; O_U קושר במלואם את O_P/E_P המוקדמים ואת parent/j/label שנבחרו מראש. נדרשים שוויון D/B/C8/M13, מקור/universe/version/namespace/profile/definitions, ‏O_P, ‏j, ‏conjunctId/field/span ושימור נפרד של purpose/consumer/authentication לכל תפקיד. שוויון חלקי או השוואת E_P=E_U אינם מותרים. בפועל full O/E schemas ואימותם עדיין unavailable. הסדר הוא הקשר עצמאי → O_P → E_P → O_U → E_U → conjunct → predicateRoot → predecessorCrosswalkRoot → בדיקות מאוחרות; O_P מכיל labels מיועדים ולא גופי use או Roots מאוחרים. closure שומר O_C/E_C משלו. אין שימוש ב־Root המאוחר או בתוצאת ביקורת לקביעת הציפייה שממנה נבנו. גרף המקור החיצוני עדיין דורש הוכחת תלויות ללא מעגלים; SHA של קובץ היסטורי קיים אינו זהות output עתידי או מקור סמכות.

11.2.121 closure קושר sourceFindingId למקור V16-FINDINGS; predecessor קושר sourceNamespaceId/sourceMemberId למקור V15 המדויק. sourceRowId וה־digest/locator של שורת V16 נשמרים כזיקת מקור אחרת. שלוש המערכות sourceConjuncts/predicateIds/predicateRoots שומרות אותו אורך וסדר שנבחרו מראש, וכל predicate use קושר לאותו parent/j עם שוויון כל8שדות SCC וכל עותק נבדק מול ה־O/E שלו עם כל שוויונות המקור והמיפוי של C15. אין first-match, suffix parsing, קיצור מערכים או digest dedup; uniqueness בתוך owner ושימור inventory הם חובות target חדשות. תצפיות metadata:31closure/217מופעים,323predecessor/4016מופעים ו־4016use copies תואמים, ללא מכנה conjuncts נוסף.5positive/26negative specifications לא הורצו.

11.2.122 פערי owner נשארו מפורשים: closure17שדות מול10required, predecessor21מול17, predicate9מול9 אך types מקוננים חסרים. projection של שדות אינו widening של REJECT או סגירת owner grammar; חובות השדות האחרים נשמרות. producerClosureReceiptRoot מכסה core מוגבל אחר ואינו מאמת את מלוא שורת closure או בחירת הקטעים. full owner/selection/authentication, סמנטיקה טרנזיטיבית, native source, conformance ומיפויי migration נשארים פתוחים, וכל61fieldTypes ו־156imports בפועל ללא closure. NEXT-01..05, recovery/CANCEL-LOOKUP, foundations/Registry/Gate29 נשמרים. אין שינויי מוצר, Tests/Build, candidate/fixture execution, slice/Root digest generation או Git/GitHub/Deployment/provider/key/signature operations. Baseline ו־Technical Master ללא שינוי. Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים/שעות/ETA unknown/unavailable. SCI V1 בסעיפים 11.2.123–126 מוסיף grammar מקומי לרשימת מופעים מוקדמת ומיפויה ל־O/E, בלי להשלים את גופי O/E או את מקורם ואוסף השימושים העצמאיים.

11.2.123 הוקפאו [Source occurrence inventory grammar V1 — Machine](source-occurrence-inventory-grammar-proposal-v1-2026-09-09.json), SHA-256=`903a431621f21ed67ef301b2035a3f71c002c454fdd210f052b47c7ef5bd2542`, ו־[Human](source-occurrence-inventory-grammar-proposal-v1-2026-09-09.md), SHA-256=`def91756e39754c12734c6ac5574652736be1834b9f62e37114e6ca37bbe7424`, עם [Freeze](source-occurrence-inventory-v1-freeze-2026-09-09.json) ו־[Reconciliation](source-occurrence-inventory-v1-review-reconciliation-2026-09-09.md). שתי ביקורות FINAL עצמאיות PASS/PASS על אותם bytes; Human JSON שווה ל־Machine בבתים ובערכים.23מקורות ננעלו, תשע חובות PRE טופלו, שלושה object descriptors עם8field slots, חמישה scalar types נומינליים, array type אחד, ארבעה profiles ו־14חובות. זו הצעת grammar מקומי מלאה לגוף I התחום, לא historical schema recovery, actual instance או full O/E/native proof schema.

11.2.124 I מכיל schema/profileId/entries בלבד; closure entry מכיל conjunctId/field, ו־predecessor entry מוסיף predicateId. ארבעת ה־profiles מקבעים7/10/5/16שדות לפי הסדר המתועד, לאחר בחירה עצמאית לפי source/version/C/M/namespace/definitions לפני I. אין למועמד לבחור פרופיל קטן יותר או להחליף namespaces החולקים Carrier. הסדר הוא מקור/profile עצמאי → I → full O_C/O_P binding → E_C/E_P → בשימוש predecessor בלבד O_U/E_U נפרדים → מועמדים ו־Roots. I אינו מכיל O/E, count/index, spans/digests/Roots או candidate arrays. O מאמת וקושר אחריו את כל I ואת זהות מקורו; E עדיין מבסס עצמאית field/span applicability. טיפוסי SCI מוקדמים אינם מייבאים תנאי SCC המאוחר של label=E לפני ש־E קיים.

11.2.125 n נקבע בפרופיל העצמאי ו־j הוא מיקום אפס־מבוסס במערך. נדרשים אורך וסדר שדות מדויקים, conjunctId ייחודי בתוך I, ו־predicateId ייחודי בתוך predecessor I; ייחודיות בכל independently selected use collection, גם בין inventories, נשארת חובה חיצונית נפרדת. אין מיון, prefix acceptance, מילוי, dedup, suffix/column parsing או העתקת E_P בתור E_U.65536raw bytes לכל I, עד16entries ועומק containers3 הם גבולות target חדשים, לא הרשאת קריאה או native enforcement. JSON/UTF-8 תקינים, decoded duplicate-key rejection וגופים סגורים נדרשים. תצפיות metadata בלבד:31×7,16×10,96×5,211×16 ו־4016predicate labels שונים.6positive/27negative specifications לא הורצו.

11.2.126 ההמשך דורש גופי O/E מלאים והטמעת I המדויקת בהם, מקור/בחירה/authentication/applicability בפועל, אוסף שימושים עצמאי מלא וראיות cross-inventory uniqueness, מקור native/measurement/permission/conformance, סמנטיקה טרנזיטיבית/migration. שוויון field vectors אינו הוכחת atomic semantic completeness או מכנה Registry. כל61fieldTypes ו־156imports בפועל פתוחים; SCO V2 והיסטוריית V1 FAIL/PASS, SCC/OSG ושאר החוזים הקפואים נשמרו. NEXT-01..05, recovery/CANCEL-LOOKUP, foundations/Registry/Gate29 נשארים פתוחים. אין שינויי מוצר, Tests/Build, candidate/fixture/parser/constructor execution, slice/Root generation או Git/GitHub/Deployment/provider/key/signature operations. Baseline ו־Technical Master ללא שינוי. Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים/שעות/ETA unknown/unavailable. SOE V1 בסעיפים 11.2.127–130 מוסיף שישה גופי expected content מקומיים עם I ו־parent מלאים, בלי להשלים מקור/authentication, native proof schemas, collections, conformance או adoption.

11.2.127 הוקפאו [Source owner/selection content V1 — Machine](source-owner-selection-content-proposal-v1-2026-09-09.json), SHA-256=`d40742a6f92d4ab8265c1b572c9bd053fcbef2f3be634f8bb9fcd6bc7389976d`, ו־[Human](source-owner-selection-content-proposal-v1-2026-09-09.md), SHA-256=`ce4a9de9f9349d10d93112b02a265fc8a573a64dc74fd9af31358bafab37d326`, עם [Freeze](source-owner-selection-content-v1-freeze-2026-09-09.json) ו־[Reconciliation](source-owner-selection-content-v1-review-reconciliation-2026-09-09.md). שתי ביקורות FINAL עצמאיות PASS/PASS על אותם bytes; Human JSON שווה ל־Machine בבתים ובערכים. ננעלו 29 מקורות; טופלו תשע חובות PRE. נכתבו 24 טיפוסים מקומיים, מהם 12 records עם 74 field slots; יובאו 217 הגדרות מלאות ותלויותיהן: 198 מ־SIE ו־19 מ־NEC. נוספו 20 חובות ושישה role profiles עם רשימות IDs מפורשות. זו הצעת expected content חדשה לשישה גופים מקומיים, לא שחזור סכמות היסטוריות, actual input instances או native proof schemas.

11.2.128 O_C/O_P מכילים context מקור מלא ו־inventoryBinding; E_C/E_P מכילים את ה־owner המלא; O_U מכיל את E_P המלא, וה־parent שלו נגיש רק דרך sourceSelection.owner; E_U מכיל את O_U המלא. אין parent/index alias נוסף. Source/use נשארים תפקידים נפרדים עם identity/consumer/purpose/provenance משלהם, לצד שוויון מלא של המקור, I, ה־parent, j, labels וגבולות bytes. SOE-CONSUMER הוא טיפוס חדש תחת מודל NEC host/consumer/session, לא alias ל־NpaRecipient/NpaUseSelection. host של קורא המקור אינו אוטומטית host של הצרכן. K כולל SourceUseContext, Carrier8/Member13, namespace/profile/bindings ו־Seal מלאים; DefinitionSelection מפנה להגדרת מקור מלאה בתפקיד מדויק, לא ל־runtime object או סמכות.

11.2.129 L הוא SIE SourceUseInventory חיצוני שנבחר עצמאית והושלם עם FinalSourceTranscript וכל חובות המקור לפני I/K binding וקליטת SOE. Seal ו־capability/prior refs נשארים בתחום ובסדר המקוריים בתוך אותו L; O/E אינם SIE LocalRecords ואין להם consuming ordinal. זהות B נקשרת למופע המקור/custody, ולא רק לשוויון hash/Context/record. V16 legacy row נשאר מקור נפרד מ־V15 Member. R_I הוא קלט ה־SCI המקורי הנפרד; SourcePin וה־I המלא נשמרים יחד, ועותק inline מקודד אחרת אינו מחליף raw source identity. גבולות SOE ingress מותקנים והגבולות התפעוליים של L נדרשים מראש, עם המחמיר בכל ממד וכל מגבלת צרכן נוספת; כל עותק inline נכלל בעלות bytes/depth/tokens. אין fallback ל־SCI65536 או ל־policy במועמד. נדרשת הפרדה בין UIntText לבין JSON integers, ובין DAG מבני מקומי לבין provenance DAG בפועל. שישה positive ו־32 negative specifications לא הורצו.

11.2.130 ההמשך דורש מקור ו־native input/proof schemas עבור O/E/K/I/L/B והצרכנים, actual authentication/selection/currentness/permission, גופי collections מלאים ובחירה עצמאית של מלוא התחום, cross-inventory uniqueness ו־semantic discovery. נדרשים גם גבולות מוקדמים מותקנים, SOE raw observation/diagnostic protocol לכשל, conformance, adoption ומיפויי signed/Root חיצוניים. גוף expected תקין אינו דרך לייצג קלט חסר או כושל. כל 61 fieldTypes ההיסטוריים ו־156 imports בפועל נשארים פתוחים; חוזי SCC/SCI/SCO/SIE/NEC/NPA נשמרו, לרבות SCO V1 FAIL/PASS. NEXT-01..05, recovery/CANCEL-LOOKUP, foundations/Registry/Gate29 אינם נסגרים. אין שינויי מוצר, Tests/Build, candidate/parser/constructor/fixture execution, slice/Root generation או Git/GitHub/Deployment/provider/key/signature operations. Baseline ו־Technical Master נשמרו. Gate29 BLOCKED; freeze ACTIVE; foundations 0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים/שעות/ETA unknown/unavailable. SOD V2 בסעיפים 11.2.131–134 מוסיף גוף סיכום raw/check diagnostics מקומי תחת D נפרד, בלי להשלים raw/native proof schemas, גוף decoded מלא, התקנה, הרשאות, conformance או adoption.

11.2.131 הוקפאו [Source owner diagnostic V2 — Machine](source-owner-diagnostic-proposal-v2-2026-09-09.json), SHA-256=`b7b3de6ba3b2317a2364ef73b9c97c55ef6947a0da3243f7dc2a15856a98b64b`, ו־[Human](source-owner-diagnostic-proposal-v2-2026-09-09.md), SHA-256=`29aaf485185bb1c1068e26cd23888621275dd2cd8cbb030455ec3e6163b2f748`, עם [Freeze](source-owner-diagnostic-v2-freeze-2026-09-09.json) ו־[Reconciliation](source-owner-diagnostic-v2-review-reconciliation-2026-09-09.md). שתי ביקורות FINAL עצמאיות PASS/PASS על אותם bytes; Human JSON שווה ל־Machine בבתים ובערכים. V1 נשמרה עם FAIL/FAIL: SOD-A-001/SOD-B-001 זיהו count=14 בניסוח מול closure מדויק של 13. V2 תיקנה את תיאורי C04/PRE009/Human ל־13 בלי להוסיף או לשנות טיפוס. ננעלו 38 מקורות. נכתבו 47 טיפוסים מקומיים, 18 records עם 48 field slots, 13 imports מלאים עם 17 ordered dependency occurrences, 18 חובות ושני phase profiles. מתוך עשר חובות PRE, חובות 004/005 לגוף decoded מלא נשארות DEFERRED במפורש.

11.2.132 SOD הוא diagnostic operation חדש תחת D עצמאי שהותקן לפני הקלט והפליטה; D אינו מוכח בגוף הרשומה. UNBOUND-DIAGNOSTIC דורש D וכל גבולות/הרשאות האבחון המוקדמים החלים; POST-BOUND-DIAGNOSTIC מחויב גם לגבולות SOE/L/consumer שכבר חלים, עם המחמיר בכל ממד. היסטוריית admission עצמאית קובעת phase; אין downgrade בגלל מקור או bound חסר. SOE C15 נשמר: D אינו fallback ל־expected-body intake ללא L והגבולות הדרושים. אם D, הרשאת האבחון או גבול מחייב חסרים, אין SOD object לפי חוזה זה; טיפול host חיצוני נפרד נשאר unavailable. SOD אינו SIE LocalRecord ואינו alias ל־NEC Diagnostic; אין ordinal, priorRef או Root חדש.

11.2.133 Raw summary מבחין בין NOT-OBSERVED, ABSENT-OBSERVED, OBSERVED-UNPINNED, WHOLE-OBSERVED ו־PREFIX-OBSERVED. נדרש מקור עצמאי לכל טענת היעדר/extent/length; קלט שלם ריק שונה מקלט חסר. Prefix הוא טיפוס מקומי חדש עם אורך כולל KNOWN או UNKNOWN, ללא 0 מומצא או שינוי SIE RawPrefix. SourcePin מציין רק captured bytes, לא סמכות או faithful decoding; אותו hash אינו אותו מופע. Target מוקדם הוא UNBOUND/ROLE-KNOWN/SELECTED ואינו נבחר לפי schema של מועמד. knownFailures/satisfiedChecks/unavailableDependencies/notEvaluatedChecks שומרים עובדות נפרדות, סדר וריבוי מקוריים; כשל ידוע קודם לחוסר ראיות ול־not evaluated. ארבעה activity slots שומרים גם פעולה שהחלה או הסתיימה בכשל/ללא הרשאה; אין הסקת no-action מהיעדר קלט. CAPTURE-SPAN מוגבל ל־bytes שנשמרו בלבד. overflow אינו מתיר למחוק כשל או לייצר summary ריק. שמונה positive ו־33 negative specifications לא הורצו.

11.2.134 ההצעה מכילה summaries בלבד, ללא raw bytes, גוף decoded או O/E תקין. PRE004/005 עדיין דורשות מיפוי מלא של observed counterparts והשוואה השומרת empty/duplicate/misordered arrays ו־raw tokens בלי repair. טענת decode או satisfied check אינה הוכחת native/admission. coverage נשאר LOCAL-SUMMARY-NOT-EXHAUSTIVE ו־effects UNKNOWN; אין מסקנת zero-write, rollback, durable rejection או persistence, ואין מחיקת ראיות effects ידועות. Actual D/host/phase/subject/capture/read/check/proof schemas, installation/currentness/permission, bounded native enforcement, collections/semantics, conformance/adoption נשארים unavailable. כל 61 fieldTypes ו־156 imports בפועל פתוחים. NEXT-01..05, recovery/CANCEL-LOOKUP, foundations/Registry/Gate29 נשמרים. אין שינויי מוצר, Tests/Build, candidate/parser/fixture execution, slice/Root generation או Git/GitHub/Deployment/provider/key/signature operations. Baseline ו־Technical Master נשמרו. Gate29 BLOCKED; freeze ACTIVE; foundations 0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים/שעות/ETA unknown/unavailable. SOV V2 בסעיפים 11.2.135–138 מוסיף הגדרות counterpart מקומיות וחובות השוואה עבור הנושא שנדחה ב־SOD PRE004/005; הטקסט הקפוא נשמר, וראיות decode/native/conformance/adoption עדיין חסרות.

11.2.135 הוקפאו [Source owner decoded view V2 — Machine](source-owner-decoded-view-proposal-v2-2026-09-09.json), SHA-256=`043ce5a26c6040d33bcc00baae9dfe553382f7f6a2f523aa3461a740d00f37b8`, ו־[Human](source-owner-decoded-view-proposal-v2-2026-09-09.md), SHA-256=`a65e7f7b6a4f64af484a888e1e3e234a303eaf7f586dfc97548de100dae4e488`, עם [Freeze](source-owner-decoded-view-v2-freeze-2026-09-09.json) ו־[Reconciliation](source-owner-decoded-view-v2-review-reconciliation-2026-09-09.md). היסטוריית V1 נשמרה עם A=FAIL / B=PASS, ללא עדכון התוכנית מכוחה. V2 תיקנה את SOV-A-001 ונבדקה בשתי ביקורות FINAL חדשות ועצמאיות PASS/PASS על אותם bytes; Human JSON שווה ל־Machine בבתים ובערכים. ננעלו 47 מקורות וטופלו עשר חובות PRE. נשמרו 121 expected definitions מלאות: 24 SOE, 69 SIE, 19 NEC ותשע SCI. הוגדרו 124 observed types נפרדים, מהם 54 records עם 260 field slots, עשרה arrays, 37 atoms, 14 enums, שבעה literals ושני unions. המפה כוללת 121 זוגות expected-to-observed, מהם שלושה עם שני counterparts. נכתבו 18 חובות ושישה role profiles. אלה הגדרות תיעודיות, לא actual input/proof bodies או parser מאומת.

11.2.136 שלוש הגדרות מפוצלות במפורש ל־CLOSURE/PREDECESSOR: SOE InventoryBinding, SCI Inventory ו־SCI entries. O_C/E_C קובעים closure; O_P/E_P/O_U/E_U קובעים predecessor, גם ב־sourceSelection המקונן. פרופיל SCI מוקדם נבחר עצמאית לפי המקור; profileId בקלט הוא enum נצפה של ארבעה ערכים ואינו dispatcher. Wrong known profile עם צורת entry קבועה נשמר להשוואה; missing/extra predicateId עבור הצורה שנבחרה הוא כשל מבני. כל השדות, requiredness, JSON kinds, literal/union tags, תקרות scalar וטוקנים מספריים נשמרים. לעומתם, source/consumer/Context/Seal/parent equality, membership ושוויונות profile/vector נדחים לבדיקה. Observed DefinitionSelection הוא נתון אינרטי, לא resolver או מקור סמכות. V2 מגדירה משמעות נפרדת ל־SCI labels: conjunctId ייחודי בתוך I וקושר מאוחר לאותו label; field נבדק מול המיקום בפרופיל ללא חובת uniqueness נוספת; predicateId ייחודי בתוך predecessor I ובכל use collection המדויק שנבחר, עם completeness/provenance עצמאיים. conjunctId/predicateId אינם מושווים ל־field vector ואין הרחבת uniqueness מעבר לתחום המקורי.

11.2.137 Arrays של תצפית שומרים ריקוּת, כפילויות, סדר שגוי ואורך שונה תחת גבולות מוקדמים; אין sorting/dedup/fill/truncation. אורכי SCI 7/10/5/16, מינימום שני readers, uniqueness ומלוא תחומי המקור נשארים תנאי קבלה מקוריים. SOV אינו משנה את הגדרות המקור. UIntText נשאר string ו־OSG/SOE integer שומר את הטוקן והטווח הפיזי; j<n ושייכות/order של spans נבדקים בנפרד עם bounds לפני גישה. SOV-BOUND דורש observer grammar תואם, SOE C15, L/operational הקודמים וכל הגבולות/הרשאות המחייבים; אין fallback ל־SOD D או ל־policy הנצפה. כל עותק inline נחשב פיזית. Prefix/partial/malformed אינם complete view. הקלט המקורי השלם ו־faithful decoding דורשים ראיות עצמאיות; re-encoding תקין אינו מוכיח שטוקני המקור היו תקינים. 50 specifications המקוריים נשמרו בדיוק ונוספו SOV-POS-13 ו־SOV-NEG-39..41 עבור הפרדת המשמעויות. סך הכול 13 positive ו־41 negative specifications לא הורצו.

11.2.138 השוואה נעשית רק דרך מפת הטיפוסים: כל שדה wire בשם המקורי, primitive kind/value מדויק ואורך/סדר מלא של arrays. הציפייה נשארת ערך מוקדם עצמאי מטיפוס המקור המלא ואינה מוחלפת בערך הנצפה. שוויון ערכים אינו זהות bytes/escaping/custody/occurrence או הוכחת מקור/הרשאה/currentness/semantics. expected O/E מלא שאינו זמין אינו מומצא; mismatch ידוע נשמר לצד ראיות חסרות. ההצעה מקדמת את ה־counterpart definitions וחובות ההשוואה שנדחו ב־SOD PRE004/005, ללא שינוי SOD הקפואה או היסטוריית FAIL/FAIL של V1. Native capture/result/transport/proof schemas, actual decoder/evidence/compatible installation/enforcement, collections/atomic discovery, effects/recovery, conformance/adoption ומיפויי signed/Root חיצוניים נשארים unavailable. כל 61 fieldTypes ו־156 imports בפועל פתוחים; NEXT-01..05, recovery/CANCEL-LOOKUP, foundations/Registry/Gate29 נשמרים. אין שינויי מוצר, Tests/Build, candidate/parser/constructor/fixture execution, slice/Root generation או Git/GitHub/Deployment/provider/key/signature operations. Baseline ו־Technical Master נשמרו. Gate29 BLOCKED; freeze ACTIVE; foundations 0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים/שעות/ETA unknown/unavailable. SVC V1 בסעיפים 11.2.139–142 מוסיף תוכן מקומי לטענות השוואת ערכים ו־witnesses, עם שני operands מלאים; native result/proof transport, actual comparison evidence ויתר החובות כאן נשארים פתוחים.

11.2.139 הוקפאו [Source value comparison V1 — Machine](source-value-comparison-proposal-v1-2026-09-09.json), SHA-256=`e4342abd01899489776bcd247d6fce64304eaef497ac2f4eb30442c7ca505dc3`, ו־[Human](source-value-comparison-proposal-v1-2026-09-09.md), SHA-256=`9ac5e3b4c0507390ea29021e6aeb78a677526b6422ffc0286cd52552387d5d4b`, עם [Freeze](source-value-comparison-v1-freeze-2026-09-09.json) ו־[Reconciliation](source-value-comparison-v1-review-reconciliation-2026-09-09.md). שתי ביקורות FINAL עצמאיות PASS/PASS על אותם bytes, ללא ממצא actionable חדש בתחום החוזה הכתוב. Human JSON שווה ל־Machine בבתים ובערכים. ננעלו 53 מקורות וטופלו 11 חובות PRE. נשמרו 121 expected definitions ו־124 observed definitions מ־SOV V2 ללא שינוי; נוספו 34 local types, מהם 13 records עם 39 fields. נכתבו 124 pair rules עבור 260 שדות מקור ו־147 field-name labels, 20 חובות, שישה role profiles ושני claim profiles עם רשימות IDs מפורשות. אלה הגדרות תיעודיות בלבד, לא תוכנית השוואה מורצת או ראיות מקור.

11.2.140 כל תפקיד בוחר מראש גוף מקומי אחד בעל schema/expected/observed/claim מלאים. Q0 החיצוני בוחר expected/role/family/SCI profile/grammar ויעד raw לפני הקליטה; Q1 קושר את התצפית שכבר קיימת לאותה בחירה ולאותו comparison use לפני ההשוואה. אין תלות בתצפית עתידית לפני capture ואין שינוי expected או family לפי התוצאה. Q1 אינו עוקף SOE C15 או SOV C10: כל דרישות ההסתמכות על תצפית מקור מלאה, occurrence, raw/end/token ו־faithful decoding נשארות נדרשות. אותן זהויות בטקסט או ב־hash אינן מוכיחות אותו מופע, Q או מקור. הרשאות וגבולות comparison/copy/intake/output/retention נדרשים בנפרד; קריאה קודמת אינה מעניקה אותם.

11.2.141 EQUAL-VALUES עם extent=ALL-WIRE-VALUES דורש בפועל השוואה של כל שדה, אורך array וכל מיקום מקורי, primitive kind/value מדויק וכל תוכן ענף union בעל tag תואם. אין count/hash/ID/set shortcut, normalization או cast. DIFFERENT עם extent=INEQUALITY-WITNESS-ONLY מכיל witness אחד מסוג PRIMITIVE-VALUE, ARRAY-LENGTH או UNION-DISCRIMINATOR; אין ממנו complete traversal של SOV C11 או כיסוי כל הכשלים. FIELD/INDEX נעים רק בזוג הטיפוסים המקובע; שם שדה חייב להתאים לצומת ואינדקס חייב להתקיים בשני הצדדים. ב־tags שונים עוצרים בצומת ה־union בלי המצאת שדות. ה־witness אינו מכיל comparands חלופיים. שלושת פיצולי SCI ומשמעויות labels המתוקנות נשמרו. 12 positive ו־36 negative specifications נכתבו ולא הורצו.

11.2.142 חוסר expected/view/Q/claim נתמך אינו מייצר גוף INCOMPLETE, operands מדומים או שוויון/הבדל כברירת מחדל. תצפיות והבדלים/כשלים שכבר הוכחו נשמרים לצד חוסר ראיות, בתחומם המורשה. חייבים לספור את שני ה־operands המלאים, כל עותק inline, paths ו־output תחת כל הגבולות המחייבים; אין fallback ל־SOD D, ל־policy נצפה, ל־L חסר או ל־SCI65536 בלבד. SOD לא מקבל יעד SVC או decoded extension; שגיאות SVC-own/output דורשות host diagnostics נפרד שסכמתו אינה מסופקת. שוויון ערכים אינו raw identity/fidelity/currentness, מקור/הרשאה, complete semantics/collections, effects/rollback או Acceptance. Actual Q0/Q1/native capture/comparison/proof/result-transport/host schemas, installation/enforcement/conformance, collections/atomic discovery, recovery/CANCEL-LOOKUP ו־adoption/signed-Root mapping נשארים unavailable. כל 61 fieldTypes ו־156 imports בפועל פתוחים; NEXT-01..05 לא נענו ולא נסגרו. Baseline, SOV/SOE/SOD וה־Master הטכני נשמרו. Planning-only; אין שינויי מוצר, Tests/Build, candidate/parser/evaluator/fixture execution, slice/Root generation או Git/GitHub/Deployment/provider/key/signature operations. Gate29 BLOCKED; freeze ACTIVE; foundations 0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים/שעות/ETA unknown/unavailable. SCE V1 בסעיפים 11.2.143–146 מפרט כעת מפת חובות ראיה/consumer/phase עבור ה־premises הפתוחים; אין בכך סכמת native, מקור נבחר או ראיה בפועל.

11.2.143 הוקפאו [Source comparison evidence requirements V1 — Machine](source-comparison-evidence-requirements-v1-2026-09-09.json), SHA-256=`a2997a4b42cb2d77401153e923ec31a5629658b44e6801474977c60e51fecad9`, ו־[Human](source-comparison-evidence-requirements-v1-2026-09-09.md), SHA-256=`6427c4f899297eefca67b36632a7b522ed672764dac05021a8713219a199db5e`, עם [Freeze](source-comparison-evidence-v1-freeze-2026-09-09.json) ו־[Reconciliation](source-comparison-evidence-v1-review-reconciliation-2026-09-09.md). שתי ביקורות FINAL עצמאיות PASS/PASS בתחום המטריצה הכתובה, ללא ממצא actionable חדש. Human JSON שווה ל־Machine בבתים ובערכים. ננעלו 62 מקורות וטופלו 12 חובות PRE. נכתבו 17 fact requirements, תשעה documentary profiles, 57 קישורי fact/consumer ישירים וארבעה קישורי claim branch מפורשים, תשעה occurrence domains, 12 correspondences ו־14 חובות משותפות. אין typeCatalog, native body, predicate/Guard חדש או היתר פעולה.

11.2.144 Q0 דורש בחירת expected/role/profile/map ויעד מוקדמים ו־intake readiness, ללא capture עתידי. נפרדות אכיפה בפועל בזמן intake, raw completeness ו־faithful decoding לאחריו. Q1 שומר את Q0 וקושר view קיים לפני comparison. זמני עובדות וזמני הפקת readouts שונים; ראיה מאוחרת אינה יוצרת הרשאה מוקדמת. L/Seal/B וה־B_legacy החל, R_I המקורי, I וכל encoding inline, יעד O/E וה־capture, retained SOV, expected comparand, Q1 pair/use וכל report copy נשארים תחומי occurrence נפרדים. כל fact ID תיעודי חוזר מחייב מופע ראיה מתאים לאותה פעולה/פאזה, לא receipt גלובלי לשימוש חוזר. התאמת hash/content/ordinal אינה זהות מופע.

11.2.145 EQUAL דורש ראיות לכל השדות והמיקומים הדינמיים בפועל ול־union branch הקיים; 124 סוגים אפשריים אינם traversal evidence. DIFFERENT דורש רק את ה־witness והמסלול הזוגי המדויק, בלי full traversal prerequisite או coverage credit ובלי ביטול חובת traversal אחרת. לכל עובדה נפרדים source/appointment/observation reach/truth/time/status/representation/bounds/effects/conformance. הרשאות read/decode/compare/copy/report-intake/output/disclosure/retention נשארות נפרדות; remote delivery או persistence חלים רק אם נבחרה פעולה כזאת. אין תוצאת delivery עתידית בתוך early output readiness. SVC-own diagnostics אינם דורשים pair/Q תקין ואינם מרחיבים SOD. נכתבו שמונה positive ו־22 negative specifications; אפס הורצו.

11.2.146 נשמרו שלוש רשימות NPA12/NEC12/SIE12 בנפרד, 12 ממדי NESA ושש שורות NPA dispatch בתחומי NEC המקוריים. אין בהן Q0/Q1/SVC או capability כללי ל־COMPARE/OUTPUT/RETENTION; source authentication אינו truth/execution evidence. כל מקור עתידי חתום/Root-bearing מחייב מיפוי מלא ומפורש לפי X11, ולא opaque bytes או alias. המטריצה מסתיימת בדרישות: NESA STEP01..04 עדיין דורשים בחירת verifier/runtime/consumer/resource/action ומקור סמכות עצמאיים, שמות מקורות ומפרטים אמיתיים לפני native source-specific mapping. NEXT-01..05 לא נענו ולא נסגרו. Actual sources/appointments/installation/permission/status/limits/fidelity/comparison/effect evidence/conformance/collections/atomic semantics/recovery/adoption נשארים unavailable. כל 61 fieldTypes ו־156 imports בפועל פתוחים. Baseline, SVC/SOV/SOE/SOD וכל המקורות וה־Master הטכני נשמרו. Planning-only; כל העריכות ב־apply_patch, ללא שינויי מוצר, Tests/Build, candidate/parser/evaluator/fixture execution, slice/Root generation או Git/GitHub/Deployment/provider/key/signature operations. Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit=0; אחוזים/שעות/ETA unknown/unavailable. המיפוי התיעודי של historical atomic footprint בסעיפים11.2.147–150 מקדם מסלול נפרד בלי לבחור מקור/runtime ובלי לסגור SG006.

11.2.147 הוקפאה Historical atomic footprint assessment V1 ונבדקה עצמאית ב־FINAL A/B עם PASS/PASS בתחום המסמך בלבד. Machine `historical-atomic-footprint-assessment-v1-2026-09-09.json` ב־SHA `140d149a22c7cd166439af156bc39a12f33c46cf710f7571d8bb3201bb4dc2ba` (280732 bytes; 5883 lines); Human באותו basename ב־SHA `e84af698ac231d7d57b071098b5777e7a8ae191e22c49df5549496385325bd23` (282575 bytes; 5899 lines). Freeze `historical-atomic-footprint-v1-freeze-2026-09-09.json` ב־SHA `96cf3cc7cbb1a6209b0b9de8a3447191a940310372526af62e3e60b3e3682909`. Reconciliation ו־before custody נשמרו לפני עדכון התוכנית; אין Acceptance/Authority/Completion מן הביקורות.

11.2.148 התחום:18 source locks, תשע חובות PRE,38 עוגני מקור מלאים,65 שורות comparison היסטוריות בסדר המקורי ו־17 זהויות durable עם current loci שנבדקו וסיבת non-equivalence לכל שורה. ה־65 הם protocol head אחד,32 dependency-family heads ו־32 revocation heads נפרדים; נשמרו גם12 bindings, שני ניסוחי no-write, constructor של operationKey, replay וסדר Permit/READBACK/revocation.82 שורות תועדו אך establishedPreservationMappings=0.15/16 current members ו־4/5/2/2 logical effects נשמרים; ספירות ו־Roots בתוך outcome אינם מוכיחים שקילות או אי־אפשרות.5 positive ו־17 negative specifications לא הורצו.

11.2.149 HWF-WITNESS-01 הוא היסק מותנה: רק בהנחת אותה פעולה, אותו failure case, אותו write universe ואותו atomic boundary, כתיבת EMPTY Decision→CAS_RECORDED ושמירת outcome שוללות unqualified no-write. ארבע ההנחות אינן מוכחות; אין מסקנת סתירה גלובלית. הכתיבות משמרות ownership/arbitration/nonreuse/recovery ואינן logging שניתן למחוק או להעביר לשלב בשם אחר. Decision/resource authority חסרים אינם writable rejection; no-new-CAS או timeout אינם no-prior-write. Historical revocation לאחר divergence, current replay/CANCEL/LOOKUP ו־Final seal נשארים בפאזות ובתחומים המקוריים. Permit ההיסטורי אינו מזוהה עם CAS או Final.

11.2.150 HSC-SG006 ו־SIP crosswalk נשארים UNRESOLVED; לא נבחרה חלופת preservation successor או semantic-change disposition. Actual full semantic/operation/address/storage projections, completeness/aggregation, source/resource/authority/order/durability/concurrency evidence, CANCEL/LOOKUP, transitive Subject/AST/representability ו־conformance/adoption עדיין חסרים. NEXT-01 לא נענה; אין runtime/source appointment חדש. כל61 fieldTypes ו־156 imports בפועל פתוחים. Baseline, DLP/DRP/DTC וכל המקורות וה־Master הטכני נשמרו. Planning-only; apply_patch בלבד; ללא שינויי מוצר, Tests/Build, candidate/parser/evaluator/fixture execution, slice/Root generation או Git/GitHub/Deployment/provider/key/signature operations. Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit0; אחוזים/שעות/ETA unknown/unavailable. חוזה source owner/use collection content בסעיפים11.2.151–154 מקדם את גופי האוספים ויחסי הכיסוי, ללא פתרון SG006 או בחירת מקור/runtime.

11.2.151 הוקפאה Source owner/use collection content V1 ונבדקה ב־FINAL A/B עצמאיות עם PASS/PASS בתחום החוזה המקומי הכתוב בלבד. Machine `source-owner-use-collection-content-proposal-v1-2026-09-09.json` ב־SHA `2f3326e7939d4884f44c0aea09a8737270db642df3234c2b052761996cc4d369` (396306 bytes; 9093 lines); Human באותו basename ב־SHA `9558ca9fe8653623925c12236afe0f4b3ec22c93ab0d86e5a43f3fd5725d061b` (398190 bytes; 9109 lines). Freeze `source-owner-use-collection-v1-freeze-2026-09-09.json` ב־SHA `9271509ce19515f10b6a72ec3be0c674082f666e940cc8f1f0e29e55b8d54d36`. Reconciliation ו־before custody נשמרו לפני עדכון התוכנית; אין Acceptance/Authority/Completion מן הביקורות.

11.2.152 התחום:21 source locks,12 חובות PRE,44 עוגני מקור,121 הגדרות expected מקוריות עם269 dependencies ו־23 טיפוסים מקומיים חדשים:10 records,9 arrays,4 literals,40 שדות ו־49 dependencies. תרשים metadata בן144 טיפוסים ו־318 קשתות הוא acyclic; אין בכך הוכחת גרף מקור בפועל. ארבעה גופים בסדר D→S→U→EU שומרים את קודמם במלואו ו־consumer עצמאי של כל שלב. שלושה bijections מגדירים selection לכל owner inventory slot, O_U לכל predecessor slot ו־E_U לכל O_U; membership/order/values נבחרים מראש בכל שלב.8 positive ו־30 negative specifications לא הורצו.

11.2.153 CollectionIdentity החדש מכיל definition/namespace/localId ומזהה כתובת לוגית בלבד. כמה אוספים יכולים לחלוק הגדרה; מקור מוקדם עצמאי חייב לקשור את הזהויות למופעים ולשלמותם. שתי כתובות לאותו actual use collection אינן רשאיות לפצל uniqueness; alias ידוע חוסם, וחוסר ראיה נשאר unavailable. כל O_P משויך מוקדם לזהות use collection אחת; predicateId ייחודי על פני כל הקבוצות המזינות אותה. U מסודר לפי use collection ואז parent slots מסוננים, מתוך D/S המוקדמים, ללא חיפוש label/digest/definition-only. j המקומי0..15 אינו המיקום הגלובלי. Closure אינו מקבל predicate uses; empty אינו unavailable. כל prior full copy משמר גם את קשירת המופע העצמאית, בלי E_P=E_U או ירושת consumer אוטומטית.

11.2.154 נשמרו כל חוזי SOE/SCO/SCI/SCC בשלבים המקוריים, לרבות L מוקדם ומושלם, B/B_legacy, R_I נפרד וכל עותקי I. COL-BOUND-1 מחייב התקנה וגבולות עצמאיים מוקדמים; לכל SOE מקונן נשמרים bounds של L/ingress המקוריים, והפעולה הכוללת כפופה גם לכל הגבולות המחמירים החלים ולכל עלויות העותקים. Empty מוצדק אינו פוטר מ־COL bounds; L חסר אינו empty. אין observed/failure/native collection schema או הרחבת SOD/SVC/NPA. Actual collection/source occurrence/no-alias/completeness/permissions/fidelity/enforcement/effects/conformance/adoption עדיין חסרים. full historical rows/Subject/AST/representability,61 fieldTypes ו־156 imports בפועל פתוחים; HSC-SG006/HWF mappings, חלופות SIP ו־NEXT-01 לא נסגרו. Baseline וכל המקורות וה־Master הטכני נשמרו. Planning-only; apply_patch בלבד; ללא שינויי מוצר, Tests/Build, candidate/parser/evaluator/fixture execution, slice/Root generation או Git/GitHub/Deployment/provider/key/signature operations. Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit0; אחוזים/שעות/ETA unknown/unavailable. דרישות ראיית finding closure ממופות בנפרד בסעיפים11.2.155–158; המיפוי אינו משלים את גוף הראיה או בוחר מקור/runtime.

11.2.155 הוקפאה Independent finding closure requirements assessment V1 ונבדקה ב־FINAL A/B עצמאיות עם PASS/PASS בתחום המיפוי הכתוב בלבד. Machine `independent-finding-closure-requirements-assessment-v1-2026-09-09.json` ב־SHA `74279707c5092276fb472624768d3b2b79ac8e85a0ebc89379cbd1c01194377e` (299108 bytes; 6441 lines); Human באותו basename ב־SHA `6589064075aa66b8ea8fccb856bddcc66a0b9d3e129aae5bbd01ba5bb9ee7439` (300909 bytes; 6457 lines). Freeze `independent-finding-closure-v1-freeze-2026-09-09.json` ב־SHA `8f625709092517097962c70a885b45ca84c811b806e5fe7d1b4c8b1c7c6a5f77`. Reconciliation ו־before custody נוצרו לפני עדכון התוכנית; אין Acceptance/Authority/Closure/Completion מן הביקורות.

11.2.156 התחום:19 source locks,22 חובות PRE,94 עוגני מקור,19 שדות מינימום בסדר המקורי, שלוש הופעות claim ישירות ב־Reconciliation, שבע חובות בחירה ועשר הרחבות נדרשות. נכתבו16 סעיפים ו־7 positive/23 negative specifications שלא הורצו. אלה inventories נפרדים, לא מכנה השלמה. לא נכתב FCS expected-content wire, complete proof descriptor, callable verifier או actual criterion/program/operand/evidence instance. כל22 חובות PRE נשמרו כדרישות או עבודה פתוחה; חובות לגופים עתידיים אינן מוצגות כממומשות.

11.2.157 המפתח נשאר full producing Review Root + findingId; ordinal, severity, noMergeKey, evidencePointer ו־disposition המקוריים נשמרים. אין ב־DlpFinding קישור ל־criterion/program, ולכן matching ID או בחירת תנאי שעבר אינם מספיקים. נדרש מיפוי עצמאי לחובת הסגירה המלאה ותוכנית מלאה מה־input16 המדויק, עם input01→15→21 והגדרות operand מקוריות. שמונת operand declarations אינם actual values או proof; ProofBytes הוא signature-only. Closure אינו משכתב FAIL/UNSATISFIED/UNAVAILABLE, ו־Subject שהשתנה מחייב Intent וביקורות חדשים. proof ברמה8 אינו מצביע ל־Union8, proof אחר באותה רמה או Reconciliation/Attempt/CAS/Final; AttemptId המוקדם אינו Attempt Root. שלוש הופעות הצריכה נבדקות לפי כל מופע לפני deduplication; אין group/range credit.

11.2.158 אימות תיעודי אישר ש־14 authentication rows,13 timed classes ושלוש phase rows אינם כוללים Closure; מילוי payload:null אינו מרחיב אותם. שימוש במנגנונים אלה דורש successor מפורש ו־full migration של identity/framing/grants/material/time/phase/status/profiles/consumers/replay. נשמרו11 roles וכל328 dependency occurrences, לרבות30 ל־closure authority. ההמשך: לבחור criterion family נדרשת ממקור עצמאי, להשלים semantic entailment/representability, חתימות operands וסכמות evidence קונקרטיות; לאחר מכן להציע גוף proof מלא ופרופיל אימות ייעודי. כל הבחירות והראיות בפועל unavailable; NEXT-01 לא נענה. HSC-SG006/HWF, full Subject/AST,61 fieldTypes,156 imports, parent reservation/nonreuse/recovery/CANCEL/LOOKUP ו־adoption נשארים פתוחים. Baseline, DLP וכל המקורות וה־Master הטכני נשמרו. Planning-only; apply_patch בלבד; ללא מוצר, Tests/Build, candidate/parser/evaluator/fixture execution, slice/Root generation או Git/GitHub/Deployment/provider/key/signature operations. Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit0; אחוזים/שעות/ETA unknown/unavailable. קדם־התנאי המקומי RFB בסעיפים11.2.159–162 מספק תוכן operands למשפחת SUBJECT target בלבד; אינו משלים אף criterion היסטורי או גוף IFC proof.

11.2.159 הוקפא Review finding SUBJECT operand content V1 ונבדק ב־FINAL A/B עצמאיות עם PASS/PASS בתחום החוזה המקומי הכתוב בלבד. Machine `review-finding-subject-operand-content-proposal-v1-2026-09-09.json` ב־SHA `54b9ceda830ef231921b3ba5265d283fc13ddb179ca3df48ed37e1e435691ee0` (126666 bytes; 2966 lines); Human באותו basename ב־SHA `dc78f3f882fdb93d19064672d6440753028580765f25c51714245931f0b97625` (128420 bytes; 2982 lines). Freeze `review-finding-subject-operand-v1-freeze-2026-09-09.json` ב־SHA `eeef8c87ce2358c0fa5c981ea646104d0b843a885883611b1e8d5b6def7032d1`. Reconciliation ו־before custody נוצרו לפני עדכון התוכנית; אין Acceptance/Authority/Closure/Completion מן הביקורות.

11.2.160 התחום:15 source locks,22 חובות PRE,59 עוגני מקור,16 הגדרות מיובאות מדויקות ו־13 טיפוסים מקומיים חדשים. גרף metadata בן29 טיפוסים ו־45 קשתות הוא acyclic; אין בכך הוכחת גרף Root בפועל. BindingInput בלתי־מושרש מכיל Intent/AttemptId, Finding מקורי בענף SUBJECT, source occurrence ו־expected Subject עצמאי. שלושה role profiles נועלים DLP-ROOT-0122/0142/0162; שתי הקרנות מספקות ערכי ROOT-EQUAL ו־ROOT-OCCURRENCE ל־ROOT-PRECEDES לפי הכללים הקפואים, ללא תוכנית או evaluator שהופעלו.7 positive ו־21 negative specifications לא הורצו.

11.2.161 נתיב המקור הוא tuple בן ארבעה צעדים יחסי ל־payload: orderedFindings / INDEX j / evidencePointer / target. הוא נפרד מ־evidencePointer.path המקורי בתוך Subject. j הוא מיקום המערך בפועל; ordinal מדווח k נשמר גם אם k!=j, ככשל נפרד של Review. Full originalFinding ו־actual target מועתקים רק מההופעה המדויקת; expected מגיע מהקשר עצמאי מוקדם. גוף הקלט אינו דורש מראש Review PASS, שוויון target או הצלחת order. לכן B שגוי אך מוקדם יכול להיות בר־ייצוג עם order נכון ושוויון שגוי מול A. שוויון ערכים אינו זהות occurrence; אין dedup, source substitution או repair. מקור/נאמנות/צורה נפרדים מקבלת ה־Review המלאה, שחובותיה לא הוחלשו.

11.2.162 סדר נבדק לפי descriptor המופע, CURRENT/Gboot ללא חריג היסטורי, ומלוא source/actual target envelopes עם creationOrdinal אמיתי; RootRef ושם schema אינם ראיית סדר. Root זר אינו מעניק lookup, וחסר בהרשאה או פתרון target אינו מתיר fallback ל־expected או מחיקת mismatch. RFB-BOUND-1 מחייב גבולות עצמאיים מוקדמים לכל source/input/copy/path/resolution ועבודה, יחד עם גבולות המקור המחמירים החלים. Native source/projection/authentication, הרשאות, typed result/diagnostic/program binding, conformance/adoption נשארים unavailable. המשפחה אינה מאמתת inner Subject path, שלמות כל Findings, full DAG/Review או אף תנאי HSC/IFC closure מלא. NEXT-01, full Subject/AST,61 fieldTypes,156 imports,SG006/HWF ו־reservation/nonreuse/recovery/CANCEL/LOOKUP פתוחים. Baseline וכל המקורות וה־Master הטכני נשמרו. Planning-only; apply_patch בלבד; ללא מוצר, Tests/Build, candidate/parser/operator/evaluator/fixture execution, slice/Root generation או Git/GitHub/Deployment/provider/key/signature operations. Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit0; אחוזים/שעות/ETA unknown/unavailable. תוכן הדיווח המקומי RFD V2 בסעיפים11.2.163–166 נוסף בנפרד; native result/diagnostic transport, אימות והסתמכות עדיין חסרים.

11.2.163 הוקפא Review finding SUBJECT check report V2 ונבדק בשתי ביקורות FINAL עצמאיות PASS/PASS בתחום חוזה התוכן המקומי הכתוב בלבד. Machine `review-finding-subject-check-report-content-proposal-v2-2026-09-09.json` ב־SHA `efcc18ca8cc5ee24251645b57a833dcada3c382fd4fb6f5b9883b433acc3cd84` (211177 bytes; 5189 lines); Human באותו basename ב־SHA `3c03e7c9505c6887c9af2937634242015caedb3912bafb82cdd4781830636ae6` (212317 bytes; 5203 lines). Freeze `review-finding-subject-check-report-v2-freeze-2026-09-09.json` ב־SHA `57378244fff9420fffbc2bd67bc462d501b889518ed4ce5b739275510abf7b77`. V1 ו־FAIL/FAIL נשמרו ללא שינוי; RFD-A-001/RFD-B-001 הובילו להפרדה מפורשת בין בחירת גבולות מוקדמת לקישור תצפיות מאוחר. Reconciliation ו־before custody קדמו לעדכון התוכנית; אין Acceptance/Authority/Closure/Completion מכוח הביקורות.

11.2.164 התחום:19 source locks,20 חובות PRE,96 עוגנים,29 הגדרות מיובאות מלאות,17 טיפוסים חדשים וגרף metadata acyclic בן46 צמתים ו־67 קשתות. שלושה role profiles ושני slots קבועים משמרים RFB ROOT-EQUAL/ROOT-PRECEDES ואת18 הסעיפים. CheckReport בלתי־מושרש מכיל BindingInput מלא, פעילות ה־operator המקורי, outcome שה־producer דיווח, תצפיות אבחוניות מאוחרות וחסמי הסתמכות נפרדים.11 positive ו־31 negative specifications לא הורצו; actual reports/programs/evidence0. כשל לפני קלט מלא או בדוח עצמו אינו מורחב אוטומטית ל־SOD/SVC.

11.2.165 TRUE מקורי שגוי יכול להישמר יחד עם DIFFERENT שנמצא בניתוח מאוחר; אין תיקון של ההיסטוריה או הסקת ביצוע מהפלט. פעילות UNKNOWN נפרדת מהוכחה שלא התחילה פעולה ומהתחלה/סיום; ניתוח מאוחר אינו פעילות ה־operator המקורי. Source ו־actual-target creationOrdinal נשמרים בנפרד גם כשאחד חסר; EARLIER מחייב target קטן ממש מ־source, ושוויון ordinals הוא NOT-EARLIER. היחס המספרי אינו ROOT-PRECEDES ואינו מחליף descriptor/CURRENT/Gboot/מקור/הרשאה/נאמנות. חסר פתרון B אינו מתיר שימוש ב־A הצפוי. known mismatch, missing prerequisites ו־not-evaluated נשמרים בנפרד; אין קידום claim ל־AST TRUTH או הצלחה מרשימת issues ריקה.

11.2.166 A0 בוחר קלט קיים, שימושים ומקורות, הגדרות ניתוח, הרשאות וגבולות לפני פעולה אבחונית חדשה, ללא תוצאה עתידית. לאחר שהתצפיות קיימות, D0 משמר את בחירת A0 המקורית וקושר אותן ל־cut ולצרכן, ובוחר בנפרד גבולות והרשאות לפעולות הדוח. אין הרשאה בדיעבד, החלפת A0 או הרחבת D0 לתוצאות עתידיות; ניתוח חדש דורש A0 קודם ו־D0 מאוחר משלו. full input/copies/ordinals/issues/output/retention נכללים בגבולות המחמירים החלים; אין truncation/empty fallback/אבחון רקורסיבי. native source/authentication/custody/execution/time/currentness/permission/program binding/conformance/adoption עדיין unavailable. אין full Review/DAG/criterion/IFC proof או סגירת Finding/import. NEXT-01,full Subject/AST,61 fieldTypes,156 imports,SG006/HWF ו־reservation/nonreuse/recovery/CANCEL/LOOKUP פתוחים. Baseline וכל המקורות וה־Master הטכני נשמרו. Planning-only; apply_patch בלבד; ללא מוצר, Tests/Build, candidate/parser/operator/evaluator/fixture execution, slice/Root/preimage generation או Git/GitHub/Deployment/provider/key/signature operations. Gate29 BLOCKED; freeze ACTIVE; foundations0/6; AtomicTaskRegistry NOT-ACCEPTED; כל credit0; אחוזים/שעות/ETA unknown/unavailable.

## 11.3 מה צריך מ־Tal

11.3.1 אישור או דחייה מפורשים של ה־root המדויק בלבד.

11.3.2 לצורך actual native proof schemas נדרשת החלטה קיימת או חדשה על סביבת מנגנון האימות, גבולות consumer/resource/action ומקור הסמכות החיצוני להתקנה ולבחירת זהויות/הרשאות, ולאחריה שמות ומפרטי המקורות עם גרסאות ותחומי כיסוי. אפשר לציין שטרם נבחרו; אין להסיק בחירה מה־hosting של המוצר. Tal נשאר work owner ואין לבקש סיסמאות, tokens או private keys. מסירת מידע תכנוני אינה adoption, הרשאת פעולה או ביטול development freeze. מחקר KMS/OIDC משאיר את Hosting המוצר, Clerk ו־Owner=Tal כהקשר קיים; החסר הוא הייעוד המדויק למנגנון שבודק את הראיות לפני קבלה, גבול השליטה בו ומקור סמכותו. אין להציג החלטות מוצר קודמות כאילו ענו על החסר הזה. מסמך NEXT-01 V1 מציג תחילה בחירת משפחת הרצה מתוך שלוש אפשרויות; גם תשובה לכך אינה משלימה אוטומטית את מלוא הנתונים בסעיף זה. היעדר תשובה אינו מונע תכנון בלתי תלוי.

## 11.4 תנאי סיום

11.4.1 Planning root Accepted, כל ביקורות היסוד Accepted ו־Gate29 מקבל החלטה מפורשת עם Scope.

11.4.2 ה־PASS/PASS של Eligibility V5, חוזה Stage10 V12/Human V11, ‏Bootstrap Input Admission V2, ‏Bootstrap descriptor shape proposal V1, ‏Bootstrap semantic grammar proposal V2, ‏Bootstrap configuration/evidence envelopes proposal V2, ‏Bootstrap Stage10 integration proposal V1, ‏Anchor / Genesis verification proposal V2, ‏Subject Bootstrap Admission consumption requirements V1 , ‏Detached normative content contract proposal V1 ו־Detached transaction contract proposal V3 וכן Detached resource/policy contract proposal V2 / DTC V5 ו־Detached lifecycle payload contract proposal V3 / DRP wire V4 / DTC wire V7 וכן Inherited requirement custody V1 ו־Historical semantic obligations V2 וכן Source interpretation V1 ו־Source owner grammar V2 וכן Source constructor/admission V2 ו־Source-use input/evidence V2 וכן Native ingress/context V2 וכן Native proof authentication V2 וכן Native evidence source admission V1 וכן KMS/OIDC source assessment במסירת V3 / Machine V2 וכן NEXT-01 decision brief V1 וכן SOURCE-CONJUNCT span V1 וכן owner/use V2 וכן occurrence inventory V1 וכן owner/selection content V1 וכן owner diagnostic V2 וכן owner decoded view V2 וכן source value comparison V1 וכן source comparison evidence requirements V1 וכן historical atomic footprint assessment V1 וכן source owner/use collection content V1 וכן independent finding closure requirements assessment V1 וכן review finding SUBJECT operand content V1 וכן review finding SUBJECT check report V2 בסעיפים 11.2.8–11.2.166 הם הכרעות ביקורת סטטית של מועמדים ואינם מקיימים את 11.4.1. ביקורות SUB V1, ‏DNC V1 ו־DTC V3 וכן DRP V2 ו־DLP V3 תחומות לדרישות צריכה, לסמנטיקה ולחוזים מקומיים מוצעים; הן אינן מאשרות Subject/lifecycle descriptors מלאים, מלוא הסמנטיקה ההיסטורית, imported instances או הפעלה בפועל. ביקורת HRC V1 תחומה לשחזור תיעודי של תנאי מקור ואינה מאשרת פירוק conjuncts, תוכניות או conformance. ביקורת HSC V2 תחומה לגרפי פעולה ותחולה מוצעים ולגבולות המקור, ואינה מאשרת פירוק טרנזיטיבי מלא, תוכניות, conformance או סגירת Findings. ביקורת SIP V1 תחומה לחוזי extraction/syntax, הרחבת routes חלקית וגבולות write-footprint; היא אינה parser conformance, full grammar, migration מלא או adoption. ביקורת OSG V2 תחומה ל־recovery ledger ושלושה Core descriptors עם שתי תצוגות Row; היא אינה full grammar, constructor/discovery conformance, migration או adoption. ביקורת SCA V2 תחומה לשישה recipes ולשלבי source-use מוצעים; היא אינה actual constructor/capability/typed evidence/discovery conformance או adoption. ביקורת SIE V2 תחומה לחוזי claims/קלט/הפניות מקומיים; היא אינה actual external proof schema closure, authentication, conformance או adoption. ביקורת NEC V2 תחומה לגופי subject/יחסי consumer ל־INGRESS/CONTEXT; אינה actual native authentication/install/currentness/conformance/signed-proof או external port closure. ביקורת NPA V2 תחומה לחוזי מקור/חתימה/grant/status/צריכה מוצעים; אינה actual native authentication, truth, effective permission, conformance או external port closure. ביקורת NESA V1 תחומה לדרישות בחירת מקורות, כיסוי תלויות ושאלון מידע; אינה בחירת ספק, actual proof schema, native evidence, compatibility, conformance, adoption או external port closure. ביקורת KMS/OIDC במסירת V3 / Machine V2 תחומה למחקר רכיבים, תיחום החלטות ותיקוני הפניות/מסירה; אינה actual source selection, proof schema, account evidence, conformance, permission או adoption. ביקורת NEXT-01 V1 תחומה להצגת חלופות ובקשת החלטה; אינה תשובת משתמש, בחירת מקור/runtime, סמכות או סגירת NEXT-01. ביקורת SCC V1 תחומה לשמונת שדות קטע מקור וקשרי bytes/owner/digest; אינה full owner/selection grammar, transitive semantic discovery, actual conformance, מקור native או סגירת import. ביקורת SCO V2 תחומה לשלושה route projections וסדר תלויות מוצע; אינה full O/E/owner grammar, אימות מקור, סמנטיקה טרנזיטיבית, actual conformance, adoption או סגירת import. ביקורת SCI V1 תחומה לגוף inventory מקומי סגור, ארבעה profiles וסדר binding מוצע; אינה full O/E/native proof grammar, source authentication, whole-collection uniqueness/completeness, atomic semantic discovery, actual conformance/adoption או import closure. ביקורת SOE V1 תחומה לשישה גופי expected content מקומיים, ייבוא הגדרות מלא וקישורי מקור/phase/bounds מוצעים; אינה actual native input/proof schema, authentication, collection/semantic closure, installed enforcement, conformance, adoption או import closure. ביקורת SOD V2 תחומה לסיכומי raw/check diagnostics מקומיים תחת D עצמאי; אינה raw/native proof schema, גוף decoded מלא, מקור/הרשאות/התקנה, effects evidence, bounded enforcement, conformance, adoption או import closure. ביקורת SOV V2 תחומה לקטלוג observed counterparts מקומי ולחובות השוואה; אינה native capture/result/transport/proof schema, faithful decoding, מקור/currentness/הרשאה/התקנה, complete semantics/collections, actual enforcement/conformance, adoption או import closure. ביקורת SVC V1 תחומה לתוכן מקומי של זוג מלא וטענות ערכים עם witness typed; אינה actual comparison/native capture/proof/result transport, source/fidelity/currentness/permission, full traversal מכוח DIFFERENT, complete semantics/collections, conformance/adoption או import closure. ביקורת SCE V1 תחומה למפת fact/phase/consumer/occurrence תיעודית; אינה native schema/proof/source selection, מינוי/הרשאה/התקנה, actual comparison/fidelity/enforcement, conformance/adoption או סגירת imports/ports. ביקורת HWF V1 תחומה ל־65/17 correspondence assessment ולהיסק no-write מותנה; אינה התאמת שימור מוכחת, סגירת SG006, שינוי סמנטי מאושר, בחירת runtime או conformance/adoption. ביקורת COL V1 תחומה לארבעה גופי expected collections, זהויות לוגיות ו־bijections יחסיים; אינה actual collection/occurrence/no-alias/completeness, native authentication/effects/conformance/adoption או סגירת imports. ביקורת IFC V1 תחומה למיפוי minima/consumer/selection/integration requirements; אינה FCS wire, proof descriptor מלא, בחירת criterion/source/runtime, ראיית truth/currentness/conformance, סמכות/adoption או סגירת Finding/import. ביקורת RFB V1 תחומה לגוף קלט והקרנות primitives לשלוש הופעות SUBJECT; אינה native extraction/authentication/proof, actual evaluation/order/fidelity, full Review/DAG/criterion, סגירת Finding/import או adoption. ביקורת RFD V2 תחומה לתוכן מקומי של claims/תצפיות/פעילות/חסמים ולסדר בחירת A0 וקישור D0; אינה native report/proof/transport, actual observation/analysis/execution/permission, AST TRUTH, full Review/criterion/IFC closure או adoption. עד ששת roots מקובלים, Reconciliation מקובל, Tal approval זכאי ו־Gate29 decision, שלב 10 נשאר פתוח ו־Development freeze נשאר פעיל. Authority, Acceptance, Permit, Closure ו־Completion credit נשארים `0`. אחוזים, שעות ו־ETA נשארים `unknown/unavailable` עד Atomic Task Registry מאושר והקלטים הנדרשים לחישוב.

# 12. שלב 11 — Atomic Task Registry, קיבולת Tal וזמן

## 12.1 מה השלב אומר

12.1.1 מפרקים את כל התוכנית למשימות קטנות שניתן לבצע, לבדוק, להקצות ולמדוד.

12.1.2 accepted Atomic Task Registry root=`unknown/unavailable`. לכן אחוז Planning, אחוז Product, יתרת שעות, ETA ו־critical path כמותי נשארים `unknown/unavailable`, גם לאחר הגדלת תקציב GitHub Actions.

## 12.2 משימות

12.2.1 למפות כל Requirement, Decision, Finding, Gate, External wait וקובץ קיים למשימה או להסבר מדוע אינו דורש משימה.

12.2.2 לסווג כל מימוש קיים: `KEEP`, ‏`VERIFY`, ‏`REFACTOR`, ‏`QUARANTINE` או `REMOVE-WITH-AUTHORITY`.

12.2.3 לכל Task להוסיף `Owner=Tal`, ‏dependency, environment, inputs, outputs, negative tests, Evidence ו־Definition of Done.

12.2.4 לאסור Task גדול שאינו ניתן לסיום ולפרק אותו לתת־משימות אטומיות.

12.2.5 להוסיף אומדן טווח, confidence, external wait, parallelism ו־critical path רק לאחר שהמכנה סגור.

12.2.6 לחשב לראשונה אחוז Planning, אחוז Product, שעות ותרחישי ETA; מספר חסר נשאר `unknown/unavailable`.

## 12.3 מה צריך מ־Tal

12.3.1 N01 נסגר: `Owner=Tal` לכל העבודה. כדי לחשב זמן נדרשות רק שעות העבודה השבועיות שטל מקצה לפרויקט וחלונות זמן שבהם הוא זמין לטיפול בתקלה.

## 12.4 תנאי סיום

12.4.1 `100%` מהדרישות ממופות למשימות או ל־Non-task disposition, אין Task ללא בעלים ובדיקה, והאומדן ניתן לשחזור.

# 13. שלב 12 — חיבורים, חשבונות וסביבות

## 13.1 מה השלב אומר

13.1.1 מקימים סביבת ניסוי מבודדת לכל ספק לפני שנוגעים בלקוחות או בכסף אמיתי.

## 13.2 משימות

13.2.1 N02: Clerk Staging עם Organizations, MFA ו־named admins.

13.2.2 N03: Railway Staging עם API, Worker, PostgreSQL ו־Redis/BullMQ מבודדים.

13.2.3 N04: Vercel Staging ו־Production נפרדים, Domains ו־APP_PUBLIC_ORIGIN חוקי.

13.2.4 N05: Meta Test WABA, Phone, Templates, Webhook, Permissions ו־approved recipients.

13.2.5 N06: AWS `il-central-1`, ‏private S3, customer-managed KMS, GuardDuty ו־budget alarms.

13.2.6 N07: Better Stack ו־OpenTelemetry עם Redaction ו־Alert routing.

13.2.7 N08: OpenAI company project, Data controls, budgets ו־Eval environment.

13.2.8 N09: Stripe/Paddle Sandbox נשאר אופציונלי וכבוי עד אחרי Pilot.

13.2.9 N10–N15: GitHub governance, Domains, Legal, budget caps, isolated PostgreSQL ו־Pilot charter.

13.2.10 כל Secret נשמר ב־Provider Vault או Secret manager; במסמכים נשמרים רק שם לוגי, Owner, Scope, expiry ומצב.

## 13.3 מה צריך מ־Tal והצוות

13.3.1 Memberships, שמות Domains, ישות משפטית, תקציבים ו־Pilot charter; לא Credentials בצ׳אט.

## 13.4 תנאי סיום

13.4.1 כל N01–N15 במצב `READY-WITH-EVIDENCE` או `NOT-APPLICABLE-WITH-AUTHORITY`; Staging מבודד מ־Production.

# 14. שלב 13 — ליבת הפלטפורמה

## 14.1 מה השלב אומר

14.1.1 מוודאים שהבסיס שעליו כל המסכים נשענים בטוח: התחברות, הפרדת עסקים, מסד נתונים, API ותורים.

## 14.2 משימות

14.2.1 לאמת React/Next.js ב־Vercel ו־API/Workers ב־Railway על אותו Release SHA.

14.2.2 להשלים Clerk authentication, Organization selection, MFA Admin ו־Tenant isolation fail-closed.

14.2.3 להשלים PostgreSQL migrations, constraints, idempotency, transaction boundaries ו־connection limits.

14.2.4 להשלים Redis/BullMQ queues, DLQ, retry, delay, backpressure, leases ו־recovery.

14.2.5 לחייב Authorization בכל Server action ו־API operation ולחסום Client import של Server/DB code.

14.2.6 להוסיף Audit log ללא Secrets ו־trace correlation שלא מזהה לקוח בפומבי.

## 14.3 תנאי סיום

14.3.1 בדיקות Cross-tenant שליליות עוברות, Migrations נבדקו ב־PostgreSQL מבודד וכל Runtime surface קשור ל־Release evidence.

# 15. שלב 14 — WhatsApp הרשמי ו־Rate limiting

## 15.1 מה השלב אומר

15.1.1 מחברים את Connect רק ל־WhatsApp הרשמי ומגבילים כל שליחה לפי החשבון, האיכות, הלקוח, הנמען, העלות והחוק.

## 15.2 משימות

15.2.1 להשלים Webhook verification, signature, replay defense, event deduplication ו־raw-redacted storage.

15.2.2 להשלים Template sync, status lifecycle, language, category, quality, pacing ו־rejection handling.

15.2.3 לבנות LimitSnapshot חי עם Provider, Portfolio, Phone, Pair, Quality, Template, Consent, Window, Geo, Cost, Connect, Queue ו־DB caps.

15.2.4 ברירת מחדל=`cap zero` כאשר Snapshot חסר, ישן, סותר או אינו קשור לחשבון.

15.2.5 לטפל במפורש בקודי Meta, Retry-After, Opt-out, Service window, quality downgrade ו־marketing suppression.

15.2.6 להוכיח Reservation אטומי, cancellation, concurrency ו־no double-send תחת crash ו־response loss.

15.2.7 Tal מאשר בעתיד רק את המספרים החיים וה־Connect cap המדויקים; אין מספר מומצא.

## 15.3 תנאי סיום

15.3.1 שליחה ל־approved test recipients עוברת; כל תרחיש stale/over-limit/opt-out/invalid-template נחסם ללא Attempt אסור.

# 16. שלב 15 — Inbox, אנשי קשר, Templates, Campaigns ו־Bot flows

## 16.1 מה השלב אומר

16.1.1 משלימים את העבודה היומיומית של העסק: לראות שיחות, לנהל אנשי קשר, להכין הודעות ולהפעיל תהליכים מבוקרים.

## 16.2 משימות

16.2.1 Inbox: pagination, unread state, assignment, notes, search, delivery status ו־real-time reconciliation.

16.2.2 Contacts: import validation, consent provenance, deduplication, tags, suppression ו־deletion lifecycle.

16.2.3 Templates: draft, preview, submit, reconcile, retry, outbox ו־provider status.

16.2.4 Campaigns: audience snapshot, approval, schedule, pause, cancel, quota, rate limit ו־delivery telemetry.

16.2.5 Bot flows: versioning, draft, approval, activation, rollback ו־human handoff.

16.2.6 לחסום כל כפתור ללא פעולה ולהשלים Dialog keyboard, focus trap, Escape ו־focus return.

## 16.3 תנאי סיום

16.3.1 כל Workflow עובר Positive, Negative, concurrency ו־recovery tests על Staging; אין פעולה שקטה או UI שמבטיח דבר שאינו נשמר.

# 17. שלב 16 — AI, ידע וסריקת קבצים

## 17.1 מה השלב אומר

17.1.1 מאפשרים ל־AI להציע תשובות מתוך ידע מאושר, אך אדם נשאר בעל ההחלטה לפני שליחה.

## 17.2 משימות

17.2.1 להפעיל OpenAI Responses רק דרך Adapter עם model allowlist, timeout, budget ו־redaction.

17.2.2 ליישם Prompt/version registry, Eval suite, citation provenance ו־unsafe-content policy.

17.2.3 Knowledge upload מוגבל ל־10 MiB ול־PDF/TXT/DOCX בהתאם להחלטה.

17.2.4 להעלות קובץ ל־Quarantine, להצפין ב־KMS, לסרוק, לחסום עד PASS ולמחוק לפי Retention.

17.2.5 שחזור Scan תקוע לאחר 15 דקות ועד שלושה ניסיונות; לאחר מכן DLQ והתראה אנושית.

17.2.6 למנוע Prompt injection, cross-tenant retrieval, untrusted tool call ו־AI autonomous dispatch.

## 17.3 תנאי סיום

17.3.1 AI Evals עוברים, כל תשובה קשורה למקור ול־Tenant, וקיימת הוכחה שאין שליחה ללא Human approval.

# 18. שלב 17 — Billing, Packages ו־Quotas

## 18.1 מה השלב אומר

18.1.1 מגדירים כיצד לקוחות יחויבו ומה מכסת השימוש שלהם, אך לא גובים אוטומטית ב־Pilot.

## 18.2 משימות

18.2.1 להשאיר Stripe ו־Paddle Adapters Dormant ונפרדים מליבת המוצר.

18.2.2 לאחר Pilot לבצע Eligibility, Legal, Tax, pricing, refund, invoice, DPA ו־cost comparison.

18.2.3 לבחור ספק פעיל בהחלטה חדשה; לא להפעיל את שניהם יחד ללא Contract מפורש.

18.2.4 ליישם idempotent Checkout, Webhook verification, entitlements, cancellation, refund ו־reconciliation.

18.2.5 לקשור Quotas ל־Package, Tenant, WhatsApp cap, AI cost ו־kill switch.

## 18.3 מה צריך מ־Tal

18.3.1 החלטת ספק רק אחרי Pilot ו־Finance/Legal Evidence; אין להעביר פרטי כרטיס למסמך.

## 18.4 תנאי סיום

18.4.1 Sandbox E2E, double-webhook, retry ו־refund tests עוברים; Production Billing דורש Gate נפרד.

# 19. שלב 18 — Security, Monitoring, Backup ו־Data lifecycle

## 19.1 מה השלב אומר

19.1.1 מוודאים שאפשר לזהות תקלה, להגיב, לשחזר ולמחוק מידע באופן בטוח ומוכח.

## 19.2 משימות

19.2.1 להגדיר SLO, metrics, traces, logs, redaction, business-hours on-call ו־escalation.

19.2.2 לבצע Alert drill, incident timeline, runbooks, status communication ו־postmortem template.

19.2.3 Backup יומי, 90 יום, PITR ו־monthly restore drill לפי החלטה, קשורים ל־backupId ו־digests.

19.2.4 לאמת R2/Object storage consistency אם נעשה בו שימוש ולבדוק חלון שמירה בפועל.

19.2.5 Retention Plan v2 עם ID, digest, expiry, policy version, cutoff ו־approved identities.

19.2.6 Legal Hold, active-record block ו־atomic safe delete; Post-delete query הוא Audit בלבד.

19.2.7 להגדיר Incident response ל־Secret leak במאגר PUBLIC, כולל revoke, rotate, invalidate ו־history assessment.

## 19.3 תנאי סיום

19.3.1 Monitoring drill, Backup/Restore drill ו־safe-delete drill עוברים עם Evidence; Legal מאשר את המדיניות החלה.

# 20. שלב 19 — QA, Accessibility, Performance ו־Release quality

## 20.1 מה השלב אומר

20.1.1 בודקים שהמוצר עובד נכון, מהר ונגיש גם כאשר המשתמש טועה או ספק חיצוני נכשל.

## 20.2 משימות

20.2.1 להריץ Build, TypeScript, ESLint, Unit, Integration, Contract ו־E2E יחד על Commit מדויק.

20.2.2 להוסיף Negative tests לכל Permission, Tenant boundary, expired plan, forbidden trigger, malicious Origin ו־unbound Restore.

20.2.3 לבדוק Keyboard, Screen reader, Contrast, RTL, Mobile, Focus, Error messages ו־loading states.

20.2.4 למדוד Web Vitals, API latency, Queue lag, database load, large imports ו־campaign burst.

20.2.5 לבצע Dependency audit, SAST, Secret scan, license scan, SBOM ו־artifact provenance.

20.2.6 להסיר flaky tests, warnings ו־temporary bypasses או לרשום Debt עם Owner ו־expiry.

## 20.3 תנאי סיום

20.3.1 כל שערי CI עוברים יחד, אין P0/P1 פתוח, וה־Release candidate ניתן לשחזור מאותו Commit.

# 21. שלב 20 — Staging ו־Pilot סגור

## 21.1 מה השלב אומר

21.1.1 מפעילים את המערכת עם עסק אחד ומשתתפים מאושרים, תחת יכולת עצירה מלאה וללא הרחבה שקטה.

## 21.2 משימות

21.2.1 לאשר Pilot charter: Tenant, משתתפים, תאריכים, נתונים, מטרות, Stop authority וקריטריוני יציאה.

21.2.2 לבצע Deployment provenance ל־Vercel/Railway ולהוכיח Release SHA בכל שירות.

21.2.3 להריץ Clerk invitation, Meta webhook, Template, test delivery, Inbox, Campaign, Human-approved AI ו־Observability E2E.

21.2.4 לבצע Chaos drills מבוקרים: Redis unavailable, Worker crash, DB conflict, provider 429, duplicate Webhook ו־lost response.

21.2.5 למדוד SLO, user feedback, delivery quality, opt-out, cost ו־support workload.

21.2.6 לעצור מיד כאשר Stop criterion מתקיים; אין מעבר אוטומטי ללקוח נוסף.

## 21.3 תנאי סיום

21.3.1 Pilot exit review מאשר או דוחה כל קריטריון בנפרד, וכל Incident נסגר לפני הרחבה.

# 22. שלב 21 — Production launch

## 22.1 מה השלב אומר

22.1.1 מעלים את המערכת האמיתית בהדרגה, עם אפשרות Rollback ועם אנשים שיודעים לעצור אותה.

## 22.2 משימות

22.2.1 להקפיא Release candidate, SBOM, migrations, configuration manifest ו־Rollback package.

22.2.2 לבצע Staged canary: קבוצה קטנה, מדדים, pause window והרחבה רק לאחר PASS.

22.2.3 לבצע preflight ל־Domains, TLS, Clerk, Meta, DB, Redis, AWS, OpenAI, Monitoring ו־budgets.

22.2.4 להפעיל Kill switches ל־Campaign, Bot, AI, Upload ו־Billing בנפרד.

22.2.5 להחזיק On-call, incident channel, customer communication ו־Rollback owner בזמן ההשקה.

22.2.6 לבצע Post-launch readback ולוודא שה־Production state תואם את ה־approved release.

## 22.3 מה צריך מ־Tal

22.3.1 אישור Go-live מפורש ל־Release SHA, Scope, Tenant set ו־זמן מדויק לאחר שכל ה־Gates עברו.

## 22.4 תנאי סיום

22.4.1 Production stable במשך חלון שנקבע ב־Task Registry, אין Regression חוסם ו־Rollback נבדק וזמין.

# 23. שלב 22 — שיפור לאחר ההשקה לגרסה הטובה בתחום

## 23.1 מה השלב אומר

23.1.1 משפרים את המוצר לפי שימוש אמיתי ולא לפי רשימת תכונות של מתחרים בלבד.

## 23.2 משימות

23.2.1 אמינות Inbox ו־WhatsApp, Consent ו־Opt-out נשארים עדיפות ראשונה לפי O12.

23.2.2 לבנות Benchmark תקופתי מול Twilio, Intercom, Respond.io, WATI, SleekFlow ופלטפורמות רלוונטיות על מקורות עדכניים.

23.2.3 למדוד Activation, time-to-first-value, response time, delivery quality, operator productivity, retention ו־support burden.

23.2.4 לתעדף Reporting, Automation, CRM integrations, Enterprise, Public API ו־Mobile רק לפי Evidence ו־ICP.

23.2.5 לבצע Security review, Restore drill, Legal review, Dependency refresh ו־cost review במחזור קבוע.

23.2.6 להחזיק Roadmap עם Outcome, Owner, metric, cost cap ו־kill criteria לכל Initiative.

## 23.3 תנאי סיום

23.3.1 אין נקודת “מוצר מושלם” קבועה; שלב זה הופך למחזור שיפור מתמשך עם יעדים מדידים וביקורות תקופתיות.

# 24. שלב 23 — אישור סיום התוכנית המלאה

## 24.1 מה השלב אומר

24.1.1 שלב זה קובע האם כל התוכנית שתוחמה אכן הושלמה; הוא אינו מבטל תחזוקה שוטפת.

## 24.2 משימות

24.2.1 להקפיא Final Task Registry ולוודא שאין Task ללא disposition.

24.2.2 להפיק Evidence index לכל Requirement, Decision, Finding, Gate, Test, Deployment ו־Operational drill.

24.2.3 לבצע שלוש ביקורות סופיות ולסגור כל Finding ללא Merge או suppression לא מורשים.

24.2.4 לחשב Completion רק מהמכנה המאושר ולפרסם numerator, denominator, weights ו־unknowns.

24.2.5 לקבל אישורי Product, Security, Legal, Operations ו־Tal לפי תחומי סמכותם.

24.2.6 לפרסם Final accepted root ו־current pointer אטומיים עם Rollback ו־supersession rules.

## 24.3 תנאי סיום

24.3.1 כל המשימות שבתיחום Accepted או קיבלו disposition מאושר; כל Gates עברו; אין P0/P1 פתוח; וה־Final root אושר באופן עצמאי.

# 25. סדר הביצוע המקוצר

25.1 שלבים `1–10`=`פרסום בטוח והשלמת המחקר/התכנון`.

25.2 שלב `11`=`יצירת מכנה העבודה, האחוז והזמן`.

25.3 שלב `12`=`חיבורים וסביבות`.

25.4 שלבים `13–18`=`פיתוח והקשחת המוצר`.

25.5 שלבים `19–21`=`QA, Pilot ו־Production`.

25.6 שלבים `22–23`=`Best-in-class ואישור סיום`.

25.7 תלות עליונה=`1 → 2 → (3,4,8,9 במקביל כאשר Authority מאפשר) → 5 → 6 → 7 → 10 → 11 → 12 → 13–18 → 19 → 20 → 21 → 22 → 23`.

25.8 עבודה מקבילית אינה רשאית לעקוף Authority, Gate, Legal, Secret handling או Tenant isolation.

# 26. מידע חיצוני שעדיין חסר

26.1 שעות העבודה השבועיות של Tal, זמינות לטיפול בתקלות ודרך ההודעה המועדפת אליו; מודל האחריות עצמו כבר נסגר.

26.2 Clerk, Railway, Vercel, Meta, AWS, Better Stack ו־OpenAI Memberships.

26.3 Domains ו־Origins.

26.4 ישות משפטית, Counsel, Privacy/DPA ו־Direct-marketing review.

26.5 תקציב ותקרה לכל ספק.

26.6 PostgreSQL מבודד ו־Pilot charter.

26.7 מספרי WhatsApp חיים ו־account entitlements.

26.8 אין לשלוח Secret, Token, Password, Private key, Customer data או פרטי תשלום במסמך, Chat, Issue או מאגר PUBLIC.
