# GitHub Governance live audit

## 1. זהות ה־Snapshot

1.1 Repository שנבדק: `talstilkol/connect`.

1.2 זמן בדיקה: `2026-08-16T19:20:20Z`.

1.3 Branch מקומי שנבדק: `codex/cloudflare-evidence-builders`.

1.4 Commit מקומי ו־Remote: `68987f2926c4ec08463fe6a39c080b966587738c`.

1.5 Commit של `origin/main`: `5cb6a0fc8e021ec4250e0f4652603cfd3369a61d`.

1.6 אופן הבדיקה: GitHub App, ‏GitHub REST API ציבורי, Git remote
מקומי וכלי הבדיקה של ה־Repository. כל קריאות GitHub היו Read-only.

## 2. מסקנה

2.1 מצב GitHub אינו עומד בדרישות Gate 1.

2.2 הממצא החמור ביותר: ה־Repository הוא `public`, אף שהדרישה
שהתקבלה מטל היא `private`.

2.3 אין לבצע Deployment, להעביר Credentials או לצרף נתוני לקוחות
לפני סגירת החשיפה והשלמת Governance.

## 3. ממצאים מאומתים

3.1 **P0 — Visibility שגוי:** שני API clients נפרדים החזירו
`private: false` ו־`visibility: public`.

3.2 **P0 — אין הגנת Branch:** ארבעת הענפים הבאים מדווחים
`protected: false`:

3.2.1 `main`.

3.2.2 `codex/cloudflare-evidence-builders`.

3.2.3 `codex/github-evidence-builders`.

3.2.4 `codex/pr-quality-gates`.

3.3 **P0 — אין Rulesets:** קריאת `GET /repos/talstilkol/connect/rulesets`
החזירה רשימה ריקה.

3.4 **P1 — בעלות אישית:** Owner הוא GitHub User בשם `talstilkol`,
לא Organization. החיבור המאומת אינו חבר בשום GitHub Organization.

3.5 **P1 — Authentication מקומי שבור:** ‏`gh auth status` מדווח
שה־Token המקומי של `talstilkol` אינו תקף. Git push ממשיך לעבוד דרך
מנגנון Credentials אחר, אך כלי Governance ו־Evidence שמסתמכים על
`gh` חסומים.

3.6 **P1 — אין CODEOWNERS:** לא נמצא קובץ `CODEOWNERS` ב־Repository.

3.7 **P1 — הענף הנוכחי אינו תחת Pull Request:** לא נמצא PR עבור
`codex/cloudflare-evidence-builders`, ולא נמצאו Workflow runs עבור
Commit `68987f2`.

3.8 **P1 — PR ישן פתוח:** ‏PR #1, ‏`ci: add pull request quality
gates`, פתוח מהענף `codex/pr-quality-gates` אל `main`. הוא Mergeable
אך לא מוזג ולא התבקש Reviewer.

3.9 **P1 — Checks קיימים אך אינם Required:** ב־PR #1 עברו בהצלחה
שני Workflows ובהם תשעת Jobs הבאים:

3.9.1 `source-guardrails`.

3.9.2 `secret-hygiene`.

3.9.3 `interface-guardrails`.

3.9.4 `dependency-lock`.

3.9.5 `migrations`.

3.9.6 `typecheck`.

3.9.7 `lint`.

3.9.8 `tests-and-build`.

3.9.9 `dependency-audit`.

3.10 ארבעה Workflows מדווחים `active`: ‏`Dependency audit evidence`,
`Pull request quality gates`, ‏`Team invitation browser E2E`
ו־`Dependabot Updates`.

3.11 GitHub מדווח על Vulnerability אחת ברמת `moderate` בענף ברירת
המחדל. פרטי ההתראה אינם זמינים דרך ה־Authentication התקול ולכן אין
לנחש את החבילה או את התיקון.

3.12 בדיקת `npm run verify:secret-hygiene` עברה על הקבצים העקובים
ועל היסטוריית Git. זו ראיה חיובית, אך לאחר Repository ציבורי היא
אינה מוכיחה ש־Credential שהיה חשוף בעבר לא הועתק.

## 4. מידע שלא ניתן לאמת

4.1 רשימת Collaborators והרשאותיהם: `unknown/unavailable`.

4.2 מצב 2FA של החשבון ושל Collaborators: `unknown/unavailable`.

4.3 הגדרות Secret scanning ו־Push protection:
`unknown/unavailable`.

4.4 Actions secrets, ‏Variables ו־Environments:
`unknown/unavailable`; הערכים עצמם גם אינם אמורים להופיע בדוח.

4.5 פרטי Dependabot alert והאם קיימת גרסה מתוקנת:
`unknown/unavailable`.

## 5. סדר תיקון מחייב

5.1 **עצירת חשיפה:** לא להוסיף Secrets, ‏PII, ‏Credentials או נתוני
לקוחות. בעל הרשאת Admin הופך את `talstilkol/connect` ל־`private`
ומאמת את ה־Visibility מחדש מ־Session שאינו מחובר.

5.2 **טיפול בהיסטוריה:** מריצים Secret scan נוסף. כל Credential
שיש ספק לגביו עובר Rotation; שינוי Git history לבדו אינו מבטל Secret
שכבר נחשף.

5.3 **Authentication:** מבטלים את ה־Token המקומי הלא תקף ומבצעים
Login מחדש עם הרשאות Read מצומצמות ל־Audit. Tokens ל־Deployment
נשארים נפרדים ואינם מוזנים ל־`gh`.

5.4 **בעלות:** רועי מאשר את ADR-0002, יוצר Organization בבעלות
החברה ובוחר Plan שתומך בהגנות הנדרשות ל־Repository פרטי.

5.5 **Transfer:** מבצעים Inventory, מעבירים את ה־Repository הקיים
ל־Organization ומעדכנים את `origin`. אין לפתוח עותק חדש.

5.6 **Least privilege:** מזמינים זהויות אישיות, מפעילים 2FA policy
ומקצים Roles לפי ADR-0002. אין משתמש או Token משותף.

5.7 **Ruleset:** מגינים על `main`, חוסמים Force push ומחיקה, דורשים
Pull Request, ‏Reviewer, פתרון Review threads, ביטול Approvals ישנים
ואת כל תשעת ה־Checks.

5.8 **CODEOWNERS:** מוסיפים Owners אמיתיים לפי תחום רק לאחר שכל
GitHub usernames ידועים. אין להכניס שמות מומצאים.

5.9 **Pull Requests:** מחליטים אם PR #1 עדיין נדרש או הוחלף, ופותחים
PR נפרד לענף `codex/cloudflare-evidence-builders`. אין למזג אוטומטית
לפני Review והשוואת ההיסטוריה.

5.10 **Evidence:** מפיקים Source Control Governance Evidence ו־CI
Execution Evidence עבור אותו Commit לאחר שכל הבקרות פעילות.

## 6. תנאי סיום Gate 1

6.1 Repository `private` תחת Organization מאושר.

6.2 לפחות שני Organization Owners מזוהים עם 2FA ונתיב התאוששות.

6.3 `main` מוגן ב־Ruleset פעיל וללא Bypass רחב.

6.4 ‏CODEOWNERS ו־Review חובה פעילים.

6.5 תשעת ה־Checks Required ועוברים ב־Pull Request אמיתי.

6.6 ‏Secret scanning, ‏Push protection ו־Dependabot findings נבדקו.

6.7 Governance Evidence תקף מקושר ל־Repository, ‏Commit ו־Release.

6.8 עד להשלמת כל הסעיפים: Gate 1 נשאר `blocked`.

## 7. תיקון מקומי לאחר ה־Audit

7.1 בבדיקת עומק נוספת נמצא שחוזה Source Control Governance Evidence
v2 לא כלל את Visibility של ה־Repository בין בקרי החובה.

7.2 החוזה הועלה ל־v3 ונוסף לו הבקר `repositoryPrivate`. המחולל דורש
כעת Metadata עקבי שבו `private=true` וגם `visibility=private`.

7.3 Evidence v2 נדחה מעתה, משום שאינו יכול להוכיח שה־Repository
פרטי. Repository ציבורי או Metadata סותר נכשלים סגור ואינם מפיקים
Evidence.

7.4 ב־`2026-08-16T19:47:05Z`, לאחר Authentication אישי של טל,
ה־Repository הועבר דרך GitHub Settings מ־Public ל־Private.

7.5 האימות בוצע בשני ערוצים: ממשק GitHub הציג שה־Repository פרטי,
ו־GitHub API המאומת החזיר `private: true` ו־`visibility: private`.

7.6 שני ה־Commits המקומיים, כולל דוח זה וחוזה Evidence v3, נדחפו
לענף `codex/cloudflare-evidence-builders`. ‏Draft PR #2 נפתח מול
`main` ואינו מאושר ל־Merge אוטומטי.

7.7 GitHub דיווח בזמן ה־Push על שלושה Dependabot findings בענף
ברירת המחדל: שניים ברמת `high` ואחד ברמת `moderate`. פרטי החבילות
והתיקונים עדיין `unknown/unavailable` עד בדיקה ייעודית.

7.8 תיקון ה־Visibility סוגר את ממצא 3.1 בלבד. Gate 1 נשאר `blocked`
בגלל בעלות אישית, היעדר Ruleset ו־CODEOWNERS, ענפים לא מוגנים,
בקרות Security שטרם אומתו ו־Draft PR שאינו מוכן למיזוג.

## 8. בדיקת המשך לאחר המעבר ל־Private

8.1 ארבעת הענפים נבדקו מחדש לאחר התיקון וכולם עדיין דיווחו
`protected: false`.

8.2 מסך Collaborators דיווח `0` Collaborators ושהבעלים הוא היחיד
שיכול לתרום. לכן אין כרגע Reviewer עצמאי, ואין להפעיל Approval חובה
באופן שעלול לנעול את `main` ללא נתיב Merge מאושר.

8.3 מסך Advanced Security הראה ש־Dependency graph, ‏Dependabot
alerts ו־Dependabot security updates פעילים.

8.4 אותו מסך הראה `0` Dependabot rules, ‏Malware alerts כבויים,
Grouped security updates כבויים ו־Dependabot version updates אינם
מוגדרים דרך קובץ ב־`main`.

8.5 קריאת Repository Metadata מאומתת החזירה
`security_and_analysis: null`. ‏Secret scanning ו־Push protection
אינם מוצגים כבקרות פעילות, ולכן Source Control Governance Evidence
v3 חייב להמשיך להיכשל סגור.

8.6 ‏PR #2 עבר את כל תשעת ה־Checks עבור Commit `aeefdbf`, אך הם
עדיין אינם Required Checks. ה־PR נשאר Draft וכולל 49 Commits מול
`main`; אין למזג אותו לפני Review והכרעה לגבי אסטרטגיית הענפים.

## 9. בדיקת Dependency המשכית — 2026-08-17

9.1 `npm audit` המלא זיהה שהשניים מבין שלושת Advisory findings
ברמת High נובעים מ־`image-size@2.0.2`, שננעל כתלות של
`vinext@0.0.50`. שני ה־Advisories עוסקים בלולאה אינסופית בפרסור
ICNS ובפרסור JXL/HEIF.

9.2 Vinext שודרג ל־`1.0.0-beta.6`, גרסה שאינה תלויה עוד ב־
`image-size`. ‏Peer dependency מסוג `@vitejs/plugin-rsc` שודרג יחד
עמו מ־`0.5.26` ל־`0.5.34`. לאחר ההתקנה `npm ls` הוכיח שאין
`image-size` בגרף.

9.3 Vinext החדש דחה את Matcher ה־Proxy הישן כביטוי עמום. הביטוי
הוחלף ברשימה מפורשת של Root, ‏Login, ‏Register, ‏Workspace, ‏Admin,
Invitation, ‏API, ‏TRPC ו־Clerk. בדיקת Boundary חדשה דורשת שכל
המשטחים המאומתים יישארו ברשימה ואוסרת להחזיר את הביטוי העמום.

9.4 Build, ‏TypeScript, ‏Dependency lock ו־`drizzle-kit check`
עברו לאחר השינוי. `npm audit --omit=dev` מול Registry הרשמי החזיר
אפס פגיעויות ב־32 תלויות Production.

9.5 ה־Audit המלא הציג שרשרת אחת ברמת Moderate:
`drizzle-kit@0.31.10` השתמש ב־`@esbuild-kit/esm-loader`, שהחזיק
`esbuild@0.18.20`. ה־Advisory חל על שרת הפיתוח של esbuild, אך הממצא
לא נשאר פתוח רק משום שהמסלול אינו נגיש ב־Production.

9.6 ‏npm הציע `drizzle-kit@0.18.1` כתיקון, אך זהו Downgrade שובר.
במקום `npm audit fix --force`, נוסף Override צר ומפורש עבור
`@esbuild-kit/core-utils` אל `esbuild@0.25.12`. זו גרסה מתוקנת שכבר
נצרכה ישירות על ידי אותה גרסת Drizzle Kit, ולכן היא צמצמה את שינוי
הגרף לעותק הטרנזיטיבי הפגיע בלבד.

9.7 התראות GitHub בענף ברירת המחדל לא ייסגרו לפני Merge של התיקון.
הבדיקה המקומית וה־PR אינן משנות את מצב `main` בעצמן.

9.8 שער CI החי לגרף ה־Development מקבל מעתה רק אפס ממצאים ונכשל עבור
כל Advisory או חזרה של `image-size`. ה־Lockfile guard דורש גם את
ה־Override ואת `esbuild@0.25.12` המדויקים. שער ה־Migrations מריץ
`drizzle-kit check` ויצירת Migration מבודדת מה־Schema האמיתי, ומאמת
SQL ו־Journal לפני מחיקת התוצר הזמני. בכך ה־Risk acceptance הקודם
בוטל והוחלף בתיקון עם בדיקת תאימות בפועל.

## 10. אימות חוזר של Dependabot — 2026-08-20

10.1 מסך Dependabot המאומת מציג עדיין שלוש התראות פתוחות ב־`main`:

10.1.1 ‏#3, ‏High: ‏`image-size <= 2.0.2`, ‏ICNS parser DoS,
`CVE-2025-71330` / `GHSA-w3rx-r6r6-pgpr`. ‏GitHub אינו מציג גרסה
מתוקנת.

10.1.2 ‏#2, ‏High: ‏`image-size <= 2.0.2`, ‏JXL/HEIF parser DoS,
`CVE-2025-71329` / `GHSA-5p2g-fcmc-qvqq`. ‏GitHub אינו מציג גרסה
מתוקנת.

10.1.3 ‏#1, ‏Moderate: ‏`esbuild <= 0.24.2`, ‏Development server
CORS, ‏`GHSA-67mh-4wv8-2f99`. הגרסה המתוקנת הראשונה היא `0.25.0`.

10.2 ההבדל בין הענפים אומת מחדש: `origin/main` עדיין נועל
`image-size@2.0.2` ו־`esbuild@0.18.20`, ואילו ענף העבודה אינו מכיל
`image-size` כלל ומכיל רק `esbuild@0.25.12` ו־`0.28.1`. לכן אין
לסגור או לדחות את ההתראות; הן ייסגרו רק לאחר שהתיקון יגיע לענף ברירת
המחדל.

10.3 ‏Draft PR #2 פתוח ו־Mergeable מול `main`, אך גדל ל־151 Commits
ו־578 קבצים. ה־Head המאומת הוא `2515ec991b4ddc1c89466bee58cf1f047aaa95d1`.
ה־PR אינו מוכן למיזוג ללא Review ואסטרטגיית Merge מפורשת.

10.4 שני Workflow runs עבור אותו Head הופעלו בשלושה Attempts ונכשלו
בלי להתחיל אף Step ובלי ליצור Logs. ממשק GitHub הציג Annotation שלפיו
ה־Job לא התחיל משום שתשלומי החשבון האחרונים נכשלו או שיש להגדיל את
Spending limit. לכן הכשל אינו ראיה לכשל Build או Audit, אך גם אינו מספק
CI Evidence תקף. אין להפעיל Attempt נוסף לפני הסדרת Billing.

10.5 רענון `npm audit` מקומי לא הושלם משום שהסביבה לא הצליחה להגיע ל־
npm Registry. שער הפיתוח נשאר Fail-closed, אך כשל Registry מדווח מעתה
כ־`DEVELOPMENT_DEPENDENCY_AUDIT_REGISTRY_FAILED` במקום להיראות בטעות
כ־Advisory חדש.

10.6 האימות שאינו תלוי ברשת עבר: Build, ‏TypeScript, ‏ESLint, ‏Dependency
Lock, ‏Source Guard, ‏Secret Hygiene וכל 2,116 הבדיקות. אין לפרש תוצאה זו
כתחליף ל־Audit חי ומאושר מול ה־Registry.
