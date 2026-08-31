# Railway BullMQ — תור מסירת קמפיינים

## 1. מצב

1.1 ‏Adapter מקומי ל־Railway Redis + BullMQ הושלם עבור
`campaign-delivery-v1`.

1.2 הוא מחובר ל־Campaign consumer, ל־WhatsApp rate-limit ledger ולמאגרי
PostgreSQL. מקור Retry מקומי ומוגבל קורא את תגובת Meta ואת מונה הניסיונות
העמיד, אך הוא עדיין **אינו ראיית Production או Staging**: חסרים אימות מול
חשבון Meta חי, תצורת Redis חיה, Telemetry provider, ‏Load evidence ו־Evidence
חתום מהגרסה הנוכחית.

1.3 קבצי מקור האמת הם:

1.3.1 `server/platform/railwayBullMqCampaignDeliveryQueue.ts` — Publisher,
Worker, ‏Retry דינמי, DLQ, תחזוקה ו־Lifecycle.

1.3.2 `server/platform/railwayCampaignDeliveryConsumerRuntime.ts` — חיבור
Meta, ‏Credential vault, ‏Rate limits ו־PostgreSQL consumer.

1.3.3 `server/platform/railwayBullMqWorkerExecutable.ts` — תהליך יחיד שמחזיק
את ארבעת תורי BullMQ.

1.3.4 `server/platform/railwayPostgresWorkerService.ts` — יצירת ה־Consumers,
Startup לפני Scheduler, ניקוי DLQ וכיבוי לפני PostgreSQL.

1.3.5 `shared/domain/queueAdapterAcceptance.ts` — חוזה הקבלה המשותף לארבעת
התורים.

1.3.6
`server/campaigns/providerResponseMetaCampaignDeliveryRetryEvidenceSource.ts`
— מיפוי תחום של קודי Meta ‏130429, ‏131049 ו־131056 ללא המצאת
`Retry-After`.

1.3.7 `server/platform/railwayBullMqWorkerMain.ts` ו־
`scripts/start-railway-bullmq-worker.mjs` — Composition ופקודת ההפעלה
ה־fail-closed לכל ארבעת התורים.

## 2. זרימת המסירה

2.1 ה־Scheduler טוען עד 50 נמענים מ־PostgreSQL, אך מפרסם אותם בקבוצות של
עד 10 — הגבול המשותף של חוזה התורים.

2.2 כל הודעה מכילה רק `version` ו־`deliveryKey` אטום. אותו `deliveryKey`
משמש גם כ־BullMQ `jobId` דטרמיניסטי.

2.3 אם פרסום קבוצה מאוחרת נכשל, רק הנמענים שטרם פורסמו חוזרים ל־Pending.
נמענים שכבר נכנסו לתור נשארים Queued, כדי לא ליצור שליחה כפולה.

2.4 לפני פנייה ל־Meta, ה־Consumer טוען Policy חי ומאושר, גוזר מפתחות HMAC
אטומים ושומר Reservation אטומי ב־PostgreSQL. בלי Policy או מקור Retry פעיל,
המסירה נדחית ונכשלת סגור.

2.5 תוצאת Meta מפורשת מסווגת כ־Accepted, ‏Rejected או Deferred. ‏Deferred
מקבל Delay מדויק שה־Domain אישר, בין שנייה אחת ל־24 שעות.

2.6 תוצאה חיצונית לא ודאית מסומנת `ambiguous` ב־PostgreSQL ומקבלת Ack
בתור. היא **אינה** נשלחת שוב אוטומטית; Webhook או Reconciliation חייבים
להכריע אותה.

## 3. Retry ו־DLQ

3.1 המדיניות היא עד 10 Retries אחרי הניסיון הראשון — 11 ניסיונות Delivery
לכל היותר.

3.2 BullMQ משתמש ב־Custom backoff תחום. ה־Delay מגיע רק מ־`retry()` של
ה־Domain consumer; אין Jitter ואין מקור אקראיות.

3.3 כשל Consumer לפני החלטה משתמש ב־Fallback תחום של 30 שניות. Delay קטן
משנייה, גדול מ־24 שעות או שאינו מספר שלם נדחה.

3.4 Envelope פגום עובר ישירות ל־`campaign-delivery-dlq-v1` ולא מגיע
ל־Domain consumer.

3.5 לאחר מיצוי הניסיונות, גוף ההודעה המקורי עובר ל־DLQ עם Reason code תחום.
אם כתיבת ה־DLQ נכשלת, Job המקור נכשל ונשמר ב־Failed set במקום להיעלם.

3.6 Requeue ידני משתמש בחוזה האישור הקיים של
`campaignDeliveryDeadLetter.ts`: נדרש Recovery key דטרמיניסטי שתואם בדיוק
לגוף ההודעה.

## 4. Lifecycle ותחזוקה

4.1 תהליך Worker יחיד מחזיק את תור הקמפיינים, תור הגשת התבניות, תור Meta
webhook ותור הזמנות הצוות. ארבעת התורים משלימים Readiness לפני שה־Scheduler
מתחיל לעבוד.

4.2 ניקוי ארבעת ה־DLQ רץ תחת אותו Fenced lease של ה־Scheduler. כשל תחזוקה
מונע השלמת Tick ומאפשר Recovery בטוח.

4.3 בכיבוי, ה־Scheduler מפסיק וממתין לריצה פעילה; לאחר מכן BullMQ Workers
נסגרים ורק בסוף נסגר PostgreSQL pool.

4.4 כשל Startup חלקי סוגר כל Queue שכבר נוצר ואת PostgreSQL. שגיאות Redis,
Meta או Storage פרטיות אינן יוצאות מגבול ה־Runtime.

4.5 ערכי Completed, ‏Failed ו־DLQ retention נדרשים במפורש מהסביבה. אין
ברירות מחדל ואין ניקוי לא־תחום.

## 5. בדיקות שהושלמו

5.1 בדיקות יחידה מכסות Batch של 10, Job IDs דטרמיניסטיים, Ack, ‏Delay של
6 שניות, Delay של 24 שעות, Fallback של 30 שניות, Poison, ‏Retry exhaustion,
כשל DLQ, Retention cleanup, Startup/Shutdown וכשלי Provider ללא דליפת מידע.

5.2 בדיקות Scheduler מכסות 25 נמענים כ־`10 + 10 + 5`, וכן כשל בקבוצה
השנייה שמשחרר רק את 15 הנמענים שלא פורסמו בהצלחה.

5.3 בדיקת Redis אמיתית הוכיחה ניסיון ראשון שמבקש Delay של שנייה אחת,
מסירה שנייה לאחר ה־Delay ו־Ack בניסיון השני.

5.4 בדיקות Composition מוכיחות שה־Consumer נוצר ממאגרי PostgreSQL, שארבעת
התורים עולים לפני ה־Scheduler, שתחזוקת DLQ רצה תחת Lease ושכל משאבי Redis
נסגרים לפני PostgreSQL.

5.5 לאחר הזרקת `CONNECT_BULLMQ_INTEGRATION_REDIS_URL` דרך Secret store,
מריצים:

```bash
npm run test:bullmq-integration
```

אין לשמור את ה־URL בקובץ, ב־Git או ב־Artifact.

## 6. מה חסר לפני Ready

6.1 מקור ה־Runtime המקומי הושלם. לפני Ready יש לאמת מול חשבון Meta מורשה
ש־`Retry-After`, קודי 130429/131049/131056 ומונה הניסיונות מגיעים בפורמט
הצפוי; אין להחליף זאת בערך קבוע או ב־Retry מומצא.

6.2 לאשר Retention, ‏DLQ owner, ‏Requeue policy, ‏Kill switch והתראות.

6.3 להוכיח AOF, ‏`maxmemory-policy=noeviction`, גיבוי ו־Memory alerts ב־Redis
של Railway.

6.4 להריץ Conformance, ‏Outage recovery, ‏Payload round-trip, ‏Ack isolation,
עומס וקמפיין Pilot מוגבל ב־Railway Staging.

6.5 להפיק Evidence חתום וקצר־תוקף מה־Commit הנוכחי. בדיקה מקומית אינה
מחליפה ראיית Staging.

6.6 ‏Team invitation adapter ופקודת ה־Worker המלאה הושלמו מקומית. יש
להפעיל `npm run start:railway-worker:bullmq` ב־Staging רק לאחר הזרקת ערכי
Identity, ‏Rate limit, ‏Redis, ‏PostgreSQL, ‏Meta ו־Retention מאושרים.
