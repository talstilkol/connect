# 1. תצפית סריקת Secrets למאגר Public — גרסה 2

## 1.1 זהות ותיקון

1.1.1 `observationId=CONNECT-PUBLIC-REPOSITORY-SECRET-SCAN-O2-2026-08-30`.

1.1.2 predecessor=`docs/planning/public-repository-secret-scan-observation-v1-2026-08-30.md`; raw SHA-256=`3ec83742da420a92d243b96cc0dae77112bb206fbe9f4d7a179a0f967d315755`.

1.1.3 גרסה 2 מתקנת את גבול ה־History בגרסה 1: ה־object store המקומי לא הכיל שני ראשי Branch מרוחקים, ולכן `298` Commits מקומיים לא היו Remote denominator מלא.

1.1.4 גרסה 2 מוסיפה Remote readback ו־mirror זמני מבודד; היא אינה משנה Git, GitHub, Product, Provider או Credential.

1.1.5 המאגר נשאר `PUBLIC`; `PublicPush=BLOCKED`; `Gate29=BLOCKED`; development freeze=`ACTIVE`.

1.1.6 מסמך זה אינו כולל Secret value, matched line, raw candidate, פרטי אדם או workstation path.

# 2. Remote identity readback

## 2.1 פקודת Read-only

2.1.1 `git ls-remote` הופעל מול ה־Remote הציבורי ללא Fetch וללא שינוי local refs.

2.1.2 default Branch שנצפה=`main`.

2.1.3 Branch heads שנצפו=`5`.

2.1.4 Tags שנצפו=`0`.

## 2.2 Branch heads

2.2.1 `main=aabaee803a0c00569806195ddf51995f873b27f0`.

2.2.2 `codex/cloudflare-evidence-builders=93c6b2dfe007f07c43c37389873a8a648a3ff69d`.

2.2.3 `codex/github-evidence-builders=d1b15c24c75671dd6bace1619ac0f39a875bdef5`.

2.2.4 `codex/pr-quality-gates=3a070bab7a5ec6e221b36bff61fbb3303fb7c5b2`.

2.2.5 `fix/node-test-load-ts=04a9e8b11141e5ef0576cc6e162c6a3157025498`.

2.2.6 ה־object store המקומי הכיל שלושה מחמשת ה־heads ולא הכיל את `main` ואת `fix/node-test-load-ts` העדכניים.

2.2.7 לכן ה־local `origin/main` והסריקה המקומית הקודמת לא שימשו Remote freshness Evidence.

2.2.8 אין trusted server timestamp או signed ref receipt; התצפית היא ראיית acquisition מקומית מתוארכת בלבד.

# 3. Mirror מבודד ו־History denominator

## 3.1 שיטת Acquisition

3.1.1 נוצר `git clone --mirror` בתיקייה פרטית זמנית מחוץ למאגר העבודה.

3.1.2 ה־mirror אינו Public artifact ואינו מועמד ל־Commit.

3.1.3 ה־mirror הכיל `11` refs: חמישה Branch heads ושישה refs של Pull Requests.

3.1.4 `git rev-list --all --count` על ה־mirror החזיר `307` Commits reachable.

3.1.5 מתוך `307`, מספר non-merge Commits היה `304` ומספר merge Commits היה `3`.

3.1.6 unreachable objects, reflogs שאינם נשלחים ב־mirror, GitHub Actions artifacts, Releases, Packages, Issues, Discussions, Wiki, Deployments ו־provider surfaces אינם נכללים ב־denominator זה.

## 3.2 סריקת non-merge רגילה

3.2.1 `Gitleaks 8.30.1` הופעל עם default ruleset,‏ `redact=100` ו־`log-opts=--all`.

3.2.2 הכלי דיווח `304` Commits scanned וכ־`17.95 MB`.

3.2.3 מספר Findings=`8`; כולם `generic-api-key`.

3.2.4 Findings הופיעו בשישה קובצי Test ייחודיים ובשישה Commits ייחודיים.

3.2.5 report root=`5df60b671e4588cb870c14304ea505ed5bfe767dfe00272d541bf289a7fe4b10`; physical identity=`176 lines/7220 bytes`.

3.2.6 הדוח המפורט נשאר בתיקייה פרטית זמנית ומושחר במלואו.

## 3.3 סריקת merge-aware

3.3.1 כדי לא להשמיט merge-resolution bytes, הופעלה סריקה נוספת עם `log-opts=--all -m`.

3.3.2 הכלי דיווח `307` Commits scanned וכ־`27.50 MB`.

3.3.3 מספר Finding rows=`15`; כולם `generic-api-key`.

3.3.4 הרשומות הופיעו בשישה קבצי Test ייחודיים ובשבעה Commits ייחודיים.

3.3.5 ההפרש `15` לעומת `8` נובע לפחות בחלקו מהצגת merge diffs מול הורים; אין לפרש אותו כשבעה Secrets חדשים.

3.3.6 לאחר deduplication לפי `{rule,file,startLine,endLine}`, נותרו `6` coordinates ייחודיים.

3.3.7 root של קבוצת ה־coordinates המקומית וזה של קבוצת ה־coordinates ב־mirror היו זהים: `ad35b8e1fd1fa40d1b7446ec63b91eb9a6d7bb34501e59c0876dd9f70d3dd6a9`.

3.3.8 שוויון coordinates אינו מוכיח שוויון raw values לאורך Commits, משום שהדוחות מושחרים; value-level equality=`unknown/unavailable`.

3.3.9 report root=`40e167cae3c42f9b609f0f9bda183b976c54924d845a34b96b3f869847b4d346`; physical identity=`329 lines/13940 bytes`.

3.3.10 הדוח המפורט נשאר בתיקייה פרטית זמנית ומושחר במלואו.

# 4. פירוש בטיחותי

## 4.1 מה הוכח

4.1.1 חמשת Branch heads הציבוריים וה־Pull Request refs שנכללו ב־mirror נסרקו יחד על פני `307` Commits reachable.

4.1.2 merge-aware scan לא הוסיף file/line/rule coordinate חדש ביחס לקבוצת ששת ה־coordinates שכבר נצפתה.

4.1.3 כל המועמדים ההיסטוריים נמצאים בקובצי Test לפי ה־locators המושחרים.

4.1.4 לא הוכח Secret חי.

4.1.5 לא נסגר אף Candidate.

## 4.2 מה לא הוכח

4.2.1 קובץ Test אינו הוכחה שהערך אינו Credential.

4.2.2 Gitleaks default ruleset אינו כיסוי מלא לכל format או לכל מידע רגיש.

4.2.3 `redact=100` מגן על הפלט אך מונע value-level deduplication בדוח הציבורי.

4.2.4 לא בוצעה בדיקת תוקף מול Provider.

4.2.5 לא בוצעו Owner attestation, revocation או rotation.

4.2.6 לא הופעל Scanner בלתי־תלוי שני.

4.2.7 לא נסרקו כל GitHub-only surfaces ולא הוכח Secret-scanning alert state.

4.2.8 לא נסרקו unreachable Git objects או forks שאינם בתוך ה־mirror שנרכש.

## 4.3 Worktree mutable snapshot

4.3.1 תוצאת Directory מגרסה 1 נשארת Observation היסטורית של אותו רגע בלבד.

4.3.2 מאז נוספו Planning artifacts, ולכן ה־Directory snapshot אינו Current publication denominator.

4.3.3 אין לבצע סריקת Acceptance חדשה בזמן ש־Writers עדיין משנים את העץ.

4.3.4 סריקת Worktree/Index/Public allowlist חדשה נדרשת אחרי freeze מדויק.

# 5. פעולות סגירה

## 5.1 Candidate triage

5.1.1 ליצור Candidate Ledger פרטי ומושחר עבור כל `15` history rows וכל ששת ה־coordinates.

5.1.2 לשמור row identity ו־coordinate identity בנפרד כדי למנוע ספירה כפולה.

5.1.3 לקשור לכל Coordinate את כל ה־Commits שבהם הופיע, בלי להעתיק את הערך למסמך Public.

5.1.4 לקשור Owner, source intent, expected format ו־classification לכל Candidate.

5.1.5 סטטוסים מותרים=`CONFIRMED-LIVE`,‏ `CONFIRMED-REVOKED`,‏ `FALSE-POSITIVE-PROVEN`,‏ `NON-SECRET-SENSITIVE`,‏ `UNKNOWN`.

5.1.6 `UNKNOWN` חוסם Public Push.

## 5.2 השלמת Coverage

5.2.1 להקפיא exact Public allowlist ו־exact Git ref/object set.

5.2.2 להריץ Scanner בלתי־תלוי שני על אותם roots.

5.2.3 להוסיף provider-specific custom patterns רק עבור ספקים שנבחרו בפועל.

5.2.4 לסרוק GitHub-only surfaces בהרשאת Read-only ובפלט מושחר.

5.2.5 להוכיח GitHub Secret Scanning ו־Push Protection באמצעות live readback ו־negative canary שאינו Credential אמיתי.

5.2.6 לבצע worktree/index/history/generated-artifact scan מחדש לאחר freeze.

5.2.7 כל Confirmed Credential מחייב revocation/rotation לפני history remediation.

5.2.8 history rewrite או force push דורשים תוכנית ואישור הרסני נפרדים; הם אינם מאושרים כאן.

## 5.3 Acceptance

5.3.1 `openHistoryCoordinateCount=0`.

5.3.2 `openHistoryRowCount=0` לאחר deduplication ו־classification.

5.3.3 `openPublicAllowlistCandidateCount=0`.

5.3.4 שני Scanners מסכימים על אותו root set.

5.3.5 GitHub-only surface scan סגור.

5.3.6 כל confirmed Credential כולל revocation/rotation receipt.

5.3.7 Public Push Permit קושר remote refs, object set, allowlist, reports, triage ledger, approvals ו־expiry.

5.3.8 כל שינוי root מבטל את ה־Permit.

# 6. פסק דין

6.1 Remote History coverage השתפר מ־`298` local Commits ל־`307` reachable mirror Commits כולל merge diffs.

6.2 נמצאו `15` Detector rows המתכנסים לשישה file/line/rule coordinates; אין לפרש אף אחד מן המספרים כמספר Secrets.

6.3 confirmed live Secrets=`0`; cleared candidates=`0`; open coordinates=`6`.

6.4 verdict=`REJECT-PUBLIC-PUSH` עד השלמת סעיף 5.3.

6.5 repository visibility=`PUBLIC`; Gate29=`BLOCKED`; development freeze=`ACTIVE`.

6.6 לא בוצע שינוי ב־Product, Git worktree/index/refs, GitHub, Provider או Credential.
