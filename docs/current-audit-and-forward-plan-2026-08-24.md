# Connect — ביקורת מצב ותוכנית קדימה

תאריך בדיקה: 2026-08-24

## 1. מטרת המסמך ומקור האמת

1.1 מסמך זה הוא מקור האמת הקצר למצב הנוכחי ולתוכנית העבודה קדימה.

1.2 מסמכי ה־Stage המפורטים נשארים Evidence היסטורי וטכני. כאשר נתון
ישן סותר את המסמך הזה, יש לבדוק מחדש את ה־Evidence ולא לבחור את המספר
הגבוה יותר.

1.3 אין אחוז יחיד שמייצג בכנות גם קוד מקומי, גם Pilot חי וגם מוצר
Best-in-class. לכן ההתקדמות מוצגת בארבע שכבות נפרדות.

## 2. תמונת מצב מאומתת

2.1 שער הקוד המקומי: `PASS`.

2.1.1 שני Builds, ‏TypeScript ו־ESLint עברו.

2.1.2 כל **3,128 הבדיקות** עברו, ללא כשל, Skip או Todo.

2.1.3 Source guard סרק 771 קבצים, 35 Client graphs ו־1,800 קשרי
תלות של TypeScript.

2.1.4 Secret hygiene סרק 1,573 קובצי עבודה: 1,219 מנוהלים ו־354
חדשים, כולל היסטוריית Git.

2.2 מטריצת האפיון כוללת 27 דרישות:

2.2.1 ‏13 הן `local-complete`.

2.2.2 ‏9 הן `partial`.

2.2.3 ‏4 הן `external-blocked`.

2.2.4 אחת היא `planned`.

2.3 שער ה־Production הנוכחי הוא `blocked`:

2.3.1 ‏5 בדיקות `ready`.

2.3.2 ‏18 בדיקות `blocked`.

2.3.3 ‏11 בדיקות `decision-required`.

2.3.4 זהו יחס פורמלי של **14.7%**, אך הוא עדיין כולל D1 ו־R2
מהטופולוגיה הישנה. לכן הוא אינו מדד מלא לטופולוגיית היעד
Vercel/Railway/PostgreSQL.

2.4 החלטות:

2.4.1 ניתנו 25 בחירות מפורשות מתוך 30 קבוצות.

2.4.2 ב־D03 ניתנה הנחיה להכין Ports עבור Paddle ו־Stripe, אך לא נבחר
ספק Billing פעיל.

2.4.3 ‏D05, ‏D14, ‏D29 ו־D30 לא הוכרעו.

2.4.4 רק ADR-0001 ו־ADR-0002 הם `accepted`. ‏ADR-0003, ‏ADR-0004
ו־ADR-0005 עדיין `proposed`.

2.5 Git ו־GitHub:

2.5.1 נכון לאימות האחרון יש **557 נתיבים מקומיים שלא הוכנסו
ל־Commit**: 204 קבצים מנוהלים ששונו ו־353 קבצים חדשים. נקודת הפתיחה
של Inventory שלב 1 הייתה 546 נתיבים; 11 הנתיבים הנוספים נוצרו במהלך
תיקוני ההקשחה וה־Runtime Evidence.

2.5.2 ב־200 הקבצים המנוהלים בלבד נמצאו 27,925 תוספות ו־3,685
מחיקות. בקבצים החדשים היו יותר מ־89,000 שורות טקסט עוד לפני הוספת
מסמך ביקורת זה.

2.5.3 ארבעת Commits ההקשחה והחוזים הראשונים נדחפו לענף
`codex/cloudflare-evidence-builders`, עד `b5dc333`. ‏`main` לא השתנה.
יתר מאות הנתיבים עדיין אינם בתוך Commit ולכן אינם מוגנים ב־GitHub.

2.5.4 אימות GitHub חי דרך הדפדפן אישר שה־Repository פרטי וש־`main`
הוא ענף ברירת המחדל. באותה בדיקה אומת שאין Classic branch protection
ואין Rulesets כלל. Collaborators נשארו `unknown/unavailable` משום
ש־GitHub דרש Sudo re-authentication. ה־Token המקומי של `gh` עדיין אינו
תקף.

## 3. אחוזי השלמה נכונים לשימוש

3.1 Baseline היסטורי: **100%** מה־Baseline המקומי המקורי.

3.1.1 זה אומר שהיקף 14 השלבים הישן הושלם בקוד ובבדיקות מקומיות.

3.1.2 אין לפרש זאת כ־100% מהאפיון, מה־Pilot או מהמוצר המלא.

3.2 בסיס קוד מקומי של המוצר הנוכחי: **80%–85%**, אומדן.

3.2.1 קיימים UI, Domain contracts, Migrations, Security boundaries,
Queues, ‏PostgreSQL adapters וחבילת בדיקות רחבה.

3.2.2 חסרים עדיין חיבורי Runtime, ספקים, תצורה חיה, Evidence ותרגילים.

3.3 מוכנות ל־Closed Pilot מוכח: **30%–40%**, אומדן.

3.3.1 רוב חוזי הקוד קיימים.

3.3.2 עדיין אין שרשרת מלאה של Accounts → Deployment → Meta live →
Monitoring → Restore → Go/No-Go.

3.4 מוכנות פורמלית לפי השער הקיים: **14.7%**, נתון מדויק אך חלקי.

3.4.1 לאחר בניית Readiness Registry v2 יהיה צורך לחשב אותו מחדש.

3.5 השלמת חזון Best-in-class: **15%–25%**, אומדן.

3.5.1 עשרת השלבים שאחרי Pilot מכילים את מרבית עבודת המוצר, השוק,
ה־Enterprise, ה־Analytics וה־Scale.

3.6 הנתון הישן `92% ±4%` מבוטל כמדד לכל התוכנית. הוא תיאר בעיקר את
המאמץ המקומי בתוך היקף מצומצם ואינו משקלל נכון עבודה חיה ועשרה שלבים
שאחרי Pilot.

## 4. ביקורת — מה טוב ומה דורש תיקון

4.1 נקודות חוזק:

4.1.1 המערכת Fail-closed ואינה ממציאה מוכנות של ספק או Production.

4.1.2 קיימת עקיבות טובה בין 27 דרישות, Domain contracts, Migrations
ובדיקות שליליות.

4.1.3 קיימת הקפדה חזקה על Tenant isolation, ‏CAS, ‏Idempotency,
Audit, ‏bounded outputs ומזהים דטרמיניסטיים.

4.1.4 שער הקוד המקומי רחב ועובר במלואו.

4.2 סיכון תפעולי מיידי — העבודה אינה מוגנת:

4.2.1 אין P0 פעיל בהתנהגות המוצר שנמצא בבדיקה, משום שהשער נכשל סגור.

4.2.2 קיים P0 תפעולי: יותר מ־500 קבצים ויותר מ־100,000 שורות בקירוב
נמצאים מחוץ ל־Commit. יש לעצור הרחבת Features עד חלוקה, Review ושמירה.

4.3 ‏P1 — מודל Readiness מיושן:

4.3.1 `currentProductionReadiness.ts` עדיין קורא
`.openai/hosting.json`.

4.3.2 D1 ו־R2 מסומנים `ready`, ואין שערים מקבילים ומלאים ל־Railway
PostgreSQL ול־Object storage של טופולוגיית היעד.

4.3.3 חלק מהיכולות נקבעות באמצעות Booleans ידניים ולא מ־Evidence
Registry אחיד.

4.4 ‏P1 — חסרה הוכחה חיה במסלול ברירת המחדל:

4.4.1 ‏3,128 הבדיקות אינן כוללות כברירת מחדל PostgreSQL, ‏Redis,
Meta ו־Browser Staging חיים.

4.4.2 מיגרציה 0040 וה־CAS החדש לא הוכחו מול PostgreSQL חי במסגרת
שער השחרור.

4.4.3 **תוקן מקומית ב־24.08.2026:** מסלול ה־Web של Production
Readiness קורא Release Evidence דרך Railway API מאומת ו־PostgreSQL
Repository. ערך ה־Environment הישן מנוקה תמיד; אין חיבור PostgreSQL
ישיר מ־Vercel ואין Fallback במקרה של כשל, תפוגה או Digest שגוי.

4.4.4 **תוקן מקומית ב־24.08.2026:** גם שער ה־CLI דוחה כעת Legacy
Environment JSON. מכיוון שאין לו Clerk request context בטוח, הוא נכשל
סגור עד שיתווסף מסלול Attestation או זהות Machine-to-machine מאושרת
לקריאת Repository.

4.4.5 **P1 פתוח:** ה־Production composition יכול לקרוא Evidence אך
עדיין אינו מאתחל את שורת ה־Release ואינו מחבר את שרשרת
`initialize → issue → CAS publish → read-back → verify`.

4.4.6 **תוקן מקומית ב־24.08.2026:** פקודת Production הקנונית
`npm run start:railway-api` מפעילה כעת את ה־BullMQ/PostgreSQL Runtime
המלא שמחבר את Reader. ה־Runtime המצומצם הופרד לפקודת
`start:railway-api:postgres-only` ואינו מיועד לפריסה.

4.4.7 **P1 פתוח:** יש להגדיר Release identity משותפת לשלושת ה־Artifacts
של Vercel Web, ‏Railway API ו־Railway Worker. אין להשתמש ידנית באותו
Artifact digest עבור Builds שונים; נדרש Composite manifest או זהויות
שירות נפרדות הקשורות לאותו Release.

4.5 ‏P1 — פערי Security ו־CI:

4.5.1 **תוקן מקומית ב־24.08.2026:** Secret hygiene מכסה כעת
`DATABASE_URL`, ‏`REDIS_URL`, Tokens של Better Stack, מפתח Railway
scheduler, Tokens של Cloudflare ו־`github_pat_...`, כולל Assignments
עם `export`, רווחים ו־Quotes. הסריקה המשופרת עברה על 1,573 קבצים.

4.5.2 **תוקן מקומית ב־24.08.2026:** Workflow ה־Dependency Attestation
אינו מדלג עוד על Repository פרטי. הוא דורש אישור מפורש של יכולת
GitHub Enterprise Cloud ונכשל בקוד מוגבל אם הזכאות לא אושרה. שער
Production עדיין דורש Bundle קריפטוגרפי תקף ואינו מקבל Evidence לא חתום.

4.5.3 **תוקן מקומית ב־24.08.2026:** Source guard מבוסס כעת על AST
ועל TypeScript module resolution במקום Regex בלבד. הוא מכסה Client,
Server, ‏`db`, ‏`worker`, ‏route handlers וקובצי Runtime, ונכשל סגור
על Import מקומי לא פתור או Import דינמי לא־ליטרלי בגרף Client.

4.5.4 **אומת חי ב־24.08.2026:** ה־Repository פרטי, אך `main` אינו
מוגן, אין Rulesets ואין Required checks. זהו חסם Governance פעיל;
אין לבצע Merge לפני הגדרת מדיניות שאינה נועלת את הבעלים היחיד מחוץ
ל־Repository.

4.6 ‏P2 — תחזוקתיות ובדיקות:

4.6.1 אין Code coverage וספי כיסוי.

4.6.2 ‏89 קובצי בדיקה קוראים Source כמחרוזת; אלו Guardrails טובים אך
אינם הוכחת Runtime.

4.6.3 קיימים 38 קבצים בני יותר מ־1,000 שורות. הפיצול צריך להיות
הדרגתי ואחרי סגירת המסלול הקריטי.

4.6.4 מסמכי המצב הפכו ל־Append-only ונוצרו סתירות בין מספרי בדיקות,
חסמים, ADRs ואחוזי השלמה.

## 5. התוכנית הקדמית — 15 שלבים שנותרו

5.1 נשארו **15 שלבים אסטרטגיים**:

5.1.1 חמישה שלבים עד Closed Pilot מוכח.

5.1.2 עשרה שלבים מה־Pilot ועד חזון Best-in-class.

### 5.2 חמשת השלבים עד Pilot

| שלב | תוצאה נדרשת | עבודה נטו | תנאי סגירה |
|---|---|---:|---|
| 1. הגנת העבודה ומקור אמת | Review ל־557 הנתיבים, Commits/PRs קטנים ו־Current status אחד; Inventory, Secret scan ו־Source guard כבר הושלמו מקומית | 20–40 שעות | Commit נקי, CI ו־Review לכל Slice, ללא אובדן שינוי |
| 2. החלטות, Governance ו־Accounts | D03/D05/D14, אישור ADR-0003/4/5, RACI, Budgets, Ruleset, CODEOWNERS וסביבות | 16–36 שעות | בעלים שמיים, החלטות חתומות וחשבונות/הרשאות מאומתים |
| 3. Runtime ו־Cutover מקומי | Readiness v2, שרשרת Release Evidence מלאה, Migration 0040 חיה, Browser DB proof והסרת תלות Readiness ב־D1/R2; Reader והקשחת CLI כבר הושלמו מקומית | 48–80 שעות | שער היעד נגזר מ־Evidence ונבדק מול PostgreSQL/Redis אמיתיים |
| 4. Staging ואינטגרציות חיות | Vercel Web, Railway API/Worker/PostgreSQL/Redis, Clerk, Test WABA, inbound/outbound/campaign/bot evidence | 40–72 שעות | E2E חי, Idempotency, 429/Retry-After, Kill switch ו־Tenant isolation מוכחים |
| 5. Operations ו־Pilot Gate | Better Stack, SLO, Backup/Restore, Retention/Legal, Load/DLQ/Outage/Rollback ו־Go/No-Go | 40–94 שעות | Evidence חתום, Restore מבודד, Runbooks מאושרים ו־Closed Pilot נפתח |

5.3 סך הכול עד Pilot WhatsApp מבוקר: **164–322 שעות עבודה נטו**.

5.4 אם AI ו־Knowledge uploads חייבים להיכלל כבר ב־Pilot, יש להוסיף
**24–48 שעות** עבור OpenAI eval, ‏Object storage, ‏Scanner, Extraction
ו־Retrieval חיים. הטווח יהיה **188–370 שעות**.

5.5 זמני המתנה ל־Meta, Legal, GitHub, פתיחת Accounts או אישור ספקים
אינם כלולים ואינם ניתנים להערכה אמינה לפני פתיחת הבקשות.

### 5.6 עשרת השלבים שאחרי Pilot

| שלב | תחום | עבודה נטו |
|---|---|---:|
| 6 | CRM ו־Contacts מתקדמים | 140–260 שעות |
| 7 | Campaigns, Segmentation ו־Delivery optimization | 180–340 שעות |
| 8 | Inbox, Team collaboration ו־Support workflows | 140–260 שעות |
| 9 | Automation ו־Flow Builder מתקדם | 180–340 שעות |
| 10 | AI, Knowledge, Evals ו־Safety | 220–420 שעות |
| 11 | Analytics, Attribution ו־Experimentation | 140–280 שעות |
| 12 | Billing, Packages, Quotas ו־Agency mode | 180–340 שעות |
| 13 | Public API, Webhooks ואינטגרציות | 220–420 שעות |
| 14 | Enterprise, Security, Compliance ו־Mobile | 260–500 שעות |
| 15 | GA, Scale, Reliability ו־Market readiness | 180–400 שעות |

5.7 סך העבודה אחרי Pilot: **1,840–3,560 שעות**.

5.8 סך כל התוכנית שנותרה מהמצב הנוכחי: **כ־2,000–3,890 שעות עבודה
נטו**, לפני המתנות חיצוניות.

## 6. החלטות שנותרו

6.1 החלטות שחוסמות את המסלול הקריטי:

6.1.1 D03 — לבחור ספק Billing פעיל יחיד. המלצה: Pilot ידני ללא
Checkout; לשמור Ports ו־Contract tests ל־Paddle ול־Stripe עד בחירת
הישות המשפטית והספק.

6.1.2 D05 — File scanner. המלצה: אם Uploads ב־Pilot, לבדוק ClamAV
פרטי ב־Railway; אם לא, להשאיר Uploads כבויים.

6.1.3 D14 — Object storage. המלצה: S3 פרטי עם Encryption, Versioning
ו־Lifecycle; Object Lock רק למחלקות שמחייבות WORM או Legal Hold.

6.1.4 ADR-0003, ADR-0004 ו־ADR-0005 — דורשים Approvers, מועד UTC
ו־Evidence לפני מעבר ל־`accepted`.

6.1.5 D19–D21 — שמות Primary/Backup, נכסי Meta, גבול Pilot ותנאי עצירה.

6.1.6 D23/D28 — מחיר, מטבע, Quotas ותקרת עלות לכל ספק.

6.1.7 D10/D16/D27 — שעות תמיכה, Domains, Regions, Canary ו־Rollback.

6.1.8 D11/D26 — Retention, Legal Hold, Privacy, Terms, DPA ו־Data
residency באישור Legal.

6.2 החלטות שאפשר לדחות עד Evidence מה־Pilot:

6.2.1 D29 — סדר Roadmap אחרי Pilot.

6.2.2 D30 — Enterprise, Integrations ו־Mobile.

6.2.3 D24 — Recurring campaigns נשארים אחרי Pilot.

## 7. זמן קלנדרי משוער

7.1 מפתח אחד, בקצב של כ־28 שעות פיתוח נטו בשבוע:

7.1.1 עד Pilot: כ־6–14 שבועות עבודה, ובפועל כ־2–5 חודשים עם Review
והמתנות חיצוניות.

7.1.2 לכל התוכנית: כ־72–140 שבועות נטו; בפועל כ־18–36 חודשים.

7.2 צוות קטן עם 60–75 שעות אפקטיביות בשבוע:

7.2.1 עד Pilot: כ־3–6 שבועות נטו; בפועל כ־1–3 חודשים.

7.2.2 לכל התוכנית: כ־27–65 שבועות נטו; בפועל כ־8–15 חודשים, בהתאם
למידת המקביליות, Product validation וספקים.

7.3 אלה טווחי תכנון, לא התחייבות. אחרי Closed Pilot יש לכייל מחדש
את שלבים 6–15 לפי שימוש, Support, הכנסה ומדדי אמינות.

## 8. סדר הביצוע הבא

8.1 לעצור זמנית הרחבת Feature חדשה.

8.2 להשלים Review ל־557 הנתיבים ולחלק אותם ל־Commits/PRs קטנים לפי
Domain. ה־Inventory ו־Secret scan הושלמו; אין לבצע Commit או Push לפני
ביקורת של ה־Slice המתאים.

8.3 במקביל לסגור את D03/D05/D14 ואת ADR-0003/4/5 עם בעלי סמכות.

8.4 לבצע Readiness Registry v2. חיבור Release Evidence Repository
ל־Runtime PostgreSQL הושלם מקומית ונשאר להוכיחו ב־Staging.

8.5 להכניס PostgreSQL, Redis ו־Browser live gates ל־CI מבודד.

8.6 רק לאחר Commit נקי ושער יעד אמין, לעבור ל־Staging ול־Meta live.

## 9. מסלול קריטי

```text
הגנת 557 הנתיבים
  -> החלטות + ADRs + בעלי תפקידים
    -> Accounts + GitHub Governance
      -> Readiness v2 + Runtime Cutover
        -> PostgreSQL/Redis/Browser live gates
          -> Staging + Clerk + Test WABA
            -> Monitoring + Restore + Legal + Rollback
              -> Go/No-Go
                -> Closed Pilot
                  -> כיול שלבים 6–15 לפי Evidence
```

## 10. Inventory והצעת חלוקה ל־Review

10.1 תמונת ה־Git שנמדדה בתחילת שלב 1:

| אזור | קבצים ששונו | קבצים חדשים | סך הכול |
|---|---:|---:|---:|
| `server/` | 86 | 167 | 253 |
| `tests/` | 67 | 127 | 194 |
| `docs/` | 16 | 14 | 30 |
| `postgres/` | 2 | 15 | 17 |
| `scripts/` | 6 | 9 | 15 |
| `shared/` | 5 | 5 | 10 |
| `db/` | 6 | 3 | 9 |
| `drizzle/` | 1 | 6 | 7 |
| קובצי שורש | 5 | 0 | 5 |
| `features/`, `app/`, `styles/`, `worker/` | 6 | 0 | 6 |
| **סך הכול** | **200** | **346** | **546** |

10.2 אין לבצע Commit יחיד של כל המלאי. סדר ה־Review המומלץ:

10.2.1 Slice A — Source control, Secret scanning, CI ו־Governance.

10.2.2 Slice B — PostgreSQL schema, Migrations, parity ו־data migration
contracts.

10.2.3 Slice C — Railway API/Worker foundation, Redis/BullMQ ו־runtime
composition.

10.2.4 Slice D — WhatsApp delivery policy, rate limiting ו־Meta adapters.

10.2.5 Slice E — Bot reply staging, Release Evidence ו־observability.

10.2.6 Slice F — Identity, team invitations ו־Clerk.

10.2.7 Slice G — Contacts, conversations, templates, campaigns,
automation ו־AI/Knowledge.

10.2.8 Slice H — React UI, localization, accessibility ו־CSS.

10.2.9 Slice I — Documentation, ADRs, runbooks ו־decision intake.

10.3 כל Slice נסגר רק לאחר:

10.3.1 בדיקת Diff מול ה־Commit `0152719` והפרדה משינויים שאינם שייכים
לאותו Domain.

10.3.2 Secret scan מורחב לפני Staging.

10.3.3 בדיקות ממוקדות, Build לפי הצורך ו־`git diff --check`.

10.3.4 Commit אטומי עם תיאור סיבה, לא רק רשימת קבצים.

10.3.5 Pull Request ו־Review לפני מיזוג ל־Branch המוגן.

10.4 סריקת Gitleaks בלתי־תלויה:

10.4.1 סריקת ה־Worktree הנוכחי עברה ללא ממצא.

10.4.2 סריקת 225 Commits היסטוריים החזירה ארבע התאמות
`generic-api-key` בתוך Tests.

10.4.3 בדיקה מושחרת סיווגה אותן כמזהים דטרמיניסטיים של המוצר ולא
Credentials: שני `eventKey` בצורת SHA-256, ‏`campaignKey` אחד ומפתח
Object storage אחד ב־Migration fixture.

10.4.4 לא נוסף Allowlist רחב, כדי שלא להסתיר Secret עתידי באותם
קבצים. אם הסריקה תיכנס ל־CI, יש לאשר רק Fingerprints מדויקים של ארבע
ההתאמות לאחר Security review.

## 11. פירוק ביצוע מעודכן לשלבים 1 ו־3

11.1 שלב 1 — שלושה Commits ראשונים, לאחר Partial staging מבוקר:

11.1.1 ‏A1 — TypeScript Source Boundary Guard: הסקריפט ו־Hunks של
בדיקות Source Guard בלבד.

11.1.2 ‏A2 — Secret Hygiene: הסורק, קובץ הבדיקות החדש ו־Hunks של
Secret CI בלבד.

11.1.3 ‏A3 — Private Dependency Attestation: ה־Workflow ובדיקות
ה־Attestation בלבד. Commit מקומי אפשרי, אך CI חי יישאר חסום עד החלטת
GitHub Enterprise Cloud או מנגנון חתימה חלופי מאושר.

11.1.4 ‏A4 — הושלם ונשמר ב־`b5dc333`: חוזי Domain, ‏Registry,
Composite manifest ו־Evaluator של Readiness v2, ללא חיבור DB או Runtime.

11.1.5 אין להשתמש ב־`git add .`: לפחות `tests/ci-foundation.test.mjs`,
`tests/release-guardrails.test.mjs`, ‏`package.json` ו־`.env.example`
מכילים שינויים מכמה Slices.

11.2 שלב 3 — Readiness Registry v2, בסדר הבא:

11.2.1 חוזה Domain ו־Registry מרכזי: 7–10 שעות.

11.2.2 Evaluator, ‏Evidence validation ו־async source orchestration:
7–10 שעות.

11.2.3 PostgreSQL migration, repository ו־Railway read operation:
8–11 שעות.

11.2.4 Composite probes ל־PostgreSQL/Redis ו־Worker heartbeat:
8–12 שעות.

11.2.5 מעבר Gate ו־UI ל־v2: ‏4–6 שעות.

11.2.6 בדיקות שליליות, Build ו־Live PostgreSQL proof: ‏8–12 שעות.

11.2.7 מצב `decision-required` ל־Object storage: ‏2–3 שעות. לאחר
בחירת ספק יידרשו עוד 8–14 שעות ל־Adapter, Canary ו־Security evidence.

11.3 ששת Checks התשתיתיים הראשונים של v2:

11.3.1 `runtime.vercel-web`.

11.3.2 `runtime.railway-api`.

11.3.3 `runtime.railway-worker`.

11.3.4 `storage.postgresql`.

11.3.5 `queue.redis-bullmq`.

11.3.6 `storage.object`, שנשאר `decision-required` עד בחירת D14.

11.4 חוזה Release identity מומלץ:

11.4.1 `releaseId`, ‏`commitSha` ו־`releaseManifestDigest` משותפים לכל
השירותים.

11.4.2 לכל Build נשמר `serviceId` ו־`artifactDigest` נפרד. אין להשוות
Digest של Vercel Build ל־Digest של Railway API או Worker כאילו הם אותו
Artifact.

11.4.3 ה־Manifest המשותף קושר את שלושת ה־Digests לאותו Release באופן
דטרמיניסטי וחתום.

11.5 החלטות חיצוניות חדשות שנחשפו בביקורת:

11.5.1 זהות Machine-to-machine מורשית להפעלת Post-deploy live gate;
Clerk session של משתמש אינו מתאים ל־CLI.

11.5.2 אישור Composite release manifest וזהויות השירותים הסופיות.

11.5.3 GitHub Enterprise Cloud עבור Private Artifact Attestations,
או מנגנון חתימה חלופי שעובר Security review.

11.5.4 יכולת ספק Redis להוכיח AOF ו־`noeviction`; `PING` לבדו אינו
Evidence מספק ל־Production.
