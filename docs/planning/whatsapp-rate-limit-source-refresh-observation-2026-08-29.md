# 1. Connect — WhatsApp rate-limit source refresh observation

## 1.1 זהות וגבול

1.1.1 `artifactId=CONNECT-WHATSAPP-RATE-LIMIT-SOURCE-REFRESH-OBSERVATION-2026-08-29-R1`.

1.1.2 `observationClass=READ-ONLY-OFFICIAL-SOURCE-REFRESH-ATTEMPT; NOT-PROVIDER-EVIDENCE; NOT-POLICY-APPROVAL`.

1.1.3 owner=`Tal — WhatsApp/Connect rate-limit research owner`.

1.1.4 baseline subject=`/Users/tal/Documents/connect/web/docs/whatsapp-rate-limits.md`; SHA-256=`70349a4868d3c6a9a5bc309c32a5df7317ec4e23850ca6ba6fbea55c088f2e1a`; physical identity=`734 lines/45960 bytes`; baseline checked date=`2026-08-24`.

1.1.5 מסמך זה אינו משנה את Baseline, אינו מאשר מספר ספק, אינו מפעיל Rate limiter ואינו מתחבר לחשבון Meta.

## 1.2 ניסיון הרענון

1.2.1 checkedAt=`2026-08-29 Asia/Jerusalem`.

1.2.2 נשלחו בקשות Read-only ישירות לארבעת מקורות Meta הרשמיים: Throughput, Messaging limits, Platform rate limits ו־Per-user marketing limits.

1.2.3 כל ארבע הבקשות החזירו `HTTP 429 Too Many Requests` דרך מנגנון הגלישה; captured authoritative page bytes=`0/4`.

1.2.4 חיפוש Web מוגבל ל־Meta official domain החזיר `0` תוצאות; לא הוחלף המקור הרשמי בבלוג, ספק צד שלישי או זיכרון.

1.2.5 לכן result=`REFRESH-BLOCKED-BY-OFFICIAL-SOURCE-RATE-LIMIT`; current-source delta=`unknown/unavailable`.

## 1.3 מצב בטוח

1.3.1 Baseline מ־2026-08-24 נשאר ה־Capture המקומי האחרון, אך אינו Live account evidence ואינו Production Permit.

1.3.2 אין להסיק מכשל הרענון שהערכים `20/80/1000`, ‏Pair rate, Messaging tiers, Template limits או Marketing rules לא השתנו.

1.3.3 Portfolio, WABA, Phone, Template, Quality, Messaging limit ו־active throughput חיים נשארים `unknown/unavailable` עד קריאת API/WhatsApp Manager מורשית.

1.3.4 Connect ממשיך להיכשל סגור: `effective outbound permit=0` כאשר Snapshot נדרש חסר, פג או לא־תואם.

1.3.5 אין להכניס מספר חדש לקוד, למסד או ל־Policy approved עד Source capture רשמי עדכני + Tal factual sign-off + live scope evidence כאשר נדרש.

## 1.4 Retry and evidence requirement

1.4.1 Retry אינו אוטומטי ואינו נעשה בעומס; ExternalWait דורש Owner=Tal, מקור רשמי, next-attempt policy ו־Evidence locator.

1.4.2 המקורות שיש לרענן הם:

1.4.2.1 [Meta — Throughput](https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput).

1.4.2.2 [Meta — Messaging limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits).

1.4.2.3 [Meta — Platform rate limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform#rate-limits).

1.4.2.4 [Meta — Per-user marketing limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits).

1.4.3 Capture תקף יכלול final URL, retrievedAt, page/PDF bytes או reproducible API response, digest, Graph/API version אם רלוונטי, claim locator, account scope, expiry ו־supersession edge.

1.4.4 עד Capture תקף: source-refresh status=`BLOCKED-EXTERNAL-WAIT`; אין שינוי בהחלטה `live-derived-layered` ואין טענת Provider readiness.
