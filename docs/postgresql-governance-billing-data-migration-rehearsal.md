# PostgreSQL Governance & Billing Data Migration Rehearsal

תאריך אימות: 2026-08-20

## 1. תוצאה

1.1 ‏Slice 9 עבר חזרה נקייה מול SQLite/D1 ומול PostgreSQL 16 אמיתי:

```text
PASS (36 D1 migrations, 24 PostgreSQL migrations, 5 tables, 7 rows,
replay rejected, audit lineage verified, governance payload private,
9 parity scenarios)
```

1.2 חמש הטבלאות הן `tenant_subscriptions`,
`tenant_subscription_events`, ‏`production_decision_records`,
`production_decision_events` ו־`business_profile_admin_events`. יחד עם
שמונת ה־Slices הקודמים הוכחו כעת 43 מתוך 51 טבלאות.

## 2. מה החוזה מגן עליו

2.1 כל Subscription חייב Status, חלון זמן, Cancellation state ו־Version
עקביים. מספר האירועים חייב להיות זהה לגרסת המנוי, וכל Event חייב להמשיך את
ה־Status ואת `ends_at` של האירוע הקודם.

2.2 כל Subscription Event מקבל מחדש את המפתח הדטרמיניסטי שלו. האירוע
האחרון חייב להתאים ל־Subscription ול־Tenant status, ולכל Event חייב להיות
Audit מקורי עם Action, ‏Actor, ‏Target ו־Idempotency key מדויקים.

2.3 כל Production Decision חייב להיות רשום ב־
`PRODUCTION_DECISION_REGISTRY`. מספר האירועים חייב להיות זהה לגרסת ההחלטה,
והאירוע האחרון חייב להתאים ל־Selection, ‏Rationale, ‏Actor וזמן ההחלטה.

2.4 כל Admin event דורש שני digests תקינים ושונים, Changed-fields קנוני
ומפתח דטרמיניסטי. כאשר האירוע מתייחס לגרסת הפרופיל הנוכחית, ה־Migration
מחשב מחדש את Digest הפרופיל ומוכיח התאמה בפועל.

2.5 Triggers בעלי תופעות לוואי מושבתים רק בתוך Transaction ההעברה עבור
שלוש טבלאות. כך לא נוצרים Audit או Decision Events כפולים. הם מופעלים מחדש
לפני אימות ה־Ledger ולפני Commit.

## 3. פרטיות וראיות

3.1 ה־Plan payload הוא Artifact רגיש ואסור לשמור אותו ב־Git, ב־Logs או
במערכת Tickets.

3.2 ‏Manifest ו־Evidence ציבוריים מכילים רק Table name, ‏Count ו־HMAC
digests. הם אינם מכילים:

1. Selection או Rationale של החלטה.
2. External user ID של Actor.
3. שם עסק, אזור זמן או שפת ממשק.
4. תאריך סיום מנוי או סטטוס מנוי.
5. Event keys או Profile digests.

## 4. Semantic parity שנבדק

4.1 תשעת התרחישים הורצו בשני המנועים והשוו Accepted/Rejected ומצב סופי:

1. הארכת Subscription.
2. שינוי Subscription ל־Suspended וסנכרון Tenant.
3. חסימת Subscription Event באותה גרסה.
4. עדכון Production Decision.
5. חסימת קפיצת גרסה של Decision record.
6. עדכון Business profile עם Admin event.
7. חסימת Subscription Event בעל State סותר.
8. חסימת Decision event כפול.
9. חסימת שינוי Admin event בלתי־משתנה.

4.2 לאחר התרחישים נקראו חמש הטבלאות מחדש והושוו Row-for-row. ‏`created_at`
של Decision event חדש הושמט רק מהשוואת Semantic state, משום ששני ה־Triggers
מייצרים אותו משעון המסד; ה־Migration הראשוני עדיין השווה אותו במלואו.

## 5. פערי Hardening שהתגלו

5.1 ‏D1 הישן מאפשר `INSERT` ישיר של Subscription Event עם קפיצת Version.
ה־Repository העסקי מונע זאת, וה־Migration verifier דוחה Ledger לא רציף לפני
Commit. אין לטעון ש־D1 עצמו אוכף רציפות Event מלאה.

5.2 ‏D1 הישן אינו כולל Update/Delete guards עבור Subscription Events או
Production Decision Events. ה־Repositories אינם מציעים פעולות כאלה,
ו־PostgreSQL כן חוסם אותן. לפני Cutover מומלץ להוסיף Hardening migration
נפרד ל־D1 אם הוא ימשיך לקבל כתיבות במקביל.

5.3 הפערים אינם פותחים את Cutover: יעד PostgreSQL חוסם Mutation, וכל Export
חי יעבור שוב את בדיקות הרצף, המפתחות וה־Audit של חוזה ההעברה.

## 6. הפעלה מקומית בטוחה

6.1 יש ליצור PostgreSQL מקומי, ריק וללא Password בשם:

```text
connect_governance_billing_data_migration_rehearsal
```

6.2 הפקודה מקבלת רק Host מסוג loopback, ‏Port מפורש, שם המסד הקבוע וללא
Query string:

```bash
CONNECT_POSTGRES_GOVERNANCE_BILLING_DATA_MIGRATION_REHEARSAL_URL="postgresql://<local-user>@127.0.0.1:<local-port>/connect_governance_billing_data_migration_rehearsal" \
  npm run verify:postgres-governance-billing-data-migration
```

6.3 הסקריפט מסרב למסד יעד שאינו ריק. בסיום החזרה יש לעצור את השרת הזמני
ולמחוק את תיקייתו.

## 7. מה עדיין חסר

7.1 ‏Rehearsal מקומי אינו Cutover. לפני Production עדיין נדרשים Export חי,
Staging, ‏Load/Recovery rehearsal, ערכי Railway חיים וחלון Cutover מאושר.

7.2 ה־Slice האחרון הוא `whatsapp-delivery-policy`, ובו שמונה טבלאות.
אסור לסמן אותו `rehearsed` לפני חזרה אמיתית ו־Semantic parity משלו.
