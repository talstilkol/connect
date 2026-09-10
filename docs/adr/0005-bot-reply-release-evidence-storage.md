---
id: ADR-0005
title: Bot-reply Release Evidence Storage
status: proposed
decision_owner: architecture-owner-unassigned
approved_option: unknown/unavailable
approved_at: unknown/unavailable
supersedes: none
---

# ADR 0005 — Bot-reply Release Evidence Storage

## 1. סטטוס

1.1 `proposed` בתאריך 2026-08-24.

1.2 ההמלצה מוכנה בקוד ובתיעוד, אך דורשת אישור פורמלי של בעל ההחלטה
לפני הפעלה בחשבון Railway חי.

## 2. החלטה

2.1 האפשרות המומלצת למקור האמת עבור Bot-reply Cross-service Release
Evidence היא רשומת
PostgreSQL גרסתית בתוך אותה Railway Environment.

2.2 הפרסום יתבצע באמצעות Transaction ו־Compare-and-set על Release ID,
Commit SHA, ‏Artifact digest, גרסה ו־Evidence digest קודם.

2.3 Railway Variables לא ישמשו לשמירת ה־Evidence. ה־Environment יכיל רק
`BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE=postgresql` ואת תצורת החיבור
השרתית הקיימת ל־PostgreSQL.

## 3. לוגיקה

3.1 ה־Evidence תקף 60–900 שניות. Railway מתעדת ששינוי Variables יוצר
Staged changes שיש לפרוס כדי להחילם. לכן Variable אינו Runtime store
מתאים לראיה קצרת־חיים.

3.2 Railway Public API מתעד `variableUpsert` ו־
`variableCollectionUpsert`, אך אינו מתעד תנאי Version/Digest שמספק
Compare-and-set. עטיפת Read ולאחריו Upsert לא הייתה אטומית.

3.3 PostgreSQL מספק `UPDATE ... WHERE ... RETURNING`; תנאי הגרסה וה־Digest
נבדקים באותה פעולת Update, ומספר שורות אפס הוא Conflict. השירותים יכולים
לגשת למסד דרך Railway private networking ללא חשיפת המסד לציבור.

## 4. זרימה

```text
Issuer
  → PostgreSQL CAS על release/version/digest
    → RETURNING version
      → Read-after-write
        → Evidence verifier
          → Runtime readiness
```

## 5. השלכות

5.1 נדרשת Migration חדשה ורשומת State אחת לכל Environment/Release scope.

5.2 נדרש Repository המשמש את ה־Publisher ואת Runtime readiness.

5.3 Redis אינו מקור אמת. Railway Variables אינם נכתבים בכל הנפקה.

5.4 Rollback של Deployment אינו מחזיר אוטומטית Evidence ישן; ה־Verifier
ימשיך לדרוש התאמה ל־Release הנוכחי ותפוגה תקפה.

5.5 מימוש מקומי נכון ל־2026-08-25: Migration ‏0040 יוצר שורה נפרדת לכל
Release, ‏Migration ‏0043 מוסיף Audit בלתי־משתנה, ו־Migration ‏0044
מגדיר פעולת `SECURITY DEFINER` אטומית שמפרסמת Evidence ו־Audit יחד.

5.6 הפעולה האטומית נשארת חסומה ל־`PUBLIC`. לפני הפעלה חיה נדרשים Role
נפרד למיגרציות, Runtime role מצומצם ונתיב אתחול שאינו דורש `INSERT` ישיר
מה־Runtime. עד אז אין להעניק `EXECUTE`, אין לפתוח Direct DML, ואין לתאר
את ה־Adapter כ־Production-ready.

## 6. מקורות רשמיים

6.1 [Railway — Using Variables](https://docs.railway.com/variables).

6.2 [Railway — Manage Variables with the Public API](https://docs.railway.com/integrations/api/manage-variables).

6.3 [Railway — PostgreSQL](https://docs.railway.com/databases/postgresql).

6.4 [Railway — Private Networking](https://docs.railway.com/networking/private-networking/how-it-works).

6.5 [PostgreSQL — UPDATE](https://www.postgresql.org/docs/current/sql-update.html).
