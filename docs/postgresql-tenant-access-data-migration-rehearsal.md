# PostgreSQL Tenant Access Data Migration Rehearsal

תאריך אימות v2: 2026-08-25

## 1. תוצאה

1.1 ה־Slice השני של Data migration הושלם מקומית עבור שש טבלאות:
`tenant_membership_events`, ‏`team_invitations`,
`team_invitation_events`, ‏`team_invitation_deliveries` ו־
`team_invitation_delivery_deferrals` ו־`team_invitation_acceptances`.

1.2 הרצה נקייה מול SQLite ו־PostgreSQL 16 אמיתיים עברה:

```text
PostgreSQL tenant-access data rehearsal: PASS (42 D1 migrations, 42 PostgreSQL migrations, 6 tables, 12 rows, replay rejected, triggers restored, 7 parity scenarios)
```

1.3 הראיה כוללת Deferral לא־ריק עם `PROVIDER_RATE_LIMITED`, קישור ל־Delivery
במצב `pending`, וזמני `deferred_at`/`retry_after_at` תקינים. Registry
ההעברה המלא מכסה 55 טבלאות; עדיין נדרשת הרצת Full integration מאוכלסת
של כל 42 ה־migrations יחד.

## 2. למה נדרש טיפול מיוחד ב־Triggers

2.1 חמש טבלאות Ledger כוללות `INSERT trigger` שמשווה Event חדש למצב
הנוכחי. בעת Migration, אירוע היסטורי ישן תקין אינו תואם בהכרח למצב הסופי,
ולכן טעינה רגילה הייתה חוסמת היסטוריה חוקית.

2.2 בתוך Transaction יחידה בלבד המנגנון:

1. נועל את שש הטבלאות ב־`ACCESS EXCLUSIVE`.
2. דורש שכל טבלאות היעד ריקות ושכל ה־User triggers פעילים.
3. משבית `USER triggers` רק בחמש טבלאות ה־Ledger; Foreign-key triggers
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

3.5 כל Deferral מקושר ל־Delivery באותו Tenant, משתמש רק בסיבה
`PROVIDER_RATE_LIMITED`, מתחיל בזמן העדכון של ה־Delivery ומסתיים בתוך יום.

## 4. Semantic parity

4.1 שבעה תרחישים הושוו בשני המנועים:

1. Event של Membership אינו ניתן לשינוי.
2. אי אפשר להשעות את ה־Owner הפעיל האחרון.
3. Invitation שהתקבלה אינה ניתנת לשינוי.
4. Acceptance ledger אינו ניתן למחיקה.
5. Delivery שהסתיים אינו יכול לחזור ל־`sending`.
6. שינוי Role חוקי עם Event אטומי.
7. ביטול Invitation חוקי עם Event אטומי.

4.2 לאחר התרחישים הושווה המצב הקנוני של כל שש הטבלאות ושל
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

6.2 Full integration מאוכלס לכל 55 הטבלאות מול baseline של 42 migrations,
כולל ראיית עומס, Recovery ו־Rollback באותה גרסת Release.
