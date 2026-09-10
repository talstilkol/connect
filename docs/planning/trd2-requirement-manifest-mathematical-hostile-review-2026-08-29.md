# 1. Connect — Review B מתמטי ותזמוני עוין ל־TRD-2 Requirement Manifest

## 1.1 זהות, נושא וגבולות

1.1.1 `artifactId=CONNECT-TRD2-REQUIREMENT-MANIFEST-MATHEMATICAL-HOSTILE-REVIEW-2026-08-29-RB1`.

1.1.2 `reviewClass=INDEPENDENT-HOSTILE-MATHEMATICAL-AND-SCHEDULE-REVIEW-B`.

1.1.3 נושא הביקורת הוא `/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-definition-requirement-manifest-2026-08-29.md`.

1.1.4 Root הנושא שנבדק הוא SHA-256=`2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a`, ‏`729` שורות ו־`50,109` בתים.

1.1.5 מקור מתמטי משווה הוא `/Users/tal/Documents/connect/web/docs/planning/progress-estimate-and-eta-mathematical-contract-2026-08-29.md`, ‏SHA-256=`d539927f18c6e7d7a718947c6f9e160fd09a780ca5d3d2f1fce2c3dc9c863110`.

1.1.6 מקור Schedule משווה הוא `/Users/tal/Documents/connect/web/docs/planning/master-plan-schedule-and-estimate-audit-2026-08-29.md`, ‏SHA-256=`35869ec7bbd04eaf5db3f7e6637276bb7d35c7d942f20fc6ab1457c24da95fee`.

1.1.7 Manifest ממצאי ה־Schedule המשווה הוא `/Users/tal/Documents/connect/web/docs/planning/master-plan-schedule-audit-findings-manifest-2026-08-29.md`, ‏SHA-256=`efba1c56115b8a1ddcb8a042baf4a410321b09bd850fcda5d0b85df2757cf4d7`.

1.1.8 הביקורת אינה משנה את הנושא, אינה מקבלת אותו, אינה יוצרת Program Tasks, אינה מקצה שעות, אינה מחשבת ETA ואינה מעניקה Credit.

1.1.9 כל מסקנה חלה רק על Root הנושא שב־1.1.4. שינוי Byte יחיד יוצר Subject חדש והביקורת נעשית `STALE-FOR-CURRENT`.

## 1.2 שיטה

1.2.1 נסרקו כל `64` מזהי `TRD2-REQ-001`–`TRD2-REQ-064` וכל `256` שדות `rule|causeAndEffect|sourceIds|acceptancePredicate`.

1.2.2 כל `MATH-001`–`MATH-032` הושווה בנפרד לדרישות הנושא; כיסוי לפי נושא דומה בלבד אינו נחשב כיסוי מלא.

1.2.3 כל `MSAF-20260829-F001`–`MSAF-20260829-F026` נבדק לנוכחות Direct identity ב־`sourceIds` של הנושא.

1.2.4 נבדקו בנפרד: Work universe, Admission, Non-work exclusion, Unique union, Credit, חמשת המכנים, Actual, ETC, Estimate ranges, Resources, Calendars, Mutexes, Waits, Feasible schedule, Snapshot identity, Freshness, Unknown ו־Publication.

1.2.5 Severity משקפת את הסיכון של קבלת Definition שחסר את הכלל: `P0` מאפשר מספר/סמכות/לוח זמנים שגויים; `P1` משאיר אי־דטרמיניזם או חוסר ישימות מהותי; `P2` פוגע בפרשנות, ניתוח או אבחון אך אינו לבדו פותח Gate.

## 1.3 פסק דין

1.3.1 `verdict=REJECT-AS-MATHEMATICAL-DEFINITION-REQUIREMENT-BASELINE`.

1.3.2 הנושא הוא בסיס קטגוריות שימושי, אך הוא אינו מחייב את TRD-2 לממש את חוזה המתמטיקה המדויק שהוא מונה כקלט.

1.3.3 Direct coverage של מזהי החוזה הוא `0/32`: אף `MATH-001`–`MATH-032` אינו מופיע ב־`sourceIds` או ב־Acceptance predicate של דרישה.

1.3.4 Direct coverage של Manifest ממצאי ה־Schedule הוא `9/26`; חסרים `17/26` מזהים.

1.3.5 Semantic coverage של החוזה המתמטי הוא `0 FULL`, ‏`24 PARTIAL`, ‏`8 ABSENT` לפי מטריצת פרק 5.

1.3.6 נמצאו `24` Findings עצמאיים: `12 P0`, ‏`10 P1`, ‏`2 P2`.

1.3.7 Product percentage, Product remaining person-hours, Critical path מספרי ו־Calendar ETA נשארים `unknown/unavailable`; ‏`Gate29=BLOCKED` ו־Development freeze נשאר פעיל.

# 2. Findings P0

## 2.1 `TRD2-MATH-RB-F001` — חוזה MATH ו־Schedule Findings אינם Traceable לדרישות

2.1.1 `severity=P0`.

2.1.2 `subjectLocator=§1.2.6;§1.2.13;§1.3.2–§1.3.4; כל שדות sourceIds; §11.2`.

2.1.3 `defect`: הנושא מונה Root של 32 חוזי מתמטיקה אך אינו מפנה לאף `MATH-*`. הוא מפנה ישירות רק לתשעה מזהי `MSAF` ומשמיט 17 מזהים: `F001,F004,F005,F006,F007,F008,F009,F010,F012,F013,F014,F017,F018,F020,F021,F023,F025`.

2.1.4 `mathematicalImpact`: TRD-2 עתידי יכול לעבור 64/64 דרישות הנושא תוך השמטת נוסחה או Finding חוסם, משום שאין Forward/Inverse edge ברמת זהות.

2.1.5 `requiredDefinitionDelta`: כל 32 מזהי MATH וכל 26 מזהי MSAF חייבים להופיע פעם אחת לפחות במפת `sourceContractId/sourceFindingId→TRD2-REQ→Definition object→conformance vector`; Range או Root כללי אינם תחליף.

2.1.6 `acceptancePredicate`: שני Readers מפיקים `32/32` ו־`26/26` identity coverage, ללא orphan, duplicate או unresolved reference; כל השמטה מחזירה `DEFINITION-SOURCE-COVERAGE-BLOCKED`.

2.1.7 `sourceContractIds=MATH-001–MATH-032`; `sourceFindingIds=MSAF-20260829-F001–MSAF-20260829-F026`.

## 2.2 `TRD2-MATH-RB-F002` — Work Universe ו־Admission set אינם מוגדרים

2.2.1 `severity=P0`.

2.2.2 `subjectLocator=§2.3 TRD2-REQ-003;§2.5 TRD2-REQ-005;§5.2 TRD2-REQ-027;§11.1 TRD2-REQ-063`.

2.2.3 `defect`: קיימים שמות לחמישה Domains, אך אין דרישה ל־`W(r)` ול־`A(r,t)`, ל־Leaf predicate, ל־AcceptanceEnvelope membership, או להוצאה מפורשת של Draft/Rejected/Superseded/Digest-mismatched Work.

2.2.4 `mathematicalImpact`: Draft או Generation שנדחה יכולים להיכנס למכנה, לשאת Actual/Credit ולהקטין Remaining.

2.2.5 `requiredDefinitionDelta`: להגדיר Work universe ו־Admission set כשתי פונקציות נפרדות, עם Root, Domain, Leaf, state, supersession time, record digest ו־evaluation time.

2.2.6 `acceptancePredicate`: Parsers A/B מחזירים Set זהה; Draft, Rejected, Superseded ו־Digest mismatch אינם Members; Root ללא Acceptance envelope מחזיר `BLOCKED-NO-ADMITTED-SET`.

2.2.7 `sourceContractIds=MATH-001,MATH-002`; `sourceFindingIds=MSAF-20260829-F001,MSAF-20260829-F018,MSAF-20260829-F019`.

## 2.3 `TRD2-MATH-RB-F003` — Non-work exclusion ו־Canonical unique union אינם שלמים

2.3.1 `severity=P0`.

2.3.2 `subjectLocator=§2.3.4;§6.4 TRD2-REQ-038;§7.1.4;§7.2 TRD2-REQ-043;§11.1 TRD2-REQ-063`.

2.3.3 `defect`: `unique-ID union` מוזכר, אך אין CanonicalWorkKey/Alias resolution contract ואין כלל גלובלי שלפיו Parent, Alias, Template, Wait, Gate, Resource, Artifact ו־Receipt מקבלים אפס Effort ו־Credit.

2.3.4 `mathematicalImpact`: אותו Work יכול להיספר כמה פעמים ב־Stage/Scope/Finding/Control, או Non-work יכול להגדיל Hours ומכנה.

2.3.5 `requiredDefinitionDelta`: להגדיר `EligibleForEffort`, CanonicalWorkKey, Alias registry, collision terminal ו־Set union לפי Work ID; כל View נגזר מאותו Union.

2.3.6 `acceptancePredicate`: שינוי סדר Views אינו משנה Total; Alias/Parent/Template/Wait מוסיפים אפס; unresolved ID או collision מחזירים `BLOCKED-NO-UNIQUE-UNION`.

2.3.7 `sourceContractIds=MATH-003,MATH-004`; `sourceFindingIds=MSAF-20260829-F003,MSAF-20260829-F007,MSAF-20260829-F010,MSAF-20260829-F014`.

## 2.4 `TRD2-MATH-RB-F004` — חמשת המכנים נקראים בשם אך אינם פונקציות קנוניות

2.4.1 `severity=P0`.

2.4.2 `subjectLocator=§2.3 TRD2-REQ-003;§6.5 TRD2-REQ-038;§11.1 TRD2-REQ-063`.

2.4.3 `defect`: אין Membership formulas נפרדות ל־Bootstrap root, Lifecycle generation, Planning-generation plan root, Program ScopeManifest ו־Service epoch; אין דרישה למכנה מאושר, קפוא, סופי ולא־ריק.

2.4.4 `mathematicalImpact`: Membership יכול להשתנות אחרי פרסום, Work יכול לעבור בין Domains, ומכנה ריק יכול להוצג כ־0% או 100%.

2.4.5 `requiredDefinitionDelta`: להגדיר במפורש `D_B(r_B)`, ‏`D_L(g)`, ‏`D_P(g)`, ‏`D_R(s)`, ‏`D_S(e)` ואת preconditions/failure terminals של כל אחד.

2.4.6 `acceptancePredicate`: כל Work שייך למכנה Domain אחד בלבד; כל מכנה נגזר מ־Root exact; Set חסר/ריק/לא־סופי מחזיר `unknown/unavailable`; אין denominator inheritance.

2.4.7 `sourceContractIds=MATH-007,MATH-008,MATH-009,MATH-010,MATH-011,MATH-012`; `sourceFindingIds=MSAF-20260829-F008,MSAF-20260829-F010,MSAF-20260829-F015,MSAF-20260829-F024`.

## 2.5 `TRD2-MATH-RB-F005` — Credit predicate אינו Total ואינו Fail-closed

2.5.1 `severity=P0`.

2.5.2 `subjectLocator=§5.7 TRD2-REQ-032;§7.2 TRD2-REQ-043;§11.1 TRD2-REQ-063`.

2.5.3 `defect`: הביטוי “binary evidence-based Credit” ו־“all predicates” אינו מונה את צירופי Admission, executionStatus, Acceptance, Evidence freshness, Review validity ו־Invalidation, ואינו מגדיר מה קורה כאשר אחד מהם Unknown.

2.5.4 `mathematicalImpact`: Local completion, Evidence שפג, Review חסר או Work invalidated עלולים לקבל Credit=1; לחלופין Error יכול להיות coerced למספר.

2.5.5 `requiredDefinitionDelta`: להגדיר Predicate בינרי מלא `C(w,t)` ואת ההבחנה בין invalid denominator, שמבטל Metric, לבין Work לא־מוכח, שמקבל `C=0`.

2.5.6 `acceptancePredicate`: כל צירוף אפשרי של ששת הממדים נבדק; Credit=1 רק כאשר כולם תקפים; Root/denominator invalid מחזיר Metric `unknown/unavailable` ולא Credit aggregate.

2.5.7 `sourceContractIds=MATH-005`; `sourceFindingIds=MSAF-20260829-F008,MSAF-20260829-F018,MSAF-20260829-F019`.

## 2.6 `TRD2-MATH-RB-F006` — Count, Weight ו־Gate readiness אינם מוגדרים ואיסור Blended overall חסר

2.6.1 `severity=P0`.

2.6.2 `subjectLocator=§6.3 TRD2-REQ-036;§7.2 TRD2-REQ-043;§11.1 TRD2-REQ-063`.

2.6.3 `defect`: אין נוסחת Count progress, אין Weight policy/root/positive-sum rule, אין GateReadiness formula, ואין איסור מפורש על Average/Weighted average מעל חמשת המכנים וה־Gate state.

2.6.4 `mathematicalImpact`: UI יכול לפרסם “אחוז כולל” שרירותי, לשנות משקלים בדיעבד או להמיר Gate29 חסום ל־0% Product.

2.6.5 `requiredDefinitionDelta`: להגדיר `P_count`, ‏`P_weight`, ‏`GateReadiness` ו־Publication vector נפרד; לאסור כל Aggregate מעל הווקטור.

2.6.6 `acceptancePredicate`: Count ו־Weight מוצגים בנפרד; Weight קפוא וחיובי; Gate set exact ולא־ריק; ניסיון Overall aggregate נכשל Schema; Gate29 אינו Percent.

2.6.7 `sourceContractIds=MATH-012,MATH-013,MATH-014`; `sourceFindingIds=MSAF-20260829-F008,MSAF-20260829-F009`.

## 2.7 `TRD2-MATH-RB-F007` — Actual ledger אינו מוגדר ברמת Event ו־Cut

2.7.1 `severity=P0`.

2.7.2 `subjectLocator=§5.2 TRD2-REQ-027;§7.2 TRD2-REQ-043`.

2.7.3 `defect`: הנושא דורש “Actual ledger” בלבד; אין Event ID, Task version, Actor, timestamp, effortMinutes, Evidence digest, Actual cut, append-only rule או duplicate failure.

2.7.4 `mathematicalImpact`: Actual יכול להשתנות רטרואקטיבית, להיספר פעמיים, להתערבב בין Generations או לכלול Events אחרי ה־Cut.

2.7.5 `requiredDefinitionDelta`: להגדיר `Actual(w,c)` כאגרגציה של Events תקפים עד Cut קפוא, עם Units, uniqueness, monotonic history ו־generation binding.

2.7.6 `acceptancePredicate`: Replay מאותו Cut זהה; Event עתידי מוחרג; duplicate מכשיל ואינו נספר פעם אחת; Actual של Generation שנדחה נשמר היסטורית.

2.7.7 `sourceContractIds=MATH-015`; `sourceFindingIds=MSAF-20260829-F021`.

## 2.8 `TRD2-MATH-RB-F008` — ETC, Remaining ו־Gross אינם חוזים חישוביים

2.8.1 `severity=P0`.

2.8.2 `subjectLocator=§5.2 TRD2-REQ-027;§7.2 TRD2-REQ-043;§7.3 TRD2-REQ-044`.

2.8.3 `defect`: אין EstimateRevision הקשור ל־Task version ול־ActualCut, אין `0≤min≤max`, אין נוסחת Unique-sum ל־Remaining/Gross, אין כלל ETC=0 ל־Accepted terminal בלבד, ואין Whole-metric Unknown כאשר Member יחיד חסר.

2.8.4 `mathematicalImpact`: Remaining יכול להיגזר מ־baseline-minus-actual, Partial total יכול להיראות שלם, או completed Work עם Rework פתוח לקבל ETC=0.

2.8.5 `requiredDefinitionDelta`: להגדיר בנפרד ETC revision, Remaining envelope ו־Gross envelope; לקשור כל ערך ל־Task/Generation/Root/Cut/Review.

2.8.6 `acceptancePredicate`: ETC חסר לעלה חובה מפיל את כל Metric; External Wait אינו Person-effort; canceled ROM אינו Input; אותו Root/Cut מחזיר אותו Range.

2.8.7 `sourceContractIds=MATH-016,MATH-017,MATH-018`; `sourceFindingIds=MSAF-20260829-F003,MSAF-20260829-F004,MSAF-20260829-F021,MSAF-20260829-F022`.

## 2.9 `TRD2-MATH-RB-F009` — דחיית Generation, Rework ו־Credit carry-over אינם מקבלים Accounting contract

2.9.1 `severity=P0`.

2.9.2 `subjectLocator=§2.5 TRD2-REQ-005;§7.2 TRD2-REQ-043;§10.6 TRD2-REQ-061`.

2.9.3 `defect`: Immutable successor generation נדרש, אך אין כלל שמאפס Credit של Generation שנדחה, שומר את Actual שלו, ומכניס ל־Successor רק Work חדש או Rework IDs מפורשים.

2.9.4 `mathematicalImpact`: Byte שנפסל יכול לשמר Completion, או Actual שהושקע יכול להיעלם ולהקטין Forecast at completion.

2.9.5 `requiredDefinitionDelta`: להגדיר rejected-generation accounting, Successor Delta, Rework identity ו־Baseline preservation.

2.9.6 `acceptancePredicate`: rejection יוצר Credit=0 בדור הישן בלי למחוק Actual; successor אינו יורש Credit/Hours ללא mapping; Rebaseline יוצר version חדש ושומר previous baseline.

2.9.7 `sourceContractIds=MATH-006,MATH-020`; `sourceFindingIds=MSAF-20260829-F002,MSAF-20260829-F019,MSAF-20260829-F021`.

## 2.10 `TRD2-MATH-RB-F010` — External Wait חסר Bounds ו־Schedule semantics מלאים

2.10.1 `severity=P0`.

2.10.2 `subjectLocator=§7.1 TRD2-REQ-042;§7.3 TRD2-REQ-044`.

2.10.3 `defect`: “SLA observation range” אינו מחייב `minCalendar/maxCalendar`, allowed overlap, graph trigger/finish relation ו־critical-unbounded terminal; Retry/Escalation אינם תחליף ל־upper bound.

2.10.4 `mathematicalImpact`: Wait יכול להיספר ידנית, פעמיים או לא להיספר; High ETA יכול להופיע אף שאין Bound חיצוני.

2.10.5 `requiredDefinitionDelta`: להגדיר Wait node עם 13/13 שדות, Effort=0, Low/High calendar durations, Trigger edge, overlap, Receipt, expiry ו־safe state.

2.10.6 `acceptancePredicate`: Wait אינו משנה Person-hours; overlap נגזר רק מ־Edges; Required critical Wait ללא Max מבטל High ETA; Receipt חסר חוסם successor.

2.10.7 `sourceContractIds=MATH-025`; `sourceFindingIds=MSAF-20260829-F016,MSAF-20260829-F017`.

## 2.11 `TRD2-MATH-RB-F011` — Feasible low/high schedule אינו מוגדר דטרמיניסטית

2.11.1 `severity=P0`.

2.11.2 `subjectLocator=§6.1 TRD2-REQ-034;§6.8 TRD2-REQ-041;§7.3 TRD2-REQ-044`.

2.11.3 `defect`: אין Metric mode, ‏FS/SS/FF+lag semantics, schedule anchor rule, solver/version, tie-break policy, same-input-root relation בין Low/High, או הבחנה בין Feasible scenario ל־Minimum makespan הדורש Optimality proof.

2.11.4 `mathematicalImpact`: שני Schedulers יכולים להחזיר תאריכים שונים ושניהם להיקרא “ETA”; Scenario יכול להיות מוצג כאופטימום ללא הוכחה.

2.11.5 `requiredDefinitionDelta`: להגדיר Low/High resource-constrained schedule contracts מלאים, Inputs roots, constraints, determinism, anchor, output class ו־optimality claim rule.

2.11.6 `acceptancePredicate`: אותו Input+solver policy מחזיר אותו Result root; כל Dependency/Capacity/Mutex/Wait constraint מתקיים; High אינו מוקדם מ־Low; Input חסר מחזיר typed Unknown.

2.11.7 `sourceContractIds=MATH-021,MATH-026,MATH-027`; `sourceFindingIds=MSAF-20260829-F005,MSAF-20260829-F006,MSAF-20260829-F017`.

## 2.12 `TRD2-MATH-RB-F012` — Unknown predicate ו־Publication contract אינם Exhaustive

2.12.1 `severity=P0`.

2.12.2 `subjectLocator=§3.2 TRD2-REQ-008;§5.8 TRD2-REQ-033;§7.3 TRD2-REQ-044;§11.1 TRD2-REQ-063`.

2.12.3 `defect`: קיימים typed Unknown ו־מספר תנאי כשל נקודתיים, אך אין OR exhaustive לכל Metric ואין Payload חובה עם metric/method/unit/roots/Cut/asOf/validThrough/assumptions/exclusions/critical waits/reasons.

2.12.4 `mathematicalImpact`: Partial number, Historical ROM, Low בלבד, ידנית overridden number או Number ללא provenance יכולים להתפרסם כ־Current.

2.12.5 `requiredDefinitionDelta`: להגדיר `Unknown(metric)` מעל כל Validators ואת Publication schema; failure terminal גובר תמיד על formula.

2.12.6 `acceptancePredicate`: כל תנאי כשל מופעל לבדו ומבטל רק Metrics תלויים; אין Zero fallback או Manual override; Payload חסר או Blended overall מחזיר `REJECT-PUBLICATION`.

2.12.7 `sourceContractIds=MATH-031,MATH-032`; `sourceFindingIds=MSAF-20260829-F003,MSAF-20260829-F004,MSAF-20260829-F008,MSAF-20260829-F009,MSAF-20260829-F025`.

# 3. Findings P1

## 3.1 `TRD2-MATH-RB-F013` — Subject מסומן NOT-FROZEN אך דורש Review על Root קפוא

3.1.1 `severity=P1`.

3.1.2 `subjectLocator=§1.1.4;§12.1.3`.

3.1.3 `defect`: Header קובע `NOT-FROZEN`, בעוד disposition דורש Review נגד “exact frozen root”; אין Freeze receipt שמבדיל Authoring status מן Review subject status.

3.1.4 `scheduleImpact`: שינוי במהלך Review יכול להפוך findings ל־stale או לגרום לשני Reviews לבדוק Bytes שונים.

3.1.5 `requiredDefinitionDelta`: להוסיף detached freeze receipt עם Subject root, generation, frozenAt, permitted successor rule ו־Review packet IDs; אין לשנות את ה־Subject in place.

3.1.6 `acceptancePredicate`: Review A/B bind לאותו frozen root; שינוי Byte יוצר successor ומבטל Current review eligibility; Header ו־receipt אינם סותרים.

3.1.7 `sourceContractIds=MATH-029,MATH-030`; `sourceFindingIds=MSAF-20260829-F019,MSAF-20260829-F025`.

## 3.2 `TRD2-MATH-RB-F014` — גבול Bootstrap/Lifecycle/Planning/Product/Service אינו אלגוריתמי

3.2.1 `severity=P1`.

3.2.2 `subjectLocator=§2.3 TRD2-REQ-003;§10 Candidate lifecycle;§11.1 TRD2-REQ-063`.

3.2.3 `defect`: שמות חמשת Domains קיימים, אך אין כלל classification שקובע ש־Validation לפני Subject קפוא יכול להיות Bootstrap וש־QA/Review/Acceptance לאחר Freeze הם Lifecycle בלבד.

3.2.4 `scheduleImpact`: Review יכול להיכנס ל־Planning או Program denominator; Bootstrap יכול להישאר פתוח לנצח; אותו Work עשוי לקבל שתי זהויות.

3.2.5 `requiredDefinitionDelta`: להגדיר transition table, exact allowed Work kinds לכל Domain ו־pairwise-disjoint invariant.

3.2.6 `acceptancePredicate`: כל Work מסווג באופן יחיד; Lifecycle של Generation אינו Member ב־Subject שלו; Intersections בין חמשת המכנים ריקים.

3.2.7 `sourceContractIds=MATH-001,MATH-007,MATH-008,MATH-009,MATH-010,MATH-011`; `sourceFindingIds=MSAF-20260829-F002,MSAF-20260829-F020,MSAF-20260829-F024`.

## 3.3 `TRD2-MATH-RB-F015` — Task leaf אינו מחייב Atomicity ותקרת 480 דקות

3.3.1 `severity=P1`.

3.3.2 `subjectLocator=§5.2 TRD2-REQ-027;§5.3 TRD2-REQ-028`.

3.3.3 `defect`: Total Task schema אינו מחייב פעולה יחידה, `0<minMinutes≤maxMinutes≤480`, Product output יחיד ו־Evidence output נפרד; Typed inapplicable יכול לעקוף שדות Execution חיוניים.

3.3.4 `scheduleImpact`: Parent או משימה רב־פעולתית יכולה לקבל Estimate/Credit ולא ניתן לשבץ אותה באופן אמין.

3.3.5 `requiredDefinitionDelta`: להוסיף Atomicity predicate, bounded estimate invariant, producer uniqueness והפרדה בין Product output ל־Evidence output.

3.3.6 `acceptancePredicate`: כל Leaf עובר 18/18+linked-registry schema, פעולה יחידה ותקרת 480; Parent/Alias ללא Estimate/Status/Credit; typed inapplicable מוגבל לשדות מותרים בלבד.

3.3.7 `sourceContractIds=MATH-001,MATH-003,MATH-018`; `sourceFindingIds=MSAF-20260829-F001,MSAF-20260829-F013`.

## 3.4 `TRD2-MATH-RB-F016` — Graph validity חסר Schedule reachability ו־relation semantics

3.4.1 `severity=P1`.

3.4.2 `subjectLocator=§6.1 TRD2-REQ-034;§6.2 TRD2-REQ-035;§7.3 TRD2-REQ-044`.

3.4.3 `defect`: Edge registry כללי אינו מחייב `noDangling`, ‏`noSelfEdge`, required milestone reachability, generation-order validity או relation/lag units של Schedule.

3.4.4 `scheduleImpact`: Graph יכול להיות acyclic אך חסר predecessor חובה, לא להגיע ל־Release או לקשור Generation עתידי לאחור.

3.4.5 `requiredDefinitionDelta`: להגדיר `ValidGraph` מלא ו־Schedule edge subtype registry עם cardinality, lag unit ו־generation constraint.

3.4.6 `acceptancePredicate`: Cycle, dangling, self-edge, unreachable required node ו־future-generation authority נכשלים; שני graph engines מחזירים אותו topological result.

3.4.7 `sourceContractIds=MATH-021`; `sourceFindingIds=MSAF-20260829-F005,MSAF-20260829-F026`.

## 3.5 `TRD2-MATH-RB-F017` — Capacity calendar חסר פונקציית Net capacity ו־Horizon

3.5.1 `severity=P1`.

3.5.2 `subjectLocator=§6.6 TRD2-REQ-039;§6.7 TRD2-REQ-040`.

3.5.3 `defect`: רשימת שדות Calendar אינה מגדירה discretization, horizon coverage, interval boundary, net focus calculation או כלל שמנכה Support load פעם אחת בלבד.

3.5.4 `scheduleImpact`: שתי מימושים יכולים להפיק Capacity שונה מאותם intervals; Leave/Support/DST יכולים להיספר פעמיים או לא להיספר.

3.5.5 `requiredDefinitionDelta`: להגדיר `cap_p(τ)` ו־`Capacity_p([a,b])`, timezone/DST/discretization policy, horizon completeness ו־net-load derivation.

3.5.6 `acceptancePredicate`: Calendar מכסה את כל Horizon; capacity לעולם לא שלילית; leave/support מנוכים פעם אחת; expiry מחזיר schedule `unknown/unavailable`.

3.5.7 `sourceContractIds=MATH-022`; `sourceFindingIds=MSAF-20260829-F006,MSAF-20260829-F024,MSAF-20260829-F025`.

## 3.6 `TRD2-MATH-RB-F018` — Assignment feasibility חסר Demand inequality ו־splitting policy

3.6.1 `severity=P1`.

3.6.2 `subjectLocator=§5.1 TRD2-REQ-026;§6.6 TRD2-REQ-039;§6.7 TRD2-REQ-040`.

3.6.3 `defect`: Eligibility נדרש, אך אין Primary named assignment, Work demand per interval, `Σ demand≤capacity`, conflict matrix או כלל פיצול Work בין אנשים.

3.6.4 `scheduleImpact`: Schedule יכול להקצות אותו אדם לכמה Tasks מעל capacity, להוסיף “team member” לא ממונה או לפצל Effort בצורה אופטימית.

3.6.5 `requiredDefinitionDelta`: להגדיר Assignment object ופונקציית FeasibleAssignment, interval demand inequality ו־parallel-splitting policy.

3.6.6 `acceptancePredicate`: Person לא־כשיר/לא־פעיל/בניגוד עניינים נכשל; overlap מעל capacity נכשל; Role ללא Appointment אינו Capacity.

3.6.7 `sourceContractIds=MATH-023`; `sourceFindingIds=MSAF-20260829-F006,MSAF-20260829-F020`.

## 3.7 `TRD2-MATH-RB-F019` — Mutex contract אינו מוכיח שכל Side-effect boundary מכוסה

3.7.1 `severity=P1`.

3.7.2 `subjectLocator=§6.8 TRD2-REQ-041`.

3.7.3 `defect`: Mutex schema כולל capacity/lease, אך אין Exhaustive mapping מכל Side-effect boundary ל־Mutex ואין demand function שמחייב `Σ active demand≤capacity` בכל זמן.

3.7.4 `scheduleImpact`: Boundary שלא מופה יכול להישמט מן Solver; Environment/Git/DB/Meta mutation יכול להתרחש במקביל למרות שהתוצאות נראות feasible.

3.7.5 `requiredDefinitionDelta`: להגדיר boundary coverage registry, positive integer capacity, per-Task demand ו־schedule feasibility invariant.

3.7.6 `acceptancePredicate`: כל Side-effect Task מפנה ל־Mutex או ל־reviewed nonexclusive proof; over-capacity, missing boundary, stale lease ו־unordered multi-lock נכשלים.

3.7.7 `sourceContractIds=MATH-024`; `sourceFindingIds=MSAF-20260829-F006,MSAF-20260829-F017,MSAF-20260829-F023`.

## 3.8 `TRD2-MATH-RB-F020` — Schedule snapshot identity ו־Freshness אינם כוללים את כל הקלטים

3.8.1 `severity=P1`.

3.8.2 `subjectLocator=§7.3 TRD2-REQ-044;§10.6 TRD2-REQ-061`.

3.8.3 `defect`: `explicit as-of root` אינו מחייב Input root המורכב מ־registry/scope/graph/estimate/assignment/calendar/mutex/wait/ActualCut/solver/anchor, Result root ו־validThrough.

3.8.4 `scheduleImpact`: שינוי Capacity, Wait, Actual cut או Solver policy יכול להשאיר Schedule ישן Current מפני שהקלט המשתנה לא נכלל ב־Identity.

3.8.5 `requiredDefinitionDelta`: להגדיר scheduleInputRoot, scheduleSnapshotId ו־Fresh predicate מעל כל Roots, clock policy ו־invalidation events.

3.8.6 `acceptancePredicate`: שינוי Byte בכל Input משנה Snapshot identity ומסמן קודמו stale; Historical נשמר אך אינו Current; Hidden input נכשל.

3.8.7 `sourceContractIds=MATH-029,MATH-030`; `sourceFindingIds=MSAF-20260829-F019,MSAF-20260829-F025`.

## 3.9 `TRD2-MATH-RB-F021` — Service-lifecycle schedule אינו מחויב ב־Cadence ובניכוי Capacity

3.9.1 `severity=P1`.

3.9.2 `subjectLocator=§2.3 TRD2-REQ-003;§11.1 TRD2-REQ-063`.

3.9.3 `defect`: Service-lifecycle denominator נקרא בשם, אך אין requirement ל־service epoch, measurement window, active obligation enumeration, cadence/owner או deduction מ־future capacity.

3.9.4 `scheduleImpact`: recurring patching/on-call/reviews יכולים להיעלם מן Capacity או לזהם Completion של Build.

3.9.5 `requiredDefinitionDelta`: להגדיר Service epoch denominator ו־Lifecycle schedule עם cadence, owner, capacity demand ו־scope.

3.9.6 `acceptancePredicate`: recurring Work אינו ב־Program set; כל obligation פעילה ניתנת ל־enumeration; Capacity calendar מנכה אותה פעם אחת; epoch change יוצר denominator חדש.

3.9.7 `sourceContractIds=MATH-011,MATH-022`; `sourceFindingIds=MSAF-20260829-F024`.

## 3.10 `TRD2-MATH-RB-F022` — Planning-generation denominator אינו מחייב Scope partition מלא

3.10.1 `severity=P1`.

3.10.2 `subjectLocator=§2.3 TRD2-REQ-003;§6.5 TRD2-REQ-038;§11.1 TRD2-REQ-063`.

3.10.3 `defect`: אין דרישה שכל Planning-generation Work instance יקושר ל־accepted GenerationPlan root ול־Scope partition סופי, וש־Output שלו ייכנס רק ל־Generation הבא.

3.10.4 `scheduleImpact`: Planning work יכול להיספר כ־Program completion או ליצור את המכנה שהוא עצמו צורך באותה Generation.

3.10.5 `requiredDefinitionDelta`: להגדיר Planning-generation membership, complete partition, disjointness מ־Program/Lifecycle ו־next-generation output rule.

3.10.6 `acceptancePredicate`: כל Planning instance קשור ל־GenerationPlan קודם ומאושר; intersection עם Program ריק; same-generation output אינו Member.

3.10.7 `sourceContractIds=MATH-009`; `sourceFindingIds=MSAF-20260829-F001,MSAF-20260829-F002,MSAF-20260829-F013`.

# 4. Findings P2

## 4.1 `TRD2-MATH-RB-F023` — אי־ודאות, Calibration ו־Variance אינם מוגדרים

4.1.1 `severity=P2`.

4.1.2 `subjectLocator=§7.2 TRD2-REQ-043`.

4.1.3 `defect`: confidence class ו־basis מוזכרים, אך אין Assumptions/Exclusions contract, Correlation model, CalibrationEvidence, איסור P50/P80 ללא Calibration או Forecast/Variance formula ששומר Baseline.

4.1.4 `scheduleImpact`: Arithmetic Min/Max יכול להיות מוצג כהסתברות, Commitment או Confidence calibrated; Rebaseline יכול למחוק variance.

4.1.5 `requiredDefinitionDelta`: להגדיר meaning of range, calibration/correlation gate, ForecastAtCompletion, VarianceRange ו־immutable previous baseline.

4.1.6 `acceptancePredicate`: P50/P80 ללא Calibration נכשל; correlation unknown אינה הופכת לעצמאות; reserve ללא Work/Risk IDs אינו נכנס; rebaseline יוצר version חדש.

4.1.7 `sourceContractIds=MATH-019,MATH-020`; `sourceFindingIds=MSAF-20260829-F022`.

## 4.2 `TRD2-MATH-RB-F024` — Critical, Near-critical, Slack ו־Bottleneck outputs חסרים

4.2.1 `severity=P2`.

4.2.2 `subjectLocator=§7.3 TRD2-REQ-044`.

4.2.3 `defect`: Feasible schedule נדרש, אך לא מוגדרים resource-constrained slack, Critical predicate, Near-critical threshold, free/total float, resource utilization, Mutex queue או Wait sensitivity.

4.2.4 `scheduleImpact`: אי אפשר להסביר מה חוסם Finish, מה עלול להפוך קריטי או איזה Bottleneck משפיע על Schedule.

4.2.5 `requiredDefinitionDelta`: להגדיר Critical/Near-critical/Slack outputs על אותו Snapshot ו־threshold policy לא־רטרואקטיבית.

4.2.6 `acceptancePredicate`: כל Node מקבל Slack/float או typed inapplicable; critical iff slack=0; threshold קפוא; utilization/queues/sensitivity קשורים לאותו Input root.

4.2.7 `sourceContractIds=MATH-028`; `sourceFindingIds=MSAF-20260829-F023`.

# 5. מטריצת כיסוי `MATH-001`–`MATH-032`

## 5.1 משמעות סטטוס

5.1.1 `FULL` דורש Direct identity mapping וכל semantics/preconditions/failure/tests; אין אף רשומה כזו בנושא.

5.1.2 `PARTIAL` מציין מושג דומה אך חסר לפחות invariant, formula, terminal או traceability.

5.1.3 `ABSENT` מציין שאין דרישה שמחייבת את ליבת החוזה.

## 5.2 מטריצה

5.2.1 `MATH-001=PARTIAL` דרך `TRD2-REQ-003,027`; חסרים `W(r)` ו־Leaf admission.

5.2.2 `MATH-002=ABSENT`; אין `A(r,t)`.

5.2.3 `MATH-003=PARTIAL` דרך `TRD2-REQ-038,042`; אין Non-work exclusion גלובלי.

5.2.4 `MATH-004=PARTIAL` דרך `TRD2-REQ-003,043`; אין CanonicalWorkKey/Alias terminal.

5.2.5 `MATH-005=PARTIAL` דרך `TRD2-REQ-043`; אין Predicate מלא.

5.2.6 `MATH-006=ABSENT`; אין rejected-generation accounting.

5.2.7 `MATH-007=PARTIAL` דרך `TRD2-REQ-003,063`; אין Membership formula.

5.2.8 `MATH-008=PARTIAL` דרך `TRD2-REQ-003,063`; אין Lifecycle root/generation formula.

5.2.9 `MATH-009=PARTIAL` דרך `TRD2-REQ-003,063`; אין GenerationPlan membership.

5.2.10 `MATH-010=PARTIAL` דרך `TRD2-REQ-038,063`; אין Program root/Scope formula.

5.2.11 `MATH-011=PARTIAL` דרך `TRD2-REQ-003,063`; אין Epoch/cadence formula.

5.2.12 `MATH-012=PARTIAL` דרך `TRD2-REQ-063`; אין Count formula/nonempty terminal.

5.2.13 `MATH-013=ABSENT`; אין Weight policy או formula.

5.2.14 `MATH-014=ABSENT`; אין GateReadiness/no-blend contract.

5.2.15 `MATH-015=PARTIAL` דרך `TRD2-REQ-043`; אין Event/Cut schema.

5.2.16 `MATH-016=PARTIAL` דרך `TRD2-REQ-027,043`; אין reviewed revision/Cut rule.

5.2.17 `MATH-017=PARTIAL` דרך `TRD2-REQ-043`; אין Remaining formula/whole-metric terminal.

5.2.18 `MATH-018=ABSENT`; אין Gross formula.

5.2.19 `MATH-019=PARTIAL` דרך `TRD2-REQ-043`; אין calibration/correlation semantics.

5.2.20 `MATH-020=ABSENT`; אין variance/rework formula.

5.2.21 `MATH-021=PARTIAL` דרך `TRD2-REQ-034,044`; חסרים validity predicates.

5.2.22 `MATH-022=PARTIAL` דרך `TRD2-REQ-039,040`; אין capacity function.

5.2.23 `MATH-023=PARTIAL` דרך `TRD2-REQ-026,039,040`; אין demand inequality.

5.2.24 `MATH-024=PARTIAL` דרך `TRD2-REQ-041`; אין exhaustive boundary coverage.

5.2.25 `MATH-025=PARTIAL` דרך `TRD2-REQ-042`; חסרים Low/High/overlap semantics.

5.2.26 `MATH-026=PARTIAL` דרך `TRD2-REQ-044`; אין solver/anchor/optimality contract.

5.2.27 `MATH-027=PARTIAL` דרך `TRD2-REQ-044`; אין High bound/same-input relation.

5.2.28 `MATH-028=ABSENT`; אין Critical/Slack contract.

5.2.29 `MATH-029=PARTIAL` דרך `TRD2-REQ-044`; אין complete input/result root.

5.2.30 `MATH-030=PARTIAL` דרך `TRD2-REQ-061`; אין Schedule-specific Fresh predicate.

5.2.31 `MATH-031=PARTIAL` דרך `TRD2-REQ-008,033,044,063`; אין exhaustive OR.

5.2.32 `MATH-032=ABSENT`; אין Publication payload/rejection contract.

5.2.33 סיכום המטריצה: `FULL=0`, ‏`PARTIAL=24`, ‏`ABSENT=8`, ‏`TOTAL=32`.

# 6. Direct coverage של Schedule findings

## 6.1 נוכחים

6.1.1 תשעת המזהים הנוכחים הם `MSAF-20260829-F002,F003,F011,F015,F016,F019,F022,F024,F026`.

## 6.2 חסרים

6.2.1 17 המזהים החסרים הם `MSAF-20260829-F001,F004,F005,F006,F007,F008,F009,F010,F012,F013,F014,F017,F018,F020,F021,F023,F025`.

6.2.2 Root inclusion ב־§1.2.6 אינו מוכיח Coverage של רשומות בודדות ואינו מקיים את עקרון ה־no-merge שב־§1.3.2.

# 7. Adversarial vectors שחייבים להיכשל ב־TRD-2 עתידי

## 7.1 Accounting ו־Progress

7.1.1 Draft Work עם Estimate ו־Evidence-looking attachment אינו נכנס ל־Admission או למכנה.

7.1.2 Alias של Work קיים בתוך Scope שני אינו מגדיל Hours, denominator או Credit.

7.1.3 Empty denominator אינו מחזיר `0%` או `100%`.

7.1.4 Local completion ללא Review או עם Evidence שפג מקבל `Credit=0`.

7.1.5 ניסיון לחשב Overall average מעל חמשת המכנים ו־GateReadiness נכשל Schema.

## 7.2 Actual, ETC ו־Generations

7.2.1 Duplicate Actual event מכשיל Ledger ואינו “מתוקן” בספירה פעם אחת.

7.2.2 ETC revision עתידית או של Task version אחר אינה נצרכת.

7.2.3 Missing ETC של Leaf אחד הופך את Remaining המלא ל־`unknown/unavailable`.

7.2.4 Rejected Generation מאבד Credit אך שומר Actual; Successor אינו יורש Credit ללא Rework mapping.

## 7.3 Schedule feasibility

7.3.1 Calendar שפג, חסר Horizon או בעל Capacity שלילית מבטל כל Schedule תלוי.

7.3.2 שני Work intervals שחורגים מקיבולת Person או Mutex הופכים את Schedule ל־infeasible.

7.3.3 Critical Wait ללא upper bound מבטל High ETA; הוא אינו מומר לשעות.

7.3.4 Low/High עם Inputs שונים אינם זוג Bounds תקף.

7.3.5 Solver ללא version/tie-break או Optimum claim ללא proof אינו Publishable.

## 7.4 Freshness ו־Publication

7.4.1 שינוי Scope, Estimate, Assignment, Calendar, Mutex, Wait, ActualCut או Solver policy פוסל את ה־Snapshot הישן.

7.4.2 Historical ROM, Partial number ו־Manual override אינם Current substitutes.

7.4.3 Payload ללא Root/asOf/validThrough/assumptions/exclusions/reasons נדחה.

# 8. תנאי סגירת Review B

## 8.1 תנאים בינריים

8.1.1 כל 24 Findings נשארים פתוחים עד ש־Successor Requirement Manifest קפוא ממפה אותם אחד־לאחד ל־Definition requirements ול־Conformance vectors.

8.1.2 Successor חייב להשיג `MATH direct identity coverage=32/32`, ‏`MSAF direct identity coverage=26/26`, ‏`MATH semantic FULL=32/32`, ללא Range כתחליף ל־Enumeration.

8.1.3 שני Parsers, שני Graph engines ושני Schedulers עצמאיים חייבים להסכים על Valid vectors ועל כל Failure terminal.

8.1.4 כל P0/P1/P2 מקבל Finding identity, Evidence, Review ו־disposition עצמאי; אין Merge לפי תיקון משותף.

8.1.5 קבלת Review B או Successor Requirement Manifest אינה קבלת TRD-2, אינה Materialization permit ואינה מאפשרת Product/Git/Push/Deploy.

# 9. מצב בטוח נוכחי

## 9.1 Disposition

9.1.1 `reviewResult=REJECT` עבור Root שב־1.1.4.

9.1.2 `findingCount=24`; ‏`P0=12`; ‏`P1=10`; ‏`P2=2`; ‏`P3=0`.

9.1.3 `requirementManifestAcceptanceCredit=0/64` נשאר כפי שנרשם בנושא; Review זה אינו משנה אותו.

9.1.4 Product completion, Remaining person-hours, Critical path ו־Calendar ETA=`unknown/unavailable`.

9.1.5 `Gate29=BLOCKED`; `Development freeze=ACTIVE`.
