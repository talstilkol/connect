# 1. Connect — Manifest מנורמל לממצאי Review B המתמטי של TRD-2 Requirement Manifest

## 1.1 זהות וגבולות

1.1.1 `artifactId=CONNECT-TRD2-REQUIREMENT-MANIFEST-MATHEMATICAL-HOSTILE-REVIEW-FINDINGS-2026-08-29-V1`.

1.1.2 מקור הממצאים הוא `/Users/tal/Documents/connect/web/docs/planning/trd2-requirement-manifest-mathematical-hostile-review-2026-08-29.md`, ‏SHA-256=`66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362`.

1.1.3 נושא הביקורת הוא `/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-definition-requirement-manifest-2026-08-29.md`, ‏SHA-256=`2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a`.

1.1.4 ה־Manifest מכיל בדיוק `24` Findings: ‏`12 P0`, ‏`10 P1`, ‏`2 P2`, ‏`0 P3`.

1.1.5 כל רשומה מפנה לסעיף Finding מלא בדוח. הטבלה אינה מקצרת את Defect או Predicate הסמכותיים; סעיף הדוח הקשור הוא המקור המלא.

1.1.6 כל הרשומות במצב `open-review-finding`; ה־Manifest אינו סוגר Finding, אינו מקבל Subject ואינו מעניק Credit או Materialization permit.

## 1.2 חוזה הרשומה

1.2.1 לכל רשומה עשרה שדות: `reportLocalId`, ‏`severity`, ‏`reportSection`, ‏`subjectRoot`, ‏`defectClass`, ‏`sourceContractIds`, ‏`sourceFindingIds`, ‏`closurePredicateLocator`, ‏`status`, ‏`noMergeKey`.

1.2.2 `reportSection` קושר ל־Defect, impact, Definition delta ו־Acceptance predicate המלאים בדוח הקפוא שב־1.1.2.

1.2.3 `noMergeKey` שווה בדיוק ל־`reportLocalId`. אסור למזג רשומות לפי Defect class, מקור, תיקון או Dependency משותפים.

1.2.4 ה־Manifest מרחיב כל Range מן הדוח לזהויות מפורשות. Range נשאר מותר בדוח כ־Navigation בלבד, לא ב־Formal successor intake.

# 2. רשומות מנורמלות

## 2.1 P0

| reportLocalId | severity | reportSection | subjectRoot | defectClass | sourceContractIds | sourceFindingIds | closurePredicateLocator | status | noMergeKey |
|---|---:|---:|---|---|---|---|---|---|---|
| `TRD2-MATH-RB-F001` | `P0` | `§2.1` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `CONTRACT-AND-FINDING-TRACEABILITY` | `MATH-001,MATH-002,MATH-003,MATH-004,MATH-005,MATH-006,MATH-007,MATH-008,MATH-009,MATH-010,MATH-011,MATH-012,MATH-013,MATH-014,MATH-015,MATH-016,MATH-017,MATH-018,MATH-019,MATH-020,MATH-021,MATH-022,MATH-023,MATH-024,MATH-025,MATH-026,MATH-027,MATH-028,MATH-029,MATH-030,MATH-031,MATH-032` | `MSAF-20260829-F001,MSAF-20260829-F002,MSAF-20260829-F003,MSAF-20260829-F004,MSAF-20260829-F005,MSAF-20260829-F006,MSAF-20260829-F007,MSAF-20260829-F008,MSAF-20260829-F009,MSAF-20260829-F010,MSAF-20260829-F011,MSAF-20260829-F012,MSAF-20260829-F013,MSAF-20260829-F014,MSAF-20260829-F015,MSAF-20260829-F016,MSAF-20260829-F017,MSAF-20260829-F018,MSAF-20260829-F019,MSAF-20260829-F020,MSAF-20260829-F021,MSAF-20260829-F022,MSAF-20260829-F023,MSAF-20260829-F024,MSAF-20260829-F025,MSAF-20260829-F026` | `§2.1.6` | `open-review-finding` | `TRD2-MATH-RB-F001` |
| `TRD2-MATH-RB-F002` | `P0` | `§2.2` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `WORK-UNIVERSE-AND-ADMISSION` | `MATH-001,MATH-002` | `MSAF-20260829-F001,MSAF-20260829-F018,MSAF-20260829-F019` | `§2.2.6` | `open-review-finding` | `TRD2-MATH-RB-F002` |
| `TRD2-MATH-RB-F003` | `P0` | `§2.3` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `NON-WORK-AND-UNIQUE-UNION` | `MATH-003,MATH-004` | `MSAF-20260829-F003,MSAF-20260829-F007,MSAF-20260829-F010,MSAF-20260829-F014` | `§2.3.6` | `open-review-finding` | `TRD2-MATH-RB-F003` |
| `TRD2-MATH-RB-F004` | `P0` | `§2.4` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `FIVE-DENOMINATORS` | `MATH-007,MATH-008,MATH-009,MATH-010,MATH-011,MATH-012` | `MSAF-20260829-F008,MSAF-20260829-F010,MSAF-20260829-F015,MSAF-20260829-F024` | `§2.4.6` | `open-review-finding` | `TRD2-MATH-RB-F004` |
| `TRD2-MATH-RB-F005` | `P0` | `§2.5` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `CREDIT-PREDICATE` | `MATH-005` | `MSAF-20260829-F008,MSAF-20260829-F018,MSAF-20260829-F019` | `§2.5.6` | `open-review-finding` | `TRD2-MATH-RB-F005` |
| `TRD2-MATH-RB-F006` | `P0` | `§2.6` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `COUNT-WEIGHT-GATE-NO-BLEND` | `MATH-012,MATH-013,MATH-014` | `MSAF-20260829-F008,MSAF-20260829-F009` | `§2.6.6` | `open-review-finding` | `TRD2-MATH-RB-F006` |
| `TRD2-MATH-RB-F007` | `P0` | `§2.7` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `ACTUAL-EVENT-LEDGER` | `MATH-015` | `MSAF-20260829-F021` | `§2.7.6` | `open-review-finding` | `TRD2-MATH-RB-F007` |
| `TRD2-MATH-RB-F008` | `P0` | `§2.8` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `ETC-REMAINING-GROSS` | `MATH-016,MATH-017,MATH-018` | `MSAF-20260829-F003,MSAF-20260829-F004,MSAF-20260829-F021,MSAF-20260829-F022` | `§2.8.6` | `open-review-finding` | `TRD2-MATH-RB-F008` |
| `TRD2-MATH-RB-F009` | `P0` | `§2.9` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `REJECTED-GENERATION-AND-REWORK` | `MATH-006,MATH-020` | `MSAF-20260829-F002,MSAF-20260829-F019,MSAF-20260829-F021` | `§2.9.6` | `open-review-finding` | `TRD2-MATH-RB-F009` |
| `TRD2-MATH-RB-F010` | `P0` | `§2.10` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `EXTERNAL-WAIT-BOUNDS` | `MATH-025` | `MSAF-20260829-F016,MSAF-20260829-F017` | `§2.10.6` | `open-review-finding` | `TRD2-MATH-RB-F010` |
| `TRD2-MATH-RB-F011` | `P0` | `§2.11` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `DETERMINISTIC-FEASIBLE-SCHEDULE` | `MATH-021,MATH-026,MATH-027` | `MSAF-20260829-F005,MSAF-20260829-F006,MSAF-20260829-F017` | `§2.11.6` | `open-review-finding` | `TRD2-MATH-RB-F011` |
| `TRD2-MATH-RB-F012` | `P0` | `§2.12` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `UNKNOWN-AND-PUBLICATION` | `MATH-031,MATH-032` | `MSAF-20260829-F003,MSAF-20260829-F004,MSAF-20260829-F008,MSAF-20260829-F009,MSAF-20260829-F025` | `§2.12.6` | `open-review-finding` | `TRD2-MATH-RB-F012` |

## 2.2 P1

| reportLocalId | severity | reportSection | subjectRoot | defectClass | sourceContractIds | sourceFindingIds | closurePredicateLocator | status | noMergeKey |
|---|---:|---:|---|---|---|---|---|---|---|
| `TRD2-MATH-RB-F013` | `P1` | `§3.1` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `SUBJECT-FREEZE-STATE` | `MATH-029,MATH-030` | `MSAF-20260829-F019,MSAF-20260829-F025` | `§3.1.6` | `open-review-finding` | `TRD2-MATH-RB-F013` |
| `TRD2-MATH-RB-F014` | `P1` | `§3.2` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `DOMAIN-CLASSIFICATION-BOUNDARY` | `MATH-001,MATH-007,MATH-008,MATH-009,MATH-010,MATH-011` | `MSAF-20260829-F002,MSAF-20260829-F020,MSAF-20260829-F024` | `§3.2.6` | `open-review-finding` | `TRD2-MATH-RB-F014` |
| `TRD2-MATH-RB-F015` | `P1` | `§3.3` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `TASK-LEAF-ATOMICITY` | `MATH-001,MATH-003,MATH-018` | `MSAF-20260829-F001,MSAF-20260829-F013` | `§3.3.6` | `open-review-finding` | `TRD2-MATH-RB-F015` |
| `TRD2-MATH-RB-F016` | `P1` | `§3.4` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `SCHEDULE-GRAPH-VALIDITY` | `MATH-021` | `MSAF-20260829-F005,MSAF-20260829-F026` | `§3.4.6` | `open-review-finding` | `TRD2-MATH-RB-F016` |
| `TRD2-MATH-RB-F017` | `P1` | `§3.5` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `CAPACITY-CALENDAR-FUNCTION` | `MATH-022` | `MSAF-20260829-F006,MSAF-20260829-F024,MSAF-20260829-F025` | `§3.5.6` | `open-review-finding` | `TRD2-MATH-RB-F017` |
| `TRD2-MATH-RB-F018` | `P1` | `§3.6` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `ASSIGNMENT-FEASIBILITY` | `MATH-023` | `MSAF-20260829-F006,MSAF-20260829-F020` | `§3.6.6` | `open-review-finding` | `TRD2-MATH-RB-F018` |
| `TRD2-MATH-RB-F019` | `P1` | `§3.7` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `MUTEX-BOUNDARY-COVERAGE` | `MATH-024` | `MSAF-20260829-F006,MSAF-20260829-F017,MSAF-20260829-F023` | `§3.7.6` | `open-review-finding` | `TRD2-MATH-RB-F019` |
| `TRD2-MATH-RB-F020` | `P1` | `§3.8` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `SCHEDULE-SNAPSHOT-FRESHNESS` | `MATH-029,MATH-030` | `MSAF-20260829-F019,MSAF-20260829-F025` | `§3.8.6` | `open-review-finding` | `TRD2-MATH-RB-F020` |
| `TRD2-MATH-RB-F021` | `P1` | `§3.9` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `SERVICE-LIFECYCLE-SCHEDULE` | `MATH-011,MATH-022` | `MSAF-20260829-F024` | `§3.9.6` | `open-review-finding` | `TRD2-MATH-RB-F021` |
| `TRD2-MATH-RB-F022` | `P1` | `§3.10` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `PLANNING-GENERATION-BOUNDARY` | `MATH-009` | `MSAF-20260829-F001,MSAF-20260829-F002,MSAF-20260829-F013` | `§3.10.6` | `open-review-finding` | `TRD2-MATH-RB-F022` |

## 2.3 P2

| reportLocalId | severity | reportSection | subjectRoot | defectClass | sourceContractIds | sourceFindingIds | closurePredicateLocator | status | noMergeKey |
|---|---:|---:|---|---|---|---|---|---|---|
| `TRD2-MATH-RB-F023` | `P2` | `§4.1` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `UNCERTAINTY-AND-VARIANCE` | `MATH-019,MATH-020` | `MSAF-20260829-F022` | `§4.1.6` | `open-review-finding` | `TRD2-MATH-RB-F023` |
| `TRD2-MATH-RB-F024` | `P2` | `§4.2` | `2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a` | `CRITICAL-SLACK-BOTTLENECK` | `MATH-028` | `MSAF-20260829-F023` | `§4.2.6` | `open-review-finding` | `TRD2-MATH-RB-F024` |

# 3. QA invariants

## 3.1 Cardinality

3.1.1 קבוצת המזהים חייבת להיות בדיוק `TRD2-MATH-RB-F001`–`TRD2-MATH-RB-F024`, ללא חור או כפילות.

3.1.2 התפלגות Severity חייבת להיות `P0=12`, ‏`P1=10`, ‏`P2=2`, ‏`P3=0`.

3.1.3 כל `reportSection` ו־`closurePredicateLocator` חייבים להיפתר בתוך דוח Root שב־1.1.2.

## 3.2 Identity safety

3.2.1 כל `subjectRoot` חייב להיות בדיוק Root שב־1.1.3.

3.2.2 כל `noMergeKey` חייב להיות זהה ל־`reportLocalId` באותה רשומה.

3.2.3 אין Range מקור בטבלה. למרות ההרחבה, הטבלה לבדה אינה Reconciliation artifact ואינה סוגרת Finding.

## 3.3 Disposition

3.3.1 `reviewResult=REJECT`; כל 24 הרשומות פתוחות.

3.3.2 Product completion, Remaining person-hours, Critical path ו־Calendar ETA=`unknown/unavailable`.

3.3.3 `Gate29=BLOCKED`; `Development freeze=ACTIVE`.
