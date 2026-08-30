# 1. Connect — דרישות מחייבות ל־BCA-2 Bootstrap/Lifecycle Successor

## 1.1 זהות והכרעה

1.1.1 `artifactId=CONNECT-BCA2-SUCCESSOR-REQUIREMENTS-2026-08-29`.

1.1.2 נושא הביקורת הוא `/Users/tal/Documents/connect/web/docs/planning/section-35-6-bootstrap-and-candidate-generation-architecture-2026-08-29.md`, ‏raw SHA-256=`3341f8aefad38f52921287ccc6224b7ab8a5b1c17e730b420508812b72d7fac6`.

1.1.3 מצב נושא הביקורת נשאר `BCA-1.0-draft / DRAFT-NOT-REVIEWED-NOT-ACCEPTED`.

1.1.4 הכרעת הביקורת היא `USEFUL-CONCEPTUAL-DRAFT-BUT-REJECT-AS-BCA2-ACCEPTANCE-BASELINE`.

1.1.5 הסיבה: BCA-1 מפריד נכון בין Bootstrap, Lifecycle, Planning generation ו־Program work, אך אינו מספק Registries קנוניים ל־Act instances, Denominators, Edges, Resources, Waits, Finding dispositions, A01–A09, Public-repository hardening או Acceptance generations.

1.1.6 מסמך זה הוא תכנון בלבד. הוא אינו משנה את BCA-1, אינו יוצר BCA-2, אינו מאשר Gate 29 ואינו מאשר Product code, Git mutation, Push, Merge, Deployment, ספק, Credential או שינוי Visibility.

## 1.2 מקורות הביקורת

1.2.1 Master input: `/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`, ‏SHA-256=`643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

1.2.2 Schedule audit: `/Users/tal/Documents/connect/web/docs/planning/master-plan-schedule-and-estimate-audit-2026-08-29.md`, ‏SHA-256=`35869ec7bbd04eaf5db3f7e6637276bb7d35c7d942f20fc6ab1457c24da95fee`.

1.2.3 Schedule findings manifest: `/Users/tal/Documents/connect/web/docs/planning/master-plan-schedule-audit-findings-manifest-2026-08-29.md`, ‏SHA-256=`efba1c56115b8a1ddcb8a042baf4a410321b09bd850fcda5d0b85df2757cf4d7`.

1.2.4 Structural audit: `/Users/tal/Documents/connect/web/docs/planning/master-plan-structural-audit-2026-08-29.md`, ‏SHA-256=`6438c5b8fbf92d41d923884ae587abfc08b19507539f8260055194bd86533b4b`.

1.2.5 Structural findings manifest: `/Users/tal/Documents/connect/web/docs/planning/master-plan-structural-audit-findings-manifest-2026-08-29.md`, ‏SHA-256=`1b8a196dc7ba6c2a647cf100d382d3f9ace7dd38fcf6fc97ec27fb6ac44329e8`.

1.2.6 Task Registry Definition candidate: `/Users/tal/Documents/connect/web/docs/planning/section-35-6-task-registry-definition-candidate-2026-08-29.md`, ‏SHA-256=`1e3b0a3d64a60108db358d52d98b399e8739e489a3ebb6742e9b10f20ea60beb`.

1.2.7 Recovery ledger snapshot: `/Users/tal/Documents/connect/web/docs/planning/master-plan-recovery-ledger-2026-08-29.md`, ‏SHA-256 שנצפה=`0fbdfa864ce0a78edfbc22fcdc2199638e6500adae1199dc9a11aaba024d8507`; BCA-2 חייב להקפיא אותו מחדש בזמן בניית Candidate ואסור להסתמך על ה־`unknown/unavailable` שב־BCA-1 §1.1.5.

1.2.8 D18-A2: `/Users/tal/Documents/connect/web/docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md`, ‏SHA-256=`448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`.

## 1.3 חוזה דרישה

1.3.1 כל דרישה בסעיפים 2–10 כוללת `requirementId` בכותרת ה־Markdown שלה, ואחריו בדיוק שדה `rule`, שדה `sourceFindingIds` ושדה `acceptancePredicate`.

1.3.2 `sourceFindingIds` משתמש במזהי `SCHED-F001–SCHED-F026` ובמזהי `MPSA-20260829-*`; הוא אינו סוגר אותם ואינו ממזג Findings בעלי נושא דומה.

1.3.3 כל Predicate נבדק על BCA-2 Subject root קפוא ועל Evidence bundle חיצוני הקשור אליו. כשל, חסר או אי־ודאות מחזירים `FAIL/BLOCKED`, לא Success משוער.

# 2. גבול Subject ו־Generation

## 2.1 `BCA2-REQ-001` — Subject אינו מכיל את יוצריו

2.1.1 `rule`: BCA-2 רשאי להכיל `ActDefinition` templates, Schemas ו־Invariants בלבד. אף `ActInstance` שמחבר, מקפיא, מפרש, בודק, סוקר, מיישב או מאשר את BCA-2 עצמו אינו Member, Ancestor או Descendant של `BCA2SubjectRoot`.

2.1.2 `sourceFindingIds`: `SCHED-F002`; `MPSA-20260829-P0-002`.

2.1.3 `acceptancePredicate`: `PASS` רק אם Membership traversal מן `BCA2SubjectRoot` מחזיר אפס Act instances של Generation BCA-2, ואילו AcceptanceEnvelope החיצוני קושר אותם בלי להיכלל ב־Subject bytes.

## 2.2 `BCA2-REQ-002` — סמכות Bootstrap חיצונית

2.2.1 `rule`: Act instances שמייצרים BCA-2 יקבלו סמכות מ־`BootstrapAuthorityEnvelope B0` חיצוני הקשור למנדט התכנון של Tal, ל־SourceFreezeRoot ול־Policy version; B0 אינו טוען שאושר בידי BCA-2.

2.2.2 `sourceFindingIds`: `SCHED-F002`; `MPSA-20260829-P0-002`.

2.2.3 `acceptancePredicate`: `PASS` רק אם לכל BCA-2 authoring instance יש Authority edge ל־B0, אין Authority edge מ־BCA-2 אל יוצריו, ו־B0 מקבל Receipt חיצוני עצמאי.

## 2.3 `BCA2-REQ-003` — Successor generation בלבד

2.3.1 `rule`: שינוי Review ל־BCA-2 אינו Patch in place. הוא דוחה את Root הנבדק ויוצר `BCA-2-Candidate(n+1)` עם Parent candidate, Delta manifest ו־Root חדשים.

2.3.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F019`, `SCHED-F025`; `MPSA-20260829-P0-002`, `MPSA-20260829-P2-002`.

2.3.3 `acceptancePredicate`: `PASS` רק אם כל Receipt מפנה ל־Root אחד, כל Byte change פותח Generation חדש, ואין Receipt שנשמר לאחר שינוי Subject או Source root.

## 2.4 `BCA2-REQ-004` — Template לעומת Instance

2.4.1 `rule`: `ActDefinitionId` מזהה Template יציב; `ActInstanceId` נגזר דטרמיניסטית מ־Template ID, ‏Generation ID, ‏Subject root ו־Occurrence number. Template אינו מקבל Hours, Actuals, Status או Credit.

2.4.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F007`, `SCHED-F013`, `SCHED-F018`; `MPSA-20260829-P0-001`, `MPSA-20260829-P0-002`.

2.4.3 `acceptancePredicate`: `PASS` רק אם Schema חוסם Hours/Status/Credit ב־Template, כל Instance פותר ל־Template אחד, ו־Instance ID נשחזר מאותם Inputs ללא Randomness.

## 2.5 `BCA2-REQ-005` — Acceptance Envelope מחוץ ל־Subject

2.5.1 `rule`: QA, Reviews, Reconciliation, Veto, Tal approval, CAS ו־Readbacks נשמרים ב־`AcceptanceEnvelope` חיצוני; Subject אינו מכיל שדות `pending→approved` שמשתנים לאחר Freeze.

2.5.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F009`, `SCHED-F018`; `MPSA-20260829-P0-002`, `MPSA-20260829-P1-007`.

2.5.3 `acceptancePredicate`: `PASS` רק אם שינוי מצב קבלה משנה Envelope/Pointer בלבד, Raw SHA של Subject נשאר זהה לפני ואחרי Acceptance, ו־Version promotion אינו משנה Subject bytes.

## 2.6 `BCA2-REQ-006` — הפרדת BCA-2 מ־Gate 29

2.6.1 `rule`: קבלת BCA-2 מאשרת Architecture contract בלבד. Gate 29 נשאר חסום עד Definition, Planning Generation Plan, Program Registry, A07/A09, Reviews, Finding dispositions ו־Master Candidate נפרדים.

2.6.2 `sourceFindingIds`: `SCHED-F001`, `SCHED-F009`; `MPSA-20260829-P0-001`, `MPSA-20260829-P0-003`, `MPSA-20260829-P0-005`.

2.6.3 `acceptancePredicate`: `PASS` רק אם BCA-2 receipt מצהיר במפורש `Gate29Authority=false`, ואין קוד או Predicate שמתרגם BCA-2 Accepted ל־Gate29 PASS.

# 3. ActDefinitions שחייבים להיכנס ל־BCA-2

## 3.1 `BCA2-REQ-007` — חוזה ActDefinition מלא

3.1.1 `rule`: כל ActDefinition כולל `templateId`, ‏`domain`, ‏`singleAction`, ‏`inputTypes`, ‏`primaryOutputType`, ‏`evidenceType`, ‏`allowedPredecessorTypes`, ‏`resourceEligibility`, ‏`conflicts`, ‏`estimateBasisRequired`, ‏`tests`, ‏`acceptance`, ‏`failureTerminal`, ‏`retryPolicy`, ‏`invalidationTriggers` ו־`schemaVersion`.

3.1.2 `sourceFindingIds`: `SCHED-F001`, `SCHED-F013`, `SCHED-F020`, `SCHED-F022`; `MPSA-20260829-P0-001`, `MPSA-20260829-P0-005`.

3.1.3 `acceptancePredicate`: `PASS` רק אם כל ActDefinition עובר 16/16 שדות ללא ירושה, פעולה יחידה, Output יחיד ו־Failure terminal מפורש.

## 3.2 `BCA2-REQ-008` — Bootstrap authoring catalog

3.2.1 `rule`: BCA-2 מכיל בדיוק את Bootstrap Act templates הבאים; Instances של BCA-2 עצמו נשארים מחוץ ל־Subject:

| Template ID | פעולה יחידה |
|---|---|
| `BA-001-SOURCE-FREEZE` | לקבע את כל Inputs וה־Digests |
| `BA-002-REPO-AUTHORITY` | ליישב Root/Branch/Remote authority |
| `BA-003-TEMP-EVIDENCE-CLASSIFY` | לסווג מקורות זמניים כבלתי־קבילים |
| `BA-004-DECISION-DELTA-INGEST` | לקלוט Decisions ו־Finding manifests חדשים |
| `BA-005-STRUCTURAL-INVENTORY` | להפיק Inventory מבני נוכחי |
| `BA-006-STRUCTURAL-AUDIT` | לבצע ביקורת מבנית עצמאית |
| `BA-007-SECURITY-AUDIT` | לבצע ביקורת Security-semantic עצמאית |
| `BA-008-SCHEDULE-AUDIT` | לבצע ביקורת Schedule/Estimate עצמאית |
| `BA-009-AUDIT-COMPARISON` | להשוות Assertion universes |
| `BA-010-DEFINITION-REQUIREMENTS` | להפיק Requirement manifest |
| `BA-011-IDENTITY-SCHEMAS` | להפיק Identity-domain schemas |
| `BA-012-ACCOUNTING-SCHEMAS` | להפיק Denominator/Credit schemas |
| `BA-013-GRAPH-SCHEMAS` | להפיק Edge/Gate/Scope schemas |
| `BA-014-RESOURCE-WAIT-SCHEMAS` | להפיק Resource/Calendar/Mutex/Wait schemas |
| `BA-015-ACCEPTANCE-SCHEMAS` | להפיק Generation/Envelope/CAS schemas |
| `BA-016-SUBJECT-MATERIALIZATION` | להרכיב Candidate bytes בלבד |

3.2.2 `sourceFindingIds`: `SCHED-F001`, `SCHED-F002`, `SCHED-F005`, `SCHED-F006`, `SCHED-F016`; `MPSA-20260829-P0-001`, `MPSA-20260829-P0-002`, `MPSA-20260829-P0-005`.

3.2.3 `acceptancePredicate`: `PASS` רק אם 16/16 Templates קיימים פעם אחת, כל BCA-1 B001–B010 ממופה לפחות ל־Template אחד בלי Alias hours, ו־BA-016 אינו כולל Review או Acceptance.

## 3.3 `BCA2-REQ-009` — Candidate lifecycle catalog

3.3.1 `rule`: BCA-2 מכיל בדיוק את Lifecycle templates הבאים; כל שימוש יוצר Instance חיצוני לכל Subject generation:

| Template ID | פעולה יחידה |
|---|---|
| `CL-001-SUBJECT-FREEZE` | לקבע Subject, normalized root ו־Evidence root |
| `CL-002-PARSE-A` | לפרש באמצעות Parser A |
| `CL-003-PARSE-B` | לפרש באמצעות Parser B בלתי־תלוי |
| `CL-004-PARSER-COMPARE` | להשוות Outputs של שני Parsers |
| `CL-005-PRODUCER-QA` | להריץ Producer QA |
| `CL-006-ROLE-REQUEST` | לבקש מינויים שמיים |
| `CL-007-ROLE-RECEIPT-VERIFY` | לאמת Receipts של מינויים |
| `CL-008-REVIEW-PACKET-SEAL` | לקבע Packet זהה לשני Reviewers |
| `CL-009-REVIEW-A` | לבצע Review A עצמאי |
| `CL-010-REVIEW-B-ELIGIBILITY` | לחשב Eligibility בינארי בלבד |
| `CL-011-REVIEW-B` | לבצע Review B עיוור מן Packet הקפוא |
| `CL-012-REVIEW-COMPARE` | להשוות את כל Assertions |
| `CL-013-RECONCILE` | ליישב Differences באמצעות Evidence בלבד |
| `CL-014-VETO-DISPOSITION` | לקבע Veto ו־Residual-risk disposition |
| `CL-015-TAL-APPROVAL-REQUEST` | להציג את ה־Roots המדויקים לטל |
| `CL-016-TAL-APPROVAL-OBSERVE` | לאמת תשובת Tal מדויקת |
| `CL-017-ACCEPTANCE-CAS` | לבצע CAS מול Expected head/epoch |
| `CL-018-READBACK-A` | לבצע Authoritative readback ראשון |
| `CL-019-READBACK-B` | לבצע Readback עצמאי שני |
| `CL-020-TERMINAL-RECONCILE` | להכריע Accepted או Rejected יחיד |

3.3.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F009`, `SCHED-F018`, `SCHED-F020`; `MPSA-20260829-P0-002`.

3.3.3 `acceptancePredicate`: `PASS` רק אם 20/20 Templates קיימים, BCA-1 B011–B030 מקבל Crosswalk אחד־לאחד, וכל Instance נמצא רק ב־Lifecycle denominator של Generation שלו.

## 3.4 `BCA2-REQ-010` — Planning-generation catalog

3.4.1 `rule`: BCA-2 מכיל את PlanningGenerationTask templates הבאים: `PG-001-SOURCE-PARTITION`, ‏`PG-002-STAGE-OBLIGATION`, ‏`PG-003-FINDING-CLASSIFICATION`, ‏`PG-004-SCOPE-MANIFEST`, ‏`PG-005-CONDITIONAL-INSTANCES`, ‏`PG-006-PROGRAM-LEAF`, ‏`PG-007-CROSSWALK`, ‏`PG-008-DEPENDENCY-EDGE`, ‏`PG-009-RESOURCE-ASSIGNMENT`, ‏`PG-010-EXTERNAL-WAIT`, ‏`PG-011-SCHEDULE-SNAPSHOT`, ‏`PG-012-MASTER-ASSEMBLY-INPUT`.

3.4.2 `sourceFindingIds`: `SCHED-F001`, `SCHED-F005`, `SCHED-F010`, `SCHED-F014`, `SCHED-F015`; `MPSA-20260829-P0-001`, `MPSA-20260829-P0-003`, `MPSA-20260829-P0-004`.

3.4.3 `acceptancePredicate`: `PASS` רק אם 12/12 Templates קיימים, כל Instance הוא עלה של עד שמונה שעות, וכל Output של G2 הופך Input ל־G3 ואינו משנה את G2 root.

## 3.5 `BCA2-REQ-011` — Public-repository catalog

3.5.1 `rule`: BCA-2 מכיל Templates נפרדים: `PUB-001-DECISION-CROSSWALK`, ‏`PUB-002-CONTENT-HISTORY-CLASSIFY`, ‏`PUB-003-RULESET-ACTIONS-PLAN`, ‏`PUB-004-SCANNING-PLAN`, ‏`PUB-005-LICENSE-NOTICE-DECISION`, ‏`PUB-006-EVIDENCE-BOUNDARY`, ‏`PUB-007-EXACT-DIFF-PUSH-PERMIT`, ‏`PUB-008-INDEPENDENT-LIVE-READBACK`.

3.5.2 `sourceFindingIds`: `SCHED-F011`, `SCHED-F012`; `MPSA-20260829-P0-007`, `MPSA-20260829-P1-009`, `MPSA-20260829-P1-010`.

3.5.3 `acceptancePredicate`: `PASS` רק אם 8/8 Templates קיימים, אין Template לשינוי Visibility, ו־PUB-007 תלוי בכל Evidence/Review הנדרש ואינו אישור Push כללי.

## 3.6 `BCA2-REQ-012` — Artifact ו־A09 catalog

3.6.1 `rule`: BCA-2 מגדיר `ARTIFACT-A01`–`ARTIFACT-A09` כרשומות נפרדות עם semantics שנגזרים ממקור, ולא ממציא meaning חסר. A09 כולל בדיוק Audits: `AUD-01-SCHEMA`, ‏`AUD-02-NUMBERING-PARENT-GAP`, ‏`AUD-03-REFERENCE`, ‏`AUD-04-IDENTITY-DUPLICATE`, ‏`AUD-05-DIGEST-FRESHNESS`, ‏`AUD-06-SOURCE-COVERAGE`, ‏`AUD-07-SCOPE-CONDITIONAL`, ‏`AUD-08-DAG-CYCLE-REACHABILITY`, ‏`AUD-09-OUTPUT-EVIDENCE-COLLISION`, ‏`AUD-10-ESTIMATE-DEDUP-ARITHMETIC`, ‏`AUD-11-RESOURCE-WAIT-FEASIBILITY`, ‏`AUD-12-STATE-GATE-PREDICATE`, ‏`AUD-13-SECURITY-PUBLIC-EXPOSURE`.

3.6.2 `sourceFindingIds`: `SCHED-F001`, `SCHED-F003`, `SCHED-F005`, `SCHED-F007`, `SCHED-F010`, `SCHED-F025`; `MPSA-20260829-P0-005`, `MPSA-20260829-P1-001`, `MPSA-20260829-P1-002`, `MPSA-20260829-P2-003`.

3.6.3 `acceptancePredicate`: `PASS` רק אם A01–A09 מקבלים Schema/Producer/Inputs/Output/Digest/Acceptance/Review, כל 13 Audit IDs מופיעים פעם אחת, והרכב A08 נגזר מ־IDs בלי Magic count.

# 4. Identity domains

## 4.1 `BCA2-REQ-013` — Work identity domains

4.1.1 `rule`: BCA-2 מגדיר Prefix ו־Schema נפרדים ל־`BootstrapActInstance`, ‏`CandidateLifecycleActInstance`, ‏`PlanningGenerationTask`, ‏`ProgramTask` ו־`ServiceLifecycleTask`; אין ID שחוצה Domain.

4.1.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F007`, `SCHED-F024`, `SCHED-F026`; `MPSA-20260829-P0-002`, `MPSA-20260829-P2-004`.

4.1.3 `acceptancePredicate`: `PASS` רק אם 5/5 Domains קיימים, ID parser מזהה Domain יחיד לכל ID, ו־Cross-domain collision test מחזיר אפס.

## 4.2 `BCA2-REQ-014` — Generation ו־Root identities

4.2.1 `rule`: להגדיר `AuthorityEpochId`, ‏`GenerationId`, ‏`SubjectCandidateId`, ‏`SubjectRoot`, ‏`EvidenceBundleRoot`, ‏`AcceptanceEnvelopeId`, ‏`AcceptedRootPointerId` ו־`ParentAcceptedRoot` כישויות נפרדות.

4.2.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F018`, `SCHED-F025`; `MPSA-20260829-P0-002`, `MPSA-20260829-P1-007`.

4.2.3 `acceptancePredicate`: `PASS` רק אם Root graph אינו מחזורי, כל Generation אחרי Genesis מפנה ל־Parent accepted root אחד, ו־Pointer אינו Member ב־Root שאליו הוא מצביע.

## 4.3 `BCA2-REQ-015` — Source, Artifact, Output ו־Evidence identities

4.3.1 `rule`: `SourceRecord`, ‏`ArtifactDefinition`, ‏`ArtifactInstance`, ‏`ProductOutput`, ‏`EvidenceArtifact` ו־`Receipt` מקבלים Domains נפרדים; Product output אינו Evidence, ו־Evidence required אינו זמני.

4.3.2 `sourceFindingIds`: `SCHED-F013`, `SCHED-F019`, `SCHED-F025`; `MPSA-20260829-P0-005`, `MPSA-20260829-P2-002`, `MPSA-20260829-P2-003`.

4.3.3 `acceptancePredicate`: `PASS` רק אם כל Identity פותר ל־Type אחד, required Evidence נמצא בנתיב עמיד עם Digest, וכל Historical artifact קשור ל־`appliesToDigest` שאינו Current אוטומטית.

## 4.4 `BCA2-REQ-016` — Scope, Package, Gate ו־Finding identities

4.4.1 `rule`: להגדיר Domains נפרדים ל־`ScopeManifest`, ‏`PackageTemplate`, ‏`PackageInstance`, ‏`GateDefinition`, ‏`GateInstance`, ‏`FindingRecord`, ‏`DecisionRecord`, ‏`RiskRecord` ו־`ControlRecord`.

4.4.2 `sourceFindingIds`: `SCHED-F010`, `SCHED-F015`, `SCHED-F018`, `SCHED-F026`; `MPSA-20260829-P0-003`, `MPSA-20260829-P1-003`, `MPSA-20260829-P1-008`, `MPSA-20260829-P2-001`, `MPSA-20260829-P2-004`.

4.4.3 `acceptancePredicate`: `PASS` רק אם אין Free Gate name, Gate 6 shorthand או textual Scope query, וכל Reference פותר ל־ID ו־Version יחידים.

## 4.5 `BCA2-REQ-017` — Resource ו־Wait identities

4.5.1 `rule`: להגדיר `PersonId`, ‏`RoleId`, ‏`SkillId`, ‏`CapacityCalendarId`, ‏`AssignmentId`, ‏`MutexId`, ‏`ExternalWaitTemplateId` ו־`ExternalWaitInstanceId` כ־Domains שאינם Work IDs.

4.5.2 `sourceFindingIds`: `SCHED-F005`, `SCHED-F006`, `SCHED-F016`, `SCHED-F017`, `SCHED-F020`; `MPSA-20260829-P0-004`.

4.5.3 `acceptancePredicate`: `PASS` רק אם שום Resource/Wait מקבל Product credit או Person-hours, וכל Assignment/Wait פותר ל־Task/Act קיים.

## 4.6 `BCA2-REQ-018` — State, Actual, ETC ו־Credit identities

4.6.1 `rule`: `AdmissionState`, ‏`ExecutionStatus`, ‏`CreditState`, ‏`ActualEvent`, ‏`EstimateRevision` ו־`RemainingSnapshot` הם Axes/records נפרדים; Compound free-text status אסור.

4.6.2 `sourceFindingIds`: `SCHED-F008`, `SCHED-F018`, `SCHED-F021`, `SCHED-F025`; `MPSA-20260829-P0-003`, `MPSA-20260829-P1-004`, `MPSA-20260829-P2-001`.

4.6.3 `acceptancePredicate`: `PASS` רק אם כל State עובר Enum version, כל Transition חוקי, Draft/Rejected/Superseded מקבלים Credit=0, ו־Actual/ETC records הם append-only/versioned.

# 5. Denominators ו־Accounting

## 5.1 `BCA2-REQ-019` — Bootstrap denominator

5.1.1 `rule`: `BootstrapDenominator(B0)` הוא Set קפוא של Bootstrap Act instance IDs שאושר מחוץ ל־Subject. הוא כולל Authoring/QA/Review effort של Genesis פעם אחת בלבד ואינו Product completion.

5.1.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F007`, `SCHED-F008`; `MPSA-20260829-P0-002`.

5.1.3 `acceptancePredicate`: `PASS` רק אם Denominator הוא Set מפורש בעל Root, כל ID נספר פעם אחת, ו־BCA-2 Subject אינו Member בו.

## 5.2 `BCA2-REQ-020` — Lifecycle denominator לכל Generation

5.2.1 `rule`: `LifecycleDenominator(generationId)` כולל Authoring, Freeze, Parsing, Producer QA, Review A/B, Comparison, Reconciliation, Approval preparation, CAS ו־Readbacks של Generation בלבד. Review effort אינו נכלל ב־Subject או ב־Implementer estimate.

5.2.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F007`, `SCHED-F020`; `MPSA-20260829-P0-002`.

5.2.3 `acceptancePredicate`: `PASS` רק אם לכל Lifecycle instance יש Generation יחיד, Reviews נספרים בנפרד מן Producer, ו־Union על IDs שווה לסכום המדווח ללא Self-membership.

## 5.3 `BCA2-REQ-021` — Planning-generation denominator

5.3.1 `rule`: `PlanningGenerationDenominator(generationPlanRoot)` כולל רק accepted PG task instances; הוא אינו Product implementation ואינו כולל Lifecycle acts שמאשרים את Generation Plan.

5.3.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F008`, `SCHED-F014`; `MPSA-20260829-P0-001`, `MPSA-20260829-P0-002`.

5.3.3 `acceptancePredicate`: `PASS` רק אם PG set סופי וקפוא, כל Task עד שמונה שעות, ו־Lifecycle membership intersection הוא Empty set.

## 5.4 `BCA2-REQ-022` — Program denominator לפי Scope

5.4.1 `rule`: `ProgramDenominator(scopeManifestRoot)` הוא Union של ProgramTask IDs המדויקים ב־Scope 1, 3 או 4 המאושר; PackageTemplate אינו נכלל ורק PackageInstance מופעל רשאי להוסיף Tasks.

5.4.2 `sourceFindingIds`: `SCHED-F001`, `SCHED-F007`, `SCHED-F010`, `SCHED-F015`; `MPSA-20260829-P0-001`, `MPSA-20260829-P1-006`.

5.4.3 `acceptancePredicate`: `PASS` רק אם Scope membership ניתן ל־Enumeration, Templates/Disabled capabilities אינם נספרים כמימוש, ו־Scope total משוחזר מ־Unique Work IDs.

## 5.5 `BCA2-REQ-023` — Service lifecycle denominator

5.5.1 `rule`: Recurring maintenance, patching, restore drills, source refresh, on-call ו־cost review נרשמים ב־`ServiceLifecycleDenominator(serviceEpoch)` נפרד ואינם חלק מאחוז Build.

5.5.2 `sourceFindingIds`: `SCHED-F024`; `MPSA-20260829-P0-001`.

5.5.3 `acceptancePredicate`: `PASS` רק אם לכל Obligation פעילה יש Cadence, Owner, Capacity ו־Task template, ו־Build denominator intersection הוא Empty set.

## 5.6 `BCA2-REQ-024` — External waits אינם Hours

5.6.1 `rule`: Wait ו־Observation duration נשמרים כ־Calendar nodes עם אפס Engineering effort. Request, follow-up ו־receipt verification הם Work instances נפרדים.

5.6.2 `sourceFindingIds`: `SCHED-F016`, `SCHED-F017`; `MPSA-20260829-P0-002`.

5.6.3 `acceptancePredicate`: `PASS` רק אם Wait personHours=0, אין Wait בתוך Work denominator, וכל Human activity סביב Wait מקבלת Work ID נפרד.

## 5.7 `BCA2-REQ-025` — Progress vector ותיקון 0/30

5.7.1 `rule`: BCA-1 `accepted acts/total accepted acts` ו־`0/30` אינם Baseline קנוני. BCA-2 מדווח לכל Domain `credited accepted instances / all admitted baseline instances`; עד קבלת Denominator הערך `unknown/unavailable`.

5.7.2 `sourceFindingIds`: `SCHED-F008`, `SCHED-F018`, `SCHED-F019`; `MPSA-20260829-P0-001`, `MPSA-20260829-P0-002`.

5.7.3 `acceptancePredicate`: `PASS` רק אם אין Denominator שמוגדר לפי completed/accepted numerator, ‏`0/30` מסומן Historical draft count בלבד, ואין Overall blended percent.

## 5.8 `BCA2-REQ-026` — Estimate, Actual ו־No-double-count

5.8.1 `rule`: כל Estimate נצמד ל־Work instance עם Basis; Actuals נשמרים Append-only; Remaining נגזר מ־ETC; Parent/Alias/Template מקבלים אפס Hours. End-to-end effort הוא Union של Work IDs ולא סכום Totals מודפסים.

5.8.2 `sourceFindingIds`: `SCHED-F003`, `SCHED-F004`, `SCHED-F007`, `SCHED-F014`, `SCHED-F021`, `SCHED-F022`; `MPSA-20260829-P1-006`.

5.8.3 `acceptancePredicate`: `PASS` רק אם Duplicate count אפס, Canceled ROM אינו Current input, כל Estimate כולל Basis, וכל Remaining snapshot קשור ל־Actual-cut digest.

# 6. Dependency graph ו־Critical path

## 6.1 `BCA2-REQ-027` — Edge registry typed

6.1.1 `rule`: כל Edge הוא Record עם `edgeId`, ‏`fromId`, ‏`toId`, ‏`relation=FS|SS|FF`, ‏`lag`, ‏`condition`, ‏`sourceReason`, ‏`generationConstraint` ו־`scopeApplicability`; Brackets/arrows מ־BCA-1 §5.1 אינם Source of truth.

6.1.2 `sourceFindingIds`: `SCHED-F005`, `SCHED-F017`, `SCHED-F026`; `MPSA-20260829-P0-004`, `MPSA-20260829-P2-004`.

6.1.3 `acceptancePredicate`: `PASS` רק אם כל Arrow נרטיבי ממופה ל־Edge IDs, ואין Dangling, Duplicate, Self-edge או Relation לא חוקי.

## 6.2 `BCA2-REQ-028` — Generation constraints

6.2.1 `rule`: Work שמייצר Generation n מוסמך רק מ־B0 או Accepted root מוקדם יותר; Review/Acceptance של n אינם Predecessors בתוך Subject n; Output של n יכול להיכנס רק ל־Candidate n+1.

6.2.2 `sourceFindingIds`: `SCHED-F002`; `MPSA-20260829-P0-002`.

6.2.3 `acceptancePredicate`: `PASS` רק אם Generation graph Acyclic, אין Future-generation authority, ואין Path מן Subject אל Act שמייצר אותו וחזרה.

## 6.3 `BCA2-REQ-029` — Lifecycle topology

6.3.1 `rule`: לכל Generation הטופולוגיה היא `Freeze→[ParseA,ParseB]→ParserCompare→ProducerQA→RoleRequest→WaitRole→RoleVerify→PacketSeal→ReviewA→Eligibility→ReviewB→ReviewCompare→Reconcile→Veto→ApprovalRequest→WaitTal→ApprovalObserve→CAS→[ReadbackA,ReadbackB]→TerminalReconcile`.

6.3.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F005`, `SCHED-F016`, `SCHED-F020`; `MPSA-20260829-P0-002`.

6.3.3 `acceptancePredicate`: `PASS` רק אם כל Node הוא Instance מפורש, שני Waits typed, Review B packet הוקפא לפני Review A, וכל שינוי Subject מסיים את המסלול ב־Rejected successor-required.

## 6.4 `BCA2-REQ-030` — Scope DAGs ו־Outbound order

6.4.1 `rule`: BCA-2 דורש DAG נפרד ל־Scope 1/3/4 ומקבע את סדר Outbound: Infra→PostgreSQL/RLS→Identity+Meta→Webhook→capacity→Acquire committed→Consume committed→Proof committed→vault callback→provider attempt→outcome→Gate12.1→Gate12.2.x.

6.4.2 `sourceFindingIds`: `SCHED-F005`, `SCHED-F015`; `MPSA-20260829-P0-004`, `MPSA-20260829-P1-003`, `MPSA-20260829-P1-008`.

6.4.3 `acceptancePredicate`: `PASS` רק אם Topological sort מציב את כל Producers לפני Gate12.1, אין Provider attempt reachable מוקדם, ו־`sent` נשאר תלוי Webhook מאומת.

## 6.5 `BCA2-REQ-031` — Schedule snapshot

6.5.1 `rule`: Scheduler צורך DAG, Assignments, Calendars, Mutexes ו־Waits באותו Graph ומפיק Low/High duration scenarios, Critical/Near-critical paths, Float, Bottlenecks ו־Wait sensitivity.

6.5.2 `sourceFindingIds`: `SCHED-F005`, `SCHED-F006`, `SCHED-F016`, `SCHED-F017`, `SCHED-F023`, `SCHED-F025`; `MPSA-20260829-P0-004`.

6.5.3 `acceptancePredicate`: `PASS` רק אם Snapshot ניתן לשחזור מאותם Digests, אין Post-hoc wait addition, וכל Node קריטי עם Duration/Capacity/Wait upper bound; אחרת ETA upper=`unknown/unavailable`.

## 6.6 `BCA2-REQ-032` — Gate/Artifact reachability

6.6.1 `rule`: כל GateInstance ו־A01–A09 Artifact מקבל Producer predecessor, Acceptance predecessor ו־Downstream consumer; Gate או Artifact ללא Path נדרש הוא Orphan.

6.6.2 `sourceFindingIds`: `SCHED-F005`; `MPSA-20260829-P0-005`, `MPSA-20260829-P1-002`.

6.6.3 `acceptancePredicate`: `PASS` רק אם Reachability audit מחזיר אפס Orphans, אפס broken references וכל A01–A09 נמצא במסלול ל־Gate 29 המתאים.

# 7. Resources, Calendars, Mutexes ו־Waits

## 7.1 `BCA2-REQ-033` — Named people ו־Role eligibility

7.1.1 `rule`: לכל Act/Task יש Primary שמי, Backup שמי או N/A מנומק, Reviewers שמיים, Skills, Access state ו־Conflict matrix; Role placeholder אינו Assignment.

7.1.2 `sourceFindingIds`: `SCHED-F006`, `SCHED-F020`; `MPSA-20260829-P0-002`.

7.1.3 `acceptancePredicate`: `PASS` רק אם כל Required assignment פותר ל־Person פעיל וכשיר, אין Missing role, ו־Producer/Reviewer/Reconciler/Acceptance-writer conflicts הם אפס.

## 7.2 `BCA2-REQ-034` — Capacity calendars

7.2.1 `rule`: לכל Person יש Timezone, Work dates, Net focus minutes, Leave, Support load ו־`validThrough`; Role capacity אינה סכום אנשים לא ממונים.

7.2.2 `sourceFindingIds`: `SCHED-F006`, `SCHED-F025`.

7.2.3 `acceptancePredicate`: `PASS` רק אם כל Scheduled interval מכוסה ב־Calendar תקף, Overallocation אפס, ו־Calendar expiry מסמן Schedule stale.

## 7.3 `BCA2-REQ-035` — Mutex registry

7.3.1 `rule`: BCA-2 מגדיר Mutexes לפחות ל־Canonical repo root, shared boundary file, Migration writer, Production environment, Meta mutation, Billing mutation, Retention execution, Release signing ו־Acceptance CAS writer.

7.3.2 `sourceFindingIds`: `SCHED-F006`, `SCHED-F017`, `SCHED-F023`; `MPSA-20260829-P1-010`.

7.3.3 `acceptancePredicate`: `PASS` רק אם כל Mutex כולל Capacity ו־Scope, אין Overlap מעבר לקיבולת, ו־CAS writer יחיד פעיל לכל Authority epoch.

## 7.4 `BCA2-REQ-036` — ExternalWait schema

7.4.1 `rule`: כל Wait כולל `waitInstanceId`, ‏`authority`, ‏`triggerWorkId`, ‏`owner`, ‏`startedAt`, ‏`minCalendar`, ‏`maxCalendar`, ‏`allowedOverlap`, ‏`completionEvidence`, ‏`expiry`, ‏`escalation`, ‏`safeState` ו־`scope`.

7.4.2 `sourceFindingIds`: `SCHED-F016`, `SCHED-F017`.

7.4.3 `acceptancePredicate`: `PASS` רק אם 13/13 שדות קיימים לכל Wait, Completion receipt קשור ל־Instance, ו־חסר Max במסלול חובה גורם ETA upper=`unknown/unavailable`.

## 7.5 `BCA2-REQ-037` — Wait instances מחייבים ל־BCA-2

7.5.1 `rule`: Envelope החיצוני של BCA-2 יוצר לפחות `WAIT-BCA2-ROLE-APPOINTMENTS` ו־`WAIT-BCA2-TAL-EXACT-ROOT`. `WAIT-PUBLIC-GITHUB-ADMIN-CONTROL` שייך לשרשרת Pre-push החיצונית ואינו מוכרז Completed בתכנון.

7.5.2 `sourceFindingIds`: `SCHED-F012`, `SCHED-F016`; `MPSA-20260829-P0-002`, `MPSA-20260829-P1-009`.

7.5.3 `acceptancePredicate`: `PASS` רק אם שני Waits של BCA-2 קיימים מחוץ ל־Subject עם Receipts, Wait Public נשאר Pending עד Live evidence, ואין Duration מומצא.

## 7.6 `BCA2-REQ-038` — Repeat cycles

7.6.1 `rule`: BCA-1 B023 “per unchanged-root cycle” מוחלף ב־Lifecycle Instance חדש לכל Cycle בעל `iterationNumber`, ‏Parent reconciliation ID, ‏Reason ו־Actuals; אין Aggregate leaf בעל מספר Cycles לא חסום.

7.6.2 `sourceFindingIds`: `SCHED-F013`, `SCHED-F021`, `SCHED-F022`; `MPSA-20260829-P0-002`.

7.6.3 `acceptancePredicate`: `PASS` רק אם כל Cycle עד שמונה שעות ל־Instance, Iteration IDs רציפים, Actuals נשמרים גם לאחר Rejection, ו־Future cycle count אינו משמש ETA קבוע.

# 8. Acceptance, Findings ו־Artifacts

## 8.1 `BCA2-REQ-039` — SourceFreezeManifest

8.1.1 `rule`: לפני Candidate, BCA-2 מקבל SourceFreezeManifest שמונה Path, Raw digest, Schema/version, Authority, checkedAt ו־Freshness לכל המקורות שב־§1.2 ולכל Audit/Decision נוסף שהושלם לפני Freeze.

8.1.2 `sourceFindingIds`: `SCHED-F019`, `SCHED-F025`; `MPSA-20260829-P0-002`, `MPSA-20260829-P0-005`, `MPSA-20260829-P2-002`, `MPSA-20260829-P2-003`.

8.1.3 `acceptancePredicate`: `PASS` רק אם כל Required source נפתר ל־Digest עמיד וטרי, Temporary path count אפס, וכל Source change פוסל את Candidate.

## 8.2 `BCA2-REQ-040` — Parser ו־Producer QA

8.2.1 `rule`: שני Parsers בלתי־תלויים מפיקים Typed models ו־Counts מאותו Root; Producer QA מריץ את 13 ה־Audits, אך אינו נותן Acceptance credit.

8.2.2 `sourceFindingIds`: `SCHED-F001`, `SCHED-F005`, `SCHED-F009`; `MPSA-20260829-P0-001`, `MPSA-20260829-P0-005`.

8.2.3 `acceptancePredicate`: `PASS` רק אם Parser roots/counts זהים, 13/13 Audits PASS, Producer QA receipt חיצוני, ו־Producer אינו Reviewer.

## 8.3 `BCA2-REQ-041` — Review independence ו־Blind review

8.3.1 `rule`: Review A ו־Review B משתמשים באותו Pre-sealed packet; Review B אינו רואה A לפני חתימתו; שני Reviewers אינם Producer, Reconciler או Acceptance writer.

8.3.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F020`; `MPSA-20260829-P0-002`.

8.3.3 `acceptancePredicate`: `PASS` רק אם Packet digest זהה בשני Reviews, Seal timestamp קודם ל־Review A, Conflict matrix אפס, ושתי חתימות קושרות Subject+Evidence roots זהים.

## 8.4 `BCA2-REQ-042` — Finding classification ו־Gate 29

8.4.1 `rule`: לכל Finding יש `findingClass`, ‏`blocksPlanningGate`, ‏`blocksProductGateIds`, ‏`planningDisposition`, ‏`runtimeDisposition`, ‏`closureEvidenceType` ו־`statusEnumVersion`. Gate 29 סוגר Planning-completeness findings; Runtime risks נשארים planned ולא resolved.

8.4.2 `sourceFindingIds`: `SCHED-F009`, `SCHED-F018`; `MPSA-20260829-P0-003`, `MPSA-20260829-P1-004`, `MPSA-20260829-P2-001`.

8.4.3 `acceptancePredicate`: `PASS` רק אם כל 52 Master findings, כל 26 Schedule findings וכל 23 Structural findings מקבלים Disposition נפרד, שני Parsers מחשבים אותו Gate result, ואין Deadlock מסיווג Runtime כ־Planning blocker.

## 8.5 `BCA2-REQ-043` — Reconciliation בלי Mutation

8.5.1 `rule`: Reconciler רשאי להכריע Assertions לפי Evidence בלבד. תיקון Subject, הוספת שדה או שינוי Source יוצרים Rejected terminal ו־Successor generation.

8.5.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F019`; `MPSA-20260829-P0-002`.

8.5.3 `acceptancePredicate`: `PASS` רק אם Reconciliation output אינו משנה Subject root, כל mismatch מקבל Disposition, וכל requested byte change פותח Candidate חדש ושני Reviews חדשים.

## 8.6 `BCA2-REQ-044` — AcceptanceEnvelope ו־CAS

8.6.1 `rule`: Envelope קושר `subjectRoot`, ‏`evidenceBundleRoot`, ‏Parser comparison, ‏Producer QA, ‏Review A/B, ‏Reconciliation, ‏Veto set, ‏Tal exact-root approval, ‏Authority epoch, ‏Previous accepted root ו־Expected head. CAS הוא ניסיון יחיד בעל Terminal reconciliation.

8.6.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F009`; `MPSA-20260829-P0-002`.

8.6.3 `acceptancePredicate`: `PASS` רק אם כל Roots שווים ל־Receipts, Tal approval מדויק וטרי, CAS expected head תואם, ושני Readbacks מחזירים Pointer/Envelope זהים; אחרת `BLOCKED`.

## 8.7 `BCA2-REQ-045` — שתי Generations אמיתיות

8.7.1 `rule`: BCA-2 יכול לקבל Bootstrap architecture receipt לאחר Review, אך Gate 29 אינו יכול להסתמך על החוזה עד ששתי Generations אמיתיות של Source/Candidate עברו Freeze→Review→Acceptance ללא Post-freeze edit. אין להשתמש בנתוני Test מומצאים.

8.7.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F019`; `MPSA-20260829-P0-002`.

8.7.3 `acceptancePredicate`: `PASS` רק אם קיימים שני Acceptance envelopes של Candidates אמיתיים בעלי Parent relation, Digests שונים מסיבה מתועדת, ו־Receipts שאינם מועברים אוטומטית.

## 8.8 `BCA2-REQ-046` — Freshness ו־Invalidation

8.8.1 `rule`: BCA-2, SourceFreeze, Capacity, Schedule, Review, Veto ו־Approval records כוללים `asOf`, ‏`validThrough` ו־Invalidation triggers; Stale artifact אינו Current.

8.8.2 `sourceFindingIds`: `SCHED-F019`, `SCHED-F025`; `MPSA-20260829-P1-005`, `MPSA-20260829-P2-002`.

8.8.3 `acceptancePredicate`: `PASS` רק אם Expiry/Source/Capacity/Policy change מפילים Current pointer או Gate claim, ו־Revalidation יוצרת Receipt חדש בלי לשנות Evidence היסטורי.

# 9. D18-A2, Repo authority ו־Public hardening

## 9.1 `BCA2-REQ-047` — D18-A2 הוא Source of truth

9.1.1 `rule`: BCA-2 מקבע `repositoryVisibility=Public` מכוח D18-A2 ומסיר כל דרישת Private פעילה. Public אינו Finding ואינו Safe-state חלש יותר.

9.1.2 `sourceFindingIds`: `SCHED-F012`; `MPSA-20260829-P0-007`.

9.1.3 `acceptancePredicate`: `PASS` רק אם D18-A2 נכלל ב־Source root ובכל Decision/Crosswalk רלוונטי, Active Private assumption count אפס, ו־Visibility-change task count אפס.

## 9.2 `BCA2-REQ-048` — Canonical repository root

9.2.1 `rule`: `RepoAuthorityRegistry` מזהה `/Users/tal/Documents/connect/web` ו־`/Users/tal/Documents/connect/web/.git` כ־Candidate canonical application root; ה־outer `/Users/tal/Documents/connect/.git` מסווג Non-authoritative ואינו Fallback.

9.2.2 `sourceFindingIds`: `SCHED-F011`; `MPSA-20260829-P1-010`.

9.2.3 `acceptancePredicate`: `PASS` רק אם כל Source/Git Task כולל `repoRootId`, ה־Guard נכשל מן Outer root, ו־Evidence מציין Root, Git dir, Branch, HEAD ו־Remote.

## 9.3 `BCA2-REQ-049` — PublicRepoHardeningGate

9.3.1 `rule`: BCA-2 מגדיר Gate לפני כל Push: Public content/history classification; protected main/ruleset; required reviews/checks/CODEOWNERS; deny force-push/delete; least-privilege Actions; full-SHA pins; OIDC; Secret/push protection או compensating control; dependency/code scanning; SECURITY/VDP; License/NOTICE; private Evidence boundary; alert disposition; independent live readback.

9.3.2 `sourceFindingIds`: `SCHED-F012`; `MPSA-20260829-P0-007`, `MPSA-20260829-P1-009`.

9.3.3 `acceptancePredicate`: `PASS` רק אם כל Control מקבל Work ID, Owner, Evidence ו־Negative bypass test; Push edge חסום עד כולם PASS; Missing platform capability מקבל Compensating-control Decision ולא Success משוער.

## 9.4 `BCA2-REQ-050` — Exact-diff Push permit בלבד

9.4.1 `rule`: אם נדרש Bootstrap Push כדי להכניס Source-based hardening, Permit חיצוני קצר־חיים וחד־ניסיוני נקשר ל־exact diff, Branch, Remote, Scan digests, Review receipts ו־Expected head. מסמך זה אינו מעניק Permit.

9.4.2 `sourceFindingIds`: `SCHED-F012`; `MPSA-20260829-P0-007`, `MPSA-20260829-P1-009`, `MPSA-20260829-P1-010`.

9.4.3 `acceptancePredicate`: `PASS` רק אם Permit schema כולל את כל Bindings, Replay/changed-diff/wrong-root/expired tests נכשלים, ואין General push authority או Visibility mutation.

# 10. תנאי קבלה ל־BCA-2 והמשך

## 10.1 `BCA2-REQ-051` — Completeness של הדרישות

10.1.1 `rule`: BCA-2 חייב לכלול Crosswalk אחד־לאחד לכל `BCA2-REQ-001`–`BCA2-REQ-050`, עם `implementedByIds`, ‏`testIds`, ‏`evidenceIds` ו־`disposition`.

10.1.2 `sourceFindingIds`: `SCHED-F001`, `SCHED-F009`; `MPSA-20260829-P0-001`, `MPSA-20260829-P0-005`.

10.1.3 `acceptancePredicate`: `PASS` רק אם 50/50 Requirements ממופים פעם אחת, Missing/Ambiguous count אפס, וכל `not-applicable` מקבל Approver ו־Disabled evidence.

## 10.2 `BCA2-REQ-052` — Structural QA

10.2.1 `rule`: BCA-2 עובר Numbering, parent/gap, schema, reference, ID, no-merge, cycle, self-membership, output collision, denominator, scope, state, resource, wait, public-decision ו־digest audits.

10.2.2 `sourceFindingIds`: `SCHED-F001`, `SCHED-F002`, `SCHED-F005`, `SCHED-F007`, `SCHED-F013`; `MPSA-20260829-P0-001`, `MPSA-20260829-P0-002`, `MPSA-20260829-P1-001`, `MPSA-20260829-P1-002`.

10.2.3 `acceptancePredicate`: `PASS` רק אם כל Audit מחזיר אפס Error על אותו Subject root ושני Parsers מפיקים אותו Result digest.

## 10.3 `BCA2-REQ-053` — אין ETA סופי

10.3.1 `rule`: טווח BCA-1 ‏`54–107` נשמר כ־Historical draft Bootstrap ROM בלבד. BCA-2 אינו מפרסם Product Remaining, Calendar ETA, Critical-path duration או Whole-program percentage לפני Denominators, Assignments, Calendars, Wait bounds, G3/G4 ו־Gate 1.

10.3.2 `sourceFindingIds`: `SCHED-F003`, `SCHED-F004`, `SCHED-F006`, `SCHED-F008`, `SCHED-F016`, `SCHED-F017`, `SCHED-F022`; `MPSA-20260829-P1-006`.

10.3.3 `acceptancePredicate`: `PASS` רק אם כל מספר זמן קיים מסומן Domain+Basis+Root+asOf, אין Final ETA claim, וערך חסר מוחזר `unknown/unavailable`.

## 10.4 `BCA2-REQ-054` — מצב Restart

10.4.1 `rule`: יצירת BCA-2, Registries, QA ו־Review מנותק הן Planning בלבד. Product coding, Git mutation, Merge, Push, Deploy, Provider activation ו־Credential use נשארים חסומים לפי Gates והרשאה מפורשת נפרדת.

10.4.2 `sourceFindingIds`: `SCHED-F009`, `SCHED-F012`; `MPSA-20260829-P0-001`, `MPSA-20260829-P0-007`, `MPSA-20260829-P1-009`.

10.4.3 `acceptancePredicate`: `PASS` רק אם BCA-2 Handoff מציין `planningOnly=true`, ‏`productAuthority=false`, ‏`gitMutationAuthority=false`, ‏`deploymentAuthority=false` ו־Gate 29=`BLOCKED` עד Acceptance נפרד.

## 10.5 `BCA2-REQ-055` — Candidate disposition

10.5.1 `rule`: BCA-1 נשמר Provenance ואינו נערך. BCA-2 נבנה כ־Successor Candidate חדש, נקשר ל־BCA-1 root ולמסמך דרישות זה, ועובר Lifecycle חיצוני מלא.

10.5.2 `sourceFindingIds`: `SCHED-F002`, `SCHED-F019`, `SCHED-F025`; `MPSA-20260829-P0-002`, `MPSA-20260829-P2-002`.

10.5.3 `acceptancePredicate`: `PASS` רק אם BCA-1 Raw SHA נשמר, BCA-2 כולל Parent/Delta/Source roots, Review receipts חיצוניים, ואין Edit או Status promotion ל־BCA-1.

## 10.6 מצב מספרי מותר

10.6.1 מספר דרישות BCA-2 במסמך זה הוא `55`.

10.6.2 מספר ActDefinition templates המפורטים הוא `16 Bootstrap + 20 Lifecycle + 12 Planning-generation + 8 Public = 56`, בנוסף ל־A01–A09 ול־13 A09 Audit definitions שאינם Work templates.

10.6.3 המספרים ב־10.6.1–10.6.2 הם Counts מבניים בלבד, לא שעות, Completion או ETA.

10.6.4 BCA-2 acceptance, Gate 29, Product Remaining, Critical-path duration ו־Calendar ETA נשארים `unknown/unavailable` או `BLOCKED` עד קיום ה־Artifacts וה־Receipts שתוארו.
