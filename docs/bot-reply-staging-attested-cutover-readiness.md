# Bot reply staging — Attested cutover readiness

## 1. מטרה

1.1 מסמך זה מגדיר את Stage 7B: שכבת החלטה טהורה ורדומה בין תוצאת אימות
PostgreSQL של Evidence v2 לבין Cutover עתידי.

1.2 השכבה אינה מפעילה Bot reply staging, אינה משנה Runtime, אינה כותבת למסד
ואינה מעניקה הרשאות.

## 2. זרימת ההחלטה

2.1 הזרימה היחידה המותרת היא:

```text
PostgreSQL read repository
  ├─ unavailable
  │    └─ EVIDENCE_REQUIRED
  │         └─ activationAllowed: false
  └─ verified + replayProtected: true + Evidence v2
       └─ CAPABILITY_ROLES_REQUIRED
            └─ activationAllowed: false
```

2.2 המשמעות למתחילים: Evidence תקף מוכיח שהראיה נחתמה, נקשרה ל־Release
ונרשמה עם Replay protection. הוא עדיין אינו מוכיח של־API, ל־Worker,
ל־Verifier ולכלי המיגרציות יש הרשאות מסד מופרדות ובטוחות.

## 3. חוזה קלט

3.1 ה־Evaluator מקבל רק תוצאה מצומצמת של Read repository:

3.1.1 `verified` דורש מקור `postgresql`,‏ `evidenceSchemaVersion: 2`,‏ Policy
מדויק `connect-railway-bot-reply-staging-attested-release-evidence-v2`,‏ Digest
של Evidence v2, זהות Release מלאה, גרסה חיובית, חלון זמן קנוני של 60–900
שניות ו־`replayProtected: true`.

3.1.2 `unavailable` דורש שכל שדות הראיה יהיו `null` ו־
`replayProtected: false`.

3.2 כל שדה נוסף, Schema או Policy ישנים, מקור Environment,‏ Proxy,‏ Accessor
או מבנה לא מדויק נכשל סגור וממופה ל־`EVIDENCE_REQUIRED`.

3.3 ה־Evaluator אינו מקבל Evidence JSON,‏ Receipt,‏ Attestation,‏ Signature,
Nonce, מפתח או Secret.

3.4 תוצאת `verified` היא Snapshot רגעי ואסור לשמור אותה ב־Cache לצורך החלטת
Activation עתידית. כל ניסיון Cutover עתידי חייב לקרוא מחדש מ־PostgreSQL
ולהעריך מיד באותה פעולת Verifier; ה־Evaluator הנוכחי נשאר חסום בכל מקרה.

## 4. חסימת Activation

4.1 גם תוצאת `verified` אינה פותחת Gate. התוצאה תמיד כוללת:

4.1.1 `status: "blocked"`.

4.1.2 `code: "CAPABILITY_ROLES_REQUIRED"`.

4.1.3 `requiredDecisionId: "D31"`.

4.1.4 `requiredCapabilityRoleCount: 4`.

4.1.5 `activationAllowed: false`.

4.2 אין פרמטר `approved`,‏ Boolean,‏ String או Hook שיכול להפוך את
`activationAllowed` ל־`true`.

## 5. מה הושלם ומה עדיין חסר

5.1 ה־Read repository הנפרד שנוסף בשלב זה מוכיח מתוך Snapshot עקבי של
PostgreSQL:

5.1.1 Evidence v2 קנוני וחתימת Ed25519 מול `trustedKeyId` מוצמד.

5.1.2 התאמה מדויקת ל־Completed run ול־Receipt digest.

5.1.3 התאמה ל־Nonce ledger ול־Operator event, כולל גרסה, Digests וזמנים.

5.1.4 אי־תפוגה לפי זמן PostgreSQL, לא לפי JSON שמגיע מ־Environment.

5.2 מה שעדיין חסר: החלטת D31 חייבת לאשר ולהוכיח ארבע יכולות נפרדות:

5.2.1 Migration owner.

5.2.2 API role ללא גישה ישירה לטבלאות Evidence המוגנות.

5.2.3 Worker role ללא גישה לפרוסת הראיות המוגנת.

5.2.4 Verifier capability role עם `EXECUTE` על Readback function מצומצמת;
ללא `SELECT` ישיר על טבלאות Release,‏ Run/Receipt,‏ Nonce או Operator event.

5.3 רק Slice עתידי ונפרד, לאחר Evidence חי של D31 ואישורים פורמליים, רשאי
להגדיר חוזה Activation חדש. אין להרחיב את ה־Evaluator הרדום ב־Boolean
שמגיע מתצורה.

5.4 ה־SELECT הישיר של ה־Read repository משמש כרגע הוכחת PostgreSQL מקומית
בלבד. אסור לחברו ל־API או ל־Worker לפני מעבר ל־Readback function והוכחת
Grant/Revoke חיה לפי D31.

## 6. גבולות השלב

6.1 לא נוסף Runtime wiring.

6.2 לא נוסף `GRANT`,‏ Role או Migration.

6.3 לא שונה `botReplyDeliveryAdapter`.

6.4 לא נקרא Evidence v1 ולא נקרא `BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON`.
