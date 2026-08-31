# אישור החלטות מחקר Connect — 26.08.2026

## 1. מעמד המסמך

1.1 מסמך זה מחליף את מצב ההחלטה המתועד עבור D02, D03, D05, D14,
D29 ו-D30 ב-[קליטת ההחלטות מ-21.08.2026](./decision-intake-2026-08-21.md).
המסמך הישן נשמר כרשומה היסטורית ואינו נמחק או משוכתב בדיעבד.

1.2 טל אישר לבצע מחקר, לבחור כיוון טכני ולהמשיך במימוש. ההחלטות
שלמטה נבחרו. הן אינן מעידות שספק, חשבון, Adapter, Secret, תצורה,
חוזה, DPA, תקציב או Evidence חיים קיימים.

1.3 כלל השחרור נשאר Fail-closed:

```text
Research decision selected
  -> human/legal/financial approval where required
  -> account and configuration
  -> adapter and security controls
  -> staging evidence
  -> release approval
  -> Ready
```

1.4 אין במסמך Secrets, Credentials, מזהי לקוח או מידע אישי. המחקר
נבדק מול מקורות רשמיים הזמינים בתאריך 26.08.2026; תנאי ספק, זמינות,
מחיר ורגולציה חייבים להיבדק שוב לפני רכישה או Go-live.

## 2. תקציר ההחלטות

| החלטה | כיוון שנבחר | מצב נוכחי | חוסם Ready |
|---|---|---|---|
| D02 AI | OpenAI Responses API; ‏GPT-5.6 Luna כברירת מחדל ו-Terra רק אחרי Eval | Selected | Privacy, allowlist, budget, keys ו-Eval חי |
| D03 Billing | Pilot ידני; אחריו Paddle MoR מותנה; Stripe Adapter רדום | Selected | Finance/Legal/Tax, KYC, pricing ו-Webhooks |
| D05 File scanning | GuardDuty Malware Protection for S3; אחרת Uploads כבויים | Selected | AWS/D14, IAM, EventBridge, budget ו-Staging evidence |
| D14 Object storage | AWS S3 פרטי ב-`il-central-1` | Selected | חשבון, Buckets, IAM, encryption, lifecycle, adapter ו-Evidence |
| D29 Roadmap | תעדוף לפי ראיות Pilot ונוסחת ערך/מאמץ | Selected | Product analytics ונתוני לקוחות משלמים |
| D30 Enterprise | Evidence-gated; ‏PWA בלבד ב-Pilot | Selected | ביקוש משלם וספי יציאה לכל יכולת |

## 3. D02 — ספק AI, מודלים ופרטיות

3.1 החלטה: להשתמש ב-OpenAI Responses API מאחורי Provider port.

3.2 בחירת מודל:

3.2.1 ‏GPT-5.6 Luna הוא ברירת המחדל לטיוטות קצרות ובעלות נמוכה.

3.2.2 ‏GPT-5.6 Terra מותר רק כאשר Eval מושחר, מתועד וחוזר מוכיח
שיפור מהותי לעומת Luna במשימה המדויקת.

3.2.3 ‏GPT-5.6 Sol אינו ברירת מחדל. ניתן להוסיף אותו ל-Allowlist
רק לאחר הוכחת איכות שמצדיקה את העלות וה-Latency.

3.3 גבולות בטיחות:

3.3.1 כל בקשה משתמשת ב-`store: false`; נשלח רק המידע המזערי הדרוש.

3.3.2 אין להעביר מספרי טלפון, Secrets, מזהי Tenant או מידע אישי
שאינו הכרחי. נתוני Eval חייבים להיות מושחרים.

3.3.3 ה-AI יוצר הצעה בלבד. נציג אנושי מאשר לפני שליחה ל-WhatsApp;
אין Autonomous send ואין Fallback אוטומטי למודל יקר יותר.

3.3.4 ‏`/v1/evals` אינו מסלול ZDR; לכן אין להעלות אליו מידע חי לא
מושחר. Zero Data Retention, אם יידרש, הוא תהליך אישור ספק נפרד.

3.4 מה עדיין חוסם Ready: אישור Privacy, חשבון OpenAI מאושר, מפתחות
ב-Vault, Model allowlist, Budget cap, Timeout, Retry policy, Eval set,
ספי איכות/עלות ו-Evidence מ-Staging.

3.5 מקורות רשמיים:

3.5.1 [OpenAI — Data controls](https://developers.openai.com/api/docs/guides/your-data).

3.5.2 [OpenAI — Models](https://developers.openai.com/api/docs/models).

3.5.3 [OpenAI — GPT-5.6 guidance](https://developers.openai.com/api/docs/guides/latest-model).

3.5.4 [OpenAI — Model comparison](https://developers.openai.com/api/docs/models/compare).

## 4. D03 — Billing

4.1 החלטת Pilot: לא להפעיל Checkout או חיוב מחזורי. להשתמש בחשבונית
שמופקת במערכת חשבונאית מאושרת ובהעברה בנקאית. אם Finance/Tax אינם
מאשרים תהליך זה בזמן, ה-Pilot יהיה חינמי ולא יופעל פתרון תשלום מאולתר.

4.2 החלטה לאחר Pilot: Paddle הוא הכיוון המועדף כ-Merchant of Record,
בכפוף לאישור KYC, סוג המוצר, המדינה/הישות המשפטית, Payout, מס,
Reconciliation וחוזה. בחירה זו מפחיתה נטל Sales tax/VAT אך מוסיפה
עלות ותלות בספק.

4.3 ‏Stripe נשאר Adapter רדום בלבד. רשימת הזמינות הגלובלית הרשמית
אינה מציגה את ישראל כמדינת Merchant נתמכת. אין לפתוח חשבון במדינה
אחרת ללא ישות משפטית, כתובת, מס, טלפון וחשבון בנק אמיתיים ומתאימים.

4.4 כלל ארכיטקטורה: `dual-port = true`, ‏`dual-live = false`. רק
Provider פעיל אחד הוא מקור סמכות. אין Fallback אוטומטי בין Paddle
ל-Stripe עבור אותו Event.

4.5 Webhooks עתידיים חייבים אימות חתימה על Raw body, ‏Event ID
Idempotency, טיפול ב-At-least-once ובאירועים מחוץ לסדר, Reconciliation,
Refunds ו-Audit. הם אינם חלק מה-Pilot הידני.

4.6 Finance/Tax חייבים לבדוק את דרישת "מספר הקצאה" לחשבוניות B2B
בישראל. אין לייצר חשבוניות באמצעות קוד ביתי או גיליון.

4.7 מה עדיין חוסם Ready: אישור Finance/Legal/Tax, מחיר ומטבע, פרטי
הישות, מערכת חשבוניות מאושרת, תנאי החזר, KYC, Payout, Webhook secrets,
Adapter פעיל, Reconciliation ו-Staging evidence.

4.8 מקורות רשמיים:

4.8.1 [Stripe — Global availability](https://stripe.com/global).

4.8.2 [Stripe — Requirements for an account in another country](https://support.stripe.com/questions/requirements-to-open-a-stripe-account-in-another-country).

4.8.3 [Paddle — Supported countries](https://www.paddle.com/help/legal/sanctions/which-countries-are-supported-by-paddle).

4.8.4 [Paddle — Pricing](https://www.paddle.com/pricing).

4.8.5 [Paddle — VAT handling](https://www.paddle.com/help/sell/tax/how-paddle-handles-vat-on-your-behalf).

4.8.6 [Paddle — Supported currencies](https://developer.paddle.com/concepts/sell/supported-currencies/).

4.8.7 [Paddle — Webhook signature verification](https://developer.paddle.com/webhooks/about/signature-verification/).

4.8.8 [Paddle — Webhook delivery behavior](https://developer.paddle.com/webhooks/about/how-webhooks-work/).

4.8.9 [רשות המסים — בקשת מספר הקצאה לחשבונית](https://www.gov.il/he/service/request-assignment-number-for-tax-invoice).

## 5. D05 — סריקת קבצים

5.1 החלטה: כאשר D14 מופעל, להשתמש ב-AWS GuardDuty Malware
Protection for S3 עבור Bucket ה-Quarantine, רצוי באותו `il-central-1`.
ClamAV על Railway אינו ברירת המחדל בשל זיכרון, עדכוני חתימות,
זמינות ותחזוקת Daemon.

5.2 אם AWS, D14, Budget, Security או Legal אינם מוכנים, העלאות מקורות
ידע נשארות כבויות. אין מעבר אוטומטי לספק Scanner אחר.

5.3 State machine מחייב:

```text
uploaded-quarantine -> scanning -> clean/released
                              \-> blocked/manual-review-or-delete
```

5.4 רק Verdict של `NO_THREATS_FOUND` הקשור לזהות המדויקת
`(bucket, key, versionId)` משחרר קובץ. Threat, Unsupported, Access
denied, Failure, Timeout, Quota, Verdict חסר או Event פגום נשארים
חסומים. EventBridge מטופל כ-At-least-once ובאופן Idempotent.

5.5 לפני הסריקה יש לאכוף 10 MiB, Extension/MIME/Magic תואמים ולחסום
קבצים מוצפנים ותכנים פעילים מסוכנים. Parsing/extraction נעשים בסביבה
מבודדת ללא Network. D07 נשאר: 15 דקות, עד שלושה ניסיונות, ואז Manual
review או מחיקה לפי בעל תפקיד ומדיניות מאושרים.

5.6 ה-Uploader מקבל Put-only; האפליקציה אינה יכולה לזייף Scan tag
או לקבל GET/Presigned GET לפני Verdict נקי.

5.7 מה עדיין חוסם Ready: חשבון AWS, S3 ב-D14, GuardDuty configuration,
IAM/TBAC, EventBridge consumer, תקרת עלות, Parser sandbox, Negative
tests ו-Evidence חי של Clean/Threat/Failure/Timeout/Replay.

5.8 מקורות רשמיים:

5.8.1 [AWS — How Malware Protection for S3 works](https://docs.aws.amazon.com/guardduty/latest/ug/how-malware-protection-for-s3-gdu-works.html).

5.8.2 [AWS — Scan engine](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-malware-detection-scan-engine.html).

5.8.3 [AWS — Malware Protection for S3 quotas](https://docs.aws.amazon.com/guardduty/latest/ug/malware-protection-s3-quotas-guardduty.html).

5.8.4 [AWS — GuardDuty regional endpoints](https://docs.aws.amazon.com/general/latest/gr/guardduty.html).

5.8.5 [AWS — GuardDuty pricing](https://aws.amazon.com/guardduty/pricing/).

5.8.6 [ClamAV — Introduction and resource guidance](https://docs.clamav.net/Introduction.html).

5.8.7 [ClamAV — Docker deployment](https://docs.clamav.net/manual/Installing/Docker.html).

## 6. D14 — Object Storage

6.1 החלטה: AWS S3 פרטי באזור `il-central-1` עבור Pilot ועבור הכיוון
היעד. נבחרו S3 Versioning, Lifecycle ויכולות Object Lock/Legal Hold
שאינן קיימות במלואן בחלופות שנבדקו.

6.2 להפריד לפחות בין Knowledge/Quarantine לבין Backup/Evidence. לכל
Bucket: Block Public Access, ‏TLS-only, ‏Least privilege, Versioning,
Lifecycle, Budget alerts ו-Presigned PUT/GET קצרים ומוגבלים.

6.3 ‏SSE-S3 היא ברירת המחדל. SSE-KMS מותר רק כאשר חוזה או Security
דורשים שליטה במפתחות וקיימים Owner, Rotation ו-Break-glass runbook.

6.4 ‏Object Lock governance מותר רק ל-Data classes שאושרו. Compliance
mode אסור לפני Legal review משום שהשמירה עלולה להיות בלתי הפיכה גם
עבור מנהל המערכת.

6.5 בחירת אזור S3 אינה מוכיחה שכל מערכת Connect שומרת נתונים בישראל.
PostgreSQL, Railway, Vercel, Logs, AI, Billing ו-Backups חייבים בדיקת
Residency נפרדת. אין להציג טענת "כל הנתונים בישראל" ללא Evidence.

6.6 מעבר מ-R2, אם נדרש: Copy עם Checksum manifest, אימות, חלון כתיבה
קצר וקפוא, Single-writer flip, Source read-only, ואז מחיקה רק לפי
Retention מאושר. אין Permanent dual-write.

6.7 מה עדיין חוסם Ready: חשבון AWS, Buckets, IAM, Encryption,
Versioning, Lifecycle, GuardDuty, Adapter, Secrets, Budget cap,
Checksum migration rehearsal, Restore evidence ו-Legal/Residency review.

6.8 מקורות רשמיים:

6.8.1 [AWS — S3 regional endpoints](https://docs.aws.amazon.com/general/latest/gr/s3.html).

6.8.2 [AWS — Regions](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html).

6.8.3 [AWS — S3 default encryption](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryption.html).

6.8.4 [AWS — S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html).

6.8.5 [AWS — S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html).

6.8.6 [Railway — Storage buckets](https://docs.railway.com/storage-buckets).

6.8.7 [Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/).

6.8.8 [Cloudflare R2 — Data location](https://developers.cloudflare.com/r2/reference/data-location/).

## 7. D29 — Roadmap אחרי Pilot

7.1 החלטה: `pilot-evidence-ranked`. אין לתעדף לפי מספר Features של
מתחרה או לפי בקשה קולנית יחידה.

7.2 סדר השערים:

7.2.1 Gate 0 — לסגור P0/P1, Privacy/Retention/Export/Delete,
Restore/Rollback, Observability ו-Product analytics.

7.2.2 Gate 1 — לשפר את לולאת השימוש היומית: Inbox, עבודת צוות,
CRM ו-Consent, לפי החיכוך שנמדד.

7.2.3 Gate 2 — להוכיח הכנסה חוזרת: Assisted onboarding, Plan משלם
אחד, Quotas, Usage ו-Support.

7.2.4 Gate 3 — לבחור ענף יחיד. אם ראיות Outbound חזקות יותר:
Segmentation/Delivery/Recurring. אם Inbound חזק יותר: Automation/Bot.
בתיקו: מספר Tenants משלמים מושפעים, תדירות, ואז Effort קטן יותר.

7.2.5 Gate 4 — AI/Knowledge רק עם אישור אדם, Eval, Safety ו-Cost;
Analytics רק כאשר איכות האירועים מוכחת.

7.3 נוסחת התעדוף:

```text
(paying tenants affected x workflow frequency x measured outcome x confidence)
-------------------------------------------------------------------------
                              effort
```

7.4 דרישת ראיה: לפחות שלושה SMB משלמים המאמתים את אותה עבודה מרכזית.
במחזור הראשון אחרי Pilot, 50% מהקיבולת נשמרים ל-Reliability, Security
ו-Compliance. ניתן לרדת לרצפה של 30% רק אחרי ארבעה שבועות בתוך SLO,
אפס P0/P1 ותרגילי Restore ו-Rollback עוברים.

## 8. D30 — Enterprise, Integrations ו-Mobile

8.1 החלטה: `evidence-gated`. ב-Pilot נשארים עם Web רספונסיבי/PWA.
לא בונים אפליקציות iOS/Android, Marketplace, Omnichannel, Public API,
SAML/SCIM, CMK או Agency mode ללא סף יציאה מוכח.

8.2 מכינים חוזים בלבד, בלי Product surface:

8.2.1 API — משאבים ופקודות Versioned, מזהים אטומים, Tenant auth/RBAC,
Idempotency, Cursor pagination, UTC, Deprecation, `Retry-After`,
RFC 9457 ו-OpenAPI פרטי.

8.2.2 Webhooks — Transactional outbox, Envelope versioned,
At-least-once, Timestamp, HMAC/Key ID/Rotation, Delivery log ו-DLQ,
ללא PII כברירת מחדל.

8.2.3 Integrations — Ports ניטרליים, Sync cursor, Source-of-truth,
Conflict policy, Mapping version, Backoff, Secret references ו-Kill switch.

8.3 ספי יציאה:

8.3.1 Public API — שלושה Tenants משלמים עם אותו צורך ותכנון מאושר
של Abuse, Quotas, Pricing, Versioning ו-Security.

8.3.2 Connector — שלושה Tenants משלמים המבקשים אותו Connector,
Sandbox, Conflict map ו-Support owner.

8.3.3 Enterprise — שני Prospects כשירים ולפחות Design partner משלם
או חוזה מחייב.

8.3.4 Native mobile — כשל מדיד של PWA הדורש יכולת Native-only
ושלושה Tenants משלמים עם אותו צורך.

8.4 מקורות לחוזי העתיד:

8.4.1 [OpenAPI Specification](https://spec.openapis.org/oas/latest.html).

8.4.2 [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html).

8.4.3 [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html).

8.4.4 [RFC 9421 — HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html).

8.4.5 [RFC 7644 — SCIM protocol](https://www.rfc-editor.org/rfc/rfc7644.html).

## 9. אחריות אנושית שאינה מואצלת לקוד

9.1 Legal מאשר Terms, Privacy, DPA, Data residency, Retention,
Object Lock ושימוש ב-AI/קבצים.

9.2 Finance/Tax מאשרים Billing, חשבוניות, מספרי הקצאה, מטבע, החזרים,
Payout ו-Reconciliation.

9.3 בעלי חשבון מוסמכים פותחים חשבונות ספק, מקבלים Terms, רוכשים
Plans, מזינים Secrets ומאשרים Budget caps.

9.4 Security ו-Operations מאשרים IAM, Encryption, Incident response,
Backup/Restore, On-call ו-Evidence חי.

9.5 עד השלמת האישורים והראיות, כל היכולות החדשות נשארות כבויות או
Fail-closed. אין להסיק מן המילה `selected` שהמערכת Production Ready.
