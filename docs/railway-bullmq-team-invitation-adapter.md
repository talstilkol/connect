# Railway BullMQ — תור הזמנות צוות

## 1. מצב

1.1 ‏Adapter מקומי ל־Railway Redis + BullMQ הושלם עבור
`team-invitation-v1`.

1.2 ה־Publisher מחובר ל־Railway API וה־Consumer מחובר ל־PostgreSQL
delivery repository ול־Domain processor הקיים.

1.3 זה עדיין **אינו אישור Production או Staging**. Adapter Clerk נבחר
וממומש מקומית אך טרם הוגדר והוכח מול חשבון חי; חסרים גם Retention מאושר, Telemetry חי, Redis
durability, ‏Load/Outage evidence וראיית Railway חתומה מהגרסה הנוכחית.

1.4 קבצי מקור האמת הם:

1.4.1 `server/platform/railwayBullMqTeamInvitationQueue.ts` — Publisher,
Worker, ‏Retry, ‏DLQ, תחזוקה ו־Lifecycle.

1.4.2 `server/team/teamInvitationDispatchProcessor.ts` — Claim אטומי,
קריאת ספק ותיעוד תוצאה Submitted, ‏Blocked או Ambiguous.

1.4.3 `server/platform/railwayBullMqPostgresApiRuntime.ts` — בעלות ה־API
על ה־Publisher והוכחת Redis readiness לפני פתיחת HTTP.

1.4.4 `server/platform/railwayPostgresWorkerService.ts` — יצירת ה־Consumer
ממאגר PostgreSQL וחיבורו לתהליך Worker המאוחד.

1.4.5 `shared/domain/queueAdapterAcceptance.ts` — חוזה הקבלה המשותף
לארבעת התורים.

1.4.6 `server/platform/clerkRailwayTeamInvitationProvider.ts` — Adapter
Clerk, ‏Reconciliation ו־Factory שמתחבר לאותו PostgreSQL foundation.

## 2. הזרימה והלוגיקה

2.1 בקשת הזמנה חוקית נכתבת תחילה ל־PostgreSQL כ־Delivery durable עם
`deliveryKey` דטרמיניסטי. רק לאחר ה־Commit ה־API מפרסם את `tenantId` ואת
המפתח לתור.

2.2 אותו `deliveryKey` משמש `jobId` של BullMQ. פרסום חוזר של אותה בקשה
אינו יוצר Job מקביל בזמן Retention. PostgreSQL נשאר מקור ה־Idempotency
הסמכותי גם לאחר שה־Job נמחק מ־Redis.

2.3 ה־Worker בודק שהספק מוגדר **לפני** Claim. אם אינו מוגדר, העבודה חוזרת
לתור לאחר 60 שניות, בלי לשנות את מצב ה־Delivery ובלי לנסות לשלוח.

2.4 לאחר Claim אטומי, קריאת הספק מתבצעת פעם אחת. תוצאה חיצונית לא ידועה
נשמרת `ambiguous` ומקבלת Ack; היא אינה נשלחת שוב אוטומטית. זה מונע הזמנה
כפולה כאשר הספק אולי קיבל את הבקשה אך התשובה אבדה.

2.5 תוצאה `submitted` או `already-pending` נשמרת Submitted. ספק שמחזיר
`unavailable` נשמר Blocked. כשל Storage לפני החלטה בטוחה מקבל Retry לאחר
30 שניות.

## 3. Retry ו־DLQ

3.1 המדיניות היא ניסיון ראשון ועוד עד 10 Retries. ה־Delay הוא 60 שניות
כאשר הספק אינו מוגדר ו־30 שניות בכשל Storage/Processor. שגיאת Clerk ‏429
תקינה יכולה להחזיר Delay מדויק של 1–86,400 שניות, אך רק לאחר שמירת Deferral
עמיד במסד.

3.2 ה־Custom backoff מקבל מספר שלם בטווח 1–86,400 שניות ואינו משתמש
ב־Jitter או במקור אקראי. מסלולי הכשל המקומיים ממשיכים להשתמש רק ב־30 או
60 שניות; Delay דינמי מגיע אך ורק מ־`retryAfter` תקין של Clerk.

3.3 ‏`ack()` ו־`retry()` מבודדים לכל Delivery. החלטה כפולה או Delay שאינו
מספר שלם בתחום החוזה נדחים.

3.4 מעטפת פגומה עוברת ל־`team-invitation-dlq-v1` בלי להגיע ל־Domain.
אחרי מיצוי 11 ניסיונות, העבודה עוברת ל־DLQ עם Reason code תחום.

3.5 אם כתיבת ה־DLQ נכשלת, Job המקור נשאר Failed. אין Ack שקט ואין אובדן
עבודה בעקבות כשל משני.

## 4. Lifecycle ותחזוקה

4.1 ה־API מחזיק Producer בלבד עם `maxRetriesPerRequest: 1` ו־
`enableOfflineQueue: false`. הוא אינו מאשר בקשה שלא נכתבה ל־Redis.

4.2 ה־Worker מחזיק Consumer ו־DLQ. כל ארבעת התורים משלימים Readiness לפני
שה־Scheduler מתחיל.

4.3 ניקוי ארבעת ה־DLQ רץ תחת אותו Fenced lease ובגבולות Retention ו־Batch
מפורשים.

4.4 בכיבוי, ה־Scheduler מפסיק עבודה חדשה, משאבי Redis נסגרים ורק אחריהם
PostgreSQL. Startup חלקי מנסה לסגור כל משאב שכבר נוצר.

## 5. בדיקות שהושלמו

5.1 בדיקות יחידה מכסות Job ID דטרמיניסטי, Publish כפול, Ack, ‏Retry של
30/60 שניות ו־Delay דינמי תחום, Poison, ‏Retry exhaustion, כשל DLQ, ניקוי
תחום, Lifecycle וכשל Redis ללא דליפת פרטים.

5.2 בדיקות Composition מוכיחות שה־API מעלה את שני ה־Publishers לפני HTTP,
שה־Worker יוצר את ה־Processor ממאגר PostgreSQL, ושספק לא מוגדר גורם ל־Retry
לפני Claim.

5.3 בדיקת Redis 8.6.1 אמיתית הוכיחה Delivery יחיד בין Publisher ו־Worker
נפרדים ו־Duplicate suppression לאחר פרסום חוזר של אותו מפתח.

5.4 להרצה מקומית מול Redis זמני או Secret store:

```bash
CONNECT_BULLMQ_INTEGRATION_REDIS_URL=redis://127.0.0.1:6380/0 \
  npm run test:bullmq-integration
```

אין לשמור URL, סיסמה או Payload ב־Artifact או ב־Git.

## 6. מה חסר לפני Ready

6.1 ‏Start command תפעולי הושלם מקומית ומרכיב את Clerk Provider factory
עם Identity ו־Rate limit ללא ערכי ברירת מחדל. לפני Ready יש להזין ערכים
מאושרים ב־Railway ולהוכיח שהפקודה נכשלת סגור גם בסביבת Staging.

6.2 להוכיח Live invitation, ‏Idempotency/lookup ו־Ambiguous recovery מול
חשבון Clerk/Identity מורשה, בלי כתובת אישית ב־Artifact.

6.2.1 **הושלם מקומית:** ‏Clerk ‏429 עם `retryAfter` שלם וחי נשמר כ־Deferral
עמיד ומפעיל Backoff זהה. ערך חסר או לא־תקין אינו מקבל ברירת מחדל. **עדיין
חסר:** Telemetry מספק Production ותרחיש Staging חי שמוכיח שאין הזמנה
כפולה.

6.2.2 ‏Migration `0029_team_invitation_delivery_deferrals.sql` מממשת את
הסדר הנדרש: רשומת Deferral תואמת נכתבת לפני המעבר האטומי
`sending → pending`; רק לאחר Commit מוצלח מופעל אותו Delay ב־BullMQ.
Replay מוקדם אינו פונה לספק, ו־Claim חדש מותר רק לאחר `retryAfterAt`.
Trigger מסדי דוחה ניסיון להחזיר Delivery ישירות ל־`pending` ללא Evidence.

6.3 לאשר Retention, ‏DLQ owner, ‏Replay policy, ‏Alerts ו־Kill switch.

6.4 להוכיח `noeviction`, ‏Persistence/Backup, ‏Memory alerts ו־Outage
recovery ב־Railway Redis.

6.5 להריץ Duplicate, ‏Ack isolation, ‏Poison, ‏Retry exhaustion, ‏Load
ו־Shutdown tests ב־Railway Staging.

6.6 להפיק Evidence חתום וקצר־תוקף מה־Commit הנוכחי. בדיקת Redis מקומית
אינה מחליפה ראיית Staging.
