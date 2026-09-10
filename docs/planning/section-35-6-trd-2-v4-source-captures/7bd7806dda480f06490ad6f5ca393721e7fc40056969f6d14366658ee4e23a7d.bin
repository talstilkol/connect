# 1. Connect — Section 35.6 TRD-2 v2 review-closure requirements

## 1.1 זהות ומטרה

1.1.1 artifactId=`CONNECT-SECTION-35-6-TRD-2-V2-REVIEW-CLOSURE-REQUIREMENTS-2026-08-29-V1`.

1.1.2 artifactClass=`PLANNING-ONLY; SUCCESSOR-REQUIREMENTS; NOT-DEFINITION; NOT-ACCEPTANCE`.

1.1.3 reviewed Subject path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-definition-requirement-manifest-2026-08-29.md`; exact raw SHA-256=`2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a`.

1.1.4 raw multi-review intake path=`/Users/tal/Documents/connect/web/docs/planning/trd2-requirement-manifest-multi-review-raw-intake-2026-08-29.md`; exact raw SHA-256=`031166ff25d41f1714fb8a7f8091173059312ea513d12708cffe6d6fe3314f53`.

1.1.5 המטרה היחידה היא לשמר אחד-לאחד את `84` התצפיות המקומיות כדרישות Successor נפרדות, בתוספת רשומת Freeze/authority אחת. המסמך אינו משנה אף Subject קיים.

# 2. גבולות סמכות, שימור ואי-קבלה

## 2.1 גבולות מחייבים

2.1.1 כל Local observation נשמרת ברשומה יחידה. Merge, Alias, Suppression, Downgrade, Risk acceptance, Closure והעברת Severity בין Reviewers אסורים במסמך זה.

2.1.2 `requiredRemediation` או `requiredDefinitionDelta` מועתקים אל `rule` ללא שינוי סמנטי. `defect`, `cause` כאשר קיים, ו-`impact` מועתקים אל `causeAndEffect`. ה-`acceptancePredicate` המקורי מועתק כאשר קיים.

2.1.3 שדה מקור חסר נשאר typed `unknown/unavailable` עם Blocker מפורש. אין להסיק Rule מ-Safe terminal ואין להסיק Acceptance predicate מ-Remediation.

2.1.4 Review C security manifest מצהיר שאין בו Acceptance predicate; לכן 20 הרשומות שלו נשארות חסומות ברמת Predicate. Producer audit אינו מכיל requiredRemediation/requiredDefinitionDelta; לכן 7 הרשומות שלו נשארות חסומות ברמת Rule. ל-`TRD2-PQA-P1-002` אין Cause מפורש; גם הוא נשמר כחסר typed.

2.1.5 כל Review A dependency מתורגם רק ל-ID המקביל במסמך זה. `dependencies=none` נשמר כ-`[]`; אין להוסיף תלות שלא הופיעה במקור. כל Producer/Math/Security row תלויה ב-`TRD2V2-REQ-000` לפי חוזה היצירה.

2.1.6 Development freeze=`ACTIVE`; Gate29=`BLOCKED`; Product completion, remaining person-hours, critical path ו-calendar ETA=`unknown/unavailable`.

# 3. רשומת Freeze/authority

## 3.1 `TRD2V2-REQ-000`

- `rule`: freeze the reviewed TRD2 subject and the lossless raw-intake inputs by their exact raw SHA-256 roots; preserve all four reviewer-local namespaces without merge, closure, acceptance or mutation of any existing Subject

- `causeAndEffect`: the requested v2 closure requirements must be derived from immutable reviewed bytes; changing an existing Subject or treating a raw intake as reconciled authority would invalidate review identity and could silently lose or close an observation

- `sourceIds`: reviewedSubjectRoot=2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a; rawIntakeRoot=031166ff25d41f1714fb8a7f8091173059312ea513d12708cffe6d6fe3314f53; authority=task instruction dated 2026-08-29; durable authority-local ID=unknown/unavailable; blocker=no separately admitted authority-record identity was supplied

- `acceptancePredicate`: the reviewed Subject hash equals the required exact root; the raw-intake hash equals the required exact root; the four source families resolve to the supplied exact roots; no existing Subject bytes change; this artifact remains planning-only and grants zero acceptance or Gate authority

- `dependencies`: []

# 4. Producer QA observations — 7/7 ללא Merge

## 4.1 `TRD2V2-REQ-001`

- `rule`: unknown/unavailable; blocker=the source observation contains no requiredRemediation or requiredDefinitionDelta field, so a successor rule cannot be inferred

- `causeAndEffect`: defect=the subject cites TRD-P0-009, TRD-P0-010 and MPSA-20260829-P0-008 through P0-010, none of which exists in the named source manifests; cause=source IDs were authored from remembered topic/severity patterns rather than validated against the frozen source identity sets; impact=a requirement can appear traceable while its claimed authority does not exist; a parser cannot reconstruct the dependency graph

- `sourceIds`: localObservationId=TRD2-PQA-P0-001; sourceRoot=8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f

- `acceptancePredicate`: successor contains zero dangling source IDs; every source reference resolves to one exact frozen member; two independent referential-integrity checks agree

- `dependencies`: [TRD2V2-REQ-000]

## 4.2 `TRD2V2-REQ-002`

- `rule`: unknown/unavailable; blocker=the source observation contains no requiredRemediation or requiredDefinitionDelta field, so a successor rule cannot be inferred

- `causeAndEffect`: defect=the subject omits literal mapping for 7 TRD, 7 structural, 17 schedule, 13 security, 6 traceability and 14 BCA2 identities; cause=input roots and topic-level requirements were treated as evidence of member-level coverage; impact=an omitted defect or successor requirement can receive no remediation while TRD2-REQ-064 still claims all inputs are represented

- `sourceIds`: localObservationId=TRD2-PQA-P0-002; sourceRoot=8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f

- `acceptancePredicate`: successor publishes a derived forward and inverse crosswalk for every admitted source identity; missing=0; dangling=0; each identity has an explicit disposition and at least one requirement edge

- `dependencies`: [TRD2V2-REQ-000]

## 4.3 `TRD2V2-REQ-003`

- `rule`: unknown/unavailable; blocker=the source observation contains no requiredRemediation or requiredDefinitionDelta field, so a successor rule cannot be inferred

- `causeAndEffect`: defect=SREQ-001–SREQ-042 and MATH-001–MATH-032 have zero member-level edges despite being declared frozen inputs; cause=the documents arrived after initial authoring and were added only as artifact roots; impact=the future Definition may omit exact source locator, D31, graph, denominator, credit, ETC, calendar, mutex, wait, feasible-schedule or Unknown predicates

- `sourceIds`: localObservationId=TRD2-PQA-P0-003; sourceRoot=8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f

- `acceptancePredicate`: 74/74 identities are enumerated without ranges and mapped bidirectionally; semantic conflicts create explicit Findings rather than silent union

- `dependencies`: [TRD2V2-REQ-000]

## 4.4 `TRD2V2-REQ-004`

- `rule`: unknown/unavailable; blocker=the source observation contains no requiredRemediation or requiredDefinitionDelta field, so a successor rule cannot be inferred

- `causeAndEffect`: defect=the admitted Requirement-universe contract hard-codes a primary-source QA denominator of 2/2, while the Master also depends on D01–D31, amendments, user directives, legal/provider observations, ADRs, registries, migrations, runbooks, routes and the observed implementation state; cause=primary Product specifications and total planning authority/evidence sources were not modeled as separate source classes and denominators; impact=a two-source PASS can omit a binding Decision, a current security boundary or a contradiction in the existing product while claiming a complete executable plan

- `sourceIds`: localObservationId=TRD2-PQA-P0-004; sourceRoot=8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f

- `acceptancePredicate`: successor defines finite source classes, selection predicates and separate denominators; every admitted/excluded candidate has exact identity and reason; source-set closure is derived rather than hard-coded

- `dependencies`: [TRD2V2-REQ-000]

## 4.5 `TRD2V2-REQ-005`

- `rule`: unknown/unavailable; blocker=the source observation contains no requiredRemediation or requiredDefinitionDelta field, so a successor rule cannot be inferred

- `causeAndEffect`: defect=two source ranges are used inside sourceIds even though Clause1.3.3 says a range is navigation only; cause=compact human notation was mixed with a field intended to demonstrate coverage; impact=a parser cannot determine membership, detect a missing middle identity or attach per-member disposition

- `sourceIds`: localObservationId=TRD2-PQA-P1-001; sourceRoot=8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f

- `acceptancePredicate`: sourceIds is an explicit duplicate-free array of exact identities; ranges may appear only in non-authoritative narrative

- `dependencies`: [TRD2V2-REQ-000]

## 4.6 `TRD2V2-REQ-006`

- `rule`: unknown/unavailable; blocker=the source observation contains no requiredRemediation or requiredDefinitionDelta field, so a successor rule cannot be inferred

- `causeAndEffect`: defect=SREQ-021 and its summary classify the D31 subject/source/value as unknown in that audit, but durable file /Users/tal/Documents/connect/web/docs/postgresql-runtime-role-decision.md exists; cause=unknown/unavailable; blocker=the source observation contains no cause field; impact=inventing D31 remains forbidden, but continuing to report its source as unavailable would create a false blocker and omit an important database least-privilege decision

- `sourceIds`: localObservationId=TRD2-PQA-P1-002; sourceRoot=8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f

- `acceptancePredicate`: successor Source selection evaluates the exact D31 bytes, authority, amendments, conflicts and scope; D31 becomes admitted or explicitly rejected with reason; no unknown source claim remains if bytes are admitted

- `dependencies`: [TRD2V2-REQ-000]

## 4.7 `TRD2V2-REQ-007`

- `rule`: unknown/unavailable; blocker=the source observation contains no requiredRemediation or requiredDefinitionDelta field, so a successor rule cannot be inferred

- `causeAndEffect`: defect=the subject does not itself enumerate every earlier requested Product fix such as APP_PUBLIC_ORIGIN, dependency-graph Source guard, disabled nonfunctional controls, accessible Dialog behavior, official Meta adapter limits and the Retention/Backup contracts; cause=TRD2 is correctly intended as a Definition contract, but its completeness claim currently depends on a Requirement extraction process that is not yet accepted and has known source gaps; impact=without an exact forward/inverse Requirement universe, a sound meta-schema could still generate an incomplete Master

- `sourceIds`: localObservationId=TRD2-PQA-P1-003; sourceRoot=8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f

- `acceptancePredicate`: accepted Requirement/Decision universe explicitly maps every binding source statement and user amendment through Requirement→Task→Test→Evidence→Gate before Program materialization

- `dependencies`: [TRD2V2-REQ-000]

# 5. Review B mathematical observations — 24/24 ללא Merge

## 5.1 `TRD2V2-REQ-008`

- `rule`: כל 32 מזהי MATH וכל 26 מזהי MSAF חייבים להופיע פעם אחת לפחות במפת `sourceContractId/sourceFindingId→TRD2-REQ→Definition object→conformance vector`; Range או Root כללי אינם תחליף.

- `causeAndEffect`: defect=הנושא מונה Root של 32 חוזי מתמטיקה אך אינו מפנה לאף `MATH-*`. הוא מפנה ישירות רק לתשעה מזהי `MSAF` ומשמיט 17 מזהים: `F001,F004,F005,F006,F007,F008,F009,F010,F012,F013,F014,F017,F018,F020,F021,F023,F025`.; mathematicalImpact=TRD-2 עתידי יכול לעבור 64/64 דרישות הנושא תוך השמטת נוסחה או Finding חוסם, משום שאין Forward/Inverse edge ברמת זהות.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F001; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: שני Readers מפיקים `32/32` ו־`26/26` identity coverage, ללא orphan, duplicate או unresolved reference; כל השמטה מחזירה `DEFINITION-SOURCE-COVERAGE-BLOCKED`.

- `dependencies`: [TRD2V2-REQ-000]

## 5.2 `TRD2V2-REQ-009`

- `rule`: להגדיר Work universe ו־Admission set כשתי פונקציות נפרדות, עם Root, Domain, Leaf, state, supersession time, record digest ו־evaluation time.

- `causeAndEffect`: defect=קיימים שמות לחמישה Domains, אך אין דרישה ל־`W(r)` ול־`A(r,t)`, ל־Leaf predicate, ל־AcceptanceEnvelope membership, או להוצאה מפורשת של Draft/Rejected/Superseded/Digest-mismatched Work.; mathematicalImpact=Draft או Generation שנדחה יכולים להיכנס למכנה, לשאת Actual/Credit ולהקטין Remaining.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F002; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: Parsers A/B מחזירים Set זהה; Draft, Rejected, Superseded ו־Digest mismatch אינם Members; Root ללא Acceptance envelope מחזיר `BLOCKED-NO-ADMITTED-SET`.

- `dependencies`: [TRD2V2-REQ-000]

## 5.3 `TRD2V2-REQ-010`

- `rule`: להגדיר `EligibleForEffort`, CanonicalWorkKey, Alias registry, collision terminal ו־Set union לפי Work ID; כל View נגזר מאותו Union.

- `causeAndEffect`: defect=`unique-ID union` מוזכר, אך אין CanonicalWorkKey/Alias resolution contract ואין כלל גלובלי שלפיו Parent, Alias, Template, Wait, Gate, Resource, Artifact ו־Receipt מקבלים אפס Effort ו־Credit.; mathematicalImpact=אותו Work יכול להיספר כמה פעמים ב־Stage/Scope/Finding/Control, או Non-work יכול להגדיל Hours ומכנה.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F003; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: שינוי סדר Views אינו משנה Total; Alias/Parent/Template/Wait מוסיפים אפס; unresolved ID או collision מחזירים `BLOCKED-NO-UNIQUE-UNION`.

- `dependencies`: [TRD2V2-REQ-000]

## 5.4 `TRD2V2-REQ-011`

- `rule`: להגדיר במפורש `D_B(r_B)`, ‏`D_L(g)`, ‏`D_P(g)`, ‏`D_R(s)`, ‏`D_S(e)` ואת preconditions/failure terminals של כל אחד.

- `causeAndEffect`: defect=אין Membership formulas נפרדות ל־Bootstrap root, Lifecycle generation, Planning-generation plan root, Program ScopeManifest ו־Service epoch; אין דרישה למכנה מאושר, קפוא, סופי ולא־ריק.; mathematicalImpact=Membership יכול להשתנות אחרי פרסום, Work יכול לעבור בין Domains, ומכנה ריק יכול להוצג כ־0% או 100%.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F004; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: כל Work שייך למכנה Domain אחד בלבד; כל מכנה נגזר מ־Root exact; Set חסר/ריק/לא־סופי מחזיר `unknown/unavailable`; אין denominator inheritance.

- `dependencies`: [TRD2V2-REQ-000]

## 5.5 `TRD2V2-REQ-012`

- `rule`: להגדיר Predicate בינרי מלא `C(w,t)` ואת ההבחנה בין invalid denominator, שמבטל Metric, לבין Work לא־מוכח, שמקבל `C=0`.

- `causeAndEffect`: defect=הביטוי “binary evidence-based Credit” ו־“all predicates” אינו מונה את צירופי Admission, executionStatus, Acceptance, Evidence freshness, Review validity ו־Invalidation, ואינו מגדיר מה קורה כאשר אחד מהם Unknown.; mathematicalImpact=Local completion, Evidence שפג, Review חסר או Work invalidated עלולים לקבל Credit=1; לחלופין Error יכול להיות coerced למספר.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F005; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: כל צירוף אפשרי של ששת הממדים נבדק; Credit=1 רק כאשר כולם תקפים; Root/denominator invalid מחזיר Metric `unknown/unavailable` ולא Credit aggregate.

- `dependencies`: [TRD2V2-REQ-000]

## 5.6 `TRD2V2-REQ-013`

- `rule`: להגדיר `P_count`, ‏`P_weight`, ‏`GateReadiness` ו־Publication vector נפרד; לאסור כל Aggregate מעל הווקטור.

- `causeAndEffect`: defect=אין נוסחת Count progress, אין Weight policy/root/positive-sum rule, אין GateReadiness formula, ואין איסור מפורש על Average/Weighted average מעל חמשת המכנים וה־Gate state.; mathematicalImpact=UI יכול לפרסם “אחוז כולל” שרירותי, לשנות משקלים בדיעבד או להמיר Gate29 חסום ל־0% Product.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F006; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: Count ו־Weight מוצגים בנפרד; Weight קפוא וחיובי; Gate set exact ולא־ריק; ניסיון Overall aggregate נכשל Schema; Gate29 אינו Percent.

- `dependencies`: [TRD2V2-REQ-000]

## 5.7 `TRD2V2-REQ-014`

- `rule`: להגדיר `Actual(w,c)` כאגרגציה של Events תקפים עד Cut קפוא, עם Units, uniqueness, monotonic history ו־generation binding.

- `causeAndEffect`: defect=הנושא דורש “Actual ledger” בלבד; אין Event ID, Task version, Actor, timestamp, effortMinutes, Evidence digest, Actual cut, append-only rule או duplicate failure.; mathematicalImpact=Actual יכול להשתנות רטרואקטיבית, להיספר פעמיים, להתערבב בין Generations או לכלול Events אחרי ה־Cut.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F007; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: Replay מאותו Cut זהה; Event עתידי מוחרג; duplicate מכשיל ואינו נספר פעם אחת; Actual של Generation שנדחה נשמר היסטורית.

- `dependencies`: [TRD2V2-REQ-000]

## 5.8 `TRD2V2-REQ-015`

- `rule`: להגדיר בנפרד ETC revision, Remaining envelope ו־Gross envelope; לקשור כל ערך ל־Task/Generation/Root/Cut/Review.

- `causeAndEffect`: defect=אין EstimateRevision הקשור ל־Task version ול־ActualCut, אין `0≤min≤max`, אין נוסחת Unique-sum ל־Remaining/Gross, אין כלל ETC=0 ל־Accepted terminal בלבד, ואין Whole-metric Unknown כאשר Member יחיד חסר.; mathematicalImpact=Remaining יכול להיגזר מ־baseline-minus-actual, Partial total יכול להיראות שלם, או completed Work עם Rework פתוח לקבל ETC=0.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F008; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: ETC חסר לעלה חובה מפיל את כל Metric; External Wait אינו Person-effort; canceled ROM אינו Input; אותו Root/Cut מחזיר אותו Range.

- `dependencies`: [TRD2V2-REQ-000]

## 5.9 `TRD2V2-REQ-016`

- `rule`: להגדיר rejected-generation accounting, Successor Delta, Rework identity ו־Baseline preservation.

- `causeAndEffect`: defect=Immutable successor generation נדרש, אך אין כלל שמאפס Credit של Generation שנדחה, שומר את Actual שלו, ומכניס ל־Successor רק Work חדש או Rework IDs מפורשים.; mathematicalImpact=Byte שנפסל יכול לשמר Completion, או Actual שהושקע יכול להיעלם ולהקטין Forecast at completion.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F009; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: rejection יוצר Credit=0 בדור הישן בלי למחוק Actual; successor אינו יורש Credit/Hours ללא mapping; Rebaseline יוצר version חדש ושומר previous baseline.

- `dependencies`: [TRD2V2-REQ-000]

## 5.10 `TRD2V2-REQ-017`

- `rule`: להגדיר Wait node עם 13/13 שדות, Effort=0, Low/High calendar durations, Trigger edge, overlap, Receipt, expiry ו־safe state.

- `causeAndEffect`: defect=“SLA observation range” אינו מחייב `minCalendar/maxCalendar`, allowed overlap, graph trigger/finish relation ו־critical-unbounded terminal; Retry/Escalation אינם תחליף ל־upper bound.; mathematicalImpact=Wait יכול להיספר ידנית, פעמיים או לא להיספר; High ETA יכול להופיע אף שאין Bound חיצוני.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F010; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: Wait אינו משנה Person-hours; overlap נגזר רק מ־Edges; Required critical Wait ללא Max מבטל High ETA; Receipt חסר חוסם successor.

- `dependencies`: [TRD2V2-REQ-000]

## 5.11 `TRD2V2-REQ-018`

- `rule`: להגדיר Low/High resource-constrained schedule contracts מלאים, Inputs roots, constraints, determinism, anchor, output class ו־optimality claim rule.

- `causeAndEffect`: defect=אין Metric mode, ‏FS/SS/FF+lag semantics, schedule anchor rule, solver/version, tie-break policy, same-input-root relation בין Low/High, או הבחנה בין Feasible scenario ל־Minimum makespan הדורש Optimality proof.; mathematicalImpact=שני Schedulers יכולים להחזיר תאריכים שונים ושניהם להיקרא “ETA”; Scenario יכול להיות מוצג כאופטימום ללא הוכחה.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F011; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: אותו Input+solver policy מחזיר אותו Result root; כל Dependency/Capacity/Mutex/Wait constraint מתקיים; High אינו מוקדם מ־Low; Input חסר מחזיר typed Unknown.

- `dependencies`: [TRD2V2-REQ-000]

## 5.12 `TRD2V2-REQ-019`

- `rule`: להגדיר `Unknown(metric)` מעל כל Validators ואת Publication schema; failure terminal גובר תמיד על formula.

- `causeAndEffect`: defect=קיימים typed Unknown ו־מספר תנאי כשל נקודתיים, אך אין OR exhaustive לכל Metric ואין Payload חובה עם metric/method/unit/roots/Cut/asOf/validThrough/assumptions/exclusions/critical waits/reasons.; mathematicalImpact=Partial number, Historical ROM, Low בלבד, ידנית overridden number או Number ללא provenance יכולים להתפרסם כ־Current.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F012; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: כל תנאי כשל מופעל לבדו ומבטל רק Metrics תלויים; אין Zero fallback או Manual override; Payload חסר או Blended overall מחזיר `REJECT-PUBLICATION`.

- `dependencies`: [TRD2V2-REQ-000]

## 5.13 `TRD2V2-REQ-020`

- `rule`: להוסיף detached freeze receipt עם Subject root, generation, frozenAt, permitted successor rule ו־Review packet IDs; אין לשנות את ה־Subject in place.

- `causeAndEffect`: defect=Header קובע `NOT-FROZEN`, בעוד disposition דורש Review נגד “exact frozen root”; אין Freeze receipt שמבדיל Authoring status מן Review subject status.; scheduleImpact=שינוי במהלך Review יכול להפוך findings ל־stale או לגרום לשני Reviews לבדוק Bytes שונים.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F013; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: Review A/B bind לאותו frozen root; שינוי Byte יוצר successor ומבטל Current review eligibility; Header ו־receipt אינם סותרים.

- `dependencies`: [TRD2V2-REQ-000]

## 5.14 `TRD2V2-REQ-021`

- `rule`: להגדיר transition table, exact allowed Work kinds לכל Domain ו־pairwise-disjoint invariant.

- `causeAndEffect`: defect=שמות חמשת Domains קיימים, אך אין כלל classification שקובע ש־Validation לפני Subject קפוא יכול להיות Bootstrap וש־QA/Review/Acceptance לאחר Freeze הם Lifecycle בלבד.; scheduleImpact=Review יכול להיכנס ל־Planning או Program denominator; Bootstrap יכול להישאר פתוח לנצח; אותו Work עשוי לקבל שתי זהויות.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F014; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: כל Work מסווג באופן יחיד; Lifecycle של Generation אינו Member ב־Subject שלו; Intersections בין חמשת המכנים ריקים.

- `dependencies`: [TRD2V2-REQ-000]

## 5.15 `TRD2V2-REQ-022`

- `rule`: להוסיף Atomicity predicate, bounded estimate invariant, producer uniqueness והפרדה בין Product output ל־Evidence output.

- `causeAndEffect`: defect=Total Task schema אינו מחייב פעולה יחידה, `0<minMinutes≤maxMinutes≤480`, Product output יחיד ו־Evidence output נפרד; Typed inapplicable יכול לעקוף שדות Execution חיוניים.; scheduleImpact=Parent או משימה רב־פעולתית יכולה לקבל Estimate/Credit ולא ניתן לשבץ אותה באופן אמין.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F015; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: כל Leaf עובר 18/18+linked-registry schema, פעולה יחידה ותקרת 480; Parent/Alias ללא Estimate/Status/Credit; typed inapplicable מוגבל לשדות מותרים בלבד.

- `dependencies`: [TRD2V2-REQ-000]

## 5.16 `TRD2V2-REQ-023`

- `rule`: להגדיר `ValidGraph` מלא ו־Schedule edge subtype registry עם cardinality, lag unit ו־generation constraint.

- `causeAndEffect`: defect=Edge registry כללי אינו מחייב `noDangling`, ‏`noSelfEdge`, required milestone reachability, generation-order validity או relation/lag units של Schedule.; scheduleImpact=Graph יכול להיות acyclic אך חסר predecessor חובה, לא להגיע ל־Release או לקשור Generation עתידי לאחור.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F016; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: Cycle, dangling, self-edge, unreachable required node ו־future-generation authority נכשלים; שני graph engines מחזירים אותו topological result.

- `dependencies`: [TRD2V2-REQ-000]

## 5.17 `TRD2V2-REQ-024`

- `rule`: להגדיר `cap_p(τ)` ו־`Capacity_p([a,b])`, timezone/DST/discretization policy, horizon completeness ו־net-load derivation.

- `causeAndEffect`: defect=רשימת שדות Calendar אינה מגדירה discretization, horizon coverage, interval boundary, net focus calculation או כלל שמנכה Support load פעם אחת בלבד.; scheduleImpact=שתי מימושים יכולים להפיק Capacity שונה מאותם intervals; Leave/Support/DST יכולים להיספר פעמיים או לא להיספר.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F017; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: Calendar מכסה את כל Horizon; capacity לעולם לא שלילית; leave/support מנוכים פעם אחת; expiry מחזיר schedule `unknown/unavailable`.

- `dependencies`: [TRD2V2-REQ-000]

## 5.18 `TRD2V2-REQ-025`

- `rule`: להגדיר Assignment object ופונקציית FeasibleAssignment, interval demand inequality ו־parallel-splitting policy.

- `causeAndEffect`: defect=Eligibility נדרש, אך אין Primary named assignment, Work demand per interval, `Σ demand≤capacity`, conflict matrix או כלל פיצול Work בין אנשים.; scheduleImpact=Schedule יכול להקצות אותו אדם לכמה Tasks מעל capacity, להוסיף “team member” לא ממונה או לפצל Effort בצורה אופטימית.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F018; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: Person לא־כשיר/לא־פעיל/בניגוד עניינים נכשל; overlap מעל capacity נכשל; Role ללא Appointment אינו Capacity.

- `dependencies`: [TRD2V2-REQ-000]

## 5.19 `TRD2V2-REQ-026`

- `rule`: להגדיר boundary coverage registry, positive integer capacity, per-Task demand ו־schedule feasibility invariant.

- `causeAndEffect`: defect=Mutex schema כולל capacity/lease, אך אין Exhaustive mapping מכל Side-effect boundary ל־Mutex ואין demand function שמחייב `Σ active demand≤capacity` בכל זמן.; scheduleImpact=Boundary שלא מופה יכול להישמט מן Solver; Environment/Git/DB/Meta mutation יכול להתרחש במקביל למרות שהתוצאות נראות feasible.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F019; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: כל Side-effect Task מפנה ל־Mutex או ל־reviewed nonexclusive proof; over-capacity, missing boundary, stale lease ו־unordered multi-lock נכשלים.

- `dependencies`: [TRD2V2-REQ-000]

## 5.20 `TRD2V2-REQ-027`

- `rule`: להגדיר scheduleInputRoot, scheduleSnapshotId ו־Fresh predicate מעל כל Roots, clock policy ו־invalidation events.

- `causeAndEffect`: defect=`explicit as-of root` אינו מחייב Input root המורכב מ־registry/scope/graph/estimate/assignment/calendar/mutex/wait/ActualCut/solver/anchor, Result root ו־validThrough.; scheduleImpact=שינוי Capacity, Wait, Actual cut או Solver policy יכול להשאיר Schedule ישן Current מפני שהקלט המשתנה לא נכלל ב־Identity.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F020; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: שינוי Byte בכל Input משנה Snapshot identity ומסמן קודמו stale; Historical נשמר אך אינו Current; Hidden input נכשל.

- `dependencies`: [TRD2V2-REQ-000]

## 5.21 `TRD2V2-REQ-028`

- `rule`: להגדיר Service epoch denominator ו־Lifecycle schedule עם cadence, owner, capacity demand ו־scope.

- `causeAndEffect`: defect=Service-lifecycle denominator נקרא בשם, אך אין requirement ל־service epoch, measurement window, active obligation enumeration, cadence/owner או deduction מ־future capacity.; scheduleImpact=recurring patching/on-call/reviews יכולים להיעלם מן Capacity או לזהם Completion של Build.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F021; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: recurring Work אינו ב־Program set; כל obligation פעילה ניתנת ל־enumeration; Capacity calendar מנכה אותה פעם אחת; epoch change יוצר denominator חדש.

- `dependencies`: [TRD2V2-REQ-000]

## 5.22 `TRD2V2-REQ-029`

- `rule`: להגדיר Planning-generation membership, complete partition, disjointness מ־Program/Lifecycle ו־next-generation output rule.

- `causeAndEffect`: defect=אין דרישה שכל Planning-generation Work instance יקושר ל־accepted GenerationPlan root ול־Scope partition סופי, וש־Output שלו ייכנס רק ל־Generation הבא.; scheduleImpact=Planning work יכול להיספר כ־Program completion או ליצור את המכנה שהוא עצמו צורך באותה Generation.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F022; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: כל Planning instance קשור ל־GenerationPlan קודם ומאושר; intersection עם Program ריק; same-generation output אינו Member.

- `dependencies`: [TRD2V2-REQ-000]

## 5.23 `TRD2V2-REQ-030`

- `rule`: להגדיר meaning of range, calibration/correlation gate, ForecastAtCompletion, VarianceRange ו־immutable previous baseline.

- `causeAndEffect`: defect=confidence class ו־basis מוזכרים, אך אין Assumptions/Exclusions contract, Correlation model, CalibrationEvidence, איסור P50/P80 ללא Calibration או Forecast/Variance formula ששומר Baseline.; scheduleImpact=Arithmetic Min/Max יכול להיות מוצג כהסתברות, Commitment או Confidence calibrated; Rebaseline יכול למחוק variance.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F023; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: P50/P80 ללא Calibration נכשל; correlation unknown אינה הופכת לעצמאות; reserve ללא Work/Risk IDs אינו נכנס; rebaseline יוצר version חדש.

- `dependencies`: [TRD2V2-REQ-000]

## 5.24 `TRD2V2-REQ-031`

- `rule`: להגדיר Critical/Near-critical/Slack outputs על אותו Snapshot ו־threshold policy לא־רטרואקטיבית.

- `causeAndEffect`: defect=Feasible schedule נדרש, אך לא מוגדרים resource-constrained slack, Critical predicate, Near-critical threshold, free/total float, resource utilization, Mutex queue או Wait sensitivity.; scheduleImpact=אי אפשר להסביר מה חוסם Finish, מה עלול להפוך קריטי או איזה Bottleneck משפיע על Schedule.

- `sourceIds`: localObservationId=TRD2-MATH-RB-F024; reportRoot=66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362; findingsManifestRoot=61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b

- `acceptancePredicate`: כל Node מקבל Slack/float או typed inapplicable; critical iff slack=0; threshold קפוא; utilization/queues/sensitivity קשורים לאותו Input root.

- `dependencies`: [TRD2V2-REQ-000]

# 6. Review C security observations — 20/20 ללא Merge

## 6.1 `TRD2V2-REQ-032`

- `rule`: root-qualify every source finding reference and reject dangling, range-only or semantically mismatched edges

- `causeAndEffect`: defect=five referenced report-local IDs do not exist in their frozen namespaces; existing findings are omitted; some retention/recovery source edges resolve to findings with different semantics; impact=a requirement can resolve to no source, a wrong source or an invented source while appearing covered

- `sourceIds`: localObservationId=TRD2-SHR-F001; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.2 `TRD2V2-REQ-033`

- `rule`: materialize an exact immutable 24-row MSSA-to-TRD2 crosswalk preserving every local identity and defect semantics

- `causeAndEffect`: defect=13/24 MSSA observations lack individually enumerable source edges; the range locator has no machine coverage authority; impact=whole critical security boundaries can disappear without an orphan error

- `sourceIds`: localObservationId=TRD2-SHR-F002; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.3 `TRD2V2-REQ-034`

- `rule`: admit the exact D18-A2 root, authority, claim limit and supersession edge; retain the precedence ledger's draft/unaccepted limits

- `causeAndEffect`: defect=Public visibility is binding in prose but the exact D18-A2 decision artifact root is omitted from the frozen input list; impact=Public authority and Git governance can be evaluated against unrooted or stale decision text

- `sourceIds`: localObservationId=TRD2-SHR-F003; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.4 `TRD2V2-REQ-035`

- `rule`: define the full immutable metadata/legal/capture/source-use/source-seal/capability/CAS/attempt/provider-fact chain

- `causeAndEffect`: defect=no atomic Source→Legal→Permit→Capture chronology binds source bytes, authority, live entitlement and the same attempt; impact=changed Terms, law, consent, asset, geography, quality or rate can leave a stale permit usable

- `sourceIds`: localObservationId=TRD2-SHR-F004; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.5 `TRD2V2-REQ-036`

- `rule`: define exact capability/mutation instances, reachability, unknown ledger, kill and one-attempt lineage with independently approved new intent for any later attempt

- `causeAndEffect`: defect=no one-to-one Capability/SideEffect instance registry and no formal Message→Intent→Operation→Attempt lineage; impact=permits can bleed across mutations and an unknown provider result can be blindly retried

- `sourceIds`: localObservationId=TRD2-SHR-F005; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.6 `TRD2V2-REQ-037`

- `rule`: freeze a corrected protocol root and define complete review, finding, assertion, normalization and comparison records with two independent normalizers

- `causeAndEffect`: defect=ReviewEnvelope/Finding/normalization schemas are not total, failureBoundary and root-qualified local identity are absent, and an unnamed intake state is imported; impact=ineligible records can be compared, distinct observations can collide and reconciliation can appear valid without a common schema

- `sourceIds`: localObservationId=TRD2-SHR-F006; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.7 `TRD2V2-REQ-038`

- `rule`: forbid RiskAcceptance at effective P0/P1 and require fact-based reclassification, two reviewers, threat evidence and retest before P2/P3 consideration

- `causeAndEffect`: defect=only silent P0 acceptance is forbidden; explicit P0/P1 RiskAcceptance and evidence-free downgrade remain structurally possible; impact=blocking exposure can be administratively accepted without mitigation, fix or retest

- `sourceIds`: localObservationId=TRD2-SHR-F007; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.8 `TRD2V2-REQ-039`

- `rule`: make open effective P0/P1, unresolved review disagreement, ineligible envelope or open veto structurally incompatible with DefinitionAcceptance

- `causeAndEffect`: defect=the terminal sentence permits P0/P1/P2 findings to be merely explicitly blocking while protected Acceptance succeeds; impact=a parser can satisfy the stated conjunction despite an open veto-grade defect

- `sourceIds`: localObservationId=TRD2-SHR-F008; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.9 `TRD2V2-REQ-040`

- `rule`: add a finite TestMode enum and five separate test-ID sets to every risky capability, side effect, control, threat and adapter

- `causeAndEffect`: defect=Positive,Negative,Failure,Concurrency,Recovery are not five distinct required test identities for every risky instance; impact=generic corpus coverage can hide an untested timeout, race, ambiguous outcome, disable path or recovery path

- `sourceIds`: localObservationId=TRD2-SHR-F009; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.10 `TRD2V2-REQ-041`

- `rule`: define TenantBoundary, IdentityEnvelope, SessionBoundary, RouteTrust and IngressPolicy records with deny-by-default transitions and five-mode evidence

- `causeAndEffect`: defect=tenant/auth/BFF is a corpus label without a normative server-derived tenant, session, RLS, organization, environment or ingress boundary contract; impact=BOLA, stale membership, cross-tenant access, session riding, RLS bypass and direct backend ingress remain unexcluded

- `sourceIds`: localObservationId=TRD2-SHR-F010; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.11 `TRD2V2-REQ-042`

- `rule`: define root-bound MetaAssetGraph, RatePolicySnapshot, LayeredRateDecision and OneAttemptLedger; live evidence absence yields zero outbound cap

- `causeAndEffect`: defect=exact Meta asset graph, live layered rate/quality policy, cap-zero fallback, provider facts and one-attempt fault semantics are absent; impact=wrong asset, stale policy, duplicate attempt, false sent state or blind retry can enter the design

- `sourceIds`: localObservationId=TRD2-SHR-F011; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.12 `TRD2V2-REQ-043`

- `rule`: define AICapabilityProfile and AIProviderEvidence with disabled defaults, human approval, data classes, reachability, AISVS/eval provenance and five modes

- `causeAndEffect`: defect=AI Human-approval-only is mentioned but AI-off, tools-off, autonomous-side-effects-off, data-use/privacy, tenant, eval and kill semantics are not a Definition contract; impact=unauthorized provider data use, false privacy claim, prompt injection, cross-tenant retrieval or autonomous action can escape completeness

- `sourceIds`: localObservationId=TRD2-SHR-F012; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.13 `TRD2V2-REQ-044`

- `rule`: define FileObject, ScanVerdict, ParserExecution, DerivedKnowledge and CascadeDisposition bound to exact object versions and provider decisions

- `causeAndEffect`: defect=file/knowledge lifecycle lacks upload-off, quarantine, object-version/checksum, scanner, TBAC, parser isolation, derived lineage, cascade deletion and recovery semantics; impact=malicious release, parser escape, orphan derived data or cross-tenant knowledge remain possible

- `sourceIds`: localObservationId=TRD2-SHR-F013; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.14 `TRD2V2-REQ-045`

- `rule`: define SupplyChainSnapshot, NetworkDestinationPolicy and ReleaseArtifactSet with current official sources, trust anchors, fixed destinations and verified rollback

- `causeAndEffect`: defect=supply-chain, Next blocker, SSRF/egress and deployment are not defined through exact dependency, provenance, destination and release/rollback records; impact=compromised or vulnerable dependency, wrong artifact, SSRF, environment crossing, callback takeover or vulnerable rollback remain outside deterministic closure

- `sourceIds`: localObservationId=TRD2-SHR-F014; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.15 `TRD2V2-REQ-046`

- `rule`: define one DeletionAdapterInstance and provider operation ledger per store with CAS, one attempt, partial/unknown state, reconciliation and five modes

- `causeAndEffect`: defect=deletion contract omits per-provider saga, partial irreversible success, timeout ambiguity, hold race, reconciliation and recovery tests; impact=partial or unknown deletion can be retried broadly, misreported or violate Legal Hold

- `sourceIds`: localObservationId=TRD2-SHR-F015; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.16 `TRD2V2-REQ-047`

- `rule`: extend Backup/Restore records with separation, immutability, cohort and privacy-recovery evidence

- `causeAndEffect`: defect=backup/restore omits WORM, administrative separation, real cohort, quarantine, privacy replay, resurrection diff, re-deletion and pending-operation neutralization; impact=a digest-valid backup may share compromise authority or restore deleted/opted-out data and unknown side effects

- `sourceIds`: localObservationId=TRD2-SHR-F016; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.17 `TRD2V2-REQ-048`

- `rule`: define one non-inheritable X24UseDecision per security purpose and map every CSPRNG callsite exactly once

- `causeAndEffect`: defect=X24 lacks a finite security-use inventory and mandatory primitive, encoding, TTL, single-use, context, revocation, owner, test and expiry fields; impact=an approved random value can still have undefined replay, binding or revocation semantics

- `sourceIds`: localObservationId=TRD2-SHR-F017; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.18 `TRD2V2-REQ-049`

- `rule`: define TestInputProvenance and DerivedResultLineage; reject missing provenance and all fake/mock/demo/sample/synthetic business readiness evidence

- `causeAndEffect`: defect=no separate TestInput provenance workflow controls source class, digest, data class, purpose, tenant, expiry, destruction and derived-result invalidation; impact=out-of-purpose real data, sandbox-as-live or invented business data can enter Evidence

- `sourceIds`: localObservationId=TRD2-SHR-F018; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.19 `TRD2V2-REQ-050`

- `rule`: define a versioned PublicRepoHardeningProfile with every current control, compensating decision and five-mode live readback; never use Private visibility as remediation

- `causeAndEffect`: defect=Public intent is correct, but the mandatory GitHub control/readback/bypass matrix is not enumerated; impact=broad policy fields can pass while main remains unprotected, Rulesets absent and security scans disabled or unproved

- `sourceIds`: localObservationId=TRD2-SHR-F019; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

## 6.20 `TRD2V2-REQ-051`

- `rule`: separate the five authority roles and bind exact content/API roots, freshness, claim limit and unavailable terminal

- `causeAndEffect`: defect=retrieval, source verification, Legal disposition, live account verification and approval are not five separate authorities; mutable official source use need not carry captured bytes/root; impact=research can be mistaken for legal applicability, entitlement or approval, and mutable latest URLs can retain stale claims

- `sourceIds`: localObservationId=TRD2-SHR-F020; reportRoot=f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec; findingsManifestRoot=3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae

- `acceptancePredicate`: unknown/unavailable; blocker=the source Findings manifest explicitly states that it intentionally does not create an acceptance predicate, and the source report supplies a safe terminal rather than an acceptancePredicate; no closure predicate is inferred

- `dependencies`: [TRD2V2-REQ-000]

# 7. Review A structural observations — 33/33 ללא Merge

## 7.1 `TRD2V2-REQ-052`

- `rule`: ליצור Successor generation ולמפות כל הפניה ל־ID קיים בעל סמנטיקה תואמת או ל־Source record חדש ומאושר; אסור לבצע החלפת Prefix מכנית ללא בדיקת משמעות.

- `causeAndEffect`: defect=ה־Subject מפנה ל־`TRD-P0-009`, ‏`TRD-P0-010`, ‏`MPSA-20260829-P0-008`, ‏`MPSA-20260829-P0-009`, ‏`MPSA-20260829-P0-010`, שאינם Members במקורות הקפואים.; impact=Resolver אינו יכול להוכיח Authority או Provenance לחלק מדרישות Finding, Retention, Estimate ו־Schedule; Reference closure אינו אפס.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F001; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל Token ב־`sourceIds` פותר ל־Member יחיד ב־Source root המוצהר; unresolved, ambiguous ו־invented count הם אפס בשני Resolvers עצמאיים.

- `dependencies`: []

## 7.2 `TRD2V2-REQ-053`

- `rule`: לבצע Assertion-level crosswalk של כל Source Finding ל־Requirement המקומי, לשמר כל Finding בנפרד ולהוסיף `derivationRationale` ו־reviewed equivalence; Source ID אינו Alias נוח.

- `causeAndEffect`: defect=Test/Evidence, Mutation, Error taxonomy, Progress, Data lifecycle ו־Backup/Restore מצטטים Findings שאינם דורשים את התוכן המקומי; חלק מן המיפויים מוזזים במספר וחלק שייכים ל־Domain אחר.; impact=ID validation יכול לעבור בעוד Semantic traceability שקרית; Finding אמיתי נשאר ללא Remediation והדרישה המקומית מקבלת Authority שאינה קיימת.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F002; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: Reviewer בלתי תלוי מאשר לכל Edge התאמה בין Defect/Remediation/Acceptance המקוריים לכלל המקומי; semantic-mismatch count אפס וכל Finding חסר נשאר גלוי.

- `dependencies`: [TRD2V2-REQ-052]

## 7.3 `TRD2V2-REQ-054`

- `rule`: להוסיף Crosswalk מפורש לכל Member בכל Universe, כולל direct או reviewed-transitive edge, reason לכל N/A, וללא Range/Alias/Root-only credit.

- `causeAndEffect`: defect=Roots ומכנים מצוינים, אך אין Registry שמונה לכל Member את `mappedRequirementIds,testIds,evidenceIds,disposition`. Range אחד הוגדר מפורשות כ־Navigation בלבד. 42 SREQs ו־32 MATH contracts אינם מופיעים כלל כמזהים.; impact=ניתן להשמיט Requirement/Finding/Formula שלם ובכל זאת להעביר את §11.2 באמצעות טענה כללית ש־64 הדרישות “represented”.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F003; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: לכל מכנה מפורסם מתקבל `mapped+explicitly-blocking+approved-NA=denominator`, כל Member מופיע פעם אחת, ו־missing/duplicate/ambiguous/range-only counts הם אפס.

- `dependencies`: [TRD2V2-REQ-052,TRD2V2-REQ-053]

## 7.4 `TRD2V2-REQ-055`

- `rule`: לכל Input ליצור disposition מפורש `normative-accepted|admitted-discovery|evidence-only|historical|rejected|unavailable`; Draft אינו נותן Gate credit, אך ממצאיו נשמרים עד Disposition עצמאי.

- `causeAndEffect`: defect=ה־Subject מצטט Requirements מתוך Draft inputs כאילו הם Authority, אך אינו מגדיר `sourceAdmissionState`, claim limit או תנאי שמונע מ־Draft recommendation להכריע Definition acceptance.; impact=Successor יכול לקבל את עצמו על בסיס שרשרת של Artifacts שמעולם לא התקבלו, או לבחור מהם רק סעיפים נוחים.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F004; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל Source edge מציין Authority class, admission state ו־claim limit; אף unaccepted source אינו לבדו מספק Predicate נורמטיבי; שינוי Admission פותח Successor root.

- `dependencies`: [TRD2V2-REQ-054]

## 7.5 `TRD2V2-REQ-056`

- `rule`: לייבא במפורש את B0, שני Catalogs, Template/Instance separation וה־Lifecycle topology עם Generation constraints.

- `causeAndEffect`: defect=ה־Subject אוסר סמכות מאותו דור אך אינו דורש `BootstrapAuthorityEnvelope B0`, אינו מונה 16 Bootstrap templates או 20 Lifecycle templates ואינו מקבע את הטופולוגיה Freeze→ParseA/B→QA→Roles→Packet→Reviews→Reconcile→Veto→Tal→CAS→Readbacks.; impact=אין תשובה מכונתית מי רשאי ליצור את ה־Definition, אילו Acts חייבים להתקיים, ומהו הסדר החוקי; איסור Self-membership לבדו אינו מעניק סמכות חיצונית.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F005; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל Authoring instance נובע מ־B0 או Root מוקדם; 16/16 ו־20/20 Templates קיימים; כל Node במסלול מופיע פעם אחת; אין Same/future-generation authority.

- `dependencies`: [TRD2V2-REQ-055]

## 7.6 `TRD2V2-REQ-057`

- `rule`: לדרוש שתי Generations אמיתיות לפני Gate reliance ולנסח CAS attempt יחיד עם expected head/epoch, שני Readbacks עצמאיים ו־Terminal reconciliation ללא retry mutation.

- `causeAndEffect`: defect=Req005 דורש “generation vectors” ולא שתי Generations אמיתיות; Req060 דורש Readback יחיד ולא `ReadbackA+ReadbackB+TerminalReconcile`, ואינו אוסר Automatic second write לאחר ambiguous response.; impact=Test vector יכול להחליף הוכחת Lifecycle אמיתית; Lost response או Writer conflict יכולים להסתיים ב־Pointer לא ודאי וב־Gate reliance מוקדם.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F006; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: שני Successor roots אמיתיים עוברים Lifecycle מלא; ambiguous CAS מבצע zero second write; שני Readers מחזירים אותו Pointer/Envelope או `ACCEPTANCE-CONFLICT`.

- `dependencies`: [TRD2V2-REQ-056]

## 7.7 `TRD2V2-REQ-058`

- `rule`: להגדיר Schema exact-field לעלה, Parent/Alias/Template schemas נפרדים, Atomicity invariant ותקרת דקות כ־Integer canonical.

- `causeAndEffect`: defect=הרשימה המקומית אינה Schema של 18 שדות קנוניים, אינה דורשת פעולה יחידה, אינה קובעת `0<minMinutes≤maxMinutes≤480`, אינה מפרידה Product output מ־Evidence output ואינה אוסרת Estimate/Status/Credit ב־Parent/Alias/Template.; impact=Future Registry יכול להכניס Parents נרטיביים או יחידות גדולות ולא ניתנות להקצאה, ועדיין לעבור “schema reference closure”.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F007; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל Leaf עובר 18/18, פעולה יחידה, טווח תקף, Output/Evidence נפרדים; כל Non-leaf מקבל Effort/Status/Credit אפס; שני Parsers מסכימים.

- `dependencies`: [TRD2V2-REQ-054,TRD2V2-REQ-056]

## 7.8 `TRD2V2-REQ-059`

- `rule`: להפריד Decision coverage מ־Decision existence; D31 חסר יוצר Finding ו־safe state, לא Record מזויף; רק authoritative amendment יכול לפתור אותו.

- `causeAndEffect`: defect=ה־Subject דורש Record פעיל לכל D01–D31, בעוד Source/subject/value של D31 הם `unknown/unavailable`; אין `MISSING-DECISION-SOURCE` terminal ואין איסור מפורש על המצאת D31.; impact=Acceptance יכול להיתקע לעד או, גרוע יותר, להיסגר באמצעות Title/Value מומצאים כדי להשיג 31/31.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F008; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: D31 ללא durable source מחזיר `MISSING-DECISION-SOURCE` ו־Decision-universe blocked; invented field count אפס; מקור סמכותי חדש יוצר Revision/Successor.

- `dependencies`: [TRD2V2-REQ-055]

## 7.9 `TRD2V2-REQ-060`

- `rule`: להגדיר AuthorityPrecedence, ClaimTuple, ConflictSet, field-scoped Supersession ו־fail-closed resolver כחלק נורמטיבי של TRD-2.

- `causeAndEffect`: defect=Root של Ledger מצוין, אך אין Requirement שמגדיר A1–A6, exact subject/scope/environment/entity/provider/region/time tuple, smallest conflicting field או הכלל שתאריך לבדו אינו Authority.; impact=Parser רשאי לבחור מקור נמוך יותר, overwrite רחב או “latest” לפי תאריך ולבטל בשקט Directive מחייב.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F009; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: lower-authority, cross-scope, cross-region, date-only ו־whole-record overwrite mutants נכשלים; Historical provenance נשמרת וכל unresolved conflict חוסם רק את ה־scope המושפע.

- `dependencies`: [TRD2V2-REQ-055]

## 7.10 `TRD2V2-REQ-061`

- `rule`: לאמץ או להחליף במפורש כל `MATH-001`–`MATH-014` עם Formula, Inputs, Preconditions, terminal ו־tests ברמת Member.

- `causeAndEffect`: defect=קיימים שמות ל־Domains ו־Credit, אך אין Formula/Preconditions/Failure terminal ל־Work universe, Admission set, Non-work exclusion, unique union, Credit predicate, חמשת המכנים, Count progress, Weight progress ו־Gate vector.; impact=שני Implementations יכולים לחשב מכנה, Credit או אחוזים שונים; Denominator ריק יכול להפוך ל־0%/100%; Parent/Wait/Alias יכולים להיכנס לסכום.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F010; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: 14/14 Contracts ממופים אחד־לאחד; שני Engines מפיקים Sets ותוצאות זהים; empty/invalid denominator מחזיר `unknown/unavailable`; blended overall אינו Schema-valid.

- `dependencies`: [TRD2V2-REQ-054,TRD2V2-REQ-058]

## 7.11 `TRD2V2-REQ-062`

- `rule`: למפות כל `MATH-015`–`MATH-032` ל־Definition schema/algorithm/test; אין לייבא רק את הכותרת או את ה־Root.

- `causeAndEffect`: defect=אין Actual-cut formula, ETC revision selection, Remaining/Gross equations, Calibration rule, Rework variance, graph validity, solver/tie-break/optimality semantics, Anchor distinction, exhaustive Unknown predicate או Publishable payload.; impact=Low/High bounds יכולים להיות ידניים, P50/P80 יכולים להופיע ללא Calibration, High חסר יכול להיות מוחלף ב־Low, ומספר יכול להתפרסם ללא Roots/asOf/validThrough.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F011; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: 18/18 Contracts ממופים; Re-run מאותם Roots מחזיר אותו Result; כל Missing precondition מפעיל את ה־terminal המדויק; Publication ללא כל Provenance fields נדחית.

- `dependencies`: [TRD2V2-REQ-061]

## 7.12 `TRD2V2-REQ-063`

- `rule`: להפריד `findingDispositionComplete` מ־`acceptanceEligible`; Finding blocking נשמר אך הופך Eligibility ל־False. רק Closure/Supersession תקפים מסירים Blocker.

- `causeAndEffect`: defect=הביטוי `closed or explicitly blocking` מופיע בתוך אותו תנאי שבו `protected Acceptance succeed`; אין תנאי נפרד שדורש אפס blocker פעיל לפני Acceptance.; impact=Parser נאמן יכול להחזיר PASS כאשר Finding פתוח מסומן “blocking”, משום שה־OR המקומי אמת וגם יתר התנאים אמת.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F012; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: truth table מוכיחה שכל P0/P1/P2 blocking פעיל ⇒ `ACCEPTANCE-BLOCKED`; אין branch שבו `blocking=true` ו־Acceptance success יחד.

- `dependencies`: [TRD2V2-REQ-054]

## 7.13 `TRD2V2-REQ-064`

- `rule`: לקבע Risk acceptance ל־effective P2/P3 בלבד; P0/P1 נשארים blocking; Reclassification הוא Artifact נפרד עם original/effective severity, Facts, שני Reviewers ו־Retest.

- `causeAndEffect`: defect=ה־Rule מגדיר Risk acceptance לכל Finding וה־Predicate אוסר רק P0 “silently”; הוא אינו אוסר Risk acceptance ל־P0/P1 ואינו דורש Facts+Threat evidence+Retest+שני Reviewers לפני Reclassification.; impact=Blocking defect יכול לעבור Explicit administrative acceptance או downgrade בלי שינוי Exposure ותיקון.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F013; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: transition matrix מכילה אפס נתיב P0/P1→accepted/conditional; unknown promotion predicate בוחר Severity גבוהה; immutable history נשמרת.

- `dependencies`: [TRD2V2-REQ-063]

## 7.14 `TRD2V2-REQ-065`

- `rule`: להגדיר MetaCapabilityProfile, LiveRateObservation, layered-min policy, Tal approval edge, expiry/invalidation ו־hard OFF/zero-cap terminal.

- `causeAndEffect`: defect=Provider Unknown generic קיים, אך אין Rule שמקבע WhatsApp official-only, Tal כ־rate-policy research owner, תוצאת Meta refresh ‏0/4 בגלל 429, או Outbound cap אפס עד Evidence חי הקשור ל־Portfolio/WABA/Phone/Quality/Templates/API version.; impact=Documentation ישנה או Observation לא־חשבון יכולה להפעיל Send policy או מספר קצב שאינו חל על ה־asset המדויק.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F014; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: בלי Live account Evidence טרי ו־Tal policy-root approval, Outbound cap הוא בדיוק אפס; wrong asset/stale/429/conflict mutants אינם מאפשרים Attempt.

- `dependencies`: [TRD2V2-REQ-055,TRD2V2-REQ-060]

## 7.15 `TRD2V2-REQ-066`

- `rule`: לייבא את TextSpan, PdfRegion, dual text/render verification ו־coverage ledger schemas במלואם.

- `causeAndEffect`: defect=“exact line/byte” ו־“page+region” אינם מגדירים half-open byte range, line/column unit, line endings, PDF coordinate system/MediaBox/rotation, BBox decimal encoding, render profile, RTL/Bidi handling או 4/4 visual review.; impact=שני Extractors יכולים להצביע לאזור אחר ועדיין לטעון אותו Statement; Source mutation אינה בהכרח מפילה Locator.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F015; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: שני Extractors משחזרים אותם Raw bytes/regions/digests; line-ending, rotation, bbox, Bidi ו־render/text mismatch mutants נכשלים.

- `dependencies`: [TRD2V2-REQ-054]

## 7.16 `TRD2V2-REQ-067`

- `rule`: לקבע enum מלא, Question namespace/schema ו־CriticalDecisionPrompt relation model ללא תשובה משתמעת.

- `causeAndEffect`: defect=ה־enum המקומי משמיט `definition`; Question IDs הם `Q001–Q083` במקום Domain נפרד `Q-TXT-001..083`; חסרים Group ו־resolutionEvidence; ואין כלל many-to-many מפורש לעשרת ה־CriticalDecisionPrompt records.; impact=Definition יכול להפוך Context, Question יכול להתנגש ב־ID Domain אחר, ו־Prompt יכול לקבל תשובה משתמעת.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F016; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל Statement מקבל Class יחיד כולל `definition`; 83/83 IDs הם Domain-unique; 10/10 Prompts קיימים; zero implied answer/ID collision.

- `dependencies`: [TRD2V2-REQ-066]

## 7.17 `TRD2V2-REQ-068`

- `rule`: להגדיר Relation, Conflict, Applicability, SafeState ו־orthogonal state schemas עם transition tables ו־inverse edges.

- `causeAndEffect`: defect=אין ClaimRelation enum מלא, ConflictSet schema, one Applicability per Requirement×Scope או שישה State axes נפרדים; Claim vocabulary אינו תחליף ל־admission, scope, implementation, verification, external readiness ו־approval states.; impact=Variant יכול להפוך Union, Post-Pilot יכול לדלוף ל־Pilot, ו־implemented יכול להיראות verified/approved.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F017; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: zero silent union; לכל Requirement×Scope יש Applicability יחיד; כל Axis נבדק בנפרד; forbidden transition/post-Pilot leakage mutants נכשלים.

- `dependencies`: [TRD2V2-REQ-060,TRD2V2-REQ-067]

## 7.18 `TRD2V2-REQ-069`

- `rule`: להגדיר Algorithm steps ו־Output types עם Namespaces שונים, exact input/output roots ו־failure stop ללא partial promotion.

- `causeAndEffect`: defect=אין סדר A01–A14 של admission→indexes→spans→statements→questions→decisions→conflicts→requirements→scope→graph→QA→freeze→reviews; Artifact A01–A09 של ה־Master אינו מקבל Namespace נפרד משלבי A01–A14.; impact=Producer יכול לדלג על שלב, לבצע backward mutation או לבלבל בין שני A01 שונים; אין Output inventory מלא ל־source/span/question/decision/requirement/trace manifests.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F018; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: Run ledger מוכיח את כל השלבים פעם אחת ובסדר; כל Output listed; ID namespace collision אפס; כל Failure עוצר Promotion.

- `dependencies`: [TRD2V2-REQ-066,TRD2V2-REQ-068]

## 7.19 `TRD2V2-REQ-070`

- `rule`: להוסיף typed RequirementEdge registry עם relation, condition, cardinality, invalidation ו־generation semantics; Source provenance נשאר שדה נפרד.

- `causeAndEffect`: defect=Requirement row חסר `dependencies`; הפניות פנימיות בתוך `sourceIds` אינן מגדירות אם הן Derivation, Prerequisite, Composition או Test dependency. סדר הטקסט הוא Acyclic אך אינו DAG נורמטיבי.; impact=שני Producers יכולים לבנות בסדר שונה, לאמת Child לפני Schema dependency או להפעיל Invalidation בכיוון שגוי.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F019; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל 53 edges מקבלים Type יחיד; zero implicit/dangling/cycle/self edge; topological order ו־affected-set זהים בשני Engines.

- `dependencies`: [TRD2V2-REQ-054]

## 7.20 `TRD2V2-REQ-071`

- `rule`: ליצור versioned Directive records עם exact subject/scope, precedence, source observation, safe state ו־supersession edge.

- `causeAndEffect`: defect=Public מופיע, אך אין Directive records מפורשים ל־React Web ולא Windows Forms, official WhatsApp בלבד, development freeze, continued-planning-only boundary ו־Tal rate-limit ownership.; impact=Source root יכול להכיל את ה־Ledger אך Consumer לא יידע אילו Directives מחייבים את Scope וה־safe states.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F020; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל Binding directive ב־Ledger ממופה פעם אחת ל־Requirement/Decision/Scope; excluded technology/provider paths נשארים unreachable; missing transcript detail נשאר Unknown.

- `dependencies`: [TRD2V2-REQ-060]

## 7.21 `TRD2V2-REQ-072`

- `rule`: לקבע Control set סגור ו־8 Public templates, Positive/Negative/Recovery readbacks ו־exact-diff permit dependency על כולם.

- `causeAndEffect`: defect=Req053 מציין קטגוריות רחבות אך אינו מחייב במפורש deny force-push/delete, stale-review control, full-SHA Actions, OIDC, Secret+Push protection או compensating control, CodeQL/equivalent, dependency-alert disposition, SECURITY.md, private VDP, License/NOTICE ו־large-file/history bypass tests.; impact=Public root יכול לעבור Predicate חלקי עם Governance או Detection gaps ידועים.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F021; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל Control מקבל Definition/Test/Evidence/Gate edge; direct/force/delete/workflow/unpinned/write-all/fork-secret/large-push/wrong-root bypasses נכשלים; Public נשאר Intended.

- `dependencies`: [TRD2V2-REQ-054,TRD2V2-REQ-071]

## 7.22 `TRD2V2-REQ-073`

- `rule`: ליצור Framework records נפרדים עם exact version/root/role/expiry/change trigger ולמפות כל Requirement קדימה ואחורה.

- `causeAndEffect`: defect=Role registry קיים ברמה כללית, אך אין דרישה מקומית ל־CSF2.0, SSDF1.1 מול draft1.2, SP800-61r3, SP800-63-4, ASVS5.0.0, API Top10-2023, AISVS1.0, Agentic-2026 Awareness ו־CISv8.1/IG1; אין Mapping של exact role/version/claim limit לכל אחד.; impact=Consumer יכול לבחור `latest`, להשתמש Awareness כ־Verification או לא להפעיל Delta כאשר Standard משתנה.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F022; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל Framework מקבל Role יחיד וגרסה קפואה; draft אינו Gate; latest URL navigation-only; release/source mutation פותחים Delta ו־Gate reopen.

- `dependencies`: [TRD2V2-REQ-055]

## 7.23 `TRD2V2-REQ-074`

- `rule`: להגדיר כל Record ו־Role בנפרד, exact roots/epochs/expiry, one-to-one reachability ו־disabled instance ליכולת שאינה פעילה.

- `causeAndEffect`: defect=אין Record chain מלאה MetadataObservation→LegalAssessment→Permits→Capture→Digest→Parse→SourceSeal→CapabilityProfile→PreExecutionCAS→Attempt→ProviderFact, ואין Mutation/Capability instance אחד לכל callsite/asset/credential/transport.; impact=Permit ישן או משותף יכול לדלוף בין Asset, Provider, Operation או Side effect; Research accuracy יכולה להיחשב Legal/Entitlement authority.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F023; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל reachable external mutation פותר ל־Instance יחיד ולשרשרת Authority מלאה; shared/wrong/stale permit ו־unauthorized role mutants נשארים disabled.

- `dependencies`: [TRD2V2-REQ-060,TRD2V2-REQ-070]

## 7.24 `TRD2V2-REQ-075`

- `rule`: להגדיר חמשת Test modes כ־IDs נפרדים ו־InputProvenance registry ללא business data מומצאים.

- `causeAndEffect`: defect=Attack corpus כללי אינו דורש `recoveryTestIds` ו־`attackTestIds` בכל Task/Threat/Control/Capability, ואינו מגדיר Provenance/approval/purpose/expiry/destruction/invalidation לכל Test input.; impact=Capability מסוכנת יכולה לעבור Completeness ללא Recovery שנוסה, ו־Artifact אמיתי אך מחוץ ל־Purpose/Tenant יכול להיכנס ל־Evidence.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F024; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: לכל Capability מסוכנת קיימים Positive/Negative/Failure/Concurrency/Recovery records; כל Input ו־Derived result traceable/revocable; missing provenance דוחה Evidence.

- `dependencies`: [TRD2V2-REQ-058,TRD2V2-REQ-074]

## 7.25 `TRD2V2-REQ-076`

- `rule`: להוסיף Boundary records, named appointments, live exports וחמשת Test modes לכל Route/Trust/Session transition.

- `causeAndEffect`: defect=אין Requirement ל־route/trust/session matrix, Clerk/Vercel live exports, OIDC/user envelope, RLS live matrix, Preview→Prod separation, direct Railway ingress denial או X24 uses הקשורים ל־Auth.; impact=הזכרת `tenant/auth` ב־Attack list אינה מגדירה את ה־Boundaries או ה־Evidence הדרושים נגד BOLA, stale membership, CSRF/session riding ו־RLS bypass.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F025; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: אותו exact artifact עובר isolation/auth/BFF matrices; direct ingress ו־wrong tenant/environment attempts נכשלים; privileged mutation נשארת disabled עד Evidence.

- `dependencies`: [TRD2V2-REQ-074,TRD2V2-REQ-075]

## 7.26 `TRD2V2-REQ-077`

- `rule`: להגדיר disabled-state contracts ו־root-bound Provider/Admin/Legal/storage/scanner Evidence לפני activation.

- `causeAndEffect`: defect=Scope generic אינו דורש AI-OFF/Uploads-OFF/Knowledge-OFF, Provider privacy/ZDR evidence, AISVS/eval provenance, object-storage/scanner controls, parser isolation או cascade delete/recovery.; impact=AI/File capability יכולה לקבל Readiness ממסמך Provider או Package activation ללא הוכחת account/legal/scanner boundary.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F026; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: AI/File/Knowledge routes absent או disabled עד שכל Evidence וחמשת Test modes תקפים; wrong tenant, malicious file, parser escape ו־orphan-derived-data mutants נכשלים.

- `dependencies`: [TRD2V2-REQ-068,TRD2V2-REQ-075]

## 7.27 `TRD2V2-REQ-078`

- `rule`: להגדיר SupplyChain/Network/Release artifact contracts, Trust anchors, canary/rollback Evidence ו־fail-closed reachability.

- `causeAndEffect`: defect=אין Schema מחייב ל־clean resolved graph, advisory/version selection, SBOM, provenance, verified signature, composite release manifest, fixed-adapter allowlist, DNS/IP/redirect SSRF tests, TLS/container proof או fixed rollback artifact.; impact=Public governance לבדה אינה מוכיחה Artifact, network boundary או rollback בטוחים; vulnerable dependency או generic URL יכולים להישאר reachable.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F027; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: affected dependency count אפס ב־resolved graph; generic connector/URL absent; signed manifest binds exact artifact/config; canary/rollback וחמשת Modes עוברים.

- `dependencies`: [TRD2V2-REQ-072,TRD2V2-REQ-075]

## 7.28 `TRD2V2-REQ-079`

- `rule`: להרחיב BackupManifest/RestorePlan/Evidence עם separation, cohort-window proof, quarantine ו־post-restore reconciliation/re-deletion semantics.

- `causeAndEffect`: defect=Backup/Restore rows כוללות IDs ודיגסטים, אך משמיטות account/key separation, WORM/immutability, real retention cohort, quarantine, privacy replay, re-deletion ledger, opt-out/deleted/unknown-operation resurrection suppression ו־adapter five-mode review.; impact=Restore יכול להיות עקבי ברמת Bytes אך להחזיר נתונים שנמחקו/הוסרו, או 90-day/ransomware claim יכול להישען על lifecycle config בלבד.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F028; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: Backup↔Restore exact binding, WORM/separation, real cohort, privacy replay ו־resurrection mutants עוברים בדיקות; config-only retention מקבל zero claim credit.

- `dependencies`: [TRD2V2-REQ-075]

## 7.29 `TRD2V2-REQ-080`

- `rule`: להגדיר State machine, idempotency/attempt lineage, fresh Intent+Approval+Permit לכל ניסיון, Provider/Webhook facts ו־reconciliation.

- `causeAndEffect`: defect=Constructor list מזכיר Objects כלליים אך אינו מגדיר זהויות ו־Lineage נפרדים ל־Message, Intent, Operation ו־ProviderAttempt, one-attempt rule או Unknown-outcome retry prohibition.; impact=Retry יכול להיראות Intent חדש, uniqueness יכולה להיקשר לישות הלא נכונה, ו־ambiguous provider response יכול לייצר ניסיון כפול.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F029; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: ניסיון נוסף מותר רק אם הקודם מוכח `not-started`; אחרת state נשאר Unknown וללא Retry; concurrency/recovery vectors אינם יוצרים duplicate attempt.

- `dependencies`: [TRD2V2-REQ-065,TRD2V2-REQ-074]

## 7.30 `TRD2V2-REQ-081`

- `rule`: להגדיר event taxonomy, detector, retention/redaction, owner/authority ו־safe escalation לכל Failure class.

- `causeAndEffect`: defect=Invalidation rules קיימים אך אין PII-safe events/detectors ל־stale roots, changed bytes, parser drift, role expiry, review leakage, veto change, CAS conflict או invalidation backlog.; impact=בקרה יכולה להיכשל או להיתקע בלי Signal בר־ביקורת, וה־Current view עלול להישאר ישן עד בדיקה ידנית.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F030; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל mutation מפיק Event צפוי ללא Secret/PII; dropped/duplicate/out-of-order events אינם משאירים claim Current; detector Evidence קשור ל־Root.

- `dependencies`: [TRD2V2-REQ-070]

## 7.31 `TRD2V2-REQ-082`

- `rule`: להפיק Index דטרמיניסטי מן ה־machine registry בלבד, ללא עריכה ידנית או Source of truth שני.

- `causeAndEffect`: defect=אין Index נגזר ל־Requirement, Source, Framework, Gate, Artifact ו־Finding IDs הקשור ל־Subject root.; impact=Review ידני איטי יותר, וקל יותר להחמיץ dangling/misbound ID כמו אלה שנמצאו ב־F001–F002.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F031; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: regeneration מאותו Root מפיק אותו Index; כל ID מופיע פעם אחת עם type/locator; unknown/duplicate count אפס.

- `dependencies`: [TRD2V2-REQ-054]

## 7.32 `TRD2V2-REQ-083`

- `rule`: להגדיר Derived beginner view עם Purpose→Cause→Safe state→Verification, ללא שינוי Normative content.

- `causeAndEffect`: defect=`causeAndEffect` עוזר, אך אין דרישה ל־Hebrew purpose, safe-state example ו־verification path לכל Domain, ואין כלל שמחייב Human view להיגזר מאותו Registry בלי facts כפולים.; impact=הסבר יכול לסטות מן ה־machine rule או להישאר טכני מדי בלי שה־Schema audit יבחין.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F032; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: כל Domain מקבל View נגזר; שינוי Registry משנה את ה־View; manual fact divergence ו־missing explanation count אפס.

- `dependencies`: [TRD2V2-REQ-082]

## 7.33 `TRD2V2-REQ-084`

- `rule`: ליצור detached ReviewAttempt/Invalidation/Successor records הקושרים old root, new root, exact delta, reason ו־authority, בלי להכניס אותם ל־Subject bytes.

- `causeAndEffect`: defect=בזמן Review ה־bytes השתנו וה־Review הישן בוטל נכון חיצונית, אך ה־Subject נשאר באותו path/version ואינו מפנה ל־Parent root, Delta manifest או detached invalidation receipt. מאחר ש־status הוא Authoring, אין טענה שה־Mutation עצמה אסורה; החסר הוא Durable lineage לאחר שה־Root כבר הוגש ל־Review.; impact=קורא עתידי לא יוכל לשחזר מן ה־Artifacts לבדם מדוע Review על `b0305013…` אינו תקף ומי הסמיך את Restart על `2bd122db…`.

- `sourceIds`: localObservationId=TRD2-SHR-A-20260829-F033; reportRoot=34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421

- `acceptancePredicate`: old review מקבל `STALE/NO-CREDIT`; successor packet קושר Parent+Delta+new root; אין Receipt carry-over; Offline replay משחזר את הכרונולוגיה.

- `dependencies`: [TRD2V2-REQ-056,TRD2V2-REQ-057]

# 8. מונים והתפלגות Severity

## 8.1 מכנים מקומיים בלבד

8.1.1 Producer=`7`; Math=`24`; Security=`20`; Structural=`33`; local observation union=`84`; Freeze/authority control=`1`; total rows=`85`.

8.1.2 Producer severity=`P0=4,P1=3,P2=0,P3=0`.

8.1.3 Math severity=`P0=12,P1=10,P2=2,P3=0`.

8.1.4 Security severity=`P0=9,P1=9,P2=2,P3=0`; מקור Review C מגדיר את F019 כ-P2 שמקודם ל-P0 אם Push/Merge/Release/Deploy נהיה reachable לפני Hardening, אך הווקטור המקומי נשמר בדיוק כפי שנקבע ב-Raw intake.

8.1.5 Structural severity=`P0=14,P1=15,P2=2,P3=2`.

8.1.6 arithmetic reviewer-local sum=`P0=39,P1=37,P2=6,P3=2,total=84`. סכום זה אינו Reconciled semantic denominator ואינו Product progress.

8.1.7 accepted rows=`0/85`; closed local observations=`0/84`; merged=`0`; suppressed=`0`; acceptance/closure credit=`0`.

# 9. Producer QA contract and author-time result

## 9.1 בדיקות דטרמיניסטיות

9.1.1 Heading IDs חייבים להיות בדיוק 85 IDs רציפים וייחודיים: 000 עד 084, ללא Gap או Duplicate.

9.1.2 לכל Heading row חייבים להיות בדיוק חמשת השדות: rule, causeAndEffect, sourceIds, acceptancePredicate, dependencies; שדה שישי או שדה חסר דוחים את המסמך.

9.1.3 כל 84 ה-localObservationIds חייבים להופיע פעם אחת בדיוק ב-sourceIds יחד עם Root המקור המלא; source identity חסרה, כפולה, מקוצרת או dangling דוחה את המסמך.

9.1.4 Dependency DAG חייב להכיל אפס dangling edge, אפס self-edge ואפס cycle. Structural dependencies נבדקות מול תרגום F001→052 ועד F033→084.

9.1.5 בדיקת העתקה חייבת להשוות Byte-for-byte את תוכן requiredRemediation/requiredDefinitionDelta, defect, cause כאשר קיים, impact ו-acceptancePredicate כאשר קיים מול Source root המתאים; typed missing values נבדקים מול חסר ממשי בלבד.

9.1.6 author-time deterministic generation checks=`PASS-CANDIDATE`: cardinality 85, sequence 000–084, five fields per generated row, 84 unique source identities, translated dependency graph with no dangling/self/cycle. PASS זה אינו Independent review ואינו Acceptance.

## 9.2 Verdict

9.2.1 artifact status=`CANDIDATE; 0/85 ACCEPTED`.

9.2.2 TRD-2 successor Definition generation=`BLOCKED` עד השלמת שדות חסרים, Independent reviews, Reconciliation protocol eligibility ו-Detached exact-root acceptance.

9.2.3 Gate29=`BLOCKED`; Development freeze=`ACTIVE`; אין סמכות לקוד מוצר, Git, Build, Push, Deploy או Provider mutation.

