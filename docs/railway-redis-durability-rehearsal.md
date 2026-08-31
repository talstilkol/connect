# Railway Redis durability and outage rehearsal

## 1. מטרה

1.1 המסמך מגדיר את Baseline העמידות של Redis/BullMQ לפני חיבור ארבעת
התורים של Connect ל־Railway Staging.

1.2 ‏Redis מחזיק את מנגנון המסירה בלבד. PostgreSQL נשאר מקור האמת העסקי,
אך אובדן מפתחות BullMQ עלול לעכב עבודה או למחוק Retry מתוזמן ולכן נדרשת
ראיה נפרדת לעמידות Redis.

1.3 התוצאה המקומית אינה ראיית Railway, אינה מאשרת Plan או Volume ואינה
מתירה Production cutover.

## 2. Policy מקומי

2.1 ‏AOF חייב להיות פעיל: `appendonly yes`.

2.2 ‏`appendfsync everysec` הוא Baseline ה־Pilot. לפי Redis זהו האיזון
המומלץ בין ביצועים לעמידות, עם סיכון מוגבל לאובדן של פרק זמן קצר באירוע
קריסה. שינוי ל־`always` מחייב Load test חדש בגלל עלות ה־I/O.

2.3 ‏`maxmemory-policy` חייב להיות `noeviction`. לפי BullMQ, Eviction
אוטומטי של מפתחות עלול לגרום לשגיאות בלתי צפויות בתור.

2.4 ‏Publisher חייב להיכשל מהר בזמן השבתה. אין Offline queue מקומי שמאשר
בקשה לפני שהעבודה נכתבה ל־Redis.

## 3. חוזה הראיה

3.1 מקור האמת ה־Machine-readable נמצא ב־
`shared/domain/redisDurabilityAcceptance.ts`.

3.2 ראיית Staging חייבת להיות קשורה ל־Commit ול־Artifact digest, להיות
תקפה עד 24 שעות ולכלול:

3.2.1 ‏AOF פעיל, ‏`everysec`, ‏`noeviction` וסטטוסי כתיבה ושכתוב תקינים.

3.2.2 ‏Crash/Restart שבו עבודה שנכתבה לפני ההשבתה חוזרת לעיבוד.

3.2.3 כשל Publisher תחום בזמן ההשבתה.

3.2.4 בדיקת עומס של לפחות 500 עבודות, עם מספר Completed זהה ואפס Failed.

3.3 החוזה דוחה שדות נוספים ולכן אינו שומר Redis URL, ‏Resource name,
Account, ‏Credential, ‏Payload או Tenant.

## 4. התרגיל המקומי

4.1 הפקודה:

```bash
npm run rehearse:redis-resilience:local
```

4.2 הפקודה מקימה Redis זמני ומבודד על Loopback, מפרסמת Job דטרמיניסטי,
ממתינה ל־AOF, מפילה רק את התהליך שהיא יצרה באמצעות `SIGKILL`, מוכיחה
שה־Publisher נכשל בזמן ההשבתה, מפעילה מחדש את אותו Data directory ומעבדת
את העבודה ששוחזרה.

4.3 לאחר השחזור הפקודה מעבדת 500 עבודות BullMQ דטרמיניסטיות ומאמתת 500
Completed, אפס Failed ואפס עבודות Waiting, ‏Active או Delayed.

4.4 אין שימוש ב־`Math.random()`, ‏Jitter, ‏Secret או נתוני משתמש. התהליך
והתיקייה הזמניים נסגרים ונמחקים גם במקרה של כשל.

4.5 ב־21.08.2026 התרגיל עבר מול Redis ‏8.6.1:

`Redis resilience rehearsal: PASS (Redis 8.6.1, 500/500 jobs, 49ms, AOF everysec, noeviction)`.

ה־49ms הם תוצאת המכונה המקומית בלבד ואינם יעד ביצועים או התחייבות
ל־Staging.

## 5. מה עדיין חסר

5.1 לאשר ב־Railway את Plan, ‏Region, ‏Volume/Persistence, ‏Retention,
Memory limit ו־Cost cap.

5.2 להריץ את אותו חוזה ב־Railway Staging, כולל Restart/Failover מורשה,
Backlog אמיתי, ארבעת התורים וראיה חתומה מה־Release הנוכחי.

5.3 לחבר Monitoring חי עבור Connection failures, ‏Backlog depth,
Oldest job age, ‏Retry rate, ‏DLQ depth, Memory pressure ו־AOF errors.

## 6. מקורות רשמיים

6.1 [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/).

6.2 [Redis latency and AOF trade-offs](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/).

6.3 [BullMQ connections and `noeviction`](https://docs.bullmq.io/guide/connections).
