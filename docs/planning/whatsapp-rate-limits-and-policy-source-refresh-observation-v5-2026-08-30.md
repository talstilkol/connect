# 1. Connect — רענון מקורות WhatsApp Rate Limits ומדיניות, גרסה 5

## 1.1 זהות וגבול

1.1.1 `observationId=CONNECT-WHATSAPP-RATE-LIMIT-POLICY-SOURCE-REFRESH-O5-2026-08-30`.

1.1.2 predecessor=`docs/planning/whatsapp-rate-limits-and-policy-source-refresh-observation-v4-2026-08-29.md`; raw SHA-256=`25a30259d932c074fbbeb64d357d4ac335596890870a0c44d1492fee3a2b0525`.

1.1.3 מסמך זה הוא Read-only source refresh; הוא אינו WABA live evidence, קוד, Acceptance או היתר שליחה.

1.1.4 לא נעשה שימוש ב־Token, WABA ID, phone-number ID, פרטי לקוח או הודעה אמיתית.

1.1.5 repository=`PUBLIC`; autonomous dispatch=`OFF`; bulk business-initiated messaging=`OFF`; Gate29=`BLOCKED`; development freeze=`ACTIVE`.

# 2. תוצאות רענון 2026-08-30

## 2.1 Meta Developer documentation

2.1.1 דף Cloud API overview הרשמי=`https://developers.facebook.com/docs/whatsapp/cloud-api/overview`.

2.1.2 דף Messaging Limits הרשמי=`https://developers.facebook.com/docs/whatsapp/messaging-limits`.

2.1.3 ארבע פתיחות ישירות, כולל Anchors של Throughput ו־Rate Limits, החזירו `HTTP 429 Too Many Requests`.

2.1.4 לכן לא נרכשו bytes רשמיים חדשים, revision, digest או numeric clauses מן הדפים האלה.

2.1.5 `HTTP 429` של כלי המחקר אינו Meta account rate-limit evidence ואינו מעיד על מצב WABA כלשהו.

## 2.2 Official Meta Postman workspace

2.2.1 [Meta WhatsApp Business Platform workspace](https://www.postman.com/meta/whatsapp-business-platform/overview) מציג את עצמו כ־Official workspace ומקשר ל־WhatsApp Cloud API הרשמי.

2.2.2 [Official Cloud API documentation surface](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api) היה נגיש ברענון.

2.2.3 המשטח הנגיש אישר את דרישות הבסיס: Meta business portfolio,‏ WABA,‏ business phone number ו־permissions `whatsapp_business_management` ו־`whatsapp_business_messaging`.

2.2.4 המשטח הנגיש לא הכיל התאמה ל־`Message Throughput`,‏ `Rate Limits`,‏ `80 messages per second` או `1800000`.

2.2.5 היעדר התאמה אינו מוכיח שהמגבלות אינן קיימות; הוא מוכיח רק שה־surface הנגיש אינו מקור מספיק למספרים.

## 2.3 מקורות שאינם קבילים

2.3.1 תוצאות חיפוש הציגו Copies ו־forks של Postman שאינם בבעלות Workspace הרשמי של Meta.

2.3.2 חלקם כוללים מספרי Throughput, נוסחאות API-call ו־error codes מוכרים מן העבר.

2.3.3 הם אינם מתקבלים כמקור קנוני, גם כאשר הטקסט נראה זהה למסמך Meta ישן.

2.3.4 Search snippet, Blog, fork, cached copy או זיכרון מפתח אינם יכולים לשנות `LimitSnapshot` חי.

# 3. מצב כל משפחת מגבלות

## 3.1 מגבלות מספריות

3.1.1 per-phone-number throughput=`unknown/unavailable`.

3.1.2 high-throughput eligibility and ceiling=`unknown/unavailable`.

3.1.3 WABA/business-portfolio API-call window and formula=`unknown/unavailable`.

3.1.4 per-recipient pair rate and burst/recovery=`unknown/unavailable`.

3.1.5 unique-recipient messaging tiers, scope, upgrade and downgrade=`unknown/unavailable`.

3.1.6 per-user marketing-message limit and suppression=`unknown/unavailable`.

3.1.7 test-number and unverified-account limits=`unknown/unavailable`.

3.1.8 Template create/edit/submit limits=`unknown/unavailable`.

3.1.9 media upload/download limits=`unknown/unavailable` unless separately admitted from exact current official bytes.

3.1.10 Webhook delivery/retry numeric limits=`unknown/unavailable`.

3.1.11 exact error-code catalogue, retry classes, cool-down and verified `Retry-After` behavior=`unknown/unavailable`.

## 3.2 כללי Authorization שאינם Throughput

3.2.1 Opt-in נדרש לפני פנייה יזומה.

3.2.2 Opt-out, block או בקשת הפסקה גוברים על allowance מספרי.

3.2.3 מחוץ לחלון שירות של `24` שעות נדרשת approved Message Template; הכלל נשמר מן ה־Business Messaging Policy הרשמי שנקלט ב־v4.

3.2.4 בתוך החלון, Automation מחייבת Human escalation path ברור.

3.2.5 Template status, purpose/category, recipient suppression, quality/restriction state, consent, window, Tenant budget ו־legal purpose הם predicates נפרדים.

3.2.6 throughput capacity אינו Authorization לשלוח.

# 4. החלטת ארכיטקטורה מחייבת

## 4.1 Layered limiter

4.1.1 effective allowance לכל dispatch הוא המינימום בין כל ה־limits החלים ובין Connect safety cap.

4.1.2 Dimensions מינימליים=`BusinessPortfolio/WABA,App,PhoneNumber,Tenant,Campaign,TemplateCategory,Recipient,Purpose,MessageClass,MediaClass,GraphVersion,TimeWindow`.

4.1.3 כל dimension נקשר ל־`LimitSnapshot` עם source, scope, observedAt, expiry, provider head, account/asset binding ו־policy version.

4.1.4 Snapshot חסר, stale, ambiguous, conflicting או inaccessible מעניק allowance=`0` לאותו dimension.

4.1.5 Queue admission ו־dispatch קוראים אותו exact snapshot generation; queued job אינו שומר Permit קבוע.

4.1.6 עלייה בקצב מחייב fresh live evidence ואישור Tal; אין auto-upgrade.

4.1.7 ירידה, quality degradation, provider restriction או policy change מבטלים מיד descendants ומפעילים backpressure/stop.

## 4.2 Retry ו־Backoff

4.2.1 Retry מותר רק ל־error class שנבדק כ־transient.

4.2.2 permission, consent, policy, quality, Template, recipient, billing, unknown או malformed errors אינם מקבלים blind retry.

4.2.3 verified provider retry hint גובר בתוך תקרת Connect.

4.2.4 בהיעדר hint, schedule הוא deterministic, bounded ו־versioned.

4.2.5 `Math.random()` אסור.

4.2.6 Jitter המבוסס על cryptographic randomness נשאר חסום עד אישור שימוש מדויק ונפרד מטל.

4.2.7 exhausted retry מגיע ל־DLQ/blocked terminal ואינו הופך להצלחה.

# 5. Evidence שטל צריך לקבל לפני Pilot

## 5.1 Live readback

5.1.1 exact Meta business portfolio, WABA, App ו־phone-number binding מושחרים.

5.1.2 Graph API version ו־effective permissions.

5.1.3 live throughput/capacity/quality/messaging-tier fields שה־account חושף.

5.1.4 Template states ו־categories הפעילים.

5.1.5 account restrictions, warning state ו־quality rating.

5.1.6 response headers ו־error payload classes מתרחישי Read-only או sends מאושרים בלבד.

5.1.7 Webhook delivery/status terminals וקשר ל־provider message ID מושחר.

5.1.8 internal Pilot safety caps, budget, stop conditions ו־named Primary/Backup.

## 5.2 מסמך החלטה של טל

5.2.1 Tal מאשר רק Snapshot root, לא מספר שמועתק ידנית לצ'אט.

5.2.2 האישור כולל environment, WABA/phone scope מושחר, Graph version, effective date, expiry ו־maximum internal cap.

5.2.3 שינוי provider field, account restriction, quality, Template policy או Graph version מבטל את האישור.

5.2.4 Tal אינו נדרש לחשוף Token או Customer data כדי לאשר את המגבלות.

# 6. פסק דין

6.1 מקור רשמי נגיש לא סיפק מספרי Rate-limit חדשים ברענון זה.

6.2 המספרים ההיסטוריים שמופיעים ב־copies לא־רשמיים נשארים מחוץ ל־Program authority.

6.3 ההמלצה נשארת `live-derived layered limiter;fail-closed;low internal Pilot caps;no automatic upward scaling`.

6.4 Tal numerical sign-off=`BLOCKED-PENDING-LIVE-WABA-EVIDENCE`.

6.5 autonomous send, bulk campaign send ו־AI side effect נשארים `OFF`.

6.6 Gate29=`BLOCKED`; development freeze=`ACTIVE`; repository=`PUBLIC`.
