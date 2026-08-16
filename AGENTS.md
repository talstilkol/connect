# Connect project instructions

## 1. User-facing response footer

1.1 Every user-facing assistant message, including `commentary` progress updates
and the final response, must end with this exact Hebrew structure:

`רמה להודעה הבאה: **<Low|Medium|High|XHigh|Max|Ultra>** — <נימוק קצר>.`

1.2 Select the level according to the next expected task:

1.2.1 `Low` — text-only or trivial isolated changes.

1.2.2 `Medium` — bounded routine implementation.

1.2.3 `High` — multi-file implementation, debugging or verification.

1.2.4 `XHigh` — security, concurrency, migrations or failure testing.

1.2.5 `Max` — release-critical architecture or adversarial audit.

1.2.6 `Ultra` — exceptional, highest-risk work where additional analysis is
worth the latency; do not recommend it routinely.

1.3 Never omit the footer, even when the response is short.

## 2. WhatsApp rate-limit ownership

2.1 Tal (`טל`) is the research and development owner for WhatsApp/Meta
messaging limits and Connect rate-limiting policy.

2.2 Rate-limit values must come from dated official Meta documentation or
live, authorized account state. Never infer or invent an unpublished limit.

2.3 Keep `docs/whatsapp-rate-limits.md` current whenever Meta limits, error
codes, quality enforcement or Connect quotas change.
