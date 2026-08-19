# PostgreSQL Data Migration Slices

תאריך מיפוי: 2026-08-19

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
| 2 | `tenant-access` | 5 | `core` | הבא לביצוע | 6–14 שעות |
| 3 | `contact-organization-import` | 6 | `core` | מתוכנן | 5–12 שעות |
| 4 | `meta-connection` | 3 | `core` | מתוכנן | 4–10 שעות |
| 5 | `templates-campaigns` | 4 | Core, Contacts, Meta | מתוכנן | 6–16 שעות |
| 6 | `conversations-messages` | 2 | Core, Meta | מתוכנן | 4–10 שעות |
| 7 | `bot-runtime` | 3 | Core, Conversations | מתוכנן | 4–10 שעות |
| 8 | `ai-knowledge-runtime` | 9 | Core, Conversations | מתוכנן | 10–24 שעות |
| 9 | `governance-billing` | 5 | `core` | מתוכנן | 5–12 שעות |
| 10 | `whatsapp-delivery-policy` | 7 | Core, Meta | מתוכנן | 10–24 שעות |

2.1 נותרו 44 טבלאות לאחר ה־Core. האומדן הכולל ל־Data migration ו־Parity
המקומיים הוא **54–132 שעות פיתוח ואימות נטו**. הוא אינו כולל Export חי,
Accounts, המתנה לספקים, Staging, Load/Recovery או Cutover.

## 3. Slice הבא — Tenant Access

3.1 הטבלאות:

1. `tenant_membership_events`.
2. `team_invitations`.
3. `team_invitation_events`.
4. `team_invitation_deliveries`.
5. `team_invitation_acceptances`.

3.2 למה הוא הבא: כל ה־Foreign keys שלו נסגרים מול `tenants` ו־
`tenant_memberships` שכבר עברו ב־Core, והוא אינו תלוי בספק Meta, Queue,
Storage או AI.

3.3 תתי־השלבים לביצוע:

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
8. להוכיח Replay, Conflict, Rollback ו־Concurrent acceptance מול
   PostgreSQL 16 אמיתי.

## 4. תנאי בטיחות

4.1 ה־Registry אינו מעביר נתונים ואינו מסמן Slice כ־`rehearsed`.

4.2 אין להרחיב את ה־Core plan בשקט. לכל Slice יהיו Version, Plan ID,
Manifest ו־Evidence משלו, כדי ש־Replay או החלפת Payload ייכשלו סגור.

4.3 אין לטעון Secrets גולמיים. ב־Meta slice יועברו רק Envelopes מוצפנים
שכבר עומדים בחוזה היעד.

4.4 אין להריץ את המנגנון על מסד יעד שאינו ריק ואין לבצע Merge אוטומטי.
