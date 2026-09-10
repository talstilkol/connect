# 1. Connect — ביקורת עצמאית ללוח זמנים, אומדנים, DAG ומכני התקדמות

## 1.1 זהות הביקורת

1.1.1 מזהה הביקורת הוא `CONNECT-MASTER-SCHEDULE-AUDIT-2026-08-29-V1`.

1.1.2 נושא הביקורת הוא הקובץ `/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`.

1.1.3 ה־SHA-256 הגולמי של נושא הביקורת בזמן הקפאת הקלט הוא `643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

1.1.4 גודל נושא הביקורת הוא `10,425` שורות ו־`1,059,872` בתים.

1.1.5 הביקורת היא תכנונית ו־Read-only ביחס לקוד המוצר, Git, GitHub, ספקים, חשבונות ו־Runtime. היא אינה מאשרת פיתוח, Commit, Push, Deployment, Migration, Credential או שינוי Visibility.

1.1.6 שיטת הקריאה כללה מעבר על הקובץ מתחילתו ועד סופו, מיפוי כל הכותרות, חילוץ כל אומדני השלבים והחבילות, בדיקת כל חוזי Section 34–35, בדיקת המספור סביב 35.6, וסריקות מכונה נפרדות ל־Task IDs, שעות, Scope, Gate, Findings, `unknown/unavailable`, DAG, משאבים ו־Critical path.

## 1.2 פסק דין

1.2.1 פסק הדין הוא `REJECT-AS-SCHEDULE-BASELINE`.

1.2.2 `Gate 29=BLOCKED` נשאר נכון. אין בסיס להקלה, משום שה־Task Registry הקנוני המובטח בסעיף 35.6 אינו קיים, אין DAG קנוני, אין Capacity Manifest, אין Scope Manifest מאושר ואין Root digest קנוני.

1.2.3 אחוז ההשלמה המדויק של תוכנית המוצר הוא `unknown/unavailable`. אין מכנה מאושר ולכן אסור להציג `0%`, `X%` או אחוז אחר כאחוז מוצר. העובדה ש־Gate 29 חסום היא מצב בינארי של שער אחד בלבד, לא אחוז השלמת מוצר.

1.2.4 ETA מספרי לסיום התוכנית הוא `unknown/unavailable`. גם תאריך וגם טווח שבועות אינם ניתנים לחישוב בכנות לפני יצירת 35.6, קבלת Scope Manifest, מינוי אנשים וקיבולות, בניית DAG נטול מחזורים, הכנסת External waits כ־Nodes וביצוע Gate 1 על עבודה קיימת.

1.2.5 טווחי השעות המופיעים כיום במסמך הם לכל היותר `Narrative ROM`. חלקם סותרים אריתמטית את טווחי השלבים וחלקם הוגדרו במפורש כמבוטלים אך עדיין מופיעים בהמשך המסמך. לכן אף אחד מהם אינו Estimate קנוני, Remaining או Commitment.

1.2.6 אין Finding שנסגר בביקורת זו. הדוח מתעד פערים ותכנון תיקון בלבד.

## 1.3 מוני תוצאה מדויקים

| מדד | תוצאה |
|---|---:|
| Findings חדשים בביקורת זו | `26` |
| P0 | `12` |
| P1 | `9` |
| P2 | `4` |
| P3 | `1` |
| כותרות Section 35.6 בנושא הביקורת | `0` |
| שדות `taskId=` בנושא הביקורת | `0` |
| Findings קנוניים קיימים `MP-F001–MP-F052` | `52` |
| Findings קנוניים קיימים במצב פתוח | `52` |
| Findings קנוניים קיימים המסווגים P0 | `21` |
| Findings קנוניים קיימים המסווגים P1 | `31` |
| משימות המשך בעלות אומדן בתוך 35.5 | `52` |
| סכום נרטיבי של אותן 52 משימות | `276–380` שעות אדם |
| Review statuses בראש המסמך | `11/11 pending` |
| Canonical SHA-256 של Master מאושר | `unknown/unavailable` |
| אחוז מוצר קנוני | `unknown/unavailable` |
| ETA קנוני | `unknown/unavailable` |

1.3.1 ספירת `unknown/unavailable` בטקסט היא `881` מופעים. זהו אות לאי־ודאות רחבה, לא מכנה התקדמות: אותו חסם עשוי להופיע יותר מפעם אחת.

# 2. ראיות אריתמטיות ומבניות

## 2.1 סעיף 35.6 אינו קיים

2.1.1 סעיפים 2.14, 34.15.1, 34.18.1, 34.34.7.1, 34.36.2.2 ו־35.1.1 מבטיחים Task Registry קנוני בעל עלים עם 18 שדות.

2.1.2 בפועל, לאחר 35.5.53.4 המסמך עובר ישירות ל־35.7. אין כותרת `35.6`, אין רשומת Task קנונית ואין `taskId` שניתן לשלב ב־DAG או בסכום.

2.1.3 35.5 מכיל Findings ומשימות תיקון נרטיביות, ו־35.7 מכיל Threats/Controls/Crosswalk. אף אחד מהם אינו תחליף לרשם 35.6.

## 2.2 סכומי השלבים אינם שווים לסיכומים

2.2.1 סכום טווחי ה־ROM המופיעים כיום בסעיפים 6–17 הוא:

| סעיף | שעות |
|---|---:|
| 6 | `14–26` |
| 7 | `64–122` |
| 8 | `18–36` |
| 9 | `24–40` |
| 10 | `48–88` |
| 11 | `120–212` |
| 12 | `146–252` |
| 13 | `44–72` |
| 14 | `40–72` |
| 15 | `44–72` |
| 16 | `84–146` |
| 17 | `51–78` |
| סכום בפועל | `697–1,216` |
| טענת 34.6.1 | `511–872` |
| פער | `+186/+344` |

2.2.2 סכום טווחי ה־ROM בסעיפים 18–24 הוא `688–1,154`, בעוד 34.6.2 טוען `660–1,104`; הפער הוא `+28/+50`.

2.2.3 סכום טווחי ה־ROM בסעיפים 25–31 הוא `816–1,368`, והוא תואם ל־34.6.3. התאמה של קבוצה אחת אינה מתקנת שתי קבוצות שגויות.

2.2.4 חיבור שלושת הסכומים הנוכחיים ועוד 8–16 שעות Staging נותן `2,209–3,754`, ולא `1,995–3,360` שב־34.6.5. גם המספר `2,209–3,754` אינו Estimate קנוני, משום שהשלבים מערבבים Base, Conditional, Allocation ו־Review; הוא משמש רק להוכחת הסתירה.

## 2.3 אומדנים שבוטלו עדיין משמשים לחישוב

2.3.1 סעיפים 34.7.5–34.7.7 מבטלים במפורש את `2,611–5,044`, את `460–788`, את `3,071–5,832`, את `180–360` ואת `3,251–6,192`.

2.3.2 אותם מספרים מופיעים שוב כתוצאות פעילות ב־34.8.1–34.8.3, 34.34.4.4–34.34.5.4, 34.34.6.21 וב־34.38.5.3.

2.3.3 34.7 קובע ש־A05 ו־A07 בלבד רשאים לספק אומדן קנוני, בעוד 34.38.10.10 מציין ש־A07 טרם נבנה. לכן החישובים המאוחרים אינם יכולים להיות קנוניים.

## 2.4 מוני Conditional סותרים

2.4.1 34.30.22 מכיל תשע יכולות Product מותנות ומסכם אותן ל־`460–788`.

2.4.2 34.38.2.3 מדבר על 21 חבילות 34.30.2–34.30.22, ואילו MP-F040 ב־35.5.40 דורש “Registry לכל 21 החבילות המותנות”. חלק מ־21 החבילות הן למעשה Allocations או Work packages משלימים ולא תשע היכולות של 34.30.22.

2.4.3 אין A05 מאושר שמקבע Template IDs, Instance IDs, Trigger, Excluded state ושייכות Scope. לכן אין מכנה תקף ל־Scope 4/5 ואין בסיס לחבר את כל התשע או את כל ה־21.

## 2.5 52 משימות תיקון אינן משובצות בלוח

2.5.1 לכל אחד מ־MP-F001–MP-F052 קיימת פסקת “משימת המשך” עם טווח של עד שמונה שעות.

2.5.2 סכום הטווחים הוא `276–380` שעות אדם.

2.5.3 34.7.3 מציג `168–300` שעות לכל ביקורת ה־Master, Registry, DAG, Crosswalks וחתימות. לא קיימת הקצאת Task IDs שמוכיחה אילו מ־276–380 נכללים, אילו חופפים ואילו נוספים. הגבול העליון של משימות התיקון לבדן גבוה מן הגבול העליון של כל שלב התכנון.

2.5.4 אין לתקן זאת באמצעות העלאת מספר ידנית; יש לבנות עלים קנוניים, Aliases ו־Dedup, ואז לגזור מחדש.

## 2.6 מצב קבלה קיים

2.6.1 כל 52 ה־Findings הקנוניים פתוחים: `21 P0` ו־`31 P1`. מצבי הטקסט הם `open-partially-planned`, `open-text-corrected`, `open-partially-corrected`, `open-external-blocked`, `open-explicitly-invalidated`, `open-unplanned`, `open-planning-remediation` או `open-conditional`.

2.6.2 34.38.10.3 אומר במפורש ש־QA מבני, References, סכומים, DAG, completeness, freshness ו־Secret scan של ה־Snapshot הסופי הם `pending`.

2.6.3 34.38.10.8 דוחה את A02-A ואת A04. 34.38.10.10 מציב את A07 ואחריו A09 ושתי ביקורות עצמאיות בעתיד.

2.6.4 בראש המסמך כל 11 ה־Reviewers הם `pending`, ו־Canonical SHA-256 הוא `pending-final-QA`.

2.6.5 לכן Gate 29 חסום גם לפי תנאי המסמך עצמו, לפני ממצאי הביקורת החדשים.

# 3. ממצאים P0

## 3.1 `SCHED-F001` — רשם 35.6 הקנוני חסר

3.1.1 חומרה: `P0`.

3.1.2 ראיה: 2.14 ו־35.1.1 מגדירים את 35.6 כמקור האמת; בפועל יש אפס כותרות 35.6 ואפס Task IDs.

3.1.3 השפעה: אין יחידת עבודה מורשית, אין מכנה, אין סכום, אין DAG ואין יכולת להפעיל Gate 29.

3.1.4 מיפוי קיים: MP-F001, MP-F037 ו־MP-F052.

3.1.5 תיקון: ליצור את ארכיטקטורת 35.6 שבסעיף 7 לדוח זה, להפיק את כל העלים, לבצע QA ולקבל שתי ביקורות עצמאיות.

## 3.2 `SCHED-F002` — Schedule recursion ואישור עצמי

3.2.1 חומרה: `P0`.

3.2.2 ראיה: 34.7.3 סופר את יצירת ה־Registry, ה־DAG, ה־Crosswalks והחתימות בתוך Master candidate; 34.38.10.10 דורש שה־Candidate ייבנה, יעבור QA/Reviews ויקבל Root digest ואישור.

3.2.3 שורש הבעיה: משימה שמייצרת, בודקת או מאשרת Candidate אינה יכולה להיכלל בתוך אותו Candidate כמקור הסמכות שלה. הוספת Receipt לאחר חישוב ה־Digest משנה את ה־bytes; הכללת משימת החישוב בתוך התוצר שהיא מחשבת יוצרת לולאת סמכות גם כאשר Graph הנתונים נראה Acyclic.

3.2.4 השפעה: Candidate עשוי לזכות את בנייתו או Review שלו בעצמו, ומכנה Stage 0 עלול להשתנות בכל Review.

3.2.5 תיקון: להפריד `Bootstrap Root`, ‏`Subject Candidate`, ‏`Lifecycle Work Registry` ו־`Acceptance Envelope` לפי סעיף 8. שעות Bootstrap/Lifecycle נספרות פעם אחת במכנה תכנוני נפרד ולעולם לא בתוך Subject שהן מייצרות.

## 3.3 `SCHED-F003` — סיכומי ROM שגויים אריתמטית

3.3.1 חומרה: `P0` לדיווח זמן.

3.3.2 ראיה: סעיף 2.2 לדוח זה מוכיח `697–1,216` מול `511–872`, ו־`688–1,154` מול `660–1,104`.

3.3.3 השפעה: כל Scope envelope שנגזר מ־34.6.1–34.6.2 הוא stale גם לפני Dedup.

3.3.4 תיקון: להסיר כל Total ידני מן הנתיב הקנוני; Stage/Scope totals יהיו Views שנגזרות מעל Work IDs ייחודיים של Root מאושר.

## 3.4 `SCHED-F004` — מספרים שבוטלו ממשיכים לשמש כ־ETA

3.4.1 חומרה: `P0`.

3.4.2 ראיה: 34.7.5–34.7.7 מבטלים מספרים שמופיעים שוב ב־34.8, 34.34 ו־34.38.

3.4.3 השפעה: קורא יכול לבחור את הפסקה הנוחה ולקבל שתי תשובות סותרות לאותו Scope.

3.4.4 תיקון: להעביר אומדנים היסטוריים ל־Provenance annex שאינו Rendered כמצב נוכחי; View פעיל מציג רק Snapshot של A07 מאושר.

## 3.5 `SCHED-F005` — אין DAG ברמת עלה ואין Critical path

3.5.1 חומרה: `P0`.

3.5.2 ראיה: 34.10 הוא רצף Sections/Gates בלבד. 34.10.11.1 דורש DAG נפרד ל־Scope 1/3/4, אך אין Tasks, Edges, Durations, Earliest start או Latest safe finish.

3.5.3 השפעה: אי אפשר לחשב Longest path, Parallelism, Wait overlap, Slack או תאריך.

3.5.4 תיקון: לבנות Supergraph typed מן הרגיסטרים בסעיף 7.6, להריץ Cycle/reachability, ואז לחשב Schedule לכל Scope Manifest בנפרד.

## 3.6 `SCHED-F006` — אין Resource/Calendar/Mutex model

3.6.1 חומרה: `P0` לכל ETA Calendar.

3.6.2 ראיה: המסמך מודה ב־34.10.11.3 שזמינות, Velocity ו־Rework הם `unknown/unavailable`; רוב הבעלים הם Roles או unknown. אין Registry של אנשים, כשירויות, חופשות, קיבולת Reviewer, Environment locks, Migration writer או File/Boundary mutex.

3.6.3 השפעה: תרחישי 30/60/90 שעות מניחים קיבולת ניתנת להחלפה שאינה קיימת, ואינם מזהים bottleneck של Database, Security, Legal או Reviewer.

3.6.4 תיקון: ליצור Person/Role/Capacity/Calendar/Mutex registries ו־RCPSP schedule לפי סעיף 7.7.

## 3.7 `SCHED-F007` — מניעת ספירה כפולה היא הבטחה ולא Evidence

3.7.1 חומרה: `P0`.

3.7.2 ראיה: 34.34.1.3 ו־34.34.7.4 דורשים IDs ו־Aliases, אך אין Work ID אחד. 34.34.3.2 ו־34.34.4.3 משתמשים ב־Reserve של `0–540` ו־`0–604` במקום מיפוי. 34.38.6.5 אומר שספירה כפולה נשארת חסומה עד Gate 1, בעוד 2.14 ו־34.10.11.1 אוסרים לדחות את הפירוק וה־DAG ל־Gate 1.

3.7.3 השפעה: אותה עבודה עשויה להיספר בשלב, בחבילה, ב־Crosswalk, ב־Gate 30 וב־Finding remediation.

3.7.4 תיקון: `CanonicalWorkKey`, ‏Alias table, Scope membership many-to-many ו־Derived totals בלבד; Gate 1 מעדכן Actual/Remaining, לא זהות Work.

## 3.8 `SCHED-F008` — אין מכנה או משקל לאחוז השלמה

3.8.1 חומרה: `P0` לדיווח התקדמות.

3.8.2 ראיה: 34.16.1 משתמש ב“משקל המשימות” בלי להגדיר Weight; 34.16.3 תלוי ב־GA Scope Manifest שאינו קיים; 34.16.6 ו־34.34.8.1 אומרים שהאחוז אינו ניתן לקביעה.

3.8.3 השפעה: אין אחוז “מדויק” שאפשר לחשב. מספר ידני יערבב תכנון, קוד מקומי, Readiness ו־External approvals.

3.8.4 תיקון: לפרסם שלושה מדדים נפרדים בלבד לפי סעיף 9: Planning closure, Verified execution ו־Gate readiness. אין Overall blended percent.

## 3.9 `SCHED-F009` — Gate 29 חסום על פני כל תנאי הקבלה

3.9.1 חומרה: `P0`.

3.9.2 ראיה: 52/52 Findings פתוחים, 11/11 Reviews pending, A07/A09 pending, SHA pending, Tal exact-digest acceptance חסר.

3.9.3 השפעה: אי אפשר להסיר Freeze או להתחיל Slice ביצוע.

3.9.4 תיקון: להשלים את השרשרת Bootstrap→Stages→A07→Assembly→A09→Reviews→Root CAS. כל Byte change פותח Generation חדש.

## 3.10 `SCHED-F010` — Conditional denominator אינו קנוני

3.10.1 חומרה: `P0`.

3.10.2 ראיה: תשע יכולות ב־34.30.22, 21 חבילות ב־34.38.2.3/MP-F040, A05 חסר ו־Scope 4 מוגדר כ“רק מה שנבחר” ללא רשימת Instance IDs.

3.10.3 השפעה: Scope 4/5 עשוי לגדול או להצטמצם ללא Delta digest, והאחוז או הזמן ישתנו בדיעבד.

3.10.4 תיקון: Package templates אינם חלק מהמכנה. רק Instance עם Trigger artifact, Scope membership ו־Gate ID קנוני נכנס ל־Manifest; Disabled-state work של Base הוא Work נפרד.

## 3.11 `SCHED-F011` — שני שורשי Git יוצרים סמכות ונתיבים דו־משמעיים

3.11.1 חומרה: `P0` לכל משימת Source/Git.

3.11.2 ראיה חיה Read-only: `/Users/tal/Documents/connect/.git` הוא Repository ללא Commit על `master`, ובו `web/` הוא נתיב Untracked; `/Users/tal/Documents/connect/web/.git` הוא Repository היישום על `codex/cloudflare-evidence-builders`, ‏HEAD=`93c6b2dfe007f07c43c37389873a8a648a3ff69d`, ‏upstream divergence=`0/0`, ‏origin=`https://github.com/talstilkol/connect.git`.

3.11.3 השפעה: `git status`, Base commit, staging, path digest, Worktree count ו־clean-checkout יכולים להתייחס ל־Root הלא נכון. Task path שאינו קשור ל־RepoRoot ID אינו דטרמיניסטי.

3.11.4 תיקון: ליצור `RepoAuthorityRegistry`, לקבוע את `/Users/tal/Documents/connect/web` כ־Candidate canonical application root בכפוף לאישור, לסווג את ה־Outer root, ולאסור Task/Git preflight ללא exact `repoRootId`. אין למחוק או לשנות Root במסגרת ביקורת זו.

## 3.12 `SCHED-F012` — D18-A2 Public delta אינו משובץ לפני ה־Push הבא

3.12.1 חומרה: `P0` ל־Push הבא.

3.12.2 ראיה: Tal קבע ב־D18-A2 שה־Repository נשאר Public. הקובץ המבוקר עדיין טוען “Private” ב־4.7, 5.22, 7.4.1, 7.7.6.1 ו־DS-016. החלטת D18-A2 נמצאת ב־`web/docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md` ומבהירה ש־Public אינו מאשר Secrets, PII, Evidence רגיש, Actions פתוחים או Branch לא מוגן.

3.12.3 השפעה: Scope, Threat model, תוכן Public, License, Secret/history scan, Actions policy, Rulesets ו־Evidence storage השתנו. כל Estimate/A07 שלא קלט את ה־Delta פסול.

3.12.4 תיקון: אין משימת שינוי Visibility. יש ליצור Mandatory Public-hardening chain לפני ה־Push הבא: Repo-root reconciliation; Public-content/history classification; Ruleset/branch/Actions/scanning hardening; License/NOTICE decision; exact-diff one-attempt bootstrap Push permit; independent remote readback. כל שעותיה הן Work IDs חדשים ולכן תוספת הזמן הנוכחית היא `unknown/unavailable` עד פירוק והערכה.

# 4. ממצאים P1

## 4.1 `SCHED-F013` — חוזה 18 השדות ועד שמונה שעות אינו ממומש

4.1.1 חומרה: `P1`, בנוסף לחסם P0 של היעדר 35.6.

4.1.2 ראיה: 2.10, 2.13 ו־35.1.3–35.1.5 דורשים פעולה יחידה ו־18 שדות; 34.30/34.31 מכילים Packages של 12–168 שעות; 35.5 מכיל משימות מורכבות עם שדות חלקיים בלבד.

4.1.3 תיקון: כל Work leaf מקבל 18/18 שדות מפורשים, `minMinutes≤maxMinutes≤480`, פעולה אחת, Product output אחד ו־Evidence output נפרד. Parent ואוסף אינם מקבלים שעות, Status או Credit.

## 4.2 `SCHED-F014` — שעות Remediation אינן משולבות

4.2.1 חומרה: `P1`.

4.2.2 ראיה: 52 משימות 35.5 מסתכמות `276–380`, מול Stage 0 ‏`168–300`, ללא Alias/Allocation.

4.2.3 תיקון: להמיר כל Remediation ל־Work IDs או Alias אל Work קיים; סכום Stage 0 ייגזר מחדש. אין “Reserve” במקום מיפוי.

## 4.3 `SCHED-F015` — Scope 1/3/4 אינם קבוצות ניתנות ל־Enumeration

4.3.1 חומרה: `P1`.

4.3.2 ראיה: Scope 1 מפנה ל־Gate list אך אינו מקבע Task IDs; Scope 3 אומר “כל SPEC שאינו Conditional” ומוסיף אפשרויות תלויות Manifest; Scope 4 אומר “רק החבילות שנבחרו” ללא Instance list.

4.3.3 תיקון: לכל Scope Manifest לשמור exact task/gate/package-instance sets, Exclusion reasons, Disabled proof tasks ו־Root digest. Query textual אינו Scope.

## 4.4 `SCHED-F016` — External waits אינם Nodes

4.4.1 חומרה: `P1`.

4.4.2 ראיה: X01–X27 מתארים Owners/Dates רבים כ־unknown, ו־34.34.3.5 נותן רשימת waits כללית. אין Wait ID, trigger task, startedAt, calendar range, allowed overlap, expiry או completion receipt בתוך Schedule.

4.4.3 תיקון: להשתמש ב־ExternalWaitRegistry. Wait הוא אפס שעות Engineering, אך הוא Node בעל dependency ומשך Calendar. Wait קריטי ללא upper bound הופך ETA upper bound ל־`unknown/unavailable`.

## 4.5 `SCHED-F017` — נוסחת Calendar אינה מספיקה

4.5.1 חומרה: `P1`.

4.5.2 ראיה: 34.10.11.2 מחבר `non-overlapping external waits` לאחר max של שעות/תפקיד/longest path. לא מוגדר כיצד Wait חופף חלקית, האם הוא כבר בתוך path, כיצד Calendar/Mutex משפיעים או כיצד Reviewers משותפים מתוזמנים.

4.5.3 תיקון: External waits ו־Observation הם Nodes בתוך אותו Supergraph; Scheduler מכבד Calendars, resource capacities, mutexes ו־dependency relations. אין תוספת ידנית אחרי Longest path.

## 4.6 `SCHED-F018` — Planned, admitted, executed ו־accepted אינם State dimensions נפרדים

4.6.1 חומרה: `P1`.

4.6.2 ראיה: 2.11 מגדיר חמישה execution statuses, 35.7 משתמש `planned-open`, ו־34.38 מתאר Candidate/QA/Reject במילים. אין Admission state או Acceptance receipt לרשומת Task.

4.6.3 תיקון: להפריד `recordAdmissionState` מן `executionStatus` ומן `creditState`. Draft/Rejected/Superseded לעולם אינם במכנה ביצוע; `הושלם מקומית` מקבל Local metric בלבד; Credit=1 רק ל־`הושלם ומוכח` עם Evidence ו־Review תקפים.

## 4.7 `SCHED-F019` — 692 העלים ההיסטוריים אינם Evidence ל־Snapshot הנוכחי

4.7.1 חומרה: `P1`.

4.7.2 ראיה: 34.38.10.6 מציג 692/692, אך 34.38.10.8 דוחה את שני ה־Artifacts, 34.38.10.9–10.11 מוסיפים Source deltas, ו־35.6 הנוכחי ריק.

4.7.3 תיקון: להעביר את התוצאה ל־Historical provenance עם Subject digests בלבד; שום Counter UI או דיווח נוכחי אינו רשאי לצרוך אותה.

## 4.8 `SCHED-F020` — עומס Review ועצמאות אינם מתוזמנים

4.8.1 חומרה: `P1`.

4.8.2 ראיה: 7.4.2 ו־35.1.3.8 דורשים Reviewer אחד או שניים, אך אין Review leaves, אנשים שמיים, Capacity או Conflict-of-interest matrix.

4.8.3 תיקון: כל Review הוא Work leaf נפרד עם שעות, Reviewer resource, predecessor subject digest ו־Receipt output. זמן ה־Implementer אינו כולל את שעות ה־Reviewer.

## 4.9 `SCHED-F021` — אין Schema ל־Actuals ו־Estimate-to-complete

4.9.1 חומרה: `P1`.

4.9.2 ראיה: 34.10.11.5 ו־34.34.7.6 מבטיחים Actual/Remaining, אך 18 השדות אינם מכילים actualStart, actualFinish, actual effort, queue time, rework או estimate revision reason.

4.9.3 תיקון: ליצור `ActualLedger` append-only נפרד מן Task definition, עם Actor, start/finish, effortMinutes, queueMinutes, reworkReason, evidenceDigest ו־asOf; Remaining snapshot נקשר ל־Task version ול־Actual cut.

# 5. ממצאים P2

## 5.1 `SCHED-F022` — טווחי האומדן חסרי Basis ו־Confidence contract

5.1.1 חומרה: `P2`.

5.1.2 ראיה: הטווחים מציינים Min/Max אך לא reference class, assumptions, estimator, confidence, calibration error או correlation בין Tasks.

5.1.3 תיקון: Estimate record כולל method, basis IDs, assumptions, exclusions, estimator, reviewedAt ו־confidence label. אין להציג P50/P80 ללא נתוני עבר.

## 5.2 `SCHED-F023` — חסרים Slack, Near-critical paths ו־Bottleneck report

5.2.1 חומרה: `P2`.

5.2.2 ראיה: 34.10 מציג נתיב יחיד מילולי ואינו מחשב total/free float, near-critical paths, resource bottlenecks או wait sensitivity.

5.2.3 תיקון: כל Schedule snapshot מפיק Critical/near-critical paths, float, role utilization, mutex queue ו־top external wait sensitivities.

## 5.3 `SCHED-F024` — Recurring operations ותחזוקה אינם מקבלים Lifecycle schedule

5.3.1 חומרה: `P2`.

5.3.2 ראיה: 34.34.4.8 מוציא Maintenance ו־Support מן הפרויקט, ו־34.34.6.19 מזכיר 2–4 שעות חודשיות בלי Lifecycle registry.

5.3.3 תיקון: לא להכניס Recurring effort לאחוז השלמת Build; כן ליצור Service Lifecycle denominator נפרד ל־patching, reviews, restore drills, source freshness, on-call ו־cost reviews.

## 5.4 `SCHED-F025` — אין Freshness/expiry ל־Schedule snapshot

5.4.1 חומרה: `P2`.

5.4.2 ראיה: Sources מקבלים expiry, אך Capacity, estimates, calendars ו־Schedule results אינם מקבלים validThrough או automatic invalidation מלבד הוראה כללית לבצע Re-estimate.

5.4.3 תיקון: לכל Schedule snapshot לשמור `asOf`, `sourceRootDigest`, `capacityDigest`, `scopeDigest`, `actualCutDigest`, `validThrough` ו־invalidation triggers.

# 6. ממצא P3

## 6.1 `SCHED-F026` — Namespace אנושי לא עקבי

6.1.1 חומרה: `P3`.

6.1.2 ראיה: המסמך מערבב Section, Stage, Gate, Route ו־Scope כמזהי סדר; 34.20.2 משתמש “שלב 7/Stage 2” לאותו מעבר.

6.1.3 תיקון: להציג Label אנושי בנפרד מ־IDs קנוניים `TASK`, `GATE`, `SCOPE`, `PKG`, `WAIT`, `MILESTONE`, `ROOT`; הפניות מכונה משתמשות רק ב־ID.

# 7. ארכיטקטורת 35.6 עמידה

## 7.1 Root manifest

7.1.1 `35.6.0 RegistryManifest` יקבע `registryVersion`, ‏`generation`, ‏`subjectRootDigest`, ‏`parentAcceptedRootDigest`, ‏`schemaDigest`, ‏`scopeManifestDigests`, ‏`sourceFreezeDigest`, ‏`createdAt`, ‏`producer` ו־`admissionState`.

7.1.2 כל Registry subordinate מקבל Raw digest וקישור ל־Root. שינוי Byte יוצר Generation חדש; אין תיקון In-place.

7.1.3 Root אינו מכיל את Receipt שמאשר את עצמו. Receipt נמצא ב־Acceptance Envelope חיצוני לפי סעיף 8.

## 7.2 Work Registry ו־18 השדות

7.2.1 כל רשומת־עלה כוללת במפורש את 18 הקבוצות הבאות, ללא ירושה:

| מספר | שדה קנוני | תוכן מינימלי |
|---:|---|---|
| 1 | `taskIdentity` | `taskId`, version, deterministic derivation, generation |
| 2 | `action` | פועל יחיד, noun/state יחיד |
| 3 | `inputs` | Input IDs, locations, digests, versions |
| 4 | `outputs` | Product output ID ומיקום; Evidence אינו Product output |
| 5 | `predecessorTaskIds` | Task IDs קיימים בלבד |
| 6 | `primary` | Person ID שמי |
| 7 | `backup` | Person ID שמי או N/A מנומק |
| 8 | `reviewers` | Person IDs, independence, two-reviewer rule |
| 9 | `estimate` | integer min/max minutes, `max≤480`, basis ID |
| 10 | `tests` | Positive, Negative, Failure, Concurrency או N/A מנומק |
| 11 | `acceptance` | Predicate בינארי הניתן להרצה/בדיקה |
| 12 | `evidence` | location, producer, redaction, checkedAt, expiry, digest |
| 13 | `detection` | detector ID, cadence, threshold, owner |
| 14 | `rollbackOrDisable` | פעולה בטוחה שנבדקה |
| 15 | `gateIds` | Gate instances שהעלה חוסם/פותח |
| 16 | `requirementIds` | IDs מפורשים, ללא טווח סמוי |
| 17 | `riskIds` | TH/CTL/Finding IDs מפורשים |
| 18 | `executionStatus` | אחד מחמשת המצבים הקנוניים בלבד |

7.2.2 שדות Schedule שאינם חלק מ־18 השדות נמצאים ב־Registries מקושרים ולא עוברים בירושה.

7.2.3 Invariants: פעולה אחת; Product output producer יחיד; output/evidence locations נפרדים; `0<min≤max≤480`; Parent ללא שעות/Status/Credit; כל Input producer קיים או Source/External artifact מפורש; אין dangling reference.

## 7.3 Scope Registry

7.3.1 `ScopeManifest` כולל `scopeId`, version, exact Task IDs, exact Gate IDs, Package instance IDs, External wait IDs, exclusion records, Disabled-evidence Task IDs ו־digest.

7.3.2 Scope 1, Scope 3 ו־Scope 4 מקבלים Manifest נפרד. אין ביטוי “כל מה שאינו Conditional” ואין “מה שנבחר” ללא Enumeration.

7.3.3 אותה משימה יכולה להיות חברה בכמה Scopes באמצעות `ScopeTaskMembership`; היא נשמרת פעם אחת ואינה מועתקת.

7.3.4 שינוי Scope יוצר Manifest version חדש ו־Delta של Tasks/Gates/Risks/Hours. Baseline ישן נשמר.

## 7.4 Conditional Package Registry

7.4.1 `PackageTemplate` כולל Trigger schema, excluded Base state, required discovery, decommission plan ו־Gate template. Template אינו מקבל שעות ביצוע ואינו נכנס למכנה.

7.4.2 `PackageInstance` נוצר רק עם Trigger artifact אמיתי, instance identity מספרי, Owner/Backup, exact Scope, Task set, Gate instance ו־digest.

7.4.3 Work של Disabled evidence ב־Base הוא Task Base עצמאי; הוא אינו נחשב מימוש Package.

7.4.4 Country, Connector, Platform, Store, Provider ו־Region עתידיים לא מקבלים Placeholder. Unknown יוצר Discovery leaf עד שמונה שעות בלבד.

## 7.5 Dedup ו־Accounting

7.5.1 לכל Work item יש `canonicalWorkKey=H(requirement-set, operation, authoritative-output, environment-class, generation-purpose)` באמצעות Hash דטרמיניסטי מאושר על תוכן לא־סודי.

7.5.2 `AliasRegistry` מפנה Narrative sections, Findings, Controls, Packages ו־Scopes ל־Work ID אחד. Alias מקבל אפס שעות ואפס Credit.

7.5.3 `OverlapGroup` הוא אות Review בלבד; הוא אינו מנגנון Dedup. רק Canonical Work identity מונע ספירה.

7.5.4 Stage, Scope, Package, Finding ו־Control totals הם Views של Union על Work IDs.

7.5.5 Implementer, independent reviewer ו־acceptance operator הם Work leaves שונים. Estimate של Implementer אינו כולל Review effort כאשר Review קיים כעלה.

## 7.6 Dependency Supergraph

7.6.1 השדה `predecessorTaskIds` בתוך עלה מפנה רק ל־Task IDs, בהתאם ל־35.1.3.5.

7.6.2 Registries נפרדים מוסיפים `WaitConstraint`, ‏`GateConstraint`, ‏`MilestoneConstraint` ו־`GenerationConstraint`. Compiler יוצר Supergraph typed בלי לזהם את 18 השדות.

7.6.3 כל Edge כולל from, to, relation מסוג Finish-to-start/Start-to-start/Finish-to-finish, lag, condition ו־source reason.

7.6.4 QA חוסם self-edge, dangling, duplicate edge, future-generation authority, cycle, unreachable required task, Gate ללא implementation predecessor ו־Rollback שאינו נגיש לפני side-effect boundary.

## 7.7 Resources, Calendars ו־Mutexes

7.7.1 `PersonRegistry` כולל Person ID שמי, allowed roles, timezone, employment/access state ו־conflict-of-interest constraints.

7.7.2 `CapacityCalendar` כולל תאריכי עבודה, net focus minutes, חופשות, Support load ו־validThrough. Capacity של Role אינה סכום תיאורטי של אנשים לא־ממונים.

7.7.3 `AssignmentRegistry` מקשר Task ל־Primary/Backup/Reviewers ול־effort demand. אדם אינו מבצע ומאשר את אותו Subject.

7.7.4 `MutexRegistry` כולל resource/boundary ID, capacity ו־scope. דוגמאות: canonical Git root, shared boundary file, Migration writer, Production environment, Meta asset mutation, Billing mutation, Retention execution ו־Release signing.

7.7.5 Scheduler מכבד גם Skill eligibility וגם Mutex. שעות צוות כוללות Person-hours; זמן Calendar נגזר מהקיבולות ולא מחלוקה ידנית במספר אנשים.

## 7.8 External Wait Registry

7.8.1 לכל Wait יש Wait ID, authority/provider, trigger Task, owner, startedAt, min/max Calendar duration, completion Evidence, expiry, escalation, safe state ו־allowed overlap.

7.8.2 Engineering effort הוא אפס; עבודת הכנה, מעקב או Review היא Work task נפרד.

7.8.3 Wait ללא upper bound שנמצא על מסלול חובה גורם ל־ETA upper=`unknown/unavailable`.

7.8.4 Legal, Meta, KYC, Account, DNS, Procurement, Pentest, Accessibility, App Store ו־Observation אינם שורה אחת; לכל Instance Node נפרד.

## 7.9 Actual ו־Credit ledgers

7.9.1 `ActualLedger` הוא append-only ומכיל Task version, Actor, timestamps, person-effort minutes, queue/rework, outputs ו־Evidence digest.

7.9.2 `RecordAdmissionState` הוא `draft|producer-qa-pass|review-a-pass|review-b-pass|accepted|rejected|superseded` ואינו execution status.

7.9.3 `CreditState=1` רק כאשר Task נמצא ב־Root מאושר, execution status=`הושלם ומוכח`, Acceptance עבר, Evidence טרי ושני Reviewers נדרשים חתמו. בכל מצב אחר Credit=0.

7.9.4 `הושלם מקומית` נמדד בנפרד ואינו Ready.

7.9.5 Gate 1 רשאי לקשר Evidence קיים ל־Task מאושר ולעדכן Remaining. הוא אינו יוצר Work identity, מפרק Parent או משנה Scope בשקט.

## 7.10 Repo authority ו־Public hardening

7.10.1 `RepoAuthorityRegistry` כולל `repoRootId`, absolute root, Git dir, remote, default branch, working branch, HEAD, upstream relation, path policy ו־authority status.

7.10.2 כל Source/Git Task חייב `repoRootId`. Preflight נכשל כאשר Current working directory אינו בתוך ה־Root המאושר.

7.10.3 Outer `/Users/tal/Documents/connect` ו־nested `/Users/tal/Documents/connect/web` נשארים שני Records עד החלטת Authority; אין Staging או Cleanup מכוח התכנון.

7.10.4 `PublicRepoHardeningGate` חוסם כל Push. הוא דורש D18-A2, Public content policy, history/worktree scan, Branch/Ruleset/Actions restrictions, CODEOWNERS/review policy, Secret scanning/push protection capability או חלופה, SECURITY/VDP, License/NOTICE decision, private Evidence boundary ו־independent live readback.

7.10.5 Push bootstrap יחיד, אם נדרש כדי להכניס source-based hardening, דורש Permit קצר־חיים וחד־ניסיוני הקשור ל־exact diff, branch, remote, scan digests ו־review receipts. הוא אינו Visibility mutation ואינו אישור Push כללי.

# 8. מניעת Schedule recursion באמצעות Generations

## 8.1 ארבעה Artifacts נפרדים

8.1.1 `BootstrapRoot B0` מגדיר את Schema, authority, serializers, initial source cut והמשימות שמותר לבצע כדי לבנות Candidate ראשון.

8.1.2 `SubjectCandidate S(n)` מכיל את התוכנית המוצעת בלבד. הוא אינו מכיל Work שמייצר, בודק או מאשר את `S(n)` עצמו.

8.1.3 `LifecycleRegistry L(n)` מכיל את Work IDs שהיו מאושרים מראש ב־`B0` או ב־Root הקודם ואשר מייצרים, בודקים ומרכיבים את `S(n)`.

8.1.4 `AcceptanceEnvelope A(n)` נמצא מחוץ ל־`S(n)` וקושר subject digest, Producer QA, Review A, Review B, reconciliation, veto/decision ו־Tal exact-digest approval. Protected CAS מקדם את `S(n)` רק לאחר שכל הקשרים תקפים.

## 8.2 כלל Generation

8.2.1 Work שמייצר Candidate generation `n` חייב להיות מוסמך ב־Bootstrap או Root generation קטן מ־`n`.

8.2.2 Review של `S(n)` אינו משנה את Bytes. Finding דוחה את `S(n)` ונוצר `S(n+1)` חדש; אין Patch ל־Candidate שכבר נבדק תוך שמירת Receipt ישן.

8.2.3 Work שמאשר `S(n)` אינו חלק מן `S(n)` ואינו נספר במכנה התוכן של `S(n)`.

8.2.4 `A(n)` רשאי לשנות רק Pointer מוגן מ־accepted generation קודם ל־`S(n)` באמצעות Compare-and-swap; הוא אינו כותב ל־Subject.

## 8.3 מכנים ושעות ללא ספירה כפולה

8.3.1 `Bootstrap denominator` כולל רק Work IDs לבניית/אימות B0. הוא נסגר פעם אחת ואינו Product completion.

8.3.2 `Lifecycle denominator` כולל Authoring, Assembly, Producer QA, independent reviews, reconciliation ו־acceptance preparation לכל Generation. הוא אינו נכלל ב־Subject product denominator.

8.3.3 `Product denominator` כולל רק Work IDs של Scope Manifest המאושר לבניית המוצר.

8.3.4 `End-to-end denominator` הוא Union של Bootstrap, Lifecycle ו־Product Work IDs, לא סכום של Totals מודפסים. Work ID אחד מופיע פעם אחת גם אם הוא חבר בכמה Views.

8.3.5 External approval של Tal הוא Wait/Acceptance event עם אפס Engineering effort; הכנת packet ו־Review הם Lifecycle Work עם person-hours.

8.3.6 כאשר Candidate נדחה, שעות שכבר הושקעו נרשמות Actual ב־Lifecycle generation הישן ואינן נעלמות. Remaining של generation החדש כולל רק Work חדש או Rework Work IDs; אין Credit אוטומטי ל־Bytes שנפסלו.

## 8.4 Bootstrap ראשון

8.4.1 מאחר שאין Root מאושר קודם, B0 נשען על User mandate מפורש ועל Acceptance record חיצוני; הוא אינו טוען שאישר את עצמו.

8.4.2 לאחר B0, כל Generation עתידי חייב Parent accepted root. אין “Genesis fallback” חוזר.

8.4.3 B0 עצמו דורש Subject digest, QA נפרד, Reviewer עצמאי ו־Tal exact-digest acceptance לפני שהוא מוסמך לפתוח Lifecycle Work.

# 9. חישובי התקדמות ו־ETA מותרים

## 9.1 שלושה אחוזים נפרדים

9.1.1 `PlanningClosure = acceptedPlanningWeight / requiredPlanningWeight` עבור Bootstrap/Lifecycle Root ספציפי בלבד.

9.1.2 `VerifiedExecution = sum(progressWeight של Tasks עם Credit=1) / sum(progressWeight של כל Tasks ב־Scope Manifest המאושר)`.

9.1.3 `GateReadiness = passedRequiredGateInstances / requiredGateInstances` לאותו Release Manifest.

9.1.4 `progressWeight` הוא integer קפוא ברשומה המאושרת. המלצה שמרנית היא `plannedMaxMinutes`, אך יש להציג את שם המדד `baseline-max-effort-weighted`, לא “אחוז אמיתי מן המציאות”. אפשר לפרסם גם Unweighted leaf closure בנפרד.

9.1.5 אסור למזג את שלושת המדדים לאחוז אחד. External blocked מוצג כרשימה/מסלול, לא כ־Credit.

9.1.6 כאשר Scope Manifest, Root או Weight denominator חסרים, התוצאה היא `unknown/unavailable`, לא 0.

## 9.2 חישוב שעות

9.2.1 `GrossEngineeringMin/Max` הוא סכום min/max של Work IDs ייחודיים ב־Scope.

9.2.2 `RemainingEngineeringMin/Max` נגזר מ־Estimate-to-complete לכל Task version לאחר Actual cut; אין חיסור אחוז כללי.

9.2.3 External waits, Recurring operations ו־Contingency נשמרים בעמודות שונות ואינם Person-hours.

9.2.4 Stage/Package/Control totals הם Views; Parent total לעולם אינו מקור.

## 9.3 חישוב Calendar

9.3.1 Scheduler מריץ לפחות low-duration ו־high-duration scenarios על אותו DAG, Calendars, assignments ו־mutexes.

9.3.2 Wait/Observation נמצאים בתוך Graph. אין להוסיף אותם ידנית לאחר Longest path.

9.3.3 ETA מותר רק כאשר כל Node קריטי מקבל duration bound, כל Resource מקבל Calendar וכל External wait קריטי מקבל upper bound. אחרת ה־upper ETA הוא `unknown/unavailable`.

9.3.4 כל פלט כולל as-of, Scope/root/capacity/actual digests, critical paths, near-critical paths, float, bottleneck roles, critical waits והנחות.

# 10. סדר תיקון מחייב

## 10.1 לפני בניית Candidate חדש

10.1.1 להקפיא את Subject digest המבוקר ולשמר דוח זה כ־Finding input.

10.1.2 לסגור RepoAuthority planning: לזהות את שני Roots, לקבוע Candidate authority ולחסום Preflight ב־Root שגוי.

10.1.3 לקלוט את D18-A2 כ־Source/Decision delta ולבטל כל דרישת Visibility=Private בלי ליצור משימת שינוי Visibility.

10.1.4 ליצור BootstrapRoot ו־LifecycleRegistry נפרדים; אין להכניס את עבודת יצירת ה־Master לתוך ה־Master subject.

## 10.2 בניית 35.6

10.2.1 לבנות Scope manifests מדויקים ל־Scope 1, Scope 3 ו־Scope 4.

10.2.2 לבנות Package templates/instances ולפתור את תשע מול 21.

10.2.3 לפרק את כל סעיפים 6–33, חבילות 34.30–34.31, Findings 35.5, Crosswalk work ו־Gate 30 ל־18-field leaves של עד שמונה שעות.

10.2.4 ליצור CanonicalWorkKey/Alias mapping ולמחוק רק מן החישוב—לא מן ה־Provenance—כל ספירה כפולה.

10.2.5 ליצור External waits, Gate constraints, Resources, Calendars, Review assignments ו־Mutexes.

10.2.6 ליצור Mandatory Public-repo hardening chain לפני Push permit.

## 10.3 QA וקבלה

10.3.1 להריץ schema completeness, atomicity, duration cap, producer uniqueness, path, ID, digest, duplicate, dangling, cycle, reachability, scope leakage, conditional trigger, resource feasibility, mutex, review independence, recursion ו־semantic mutation audits.

10.3.2 להריץ Schedule מחדש ל־Scope 1/3/4 ולשחזר כל Total מ־Work IDs.

10.3.3 Producer QA אינו נותן Credit לעצמו; לאחריו Review A ו־Review B עצמאיים על Subject digest קפוא.

10.3.4 Findings יוצרים Generation חדש. רק Zero-open acceptance candidate ממשיך ל־Root CAS.

10.3.5 Gate 29 נשאר חסום עד Canonical root, Reviews, 11 domain approvals ו־Tal exact-digest approval.

# 11. מסקנה אופרטיבית

11.1 אין כרגע מספר שעות או אחוז שניתן לפרסם כ“נשאר עד הסוף”. התשובה המדויקת היא `unknown/unavailable`.

11.2 אין להשתמש ב־`1,683–3,384`, ‏`1,995–3,900`, ‏`2,611–5,044`, ‏`3,071–5,832` או `3,251–6,192` כ־Remaining או ETA. הם היסטוריים/סותרים ואינם מבוססי 35.6.

11.3 ה־Critical path הידוע היחיד ברמת החלטה הוא: `Bootstrap/Lifecycle acceptance → 35.6 complete → A07 resource-constrained schedule → A09 QA → independent reviews → Root digest → Tal exact-digest approval → Gate 29`. משך הנתיב הוא `unknown/unavailable` עד שהעלים, המשאבים וה־waits קיימים.

11.4 לפני כל Push עתידי נוסף למסלול גם `RepoAuthority reconciliation → Public-repository hardening → independent live readback → exact Push permit`. אין Visibility-change task.

11.5 עד השלמת התיקונים, הפיתוח נשאר מוקפא בהתאם למסמך המקור, וכל Claim של אחוז, ETA, Critical path מספרי או Completion הוא בלתי־מוכח.
