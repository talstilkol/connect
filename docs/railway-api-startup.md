# Railway API Startup and Shutdown

## 1. סטטוס

1.1 ה־Startup executable של Railway API הושלם מקומית.

1.2 פקודת ההפעלה היא `npm run start:railway-api`.

1.3 ‏Rehearsal תהליכי עבר ב־2026-08-19 מול PostgreSQL 16 אמיתי עם 24
מיגרציות, Liveness, ‏Readiness וסגירה נקייה ב־`SIGTERM`.

1.4 אין בכך הוכחת Deployment ב־Railway. Project, ‏Service, ‏Region,
Environment values ו־Production credentials עדיין `unknown/unavailable`.

## 2. זרימת ההפעלה

2.1 `scripts/start-railway-api.mjs` מפעיל את
`startRailwayApiExecutable`.

2.2 ה־Bootstrap מאמת `PORT` לפני יצירת PostgreSQL pool. ערך חסר, Leading
zero, אפס, Port מעל 65535 או שדה Process נוסף בחוזה גורמים לכשל סגור.

2.3 לאחר מכן נוצר `railwayPostgresApiRuntime` מתוך Environment התהליך,
כולל Identity, ‏PostgreSQL ו־Tenant mutation rate-limit policy.

2.4 `railwayNodeProcess` יוצר Service, פותח Listener ורק לאחר הצלחה מתקין
`SIGINT` ו־`SIGTERM`.

2.5 כשל בכל שכבה מנסה לסגור את ה־Runtime ומחזיר רק
`Railway API startup failed`; הוא אינו כותב URL, ‏Secret, ‏Port או Error פנימי.

## 3. חוזה Environment

3.1 Process: `PORT`.

3.2 Identity: `APP_PUBLIC_ORIGIN`,‏ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,‏
`CLERK_SECRET_KEY`,‏ `VERCEL_OIDC_TEAM_SLUG`,‏
`VERCEL_OIDC_PROJECT_NAME`,‏ `VERCEL_OIDC_ENVIRONMENT`.

3.3 PostgreSQL: `APP_RUNTIME_ENVIRONMENT`,‏ `DATABASE_URL`,‏
`POSTGRES_APPLICATION_NAME`,‏ `POSTGRES_MAX_CONNECTIONS`,‏
`POSTGRES_CONNECTION_TIMEOUT_MS`,‏ `POSTGRES_IDLE_TIMEOUT_MS`,‏
`POSTGRES_STATEMENT_TIMEOUT_MS`,‏ `POSTGRES_QUERY_TIMEOUT_MS`,‏
`POSTGRES_LOCK_TIMEOUT_MS`,‏ `POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS`,‏
`POSTGRES_MAX_LIFETIME_SECONDS`,‏ `POSTGRES_TLS_MODE` ובמידת הצורך
`POSTGRES_TLS_CA_PEM`.

3.4 Rate limiting: `TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION`,‏
`TENANT_MUTATION_RATE_LIMIT_CAPACITY`,‏
`TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS`.

3.5 אין Defaults ל־Production values. ערך חסר, חלקי או לא חוקי מונע Startup.

## 4. Health ו־Shutdown

4.1 `GET /health/live` מוכיח שתהליך ה־HTTP פעיל בלבד.

4.2 `GET /health/ready` מריץ PostgreSQL `SELECT 1` ומחזיר `503` בכל כשל.

4.3 `SIGINT` ו־`SIGTERM` משתמשים באותו Close idempotent.

4.4 סדר הסגירה הוא HTTP listener תחילה ו־PostgreSQL pool אחריו. כך לא
מתקבלות בקשות חדשות לאחר שהמסד נסגר.

4.5 כשל Shutdown מסמן Exit failure בלי לחשוף פרטי Runtime.

## 5. Rehearsal מקומי

5.1 יש ליצור PostgreSQL 16 מקומי וריק בשם `connect_startup_rehearsal`.

5.2 מריצים:

```bash
CONNECT_POSTGRES_STARTUP_REHEARSAL_URL=postgresql://<local-user>@127.0.0.1:<db-port>/connect_startup_rehearsal CONNECT_RAILWAY_API_REHEARSAL_PORT=<api-port> npm run verify:railway-api-startup
```

5.3 ה־Verifier מקבל Loopback בלבד, ללא Password/Query/Fragment, ודורש Port
API שונה מ־Port המסד.

5.4 ה־Verifier טוען את 24 המיגרציות, מפעיל Child process אמיתי, בודק את שני
Routes ה־Health, שולח `SIGTERM` ודורש Exit code `0` ללא stdout/stderr.

## 6. מה עדיין נדרש לפריסה

6.1 רועי/ראשה צריכים ליצור או לבחור Railway Project ו־API Service מאושרים.

6.2 יש להגדיר Start command מדויק ל־`npm run start:railway-api` ו־Healthcheck
ל־`/health/ready` דרך הגדרות Railway החיות.

6.3 יש להזין Environment values דרך Railway Secrets/Members, לא בקוד או
ב־GitHub.

6.4 יש להפיק Deployment evidence שמוכיח Commit, ‏Artifact, ‏Origin,
Readiness, ‏SIGTERM grace period ו־Log redaction בסביבה החיה.

6.5 Worker הוא Service נפרד. ה־API executable אינו מפעיל Queue consumers
או Scheduler.
