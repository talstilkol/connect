# PostgreSQL Tenant Access Data Migration Rehearsal

תאריך אימות: 2026-08-20

## 1. תוצאה

1.1 ה־Slice השני של Data migration הושלם מקומית עבור חמש טבלאות:
`tenant_membership_events`, ‏`team_invitations`,
`team_invitation_events`, ‏`team_invitation_deliveries` ו־
`team_invitation_acceptances`.

1.2 הרצה נקייה מול SQLite ו־PostgreSQL 16 אמיתיים עברה:

```text
PostgreSQL tenant-access data rehearsal: PASS (36 D1 migrations, 24 PostgreSQL migrations, 5 tables, 11 rows, replay rejected, triggers restored, 7 parity scenarios)
```

1.3 יחד עם שבע טבלאות ה־Core, הוכחו כעת 12 מתוך 51 טבלאות. נותרו 39.

## 2. למה נדרש טיפול מיוחד ב־Triggers

2.1 ארבע טבלאות Ledger כוללות `INSERT trigger` שמשווה Event חדש למצב
הנוכחי. בעת Migration, אירוע היסטורי ישן תקין אינו תואם בהכרח למצב הסופי,
ולכן טעינה רגילה הייתה חוסמת היסטוריה חוקית.

2.2 בתוך Transaction יחידה בלבד המנגנון:

1. נועל את חמש הטבלאות ב־`ACCESS EXCLUSIVE`.
2. דורש שכל טבלאות היעד ריקות ושכל ה־User triggers פעילים.
3. משבית `USER triggers` רק בארבע טבלאות ה־Ledger; Foreign-key triggers
   פנימיים נשארים פעילים.
4. טוען את השורות ומפעיל את ה־Triggers מחדש.
5. מאמת Lineage מלא ומבצע Read-back של Counts ו־HMAC digests לפני Commit.

2.3 כשל בכל נקודה מבטל את ה־Transaction, כולל שינוי מצב ה־Triggers.

## 3. בדיקות Integrity לאחר הטעינה

3.1 Membership versions רציפים, והאירוע האחרון תואם Role, ‏Status ו־Version
של החברות הנוכחית.

3.2 כל Invitation מתחיל ב־`requested` בגרסה 1; Versions רציפים; המצב האחרון
תואם ל־Invitation או ל־Acceptance כאשר קיימת קבלה.

3.3 כל Delivery מקושר לאירוע `requested` או `re-requested` באותה גרסה
ובאותו זמן יצירה.

3.4 כל Acceptance תואם Invitation, ‏Membership, אימייל, Role, ‏Version,
זמן קבלה ותפוגה.

## 4. Semantic parity

4.1 שבעה תרחישים הושוו בשני המנועים:

1. Event של Membership אינו ניתן לשינוי.
2. אי אפשר להשעות את ה־Owner הפעיל האחרון.
3. Invitation שהתקבלה אינה ניתנת לשינוי.
4. Acceptance ledger אינו ניתן למחיקה.
5. Delivery שהסתיים אינו יכול לחזור ל־`sending`.
6. שינוי Role חוקי עם Event אטומי.
7. ביטול Invitation חוקי עם Event אטומי.

4.2 לאחר התרחישים הושווה המצב הקנוני של כל חמש הטבלאות ושל
`tenant_memberships`; לא נמצא פער עסקי.

## 5. הפעלה בטוחה

5.1 נדרש PostgreSQL 16 מקומי וריק בשם המדויק
`connect_tenant_access_data_migration_rehearsal`.

```bash
CONNECT_POSTGRES_TENANT_ACCESS_DATA_MIGRATION_REHEARSAL_URL=postgresql://127.0.0.1:<port>/connect_tenant_access_data_migration_rehearsal npm run verify:postgres-tenant-access-data-migration
```

5.2 ה־URL guard דוחה Host מרוחק, Password, ‏Query string, ‏Fragment,
Database אחר או Port חסר. אין להריץ את הפקודה מול Production.

## 6. מה עדיין חסר

6.1 Export אמיתי ומורשה מ־D1, ‏Staging rehearsal, ‏Load/Recovery ו־Cutover.

6.2 Data conversion ו־Semantic parity ל־39 הטבלאות בשמונת ה־Slices
הנותרים. ה־Slice הבא הוא Contact Organization & Import.
