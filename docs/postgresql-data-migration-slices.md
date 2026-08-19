# PostgreSQL Data Migration Slices

תאריך מיפוי: 2026-08-20

## 1. מטרה

1.1 ה־Schema parity מוכיח שקיימות 51 טבלאות מקבילות, אך אינו אומר באיזה
סדר בטוח להעביר את הנתונים.

1.2 Registry דטרמיניסטי ב־
`postgres/postgresDataMigrationSliceRegistry.mjs` מחלק כל טבלה בדיוק פעם
אחת ל־Slice עסקי, ומקודד את התלויות בין ה־Slices.

1.3 Slice הוא קבוצת טבלאות שניתן לייצא, לטעון, לאמת ולתרגל יחד. החלוקה
מונעת טעינת Child לפני Parent ומאפשרת לעצור ולחקור פער בלי לסכן את כל
ההגירה.

## 2. מפת ה־Slices

| סדר | Slice | טבלאות | תלות | מצב | אומדן נטו |
| --- | --- | ---: | --- | --- | ---: |
| 1 | `core` | 7 | אין | Rehearsal + Semantic parity הושלמו | הושלם |
| 2 | `tenant-access` | 5 | `core` | Rehearsal + Semantic parity הושלמו | הושלם |
| 3 | `contact-organization-import` | 6 | `core` | הבא לביצוע | 5–12 שעות |
| 4 | `meta-connection` | 3 | `core` | מתוכנן | 4–10 שעות |
| 5 | `templates-campaigns` | 4 | Core, Contacts, Meta | מתוכנן | 6–16 שעות |
| 6 | `conversations-messages` | 2 | Core, Meta | מתוכנן | 4–10 שעות |
| 7 | `bot-runtime` | 3 | Core, Conversations | מתוכנן | 4–10 שעות |
| 8 | `ai-knowledge-runtime` | 9 | Core, Conversations | מתוכנן | 10–24 שעות |
| 9 | `governance-billing` | 5 | `core` | מתוכנן | 5–12 שעות |
| 10 | `whatsapp-delivery-policy` | 7 | Core, Meta | מתוכנן | 10–24 שעות |

2.1 נותרו 39 טבלאות לאחר ה־Core ו־Tenant Access. האומדן הכולל ל־Data
migration ו־Parity המקומיים הוא **48–118 שעות פיתוח ואימות נטו**. הוא אינו כולל Export חי,
Accounts, המתנה לספקים, Staging, Load/Recovery או Cutover.

## 3. Slice שהושלם — Tenant Access

3.1 הטבלאות:

1. `tenant_membership_events`.
2. `team_invitations`.
3. `team_invitation_events`.
4. `team_invitation_deliveries`.
5. `team_invitation_acceptances`.

3.2 למה הוא הבא: כל ה־Foreign keys שלו נסגרים מול `tenants` ו־
`tenant_memberships` שכבר עברו ב־Core, והוא אינו תלוי בספק Meta, Queue,
Storage או AI.

3.3 כל תתי־השלבים הבאים הושלמו:

1. להגדיר Column contracts מדויקים מול ה־Schema הסופי של D1 ו־PostgreSQL.
2. לחסום Legacy rows שלא יכולים לעמוד ב־Actor kind, Key או Timestamp
   constraints של PostgreSQL.
3. ליצור Snapshot עקבי בתוך D1 transaction עם Integrity ו־Foreign-key
   checks.
4. ליצור Plan קצר־תוקף עם HMAC manifest לכל טבלה.
5. לנעול את חמש טבלאות היעד, לדרוש שהן ריקות ולטעון לפי סדר Parent-first.
6. לקרוא בחזרה Counts ו־Digests לפני Commit.
7. להריץ Membership mutation, Invitation request/revoke/expire,
   Delivery reconciliation ו־Acceptance parity בשני המנועים.
8. להוכיח Replay, Conflict, Rollback ושחזור Triggers מול PostgreSQL 16
   אמיתי.

3.4 ההרצה הנקייה עברה עם 36 מיגרציות D1, ‏24 מיגרציות PostgreSQL,
חמש טבלאות, 11 רשומות ושבעה תרחישי Semantic parity. מצב היעד הושווה
ל־D1 לאחר המעברים. פרטי הראיה נמצאים ב־
`docs/postgresql-tenant-access-data-migration-rehearsal.md`.

## 4. Slice הבא — Contact Organization & Import

4.1 שש הטבלאות הבאות הן `contact_tags`, ‏`contact_lists`,
`contact_tag_assignments`, ‏`contact_list_memberships`,
`contact_import_jobs` ו־`contact_import_rows`.

4.2 ה־Slice תלוי רק ב־Core שכבר עבר, אך דורש אימות פרטיות נפרד משום
ששורות Import שומרות Fingerprints, שגיאות ותוצאות עיבוד בעלות מחזור חיים
שונה מ־Contact רגיל.

## 5. תנאי בטיחות

5.1 ה־Registry אינו מעביר נתונים בעצמו. סטטוס `rehearsed` ניתן רק לאחר
הרצת PostgreSQL אמיתית ו־Semantic parity מתועד.

5.2 אין להרחיב את ה־Core plan בשקט. לכל Slice יהיו Version, Plan ID,
Manifest ו־Evidence משלו, כדי ש־Replay או החלפת Payload ייכשלו סגור.

5.3 אין לטעון Secrets גולמיים. ב־Meta slice יועברו רק Envelopes מוצפנים
שכבר עומדים בחוזה היעד.

5.4 אין להריץ את המנגנון על מסד יעד שאינו ריק ואין לבצע Merge אוטומטי.
