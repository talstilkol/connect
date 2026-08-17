# חוזה PostgreSQL למחזור חיי הזמנת צוות

## 1. מטרה ומצב

1.1 מסמך זה מקפיא את מבנה ה־PostgreSQL של Team invitation לפני כתיבת
ה־Repositories וה־API שמפעילים אותו.

1.2 Migration מספר `0004_team_invitation_lifecycle.sql` קיימת ומכילה ארבע
טבלאות ו־16 Triggers מפורשים. היא הוחלה כחלק משרשרת של חמש Migrations על
PostgreSQL 16.13 מקומי ומבודד.

1.3 Repositories ספק־נייטרליים קיימים עבור Find, ‏Request, ‏Re-request,
Revoke, ‏Expiration transition וסריקת Expiration מדורגת.

1.4 זוהי הוכחת Schema ו־Dependency אמיתית. היא אינה הוכחת Driver, ‏Runtime,
שתי Transactions מקבילות, Staging או Production.

## 2. הסבר למתחילים

2.1 הזמנה אינה רק שורת אימייל. יש לה מצב עסקי, היסטוריה, ניסיון מסירה
והוכחה נפרדת שהמוזמן התקבל כחבר.

```text
בקשת הזמנה
  -> team_invitations: המצב הנוכחי
  -> team_invitation_events: מה השתנה ומי שינה
  -> team_invitation_deliveries: האם המייל/ההודעה נמסרו
  -> team_invitation_acceptances: האם נוצר Membership תואם
```

2.2 ההפרדה מונעת מצב שבו Timeout של ספק המייל גורם לשליחה כפולה, או שבו
הזמנה מסומנת כמתקבלת בלי שנוצר Membership אמיתי.

2.3 Trigger הוא כלל שרץ בתוך ה־Database לפני כתיבה. גם אם בעתיד יהיה Bug
בקוד השרת, ה־Database עדיין חוסם מעבר מצב או מחיקה שאינם חוקיים.

## 3. ארבע הטבלאות

3.1 `team_invitations` היא מקור האמת למצב הנוכחי: Tenant, אימייל מנורמל,
Role, ‏Status, ‏Version, מזמין, Actor אחרון, מועד בקשה ותפוגה.

3.2 `team_invitation_events` הוא Ledger בלתי־ניתן לשינוי. הוא מקשר מפתח
פעולה דטרמיניסטי אל מצב קודם, מצב חדש ומעבר Version מדויק.

3.3 `team_invitation_deliveries` הוא Outbox ledger. לכל Version של הזמנה
מותרת רשומת מסירה אחת, עם מעברים מוגדרים בין `pending`, ‏`sending`,
`submitted`, ‏`ambiguous`, ‏`blocked` ו־`cancelled`.

3.4 `team_invitation_acceptances` הוא Ledger בלתי־ניתן לשינוי שקושר הזמנה
אל Membership פעיל שנוצר בפועל. הוא אינו משנה את סטטוס ההזמנה לטקסט
`accepted`; הקבלה נגזרת מה־Acceptance record.

## 4. כללי בטיחות שנאכפים ב־Database

4.1 המפתחות חייבים לעמוד בפורמט גרסאי ודטרמיניסטי מבוסס SHA-256.

4.2 אימייל נשמר רק במצב מנורמל, ‏Role מוגבל ל־`manager`, ‏`agent` או
`viewer`, וזמנים נשמרים כ־`TIMESTAMPTZ` בדיוק של מילישניות.

4.3 שינוי מצב הזמנה מחייב Version שעולה בדיוק באחד. זהות ההזמנה, Tenant,
האימייל המקורי, המזמין ומועד הבקשה אינם ניתנים לשינוי.

4.4 Event חדש חייב להתאים למצב שכבר נשמר ב־Invitation. ‏Update או Delete
של Event נחסמים.

4.5 הזמנה אינה יכולה להשתנות בזמן Delivery במצב `sending`, ‏`submitted`
או `ambiguous`. מעבר מ־`ambiguous` אל `submitted` או `blocked` נשמר כמסלול
Reconciliation מפורש.

4.6 Acceptance מותרת רק כאשר קיימים יחד Invitation תואמת ו־Membership פעיל
חדש באותו Tenant, ‏User, ‏Role וזמן. לאחר Acceptance, גם ה־Acceptance וגם
ה־Invitation נעשים בלתי־ניתנים לשינוי.

4.7 Expiration אוטומטי מותר רק ל־Actor המערכתי הקבוע
`team-invitation-expiration-scheduler-v1` ורק לאחר מועד התפוגה.

## 5. מה נבדק

5.1 בדיקת Inventory מאמתת סדר מדויק של חמש Migrations ו־12 טבלאות
Critical path.

5.2 בדיקות חוזה מאמתות את סדר ארבע טבלאות ההזמנה, Unique constraints,
Trigger של State/Version, ‏Reconciliation, ‏Acceptance immutable ו־System
expiration actor.

5.3 כל חמש ה־Migrations הוחלו עם `ON_ERROR_STOP` על Database זמני ומבודד
ב־PostgreSQL 16.13. PostgreSQL יצר את כל 12 הטבלאות, כולל ארבע טבלאות
ההזמנה, וקיבל את כל Functions ו־Triggers ללא שגיאת Syntax או Dependency.

5.4 סביבת הבדיקה נמחקה לאחר הבדיקה ולא הכילה Seed או נתוני מוצר מדומים.

5.5 שבע בדיקות Repository מכסות יצירה, Replay, ‏Revoke, ‏Re-request,
Expiration מערכתי, ‏Conflict, ‏Acceptance, ‏Delivery פעיל, ‏Rollback ו־Keyset
pagination. כל 13 משפטי ה־SQL עברו `PREPARE` על PostgreSQL 16.13 לאחר החלת
ה־Schema.

## 6. מה עדיין חסר

6.1 Repository עבור Delivery claim, ‏Submit, ‏Ambiguous reconciliation,
Block ו־Cancel.

6.2 Repository אטומי עבור Acceptance ויצירת Membership.

6.3 Node driver וכלי Migration מאושרים, חיבור Runtime ו־API operations.

6.4 בדיקות Integration של DML מול PostgreSQL אמיתי עם תרחישי הצלחה וכשל, ושתי
Transactions מקבילות עבור אותו אימייל, Operation key ו־Delivery claim.

6.5 Staging migration evidence, ‏Backup/Restore rehearsal ו־Load test.

## 7. תנאי קבלה לשלב הבא

7.1 כל Repository משתמש ב־Parameters בלבד ונכשל סגור על Row shape,
Tenant או Version שאינם תואמים.

7.2 שינוי Business state וכתיבת Event מתבצעים באותה Transaction.

7.3 Retry זהה מחזיר Replay ואינו יוצר Event, ‏Delivery או Membership נוסף.

7.4 תרחיש מקביל מוכיח ש־Unique constraints, ‏Row locks ו־Triggers מונעים
כפילות גם מול PostgreSQL אמיתי.

## 8. מקורות PostgreSQL רשמיים

8.1 [Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
מגדיר Primary key, ‏Unique, ‏Check ו־Foreign key. בדיקות שדורשות קריאת
טבלה אחרת אינן ממומשות כ־`CHECK`; הן נאכפות באמצעות Triggers.

8.2 [CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html)
מגדיר Row-level ‏`BEFORE` triggers ואת המשתנים `OLD`, ‏`NEW` ו־`TG_OP`.

8.3 [Trigger behavior](https://www.postgresql.org/docs/current/trigger-definition.html)
מגדיר את סדר הפעלת ה־Triggers ואת התנהגותם כחלק מאותה Transaction.

8.4 [Date/time types](https://www.postgresql.org/docs/current/datatype-datetime.html)
מגדיר `timestamp with time zone`, הנשמר פנימית ב־UTC.
