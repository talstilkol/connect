# 1. Connect — Manifest מנורמל לממצאי הביקורת המתמטית של דרישות Three-review Protocol v1.1

## 1.1 זהות וגבולות

1.1.1 `artifactId=CONNECT-THREE-REVIEW-PROTOCOL-V1-1-SUCCESSOR-REQUIREMENTS-MATHEMATICAL-HOSTILE-REVIEW-FINDINGS-2026-08-29-V1`.

1.1.2 מקור הממצאים הוא `/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-1-successor-requirements-mathematical-hostile-review-2026-08-29.md`, ‏SHA-256=`fb5d33c3593adcf614e3fb4f87660fef762af2f9cf12791422a815c7470dec45`.

1.1.3 Subject SHA-256=`3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e`.

1.1.4 מספר הרשומות=`22`: ‏`P0=14`, ‏`P1=8`, ‏`P2=0`, ‏`P3=0`.

1.1.5 כל הרשומות במצב `open-review-finding`; אין Closure, Acceptance, Normalization, Reconciliation, Task, hours, ETA או Gate credit.

## 1.2 חוזה רשומה

1.2.1 לכל שורה עשרה שדות: `reportLocalId`, ‏`severity`, ‏`reportSection`, ‏`subjectRoot`, ‏`defectClass`, ‏`sourceIntakeIds`, ‏`sourceRequirementIds`, ‏`closurePredicateLocator`, ‏`status`, ‏`noMergeKey`.

1.2.2 `reportSection` הוא המקור המלא ל־Defect, impact, required delta ו־closure predicate.

1.2.3 `noMergeKey` שווה בדיוק ל־`reportLocalId`; Topic או תיקון משותף אינם Merge rule.

# 2. רשומות

## 2.1 P0

| reportLocalId | severity | reportSection | subjectRoot | defectClass | sourceIntakeIds | sourceRequirementIds | closurePredicateLocator | status | noMergeKey |
|---|---:|---:|---|---|---|---|---|---|---|
| `MPRR-MATH-HR-F001` | `P0` | `§2.1` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `PROTOCOL-AUTHORITY-BOOTSTRAP` | `INTAKE-E001` | `MPRR-001,MPRR-002,MPRR-030,MPRR-035` | `§2.1.6` | `open-review-finding` | `MPRR-MATH-HR-F001` |
| `MPRR-MATH-HR-F002` | `P0` | `§2.2` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `ENVELOPE-SELF-ROOT` | `INTAKE-E004,INTAKE-E005` | `MPRR-010` | `§2.2.6` | `open-review-finding` | `MPRR-MATH-HR-F002` |
| `MPRR-MATH-HR-F003` | `P0` | `§2.3` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `RUN-REQUEST-RESULT-IDENTITY` | `INTAKE-E010` | `MPRR-004` | `§2.3.6` | `open-review-finding` | `MPRR-MATH-HR-F003` |
| `MPRR-MATH-HR-F004` | `P0` | `§2.4` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `SERIALIZATION-PIPELINE` | `INTAKE-E004,INTAKE-E007,INTAKE-E008` | `MPRR-006,MPRR-007,MPRR-008,MPRR-017` | `§2.4.6` | `open-review-finding` | `MPRR-MATH-HR-F004` |
| `MPRR-MATH-HR-F005` | `P0` | `§2.5` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `CANONICAL-SET-ORDER` | `INTAKE-E004,INTAKE-E006,INTAKE-E007` | `MPRR-007,MPRR-012,MPRR-015,MPRR-017,MPRR-022` | `§2.5.6` | `open-review-finding` | `MPRR-MATH-HR-F005` |
| `MPRR-MATH-HR-F006` | `P0` | `§2.6` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `LEGACY-VS-ELIGIBLE-OBSERVATION` | `INTAKE-E005,INTAKE-E006,INTAKE-E011` | `MPRR-010,MPRR-016,MPRR-021` | `§2.6.6` | `open-review-finding` | `MPRR-MATH-HR-F006` |
| `MPRR-MATH-HR-F007` | `P0` | `§2.7` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `MISSING-FIELD-AUTHORITY` | `INTAKE-E002,INTAKE-E003,INTAKE-E006,INTAKE-E008,INTAKE-E009` | `MPRR-012,MPRR-014,MPRR-017` | `§2.7.6` | `open-review-finding` | `MPRR-MATH-HR-F007` |
| `MPRR-MATH-HR-F008` | `P0` | `§2.8` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `LOCAL-IDENTITY-ROOT-AND-ALIAS` | `INTAKE-E009,INTAKE-E010` | `MPRR-016,MPRR-021` | `§2.8.6` | `open-review-finding` | `MPRR-MATH-HR-F008` |
| `MPRR-MATH-HR-F009` | `P0` | `§2.9` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `NORMALIZER-INDEPENDENCE` | `INTAKE-E005,INTAKE-E007` | `MPRR-018,MPRR-027,MPRR-034` | `§2.9.6` | `open-review-finding` | `MPRR-MATH-HR-F009` |
| `MPRR-MATH-HR-F010` | `P0` | `§2.10` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `KEY-BYTES-AND-FULL-DIGEST-COLLISION` | `INTAKE-E004,INTAKE-E007` | `MPRR-008,MPRR-018,MPRR-019` | `§2.10.6` | `open-review-finding` | `MPRR-MATH-HR-F010` |
| `MPRR-MATH-HR-F011` | `P0` | `§2.11` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `TOTAL-UNION-PARTITION` | `INTAKE-E005,INTAKE-E006,INTAKE-E007,INTAKE-E008` | `MPRR-018,MPRR-021,MPRR-025` | `§2.11.6` | `open-review-finding` | `MPRR-MATH-HR-F011` |
| `MPRR-MATH-HR-F012` | `P0` | `§2.12` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `COMPARISON-PRESENCE-CARDINALITY` | `INTAKE-E005,INTAKE-E006,INTAKE-E007` | `MPRR-022,MPRR-023,MPRR-025` | `§2.12.6` | `open-review-finding` | `MPRR-MATH-HR-F012` |
| `MPRR-MATH-HR-F013` | `P0` | `§2.13` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `IDENTITY-CHANGING-RESOLUTION` | `INTAKE-E003,INTAKE-E007` | `MPRR-023,MPRR-024,MPRR-025` | `§2.13.6` | `open-review-finding` | `MPRR-MATH-HR-F013` |
| `MPRR-MATH-HR-F014` | `P0` | `§2.14` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `TYPED-INVALIDATION-GRAPH` | `INTAKE-E010,INTAKE-E011,INTAKE-E012` | `MPRR-004,MPRR-031,MPRR-034` | `§2.14.6` | `open-review-finding` | `MPRR-MATH-HR-F014` |

## 2.2 P1

| reportLocalId | severity | reportSection | subjectRoot | defectClass | sourceIntakeIds | sourceRequirementIds | closurePredicateLocator | status | noMergeKey |
|---|---:|---:|---|---|---|---|---|---|---|
| `MPRR-MATH-HR-F015` | `P1` | `§3.1` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `SOURCE-FREEZE-CANONICAL-MEMBERSHIP` | `INTAKE-E011,INTAKE-E012` | `MPRR-003` | `§3.1.6` | `open-review-finding` | `MPRR-MATH-HR-F015` |
| `MPRR-MATH-HR-F016` | `P1` | `§3.2` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `LOCAL-SCHEMA-FIELD-CONTRACT` | `INTAKE-E006` | `MPRR-009,MPRR-012` | `§3.2.6` | `open-review-finding` | `MPRR-MATH-HR-F016` |
| `MPRR-MATH-HR-F017` | `P1` | `§3.3` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `COVERAGE-EXCLUSION-SEMANTICS` | `INTAKE-E005,INTAKE-E011` | `MPRR-011` | `§3.3.6` | `open-review-finding` | `MPRR-MATH-HR-F017` |
| `MPRR-MATH-HR-F018` | `P1` | `§3.4` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `CLOCK-AND-EXPIRY-MODEL` | `INTAKE-E004,INTAKE-E005` | `MPRR-005,MPRR-010,MPRR-024,MPRR-030,MPRR-031` | `§3.4.6` | `open-review-finding` | `MPRR-MATH-HR-F018` |
| `MPRR-MATH-HR-F019` | `P1` | `§3.5` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `CAS-LINEARIZATION-IDEMPOTENCY` | `none-direct` | `MPRR-030` | `§3.5.6` | `open-review-finding` | `MPRR-MATH-HR-F019` |
| `MPRR-MATH-HR-F020` | `P1` | `§3.6` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `FRESHNESS-CURRENT-PREDICATE` | `INTAKE-E011,INTAKE-E012` | `MPRR-031` | `§3.6.6` | `open-review-finding` | `MPRR-MATH-HR-F020` |
| `MPRR-MATH-HR-F021` | `P1` | `§3.7` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `TWO-GENERATION-CONTROLLED-DELTA` | `INTAKE-E001,INTAKE-E012` | `MPRR-034,MPRR-035` | `§3.7.6` | `open-review-finding` | `MPRR-MATH-HR-F021` |
| `MPRR-MATH-HR-F022` | `P1` | `§3.8` | `3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e` | `INTAKE-SEMANTIC-CLOSURE-MATRIX` | `INTAKE-E001,INTAKE-E002,INTAKE-E003,INTAKE-E004,INTAKE-E005,INTAKE-E006,INTAKE-E007,INTAKE-E008,INTAKE-E009,INTAKE-E010,INTAKE-E011,INTAKE-E012` | `MPRR-001,MPRR-002,MPRR-003,MPRR-004,MPRR-005,MPRR-006,MPRR-007,MPRR-008,MPRR-009,MPRR-010,MPRR-011,MPRR-012,MPRR-013,MPRR-014,MPRR-015,MPRR-016,MPRR-017,MPRR-018,MPRR-019,MPRR-020,MPRR-021,MPRR-022,MPRR-023,MPRR-024,MPRR-025,MPRR-026,MPRR-027,MPRR-028,MPRR-029,MPRR-030,MPRR-031,MPRR-032,MPRR-033,MPRR-034,MPRR-035` | `§3.8.6` | `open-review-finding` | `MPRR-MATH-HR-F022` |

# 3. QA invariants

## 3.1 Cardinality ו־Identity

3.1.1 IDs חייבים להיות בדיוק `MPRR-MATH-HR-F001`–`MPRR-MATH-HR-F022`, ללא חור או כפילות.

3.1.2 Severity חייב להיות `P0=14`, ‏`P1=8`, ‏`P2=0`, ‏`P3=0`.

3.1.3 לכל Row בדיוק `10` שדות; `subjectRoot` שווה ל־1.1.3; `noMergeKey=reportLocalId`.

3.1.4 כל `reportSection` ו־`closurePredicateLocator` נפתרים בדוח Root שב־1.1.2.

## 3.2 Disposition

3.2.1 `reviewResult=REJECT`; כל 22 Findings פתוחים.

3.2.2 Semantic Finding denominator, Comparison, Reconciliation ו־Acceptance נשארים חסומים.

3.2.3 `Gate29=BLOCKED`; `development freeze=ACTIVE`; Product percentage, remaining hours, critical path ו־ETA=`unknown/unavailable`.
