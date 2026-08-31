# Better Stack OpenTelemetry for Connect services

## 1. מטרה

1.1 ה־Railway Worker, ‏Railway API ו־Vercel Web שולחים אירועי תפעול
תחומים ל־Better Stack באמצעות OTLP/HTTP Logs. נתיב Vercel → Railway API
ואירועי Worker מדודים מפיקים בנוסף Spans ו־Metrics תחומים. Structured JSON
נשאר במקביל ב־`stdout` עבור לוגי הפלטפורמות.

1.2 המימוש המקומי אינו מוכיח ש־Source חי נוצר, שה־Token תקף, שהאירועים
הגיעו ל־Live tail או ש־Retention ו־Alerts אושרו.

## 2. תצורה

2.1 ‏Railway Test ו־Development עובדים ב־`stdout` בלבד. ‏Vercel Local
ו־Development אינם מפעילים Exporter. אסור לספק לסביבות אלה תצורת Better
Stack חלקית.

2.2 ‏Staging ו־Production דורשים את כל הערכים הבאים ונכשלים סגור לפני
פתיחת השירות כאשר אחד מהם חסר או פגום:

2.2.1 ‏`APP_RELEASE_SHA` — Commit SHA קנוני בן 40 תווי Hex קטנים.

2.2.2 ‏`BETTER_STACK_OTLP_LOGS_ENDPOINT` — כתובת HTTPS ללא Credentials,
Port, ‏Query או Fragment, תחת Domain של Better Stack ובנתיב `/v1/logs`.
ה־Runtime גוזר מאותו Host רק את הנתיבים `/v1/traces` ו־`/v1/metrics`;
הנתיבים אינם מגיעים מקלט בקשה או ממשתמש.

2.2.3 ‏`BETTER_STACK_SOURCE_TOKEN` — Secret שנשמר רק ב־Railway Vault.
אין לשמור אותו ב־Git, Screenshot, Artifact או מסמך ראיה.

2.3 ‏Vercel Preview ו־Production דורשים `VERCEL=1`, ‏`VERCEL_ENV`,
`VERCEL_GIT_COMMIT_SHA` ואת שני ערכי Better Stack. שני ערכי `VERCEL_*`
הראשונים הם System environment variables של הפלטפורמה; יש להפעיל את
חשיפתם בפרויקט. ‏Source token נשמר כ־Sensitive environment variable ולא
ב־Git או ב־Preview evidence.

2.4 ‏`CONNECT_TRACE_CONTEXT_HMAC_KEY` הוא Secret נפרד ב־Vercel בלבד:
32 בתים המקודדים כ־Base64URL קנוני בן 43 תווים. הוא משמש לגזירת Trace
Context אטום מ־`x-vercel-id`; הוא אינו נשמר ב־Railway ואינו מיוצא ללוג.

2.5 יעד ההתראות ל־Staging/Production משתמש ב־Better Stack Incident API
הקבוע. אין Endpoint configurable. נדרשים כל הערכים הבאים ללא Defaults:

2.5.1 ‏`BETTER_STACK_INCIDENT_API_TOKEN` — Team-scoped Secret ייעודי
ל־Uptime/Incident API. אסור להשתמש ב־Source ingestion token למטרה זו.

2.5.2 ‏`BETTER_STACK_INCIDENT_REQUESTER_EMAIL` ו־
`BETTER_STACK_INCIDENT_ESCALATION_POLICY_ID` — זהות המפעיל ומדיניות
ה־Primary/Backup שאושרה בחשבון.

2.5.3 חמשת הערכים `BETTER_STACK_INCIDENT_NOTIFY_CALL`, ‏`..._SMS`,
`..._EMAIL`, ‏`..._PUSH` ו־`..._CRITICAL` חייבים להיות `true` או `false`.
לפחות ערוץ אחד חייב להיות פעיל; Critical מחייב Push פעיל.

2.5.4 ‏`BETTER_STACK_INCIDENT_TEAM_WAIT_SECONDS` קובע במפורש את זמן
ההמתנה לפני הסלמה לצוות, בין שנייה אחת ל־86,400 שניות. זהו גבול טכני,
לא בחירת Product; הערך המדויק עדיין דורש החלטת D10.

2.5.5 ‏`SLO_ALERT_OWNER`, ‏`SLO_ALERT_ESCALATION_ROUTE`, חלון המדידה
ומינימום האירועים חייבים להתאים למדיניות ה־SLO. Development/Test ללא כל
ערכי הספק נשארים Disabled; תצורה חלקית נחסמת.

## 3. חוזה האירועים

3.1 ה־Resource כולל רק `service.name`, ‏`service.version` ו־
`deployment.environment.name`.

3.2 ‏Log attributes כוללים רק סוג אירוע, קוד תחום, שם תור מהרשימה
הסגורה, Outcome, ‏Duration ומונים מספריים.

3.2.1 ה־API מפיק חמישה Signals תפעוליים: כשל PostgreSQL idle client, כשל חיבור
או פרסום של Meta webhook queue, וכשל חיבור או פרסום של Team invitation
queue. בנוסף הוא מפיק אירוע `api-request` רק לאחר אימות Vercel OIDC, עם
Operation קנוני, Query/Mutation, ‏Outcome, קוד ומשך. הוא אינו מתעד Request
URL, ‏Headers, ‏Body, משתמש או Tenant.

3.2.2 ‏Vercel Web מתעד רק קריאה ל־Railway API: שם Operation קנוני,
Query/Mutation, ‏Outcome, קוד תחום ומשך תחום. הוא אינו מתעד Payload,
Request URL, ‏Headers, ‏OIDC, ‏Clerk token, ‏Tenant או Response body.

3.3 ‏Tenant ID, ‏Delivery key, ‏Recipient, ‏Email, ‏Payload, ‏Redis URL,
Provider response, ‏Credential ו־Token אינם נכנסים ל־OTLP.

3.4 האירועים נשלחים ב־Batch של עד 128, עם Queue פנימי של עד 1,024,
Timeout של 5 שניות, Connection יחיד ו־gzip. ‏`SIGINT` ו־`SIGTERM` סוגרים
קודם את ה־Worker או HTTP service, מבצעים `forceFlush` ואז `shutdown`
Idempotent.

3.5 ‏Vercel Web מחזיק Provider אחד לכל Warm instance. לאחר כל קריאת
Railway API הוא רושם `forceFlush` באמצעות `after()` של Next.js. כשל
Scheduling או Flush אינו משנה את תוצאת ה־API.

3.6 ‏Vercel Web ו־Railway API מצרפים לאירועי אותה קריאה OpenTelemetry
Context מאותו W3C `traceparent`. ‏Vercel מפיק Root Client Span בעל ה־Trace
ID וה־Span ID האטומים; Railway מפיק Server Span שהוא Child דטרמיניסטי שלו.
ה־Logs בכל שירות מקושרים ל־Span המקומי באמצעות שדות OTLP הייעודיים ולא
כ־Custom attributes. ‏`tracestate` ו־`baggage` אינם מועברים.

3.7 ה־API מפיק שני Metrics בלבד: מונה `connect.railway_api.requests`
והיסטוגרמת `connect.railway_api.duration` במילישניות. Labels מוגבלים ל־Role,
Operation קנוני, Query/Mutation, ‏Outcome וקוד תחום; Cardinality מוגבלת ל־128
סדרות לכל Instrument. אין Labels של Tenant, משתמש, URL, Trace ID או Payload.

3.8 ‏Spans נשלחים ב־Batch של עד 128 מתוך Queue של עד 1,024. ‏Metrics
נאספים אחת ל־60 שניות; בשני המקרים Timeout הייצוא הוא חמש שניות ו־Vercel
מבצע `forceFlush` לאחר התגובה.

3.9 ‏Railway Worker מפיק `connect.worker.events` עבור Signals של כל ארבעת
התורים, `connect.worker.operation.duration` עבור אירועים מדודים,
`connect.worker.provider.duration` עבור כל קריאת ספק מדודה ו־
`connect.worker.items` עבור מוני Outcome שכבר עברו Validation. ‏Root Span
דטרמיניסטי נוצר רק לאירוע בעל `startedAt`, ‏`completedAt` ומשך עקבי:
Meta webhook batch, ‏Campaign delivery batch, ‏Knowledge scan recovery,
Message-template maintenance, ‏Team-invitation delivery או
Message-template-submission delivery. ‏Connection failure, ‏DLQ ו־Cleanup
נספרים אך אינם מקבלים Span מלאכותי ללא משך אמיתי.

3.10 ‏Worker Trace ID ו־Span ID נגזרים ב־SHA-256 מהאירוע הקנוני והמסונן,
כולל זמנים, סוג פעולה, Outcome ומונים ממוינים. אין שימוש ב־Randomness,
Job ID, ‏Delivery key, ‏Tenant או Payload. רישום חוזר של אותו אירוע מפיק
אותם מזהים; Log timestamp נקבע ל־`completedAt` ונקשר ל־Span המקומי.

3.11 ‏Campaign delivery, ‏Team invitation ו־Message-template submission
מפיקים Delivery `CONSUMER` spans. ‏Message-template reconciliation נקשר
ל־Maintenance parent. כל קריאת HTTP אמיתית מפיקה `CLIENT` child נפרד:
`connect.provider.meta.campaign-message.send`,
`connect.provider.meta.message-template.submit`,
`connect.provider.meta.message-template.list`,
`connect.provider.clerk.organization-invitation.list` או
`connect.provider.clerk.organization-invitation.create`.

3.12 ‏Provider requests נשמרים לפי סדר הביצוע בתוך Async-local scope נפרד
לכל פעולה, עם תקרה של 64 קריאות. כל Child כולל רק Provider, ‏Operation
קנוני, Outcome וזמנים; אין URL, ‏WABA, ‏Organization ID, ‏Template key,
Delivery key, ‏Email, ‏Token, ‏Payload או הודעת שגיאה חופשית. קריאה ללא
Scope פעיל אינה ממציאה Span, ואין להסיק מ־Batch latency את זמן הספק.

## 4. התנהגות בכשל

4.1 ‏Railway Staging/Production נעצרים לפני פתיחת השירות ללא תצורה מלאה.
ב־Vercel Preview/Production יצירת Railway API client נכשלת סגור. זה מונע
קריאות Business API ללא Observability שנבחרה.

4.2 כשל Emit, ‏Flush או Shutdown אינו מדליף את הודעת הספק ואינו משנה
Ack, ‏Retry או State עסקי. אירועי `stdout` נשארים זמינים לאבחון Railway.

4.3 ‏Correlation נוצר רק מ־HMAC של Vercel request ID. הוא אינו מבוסס
על `traceparent` מהדפדפן, Tenant, משתמש או נמען. מפתח חסר ב־Preview או
Production חוסם את קריאת ה־API; Context חסר ב־Development נשאר `null`.
Railway בודק את ה־Header רק לאחר OIDC ודוחה פורמט W3C פגום.

4.4 ‏SLO breach או Insufficient data תקינים נשלחים ב־POST רק אל
`https://uptime.betterstack.com/api/v3/incidents`, עם Timeout של חמש
שניות ותגובה של עד 32KB. ה־Body מכיל רק קוד, חלון UTC, יעד, תוצאה ומספר
אירועים; אין Tenant, משתמש, מספר טלפון, תוכן הודעה, Payload, ‏Trace ID או
Token. ‏Redirect, סטטוס שאינו 201, ‏Content-Type פגום, JSON פגום או מזהה
Incident לא תקין מוחזרים כ־`unavailable` ללא הודעת הספק.

4.5 ה־Adapter מאמת מחדש את חלון המדידה, ה־Owner, נתיב ההסלמה, סף 99.5%,
מספר האירועים וסיבת ההתראה לפני פנייה לרשת. Alert מורחב או לא עקבי אינו
יכול ליצור Incident. תגובת הצלחה אינה שומרת או מחזירה את מזהה ה־Incident.

## 5. ראיית Staging שנשארה

5.1 ליצור Better Stack OpenTelemetry Source ולשמור את ה־Endpoint וה־Token
ב־Railway Staging בלבד.

5.2 לפרוס Commit ידוע, להפעיל אירוע Health תחום, אירוע Queue failure
מורשה וקריאת Railway API מ־Web, ולוודא ב־Live tail את
`connect-railway-worker`, ‏`connect-railway-api` ו־`connect-vercel-web`,
יחד עם `release`, ‏`environment`, סוג האירוע והיעדר PII/Secrets.

5.2.1 להוכיח ששני אירועי `railway-api-call` ו־`api-request` מופיעים עם
אותו Trace ID, ושאין ב־Live tail את `x-vercel-id`, מפתח HMAC, ‏Token,
Payload, ‏Tenant או User identity.

5.2.2 להוכיח Waterfall של `connect.worker.delivery-attempt` עבור Campaign,
Template submission ו־Team invitation, וכן Maintenance parent עבור
Template reconciliation. יש להראות את חמש פעולות הספק המותרות שבסעיף
3.11 עם אותו Trace ID ו־Parent Span ID תואם. הראיה חייבת להראות שאין URL,
‏WABA, ‏Organization ID, מפתחות עבודה, Tenant, ‏Email, נמען, Payload או
Token.

5.2.3 להוכיח Waterfall בעל Root Client Span של `connect-vercel-web`
ו־Child Server Span של `connect-railway-api`, יחד עם שני ה־Metrics, אותם
Resource attributes ו־Cardinality שאינה חורגת מהחוזה.

5.2.4 להוכיח Worker operation spans, ארבעת ה־Worker metrics ו־Labels מכל
ארבעת שמות התורים. יש לוודא שאין Job ID, ‏Delivery key, ‏Provider response,
Tenant או Payload, ושאותו Event אינו יוצר סדרות Cardinality חדשות לפי
זהויות Runtime.

5.3 לבדוק Batch/Flush בזמן Restart, התנהגות כאשר Better Stack אינו זמין,
תקציב ingestion, Retention ו־Alert routing. הראיה תשמור רק Commit,
Artifact digest, זמן, Source type ותוצאות PASS/FAIL — לעולם לא Token,
Endpoint מלא או Runtime payload.

5.4 עבור Pilot קטן נבחר Direct SDK כדי לצמצם רכיב תפעולי נוסף. לפני
Scale משמעותי יש לבחון OpenTelemetry Collector; התיעוד הרשמי ממליץ עליו
כ־Production best practice.

5.5 ראיית Staging חיה נשמרת מחוץ ל־Git בקובץ
`.artifacts/better-stack-staging-evidence.json`. היא נקראת באמצעות File
Safety Gate שחוסם Symlink, קובץ Group/World-writable וקובץ הגדול מ־48KB,
ומאומתת בפקודה `npm run verify:better-stack-staging-evidence`.

5.5.1 המאמת **אינו מתחבר ל־Better Stack ואינו יוצר Evidence**. מפעיל
מורשה חייב לבצע את הבדיקות החיות, לייצא Artifact במבנה הסגור ולשמור את
`APP_DEPLOYMENT_ARTIFACT_DIGEST` בסביבת האימות. קובץ חסר, פגום, עתידי,
שפג תוקפו או שאינו מתאים ל־Release, ל־Commit ול־Artifact הנוכחיים חוסם
את שער Production.

5.5.2 ה־Artifact תקף לכל היותר 24 שעות ודורש בדיוק: שלושת השירותים;
חמשת תרחישי ה־Waterfall שבסעיפים 5.2.2–5.2.3; ששת ה־Metrics שבסעיפים
3.7 ו־3.9; שתי מסירות Alert עבור `slo-breach` ו־`insufficient-data`;
בדיקת Redaction עם אפס ממצאים; תרגיל Outage שעבר ללא השפעה עסקית; ו־
Digests נפרדים למדיניות Retention ולמדיניות תקרת העלות המאושרות.

5.5.3 ה־Artifact שומר רק Fingerprints מסוג SHA-256 ומונים תחומים. החוזה
דוחה שדות עודפים ולכן אין לכלול Endpoint, ‏Token, ‏Source ID, ‏Trace ID
גולמי, Tenant, משתמש, נמען, Payload או פרטי לקוח. ה־Fingerprint מאפשר
לקשור ראיה בלי להכניס את הזהות או ה־Secret לקובץ.

5.5.4 `BETTER_STACK_STAGING_EVIDENCE_JSON` נטען ב־Runtime רק מתוכן הקובץ
שאומת. שני סעיפי Production Readiness — Monitoring/Alerting ו־SLO
Measurement — דורשים גם מימוש שסומן כהושלם וגם Evidence חי ותקף. Evidence
לבדו אינו יכול להפוך קוד חסר ל־Ready, וקוד לבדו אינו מוכיח ספק חי.

5.5.5 בשלב הנוכחי לא נוצרה ראיה חיה ולא הוגדרו Retention או Cost cap
מומצאים. עד לביצוע הבדיקות ב־Staging ולאישור המדיניות, שני סעיפי ה־
Readiness נשארים חסומים בכוונה.

5.6 ‏SQL API הוא ה־Read-only interface הרשמי לשאילתת Logs ו־Metrics,
אך ה־Host, ה־Connection credentials ושמות טבלאות ה־Source נוצרים בחשבון
וב־Region הספציפיים. לכן Data-source adapter לא יחובר לפני יצירת Source
חי, צילום Schema מאומת וכתיבת שאילתה שנבדקה עליו. אין להמציא Table name
או להעתיק Query לדוגמה כאילו הוא מתאים ל־Connect.

## 6. מקורות רשמיים

6.1 [Better Stack OpenTelemetry](https://betterstack.com/docs/logs/open-telemetry/).

6.2 [OpenTelemetry JavaScript exporters](https://opentelemetry.io/docs/languages/js/exporters/).

6.3 [OpenTelemetry JavaScript OTLP Logs exporter](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/exporter-logs-otlp-http).

6.4 [Vercel System environment variables](https://vercel.com/docs/environment-variables/system-environment-variables).

6.5 [Vercel Functions lifecycle ו־Next.js `after()`](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package).

6.6 [Vercel request headers — `x-vercel-id`](https://vercel.com/docs/headers/request-headers).

6.7 [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/).

6.8 [W3C Trace Context Level 2](https://www.w3.org/TR/trace-context-2/).

6.9 [Better Stack — ingesting traces](https://betterstack.com/docs/logs/ingesting-data/http/traces/).

6.10 [Better Stack — Create incident API](https://betterstack.com/docs/uptime/api/create-a-new-incident/).

6.11 [Better Stack — SQL API](https://betterstack.com/docs/logs/query-api/connect-remotely/).
