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

## 4. חלופות שנדחו בהמלצה

4.1 ‏SHA-256 ציבורי בלבד — אינו מוכיח זהות מנפיק.

4.2 ‏HMAC משותף — מפר את הפרדת הסמכויות בין Worker ל־Verifier.

4.3 ‏JWT/JWS — אפשרי, אך מוסיף Algorithm surface ומעטפת רחבה יותר
מ־Ed25519 קבוע ומופרד Domain.

4.4 ‏GitHub Artifact Attestation — מתאים ל־Artifacts של CI, אך אינו
מחליף חתימת Worker על תצפית Staging חיה.

## 5. סדר הפעלה מחייב

5.1 ‏Commit A — primitive, Signer, בדיקות ו־ADR רדומים בלבד.

5.2 ‏Commit B — Migration ו־Repository אטומיים ל־nonce ledger, ללא
Grant ל־`PUBLIC` וללא Runtime composition.

5.3 ‏Commit C — נשיאת המעטפת בתוך ה־Evidence הסופי, אימות מחדש ב־Inspector,
חיבור Worker-only של ה־Signer ובדיקות PostgreSQL חיות.

5.4 רק אחרי Commit C, הפרדת DB roles, בדיקת Kill switch ו־Approval פורמלי
אפשר לשקול שינוי של `botReplyDeliveryAdapter` ל־Ready.

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

## 7. מצב החלטה

7.1 האפשרות המומלצת היא `Ed25519 worker-only attestation with atomic
PostgreSQL replay ledger`.

7.2 האפשרות המאושרת נשארת `unknown/unavailable`. מסמך זה וה־primitive
הרדום אינם פותחים Gate ואינם מאשרים שליחה חיה.
