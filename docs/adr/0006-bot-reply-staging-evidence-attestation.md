---
id: ADR-0006
title: Bot-reply staging evidence cryptographic attestation
status: proposed
decision_owner: Tal — R&D and WhatsApp safety
approved_option: unknown/unavailable
approved_at: unknown/unavailable
supersedes: none
---

# ADR-0006 — Bot-reply staging evidence cryptographic attestation

## 1. הקשר

1.1 ‏Bot-reply staging receipts כוללים ראיות שנגזרות מתצפיות Worker.
המנגנון הקיים יכול לחשב SHA-256 חדש לאחר שינוי המסמך, ולכן Digest ציבורי
מוכיח שלמות מבנית בלבד ואינו מוכיח שה־Railway Worker המורשה הנפיק אותו.

1.2 ‏HMAC קיים מגן על תצפיות בתוך ה־Worker, אך שיתוף אותו Secret עם API
או Builder יאפשר גם להם להנפיק ראיה שנראית כאילו הגיעה מה־Worker.

1.3 ההחלטה חייבת לשמור את Private key מחוץ ל־Vercel, ל־Railway API,
למסד הנתונים, ל־Audit וללוגים.

## 2. האפשרות המומלצת

2.1 להשתמש בחתימת `Ed25519` גולמית דרך `node:crypto`, ללא Dependency
חדשה וללא יצירת Keypair בזמן ריצה.

2.2 ה־Private key יהיה PKCS#8 DER בקידוד Base64URL קנוני ויישמר רק
ב־Vault של Railway Worker. ה־Verifier יקבל SPKI DER ציבורי בקידוד
Base64URL; ה־`keyId` ייגזר מ־SHA-256 של ה־SPKI ויוצמד ל־Release policy.

2.3 החתימה תיקשר במפורש אל:

2.3.1 ‏`runKey`,‏ `claimVersion`,‏ `requestDigest` ו־`auditKey`.

2.3.2 ‏`releaseId`,‏ `commitSha` ו־`artifactDigest`.

2.3.3 ‏`expectedEvidenceVersion`,‏ Digest של ה־Receipt ו־Digest של
ה־sanitized evidence core הסופי.

2.3.4 חלון זמן קצר, גרסת Policy ו־nonce דטרמיניסטי שנגזר מכל הזהויות
לעיל. ‏`nonceSequence` יהיה זהה ל־`claimVersion` ולא ייווצר באקראי.

2.4 החלפת מפתחות תבוצע בסדר Fail-closed: תחילה מפיצים ל־Verifier את
ה־Public key החדש ומצמידים את ה־`keyId` ל־Release policy, לאחר מכן מחליפים
את ה־Signer, ורק אחרי חלוף ה־TTL המרבי והשלמת Runs פתוחים מסירים את המפתח
הישן. במקרה פשרה מבטלים מיד את ה־keyId, סוגרים את Gate ומנפיקים מחדש ראיות
פתוחות; אין לקבל Attestation ישן רק כדי להשלים Cutover.

2.5 ה־Verifier חייב לקבל `trustedKeyId` צפוי ממדיניות ה־Release ולהשוות
אותו ל־`keyId` החתום לפני כל SQL. אסור לבחור את המפתח הצפוי מתוך
ה־Attestation עצמו, גם אם אותו מפתח נמצא ברשימת מפתחות מהימנים כללית.

## 3. Verification ו־Replay

3.1 אימות חתימה חסר־מצב יכול להתבצע בכל שכבה בלי לשנות נתונים, אך יחזיר
רק `signature-valid-only` עם `replayProtected: false`. אסור ל־Publisher,
Readiness או Cutover לפרש תוצאה זו כאישור פרסום.

3.2 צריכת nonce תתבצע פעם אחת רק בגבול PostgreSQL האטומי של השלמת
ה־Run ופרסום ה־Evidence.

3.3 לכל Claim יישמר `attestationPayloadDigest` קנוני של כל ה־unsigned
signed payload, כולל Schema,‏ Policy,‏ Audience,‏ Environment, כל זהויות
ה־Run וכל שלושת הזמנים. גם `consumed` וגם `replayed` חייבים להחזיר את
ה־Digest השמור; כל אי־התאמה תחזיר `conflict` ותחסום פרסום.

3.4 Retry זהה יחזיר `replayed` רק אם ה־nonce, שני ה־digests, גרסת
ה־Evidence, כל זהויות ה־Run ו־`attestationPayloadDigest` זהים לרשומה
השמורה. שינוי זמנים בלבד הוא Payload שונה וחייב להיחסם.

3.5 אין להחזיק Replay state בזיכרון, ב־filesystem של Vercel או ב־Redis.
PostgreSQL הוא מקור האמת העמיד והרב־מופעי.

3.6 ‏Migration 0047 מוסיפה Ledger רדום, בלתי־משתנה וללא Payload. ‏0048
מוסיפה את גבול ההרכבה האטומי ומשווה במפורש את `receiptDigest` החתום אל
`receipt_digest` של ה־Run שהושלם. מסלולי ה־Runner בעץ העבודה המקומי
הועברו לחישוב Canonical זהה, אך הם אינם חלק מסלייס זה; חיבור Runtime נשאר
חסום עד שה־Runner וכל שרשרת התלויות שלו נכנסים ל־Commit נפרד ועוברים Gate
מלא.

## 4. חלופות שנדחו בהמלצה

4.1 ‏SHA-256 ציבורי בלבד — אינו מוכיח זהות מנפיק.

4.2 ‏HMAC משותף — מפר את הפרדת הסמכויות בין Worker ל־Verifier.

4.3 ‏JWT/JWS — אפשרי, אך מוסיף Algorithm surface ומעטפת רחבה יותר
מ־Ed25519 קבוע ומופרד Domain.

4.4 ‏GitHub Artifact Attestation — מתאים ל־Artifacts של CI, אך אינו
מחליף חתימת Worker על תצפית Staging חיה.

## 5. סדר הפעלה מחייב

5.1 ‏Commit A — primitive, Signer, בדיקות ו־ADR רדומים בלבד.

5.2 ‏Commit B — הושלם כ־Primitive רדום: Migration 0047 ללא Grant
ל־`PUBLIC`,‏ Repository
שאינו פותח Transaction עצמאית, בדיקות מבניות והוכחת PostgreSQL חיה.
ה־Ledger מחזיר `consumed`,‏ `replayed` או `conflict`; ‏`PUBLIC` אינו מקבל
גישה לטבלה או לפונקציה ואין Runtime composition.

5.3 ‏Commit C — המעטפת v2,‏ Inspector עם `trustedKeyId` מוצמד,
Repository מאמת, Migration 0048 והוכחת PostgreSQL חיה הושלמו כיכולת
רדומה. אין חיבור Worker/API Runtime ואין Grant. חיבור Worker-only של
ה־Signer נשאר שלב Activation נפרד לאחר D31.

5.4 ה־Wrapper של Commit C שומר חמש נעילות Advisory ממוינות, מאמת Run
שהושלם, מאתחל Release ראשון, צורך nonce ומפרסם Evidence+Audit. הוא אינו
מבצע בדיקת גרסה מוקדמת שחוסמת Retry: ה־nonce consumer וה־publisher
מחזירים יחד רק `consumed + stored` או `replayed + replayed`, וכל צירוף
אחר מבטל את כל הפעולה. הרשאת `EXECUTE`
תינתן רק ל־Capability role של רכיב האימות המבוקר, לא ל־API/Worker role
כללי, ולעולם לא לפונקציית ה־nonce הפנימית. אחרת SQL ישיר יוכל לעקוף את
אימות חתימת Ed25519 שמתבצע ב־TypeScript.

5.5 רק אחרי Commit C, הפרדת Migration/API/Worker/Verifier DB roles, בדיקת
Kill switch ו־Approval פורמלי אפשר לשקול שינוי של
`botReplyDeliveryAdapter` ל־Ready.

5.6 לפני Production יש להוסיף מדיניות Retention ייעודית ל־Ledger. הטבלה
בלתי־משתנה בכוונה, ולכן מחיקת ראיות שפג תוקפן תדרוש פונקציית Maintenance
מוגבלת, Legal Hold ו־Audit — לא הרשאת `DELETE` כללית.

## 6. תנאי קבלה

6.1 שינוי של שדה אחד ב־Receipt, Evidence core, Release או Run נחסם.

6.2 מפתח שגוי, לא פעיל, לא מוצמד, כפול או שאינו Ed25519 נחסם.

6.3 חתימה עתידית, פגה או החורגת מחיי המפתח נחסמת.

6.4 ‏Proxy,‏ Date,‏ Map,‏ sparse array, accessor, שדה Symbol או
non-enumerable, עומק חריג ו־Unicode surrogate לא תקין אינם מקבלים Digest
קנוני. מגבלת ה־48KB נאכפת בזמן הכתיבה הקנונית ולא רק לאחר הקצאה.

6.5 שני Consumers מקבילים מוכיחים `consumed + exact replay`; payload
שונה עם אותו nonce או `attestationPayloadDigest` שונה מוכיח `conflict`
ו־Rollback מלא.

6.6 אין Private key ב־API dependency graph, ב־Evidence, בלוגים או ב־Git.

6.7 הוכחת PostgreSQL המקומית של Commit B החילה 48 מיגרציות ו־90 תרחישי
תחרות. היא הוכיחה שני Consumers מקבילים מסוג `consumed + replayed`, שינוי
זמן מסוג `conflict`, תפוגה בזמן המתנה ל־Advisory lock ללא שורת Ledger,
ותפוגת Replay בזמן המתנה לטבלה שמחזירה `conflict` ומשאירה רק את השורה הקיימת.
חסימת `UPDATE/DELETE`, ‏Rollback ללא nonce שארי ו־PUBLIC privileges כבויים.
ראיה זו אינה מחליפה את Wrapper האטומי של Commit C או הפרדת DB roles.

6.8 הוכחת Commit C החילה **49 migrations** על PostgreSQL 16 נקי והוסיפה
שני תרחישי תחרות: שני Publishes זהים החזירו בדיוק `stored + replayed`,
ו־Retry נוסף נשאר `replayed`. Payload חתום שונה נחסם ללא nonce חדש;
כשל Publisher מאולץ ביטל יחד nonce,‏ Release ו־Operator event. ‏PUBLIC
נשאר ללא Execute וללא DML על שלוש הטבלאות המוגנות.

## 7. מצב החלטה

7.1 האפשרות המומלצת היא `Ed25519 worker-only attestation with atomic
PostgreSQL replay ledger`.

7.2 האפשרות המאושרת נשארת `unknown/unavailable`. מסמך זה וה־primitive
הרדום אינם פותחים Gate ואינם מאשרים שליחה חיה.
