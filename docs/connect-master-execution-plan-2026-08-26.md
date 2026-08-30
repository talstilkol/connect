# Connect — Master Plan מלא לביצוע, אבטחה והגעה למוצר Best-in-class

תאריך בסיס: 26.08.2026  
גרסה: 1.1-draft — מסלול הגרסה הפעיל הוא `1.1-draft` → `1.1-approved`; מחקר וביקורת Delta פעילים, ו־Gate 29 והפיתוח נשארים חסומים עד השלמת QA ואישור מפורש של ה־Digest המדויק  
Commit בסיס: 93c6b2dfe007f07c43c37389873a8a648a3ff69d  
מחבר התכנון: Codex; מאשר סופי: טל  
Reviewers נדרשים וסטטוס: Product `pending`, Engineering `pending`, Architecture `pending`, Security `pending`, Privacy/Legal `pending`, Database `pending`, SRE `pending`, QA `pending`, UX/Accessibility `pending`, Finance `pending` ו־WhatsApp safety/Tal `pending`  
בדיקת מקורות אחרונה: 27.08.2026  
Canonical SHA-256: `pending-final-QA`  
מקור סמכות: מסמך זה יחליף את תוכניות הסטטוס הישנות רק לאחר השלמת הרשם וה־QA בסעיף 35, סגירת Gate 29 ואישור טל ל־Digest המדויק

> **הוראת־על חדשה — 30.08.2026:** [Tal הוא האחראי היחיד](planning/sole-owner-operating-model-2026-08-30.md) לכל מחקר, תכנון, פיתוח, בדיקה, חיבור ותיאום. שמות ותפקידי Primary/Backup/RACI שמופיעים בהמשך המסמך הם תיעוד היסטורי ואינם הקצאת עבודה פעילה. אישור מקצועי חיצוני נשאר Evidence שטל אחראי להשיג. אין לשכתב חבילות Evidence חתומות רק כדי להחליף שמות.

## 1. חוזה המסמך ועצירת הפיתוח

1.1 מטרת המסמך היא להפוך את כל האפיון, ההחלטות, הסיכונים והעבודה שנותרה לתוכנית ביצוע אחת שאפשר לבדוק, לאשר ולבצע לפי סדר.

1.2 עד להשלמת סעיף 35, סגירת Gate 29 ואישור מפורש של טל ל־Digest המדויק, אסור לבצע פיתוח Feature, Migration, שינוי Runtime, Commit, Push, Deployment או הפעלת ספק.

1.3 בזמן ההקפאה מותר לבצע רק מחקר, קריאת קוד, ביקורת Read-only, עדכון מסמך זה ובדיקות שאינן משנות מצב חיצוני.

1.4 אף משימה אינה נחשבת גמורה רק משום שקיים קוד. היא גמורה רק כאשר כל תנאי הקבלה, הבדיקות והראיות שלה הושלמו.

1.5 אין הבטחה כנה למערכת חסינה מכל תקיפה אפשרית. היעד הוא כיסוי שיטתי, הגנה בשכבות, Fail-closed, זיהוי מהיר, תגובה, שחזור ושיפור רציף.

1.6 מסגרות הבקרה הקובעות יהיו NIST CSF 2.0 לניהול סיכון, NIST SP 800-18r2 למבנה תוכניות Security/Privacy/C-SCRM, NIST SP 800-53 Release 5.2.0 כקטלוג Reference, NIST SSDF 1.1 למחזור פיתוח מאובטח, OWASP ASVS 5.0.0 לבקרות יישומיות, OWASP AISVS 1.0 לבקרות AI, OWASP Top 10 2025, OWASP API Security Top 10 2023, OWASP GenAI LLM Top 10 2026, OWASP WSTG v4.2, CIS Controls 8.1, CSA CCM 4.1, SLSA 1.2 ו־NIST SP 800-61r3 לתגובה לאירועים. כל מהדורה מקבלת Digest ב־Registry; מסמך `latest` משתנה אינו Gate קנוני.

1.7 יעד הקבלה הוא OWASP ASVS Level 2 לכל המוצר, OWASP AISVS Level 2 לכל יכולת AI חיה, בתוספת בקרות Level 3 שנבחרו עבור Tenant isolation, System Admin, Secrets, Billing, Release evidence, Backup, Restore, AI approval ויכולת Agentic עתידית. AISVS משלים ASVS ואינו מחליף Authentication, Authorization, Upload, Session, Secrets או Web security כלליים.

1.8 חריגה זמנית מותרת רק ל־P2/P3 ובכתב, עם בעלים, סיבה, Compensating control, תאריך תפוגה קצר ותוכנית סגירה. P0/P1 ביכולת חיה אינם מקבלים Risk acceptance: מתקנים ומבצעים Retest או משביתים ומסירים את היכולת מן Scope. אישור בעל פה אינו מספיק.

1.9 זמן שמופיע במסמך הוא שעות עבודה נטו של אדם מיומן. זמן המתנה לספק, Meta, Legal, Finance או בעל חשבון נרשם בנפרד ואינו מוסתר בתוך שעות הפיתוח.

1.10 כל אומדן יעבור כיול מחדש בסיום כל Gate. אין להקטין אומדן רק בשל מספר Commits או Tests.

1.11 אין רשימה סופית שמבטיחה לכסות "כל חולשה בעולם". ההתחייבות הניתנת לבדיקה היא שכל Asset, Data flow, Trust boundary, Provider, Dependency, Identity, Data class ו־Capability ב־Release ימופו ל־Threat registry ול־Control registry גרסאיים, ושכל שינוי Architecture, Incident, Provider, Law, Threat intelligence או Framework יפעיל Delta review חוסם.

1.12 חמישים ושניים Findings ‏`MP-F001`–`MP-F052` גוברים על כל טענת QA היסטורית בסעיף 34.38 עד QA חדש. המספר והטווח נגזרים מן הרשם הקנוני ולא מטקסט ידני; Gate 29 נשאר `BLOCKED`.

## 2. מילון למתחילים ושיטת מעקב

2.1 `שלב` הוא תוצאה עסקית או טכנית גדולה שאפשר לסגור באופן עצמאי.

2.2 `תת־שלב` הוא קבוצת משימות שמביאה חלק ברור מהשלב לתוצאה.

2.3 `משימה` היא יחידת עבודה שניתנת לביצוע, בדיקה ו־Review.

2.4 `Gate` הוא שער החלטה. עוברים אותו רק כאשר כל הראיות הנדרשות קיימות; אחרת המערכת נשארת כבויה או Fail-closed.

2.5 `Evidence` הוא פלט שאפשר לבדוק מחדש, כגון תוצאת CI, Digest, Log מושחר, צילום הגדרה, Restore report או חתימת Approver.

2.6 `Rollback` הוא מסלול חזרה למצב בטוח אם שינוי נכשל. Rollback שאינו נוסה אינו נחשב מוכן.

2.7 `P0` הוא סיכון שעלול לגרום לדליפה, שליחה לא מורשית, אובדן מידע, חיוב שגוי או פריצה רחבה; הוא חוסם Pilot ו־Production.

2.8 `P1` הוא סיכון משמעותי לאמינות, אבטחה או תפעול שחייב להיסגר לפני הרחבת Pilot.

2.9 `P2` הוא שיפור חשוב שאפשר לתזמן אחרי סגירת המסלול הקריטי, כל עוד אינו מסתיר P0 או P1.

2.10 לכל משימת־עלה יהיו שמונה־עשר שדות מפורשים שאינם ניתנים לירושה: מזהה דטרמיניסטי; פעולה יחידה; Input; Output ומיקומו; Predecessors; Primary; Backup; Reviewer; זמן מינימום ומקסימום; בדיקות חיובית/שלילית/כשל/Concurrency החלות; תנאי קבלה; Evidence ומיקומו; Detection/Monitoring; Rollback/Disable; Gate; Requirement IDs; Threat/Risk IDs; Status. ערך שאינו ידוע נרשם `unknown/unavailable` והופך למשימת Discovery חוסמת.

2.11 סטטוס מותר יהיה אחד מחמישה: `הושלם ומוכח`, `הושלם מקומית`, `בביקורת`, `ממתין`, `חסום חיצונית`.

2.12 `הושלם מקומית` אינו שקול ל־Ready. המשמעות היא שהקוד או החוזה קיים, אך חסרים ספק חי, הרשאה, תצורה או Evidence סביבתי.

2.13 משימת־עלה אחת אינה יכולה לעלות על שמונה שעות אדם. עבודה גדולה יותר מפורקת לפני אישור התוכנית; Parent task אינו מקבל שעות או Credit כדי למנוע ספירה כפולה.

2.13.1 כל טווח שעות המופיע מחוץ לרשם העלים בסעיף 35.6 הוא `Narrative ROM` היסטורי או יעד בקרה בלבד. הוא אינו שעת Parent, אינו נכנס לסכום ואינו Evidence. סכום Stage קנוני מחושב רק מעלי 35.6 ייחודיים; פער מול ROM נרשם Finding ואינו מתוקן בהזזת שעות שרירותית.

2.14 אין להתחיל משימה שאינה קיימת ב־Task Registry הקנוני שבסעיף 35. Gate 1 רשאי לעדכן Evidence ו־Remaining estimate, אך אינו רשאי לדחות אליו פירוק שהיה צריך להופיע בתוכנית זו.

## 3. מקורות האמת והיקף האפיון

3.1 מקור האפיון הראשון הוא PDF בן ארבעה עמודים בשם `אפיון מערכת - דיוור WhatsApp ובוט AI.docx.pdf`, שנבדק בחילוץ טקסט וברינדור חזותי.

3.2 מקור האפיון השני הוא מסמך האפיון הראשוני המפורט, הכולל תפקידים, Onboarding, Billing, Contacts, Templates, Campaigns, Scheduler, Inbox, Flow Builder, AI/RAG, דוחות, אבטחה, ישויות ו־83 שאלות פתוחות.

3.3 מקור החלטות המוצר הוא 30 תשובות השאלון D01–D30 של טל, ‏D31 כ־Supplemental Technical Decision נפרדת על הפרדת זהויות PostgreSQL, ומסמך המחקר המאושר מ־26.08.2026. D31 אינה תשובת שאלון מספר 31.

3.4 מקור מצב הקוד הוא Git HEAD, ה־Worktree, תוצאות הבדיקות האחרונות, ADRs, Registries, Migrations ו־Runbooks. מסמך סטטוס ישן אינו גובר על Evidence חדש.

3.5 היקף Pilot הוא Tenant יחיד, קבוצה סגורה, שוק ישראלי, עברית תחילה, WhatsApp רשמי בלבד, Plan ידני יחיד, ללא Recurring campaigns וללא שליחה אוטונומית של AI.

3.6 היקף המוצר המלא כולל SaaS Multi-tenant, ניהול מנויים, CRM, Templates, Campaigns, Scheduler, Shared Inbox, Flow Builder, AI/RAG, Reports, Billing, Admin, Audit, Security, Accessibility, Integrations ו־Scale.

3.7 יכולות שאינן מאושרות ל־Pilot נשארות כבויות גם אם חלק מהקוד שלהן קיים.

## 4. Baseline מאומת לפני חזרה לעבודה

4.1 ענף העבודה הנוכחי הוא `codex/cloudflare-evidence-builders`.

4.2 Commit הבסיס האחרון שנדחף ואומת מרחוק הוא `93c6b2dfe007f07c43c37389873a8a648a3ff69d`.

4.3 Slice ה־Meta pinned provider האחרון עבר שני Builds, TypeScript, ESLint, Source Guard, Interface Guard, Secret Hygiene וכל 3,869 הבדיקות שהיו קיימות באותו רגע.

4.4 ה־Adapter האחרון רדום ואינו מיובא למסלול Production. אסור להפעילו לפני סגירת Trusted one-attempt transport, Provider binding digest, Credential-by-revision, Provenance והרשאות Runtime.

4.5 ה־Worktree אינו נקי. במדידה האחרונה נמצאו 415 נתיבים: 128 קבצים מנוהלים ששונו ו־287 קבצים חדשים.

4.6 כל הקבצים המלוכלכים נחשבים עבודה לא־מאומתת עד Review נפרד. אין לבצע `git add .` ואין ליצור Commit רחב.

4.7 ה־Repository הפרטי קיים ב־GitHub, אך הגנת `main`, Rulesets, Required checks, CODEOWNERS, Collaborators ו־Dependabot חייבים אימות חי מחדש לפני Merge.

4.8 GitHub הציג לפחות התראת Dependabot אחת בדרגת Moderate. היא תטופל ב־Slice תלות נפרד ולא תתערבב עם Feature.

4.9 אחוז השלמה חדש לא יפורסם עד השלמת Inventory בסעיף 6. אומדנים היסטוריים נשמרים להקשר בלבד ואינם מקור אמת.

4.10 נמצא Finding ‏`P0-NEXT-2026-08-25`: ‏`package.json` ו־`package-lock.json` מקבעים `next` ו־`eslint-config-next` בגרסה `16.3.0`, בעוד [August 2026 Security Release הרשמי](https://nextjs.org/blog/august-2026-security-release) ושתי הודעות האבטחה הרשמיות של ה־Repository דורשים `16.3.3` לפחות עבור קו 16.3 עקב שתי חולשות Critical מסוג unauthenticated RCE.

4.11 החולשה הראשונה היא [CVE-2026-75604 / GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), והיא חלה על Pages Router או App Router ללא Cache Components כאשר השרת משתמש ב־Windows filesystem. החולשה השנייה היא [GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), והיא חלה על Image Optimization כאשר AVIF מעובד דרך `sharp`/`libheif`. יעד Vercel או היעדר הגדרת AVIF מפורשת אינם הוכחת אי־חשיפה: יש לבצע Reachability/Configuration proof, אך השדרוג נשאר חובה בכל מקרה.

4.12 לפני כל Feature slice לאחר הסרת ההקפאה, סעיף 7.7.8 נסגר ב־Dependency-only PR. אין Build, Preview, Pilot או Deployment מגרסה `16.3.0`, ו־Rollback אינו רשאי להחזיר לגרסה פגיעה.

## 5. החלטות ארכיטקטורה שכבר נלקחו

5.1 D01 קובעת TTL של 72 שעות להזמנת צוות, ורק הזמנה אחת פעילה לאותו יעד; הזמנה חדשה מותרת לאחר מצב סופי.

5.2 D02 קובעת OpenAI Responses API מאחורי Adapter ו־AI שמציע טיוטה בלבד. לפי [קטלוג המודלים הרשמי](https://developers.openai.com/api/docs/models) ו־[Model guidance הרשמי](https://developers.openai.com/api/docs/guides/latest-model), שנבדקו ב־26.08.2026, ‏`gpt-5.6-terra` הוא Candidate ראשי לשיחה, ‏`gpt-5.6-sol` הוא Escalation מוגבל למשימות מורכבות, ו־`gpt-5.6-luna` מותר רק למשימה צרה ובנפח גבוה לאחר Eval שמוכיח כי הוא עומד בכל ספי האיכות והבטיחות. אין Model promotion רק מטעמי מחיר, Alias דינמי או שיקול Latency יחיד.

5.2.1 D02-A1 מבטלת תלות תפעולית ב־OpenAI Hosted Evals: Evaluation נשמר ומורץ ב־Harness וב־CI שבבעלות Connect. תיעוד OpenAI הרשמי שנפתח ב־26.08.2026 מציין שה־Evals platform נמצאת ב־Deprecation, תהפוך ל־Read-only למשתמשים קיימים ב־31.10.2026 ומתוכננת להיסגר ב־30.11.2026. לכן אין ליצור תלות חדשה בשירות, ואין לייחס לו זמינות מעבר ל־Timeline הרשמי. ההחלטה נתמכת גם ב־Portability, ‏Retention, ‏Deletion ו־Evidence ownership. כלי צד שלישי, לרבות Promptfoo, הוא Implementation candidate בלבד לאחר License, SBOM, Lockfile, Network, Secret ו־Supply-chain review; הוא אינו Requirement, מקור סמכות או Candidate מועדף מראש.

5.2.2 D02-A2 מוסיפה תנאי חוסם ב־Gate 18.1, וגם ב־Gate 18.2 כאשר Knowledge/RAG/File pipeline נמצא ב־Scope, וב־X07 בעקבות WhatsApp Business Solution Terms מ־06.03.2026: Connect אינו מושק כ־AI Provider שבו AI הוא הפונקציונליות הראשית עבור מספרים ישראליים. ה־AI נשאר יכולת מסייעת ונלווית למערכת שירות/תקשורת עסקית, ורק לאחר Legal+Meta classification מתועד. אם Meta או Legal אינם מאשרים את הסיווג, כל AI שניגש ל־Business Solution Data נשאר כבוי וה־Pilot עובד ב־Human-only mode.

5.2.3 OpenAI מוגדר Third Party Service Provider הפועל רק בשם הלקוח ובהוראותיו, בכפוף להסכם כתוב מתאים. אסור להשתמש ב־Business Solution Data, לרבות מידע anonymous, aggregate או derived, כדי ליצור, לפתח, לאמן או לשפר מודל AI שאינו בלעדי ללקוח; Eval, Fine-tuning, Analytics ו־Prompt improvement אינם מקבלים פטור אוטומטי.

5.2.4 D02-A3 קובעת Model routing דטרמיניסטי ורשום: Terra מטפל במסלול השיח המאושר; Sol מקבל רק קטגוריות Escalation מוגדרות מראש עם Cost/latency budget ו־Human review; Luna אינו מקבל שיחה חופשית או פעולה רגישה עד Eval נפרד. Alias, Changelog או SDK default אינם משנים Routing חי.

5.3 כל בקשת OpenAI תשתמש ב־`store:false`, מזעור מידע ו־Safety identifier מושחר. מצב זה אינו יוצג כ־ZDR בלי אישור OpenAI ו־Evidence של הגדרת החשבון.

5.3.1 `store:false` מונע את שמירת ה־Response application state הרגילה בת 30 הימים, אך אינו לבדו מבטל Abuse-monitoring retention, Prompt cache, ‏Safety Retention או Retention של שירות צד שלישי. לפי [Data controls הרשמיים](https://developers.openai.com/api/docs/guides/your-data), ללא ZDR מאושר תוכן ב־Abuse-monitoring logs עשוי להישמר עד 30 יום, ו־Prompt caching עשוי לשמור application state מוצפן עד 24 שעות; במסמכי Responses ל־GPT-5.6, ‏`prompt_cache_options.ttl` ברירת המחדל היא 30 דקות אך זהו Minimum cache lifetime ולא Maximum-retention control. התיעוד הרשמי גם מציין שכאשר ZDR אינו מופעל, שאילתות נתמכות משתמשות ב־extended prompt caching. לכן Connect אינה מציגה TTL של 30 דקות כמחיקה או כ־ZDR: היא מקבעת Mode/TTL מפורשים בפרופיל, בודקת את ה־Request/Response ואת הגדרת החשבון החיים, ומתעדת את הגבול ב־DPIA, ‏DPA, ‏Privacy notice ו־Deletion limitations; ללא ראיה זו AI-off.

5.3.2 OpenAI Assistants API ו־Threads אסורים בכל סביבת Connect ואינם יעד Migration: לפי [דף ה־Deprecations הרשמי של OpenAI](https://developers.openai.com/api/docs/deprecations), ה־API הוסר ב־26.08.2026 והחלופה הרשמית היא Responses API ו־Conversations API. Connect בוחרת ב־Responses API במצב Foreground בלבד; עצם היות Conversations חלופה רשמית אינו מאשר אותו למוצר.

5.3.3 `/v1/conversations`, ‏OpenAI Files, Vector stores, hosted tools, background mode, Remote MCP/tools וצדדים שלישיים אינם מקבלים אישור אוטומטי מכך ש־Responses foreground משתמש ב־`store:false`. ב־Pilot הם חסומים אלא אם Capability-specific data-flow, retention, deletion, legal ו־security review נסגרו. Hosted Evals אינו מועמד להפעלה חדשה כלל עקב ה־Deprecation הרשמי; ברירת המחדל והמסלול הקנוני הם State, Corpus ו־Eval harness בבעלות Connect.

5.3.4 לפי [Model guidance](https://developers.openai.com/api/docs/guides/latest-model) ו־[Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices) הרשמיים של OpenAI, מוצר המשרת משתמשי קצה יחידים שולח `safety_identifier` יציב ושומר־פרטיות בכל בקשה. OpenAI מציגה Hash של Username או Email כאפשרות להסרת מידע מזהה; Connect מחמירה מעבר לדוגמה זו משום ש־Email וטלפון הם מזהים בעלי מרחב חיפוש קטן ו־Hash לא־ממופתח ניתן לקישור ולניחוש. לכן Profile מאושר בלבד רשאי להפיק ערך Keyed, ממוסגר, Versioned ומופרד לפי Environment, Tenant ו־Purpose; אין לשלוח Raw PII, Tenant name, Internal user ID גלוי או Digest לא־ממופתח. זהו Control של Abuse attribution, לא Authentication, Authorization, Consent או Tenant isolation.

5.3.5 `safety_identifier` יציב רק בתוך Scope ו־Profile revision מאושרים. Rotation מקבעת `keyVersion`, תקופת חפיפה מבוקרת ומיפוי Reindex/incident; היא אינה מערבבת ערכי גרסה ישנה וחדשה באותה סמכות. ה־Request evidence שומר רק Boolean שנשלח, Profile digest, Key version ו־Derivation outcome מושחר — לעולם לא את הערך עצמו. Profile, Key, Version, Domain separation או Provider contract במצב `unknown/unavailable` משאירים את AI כבוי. אם בעתיד יופעל API או Session נוסף, המזהה נשלח בו במפורש מחדש; אין להניח שהוא עובר אוטומטית בין APIs או Sessions.

5.4 Dataset של Eval יכיל רק אחד מארבעת מקורות הראיה המאושרים: Artifact אמיתי וממוזער שאושר והושחר; Artifact רשמי של Sandbox ספק או Store; Vector נורמטיבי מתקן רשמי; או Attack literal דטרמיניסטי שאינו מידע עסקי. Placeholder, fake, demo, mock או synthetic business data אינם ראיית מוכנות. אסור להעלות מספרי טלפון, Tenant IDs, Secrets או שיחות לקוח גולמיות.

5.5 D03 קובעת Pilot ידני או חינמי ללא Checkout ועם `activeProvider=none`. לאחר Pilot, PayPlus הוא primary-discovery candidate ו־Tranzila הוא alternate; Paddle נשאר Dormant אלא אם מתקבל אישור Eligibility כתוב ל־WhatsApp use case, ו־Stripe נשאר Dormant כל עוד Business location ישראלי אינו נתמך. Ports מרובים מותרים לצורכי Contract בלבד; Provider חי יחיד בלבד לאחר Legal, Finance, Tax, PCI, Procurement ו־live proof.

5.6 D04 קובעת Rate limiting רב־שכבתי הנגזר ממצב Meta חי. אין להקשיח במסד ערך Meta שאינו פומבי או שלא נמדד בחשבון מורשה.

5.6.1 ערכי Meta הרשמיים שפורסמו ב־2026 נשמרים כ־Published ceilings בלבד. לפני Live asset probe הקיבולת היא אפס; לאחריו Permit הוא המינימום בין Portfolio, Phone, Pair, Quality, Template, Consent/Suppression, Window, Geography, Cost, Connect policy, Queue ו־DB. טל מאשר את Connect rate policy המדויק, אך אינו בעל הסמכות המשפטית או התפעולית של Meta.

5.6.2 Connect אינו מנצל Pair burst בכוונה. Retry policy נקבעת לכל Error code, bounded ו־durable; ‏Stagger מחושב דטרמיניסטית מ־HMAC של Scope אמיתי. ‏Unknown code, stale capability, quality downgrade, Template hold/pause, opt-out או Terms drift מפעילים Hold/kill switch ולא Blind retry.

5.7 D05 קובעת GuardDuty Malware Protection for S3 ב־`il-central-1`, עם VersionId+checksum binding ו־EventBridge/DLQ/Reconciliation. אם השירות, החשבון, Region, IAM/KMS, Opt-out, Budget או Evidence אינם מוכנים, Knowledge uploads נשארים כבויים.

5.7.1 התיעוד הרשמי מאמת זמינות מוצרית אזורית, אך אינו Live entitlement לחשבון. GuardDuty סורק כל Object version חדש ומפרסם תוצאות At-least-once שעלולות להגיע כפולות או מחוץ לסדר. רק Verdict סופי עבור אותו Account+Region+Plan+Bucket+Key+VersionId+Checksum יכול לשנות מצב; Tag, ETag, Key name או `NO_THREATS_FOUND` של גרסה אחרת אינם סמכות.

5.7.2 `NO_THREATS_FOUND` הוא סריקת Malware מבוססת קובץ ואינו אישור שפורמט, OOXML, תוכן פעיל, קשר חיצוני, Parser behavior או RAG content בטוחים. Validation מבני, Parser sandbox, Resource budgets, Egress deny ו־RAG poisoning controls נשארים Gates עצמאיים.

5.8 D06 מגבילה Upload ל־10 MiB ול־PDF, TXT ו־DOCX בלבד. Extension, MIME ו־Magic bytes חייבים להסכים; DOCX מותר רק כ־OOXML ZIP container מאומת. קובץ מוצפן, Macro/DOCM, Generic או nested archive, embedded object, external relationship, Polyglot או תוכן פעיל נחסם.

5.9 D07 קובעת Scan timeout של 15 דקות ועד שלושה ניסיונות. לאחר מכן אין שחרור אוטומטי; עוברים ל־Manual review או מחיקה לפי Policy.

5.10 D08 קובעת Backup יומי, שמירה ל־90 יום, PITR ותרגיל Restore חודשי. כל Restore חייב להיות קשור ל־backupId, Consistency point ול־Digests המדויקים. Closed Pilot משתמש ב־Gate 23.1 לאחר Restore מבודד; Claim ל־90 יום ול־Ransomware protection דורש Gate 23.2 לאחר Cohort אמיתי בן 90 יום ועותק WORM.

5.11 D09 קובעת Better Stack עם OpenTelemetry. Telemetry חייב להיות מושחר, בעל Schema יציב, Cost cap ו־Retention מאושר.

5.12 D10 קובעת On-call בשעות פעילות ב־Pilot עם הסלמה. השעות, Primary, Backup, ערוצים וספי תגובה נשארים משימה אנושית חובה.

5.13 D11 קובעת Retention Policy v2 ו־Legal Hold, בכפוף ל־Legal review. Adapter מחיקה נשאר מנותק עד אישור.

5.14 D12 קובעת Railway PostgreSQL ל־Pilot; D31 מוסיפה Principals נפרדים ל־Migration owner, Migrator login, API, Worker ו־Verifier.

5.15 D13 קובעת Railway Redis ו־BullMQ. Redis הוא Queue/Delay/Backpressure בלבד ואינו מקור האמת העסקי. Payload של Job לא יכיל PII.

5.16 D14 קובעת AWS S3 פרטי ב־`il-central-1`, עם Buckets נפרדים ל־Quarantine, Clean knowledge ו־Backup/Evidence.

5.17 D14-A1 היא החלטת תיקון אבטחה שנכנסת לתוקף עם אישור Master Plan זה ומחליפה את ברירת SSE-S3 במסמך ההחלטות הקודם: Knowledge, Quarantine ו־Backup/Evidence ישתמשו ב־SSE-KMS עם Customer managed key נפרד לכל סביבה ולכל קבוצת רגישות, S3 Bucket Keys, Bucket policy הדוחה כתיבה ללא Key הנכון, Rotation, Key policy, Cost/Quota monitoring ו־Break-glass. Objects קיימים אינם נחשבים מוסבים רק משינוי Default encryption ודורשים Inventory ו־Re-encryption מוכחים. עד השלמת Owner ו־Evidence ה־Uploads וה־Backup claim נשארים כבויים.

5.18 לפני GuardDuty יופעל AWS Organizations AI services opt-out עבור `guardduty` ברמת Root ותישמר ראיה של ה־Effective policy. אין לאפשר שימוש בדגימות זדוניות לשיפור שירות ללא החלטה מפורשת.

5.19 D15 קובעת Platform vaults עם Primary ו־Backup שמיים, Inventory, Rotation ו־Break-glass.

5.20 D16 קובעת Production ו־Staging נפרדים, כולל חשבונות, Secrets, DB, Redis, Buckets, Domains ו־Meta assets נפרדים ככל שניתן.

5.21 D17 קובעת Clerk Organizations ללא Personal account במסלול המוצר. D17-A1 מחייבת MFA לכל משתמש אנושי ב־Closed pilot; לאחר Pilot ‏Owner, Admin, Support ו־System Admin נשארים מחויבים תמיד, וכל הקלה ל־Agent/Viewer דורשת Risk decision, Step-up לפעולה רגישה ו־Evidence חי.

5.22 D18 קובעת Repo פרטי, Branch protection ו־Required checks, ולאחר התייצבות מעבר ל־GitHub Organization.

5.23 D19 קובעת Primary ו־Backup שמיים לכל תחום, עם Accountable, Approver, Escalation ו־Offboarding. עד הזנת השמות Gate 3 נשאר חסום.

5.24 D20 קובעת Test WABA תחילה; Pilot עם נכסי האב מותר רק באישור כתוב, הרשאות מזעריות ותוכנית ביטול גישה.

5.24.1 ‏Cloud API בלבד הוא מסלול ה־Pilot. ‏Marketing Messages API ו־Meta Business Suite Inbox נשארים כבויים ונפרדים; אין להם Secret, Endpoint, Queue, Schema, Subscription או UI claim פעילים.

5.24.2 Connect אינה טוענת להיות Tech Provider, ‏Solution Provider, Partner או Service Provider מורשה. Multi-client onboarding מחייב Meta authorization כתוב, Legal role memo, Terms acceptance, WABA/Messaging Account ownership, Client exit/transfer ו־Provider evidence. חוזי 23.09.2026 מחייבים Delta Gate מתוארך לפני Pilot שחוצה את מועד התחולה.

5.25 D21 קובעת Closed Pilot עם Tenant יחיד ו־Stop conditions קשיחים.

5.26 D22 קובעת ICP של SMB ישיר בישראל ועברית תחילה.

5.27 D23 קובעת Plan ידני יחיד ב־Pilot. מחיר, מטבע, Quotas ו־Overage אינם ניחוש טכני ודורשים Product ו־Finance.

5.28 D24 דוחה Recurring campaigns לאחר Pilot.

5.29 D25 קובעת `agent-approval-only`: AI אינו שולח, מחייב, מוחק, משנה הרשאות או מפעיל Campaign ללא אישור אדם תקף.

5.30 D26 קובעת Israel-first ו־Legal review לפני Privacy, DPA, Residency, Terms, Export ו־Deletion claims.

5.31 D27 קובעת Staged rollout, Canary, Kill switch ו־Rollback מתורגל.

5.32 D28 קובעת Cost cap נפרד לכל ספק ו־Kill switch תפעולי במקרה חריגה.

5.33 D29 קובעת Roadmap לפי Evidence מה־Pilot, לא לפי רשימת Features של מתחרה.

5.34 D30 קובעת Enterprise, Integrations, PWA ו־Native mobile רק לאחר ביקוש משלם וספי יציאה. ב־Pilot וב־GA הראשונה משתמשים ב־React Web responsive בלבד; ‏Service Worker, ‏Installability, ‏Offline cache, ‏Background sync ו־Web push נשארים חסומים עד חבילת PWA מותנית. החבילה משתמשת בחמישה Gates עצמאיים 28.3.1–28.3.5, כך שאישור Installability אינו מאשר Worker/Cache, Offline data, Push/Notification או Background sync. ‏Background Sync נשאר Research-only ו־disabled משום ש־FR-074 הוא WICG Draft שאינו W3C Standard, עד ש־DS-025 מוכיחה תמיכה חיה במטריצת Browser/OS מאושרת.

## 6. שלב 1 — השלמת מקור אמת ו־Inventory

6.1 מטרת השלב היא לדעת בדיוק מה קיים, מה נבדק, מה רדום, מה השתנה ומי מוסמך לאשרו.

6.2 זמן משוער לשלב הוא 14–26 שעות עבודה נטו.

6.3 תלות השלב היא הקפאת הפיתוח מסעיף 1.

6.4 בעלים נדרש הוא Lead engineering; Reviewer נפרד נדרש לכל Slice רגיש.

6.5 משימת Inventory מלאה.

6.5.1 להפיק רשימת כל הנתיבים לפי `tracked modified`, `untracked`, `staged` ו־`ignored`.

6.5.2 לסווג כל נתיב לפי Domain, מקור שינוי, Commit יעד, רמת סיכון ובעל Review.

6.5.3 לזהות קבצים שנוצרו בידי Grok או כלי אחר ולבדוק Diff מול ה־Base כדי להפריד תועלת מנזק.

6.5.4 לזהות קבצים כפולים, מסמכי סטטוס סותרים, Dead code, Runtime importers ו־Migrations שלא שויכו ל־Release.

6.5.5 תנאי קבלה הוא Inventory ללא נתיב לא־מסווג ועם סכומים התואמים ל־Git status.

6.5.6 Evidence הוא קובץ Inventory מתוארך, Digest שלו ופלט Git מושחר.

6.5.7 Rollback אינו נדרש משום שהפעולה Read-only; כל תיקון שיתגלה יעבור ל־Slice נפרד.

6.6 משימת Source-of-truth.

6.6.1 למפות את שני האפיונים, שלושים החלטות השאלון D01–D30, ‏D31 כהחלטה טכנית משלימה, כל ADR, Registry, Runbook ו־Migration אל Requirement IDs קנוניים.

6.6.2 לסמן לכל דרישה `implemented`, `tested-local`, `tested-live`, `external-approved` ו־`ready` בנפרד.

6.6.3 לבטל אחוזים ישנים שמערבבים קוד, Pilot ו־Best-in-class.

6.6.4 תנאי קבלה הוא שלכל דרישה יש מקור, מצב, Evidence ופער סגירה יחיד.

6.7 משימת Conflict resolution.

6.7.1 כאשר שני מסמכים סותרים, לבחור לפי הסדר: החלטה חדשה מאושרת, Evidence חי חדש, קוד ב־HEAD, מסמך היסטורי.

6.7.2 לתעד כל הכרעה ולא למחוק Evidence היסטורי.

6.7.3 תנאי קבלה הוא אפס סתירות לא־מוסברות במטריצת העקיבות.

6.8 Gate 1 נסגר רק לאחר Inventory מלא, מטריצת עקיבות מלאה וביקורת עצמאית של אדם נוסף.

6.9 תנאי הקבלה לשלב הוא Gate 1. Evidence מצטבר הוא Inventory, Traceability, Conflict decisions ו־Digests; Rollback הוא ביטול Baseline שגוי ויצירת גרסה חדשה בלי מחיקת הקוד או הראיות שנבדקו.

## 7. שלב 2 — הגנת Git, GitHub ושרשרת האספקה

7.1 מטרת השלב היא להבטיח שכל שינוי ניתן לשחזור, Review, אימות וייחוס בלי לחשוף Secrets.

7.2 אומדן ROM מתוקן לשלב הוא 64–122 שעות אדם, לא כולל המתנת ספק, רכש או Review. האומדן יוחלף בסכום Bottom-up סופי של רשומות Task Registry לפני Gate 29; אסור להשתמש באומדן הישן 28–52 שעות לצורך התחייבות.

7.3 תלות השלב היא Gate 29 המאשר הסרת Freeze וגם Gate 1 המאשר Baseline/Inventory. תכנון Read-only מותר לפני כן; כל שינוי Repository או GitHub אסור עד ששניהם נסגרו.

7.3.1 הבעלים הנדרש הוא Platform/DevSecOps lead; Engineering, Security ו־Repository owner הם Reviewers מחייבים, ולפעולת Break-glass נדרש מאשר אנושי נפרד.

7.4 משימת Branch governance.

7.4.1 לאמת מחדש שה־Repository פרטי, את ברירת המחדל, Collaborators, Roles ו־2FA.

7.4.2 ליצור Ruleset עבור `main` המחייב Pull Request, ביטול Approvals ישנים לאחר Push ו־Conversation resolution. שינוי רגיל דורש Reviewer עצמאי אחד לפחות; שינוי רגיש ב־Auth, Tenant, Billing, Meta, DB, Migrations, CI, Secrets, AI, Retention, Backup או Release דורש שני Reviewers עצמאיים, ובכללם CODEOWNER של התחום.

7.4.3 לחייב Required checks עבור Build, TypeScript, ESLint, Unit, Integration, Source Guard, Secret scan, Migration lint ו־Security scan.

7.4.4 לחסום Force push, Branch deletion ו־Direct push, תוך שמירת Break-glass מתועד לבעלים שמי אחד ו־Backup.

7.4.5 להגדיר CODEOWNERS עבור Auth, Tenant, Billing, Meta, DB, Migrations, CI, Secrets, AI, Retention ו־Release.

7.4.6 להגדיר Owner גם לקובץ CODEOWNERS עצמו ול־Workflow files.

7.4.7 תנאי קבלה הוא ניסיון Direct push שנחסם, Self-approval שנכשל, PR רגיש עם Reviewer יחיד שנחסם ו־PR ניסוי שאינו ניתן למיזוג בלי כל הבדיקות וה־Reviewers הנדרשים.

7.4.8 Evidence הוא Export/צילום הגדרות, קישור ל־PR ניסוי ו־Audit log.

7.4.9 Rollback הוא Ruleset קודם ששמור כ־JSON או תיעוד מלא, עם אישור שני אנשים לפני החלשה.

7.5 משימת Commit isolation.

7.5.1 לחלק את ה־Worktree ל־Slices קטנים לפי Domain ותלות.

7.5.2 לכל Slice לבצע Diff מול Base, סריקת Secret, בדיקות ממוקדות, `git diff --check`, Build לפי סיכון ו־Review.

7.5.3 לא להכניס קובץ שמשלב שני Domains אם ניתן לפצלו בבטחה; אם לא, לתעד תלות ולבצע Review משותף.

7.5.4 לא לבצע Rebase, Reset או מחיקה רחבה עד שכל השינויים משויכים ומגובים.

7.5.5 תנאי קבלה הוא Worktree נקי, היסטוריה אטומית ויכולת לשחזר כל Slice בנפרד.

7.6 משימת Secrets.

7.6.1 לסרוק Worktree, Staged files וכל היסטוריית Git באמצעות שני מנועים בלתי תלויים.

7.6.2 לבנות Inventory של Secret names בלבד, ללא ערכים, עם Owner, Consumer, Scope, Rotation, Expiry ו־Revocation path.

7.6.3 להחליף Long-lived CI secrets ב־OIDC או Workload identity כאשר הספק תומך.

7.6.4 להבטיח ש־Fork, Preview ו־Pull Request ממקור לא־מהימן אינם מקבלים Production secrets.

7.6.5 להוסיף Canary secret מבוקר רק אם Security מאשר, כדי לבדוק Alert ו־Revocation בלי להשתמש ב־Credential אמיתי.

7.6.6 תנאי קבלה הוא אפס Secret מאומת בקוד, Rotation מתועד לכל Secret קיים וניסוי Revocation שעובר.

7.7 משימת Dependency security.

7.7.1 לטפל בהתראת Dependabot הקיימת ב־PR נפרד, לקרוא Changelog ו־Advisory ולבדוק Breaking changes.

7.7.2 להפעיל Dependabot alerts, Security updates, CodeQL ו־Secret scanning רק לאחר Capability probe מתועד של GitHub Plan. יכולת שאינה זמינה מקבלת חלופה מאושרת או נשארת Blocked; אסור לסמן אותה Ready מכוח התכנון בלבד.

7.7.3 לנעול Package manager ו־Lockfile, לחסום Install scripts לא־נחוצים ולבדוק Typosquatting.

7.7.4 להפיק לכל Artifact ‏SBOM קנוני בפורמט CycloneDX ‏1.7 JSON, עם Tool version, Lockfile digest, Commit, Build identity ו־Artifact digest. אם Consumer מחייב SPDX, להפיק בנוסף SPDX ‏3.0.1 בלי להחליף את ה־CycloneDX הקנוני. תנאי הקבלה הוא שה־SBOM ניתן לאימות מחדש מתוך Clean checkout ושאין Component Runtime חסר או Component שלא שייך ל־Artifact.

7.7.5 להצמיד GitHub Actions ל־Commit SHA מלא ולתעד כלי עדכון מבוקר.

7.7.6 להפריד בין SLSA Source Track לבין Build Track בגרסה 1.2 ולא לטעון לרמת SLSA כוללת אחת בלי Evidence לכל Track.

7.7.6.1 לבצע Capability probe לחשבון ול־Repository הפרטי. אם GitHub Artifact Attestations פרטיות זמינות ומאושרות בחשבון GitHub Enterprise Cloud, להשתמש בהן ולתעד את מגבלותיהן; זמינות ב־UI או בתיעוד אינה Evidence להפעלה בחשבון.

7.7.6.2 אם היכולת אינה זמינה, הנתיב הקנוני הוא GitHub OIDC אל AWS Role מצומצם, חתימה א־סימטרית ב־AWS KMS באמצעות Cosign או כלי שקול שאושר, אימות Policy לפני Deployment ושמירת Rekor/transparency evidence רק אם מדיניות הפרטיות מאשרת חשיפה ציבורית. אסור להכניס מפתח חתימה פרטי ל־GitHub Secret.

7.7.6.3 Attestation אינו מוכיח שה־Artifact בטוח; הוא קושר Digest למקור, Workflow, Environment, Commit ואירוע. Promotion verifier מאמת את ה־Bundle בפועל ומחיל Policy על Repository/Owner/Commit/Workflow/Environment/Builder/SBOM, ואז מפעיל בנפרד Tests, Vulnerability gates ו־Approval. Attestation שלא אומתה או שנמחקה/פגה משאירה את ה־Artifact בלתי־כשיר.

7.7.6.4 Private/internal GitHub Artifact Attestations דורשות לפי התיעוד GitHub Enterprise Cloud. אם Entitlement חי חסר, אין “Attestation checkbox” חלופי: מופעל נתיב KMS המאושר, וגם הוא דורש Offline verifier, Key lifecycle, Rotation, Revocation, retained public material ו־rollback artifact. מעבר בין המסלולים הוא ADR+Migration ולא Fallback שקט.

7.7.6.5 Target ראשוני הוא SLSA Build Level 2 לפחות. Level 3 מותר לטעון רק אם Build platform, reusable workflow boundary, isolation, provenance generation ו־non-falsifiability עברו אימות עצמאי לפי SLSA ‏1.2. “GitHub Actions הופעל” אינו הוכחת Level 3.

7.7.6.6 Verifier ב־Deployment חייב לקשור Repository, Organization, ref, Commit SHA, Workflow identity, Builder identity, Environment, Artifact digest ו־SBOM digest. החלפת Byte יחיד, Repository, Workflow, ref, Environment או signer חייבת להיכשל לפני Runtime activation.

7.7.7 תנאי קבלה הוא Build שניתן לקשור ל־Commit, Workflow, Builder, SBOM, Provenance, Signature ו־Deployment authorization, ואשר נכשל על Artifact לא־מאומת, Attestation תקינה של Repository אחר, Signature של Environment אחר או Provenance חסרה.

7.7.8 חבילת `P0-NEXT-2026-08-25` היא ה־PR הראשון לאחר Gates 29 ו־1. היא מקבעת `next` ו־`eslint-config-next` ל־`16.3.3` לפחות, או לגרסה מתוקנת חדשה יותר שאושרה בזמן הביצוע, מעדכנת Lockfile מתוך התקנה נקייה ובודקת שאין `next` פגיע נוסף בגרף התלויות. זהו Parent ללא שעות; השעות נספרות רק בחמשת העלים 7.7.8.1–7.7.8.5.

7.7.8.1 לפני שינוי יש לשמור Dependency tree, Lockfile digest, ‏`CVE-2026-75604`, ‏`GHSA-p293-qw3h-jr36`, ‏`GHSA-2xp9-vwfh-vxw4`, ‏Node/npm versions, שני נתיבי Build ו־`next.config.ts` snapshot. אומדן עלה: 2–3 שעות.

7.7.8.2 לאחר שינוי יש להריץ Clean install, ‏`npm ls next sharp`, שני Builds הנתמכים בפרויקט, TypeScript, ESLint, כל הבדיקות, Source/secret guards ו־Dependency audit. הצלחת Build בלבד אינה מספיקה. אומדן עלה: 4–6 שעות.

7.7.8.3 לבצע Negative/reachability review ל־Windows-hosted Next server ול־Image Optimization/AVIF, לרבות Route/asset inventory, configuration, transitive `sharp/libheif` evidence ו־Vercel runtime behavior. התוצאה מתעדת חשיפה אך אינה פוטרת מהשדרוג. אומדן עלה: 3–5 שעות.

7.7.8.4 תנאי הקבלה הוא אפס `next` בגרסה מושפעת, שני Build artifacts מאומתים, Regression suite ירוקה, Advisory evidence ו־Preview/Staging smoke רק לאחר Gate הסביבה המתאים. אומדן איסוף ואימות Evidence: 2–3 שעות.

7.7.8.5 Rollback מותר רק ל־Artifact קודם שכבר מכיל גרסה מתוקנת. אם אין כזה, היכולת נשארת כבויה; אסור לחזור ל־`16.3.0` לצורך זמינות. אומדן תכנון ותרגול Rollback: 2–3 שעות.

7.7.9 להוסיף Security-release watch שבועי ל־Next.js ולתלויות Runtime קריטיות, עם SLA של 24 שעות ל־Triage של Critical ו־72 שעות ל־High, כאשר Exploitable Critical או CISA KEV רלוונטי חוסמים Build/Deploy מיד.

7.7.10 לבצע GitHub Actions threat review נפרד: לחסום Checkout של קוד לא־מהימן תחת `pull_request_target`, Expression injection לתוך Shell, שימוש ב־mutable tag, הרשאות `write` שאינן נדרשות, Cache/Artifact poisoning בין Trust levels, Download של Artifact ללא Digest, Command injection דרך Branch/PR metadata ו־Secrets בתוך Log. לכל תרחיש נדרש Workflow test שלילי ו־Evidence של Permissions בפועל.

7.7.11 לבנות Secure Development Lifecycle לפי NIST SSDF ו־OWASP SAMM: Training לפי תפקיד, Definition of Done ביטחוני, Design review, Code review, Test, Dependency response, Exception expiry ו־Quarterly maturity review. מסמך Policy לבדו אינו קבלה; נדרשת דגימת PR שמוכיחה שה־Workflow נאכף.

7.7.12 להקים VDP/PSIRT לפני Pilot חיצוני: `/.well-known/security.txt` לפי RFC 9116, כתובת דיווח מנוטרת, Scope, Safe-harbor שאושר משפטית, SLA ל־Acknowledgement/Triage, מסלול Escalation, מדיניות Disclosure ו־Runbook לטיפול ב־Report זדוני או בקובץ מצורף. בדיקת קבלה כוללת Report מבוקר מקצה לקצה בלי לפרסם כתובת אישית.

7.8 Gate 2 נסגר רק לאחר Worktree נקי, Ruleset פעיל, CI מחייב, Secret inventory, SBOM ו־Attestation מוכחים.

7.9 תנאי הקבלה לשלב הוא Gate 2. Evidence מצטבר הוא Git/GitHub exports, PR denial, CI, Secret/SBOM/attestation ו־clean-checkout report; Rollback הוא החזרת Ruleset/Workflow/Dependency version מאומתת בלי להחליש את ה־Gate.

## 8. שלב 3 — Governance, RACI, חשבונות ותקציבים

8.1 מטרת השלב היא למנוע מצב שבו קוד מוכן אך אין אדם מוסמך, הרשאה, תקציב או אחריות בזמן תקלה.

8.2 זמן משוער לשלב הוא 18–36 שעות עבודה נטו, בתוספת זמן פתיחת חשבונות ואישורי ספקים שאינו ידוע.

8.3 תלות השלב היא Gate 1; חלק מהעבודה יכול לרוץ במקביל לשלב 2.

8.3.1 הבעלים הנדרש הוא Technical program lead; Product accountable להחלטות Scope, Finance/Legal מאשרים התחייבויות ו־Security מאשר מודל גישה. שמות Primary ו־Backup נסגרים ב־X02 וב־X10 לפני Gate 3.

8.4 משימת RACI.

8.4.1 למנות Primary ו־Backup שמיים עבור Product, Backend, Frontend, Database, Deployment, Meta, Rate limits, Security, Privacy, Legal, Billing, Finance, On-call ו־Go/No-Go.

8.4.2 טל נשאר Owner של מחקר ופיתוח WhatsApp/Meta rate limits ושל מדיניות Connect rate limiting.

8.4.3 ראשה נשארת מועמדת ל־Deployment owner רק לאחר אישור הרשאות ואחריות כתובה.

8.4.4 דוד נשאר מועמד ל־Meta/API integration רק לאחר הגדרת Deliverable, Review ו־Credential policy.

8.4.5 רועי נשאר Owner לפתיחת חשבונות ורכש רק לאחר אישור ישות משפטית, Budget ו־2FA.

8.4.6 לכל תחום להגדיר מי מבצע, מי מאשר, עם מי מתייעצים ומי מקבל עדכון.

8.4.7 תנאי קבלה הוא שאין מערכת חיה, Secret או Runbook בלי Primary ו־Backup.

8.5 משימת Account security.

8.5.1 לפתוח חשבונות חברה נפרדים ב־GitHub, Railway, Vercel, Clerk, AWS, Better Stack, OpenAI, Meta, SES וה־PSP שנבחר בפועל רק בשם הישות המאושרת. PayPlus/Tranzila הם Discovery candidates; Paddle/Stripe אינם ברירת מחדל לרכש.

8.5.2 לא להשתמש ב־AnyDesk או חשבון אישי כנתיב Production קבוע. גישה מרחוק מותרת רק לתמיכה זמנית, באישור, עם MFA, Audit ו־Session timeout.

8.5.3 לחייב MFA לכל בעל הרשאה; Admin יעדיף Passkey או TOTP, עם Recovery codes בכספת נפרדת.

8.5.4 לא לשתף Token בצ'אט. להוסיף Members עם Role מזערי או להשתמש ב־Vault/Scoped token.

8.5.5 לבצע Quarterly access review וביטול גישה מיידי בעת עזיבה.

8.5.6 תנאי קבלה הוא Access matrix מאושרת, MFA evidence ו־Offboarding rehearsal.

8.6 משימת Budgets.

8.6.1 להגדיר תקרה חודשית ומטבע לכל ספק, Alert ב־50%, 75%, 90% ו־100%, ו־Kill switch שאינו מוחק מידע.

8.6.2 להפריד Budget ל־Staging ול־Production.

8.6.3 להגדיר מי רשאי להעלות תקרה ומי מאשר חריגה.

8.6.4 לא להקשיח מחירי ספק בקוד; לקרוא אותם מתצורת Product מאושרת ולתעד תאריך בדיקה.

8.6.5 תנאי קבלה הוא Alert rehearsal ו־Cost report שמקשר עלות ל־Tenant, Feature וספק בלי PII.

8.7 Gate 3 נסגר רק לאחר RACI שמי, חשבונות מאובטחים, הרשאות מזעריות, Budget caps ו־Break-glass ראשוני.

8.8 תנאי הקבלה לשלב הוא Gate 3. Evidence מצטבר הוא RACI, account/access matrix, MFA, budget alerts ו־break-glass drill; Rollback הוא השעיית חשבון/גישה/ספק שלא הוכחו וחזרה למסלול Local read-only, לא שיתוף Credential.

## 9. שלב 4 — ארכיטקטורת יעד וגבולות אמון

9.1 מטרת השלב היא לקבוע מבנה אחד שבו כל רכיב, זרימת מידע, בעל סמכות וגבול אמון ידועים לפני שמחברים Runtime חי.

9.2 זמן משוער לשלב הוא 24–40 שעות עבודה נטו.

9.3 תלות השלב היא Gate 1 וטיוטת RACI מסעיף 8; אפשר לבצעו במקביל לחלק משלב 2.

9.4 הבעלים הנדרש הוא Lead architecture, עם Review נפרד של Security, Privacy, Database ו־Deployment.

9.5 משימת Context architecture.

9.5.1 לתעד את המשתמשים, צוות הלקוח, System Admin, Meta, Clerk, OpenAI, AWS, Railway, Vercel, Better Stack, SES, PayPlus, Tranzila, Paddle ו־Stripe כמערכות או שחקנים נפרדים; עצם הופעת ספק ב־Inventory אינה אישור להפעלה.

9.5.2 להגדיר React UI יחד עם Vercel server-side BFF כגבול Browser יחיד. ה־BFF מאמת Clerk session ומצרף Workload identity נפרדת ל־Railway; Railway API הוא הגבול העסקי הסינכרוני ואינו Origin ישיר ל־Browser, Railway Worker מבצע עבודות אסינכרוניות, PostgreSQL הוא מקור האמת ו־Redis/BullMQ הוא Queue שאפשר לבנות מחדש.

9.5.3 להגדיר S3 Quarantine כיעד Upload שאינו קריא למוצר, S3 Clean knowledge כיעד של חומר שאושר, ו־S3 Backup/Evidence כתחום נפרד עם הרשאות ושמירה אחרות.

9.5.4 להגדיר שכל ספק חיצוני הוא Trust boundary גם כאשר החיבור מוצפן וגם כאשר הספק מצהיר על Compliance.

9.5.5 לתעד את התרשים הבא ולשמור גרסה נגזרת מהמפרט, לא מצילום ידני בלבד.

```text
Browser לא מהימן
  → Vercel React UI
  → Vercel server-side BFF
  → Railway API
      → PostgreSQL מקור אמת
      → Redis/BullMQ תזמון בלבד
      → Clerk אימות זהות
      → AWS S3 Quarantine → GuardDuty → Clean knowledge
      → OpenAI דרך AI Adapter מאושר
  → Railway Worker
      → PostgreSQL Capability/Permit
      → Meta Cloud API ניסיון יחיד
      → Better Stack דרך OpenTelemetry מושחר
  → Billing provider רק לאחר Pilot, Eligibility/Finance/Tax/PCI והחלטת ספק חי יחיד
```

9.5.6 תנאי הקבלה הוא שכל חץ בתרשים ממופה ל־Protocol, Authentication, Authorization, Data classes, Timeout, Retry policy, Owner ו־Failure mode.

9.5.7 Evidence הוא Architecture Decision Record מתוארך, תרשים Data Flow הניתן לגרסה וחתימות Review.

9.5.8 Rollback הוא השארת כל Adapter חדש רדום והחזרת ה־Composition ל־Null adapter או Kill switch אם החוזה אינו מוכח.

9.6 משימת Trust zones.

9.6.1 Zone 0 הוא Browser ונתוני משתמש; כל Header, Cookie, Claim, JSON, File, URL ו־DOM state בו נחשבים לא־מהימנים.

9.6.2 Zone 1 הוא Edge ו־Vercel server-side BFF; אין לתת ל־Client bundle Secret כלשהו, אין לתת ל־BFF Secret שאינו נדרש ל־Server-side execution, ואין להפוך Preview ל־Production trust. User session ו־Workload identity הם הוכחות נפרדות ושניהם נדרשים לפעולה עסקית.

9.6.3 Zone 2 הוא Railway API; הוא מאמת Session, Organization, Role, Tenant, Intent, Quota ו־Idempotency לפני כל פעולה.

9.6.4 Zone 3 הוא Worker; הוא אינו סומך על Job payload ומטעין מחדש מן ה־DB את כל העובדות העסקיות וההרשאות.

9.6.5 Zone 4 הוא Data plane; PostgreSQL, Redis ו־S3 מקבלים זהויות Service נפרדות והרשאות מזעריות.

9.6.6 Zone 5 הוא Provider plane; כל יציאה ל־Meta, OpenAI, Billing או Monitoring עוברת Adapter, Application destination pinning, Timeout, Budget ו־Redaction. אין לטעון ל־Network-enforced egress allowlist בלי Packet-level evidence; אם Hosting אינו מספק זאת, URL ingestion ו־Generic connectors נשארים כבויים.

9.6.7 Zone 6 הוא Admin ו־Break-glass; פעולות בו דורשות MFA, Reason, Approval, Audit ו־Expiry.

9.6.8 תנאי הקבלה הוא שאין Credential, Service role או Network path שחוצה שתי Zones בלי בקרה מפורשת.

9.7 משימת Contracts בין רכיבים.

9.7.1 לכל API פנימי להגדיר Schema קנוני, גרסה, Maximum size, רשימת Keys סגורה, Unicode policy ו־Error taxonomy שאינה חושפת Secrets.

9.7.2 להשתמש ב־Deterministic IDs או Digests הנגזרים מתוכן אמיתי כאשר נדרשת זהות יציבה; אסור להשתמש ב־`Math.random()`.

9.7.3 אם נדרש Nonce או Token קריפטוגרפי, לעצור ולקבל אישור מפורש לפני בחירת Primitive; אין לבנות קריפטוגרפיה עצמאית.

9.7.4 להגדיר Idempotency, Ordering, Replay, Timeout ו־Unknown outcome לכל פעולה חיצונית.

9.7.5 להגדיר `fail-closed` לכל Authorization, Tenant binding, Credential binding, File scan ו־Billing entitlement.

9.7.6 להגדיר `fail-safe` תפעולי כאשר סגירה מלאה עלולה לגרום לאובדן Evidence; לדוגמה, Outcome לא ודאי נשמר לבדיקה ואינו נשלח מחדש.

9.7.7 תנאי הקבלה הוא Contract test דו־צדדי לכל חיבור בין API, Worker, DB וספק.

9.8 משימת Data classification.

9.8.1 להגדיר לפחות את המחלקות הבאות: Public, Internal, Customer confidential, Personal data, Authentication secret, Provider credential, Billing evidence, Security evidence ו־Backup.

9.8.2 לכל מחלקה להגדיר Allowed systems, Encryption, Redaction, Retention, Export, Deletion, Backup ו־Legal Hold.

9.8.3 לא לערבב באותה טבלה או Bucket נתונים בעלי מחזור חיים שונה רק משום שהם קשורים לאותו Feature.

9.8.4 תנאי הקבלה הוא Data map מלא מן האיסוף ועד מחיקה או אנונימיזציה.

9.9 Gate 4 נסגר רק לאחר אישור תרשים הארכיטקטורה, Trust zones, Data classification, Contracts ומדיניות Failure לכל חץ.

## 10. שלב 5 — Threat Model ותוכנית בקרות סייבר

10.1 מטרת השלב היא להפוך כל נכס, תוקף, נתיב תקיפה והשפעה לבקרה ולבדיקה שניתנות להוכחה.

10.2 זמן משוער לשלב הראשוני הוא 48–88 שעות עבודה נטו; לאחר מכן נדרשות 4–8 שעות בכל שינוי ארכיטקטוני משמעותי וביקורת רבעונית.

10.3 תלות השלב היא Gate 4.

10.4 הבעלים הנדרש הוא Security owner; Lead engineering, Privacy, Operations ו־Product הם Reviewers מחייבים.

10.5 משימת שיטת Threat modeling.

10.5.1 לבצע STRIDE על כל Process, Data store, Data flow ו־External entity כדי לזהות Spoofing, Tampering, Repudiation, Information disclosure, Denial of service ו־Elevation of privilege.

10.5.2 לבצע LINDDUN על זרימות מידע אישי כדי לזהות Linkability, Identifiability, Non-repudiation, Detectability, Disclosure, Unawareness ו־Non-compliance.

10.5.3 לבנות Abuse cases מנקודת מבט של לקוח זדוני, עובד פנימי, חשבון Admin פרוץ, ספק שנפגע, Bot שמופעל מחדש ו־Importer שמקבל קובץ עוין.

10.5.4 למפות כל Threat ל־NIST CSF 2.0, OWASP ASVS 5.0, OWASP API Top 10, OWASP LLM Top 10, CIS Controls 8.1 ו־Control owner.

10.5.4.1 עבור AI למפות בנוסף ל־NIST SP 800-218A, ‏NIST AI 100-2e2025, ‏MITRE ATLAS ו־OWASP Top 10 for Agentic Applications 2026. מסגרות אלה משלימות זו את זו: SSDF-A מכסה פיתוח ורכש, NIST AML מגדיר Taxonomy, ATLAS ממפה Tactics/techniques ו־OWASP Agentic מכסה Agency/workflow risks.

10.5.4.2 NIST SSDF 1.1 נשאר בסיס ה־SDLC הסופי. טיוטת SSDF 1.2 נמצאת ב־Watch registry בלבד ואינה מוצגת כתקן סופי עד פרסום רשמי.

10.5.4.3 כל Framework מקבל Edition, URL, checkedAt, digest, owner ו־next-review. שינוי Edition יוצר Delta review ולא מחליף בשקט Threat IDs או Acceptance.

10.5.5 לכל Threat להגדיר Likelihood, Impact, Detectability, Existing control, Residual risk, Test, Evidence, Owner ו־Review date.

10.5.6 תנאי הקבלה הוא אפס Data flow ללא Threat review ואפס P0 ללא Blocking control.

10.6 משימת זהות והרשאות.

10.6.1 לכסות Account takeover, Credential stuffing, Brute force, MFA fatigue, Session theft, Session fixation, Invitation hijack, Organization confusion ו־Confused deputy.

10.6.2 לכסות Broken access control, BOLA, IDOR, Mass assignment, Role escalation, Hidden admin API ו־Cross-tenant enumeration.

10.6.3 הבקרות הן Clerk policy, MFA, Expiring invitation, Session rotation, Tenant context server-side, Deny-by-default RBAC, RLS, Object-level authorization ו־Audit.

10.6.4 הבדיקות השליליות כוללות החלפת Tenant ID, Object ID, Organization claim, Role, Invitation token, Cookie ו־Parallel session.

10.7 משימת Web ו־API.

10.7.1 לכסות XSS מאוחסן/מוחזר/DOM, CSRF, CORS שגוי, CSP bypass, Clickjacking, Open redirect, Host header injection ו־Cache poisoning.

10.7.2 לכסות SQL injection, NoSQL-like filter injection, Command injection, Path traversal, Template injection, Prototype pollution ו־Unsafe deserialization.

10.7.3 לכסות Excessive data exposure, Unbounded pagination, Graph traversal, Schema confusion, Duplicate keys, Oversized body ו־Content-type smuggling.

10.7.4 הבקרות הן Output encoding, Trusted Types כאשר מעשי, CSP מבוסס nonce מאושר, SameSite/CSRF control, Exact origin allowlist, Parameterized SQL, Closed schemas ו־Request budgets.

10.7.5 הבדיקות כוללות Fuzzing של Headers, JSON, Unicode, Duplicate keys, Encodings, Methods, Content types ו־Malformed bodies.

10.8 משימת Webhook ו־Messaging.

10.8.1 לכסות Webhook forgery, Signature bypass, Replay, Duplicate delivery, Out-of-order status, Timestamp skew, Partial body verification ו־Body parser mutation.

10.8.2 לכסות Double-send, Retry storm, Poison job, Queue replay, DLQ replay, Lost acknowledgement, Unknown provider outcome ו־Concurrent workers.

10.8.3 לכסות Recipient swap, Phone Number ID swap, Credential rotation race, Template drift, Consent drift ו־Quality/rate downgrade.

10.8.4 הבקרות הן Raw-body signature verification, Replay ledger, Monotonic state machine, Durable idempotency, DB permit, Provider binding digest, One-attempt transport ו־Manual reconciliation.

10.9 משימת File, URL ו־Parser security.

10.9.1 לכסות Malware, Macro, Polyglot, MIME confusion, Decompression bomb, Deep nesting, Password protection, Parser exploit, XML entity ו־Metadata leakage.

10.9.2 לכסות SSRF, DNS rebinding, Redirect to private network, Alternate IP notation, IPv6 bypass, Cloud metadata access ו־Oversized remote resource.

10.9.3 הבקרות הן Direct upload ל־Quarantine, Type triad validation, GuardDuty, Tag-based deny, Parser sandbox, CPU/memory/time budgets, Egress deny ו־No URL ingestion ב־Pilot.

10.9.4 כל Scan result מסוג Unsupported, Error, Timeout או Missing נחשב Not clean ואינו משתחרר.

10.10 משימת AI ו־RAG.

10.10.1 לכסות Direct prompt injection, Indirect prompt injection במסמך, RAG poisoning, Cross-tenant retrieval, Training-data style leakage, Secret exfiltration ו־System prompt disclosure.

10.10.2 לכסות Hallucination, Unsafe content, Excessive agency, Tool misuse, Approval bypass, Memory poisoning, Model/provider drift ו־Unbounded token cost.

10.10.3 הבקרות הן Retrieval scoped ל־Tenant, Clean-only corpus, Citation to source, Instruction/data separation, No arbitrary tools, Structured output, Moderation, Cost caps, Evals ו־Human approval.

10.10.4 AI לעולם אינו מקור הרשאה; כל פעולה נבדקת מחדש על ידי Domain service לאחר אישור אנושי.

10.10.5 לכסות גם Goal manipulation, Tool/identity confusion, Excessive permission, Agent memory/context poisoning, Unsafe inter-agent delegation, cascading failure, supply-chain manipulation של Model/Prompt/Plugin ו־human-approval fatigue לפי OWASP Agentic ו־MITRE ATLAS.

10.10.6 לכל Threat AI להגדיר Prevention, Detection, Containment, Recovery ו־Eval. Red-team success אינו מספיק אם אין Telemetry ו־Kill switch שמזהים ועוצרים את אותו מסלול ב־Runtime.

10.10.7 ב־Pilot אין Multi-agent, MCP, autonomous planning, browser/computer use, hosted shell או write-capable tool. הוספת כל אחת מהן יוצרת Capability instance חדשה, Threat model חדש ו־Gate נפרד; היא אינה הרחבה שקטה של D25.

10.11 משימת Billing ו־Entitlements.

10.11.1 לכסות Webhook spoofing, Replay, Event reordering, Duplicate charge, Currency/amount tampering, Refund race, Subscription drift ו־Entitlement lag.

10.11.2 הבקרות הן Raw-body signature, Provider event ledger, Monotonic reducer, Immutable invoice evidence, Reconciliation ו־Single live billing provider.

10.11.3 אין לשמור PAN או CVV; Checkout hosted אצל ספק מאושר.

10.12 משימת Admin, Insider ו־Support.

10.12.1 לכסות Privileged insider, Support impersonation, Break-glass abuse, Silent export, Audit deletion, Bulk action mistake ו־Offboarding failure.

10.12.2 הבקרות הן Just-in-time privilege, Dual approval לפעולות הרסניות, Reason, Scope, Expiry, Immutable audit, Alert ו־Quarterly review.

10.13 משימת Supply chain ו־CI/CD.

10.13.1 לכסות Dependency compromise, Typosquatting, Malicious install script, Compromised GitHub Action, Stolen deploy token, Artifact substitution ו־Unreviewed generated code.

10.13.2 הבקרות הן Lockfile, SHA-pinned Actions, Minimal workflow permissions, OIDC, SBOM, Provenance/attestation, CODEOWNERS ו־Clean-checkout verification.

10.14 משימת Telemetry ו־Evidence.

10.14.1 לכסות Log injection, PII/Secret leakage, Metric label explosion, Trace cross-tenant mixing, Evidence tampering ו־Clock skew.

10.14.2 הבקרות הן Structured logs, Fixed schemas, Redaction before export, Bounded labels, Digests, Append-only audit, Trusted time ו־Access review.

10.15 משימת Availability ו־Resilience.

10.15.1 לכסות Volumetric DoS, Expensive query, Queue starvation, Redis eviction, Connection pool exhaustion, Provider outage, Region outage ו־Ransomware.

10.15.2 הבקרות הן Rate limiting רב־שכבתי, Query budgets, Backpressure, Circuit breaker ללא retry מסוכן, Capacity alerts, Kill switches, Backups ו־Restore drills.

10.16 משימת Cryptography ו־Secrets.

10.16.1 לא לפתח Algorithm עצמאי; להשתמש ב־TLS תקף, KMS/Vault ו־Primitives מתועדים של Platform.

10.16.2 להצפין Secrets ומידע רגיש במנוחה, להפריד Keys לפי סביבה ושימוש ולמנוע Decrypt מהרכיב שאינו צרכן.

10.16.3 לבצע Rotation rehearsal, Revocation, Key-loss scenario ו־Break-glass recovery.

10.16.4 למנוע Secret ב־URL, Query string, Error, Log, Trace, Job payload, Client bundle ו־Evidence.

10.16.5 ליצור Randomness registry מלא. כל שימוש מסווג לאחת משלוש קבוצות בלבד: מזהה עסקי דטרמיניסטי; ערך אבטחה המחייב CSPRNG; או Test corpus דטרמיניסטי. אין קטגוריית “Random לנוחות”.

10.16.5.1 מזהי Tenant, Event, Idempotency, Job, Message intent, Audit ו־Plan נגזרים מ־real canonical content, namespace/version ו־cryptographic digest כאשר Uniqueness עסקית מאפשרת זאת; הם אינם נוצרים באמצעות `Math.random()`.

10.16.5.2 OAuth/OIDC state, PKCE verifier, anti-CSRF nonce, invitation/recovery capability token, export/download bearer, ephemeral HMAC key ו־unpredictable security challenge משתמשים רק ב־OS/Platform CSPRNG לאחר אישור X24, עם Entropy bits, Encoding, TTL, single-use, hashed-at-rest, rotation ו־redaction מפורשים לכל Use case.

10.16.5.3 UUID עסקי אינו תחליף ל־Authorization או ל־Secret. `crypto.randomUUID()` נשאר אסור עד אישור מפורש של טל; אם נדרש Identifier בלבד, נבחנת קודם חלופה דטרמיניסטית. ספק חיצוני רשאי להחזיר ID שלו ואין “לשפר” אותו ב־Randomness מקומי.

10.16.5.4 Security tests אינם משתמשים ב־Random fuzzing בלתי־ניתן לשחזור. Corpus הוא ממוספר, Versioned ו־Digest-bound; Property-based test מותר רק עם Seed קבוע ומתועד ואם הספרייה אינה קוראת `Math.random()`. אם אי־אפשר להוכיח זאת, משתמשים ב־Vectors קבועים.

10.16.5.5 תנאי הקבלה הוא Source/dependency scan, Registry ללא Use case חסר, Known-answer/boundary tests, Duplicate/replay tests, zero Secret in log/evidence והוכחת TTL/revocation לכל Capability token.

10.17 משימת Risk register.

10.17.1 כל P0 או P1 ביכולת חיה חוסם הפעלה עד תיקון ו־Retest מוכחים, או עד השבתת היכולת והסרתה המפורשת מן Scope. אין Risk acceptance שמאפשר ל־P0/P1 להישאר במסלול חי.

10.17.2 P2/P3 יכול לקבל חריגה זמנית רק עם Owner, תאריך תפוגה קצר, Compensating control, Detection ו־אישור Security/Product/Legal כאשר רלוונטי.

10.17.3 P2 נכנס ל־Roadmap ואינו נמחק רק מפני שאינו חוסם.

10.17.4 כל אירוע, Pen-test או Near miss יוצר Threat חדש או מעדכן Threat קיים.

10.18 Evidence של השלב הוא Threat register, DFD מסומן, ASVS matrix, Abuse-case tests, Risk acceptances וחתימות Review.

10.19 Rollback של השלב הוא השארת Feature או Integration כבויים אם Threat מהותי אינו מקבל בקרה שניתנת לבדיקה.

10.20 Gate 5 נסגר רק לאחר אפס P0 פתוח, Owner לכל P1, מיפוי ASVS מאושר ותרגיל Tabletop אחד לפחות.

## 11. שלב 6 — סביבות, תשתית, רשת ו־Configuration

11.1 מטרת השלב היא להקים Development, Staging ו־Production מופרדים, ניתנים לשחזור ומוגנים מפני Drift או זליגת הרשאות.

11.2 אומדן ROM מתוקן לשלב הוא 120–212 שעות אדם, לא כולל המתנת פתיחת חשבונות, DNS, רכש או אישורי ספק. הסכום הסופי ייגזר רק ממשימות עד שמונה שעות ברשם הקנוני.

11.3 תלות השלב היא Gates 2–5 וחשבונות מאושרים מסעיף 8.

11.4 הבעלים הנדרש הוא Deployment/Platform owner, עם Review של Security ו־Database.

11.5 משימת הפרדת סביבות.

11.5.1 ליצור Projects נפרדים ב־Vercel, Railway, Clerk, OpenAI, Better Stack ו־AWS לכל Staging ו־Production.

11.5.2 להשתמש ב־Database, Redis, Buckets, KMS keys, Domains, Webhook URLs, Meta assets ו־Secrets נפרדים.

11.5.3 למנוע מ־Preview או Staging לקרוא Production data או לשלוח למספרי Production.

11.5.4 Development מקומי משתמש רק בארבעת מקורות הראיה המאושרים שב־5.4; אין Clone גולמי של Production ואין placeholder, fake, demo, mock או synthetic business data.

11.5.5 תנאי הקבלה הוא ניסיון Cross-environment שנכשל ברשת, בזהות וב־Authorization.

11.6 משימת Infrastructure as Code.

11.6.1 להגדיר Resources, Policies, Domains, Environment variables, Alerts ו־Retention בקוד תשתית או Manifest מבוקר ככל שהספק מאפשר.

11.6.2 לבצע Plan לפני Apply, Review כפול לשינויי Production ושמירת Artifact של ה־Plan.

11.6.3 לבצע Drift detection מתוזמן ולהתריע על שינוי Console שאינו מגובה בקוד.

11.6.4 לא לייבא Secret value ל־State או Evidence; להשתמש ב־References מאובטחים.

11.6.5 תנאי הקבלה הוא שחזור Staging נקי מתיעוד ו־Manifests ללא פעולה ידנית נסתרת.

11.7 משימת Vercel.

11.7.1 ליצור Inventory של generated deployment URLs, branch URLs, custom domains ו־old production aliases. לבחור Mode לפי ה־Plan החי: Standard protection אינו מוצג כהגנה על Production domain; כאשר נדרשת הגנת Production משתמשים ב־All Deployments רק לאחר אימות entitlement. כל URL מקבל Negative access test.

11.7.1.1 Automation bypass secret הוא Project-wide ובעל Blast radius רחב. אסור להעבירו ב־Query string או Cookie; לכל Automation Owner, Expiry, Redaction ו־Rotation/redeploy drill. ברירת המחדל היא Trusted Sources עם OIDC קצר־חיים כאשר היכולת זמינה.

11.7.1.2 אין לבלבל בין `x-vercel-trusted-oidc-idp-token`, העוקף Deployment Protection, לבין `x-vercel-oidc-token`, המזהה Vercel Function מול Railway. הראשון אינו נשלח ל־Railway כ־Workload identity.

11.7.1.3 תיעוד Vercel מ־2026 מציין ש־Automation bypass עוקף לא רק Authentication/Trusted IP אלא גם System firewall mitigations ו־Bot challenges מסוימים לכל Deployments בפרויקט עד Revocation. לכן הוא מסווג כ־Project-wide high-impact capability secret, אינו URL, אינו Webhook credential, אינו Cookie ואינו מנגנון Production access רגיל. דליפה מפעילה Revocation, Redeploy, log/analytics scrub, route review ו־Incident.

11.7.1.4 ‏Standard Protection אינו מגן על Production custom domain. ‏All Deployments תלוי Plan/Add-on חי; Exceptions עשויים להפוך Domain לציבורי, ו־OPTIONS allowlist פועל לפי Path prefix. לכל Scope/Exception/Allowlist נשמר Exact export, Owner, Expiry, Route+method negative tests ו־Drift alert; Plan documentation לבדה אינה Entitlement.

11.7.1.5 ‏Trusted Sources OIDC הוא מסלול ברירת המחדל לאוטומציה מול Deployment מוגן כאשר Capability חיה מוכחת. Rule קושר Issuer, Subject/Caller, Project, Environment ו־Destination; Token ל־Preview אינו פותח Production. אם Capability אינה זמינה, Secret fallback אינו מקבל Query/Cookie mode, מוגבל ל־Runner יחיד ולזמן קצר ככל שהספק מאפשר, ונשאר חסום ל־Webhooks ציבוריים.

11.7.2 להפריד Environment variables לפי Development, Preview, Staging ו־Production.

11.7.3 להגדיר Security headers, CSP, HSTS לאחר בדיקת Domain, Referrer-Policy, Permissions-Policy ו־Frame restrictions.

11.7.4 למנוע Cache של Response אישי ולהגדיר Cache keys שאינם מערבבים Tenant או Session.

11.7.5 להגדיר WAF ruleset inventory: Rule, Mode, Scope, Plan entitlement, Owner, Log-only observation, Deny activation, False-positive test ו־Rollback. DDoS/Firewall ו־custom rules נבדקים לפי המכסה; Managed OWASP Core Ruleset אינו מונח כזמין ללא Enterprise evidence.

11.7.6 Vercel BFF שולח ל־Railway Workload token שבו Railway מאמת exact team-scoped `iss`, custom `aud`, ‏`sub` עם Owner/Project/Environment, ‏`exp` ו־`nbf`. Preview אינו רשאי להגיע ל־Production Railway. Workload identity אינה מחליפה Clerk user/session או Tenant authorization.

11.7.7 תנאי הקבלה הוא Browser test שמוכיח הגנה על כל URL ו־Headers תקינים בכל Route ציבורי, וכן wrong team/audience/subject/environment, expired token, Preview→Production ו־direct Railway call שנכשלים.

11.8 משימת Railway.

11.8.1 להפריד API, Worker, PostgreSQL ו־Redis לשירותים בעלי Identity ו־Healthcheck נפרדים.

11.8.2 להשתמש ב־Private networking בין Services כאשר אפשר, ולא לחשוף PostgreSQL או Redis לאינטרנט הציבורי.

11.8.3 להגדיר Resource limits, Restart policy, Graceful shutdown, Deployment health, Rollback ו־Maintenance window.

11.8.4 לא להניח ש־Railway Redis מנוהל במלואו; להגדיר Monitoring, Persistence policy, Export/restore test ויכולת Build מחדש מן ה־DB.

11.8.5 ב־Gate 6.1 ליצור רק Service shells ו־Secret references נפרדים ל־API, Worker, Migration ו־Verifier. ה־Database roles וה־Grants עצמם נוצרים בשלב 7; אין לדרוש אותם כתנאי מוקדם לשלב שיוצר אותם.

11.8.6 תנאי הקבלה ל־Gate 6.1 הוא שאין Database/Redis ציבורי ושכל Service מקבל Identity/config namespace נפרד. תנאי הקבלה ל־Gate 6.2, לאחר Gate 7, הוא ניסיון התחברות חי של כל Service לכל Resource שבו רק מטריצת ההרשאות המאושרת עוברת.

11.8.7 לפי מסמכי Railway שנבדקו ב־26.08.2026, Region אירופה הזמין הוא EU West באמסטרדם ואין Region בישראל; Database templates הם Unmanaged והשירות מטיל על Connect אחריות ל־Backup/DR, Tuning, Security, Monitoring ו־Maintenance. D12 מותר ל־Pilot רק לאחר D26 Legal/Data-transfer approval ובלי Claim לתושבות ישראלית.

11.8.8 Production readiness כולל Plan/region export, Data residency map, version/patch owner, connection pool, vacuum/analyze, extension lifecycle, storage/headroom, HA decision, maintenance/upgrade/rollback ו־independent backup; Default template אינו Evidence.

11.8.9 להקשיח כל Container/Runtime בנפרד: Base image מוצמד ל־Digest, Multi-stage build, Runtime ללא Compiler/package manager כאשר ניתן, User שאינו root, Filesystem קריאה בלבד למעט Mounts מפורשים, `no-new-privileges`, הסרת Linux capabilities, ללא Docker socket או Host mount, Resource/PID limits, Temp directory מוגבל, Signal handling ו־Graceful drain. יכולת שאינה נתמכת ב־Railway מתועדת כפער Platform עם בקרה מפצה; אסור לסמן אותה Passed.

11.8.10 לבצע SBOM ו־Vulnerability scan גם ל־OS packages ול־Base image, לקבוע SLA ל־Critical/High, ולבנות מחדש Artifact גם כאשר רק Base digest השתנה. Artifact פגיע אינו מקודם מפני ש־Application packages נקיים.

11.8.11 Runtime אינו כולל Debug port ציבורי, Shell/REPL מרוחק, Source map עם Source רגיש, Heap/core dump לא־מוצפן או Health endpoint שמציג Config/Secret. בדיקות שליליות כוללות Crash, OOM, SIGTERM, Disk full, Read-only filesystem, `/tmp` exhaustion, child-process attempt ו־metadata access.

11.8.12 להגדיר ל־Railway Redis גבול רשת קשיח: API, Worker ו־Redis חייבים להיות באותו Project+Environment מבודד; Runtime משתמש רק ב־`REDIS_URL` פרטי וב־reference variable, ‏TCP Proxy ו־Public Access אינם נוצרים, ‏`REDIS_PUBLIC_URL` אינו קיים, ו־Preview/Staging אינם מסוגלים לפתור או להגיע ל־Production Redis. ‏Railway מתעדת WireGuard והפרדת Environment, אך הצפנת הרשת אינה מחליפה Redis authentication, ‏ACL או Secret rotation. Gate 6.1 דורש Export של ה־Networking ו־Probe חיצוני שלילי; צילום מסך בלבד אינו Evidence.

11.8.13 לנעול Redis image ל־release מלא ול־image digest שעברו Advisory review ו־BullMQ compatibility suite בתוך שבעה ימים מכל Deploy. אין `latest`, אין Auto-update ישיר ואין Promotion של release שמושפע מ־Critical/High ישים. נכון ל־27.08.2026, Redis פרסמה תיקוני RCE ב־8.2.6; נתון זה הוא Minimum research snapshot בלבד ולא הרשאה להניח ש־8.2.6 יהיה ה־Target בעת הביצוע. כל Upgrade עובר Backup, config diff, canary, reconnect/failover, queue rebuild ו־Rollback drill לפני Reachability עסקית.

11.8.14 להפריד Redis identities ל־Producer, ‏Worker, ‏QueueEvents/Observer ו־Break-glass Admin. ‏Runtime אינו מקבל `CONFIG`, ‏`ACL`, ‏`FLUSHALL`, ‏`FLUSHDB`, ‏`SHUTDOWN`, ‏`DEBUG`, ‏`MONITOR`, ‏`MODULE`, ‏`REPLICAOF`, ‏`MIGRATE`, ‏`RESTORE` או Script administration שאינה נדרשת לחוזה BullMQ. מאחר ש־BullMQ מפעילה Lua internally, ה־allowlist לא ינוחש: הוא נגזר מ־command trace ו־`ACL DRYRUN` של הגרסה המוצמדת ומאומת מול positive/negative/conformance suites. אם Railway template אינו מאפשר Named ACL אמין ומתמשך, המצב נרשם `unknown/unavailable`, משתמש Runtime משותף מקבל Scope מינימלי מתועד, Production Gate נשאר חסום עד בקרה מפצה מאושרת או מעבר לספק מנוהל.

11.8.15 לבחור ל־Pilot ב־AOF עם `appendfsync everysec` וב־RDB/Volume backup משלים, רק לאחר Benchmark ו־restart proof על Volume `/data`; ‏`noeviction` הוא חובה. ‏AOF every-second עשוי לאבד בקירוב שנייה ואינו הופך Redis למקור אמת. PostgreSQL Outbox/Operation ledger משחזר כל Job שלא Settled, ו־Railway volume backup הוא מאיץ Recovery בלבד משום שהוא ניתן למחיקה עם Volume, מוגבל לאותו Project+Environment ועלול להסיר Backups חדשים יותר בעת Restore. ‏`INFO persistence`, ‏AOF rewrite state, config persistence לאחר Redeploy, key/job reconciliation ו־restore digest הם Evidence. Closed Pilot רשאי להשתמש ב־single node רק תחת invariant זה; Production דורש Railway Redis HA עם Sentinel/HAProxy ו־failover/failback drill, או החלטת Provider חלופית אם Entitlement, Patch ownership או RTO אינם מוכחים.

11.8.16 לקבוע Capacity contract נגזר ולא מספר RAM שרירותי: `maxmemory` אינו גבוה מ־allocated RAM פחות הגדול מבין 30% לבין headroom שנמדד ב־p99 עבור AOF/RDB rewrite, replication, client buffers ו־process overhead. ‏`maxmemory-policy=noeviction`; ‏Producer fail-closed בכל OOM/noeviction error. התראות ראשוניות מופעלות ב־60%, ‏75% ו־85% מ־`maxmemory`; ב־85% נעצרים Producers לא־קריטיים, וב־90% או בכל write rejection נעצרת קבלת Side effects חדשים עד Drain/Rebuild. ספי ה־Production הסופיים נגזרים מ־bounded load test ומתועדים עם Plan cost cap, queue depth, oldest age, delayed/failed/DLQ counts, stalled/deduplicated events, connections/maxclients, reconnects, disk/volume, AOF status ו־replication lag.

11.8.17 להגדיר Connection profiles נפרדים. Producer סינכרוני משתמש ב־`maxRetriesPerRequest=1`, ב־`enableOfflineQueue=false`, ב־connect/command timeout הקשור ל־API SLO ובשגיאה מפורשת שהלקוח יכול לנסות מחדש; הוא אינו אוגר פקודות בלתי־נראות בזמן Redis outage. Worker משתמש ב־`maxRetriesPerRequest=null`, ב־reconnect bounded-observable וב־error handler, אך אינו מבצע Side effect חדש עד שחוזה ה־DB claim/fence תקין. ‏Worker ו־QueueEvents סופרים גם duplicated/blocking connections בתקציב `maxclients`. Startup unavailable, disconnect בזמן Job ו־recovery ללא intervention הם בדיקות חובה.

11.8.18 להצהיר במפורש ש־BullMQ הוא `at-least-once`, לא exactly-once. כל Job מכיל רק מזהים ומטא־דאטה מינימליים ללא PII, עם `schemaVersion`, ‏Tenant/action allowlist, byte cap ו־deterministic `jobId` שמופק מ־Business operation identity אמיתי; המזהה אינו digits-only ואינו מכיל `:`. זרימת Side effect היא DB transaction שיוצרת Outbox+Operation, ‏post-commit enqueue, ‏Worker CAS/lease/fence, ‏provider attempt, ‏receipt/reconciliation ורק אז Settlement. Timeout לאחר שליחה יוצר `unknown` ואוסר retry עיוור. Redis job ID או Deduplication key הם Optimization בלבד: Auto-removal או מחיקה ידנית מבטלים את ההגנה, ולכן Unique business constraint ו־receipt ledger ב־PostgreSQL הם מנגנון הבטיחות.

11.8.19 להגדיר Retry taxonomy דטרמיניסטי: Validation/Auth/Policy/Permanent provider errors עוברים מיד ל־terminal failure; Transient errors מקבלים Attempts ו־exponential delay חסומים לפי Operation class; Rate-limit משתמש ב־provider reset/retry-after וב־Connect permit ledger. אין stochastic jitter ואין `Math.random()`; אם נדרשת פיזור עומס, הוא מחושב דטרמיניסטית מ־digest של Operation אמיתי ובנוסחה מוצמדת. Job תקוע מעבר ל־`maxStalledCount`, Poison job או exhausted retry נכתב ל־PostgreSQL failure ledger ונכנס ל־DLQ מוגבל. Manual replay דורש Reason, Actor, exact Job/Operation digest, dry-run, Approval לפי Severity ו־post-replay reconciliation; אין Bulk blind replay.

11.8.20 להגדיר Lifecycle של Job retention כך ש־Redis אינו Audit store. Completed/failed retention מקבל age+count cap ותואם Data retention, אך Canonical outcome נשמר ב־PostgreSQL. מאחר ש־BullMQ auto-removal הוא lazy ומחיקת Job מאפשרת reuse של אותו ID, בדיקות מוכיחות ש־PostgreSQL uniqueness עדיין חוסמת Side effect כפול אחרי cleanup, backup restore, DLQ replay ו־queue rebuild. ‏Job data, logs, metrics ו־error messages עוברים Redaction; אם PII נמצא ב־payload או ב־failedReason, Gate 11 נכשל וה־Queue נמחק ונבנה מחדש מן ה־ledger לאחר Incident review.

11.8.21 לבצע Failure matrix מלאה לפני Gate 11: Redis לא זמין ב־startup, disconnect לפני/אחרי claim, process crash לפני/אחרי provider acceptance, ‏SIGTERM grace קצר מ־Job, event-loop stall, lock expiry, שני Workers, שני Schedulers, clock skew, AOF rewrite, אובדן חלון AOF, restart/redeploy, disk/volume full, `noeviction` rejection, maxclients, wrong ACL, forbidden command, public probe, credential rotation, Sentinel failover, backup/restore, Job deletion, auto-removal, duplicate enqueue, delayed job, Poison/DLQ saturation ו־rebuild מלא מ־PostgreSQL. Test evidence משתמש רק ב־normative vectors או deterministic non-business literals המאושרים במדיניות 34.34; אין Mock business data ואין Side effect אצל ספק חי.

11.8.22 Connection מ־API/Worker/Migrator/Verifier אל PostgreSQL מחייב TLS hostname/CA verification ומטריצת Principal מדויקת; Connection string מושחר ב־Evidence, `sslmode=require` ללא אימות זהות אינו תנאי קבלה.

11.9 משימת AWS Storage.

11.9.1 ליצור AWS Organization עם Accounts נפרדים לפחות ל־Production, Nonproduction, Security/Logging ו־Backup; Organizational unit לבדה אינה תחליף להפרדת Account. Region ברירת המחדל ל־Buckets הוא `il-central-1`, בכפוף ל־Evidence חי ול־Data-map/Legal approval.

11.9.2 להפעיל Block Public Access, Object ownership, Deny ל־HTTP ו־Versioning כחובה בכל Quarantine ו־Backup bucket. CloudTrail Data Events נדרשים ל־Buckets רגישים; Access logging הוא שכבה נוספת ואינו תחליף. Clean buckets מקבלים Versioning לפי Recovery/Retention policy מאושרת.

11.9.3 להגדיר SSE-KMS עם Customer-managed keys, Key policy מזערית, Rotation policy, Owner ו־Break-glass.

11.9.4 להפעיל GuardDuty Malware Protection על Quarantine בלבד בתחילה, עם Tag-based access control ו־EventBridge status handling.

11.9.5 לפני Upload ראשון להפעיל AWS Organizations AI services opt-out ל־`guardduty` ברמת Root ולשמור Effective policy evidence.

11.9.6 שחרור מותר רק כאשר `scanStatus=COMPLETED` וגם `scanResultStatus=NO_THREATS_FOUND`, ובנוסף Account, Region, Protection-plan ARN, Schema version, Bucket, Key, VersionId ו־Application checksum תואמים לרשומת ההעלאה. `SKIPPED`, `FAILED`, Status/Reason לא מוכר, ETag בלבד או גרסה אחרת נשארים חסומים ומוסלמים; Tag אינו מקור האמת היחיד.

11.9.7 תנאי הקבלה הוא Upload מבוקר של קובץ נקי וקובץ בדיקה בטוח, הוכחת בידוד, Tag, Event ו־גישה ל־Clean בלבד.

11.10 משימת DNS, TLS ו־Origins.

11.10.1 לקבוע Domains קנוניים נפרדים ל־Production ול־Staging ולהגדיר Ownership ו־Renewal.

11.10.2 להוסיף `APP_PUBLIC_ORIGIN` בצד השרת, לקבל URL יחיד מסוג HTTPS ללא Path, Query, Fragment, Userinfo או Host פרטי.

11.10.3 `localhost` מותר רק ב־Development מפורש; Production נכשל בעלייה אם Origin חסר או לא תקף.

11.10.4 להגדיר Exact CORS allowlist ולא Pattern רחב; Requests ללא Origin מטופלים לפי Route contract ולא באופן גלובלי.

11.10.5 לבדוק Certificate chain, HSTS, Redirect canonical, Host header, DNS takeover ו־Expired domain alerts.

11.10.6 תנאי הקבלה הוא Negative suite ל־HTTP, `localhost`, IP, Unicode spoof, Userinfo, Wildcard ו־Host זדוני.

11.11 משימת Egress.

11.11.1 למפות יעדים מורשים לכל Service ולחסום Cloud metadata, RFC1918, Loopback ו־Link-local כאשר אין צורך.

11.11.2 Meta transport רשאי להגיע רק ל־Origin וגרסת Graph המאושרים; OpenAI, Billing ו־Monitoring מקבלים Allowlist נפרד.

11.11.3 אין URL ingestion ב־Pilot; אם יתווסף בעתיד, נדרש SSRF gateway ייעודי עם DNS resolution חוזר ו־Redirect policy.

11.11.4 תנאי הקבלה הוא Egress test חי שבו יעד מורשה עובר ויעדים פרטיים או לא־מורשים נחסמים גם מתהליך Runtime שניסה לעקוף Adapter/Proxy. אם Hosting מוכיח רק Static source IP ולא Destination firewall, הראיה מסומנת Application-only והיכולות התלויות ב־Network enforcement נשארות כבויות או עוברות ל־Hosting מתאים.

11.12 משימת Kill switches ו־Startup validation.

11.12.1 ליצור מתג נפרד ל־Outbound WhatsApp, Campaigns, AI, Uploads, Billing mutations, Retention deletion ו־Admin bulk actions.

11.12.2 ברירת המחדל בכל סביבה חדשה היא כבוי עד Evidence.

11.12.3 Startup בודק Schema version, Required configuration, Credential reference, Origin, Environment identity ו־Production safeguards.

11.12.4 מתג כבוי מונע Side effect אך משאיר Health, Read-only diagnostics ו־Audit זמינים.

11.12.5 לתרגל Kill, Drain, Resume ו־Rollback ללא Double-send או אובדן Evidence.

11.13 Evidence הוא IaC plan, Environment matrix, Network tests, Access tests, Container/runtime hardening report, OS/Application SBOM, PostgreSQL TLS proof, Configuration report, GuardDuty proof ו־Kill-switch rehearsal.

11.14 Rollback הוא חזרה ל־Deployment digest קודם, השבתת Side effects, Drain של Queue ושמירת DB additive migrations ללא Down migration הרסני.

11.15 Gate 6 הוא Namespace מפוצל ואינו Gate יחיד.

11.15.1 Gate 6.1 — Core infrastructure shell — נסגר לאחר Accounts/Projects נפרדים, no-public PostgreSQL/Redis, Service identities/config namespaces, Secret references, Origin/TLS, Startup validation ו־Kill switches. הוא אינו דורש עדיין Database roles חיים ואינו דורש Upload/GuardDuty.

11.15.2 Stage 7 תלוי ב־Gate 6.1 בלבד ויוצר Roles, RLS ו־Grants.

11.15.3 Gate 6.2 — Live service-to-resource authorization — נסגר לאחר Gate 7 ורק לאחר מטריצת חיבור חיה של API/Worker/Migrator/Verifier, Database TLS ו־deny paths.

11.15.4 Gate 6.3 — Upload/Quarantine — נסגר רק אם Scope Manifest כולל Upload, Knowledge או Media, ורק לאחר S3/KMS/Versioning/GuardDuty/EventBridge/DLQ/Reconciliation ו־disabled-bypass evidence.

11.15.5 אין להשתמש בהמשך המסמך ב־`Gate 6` כקיצור. כל תלות מציינת במפורש Gate 6.1, ‏6.2 או 6.3 לפי ה־Scope; ‏6.3 נדרש רק ליכולת Upload/Knowledge/Media. Core Pilot ללא יכולות אלה אינו תלוי ב־6.3.

## 12. שלב 7 — PostgreSQL, מודל נתונים ובידוד Tenant

12.1 מטרת השלב היא להפוך את PostgreSQL למקור אמת עקבי שבו הרשאה, Tenant, State transition ו־Audit נאכפים גם אם API או Worker טועים.

12.2 אומדן ROM מתוקן לשלב הוא 146–252 שעות אדם, בנוסף לחלק הייחודי של D1f-C2 בסעיף 17 ורק לאחר מניעת Double count ברשם המשימות. האומדן הסופי הוא סכום Tasks ולא אומדן Parent.

12.3 תלות השלב היא Gates 4, 5 ו־6.1 והחלטת D31. Gate 6.2 נסגר רק לאחר תוצרי שלב זה, ולכן אינו Predecessor שלו.

12.4 הבעלים הנדרש הוא Database owner; Security ו־Backend מבצעים Review נפרד.

12.5 משימת מודל Tenant.

12.5.1 להגדיר Tenant ID קנוני בכל טבלה עסקית ולמנוע Record עסקי ללא Tenant, למעט Registry גלובלי מפורש.

12.5.2 להגדיר Foreign keys מורכבים הכוללים Tenant כך שלא ניתן לקשר Child של Tenant אחד ל־Parent של אחר.

12.5.3 להימנע מ־Global unique key שחושף קיום של נתון בין Tenants; Errors אינם מבדילים בין `לא קיים` ל־`לא מורשה` בלי צורך עסקי.

12.5.4 להגדיר Immutable ownership; העברת Record בין Tenants אסורה ונעשית רק בתהליך Export/Import מאושר אם יידרש.

12.5.5 תנאי הקבלה הוא Matrix של Cross-tenant insert, select, update, delete ו־join שנכשלת בכל Principal לא מורשה.

12.6 משימת Principals לפי D31.

12.6.1 ליצור NOLOGIN migration owner שבבעלותו Schema ו־Functions אך אינו Credential של Service.

12.6.2 ליצור Migrator login זמני או Scoped שמורשה לבצע Migration בלבד בזמן Deployment מאושר.

12.6.3 ליצור API principal לפעולות סינכרוניות בלבד ו־Worker principal לפעולות Queue/Delivery בלבד.

12.6.4 ליצור Verifier principal מבודד שמותר לו לבצע Assertions וראיות שנקבעו, בלי להפוך לבעל הרשאה עסקית רחבה.

12.6.5 לכל Principal להגדיר LOGIN, INHERIT, CREATEDB, CREATEROLE, BYPASSRLS, Search path, Statement timeout ו־Connection limits במפורש.

12.6.6 `PUBLIC` מאבד CREATE ו־EXECUTE שאינם נדרשים; Runtime אינו בעל Table או Function.

12.6.7 גישת אדם ישירה ל־Production PostgreSQL אסורה כברירת מחדל. חריגה דורשת Ticket/Incident, Principal אישי, MFA אצל ספק הזהות, אישור שני אנשים, Scope מזערי, TTL מרבי של 30 דקות, Session/command evidence כאשר הפלטפורמה מאפשרת, ביטול אוטומטי ו־Post-access review. אסור להשתמש ב־Runtime credential או בחשבון משותף.

12.6.8 Break-glass ל־Database אינו הופך אדם ל־Table owner או Superuser אלא אם Recovery מתועד הוכיח שאין חלופה; במקרה כזה Outbound/Mutation עוברים Freeze, כל הגישה מתועדת, Credential מסובב בסיום ונדרש Incident review.

12.6.9 תנאי הקבלה הוא Privilege dump, Live negative proof לכל Principal ותרגיל JIT grant/revoke שבו Session ישן, Connection pooled ו־Credential קודם אינם שורדים את ה־Expiry.

12.7 משימת RLS ו־Session context.

12.7.1 להפעיל RLS ו־FORCE RLS על טבלאות Tenant רלוונטיות לאחר בדיקת Owner semantics.

12.7.2 לקבוע Tenant context בתוך Transaction אחרי אימות Clerk ו־Organization, לא דרך ערך Client ולא דרך Connection state שנשאר ב־Pool.

12.7.3 לבצע Reset מוכח לפני החזרת Connection ל־Pool ולבדוק Pool reuse בין שני Tenants.

12.7.4 Policies יכסו SELECT, INSERT, UPDATE ו־DELETE בנפרד; `WITH CHECK` אינו נשאר משתמע.

12.7.5 Security-definer function מותרת רק לאחר Search path קשיח, Owner מבודד, Grant מדויק ו־Threat review.

12.7.6 לבנות מטריצת RLS bypass מפורשת המכסה לפחות: Table owner, Superuser, `BYPASSRLS`, Migrator, API, Worker, Verifier, Backup/restore, Logical replication, `SECURITY DEFINER`, `SECURITY INVOKER`, View רגיל, `security_invoker` view, Materialized view, Trigger, Function עם `SET ROLE`, `search_path`, Partitioned table ו־Partition child, Sequence, `COPY`, Foreign key/error channel, Prepared statement, Connection pool reuse, Background job, Maintenance script ו־Ad-hoc support query.

12.7.7 לכל שורה במטריצה לקבע האם RLS אמור לחול, איזו בקרה חלופית קיימת אם אינו חל, מי רשאי להפעיל, מה ה־TTL, איזו ראיה נשמרת ואיך מבטלים. Principal בעל יכולת עקיפה אינו מקבל Business traffic.

12.7.8 לבדוק גם Policy side channels: שוני ב־Error, timing, unique constraint, row count, sequence behavior, query plan ו־foreign-key validation. אין לטעון Tenant isolation רק משום ש־SELECT ישיר נחסם.

12.7.9 תנאי הקבלה הוא Test חי שמנסה Leak דרך כל שורת bypass ישימה, Pool reuse, Prepared statement, Function, View, FK error ו־Concurrent transaction; כל N/A דורש נימוק ו־Reviewer עצמאי.

12.8 משימת Migration governance.

12.8.1 Migrations הן Append-only; Migration שהופעלה אינה נערכת ותיקון נעשה במספר הבא.

12.8.2 כל Migration כוללת Preconditions, Transaction boundary, Lock analysis, Backfill plan, Compatibility window ו־Rollback strategy.

12.8.3 שינוי הרסני מתבצע בשיטת Expand, Migrate, Verify, Contract ורק לאחר Retention ו־Backup evidence.

12.8.4 להפעיל Static contract, Parity registry ו־PostgreSQL 16 live verifier ב־Clean checkout.

12.8.5 תנאי הקבלה הוא Upgrade מגרסת Production האחרונה ו־Fresh install שמגיעים לאותו Schema digest.

12.9 משימת State machines ו־Concurrency.

12.9.1 להגדיר סטטוסים ומעברים חוקיים ל־Invitation, Subscription, Campaign, Recipient, Message, Conversation, File, Flow version, AI approval ו־Deletion plan.

12.9.2 כל Transition משתמש ב־Expected version או Compare-and-set ומחזיר Conflict ברור בלי Side effect חלקי.

12.9.3 Idempotency key קשור ל־Tenant, Operation, Actor ו־Canonical request digest.

12.9.4 Duplicate, Replay ו־Out-of-order events אינם מחזירים State לאחור ואינם יוצרים Side effect שני.

12.9.5 תנאי הקבלה הוא Concurrency test עם שני API requests, שני Workers, Retry ו־Crash בין Commit ל־Acknowledgement.

12.10 משימת Audit integrity.

12.10.1 Audit record כולל Tenant, Actor type, Actor ID מושחר, Action, Target digest, Reason, Correlation, Result ו־Trusted timestamp.

12.10.2 Audit אינו כולל Token, Ciphertext, Message body מלא או PII שאינו נדרש.

12.10.3 Runtime אינו רשאי לעדכן או למחוק Audit; Retention משתמש במסלול מוגבל ונפרד.

12.10.4 להוסיף Batch digest קנוני עם Framing גרסתי, Sequence range, Previous digest, Trusted timestamp, Record count ו־Policy version. את Manifest ה־Batch יש לחתום במפתח א־סימטרי KMS שאינו נגיש ל־Runtime ולשכפל לחשבון Evidence נפרד עם Versioning ו־S3 Object Lock לפי Policy.

12.10.5 External anchor אינו הופך Log לבלתי־ניתן לזיוף באופן מוחלט: יש לתעד Trust anchor, Key compromise scope, Clock source, Missing-batch behavior, Replay, Fork, Gap ו־Recovery. Verifier קורא ממסלול נפרד ואינו משתמש ב־Runtime principal שכתב את האירועים.

12.10.6 תנאי הקבלה הוא ניסיון Update/Delete/Truncate שנכשל, החלפת Batch, הסרת Batch, Fork של chain, Signature ממפתח/סביבה אחרת ו־Clock skew שנכשלים, והרכבת Timeline מלאה מאירוע בדיקה דרך Evidence החיצוני.

12.11 משימת Data minimization ו־Encryption.

12.11.1 להפריד Provider credentials, contact PII, message content, consent evidence, billing evidence ו־telemetry לפי צורך גישה ומחזור חיים.

12.11.2 להצפין Provider credentials בשכבת Vault/KMS ולהחזיר Plaintext רק בתוך Callback צר לצרכן המאושר.

12.11.3 לא לאחסן Job payload המכיל מספר טלפון, Token או Message body; Job מחזיק Reference ו־Digest בלבד.

12.11.4 להגדיר Hashing רק למטרות השוואה שאינן דורשות שחזור, עם Domain separation ו־Canonical framing. ערך בעל מרחב חיפוש קטן כגון טלפון, אימייל, WABA ID או Provider ID אינו עובר SHA חשוף; Pseudonymization כזו משתמשת ב־HMAC עם Key ייעודי לכל סביבה/שימוש, Key version, Rotation ו־Reindex plan. אסור להשתמש באותו Digest בין Tenants או מטרות אם הדבר מאפשר Correlation לא נדרש.

12.11.5 תנאי הקבלה הוא Data-flow review שמוכיח שכל Consumer רואה רק את המחלקות שהוא צריך.

12.12 משימת Query safety וביצועים.

12.12.1 להשתמש ב־Parameterized queries בלבד ולחסום Dynamic identifier ללא Allowlist.

12.12.2 להגדיר Statement timeout, Lock timeout, Idle transaction timeout ו־Pool limit לכל Principal. חיבור מרוחק ל־PostgreSQL דורש TLS עם אימות Host ו־CA באמצעות `sslmode=verify-full` או מנגנון שקול שהוכח; `require`, ביטול בדיקת Certificate או Trust של CA לא־מנוהל אינם מספיקים. Certificate rotation, Expiry, DNS mismatch ו־MITM נכללים בבדיקה השלילית.

12.12.3 לבדוק Indexes לפי Query plans עם Artifact קנה־מידה מאושר מאחת מארבע מחלקות המקור שב־5.4 בלבד, בלי להסתמך על Dataset קטן. אסור להמציא מידע עסקי סינתטי לצורך בדיקת Scale; אם אין Artifact מאושר ומתאים, בדיקת הקיבולת נשארת `unknown/unavailable` ואינה מוכיחה מוכנות.

12.12.4 להתריע על Long transaction, Lock wait, Connection saturation, Replication/backup lag ו־Table growth.

12.12.5 תנאי הקבלה הוא Performance budget לכל Query קריטי ו־No unbounded scan במסלול בקשה או Worker.

12.13 משימת Source guard לגבול DB.

12.13.1 לכלול `db`, `server`, `worker`, `proxy.ts`, Runtime bootstrap ו־Package entrypoints ב־TypeScript dependency graph.

12.13.2 לחסום Import Client אל Server/DB, Runtime importer למודול רדום, Dynamic import לא־פתיר, Runtime re-export ו־Package alias עוקף.

12.13.3 Type-only import מותר רק כאשר אין Runtime declaration; Mixed import נחשב Runtime.

12.13.4 להצמיד SHA ל־Boundary executable רגיש רק לאחר Formatting ו־Review סופי; שינוי Byte יחיד מפיל Gate.

12.13.5 תנאי הקבלה הוא Negative suite לכל עקיפה ו־Clean graph עם אפס Importer לא־מאושר.

12.14 Evidence הוא Schema digest, Migration reports, Privilege/RLS-bypass matrix, JIT DB access drill, RLS live tests, externally anchored audit verification, PostgreSQL TLS proof, Concurrency report, Query budgets ו־Source graph.

12.15 Rollback הוא Revert אפליקטיבי, Revocation של EXECUTE/LOGIN, Kill switch ו־Migration מפצה; אין Down migration שמוחקת Evidence או Ledgers.

12.16 Gate 7 נסגר רק לאחר Named roles חיים, RLS/tenant tests, Migration parity, State-machine concurrency, Audit integrity ו־Source guard מלאים.

## 13. שלב 8 — Identity, Organizations, Roles והזמנות צוות

13.1 מטרת השלב היא לוודא שאימות זהות אצל Clerk הופך להרשאה עסקית מדויקת בתוך Connect, בלי להסתמך על UI או Claim ישן.

13.2 זמן משוער לשלב הוא 44–72 שעות עבודה נטו.

13.3 תלות השלב היא Gates 4–7 ו־D01/D17.

13.4 הבעלים הנדרש הוא Identity owner; Security, Backend ו־Product מאשרים את מטריצת התפקידים.

13.5 משימת מודל Organizations.

13.5.1 כל משתמש עסקי פועל בתוך Clerk Organization שממופה אחד־לאחד ל־Connect Tenant פעיל.

13.5.2 Personal workspace אינו נתיב מוצר; משתמש ללא Organization מאושר רואה מסך הצטרפות בלבד ואינו מקבל Tenant context.

13.5.3 מיפוי Clerk Organization ל־Tenant נשמר בשרת ונבדק מחדש בכל Session רגיש; Client אינו מספק Tenant authority.

13.5.4 שינוי Membership, Suspension או Deletion מבטל גישה ל־Connect גם אם Token ישן עדיין לא פג, באמצעות Revalidation ו־Session revocation policy.

13.5.5 React אינו קורא `getToken()`, אינו שולח או שומר Bearer ואינו פונה ישירות ל־Railway. ה־Browser פונה רק ל־same-origin Vercel BFF; לאחר אישור X24 נדרשים Connect application session מסוג HttpOnly, ‏Clerk session עדכני, CSRF/Origin controls, Vercel OIDC workload identity ו־server-bound user context. ‏`orgId` ב־URL/Header/Body הוא Selector בלבד ואינו Authority; Railway מאמת Tenant/Object authorization ו־RLS באופן עצמאי.

13.5.5.1 לפי תיעוד Clerk שנבדק 27.08.2026, ‏`__session` הוא Cookie קצר־חיים בן כ־60 שניות, ‏`SameSite=Lax`, אך אינו `HttpOnly` משום שה־SDK בצד הלקוח נדרש לקרוא אותו. הוא נשלח אוטומטית ל־same-origin Backend. לכן פקיעתו המהירה מצמצמת חלון שימוש ואינה גבול אבטחה מספק מול XSS פעיל, Session riding או פעולה שכבר החלה.

13.5.5.2 אין Mutation ב־GET, Navigation, Image load או URL query. כל Mutation דורשת Method/Content-Type/schema מתאימים, Current Clerk check, Connect server-bound session, exact Origin/Host, CSRF/fetch-metadata policy, Authorization עסקית, request binding ו־idempotency. ‏SameSite=Lax הוא שכבה אחת בלבד ואינו פטור מבקרות Connect.

13.5.5.3 Browser אינו משתמש ביכולת של Clerk לשלוח Session token כ־custom Bearer ל־cross-origin Backend. כך נשלל מסלול שבו XSS גונב Token וקורא ישירות ל־Railway. ‏CSP/Trusted Types/output encoding, dependency patching ו־Connect-session revocation נשארים הגנות נפרדות; אף אחת אינה מוצגת כתחליף לאחרת.

13.5.6 Railway מפיק Tenant רק מ־Organization claim מאומת ומ־server mapping עדכני. תנאי הקבלה כולל שני טאבים בשני Organizations, החלפת Focus, בקשות רקע מקבילות, Claim ישן, Membership שהוסר וניסיון החלפה ב־URL/Header/Cookie.

13.6 משימת Role matrix.

13.6.1 למפות את תפקידי האפיון אל Capabilities קנוניות ולא אל שמות Route או כפתור.

13.6.2 לכל Capability להגדיר Read, Create, Approve, Execute, Export, Delete, Configure ו־Admin בנפרד.

13.6.3 System Admin נשאר Realm נפרד מתפקידי לקוח; Membership ב־Tenant אינו מעניק System privilege.

13.6.4 פעולות מסוכנות כגון Bulk export, Campaign approval, Credential rotation, Retention execution ו־Break-glass דורשות Capability ייעודית ולעיתים אישור נוסף.

13.6.5 אין Role שמקבל הרשאה חדשה אוטומטית כאשר Feature נוסף; ברירת המחדל היא Deny.

13.6.6 תנאי הקבלה הוא Authorization matrix עם Positive test אחד ו־Negative test אחד לפחות לכל Capability.

13.7 משימת הזמנות D01.

13.7.1 Invitation נוצרת בשרת עם Tenant, Email canonical, Requested role, Inviter, Created time ו־Expiry של 72 שעות.

13.7.2 מותרת הזמנה פעילה אחת בלבד לאותו Tenant ויעד; ניסיון כפול מחזיר את אותה עובדה או Conflict ואינו שולח הודעה נוספת.

13.7.3 לאחר Accepted, Revoked, Expired או Terminal failure מותרת הזמנה חדשה עם Identity נפרדת.

13.7.4 Acceptance חייב לאמת שה־Email ב־Session תואם להזמנה בהתאם למדיניות Case/canonicalization, שה־Tenant עדיין פעיל ושה־Role עדיין מותר.

13.7.5 Invitation token לא נשמר גולמי ב־Audit או Log; Replay אחרי Acceptance או Revocation נכשל.

13.7.6 שינוי Role לאחר שליחת הזמנה אינו מעדכן בשקט את ההזמנה; נדרשת Revocation והזמנה חדשה.

13.7.7 תנאי הקבלה הוא Matrix ל־expiry boundary, concurrent accept, wrong email, wrong org, revoked inviter, suspended tenant ו־replay.

13.8 משימת Authentication policy.

13.8.1 כל משתמש אנושי ב־Closed pilot חייב MFA לפי D17-A1. Owner, Admin, System Admin, Support, Finance, Security ו־Control planes חייבים Phishing-resistant sign-in באמצעות Passkey/WebAuthn או Hardware key כאשר הספק תומך, עם שני Authenticators רשומים; TOTP הוא חריג זמני מתועד עם Expiry ואינו נחשב מקביל ל־WebAuthn.

13.8.2 להפעיל Clerk session tasks כך שמשתמש עם דרישת MFA או השלמת פרופיל אינו עוקף אותה דרך API ישיר.

13.8.3 להגדיר Session lifetime, inactivity, concurrent sessions ו־device/session revocation. Sensitive-action step-up הוא חוזה נפרד: צד השרת בודק Fresh verification/`fva`, אוסר graceful downgrade וקושר `session.reverification_id` לפעולה יחידה. אם Clerk אינו מוכיח second factor טרי לפעולת P0/P1, הפעולה חסומה או דורשת Maker-checker נוסף.

13.8.4 Recovery אינו נשען על Support override יחיד. MFA reset הוא Workflow הכולל Identity verification מתועד, Session revocation, Security notification, Privilege freeze, Re-enrollment, Audit ו־Escalation; Recovery אינו מוריד Assurance בשקט.

13.8.5 Login errors אינם מאשרים אם Email קיים או אם הוא Admin.

13.8.6 כל Runtime מאמת `issuer`, ‏`audience`, ‏`authorizedParties/azp`, Token type, ‏`exp`, ‏`nbf`, דוחה `sts=pending`, ומוודא Organization ומיפוי Membership עדכני. תנאי הקבלה הוא Session theft, revoked session, wrong issuer/audience/azp/type, MFA downgrade, clock skew, stale organization claim, lost device ו־recovery.

13.9 משימת Clerk webhook synchronization.

13.9.1 לאמת Webhook signature על Raw body, להגביל Size ולהשתמש ב־Replay/Dedup ledger לפי `svix-id` ובנוסף Semantic event identity.

13.9.2 Events אינם מקור הרשאה יחיד; מצב רגיש נבדק מול Clerk או מקור Connect המאושר לפי Failure policy.

13.9.3 Event out-of-order אינו מחזיר Member שהוסר למצב פעיל.

13.9.4 כשל Synchronization מייצר Alert ו־Fail-closed לפעולה רגישה, לא Silent fallback.

13.9.5 להפעיל Reconciliation תקופתי של Organizations/Memberships מול Clerk ו־Fresh lookup לפעולות P0/P1 כאשר חלון Stale אינו מתקבל. תנאי הקבלה הוא Replay, duplicate, asynchronous failure, delayed removal, deleted organization, stale custom claim ו־signature mutation.

13.10 משימת Offboarding.

13.10.1 הסרת Member מבטלת Session, API access, Pending approvals, Assigned conversations ו־Delegated tokens.

13.10.2 עזיבת Owner דורשת העברת בעלות מאושרת לפני הסרה.

13.10.3 Offboarding של עובד Connect כולל GitHub, Railway, Vercel, AWS, Clerk, Meta, OpenAI, Better Stack ו־Vault באותו Checklist.

13.10.4 תנאי הקבלה הוא Offboarding rehearsal שבו משתמש מוסר אינו מצליח לקרוא, לשלוח, לייצא או לאשר.

13.11 משימת UI מאובטח ונגיש.

13.11.1 כפתור מוסתר אינו בקרת הרשאה; API אוכף כל Capability מחדש.

13.11.2 UI מסביר מדוע פעולה חסומה בלי לחשוף מידע של Tenant או Role אחר.

13.11.3 Dialog של Invitation, Role change ו־Revoke תומך Escape, Focus trap, Focus ראשוני, החזרת Focus ו־Keyboard only.

13.11.4 פעולה שאינה מחוברת מושבתת עם הסבר נגיש ולא מוצגת כפעילה.

13.12 Evidence הוא Role matrix, Clerk configuration export מושחר, Invitation ledger tests, Session security report ו־Offboarding rehearsal.

13.13 Rollback הוא השבתת Invitation/Role mutation, Revocation של Sessions ו־חזרה למצב Read-only; אין להחזיר Membership שהוסר בלי אישור חדש.

13.14 Gate 8 נסגר רק לאחר Organization binding, Role matrix, MFA/session policy, Invitation lifecycle ו־Offboarding מוכחים.

## 14. שלב 9 — Meta Business onboarding, נכסים ו־Credentials

14.1 מטרת השלב היא לחבר WhatsApp Cloud API רשמי לנכסי בדיקה מאושרים, בלי לשתף Token ובלי לערבב נכסי לקוח או משפחה בנכסי החברה.

14.2 זמן משוער לשלב הוא 40–72 שעות עבודה נטו, לא כולל זמני Meta business verification, Template approval או Porting שאינם ידועים.

14.3 תלות השלב היא Gates 3, 6–8 ו־D20.

14.4 הבעלים הנדרש הוא Meta integration owner; טל מאשר Rate-limit evidence, Security מאשר Credentials ו־Product מאשר Pilot asset.

14.5 משימת נכסי Meta.

14.5.1 ליצור Inventory של Business portfolio, App, WABA, Phone number, Phone Number ID, System user, Webhook subscription ו־Approved permissions.

14.5.2 להשתמש ב־Test WABA ובמספר בדיקה תחילה; אין להשתמש ב־Credential של האב או של עסק אחר בלי Authorization כתוב, Scope, Expiry ו־Revocation plan.

14.5.3 להפריד Staging ו־Production ככל ש־Meta מאפשר; כאשר נכס משותף זמנית, להגדיר Safelist קשיחה ומגבלת Recipient.

14.5.4 לתעד Ownership משפטי וטכני של כל נכס ואת מי שפונים אליו במקרה Lockout.

14.5.5 תנאי הקבלה הוא Inventory עם צילום/Export מתוארך, בלי Secret values.

14.6 משימת הרשאות וגישה.

14.6.1 להעניק ל־System user רק Permissions הנדרשות לפעולות שאושרו ולבדוק מחדש את הרשימה מול Meta docs בזמן הביצוע.

14.6.1.1 מדריך ה־Production שנבדק מציג `business_management`, ‏`whatsapp_business_messaging` ו־`whatsapp_business_management`, אך אין להניח שכל מסלול דורש תמיד את שלושתן. לכל פעולה בונים Permission-to-operation matrix ומסירים Scope שאינו נדרש.

14.6.2 לא להשתמש ב־Personal access token כ־Production credential קבוע.

14.6.3 לא לשלוח Token ב־AnyDesk, Chat, Email, GitHub issue או מסמך; הכנסת Secret נעשית ישירות ל־Vault בידי Owner מורשה.

14.6.4 לבצע Quarterly access review ולבטל משתמש, App role או System user שאינם נדרשים.

14.6.5 תנאי הקבלה הוא Principle-of-least-privilege test ו־Revocation rehearsal.

14.6.6 לפני הפעלת Credential לבצע `debug_token` מתוך Backend מאושר ולאמת `is_valid`, ‏`app_id`, subject/user כאשר זמין, expiration/data-access expiration, normalized scopes ו־`granular_scopes.target_ids`. היעדר `target_ids` אינו מפורש אוטומטית כדחייה או הרשאה; הוא נבדק מול משמעות ה־Scope וה־asset graph.

14.6.7 Raw bearer token אינו נכנס ל־Digest, Log או Evidence. Binding מדויק משתמש ב־Vault reference/generation וב־keyed fingerprint פנימי רק אם Security מאשר את הצורך ואת מנגנון המפתח.

14.6.8 ה־Cloud API documentation הרשמי ב־Meta Postman, שנפתח ב־26.08.2026, מתאר User access token שפג לאחר 24 שעות ו־System user token שיכול להימשך עד 60 יום או להיות ללא תפוגה. אלה אפשרויות ספק כלליות ולא Policy של Connect: User token מותר רק ל־Setup/Testing מבוקר; Production משתמש ב־System user בעל Scope מזערי ובמשך החיים הקצר ביותר שהמסלול החי תומך בו. Token ללא תפוגה נשאר אסור כברירת מחדל ודורש החלטת Security שמית, Rotation/Revocation drill, Compensating controls ו־Evidence שהחלופה בת־התפוגה אינה ישימה. ‏`debug_token`, ‏Vault revision, expiry/data-access expiry ו־rotation-before-expiry הם Preconditions לכל הפעלה.

14.7 משימת Credential vault ו־revision ledger.

14.7.1 להצפין Access token, App secret ו־Webhook verification secret בנפרד עם Key version ו־Environment binding.

14.7.2 לכל שינוי Credential ליצור Revision מונוטוני, Envelope digest ו־Event key קנוניים; אין לעדכן בשקט Record קיים.

14.7.3 Runtime טוען Credential רק בהתאמה מדויקת של Tenant, Revision, Envelope digest ו־Event key.

14.7.4 Revision ישן נכשל; אין Fallback ל־Latest ואין שמירת Ciphertext היסטורי בלי החלטת Retention מפורשת.

14.7.5 Plaintext חי רק בתוך Callback צר, אינו מוחזר ל־Caller ואינו מופיע ב־Error, Telemetry או Evidence.

14.7.6 Rotation בזמן Barrier של שליחה נחסמת; לפני או אחרי Barrier היא מותרת לפי State machine ומביאה לכשל סגור של Binding ישן.

14.7.7 תנאי הקבלה הוא Negative suite ל־old revision, tenant swap, digest mismatch, event mismatch, ciphertext/IV mutation ו־rotation race.

14.8 משימת Graph version ו־Capabilities.

14.8.1 לא להקשיח בתוכנית את גרסת Graph העדכנית; ליצור Registry מתוארך עם Version, Deprecation date, Required fields, Error mapping ו־Owner.

14.8.1.1 Baseline המחקר ב־26.08.2026 הוא `v25.0` והפעולה המאושרת היא `POST https://graph.facebook.com/v25.0/{Phone-Number-ID}/messages`. ה־Registry מקבע ערך זה ל־Release הראשון אך מבצע Freshness/compatibility review לפני הביצוע; אין לטעון ש־v25 היא הגרסה הגלובלית האחרונה או להמציא EOL כאשר Meta מציגה `TBD`.

14.8.1.2 לאפשר רק Origin ‏`https://graph.facebook.com`, ‏HTTPS, Method ‏`POST`, operation shape המדויק ו־Graph version המאושרת. בקשה ללא Version חסומה גם אם Meta עשויה לנתב אותה לגרסה זמינה ישנה.

14.8.2 Production מאשר Version יחידה בכל Release ו־Transport חוסם Version אחרת.

14.8.3 Changelog review מתוזמן יוצר Issue לפני חלון Deprecation וכולל Regression ב־Staging.

14.8.4 Capability discovery אינו נותן הרשאה; Phone/WABA/Template identities נבדקות מול ה־DB המאושר.

14.8.5 תנאי הקבלה הוא Staging call Read-only שמוכיח נכס, Version ו־Permissions בלי לחשוף Token.

14.8.6 Read-only discovery מוכיח שה־WABA המאושר מכיל את `Phone-Number-ID` המאושר; WABA ID, Phone Number ID, Business ID, display number ו־`wa_id` נשמרים כשדות שונים ואינם עוברים Normalization שמאחד אותם.

14.9 משימת Onboarding wizard.

14.9.1 למפות כל צעד מתוך עשרת צעדי האפיון ל־State durable, Owner, Validation, Resume, Cancel ו־Support path.

14.9.2 צעדים התלויים ב־Meta מציגים `ממתין לאישור`, `נכשל` או `מוכן` מתוך Evidence ולא מתוך Timer או הנחה.

14.9.3 Refresh של Browser או Login חדש ממשיכים מאותה נקודה בלי לשכפל App, WABA, Webhook או Credential.

14.9.4 ביטול Onboarding מבטל Pending jobs, מסיר Credential references שאינן נדרשות ושומר Audit לפי Retention.

14.9.5 תנאי הקבלה הוא Resume/Cancel/Retry לכל צעד ו־Failure injection לכל ספק.

14.10 משימת Disconnect ו־Incident.

14.10.1 Disconnect מכבה Outbound ו־Webhook processing לאותו Connection לפני Revocation.

14.10.2 לבצע Drain, לשמור Outcomes לא ודאיים, לבטל Token/System user subscription ולוודא שאין Worker עם Credential ישן.

14.10.3 Token compromise מפעיל Kill switch, Rotation, Session/worker drain, Scope review ו־Incident timeline.

14.10.4 תנאי הקבלה הוא Disconnect/compromise tabletop ו־Live revocation ב־Staging.

14.11 Evidence הוא Asset inventory, Permission proof, Credential rotation report, Graph registry, Onboarding state tests ו־Disconnect rehearsal.

14.12 Rollback הוא השבתת Connection, ביטול Credential, הסרת Webhook subscription ו־חזרה ל־Test asset; אין מעבר אוטומטי ל־Unofficial WhatsApp.

14.13 Gate 9 נסגר רק לאחר Asset ownership, Least privilege, Vault revision, Graph registry, Test WABA proof ו־Disconnect rehearsal.

## 15. שלב 10 — Webhook ingress מאומת ועמיד ל־Replay

15.1 מטרת השלב היא לקבל אירועי Meta ו־Clerk בלי לאפשר זיוף, Replay, ערבוב Tenant או שינוי מצב לאחור.

15.2 זמן משוער לשלב הוא 44–72 שעות עבודה נטו.

15.3 תלות השלב היא Gates 6.1, ‏6.2, ‏7, ‏8 ו־9; ‏Gate 6.3 נדרש רק אם אותו Ingress מקבל Upload/Knowledge/Media.

15.4 הבעלים הנדרש הוא Backend integration owner; Security ו־Database מבצעים Review.

15.5 משימת Endpoint verification.

15.5.1 להפריד GET verification מ־POST delivery ולהגדיר Methods, Content types, Size limits ו־Timeouts סגורים.

15.5.2 Verification token נשמר ב־Vault ונבדק Constant-time באמצעות Primitive ספרייה מאושר כאשר רלוונטי.

15.5.3 Challenge מוחזר רק כאשר Mode, Token ו־Request shape מדויקים; Error אינו מגלה את הערך הצפוי.

15.5.4 תנאי הקבלה הוא Negative suite ל־wrong method, duplicate parameter, encoded token, oversized challenge ו־timing noise.

15.6 משימת Signature verification.

15.6.1 לשמור Raw body bytes לפני JSON parsing ולחשב את חתימת Meta לפי התיעוד הרשמי וה־App secret המאושר.

15.6.2 כל שינוי Byte, Header חסר, Algorithm שגוי, Digest לא קנוני או Secret revision לא תואם נכשל לפני Queue ו־DB mutation עסקי.

15.6.3 Rotation של App secret משתמשת בחלון גרסאות מפורש וקצר; אין ניסיון מול רשימה בלתי־מוגבלת.

15.6.4 Parser רואה את הגוף רק לאחר Verification ו־Size check.

15.6.5 תנאי הקבלה הוא Test vectors רשמיים או מקומיים קנוניים, mutation בכל Byte ו־proof של אפס Side effects בכשל.

15.7 משימת Normalization.

15.7.1 להגדיר Envelope schema סגור לכל סוג Event נתמך ולהתייחס לשדה לא מוכר כ־Forward-compatible evidence, לא כהרשאה.

15.7.2 לחלץ WABA, Phone Number ID, Message ID, Recipient/Contact identity, Event type ו־Provider timestamp רק לאחר Validation.

15.7.3 למפות Connection לפי נכס Meta בשרת; Tenant ID לעולם אינו נלקח מה־Webhook body כמקור סמכות.

15.7.4 Event שאינו ניתן למיפוי נשמר מושחר ל־Quarantine תפעולי ומתריע, בלי לנחש Tenant.

15.7.5 תנאי הקבלה הוא Cross-asset swap, unknown field, missing nested object, duplicate JSON key ו־Unicode edge cases.

15.8 משימת Dedup, replay ו־ordering.

15.8.1 לבנות Event identity דטרמיניסטית מ־Provider identifiers, Connection ו־Event kind, עם Raw-body digest ל־Audit.

15.8.2 לכתוב Ingress ledger לפני Acknowledgement עסקי; Duplicate מקבל Ack בטוח אך אינו יוצר Job או Transition נוסף.

15.8.3 Status reducer מונוטוני; Delivered אינו חוזר ל־Sent בגלל Event מאוחר, ו־Failed conflict נשמר ל־Reconciliation.

15.8.4 Timestamp של Provider אינו מחליף Server receive time ומשמש רק להקשר לאחר Range validation.

15.8.5 Replay window ו־Retention של Ledger נקבעים לפי Provider behavior, Audit ו־Legal review ולא לפי ניחוש קצר.

15.8.6 תנאי הקבלה הוא Duplicate, concurrent duplicate, out-of-order, delayed event, reused ID ב־Connection אחר ו־crash-after-ledger.

15.9 משימת Fast acknowledgement ו־Queue handoff.

15.9.1 Endpoint מבצע Verification, Minimal normalization ו־Durable ingress בלבד; עיבוד כבד עובר ל־Worker.

15.9.2 Job payload מכיל Ingress record key ו־digest בלבד, לא Message body או מספר טלפון.

15.9.3 Acknowledgement אינו נשלח לפני Durable commit; כשל אחרי Commit ולפני Ack נסגר באמצעות Dedup ב־Replay.

15.9.4 Queue outage מפעיל Persisted pending state ו־Alert; אין אובדן Event ואין Loop של Retry לא מבוקר.

15.9.5 תנאי הקבלה הוא Crash injection בכל נקודה בין Raw read, verify, commit, enqueue ו־Ack.

15.10 משימת Abuse ו־DoS controls.

15.10.1 להגדיר Body limit, Connection limit, Request rate, Parsing budget ו־Maximum batch entries.

15.10.2 Signature invalid flood אינו יוצר Log flood עם Body או Cardinality גבוהה.

15.10.3 Route אינו מבצע DNS, File download, AI call או Provider call בזמן Ingress.

15.10.4 Alert מבדיל בין Invalid signature, Unknown asset, Schema drift, Queue failure ו־Processing lag.

15.11 משימת Inbound conversation state.

15.11.1 Inbound message יוצר או מעדכן Contact/Conversation רק לאחר Tenant binding, Policy ו־Data minimization.

15.11.2 Media reference נשאר לא־נגיש עד Download מאושר, Size/type control וסריקה לפי Policy.

15.11.3 Automation אינה מגיבה אם Connection, Consent context, Bot version או Kill switch אינם תקפים.

15.11.4 Human handoff, opt-out keyword ו־block signal מקבלים קדימות על Bot.

15.12 Evidence הוא Signature suite, Ingress/replay ledger report, Crash matrix, Load test ו־Staging webhook trace מושחר.

15.13 Rollback הוא השבתת Processing תוך השארת Verification ו־Durable quarantine, ביטול Subscription אם יש תקיפה ושחזור Replay מבוקר.

15.14 Gate 10 נסגר רק לאחר Signature, Asset binding, Dedup, Ordering, Durable Ack, DoS control ו־Staging webhook evidence.

## 16. שלב 11 — WhatsApp ו־Connect Rate limits, איכות וקיבולת

16.1 מטרת השלב היא למנוע חסימה, פגיעה באיכות, שליחה כפולה או העדפת Tenant אחד באמצעות שכבות קצב הנגזרות ממצב Meta חי.

16.2 אומדן ROM מתוקן לשלב הראשוני הוא 84–146 שעות אדם, ואחריו 4–8 שעות מחקר וביקורת בכל שינוי מהותי במדיניות Meta. זמן המתנה ל־Meta או לנתוני חשבון אינו זמן עבודה אך מופיע בנפרד ב־DAG.

16.3 תלות השלב היא Gates 7, 9 ו־10 ו־D04.

16.4 הבעלים הוא טל למחקר Meta ולמדיניות Connect; Backend ו־Operations מיישמים ובודקים, Product מאשר Tradeoffs.

16.5 משימת Registry רשמי ומתוארך.

16.5.1 לאסוף רק ממקורות Meta רשמיים וממסכי חשבון מורשים את כל ממדי ההגבלה הנצפים בזמן הביצוע.

16.5.2 לתעד בנפרד Throughput טכני, Messaging limits, Quality rating, Template status, Marketing frequency controls, Pair/recipient behavior, Error codes ו־Retry guidance.

16.5.3 לכל ערך לשמור Source URL או צילום מורשה, Account/WABA/Phone scope, Effective date, Checked by, Confidence ו־Expiry.

16.5.4 ערך שאינו פומבי, אינו זמין בחשבון המדויק או אינו קשור ל־Graph/API version הנוכחי מסומן `unknown/unavailable` ואינו מומצא. עבור רכישת Permit חדש ל־Outbound ברירת הבטיחות היא cap אפס; Inbound/read-only נשלטים במסלולי Gate נפרדים. אין fallback מספרי היסטורי.

16.5.5 Changelog ו־Dashboard review מתבצעים לפני Release ובתדירות שבועית בזמן Pilot.

16.5.6 תנאי הקבלה הוא Registry ללא מספר בלתי־מתוארך וללא Claim שאי־אפשר לשחזר.

16.5.7 רענון 27.08.2026 הצליח לקרוא את תיעוד Meta הרשמי החדש ואת ארבעת חוזי ה־Preview של WhatsApp Business Platform. הממצאים הבאים הם עובדות מקור מתוארכות, אך מספר שפורסם בתיעוד הוא גבול מוצר כללי ולא Entitlement של נכס Connect. ‏Permit חי עדיין דורש Snapshot מן ה־Business portfolio, ‏WABA, ‏Phone, ‏App ו־Graph version המדויקים.

16.5.7.1 דף [About the WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform), שעודכן 04.08.2026, ודף [Throughput](https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput), שעודכן 17.06.2026, מאמתים עד 80 הודעות לשנייה כברירת מוצר לכל מספר רשום ועד 1,000 בהעלאה אוטומטית. הספירה כוללת יחד Inbound, ‏Outbound וכל Message type. מספר שמשמש במקביל WhatsApp Business App ו־Cloud API מוגבל לפי התיעוד ל־20 הודעות לשנייה. אלה `source-verified-published-ceilings`, לא התחייבות או Permit ל־Connect.

16.5.7.2 ‏Runtime קורא את `throughput` דרך WhatsApp Business Phone Number API, קושר את ה־Snapshot ל־Business portfolio, ‏WABA, ‏Phone, ‏App, ‏Graph version וזמן, ומחשב `effectivePermit=min(liveProviderCapability, portfolioMessagingLimit, phoneThroughput, recipientPairLimit, phoneQuality, templateState, consentAndSuppression, customerServiceWindow, geography, costBudget, ConnectSafetyCap, queueAndDatabaseCapacity)`. לפני Probe חי, כאשר ה־Snapshot פג או כאשר אחד הרכיבים Unknown, ‏Outbound cap הוא אפס; אין נפילה אוטומטית ל־80, 20, 1,000 או Tier שפורסם.

16.5.7.3 Pair rate הרשמי הוא הודעה אחת בכל שש שניות לאותו נמען, כלומר כ־0.17 לשנייה, כ־10 בדקה וכ־600 בשעה; חריגה מחזירה `131056`. התיעוד מאפשר Burst של עד 45 אשר לווה מהקיבולת העתידית וממליץ על `4^X` שניות לאחר Failure. החלטת Connect מחמירה יותר: אין Burst יזום, Recipient bucket הוא Durable, Retry הוא bounded, ו־Stagger בין Jobs נגזר באופן דטרמיניסטי מ־HMAC של מזהי Tenant/Recipient/Intent ולא מ־`Math.random()` או Random ID.

16.5.7.4 ‏`130429` מאומת כחריגה מ־Phone throughput; ‏`131057` מאומת כ־Maintenance mode, לרבות חלון Upgrade שיכול להימשך עד דקה; ‏`131048` מאומת כהגבלת Phone עקב Blocks או Spam; ו־`131064` מאומת כהגבלת Account עקב הפרות סיווג Template. ‏`130429` נכנס ל־bounded backoff; ‏`131057` עוצר את המספר ומחייב Capability refresh; ‏`131048` ו־`131064` פותחים Policy/Quality circuit breaker ואינם Blind retry.

16.5.7.5 ‏`131047` מאומת כשליחה מחוץ לחלון 24 שעות של Recipient reply. אין להמיר אוטומטית הודעה רגילה ל־Template: Template הוא Intent חדש בעל Payload, ‏Category, ‏Language, ‏Consent/context, ‏Content approval, ‏Cost, ‏Permit ו־Digest חדשים.

16.5.7.6 דף [Messaging Limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits), שעודכן 21.05.2026, גובר על Guidance היסטורי: המגבלה היא מספר משתמשי WhatsApp ייחודיים שאליהם נמסרו הודעות מחוץ לחלון שירות בחלון נע של 24 שעות, והיא משותפת לכל המספרים ב־Business portfolio. Portfolio חדש מתחיל לפי המקור ב־250 ועשוי לעלות ל־2,000, 10,000, 100,000 ו־Unlimited. מקור האמת החי הוא `whatsapp_business_manager_messaging_limit`; ‏`messaging_limit_tier` הישן Deprecated. מספר אחד יכול לצרוך את כל מגבלת ה־Portfolio, ולכן Reservation חייב להיות ברמת Portfolio ולא רק Phone.

16.5.7.7 Business Messaging Policy מחייבת Phone number ו־Opt-in, כיבוד Opt-out בכל ערוץ, Template מאושרת לשיחה יזומה ומחוץ לחלון 24 השעות, ומסלול Human escalation מהיר, ברור וישיר כאשר Automation משיבה. Connect בודק Consent, ‏Suppression, ‏Window, ‏Intent, ‏Template ו־Handoff לפני כל ניסיון; Capacity לעולם אינה עוקפת אותם.

16.5.7.8 איכות Message נמדדת לפי שבעת הימים האחרונים במשקל Recency, בין השאר על בסיס Block, ‏Report, ‏Mute ו־Archive. איכות Phone יכולה להשתנות בתוך דקות. לכל Template יש `GREEN`, ‏`YELLOW`, ‏`RED` או `UNKNOWN`; ‏Pacing משתמש בסף ש־Meta אינה מפרסמת, עשוי להחזיר `held_for_quality_assessment`, לשחרר הודעות או להפילן עם `132015` לאחר Pause. לכן Tier מספרי לבדו אינו Capacity, ואין לנחש את סף ה־Pacing.

16.5.7.9 לתחומי ניהול WABA המפורטים בתיעוד הרשמי — WABA read, ‏assigned_users, ‏phone_numbers, ‏message_templates, ‏subscribed_apps ו־phone-status — התקרה המתועדת היא 200 Requests לשעה לכל App/WABA כברירת מחדל או 5,000 לכל App/WABA פעיל שיש בו לפחות מספר רשום. Credit-line endpoints המתועדים הם 5,000 לשעה. אלה גבולות Product ולא Entitlement; ‏Connect קורא `X-App-Usage`/`X-Business-Use-Case-Usage`, כולל `call_count`, ‏`total_cputime`, ‏`total_time` ו־`estimated_time_to_regain_access`, ושומר מרווח בטיחות. הנוסחה ההיסטורית `1,800,000 × phones` מבוטלת ואסורה.

16.5.7.10 Error taxonomy הרשמי שנבדק כולל: `4` App API call limit; ‏`80007` WABA rate; ‏`130429` throughput; ‏`131048` spam/quality restriction; ‏`131056` pair; ‏`131057` maintenance/upgrade; ‏`131064` classification restriction; ‏`131047` service-window; ‏`131049` healthy-ecosystem/per-user marketing; ‏`131050` marketing opt-out; ‏`132015` paused template; ‏`132016` permanently disabled template. כל Code לא מוכר נשמר Raw+Redacted, עוצר Blind retry ונכנס ל־Discovery לפני Classification. Error code, ולא HTTP status או Subcode לבדם, הוא מפתח המדיניות.

16.5.7.11 חוזה ה־Webhook הרשמי מחייב Public endpoint עם TLS תקף; Self-signed certificate אינו נתמך. ‏GET verification משווה exact verify token ומחזיר Challenge רק בהתאמה. ‏POST מאומת על ה־Raw body באמצעות HMAC-SHA256 מול `X-Hub-Signature-256`; השוואה היא Constant-time. ‏mTLS נתמך ומועדף על IP allowlist משתנה. Payload עשוי להגיע עד 3MB, POST עשוי לאגד עד 1,000 Updates, כשל נשלח מחדש עד שבעה ימים ויוצר Duplicates. הקבלה חייבת להיות idempotent, bounded ומופרדת מ־Async processing.

16.5.7.12 שרת Webhook מתוכנן לפחות ל־3× קצב ה־Outbound status events ועוד 1× קצב ה־Inbound הצפוי; יעד Meta הוא Median שאינו עולה על 250ms ופחות מאחוז אחד מעל שנייה. ‏200 מוחזר רק לאחר אימות ו־durable acceptance, לא לאחר השלמת Business processing. ‏Load test מכסה Concurrent delivery, Batch 1,000, Payload 3MB, Retry שבעה ימים, Duplicate, Reorder, delayed status ו־Poison payload.

16.5.7.13 מגבלת Marketing per-user היא Dynamic ולא מספר פומבי. ‏`131049` מחייב המתנה של לפחות 24 שעות לפני ניסיון נוסף; Retry חוזר בתוך החלון עלול לחסום עוד ניסיונות עד 24 שעות. ‏`131050` הוא Opt-out ואסור Retry עד `user_preferences` מאומת שמראה Resume. נכון לבדיקה, Meta אינה מוסרת Marketing templates למספרי ארצות הברית; תחולת מדינות משתנה ונקראת ממקור רשמי חי. Geo/engagement suppression הוא Gate עצמאי.

16.5.7.14 ארבעה חוזי Preview רשמיים ל־WhatsApp Business Platform נלכדו ב־27.08.2026 והם מצהירים על תחולה מ־23.09.2026: Meta Terms, ‏Cloud API Terms, ‏Marketing Messages API Terms ו־WhatsApp Terms for Platform. ‏Inbox in Meta Business Suite הוא חוזה חמישי, אך אינו חל על Connect כל עוד המוצר אינו משתמש ב־Meta Inbox. לפני ה־Effective date נדרשים Exact English-US bytes, ‏retrieval metadata, ‏SHA-256, ‏old/new semantic diff, ‏Legal hierarchy, ‏account acceptance evidence ו־Regression mapping; Preview text הוא מקור עתידי רשמי, אך אינו מחליף את התנאים הנוכחיים לפני תחולתו.

16.5.7.15 Meta Terms החדשים מגדירים `Solution Provider` רק כצד שלישי המורשה להשתמש ב־API עבור Client, מוסיפים `Messaging Account`, חובות אבטחת Account/credentials והודעת Breach מיידית, Rate Card והשעיה בגין תשלום/Spending limit, Prohibited Information ואי־הבטחה לענפים בעלי סודיות מוגברת, Beta risk, דיווח בתוך 30 ימים לפי דרישה, איסור Profile/Resale/Scraping/Reverse engineering, ואיסור AI-primary כאשר הוא חל. ‏WhatsApp Platform Data לא תשמש Training/Improvement של AI שאינו Exclusive-use fine-tune מותר. ‏Connect אינה טוענת להרשאת Solution Provider עד Evidence כתוב מ־Meta ו־Legal memo.

16.5.7.16 Cloud API Terms החדשים קובעים Meta כ־Processor במסגרת ה־DPT הרלוונטי, כוללים Phone, message content, identifiers ו־message details ב־Company Personal Data, ומצהירים על Return לפי בקשת Company או מחיקה בתוך 90 ימים לאחר סיום, בכפוף לחוק ול־Backup persistence. הם אינם הופכים את Meta לארכיון של Connect. ‏Subprocessor list ו־Local Storage choice נלכדים כ־Artifact נפרד; שינוי בהם מפעיל Vendor/privacy review.

16.5.7.17 ‏Marketing Messages API הוא מוצר One-way נפרד שאינו תומך בשיחה דו־כיוונית, מחיל Data-sharing controls, Matching ו־Optimization-model uses, Partner/Client liability, Opt-in/Opt-out, Geo limits וחוזה נוסף. החלטת Pilot היא לא להשתמש בו: `marketingMessagesApiEnabled=false`, ‏Event Sharing כבוי ואין Enrollment. Campaigns ב־Pilot משתמשים רק ב־Cloud API וב־Approved templates. פתיחה עתידית דורשת Decision amendment, Legal/DPA, live availability, message-level data-sharing control, cost/effectiveness evidence ו־חבילת WBS מותנית.

16.5.7.18 ‏Meta Inbox אינו Backend של Connect ואינו מקור אמת. `metaBusinessSuiteInboxEnabled=false`; תנאיו ומסלול Data license/retention חלים רק אם אדם מוסמך מפעיל אותו במפורש לאחר Data-flow ו־Legal review. שימוש ידני חיצוני ב־Meta Inbox אינו מסנכרן אוטומטית Ownership, read state או Audit לתוך Connect.

16.5.7.19 תנאי Business Solution מ־06.03.2026 ותנאי Service Provider מ־12.06.2018 ממשיכים להישמר כ־Current sources עד ש־Meta/WhatsApp מפרסמות Deprecation או Legal קובע Hierarchy. אין להסיק שה־Preview ביטל חובות Client acceptance, WABA authority, support, transfer או deletion. לפני 23.09.2026 ואחריו התחולה לכל מסמך מסומנת `applies`, ‏`does-not-apply` או `unknown/unavailable` עם נימוק חתום; Unknown שומר Multi-client onboarding ו־Partner claim כבויים.

16.5.7.20 תנאי קבלה לרענון זה: אין עוד Claim שה־Platform preview אינו נגיש; אין שימוש במספר שפורסם כ־Live entitlement; אין MM API או Meta Inbox ב־Base; כל Limit/Error/Term מקושר ל־URL, ‏updated/effective date, ‏Scope, ‏Expiry, ‏Safe state, ‏Owner, ‏Test ו־Evidence; ו־Tal מאשר את מדיניות Connect rate-limit לאחר Legal/Product/Meta review מבלי להפוך לבעל תפקיד משפטי או תפעולי אחר.

16.5.8 מדיניות Freshness המספרית הבאה היא Connect safety policy ולא טענה שמספר זה נקבע בידי Meta.

16.5.8.1 Throughput/phone capacity שנקרא מ־Graph API תקף חמש דקות לרכישת Permit חדש. בגיל חמש עד חמש־עשרה דקות מותר רק Conservative cap מאושר שאינו גדול מה־Snapshot האחרון ומה־Pilot cap. מעל חמש־עשרה דקות Outbound חדש חסום עד Refresh.

16.5.8.2 Template status, phone registration/health ו־WABA/asset binding נבדקים Event-driven וב־Polling; Snapshot תקף חמש דקות ל־Campaign admission וחמש־עשרה דקות ל־Human single-send. מעל הסף המתאים הפעולה נחסמת, ולא יורשת Status ישן.

16.5.8.3 Quality ו־complaint/disable indicators מתרעננים לפחות כל חמש דקות בזמן Campaign פעיל ולפחות כל חמש־עשרה דקות בזמן Pilot ללא Campaign. Event של Downgrade, Pause, Disable או Credential problem גובר מיד על Cache ופותח Circuit breaker.

16.5.8.4 Error-code, Policy ו־official documentation registry נבדקים לפני כל Release, אחת לשבעה ימים בזמן Pilot ובתוך ארבע שעות עבודה מרגע הופעת Code/Field לא מוכר. Unknown נשאר Fail-closed ואינו מקבל סיווג זמני אופטימי.

16.5.8.5 כל Snapshot שומר `observedAt`, `effectiveAt` אם קיים, `expiresAt`, Source identity, Account/WABA/Phone scope, Graph version, Response digest, Reader identity ו־Refresh result. Clock skew מעל 30 שניות, Refresh כושל או Scope mismatch מבטלים את ה־Snapshot.

16.5.8.6 בדיקות קבלה מכסות בדיוק את הגבולות 4:59, 5:00, 14:59 ו־15:00 דקות, Clock rollback/forward, Event שמגיע בזמן Cache, Refresh מקביל, Snapshot של Phone אחר ו־Process restart. Dashboard מציג `fresh`, `degraded`, `expired` או `unknown`; הוא אינו מציג Green מנתון Expired.

16.6 משימת שכבות Connect limiter.

16.6.1 שכבה 1 היא Emergency global kill switch.

16.6.2 שכבה 2 היא Provider/WABA/Phone capacity לפי Evidence חי.

16.6.3 שכבה 3 היא Tenant quota ו־Plan entitlement.

16.6.4 שכבה 4 היא Campaign reservation כדי שקמפיין אחד לא ירעיב Inbox או Opt-out.

16.6.5 שכבה 5 היא Recipient/pair cooldown ו־Anti-harassment policy.

16.6.6 שכבה 6 היא Template status, category, language ו־quality eligibility.

16.6.7 שכבה 7 היא Worker concurrency, Queue backpressure ו־Database connection budget.

16.6.8 השכבה המחמירה ביותר קובעת; אין Override שקט משכבה גבוהה לנמוכה.

16.6.9 תנאי הקבלה הוא Test שבו כל שכבה לבדה חוסמת ושילוב שכבות אינו מגדיל קיבולת מעבר למינימום.

16.7 משימת מקור אמת ו־Reservations.

16.7.1 Redis מנהל Token buckets קצרים ו־Fairness אך PostgreSQL מנהל Reservation, Permit, Outcome ו־Quota durable.

16.7.2 Job אינו מקבל הרשאת שליחה רק משום שהיה ב־Queue; Worker רוכש Permit סמוך לניסיון Provider.

16.7.3 Reservation פג תוקף מוחזר רק אם לא קיים Provider attempt או Unknown outcome קשור.

16.7.4 Clock source, TTL ו־Lease semantics נבדקים תחת Clock skew, Worker crash ו־Redis restart.

16.7.5 תנאי הקבלה הוא Rebuild של Redis מתוך DB בלי הגדלת Quota ובלי Double-send.

16.8 משימת Fair scheduling ו־Backpressure.

16.8.1 לקבוע Weighted fair queue בין Tenants, Campaigns, Inbox replies, Opt-out ו־System messages.

16.8.2 Opt-out, human reply ו־security operation מקבלים Priority מוגדרת שאינה מאפשרת Starvation אינסופי של עבודה אחרת.

16.8.3 כאשר Lag, Quality או Provider error עוברים סף, Intake מאט לפני שה־Worker מוצף.

16.8.4 UI מציג Estimate שמבוסס על Capacity snapshot עם זמן מדידה, לא הבטחת מסירה.

16.8.5 תנאי הקבלה הוא Load test רב־Tenant שמוכיח Fairness, bounded lag ו־No starvation.

16.9 משימת Error policy.

16.9.1 לבנות Registry של Meta error codes עם Class: Permanent, Retryable-before-attempt, Unknown-after-attempt, Rate/quality, Credential או Policy.

16.9.2 אין Retry אוטומטי לאחר ניסיון HTTP שתוצאתו אינה ידועה.

16.9.3 Retry מותר רק כאשר מוכח שלא התחיל ניסיון Provider או כאשר Meta מספק Fact חד־משמעי שהבקשה לא התקבלה, ובכפוף ל־Permit חדש ומדיניות מאושרת.

16.9.4 `Retry-After` נבדק כערך bounded; ערך חסר, שלילי, עצום או לא־מספרי אינו שולט במערכת.

16.9.5 Error לא מוכר נכנס ל־Unknown/Manual review ולא למיפוי אופטימי.

16.9.6 תנאי הקבלה הוא Fault injection לכל Class, Retry storm ו־error code drift.

16.9.7 סיווג Meta מבוסס על `error.code` המספרי ועל `error.error_data.details`; אין Contract יציב המבוסס על HTTP status, ‏title/message או `error_subcode` ש־Meta הסירה מגרסאות חדשות.

16.9.8 `fbtrace_id` נשמר מושחר לצורכי Support correlation ואינו הופך כשל ל־Retryable או מוכיח אם Provider קיבל את ההודעה.

16.9.9 בסכמת Message API v25 שנבדקה אין `Idempotency-Key` או חוזה Duplicate suppression מתועד. לכן Timeout/connection reset לאחר התחלת Network נשאר `UNKNOWN`; בדיוק־פעם אינו Claim של Meta וממומש כ־at-most-one Connect attempt יחד עם reconciliation אנושי.

16.10 משימת Quality protection.

16.10.1 לעקוב אחר Quality, Template pause/disable, User blocks, Opt-outs, Delivery failures ו־Complaint indicators לפי נתונים זמינים חוקית.

16.10.2 להגדיר ספי Warning, Slowdown, Campaign pause ו־Global pause עם Owner ו־Runbook.

16.10.3 Marketing campaign אינו ממשיך אם Template או Phone quality אינם עומדים במדיניות המעודכנת.

16.10.4 אין לבצע ניסוי קצב על נמענים אמיתיים ללא אישור Pilot, Consent ו־Stop conditions.

16.10.5 תנאי הקבלה הוא Tabletop של Quality downgrade ו־Live Staging/Pilot drill בהיקף מאושר.

16.11 משימת מדידה ודוחות לטל.

16.11.1 Dashboard מציג Capacity source/effective time, Reserved, Sent fact, Unknown, Failed, Deferred, Queue lag ו־Quality state.

16.11.2 Labels אינם מכילים Phone, Message body או Tenant name; משתמשים ב־IDs מושחרים ו־bounded dimensions.

16.11.3 דו״ח שבועי מפרט שינויי Meta, השפעה, החלטת Connect, בדיקות שבוצעו וסיכון שנותר.

16.11.4 Alert נשלח כאשר Evidence פג, Registry חסר, Quality יורדת, Unknown עולה או Quota כמעט מלאה.

16.11.5 דו״ח טל יכלול במפורש Business-portfolio messaging limit חי, Phone throughput חי, Pair bucket, Provider errors שנצפו בפועל, Unknown-after-attempt, Template/phone quality, Pacing/held state, Management API usage headers, Terms/Geo freshness, זמן בדיקת המקור ושינוי מאז הדו״ח הקודם. 200/5,000, ‏250/2,000/10,000/100,000/Unlimited, ‏80/1,000/20 ו־1/6s יופיעו תחת `source-verified-published-ceilings-not-live-entitlement`; הקודים המאומתים יופיעו תחת `source-verified-error-taxonomy`; ולצדם תוצג בנפרד הוכחת Live asset. אף מספר שפורסם אינו Policy/Runtime capacity של Connect בלי Source+Live binding והמינימום המחמיר לפי 16.5.7.

16.12 Evidence הוא Registry מתוארך, Layer matrix, Load/fairness report, Error tests, Quality drill ו־Weekly report template.

16.13 Rollback הוא הורדת קצב, Pause campaign, Kill switch ו־Drain; אין להעלות קצב אוטומטית לאחר תקלה בלי Evidence חדש.

16.14 Gate 11 נסגר רק לאחר Registry חי, Layered limiter, Durable permits, Fairness, Error policy, Quality protection ו־Tal approval.

## 17. שלב 12 — מסלול Outbound חד־פעמי, קשור ל־Credential וניתן להוכחה

17.1 מטרת השלב היא להבטיח שכל הודעת Bot או Campaign מגיעה לניסיון Meta אחד לכל היותר, ורק עם ה־Tenant, Credential, Phone, Recipient, Payload ו־Permit שאושרו באותה שרשרת.

17.2 זמן משוער לשלב D1f-C2 הרדום הוא 51–78 שעות עבודה נטו; הפעלת Staging חיה לאחריו מוסיפה 8–16 שעות ותלויה ב־Gates חיצוניים.

17.3 תלות השלב היא Gates 2, 7, 9–11. מימוש נשאר אסור עד אישור המסמך כולו.

17.4 הבעלים הנדרש הוא Backend/Database owner; נדרשים Review עצמאיים של Security ו־Meta integration.

17.5 משימת בידוד Commit עתידית.

17.5.1 להתחיל מ־Clean worktree ו־Commit בסיס מאומת, לא מה־Snapshot המלוכלך שנמדד ב־26.08.2026 ובו 415 נתיבים. המספר הוא Snapshot מתוארך ונמדד מחדש לפני ביצוע; אין להשתמש בו כקבוע.

17.5.2 ליצור Branch ייעודי תחת `codex/` ולהוסיף ל־Staging רק Allowlist מדויק של קובצי ה־Slice.

17.5.3 לא להשתמש ב־`git add .`, לא לשנות Package script, Environment, Worker importer או Runtime activation ב־Slice הרדום.

17.5.4 כל Commit חייב לעבור Guard כבר באותו Commit; אין מצב ביניים שבו מודול רגיש קיים אך אינו מוגן.

17.5.5 תנאי הקבלה הוא Build ו־Tests מ־Clean checkout של כל Commit, עם Exact staged-path evidence.

17.6 משימת Canonical provider binding.

17.6.1 להוסיף Migration expand-only ‏`0058_bot_reply_staging_canonical_provider_binding_and_acquisition_provenance.sql`, בלי לערוך Migration קיימת. D31-C1 לא יצר טבלאות ולכן אין להשתמש בביטוי "טבלאות C1 ריקות".

17.6.1.1 בתוך Transaction אחת לנעול בסדר קבוע ולדרוש ריקנות של שבעת ה־Downstream ledgers הקיימים: permit consumptions, permit resolutions, credential provider request bindings, provider operations, provider operation outcomes, provider uncertainty events ו־provider boundary claims מ־0053–0057.

17.6.1.1.1 `bot_reply_staging_credential_bound_pre_send_permit_consumptions`.

17.6.1.1.2 `bot_reply_staging_credential_bound_pre_send_permit_resolutions`.

17.6.1.1.3 `bot_reply_staging_credential_provider_request_bindings`.

17.6.1.1.4 `bot_reply_staging_provider_operations`.

17.6.1.1.5 `bot_reply_staging_provider_operation_outcomes`.

17.6.1.1.6 `bot_reply_staging_provider_uncertainty_events`.

17.6.1.1.7 `bot_reply_staging_provider_boundary_claims`.

17.6.1.2 טבלאות משותפות אינן חייבות להיות ריקות גלובלית; יש לחסום רק שורות הקשורות ל־Permit קיים לפי Tenant, Delivery, Claim ו־Reservation. Upstream preparation rows רשאיות להתקיים.

17.6.1.2.1 ה־shared-row deny set כולל `bot_reply_provider_request_claims`, ‏`bot_reply_delivery_provider_links`, ‏`bot_reply_provider_deferral_events`, ‏`bot_reply_service_window_rejection_events`, ‏`whatsapp_rate_limit_settlements` ו־`whatsapp_provider_cooldown_events` רק כאשר הם נקשרים ל־Permit שבמיגרציה.

17.6.1.2.2 ה־allowed upstream set כולל `bot_reply_staging_runs`, ‏`bot_reply_staging_authorization_events`, ‏`bot_reply_staging_run_credential_bindings`, ‏`bot_reply_staging_service_reply_scope_bindings`, ‏`bot_reply_staging_pre_send_admission_bindings` ו־`bot_reply_staging_credential_bound_pre_send_permits`.

17.6.1.3 אין Backfill לניסיון Provider ישן כאשר Recipient, Payload, Assets או Acquisition route אינם ניתנים לשחזור. כשל Precondition חייב להשאיר אפס Object חדש.

17.6.2 ליצור `providerBindingDigest` ב־DB עם SHA-256 ו־Encoding קנוני versioned: Domain tag, Algorithm version, Field ID וסדר, Type tag, Null tag נפרד, unsigned fixed-width byte length, UTF-8 bytes, Integer encoding קבוע, Array count+order, Maximum bytes ומדיניות NFC/NFD מפורשת לכל שדה. Algorithm version נשמר ליד ה־Digest.

17.6.3 ה־Digest יחייב לפחות Provider/operation, Tenant, Connection version, Business/WABA/Phone assets, Graph version, Credential revision/digests, Delivery/claim/reservation, Recipient, Canonical reply, Provider request identity, Consent event/version, Suppression watermark, Conversation-window basis, Template/version/language/category, Rate-policy snapshot, Kill-switch epoch ו־Approval digest החלים על אותו Permit.

17.6.3.1 Provider fields הם `provider=meta.whatsapp-cloud-api`, ‏Origin ‏`https://graph.facebook.com`, ‏Graph version, Method ‏`POST` ו־operation ‏`/{Version}/{Phone-Number-ID}/messages`; שינוי אחד מהם משנה Digest ונכשל לפני Network.

17.6.3.2 Asset fields מפרידים Tenant/business context, WABA-ID ו־Phone-Number-ID ומקשרים Evidence שה־Phone שייך ל־WABA. Display number, Business ID ו־`wa_id` אינם תחליפים.

17.6.3.3 Recipient fields כוללים `recipient_type` ואת ערך `to` המדויק שנשלח. אין להניח `contacts[].input == contacts[].wa_id`, ואין לנרמל individual number ו־group ID לאותה זהות.

17.6.3.4 Message fields כוללים canonical request-body digest או content digest מקושר, לרבות type, template name/language/components, media identity+content digest, reply context ו־כל Field שמשנה סמנטיקה. Mutable URL לבדו אינו Binding מספיק.

17.6.3.5 Credential fields כוללים Vault reference/generation, ‏`app_id`, subject/user כאשר זמין, normalized scopes ו־granular target IDs כאשר חלים. Raw token, Authorization header ו־unkeyed token hash אינם נכנסים ל־Digest או Evidence.

17.6.4 ה־Digest לא יכלול Access token, Authorization header, Ciphertext, זמן נוכחי או מידע אקראי.

17.6.5 Caller אינו מספק את ה־Digest; פונקציית DB גוזרת אותו רק מעובדות נעולות ומאומתות.

17.6.6 ה־Digest אינו Capability. Permit, Session barrier ו־one-shot claim נשארים מנגנון ההרשאה.

17.6.7 `consume v2` כותב Binding יחיד ו־`prove v2` מחזיר אותו פעם אחת בלבד לאחר Commit acknowledgement.

17.6.8 Replay של Consume או Proof אינו מנפיק Digest או Capability חדשים; Conflict אחר לאותו Attempt לעולם אינו `UPDATE`.

17.6.9 תנאי הקבלה הוא Golden vectors זהים Byte-for-byte ב־SQL וב־TypeScript, mutation של כל שדה, Null מול Empty, Integer/array boundaries, Unicode עברי/Emoji, NFC מול NFD לפי המדיניות, collision framing, order mutation, replay ו־concurrency.

17.7 משימת Payload compatibility ו־pair exponent.

17.7.1 ליישב את הפער שבו Repository מאפשר יותר Buttons וכותרת ארוכה יותר ממה שה־Adapter מסוגל לייצג.

17.7.2 `consume v2` דוחה Payload שאינו ניתן לייצוג לפני יצירת Binding או Capability.

17.7.3 החלטה: עד שקיים Pair-failure exponent ledger עמיד עם Reset semantics מוכחים, Error ‏`131056` נשאר `unknown-after-attempt`, אינו משתמש במונה Process ואינו מקבל Retry אוטומטי. Ledger כזה הוא Work package נפרד לפני שינוי ההחלטה.

17.7.4 אין לגזור exponent מ־`attempt_count` אם הוא מתאפס לאחר Deferral.

17.7.5 תנאי הקבלה הוא Boundary matrix לכמות אפשרויות, אורך Label, Reply kind, order ו־exponent history.

17.8 משימת Credential-by-revision.

17.8.1 ליצור Port חדש Postgres-only מסוג `loadExact(tenant, revision, envelopeDigest, eventKey)` ולא לשנות את Port הישן המחובר לצרכנים אחרים.

17.8.2 אפס תוצאות, יותר מתוצאה אחת, Tenant שגוי, Revision ישן או Digest/Event mismatch נכשלים לפני Decrypt ולפני Network.

17.8.3 ה־Vault מחשב מחדש Envelope digest ו־Event key לפי אותה נוסחה קנונית של ה־DB.

17.8.4 אין Fallback ל־latest ואין היסטוריית Ciphertext נסתרת.

17.8.5 לפני Proof נטענים רק Metadata מוצפן וזהות Revision. Decrypt מתבצע בתוך Callback צר רק לאחר Acquire, Consume, Proof והשוואת Binding; ה־Callback יוצר Header ומבצע את ניסיון ה־HTTP היחיד ואינו מחזיר, לוכד או מסריאל את ה־Token. אין לטעון ל־Zeroization של JavaScript string; הבקרה היא lifetime צר, no logging, no capture ו־no serialization.

17.8.6 תנאי הקבלה הוא Cross-tenant, old revision, extra key, Proxy/accessor, mutation ו־secret-hygiene suite.

17.9 משימת Trusted Meta transport.

17.9.1 ליצור Transport Production ללא `fetchImplementation`, `requestImplementation` או Callback ציבורי שיכול לבצע ניסיונות נוספים.

17.9.2 Origin קבוע ל־Meta Graph, Version יחידה מה־Registry, Method ו־Content type קבועים, Redirect אסור ו־Proxy/environment routing אסור.

17.9.2.1 ה־Transport אינו שולח Request ללא Version ואינו מקבל Origin, Phone-Number-ID, Path, Method או recipient semantics מן ה־UI. כולם נגזרים מ־Binding נעול שאושר.

17.9.3 יש בדיוק Call site אחד ל־native transport primitive, ללא Loop, Timer, SDK retry, Axios או Generic transport.

17.9.4 אותו `AbortSignal` עובר בלי Wrapper; Response size ו־parse budget מוגבלים.

17.9.5 `fetchStarted` מסומן מיד לפני הקריאה: כשל קודם הוא `not-started`, Fact ודאי הוא `fact`, וכל Timeout/Network/5xx/response פגומה אחריו הוא `unknown-after-attempt`.

17.9.6 Token עובר רק ב־Authorization header ואינו מופיע ב־URL, Error או Telemetry.

17.9.7 תנאי הקבלה הוא AST/source proof לניסיון יחיד ובדיקות redirect, abort, reset, timeout, malformed, oversized ו־global mutation.

17.10 משימת סדר Prepare, Permit, Proof, Send.

17.10.1 הסדר המחייב מתחיל ב־Checkout של Physical PostgreSQL client יחיד, `ROLLBACK` בטוח, `DISCARD ALL`, דגימת backend PID+backend start ורכישת Session-level tenant barrier דרך Wrapper ייעודי.

17.10.1.1 Transaction-level advisory lock אינו תחליף, משום שהשרשרת כוללת יותר מ־Transaction אחת. Session lock חוזר/Reentrant, Lock ישן או Lock שנרכש ישירות מחוץ ל־Wrapper נכשלים סגור.

17.10.1.2 `0058` יוצרת Acquisition ledger ו־Release ledger Append-only הקושרים Acquisition key דטרמיניסטי ל־Permit, Tenant, Mode, barrier keys, backend PID, backend start, session/current user, XID וזמן DB.

17.10.1.3 PID לבדו אינו Identity בגלל PID reuse. כל פעולה מאמתת PID+backend start+roles+Lock shape+Acquisition לא משוחררת.

17.10.1.4 Exception לאחר רכישת Session lock מבצע Unlock מפורש; Session lock שורד Rollback. ACK לא ודאי לפני Provider משמיד את ה־Client ואינו שולח; ACK לא ודאי אחרי Provider עובר ל־Manual reconciliation ללא Retry.

17.10.1.5 לפני Activation נשללת מכל Runtime גישה ישירה ל־raw advisory-lock/unlock primitives לאחר Impact audit. Runtime מקבל `EXECUTE` רק על Wrappers חיצוניים v2 בבעלות NOLOGIN migration owner ואינו מקבל כתיבה ישירה ל־Ledgers.

17.10.2 לאחר Commit+ReadyForQuery של Acquire מותר לחשוף `acquisitionKey`; לאחריו Resolve exact request binding ו־Credential metadata בלבד, ללא Plaintext.

17.10.3 לאחריו Validate revision/digests ולעצב Adapter metadata בלי Network ובלי Decrypt.

17.10.4 לאחריו Consume permit עם אותו Acquisition; רק Commit+ReadyForQuery מוצלח רשאי לחשוף את Canonical provider binding digest.

17.10.5 לאחריו Prove boundary, Commit+ReadyForQuery, חישוב TypeScript עצמאי והשוואת אותו `providerBindingDigest`.

17.10.6 רק לאחר שוויון מלא נכנסים ל־Vault callback, מפענחים את Revision המדויק ומבצעים ניסיון HTTP יחיד מתוך אותו Callback.

17.10.7 לאחר הניסיון נכתב Fact או Uncertainty הקשור לאותו Acquisition+Binding, מתבצע Finalize או Reconcile ורק אז Release מדויק של Lock אחד במצב Send או שניים במצב Reconciliation, Commit, ‏`DISCARD ALL` ו־Close.

17.10.8 כשל הכנה מתרחש לפני Proof ולפני Network; כשל לאחר Network לעולם אינו מקבל Retry אוטומטי.

17.10.9 Factory construction אינה מבצעת DB, Network, Environment או Clock I/O.

17.10.10 תנאי הקבלה הוא Fault injection בין כל שני צעדים והוכחת `providerCallCount` של אפס או אחד בלבד, וכן wrong/reused PID, wrong pool connection, lost socket, forged/stale Acquisition, direct raw lock, reentrant lock, two workers ו־release replay.

17.11 משימת Outcome ו־Reconciliation.

17.11.1 State machine קנונית היא `not-started → attempt-started → provider-accepted(wamid) → sent(webhook) → delivered → read`, עם ענפים מונוטוניים `failed` ו־`unknown-after-attempt`. Fact כולל Provider message identity מאומתת, Acquisition identity ו־Binding digest; הוא אינו נגזר רק מ־HTTP status.

17.11.1.1 HTTP 200, ‏`messages[].id` מסוג `wamid` או `message_status=accepted` מייצרים לכל היותר `provider-accepted`; הם אינם `sent`, ‏`delivered` או `read`. רק Webhook מאומת של Meta מייצר `sent`; ‏`held_for_quality_assessment` ו־`paused` נשמרים כ־Provider facts נפרדים.

17.11.1.2 Receipt לאחר הניסיון מקשר ל־`providerBindingDigest` המקורי ושומר Response timestamp, HTTP status, ‏`contacts[].input`, ‏`contacts[].wa_id`, ‏`messages[].id`, ‏`messages[].message_status`, response-body digest ו־Error code/details כאשר יש. ה־`wamid` נוצר לאחר ניסיון ולכן אינו חלק מה־Pre-send digest.

17.11.1.3 Delivery/Read/Failure נקבעים רק מאירועי Webhook מאומתים וממוזגים מונוטונית לאותו Attempt. Response ו־Webhook יכולים שניהם לשאת Error facts ולכן שניהם נשמרים ומיושבים.

17.11.2 Unknown נשמר פעם אחת עם Permit, Provider request, Binding, Attempt time ו־Reason class מושחרים.

17.11.3 Reconciliation קורא Webhook או Provider fact מאוחר ומקשר לאותו Attempt; הוא אינו מנפיק Permit חדש.

17.11.3.1 אם Meta אינה מספקת Correlation רשמי ומדויק, אסור לקשור Outcome לפי Recipient, Timestamp proximity או "ההודעה האחרונה". המצב נשאר Manual reconciliation.

17.11.3.2 Migration ‏`0059` ב־Commit 4 קושרת Fact, Uncertainty, Finalize ו־Reconcile לאותו Acquisition key ו־providerBindingDigest; ‏0058 דרך Proof בלבד אינה מספיקה לסגירת סעיף 17.11.

17.11.4 פעולה אנושית מסמנת Resolution עם Reason ו־Approver ואינה מוחקת את ה־Unknown המקורי.

17.11.5 תנאי הקבלה הוא late sent, accepted-then-failed, timeout-with-late-webhook, no evidence, duplicate/out-of-order webhook, no-correlation ו־manual resolution, בלי Retry אוטומטי ובלי KPI שגוי.

17.11.6 Retry lineage שומר `operationId`, ‏original digest, attempt number, previous outcome, provider error code ו־scheduled retry time. ניסיון נוסף אסור עבור `UNKNOWN`; הוא דורש החלטה עסקית חדשה ולא שימוש חוזר ב־Permit.

17.12 משימת Source guard ו־SHA.

17.12.1 להוסיף Provider binding contract, Revision repository/vault, Trusted transport, Secure composition וכל Boundary executable ל־Dormant registry.

17.12.2 Secure composition נשארת עם אפס Runtime importers; Adapter, Vault ו־Transport מותרים רק דרך ה־Composition המדויקת.

17.12.3 לחסום Direct/Transitive import, Dynamic import, Runtime re-export, Side-effect import, Package alias, Symlink/path escape ו־Unapproved external dependency.

17.12.4 לחשב SHA רק לאחר קוד סופי, Formatting ו־Rebase; לא להמציא Digest מראש.

17.12.5 `activationAllowed:false`, `runtimeImporters:0` ו־`trustedWriters:"missing"` נשארים עד Gate 7 חי ואישור Activation.

17.12.6 תנאי הקבלה הוא Mutation של Byte, Importer או Status שמפיל את ה־Guard.

17.13 משימת סדר Commits עתידי.

17.13.1 Commit 1 יכיל 0058, Static migration tests, PostgreSQL 16 live verifier, Canonical vectors, Parity registry/tests, Migration-contract verifier/tests, Source Guard/negative tests, Hosting migration registry/tests ועדכוני Inventory של 0056/0057. אין Commit ביניים שבו Migration קיימת אך Guard/Registry אינם מכירים אותה.

17.13.1.1 ה־Inventory הצפוי לאחר 0058 הוא 59 Migrations בסך הכול, 30 Railway-only, ‏43 D1 migrations ו־55 D1 tables; הערכים מאומתים בפועל ב־Clean checkout ואינם מועתקים בעיוורון.

17.13.1.2 Commit 1 אינו משנה `package.json`, Environment, Worker/API importers, Driver, Transport, Meta adapter, Composition או Runtime SHA values; ‏`activationAllowed:false`, ‏`runtimeImporters:0` ו־`trustedWriters:"missing"` נשארים.

17.13.2 Commit 2 יכיל Binding contract, Revision repository/vault, Guard ו־Boundary tests.

17.13.3 Commit 3 יכיל Trusted transport, Adapter, Guard ו־SHA tests.

17.13.4 Commit 4 יכיל Migration ‏0059 ל־provider-attempt acquisition events ול־Fact/Uncertainty/Finalize/Reconcile v2, וכן Driver, Session transport, Secure composition, Guard ו־SHA tests.

17.13.5 Commit 5 יכיל Documentation ו־Evidence snapshot בלבד.

17.13.6 אסור לכלול ב־Commits אלה `.env`, Package activation, Worker wiring, Railway credentials או קבצים מלוכלכים שאינם שייכים ל־Slice.

17.14 Evidence הוא Migration verifier חי, Canonical vectors, Credential tests, One-attempt proof, Fault matrix, Source graph, SHA registry, Full CI ו־Clean-checkout report.

17.15 Rollback לפני Migration הוא Revert בסדר הפוך. אחרי Migration additive, Schema נשאר רדום ו־PUBLIC/Runtime grants מבוטלים; תיקון נוסף נעשה ב־Migration הבאה ולא ב־DROP חירום.

17.16 Gate 12.1 מאשר Candidate רדום בלבד לאחר כל הראיות בסעיף 17. Gate 12.2 הוא Namespace של משפחות Side effect ואינו אישור גורף.

17.16.1 Gate 12.2.1 — Bot text/buttons.

17.16.2 Gate 12.2.2 — Template message.

17.16.3 Gate 12.2.3 — Media message.

17.16.4 Gate 12.2.4 — Campaign recipient.

17.16.5 Gate 12.2.5 — Template submission.

17.16.6 Gate 12.2.6 — Provider media upload.

17.16.7 לכל Instance נדרשים Schema, Binding fields, Credential revision, one-attempt boundary, Result taxonomy, Unknown reconciliation, D31 roles חיים, Acquisition provenance, Trusted writers, Railway credentials נפרדים, Kill/drain rehearsal ו־Meta Staging evidence משלו. אישור Instance אחד אינו מפעיל אחר.

17.16.8 Core closed pilot מאשר לכל היותר 12.2.1, ‏12.2.2 ו־12.2.4: Bot text, Template message ו־Campaign recipient מוגבל. ‏12.2.2 ו־12.2.4 חייבים להיסגר יחד למסלול Campaign; אישור אחד מהם בלבד משאיר Campaign כבוי. ‏12.2.3, ‏12.2.5 ו־12.2.6 נשארים Disabled עד inclusion מפורש ב־Scope Manifest והשלמת Task Registry שלהם.

17.17 Production נשאר NO-GO עד Pilot gate בסעיף 31; השלמת D1f-C2 אינה Production readiness.

## 18. שלב 13 — Contacts, Consent, Import, Segments ו־Suppression

18.1 מטרת השלב היא לבנות מקור אמת לאנשי קשר ולהוכחת הרשאה לשליחה, כך ששום Campaign או Bot לא יעקוף Opt-out, Purpose או Tenant.

18.2 זמן משוער לשלב הוא 72–120 שעות עבודה נטו, לא כולל חוות דעת משפטית.

18.3 תלות השלב היא Gates 5, 7–11 ו־Legal review לפי D26.

18.4 הבעלים הנדרש הוא CRM/Product owner; Privacy, Legal ו־Backend מאשרים את מדיניות Contacts/Consent/Import. טל מאשר רק את ההשפעה על מגבלות WhatsApp/Meta ועל מדיניות Connect rate limiting; אין בכך בעלות על Consent או Legal classification.

18.5 משימת מודל Contact.

18.5.1 לשמור Contact בתוך Tenant עם Phone canonical מסוג E.164, Display fields מאושרים, Source, Created time ו־Version.

18.5.2 להפריד Contact identity מ־Consent evidence, Conversation, Campaign membership, Tags ו־Custom fields כדי שכל אחד יקבל Retention משלו.

18.5.3 Phone canonicalization מתבצעת בספרייה מאושרת ובהקשר Country מפורש; ערך דו־משמעי אינו מנוחש.

18.5.4 Unique identity היא Tenant ו־canonical phone; Contact של Tenant אחר אינו מתמזג ואינו נחשף דרך Conflict.

18.5.5 תנאי הקבלה הוא Matrix למספר ישראלי ובינלאומי תקין, דו־משמעי, קצר, ארוך, Unicode, Prefix כפול ו־Tenant duplicate.

18.6 משימת Consent ledger.

18.6.1 כל Consent record כולל Channel, Purpose, Source, Statement/version, Captured time, Actor, Evidence reference ו־Expiry אם הדין או המדיניות דורשים.

18.6.2 Consent אינו Boolean יחיד; הרשאה לשירות אינה בהכרח הרשאה לשיווק, והרשאה ל־WhatsApp אינה הרשאה לערוץ אחר.

18.6.3 Revocation או Opt-out הוא Event append-only שמפסיק Eligibility מיד; Event חדש אינו מוחק את ההיסטוריה.

18.6.4 Import שמסמן Consent דורש מקור Evidence מאושר והצהרת Importer; Checkbox כללי אינו מספיק.

18.6.5 Legal יאשר את הנוסח, עילת העיבוד, חובת היידוע, דיוור ישיר, העברה לספקים וחוק התקשורת; המסמך אינו חוות דעת משפטית.

18.6.6 תנאי הקבלה הוא Eligibility evaluator שמסביר איזו ראיה אפשרה או חסמה שליחה במועד נתון.

18.7 משימת Suppression.

18.7.1 Opt-out, Block, Complaint, Legal restriction ו־Manual suppression נשמרים בסוגים נפרדים ובעלי קדימות גבוהה מכל Segment או Import.

18.7.2 מחיקת Contact אינה מוחקת בהכרח Suppression minimal tombstone אם מחיקה מלאה תאפשר שליחה חוזרת; Legal קובע את האיזון וה־Retention.

18.7.3 Re-consent מותר רק עם Evidence חדש ומדיניות מפורשת; הוא אינו מסיר Complaint או Provider block אוטומטית.

18.7.4 כל Send eligibility קורא Suppression סמוך ל־Permit ולא רק בזמן בניית Campaign.

18.7.5 תנאי הקבלה הוא Opt-out שמגיע אחרי Schedule ולפני Send, Concurrent re-consent, deletion request ו־campaign snapshot ישן.

18.8 משימת Import Pilot.

18.8.1 Pilot תומך ב־CSV UTF-8 בלבד כדי לצמצם Parser ו־Macro surface. ‏XLSX נדחה לאחר Pilot עד Parser sandbox ו־Formula controls.

18.8.2 Upload עובר Size limit, Encoding, Delimiter, Header allowlist, Row/column limits ו־Quarantine לפי Data class.

18.8.3 התהליך הוא Upload, Parse preview, Column mapping, Validation report, Consent declaration, Explicit approval ו־Atomic commit.

18.8.4 Preview אינו משנה Contacts ואינו שולח הודעה; Refresh או Retry מחזירים אותו Import identity.

18.8.5 כל Row מקבל Result deterministic: create, update allowed fields, duplicate, invalid, conflict או suppressed.

18.8.6 אין Formula execution. Export עתידי מנטרל CSV formula injection בתאים שמתחילים בתו מסוכן.

18.8.7 Error report אינו חושף שורות של Tenant אחר ואינו נשמר מעבר ל־Retention הנדרש.

18.8.8 תנאי הקבלה הוא CSV malformed, BOM, alternate encoding, embedded newline, duplicate header, huge cell, formula prefix, partial failure ו־replay.

18.9 משימת Merge ו־Dedup.

18.9.1 להגדיר Field ownership: אילו שדות Import רשאי לעדכן, אילו שמורים למשתמש ואילו נגזרים מ־Meta.

18.9.2 Merge לעולם אינו מחליף Consent, Suppression או Audit בשקט.

18.9.3 Conflict נשמר לביקורת עם Before/After digest ו־Actor; אין Last-write-wins על מידע רגיש.

18.9.4 Bulk merge דורש Preview, Count, Approval, Idempotency ו־Rollback plan.

18.9.5 תנאי הקבלה הוא שני Imports מתחרים, Contact שנערך ידנית באמצע ו־duplicate בין formats.

18.10 משימת Tags, Custom fields ו־Segments.

18.10.1 Tags ו־Custom fields מוגבלים בשם, סוג, אורך, Cardinality ו־מספר לכל Tenant.

18.10.2 Segment builder משתמש ב־Operators allowlisted וב־Parameterized queries; אין Expression או SQL חופשי.

18.10.3 Segment preview מציג Count ו־sample מושחר לפי הרשאה, עם Snapshot time ו־Query version.

18.10.4 Campaign קושר Snapshot או Evaluator version מפורש; שינוי Segment אחרי Approval אינו משנה קהל בשקט.

18.10.5 תנאי הקבלה הוא Injection, expensive filter, cross-tenant field, schema change ו־high-cardinality abuse.

18.11 משימת Data subject operations.

18.11.1 לאפשר Search, Access, Correction, Export ו־Deletion request לפי Legal workflow ו־Identity verification.

18.11.2 Export מאושר מכיל רק Tenant ו־Subject המבוקשים, מוצפן או מוגן בזמן מסירה ובעל Expiry.

18.11.3 Correction שומרת Audit והיסטוריה מינימלית לפי הדין; Deletion מכבדת Legal Hold ו־Suppression policy.

18.11.4 תנאי הקבלה הוא Subject ambiguity, wrong tenant, active hold, expired export ו־repeated request.

18.12 Evidence הוא Contact schema, Consent decision table, Legal sign-off, Import matrix, Suppression race tests ו־Data subject rehearsal.

18.13 Rollback הוא Pause import/send, ביטול Import commit באמצעות Compensating transaction מתועד והמשך Suppression; Consent history אינו נמחק.

18.14 Gate 13 נסגר רק לאחר Contact canonicalization, Consent ledger, Suppression precedence, Safe CSV import, Segment isolation ו־Legal approval.

## 19. שלב 14 — Templates, Content approval ו־Media

19.1 מטרת השלב היא לנהל Templates ו־Media כגרסאות מאושרות הקשורות ל־Meta ול־Campaign, בלי Content drift או קובץ לא סרוק.

19.2 אומדן ROM מתוקן לשלב הוא 88–154 שעות אדם, לא כולל זמני אישור Template אצל Meta. Text ו־Media נספרים כחבילות נפרדות כדי לא לחייב Core Pilot ב־Upload.

19.3 תלות מסלול Text template היא Gates 9, 10 ו־13. Template submission חי דורש Gate 12.2.5. Media דורש בנוסף Gates 6.3 ו־12.2.3/12.2.6 לפי הפעולה. Gate 12.1 מספיק רק ל־Contract candidate רדום.

19.4 הבעלים הנדרש הוא Messaging/Product owner; Meta integration, Privacy ו־Security מאשרים.

19.5 משימת Template domain.

19.5.1 Template מקומי כולל Tenant, Name canonical, Language, Category, Components, Variables, Local version, Meta identity, Meta status ו־Last synced evidence.

19.5.2 Draft ניתן לעריכה; Submitted ו־Approved snapshots בלתי־משתנים. שינוי יוצר Version חדשה.

19.5.3 Status מקומי אינו מנחש אישור; הוא נגזר מ־Meta evidence ומתעד Pending, Approved, Rejected, Paused, Disabled או Unknown לפי מצב נתמך.

19.5.4 Template של Tenant אחר אינו ניתן לבחירה גם אם Meta name זהה.

19.5.5 תנאי הקבלה הוא Versioning, same-name conflict, language/category drift, out-of-order sync ו־deleted Meta template.

19.6 משימת Variable schema.

19.6.1 לכל Variable להגדיר Key, Type, Required, Maximum length, Source allowlist, Fallback policy ו־PII class.

19.6.2 אין Placeholder positional לא מוסבר ב־UI; Preview ממפה כל ערך לשדה מקור.

19.6.3 Missing, oversized, control characters או prohibited content חוסמים Recipient לפני Permit.

19.6.4 Escaping ו־Unicode normalization נקבעים לפי Meta contract; אין HTML rendering של תוכן WhatsApp בתוך Admin UI ללא encoding.

19.6.5 תנאי הקבלה הוא Missing field, null/empty difference, bidi controls, emoji, long Hebrew, injection string ו־PII forbidden source.

19.7 משימת Review ו־Approval.

19.7.1 Template או Campaign content עוברים Preview עם Language, Variables, Media, Recipient policy ו־Meta status.

19.7.2 Approval כולל Approver, Content digest, Policy version ו־Time; שינוי Byte מבטל Approval.

19.7.3 AI רשאי להציע טיוטה אך אינו Submit ל־Meta ואינו Approve.

19.7.4 Rejected template מציג Reason מושחר ונתיב תיקון; אין Retry loop אוטומטי.

19.7.5 תנאי הקבלה הוא Approval bypass, stale approval, approver offboarding ו־concurrent edit.

19.8 משימת Media upload.

19.8.1 Media עובר ל־S3 Quarantine, GuardDuty, Type/size validation ו־Clean copy לפני שימוש.

19.8.2 לא משתמשים ב־Public bucket או Arbitrary remote URL ב־Pilot.

19.8.3 Metadata, filename ו־EXIF שאינם דרושים מוסרים או אינם מוצגים; Original filename אינו Object key סמכותי.

19.8.4 Media version קשורה ל־Object version, KMS key, Scan result, Content digest ו־Retention.

19.8.5 Unsupported, password-protected, too large, timeout או scan error נשארים חסומים.

19.8.6 Upload session נוצר Server-side וקושר Tenant, Actor, Purpose, server-selected opaque key, Bucket, allowed Method, exact Content-Type, maximum bytes, required checksum, KMS key, expiry, single-use state ו־Policy version. שם קובץ, Tenant ID או Path מן ה־Client אינם קובעים Object key.

19.8.7 Presigned request משתמש ב־SigV4 checksum וב־Bucket policy עם `s3:signatureAge`; Expiry קצר לבדו אינו One-shot. ה־Server שומר State durable ומונע שימוש שני, החלפת Headers, Copy בין Tenants, שימוש לאחר Cancel ו־Finalize של Object שונה.

19.8.8 Overwrite אסור: Key חדש ייחודי ל־Upload intent, Versioning פעיל, Existing object/version נכשל, ו־Finalize קושר בדיוק VersionId+S3 checksum+Application digest. ETag אינו Digest תוכן סמכותי.

19.8.9 Multipart כבוי ב־Pilot למדיה קטנה. אם יופעל, נדרשים Part/byte/time caps, exact UploadId binding, checksum לכל Part ול־Object, abort אוטומטי, Lifecycle ל־incomplete upload ו־reconciliation ל־orphan. Upload חלקי אינו נכנס ל־Scan או ל־Clean.

19.8.10 תנאי הקבלה כולל MIME mismatch, polyglot, malicious test artifact בטוח, scan timeout, object replacement, copied URL, second use, wrong checksum/header, oversize, expired signature, cross-tenant URL, wrong KMS key, stale VersionId ו־orphan multipart.

19.9 משימת Meta media lifecycle.

19.9.1 ההחלטה הקנונית היא להעלות Media כ־Provider operation נפרד, לשמור Provider media ID הקשור ל־WABA, content digest, exact credential, provider receipt ו־expiry, ולהשתמש בו רק כל עוד אותו Binding תקף. Upload-per-send או URL משתנה אינם מסלול Pilot.

19.9.2 Cache של Provider media identity קשור ל־Tenant, Content digest, Meta asset ו־Expiry; אין שימוש לאחר שינוי Content.

19.9.3 כשל Upload לפני ניסיון Message הוא Not-started; כשל אחרי Attempt אינו גורר Message retry עיוור.

19.9.4 למחוק Provider/Storage media לפי Retention ו־Legal Hold בלי לשבור Audit digest.

19.9.5 תנאי הקבלה הוא expired media, wrong WABA, replaced object, duplicate upload ו־provider outage.

19.10 משימת Content policy.

19.10.1 להגדיר רשימת קטגוריות אסורות או מוגבלות לפי WhatsApp Business policy, הדין הישראלי, OpenAI policy כאשר AI מעורב ומדיניות החברה.

19.10.2 Content validation הוא Aid ולא חוות דעת; מקרה לא ודאי עובר Review אנושי.

19.10.3 Opt-out instruction, Business identity ו־Purpose נבדקים לפי סוג Campaign ו־Legal guidance.

19.10.4 Policy version נקשרת ל־Approval ול־Send evidence.

19.11 Evidence הוא Template state tests, Meta sync proof, Approval digest, Media scan chain, Policy review ו־Staging send מבוקר.

19.12 Rollback הוא Pause של Template/version, חסימת Media, מעבר ל־Draft הקודם רק לאחר Approval חדש וביטול Campaign שמשתמש בגרסה בעייתית.

19.13 Gate 14 הוא Namespace מפוצל.

19.13.1 Gate 14.1 — Text templates/content — נסגר לאחר Versioning, Variable validation, Human approval, Meta sync ו־Content policy; הוא אינו תלוי ב־Upload או Media.

19.13.2 Gate 14.2 — Media lifecycle — נסגר לאחר 14.1, ‏6.3, Clean media chain, presigned-upload contract, Provider media ledger ו־12.2.3/12.2.6. הוא נדרש רק כאשר Media נמצא ב־Scope Manifest.

19.13.3 Core Pilot ללא Media דורש 14.1 בלבד ומוכיח אפס Route, Credential, Job, Bucket event או UI פעיל למסלול Media.

## 20. שלב 15 — Campaigns, Scheduling ו־Recipient execution

20.1 מטרת השלב היא להפוך Campaign מרעיון ל־Snapshot מאושר ולרשימת Recipient attempts מדויקת, ניתנת לעצירה וללא שליחה חוזרת.

20.2 זמן משוער לשלב הוא 96–160 שעות עבודה נטו.

20.3 תלות השלב היא Gates 11, 12.1, 13 ו־14.1; Live execution דורש במפורש Gate 12.2.4. Gate 14.2 נדרש רק ל־Campaign עם Media. Gate 10 נדרש ל־Provider status facts ו־Gate 16 נדרש רק כאשר Campaign replies נכנסים ל־Shared Inbox.

20.4 הבעלים הנדרש הוא Campaign/Product owner; Backend, Privacy ו־Operations מאשרים. טל מאשר רק את חישוב הקצב, הקיבולת והגבלות WhatsApp/Meta; הוא אינו Campaign, Privacy או Product approver אוטומטי.

20.5 משימת Campaign state machine.

20.5.1 להגדיר Draft, Validating, Ready for approval, Approved, Scheduled, Materializing, Running, Pausing, Paused, Completed, Canceled ו־Failed.

20.5.2 רק מעברים Allowlisted מותרים; כל מעבר כולל Expected version, Actor, Reason ו־Audit.

20.5.3 Approval נקשר ל־Content digest, Template version, Segment version, Consent policy, Rate policy, Schedule ו־Cost estimate.

20.5.4 כל שינוי לאחר Approval מחזיר ל־Draft ודורש Approval חדש.

20.5.5 תנאי הקבלה הוא Transition matrix, concurrent approve/edit, duplicate action ו־stale UI.

20.6 משימת Dry run ו־Preflight.

20.6.1 Preflight בודק Connection, Credential revision, Template status, Variables, Segment count, Consent/Suppression, Quota, Rate evidence, Budget ו־Kill switches.

20.6.2 Dry run אינו יוצר Provider permit; הוא מפיק Summary, blocked reasons ו־sample מושחר.

20.6.3 Estimate מציג Range ו־Snapshot time, לא הבטחה, ומופרד מ־Actual billing.

20.6.4 Preflight פג לאחר זמן או שינוי Dependency; Scheduler בודק שוב לפני Materialization.

20.6.5 תנאי הקבלה הוא כל Dependency שמשתנה בין Preflight ל־Run.

20.7 משימת Scheduling.

20.7.1 Schedule נשמר כ־Instant UTC ובנפרד Time zone ו־Local representation לצורכי Audit.

20.7.2 לבדוק Asia/Jerusalem, DST transition, invalid local time, repeated hour, clock skew ו־server restart.

20.7.3 Pilot אינו תומך Recurring campaign לפי D24; UI וכפתורים מושבתים ומסבירים זאת.

20.7.4 Scheduled job הוא Wake-up בלבד; DB state קובע אם מותר להתחיל.

20.7.5 תנאי הקבלה הוא exact boundary, DST, cancel-at-start, duplicate scheduler ו־late wake-up.

20.8 משימת Audience materialization.

20.8.1 ליצור Recipient snapshot durable עם Contact identity, Campaign/version, Eligibility result, Variable digest ו־State.

20.8.2 Snapshot אינו מכיל Consent authorization קבוע; Eligibility נבדק שוב סמוך ל־Permit כדי לכבד Opt-out מאוחר.

20.8.3 Materialization היא Idempotent ו־Resumable עם Cursor durable; Crash אינו יוצר Recipient כפול.

20.8.4 Audience size ו־materialization budget מוגבלים; Campaign גדול מדי נשאר ממתין לאישור Capacity.

20.8.5 תנאי הקבלה הוא Segment drift, crash, duplicate contact, opt-out race ו־concurrent materializers.

20.9 משימת Recipient state machine.

20.9.1 להגדיר Pending, Blocked, Deferred, Reserved, Attempting, Sent fact, Delivered, Read, Failed permanent, Unknown ו־Canceled.

20.9.2 `Sent fact` נוצר רק מ־Provider fact; HTTP timeout אינו Sent ואינו Failed אלא Unknown.

20.9.3 Webhook משנה State רק לפי Monotonic reducer ו־Binding identity.

20.9.4 Retry של Permanent או Unknown אסור; Deferred דורש Policy ו־Permit חדשים לאחר הוכחת No attempt.

20.9.5 תנאי הקבלה הוא Full transition matrix, out-of-order webhook ו־manual reconciliation.

20.10 משימת Pause, cancel ו־drain.

20.10.1 Pause מפסיק Permits חדשים, אינו מבטל ניסיון שכבר התחיל ושומר את גבול העצירה המדויק.

20.10.2 Cancel חוסם Pending/Deferred, משאיר Facts/Unknowns ומונע Resume.

20.10.3 Emergency stop פועל Global, Tenant, Connection ו־Campaign scope.

20.10.4 Resume דורש Re-preflight, Evidence טרי ו־Actor מאושר.

20.10.5 תנאי הקבלה הוא Pause במהלך Load, crash בזמן drain, resume עם template paused ו־cancel concurrent.

20.11 משימת Analytics.

20.11.1 Counts נגזרים מ־Recipient ledger ולא מ־UI cache.

20.11.2 להציג Sent fact, Delivered, Read, Failed, Blocked, Deferred, Unknown, Opt-out ו־Cost בנפרד.

20.11.3 שיעור מחושב רק עם Denominator ותאריך snapshot ברורים; Unknown אינו נספר כהצלחה או כישלון.

20.11.4 Export דורש Capability, Reason, Audit, Row limit ו־Formula neutralization.

20.11.5 תנאי הקבלה הוא Reconciliation בין Dashboard, DB ledger ו־Provider sample מאושר.

20.12 Evidence הוא State-machine suite, Dry-run/preflight report, DST tests, Audience/eligibility races, Pause/drain load test ו־analytics reconciliation.

20.13 Rollback הוא Pause/Cancel, Kill switch, חזרה לגרסת UI/Worker קודמת ושמירת כל Recipient facts; אין מחיקת Campaign ledger.

20.14 Gate 15 נסגר מקומית לאחר כל הראיות; Pilot send נשאר חסום עד Gate 12.2.4, ובנוסף עד Gate 12.2.1, ‏12.2.2 או 12.2.3 לפי Payload הפעולה, ועד Pilot Gate 26.1 בסעיף 31.

## 21. שלב 16 — Shared Inbox ושיתוף פעולה אנושי

21.1 מטרת השלב היא לספק Inbox צוותי עקבי, נגיש ומבודד Tenant שבו אדם תמיד יכול לקחת שליטה מה־Bot.

21.2 זמן משוער לשלב הוא 104–176 שעות עבודה נטו.

21.3 תלות השלב היא Gates 8, ‏10, ‏13 ו־14.1; ‏Gate 14.2 נדרש רק כאשר Inbox מציג או שולח Media. Outbound reply חי דורש Gate 12.2.1, ‏12.2.2 או 12.2.3 לפי Payload הפעולה.

21.4 הבעלים הנדרש הוא Inbox/Product owner; Frontend, Backend, Accessibility ו־Security מאשרים.

21.5 משימת Conversation model.

21.5.1 Conversation קשורה ל־Tenant, Contact, Connection ו־Channel identity; אותו Contact בשני Connections אינו מתמזג אוטומטית.

21.5.2 להגדיר Open, Pending, Snoozed, Resolved, Closed ו־Blocked עם Transition rules מפורשים.

21.5.3 Last activity, Unread count ו־Preview הם Views נגזרות שאפשר לבנות מחדש; Message ledger הוא מקור האמת.

21.5.4 State update משתמש ב־Version כדי למנוע Lost update בין שני Agents.

21.5.5 תנאי הקבלה הוא simultaneous open/assign/resolve, inbound-after-close ו־cross-connection contact.

21.6 משימת Message timeline.

21.6.1 להציג Inbound, Outbound fact, Unknown, Status events, Internal note, Assignment, Bot action ו־System audit כסוגים מובחנים.

21.6.2 Internal note לעולם אינה נשלחת ל־WhatsApp ואינה נכנסת ל־AI context בלי Policy מפורשת.

21.6.3 Message body מוצג עם Encoding בטוח, Link policy ובלי HTML לא־מהימן.

21.6.4 Unknown מסומן באופן גלוי ואינו נראה כ־Sent; Reconciliation מוסיף Event ולא משנה היסטוריה.

21.6.5 תנאי הקבלה הוא Stored XSS, bidi spoof, long message, unknown outcome ו־out-of-order statuses.

21.7 משימת Assignment ו־collaboration.

21.7.1 Assignment כולל Assignee, Team/queue, Assigned by, Time ו־Version.

21.7.2 Claim concurrent מצליח לאדם אחד או מחזיר Conflict ברור.

21.7.3 Offboarding או Absence מעבירים שיחות לפי Runbook ואינם משאירים Queue יתומה.

21.7.4 Mentions/notifications מכבדים Tenant, Role ו־PII minimization.

21.7.5 תנאי הקבלה הוא concurrent claim, assignee removed, bulk reassign ו־notification leak.

21.8 משימת Human handoff.

21.8.1 מצב Bot, Human requested, Human active, Bot resume pending ו־Bot disabled נשמר כ־State machine.

21.8.2 Inbound opt-out, keyword, Agent claim או Security signal עוצרים Automation לפני Reply permit.

21.8.3 Resume של Bot דורש Agent מאושר, Reason ו־Flow version תקפה.

21.8.4 AI ממשיך להציע Draft בלבד; Agent עורך ומאשר כל Send.

21.8.5 תנאי הקבלה הוא race בין Bot ל־Agent, opt-out בזמן Draft, stale resume ו־two-agent send.

21.9 משימת Search ו־Filters.

21.9.1 Search מוגבל ל־Tenant ול־Capability, בעל Length/complexity budget ו־Parameterized query.

21.9.2 Result snippets עוברים Encoding ו־Redaction; Search אינו חושף Count או timing של Tenant אחר.

21.9.3 Filters ו־Sort משתמשים ב־Allowlist ואינם Dynamic SQL.

21.9.4 תנאי הקבלה הוא injection, expensive wildcard, cross-tenant ID, pagination race ו־deleted contact.

21.10 משימת Realtime Pilot.

21.10.1 Pilot משתמש ב־Polling או invalidation מבוקר בעל ETag/Cursor כדי לצמצם Connection complexity; WebSocket נשקל רק לאחר מדידת צורך.

21.10.2 Cursor קשור ל־Tenant, User ו־Ordering; Client אינו מכתיב offset שרירותי ללא Validation.

21.10.3 Reconnect אינו משכפל הודעות ואינו מדלג על Event.

21.10.4 תנאי הקבלה הוא offline/reconnect, two tabs, stale cursor, revoked session ו־high latency.

21.11 משימת Attachments.

21.11.1 Inbound media נשאר reference חסום עד Download, type/size validation, quarantine ו־scan.

21.11.2 Signed access URL הוא קצר, Tenant-bound, Method-bound ואינו מופיע ב־Log.

21.11.3 Agent אינו יכול לגרום לשרת Fetch של URL שרירותי.

21.11.4 תנאי הקבלה הוא expired URL, copied URL, malicious media, content replacement ו־download abort.

21.12 משימת Accessibility ו־RTL ספציפית ל־Inbox.

21.12.1 Inbox ניתן להפעלה מלאה במקלדת עם סדר Focus צפוי, Skip links ו־Live region שאינו מציף.

21.12.2 RTL אינו הופך זמנים, מספרי טלפון, IDs או קטעי קוד באופן מטעה.

21.12.3 צבע אינו הסמן היחיד ל־Unread, Unknown, Failed או Assignment.

21.12.4 Virtualization, אם תתווסף, שומרת Screen-reader semantics ו־Focus.

21.12.5 תנאי הקבלה הוא Manual keyboard/screen-reader run בנוסף ל־automation.

21.13 Evidence הוא Conversation concurrency suite, XSS tests, Human-handoff races, Search isolation, reconnect test ו־Accessibility report.

21.14 Rollback הוא מעבר Inbox ל־Read-only, עצירת Bot/Outbound והמשך קבלת Inbound ledger; אין מחיקת Messages.

21.15 Gate 16 נסגר לאחר Conversation/Message integrity, Assignment, Human handoff, Search isolation, safe attachments ו־Accessibility.

## 22. שלב 17 — Flow Builder ו־Bot Runtime דטרמיניסטי

22.1 מטרת השלב היא לאפשר בניית אוטומציות חזותית בלי Arbitrary code, בלי Loop בלתי־מוגבל ובלי עקיפת Consent, Role או Human handoff.

22.2 זמן משוער לשלב הוא 112–184 שעות עבודה נטו.

22.3 Draft/compile/simulator תלויים ב־Gates 5, ‏7, ‏8 ו־16. הפעלת WhatsApp node חיה דורשת במפורש Gates 10, ‏11, ‏13, ‏14.1 ו־15, ובנוסף Gate 12.2.1 לטקסט/כפתורים, ‏12.2.2 ל־Template, ‏12.2.3 ל־Media, ‏12.2.4 ל־Campaign recipient, ‏12.2.5 להגשת Template או 12.2.6 להעלאת Media לספק לפי פעולת ה־Node; ‏Gate 14.2 נדרש ל־Media. Node שאינו משתמש ב־WhatsApp אינו יורש תלות ספק שאינה חלה.

22.4 הבעלים הנדרש הוא Automation/Product owner; Frontend, Backend, Security ו־Accessibility מאשרים. טל הוא Reviewer רק ל־Automation edge שמבקש WhatsApp send permit או משנה את מדיניות Connect rate limiting.

22.5 משימת Graph schema.

22.5.1 להפריד Draft mutable, Published immutable version ו־Active pointer.

22.5.2 Pilot מאפשר Node allowlist בלבד: Start/inbound trigger, Keyword, Text draft-to-agent, Send approved template, Buttons, List, Condition typed, Wait durable, Contact field update allowlisted, Tag add/remove, Assign, Human handoff ו־End.

22.5.3 אין JavaScript, SQL, Shell, Expression eval, arbitrary HTTP, arbitrary webhook או Dynamic package.

22.5.4 לכל Node להגדיר Schema סגור, Input/output types, Required capability, Allowed triggers, Timeout, Error route ו־Cost class.

22.5.5 Edge מגדיר Port typed; חיבור לא תואם נכשל בזמן עריכה ולא רק ב־Runtime.

22.5.6 תנאי הקבלה הוא Unknown node/property, extra key, wrong port, missing edge ו־schema downgrade שנכשלים.

22.6 משימת Trigger matrix.

22.6.1 להגדיר Trigger חוקי לכל Data class ו־Purpose: inbound message, conversation state, tag, schedule, human approval ו־system event.

22.6.2 Marketing send אינו מופעל מ־Trigger שירותי בלי Consent שיווקי נפרד.

22.6.3 Record פעיל, Legal Hold, Suppression, Tenant suspension או Kill switch יכולים לחסום Action גם כאשר Trigger תקף.

22.6.4 Trigger event מקבל Identity ו־digest דטרמיניסטיים ו־Replay ledger.

22.6.5 תנאי הקבלה הוא כל צירוף אסור של Trigger, Data class, Purpose ו־Action.

22.7 משימת Validation ו־Compilation.

22.7.1 Validator מזהה Node לא נגיש, Start כפול, Dead end, Missing error path, Cycle ללא Guard ו־Variable שאינו מוגדר.

22.7.2 Cycles מותרים רק עם Maximum iterations, elapsed-time budget ו־exit condition שניתנת לבדיקה.

22.7.3 Compiler מפיק Execution plan immutable עם Flow version, Node registry version, Policy versions ו־digest.

22.7.4 Publish דורש Capability, Human approval, Expected draft version ו־Audit; AI אינו מפרסם.

22.7.5 שינוי Registry או Node contract מסמן Flow מושפע כ־Needs review; אין Upgrade שקט.

22.7.6 תנאי הקבלה הוא Compiler deterministic: אותו Graph canonical מפיק אותו Digest ותוכנית.

22.8 משימת Runtime state.

22.8.1 Session מוצמדת ל־Published flow version ול־Tenant; Version חדשה אינה משנה Session קיימת.

22.8.2 כל Step הוא Transition durable עם Expected version, Trigger identity, Input digest, Output digest ו־Result.

22.8.3 Wait נשמר כ־DB wake-up fact; BullMQ הוא מנגנון Wake-up שאפשר לבנות מחדש.

22.8.4 Worker restart, duplicate job או crash אינם מבצעים Step או Action פעמיים.

22.8.5 לכל Session מגבלות Step count, Loop count, Elapsed time, Pending timers, AI tokens ו־External attempts.

22.8.6 Budget exhaustion מנתב ל־Human handoff עם Reason ואינו ממשיך חלקית.

22.8.7 תנאי הקבלה הוא Restart, queue replay, two workers, stale version, budget exhaustion ו־clock skew.

22.9 משימת Variable ו־Condition engine.

22.9.1 להשתמש ב־DSL קטן ו־typed, ללא Function call או Property traversal שרירותיים.

22.9.2 Variable source מוגבל ל־Contact fields מאושרים, Message metadata מאושר, Flow constants ו־Node outputs typed.

22.9.3 Missing ו־null אינם אותו דבר; לכל Condition יש explicit else/error path.

22.9.4 String comparison מגדיר Unicode normalization, Case ו־Locale; Number/date comparison מגדיר Timezone ו־Range.

22.9.5 Secret, Credential, Internal note ו־System prompt אינם Variable sources.

22.9.6 תנאי הקבלה הוא Injection, prototype path, huge string, NaN-like value, locale edge ו־missing field.

22.10 משימת Action authorization.

22.10.1 כל Action בודק מחדש Tenant, Role/system authority, Consent, Suppression, Entitlement, Quota, Feature flag ו־Policy בזמן ביצוע.

22.10.2 Flow decision אינו Capability ואינו עוקף Domain service.

22.10.3 Send action יוצר Proposal או Dispatch authorization דרך המסלול בסעיפים 16–20 בלבד.

22.10.4 Delete, Billing, Export, Credential ו־Admin actions אינם חלק מ־Pilot node allowlist.

22.10.5 תנאי הקבלה הוא Flow תקין תחבירית שמנסה כל פעולה ללא הרשאה ומקבל Fail-closed.

22.11 משימת Simulator ו־Debugging.

22.11.1 Simulator מריץ Execution plan בלי DB business mutation, Queue, Meta, OpenAI או Billing side effect.

22.11.2 Test fixture מוזנת במפורש או נגזרת מ־Evidence מושחר; אין Data generation אקראי.

22.11.3 Simulator מציג Path, Conditions, Variables מושחרות, Blocked actions, Estimated budgets ו־Policy reasons.

22.11.4 Debug replay משתמש ב־immutable event snapshot ואינו פועל על Contact חי.

22.11.5 תנאי הקבלה הוא הוכחת אפס Network/DB side effects ו־same-plan/same-input result.

22.12 משימת Version rollback.

22.12.1 החזרת Active pointer לגרסה קודמת דורשת CAS, Approver ו־Compatibility check.

22.12.2 Sessions קיימות נשארות בגרסה שלהן או עוברות ל־Human; אין Migration אוטומטי בין Graphs.

22.12.3 Node contract שהוסר נשאר נתמך לקריאה/סיום עד Drain או מקבל Blocked state מתועד.

22.12.4 תנאי הקבלה הוא Rollback בזמן Sessions, Timers ו־pending approval.

22.13 משימת Builder UX ונגישות.

22.13.1 לכל פעולת Canvas תהיה חלופה במקלדת וברשימה היררכית נגישה.

22.13.2 Validation errors מקושרים ל־Node ולשדה ומוסברים בעברית פשוטה.

22.13.3 Undo/redo פועל על Draft בלבד ואינו עוקף Version/Approval.

22.13.4 Unsaved changes, concurrent edit ו־publish conflict מוצגים בלי אובדן Graph.

22.13.5 תנאי הקבלה הוא Keyboard-only build, screen reader traversal, RTL connectors ו־two-editor conflict.

22.14 Evidence הוא Node registry, Trigger matrix, Compiler vectors, Runtime replay/restart report, Authorization suite, Simulator proof ו־Accessibility report.

22.15 Rollback הוא Pause של Flow/Tenant, Active-pointer rollback או Human-only mode; Execution ledger נשמר ואינו נכתב מחדש.

22.16 Gate 17 נסגר רק ל־Pilot node allowlist לאחר Determinism, Limits, Authorization, Simulator, Rollback ו־Human handoff.

## 23. שלב 18 — AI, RAG, Knowledge ו־File pipeline

23.1 מטרת השלב היא לספק תשובות וטיוטות מבוססות מקור בעברית, בלי Cross-tenant retrieval, Prompt injection, קובץ עוין, פעולה אוטונומית או Claim פרטיות שגוי.

23.2 זמן משוער לשלב הוא 128–216 שעות עבודה נטו, לא כולל אישור OpenAI Data controls או Legal review.

23.3 תלות בסיס AI ללא Upload היא Gates 5, 6.1, 6.2, 7, 8, 13 ו־16 וכן D02/D02-A2/D25/D26. Knowledge/File intake דורש בנוסף Gate 6.3 ו־D05–D07/D14. Gate 17 נדרש רק כאשר AI מופעל מתוך Flow; Gates 14.1/14.2/15 נדרשים לפי היעד. WhatsApp live path דורש Gate 12.2.1 לטקסט/כפתורים, ‏12.2.2 ל־Template, ‏12.2.3 ל־Media, ‏12.2.4 ל־Campaign recipient, ‏12.2.5 להגשת Template ו־12.2.6 להעלאת Media לספק, ורק ה־instances של הפעולות שב־Scope נדרשים.

23.4 הבעלים הנדרש הוא AI/Product owner; Backend, Security, Privacy, Legal ו־Human reviewers מאשרים. טל הוא Reviewer רק כאשר תוצאת AI נכנסת למסלול WhatsApp send ומשפיעה על מגבלות WhatsApp/Meta או על מדיניות Connect rate limiting.

23.5 משימת OpenAI adapter.

23.5.1 להשתמש ב־Responses API מאחורי `AIProviderPort` המפריד Model registry, Prompt version, Request policy, Usage ו־Errors.

23.5.2 כל Request מגדיר `store:false`; הדבר אינו מוצג כ־ZDR.

23.5.3 ZDR או Modified Abuse Monitoring מופעלים רק לאחר אישור OpenAI ו־Evidence ברמת Organization/Project. כל Dataset/Result של Harness חיצוני וכל File service מקבלים Data-flow ו־Retention review עצמאיים; `store:false` לבדו אינו מחיל עליהם אותה מדיניות.

23.5.3.1 לפני חיבור שיחת WhatsApp ל־OpenAI, Legal ו־Meta owner מסווגים בכתב האם Connect הוא שירות תקשורת עסקית שבו AI ancillary/incidental או AI-primary. Unknown או AI-primary עבור Pilot בישראל חוסם את היכולת ומפעיל Human-only mode.

23.5.3.2 להסדיר בכתב את OpenAI כ־Third Party Service Provider לפי הוראות הלקוח, למפות DPA/terms/subprocessors, ולהוכיח ש־Business Solution Data אינו משמש למטרות OpenAI או Connect שאינן מתן השירות המבוקש.

23.5.3.3 להחיל `whatsapp_business_solution_data=true` כ־Data-class חוסם על Training, Fine-tuning משותף, LLM-as-judge חיצוני, Product analytics לשיפור מודל, Prompt corpus ושיתוף Dataset. חריג אפשרי רק לאחר חוות דעת משפטית כתובה, בידוד ל־AI Model בלעדי ללקוח והוכחה שאין שיפור של מודל אחר.

23.5.3.4 ‏ZDR או Modified Abuse Monitoring אינם Claim בלתי־מותנה לכל Model ולכל זמן. התיעוד הרשמי מתאר Eyes Off ו־Safety Retention ומאפשר ל־OpenAI להודיע כי Model מסוים אינו זכאי לבקרה עבור לקוח מסוים. הודעה, שינוי Eligibility או Retention חריג מבטלים מיד את Model-profile המושפע, עוצרים Requests חדשים ומחזירים ל־Human-only עד Contract/Legal/Security review ו־Evidence חי חדש.

23.5.4 Project ו־API key נפרדים ל־Staging ול־Production, עם Budget, Model allowlist, Rotation ו־Owner.

23.5.4.1 ה־Control plane נבדק ברמת Project ולא רק מתוך קוד האפליקציה: Project identity/status/residency, Organization+Project data-retention type, Model permissions, Hosted-tool permissions, Model-specific rate limits, Service accounts/API keys, Spend alerts ו־hard Spend limit. כל שדה חייב להתאים ל־Environment Manifest; UI screenshot לבדו אינו מחליף Admin API export חתום ומושחר כאשר ה־Endpoint זמין בחשבון.

23.5.5 ‏`gpt-5.6-terra` הוא Candidate ראשי למסלול שיחה. ‏`gpt-5.6-sol` הוא Candidate למסלול Escalation מורכב בלבד, ו־`gpt-5.6-luna` הוא Candidate למשימות צרות ונפח גבוה בלבד. כל מסלול מקבל Eval, Cost cap, latency budget ו־Fallback נפרדים לפני Promotion.

23.5.5.1 להתחיל Benchmark עם Sol כ־Capability ceiling, להשוות Terra לאותו Dataset, ורק לאחר עמידה בכל ספי Security/grounding/Hebrew/abstention לבדוק אם Luna יכול להחליף תת־משימה צרה. Average זול יותר אינו מפצה על Security-critical failure.

23.5.5.2 Router הוא Policy code דטרמיניסטי מתוך Intent/risk classification מאומתת; Model אינו בוחר לעצמו Model חזק יותר, Tool רחב יותר או Budget גדול יותר.

23.5.5.3 כל Response שומר את Model ID שהוגדר בבקשה ואת Model ID שהספק החזיר, Prompt/config digest, Routing reason, usage, ‏Policy version ו־Digest של מקור ה־Model הרשמי, בלי Prompt/Response גולמיים. שינוי באחד המזהים, ב־Metadata, ב־Capabilities, ב־Pricing או בהתנהגות Canary מבטל את אישור ה־Model profile ומפעיל Eval מחדש לפני Promotion.

23.5.5.4 לפני Promotion קוראים את רשומת ה־Model הרשמית ושומרים `id`, ‏`owned_by`, ‏`shutdown_date`, זמן הבדיקה ו־response digest. ‏`shutdown_date=null` אינו הבטחה שאין Deprecation עתידי; Watch ממשיך לפי Freshness. תאריך Shutdown קיים יוצר Migration deadline, Freeze על שימוש חדש ו־Rollback profile שנבדק לפני המועד.

23.5.6 Model alias או Changelog אינם נכנסים אוטומטית ל־Production. Release נקשר ל־Connect Model-profile revision שעבר Evals ומכיל Configured model ID, ‏Provider-returned model ID, ‏Prompt/config/corpus/result digests ומקור רשמי. Provider ID אינו מוצג כ־Immutable snapshot אלא אם OpenAI וה־Live account מוכיחים זאת במפורש; אם אין הוכחה כזו, ה־Profile נחשב Mutable, מקבל Canary/Freshness/kill-switch מחמירים ואינו מקודם מעבר ל־Scope שאושר בהחלטת סיכון חתומה.

23.5.7 `safety_identifier` נגזר מזהות משתמש מושחרת ויציבה, בלי Email, Phone או Tenant name.

23.5.7.1 לנסח Pseudonym profile חתום הכולל Canonical input framing, Environment, Tenant, Purpose, approved keyed derivation, Key reference/version, Output encoding/length, Rotation, Reindex, Revocation ו־Incident handling. אין Plain SHA/unsalted hash, Raw identifier, Reversible mapping או Cross-tenant/purpose stable value.

23.5.7.2 ה־Adapter שולח את השדה בכל בקשת Responses foreground מאושרת. Request admission נכשל סגור כאשר Subject, Tenant, Profile digest, Key version או Provider capability חסרים או שונים מן ה־Release profile; אין Fallback למזהה גולמי, קבוע גלובלי או השמטה שקטה.

23.5.7.3 Telemetry ו־Evidence שומרים `safetyIdentifierSent`, ‏`pseudonymProfileDigest`, ‏`keyVersion`, ‏`derivationOutcome` ו־Correlation פנימי שאינו הערך שנשלח. Raw/derived safety identifier אינו נכתב ל־Log, Trace, Error, Analytics, Eval corpus או Evidence bundle.

23.5.7.4 בדיקה חיובית מוכיחה Stability באותו Tenant+Purpose+Profile; בדיקות שליליות מוכיחות הפרדה בין Tenants/Purposes, דחיית Raw PII ו־Plain hash; בדיקת Failure משביתה AI בעת KMS/Profile failure; בדיקת Concurrency מוכיחה ש־Rotation אינה מערבבת Key versions. אישור מסמך X24 לשימושי CSPRNG, אם יידרש ליצירת חומר מפתח או Capability token, נשאר החלטה נפרדת ואינו נובע מאישור ה־Master Plan.

23.5.8 תנאי הקבלה הוא Adapter contract, `store:false` assertion, Model allowlist, budget failure ו־secret hygiene.

23.5.9 לבנות מטריצת Endpoint/feature retention מתוך OpenAI Data Controls העדכניים. Responses foreground עם `store:false` הוא המסלול היחיד המותר כברירת Pilot; Conversations, Files, Vector stores, hosted containers/tools, background mode, MCP ו־third-party egress נשארים חסומים עד Review ייעודי.

23.5.9.1 ה־Pilot אינו שולח ל־OpenAI Image או File input. קובץ Knowledge נסרק ומפורש ב־Connect, ורק Text chunk ממוזער ומאושר יכול להיכנס ל־Responses foreground. הפעלה עתידית של Image/File input דורשת Package נפרד משום שהתיעוד הרשמי מתאר CSAM scanning וחריג Retention לבדיקת אדם גם תחת ZDR/MAM/Eyes Off כאשר classifier מזהה חשד.

23.5.10 ללא ZDR מאושר, Abuse-monitoring content עשוי להישמר עד 30 יום ו־Prompt caching עשוי לשמור application state מוצפן עד 24 שעות. ‏`store:false` אינו Claim של אפס שמירה, ו־`prompt_cache_options.ttl` אינו מוצג כ־Maximum-retention control.

23.5.10.1 ‏Responses שומר Application state לפחות 30 יום כברירת מחדל או כאשר `store:true`; ‏foreground `store:false` מצמצם את Application state אך אינו מבטל Abuse-monitoring retention. ‏Background עם `store:false` עדיין עשוי לכתוב לדיסק לכעשר דקות לצורך Polling ולכן נשאר אסור ב־Pilot. עבור משפחות Model נתמכות, `prompt_cache_options.ttl` קובע Minimum cache lifetime ולא את Maximum 24-hour application-state retention.

23.5.11 לפני Gate 18.1, ולפני Gate 18.2 כאשר Knowledge/RAG/File pipeline נמצא ב־Scope, יש להוכיח Organization/Project retention mode, Model eligibility, Endpoint eligibility ו־request-level `store:false` באמצעות Export/צילום מושחר ובדיקת API. אם ZDR אינו מאושר, Legal מחליט אם המסלול המצומצם מותר; אחרת AI נשאר כבוי.

23.5.11.1 חבילת ה־Evidence כוללת פלט מושחר ודיגסטים של `GET /organization/data_retention`, ‏Project record, ‏Project data retention, ‏Hosted-tool permissions, ‏Model permissions במצב `allow_list`, ‏Model-specific rate limits, ‏Spend alerts/limit, ‏Service accounts/API-key metadata ו־Model record. כל Export נקשר ל־Organization, Project, Environment, checkedAt ו־Expiry; אין להכניס Admin/API key ל־Evidence.

23.5.11.2 בדיקות שליליות: Organization ZDR אך Project מוגדר `none`; Staging ו־Production חולקים Project/Key; Model policy הוא `deny_list` או Alias/Model לא מאושר; Hosted tool מופעל; Rate/cost limit גבוה מן Manifest; Spend alert קיים ללא hard enforcement; Admin export חסר/חלקי/ישן; Safety-Retention notice; ו־Model בעל `shutdown_date` שלא קיבל Migration. כל אחד משאיר AI כבוי.

23.5.11.3 Admin API key הוא Control-plane credential נפרד שאינו נגיש ל־Runtime, ל־CI רגיל או ל־Support. השימוש בו הוא Read-only evidence job מאושר או שינוי Control plane עם Break-glass/dual approval; תוצאה נבדקת מחדש ב־Read-after-write ומושווית ל־Manifest, אך Read-after-write אינו Rollback. כשל או חוסר Entitlement אינם מאפשרים ניחוש או Downgrade שקט.

23.6 משימת File intake.

23.6.1 לאפשר PDF, TXT ו־DOCX עד 10 MiB בלבד לפי D06.

23.6.2 Upload ישיר ל־Quarantine; API אינו קורא את כל הקובץ לזיכרון ואינו מפרש לפני Scan. Upload session קושר Tenant, Bucket, server-selected key, Method, MIME, maximum bytes, checksum, expiry ו־single-use state; Presigned URL שניתן להעתיק או לשימוש חוזר עד Expiry אינו נחשב one-shot ללא State עמיד.

23.6.2.1 לחייב SigV4 checksum ו־`s3:signatureAge`, למנוע overwrite של Key קיים, להגביל Multipart ולבטל incomplete uploads. copied URL, second use, wrong checksum/headers, oversize ו־orphan multipart נכשלים.

23.6.3 לבדוק Extension, MIME, Magic bytes, Archive structure, Encryption/password, Macro/active content, Object count ו־compression ratio. DOCX מותר רק כ־OOXML ZIP container מאומת; DOCM, embedded OLE/executable, external relationship, nested archive, renamed ZIP ו־resource bomb חסומים.

23.6.4 Pilot דוחה Macro, Embedded executable, Password-protected, Archive ו־Polyglot; אין CDR אוטומטי עד בחירת כלי וביקורת נפרדת.

23.6.5 GuardDuty שומר State לפי Account+Region+Protection-plan ARN+Bucket+Key+VersionId. שחרור דורש `scanStatus=COMPLETED`, ‏`scanResultStatus=NO_THREATS_FOUND` ו־Application/S3 checksum תואם; ETag הוא Opaque ואינו Digest מלא. כל Unsupported/Skipped/Access-denied/Failed/Timeout/Unknown או גרסה אחרת נכשל סגור.

23.6.5.1 תוצאות EventBridge מטופלות כ־At-least-once ועשויות להגיע כפולות ומחוץ לסדר; State machine מונוטוני קושר Result ל־VersionId ואינו מאפשר לאירוע ישן, Tag מאוחר, Reupload או Rescan להלבין Version אחר. מצב Protection plan מסוג Warning/Error, כשל Tagging או Metric gap מפעיל Reconciliation ואינו שחרור.

23.6.5.2 תוצאת `NO_THREATS_FOUND` אינה Behavioral detonation ואינה מבטלת את 23.6.2–23.6.4: פורמט, Container, Active content, External relationships, Polyglot, Parser/resource budgets, Egress ו־Knowledge poisoning נבדקים בנפרד לפני Clean/index.

23.6.5.3 EventBridge מספק לפחות פעם אחת ועלול להגיע מחוץ לסדר. Dedup משתמש גם ב־Event envelope ID וגם ב־Semantic object-version identity; reducer מונוטוני, Conflict/schema לא מוכר יוצר Incident. Tag failure הוא Event נפרד ואינו הופך Object לנקי או נגוע בעצמו.

23.6.5.4 Transport retry, Consumer idempotency, DLQ/alarms, Reconciliation לאובייקט בלי Terminal event ו־On-demand rescan לפי VersionId הם חוזים נפרדים. קבלת `SendObjectMalwareScan` מאשרת Intake בלבד ולא Verdict.

23.6.6 רק אז נוצר Clean object בלתי־משתנה או Reference נקי; החלפת Object מבטלת Evidence.

23.6.7 תנאי הקבלה הוא EICAR-safe test לפי נוהל, MIME spoof, malformed PDF/DOCX, zip bomb, encrypted file, object replacement ו־scan event replay.

23.7 משימת Extraction sandbox.

23.7.1 Parser פועל בתהליך או Container מבודד ללא Internet, ללא Cloud metadata וללא Credential.

23.7.2 להגדיר Budgets ל־CPU, memory, wall time, page count, XML entries, characters, output bytes ו־nested objects.

23.7.3 TXT עובר Encoding detection מוגבל ו־Unicode normalization; Binary disguised as text נדחה.

23.7.4 PDF/DOCX extraction שומר Source offsets ו־Parser/version evidence; אין Macro execution או external link fetch.

23.7.5 Job תקוע אחרי 15 דקות עובר Recovery; לאחר שלושה ניסיונות מצטברים עובר `needs_review` ולא Retry נוסף.

23.7.6 Parser update מחייב Regression corpus ו־Re-index decision; הוא אינו משנה Knowledge קיים בשקט.

23.7.7 תנאי הקבלה הוא resource exhaustion, crash, hang, parser exception, malformed Unicode ו־no-network proof.

23.8 משימת Knowledge lifecycle.

23.8.1 להגדיר Quarantined, Scanning, Extracting, Review, Published, Rejected, Revoked, Deleting ו־Deleted.

23.8.2 Published דורש Human approval, uploader/source, content hash, scanner/parser versions, classification ו־Policy version.

23.8.3 שינוי מקור יוצר Document version חדשה ואינו משכתב Chunks קיימים.

23.8.4 Revocation מסירה את הגרסה מ־Retrieval מיד ומפעילה Cascade ל־chunks, embeddings ו־caches.

23.8.5 Legal Hold חוסם מחיקה אך אינו מחייב שהמסמך יישאר Published.

23.8.6 תנאי הקבלה הוא Publish/revoke/delete race, hold, failed cascade ו־orphan detection.

23.9 משימת Vector index.

23.9.1 Pilot משתמש ב־PostgreSQL עם `pgvector` מאחורי `VectorIndexPort`, רק לאחר אימות שה־Extension והביצועים נתמכים בסביבת Railway בפועל.

23.9.2 אם התמיכה או ביצועי הבידוד אינם מוכחים, Knowledge AI נשאר כבוי; אין מעבר שקט ל־Vector provider אחר.

23.9.3 כל Chunk כולל Tenant, Document/version, ACL/classification, Source offsets, content digest, embedding model ו־index version.

23.9.4 Tenant/ACL filtering מתבצע לפני similarity search וב־DB policy, לא רק לאחר קבלת תוצאות.

23.9.5 Embeddings נחשבים מידע רגיש ולא אנונימי; הם מוצפנים, מורשים ונמחקים לפי המקור.

23.9.6 Index version כולל Model, Chunking config, parser version ו־corpus digest; Query ו־Result ניתנים לייחוס.

23.9.7 תנאי הקבלה הוא Cross-tenant nearest-neighbor attack, stale index, deleted source, dimension mismatch ו־performance budget.

23.10 משימת RAG security.

23.10.1 Retrieved text מסומן Untrusted data ומופרד מהוראות System ו־Developer.

23.10.2 לזהות ולסמן Hidden/zero-width text, instruction-like patterns, encoded payload ו־conflicting source; detection לבדה אינה הרשאה.

23.10.3 להגביל Top-k, Chunk size, Total context, Source count ו־per-document contribution.

23.10.4 תשובה חייבת Citation ל־Document/version/chunk שניתן לפתוח לפי הרשאה; ללא Evidence מספק היא מבצעת Abstain.

23.10.5 Prompt או Retrieved data אינם מקבלים Credential, Internal note, Hidden system policy או Tool secret.

23.10.6 מסמך בעל סיווג גבוה אינו נשלח ל־OpenAI בלי Data-flow approval מתאים.

23.10.7 תנאי הקבלה הוא Direct/indirect injection, cross-document poisoning, source conflict, hidden Unicode ו־citation mismatch.

23.11 משימת Prompt ו־Output contracts.

23.11.1 Prompt registry שומר Version, Owner, Purpose, Allowed inputs, Model, Tools, Output schema, Safety policy ו־Eval set.

23.11.2 Structured output עובר Schema סגור, Length, Language, Citation, PII/secret ו־policy validation.

23.11.3 Model output הוא Untrusted; UI מציגו כטיוטה ולא מרנדר HTML או Link לא בטוח.

23.11.4 Moderation ו־Product policy פועלים לפני הצגה או שליחה לפי Use case.

23.11.5 Tool allowlist ריקה ב־Pilot או מוגבלת לכלי Read-only מאושר; כל Tool בודק Authorization מחדש.

23.11.6 Send, Billing, Delete, Export, Permission או Credential action נוצרים לכל היותר כ־Proposal לאישור אדם.

23.11.7 תנאי הקבלה הוא schema escape, tool injection, approval bypass, secret request, excessive output ו־unsafe link.

23.12 משימת Evals.

23.12.1 לבנות Dataset גרסתי בעברית עם שאלות אמיתיות מאושרות, Source truth, תשובה צפויה, Abstain cases ו־Human labels.

23.12.2 Dataset משתמש רק בארבעת מקורות הראיה המאושרים שב־5.4; אין Phone, Tenant ID, Secret, שיחה גולמית או מידע עסקי מומצא.

23.12.2.1 מידע חי שמקורו ב־WhatsApp אינו נכנס ל־Eval/Training/Prompt-improvement corpus רק משום שהושחר או עבר Aggregation. ברירת המחדל היא אחת מארבע מחלקות המקור המאושרות שב־5.4, ובפרט Vector נורמטיבי או Attack literal דטרמיניסטי שאינו מידע עסקי; אין להמציא Dataset עסקי סינתטי. שימוש ב־Artifact אמיתי דורש אישור מקור, מזעור, Legal decision לפי D02-A2 ומסלול Provider מאושר.

23.12.3 Suites מודדות Groundedness, Citation correctness, Abstention, Hebrew quality, Safety, Leakage, Prompt injection, Poisoning, Tool misuse, Cost ו־Latency.

23.12.4 להשוות שינוי אחד בכל פעם: Model, Prompt, Chunking או Retrieval policy.

23.12.5 ספי Release נקבעים רק לאחר Baseline על Dataset מאושר; אין להמציא כעת ציון איכות.

23.12.6 כל Security critical failure חוסם Release גם אם Average score עלה.

23.12.7 לבצע Human review לדוגמאות Failed ו־Borderline ולתעד Root cause.

23.12.8 תנאי הקבלה הוא Reproducible eval run עם Dataset/model/prompt/index digests.

23.12.9 אין לבנות תלות מוצר ב־OpenAI Hosted Evals Dashboard/API. נכון ל־26.08.2026 תיעוד OpenAI הרשמי מציין Deprecation, מעבר ל־Read-only ב־31.10.2026 וסגירה מתוכננת ב־30.11.2026. ה־Harness הקנוני רץ מקומית או ב־CI, שומר Config/Dataset/Assertion/Result digests ויכול להחליף Runner בלי לשנות את Contract; Hosted Evals נשאר חסום ב־Pilot גם מטעמי Data lifecycle ו־Evidence ownership.

23.12.10 Harness ההערכה נשאר בבעלות Connect. אם כלי צד שלישי כגון Promptfoo נבחר לאחר Evaluation נפרד, יש לבצע Pin לגרסה, Review של Install scripts ו־Transitive dependencies, License approval, no telemetry/network mode שאינו מאושר, Secret redaction ו־Sandbox. ‏LLM-as-judge אינו Gate יחיד ומכויל מול Human labels.

23.13 משימת Cost, latency ו־abuse.

23.13.1 להגדיר Per-user, Tenant, Feature ו־Provider budgets, Token caps, Concurrency ו־Daily/monthly cost caps.

23.13.2 Prompt length ו־Retrieved context מוגבלים לפני API call; Retry bounded ואינו מכפיל Action.

23.13.3 Cost anomaly, repeated unsafe prompts ו־provider rate errors מפעילים slowdown או AI kill switch.

23.13.4 Telemetry מכילה Usage ו־latency בלי Prompt/Response גולמיים כברירת מחדל.

23.13.5 תנאי הקבלה הוא cost DoS, concurrency burst, provider outage, timeout ו־budget exhaustion.

23.14 משימת Privacy ו־deletion.

23.14.1 למפות אילו שדות נשלחים ל־OpenAI, באיזו עילה, באיזו Region/retention של הספק ומה חוזר.

23.14.2 `store:false` נבדק בבקשה; Abuse monitoring עד 30 יום ותנאי ZDR מוצגים במסמכי פרטיות באופן מדויק לפי Evidence.

23.14.3 אין להשתמש ב־OpenAI Files/Vector stores ל־Pilot Knowledge source of truth; האחסון וה־index נשארים בשליטת Connect.

23.14.4 Deletion מסירה Source, Chunks, Embeddings, Cache ו־Derived summaries ומפיקה Orphan report.

23.14.5 Legal ו־Privacy מאשרים DPA, international transfer, Notice, Data-subject workflow ו־Retention לפני Pilot AI.

23.14.6 ליצור OWASP AISVS 1.0 applicability matrix לכל 191 הדרישות. כל דרישה מקבלת Versioned ID, Asset/Flow, Level, Pass/Fail/N/A justification, Test, Evidence, Owner ו־Review date. יעד כל AI חי הוא Level 2; בקרת Level 3 שנבחרה נרשמת במפורש.

23.14.7 למפות בנוסף OWASP GenAI LLM Top 10 2026, OWASP Agentic Top 10 2026, NIST SP 800-218A, NIST AI 100-2e2025 ו־MITRE ATLAS אל Threat/Control/Test registries. Top 10 הוא Awareness layer ואינו מחליף AISVS requirements.

23.14.8 Multi-agent delegation, MCP, autonomous planning, Browser/computer use, hosted shell, write-capable tools ו־persistent autonomous memory אסורים ב־Pilot. פתיחתם דורשת Capability gate נפרד נגד Goal manipulation, tool/identity confusion, excessive permissions, memory poisoning, inter-agent abuse ו־cascading failure.

23.14.9 שינוי Model, Prompt, Tool, Retrieval, Memory, Dataset, Provider terms או AI framework version מפעיל Delta threat model ו־Eval מחדש לפני Promotion.

23.15 Evidence הוא Project data-control report, Prompt/model/index registry, Eval reports, Red-team corpus, Scan/extraction chain, Cross-tenant tests, Cascade deletion ו־Human approval trace.

23.16 Rollback הוא AI kill switch, Human-only Inbox, חזרה ל־Prompt/model/index שעבר Evals, Revocation של Index פגום ו־API key rotation; אין Replay אוטומטי של AI actions.

23.17 Gate 18 הוא Namespace מפוצל.

23.17.1 Gate 18.1 — AI assistant ללא Knowledge upload — נסגר לאחר Legal/Data-control approval, Meta AI-primary/ancillary classification כתוב, Third Party Service Provider contract, איסור Model-improvement מוכח, AISVS L2 matrix, Evals, Red team, Deletion drill ו־`agent-approval-only` מוכח.

23.17.2 Gate 18.2 — Knowledge/RAG/File pipeline — דורש בנוסף 6.3, Clean file pipeline, Tenant-safe index, Source/chunk/embedding lifecycle, GuardDuty evidence ו־RAG poisoning/citation tests.

23.17.3 AI כבוי מוכח אינו תלוי ב־18.1/18.2. AI ללא Upload אינו תלוי ב־18.2.

## 24. שלב 19 — Billing, Subscriptions, Entitlements ו־Finance

24.1 מטרת השלב היא לבנות Domain פיננסי עקבי ו־Pilot ידני. שני Adapters רדומים בלבד נמצאים ב־Base: ‏PayPlus כ־primary-discovery ו־Tranzila כ־alternate. ‏Paddle ו־Stripe מקבלים ב־Base רק Contract/Eligibility/disabled-state records ללא Credential, Route, Job או Network-capable adapter; יישום Adapter עבורם דורש החלטת Scope חדשה והוכחה שהחסם המתועד הוסר. בכל מצב רק ספק אחד יכול להיות חי, ואין גישה על סמך Redirect, Callback או Event לא מותאם.

24.2 זמן משוער לשלב ההנדסי הוא 88–144 שעות עבודה נטו, לא כולל Onboarding, KYC, Legal, Tax ו־Finance.

24.3 תלות התכנון היא Gates 3, 4, 5, 6, 7 ו־8 וכן D03/D23/D28. Gate 13 נדרש רק כאשר Billing contact משתמש ב־Contact domain; מסלול 19.1 אינו תלוי ב־19.2 או 19.3.

24.4 הבעלים הנדרש הוא Billing/Product owner; Finance, Legal, Backend ו־Security מאשרים. אין לטל תפקיד Billing/Finance שנקבע; השפעת מכסה מסחרית על WhatsApp rate policy בלבד עוברת אליו ל־Review.

24.5 משימת Pilot manual plan.

24.5.1 Production נשארת `activeProvider=none` ב־Pilot; אין Hosted checkout ואין חיוב אוטומטי.

24.5.2 Manual entitlement דורש Tenant, Plan revision, Features, Quotas, Effective period, Reason, Approver ו־Audit.

24.5.3 Grant פג תוקף נכשל סגור או עובר ל־Read-only policy שאושרה; אין הארכה שקטה.

24.5.4 מחיר, מטבע, מס, Refund, Grace ו־Overage נקבעים על ידי Product/Finance/Legal ולא בקוד.

24.5.5 תנאי הקבלה הוא expiry, concurrent override, wrong tenant, revoked approver ו־quota boundary.

24.6 משימת Provider-neutral domain.

24.6.1 להגדיר `BillingPort` ל־Checkout, Portal, subscription lookup, change/cancel intent ו־reconciliation.

24.6.2 להגדיר `EntitlementPort` ל־Feature access, Quota, Grace, manual override ו־Usage snapshot.

24.6.3 Customer, Subscription, Product, Price, Transaction/Invoice reference ו־Entitlement הם Domain records; Provider IDs נשמרים במיפוי נפרד.

24.6.4 Activation registry הוא Domain-neutral ומכיר את המזהים `none`, ‏`payplus`, ‏`tranzila`, ‏`paddle` ו־`stripe`; הכרה במזהה אינה יישום Adapter או הרשאת הפעלה. ברירת המחדל היא `none`, שני ספקים פעילים נכשלים ב־Startup וב־CI, וכל ערך שאינו קשור ל־Provider selection evidence חי ול־Adapter מאושר נכשל סגור.

24.6.5 PayPlus הוא primary-discovery candidate ו־Tranzila alternate. Paddle ו־Stripe נשארים Dormant לפי מגבלות D03; אף Adapter אינו מקבל live credential או Entitlement authority לפני Gate ספק עצמאי.

24.6.6 תנאי הקבלה הוא Contract suite זהה לשני ה־Adapters שב־Base, ‏PayPlus ו־Tranzila, וכן הוכחה שכל Provider רדום או חסום אינו מבצע Network גם עם Config חלקי. רשומות Paddle/Stripe נבדקות בנפרד כהוכחת היעדר Route/Credential/Job ואינן נספרות כ־Adapter מוכן.

24.7 משימת Catalog ו־Pricing.

24.7.1 Product/Price registry כולל Provider, Environment, Currency, Billing interval, Tax behavior, Features, Quotas, Effective period ו־digest.

24.7.2 Client שולח Plan intent קנוני בלבד; Server בוחר Provider price ID מן ה־Registry.

24.7.3 שינוי מחיר יוצר Version חדשה ואינו משנה Subscription קיימת ללא Migration/notice מאושרים.

24.7.4 Catalog publish דורש Finance approval ו־Sandbox verification.

24.7.5 תנאי הקבלה הוא price substitution, stale plan, wrong currency, sandbox/live mix ו־catalog drift.

24.8 משימת Hosted checkout ו־Portal.

24.8.1 Hosted checkout בלבד; Connect אינו אוסף, מעבד או שומר PAN/CVV.

24.8.1.1 Hosted page או Hosted fields עשויים לצמצם PCI scope אך אינם הוכחה ש־Connect “PCI compliant” או מחוץ לכל SAQ/contract duty. לפני Provider activation נדרשים Approved integration topology, Browser/network scan שמוכיח שאין PAN/CVV ב־DOM/Request/Log/Telemetry/Support, Merchant/Processor responsibility matrix, SAQ/QSA/Acquirer decision ו־Incident route. ‏Provider marketing copy אינה Evidence.

24.8.2 Checkout intent כולל Tenant, Plan revision, Actor, Expiry ו־idempotency digest.

24.8.3 Success/cancel URLs נבנים רק מ־`APP_PUBLIC_ORIGIN` מאומת HTTPS.

24.8.4 Redirect הצלחה הוא UX בלבד ואינו מעניק Entitlement.

24.8.5 Customer portal נפתח רק לאחר Tenant/customer binding ו־Capability.

24.8.6 תנאי הקבלה הוא forged redirect, reused intent, wrong customer, malicious origin ו־double click.

24.9 משימת Webhook security.

24.9.1 Endpoint נפרד לכל Provider וסביבה, עם Raw body, Size limit ו־Exact content type.

24.9.2 לכל Adapter מאושר יש Profile אימות עצמאי. PayPlus ו־Tranzila דורשים byte-level callback-authenticity probe, canonicalization מדויקת, replay/idempotency contract ו־transaction reconciliation לפני כל Entitlement. ללא מסמך ספק רשמי עדכני ו־Fixture מורשה, Callback נשאר Signal בלבד ואינו מעניק Entitlement.

24.9.2.1 דוגמת PayPlus שנבדקה 27.08.2026 בונה HMAC מעל `JSON.stringify(response.body)`, משווה String באופן רגיל ובודקת `User-Agent`. אלה דוגמת Integration בלבד: ‏User-Agent אינו Authentication, ‏Reserialization אינה Raw-byte contract, והשוואה רגילה אינה Timing-safe. לפני Adapter נדרש מ־PayPlus מסמך חתום/Versioned ל־exact bytes, encoding, Header names, key scope, rotation, replay/timestamp/Event identity ו־Live/Sandbox parity; אחרת Callback נשמר Signal ומבצעים Server-to-server reconciliation.

24.9.2.2 ‏Tranzila V2 API מתעד Request headers של App key, Unix time, Nonce בן 40 bytes ו־HMAC-SHA256. זה מאמת Client→Provider authentication בלבד ואינו מוכיח חתימה על Notification נכנסת. לפני שימוש נדרשים exact HMAC framing/encoding/time skew/nonce replay contract, Credential scope ו־authorized Fixture. Nonce הוא ערך אבטחה הדורש OS CSPRNG ואישור X24 שימושי נפרד; אין `Math.random()` ואין הפעלה לפני האישור.

24.9.2.3 ‏Tranzila Handshake V2 קושר Amount/details ב־Provider ותקף לפי התיעוד כ־20 דקות, אך הוא Module בתשלום ו־Account capability חי. הוא Candidate מחייב אם Tranzila נבחרת; Config/terminal/module/TTL חיים, ניסיון Amount substitution, expiry, duplicate/retry ו־Server-only secret נבדקים לפני Checkout. Handshake success אינו Payment או Entitlement.

24.9.2.4 אם Provider אינו מספק Webhook authenticity ו־Replay contract שניתן לבדיקה, אין “פיצוי” באמצעות IP allowlist, User-Agent, Hidden URL או Redirect. ‏Webhook רק פותח Reconciliation job; Entitlement משתנה לאחר Query מאומת לספק, Amount/Currency/Tenant/transaction match, monotonic reducer ו־Finance policy. אם גם Query authority חסרה, Billing נשאר `activeProvider=none`.

24.9.3 Paddle/Stripe נשארים ב־Base כרשומות חסומות בלבד. הדרישות הידועות על Raw body, Endpoint secret, timestamp או SDK נשמרות כמועמדות מחקר ואינן יוצרות Endpoint, Secret או Verification claim; אם חסם Eligibility/Business-location יוסר ו־Scope חדש יאושר, נדרש Source refresh ו־Adapter package עצמאי לפני מימוש.

24.9.4 Event ledger append-only שומר Provider, Environment, Event ID, Type, Created time, Payload digest, Receive time ו־Processing state.

24.9.5 Duplicate מקבל Ack אך אינו מעבד שוב; Out-of-order עובר Reducer מונוטוני או resource re-fetch.

24.9.6 Secret rotation משתמשת בחלון קצר ומפורש; Sandbox secret אינו תקף ל־Live.

24.9.7 תנאי הקבלה הוא missing/wrong signature, modified raw body, timestamp skew, duplicate, reorder, unknown event ו־secret rotation.

24.10 משימת Subscription reducer.

24.10.1 להגדיר States קנוניים ו־Mapping מפורש לכל Provider; State לא מוכר אינו מעניק גישה.

24.10.2 Entitlement projection כולל Plan revision, Features, Quotas, Effective time, Source event ו־Reconciled time.

24.10.3 API ו־UI קוראים רק ל־Entitlement service המקומי, לא ישירות ל־Provider metadata.

24.10.4 Refund, chargeback, pause, cancel, past-due ו־resume מקבלים Policy כתובה, Grace ו־Customer communication.

24.10.5 Event ישן אינו מחזיר Projection לאחור; סתירה מפעילה Provider fetch ו־Alert.

24.10.6 תנאי הקבלה הוא כל lifecycle, duplicate/reorder, missing event ו־provider outage.

24.11 משימת Usage ו־Quota.

24.11.1 להגדיר Meter לכל Feature: יחידה, Source ledger, Window, reset timezone, Reservation ו־Overage policy.

24.11.2 Quota authorization מתבצעת לפני Side effect ומתקשרת ל־durable reservation.

24.11.3 Usage אינו נגזר רק מ־Queue או Provider webhook; Source ledger פנימי מאפשר reconciliation.

24.11.4 Billing quantity ו־Operational rate limit הם מושגים נפרדים; אחד אינו עוקף את השני.

24.11.5 תנאי הקבלה הוא boundary, concurrent use, refund/reversal, clock transition ו־rebuild.

24.12 משימת Reconciliation.

24.12.1 Job תקופתי משווה Customers, Subscriptions, Prices, Transactions ו־Entitlements מול הספק הפעיל.

24.12.2 Drift מייצר Alert ו־Repair proposal; תיקון המשפיע על גישה או כסף דורש Audit ואישור לפי חומרה.

24.12.3 Migration עתידית בין ספקים היא פרויקט מפורש; אין יצירת Subscription אצל הספק האחר אוטומטית.

24.12.4 להפיק Daily financial control totals ו־exception report ש־Finance יכול לבדוק.

24.12.5 תנאי הקבלה הוא missing webhook, changed price, provider correction, duplicate customer ו־partial outage.

24.13 משימת מס, חשבוניות ודין ישראלי.

24.13.1 Finance ויועץ מס יקבעו Seller/Merchant of record, ספק חי, לקוחות ישראלים, מע״מ, Refund, Credit note וחשבוניות. אין להסיק ש־Paddle, Stripe, PayPlus או Tranzila פותרים חובה מקומית ללא החלטה חתומה.

24.13.2 לא להציג את Receipt של Provider כחשבונית ישראלית תקפה בלי אישור מקצועי.

24.13.3 לבדוק דרישות רישום תוכנה לניהול מערכת חשבונות, מספור מסמכים, שמירת Records ו־Israel Invoices לפי מודל העסק בפועל.

24.13.4 Terms, Cancellation, Refund, Trial, Renewal notice ו־Customer support מאושרים לפני Live.

24.13.5 תנאי הקבלה הוא Sign-off של Finance, Legal ויועץ מס עם רשימת Responsibilities בין Connect לספק.

24.14 Evidence הוא Contract reports לשני ה־Adapters שב־Base מתוך סביבת Provider רשמית ומורשית כאשר קיימת; אם לספק אין Sandbox מתאים, אין להמציא תחליף וה־Adapter נשאר חסום עד Test environment או Live canary מאושר. בנוסף נדרשים callback-authenticity/replay suites, ‏Activation invariant, ‏Catalog digest, ‏Entitlement lifecycle, ‏Reconciliation drill, ‏Hosted-checkout data flow ו־Finance/Legal sign-off. רשומות Paddle/Stripe מוכיחות רק disabled state והחסם הנוכחי.

24.15 Rollback הוא `activeProvider=none`, חסימת Checkout חדש והמשך קבלת Webhooks חתומים רק לצורך התאמת עסקאות קיימות; Billing ledgers אינם נמחקים ואין Failover אוטומטי לספק אחר.

24.16 Gate 19.1 מאשר רק את מסלול ה־Pilot הידני: Manual plan/entitlement, invoice/payment reference או free-pilot decision, expiry/read-only, quota, Finance reconciliation, Audit ו־customer notice. Gate 19.2 מאשר את Adapters ‏PayPlus ו־Tranzila כרדומים בלבד. Gate 19.3 להפעלת אחד מהם כספק יחיד דורש Live account, Catalog, Policies, Finance/Legal/Tax, callback authenticity חי, Reconciliation ו־Rollback drill. Paddle או Stripe דורשים Gate וסעיף Scope חדשים ואינם יורשים את 19.2 או 19.3.

## 25. שלב 20 — System Admin, Support ו־Break-glass

25.1 מטרת השלב היא לאפשר ניהול ותמיכה בלי ליצור מסלול עוקף ל־Tenant isolation, ל־Audit, ל־Consent או לאישור אנושי.

25.2 זמן משוער לשלב הוא 72–120 שעות עבודה נטו.

25.3 תלות Core pilot היא Gates 3, 5–8, 13 ו־19.1. ‏Gate 19.2 נדרש רק אם Admin מציג או מנהל את שני Billing adapters הרדומים; Gate 19.3 נדרש רק להפעלת Provider חי.

25.4 הבעלים הנדרש הוא Security/Platform owner; Product, Support, Privacy, Database ו־Deployment מאשרים.

25.5 משימת Admin realms.

25.5.1 להפריד Tenant Admin, Support operator, Billing operator, Security operator, System Admin ו־Auditor read-only.

25.5.2 System roles אינם Clerk Organization roles רגילים ואינם ניתנים להקצאה על ידי Tenant owner.

25.5.3 לכל פעולה להפריד View, Change, Approve, Execute, Export ו־Override.

25.5.4 Support אינו רשאי כברירת מחדל לשלוח הודעה, לשנות Billing, לשנות Consent/Legal Hold, לייצא מידע או להחליף Credential.

25.5.5 Security invariants כגון Tenant binding, Suppression, one-attempt ו־Legal Hold אינם ניתנים ל־Override דרך Admin UI.

25.5.6 תנאי הקבלה הוא Role × Action × Tenant matrix עם Allow ו־Deny לכל תא מהותי.

25.6 משימת Support session.

25.6.1 גישת Support קשורה ל־Ticket, Tenant יחיד, Reason, Allowed actions, Approver ו־TTL מרבי של 30 דקות.

25.6.2 אין התחזות שקטה למשתמש; UI מציג Banner ברור, זהות התומך, Scope ושעת תפוגה.

25.6.3 כל התחלה, הארכה, פעולה וסיום נרשמים ב־Audit; הארכה דורשת Reapproval.

25.6.4 צפייה בתוכן שיחה או קובץ דורשת Need-to-know, Capability ואישור לקוח או Break-glass לפי Legal policy.

25.6.5 Support bundle מושחר, קצר־חיים, קשור ל־Ticket ומכיל Config/IDs רק במינימום הנדרש.

25.6.6 תנאי הקבלה הוא wrong tenant, expired ticket, action outside scope, concurrent sessions, revoked operator ו־bundle leak scan.

25.7 משימת Break-glass.

25.7.1 Break-glass הוא מסלול חירום בלבד ואינו חשבון Admin יומיומי.

25.7.2 הפעלה דורשת Incident/Ticket, שני מאשרים שמיים, MFA, Scope, Reason ו־TTL מרבי של 30 דקות.

25.7.3 Credential חירום נשמר בכספת עם Split responsibility; הוא אינו בקוד, מסמך, Chat, Email או אצל אדם יחיד.

25.7.4 הפעלה יוצרת Alert מיידי ל־Security ו־Backup owner, ו־Post-event review בתוך יום עבודה אחד.

25.7.5 Expiry ו־Revocation אוטומטיים נבדקים; לאחר חשיפה או שימוש רגיש מבוצע Rotation לפי Runbook.

25.7.6 ספק שאינו תומך בשני מאשרים מקבל בקרה מפצה: שני אנשים נוכחים, Audit של הספק, Scope מזערי, Rotation מיידי ואישור בדיעבד.

25.7.7 תנאי הקבלה הוא תרגיל מלא ללא Secret חי שמוכיח approval, access, alert, expiry, revoke ו־rotation path.

25.8 משימת Reauthentication ו־MFA.

25.8.1 כל System role דורש MFA; לפעולות P0/P1 נדרש Reauthentication טרי.

25.8.2 Session רגיל אינו הופך ל־Break-glass באמצעות Client flag או Role claim ישן.

25.8.3 Recovery דורש Identity verification ותהליך שני אנשים, לא Support override יחיד.

25.8.4 Repeated denied admin actions, impossible travel או device/session anomaly מפעילים Alert בהתאם ליכולת הספק.

25.8.5 תנאי הקבלה הוא stolen session, MFA task bypass, stale reauth, recovery abuse ו־revoked identity.

25.9 משימת Dangerous operations.

25.9.1 Bulk export, Bulk disable, Retention execution, Legal Hold release, Credential rotation ו־Billing repair מקבלים Preview, Scope count, Reason ו־Approval.

25.9.2 Operation plan הוא קצר־חיים, בעל digest ו־Expected state; שינוי יעד מבטל אותו.

25.9.3 UI דורש Confirm phrase או Step-up לפי סיכון אך Server אוכף את כל החוזה מחדש.

25.9.4 Partial failure נשמרת per target ואינה מובילה ל־Retry גורף.

25.9.5 תנאי הקבלה הוא stale plan, target drift, double execute, partial failure ו־approver offboarding.

25.10 משימת Admin audit.

25.10.1 Audit כולל Actor, Authentication strength, Tenant, Action, Target digest, Decision, Reason, Ticket, Session, Policy version ו־Result.

25.10.2 Admin אינו יכול למחוק, לשנות או להשבית את ה־Audit של עצמו.

25.10.3 גישה לספקים נבדקת חודשי בזמן Pilot ורבעוני לאחר התייצבות, עם ביטול הרשאות לא־בשימוש.

25.10.4 כל Admin/Support action מקבלת Correlation שניתן לעקוב אחריו ב־DB וב־Telemetry ללא PII.

25.10.5 תנאי הקבלה הוא Reconstruction מלא של תרגיל Support ו־Break-glass מתוך Evidence בלבד.

25.11 משימת UI ונגישות.

25.11.1 כל Danger state מוצג בטקסט, Icon וצבע; אין הסתמכות על צבע בלבד.

25.11.2 Dialog תומך Focus initial, trap, Escape והחזרת Focus; Escape אינו מבטל Operation שכבר התחיל.

25.11.3 פעולה לא מחוברת מושבתת עם הסבר נגיש ולא נראית פעילה.

25.11.4 Bidi isolation מונע הצגת Tenant, Phone, Amount או ID באופן מטעה.

25.11.5 תנאי הקבלה הוא Keyboard/screen-reader ובדיקת Bidi לכל פעולה רגישה.

25.12 Evidence הוא Permission matrix, Support/Break-glass reports, MFA/reauth tests, Dangerous-operation plans, Audit reconstruction ו־PII/secret scan.

25.13 Rollback הוא Kill switch למסלולי Admin/Support, Revocation של Sessions/Grants, Rotation בעת חשד והחזרת Policy version קודמת; Audit לעולם אינו נמחק.

25.14 Gate 20 נסגר רק לאחר אפס חשבון משותף, Primary/Backup שמיים, Support scope, Break-glass rehearsal, Immutable audit ו־Deny matrix.

## 26. שלב 21 — Privacy, Retention v2, Legal Hold ו־Data subject rights

26.1 מטרת השלב היא לעבד, לשמור, להעביר, למחוק ולהקפיא מידע רק לפי מטרה, סמכות, מחזור חיים ו־Evidence מאושרים.

26.2 זמן משוער לשלב הוא 120–200 שעות עבודה נטו, ובנוסף 2–6 שבועות זמן חיצוני משוער ל־Legal/Privacy review.

26.3 תלות Core היא Gates 4, 5, 6, 7, 8, 13, 14, 15, 16, 19.1 ו־20 וכן D11/D26. Gates 17, 18, 19.2 ו־19.3 מצטרפים רק אם Flow, AI/Knowledge או Live Billing נמצאים ב־Scope; Gate 21.2 הוא תוצאת מסלול המחיקה ואינו prerequisite לעצמו.

26.4 הבעלים הנדרש הוא Privacy owner שמי; עורך דין ישראלי, Security, Database, Product, AI ו־Support מאשרים. מסמך זה אינו חוות דעת משפטית.

26.5 משימת Data map ו־DPIA.

26.5.1 למפות לכל שדה ו־Derived data את Source, Data subject, Controller/Processor role, Purpose, Legal basis, Sensitivity, Systems, Regions, Recipients, Retention ו־Deletion.

26.5.2 להפריד Message content, Contact profile, Consent, Suppression, AI prompt/output, Knowledge, Embedding, Billing, Audit, Telemetry, Support bundle ו־Backup.

26.5.3 להשתמש בכלי DPIA של הרשות להגנת הפרטיות כעזר ולבצע תסקיר מלא עם מומחה; הכלי עצמו אינו חוות דעת.

26.5.4 לקבוע אם נדרש DPO לפי פעילות, ניטור, מידע רגיש והיקף, ולתעד את ההכרעה.

26.5.4.1 בדיקת DPO אינה נשענת על גודל החברה בלבד. לפי גילוי הדעת הסופי של הרשות להגנת הפרטיות שפורסם ביולי 2026, Legal memo בודק בנפרד גוף ציבורי; מסירת מידע לאחר כדרך עיסוק או בתמורה; פעילות עיקרית הכוללת ניטור שוטף ושיטתי בהיקף ניכר; ופעילות עיקרית הכוללת עיבוד מידע בעל רגישות מיוחדת בהיקף ניכר. כל Criterion מקבל Facts, ניתוח, מסקנה, Reviewer ותאריך רענון; מצב חסר הוא `unknown/unavailable` ולא `not-applicable`.

26.5.4.2 אם DPO נדרש, ה־RACI מפריד את הממונה מן הבעלים שמאשר את מטרות העיבוד; מתעדים מומחיות, משאבים, גישה להנהלה, עצמאות, ניגוד עניינים, פרטי קשר, משימות ייעוץ/הדרכה/בקרה/טיפול בפניות וקשר עם הרשות. שם אדם ותוקף מינוי הם Evidence חיצוני, לא החלטת קוד.

26.5.4.3 אם Legal קובע שאין חובת DPO, נשמר Memo מנומק וגם מועד Review מחדש. שינוי ICP, ‏Data class, ניטור, AI, היקף, שירות דיוור או תפקיד Connect מול לקוחות פותח את ההכרעה מחדש לפני הפעלה.

26.5.5 לבצע Annual review של מידע עודף ושינויי Purpose, ובכל Feature/Supplier חדש לבצע Delta DPIA.

26.5.6 תנאי הקבלה הוא אפס Data class ללא Purpose, Owner, Legal basis, Retention ו־System list.

26.5.7 לכל מאגר ולכל זרימת מידע לקבוע מי `בעל שליטה`, מי `מחזיק` ומהו תפקיד Connect והלקוח. להוסיף מטרות, קטגוריות מידע, מספר נושאי מידע, מספר מורשי גישה, רמת אבטחה, Owner, עורך דין מאשר, Review date ו־Evidence; `unknown/unavailable` חוסם Production processing.

26.5.8 לבצע הכרעה מפורשת לפי תיקון 13 לחוק הגנת הפרטיות לגבי רישום מאגר, חובת הודעה לרשות ומינוי DPO. כאשר DPO נדרש, לתעד עצמאות, משאבים, קו דיווח, ניגוד עניינים ופרטי קשר לפי הכרעת Legal.

26.5.8.1 לכל מאגר מפיקים Decision tree נפרד לרישום לפי סעיף 8א(א), הודעה לפי סעיף 8א(ב), המשך רישום היסטורי לפי הוראות המעבר או `not-applicable`. אין להסיק שחובת רישום שבוטלה מבטלת חובת הודעה, מסמך הגדרות מאגר, אבטחת מידע או זכויות נושא מידע.

26.5.8.2 כאשר חלה הודעה, Evidence packet כולל זהות בעל השליטה ודרכי הקשר, זהות ופרטי DPO אם נדרש, ומסמך הגדרות המאגר לפי תקנה 2. כאשר חל רישום, נשמרים בקשה, Purpose מדויק, החלטת הרשות, מספר/מצב הרישום ושינויי Scope; Submission ללא Receipt אינו PASS.

26.5.8.3 שירותי דיוור ישיר מקבלים הכרעה נפרדת: אם Connect או לקוח מחזיקים/מנהלים מאגר המשמש לשירות כזה, Legal קובע את חובת הרישום ומטרת הדיוור, ו־Data lineage שומר מקור אוסף הנתונים, מועד קבלתו ולמי נמסר. זה אינו מחליף Consent, ‏WhatsApp opt-in, ‏Suppression או סיווג לפי סעיף 30א.

26.5.9 ליצור Israeli Information Security Regulations matrix: רמת אבטחה בסיסית/בינונית/גבוהה והנמקה, מסמך הגדרות מאגר, System inventory, Access matrix, Training, Access reviews, שמירת תיעוד טכני ל־24 חודשים כאשר חל, סקר/ביקורת תקופתיים, מטריצת אירוע אבטחה חמור וחוזה תקנה 15 לכל ספק מחזיק.

26.5.9.1 המטריצה כוללת בדיקה שנתית מתועדת של מידע עודף לפי תקנה 2(ג): Purpose מול כל שדה/עותק/Derived data/Export/Backup, החלטת Keep/Delete/Anonymize, Legal Hold, Owner, Due date ו־Evidence. ספירת טבלאות או Retention schedule לבדם אינם מוכיחים צמצום מידע.

26.5.10 תנאי הקבלה הסטטוטורי הוא Pass/N/A מנומק וחתום לכל חובה; בדיקות אבטחה כלליות או DPA גנרי אינן תחליף.

26.6 משימת Notices, Terms ו־DPA.

26.6.1 להשלים Privacy notice, Terms, Customer DPA, Cookie/analytics position, Subprocessor register ו־Security contact.

26.6.2 Notice בעת איסוף מפרט אם המסירה חובה או רצונית, בעל השליטה ודרכי קשר, Purpose, Recipients וזכויות עיון/תיקון לפי הדין הרלוונטי.

26.6.3 לתעד מה מועבר ל־Meta, OpenAI, Clerk, Better Stack, Railway, Vercel, AWS וספק Billing.

26.6.4 לא לטעון ZDR, Israel residency, Encryption, Deletion time או Compliance בלי Evidence טכני וחוזי.

26.6.5 שינוי ספק, Region, Purpose או Retention מפעיל Review והודעה לפי Legal decision.

26.6.6 תנאי הקבלה הוא Sign-off מתוארך וקישור כל Claim ל־Evidence.

26.6.7 ליצור Message legal classification table לפי Channel × Purpose × Initiator × Audience source. כל שורה מכריעה בנפרד דיוור ישיר לפי חוק הגנת הפרטיות, "דבר פרסומת" לפי סעיף 30א, מסר שירותי/תפעולי ומסר שיווקי לפי WhatsApp; היא כוללת Consent, Notice, Source record, Opt-out, Template/window, Retention ו־Legal approver. סיווג חסר נותן `send eligibility=false`.

26.6.8 אין להניח שכל הודעת WhatsApp היא "מסר קצר" לפי סעיף 30א בלי חוות דעת ישראלית לפי Use case; המצב נשאר `unknown/unavailable` משפטית עד הכרעה.

26.7 משימת Supplier privacy.

26.7.1 לכל ספק לבדוק DPA, Subprocessors, Regions, Retention, Security, Incident notice, Deletion, Export ו־Termination assistance.

26.7.2 תקנה 15 והנחיות הרשות נבדקות להתקשרות עם מחזיק/ספק בעל גישה למידע.

26.7.3 להעברת מידע מחוץ לישראל לקבוע עילה, התחייבויות וחוזה לפי ייעוץ משפטי.

26.7.4 Supplier evidence מקבל Owner, Checked date ו־Renewal review; Marketing page לבדה אינה מספיקה.

26.7.5 תנאי הקבלה הוא Vendor register ללא ספק חי שלא עבר Review.

26.7.6 ליצור EEA inbound applicability matrix לכל מערכת ומאגר: מקור המידע, תאריך קליטה, תחולת המאגר בישראל, Notice deadline, onward recipients, מחיקה, Necessity, Accuracy ו־Legal decision. מידע שמקורו ב־EEA אינו נבלע אוטומטית במסלול העברה מישראל החוצה.

26.7.7 ליצור Transfer-by-transfer register לכל העברה מישראל: exporter, recipient, country, data classes, purpose, statutory basis, written undertaking, onward-transfer terms, encryption, government-access assessment, retention, legal approver ו־renewal date. DPA כללי לבדו אינו Evidence לתקנה 2(4) או 3.

26.7.8 Gate 21.1 ו־26.1 נשארים חסומים לכל Data flow חי עד שהמטריצות 26.5–26.7 סגורות או שהיכולת והנתונים הרלוונטיים מושבתים ומוסרים מן Manifest.

26.8 משימת Retention policy v2.

26.8.1 לכל Policy להגדיר `policyId`, Version, Status, Data class, Trigger, Cutoff rule, Duration, Legal authority, Owner ו־Approvers.

26.8.2 Trigger matrix מפרידה Created, Last activity, Terminal, Revoked, Contract ended, Export expired, Backup expired ו־Legal event.

26.8.3 Data classes בעלי מחזור חיים שונה אינם משתמשים באותו Trigger גם אם הם באותה טבלה כיום; נדרש פיצול או View/ledger מפורש.

26.8.4 Record פעיל, Pending provider outcome, Unresolved incident, Legal Hold, Open billing dispute, Live session או Evidence נדרש נחסם.

26.8.5 Policy version ישנה אינה משמשת Plan חדש לאחר שינוי; היא נשמרת ל־Audit בלבד.

26.8.6 תנאי הקבלה הוא Decision table מאושר לכל Data class ו־Trigger.

26.9 משימת Delete plan.

26.9.1 Plan כולל `planId`, Digest, Policy/version, Created/expiry, Cutoff, Exact target identities, Expected versions, Actor ו־Approvers.

26.9.2 TTL קצר נקבע לפי Risk ו־Review; Plan שפג תוקף לעולם אינו מתבצע.

26.9.3 Digest נגזר קנונית מכל היעדים וה־Policy; שינוי יעד, Version או Cutoff מבטל אותו.

26.9.4 Atomicity מוגבלת ל־Transaction מקומית שתובעת את ה־Plan, מקפיאה את Scope ומבצעת מחדש Policy/cutoff/version/Legal-Hold checks. מחיקה חוצת PostgreSQL, S3 וספקים אינה מוצגת כאטומית; היא Saga עמידה במצבים `planned → claimed → provider-pending → provider-confirmed-or-failed → local-delete-committed → verified`.

26.9.4.1 לכל יעד חיצוני נשמרים exact provider identity, idempotency key, target version, cutoff, receipt, retry policy, retained exception ו־Hold recheck מיד לפני הפעולה הבלתי־הפיכה.

26.9.4.2 Partial failure ממשיך רק מן הצעד החסר ואינו מריץ מחדש את כל היעדים. Timeout שאין אחריו Receipt נשאר Unknown/manual reconciliation; הוא אינו נחשב Deleted ואינו מפעיל Blind retry.

26.9.4.3 בדיקת Post-delete היא Audit בלבד ולא מנגנון הבטיחות. ספק ללא Delete API מקבל retained-exception מאושר ו־Customer/Legal wording מדויק; אסור להציגו כמחיקה שהושלמה.

26.9.5 Dry-run מפיק Counts ו־Reasons אך אינו Capability לביצוע.

26.9.6 Replay או Concurrent execute מקבלים תוצאה Idempotent ואינם מרחיבים Scope.

26.9.7 תנאי הקבלה הוא expired plan, digest mutation, broad cutoff, wrong tenant, target drift, Hold שנוסף באמצע, S3 succeeds/OpenAI fails, DB commits/provider times out, crash בכל מעבר, partial failure ו־replay, ללא הרחבת Scope וללא מחיקת יעד נוסף.

26.10 משימת Legal Hold.

26.10.1 Hold כולל Case ID, Authority, Tenant, Scoped data classes/identities, Reason, Start, Review, Expiry/release rule, Owner ו־Approver.

26.10.2 Hold אינו Boolean כללי בלתי־מוסבר על Tenant שלם; Scope רחב דורש Justification מפורש.

26.10.3 Create, expand, narrow ו־release דורשים Capabilities נפרדות ו־Audit.

26.10.4 Delete, anonymize, backup expiry ו־DSAR workflow בודקים Hold לפני פעולה.

26.10.5 Release אינו מפעיל מחיקה אוטומטית; הוא מאפשר יצירת Plan חדש לפי Policy העדכנית.

26.10.6 תנאי הקבלה הוא overlapping holds, expired review, partial release, backup restore ו־unauthorized release.

26.11 משימת Data subject rights.

26.11.1 לבנות Intake, Identity verification, Scope, Search, Review, Approval, Delivery ו־Closure לעיון, תיקון, יצוא, התנגדות ומחיקה לפי Legal decision.

26.11.2 לאסוף מינימום מידע לאימות ולא להציג אם Subject קיים לפני Verification.

26.11.3 Export הוא Tenant/Subject scoped, מוצפן או מוגן, קצר־חיים, Audit-linked ו־Formula-neutralized.

26.11.4 Correction אינה מוחקת Audit; Deletion מכבדת Suppression minimal record ו־Legal Hold.

26.11.5 SLA וחובות דיווח נקבעים על ידי Legal לפי הדין והחוזים, לא מומצאים בקוד.

26.11.6 תנאי הקבלה הוא wrong tenant, ambiguous identity, over-export, active hold, expired package ו־repeat request.

26.12 משימת AI ו־Privacy.

26.12.1 לא לשלוח ל־OpenAI או לכלי Eval מידע גולמי ללא Purpose, Minimization ו־Approval.

26.12.2 Embeddings, prompts, retrieved chunks ו־outputs מקבלים Retention ו־Deletion משלהם.

26.12.3 Safety identifier מושחר ואינו מאפשר לספק לזהות אדם ישירות.

26.12.3.1 ה־DPIA ו־Data map מתעדים שהמזהה הוא Pseudonymous ולא Anonymous: הוא עדיין עשוי לאפשר ל־Connect לקשר אירועים תחת סמכות פנימית, ולכן הוא מקבל Purpose limitation, Access control, Rotation, Retention ו־Incident handling. עצם ה־Hash או HMAC אינו מבטל חובות פרטיות.

26.12.4 AI אינו מקבל החלטה משפטית, מחיקה, חיוב או שליחה ללא אדם.

26.12.5 תנאי הקבלה הוא Data-flow proof ו־Cascade deletion לכל Derived data.

26.13 משימת Backup interaction.

26.13.1 לתעד שמחיקה נקודתית מתוך Backup immutable אינה תמיד אפשרית מיד, ולנסח זאת במדויק ב־Policy.

26.13.2 Restore מחיל מחדש Suppression, Deletion ledger ו־Legal holds לפני חיבור לשירות.

26.13.3 Backup expiry נבדק מול Hold ו־Lifecycle evidence; אין Claim מחיקה לפי Schedule בלבד.

26.13.4 אין לשחזר מידע שנמחק כדי לבטל טעות בלי Incident, Security ו־Legal decision.

26.13.5 תנאי הקבלה הוא Restore drill המוכיח שאדם שבחר Opt-out אינו חוזר לקהל.

26.14 משימת Incident privacy.

26.14.1 להגדיר Matrix של אירוע, סוג מידע, היקף, סמכות, Owner, Legal assessment, Notification path ו־Evidence preservation.

26.14.2 אין לשלוח הודעת הפרה אוטומטית ללא Legal/Incident commander, אך אין לעכב איסוף Evidence.

26.14.3 Logs/forensics מצומצמים ומוגנים ואינם יוצרים דליפה נוספת.

26.14.4 תנאי הקבלה הוא Tabletop של Cross-tenant, Credential leak, lost backup ו־AI data exposure.

26.15 Evidence הוא Data map/DPIA, Legal memo, Notices/DPA, Supplier register, Retention matrix, Policy/plan vectors, Hold tests, DSAR rehearsal ו־Restore privacy proof.

26.16 Rollback לפני מחיקה הוא Pause worker וביטול Plan. אחרי מחיקה אין Rollback אוטומטי; נפתח Incident ונבחן Restore רק באישור. במקרה ספק, מחיקות מושהות אך Legal Hold אינו מבוטל.

26.17 Gate 21.1 ל־Pilot דורש Notice, Opt-out, Supplier/Data map, Incident path ו־Retention matrix. Gate 21.2 להפעלת מחיקה דורש Legal sign-off, Plan v2, Hold tests ו־Dry-run מלא.

## 27. שלב 22 — Observability, SLO, On-call ו־Incident Response

27.1 מטרת השלב היא לזהות תקלה או הפרה, להבין Cause-effect מקצה לקצה, להגיב בזמן וללמוד ממנה בלי לדלוף מידע דרך Telemetry.

27.2 זמן משוער לשלב הוא 96–160 שעות עבודה נטו.

27.3 תלות: עבודת Observability מתחילה אחרי Gates 3, 5 ו־6. סגירת Gate 22 דורשת Telemetry ו־Runbook לכל Gate פעיל במניפסט: Core כולל 7–16, 19.1, 20 ו־21.1; Gates 17, 18, 19.2, 19.3 ו־21.2 מצטרפים רק אם יכולותיהם פעילות. D09/D10 חלים תמיד.

27.4 הבעלים הנדרש הוא SRE/Platform owner; לכל Signal ו־Runbook יש Service owner, Primary ו־Backup שמיים.

27.5 משימת Telemetry architecture.

27.5.1 להשתמש ב־OpenTelemetry ל־Traces, Metrics ו־Logs עם Semantic conventions ו־Schema version נעול.

27.5.2 לכסות Browser error מושחר, API, Auth, PostgreSQL, Redis/BullMQ, Webhooks, Meta, Files/GuardDuty, OpenAI, Billing, Retention ו־Backups.

27.5.3 Correlation עובר API → DB/Outbox → Queue → Worker → Provider בלי Phone, Message body או Tenant name.

27.5.4 Audit הקנוני נשאר נפרד מ־Operational logs; Exporter outage אינו מוחק את ה־Audit requirement.

27.5.5 תנאי הקבלה הוא Journey המבוסס על Artifact אמיתי מאושר וממוזער, official provider sandbox artifact, normative vector או deterministic non-business attack literal לפי MP-F050, ומופיע כשרשרת אחת עם Boundaries ו־Result מדויקים. אין invented business journey.

27.6 משימת Redaction ו־Cardinality.

27.6.1 לחסום Token, Authorization, Cookie, Ciphertext, Phone, Email, Message, Prompt, File content ו־Billing payload לפני Export.

27.6.2 Metric labels מוגבלים לרשימת Values bounded; Tenant/user/message IDs אינם Labels.

27.6.3 Error object עובר Serializer סגור; Stack trace Production מוגבלת ומוגנת.

27.6.4 Sampling לעולם אינו מסיר Security audit, Unknown send, Billing mutation, Retention או Break-glass.

27.6.5 להגדיר Better Stack Retention, access, Region, Cost cap ו־Deletion evidence.

27.6.5.1 בחשבון או Source חדש מ־2026, Better Stack מתעדת חיוב Metrics לפי נפח המידע הנשמר ולא רק לפי קצב Ingest. ‏Paused source עשוי להמשיך לצבור Usage עד שתפוג ה־Retention. לכן Cost guard מחייב Source-level export של Region, pricing model, retention ו־retained GB; Cardinality budget; התראת Forecast; והוכחה ש־Pause, retention reduction או deletion משפיעים כמצופה. מחיקת Source אינה תגובת עלות אוטומטית: קודם עוצרים Export, משמרים Evidence מותר ומקבלים אישור בעלים, Privacy ו־Incident.

27.6.6 תנאי הקבלה הוא Corpus קבוע של PII/Secrets, label explosion ו־exporter inspection.

27.7 משימת SLIs.

27.7.1 להגדיר API success/latency, Webhook verified acknowledgement, Queue age, Worker success, DB saturation, Login success, File pipeline, AI draft ו־Restore duration.

27.7.2 להפריד Meta request fact, Sent fact, Delivered, Read, Failed ו־Unknown; אין Metric יחיד בשם `success` שמערבב אותם.

27.7.3 לכל SLI להגדיר Numerator, Denominator, Window, Exclusions, Source, Freshness ו־Owner.

27.7.4 Safety invariants כגון Cross-tenant, unauthorized send, duplicate attempt או missing backup מתריעים מיד ואינם Error budget רגיל.

27.7.5 תנאי הקבלה הוא Reconciliation בין SLI sample, DB source ledger ו־raw provider evidence מאושר.

27.8 משימת SLO ו־Error budgets.

27.8.1 לא לקבוע אחוז זמינות או Latency לפני Baseline חי; Product ו־SRE יבחרו יעד לאחר חלון מדידה.

27.8.2 כל SLO כולל User journey, Objective, Window, Budget, Burn policy, Owner ו־Review date.

27.8.3 Error budget depletion עוצר Feature rollout או מגדיל Reliability work לפי Policy מאושרת.

27.8.4 Provider-caused failure מוצג בנפרד אך אינו מוסתר מחוויית הלקוח.

27.8.5 תנאי הקבלה הוא Baseline report, יעד חתום ו־simulation של budget burn.

27.9 משימת Alerts.

27.9.1 להגדיר Alerts ל־Cross-tenant/security, DLQ, Queue age, DB locks/connections, Meta quality/limits, Credential, Unknown sends, File scan, AI cost, Billing, Retention, Backup ו־Audit gaps.

27.9.2 כל Alert כולל Severity, Query, Threshold rationale, Owner, Primary/Backup, Runbook, Escalation ו־Silence policy.

27.9.3 Multi-window burn-rate alerts מופעלים רק לאחר SLO baseline; לפניו משתמשים בספי Safety/Capacity שמרניים ומתועדים.

27.9.4 Alert ללא פעולה צפויה מתוקן או מוסר; אין להסתיר Alert fatigue.

27.9.5 תנאי הקבלה הוא Alert routing drill, unavailable primary, duplicate alert, silence expiry ו־provider outage.

27.9.5.1 יצירת Escalation policy ב־Better Stack אינה מקשרת אותה אוטומטית ל־Monitor, Heartbeat או Integration. ‏Assignment coverage נבדק מול Inventory קנוני; כל Signal קריטי קושר Policy, Severity, Primary, Backup ו־fallback policy במפורש. בדיקות שליליות מכסות Policy לא משויכת, fallback חסר, Notification channel כפול, Silence שחוסם P0 ו־Monitor חדש שנשאר על simple escalation לא מאושר.

27.10 משימת On-call D10.

27.10.1 Pilot פועל בשעות פעילות מוגדרות עם Primary ו־Backup; P0 מקבל נתיב חירום שמי גם מחוץ לשעות.

27.10.2 להגדיר Handoff, Acknowledgement, Escalation, Fatigue limit, Access ו־Compensation לפי מדיניות החברה.

27.10.3 On-call מקבל Runbook והרשאות מזעריות מראש; אין פתיחת Admin רחבה בזמן אירוע בלי Break-glass.

27.10.4 Shift review בודק Open incidents, Unknown sends, paused campaigns ו־expired evidence.

27.10.5 תנאי הקבלה הוא תרגיל שבו Primary לא זמין ו־Backup סוגר Containment בזמן שנמדד.

27.10.5.1 מכיוון ש־Acknowledgement עוצר Escalations נוספות במודל ה־Incident המתועד של Better Stack, Ack אינו הוכחת טיפול או Containment. רק Responder מורשה רשאי לבצע Ack; נשמרים Actor/Time/Channel, נדרש Progress heartbeat, ו־Stalled incident נפתח מחדש או מוסלם ל־Backup/Incident commander לפי זמן מאושר. Wrong-person, accidental, stale ו־API-token Ack הם בדיקות שליליות.

27.11 משימת Incident response.

27.11.1 להגדיר Severity, Incident commander, Technical lead, Security, Communications, Scribe, Privacy/Legal ו־Business owner.

27.11.2 Runbooks מכסים Tenant leak, Unauthorized/duplicate send, Meta restriction, Credential compromise, Queue replay, Data loss, Malware, Billing incident, AI unsafe action ו־Provider outage.

27.11.3 תהליך כולל Detect, Triage, Contain, Preserve evidence, Eradicate, Recover, Communicate ו־Postmortem.

27.11.4 Notification לרשות, ספק או לקוח נקבעת לפי Legal matrix והדין העדכני.

27.11.5 Postmortem כולל Timeline, Root causes מערכתיים, Detection gaps, Corrective actions, Owners, dates ו־verification.

27.11.6 תנאי הקבלה הוא Tabletop ואירוע טכני מבוקר אחד לפחות לכל משפחת P0.

27.12 משימת Status ו־Customer communication.

27.12.1 לקבוע אם נדרש Status page ומתי מפרסמים Incident, Maintenance או Degradation.

27.12.2 הודעה אינה חושפת Tenant, exploit detail פעיל או מידע אישי אך מספקת Impact, Scope, Mitigation ו־Next update.

27.12.3 Support מקבל גרסה מאושרת ועקבית; אין ניחוש או הבטחת זמן שחזור לא מדודה.

27.12.4 תנאי הקבלה הוא Communication tabletop ל־Meta outage, security incident ו־delayed messages.

27.12.4.1 Metadata ו־Catalog של Better Stack עשויים להשפיע על אופן הצגת Service ב־Status page. ב־Pilot אין Auto-publication או Auto-resolution של הודעת לקוח: Incident commander ו־Communications owner מאשרים Impact, Scope, wording ו־next-update time. ‏Metadata שגוי, Alert כפול או Monitor recovery אינם רשאים לבדם לפרסם, להסיר או לסגור הודעה חיצונית.

27.13 Evidence הוא OTel schema, Dashboard exports, Redaction report, SLI/SLO docs, Alert configs, On-call roster, Incident exercise ו־Postmortem sample.

27.14 Rollback הוא השבתת Instrumentation בעייתית לפי Signal, חזרה ל־Exporter/schema קודם ושמירה מקומית bounded של Critical evidence. דליפת Telemetry מפעילה עצירת Export, Rotation ו־Incident.

27.15 Gate 22 נסגר רק לאחר Critical dashboards, Redaction, Alert routing, On-call roster, Runbooks ו־Incident drill; Railway healthcheck לבדו אינו Continuous monitoring.

## 28. שלב 23 — Backup, Restore, RPO/RTO ו־Business Continuity

28.1 מטרת השלב היא להוכיח שהמערכת יכולה להתאושש מאובדן, השחתה, Ransomware או ספק כושל בתוך יעדים עסקיים שנמדדו בפועל.

28.2 זמן משוער לשלב הוא 96–160 שעות עבודה נטו, לא כולל משך יצירת/שחזור Backup גדול או זמני ספק.

28.3 תלות השלב היא Gates 6.1, ‏6.2, ‏7, ‏21.1 ו־22 וכן D08; ‏Gate 6.3 מצטרף רק כאשר Backup כולל Upload/Knowledge/Media object storage. Gate 21.2 מצטרף רק אם Delete adapter פעיל, כדי להוכיח Re-deletion לאחר Restore.

28.4 הבעלים הנדרש הוא DR/BCP owner; Database, SRE, Security, Privacy, Deployment ו־Product מאשרים.

28.5 משימת Business impact analysis.

28.5.1 למפות Critical processes, Data classes, Dependencies, Maximum tolerable downtime, Data-loss impact ו־Manual fallback.

28.5.2 לקבוע RPO ו־RTO לכל Journey/Data class לאחר Product, Legal ו־SRE review; D08 הוא יעד, לא Evidence.

28.5.3 לתעד השפעה של אובדן Messages, Consent, Suppression, Billing, Audit, Knowledge, Config, Secrets ו־Provider state בנפרד.

28.5.4 לזהות Single points: אדם, Account, Region, KMS key, Domain, Provider ו־Repository.

28.5.5 תנאי הקבלה הוא BIA חתום עם Recovery order ו־Owners.

28.6 משימת PostgreSQL backup.

28.6.1 לאמת Railway volume backups, Retention, PITR capability, Project/environment scope ו־Restore limitations בפועל.

28.6.2 להשלים פער D08 באמצעות Logical encrypted backups מחוץ לאותו Failure domain או פתרון מאושר, אם Plan החי אינו מספק 90 יום/PITR.

28.6.3 Backup logical כולל Schema, Data, Extensions, Roles/grants manifest ו־Migration version, בלי Plaintext secrets.

28.6.4 Job failures, duration, size, encryption, retention expiry ו־verification מתועדים ומתריעים.

28.6.5 תנאי הקבלה הוא Restore מ־volume/PITR ומ־logical backup בהתאם לאסטרטגיה שנבחרה.

28.6.6 Baseline הספק שנבדק ב־26.08.2026 הוא Volume daily לשישה ימים, weekly לחודש, monthly לשלושה חודשים, Restore באותו Project+Environment בלבד ו־מחיקת Volume שמוחקת גם Backups; PITR מספק חלון מקורב של ארבעה שבועות. ערכים אלה הם Source snapshot ונבדקים מחדש לפני Gate 23.1, ושוב לפני Gate 23.2 אם נדרש GA/90-day claim.

28.6.6.1 רענון המקור ב־27.08.2026 מאמת ש־Volume backup הוא Convenience recovery בלבד: Wipe של Volume מוחק את כל Backups, Restore אפשרי רק לאותו Project+Environment, Restore ישן מסיר Backups חדשים ממנו, ו־Manual backup מוגבל לפי המקור ל־50% מנפח ה־Volume. אף אחד מאלה אינו Offsite, ‏Provider-exit או Ransomware evidence.

28.6.6.2 ‏Railway PITR שומר בקירוב ארבעה Full cycles, עם Full שבועי ו־Incremental יומי, ומתחיל רק מן ה־Base backup הראשון לאחר Enablement. Restore יוצר Sibling service חדש; מקור ה־DB נשאר פעיל, וה־Fork המשוחזר אינו מקבל PITR המשכי אוטומטית. ‏HA restore עשוי להתחיל כ־Single node. Runbook חייב לטפל בכל מעבר זה במפורש.

28.6.6.3 ‏WAL archive הוא Async. לפי התיעוד העדכני, בעת כשל S3 ממושך Queue של 5 GiB על ה־Leader עשוי להתמלא ואז pgBackRest משמיט WAL כדי להשאיר את PostgreSQL זמין; לכן `database up` אינו מוכיח PITR בריא. ‏Archive-health, oldest-restorable timestamp, gap, queue pressure ו־first-base-ready הם Signals חוסמים ל־RPO claim.

28.6.6.4 כל מספר ב־28.6.6–28.6.6.3 הוא `source-verified-published-capability`, לא Live entitlement ולא Evidence שהוגדר בחשבון. Probe חי, Restore מבודד, Manifest ומדידת RPO/RTO סוגרים את Gate; אחרת Logical offsite WORM נשאר שכבת ההתאוששות המחייבת.

28.6.7 D08 דורש Logical backup יומי מוצפן וחתום אל AWS Backup account נפרד מ־Railway ומ־Production, עם Retention של 90 יום, Object version, SSE-KMS, S3 Object Lock, Lifecycle deny-bypass, manifest/digest, Job failure alert ו־Restore חודשי. Staging מתחיל ב־Governance mode עם SCP שמונע bypass; לפני Claim מסחרי נדרשת החלטת Legal אם לעבור ל־Compliance mode. אם Object Lock אינו מאושר, נדרש ספק Immutable חלופי; Versioning לבדו אינו סוגר Ransomware gate.

28.6.7.1 Object Lock מגן על Object version מסוים, לא על שם Key מופשט. `DELETE` ללא VersionId עשוי להחזיר `200 OK` וליצור Delete marker גם כאשר גרסה מוגנת נשארת מאחור; לכן Health, Inventory, Restore ו־Ransomware evidence בודקים VersionId, Retain-until, Mode, Legal-hold, Delete markers ויכולת קריאה בפועל ולא רק HTTP success או היעלמות מן־UI.

28.6.7.2 Governance mode ניתן לעקיפה רק לבעל `s3:BypassGovernanceRetention` שמבקש זאת במפורש, וה־S3 Console עשוי לצרף את Header כאשר ההרשאה קיימת. ב־Connect אין הרשאה זו ל־Runtime, ל־Backup writer או ל־Operations רגיל; SCP/permission boundary, Access Analyzer, CloudTrail alert ו־compromised-admin drill מוכיחים זאת. Governance משמש Rehearsal בלבד ואינו Claim מקביל ל־Compliance.

28.6.7.3 Compliance mode מונע קיצור Retention או מחיקת Version גם מ־Root למשך התקופה, ולכן מופעל רק לאחר Legal retention matrix, Cost/capacity forecast, Account-recovery ו־Destruction/exit review. Object Lock מופעל עם Versioning; ה־Bucket הייעודי אינו מקבל Production runtime credentials, ואובדן KMS/Account access נבדק ככשל Recovery נפרד.

28.6.8 Backup worker משתמש ב־Principal read-only ייעודי, כלי PostgreSQL תואם לגרסה, consistent snapshot, no secret in arguments/logs ו־temporary storage מוצפן ומנוקה. Upload לא מוצלח אינו מוחק עותק קודם ואינו מסומן Success.

28.6.9 כל Backup קושר Consistency point: PostgreSQL LSN/high-watermark, S3 Inventory cutoff/VersionIds ו־Writer fence מתועד. Orphan או missing object נשאר Finding ולא נבלע ב־Count.

28.6.10 Manifest נחתם במפתח Asymmetric KMS נפרד ממפתח DB/Backup, עם Canonical schema, Algorithm, Key ID/version, Verifier role ו־Public verification material הנשמר גם אחרי Rotation. Backup writer אינו יכול לחתום בשם Release authority.

28.7 משימת S3 ו־Config backup.

28.7.1 להגדיר Versioning, Lifecycle, Inventory manifests ו־KMS recovery לכל Bucket. עותק WORM אחד לפחות הוא תנאי ל־Gate 23.2; Object Lock אינו Optional כאשר נטענת הגנה מפני Ransomware.

28.7.2 Quarantine, Clean knowledge ו־Backup/Evidence מקבלים Recovery/Retention נפרדים.

28.7.3 Redis אינו מקור אמת; Queue נבנית מחדש מה־DB ומוגנים רק DLQ/diagnostic facts הנדרשים.

28.7.4 לשמור Infrastructure manifests, Vercel/Railway config names, DNS, Meta asset inventory, Clerk/OpenAI project map ו־Runbooks, וכן Mirror/Bundle מוצפן של Git refs/tags/releases/workflow manifests לחשבון Backup נפרד. Fresh clone/restore מאמת Signed refs ו־provenance.

28.7.5 Secrets עצמם אינם Dump גולמי; נשמר Inventory, Owners, Vault/KMS recovery ו־Rotation/reprovision procedure.

28.7.6 תנאי הקבלה הוא Rebuild של Staging config ו־Queue בלי Secret leakage ובלי Side effect חי.

28.8 משימת Backup evidence v2.

28.8.1 Evidence כולל `backupId`, Provider, Environment, Source, Start/end, Schema version, Manifest digest, KMS key identity, Retention expiry ו־Verification result.

28.8.2 Restore proof כולל `restoreId`, אותו `backupId`, Digests מדויקים, Isolated target, Start/end, Validations ו־Measured RPO/RTO.

28.8.3 Restore שאינו קשור ל־backupId ול־Digests המדויקים נכשל סגור.

28.8.4 S3 consistency נבדקת באמצעות Inventory/manifest, Object version ו־content digest, לא רק Count.

28.8.5 חלון השמירה מוכח על Cohort בן 90 ימים בפועל; Config המציג `90 days` לבדו אינו Evidence. הספירה מתחילה ב־Backup התקף הראשון בעל Manifest, Signature, WORM ו־Restore proof.

28.8.6 תנאי הקבלה הוא Contract test ל־wrong backup, digest mismatch, wrong environment ו־expired retention.

28.9 משימת Restore drill.

28.9.1 Restore מתבצע ל־Environment מבודדת או Sibling service, לא מעל Production פעיל.

28.9.2 לבחור Recovery point ידוע ומתועד לפני שינוי דטרמיניסטי; אין בחירה אקראית.

28.9.3 לבדוק Schema, Constraints, Counts, Tenant isolation, Audit, Consent/Suppression, Legal Hold, S3 manifests, AI index consistency ו־Application smoke journeys.

28.9.4 להחיל Deletion/Suppression/Hold ledger לפני Network, Login או Send activation.

28.9.4.1 אחרי Restore כל רשומת `reserved`, ‏`attempting` או `unknown` עוברת Quarantine. Outbound, Billing ו־Deletion נשארים כבויים עד Provider/Webhook/Finance reconciliation; ניסיון Provider שאבד סביב RPO אינו נשלח מחדש.

28.9.5 למדוד RPO/RTO בפועל, כולל DNS/Config/Secrets/Validation, לא רק זמן DB restore.

28.9.6 Promotion ל־Traffic דורש Go/No-Go נפרד; Drill רגיל נעצר לפני Promotion.

28.9.7 תנאי הקבלה הוא Full monthly restore לפי D08 ו־smaller verification בתדירות שנקבעת לפי Risk/Cost.

28.10 משימת Failure scenarios.

28.10.1 לבדוק Corrupt backup, Missing object, Wrong key, Partial restore, Schema mismatch, broken extension ו־expired credential.

28.10.2 לבדוק Accidental deletion, Malicious admin, Ransomware, bad migration, Railway outage, AWS outage, DNS loss ו־KMS owner unavailable.

28.10.3 לבדוק Failover/Failback עם Sessions, Queue reconciliation, Unknown sends ו־Provider webhooks.

28.10.4 Restore חדש אינו מופעל אוטומטית על Restore שנכשל; כל Attempt מקבל Identity ו־Incident.

28.10.5 תנאי הקבלה הוא Tabletop לכל Scenario ותרגיל טכני ל־DB corruption ו־provider outage.

28.11 משימת Business continuity.

28.11.1 להגדיר Manual safe mode: עצירת Sends, Intake מוגבל, Read-only UI, Customer banner ושימור Evidence.

28.11.2 ליצור Communication tree, Vendor contacts, DNS/KMS owners ונתיב כאשר Primary אינו זמין.

28.11.3 להגדיר Work recovery order: Identity, DB, Suppression/Audit, Webhooks, Inbox, Outbound, AI, Billing.

28.11.4 Alternative provider אינו automatic failover; מעבר דורש Contract, data mapping, Security ו־Reconciliation.

28.11.5 תנאי הקבלה הוא BCP tabletop עם Owner נעדר וספק כפול שנופל.

28.12 משימת Key-loss ו־account recovery.

28.12.1 לבדוק מה קורה אם KMS key disabled/deleted, Root/MFA device אבד או Billing/Domain account locked.

28.12.2 להגדיר Multi-person recovery, Offline recovery codes, Contact verification ו־Rotation לאחר Recovery.

28.12.3 אין Backup שימושי אם Key recovery אינו אפשרי; אין Key recovery שמעניק גישה לאדם יחיד בלי Audit.

28.12.4 תנאי הקבלה הוא Tabletop ו־non-destructive live verification של recovery paths.

28.13 Evidence הוא BIA, Backup evidence v2, Restore proofs, RPO/RTO measurements, S3/config manifests, Failure drills ו־BCP runbook.

28.14 Rollback הוא עצירת Restore לפני Promotion ושמירת Evidence. לפני single-writer flip אפשר לחזור ל־Source הקודם; לאחר כתיבות ב־PostgreSQL היעד, Application rollback נשאר על Target data ומפעיל Maintenance/restore/compensation לפי 34.31.9 — אין חזרה שקטה ל־D1/R2 ואין Restore נוסף אוטומטי.

28.15 Gate 23 הוא Namespace מפוצל.

28.15.1 Gate 23.1 — Closed-pilot recovery — נסגר לאחר Backup WORM תקף ראשון, Restore מלא ומבודד, backup-to-restore binding, privacy replay, quarantine-after-restore, RPO/RTO measurement ו־BCP drill. הוא אינו מתיר Claim שהוכח חלון 90 יום.

28.15.2 Gate 23.2 — GA retention/ransomware evidence — נסגר רק לאחר Cohort אמיתי בן 90 יום, Restore מגרסה נעולה ותיקה, Compromised-admin/KMS separation drill, signed manifest verification ו־Legal/Cost approval. הוא מוסיף לפחות 90 ימי Calendar מן ה־Backup התקף הראשון.

28.15.3 Closed Pilot יכול להתקדם דרך 23.1 רק עם ניסוח מפורש שאין עדיין 90-day evidence; Public/Commercial GA ו־Ransomware-ready claim דורשים 23.2.

## 29. שלב 24 — QA, Performance, Security ו־Adversarial verification

29.1 מטרת השלב היא להוכיח באופן עצמאי שהמערכת מתנהגת נכון תחת שימוש רגיל, עומס, כשל וניסיון ניצול, באותו Artifact שמיועד לשחרור.

29.2 זמן משוער לשלב הוא 200–336 שעות עבודה נטו, לא כולל תור Pentest חיצוני וזמן תיקון ממצאים.

29.3 תלות השלב היא כל Gate פעיל עד 23 לפי Scope Manifest. Core כולל 1, ‏2, ‏3, ‏4, ‏5, ‏6.1, ‏6.2, ‏7, ‏8, ‏9, ‏10, ‏11, ‏12.1, ‏12.2.1, ‏12.2.2, ‏12.2.4, ‏13, ‏14.1, ‏15, ‏16, ‏19.1, ‏20, ‏21.1, ‏22 ו־23.1. ‏Gates 6.3, ‏12.2.3, ‏12.2.5, ‏12.2.6, ‏14.2, ‏17, ‏18.1, ‏18.2, ‏19.2, ‏19.3, ‏21.2 ו־23.2 מצטרפים רק אם יכולותיהם או Claim ה־GA/90-day פעילים. נדרשים גם Requirements traceability ו־Release candidate יציב.

29.4 הבעלים הנדרש הוא QA lead שמי; Security approver אינו המיישם היחיד, טל מאשר Send/rate tests ונדרש Pentest חיצוני מורשה לפני הרחבה.

29.5 משימת Test strategy.

29.5.1 למפות כל Requirement ו־Threat ל־Unit, Contract, Integration, Migration, Browser E2E, Security, Performance ו־Manual evidence.

29.5.2 להפריד Fast checks לכל Commit, Full checks לכל PR ו־Environment/Release checks ל־Artifact מקודם.

29.5.3 למדוד Behavior/error/deny coverage ולא להסתפק במספר Tests או Line coverage.

29.5.4 Test corpus קבוע, ממוספר ודטרמיניסטי; אסור `Math.random()` או Random ordering/fuzzing.

29.5.5 אין להשתמש ב־Mock/Synthetic/Fake/Demo/Sample כנתון עסקי או כ־Live evidence. מקורות הבדיקה היחידים הם Artifact אמיתי מאושר וממוזער, Artifact רשמי של Sandbox ספק, Normative vector או Deterministic non-business attack literal, כולם עם Provenance, Digest, Purpose, Expiry ו־claim limitation לפי MP-F050.

29.5.6 Test אינו רשאי לחייב, לשלוח לנמען לא מאושר, לשנות Production או ליצור Spam כדי להוכיח גבול.

29.5.7 תנאי הקבלה הוא Traceability ללא Requirement או Threat חסרי Test/exception.

29.6 משימת Unit ו־Contract.

29.6.1 לבדוק Validators, Canonical digests, State machines, Eligibility, Role decisions, Rate policy, Error taxonomy ו־Redaction.

29.6.2 Contract suite זהה לכל Adapter משפחה: Meta, OpenAI, Storage, Scanner, Billing, Identity ו־Telemetry.

29.6.3 Mutation של Required key, extra key, Prototype, Accessor, Proxy, Symbol, Unicode ו־oversized value נבדקת בכל Boundary רגיש.

29.6.4 Time ו־Clock מוזרקים במפורש מ־Test clock מאושר; אין המתנה אמיתית ארוכה או תלות בשעה מקומית.

29.6.5 תנאי הקבלה הוא Positive ו־Negative vectors לכל Branch בטיחותי.

29.7 משימת Integration ו־Database.

29.7.1 להריץ PostgreSQL major version התואמת ל־Production, Fresh migrations ו־Upgrade מהגרסה האחרונה.

29.7.2 לבדוק Named roles, RLS, Direct-DML denial, Pool reuse, Locks, Concurrency, Crash phases ו־Restore privacy.

29.7.3 Redis/BullMQ tests כוללים duplicate, delay, crash, restart, eviction policy, DLQ ו־DB rebuild.

29.7.4 S3/GuardDuty tests כוללים Quarantine, Object version, Scan status, tag access, KMS denial ו־lifecycle.

29.7.5 כל Integration test מקשר Config/Schema/Provider version ואינו מוצג כ־Live evidence אם הוא מקומי.

29.7.6 תנאי הקבלה הוא Fresh environment שמגיע לאותו Schema/contract digest ועובר negative role matrix.

29.8 משימת Browser E2E.

29.8.1 לכסות Login/MFA, Organization, Onboarding, Contact import, Consent/Opt-out, Template, Campaign dry run, Inbox, Human handoff, Flow simulator, AI approval, Admin ו־Privacy request.

29.8.2 כל Journey כולל Success, Validation, Permission deny, Provider outage, Refresh, Back/forward, Two tabs ו־Session expiry.

29.8.3 לבדוק Chromium ו־Safari/Firefox לפי מטריצת דפדפנים מאושרת; Mobile viewport ו־Touch אינם תחליף למכשיר/Screen reader.

29.8.4 E2E ממתין ל־observable state ולא ל־Sleep שרירותי.

29.8.5 תנאי הקבלה הוא אפס Critical journey ללא E2E ו־Manual accessibility complement.

29.9 משימת Application/API security.

29.9.1 להשלים OWASP ASVS 5.0 Level 2 לכל המוצר ובקרות Level 3 שנבחרו למסלולי P0.

29.9.2 לכסות OWASP API Security Top 10, OWASP Top 10 2025 ו־WSTG רלוונטי.

29.9.3 להריץ SAST, Dependency, Secret, IaC, Container ו־DAST scanners עם Triage אנושי; Tool pass לבדו אינו Sign-off.

29.9.4 לבדוק BOLA/IDOR, authentication, CSRF, XSS, CSP/CORS, SQL/command injection, SSRF, resource consumption, unsafe provider consumption ו־business flow abuse.

29.9.5 לבצע Independent review לכל Auth, Tenant, Billing, Meta, AI, File, Retention, Admin ו־Release boundary.

29.9.6 תנאי הקבלה הוא ASVS matrix עם Pass, N/A justification או Risk acceptance לכל Requirement רלוונטי.

29.10 משימת AI ו־File adversarial.

29.10.1 לבדוק Direct/indirect prompt injection, RAG poisoning, Cross-tenant retrieval, System prompt/secret exfiltration, unsafe output ו־tool/approval escalation.

29.10.2 AI נשאר Draft-only; כל ניסיון לשלוח, למחוק, לחייב או לשנות הרשאה בלי אדם נכשל.

29.10.3 לבדוק PDF/DOCX/TXT malformed, Macro, Encryption, Polyglot, MIME mismatch, Oversize, archive/resource bomb, scan timeout ו־verdict spoof.

29.10.4 Quarantine object אינו נגיש ל־App, AI או User לפני Verdict קשור ל־Version/digest.

29.10.5 תנאי הקבלה הוא Red-team corpus גרסתי, Reproducible results ואפס Security-critical failure.

29.11 משימת Messaging/Webhook/Queue adversarial.

29.11.1 לבדוק Webhook forgery, Byte mutation, Replay, Reorder, duplicate, unknown asset ו־ack/commit crash.

29.11.2 לבדוק Queue replay, poison, tampered job, DLQ replay, concurrent Workers ו־Redis loss.

29.11.3 לבדוק Provider binding mutation, credential rotation, one-attempt, abort/timeout/reset, malformed response ו־late webhook.

29.11.4 לבדוק Opt-out/quality/rate changes בכל נקודה בין Snapshot ל־Network.

29.11.5 תנאי הקבלה הוא אפס duplicate Provider attempt ואפס send ללא Eligibility/Permit.

29.12 משימת Billing/Retention/Admin adversarial.

29.12.1 לבדוק Billing forged/replayed/reordered events, price/customer swap, entitlement escalation ו־double-provider activation.

29.12.2 לבדוק expired Delete plan, Policy drift, broad cutoff, Active/Hold record, concurrent execution ו־Restore replay.

29.12.3 לבדוק Support tenant swap, Break-glass bypass, stale approval, Audit mutation ו־bundle leak.

29.12.4 תנאי הקבלה הוא אפס חיוב/הרשאה/מחיקה/Admin action ללא Contract מאושר.

29.13 משימת Performance ו־Capacity.

29.13.1 למדוד Baseline של API, DB queries, Webhook ack, Queue, Inbox, Campaign materialization, Provider boundary, AI ו־File pipeline.

29.13.2 Load profile נגזר ממדידות Pilot/יעד מאושר; אין להמציא מספר Tenants, Contacts או Messages per second.

29.13.3 לבדוק Burst, sustained load, soak, backpressure, queue recovery, DB saturation, Redis restart, Provider throttle ו־Noisy neighbor.

29.13.4 Acceptance משתמש ב־percentiles, error/unknown rate, resource/cost ו־fairness, לא Average בלבד.

29.13.5 Connect cap נשאר שווה או נמוך מ־Meta live limit ומ־Budget; Load test אינו מנסה לעורר Enforcement.

29.13.6 תנאי הקבלה הוא Capacity model, bottleneck, safe operating envelope ו־stop conditions מאושרים.

29.14 משימת Resilience ו־failure injection.

29.14.1 להזריק כשל דטרמיניסטי לפני/אחרי כל durable commit ו־external attempt במסלולי P0.

29.14.2 לבדוק service restart, deploy overlap, clock skew, network partition, provider timeout, DB failover ו־KMS denial.

29.14.3 Failure injection אינו רץ ב־Production בלי Plan, Scope ואישור; Pilot משתמש ב־Staging או Canary בטוח.

29.14.4 תנאי הקבלה הוא Crash-phase matrix ללא data loss, duplicate side effect או silent success.

29.15 משימת Supply-chain/release assurance.

29.15.1 להפיק SBOM, Artifact digest, Build provenance/attestation, Dependency report ו־Workflow identity.

29.15.2 לקדם לכיוון SLSA Build Level 2: Hosted build, signed provenance ואימות לפני Deploy; Level 3 נשקל לאחר Pilot לפי פלטפורמה/תקציב.

29.15.3 Source guard מכסה Client/server/DB/runtime/package boundaries ו־SHA של executables רגישים.

29.15.4 Artifact לא־קשור ל־Commit, Workflow או Config digest אינו מקודם.

29.15.5 תנאי הקבלה הוא Verification מ־Clean checkout ומ־fresh clone של אותו Commit.

29.16 משימת Pentest ו־remediation.

29.16.1 להגדיר Scope, Rules of engagement, Test accounts, Rate/Meta restrictions, Data handling, Emergency stop ו־Authorized window.

29.16.2 Pentest חיצוני מכסה Web/API, Tenant isolation, Auth, Admin, File/AI, Webhooks ו־business logic לפי זמינות.

29.16.3 כל Finding מקבל Severity, Reproduction, Root cause, Owner, Fix, Regression test ו־Retest evidence.

29.16.4 Critical/High או P0/P1 פתוחים חוסמים Release; downgrade דורש Review עצמאי ו־Risk acceptance.

29.16.5 תנאי הקבלה הוא Retest pass ולא רק `fixed` מפי המיישם.

29.17 משימת Baseline regression.

29.17.1 כל 3,869 הבדיקות שב־Baseline סעיף 4 וכל בדיקה חדשה חייבות לעבור יחד; Count בפועל נרשם בזמן Release.

29.17.2 Test שהוסר דורש Reason, Reviewer וקישור ל־Requirement שהועבר או בוטל.

29.17.3 Flaky test אינו Pass; הוא מתוקן או מוסר מה־Gate רק עם Risk acceptance זמני.

29.17.4 Build, TypeScript, ESLint, Guards, Migrations ו־Tests עוברים באותו Commit/Artifact.

29.18 Evidence הוא Traceability matrix, test reports, ASVS/WSTG matrix, Red-team corpus, Performance/Capacity, Pentest/retest, SBOM, Provenance ו־Clean-checkout report.

29.19 Rollback הוא ביטול Release/Feature והחזרת Artifact מאומת קודם תוך שמירת Schema compatibility. בקרה שנכשלה אינה נעקפת; Feature נשאר כבוי עד Retest.

29.20 Gate 24 נסגר רק לאחר אפס P0/P1, Pentest/ASVS review עצמאי, Performance envelope, Full regression ו־Artifact provenance.

## 30. שלב 25 — UX, Accessibility, RTL, i18n ו־Product clarity

30.1 מטרת השלב היא מוצר עברי, ברור ונגיש שבו כל Critical journey עובד במקלדת, קורא מסך ומסך קטן, בלי Bidi spoof או כפתורים מתים.

30.2 זמן משוער לשלב הוא 112–192 שעות עבודה נטו, לא כולל זמינות מומחה נגישות ובודקים עם מוגבלות.

30.3 תלות השלב היא Design tokens, Role/error models ו־Critical flows יציבים מסעיפים 13–25; העבודה מתחילה מוקדם אך Gate נסגר אחרי Gate 24.

30.4 הבעלים הנדרש הוא UX/Product owner; Frontend lead, מומחה נגישות ישראלי, Security, Legal ו־משתמשים מאשרים.

30.5 משימת Accessibility baseline.

30.5.1 יעד Engineering הוא WCAG 2.2 AA.

30.5.2 החובה המשפטית בישראל תיבדק מול התקנות ות״י 5568 בגרסה החלה; WCAG target אינו חוות דעת משפטית.

30.5.3 ליצור Accessibility statement, Contact channel, Owner, Known limitations ו־Remediation process.

30.5.4 לכל Success criterion רלוונטי להגדיר Component/flow, Test, Result, Evidence ו־Owner.

30.5.5 תנאי הקבלה הוא WCAG matrix מלאה ללא Criterion שנשכח.

30.6 משימת Design system.

30.6.1 להגדיר Tokens ל־color, contrast, type, spacing, focus, motion, z-index, direction ו־states.

30.6.2 לבנות Components נגישים ל־Button, Link, Input, Select, Combobox, Table, Tabs, Menu, Dialog, Drawer, Toast, Alert ו־Progress.

30.6.3 Disabled, Loading, Empty, Error, Offline, Permission denied ו־Unknown states נראים ומוסברים באופן עקבי.

30.6.4 Button ללא פעולה מושבת עם הסבר; Placeholder אינו Label; Tooltip אינו הדרך היחידה למידע חובה.

30.6.5 תנאי הקבלה הוא Component accessibility harness ו־visual/interaction regression.

30.7 משימת Keyboard ו־Focus.

30.7.1 כל פעולה זמינה ללא עכבר ובסדר Tab הגיוני.

30.7.2 Dialog/Drawer/Menu מטפלים Focus initial, trap, Escape והחזרת Focus; Focus אינו נעלם לאחר mutation.

30.7.3 Skip links, Landmarks, Headings, Error summary, Inline error ו־Live regions עקביים.

30.7.4 Drag/drop ב־Flow, Upload ו־Column mapping מקבל חלופה מלאה במקלדת.

30.7.5 Shortcut אינו מתנגש ב־Browser/assistive tech וניתן להשבתה כאשר נדרש.

30.7.6 תנאי הקבלה הוא Keyboard-only לכל Critical journey.

30.8 משימת Screen reader.

30.8.1 Labels, Names, Roles, States ו־Descriptions תואמים לפעולה בפועל.

30.8.2 Dynamic updates כגון Assignment, Incoming message, Upload progress, Validation ו־Campaign state מקבלים Announcement מדוד.

30.8.3 Table/Chart מקבל Caption, headers, summary וחלופה טקסטואלית שמאפשרת לקבל את אותה החלטה.

30.8.4 Virtualized Inbox/Contact list, אם קיים, שומר semantics, position ו־focus.

30.8.5 תנאי הקבלה הוא VoiceOver/Safari ו־NVDA/Chrome לפחות, בהתאם למטריצת דפדפנים.

30.9 משימת Visual/reflow/motion.

30.9.1 לבדוק Contrast, Focus visibility, 200% ו־400% zoom, Reflow, Text spacing, Target size ו־Orientation.

30.9.2 צבע אינו הסמן היחיד ל־Unread, Error, Unknown, Approval, Quality או Danger.

30.9.3 Reduced motion מכובד; Animation אינה חובה להבנת שינוי מצב.

30.9.4 Touch target ו־sticky areas אינם מסתירים Focus או Content במסך קטן.

30.9.5 תנאי הקבלה הוא Visual matrix ב־breakpoints וב־zoom המאושרים.

30.10 משימת RTL ו־Bidi security.

30.10.1 Direction נקבע לפי שפה ורכיב, לא באמצעות CSS mirror גורף.

30.10.2 Phone, URL, Email, Code, IDs, Money, Dates וטקסט מעורב מקבלים Bidi isolation והצגה קנונית.

30.10.3 Control characters חשודים מסומנים או מנורמלים לפי Context; אין שינוי בלתי־נראה של Target.

30.10.4 Icons בעלי משמעות כיוונית נבדקים, בעוד Icons אוניברסליים אינם נהפכים אוטומטית.

30.10.5 תנאי הקבלה הוא Corpus עברי/אנגלי/ערבי/מספרים עם Bidi spoof attempts.

30.11 משימת i18n/content.

30.11.1 עברית היא ברירת Pilot; English fallback שלם ולא ערבוב מקרי. המוצר המלא דורש Catalog, Review ו־Acceptance מלאים בעברית, אנגלית וערבית בכל Surface לפני Claim של תמיכה בשלוש שפות.

30.11.2 Strings יוצאות ל־Localization catalog בלי Concatenation שמפרקת דקדוק.

30.11.3 Dates, Asia/Jerusalem timezone, Number, Currency, Name ו־Pluralization עוברים Formatter מרכזי.

30.11.4 Error מסביר מה קרה, למה, מה נשמר ומה המשתמש יכול לעשות, בלי Stack/Secret.

30.11.5 Technical details זמינים ב־Disclosure למי שצריך, בלי להציף מתחיל.

30.11.6 תנאי הקבלה הוא Pseudo-localization או equivalent deterministic expansion ו־review אנושי בעברית/אנגלית.

30.12 משימת Critical journeys.

30.12.1 לכסות Onboarding, Tenant selection, WhatsApp connection, Contact import, Consent, Template, Campaign approval, Inbox reply, AI draft approval, Opt-out, Privacy request, Admin ו־error recovery.

30.12.2 לכל Journey להגדיר Goal, Preconditions, Steps, Success, Recoverable errors, Irreversible warnings ו־Help.

30.12.3 Dangerous action מציג Scope, Count, Consequence ו־Rollback לפני Approval; אין Dark pattern.

30.12.4 Empty state מלמד את הצעד הבא אך אינו מייצר Fake data.

30.12.5 תנאי הקבלה הוא moderated usability test או expert walkthrough עם issues מתועדים.

30.13 משימת Responsive-Web baseline והוכחת היעדר PWA.

30.13.1 Core read/reply/approve flows עובדים במסך קטן; Builder מורכב יכול לדרוש Desktop עם הסבר נגיש.

30.13.2 Base אינו מתקין Service Worker, אינו מציג Install prompt, אינו מפעיל Background sync או Web push ואינו שומר PII/Message/Contact/Knowledge content ל־Offline use. כל אלה שייכים לחבילת PWA מותנית בלבד.

30.13.3 Push notifications אינן חלק מ־Pilot אלא אם Scope/Privacy מאושרים.

30.13.4 תנאי הקבלה הוא device/browser matrix, ‏Responsive journey tests והוכחת היעדר Route/Registration/Cache/Push/Claim של PWA ב־Base.

30.14 משימת Accessibility testing.

30.14.1 להריץ Automation בכל PR אך לא להציגו כתחליף לבדיקה ידנית.

30.14.2 לבצע Manual keyboard, Screen reader, Zoom/reflow, Reduced motion ו־Cognitive clarity.

30.14.3 לשלב מומחה נגישות ובמידת האפשר משתמשים עם מוגבלות לפני הרחבת Pilot.

30.14.4 כל Finding מקבל Severity, Owner, Fix, Regression ו־Retest.

30.15 Evidence הוא WCAG/legal matrix, Component reports, Keyboard/screen-reader recordings ללא PII, RTL/Bidi corpus, usability findings ו־Accessibility statement.

30.16 Rollback הוא Feature flag או חזרה ל־Flow נגיש קודם. אסור Rollback שמסיר Opt-out, Warning, Keyboard access או Error clarity.

30.17 Gate 25 נסגר רק לאחר אפס חסם Critical ב־Keyboard/Screen reader/Mobile, WCAG 2.2 AA evidence, Legal review, RTL/Bidi safety ו־Critical journeys בעברית.

## 31. שלב 26 — Staging, Canary, Closed Pilot ו־Go/No-Go

31.1 מטרת השלב היא להעביר Release candidate מסביבה מבודדת ל־Pilot סגור באופן הדרגתי, מדיד והפיך.

31.2 זמן משוער לשלב הוא 120–200 שעות עבודה נטו, ובנוסף 2–4 שבועות Observation; זמני Meta/Legal/Supplier עלולים להוסיף זמן לא ידוע.

31.3 תלות Core closed pilot היא רשימת Gate IDs מפורשת וסגורה: 1, ‏2, ‏3, ‏4, ‏5, ‏6.1, ‏6.2, ‏7, ‏8, ‏9, ‏10, ‏11, ‏12.1, ‏12.2.1, ‏12.2.2, ‏12.2.4, ‏13, ‏14.1, ‏15, ‏16, ‏19.1, ‏20, ‏21.1, ‏22, ‏23.1, ‏24, ‏25, ‏26.0.1 ו־26.0.2. ‏Gate 6.3 ו־14.2 נדרשים אם Upload או Media נכללים; Gate 17 אם Flow נכלל; Gate 18.1/18.2 לפי AI/Knowledge scope; Gate 19.2 אם שני Billing adapters נכללים; Gate 19.3 אם Live billing נכלל; Gate 21.2 אם destructive deletion פעיל; Gate 23.2 נדרש ל־GA או Claim בן 90 יום ואינו ניתן לסגירה מיידית. בנוסף נדרשים Provider accounts, Domains, Legal docs, On-call, Restore evidence ו־Numeric pilot charter. Capability שלא נכללה חייבת Disabled evidence, אפס Credential חי, אפס Background job ו־UI מושבת וברור. Gate 26.1 הוא תוצאת בדיקת readiness זו ואינו תלות של עצמו.

31.4 הבעלים הנדרש הוא Release manager; Product הוא Go/No-Go accountable, ול־Security, Privacy, SRE, QA ו־WhatsApp safety יש Veto.

31.5 משימת Environment readiness.

31.5.1 לאמת שוב הפרדת DB, Redis, S3/KMS, Secrets, Domains, Clerk, Better Stack, OpenAI, Meta ו־Billing בין Staging/Production.

31.5.2 Staging אינה מקבלת Production dump, Credential או Recipient list.

31.5.3 Preview מוגן; Healthcheck אינו חושף Config ותלוי ב־continuous monitoring נפרד.

31.5.4 כל External decision/evidence מקבל Freshness check לפני Release.

31.5.5 תנאי הקבלה הוא Cross-environment denial suite ו־Inventory חתום.

31.6 משימת Release manifest.

31.6.1 לקשור Artifact ל־Commit, Build provenance, SBOM, Migration set, Config digest, Prompt/model/index, Rate policy ו־Provider versions.

31.6.2 Promotion משתמש באותו Artifact שנבדק; אין Rebuild ל־Production.

31.6.3 Migrations הן Expand/Contract או backward-compatible; App rollback אינו DB rollback.

31.6.4 Release כולל Known risks, Kill switches, Runbooks, Owners ו־Rollback artifact.

31.6.5 תנאי הקבלה הוא Offline/CI verification של כל Digest ו־Approval.

31.7 משימת Rehearsal ב־Test WABA.

31.7.1 לבצע Onboarding, Inbound webhook, Contact/consent, Template, Inbox, Human approval, One-attempt send, Status, Opt-out ו־Reconciliation.

31.7.2 לבצע Flow רק אם Gate 17 סגור, AI draft ללא Knowledge רק אם Gate 18.1 סגור, ו־Knowledge/RAG/File pipeline רק אם Gates 18.1 ו־18.2 סגורים; אחרת היכולות נשארות כבויות עם Disabled evidence ואינן חוסמות Core pilot.

31.7.3 לבצע Pause, Kill, Drain, Resume, Credential rotation, Worker crash ו־Rollback על אותו Artifact.

31.7.4 אין Bulk גדול או בלתי־מוגבל, Recurring, Live Billing, Autonomous AI או Enterprise feature. Campaign מוגבל מותר רק עד ה־Allowlist וה־Caps המספריים של Charter 34.30.18.

31.7.5 תנאי הקבלה הוא End-to-end trace, no duplicate, accurate statuses ו־all stop controls.

31.8 משימת Canary.

31.8.1 Canary משתמש ב־Allowlist דטרמיניסטית של Tenant/users/recipients מאושרים, לא חלוקה אקראית.

31.8.2 סדר ההפעלה הוא Read-only, Authentication/Inbox, Inbound, Drafts, Human-approved single send, small approved campaign ורק Features שסגרו Gate.

31.8.3 לכל שכבה להגדיר Observation window, Metrics, Error/Safety thresholds, Owner ו־Stop conditions לפני הפעלה.

31.8.4 Expansion אינה אוטומטית לפי זמן בלבד; נדרש Review evidence.

31.8.5 תנאי הקבלה הוא Canary report ללא P0/P1 ו־Rollback drill.

31.9 משימת Closed pilot.

31.9.1 Pilot הוא Tenant יחיד וקבוצה סגורה לפי D21.

31.9.2 שימוש בנכסי האב דורש אישור כתוב, Recipient allowlist, מינימום הרשאות ותוכנית Revocation.

31.9.3 כל משתמש מקבל הדרכה, Privacy notice, Acceptable use, Support, Opt-out ו־Incident contact.

31.9.4 Plan ידני יחיד ו־Quotas מאושרים; אין חיוב אוטומטי.

31.9.5 Pilot measures מוגדרים מראש: Activation, Time-to-value, Task success, Send safety, Delivery outcomes, Support burden, Reliability, Accessibility ו־Cost.

31.9.6 ערכי יעד מספריים נקבעים לפני הפתיחה לפי Baseline/Business goal; אין להמציא או לבחור בדיעבד.

31.9.7 תנאי הקבלה הוא Participant roster, Consent/notice, measurement definitions ו־support readiness.

31.10 משימת Stop conditions.

31.10.1 Cross-tenant access, unauthorized send, duplicate attempt, uncontained Unknown, Secret leak או Audit gap עוצרים מיד.

31.10.2 Opt-out/Legal failure, Restore failure, Malware bypass, Billing mutation או Meta restriction עוצרים Feature/Pilot לפי Scope.

31.10.3 Cost cap, Queue runaway, DB saturation, Quality drop או SLO burn מפעילים Pause/slowdown לפי Runbook.

31.10.4 Stop עוצר Intake/permits, שומר Facts/Unknowns ומבצע Reconciliation; הוא אינו מוחק Queue בעיוורון.

31.10.5 כל Stop condition נבדק טכנית או ב־Tabletop לפני Pilot.

31.11 משימת Observation ו־daily review.

31.11.1 לבצע Daily review של Incidents, Unknowns, quality/rates, queue, opt-outs, costs, support, accessibility ו־evidence expiry.

31.11.2 שינוי Policy/Config במהלך Pilot מקבל Change record ו־mini Go/No-Go.

31.11.3 Feedback נאסף במבנה קבוע ומופרד מ־PII; אין להעתיק שיחות גולמיות למחקר.

31.11.4 Observation נמשך 2–4 שבועות או יותר לפי נפח/סיכון; זמן לבדו אינו Pass אם לא התקבל מספיק Evidence.

31.11.5 תנאי הקבלה הוא Pilot report עם Coverage ו־Confidence, לא רק ממוצעים.

31.12 משימת Go/No-Go.

31.12.1 לעבור על Security, Privacy, Legal, SLO, Backup, Accessibility, Support, Cost, Provider status ו־Pilot outcomes.

31.12.2 כל Owner מצביע Go, Conditional Go או No-Go עם Evidence.

31.12.3 P0/P1 אינו Conditional Go. Conditional Go מותר רק עם Scope, Compensating control, Expiry ו־Stop condition.

31.12.4 החלטה קשורה ל־Artifact, Config, Policy ו־Provider evidence digests.

31.12.5 הרחבה מעבר ל־Tenant היחיד דורשת Gate 26.2 ולא המשך אוטומטי. Expansion Manifest חתום מגדיר מספר Tenants, משתמשים, Recipients, Attempts ל־24 שעות, Campaigns, Cost cap, Observation window, Support coverage ו־Stop thresholds; כל ערך חסר משאיר את Gate 26.2 חסום.

31.13 Evidence הוא Environment inventory, Release manifest, Rehearsal, Canary report, Stop drills, Pilot metrics/feedback, Incidents ו־signed Go/No-Go minutes.

31.14 Rollback הוא Instant/app deployment rollback לאותו Artifact מאומת, Side-effect kill, queue drain, Unknown reconciliation ו־routing return רק אחרי Smoke/Telemetry/Data integrity. DB/volume מטופלים בנפרד לפי Gate 23.1, ובנוסף לפי Gate 23.2 כאשר נדרש GA/90-day claim.

31.15 Gate 26.1 פותח Closed pilot בלבד. Gate 26.2 מאפשר הרחבה מוגבלת לאחר Observation ו־Go חדש; אינו אישור Unlimited scale. Gate 26.3 מסיים ומקבל את ה־Pilot רק לאחר תקופת Observation מספקת, Exit report חתום, החלטת Go/No-Go, כל P0/P1 סגור, Reconciliation/Restore/Rollback שעברו והכרעה בכל Feedback מהותי; רק 26.3 פותח את שלב Roadmap.

## 32. שלב 27 — מחקר מתחרים ו־Roadmap מבוסס Evidence

32.1 מטרת השלב היא לבחור את ה־Roadmap אחרי Pilot לפי בעיות לקוח, ביצועים ופער שוק מוכח, ולא לפי העתקת רשימת Features.

32.2 זמן משוער לשלב הוא 72–120 שעות עבודה נטו.

32.3 תלות השלב היא Gate 26.3 ו־Pilot שהושלם והפיק Metrics, Interviews, Support, Cost, Reliability ו־signed exit evidence. מחקר שוק יכול להתחיל קודם, אך החלטת Roadmap אינה נסגרת לפני 26.3.

32.4 הבעלים הנדרש הוא Product owner; Product research lead שמי הוא `unknown/unavailable`. ‏UX, Engineering, Support/Sales, Security ו־Finance מאשרים את תחומם. טל תורם ומאשר רק Evidence ומסקנות הנוגעים למגבלות WhatsApp/Meta ולמדיניות Connect rate limiting; אין לו מכך בעלות על מחקר המוצר כולו.

32.5 משימת Customer evidence.

32.5.1 לנתח Activation, Time-to-value, Completion, Failure reasons, Support burden, Retention intention ו־Willingness to pay.

32.5.2 לבצע Interviews מובנים עם Script קבוע, Consent ושמירת Notes ללא PII מיותר.

32.5.3 להפריד Request בודד, Pattern חוזר, Pain בעל Workaround ו־Pain שלקוח מוכן לשלם עליו.

32.5.4 לכל Problem לשמור Segment, Frequency, Severity, Current workaround, Business impact ו־Evidence links.

32.5.5 תנאי הקבלה הוא Problem inventory שבו כל מסקנה ניתנת לשחזור ממקור מאושר.

32.6 משימת Competitor set.

32.6.1 Core WhatsApp/omnichannel benchmark כולל respond.io, WATI, SleekFlow ו־Trengo.

32.6.2 Customer-service benchmark כולל Intercom, Zendesk ו־HubSpot Service Hub.

32.6.3 Platform/API benchmark כולל Twilio WhatsApp ו־Meta Cloud API הישיר.

32.6.4 לכל מתחרה לבדוק Official docs/pages, Trial חוקי אם זמין, Plan, Region, Checked date ו־Reviewer.

32.6.5 Marketing claim מסומן `claimed`; פעולה שנבדקה מסומנת `verified`; מידע חסר מסומן `N/A` ולא מקבל ציון מומצא.

32.6.6 תנאי הקבלה הוא Evidence archive מתוארך ו־Terms-compliant.

32.7 משימת Comparison dimensions.

32.7.1 Official WhatsApp onboarding, asset management, templates, campaigns, quality/rate safety ו־delivery truth.

32.7.2 Shared inbox, assignment, notes, search, collaboration, mobile ו־human handoff.

32.7.3 Automation, flow builder, scheduling, integrations, API ו־extensibility.

32.7.4 AI copilots/agents, approval model, RAG, citations, safety, privacy ו־cost controls.

32.7.5 CRM, contacts, consent, segmentation, analytics, reporting ו־billing.

32.7.6 Security, tenant isolation, audit, SSO, backup, incident, compliance, accessibility ו־RTL/Hebrew.

32.7.7 Onboarding, usability, time-to-value, support, reliability claims ו־total cost.

32.7.8 תנאי הקבלה הוא Definition מפורש לכל Dimension כדי ששני Reviewers ימדדו אותו באותה צורה.

32.8 משימת Scoring.

32.8.1 ציון 0–5 ניתן רק כאשר קיימת Evidence; כל Score כולל Source, Date, Confidence ו־Coverage.

32.8.2 Weight נקבע לפי Outcomes מה־Pilot ו־ICP הישראלי, לא לפי העדפת המפתח.

32.8.3 `N/A` אינו אפס ואינו חמש; Overall score מוצג עם Coverage כדי לא להעדיף מוצר שלא נבדק.

32.8.4 Product claim ו־Independent verification מוצגים בנפרד.

32.8.5 Reviewer שני משחזר Sample ומבצע Bias review.

32.8.6 תנאי הקבלה הוא Scorecard reproducible ואפס ציון חסר מקור.

32.9 מסקנת המחקר הנוכחית.

32.9.1 respond.io מציגה Omnichannel inbox, AI agents, integrations, lifecycle analytics ו־mobile ולכן היא Benchmark רוחב ובשלות.

32.9.2 WATI מציגה Multi-channel team inbox ו־AI מסוג Ask/Agents, כולל פעולות שמחייבות Review בחלק מהיכולות, ולכן היא Benchmark WhatsApp-first ו־AI workflow.

32.9.3 SleekFlow ו־Trengo מציגות Omnichannel, automation ו־AI ולכן הן Benchmark ל־onboarding ו־workflow breadth.

32.9.4 Connect לא תנצח בטווח Pilot בכמות Channels או Integrations. ניסיון להדביק רוחב זה לפני Reliability יגדיל סיכון וידחה Time-to-value.

32.9.5 ההבדלה המומלצת היא Hebrew-first, התאמה לישראל, שקיפות Consent/rate/quality, Human-approved AI, Evidence-backed send truth, operational safety ו־support מקומי.

32.9.6 מסקנה זו היא Inference מן המקורות וה־ICP; היא תאושר או תידחה לפי Pilot evidence.

32.9.7 Snapshot המחקר מ־26.08.2026 מאמת ב־Documentation רשמי כי respond.io, ‏WATI, ‏SleekFlow ו־Trengo מציגות Shared inbox, Automation, AI וערוצים נוספים; Intercom מציגה Fin על WhatsApp עם Human handoff; HubSpot מציגה Help Desk רב־ערוצי עם WhatsApp בתוכניות Service Hub Professional/Enterprise; Twilio מציגה API, Templates, Conversations/Flex ו־Studio. אלו `claimed/documented capabilities`, לא הוכחת Reliability, Security, Hebrew/RTL, Support quality או התאמה ל־Plan מסוים.

32.9.8 נמצא Conflict ראשון־צד מהותי ב־respond.io: דף השיווק הנוכחי מתאר Mobile inbox רחב, בעוד מסמך ה־Mobile app הרשמי מ־20.08.2026 מסמן Dashboard, Contacts, AI Agents, Broadcasts, Workflows ו־Reports כלא זמינים במובייל, וחלק מן ה־Inbox כהגבלה חלקית. לכן Score אינו נלקח מדף שיווק יחיד; Product/Help/Plan/App-build/Trial evidence מקבלים Records נפרדים והסתירה נשארת פתוחה עד בדיקה של אותה גרסה ותוכנית.

32.9.9 WATI מתעדת Ask, background Agents ו־Astra autonomous agent; SleekFlow מתעדת AgentFlow, knowledge, execution traces, optimization, advanced flow builder ו־custom API integrations; Trengo מתעדת AI Journeys, AI Agent, Supervised Mode ו־Actions. המסקנה היא ש־AI/Automation breadth הוא Baseline תחרותי מתקדם, אך Connect אינה מעתיקה autonomy: D25 נשארת Human approval לכל WhatsApp send ולכל פעולה בעלת השפעה גבוהה עד Evidence עתידי נפרד.

32.9.10 Intercom מתעדת Fin על WhatsApp, Bot inbox, handoff ו־SLA separation, אך ה־FAQ הרשמי הנוכחי מציין שה־REST API אינו יכול להתחיל WhatsApp conversation או לשלוח Templates ושאי־אפשר ליצור Ticket form ישירות מתוך שיחת WhatsApp. לכן Intercom הוא Benchmark חזק לשירות ו־AI, אך אינו מוכיח Campaign/API parity ל־Connect.

32.9.11 HubSpot מתעדת WhatsApp בתוך Help Desk רק בתוכניות Service Hub Professional/Enterprise ומרכזת Ticketing, Routing, collaboration ו־AI. זהו Benchmark ל־CRM/Service integration ול־Enterprise packaging, לא הצדקה להכניס CRM מלא ל־Pilot הישראלי.

32.9.12 Twilio מתעדת API/Console/Content Templates, Conversations, Flex ו־Studio וכן מחיר ספק נוסף מעל Meta. זהו Benchmark ל־Platform/API ול־extensibility, אך לקוח שבוחר בו עדיין צריך לבנות או לקנות Product UX, tenant controls, consent, evidence ו־operations; אין להסיק מ־API breadth שמתקבלת מערכת מוכנה.

32.9.13 אין Overall score מספרי “כנה” לפני Trial ו־Evidence אחיד: הצגת מספר על סמך Claim בלבד תהיה המצאה. לפני Gate 27 יופק Scorecard דו־שכבתי: `official-claim coverage score` ו־`independently-verified score`, כל אחד עם Coverage ו־Confidence. מתחרה שלא ניתן לבדוק מקבל `N/A`, לא אפס; Connect עצמה אינה מקבלת ציון Runtime/Production לפני Evidence חי. דרישת הציונים נשארת משימת ביצוע מפורשת ב־32.8 וב־A04, ואינה מסומנת הושלמה על בסיס המחקר הראשוני.

32.10 משימת Prioritization.

32.10.1 לכל Candidate לרשום Problem, Evidence, Target segment, Expected outcome, Security/privacy risk, Cost, Dependencies, Owner ו־Kill criterion.

32.10.2 להשתמש רק בנוסחת D29 שב־34.30.14.2: Paying tenants affected כפול workflow frequency כפול measured outcome כפול confidence, חלקי effort. נתון לא ידוע נשאר Range; RICE/WSJF דורשים Decision amendment.

32.10.3 Roadmap מחולק Now, Next, Later ו־Not planned.

32.10.4 Reliability, Consent, Send safety, Support ו־Accessibility debt קודמים להרחבת Features אם הם פוגעים ב־Pilot.

32.10.5 Experiment מוגבל ל־Tenant/feature flag ומגדיר Metric, Guardrail, Stop ו־Rollback לפני פיתוח.

32.10.6 תנאי הקבלה הוא Product/Engineering/Security approval ל־Now roadmap.

32.11 החלטת D29 המפורטת.

32.11.1 Now לאחר Pilot הוא סגירת Pain points שמונעים שימוש בטוח וקבוע ב־WhatsApp Core.

32.11.2 Next מועמדים הם Recurring campaigns, Live billing, richer analytics וחבילת PWA מותנית מלאה, רק לאחר Exit criteria ספציפיים. המונח אינו מניח שקיימת PWA ב־Base; כל אחד מחמשת Sub-gates של PWA נבחר ומוכח בנפרד, ו־Background Sync נשאר כבוי כאשר התמיכה החיה או בשלות המקור אינן מספיקות.

32.11.3 Later מועמדים הם Omnichannel, CRM integrations, enterprise identity ו־advanced AI, לפי ביקוש משלם.

32.11.4 Not planned כרגע כולל Native mobile, arbitrary connector marketplace ו־autonomous high-impact actions.

32.11.5 כל שינוי בסדר דורש Pilot/customer evidence ולא רק Competitor parity.

32.12 משימת Recurring campaigns decision.

32.12.1 Exit criteria כוללים Demand מוכח, Schedule/DST safety, consent refresh, Template/rate policy, cancel semantics ו־support capacity.

32.12.2 Recurrence יוצר Occurrence identity ו־audience snapshot נפרדים; הוא אינו משכפל Campaign ישן בעיוורון.

32.12.3 כל Occurrence עובר Reapproval או Policy מוגדרת לפי Risk/Content drift.

32.12.4 Pilot evidence יקבע אם Feature מתקדם; עד אז D24 נשאר חסום.

32.13 Evidence הוא Customer research, Competitor archive/scorecard, Prioritization worksheet, Decision log, Experiment briefs ו־approved Now roadmap.

32.14 Rollback הוא כיבוי Experiment/Feature לפי Tenant ושמירת מסקנות; Sunk cost אינו סיבה להשאיר Feature ללא Evidence.

32.15 Gate 27 נסגר כאשר כל Roadmap item קשור ל־Evidence, Owner, Budget, Security/privacy review, Exit criteria ו־Rollback.

## 33. שלב 28 — Enterprise, Integrations, Mobile ו־Scale

33.1 מטרת השלב היא להרחיב את Connect רק לאחר ביקוש משלם מוכח, תוך שמירת Tenant isolation, Safety, Reliability ועלות נשלטת.

33.2 זמן משוער לבסיס השלב ללא Native mobile הוא 448–800 שעות עבודה נטו. Native mobile, אם יאושר ב־Gate נפרד, מוסיף 180–360 שעות לפני תחזוקה שוטפת.

33.3 תלות השלב היא Gate 27, Design partners, Pricing evidence, Architecture review ו־Capacity baseline.

33.4 הבעלים הנדרש הוא Product owner; Architecture accountable ו־Owners נפרדים ל־Enterprise identity, Integrations, Mobile ו־Scale/SRE.

33.5 תת־שלב Enterprise foundations, 140–240 שעות.

33.5.1 להגדיר SSO/SAML, SCIM, Domain verification, Session policies ו־Custom roles.

33.5.2 Custom role אינו עוקף System invariants של Tenant, Send approval, Billing, Suppression או Legal Hold.

33.5.3 SCIM create/update/deactivate עובר Organization/domain binding, Idempotency, Ordering ו־Reconciliation.

33.5.4 להוסיף Org hierarchy, Sandbox, Audit export, Access review, Customer-admin controls ו־Enterprise support boundaries.

33.5.5 להשלים Customer security package, DPA/SLA, Subprocessors, Residency positions ו־Incident communication.

33.5.6 Customer-specific retention/encryption policy מותרת רק בתוך Legal/architecture boundaries ולא כ־arbitrary override.

33.5.7 בדיקות כוללות assertion spoof, wrong domain/org, SCIM replay/reorder, role escalation, deprovision ו־break-glass.

33.5.8 Acceptance הוא Design partner ו־Contract need, לא Demo בלבד.

33.6 תת־שלב Integration platform ושני Connectors ראשונים, 140–240 שעות.

33.6.1 להגדיר Connector manifest עם Provider, Version, Data classes, Scopes, Regions, Webhooks, Rate, Retry, Retention, Owner ו־Kill switch.

33.6.2 OAuth/token vault קשור ל־Tenant/Connector/revision; Scope מזערי, Rotation ו־Revocation נבדקים.

33.6.3 Connector אינו קורא Tables core או Secrets של Connector אחר ישירות; הוא עובר Port ו־capabilities.

33.6.4 Inbound webhook מקבל Signature/replay ledger; Outbound callback מקבל SSRF/DNS/IP/redirect/response controls.

33.6.5 Sync ledger שומר Source revision, Cursor, Mapping, Conflict, Replay, Deletion ו־Reconciliation.

33.6.6 Retry לאחר Side effect לא ודאי נשאר אסור בלי Idempotency contract רשמי.

33.6.7 שני Connectors ראשונים נבחרים לפי Paying demand; אין לקבוע HubSpot/Salesforce/Google Sheets מראש ללא Evidence.

33.6.8 כל Connector מקבל Contract, Security, revocation, load ו־rollback Gate נפרד.

33.7 תת־שלב PWA מותנה; ‏80–140 שעות הן ROM היסטורי בלבד ומוחלפות בעלי חבילת 35.8 הקנונית לאחר QA.

33.7.1 React Web responsive הוא ברירת המחדל של Base. ‏PWA מתחילה רק לאחר Trigger ביקוש חתום, Evidence שה־Responsive Web אינו מספיק, Owner, Budget, Privacy/Security review והוכחת מצב disabled קיים.

33.7.2 להגדיר חמישה Scope/Gates נפרדים: Installability; Service-worker fetch/cache; Offline data; Push/Notification; Background sync. גרסת ה־PWA הראשונה, אם תאושר, כוללת לכל היותר Installability, Offline shell סטטי שאינו Authenticated, Cache versioning, atomic update/rollback, Logout clearing ו־minimum-browser matrix; אישור Gate אחד אינו מאשר Gate אחר.

33.7.3 החלטה: בגרסת ה־PWA הראשונה אין offline cache של Session, HTML authenticated, API response, Message, Contact, Knowledge, File, Audit, Billing או כל PII/Business data, ואין Offline mutation או Background side effect. הרחבה עתידית ל־Offline data דורשת חבילת משנה חדשה עם Threat model, הצפנה ומפתחות, TTL, Device risk, remote revocation, conflict/idempotency, Legal/Privacy ו־Gate נפרד; היא אינה נרמזת מאישור Installability.

33.7.4 Push, אם יתווסף, משתמש בפרוטוקול RFC 8030, הצפנת RFC 8291 ו־VAPID לפי RFC 8292, אך Citation אינה Evidence חי. Payload אינו כולל Message body, Phone, Contact name, Tenant name או מידע עסקי/אישי במסך נעילה; הוא מכיל לכל היותר Event class לא־רגיש ו־opaque server lookup handle קצר־חיים, ו־Deep link מאמת מחדש Session, Tenant ו־Capability.

33.7.4.1 ‏`202 Accepted` של Push service נחשב קבלה בלבד ולא Delivery; ‏TTL, expiry, receipt ו־subscription lifecycle נשמרים כ־Facts נפרדים, ו־Unknown אינו מסומן Delivered.

33.7.4.2 ‏VAPID `aud` נקשר ל־Push-service origin המדויק, `exp` מוגבל לפחות מן המקסימום של 24 שעות לפי Threat model, ומפתח VAPID אינו מוחלף בשקט: Rotation יוצר Subscription חדש ומבטל את הישן לאחר מעבר מוכח.

33.7.4.3 Opt-out, permission revoke, session revoke, tenant suspension, user offboarding או incident מבטלים Delivery authority ומפעילים Subscription revocation/reconciliation. Endpoint, authentication secret, private key ו־VAPID private key נשמרים בשרת בלבד ומסווגים בנפרד.

33.7.5 PWA עוברת Accessibility, storage quota, stale service worker, downgrade ו־compromised cache tests.

33.7.6 Acceptance הוא שימוש שטח מוכח, Core journey, exact-origin/scope, Cache/Update/Logout/Revocation, subscription/encryption/VAPID, ‏TTL/receipt/Unknown, Permission/accessibility ו־decommission evidence לפי תת־היכולות שאושרו בלבד, וכן Gate 28.3 נפרד. ‏Offline-conflict או Background-side-effect evidence נדרש רק אם תת־יכולת עתידית זו נפתחה במפורש; הוא אינו Feature parity עם Native ואינו מיובא ל־Gate 30 של Base.

33.8 תת־שלב Scale/Resilience, 88–180 שעות.

33.8.1 לבנות Capacity model מנתוני Pilot: Tenants, Contacts, Messages, Queue age, DB/Index size, Objects, Provider calls ו־Cost.

33.8.2 להטמיע Quotas, Tenant fairness, Backpressure, Noisy-neighbor isolation ו־per-provider caps.

33.8.3 Partitioning, read replica, queue sharding, archival ו־specialized search מתקדמים רק כאשר Bottleneck מדוד מצדיק.

33.8.4 Multi-region אינו יעד אוטומטי; הוא דורש RTO, Residency או Paying demand שמצדיקים Consistency complexity.

33.8.5 אם יאושר Multi-region, להגדיר Single writer/fencing, data ownership, failover, split-brain prevention, webhook routing, KMS, observability ו־cost.

33.8.6 Meta, Clerk, Railway, Vercel, AWS/OpenAI limits נשארים Live inputs ולא Constants.

33.8.7 Acceptance הוא Load/soak/failover שעומד ביעד בלי לפגוע Fairness, Safety או Cost.

33.9 תת־שלב Native mobile conditional, 180–360 שעות.

33.9.1 להתחיל רק כאשר React Web responsive, וגם PWA מאושרת אם היא ישימה לצורך, אינן פותרות Use case Native-only מוכח; סף הביקוש המספרי נשאר `unknown/unavailable` עד Baseline וחתימת Product/Business owner שמיים, ונדרשים Owner, Budget ו־Store plan. טל חותם רק אם ה־Use case משנה את מגבלות WhatsApp/Meta או את מדיניות Connect rate limiting.

33.9.2 לבחור iOS/Android scope וטכנולוגיה ב־ADR נפרד לאחר Prototype, לא מראש במסמך זה.

33.9.3 Token נשמר ב־Secure storage, אין Secret קבוע ב־Bundle ו־offline data מוגבל/מוצפן.

33.9.4 Push אינו חושף Content כברירת מחדל; Device/session revoke ו־minimum version נתמכים.

33.9.5 לבצע OWASP MASVS/MASTG, Store privacy declarations, Accessibility ו־supported OS policy.

33.9.6 Acceptance הוא User evidence ו־security/mobile Gate עצמאי.

33.10 איומי השלב.

33.10.1 SSO/SCIM מעניק Org/Role שגויים.

33.10.2 OAuth token דולף, Connector מבצע SSRF או קורא Tenant אחר.

33.10.3 Sync loop יוצר Duplicate send/delete או conflict שקט.

33.10.4 Split-brain/failover מאבד Idempotency או יוצר שני Writers.

33.10.5 Noisy neighbor, Queue starvation או Cost explosion פוגעים ב־Tenants אחרים.

33.10.6 Mobile cache/push חושף מידע; Data residency claim אינו תואם Subprocessors.

33.11 Evidence הוא Enterprise ADR/tests, Connector manifests/reconciliation, PWA/mobile decisions, Capacity/load/cost curves ו־Failover reports.

33.12 Rollback הוא Disable per Tenant, OAuth revocation, queue stop/reconciliation, PWA service-worker rollback ו־single-writer failback; מסלול אחד אינו עוקף Gate שנכשל במסלול אחר.

33.13 Gate instances של שלב 28.

33.13.1 Gate 28.1 הוא Enterprise identity.

33.13.2 Gate 28.2 נוצר Instance נפרד לכל Connector בתבנית המספרית `28.2.<providerRegistryNumber>.<contractRevisionNumber>`; שני המספרים מוקצים ברשם קנוני, אינם ממוחזרים ואינם נגזרים משם חופשי. מעבר Connector אחד אינו מאשר Connector אחר.

33.13.3 Gate 28.3 הוא PWA conditional בלבד. Responsive Web נסגר ב־Gate 25 וב־Gates ה־Release החלים ואינו מקבל ממנו אישור עקיף ל־PWA.

33.13.4 Gate 28.4.1 הוא Scale/Fairness/Capacity בתוך הטופולוגיה המאושרת.

33.13.5 Gate 28.4.2 הוא Multi-region מותנה ונפרד; הוא אינו נדרש כאשר Region יחיד עומד ב־RPO/RTO/Residency/Capacity.

33.13.6 Gate 28.5 הוא Native mobile מותנה ונפרד לכל Platform/Store scope שאושר, בתבנית המספרית `28.5.<platformRegistryNumber>.<storeScopeRevisionNumber>`; המספרים מוקצים ברשם קנוני ואינם ממוחזרים.

33.13.7 Country instance משתמש בתבנית `27.2.<ISO-3166-1-numeric>`; אין להשתמש בקוד אותיות, בשם מדינה, בשם Connector או בשם Store בתוך Gate ID. Provider, contract revision, platform או country שאינם ידועים יוצרים משימת Discovery חוסמת של עד שמונה שעות, וה־Gate נשאר `blocked-unverified` עד הקצאת המספרים ואישור ה־Scope; אסור ליצור Placeholder או Instance כללי ל־future unknown.

## 34. שלב 0 — Schedule, Critical path, Coverage audit ואישור Master Plan

34.1 מטרת השלב היא להפוך את המסמך למחויבות מדידה, לחשוף כל פער כיסוי ולמנוע אחוז או תאריך שאינם מבוססי Evidence.

34.2 זמן משוער להשלמת המסמך, המטריצות, ה־Reviews והאישור הוא 48–80 שעות עבודה נטו. חלק מן הניסוח בוצע, אך אין לתת Credit סופי לפני ביקורת הכיסוי.

34.3 תלות השלב המסמכית היא ניסוח סעיפים 1–33; תלות הסרת ההקפאה היא אישור טל לפי 34.20.1.

34.4 הבעלים הנדרש הוא Technical program lead; Product, Architecture, Security, Privacy, QA, SRE, UX, Finance וטל מאשרים את התחומים שלהם.

34.5 משימת מודל האומדן.

34.5.1 כל טווח הוא שעות עבודה נטו של אדם מתאים, לא זמן Calendar ולא הבטחה.

34.5.2 אומדן כולל Analysis, Implementation, Tests, Review, Evidence ו־Rollback drill.

34.5.3 המתנה ל־Legal, Meta, OpenAI, AWS, Railway, Vercel, Clerk, Billing, Procurement, DNS, Account owner או Pilot נרשמת בנפרד.

34.5.4 אומדן אינו מניח שכל Engineer יכול להחליף Database, Security, Legal, UX או SRE reviewer.

34.5.5 אם אין נתוני עבר, מוצג Range ולא הסתברות או תאריך מלאכותיים.

34.5.6 לאחר Gates 1 ו־2 מחליפים את ההנחות ב־Throughput אמיתי של הצוות ומחשבים מחדש.

34.5.7 נוסחת גבול תחתון היא `שבועות הנדסה ≥ שעות שנותרו / קיבולת צוות נטו לשבוע`; Dependencies וזמן חיצוני מתווספים.

34.6 סיכום אומדנים עד Closed pilot.

34.6.1 סעיפים 6–17, מקור אמת עד Outbound candidate, הם 511–872 שעות אדם.

34.6.2 סעיפים 18–24, Contacts עד Billing, הם 660–1,104 שעות אדם.

34.6.3 סעיפים 25–31, Admin עד Closed pilot, הם 816–1,368 שעות אדם.

34.6.4 הפעלת Staging חיה של Outbound לאחר Candidate מוסיפה 8–16 שעות.

34.6.5 פרופיל Full-scope pilot שבו גם Flow, AI/Knowledge ו־Billing engineering מלא נדרשים לפני הפתיחה הוא 1,995–3,360 שעות אדם.

34.6.6 בסיס Gross שמרני ל־Core closed pilot שאושר בסעיף 31.3 כולל סעיפים 6–17, ‏18–21, ‏25–31, ‏8–16 שעות להפעלה חיה ו־16–28 שעות מתוך סעיף 24 למסלול Manual entitlement/financial evidence בלבד. סכומו 1,683–2,844 שעות אדם, אך הוא אינו Scope-pure משום שחלק מאומדני השלבים מערבבים משימות Full/Conditional. התאמת החפיפות המחייבת נמצאת ב־34.34.

34.6.7 ההפרש בין Core ל־Full-scope הוא 312–516 שעות: Flow ‏112–184, ‏AI/Knowledge ‏128–216 ויתרת Billing ‏72–116 לאחר הפחתת Slice ה־Pilot הידני. יכולות אלה חייבות Disabled evidence גם כאשר אינן ממומשות ב־Pilot.

34.6.8 שני הטווחים הם Gross וכוללים Review/Rework של עבודה מקומית שלא הוכחה. אין לפרסם Remaining נטו עד Gate 1; רק אז ניתן לזכות קוד קיים לפי משימה, Test ו־Evidence ולא לפי מספר קבצים.

34.6.9 הטווחים אינם כוללים 2–6 שבועות Legal, ‏2–4 שבועות Pilot observation או המתנות Provider/Account שאינן בשליטת Engineering.

34.6.10 לאחר Allocation uncertainty reserve מעטפת Core היא 1,683–3,384 ומעטפת Full-scope pilot היא 1,995–3,900 שעות Gross; אלה אינם Remaining. רק Gate 1 מחליף Reserve ב־Net delta.

34.7 סיכום אומדנים למוצר Best-in-class המתוכנן.

34.7.1 מחקר/Roadmap לאחר Pilot בסעיף 32 הוא 72–120 שעות.

34.7.2 האומדן הישן 448–800 שעות ל־Enterprise, שני Connectors, PWA ו־Scale בוטל: הוא ערבב Capabilities מותנות, הניח PWA בלי WBS עצמאי ולא כיסה את כל מחזור החיים. רק חבילות A05 שעברו QA ולוח A07 רשאים לספק אומדן קנוני.

34.7.3 ביקורת Master Plan, השלמת Registry, DAG, Crosswalks וחתימות בסעיפים 34–35 היא 168–300 שעות לפי WBS של שלב 0; המספר ההיסטורי 48–80 בוטל משום שלא כלל את הרשם בן 18 השדות ואת 36 הממצאים.

34.7.4 בסיס החישוב ההיסטורי ללא Native הוא 2,563–4,360 שעות אדם. הוא Provisional Base 0 ואינו כולל במפורש Recurring campaigns או Net delta שיתגלה ב־Gate 1.

34.7.5 אומדן Scope 4 הישן 2,611–5,044 שעות בוטל: מניין "תשע היכולות המותנות" אינו תואם עוד לרשם החבילות המלא. A05 קובע את חבילות ה־Conditional שנבחרו בנפרד, ו־A07 מחשב זמן רק מן העלים שנכנסו ל־Scope Manifest.

34.7.6 אומדן 460–788 שעות לכל "תשע היכולות" והמעטפת 3,071–5,832 בוטלו. אין לחבר אוטומטית את כל החבילות המותנות, ואין לכלול חבילה במכנה לפני Trigger, Scope Manifest ו־Gate משלה.

34.7.7 אומדן Native הישן 180–360 שעות והמעטפת 3,251–6,192 בוטלו. iOS ו־Android הן חבילות עצמאיות ב־A05; כל אחת מקבלת Discovery, Store/Privacy/Security, Build, Tests, Rollback, Evidence ו־Gate משלה.

34.7.8 המרת האומדנים הישנים לימי אדם בוטלה. A07 ימיר שעות ללוח זמן רק לאחר Capacity Manifest שמי; שעות אדם אינן ימים קלנדריים, ו־External wait נמדד בנפרד.

34.7.9 האומדן אינו Remaining ואינו כולל Maintenance רציף, Support שוטף, שינויי חוק/ספק, Unlimited scale, External waits או Features שטרם קיבלו Requirement.

34.8 תרחישי Calendar שאינם התחייבות.

34.8.1 בקיבולת צוות נטו של 30 שעות בשבוע, Scope 4 דורש Capacity envelope של כ־88–169 שבועות; עם כל Conditional ו־Native כ־109–207 שבועות.

34.8.2 בקיבולת צוות נטו של 60 שעות בשבוע, Scope 4 דורש כ־44–85 שבועות; עם כל Conditional ו־Native כ־55–104 שבועות.

34.8.3 בקיבולת צוות נטו של 90 שעות בשבוע, Scope 4 דורש כ־30–57 שבועות; עם כל Conditional ו־Native כ־37–69 שבועות.

34.8.4 אלה Capacity envelopes בלבד. תחזית Calendar אמיתית משתמשת ב־DAG ובנוסחת 34.10.11 ומוסיפה Dependencies, External waits, Observation ו־Store review שאינם חופפים.

34.8.5 אין להשתמש בתרחיש 90 שעות אם בפועל אין Owners מקבילים בעלי הכישורים המתאימים.

34.8.6 Commitment calendar נקבע רק לאחר זמינות שבועית, חופשות, Support load, Vendor waits ו־Velocity משני Gates.

34.9 סדר הביצוע המחייב.

34.9.1 מסלול 0 הוא סיום סעיף 35, Final QA, סגירת Gate 29 ואישור טל ל־Digest המדויק; עד אז הקפאת הפיתוח נשארת.

34.9.2 מסלול 1 הוא סעיפים 6–8: Inventory, Source of truth, Git/GitHub, Supply chain, RACI וחשבונות.

34.9.3 מסלול 2 הוא סעיפים 9–12: Architecture, Threat model, Infrastructure ו־PostgreSQL isolation.

34.9.4 מסלול 3 הוא סעיפים 13–17: Identity, Meta assets, Webhooks, Rate/capacity ו־one-attempt outbound.

34.9.5 מסלול 4 הוא סעיפים 18–24: Contacts/consent, Templates/media, Campaigns, Inbox, Flow, AI/RAG ו־Billing adapters.

34.9.6 מסלול 5 הוא סעיפים 25–30: Admin, Privacy/Retention, Observability/IR, Backup/BCP, QA/Security ו־Accessibility.

34.9.7 מסלול 6 הוא סעיף 31: Staging, Canary ו־Closed pilot.

34.9.8 מסלול 7 הוא סעיפים 32–33: Evidence-driven roadmap ו־conditional expansion.

34.9.9 סעיף 34 חוזר כ־Coverage/estimate audit בסוף כל Gate ואינו פעולה חד־פעמית.

34.10 Critical path.

34.10.1 סעיפים 34–35 ו־Gate 29 → סעיף 6 ו־Gate 1 → סעיף 7 הם המסלול הראשון; סעיף 8 מתקדם במקביל רק לאחר Inventory ראשוני ובכפוף לכך שה־Freeze הוסר.

34.10.2 Gates 1–3 → סעיפים 9 → 10 → 11 → 12 → Gate 12.1, ולאחריו כל אחד מן ה־instances ‏12.2.1–12.2.6 שהפעולה שלו נמצאת ב־Scope.

34.10.3 סעיף 13 Identity וסעיף 14 Meta יכולים להתקדם במקביל לאחר התשתית, אך סעיף 15 דורש את שניהם.

34.10.4 סעיף 15 Webhook → סעיף 16 live capacity → סעיף 17 trusted outbound.

34.10.5 סעיף 18 Contacts/Consent → סעיף 19 Templates/Media → סעיף 20 Campaigns.

34.10.6 סעיף 21 Inbox יכול להתקדם במקביל לחלק מסעיף 20; סעיף 22 Flow דורש Inbox/Handoff. AI node בתוך Flow דורש Gate 17, אך AI draft/Knowledge שאינו בתוך Flow משתמש במסלול העצמאי של 23.3.

34.10.7 סעיף 24 Billing adapters יכול להתקדם במקביל לסעיפים 20–23 אך Live activation נפרד.

34.10.8 סעיפים 25 Admin, ‏26 Privacy, ‏27 Observability ו־28 Backup יכולים לרוץ במקביל חלקית לאחר Core contracts, אך כולם נדרשים לפני סעיף 29 QA סופי.

34.10.9 סעיף 30 Accessibility מתחיל מוקדם בכל Component, אך Gate נסגר אחרי Critical flows ו־QA.

34.10.10 Gates 20, ‏21.1, ‏21.2 כאשר Delete פעיל, ‏22, ‏23.1, ‏23.2 כאשר נדרש Claim בן 90 יום/GA, ‏24, ‏25, ‏26.0.1 ו־26.0.2 → סעיף 31 → Gate 26.1 → Observation/exit → Gate 26.3 → סעיף 32 ו־Gate 27 → סעיף 33 וכל Gate 28 instance שנבחר → Gate 30 הסופי.

34.10.11 חישוב Calendar מחייב.

34.10.11.1 לפני Gate 29 ליצור DAG נפרד ל־Scope 1, Scope 3 ו־Scope 4, עם Task duration, required role, predecessors, external wait, earliest start, latest safe finish ו־parallelism limit. Gate 1 רשאי לעדכן Actuals ו־Remaining בלבד; הוא אינו רשאי ליצור לראשונה את ה־DAG או לדחות פירוק משימות.

34.10.11.2 נוסחת הגבול היא `Calendar ≥ max(total net hours/team capacity, role bottleneck hours/role capacity, longest dependency path) + non-overlapping external waits + mandatory observation`.

34.10.11.3 לפני Gates 1–2, זמינות תפקידים, Velocity ושיעור Rework הם `unknown/unavailable`; תרחישי 34.8 הם Capacity envelopes בלבד ואינם תחזית Critical-path.

34.10.11.4 Legal, Meta App Review, Account/KYC, DNS, Pentest/Accessibility supplier ו־Pilot observation מקבלים Nodes נפרדים. Wait שאפשר להתחיל במקביל אינו מתווסף פעמיים; Wait שחוסם מסלול מתווסף ל־Longest path.

34.10.11.5 כל Gate מעדכן Actual start/finish, queue time, rework ו־remaining DAG; Commitment date מותר רק לאחר שני Gates עם נתוני Throughput אמיתיים ו־Owners זמינים.

34.11 כללי Parallelization.

34.11.1 לכל Stream Owner ו־Reviewer נפרדים; שני Streams אינם עורכים אותו Boundary file או Migration ללא תיאום.

34.11.2 Database migrations, Auth, Provider send, Retention ו־Release evidence אינם מתחלקים בין Commits תלויים בצורה שיוצרת מצב לא מוגן.

34.11.3 Frontend יכול להתקדם על Contract שאושר, אך UI אינו מסמן פעולה Ready לפני Backend/Gate.

34.11.4 Research/Legal/Account setup מתחילים מוקדם כדי לצמצם המתנה אך אינם מעניקים Runtime activation.

34.11.5 Integration branch גדולה אסורה; כל Slice נשאר קטן, Reversible, Guarded ומקבל Acceptance משלו.

34.11.6 תנאי הקבלה הוא Dependency board ללא שני Owners שמניחים שהאחר סוגר אותה משימה.

34.12 החלטות טכניות שנסגרו על בסיס המחקר.

34.12.1 React/Vercel ל־UI, Railway API/Worker/PostgreSQL/Redis ל־Pilot, עם הפרדת סביבות ושירותים.

34.12.2 WhatsApp Cloud API רשמי בלבד; אין Unofficial library או Web scraping fallback.

34.12.3 Meta limits נגזרים מ־Live evidence; טל הוא Owner ואין Hardcoded unknown limits.

34.12.4 Clerk Organizations עם Membership required, ‏`authorizedParties` exact ו־MFA לכל משתמש אנושי ב־Closed pilot לפי D17-A1.

34.12.5 OpenAI Responses עם `store:false`, Data minimization, Connect-owned CI eval harness ו־Human approval; אין Claim ZDR בלי אישור ואין תלות תפעולית ב־OpenAI Hosted Evals. מקור ה־Deprecation הרשמי שנבדק ב־26.08.2026 קובע Read-only ב־31.10.2026 וסגירה מתוכננת ב־30.11.2026; כל שינוי ב־Timeline מחייב Delta review חדש.

34.12.6 AWS S3 `il-central-1`, Quarantine/Clean/Backup buckets, GuardDuty, Organizations opt-out ו־SSE-KMS CMKs.

34.12.7 PostgreSQL עם Principals נפרדים, RLS ו־`pgvector` ל־Pilot Knowledge רק לאחר Live compatibility proof.

34.12.8 Better Stack דרך OpenTelemetry, כאשר SLO values נקבעים רק אחרי Baseline.

34.12.9 Pilot Billing ידני או חינמי עם `activeProvider=none`; Domain-neutral core תומך ב־Dormant ports. PayPlus primary discovery, Tranzila alternate, Paddle/Stripe dormant, ו־Provider חי יחיד בלבד לאחר Gate.

34.12.10 React Web responsive הוא הנתיב הראשון. PWA היא חבילה מותנית שנפתחת רק לאחר Trigger ו־Gate 28.3; Native נפתח אחריה רק כאשר צורך Native-only מוכח אינו נפתר ב־Responsive Web וגם ב־PWA מאושרת כאשר היא ישימה. Connectors ו־Enterprise נשארים Evidence-driven ולאחר Pilot.

34.13 החלטות חיצוניות שאינן ניתנות לפתרון באמצעות מחקר בלבד.

34.13.1 לרשום ישות משפטית, מורשי חתימה, בעל חשבון כספי ו־Tax advisor.

34.13.2 לרשום Primary ו־Backup שמיים לכל תפקיד בסעיף 8, כולל Security, Privacy, Database, SRE, QA, Support ו־Go/No-Go.

34.13.3 לקבוע Budget amounts בפועל לכל ספק וספי 50%, 75%, 90% ו־100%.

34.13.4 לפתוח ולאשר Accounts/Plans, Regions, Members ו־Credentials ב־GitHub, Railway, Vercel, AWS, Clerk, Meta, OpenAI, Better Stack ו־Billing.

34.13.5 לאשר בכתב שימוש בנכסי Meta של האב, Recipient allowlist ו־Revocation plan, או לבחור Test assets אחרים.

34.13.6 לספק Live Meta rate/quality/template/asset evidence; מספרים אלה תלויים בחשבון ובזמן.

34.13.7 לקבל Legal sign-off ל־Privacy, Consent, Spam, Direct mail, Data transfer, DPA, Retention, Legal Hold, Incident notice, Accessibility ו־Terms.

34.13.8 לקבל Finance/Tax/PCI/Legal decision על PayPlus מול Tranzila ועל Eligibility של Paddle/Stripe אם עדיין נשקלים, לרבות Prices, Currency, VAT, Invoice, Refund, Grace ו־Overage.

34.13.9 לקבוע Pilot participants, Support hours, Success thresholds, Stop thresholds ו־Observation sufficiency לפני פתיחה.

34.13.10 לקבוע SLO, final RPO/RTO ו־Capacity headroom אחרי Baseline חי.

34.13.11 לבחור Pentest supplier ו־Accessibility expert עם Scope, Budget וזמינות.

34.13.12 החלטות אלה מסומנות `external-authority-required`; ההמלצה הטכנית כתובה, אך אין להמציא אישור בשם אדם או ספק.

34.13.13 הרשם הקנוני לכל ההחלטות החיצוניות הוא 34.33 עם X01–X27. רשימה זו היא Summary בלבד; סגירה, Owner, Backup, Deadline, Safe default ו־Evidence נקבעים לפי ה־X record.

34.14 משימת Coverage audit.

34.14.1 למפות כל דרישה משני האפיונים, כולל 83 השאלות הפתוחות, ל־Section, Task, Owner, Status, Test ו־Evidence.

34.14.2 למפות את D01–D30 כהחלטות השאלון, את D31 כהחלטה טכנית משלימה, וכל ADR, Registry, Migration, Runtime boundary, Runbook ו־UI surface.

34.14.3 סטטוס מותר הוא `covered`, `partially covered`, `blocked external`, `explicitly out of scope` או `missing`.

34.14.4 `Out of scope` דורש Reason, Approver ו־Review date; הוא אינו דרך למחוק Requirement קשה.

34.14.5 למפות NIST CSF: Govern, Identify, Protect, Detect, Respond ו־Recover.

34.14.6 למפות NIST SSDF, ASVS, OWASP API/LLM/Mobile, CIS Controls ו־SLSA לכל Task מתאים.

34.14.7 למפות חוק/תקנות פרטיות, תקשורת ונגישות בישראל ל־Legal owner ול־Evidence; Code אינו מוכיח Compliance.

34.14.8 לבצע Freshness audit למקור חיצוני בכל Release מהותי ולשמור Version/checkedAt/Owner.

34.14.9 תנאי הקבלה הוא אפס Requirement, Threat או Decision ללא Mapping או הסבר.

34.15 משימת מסמך הביצוע לכל Slice.

34.15.1 לפני Slice לא ליצור Work package חדש מחוץ לתוכנית, אלא לבחור רשומת־עלה מאושרת מסעיף 35 ולאמת בה במפורש את כל 18 השדות של 35.1.3. שינוי Scope, Path, Dependency, Owner, Estimate, Test, Evidence, Rollback או Gate יוצר Version חדש לפני ביצוע; אין ירושה ואין השלמה בדיעבד.

34.15.2 לבצע Read-only preflight ל־Git status, tracked/untracked, Base commit, conflicts ו־Secrets.

34.15.3 ליישם ב־Clean worktree/branch, Commits אטומיים ו־explicit path staging.

34.15.4 לבצע Self-review, Independent review, Targeted tests, Full gates ו־Clean checkout.

34.15.5 לעדכן Traceability, Risk, Evidence ו־Estimate actual לפני Merge.

34.15.6 Deployment או provider activation דורשים Gate נפרד גם לאחר Merge.

34.15.7 תנאי הקבלה הוא שכל Slice נסגר באותה Evidence schema ולא באמצעות הודעת `done`.

34.16 משימת חישוב התקדמות.

34.16.1 אחוז Engineering מחושב מסך משקל המשימות שנסגרו ב־`הושלם ומוכח`, לא ממספר קבצים או Commits.

34.16.2 אחוז Pilot readiness מחושב רק מהמכנה המפורש 1, ‏2, ‏3, ‏4, ‏5, ‏6.1, ‏6.2, ‏7, ‏8, ‏9, ‏10, ‏11, ‏12.1, ‏12.2.1, ‏12.2.2, ‏12.2.4, ‏13, ‏14.1, ‏15, ‏16, ‏19.1, ‏20, ‏21.1, ‏22, ‏23.1, ‏24, ‏25, ‏26.0.1, ‏26.0.2 ו־26.1. ‏6.3, ‏12.2.3, ‏12.2.5, ‏12.2.6, ‏14.2, ‏17, ‏18.1, ‏18.2, ‏19.2, ‏19.3, ‏21.2 ו־23.2 נכנסים למכנה רק אם היכולת המתאימה נכללה; אחרת נדרש Disabled evidence. אין להשתמש בביטוי העמום 1–26.1.

34.16.3 אחוז Best-in-class מחושב מכל Gate ID או Gate instance קנוני שנכנס ל־GA Scope Manifest בעל Digest ומ־Gate 30 הסופי. כל Connector, Platform, Scale ו־Multi-region instance נספר בנפרד לפי 33.13; אין להשתמש בביטוי העמום 1–28 או להוציא Gate קשה מן המכנה בלי Manifest version חדש.

34.16.4 `הושלם מקומית` מקבל Credit נפרד אך אינו נספר כ־Ready.

34.16.5 External blocked מוצג בנפרד כדי שלא להסתיר עבודה או לתת Credit שגוי.

34.16.6 לאחר Gate 1 יופק Baseline חדש; עד אז האחוז הנוכחי הוא `לא ניתן לקביעה אמינה` ולא מספר מומצא.

34.17 משימת Versioning של התוכנית.

34.17.1 לשמור Version, Date, Base commit, Source checkedAt, Author, Reviewers ו־Digest של המסמך.

34.17.2 שינוי מהותי יוצר Changelog עם Reason, Sections, Estimate delta, Risk delta ו־Approvals.

34.17.3 Evidence היסטורי אינו נמחק; גרסה חדשה מקשרת לקודמת.

34.17.4 דרישה חסרה שהתגלתה מחזירה Freeze למסלול הרלוונטי עד עדכון Plan/Threat/Test.

34.17.5 תנאי הקבלה הוא Reviewer שיכול להסביר מה השתנה בין שתי גרסאות בלי Diff לא־ממוסגר.

34.18 תנאי קבלה למסמך.

34.18.1 כל סעיפים 1–35 וכל שלבי הביצוע 0–28 ממוספרים. כל רשומת־עלה בסעיף 35 כוללת 18/18 שדות מפורשים, פעולה יחידה ועד שמונה שעות. Parent אינו מקבל שעות או Credit, ושום שדה אינו עובר בירושה.

34.18.2 כל P0/P1 תכנוני מופיע ב־34.37 עם Severity, Scope, Owner role, Control, Negative test, Evidence ו־Gate חוסם. לפני Gate 29 מותר מצב `planned-open`; Gate 5 משלים Asset/Exposure validation, ולפני Pilot/GA הסיכון החל חייב להיסגר או היכולת להיות כבויה.

34.18.3 כל החלטה טכנית מקבלת Source/ADR וכל החלטה חיצונית מקבלת Owner/Deadline.

34.18.4 כל אומדן קשור ל־WBS ואינו מוצג כוודאות.

34.18.5 Product, Engineering, Architecture, Security, Privacy/Legal, Database, SRE, QA, UX/Accessibility, Finance ו־WhatsApp safety/Tal מבצעים Review; טל נשאר המאשר הסופי.

34.18.6 טל מאשר במפורש הסרת הקפאת הפיתוח.

34.19 Rollback של התוכנית.

34.19.1 שינוי שלא עבר Review מוחזר לגרסה המאושרת האחרונה באמצעות Version control.

34.19.2 אין למחוק תכנון או Evidence ישנים כדי להציג התקדמות טובה יותר.

34.19.3 אם Source רשמי משתנה, היכולת הרלוונטית נשארת כבויה עד Delta review.

34.20 Gate 29.

34.20.1 Gate 29 נסגר והקפאת הפיתוח מוסרת רק לאחר השלמת 34.18, ‏34.36 וכל סעיף 35, אפס Finding תכנוני P0/P1 פתוח על שלמות התוכנית, Canonical digest תקף, סטטוס `approved` של Product, Engineering, Architecture, Security, Privacy/Legal, Database, SRE, QA, UX/Accessibility, Finance ו־WhatsApp safety, ואישור מפורש של טל ל־Digest המדויק.

34.20.2 Gate 29 יחד עם Gate 1 הם התנאים לפתיחת שלב 7/Stage 2. Approval מאשר ביצוע לפי Slices ו־Gates בלבד; הוא אינו אישור Deploy, שימוש ב־Credential, חיוב, מחיקה או פעולה חיצונית.

34.20.3 כל Gate עתידי יכול להחזיר Freeze למסלול שבו התגלה P0/P1.

34.21 נספח מקורות — Cybersecurity, SDLC ו־Supply chain, נבדק 26.08.2026.

34.21.1 [NIST Cybersecurity Framework 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20).

34.21.2 [NIST SP 800-218 Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final).

34.21.3 [NIST SP 800-61r3 Incident Response](https://csrc.nist.gov/pubs/sp/800/61/r3/final).

34.21.4 [NIST SP 800-207A Zero Trust cloud-native access control](https://csrc.nist.gov/pubs/sp/800/207/a/final).

34.21.5 [NIST AI RMF Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence).

34.21.6 [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/).

34.21.7 [OWASP Top 10](https://owasp.org/Top10/).

34.21.8 [OWASP API Security Top 10](https://owasp.org/www-project-api-security/).

34.21.9 [OWASP GenAI LLM Top 10 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/).

34.21.10 [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html).

34.21.11 [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

34.21.12 [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

34.21.13 [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html).

34.21.14 [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

34.21.15 [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/).

34.21.16 [CIS Controls 8.1](https://www.cisecurity.org/controls).

34.21.17 [SLSA specification](https://slsa.dev/).

34.21.18 [CISA SBOM resources](https://www.cisa.gov/topics/cyber-threats-and-advisories/sbom/sbomresourceslibrary).

34.21.19 [GitHub artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations).

34.21.20 [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

34.21.21 [GitHub CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).

34.21.22 [NIST SP 1326 — Cybersecurity Supply Chain Risk Management Due Diligence Assessment Quick-Start Guide](https://csrc.nist.gov/pubs/sp/1326/final).

34.21.23 [NIST SP 800-161r1 update 1 — Cybersecurity Supply Chain Risk Management](https://csrc.nist.gov/pubs/sp/800/161/r1/upd1/final).

34.21.24 [NIST SP 800-63B-4 — Authenticator and Verifier Requirements](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/).

34.21.25 [CISA Cross-Sector Cybersecurity Performance Goals — Email security, SPF, DKIM and DMARC](https://www.cisa.gov/sites/default/files/2023-03/CISA_CPG_REPORT_v1.0.1_FINAL.pdf).

34.21.26 [CISA Insider Threat Mitigation resources and tools](https://www.cisa.gov/topics/physical-security/insider-threat-mitigation/resources-and-tools).

34.21.27 [NIST Small Business Cybersecurity — Phishing guidance](https://www.nist.gov/itl/smallbusinesscyber/guidance-topic/phishing).

34.21.28 [NIST TN 2276 — Phish Scale User Guide](https://csrc.nist.gov/pubs/tn/2276/final).

34.21.29 [GitHub — Secure use reference for Actions](https://docs.github.com/en/actions/reference/security/secure-use), נבדק 27.08.2026. המקור דורש Full-length commit SHA ל־Action בלתי־משתנה, מזעור `GITHUB_TOKEN`, הפרדת Input לא־מהימן מ־Shell, OIDC במקום Secret ארוך־חיים וביקורת Source; Verified creator או Tag לבדם אינם Immutable proof.

34.21.30 [GitHub — Artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations), נבדק 27.08.2026. Private/internal repository דורש GitHub Enterprise Cloud; Attestation חייבת להיבדק ואינה ערובה שה־Artifact נקי מפגיעויות.

34.21.31 [GitHub — Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) ו־[Available rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), נבדקו 27.08.2026. Ruleset, Push ruleset, bypass actors ו־plan applicability הם Live configuration evidence; Documentation אינה מוכיחה שה־Repository הפרטי מוגן.

34.22 נספח מקורות — ישראל, פרטיות, דיוור ונגישות, נבדק 26.08.2026.

34.22.1 [הרשות להגנת הפרטיות — שאלות ותשובות תיקון 13](https://www.gov.il/he/pages/tikun13_qa?chapterIndex=6).

34.22.2 [תקנות הגנת הפרטיות אבטחת מידע](https://www.gov.il/BlobFolder/generalpage/1files/he/IT2017.pdf).

34.22.3 [כלי DPIA של הרשות להגנת הפרטיות](https://mojforms.justice.gov.il/mojaemprivacyprotectionauthority/dpiaform.html).

34.22.4 [מדריך הרשות ליישום תקנות אבטחת מידע](https://www.gov.il/he/pages/data_security_guide?chapterIndex=16).

34.22.5 [חוק הגנת הפרטיות במאגר הכנסת](https://main.knesset.gov.il/Activity/Legislation/Laws/pages/lawprimary.aspx?lawitemid=2000234).

34.22.6 [תיקון סעיף 30א לחוק התקשורת](https://fs.knesset.gov.il/17/law/17_lsr_299991.pdf).

34.22.7 [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

34.22.8 [הנחיות נגישות אתרי אינטרנט בישראל](https://www.gov.il/he/pages/website_accessibility?chapterIndex=3).

34.22.9 [תקנות התאמות נגישות לשירות](https://www.gov.il/BlobFolder/guide/accommodating_service_providing_rules/he/sitedocs_service_acessibility_regulations.pdf).

34.22.10 [רשות המסים — בקשה לרישום תוכנה המיועדת לניהול מערכת חשבונות ממוחשבת](https://www.gov.il/he/service/registration-software-designed-managing-computerized-accounting-system).

34.22.11 [רשות המסים — חשבוניות ישראל](https://www.gov.il/he/pages/minisite-israel-invoice-200324).

34.22.12 [רשות המסים — איתור מידע במרשם תוכנות לניהול מערכת חשבונות ממוחשבת](https://www.gov.il/he/service/itc-software-registry-for-computerized-accounting-systems).

34.22.13 [הרשות להגנת הפרטיות — גילוי דעת סופי על מינוי ממונה הגנת פרטיות בעקבות תיקון 13](https://www.gov.il/he/pages/amendment-13-26-07-26), פורסם ביולי 2026 ונבדק 27.08.2026. המקור מפרט את מבחני החובה ואת תפקידי ה־DPO; תחולתם העובדתית על Connect נשארת `unknown/unavailable` עד חוות דעת ישראלית שמית.

34.22.14 [הרשות להגנת הפרטיות — רישום מאגר מידע לאחר תיקון 13](https://www.gov.il/he/service/registration_in_the_database), נבדק 27.08.2026. המקור מפריד את חובת הרישום המעודכנת, מסמכי הבקשה, פרטי DPO והוראות המעבר; הוא אינו הוכחה ש־Connect חייבת או פטורה מרישום או מהודעה.

34.22.15 [כלי הפרטיות הרשמי של הרשות](https://mojforms.justice.gov.il/mojaemprivacyprotectionauthority/dpiaform.html), נבדק 27.08.2026. הכלי מרכז בין השאר חובת יידוע לפי סעיף 11, זכויות עיון/תיקון, מבחני DPO, רישום/הודעה, בדיקה שנתית של מידע עודף, תקנה 15, העברות לחו״ל, מידע מה־EEA, דיוור ישיר ו־AI. הוא כלי הכוונה רשמי ולא חוות דעת משפטית או Evidence לתשובה שהוזנה.

34.22.16 [הרשות להגנת הפרטיות — דיוור ישיר ושירותי דיוור ישיר לאחר תיקון 13](https://www.gov.il/BlobFolder/legalinfo/direct_mail_2/he/DirectMail_Tikon13.pdf), נבדק 27.08.2026. תחולת שירות דיוור, רישום המאגר, מטרתו ורישומי מקור/מסירה מוכרעת לכל Operating model על ידי Legal ואינה נבלעת אוטומטית ב־WhatsApp opt-in או בסעיף 30א.

34.23 נספח מקורות — OpenAI ו־AI, נבדק 26.08.2026.

34.23.1 [OpenAI model catalog](https://developers.openai.com/api/docs/models).

34.23.2 [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna).

34.23.3 [OpenAI model selection guidance](https://developers.openai.com/api/docs/guides/latest-model).

34.23.4 [OpenAI Data controls](https://developers.openai.com/api/docs/guides/your-data).

34.23.5 [OpenAI Evals deprecation timeline](https://developers.openai.com/api/docs/deprecations).

34.23.6 [OpenAI Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices).

34.23.7 [OpenAI Responses create reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).

34.23.8 [OpenAI migration example from Evals to Promptfoo](https://developers.openai.com/cookbook/examples/evaluation/moving-from-openai-evals-to-promptfoo) נשמר כדוגמת Migration היסטורית בלבד; הוא אינו קובע את כלי ה־Evaluation של Connect ואינו מחליף Connect-owned harness או Supply-chain review.

34.23.9 [OpenAI — Data controls](https://developers.openai.com/api/docs/guides/your-data), נבדק 27.08.2026. ‏Responses foreground עם `store:false` אינו ZDR: Abuse-monitoring logs נשמרים כברירת מחדל עד 30 יום; ZDR/MAM דורשים Eligibility ואישור; Eyes Off/Safety Retention ושינוי Model eligibility הם חריגים מתועדים. ‏Background עשוי להשתמש בדיסק לכעשר דקות, Prompt caching עשוי לשמור Application state עד 24 שעות, ו־Image/File input חשוד עשוי להישמר לבדיקת אדם גם תחת Data controls.

34.23.10 [OpenAI — Projects Admin API](https://developers.openai.com/api/reference/typescript/resources/admin/subresources/organization/subresources/projects), נבדק 27.08.2026. המקור מתעד Project data retention, Hosted-tool permissions, Model allowlist/denylist, per-model rate limits, Service accounts/API-key metadata, Spend alerts ו־hard Spend limit. תיעוד Endpoint אינו מוכיח Plan entitlement או מצב חשבון Connect; נדרש Export חי חתום ומושחר, וה־Admin key אינו נכנס ל־Runtime או ל־Evidence.

34.23.11 [OpenAI — Retrieve model](https://developers.openai.com/api/reference/typescript/resources/models/methods/retrieve) ו־[Responses create](https://developers.openai.com/api/reference/cli/resources/responses/methods/create), נבדקו 27.08.2026. Model record עשוי לכלול `shutdown_date`; ערך `null` אינו התחייבות שאין Deprecation. ‏Request contract מתעד `store`, ‏`background`, ‏`safety_identifier`, ‏`max_tool_calls` ו־encrypted reasoning continuation, אך Connect מאשרת ב־Pilot רק foreground text Responses עם `store:false` וללא Tools.

34.24 נספח מקורות — Meta ו־WhatsApp, נבדק לאחרונה 27.08.2026.

34.24.1 [Meta official WhatsApp Business Platform Postman workspace](https://www.postman.com/meta/whatsapp-business-platform/overview/) ו־[Cloud API documentation העדכני](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).

34.24.2 [Meta official WhatsApp webhooks collection](https://www.postman.com/meta/whatsapp-business-platform/folder/lboq68h/webhooks).

34.24.3 [Meta-hosted WhatsApp webhook signature reference](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/).

34.24.4 [WhatsApp Developer Hub](https://whatsappbusiness.com/developers/developer-hub/).

34.24.5 [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/). המקור מחייב Phone number ו־Opt-in, כיבוד Opt-out, ‏Template מאושרת לשיחה יזומה ומחוץ לחלון 24 השעות, ומסלול Human escalation ברור וישיר כאשר משתמשים ב־Automation; הוא גם מזהיר ש־Quality נמוכה או Feedback שלילי עלולים להגביל או להסיר גישה.

34.24.6 [WhatsApp legal](https://www.whatsapp.com/legal/).

34.24.7 [Meta Terms for WhatsApp Business](https://www.whatsapp.com/legal/meta-terms-whatsapp-business).

34.24.8 [Meta article on business chats, marketing and user control](https://about.fb.com/news/2025/04/ways-to-manage-your-businesses-chats-on-whatsapp/).

34.24.9 [Meta official Embedded Signup documentation](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup).

34.24.10 [WhatsApp Business Platform pricing](https://whatsappbusiness.com/products/platform-pricing/).

34.24.11 [WhatsApp Business Solution Terms — AI Providers and Third Party Service Providers](https://www.whatsapp.com/legal/business-solution-terms).

34.24.12 [WhatsApp Business Platform Onboarding resource](https://whatsappbusiness.com/resources/resource-library/api-onboarding/). המסלול הישן 1,000→10,000→100,000→Unlimited נשמר כ־Historical guidance בלבד; מסמך Messaging Limits המעודכן ב־34.24.26 גובר ומגדיר Portfolio-level ‏250→2,000→10,000→100,000→Unlimited. אף רצף אינו Account entitlement ללא Live field.

34.24.13 [WhatsApp official Onboarding guide, 2026](https://whatsappbusiness.com/wp-content/uploads/2026/04/Onboarding-to-the-WhatsApp-Business-Platform.pdf). ההתחלה המתוארת של 1,000 נשמרת כ־dated guidance שסותר/קודם למסמך Messaging Limits המעודכן; אין להשתמש בה ל־UI, Permit או Estimate. מקור האמת הוא המסמך החדש וה־Live field של הנכס המדויק.

34.24.14 [WhatsApp official Best Practices for Marketing Messages, 2026](https://whatsappbusiness.com/wp-content/uploads/2026/04/Best-Practices-for-Marketing-Messages-on-WhatsApp-.pdf). Quality, Template pause/disable ו־Messaging limits הם Signals נפרדים ואינם Limit יחיד.

34.24.15 [WhatsApp Business Terms for Service Providers](https://www.whatsapp.com/legal/business-terms-for-service-providers), עודכנו לאחרונה 12.06.2018 ונבדקו 27.08.2026. התנאים חלים רק אם WhatsApp מאשרת לספק לפרוס את ה־Business Solution עבור לקוחות; אין להסיק מכאן ש־Connect כבר מורשית או מסווגת כך.

34.24.16 [Meta Terms for WhatsApp Business](https://www.whatsapp.com/legal/meta-terms-whatsapp-business), עודכנו לאחרונה 15.10.2025 ונבדקו 27.08.2026. המקור מגדיר WABA ו־Meta Business Manager, מפנה לתנאי Service Provider כאשר ספק מורשה ניגש ל־API עבור לקוחות, קובע סדר עדיפות בין התנאים ומבהיר ש־Rate card עשוי להשתנות.

34.24.17 [WhatsApp Legal root](https://www.whatsapp.com/legal/) ו־[Platform preview landing](https://www.facebook.com/legal/wa-for-business-terms-preview) מאמתים כי חוזים חדשים ל־WhatsApp Business Platform ייכנסו לתוקף ב־23.09.2026. נוסחי ה־Preview הרשמיים נלכדו בהצלחה ב־27.08.2026; הם נשמרים כמקורות עתידיים נפרדים ואינם מחליפים Account acceptance או Legal review.

34.24.18 [Terms of Service for Use of Third Party Agents](https://www.whatsapp.com/legal/third-party-agents-terms), עודכנו 25.08.2026. לפי הטקסט הרשמי הם חלים על משתמש שבוחר Agent דרך `3P Platform` של WhatsApp, ולא מוכיחים כשלעצמם תחולה על Bot עסקי דרך Cloud API. תחולה עתידית על Connect דורשת Legal/Meta classification נפרד; אין לערבבם אוטומטית עם Business Solution Terms.

34.24.19 [Meta Terms for WhatsApp Business Platform preview](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform-preview), ‏Last Updated/Effective ‏23.09.2026, נלכד 27.08.2026. הוא מגדיר Solution Provider, ‏Messaging Account, Account security, Rate Card, ‏Prohibited Information, ‏AI-provider restrictions, deletion/return, no archive/backup, reporting ו־termination.

34.24.20 [WhatsApp Business Platform Cloud API Terms preview](https://www.facebook.com/legal/WhatsApp-Business-Platform-Cloud-API-preview), ‏Last Updated/Effective ‏23.09.2026, נלכד 27.08.2026. הוא כולל Company Personal Data, ‏Controller/Processor split, DPT, ‏90-day deletion/return ו־Subprocessor exhibit.

34.24.21 [Marketing Messages API for WhatsApp Terms preview](https://www.facebook.com/legal/marketing-messages-API-for-WhatsApp-preview), ‏Last Updated/Effective ‏23.09.2026, נלכד 27.08.2026. המוצר הוא One-way Marketing service נפרד, עם Partner/Client duties, Matching, Event-sharing controls, Optimization-model uses, Opt-in/Opt-out ו־Geo restrictions; הוא כבוי ב־Pilot.

34.24.22 [WhatsApp Terms for WhatsApp Business Platform preview](https://www.whatsapp.com/legal/WhatsApp-Terms-for-WhatsApp-Business-Platform/preview), ‏Effective ‏23.09.2026, נלכד 27.08.2026. המקור מחייב Privacy notice, Marketing label, Opt-out, מתעד Feedback/complaints, Global processing, Suspension ו־90-day account-data retention.

34.24.23 [Inbox in Meta Business Suite Terms for WhatsApp preview](https://www.facebook.com/legal/whatsapp_inbox_terms_preview), ‏Last Updated/Effective ‏23.09.2026, נלכד 27.08.2026. המקור חל רק על שימוש ב־Meta Inbox; Connect אינו משתמש בו ב־Base והוא נשאר `disabled/not-applicable` עד החלטה נפרדת.

34.24.24 [About the WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform), עודכן 04.08.2026 ונבדק 27.08.2026. זהו מקור ה־Overview הקנוני ל־Cloud API, Accounts, Permissions, Rate limits, Pair behavior, Webhooks ו־Security.

34.24.25 [Throughput](https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput), עודכן 17.06.2026 ונבדק 27.08.2026. המקור מתעד 80/1,000/20 mps, ‏eligibility, ‏130429/131057, ‏Webhook capacity/latency ו־Live throughput field.

34.24.26 [Messaging Limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits), עודכן 21.05.2026 ונבדק 27.08.2026. המקור מתעד Portfolio-level tiers ‏250/2,000/10,000/100,000/Unlimited ואת `whatsapp_business_manager_messaging_limit` כמקור החי.

34.24.27 [Template quality](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-quality) ו־[Template pacing](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-pacing), עודכנו 17.06.2026 ו־21.05.2026. הם מתעדים Quality enums, ‏UNKNOWN, ‏held-for-assessment, ‏Pause/Drop ו־`132015`, אך אינם מפרסמים את סף ה־Pacing.

34.24.28 [Per-user marketing template limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits), עודכן 17.06.2026. המקור מתעד Dynamic engagement limit, ‏US marketing non-delivery, ‏131049/24-hour wait ו־131050 opt-out.

34.24.29 [Webhook overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview) ו־[Create webhook endpoint](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint), עודכנו 26.06.2026 ו־17.06.2026. הם מתעדים TLS, ‏mTLS, ‏HMAC-SHA256, 3MB, Batch 1,000, Duplicate retry עד שבעה ימים ואימות Challenge.

34.24.30 [Send messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages), עודכן 21.05.2026. המקור מבדיל API acceptance מ־Delivery, מתעד חלון 24 שעות, Quality signals, סדר Delivery שאינו מובטח ו־TTL של 30 ימים לרוב ההודעות מול 10 דקות ל־Authentication templates.

34.24.31 [WhatsApp Business Platform error codes](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes), עודכן 18.06.2026. מקור זה הוא Taxonomy הקנוני ל־Retry/Stop/Policy classification; HTTP status ו־Subcode לבדם אינם קובעים פעולה.

34.24.32 [Graph API rate limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting) מתעד `X-App-Usage`, ‏`X-Business-Use-Case-Usage`, ‏rolling-window semantics ו־CPU/total-time pressure. ‏WhatsApp-specific limits מ־34.24.24–31 גוברים כאשר הם מצומצמים יותר.

34.25 נספח מקורות — Infrastructure, Database, Identity ו־Storage, נבדק 26.08.2026.

34.25.1 [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

34.25.2 [Railway private networking](https://docs.railway.com/networking/private-networking).

34.25.3 [Railway Redis](https://docs.railway.com/databases/redis).

34.25.4 [Railway PostgreSQL backups and restores](https://docs.railway.com/guides/postgres-backups-restores).

34.25.5 [Railway access](https://docs.railway.com/access).

34.25.6 [Railway compliance](https://docs.railway.com/enterprise/compliance).

34.25.7 [Vercel deployment protection](https://vercel.com/docs/deployment-protection).

34.25.8 [Vercel environments](https://vercel.com/docs/deployments/environments).

34.25.9 [Vercel environment variables](https://vercel.com/docs/environment-variables).

34.25.10 [Vercel security and compliance](https://vercel.com/docs/security/compliance).

34.25.11 [Clerk invitations](https://clerk.com/docs/guides/organizations/add-members/invitations).

34.25.12 [Clerk session tasks and MFA](https://clerk.com/docs/guides/configure/session-tasks).

34.25.13 [Clerk session tokens](https://clerk.com/docs/guides/sessions/session-tokens).

34.25.14 [GuardDuty Malware Protection for S3](https://docs.aws.amazon.com/guardduty/latest/ug/gdu-malware-protection-s3.html).

34.25.15 [GuardDuty data-use opt-out](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-opting-out-using-data.html).

34.25.16 [GuardDuty S3 scan monitoring](https://docs.aws.amazon.com/guardduty/latest/ug/monitoring-malware-protection-s3-scans-gdu.html).

34.25.17 [S3 default encryption and SSE-KMS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html).

34.25.18 [S3 security best practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html).

34.25.19 [pgvector primary repository and documentation](https://github.com/pgvector/pgvector).

34.25.20 [Vercel OpenID Connect federation](https://vercel.com/docs/oidc).

34.25.21 [Clerk production deployment and authorizedParties](https://clerk.com/docs/guides/development/deployment/production).

34.25.22 [Clerk Organizations](https://clerk.com/docs/guides/organizations/overview).

34.25.23 [Railway PostgreSQL](https://docs.railway.com/databases/postgresql).

34.25.24 [Amazon S3 data encryption](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryption.html).

34.25.25 [AWS KMS best practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-kms-best-practices/introduction.html).

34.25.26 [Railway deployment regions](https://docs.railway.com/deployments/regions).

34.25.27 [Railway databases and unmanaged responsibilities](https://docs.railway.com/databases).

34.25.28 [Railway volume backup schedules and limitations](https://docs.railway.com/volumes/backups).

34.25.29 [Railway PostgreSQL backup, PITR and logical restore guide](https://docs.railway.com/guides/postgres-backups-restores).

34.25.30 [Cloudflare D1 Wrangler commands — export syntax and operational behavior](https://developers.cloudflare.com/d1/wrangler-commands/).

34.25.31 [Cloudflare D1 import/export best practices — SQL format, virtual tables and numeric precision](https://developers.cloudflare.com/d1/best-practices/import-export-data/).

34.25.32 [W3C Service Workers — lifecycle, fetch interception, cache and security considerations](https://www.w3.org/TR/service-workers/). זהו Living/Nightly specification; יש להצמיד Snapshot ו־Browser matrix לפני Gate 28.3, והוא אינו מוכיח ש־Runtime קיים או נתמך.

34.25.33 [W3C Web Application Manifest, Working Draft 07.05.2026](https://www.w3.org/TR/appmanifest/). Scope, off-scope navigation, spoofing, URL/Unicode, ‏`data:` manifest, הרשאות ופרטיות דורשים בדיקות Connect עצמאיות.

34.25.34 [W3C Push API, Working Draft 01.12.2025](https://www.w3.org/TR/push-api/). הצפנת Payload אינה מסתירה מן Push service את Metadata של זמן, תדירות וגודל ואינה מחליפה Permission, Subscription revocation או Data minimization.

34.25.35 [W3C Privacy Principles — Notifications and interruptions](https://www.w3.org/TR/privacy-principles/). בקשת Notification תופיע רק בהקשר שהמשתמש מבין, עבור מידע שביקש במפורש ועם דרך קלה לבטל.

34.25.36 [RFC 8030 — Generic Event Delivery Using HTTP Push](https://www.rfc-editor.org/rfc/rfc8030.html). ‏Push delivery הוא מסלול Store-and-forward נפרד: TTL חובה, ‏`202 Accepted` אינו הוכחת Delivery, Subscription עשויה לפוג בכל עת ו־Receipt דורש Reconciliation מפורש.

34.25.37 [RFC 8291 — Message Encryption for Web Push](https://www.rfc-editor.org/rfc/rfc8291.html). ‏Payload מוצפן ב־`aes128gcm`, אין Content encoding חלופי או דחיסה, מפתחות P-256 דורשים Validation, ו־Timing/Length/Subscription metadata אינם מוסתרים מן Push service.

34.25.38 [RFC 8292 — VAPID for Web Push](https://www.rfc-editor.org/rfc/rfc8292.html). ‏JWT קושר `aud` ל־Push-service origin, ‏`exp` אינו מעבר ל־24 שעות, Restricted subscription קושרת את המפתח, והחלפת Signing key מחייבת Subscription חדש ומעבר מבוקר.

34.25.39 [AWS — Supportability of Amazon S3 features in GuardDuty Malware Protection for S3](https://docs.aws.amazon.com/guardduty/latest/ug/supported-s3-features-malware-protection-s3.html), נבדק 27.08.2026. המקור מאמת Version-specific scans, סדר Scan שאינו מובטח, SSE-KMS/CMK ו־Object Lock support, וכן מגבלות Storage class/client-side encryption; Account/Region/Quota חיים עדיין דורשים Probe.

34.25.40 [AWS — How Malware Protection for S3 works](https://docs.aws.amazon.com/guardduty/latest/ug/how-malware-protection-for-s3-gdu-works.html), נבדק 27.08.2026. Event delivery הוא At-least-once, ולכן Duplicate/out-of-order handling ו־Reconciliation הם דרישת בטיחות ולא Optimization.

34.25.41 [AWS — GuardDuty malware detection scan engine](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-malware-detection-scan-engine.html), נבדק 27.08.2026. זהו File-based detection ולא Behavioral execution; Verdict נקי אינו מאשר Parser, active content או Knowledge semantics.

34.25.42 [AWS — S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html) ו־[Object Lock considerations](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html), נבדקו 27.08.2026. המקורות מאמתים Version-scoped WORM, Delete-marker behavior, Governance bypass permission/header, Compliance immutability, Legal hold והצורך ב־Versioning; החלטת mode/retention של Connect נשארת חסומה ל־Legal ול־live drill.

34.25.43 [Clerk — How Clerk works](https://clerk.com/docs/guides/how-clerk-works/overview), עודכן 21.08.2026 ונבדק 27.08.2026. המקור מתעד `__client` בצד FAPI לעומת `__session` בן כ־60 שניות, JavaScript-readable ו־SameSite Lax בצד האפליקציה; Connect אינו מסיק מכך HttpOnly או הגנת XSS מלאה.

34.25.44 [Clerk — CSRF protection](https://clerk.com/docs/guides/secure/best-practices/csrf-protection), עודכן 21.08.2026 ונבדק 27.08.2026. ‏SameSite Lax מונע משפחות בקשה מסוימות אך מאפשר Cookie בניווט Top-level; אין Mutation ב־navigation/GET, ו־Connect מוסיפה session/origin/CSRF/request-binding controls.

34.25.45 [Vercel — Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation), עודכן 28.01.2026 ונבדק 27.08.2026. המקור מתעד Project-wide secret שיכול לעקוף Deployment Protection, system mitigations ו־Bot challenges, Header/Query/Cookie modes ו־redeploy בעת rotation. ‏Connect אוסרת Query/Cookie ומעדיפה Trusted Sources OIDC.

34.25.46 [Vercel — Deployment Protection](https://vercel.com/docs/deployment-protection), עודכן 07.01.2026 ונבדק 27.08.2026. ‏Standard אינו מגן על Production domain; ‏All Deployments, Exceptions, Trusted IP ו־Plans מקבלים Live entitlement export ובדיקות נפרדות.

34.25.47 [Vercel — Trusted Sources](https://vercel.com/changelog/trusted-sources-for-deployment-protection) ו־[External API OIDC validation](https://vercel.com/docs/oidc/api), נבדקו 27.08.2026. אלה שני מסלולים נפרדים: OIDC ל־Deployment Protection מול OIDC workload ל־Railway; אין להחליף Header, Issuer, Audience, Subject או Environment ביניהם.

34.25.48 [AWS — Amazon SES simplified SMTP through Mail Manager](https://aws.amazon.com/about-aws/whats-new/2026/07/amazon-ses-simplified-smtp-mail-manager/), ‏[SES Regions](https://docs.aws.amazon.com/ses/latest/dg/regions.html), ‏[Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html) ו־[SES quotas](https://docs.aws.amazon.com/ses/latest/dg/quotas.html), נבדקו 27.08.2026. הודעת 24.07.2026 מתעדת SMTP guided setup דרך Mail Manager בכל Region שבו SES זמין, ולכן היא מבטלת את הטענה הרחבה ש־SMTP אינו אפשרי ב־`il-central-1`; היא אינה מוכיחה שקיים Classic SES SMTP endpoint באזור או שה־Account של Connect זכאי. ‏Connect בוחרת HTTPS API בלבד. Sandbox/production access, identity, Easy DKIM, quota, suppression ו־feedback/events הם Region-specific ונבדקים חיים באותו Account+Region+Environment.

34.25.49 [Railway — Redis](https://docs.railway.com/databases/redis), ‏[Private networking](https://docs.railway.com/networking/private-networking) ו־[How private networking works](https://docs.railway.com/networking/private-networking/how-it-works), נבדקו 27.08.2026. Redis נוצר Private כברירת מחדל, Public Access יוצר TCP Proxy ו־`REDIS_PUBLIC_URL`, וה־Template הוא Unmanaged. ‏Private traffic מוצפן ב־WireGuard ומבודד לפי Project+Environment, אך אינו זמין ב־Build ואינו מחליף Redis authentication/ACL. ‏Redis HA עם Sentinel/HAProxy מתועד כ־Capability, לא כ־live entitlement או RTO proof.

34.25.50 [Railway — Volume backups](https://docs.railway.com/volumes/backups), ‏[Volumes](https://docs.railway.com/volumes) ו־[Production readiness checklist](https://docs.railway.com/overview/production-readiness-checklist), נבדקו 27.08.2026. Volume backup עשוי להימחק עם Wipe, Restore מוגבל לאותו Project+Environment ומחליף Mount; Manual backup מוגבל ל־50% Volume. לכן Redis backup אינו Source-of-truth, Cross-environment DR או Ransomware isolation.

34.25.51 [BullMQ — Going to production](https://docs.bullmq.io/guide/going-to-production), ‏[Connections](https://docs.bullmq.io/guide/connections), ‏[Graceful shutdown](https://docs.bullmq.io/guide/workers/graceful-shutdown) ו־[Stalled jobs](https://docs.bullmq.io/guide/workers/stalled-jobs), נבדקו 27.08.2026. המקורות דורשים `noeviction`, ממליצים AOF, מפרידים Producer fail-fast מ־Worker reconnect, מתעדים `maxRetriesPerRequest=null` ל־Worker ואת הצורך ב־graceful close, ומבהירים ש־Stall עלול להחזיר Job לביצוע נוסף. Job payload נשמר Cleartext ב־Redis ולכן Connect אוסרת בו PII.

34.25.52 [BullMQ — Retrying failing jobs](https://docs.bullmq.io/guide/retrying-failing-jobs), ‏[Idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs), ‏[Deduplication](https://docs.bullmq.io/guide/jobs/deduplication), ‏[Job IDs](https://docs.bullmq.io/guide/jobs/job-ids) ו־[Auto-removal](https://docs.bullmq.io/guide/queues/auto-removal-of-jobs), נבדקו 27.08.2026. Dedup/Job ID חדלים להגן לאחר מחיקה, Auto-removal פועל Lazily ו־BullMQ מספקת at-least-once. לפיכך מניעת Side effect כפול נשענת על PostgreSQL operation/receipt ledger ולא על קיום Key ב־Redis.

34.25.53 [Redis — Security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/), ‏[ACL](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/), ‏[TLS](https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/), ‏[Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/), ‏[Key eviction](https://redis.io/docs/latest/develop/reference/eviction/) ו־[Security advisories](https://github.com/redis/redis/security/advisories), נבדקו 27.08.2026. Redis מיועד ל־trusted environment ואסור לחשיפה ישירה; AOF every-second עשוי לאבד בקירוב שנייה; `noeviction` מחזיר Write error במקום למחוק Keys; ACL הוא הנתיב המועדף. Advisory snapshot כולל תיקוני RCE ב־Redis 8.2.6, אך Release חי ו־digest נבדקים מחדש לפני כל Deploy.

34.26 נספח מקורות — Billing, Observability ו־SRE, נבדק 26.08.2026.

34.26.1 [Paddle webhook signature verification](https://developer.paddle.com/webhooks/about/signature-verification/).

34.26.2 [Paddle for SaaS](https://developer.paddle.com/get-started/how-paddle-works/saas/).

34.26.3 [Stripe webhooks](https://docs.stripe.com/webhooks?lang=node).

34.26.4 [PCI DSS document library](https://www.pcisecuritystandards.org/document_library/?class=pcidss&doc=pci_dss).

34.26.5 [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/).

34.26.6 [Google SRE Service Level Objectives](https://sre.google/sre-book/service-level-objectives/).

34.26.7 [Google SRE production service best practices](https://sre.google/sre-book/service-best-practices/).

34.26.8 [PayPlus REST API environments](https://docs.payplus.co.il/reference/payplus-rest-api-urls).

34.26.9 [PayPlus server-side Website/App integration](https://docs.payplus.co.il/reference/website-or-app).

34.26.10 [PayPlus request-validation guidance](https://docs.payplus.co.il/reference/validate-requests-received-from-payplus). מקור זה מתעד דוגמה בלבד ואינו מוכיח Raw-byte framing, Timing-safe comparison, Replay defense או Live parity.

34.26.11 [Tranzila API](https://docs.tranzila.com/docs/payments-and-billing/tranzila-api).

34.26.12 [Tranzila authentication](https://docs.tranzila.com/docs/payments-and-billing/authentication). כל דוגמה שמכבה TLS peer או hostname verification אסורה ב־Connect.

34.26.13 [Paddle Acceptable Use Policy limitations](https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle) ו־[Stripe global availability](https://stripe.com/global). מקורות אלה מסבירים מדוע שני הספקים Dormant; הם אינם Eligibility או Account evidence.

34.26.14 [PayPlus — Validate requests received from PayPlus](https://docs.payplus.co.il/reference/validate-requests-received-from-payplus), נבדק 27.08.2026. הדוגמה משתמשת ב־JSON reserialization, ‏HMAC-SHA256, ‏User-Agent והשוואת String רגילה; היא אינה לבדה Raw-byte, timing-safe, replay-resistant או live-contract proof.

34.26.15 [PayPlus — Payment Pages](https://docs.payplus.co.il/reference/payment-pages) ו־[Generate Payment Link](https://docs.payplus.co.il/reference/post_paymentpages-generatelink), נבדקו 27.08.2026. Hosted page/Token/Recurring הן Capabilities מועמדות ותלויות Account/terminal/permission; הן עשויות לצמצם PCI scope ואינן אישור Compliance או Entitlement.

34.26.16 [Tranzila — Handshake V2](https://docs.tranzila.com/docs/payments-and-billing/handshake-v2) ו־[STO API](https://docs.tranzila.com/docs/payments-and-billing/sto-api-for-my-billing), נבדקו 27.08.2026. המקורות מתעדים Server-only HMAC request profile, Nonce בן 40 bytes, Handshake בן כ־20 דקות, Module/terminal prerequisites ו־Notifications; הם אינם מוכיחים Notification signature או Live account capability.

34.26.17 [Better Stack — Billing for metrics](https://betterstack.com/docs/logs/billing-for-metrics/) ו־[Create a source](https://betterstack.com/docs/logs/api/create-a-source/), נבדקו 27.08.2026. חשבונות ו־Sources חדשים מ־2026 מחויבים לפי retained uncompressed metric data; Source מושהה ממשיך להופיע ב־Usage עד תפוגת Retention. ‏Germany/`eu-nbg-2`, ‏logs retention ו־metrics retention הם Source fields, אך Documentation אינה מוכיחה את Plan, Region, price model או Retention החיים בחשבון Connect.

34.26.18 [Better Stack — Escalation policies](https://betterstack.com/docs/uptime/escalation-policies/) ו־[Backup on-call schedule](https://betterstack.com/docs/uptime/creating-a-backup-oncall-schedule/), נבדקו 27.08.2026. Policy שנוצרה אינה מוקצית מעצמה ל־Monitor/Heartbeat/Integration; ללא Assignment מפורש עלול לפעול simple escalation. ‏Connect דורשת Assignment coverage, Primary+Backup, fallback ותרגיל unacknowledged לכל Signal קריטי.

34.26.19 [Better Stack — Incident lifecycle](https://betterstack.com/docs/uptime/working-with-incidents/) ו־[Incident metadata](https://betterstack.com/docs/uptime/incident-metadata/), נבדקו 27.08.2026. Acknowledgement עוצר Escalations ו־Metadata עשוי להשפיע על Status-page presentation; לכן Ack אינו Containment, ו־Customer status אינו מתפרסם או נסגר אוטומטית ללא Incident-command approval.

34.27 נספח מקורות — מתחרים, נבדק 26.08.2026.

34.27.1 [respond.io Team Inbox](https://respond.io/team-inbox).

34.27.2 [WATI Multi-channel Team Inbox](https://support.wati.io/en/articles/11463002-how-to-use-the-multi-channel-team-inbox-in-wati).

34.27.3 [WATI Ask and Agents](https://support.wati.io/en/articles/16527975-how-to-use-ask-and-agents-in-wati-ai).

34.27.4 [SleekFlow product help](https://help.sleekflow.io/en_US/getting-started/welcome-to-sleekflow).

34.27.5 [Trengo AI help](https://help.trengo.com/category/trengo-ai).

34.27.6 [Intercom](https://www.intercom.com/).

34.27.7 [Zendesk](https://www.zendesk.com/).

34.27.8 [HubSpot Service Hub](https://www.hubspot.com/products/service).

34.27.9 [Twilio WhatsApp documentation](https://www.twilio.com/docs/whatsapp).

34.27.10 [respond.io Mobile App Overview — מטריצת Web מול Mobile](https://respond.io/help/mobile-app/mobile-app-overview). מקור Product-help זה גובר על ניסוח שיווקי לצורך זמינות Module, אך Trial באותה גרסה עדיין נדרש.

34.27.11 [WATI overview](https://support.wati.io/en/articles/11375155-wati-overview-features-channels-and-integrations) ו־[WATI Ask and Agents](https://support.wati.io/en/articles/16527975-how-to-use-ask-and-agents-in-wati-ai).

34.27.12 [SleekFlow platform overview](https://help.sleekflow.io/en_US/getting-started/welcome-to-sleekflow), ‏[SleekFlow AI](https://help.sleekflow.io/en_US/sleekflow_ai) ו־[SleekFlow Inbox](https://help.sleekflow.io/en_US/getting-started-with-sleekflow-inbox).

34.27.13 [Trengo AI](https://help.trengo.com/category/trengo-ai), ‏[Trengo Help Center feature map](https://help.trengo.com/) ו־[Trengo WhatsApp Coexistence](https://help.trengo.com/article/whatsapp-coexistence---use-the-whatsapp-business-app-and-trengo-together).

34.27.14 [Intercom Fin on WhatsApp](https://www.intercom.com/help/en/articles/8286630-deploy-fin-ai-agent-over-chat), ‏[Intercom Bot inbox](https://www.intercom.com/help/en/articles/3722087-turn-on-the-bot-inbox) ו־[Intercom WhatsApp FAQ](https://www.intercom.com/help/en/articles/9067468-whatsapp-faqs).

34.27.15 [HubSpot Help Desk](https://knowledge.hubspot.com/help-desk/overview-of-the-help-desk-workspace) ו־[HubSpot WhatsApp channel](https://knowledge.hubspot.com/help-desk/connect-a-whatsapp-channel-to-help-desk).

34.27.16 [Twilio WhatsApp Platform overview](https://www.twilio.com/docs/whatsapp/api), ‏[Twilio Content Templates](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates), ‏[Twilio Flex Conversations](https://www.twilio.com/docs/flex/admin-guide/core-concepts/conversations) ו־[Twilio WhatsApp pricing](https://www.twilio.com/en-us/whatsapp/pricing). המחיר או Limit בזמן Release נלקחים מ־Live source, לא מן ה־Snapshot המחקרי.

34.28 Answer Ledger מחייב לכל 83 השאלות שבאפיון המפורט.

34.28.1 כללי ה־Ledger.

34.28.1.1 כל תשובה להלן היא החלטת ה־Master Plan. החלטה טכנית או מוצרית ניתנת לביצוע לאחר Gate מתאים; החלטה משפטית, כספית או הקשורה לבעלות על חשבון נשארת חסומה עד אישור הגורם המוסמך.

34.28.1.2 כל Question ID נשמר במטריצת העקיבות ומקושר ל־Owner, Test, Evidence ו־Release gate. המילים מומלץ או Candidate אינן מפעילות יכולת חיה.

34.28.1.3 שאלת מחיר, מס, דין, Asset חי או Capacity חי אינה נפתרת באמצעות המצאת מספר. התוכנית קובעת נוסחה, ברירת מחדל בטוחה, מי מאשר ואיזו ראיה סוגרת אותה.

34.28.2 שאלות עסקיות Q01–Q10.

34.28.2.1 Q01 — מהן החבילות ומה המחיר של כל חבילה.

34.28.2.1.1 החלטה: ב־Closed pilot תהיה חבילה ידנית אחת בלבד. אם Finance ויועץ המס אינם מאשרים מחיר ותהליך חשבונית, ה־Pilot יהיה חינמי; אין Checkout מאולתר.

34.28.2.1.2 אחרי Pilot יוגדר Catalog קטן המבוסס על שלושה סוגי ערך בלבד: מושבים, מספרי WhatsApp ושימוש מדיד בהודעות/AI. מחיר מדויק יחושב מעל עלות ספק חיה, שעות Support, מרווח יעד, מע״מ, Refund risk ומחקר Willingness-to-pay שמספר המשתתפים, Segments וסף הקבלה שלו יאושרו לאחר Baseline; אין מינימום לקוחות מומצא.

34.28.2.1.3 מיפוי: 24.5, 24.7, 24.16, 31.9.4, 32.5 ו־34.30.3. סטטוס: הכיוון Covered; הסכום בשקלים Blocked external עד Finance/Product/Tax evidence.

34.28.2.2 Q02 — האם קיימת תקופת ניסיון.

34.28.2.2.1 החלטה: אין Free trial ציבורי ב־Pilot. יש Closed pilot מוזמן, מוגבל בזמן וב־Allowlist, עם Manual entitlement ותאריך סיום מפורש.

34.28.2.2.2 אחרי Pilot ניתן לפתוח Assisted trial רק כאשר Onboarding, Abuse controls, Cost caps, Deprovisioning ו־Conversion measurement מוכחים. Trial ללא כרטיס מועדף בתחילה כדי לא לערב Dunning לפני הוכחת ערך.

34.28.2.2.3 מיפוי: 24.5, 31.9–31.12 ו־32.5. סטטוס: Covered.

34.28.2.3 Q03 — האם המחיר כולל את עלויות Meta.

34.28.2.3.1 החלטה: דמי Connect אינם מסתירים את עלות Meta. עלות Meta מוצגת בנפרד לפי Rate card, Market, Category ו־Delivered facts; אם Connect משלם זמנית עבור Pilot, היא נרשמת כשורת Pass-through שקופה ולא כחבילת Unlimited.

34.28.2.3.2 הסיבה: Meta מחייבת לפי הודעה שנמסרה והמחיר תלוי בשוק ובקטגוריה; המחיר והכללים יכולים להשתנות. לכן Estimate מקבל Pricing snapshot ותאריך ואינו חשבונית.

34.28.2.3.3 מיפוי: 16.6, 20.6, 20.11 ו־24.7. סטטוס: Covered; Rate card ו־Commercial presentation נבדקים מחדש לפני כל Release.

34.28.2.4 Q04 — האם המחיר כולל שימוש ב־AI.

34.28.2.4.1 החלטה: אחרי Pilot החבילה כוללת מכסת AI מוגדרת ומוגבלת; Overage כבוי כברירת מחדל. ב־Pilot השימוש ידני ומוגבל בתקציב פנימי.

34.28.2.4.2 חריגה אינה מפעילה מודל יקר יותר או חיוב אוטומטי. היא עוצרת Draft חדש, מציגה סיבה ומאפשרת אישור Add-on רק אחרי Billing gate.

34.28.2.4.3 מיפוי: 23.13, 24.7, 24.11 ו־27.9. סטטוס: Covered; סכום המכסה Blocked external עד Baseline ועלות ספק חיה.

34.28.2.5 Q05 — כיצד מודדים צריכת AI.

34.28.2.5.1 החלטה: מקור האמת הפנימי הוא Provider usage מאומת ועלות כספית מנורמלת לכל Request, Model ו־Tenant. הלקוח רואה AI credits והעלות/מכסה המשוערת; Tokens לבדם אינם Unit מסחרי יציב.

34.28.2.5.2 כל Meter שומר Input/output usage, ‏Connect Model-profile revision, ‏Configured ו־Provider-returned model IDs, ‏Price snapshot, Currency, Request identity ו־Reconciliation בלי Prompt או PII בלוג.

34.28.2.5.3 מיפוי: 23.5, 23.13, 24.11 ו־27.6. סטטוס: Covered.

34.28.2.6 Q06 — התחייבות חודשית או שנתית.

34.28.2.6.1 החלטה: Monthly הוא מסלול ברירת המחדל לאחר Pilot. Annual יוצע רק אחרי ארבעה שבועות SLO יציב, Refund policy מאושרת ונתוני Retention מסחריים; אין התחייבות שנתית ב־Pilot.

34.28.2.6.2 Upgrade יכול להיכנס מיידית לפי Proration מאושר; Downgrade וחידוש מתנהלים לפי סעיף Q81 ו־Terms ברורים.

34.28.2.6.3 מיפוי: 24.7, 24.10, 24.13, 27.8, 31.11, 32.6 ו־34.30.4. סטטוס: Covered; Discount שנתי Blocked external.

34.28.2.7 Q07 — תוספות חד־פעמיות.

34.28.2.7.1 החלטה: אין Add-ons ב־Pilot. לאחר Billing live ניתן להציע חבילת AI או Usage חד־פעמית בעלת Expiry, Currency, Tax behavior, Idempotent purchase ו־Entitlement ledger.

34.28.2.7.2 Add-on אינו עוקף Meta Capacity, Consent, Operational rate limit או Provider cost cap.

34.28.2.7.3 מיפוי: 24.7, 24.11, 32.10 ו־34.30.22.1. סטטוס: Explicitly out of scope for Pilot and GA1; conditional work package defined.

34.28.2.8 Q08 — האם המערכת מיועדת רק לישראל.

34.28.2.8.1 החלטה: Israel-first, לא Israel-only. ה־Pilot מיועד ל־SMB בישראל; Architecture, Currency, Locale, Phone ו־Timezone נשארים בינלאומיים.

34.28.2.8.2 הרחבת מדינה דורשת Legal, Tax, Meta pricing, Data transfer, Language, Support ו־Billing review נפרדים.

34.28.2.8.3 מיפוי: 5.26, 9.5, 11.5, 24.7, 24.13, 26.6–26.7, 30.10–30.11, 32.10, 33 ו־34.30.22.2. סטטוס: Israel-first Covered; country expansion conditional.

34.28.2.9 Q09 — אילו שפות נתמכות.

34.28.2.9.1 החלטה: עברית מלאה היא Gate ל־Pilot; עברית, אנגלית וערבית הן Gate למוצר המלא. English fallback חייב להיות שלם גם ב־Pilot כדי למנוע Error לא מתורגם.

34.28.2.9.2 כל שפה דורשת Catalog, Formatting, RTL/LTR, Bidi security, תוכן משפטי ו־Browser acceptance; תרגום חלקי אינו נחשב Supported.

34.28.2.9.3 מיפוי: 30.10–30.12, 30.17 ו־34.30.11. סטטוס: Covered.

34.28.2.10 Q10 — White Label למשווקים.

34.28.2.10.1 החלטה: אין White Label ב־Pilot או ב־GA הראשונה. הוא נשקל כ־Agency/Enterprise capability רק לאחר סף ביקוש משלם חתום המבוסס על Baseline אמיתי לאותו צורך; הערך המספרי נשאר `unknown/unavailable` עד החלטת Product/Business owner שמיים. טל אינו Product approver אוטומטי.

34.28.2.10.2 White Label עתידי דורש Domain/Email/Brand isolation, Terms, Support ownership, Abuse attribution, Meta policy ו־Tenant hierarchy; החלפת Logo בלבד אינה מוצר בטוח.

34.28.2.10.3 מיפוי: 32.10, 33.5 ו־34.30.22.3. סטטוס: Explicitly out of scope until evidence gate.

34.28.3 שאלות Meta ו־WhatsApp Q11–Q18.

34.28.3.1 Q11 — האם כל לקוח יחבר חשבון Meta משלו.

34.28.3.1.1 החלטה: כן. כל Tenant מחבר Business Portfolio, WABA ומספר השייכים לו דרך Embedded Signup רשמי. נכסי האב הם חריג Pilot מתועד בלבד ולא מודל Multi-tenant קבוע.

34.28.3.1.2 Credential, WABA, Phone number ו־Billing ownership נבדקים ונקשרים ל־Tenant; אין Sharing בין לקוחות.

34.28.3.1.3 מיפוי: 14.5–14.7, 31.9 ו־34.30.21.1. סטטוס: Covered; Pilot asset approval Blocked external.

34.28.3.2 Q12 — ספק טכנולוגי או ספק חיצוני.

34.28.3.2.1 החלטה: מסלול המוצר המועדף לאחר אישור הוא חיבור ישיר ל־WhatsApp Cloud API ול־Embedded Signup הרשמי; זהו יעד ארכיטקטוני בלבד ואינו טענה ש־Connect כבר הוכרה כ־Tech Provider, ‏Solution Provider, Partner או Service Provider. עד Meta authorization כתוב ו־Legal role memo חתום, Connect נשארת Single-tenant Test/Closed-pilot על נכס שאושר במפורש, ו־Multi-client onboarding נשאר כבוי. אין ספרייה לא־רשמית, Web scraping או BSP fallback שקט.

34.28.3.2.2 שחרור דורש Meta App Review ו־Advanced Access להרשאות הנדרשות. אם Meta אינה מאשרת, היכולת נשארת כבויה או נשקל Partner רשמי בהחלטה חדשה; אין עקיפה.

34.28.3.2.3 מיפוי: 14.5, 14.8–14.10, 31.9 ו־34.30.21. סטטוס: Architecture direction Covered; ‏Role classification, authorization ו־App approval הם `unknown/unavailable` ו־Blocked external.

34.28.3.3 Q13 — יותר ממספר WhatsApp אחד ללקוח.

34.28.3.3.1 החלטה: Domain ו־Tenant model תומכים בריבוי Connections, אך Closed pilot מוגבל למספר אחד. לאחר Pilot מספר החיבורים הוא Entitlement ומכסה.

34.28.3.3.2 כל מספר מקבל Credential revision, Capacity, Quality, Templates, Inbox routing ו־Kill switch נפרדים.

34.28.3.3.3 מיפוי: 14.6–14.8, 16.7–16.10 ו־24.11. סטטוס: Covered; Multi-number UI אחרי Pilot.

34.28.3.4 Q14 — תמיכה בהעברת מספר קיים.

34.28.3.4.1 החלטה: לא ב־Pilot. לאחר Pilot תהיה Migration assisted בלבד, לאחר בדיקת Eligibility וזרימת Porting/Coexistence בתיעוד Meta העדכני ובנכס בדיקה.

34.28.3.4.2 אין להבטיח אפס Downtime. התהליך דורש Backup של Config, חלון שינוי, Verification, Rollback/abort, Owner ו־Customer communication.

34.28.3.4.3 מיפוי: 14.9–14.10, 32.10 ו־34.30.21.7. סטטוס: Planned after Pilot; Capability details require current Meta evidence.

34.28.3.5 Q15 — מה קורה כשהרשאת Meta מתבטלת.

34.28.3.5.1 החלטה: Outbound נעצר Fail-closed מיד, Permits חדשים נחסמים, Queue ננקזת, Unknown attempts נשמרים, Connection מסומן דורש חיבור מחדש ונשלחת התראה מורשית.

34.28.3.5.2 Reconnect יוצר Credential revision חדשה ואינו מחיה Jobs או Approvals ישנים. Inbound שאינו ניתן לאימות נשמר כ־Rejected evidence בלבד.

34.28.3.5.3 מיפוי: 14.7, 14.10, 16.9 ו־17.8–17.12. סטטוס: Covered.

34.28.3.6 Q16 — הצגת מגבלות ואיכות חשבון.

34.28.3.6.1 החלטה: כן. Dashboard מציג Source, effective time, freshness, Quality, Capacity, Usage, Queue, Deferred, Unknown ו־Stop reason. נתון חסר מוצג Unknown ולא Green.

34.28.3.6.2 ערכי Meta נגזרים מ־Live APIs/Dashboard המאושרים ונבדקים על ידי טל; אין מספר קשיח לא מאומת.

34.28.3.6.3 מיפוי: 16.5–16.12. סטטוס: Contract Covered; Live values Blocked external.

34.28.3.7 Q17 — מי מטפל באימות העסק מול Meta.

34.28.3.7.1 החלטה: בעל העסק הוא Account owner ומבצע את ההצהרות והאימות מול Meta. Connect מספק Assisted onboarding, Checklist ו־Support אך אינו מתחזה ללקוח ואינו מאשר עובדות בשמו.

34.28.3.7.2 רועי אחראי לחשבון Connect ולתיאום; לקוח Pilot מאשר את נכסיו; Support session כפופה ל־25.6.

34.28.3.7.3 מיפוי: 8.5, 14.5, 14.9, 25.6 ו־34.30.21.9. סטטוס: Covered; Human verification remains external.

34.28.3.8 Q18 — תמיכה במספרי בדיקה.

34.28.3.8.1 החלטה: כן, רק ב־Development/Staging וב־Recipient allowlist. Test number או Test WABA לעולם אינם משמשים הוכחת Production capacity.

34.28.3.8.2 UI ו־Evidence מסמנים SANDBOX מול LIVE; Config או Credential מסביבה אחרת נכשל ב־Startup וב־Preflight.

34.28.3.8.3 מיפוי: 11.5–11.8, 14.6, 31.5 ו־34.30.21.7. סטטוס: Covered; Asset creation Blocked external.

34.28.4 שאלות Contacts ו־Consent Q19–Q27.

34.28.4.1 Q19 — כיצד מתועדת הסכמה.

34.28.4.1.1 החלטה: Consent ledger append-only שומר Channel, Purpose, Source, נוסח וגרסה, Actor, captured time, Evidence reference ו־Expiry אם נדרש.

34.28.4.1.2 Importer declaration לבדה אינה מספיקה ללא מקור ראיה. שירות, שיווק וערוץ נשמרים כהרשאות נפרדות.

34.28.4.1.3 מיפוי: 18.6 ו־26.5. סטטוס: Technical Covered; Legal wording Blocked external.

34.28.4.2 Q20 — כיצד מטפלים בבקשת הסרה.

34.28.4.2.1 החלטה: Opt-out הופך ל־Suppression event מיידי, מקבל קדימות על Campaign snapshot, Bot, Segment ו־Retry, ומפעיל Ack רק אם הוא מותר ובטוח.

34.28.4.2.2 בקשה מאוחרת לפני Permit חוסמת Send; היסטוריית ההסרה נשמרת במינימום הנדרש כדי למנוע הרשמה חוזרת שקטה.

34.28.4.2.3 מיפוי: 15.11, 18.6–18.7 ו־20.8. סטטוס: Covered; Legal retention Blocked external.

34.28.4.3 Q21 — האם הסרה חלה על כל הרשימות.

34.28.4.3.1 החלטה: Opt-out שיווקי ב־WhatsApp חל גלובלית על זהות איש הקשר בתוך ה־Tenant, ללא תלות ברשימה. Complaint, Provider block ו־Legal restriction גלובליים וחזקים אף יותר.

34.28.4.3.2 Subscription preferences פרטניות יכולות להתווסף אחרי Pilot, אך לעולם אינן עוקפות Global suppression; הודעות שירות דורשות Purpose ועילה נפרדים.

34.28.4.3.3 מיפוי: 18.6–18.7. סטטוס: Covered; Legal review required.

34.28.4.4 Q22 — פורמטי קובצי אנשי קשר.

34.28.4.4.1 החלטה: Pilot מקבל CSV UTF-8 בלבד. המוצר המלא מוסיף XLSX רק דרך Parser sandbox עם חסימת Formula, Macro, External link, Hidden/multiple sheets ו־Resource bombs; XLS ישן אינו נתמך.

34.28.4.4.2 Download template מגדיר Headers ו־Encoding קנוניים. Extension אינה הוכחת Type.

34.28.4.4.3 מיפוי: 18.8, 29.10 ו־34.30.9. סטטוס: CSV Covered for Pilot; XLSX Planned before full GA.

34.28.4.5 Q23 — מספר אנשי קשר מרבי בקובץ.

34.28.4.5.1 החלטה: ב־Closed pilot Production מייבאים רק Recipient allowlist קטן, שמי ומאושר ב־Charter ‏34.30.18. המספר המרבי המדויק הוא `unknown/unavailable` עד חתימת Product, Legal, Support ו־WhatsApp safety; עד אז המכסה החיה היא אפס. אין לאסוף אנשי קשר שאינם נחוצים לניסוי. בדיקת Capacity רחבה לאחר Pilot תשתמש רק ב־Artifact מאושר לפי 5.4; אין לייצר מידע עסקי סינתטי כדי להוכיח מוכנות ואין להסיק ממנה מגבלת Exposure חיה.

34.28.4.5.2 בנוסף נאכפים Size, columns, cell length, parse time, memory ו־concurrent imports; Row count לבדו אינו הגנת משאבים.

34.28.4.5.3 מיפוי: 18.8, 24.11, 29.13 ו־34.30.18. סטטוס: Pilot live limit fixed at 10 allowlisted contacts; post-Pilot limit requires measured evidence.

34.28.4.6 Q24 — זיהוי כפילויות.

34.28.4.6.1 החלטה: מפתח ההתאמה הוא Tenant יחד עם מספר E.164 קנוני. ערך דו־משמעי אינו מתמזג; Email או Name אינם מפתח זהות.

34.28.4.6.2 Merge משתמש ב־Field ownership, Preview ו־Expected version; Consent, Suppression ו־Audit אינם נדרסים.

34.28.4.6.3 מיפוי: 18.5 ו־18.9. סטטוס: Covered.

34.28.4.7 Q25 — עדכון באמצעות ייבוא חוזר.

34.28.4.7.1 החלטה: כן, רק לאחר Dry-run המראה create/update/conflict/suppressed לכל שורה ואישור מפורש. רק שדות שמופו כבעלי Import ownership מתעדכנים.

34.28.4.7.2 שני Imports מתחרים או עריכה ידנית באמצע יוצרים Conflict; אין Last-write-wins שקט.

34.28.4.7.3 מיפוי: 18.8–18.9. סטטוס: Covered.

34.28.4.8 Q26 — ניקוי ואימות מספרי טלפון.

34.28.4.8.1 החלטה: כן לנרמול תחבירי E.164 עם Country context מפורש. אין הבטחה שהמספר פעיל או שייך לאדם בלי Evidence חוקי מספק; אין לבצע Enumeration מול WhatsApp.

34.28.4.8.2 Invalid, ambiguous, short, long, Unicode או Prefix כפול נחסמים ומוסברים בדוח הייבוא.

34.28.4.8.3 מיפוי: 18.5, 18.8 ו־29.6–29.7. סטטוס: Covered.

34.28.4.9 Q27 — שליחה לאיש קשר ללא שם.

34.28.4.9.1 החלטה: כן, מספר טלפון מאומת והסכמה מספקים לזהות. Template הדורשת שם חייבת Fallback שאושר מראש או שהנמען נחסם לפני Send.

34.28.4.9.2 המערכת אינה ממציאה שם, אינה מציגה מספר אישי בטקסט שלא לצורך ואינה שולחת Variable ריק בשקט.

34.28.4.9.3 מיפוי: 18.5, 19.6 ו־20.6. סטטוס: Covered.

34.28.5 שאלות Campaigns ו־Scheduling Q28–Q36.

34.28.5.1 Q28 — האם ניתן לעצור Campaign פעיל.

34.28.5.1.1 החלטה: כן. Pause חוסם Permits חדשים ומתחיל Drain; Attempt שכבר חצה את Barrier אינו מבוטל ואינו נשלח שוב.

34.28.5.1.2 UI מציג זמן עצירה, Pending, In-flight, Sent fact ו־Unknown בנפרד. Resume דורש Preflight חדש ו־Actor מורשה.

34.28.5.1.3 מיפוי: 20.10, 16.9 ו־17.11. סטטוס: Covered.

34.28.5.2 Q29 — עריכת Campaign לאחר שהתחיל.

34.28.5.2.1 החלטה: Campaign רץ הוא Snapshot immutable ואינו נערך. שינוי יוצר Revision/Clone חדש, מבטל Approval ישן ומחייב Preview ואישור מחדש.

34.28.5.2.2 נמענים שכבר קיבלו Fact או Unknown נשארים בגרסה הישנה; אין העברה אוטומטית שיוצרת כפילות.

34.28.5.2.3 מיפוי: 20.5, 20.8–20.10. סטטוס: Covered.

34.28.5.3 Q30 — טיפול בהודעות שנכשלו.

34.28.5.3.1 החלטה: כל תוצאה מסווגת ל־Permanent failure, Deferred/retryable only before attempt, Unknown או Provider fact. Error code נשמר בלי טקסט ספק רגיש ונקשר ל־Recipient attempt.

34.28.5.3.2 Permanent אינו נשלח שוב; Unknown עובר Reconciliation או Review; Deferred מקבל Permit חדש רק לאחר Policy ו־Capacity טריים.

34.28.5.3.3 מיפוי: 17.11–17.12 ו־20.9. סטטוס: Covered.

34.28.5.4 Q31 — האם מתבצע Retry.

34.28.5.4.1 החלטה: Retry מותר רק כאשר קיימת ראיה שה־Provider attempt לא התחיל או כאשר Meta החזירה דחייה מפורשת המסווגת בבטחה כ־No attempt עם Retry-After. Timeout או תוצאה עמומה לעולם אינם Retry אוטומטי.

34.28.5.4.2 Retry מקבל Idempotency identity, Attempt budget, Backoff, Fresh permit ו־same credential binding; אין Loop בלתי־מוגבל.

34.28.5.4.3 מיפוי: 16.7–16.9, 17.9–17.12 ו־20.9. סטטוס: Covered; Meta error taxonomy requires live evidence.

34.28.5.5 Q32 — Rate limit לכל לקוח.

34.28.5.5.1 החלטה: כן. Limiter רב־שכבתי פועל לפי Global, Provider, WABA, Phone, Tenant, Campaign, Operation, Recipient ו־Cost, כאשר הגבול האפקטיבי הוא המינימום מכל השכבות.

34.28.5.5.2 Inbox/Opt-out/System מקבלים Priority על Bulk, ו־Weighted fairness מונע Tenant רועש. טל הוא Owner למחקר, freshness ו־Evidence.

34.28.5.5.3 מיפוי: כל סעיף 16. סטטוס: Contract Covered; live values Blocked external.

34.28.5.6 Q33 — עלות משוערת לפני שליחה.

34.28.5.6.1 החלטה: כן, כטווח מתוארך המבוסס על Market, Category, Template, Eligible recipient snapshot, Meta rate snapshot, AI/media usage והמטבע. Estimate אינו Invoice ואינו הבטחה למסירה.

34.28.5.6.2 שינוי Audience, Template, Pricing, Currency או Time מבטל את ה־Estimate ואת ה־Approval.

34.28.5.6.3 מיפוי: 20.5–20.6, 20.11 ו־24.7. סטטוס: Covered; current rates fetched before use.

34.28.5.7 Q34 — A/B testing.

34.28.5.7.1 החלטה: לא ב־Pilot. לאחר Pilot ניתן להוסיף Experiment service עם deterministic allocation, fixed hypothesis, sample/exposure cap, stop rule, consent parity ובלי לבצע ניסוי על Suppression או Eligibility.

34.28.5.7.2 כל Variant הוא Template/Campaign version מאושרת; אין שינוי תוכן בזמן Experiment ואין Optimization אוטונומי.

34.28.5.7.3 מיפוי: 32.5–32.11 ו־34.30.22.4. סטטוס: Planned after Pilot and evidence gate.

34.28.5.8 Q35 — Campaign מחזורי.

34.28.5.8.1 החלטה: לא ב־Pilot לפי D24. לאחר Pilot נדרשים Recurrence rule versioned, Timezone/DST, End condition, per-run approval policy, Template change behavior, Cancellation ו־next-run claim fenced.

34.28.5.8.2 כל Run בודק Consent, Suppression, Template, Cost, Rate ו־Quota מחדש; סדרה אינה Authorization קבוע.

34.28.5.8.3 מיפוי: 20.7, 32.11–32.12 ו־34.30.10. סטטוס: Explicitly out of scope for Pilot; Planned.

34.28.5.9 Q36 — אישור מנהל לפני Campaign.

34.28.5.9.1 החלטה: ב־Pilot כל Campaign שאינו Test recipient יחיד ב־Allowlist דורש Maker-checker: היוצר אינו המאשר. Test send דורש Confirmation אך יכול להיות מאושר בידי אותו משתמש מורשה.

34.28.5.9.2 לאחר Pilot Policy ניתנת להגדרה לפי Size, Purpose, Cost, Risk ו־Role; Bulk marketing, חריגת Cost או Audience רגיש נשארים Dual-control.

34.28.5.9.3 מיפוי: 13.6, 19.7, 20.5–20.6 ו־25.9. סטטוס: Covered.

34.28.6 שאלות Flow Builder ו־Bot Q37–Q45.

34.28.6.1 Q37 — אילו Blocks נכללים בגרסה הראשונה.

34.28.6.1.1 החלטה: אם Flow נכלל ב־Pilot, ה־Allowlist הוא Start/inbound trigger, Keyword, Text draft-to-agent, Approved template, Buttons, List, Typed condition, Durable wait, Contact field update allowlisted, Tag add/remove, Assignment, Human handoff ו־End. ב־Core pilot Gate 17 אופציונלי וה־Builder נשאר כבוי עם Disabled evidence.

34.28.6.1.2 AI node רשאי ליצור Proposal בלבד. Media, external API, arbitrary webhook, JavaScript, SQL, Shell ו־Dynamic URL אינם ב־Pilot. כל Block דורש Schema, Capability, Timeout, Error route ו־Cost class.

34.28.6.1.3 מיפוי: 22.5–22.10. סטטוס: Covered as planned Pilot allowlist; Registry update required before execution.

34.28.6.2 Q38 — מספר Bots על אותו מספר.

34.28.6.2.1 החלטה: ניתן לשמור מספר Flows וגרסאות, אך ב־Pilot יש Routing policy פעילה אחת לכל Phone/Conversation context. שני Bots אינם מקבלים אותו Event.

34.28.6.2.2 לאחר Pilot Router דטרמיניסטי יכול לבחור Flow לפי Trigger priority ו־Version; Ambiguity חוסמת ומעבירה לאדם.

34.28.6.2.3 מיפוי: 22.6–22.8. סטטוס: Covered.

34.28.6.3 Q39 — כיצד נקבע איזה Bot יופעל.

34.28.6.3.1 החלטה: סדר הקדימות הוא Kill/tenant suspension, Opt-out או Human active, Conversation-pinned flow, Explicit keyword/trigger priority, Default flow, ואז Human handoff. התאמה מרובה באותה עדיפות נכשלת סגור.

34.28.6.3.2 כל Route שומר Trigger identity, Policy version, Flow version, Reason ו־digest לצורך Replay.

34.28.6.3.3 מיפוי: 22.6–22.8. סטטוס: Covered.

34.28.6.4 Q40 — האם Bot פועל מחוץ לשעות פעילות.

34.28.6.4.1 החלטה: Flow דטרמיניסטי יכול לשלוח Ack/שירות מאושר מחוץ לשעות צוות רק בתוך חלון השירות של WhatsApp ובהתאם ל־Consent/Policy. מחוץ לחלון נדרשת Template מאושרת.

34.28.6.4.2 AI אינו שולח מחוץ לשעות כאשר אין Agent מאשר. במקום זאת נשמר Draft, מוצג זמן מענה צפוי ונוצרת משימת Human handoff.

34.28.6.4.3 מיפוי: 15.11, 21.8, 22.6 ו־34.30.6. סטטוס: Covered; Business hours Blocked external.

34.28.6.5 Q41 — מתי שיחה עוברת לנציג.

34.28.6.5.1 החלטה: בקשת משתמש, Opt-out/complaint, low confidence או abstention, restricted topic, Prompt injection suspicion, repeated error, budget/loop exhaustion, Action חסומה, Agent claim או Security incident מעבירים לאדם.

34.28.6.5.2 Handoff מפסיק Automation לפני Reply permit, שומר Reason/Priority ויוצר Queue item; אין Message נוסף לאחר Handoff באותו Turn.

34.28.6.5.3 מיפוי: 21.8, 22.8 ו־23.10–23.12. סטטוס: Covered.

34.28.6.6 Q42 — חזרה אוטומטית מהנציג ל־Bot.

34.28.6.6.1 החלטה: לא ב־Pilot. Resume דורש Agent מורשה, Reason, Flow version תקפה ו־Revalidation של Conversation/Consent; אין Timer שמחזיר אוטומטית.

34.28.6.6.2 לאחר Pilot Auto-resume יישקל רק עם Explicit customer state, inactivity policy, notice, cancel path ו־race tests.

34.28.6.6.3 מיפוי: 21.8, 32.10 ו־34.30.22.5. סטטוס: Manual resume Covered; automatic resume conditional.

34.28.6.7 Q43 — קריאות API חיצוניות.

34.28.6.7.1 החלטה: אין arbitrary API/Webhook block ב־Pilot. לאחר Evidence gate כל Connector עובר Port allowlisted עם fixed host, method/schema, scoped secret reference, SSRF defense, timeout, retry/unknown policy, rate/cost ו־kill switch.

34.28.6.7.2 Response חיצוני נחשב Untrusted data ועובר Schema/size validation; Flow אינו מקבל Credential או URL חופשי.

34.28.6.7.3 מיפוי: 10.7, 22.5, 22.10, 29.9, 33.6 ו־34.30.15. סטטוס: Explicitly out of scope for Pilot; Planned after evidence.

34.28.6.8 Q44 — היסטוריית גרסאות.

34.28.6.8.1 החלטה: כן. Draft mutable, Published version immutable ו־Active pointer נפרדים; Publish ו־Rollback הם פעולות מורשות ומתועדות.

34.28.6.8.2 Session קיימת נשארת בגרסה שלה או עוברת לאדם; שינוי Contract אינו משדרג אותה בשקט.

34.28.6.8.3 מיפוי: 22.5, 22.7–22.8 ו־22.12. סטטוס: Covered.

34.28.6.9 Q45 — סביבת בדיקה לפני פרסום.

34.28.6.9.1 החלטה: כן, בשתי שכבות: Simulator ללא Side effects ו־Staging מבודדת עם Test assets ו־Recipient allowlist. Simulator אינו תחליף ל־Staging.

34.28.6.9.2 Publish דורש Validation, deterministic compile, Simulator vectors ו־Approver; Live activation דורש Gate נפרד.

34.28.6.9.3 מיפוי: 22.7, 22.11, 29.8 ו־31. סטטוס: Covered.

34.28.7 שאלות AI, Knowledge ו־Cost Q46–Q57.

34.28.7.1 Q46 — אילו ספקי AI נתמכים.

34.28.7.1.1 החלטה: OpenAI Responses API הוא הספק היחיד המועמד ל־Pilot, מאחורי Provider port. אין Multi-provider routing או Fallback אוטומטי.

34.28.7.1.2 כל Model נכנס ל־Allowlist רק לאחר Eval, Privacy, Cost, Latency ו־Safety evidence; Model alias או Provider ID לבדם אינם Release identity. הזהות היא Connect Model-profile revision בעלת Digests מלאים וכל טענת Provider immutability דורשת Evidence חי.

34.28.7.1.3 מיפוי: 5.2–5.4, 23.5 ו־23.12–23.13. סטטוס: Architecture Covered; account/data controls Blocked external.

34.28.7.2 Q47 — האם הלקוח מספק API key.

34.28.7.2.1 החלטה: לא ב־Pilot וב־GA הראשונה. Connect משתמש ב־Project credentials של החברה, מופרדים בין סביבות, ומודד שימוש לפי Tenant.

34.28.7.2.2 BYOK עתידי הוא Enterprise feature הדורש Vault tenant-scoped, Scope/rotation, DPA, billing attribution, support boundary ו־no-fallback; Key לעולם אינו נשלח ל־Browser.

34.28.7.2.3 מיפוי: 10.16, 11.8, 23.5.4 ו־33.5. סטטוס: Covered; BYOK deferred.

34.28.7.3 Q48 — האם נגבה תשלום על AI.

34.28.7.3.1 החלטה: Pilot אינו מחייב אוטומטית. לאחר Pilot AI נכלל במכסה מוגדרת ומוצג כ־Usage/credits; Add-on או Overage דורשים Billing live ואישור מפורש.

34.28.7.3.2 עלות הספק אינה מעורבבת עם Meta, ואין Unlimited claim. Cost reconciliation נשען על Provider usage ועל Internal ledger.

34.28.7.3.3 מיפוי: 23.13, 24.7 ו־24.11. סטטוס: Covered; commercial amount Blocked external.

34.28.7.4 Q49 — סוגי קבצי Knowledge בגרסה הראשונה.

34.28.7.4.1 החלטה: PDF, TXT ו־DOCX בלבד לפי D06. CSV, Crawl של אתר, URL fetch ו־Archive אינם ב־Pilot; Text ידני יכול להישמר כמקור טקסט נפרד בלי להעמיד פנים שהוא File.

34.28.7.4.2 כל מקור עובר Quarantine, Type validation, Malware verdict, sandbox extraction, human review ו־publish digest.

34.28.7.4.3 מיפוי: 23.6–23.8. סטטוס: Covered; AWS/GuardDuty Blocked external.

34.28.7.5 Q50 — גודל קובץ מרבי.

34.28.7.5.1 החלטה: 10 MiB לקובץ לפני ואחרי decoding/decompression לפי D06. בנוסף קיימים Page, archive entry, characters, memory, CPU, extraction time ו־token budgets.

34.28.7.5.2 קובץ גבולי אינו משתחרר אם Scanner, Parser או Cost budget אינם מוכחים; Limit אינו ניתן לעקיפה באמצעות multipart או compressed content.

34.28.7.5.3 מיפוי: 23.6–23.7 ו־29.10. סטטוס: Covered.

34.28.7.6 Q51 — האם תשובה כוללת מקורות.

34.28.7.6.1 החלטה: כן. כל תשובת RAG חייבת Provenance הניתנת לאימות אל Document version, Chunk ו־content digest; אם אין מקור מספק, המודל abstains.

34.28.7.6.2 UI מציג מקור והרשאה מתאימה בלי לחשוף מסמך של Tenant אחר או טקסט שלא נדרש.

34.28.7.6.3 מיפוי: 23.8, 23.10–23.12. סטטוס: Covered.

34.28.7.7 Q52 — מה קורה כשאין תשובה במאגר.

34.28.7.7.1 החלטה: אין המצאה. המערכת מסמנת Abstention, מציעה Draft בטוח כגון בקשת הבהרה אם Policy מאפשרת, ומעבירה לנציג עם Reason ומקורות שנבדקו.

34.28.7.7.2 Confidence number לבדו אינו Authorization. Grounding, retrieval coverage, policy ו־human approval קובעים.

34.28.7.7.3 מיפוי: 21.8, 23.10–23.12. סטטוס: Covered.

34.28.7.8 Q53 — שליחה מיד או אחרי אישור נציג.

34.28.7.8.1 החלטה: תמיד אחרי אישור נציג לפי D25. Approval קשור ל־Draft digest, Context digest, Conversation/recipient, Flow/model/policy version, Approver ו־Expiry.

34.28.7.8.2 Approval חד־פעמי נצרך אטומית; שינוי תוכן, Opt-out, handoff, Policy, Credential או Expiry מבטלים אותו. AI אינו מאשר את עצמו.

34.28.7.8.3 מיפוי: 5.29, 21.8, 23.10–23.12, 25.9 ו־34.30.8. סטטוס: Direction Covered; detailed approval lifecycle required.

34.28.7.9 Q54 — כמה הודעות נשלחות למודל.

34.28.7.9.1 החלטה: ברירת Pilot היא Summary מאושר של השיחה יחד עם עד 12 ההודעות האחרונות שאינן Internal notes, לאחר Redaction, ובכפוף ל־Token/Cost cap. המינימום הנחוץ נשלח גם אם המכסה מאפשרת יותר.

34.28.7.9.2 שינוי הערך 12 הוא Policy versioned שעובר Eval; אין שליחה אוטומטית של כל ההיסטוריה או קבצים מצורפים.

34.28.7.9.3 מיפוי: 23.5, 23.10–23.14 ו־26.12. סטטוס: Provisional safe default pending Eval; Eval may reduce the cap.

34.28.7.10 Q55 — לכמה זמן נשמרת היסטוריית שיחה.

34.28.7.10.1 החלטה: ברירת המחדל התכנונית היא ש־Message bodies ב־Pilot נשמרים 180 ימים ממצב Conversation terminal, עם אפשרות Tenant לבחור תקופה קצרה יותר. Consent, Suppression, Audit, Billing ו־Backup מקבלים מחזור חיים נפרד.

34.28.7.10.2 הפעלה חסומה עד Legal/DPIA. Active investigation או Legal Hold חוסמים מחיקה; Backup copy מזדקנת לפי Policy ואינה מוחזרת לשירות ללא Re-deletion plan.

34.28.7.10.3 מיפוי: 21.5–21.6, 26.5–26.10 ו־28.8. סטטוס: Recommended technical default; Blocked external until Legal sign-off.

34.28.7.11 Q56 — האם לקוח יכול לבחור Model.

34.28.7.11.1 החלטה: לא ב־Pilot. המשתמש בוחר Profile עסקי כגון חסכוני או איכותי רק בעתיד; Server registry ממפה אותו ל־Connect Model-profile revision שעבר Eval, ולא ל־Alias ספק בלתי־מבוקר.

34.28.7.11.2 אין חשיפת Model חדש לפני Cost/Safety/Latency gate ואין fallback שקט למודל יקר יותר.

34.28.7.11.3 מיפוי: 23.5, 23.12–23.13, 32.10 ו־34.30.22.6. סטטוס: Server-selected model Covered; user-facing profile conditional.

34.28.7.12 Q57 — הגבלת עלות AI חריגה.

34.28.7.12.1 החלטה: Caps ברמת Request, Conversation, Tenant/day, Tenant/month, Environment ו־Provider account; Reservation מתבצעת לפני Request ו־Actual usage reconciles אחריו.

34.28.7.12.2 חריגה פותחת Circuit breaker, מבטלת Draft חדש ומעבירה לאדם. אין Retry בלתי־מוגבל, Parallel amplification או automatic expensive fallback.

34.28.7.12.3 מיפוי: 23.13, 24.11, 27.9 ו־29.13. סטטוס: Covered; monetary caps Blocked external.

34.28.8 שאלות Shared Inbox Q58–Q65.

34.28.8.1 Q58 — מספר נציגים צופים באותה שיחה.

34.28.8.1.1 החלטה: כן, בהתאם ל־Tenant, Team ו־Capability. Presence/assignment אינם משנים את Message ledger, ו־PII מוצג רק למי שזקוק לו.

34.28.8.1.2 Concurrent updates משתמשים ב־Version/Conflict; שני Agents אינם שולחים על אותה Approval או מסמנים State שקט.

34.28.8.1.3 מיפוי: 21.5–21.7. סטטוס: Covered.

34.28.8.2 Q59 — האם נציג נועל שיחה.

34.28.8.2.1 החלטה: משתמשים ב־Soft assignment/lease ולא ב־Hard lock. כל המורשים יכולים לצפות; פעולת Claim בוחרת מטפל אחד ו־Versioning מונע Lost update.

34.28.8.2.2 Takeover דורש Reason ו־Audit; Lease שפג, Offboarding או Absence עוברים Reassignment לפי Runbook.

34.28.8.2.3 מיפוי: 21.7. סטטוס: Covered.

34.28.8.3 Q60 — כיצד שיחות מוקצות.

34.28.8.3.1 החלטה: ב־Pilot משתמשים ב־Queue משותף עם Manual claim, Assign by manager ו־explicit transfer. אין Auto-routing מורכב לפני נתוני עומס.

34.28.8.3.2 לאחר Pilot ניתן להוסיף deterministic round-robin/skill routing עם Availability, SLA timer, fairness, override ו־Audit; כל כשל חוזר ל־Unassigned ולא מאבד שיחה.

34.28.8.3.3 מיפוי: 21.7, 32.10, 34.30.6 ו־34.30.22.7. סטטוס: Pilot Covered; automation conditional.

34.28.8.4 Q61 — חלוקה לפי מחלקות.

34.28.8.4.1 החלטה: לא ב־Pilot; Team/queue field קיים בחוזה כדי לאפשר הרחבה. Department hierarchy מופעלת רק לאחר צורך מוכח ומטריצת הרשאות.

34.28.8.4.2 מחלקה אינה Tenant boundary ואינה מאפשרת Cross-tenant. Transfer, visibility, overflow ו־offboarding דורשים tests.

34.28.8.4.3 מיפוי: 13.6, 21.7, 32.10, 33.5 ו־34.30.22.8. סטטוס: Conditional after Pilot.

34.28.8.5 Q62 — התראות דפדפן או מובייל.

34.28.8.5.1 החלטה: Pilot/Base כולל In-app notifications בלבד, וכן Email מצומצם לאירועי Security, Billing, invitation ו־critical operational action לאחר Gate הערוץ. כל Browser Notification API, הרשאת דפדפן, Web Push, Subscription, Service Worker ו־Native push נשארים כבויים ואינם ב־Pilot/Base; Browser/Web Push יכולים להיפתח רק בחבילת PWA המותנית 35.8.21 וב־Sub-gates העצמאיים 28.3.1–28.3.5. ‏Push/Notification אינו מורשה מכוח Installability או Worker בלבד, ו־Background Sync נשאר כבוי כל עוד FR-074/DS-025 אינם עוברים את תנאי הבשלות והתמיכה החיה.

34.28.8.5.2 Notification payload אינו כולל Message body או PII כברירת מחדל; Deep link דורש Session/Tenant authorization מחדש.

34.28.8.5.3 מיפוי: In-app/Email אל 21.7, 30.13 ו־34.30.5; Browser/Web Push אל 33.7, ‏34.32.2.42 ו־35.8.21 בלבד. סטטוס Base: In-app/Email planned; Browser/Web Push conditional-disabled, ללא Credit או Predecessor ב־Base.

34.28.8.6 Q63 — אפליקציה או אתר רספונסיבי.

34.28.8.6.1 החלטה: React Web responsive הוא היעד ל־Pilot ול־GA הראשונה. ‏PWA היא חבילה מותנית ונפרדת. Native iOS/Android מותנה ב־Use case Native-only מוכח שלא נפתר ב־Responsive Web וגם ב־PWA מאושרת כאשר היא ישימה; סף הביקוש המספרי אינו נקבע לפני Baseline וחתימת Product/Business owner שמיים. טל נדרש רק אם ההרחבה משנה את מגבלות WhatsApp/Meta או את מדיניות Connect rate limiting.

34.28.8.6.2 PWA אינה שומרת Message/Contact/Knowledge offline בלי Policy והגנה מתאימה.

34.28.8.6.3 מיפוי: 30.13 ל־Responsive Base; ‏33.7 לחבילת PWA מותנית; ‏33.9 ל־Native מותנה. סטטוס: `open-crosswalk-until-A05-PWA-package`.

34.28.8.7 Q64 — SLA לזמן מענה.

34.28.8.7.1 החלטה: אין SLA חוזי ב־Pilot. המערכת מודדת First human response ו־Queue age; יעד פנימי נקבע אחרי Baseline ונפח אמיתי.

34.28.8.7.2 SLA מסחרי עתידי דורש שעות שירות, Exclusions, Measurement source, Severity, Remedy, On-call ו־Legal approval; Timer ב־UI אינו התחייבות.

34.28.8.7.3 מיפוי: 21.7, 27.7–27.8, 33.5 ו־34.30.6. סטטוס: Measurement Covered; target Blocked external.

34.28.8.8 Q65 — תשובות מהירות.

34.28.8.8.1 החלטה: כן ב־Pilot. Quick reply היא Template פנימית Tenant-scoped, versioned, searchable ומוגבלת Role; היא נכנסת ל־Composer כ־Draft ודורשת Agent send.

34.28.8.8.2 Variable, PII, Opt-out ו־service-window validation מתבצעים בזמן שימוש; שינוי תשובה אינו משנה הודעה שכבר נשלחה.

34.28.8.8.3 מיפוי: 21 ו־34.30.6. סטטוס: Work package required before Gate 16.

34.28.9 שאלות Security, Privacy ו־Data Q66–Q75.

34.28.9.1 Q66 — היכן נשמרים הנתונים.

34.28.9.1.1 החלטה: מקור האמת העסקי ב־Railway PostgreSQL; Redis/BullMQ הוא Queue בלבד; Web ב־Vercel; קבצים, Knowledge ו־Backup/Evidence ב־AWS S3; זהות ב־Clerk; AI ב־OpenAI; WhatsApp ב־Meta; Telemetry ב־Better Stack.

34.28.9.1.2 לכל Data class נשמר System/Region/Controller-processor/Encryption/Retention map. אין טענה שכל הנתונים נמצאים במקום אחד.

34.28.9.1.3 מיפוי: 9.5, 11.5–11.9 ו־26.5–26.7. סטטוס: Architecture Covered; live region evidence Blocked external.

34.28.9.2 Q67 — האם נדרש אחסון בישראל.

34.28.9.2.1 החלטה: Israel-first ומזעור העברה; S3 נבחר ב־il-central-1. אין לטעון שכל המערכת Israel-resident משום ש־Railway, Vercel, Clerk, Meta, OpenAI, Better Stack ו־Billing דורשים בדיקה נפרדת.

34.28.9.2.2 Legal/DPIA קובעים אילו Data classes חייבים להישאר בישראל, אילו מותר להעביר, באיזה DPA/Transfer mechanism ומה חלון המחיקה.

34.28.9.2.3 מיפוי: 11.9, 23.14 ו־26.6–26.7. סטטוס: Recommendation Covered; legal/residency claim Blocked external.

34.28.9.3 Q68 — לכמה זמן נשמרות הודעות.

34.28.9.3.1 החלטה: ברירת המחדל התכנונית היא 180 ימים מ־Conversation terminal ל־Message body ב־Pilot, עם אפשרות לתקופה קצרה יותר. Metadata הכרחי, Consent, Suppression, Delivery, Audit ו־Backup מפוצלים ואינם יורשים את אותו מספר.

34.28.9.3.2 Legal Hold עוצר מחיקה; Active conversation אינה נמחקת על Trigger שגוי; Plan v2 קצר־חיים ומוגבל ל־cutoff/identities המדויקים.

34.28.9.3.3 מיפוי: 26.8–26.10. סטטוס: Technical default selected; deletion activation Blocked external until Legal.

34.28.9.4 Q69 — כיצד לקוח מוחק את כל המידע.

34.28.9.4.1 החלטה: Request מאומת יוצר Data map ו־Deletion plan עם ID/digest/expiry, Preview, Legal Hold check, Provider-specific identities, atomic bounded execution ו־post-delete audit.

34.28.9.4.2 המערכת מסבירה חריגים: Suppression minimal tombstone, Audit/Finance obligation, Active legal hold ו־Backup expiry. Restore מפעיל Re-deletion לפני חזרה לשירות.

34.28.9.4.3 מיפוי: 18.11, 23.8, 26.9–26.13 ו־28.8. סטטוס: Covered; Legal approval required.

34.28.9.5 Q70 — האם נדרש MFA.

34.28.9.5.1 החלטה: MFA חובה לכל משתמשי Pilot ולכל System/Support account. לאחר GA ניתן להקל רק ל־Viewer נמוך־סיכון בהחלטת Security מפורשת; Owner, Admin, Billing, Support ו־Approver תמיד מחויבים.

34.28.9.5.2 פעולת P0/P1 דורשת Reauthentication טרי. Recovery אינו Support override של אדם יחיד.

34.28.9.5.3 מיפוי: 13.8 ו־25.8. סטטוס: Decision Covered; Clerk configuration/evidence Blocked external.

34.28.9.6 Q71 — אילו פעולות נשמרות ב־Audit.

34.28.9.6.1 החלטה: Authentication/MFA/session, Membership/role/invitation, Tenant/plan/quota, Contact/import/export/delete, Consent/suppression, Meta asset/credential, Template/approval, Campaign/recipient/send/reconcile, Inbox assignment/content-access, Flow publish/run, AI draft/approval/tool, Knowledge/file, Billing/refund, Admin/support/break-glass, Retention/hold, Backup/restore, Config/release/kill-switch ו־Incident.

34.28.9.6.2 Read של מידע רגיש נרשם לפי Policy; Audit אינו מכיל Secret, Message body מלא או PII לא נדרש ואינו ניתן לשינוי בידי Runtime/Admin רגיל.

34.28.9.6.3 מיפוי: 12.10, 25.10, 26.15, 27.6 ו־34.30.7. סטטוס: Covered; canonical event catalog required.

34.28.9.7 Q72 — מי רשאי לצפות בתוכן שיחות.

34.28.9.7.1 החלטה: Tenant owner/admin, Agent מורשה לאותה Queue/Conversation ו־Auditor רק אם ניתנה Capability ייעודית. Viewer רגיל אינו מקבל תוכן כברירת מחדל; System Admin אינו מקבל תוכן אוטומטית.

34.28.9.7.2 Support רואה תוכן רק ב־Ticket-bound session עם Need-to-know, אישור לקוח או Break-glass מאושר, Banner ו־Audit.

34.28.9.7.3 מיפוי: 13.6, 21.7–21.9 ו־25.5–25.6. סטטוס: Decision Covered; role matrix evidence required.

34.28.9.8 Q73 — האם Support יכול להתחבר לחשבון לקוח.

34.28.9.8.1 החלטה: כן, אך אין Impersonation שקטה. Session מוגבלת ל־Tenant/Ticket/Actions, דורשת Approver, מוצגת ללקוח ובעלת TTL מרבי של 30 דקות.

34.28.9.8.2 הארכה דורשת אישור חדש; כל פעולה נרשמת; Send/Billing/Consent/Credential/Export אינם מותרים כברירת מחדל.

34.28.9.8.3 מיפוי: 25.5–25.7. סטטוס: Covered.

34.28.9.9 Q74 — האם נדרש DPA.

34.28.9.9.1 החלטה: כן. Connect זקוקה ל־DPA מול לקוחות ול־Supplier DPA/Subprocessor register מול ספקים המעבדים מידע אישי, יחד עם Transfer, Security, Incident, Deletion ו־termination terms.

34.28.9.9.2 DPA אינו מסמך קוד; Legal מאשר נוסח, תפקיד Controller/Processor והחרגות לכל Data flow.

34.28.9.9.3 מיפוי: 23.14 ו־26.6–26.7. סטטוס: Requirement Covered; documents Blocked external.

34.28.9.10 Q75 — האם Backup מוצפן.

34.28.9.10.1 החלטה: כן, בתעבורה ובמנוחה באמצעות KMS policy מאושרת, עם Keys נפרדים לסביבה/רגישות, Rotation ו־Break-glass. הצפנה ללא יכולת Restore אינה Evidence.

34.28.9.10.2 Restore מוכיח backupId, manifest/data digests, KMS identity, isolation, integrity, RPO/RTO ו־re-deletion obligations.

34.28.9.10.3 מיפוי: 11.9 ו־28.6–28.12. סטטוס: Covered; live AWS/restore evidence Blocked external.

34.28.10 שאלות Billing ו־Subscriptions Q76–Q83.

34.28.10.1 Q76 — בחירת חברת סליקה.

34.28.10.1.1 החלטה: Pilot ידני או חינמי ללא Gateway חי ועם `activeProvider=none`. לאחר Pilot PayPlus הוא primary-discovery candidate, Tranzila alternate, Paddle dormant אלא אם מתקבל Eligibility exception כתוב, ו־Stripe dormant כל עוד Israel business location אינו נתמך. לעולם רק Provider אחד פעיל.

34.28.10.1.2 הפעלה דורשת Entity/KYC, Country support, Tax/Invoice/Refund, Payout, Pricing, DPA, Webhook ו־Reconciliation evidence. כשל באישור משאיר activeProvider none.

34.28.10.1.3 מיפוי: 5.5 ו־24.5–24.16. סטטוס: Technical direction Covered; live provider Blocked external.

34.28.10.2 Q77 — חשבונית אוטומטית.

34.28.10.2.1 החלטה: ב־Pilot חשבונית מופקת רק במערכת הנהלת חשבונות ישראלית מאושרת ועל ידי בעל סמכות; Connect אינו ממציא Invoice. אם התהליך אינו מאושר, Pilot חינמי.

34.28.10.2.2 לאחר בחירת Provider חי, Finance ויועץ מס קובעים Seller/Merchant of record, אם מסמך הספק מספק או נדרש מסמך מקומי/מספר הקצאה; Automation מופעלת רק לאחר Reconciliation ו־legal retention.

34.28.10.2.3 מיפוי: 24.5, 24.13 ו־34.30.4. סטטוס: Safe default Covered; accounting system/approval Blocked external.

34.28.10.3 Q78 — האם המחירים כוללים מע״מ.

34.28.10.3.1 החלטה: ל־Israel B2B, ה־Catalog מציג מחיר בסיס ובבירור את התוספת מע״מ כחוק, וכן Total לפני התחייבות. אין Label עמום של מחיר כולל אם ה־Provider/ישות מטפלים במס אחרת.

34.28.10.3.2 Tax behavior הוא חלק מ־Price version וקשור ל־Customer country/type; Finance/Tax מאשרים ניסוח, rounding ו־Invoice לפני פרסום.

34.28.10.3.3 מיפוי: 24.7, 24.13 ו־34.30.4. סטטוס: Recommendation selected; formal tax sign-off Blocked external.

34.28.10.4 Q79 — כמה ניסיונות חיוב חוזר.

34.28.10.4.1 החלטה: ברירת המחדל היא שלושה ניסיונות כוללים בתוך שבעה ימים, דרך מנגנון הספק הפעיל, עם הודעה לאחר כל כשל ובלי ליצור Checkout/Subscription כפולים.

34.28.10.4.2 Provider smart retries מותרים רק כאשר ה־Policy snapshot מתעד את הלו״ז האפקטיבי; Event duplicate/out-of-order אינו מגדיל Attempt count.

34.28.10.4.3 מיפוי: 24.9–24.12 ו־34.30.4. סטטוס: Technical policy selected; Finance/Legal/provider configuration required.

34.28.10.5 Q80 — מתי חשבון נחסם עקב אי־תשלום.

34.28.10.5.1 החלטה: ברירת המחדל היא שכשל ראשון יוצר Past due והתראות; לאחר שבעה ימים ללא תשלום נחסמות פעולות חדשות בעלות עלות כגון Campaign, AI ו־Upload והחשבון עובר Read-only; לאחר 30 ימים הוא Suspended.

34.28.10.5.2 Inbound facts, Export/Privacy request ודרך לעדכון תשלום נשארים זמינים לפי Security/Legal. חזרה לפעילות דורשת Payment fact מאומת ו־reconciliation; אין מחיקה אוטומטית.

34.28.10.5.3 מיפוי: 24.10–24.12, 26.8 ו־34.30.4. סטטוס: Technical default selected; Commercial/Legal sign-off required.

34.28.10.6 Q81 — Proration בשינוי חבילה.

34.28.10.6.1 החלטה: Upgrade יכול להיכנס מיידית עם Proration שמחושב על ידי הספק ומאומת מקומית; Downgrade נכנס במחזור הבא. ביטול חידוש אינו מוחק Entitlement שכבר שולם עד סוף התקופה.

34.28.10.6.2 Credits, tax, currency, usage reset ו־refund נלקחים מ־Provider fact ו־Price version; Connect אינו מחשב כסף מחדש באופן עצמאי.

34.28.10.6.3 מיפוי: 24.6–24.12 ו־34.30.4. סטטוס: Decision Covered; provider contract tests required.

34.28.10.7 Q82 — החזר כספי.

34.28.10.7.1 החלטה: Refund הוא Workflow ידני ומורשה ב־GA הראשונה, לפי Policy משפטית מפורסמת. הוא תומך Full/partial, Reason, Approver, Provider reference, Credit document, Entitlement effect ו־Audit.

34.28.10.7.2 Redirect או Support note אינם Refund fact. Provider event ו־Reconciliation סוגרים את המצב; Chargeback מטופל בנפרד.

34.28.10.7.3 מיפוי: 24.10–24.13, 25.9 ו־34.30.4. סטטוס: Engineering direction Covered; eligibility/terms Blocked external.

34.28.10.8 Q83 — Coupons.

34.28.10.8.1 החלטה: אין Coupons ב־Pilot או ב־GA הראשונה. לאחר Billing יציב ניתן להשתמש ב־Provider-native discount בלבד, עם Scope, Expiry, Redemption limit, stacking, currency/tax, abuse controls ו־Audit.

34.28.10.8.2 Coupon לעולם אינו מעניק Feature מעבר ל־Entitlement registry ואינו עוקף Account/tenant binding.

34.28.10.8.3 מיפוי: 24.7, 32.10 ו־34.30.22.9. סטטוס: Explicitly out of scope until post-GA evidence.

34.29 מטריצת עקיבות קנונית ל־SPEC-01–SPEC-27 מן ה־PDF.

34.29.1 כלל ה־SPEC.

34.29.1.1 כל SPEC להלן נחשב Covered by plan בלבד, לא Implemented ולא Ready. בעת Gate 1 יוחלף הסטטוס לפי Evidence של הקוד והסביבה.

34.29.1.2 לכל SPEC ייווצר Record מכונתי עם Source hash, Section/task, Owner, Status, Test, Evidence ו־Gate. אין לסגור SPEC על בסיס UI בלבד.

34.29.2 SPEC-01 — SaaS Multi-tenant ממופה לסעיפים 9, 11–13, 15–18, 21, 26–29, 34.30.7 ו־34.32. תנאי הקבלה הוא Cross-tenant denial בכל API, DB, Queue, Storage, Search, Export ו־Telemetry. סטטוס תכנוני: Covered.

34.29.3 SPEC-02 — Landing page וחבילות ממופה ל־24.7, 30.11–30.12 ולחבילת 34.30.2. תנאי הקבלה הוא Pricing מאושר, Mobile/RTL/keyboard, no deceptive claim ו־Browser test. סטטוס: Work package required.

34.29.4 SPEC-03 — Checkout וחיוב חודשי ממופה ל־24.6–24.16 ולחבילות 34.30.2, 34.30.4 ו־34.30.12. הוא כבוי ב־Pilot ומופעל רק לאחר Provider יחיד, Hosted checkout, Webhook, Entitlement, PCI ו־Finance gate. סטטוס: External blocked for live.

34.29.5 SPEC-04 — Failed payment, Retry והשעיה ממופה ל־24.9–24.12, 34.28.10.4–34.28.10.5 ולחבילת 34.30.4. תנאי הקבלה הוא Dunning timeline, notices, read-only/suspend/resume ו־Reconciliation. סטטוס: Work package required after Pilot.

34.29.6 SPEC-05 — רשימת מנויים וסינון Admin ממופה ל־25, 29.8, 30.12 ולחבילת 34.30.3. תנאי הקבלה הוא Server-side search/filter/keyset ו־Staging authorization. סטטוס: Work package required.

34.29.7 SPEC-06 — יצירת מנוי ידני ממופה ל־24.5, 25.9 ולחבילת 34.30.3. תנאי הקבלה הוא Expected version, Plan revision, TTL, Approver, Audit ו־Tenant isolation. סטטוס: Covered by plan.

34.29.8 SPEC-07 — הארכה, ביטול והיסטוריה ממופה ל־24.5, 24.10–24.12, 25.9 ולחבילות 34.30.3–34.30.4. תנאי הקבלה הוא Immutable lifecycle events ו־concurrency. סטטוס: Covered by plan.

34.29.9 SPEC-08 — עריכת לקוח, חבילה, מגבלות ופרטי קשר ממופה ל־18, 24.7/24.11, 25 ולחבילת 34.30.3. תנאי הקבלה הוא Field ownership, expected version, capability, audit ו־no cross-tenant. סטטוס: Work package required.

34.29.10 SPEC-09 — Facebook Embedded Signup ממופה ל־14.5–14.10 ולחבילות 34.30.2 ו־34.30.21. תנאי הקבלה הוא SDK/origin/state/code exchange, asset ownership ו־Test WABA evidence. סטטוס: External blocked for live.

34.29.11 SPEC-10 — יצירה ושליחת Templates לאישור ממופה לסעיפים 19, 15 ו־17. תנאי הקבלה הוא immutable version, Meta identity/status, one-attempt submit, reconciliation ו־live approved template. סטטוס: External blocked for live.

34.29.12 SPEC-11 — נמענים במאגר פנימי ממופה לסעיף 18. תנאי הקבלה הוא Contact/Consent/Suppression/Tags/Lists isolation ו־DSAR. סטטוס: Covered by plan.

34.29.13 SPEC-12 — CSV/XLSX import ממופה ל־18.8–18.9 ולחבילת 34.30.9. CSV נדרש ל־Gate 13 ול־Core pilot; XLSX נדרש ל־Gate 30 כאשר Full specification נמצא ב־Manifest. סטטוס: Split scope, both planned.

34.29.14 SPEC-13 — Segments לפי Tags ממופה ל־18.10 ו־20.8. תנאי הקבלה הוא Allowlisted operators, parameterized query, snapshot/version, cost budget ו־tenant isolation. סטטוס: Covered.

34.29.15 SPEC-14 — Bulk template send ממופה לסעיפים 16–20. תנאי הקבלה הוא Consent, Template lifecycle, Capacity, preflight, maker-checker, one-attempt, Pause/Kill ו־live Meta evidence. סטטוס: External blocked for live.

34.29.16 SPEC-15 — דוח Sent/Delivered/Read/Failed ממופה ל־15.7–15.8, 20.9–20.11 ו־34.30.7. תנאי הקבלה הוא Monotonic webhook reducer ו־Provider reconciliation. סטטוס: Covered by plan.

34.29.17 SPEC-16 — תזמון חד־פעמי ממופה ל־20.7 ול־11.8. תנאי הקבלה הוא UTC+timezone, DST, duplicate scheduler, cancel boundary ו־restart. סטטוס: Covered.

34.29.18 SPEC-17 — Recurring Campaigns ממופה ל־D24, 32.12 ולחבילת 34.30.10. הוא כבוי ב־Pilot אך אינו נמחק מן המוצר המלא. סטטוס: Planned after Pilot.

34.29.19 SPEC-18 — Flow Builder Drag-and-drop ממופה ל־22.5–22.13, 29.8 ו־30.7. תנאי הקבלה הוא keyboard alternative, deterministic compile, save/publish/simulate ו־Staging run. סטטוס: Covered by plan.

34.29.20 SPEC-19 — Conditions, Text, Buttons ו־Human handoff ממופה ל־22.5, 22.9–22.10 ו־21.8. תנאי הקבלה הוא Registry מלא, all-node browser test ו־WABA path כאשר Live. סטטוס: Covered after allowlist correction.

34.29.21 SPEC-20 — System Prompt ממופה ל־23.5, 23.11–23.12 ו־34.30.8. תנאי הקבלה הוא immutable prompt version, no secret/system leakage, Eval, approval ו־rollback. סטטוס: Covered.

34.29.22 SPEC-21 — Knowledge Base ו־RAG ממופה לסעיף 23 ול־AWS/GuardDuty בסעיף 11.9. תנאי הקבלה הוא quarantine-to-clean chain, tenant retrieval, citations, deletion cascade ו־Evals. סטטוס: External blocked for live.

34.29.23 SPEC-22 — Bot/AI/Human fallback ממופה ל־21.8, 22.8 ו־23.10–23.12 ולחבילת 34.30.8. תנאי הקבלה הוא state drift, provider outage, stale approval, handoff ו־no duplicate send. סטטוס: Work package required.

34.29.24 SPEC-23 — WhatsApp רשמי שליחה וקבלה ממופה לסעיפים 14–17, 20–21 ו־34.30.21. תנאי הקבלה הוא Embedded Signup, verified webhook, one-attempt transport, provider facts ו־Test WABA. סטטוס: External blocked for live.

34.29.25 SPEC-24 — הצפנת Tokens ו־PCI-DSS ממופה ל־10.16, 11.8–11.9, 12.11, 14.7, 24.8–24.9 ולחבילת 34.30.12. תנאי הקבלה הוא scoped vault/KMS rotation ו־PCI responsibility evidence. סטטוס: Work package required.

34.29.26 SPEC-25 — Queue scalability ויעד Availability מספרי שטרם אושר ממופים ל־11.8, 16, 27–29 ולחבילת 34.30.13. ‏99.5% הוא ערך אפיון היסטורי בלבד ואינו Current target. תנאי הקבלה הוא live SLI, insufficient-data policy, harm/capacity analysis, load/crash/DLQ ו־Product/SRE approval. סטטוס: Work package required.

34.29.27 SPEC-26 — Data isolation, הרשאות ו־Audit ממופה לסעיפים 9–13, 25–26, 29, 34.30.7 ו־34.32. תנאי הקבלה הוא deny matrix, RLS/principals, immutable audit ו־adversarial Staging. סטטוס: Covered.

34.29.28 SPEC-27 — עברית, אנגלית וערבית ממופה ל־30.10–30.12 ולחבילת 34.30.11. תנאי הקבלה הוא כל Surface/State/Journey בשלוש שפות, RTL/LTR, Bidi security ו־human review. סטטוס: Work package required before full product claim.

34.30 חבילות עבודה משלימות שנחשפו בביקורת הכיסוי.

34.30.1 כלל האומדן לחבילות המשלימות.

34.30.1.1 טווחי הזמן להלן הם Allocation מתוך אומדני השלבים שאליהם הן ממופות, ואינם מתווספים אוטומטית לסכום 34.7. Gate 1 יבדוק אם האומדן המקורי כבר כלל אותן; רק Delta מוכח יתווסף.

34.30.1.2 לכל חבילה פעולה, תלות, Owner, זמן, Acceptance/Tests, Evidence, Rollback ו־Gate מפורשים. היא אינה יכולה לעבור לביצוע לפני Work package נקי לפי 34.15.

34.30.2 חבילת Onboarding בן עשרה צעדים והפרדת Public acquisition.

34.30.2.1 פעולה והפרדת Scope: ‏Core pilot הוא Invite-only assisted onboarding בלבד. סעיפים 34.30.2.1.1–34.30.2.1.2 הם Public/Full-GA ואסורים ב־Pilot; סעיף 34.30.2.1.3 משרת גם Invitation; סעיפים 34.30.2.1.4–34.30.2.1.14 הם האשף המשותף לאחר הזדהות והרשאה.

34.30.2.1.1 לבנות Landing/Pricing ציבוריים מעל Catalog מאושר, בלי מחיר, SLA, Security או Compliance claim שאין לו Evidence.

34.30.2.1.2 Registration אוספת רק Full name, Business name, Email ו־Phone הנדרשים; Password/authentication מטופלים ב־Clerk ולא נשמרים ב־Connect.

34.30.2.1.3 Confirmation email ו־Invitation משתמשים ב־Notification service, Link חד־פעמי, Expiry, no-open-redirect ו־Audit.

34.30.2.1.4 Step 1 שומר Business profile ב־State durable עם Expected version.

34.30.2.1.5 Step 2 מפעיל Meta Embedded Signup עם CSP/origin allowlist, nonce/state חד־פעמיים ו־window message source validation.

34.30.2.1.6 Step 3 בוחר WABA רק מתוך Assets שאומתו בשרת ושייכים ל־Business Portfolio המאושר.

34.30.2.1.7 Step 4 בוחר ורושם Phone number, verification status ו־account mode בלי לקבל Provider ID סמכותי מה־Browser. Phone שנוסף ב־Embedded Signup חייב Registration בתוך חלון 14 הימים המתועד של Meta, כולל Two-step verification PIN; Expiry או PIN חסר משאירים את Step חסום ודורשים Resume/Restart מאושר.

34.30.2.1.8 Step 5 מנהל Display name request/status מתוך Meta evidence; Pending אינו נראה Ready.

34.30.2.1.9 Step 6 יוצר Template draft ושולח לאישור דרך one-attempt/reconciliation path.

34.30.2.1.10 Step 7 מעלה אנשי קשר דרך Safe import ו־Consent declaration; Skip מותר ב־Pilot אם אין Campaign.

34.30.2.1.11 Step 8 מגדיר Flow/AI רק כאשר Gate היכולת סגור; אחרת הוא מוצג Disabled עם הסבר וניתן לדלג עליו.

34.30.2.1.12 Step 9 שולח Test יחיד רק ל־Recipient allowlist לאחר Preflight, Human confirmation ו־live rate evidence.

34.30.2.1.13 Step 10 מסמן Active רק אם כל צעדי החובה קיבלו Evidence; הוא אינו Boolean ידני.

34.30.2.1.14 כל Step מקבל state, entered/completed time, owner, evidence digest, resume, retry, cancel, help ו־error code. Refresh אינו משכפל side effect.

34.30.2.2 תלות: מסלול Core תלוי ב־13, 14–20, 30, Invitation ו־Notification package 34.30.5. מסלול Public תלוי בנוסף ב־Gate 26.3, Catalog/Pricing מאושרים, Abuse prevention, Legal/Marketing, Email domain ו־Gate 19.3 כאשר Checkout חי.

34.30.2.3 Owner: Product/Onboarding accountable; ראשה Frontend/Deployment, דוד Backend/Meta, טל ב־WhatsApp/Meta rate-limit review בלבד, רועי Accounts/Commercial; Security, Meta ו־Legal approvers דורשים מינוי או אישור חיצוני.

34.30.2.4 זמן: 32–52 שעות למסלול Core invite-only ועוד 12–20 שעות למסלול Public/GA, סך 44–72; ההקצאה חופפת לסעיפים 13–14, 20, 24, 30–31. ‏Meta review/wait נפרד.

34.30.2.5 Acceptance/Tests: Core בודק Admin invitation בלבד ודוחה Public signup; Full בודק Public registration/abuse בנפרד. שני המסלולים בודקים SDK wrong origin/source, state replay, callback duplicate, asset swap, 14-day registration expiry, missing/wrong PIN, cancel/resume בכל Step, refresh, expired session, screen-reader/mobile/RTL ושליחת Test אחת ללא Duplicate.

34.30.2.6 Evidence: Landing content approval, Catalog digest, Browser trace מושחר, Onboarding state matrix, Meta asset proof, Template status, Test recipient authorization ו־end-to-end report.

34.30.2.7 Rollback/Gate: לכבות Public registration, Meta ו־Test-send בנפרד, לשמור Progress read-only ולבטל Pending credentials/jobs. ‏Gate 26.1 דורש רק את מסלול Core invite-only; ‏Public acquisition נשאר Disabled evidence ואינו חלק מן המכנה. Gate 30 דורש את המסלול הציבורי רק אם Public acquisition נכלל ב־GA Scope. כל מסלול עובר רק כאשר המצבים החלים עליו ניתנים לשחזור ואין Side effect כפול.

34.30.3 חבילת System Admin, Tenant directory, Packages ו־Subscriptions.

34.30.3.1 פעולה.

34.30.3.1.1 לבנות Admin dashboard עם מנויים Active/inactive/trial, MRR רק ממקור Finance מאושר, failed payments, message outcomes, WhatsApp connections, AI usage ו־system alerts.

34.30.3.1.2 לבנות Tenant/subscriber directory עם Server-side search, package/status filters, keyset pagination ו־no count/timing leak בין realms.

34.30.3.1.3 לאפשר Create manual tenant/subscription, edit Business/contact fields, change package, extend, freeze, cancel, block ו־credit grant דרך Capability נפרדת לכל פעולה.

34.30.3.1.4 להציג immutable subscription, payment-reference ו־Admin action histories.

34.30.3.1.5 Package editor מנהל users, WhatsApp numbers, contacts, messages, bot flows, storage, AI, schedules ו־support entitlement ב־Versioned catalog.

34.30.3.1.6 System configuration UI אינה מציגה או מקבלת Secret value. היא מציגה רק provider status, key reference/revision, policy version ו־rotation action מורשית.

34.30.3.2 תלות: 12–13, 24–25, Audit catalog 34.30.7 ו־Product/Finance catalog.

34.30.3.3 Owner: Platform/Product accountable; Backend, Frontend, Security, Finance ו־Support reviewers.

34.30.3.4 זמן: 56–88 שעות, מוקצה מתוך סעיפים 24, 25, 29 ו־30.

34.30.3.5 Acceptance/Tests: כל Role×Action, wrong tenant, stale version, double submit, filter pagination, MRR reconciliation, secret input rejection, keyboard/dialog ו־Staging browser proof.

34.30.3.6 Evidence: Permission matrix, Admin browser suite, Catalog/version digests, financial reconciliation sample מושחר, Audit reconstruction ו־screenshots ללא PII.

34.30.3.7 Rollback/Gate: Admin mutations כבויות Feature-by-feature, Read-only directory נשארת, no rollback removes Audit. Gate 20 אינו נסגר בלי חבילה זו עבור Scope ה־Pilot.

34.30.4 חבילת Billing, Dunning, Invoice ו־Subscription communication.

34.30.4.1 פעולה.

34.30.4.1.1 ב־Pilot ליצור Manual order/invoice reference, Payment-pending/paid facts, Bank-transfer reconciliation, Entitlement grant ו־free-pilot fallback; אין PAN/CVV או חשבונית ביתית.

34.30.4.1.2 לאחר Provider activation לממש Trial/active/past_due/read_only/suspended/canceled/expired/blocked transitions באופן מונוטוני.

34.30.4.1.3 ליישם שלושה Attempt facts בתוך שבעה ימים לפי Q79, notifications, no duplicate provider request ו־Reconciliation לפני חסימה.

34.30.4.1.4 לאחר שבעה ימים לחסום cost-creating actions; לאחר 30 ימים לעבור Suspended; Payment fact מאומת מחזיר לפי Policy ולא לפי Redirect.

34.30.4.1.5 Upgrade immediate/prorated ו־Downgrade next-renewal לפי Q81; Refund/chargeback/credit note נפרדים.

34.30.4.1.6 Finance בודק מערכת חשבוניות מאושרת, VAT, מספר הקצאה, Currency, rounding, document owner ו־record retention.

34.30.4.2 תלות: 24, 25, 26, 34.30.5 Notification channel, Finance/Legal/Tax ו־Provider live רק אחרי Pilot.

34.30.4.3 Owner: Finance/Product accountable; Billing engineer responsible; Legal/Tax/Security approve; Support informed.

34.30.4.4 זמן: 40–72 שעות להשלמת Domain/UI/contract evidence, מוקצה מתוך סעיף 24; Provider onboarding/waits נפרדים.

34.30.4.5 Acceptance/Tests: duplicate/reordered/missing webhook, failed transfer match, retry count, grace boundaries, timezone, proration/refund, notification failure, provider outage ו־manual/free fallback.

34.30.4.6 Evidence: Finance sign-off, invoice/accounting system identity, Sandbox events, Dunning timeline, entitlement reconstruction, Provider reconciliation ו־customer communication templates.

34.30.4.7 Rollback/Gate: activeProvider חוזר none, Checkout נחסם, Existing events ממשיכים להיקלט לצורך reconciliation, Entitlement עובר Policy מאושרת; אין Provider failover אוטומטי.

34.30.5 חבילת Notification service.

34.30.5.1 פעולה.

34.30.5.1.1 להגדיר ל־Base ‏Event catalog לערוצי In-app ו־Email בלבד. אפשר להגדיר Contract/trigger עתידי לערוץ Browser ללא Route, Permission, Credential, Subscription, Worker או Delivery implementation; כל Browser/Web Push/Native push נשאר כבוי וממומש רק, אם יאושר, בחבילת PWA המותנית 35.8.21.

34.30.5.1.2 אירועי Security, invitation, billing, assignment, inbound, campaign, Meta disconnect, quota, file scan ו־incident מקבלים Severity, recipients, template, dedupe, expiry ו־fallback.

34.30.5.1.3 Payload אינו כולל Message body, Phone, Token או sensitive link. Deep link מאמת Session, Tenant ו־Capability מחדש.

34.30.5.1.4 ב־Base לא מבקשים Browser permission כלל. חבילת PWA עתידית, אם תופעל, תבקש הרשאה רק בעקבות פעולה מפורשת ובהקשר ברור; denial או revoke אינם שוברים Core workflow ואינם מפחיתים In-app availability.

34.30.5.1.5 Delivery הוא at-least-once עם deterministic identity, retry בטוח, suppression/preferences ו־DLQ; Security mandatory notices אינן ניתנות להשבתה אם הדין/Policy דורשים.

34.30.5.2 תלות Base: 13, 21, 24, 27, ‏Email provider decision ו־Privacy notice. אין תלות ב־Browser provider או ב־Gate ‏28.3; Browser/Web Push הם תלות של 35.8.21 בלבד.

34.30.5.3 Owner: Product/Platform; Security/Privacy ו־Accessibility reviewers.

34.30.5.4 זמן: 32–52 שעות, מוקצה מתוך סעיפים 21, 24, 27 ו־30.

34.30.5.5 Acceptance/Tests: duplicate, delayed, wrong tenant, revoked user, expired deep link, email bounce, preference race, PII scan, keyboard/live-region ו־DLQ recovery; בנוסף Base-absence test מוכיח אפס Browser permission request, אפס Push subscription, אפס Service Worker/Push route ואפס Browser credential. בדיקות Browser denial/revoke/delivery אינן Base evidence ונמצאות רק ב־35.8.21.

34.30.5.6 Evidence: Event/channel matrix ל־In-app/Email, ‏templates approval, provider contract, delivery/DLQ report, PII scan, UI accessibility record ו־Base-absence report חתום לכל Browser/Web Push authority. ‏Browser runtime evidence אינו נוצר ואינו נספר לפני 35.8.21 ו־Gate ‏28.3.

34.30.5.7 Rollback/Gate: לכבות Email בנפרד ולהשאיר In-app critical center; Security/incident notices עוברים fallback מאושר. Gates 16, 19.1 או 19.3 לפי Scope, ו־22 אינם נסגרים אם אירוע חובה נעלם. שינוי Browser/Web Push אינו חלק מ־Rollback Base ומחייב את מנגנון disable/unregister/revoke של 35.8.21.

34.30.6 חבילת Quick replies, Assignment timers ו־Inbox service policy.

34.30.6.1 פעולה.

34.30.6.1.1 לבנות Quick reply Tenant-scoped עם Category, Language, content version, variables, owner, active state ו־search.

34.30.6.1.2 Insert יוצר Draft ב־Composer ולא Send; Agent יכול לערוך, ו־final message עובר Validation/approval הרגילים.

34.30.6.1.3 למדוד Queue age, first human response, time waiting for customer ו־resolved time עם Clock/Timezone קנוניים.

34.30.6.1.4 Pilot מציג Internal target בלבד לאחר Baseline; אין SLA contract. Breach warning/assignment escalation אינם שולחים ללקוח ללא Template/Policy.

34.30.6.2 תלות: 21, 27, 30, Role matrix ו־Business hours calendar.

34.30.6.3 Owner: Inbox/Product; Support and SRE reviewers.

34.30.6.4 זמן: 24–40 שעות, מוקצה מתוך סעיפים 21, 27 ו־30.

34.30.6.5 Acceptance/Tests: stale reply version, forbidden variable, cross-tenant search, simultaneous insert/send, business-hours/DST, pending-customer pause, queue reassignment ו־screen reader.

34.30.6.6 Evidence: Quick-reply registry, content approval, timer decision table, baseline report, assignment/breach drill ו־accessibility test.

34.30.6.7 Rollback/Gate: לכבות Automated escalation בלי לפגוע ב־manual composer/assignment; Metrics נשמרים Read-only. מאחר ש־Q65 כולל Quick replies ב־Core pilot, Gate 16 דורש אותן; שינוי Scope מחייב Decision amendment ולא הסתרת UI בלבד.

34.30.7 חבילת Dashboards, Reports ו־Audit Event Catalog.

34.30.7.1 פעולה.

34.30.7.1.1 ליצור Event catalog קנוני לכל האירועים המפורטים ב־Q71 עם Schema version, sensitivity, actor, object, result, retention ו־viewer capability.

34.30.7.1.2 Customer dashboard מציג WhatsApp state, usage/balance, contacts, active campaigns, delivery/read/response rates, pending templates, waiting conversations, AI usage ו־limit warnings.

34.30.7.1.3 Campaign reports מציגים Sent fact, Delivered, Read, Failed, Unknown, Responses, Opt-outs, Cost ו־rates עם denominator/snapshot.

34.30.7.1.4 Bot/AI reports מציגים handled/handoff, response latency, approved/rejected drafts, cost, no-source/abstain, unanswered themes, flow drop-off ו־CSAT רק ממקור תקף.

34.30.7.1.5 System dashboard משתמש רק ב־read models/reconciliation; MRR/Finance data אינו מחושב מ־UI או webhook יחיד.

34.30.7.1.6 כל Chart מקבל Table/text equivalent; Export דורש capability, reason, limit, audit ו־formula neutralization.

34.30.7.2 תלות: 12.10, 20.11, 21, 23, 24, 25, 27 ו־Event quality proof.

34.30.7.3 Owner: Product analytics accountable; Data/Backend responsible; Finance, Privacy, Accessibility ו־SRE reviewers.

34.30.7.4 זמן: 56–96 שעות, מוקצה מתוך סעיפים 20, 23–25, 27 ו־30.

34.30.7.5 Acceptance/Tests: ledger-to-dashboard reconciliation, denominator/Unknown, late webhook, timezone, tenant isolation, large export, formula injection, role filtering, screen reader ו־empty/insufficient data.

34.30.7.6 Evidence: Event catalog, query contracts, reconciliation reports, browser/report suite, accessibility artifacts ו־Finance totals.

34.30.7.7 Rollback/Gate: Dashboard חוזר Read-only/Unavailable עם freshness reason; אין fallback לנתון משוער. Gates 15, 20, 26.1 ו־26.3 דורשים את הדוחות המתאימים ל־Scope.

34.30.8 חבילת AI approval ו־Fallback lifecycle.

34.30.8.1 פעולה.

34.30.8.1.1 Draft record כולל Tenant, Conversation, recipient, redacted context digest, Knowledge/index, prompt/model/policy versions, content digest, created time ו־Expiry.

34.30.8.1.2 Approver חייב capability, active assignment או permission מפורשת ו־MFA/reauth לפי סיכון.

34.30.8.1.3 Approval נקשר ל־Draft המדויק, נצרך פעם אחת אטומית ומבוטל על Edit, Expiry, Opt-out, conversation/assignee drift, policy/model/index/credential change או offboarding.

34.30.8.1.4 Send מבצע מחדש Consent, service window, quota, rate, template, tenant ו־credential checks; Approval אינו Provider permit.

34.30.8.1.5 Provider unavailable, unsafe output, no citation, low grounding, budget exhaustion או injection מעבירים ל־Human ולא למודל אחר.

34.30.8.2 תלות: 17, 21, 23, 25, 26 ו־OpenAI/Meta evidence.

34.30.8.3 Owner: AI/Product accountable; Backend responsible; Security, Privacy ו־Inbox review. טל מצטרף ל־Review רק אם ה־AI draft ממשיך למסלול WhatsApp send ומשנה rate/quality-limit behavior.

34.30.8.4 זמן: 32–52 שעות, מוקצה מתוך סעיפים 21, 23, 25 ו־29.

34.30.8.5 Acceptance/Tests: stale/edited/expired approval, duplicate consume, wrong tenant/conversation, opt-out race, approver offboard, model drift, provider timeout, injection ו־two-agent race.

34.30.8.6 Evidence: State matrix, approval ledger, negative/concurrency report, OpenAI/Meta staging trace ו־handoff rehearsal.

34.30.8.7 Rollback/Gate: AI feature flag off, pending Drafts expire, Human-only Inbox נשאר; אין replay של Approval. Gate 18.1 אינו נסגר בלי lifecycle זה; ‏Gate 18.2 נדרש בנוסף כאשר Knowledge/RAG/File pipeline נמצא ב־Scope.

34.30.9 חבילת XLSX import בטוחה למוצר המלא.

34.30.9.1 פעולה: להשתמש ב־Parser נעול ומעודכן בתוך Sandbox ללא Network; לקבל Worksheet יחיד גלוי, Values בלבד ו־Headers מאושרים; לחסום Macro, Formula, external link, hidden/multiple sheets, embedded object, unsupported type ו־resource bomb. התהליך ממשיך לאותו Preview/Mapping/Consent/atomic import של CSV.

34.30.9.2 תלות: Gate 13 ל־CSV, Scanner/Sandbox, dependency review ו־Load budget.

34.30.9.3 Owner: CRM/Backend; Security ו־QA approve.

34.30.9.4 זמן: 20–36 שעות, מוקצה למסלול post-Pilot בסעיפים 18, 29 ו־32.

34.30.9.5 Acceptance/Tests: xlsx valid, macro-enabled, formula, external link, hidden sheet, multiple sheets, zip bomb, huge shared strings, malformed archive, duplicate header, parser timeout ו־cross-tenant error report.

34.30.9.6 Evidence: Parser/version/SBOM, malicious corpus, resource measurements, parity with CSV ו־Staging import report.

34.30.9.7 Rollback/Gate: MIME XLSX חוזר Disabled בלי לפגוע ב־CSV; existing imported Contacts נשארים. SPEC-12 full אינו נסגר עד Evidence זה.

34.30.10 חבילת Recurring Campaigns לאחר Pilot.

34.30.10.1 פעולה.

34.30.10.1.1 להגדיר Series immutable revision עם RRULE subset allowlisted, timezone, start, optional end/count, holiday/business-hour policy ו־next occurrence.

34.30.10.1.2 לכל Occurrence ליצור identity דטרמיניסטית, claim fenced, Campaign run snapshot ו־independent approval לפי Policy.

34.30.10.1.3 Template, segment, consent, suppression, rate, quota, cost ו־credential נבדקים מחדש לכל Run.

34.30.10.1.4 Edit יוצר Revision החלה רק על occurrences עתידיים; Cancel occurrence ו־Cancel series נפרדים; in-flight אינו נמחק.

34.30.10.1.5 Scheduler restart, DST gap/repeat, late wake-up ו־two workers אינם יוצרים Run כפול.

34.30.10.2 תלות: Gate 15, D24 review, סף ביקוש משלם חתום לאחר Baseline לצורך הדומה, ו־Load/Support capacity מאושרים; הסף המספרי `unknown/unavailable` עד החלטת Product/Business owner שמיים.

34.30.10.3 Owner: Campaign/Product; Backend, Privacy ו־SRE approve. טל מאשר רק את Recurrence capacity, WhatsApp/Meta rate-limit evidence ו־Connect limiter policy.

34.30.10.4 זמן: 48–80 שעות לאחר החלטת 32.12; אינו חלק מ־Core pilot.

34.30.10.5 Acceptance/Tests: DST Jerusalem, no end, max occurrences, edit/cancel boundary, stale approval, duplicate scheduler, crash, template paused, opt-out before run ו־cost/rate change.

34.30.10.6 Evidence: Schema/state diagrams, deterministic occurrence vectors, scheduler/restart/load report, UX/browser tests ו־support runbook.

34.30.10.7 Rollback/Gate: Pause/Cancel series, block future claims ו־retain completed ledgers. Gate 27 מאשר את עדיפות ה־Roadmap ו־Gate 30 דורש את היכולת רק כאשר Full specification נמצא ב־GA Scope Manifest; D24 אינו משתנה אוטומטית.

34.30.11 חבילת תמיכה פונקציונלית בעברית, אנגלית וערבית.

34.30.11.1 פעולה: למפות כל Route, Component, Error, Empty/loading/disabled state, Email, Notification, Report, Onboarding step, Bot/AI setting ו־Legal surface ל־Catalog בשלוש השפות; להגדיר Locale fallback, formatter, RTL/LTR ו־content owner.

34.30.11.2 תלות: Critical journeys יציבים, Legal translations, Design system ו־Localization reviewers.

34.30.11.3 Owner: UX/Product; ראשה implementation; דובר/ת מקצועי/ת לכל שפה, Accessibility ו־Legal review.

34.30.11.4 זמן: 36–64 שעות, מוקצה מתוך סעיף 30; תרגום משפטי חיצוני נפרד.

34.30.11.5 Acceptance/Tests: three full locale journeys, no missing key, pseudo-expansion, plural/date/currency/name, mixed bidi, screen reader, mobile/reflow ו־language persistence through auth/invitation.

34.30.11.6 Evidence: Coverage manifest, translation approvals, Browser results בשלוש שפות, RTL/Bidi corpus ו־accessibility report.

34.30.11.7 Rollback/Gate: Locale פגום מוסתר עד תיקון ו־English fallback מוצג במפורש; אין Claim של תמיכה בערבית עד Gate 30 עם Full specification ב־Manifest. SPEC-27 full נסגר רק כאן.

34.30.12 חבילת PCI-DSS responsibility ו־payment-data boundary.

34.30.12.1 פעולה: למפות Card-data flow, Hosted checkout/portal, scripts/domains, webhooks, logs, support ו־incident; לקבוע Merchant/Provider responsibilities, PCI scope, SAQ/document required, attestation expiry ו־supplier evidence.

34.30.12.2 תלות: Provider יחיד נבחר, Finance/Legal/Security, Hosted checkout design ו־live domains.

34.30.12.3 Owner: Security accountable; Finance ו־Legal approve; Billing engineer responsible.

34.30.12.4 זמן: 12–24 שעות פנימיות ועוד assessor/provider lead time שאינו ידוע, מוקצה מתוך 24/26/29.

34.30.12.5 Acceptance/Tests: PAN/CVV/token in Browser/API/log/support bundle, malicious checkout origin, script inventory drift, webhook signature, incident tabletop ו־evidence expiry.

34.30.12.6 Evidence: Data-flow, provider PCI attestation, responsibility matrix, SAQ/legal determination, scan reports ו־annual review schedule.

34.30.12.7 Rollback/Gate: Checkout/portal כבויים ו־activeProvider none; Pilot manual path נשאר. Gate 19.3 חסום בלי החבילה.

34.30.13 חבילת Availability, ‏SLI ו־insufficient-data; היעד המספרי `unknown/unavailable` עד החלטת Product/SRE.

34.30.13.1 פעולה: לשמר את 99.5% רק כ־historical input, ולמדוד שני SLIs לפחות: user-critical request availability ו־accepted-work completion. Window, minimum sample, exclusions ו־dependency attribution נקבעים לאחר Baseline ואינם מומצאים מראש.

34.30.13.2 Pilot אינו מפרסם SLA. אם אין מספיק Requests/Observation, הסטטוס הוא insufficient-data ולא 100%; אין Green על אפס Traffic.

34.30.13.3 לאחר Baseline ו־harm/capacity analysis, Product/SRE מאשרים יעד מספרי ב־Decision record חדש, יחד עם Window, minimum sample, insufficient-data state, Error budget, alert thresholds ו־customer communication.

34.30.13.4 תלות: OTel/Better Stack live, Event quality, 2–4 שבועות Observation ו־On-call.

34.30.13.5 Owner: SRE accountable; Product, Support ו־Legal approve commercial wording.

34.30.13.6 זמן: 20–36 שעות configuration/validation, מוקצה מתוך 27, 29 ו־31; observation נפרד.

34.30.13.7 Acceptance/Evidence/Rollback: approved real journey evidence, official provider sandbox probes או deterministic non-business availability probes לפי MP-F050, denominator/minimum-sample policy, outage/burn alert, dashboard export, alert drill ו־SLO doc; false telemetry returns Unknown and no SLA claim. Gates 22, 26.1 ו־26.3 דורשים Live proof לפי השלב.

34.30.14 חבילת D29 Product analytics ותעדוף אחרי Pilot.

34.30.14.1 פעולה: למדוד Activation, time-to-value, core-workflow frequency, success/failure, support burden, willingness to pay, retention intention, reliability/security debt ו־customer requests עם Data-quality checks.

34.30.14.2 נוסחת הדירוג המחייבת היא Paying tenants affected כפול workflow frequency כפול measured outcome כפול confidence, חלקי effort. אין RICE/WSJF חלופי ללא Decision amendment.

34.30.14.3 Feature branch נפתח רק לאחר סף ביקוש משלם חתום המבוסס על Baseline ומאמת אותה עבודה מרכזית, אלא אם מדובר ב־P0/P1, חובה משפטית או Provider deprecation. הערך המספרי ומשך המדידה `unknown/unavailable` עד החלטת Product/Business owner שמיים.

34.30.14.4 במחזור הראשון אחרי Pilot, 50% מן הקיבולת שמורים ל־Reliability, Security ו־Compliance. ירידה לרצפה של 30% מותרת רק אחרי ארבעה שבועות בתוך SLO, אפס P0/P1 ו־Restore/Rollback עוברים.

34.30.14.5 תלות: Pilot analytics איכותי, Finance customer status ו־Support tagging.

34.30.14.6 Owner וזמן: Product accountable; Engineering/Security/SRE/Finance review; 24–40 שעות מתוך סעיף 32 לכל מחזור תעדוף ראשון.

34.30.14.7 Acceptance/Evidence/Rollback/Gate: raw metrics→score reconstruction, confidence/source, no PII, הוכחת עמידה בסף הביקוש החתום שנקבע לאחר Baseline, capacity allocation report ו־signed roadmap; Feature ללא threshold חוזרת discovery. Gate 27 אינו נסגר בלעדיהם.

34.30.15 חבילת D30 Public API, outgoing Webhooks, Integrations, Enterprise ו־Mobile gates.

34.30.15.1 פעולה.

34.30.15.1.1 להקפיא API contract: versioned resources/commands, opaque IDs, tenant auth/RBAC, idempotency, cursor pagination, UTC, deprecation, Retry-After, RFC 9457 ו־private OpenAPI.

34.30.15.1.2 להקפיא outgoing webhook contract: transactional outbox, versioned envelope, at-least-once, timestamp, HMAC/key ID/rotation, delivery log, retry/DLQ, replay guidance ו־no PII default.

34.30.15.1.3 להקפיא Connector contract: scope, source-of-truth, sync cursor, mapping version, conflict policy, rate/backoff, secret reference, audit ו־kill switch.

34.30.15.1.4 Public API נפתח רק לאחר סף ביקוש משלם חתום לאותו צורך ותוכנית Abuse/Quota/Pricing/Versioning/Security; הערך המספרי `unknown/unavailable` עד Baseline והחלטת Product/Business owner שמיים.

34.30.15.1.5 Connector נבנה רק לאחר סף ביקוש משלם חתום לאותו Connector, ‏Sandbox, conflict map ו־Support owner; הערך המספרי `unknown/unavailable` עד Baseline והחלטת Product/Business owner שמיים.

34.30.15.1.6 Enterprise נפתח רק לאחר סף ביקוש חתום המבוסס על Baseline אמיתי לאותו צורך, ובנוסף Design partner משלם או חוזה מחייב, Architecture/Security/Legal review ו־Support owner. מספר ה־Prospects ומשך המדידה נשארים `unknown/unavailable` עד החלטה חתומה של Product/Business owner שמיים; עד אז היכולת כבויה.

34.30.15.1.7 Native mobile נפתח רק לאחר הוכחת צורך Native-only שאינו נפתר ב־Responsive Web וגם ב־PWA מאושרת כאשר היא ישימה, וסף ביקוש משלם חתום לאותו צורך; הערך המספרי `unknown/unavailable` עד Baseline והחלטת Product/Business owner שמיים.

34.30.15.2 תלות: Gates 26.3 ו־27, ‏D29 data ו־Security/Legal review.

34.30.15.3 Owner: Product/Architecture; Security, SRE, Support, Legal ו־Finance approve.

34.30.15.4 זמן: Contract preparation 36–60 שעות מתוך סעיף 33; implementation נשאר באומדני 33 לפי capability שאושרה.

34.30.15.5 Acceptance/Tests: BOLA/BFLA, replay, signature rotation, pagination drift, version compatibility, rate/cost abuse, connector conflict, tenant offboarding ו־mobile cache/revocation.

34.30.15.6 Evidence: paying-demand proof, signed contract/ADR, OpenAPI/schema, threat model, sandbox/conformance suite, support capacity ו־exit vote.

34.30.15.7 Rollback/Gate: per-tenant disable, key revoke, queue drain, deprecation notice וחזרה ל־React Web responsive או ל־PWA מאושרת אם היא קיימת ומתאימה; אין Capability launch אם threshold נשמט. Gates 28.1–28.5 משתמשים בדיוק בספים לעיל.

34.30.15.8 חבילת PWA אינה משתמעת מ־React responsive ואינה נכנסת ל־Base. היא מפוצלת ל־Gate 28.3.1 Installability, ‏28.3.2 Service-worker fetch/cache, ‏28.3.3 Offline data, ‏28.3.4 Push/Notification ו־28.3.5 Background sync. לכל Gate יש Trigger, Browser/OS/Push-service matrix לפי DS-025, Contract, Build, ארבע משפחות בדיקה, Observe, Rollback/Decommission, Evidence ו־Review נפרדים. כשל או חוסר תמיכה ב־Sub-gate אחד משאיר רק אותו Sub-gate כבוי; Responsive Web חוזר למצב Network-only. ‏FR-067–FR-076 הם מקורות תכנון ואינם הוכחת Browser support; FR-074 מתועד כ־Draft שאינו Standard.

34.30.16 חבילת Vulnerability management, Coverage ו־Release blocking.

34.30.16.1 פעולה.

34.30.16.1.1 כל Finding מקבל מזהה דטרמיניסטי, Source/tool/version, affected asset/release, exploitability, reachability, tenant/data/side-effect impact, CWE/CVE כאשר קיים, Owner, status, due milestone ו־retest.

34.30.16.1.2 `P0` כולל Tenant breakout, Secret/credential exposure, שליחה או חיוב לא מורשים, אובדן/השחתת מידע, active exploitation או כשל Recovery מהותי. הוא מפעיל Incident, עוצר Release/Pilot ומכבה את היכולת עד Containment ו־Retest.

34.30.16.1.3 Critical או High reachable, כל Finding רלוונטי ב־CISA KEV וכל Secret אמיתי חוסמים Merge/Release. Critical אינו מקבל Exception ליכולת חיה; High יכול לקבל חריג זמני רק אם Reachability הופרכה או היכולת כבויה ומבודדת.

34.30.16.1.4 זמני המדיניות מרגע אימות Finding חי הם: P0 containment בתוך שעה ו־mitigation בתוך 24 שעות; Critical תיקון בתוך 24 שעות; High בתוך שבעה ימים; Medium בתוך 30 ימים; Low בתוך 90 ימים. זמן שאינו ניתן לעמידה מחייב Disable, Compensating control ו־Escalation, לא שינוי Severity.

34.30.16.1.5 Risk acceptance דורש Security, Product ו־Owner, Scope, exploitability proof, compensation, expiry ו־retest. הוא פג אוטומטית; אין Exception תמידי או Exception ל־P0.

34.30.16.1.6 CI משלב Secret scanning, SAST, SCA, License, IaC, Container, SBOM, lockfile/provenance ו־targeted DAST. False positive נסגר רק עם Reproducer/Reachability evidence ו־Reviewer נפרד.

34.30.16.1.7 בדיקות שקוראות Source כמחרוזת מסווגות `source guard` ואינן נספרות כ־Runtime behavior. Gate 24 דורש Coverage report לפי Domain ו־critical behavior; Threshold מספרי נקבע אחרי Baseline, אך כל Critical journey ו־P0 invariant חייבים לפחות Positive, Negative ו־failure-path test.

34.30.16.2 תלות: Gate 1 inventory, Gate 2 CI/SBOM, Threat register, Staging ו־Security owner.

34.30.16.3 Owner: Security accountable; Domain owner responsible; Product/SRE/Privacy approve חריג לפי השפעה.

34.30.16.4 זמן: 28–48 שעות policy/tooling/triage baseline ועוד תיקון Findings לפי ממצא; מוקצה מתוך סעיפים 7, 29 ו־31.

34.30.16.5 Acceptance/Tests: known vulnerable fixture בטוח, secret canary, reachable/unreachable dependency, expired exception, scanner outage, false-positive evidence, coverage misclassification ו־clean-checkout rerun.

34.30.16.6 Evidence: signed policy, tool/config/version inventory, SBOM, triage ledger, exceptions, remediation/retest reports ו־release-block transcript.

34.30.16.7 Rollback/Gate: Scanner חדש שאינו יציב חוזר Advisory אך scanner הקנוני נשאר חוסם; Capability פגיעה כבויה. Gate 24/26.1 אינו נסגר עם P0, Critical/High reachable או Evidence stale.

34.30.17 חבילת Clerk operational readiness.

34.30.17.1 פעולה.

34.30.17.1.1 ליצור Clerk application/instance נפרד לכל סביבה, לשמור Plan/settings export מושחר ולקשור Publishable/Secret keys ל־Environment המדויק.

34.30.17.1.2 להגדיר `authorizedParties` כרשימת HTTPS exact origins מאושרת לכל Environment; Preview אינו Production party ו־wildcard/subdomain inheritance אסורים.

34.30.17.1.3 ב־Pilot Organization הראשונה נוצרת רק בשרת על ידי Onboarding command מאושר; אין Personal workspace, auto-organization או authority מתוך active-organization claim בלבד.

34.30.17.1.4 Admin invitation משתמש ב־D01, Admin allowlist ו־email/organization binding; קבלה דורשת Server reconciliation, Membership active ו־MFA task שהושלם.

34.30.17.1.5 D17-A1 מחייב MFA לכל משתמש אנושי ב־Pilot, ללא תלות בגודל ה־Allowlist שיאושר; Owner/Admin/Support/System Admin מקבלים גם Step-up/Reauthentication לפעולות P0/P1.

34.30.17.1.6 Webhook Clerk נבדק על raw body/signature, replay, idempotency, ordering ו־unknown event. Runtime אינו מעניק Access עד reconciliation מול Clerk ו־Connect membership state.

34.30.17.1.7 לבנות Backfill/reconciliation ל־Tenant/User/Organization/Role קיימים, Quarantine לרשומה עמומה ו־Offboarding המבטל Session, Membership, invitations ו־JIT grants.

34.30.17.1.8 Permission UI הוא עזר בלבד; Railway API פותר Membership/Role/Capability/Tenant בכל בקשה ו־PostgreSQL RLS נשאר שכבה עצמאית.

34.30.17.2 תלות: D01/D17-A1, Domains, Clerk plan/account, Role matrix, PostgreSQL tenant model ו־Notification path.

34.30.17.3 Owner: Identity/Security accountable; Backend responsible; Frontend, Support ו־Privacy review.

34.30.17.4 זמן: 28–48 שעות, מוקצה מתוך סעיפים 11, 13, 25, 29 ו־31; Account review חיצוני נפרד.

34.30.17.5 Acceptance/Tests: wrong party/subdomain/preview, no active organization, organization tab switch, invited email mismatch, expired/replayed invitation, MFA incomplete, stale role, webhook reorder/duplicate, offboarded session ו־cross-tenant object.

34.30.17.6 Evidence: settings export, party matrix, Organization/Membership reconciliation, MFA/Step-up screenshots מושחרים, webhook report, denial suite ו־browser onboarding/offboarding trace.

34.30.17.7 Rollback/Gate: Registration/invitations נסגרים, active sessions revoked ו־Support manual recovery נשאר dual-approved; אין fallback ל־local password או Client-side role. Gate 8/26.1 חסום בלי Live evidence.

34.30.18 חבילת Closed Pilot Charter מספרי.

34.30.18.1 פעולה וגבול: להגדיר ולאכוף Tenant אחד, WABA אחד ו־Phone Number אחד. המשתמשים האנושיים, ה־Recipients וה־Campaigns יהיו Allowlists קטנים, שמיים, מאושרי Consent ומוגבלים ב־Charter; המספר המרבי המדויק לכל קבוצה הוא `unknown/unavailable` עד חתימת Product, Legal, Support ו־WhatsApp safety. לפני חתימה, המכסה החיה לכל קבוצה היא אפס.

34.30.18.2 Connect hard cap הוא עד 25 ניסיונות Outbound מצטברים בכל חלון מתגלגל של 24 שעות ועד Campaign אחד ביום. ה־Effective cap הוא המינימום בין 25, ‏Meta live capacity, quality restriction, tested sustainable capacity, Consent count, Plan quota ו־Budget cap; Unknown בכל רכיב נותן אפס.

34.30.18.3 אין Recurring, A/B, Porting, Public signup, arbitrary recipient, unattended bot send, AI send, live card checkout, customer API, Connector או Native mobile. Flow/AI/Knowledge יכולים להיות Disabled לחלוטין לפי 31.3.

34.30.18.4 תקופת Canary ראשונה היא 14 ימים; הארכה אחת של 14 ימים דורשת Review חתום. Outbound מותר רק בימים א׳–ה׳, 09:00–17:00 Asia/Jerusalem, כאשר Primary ו־Backup זמינים; חריגה דורשת Incident/Go-No-Go approval.

34.30.18.5 תנאי הצלחה טכניים: אפס P0/P1, אפס Recipient/Credential/Tenant mismatch, אפס Provider attempt כפול, 100% Webhook verification, 100% Outbound ledger reconciliation, Restore/Rollback drill עובר וכל Critical journey עובר Browser acceptance.

34.30.18.6 תנאי הצלחה מוצריים מוצעים: לפחות 90% מן המשימות הקריטיות שהוקצו למשתתפים הושלמו ללא התערבות מפתח, כל Failure קיבל הסבר/Recovery ברור, ושיחת Review אחת לפחות התקיימה עם כל Role פעיל. Product רשאי להחמיר לפני פתיחה אך לא להקל בלי Decision record.

34.30.18.7 Stop מיידי מופעל על כל Unauthorized/duplicate/wrong-recipient send, Opt-out ignored, Tenant leak, Secret leak, data loss/corruption, Provider policy warning מהותי, Restore failure, P0, On-call unavailable או Evidence stale. לאחר Stop אין Resume לפי Timer; נדרש Root cause, Fix, Retest ו־Go/No-Go חדש.

34.30.18.8 השמות המדויקים של Tenant, WABA, Phone, Allowlist המשתמשים, Allowlist ה־Recipients, Primary/Backup, תאריך התחלה וערוץ חירום הם `unknown/unavailable` עד הזנה מאושרת; אין להשתמש בנתוני דוגמה. גם המספר המרבי בכל Allowlist נשאר `unknown/unavailable` עד Charter חתום; כל הערכים חייבים להיסגר לפני Gate 26.1.

34.30.18.9 תלות: Gates Core לפי 31.3, Legal/Meta/Support approvals, live rate evidence, Budget ו־Restore.

34.30.18.10 Owner: Product accountable ו־Operational Go/No-Go approver עדיין דורשים שמות; Tal מאשר את רכיב מגבלות WhatsApp/Meta ומדיניות Connect rate limiting; David Meta/backend, Rasha deployment/frontend ו־Roy accounts/commercial; Security, Privacy/Legal ו־Primary/Backup operational עדיין דורשים שמות.

34.30.18.11 זמן: 8–16 שעות להכנה/tabletop/חתימות ועוד 14–28 ימי Calendar observation; מוקצה מתוך סעיף 31.

34.30.18.12 Acceptance/Evidence/Rollback/Gate: Charter חתום, allowlists מושחרות, live-cap snapshot, support roster, dry run, stop/resume drill ו־daily reconciliation; Rollback הוא Kill switches/read-only/revoke. Gate 26.1 אינו נסגר עם שדה שמי או תאריך חסר.

34.30.19 חבילת WordPress legacy discovery מאובטחת.

34.30.19.1 פעולה: לקבל עותק רק מבעלים מורשה ובערוץ מאושר, לחשב Digest, לבצע Secret/PII/malware/license scan לפני פתיחה, ולנתח Read-only את Architecture, Meta endpoints, auth, webhook, data model, rate handling ו־UI behavior.

34.30.19.2 אין להריץ את היישום, להשתמש ב־Credential, להתחבר ל־Production, להעתיק Database, להעלות קוד ל־AI/SaaS או לבצע Reverse engineering שאינו מורשה. Secret שנמצא מבוטל/מסובב ואינו נכנס ל־Connect.

34.30.19.3 הפלט הוא Compatibility/lessons matrix בלבד: reuse, rewrite, reject, legal/license unknown ו־official Meta equivalent. WordPress אינו מקור סמכות ל־API או Security ואינו חוסם את החלטת Cloud API הרשמי.

34.30.19.4 אם עותק מאושר ונקי אינו מתקבל עד Gate 4, המשימה מסומנת `superseded by official Cloud API design` באישור David, ‏Product ו־Security owners השמיים; טל מאשר רק ממצא שמשנה מגבלת WhatsApp/Meta או Connect rate policy. אין לעכב Architecture או להשתמש בהיעדרו כהצדקה למסלול לא־רשמי.

34.30.19.5 תלות: בעל קוד/מידע, Legal/license permission, secure intake ו־Security reviewer.

34.30.19.6 Owner/time: David discovery responsible; Security reviewer ו־owner/legal approver הם `unknown/unavailable`; Tal הוא Consulted רק לממצאים המשפיעים על מגבלות WhatsApp/Meta או Connect rate limiting; 8–16 שעות לאחר קבלת עותק, זמן חיצוני לא ידוע.

34.30.19.7 Acceptance/Evidence/Rollback/Gate: signed permission, digest, scan report, matrix ו־no-secret/no-PII export; Rollback מוחק/מבודד את העותק לפי הרשאה ו־Retention. שום Legacy finding אינו מפעיל Adapter.

34.30.20 חבילת Developer endpoints, AnyDesk וחשבונות AI/GitHub.

34.30.20.1 פעולה.

34.30.20.1.1 כל מפתח משתמש בחשבון GitHub שמי עם MFA, OS user אישי, Disk encryption, Screen lock, current patches, EDR/antimalware מאושר, SSH/signing key אישי ו־Least privilege. חשבון או Password משותף אסורים.

34.30.20.1.2 Claude/OpenAI/Codex וכלי AI משתמשים ב־Company Team/Business account שאושר ל־Source/Data; Personal account אינו מקבל קוד, Spec, Log, Customer data או Secret של החברה.

34.30.20.1.3 AnyDesk למחשב המשרד מותר רק ממכשיר מאושר, עם MFA/device allowlist, Session attended כברירת מחדל, Unattended access כבוי אלא אם אושר, Clipboard/file transfer מצומצמים, עדכון Client, Audit ו־Session termination. אין למסור Password או Token בצ׳אט.

34.30.20.1.4 Repository clone, `.env`, SSH key, browser session, CLI token ו־Cloud credentials אינם מועתקים בין אנשים. Secrets מגיעים מ־Vault לסביבה הנכונה ונמחקים/מסובבים ב־Offboarding.

34.30.20.1.5 כל Upload לכלי AI עובר Data classification, provider contract/retention review ו־Secret/PII scan; Output נחשב Untrusted ונבדק לפני Commit.

34.30.20.1.6 Lost/stolen device, suspicious remote session, leaked token או malware מפעילים Session revoke, Key rotation, GitHub/provider audit, host isolation ו־Incident runbook.

34.30.20.2 תלות: Company accounts, Device owners, Security policy, Vault ו־Offboarding roster.

34.30.20.3 Owner: Security accountable; Roy account procurement; כל מפתח responsible; HR/Legal/IT approve לפי צורך.

34.30.20.4 זמן: 16–28 שעות setup/audit ראשוני ועוד 2–4 שעות לחודש; Hardware/license waits נפרדים.

34.30.20.5 Acceptance/Tests: compromised-personal-account tabletop, revoked collaborator, lost device, AnyDesk unknown device, clipboard/transfer restriction, leaked canary secret, AI upload rejection ו־offboarding drill.

34.30.20.6 Evidence: device/account inventory ללא Secret, MFA/patch/encryption posture, remote-access policy/log, provider data terms approval, key ownership ו־offboarding report.

34.30.20.7 Rollback/Gate: חשבון/מכשיר/Remote path שאינו עומד במדיניות מושעה ומפתחותיו מסובבים; העבודה עוברת לעמדה מאושרת בלבד. Gate 2/3 חסום בלי הוכחה.

34.30.21 חבילת Meta operating model, Tech Provider ו־Policy freshness.

34.30.21.1 פעולה: ה־Pilot הוא Direct, ‏Single-tenant ובנכסי Test/Business שאושרו במפורש; WABA, ‏Business Portfolio, ‏Messaging Account ו־Phone נשארים בבעלות הלקוח. מסלול Embedded Signup ללקוחות נוספים הוא Future path בלבד ונשאר כבוי עד Meta authorization, ‏Legal role classification ו־App Review. כאשר יאושר, Connect יקבל Delegated least privilege ו־Offboarding יבטל System user, ‏App subscription, ‏Tokens ו־local bindings.

34.30.21.2 Pilot אינו משתף Line of credit של Connect ואינו מחייב לקוח על Meta usage בלי Finance/Meta contract. Funding נשאר בנכס הלקוח או במסלול Test מאושר; שינוי דורש D03/D20 amendment.

34.30.21.3 App Review ו־Advanced Access להרשאות הנדרשות מתחילים מוקדם; כל Permission ממופה ל־Endpoint/Use case ו־unused permission מוסרת. Business/WhatsApp management ו־messaging אינן מונחות כמאושרות עד Evidence חי.

34.30.21.4 Onboarding מוכיח HTTPS, SDK origin/CSP, state/nonce, one-time code exchange, fetched shared WABA, assigned system user, registered phone, subscribed app ו־asset ownership. Browser IDs אינם סמכותיים.

34.30.21.5 מדיניות Runtime היא Opt-in מתועד, Opt-out מיידי, Approved template לשיחה יזומה, free-form רק בתוך חלון 24 השעות לפי Provider fact, Human escalation ישיר ו־quality/policy kill switch.

34.30.21.6 ארבעת חוזי ה־Platform Preview הרשמיים נלכדו ב־27.08.2026 והם צפויים להיכנס לתוקף ב־23.09.2026. Legal/Meta owner חייבים להצמיד Exact bytes+digests, לבצע old/new semantic/legal diff, לקבוע Order-of-precedence ו־Applicability, ולאמת Account acceptance לפני התאריך ולפני כל Pilot שחוצה אותו; ללא Review ה־Outbound נשאר אפס.

34.30.21.6.1 תנאי Business Solution הנוכחיים מ־06.03.2026 ותנאי Meta העתידיים מ־23.09.2026 מגבילים AI Providers. Product/Legal/Meta חייבים להפיק Classification memo שמוכיח שה־AI של Connect הוא ancillary/incidental למערכת תקשורת ושירות עסקית, ולא הפונקציונליות הראשית כהגדרת Meta. המסקנה נקבעת לפי Data flow, ‏User journey, ‏Revenue proposition והתנהגות המוצר בפועל, לא לפי שם מסך או Marketing copy.

34.30.21.6.2 OpenAI וכל AI Provider אחר מקבלים Business Solution Data רק כ־Third Party Service Provider עבור בקשת הלקוח ובהסכם כתוב. אין Training או Improvement באמצעות תוכן, Metadata, Aggregation, Embeddings, Labels או Derived data של WhatsApp עבור מודל שאינו בלעדי ללקוח.

34.30.21.6.3 הפרה או סיווג Unknown מפעילים AI kill switch בלבד ומשאירים Inbox/Campaign אנושיים לפי שאר ה־Policy. אין לעקוף את המגבלה באמצעות ספק AI אחר, Proxy או תיוג מחדש של התכונה.

34.30.21.6.4 Product, Legal ו־Meta owner מפיקים Role-classification memo נפרד המכריע אם Connect היא עסק ישיר, Developer, אינטגרטור טכני, Tech Provider program participant, ‏Solution Provider מורשה או Service Provider מורשה. לפי תנאי 23.09.2026, ‏Solution Provider הוא צד שלישי שמורשה להשתמש ב־API עבור Client; יכולת טכנית, Marketing copy או Embedded Signup UI אינם הרשאה. בלי Memo ו־Meta evidence, המערכת נשארת Single-tenant Test/Pilot בלבד, Multi-client onboarding כבוי ואין Partner/Solution Provider claim.

34.30.21.6.5 אם ורק אם תנאי Service Provider הנוכחיים או חובת Solution Provider עתידית חלים, ה־Contract/WBS מוסיפים לכל לקוח: קבלת Terms תקפים; בקשה והסכמה מפורשות ליצירת/קישור WABA ו־Messaging Account; איסור יצירת נכס עתידי ללא לקוח; גישת לקוח לנכס; הרשאות רק למורשים; אחריות Front-line support, ‏TLS ו־API; הפרדה שקופה בין חיוב Meta לדמי Connect; מסירת WABA וכל המידע הקשור ללקוח או לספק שבחר בתוך 30 ימים קלנדריים מבקשה כאשר החובה חלה; ו־Deletion מקומי מהיר לאחר ההעברה אלא אם Meta, הלקוח או Legal Hold חוקי הורו אחרת. כל חובה מקבלת Owner, SLA, Positive/negative/failure/concurrency tests, Evidence, Detection, Rollback ו־Gate; Legal מאשר את התחולה והנוסח.

34.30.21.6.6 חוזה Cloud API העתידי מקבל Data-flow record נפרד: Company Personal Data, ‏Meta Processor/Controller purposes, MGPT/DPA, Subprocessors, Local Storage choice, Return request, 90-day deletion, Backup persistence ו־Third-party requests. Connect מחזיק Backup/Export/DSAR עצמאיים ואינו מציג Meta כארכיון, Retention engine או Recovery source.

34.30.21.6.7 ‏Marketing Messages API אינו חלק מה־Pilot: `marketingMessagesApiEnabled=false`, ‏Event Sharing כבוי ואין Partner enrollment. Future enablement דורש חוזה MM API נפרד, Country availability, Controller/Processor map, message-level Data Sharing control, Opt-in/Opt-out, per-user/US suppression, Optimization-model assessment, Billing, live negative tests ו־Decision amendment.

34.30.21.6.8 ‏Meta Business Suite Inbox אינו מסד השיחות של Connect: `metaBusinessSuiteInboxEnabled=false`. שימוש עתידי דורש Contract applicability, Data license, Retention/deletion, client-representative authority, opt-out sync, backup limitation, reconciliation ו־conflict-resolution plan. עד אז UI של Connect אינו טוען לסנכרון State עם Meta Inbox.

34.30.21.6.9 לפני Reachability חיה, Contract gate מוכיח גם Account/Messaging Account ownership, Security responsibilities, Incident notice path, Rate Card/spend suspension handling, Prohibited-data classification, Reporting SLA, no-publicity/no-affiliation copy ו־Termination/data-return runbook. כשל בכל אחד מפעיל Cap zero או Feature-specific kill switch לפני ניסיון Provider.

34.30.21.7 Number porting ו־Coexistence מחוץ ל־Pilot; Test number או מספר שאושר ייעודית בלבד. מעבר עתידי דורש downtime, ownership, coexistence, reversal ו־customer-support runbook נפרדים.

34.30.21.8 תלות: Legal entity/authority, Meta Business/App/Test WABA, D20 authorization, Privacy/Consent ו־Tal rate policy.

34.30.21.9 Owner/time: David Meta integration responsible; Tal אחראי למחקר rate/quality limits ולמדיניות Connect rate limiting בלבד; Roy account/commercial; Security owner הוא `unknown/unavailable`; customer asset owner and Legal approve; 24–48 שעות engineering/review ועוד App Review זמן לא ידוע.

34.30.21.10 Acceptance/Evidence/Rollback/Gate: permission denial, wrong WABA/business/phone, state replay, revoked asset, low quality, policy update, AI-primary classification, model-improvement data leak ו־offboarding; Evidence כולל App review/export, asset graph, permission matrix, live webhook/test send, AI classification memo, provider contract/data-flow ו־fresh Terms review. Rollback revokes delegated access, disables Meta or isolates AI while Human-only continues. Gate 9, כל אחד מן ה־instances ‏12.2.1–12.2.6 שהפעולה שלו נמצאת ב־Scope, ‏Gate 18.1, ובנוסף Gate 18.2 ל־Knowledge/RAG/File, ו־Gate 26.1 חסומים בלי Evidence המתאים.

34.30.22 חבילת יכולות Product מותנות שנדחו מן Pilot/GA1.

34.30.22.1 Add-ons חד־פעמיים, 32–52 שעות.

34.30.22.1.1 Trigger: Gate 26.3, Gate 27, ‏Gate 19.3, סף ביקוש משלם חתום לאחר Baseline לאותו Add-on ו־Finance/Tax approval; הערך המספרי `unknown/unavailable` עד החלטת Product/Business owner שמיים. טל נדרש רק אם ה־Add-on משנה מגבלות WhatsApp/Meta או Connect rate policy.

34.30.22.1.2 פעולה: ליצור Catalog item/version, Price/currency/tax, Expiry, Purchase idempotency, Provider reference, Entitlement grant/consume/refund, Usage cap, Notice ו־Reconciliation; AI/Message Add-on אינו עוקף Meta/Cost/Consent.

34.30.22.1.3 Tests: duplicate purchase/webhook, wrong Tenant/Price, Expiry boundary, Refund, currency/tax drift, quota race, Provider outage ו־Entitlement replay.

34.30.22.1.4 Evidence/Rollback/Gate: Catalog/Finance sign-off, Sandbox/live reconciliation ו־Audit; Rollback חוסם רכישה חדשה ומשמר Entitlement ששולם לפי Policy. ‏Gate 27.1 נפרד.

34.30.22.2 הרחבה למדינה חדשה, 80–140 שעות לכל מדינה ועוד זמן Legal/Tax/Translation חיצוני.

34.30.22.2.1 Trigger: Gate 26.3, Gate 27, סף ביקוש חתום המבוסס על Baseline אמיתי לאותה מדינה או Design partner משלם בה, Owner/Support מקומי ו־Business case. מספר ה־Prospects ומשך המדידה נשארים `unknown/unavailable` עד החלטת Product/Business owner שמיים; טל מצטרף רק אם המדינה משנה מגבלות WhatsApp/Meta או Connect rate policy. עד אז אין Country instance ואין Route, Job, Credential או Claim פעילים למדינה.

34.30.22.2.2 פעולה: Legal/privacy/transfer, Tax/invoice/currency, Meta eligibility/rates/categories, Locale/Timezone/phone normalization, Data residency, Billing/payout, Support hours, Abuse, Contract/Notice ו־Go-to-market review.

34.30.22.2.3 Tests: Country/phone/currency/timezone, cross-border data flow, tax rounding, unsupported Meta/Billing path, language fallback, Support outage ו־country kill switch.

34.30.22.2.4 Evidence/Rollback/Gate: Country launch packet, Legal/Tax/Provider proofs, full locale journeys ו־Cost/SLO; Rollback חוסם registration/new sends במדינה בלי לפגוע בלקוחות מאושרים לפי exit plan. לכל מדינה נוצר Gate instance בתבנית `27.2.<ISO-3166-1-numeric>`. מדינה עתידית שאינה ידועה פותחת Discovery חוסם ואינה מקבלת Placeholder.

34.30.22.3 White Label/Agency model, 96–168 שעות.

34.30.22.3.1 Trigger: Gate 26.3, Gate 27, סף ביקוש משלם חתום לאחר Baseline לאותו Agency/Reseller need, ‏Legal/Meta/Support/Abuse ownership ו־Pricing; הערך המספרי `unknown/unavailable` עד החלטת Product/Business owner שמיים.

34.30.22.3.2 פעולה: Agency→customer hierarchy ללא ערבוב Tenants, Brand/domain/email catalogs, Terms/processor roles, Support routing, Billing attribution, Meta asset ownership, Abuse attribution, Audit, Offboarding ו־No custom secret/code injection.

34.30.22.3.3 Tests: Agency cross-customer BOLA, Brand/domain takeover, wrong sender, reseller offboarding, support/content access, billing mix-up, Meta permission revoke ו־nested export/delete.

34.30.22.3.4 Evidence/Rollback/Gate: Tenant hierarchy ADR, contracts, domain/mail/security evidence, full isolation suite ו־two-agency drill; Rollback מסיר Branding/Agency delegation ומשאיר כל Customer tenant עצמאי. ‏Gate 27.3.

34.30.22.4 A/B Testing, 64–112 שעות.

34.30.22.4.1 Trigger: Gate 26.3, Gate 27, סף ביקוש משלם חתום לאחר Baseline, נפח מאושר שמספיק למדד שנקבע מראש, Legal/Consent parity ו־Experiment owner; ערכי הביקוש והנפח `unknown/unavailable` עד החלטה סטטיסטית וחתימת Product/Business owner שמיים.

34.30.22.4.2 פעולה: Hypothesis, Primary metric, Exposure/sample cap, deterministic hash allocation לפי Experiment+Recipient stable IDs, Variant/template/campaign versions, Holdout policy, Stop rule, Attribution window, Cost cap ו־No autonomous optimization.

34.30.22.4.3 אין `Math.random()` או Runtime randomness להקצאה. שינוי Salt/Hash/version מבטל Experiment; Suppression, Eligibility ו־Safety אינם ניסוי.

34.30.22.4.4 Tests: stable allocation, no cross-variant, opt-out/consent parity, sample cap, early stop, late outcomes, duplicate recipient, timezone, cost/quality drop ו־statistical report reproducibility.

34.30.22.4.5 Evidence/Rollback/Gate: Protocol, Allocation vectors, Variant approvals, Analysis notebook/report ו־Ethics/privacy review; Rollback עוצר Exposure חדש ולא משכתב תוצאה. ‏Gate 27.4.

34.30.22.5 Auto-resume מן Human ל־Bot, 32–52 שעות.

34.30.22.5.1 Trigger: Gate 17 ו־26.3, Gate 27, סף ביקוש חתום לאחר Baseline לאותו Workflow, ‏Customer state/notice מאושרים ו־Measured support benefit; הערך המספרי `unknown/unavailable` עד החלטת Product/Business owner שמיים.

34.30.22.5.2 פעולה: Explicit eligible state, Versioned inactivity policy, Business hours, notice/cancel path, Agent override, Revalidation של Consent/window/Flow/version/assignment ו־single fenced resume event.

34.30.22.5.3 Tests: Agent typing/claim race, customer message at boundary, opt-out, stale Flow, two schedulers, DST, canceled resume, Handoff loop ו־Notice failure.

34.30.22.5.4 Evidence/Rollback/Gate: State table, policy approval, concurrency/browser report ו־support outcome; Rollback מבטל claims עתידיים ומחזיר Manual resume. ‏Gate 27.5.

34.30.22.6 בחירת AI Profile/Model בידי לקוח, 28–48 שעות.

34.30.22.6.1 Trigger: Gate 18.1, ובנוסף Gate 18.2 לכל Profile המשתמש ב־Knowledge/RAG/File pipeline, ‏Gate 26.3, ‏Gate 27, סף ביקוש משלם חתום לאחר Baseline המוכיח צורך, Eval/Cost/Privacy approval לכל Profile; הערך המספרי `unknown/unavailable` עד החלטת Product/Business owner שמיים. טל נדרש רק אם Profile משנה WhatsApp send capacity או Connect rate policy.

34.30.22.6.2 פעולה: להציג Profile עסקי כגון חסכוני/איכותי, לא Model alias; Server registry ממפה Profile revision ל־Connect Model-profile revision הכוללת Configured/returned model IDs, Prompt, Corpus/result digests, Budget, Latency, Safety, Freshness ו־Fallback human-only.

34.30.22.6.3 Tests: stale/unknown Profile, Model deprecation, Budget exhaustion, Quality regression, expensive fallback, Tenant entitlement, config race ו־Eval threshold.

34.30.22.6.4 Evidence/Rollback/Gate: Profile registry, Evals, Price/latency/privacy matrix ו־UI clarity; Rollback מחזיר Profile מאושר או AI-off בלי החלפת Model שקטה. ‏Gate 27.6.

34.30.22.7 Auto-routing ו־Skill routing, 48–80 שעות.

34.30.22.7.1 Trigger: Gate 16 ו־26.3, Gate 27, סף ביקוש חתום לאחר Baseline עם Queue volume/skills מדידים, Business-hours roster ו־Support owner; הערך המספרי `unknown/unavailable` עד החלטת Product/Business owner שמיים.

34.30.22.7.2 פעולה: Deterministic round-robin/skill policy, Agent availability/capacity, Priority, Fairness, Timeout/overflow, Manual override, versioned Routing decision ו־Fallback ל־Unassigned.

34.30.22.7.3 Tests: no available agent, simultaneous assignment, stale availability, offboarding, priority starvation, timezone, skill mismatch, override race ו־restart replay.

34.30.22.7.4 Evidence/Rollback/Gate: Routing matrix, load/fairness metrics, Assignment audit ו־support drill; Rollback מחזיר Manual claim/assign. ‏Gate 27.7.

34.30.22.8 Departments ו־Permission hierarchy, 56–96 שעות.

34.30.22.8.1 Trigger: Gate 16 ו־26.3, Gate 27, סף ביקוש חתום לאחר Baseline לצורך ארגוני זהה, Role model ו־Privacy review; הערך המספרי `unknown/unavailable` עד החלטת Product/Business owner שמיים.

34.30.22.8.2 פעולה: Department/Team hierarchy בתוך Tenant בלבד, Membership, Queue visibility, Transfer/overflow, Manager scope, Reporting aggregation, Offboarding ו־deny-by-default; Department לעולם אינו Tenant boundary.

34.30.22.8.3 Tests: sibling department BOLA, inherited permission drift, cyclic hierarchy, transfer/overflow, manager downgrade, report aggregation leak, search/export ו־offboarding.

34.30.22.8.4 Evidence/Rollback/Gate: Hierarchy ADR, Permission matrix, RLS/API/browser denial ו־migration plan; Rollback משטיח ל־Tenant-wide manual queues בלי להרחיב גישה. ‏Gate 27.8.

34.30.22.9 Coupons/Discounts, 24–40 שעות.

34.30.22.9.1 Trigger: Gate 19.3, 26.3 ו־27, Provider-native support, Finance/Tax/Marketing approval ו־Measured acquisition/retention hypothesis; לא לפני GA1.

34.30.22.9.2 פעולה: Provider-native discount reference עם Scope, Price/currency/tax, Expiry, Redemption count, Eligibility, Stacking, abuse cap, Attribution, Refund behavior ו־Audit; Coupon אינו Feature entitlement.

34.30.22.9.3 Tests: replay, brute force/enumeration, wrong Tenant/Price, expired/stacked, max redemption race, refund/chargeback, leaked code, webhook reorder ו־Tax rounding.

34.30.22.9.4 Evidence/Rollback/Gate: Campaign/Finance approval, Provider reconciliation, Abuse report ו־customer disclosure; Rollback חוסם Redemption חדש ושומר Discount שכבר התחייב לפי Terms. ‏Gate 27.9.

34.30.22.10 אומדן מצטבר אם כל תשע היכולות נבחרות הוא 460–788 שעות אדם, לא כולל זמני Legal/Tax/Meta/Translation. הוא Conditional delta ואינו כלול בסכומי GA1 או Best-in-class base עד Gate 27; בחירה חלקית מוסיפה רק את החבילות שאושרו.

34.30.22.11 תלות כללית: Gate 26.3, Gate 27, Scope Manifest חדש, Demand threshold של כל Capability, Owner/Backup, Budget, Security/Privacy/Legal לפי היכולת ו־Rollback עצמאי. Capability אחת אינה מעניקה תלות או Gate לאחרת.

34.31 Workstream חוסם — מעבר Cloudflare/D1/R2 לטופולוגיית Vercel/Railway/PostgreSQL/S3.

34.31.1 יעד וכלל בטיחות.

34.31.1.1 היעד הוא Runtime יחיד, Data source יחיד ו־Release evidence יחיד לכל Operation. אין Hybrid סמוי, dual-write קבוע או Fallback ל־D1/R2/Cloudflare Queue לאחר Flip.

34.31.1.2 Build של Vercel או Healthcheck של Railway אינם Cutover evidence. כל Capability דורשת Contract parity, live adapter/config, negative tests, Staging evidence, owner ו־rollback.

34.31.1.3 Cutover מתוכנן לפני הפעלה. הוא אינו מורשה לביצוע בזמן הקפאת התכנות ואינו מורשה ל־Production במסגרת אישור ה־Master Plan.

34.31.1.4 זמן Gross ל־Workstream הוא 176–348 שעות לאחר הוספת Cutover ingress spool. הוא חופף לסעיפים 11, 12, 27–29 ו־31; Gate 1 יסמן חפיפה מול הקוד הקיים כדי שלא לספור פעמיים.

34.31.1.5 שחזור האומדן.

34.31.1.5.1 Runtime parity הוא 32–64, D1→PostgreSQL הוא 48–96, Redis/Scheduler הוא 24–48, Registry/Release evidence הוא 32–56 ו־Ingress spool הוא 20–36 שעות. סכום הבסיס ללא R2 הוא 156–300.

34.31.1.5.2 Execution coordination, two rehearsals, Cutover decision packets ו־post-run evidence מוסיפים 4–16 שעות. תרחיש ללא R2 פעיל הוא לכן 160–316 שעות Gross.

34.31.1.5.3 כאשר R2 Inventory מוצא Objects פעילים, R2→S3 מוסיף 16–32 שעות Engineering ועוד זמן Copy/Scan חיצוני. התרחיש המלא הוא 176–348 שעות Gross.

34.31.1.5.4 Gate 1 קובע את התרחיש לפי Inventory ומפחית Allocation שכבר קיים בשלבים אחרים; אין לבחור את הטווח הנמוך בלי Evidence שאין R2 ואין Rework.

34.31.2 Registry של 20 היכולות שחייבות להיסגר.

34.31.2.1 Web ו־API.

34.31.2.1.1 web.build-runtime — Cloudflare/Vinext אל Vercel Web.

34.31.2.1.2 web.server-api-boundary — Worker monolith אל Vercel BFF מול Railway API.

34.31.2.1.3 web.static-assets — Cloudflare ASSETS אל Vercel assets.

34.31.2.1.4 web.image-optimization — Cloudflare IMAGES אל Vercel/approved image path.

34.31.2.1.5 api.meta-webhook-ingress — Worker route אל Railway API public ingress.

34.31.2.2 Data ו־Queues.

34.31.2.2.1 data.relational-database — D1/SQLite אל Railway PostgreSQL.

34.31.2.2.2 data.object-storage — R2 אל AWS S3 אם Inventory מוצא Objects פעילים.

34.31.2.2.3 queue.meta-webhook — Cloudflare Queue/DLQ אל Redis/BullMQ.

34.31.2.2.4 queue.campaign-delivery — Cloudflare Queue/DLQ אל Redis/BullMQ.

34.31.2.2.5 queue.team-invitation — Cloudflare Queue/DLQ אל Redis/BullMQ.

34.31.2.2.6 queue.message-template-submission — Contract מקומי אל Redis/BullMQ חי.

34.31.2.2.7 worker.scheduler — Cloudflare Cron אל Railway Worker קבוע עם DB lease/fence.

34.31.2.3 Security ו־Operations.

34.31.2.3.1 security.distributed-rate-limits — D1/bindings אל PostgreSQL/Redis strategy מאושרת.

34.31.2.3.2 security.secret-management — Worker secrets אל Vercel/Railway/AWS/Clerk/OpenAI vaults מפוצלים.

34.31.2.3.3 operations.environment-isolation-evidence — Evidence Cloudflare אל evidence רב־ספקי.

34.31.2.3.4 operations.deployment-provenance-evidence — Deployment יחיד אל Manifest הקושר שלושה Artifacts.

34.31.2.3.5 operations.backup-restore — D1/R2 evidence אל PostgreSQL/S3 evidence v2.

34.31.2.3.6 operations.browser-database-proof — D1 API proof אל Railway API/PostgreSQL read-only proof.

34.31.2.3.7 operations.observability — Worker telemetry אל Better Stack/OpenTelemetry מ־Vercel/Railway.

34.31.2.3.8 operations.cutover-ingress-spool — קליטת Meta webhook מאומתת, מוצפנת ועמידה בזמן Freeze, עם Replay חד־פעמי אל PostgreSQL לאחר Flip.

34.31.2.4 תנאי הקבלה הוא 20 מתוך 20 Records במצב `proven-active` או `not-applicable-with-evidence`. ‏`not-applicable` מותר רק ל־Capability שאין לה Source asset או Operation ב־Scope, כגון R2 לאחר Inventory אפס, ודורש Reason/Approver/Review date/negative scan. מצב `explicitly disabled` לבדו אינו מספיק ל־Cutover. Record missing, stale או legacy-ready חוסם.

34.31.3 חבילת Runtime route parity ו־Vercel↔Railway boundary.

34.31.3.1 פעולה.

34.31.3.1.1 להפיק Inventory של כל Route, Server action, Cron, webhook, Queue producer/consumer ו־Runtime import ולמפות Legacy implementation אל Target operation.

34.31.3.1.2 Vercel BFF מאמת Clerk session בצד המתאים ושולח ל־Railway גם Service identity באמצעות Vercel OIDC. Railway מאמת OIDC לפני Clerk, פותר Tenant/Capability בעצמו ומתעלם מ־Tenant authority מהלקוח.

34.31.3.1.3 APP_PUBLIC_ORIGIN ו־Railway origin הם exact HTTPS allowlists; Development localhost בלבד. אין Host-header reflection או arbitrary proxy.

34.31.3.1.4 לכל Operation להוכיח Request/response schema, size, timeout, idempotency, correlation, error mapping ו־no secret/PII logging.

34.31.3.1.5 להעביר Route אחד בכל Slice ולחסום Import ל־D1/R2/Cloudflare bindings במסלול Target. Source guard בונה TypeScript dependency graph לכל app/features/server/db/worker/proxy/runtime files.

34.31.3.1.6 לבצע browser/runtime parity חיובי ושלילי לפני סימון Legacy route כ־read-only/deprecated.

34.31.3.2 תלות: Gates 1–6, Vercel/Railway accounts, OIDC/Clerk configs ו־PostgreSQL principals.

34.31.3.3 Owner: Backend/Architecture accountable; Frontend/Deployment/Security review.

34.31.3.4 זמן: 32–64 שעות, Allocation מתוך Gross ה־Workstream ‏176–348.

34.31.3.5 Acceptance/Tests: wrong OIDC team/project/environment, valid OIDC without Clerk, valid Clerk without Membership, malicious origin/host, tenant injection, payload excess, timeout, dependency-graph legacy import ו־route parity.

34.31.3.6 Evidence: Operation matrix, dependency graph, config export מושחר, Browser/API traces, denial suite ו־legacy import report.

34.31.3.7 Rollback/Gate: לפני Data flip ניתן להחזיר Route ל־Legacy רק דרך Release מאושר; אחרי Target writes מתחילים אין D1 fallback. Runtime parity הוא Evidence child של Gate 26.0.1 ונבדק ב־Staging; הוא אינו Gate עצמאי.

34.31.4 חבילת D1→PostgreSQL data migration מלאה.

34.31.4.1 פעולה.

34.31.4.1.1 Gate 1 מקפיא מחדש את Baseline המדויק: קובצי Migration, עשרת Slice IDs, 55 טבלאות מקור, Column contracts, dependencies ו־target schema. המספרים נבדקים מול Registry ולא מועתקים בעיוור ממסמך ישן.

34.31.4.1.1.1 מקור ה־Slice הקנוני הנוכחי הוא `postgres/postgresDataMigrationSliceRegistry.mjs`, עם SHA-256 מחקרי `142c890152a2cc56715e625df93f686849f1d756d2f615e52d42d7a20a181b1b` שנמדד ב־26.08.2026. Digest זה אינו Release evidence; Gate 1 מחשב אותו מחדש מן Commit המאושר.

34.31.4.1.1.2 קורא ה־Full snapshot הקנוני הנוכחי הוא `scripts/read-d1-full-data-migration-snapshot.mjs`, עם SHA-256 מחקרי `715d50ecede8e2ad84bed87c503263ea24faefddb7e40a1308d77cadbb3d40ce`; הוא בודק מכונתית 55 שמות טבלאות ייחודיים ו־Exact coverage.

34.31.4.1.1.3 סדר עשרת ה־Slices והיקפם הנוכחי הוא: 1 `core` שבע טבלאות; 2 `tenant-access` שש; 3 `contact-organization-import` שש; 4 `meta-connection` שלוש; 5 `templates-campaigns` שלוש; 6 `conversations-messages` שתיים; 7 `bot-runtime` שלוש; 8 `ai-knowledge-runtime` תשע; 9 `governance-billing` חמש; 10 `whatsapp-delivery-policy` אחת־עשרה. הסכום הוא 55, וכל `requires` נלקח מן Registry.

34.31.4.1.1.4 Gate 1 מפיק Manifest מכונתי של כל 55 השמות, Migration mappings ו־Dependencies, קושר אותו ל־Commit/Artifact ומבצע Review. שינוי יחיד בשם, Count, Order, Status או Digest מבטל Plan/Approval קודמים.

34.31.4.1.2 לבצע Acquisition ו־Conversion כשלב עצמאי ומתועד; `wrangler d1 export` מפיק SQL ולא קובץ SQLite, ולכן אסור להניח שה־Export ניתן לפתיחה ישירה באמצעות SQLite.

34.31.4.1.2.1 לקשור מראש Environment, Cloudflare account, D1 database ID/name, migration/schema version, Operator, tool/version, startedAt ו־Maintenance window. Token או Secret אינם נכנסים ל־Command transcript.

34.31.4.1.2.2 להפעיל את הפקודה הרשמית `wrangler d1 export <database> --remote --output=<absolute-owner-only-path.sql>` באמצעות גרסת Wrangler נעולה וכלי הרצה מאושר, בלי Shell interpolation של קלט חיצוני. הראיה שומרת Command digest, לא Credential.

34.31.4.1.2.3 מאחר ש־D1 export חוסם בקשות אחרות למסד בזמן הפעולה, לעצור Writers או להעביר את המערכת ל־Maintenance/read-only לפני ההפעלה, למדוד את חלון החסימה ולאשר שאין Producer, Cron או Webhook processor שממשיך לכתוב.

34.31.4.1.2.4 לאמת שהפלט הוא regular file חדש בנתיב מוחלט מאושר, בבעלות Operator, Owner-only, ללא symlink/hardlink, Git, Artifact store או Ticket; לחשב SHA-256 לפני כל Conversion ולשמור Size, inode/file identity ו־tool provenance.

34.31.4.1.2.5 לזהות Virtual tables, unsupported SQL, trigger/view/index drift ו־export failure לפני Conversion. Virtual table אינה נמחקת מ־Production כדי לאפשר Export; אם קיימת, יש ליצור מסלול Schema/Data חלופי מאושר ולתעד בנפרד כיצד היא נבנית מחדש ב־Target.

34.31.4.1.2.6 לטעון את קובץ ה־SQL לתוך SQLite מקומי מבודד וחד־פעמי, ללא Network, עם Extensions כבויות, transaction יחיד, PRAGMA/statement allowlist, resource limits ו־locked toolchain. אין להריץ Export SQL בעיוור על סביבת מפתח רגילה.

34.31.4.1.2.7 להשוות Schema, tables, row counts, key samples מושחרים ו־semantic digests בין D1 read-only queries, קובץ ה־SQL וה־SQLite שנוצר. ערכי Integer מחוץ לטווח הבטוח של JavaScript, ובפרט מעל 52 bits כפי שמזהירה תיעוד D1, מקבלים מסלול Text/BigInt מאומת; Precision loss חוסם Migration.

34.31.4.1.2.8 רק SQLite שנוצר בהצלחה, קשור ל־SQL sourceDigest ול־conversion tool/version ועבר Reconciliation הופך ל־Source של Preflight בסעיף הבא. SQL, SQLite וקבצי ביניים מושמדים לפי Runbook לאחר Acceptance ו־rollback window, ולא לפני כן.

34.31.4.1.3 Source preflight פותח SQLite read-only, extensions off, transaction snapshot יחיד, exact schema, integrity, foreign keys, row validators ו־file identity before/after.

34.31.4.1.4 להפיק Plan v2 בזיכרון בלבד עם planId דטרמיניסטי, sourceDigest, bundleDigest, policy/schema versions, ten child-plan digests, counts, environment, createdAt ו־expiresAt של עד 10 דקות.

34.31.4.1.5 אישור דורש שני Operators: אחד יוצר/בודק Export ו־Preflight; השני מאמת source/bundle digests, target, counts, backup, window ו־confirmation. HMAC key זמני בן 32 bytes נשמר ב־Vault ואינו מודפס.

34.31.4.1.6 Target חייב להיות PostgreSQL Staging ריק עם Migration set המדויק, TLS verify-full כשהיעד מרוחק, roles/ACL/RLS תקינים ו־Backup/Restore לפני Execute.

34.31.4.1.7 Execute מחשב מחדש Digests, נועל locks בסדר קבוע, בודק Replay scope, טוען את כל עשרת ה־Slices תחת Transaction יחיד, מאמת target digests ו־sequences ורושם immutable receipt לפני Commit.

34.31.4.1.8 כשל ב־Slice, digest, trigger, sequence, target verification או receipt מבצע Rollback מלא. Outcome commit לא ודאי אינו נשלח שוב לפני Receipt/recovery review.

34.31.4.1.9 אחרי הצלחה לבצע semantic parity, tenant/RLS, counts/digests, performance, backup/restore, application read-only ו־replay rejection.

34.31.4.1.10 Export, HMAC ו־temporary evidence מושמדים לפי Security/Legal runbook רק לאחר signed acceptance; אין למחוק Source system לפני rollback window.

34.31.4.2 תלות: 12.5–12.12, ‏Backup Gate 23.1, ובנוסף Gate 23.2 רק אם ה־Cutover מפרסם Claim בן 90 יום או GA/Ransomware readiness, ‏Staging, two operators, Maintenance window ו־no active uncontrolled writes.

34.31.4.3 Owner: Database owner accountable; Migration operator ו־independent verifier responsible; Security/Privacy/SRE approve.

34.31.4.4 זמן: 48–96 שעות preparation/rehearsal, כולל Acquisition/Conversion מאובטחים ו־Allocation מתוך Gross ה־Workstream ‏176–348; live export size/window נפרדים.

34.31.4.5 Acceptance/Tests: request/write בזמן Export, SQL שמתחזה ל־SQLite, source file swap, symlink/hardlink, unsupported/virtual table, malicious/oversized SQL, 52-bit precision loss, conversion mismatch, schema/table/column drift, invalid row, expired/tampered plan, wrong environment, nonempty target, missing migration, failed late slice, replay, uncertain commit, RLS bypass ו־restore.

34.31.4.6 Evidence: Maintenance/write-free proof, Wrangler/version/command digest, raw SQL/conversion/SQLite provenance chain, Source/bundle/target/evidence digests, counts ללא PII, precision report, exact migration set, two approvals, immutable receipt, parity/load/recovery/restore reports ו־secure disposal record.

34.31.4.7 Rollback/Gate: Pre-commit transaction rollback; pre-flip Source נשאר סמכותי; post-flip App rollback נשאר על PostgreSQL. חזרה ל־D1 אחרי Target writes דורשת Reverse-migration project חדש ואינה פעולה מהירה.

34.31.5 חבילת R2→S3 מותנית.

34.31.5.1 פעולה: אם Inventory מוצא Objects פעילים, ליצור Manifest של source key/version/size/checksum/data class/tenant; להקפיא writes; להעתיק ל־S3 quarantine/target; לאמת checksums, metadata, KMS, scan/retention; להפוך Source read-only; לבצע single-writer flip; למחוק R2 רק לאחר rollback/retention approval.

34.31.5.2 תלות: D14-A1, AWS/KMS/GuardDuty live, Data map, Legal hold, Cost ו־R2 inventory.

34.31.5.3 Owner: Storage/Security; Privacy/Legal ו־Application owners approve.

34.31.5.4 זמן: 16–32 שעות engineering ועוד copy/scan duration, Allocation מתוך Gross ה־Workstream ‏176–348.

34.31.5.5 Acceptance/Tests: checksum mismatch, overwritten version, missing object, wrong tenant/key, KMS deny, scan missing/threat, interrupted copy, write during freeze, source delete under hold ו־rollback read.

34.31.5.6 Evidence: signed manifests, source/target counts/checksums, KMS/scan results, single-writer proof ו־retention/deletion approvals.

34.31.5.7 Rollback/Gate: לפני flip S3 copy נמחק/מבודד; אחרי flip S3 נשאר source of truth ו־R2 read-only. אין permanent dual-write.

34.31.6 חבילת Redis/BullMQ, Scheduler ו־Queue cutover.

34.31.6.1 פעולה: לכל ארבעת התורים הבסיסיים ולכל Queue נוסף מאושר להגדיר payload schema ללא PII, deterministic job ID, delivery/attempt budgets, delay, retryable taxonomy, DLQ, retention, producer/consumer ownership, drain ו־rebuild source.

34.31.6.1.1 לכל Queue ליצור Contract record עם `queueId`, ‏`schemaVersion`, ‏allowed action classes, ‏authoritative table/ledger, ‏enqueue transaction boundary, ‏claim/fence semantics, ‏provider-side-effect class, ‏unknown-state rule, ‏retry budget, ‏DLQ rule, ‏retention, ‏RPO/RTO, ‏owner/reviewer, ‏kill switch, ‏rollback ו־Gate. חסר שדה משאיר את ה־Producer ואת ה־Worker Disabled.

34.31.6.1.2 Job ID הוא prefix לא־מספרי ועוד digest דטרמיניסטי של Tenant+Operation class+authoritative operation ID+contract version; אין `:` ואין Randomness. Digest collision, same ID/different payload, same payload/different Tenant ו־reuse לאחר Auto-removal הם Negative tests חוסמים.

34.31.6.1.3 Queue payload מכיל reference IDs ו־integrity digest בלבד. לפני Processing ה־Worker טוען את הרשומה הסמכותית מ־PostgreSQL, מאמת Tenant, Policy, status, expiry ו־fence; הוא אינו סומך על Role, phone, content, amount, URL או approval שהגיעו מ־Redis.

34.31.6.2 להוכיח Railway Redis config בפועל: private access, auth/TLS לפי plan, AOF/durability capability, noeviction, memory/maxclients, persistence/restart behavior, metrics ו־cost cap. ערך שאינו נתמך בתוכנית נשאר Unknown וחוסם Claim.

34.31.6.2.1 Evidence bundle כולל Project/Environment/Service IDs, private DNS/reference binding, היעדר TCP Proxy/`REDIS_PUBLIC_URL`, image tag+digest+SBOM+advisory result, ACL users/command matrix, redacted secret metadata, `CONFIG GET`/`INFO` allowlisted exports, Volume mount, AOF/RDB settings, `maxmemory`/`noeviction`, clients, HA topology, backup schedule, restore ID/digest, metrics, cost ו־independent review. Secret value ו־raw Job data אינם Evidence.

34.31.6.2.2 AOF every-second ו־Volume backup אינם מוכיחים Zero loss. Acceptance מוכיח ש־Queue state שנמחק בין fsyncs, ב־Restore או ב־Failover נבנה מחדש מ־PostgreSQL Outbox/Operation ledger ללא Side effect נוסף. אם Reconciliation אינו אפס־פערים, Cutover נכשל גם כאשר Redis עצמו Healthy.

34.31.6.2.3 Closed Pilot רשאי להתחיל ב־single node רק כאשר כל Queue rebuildable וכל Side effect מוגן ב־DB; Production promotion דורש Sentinel/HAProxy failover/failback evidence או Provider ADR חדש. Unsupported named ACL, unresolved applicable Redis advisory, non-persistent config, public exposure, eviction policy שונה, AOF failure או missing restore proof הם Stop conditions.

34.31.6.3 Scheduler הוא Worker קבוע עם DB lease/fence, minute alignment, bounded catch-up, no overlap ו־graceful SIGTERM; Railway Cron אינו מחליף חוזה תדירות שאינו עומד בו.

34.31.6.4 במהלך Cutover לעצור Legacy producers, לנקז/למפות Pending/DLQ, להפעיל Target consumers כבויים, לאמת Source state, להפעיל Producer/Consumer לפי סדר ולחסום mixed delivery.

34.31.6.4.1 אין להעתיק Redis keys או Job blobs עיוור מן ה־Legacy אל Target. יוצרים high-watermark סמכותי ב־DB, מסווגים כל Operation כ־terminal/pending/unknown, מיישבים Provider receipts ורק אז מייצרים Target jobs מחדש מאותו Ledger. ‏Unknown נשאר Quarantined עד Reconciliation או Human approval; הוא אינו Retry candidate.

34.31.6.4.2 סדר ההפעלה הוא: Rollback/kill switches מוכחים; Producers ו־Consumers Target עדיין כבויים; Legacy freeze; DB snapshot/high-watermark; reconcile; Target Redis config/ACL/durability proof; deterministic rebuild dry-run; bounded enqueue; Consumers read-only; side-effect canary; independent evidence review; ורק אז הרחבת Reachability. ‏`rollbackAfterReachabilityCount` חייב להישאר `0`.

34.31.6.4.3 Rollback לפני Target side effect עוצר Target ומחזיר Producer יחיד ל־Legacy לפי high-watermark. לאחר Target side effect, App rollback נשאר על אותו PostgreSQL ledger; אין הפעלה מחדש של Legacy consumer ואין Dual consume. Queue Target נבנה מחדש מן ה־ledger לאחר כל Rollback, ולא משוחזר Snapshot שעלול להחזיר Jobs שכבר Settled.

34.31.6.5 תלות: PostgreSQL target, Redis plan, Worker secrets, OTel ו־operation parity.

34.31.6.6 Owner/time: Backend Operations; SRE/Security review; טל בודק רק Queue admission, permits ו־backpressure המשפיעים על WhatsApp/Meta rate limits; 24–48 שעות, Allocation מתוך Gross ה־Workstream ‏176–348.

34.31.6.7 Acceptance/Evidence/Rollback/Gate: Redis outage/restart, publisher fail-closed, 500/500 bounded load או load profile מאושר, duplicate/delay/DLQ/recovery, two workers, clock skew ו־drain; Evidence כולל config, queue contract reports ו־metrics. Rollback עוצר target producers/consumers בלי replay עיוור; Gate נסגר רק כשאין Legacy producer פעיל.

34.31.6.7.1 להרחיב את Matrix ל־producer offline queue disabled, worker indefinite reconnect, wrong ACL, forbidden command, public probe, maxclients, `noeviction` rejection, AOF rewrite/failure, one-second loss window, disk full, Redis process crash, Worker hard-kill, event-loop stall, lock expiry, duplicate delivery, Auto-removal/reused ID, manual Job deletion, Poison job, DLQ saturation, Sentinel leader loss, stale replica, backup restore, version upgrade ו־credential rotation.

34.31.6.7.2 תנאי PASS לכל Failure הוא לא רק Queue recovery אלא ארבעה invariants: אין Operation שאבדה מן ה־authoritative ledger; אין Side effect כפול; כל `unknown` נשאר חסום עד Receipt reconciliation; וכל Queue ניתנת לבנייה מחדש עם Counts/Digests תואמים. Transport אינו מקבל Claim של exactly-once.

34.31.6.7.3 Observability חייבת להבדיל `enqueue failed`, ‏`queued`, ‏`claimed`, ‏`provider accepted`, ‏`unknown`, ‏`settled`, ‏`terminal failed` ו־`DLQ`. Ack של Redis, Completion של BullMQ או Healthy Worker אינם Receipt של Meta/Billing/Email/Delete. Alert routing כולל Owner+Backup, stale alert ו־incident kill-switch drill.

34.31.6.8 חבילת Cutover ingress spool, ‏20–36 שעות מתוך ה־Workstream.

34.31.6.8.1 המטרה היא לא לאבד Meta inbound בזמן הקפאת D1/Queues. ה־Spool הוא Capability זמנית וייעודית, לא Queue עסקי קבוע ולא Source of truth.

34.31.6.8.2 Railway ingress מאמת Raw-body signature, App/WABA/Phone binding, Timestamp/size ו־Environment לפני Ack. Payload לא מאומת נדחה ואינו נכנס ל־Spool.

34.31.6.8.3 Event מאומת נכתב לפני HTTP success ל־S3 prefix/bucket ייעודי, מוצפן ב־SSE-KMS, Versioned, ללא Public access, עם Deterministic provider-event identity, Raw-body digest, headers allowlist, binding digest, receivedAt ו־Expiry מוגבל.

34.31.6.8.4 ה־Spool מקבל Capacity/byte/event/time caps, Alarm ב־50/75/90%, Kill/maintenance response ו־No overwrite. Unknown, KMS/S3 failure או Capacity full מחזירים Failure כדי לא להצהיר Ack כוזב; התנהגות Retry של Meta נבדקת מול Test WABA ואינה הנחת בטיחות יחידה.

34.31.6.8.5 לאחר PostgreSQL Flip, Replayer יחיד קורא לפי סדר Provider/receivedAt, מאמת מחדש Signature/binding/digest/expiry, מכניס דרך אותו Idempotent webhook contract, שומר Receipt ורק אז מסמן Object consumed. Duplicate ו־Out-of-order נשלטים ב־PostgreSQL state machine.

34.31.6.8.6 Drain מסתיים רק כאשר S3 manifest, PostgreSQL receipts, Provider event IDs ו־Business projections מתואמים; לאחר מכן Ingress עובר ישירות ל־Queue הרגילה וה־Spool נעול Read-only עד Expiry/Legal deletion.

34.31.6.8.7 Tests: forged signature, wrong WABA, S3/KMS outage, Ack-before-durability, duplicate, reorder, replay crash, object replacement, full capacity, expired event, two replayers, privacy deletion/hold ו־legacy callback race.

34.31.6.8.8 Evidence: Spool config/KMS policy, signed manifest, Ack timing, Capacity/load, Failure/alert drill, Replay receipts, zero-loss/zero-duplicate reconciliation ו־secure disposal.

34.31.6.8.9 Rollback: לפני Target business writes ניתן להחזיר DNS/Callback ל־Legacy לאחר Drain מוכח; אחרי Target writes App rollback נשאר על PostgreSQL וה־Spool ממשיך להזין Target בלבד. אין Replay לשני Databases.

34.31.7 חבילת Readiness Registry v2 ו־Release Evidence.

34.31.7.1 פעולה.

34.31.7.1.1 להרחיב/ליישב את Registry v2 עם כל 20 capabilities, criticality, owner, dependencies, required evidence, allowed issuer, maximum age, release binding ו־status codes.

34.31.7.1.2 לבטל Legacy D1/R2/hosting booleans כמקור Ready. חסר, stale, malformed, wrong issuer/release/environment או decision-required הם Fail-closed.

34.31.7.1.3 Release identity כוללת releaseId ו־commitSha משותפים, composite manifest digest, וכן serviceId ו־artifactDigest נפרדים ל־Vercel Web, Railway API ו־Railway Worker. אין Digest אחד מזויף לשלושה Builds.

34.31.7.1.4 להוכיח את כל Migration set של Release evidence על PostgreSQL חי, לא רק Migration 0040 ההיסטורית. Gate 1 קובע את המספר האחרון המדויק מתוך Worktree שאושר.

34.31.7.1.5 שרשרת ההנפקה היא initialize release row, issue short-lived evidence, CAS publish, read-back מאותו PostgreSQL, verify identity/digests/freshness/dependencies ו־immutable operator audit.

34.31.7.1.6 CLI/post-deploy משתמשים ב־M2M workload identity מאושרת ו־least privilege. Clerk user session, shared token או DB owner credential אינם מתאימים.

34.31.7.1.7 Browser database proof עובר Vercel OIDC + Clerk + Railway read-only operation ומוכיח PostgreSQL state בלי Connection string או direct DB access מ־Vercel.

34.31.7.2 תלות: Runtime parity, D31 roles, GitHub/Vercel/Railway provenance, Postgres/Redis/S3 live ו־ADR-0003/4/5 approval.

34.31.7.3 Owner: Release/Platform accountable; Security/SRE/Database ו־Deployment approve.

34.31.7.4 זמן: 32–56 שעות, Allocation מתוך Gross ה־Workstream ‏176–348.

34.31.7.5 Acceptance/Tests: wrong commit/release/artifact/service/environment/issuer, stale evidence, CAS race, initialize/publish crash, readback mismatch, M2M replay/revoke, legacy fallback ו־one service missing.

34.31.7.6 Evidence: Registry snapshot, composite manifest, build attestations, live migration report, evidence chain transcript מושחר, M2M identity policy ו־Browser proof.

34.31.7.7 Rollback/Gate: Release row/version חוזרים רק באמצעות Artifact קודם עם Evidence משלו; לא משכתבים Evidence. Gates 26.0.1 ו־26.0.2 נשארים Blocked אם Capability אחת חסרה או ללא `not-applicable-with-evidence` תקף.

34.31.8 סדר ה־Cutover הקנוני והיחיד.

34.31.8.1 לאשר Registry, Owners, Accounts, ADRs, Migration/Evidence contracts, Maintenance window, Customer notice, Stop authority ו־Rollback authority. כל שינוי אחרי האישור מבטל את חלון ה־Cutover ודורש Re-plan.

34.31.8.2 לפחות 48 שעות לפני החלון לאמת Ownership של Web/API/Webhook custom domains, Certificate, CAA/DNSSEC כאשר נתמכים, Current records, Meta callback/subscription ו־TTL. להפחית TTL באופן מתועד בלי להניח שכל Resolver יציית מיד.

34.31.8.3 ליצור Backup ראשוני של Sources ו־Targets, לבצע Restore מבודד ולתעד RPO/RTO. זהו Preflight; לאחר Freeze בסעיף 34.31.8.6 נוצר Backup סופי נוסף הקשור בדיוק ל־Cutover plan.

34.31.8.4 לפרוס Vercel Web, Railway API/Worker, PostgreSQL, Redis, S3/KMS ו־Ingress spool כבויים או Read-only תחת אותו Composite release manifest; לבצע external probes ו־Target API/Worker readiness בלי Business mutation.

34.31.8.4.1 אסור לבצע DNS/Meta callback change, Source freeze, Export או Target business write לפני סגירת Gate 26.0.1 לפי 34.31.10.1.

34.31.8.5 להעביר תחילה רק את Inbound capture למסלול עמיד.

34.31.8.5.1 המסלול המועדף הוא Meta callback על Hostname קבוע בבעלות Connect; בזמן Cutover משתנה Target ה־DNS מ־Legacy אל Railway ingress spool. אם Legacy משתמש ב־`workers.dev` או Host שאינו ניתן להעברה, לבצע Meta callback verification ו־App/WABA subscription change כפעולת Provider נפרדת כאשר ה־Spool כבר Ready.

34.31.8.5.2 סדר Traffic flip הוא Target certificate/route ready, external probes, Spool enabled, Legacy business processor paused, DNS או Meta callback change, Resolver/Meta test-webhook verification ו־timestamped zero-new-legacy-event observation.

34.31.8.5.3 ה־Spool מאמת ושומר לפני Ack אך אינו מפעיל Business mutation. אין Target replay, D1 write או Dual-write בשלב זה.

34.31.8.5.4 Evidence כולל Before/after DNS, TTL, certificate, Meta callback/subscription, Provider test event, Legacy/Target request counters, Global resolver samples, durable Spool receipt ו־zero-traffic window. Browser smoke לבדו אינו מספיק.

34.31.8.6 רק לאחר הוכחת Zero-new-legacy-ingress לעצור Campaign/Bot/AI/Billing/Admin side effects, לחסום New permits, לעצור כל Writer/Cron/Producer, לנקז או לצלם Pending/DLQ, להקפיא D1/R2 וליצור Backup/Export סופי. אם Writer יחיד נשאר פעיל, Cutover נעצר.

34.31.8.7 לבצע D1→PostgreSQL ו־R2→S3 כאשר נדרש; לאמת 10/10 Slices, ‏55/55 Tables, Objects, Sequences, Digests, RLS ו־Semantic parity לפני כל Target business write.

34.31.8.8 לבצע Release evidence chain, Browser read-only proof ו־Single-writer flip ל־PostgreSQL/S3/Redis; לאחר מכן להפעיל Target consumers ולבצע Replay יחיד מן ה־Spool דרך חוזה ה־Webhook הרגיל עד Zero-loss/zero-duplicate reconciliation.

34.31.8.9 לשנות את Vercel Web custom domain רק אחרי Railway API readiness; לבצע Manual read/write, Webhook live proof, one approved send ורק לבסוף Campaign canary. שינוי Web domain אינו משנה את Meta callback.

34.31.8.10 לנטר Stop thresholds, Unknown, Queue age, DB locks, errors, drift ו־customer impact. Legacy נשאר Read-only בתוך Rollback window; Decommission מתבצע רק לאחר Evidence, Retention ו־Legal approval. Expansion דורשת Review ולא Timer בלבד.

34.31.8.11 Rollback boundary מוגדר לפני החלון: לפני Target business writes אפשר להחזיר DNS/Callback ל־Legacy לאחר Drain מוכח של ה־Spool; אחרי Target writes אין החזרת Business processing ל־D1. DNS יכול לחזור רק ל־Target Artifact קודם שמדבר עם PostgreSQL.

34.31.9 Rollback ופוסט־Cutover.

34.31.9.1 לפני single-writer flip אפשר לחזור ל־Legacy artifact/source לאחר ביטול Target plan.

34.31.9.2 אחרי Target writes מתחילים, Rollback של App נשאר מול Target data. אין חזרה שקטה ל־D1/R2 שתאבד writes.

34.31.9.3 כשל Data integrity מפעיל Maintenance/read-only, restores target from approved backup או compensating migration; הוא אינו מפעיל dual-write.

34.31.9.4 לבצע 24h, 72h ו־7-day reconciliation, Incident review, access/secret cleanup, cost comparison ו־legacy dependency scan. Gate 26.0.2 אינו נסגר לפני השלמת חלון שבעת הימים או חלון ארוך יותר שנקבע ב־Plan.

34.31.9.5 למחוק Legacy runtime/credentials רק אחרי שני Reviewers, zero-import/zero-traffic evidence, export retention decision ו־rollback window שהסתיים.

34.31.10 שני Gate instances קנוניים ל־Cutover.

34.31.10.1 `Gate 26.0.1 — Cutover Ready/Go` נסגר לפני 34.31.8.5 ורק כאשר Scope/Registry/Owners/Window חתומים, 20 Records הוערכו, Target/Spool/Certificate/DNS/Meta plans Ready, Backup עבר Restore, Rehearsal עבר, Customer notice ו־Rollback authority קיימים, Release manifest קבוע ואין P0/P1. Gate זה מאשר את פעולות ה־Traffic/Freeze/Migration המסוימות בלבד ואינו מאשר Production launch.

34.31.10.2 `Gate 26.0.2 — Cutover Accepted` נסגר רק לאחר 20/20 Records במצב קביל לפי 34.31.2.4, ‏10/10 data slices ו־55/55 tables או Baseline חדש מאומת, שלושת Artifacts קשורים ל־Release, DNS/Meta callback ו־Ingress spool עברו Zero-loss/zero-duplicate reconciliation, אין Legacy writer/import/traffic, Restore ו־Rollback מתורגלים, בדיקות 24h/72h/7-day עברו וכל P0/P1 סגור.

34.32 הצלבת הגנת Cyber מלאה.

34.32.1 עקרונות ההצלבה.

34.32.1.1 תאריך ההצלבה הוא 26.08.2026. כל מסמך ספק, מגבלה, מחיר, גרסת API או יכולת התלויה בתוכנית מסחרית נבדקים מחדש לפני Pilot ולפני Production.

34.32.1.2 כל בקרת אבטחה כוללת שישה רכיבים: איום מוגדר, מניעה, בדיקה שלילית, Evidence חתום או מתוארך, זיהוי בזמן אמת ופעולת Containment/Recovery.

34.32.1.3 אין לאשר `Ready` על סמך קוד או תיעוד בלבד. בקרת Production מוכנה רק כאשר הבדיקה השלילית נכשלה באופן בטוח, ההתראה נצפתה, הראיה נשמרה ותרגיל השחזור או ה־Rollback עבר.

34.32.1.4 הבסיס הארגוני הוא שש פונקציות [NIST CSF 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20): `Govern`, ‏`Identify`, ‏`Protect`, ‏`Detect`, ‏`Respond`, ‏`Recover`.

34.32.1.5 בסיס הפיתוח הוא [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final), ‏[OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/releases), ‏[OWASP Top 10:2025](https://owasp.org/Top10/), ‏[OWASP API Security 2023](https://owasp.org/www-project-api-security/) ו־[CIS Controls v8.1](https://www.cisecurity.org/controls).

34.32.1.6 ה־Registry מצמיד גרסת Framework ו־Digest. ‏ASVS Bleeding Edge אינו Gate ל־Production; נכון למועד המחקר `5.0.0` היא המהדורה היציבה.

34.32.2 תחומי האיום והבקרות.

34.32.2.1 ממשל, נכסים וגבולות אמון.

34.32.2.1.1 איום: Service, endpoint, ספק, Token או זרימת מידע שאינם ידועים.

34.32.2.1.2 מניעה: Inventory של Code, APIs, Domains, Webhooks, Buckets, Databases, Queues, Models, Accounts, Owners וזרימות PII; Data classification ו־Threat model לכל שינוי מהותי.

34.32.2.1.3 בדיקה שלילית: Endpoint או Domain שאינו ב־Registry, ספק ללא Owner, Secret ללא תאריך Rotation ו־Data flow ללא Classification.

34.32.2.1.4 Evidence/Detection: Registry מתוארך, Data-flow diagram, RACI, Risk register, drift scan והתראה על Asset לא רשום.

34.32.2.1.5 תגובה/Recovery: לחסום את הנכס הלא־רשום, לסובב Credentials, לפתוח Incident ולהחזיר Scope רק אחרי Threat review. מקור: [NIST CSF 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20).

34.32.2.2 GitHub ושרשרת האספקה.

34.32.2.2.1 איום: Merge לא מאושר, Action זדוני, Dependency מוחלף, Token ארוך־חיים או Artifact שאינו זה שנבדק.

34.32.2.2.2 מניעה: Private repository, Ruleset מחייב, CODEOWNERS לרכיבים רגישים, Reviews נפרדים, חסימת Force-push/deletion, Required checks, Actions בהרשאות מינימום, Pin ל־commit SHA מלא, OIDC במקום Cloud secrets, SBOM ו־Artifact digest/provenance.

34.32.2.2.3 בדיקה שלילית: Commit/Artifact ללא Provenance מחייבת, שינוי Workflow ללא Owner, Action tag שהוזז, PR מ־Fork שמנסה לקרוא Secret ו־Artifact שהוחלף אחרי CI.

34.32.2.2.4 Evidence/Detection: Export של Ruleset, Review log, Workflow permissions, SBOM, Digest, Attestation והתראה על Workflow/Dependency drift.

34.32.2.2.5 תגובה/Recovery: להשבית Workflow, לבטל Token, למשוך Artifact, לבצע Rollback ולחקור כל Deployment שנבנה ממנו. מקורות: [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), ‏[Secure use of GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use), ‏[CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners), ‏[Artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations).

34.32.2.3 Secrets ומפתחות.

34.32.2.3.1 איום: Secret ב־React bundle, Git history, Log, Preview, CI output או מחשב אישי.

34.32.2.3.2 מניעה: Vault נפרד לכל Environment, Named owner, Rotation/expiry, Least privilege, איסור Secrets במשתני Client, Source Guard על כל Runtime boundary ו־Break-glass מתועד.

34.32.2.3.3 בדיקה שלילית: Secret canary בקוד, Staging key מול Production, מפתח שפג, חיפוש Bundle/Source maps ו־Log/Ticket עם Secret.

34.32.2.3.4 Evidence/Detection: Inventory ללא ערכי Secret, Rotation receipts, Access logs, Secret scans ו־Canary alerts.

34.32.2.3.5 תגובה/Recovery: Revoke לפני חקירה, Rotation של כל השרשרת, Invalidation של Sessions/Deployments וסריקת History. מקורות: [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html), ‏[GitHub secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/about-alerts), ‏[Vercel Sensitive Environment Variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables).

34.32.2.4 חשבונות Control Plane.

34.32.2.4.1 איום: השתלטות על GitHub, Vercel, Railway, AWS, Clerk, Meta, OpenAI, Better Stack או Billing.

34.32.2.4.2 מניעה: חשבונות אישיים בלבד, MFA או Passkey לכל משתמשי Pilot ולכל חשבון בעל גישה, ללא שיתוף סיסמאות, Role מינימלי, שני Owners, Access review חודשי, Offboarding מיידי ו־Break-glass מאובטח.

34.32.2.4.3 בדיקה שלילית: משתמש שעזב, Token ללא Owner, Recovery ללא שני מאשרים, חשבון Shared וניסיון שינוי Production ללא אישור.

34.32.2.4.4 Evidence/Detection: Membership exports, MFA posture, Audit logs, Access review ו־Alert על Privilege/Recovery change.

34.32.2.4.5 תגובה/Recovery: לנעול Account, לבטל Tokens, להקפיא Deploy/Send, לסובב Secrets ולבדוק Audit trail. מקור: [NIST Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final).

34.32.2.5 Vercel ו־React delivery.

34.32.2.5.1 איום: Preview ציבורי, Production Secret ב־Preview, Bypass link דולף, Host injection, XSS או WAF שאינו פעיל בתוכנית הנוכחית.

34.32.2.5.2 מניעה: Deployment protection, Sensitive variables, הפרדת Environments, ‏`APP_PUBLIC_ORIGIN` מסוג HTTPS, CSP/HSTS ושאר Security headers, Firewall/bot controls, איסור Source maps רגישים ומלאי Bypass exceptions.

34.32.2.5.3 בדיקה שלילית: גישה ישירה ל־Deployment URL, ‏`Host`/`X-Forwarded-Host` זדוני, CORS זר, CSP bypass ו־Shareable link שפג.

34.32.2.5.4 Evidence/Detection: Config export, Headers crawl, Firewall logs, Browser tests ו־Alert על Preview/Bypass change.

34.32.2.5.5 תגובה/Recovery: לחסום Deployment, לסובב Bypass secret, להוסיף Firewall deny ולקדם Artifact קודם שעבר Evidence. מקורות: [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection), ‏[Vercel Firewall](https://vercel.com/docs/vercel-firewall), ‏[Vercel managed WAF rules](https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets), ‏[Vercel response headers](https://vercel.com/docs/headers/response-headers).

34.32.2.6 Railway network ו־Runtime.

34.32.2.6.1 איום: DB, Redis או Worker חשופים לציבור; Production משותף ל־Staging; Healthcheck שמפורש בטעות כ־Monitoring רציף.

34.32.2.6.2 מניעה: רק API ציבורי, שאר השירותים ב־Private Network, Projects נפרדים כאשר RBAC סביבתי אינו זמין, Sealed variables, Production lock, Continuous external monitoring ו־Graceful shutdown.

34.32.2.6.3 בדיקה שלילית: Port scan חיצוני, Staging credential מול Production, Crash אחרי Deploy healthcheck, Redis outage ו־Worker shutdown באמצע Job.

34.32.2.6.4 Evidence/Detection: Public-domain inventory, Network/config export, Membership list, Monitor history, Shutdown logs ו־Alert על public exposure.

34.32.2.6.5 תגובה/Recovery: להסיר Public domain, להפעיל Under Attack/containment כאשר מתאים, לעצור Worker, לבצע Rollback ו־Rotation. מקורות: [Railway private networking](https://docs.railway.com/networking/private-networking/how-it-works), ‏[Lock down Production](https://docs.railway.com/guides/lock-down-production-project), ‏[Staging/Production isolation](https://docs.railway.com/guides/isolate-staging-production), ‏[Healthchecks](https://docs.railway.com/deployments/healthchecks).

34.32.2.7 Clerk, Authentication ו־Organizations.

34.32.2.7.1 איום: Session תקף בארגון שגוי, ‏`azp` זדוני, משתמש Pending, Role ישן או Webhook מזויף.

34.32.2.7.2 מניעה: Organization חובה, MFA לכל משתמשי Closed Pilot, Authorization בצד השרת בכל Request, ‏`authorizedParties`, בדיקת Status/Role עדכניים, Deny-by-default, Webhook signature ו־Invitation expiry.

34.32.2.7.3 בדיקה שלילית: Cross-org token, Role downgrade עם Session ישן, Pending membership, malicious `azp`, replay של Invitation/Webhook ו־MFA bypass.

34.32.2.7.4 Evidence/Detection: Auth matrix, Clerk snapshot, Negative suite, Webhook audit ו־Alerts על membership/role/session events.

34.32.2.7.5 תגובה/Recovery: לבטל Sessions, להסיר Membership, לסובב Webhook secret ולהקפיא פעולות Admin/Send. מקורות: [Clerk Organizations](https://clerk.com/docs/guides/organizations/overview), ‏[Roles and permissions](https://clerk.com/docs/guides/organizations/control-access/roles-and-permissions), ‏[Manual JWT verification](https://clerk.com/docs/guides/sessions/manual-jwt-verification), ‏[Clerk webhooks](https://clerk.com/docs/guides/development/webhooks/overview).

34.32.2.8 בידוד Tenant ו־PostgreSQL RLS.

34.32.2.8.1 איום: BOLA, Export/Search חוצה Tenants, Worker שפועל תחת Tenant שגוי או RLS שנעקף בידי Owner.

34.32.2.8.2 מניעה: Tenant נגזר מ־Session ולא מ־Body, ‏`tenant_id` בכל מפתח עסקי, RLS עם Default-deny ו־`FORCE ROW LEVEL SECURITY`, ‏Runtime role שאינו Owner/Superuser/`BYPASSRLS`, Composite constraints ו־Tenant context ב־Jobs/Object keys.

34.32.2.8.3 בדיקה שלילית: החלפת UUID, Batch/Export/Search חוצה Tenants, Owner bypass, Race בהרשאות, Job עם Tenant שגוי ו־Presigned URL של Tenant אחר.

34.32.2.8.4 Evidence/Detection: Policy/grant inventory, Role attributes, Negative matrix ו־Cross-tenant anomaly alerts.

34.32.2.8.5 תגובה/Recovery: להשעות Tenant/Jobs, לסובב DB credential, לבצע Impact query לפי Tenant ושחזור נקודתי בלבד. מקורות: [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), ‏[OWASP Multi-Tenant Security](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html).

34.32.2.9 API Authorization, Validation ו־Injection.

34.32.2.9.1 איום: BOLA/BFLA, Mass assignment, SQL injection, JSON bomb ו־Provider response לא בטוח.

34.32.2.9.2 מניעה: OpenAPI schema מחייב, Rejection של Unknown fields, Allowlists, Parameterized queries, Per-object/per-property authorization, Body/array/timeout limits ושגיאות ללא פרטים פנימיים.

34.32.2.9.3 בדיקה שלילית: Extra properties, Duplicate parameters, Unicode ambiguity, SQLi, Path traversal, Oversized JSON, Method override ו־Malformed provider payload.

34.32.2.9.4 Evidence/Detection: Schema coverage, Authorization matrix, Fuzz/DAST/SAST results ו־Alerts על Validation/authorization abuse.

34.32.2.9.5 תגובה/Recovery: להשבית Route/Feature, להחיל WAF/Rate rule, לבצע Rollback ולחקור Objects שנפגעו. מקורות: [OWASP API Security Top 10](https://owasp.org/www-project-api-security/), ‏[OWASP REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html), ‏[OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

34.32.2.10 Browser, XSS, CSRF ו־CORS.

34.32.2.10.1 איום: Code או Markdown זדוני, Clickjacking, Credentialed cross-origin request או מידע רגיש ב־Local storage/cache.

34.32.2.10.2 מניעה: Output encoding, איסור Renderer לא מסונן, CSP קשיח, `frame-ancestors`, HSTS, `nosniff`, Secure/HttpOnly/SameSite cookies, CSRF protection ו־CORS allowlist מדויק.

34.32.2.10.3 בדיקה שלילית: XSS polyglots, Markdown image exfiltration, ‏`Origin:null`, Wildcard עם Credentials, CSRF form, Iframe ו־Back/cache אחרי Logout.

34.32.2.10.4 Evidence/Detection: Header scan, CSP reports, Browser E2E ו־Alerts על blocked script/origin.

34.32.2.10.5 תגובה/Recovery: להשבית Renderer, להחיל CSP deny, לבצע Force logout ו־Rollback. מקורות: [OWASP CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html), ‏[OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html), ‏[OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

34.32.2.11 Webhooks, Replay ו־Idempotency.

34.32.2.11.1 איום: Payload מזויף, Event ישן, Duplicate, Out-of-order או Event חוקי המקושר ל־Tenant שגוי.

34.32.2.11.2 מניעה: אימות Signature על Raw body לפני Parsing, Timestamp tolerance כאשר הספק מספק, Unique provider event ID, State machine מונוטוני, Server-side provider-to-tenant mapping ו־Enqueue רק לאחר אימות.

34.32.2.11.3 בדיקה שלילית: Byte altered, Secret שגוי, Replay, Duplicate concurrent, Event ישן, סדר הפוך, JSON פגום וחתימה חוקית עם WABA/Tenant שגוי.

34.32.2.11.4 Evidence/Detection: Signature matrix, Dedupe records, Transition audit, Delivery logs ו־Alerts על invalid/replay/unknown binding.

34.32.2.11.5 תגובה/Recovery: לסובב Secret, להעביר ל־Quarantine, לעצור Consumer, לבצע Refetch של Provider state ו־Replay מבוקר מ־DLQ. מקורות: [Clerk verifyWebhook](https://clerk.com/docs/reference/backend/verify-webhook), ‏[Meta webhook payload reference](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference), ‏[OpenAI webhooks](https://developers.openai.com/api/docs/guides/webhooks).

34.32.2.12 Meta WhatsApp.

34.32.2.12.1 איום: Token גנוב, WABA שגוי, שליחה ללא Opt-in, הודעה חופשית מחוץ לחלון, Template מושהה, Quality נמוכה, קצב שהשתנה, מוצר AI-primary או שימוש אסור ב־Business Solution Data לשיפור מודל.

34.32.2.12.2 מניעה: Cloud API הרשמי בלבד, 2FA, Permissions מינימליות, Binding מאומת של WABA/Phone, Consent ledger, Suppression מיידי, Template/24-hour enforcement, Human escalation, Live-derived layered rate limits, AI ancillary classification ו־Third Party Service Provider contract.

34.32.2.12.3 בדיקה שלילית: Recipient ללא Consent, Opt-out אחרי תזמון, Free-form אחרי 24 שעות, Template paused, Token expired, Wrong phone ID, ‏`429`, Quality degradation, Duplicate send, WhatsApp content ב־Training corpus ו־AI-primary marketing/runtime.

34.32.2.12.4 Evidence/Detection: Graph API version, Permission snapshot, Consent proof, Template/quality status, Provider headers/webhooks, Test-WABA results, AI classification memo ו־Data-flow scan. טל הוא Owner של מחקר הקצב והמגבלות השוטף.

34.32.2.12.5 תגובה/Recovery: Kill switch לפי Tenant/Phone/AI, Pause campaign, Revoke token, Suppression, Human takeover ו־Appeal/legal runbook. מקורות: [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/), ‏[Meta official WhatsApp workspace](https://www.postman.com/meta/whatsapp-business-platform/overview/), ‏[WhatsApp Business Solution Terms](https://www.whatsapp.com/legal/business-solution-terms).

34.32.2.13 PostgreSQL, Migrations ו־Data integrity.

34.32.2.13.1 איום: Role רחב, Migration חלקית, Corruption, Lock או Restore חסר.

34.32.2.13.2 מניעה: Roles נפרדים ל־Runtime/Migration/Backup, Private connection, TLS, RLS, Expand-contract migrations, Constraints ו־Logical backup מחוץ ל־Railway בנוסף ל־PITR.

34.32.2.13.3 בדיקה שלילית: Migration שנקטעה, Old-app/new-schema, Long lock, Credential leak, Backup פגום ו־PITR לנקודה מדויקת.

34.32.2.13.4 Evidence/Detection: Grants, Migration digest, Backup manifest, Checksum, Restore drill ו־Alerts על lock/corruption/replication/backup.

34.32.2.13.5 תגובה/Recovery: לעצור Writers/Workers, לעבור Read-only, לבטל Credential, לשחזר ל־Clone, לאמת ואז לבצע Cutover. מקורות: [Railway PostgreSQL](https://docs.railway.com/databases/postgresql), ‏[Railway backup and restore](https://docs.railway.com/guides/postgres-backups-restores), ‏[Railway PITR](https://docs.railway.com/volumes/point-in-time-recovery).

34.32.2.14 Redis ו־BullMQ.

34.32.2.14.1 איום: Redis ציבורי, `FLUSHALL`, Queue poisoning, Eviction, Duplicate job, Retry storm או Worker שנקטע.

34.32.2.14.2 מניעה: Private network, Named ACL users כאשר נתמך, TLS בכל Boundary חוצה־רשת, חסימת Dangerous commands, Job schema, Tenant/action allowlist, Deterministic idempotency key, Durability capability מאומתת, `noeviction`, Quotas, Bounded retries, DLQ ו־Graceful shutdown.

34.32.2.14.3 בדיקה שלילית: חיבור חיצוני/ללא Auth, Dangerous command, Malicious job, Duplicate concurrent, Crash באמצע Job, Redis down, OOM/eviction ו־Poison DLQ.

34.32.2.14.4 Evidence/Detection: ACL/config export, Persistence proof, Queue metrics ו־Failure drill; יכולת שאינה נתמכת בתוכנית Railway נשארת Unknown.

34.32.2.14.5 תגובה/Recovery: לעצור Producers/Workers, לסובב ACL, לבודד Queue ולשחזר Jobs רק מ־DB source-of-truth מאומת. מקורות: [Redis Security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/), ‏[BullMQ Going to Production](https://docs.bullmq.io/guide/going-to-production).

34.32.2.14.6 Trust-boundary rule: Railway Private Network מצמצמת חשיפה אך כל Service שנפרץ בתוך אותו Environment הוא trusted-network attacker אפשרי. Redis credentials אינם משותפים עם Browser, CI, Preview, Migration או Support tools; ACL command scope, Tenant/action validation ו־DB re-authorization נשארים חובה גם ללא Public port.

34.32.2.14.7 Durability rule: AOF/RDB/Backup מגינים על זמינות Queue אך אינם פותרים stale replay, duplicate side effect, malicious job או restore של state ישן. כל Restore מתחיל כאשר Producers/Consumers כבויים, יוצר Inventory/Digest, משווה ל־PostgreSQL ledger, משליך Jobs שכבר Settled ומכניס Unknown ל־Quarantine לפני Resume.

34.32.2.14.8 Supply-chain rule: Redis image, BullMQ, Redis client ו־transitive packages מוצמדים ל־version+digest/lockfile, עוברים SBOM, signature/provenance כאשר זמינים, Advisory review ו־conformance suite. Redis advisory ישים או Drift מה־digest המאושר חוסמים Deploy; Runtime אינו מקבל `latest` או Image auto-update ללא staged evidence.

34.32.2.14.9 Abuse/DoS rule: Payload byte cap, per-Tenant/per-action admission, global queue cap, max delay, attempt budget, DLQ quota, connection budget ו־memory headroom מונעים Queue amplification. Alert אינו מספיק: Kill switch עוצר Producer class לפני Redis OOM, ‏DLQ full או Retry storm, תוך שמירת authoritative request ב־DB.

34.32.2.14.10 Secret/forensics rule: Password/ACL token, Redis URL, Job body ו־failedReason אינם נרשמים או נכללים ב־Evidence. Rotation מוכיחה old credential denial, controlled reconnect ו־zero lost/duplicate operations. Forensic bundle כולל רק IDs/digests, config allowlist, timestamps, counters ו־redacted topology.

34.32.2.15 Uploads, Malware ו־AWS S3.

34.32.2.15.1 איום: Executable מוסווה, Macro, PDF פגום, Zip bomb, Public object, Presigned URL חוצה Tenant או Race לפני Scan.

34.32.2.15.2 מניעה: Allowlist ל־PDF/TXT/DOCX עד 10 MiB, ‏Extension+MIME+Magic, Filename normalization, Decompression limits, Quarantine לפני Parser, Scanner receipt, Clean-state בלתי ניתן לזיוף, S3 Block Public Access, Bucket Owner Enforced, SSE-KMS, Short-lived scoped presigned URLs, Versioning ו־CloudTrail data events.

34.32.2.15.3 בדיקה שלילית: Renamed executable, Polyglot, Macro DOCX, Malformed PDF, Zip bomb, Malware, Oversize, Traversal, Expired URL, Tenant אחר, Public ACL/policy ו־Download לפני Clean.

34.32.2.15.4 Evidence/Detection: Object hash, Scanner result, State transition, Bucket/KMS/CloudTrail config, Download audit ו־Alerts על public/scan anomaly.

34.32.2.15.5 תגובה/Recovery: לבודד Object/version, לבטל URL/Key/grant, לעצור Ingestion, לזהות Downloads ולבצע Reprocess רק לאחר אישור. מקורות: [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), ‏[S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html), ‏[S3 Object Ownership](https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html), ‏[GuardDuty Malware Protection for S3](https://docs.aws.amazon.com/guardduty/latest/ug/gdu-malware-protection-s3.html).

34.32.2.16 SSRF ו־Outbound egress.

34.32.2.16.1 איום: URL שמגיע ממשתמש, מסמך או AI ומגיע ל־Metadata/Internal network.

34.32.2.16.2 מניעה: Allowlist של Scheme/Host/Port, Canonical DNS/IP validation, חסימת Private/link-local/metadata/IPv6, בדיקה מחדש אחרי Redirect, Egress allowlist ואיסור Tool-call ישיר ל־URL לא מאומת.

34.32.2.16.3 בדיקה שלילית: `127.0.0.1`, ‏`169.254.169.254`, ‏`::1`, כתובת עשרונית, Userinfo, Redirect, DNS rebinding, ‏`file:` ו־`gopher:`.

34.32.2.16.4 Evidence/Detection: Egress rules, Negative log, DNS/HTTP proxy alerts ו־Cloud audit.

34.32.2.16.5 תגובה/Recovery: לנתק Egress, להשבית Fetch/tool, לסובב Credentials שניתנים להגעה ולבדוק Cloud audit. מקור: [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

34.32.2.17 הצפנה ו־KMS.

34.32.2.17.1 איום: Plaintext, Key משותף בין Environments, Grant רחב או Signature/Ciphertext ששונו.

34.32.2.17.2 מניעה: TLS עם Certificate validation, SSE-KMS, Keys/grants נפרדים, Least privilege, Rotation ותיעוד שימוש במפתח.

34.32.2.17.3 בדיקה שלילית: Plaintext connection, Disabled certificate validation, Staging decrypt של Production, Altered ciphertext/signature ו־Revoked grant.

34.32.2.17.4 Evidence/Detection: TLS scan, Key policy, Access log, Rotation/restore result ו־Alerts על KMS deny/anomaly.

34.32.2.17.5 תגובה/Recovery: להשבית Grants, לבטל Credentials, לבצע Re-encryption לפי תוכנית ולבודד נתונים שנחשפו. מקורות: [AWS IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html), ‏[S3 SSE-KMS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html), ‏[KMS least privilege](https://docs.aws.amazon.com/kms/latest/developerguide/least-privilege.html).

34.32.2.18 Logging, Audit ו־Telemetry.

34.32.2.18.1 איום: פעולה ללא Attribution, Log injection, PII/Token בתוך Trace או Attacker שמשבש Collector.

34.32.2.18.2 מניעה: Actor/Tenant/resource/action/result/provider-ID/correlation-ID, Redaction לפני Emission, Append-only sink, Clock sync, Restricted access, Retention ו־Alerts לפעולות Admin, Role, Export, Campaign, Webhook failure, Cost ו־WABA quality.

34.32.2.18.3 בדיקה שלילית: Newline injection, PII/Secret canary, Time skew, Collector DoS, Tampering ואי־מסירת Alert.

34.32.2.18.4 Evidence/Detection: Immutable query, Alert acknowledgement, Detection drill ו־Schema/redaction reports.

34.32.2.18.5 תגובה/Recovery: לשמר/לנעול Evidence, להגדיל Retention כשמותר, לייצא לפני תפוגת ספק ולפתוח Incident. מקורות: [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), ‏[OpenTelemetry Security](https://opentelemetry.io/docs/security/), ‏[CloudTrail data events](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html).

34.32.2.19 Rate limiting, DoS ו־Cost exhaustion.

34.32.2.19.1 איום: עקיפת Limit מבוזר, Retry storm, Queue flooding, Upload/AI/Campaign יקרים או Provider `429`.

34.32.2.19.2 מניעה: שכבות User/Tenant/IP/endpoint/provider, Concurrency ו־Queue admission caps, Request/token/output limits, Spend caps, Circuit breakers, ‏`Retry-After`, Bounded backoff דטרמיניסטי ו־Degraded mode.

34.32.2.19.3 בדיקה שלילית: Parallel burst, IPv6/IP rotation, Multi-endpoint bypass, Expensive prompt/file, Repeated retries, Backlog ו־Provider throttling.

34.32.2.19.4 Evidence/Detection: Limit configuration, Usage dashboard, Cost alerts, Abuse/load tests ו־Tal approval למגבלות Meta.

34.32.2.19.5 תגובה/Recovery: Tenant kill switch, Pause campaign/workers, Lower caps, Disable expensive feature ו־Provider spend cap. מקורות: [OWASP API unrestricted resource consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/), ‏[OpenAI rate limits](https://developers.openai.com/api/docs/guides/rate-limits).

34.32.2.20 OpenAI privacy ו־Data lifecycle.

34.32.2.20.1 איום: Prompt/message/PII נשמרים שלא לצורך, File שלא נמחק, Key רחב, Third-party tool עם Retention אחר או שימוש אסור ב־WhatsApp data לשיפור מודל.

34.32.2.20.2 מניעה: Minimization/pseudonymization, Project service account, Model/tool allowlist, ‏`store:false`, Deletion receipts, Documented retention, Legal approval, D02-A2 ו־איסור Training/improvement על Business Solution Data.

34.32.2.20.3 בדיקה שלילית: Request עם `store:true`, File ללא Expiry, PII canary, Project key חוצה Environment, Model/tool לא מורשה, Failed deletion, Live WhatsApp corpus ב־Eval ו־Provider training opt-in.

34.32.2.20.4 Evidence/Detection: Data-control snapshot, DPA/approval, Request metadata ללא Content, Deletion receipts, Usage report, AI classification memo ו־Dataset provenance scan.

34.32.2.20.5 תגובה/Recovery: להשבית AI, לבטל Service account, למחוק Stored resources, לעצור Ingestion ולפתוח Privacy/Meta incident review. מקורות: [OpenAI Data Controls](https://developers.openai.com/api/docs/guides/your-data), ‏[OpenAI Production Best Practices](https://developers.openai.com/api/docs/guides/production-best-practices), ‏[WhatsApp Business Solution Terms](https://www.whatsapp.com/legal/business-solution-terms).

34.32.2.21 Prompt injection, RAG poisoning ו־Excessive agency.

34.32.2.21.1 איום: Direct/indirect injection, Document poisoning, Cross-tenant retrieval, System-prompt leak, Unsafe output או Tool action.

34.32.2.21.2 מניעה: מסמכים הם Untrusted data, הפרדה מבנית בין Instruction/Data, ‏Tenant ACL בזמן Retrieval, Source citations, Structured-output validation, Least-privilege tools, Human approval לכל Send/Delete/Billing/Admin, Moderation ו־Prompt/model digest.

34.32.2.21.3 בדיקה שלילית: Direct, indirect, encoded, Unicode, Markdown/HTML, Multi-turn, System extraction, Poisoned document, Cross-tenant vector, Tool-argument injection ו־Unbounded consumption.

34.32.2.21.4 Evidence/Detection: Adversarial corpus, Eval לפי Model/Prompt/source version, Approval audit, Retrieval trace ו־Alert על policy/abuse anomaly.

34.32.2.21.5 תגובה/Recovery: להשבית Tools/Model, להחזיר Prompt שעבר Evals, לבודד Source, למחוק ולבנות מחדש Vectors ולעצור Outbound actions. מקורות: [OWASP GenAI LLM Top 10 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/), ‏[OWASP Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html), ‏[OWASP RAG Security](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html), ‏[OpenAI Safety Best Practices](https://developers.openai.com/api/docs/guides/safety-best-practices).

34.32.2.22 Retention, Legal Hold ומחיקה.

34.32.2.22.1 איום: Plan ישן או ששונה, מחיקה רחבה מדי, Race עם מידע חדש, מחיקת Active/legal-hold record או Provider failure חלקי.

34.32.2.22.2 מניעה: Retention Plan v2 עם `planId`, Digest, Expiry קצר, Policy version, Cutoff, Data-class trigger matrix, Provider-confirmed IDs וטרנזקציה אטומית; Post-delete inspection הוא Audit בלבד.

34.32.2.22.3 בדיקה שלילית: Plan שפג/שונה, Trigger אסור, Active record, Legal hold, Concurrent insert, Partial provider failure ו־Backup retention conflict.

34.32.2.22.4 Evidence/Detection: Plan digest, Dry-run counts, Transaction/provider receipts, Audit result ו־Alerts על deletion anomaly.

34.32.2.22.5 תגובה/Recovery: לעצור Deletion, להקפיא Legal Hold, לפתוח Incident ולשחזר רק מגיבוי מאומת כאשר מותר. מקור מסגרת: [NIST CSF 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20).

34.32.2.23 Backup, Restore ו־Ransomware.

34.32.2.23.1 איום: Restore שאינו קשור לגיבוי, Backup שנפגע, Production credential שמוחק גם גיבויים או RPO/RTO שלא הוכחו.

34.32.2.23.2 מניעה: Evidence v2 המקשר `backupId` ו־Digests של DB/S3, Railway native backup+PITR, Logical offsite יומי ל־S3 בחשבון/Boundary נפרד, 90 ימי Daily לפי D08, Credentials נפרדים ו־Restore לסביבה מבודדת. Archive חודשי מעבר ל־90 יום הוא החלטת Legal/Privacy/Finance חיצונית ואינו מופעל כברירת מחדל.

34.32.2.23.3 בדיקה שלילית: Digest שונה, Backup ID זר, Missing object version, Account loss, Compromised Production key, מחיקת Railway Project ותרגיל RPO/RTO מתוזמן.

34.32.2.23.4 Evidence/Detection: Manifest, Checksums, Row/object counts, Tenant-isolation validation, Backup/PITR health ו־Restore drill destruction receipt.

34.32.2.23.5 תגובה/Recovery: לבודד, לסובב Credentials לפני Restore, לשחזר ל־Clone, לבצע Forensic validation ו־Canary cutover עם יכולת חזרה. מקורות: [Railway backup/restore](https://docs.railway.com/guides/postgres-backups-restores), ‏[S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html), ‏[S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html).

34.32.2.24 Deployment, Migration ו־Rollback.

34.32.2.24.1 איום: Deploy מקומי לא מבוקר, Artifact שונה, Preview עם Production data, Migration שאינה Backward-compatible או Rollback שכבר נמחק אצל הספק.

34.32.2.24.2 מניעה: CI-only deployment, Immutable digest, Environment approvals, OIDC, Canary, Expand-contract DB, Feature flags, Smoke tests ו־Rollback artifact השמור מעבר לחלון הספק.

34.32.2.24.3 בדיקה שלילית: Failed canary, Old-app/new-schema, Mid-deploy webhook, Preview secret leak, Artifact mismatch ו־Rollback מחוץ ל־Retention.

34.32.2.24.4 Evidence/Detection: Commit/reviews/checks, Artifact digest, Migration ID, Approval, Canary metrics ו־Rollback drill.

34.32.2.24.5 תגובה/Recovery: להקפיא Deployment, לקדם Artifact קודם, להשבית Feature; DB rollback רק אם הוכח בטוח, אחרת Forward-fix או PITR מבוקר. מקורות: [Vercel OIDC](https://vercel.com/docs/oidc), ‏[GitHub deployment hardening](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments), ‏[Railway rollback](https://docs.railway.com/guides/roll-back-bad-deploy).

34.32.2.25 Vulnerability ו־Dependency management.

34.32.2.25.1 איום: Dependency עם CVE פעיל, Container/base image ישן, Exposed debug endpoint או Secret חדש.

34.32.2.25.2 מניעה: SAST, SCA, Secret, IaC, Container ו־DAST scans; SBOM; Dependabot/CodeQL; KEV prioritization; SLA לפי Exploitability; VDP ו־Penetration test לפני Production.

34.32.2.25.3 בדיקה שלילית: Vulnerable package, Malicious transitive dependency, Secret canary, Debug endpoint ו־Unsafe workflow.

34.32.2.25.4 Evidence/Detection: SARIF, SBOM, KEV comparison, Remediation ticket ו־Rescan; כל Artifact נקשר ל־Release.

34.32.2.25.5 תגובה/Recovery: להשבית Component, להחיל WAF/virtual patch, לבצע Patch או Rollback, לסובב Credential ולתקן Root cause. מקורות: [CISA KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog), ‏[GitHub Code Scanning](https://docs.github.com/en/code-security/concepts/code-scanning), ‏[Dependabot alerts](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-alerts).

34.32.2.26 Campaign business logic ו־Maker-checker.

34.32.2.26.1 איום: Creator מאשר לעצמו, Audience משתנה אחרי אישור, Opt-out מאוחר, Duplicate send או Cross-tenant contact.

34.32.2.26.2 מניעה: Immutable campaign manifest/digest, Approver נפרד, Consent snapshot וגם Recheck בזמן Send, Recipient/cost caps, Cancellation, Idempotency ו־Human approval.

34.32.2.26.3 בדיקה שלילית: Creator=approver, Contact changed after approval, Timezone boundary, Double click/retry, Opt-out אחרי תזמון, Partial send ו־Wrong tenant.

34.32.2.26.4 Evidence/Detection: Manifest, Approvals, Recipient diff, Send/status ledger ו־Alerts על quota/duplicate/policy stop.

34.32.2.26.5 תגובה/Recovery: Pause/kill campaign, Suppression, Reconciliation ו־הודעה מבוקרת על שליחה שגויה לפי Legal/Incident plan. מקורות: [OWASP Business Logic Security](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html), ‏[OWASP Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html).

34.32.2.27 DNS, Domains ו־Origin.

34.32.2.27.1 איום: Subdomain takeover, Dangling Vercel/Railway record, Registrar compromise או Callback שנבנה מ־Host זדוני.

34.32.2.27.2 מניעה: Registrar MFA/lock, DNS inventory, DNSSEC ו־CAA כאשר נתמכים, ‏`APP_PUBLIC_ORIGIN` מאומת, Exact callback URLs והסרת Records עם מחיקת Deployment.

34.32.2.27.3 בדיקה שלילית: Dangling CNAME, Malicious Host, HTTP downgrade, Unknown origin ו־Expired certificate.

34.32.2.27.4 Evidence/Detection: DNS diff, Ownership proof, TLS scan, Origin test ו־Alert על DNS/certificate drift.

34.32.2.27.5 תגובה/Recovery: להסיר Record/route, לנעול Registrar, לסובב OAuth/Webhook secrets ולעדכן Callbacks. מקור: [OWASP Subdomain Takeover Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Subdomain_Takeover_Prevention_Cheat_Sheet.html).

34.32.2.28 מחשבי פיתוח ו־AnyDesk.

34.32.2.28.1 איום: Unattended remote access, Clipboard/file exfiltration, מחשב אישי נגוע או Session שנותר פתוח.

34.32.2.28.2 מניעה: Company-managed endpoint, Disk encryption, EDR, Patching, Separate OS account, MFA, Just-in-time remote access, Allowlist, Session audit ו־Clipboard/file-transfer חסומים כברירת מחדל.

34.32.2.28.3 בדיקה שלילית: Orphan session, Reused password, Lost device, Unauthorized transfer ו־Offboarded user.

34.32.2.28.4 Evidence/Detection: Device posture, Remote-access logs, Access review ו־Alerts על unattended/unknown access.

34.32.2.28.5 תגובה/Recovery: לנתק Remote access, לבודד Endpoint, לשמר Forensic image ולסובב כל Credential שהיה זמין. מקור: [CISA Guide to Securing Remote Access Software](https://www.cisa.gov/resources-tools/resources/guide-securing-remote-access-software).

34.32.2.29 זמינות ותלות בספקים.

34.32.2.29.1 איום: Outage של Clerk, Meta, OpenAI, Railway, Redis, AWS או Better Stack שיוצר Retry storm או פעולה כפולה.

34.32.2.29.2 מניעה: Timeout, Circuit breaker, Bulkhead, Bounded retry, Queue backpressure, Graceful degradation, Read-only/manual mode, SLO חיצוני ו־Provider kill switches.

34.32.2.29.3 בדיקה שלילית: DNS failure, Timeout, Slow response, ‏`429`, Partial outage, Stale webhook ו־Recovery אחרי Backlog.

34.32.2.29.4 Evidence/Detection: Failure-injection drill, SLO/alert timeline, Provider status correlation ו־Reconciliation report.

34.32.2.29.5 תגובה/Recovery: להשבית Dependency path, לעצור Workers/Campaigns, להפעיל Manual fallback ולשחרר Backlog באופן מבוקר. מקורות: [BullMQ production guidance](https://docs.bullmq.io/guide/going-to-production), ‏[OpenTelemetry Security](https://opentelemetry.io/docs/security/).

34.32.2.30 Incident response ו־Recovery.

34.32.2.30.1 איום: תגובה מאוחרת, אובדן ראיות, Recovery לא מאומת או הודעה שגויה.

34.32.2.30.2 מניעה: Severity matrix, Incident Commander, Primary+backup RACI, Kill-switch catalog, Evidence preservation, Legal/privacy/provider/customer communication, Post-incident root cause ו־Control update.

34.32.2.30.3 בדיקה שלילית/Tabletop: GitHub compromise, Meta token theft, Cross-tenant leak, Malicious upload, AI exfiltration, DB ransomware ו־Provider outage.

34.32.2.30.4 Evidence/Detection: Timestamps, Decisions, Containment proof, Recovery validation, Communication approval ו־Postmortem tasks.

34.32.2.30.5 תגובה/Recovery: Contain, Preserve, Eradicate, Recover ל־Known-good, Monitor מוגבר וסגירה רק לאחר אימות. מקור: [NIST SP 800-61 Rev.3](https://csrc.nist.gov/pubs/sp/800/61/r3/final).

34.32.2.31 Supplier security ו־Third-party governance.

34.32.2.31.1 איום: ספק ללא Due diligence, Subprocessor חדש, תנאים ששונו, שירות ללא Exit path, חשיפה גאוגרפית או ספק שנפרץ בלי Notification מספיק.

34.32.2.31.2 מניעה: Supplier register עם Criticality, Data classes, Regions, Controller/processor role, Security/DPA/SLA, Subprocessors, Breach notice, Deletion/portability, Financial/operational resilience, Account owners, Renewal ו־Exit plan. ספק Critical עובר Due diligence לפני Contract וביקורת שנתית או בעת שינוי מהותי.

34.32.2.31.3 בדיקה שלילית: Contract/DPA שפג, Subprocessor או Region שהשתנו ללא Review, SOC/ISO claim ללא Report תקף, Account ללא Owner, Export/Delete שלא נבדקו ו־Provider shutdown.

34.32.2.31.4 Evidence/Detection: Supplier assessment, Contract/terms digest, Subprocessor diff, Status/security advisories, Exit drill ו־Alert לפני Expiry או Terms change.

34.32.2.31.5 תגובה/Recovery: להשבית Onboarding/feature, להפסיק Data transfer, לייצא/למחוק לפי Contract, לסובב Credentials, להפעיל Manual fallback או Migration plan ולפתוח Incident. מקורות: [NIST SP 1326 supplier due diligence](https://csrc.nist.gov/pubs/sp/1326/final), ‏[NIST SP 800-161r1-upd1](https://www.nist.gov/publications/cybersecurity-supply-chain-risk-management-practices-systems-and-organizations).

34.32.2.32 Email, Phishing ו־Business Email Compromise.

34.32.2.32.1 איום: Domain spoofing, Invitation/reset phishing, BEC נגד Finance/Support, Mailbox takeover, Bounce/complaint ignored או Secret/PII בתוך Email.

34.32.2.32.2 מניעה: Corporate email accounts עם MFA phishing-resistant כאשר אפשר, Sender domain נפרד ומאושר ל־Transactional mail, SPF ו־DKIM תקפים, DMARC מתחיל ב־Monitoring ומתקדם ל־`reject` לאחר Alignment, STARTTLS, Branded exact links, No secrets/message body, Bounce/complaint suppression, Abuse/security mailboxes ו־Maker-checker לשינוי תשלום/Domain.

34.32.2.32.3 בדיקה שלילית: Lookalike domain, From/Return-Path misalignment, DMARC failure, Malicious redirect, Replayed invitation/reset, Mailbox role change, Bounce loop, Complaint recipient resend ו־Invoice bank-detail change באימייל בלבד.

34.32.2.32.4 Evidence/Detection: DNS records, DMARC aggregate reports, Provider logs, Bounce/complaint ledger, Phishing tabletop ו־Alerts על Domain/Mailbox/Finance rule change.

34.32.2.32.5 תגובה/Recovery: לעצור Email channel, לסובב Keys/Sessions, להסיר Rule/Forward, להשעות Billing/Admin changes, להודיע בערוץ מאומת ולשחזר Sender reputation. מקורות: [CISA Cybersecurity Performance Goals — Email Security](https://www.cisa.gov/sites/default/files/publications/CISA_CPG_CHECKLIST_12052022.pdf), ‏[NIST Phishing guidance](https://www.nist.gov/itl/smallbusinesscyber/guidance-topic/phishing), ‏[NIST phishing-resistant MFA](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/).

34.32.2.33 People security, Insider risk ו־Security awareness.

34.32.2.33.1 איום: טעות אנוש, Social engineering, שימוש לא מורשה ב־AI/Cloud, Insider זדוני, Privilege שנשאר לאחר שינוי תפקיד או דיווח מאוחר.

34.32.2.33.2 מניעה: Screening/contract לפי דין ותפקיד, Acceptable-use ו־Data-handling policy, Secure coding/Privacy/Meta/AI/Phishing training לפי Role, Least privilege, Segregation of duties, Mandatory vacations/review לתפקידים קריטיים כאשר מתאים, Reporting channel מוגן ו־Joiner/mover/leaver workflow.

34.32.2.33.3 בדיקה שלילית: עובד לשעבר, Role change ללא Revoke, Secret שנשלח ל־AI אישי, Simulated phishing מותאם־קושי, ניסיון Export/Send ללא צורך ו־Incident שלא דווח בזמן.

34.32.2.33.4 Evidence/Detection: Training/acknowledgement records, Access review, Anomaly alerts, Offboarding drill, Phishing metrics שאינם נשענים רק על Click rate ו־Protected reporting log.

34.32.2.33.5 תגובה/Recovery: להשעות גישה באופן מידתי, לשמר Evidence, להגן על מדווחים ופרטיות עובדים, לסובב Credentials, לערב HR/Legal/Security ולתקן Process בלי להסתמך על ענישה בלבד. מקורות: [CISA Insider Threat Mitigation resources](https://www.cisa.gov/topics/physical-security/insider-threat-mitigation/resources-and-tools), ‏[NIST Phish Scale](https://csrc.nist.gov/pubs/tn/2276/final).

34.32.2.34 Billing, Payments, PCI ו־Entitlements.

34.32.2.34.1 איום: Checkout מזויף, Webhook מזויף או Replayed, Price/Currency/Tax tampering, Payment/Refund/Chargeback כפול, Invoice bank-detail fraud, Entitlement escalation, PAN/CVV leakage או Admin credit בלתי־מורשה.

34.32.2.34.2 מניעה: Hosted checkout בלבד לאחר Pilot, Provider יחיד פעיל, exact Price/Catalog version בשרת, raw-body signature/timestamp/replay guard, monotonic payment ledger, idempotent reconciliation, Maker-checker ל־Refund/Credit/Bank details, PCI scope inventory, no PAN/CVV storage/logging ו־Entitlement שנגזר רק מ־verified provider/manual finance fact.

34.32.2.34.3 בדיקה שלילית: forged/replayed/reordered webhook, Redirect success בלי Provider fact, wrong Tenant/Price/Currency/Tax, duplicate charge/refund, partial refund, Chargeback אחרי entitlement, Admin self-approval, malicious invoice attachment, PAN/secret canary ב־Log ו־Provider outage באמצע transition.

34.32.2.34.4 Evidence/Detection: PCI responsibility matrix, Hosted-checkout boundary, Provider signature/config export, ledger-to-provider/finance reconciliation, Entitlement reconstruction, Refund/credit approvals, anomaly/cost alerts ו־no-card-data scan.

34.32.2.34.5 תגובה/Recovery: להשבית Checkout/Refund/Credit בנפרד, לשמר Inbound provider facts, לעצור cost-creating entitlements, לסובב webhook keys, לבצע Finance reconciliation, להודיע בערוץ מאומת ולחדש רק לאחר Retest. מקורות Base: [PCI DSS document library](https://www.pcisecuritystandards.org/document_library/?class=pcidss&doc=pci_dss), ‏[PayPlus validation guidance](https://docs.payplus.co.il/reference/validate-requests-received-from-payplus), ‏[Tranzila authentication](https://docs.tranzila.com/docs/payments-and-billing/authentication). מקורות Paddle/Stripe נשמרים למחקר Dormant בלבד ואינם מסמיכים Adapter, Checkout או Entitlement.

34.32.2.35 Browser, BFF, workload identity ו־server-bound user authority.

34.32.2.35.1 Scope: React, Clerk cookies/sessions, Connect opaque application session, Vercel BFF, Vercel OIDC workload token, internal user-context envelope, Railway ingress, authorization and revocation.

34.32.2.35.2 איום: Browser-readable provider token; ‏`getToken()`/Bearer; direct Railway; cookie/session riding; CSRF/XSS; stolen short token; wrong issuer/audience/subject/team/project/environment; stale JWKS; replay; method/path/body swap; stale membership/role; Preview→Production crossing; confused deputy בין workload ל־user authority.

34.32.2.35.3 מניעה: same-origin BFF בלבד; אין Browser Bearer או token storage; exact cookie/CSRF/origin/fetch-metadata policy; Connect application session רק לאחר X24; Vercel workload validation; signed request-bound user context; DB/RLS/object authorization עצמאיים; direct ingress denied.

34.32.2.35.4 בדיקה שלילית: Browser token/storage, direct ingress, cookie riding, Origin/CSRF שגויים, replay, JWKS stale, org/role mismatch, request-body swap ו־Preview identity המנסה לגשת ל־Production.

34.32.2.35.5 Evidence/Detection: token/storage scan, direct-ingress deny telemetry, CSRF/origin reason, replay ledger, session/revocation lag, JWKS/key age, org/role mismatch ו־Preview/Production identity drift.

34.32.2.35.6 תגובה/Recovery: להשבית Mutations מושפעות, לסגור ingress, לבטל Clerk/application/signing sessions/revisions ולשמר Evidence ללא Tokens; חזרה רק ל־BFF artifact מאושר, signing revision חדשה, membership reconciliation ו־direct-ingress negative proof. אין fallback ל־React Bearer.

34.32.2.35.7 מיפוי: `threatIds=TH-001,TH-007,TH-015,TH-017,TH-018,TH-020`; `controlIds=CTL-003,CTL-004,CTL-005,CTL-006,CTL-020`; `findingIds=MP-F014,MP-F021,MP-F051,MP-F052`; `frameworkIds=FR-012,FR-013,FR-040,FR-041,FR-055,FR-058,FR-062`.

34.32.2.36 Test, Eval ו־Evidence data provenance.

34.32.2.36.1 Scope: unit/integration/security/browser/provider tests, AI eval corpus, migration comparison, operational probes, screenshots, logs ו־reviewer evidence.

34.32.2.36.2 איום: invented business data המוצג כהוכחה; Production PII שהועתק ל־Test; redaction לא מאושר; cross-tenant corpus; Sandbox המוצג כ־Live; vector נורמטיבי שפג; corpus ששונה; digest/source חסר; Secret דולף; מידע שנמחק או בוטל ונעשה בו שימוש חוזר; תוצאה שבודקת פעולה אחרת.

34.32.2.36.3 מניעה: רק ארבעת מקורות הראיה המאושרים שב־5.4; provenance registry; purpose/tenant/use/expiry binding; loader deny על digest לא מוכר; redaction ו־destruction policy.

34.32.2.36.4 בדיקה שלילית: source/digest drift, provenance לא ידוע, PII/secret canary, sandbox/live mismatch, corpus mutation, approval שפג, cross-tenant identifier ו־Action↔Test semantic mismatch.

34.32.2.36.5 Evidence/Detection: source, authority, approval, redaction, destruction, artifact digest, test-target digest ו־semantic assertion לכל תוצאה; Unknown provenance או expiry מבטלים כל Gate/claim תלוי.

34.32.2.36.6 תגובה/Recovery: להכניס Dataset/Evidence ל־Quarantine, לבטל Claims ו־Gates תלויים, לבטל גישה ולסובב חומר שדלף; להתאושש רק באמצעות מקור מאושר, הרצה חוזרת של הבדיקה המדויקת, destruction receipt ו־Review מחדש. אין relabeling בדיעבד של מידע מומצא.

34.32.2.36.7 מיפוי: `threatIds=TH-001,TH-007,TH-012,TH-022,TH-027`; `controlIds=CTL-001,CTL-002,CTL-003,CTL-012,CTL-013,CTL-015,CTL-020`; `findingIds=MP-F001,MP-F037,MP-F042,MP-F050,MP-F052`; `frameworkIds=FR-003,FR-004,FR-005,FR-013,FR-014,FR-020,FR-027,FR-049`.

34.32.2.37 Crypto inventory, agility ו־PQC transition.

34.32.2.37.1 Scope: TLS, OAuth/OIDC/JWT, application session, webhooks, HMAC, KMS/S3, backup, artifact signing, evidence verification, mobile keys ו־Public API signatures עתידיים.

34.32.2.37.2 איום: algorithm/key/provider/purpose לא ידוע; weak fallback/downgrade; revoked key reuse; אותו Key למספר מטרות; rotation/recovery חסרים; claim ספק ללא Live proof; custom crypto; Partial PQC שמשאיר classical termination/backup/verifier; harvest-now-decrypt-later; interoperability או rollback failure.

34.32.2.37.3 מניעה: exact crypto inventory; approved algorithm/protocol/key/provider allowlist; purpose separation; data/signature lifetime; איסור untrusted algorithm selection; איסור custom crypto/hybrid/PQC; migration/coexistence/rollback רק על בסיס Platform standards מאושרים.

34.32.2.37.4 בדיקה שלילית: unknown/deprecated suite, negotiation downgrade, revoked/wrong-purpose key, stale trust store, untracked crypto use, unsupported provider path, failed rotation, failed verifier interoperability ו־rollback שמחזיר Key מבוטל.

34.32.2.37.5 Evidence/Detection: crypto inventory digest, key/certificate age, negotiation telemetry, trust-store drift, provider roadmap freshness, known-answer/vendor conformance, cross-consumer verification ו־rotation/recovery drill.

34.32.2.37.6 תגובה/Recovery: לעצור acquisition, לבטל חומר שנפגע, להשבית verifier/encryption path ולפתוח Incident; מעבר רק באמצעות implementation מאושר של Platform, בדיקות תאימות ו־suite מאושר שעדיין בטוח. Key מבוטל אינו חוזר.

34.32.2.37.7 מיפוי: `threatIds=TH-007,TH-009,TH-014,TH-017,TH-023,TH-027,TH-031`; `controlIds=CTL-002,CTL-003,CTL-014,CTL-016,CTL-020`; `findingIds=MP-F021,MP-F031,MP-F049,MP-F052`; `frameworkIds=FR-027,FR-028,FR-029,FR-040,FR-055,FR-060,FR-061,FR-062,FR-063,FR-064,FR-065,FR-066`.

34.32.2.38 Public API, outgoing webhooks ו־connector framework.

34.32.2.38.1 Scope: OAS contract מותנה, API clients, credentials/scopes, idempotency, pagination, rate limits, webhook subscriptions/delivery/signatures, destinations, connector adapters ו־exit.

34.32.2.38.2 איום: BOLA/BFLA; mass assignment; scope confusion; secret leak; stale/replayed request; duplicate side effect; blind retry; webhook forgery/reorder; SSRF/DNS rebinding; redirects; private/link-local destination; tenant callback mix; schema/version drift; unbounded export; connector confused-deputy; provider suspension.

34.32.2.38.3 מניעה: Conditional Gate; OAS 3.2 contract; server-derived tenant; deny-by-default scopes; deterministic idempotency/event IDs; transactional outbox; at-least-once semantics; RFC 9421+9530 profile; exact destination verification; DNS/IP revalidation; Redirects כבויים ב־v1; egress allowlist; connector kill/exit.

34.32.2.38.4 בדיקה שלילית: wrong tenant/object/scope, duplicate/replay, request swap, aged unknown outcome, forged/reordered webhook, schema drift, DNS rebinding, private/link-local target, redirect, unbounded export, suspended connector ו־credential rotation race.

34.32.2.38.5 Evidence/Detection: auth/scope denials, duplicate/replay ledger, unknown-outcome age, schema/digest drift, DNS/IP changes, delivery backlog, provider health/cost/rate, subscription ownership ו־exit drill.

34.32.2.38.6 תגובה/Recovery: להשבית client/subscription/connector/capability בנפרד, לבטל Key, לעצור retries/acquisition ולשמר Durable facts; לחזור רק אחרי אימות client/destination/key/revision, reconciliation ו־controlled cohort resume.

34.32.2.38.7 מיפוי: `threatIds=TH-001,TH-003,TH-005,TH-007,TH-016,TH-017,TH-019,TH-021,TH-023,TH-027,TH-032`; `controlIds=CTL-003,CTL-004,CTL-006,CTL-007,CTL-010,CTL-013,CTL-016,CTL-020`; `findingIds=MP-F040,MP-F041,MP-F045,MP-F046,MP-F049,MP-F050,MP-F052`; `frameworkIds=FR-013,FR-016,FR-019,FR-040,FR-055,FR-057,FR-058,FR-059,FR-060,FR-061,FR-062`.

34.32.2.39 Multi-region, split-brain ו־single-writer side effects.

34.32.2.39.1 Scope: conditional Railway web/API replicas, PostgreSQL/Redis ownership, edge/DNS routing, regional queue/workers, Meta/Billing/Email/Delete side effects, failover/failback ו־legal/data transfer.

34.32.2.39.2 איום: stateless-replica assumption שגויה; volume עם replicas; sticky-session dependence; database/queue split-brain; שני Regions שרוכשים אותו Side effect; stale ownership epoch; DNS partial cutover; clock/timezone difference; KMS/credential unavailable; data-transfer violation; asymmetric monitoring; failback replay.

34.32.2.39.3 מניעה: active-passive side effects; single writer; ownership epoch/fencing/lease; home region; stateless API; אין replica volume; data-layer topology מפורשת; provider/region capability registry ו־bounded failover authority.

34.32.2.39.4 בדיקה שלילית: dual writer/epoch, lease overlap, queue/database divergence, regional telemetry gap, partial DNS/certificate/credential cutover, replica volume/sticky dependence, reduced backup window ו־failback replay.

34.32.2.39.5 Evidence/Detection: ownership/lease ledger, queue/DB consistency, regional telemetry parity, DNS/certificate/credential diff, WAL/backup window, cost/transfer report ו־full failover/failback drill.

34.32.2.39.6 תגובה/Recovery: לסגור ingress מושפע, לבצע fence ל־loser, לעצור Side effects חדשים ולשמר Unknown outcomes; לחזור ל־Writer יחיד מאומת, reconcile exact state ולבצע controlled routing ramp. אין automatic replay בין Regions.

34.32.2.39.7 מיפוי: `threatIds=TH-003,TH-008,TH-009,TH-019,TH-021,TH-022,TH-023,TH-027,TH-030,TH-031,TH-032`; `controlIds=CTL-007,CTL-009,CTL-010,CTL-014,CTL-015,CTL-016,CTL-020`; `findingIds=MP-F008,MP-F016,MP-F032,MP-F039,MP-F047,MP-F049,MP-F052`; `frameworkIds=FR-001,FR-003,FR-004,FR-007,FR-008,FR-009,FR-031,FR-032,FR-062`.

34.32.2.40 Native mobile, Store policy ו־mobile supply chain.

34.32.2.40.1 Scope: conditional iOS/Android clients, sessions, local storage/cache, notifications, deep links, biometrics/device signals, SDKs, signing keys, Store accounts/review, app update/revocation ו־account deletion.

34.32.2.40.2 איום: token/cache disclosure; insecure backup/screenshot/clipboard; exported component; deep-link/intent hijack; WebView bridge; notification PII; rooted/jailbroken/tampered client שנחשב Authority; outdated app; malicious SDK; signing/account takeover; inaccurate privacy/Data Safety label; deletion path missing; offline mutation replay.

34.32.2.40.3 מניעה: MASVS/MASTG profile; Keychain/Keystore; אין sensitive cache כברירת מחדל; opaque push; server reauthorization; device integrity כ־Signal בלבד; minimum version; SDK/SBOM/provenance; Store accounts/owners נפרדים; policy/privacy/deletion review.

34.32.2.40.4 בדיקה שלילית: local sensitive data, backup/screenshot/clipboard leak, deep-link hijack, exported component, WebView bridge, push PII, rooted/tampered bypass, old version, malicious SDK, signing account takeover ו־privacy-label mismatch.

34.32.2.40.5 Evidence/Detection: app version/session risk, integrity signal, local-data scan, deep-link/exported-component tests, SDK/Store policy drift, signing-certificate age, account access ו־privacy-label/deletion parity.

34.32.2.40.6 תגובה/Recovery: לעצור Rollout או להסיר Update, לחסום Version, לבטל Sessions, למחוק Local cache כאשר אפשר ולבטל Signing/account access; לחזור רק עם Build חתום ובעל Provenance, Store review, minimum version חדש, session reissue ו־Web fallback.

34.32.2.40.7 מיפוי: `threatIds=TH-001,TH-007,TH-015,TH-017,TH-018,TH-023,TH-025,TH-027,TH-029,TH-031,TH-032`; `controlIds=CTL-002,CTL-003,CTL-004,CTL-005,CTL-006,CTL-013,CTL-016,CTL-018,CTL-019,CTL-020`; `findingIds=MP-F040,MP-F041,MP-F042,MP-F043,MP-F049,MP-F050,MP-F052`; `frameworkIds=FR-005,FR-013,FR-020,FR-027,FR-028,FR-029,FR-042,FR-043,FR-052,FR-053,FR-062`; `dynamicSourceIds=DS-022,DS-023`.

34.32.2.41 Planning, WBS, assurance claims ו־semantic evidence integrity.

34.32.2.41.1 Scope: Master Plan artifacts, Requirements, Framework/Dynamic-source registries, Findings, WBS leaves, Crosswalk, DAG, estimates, review, Digest, Gate decisions ו־status claims.

34.32.2.41.2 איום: schema-complete אך unrelated task; copied generic test; stale lock/count; orphan requirement/finding/gate; duplicate ID; inherited field נסתר; fabricated estimate/percentage; conditional hours בתוך Base; source documentation המוצג כ־Live proof; self-review; byte change לאחר Approval; partial manifest שאושר כשלם.

34.32.2.41.3 מניעה: A01–A09 manifest; exact 18-field leaves; Action↔Input↔Output↔Tests↔Acceptance↔Detection↔Rollback semantic checks; immutable IDs; no inherited fields; conditional separation; source/digest/freshness; independent reviewers; root digest approval.

34.32.2.41.4 בדיקה שלילית: duplicate/gap/orphan/stale-lock/contradiction, semantic mismatch, output/evidence collision, predecessor/DAG cycle, hard-coded count/hour, source expiry, unbound claim, self-review ו־post-approval byte change.

34.32.2.41.5 Evidence/Detection: A09 root manifest, per-appendix digest, per-leaf semantic disposition, independent review receipts, source freshness, count derivation, crosswalk completeness ו־DAG/totals recomputation.

34.32.2.41.6 תגובה/Recovery: לדחות Artifact ל־`/private/tmp`, לבטל Crosswalk/DAG/totals/digest/reviews תלויים ולהשאיר Gate 29 חסום; לכתוב מחדש את היחידות שנכשלו, להריץ Structural+semantic+source+cross-file QA, לקבל Review עצמאי ולחשב Root digest חדש. Approval קודם אינו עובר ל־bytes חדשים.

34.32.2.41.7 מיפוי: `threatIds=TH-014,TH-022,TH-023,TH-026,TH-030`; `controlIds=CTL-001,CTL-002,CTL-015,CTL-016,CTL-019,CTL-020`; `findingIds=MP-F001,MP-F037,MP-F042,MP-F047,MP-F052`; `frameworkIds=FR-002,FR-003,FR-004,FR-005,FR-006,FR-020,FR-021,FR-027,FR-028,FR-029`.

34.32.2.42 PWA, Service Worker, browser cache, Push ו־Background execution.

34.32.2.42.1 Scope: חבילת PWA מותנית בלבד — Web App Manifest, Installability, Service Worker registration/scope/update, fetch interception, CacheStorage, Offline behavior, Web Push subscription, Notifications, Background sync, storage quota/eviction, multi-tab lifecycle ו־decommission. ב־Base כל הרכיבים האלה נעדרים או כבויים; React Web responsive אינו PWA.

34.32.2.42.2 איום: Service Worker זדוני, רחב־Scope, פג או תקוע ממשיך לשלוט ב־Requests אחרי Deploy/Rollback; Cache poisoning או ערבוב גרסאות; שמירת HTML, Session, API response, Message, Contact, Knowledge או PII offline; פעולה כפולה או לא מורשית מן הרקע; Manifest/Name/Icon/Origin spoofing, ‏off-scope navigation, ‏`data:` manifest או URL/Unicode/IDNA confusion; דליפת Push endpoint/key או Metadata של זמן/תדירות/גודל; Notification מטעה או מכילת PII; שימוש לאחר Permission revoke; Subscription reuse; Storage pressure/eviction; Browser-support drift ו־Update race בין Tabs.

34.32.2.42.3 מניעה: להפריד לחמישה Capability gates — Installability, Service-worker fetch/cache, Offline data, Push/Notification ו־Background sync — כך שאחד אינו מאשר אחר; HTTPS בלבד ב־Production; exact origin/path scope; אין הרחבת `Service-Worker-Allowed` בלי Review מפורש; Worker וה־imports מאותו Origin וללא `importScripts` חוצה Origin; ‏CSP/`worker-src` קשיחים; Manifest כ־`application/manifest+json` מאותו Origin וללא `data:`; allowlist של static content-addressed assets בלבד וללא Opaque response; Network-only ל־Auth, HTML, API, Redirect ומוטציות; איסור Cache כברירת מחדל לכל מידע אישי/עסקי; cache/version manifest חתום או digest-bound; install/activate/update אטומיים עם update-cache policy מפורש; `skipWaiting`/`clients.claim` רק תחת Version handshake שמונע ערבוב; cleanup לגרסאות ישנות; contextual user activation והרשאה ניתנת לביטול. מסלול Push בצד השרת משתמש ב־RFC 8030 בלבד, קובע TTL עסקי מזערי ומפרש `202 Accepted` כקבלה בלבד ולא כמסירה; Payload נשאר opaque וממוזער ומוצפן לפי RFC 8291 ב־`aes128gcm` בלבד, עם אימות P-256 וללא הסתמכות על Headers שאינם מוגנים; endpoint, subscription authentication secret, private key ו־VAPID key מסווגים לפי מטרתם ונשמרים רק בשרת. VAPID לפי RFC 8292 קושר `aud` ל־Origin המדויק של Push service, מחייב `exp` שלא יעלה על 24 שעות אך Connect בוחר TTL קצר יותר לפי Threat model, משתמש ב־restricted subscription כאשר נתמך, ומבצע Key rotation דרך Subscription חדש ולא החלפת Key שקטה. כל יצירת VAPID private key, ‏RFC 8291 ephemeral key, salt או ערך בלתי־צפוי אחר דורשת החלטת X24 נפרדת ומפורשת לשימוש המדויק; אין `Math.random()`, אין `crypto.randomUUID()` ואין אישור CSPRNG כללי. אין Background side effect ללא authoritative idempotent ledger, authority recheck ו־Human approval כאשר נדרש; Kill/unregister/cache-purge/subscription-revoke/decommission plan ובדיקת Browser+Push-service matrix נדרשים לפני ה־Sub-gate המתאים.

34.32.2.42.4 בדיקה שלילית: HTTP/Origin/Scope או `Service-Worker-Allowed` שגויים, Worker/import/Manifest/Cached asset ששונו, cross-origin import, Opaque response, CSP/`worker-src` או MIME שגויים, cached HTML/Auth/API/Redirect/PII, offline cross-tenant read, stale worker אחרי rollback, tabs על שתי גרסאות, `skipWaiting`/`clients.claim` race, install/activate crash, storage quota/eviction, compromised cache, off-scope spoof, Unicode/IDNA URL, permission denied/revoked, subscription rotation/reuse, expired subscription, wrong Push-service origin, VAPID `aud`/`exp`/signature/key mismatch, VAPID replay, unencrypted or wrong content encoding, invalid P-256 point, oversized payload, missing/wrong TTL, ‏`202` misclassified as delivered, receipt reorder, push endpoint/key leak, notification PII/phishing, background duplicate/replay/unknown outcome ו־Browser שאין בו API נדרש. כל מקרה משאיר את היכולת המתאימה בלבד כבויה בלי להחליש React Web responsive.

34.32.2.42.5 Evidence/Detection: Source snapshots של W3C/IETF/Browser/Push-service support, exact Manifest/Worker/cache-policy digests, Registration/Scope/active-version inventory, no-sensitive-cache scan, cache/version reconciliation, permission/subscription/VAPID-key-version ledger, RFC 8030 TTL/receipt reconciliation, RFC 8291 encryption/key-validation vectors, RFC 8292 audience/expiry/restricted-subscription/rotation proof, push metadata/payload redaction report, background intent/attempt/fact reconciliation, storage-pressure/browser matrix, staged update/rollback/unregister/cache-purge/subscription-revoke drill ו־Live absence proof לכל Sub-capability שלא נבחר.

34.32.2.42.6 תגובה/Recovery: לעצור registration/update/push/background acquisition; לבטל Subscription/keys והרשאות Server-side; לפרוס Worker בטוח שמבטל שליטה או לבצע unregister+cache purge לפי Runbook; לחסום גרסאות Client ישנות; לשמר Ledger ו־Evidence בלי לשמר מידע שאסור לפי Retention; לחזור ל־React Web responsive network-only, ולא להפעיל שוב עד שכל Tabs/Workers/Caches/Subscriptions ו־unknown side effects הושוו ל־Manifest מאושר.

34.32.2.42.7 מיפוי: `threatIds=TH-001,TH-003,TH-007,TH-014,TH-015,TH-017,TH-018,TH-021,TH-022,TH-023,TH-027,TH-029,TH-030,TH-032`; `controlIds=CTL-001,CTL-002,CTL-003,CTL-004,CTL-005,CTL-006,CTL-007,CTL-010,CTL-013,CTL-015,CTL-016,CTL-018,CTL-020`; `findingIds=MP-F040,MP-F041,MP-F042,MP-F047,MP-F049,MP-F050,MP-F052`; `frameworkIds=FR-005,FR-010,FR-013,FR-015,FR-019,FR-020,FR-021,FR-027,FR-058,FR-067,FR-068,FR-069,FR-070,FR-071,FR-072,FR-073,FR-074,FR-075,FR-076`; `dynamicSourceIds=DS-025`.

34.32.3 תנאי קבלה חוסמים.

34.32.3.1 כל 42 התחומים מקבלים Owner, Backup owner, Severity, Test ID, Evidence location, Review date ו־Rollback command/runbook.

34.32.3.2 כל בדיקה שלילית רצה ב־CI או בתרגיל מבוקר. בדיקה ידנית ללא Timestamp, Actor ו־Artifact digest אינה Evidence מספיק.

34.32.3.3 Gate 26.1 נשאר `BLOCKED` אם אחת מן הבקרות הנדרשות ל־Core pilot נכשלת, ו־Gate 30 נשאר `BLOCKED` אם תחום Cyber אחד מתוך ה־Scope הסופי אינו מוכח. חסמים מוחלטים כוללים Secret לא מנוהל, Public DB/Redis, Cross-tenant failure, Webhook ללא Signature/replay defense, Upload לפני Scan, AI action ללא Human approval, Restore ללא Backup linkage או WhatsApp send ללא Consent/policy check.

34.32.3.4 P0/P1 ביכולת חיה אינו מתקבל באמצעות Risk acceptance: מתקנים ומבצעים Retest או משביתים ומסירים את היכולת מן Scope. חריג P2/P3 דורש Owner, סיבה, Compensating control, Expiry קצר ואישור מפורש; חריגה שפג תוקפה חוסמת Release.

34.32.4 אי־ודאויות זמניות המחייבות Revalidation.

34.32.4.1 Meta רשאית לשנות Policy; Throughput, messaging limits, quality tiers, pricing, templates ו־Graph API versions הם דינמיים ולעיתים תלויי חשבון. אין לקודד מספר קבוע כמקור אמת.

34.32.4.2 OpenAI ZDR ו־Modified Abuse Monitoring דורשים אישור ואינם מובטחים. ברירת המחדל עשויה לכלול Abuse-monitoring retention עד 30 יום, בהתאם ל־Endpoint וליכולת.

34.32.4.3 ‏[OpenAI Deprecations](https://developers.openai.com/api/docs/deprecations) מתעד רשמית כי Evals platform הוכרז כ־Deprecated ב־03.06.2026, Evals קיימים אמורים להפוך Read-only ב־31.10.2026 וה־Dashboard/API מתוכננים להיסגר ב־30.11.2026. `/v1/evals` עשוי לשמור Application state עד מחיקה ואינו ZDR-eligible לפי טבלת Data controls העדכנית. Eval corpus, ‏Harness ו־Evidence נשארים בבעלות Connect ואינם תלויים בשירות; אין Gate להפעלה חדשה ב־Pilot, וכל שימוש קיים חייב תוכנית יציאה לפני ה־Read-only deadline.

34.32.4.4 NIST AI RMF נמצא בתהליך עדכון ב־2026; להצמיד את [AI RMF 1.0](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10) ואת ה־Profile שבשימוש ולבדוק מהדורה חדשה לפני Gate 18.1, וגם לפני Gate 18.2 כאשר Knowledge/RAG/File pipeline נמצא ב־Scope.

34.32.4.5 יכולות Vercel WAF, GitHub Secret Protection/Artifact Attestations, Railway environment RBAC ו־Clerk custom roles עשויות להיות תלויות Plan. אם אינן זמינות, מגדירים Compensating control ולא מסמנים אותן Active.

34.32.4.6 Railway databases הם Unmanaged; Connect אחראי לגבות, לנטר, לאבטח ולתחזק. PITR/Volume backup אינם מקיימים לבדם 90 יום, ולכן Logical/offsite backup עצמאי הוא חובה.

34.32.4.7 AWS CloudTrail S3 data events אינם מופעלים כברירת מחדל ועלולים להוסיף עלות. GuardDuty Malware Protection, Object Lock ו־KMS נבדקים לפי Region, Account policy ו־Budget.

34.32.4.8 OWASP GenAI/LLM guidance משתנה במהירות; להצמיד Edition ו־Digest ולבצע Review רבעוני.

34.32.5 מסקנת המחקר.

34.32.5.1 הארכיטקטורה יכולה להגיע ל־Production מאובטח רק אם הפרדת Tenants, שרשרת Webhook/send, קבצים, AI actions, Secrets ו־Backup/restore מטופלות כמערכת אחת.

34.32.5.2 ארבעת החסמים המסוכנים ביותר הם Cross-tenant authorization, ‏WhatsApp consent/rate/policy enforcement, ‏Untrusted file/RAG ingestion ו־Restore שלא הוכח מול Backup מדויק.

34.32.5.3 Section 34.32 הוא Crosswalk חוסם ולא Workstream נוסף. המשימות והזמנים מוקצים לשלבים 7–31; Gate 1 מסמן מיפוי כדי למנוע Double count. Supplier/Email/People controls נשארים ב־Allocation reserve של 34.34 עד שהמיפוי מוכח.

34.33 נספח — External Authority Register.

34.33.1 כללי הפעלה.

34.33.1.1 מטרת ה־Register היא לרכז החלטות, הרשאות וראיות שאינן ניתנות לסגירה באמצעות קוד בלבד.

34.33.1.2 `selected-needs-live-evidence` פירושו שהכיוון נבחר, אך אסור לסגור Gate לפני אימות במערכת הספק או בידי בעל הסמכות.

34.33.1.3 `unknown/unavailable` פירושו שהנתון או האדם טרם נמסרו. אסור להחליף אותו בשם, תאריך, מחיר או ערך מדומה.

34.33.1.4 לכל X-ID חייבים להיות Primary ו־Backup שמיים. מועמדות או אחריות טכנית אינן מינוי פורמלי.

34.33.1.5 תאריך קלנדרי שאינו ידוע נשאר `unknown/unavailable`. ה־Gate היחסי הוא עדיין מועד חוסם ומחייב.

34.33.1.6 ברירת המחדל לכל החלטה חסרה היא Fail closed: היכולת הרלוונטית נשארת כבויה, Read-only או מוגבלת ל־Staging ללא מידע אישי.

34.33.1.7 Evidence אינו כולל Secret, Token, Recovery code, מספר כרטיס, מסמך זהות מלא או מידע אישי. שומרים Reference לכספת וראיה מושחרת.

34.33.1.8 חמישה ימי עסקים לפני Gate, חוסר ב־Owner, Backup או Evidence מסומן Red ומוסלם ל־Tal ול־Accountable המתאים.

34.33.1.9 ביום ה־Gate, ערך חסר חוסם אוטומטית. קוד תקין, Build ירוק או אישור בעל־פה אינם עוקפים חסימה.

34.33.1.10 חריגה זמנית מותרת רק ל־P2/P3 ודורשת Scope, Expiry, Compensating control, Stop condition ובעל סמכות. אין חריגה עבור P0/P1 חי, Consent חסר, הרשאת Meta חסרה, Cross-tenant exposure, Secret exposure או שליחה לא מורשית.

34.33.2 X01 — ישות משפטית, מורשי חתימה ומעמד מס.

34.33.2.1 החלטה ומצב: לקבוע שם ישות, מספר רישום, כתובת משפטית, מורשי חתימה, מעמד מע״מ/מס, פרטי חיוב וסמכות להתקשר עם ספקים. מצב: `unknown/unavailable`.

34.33.2.2 Primary: Legal/Finance `unknown/unavailable`; ‏Roy הוא Coordinator לחשבונות ולרכש בלבד.

34.33.2.3 Backup: `unknown/unavailable`.

34.33.2.4 מועד: לפני Gate 3 ולפני כל Contract, KYC, חיוב או חשבון Production. תאריך: `unknown/unavailable`.

34.33.2.5 ברירת מחדל: אין חשבון Production בשם אישי, אין חיוב לקוח, אין Checkout ואין חתימת ספק; תכנון ו־Staging משתמשים רק בארבע מחלקות מקור הראיה שב־5.4, ללא מידע עסקי מומצא וללא Sandbox-as-live claim.

34.33.2.6 Evidence: מסמכי רישום והרשאת חתימה בכספת, אישור מס/מע״מ, Billing profile, KYC receipt ורשימת חשבונות לישות; Repository מקבל ראיה מושחרת בלבד.

34.33.2.7 הסלמה/חסימה: Gates 3, 19.3 ו־26.1 כאשר Pilot מסחרי או משתמש בנתוני לקוח.

34.33.3 X02 — RACI שמי, מחליפים ו־Offboarding.

34.33.3.1 החלטה ומצב: למנות Primary, Backup, Accountable, Approver ו־Escalation לכל תחום בסעיף 8.4. מצב: חלקי; שמות רבים `unknown/unavailable`.

34.33.3.2 Primary: Tal מרכז את סגירת ה־Register והאישור הסופי; Accountable עסקי לכל תחום נשאר `unknown/unavailable` עד מינוי.

34.33.3.3 Backup: `unknown/unavailable` ל־Tal ולכל תחום שטרם קיבל מחליף שמי.

34.33.3.4 מועד: לפני Gate 3. תאריך: `unknown/unavailable`.

34.33.3.5 ברירת מחדל: תחום ללא Primary ו־Backup אינו מפעיל Production capability, אינו מחזיק Secret ואינו מקבל סמכות P0/P1.

34.33.3.6 Evidence: RACI חתום, Access matrix, Contact tree, Vacation coverage, Offboarding checklist ותרגיל Backup.

34.33.3.7 הסלמה/חסימה: Gate 3 וכל Gate מאוחר שבו Owner/Approver חסר.

34.33.4 X03 — תקציבים, תקרות עלות וסמכות רכש.

34.33.4.1 החלטה ומצב: לקבוע מטבע, תקציב חודשי, Alert thresholds, Hard cap, חריגה מאושרת ו־Kill switch לכל ספק וסביבה. מצב: `unknown/unavailable`.

34.33.4.2 Primary: Roy לרכש/חשבונות; Finance approver `unknown/unavailable`.

34.33.4.3 Backup: `unknown/unavailable`.

34.33.4.4 מועד: לפני Gate 3 ולפני Plan בתשלום. תאריך: `unknown/unavailable`.

34.33.4.5 ברירת מחדל: Plan חינמי/מינימלי, אפס Auto-upgrade ויכולת כבויה כשאין Hard cap אמין.

34.33.4.6 Evidence: Budget מאושר, Alerts ב־50/75/90/100%, הרשאת העלאת תקרה, Kill-switch drill ו־Invoice reconciliation.

34.33.4.7 הסלמה/חסימה: Gate 3; ‏Gates 6.1 ו־6.2, ובנוסף 6.3 לספק Storage/scan; ‏Gate 18.1 ובנוסף 18.2 ל־Knowledge/RAG/File; ‏Gates 19.3, ‏22, ‏23.1, ובנוסף 23.2 ל־GA/90-day claim, או 26.1 עבור ספק ללא Budget control.

34.33.5 X04 — בעלות חשבונות ספק, Plans, Regions ו־Members.

34.33.5.1 החלטה ומצב: לאמת בעלות חברה, Plan, Region, Environment separation, Admins, Billing owner ו־Members עבור GitHub, Vercel, Railway, Clerk, AWS, Meta, OpenAI, Better Stack, SES, PayPlus, Tranzila, Paddle, Stripe ובאופן Conditional גם Apple/Google. Paddle/Stripe אינם procurement defaults. מצב: `selected-needs-live-evidence`.

34.33.5.2 Primary: Roy לרכש/פתיחה; Rasha לפריסות; David ל־Meta/API. בעל Security רוחבי הוא `unknown/unavailable`; Tal הוא Owner למחקר מגבלות WhatsApp/Meta ולמדיניות Connect rate limiting בלבד.

34.33.5.3 Backup: `unknown/unavailable` לכל ספק.

34.33.5.4 מועד: חשבון בסיסי לפני Gate 3; חשבון חי לפני Gate היכולת. תאריך: `unknown/unavailable`.

34.33.5.5 ברירת מחדל: אין Shared account, Production token, חשבון אישי או Claim ליכולת שאינה ב־Plan החי.

34.33.5.6 Evidence: Export/צילום מושחר של Owner, Plan, Region, Members, MFA, Billing, Environments ו־Access review.

34.33.5.7 הסלמה/חסימה: Gate 3 ו־Gate הספק המתאים 6, 8, 9, 18, 19.3, 22 או 23.

34.33.6 X05 — נכסי Meta, הרשאת לקוח ו־App Review.

34.33.6.1 החלטה ומצב: לקבוע Business Portfolio, App, Test/Pilot WABA, Phone, System user, Permissions, App Review/Advanced Access והרשאת בעל נכס. מצב: `selected-needs-live-evidence`.

34.33.6.2 Primary: David ל־Meta integration; Tal למחקר מגבלות WhatsApp/Meta ולמדיניות Connect rate limiting. בעל Security של ה־Integration הוא `unknown/unavailable` עד מינוי פורמלי.

34.33.6.3 Backup: `unknown/unavailable`.

34.33.6.4 מועד: Test assets לפני Gate 9; Pilot assets לפני כל אחד מן ה־instances ‏12.2.1–12.2.6 שהפעולה שלו נמצאת ב־Scope ולפני 26.1. תאריך תלוי App Review: `unknown/unavailable`.

34.33.6.5 ברירת מחדל: Test WABA בלבד; אין Credentials או נכסי האב ללא אישור, Least privilege ו־Revocation plan.

34.33.6.6 Evidence: Asset graph, IDs מושחרים, Permission export, App Review receipt, Owner authorization, Token revision reference ו־Disconnect drill.

34.33.6.7 הסלמה/חסימה: Gate 9, כל אחד מן ה־instances ‏12.2.1–12.2.6 שהפעולה שלו נמצאת ב־Scope, ו־Gate 26.1; אין חריגה באמצעות Token אישי או AnyDesk.

34.33.7 X06 — מגבלות Meta חיות, Quality, Capacity ו־Connect caps.

34.33.7.1 החלטה ומצב: למדוד מגבלות חשבון חיות, Quality, Throughput שנבדק, Provider errors, Pricing category ו־Connect caps. מצב: `live-derived-layered`; Evidence חי חסר עד חיבור חשבון.

34.33.7.2 Primary: Tal.

34.33.7.3 Backup: `unknown/unavailable`; David Responsible טכני אך אינו Backup פורמלי.

34.33.7.4 מועד: לפני Gate 11; רענון לפני כל אחד מן ה־instances ‏12.2.1–12.2.6 שהפעולה שלו נמצאת ב־Scope, מדי יום Pilot ולאחר שינוי Meta. תאריך הפעלה: `unknown/unavailable`.

34.33.7.5 ברירת מחדל: Unknown נותן Capacity אפס; אין Bulk; ניסיון ראשון ל־Recipient מאושר ו־one-attempt proof.

34.33.7.6 Evidence: Meta/API snapshot, Quality, measured throughput, Error matrix, Effective-cap computation, Pause drill וחתימת Tal.

34.33.7.7 הסלמה/חסימה: Gate 11, כל אחד מן ה־instances ‏12.2.1–12.2.6 שהפעולה שלו נמצאת ב־Scope, ו־Gate 26.1; Quality drop, Warning או Stale snapshot מפעילים Pause.

34.33.8 X07 — סיווג Meta משפטי, AI ancillary ו־Tech Provider.

34.33.8.1 החלטה ומצב: להכריע אם Connect פועל כ־Tech Provider/Service Provider, אם AI ancillary ולא primary, אילו Business Solution Data מועברים ומה מחויב בחוזה. מצב: `unknown/unavailable` משפטית.

34.33.8.2 Primary: Legal `unknown/unavailable`; David לזרימת Meta; AI/Security owner הוא `unknown/unavailable`; Tal מקבל עדכון ומתייעצים איתו רק לגבי השלכות על מגבלות WhatsApp/Meta ו־Connect rate limiting.

34.33.8.3 Backup: `unknown/unavailable`.

34.33.8.4 מועד: לפני Gates 9, 18 ו־26.1; Delta review עד 22.09.2026 אם השירות פעיל ב־23.09.2026.

34.33.8.5 ברירת מחדל: Human-only; AI אינו מקבל Business Solution Data; אין AI Agent/Tech Provider marketing claim או Connect line of credit.

34.33.8.6 Evidence: Legal memo, Terms snapshot/digest, Data-flow, Classification, Customer authorization, Third Party Service Provider agreement ו־AI-off proof.

34.33.8.7 הסלמה/חסימה: Gate 18.1, ובנוסף 18.2 כאשר Knowledge/RAG/File נמצא ב־Scope, וכל AI ב־26.1; סיווג שלילי מכבה AI אך אינו חוסם Human-only pilot.

34.33.9 X08 — Railway Amsterdam, העברת מידע ואחריות Unmanaged.

34.33.9.1 החלטה ומצב: לאשר Railway EU West Amsterdam, העברה מישראל, DPA/Subprocessors והאחריות העצמית ל־PostgreSQL, Redis, Backup, Monitoring ותחזוקה. מצב: טכנית נבחר; משפטית `unknown/unavailable`.

34.33.9.2 Primary: Legal/Privacy `unknown/unavailable`; Rasha ל־Deployment לאחר אישור.

34.33.9.3 Backup: `unknown/unavailable`.

34.33.9.4 מועד: לפני PII ב־Railway, Gate 21.1 ו־26.1. תאריך: `unknown/unavailable`.

34.33.9.5 ברירת מחדל: Staging משתמש רק בארבע מחלקות מקור הראיה שב־5.4, ללא מידע עסקי מומצא; אין Claim ל־Israel residency או Production PII.

34.33.9.6 Evidence: Region export, DPA/Subprocessors, Legal transfer memo, Privacy mapping, Railway responsibility acceptance ו־Backup/Maintenance owner.

34.33.9.7 הסלמה/חסימה: אינו חוסם תכנון או בדיקות המשתמשות רק בארבע מחלקות המקור שב־5.4; חוסם Production lane ב־Gates 6.1, ‏6.2, ‏21.1 ו־26.1; ‏Gate 6.3 נחסם בנוסף כאשר אותו חשבון מפעיל Upload/Knowledge/Media.

34.33.10 X09 — Pilot billing, חשבוניות, מע״מ ובחירת PSP.

34.33.10.1 החלטה ומצב: Pilot חינמי או מחויב ידנית, `activeProvider=none`; מחיר, מטבע, מע״מ, מסמך חשבונאי, תנאי תשלום, Expiry ו־Refund נשארים `unknown/unavailable`. PayPlus primary discovery, Tranzila alternate, Paddle/Stripe dormant לפי D03; Checkout נדחה עד Gate ספק.

34.33.10.2 Primary: Roy לרכש/מסחרי; Finance/Tax approver `unknown/unavailable`.

34.33.10.3 Backup: `unknown/unavailable`.

34.33.10.4 מועד: Free/manual לפני Gate 19.1; Provider לפני 19.3. תאריך: `unknown/unavailable`.

34.33.10.5 ברירת מחדל: Pilot חינמי או Entitlement ידני מאושר, ללא Checkout/Auto-renew/Card data וללא Paddle+Stripe חיים במקביל.

34.33.10.6 Evidence: Price sheet, Tax/VAT opinion, Invoice flow, Entitlement ledger, Reconciliation, Notice, Provider KYC ו־Signature verification כאשר חי.

34.33.10.7 הסלמה/חסימה: Gate 19.1 אם לא הוחלט Free/manual; Gate 19.3 לספק חי; אינו חוסם Pilot חינמי מאושר.

34.33.11 X10 — Closed Pilot Charter, משתתפים ותאריכים.

34.33.11.1 החלטה ומצב: למלא Tenant, WABA, Phone, Allowlist שמי קטן של משתמשים ו־Recipients, Consent, Start/end, Hours, Emergency channel ו־Stop authority. המספרים המרביים המדויקים, השמות והתאריכים הם `unknown/unavailable` עד Charter חתום; אין תקרת חמישה/עשרה פעילה ללא אישור.

34.33.11.2 Primary: Product accountable ו־Go/No-Go approver הם `unknown/unavailable`; Tal מאשר את רכיב מגבלות WhatsApp/Meta ומדיניות Connect rate limiting, אך מינוי זה לבדו אינו הופך אותו לבעל האחריות העסקית או הביטחונית הכוללת של ה־Pilot.

34.33.11.3 Backup: Operational backup `unknown/unavailable`.

34.33.11.4 מועד: חמישה ימי עסקים לפני Gate 26.1. תאריך התחלה: `unknown/unavailable`.

34.33.11.5 ברירת מחדל: אין Pilot חי; Test WABA/Staging ו־Outbound כבוי.

34.33.11.6 Evidence: Charter, Allowlist digests, Consent, MFA roster, Live-cap snapshot, Support roster ו־Dry run.

34.33.11.7 הסלמה/חסימה: כל שדה שמי/תאריך חסר חוסם Gate 26.1.

34.33.12 X11 — SLO, שעות שירות והתחייבות ללקוח.

34.33.12.1 החלטה ומצב: לקבוע SLO לכל Journey, Window, Denominator, minimum sample, insufficient-data state, Exclusions, Business hours, Support promise ו־SLA. יעד מספרי ו־Product/SRE approval הם `unknown/unavailable`; ‏99.5% אינו Current candidate.

34.33.12.2 Primary: Product/SRE `unknown/unavailable`.

34.33.12.3 Backup: `unknown/unavailable`; Tal בודק רק השפעה של SLO/Degraded mode על מגבלות WhatsApp/Meta ועל Connect rate limiting ואינו SRE או Safety owner רוחבי.

34.33.12.4 מועד: לפני Gate 22 וכל Public claim; רענון לפני 26.1. תאריך: `unknown/unavailable`.

34.33.12.5 ברירת מחדל: אין SLA/24x7 claim; Pilot רק בשעות מאוישות ב־Charter.

34.33.12.6 Evidence: SLO doc, Probes, Denominator/sample, Dashboard, Burn alerts, Alert drill ו־Customer wording.

34.33.12.7 הסלמה/חסימה: Gates 22 ו־26.1; Telemetry חסר מחזיר Unknown.

34.33.13 X12 — RPO, RTO, Backup retention ו־Business continuity.

34.33.13.1 החלטה ומצב: לקבוע RPO/RTO לכל Data class/Journey, Recovery order/authority, Alternate contacts, Maximum outage והאם נדרש Archive חודשי מעבר ל־90 ימי Daily של D08. מצב: `unknown/unavailable`.

34.33.13.2 Primary: SRE/Data `unknown/unavailable`; Rasha מועמדת לביצוע בלבד; Legal/Privacy/Finance מאשרים Retention/Cost נוסף.

34.33.13.3 Backup: `unknown/unavailable`.

34.33.13.4 מועד: לפני Gate 23.1 ו־26.1; לפני Gate 23.2 אם נדרש Archive בן 90 יום/GA. Archive נוסף לפני יצירתו. תאריך: `unknown/unavailable`.

34.33.13.5 ברירת מחדל: אין RPO/RTO claim, אין Pilot בלי Restore, ואין Monthly archive מעבר ל־90 יום עד אישור מפורש.

34.33.13.6 Evidence: RPO/RTO matrix, Backup manifest, Monthly restore drill, Measured timeline, Retention/cost/legal decision, BCP tabletop ו־Communication tree.

34.33.13.7 הסלמה/חסימה: Gates 23.1 ו־26.1; ‏Gate 23.2 כאשר נדרש Claim בן 90 יום/GA. Restore failure הוא Stop. Archive לא מאושר נשאר כבוי ואינו חוסם את מסלול Closed Pilot המצומצם.

34.33.14 X13 — Pentest, Scope ואישור סיכון שיורי.

34.33.14.1 החלטה ומצב: לבחור גורם עצמאי, Scope, Rules, Window, Retest, Severity policy וסמכות Residual risk. מצב: `unknown/unavailable`.

34.33.14.2 Primary: Security assurance owner, Tester ו־Business risk approver הם `unknown/unavailable`; Tal הוא Consulted/Reviewer רק לממצאים המשפיעים על מגבלות WhatsApp/Meta או על מדיניות Connect rate limiting.

34.33.14.3 Backup: `unknown/unavailable`.

34.33.14.4 מועד: Scope לפני Staging freeze; Retest לפני Gates 24 ו־26.1. תאריך: `unknown/unavailable`.

34.33.14.5 ברירת מחדל: אין Public launch; P0/P1 או Reachable Critical/High משאיר Capability כבויה.

34.33.14.6 Evidence: SOW, Independence, Scope digest, Report, Finding ledger, Remediation, Retest ו־P2/P3 residual-risk decisions.

34.33.14.7 הסלמה/חסימה: Gates 24 ו־26.1 כאשר Finding חוסם או Evidence חסר.

34.33.15 X14 — נגישות, מומחה חיצוני והצהרה משפטית.

34.33.15.1 החלטה ומצב: לקבוע Standard, Scope, Expert, Browsers/Screen readers, Contact mechanism ו־Accessibility statement. מצב: WCAG 2.2 AA נבחר; Legal/expert `unknown/unavailable`.

34.33.15.2 Primary: Accessibility `unknown/unavailable`; Rasha אחראית Frontend/Deployment.

34.33.15.3 Backup: `unknown/unavailable`.

34.33.15.4 מועד: לפני Gates 25 ו־26.1. תאריך: `unknown/unavailable`.

34.33.15.5 ברירת מחדל: אין Full-compliance claim; Journey עם חסם Keyboard/Screen-reader/RTL מחוץ ל־Pilot.

34.33.15.6 Evidence: Legal matrix, Expert report, Keyboard/screen-reader, RTL/Bidi, Retest ו־Statement מאושרת.

34.33.15.7 הסלמה/חסימה: Gates 25 ו־26.1 עבור Critical journey לא נגיש.

34.33.16 X15 — AWS KMS, Key owners ו־Break-glass.

34.33.16.1 החלטה ומצב: לקבוע AWS account, Key admins/users, CMK separation, Rotation, Deletion waiting period, Grants, Cost, Recovery ו־Break-glass. מצב: D14-A1 נבחר; Owner/Evidence `unknown/unavailable`.

34.33.16.2 Primary: AWS/Platform ו־Security approver הם `unknown/unavailable`; Rasha אחראית Deployment לאחר הקצאת הרשאות; Tal הוא Consulted רק כאשר ההחלטה משנה את מגבלות WhatsApp/Meta או את מדיניות Connect rate limiting.

34.33.16.3 Backup: `unknown/unavailable`.

34.33.16.4 מועד: לפני S3 ב־Gate 6.3, Upload/Knowledge ב־18.2, Closed-pilot backup ב־23.1 ו־90-day/GA claim ב־23.2.

34.33.16.5 ברירת מחדל: Uploads/Backup claim כבויים; אין Downgrade ל־SSE-S3 או הנחה ש־Objects ישנים Re-encrypted.

34.33.16.6 Evidence: Key policy, Grants, Bucket deny, Rotation/deletion, Re-encryption manifest, KMS deny, Cost alerts ו־Break-glass drill.

34.33.16.7 הסלמה/חסימה: Gates 6.3, ‏18.2, ‏23.1, ‏23.2 כאשר נדרש Claim בן 90 יום/GA, ו־26.1 ל־Data class התלוי ב־S3/KMS.

34.33.17 X16 — Email provider, Domain, SPF, DKIM, DMARC ו־Bounce.

34.33.17.1 החלטה ומצב: Amazon SES ב־`il-central-1` דרך HTTPS API בלבד הוא יעד ה־Transactional email שנבחר תכנונית. טענת Snapshot קודמת שלפיה SMTP אינו זמין באזור מבוטלת: הודעת AWS מ־24.07.2026 מתעדת SMTP guided setup דרך Mail Manager בכל Region שבו SES זמין. Connect עדיין אוסרת SMTP ובוחרת HTTPS API משיקולי Secret surface, IAM, request signing, audit ו־egress — החלטת ארכיטקטורה ולא טענת Availability. ‏From/Reply-To domains, SPF/DKIM/DMARC rollout, Bounce/complaint events, Suppression, Retention, Rate cap, Account production access ו־Live delivery evidence הם `unknown/unavailable` עד Probe ואישורים מתאימים.

34.33.17.2 Primary: Roy לחשבון/Domain; Rasha ל־DNS/Deployment; David ל־Webhook/API.

34.33.17.3 Backup: `unknown/unavailable`.

34.33.17.4 מועד: Invitation לפני Gate 8; Billing notices לפני 19.1; לפני 26.1. תאריך: `unknown/unavailable`.

34.33.17.5 ברירת מחדל: אין Production invitation/notification מ־Email לא מאומת ואין שיתוף Invitation link בצ׳אט כ־Fallback.

34.33.17.6 Evidence: Account ownership, Verified sender, DNS, Headers, SPF/DKIM pass, DMARC, Bounce/complaint tests, Suppression ו־Cost cap.

34.33.17.7 הסלמה/חסימה: Gate 8 להזמנות, 19.1 להודעות Billing ו־26.1 אם אין ערוץ חובה תקין.

34.33.18 X17 — GuardDuty Malware Protection ו־File scanning.

34.33.18.1 החלטה ומצב: D05 נבחר ל־AWS GuardDuty Malware Protection for S3 ב־`il-central-1`, בכפוף ל־Live capability proof. יש לאמת Account, Region, Protection-plan ARN, IAM/KMS, Bucket+Version coverage, Quotas, Event schema, Detector decision, Budget ו־Manual review. מצב Live: `unknown/unavailable`.

34.33.18.2 Primary: AWS/Security operations, ‏File-pipeline owner ו־Security approver הם `unknown/unavailable`; Rasha אחראית Infra/Deployment לאחר הקצאת הרשאות. לא הוקצתה לדוד בעלות על File pipeline, וטל אינו Reviewer אלא אם הפעלת הקבצים משנה בפועל WhatsApp/Meta rate limits או Connect rate policy.

34.33.18.3 Backup: `unknown/unavailable`.

34.33.18.4 מועד: לפני Upload ולפני Gate 18.2. תאריך: `unknown/unavailable`.

34.33.18.5 ברירת מחדל: Knowledge uploads כבויים; Timeout/Unknown/Failure אינם משחררים קובץ.

34.33.18.6 Evidence: AWS region/capability, IAM/KMS, Protection plan, Versioning, Upload checksum, exact Scan event/status/reason, Clean/threat/unsupported/access-denied/timeout tests, EventBridge retry policy+DLQ+alarms, at-least-once/out-of-order dedup, reconciliation, on-demand rescan לפי VersionId, Manual review ומחיקת Threat. אין הנחת "שלושה ניסיונות"; ברירת המחדל המתועדת של EventBridge היא עד 24 שעות ועד 185 ניסיונות אלא אם Config חי קובע אחרת.

34.33.18.7 הסלמה/חסימה: Gate 18.2 וכל Pilot עם Upload; Human-only בלי Upload יכול להמשיך עם Disabled evidence.

34.33.19 X18 — OpenAI Project, Data controls וחוזים.

34.33.19.1 החלטה ומצב: ליצור Projects נפרדים, Service accounts, Model/tool allowlist, Budget, ‏`store:false`, Retention, ZDR eligibility, DPA והסכם המתאים ל־Meta data. מצב: Responses נבחר; Live controls `unknown/unavailable`.

34.33.19.2 Primary: AI/Product, ‏Backend integration, ‏Security ו־Privacy owners הם `unknown/unavailable`; Roy הוא Account/procurement coordinator בלבד. לא הוקצתה לדוד בעלות AI, וטל אינו Data/Security owner; הוא Consulted רק אם מסלול AI ממשיך ל־WhatsApp send ומשנה rate/quality limits.

34.33.19.3 Backup: `unknown/unavailable`.

34.33.19.4 מועד: לפני Gate 18.1, ובנוסף Gate 18.2 ל־Knowledge/RAG/File pipeline, ולפני כל AI ב־26.1. תאריך: `unknown/unavailable`.

34.33.19.5 ברירת מחדל: AI כבוי; Human-only ממשיך; אין Dataset חי, Training/improvement או ZDR claim.

34.33.19.6 Evidence: Project/settings, Service-account scope, Model allowlist, `store:false` proof, Redacted logs, Budget, DPA/Data-flow, Retention ו־Deletion test.

34.33.19.7 הסלמה/חסימה: Gate 18.1, ובנוסף 18.2 ל־Knowledge/RAG/File pipeline; אינו חוסם Core Human-only עם AI-off proof.

34.33.20 X19 — GitHub Organization, Repo governance ו־Plan capabilities.

34.33.20.1 החלטה ומצב: לאמת Private repo ownership, מעבר ל־Organization, Collaborators, Rulesets, Required checks, CODEOWNERS, Secret protection, Dependabot, Actions policy ו־Audit availability. מצב: Repo קיים; `selected-needs-live-evidence`.

34.33.20.2 Primary: Roy לחשבון/Collaborators; Rasha ל־Deployment integration; Security/Repository governance approver הוא `unknown/unavailable`. Tal הוא Consulted רק אם השינוי משפיע על רכיב מגבלות WhatsApp/Meta או Connect rate limiting.

34.33.20.3 Backup: `unknown/unavailable`.

34.33.20.4 מועד: לפני Gate 2. תאריך מעבר ל־Organization: `unknown/unavailable`.

34.33.20.5 ברירת מחדל: אין Direct push ל־main, Deploy מקוד לא reviewed או Claim ליכולת Security שאינה ב־Plan.

34.33.20.6 Evidence: GitHub settings/API, Ruleset, Checks, CODEOWNERS, Collaborators, MFA, Pinned actions, SBOM/attestation ו־Audit.

34.33.20.7 הסלמה/חסימה: Gates 2, 3 ו־26.1 אם Governance/Provenance אינם מוכחים.

34.33.21 X20 — Domains, Registrar, DNS ו־Production callbacks.

34.33.21.1 החלטה ומצב: לבחור Production/Staging domains, Registrar owner, Nameservers, DNSSEC, CAA, Auto-renew, Recovery contacts, Origins ו־Meta/Clerk callbacks. מצב: `unknown/unavailable`.

34.33.21.2 Primary: Roy לבעלות Registrar/Domain; Rasha ל־DNS/Deployment.

34.33.21.3 Backup: `unknown/unavailable`.

34.33.21.4 מועד: לפני Gates 6.1 ו־6.2, ובנוסף 6.3 ל־Upload/Knowledge/Media; Callbacks לפני 8/9; Production proof לפני 26.1.

34.33.21.5 ברירת מחדל: Staging domain בלבד; Production callback כבוי; אין Host reflection, Wildcard trust או Dangling record.

34.33.21.6 Evidence: Registrar ownership/renewal, DNS export, DNSSEC/CAA/TLS, Origin denial, Callback verification ו־Recovery drill.

34.33.21.7 הסלמה/חסימה: Gates 6.1 ו־6.2 ל־Production, ובנוסף 6.3 ל־Upload/Knowledge/Media; ‏Gates 8–9 Identity/Meta; ‏Gates 26.0.1, ‏26.0.2 ו־26.1.

34.33.22 X21 — Privacy, DPA, Consent, Retention ו־Data rights.

34.33.22.1 החלטה ומצב: לאשר Lawful basis, Privacy notice, Terms, Processor/subprocessor map, DPA, Consent, Opt-out, Retention, Legal Hold, Export ו־Deletion. מצב: `unknown/unavailable` משפטית.

34.33.22.2 Primary: Legal/Privacy, ‏Data-governance owner ו־Security approver הם `unknown/unavailable`; David אחראי לתיעוד Meta/API data-flow בלבד, לא לכלל ה־Privacy program. Tal הוא Consulted רק ל־Data-flow המשפיע על מגבלות WhatsApp/Meta או Connect rate limiting.

34.33.22.3 Backup: `unknown/unavailable`.

34.33.22.4 מועד: Consent לפני 13; Legal baseline לפני 21.1; Delete adapter לפני 21.2; הכול לפני 26.1.

34.33.22.5 ברירת מחדל: מינימום מידע, Recipient allowlist, Opt-out מיידי, Delete adapter מנותק, אין Public claim או Processing מחוץ ל־Data map.

34.33.22.6 Evidence: Legal memo, Notice/Terms versions, DPA/Subprocessors, Consent/opt-out, Retention matrix, Hold tests, DSAR/export/deletion drill ו־Data-flow.

34.33.22.7 הסלמה/חסימה: Gates 13, 21.1, 21.2 ו־26.1 לפי Scope; אין חריגה שעוקפת Consent/Asset authority.

34.33.23 X22 — Support, On-call, Incident authority ו־Vendor contacts.

34.33.23.1 החלטה ומצב: למנות Support/On-call Primary/Backup, Hours, Severity, Acknowledgement targets, Incident commander, Legal/privacy notification authority, Vendor contacts ו־Emergency channel. מצב: `unknown/unavailable`.

34.33.23.2 Primary: Operations/Support, Incident commander ו־Security escalation הם `unknown/unavailable`; Rasha/David אחראים Technical response בתחומיהם; Tal מקבל עדכון ומשתתף רק באירועי מגבלות WhatsApp/Meta או Connect rate limiting.

34.33.23.3 Backup: `unknown/unavailable`.

34.33.23.4 מועד: לפני Gate 22 וחמישה ימי עסקים לפני 26.1. תאריך: `unknown/unavailable`.

34.33.23.5 ברירת מחדל: אין 24x7 claim; Pilot רק בחלון Primary+Backup; היעדר On-call מפעיל Stop.

34.33.23.6 Evidence: Roster/calendar, Paging/channel, Severity, Vendor contacts, Templates, Alert drill, Tabletop ו־Post-incident workflow.

34.33.23.7 הסלמה/חסימה: Gates 22 ו־26.1; On-call unavailable מחייב Pause.

34.33.24 X23 — סמכות Go/No-Go, Cutover ו־Rollback.

34.33.24.1 החלטה ומצב: למנות Product accountable, Release manager, Rollback commander, Veto holders וסמכות Open/stop/resume/expand. מצב: `unknown/unavailable`. Tal מאשר את תוכנית ה־Master ואת רכיב מגבלות WhatsApp/Meta, אך אין בכך מינוי אוטומטי לסמכות Go/No-Go תפעולית.

34.33.24.2 Primary: Product/Release manager, Rollback commander ו־Go/No-Go authority הם `unknown/unavailable`; Tal הוא Approver לתוכנית ולרכיב מגבלות WhatsApp/Meta בלבד.

34.33.24.3 Backup: `unknown/unavailable`.

34.33.24.4 מועד: לפני Cutover rehearsal ו־26.1; אישור חדש לפני 26.2/26.3.

34.33.24.5 ברירת מחדל: No-Go; אין Launch/Resume/Expansion לפי Timer, לחץ מסחרי או Build בלבד.

34.33.24.6 Evidence: Decision packet, Gate matrix, Artifact/config/policy/provider digests, Risks, Owner votes, Stop conditions, Rollback owner/drill.

34.33.24.7 הסלמה/חסימה: Gates 26.0.1, ‏26.0.2, ‏26.1, ‏26.2 ו־26.3; ‏P0/P1, Stale evidence או Veto אינם Conditional Go.

34.33.25 X24 — אישור שימוש ב־Cryptographic randomness.

34.33.25.1 החלטה ומצב: טל נדרש לאשר לפני Implementation שימוש ב־CSPRNG של Platform עבור Nonce, OAuth/Meta state, HMAC ephemeral key ו־Security token בלבד. מצב: `unknown/unavailable`; עצם אישור המחקר לתכנון אינו אישור קוד.

34.33.25.2 Primary: Tal; Security implementer `unknown/unavailable`.

34.33.25.3 Backup: `unknown/unavailable`.

34.33.25.4 מועד: לפני Work package ראשון המשתמש ב־Nonce/State/Key, ולפני Gates 9, ‏10 או 26.0.1.

34.33.25.5 ברירת מחדל: היכולת נשארת כבויה. אסור `Math.random()` לכל שימוש ואסור `crypto.randomUUID()` ללא אישור נפרד; IDs עסקיים נשארים Deterministic/hash-based.

34.33.25.6 Evidence: Decision חתום, API allowlist, Threat model, Test vectors, Secret-handling proof, Rotation/zeroization ו־Source scan שמוכיח שאין Randomness אסורה.

34.33.25.7 הסלמה/חסימה: Gates 9, ‏10 ו־26.0.1 לפי היכולת; אין החלפה ב־Nonce דטרמיניסטי או Secret קבוע.

34.33.26 X25 — מחשבי פיתוח, AnyDesk וחשבונות AI ארגוניים.

34.33.26.1 החלטה ומצב: לאשר Inventory שמי של מכשירים וחשבונות, Baseline אבטחה, Company AI plans, Data-use terms, AnyDesk policy, Remote-access approvers ו־Joiner/mover/leaver. מצב: `unknown/unavailable`.

34.33.26.2 Primary: Security/IT `unknown/unavailable`; Roy לרכש חשבונות; כל מפתח Responsible למכשירו.

34.33.26.3 Backup: `unknown/unavailable`.

34.33.26.4 מועד: לפני Gates 2–3 ולפני מסירת Source, Secret או Customer data לכל Tool/endpoint. תאריך: `unknown/unavailable`.

34.33.26.5 ברירת מחדל: אין AnyDesk/Remote access, אין Upload לכלי AI אישי ואין עבודה עם Source/PII/Secrets ממכשיר או Account שאינו מאושר.

34.33.26.6 Evidence: Device/account inventory, MFA/encryption/patch/EDR posture, AI contract/data controls, AnyDesk settings/log, key ownership, revoked-user test ו־offboarding drill.

34.33.26.7 הסלמה/חסימה: Gates 2, 3 ו־29; חשבון או מכשיר לא מאושר מושעה ומפתחותיו מסובבים.

34.33.27 X26 — Localization, תרגום משפטי ו־Human language review.

34.33.27.1 החלטה ומצב: למנות Reviewers אנושיים לעברית, אנגלית וערבית, מומחה RTL/Bidi, Legal translator לנוסחי Terms/Privacy/Consent/Accessibility ו־Glossary owner. מצב: `unknown/unavailable`.

34.33.27.2 Primary: Product/Localization `unknown/unavailable`; Legal לנוסחים משפטיים; Rasha ליישום UI.

34.33.27.3 Backup: Reviewer חלופי לכל שפה `unknown/unavailable`.

34.33.27.4 מועד: עברית לפני Gate 25/26.1; אנגלית וערבית לפני Full-specification Gate 30. תאריך: `unknown/unavailable`.

34.33.27.5 ברירת מחדל: Pilot עברית בלבד עם English technical fallback מצומצם; אין Claim לתמיכה מלאה באנגלית/ערבית ואין פרסום נוסח משפטי שלא אושר.

34.33.27.6 Evidence: Reviewer credentials/approval, Glossary, translation memory provenance, three-language journey reports, RTL/Bidi/security tests ו־Legal sign-off לכל מסמך לקוח.

34.33.27.7 הסלמה/חסימה: Gate 25 למסלול השפה הפעיל ו־Gate 30 ל־Full specification; שפה חסרה מוסרת מן Manifest או חוסמת Claim.

34.33.28 X27 — סמכות Final GA ו־Gate 30.

34.33.28.1 החלטה ומצב: למנות Product accountable, Release manager, Business signer, Gate 30 recorder וחמש סמכויות Veto: Security, Privacy/Legal, Data/Restore, WhatsApp safety ו־Operations. מצב: `unknown/unavailable`. Tal הוא final approver ל־Master Plan ולרכיב מגבלות WhatsApp/Meta, אך אינו מקבל מכך את שאר סמכויות ה־GA או ה־Veto.

34.33.28.2 Primary: Product/Release/Business signer ו־Gate 30 recorder הם `unknown/unavailable`; Tal נותן final approval בתחום התוכנית ומגבלות WhatsApp/Meta בלבד.

34.33.28.3 Backup: Release/Business backup `unknown/unavailable`; Veto backup לכל תחום `unknown/unavailable`.

34.33.28.4 מועד: לפני תחילת 34.35 Certification ולפני כל Public/Commercial GA. תאריך: `unknown/unavailable`.

34.33.28.5 ברירת מחדל: No-Go; אין Public launch, Commercial claim או Expansion על סמך Pilot success, Build או Timer בלבד.

34.33.28.6 Evidence: Signed GA Scope Manifest, Gate matrix, Vote record, Veto resolution, Release/Provider/config digests, Rollback commander, Customer notice ו־Post-GA review calendar.

34.33.28.7 הסלמה/חסימה: Gate 30; Signer חסר, Conflict of interest, unresolved Veto, P0/P1 או stale packet הם No-Go.

34.33.29 תנאי סגירת הנספח.

34.33.29.1 כל 27 הרשומות X01–X27 קיבלו Status, Primary, Backup, Gate, Date, Evidence ו־Safe default.

34.33.29.2 כל `unknown/unavailable` מופיע בדוח החסמים ואינו נספר כהתקדמות.

34.33.29.3 כל Evidence נבדק בידי אדם שני שאינו המבצע היחיד.

34.33.29.4 App Review, Legal, KYC, Procurement, Translation וחתימות אינם שעות Engineering ונשארים זמן חיצוני לא ידוע.

34.33.29.5 לכל Gate, כל X01–X27 החל על ה־Scope חייב להיות `closed`. רשומה שאינה חלה חייבת `not-in-scope` עם Reason, Approver, Review date ו־Disabled evidence; אין רשימת subset ידנית.

34.33.29.6 Gate 26.1 דורש בפרט שכל רשומת Pilot applicable סגורה; X17/X18 יכולים להיות `not-in-scope` רק כאשר Upload/AI כבויים ומוכחים. Gate 30 דורש גם X26/X27 וכל רשומה מסחרית/ציבורית שחלה.

34.34 התאמת Scope, אומדנים ומניעת ספירה כפולה.

34.34.1 מטרת ההתאמה.

34.34.1.1 מטרת סעיף זה היא להפריד בין היקף Pilot, היקף המוצר המלא, הרחבות מותנות, זמן Engineering, זמן Calendar חיצוני ותחזוקה שוטפת.

34.34.1.2 `Gross estimate` הוא אומדן מלא לפני Credit לקוד קיים. `Allocation` הוא חלק מאומדן שלב שכבר קיים. `Net delta` הוא זמן שנוסף רק לאחר שהוכח שאינו כלול באף Task אחר. `External wait` הוא זמן שאין לצוות שליטה עליו. `Recurring operations` הוא זמן חודשי או רבעוני שאינו פרויקט חד־פעמי.

34.34.1.3 סכום זמן מותר רק על Task IDs ייחודיים. אותה פעולה אינה נספרת פעם בשלב, פעם בחבילה משלימה ופעם ב־Cyber crosswalk.

34.34.1.4 המספרים בסעיף 34.34 הם מעטפת Gross לתכנון, לא Remaining נטו ולא תאריך מסירה. Remaining אמין נוצר רק ב־Gate 1 לאחר Inventory, Evidence ו־Re-estimate-to-complete לכל Task.

34.34.2 פרופילי Scope קנוניים.

34.34.2.1 `Scope 1 — Core closed pilot` כולל Tenant אחד, WABA אחד, Phone אחד, Allowlists קטנים ושמיים של משתמשים ו־Recipients במספרים מרביים שהם `unknown/unavailable` עד Charter חתום, מסלול הזמנה סגור, Billing ידני או Pilot חינמי, Quick replies, Campaign allowlist מוגבל ו־Human-only כאשר Flow/AI אינם עוברים Gate. לפני ה־Charter כל המכסות החיות הן אפס; המכנה המדויק הוא זה שב־31.3 וב־34.16.2.

34.34.2.2 `Scope 2 — Full-scope pilot` מוסיף Flow, AI/Knowledge ויתרת Billing engineering לפני פתיחת ה־Pilot. הוא מותר רק אם Gate 17, ‏Gate 18.1, ובנוסף Gate 18.2 כאשר Knowledge/RAG/File pipeline נכלל, וה־Gate המתאים ב־19 נסגרו; אחרת הוא חוזר ל־Scope 1 ואותן יכולות מקבלות Disabled evidence.

34.34.2.3 `Scope 3 — Full specification/GA1` כולל כל SPEC-01–SPEC-27 שאינו מסומן במפורש Conditional, Public onboarding אם ההשקה ציבורית, Billing provider יחיד אם השירות בתשלום, שלוש השפות כאשר אושרו ל־Release Manifest, Multi-tenant production, Support/SLO, Legal/Privacy ו־Production operations. Recurring campaigns ו־PWA אינם נכנסים אוטומטית ל־GA1.

34.34.2.4 `Scope 4 — Best-in-class expansion portfolio` כולל Scope 3 ורק את חבילות Enterprise identity, Connectors, PWA ו־Scale שנבחרו לאחר מחקר ותעדוף מבוססי Pilot ועברו Gate עצמאי. הוא אינו Base, אינו מחייב שני Connectors או PWA ללא ביקוש, ואינו כולל Native mobile או חבילת Expansion אחרת בלי Trigger עסקי.

34.34.2.5 `Scope 5 — Additional conditional expansion` כולל רק חבילות 34.30.22 שעברו Gate 27 ו־Trigger הביקוש שלהן. אין חובה לבנות את כולן כדי להשלים Base או Scope 3, ואין לבנותן רק כדי להגדיל אחוז השלמה.

34.34.2.6 `Scope 6 — Native mobile` הוא פרויקט מותנה ונפרד אחרי הוכחת צורך Native-only שלא נפתר ב־Responsive Web וגם ב־PWA מאושרת כאשר היא ישימה, וביקוש משלם שנקבע לאחר Baseline. הוא אינו חלק מ־Scope 1–5 עד אישור כל Gate instance מספרי מסוג `28.5.<platformRegistryNumber>.<storeScopeRevisionNumber>` שנבחר; Platform/Store scope עתידי שאינו ידוע פותח Discovery חוסם.

34.34.3 אומדני Pilot לאחר התאמה.

34.34.3.1 בסיס Scope 1 לפני בדיקת חפיפה הוא 1,683–2,844 שעות אדם לפי 34.6.6.

34.34.3.2 `Pilot allocation uncertainty reserve` הוא 0–540 שעות: עד 28 ל־Developer endpoints, עד 48 ל־Meta operating model, עד 348 ל־Cutover ועד 116 לבקרות Supplier/Email/People שנחשפו ב־Cyber crosswalk. הגבול התחתון אפס משום שהחבילות עשויות להיות כלולות במלואן בשלבים; הגבול העליון מניח שאינן כלולות כלל.

34.34.3.3 מעטפת Scope 1 השמרנית היא לכן 1,683–3,384 שעות אדם, אך היא אינה Remaining. Gate 1 מחליף את ה־Reserve ב־Net delta מדוד.

34.34.3.4 בסיס Scope 2 הוא 1,995–3,360 שעות; עם אותו Reserve תכנוני המעטפת היא 1,995–3,900 שעות.

34.34.3.5 זמן Calendar נפרד ל־Pilot כולל 2–6 שבועות Legal/Privacy, ‏14–28 ימי Observation, Meta App Review/asset approval, פתיחת Accounts, DNS, ספקי Pentest/Accessibility ו־Procurement. חלקם יכולים לרוץ במקביל, אך אין להניח זאת בלי Owner ותאריך.

34.34.4 אומדן Best-in-class מתואם.

34.34.4.1 `Base 0` הוא הסכום ההיסטורי 2,563–4,360 שעות מן 34.7.4: Full-scope pilot, שלב 32, שלב 33 ושלב 34. הוא נשמר כבסיס חישוב ולא כסכום סופי.

34.34.4.2 Recurring campaigns ב־34.30.10 הם Requirement של SPEC-17 ואינם משויכים במפורש ל־Base 0; לכן `Required delta 1` הוא 48–80 שעות.

34.34.4.3 `Allocation uncertainty reserve` למוצר המלא הוא 0–604 שעות. הגבול העליון מורכב מ־12–20 Public acquisition, ‏8–16 WordPress discovery, ‏16–28 Developer endpoints, ‏24–48 Meta operating model, ‏176–348 Cutover, ‏64–116 Supplier/Email/People controls ו־16–28 Final Gate 30 certification. רק רכיב שאינו מכוסה ב־Task קיים הופך ל־Net delta.

34.34.4.4 נוסחת Scope 4 לפני Native ולפני 34.30.22 היא `Base 0 + Required delta 1 + Net allocation delta`. מעטפת ה־Gross היא 2,611–5,044 שעות אדם.

34.34.4.5 אם כל תשע חבילות 34.30.22 מאושרות, הן מוסיפות 460–788 שעות. מעטפת Scope 5 המלאה היא 3,071–5,832 שעות אדם.

34.34.4.6 אם בנוסף Native mobile מאושר, הוא מוסיף 180–360 שעות. מעטפת כל החבילות המתוכננות היא 3,251–6,192 שעות אדם.

34.34.4.7 המספר 3,251–6,192 אינו התחייבות לבנות את כל ה־Conditional features; הוא תשובה שמרנית לשאלה "מה יקרה אם כולן ייבחרו". ה־Roadmap המחייב נבנה רק לפי Triggers ו־Gate 27.

34.34.4.8 אף מעטפה אינה כוללת Maintenance, Support שוטף, ‏2–4 שעות חודשיות ל־Endpoint audit, ביקורת Threat רבעונית, שינויי חוק/Provider, Traffic בלתי־מוגבל, Unlimited regions או Features שלא קיבלו Requirement.

34.34.5 תרגום לקיבולת צוות.

34.34.5.1 Scope 4 דורש כ־436–841 ימי אדם בני שש שעות מיקוד נטו. Scope 5 עם כל החבילות ו־Native דורש כ־542–1,032 ימי אדם.

34.34.5.2 בקיבולת אמיתית של 30 שעות צוות נטו לשבוע, Scope 4 הוא כ־88–169 שבועות Engineering; עם כל Conditional ו־Native הוא כ־109–207 שבועות.

34.34.5.3 בקיבולת 60 שעות צוות נטו לשבוע, Scope 4 הוא כ־44–85 שבועות; עם כל Conditional ו־Native הוא כ־55–104 שבועות.

34.34.5.4 בקיבולת 90 שעות צוות נטו לשבוע, Scope 4 הוא כ־30–57 שבועות; עם כל Conditional ו־Native הוא כ־37–69 שבועות.

34.34.5.5 אלה גבולות Engineering לפני Critical-path dependencies וזמן חיצוני. שלושה אנשים אינם מקצרים אוטומטית פי שלושה משום ש־Database, Security review, Legal, Meta approval ו־Cutover כוללים עבודה סדרתית.

34.34.6 Ledger של החבילות המשלימות.

34.34.6.1 חבילה 34.30.2 היא 44–72 שעות: 32–52 למסלול Core ו־12–20 ל־Public. Core מוקצה לשלבי Identity/Meta/Campaign/UX/Pilot; חלק Public נשאר ב־Reserve עד Gate 1.

34.34.6.2 חבילה 34.30.3 היא 56–88 שעות ומוקצית ל־Billing/Admin/QA/UX; אין Delta אוטומטי.

34.34.6.3 חבילה 34.30.4 היא 40–72 שעות ומוקצית לשלב Billing; Provider wait חיצוני.

34.34.6.4 חבילה 34.30.5 היא 32–52 שעות ומוקצית ל־Inbox/Billing/Observability/UX.

34.34.6.5 חבילה 34.30.6 היא 24–40 שעות ומוקצית ל־Inbox/Observability/UX.

34.34.6.6 חבילה 34.30.7 היא 56–96 שעות ומוקצית ל־Campaign/AI/Billing/Admin/Observability/UX.

34.34.6.7 חבילה 34.30.8 היא 32–52 שעות ומוקצית ל־Inbox/AI/Admin/QA.

34.34.6.8 חבילה 34.30.9 היא 20–36 שעות ומוקצית למסלול post-Pilot של Contacts/QA/Roadmap.

34.34.6.9 חבילה 34.30.10 היא 48–80 שעות והיא Required delta למוצר המלא משום ש־SPEC-17 מחייב Recurring.

34.34.6.10 חבילה 34.30.11 היא 36–64 שעות ומוקצית ל־UX/i18n; תרגום/Legal חיצוניים.

34.34.6.11 חבילה 34.30.12 היא 12–24 שעות ומוקצית ל־Billing/Privacy/QA; Assessor lead time חיצוני.

34.34.6.12 חבילה 34.30.13 היא 20–36 שעות ומוקצית ל־Observability/QA/Pilot; חלון Observation נפרד.

34.34.6.13 חבילה 34.30.14 היא 24–40 שעות ומוקצית למחזור Roadmap הראשון.

34.34.6.14 חבילה 34.30.15 היא 36–60 שעות Contract preparation ומוקצית לשלב Enterprise/Integrations; מימוש כל Capability נשאר באומדן שלה.

34.34.6.15 חבילה 34.30.16 היא 28–48 שעות ומוקצית ל־Git/QA/Pilot; תיקון Findings תלוי ממצא ונמדד מחדש.

34.34.6.16 חבילה 34.30.17 היא 28–48 שעות ומוקצית ל־Infrastructure/Identity/Admin/QA/Pilot; Account review חיצוני.

34.34.6.17 חבילה 34.30.18 היא 8–16 שעות ומוקצית ל־Pilot; ‏14–28 ימי Observation נפרדים.

34.34.6.18 חבילה 34.30.19 היא 8–16 שעות Conditional לאחר קבלת עותק WordPress מורשה ונקי. אם היא Superseded כדין, ה־Net delta אפס.

34.34.6.19 חבילה 34.30.20 היא 16–28 שעות Setup/Audit ראשוני ונמצאת ב־Reserve עד Gate 1; תחזוקה חודשית 2–4 שעות אינה בפרויקט החד־פעמי.

34.34.6.20 חבילה 34.30.21 היא 24–48 שעות ונמצאת ב־Reserve עד Gate 1; Meta/Legal/App Review waits חיצוניים.

34.34.6.21 חבילה 34.30.22 היא 460–788 שעות רק אם כל תשע היכולות נבחרות; כל חבילה שנבחרת נמדדת בנפרד ואינה יורשת אישור מאחרות.

34.34.6.22 Workstream ‏34.31 הוא 176–348 שעות Gross ונמצא ב־Reserve עד מיפוי מול Infrastructure/Database/Observability/QA/Pilot.

34.34.6.23 Crosswalk ‏34.32 אינו Workstream אוטומטי. כל Reserve היסטורי הוא ROM שבוטל ואינו נספר; כל 42 התחומים נשארים חוסמים עד הקצאת משימות־עלה וקשרי Requirement/Test/Evidence מפורשים, גם כאשר Delta הזמן טרם חושב.

34.34.6.24 Gate 30 certification מוערך ב־16–28 שעות לאיסוף Evidence, Dry run, Review וחתימות. הוא Allocation לשלבי QA/Pilot/Enterprise כאשר הוכח; אחרת הוא Net delta מתוך ה־Reserve.

34.34.7 אלגוריתם Gate 29 ליצירת Baseline ו־Gate 1 לעדכון Remaining.

34.34.7.1 לפני Gate 29 להפיק Task Registry אחד שבו לכל Record יש ID דטרמיניסטי המבוסס על Requirement+Scope+Operation, בלי `Math.random()` ובלי ID ידני כפול. Gate 1 בודק את הקוד הקיים ומעדכן Credit/Remaining; הוא אינו יוצר או מפצל Tasks חסרים.

34.34.7.2 לכל Record לשמור Source sections, Scope profiles, exact paths או external asset, Owner, Reviewer, Dependencies, Gross estimate, overlap group, acceptance tests, evidence, rollback ו־Gate.

34.34.7.3 למפות כל סעיף 6–33, כל חבילה 34.30, ‏34.31, כל תחום 34.32 וכל X record ב־34.33 אל Task IDs. Reference שאינו מייצר עבודה מקבל `reference-only`; הוא אינו מקבל שעות.

34.34.7.4 אם שני Records מתארים אותה פעולה, לבחור Task קנוני אחד ולשמור את האחר כ־Alias. אין לחלק שעות באופן שרירותי כדי לגרום לסכום להתאים למספר קודם.

34.34.7.5 Credit לעבודה קיימת ניתן רק לאחר Source review, Test חיובי, Test שלילי, Failure-path, Evidence קביל ו־Rollback. קוד שקיים אך דורש Rework מקבל Estimate-to-complete חדש, לא אחוז אינטואיטיבי.

34.34.7.6 לכל Task לחשב `remainingHours = reEstimateToCompleteAfterEvidence`; סכום Remaining הוא סכום השעות של Task IDs ייחודיים בלבד. External wait, recurring operations ו־contingency מוצגים בעמודות נפרדות.

34.34.7.7 Reviewer עצמאי בודק שה־Lower/Upper bounds, סכומי Scope, Aliases ו־Net deltas ניתנים לשחזור. הפרש של שעה אחת מחזיר את Ledger לביקורת.

34.34.7.8 Baseline המאושר נחתם ב־Digest וננעל לגרסת Plan. Scope change יוצר Version חדש, Delta שעות, Delta סיכון ו־Approver; אין לשכתב Baseline היסטורי.

34.34.8 תנאי קבלה לסעיף האומדנים.

34.34.8.1 אין מספר Remaining, אחוז או תאריך סיום לפני Gate 1.

34.34.8.2 לאחר Gate 1 כל סכום ניתן לשחזור מ־Task IDs ייחודיים, וכל שעה מסומנת Engineering, External wait, Recurring operations או Contingency.

34.34.8.3 Scope 1–6 מוצגים בנפרד; Capability כבויה אינה נספרת Ready, ו־Capability שאינה נבחרה אינה מורידה את אחוז ה־Scope המאושר.

34.34.8.4 שינוי ספק, חוק, Meta policy, Architecture או Scope מפעיל Re-estimate למסלול הנפגע בלבד.

34.35 Gate 30 — שער הסיום הקנוני למוצר המלא.

34.35.1 מטרת Gate 30.

34.35.1.1 Gate 30 הוא השער היחיד שמאפשר לטעון כי Scope מוצר מוגדר הגיע ל־General Availability. הוא אינו מבטיח מוצר "מושלם לנצח" ואינו מבטל Maintenance, Threat review או Roadmap.

34.35.1.2 לפני הבדיקה נחתם `GA Scope Manifest` הכולל Scope profile, SPECs, Languages, Countries, Plans, Providers, Integrations, Mobile surfaces, Tenants, Regions, Limits, Explicit exclusions ו־Conditional capabilities שנבחרו.

34.35.1.3 Capability שאינה ב־Manifest חייבת להיות חסומה טכנית, מוסתרת או מוצגת Disabled עם Reason; קוד רדום אינו מרחיב את Scope.

34.35.1.4 שינוי ב־Manifest אחרי תחילת Certification מבטל את תוצאות Gate 30 למסלול שהשתנה.

34.35.2 Registry שערים קנוני.

34.35.2.1 Gates 1, ‏2, ‏3, ‏4, ‏5, ‏6.1, ‏6.2, ‏6.3 כאשר Upload/Knowledge/Media נמצא ב־Scope, ‏7, ‏8, ‏9, ‏10, ‏11, ‏12.1 וכל אחד מן ה־instances ‏12.2.1–12.2.6 שהפעולה שלו נמצאת ב־Scope, ‏13, ‏14.1, ‏14.2 כאשר Media נמצא ב־Scope, ‏15, ‏16, ‏17 כאשר Flow נמצא ב־Scope, ‏18.1 כאשר AI נמצא ב־Scope, ‏18.2 כאשר Knowledge/RAG/File נמצא ב־Scope, ‏19.1/19.2/19.3 לפי Billing scope, ‏20, ‏21.1/21.2 לפי Deletion scope, ‏22, ‏23.1, ‏23.2 כאשר נדרש GA/90-day claim, ‏24, ‏25, ‏26.0.1, ‏26.0.2, ‏26.1–26.3, ‏27, ‏29 וכל Gate ‏28 instance מספרי שנבחר חייבים מצב מפורש.

34.35.2.2 Gates ‏27.1–27.9 של 34.30.22 נכנסים למכנה רק עבור Capability שנבחרה ב־GA Scope Manifest. הם מזהי Capability Gate בתוך Namespace של Gate 27, לא הפניה לסעיף 27.1 במסמך.

34.35.2.3 `Gate Runtime parity`, ‏`post-Pilot gate`, ‏`full gate` או שם חופשי אחר אינם Gate IDs. Runtime parity הוא Evidence child של Gate 26.0.1; כל ביטוי לא־קנוני מוחלף לפני ביצוע.

34.35.2.4 Gate חסר, stale, wrong release, wrong environment, wrong issuer או `unknown/unavailable` נחשב Failed ולא Partial pass.

34.35.3 Functional traceability.

34.35.3.1 כל 27 ה־SPECs מקבלים `implemented-and-evidenced`, ‏`explicitly-disabled-not-in-manifest` או `blocked`; ל־GA מלא נדרשים 27/27 implemented-and-evidenced, למעט דרישה שמקור האפיון עצמו מגדיר Conditional וקיבלה exclusion חתום.

34.35.3.2 כל 83 השאלות מקבלות Decision, implementation mapping, tests, evidence ו־owner. Answer תכנוני בלבד אינו Evidence של Runtime.

34.35.3.3 שלושים החלטות השאלון D01–D30, ‏D31 כהחלטה טכנית משלימה וכל Amendment, לרבות D02-A1/D02-A2, D14-A1 ו־D17-A1, קשורים ל־Config/Code/Provider evidence מן Release המדויק.

34.35.3.4 כל Critical journey עובר ב־Production-like Staging דרך Browser ו־API: registration/invitation, onboarding, Meta connection, contact/consent, template, campaign, inbound, inbox, handoff, Flow, AI approval אם נבחר, Billing אם נבחר, Admin, export/delete, restore ו־support.

34.35.3.5 Recurring Campaigns נדרשים ל־Full specification משום ש־SPEC-17 כולל אותם; אם אינם מוכנים, ההצהרה מוגבלת במפורש ל־Pilot/GA scope שאינו Full specification.

34.35.4 Cybersecurity, Privacy ו־Safety.

34.35.4.1 כל 42 תחומי 34.32 נסגרים עם Threat, prevention, negative test, evidence, detection ו־response/recovery. סכירתם אינה ממוצע; כשל בתחום חוסם נשאר No-Go.

34.35.4.2 NIST CSF Govern/Identify/Protect/Detect/Respond/Recover, NIST SSDF, ASVS L2+Bespoke L3, OWASP Web/API/GenAI, CIS ו־SLSA מקבלים Crosswalk מן Release.

34.35.4.3 אין P0/P1 פתוח, אין Critical/High reachable, אין Secret אמיתי, אין Tenant breakout, אין unauthorized/duplicate send ואין Finding ב־CISA KEV הנוגע ל־Artifact חי.

34.35.4.4 Pentest עצמאי, Retest, ASVS review, Threat-model delta, dependency/IaC/container scans, SBOM, provenance ו־Artifact attestations עוברים.

34.35.4.5 Phishing-resistant authentication מוצעת לפחות ל־Owner/Admin/System/Support accounts; MFA, recovery, reauthentication, session revoke, device loss ו־offboarding מתורגלים.

34.35.4.6 Supplier due diligence לפי NIST SP 1326/800-161, Email authentication לפי CISA, Insider-risk/awareness ו־Incident tabletop מקבלים Owners ו־Evidence.

34.35.4.7 Meta AI classification, Third Party Service Provider contract, no-model-improvement proof, `store:false`, Data minimization ו־AI-off fallback נבדקים מחדש לפי Terms העדכניים.

34.35.5 Data, Migration ו־Recovery.

34.35.5.1 כל Data class ממופה ל־System, Region, Tenant boundary, encryption, retention, legal hold, export, deletion, backup ו־restore.

34.35.5.2 PostgreSQL roles/RLS, all migrations, all tables, indexes, constraints, sequences, queue rebuild sources, S3 objects ו־KMS policies מוכחים ב־Release.

34.35.5.3 Gate 26.0.1 מאשר את חלון השינוי בלבד; Gate 26.0.2 עובר לאחר 20/20 capabilities, ‏10/10 slices, ‏55/55 source tables או Baseline חדש חתום, Zero-loss spool, zero Legacy traffic/imports/writers, Rollback boundary ו־24h/72h/7-day evidence.

34.35.5.4 Backup evidence v2 קושר backupId, manifests, schema/data/object/config digests, key identity ו־retention proof. Restore מבודד מוכיח RPO/RTO ו־re-deletion obligations.

34.35.5.5 Retention Plan v2 שפג, Legal Hold, Active data, wrong trigger, wrong cutoff, provider mismatch ו־Restore reappearance נבדקים בשלילה.

34.35.6 Reliability, Performance ו־Operations.

34.35.6.1 SLI/SLO מן Production-like traffic, minimum sample, insufficient-data policy, Error budget, Alert routing ו־On-call Primary/Backup מאושרים. אין 99.5% claim על אפס Traffic.

34.35.6.2 Load, soak, queue crash/restart, DB failover/restart, provider outage, KMS/S3/Redis/OpenAI/Meta failure, network timeout, clock skew ו־Backpressure עוברים בתוך Envelope המאושר.

34.35.6.3 Runbooks ל־P0/P1, Meta quality drop, duplicate/unknown send, Tenant leak, Secret leak, data corruption, queue backlog, billing mismatch, provider outage, restore ו־rollback עברו Tabletop או Drill.

34.35.6.4 Support hours, Severity, acknowledgement targets, Incident commander, Legal/privacy notification authority, Vendor contacts ו־Customer communication מאושרים.

34.35.6.5 Cost caps, 50/75/90/100% alerts, kill switches, quota reconciliation ו־monthly cost model מוכחים לכל ספק פעיל.

34.35.7 Product, UX, Accessibility ו־Commercial readiness.

34.35.7.1 כל Surface ו־State ב־Manifest עובדים ב־Mobile responsive, Keyboard, Screen reader, zoom, reduced motion, RTL/LTR ו־Bidi-safe rendering; WCAG 2.2 AA ו־Legal accessibility review עוברים.

34.35.7.2 Full specification דורש Human-reviewed Hebrew, English and Arabic לכל Journey. Missing translation, fallback שגוי או Mixed-direction security bug חוסמים Full claim.

34.35.7.3 Landing, Pricing, Terms, Privacy, Consent, Support, Security, Availability ו־Compliance claims קשורים ל־Evidence; אין Greenwashing או SLA שלא אושר.

34.35.7.4 Commercial GA דורש Legal entity, signer, Tax/VAT, Invoice path, Price/Currency/Catalog version, Provider אחד חי, Refund/Dunning, Entitlement reconciliation ו־Customer notices.

34.35.7.5 Public acquisition דורש Verified email domain, SPF/DKIM/DMARC, abuse prevention, invitation/registration separation, no-open-redirect ו־complete onboarding recovery.

34.35.7.6 Enterprise, Connectors, PWA, Scale, Native וכל Capability 34.30.22 עוברים רק Gate נפרד שנמצא ב־Manifest. Feature flag לבדו אינו Acceptance.

34.35.8 Release certification.

34.35.8.1 ליצור Clean checkout מן Commit המיועד; לנעול lockfile/toolchain; להריץ Build, TypeScript, ESLint, Unit, Integration, Contract, Source/dependency guards, E2E browser, Accessibility, Security, Performance ו־Migration tests.

34.35.8.2 ליצור שלושה Artifacts נפרדים ל־Vercel Web, Railway API ו־Railway Worker, לקשור אותם ל־releaseId/commitSha/composite manifest ולשמור SBOM/attestation/digests.

34.35.8.3 לבצע Production-like deploy ל־Staging, Cutover rehearsal מלא, Restore, Rollback, Secret rotation, Break-glass, Kill switch, Spool replay ו־Provider disconnect/reconnect.

34.35.8.4 לבצע Evidence freshness check מיד לפני ההחלטה. Evidence שתוקפו חלף בזמן Review נבדק מחדש; אין להשתמש בצילום מסך ישן.

34.35.8.5 שני Reviewers עצמאיים בודקים Traceability, Tests, Risks, External register, Release manifest ו־Rollback. המבצע היחיד אינו יכול לאשר לעצמו Gate 30.

34.35.9 חבילת החלטת Go/No-Go.

34.35.9.1 החבילה כוללת Scope Manifest, Gate matrix, SPEC/Q/Decision/Cyber coverage, Release identity, Provider/config digests, Test reports, open findings, External X register, SLO/cost, rollback, customer notice ו־Owner votes.

34.35.9.2 Veto holders הם Security, Privacy/Legal, Data/Restore, WhatsApp safety ו־Release authority בתחומם. Product pressure, Demo success או תאריך שיווקי אינם עוקפים Veto.

34.35.9.3 תוצאה מותרת היא `No-Go`, ‏`Go for explicitly reduced manifest` או `Go for signed manifest`. אין `Conditional Go` עם P0/P1, stale evidence, missing owner או Restore failure.

34.35.9.4 Scope מצומצם דורש Manifest חדש, Disabled evidence ו־חישוב מכנה מחדש; אין למחוק Finding או Requirement.

34.35.9.5 Rollout מתחיל Staged/Canary עם Stop thresholds. Expansion דורשת Observation ו־Review; Gate 30 אינו אישור Unlimited traffic.

34.35.10 Post-GA ו־Decommission.

34.35.10.1 לאחר ההשקה לבצע Reconciliation ב־24 שעות, 72 שעות, שבעה ימים וסוף חלון Observation; כשל מהותי מפעיל Rollback/Containment ולא Risk acceptance מאוחר.

34.35.10.2 Legacy credentials/runtime/data נמחקים או נשמרים לפי Retention רק לאחר Zero traffic/import, rollback window, Legal/Privacy ו־שני Approvers.

34.35.10.3 להמשיך Patch/vulnerability, Provider-policy freshness, SLO/error budget, restore drill, access review, cost, incident and threat review לפי Cadence מאושר.

34.35.10.4 Best-in-class נמדד מחדש מול Outcomes, Reliability, Safety ולקוחות משלמים; הוא אינו Claim קבוע או ציון שיווקי חד־פעמי.

34.35.11 זמן ואחריות.

34.35.11.1 Certification assembly, Dry run, independent review וחתימות הם Parent ללא שעות; העבודה מפורקת לעלים 34.35.11.1.1–34.35.11.1.4 ואינה נספרת פעמיים מול שלבים 24, ‏26, ‏28 ו־29.

34.35.11.1.1 להרכיב Scope, Gate, Traceability ו־Evidence pack מאותו Release digest; 4–7 שעות.

34.35.11.1.2 לבצע Dry run מלא של אימות ה־pack והחלטת No-Go/Reduced/Go; 4–7 שעות.

34.35.11.1.3 לבצע Independent review ולרשום Findings/Dispositions; 4–7 שעות.

34.35.11.1.4 לאסוף חתימות, לאמת Digest ולפרסם Decision record; 4–7 שעות.

34.35.11.2 Gate 1 קובע אם 16–28 השעות כבר כלולות; עד אז הן ב־Allocation uncertainty reserve של 34.34.4.3.

34.35.11.3 Product/Release accountable; Engineering, Security, Privacy/Legal, SRE, Database, QA, UX/Accessibility, Finance, Support, Meta/WhatsApp safety וטל חותמים בתחומם.

34.35.11.4 Gate 30 נסגר רק כאשר כל התנאים החלים על ה־Manifest הוכחו, כל Exclusion חתום ומושבת, וכל `unknown/unavailable` חוסם נסגר או הוסר מן ה־Manifest באופן בטוח.

34.36 ביקורת איכות סופית למסמך ה־Master Plan.

34.36.1 ביקורת מבנית.

34.36.1.1 לוודא שכל כותרות 1–35 קיימות פעם אחת, כל סעיף ממוספר במספרים בלבד ובסדר היררכי, ואין מזהה סעיף כפול או דילוג שמסתיר משימה.

34.36.1.2 לוודא שכל הפניה פנימית מצביעה לסעיף, Gate, SPEC, Q, Decision, Capability או X record קיים וקנוני.

34.36.1.3 לחפש ולבטל שמות Gate חופשיים, counts ישנים, מספרי Test/Capability סותרים, סטטוס Ready ללא Evidence והבטחות "הושלם" שאינן קשורות ל־Release.

34.36.2 ביקורת כיסוי.

34.36.2.1 לאמת 83/83 שאלות פעם אחת, 27/27 SPECs, ‏D01–D30 כשאלון ו־D31 כהחלטה טכנית משלימה, ‏42/42 תחומי Cyber, ‏X01–X27 כהמלצות טכניות, ‏FR-001–FR-076 כמקורות Framework עצמאיים, ‏DS-001–DS-025 כרשומות סמכות דינמיות ו־21/21 חבילות יכולת מותנות. כל Count נגזר מן הרשם הקנוני ונפסל כאשר Digest המקור משתנה.

34.36.2.2 לכל רשומת־עלה לאמת את כל 18 השדות שב־35.1.3. ירושה אסורה; חוסר בשדה, Reviewer תפקידי ללא משימת מינוי, עלה מעל שמונה שעות או Parent עם שעות חוסמים Gate 29.

34.36.2.3 לאמת שכל `unknown/unavailable` נמצא ב־External register או ב־Blocker מפורש ושאין Data, שם, תאריך, מחיר, Limit או ספק שהומצאו.

34.36.3 ביקורת מקורות.

34.36.3.1 לפתוח כל URL, להעדיף מקור רשמי/ראשוני, לרשום checkedAt, Publication/version ו־Digest ל־PDF/Policy קריטיים.

34.36.3.2 לבדוק מחדש מקורות משתנים לפני כל Gate רלוונטי: Meta Terms/limits/pricing, OpenAI models/data controls, Railway plans/regions/backups, Vercel/Clerk/AWS capabilities, Laws, OWASP/NIST ו־Billing providers.

34.36.3.3 Source שלא ניתן לפתיחה או אינו תומך בטענה מחזיר את ההחלטה ל־Unknown או למחקר; הוא אינו נשאר Citation דקורטיבי.

34.36.4 ביקורת אומדנים.

34.36.4.1 לשחזר את סכומי 34.6, ‏34.7 ו־34.34 ממקור מספרי; לבדוק Lower/Upper בנפרד ולא לערב Gross, Remaining, External wait ו־Recurring operations.

34.36.4.2 לאמת שכל חבילת 34.30, ‏34.31, ‏34.32 ו־34.35 מסומנת Allocation, Required delta, Conditional delta, External wait או Recurring operations.

34.36.4.3 אין לפרסם אחוז או שעות Remaining עד ש־Task Registry המלא אושר ב־Gate 29 ולאחריו Gate 1 קשר לכל עלה Evidence של עבודה קיימת ו־Estimate-to-complete. Gate 1 אינו יוצר או מפצל Tasks; כל אומדן מוקדם יותר נקרא Gross planning envelope.

34.36.5 ביקורת אבטחת המסמך.

34.36.5.1 לסרוק את המסמך ל־Secrets, Tokens, Passwords, Credentials, PII, full phone numbers, private URLs ו־customer content. Evidence examples נשארים ללא מידע אמיתי.

34.36.5.2 לוודא שאין הוראה להשתמש ב־`Math.random()`, שאין ID אקראי עסקי, וששימוש אפשרי ב־CSPRNG נשאר חסום ב־X24 עד אישור טל.

34.36.5.3 לוודא שהמסמך אינו מאשר Deploy, Migration, Provider activation, Credential use, Billing, Delete, Commit או Push.

34.36.6 Version, Digest וחתימות.

34.36.6.1 לפני חישוב Digest להמיר line endings ל־LF ולייצג את שורת `Canonical SHA-256:` בדיוק כ־`Canonical SHA-256: <excluded-from-hash>`; לחשב SHA-256 על UTF-8 bytes של שאר הקובץ.

34.36.6.2 להציב בשורת המטא־דאטה את ה־Digest, לחשב מחדש לפי אותו נרמול ולוודא התאמה. שינוי תו אחד מחייב Digest ו־Review חדשים.

34.36.6.3 לשנות גרסה מ־0.9 ל־1.0 רק לאחר שכל ביקורות 34.36.1–34.36.5 עברו, לצרף Changelog ולרשום Reviewer status.

34.36.6.4 מסמך 1.0 עדיין אינו מסיר Freeze. רק אישור מפורש של טל לפי Gate 29 מסיר אותו ומאפשר להתחיל Slice 1; אישור התוכנית אינו אישור פעולה חיצונית.

34.36.7 תנאי סיום עבודת התכנון.

34.36.7.1 אפס כשל מבני, אפס Requirement unmapped, אפס סתירת Gate/Scope/Estimate ידועה, אפס Citation מטעה ואפס Secret.

34.36.7.2 דוח QA מתעד Commands/Methods, Counts, Findings, Corrections, Residual unknowns ו־Digest בלי לשנות קוד אפליקציה.

34.36.7.3 Product, Engineering, Architecture, Security, Privacy/Legal, Database, SRE, QA, UX/Accessibility, Finance ו־WhatsApp safety/Tal מקבלים את המסמך לעיון. הערת Reviewer מהותית מחזירה רק את הסעיף הנפגע לביקורת ולא מוחקת Evidence אחר.

34.36.7.4 לאחר סגירת סעיף זה Codex מוסר לטל את הקובץ, סיכום Scope, מעטפות הזמן, רשימת External decisions והמלצה האם לאשר Gate 29. עד תשובת טל הפיתוח נשאר מוקפא.

34.37 Risk Ledger תכנוני ל־P0/P1.

34.37.1 כללי הרשם.

34.37.1.1 הרשומות להלן הן סיכונים תכנוניים, לא קביעה שהפגיעות קיימת בקוד. מצב הפתיחה של כולן הוא `planned-open`; Gate 1 קושר אותן לנכסים ו־Gate 5 מאמת Severity, likelihood, exposure, owners ובקרות.

34.37.1.2 כל Risk מקבל Severity לפי ההשפעה המרבית כאשר היכולת חיה. P0/P1 אינו נסגר על בסיס מסמך; הוא נסגר רק באמצעות prevention, negative test, runtime evidence, detection ו־recovery.

34.37.1.3 `Owner` שהוא תפקיד ולא שם נשאר External blocker לפי X02. ‏`Test` הוא מזהה תכנוני ש־Gate 1 ממפה ל־Test case אמיתי; הוא אינו Claim שבדיקה כבר קיימת.

34.37.1.4 Risk acceptance אינו זמין ל־P0/P1 ביכולת חיה. פתרון מותר הוא Fix+Retest או Disable+remove from Scope עם Evidence.

34.37.2 רשומות הסיכון.

34.37.2.1 Risk 1 — Cross-tenant access; Severity P0; Scope כל Multi-tenant path; Owner Security+Data; Controls 9, 12–13 ו־34.32.2.8–2.9; Test 1 wrong-tenant API/DB/Queue/Storage/Search/Export/Telemetry; Evidence denial matrix+RLS report; Gates 5, 7, 20, 24, 26.1 ו־30.

34.37.2.2 Risk 2 — Unauthorized WhatsApp send; Severity P0; Scope Outbound/Campaign/AI; Owner Backend/Product/Security הוא `unknown/unavailable`; Tal הוא Owner למחקר מגבלות WhatsApp/Meta ולמדיניות Connect rate limiting בלבד; Controls 14–17, 20 ו־34.32.2.12/2.26; Test 2 recipient/consent/template/credential/approval mismatch; Evidence immutable permit/attempt ledger; Gates 9, ‏11, כל אחד מן ה־instances ‏12.2.1–12.2.4 שהפעולה שלו נמצאת ב־Scope, ‏15, ‏26.1 ו־30.

34.37.2.3 Risk 3 — Duplicate or uncertain provider attempt; Severity P0; Scope Template submission/Send/Billing webhook; Owner Backend; Controls 15, 17, 20, 24 ו־34.32.2.11/2.34; Test 3 timeout/crash/replay/reorder after side-effect boundary; Evidence one-attempt receipt+reconciliation; Gate 10, כל אחד מן ה־instances ‏12.2.1–12.2.6 שהפעולה שלו נמצאת ב־Scope, ו־Gates 15, ‏19.3, ‏24 ו־30.

34.37.2.4 Risk 4 — Wrong WABA/Phone/Credential revision; Severity P0; Scope Meta connection and send; David אחראי Meta integration, Security approver הוא `unknown/unavailable`, ו־Tal הוא Consulted רק כאשר הבעיה נוגעת למגבלות WhatsApp/Meta או Connect rate limiting; Controls 14, 17 ו־34.30.21; Test 4 asset swap/revoked token/stale revision/wrong environment; Evidence asset graph+binding digest; Gate 9, כל אחד מן ה־instances ‏12.2.1–12.2.6 שהפעולה שלו נמצאת ב־Scope, ו־Gates 26.1 ו־30.

34.37.2.5 Risk 5 — Forged, replayed or acknowledged-before-durable webhook; Severity P0; Scope Meta/Clerk/Billing/Connector ingress; Owner Backend+Security; Controls 15, 24, 33.6 ו־34.31.6.8; Test 5 forged raw body/timestamp/replay/KMS outage; Evidence signature+dedupe+durable receipt; Gates 10, ‏19.3, ‏26.0.1, ‏26.0.2 ו־30.

34.37.2.6 Risk 6 — Consent or Opt-out bypass; Severity P0; Scope Contacts/Campaign/Bot/AI; Owner Product/Legal/Security הוא `unknown/unavailable`; Tal הוא Consulted רק כאשר הבקרה משפיעה על מגבלות WhatsApp/Meta או Connect rate limiting; Controls 18, 20, 26 ו־34.32.2.12/2.26; Test 6 stale consent/suppression race/STOP during scheduling; Evidence consent/suppression ledger; Gates 13, 15, 21.1, 26.1 ו־30.

34.37.2.7 Risk 7 — Secret, Token or signing-key exposure; Severity P0; Scope Repo/Logs/CI/Control planes/Runtime; Owner Security; Controls 7, 10, 11, 14, 27 ו־34.32.2.2–2.4; Test 7 canary secret/client bundle/log/artifact/fork; Evidence secret scan+rotation drill; Gates 2, 3, 5, 24, 26.1 ו־30.

34.37.2.8 Risk 8 — D1→PostgreSQL data loss, corruption or precision drift; Severity P0; Scope Cutover; Owner Database; Controls 12 ו־34.31.4; Test 8 52-bit integer/schema/slice/sequence/uncertain commit/file swap; Evidence source-target digests+rollback receipt; Gates 26.0.1 ו־26.0.2.

34.37.2.9 Risk 9 — Restore failure or backup not bound to exact source; Severity P0; Scope Database/Object/Config/Privacy; Owner Data+SRE; Controls 28 ו־34.32.2.23; Test 9 wrong backupId/digest/key/schema/retention and ransomware isolation; Evidence Restore v2 report; Gates 23.1, ‏23.2 כאשר נדרש GA/90-day claim, ‏26.1 ו־30.

34.37.2.10 Risk 10 — Wrong deletion under active data or Legal Hold; Severity P0; Scope Retention/Delete/Restore; Owner Privacy+Data; Controls 26 ו־34.32.2.22; Test 10 expired plan/wrong cutoff/trigger/provider identity/hold/re-deletion; Evidence Plan v2+local transaction receipt לכל גבול ACID יחיד+durable saga transition/provider receipts לכל מחיקה חוצת שירות; Gates 21.2, ‏24 ו־30.

34.37.2.11 Risk 11 — Malicious file reaches parser, index or user; Severity P0; Scope Knowledge/Media/Imports; Owner Security+AI/Data; Controls 11.9, 19, 23 ו־34.32.2.15; Test 11 extension/MIME/magic mismatch, polyglot, macro, encrypted, scanner timeout/unknown; Evidence quarantine-scan-clean chain; Gates 6.3, ‏14.2 ל־Media, ‏18.2 ל־Knowledge/RAG/File, ‏24 ו־30.

34.37.2.12 Risk 12 — Prompt injection, RAG poisoning, data exfiltration or excessive agency; Severity P0; Scope AI/Knowledge; Owner AI+Security; Controls 23, 34.30.8 ו־34.32.2.20–2.21; Test 12 malicious document/system-prompt request/tool action/citation spoof; Evidence Eval/red-team/human-approval proof; Gate 18.1 לכל AI, ‏Gate 18.2 ל־Knowledge/RAG/File, ו־Gates 24 ו־30.

34.37.2.13 Risk 13 — Unauthorized charge, refund, credit or entitlement; Severity P0; Scope Billing/Admin; Owner Finance+Billing; Controls 24–25, 34.30.4/12 ו־34.32.2.34; Test 13 forged webhook/redirect-only success/wrong price/double refund/self-approval; Evidence provider-finance-entitlement reconciliation; Gates 19.1/19.3, 20, 24 ו־30.

34.37.2.14 Risk 14 — Compromised dependency, Action, image or release artifact; Severity P0; Scope SDLC/Deploy; Owner Security+Release; Controls 7, 29, 31 ו־34.32.2.2/2.25; Test 14 tampered lockfile/artifact/provenance/unpinned action; Evidence SBOM+attestation+clean checkout; Gates 2, 24, 29 ו־30.

34.37.2.15 Risk 15 — Account takeover or Organization/Role escalation; Severity P0; Scope Clerk/Admin/Support/Control planes; Owner Identity+Security; Controls 8, 13, 25 ו־34.30.17; Test 15 wrong authorizedParty/org switch/stale role/MFA bypass/recovery abuse; Evidence session/membership denial suite; Gates 3, 8, 20, 24 ו־30.

34.37.2.16 Risk 16 — Public Database, Redis, Bucket or over-privileged principal; Severity P0; Scope Infrastructure; Owner Platform+Data; Controls 11–12 ו־34.32.2.6/2.8/2.14/2.15; Test 16 public network/default credential/owner role/KMS deny; Evidence network/ACL/RLS/IAM export; Gates 6.1, ‏6.2, ‏6.3 כאשר S3 נמצא ב־Scope, ‏7, ‏23.1, ‏23.2 כאשר נדרש GA/90-day claim, ו־30.

34.37.2.17 Risk 17 — DNS, Callback, Origin or domain takeover; Severity P0; Scope Vercel/Railway/Meta/Clerk/Email; Owner Deployment+Security; Controls 11, 13–15, 34.31.8 ו־34.32.2.27; Test 17 host reflection/wildcard/dangling DNS/wrong callback/certificate; Evidence DNS/cert/origin/callback proof; Gates 6.1, ‏6.2, ‏8, ‏9, ‏26.0.1, ‏26.0.2 ו־30.

34.37.2.18 Risk 18 — XSS, CSRF, clickjacking or unsafe Browser bridge; Severity P1; Scope React/BFF/Embedded Signup; Owner Frontend+Security; Controls 15, 30 ו־34.32.2.10; Test 18 stored/reflected DOM payload, cross-site request, wrong `postMessage` source/origin; Evidence browser security suite+CSP; Gates 9, 24, 25 ו־30.

34.37.2.19 Risk 19 — SSRF or unsafe outbound fetch; Severity P1; Scope Files/Connectors/Webhooks/Media; Owner Backend+Security; Controls 23, 33.6 ו־34.32.2.16; Test 19 localhost/private/link-local/DNS rebinding/redirect/oversized response; Evidence egress denial report; Gates 6.3, ‏18.2, ‏24, כל Gate instance מספרי מסוג 28.2 שנבחר, ו־30.

34.37.2.20 Risk 20 — Queue loss, duplicate, poison job or scheduler split-brain; Severity P1, promoted to P0 if it can send/charge twice; Scope BullMQ/Scheduler; Owner Backend+SRE; Controls 11.8, 16–17, 20 ו־34.31.6; Test 20 Redis restart/two workers/DLQ/replay/clock skew; Evidence job ledger+drain/rebuild drill; Gate 11, כל אחד מן ה־instances ‏12.2.1–12.2.4 שהפעולה שלו נמצאת ב־Scope, ‏Gate 15, ‏Gate 26.0.2 ו־Gate 30.

34.37.2.21 Risk 21 — Rate-limit, DoS, noisy-neighbor or cost exhaustion; Severity P1, P0 if uncontrolled send/charge results; Scope API/Meta/AI/File/Billing; Tal הוא Owner למחקר מגבלות WhatsApp/Meta ולמדיניות Connect rate limiting; SRE/Security/Cost owners ליתר השכבות הם `unknown/unavailable`; Controls 16, 27 ו־34.32.2.19; Test 21 multi-layer burst/stale limit/quality drop/budget cap; Evidence effective-cap computation+pause drill; Gates 11, 22, 26.1 ו־30.

34.37.2.22 Risk 22 — Missing, misleading or PII-bearing telemetry; Severity P1; Scope Logs/Audit/SLO/Incident; Owner SRE+Privacy; Controls 25, 27 ו־34.32.2.18; Test 22 secret/PII canary, dropped spans, wrong tenant, zero-traffic green; Evidence redaction/coverage/alert report; Gates 20, 22, 24 ו־30.

34.37.2.23 Risk 23 — Critical provider outage or silent capability degradation; Severity P1; Scope Meta/Railway/Vercel/AWS/Clerk/OpenAI/Email/Billing; Owner SRE+Supplier owner; Controls 27, 34.32.2.29/2.31; Test 23 timeout/5xx/plan limitation/terms change/account suspension; Evidence failure drill+exit/manual fallback; Gates 22, 26.1 ו־30.

34.37.2.24 Risk 24 — Phishing, BEC or mailbox takeover; Severity P1, P0 when Finance/Admin credentials or payment details change; Scope Invitations/Email/Finance/Support; Owner Security+Finance; Controls 34.32.2.32 ו־X16; Test 24 lookalike/from-alignment/invoice-change/replayed invite; Evidence SPF/DKIM/DMARC+tabletop; Gates 8, 19.1, 20 ו־30.

34.37.2.25 Risk 25 — Compromised developer endpoint or AnyDesk session; Severity P1, promoted to P0 on Secret/Production access; Scope SDLC/Accounts; Owner Security/IT; Controls 34.30.20, 34.32.2.28 ו־X25; Test 25 lost device/unknown remote/clipboard transfer/revoked user; Evidence device posture+session/offboarding drill; Gates 2, 3 ו־29.

34.37.2.26 Risk 26 — Insider abuse or stale access after role/offboarding; Severity P1, P0 on Tenant/send/billing/secret impact; Scope all privileged paths; Owner Security+HR/Legal; Controls 8, 25, 34.32.2.33 ו־X02; Test 26 mover/leaver/export/support/break-glass misuse; Evidence access review+immutable audit; Gates 3, 20, 24 ו־30.

34.37.2.27 Risk 27 — Privacy, data-transfer, retention or disclosure violation; Severity P1, promoted to P0 for broad unlawful exposure/destruction; Scope all Data classes; Owner Privacy/Legal; Controls 26, 34.33 X08/X21; Test 27 wrong region/subprocessor/notice/DSAR/retention trigger; Evidence legal/data-flow/retention matrix; Gates 21.1, 21.2, 26.1 ו־30.

34.37.2.28 Risk 28 — Meta policy or AI classification violation; Severity P1, promoted to P0 when account suspension or prohibited data/model use affects customers; Scope WhatsApp/AI; Owner Legal/Product/AI/Security הוא `unknown/unavailable`; Tal הוא Consulted רק להשלכות על מגבלות WhatsApp/Meta או Connect rate limiting; Controls 5.2.2–5.2.3, 23, 34.30.21 ו־X07; Test 28 AI-primary/model-improvement/terms-delta/quality restriction; Evidence classification memo+contracts+AI-off proof; Gate 18.1 לכל AI, ‏Gate 18.2 ל־Knowledge/RAG/File, ו־Gates 26.1 ו־30.

34.37.2.29 Risk 29 — Critical accessibility, RTL or Bidi failure; Severity P1; Scope all user journeys; Owner UX/Accessibility; Controls 30, 34.30.11 ו־X14/X26; Test 29 keyboard/screen-reader/zoom/mobile/mixed-direction spoof; Evidence WCAG/expert/language reports; Gates 25, 26.1 ו־30.

34.37.2.30 Risk 30 — On-call, incident command or support unavailable; Severity P1, promoted to P0 during live safety incident; Scope Pilot/GA operations; Owner Operations; Controls 27, 31 ו־X10/X22/X23/X27; Test 30 pager failure/primary unavailable/vendor escalation/stop-resume; Evidence roster+tabletop+decision packet; Gates 22, 26.1 ו־30.

34.37.2.31 Risk 31 — KMS, Object policy or encryption lifecycle failure; Severity P1, P0 on public exposure or unrecoverable data; Scope S3 Knowledge/Backup/Spool; Owner AWS/Security; Controls 11.9, 28, 34.31.5–6 ו־X15; Test 31 wrong key/grant/region/re-encryption/delete wait; Evidence key/bucket policy+restore; Gates 6.3, ‏18.2, ‏23.1, ‏23.2 כאשר נדרש GA/90-day claim, ו־30.

34.37.2.32 Risk 32 — Unbounded or misleading Product automation; Severity P1, P0 if it sends, deletes, bills or changes permissions without authority; Scope Flow/AI/Scheduler/Admin; Owner Product+Security; Controls 20, 22–25, 34.30.8/22; Test 32 stale approval/auto-resume/routing race/model profile/admin double-submit; Evidence state machine+human approval+kill switch; Gates 15, 17, 18, 20, 24 ו־30.

34.37.3 רישום, גילוי ושינוי Severity.

34.37.3.1 Gate 1 מוסיף Asset IDs, Code paths, External assets, Owners, Status ו־Test locations לכל Risk. Risk שאינו חל מקבל `not-in-scope` עם Disabled evidence; הוא אינו נמחק.

34.37.3.2 Gate 5 מוסיף Likelihood, Exposure, Attack preconditions, Existing controls, Residual severity, Detection coverage ו־Recovery objective על בסיס Threat model ו־evidence, לא תחושה.

34.37.3.3 Finding ממשי מקבל Finding ID נפרד ומקושר ל־Risk אחד או יותר. Closing Finding אינו סוגר Risk אם הבקרה המערכתית עדיין חסרה.

34.37.3.4 Severity עולה מיד כאשר Exposure/impact מוכחים; הורדה דורשת שני Reviewers, Threat evidence ו־negative retest. שינוי Product scope יכול להוסיף Risk records חדשים.

34.37.3.5 Risk register נבדק בכל Gate, Release, Incident, Provider/Legal change ולפחות רבעונית אחרי GA.

34.37.4 תנאי קבלה לרשם.

34.37.4.1 כל 32 הסיכונים קיימים פעם אחת, קשורים ל־42 תחומי Cyber ול־Gate חוסם, ולכל אחד Owner role, Control, Negative test ו־Evidence מוגדרים. תחום יכול למפות ליותר מסיכון קנוני אחד; אין חובה להמציא Risk כפול רק כדי לייצר יחס אחד־לאחד.

34.37.4.2 לפני Gate 29 מותר שהמצב יהיה `planned-open`, משום שהפיתוח מוקפא; אסור שיהיה Risk חסר או ללא Gate. לפני Gate 26.1/30 כל Risk החל על Scope חייב Control+Test+Evidence או Capability כבויה.

34.37.4.3 Register export אינו מכיל Exploit secret, Production endpoint, PII או Customer data; גרסאות היסטוריות ודלתאות Severity נשמרות.

34.37.4.4 P0/P1 פתוח או Stale ביכולת חיה חוסם Release, Pilot ו־GA ללא חריג.

34.38 דוח QA היסטורי לגרסה 1.0 ו־Changelog. סעיף זה נשמר כראיה היסטורית בלבד; הוא בוטל כ־Gate evidence על ידי Findings ‏MP-F001–MP-F052 ואינו מתאר את מצב Draft ‏1.1.

34.38.1 Scope הביקורת.

34.38.1.1 הביקורת היא למסמך התכנון בלבד. לא שונה קוד אפליקציה, לא הורץ Migration, לא הופעל Provider, לא בוצע Commit/Push/Deploy ולא הוסר Freeze.

34.38.1.2 בסיס Git שנבדק נשאר Branch ‏`codex/cloudflare-evidence-builders` ו־Commit ‏`93c6b2dfe007f07c43c37389873a8a648a3ff69d`; מסמך זה נשאר Untracked עד Review מפורש.

34.38.1.3 מצב ה־Worktree בזמן הביקורת הוא 415 נתיבים: 128 Modified/Staged-or-modified ו־287 Untracked, כולל מסמך זה. אין להסיק מכך איזה קוד תקין ואין לבצע Staging רחב.

34.38.2 בדיקות מבניות שבוצעו.

34.38.2.1 Parser קרא כל שורה ממוספרת, בדק Unique IDs, Parent קיים, סדר ילדים עולה ורצף ללא Gap. התוצאה: אפס Duplicate, אפס Missing parent, אפס Gap ואפס Out-of-order.

34.38.2.2 נספרו 34 כותרות ראשיות ו־29 שלבי ביצוע רציפים, Stage 1–29. לכל שלב נמצאו Goal, Dependency, Owner, Time, Acceptance, Evidence, Rollback ו־Gate.

34.38.2.3 כל 21 החבילות 34.30.2–34.30.22 עברו בדיקת שמונת השדות; כל 34 תחומי Cyber כוללים בדיוק Threat, Prevention, Negative test, Evidence/Detection ו־Response/Recovery; כל X01–X27 כולל שבעה שדות.

34.38.2.4 Markdown נבדק ל־Code-fence ו־backtick balance. כל הקישורים הם URL תקין תחבירית.

34.38.3 בדיקות כיסוי שבוצעו.

34.38.3.1 Answer Ledger הוא 83/83 ללא חסר או כפילות; SPEC crosswalk הוא 27/27; Decisions הם שלושים תשובות D01–D30, ‏D31 Supplemental Technical Decision וכן D02-A1, D02-A2, D14-A1 ו־D17-A1.

34.38.3.2 Cyber crosswalk קנוני נדרש להיות 42/42; External Authority Register הוא 27/27; Cutover registry הוא 20/20; Risk Ledger הוא 32/32. תוצאת 34/34 של Snapshot ‏1.0 הייתה היסטורית וחלקית ואינה PASS לגרסה 1.1.

34.38.3.3 כל Risk כולל Severity, Scope, Owner role, Controls, Test, Evidence ו־Gate; כל P0/P1 החל על Capability חיה חסום עד Evidence או Disable.

34.38.4 ביקורת מקורות.

34.38.4.1 נמצאו 200 מופעי Markdown link ו־163 URLs ייחודיים. בדיקת HTTP מתוארכת החזירה 158 הצלחות ישירות ו־5 תשובות 403 מאתר `gov.il` המגן על Bot access.

34.38.4.2 חמש כתובות `gov.il` אומתו בנפרד באמצעות Search index חי של האתר: מדריך אבטחת מידע, תיקון 13, נגישות אתרים, מרשם תוכנות הנהלת חשבונות וחשבוניות ישראל. 403 אינו מסומן Broken link, אך הן נבדקות מחדש לפני Legal/Tax/Accessibility Gate.

34.38.4.3 מקורות קריטיים שנפתחו ואומתו כוללים WhatsApp Business Solution Terms מ־06.03.2026, OWASP GenAI LLM Top 10 2026 מ־03.08.2026, NIST SP 1326 מיולי 2026, NIST SP 800-63B-4, Cloudflare D1 export/import, Railway regions/backups, OpenAI data/deprecation ו־מקורות ישראליים רשמיים.

34.38.4.4 כתובת רשות המסים שכותרתה Registration אך הובילה ל־Lookup תוקנה: Registration ו־Registry lookup הם כעת שני מקורות נפרדים.

34.38.5 ביקורת אבטחה ואומדנים.

34.38.5.1 Secret/PII pattern scan החזיר אפס OpenAI/GitHub/AWS key, אפס Private key, אפס Bearer credential ואפס מספר ישראלי מלא.

34.38.5.2 מחוץ לשורת דוח זו נמצאו שישה מופעי `Math.random()` ומופע יחיד של `crypto.randomUUID()`; כולם איסורים מפורשים בלבד. האזכורים בשורה זו הם תיעוד QA, אין הוראה להשתמש בהם ו־CSPRNG נשאר חסום ב־X24.

34.38.5.3 אומדני 34.34 חושבו מחדש: Scope 4 הוא 2,611–5,044; כל תשע היכולות המותנות 3,071–5,832; עם Native ‏3,251–6,192; Core ‏1,683–3,384; Full-pilot ‏1,995–3,900.

34.38.5.4 Cutover חושב מחדש: ללא R2 ‏160–316; עם R2 ‏176–348. כל תרחישי שישה שעות ליום ו־30/60/90 שעות צוות בשבוע תואמים לסכומים לאחר עיגול כלפי מעלה.

34.38.6 Findings שתוקנו בביקורת.

34.38.6.1 הוגדר Gate 30 מלא, GA Scope Manifest, Scope profiles ו־Gate instances.

34.38.6.2 הוסרה תלות עצמית של Gate 26.1, הופרדו תלות Core/Optional ונוצרו Gate 26.0.1 ו־Gate 26.0.2.

34.38.6.3 מספר Cutover capabilities תוקן ל־20, סדר DNS/Meta/Spool/Data migration אוחד ונוספה מעטפת Zero-loss.

34.38.6.4 External register הורחב מ־24 ל־27, Cyber מ־33 ל־34 ונוסף Risk Ledger בן 32 רשומות.

34.38.6.5 אומדני Base/Recurring/Allocation/Conditional/Native הופרדו; ספירה כפולה נשארת חסומה עד Gate 1.

34.38.6.6 נוספו Supplier due diligence, Phishing-resistant authentication, Email/BEC, Insider risk, Developer endpoints ו־Billing/PCI controls.

34.38.7 Residual unknowns שאינם ניתנים לפתרון במסמך.

34.38.7.1 כל X01–X27 שטרם קיבל אדם, חשבון, תאריך, סכום, Contract או Evidence נשאר `unknown/unavailable`; ברירת המחדל היא No-Go או Capability disabled.

34.38.7.2 Remaining hours ואחוז אמין נשארים בלתי־ידועים עד Gate 1. מעטפות 34.34 הן Gross planning envelopes בלבד.

34.38.7.3 נכונות הקוד המלוכלך, Live Provider behavior, Meta limits, Legal/Tax conclusions, Pentest findings, Accessibility expert review, RPO/RTO ו־Pilot outcomes אינם מוכחים על ידי QA למסמך.

34.38.7.4 כל 11 סטטוסי ה־Review שמופיעים בראש המסמך עדיין `pending`; אישור טל ל־Gate 29 עדיין `pending`.

34.38.8 Changelog מ־0.9 ל־1.0.

34.38.8.1 נוספו Answer/SPEC semantic corrections, 21 work packages, Cloudflare→Vercel/Railway Cutover workstream, 34-domain Cyber crosswalk, 27-record External register, Estimate reconciliation, Gate 30, Final QA ו־32-risk ledger.

34.38.8.2 תוקנו Meta AI legal boundary, D1 SQL export acquisition, Backup/Retention contracts, Scope purity, Cutover order, Gate dependencies, source dates ו־Tax Authority URLs.

34.38.8.3 גרסה 1.0 פירושה `planning complete for formal review`; היא אינה `approved`, אינה `implemented`, אינה `tested live` ואינה מסירה Freeze.

34.38.9 תוצאת QA.

34.38.9.1 תוצאת ה־QA הייתה נכונה רק ל־Snapshot ‏1.0 שנבדק אז. ביקורת 1.1 פתחה Findings מהותיים ולכן הטענה “ללא Finding מבני פתוח” אינה תקפה לגרסה הנוכחית.

34.38.9.2 Gate 29 נשאר `BLOCKED` עד שכל 11 סטטוסי ה־Review יהיו `approved` וטל יאשר במפורש. Digest היסטורי אינו Digest קנוני ל־1.1; כל שינוי Review יוצר גרסה ו־Digest חדשים. Gate 1 וכל פיתוח נשארים חסומים עד אז.

34.38.10 מצב QA של Draft ‏1.1.

34.38.10.1 נפתחו 52 Findings קנוניים MP-F001–MP-F052. חומרה ומצב נגזרים מן Registry ואינם נספרים ידנית; כולם דורשים את ה־Disposition, התיקון, ה־Retest וה־Review המוגדרים לפני Gate החל עליהם.

34.38.10.2 הוחלפו טענות מסוכנות בדבר Atomic deletion חוצה ספקים, Optional WORM, Vercel UI-only, Token decrypt מוקדם, Upload כחלק מ־Core, Gate 6 מעגלי ו־Provider acceptance השווה למסירה.

34.38.10.3 QA מבני, Links, References, סכומים, DAG, Task-field completeness, Source freshness ו־Secret/PII scan טרם הורצו מחדש על Snapshot סופי. מצבם `pending`; אין להסיק Passed מתוצאות 1.0.

34.38.10.4 Canonical SHA-256 נשאר `pending-final-QA`. הקפאת הפיתוח נשארת פעילה גם אם סעיף בודד במסמך סומן מתוקן.

34.38.10.5 ביקורת Read-only עצמאית ל־A02-A ול־A04 מתאריך 27.08.2026 נשמרה ב־`/private/tmp/connect-independent-review-a02a-a04-2026-08-27.md`; דיגסט הדוח הוא `2d48cfeef505d893f447b0a94788a8bd97372d87c5ac810d696023f70626ac9c`. זהו Review checkpoint בלבד, לא Artifact מקודם ולא Gate evidence סופי.

34.38.10.6 הביקורת פענחה 692 עלים ומצאה 18 שדות בכל עלה, אפס ID/Output/Evidence collision, אפס Dangling predecessor, אפס Cycle, ‏692/692 Reachability, אפס Conditional runtime leakage ואפס Rollback-after-reachability. תוצאה מבנית זו חלה רק על שני הדיגסטים שנבדקו ואינה גוברת על פער סמנטי.

34.38.10.7 הביקורת פתחה 12 Findings חוסמים: DS-011 Privacy delta; Clerk/Vercel; GitHub attestations; SES HTTPS-only decision; משפחת שישה חוזי Meta; שני Error codes ו־Webhook header חסרים; 11 הפרות `cap=0`; Semantic mismatch אחד; Gate 30 lock ישן; 41 Cyber IDs חסרים; GuardDuty/Object Lock delta; ו־Self-QA false PASS.

34.38.10.8 פסק הדין הוא `REJECT` הן ל־A02-A והן ל־A04. אף SHA קודם אינו `FREEZE-CANDIDATE`. כל חבילה נבנית מחדש, מקבלת Producer QA ללא Self-credit, ולאחר מכן נמסרת ל־Reviewer אחר שאינו המבצע.

34.38.10.9 מחקר SES, Better Stack ו־OpenAI שנוסף אחרי ה־Review הוא Source delta נוסף: הוא מבטל מראש כל SHA שלא קלט אותו. ‏Source freeze יוגדר רק לאחר A08 עדכני, A02–A05 שנבנו ממנו ו־Negative stale-source audit; המילה “freeze” אינה נגזרת מכך שקובץ קיים.

34.38.10.10 סדר הסגירה הוא: תיקון A02-A/A02-B/A03/A04/A05 → בניית A08 בן 195 רשומות → אימות Cross-source deltas מחדש → A06 Crosswalk → A07 DAG/Schedule → Assembly של A01–A08 → A09 עם 13 Audits → שני Reviews עצמאיים → חישוב Root SHA-256 → אישור טל לדיגסט המדויק. כל Byte change לאחר שלב כלשהו מבטל את התוצאות התלויות ומחזיר לנקודת ה־Review המתאימה.

34.38.10.11 מחקר Railway Redis, ‏Redis ו־BullMQ מ־27.08.2026 נוסף אחרי אותו Review: ‏Railway template הוא Unmanaged ופרטי כברירת מחדל; Public Access יוצר TCP Proxy; ‏BullMQ הוא at-least-once; ‏AOF every-second אינו Zero-loss; ‏Dedup/Job ID חדלים להגן לאחר מחיקה; ו־Redis 8.2.6 הוא Advisory snapshot ולא Target נצחי. התיקון הוטמע ב־11.8.12–11.8.21, ‏34.25.49–34.25.53, ‏34.31.6, ‏34.32.2.14, ‏DS-005, ‏TH-020 ו־CTL-010. כל A02–A08 שלא קלטו Delta זה פסולים להקפאה.

34.38.10.12 לאחר ה־Delta הורצה בדיקת Heading IDs מקומית ונמצאו אפס מספרי סעיף כפולים. זו בדיקה צרה של Main narrative בלבד; היא אינה מחליפה Order/hierarchy, WBS leaf, source, semantic, crosswalk, DAG, evidence או 13 Audits של A09, שכולם נשארים `pending`.

## 35. רשם ביצוע, מסגרות, תיקונים ומשימות קנוני

35.1 חוזה הרשם.

35.1.1 סעיף זה הוא המקור הקנוני היחיד לפתיחת עבודה לאחר Gate 29. סעיפים 6–34 מסבירים Scope והיגיון; משימה שאינה רשומת־עלה בסעיף 35 אינה מורשית לביצוע.

35.1.2 כל המספור הוא מספרי בלבד. מזהה טכני יכול להופיע בתוך שדה Evidence, אך אינו מחליף את מספר הסעיף.

35.1.3 לכל רשומת־עלה מופיעים במפורש שמונה־עשר שדות, ללא ירושה מהורה.

35.1.3.1 מזהה דטרמיניסטי וגרסת הרשומה.

35.1.3.2 פעולה יחידה בניסוח של פועל ותוצר.

35.1.3.3 Input מדויק ו־Digest כאשר הוא קובץ או Snapshot.

35.1.3.4 Output מדויק ומיקום צפוי; מסמך, Evidence או Artifact ללא מיקום אינו תוצר.

35.1.3.5 Predecessors מכילים רק Task IDs מדויקים של רשומות־עלה קיימות. Gate ID, מספר Section, מזהה X, Role, Provider wait או משפט חופשי נרשמים בשדות הייעודיים ואסור להשתמש בהם כ־Predecessor; תלות שעדיין אינה ניתנת למיפוי ל־Task ID יוצרת משימת Discovery חוסמת של עד שמונה שעות.

35.1.3.6 Primary שמי; Role בלבד הוא `unknown/unavailable` עד מינוי.

35.1.3.7 Backup שמי ונפרד כאשר Continuity דורשת זאת.

35.1.3.8 Reviewer שאינו מבצע המשימה; שינוי רגיש דורש שני Reviewers כפי שנקבע ב־7.4.2.

35.1.3.9 אומדן מינימום ומקסימום של עד שמונה שעות אדם לרשומת־עלה.

35.1.3.10 בדיקות חיובית, שלילית, כשל ו־Concurrency החלות; `N/A` דורש נימוק.

35.1.3.11 תנאי קבלה Binary שאדם אחר יכול לבדוק.

35.1.3.12 Evidence ומיקומו, עם Redaction, Digest, Producer, checkedAt ו־Expiry.

35.1.3.13 Detection/Monitoring שמגלה Regression לאחר הסגירה.

35.1.3.14 Rollback או Disable שמחזיר למצב בטוח ונוסה.

35.1.3.15 Gate שהמשימה פותחת או חוסמת.

35.1.3.16 Requirement IDs מן האפיונים, שלושים החלטות השאלון D01–D30, ‏D31 כהחלטה טכנית משלימה והחלטות התיקון.

35.1.3.17 Threat/Risk/Finding IDs שהמשימה מצמצמת.

35.1.3.18 Status מתוך חמשת המצבים שב־2.11; אין אחוז ידני.

35.1.4 Parent אינו מקבל שעות, Status או Credit. אומדן Stage הוא סכום עלים ייחודיים לאחר Dedup; זמן המתנה Calendar נרשם ב־DAG בנפרד.

35.1.5 משימה גדולה משמונה שעות מפורקת לפני אישור. אם Scope אינו ידוע מספיק לפירוק, נוצרת משימת Discovery של עד שמונה שעות ולאחריה Gate תכנוני; אין Placeholder “להשלים אחר כך”.

35.1.6 ערך `unknown/unavailable` אינו רשות לנחש. הוא יוצר משימת מינוי, Capability probe, Legal decision או Provider evidence, וברירת המחדל היא No-Go או capability disabled.

35.1.7 אין נתון עסקי Synthetic/Mock/Fake/Demo/Sample. נתוני בדיקה מותרים רק כ־Artifact אמיתי מאושר וממוזער, official provider sandbox artifact, normative standard vector או deterministic non-business attack literal, עם Provenance, Digest, Purpose, Expiry ו־destruction לפי MP-F050. אין `Math.random()` ליצירת נתון, ID, סדר או התנהגות.

35.1.8 שינוי רשומה לאחר אישור דורש Version חדש, Reason, Delta, Reviewer ו־Digest חדש. אסור לערוך בדיעבד Evidence היסטורי.

35.1.9 כל Source, Framework, Provider contract, חוק או מחיר מקבל Freshness policy. Snapshot שפג אינו Evidence גם אם תוכנו נראה סביר.

35.1.10 ה־Registry הסופי ייוצא גם למבנה Machine-readable רק לאחר שהמסמך האנושי עבר QA; Export אינו Source of truth עצמאי.

35.2 Framework, Threat intelligence ו־Control registry.

35.2.1 [FR-001] NIST Cybersecurity Framework ‏2.0.

35.2.1.1 תפקיד: Governance ו־Risk outcomes לפי Govern, Identify, Protect, Detect, Respond ו־Recover; הוא אינו רשימת בדיקות טכנית.

35.2.1.2 יעד: Current profile ו־Target profile לכל Pilot/GA scope, Owner ו־Gap לכל Outcome ישים.

35.2.1.3 מקור קנוני: [NIST CSF 2.0](https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final). Freshness: רבעוני, בכל Incident מהותי ובכל שינוי Scope.

35.2.2 [FR-002] NIST SP 800-18 Revision 2, Final מיוני 2026.

35.2.2.1 תפקיד: מבנה מחייב למסמך System security plan, System privacy plan ו־C-SCRM plan של Connect.

35.2.2.2 יעד: כל Control מתאר Status תפעולי, אחריות, Boundary, Evidence ופער; `planned` אינו `implemented`.

35.2.2.3 מקור קנוני: [NIST SP 800-18r2](https://csrc.nist.gov/pubs/sp/800/18/r2/final). Freshness: בכל Release גדול ולפחות רבעוני.

35.2.3 משפחת NIST SP 800-53 Release ‏5.2.0; כל מקור הוא Framework record עצמאי.

35.2.3.1 [FR-003] NIST SP 800-53 Release ‏5.2.0.

35.2.3.1.1 תפקיד: קטלוג Control reference, לא Claim להסמכה פדרלית ולא Baseline שנלקח כולו ללא Tailoring.

35.2.3.1.2 יעד: לבחור Controls לפי Risk, לקשור ל־ASVS/CIS/CCM ולתעד Applicable/N/A/Inherited/Provider-shared.

35.2.3.1.3 מקור קנוני: [SP 800-53 Release 5.2.0](https://csrc.nist.gov/news/2025/nist-releases-revision-to-sp-800-53-controls). Freshness: רבעוני ובכל Release NIST.

35.2.3.2 [FR-004] NIST SP 800-53A Revision ‏5.

35.2.3.2.1 תפקיד: Assessment procedures עצמאיים לבדיקת Controls שנבחרו; הוא אינו Control catalog נוסף ואינו Closing evidence ללא תוצאה.

35.2.3.2.2 יעד: לקשור כל Control ישים ל־Assessment objective, שיטת בדיקה, Assessor, Evidence ותוצאה.

35.2.3.2.3 מקור קנוני: [SP 800-53A](https://csrc.nist.gov/pubs/sp/800/53/a/r5/final). Freshness: רבעוני ובכל Release NIST.

35.2.4 משפחת Secure SDLC; כל מקור הוא Framework record עצמאי.

35.2.4.1 [FR-005] NIST SP 800-218 SSDF ‏1.1.

35.2.4.1.1 תפקיד: Practices למחזור פיתוח מאובטח; הוא משלים Verification טכני ואינו מחליף ASVS.

35.2.4.1.2 יעד: SSDF practice mapping מלא ל־Definition of Done, Owner, Evidence ו־Gap.

35.2.4.1.3 מקור קנוני: [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final). Freshness: חצי־שנתי, Incident root cause ובכל שינוי SDLC.

35.2.4.2 [FR-006] OWASP SAMM ‏2.0.

35.2.4.2.1 תפקיד: מודל Maturity ארגוני; הוא אינו Verification standard ואינו מחליף ASVS.

35.2.4.2.2 יעד: SAMM baseline ויעד שנתי בלי לטעון Level לפני Assessment עצמאי.

35.2.4.2.3 מקור קנוני: [OWASP SAMM](https://owaspsamm.org/model/). Freshness: חצי־שנתי, Incident root cause ובכל שינוי SDLC.

35.2.5 [FR-007] NIST SP 800-61 Revision 3.

35.2.5.1 תפקיד: Incident response כחלק מ־CSF 2.0 לאורך Govern/Identify/Protect/Detect/Respond/Recover, לא רק Runbook לאחר תקיפה.

35.2.5.2 יעד: Playbooks, Authority, Evidence preservation, Communications, Lessons learned ו־Control feedback לכל Severity.

35.2.5.3 מקור קנוני: [NIST SP 800-61r3](https://csrc.nist.gov/pubs/sp/800/61/r3/final). Freshness: לאחר כל Tabletop/Incident ולפחות רבעוני.

35.2.6 משפחת Zero Trust ו־Supply-chain; כל מקור הוא Framework record עצמאי.

35.2.6.1 [FR-008] NIST SP 800-207 Zero Trust Architecture.

35.2.6.1.1 תפקיד: Zero Trust identities, resources ו־policy enforcement boundaries.

35.2.6.1.2 יעד: אין Trust לפי Network location בלבד; כל Request מוכרע לפי Identity, Device/Workload, Resource, Context ו־Policy.

35.2.6.1.3 מקור קנוני: [NIST Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final). Freshness: רבעוני ובכל שינוי Trust boundary.

35.2.6.2 [FR-009] NIST SP 800-161 Revision ‏1.

35.2.6.2.1 תפקיד: Cybersecurity supply-chain risk management לספקים, קוד, Builds ו־Services.

35.2.6.2.2 יעד: לכל Supplier יש criticality, assurance, exit, incident ו־dependency evidence.

35.2.6.2.3 מקור קנוני: [NIST C-SCRM](https://csrc.nist.gov/pubs/sp/800/161/r1/final). Freshness: רבעוני ובכל ספק חדש.

35.2.7 משפחת Privacy ו־AI governance; כל מקור הוא Framework record עצמאי.

35.2.7.1 [FR-010] NIST Privacy Framework ‏1.0.

35.2.7.1.1 תפקיד: Privacy risk governance; Privacy Framework ‏1.1 הוא Draft בזמן בסיס המסמך ולכן אינו Standard קנוני בלי החלטת Delta חדשה.

35.2.7.1.2 יעד: Privacy profile לפי Data class; הוא אינו Legal opinion ואינו Technical verification.

35.2.7.1.3 מקור קנוני: [NIST Privacy Framework 1.0](https://www.nist.gov/privacy-framework/privacy-framework). Freshness: רבעוני ובכל Data-purpose change.

35.2.7.2 [FR-011] NIST AI RMF ‏1.0.

35.2.7.2.1 תפקיד: AI risk governance לפי Govern, Map, Measure ו־Manage; הוא אינו Verification standard.

35.2.7.2.2 יעד: AI profile לכל Model/Capability, עם Risk owner, measurement, treatment ו־residual decision.

35.2.7.2.3 מקור קנוני: [NIST AI RMF 1.0](https://www.nist.gov/itl/ai-risk-management-framework). Freshness: רבעוני ובכל Model, Tool, Dataset או AI-purpose change.

35.2.8 [FR-012] NIST SP 800-63B Revision 4.

35.2.8.1 תפקיד: Authentication assurance, phishing resistance, recovery ו־session guidance; Clerk capability אינו הוכחת עמידה.

35.2.8.2 יעד: Privileged identities עם phishing-resistant option, sensitive-action assurance ו־Recovery שאינו downgrade שקט.

35.2.8.3 מקור קנוני: [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html). Freshness: רבעוני ובכל Identity-policy change.

35.2.9 [FR-013] OWASP ASVS ‏5.0.0.

35.2.9.1 תפקיד: Verification baseline לכל Web/API/Application control עם Requirement IDs מפורשים `v5.0.0-x.y.z`.

35.2.9.2 יעד: Level 2 מלא לכל Scope חי; Level 3 נבחר ל־Tenant, Admin, Secret, Billing, Evidence, Backup/Restore ופעולה הרסנית.

35.2.9.3 מקור קנוני: [OWASP ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/). Freshness: בכל Release ASVS; Matrix delta לפני Release גדול.

35.2.10 [FR-014] OWASP AISVS ‏1.0.

35.2.10.1 תפקיד: 191 דרישות AI ייעודיות בגרסה היציבה שנבדקה; AISVS מניח ASVS באותה רמה ואינו מחליף Upload, Auth, Session, Authorization, Secrets או Logging כלליים.

35.2.10.2 יעד: Level 2 לכל יכולת AI חיה. Agentic/MCP/Autonomous scope מקבל Matrix אך נשאר Disabled ב־Pilot.

35.2.10.3 מקורות קנוניים: [OWASP AISVS 1.0 public documentation](https://owasp.org/www-project-artificial-intelligence-security-verification-standard-aisvs-docs/), שפורסם כ־Final ב־24.06.2026, ‏[Repository release](https://github.com/OWASP/AISVS) ו־[Using AISVS](https://github.com/OWASP/AISVS/blob/main/1.0/en/0x03-Using-AISVS.md). Freshness: חודשי בזמן AI Pilot, בכל AISVS minor/major release ובכל Model/tool change; Gate evidence נקשר ל־191 Requirement IDs בעלי prefix ‏`v1.0-` ול־Digest של Artifact ה־1.0 הנעול.

35.2.11 משפחת OWASP Awareness; כל רשימת Top 10 היא Framework record עצמאי ואינה Verification standard.

35.2.11.1 [FR-015] OWASP Top 10 ‏2025.

35.2.11.1.1 תפקיד: Awareness ו־Threat prompts ל־Web applications; אינו Checklist קבלה ואינו מבטיח כיסוי מלא.

35.2.11.1.2 יעד: כל Category ממופה ל־Threats, ASVS requirements, Tests ו־Evidence או N/A מנומק.

35.2.11.1.3 מקור קנוני: [OWASP Top 10](https://owasp.org/www-project-top-ten/). Freshness: בכל Release רשמי ולפחות רבעוני.

35.2.11.2 [FR-016] OWASP API Security Top 10 ‏2023.

35.2.11.2.1 תפקיד: Awareness ו־Threat prompts ל־API; אינו Verification standard.

35.2.11.2.2 יעד: כל Category ממופה ל־API assets, Threats, ASVS requirements, Tests ו־Evidence או N/A מנומק.

35.2.11.2.3 מקור קנוני: [OWASP API Security](https://owasp.org/www-project-api-security/). Freshness: בכל Release רשמי ולפחות רבעוני.

35.2.11.3 [FR-017] OWASP GenAI LLM Top 10 ‏2026.

35.2.11.3.1 תפקיד: Awareness ו־Threat prompts ל־GenAI/LLM; אינו מחליף AISVS או Eval.

35.2.11.3.2 יעד: כל Category ממופה ל־AI/RAG threats, AISVS requirements, Evals ו־Evidence או N/A מנומק.

35.2.11.3.3 מקור קנוני: [OWASP GenAI LLM Top 10 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/), פורסם ב־03.08.2026. Freshness: חודשי בזמן AI Pilot ובכל Release רשמי.

35.2.11.4 [FR-018] OWASP Agentic Application Top 10 ‏2026.

35.2.11.4.1 תפקיד: Awareness ו־Threat prompts ל־Agentic systems; אינו אישור לפתיחת Agents, MCP או Tools.

35.2.11.4.2 יעד: כל Category ממופה ל־Agent/Tool/Memory threats, AISVS requirements, Evals ו־Disabled evidence או N/A מנומק.

35.2.11.4.3 מקור קנוני: [OWASP Agentic Top 10](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/). Freshness: חודשי בזמן AI Pilot ובכל Release רשמי.

35.2.12 [FR-019] OWASP WSTG ‏4.2.

35.2.12.1 תפקיד: Test-scenario catalog ל־Web/API; `/latest` הוא Development ולכן אינו Evidence קנוני.

35.2.12.2 יעד: מזהים Versioned מסוג `WSTG-v42-*`, Coverage/N/A וממצא נפרד מכל Test.

35.2.12.3 מקור קנוני: [OWASP WSTG v4.2](https://wstg.owasp.org/v4.2/). Freshness: בכל Stable release ובכל שינוי Surface.

35.2.13 [FR-020] CIS Controls ‏8.1.

35.2.13.1 תפקיד: Prioritization של 153 Safeguards בשלוש Implementation Groups.

35.2.13.2 יעד: IG1 מלא לפני Pilot חיצוני; IG2 Applicable לפני GA; IG3 נבחר לפי Threat/Enterprise scope. N/A דורש Reviewer.

35.2.13.3 מקורות קנוניים: [CIS Controls 8.1](https://www.cisecurity.org/controls/v8-1) ו־[Implementation Groups](https://www.cisecurity.org/controls/implementation-groups). Freshness: רבעוני ובכל Release CIS.

35.2.14 [FR-021] CSA Cloud Controls Matrix ‏4.1.

35.2.14.1 תפקיד: 197 Cloud control objectives ב־17 Domains וחלוקת אחריות בין Connect לספק.

35.2.14.2 יעד: Applicability+shared-responsibility matrix לכל Vercel, Railway, AWS, Clerk, OpenAI, Better Stack, SES, PayPlus, Tranzila, Paddle, Stripe, Meta ולכל Conditional provider שיופעל.

35.2.14.3 מקור קנוני: [CSA CCM 4.1](https://cloudsecurityalliance.org/research/cloud-controls-matrix). Freshness: רבעוני ובכל ספק/Region/Plan change.

35.2.15 משפחת Threat intelligence; כל מקור הוא Framework record עצמאי.

35.2.15.1 [FR-022] MITRE ATT&CK ‏19.2.

35.2.15.1.1 תפקיד: מיפוי adversary behavior ו־detection opportunities; אינו רשימת Vulnerabilities של Connect.

35.2.15.1.2 יעד: Techniques ישימות נקשרות ל־Assets, Threats ו־Prevent/Detect/Respond; אין לסמן כל Entry כישים בכוח.

35.2.15.1.3 מקור קנוני: [ATT&CK version history](https://attack.mitre.org/resources/versions/). Freshness: חודשי ובכל Agile release.

35.2.15.2 [FR-023] CAPEC ‏3.9.

35.2.15.2.1 תפקיד: מיפוי attack patterns; אינו רשימת Vulnerabilities או Controls של Connect.

35.2.15.2.2 יעד: Patterns ישימים נקשרים ל־Assets, Threats ו־Prevent/Detect/Respond; אין לסמן כל Entry כישים בכוח.

35.2.15.2.3 מקור קנוני: [CAPEC 3.9](https://capec.mitre.org/data/downloads.html). Freshness: רבעוני ובכל Release.

35.2.16 משפחת Weakness/Vulnerability prioritization; כל מקור הוא Framework record עצמאי.

35.2.16.1 [FR-024] CWE Top 25 ‏2025.

35.2.16.1.1 תפקיד: תיעדוף Root-cause weaknesses; אינו מחליף SAST, SCA או Threat model.

35.2.16.1.2 יעד: כל CWE Top 25 מקבל Prevention, Test ו־Detection mapping.

35.2.16.1.3 מקור קנוני: [CWE Top 25 2025](https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html). Freshness: שנתי ובכל Release חדש.

35.2.16.2 [FR-025] CISA Known Exploited Vulnerabilities Catalog.

35.2.16.2.1 תפקיד: Catalog חי של CVEs שנוצלו בפועל; אינו מחליף SCA או Reachability analysis.

35.2.16.2.2 יעד: כל Dependency/Asset שנוגע ב־KEV מקבל Triage חוסם באותו יום.

35.2.16.2.3 מקור קנוני: [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog). Freshness: יומי ולפני Build/Deploy.

35.2.17 [FR-026] CISA Secure by Design Product Security Bad Practices, ינואר 2025.

35.2.17.1 תפקיד: קו אדום למוצר מאובטח כברירת מחדל, לרבות default credentials, MFA, KEV patching, memory-safety ושקיפות Vulnerability.

35.2.17.2 יעד: Applicability/N/A לכל Bad practice ו־Owner לסגירה; “לא תשתית קריטית” אינו פטור אוטומטי.

35.2.17.3 מקור קנוני: [CISA/FBI Product Security Bad Practices](https://www.cisa.gov/news-events/alerts/2025/01/17/cisa-and-fbi-release-updated-guidance-product-security-bad-practices). Freshness: רבעוני ובכל עדכון CISA.

35.2.18 [FR-027] SLSA ‏1.2.

35.2.18.1 תפקיד: Source Track ו־Build Track נפרדים; אין Claim רמה כוללת בלי Assessment לכל Track ולכל Artifact.

35.2.18.2 יעד: Build Level 2 ראשון; Level 3 רק לאחר Builder/isolation/non-falsifiability assessment עצמאי. Source track מקבל יעד נפרד לאחר GitHub capability probe.

35.2.18.3 מקור קנוני: [SLSA 1.2, Approved](https://slsa.dev/spec/v1.2/). Freshness: בכל Release SLSA ובכל שינוי Build platform.

35.2.19 משפחת SBOM/interchange; כל Specification הוא Framework record עצמאי.

35.2.19.1 [FR-028] CycloneDX ‏1.7.

35.2.19.1.1 תפקיד: פורמט SBOM קנוני ל־Connect.

35.2.19.1.2 יעד: Schema validation, complete runtime inventory, component relationships, tool/build identity ו־Artifact-digest binding.

35.2.19.1.3 מקור קנוני: [CycloneDX 1.7](https://cyclonedx.org/specification/overview/). Freshness: בכל Release specification ובכל החלפת generator.

35.2.19.2 [FR-029] SPDX ‏3.0.1.

35.2.19.2.1 תפקיד: פורמט Consumer/License/Interchange נוסף; אינו SBOM ברירת המחדל של Connect.

35.2.19.2.2 יעד: להפיקו רק לצורך Consumer/License/Interchange מאושר, עם Schema validation ו־binding לאותו Artifact digest.

35.2.19.2.3 מקור קנוני: [SPDX 3.0.1](https://spdx.github.io/spdx-spec/). Freshness: בכל Release specification ובכל החלפת generator.

35.2.20 [FR-030] RFC 9116.

35.2.20.1 תפקיד: פורמט `/.well-known/security.txt`; הוא אינו VDP שלם ואינו מרשה בדיקות אבטחה מעצם קיומו.

35.2.20.2 יעד: HTTPS, UTF-8 text, Contact, Expires, Canonical, Policy, Preferred-Languages, optional signed file, monitored mailbox ו־tamper/expiry detection.

35.2.20.3 מקור קנוני: [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116.html). Freshness: Contact test חודשי, Expiry alert 30/14/7 ימים ובכל Owner change.

35.2.21 משפחת Ransomware/WORM; כל מקור הוא Framework record עצמאי.

35.2.21.1 [FR-031] NIST IR 8374 Revision ‏1.

35.2.21.1.1 תפקיד: Ransomware risk management; Backup רגיל אינו Ransomware-protection claim.

35.2.21.1.2 יעד: Separate authority, least privilege, key recovery, isolated restore, destructive-control drill ו־measured RPO/RTO.

35.2.21.1.3 מקור קנוני: [NIST IR 8374r1](https://csrc.nist.gov/pubs/ir/8374/r1/final). Freshness: בכל Backup architecture change ולפחות רבעוני.

35.2.21.2 [FR-032] AWS S3 Object Lock.

35.2.21.2.1 תפקיד: מקור ספק ל־WORM storage semantics; Versioning בלבד אינו immutable-retention claim.

35.2.21.2.2 יעד: Object Lock mode/retention/legal-hold, separate account, KMS recovery, denied deletion ו־isolated restore נבדקים בפועל.

35.2.21.2.3 מקור קנוני: [AWS S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html). Freshness: בכל שינוי Region/Bucket/retention/key ולפחות רבעוני.

35.2.22 משפחת PostgreSQL ‏16 Security reference; כל מקור הוא Framework record עצמאי.

35.2.22.1 [FR-033] PostgreSQL ‏16 Row Security.

35.2.22.1.1 תפקיד: Engine-specific source ל־RLS enablement, policy semantics ו־bypass; ORM behavior אינו מקור סמכות.

35.2.22.1.2 יעד: PostgreSQL version בפועל מקובע; כל Upgrade מפעיל RLS Delta tests.

35.2.22.1.3 מקור קנוני: [Row Security](https://www.postgresql.org/docs/16/ddl-rowsecurity.html). Freshness: בכל minor/major upgrade ולפני Gate 7.

35.2.22.2 [FR-034] PostgreSQL ‏16 CREATE FUNCTION security.

35.2.22.2.1 תפקיד: Engine-specific source ל־`SECURITY DEFINER`, ‏`search_path`, owner ו־privilege semantics.

35.2.22.2.2 יעד: כל Function privileged מקבלת owner/grant/search-path review ו־negative tests בכל Upgrade.

35.2.22.2.3 מקור קנוני: [CREATE FUNCTION security](https://www.postgresql.org/docs/16/sql-createfunction.html). Freshness: בכל minor/major upgrade ולפני Gate 7.

35.2.22.3 [FR-035] PostgreSQL ‏16 libpq `verify-full`.

35.2.22.3.1 תפקיד: Engine-specific source ל־TLS hostname/certificate verification; connection string ברירת מחדל אינו Evidence.

35.2.22.3.2 יעד: כל Runtime/Migrator/Verifier משתמש ב־`verify-full` או Control שקול מאושר ונבדק נגד CA/hostname שגויים.

35.2.22.3.3 מקור קנוני: [libpq `verify-full`](https://www.postgresql.org/docs/16/libpq-connect.html). Freshness: בכל Driver/TLS/major upgrade ולפני Gates 6.2 ו־7.

35.2.23 [RG-001] Provider, Legal ו־Product registries.

35.2.23.1 Meta/WhatsApp, OpenAI, Clerk, Vercel, Railway, AWS, Better Stack, SES, PayPlus, Tranzila, Paddle, Stripe, GitHub וכל Conditional provider נשמרים כ־Provider contracts נפרדים עם Plan, Region, Account, effectiveAt, checkedAt, expiry ו־live evidence; Documentation לבדה אינה מוכיחה Entitlement.

35.2.23.2 חוק ישראלי, Data transfers, Direct mail, סעיף 30א, Tax ו־Accessibility מקבלים Legal register עם מקור רשמי וחוות דעת מוסמכת; Codex research אינו Legal approval.

35.2.23.3 Cadence ברירת מחדל הוא שבועי בזמן Pilot ולפני Release; Rate/quality משתמש ב־TTL המספרי שב־16.5.8; Law נבדק רבעונית ובכל Change notice; Price/plan לפני רכש ובכל חשבונית חריגה.

35.2.24 [RG-002] Delta process.

35.2.24.1 בכל Refresh נשמר Previous version/digest, New version/digest, Changed controls, affected Assets/Tasks/Tests, Severity, Owner, deadline ו־temporary safe state.

35.2.24.2 שינוי שאינו רלוונטי מקבל N/A מנומק ושני Reviewers כאשר הוא נוגע ל־P0/P1; אין “no impact” אוטומטי.

35.2.24.3 P0/P1 delta משבית את היכולת עד Fix+Retest. P2/P3 יכול לקבל Exception קצרה לפי 1.8.

35.2.24.4 Evidence freshness monitor מתריע לפני Expiry; Expired evidence פותח מחדש את ה־Gate המתאים ואינו משנה Historical record.

35.2.25 [FR-036] NIST SP 800-218A.

35.2.25.1 תפקיד: Community Profile שמרחיב את SSDF ‏1.1 לפיתוח, רכישה ושימוש במודלי Generative AI ו־Dual-use foundation models; הוא אינו מחליף SSDF בסיסי או בדיקת ספק בפועל.

35.2.25.2 יעד: כל AI provider/model/prompt/tool/dataset change ממופה ל־SSDF-A practices, provenance, evaluation, supplier assurance ו־safe decommissioning.

35.2.25.3 מקור קנוני: [NIST SP 800-218A](https://csrc.nist.gov/pubs/sp/800/218/a/final). Freshness: בכל AI supply-chain change ולפחות רבעוני.

35.2.26 [FR-037] NIST AI 100-2 E2025.

35.2.26.1 תפקיד: Taxonomy וטרמינולוגיה ל־Adversarial ML, לרבות Evasion, Poisoning, Privacy ו־Misuse; הוא אינו Test suite או הוכחת Mitigation.

35.2.26.2 יעד: כל איום AI/RAG מקבל Attack lifecycle, actor capability, knowledge, objective, applicable mitigation, limitation ו־negative test.

35.2.26.3 מקור קנוני: [NIST AI 100-2 E2025](https://csrc.nist.gov/pubs/ai/100/2/e2025/final), כולל Errata/Planning notes. Freshness: שנתי, בכל Revision ובכל AI threat-model refresh.

35.2.27 [FR-038] MITRE ATLAS.

35.2.27.1 תפקיד: Knowledge base חי של tactics ו־techniques נגד Predictive, Generative ו־Agentic AI, משלים ATT&CK ואינו רשימת Controls.

35.2.27.2 יעד: Prompt injection, RAG poisoning, model/data supply-chain, credential harvesting, exfiltration, cost harvesting ו־agent-tool abuse ממופים ל־Technique IDs, detections, mitigations ו־red-team cases.

35.2.27.3 מקור קנוני: [MITRE ATLAS](https://atlas.mitre.org/). Freshness: חודשי בזמן AI Pilot, בכל Incident ובכל שינוי Model/Tool/RAG architecture.

35.2.28 [FR-039] LINDDUN PRO.

35.2.28.1 תפקיד: Privacy threat modeling שיטתי על Data-flow interactions לפי Linking, Identifying, Non-repudiation, Detecting, Data disclosure, Unawareness ו־Non-compliance. הוא משלים Legal analysis ואינו מחליף אותו.

35.2.28.2 יעד: כל DFD interaction ב־Connect נבחן לפי Source, Transfer ו־Destination; כל איום פרטיות מקבל Data class, subject, purpose, actor, mitigation, residual risk, owner ו־evidence.

35.2.28.3 מקורות קנוניים: [LINDDUN](https://linddun.org/), ‏[PRO instructions](https://linddun.org/instructions-for-pro/) ו־[Structured threat knowledge](https://linddun.org/structured-threat-knowledge-representations/). Freshness: בכל Data-flow/DPIA change ולפחות רבעוני.

35.3 סכמות הרשם, גרסה וסטטוסים.

35.3.1 גרסת הרשם הפעילה היא `MP-REG-1.1-draft`; לאחר Final QA, שני Reviewers נדרשים וחתימת טל על ה־Digest המדויק, ורק אז היא מקודמת ל־`MP-REG-1.1-approved`. זהו מסלול הגרסה היחיד מחוץ להיסטוריה. כל שינוי לאחר Approval דורש Previous digest, ‏New digest, ‏Actor, ‏Reason, ‏Delta, ‏שני Reviewers כאשר P0/P1 מושפע ו־`effectiveAt` חדש.

35.3.2 סטטוסי Framework, Threat ו־Control המותרים הם `source-verified`, ‏`artifact-pinned`, ‏`mapped`, ‏`implemented`, ‏`verified-live`, ‏`partial`, ‏`blocked-unverified`, ‏`not-applicable-approved` ו־`retired`. אין להסיק `implemented` או `verified-live` מעצם קיום מקור או תוכנית.

35.3.3 כל Framework record כולל במפורש `frameworkId`, ‏`title`, ‏`edition`, ‏`releaseStatus`, ‏`target`, ‏`applicability`, ‏`canonicalPrimarySource`, ‏`artifactDigestSha256`, ‏`checkedAt`, ‏`checkedBy`, ‏`nextReviewAt`, ‏`changeTriggers`, ‏`mappedThreatIds`, ‏`mappedControlIds`, ‏`evidenceLocation` ו־`status`.

35.3.4 כל Threat record כולל במפורש `threatId`, ‏`registryVersion`, ‏`assetIds`, ‏`dataFlowIds`, ‏`trustBoundaryIds`, ‏`capabilityIds`, ‏`threatActor`, ‏`preconditions`, ‏`frameworkTechniqueIds`, ‏`likelihood`, ‏`impact`, ‏`detectability`, ‏`inherentSeverity`, ‏`existingControlIds`, ‏`residualSeverity`, ‏`negativeTestIds`, ‏`detectionIds`, ‏`containment`, ‏`recovery`, ‏`owner`, ‏`reviewAt`, ‏`evidenceLocation` ו־`status`.

35.3.5 כל Control record כולל במפורש `controlId`, ‏`registryVersion`, ‏`controlObjective`, ‏`frameworkRequirementIds`, ‏`targetAssets`, ‏`applicability`, ‏`implementationTaskIds`, ‏`positiveTestIds`, ‏`negativeTestIds`, ‏`failureTestIds`, ‏`concurrencyTestIds`, ‏`runtimeDetection`, ‏`evidenceType`, ‏`evidenceLocation`, ‏`owner`, ‏`reviewer`, ‏`cadence`, ‏`rollbackOrDisable`, ‏`gate` ו־`status`.

35.3.6 רשימת Awareness כגון OWASP Top 10, ‏API Top 10, ‏GenAI Top 10 או Agentic Top 10 מסייעת לגילוי איומים אך אינה Verification standard. היא אינה מחליפה ASVS/AISVS requirement-level mapping, בדיקות שליליות או Evidence חי.

35.3.7 מצב Framework records נכון ל־26.08.2026 הוא `source-verified/digest-pending` לכל מקור רשמי שב־35.2. אין עדיין `artifact-pinned`, משום ש־SHA-256 של ה־Artifact, רישום License כאשר נדרש ו־Crosswalk מלא טרם עברו Final QA.

35.3.8 Framework IDs אינם כוללים את סעיפי התהליך 35.2.23–35.2.24. המיפוי הקנוני הוא: `FR-001`→35.2.1; `FR-002`→35.2.2; `FR-003`→35.2.3.1; `FR-004`→35.2.3.2; `FR-005`→35.2.4.1; `FR-006`→35.2.4.2; `FR-007`→35.2.5; `FR-008`→35.2.6.1; `FR-009`→35.2.6.2; `FR-010`→35.2.7.1; `FR-011`→35.2.7.2; `FR-012`→35.2.8; `FR-013`→35.2.9; `FR-014`→35.2.10; `FR-015`→35.2.11.1; `FR-016`→35.2.11.2; `FR-017`→35.2.11.3; `FR-018`→35.2.11.4; `FR-019`→35.2.12; `FR-020`→35.2.13; `FR-021`→35.2.14; `FR-022`→35.2.15.1; `FR-023`→35.2.15.2; `FR-024`→35.2.16.1; `FR-025`→35.2.16.2; `FR-026`→35.2.17; `FR-027`→35.2.18; `FR-028`→35.2.19.1; `FR-029`→35.2.19.2; `FR-030`→35.2.20; `FR-031`→35.2.21.1; `FR-032`→35.2.21.2; `FR-033`→35.2.22.1; `FR-034`→35.2.22.2; `FR-035`→35.2.22.3; `FR-036`→35.2.25; `FR-037`→35.2.26; `FR-038`→35.2.27; `FR-039`→35.2.28. סעיפים 35.2.23–35.2.24 הם `RG-001` ו־`RG-002`. שינוי סדר אינו משנה ID ודורש Migration של Cross-references.

35.3.9 `FR-010` הוא Privacy governance; `FR-011` הוא AI governance; `FR-013` הוא ASVS verification; `FR-014` הוא AISVS verification; `FR-015`–`FR-018` הם Awareness בלבד; `FR-020`–`FR-021` הם Control catalogs; `FR-022`–`FR-025` ו־`FR-038` הם Threat/weakness intelligence; `FR-027` הוא Supply-chain assurance; `FR-030` הוא Disclosure channel; ו־`FR-031`–`FR-032` הם Backup/Ransomware/WORM guidance. ההפרדה מונעת שימוש בכלי אחד כהוכחה לתחום שאינו מכסה.

35.3.10 Gate 29 נשאר חסום עד שכל `FR-001`–`FR-076` וכן `RG-001`–`RG-002` כוללים רשומה מפורשת ב־A08, Source artifact או Snapshot מאושר, Digest או נימוק Dynamic, ‏checkedAt, ‏expiry, ‏Threat/Control mappings, ‏Applicability/N/A ו־Reviewer sign-off. מיפוי 35.3.8 ל־FR-001–FR-039 הוא החלק הראשון בלבד ואינו ה־Lock המלא.

35.4 רשם סמכויות דינמיות ו־Freshness.

35.4.1 כל Dynamic-source record כולל `sourceId`, ‏`authority`, ‏`account/plan/region scope`, ‏`canonical URLs`, ‏`effectiveAt`, ‏`checkedAt`, ‏`checkedBy`, ‏`response/document digest`, ‏`expiresAt`, ‏`lastRefreshResult`, ‏`changeTriggers`, ‏`affectedDecisions`, ‏`affectedGates`, ‏`safeStateWhenStale` ו־`status`.

35.4.2 `DS-001` Meta WhatsApp.

35.4.2.1 שדות הרשומה: `sourceId=DS-001`; `authority=Meta/WhatsApp official documentation, policy, current terms, dated preview terms and live Business-portfolio/WABA/Phone/Template/runtime exports`; `account/plan/region scope=official public product contract source-verified; Connect asset scope unknown/unavailable עד live probe וגם Meta/Legal role classification`; `canonical URLs=35.4.2.1.1–35.4.2.1.4`; `effectiveAt=current terms apply until legally superseded; four Platform preview contracts declare 2026-09-23; runtime documents have their own updatedAt`; `checkedAt=2026-08-27 לתיעוד בלבד`; `checkedBy=Codex official-source research; human Legal/Meta reviewer unknown/unavailable`; `response/document digest=unknown/unavailable עד detached exact-byte snapshot`; `expiresAt=before Release, before 2026-09-23, immediately on Terms/Policy/API change, and runtime values לפי 16.5.8`; `lastRefreshResult=official current+future Terms, current 2026 platform/rate/error/webhook documents and their stated limits were retrieved; exact preview delta is known at source-text level but digest, legal disposition, account acceptance and live asset entitlement remain unknown/unavailable`; `changeTriggers=Terms, Policy, role/authorization, Client/WABA/Messaging Account ownership, API/version, rate card, geography, data use, portability, error taxonomy, quality, template, phone, WABA, throughput, webhook or asset-state change`; `affectedDecisions=D03,D04,D19,D20,D21,D22,D25,D26,D28`; `affectedGates=3,9,10,11,12.1,12.2.1,12.2.2,12.2.3,12.2.4,12.2.5,12.2.6,13,14.1,14.2,15,16,18.1,18.2,26.0.1,26.0.2,26.1,30`; `safeStateWhenStale=Outbound cap zero; multi-client onboarding, Partner/Solution Provider claim, Marketing Messages API, Meta Inbox, Template, Campaign and AI disabled; inbound Human-only only when Legal, role and asset authority remain valid`; `status=source-verified/digest-pending; live scope blocked-unverified`.

35.4.2.1.1 Current legal subrecord: `subrecordId=DS-001-CURRENT-LEGAL`; `URLs=https://whatsappbusiness.com/policy/, https://www.whatsapp.com/legal/meta-terms-whatsapp-business, https://www.whatsapp.com/legal/business-solution-terms, https://www.whatsapp.com/legal/business-terms-for-service-providers, https://www.whatsapp.com/legal/third-party-agents-terms`; `effectiveAt=Meta Terms modified 2025-10-15; Business Solution Terms modified 2026-03-06; Service Provider Terms modified 2018-06-12; Third Party Agents terms updated 2026-08-25`; `result=Policy/AI/provider duties source-verified; Service Provider applicability requires WhatsApp authorization; Third Party Agents 3P Platform is not Cloud API bot evidence`; `digest=unknown/unavailable`; `status=source-verified/digest-pending`.

35.4.2.1.2 Future legal subrecord: `subrecordId=DS-001-2026-09-23-PREVIEWS`; `URLs=https://www.facebook.com/legal/wa-for-business-terms-preview, https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform-preview, https://www.facebook.com/legal/WhatsApp-Business-Platform-Cloud-API-preview, https://www.facebook.com/legal/marketing-messages-API-for-WhatsApp-preview, https://www.whatsapp.com/legal/WhatsApp-Terms-for-WhatsApp-Business-Platform/preview, https://www.facebook.com/legal/whatsapp_inbox_terms_preview`; `effectiveAt=2026-09-23`; `result=all official preview text retrieved; Meta/Cloud/MM API/WhatsApp Platform apply by product and role; Inbox is N/A while Meta Inbox disabled`; `remaining=detached exact bytes, hashes, legal hierarchy/applicability, customer/account acceptance and signed disposition`; `status=source-verified/digest-and-legal-review-pending`.

35.4.2.1.3 Runtime-limits subrecord: `subrecordId=DS-001-RATE-QUALITY`; `URLs=https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform, https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput, https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits, https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-quality, https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-pacing, https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits, https://developers.facebook.com/docs/graph-api/overview/rate-limiting`; `updatedAt=2026-08-04/2026-06-17/2026-05-21 לפי מסמך`; `result=published ceilings and semantics source-verified: management 200/5000, portfolio tiers 250/2000/10000/100000/unlimited, phone 80/1000/20, pair 1 per 6s, no published pacing/per-user numeric threshold`; `liveEntitlement=unknown/unavailable`; `safeState=cap zero until exact live snapshot`; `status=source-verified/live-blocked-unverified`.

35.4.2.1.4 Runtime-contract subrecord: `subrecordId=DS-001-WEBHOOK-ERROR`; `URLs=https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview, https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint, https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages, https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes`; `updatedAt=2026-06-26/2026-06-17/2026-05-21/2026-06-18`; `result=TLS/mTLS/HMAC, 3MB, batch1000, retry7d/duplicates, capacity/latency, acceptance-vs-delivery, ordering/TTL and Error taxonomy source-verified`; `liveApp/Graph behavior=unknown/unavailable until signed test evidence`; `status=source-verified/live-blocked-unverified`.

35.4.2.1.5 Live asset subrecord: `subrecordId=DS-001-LIVE-CONNECT`; `scope=Business portfolio/WABA/Messaging Account/Phone/App/Graph version/Template/quality/throughput/geography/billing`; `result=unknown/unavailable because no authorized live export was supplied`; `requiredEvidence=redacted asset graph, exact IDs/digests, permissions, throughput field, whatsapp_business_manager_messaging_limit, quality/template snapshots, usage headers, webhook contract observation, error observations and account Terms acceptance`; `safeState=cap zero and single-tenant Test only`; `status=blocked-unverified`.

35.4.2.2 סמכות: המקורות הקנוניים הם תתי־הרשומות 35.4.2.1.1–35.4.2.1.4, [Meta official Postman workspace](https://www.postman.com/meta/whatsapp-business-platform/overview/), ‏[Developer Hub](https://whatsappbusiness.com/developers/developer-hub/), ‏[Business Policy](https://whatsappbusiness.com/policy/) ו־[Legal root](https://www.whatsapp.com/legal/). מקור משני יכול לפתוח Discovery אך אינו משנה Permit, Error policy או Terms disposition.

35.4.2.3 Freshness: Runtime throughput, quality, template/phone/WABA state לפי 16.5.8; Documentation ו־Error taxonomy שבועית ולפני Release; Terms חודשית, עם Delta מידי לפני `effectiveAt` ידוע.

35.4.2.4 Safe state: Outbound cap אפס כאשר Runtime evidence פג; Template/Campaign/AI כבויים כאשר Policy או Terms אינם מעודכנים; Marketing Messages API ו־Meta Inbox כבויים תמיד ב־Base; Human inbound יכול להישאר רק אם Legal, role, webhook security ו־Asset authority עדיין תקפים.

35.4.2.5 Role classification: Connect אינה טוענת להיות Tech Provider, ‏Solution Provider, Partner או Service Provider מורשה עד Meta evidence ו־Legal memo חתום. כאשר הסטטוס חסר, Multi-client onboarding, יצירת WABA עבור לקוח, delegated production access וחיוב Meta בשם לקוח נשארים כבויים.

35.4.2.6 Service-provider applicability: אם Legal+Meta קובעים שהתנאים חלים, כל Client instance חייב להוכיח קבלת Terms, בקשה/הסכמה ל־WABA, Authorized access, support/TLS/API ownership, הפרדת חיובי Meta ודמי Connect, Transfer בתוך 30 ימים ומחיקה לאחר Transfer. כשל, Revocation או בקשת Transfer מפעילים Stop-new-send, Export/transfer workflow, Credential revoke ו־Deletion reconciliation לפי Legal hold והוראות Meta/הלקוח.

35.4.2.7 Product split: ‏Cloud API בלבד הוא Base/Pilot. ‏Marketing Messages API ו־Meta Business Suite Inbox הם Routes נפרדים, `disabled`, ללא Secret/Endpoint/Queue/Schema/Claim פעיל. הפעלתם דורשת Decision amendment ו־Conditional WBS שעובר את מלוא ה־Lifecycle לפני Reachability.

35.4.2.8 Effective-date gate: Release או Pilot שחוצים 23.09.2026 נדחים אם חסרים Preview bytes+digests, old/new diff, signed Legal/Product/Security dispositions, account acceptance, customer-contract impact, updated Data flows, tests ו־kill-switch proof. שינוי בזמן Approval מבטל את ה־Approval וה־Release manifest הישנים.

35.4.3 `DS-002` OpenAI.

35.4.3.1 שדות הרשומה: `sourceId=DS-002`; `authority=OpenAI official Models, Model guidance, Safety best practices, Data controls, Admin API, Evals, Deprecations, contract/DPA and live Organization/Project exports`; `account/plan/region scope=unknown/unavailable עד Organization/Project/ZDR capability probe`; `canonical URLs=https://developers.openai.com/api/docs/models, https://developers.openai.com/api/docs/guides/latest-model, https://developers.openai.com/api/docs/guides/safety-best-practices, https://developers.openai.com/api/docs/guides/your-data, https://developers.openai.com/api/reference/typescript/resources/admin/subresources/organization/subresources/projects, https://developers.openai.com/api/reference/typescript/resources/models/methods/retrieve, https://developers.openai.com/api/docs/guides/evals, https://developers.openai.com/api/docs/deprecations`; `effectiveAt=Evals read-only 2026-10-31 and planned shutdown 2026-11-30; current Admin/data-control behavior checked 2026-08-27; live contract revision unknown/unavailable`; `checkedAt=2026-08-27`; `checkedBy=Codex official OpenAI documentation research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=unknown/unavailable עד snapshot; לאחר מכן שבעה ימים לפני Promotion ושבועי בזמן AI Pilot`; `lastRefreshResult=GPT-5.6 Sol/Terra/Luna and Responses documentation verified; stable privacy-preserving safety_identifier recommendation verified; Evals deprecation verified; /v1/evals retains application state until deleted and is not ZDR-eligible; ZDR/MAM eligibility can be affected by Eyes Off/Safety Retention; Admin endpoints expose project retention, model/tool permissions, rate/spend controls and service-account metadata; model record may expose shutdown_date; live Organization/Project exports, immutable-provider-snapshot status, contract, DPA and ZDR evidence remain unavailable`; `changeTriggers=model, alias, returned model ID, shutdown_date, endpoint, project residency, safety-identifier contract, eval timeline, retention, ZDR/MAM/Eyes-Off/Safety-Retention eligibility, hosted-tool/model permissions, rate/spend controls, Terms, DPA or data-control change`; `affectedDecisions=D02,D25,D26,D28`; `affectedGates=18.1,18.2,24,26.1,30`; `safeStateWhenStale=last approved Connect Model-profile revision only if its provider controls remain fresh and inside signed Scope; otherwise Human-only; no ZDR or provider-immutability claim`; `status=source-verified/digest-pending; live AI blocked-unverified`.

35.4.3.2 סמכות: [Models](https://developers.openai.com/api/docs/models), ‏[Model guidance](https://developers.openai.com/api/docs/guides/latest-model), ‏[Data controls](https://developers.openai.com/api/docs/guides/your-data), ‏[Evals deprecation](https://developers.openai.com/api/docs/guides/evals) ו־[Deprecations](https://developers.openai.com/api/docs/deprecations).

35.4.3.3 Freshness: Model/data-control snapshot בתוך שבעה ימים לפני Promotion; שבועי בזמן AI Pilot; מיד בכל Deprecation, Terms, retention, endpoint או Alias change.

35.4.3.4 Safe state: Alias אינו מקודם אוטומטית; נשארים ב־Connect Model-profile revision האחרון שעבר Eval ובתוך ה־Scope החתום שלו, או עוברים ל־Human-only. Provider ID אינו Claim של immutability ללא Evidence חי. ‏`store:false` אינו ZDR claim ללא Evidence חשבון ו־DPA, ו־Hosted Evals אינו מסלול חדש מותר.

35.4.4 `DS-003` Clerk.

35.4.4.1 שדות הרשומה: `sourceId=DS-003`; `authority=Clerk official documentation, contract/plan and live instance exports`; `account/plan/region scope=unknown/unavailable עד live Clerk instance probe`; `canonical URLs=https://clerk.com/docs/guides/organizations/overview, https://clerk.com/docs/guides/how-clerk-works/overview, https://clerk.com/docs/guides/development/making-requests, https://clerk.com/docs/guides/secure/best-practices/csrf-protection, https://clerk.com/docs/guides/sessions/session-tokens, https://clerk.com/docs/guides/configure/session-tasks, https://clerk.com/docs/reference/backend/verify-webhook`; `effectiveAt=unknown/unavailable`; `checkedAt=2026-08-26 לתיעוד בלבד`; `checkedBy=Codex research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=unknown/unavailable עד snapshot; לאחר מכן 30 ימים לפני Gate 8 ושבעה ימים לפני Release`; `lastRefreshResult=official docs verify same-origin automatic session-cookie transport, short-lived Clerk session token, __session is not HttpOnly, SameSite=Lax and no mutation on navigation; account/plan/organization/MFA/live configuration unknown/unavailable`; `changeTriggers=Organization, session-cookie/token, handshake, MFA, recovery, fva, CSRF, webhook, plan, region or contract change`; `affectedDecisions=D01,D15,D17,D19`; `affectedGates=8,10,20,26.0.1,26.0.2,26.1,30`; `safeStateWhenStale=Invitations, privileged roles and System Admin mutations disabled`; `status=source-verified/digest-pending; live identity scope blocked-unverified`.

35.4.4.2 סמכות: [Organizations](https://clerk.com/docs/guides/organizations/overview), ‏[How Clerk works](https://clerk.com/docs/guides/how-clerk-works/overview), ‏[Same-origin authenticated requests](https://clerk.com/docs/guides/development/making-requests), ‏[CSRF protection](https://clerk.com/docs/guides/secure/best-practices/csrf-protection), ‏[Session-token claims](https://clerk.com/docs/guides/sessions/session-tokens), ‏[Session tasks](https://clerk.com/docs/guides/configure/session-tasks) ו־[Webhook verification](https://clerk.com/docs/reference/backend/verify-webhook).

35.4.4.3 Freshness: Capability/plan/account snapshot בתוך 30 יום לפני Gate 8, ושבעה ימים לפני Release; מיד בכל שינוי Session, MFA, Organization או Webhook contract.

35.4.4.4 Safe state: Invitations, privileged roles ו־System Admin mutations כבויים כאשר MFA, `fva`, recovery, webhook signing או Organization isolation אינם מוכחים בחשבון החי. אין לטעון ש־Clerk `__session` הוא HttpOnly; Mutation נשארת same-origin דרך BFF, אסורה ב־GET/navigation, ודורשת את בקרות Clerk+Connect session/CSRF שננעלו ב־D31.

35.4.4.5 רענון 27.08.2026: תיעוד Clerk המעודכן מאמת `__session` קצר־חיים, JavaScript-readable, ‏SameSite Lax ונשלח אוטומטית ל־same-origin Backend. זה אינו מאשר Browser Bearer, direct Railway או Mutation בניווט. ‏Connect opaque HttpOnly session והשימושים הספציפיים ב־CSPRNG נשארים חסומים ל־X24; עד אז Mutation רגישה אינה Production-ready.

35.4.5 `DS-004` Vercel.

35.4.5.1 שדות הרשומה: `sourceId=DS-004`; `authority=Vercel official documentation, contract/plan and live project/team/domain exports`; `account/plan/region scope=unknown/unavailable עד live Vercel team/project probe`; `canonical URLs=https://vercel.com/docs/deployment-protection, https://vercel.com/changelog/trusted-sources-for-deployment-protection, https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation, https://vercel.com/docs/oidc/reference, https://vercel.com/docs/oidc/api, https://vercel.com/docs/vercel-firewall/firewall-concepts`; `effectiveAt=unknown/unavailable`; `checkedAt=2026-08-26 לתיעוד בלבד`; `checkedBy=Codex research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=unknown/unavailable עד snapshot; לאחר מכן 30 ימים לפני Gate 6.1 ושבעה ימים לפני Deploy/Cutover`; `lastRefreshResult=official docs verify OIDC federation to an external API with issuer/JWKS plus issuer,audience,subject validation and state availability on all plans; live team/project/domain/protection entitlement and exact claim values unknown/unavailable`; `changeTriggers=plan, entitlement, domain, deployment-protection, OIDC issuer/JWKS/claims, firewall, bypass or contract change`; `affectedDecisions=D16,D18,D27,D28`; `affectedGates=2,6.1,6.2,26.0.1,26.0.2,26.1,30`; `safeStateWhenStale=Preview/generated production URLs blocked and Railway business ingress closed`; `status=source-verified/digest-pending; live deployment scope blocked-unverified`.

35.4.5.2 סמכות: [Deployment Protection](https://vercel.com/docs/deployment-protection), ‏[Trusted Sources](https://vercel.com/changelog/trusted-sources-for-deployment-protection), ‏[Protection bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation), ‏[OIDC reference](https://vercel.com/docs/oidc/reference), ‏[External API OIDC validation](https://vercel.com/docs/oidc/api) ו־[Firewall](https://vercel.com/docs/vercel-firewall/firewall-concepts).

35.4.5.3 Freshness: Entitlement/domain/protection snapshot בתוך 30 יום לפני Gate 6.1 ושבעה ימים לפני Deploy/Cutover. Trusted Sources OIDC הוא הנתיב המועדף כאשר Entitlement חי מוכח; Secret bypass ארוך־חיים הוא חריג מצומצם ומתועד בלבד.

35.4.5.4 Safe state: Preview ו־Generated production URLs חסומים; אין Shareable link, Query bypass, Cookie bypass או Exception לא רשום. Railway business ingress נסגר כאשר Issuer/Audience/Subject/Environment אינם תואמים.

35.4.5.5 רענון 27.08.2026: Automation bypass זמין לפי התיעוד בכל Plans אך הוא Project-wide ועוקף Authentication/Trusted IP, ‏System firewall mitigations ו־Bot challenges מסוימים; Query ו־Cookie modes קיימים אך אסורים ב־Connect. ‏Standard Protection אינו מגן על Production domain, ו־All Deployments/Exceptions תלויים Entitlement. ‏Trusted Sources OIDC ל־Deployment Protection ו־Vercel OIDC ל־Railway הם Credentials/Headers/Verifiers נפרדים; ערבוב ביניהם הוא Negative test חוסם.

35.4.6 `DS-005` Railway.

35.4.6.1 שדות הרשומה: `sourceId=DS-005`; `authority=Railway, Redis and BullMQ official documentation plus contract/plan and live project/environment/service/volume/config exports`; `account/plan/region scope=unknown/unavailable עד live Railway project probe`; `canonical URLs=https://docs.railway.com/networking/private-networking, https://docs.railway.com/networking/private-networking/how-it-works, https://docs.railway.com/deployments/regions, https://docs.railway.com/databases/postgresql, https://docs.railway.com/databases/redis, https://docs.railway.com/databases, https://docs.railway.com/volumes/backups, https://docs.railway.com/volumes/point-in-time-recovery, https://docs.bullmq.io/guide/going-to-production, https://docs.bullmq.io/guide/connections, https://docs.bullmq.io/guide/workers/graceful-shutdown, https://docs.bullmq.io/guide/workers/stalled-jobs, https://docs.bullmq.io/guide/jobs/deduplication, https://docs.bullmq.io/guide/queues/auto-removal-of-jobs, https://redis.io/docs/latest/operate/oss_and_stack/management/security/, https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/, https://github.com/redis/redis/security/advisories`; `effectiveAt=unknown/unavailable`; `checkedAt=2026-08-27 לתיעוד בלבד`; `checkedBy=Codex research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=unknown/unavailable עד snapshot; לאחר מכן 30 ימים לפני Gates 6.1/6.2/11/23.1 ושבעה ימים לפני Deploy/Cutover; advisory and image check within seven days of every Redis deploy`; `lastRefreshResult=official docs verify private-by-default unmanaged Redis template, environment-isolated WireGuard network, optional TCP public proxy, volume backup caveats, Redis HA capability, BullMQ at-least-once/noeviction/persistence/reconnect requirements and current Redis advisories; live plan, image digest, ACL, AOF, HA, backup/restore and cost evidence unknown/unavailable`; `changeTriggers=plan, region, network, public TCP proxy, PostgreSQL, Redis/BullMQ/client version or digest, advisory, ACL/auth, AOF/RDB, maxmemory/noeviction, HA/Sentinel, volume, backup, PITR, price or contract change`; `affectedDecisions=D08,D12,D13,D16,D27,D28`; `affectedGates=6.1,6.2,7,11,15,23.1,23.2,26.0.1,26.0.2,26.1,30`; `safeStateWhenStale=Redis public access absent; Producers/Workers and queue-backed side effects disabled; no Production/RPO/RTO claim; rebuild only from authoritative PostgreSQL ledger`; `status=source-verified/digest-pending; live infrastructure and queue contract scope blocked-unverified`.

35.4.6.2 סמכות: [Railway private networking](https://docs.railway.com/networking/private-networking), ‏[Railway Redis](https://docs.railway.com/databases/redis), ‏[Railway databases](https://docs.railway.com/databases), ‏[Railway volume backups](https://docs.railway.com/volumes/backups), ‏[Railway PITR](https://docs.railway.com/volumes/point-in-time-recovery), ‏[BullMQ production](https://docs.bullmq.io/guide/going-to-production), ‏[BullMQ connections](https://docs.bullmq.io/guide/connections), ‏[BullMQ deduplication](https://docs.bullmq.io/guide/jobs/deduplication), ‏[Redis security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/), ‏[Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) ו־[Redis advisories](https://github.com/redis/redis/security/advisories).

35.4.6.3 Freshness: Plan/region/topology/backup snapshot בתוך 30 יום לפני Gate 6.1/6.2/11/23.1 ושבעה ימים לפני Deploy/Cutover; Redis/BullMQ/client/image advisories ו־digest בתוך שבעה ימים מכל Deploy; ACL/AOF/noeviction/HA/volume config בכל Deploy; PITR/AOF/replication health רציף ובכל Restore/failover drill.

35.4.6.4 מחקר 26.08.2026: התיעוד מתאר Volume backup שנמחק עם Volume, Restore באותה Environment, ו־PITR של בערך ארבעה שבועות עם אפשרות לאובדן קצה החלון כאשר WAL queue מתמלאת. לכן Railway backup אינו 90-day או ransomware claim ואינו מחליף Logical offsite WORM.

35.4.6.5 Safe state: אין Production claim ללא TLS, private service identity, Backup health ו־Restore proof; אובדן PITR health מוריד RPO claim ומפעיל Incident, Logical backup ו־No-Go ל־Cutover.

35.4.6.6 רענון 27.08.2026: Volume backup יומי נשמר שישה ימים, שבועי חודש וחודשי שלושה חודשים; Wipe מוחק אותם, Restore מוגבל לאותו Project+Environment ועלול להסיר Backups חדשים יותר, ו־Manual backup כפוף למגבלת 50% Volume המתועדת. ‏PITR מתחיל רק לאחר Base backup ראשון, יוצר Sibling service, אינו מפעיל PITR אוטומטית על ה־Fork, ושומר בקירוב ארבעה Full cycles. ‏WAL archiving אסינכרוני; בעת כשל Storage ממושך Queue של 5 GiB עשוי להתמלא ו־WAL להישמט כדי להשאיר את DB זמין. לפיכך Service health אינו PITR health, וכל Capability נשאר `source-verified-not-live-entitlement` עד Export ו־Restore drill.

35.4.6.7 רענון Redis/BullMQ ‏27.08.2026: Railway Redis פרטי כברירת מחדל אך Public Access יוצר TCP Proxy ו־`REDIS_PUBLIC_URL`; ה־Template הוא Unmanaged, ותיעוד Railway מציג Redis HA עם Sentinel/HAProxy כיכולת בלבד. ‏BullMQ דורשת `noeviction`, ממליצה AOF, מפרידה Producer fail-fast מ־Worker reconnect ומזהירה Job payload נשמר Cleartext. ‏Connect אוסרת Public Redis ו־PII ב־Job ומחייבת PostgreSQL ledger.

35.4.6.8 Semantic safety: BullMQ מספקת at-least-once; Stall, Crash או Lock loss עלולים לבצע Job שוב. Job ID/Dedup מגינים רק כל עוד Keys קיימים, ו־Auto-removal/Manual delete מאפשרים reuse. לכן Claim של exactly-once transport אסור; Gate מודד business idempotency ו־receipt reconciliation סביב DB transaction, ‏CAS/fence ו־unknown-state rule.

35.4.6.9 Durability safety: יעד Pilot הוא AOF every-second+RDB/Volume backup אם live capability ו־benchmark עוברים, עם `noeviction`; אובדן בקירוב שנייה נשאר אפשרי. כל Queue נבנית מחדש מן ה־Outbox/Operation ledger. Production דורש HA failover/failback drill או ADR חלופי; Backup/Restore לבדו אינו HA, Cross-environment DR או Ransomware protection.

35.4.6.10 Security safety: Release+image digest מוצמדים לאחר Advisory review; Redis 8.2.6 הוא snapshot מתועד של תיקוני RCE מ־2026 ולא Target נצחי. Named ACL/command allowlist נגזרים מ־BullMQ conformance trace; Runtime dangerous/admin commands נדחים. אם Capability זו אינה מוכחת, Producers/Workers נשארים Disabled ו־Gate 11/30 חסומים.

35.4.7 משפחת AWS; GuardDuty, S3 ו־KMS הם Dynamic-source records עצמאיים.

35.4.7.1 `DS-006` AWS GuardDuty Malware Protection for S3.

35.4.7.1.1 שדות הרשומה: `sourceId=DS-006`; `authority=AWS GuardDuty official documentation and live account/region/protection-plan/EventBridge exports`; `account/plan/region scope=account unknown/unavailable; target region il-central-1; regional service availability documentation-verified; live account/quota unknown/unavailable`; `canonical URLs=https://aws.amazon.com/about-aws/whats-new/2023/08/amazon-guardduty-available-israel-tel-aviv-region/, https://aws.amazon.com/about-aws/whats-new/2024/06/detect-malware-object-uploads-amazon-s3-guardduty/, https://docs.aws.amazon.com/general/latest/gr/guardduty.html, https://docs.aws.amazon.com/guardduty/latest/ug/doc-history.html, https://docs.aws.amazon.com/guardduty/latest/ug/monitoring-malware-protection-s3-scans-gdu.html, https://docs.aws.amazon.com/guardduty/latest/ug/monitor-with-eventbridge-s3-malware-protection.html`; `effectiveAt=2023-08-25 לזמינות GuardDuty ב־Israel Tel Aviv ו־2024-06-12 לזמינות Malware Protection for S3 בכל Commercial Region שבו GuardDuty זמין; live plan/account revision unknown/unavailable`; `checkedAt=2026-08-26 לתיעוד בלבד`; `checkedBy=Codex research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=unknown/unavailable עד snapshot; לאחר מכן 30 ימים לפני Gate 6.3/18.2 ושבעה ימים לפני Upload enablement`; `lastRefreshResult=official sources verify GuardDuty endpoint and Malware Protection for S3 regional availability in il-central-1; live account/protection-plan/quota/cost/event proof unknown/unavailable`; `changeTriggers=region, quota, status enum, event schema, protection plan, price or IAM change`; `affectedDecisions=D05,D06,D07,D14,D28`; `affectedGates=6.3,14.2,18.2,24,26.1,30`; `safeStateWhenStale=all objects remain quarantined and Upload/Knowledge/Media disabled`; `status=source-verified/digest-pending; live scanner blocked-unverified`.

35.4.7.1.2 מחקר שעודכן 27.08.2026: AWS מתעדת כי GuardDuty זמין ב־Israel Tel Aviv מ־25.08.2023, וכי Malware Protection for S3 זמין בכל Commercial Region שבו GuardDuty זמין מ־12.06.2024. ה־General Reference מפרסם endpoint עבור `il-central-1`. המסמכים העדכניים מאמתים Scan נפרד לכל Version, ‏At-least-once Event delivery, סדר Scan שאינו מובטח, SSE-KMS/CMK ו־Object Lock support, ו־File-based detection שאינו Behavioral analysis. זו הוכחת Documentation בלבד; Account, Bucket, Protection plan, IAM, KMS, quota, cost ו־Event schema עדיין דורשים Live capability probe.

35.4.7.1.3 Freshness/Safe state: Refresh בתוך 30 יום לפני Gate 6.3/18.2 ושבעה ימים לפני Upload; Result שאינו terminal `COMPLETED` ו־`NO_THREATS_FOUND` עבור אותו Account, Bucket, Key, VersionId ו־Checksum משאיר את ה־Object ב־Quarantine.

35.4.7.1.4 Semantics: Event, Tag ו־Finding הם Signals נפרדים; Duplicate/out-of-order/old-version result, Protection-plan Warning/Error, Tagging failure או Reconciliation gap אינם Clean authority. `NO_THREATS_FOUND` סוגר רק את Malware verdict ואינו סוגר Type/container/parser/active-content/egress/RAG-poisoning Gates.

35.4.7.2 `DS-007` AWS S3.

35.4.7.2.1 שדות הרשומה: `sourceId=DS-007`; `authority=AWS S3 official documentation and live bucket/versioning/Object-Lock/inventory exports`; `account/plan/region scope=account and bucket unknown/unavailable; target region il-central-1`; `canonical URLs=https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html, https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html, https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html`; `effectiveAt=unknown/unavailable`; `checkedAt=2026-08-26 לתיעוד בלבד`; `checkedBy=Codex research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=unknown/unavailable עד snapshot; לאחר מכן 30 ימים לפני Gates 6.3/18.2/23.1 ושבעה ימים לפני Upload/Cutover`; `lastRefreshResult=documentation source verified; live bucket/versioning/Object Lock/inventory evidence unknown/unavailable`; `changeTriggers=region, bucket policy, versioning, Object Lock, lifecycle, inventory, replication, quota or price change`; `affectedDecisions=D05,D06,D08,D14,D28`; `affectedGates=6.3,14.2,18.2,23.1,23.2,26.0.1,26.0.2,26.1,30`; `safeStateWhenStale=uploads disabled, objects quarantined and backup/ransomware claims disabled`; `status=source-verified/digest-pending; live object-storage scope blocked-unverified`.

35.4.7.2.2 Object-Lock semantics refreshed 27.08.2026: protection binds an Object version; simple Delete may return 200 and create a Delete marker; Governance can be bypassed only with the dedicated permission plus explicit request and the console may add the bypass header; Compliance retention cannot be shortened or deleted even by Root during the term. Live mode, retention, VersionId inventory, bypass denial, Legal hold, KMS recovery and isolated restore remain `unknown/unavailable`; no Ransomware/WORM claim is allowed before the exact drill.

35.4.7.3 `DS-008` AWS KMS.

35.4.7.3.1 שדות הרשומה: `sourceId=DS-008`; `authority=AWS KMS official documentation and live key-policy/grant/rotation/recovery exports`; `account/plan/region scope=account and key IDs unknown/unavailable; target region il-central-1`; `canonical URLs=https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-kms-best-practices/introduction.html, https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html`; `effectiveAt=unknown/unavailable`; `checkedAt=2026-08-26 לתיעוד בלבד`; `checkedBy=Codex research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=unknown/unavailable עד snapshot; לאחר מכן 30 ימים לפני Gates 6.3/18.2/23.1 ושבעה ימים לפני Upload/Cutover`; `lastRefreshResult=documentation source verified; live key-policy/grant/rotation/recovery evidence unknown/unavailable`; `changeTriggers=key policy, grant, region, rotation, deletion wait, recovery owner, account or IAM change`; `affectedDecisions=D05,D08,D14,D15,D28`; `affectedGates=6.3,18.2,23.1,23.2,26.0.1,26.0.2,26.1,30`; `safeStateWhenStale=all dependent uploads/backups disabled; no decrypt, retention or ransomware claim`; `status=source-verified/digest-pending; live key scope blocked-unverified`.

35.4.8 משפחת Runtime supply chain; Next.js וה־resolved dependency/advisory graph הם Dynamic-source records עצמאיים.

35.4.8.1 `DS-009` Next.js.

35.4.8.1.1 שדות הרשומה: `sourceId=DS-009`; `authority=Next.js official security release and GitHub Security Advisories`; `account/plan/region scope=repository resolved version 16.3.0 last observed; current clean-checkout snapshot unknown/unavailable`; `canonical URLs=https://nextjs.org/blog/august-2026-security-release, https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36, https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4`; `effectiveAt=2026-08-25 publication; patched line 16.3.3/15.5.24`; `checkedAt=2026-08-26`; `checkedBy=Codex research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=before every Build/Release and at most seven days`; `lastRefreshResult=official sources verify two Critical advisories: unauthenticated Windows-filesystem RCE and AVIF Image Optimization RCE; both patch the 16.3 line at 16.3.3; clean-checkout resolved version/reachability evidence pending`; `changeTriggers=security advisory, release, package resolution, router, OS/filesystem, image-format or sharp/libheif change`; `affectedDecisions=D18,D27`; `affectedGates=2,24,25,26.0.1,26.0.2,26.1,29,30`; `safeStateWhenStale=Build, Preview, Pilot, Deployment and vulnerable rollback blocked`; `status=source-verified/digest-pending; remediation evidence pending`.

35.4.8.1.2 רענון Read-only ב־27.08.2026 מאמת שה־GitHub advisories עדיין מסווגים Critical: ‏GHSA-p293-qw3h-jr36 משפיע על Next `>=16.0 <16.3.3` בשרת Windows ללא Cache Components, ו־GHSA-2xp9-vwfh-vxw4 משפיע על Next `<16.3.3` כאשר AVIF עובר Image Optimization. ‏`package.json` ב־Worktree הנוכחי מצהיר `next=16.3.0`; זו אינדיקציית Source מסוכנת, לא Clean-checkout resolved-graph evidence. לפי Freeze המשתמש אין לבצע Upgrade כעת; Dev/Preview/Build/Deploy/rollback אל גרסה מושפעת נשארים חסומים עד משימות 35.6.2.19–35.6.2.31, ביקורת בלתי תלויה והוכחת גרסה מתוקנת.

35.4.8.2 `DS-010` Runtime resolved dependency graph, GitHub Advisory Database, CISA KEV and package registry metadata.

35.4.8.2.1 שדות הרשומה: `sourceId=DS-010`; `authority=resolved lockfile/SBOM plus GitHub Advisory Database, CISA KEV and official package-registry metadata`; `account/plan/region scope=current clean-checkout artifact and registry mirror unknown/unavailable`; `canonical URLs=https://github.com/advisories, https://www.cisa.gov/known-exploited-vulnerabilities-catalog, https://registry.npmjs.org/`; `effectiveAt=per advisory/KEV/package record; current set unknown/unavailable until snapshot`; `checkedAt=2026-08-26 for planning sources only`; `checkedBy=Codex research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=daily for Critical/KEV, weekly for all runtime dependencies, and before every Build/Release`; `lastRefreshResult=source authorities identified; final resolved graph/SBOM/advisory snapshot unknown/unavailable`; `changeTriggers=lockfile, package, transitive graph, advisory, KEV, registry metadata or build-platform change`; `affectedDecisions=D18,D27`; `affectedGates=2,24,25,26.0.1,26.0.2,26.1,29,30`; `safeStateWhenStale=Build and Promotion blocked; rollback only to artifact with non-stale dependency evidence`; `status=blocked-unverified`.

35.4.8.3 Safe state משותף: Exploitable Critical, KEV reachability שאינו נסגר או גרסת Next.js מתחת ל־16.3.3 חוסמים Build, Preview, Pilot ו־Deployment. Rollback מותר רק ל־Artifact שכבר מכיל Patch מאומת.

35.4.9 משפחת סמכויות רשמיות בישראל; פרטיות, העברות, תקשורת שיווקית, נגישות ומס הם Dynamic-source records עצמאיים.

35.4.9.1 גבול סמכות: הסעיפים הבאים הם Research תכנוני המבוסס על מקורות רשמיים, לא חוות דעת משפטית. רק עורך דין ישראלי מוסמך ורואה חשבון או יועץ מס מוסמך רשאים לאשר Applicability, נוסח, סיווג מס, אחריות Controller/Processor, בסיס עיבוד או Claim לציבור. כל מסקנה שלא אושרה נשארת `blocked-legal-review`.

35.4.9.2 מקורות פרטיות ראשיים: [חוק הגנת הפרטיות במאגר החקיקה הלאומי](https://main.knesset.gov.il/Activity/Legislation/Laws/pages/lawprimary.aspx?lawitemid=2000234), ‏[שאלות ותשובות לתיקון 13](https://www.gov.il/he/pages/tikun13_qa?chapterIndex=6), ‏[תקנות הגנת הפרטיות (אבטחת מידע), התשע״ז–2017](https://www.gov.il/BlobFolder/generalpage/1files/he/IT2017.pdf), ‏[המדריך המלא לתקנות](https://www.gov.il/he/pages/data_security_guide?chapterIndex=20), ‏[כלי DPIA של הרשות](https://mojforms.justice.gov.il/mojaemprivacyprotectionauthority/dpiaform.html), ‏[חובת הודעה לרשות על מאגר](https://www.gov.il/he/service/notice-obligation) ו־[מדיניות דיווח אירוע אבטחה חמור](https://www.gov.il/BlobFolder/policy/reporting_policy/ar/%D7%9E%D7%93%D7%99%D7%A0%D7%99%D7%95%D7%AA%20%D7%94%D7%A8%D7%A9%D7%95%D7%AA%20%D7%9C%D7%94%D7%92%D7%A0%D7%AA%20%D7%94%D7%A4%D7%A8%D7%98%D7%99%D7%95%D7%AA%20-%20%D7%A7%D7%91%D7%9C%D7%AA%20%D7%93%D7%99%D7%95%D7%95%D7%97%20%D7%A2%D7%9C%20%D7%90%D7%A8%D7%95%D7%A2%20%D7%90%D7%91%D7%98%D7%97%D7%94%20%D7%97%D7%9E%D7%95%D7%A8.pdf).

35.4.9.3 מקורות העברה בינלאומית: [כלי DPIA והנחיות תקנות העברה לחו״ל](https://mojforms.justice.gov.il/mojaemprivacyprotectionauthority/dpiaform.html), ‏[גילוי דעת רשמי בעניין תקנה 2(4)](https://www.gov.il/en/pages/article-2-4) ו־[שאלות ותשובות למידע שהועבר מהאזור הכלכלי האירופי](https://www.gov.il/he/pages/europe_transfer?chapterIndex=8). Contract, DPA או Region של ספק אינם לבדם הוכחת היתר להעברה.

35.4.9.4 מקורות תקשורת שיווקית: [נוסח תיקון 40 לסעיף 30א](https://fs.knesset.gov.il/17/law/17_lsr_299991.pdf), ‏[תיקון 66 לעניין סיום עסקה מתמשכת](https://main.knesset.gov.il/apps/legislation/main/bills/563438), ‏[הנחיית הרשות 2/2017 המעודכנת לאחר תיקון 13](https://www.gov.il/BlobFolder/legalinfo/direct_mail_2/he/DirectMail_Tikon13.pdf), ‏[שירות רישום מאגרי מידע לאחר תיקון 13](https://www.gov.il/he/service/registration_in_the_database) והוראות סימן הדיוור הישיר בחוק הגנת הפרטיות. נדרש אישור משפטי מפורש אם הודעת WhatsApp מסוימת היא `דבר פרסומת`, `הודעת מסר קצר`, דיוור ישיר, שירותי דיוור ישיר, הודעה שירותית או שילוב ביניהם; Classification לפי שם Template של Meta אינו סיווג משפטי.

35.4.9.5 מקורות נגישות ומס: [נציבות שוויון זכויות — נגישות אתרי אינטרנט](https://www.gov.il/he/pages/website_accessibility?chapterIndex=3), ‏[רשות המסים — מרשם תוכנות לניהול מערכת חשבונות ממוחשבת](https://www.gov.il/he/service/itc-software-registry-for-computerized-accounting-systems) ו־[הוראת ביצוע 01/2025 — חשבוניות ישראל](https://www.gov.il/BlobFolder/policy/inst-071225-1/he/vat_inst-071225-1.pdf). ההוראה שנבדקה קובעת שמ־01.06.2026 סף 2026 למספר הקצאה הוא מעל 5,000 ש״ח ללא מע״מ, בכפוף לכל יתר התנאים; יש לאמת מחדש במועד ההפעלה ולא לקודד את הסף כקבוע.

35.4.9.6 מסקנת Applicability ראשונית: Connect מעבד לפחות פרטי קשר, שיחות, מזהי WhatsApp, הרשאות, נתוני שימוש ו־Audit הקשורים לאדם מזוהה או ניתן לזיהוי; לכן הנחת `אין מידע אישי` אינה קבילה. הסיווג המדויק של כל Tenant ושל Connect כבעל שליטה, מחזיק, ספק שירות, מעבד או מספר תפקידים במקביל תלוי ב־Contract, Purpose ו־Data flow ומחייב מטריצת אחריות משפטית.

35.4.9.7 רמת אבטחת המאגר: אין להניח רמה בסיסית. תקנות אבטחת המידע כוללות מאגר שמטרתו העיקרית איסוף מידע למסירה לאחר כדרך עיסוק, לרבות שירותי דיוור ישיר, ברמת הביניים בכפוף לסיווג המלא; מידע רגיש, היקף, מספר בעלי הרשאה וקטגוריות נוספות עשויים לשנות את הרמה. לפני Pilot נדרש Classification חתום לכל מאגר, Environment ו־Tenant model.

35.4.9.8 רישום והודעה: תיקון 13 מבדיל בין חובת רישום לבין חובת הודעה. מאגר הכולל מידע בעל רגישות מיוחדת על יותר מ־100,000 בני אדם עשוי לחייב הודעה והעתק מסמך הגדרות מאגר; מאגר המשמש שירותי דיוור ישיר עשוי לחייב רישום ומטרת רישום מתאימה. עצם ההגשה אינה אישור עמידה. Gate 21.1 דורש Legal decision נפרד לכל חובה, Deadline ו־Receipt רשמי אם חלה.

35.4.9.9 שקיפות וזכויות: Intake notice חייב לכסות לפחות אם מסירת המידע חובה או רצונית ותוצאת סירוב, זהות ודרכי קשר של בעל השליטה, מטרות, מקבלי המידע ומטרות המסירה, וזכויות עיון ותיקון. בנוסף נדרש Workflow מאומת לעיון, תיקון, מחיקה כאשר חלה, התנגדות לדיוור, Export, אימות זהות, חריגים, Appeal, SLA ו־Audit שאינו חושף מידע נוסף.

35.4.9.10 Purpose limitation וצמצום: כל Data field מקבל Purpose, Legal basis או Authority, מקור, Recipients, Retention, Access roles ו־Deletion trigger. בדיקה שנתית של מידע עודף היא מינימום רגולטורי רלוונטי; Connect מוסיף Review בכל שינוי Flow/AI/Provider ובכל Quarter בזמן Pilot. מידע ללא Purpose פעיל נכנס ל־Quarantine תכנוני ואינו זורם ל־AI, Analytics או Campaign.

35.4.9.11 ספקים ומיקור חוץ: לכל Meta, OpenAI, Clerk, Vercel, Railway, AWS, Better Stack, Billing, Email ו־Support vendor נדרשים Risk assessment, DPA/contract, Purpose and instruction limits, Subprocessor/Region list, Security duties, Incident notice, deletion/return, audit rights, exit plan ו־ongoing supervision לפי Applicability של תקנה 15. Supplier documentation ללא Contract חתום אינה Closing evidence.

35.4.9.12 העברה מחוץ לישראל: לכל Transfer נרשמים Exporter, Importer, Countries/Regions, Data classes, Purpose, Legal route לפי תקנות ההעברה, התחייבות כתובה לפי תקנה 3, Onward transfer, Subprocessors, Government-access risk, encryption/key control ו־exit/deletion proof. אם מקור המידע הוא ה־EEA, נבדקות גם חובות מחיקה, צמצום מידע שאינו נחוץ, דיוק ויידוע החלות על המאגר הרלוונטי. Route לא מאושר משבית את אותו Provider/Data flow.

35.4.9.13 דיוור ישיר וסעיף 30א: לכל Recipient נדרש Consent או Exception משפטי מאושר, מקור ומועד, נוסח Notice שהיה בתוקף, מפרסם/לקוח אחראי, Purpose, Product similarity כאשר נטען חריג לקוח קיים, Suppression ו־revocation מיידי. החוק הרשמי מתאר הסכמה מפורשת מראש והזדמנות סירוב בחריגים מוגדרים; לכן Meta opt-in או Template approval אינם מספיקים לבדם. רשומת Opt-out גוברת על Campaign, Bot, Retry, Import ו־Tenant instruction.

35.4.9.13.1 אם Legal מסווג את Connect או Tenant כמי שמחזיק או מנהל מאגר לשירותי דיוור ישיר, ה־Data model וה־Audit חייבים לשמר גם את מקור אוסף הנתונים ומועד קבלתו וכן למי נמסר האוסף, בהתאם להנחיית הרשות המעודכנת. כל פנייה שקיבלה סיווג `דיוור ישיר` מקבלת Content contract נפרד לפרטי החובה הברורים והבולטים בכל פנייה, Opt-out והוכחת מסירה; הנוסח המדויק נשאר חסום עד Legal approval. אין להסיק שמאגר אינו חייב ברישום רק משום שהוא קטן או משום ש־Connect הוא SaaS — Purpose, פעילות, מספר אנשים ותפקידי הצדדים נבדקים על העובדות והחוק המעודכן.

35.4.9.14 אירועי אבטחה: מאגר ברמת ביניים או גבוהה עשוי לחייב דיווח מיידי על אירוע אבטחה חמור כהגדרתו. Runbook חייב להבחין בין Detection time, Confirmation, Classification, preservation, legal assessment, דיווח ראשוני, עדכונים, צעדים שננקטו והחלטה לגבי הודעה לנושאי מידע. `מיידי` אינו SLA פנימי שניתן לדחות עד Root cause מלא.

35.4.9.15 DPO ו־Governance: חובת מינוי DPO נבדקת לפחות כאשר עיסוק עיקרי הוא מסירת מידע לאחר או בתמורה, עיבוד ניכר של מידע בעל רגישות מיוחדת, או ניטור שוטף ושיטתי בהיקף ניכר. גם אם החובה אינה חלה, נדרש Privacy owner עצמאי לביצוע התוכנית. אין למנות Role סמלי ללא עצמאות, משאבים, גישה להנהלה, Conflict review ו־Backup.

35.4.9.16 DPIA: Connect מחייב DPIA לפני AI על תוכן שיחה, שינוי Purpose, ניטור/Profiling, מאגר גדול, מידע רגיש, ספק/Region חדש, Cross-border transfer, Retention change או Automated action. ה־DPIA כולל Necessity, Proportionality, Data subjects, threats לפי LINDDUN, controls, residual risk, consultation, Approval ו־revisit triggers; מילוי טופס בלבד אינו אישור.

35.4.9.17 נגישות: לפני Pilot ציבורי נקבעת Applicability של `שירות לציבור`, Scope האתר/אפליקציה/מסמכים/תמיכה, Standard מחייב, פטורים אם קיימים ואופן פרסום הצהרת נגישות. גם כאשר Claim משפטי עדיין חסום, יעד המוצר נשאר WCAG 2.2 AA עם בדיקה ידנית על Journeys קריטיים; Automation לבדו אינו Evidence.

35.4.9.18 מס ו־Billing: עד אישור רואה חשבון/יועץ מס, Connect אינו מפיק מסמך חשבונאי מקומי ואינו טוען ש־Paddle או Stripe פותרים אוטומטית MoR, VAT, Withholding, Invoice allocation, Refund, Credit note או Bookkeeping duties. נדרש Decision נפרד ל־Seller of record, Currency, Customer type, Invoice issuer, Number-allocation threshold, Accounting software registration ו־retention.

35.4.9.19 Freshness: חוות דעת משפטית חתומה בתוך 30 יום לפני Gates 21.1, ‏26.1 ו־30; Review רבעוני ומידי בכל שינוי חוק, פסיקה, הנחיה, Business model, Data flow, Region, Supplier, AI purpose או Marketing channel. Tax thresholds, Accessibility guidance ו־Database duties נבדקים גם ביום Cutover.

35.4.9.20 Safe state: Processing חדש, Direct mail, paid checkout, cross-border transfer, accessibility claim, AI data flow, Data export או destructive deletion נשארים כבויים כאשר Applicability, Role, Purpose, Notice, Consent/Exception, Registry/notification duty, Security level, Retention, DSAR, Transfer route, Tax treatment או named Owner אינם חתומים. Inbound support יכול להישאר רק במינימום מידע, ללא AI/Marketing reuse, ובכפוף ל־approved notice, contract ו־retention.

35.4.9.21 `DS-011` חוק הגנת הפרטיות, תיקון 13 ותקנות אבטחת מידע בישראל. שדות הרשומה: `sourceId=DS-011`; `authority=מאגר החקיקה הלאומי, הרשות להגנת הפרטיות וייעוץ משפטי ישראלי מוסמך`; `account/plan/region scope=Connect, ישראל; סיווג Controller/Processor/Holder, כל מאגר, רמת אבטחה, DPO, registration/notification ו־direct-mail-service applicability unknown/unavailable`; `canonical URLs=https://main.knesset.gov.il/Activity/Legislation/Laws/pages/lawprimary.aspx?lawitemid=2000234, https://www.gov.il/he/pages/tikun13_qa?chapterIndex=6, https://www.gov.il/he/pages/amendment-13-26-07-26, https://www.gov.il/he/service/registration_in_the_database, https://mojforms.justice.gov.il/mojaemprivacyprotectionauthority/dpiaform.html, https://www.gov.il/BlobFolder/generalpage/1files/he/IT2017.pdf, https://www.gov.il/he/pages/data_security_guide?chapterIndex=20, https://www.gov.il/BlobFolder/legalinfo/direct_mail_2/he/DirectMail_Tikon13.pdf`; `effectiveAt=תיקון 13 בתוקף מאוגוסט 2025 לפי המקור הרשמי; תחולת כל חובה על Connect unknown/unavailable עד Legal register חתום`; `checkedAt=2026-08-27 למחקר בלבד`; `checkedBy=Codex official-source research; Israeli legal/DPO reviewer unknown/unavailable`; `response/document digest=unknown/unavailable עד detached exact-byte snapshot`; `expiresAt=unknown/unavailable עד חוות דעת; לאחר מכן 30 ימים לפני Gates 21.1/26.1/30, בכל Processing/role/scope change ולפחות רבעוני`; `lastRefreshResult=official 2026 guidance verifies distinct DPO triggers and duties, section 11 notice fields, section 8A registration/notification paths, annual excess-data review, Regulation 15 supplier duties, direct-mail records, foreign-transfer duties, access/correction and AI/privacy review; factual applicability, named DPO/legal opinion and filing receipts remain unknown/unavailable`; `changeTriggers=law, regulation, ruling, authority guidance, DPO criteria, registration/notification, direct-mail operating model, business model, data class, purpose, monitoring, AI, scale, role, supplier, cross-border route or incident-reporting change`; `affectedDecisions=D02,D11,D15,D19,D20,D21,D22,D24,D25,D26`; `affectedGates=3,5,18.1,18.2,20,21.1,21.2,24,26.0.1,26.0.2,26.1,29,30`; `safeStateWhenStale=new processing, AI access/reuse, direct-mail/marketing send, export, multi-client processing and destructive deletion disabled; existing suppression and legal hold stay enforced`; `status=source-verified/digest-pending; blocked-legal-review`.

35.4.9.22 `DS-012` העברת מידע מחוץ לישראל. שדות הרשומה: `sourceId=DS-012`; `authority=הרשות להגנת הפרטיות, תקנות העברה לחו״ל וייעוץ משפטי ישראלי מוסמך`; `account/plan/region scope=כל Exporter/Importer/Country/Region/Subprocessor route; המסלולים בפועל unknown/unavailable`; `canonical URLs=https://mojforms.justice.gov.il/mojaemprivacyprotectionauthority/dpiaform.html, https://www.gov.il/en/pages/article-2-4, https://www.gov.il/he/pages/europe_transfer?chapterIndex=8`; `effectiveAt=unknown/unavailable עד Legal register חתום`; `checkedAt=2026-08-26 למחקר בלבד`; `checkedBy=Codex research; Israeli legal reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=unknown/unavailable עד חוות דעת; לאחר מכן 30 ימים לפני כל Provider/Region activation ורבעוני`; `lastRefreshResult=official sources reviewed; supplier routes/contracts/DPA evidence unknown/unavailable`; `changeTriggers=law, guidance, country, region, supplier, subprocessor, DPA, purpose, data class or onward-transfer change`; `affectedDecisions=D02,D12,D14,D16,D26,D28`; `affectedGates=3,6.1,6.2,6.3,18.1,18.2,19.3,21.1,22,23.1,23.2,26.0.1,26.0.2,26.1,30`; `safeStateWhenStale=the affected provider/data flow and cross-border transfer disabled`; `status=source-verified/digest-pending; blocked-legal-review`.

35.4.9.23 `DS-013` תקשורת שיווקית, דיוור ישיר וסעיף 30א. שדות הרשומה: `sourceId=DS-013`; `authority=הכנסת, הרשות להגנת הפרטיות, חוק התקשורת/חוק הגנת הפרטיות וייעוץ משפטי ישראלי מוסמך`; `account/plan/region scope=WhatsApp/SMS/direct-mail campaigns to recipients in Israel; classification and exceptions unknown/unavailable`; `canonical URLs=https://fs.knesset.gov.il/17/law/17_lsr_299991.pdf, https://main.knesset.gov.il/apps/legislation/main/bills/563438, https://www.gov.il/BlobFolder/legalinfo/direct_mail_2/he/DirectMail_Tikon13.pdf, https://www.gov.il/he/service/registration_in_the_database`; `effectiveAt=unknown/unavailable עד Legal classification לכל Message purpose`; `checkedAt=2026-08-26 למחקר בלבד`; `checkedBy=Codex research; Israeli legal reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=unknown/unavailable עד חוות דעת; לאחר מכן 30 ימים לפני Campaign enablement ורבעוני`; `lastRefreshResult=official sources reviewed, including the direct-mail guidance updated after Amendment 13 and the current database-registration service; message classification, direct-mail-service role, registration duty and consent/exception opinion remain unknown/unavailable`; `changeTriggers=law, ruling, authority guidance, registration rule, channel, purpose, template, audience-source record, consent route, product-similarity exception or opt-out change`; `affectedDecisions=D04,D20,D21,D22,D23,D24,D26`; `affectedGates=9,13,14.1,14.2,15,21.1,26.1,30`; `safeStateWhenStale=marketing/direct-mail sends disabled; suppression remains enforced`; `status=source-verified/digest-pending; blocked-legal-review`.

35.4.9.24 `DS-014` נגישות שירותים ואתרים בישראל. שדות הרשומה: `sourceId=DS-014`; `authority=נציבות שוויון זכויות לאנשים עם מוגבלות, הדין הישראלי וייעוץ נגישות/משפטי מוסמך`; `account/plan/region scope=public website, application, documents and support in Israel; legal applicability/exemptions unknown/unavailable`; `canonical URLs=https://www.gov.il/he/pages/website_accessibility?chapterIndex=3`; `effectiveAt=unknown/unavailable עד Applicability opinion`; `checkedAt=2026-08-26 למחקר בלבד`; `checkedBy=Codex research; accessibility/legal reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=unknown/unavailable עד חוות דעת; לאחר מכן 30 ימים לפני public Pilot/GA ורבעוני`; `lastRefreshResult=official source reviewed; legal applicability and manual audit evidence unknown/unavailable`; `changeTriggers=law, regulation, standard, exemption, public-service scope, UI journey, document or support-channel change`; `affectedDecisions=D16,D21,D22,D26,D27`; `affectedGates=25,26.1,26.3,29,30`; `safeStateWhenStale=no public accessibility claim or public launch; internal closed scope only if approved`; `status=source-verified/digest-pending; blocked-legal-review`.

35.4.9.25 `DS-015` מס, חשבוניות והנהלת חשבונות בישראל. שדות הרשומה: `sourceId=DS-015`; `authority=רשות המסים וייעוץ רואה חשבון/יועץ מס ישראלי מוסמך`; `account/plan/region scope=Connect seller/customer/invoice flows in Israel; Seller of record, VAT, allocation and accounting treatment unknown/unavailable`; `canonical URLs=https://www.gov.il/he/service/itc-software-registry-for-computerized-accounting-systems, https://www.gov.il/BlobFolder/policy/inst-071225-1/he/vat_inst-071225-1.pdf`; `effectiveAt=2026-06-01 לסף המתואר בהוראה שנבדקה; applicability to Connect unknown/unavailable`; `checkedAt=2026-08-26 למחקר בלבד`; `checkedBy=Codex research; accountant/tax reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=unknown/unavailable עד חוות דעת; לאחר מכן ביום Cutover, לפני Billing activation ובכל threshold change`; `lastRefreshResult=official sources reviewed; Connect tax/accounting treatment unknown/unavailable`; `changeTriggers=tax law, threshold, VAT, invoice allocation, seller-of-record, currency, customer type, refund, credit-note or accounting-software change`; `affectedDecisions=D03,D23,D26,D28`; `affectedGates=19.1,19.2,19.3,21.1,26.1,30`; `safeStateWhenStale=paid checkout and local accounting-document issuance disabled`; `status=source-verified/digest-pending; blocked-tax-review`.

35.4.10 `DS-016` GitHub ו־Supply chain.

35.4.10.1 שדות הרשומה: `sourceId=DS-016`; `authority=GitHub official documentation, plan/organization/repository exports and live Ruleset/Actions settings`; `account/plan/region scope=private repository exists; current owner/plan/organization/ruleset scope unknown/unavailable`; `canonical URLs=https://docs.github.com/en/actions/reference/security/secure-use, https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws, https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations`; `effectiveAt=unknown/unavailable`; `checkedAt=2026-08-26 לתיעוד בלבד`; `checkedBy=Codex research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=before Gate 2 and every Release-path change; monthly for governance exports`; `lastRefreshResult=documentation source verified; live plan/ruleset/CODEOWNERS/collaborator evidence unknown/unavailable`; `changeTriggers=plan, organization, repository, ruleset, collaborator, CODEOWNERS, Actions, OIDC, attestation or branch-policy change`; `affectedDecisions=D15,D18,D19,D27`; `affectedGates=2,24,26.0.1,26.0.2,26.1,29,30`; `safeStateWhenStale=merge, release and deployment blocked`; `status=source-verified/digest-pending; live governance scope blocked-unverified`.

35.4.10.2 סמכות: [Secure use of GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use), ‏[OIDC in AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws), ‏[Artifact Attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) ו־GitHub Plan/Ruleset documentation.

35.4.10.3 Freshness: Account/plan/repository capability probe לפני Gate 2 וכל Release-path change; Actions pinned SHA ו־Permissions בכל PR; Ruleset/CODEOWNERS/Collaborators חודשיים ומידי ב־offboarding.

35.4.10.4 Safe state: Branch/Release חסומים ללא Required checks ושני Reviewers רגישים; Artifact Attestations פרטיות אינן נטענות כזמינות ללא Enterprise Cloud evidence, ואז משתמשים ב־OIDC אל AWS KMS signer מצומצם.

35.4.10.5 רענון 27.08.2026: GitHub מאמתת ש־Full-length commit SHA הוא המסלול הבלתי־משתנה ל־Actions, ש־Private/internal Artifact Attestations דורשות Enterprise Cloud וש־Attestation שלא אומתה אינה מעניקה Security guarantee. Ruleset/Push-ruleset/bypass ו־plan availability נשארים Live facts. עד Export חי: Merge/Release/Deploy חסומים, ו־KMS signing alternative נשאר Planned ולא Active.

35.4.11 משפחת Billing, Observability ו־Notification; כל ספק הוא Dynamic-source record עצמאי.

35.4.11.1 `DS-017` Paddle. שדות הרשומה: `sourceId=DS-017`; `authority=Paddle official documentation, contract, plan, DPA, AUP, status/API schema and live account export`; `account/plan/region scope=unknown/unavailable`; `canonical URLs=https://www.paddle.com/help/legal/sanctions/which-countries-are-supported-by-paddle, https://www.paddle.com/legal/terms, https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle`; `effectiveAt=unknown/unavailable לכל Contract/AUP revision`; `checkedAt=2026-08-26`; `checkedBy=Codex official-source research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=before any procurement/activation, seven days before Release and monthly`; `lastRefreshResult=country application may be possible, but AUP prohibits Mass Marketing Products including Message App marketing; Connect-specific written eligibility absent`; `changeTriggers=contract, AUP, written eligibility, plan, KYC, country support, MoR, tax, price, currency, retention, API, webhook or status change`; `affectedDecisions=D03,D23,D26,D28`; `affectedGates=19.1,19.2,19.3,21.1,26.1,30`; `safeStateWhenStale=adapter dormant; activeProvider none; checkout and billing mutations disabled`; `status=source-verified/digest-pending; blocked-written-eligibility`.

35.4.11.2 `DS-018` Stripe. שדות הרשומה: `sourceId=DS-018`; `authority=Stripe official documentation, contract, plan, DPA, country-support list, status/API schema and live account export`; `account/plan/region scope=Israeli business location not listed as supported; live account absent`; `canonical URLs=https://stripe.com/global, https://docs.stripe.com/payments/managed-payments/how-it-works`; `effectiveAt=unknown/unavailable לכל country/preview revision`; `checkedAt=2026-08-26`; `checkedBy=Codex official-source research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=before any procurement/activation, seven days before Release and monthly`; `lastRefreshResult=Israel not listed as supported business location and not in current Managed Payments business locations`; `changeTriggers=contract, plan, KYC, country support, Managed Payments, tax, price, currency, retention, API, webhook or status change`; `affectedDecisions=D03,D23,D26,D28`; `affectedGates=19.1,19.2,19.3,21.1,26.1,30`; `safeStateWhenStale=adapter dormant; activeProvider none; checkout and billing mutations disabled`; `status=source-verified/digest-pending; dormant-business-location-unsupported`.

35.4.11.3 `DS-019` Better Stack. שדות הרשומה: `sourceId=DS-019`; `authority=Better Stack official documentation, contract, plan, DPA, region/retention/status/API schema and live account export`; `account/plan/region scope=Germany data region candidate; live account/plan unknown/unavailable`; `canonical URLs=https://betterstack.com/docs/logs/api/create-a-source/, https://betterstack.com/docs/logs/open-telemetry/, https://betterstack.com/docs/logs/billing-for-metrics/, https://betterstack.com/docs/uptime/escalation-policies/, https://betterstack.com/docs/uptime/working-with-incidents/`; `effectiveAt=2026 retained-GB metrics billing for new accounts/sources; live contract revision unknown/unavailable`; `checkedAt=2026-08-27`; `checkedBy=Codex official-source research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=before procurement/activation, seven days before Release and monthly`; `lastRefreshResult=documentation supports Germany-region source and OpenTelemetry ingestion; new-account metrics billing is based on retained GB; paused sources may retain billable data; escalation policies require explicit assignment; acknowledgement stops escalation; live DPA/plan/region/retention/pricing/roster evidence absent`; `changeTriggers=contract, plan, region, retention, price model, cardinality, SLO, API, policy assignment, incident-routing, acknowledgement/status behavior or status change`; `affectedDecisions=D09,D10,D26,D28`; `affectedGates=22,26.0.1,26.0.2,26.1,30`; `safeStateWhenStale=no external SLO claim; external telemetry disabled unless an approved fallback is active; no automated customer-status publication`; `status=source-verified/digest-pending; live-account-blocked`.

35.4.11.4 `DS-020` Amazon SES candidate. שדות הרשומה: `sourceId=DS-020`; `authority=AWS SES official documentation, contract, account, region, quota, identity, suppression and event exports`; `account/plan/region scope=target il-central-1; live account/production access unknown/unavailable`; `canonical URLs=https://aws.amazon.com/about-aws/whats-new/2023/08/amazon-simple-email-service-israel-tel-aviv-region/, https://aws.amazon.com/about-aws/whats-new/2026/07/amazon-ses-simplified-smtp-mail-manager/, https://docs.aws.amazon.com/general/latest/gr/ses.html, https://docs.aws.amazon.com/ses/latest/dg/regions.html`; `effectiveAt=2023-08 regional launch; 2026-07 SMTP guided-setup availability update; live account revision unknown/unavailable`; `checkedAt=2026-08-27`; `checkedBy=Codex official-source research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `expiresAt=30 days before Gate and seven days before email enablement`; `lastRefreshResult=SES and HTTPS API documented in il-central-1; AWS now documents SMTP guided setup in all SES Regions, superseding the old unavailability claim; Connect deliberately selects HTTPS API and disables SMTP; live account/DNS/quota/DPA absent`; `changeTriggers=contract, account, region, endpoint, sandbox, quota, sender, DKIM/DMARC, suppression, price, API, SMTP/Mail Manager or event schema change`; `affectedDecisions=D01,D09,D10,D16,D26,D28`; `affectedGates=3,8,20,22,26.0.1,26.0.2,26.1,30`; `safeStateWhenStale=email disabled; manual critical escalation; no delivery claim`; `status=source-verified/digest-pending; live-account-blocked`.

35.4.11.5 הפעלת SES דורשת Discovery חי ל־Account, production access, HTTPS endpoint, sender/domain, DKIM, SPF, DMARC, quota, suppression, Event destination, DPA, retention, redaction, rate/cost cap ו־manual fallback. אין SMTP fallback סמוי.

35.4.11.5.1 Sandbox status, production access, sender/domain verification, Easy DKIM, sending quota, account-level suppression ו־feedback/event configuration הם Region-specific לפי תיעוד SES. ‏`il-central-1` פעיל בחשבון או Sender מאומת באזור אחר אינם Evidence. כל אחד נבדק באותו Account+Region+Environment; Email נשאר כבוי עד שכולם מתיישבים עם Manifest.

35.4.11.6 `DS-021` PayPlus. שדות הרשומה: `sourceId=DS-021`; `authority=PayPlus official API documentation, contract, merchant/sandbox/live exports and Finance/Tax/PCI decisions`; `account/plan/region scope=unknown/unavailable`; `canonical URLs=https://docs.payplus.co.il/reference/post_paymentpages-generatelink, https://docs.payplus.co.il/reference/post_recurringpayments-add, https://docs.payplus.co.il/reference/validate-requests-received-from-payplus`; `checkedAt=2026-08-26`; `checkedBy=Codex official-source research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `lastRefreshResult=Hosted payment page, recurring and callback capabilities documented; official validation example applies HMAC-SHA256 to JSON.stringify(body), compares with ordinary equality and checks user-agent, but does not by itself prove raw-byte framing, constant-time comparison, replay window, key rotation or live parity`; `affectedDecisions=D03,D23,D26,D28`; `affectedGates=19.1,19.2,19.3,21.1,26.1,30`; `safeStateWhenStale=adapter dormant; activeProvider none; callback never grants entitlement without exact byte-level contract, replay defense and independent transaction reconciliation`; `status=source-verified/digest-pending; primary-discovery-candidate`.

35.4.11.6.1 רענון 27.08.2026 אינו משנה את Safe state: PayPlus Payment Pages/recurring/tokenization הן Capabilities תלויות Merchant/terminal/permission; Hosted page עשוי לצמצם PCI scope ואינו Compliance evidence. דוגמת HMAC נשארת בלתי־מספקת ל־Raw-byte/timing/replay contract. לפני Adapter נדרשים Written security clarification, authorized Fixture, live/sandbox parity, server-to-server transaction query ו־Finance reconciliation; אחרת `activeProvider=none`.

35.4.11.7 `DS-022` Apple App Store. שדות הרשומה: `sourceId=DS-022`; `authority=Apple official App Review, privacy, account deletion, SDK/privacy manifest, signing and live App Store Connect evidence`; `account/plan/region scope=conditional native only; live account/app absent`; `canonical URLs and exact policy sections=A08 registry`; `checkedAt=2026-08-26`; `response/document digest=unknown/unavailable`; `affectedDecisions=D29,D30`; `affectedGates=Native conditional gate and 29`; `safeStateWhenStale=no iOS build/distribution/claim`; `status=source-verified/digest-pending; conditional-disabled`.

35.4.11.8 `DS-023` Google Play. שדות הרשומה: `sourceId=DS-023`; `authority=Google official Play policy, Data Safety, account deletion, Target API, SDK/signing and live Play Console evidence`; `account/plan/region scope=conditional native only; live account/app absent`; `canonical URLs and exact policy sections=A08 registry`; `checkedAt=2026-08-26`; `response/document digest=unknown/unavailable`; `affectedDecisions=D29,D30`; `affectedGates=Native conditional gate and 29`; `safeStateWhenStale=no Android build/distribution/claim`; `status=source-verified/digest-pending; conditional-disabled`.

35.4.11.9 `DS-024` Tranzila. שדות הרשומה: `sourceId=DS-024`; `authority=Tranzila official API documentation, contract, merchant/sandbox/live account, security, PCI, Finance/Tax and exit evidence`; `account/plan/region scope=unknown/unavailable`; `canonical URLs=https://docs.tranzila.com/docs/payments-and-billing/tranzila-api, https://docs.tranzila.com/docs/payments-and-billing/authentication`; `checkedAt=2026-08-26`; `checkedBy=Codex official-source research; human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `lastRefreshResult=server-side HMAC with request-time and 40-byte nonce documented; one official PHP example disables SSL peer/host verification and is explicitly prohibited for Connect; eligibility, callback authenticity, PCI scope, contract and live parity unproven`; `affectedDecisions=D03,D23,D26,D28`; `affectedGates=19.1,19.2,19.3,21.1,26.1,30`; `safeStateWhenStale=adapter dormant; activeProvider none; no TLS downgrade or browser secret`; `status=source-verified/digest-pending; alternate-discovery-candidate`.

35.4.11.9.1 רענון 27.08.2026: Tranzila V2 מתעד Server-only HMAC request headers, Unix time, Nonce בן 40 bytes ו־Handshake בן כ־20 דקות שתלוי Module/terminal חי. המסמכים שנבדקו אינם מוכיחים Notification signature. ‏Nonce דורש OS CSPRNG ואישור X24 לשימוש המדויק; exact framing/skew/replay, TLS verification, callback authority, hosted-field PCI scope, account eligibility ו־reconciliation נשארים `unknown/unavailable`. עד סגירת כולם ה־Adapter Alternate/Dormant בלבד.

35.4.11.10 `DS-025` מטריצת Browser, PWA ו־Push-service חיה. שדות הרשומה: `sourceId=DS-025`; `authority=exact approved browser engine/version/OS/platform builds, selected Push services, Web Platform Tests, MDN browser-compat-data and official browser-vendor documentation plus Connect live probes`; `account/plan/region scope=conditional PWA only; target browsers, OS versions, devices, Push services and Production origins unknown/unavailable`; `canonical URLs=https://wpt.fyi/results/, https://github.com/mdn/browser-compat-data, https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers`; `checkedAt=2026-08-26 למחקר מקורות בלבד`; `checkedBy=Codex official/primary-source research; Browser/PWA human reviewer unknown/unavailable`; `response/document digest=unknown/unavailable`; `lastRefreshResult=standards and vendor sources identified; no approved support matrix, exact browser builds, Production subscription, Push-service receipt or Background Sync capability proof exists`; `changeTriggers=browser engine/version, OS/device, installed-Web-App rules, Service Worker, cache/storage/quota/eviction, permission, Notification, Push service/subscription, VAPID, Background Sync, vendor policy or Production-origin change`; `affectedDecisions=D30`; `affectedGates=28.3.1,28.3.2,28.3.3,28.3.4,28.3.5,29,30`; `safeStateWhenStale=Responsive React Web remains network-only; each affected PWA sub-capability is absent or disabled independently`; `status=source-identified/digest-pending; conditional-disabled-live-matrix-unproven`.

35.4.12 שינוי Edition, Terms, Provider plan, API version, Region, Status enum, Price, Rate, Model alias או Law יוצר Registry version חדש ו־Delta review. אסור לעדכן רשומה היסטורית בשקט.

35.4.13 Snapshot שפג מסומן `expired`, אינו נספר ב־Gate, והיכולת חוזרת ל־Safe state המתועד גם אם השירות נראה עובד. חזרה לפעילות דורשת Refresh, Diff, בדיקות רלוונטיות ו־Reviewer sign-off.

35.5 רשם תיקונים קנוני MP-F001–MP-F052.

35.5.0.1 כל 52 הממצאים נשארים `open` או `planned-open` לפי הרשומה. תיקון ניסוח במסמך אינו Closing evidence.

35.5.0.2 חומרה ומצב נלקחים מכל Finding record בנפרד; אין כלל טווח שממיר אוטומטית P0/P1. ‏MP-F037–MP-F052 כוללים חומרות מותנות לפי Reachability והשפעה.

35.5.0.3 `Owner` או `Reviewer` תפקידי אינם מינוי שמי. כל שם שלא מופיע במפורש נשאר `unknown/unavailable`.

35.5.0.4 לכל Evidence להלן יש להוסיף `producer`, ‏`checkedAt`, ‏`expiry`, ‏`redaction`, ‏`source digest` ו־`artifact digest`. הנתיבים הם מיקומי יעד מתוכננים; הם אינם קיימים או מוכחים כעת.

35.5.1 MP-F001 — רשם WBS מלא.

35.5.1.1 חומרה ומצב: `P0`; ‏`open-partially-planned`. סעיף 35.1 הגדיר חוזה בן 18 שדות, אך אין עדיין רשומות־עלה מלאות ומאושרות לכל שלבים 0–28 ולכל Package מותנה. אין לסמן את הממצא כמתוקן.

35.5.1.2 מיקום: 34.34.7.1, ‏34.36, ‏35.1.1–35.1.10.

35.5.1.3 תיקון תכנוני: לפרק כל Work package לרשומות־עלה של עד שמונה שעות, ללא שעות או Credit להורים, עם כל 18 השדות מפורשים וללא ירושה.

35.5.1.4 משימת המשך: להפיק Slice קנוני ראשון לשלבים 0–5, לבדוק שכל עלה כולל 18/18 שדות ולרשום את כל החוסרים; 6–8 שעות. המשימה אינה סוגרת לבדה את MP-F001.

35.5.1.5 Acceptance: הממצא נסגר רק כאשר כל שלבי הביצוע 0–28 מכוסים ו־Gate 29 מתועד בנפרד כאישור תכנון של Stage 0, אין משימת עלה מעל שמונה שעות, אין Requirement/Gate/Finding ללא עלה ואין שעות כפולות.

35.5.1.6.1 בדיקה חיובית: Parser מאתר לכל עלה מזהה, פעולה, Input, Output, Predecessors, שמות, שעות, ארבע בדיקות, Acceptance, Evidence, Detection, Rollback, Gate, Requirements, Findings ו־Status.

35.5.1.6.2 בדיקה שלילית: עלה חסר Reviewer, Evidence location או Negative test נכשל בבדיקת המבנה.

35.5.1.6.3 בדיקת כשל: מסמך שנקטע באמצע Stage, Reference ל־Parent חסר או Estimate שאינו מספרי משאיר Gate 29 חסום.

35.5.1.6.4 בדיקת Concurrency: שני עורכים המוסיפים אותו ID או אותו Scope יוצרים Conflict/duplicate report ולא שתי רשומות פעילות.

35.5.1.7 Evidence: `docs/evidence/master-plan/mp-f001/task-registry-audit.json` ו־`task-registry-coverage.md`; מצב נוכחי `pending`.

35.5.1.8 Detection: בדיקת Registry בכל שינוי למסמך, התראה על עלה חסר, ID כפול, שעות מעל שמונה או Reference שבור.

35.5.1.9 Rollback/Disable: להשאיר Freeze פעיל, לבטל את Export הבלתי תקין ולחזור לגרסת Registry האחרונה בעלת Digest מאומת.

35.5.1.10 Gate: חוסם Gates 29, ‏1 ו־30.

35.5.1.11 Owner/Reviewer: Primary `unknown/unavailable`; Backup `unknown/unavailable`; Reviewer 1 `unknown/unavailable`; Reviewer 2 `unknown/unavailable`.

35.5.2 MP-F002 — מעגל תלות Gate 6 ו־Gate 7.

35.5.2.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. הפיצול ל־6.1, ‏7 ו־6.2 שולב, אך DAG סופי ו־Retest מבני טרם הושלמו.

35.5.2.2 מיקום: 11.8.5–11.8.6, ‏11.15.1–11.15.4, ‏12.3.

35.5.2.3 תיקון תכנוני: 6.1 יוצר Infrastructure shell ללא Roles חיים; שלב 7 יוצר Roles/RLS; ‏6.2 מוכיח Live service-to-resource authorization לאחר שלב 7.

35.5.2.4 משימת המשך: לבנות DAG machine-readable ולבדוק שאין מסלול שבו 7 תלוי ב־6.2 או 6.2 יכול להיסגר לפני 7; 3–5 שעות.

35.5.2.5 Acceptance: סדר יחיד תקף הוא 6.1 → 7 → 6.2, וכל Reference במסמך וב־Registry משתמש בו.

35.5.2.6.1 בדיקה חיובית: Topological sort מחזיר 6.1 לפני 7 ו־7 לפני 6.2.

35.5.2.6.2 בדיקה שלילית: Edge ‏6.2→7 או דרישת Role חי ב־6.1 נחסמים.

35.5.2.6.3 בדיקת כשל: Capability probe שלא יכול ליצור Role משאיר 6.2 חסום אך אינו מבטל Evidence תקף של 6.1.

35.5.2.6.4 בדיקת Concurrency: שינוי מקביל ב־Stage 6 וב־Stage 7 עם גרסאות DAG שונות נכשל ב־digest/version check.

35.5.2.7 Evidence: `docs/evidence/master-plan/mp-f002/gate-dag.json` ו־`topological-audit.md`; מצב `pending`.

35.5.2.8 Detection: DAG lint בכל שינוי Gate/Predecessor.

35.5.2.9 Rollback/Disable: לחזור ל־DAG המאומת האחרון ולהשאיר חיבורי Service חיים כבויים.

35.5.2.10 Gate: חוסם 6.1, ‏7, ‏6.2, ‏29 ו־30.

35.5.2.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.3 MP-F003 — פיצול Upload ו־Media ממסלול Core.

35.5.3.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. Gate 6.3 ו־Gates 14.1/14.2 שולבו; Cross-reference QA ו־Disabled evidence חסרים.

35.5.3.2 מיקום: 11.15.3–11.15.4, ‏19.3, ‏19.13.1–19.13.2, ‏23.3.

35.5.3.3 תיקון תכנוני: 6.1/6.2 מכסים Core; ‏6.3 מכסה Upload/Quarantine; ‏14.1 מכסה Text template; ‏14.2 מכסה Media lifecycle. Scope Manifest קובע אילו Gates חלים.

35.5.3.4 משימת המשך: להפיק מטריצת Capability×Gate×Disabled-state לכל Upload, Knowledge ו־Media; 4–6 שעות.

35.5.3.5 Acceptance: Closed Pilot ללא Upload/Media יכול לעבור רק עם Disabled evidence; Capability הכוללת קובץ אינה יכולה לעקוף 6.3 או 14.2.

35.5.3.6.1 בדיקה חיובית: Manifest טקסט בלבד אינו דורש 6.3/14.2 ומציג Endpoints כבויים.

35.5.3.6.2 בדיקה שלילית: Manifest עם Media ללא 6.3/14.2 נדחה.

35.5.3.6.3 בדיקת כשל: Scanner/GuardDuty לא זמין משבית Upload בלבד ואינו מפיל Read-only Core.

35.5.3.6.4 בדיקת Concurrency: הפעלת Feature flag במקביל לשינוי Manifest משתמשת באותה גרסה; mismatch נכשל סגור.

35.5.3.7 Evidence: `docs/evidence/master-plan/mp-f003/capability-gate-matrix.json`; מצב `pending`.

35.5.3.8 Detection: Alert על Route/queue/bucket פעיל שאינו נמצא ב־Manifest או Gate מתאים.

35.5.3.9 Rollback/Disable: להשבית Upload, Media submission ו־provider media upload בנפרד; לשמור Text/read-only פעיל.

35.5.3.10 Gate: חוסם 6.3, ‏14.1, ‏14.2, ‏12.2.3, ‏12.2.6 ו־30.

35.5.3.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.4 MP-F004 — טענת D31-C1 שגויה לגבי טבלאות שלא נוצרו.

35.5.4.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. המשפט השגוי הוסר בסעיף 17.6.1, אך Migration inventory ו־live verification חסרים.

35.5.4.2 מיקום: 17.6.1–17.6.1.3, ‏17.13.1.1.

35.5.4.3 תיקון תכנוני: לציין ש־D31-C1 לא יצר טבלאות; 0058 חייבת לנעול ולבדוק ריקנות של שבעת Downstream ledgers הקיימים בלבד ולהתייחס לטבלאות משותפות לפי Permit תואם.

35.5.4.4 משימת המשך: להפיק Table provenance matrix מן Migrations 0053–0057 מול חוזה 0058; 4–6 שעות.

35.5.4.5 Acceptance: לכל Table יש creating migration, ownership, trusted writers, emptiness rule ו־shared-row rule; אין Claim סותר.

35.5.4.6.1 בדיקה חיובית: Inventory מאתר בדיוק את שבעת Downstream ledgers ואת Migration המקור.

35.5.4.6.2 בדיקה שלילית: Table שלא נוצרה או Shared table ללא matching permit אינה עוברת Preflight.

35.5.4.6.3 בדיקת כשל: Migration חסרה או schema drift משאירים Candidate רדום.

35.5.4.6.4 בדיקת Concurrency: Writer מוסיף row בזמן Preflight; lock/snapshot מונעים קבלה שגויה.

35.5.4.7 Evidence: `docs/evidence/send/mp-f004/table-provenance.json`; מצב `pending`.

35.5.4.8 Detection: Migration verifier משווה creating migration, schema digest ו־writer inventory בכל CI/Release.

35.5.4.9 Rollback/Disable: לא להפעיל Adapter; 0058 נשארת additive בלבד ואין Down migration הרסני.

35.5.4.10 Gate: חוסם 7, ‏12.1 וכל Instance של 12.2.

35.5.4.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.5 MP-F005 — חסרה Provenance לרכישת Session/Lock.

35.5.5.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. חוזה Acquisition/Release ledger שולב, אך Schema/privileges/live proof חסרים.

35.5.5.2 מיקום: 17.10.1.2–17.10.1.4, ‏17.10.7, ‏17.10.10.

35.5.5.3 תיקון תכנוני: לקשור Acquisition key ל־Permit, Tenant, Mode, barrier keys, backend PID, backend start, session/current user, XID, Lock shape וזמנים; Release הוא Append-only ומדויק.

35.5.5.4 משימת המשך: להשלים State/field/constraint/privilege table ל־Acquisition ו־Release; 5–7 שעות.

35.5.5.5 Acceptance: אין Consume/Provider attempt/Release ללא Acquisition committed ומאומת, ו־PID לבדו לעולם אינו Identity.

35.5.5.6.1 בדיקה חיובית: Acquisition תקפה ממשיכה ל־Consume עם אותו key ו־binding.

35.5.5.6.2 בדיקה שלילית: forged/stale key, reused PID, role mismatch או lock-shape mismatch נדחים לפני Provider.

35.5.5.6.3 בדיקת כשל: Socket אבד אחרי lock ולפני Commit; אין Provider call וה־Recovery מסווג את המצב.

35.5.5.6.4 בדיקת Concurrency: שני Workers על אותו Permit; רק Acquisition אחת committed והשנייה נכשלת ללא Side effect.

35.5.5.7 Evidence: `docs/evidence/send/mp-f005/acquisition-provenance-report.json`; מצב `pending`.

35.5.5.8 Detection: Alert על Consume/Fact/Release ללא Acquisition תקפה ועל Lock שלא שוחרר בזמן.

35.5.5.9 Rollback/Disable: להשבית Send instance, לבצע Drain ולהעביר Acquisition לא פתורה ל־Manual reconciliation.

35.5.5.10 Gate: חוסם 12.1 וכל 12.2.1–12.2.6.

35.5.5.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.6 MP-F006 — Provider binding אינו Byte-exact.

35.5.6.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. Canonical framing מפורט שולב, אך Golden vectors בין SQL/TypeScript טרם הוכחו.

35.5.6.2 מיקום: 17.6.2–17.6.9.

35.5.6.3 תיקון תכנוני: לקבע Domain tag, Algorithm version, Field/type/null tags, fixed-width length, UTF-8, Integer/Array encoding, Unicode policy וסדר שדות; לשמור version ליד digest.

35.5.6.4 משימת המשך: להפיק Specification table ו־Golden-vector corpus קבוע ללא Randomness; 6–8 שעות.

35.5.6.5 Acceptance: SQL ו־TypeScript מחזירים אותו Digest Byte-for-byte לכל Vector וכל שינוי בשדה רלוונטי משנה אותו.

35.5.6.6.1 בדיקה חיובית: vectors בעברית, Emoji, Null, Empty, Integer ו־Array זהים בשתי המימושים.

35.5.6.6.2 בדיקה שלילית: שינוי Recipient, Asset, Credential revision, Approval או Unicode representation לפי המדיניות משנה/דוחה digest.

35.5.6.6.3 בדיקת כשל: Version לא מוכרת או field חסר מונעים Provider attempt.

35.5.6.6.4 בדיקת Concurrency: Permit version משתנה בזמן resolve; Compare-and-set דוחה Binding ישן.

35.5.6.7 Evidence: `docs/evidence/send/mp-f006/provider-binding-vectors.json`; מצב `pending`.

35.5.6.8 Detection: Differential SQL/TypeScript test בכל Build ו־Alert על digest-version לא מוכרת.

35.5.6.9 Rollback/Disable: לחזור ל־version המאומת האחרון ולהשבית Permits מהגרסה החדשה; אין Rehash שקט להיסטוריה.

35.5.6.10 Gate: חוסם 12.1 וכל 12.2.

35.5.6.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.7 MP-F007 — פענוח Token מוקדם מדי.

35.5.7.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. המסמך דורש Plaintext רק ב־Callback צר לאחר Proof, אך Call graph ו־secret-boundary tests חסרים.

35.5.7.2 מיקום: 12.11.2, ‏14.7.5, ‏17.10.2–17.10.5.

35.5.7.3 תיקון תכנוני: Resolve מחזיר Metadata/digest בלבד; Plaintext נחשף לצרכן המאושר רק אחרי Acquisition+Consume+binding proof ומיד לפני Transport, בלי לחזור ל־Caller.

35.5.7.4 משימת המשך: לתעד Call graph, lifetime, redaction ו־failure boundaries של Credential callback; 4–6 שעות.

35.5.7.5 Acceptance: לא קיים מסלול שבו Plaintext נוצר לפני committed proof, נשמר במשתנה ארוך־חיים, נשלח ל־log/error/evidence או מוחזר ל־Caller.

35.5.7.6.1 בדיקה חיובית: Permit תקף מפענח בתוך Callback ומוחק reference לאחר Transport.

35.5.7.6.2 בדיקה שלילית: invalid permit/binding/revision אינו מפעיל decrypt כלל.

35.5.7.6.3 בדיקת כשל: decrypt או Transport זורקים Exception; ה־Secret אינו מופיע ב־Telemetry והמצב מסווג נכון.

35.5.7.6.4 בדיקת Concurrency: Credential rotation בין Resolve ל־Callback דוחה Revision ישנה לפני Provider.

35.5.7.7 Evidence: `docs/evidence/secrets/mp-f007/credential-lifetime-report.json`; מצב `pending`.

35.5.7.8 Detection: secret canary scan ב־logs/errors/evidence ו־metric על decrypt ללא proof identity.

35.5.7.9 Rollback/Disable: לבטל את Credential revision, להשבית Send ולסובב Secret אם Canaries זוהו.

35.5.7.10 Gate: חוסם 9, ‏12.1, ‏12.2 ו־30.

35.5.7.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.8 MP-F008 — Gate 12 גורף במקום משפחות Side effect.

35.5.8.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. 12.1 ו־12.2.1–12.2.6 הוגדרו, אך לכל Instance חסר עדיין Registry מלא ו־Evidence עצמאי.

35.5.8.2 מיקום: 17.16–17.16.7.

35.5.8.3 תיקון תכנוני: 12.1 מאשר Candidate רדום; כל Bot text, Template, Media, Campaign recipient, Template submission ו־Provider media upload מקבל Gate עצמאי.

35.5.8.4 משימת המשך: ליצור Instance registry עם Schema, binding, credential, one-attempt, result, unknown, writers, kill/drain ו־Staging evidence; 6–8 שעות.

35.5.8.5 Acceptance: אישור Instance אחד אינו מפעיל אחר, וכל Route/Job/Adapter קשור ל־Instance יחיד.

35.5.8.6.1 בדיקה חיובית: הפעלת 12.2.1 מאפשרת Bot text בלבד.

35.5.8.6.2 בדיקה שלילית: Template/Media/Campaign מנסים להשתמש ב־12.2.1 ונדחים.

35.5.8.6.3 בדיקת כשל: Evidence של Instance פג תוקף; רק אותו Instance מושבת.

35.5.8.6.4 בדיקת Concurrency: שני Approvers משנים Gates שונים; versioned registry מונע broad enable עקב last-write-wins.

35.5.8.7 Evidence: `docs/evidence/send/mp-f008/side-effect-instance-registry.json`; מצב `pending`.

35.5.8.8 Detection: Monitor על Side effect שה־instanceId שלו אינו Active ומאומת.

35.5.8.9 Rollback/Disable: Disable per Instance, Drain queue המתאימה ושימור Facts/Reconciliation.

35.5.8.10 Gate: חוסם 12.2.1–12.2.6, ‏15, ‏19.3, ‏26.1 ו־30.

35.5.8.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.9 MP-F009 — Provider accepted הוצג כ־sent.

35.5.9.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. State machine תוקנה, אך Provider/Webhook live evidence חסר.

35.5.9.2 מיקום: 17.11.1–17.11.5, ‏20.9.1–20.9.2.

35.5.9.3 תיקון תכנוני: `provider-accepted(wamid)` נפרד מ־`sent(webhook)`, ‏`delivered` ו־`read`; HTTP 200 או `accepted` אינם Sent.

35.5.9.4 משימת המשך: ליצור Transition/metric taxonomy אחת ל־Send, Campaign, Inbox ו־Dashboard; 4–6 שעות.

35.5.9.5 Acceptance: אין Query, KPI, UI או Billing projection שמחשב `accepted` כ־`sent`.

35.5.9.6.1 בדיקה חיובית: Webhook sent מאומת מקדם accepted ל־sent.

35.5.9.6.2 בדיקה שלילית: HTTP 200 ללא Webhook נשאר provider-accepted/unknown ואינו נספר Sent.

35.5.9.6.3 בדיקת כשל: accepted-then-failed או malformed webhook נשמרים ללא שכתוב היסטוריה.

35.5.9.6.4 בדיקת Concurrency: delivered מגיע לפני sent או webhooks כפולים/out-of-order; reducer נשאר מונוטוני.

35.5.9.7 Evidence: `docs/evidence/send/mp-f009/provider-state-taxonomy.json`; מצב `pending`.

35.5.9.8 Detection: Reconciliation alert על accepted ישן ללא sent ועל Metrics שאינם מאזנים מול ledger.

35.5.9.9 Rollback/Disable: להשבית Analytics claim/automation התלויים ב־Sent ולשמור raw facts.

35.5.9.10 Gate: חוסם 10, ‏12.2, ‏15, ‏24 ו־30.

35.5.9.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.10 MP-F010 — החלטות “או” לא מוכרעות.

35.5.10.1 חומרה ומצב: `P0`; ‏`open-partially-corrected`. סעיף 35.1.6 מחייב `unknown/unavailable`, אך External register עדיין מכיל Owners, Accounts, Plans, Contracts ו־Evidence לא ידועים.

35.5.10.2 מיקום: 2.11, ‏31.5.4, ‏34.33.1–34.33.27, ‏35.1.6.

35.5.10.3 תיקון תכנוני: כל “A או B” הופך Decision record עם Recommended choice, authority, deadline, safe default, disabled capability ו־Gate; אין משפט אופציונלי פתוח בתוך חוזה ביצוע.

35.5.10.4 משימת המשך: לבצע lexical/semantic review וליצור Or-decision ledger לכל `או`, `לפי הצורך`, `כאשר ניתן` ו־`חלופה`; 6–8 שעות.

35.5.10.5 Acceptance: כל disjunction מסווגת כבחירה סגורה, Capability probe, External decision או Alternative failover עם Trigger חד־משמעי.

35.5.10.6.1 בדיקה חיובית: Decision מאושר מפיק Option יחיד ו־effectiveAt.

35.5.10.6.2 בדיקה שלילית: שני Options פעילים או Option ללא Authority/Deadline נחסמים.

35.5.10.6.3 בדיקת כשל: Authority לא עונה עד deadline; safe default משאיר Capability כבויה.

35.5.10.6.4 בדיקת Concurrency: שתי החלטות סותרות באותה גרסה יוצרות Conflict ולא last-write-wins.

35.5.10.7 Evidence: `docs/evidence/master-plan/mp-f010/disjunction-ledger.json`; מצב `pending`.

35.5.10.8 Detection: Lint על מונחי ambiguity ו־expired Decision.

35.5.10.9 Rollback/Disable: לחזור ל־Decision version הקודמת ולהשבית Capability עד הכרעה חדשה.

35.5.10.10 Gate: חוסם 29, כל Gate שמקושר ל־X01–X27 ו־30.

35.5.10.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.11 MP-F011 — מחיקה חוצת ספקים אינה אטומית.

35.5.11.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. Durable saga תוארה, אך State schema, adapters, recovery ו־live proof חסרים.

35.5.11.2 מיקום: 26.9.4–26.9.4.2, ‏34.37.2.10.

35.5.11.3 תיקון תכנוני: Atomicity מוגבלת לתביעת Plan ו־Policy recheck מקומיים; PostgreSQL/S3/Providers נמחקים ב־Saga עמידה עם receipts, unknown/manual reconciliation ו־re-deletion לאחר Restore.

35.5.11.4 משימת המשך: להפיק Saga transition table לכל Data class ו־Provider adapter; 6–8 שעות.

35.5.11.5 Acceptance: אין Claim אטומי חוצה Boundary; כל Partial/Unknown ניתן לחידוש מן הצעד החסר בלי למחוק יעד פעמיים או לדלג על Hold.

35.5.11.6.1 בדיקה חיובית: כל Provider מאשר ו־local delete committed לאחר receipts.

35.5.11.6.2 בדיקה שלילית: expired plan, cutoff רחב, identity לא תואמת, record פעיל או Legal Hold נדחים.

35.5.11.6.3 בדיקת כשל: Provider timeout נשאר unknown ולא Deleted ולא Blind retry.

35.5.11.6.4 בדיקת Concurrency: שתי Claims לאותו Plan; אחת בלבד זוכה והשנייה קוראת State קיים.

35.5.11.7 Evidence: `docs/evidence/privacy/mp-f011/deletion-saga-report.json`; מצב `pending`.

35.5.11.8 Detection: Alert על Saga תקועה, Unknown ללא Owner, receipt חסר או record שחזר לאחר Restore.

35.5.11.9 Rollback/Disable: להשבית destructive workers, לשמור Plan/receipts, לבטל claim שפג רק לפי Transition חוקי ולהמשיך Manual reconciliation.

35.5.11.10 Gate: חוסם 21.2, ‏23.1, ‏24 ו־30.

35.5.11.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.12 MP-F012 — טענת Ransomware עם Object Lock אופציונלי.

35.5.12.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. WORM נדרש כעת ל־Claim, אך AWS account, SCP, retention mode, cost/legal approval ו־drill חסרים.

35.5.12.2 מיקום: 5.10, ‏28.6.7, ‏28.7.1–28.7.6, ‏28.15.1–28.15.3, ‏35.2.21.

35.5.12.3 תיקון תכנוני: Separate account, SSE-KMS, Versioning, Object Lock או Immutable provider שקול, deny-bypass, isolated restore ו־compromised-admin drill הם תנאי ל־Ransomware claim.

35.5.12.4 משימת המשך: להכין Decision/Capability packet ל־Governance מול Compliance mode ולחלופה Immutable; 5–7 שעות.

35.5.12.5 Acceptance: Gate 23.2 ו־Public claim אינם נסגרים ללא immutable object שנבדק ב־Restore ו־destructive-control drill.

35.5.12.6.1 בדיקה חיובית: Restore מ־Object נעול בחשבון נפרד מצליח.

35.5.12.6.2 בדיקה שלילית: Admin/Runtime מנסים למחוק או לקצר Retention ונחסמים.

35.5.12.6.3 בדיקת כשל: Object Lock/KMS/Account unavailable; Claim נשאר כבוי ונבחר Runbook חלופי.

35.5.12.6.4 בדיקת Concurrency: Backup job ו־malicious retention change במקביל; Object נשאר ב־Retention המקורי.

35.5.12.7 Evidence: `docs/evidence/recovery/mp-f012/worm-capability-and-drill.json`; מצב `pending`.

35.5.12.8 Detection: Alert על bucket ללא Object Lock, policy/SCP drift, retention reduction, key disable או replication failure.

35.5.12.9 Rollback/Disable: לבטל Ransomware-ready claim, לעצור Promotion ל־GA ולשמר Backup copies קיימים.

35.5.12.10 Gate: חוסם 23.2, ‏26.1 לפי Claim ו־30.

35.5.12.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.13 MP-F013 — Consistency point ו־Replay ב־Backup חסרים.

35.5.13.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. LSN, S3 cutoff/VersionIds ו־writer fence שולבו; implementation ו־restore proof חסרים.

35.5.13.2 מיקום: 28.6.3, ‏28.6.9, ‏28.8.1–28.8.5, ‏28.9.4.1.

35.5.13.3 תיקון תכנוני: כל Backup manifest קושר PostgreSQL LSN/high-watermark, S3 Inventory cutoff/VersionIds, config/source digests ו־writer fence; Restore מעביר Pending/Unknown ל־Quarantine.

35.5.13.4 משימת המשך: להפיק Consistency/replay contract כולל orphan/missing-object semantics; 6–8 שעות.

35.5.13.5 Acceptance: Restore מדגים Snapshot קוהרנטי או מציג Missing/Orphan כ־Finding; אין Side effect אוטומטי מ־state ישן.

35.5.13.6.1 בדיקה חיובית: DB rows ו־S3 VersionIds תואמים לאותו cutoff.

35.5.13.6.2 בדיקה שלילית: manifest עם LSN שגוי, VersionId חסר או config digest אחר נדחה.

35.5.13.6.3 בדיקת כשל: Backup נקטע בין DB ל־S3; ה־set מסומן invalid ואינו Restore candidate.

35.5.13.6.4 בדיקת Concurrency: Writer פעיל סביב cutoff; fence/high-watermark קובעים הכללה פעם אחת.

35.5.13.7 Evidence: `docs/evidence/recovery/mp-f013/consistency-restore-v2.json`; מצב `pending`.

35.5.13.8 Detection: Reconciliation על LSN, row/object counts, VersionIds ו־orphan/missing.

35.5.13.9 Rollback/Disable: להסיר Candidate לא קוהרנטי מן Restore registry, להשאיר Production read-only ולבחור Backup קודם מאומת.

35.5.13.10 Gate: חוסם 23.1, ‏23.2, ‏26.1 ו־30.

35.5.13.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.14 MP-F014 — סתירה בין Vercel UI-only ל־BFF.

35.5.14.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. Vercel server-side BFF נקבע כגבול Browser, אך Route inventory, OIDC live proof ו־Preview isolation חסרים.

35.5.14.2 מיקום: 9.5.2, ‏9.6.2, ‏11.7.6.

35.5.14.3 תיקון תכנוני: Browser פונה רק ל־Vercel BFF; BFF מאמת Clerk session ומצרף Workload identity; Railway מאמת את שניהם ואינו Origin עסקי ישיר ל־Browser.

35.5.14.4 משימת המשך: ליצור Trust-boundary/route matrix עבור Browser→BFF→Railway; 5–7 שעות.

35.5.14.5 Acceptance: אין Client bundle secret, אין Direct browser business route ל־Railway ואין Preview identity שיכולה להגיע ל־Production.

35.5.14.6.1 בדיקה חיובית: Session+workload תקינים מגיעים ל־Tenant authorization ב־Railway.

35.5.14.6.2 בדיקה שלילית: direct Railway call, wrong aud/azp/org או Preview→Prod נדחים.

35.5.14.6.3 בדיקת כשל: OIDC/Clerk unavailable; mutation נכשלת סגור ו־read-only health נשאר לפי Policy.

35.5.14.6.4 בדיקת Concurrency: User מחליף Organization בזמן Polling; כל Request משתמש ב־token/context המתאים ואינו דולף.

35.5.14.7 Evidence: `docs/evidence/architecture/mp-f014/browser-bff-boundary.json`; מצב `pending`.

35.5.14.8 Detection: Alert על Railway request ללא workload/user proof ועל Preview principal ב־Production.

35.5.14.9 Rollback/Disable: לבטל BFF mutations או Railway ingress, להשאיר UI read-only ולהחזיר Deployment digest מאומת.

35.5.14.10 Gate: חוסם 5, ‏6.1, ‏8, ‏24 ו־30.

35.5.14.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.15 MP-F015 — מטריצת RLS bypass חלקית.

35.5.15.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. רשימת bypass רחבה שולבה, אך Principal decisions, SQL tests ו־live proof חסרים.

35.5.15.2 מיקום: 12.6.5–12.6.9, ‏12.7.1–12.7.7, ‏12.14.

35.5.15.3 תיקון תכנוני: לקבע לכל owner/superuser/BYPASSRLS/migrator/API/worker/verifier/backup/replication/function/view/trigger/pool/support האם RLS חלה, בקרה חלופית, TTL, Evidence ו־revocation.

35.5.15.4 משימת המשך: להשלים decision row לכל Principal וסוג Object במטריצה; 6–8 שעות.

35.5.15.5 Acceptance: אין Business traffic תחת Principal שעוקף RLS; כל Object/operation חוצה־Tenant מקבל deny proof חי.

35.5.15.6.1 בדיקה חיובית: API/Worker רואים רק Tenant context הנוכחי.

35.5.15.6.2 בדיקה שלילית: owner, SET ROLE, SECURITY DEFINER, search_path, COPY, view או pool reuse אינם מאפשרים Tenant breakout.

35.5.15.6.3 בדיקת כשל: Tenant context חסר/שגוי גורם deny ולא default tenant.

35.5.15.6.4 בדיקת Concurrency: pooled connection מחליף Tenant בין Requests ללא שאריות session state.

35.5.15.7 Evidence: `docs/evidence/data/mp-f015/rls-bypass-matrix-and-live-report.json`; מצב `pending`.

35.5.15.8 Detection: periodic cross-tenant canary queries, privilege drift ו־alert על BYPASSRLS/owner business query.

35.5.15.9 Rollback/Disable: להשבית Principal/Route הפגום, revoke grants ולחזור לגרסת policy האחרונה; אין הסרת RLS.

35.5.15.10 Gate: חוסם 7, ‏20, ‏24 ו־30.

35.5.15.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.16 MP-F016 — Evidence של 90 יום אינו מיידי.

35.5.16.1 חומרה ומצב: `P0`; ‏`open-text-corrected`. Gate 23.1 הופרד מ־23.2 והוגדר מינימום 90 ימי Calendar, אך Cohort טרם התחיל/הוכח.

35.5.16.2 מיקום: 5.10, ‏28.8.5, ‏28.15.1–28.15.3.

35.5.16.3 תיקון תכנוני: Closed Pilot יכול להשתמש ב־23.1 לאחר Backup+Restore ראשון; Claim ל־90 יום/GA דורש 23.2 לאחר Cohort אמיתי בן 90 יום.

35.5.16.4 משימת המשך: ליצור Cohort ledger עם start condition, daily validity, retention expiry ו־eligible restore sample; 4–6 שעות.

35.5.16.5 Acceptance: 23.2 נסגר רק לאחר 90 ימים רציפים של Backups תקפים והוכחת Restore מ־locked backup ותיק.

35.5.16.6.1 בדיקה חיובית: כל יום ב־Cohort כולל manifest, signature, WORM ו־job status.

35.5.16.6.2 בדיקה שלילית: Config `90 days` ללא Objects ותאריכים אינו מתקבל.

35.5.16.6.3 בדיקת כשל: יום חסר/invalid מאפס או מתקן את חלון הזכאות לפי Policy מפורשת; אין הסתרת הפער.

35.5.16.6.4 בדיקת Concurrency: lifecycle job ו־retention verifier פועלים במקביל בלי למחוק את ה־sample הנבדק.

35.5.16.7 Evidence: `docs/evidence/recovery/mp-f016/retention-cohort-ledger.json`; מצב `pending`.

35.5.16.8 Detection: Daily monitor על gap, early expiry, invalid signature ו־Object קטן מ־90 יום שנבחר ל־claim.

35.5.16.9 Rollback/Disable: לבטל 90-day/Ransomware claim ולהישאר ב־Closed Pilot 23.1 אם שאר תנאיו תקפים.

35.5.16.10 Gate: חוסם 23.2 ו־30; 23.1 נפרד.

35.5.16.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.17 MP-F017 — Audit anchor אינו חיצוני ו־WORM.

35.5.17.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. KMS asymmetric signature ו־Evidence account נפרד שולבו, אך trust policy, immutable receipt ו־verification drill חסרים.

35.5.17.2 מיקום: 12.10.4, ‏12.14.

35.5.17.3 תיקון תכנוני: Batch manifest חתום במפתח א־סימטרי שאינו נגיש ל־Runtime, משוכפל לחשבון Evidence נפרד עם Versioning/Object Lock ו־trusted timestamp/previous digest.

35.5.17.4 משימת המשך: להגדיר Key policy, signer principal, verifier, retention ו־external anchor format; 5–7 שעות.

35.5.17.5 Acceptance: Runtime/DB admin אינם יכולים לשכתב Record+digest+anchor בלי verification failure.

35.5.17.6.1 בדיקה חיובית: chain ו־KMS signature מאומתים מחשבון Verifier נפרד.

35.5.17.6.2 בדיקה שלילית: modified record, reordered batch, wrong key/version או missing predecessor נדחים.

35.5.17.6.3 בדיקת כשל: signer unavailable; batch נשמר pending ולא מוכרז anchored.

35.5.17.6.4 בדיקת Concurrency: שני batch writers מקבלים sequence ranges לא חופפים ו־single predecessor חוקי.

35.5.17.7 Evidence: `docs/evidence/audit/mp-f017/external-anchor-verification.json`; מצב `pending`.

35.5.17.8 Detection: alert על signature/chain gap, delayed anchor, policy drift או deletion attempt.

35.5.17.9 Rollback/Disable: לעצור Audit-dependent mutations או לעבור Read-only; אין לחתום במפתח Runtime חלופי.

35.5.17.10 Gate: חוסם 7, ‏20, ‏24 ו־30.

35.5.17.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.18 MP-F018 — Static outbound IP אינו Destination firewall.

35.5.18.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. המסמך אוסר Claim ל־egress allowlist ללא packet evidence, אך Hosting capability וה־disabled surface matrix חסרים.

35.5.18.2 מיקום: 9.6.6, ‏34.32.2.16.

35.5.18.3 תיקון תכנוני: להפריד Source-IP stability מ־destination enforcement; להשתמש ב־application destination pinning, DNS/IP policy, redirect limits ו־Network control רק אם הוכח.

35.5.18.4 משימת המשך: לבצע Capability evidence design ל־Railway egress ולמפות Compensating controls; 4–6 שעות.

35.5.18.5 Acceptance: אין SSRF/egress security claim המבוסס רק על outbound IP; URL ingestion/Generic connectors כבויים אם אין enforcement מוכח.

35.5.18.6.1 בדיקה חיובית: Meta/OpenAI/Billing hosts מאושרים נגישים דרך Adapter.

35.5.18.6.2 בדיקה שלילית: localhost, private/link-local, metadata, DNS rebinding, redirect ו־unapproved host נדחים.

35.5.18.6.3 בדיקת כשל: DNS/Firewall evidence לא זמין; ה־Generic outbound capability נשאר כבוי.

35.5.18.6.4 בדיקת Concurrency: DNS משתנה בין validation ל־connect; resolved destination נבדק מחדש/מחויב לאותה פעולה.

35.5.18.7 Evidence: `docs/evidence/network/mp-f018/egress-capability-report.json`; מצב `pending`.

35.5.18.8 Detection: egress telemetry לפי destination, DNS change ו־blocked private ranges.

35.5.18.9 Rollback/Disable: להשבית URL fetch/connectors ולשמור Adapters בעלי destination קבוע בלבד.

35.5.18.10 Gate: חוסם 5, ‏6.1, ‏18.2 לפי Scope, ‏24 ו־30.

35.5.18.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.19 MP-F019 — חסרה תשתית חשבונות AWS.

35.5.19.1 חומרה ומצב: `P1`; ‏`open-external-blocked`. D14-A1 נבחרה ו־Separate backup/evidence accounts נדרשים, אך account IDs, Owners, KMS/IAM/SCP ו־live evidence הם `unknown/unavailable`.

35.5.19.2 מיקום: 28.6.7, ‏34.33.16.1, ‏35.2.21.2.

35.5.19.3 תיקון תכנוני: להגדיר AWS organization/account boundary נפרד ל־Production storage, Backup ו־Evidence; Root/MFA, billing, KMS admins/users, SCP, break-glass ו־offboarding.

35.5.19.4 משימת המשך: ליצור AWS account foundation decision packet ו־RACI שמי לבעלי החשבונות והמפתחות; 5–7 שעות.

35.5.19.5 Acceptance: כל Account/Region/Owner/Backup/Reviewer/Key policy/SCP/Cost cap קבועים ומאושרים לפני יצירת Resource.

35.5.19.6.1 בדיקה חיובית: Backup principal כותב Object אך Production runtime אינו מנהל Retention/Key.

35.5.19.6.2 בדיקה שלילית: cross-account access לא מאושר, public policy, root key או shared admin נדחים.

35.5.19.6.3 בדיקת כשל: Owner/MFA/KMS recovery unavailable; Gate נשאר חסום ומופעל break-glass rehearsal בלבד.

35.5.19.6.4 בדיקת Concurrency: שני Admins משנים Policy; approval/version controls מונעים החלפה לא מבוקרת.

35.5.19.7 Evidence: `docs/evidence/aws/mp-f019/account-foundation-pack.json`; מצב `pending`.

35.5.19.8 Detection: AWS Config/CloudTrail alerts על account/policy/key/retention drift.

35.5.19.9 Rollback/Disable: לא ליצור/לקשר Bucket חי; לבטל grants זמניים ולשמור Upload/Backup claims כבויים.

35.5.19.10 Gate: חוסם 6.3, ‏23.1, ‏23.2 ו־30.

35.5.19.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.20 MP-F020 — MFA שאינו Phishing-resistant לחשבונות חזקים.

35.5.20.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. Passkey/WebAuthn/Hardware key נדרשים לחשבונות חזקים, אך provider capability, roster ו־recovery drill חסרים.

35.5.20.2 מיקום: 13.8.1–13.8.6, ‏25.8, ‏35.2.8.

35.5.20.3 תיקון תכנוני: Owner/Admin/System Admin/Support/Finance/Security ו־Control planes משתמשים ב־phishing-resistant authentication ושני Authenticators; TOTP הוא חריג זמני מתועד.

35.5.20.4 משימת המשך: להפיק Privileged identity roster ו־Authenticator/recovery capability matrix; 4–6 שעות.

35.5.20.5 Acceptance: כל Principal חזק מוכיח phishing-resistant sign-in או חריג בעל Expiry, compensating control ו־No-Go לפעולות P0/P1.

35.5.20.6.1 בדיקה חיובית: WebAuthn/Hardware key ו־fresh reauthentication מאפשרים פעולה רגישה.

35.5.20.6.2 בדיקה שלילית: password-only, MFA fatigue, stale TOTP exception או recovered session ללא freeze נדחים.

35.5.20.6.3 בדיקת כשל: אובדן Device/Authenticator מפעיל recovery רב־שלבי, revoke ו־notification.

35.5.20.6.4 בדיקת Concurrency: Recovery ו־פעולה רגישה במקביל; privilege freeze קודם ל־mutation.

35.5.20.7 Evidence: `docs/evidence/identity/mp-f020/privileged-auth-roster.json`; מצב `pending`.

35.5.20.8 Detection: alert על password/TOTP-only privileged login, reset, new authenticator ו־recovery anomaly.

35.5.20.9 Rollback/Disable: להשעות Principal/role רגיש ולהשתמש ב־break-glass מאושר בלבד.

35.5.20.10 Gate: חוסם 3, ‏8, ‏20, ‏24 ו־30.

35.5.20.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.21 MP-F021 — חסר Randomness/CSPRNG registry.

35.5.21.1 חומרה ומצב: `P1`; ‏`open-external-blocked`. הסיווג התכנוני שולב, אך Randomness inventory, ‏Security design/review ו־X24 — האישור השימושי הנדרש מטל לפני Implementation של CSPRNG ובפרט `crypto.randomUUID()` — הם `unknown/unavailable`.

35.5.21.2 מיקום: 10.16.5–10.16.5.4, ‏34.33.25, ‏34.36.5.2.

35.5.21.3 תיקון תכנוני: לסווג כל שימוש כ־Deterministic business ID, security value המחייב OS CSPRNG, או deterministic test corpus; אין Randomness לנוחות.

35.5.21.4 משימת המשך: להפיק source/design inventory לכל ID, token, nonce, key ו־test generator; 5–7 שעות.

35.5.21.5 Acceptance: לכל שימוש יש category, algorithm/source, entropy/TTL/rotation אם Security, approval ו־test; אפס שימוש ב־`Math.random()`.

35.5.21.6.1 בדיקה חיובית: canonical content יוצר אותו business ID; security token משתמש רק במקור שאושר.

35.5.21.6.2 בדיקה שלילית: `Math.random()`, UUID לא מאושר, predictable nonce או test ordering אקראי נחסמים.

35.5.21.6.3 בדיקת כשל: CSPRNG unavailable או approval חסר; היכולת נשארת כבויה.

35.5.21.6.4 בדיקת Concurrency: שני Requests עם אותו canonical business content מקבלים idempotency identity עקבית ולא duplicate random IDs.

35.5.21.7 Evidence: `docs/evidence/security/mp-f021/randomness-registry.json`; מצב `pending`.

35.5.21.8 Detection: source guard ו־dependency scan על APIs אקראיים ושימוש לא רשום.

35.5.21.9 Rollback/Disable: להשבית Use case חדש, לחזור ל־deterministic implementation המאושר ולסובב security values שנפגעו.

35.5.21.10 Gate: חוסם 5, ‏24, ‏29 ו־30.

35.5.21.11 Owner: Security/Architecture owner לתכנון, בחירה וביקורת של CSPRNG הוא `unknown/unavailable`; טל הוא Authority רק לאישור השימוש הספציפי ב־X24 לפי הכלל שנתן ואינו Owner טכני. Primary, ‏Backup ו־Reviewers `unknown/unavailable`.

35.5.22 MP-F022 — Mutation/Fuzz corpus אינו דטרמיניסטי וממוספר.

35.5.22.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. דרישת Corpus deterministic/versioned/digest-bound שולבה, אך corpus inventory ו־tool proof חסרים.

35.5.22.2 מיקום: 10.16.5.4, ‏29.5.4.

35.5.22.3 תיקון תכנוני: להשתמש ב־vectors קבועים; Property-based test רק עם Seed קבוע ומתועד ורק אם הספרייה אינה קוראת `Math.random()`.

35.5.22.4 משימת המשך: ליצור Corpus manifest הכולל case ID, input digest, expected result, source ו־coverage; 5–7 שעות.

35.5.22.5 Acceptance: שתי הרצות מאותו Commit/Toolchain מפיקות אותו סדר, אותם inputs ואותם digests.

35.5.22.6.1 בדיקה חיובית: Corpus replay מחזיר תוצאות זהות.

35.5.22.6.2 בדיקה שלילית: case ללא ID/digest או library המשתמשת ב־Randomness לא מוכחת נחסמים.

35.5.22.6.3 בדיקת כשל: Corpus file פגום/חסר; Suite נכשלת סגור ואינה מדלגת.

35.5.22.6.4 בדיקת Concurrency: שני עורכים מוסיפים אותו case ID; merge check מזהה Collision.

35.5.22.7 Evidence: `docs/evidence/testing/mp-f022/corpus-manifest.json`; מצב `pending`.

35.5.22.8 Detection: CI משווה corpus digest, order ו־case count.

35.5.22.9 Rollback/Disable: לחזור לגרסת Corpus המאומתת ולהסיר Tool שאינו deterministic.

35.5.22.10 Gate: חוסם 24, ‏29 ו־30.

35.5.22.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.23 MP-F023 — חסרים VDP, PSIRT ו־security.txt.

35.5.23.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. הדרישות שולבו אך Contact, legal safe-harbor, PSIRT roster ו־end-to-end report drill חסרים.

35.5.23.2 מיקום: 7.7.12, ‏35.2.20.

35.5.23.3 תיקון תכנוני: RFC 9116 security.txt הוא רק Entry point; נדרשים monitored contact, VDP scope/policy, Safe-harbor משפטי, SLA, triage/escalation, disclosure ו־malicious-attachment runbook.

35.5.23.4 משימת המשך: ליצור VDP/PSIRT decision packet ו־RFC 9116 field checklist; 5–7 שעות.

35.5.23.5 Acceptance: Report מבוקר נכנס דרך Contact, מקבל Ack/Triage, נשמר כ־Case, מסלים ונענה בלי לפרסם כתובת אישית.

35.5.23.6.1 בדיקה חיובית: security.txt תקף מפנה ל־Contact/Policy וה־PSIRT קולט Case.

35.5.23.6.2 בדיקה שלילית: expired file, wrong canonical origin, unmonitored address או unsafe attachment נחסמים/מתריעים.

35.5.23.6.3 בדיקת כשל: mailbox/provider unavailable; מסלול חלופי מאושר מקבל דיווח.

35.5.23.6.4 בדיקת Concurrency: duplicate reports לאותו finding מתאחדים בלי לאבד Reporter/evidence.

35.5.23.7 Evidence: `docs/evidence/psirt/mp-f023/vdp-drill-report.json`; מצב `pending`.

35.5.23.8 Detection: monthly contact test ו־expiry alerts ב־30/14/7 ימים.

35.5.23.9 Rollback/Disable: להסיר Policy שגויה, לפרסם Contact בטוח חלופי ולהשאיר Pilot חיצוני חסום.

35.5.23.10 Gate: חוסם 2, ‏24, ‏26.1 ו־30.

35.5.23.11 Owner/Reviewer: כולם `unknown/unavailable`; Legal approver `unknown/unavailable`.

35.5.24 MP-F024 — חסר SDL מבוסס SSDF/SAMM.

35.5.24.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. Framework registry ו־SDL requirements נוספו, אך SSDF mapping, SAMM assessment ו־PR evidence חסרים.

35.5.24.2 מיקום: 7.7.11, ‏35.2.4.

35.5.24.3 תיקון תכנוני: למפות SSDF practices ל־Training, Design, DoD, review, testing, dependency response ו־exceptions; SAMM משמש maturity assessment ולא Claim ללא בדיקה.

35.5.24.4 משימת המשך: להשלים SSDF practice inventory ו־SAMM baseline worksheet ראשון; 6–8 שעות.

35.5.24.5 Acceptance: כל Practice ישים מקושר ל־Task, Owner, Evidence ו־Gap; לפחות PR אחד מוכיח Enforcement בפועל.

35.5.24.6.1 בדיקה חיובית: שינוי רגיש עובר Design/security review ו־required checks.

35.5.24.6.2 בדיקה שלילית: Policy-only, N/A ללא נימוק או bypass של DoD אינם מתקבלים.

35.5.24.6.3 בדיקת כשל: Training/check unavailable; sensitive merge נשאר חסום.

35.5.24.6.4 בדיקת Concurrency: Policy ו־workflow משתנים במקביל; version mismatch מחייב re-review.

35.5.24.7 Evidence: `docs/evidence/sdl/mp-f024/ssdf-samm-crosswalk.json`; מצב `pending`.

35.5.24.8 Detection: quarterly maturity delta ו־PR sampling monitor.

35.5.24.9 Rollback/Disable: להחזיר Workflow האחרון המאומת ולא לאפשר merge עם Policy בלבד.

35.5.24.10 Gate: חוסם 2, ‏24, ‏29 ו־30.

35.5.24.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.25 MP-F025 — שינויים רגישים ללא שני Reviewers ובדיקות Workflow attacks.

35.5.25.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. Two-reviewer policy ו־GitHub workflow threats שולבו, אך Ruleset capability, CODEOWNERS ושמות Reviewers אינם מוכחים.

35.5.25.2 מיקום: 7.4.2, ‏7.7.1–7.7.12, ‏34.35.8.5.

35.5.25.3 תיקון תכנוני: Auth/Tenant/Billing/Meta/DB/Migration/CI/Secrets/AI/Retention/Backup/Release דורשים שני Reviewers עצמאיים, CODEOWNER, stale-approval dismissal ו־workflow attack tests.

35.5.25.4 משימת המשך: להכין sensitive-path inventory ו־Ruleset/CODEOWNERS expected matrix; 5–7 שעות.

35.5.25.5 Acceptance: שינוי רגיש אינו mergeable עם Reviewer יחיד, self-approval, stale approval או workflow privilege escalation.

35.5.25.6.1 בדיקה חיובית: שני Reviewers מתאימים ו־checks תקינים מאפשרים merge.

35.5.25.6.2 בדיקה שלילית: `pull_request_target`, `workflow_run`, untrusted checkout, cache/artifact poisoning, command injection או overbroad token נחסמים.

35.5.25.6.3 בדיקת כשל: CODEOWNER/Reviewer unavailable; merge נשאר חסום.

35.5.25.6.4 בדיקת Concurrency: Push לאחר Approval מבטל את שני האישורים ודורש Review מחדש.

35.5.25.7 Evidence: `docs/evidence/github/mp-f025/sensitive-review-enforcement.json`; מצב `pending`.

35.5.25.8 Detection: GitHub audit על ruleset drift, bypass, token permission ו־unpinned action.

35.5.25.9 Rollback/Disable: להשבית Workflow מסוכן, לשחזר Ruleset מאומת ולבטל credentials/artifacts שנוצרו.

35.5.25.10 Gate: חוסם 2, ‏24, ‏29 ו־30.

35.5.25.11 Owner/Reviewer: Primary ו־שני Reviewers שמיים `unknown/unavailable`.

35.5.26 MP-F026 — גישה אנושית ל־Production DB אינה JIT.

35.5.26.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. JIT עד 30 דקות, שני מאשרים ו־principal אישי הוגדרו, אך platform capability ו־drill חסרים.

35.5.26.2 מיקום: 12.6.7–12.6.9.

35.5.26.3 תיקון תכנוני: ברירת המחדל היא no-human-access; חריגה דורשת Incident/Ticket, identity אישית, MFA, שני מאשרים, least privilege, TTL, evidence, revoke ו־post-review.

35.5.26.4 משימת המשך: ליצור JIT access state machine ו־Railway/PostgreSQL capability matrix; 5–7 שעות.

35.5.26.5 Acceptance: Credential ישן, pooled session או runtime credential אינם שורדים Expiry ואינם מאפשרים גישה אנושית.

35.5.26.6.1 בדיקה חיובית: Grant מצומצם פעיל רק במשך החלון המאושר.

35.5.26.6.2 בדיקה שלילית: shared/runtime credential, no-ticket, self-approval, scope רחב או expired session נדחים.

35.5.26.6.3 בדיקת כשל: auto-revoke נכשל; alert P0 משבית principal/network path ידנית לפי Runbook.

35.5.26.6.4 בדיקת Concurrency: revoke מתרחש בזמן transaction/pool reuse; session הישן אינו ממשיך לאחר Expiry.

35.5.26.7 Evidence: `docs/evidence/data/mp-f026/jit-access-drill.json`; מצב `pending`.

35.5.26.8 Detection: Alert על direct human login, grant מעל TTL, role drift ו־session אחרי revoke.

35.5.26.9 Rollback/Disable: revoke role/credential, terminate sessions ולנעול human network path.

35.5.26.10 Gate: חוסם 7, ‏20, ‏24 ו־30.

35.5.26.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.27 MP-F027 — Presigned URL ניתן ל־Replay/Overwrite.

35.5.27.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. Durable one-shot state, server key, checksum ו־VersionId דרישות נוספו, אך S3 policy/live tests חסרים.

35.5.27.2 מיקום: 19.8.6–19.8.9, ‏23.6.2–23.6.7.

35.5.27.3 תיקון תכנוני: Upload session קושר Tenant, Actor, Purpose, server-selected key, Method, exact MIME/size/checksum/KMS/expiry, single-use state ו־Policy version; אין overwrite.

35.5.27.4 משימת המשך: להפיק Presigned upload transition/policy table כולל VersionId ו־signatureAge; 6–8 שעות.

35.5.27.5 Acceptance: URL שהושלם/פג/בוטל או הועתק ל־Tenant/Object אחר אינו יכול ליצור Clean object, overwrite או second version מאושר.

35.5.27.6.1 בדיקה חיובית: PUT יחיד עם checksum מדויק יוצר VersionId קשור ל־session.

35.5.27.6.2 בדיקה שלילית: replay, wrong key, MIME, checksum, size, Tenant, ACL, KMS או expired URL נדחים.

35.5.27.6.3 בדיקת כשל: upload נקטע; Object חלקי נשאר Quarantine/aborted ואינו נסרק כ־Clean.

35.5.27.6.4 בדיקת Concurrency: שני PUTs לאותה session; אחד בלבד נרשם כ־accepted והשני quarantined/denied.

35.5.27.7 Evidence: `docs/evidence/storage/mp-f027/presigned-one-shot-report.json`; מצב `pending`.

35.5.27.8 Detection: Alert על second use, overwrite, unexpected VersionId, checksum mismatch ו־orphan object.

35.5.27.9 Rollback/Disable: לבטל session, quarantine/delete לפי Policy, להשבית upload issue route ולשמור Metadata לחקירה.

35.5.27.10 Gate: חוסם 6.3, ‏14.2, ‏18.2 לפי Scope, ‏24 ו־30.

35.5.27.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.28 MP-F028 — סתירה בין DOCX מותר ל־Archive אסור.

35.5.28.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. DOCX הוגדר כ־OOXML ZIP container מיוחד ומאומת; generic/nested archive ו־active content נחסמים. Parser/scanner evidence חסר.

35.5.28.2 מיקום: 5.8, ‏23.6.1–23.7.6, ‏34.28.7.4–34.28.7.5.

35.5.28.3 תיקון תכנוני: להבחין בין approved OOXML container לבין Archive כללי; לחסום DOCM, macros, OLE, external relationships, nested archives, renamed ZIP ו־resource bombs.

35.5.28.4 משימת המשך: ליצור deterministic file-policy corpus ומטריצת Extension×MIME×Magic×container; 6–8 שעות.

35.5.28.5 Acceptance: רק PDF/TXT/DOCX עד 10 MiB, כולל post-decompression budgets, מגיעים ל־Scan/Parse; כל סוג אחר חסום.

35.5.28.6.1 בדיקה חיובית: DOCX תקין עם structure מאושר עובר ל־Quarantine scan.

35.5.28.6.2 בדיקה שלילית: DOCM, ZIP renamed, nested archive, OLE, external link, polyglot, encrypted או bomb נחסמים.

35.5.28.6.3 בדיקת כשל: parser/scanner timeout או unsupported verdict משאיר file לא־Clean.

35.5.28.6.4 בדיקת Concurrency: Object מוחלף בין scan ל־parse; VersionId mismatch דוחה processing.

35.5.28.7 Evidence: `docs/evidence/files/mp-f028/file-policy-corpus.json`; מצב `pending`.

35.5.28.8 Detection: monitor על MIME/magic drift, parser version, compression budgets ו־Clean ללא scanner receipt.

35.5.28.9 Rollback/Disable: להשבית DOCX בנפרד ולהשאיר PDF/TXT רק אם Evidence שלהם תקף.

35.5.28.10 Gate: חוסם 6.3, ‏18.2, ‏24 ו־30.

35.5.28.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.29 MP-F029 — Freshness מספרי ל־WhatsApp rate evidence חסר.

35.5.29.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. TTL מספרי שולב כ־Connect safety policy, אך live provider measurements ו־operational owner evidence חסרים.

35.5.29.2 מיקום: 16.5.8–16.5.8.6, ‏16.11.1, ‏34.32.2.12.4.

35.5.29.3 תיקון תכנוני: throughput live עד חמש דקות; degraded conservative עד 15 דקות; מעבר ל־15 דקות חסום. Template/phone/WABA/quality snapshots מקבלים TTL ותוקף לפי מצב Campaign.

35.5.29.4 משימת המשך: להפיק Rate evidence schema ו־boundary test table ל־4:59/5:00/14:59/15:00 עם 30 שניות skew; 5–7 שעות.

35.5.29.5 Acceptance: כל Permit קושר rate/quality source, effectiveAt, checkedAt, expiry ו־policy version; stale/unknown חוסם Send.

35.5.29.6.1 בדיקה חיובית: Snapshot תקף מתיר רק capacity השמרנית המחושבת.

35.5.29.6.2 בדיקה שלילית: stale snapshot, quality downgraded, unknown limit או provider 429 אינם מאפשרים capacity ישנה.

35.5.29.6.3 בדיקת כשל: Meta endpoint/docs unavailable; המערכת עוברת degraded ואז blocked לפי TTL.

35.5.29.6.4 בדיקת Concurrency: Quality יורדת בזמן Reservation; Permit מבצע recheck סמוך ל־attempt ומבטל capacity ישנה.

35.5.29.7 Evidence: `docs/evidence/whatsapp/mp-f029/rate-freshness-report.json`; מצב `pending`.

35.5.29.8 Detection: dashboard/alerts על snapshot age, quality change, 429, queue lag ו־blocked/degraded mode.

35.5.29.9 Rollback/Disable: לעצור Campaign/Bot Send, לבצע Drain ולחזור ל־safe capacity רק אחרי Fresh evidence.

35.5.29.10 Gate: חוסם 11, ‏12.2, ‏15, ‏26.1 ו־30.

35.5.29.11 Owner: טל הוא Owner המחקר השוטף; Backup `unknown/unavailable`; Reviewer 1 ו־Reviewer 2 `unknown/unavailable`.

35.5.30 MP-F030 — QA היסטורי הוצג כעדכני.

35.5.30.1 חומרה ומצב: `P1`; ‏`open-explicitly-invalidated`. סעיף 34.38 מסומן היסטורי, אך QA מבני/links/references/DAG/tasks/sources/secrets ו־Digest סופי עדיין `pending`.

35.5.30.2 מיקום: 34.38, ‏34.38.9–34.38.10, ‏34.36.

35.5.30.3 תיקון תכנוני: להפריד Snapshot 1.0 historical evidence מ־Draft 1.1 ולהפיק QA חדש בלבד לאחר השלמת Section 35.

35.5.30.4 משימת המשך: ליצור Final-QA checklist versioned עם כל Assertions שנפסלו וסיבת ה־retest; 4–6 שעות.

35.5.30.5 Acceptance: אין Claim `passed/complete/no findings` המבוסס על Snapshot ישן; QA חדש כולל methods, counts, findings, corrections, residual unknowns ו־digest.

35.5.30.6.1 בדיקה חיובית: Report חדש מצביע לאותו final document digest.

35.5.30.6.2 בדיקה שלילית: Report ישן, digest mismatch או missing check אינם מתקבלים.

35.5.30.6.3 בדיקת כשל: כלי QA/Link unavailable; status נשאר pending ולא Passed.

35.5.30.6.4 בדיקת Concurrency: שינוי למסמך בזמן QA מבטל את run באמצעות digest mismatch.

35.5.30.7 Evidence: `docs/evidence/master-plan/mp-f030/final-qa-report.json`; מצב `pending`.

35.5.30.8 Detection: כל שינוי אחרי QA פותח מחדש Gate 29 ומבטל digest.

35.5.30.9 Rollback/Disable: להסיר claim/approval שנשען על QA שגוי ולחזור ל־BLOCKED.

35.5.30.10 Gate: חוסם 29, ‏1 ו־30.

35.5.30.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.31 MP-F031 — 34 תחומי Cyber הם Baseline בלבד.

35.5.31.1 חומרה ומצב: `P1`; ‏`open-partially-corrected`. Framework registry 35.2 נוסף, אך Crosswalk מלא מ־Framework controls ל־Threat/Task/Test/Evidence ו־N/A review חסר.

35.5.31.2 מיקום: 34.32, ‏34.35.4, ‏35.2.1–35.2.24.

35.5.31.3 תיקון תכנוני: להשתמש ב־34 domains המקוריים כ־product threat baseline בלבד; להרחיב ל־42 Domains, כולל Browser/BFF, test/evidence provenance, crypto/PQC, Public API/webhooks/connectors, Multi-region, Native, planning integrity ו־PWA persistent-browser runtime; בנוסף לבצע Crosswalk ל־CSF, 800-53/53A, SSDF/SAMM, ASVS/AISVS, CIS, CCM, ATT&CK/CAPEC, KEV ו־provider/legal deltas.

35.5.31.4 משימת המשך: להפיק Crosswalk slice ראשון ל־Govern/Identity/Tenant/Send/Backup עם Applicable/N/A והוכחה; 6–8 שעות.

35.5.31.5 Acceptance: כל Control ישים מקושר לפחות ל־Asset, Threat/Risk, leaf task, test, evidence, owner ו־Gate; N/A כולל Reviewer.

35.5.31.6.1 בדיקה חיובית: כל Domain חוסם ממופה ל־framework requirements ול־evidence.

35.5.31.6.2 בדיקה שלילית: “covered by 34/41/42 domains” ללא requirement/test/evidence אינו מתקבל.

35.5.31.6.3 בדיקת כשל: Framework source פג או version השתנה; delta task נפתח וה־claim מושעה.

35.5.31.6.4 בדיקת Concurrency: שני framework refreshes לאותו control יוצרים version conflict ולא N/A שקט.

35.5.31.7 Evidence: `docs/evidence/governance/mp-f031/framework-crosswalk.json`; מצב `pending`.

35.5.31.8 Detection: freshness monitor ו־coverage check על unmapped/expired controls.

35.5.31.9 Rollback/Disable: לחזור ל־framework digest האחרון ולהשאיר affected capability/Gate חסומים.

35.5.31.10 Gate: חוסם 29 ו־30.

35.5.31.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.32 MP-F032 — SHA חשוף למזהים בעלי Entropy נמוכה.

35.5.32.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. HMAC עם domain/environment/use separation שולב, אך key design, rotation ו־reindex proof חסרים.

35.5.32.2 מיקום: 12.11.4.

35.5.32.3 תיקון תכנוני: טלפון, אימייל, WABA ID ו־Provider IDs בעלי מרחב קטן משתמשים ב־HMAC עם key ייעודי, framing, key version, rotation ו־reindex; אין correlation לא נדרש.

35.5.32.4 משימת המשך: ליצור Pseudonymization field/key/purpose matrix; 5–7 שעות.

35.5.32.5 Acceptance: אין low-entropy identifier שעובר SHA חשוף או משתמש באותו key בין Environments/Tenants/Purposes בניגוד למדיניות.

35.5.32.6.1 בדיקה חיובית: אותו canonical value ואותו purpose/key version מפיקים digest עקבי.

35.5.32.6.2 בדיקה שלילית: dictionary attack על SHA fixture, cross-purpose correlation או wrong key version אינם עוברים.

35.5.32.6.3 בדיקת כשל: KMS/key unavailable; lookup/write נכשל סגור ואינו נופל ל־SHA.

35.5.32.6.4 בדיקת Concurrency: rotation ו־write במקביל משתמשים ב־version מפורש ותומכים reindex ללא אובדן.

35.5.32.7 Evidence: `docs/evidence/privacy/mp-f032/pseudonymization-matrix.json`; מצב `pending`.

35.5.32.8 Detection: source/data scan על SHA של fields אסורים, unknown key version ו־cross-environment digest reuse.

35.5.32.9 Rollback/Disable: להשבית lookup/write affected, לחזור ל־key version המאושרת ולבצע reindex מתועד; אין silent rehash.

35.5.32.10 Gate: חוסם 7, ‏21.1, ‏21.2, ‏24 ו־30.

35.5.32.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.33 MP-F033 — חסרים Unknown-outcome ledgers לכל Side effect חיצוני.

35.5.33.1 חומרה ומצב: `P1`; ‏`open-partially-corrected`. Send ledger ו־generic invariant קיימים; Template submission, Provider media upload ו־Hosted checkout אינם מתועדים עדיין כ־ledgers נפרדים בעלי אותו חוזה.

35.5.33.2 מיקום: 9.7.4, ‏17.11, ‏17.16.7, ‏19.13.2, ‏24.8–24.16.

35.5.33.3 תיקון תכנוני: לכל Side effect חיצוני ליצור intent/acquisition/attempt/fact/unknown/reconcile/finalize ledger עם exact provider identity, binding digest ו־no-blind-retry.

35.5.33.4 משימת המשך: להפיק Boundary registry ל־Template submission, media upload ו־checkout creation; 6–8 שעות.

35.5.33.5 Acceptance: Timeout לאחר attempt אינו Success/Failure אוטומטי ואינו Retry; כל operation ניתנת ל־reconcile לפי Provider identity רשמית.

35.5.33.6.1 בדיקה חיובית: Provider receipt מאומת משלים Fact פעם אחת.

35.5.33.6.2 בדיקה שלילית: correlation לפי timestamp/recipient בלבד או redirect success ב־checkout נדחים.

35.5.33.6.3 בדיקת כשל: timeout/connection reset/malformed response אחרי boundary נשאר unknown.

35.5.33.6.4 בדיקת Concurrency: worker/retry/webhook כפולים מתכנסים ל־attempt יחיד ו־facts מונוטוניים.

35.5.33.7 Evidence: `docs/evidence/providers/mp-f033/unknown-outcome-boundary-registry.json`; מצב `pending`.

35.5.33.8 Detection: alert על unknown מעל SLA, operation ללא fact/uncertainty, duplicate provider identity או retry אחרי unknown.

35.5.33.9 Rollback/Disable: להשבית operation family, לשמר inbound facts ולהמשיך Manual reconciliation בלבד.

35.5.33.10 Gate: חוסם 12.2.5, ‏12.2.6, ‏19.3, ‏24 ו־30.

35.5.33.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.34 MP-F034 — אין Recovery ל־GitHub source/history.

35.5.34.1 חומרה ומצב: `P1`; ‏`open-unplanned`. המסמך מזכיר GitHub compromise ו־Clean checkout, אך לא נמצא חוזה Backup/mirror/restore ל־Git refs, protected history, release tags ו־governance exports.

35.5.34.2 מיקום: 7.1–7.9, ‏28.7, ‏34.32.2.30.3.

35.5.34.3 תיקון תכנוני: ליצור encrypted/offsite Git mirror או bundle, refs/tags/commit signature inventory, GitHub settings/rulesets/CODEOWNERS/workflow export ו־isolated restore rehearsal.

35.5.34.4 משימת המשך: להפיק Source-control recovery design ו־asset inventory; 6–8 שעות.

35.5.34.5 Acceptance: אובדן/השתלטות על GitHub מאפשרים שחזור verified history/settings מן Boundary נפרד בלי לקבל rewritten malicious history.

35.5.34.6.1 בדיקה חיובית: fresh isolated repository משוחזר עם refs/tags/commits ו־settings digests צפויים.

35.5.34.6.2 בדיקה שלילית: unsigned/unexpected commit, force-pushed tag, missing object או tampered bundle נדחים.

35.5.34.6.3 בדיקת כשל: GitHub/API unavailable; restore משתמש בעותק offsite ולא מוותר על verification.

35.5.34.6.4 בדיקת Concurrency: Mirror רץ בזמן Push/Tag; snapshot/refs manifest קובע consistency point.

35.5.34.7 Evidence: `docs/evidence/recovery/mp-f034/git-source-restore.json`; מצב `pending`.

35.5.34.8 Detection: scheduled mirror verification, ref/tag drift, settings export diff ו־restore drill expiry.

35.5.34.9 Rollback/Disable: להקפיא merges/releases, לבטל compromised credentials ולשחזר ל־new private repository לאחר forensic approval.

35.5.34.10 Gate: חוסם 2, ‏23.1, ‏23.2, ‏29 ו־30.

35.5.34.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.35 MP-F035 — חסרות הקשחת Container ו־PostgreSQL TLS.

35.5.35.1 חומרה ומצב: `P1`; ‏`open-text-corrected`. Container controls ו־`verify-full` שולבו, אך Railway support, image/OS SBOM, runtime evidence ו־certificate drill חסרים.

35.5.35.2 מיקום: 11.8.9, ‏12.11.2–12.12.2, ‏12.14.

35.5.35.3 תיקון תכנוני: image digest, multi-stage, no compiler/package manager כשאפשר, non-root, read-only filesystem, no-new-privileges, dropped capabilities, no socket/mount, resource limits, OS scans ו־PG host+CA verification.

35.5.35.4 משימת המשך: ליצור Runtime hardening/Platform capability matrix לכל Vercel/Railway service; 6–8 שעות.

35.5.35.5 Acceptance: כל control מסומן live-proven או unsupported+compensating control; PostgreSQL remote connection דוחה wrong CA/host/expired certificate.

35.5.35.6.1 בדיקה חיובית: approved image פועל non-root ומתחבר ל־PG ב־verify-full.

35.5.35.6.2 בדיקה שלילית: root, writable root, extra capability, Docker socket, unpinned image, `sslmode=require`, wrong CA/host או MITM נדחים.

35.5.35.6.3 בדיקת כשל: certificate rotation או platform capability חסרה; readiness נכשלת וה־service אינו מקבל traffic.

35.5.35.6.4 בדיקת Concurrency: cert/image rotation בזמן deploy; רק matching config/artifact version מקודם.

35.5.35.7 Evidence: `docs/evidence/runtime/mp-f035/hardening-and-pg-tls.json`; מצב `pending`.

35.5.35.8 Detection: image/OS vulnerability scan, runtime drift, root/capability alert ו־certificate expiry/handshake monitor.

35.5.35.9 Rollback/Disable: לחזור ל־image digest/certificate bundle המאומתים ולהשבית affected service; אין הורדת TLS verification.

35.5.35.10 Gate: חוסם 6.1, ‏6.2, ‏7, ‏24 ו־30.

35.5.35.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.36 MP-F036 — Manifest חתום ללא Trust anchor מוגדר.

35.5.36.1 חומרה ומצב: `P1`; ‏`open-partially-corrected`. Backup/Audit manifests מקבלים KMS asymmetric signatures, אך אין trust model אחיד ל־Release, Backup, Migration, Export ו־Evidence manifests ואין proof שה־Runtime אינו יכול לזייף אותם.

35.5.36.2 מיקום: 12.10.4, ‏28.6.7, ‏28.15.2, ‏34.31.5.6, ‏34.35.8.

35.5.36.3 תיקון תכנוני: לכל Manifest type לקבע canonical bytes, signer key ARN/version, signing principal, verifier trust store, certificate/key rotation, timestamp, revocation, cross-account storage ו־artifact/source binding.

35.5.36.4 משימת המשך: להפיק Manifest trust registry לכל Release/Backup/Audit/Migration/Export/Evidence; 6–8 שעות.

35.5.36.5 Acceptance: כל חתימה ניתנת לאימות Offline או מחשבון Verifier נפרד; Runtime/Builder יחיד אינו יכול לשנות Artifact ו־Manifest ולחתום שניהם ללא הפרדה וביקורת.

35.5.36.6.1 בדיקה חיובית: canonical manifest ו־artifact digest מאומתים מול key version ו־trusted timestamp.

35.5.36.6.2 בדיקה שלילית: changed whitespace/framing לפי canonicalization, wrong artifact, revoked key, untrusted signer או missing timestamp נדחים.

35.5.36.6.3 בדיקת כשל: KMS/verifier unavailable; Promotion/Restore נשארים blocked, לא unsigned fallback.

35.5.36.6.4 בדיקת Concurrency: key rotation ו־manifest generation במקביל; signer/version מקובעים לכל operation ו־old/new trust windows מפורשים.

35.5.36.7 Evidence: `docs/evidence/trust/mp-f036/manifest-trust-registry.json`; מצב `pending`.

35.5.36.8 Detection: signature verification בכל consume, alert על unknown/revoked key, unsigned manifest ו־artifact-digest mismatch.

35.5.36.9 Rollback/Disable: לפסול Manifest/Artifact, לעצור Promotion/Restore/Import, לחזור ל־trusted key/version אחרון ולחקור חשיפה.

35.5.36.10 Gate: חוסם 7 לפי Audit, ‏23.1, ‏23.2, ‏29 ו־30.

35.5.36.11 Owner/Reviewer: כולם `unknown/unavailable`.

35.5.37 MP-F037 — WBS תיעודי ללא Implementation מלא.

35.5.37.1 חומרה ומצב: `P0`; ‏`open-planning-remediation`. עלי Contract, ADR או Evidence נספרו בעבר כאילו בנו DB/API/Worker/UI/Infrastructure בפועל.

35.5.37.2 מיקום: כל טיוטות WBS שקדמו ל־Implementation-completeness invariant, ובייחוד עלים שה־Output שלהם היה Evidence envelope במקום Product artifact.

35.5.37.3 תיקון תכנוני: לכל Capability לדרוש שרשרת Discovery→Decision→Contract→Build→Migration→Positive/Negative/Failure/Concurrency tests→Observe→Rollback→Independent Gate; Product output ו־Evidence output נשארים נתיבים נפרדים.

35.5.37.4 משימת המשך: להריץ Audit על כל Capability ב־Base וב־Conditional, להפיק לכל אחת Product artifact, Build/Test/Gate chain ולרשום כל orphan; 6–8 שעות.

35.5.37.5 קבלה: `documentationOnlyCapabilityCount=0`, ‏`outputEvidenceCollisionCount=0`, וכל Capability פעילה קשורה לפחות ל־Build leaf אחד, Test leaf אחד ו־Gate תלוי־Implementation.

35.5.37.6.1 בדיקה חיובית: Capability עם Contract, Runtime artifact, Tests ו־Gate מדויקת נספרת פעם אחת.

35.5.37.6.2 בדיקה שלילית: החלפת Runtime artifact ב־Evidence JSON או ADR בלבד מזוהה ומפילה את ה־Gate.

35.5.37.6.3 בדיקת כשל: Source/Build output אינו זמין; ה־Capability נשארת `not-built`, ללא אחוז חלקי מטעה.

35.5.37.6.4 בדיקת Concurrency: שינוי Contract בזמן Build מבטל את Digest של ה־Build ושל כל Test תלוי.

35.5.37.7 Evidence: `docs/evidence/planning/mp-f037/implementation-completeness-audit.json`; מצב `pending`.

35.5.37.8 Detection: orphan Capability, Evidence-as-product path, Gate ללא Build predecessor ו־Runtime artifact ללא test consumer.

35.5.37.9 Rollback/Disable: לפסול את טיוטת ה־WBS, להסיר שעותיה מן Baseline ולהשאיר את ה־Capability disabled.

35.5.37.10 Gate: חוסם את כל Gates 1–30 ואת חישוב הזמן/האחוז הקנוני.

35.5.37.11 Owner/Reviewer: כולם `unknown/unavailable` עד RACI.

35.5.38 MP-F038 — Billing candidates אינם Live-eligible על בסיס המידע הקיים.

35.5.38.1 חומרה ומצב: `P1`, מקודם ל־`P0` אם Checkout, חיוב או Entitlement חי מופעלים; ‏`open-external-blocked`.

35.5.38.2 מיקום: בחירת Paddle/Stripe הישנה, כל UI Checkout וכל Adapter Billing המניח Eligibility.

35.5.38.3 תיקון תכנוני: `activeProvider=none` ב־Pilot; PayPlus primary-discovery, Tranzila alternate, Paddle ו־Stripe dormant; ספק מופעל רק לאחר Legal/Finance/Tax/PCI, Contract, Sandbox parity ו־written eligibility.

35.5.38.4 משימת המשך: להכין Eligibility packet כתוב ל־PayPlus ול־Tranzila ולבדוק במקביל את סיבת הפסילה של Paddle/Stripe מול Legal/Finance/Tax/PCI; 6–8 שעות.

35.5.38.5 קבלה: Provider אחד בלבד קשור ל־Merchant/entity/environment; Hosted checkout בלבד; Webhook bytes, replay, idempotency, refund, chargeback, unknown outcome ו־reconciliation מוכחים.

35.5.38.6.1 בדיקה חיובית: אירוע חתום של הספק הפעיל משנה Entitlement רק אחרי Ledger reconciliation.

35.5.38.6.2 בדיקה שלילית: ספק רדום, forged/replayed event, wrong merchant או reordered refund אינם משנים Entitlement.

35.5.38.6.3 בדיקת כשל: ספק או Webhook receipt unavailable; התוצאה `unknown`, אין success או retry עיוור.

35.5.38.6.4 בדיקת Concurrency: תשלום, refund ו־plan revision במקביל מתכנסים ל־Ledger סמכותי יחיד.

35.5.38.7 Evidence: `docs/evidence/billing/mp-f038/provider-eligibility-and-runtime-proof.json`; מצב `pending`.

35.5.38.8 Detection: non-active provider call, merchant mismatch, reconciliation lag, duplicate effect ו־unbounded financial exposure.

35.5.38.9 Rollback/Disable: לעצור Checkout/acquisition, לבטל Entitlement לא־מאומת, לשמר Ledger ולבצע reconciliation ידני.

35.5.38.10 Gate: חוסם 19.2, ‏26.0.1, ‏26.0.2, ‏26.1 ו־29.

35.5.38.11 Owner/Reviewer: Finance, Legal, Security, Product ו־Provider owner כולם `unknown/unavailable`.

35.5.39 MP-F039 — Email/Notification provider לא היה מוכרע.

35.5.39.1 חומרה ומצב: `P1`; ‏`open-external-blocked`.

35.5.39.2 מיקום: invitation, security, billing, incident ו־operational notices ללא Region, sender identity, quota, bounce/complaint או exit contract.

35.5.39.3 תיקון תכנוני: Amazon SES ב־`il-central-1` כ־candidate דרך HTTPS API; להוכיח Account/Region, DKIM/DMARC, sender, quota/sandbox, suppression, Event destination, retention, redaction ו־manual fallback.

35.5.39.4 משימת המשך: להכין SES capability packet ל־`il-central-1` הכולל Account probe, quota/sandbox, identities, DKIM/DMARC, suppression, events, retention ו־manual fallback; 5–7 שעות.

35.5.39.5 קבלה: כל Notice class קשור ל־purpose, recipient authority, template revision, provider receipt, suppression policy ו־fallback; אין תוכן רגיש בלוג.

35.5.39.6.1 בדיקה חיובית: Notice מאושר מתקבל פעם אחת ומקושר ל־Provider message identity.

35.5.39.6.2 בדיקה שלילית: unverified sender, suppressed recipient, template mismatch או wrong environment נדחים.

35.5.39.6.3 בדיקת כשל: SES/quota/event unavailable; state נשאר pending/failed מפורש וה־fallback האנושי מופעל.

35.5.39.6.4 בדיקת Concurrency: send, bounce, complaint ו־revocation במקביל אינם יוצרים retry אסור.

35.5.39.7 Evidence: `docs/evidence/notifications/mp-f039/ses-capability-and-notice-proof.json`; מצב `pending`.

35.5.39.8 Detection: bounce/complaint, sandbox/quota, sender drift, delayed notice, duplicate send ו־PII/secret leakage.

35.5.39.9 Rollback/Disable: להשבית Email, לבטל pending sends ולהציג In-app/manual route; אין מעבר ל־SMTP לא מאושר.

35.5.39.10 Gate: חוסם 8, ‏19.2, ‏22, ‏26.1 ו־30 לפי Notice class.

35.5.39.11 Owner/Reviewer: Notification owner, Security ו־Privacy `unknown/unavailable`.

35.5.40 MP-F040 — אין WBS אטומי לכל Conditional capability.

35.5.40.1 חומרה ומצב: `P1`; ‏`open-planning-remediation`.

35.5.40.2 מיקום: Recurring, Public API, webhooks, connectors, omnichannel, PWA, Native, Enterprise, Multi-region, agentic AI ו־formal certification.

35.5.40.3 תיקון תכנוני: לכל Package ליצור Trigger, excluded Base state, numeric instance allocation, 18-field WBS, independent Gate, hours/DAG נפרדים ו־decommission plan.

35.5.40.4 משימת המשך: להפיק Registry לכל 21 החבילות המותנות עם Trigger, Excluded Base state, 18-field leaves, Gate, שעות, DAG ו־Decommission; 6–8 שעות.

35.5.40.5 קבלה: `conditionalPackageWithoutTriggerCount=0`, ‏`conditionalLeafInBaseCount=0`, ‏`conditionalHoursInBaseCount=0` וכל Package מכוסה Contract→Build→Test→Observe→Rollback→Gate.

35.5.40.6.1 בדיקה חיובית: Package מופעל רק לאחר Trigger artifact ו־Gate digest מאושרים.

35.5.40.6.2 בדיקה שלילית: route, job, button, secret או entitlement של Package disabled אינם reachable.

35.5.40.6.3 בדיקת כשל: demand/provider/legal evidence חסר; Package נשאר disabled ללא Placeholder runtime.

35.5.40.6.4 בדיקת Concurrency: Trigger או Scope משתנים בזמן Planning; כל Digest ושעות קודמים נפסלים.

35.5.40.7 Evidence: `docs/evidence/planning/mp-f040/conditional-package-audit.json`; מצב `pending`.

35.5.40.8 Detection: Conditional ID ב־Base DAG, secret/route מוקדם, Gate shared או trigger ללא source.

35.5.40.9 Rollback/Disable: להסיר Package מן Baseline, לבטל Credentials/Routes ולשמר disabled-state evidence.

35.5.40.10 Gate: חוסם 28 conditional instances ו־29.

35.5.40.11 Owner/Reviewer: Product, Security, Architecture ו־Finance `unknown/unavailable` לכל Instance.

35.5.41 MP-F041 — Public API ו־Outgoing webhooks חסרי Package עצמאי.

35.5.41.1 חומרה ומצב: `P1`, מקודם ל־`P0` ב־BOLA, forged webhook או cross-tenant exposure; ‏`open-planning-remediation`.

35.5.41.2 מיקום: Contract narrative קיים ללא WBS מלא ל־API lifecycle ול־Webhook delivery platform.

35.5.41.3 תיקון תכנוני: חבילות Conditional נפרדות: Public API עם OpenAPI/auth/scopes/BOLA/version/idempotency/rate/deprecation/sandbox; Webhooks עם outbox/signature/rotation/replay/DLQ/SSRF/DNS/reconciliation.

35.5.41.4 משימת המשך: להפיק שתי חבילות WBS נפרדות ומלאות ל־Public API ול־Outgoing webhooks, לרבות Contract, Build, Tests, Observe, Rollback ו־Gate; 6–8 שעות.

35.5.41.5 קבלה: אפס endpoint/destination/credential ב־Base; לאחר Trigger, כל Operation ו־Event type מקבלים Schema, authorization, lifecycle, negative tests ו־Gate עצמאי.

35.5.41.6.1 בדיקה חיובית: authorized tenant request/event מגיע ליעד המדויק פעם אחת מבחינה עסקית.

35.5.41.6.2 בדיקה שלילית: BOLA, scope bypass, replay, downgrade, private-IP/DNS rebinding, signature mismatch ו־cross-tenant destination נדחים.

35.5.41.6.3 בדיקת כשל: client/destination/DNS/signer unavailable; outcome durable unknown/DLQ, ללא success כוזב.

35.5.41.6.4 בדיקת Concurrency: key/schema/subscription rotation יחד עם delivery אינה מערבבת revisions.

35.5.41.7 Evidence: `docs/evidence/conditional/mp-f041/api-webhook-package-proof.json`; מצב `pending`.

35.5.41.8 Detection: auth/BOLA deny, replay, SSRF, signature/key age, DLQ depth, unknown outcome ו־schema/version drift.

35.5.41.9 Rollback/Disable: לבטל token/subscription, לעצור delivery/acquisition, לשמר outbox ולחזור רק ל־contract revision מאושר.

35.5.41.10 Gate: חוסם Public API ו־Outgoing-webhook conditional gates וכן 29.

35.5.41.11 Owner/Reviewer: API, Security, Privacy ו־Operations `unknown/unavailable`.

35.5.42 MP-F042 — Framework ו־Dynamic-source locks התיישנו.

35.5.42.1 חומרה ומצב: `P0` ל־Gate 29; ‏`open-planning-remediation`.

35.5.42.2 מיקום: כל count או audit המסתיים ב־FR-039/55/61/66, ‏DS-020, ‏36 Findings או 34/41 Cyber domains.

35.5.42.3 תיקון תכנוני: locks קנוניים `FR-001–FR-076`, ‏`DS-001–DS-025`, ‏`TH-001–TH-032`, ‏`CTL-001–CTL-020`, ‏`MP-F001–MP-F052` ו־42 Domains; כולם נגזרים Registry ולא מטקסט ידני. ‏FR-067–FR-076 שומרים Service Workers, Web App Manifest, Push API, RFC 8030, RFC 8291, RFC 8292, Notifications API, Background Sync, Storage Standard ו־Permissions כרשומות עצמאיות; FR-074 מתועד במפורש כ־WICG Draft שאינו W3C Standard; ‏DS-024 שומרת Tranzila בנפרד מ־PayPlus ו־DS-025 שומרת Browser/PWA/Push-service capability matrix חיה בנפרד מן התקנים.

35.5.42.4 משימת המשך: לבנות מחדש את Locks והמונה מתוך A08, להריץ gap/duplicate/orphan/freshness scans ולפסול כל Total ידני; 5–7 שעות.

35.5.42.5 קבלה: אפס gap/duplicate/orphan; Source URL/version/digest/freshness/disposition לכל מקור; `source-verified` לעולם אינו מתפרש `implemented`.

35.5.42.6.1 בדיקה חיובית: כל מזהה בטווח מופיע פעם אחת וממופה למשימות הרלוונטיות.

35.5.42.6.2 בדיקה שלילית: מחיקת מזהה, duplicate, stale count או source ללא digest מפילים Gate 29.

35.5.42.6.3 בדיקת כשל: מקור רשמי unavailable; ה־Disposition נשאר unknown והיכולת התלויה disabled.

35.5.42.6.4 בדיקת Concurrency: Registry משתנה במהלך Assembly; Digest mismatch מבטל את כל ה־QA results הישנים.

35.5.42.7 Evidence: `docs/evidence/planning/mp-f042/registry-lock-audit.json`; מצב `pending`.

35.5.42.8 Detection: range/count drift, unverified source, stale checkedAt, orphan ID ו־manual total.

35.5.42.9 Rollback/Disable: לפסול Assembly digest ולהחזיר את כל ה־Gates ל־blocked עד Rebuild.

35.5.42.10 Gate: חוסם 1, ‏24, ‏29 ו־30.

35.5.42.11 Owner/Reviewer: Documentation authority ושני Reviewers `unknown/unavailable`.

35.5.43 MP-F043 — Recurring ללא subset תקני ו־finite bound.

35.5.43.1 חומרה ומצב: `P1`, מקודם ל־`P0` אם Send בלתי מוגבל או כפול מתאפשר; ‏`open-conditional`.

35.5.43.2 מיקום: תיאור RRULE הישן ללא RFC 5545 allowlist, COUNT/UNTIL ו־maximum occurrences.

35.5.43.3 תיקון תכנוני: Conditional package בלבד; subset versioned, series bound, deterministic occurrence identity, timezone/tzdb binding ו־approval/eligibility revalidation לכל occurrence.

35.5.43.4 משימת המשך: להגדיר RFC 5545 allowlist, finite-bound contract, occurrence identity ותרחישי DST/edit/cancel/restart/concurrency; 5–7 שעות.

35.5.43.5 קבלה: אין infinite series; edit/cancel/restart/DST/late worker אינם משכפלים occurrence או משתמשים באישור stale.

35.5.43.6.1 בדיקה חיובית: series bounded מפיקה בדיוק את occurrence set המאושר.

35.5.43.6.2 בדיקה שלילית: RRULE מחוץ allowlist, ללא bound, timezone לא ידוע או approval פג נדחים.

35.5.43.6.3 בדיקת כשל: tzdb/scheduler/queue unavailable; אין acquisition חדש וה־series נשאר recoverable.

35.5.43.6.4 בדיקת Concurrency: edit/cancel מול fire/retry; revision אחד מנצח ואין send כפול.

35.5.43.7 Evidence: `docs/evidence/conditional/mp-f043/recurrence-proof.json`; מצב `pending`.

35.5.43.8 Detection: unbounded series, occurrence duplicate, tzdb drift, stale approval ו־backlog growth.

35.5.43.9 Rollback/Disable: לעצור scheduler/acquisition, לבטל future occurrences ולשמר audit; אין rollback שכבר שולח.

35.5.43.10 Gate: חוסם Recurring conditional Gate ו־29.

35.5.43.11 Owner/Reviewer: Product, Messaging safety ו־Operations `unknown/unavailable`.

35.5.44 MP-F044 — Multi-region compute עלול להיתפס כ־Data failover.

35.5.44.1 חומרה ומצב: `P1`, מקודם ל־`P0` ב־split-brain, duplicate side effect או data loss; ‏`open-conditional`.

35.5.44.2 מיקום: כל תכנון שמסיק מ־Stateless Railway replicas קיום PostgreSQL/Redis/S3 failover או 90-day recovery.

35.5.44.3 תיקון תכנוני: להפריד compute routing, data replication, side-effect authority, fencing epoch, RPO/RTO, failover/failback, region/legal/provider limits ו־offsite WORM.

35.5.44.4 משימת המשך: להפיק Authority matrix ל־compute, data, queue, object storage ו־side effects ולתכנן failover/failback/fencing/reconciliation drill; 6–8 שעות.

35.5.44.5 קבלה: single authoritative writer בכל רגע; fencing token נדרש לכל external side effect; data class consistency ו־unknown-outcome reconciliation מוכחים.

35.5.44.6.1 בדיקה חיובית: failover מאושר מעביר epoch ו־authority בלי duplicate effect.

35.5.44.6.2 בדיקה שלילית: partition, stale region, dual writer, partial replication או old epoch נדחים.

35.5.44.6.3 בדיקת כשל: control plane/data plane unavailable; safe mode single-region או stop, ללא automatic unsafe promotion.

35.5.44.6.4 בדיקת Concurrency: failover/failback/retry/key rotation במקביל מתכנסים ל־epoch אחד.

35.5.44.7 Evidence: `docs/evidence/conditional/mp-f044/multi-region-authority-proof.json`; מצב `pending`.

35.5.44.8 Detection: dual-writer, stale epoch, replication lag, routing/data divergence, cross-region secret spread ו־RPO breach.

35.5.44.9 Rollback/Disable: fence all writers, stop side effects, select one reconciled authority and restore only from exact accepted backup.

35.5.44.10 Gate: חוסם Multi-region conditional Gate, ‏23.2 ו־29 כאשר Package מופעל.

35.5.44.11 Owner/Reviewer: Infrastructure, Database, Security, Legal ו־Incident command `unknown/unavailable`.

35.5.45 MP-F045 — Native Store policies ו־Security lifecycle חסרים.

35.5.45.1 חומרה ומצב: `P1`; ‏`open-conditional`.

35.5.45.2 מיקום: Mobile planning שהסתפק ב־MASVS/MASTG ללא Apple/Google policy, account, signing, privacy, SDK, deletion ו־review lifecycle.

35.5.45.3 תיקון תכנוני: Native package נפרד לכל Platform; Store source registry, developer accounts, signing custody, secure storage, push, cache/session revoke, privacy declarations, account deletion, supply chain, review credentials ו־rollback.

35.5.45.4 משימת המשך: להפיק לכל Platform מטריצת Store policy, signing custody, privacy, SDK, deletion, push/cache/session, supply chain, review ו־rollback; 6–8 שעות.

35.5.45.5 קבלה: binary, source, dependency, signing identity, store listing ו־backend environment קשורים לאותו Release digest; אפס secret או Production data ב־review artifact.

35.5.45.6.1 בדיקה חיובית: authorized device/session מקבל רק capability מאושרת וה־Store metadata תואם Runtime.

35.5.45.6.2 בדיקה שלילית: tampered binary, wrong signer, rooted/jailbroken risk לפי Policy, stale push, leaked cache או deleted account נדחים/מוגבלים.

35.5.45.6.3 בדיקת כשל: Store/push/signing/backend unavailable; no destructive retry, session/cache policy נשמרת.

35.5.45.6.4 בדיקת Concurrency: app upgrade, key rotation, logout ו־role downgrade אינם משאירים authority ישנה.

35.5.45.7 Evidence: `docs/evidence/conditional/mp-f045/native-release-proof.json`; מצב `pending`.

35.5.45.8 Detection: store policy drift, signer mismatch, outdated vulnerable binary, push abuse, cache residue ו־deletion lag.

35.5.45.9 Rollback/Disable: unpublish/stop rollout, revoke signing/push/session material ולהשאיר Responsive Web כ־fallback מאושר.

35.5.45.10 Gate: חוסם Native conditional Gate ו־29.

35.5.45.11 Owner/Reviewer: Platform, Security, Privacy, Legal ו־Store account owners `unknown/unavailable`.

35.5.46 MP-F046 — Readiness crosswalk עלול להפוך ל־Certification claim.

35.5.46.1 חומרה ומצב: `P1`; ‏`open-conditional`.

35.5.46.2 מיקום: כל שימוש ב־SOC 2, ISO 27001/27701/42001, PCI או WCAG כטענת certification/compliance ללא assessor/scope/evidence period.

35.5.46.3 תיקון תכנוני: Claim registry מפריד `planning`, ‏`mapped`, ‏`implemented`, ‏`operating-effectively`, ‏`assessed` ו־`certified`; formal program מופעל רק לאחר Scope, body/CPA/QSA, period, Management System ו־legal approval.

35.5.46.4 משימת המשך: להפיק Assurance claim registry עם Standard edition, scope, exclusions, maturity state, assessor, evidence period, expiry ו־public wording; 5–7 שעות.

35.5.46.5 קבלה: כל Claim ציבורי קשור ל־exact standard edition, scope, exclusions, assessor authority, report/certificate identity ו־expiry; crosswalk לבדו מסומן readiness planning.

35.5.46.6.1 בדיקה חיובית: claim מוצג רק ברמה שה־Evidence מוכיחה.

35.5.46.6.2 בדיקה שלילית: “compliant/certified” ללא assessor או על Scope רחב מן הדוח נחסם.

35.5.46.6.3 בדיקת כשל: certificate/source unavailable/expired; claim מוסר אוטומטית מתוצרי Release/Marketing.

35.5.46.6.4 בדיקת Concurrency: scope/control/provider משתנה בזמן assessment; claim revision נפסל עד re-assessment.

35.5.46.7 Evidence: `docs/evidence/claims/mp-f046/assurance-claim-registry.json`; מצב `pending`.

35.5.46.8 Detection: prohibited wording, expired report, scope mismatch, unmapped exclusion ו־marketing drift.

35.5.46.9 Rollback/Disable: להסיר claim, לתקן customer material ולפתוח corrective action; אין reinterpretation של crosswalk.

35.5.46.10 Gate: חוסם 29, ‏30 וכל Certification conditional Gate.

35.5.46.11 Owner/Reviewer: Legal, Security governance, Marketing ו־external assessor `unknown/unavailable`.

35.5.47 MP-F047 — זמן ואחוז היסטוריים אינם תקפים.

35.5.47.1 חומרה ומצב: `P0` לדיווח ניהולי; ‏`open-planning-remediation`.

35.5.47.2 מיקום: כל estimate/percentage/date שקדמו ל־WBS implementation-complete, Conditional separation, DAG ו־actual-evidence credit.

35.5.47.3 תיקון תכנוני: לחשב מחדש Base ו־Conditional בנפרד, predecessor DAG, critical path, capacity calendar, external waits, uncertainty range ו־earned credit המבוסס על Artifact+Test+Review בלבד.

35.5.47.4 משימת המשך: לבנות Baseline specification מן ה־WBS הקפוא: DAG, critical path, capacity, external waits, uncertainty ו־earned-credit rules; 6–8 שעות.

35.5.47.5 קבלה: אין מספר יחיד ללא min/max/assumptions/as-of; אפס שעות Conditional ב־Base; completion credit אינו ניתן ל־draft/documentation בלבד.

35.5.47.6.1 בדיקה חיובית: שינוי capacity או predecessor מחשב schedule חדש דטרמיניסטית.

35.5.47.6.2 בדיקה שלילית: סכום ידני, leaf rejected או wait חיצוני כחלק משעות עבודה מזוהים.

35.5.47.6.3 בדיקת כשל: WBS/owner/capacity חסר; התוצאה `unknown/unavailable`, לא ניחוש.

35.5.47.6.4 בדיקת Concurrency: leaf/scope/actual משתנים בזמן report; snapshot digest מבטיח שהמספרים אינם מערבבים revisions.

35.5.47.7 Evidence: `docs/evidence/planning/mp-f047/baseline-and-progress-report.json`; מצב `pending`.

35.5.47.8 Detection: stale digest, manual total, rejected leaf credit, conditional leakage ו־external-wait conflation.

35.5.47.9 Rollback/Disable: לבטל את הדוח, להציג superseded-provisional ולחשב מחדש מן Registry.

35.5.47.10 Gate: חוסם כל דיווח completion/date ו־29.

35.5.47.11 Owner/Reviewer: Program owner, Finance/Capacity owner ושני Reviewers `unknown/unavailable`.

35.5.48 MP-F048 — חוזה OpenAI הישן אינו משקף Data-control boundaries.

35.5.48.1 חומרה ומצב: `P1`, מקודם ל־`P0` אם Hosted state, Production data או autonomous side effect מופעלים; ‏`open-external-blocked`.

35.5.48.2 מיקום: Assistants/Threads, Conversations, Files, Vector stores, Hosted Evals, background, remote tools וכל טענת ZDR הנגזרת רק מ־`store=false`.

35.5.48.3 תיקון תכנוני: Responses foreground בלבד מאחורי Adapter; Connect-owned state/corpus/eval; exact model snapshot נבחר ב־live account לאחר Eval; no alias auto-promotion; Human approval; AI-off fallback. לכל Request פעיל ייקשר `safety_identifier` פסאודונימי, יציב, ממודר וגרסתי, הנגזר באמצעות Primitive מאושר ומפתח מנוהל; אין raw PII, plain hash, לוג של המזהה או reuse בין Purpose/Environment/Tenant.

35.5.48.4 משימת המשך: להכין OpenAI live capability, privacy, retention, region, model-snapshot, safety-identifier ו־Eval packet ולתעד AI-off fallback; 6–8 שעות.

35.5.48.5 קבלה: OpenAI Project/Organization/model/region/retention/quota/contract evidence חי; `store=false` מפורש אך אינו ZDR claim; output אינו mutation authority; לכל Request יש safety profile/version תקפים, ופרופיל חסר או מפתח/גרסה לא זמינים מעבירים ל־AI-off.

35.5.48.6.1 בדיקה חיובית: approved prompt/corpus/model snapshot מחזיר structured draft הקשור ל־input/policy digest.

35.5.48.6.2 בדיקה שלילית: prompt injection, cross-tenant context, tool request, stale model alias, unsafe content, changed output after approval, raw email/phone כ־safety identifier, plain hash או cross-purpose identifier נחסמים.

35.5.48.6.3 בדיקת כשל: OpenAI timeout/rate/policy unavailable; Human-only, אין tool/side effect או fabricated answer.

35.5.48.6.4 בדיקת Concurrency: model/prompt/corpus/policy revision בזמן generation מבטלים approval ישן.

35.5.48.7 Evidence: `docs/evidence/ai/mp-f048/openai-runtime-and-eval-proof.json`; מצב `pending`.

35.5.48.8 Detection: model alias drift, retention/store mismatch, data-class violation, missing/invalid safety profile, raw-PII/plain-hash attempt, injection, hallucination/safety regression, cost ו־approval bypass; Telemetry שומרת רק outcome/counters ולא את המזהה.

35.5.48.9 Rollback/Disable: AI off/Human-only, revoke key, invalidate outputs/approvals ולחזור רק ל־snapshot/corpus מאושר.

35.5.48.10 Gate: חוסם 18.1, ‏18.2, ‏24, ‏26.1 ו־29.

35.5.48.11 Owner/Reviewer: AI, Privacy, Legal, Security ו־Product `unknown/unavailable`.

35.5.49 MP-F049 — Crypto inventory, agility ו־PQC transition חסרים.

35.5.49.1 חומרה ומצב: `P1`, מקודם ל־`P0` כאשר זהות, Evidence, Recovery או מידע רגיש ארוך־חיים אינם ניתנים להעברה; ‏`open-planning-remediation`.

35.5.49.2 מיקום: TLS, JWT/OIDC, sessions, webhook signatures, KMS, backups, manifests, pseudonyms, code signing, PWA/Web Push/VAPID/RFC 8291 וכל שימוש Crypto ללא Registry אחד.

35.5.49.3 תיקון תכנוני: inventory לכל Algorithm/protocol/key/provider/purpose/data lifetime/dependency/rotation/replacement/rollback; no custom crypto/PQC/hybrid; migration רק באמצעות Platform/Provider נתמך ו־interoperability proof.

35.5.49.4 משימת המשך: להפיק Crypto inventory לכל Use, לתעד algorithm/protocol/key/provider/lifetime/rotation/migration/rollback ולתעדף P0/P1; 6–8 שעות.

35.5.49.5 קבלה: אפס Runtime crypto use לא מוסבר; כל P0/P1 use מקבל allowlist, current key/version, owner, rotation, migration target, rollback ו־live negative/interoperability evidence.

35.5.49.6.1 בדיקה חיובית: approved algorithm/key/provider/version/purpose עובד מול כל consumer.

35.5.49.6.2 בדיקה שלילית: downgrade, wrong/expired/revoked key, unknown algorithm, wrong purpose או custom PQC נדחים.

35.5.49.6.3 בדיקת כשל: KMS/certificate/provider unavailable; sensitive capability disabled ללא weak fallback.

35.5.49.6.4 בדיקת Concurrency: rotation/migration בזמן sign/encrypt/verify/decrypt מקבעת revision אחד ומבצעת reconciliation.

35.5.49.7 Evidence: `docs/evidence/crypto/mp-f049/crypto-inventory-and-transition-proof.json`; מצב `pending`.

35.5.49.8 Detection: untracked use, deprecated suite, key/cert age, downgrade, trust-store drift, rotation failure ו־provider-roadmap staleness.

35.5.49.9 Rollback/Disable: לעצור acquisition, revoke material פגוע ולחזור רק ל־suite מאושר ולא פגיע; אין resurrection של revoked key.

35.5.49.10 Gate: חוסם 2, ‏5, ‏6.1–6.3, ‏7, ‏8, ‏18.1–18.2, ‏23.1–23.2, ‏24, ‏26.0.1–26.1, ‏28.3.4–28.3.5, ‏29 ו־30 לפי ה־use.

35.5.49.11 Owner/Reviewer: Security/Crypto owner, provider owners ושני Reviewers `unknown/unavailable`.

35.5.50 MP-F050 — Test data ללא provenance ואישור מפורש.

35.5.50.1 חומרה ומצב: `P1`; ‏`open-planning-remediation`.

35.5.50.2 מיקום: כל שימוש ישן ב־synthetic, mock, fake, demo, sample או fixture כנתון עסקי או כ־Live evidence.

35.5.50.3 תיקון תכנוני: לאפשר רק artifact אמיתי מאושר וממוזער, official provider sandbox artifact, normative vector או deterministic non-business attack literal; לכל אחד source digest, purpose, data class, approval, expiry ו־destruction.

35.5.50.4 משימת המשך: להפיק Test-data provenance registry ו־approval/destruction workflow לכל ארבעת סוגי Artifact המותרים; 5–7 שעות.

35.5.50.5 קבלה: כל Test input קשור ל־provenance record; `syntheticBusinessEvidenceCount=0`; Sandbox לעולם אינו מוכיח Live parity.

35.5.50.6.1 בדיקה חיובית: מקור מאושר משמש רק ל־purpose/tenant/environment שהוגדרו ונמחק בזמן.

35.5.50.6.2 בדיקה שלילית: invented business record, wrong digest, expired approval, cross-tenant artifact, secret/PII או sandbox mislabeled live נדחים.

35.5.50.6.3 בדיקת כשל: source/approval/destruction receipt חסר; Test/Gate נשארים blocked.

35.5.50.6.4 בדיקת Concurrency: approval revoked או corpus changed בזמן Test; התוצאה נפסלת ואינה מקודמת.

35.5.50.7 Evidence: `docs/evidence/test-data/mp-f050/provenance-and-destruction-proof.json`; מצב `pending`, ללא raw sensitive content.

35.5.50.8 Detection: unknown source/digest, PII/secret canary, sandbox/live mix, retention breach ו־corpus mutation.

35.5.50.9 Rollback/Disable: quarantine/revoke dataset, invalidate dependent evidence, rotate exposed secret ולבצע destruction/retest.

35.5.50.10 Gate: חוסם 24, ‏29 וכל Provider/Legal/Security evidence התלוי בנתון.

35.5.50.11 Owner/Reviewer: Data owner, Privacy, Security ושני Reviewers `unknown/unavailable`.

35.5.51 MP-F051 — React Bearer סותר את BFF security architecture.

35.5.51.1 חומרה ומצב: `P0` אם Direct Railway או Tenant mutation נגישים באמצעות token גנוב, אחרת `P1`; ‏`open-planning-remediation`.

35.5.51.2 מיקום: כל הוראה ל־React לקרוא `getToken()`, לשמור/לשלוח Bearer, לסמוך על `orgId` Browser-side או לפנות ישירות ל־Railway.

35.5.51.3 תיקון תכנוני: same-origin Vercel BFF בלבד; Connect opaque HttpOnly application session לאחר X24; Clerk current-session check; CSRF/origin controls; Vercel OIDC workload identity ו־server-bound user-context envelope; Railway authorization+RLS עצמאיים.

35.5.51.4 משימת המשך: להפיק Browser→BFF→Railway route/trust/session matrix, X24 decision packet ותרחישי CSRF/replay/revocation/org-switch; 6–8 שעות.

35.5.51.5 קבלה: אפס browser `getToken`, Bearer storage/direct Railway; כל mutation דורשת current Clerk+Connect session+CSRF+workload+user authority; גניבת Clerk `__session` לבדה אינה מספיקה.

35.5.51.6.1 בדיקה חיובית: exact same-origin request עם כל ארבע שכבות הסמכות מגיעה ל־object המורשה.

35.5.51.6.2 בדיקה שלילית: XSS token theft, CSRF, foreign/null Origin, wrong org/role, direct ingress, wrong Vercel claims, replay ו־method/path/body swap נדחים לפני mutation.

35.5.51.6.3 בדיקת כשל: Clerk/JWKS/KMS/session/revocation unavailable; mutations fail closed.

35.5.51.6.4 בדיקת Concurrency: logout, org switch, role downgrade, session/JWKS/key rotation מול mutation; revoke/lower authority wins.

35.5.51.7 Evidence: `docs/evidence/identity/mp-f051/browser-bff-workload-proof.json`; מצב `pending`, ללא token values.

35.5.51.8 Detection: direct ingress, workload/user verifier deny, CSRF/origin deny, replay, revocation lag, browser token/storage scan ו־JWKS age.

35.5.51.9 Rollback/Disable: להשבית mutations, revoke sessions/signing revisions, לסגור ingress ולחזור רק ל־BFF artifact מאושר; אין Bearer fallback.

35.5.51.10 Gate: חוסם 8, ‏24, ‏26.1 ו־29.

35.5.51.11 Owner/Reviewer: Identity, Frontend, Backend, Security ו־Deployment `unknown/unavailable`; X24 דורש אישור Tal נפרד.

35.5.52 MP-F052 — WBS יכול להיות תקין מבנית אך שגוי סמנטית.

35.5.52.1 חומרה ומצב: `P0`; ‏`open-planning-remediation`.

35.5.52.2 מיקום: טיוטות שבהן Joiner/Mover/Leaver נבדק כ־RLS, upload כ־WhatsApp rate limit או משפחות רבות חלקו Tests/Acceptance שאינם מוכיחים את ה־Action.

35.5.52.3 תיקון תכנוני: לכל leaf שמונה predicates: atomic Action; exact Input; Product Output; leaf-specific Positive/Negative/Failure/Concurrency; Acceptance/Detection/Rollback לאותו noun/state; two-reviewer receipt ל־P0/P1.

35.5.52.4 משימת המשך: להריץ Semantic mutation audit על כל טווח WBS, לבצע two-reviewer pass ל־P0/P1 ולפסול כל leaf גנרי או mismatched; 6–8 שעות.

35.5.52.5 קבלה: `semanticMismatchCount=0`, ‏`unreviewedLeafCount=0`, ‏`genericWithoutLeafAssertionCount=0` ו־`mutationDetectionRate=100%` על corpus השינויים המאושר.

35.5.52.6.1 בדיקה חיובית: leaf-specific output והשינוי העסקי המדויק מוכחים יחד.

35.5.52.6.2 בדיקה שלילית: swap בין tests של שני עלים, path שגוי, מחיקת assertion או state-name mutation מזוהים.

35.5.52.6.3 בדיקת כשל: Reviewer/source/output חסר; leaf נשאר rejected ואינו נספר.

35.5.52.6.4 בדיקת Concurrency: predecessor/contract משתנה בזמן review; receipt digest ישן נפסל.

35.5.52.7 Evidence: `docs/evidence/planning/mp-f052/wbs-semantic-integrity-audit.json`; מצב `pending`.

35.5.52.8 Detection: noun/verb/path/state mismatch, generic repeated block, test-as-runtime acceptance, Gate ללא final implementation predecessors.

35.5.52.9 Rollback/Disable: לדחות את טווח ה־WBS כולו, להסיר שעותיו ולקיים rewrite+review; אין תיקון אוטומטי שמסמן PASS.

35.5.52.10 Gate: חוסם כל WBS baseline, ‏Gate 29 וחזרה לפיתוח.

35.5.52.11 Owner/Reviewer: Primary author ושני Reviewers עצמאיים `unknown/unavailable`.

35.5.53 מסקנת שילוב.

35.5.53.1 הרשם הקנוני מכיל כעת בדיוק `MP-F001–MP-F052`; אין Finding שניתן לסמן `resolved` על בסיס תכנון בלבד.

35.5.53.2 תיקון ניסוח או Contract יכול להעביר Finding ל־`planned-open`, אך Closure דורש Product artifact, Test חי, Evidence קשור Digest, Owner/Reviewer שמיים ו־Gate acceptance.

35.5.53.3 כל גרסה קודמת של count=36, ‏count=48, ‏count=49, ‏count=50 או ‏count=51 מסומנת `superseded`; המספר נגזר תמיד מן Registry.

35.5.53.4 Gate 29 נשאר `BLOCKED`; Gate 1 וכל תכנות נשארים חסומים עד QA/Digest ואישור Tal.

35.7 רשם איומים, בקרות ו־Crosswalk קנוני.

35.7.0 כללי גרסה ומצב.

35.7.0.1 גרסת הרשם היא `MP-REG-1.1-draft`. כל הרשומות הן תכנון בלבד; אין להסיק `implemented`, ‏`verified-live` או Evidence קיים.

35.7.0.2 כל `unknown/unavailable` נשאר חסם. מזהי TH ו־CTL הם מזהים טכניים יציבים בתוך תוכן הרשומה ואינם מזהי סעיפים.

35.7.1 רשם TH-001–TH-032, אחד־לאחד מול Risk 1–32 שב־34.37.

35.7.1.1 `TH-001`; `threatId=TH-001`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable pending Gate 1; scope all tenant-bound data and objects`; `dataFlowIds=unknown/unavailable pending Gate 1; scope API, DB, queue, storage, search, export and telemetry`; `trustBoundaryIds=unknown/unavailable pending Gate 1`; `capabilityIds=unknown/unavailable pending Scope Manifest`; `threatActor=authenticated tenant user, compromised worker or privileged principal`; `preconditions=multi-tenant path active and tenant context, object binding or RLS missing/stale/bypassable`; `frameworkTechniqueIds=unknown/unavailable pending framework crosswalk`; `likelihood=unknown/unavailable pending Gate 5`; `impact=cross-tenant confidentiality, integrity or availability breach`; `detectability=unknown/unavailable pending Gate 5`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned target CTL-006`; `residualSeverity=unknown/unavailable pending implementation and live retest`; `negativeTestIds=TNEG-TH-001 wrong-tenant API/DB/Queue/Storage/Search/Export/Telemetry`; `detectionIds=unknown/unavailable; planned DET-CTL-006`; `containment=disable affected route/principal, revoke sessions and isolate tenant-scoped workers`; `recovery=reconstruct access from immutable audit, correct bindings/RLS, assess notification and retest all tenant paths`; `owner=unknown/unavailable; roles Security+Data are not named owners`; `reviewAt=unknown/unavailable; required at Gate 5 and every scope/release change`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=server-derived tenant context, deny-by-default object authorization, composite tenant keys and FORCE RLS`; `detect=cross-tenant canaries, authorization-denial metrics and RLS/privilege drift`; `respond=kill affected capability, preserve evidence and invoke incident command`; `recover=restore trusted policy/data state and complete full tenant-isolation retest`.

35.7.1.2 `TH-002`; `threatId=TH-002`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable pending Gate 1; scope recipients, consent, credentials and message intents`; `dataFlowIds=unknown/unavailable; scope outbound, campaign and AI-to-send`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable pending Side-effect Instance registry`; `threatActor=tenant user, automation, compromised worker or configuration error`; `preconditions=outbound path active without exact consent, recipient, template, credential, approval or rate binding`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=unauthorized WhatsApp message, policy breach, customer harm or account suspension`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-007 and CTL-008`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-002 recipient/consent/template/credential/approval mismatch`; `detectionIds=unknown/unavailable; planned DET-CTL-007 and DET-CTL-008`; `containment=global and tenant send kill, queue drain and recipient allowlist freeze`; `recovery=reconcile every intent/attempt/fact, notify authority and re-enable one Instance at a time`; `owner=Tal is named for WhatsApp rate research only; implementation owner unknown/unavailable`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=immutable permit, exact binding, consent/suppression recheck, human approval and rate gate`; `detect=attempt/permit reconciliation, unknown-age alerts, policy and quality monitoring`; `respond=stop outbound, preserve Meta facts and classify exposure`; `recover=reconcile, correct policy state, retest and resume under reduced allowlist`.

35.7.1.3 `TH-003`; `threatId=TH-003`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope provider operations, messages, templates and billing events`; `dataFlowIds=unknown/unavailable; scope external side-effect request and asynchronous outcome`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable pending Instance registry`; `threatActor=network/provider failure, duplicate worker, replay actor or faulty retry`; `preconditions=side-effect boundary crossed without durable one-attempt and unknown-outcome contract`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=duplicate or falsely classified send, template submission, charge or entitlement`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-007, CTL-010 and CTL-017`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-003 timeout/crash/replay/reorder after side-effect boundary`; `detectionIds=unknown/unavailable; planned DET-CTL-007`; `containment=disable operation family and block blind retry`; `recovery=manual/provider reconciliation from durable intent, attempt and fact ledgers`; `owner=unknown/unavailable; Backend role is not a named owner`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=one-attempt acquisition, idempotency where provider supports it and monotonic state`; `detect=duplicate provider identity, aged unknown and ledger imbalance`; `respond=freeze retries and preserve inbound facts`; `recover=resolve each unknown explicitly before capability resume`.

35.7.1.4 `TH-004`; `threatId=TH-004`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope WABA, Phone Number, Business assets and credential revisions`; `dataFlowIds=unknown/unavailable; scope Meta onboarding, credential resolution and send`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=configuration error, stale credential, malicious asset swap or wrong environment`; `preconditions=provider operation not byte-bound to exact asset graph and credential revision`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=message sent from or to wrong Meta asset and credential compromise`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-003, CTL-007 and CTL-008`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-004 asset swap/revoked token/stale revision/wrong environment`; `detectionIds=unknown/unavailable; planned DET-CTL-008`; `containment=revoke credential revision and disable affected connection/send Instance`; `recovery=reconcile asset graph, reauthorize, rotate credential and retest exact binding`; `owner=David is responsible for Meta integration; Security owner, operational backup and reviewers are unknown/unavailable; Tal is consulted only for rate/quality-limit implications`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=verified asset graph, immutable connection revision and provider binding digest`; `detect=asset/credential drift and provider rejection monitoring`; `respond=kill connection and rotate tokens`; `recover=rebind only after live Meta proof`.

35.7.1.5 `TH-005`; `threatId=TH-005`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope ingress bodies, signatures, dedupe keys and durable receipts`; `dataFlowIds=unknown/unavailable; scope Meta, Clerk, Billing and Connector webhooks`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=external forger, replay actor, provider duplicate or infrastructure outage`; `preconditions=raw-body verification, replay defense or durable-before-ack contract absent`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=forged state, duplicate mutation, lost provider event or false acknowledgement`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-007`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-005 forged raw body/timestamp/replay/KMS outage`; `detectionIds=unknown/unavailable; planned DET-CTL-007`; `containment=reject ingress, stop acknowledgement when durability unknown and quarantine affected events`; `recovery=replay only authenticated durable events and reconcile provider state`; `owner=unknown/unavailable; Backend+Security are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=raw-byte signature, timestamp policy, replay ledger and durable receipt before ack`; `detect=signature failures, duplicate IDs, receipt gaps and spool alarms`; `respond=isolate ingress and rotate signing material if exposed`; `recover=reconcile zero-loss/zero-duplicate before reopen`.

35.7.1.6 `TH-006`; `threatId=TH-006`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope contacts, consent, suppression and campaign eligibility`; `dataFlowIds=unknown/unavailable; scope import, schedule, permit, bot and AI send`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=tenant user, stale snapshot, race condition or faulty automation`; `preconditions=consent/suppression not purpose-specific or not rechecked at side-effect time`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=unlawful or unwanted communication and provider/legal sanction`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-008 and CTL-013`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-006 stale consent/suppression race/STOP during scheduling`; `detectionIds=unknown/unavailable; planned DET-CTL-008 and DET-CTL-013`; `containment=global suppression precedence and campaign/bot pause`; `recovery=reconcile recipients, preserve opt-out evidence and obtain legal incident decision`; `owner=Product/Legal/Security named individuals are unknown/unavailable; Tal is consulted only for rate/quality-limit impact`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=purpose/channel consent ledger and last-moment suppression recheck`; `detect=send-after-opt-out and stale eligibility alerts`; `respond=stop sends and quarantine affected campaigns`; `recover=correct eligibility, notify as required and retest races`.

35.7.1.7 `TH-007`; `threatId=TH-007`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope secrets, tokens, signing keys, repos, logs, CI and runtimes`; `dataFlowIds=unknown/unavailable; scope secret creation, storage, decrypt, use, rotation and revocation`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=external attacker, insider, compromised dependency or accidental disclosure`; `preconditions=secret reaches client bundle, history, log, artifact, support output or broad principal`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=control-plane, provider, tenant or release compromise`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-002 and CTL-003`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-007 canary secret/client bundle/log/artifact/fork`; `detectionIds=unknown/unavailable; planned DET-CTL-003`; `containment=revoke and rotate exposed material, suspend principals and isolate affected builds`; `recovery=reissue scoped credentials, verify clean history/artifacts and complete incident review`; `owner=unknown/unavailable; Security role is not a named owner`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=vault/KMS references, narrow callback, least privilege and redaction`; `detect=secret canaries, repository/history/artifact/log scanning and KMS anomaly alerts`; `respond=emergency rotation and capability kill`; `recover=rebuild from trusted source and retest all consumers`.

35.7.1.8 `TH-008`; `threatId=TH-008`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope D1 source, export bundle, PostgreSQL target and migration manifests`; `dataFlowIds=unknown/unavailable; scope acquisition, conversion, import, cutover and rollback`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=operator error, malicious source swap, conversion bug or uncertain commit`; `preconditions=source/target digest, precision, schema, sequence or single-writer proof absent`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=data loss, corruption, cross-tenant drift or irreversible cutover`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-009 and CTL-020`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-008 52-bit integer/schema/slice/sequence/uncertain commit/file swap`; `detectionIds=unknown/unavailable; planned DET-CTL-009`; `containment=freeze writers and abort cutover before target mutation`; `recovery=restore target, retain source, replay verified slices and reconcile semantics`; `owner=unknown/unavailable; Database role is not a named owner`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=signed source acquisition, typed conversion, slice digests and two-operator preflight`; `detect=source-target counts/digests and semantic parity`; `respond=invoke cutover rollback authority`; `recover=restore verified target and retry only deterministic failed slice`.

35.7.1.9 `TH-009`; `threatId=TH-009`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope DB, object, config, source and privacy state backups`; `dataFlowIds=unknown/unavailable; scope backup creation, retention, restore and post-restore replay`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=operator error, ransomware, compromised admin, provider outage or key loss`; `preconditions=restore not bound to exact backupId, consistency point, digests and key identity`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=unrecoverable loss, corrupted restore, privacy resurrection or duplicate side effects`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-014`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-009 wrong backupId/digest/key/schema/retention and ransomware isolation`; `detectionIds=unknown/unavailable; planned DET-CTL-014`; `containment=keep production/read-write and side effects disabled during restore validation`; `recovery=isolated restore, privacy replay, unknown quarantine and canary cutover`; `owner=unknown/unavailable; Data+SRE are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=separate WORM account, signed manifest and exact consistency point`; `detect=backup job, signature, retention and restore-reconciliation monitoring`; `respond=isolate, rotate credentials and preserve forensic source`; `recover=restore only verified cohort and measure RPO/RTO`.

35.7.1.10 `TH-010`; `threatId=TH-010`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope retention plans, active records, legal holds and provider objects`; `dataFlowIds=unknown/unavailable; scope plan, claim, provider deletion, local delete, verify and re-deletion`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=operator, faulty policy, stale plan, provider ambiguity or malicious requester`; `preconditions=cutoff, trigger, data class, identity or hold checks are stale/wrong`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=wrongful destruction, retained data or legal-hold breach`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-013 and CTL-014`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-010 expired plan/wrong cutoff/trigger/provider identity/hold/re-deletion`; `detectionIds=unknown/unavailable; planned DET-CTL-013`; `containment=disable destructive workers and freeze plan scope`; `recovery=resume durable saga only from missing step, restore where legally permitted and replay deletion obligations`; `owner=unknown/unavailable; Privacy+Data are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=short-lived digest-bound Plan, legal-hold/active recheck and provider-specific identities`; `detect=stuck saga, unexpected delete count and post-restore resurrection`; `respond=stop deletion and obtain legal assessment`; `recover=compensate from backup where permissible and complete verified saga`.

35.7.1.11 `TH-011`; `threatId=TH-011`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope uploaded files, quarantine, clean objects, parser/index and user downloads`; `dataFlowIds=unknown/unavailable; scope upload, scan, parse, index, provider media and download`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable pending Upload/Media Scope`; `threatActor=malicious tenant, compromised object, parser exploit or scanner failure`; `preconditions=file reaches parser/index/user without exact object/version/checksum and terminal clean verdict`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=malware execution, data exfiltration, service exhaustion or tenant compromise`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-011`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-011 extension/MIME/magic mismatch, polyglot, macro, encrypted and scanner timeout/unknown`; `detectionIds=unknown/unavailable; planned DET-CTL-011`; `containment=quarantine object/version and disable upload/parse/download path`; `recovery=delete or retain under incident policy, rescan trusted corpus and reindex clean versions`; `owner=unknown/unavailable; Security+AI/Data are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=one-shot upload, file allowlist, structural validation, malware scan and sandboxed parser`; `detect=verdict/version mismatch, timeout, resource budget and clean-without-receipt alerts`; `respond=quarantine and revoke presigned/provider media references`; `recover=rebuild indexes only from verified clean source`.

35.7.1.12 `TH-012`; `threatId=TH-012`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope prompts, conversation content, knowledge, model output and tool permissions`; `dataFlowIds=unknown/unavailable; scope ingest, retrieval, prompt assembly, model inference, approval and action`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable pending AI Scope`; `threatActor=malicious user/document/provider response or poisoned knowledge source`; `preconditions=untrusted content can override instructions, exfiltrate context or invoke excessive agency`; `frameworkTechniqueIds=unknown/unavailable pending AISVS/ATLAS mapping`; `likelihood=unknown/unavailable`; `impact=data disclosure, unsafe output, unauthorized action or provider-policy breach`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-011 and CTL-012`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-012 malicious document/system-prompt request/tool action/citation spoof`; `detectionIds=unknown/unavailable; planned DET-CTL-012`; `containment=disable model/tool/knowledge capability and force human-only workflow`; `recovery=purge poisoned versions where legally approved, reindex clean sources and rerun evals`; `owner=unknown/unavailable; AI+Security are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=data minimization, instruction/data separation, source provenance, no autonomous tools and human approval`; `detect=red-team/eval regression, prompt exfiltration canary and anomalous cost/tool request`; `respond=AI kill, isolate corpus and preserve prompts/output under privacy policy`; `recover=approved model/profile and clean knowledge restore`.

35.7.1.13 `TH-013`; `threatId=TH-013`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope checkout, payments, refunds, credits, catalog and entitlements`; `dataFlowIds=unknown/unavailable; scope hosted checkout, webhook, finance reconciliation and entitlement grant`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable pending Billing decision`; `threatActor=fraudster, forged webhook, malicious admin, provider ambiguity or pricing drift`; `preconditions=verified provider/finance fact, maker-checker or exact catalog binding missing`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=unauthorized financial mutation or service entitlement`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-007 and CTL-017`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-013 forged webhook/redirect-only success/wrong price/double refund/self-approval`; `detectionIds=unknown/unavailable; planned DET-CTL-017`; `containment=activeProvider none, disable checkout/refund/credit and freeze entitlement changes`; `recovery=reconcile provider, finance and internal ledgers, reverse only with approved authority`; `owner=unknown/unavailable; Finance+Billing are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=hosted checkout, exact catalog version, raw-body verification, durable ledger and maker-checker`; `detect=provider-finance-entitlement imbalance and anomalous refund/price`; `respond=stop financial mutations and preserve webhooks`; `recover=reconstruct entitlement from verified facts`.

35.7.1.14 `TH-014`; `threatId=TH-014`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope source, dependency graph, Actions, images, builds and release artifacts`; `dataFlowIds=unknown/unavailable; scope commit, CI, build, attest, deploy and rollback`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=malicious dependency/maintainer, compromised developer, Action or CI principal`; `preconditions=unpinned or unreviewed input can alter artifact/provenance`; `frameworkTechniqueIds=unknown/unavailable pending SLSA/ATT&CK mapping`; `likelihood=unknown/unavailable`; `impact=arbitrary code or compromised production release`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-002 and CTL-020`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-014 tampered lockfile/artifact/provenance/unpinned action`; `detectionIds=unknown/unavailable; planned DET-CTL-002`; `containment=block merge/build/deploy and revoke CI identities`; `recovery=rebuild from clean verified source with pinned toolchain and new attestations`; `owner=unknown/unavailable; Security+Release are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=two reviewers, CODEOWNERS, SHA-pinned Actions, least permissions, SBOM and provenance`; `detect=dependency/KEV/image scan and artifact-digest verification`; `respond=quarantine artifact and rotate pipeline credentials`; `recover=clean checkout rebuild and controlled rollback`.

35.7.1.15 `TH-015`; `threatId=TH-015`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope Clerk users, organizations, roles, sessions, invitations and privileged accounts`; `dataFlowIds=unknown/unavailable; scope authenticate, invite, membership, authorize, recover and offboard`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=credential attacker, malicious member, support abuser or recovery fraudster`; `preconditions=issuer/audience/azp/org/role/MFA/recovery checks absent or stale`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=account takeover, organization crossover or privilege escalation`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-004`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-015 wrong authorizedParty/org switch/stale role/MFA bypass/recovery abuse`; `detectionIds=unknown/unavailable; planned DET-CTL-004`; `containment=revoke sessions/memberships and freeze privileged actions`; `recovery=verified recovery, re-enrollment, access reconciliation and offboarding retest`; `owner=unknown/unavailable; Identity+Security are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=organization-required auth, server authorization, phishing-resistant MFA and safe recovery`; `detect=privilege/recovery/session anomaly and membership drift`; `respond=suspend identity and initiate account-takeover playbook`; `recover=restore least privilege with two-person review`.

35.7.1.16 `TH-016`; `threatId=TH-016`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope PostgreSQL, Redis, S3, KMS and service principals`; `dataFlowIds=unknown/unavailable; scope network connect, authenticate, authorize and data access`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=internet attacker, compromised service, human admin or configuration error`; `preconditions=resource public, default/shared credential, owner/BYPASSRLS principal or broad IAM`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=full infrastructure or tenant data compromise`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-003, CTL-006 and CTL-009`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-016 public network/default credential/owner role/KMS deny`; `detectionIds=unknown/unavailable; planned DET-CTL-003 and DET-CTL-006`; `containment=close ingress, revoke principal/grants and isolate service`; `recovery=rotate credentials, restore least-privilege policies and validate data integrity`; `owner=unknown/unavailable; Platform+Data are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=private networking, separate principals, deny-by-default IAM/RLS and PG verify-full`; `detect=external probes, privilege/IAM drift and unexpected login`; `respond=network/principal kill and incident preservation`; `recover=rebuild access from approved matrix and retest every principal`.

35.7.1.17 `TH-017`; `threatId=TH-017`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope domains, DNS, TLS certificates, callback URLs and public origins`; `dataFlowIds=unknown/unavailable; scope browser/BFF/Railway/Meta/Clerk/Email routing`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=domain hijacker, malicious preview deployment, DNS misconfiguration or expired certificate`; `preconditions=wildcard/dangling DNS, reflected Host, unvalidated origin or callback drift`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=credential theft, callback interception, traffic takeover or wrong-environment mutation`; `detectability=unknown/unavailable`; `inherentSeverity=P0`; `existingControlIds=unknown/unavailable; planned CTL-020`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-017 host reflection/wildcard/dangling DNS/wrong callback/certificate`; `detectionIds=unknown/unavailable; planned DET-CTL-020`; `containment=remove DNS/callback, block ingress and revoke affected sessions/tokens`; `recovery=restore exact records/certificates/origins from approved manifest and retest externally`; `owner=unknown/unavailable; Deployment+Security are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=validated APP_PUBLIC_ORIGIN, exact callbacks, DNS inventory, TLS and environment-bound identity`; `detect=certificate/DNS/callback drift and takeover probes`; `respond=traffic kill and provider callback revocation`; `recover=controlled DNS/certificate restore and canary routing`.

35.7.1.18 `TH-018`; `threatId=TH-018`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope React DOM, sessions, BFF mutations and Embedded Signup bridge`; `dataFlowIds=unknown/unavailable; scope browser render, form submit, fetch and postMessage`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=malicious content, cross-site attacker or compromised third-party frame`; `preconditions=unsafe output encoding, CSP, CSRF, CORS, clickjacking or source/origin validation`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=session misuse, user action forgery, data disclosure or asset takeover`; `detectability=unknown/unavailable`; `inherentSeverity=P1`; `existingControlIds=unknown/unavailable; planned CTL-005`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-018 stored/reflected DOM payload, cross-site request and wrong postMessage source/origin`; `detectionIds=unknown/unavailable; planned DET-CTL-005`; `containment=disable affected UI/BFF mutation and revoke sessions`; `recovery=patch/render safely, rotate CSP/session state and rerun browser suite`; `owner=unknown/unavailable; Frontend+Security are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=contextual encoding, CSP, SameSite/CSRF policy, frame ancestry and exact postMessage checks`; `detect=CSP reports and browser security telemetry`; `respond=disable vulnerable journey and preserve payload`; `recover=deploy verified artifact and reauthenticate affected users`.

35.7.1.19 `TH-019`; `threatId=TH-019`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope outbound HTTP adapters, URL ingestion and connectors`; `dataFlowIds=unknown/unavailable; scope DNS resolve, redirect and response fetch`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable pending Scope Manifest`; `threatActor=malicious tenant/content/provider redirect or DNS attacker`; `preconditions=arbitrary URL, private IP, redirect, rebinding or oversized response not constrained`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=internal service access, metadata/credential theft, exfiltration or resource exhaustion`; `detectability=unknown/unavailable`; `inherentSeverity=P1`; `existingControlIds=unknown/unavailable; planned CTL-016`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-019 localhost/private/link-local/DNS rebinding/redirect/oversized response`; `detectionIds=unknown/unavailable; planned DET-CTL-016`; `containment=disable generic fetch/connectors and block destination`; `recovery=rotate exposed credentials, inspect egress and re-enable only pinned adapters`; `owner=unknown/unavailable; Backend+Security are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=destination allowlist/pinning, DNS/IP revalidation, redirect and byte/time budgets`; `detect=blocked/private destination and unusual egress telemetry`; `respond=egress kill and isolate requesting tenant/job`; `recover=verified configuration and SSRF retest`.

35.7.1.20 `TH-020`; `threatId=TH-020`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope Redis image/config/credentials, BullMQ jobs, scheduler leases, DLQ, Outbox, operation/attempt/receipt ledgers`; `dataFlowIds=unknown/unavailable; scope authorize, enqueue, reserve, claim/fence, execute, provider-attempt, unknown, settle, retry, drain, restore and rebuild`; `trustBoundaryIds=unknown/unavailable; scope Railway Project/Environment private network, API/Worker/Redis identities and provider boundary`; `capabilityIds=unknown/unavailable`; `threatActor=public or compromised in-environment client, duplicate worker, Redis outage/eviction/data loss, vulnerable image, poison job, clock drift or operator error`; `preconditions=public TCP, broad/shared ACL, affected image, job/Redis used as source of truth, noeviction/AOF/HA unproved, or lease/idempotency/unknown/rebuild contract missing`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=credential/config compromise, lost work, duplicate send/charge/delete, starvation, retry storm or split-brain`; `detectability=unknown/unavailable`; `inherentSeverity=P1, promoted to P0 if duplicate irreversible side effect, cross-tenant access or Redis RCE is possible`; `existingControlIds=unknown/unavailable; planned CTL-003, CTL-010 and CTL-020`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-020 public/wrong-ACL/forbidden-command/affected-image/Redis restart or loss/noeviction/maxclients/two workers/DLQ/replay/clock-skew/auto-removal/reused-ID`; `detectionIds=unknown/unavailable; planned DET-CTL-003, DET-CTL-010 and DET-CTL-020`; `containment=close TCP, revoke credentials, pause producers/consumers/schedulers, quarantine unknown and retain source ledgers`; `recovery=replace patched image/config, rebuild queue only from authoritative ledgers and reconcile every attempt/receipt before resume`; `owner=unknown/unavailable; Backend+SRE+Security are roles only`; `reviewAt=unknown/unavailable; required before Gate 6.1/11, every Redis/BullMQ/image change and every failure drill`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=private-only network, pinned patched image, least-privilege ACL, no PII, noeviction, AOF, durable source ledger, deterministic job ID, leases/CAS and no retry after unknown`; `detect=external probe, config/advisory drift, memory/persistence/replication, queue-depth/age/duplicate/DLQ/lease/unknown monitoring`; `respond=network/producer/consumer kill, credential rotation and single-writer election`; `recover=rebuild and zero-lost/zero-duplicate reconciliation`.

35.7.1.21 `TH-021`; `threatId=TH-021`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope API, Meta capacity, AI/file budgets, billing and tenant quotas`; `dataFlowIds=unknown/unavailable; scope admission, reservation, attempt, settlement and cost reconciliation`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=abusive tenant, botnet, noisy neighbor, provider degradation or configuration error`; `preconditions=layered rate, quota, cost and freshness gates absent/stale`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=outage, uncontrolled send/charge, provider suspension or cost exhaustion`; `detectability=unknown/unavailable`; `inherentSeverity=P1, promoted to P0 for uncontrolled send or charge`; `existingControlIds=unknown/unavailable; planned CTL-008, CTL-012, CTL-016 and CTL-017`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-021 multi-layer burst/stale limit/quality drop/budget cap`; `detectionIds=unknown/unavailable; planned DET-CTL-008 and DET-CTL-016`; `containment=reduce cap to zero or conservative degraded mode and pause expensive jobs`; `recovery=reconcile reservations/cost, refresh provider state and staged resume`; `owner=Tal is named for WhatsApp rate research; SRE/other budget owners unknown/unavailable`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=multi-layer token/admission budget, durable reservations and fresh provider limits`; `detect=capacity age, 429, quality, cost and noisy-neighbor alerts`; `respond=kill/pause per provider, tenant and capability`; `recover=validated cap computation and controlled ramp`.

35.7.1.22 `TH-022`; `threatId=TH-022`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope logs, audit, metrics, traces, SLO and incident evidence`; `dataFlowIds=unknown/unavailable; scope emit, redact, transport, store, alert and export`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=misconfiguration, compromised runtime, malicious insider or telemetry provider failure`; `preconditions=coverage, tenant binding, redaction, integrity or denominator semantics missing`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=undetected incident, misleading health or PII/secret disclosure`; `detectability=unknown/unavailable`; `inherentSeverity=P1`; `existingControlIds=unknown/unavailable; planned CTL-003 and CTL-015`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-022 secret/PII canary, dropped spans, wrong tenant and zero-traffic green`; `detectionIds=unknown/unavailable; planned DET-CTL-015`; `containment=disable affected exporter/dashboard and preserve raw trusted audit where legal`; `recovery=restore pipeline/config, rotate exposed secrets and backfill only verifiable facts`; `owner=unknown/unavailable; SRE+Privacy are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=schema, redaction, tenant context, immutable audit and SLI definitions`; `detect=canaries, coverage gaps, ingest lag and reconciliation`; `respond=incident on silent/PII-bearing telemetry`; `recover=revalidate alert paths and evidence integrity`.

35.7.1.23 `TH-023`; `threatId=TH-023`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope Meta, Railway, Vercel, AWS, Clerk, OpenAI, Email and Billing services`; `dataFlowIds=unknown/unavailable; scope every provider-dependent request and asynchronous callback`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=provider outage, plan/terms limitation, account suspension or silent schema/status change`; `preconditions=single-provider dependency without freshness, failure mode, exit or manual fallback`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=capability outage, data loss, policy breach or unsafe degradation`; `detectability=unknown/unavailable`; `inherentSeverity=P1`; `existingControlIds=unknown/unavailable; planned CTL-015 and CTL-016`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-023 timeout/5xx/plan limitation/terms change/account suspension`; `detectionIds=unknown/unavailable; planned DET-CTL-016`; `containment=disable affected capability, enforce safe state and activate incident/vendor escalation`; `recovery=manual fallback or approved provider recovery/exit with reconciliation`; `owner=unknown/unavailable; SRE+Supplier owner are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=provider registry, plan/region/contract evidence, timeout and exit plan`; `detect=approved real journey evidence, official provider sandbox probe or deterministic non-business availability probe לפי MP-F050, status/schema/terms freshness and account health`; `respond=provider-specific kill and customer/support communication`; `recover=verified failback or migration`.

35.7.1.24 `TH-024`; `threatId=TH-024`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope invitations, mailboxes, domains, finance and support communications`; `dataFlowIds=unknown/unavailable; scope email send/receive, invitation, invoice/payment change and support`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=phisher, BEC actor, mailbox attacker or malicious insider`; `preconditions=weak MFA, sender misalignment, lookalike links or no maker-checker/out-of-band verification`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=credential theft, unauthorized payment/admin change or customer deception`; `detectability=unknown/unavailable`; `inherentSeverity=P1, promoted to P0 for Finance/Admin credential or payment change`; `existingControlIds=unknown/unavailable; planned CTL-004, CTL-017 and CTL-019`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-024 lookalike/from-alignment/invoice-change/replayed invite`; `detectionIds=unknown/unavailable; planned DET-CTL-019`; `containment=stop email/invitations/finance mutations, revoke sessions and quarantine mailbox`; `recovery=restore mailbox/domain, reverify changes out of band and notify affected parties`; `owner=unknown/unavailable; Security+Finance are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=phishing-resistant MFA, SPF/DKIM/DMARC, exact branded links and maker-checker`; `detect=mailbox rule, alignment, domain and financial-change anomaly`; `respond=freeze channels and credentials`; `recover=verified communication and reconciliation`.

35.7.1.25 `TH-025`; `threatId=TH-025`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope developer endpoints, GitHub/AI accounts, SSH/signing keys and AnyDesk`; `dataFlowIds=unknown/unavailable; scope local development, remote session, clipboard/file transfer and source access`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=malware, thief, unauthorized remote operator or offboarded user`; `preconditions=unmanaged device, weak remote controls, stale account/key or unrestricted transfer`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=source, secret or production-control compromise`; `detectability=unknown/unavailable`; `inherentSeverity=P1, promoted to P0 on secret/production access`; `existingControlIds=unknown/unavailable; planned CTL-002 and CTL-019`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-025 lost device/unknown remote/clipboard transfer/revoked user`; `detectionIds=unknown/unavailable; planned DET-CTL-019`; `containment=revoke accounts/keys, terminate remote session and isolate endpoint`; `recovery=reimage/attest endpoint, rotate material and verify clean source/history`; `owner=unknown/unavailable; Security/IT are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=managed endpoint, encryption, patches/EDR, personal account and constrained JIT remote access`; `detect=device posture, remote-session and offboarding drift`; `respond=isolate device and revoke all identities`; `recover=trusted rebuild and access recertification`.

35.7.1.26 `TH-026`; `threatId=TH-026`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope privileged roles, support, exports, secrets and break-glass`; `dataFlowIds=unknown/unavailable; scope joiner/mover/leaver, support access, escalation and offboarding`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=malicious insider, stale leaver, coerced support or compromised privileged identity`; `preconditions=access not least-privilege/JIT/reviewed/revoked or audit can be changed`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=tenant access, unauthorized send/billing/export or evidence tampering`; `detectability=unknown/unavailable`; `inherentSeverity=P1, promoted to P0 on tenant/send/billing/secret impact`; `existingControlIds=unknown/unavailable; planned CTL-004, CTL-015 and CTL-019`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-026 mover/leaver/export/support/break-glass misuse`; `detectionIds=unknown/unavailable; planned DET-CTL-004 and DET-CTL-015`; `containment=suspend identity, revoke sessions/grants and freeze dangerous operations`; `recovery=access reconciliation, evidence review and data/customer remediation`; `owner=unknown/unavailable; Security+HR/Legal are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=segregation of duties, JIT, two-person approval, offboarding and immutable audit`; `detect=access review, anomalous privilege/support/export and stale membership`; `respond=insider incident process`; `recover=restore approved role state and retest offboarding`.

35.7.1.27 `TH-027`; `threatId=TH-027`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope all personal data classes, notices, contracts, regions and retention state`; `dataFlowIds=unknown/unavailable; scope collect, use, transfer, disclose, retain, export and delete`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=organization, supplier, operator or faulty policy rather than only malicious attacker`; `preconditions=unapproved purpose, role, notice, transfer route, retention trigger or DSAR process`; `frameworkTechniqueIds=unknown/unavailable pending LINDDUN/legal mapping`; `likelihood=unknown/unavailable`; `impact=unlawful processing, broad disclosure/destruction, sanctions and subject harm`; `detectability=unknown/unavailable`; `inherentSeverity=P1, promoted to P0 for broad unlawful exposure/destruction`; `existingControlIds=unknown/unavailable; planned CTL-012, CTL-013 and CTL-014`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-027 wrong region/subprocessor/notice/DSAR/retention trigger`; `detectionIds=unknown/unavailable; planned DET-CTL-013`; `containment=disable affected processing/transfer/delete and preserve legal holds`; `recovery=legal assessment, correction/export/delete, notification and contract/provider remediation`; `owner=unknown/unavailable; Privacy/Legal are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=data/purpose/role/transfer/retention registry and legal approval`; `detect=data-flow, region, retention and DSAR reconciliation`; `respond=privacy incident and processing freeze`; `recover=verified rights fulfillment and policy/data repair`.

35.7.1.28 `TH-028`; `threatId=TH-028`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope WhatsApp content/account, AI data/model and customer messages`; `dataFlowIds=unknown/unavailable; scope classify, send, train/use model and provider transfer`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=product/configuration error, tenant misuse, provider terms change or model use mismatch`; `preconditions=Meta policy/AI legal classification or terms/data-control evidence missing/stale`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=account suspension, prohibited processing or customer harm`; `detectability=unknown/unavailable`; `inherentSeverity=P1, promoted to P0 when suspension/prohibited use affects customers`; `existingControlIds=unknown/unavailable; planned CTL-008, CTL-012 and CTL-016`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-028 AI-primary/model-improvement/terms-delta/quality restriction`; `detectionIds=unknown/unavailable; planned DET-CTL-008 and DET-CTL-012`; `containment=AI-off and outbound/template/campaign pause`; `recovery=refresh legal/provider classification, remove prohibited flow and retest`; `owner=named Legal/Product/AI/Security owners are unknown/unavailable; Tal is consulted only for rate/quality-limit implications`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=classification matrix, provider contract registry, human approval and store/data minimization`; `detect=terms/model/quality freshness and policy-denial events`; `respond=kill affected AI/WhatsApp capability`; `recover=approved configuration and customer remediation`.

35.7.1.29 `TH-029`; `threatId=TH-029`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope all UI journeys, content, dialogs, reports and mixed-direction identifiers`; `dataFlowIds=unknown/unavailable; scope render, navigate, input, announce and export`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=design/implementation defect or malicious Bidi content`; `preconditions=keyboard, focus, semantic, zoom, RTL/Bidi or language review missing`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=blocked access, mistaken destructive action, spoofed identity/content or legal noncompliance`; `detectability=unknown/unavailable`; `inherentSeverity=P1`; `existingControlIds=unknown/unavailable; planned CTL-018`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-029 keyboard/screen-reader/zoom/mobile/mixed-direction spoof`; `detectionIds=unknown/unavailable; planned DET-CTL-018`; `containment=disable unsafe journey/action and provide accessible support alternative`; `recovery=correct component/content, expert retest and republish`; `owner=unknown/unavailable; UX/Accessibility are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=WCAG 2.2 AA target, semantic components, focus management and Bidi isolation`; `detect=automated plus manual/expert journey review`; `respond=block misleading/destructive surface`; `recover=verified accessible release`.

35.7.1.30 `TH-030`; `threatId=TH-030`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope incident authority, on-call, support, vendor escalation and stop controls`; `dataFlowIds=unknown/unavailable; scope alert, acknowledge, classify, command, communicate, recover and learn`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=staffing failure, pager/channel outage, unclear authority or concurrent incident`; `preconditions=no named primary/backup, escalation, communications or rehearsed stop/resume`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=prolonged or uncontrolled safety/security incident`; `detectability=unknown/unavailable`; `inherentSeverity=P1, promoted to P0 during live safety incident`; `existingControlIds=unknown/unavailable; planned CTL-015 and CTL-016`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-030 pager failure/primary unavailable/vendor escalation/stop-resume`; `detectionIds=unknown/unavailable; planned DET-CTL-015`; `containment=invoke backup authority and predefined global safe state`; `recovery=restore on-call/support channels, complete post-incident actions and retest`; `owner=unknown/unavailable; Operations role is not a named owner`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=named primary/backup, severity/authority matrix, playbooks and table-tops`; `detect=pager heartbeat, acknowledgement and roster expiry`; `respond=incident command with logged decisions`; `recover=service restoration, lessons learned and control updates`.

35.7.1.31 `TH-031`; `threatId=TH-031`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope KMS keys, S3 buckets/objects, backup, knowledge and ingress spool`; `dataFlowIds=unknown/unavailable; scope encrypt, sign, grant, rotate, re-encrypt, retain and restore`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=malicious admin, compromised runtime, policy error, region/account outage or key loss`; `preconditions=wrong key/grant/region, public policy, deletion lifecycle or recovery separation`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=public disclosure, unusable data, forged evidence or unrecoverable backup`; `detectability=unknown/unavailable`; `inherentSeverity=P1, promoted to P0 on public exposure or unrecoverable data`; `existingControlIds=unknown/unavailable; planned CTL-003, CTL-011 and CTL-014`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-031 wrong key/grant/region/re-encryption/delete wait`; `detectionIds=unknown/unavailable; planned DET-CTL-003 and DET-CTL-014`; `containment=disable bucket/upload/restore path and revoke grants`; `recovery=key/account recovery, isolated restore or controlled re-encryption from verified manifest`; `owner=unknown/unavailable; AWS/Security are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=separate accounts/keys, least privilege, Object Lock and signed manifests`; `detect=KMS/S3 policy/config/drift and failed decrypt/sign/restore`; `respond=key/bucket isolation and break-glass`; `recover=verified key recovery and data restoration`.

35.7.1.32 `TH-032`; `threatId=TH-032`; `registryVersion=MP-REG-1.1-draft`; `assetIds=unknown/unavailable; scope Flows, AI, scheduler, admin mutations and approval state`; `dataFlowIds=unknown/unavailable; scope design, approve, publish, trigger, execute, resume and rollback`; `trustBoundaryIds=unknown/unavailable`; `capabilityIds=unknown/unavailable`; `threatActor=tenant/admin, stale approval, model/profile drift, race or faulty automation`; `preconditions=unbounded loop/action, auto-resume, stale authority or no kill/approval recheck`; `frameworkTechniqueIds=unknown/unavailable`; `likelihood=unknown/unavailable`; `impact=unauthorized send, delete, billing, routing or permission mutation`; `detectability=unknown/unavailable`; `inherentSeverity=P1, promoted to P0 for unauthorized destructive/financial/permission side effect`; `existingControlIds=unknown/unavailable; planned CTL-004, CTL-010, CTL-012 and CTL-017`; `residualSeverity=unknown/unavailable`; `negativeTestIds=TNEG-TH-032 stale approval/auto-resume/routing race/model profile/admin double-submit`; `detectionIds=unknown/unavailable; planned DET-CTL-010 and DET-CTL-012`; `containment=per-capability kill, workflow pause and queue drain`; `recovery=reconcile state/side effects, republish approved version and staged resume`; `owner=unknown/unavailable; Product+Security are roles only`; `reviewAt=unknown/unavailable`; `evidenceLocation=unknown/unavailable`; `status=planned-open`; `prevent=bounded DSL/state machine, immutable version/approval, execution-time authority and no autonomous destructive action`; `detect=loop/action budget, stale version, duplicate transition and kill-switch monitoring`; `respond=stop workflow and preserve run ledger`; `recover=manual reconciliation and verified version restore`.

35.7.2 רשם Control clusters קנוני.

35.7.2.0 נעילות מזהים קנוניות.

35.7.2.0.1 הרשימה המקומית הבאה משמרת את 39 הרשומות הראשונות בלבד ואינה ה־Lock הקנוני המלא: `FR-001=NIST CSF 2.0`; `FR-002=NIST SP 800-18r2`; `FR-003=NIST SP 800-53 5.2`; `FR-004=NIST SP 800-53A r5`; `FR-005=NIST SSDF 1.1`; `FR-006=OWASP SAMM 2.0`; `FR-007=NIST SP 800-61r3`; `FR-008=NIST SP 800-207`; `FR-009=NIST SP 800-161r1`; `FR-010=NIST Privacy Framework 1.0`; `FR-011=NIST AI RMF 1.0`; `FR-012=NIST SP 800-63B-4`; `FR-013=OWASP ASVS 5.0.0`; `FR-014=OWASP AISVS 1.0`; `FR-015=OWASP Top 10 2025`; `FR-016=OWASP API Security Top 10 2023`; `FR-017=OWASP GenAI LLM Top 10 2026`; `FR-018=OWASP Agentic Application Top 10 2026`; `FR-019=OWASP WSTG 4.2`; `FR-020=CIS Controls 8.1`; `FR-021=CSA CCM 4.1`; `FR-022=MITRE ATT&CK 19.2`; `FR-023=CAPEC 3.9`; `FR-024=CWE Top 25 2025`; `FR-025=CISA KEV`; `FR-026=CISA Secure by Design Bad Practices`; `FR-027=SLSA 1.2`; `FR-028=CycloneDX 1.7`; `FR-029=SPDX 3.0.1`; `FR-030=RFC 9116`; `FR-031=NIST IR 8374r1`; `FR-032=AWS S3 Object Lock`; `FR-033=PostgreSQL 16 Row Security`; `FR-034=PostgreSQL 16 CREATE FUNCTION security`; `FR-035=PostgreSQL 16 libpq verify-full`; `FR-036=NIST SP 800-218A`; `FR-037=NIST AI 100-2 E2025`; `FR-038=MITRE ATLAS`; `FR-039=LINDDUN PRO`; `RG-001=Provider/Legal/Product registries`; `RG-002=Delta process`. ה־Lock הקנוני הוא Enumeration מפורש `FR-001`–`FR-076` ב־A08/A09; עד שהוא קיים ונבדק, סעיף זה אינו Gate evidence. שינוי סדר אינו משנה ID ודורש Migration של Cross-references.

35.7.2.0.2 נעילת Dynamic-source IDs לפי 35.4 ו־A08: `DS-001=Meta WhatsApp`; `DS-002=OpenAI`; `DS-003=Clerk`; `DS-004=Vercel`; `DS-005=Railway`; `DS-006=AWS GuardDuty Malware Protection for S3`; `DS-007=AWS S3`; `DS-008=AWS KMS`; `DS-009=Next.js`; `DS-010=Runtime dependency/advisory graph`; `DS-011=Israeli privacy law and regulations`; `DS-012=Israel cross-border transfers`; `DS-013=Israeli marketing/direct-mail law`; `DS-014=Israeli accessibility authority`; `DS-015=Israeli tax/accounting authority`; `DS-016=GitHub`; `DS-017=Paddle`; `DS-018=Stripe`; `DS-019=Better Stack`; `DS-020=Amazon SES candidate in il-central-1`; `DS-021=PayPlus`; `DS-022=Apple App Store`; `DS-023=Google Play`; `DS-024=Tranzila`; `DS-025=Browser/PWA/Push-service live capability matrix`. שינוי Provider, authority או Scope דורש DS revision ו־Crosswalk migration; אין שימוש ב־DS family משולב.

35.7.2.1 `CTL-001`; `controlId=CTL-001`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=ממשל Scope/Registry/DAG/Freshness ללא Claim או עבודה שאינם קשורים לדרישה, סיכון, Gate ו־Evidence`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-020, FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, RG-001 and RG-002 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable pending Gate 1; applies to all product and governance assets`; `applicability=mandatory for every Scope`; `implementationTaskIds=unknown/unavailable pending completion of MP-F001`; `positiveTestIds=PT-CTL-001 complete unique registry and topological Gate order`; `negativeTestIds=NT-CTL-001 missing field, stale source, orphan requirement, duplicate ID or ambiguous decision`; `failureTestIds=FT-CTL-001 source/tool/approver unavailable remains blocked`; `concurrencyTestIds=CT-CTL-001 concurrent registry edit creates version conflict`; `runtimeDetection=planned registry freshness, coverage, duplicate and DAG monitors`; `evidenceType=versioned registries, decision records, QA report and canonical digest`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable; two named reviewers required for P0/P1`; `cadence=every change, Gate and Release; at least quarterly after GA`; `rollbackOrDisable=restore last approved digest and freeze affected capability`; `gate=29, 1 and 30`; `status=planned-open`.

35.7.2.2 `CTL-002`; `controlId=CTL-002`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=להגן על Source, dependency, CI, image, artifact ו־release provenance`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-005, FR-006, FR-008, FR-009, FR-020, FR-024, FR-025, FR-027, FR-028 and FR-029 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope GitHub, developer source, workflows, dependencies, images and builds`; `applicability=mandatory for all artifacts`; `implementationTaskIds=unknown/unavailable pending MP-F001`; `positiveTestIds=PT-CTL-002 clean checkout, pinned build, SBOM and attestation verify`; `negativeTestIds=NT-CTL-002 unpinned Action, tampered lock/artifact, broad token or self-approved sensitive change`; `failureTestIds=FT-CTL-002 scanner/attestation/reviewer unavailable blocks merge/promotion`; `concurrencyTestIds=CT-CTL-002 push after review invalidates approvals and artifact binding`; `runtimeDetection=planned KEV/dependency/image/action/ruleset drift monitors`; `evidenceType=GitHub exports, PR denial, SBOM, provenance, attestations and clean-checkout report`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable; two named reviewers for sensitive paths`; `cadence=every PR/build/release, KEV daily and access/ruleset monthly`; `rollbackOrDisable=block merge/deploy, revoke CI identity and return to verified artifact`; `gate=2, 24, 29 and 30`; `status=planned-open`.

35.7.2.3 `CTL-003`; `controlId=CTL-003`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=למנוע חשיפה/זיוף/אובדן של Secrets, cryptographic material, pseudonyms and signed evidence`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-003, FR-004, FR-012, FR-013, FR-020, FR-021, FR-031 and FR-032 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope vaults, KMS keys, provider credentials, HMAC/signing keys and encrypted data`; `applicability=mandatory wherever secret or key exists`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-003 narrow decrypt, approved key use, signature and rotation drill`; `negativeTestIds=NT-CTL-003 client/log/history canary, wrong key/grant/env, altered ciphertext/signature and raw SHA of low-entropy ID`; `failureTestIds=FT-CTL-003 KMS/decrypt/signer unavailable fails closed`; `concurrencyTestIds=CT-CTL-003 credential/key rotation races use explicit revision`; `runtimeDetection=planned secret canaries, KMS/crypto failures, policy/grant drift and signature verification`; `evidenceType=key policies, secret scan, rotation/recovery and signature reports`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable`; `cadence=every key/secret change, continuous detection and quarterly recovery`; `rollbackOrDisable=revoke/rotate, disable consumer and return to trusted revision without weakening crypto`; `gate=3, 5, 6.1, 6.2, 6.3 when applicable, 7, 23.1, 23.2 when applicable, 24 and 30`; `status=planned-open`.

35.7.2.4 `CTL-004`; `controlId=CTL-004`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=לאמת כל human/system identity, organization, role, session, recovery and privileged action`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-003, FR-004, FR-012, FR-013, FR-020 and FR-021 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope Clerk, control planes, admin, support, finance and break-glass`; `applicability=mandatory for every identity and privileged path`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-004 exact token/org/role plus phishing-resistant MFA and JIT approval`; `negativeTestIds=NT-CTL-004 wrong issuer/aud/azp/org, stale role, MFA/recovery bypass, shared account and self-approval`; `failureTestIds=FT-CTL-004 identity/MFA/revoke provider unavailable keeps mutation disabled`; `concurrencyTestIds=CT-CTL-004 role/offboarding/recovery race invalidates stale sessions before mutation`; `runtimeDetection=planned auth, privilege, recovery, membership and JIT expiry alerts`; `evidenceType=identity policy/export, denial suite, access review and recovery/offboarding drill`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable`; `cadence=every access change, monthly review and quarterly recovery drill`; `rollbackOrDisable=suspend principal/session/role and use only approved break-glass`; `gate=3, 8, 20, 24 and 30`; `status=planned-open`.

35.7.2.5 `CTL-005`; `controlId=CTL-005`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=להגן על Browser→Vercel BFF→Railway boundary and client-side interaction`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-013, FR-015, FR-016, FR-017, FR-018, FR-019 and FR-020 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope React, BFF, sessions, APIs, CSP/CORS/CSRF and embedded bridges`; `applicability=mandatory for every Browser journey`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-005 valid user plus workload identity reaches server authorization`; `negativeTestIds=NT-CTL-005 direct Railway, XSS, CSRF, clickjacking, wrong postMessage origin and Preview-to-Prod`; `failureTestIds=FT-CTL-005 identity/origin/CSP dependency failure blocks mutation`; `concurrencyTestIds=CT-CTL-005 organization/tab/session switch preserves request-specific authority`; `runtimeDetection=planned CSP, rejected origin/token and direct-ingress telemetry`; `evidenceType=route/trust matrix, browser suite, CSP and external denial proof`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable`; `cadence=every route/UI/security-header change and Release`; `rollbackOrDisable=disable affected BFF mutation/journey and revert verified deployment`; `gate=5, 6.1, 6.2, 8, 9, 24, 25 and 30`; `status=planned-open`.

35.7.2.6 `CTL-006`; `controlId=CTL-006`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=לאכוף Tenant and object authorization end-to-end with PostgreSQL RLS defense in depth`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-003, FR-004, FR-013, FR-019 and FR-020 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope all tenant-bound API/DB/queue/storage/search/export/telemetry`; `applicability=mandatory for all multi-tenant paths`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-006 correct tenant sees only authorized objects`; `negativeTestIds=NT-CTL-006 wrong tenant, owner/BYPASSRLS, SECURITY DEFINER, view/COPY/pool reuse and forged tenant selector`; `failureTestIds=FT-CTL-006 missing tenant context or policy fails closed`; `concurrencyTestIds=CT-CTL-006 pooled connection and organization switch leave no stale tenant state`; `runtimeDetection=planned cross-tenant canaries, authorization-denial and privilege/RLS drift`; `evidenceType=authorization matrix, RLS bypass matrix and live denial report`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable; two named reviewers required`; `cadence=every schema/role/query/path change and Release`; `rollbackOrDisable=disable principal/route and revoke grants without removing RLS`; `gate=5, 7, 20, 24, 26.1 and 30`; `status=planned-open`.

35.7.2.7 `CTL-007`; `controlId=CTL-007`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=להבטיח authenticated, durable, one-attempt and monotonic external side effects and webhooks`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-013, FR-015, FR-016, FR-017, FR-018, FR-019 and FR-020 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope provider operations, messages, templates, media, billing and webhook ingress`; `applicability=mandatory for every external mutation`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-007 exact acquisition/binding produces one attempt and verified fact`; `negativeTestIds=NT-CTL-007 forged/replayed webhook, wrong binding, blind retry, timestamp correlation and redirect-only success`; `failureTestIds=FT-CTL-007 timeout/crash/lost ACK after boundary remains unknown`; `concurrencyTestIds=CT-CTL-007 two workers/webhooks/retries converge without duplicate attempt`; `runtimeDetection=planned unknown-age, duplicate provider ID, receipt gap and ledger reconciliation`; `evidenceType=permit/acquisition/attempt/fact/uncertainty/reconcile ledgers and fault report`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable`; `cadence=every provider contract/adapter change and continuous reconciliation`; `rollbackOrDisable=disable operation Instance, preserve inbound facts and reconcile manually`; `gate=10, 12.1, 12.2.1, 12.2.2, 12.2.3, 12.2.4, 12.2.5, 12.2.6, 15, 19.3, 24 and 30`; `status=planned-open`.

35.7.2.8 `CTL-008`; `controlId=CTL-008`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=לאכוף Meta asset authority, consent/suppression, content/template policy, rate/quality and recipient safety`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-001, FR-010, FR-011, FR-013, FR-015, FR-016, FR-017, FR-018, FR-020 and RG-001 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope WABA/Phone/credentials, recipients, templates, campaigns, bots and AI send`; `applicability=mandatory for every WhatsApp operation`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-008 fresh asset/consent/rate evidence permits only exact approved send`; `negativeTestIds=NT-CTL-008 recipient/asset/credential/template/approval mismatch, opt-out, stale quality/rate and policy violation`; `failureTestIds=FT-CTL-008 Meta/docs/quality unavailable degrades then blocks by TTL`; `concurrencyTestIds=CT-CTL-008 consent/quality/credential changes between reservation and attempt invalidate permit`; `runtimeDetection=planned rate age, quality, 429, asset drift, opt-out and permit/attempt reconciliation`; `evidenceType=asset graph, consent/suppression ledger, rate snapshot, binding and Meta facts`; `evidenceLocation=unknown/unavailable`; `owner=Tal for rate/policy research; named implementation owner unknown/unavailable`; `reviewer=unknown/unavailable`; `cadence=runtime TTL in 16.5.8, docs weekly and terms monthly/before Release`; `rollbackOrDisable=per-connection/tenant/Instance/global send kill and queue drain`; `gate=9, 11, 12.2.1, 12.2.2, 12.2.3, 12.2.4, 12.2.5, 12.2.6, 13, 15, 26.1 and 30`; `status=planned-open`.

35.7.2.9 `CTL-009`; `controlId=CTL-009`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=להגן על PostgreSQL schema, roles, migrations, state machines, cutover precision and data integrity`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-003, FR-004, FR-013, FR-019, FR-020, FR-033, FR-034 and FR-035 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope D1 source, PostgreSQL target, migrations, constraints, sequences and roles`; `applicability=mandatory for all persistent data`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-009 migration parity, typed conversion, constraints and exact source-target reconciliation`; `negativeTestIds=NT-CTL-009 drift, precision loss, wrong migration/order/role, uncertain commit and file swap`; `failureTestIds=FT-CTL-009 migration/import interruption leaves additive recoverable state`; `concurrencyTestIds=CT-CTL-009 writers/migrator/cutover locks preserve single writer and CAS state`; `runtimeDetection=planned schema/grant/constraint/query/sequence and integrity drift`; `evidenceType=migration inventory, schema digest, parity report and cutover receipts`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable; two named reviewers for migrations`; `cadence=every migration/role/schema change and Restore/Cutover`; `rollbackOrDisable=stop writers, retain additive migrations and restore/replay verified slices`; `gate=7, 23.1, 23.2 when applicable, 24, 26.0.1, 26.0.2 and 30`; `status=planned-open`.

35.7.2.10 `CTL-010`; `controlId=CTL-010`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=לשמור queues/schedulers private, least-privileged, rebuildable, business-idempotent, bounded and reconciled to authoritative ledgers בלי לטעון exactly-once transport`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-003, FR-004, FR-013 and FR-020 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope Railway Redis image/network/config/ACL/AOF/HA, BullMQ, schedules, jobs, leases, Outbox, operation/attempt/receipt ledgers and DLQ`; `applicability=mandatory for asynchronous work`; `implementationTaskIds=unknown/unavailable pending rebuilt A02/A03 leaf mapping; sourceSections=11.8.12–11.8.21,34.31.6.1–34.31.6.7,34.32.2.14`; `positiveTestIds=PT-CTL-010 authorize/enqueue/claim/fence/execute/receipt/settle and deterministic rebuild from ledger with exactly one reconciled business outcome`; `negativeTestIds=NT-CTL-010 public or wrong ACL, forbidden command, duplicate/poison/stale/cross-tenant job, auto-removal/reused ID and blind retry from unknown`; `failureTestIds=FT-CTL-010 Redis startup/disconnect/restart/AOF-loss/noeviction/maxclients/disk-full/restore/failover/advisory drift and DLQ saturation`; `concurrencyTestIds=CT-CTL-010 two producers/workers/schedulers, lock loss, event-loop stall, clock skew, lease expiry and provider timeout after acceptance`; `runtimeDetection=planned external exposure/config/advisory drift, memory/persistence/replication, queue depth/age, DLQ, duplicate, lease, unknown and ledger reconciliation alerts`; `evidenceType=network/ACL/image/config exports, job/operation/attempt/receipt ledgers, drain/rebuild/restore/failover reports and zero-lost/zero-duplicate reconciliation`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable`; `cadence=continuous runtime, within seven days of every image deploy and every queue/scheduler/ACL/durability change`; `rollbackOrDisable=remove public exposure, revoke credential, pause producers/consumers/schedulers, quarantine unknown, drain and rebuild only from authoritative ledger`; `gate=6.1,6.2,11,12.2.1,12.2.2,12.2.3,12.2.4,15,17,23.1,26.0.2 and 30`; `status=planned-open`.

35.7.2.11 `CTL-011`; `controlId=CTL-011`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=להבטיח uploaded/media/knowledge objects remain tenant-bound, one-shot, quarantined and unparsed until exact clean verdict`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-013, FR-014, FR-019, FR-020 and FR-021 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope S3, upload sessions, scanner, parsers, indexes and media provider`; `applicability=mandatory when Upload/Knowledge/Media in Scope`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-011 exact session/checksum/VersionId clean chain`; `negativeTestIds=NT-CTL-011 replay/overwrite/wrong tenant, MIME/magic mismatch, macro/polyglot/archive/bomb and verdict spoof`; `failureTestIds=FT-CTL-011 upload/scan/parser timeout or unsupported remains non-clean`; `concurrencyTestIds=CT-CTL-011 concurrent PUT/object replacement/scan replay bound to exact VersionId`; `runtimeDetection=planned orphan/replay/version/checksum/verdict/resource-budget monitoring`; `evidenceType=upload/session policy, S3/IAM/KMS export, scan receipts and parser corpus`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable`; `cadence=every file/parser/scanner/S3 policy change and continuous object reconciliation`; `rollbackOrDisable=disable upload/media/knowledge path and quarantine affected versions`; `gate=6.3, 14.2, 18.2, 24 and 30`; `status=planned-open`.

35.7.2.12 `CTL-012`; `controlId=CTL-012`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=למזער AI data, constrain prompts/RAG/tools/agency and require measurable eval plus human approval`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-010, FR-011, FR-014, FR-015, FR-016, FR-017, FR-018, FR-036, FR-037 and FR-038 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope prompts, conversation data, knowledge, embeddings, model profiles, tools and output`; `applicability=mandatory for every AI capability`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-012 approved model/profile/store policy produces cited draft for human approval`; `negativeTestIds=NT-CTL-012 injection, poisoning, exfiltration, tool request, citation spoof, stale model and prohibited data use`; `failureTestIds=FT-CTL-012 model/provider/eval/budget outage falls back to human-only`; `concurrencyTestIds=CT-CTL-012 model/profile/approval/knowledge version changes invalidate stale run`; `runtimeDetection=planned eval, injection/exfiltration canary, quality/cost/tool and data-flow drift`; `evidenceType=model/data-control snapshots, DPIA/classification, eval/red-team and approval trace`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable; Legal/Privacy/Security review required`; `cadence=weekly during AI Pilot and every model/tool/knowledge/purpose change`; `rollbackOrDisable=AI-off, tool-off, knowledge quarantine and human-only mode`; `gate=18.1 when AI is in Scope, 18.2 when Knowledge/RAG/File is in Scope, 24, 26.1 and 30`; `status=planned-open`.

35.7.2.13 `CTL-013`; `controlId=CTL-013`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=לאכוף purpose/notice/consent, retention, legal hold, DSAR and durable bounded deletion`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-001, FR-003, FR-004, FR-010, FR-011, FR-020, FR-021, FR-039 and RG-001 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope all personal data classes and provider copies`; `applicability=mandatory for every personal-data flow`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-013 valid rights request/retention plan completes with receipts and audit`; `negativeTestIds=NT-CTL-013 wrong purpose/region/notice/cutoff/trigger/identity, active data, legal hold and re-deletion`; `failureTestIds=FT-CTL-013 provider timeout/partial deletion stays resumable unknown`; `concurrencyTestIds=CT-CTL-013 consent/hold/record activity changes during plan claim are rechecked atomically`; `runtimeDetection=planned retention, hold, saga-age, resurrection and DSAR SLA monitoring`; `evidenceType=legal/data-flow/retention matrix, plan/saga receipts and rights drill`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable; named legal approver required`; `cadence=every data/purpose/provider/legal change, quarterly legal review and each rights request`; `rollbackOrDisable=disable processing/transfer/destructive worker and preserve hold/evidence`; `gate=13, 21.1, 21.2, 24, 26.1 and 30`; `status=planned-open`.

35.7.2.14 `CTL-014`; `controlId=CTL-014`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=להבטיח consistent, signed, offsite WORM backup, isolated restore, privacy replay and measured continuity`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-001, FR-003, FR-004, FR-020, FR-021, FR-031 and FR-032 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope DB, S3, config, source, queues, secrets references and provider state`; `applicability=mandatory before Pilot restore claim and GA`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-014 exact backupId/LSN/VersionIds/key/digests restore in isolation`; `negativeTestIds=NT-CTL-014 wrong/tampered/expired backup, retention bypass, compromised admin and missing object`; `failureTestIds=FT-CTL-014 backup/KMS/provider/restore failure remains No-Go`; `concurrencyTestIds=CT-CTL-014 writer fence plus backup lifecycle/retention race preserves consistency/WORM`; `runtimeDetection=planned job/signature/retention/cohort/restore/RPO-RTO and object reconciliation`; `evidenceType=Backup Evidence v2, signed manifests, WORM policy and restore/BCP drills`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable; two named reviewers required`; `cadence=daily backup, monthly restore, continuous health, quarterly destructive drill and 90-day cohort`; `rollbackOrDisable=keep side effects/read-write disabled, reject invalid candidate and restore earlier verified set`; `gate=23.1, 23.2, 26.1 and 30`; `status=planned-open`.

35.7.2.15 `CTL-015`; `controlId=CTL-015`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=לספק trustworthy audit/telemetry, alerting, PSIRT and incident command through recovery`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-001, FR-003, FR-004, FR-007, FR-020, FR-021, FR-022, FR-023 and FR-030 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope logs, audit anchors, metrics/traces, SLO, on-call, VDP/PSIRT and incidents`; `applicability=mandatory for all live capabilities`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-015 trusted event triggers alert, acknowledged command and recovery evidence`; `negativeTestIds=NT-CTL-015 PII/secret, wrong tenant, altered audit, zero-traffic green, expired security.txt and missing owner`; `failureTestIds=FT-CTL-015 exporter/pager/signer/vendor unavailable activates safe alternate path`; `concurrencyTestIds=CT-CTL-015 duplicate alerts/reports/incidents preserve one command authority and full evidence`; `runtimeDetection=planned coverage/ingest/anchor/pager/contact/freshness monitors`; `evidenceType=redaction/coverage, signed audit anchor, alert drill, VDP case and incident report`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable`; `cadence=continuous, monthly contact, quarterly tabletop and after every incident`; `rollbackOrDisable=disable misleading exporter/dashboard/capability, use safe alternate command and preserve raw evidence`; `gate=7, 20, 22, 24, 26.1 and 30`; `status=planned-open`.

35.7.2.16 `CTL-016`; `controlId=CTL-016`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=לשמור ספקים, egress, availability, capacity and cost within verified contract and safe failure mode`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-001, FR-008, FR-009, FR-020, FR-021, FR-022, FR-023 and RG-001 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope all providers, outbound adapters, network, quotas and budgets`; `applicability=mandatory for every supplier/outbound dependency`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-016 approved provider/destination/capability operates within timeout/cap`; `negativeTestIds=NT-CTL-016 SSRF/private destination, stale plan/terms/rate, account suspension and unbounded cost`; `failureTestIds=FT-CTL-016 timeout/5xx/DNS/region/provider outage enters documented safe state`; `concurrencyTestIds=CT-CTL-016 plan/rate/DNS/config change during request invalidates stale authorization`; `runtimeDetection=planned approved real, official-sandbox or deterministic non-business availability probes לפי MP-F050, plus status/schema/freshness, egress, rate, cost and account-health monitors`; `evidenceType=provider registry, capability probes, egress denial, failure/exit and budget drill`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable; Tal only owns WhatsApp rate research subset`; `reviewer=unknown/unavailable`; `cadence=כל Provider/authority מציין sourceId מפורש מתוך 35.7.2.0.2 plus continuous runtime monitoring`; `rollbackOrDisable=per-provider/capability kill, manual fallback and verified failback`; `gate=5, 6.1, 6.2, 6.3 when applicable, 11, 18.1 when AI is in Scope, 18.2 when Knowledge/RAG/File is in Scope, 22, 26.1 and 30`; `status=planned-open`.

35.7.2.17 `CTL-017`; `controlId=CTL-017`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=לאכוף hosted payment boundary, verified finance facts, exact catalog, maker-checker and entitlement reconciliation`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-001, FR-003, FR-004, FR-013, FR-020 and RG-001 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope checkout, catalog, payments, refunds, credits and entitlements`; `applicability=disabled for Pilot unless Billing Scope explicitly approved`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-017 verified provider/finance event creates correct entitlement once`; `negativeTestIds=NT-CTL-017 PAN/CVV path, forged webhook, wrong price, redirect-only success, duplicate refund and self-approval`; `failureTestIds=FT-CTL-017 provider/finance uncertainty leaves entitlement pending/read-only`; `concurrencyTestIds=CT-CTL-017 duplicate webhooks/admin submits/refunds converge monotonically`; `runtimeDetection=planned provider-finance-entitlement, price, refund, cost and card-data scans`; `evidenceType=PCI responsibility, catalog digest, provider/finance reconciliation and approval audit`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable; Finance/Legal/Security named approval required`; `cadence=every provider/catalog/price/tax change and daily/monthly reconciliation as approved`; `rollbackOrDisable=activeProvider none, block new financial mutations and preserve verified paid rights per policy`; `gate=19.1, 19.2, 19.3, 20, 24 and 30`; `status=planned-open`.

35.7.2.18 `CTL-018`; `controlId=CTL-018`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=לספק accessible, operable and non-spoofable keyboard/screen-reader/zoom/mobile/RTL/Bidi journeys`; `frameworkRequirementIds=unknown/unavailable pending WCAG/legal crosswalk`; `targetAssets=unknown/unavailable; scope all UI, dialogs, content, identifiers and reports`; `applicability=mandatory for every user journey`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-018 complete critical journey by keyboard and assistive technology in required languages`; `negativeTestIds=NT-CTL-018 trapped/lost focus, unnamed control, zoom overflow, Bidi spoof and inaccessible destructive action`; `failureTestIds=FT-CTL-018 script/style/font/localization failure retains understandable safe state`; `concurrencyTestIds=CT-CTL-018 async updates/dialogs preserve focus and announcement order`; `runtimeDetection=planned accessibility regression plus manual/expert review tracking`; `evidenceType=WCAG matrix, automated/manual reports, expert and language review`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable; named accessibility/RTL/legal reviewers required`; `cadence=every component/journey/content change and pre-Release expert review`; `rollbackOrDisable=disable unsafe journey/action and provide approved accessible support alternative`; `gate=25, 26.1 and 30`; `status=planned-open`.

35.7.2.19 `CTL-019`; `controlId=CTL-019`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=להגן על people, developer endpoints, remote access, email and insider lifecycle`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-001, FR-003, FR-004, FR-005, FR-006, FR-007, FR-012, FR-020 and FR-026 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope workforce identities/devices, AnyDesk, mailboxes, finance/support and offboarding`; `applicability=mandatory for every person/account/device`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-019 managed named user/device with MFA and approved remote/mail workflow`; `negativeTestIds=NT-CTL-019 lost/revoked device, unknown remote, clipboard transfer, phishing/BEC, stale leaver and insider misuse`; `failureTestIds=FT-CTL-019 EDR/MFA/mail/remote provider unavailable blocks sensitive access`; `concurrencyTestIds=CT-CTL-019 offboarding/device loss during active session revokes before further action`; `runtimeDetection=planned device posture, remote session, mailbox/alignment, access and offboarding alerts`; `evidenceType=device/account inventory, MFA/EDR/patch, session/mail and offboarding drills`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable`; `cadence=continuous posture, monthly access, every joiner/mover/leaver and quarterly tabletop`; `rollbackOrDisable=revoke person/device/session/channel and freeze sensitive operations`; `gate=2, 3, 8, 19.1, 20, 24, 29 and 30`; `status=planned-open`.

35.7.2.20 `CTL-020`; `controlId=CTL-020`; `registryVersion=MP-REG-1.1-draft`; `controlObjective=להבטיח exact DNS/origin/callback, environment isolation, signed release, staged deployment, cutover and rollback`; `frameworkRequirementIds=unknown/unavailable pending requirement-level crosswalk; target FR-003, FR-004, FR-008, FR-009, FR-013, FR-020, FR-021 and FR-027 לפי מיפוי 35.3.8`; `targetAssets=unknown/unavailable; scope Vercel, Railway, DNS/TLS, callbacks, releases, migrations and routing`; `applicability=mandatory for every deployment/cutover`; `implementationTaskIds=unknown/unavailable`; `positiveTestIds=PT-CTL-020 exact signed artifact/environment/callback passes staged canary and rollback drill`; `negativeTestIds=NT-CTL-020 dangling/wildcard DNS, wrong origin/callback, Preview-to-Prod, unsigned artifact and wrong migration`; `failureTestIds=FT-CTL-020 DNS/cert/deploy/migration readiness failure remains No-Go`; `concurrencyTestIds=CT-CTL-020 cert/DNS/artifact/config rotation preserves one composite release and writer`; `runtimeDetection=planned DNS/cert/origin/callback/release/artifact and routing drift`; `evidenceType=DNS/cert exports, composite manifest, attestations, canary/cutover/rollback receipts`; `evidenceLocation=unknown/unavailable`; `owner=unknown/unavailable`; `reviewer=unknown/unavailable; two named release reviewers required`; `cadence=every deploy/domain/callback/cutover and continuous certificate/routing monitoring`; `rollbackOrDisable=traffic/side-effect kill, return to verified artifact/routing and preserve additive DB state`; `gate=6.1, 6.2, 6.3 when applicable, 8, 9, 24, 26.0.1, 26.0.2, 29 and 30`; `status=planned-open`.

35.7.3 Crosswalk קנוני.

35.7.3.1 Crosswalk חלקי היסטורי לתחומים 34.32.2.1–34.32.2.34. הוא נשמר כ־Provenance בלבד ואינו Crosswalk קנוני; A06 מחליף אותו ב־42 רשומות מפורשות ואינו רשאי להסתפק בטווח.

35.7.3.1.1 תחום 34.32.2.1 ממשל, נכסים וגבולות אמון; `threatIds=TH-001, TH-002, TH-003, TH-004, TH-005, TH-006, TH-007, TH-008, TH-009, TH-010, TH-011, TH-012, TH-013, TH-014, TH-015, TH-016, TH-017, TH-018, TH-019, TH-020, TH-021, TH-022, TH-023, TH-024, TH-025, TH-026, TH-027, TH-028, TH-029, TH-030, TH-031, TH-032`; `controlIds=CTL-001`; `findingIds=MP-F001, MP-F010, MP-F030, MP-F031`; `status=planned-open`; Asset/flow/boundary evidence `unknown/unavailable` עד Gate 1.

35.7.3.1.2 תחום 34.32.2.2 GitHub ושרשרת האספקה; `threatIds=TH-007, TH-014, TH-025`; `controlIds=CTL-002`; `findingIds=MP-F023, MP-F024, MP-F025, MP-F034, MP-F036`; `status=planned-open`.

35.7.3.1.3 תחום 34.32.2.3 Secrets ומפתחות; `threatIds=TH-007, TH-031`; `controlIds=CTL-003`; `findingIds=MP-F007, MP-F020, MP-F021, MP-F032, MP-F036`; `status=planned-open`.

35.7.3.1.4 תחום 34.32.2.4 חשבונות Control Plane; `threatIds=TH-007, TH-015, TH-016, TH-017, TH-026, TH-031`; `controlIds=CTL-003, CTL-004`; `findingIds=MP-F019, MP-F020, MP-F025, MP-F026`; `status=planned-open`.

35.7.3.1.5 תחום 34.32.2.5 Vercel ו־React delivery; `threatIds=TH-014, TH-017, TH-018`; `controlIds=CTL-002, CTL-005, CTL-020`; `findingIds=MP-F014, MP-F035`; `status=planned-open`.

35.7.3.1.6 תחום 34.32.2.6 Railway network ו־Runtime; `threatIds=TH-016, TH-019, TH-020, TH-023, TH-031`; `controlIds=CTL-003, CTL-010, CTL-016`; `findingIds=MP-F002, MP-F018, MP-F026, MP-F035`; `status=planned-open`.

35.7.3.1.7 תחום 34.32.2.7 Clerk, Authentication ו־Organizations; `threatIds=TH-015, TH-024, TH-026`; `controlIds=CTL-004`; `findingIds=MP-F020`; `status=planned-open`.

35.7.3.1.8 תחום 34.32.2.8 בידוד Tenant ו־PostgreSQL RLS; `threatIds=TH-001, TH-016`; `controlIds=CTL-006`; `findingIds=MP-F015, MP-F026`; `status=planned-open`.

35.7.3.1.9 תחום 34.32.2.9 API Authorization, Validation ו־Injection; `threatIds=TH-001, TH-018, TH-021, TH-032`; `controlIds=CTL-005, CTL-006, CTL-016`; `findingIds=MP-F014, MP-F021, MP-F022`; `status=planned-open`.

35.7.3.1.10 תחום 34.32.2.10 Browser, XSS, CSRF ו־CORS; `threatIds=TH-018`; `controlIds=CTL-005`; `findingIds=MP-F014`; `status=planned-open`.

35.7.3.1.11 תחום 34.32.2.11 Webhooks, Replay ו־Idempotency; `threatIds=TH-003, TH-005, TH-013, TH-020`; `controlIds=CTL-007, CTL-010, CTL-017`; `findingIds=MP-F008, MP-F009, MP-F033`; `status=planned-open`.

35.7.3.1.12 תחום 34.32.2.12 Meta WhatsApp; `threatIds=TH-002, TH-003, TH-004, TH-005, TH-006, TH-021, TH-028`; `controlIds=CTL-007, CTL-008`; `findingIds=MP-F005, MP-F006, MP-F007, MP-F008, MP-F009, MP-F029, MP-F033`; `status=planned-open`.

35.7.3.1.13 תחום 34.32.2.13 PostgreSQL, Migrations ו־Data integrity; `threatIds=TH-001, TH-008, TH-009, TH-016`; `controlIds=CTL-006, CTL-009`; `findingIds=MP-F004, MP-F005, MP-F006, MP-F013, MP-F015, MP-F026, MP-F035`; `status=planned-open`.

35.7.3.1.14 תחום 34.32.2.14 Redis ו־BullMQ; `threatIds=TH-002, TH-003, TH-020, TH-021`; `controlIds=CTL-010`; `findingIds=MP-F008, MP-F033`; `status=planned-open`.

35.7.3.1.15 תחום 34.32.2.15 Uploads, Malware ו־AWS S3; `threatIds=TH-011, TH-012, TH-031`; `controlIds=CTL-011`; `findingIds=MP-F003, MP-F019, MP-F027, MP-F028, MP-F035`; `status=planned-open`.

35.7.3.1.16 תחום 34.32.2.16 SSRF ו־Outbound egress; `threatIds=TH-019, TH-023`; `controlIds=CTL-016`; `findingIds=MP-F018`; `status=planned-open`.

35.7.3.1.17 תחום 34.32.2.17 הצפנה ו־KMS; `threatIds=TH-007, TH-009, TH-031`; `controlIds=CTL-003, CTL-014`; `findingIds=MP-F007, MP-F012, MP-F017, MP-F019, MP-F032, MP-F036`; `status=planned-open`.

35.7.3.1.18 תחום 34.32.2.18 Logging, Audit ו־Telemetry; `threatIds=TH-007, TH-022, TH-026`; `controlIds=CTL-003, CTL-015`; `findingIds=MP-F017, MP-F030, MP-F036`; `status=planned-open`.

35.7.3.1.19 תחום 34.32.2.19 Rate limiting, DoS ו־Cost exhaustion; `threatIds=TH-002, TH-021`; `controlIds=CTL-008, CTL-016`; `findingIds=MP-F029`; `status=planned-open`.

35.7.3.1.20 תחום 34.32.2.20 OpenAI privacy ו־Data lifecycle; `threatIds=TH-012, TH-027, TH-028`; `controlIds=CTL-012, CTL-013`; `findingIds=MP-F010, MP-F031`; `status=planned-open`.

35.7.3.1.21 תחום 34.32.2.21 Prompt injection, RAG poisoning ו־Excessive agency; `threatIds=TH-012, TH-032`; `controlIds=CTL-012`; `findingIds=MP-F022, MP-F031`; `status=planned-open`.

35.7.3.1.22 תחום 34.32.2.22 Retention, Legal Hold ומחיקה; `threatIds=TH-010, TH-027`; `controlIds=CTL-013`; `findingIds=MP-F011, MP-F016, MP-F032`; `status=planned-open`.

35.7.3.1.23 תחום 34.32.2.23 Backup, Restore ו־Ransomware; `threatIds=TH-009, TH-010, TH-031`; `controlIds=CTL-014`; `findingIds=MP-F012, MP-F013, MP-F016, MP-F019, MP-F034, MP-F036`; `status=planned-open`.

35.7.3.1.24 תחום 34.32.2.24 Deployment, Migration ו־Rollback; `threatIds=TH-008, TH-014, TH-017, TH-020`; `controlIds=CTL-002, CTL-009, CTL-020`; `findingIds=MP-F002, MP-F025, MP-F030, MP-F035, MP-F036`; `status=planned-open`.

35.7.3.1.25 תחום 34.32.2.25 Vulnerability ו־Dependency management; `threatIds=TH-007, TH-014, TH-025`; `controlIds=CTL-002, CTL-019`; `findingIds=MP-F024, MP-F025, MP-F034, MP-F035`; `status=planned-open`.

35.7.3.1.26 תחום 34.32.2.26 Campaign business logic ו־Maker-checker; `threatIds=TH-002, TH-003, TH-006, TH-021, TH-032`; `controlIds=CTL-008, CTL-010`; `findingIds=MP-F008, MP-F009, MP-F029, MP-F033`; `status=planned-open`.

35.7.3.1.27 תחום 34.32.2.27 DNS, Domains ו־Origin; `threatIds=TH-017, TH-024`; `controlIds=CTL-020`; `findingIds=MP-F014, MP-F020`; `status=planned-open`.

35.7.3.1.28 תחום 34.32.2.28 מחשבי פיתוח ו־AnyDesk; `threatIds=TH-007, TH-025, TH-026`; `controlIds=CTL-019`; `findingIds=MP-F020, MP-F025, MP-F034`; `status=planned-open`.

35.7.3.1.29 תחום 34.32.2.29 זמינות ותלות בספקים; `threatIds=TH-020, TH-021, TH-023, TH-030, TH-031`; `controlIds=CTL-010, CTL-014, CTL-015, CTL-016`; `findingIds=MP-F018, MP-F019, MP-F029, MP-F035`; `status=planned-open`.

35.7.3.1.30 תחום 34.32.2.30 Incident response ו־Recovery; `threatIds=TH-001, TH-002, TH-003, TH-004, TH-005, TH-006, TH-007, TH-008, TH-009, TH-010, TH-011, TH-012, TH-013, TH-014, TH-015, TH-016, TH-017, TH-018, TH-019, TH-020, TH-021, TH-022, TH-023, TH-024, TH-025, TH-026, TH-027, TH-028, TH-029, TH-030, TH-031, TH-032`; `controlIds=CTL-014, CTL-015`; `findingIds=MP-F012, MP-F013, MP-F016, MP-F017, MP-F023, MP-F034, MP-F036`; `status=planned-open`.

35.7.3.1.31 תחום 34.32.2.31 Supplier security ו־Third-party governance; `threatIds=TH-007, TH-012, TH-014, TH-023, TH-027, TH-028, TH-031`; `controlIds=CTL-001, CTL-002, CTL-016`; `findingIds=MP-F010, MP-F019, MP-F023, MP-F024, MP-F025, MP-F031, MP-F034, MP-F035, MP-F036`; `status=planned-open`.

35.7.3.1.32 תחום 34.32.2.32 Email, Phishing ו־Business Email Compromise; `threatIds=TH-015, TH-024, TH-026`; `controlIds=CTL-004, CTL-019`; `findingIds=MP-F020, MP-F023, MP-F025`; `status=planned-open`.

35.7.3.1.33 תחום 34.32.2.33 People security, Insider risk ו־Security awareness; `threatIds=TH-007, TH-015, TH-024, TH-025, TH-026, TH-030`; `controlIds=CTL-004, CTL-015, CTL-019`; `findingIds=MP-F020, MP-F023, MP-F025, MP-F026`; `status=planned-open`.

35.7.3.1.34 תחום 34.32.2.34 Billing, Payments, PCI ו־Entitlements; `threatIds=TH-003, TH-005, TH-013, TH-021, TH-023, TH-024, TH-032`; `controlIds=CTL-007, CTL-016, CTL-017`; `findingIds=MP-F008, MP-F010, MP-F020, MP-F025, MP-F033, MP-F036`; `status=planned-open`.

35.7.3.2 Crosswalk חלקי היסטורי ל־MP-F001–MP-F036. הוא נשמר כ־Provenance בלבד ואינו Crosswalk קנוני; A06 מחליף אותו ב־52 רשומות MP-F001–MP-F052 עם מיפוי דו־כיווני מלא.

35.7.3.2.1 `MP-F001`; `threatIds=TH-001, TH-002, TH-003, TH-004, TH-005, TH-006, TH-007, TH-008, TH-009, TH-010, TH-011, TH-012, TH-013, TH-014, TH-015, TH-016, TH-017, TH-018, TH-019, TH-020, TH-021, TH-022, TH-023, TH-024, TH-025, TH-026, TH-027, TH-028, TH-029, TH-030, TH-031, TH-032`; `controlIds=CTL-001`; `cyberDomains=34.32.2.1`; `rationale=רשם WBS חסר מונע Traceability לכל איום ובקרה`; `status=open-partially-planned`; Owner/Evidence `unknown/unavailable`.

35.7.3.2.2 `MP-F002`; `threatIds=TH-016, TH-020, TH-023`; `controlIds=CTL-001, CTL-016`; `cyberDomains=34.32.2.6, 34.32.2.24`; `rationale=המעגל ההיסטורי שנפתר בסדר Gate 6.1 → Gate 7 → Gate 6.2 עלול היה לאשר Runtime/authorization ללא סדר מוכח`; `status=open-text-corrected`.

35.7.3.2.3 `MP-F003`; `threatIds=TH-011, TH-012, TH-031`; `controlIds=CTL-011`; `cyberDomains=34.32.2.15`; `rationale=Upload/Media חייבים Gate ו־Safe state נפרדים מ־Core`; `status=open-text-corrected`.

35.7.3.2.4 `MP-F004`; `threatIds=TH-008, TH-016`; `controlIds=CTL-009`; `cyberDomains=34.32.2.13, 34.32.2.24`; `rationale=טענת Table provenance שגויה פוגעת ב־Migration safety`; `status=open-text-corrected`.

35.7.3.2.5 `MP-F005`; `threatIds=TH-002, TH-003, TH-004`; `controlIds=CTL-007, CTL-008, CTL-009`; `cyberDomains=34.32.2.11, 34.32.2.12, 34.32.2.13`; `rationale=Acquisition provenance נדרשת ל־one-attempt ול־exact authority`; `status=open-text-corrected`.

35.7.3.2.6 `MP-F006`; `threatIds=TH-002, TH-003, TH-004`; `controlIds=CTL-007, CTL-008, CTL-009`; `cyberDomains=34.32.2.12, 34.32.2.13`; `rationale=Binding שאינו Byte-exact מאפשר drift או replay`; `status=open-text-corrected`.

35.7.3.2.7 `MP-F007`; `threatIds=TH-002, TH-004, TH-007`; `controlIds=CTL-003, CTL-007`; `cyberDomains=34.32.2.3, 34.32.2.12, 34.32.2.17`; `rationale=פענוח מוקדם מרחיב חשיפה ועוקף committed proof`; `status=open-text-corrected`.

35.7.3.2.8 `MP-F008`; `threatIds=TH-002, TH-003, TH-005, TH-013, TH-032`; `controlIds=CTL-007, CTL-008, CTL-017`; `cyberDomains=34.32.2.11, 34.32.2.12, 34.32.2.26, 34.32.2.34`; `rationale=Gate גורף מאפשר Side-effect family שלא נבדקה`; `status=open-text-corrected`.

35.7.3.2.9 `MP-F009`; `threatIds=TH-003, TH-022`; `controlIds=CTL-007, CTL-015`; `cyberDomains=34.32.2.11, 34.32.2.12, 34.32.2.18, 34.32.2.26`; `rationale=Accepted אינו Sent והבלבול מטעה State, KPI ותגובה`; `status=open-text-corrected`.

35.7.3.2.10 `MP-F010`; `threatIds=TH-001, TH-002, TH-003, TH-004, TH-005, TH-006, TH-007, TH-008, TH-009, TH-010, TH-011, TH-012, TH-013, TH-014, TH-015, TH-016, TH-017, TH-018, TH-019, TH-020, TH-021, TH-022, TH-023, TH-024, TH-025, TH-026, TH-027, TH-028, TH-029, TH-030, TH-031, TH-032`; `controlIds=CTL-001, CTL-016`; `cyberDomains=34.32.2.1, 34.32.2.20, 34.32.2.31, 34.32.2.34`; `rationale=בחירות ספק/חוזה/חלופה פתוחות מונעות Safe state חד־משמעי`; `status=open-partially-corrected`.

35.7.3.2.11 `MP-F011`; `threatIds=TH-010, TH-027`; `controlIds=CTL-013`; `cyberDomains=34.32.2.22`; `rationale=מחיקה חוצת Boundaries דורשת Saga ולא Atomic claim`; `status=open-text-corrected`.

35.7.3.2.12 `MP-F012`; `threatIds=TH-009, TH-031`; `controlIds=CTL-014`; `cyberDomains=34.32.2.17, 34.32.2.23, 34.32.2.30`; `rationale=Ransomware claim דורש WORM והפרדת Admin/Key`; `status=open-text-corrected`.

35.7.3.2.13 `MP-F013`; `threatIds=TH-008, TH-009, TH-020, TH-031`; `controlIds=CTL-009, CTL-010, CTL-014`; `cyberDomains=34.32.2.13, 34.32.2.23`; `rationale=Backup ללא Consistency point ו־Replay quarantine אינו Restore בטוח`; `status=open-text-corrected`.

35.7.3.2.14 `MP-F014`; `threatIds=TH-015, TH-017, TH-018`; `controlIds=CTL-004, CTL-005, CTL-020`; `cyberDomains=34.32.2.5, 34.32.2.7, 34.32.2.10, 34.32.2.27`; `rationale=Browser/BFF/Railway boundary חייבת זהות משתמש ועומס עבודה נפרדות`; `status=open-text-corrected`.

35.7.3.2.15 `MP-F015`; `threatIds=TH-001, TH-016`; `controlIds=CTL-006`; `cyberDomains=34.32.2.8, 34.32.2.13`; `rationale=RLS bypass matrix נדרשת לכל Principal/Object/path`; `status=open-text-corrected`.

35.7.3.2.16 `MP-F016`; `threatIds=TH-009, TH-027, TH-031`; `controlIds=CTL-013, CTL-014`; `cyberDomains=34.32.2.22, 34.32.2.23`; `rationale=90-day Evidence דורש Cohort אמיתי ולא Config`; `status=open-text-corrected`.

35.7.3.2.17 `MP-F017`; `threatIds=TH-007, TH-022, TH-026, TH-031`; `controlIds=CTL-003, CTL-015`; `cyberDomains=34.32.2.17, 34.32.2.18, 34.32.2.30`; `rationale=Audit anchor חייב להיות חיצוני, חתום ו־WORM`; `status=open-text-corrected`.

35.7.3.2.18 `MP-F018`; `threatIds=TH-019, TH-023`; `controlIds=CTL-016`; `cyberDomains=34.32.2.6, 34.32.2.16, 34.32.2.29`; `rationale=Static source IP אינו Destination enforcement`; `status=open-text-corrected`.

35.7.3.2.19 `MP-F019`; `threatIds=TH-011, TH-016, TH-031`; `controlIds=CTL-003, CTL-011, CTL-014`; `cyberDomains=34.32.2.4, 34.32.2.15, 34.32.2.17, 34.32.2.23, 34.32.2.31`; `rationale=AWS account/key/owner foundation חסרה`; `status=open-external-blocked`.

35.7.3.2.20 `MP-F020`; `threatIds=TH-015, TH-024, TH-025, TH-026`; `controlIds=CTL-004, CTL-019`; `cyberDomains=34.32.2.4, 34.32.2.7, 34.32.2.27, 34.32.2.28, 34.32.2.32, 34.32.2.33`; `rationale=חשבונות חזקים דורשים Phishing-resistant MFA ו־safe recovery`; `status=open-text-corrected`.

35.7.3.2.21 `MP-F021`; `threatIds=TH-007, TH-015, TH-018`; `controlIds=CTL-003, CTL-005`; `cyberDomains=34.32.2.3, 34.32.2.9`; `rationale=Randomness/CSPRNG ללא Registry ו־אישור יוצר predictable או לא־שחזור state`; `status=open-external-blocked`.

35.7.3.2.22 `MP-F022`; `threatIds=TH-012, TH-018, TH-019, TH-032`; `controlIds=CTL-002, CTL-005, CTL-012, CTL-016`; `cyberDomains=34.32.2.9, 34.32.2.10, 34.32.2.21, 34.32.2.25`; `rationale=Corpus אקראי אינו Reproducible evidence`; `status=open-text-corrected`.

35.7.3.2.23 `MP-F023`; `threatIds=TH-023, TH-024, TH-030`; `controlIds=CTL-015, CTL-019`; `cyberDomains=34.32.2.2, 34.32.2.30, 34.32.2.31, 34.32.2.32, 34.32.2.33`; `rationale=VDP/PSIRT/security.txt נדרשים לגילוי ותגובה לדיווח חיצוני`; `status=open-text-corrected`.

35.7.3.2.24 `MP-F024`; `threatIds=TH-014, TH-025, TH-026`; `controlIds=CTL-002, CTL-019`; `cyberDomains=34.32.2.2, 34.32.2.25, 34.32.2.31, 34.32.2.33`; `rationale=SSDF/SAMM נדרשים לאכיפת SDL ולא Policy בלבד`; `status=open-text-corrected`.

35.7.3.2.25 `MP-F025`; `threatIds=TH-007, TH-014, TH-025, TH-026`; `controlIds=CTL-002, CTL-019`; `cyberDomains=34.32.2.2, 34.32.2.4, 34.32.2.24, 34.32.2.25, 34.32.2.28, 34.32.2.31, 34.32.2.32, 34.32.2.33, 34.32.2.34`; `rationale=שינוי רגיש דורש שני Reviewers והגנת Workflow`; `status=open-text-corrected`.

35.7.3.2.26 `MP-F026`; `threatIds=TH-001, TH-007, TH-016, TH-026`; `controlIds=CTL-004, CTL-006, CTL-019`; `cyberDomains=34.32.2.4, 34.32.2.6, 34.32.2.8, 34.32.2.13, 34.32.2.33`; `rationale=Human Production DB access חייב להיות אישי, JIT, מאושר ומבוטל`; `status=open-text-corrected`.

35.7.3.2.27 `MP-F027`; `threatIds=TH-011, TH-031`; `controlIds=CTL-011`; `cyberDomains=34.32.2.15, 34.32.2.17`; `rationale=Presigned upload דורש one-shot state, no-overwrite ו־exact VersionId`; `status=open-text-corrected`.

35.7.3.2.28 `MP-F028`; `threatIds=TH-011, TH-012`; `controlIds=CTL-011`; `cyberDomains=34.32.2.15`; `rationale=DOCX הוא OOXML container מאומת ולא Archive כללי`; `status=open-text-corrected`.

35.7.3.2.29 `MP-F029`; `threatIds=TH-002, TH-021, TH-023`; `controlIds=CTL-008, CTL-016`; `cyberDomains=34.32.2.12, 34.32.2.19, 34.32.2.26, 34.32.2.29`; `rationale=Rate/quality evidence חייב TTL מספרי ו־Fail-closed`; `status=open-text-corrected`; Owner מחקר טל, שאר הבעלות `unknown/unavailable`.

35.7.3.2.30 `MP-F030`; `threatIds=TH-001, TH-002, TH-003, TH-004, TH-005, TH-006, TH-007, TH-008, TH-009, TH-010, TH-011, TH-012, TH-013, TH-014, TH-015, TH-016, TH-017, TH-018, TH-019, TH-020, TH-021, TH-022, TH-023, TH-024, TH-025, TH-026, TH-027, TH-028, TH-029, TH-030, TH-031, TH-032`; `controlIds=CTL-001, CTL-015`; `cyberDomains=34.32.2.1, 34.32.2.18, 34.32.2.24, 34.32.2.30`; `rationale=QA היסטורי אינו Evidence ל־Snapshot הנוכחי`; `status=open-explicitly-invalidated`.

35.7.3.2.31 `MP-F031`; `threatIds=TH-001, TH-002, TH-003, TH-004, TH-005, TH-006, TH-007, TH-008, TH-009, TH-010, TH-011, TH-012, TH-013, TH-014, TH-015, TH-016, TH-017, TH-018, TH-019, TH-020, TH-021, TH-022, TH-023, TH-024, TH-025, TH-026, TH-027, TH-028, TH-029, TH-030, TH-031, TH-032`; `controlIds=CTL-001`; `cyberDomains=34.32.2.1, 34.32.2.20, 34.32.2.21, 34.32.2.31`; `rationale=34 domains הם Baseline ולא Crosswalk framework/control מלא`; `status=open-partially-corrected`.

35.7.3.2.32 `MP-F032`; `threatIds=TH-007, TH-022, TH-027`; `controlIds=CTL-003, CTL-013`; `cyberDomains=34.32.2.3, 34.32.2.17, 34.32.2.18, 34.32.2.22`; `rationale=Low-entropy identifiers דורשים purpose-separated HMAC`; `status=open-text-corrected`.

35.7.3.2.33 `MP-F033`; `threatIds=TH-003, TH-005, TH-013, TH-020, TH-032`; `controlIds=CTL-007, CTL-010, CTL-017`; `cyberDomains=34.32.2.11, 34.32.2.12, 34.32.2.14, 34.32.2.26, 34.32.2.34`; `rationale=כל Side effect חיצוני דורש Unknown-outcome ledger נפרד`; `status=open-partially-corrected`.

35.7.3.2.34 `MP-F034`; `threatIds=TH-014, TH-023, TH-030`; `controlIds=CTL-002, CTL-014, CTL-015`; `cyberDomains=34.32.2.2, 34.32.2.23, 34.32.2.25, 34.32.2.28, 34.32.2.29, 34.32.2.30, 34.32.2.31`; `rationale=GitHub source/history/settings דורשים offsite restore`; `status=open-unplanned`.

35.7.3.2.35 `MP-F035`; `threatIds=TH-007, TH-014, TH-016, TH-017, TH-023, TH-031`; `controlIds=CTL-002, CTL-003, CTL-016, CTL-020`; `cyberDomains=34.32.2.5, 34.32.2.6, 34.32.2.13, 34.32.2.17, 34.32.2.24, 34.32.2.25, 34.32.2.29, 34.32.2.31`; `rationale=Container hardening ו־PostgreSQL verify-full חייבים live capability/evidence`; `status=open-text-corrected`.

35.7.3.2.36 `MP-F036`; `threatIds=TH-007, TH-008, TH-009, TH-014, TH-022, TH-031`; `controlIds=CTL-003, CTL-009, CTL-014, CTL-015, CTL-020`; `cyberDomains=34.32.2.2, 34.32.2.3, 34.32.2.13, 34.32.2.17, 34.32.2.18, 34.32.2.23, 34.32.2.24, 34.32.2.30, 34.32.2.31, 34.32.2.34`; `rationale=Manifest trust דורש canonical bytes, separated signer and verifier trust anchor`; `status=open-partially-corrected`.

35.7.3.3 Crosswalk ל־Provider/Terms deltas רשמיים שנבדקו לאחרונה ב־27.08.2026.

35.7.3.3.1 Meta WhatsApp AI/provider terms; `sourceId=DS-001`; `canonicalSources=https://www.whatsapp.com/legal/business-solution-terms, https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform-preview`; `sourceState=current Terms modified 2026-03-06 and official future text effective 2026-09-23 retrieved; detached digests, live country allowlist, account/legal acceptance and signed applicability unknown/unavailable`; `threatIds=TH-002, TH-012, TH-023, TH-027, TH-028`; `controlIds=CTL-008, CTL-012, CTL-013, CTL-016`; `cyberDomains=34.32.2.12, 34.32.2.20, 34.32.2.21, 34.32.2.29, 34.32.2.31`; `findingIds=MP-F010, MP-F029, MP-F031`; `mandatoryDecision=Connect keeps AI ancillary regardless of country, disables AI-primary functionality, requires human approval for every AI-assisted WhatsApp output and preserves an AI-off path; no jurisdiction inference grants an exception`; `thirdPartyBoundary=OpenAI may be used only as an approved third-party provider under signed contract/DPA, approved data instructions and Meta/Legal classification`; `trainingBoundary=no WhatsApp Business Platform Data, including derived or aggregate data, may be used for general model training or improvement; exclusive-use fine-tuning remains disabled until a separate approved lifecycle`; `risk=Meta account suspension or termination and unlawful/prohibited data use`; `freshness=Terms snapshot and legal delta review before any Pilot send, weekly during Pilot, immediately before 2026-09-23 and on every effective-date/country change`; `safeState=AI-off plus outbound/template/campaign hold when Terms, contract, account classification or legal review is stale`; `status=planned-open`; Owner, legal approval, contract, account evidence and artifact digest `unknown/unavailable`.

35.7.3.3.2 Meta delta gate effective 2026-09-23; `sourceId=DS-001`; `threatIds=TH-023, TH-028`; `controlIds=CTL-001, CTL-008, CTL-012, CTL-016`; `requiredGate=pre-Pilot and pre-effective-date Provider/Legal Delta Gate`; `acceptance=old/new Terms artifacts and digests, semantic diff, affected data flows/capabilities, signed Legal/Product/Security decision, customer/contract impact, safe state and negative retest all exist before enablement`; `negativeTest=Pilot or AI path attempts to rely on pre-delta approval after the review expiry/effective date and is blocked`; `failureTest=official text, account acceptance or legal authority unavailable keeps AI-off and affected outbound disabled`; `concurrencyTest=Terms effectiveAt changes while a release/approval is in progress invalidates the stale release manifest`; `detection=Terms freshness and effective-date monitor with alerts before 30/14/7/1 days`; `rollbackOrDisable=AI-off, disable affected outbound Instances and retain human-only support where separately lawful`; `evidenceLocation=unknown/unavailable`; `status=planned-open`.

35.7.3.3.2.1 Platform preview evidence state; `sourceId=DS-001`; `officialAnnouncement=https://www.facebook.com/legal/wa-for-business-terms-preview`; `checkedAt=2026-08-27`; `result=four official Platform preview texts retrieved and a fifth Meta Inbox preview classified conditional`; `classification=source-verified/digest-and-legal-review-pending`; `effectiveAt=2026-09-23`; `forbiddenInference=preview is not current account acceptance before effectiveAt and does not alone prove Solution Provider authorization`; `blockingTask=store exact English-US old/new artifacts, retrieval metadata, hashes, semantic/legal diff, hierarchy/applicability, customer-contract impact and account-acceptance evidence`; `safeState=affected outbound, AI and provider-role paths disabled at or after effectiveAt until approval`; `status=planned-open`.

35.7.3.3.2.2 Service-provider role delta; `sourceId=DS-001`; `canonicalSource=https://www.whatsapp.com/legal/business-terms-for-service-providers`; `sourceState=official terms modified 2018-06-12, applicability requires WhatsApp authorization`; `threatIds=TH-002, TH-012, TH-023, TH-027, TH-028`; `controlIds=CTL-001, CTL-003, CTL-008, CTL-013, CTL-016`; `mandatoryDecision=Meta+Legal signed classification of Connect role before any Partner claim or multi-client onboarding`; `requiredIfApplicable=client acceptance and WABA consent, authorized access, front-line support/TLS/API ownership, Meta-vs-Connect price transparency, WABA+data transfer within 30 calendar days, prompt local deletion after transfer unless instructed otherwise`; `negativeTest=pre-created WABA, hidden Meta charge, denied client access, transfer older than 30 days, residual token/data after transfer or unauthorized Partner claim is rejected`; `failureTest=authorization or legal applicability unknown keeps multi-client Meta path disabled`; `concurrencyTest=client revocation/transfer or Meta role change invalidates pending sends and stale delegated grants`; `rollbackOrDisable=stop new sends, revoke grants/tokens/subscriptions, transfer/export, reconcile deletion and preserve only lawfully retained audit/hold data`; `status=planned-open`.

35.7.3.3.2.3 Future Meta/Cloud contract binding; `sourceId=DS-001`; `canonicalSources=https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform-preview, https://www.facebook.com/legal/WhatsApp-Business-Platform-Cloud-API-preview, https://www.whatsapp.com/legal/WhatsApp-Terms-for-WhatsApp-Business-Platform/preview`; `threatIds=TH-001,TH-002,TH-007,TH-012,TH-017,TH-023,TH-027,TH-028,TH-031`; `controlIds=CTL-003,CTL-008,CTL-012,CTL-013,CTL-016,CTL-020`; `mandatoryRequirements=Messaging Account ownership, authorized-account access, credential security and immediate breach notice, Rate Card/spend suspension handling, Prohibited-data exclusion, AI-primary/training boundary, global-transfer notice, 90-day return/deletion, backup independence, reporting SLA, termination and no-affiliation/publicity controls`; `negativeTest=wrong owner/account, unauthorized Solution Provider claim, prohibited/high-confidentiality data, general-model improvement, missing incident notice, stale acceptance, missing return/export or Meta-as-backup claim is rejected`; `failureTest=legal hierarchy or account acceptance unavailable keeps the affected route disabled`; `concurrencyTest=Terms/account/provider-role change invalidates pending permits and stale release approval`; `status=planned-open`.

35.7.3.3.2.4 Rate/quality binding; `sourceId=DS-001`; `canonicalSources=https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform, https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput, https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits, https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-quality, https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-pacing, https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits`; `threatIds=TH-003,TH-007,TH-020,TH-023,TH-030`; `controlIds=CTL-007,CTL-010,CTL-016`; `publishedCeilings=management 200/5000 per hour, portfolio 250/2000/10000/100000/unlimited, phone 80/1000/20 mps, pair 1 per 6 seconds`; `mandatoryDecision=published value never grants entitlement; effective permit is the minimum of fresh live Provider/Portfolio/Phone/Pair/Quality/Template/Consent/Window/Geo/Cost/Connect/Queue/DB constraints`; `negativeTest=stale/missing field, unknown enum, one phone consuming portfolio, pair burst, low quality, held template, US marketing, 131049 early retry or 131050 opt-out yields no send`; `failureTest=cap zero`; `concurrencyTest=webhook downgrade wins over cached permit and cancels unattempted reservations`; `status=planned-open`.

35.7.3.3.2.5 Webhook security and delivery binding; `sourceId=DS-001`; `canonicalSources=https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview, https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint, https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages`; `threatIds=TH-001,TH-003,TH-005,TH-007,TH-017,TH-019,TH-020,TH-023,TH-030`; `controlIds=CTL-003,CTL-005,CTL-007,CTL-010,CTL-016,CTL-020`; `mandatoryRequirements=valid TLS, optional mTLS approved, exact verify-token challenge, raw-body HMAC-SHA256 constant-time validation, 3MB/1000-update bounds, durable idempotent acceptance, duplicate/reorder handling, seven-day retry tolerance, 3x outbound plus 1x inbound capacity and latency objectives`; `negativeTest=bad/missing signature, mutated body, replay/duplicate/reorder, oversized/deep payload, wrong WABA/App/Phone, self-signed TLS or forged verification fails closed`; `failureTest=no authenticated durable acceptance means no state transition or permit`; `concurrencyTest=same event across workers creates one inbox/outcome transition`; `status=planned-open`.

35.7.3.3.2.6 Optional-product exclusion; `sourceId=DS-001`; `routes=Marketing Messages API and Meta Business Suite Inbox`; `baseState=disabled/not-applicable with no credentials, endpoints, queues, schema, UI claim or network reachability`; `mandatoryDecision=Cloud API only for Pilot`; `activation=separate Decision amendment, contract/DPA/data-flow/geo/cost/provider availability, rollback, tests, evidence and independent Gate`; `negativeTest=Base route, secret, request, webhook subscription or UI attempts either optional product and is blocked`; `status=planned-open`.

35.7.3.3.3 OpenAI API data controls; `sourceId=DS-002`; `canonicalSource=https://developers.openai.com/api/docs/guides/your-data`; `sourceState=official dynamic documentation; artifact digest, OpenAI account settings, ZDR approval and DPA unknown/unavailable`; `threatIds=TH-012, TH-023, TH-027, TH-028`; `controlIds=CTL-012, CTL-013, CTL-016`; `cyberDomains=34.32.2.20, 34.32.2.21, 34.32.2.29, 34.32.2.31`; `mandatoryDecision=foreground Responses with store:false is the only default Pilot route, but store:false is not a ZDR claim`; `retentionBoundary=default abuse-monitoring logs may be retained up to 30 days; application state/default Responses behavior can retain state for 30 days or longer according to endpoint/configuration; ZDR requires explicit provider approval and live account evidence; background processing can use temporary disk; Files and Vector Stores persist until deleted under their endpoint lifecycle`; `disabledByDefault=background mode, Files, Vector Stores, hosted containers/tools, MCP and third-party egress until a separate endpoint-specific data-flow, retention, deletion and legal review is approved`; `negativeTest=store:false is presented as ZDR, a background/File/Vector path is enabled without lifecycle proof, or Business Solution Data is routed to model improvement`; `failureTest=account data controls, ZDR status, retention documentation or DPA unavailable forces human-only/AI-off`; `concurrencyTest=model/endpoint/store setting changes during a run invalidate the stale profile before submission`; `detection=weekly model/data-control snapshot, request-profile telemetry without message content, endpoint inventory and deletion reconciliation`; `rollbackOrDisable=AI-off, stop new submissions, delete provider objects where contractually supported and reconcile provider receipts`; `evidenceLocation=unknown/unavailable`; `status=planned-open`.

35.7.3.3.4 AWS S3 quarantine and GuardDuty Malware Protection for S3; `sourceIds=DS-006,DS-007,DS-008`; `canonicalSources=official AWS sources in 35.4.7`; `sourceState=il-central-1 is the target Region; live account/region/bucket/IAM/KMS/quota/cost/event capability remains unknown/unavailable until probe`; `threatIds=TH-009, TH-011, TH-031`; `controlIds=CTL-011, CTL-014, CTL-016`; `cyberDomains=34.32.2.15, 34.32.2.17, 34.32.2.23, 34.32.2.29, 34.32.2.31`; `findingIds=MP-F003, MP-F012, MP-F019, MP-F027, MP-F028, MP-F035, MP-F036`; `mandatoryDecision=private S3 quarantine in il-central-1, GuardDuty Malware Protection for S3 only after live capability probe, and a separate WORM backup account/bucket`; `tbacBoundary=only a terminal result for the exact Account, Bucket, Key, VersionId and Checksum with result NO_THREATS_FOUND can authorize Clean; FAILED, UNSUPPORTED, ACCESS_DENIED, timeout, missing, malformed, duplicate or unknown remain Quarantined`; `parserBoundary=NO_THREATS_FOUND does not validate file format or parser safety; Extension/MIME/Magic/OOXML structure, active-content rejection, decompression/resource budgets and sandboxed parser remain mandatory`; `negativeTest=wrong VersionId/checksum, replayed event, failed/unsupported/access-denied verdict, malicious DOCX/Polyglot or public/broad bucket policy cannot reach parser/index/user`; `failureTest=GuardDuty/EventBridge/KMS/Region/account capability unavailable leaves Upload/Media/Knowledge disabled or Quarantined`; `concurrencyTest=object replacement, rescan and out-of-order duplicate event remain bound to the exact immutable VersionId`; `detection=quarantine age, verdict/version mismatch, event/DLQ/reconciliation, bucket/KMS drift and WORM retention alarms`; `rollbackOrDisable=disable upload/media/knowledge, quarantine affected versions and keep backup/Ransomware claim blocked`; `evidenceLocation=unknown/unavailable`; `status=planned-open`.

35.7.3.3.5 CTL delta binding; `sourceIds=DS-001,DS-002,DS-006,DS-007,DS-008`; `CTL-008` inherits Meta Terms restrictions, AI-ancillary/human-approval/AI-off and pre-2026-09-23 Delta Gate; `CTL-012` inherits OpenAI endpoint-specific retention, store:false-not-ZDR, no-model-improvement and provider-object deletion rules; `CTL-013` inherits provider retention/deletion and DPA/legal obligations; `CTL-016` inherits dynamic Terms/account/region/capability freshness and fail-closed provider safe states; `CTL-011` inherits exact TBAC NO_THREATS_FOUND plus independent format/parser sandbox; `CTL-014` inherits separate WORM backup account/bucket and exact restore manifest; `status=planned-open`; implementationTaskIds, named owners/reviewers and evidence locations remain `unknown/unavailable`.

35.7.4 תנאי קבלה לרשם 35.7.

35.7.4.1 יש בדיוק 32 Threat records, אחד־לאחד ל־Risk 1–32, ולכל אחד כל שדות 35.3.4 וכן prevent, detect, respond, recover ובדיקה שלילית.

35.7.4.2 יש בדיוק 20 Control clusters בעלי IDs יציבים ולכל אחד כל שדות 35.3.5. Cluster אינו הוכחת Implementation; כל Evidence/Owner/Reviewer שלא הוכחו נשארים `unknown/unavailable`.

35.7.4.3 יש 42 Domain crosswalk records ו־52 Finding crosswalk records לאחר שילוב A06/A09. כל Crosswalk מפרט Threat IDs אחד־אחד; אין טווח שמחליף Enumeration או מסתיר מזהה חסר.

35.7.4.4 מצב כל Threat/Control הוא `planned-open`; Gate 29, Gate 1 ופיתוח נשארים חסומים עד שילוב, QA, מינוי שמי, Tasks ו־Evidence לפי Scope.

35.7.4.5 ה־Lock הקנוני ב־A08/A09 מכיל בדיוק 76 רשומות Framework עצמאיות `FR-001`–`FR-076`, שתי רשומות Process ‏`RG-001`–`RG-002` ו־25 רשומות Dynamic source עצמאיות `DS-001`–`DS-025`. אין Alias מורכב, Family DS משולב או ID ישן; כל Control ו־Provider delta מפנה רק למזהה הקנוני המתאים. ‏FR-070–FR-072 מפרידים את פרוטוקול Web Push, הצפנת Payload ו־VAPID מ־W3C Push API; FR-073–FR-076 מפרידים Notifications, Background Sync, Storage ו־Permissions; DS-025 מפריד תקן מן התמיכה החיה ב־Browser/OS/Push service. ה־Enumeration המקומי החלקי ב־35.7.2.0.1 אינו מספיק ל־PASS.
