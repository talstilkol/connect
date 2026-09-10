# 1. Connect — חוזה מתמטי ל־Progress, Estimate ו־ETA

## 1.1 זהות, מקורות וגבולות

1.1.1 `artifactId=CONNECT-PROGRESS-ESTIMATE-ETA-MATHEMATICAL-CONTRACT-2026-08-29-V1`.

1.1.2 מקור ראשון: `/Users/tal/Documents/connect/web/docs/planning/master-plan-schedule-and-estimate-audit-2026-08-29.md`, ‏SHA-256=`35869ec7bbd04eaf5db3f7e6637276bb7d35c7d942f20fc6ab1457c24da95fee`.

1.1.3 מקור שני: `/Users/tal/Documents/connect/web/docs/planning/master-plan-schedule-audit-findings-manifest-2026-08-29.md`, ‏SHA-256=`efba1c56115b8a1ddcb8a042baf4a410321b09bd850fcda5d0b85df2757cf4d7`.

1.1.4 מקור שלישי: `/Users/tal/Documents/connect/web/docs/planning/bootstrap-lifecycle-successor-requirements-2026-08-29.md`, ‏SHA-256=`f35ae1f0c8cf22ec379e0bf8b4f264a30c254df68181d25e3d4fe33ef46f20aa`.

1.1.5 החוזה אינו מציב Hours, Capacity, Calendar date, ETA, Percentage או Confidence שלא נמדדו ואושרו. ערך שאינו ניתן לחישוב לפי החוזה הוא `unknown/unavailable`.

1.1.6 החוזה אינו מאשר Product work, Git mutation, Push, Merge, Deployment, Provider action, Credential use או שינוי Visibility.

## 1.2 סימנים קנוניים

1.2.1 `r` הוא Accepted registry root; ‏`g` הוא Generation ID; ‏`s` הוא ScopeManifest root; ‏`e` הוא Service epoch; ‏`c` הוא Actual cut; ‏`t` הוא זמן Evaluation.

1.2.2 `W` הוא Universe של Work instances בלבד: Bootstrap Act, Candidate Lifecycle Act, Planning-generation Task, Program Task או Service-lifecycle Task.

1.2.3 `H(x)` הוא Hash דטרמיניסטי מאושר של Serialization קנוני. החוזה אינו בוחר אלגוריתם חדש; הוא דורש Algorithm/version מפורשים מן Root המאושר.

1.2.4 `⊎` אינו משמש לחיבור Work. כל איחוד Work הוא Set union ‏`∪` לפי Work ID; Alias, Parent, Template, Wait, Gate, Resource ו־Receipt אינם Work.

1.2.5 כל ערך דקות הוא Integer לא־שלילי. Duration של Work הוא Person-effort; Duration של Wait הוא Calendar elapsed time. אסור להמיר ביניהם בחיבור או חלוקה.

1.2.6 כל Work instance שייך ל־Domain אחד בלבד. Validation שקדם לקיום Subject קפוא יכול להיות Bootstrap; מרגע שקיים Subject קפוא, QA/Review/Acceptance שלו הם Lifecycle. אותו Work ID אינו רשאי להופיע בשני המכנים.

## 1.3 חוזה רשומת נוסחה

1.3.1 כל רשומת `MATH-001`–`MATH-032` כוללת בדיוק: `contractId`, ‏`purpose`, ‏`formula`, ‏`inputs`, ‏`preconditions`, ‏`failureTerminal`, ‏`tests`, ‏`sourceFindingIds`, ‏`sourceRequirementIds`.

1.3.2 Tests הם Invariant/Mutation tests על Snapshot אמיתי וקפוא. הם אינם משתמשים בנתוני לקוחות מומצאים ואינם מעניקים Readiness מעצם הרצתם.

1.3.3 `failureTerminal` גובר על נוסחה. אם תנאי כשל חל, אסור להחזיר ערך מספרי חלופי.

# 2. Identity, Admission ו־Unique Work

## 2.1 `MATH-001` — Universe של Work

2.1.1 `contractId`: `MATH-001`.

2.1.2 `purpose`: להגדיר מה רשאי לשאת Effort, Actuals ו־Credit.

2.1.3 `formula`: `W(r) = {w | w.root=r ∧ w.domain∈{BOOTSTRAP,LIFECYCLE,PLANNING_GENERATION,PROGRAM,SERVICE_LIFECYCLE} ∧ w.isLeaf=true}`.

2.1.4 `inputs`: Registry root `r`, Work records, Domain schema, Leaf predicate.

2.1.5 `preconditions`: Root מאושר; Domain enum מאושר; Work ID ייחודי; כל עלה בעל פעולה יחידה.

2.1.6 `failureTerminal`: Root חסר/לא מאושר, Domain לא מוכר, ID כפול או Parent עם Hours ⇒ `BLOCKED-NO-WORK-UNIVERSE`.

2.1.7 `tests`: Parser A/B מפיקים אותו Set; הוספת Parent/Template/Wait ל־Query חייבת להיכשל; Work ID כפול חייב להכשיל את Root.

2.1.8 `sourceFindingIds`: `SCHED-F001`, `SCHED-F007`, `SCHED-F013`, `SCHED-F026`.

2.1.9 `sourceRequirementIds`: `BCA2-REQ-004`, `BCA2-REQ-013`, `BCA2-REQ-017`.

## 2.2 `MATH-002` — Admission set

2.2.1 `contractId`: `MATH-002`.

2.2.2 `purpose`: למנוע מ־Draft, Rejected או Superseded records להיכנס למכנה.

2.2.3 `formula`: `A(r,t) = {w∈W(r) | admissionState(w,t)=accepted ∧ (supersededAt(w)=∅ ∨ supersededAt(w)>t) ∧ recordDigest(w)=digestInRoot(r,w)}`.

2.2.4 `inputs`: `W(r)`, Admission ledger, Supersession ledger, Root membership/digests, Evaluation time `t`.

2.2.5 `preconditions`: State enum ו־transition table מאושרים; Clock/timezone policy מאושרים.

2.2.6 `failureTerminal`: State חסר/לא חוקי, Digest mismatch או Root ללא AcceptanceEnvelope ⇒ `BLOCKED-NO-ADMITTED-SET`.

2.2.7 `tests`: Rejected/Superseded record אינו Member; שינוי record bytes ללא Root חדש מוציא אותו; שני Parsers מחזירים אותה Cardinality.

2.2.8 `sourceFindingIds`: `SCHED-F018`, `SCHED-F019`, `SCHED-F025`.

2.2.9 `sourceRequirementIds`: `BCA2-REQ-003`, `BCA2-REQ-018`, `BCA2-REQ-046`.

## 2.3 `MATH-003` — Exclusion של Non-work records

2.3.1 `contractId`: `MATH-003`.

2.3.2 `purpose`: למנוע Hours/Credit מ־Alias, Parent, Template, Wait, Gate, Artifact ו־Receipt.

2.3.3 `formula`: `EligibleForEffort(x) = 1 ⇔ x∈A(r,t)`; לכל `x∉W`, ‏`effort(x)=0 ∧ credit(x)=0`.

2.3.4 `inputs`: Identity-domain registry, `A(r,t)`, Alias/Parent/Template flags.

2.3.5 `preconditions`: כל ID פותר ל־Domain יחיד.

2.3.6 `failureTerminal`: ID רב־תחומי או Non-work עם Effort/Credit ⇒ `BLOCKED-ACCOUNTING-TYPE-VIOLATION`.

2.3.7 `tests`: Alias לא מגדיל Hours; PackageTemplate לא מגדיל Program denominator; Wait עם Calendar duration אינו מגדיל Person-hours.

2.3.8 `sourceFindingIds`: `SCHED-F007`, `SCHED-F010`, `SCHED-F013`, `SCHED-F016`.

2.3.9 `sourceRequirementIds`: `BCA2-REQ-004`, `BCA2-REQ-017`, `BCA2-REQ-024`.

## 2.4 `MATH-004` — Canonical unique union

2.4.1 `contractId`: `MATH-004`.

2.4.2 `purpose`: לחשב Work פעם אחת גם כאשר הוא חבר בכמה Views.

2.4.3 `formula`: `U(V1,…,Vk) = {w.id | w∈V1 ∪ … ∪ Vk}`; ‏`Total_f(U)=Σ[id∈U] f(work(id))`.

2.4.4 `inputs`: Views של Work IDs, CanonicalWorkKey registry, Alias registry, פונקציית ערך `f`.

2.4.5 `preconditions`: כל View מכיל IDs בלבד; CanonicalWorkKey ייחודי; Aliases פותרים ל־Work אחד.

2.4.6 `failureTerminal`: Collision, Ambiguous alias או Unresolved ID ⇒ `BLOCKED-NO-UNIQUE-UNION`.

2.4.7 `tests`: הופעת אותו Work ב־Stage, Scope, Finding ו־Control אינה משנה `|U|`; החלפת View order אינה משנה Total; Collision מכשיל.

2.4.8 `sourceFindingIds`: `SCHED-F003`, `SCHED-F007`, `SCHED-F014`.

2.4.9 `sourceRequirementIds`: `BCA2-REQ-019`, `BCA2-REQ-020`, `BCA2-REQ-026`.

## 2.5 `MATH-005` — Credit predicate

2.5.1 `contractId`: `MATH-005`.

2.5.2 `purpose`: להעניק Completion credit רק לעבודה שהושלמה והוכחה ב־Root החל.

2.5.3 `formula`: `C(w,t)=1` אם ורק אם `w∈A(r,t) ∧ executionStatus=completed-proven ∧ acceptance(w)=PASS ∧ evidenceFresh(w,t)=true ∧ requiredReviewsValid(w,t)=true ∧ invalidated(w,t)=false`; אחרת `C(w,t)=0`.

2.5.4 `inputs`: Admission set, Execution ledger, Acceptance receipts, Evidence/Review freshness, Invalidation ledger.

2.5.5 `preconditions`: Root, Evidence policy, Review policy ו־State enums מאושרים.

2.5.6 `failureTerminal`: Missing/ambiguous evidence או state אינו יוצר Error מספרי; הוא מחזיר `C=0`. Root/denominator לא תקף ⇒ Metric כולו `unknown/unavailable`.

2.5.7 `tests`: Local-only completion מקבל 0; Expired evidence הופך 1 ל־0; Review חסר מקבל 0; Completed-proven תקף מקבל 1.

2.5.8 `sourceFindingIds`: `SCHED-F008`, `SCHED-F018`, `SCHED-F020`, `SCHED-F025`.

2.5.9 `sourceRequirementIds`: `BCA2-REQ-018`, `BCA2-REQ-020`, `BCA2-REQ-046`.

## 2.6 `MATH-006` — Rejected generation accounting

2.6.1 `contractId`: `MATH-006`.

2.6.2 `purpose`: לשמר Actual effort בלי להעביר Credit בין Generations.

2.6.3 `formula`: אם Generation `g` נדחה, אז `Credit_g(w,t)=0`, אך `Actual_g(w,c)=Σ validActualEvents_g`; ל־`g+1` נכנסים רק Work IDs חדשים או Rework IDs מפורשים.

2.6.4 `inputs`: Generation ledger, Actual events, Rejection receipt, Successor Delta manifest.

2.6.5 `preconditions`: Generation IDs ו־Parent relation תקפים; Actual ledger append-only.

2.6.6 `failureTerminal`: Carry-over Credit או מחיקת Actuals מדור שנדחה ⇒ `BLOCKED-GENERATION-ACCOUNTING-CORRUPTION`.

2.6.7 `tests`: דחיית Subject מאפסת Credit אך לא Actual; Successor ללא Rework mapping אינו יורש Hours; Byte change פותח Generation חדש.

2.6.8 `sourceFindingIds`: `SCHED-F002`, `SCHED-F018`, `SCHED-F019`, `SCHED-F021`.

2.6.9 `sourceRequirementIds`: `BCA2-REQ-003`, `BCA2-REQ-038`, `BCA2-REQ-043`.

# 3. Separate denominators ו־Progress

## 3.1 `MATH-007` — Bootstrap denominator

3.1.1 `contractId`: `MATH-007`.

3.1.2 `purpose`: למדוד Genesis governance work בנפרד.

3.1.3 `formula`: `D_B(r_B)= {w∈A(r_B,t) | domain(w)=BOOTSTRAP ∧ bootstrapEpoch(w)=B0}`.

3.1.4 `inputs`: Accepted B0 root, Admission set, Bootstrap epoch membership.

3.1.5 `preconditions`: B0 חיצוני ומאושר; Set קפוא וסופי.

3.1.6 `failureTerminal`: B0 לא מאושר, Set משתנה או Subject member בתוך B0 ⇒ `unknown/unavailable`.

3.1.7 `tests`: BCA Subject אינו Member; Review instance נספר ב־Lifecycle ולא Bootstrap אם הוגדר Lifecycle; כל ID מופיע פעם אחת.

3.1.8 `sourceFindingIds`: `SCHED-F002`, `SCHED-F007`, `SCHED-F008`.

3.1.9 `sourceRequirementIds`: `BCA2-REQ-002`, `BCA2-REQ-019`.

## 3.2 `MATH-008` — Lifecycle denominator

3.2.1 `contractId`: `MATH-008`.

3.2.2 `purpose`: למדוד Authoring/QA/Review/Acceptance לכל Generation בלי לספור בתוך Subject.

3.2.3 `formula`: `D_L(g)= {w∈A(r_L(g),t) | domain(w)=LIFECYCLE ∧ generation(w)=g}`.

3.2.4 `inputs`: Lifecycle root של `g`, Accepted Act instances, Generation membership.

3.2.5 `preconditions`: Subject root קפוא; Lifecycle root חיצוני; Reviewer instances נפרדים.

3.2.6 `failureTerminal`: Self-membership, Generation חסר או Review כלול ב־Subject estimate ⇒ `BLOCKED-INVALID-LIFECYCLE-DENOMINATOR`.

3.2.7 `tests`: Intersection בין `D_L(g)` ל־Subject members הוא ריק; Review A/B נספרים כשני Work IDs; Generation אחר אינו נכנס.

3.2.8 `sourceFindingIds`: `SCHED-F002`, `SCHED-F007`, `SCHED-F020`.

3.2.9 `sourceRequirementIds`: `BCA2-REQ-001`, `BCA2-REQ-009`, `BCA2-REQ-020`.

## 3.3 `MATH-009` — Planning-generation denominator

3.3.1 `contractId`: `MATH-009`.

3.3.2 `purpose`: למדוד Tasks שמייצרים את Program registry בלי להציגם כהשלמת מוצר.

3.3.3 `formula`: `D_P(g)= {w∈A(r_P(g),t) | domain(w)=PLANNING_GENERATION ∧ generationPlanRoot(w)=r_P(g)}`.

3.3.4 `inputs`: Accepted Generation Plan root, PG Task instances, Admission set.

3.3.5 `preconditions`: Set סופי; כל עלה עד תקרת הזמן המאושרת; Lifecycle אינו Member.

3.3.6 `failureTerminal`: Generation Plan לא מאושר או Scope partition לא שלם ⇒ `unknown/unavailable`.

3.3.7 `tests`: כל אחד מ־12 PG Templates מקבל Instances לפי Scope; Output נכנס ל־Generation הבא בלבד; Intersection עם Program denominator ריק.

3.3.8 `sourceFindingIds`: `SCHED-F001`, `SCHED-F002`, `SCHED-F013`, `SCHED-F014`.

3.3.9 `sourceRequirementIds`: `BCA2-REQ-010`, `BCA2-REQ-021`.

## 3.4 `MATH-010` — Program denominator

3.4.1 `contractId`: `MATH-010`.

3.4.2 `purpose`: לקבוע מכנה Product/Program מדויק לכל Scope מאושר.

3.4.3 `formula`: `D_R(s)= {w∈A(r_R,t) | domain(w)=PROGRAM ∧ w.id∈TaskIds(ScopeManifest(s))}`.

3.4.4 `inputs`: Accepted Program root, ScopeManifest `s`, exact Task IDs, PackageInstance memberships.

3.4.5 `preconditions`: Scope ניתן ל־Enumeration; PackageTemplate אינו Member; Conditional Instance בעל Trigger/Gate/Scope.

3.4.6 `failureTerminal`: Textual Scope, “selected packages” ללא IDs, תשע/21 לא מיושב או Dangling Task ⇒ `unknown/unavailable`.

3.4.7 `tests`: Scope 1/3/4 מפיקים Sets נפרדים; Template לא מגדיל מכנה; Instance מוסיף רק Task IDs שלו; Disabled evidence אינו Implementation credit.

3.4.8 `sourceFindingIds`: `SCHED-F001`, `SCHED-F010`, `SCHED-F015`.

3.4.9 `sourceRequirementIds`: `BCA2-REQ-016`, `BCA2-REQ-022`.

## 3.5 `MATH-011` — Service-lifecycle denominator

3.5.1 `contractId`: `MATH-011`.

3.5.2 `purpose`: למדוד Operations חוזרים בלי לזהם Completion של Build.

3.5.3 `formula`: `D_S(e)= {w∈A(r_S(e),t) | domain(w)=SERVICE_LIFECYCLE ∧ serviceEpoch(w)=e}`.

3.5.4 `inputs`: Service epoch root, Recurring task instances, Cadence/owner records.

3.5.5 `preconditions`: Epoch וחלון מדידה מפורשים; Obligations פעילות ניתנות ל־Enumeration.

3.5.6 `failureTerminal`: Epoch/Cadence חסר או ערבוב עם Build ⇒ `unknown/unavailable` ל־Service metric ו־`BLOCKED` לכל Capacity claim שתלוי בו.

3.5.7 `tests`: Recurring Task אינו ב־Program set; Capacity calendar מנכה Support load; Epoch change יוצר denominator חדש.

3.5.8 `sourceFindingIds`: `SCHED-F024`.

3.5.9 `sourceRequirementIds`: `BCA2-REQ-013`, `BCA2-REQ-023`.

## 3.6 `MATH-012` — Count-weighted progress

3.6.1 `contractId`: `MATH-012`.

3.6.2 `purpose`: לחשב Closure לפי מספר Work instances בתוך Domain אחד.

3.6.3 `formula`: `P_count(D,t)=Σ[w∈D] C(w,t) / |D|`.

3.6.4 `inputs`: Denominator `D` אחד מן `D_B,D_L,D_P,D_R,D_S`, Credit predicate בזמן `t`.

3.6.5 `preconditions`: `D` מאושר, קפוא ולא ריק; Credit ניתן לחישוב לכל Member.

3.6.6 `failureTerminal`: `|D|=0`, Denominator לא מאושר או Membership לא סופי ⇒ `unknown/unavailable`, לא `0%` ולא `100%`.

3.6.7 `tests`: כל Credit בטווח `{0,1}`; Result בטווח `[0,1]`; שינוי סדר אינו משנה; Credit ללא Evidence נשאר 0.

3.6.8 `sourceFindingIds`: `SCHED-F008`, `SCHED-F018`.

3.6.9 `sourceRequirementIds`: `BCA2-REQ-025`.

## 3.7 `MATH-013` — Effort-weighted progress

3.7.1 `contractId`: `MATH-013`.

3.7.2 `purpose`: לחשב Baseline-weighted closure בתוך Domain אחד בלי לנחש Fractional completion.

3.7.3 `formula`: `P_weight(D,t)=Σ[w∈D] q(w)·C(w,t) / Σ[w∈D] q(w)`, כאשר `q(w)` הוא Weight integer שקפא ב־Root; מדיניות מומלצת אך לא אוטומטית היא Baseline max effort.

3.7.4 `inputs`: Denominator `D`, accepted Weight policy, `q(w)>0`, Credit predicate.

3.7.5 `preconditions`: כל Weight קיים ומאושר באותה Policy version; סכום weights חיובי.

3.7.6 `failureTerminal`: Weight חסר/משתנה, Policies מעורבות או Sum=0 ⇒ `unknown/unavailable`.

3.7.7 `tests`: Result בטווח `[0,1]`; שינוי Estimate לאחר Baseline אינו משנה Weight בלי Rebaseline; Work חלקי עם Credit=0 אינו מקבל Fractional credit.

3.7.8 `sourceFindingIds`: `SCHED-F008`, `SCHED-F018`, `SCHED-F022`.

3.7.9 `sourceRequirementIds`: `BCA2-REQ-025`, `BCA2-REQ-026`.

## 3.8 `MATH-014` — Gate readiness וללא Blended overall

3.8.1 `contractId`: `MATH-014`.

3.8.2 `purpose`: להפריד מצב Gates מאחוזי Work ולאסור אחוז תוכנית כולל.

3.8.3 `formula`: `GateReadiness(m,t)=Σ[g∈RequiredGates(m)] I(g=PASS at t) / |RequiredGates(m)|`; וקטור הפרסום הוא `(P_B,P_L(g),P_P(g),P_R(s),P_S(e),GateReadiness)`. אין פונקציית Aggregate אחת מעל הווקטור.

3.8.4 `inputs`: Release/Planning manifest `m`, exact Gate instances, Domain metrics.

3.8.5 `preconditions`: Gate set מאושר ולא ריק; כל Gate Predicate versioned.

3.8.6 `failureTerminal`: Gate set חסר/ריק/טקסטואלי ⇒ `unknown/unavailable`; Gate29 `BLOCKED` אינו `0% Product` ואינו Percent בפני עצמו.

3.8.7 `tests`: שינוי Domain metric אינו משנה Gate state ללא Predicate; ניסיון לחשב Average של הווקטור נכשל Schema; Required Gate חסר מחזיר Unknown.

3.8.8 `sourceFindingIds`: `SCHED-F008`, `SCHED-F009`, `SCHED-F015`, `SCHED-F018`.

3.8.9 `sourceRequirementIds`: `BCA2-REQ-006`, `BCA2-REQ-025`, `BCA2-REQ-042`.

# 4. Actuals, ETC, Ranges ו־Uncertainty

## 4.1 `MATH-015` — Actual effort ledger

4.1.1 `contractId`: `MATH-015`.

4.1.2 `purpose`: לצבור Person-effort בפועל בלי לשנות Baseline definitions.

4.1.3 `formula`: `Actual(w,c)=Σ[a∈Events(w), a.timestamp≤c, valid(a)] a.effortMinutes`.

4.1.4 `inputs`: Append-only Actual events, Task version, Actor, timestamps, effortMinutes, Evidence digest, Actual cut `c`.

4.1.5 `preconditions`: Event IDs ייחודיים; Actor/Task קיימים; זמן מונוטוני לפי Clock policy.

4.1.6 `failureTerminal`: Duplicate event, Negative effort, Missing actor/task או Mutable historical event ⇒ `BLOCKED-ACTUAL-LEDGER-INVALID`.

4.1.7 `tests`: Replay מאותו Cut מחזיר אותו סכום; Event אחרי Cut אינו נכלל; Rejected generation Actual נשמר; Duplicate event אינו נספר פעמיים אלא מכשיל.

4.1.8 `sourceFindingIds`: `SCHED-F021`.

4.1.9 `sourceRequirementIds`: `BCA2-REQ-018`, `BCA2-REQ-026`, `BCA2-REQ-038`.

## 4.2 `MATH-016` — Estimate-to-complete

4.2.1 `contractId`: `MATH-016`.

4.2.2 `purpose`: להגדיר Remaining לפי הערכה נוכחית ולא לפי `baseline-actual` אוטומטי.

4.2.3 `formula`: `ETC(w,c)=[etcMinMinutes,etcMaxMinutes]` מן EstimateRevision המאוחר ביותר ש־`effectiveAt≤c`, קשור ל־Task version ול־ActualCut digest, ועבר Review.

4.2.4 `inputs`: Estimate revisions, Task version, Actual-cut digest, Review receipt, Effective time.

4.2.5 `preconditions`: `0≤etcMin≤etcMax`; Revision reason ובסיס מפורשים; אין Revision עתידית.

4.2.6 `failureTerminal`: Task לא־מושלם ללא ETC תקף ⇒ Remaining metric `unknown/unavailable`; Completed-proven עם Rework פתוח אינו מקבל ETC=0 אוטומטי.

4.2.7 `tests`: Revision עתידית מוחרגת; Task version mismatch נכשל; ETC=0 מותר רק כשהעבודה Accepted-terminal ואין Rework פתוח.

4.2.8 `sourceFindingIds`: `SCHED-F021`, `SCHED-F022`, `SCHED-F025`.

4.2.9 `sourceRequirementIds`: `BCA2-REQ-018`, `BCA2-REQ-026`.

## 4.3 `MATH-017` — Remaining engineering effort

4.3.1 `contractId`: `MATH-017`.

4.3.2 `purpose`: לחשב טווח Person-hours שנותר ל־Domain/Scope בלי ספירה כפולה.

4.3.3 `formula`: `Remaining(D,c)=[Σ[w∈U(D)] ETC_min(w,c), Σ[w∈U(D)] ETC_max(w,c)]`.

4.3.4 `inputs`: Accepted denominator `D`, Unique Work union, ETC לכל Member, Actual cut `c`.

4.3.5 `preconditions`: ETC תקף לכל Work שלא קיבל terminal Credit; Completed accepted Work מקבל ETC תקף של אפס.

4.3.6 `failureTerminal`: ETC חסר ל־Member אחד, Duplicate/ambiguous identity או Actual cut חסר ⇒ כל טווח Remaining של D הוא `unknown/unavailable`; אין Partial total מוצג כשלם.

4.3.7 `tests`: Alias אינו משנה Sum; ETC חסר באחד העלים מפיל Total; Recompute מאותו Root/Cut זהה; External Wait אינו נכלל.

4.3.8 `sourceFindingIds`: `SCHED-F007`, `SCHED-F014`, `SCHED-F021`.

4.3.9 `sourceRequirementIds`: `BCA2-REQ-024`, `BCA2-REQ-026`.

## 4.4 `MATH-018` — Gross estimate range

4.4.1 `contractId`: `MATH-018`.

4.4.2 `purpose`: לחשב Arithmetic planning envelope בלבד.

4.4.3 `formula`: `Gross(D)=[Σ[w∈U(D)] estMin(w), Σ[w∈U(D)] estMax(w)]`.

4.4.4 `inputs`: Unique Work set, Accepted estimate records, Basis IDs, Min/Max minutes.

4.4.5 `preconditions`: לכל Work `0<estMin≤estMax`; Parent/Alias/Template excluded; אותה Estimate policy.

4.4.6 `failureTerminal`: Estimate חסר/לא חוקי, Canceled ROM בקלט או Duplicate Work ⇒ `unknown/unavailable`.

4.4.7 `tests`: Sum נגזר מחדש מאותם IDs; Canceled totals אינם Inputs; שינוי סדר אינו משנה; סיכום ידני שאינו שווה ל־Query נכשל.

4.4.8 `sourceFindingIds`: `SCHED-F003`, `SCHED-F004`, `SCHED-F007`, `SCHED-F022`.

4.4.9 `sourceRequirementIds`: `BCA2-REQ-026`, `BCA2-REQ-053`.

## 4.5 `MATH-019` — משמעות טווח ואי־ודאות

4.5.1 `contractId`: `MATH-019`.

4.5.2 `purpose`: למנוע הצגת סכום Min/Max כהסתברות או Commitment.

4.5.3 `formula`: `Gross(D)` ו־`Remaining(D,c)` הם Arithmetic envelopes תחת Inputs/Assumptions; `P50`, ‏`P80` או Probability distribution מוגדרים רק אם `CalibrationEvidence` ו־Correlation model מאושרים, אחרת `unknown/unavailable`.

4.5.4 `inputs`: Estimate method, Basis, Assumptions, Exclusions, Confidence label, Historical calibration, Correlation model אם קיים.

4.5.5 `preconditions`: Label מתאר Method בפועל; Assumptions ו־Exclusions מפורשים.

4.5.6 `failureTerminal`: P50/P80 ללא Calibration, Reserve לא ממופה או Confidence ללא Method ⇒ `BLOCKED-UNSUPPORTED-UNCERTAINTY-CLAIM`.

4.5.7 `tests`: הסרת Calibration מבטלת Percentile; Correlation לא ידועה אינה מוחלפת בעצמאות; Reserve ללא Work/Risk IDs אינו נכנס לטווח.

4.5.8 `sourceFindingIds`: `SCHED-F007`, `SCHED-F022`.

4.5.9 `sourceRequirementIds`: `BCA2-REQ-026`, `BCA2-REQ-053`.

## 4.6 `MATH-020` — Baseline variance ו־Rework

4.6.1 `contractId`: `MATH-020`.

4.6.2 `purpose`: להציג חריגה בלי לשכתב את Baseline או למחוק עבודה שנעשתה.

4.6.3 `formula`: אם `ETC=[E_min,E_max]`, ‏`Baseline=[B_min,B_max]` ו־`A=Actual(w,c)`, אז `ForecastAtCompletion=[A+E_min,A+E_max]` ו־`VarianceRange=[A+E_min-B_max,A+E_max-B_min]`.

4.6.4 `inputs`: Actual, ETC, Baseline estimate, Rework reason, Task version.

4.6.5 `preconditions`: שלושת הרכיבים באותה יחידת Person-minutes ובאותו Work/Generation.

4.6.6 `failureTerminal`: ערבוב Generations, Units או Task versions ⇒ `unknown/unavailable`.

4.6.7 `tests`: Actual אינו יכול לרדת; Rework מוסיף Actual/ETC ולא משנה Historical baseline; Rebaseline דורש Root/version חדש ונשמר Previous baseline.

4.6.8 `sourceFindingIds`: `SCHED-F002`, `SCHED-F021`, `SCHED-F022`.

4.6.9 `sourceRequirementIds`: `BCA2-REQ-003`, `BCA2-REQ-026`, `BCA2-REQ-038`.

# 5. DAG, Resources, Mutexes, Waits ו־Schedule

## 5.1 `MATH-021` — Graph validity

5.1.1 `contractId`: `MATH-021`.

5.1.2 `purpose`: לקבוע אם Schedule בכלל ניתן לחישוב.

5.1.3 `formula`: `ValidGraph(G)=acyclic(G) ∧ noDangling(G) ∧ noSelfEdge(G) ∧ requiredReachable(G) ∧ generationOrderValid(G)`.

5.1.4 `inputs`: Typed Nodes/Edges, Required milestones, Scope, Generation constraints.

5.1.5 `preconditions`: Node/Edge IDs ייחודיים; Relations ו־lags תקפים.

5.1.6 `failureTerminal`: כל Predicate שקר ⇒ `BLOCKED-NO-SCHEDULE`; אין Critical path או ETA.

5.1.7 `tests`: Cycle mutation נכשל; Dangling predecessor נכשל; Future-generation authority נכשל; כל Required Gate/Artifact reachable.

5.1.8 `sourceFindingIds`: `SCHED-F005`, `SCHED-F026`.

5.1.9 `sourceRequirementIds`: `BCA2-REQ-027`, `BCA2-REQ-028`, `BCA2-REQ-032`.

## 5.2 `MATH-022` — Capacity calendar function

5.2.1 `contractId`: `MATH-022`.

5.2.2 `purpose`: להמיר Person-effort לזמן Calendar לפי זמינות אמיתית.

5.2.3 `formula`: לכל Person `p`, ‏`cap_p(τ)≥0` הוא Net focus minutes הזמינים בזמן `τ`; ‏`Capacity_p([a,b])=∫[a,b] cap_p(τ)dτ` לפי Calendar discretization מאושר.

5.2.4 `inputs`: Person ID, Timezone, Work intervals, Leave, Support load, validThrough.

5.2.5 `preconditions`: Person שמי ופעיל; Calendar מכסה את Horizon; Units/Timezone אחידים.

5.2.6 `failureTerminal`: Calendar חסר/פג, Role-only capacity או Negative capacity ⇒ `unknown/unavailable` לכל Schedule תלוי.

5.2.7 `tests`: Leave מוריד Capacity; Support load מנוכה פעם אחת; חלוף validThrough מסמן Snapshot stale; Sum capacity אינו כולל אדם לא ממונה.

5.2.8 `sourceFindingIds`: `SCHED-F006`, `SCHED-F025`.

5.2.9 `sourceRequirementIds`: `BCA2-REQ-033`, `BCA2-REQ-034`.

## 5.3 `MATH-023` — Assignment ו־Resource feasibility

5.3.1 `contractId`: `MATH-023`.

5.3.2 `purpose`: לאסור חלוקה ידנית של Hours במספר אנשים ולהוכיח כשירות וקיבולת.

5.3.3 `formula`: `FeasibleAssignment(w,p)=eligible(p,w) ∧ active(p) ∧ noConflict(p,w)`; ובנוסף לכל Person `p` ולכל Interval `I`, ‏`Σ[w scheduled in I] assignedDemand(w,p,I) ≤ Capacity_p(I)`.

5.3.4 `inputs`: Work demand, Person/Skill/Access registries, Assignment, Calendar, Conflict matrix.

5.3.5 `preconditions`: Primary שמי; Review Work נפרד; Parallel-splitting policy מפורשת אם Work מתחלק.

5.3.6 `failureTerminal`: Missing person, Skill mismatch, Conflict או Overallocation ⇒ `BLOCKED-RESOURCE-INFEASIBLE`; אין שימוש בתרחישי 30/60/90 מופשטים.

5.3.7 `tests`: Producer אינו Reviewer; Person לא־כשיר נדחה; שני Tasks חופפים מעל Capacity נדחים; הוספת “team member” לא ממונה אינה מקצרת Schedule.

5.3.8 `sourceFindingIds`: `SCHED-F006`, `SCHED-F020`.

5.3.9 `sourceRequirementIds`: `BCA2-REQ-033`, `BCA2-REQ-034`.

## 5.4 `MATH-024` — Mutex feasibility

5.4.1 `contractId`: `MATH-024`.

5.4.2 `purpose`: למנוע חפיפה מסוכנת על Resource או Boundary משותפים.

5.4.3 `formula`: לכל Mutex `m` ולכל זמן `τ`, ‏`Σ[w active at τ] demand(w,m) ≤ capacity(m)`.

5.4.4 `inputs`: Mutex registry, Capacity, Task demands, Scheduled intervals, Scope.

5.4.5 `preconditions`: כל Side-effect boundary ממופה ל־Mutex; Capacity integer חיובי.

5.4.6 `failureTerminal`: Mutex חסר למשאב חובה או Constraint violation ⇒ `BLOCKED-SCHEDULE-INFEASIBLE`.

5.4.7 `tests`: שני CAS writers חופפים נדחים; Migration writer capacity נשמרת; Repo-root/file lock משפיע על Schedule ולא רק על Warning.

5.4.8 `sourceFindingIds`: `SCHED-F006`, `SCHED-F017`, `SCHED-F023`.

5.4.9 `sourceRequirementIds`: `BCA2-REQ-035`.

## 5.5 `MATH-025` — External wait node

5.5.1 `contractId`: `MATH-025`.

5.5.2 `purpose`: להכניס המתנה חיצונית ל־Graph בלי להציג אותה כ־Engineering effort.

5.5.3 `formula`: ל־Wait `x`, ‏`effort(x)=0`; ‏`duration_low(x)=minCalendar(x)`; ‏`duration_high(x)=maxCalendar(x)` אם קיים; ‏`start(x)≥finish(trigger(x))`.

5.5.4 `inputs`: Wait instance, Trigger Work, Min/Max Calendar, overlap, receipt, expiry, safe state.

5.5.5 `preconditions`: 13/13 Wait fields; Trigger ו־Scope קיימים.

5.5.6 `failureTerminal`: Required Wait ללא Max ⇒ High schedule/ETA `unknown/unavailable`; Receipt חסר ⇒ Successor חסום; Wait לעולם אינו מומר ל־Hours.

5.5.7 `tests`: Wait אינו משנה Gross person-hours; Partial overlap נגזר מ־Edges; Expired receipt מחזיר Wait ל־Blocked; Unbounded critical wait מבטל High ETA בלבד.

5.5.8 `sourceFindingIds`: `SCHED-F016`, `SCHED-F017`.

5.5.9 `sourceRequirementIds`: `BCA2-REQ-024`, `BCA2-REQ-036`, `BCA2-REQ-037`.

## 5.6 `MATH-026` — Low resource-constrained schedule

5.6.1 `contractId`: `MATH-026`.

5.6.2 `purpose`: לחשב תרחיש Calendar נמוך תחת אותם Constraints, לא תאריך אופטימי ידני.

5.6.3 `formula`: `Schedule_low = DeterministicFeasibleSchedule(inputs_low,solverVersion,tieBreakPolicy)` בכפוף ל־ValidGraph, FS/SS/FF+lag, ‏Work effort=`ETC_min` או accepted baseline-min לפי Metric, ‏Wait duration=`minCalendar`, ‏Capacity calendars, Assignments ו־Mutex constraints. מותר לטעון Minimum makespan רק עם Optimality proof; אחרת הפלט הוא Feasible scenario ולא Optimum.

5.6.4 `inputs`: Graph, Scope, Metric mode, Low durations, Resources, Calendars, Mutexes, Waits, Schedule anchor.

5.6.5 `preconditions`: כל Node חובה בעל Low duration; Solver/version ו־Tie-break policy מפורשים; Anchor קיים לתאריך מוחלט.

5.6.6 `failureTerminal`: Constraint/Duration/Anchor חסר ⇒ Low finish date `unknown/unavailable`; אם רק Anchor חסר, Elapsed makespan רשאי להישאר מחושב אך לא תאריך.

5.6.7 `tests`: Re-run מאותם Digests מחזיר אותו Schedule; Wait/Mutex בפנים; Dependency violation אפס; שינוי Tie-break אינו משנה Makespan claim בלי Snapshot חדש.

5.6.8 `sourceFindingIds`: `SCHED-F005`, `SCHED-F006`, `SCHED-F017`, `SCHED-F022`.

5.6.9 `sourceRequirementIds`: `BCA2-REQ-027`, `BCA2-REQ-031`, `BCA2-REQ-034`, `BCA2-REQ-035`.

## 5.7 `MATH-027` — High resource-constrained schedule

5.7.1 `contractId`: `MATH-027`.

5.7.2 `purpose`: לחשב תרחיש Calendar עליון תחת Bounds מאושרים.

5.7.3 `formula`: `Schedule_high = DeterministicFeasibleSchedule(inputs_high,solverVersion,tieBreakPolicy)` תחת אותם Constraints של MATH-026, עם Work effort=`ETC_max` או accepted baseline-max ו־Wait duration=`maxCalendar`. מותר לטעון Minimum makespan רק עם Optimality proof.

5.7.4 `inputs`: אותם Inputs של Low schedule, High durations לכל Node חובה.

5.7.5 `preconditions`: Max bound סופי לכל Work/Wait קריטי; אותם Root/Scope/Capacity/Anchor digests של Low.

5.7.6 `failureTerminal`: Max חסר או Unbounded critical wait ⇒ High schedule ו־ETA upper `unknown/unavailable`; אסור להחליף ב־Reserve שרירותי.

5.7.7 `tests`: High finish אינו מוקדם מ־Low תחת אותם Constraints; חסר Max יחיד במסלול חובה מבטל High; Non-critical unbounded node מחייב Reachability/sensitivity proof לפני שאינו מבטל.

5.7.8 `sourceFindingIds`: `SCHED-F005`, `SCHED-F016`, `SCHED-F017`, `SCHED-F022`.

5.7.9 `sourceRequirementIds`: `BCA2-REQ-031`, `BCA2-REQ-036`, `BCA2-REQ-053`.

## 5.8 `MATH-028` — Critical, Near-critical ו־Slack

5.8.1 `contractId`: `MATH-028`.

5.8.2 `purpose`: להסביר מה באמת חוסם Finish אחרי Resource leveling.

5.8.3 `formula`: `slack(n)=latestStartPreservingMakespan(n)-scheduledStart(n)` תחת אותו Resource-constrained Snapshot; `critical ⇔ slack=0`; ‏`nearCritical ⇔ 0<slack≤threshold(snapshotPolicy)`.

5.8.4 `inputs`: Feasible schedule, Makespan, Resource/Mutex/Wait constraints, Accepted threshold policy.

5.8.5 `preconditions`: Schedule תקף; Threshold מפורש ולא רטרואקטיבי.

5.8.6 `failureTerminal`: אין Feasible schedule או Threshold חסר ⇒ Critical/Near-critical report `unknown/unavailable`.

5.8.7 `tests`: Delay של Critical node מעבר ל־Slack מאריך Makespan; Resource bottleneck מופיע גם בלי pure DAG longest path; Wait sensitivity מדורגת בנפרד.

5.8.8 `sourceFindingIds`: `SCHED-F005`, `SCHED-F023`.

5.8.9 `sourceRequirementIds`: `BCA2-REQ-031`.

# 6. Freshness, Invalidation ו־Publication

## 6.1 `MATH-029` — Schedule snapshot identity

6.1.1 `contractId`: `MATH-029`.

6.1.2 `purpose`: לקשור כל תוצאה לכל Inputs ששימשו בפועל.

6.1.3 `formula`: `scheduleInputRoot=H(registryRoot,scopeRoot,graphRoot,estimateRoot,assignmentRoot,calendarRoot,mutexRoot,waitRoot,actualCutRoot,solverPolicyRoot,anchor)`; ‏`scheduleSnapshotId=H(scheduleInputRoot,resultRoot,asOf,validThrough)`.

6.1.4 `inputs`: כל Roots המנויים, Solver policy, Anchor, Result, asOf, validThrough.

6.1.5 `preconditions`: Serialization/Hash versions מאושרים; אין Input סמוי.

6.1.6 `failureTerminal`: Root חסר, Input סמוי או Digest mismatch ⇒ Snapshot `INVALID-NOT-PUBLISHABLE`.

6.1.7 `tests`: שינוי Byte בכל Input משנה Input root; Re-run מאותם Inputs מחזיר Result root זהה; Result אינו מפנה ל־Current דרך Filename בלבד.

6.1.8 `sourceFindingIds`: `SCHED-F005`, `SCHED-F025`.

6.1.9 `sourceRequirementIds`: `BCA2-REQ-031`, `BCA2-REQ-039`, `BCA2-REQ-046`.

## 6.2 `MATH-030` — Freshness ו־Invalidation

6.2.1 `contractId`: `MATH-030`.

6.2.2 `purpose`: למנוע הצגת Progress/Estimate/ETA ישנים כ־Current.

6.2.3 `formula`: `Fresh(snapshot,t)= (asOf≤t≤validThrough) ∧ allInputRootsCurrent(t) ∧ noInvalidationTriggerAfter(asOf,t)`.

6.2.4 `inputs`: Snapshot, Current roots, Clock policy, Invalidation events, validThrough.

6.2.5 `preconditions`: Clock/timezone ו־Trigger registry מאושרים.

6.2.6 `failureTerminal`: `Fresh=false` ⇒ כל Metric מן Snapshot מסומן `stale-not-current`; אם אין Snapshot חלופי טרי, Current value=`unknown/unavailable`.

6.2.7 `tests`: Scope/Estimate/Capacity/Calendar/Wait/Actual/Policy change מפסיל; Expiry מפסיל; Historical snapshot נשמר אך אינו Current.

6.2.8 `sourceFindingIds`: `SCHED-F019`, `SCHED-F025`.

6.2.9 `sourceRequirementIds`: `BCA2-REQ-039`, `BCA2-REQ-046`.

## 6.3 `MATH-031` — Exhaustive unknown/unavailable predicate

6.3.1 `contractId`: `MATH-031`.

6.3.2 `purpose`: לקבוע מתי אסור לפרסם מספר.

6.3.3 `formula`: `Unknown(metric)=OR` של התנאים החלים: Root/Acceptance חסר; Denominator חסר/ריק/לא סופי; ID/Dedup/Scope/Conditional ambiguity; State/Credit policy חסרה; Evidence/Review stale; Estimate/ETC חסר; Actual cut חסר ל־Remaining; Graph invalid; Assignment/Calendar/Mutex חסר; Required wait bound חסר ל־High; Anchor חסר לתאריך; Snapshot stale; A07/A09 או Source coverage חסרים; Solver/Hash/Policy version חסר.

6.3.4 `inputs`: כל Validation results של MATH-001–MATH-030 וה־Metric המבוקש.

6.3.5 `preconditions`: Failure taxonomy versioned; כל Validator מחזיר Boolean+reason IDs.

6.3.6 `failureTerminal`: אם OR=true, Output בדיוק `unknown/unavailable` עם Reason IDs; אין Partial number, Zero fallback, Historical ROM או Manual override.

6.3.7 `tests`: כל תנאי מופעל לבדו על Clone דטרמיניסטי של Snapshot אמיתי ומבטל רק Metrics התלויים בו; הסרת Reason בלי תיקון Evidence נכשלת.

6.3.8 `sourceFindingIds`: `SCHED-F001`, `SCHED-F003`, `SCHED-F004`, `SCHED-F005`, `SCHED-F006`, `SCHED-F008`, `SCHED-F010`, `SCHED-F015`, `SCHED-F016`, `SCHED-F017`, `SCHED-F019`, `SCHED-F021`, `SCHED-F022`, `SCHED-F025`.

6.3.9 `sourceRequirementIds`: `BCA2-REQ-006`, `BCA2-REQ-031`, `BCA2-REQ-039`, `BCA2-REQ-046`, `BCA2-REQ-053`.

## 6.4 `MATH-032` — Publication contract

6.4.1 `contractId`: `MATH-032`.

6.4.2 `purpose`: להגדיר בדיוק מה מותר לפרסם ומתי.

6.4.3 `formula`: Publishable payload הוא `{metricName,domainOrScope,method,valueOrRange,unit,rootDigests,actualCut,asOf,validThrough,assumptions,exclusions,criticalWaits,failureReasons}` ורק אם MATH-031 מחזיר False ו־MATH-030 מחזיר Fresh.

6.4.4 `inputs`: Metric result, Provenance roots, Freshness, Unknown predicate, Assumptions/Exclusions.

6.4.5 `preconditions`: Metric name מבחין Count/Weight/Gate/Gross/Remaining/Low schedule/High schedule; Unit מפורשת.

6.4.6 `failureTerminal`: חסר שדה Payload, Blended overall percent, Final ETA ללא Bounds או מספר ללא Root/asOf ⇒ `REJECT-PUBLICATION`.

6.4.7 `tests`: UI/API אינם מקבלים Payload ללא Provenance; Count ו־Weight מוצגים בנפרד; High unknown אינו מוחלף ב־Low; Gate29 blocked אינו מתורגם לאחוז Product.

6.4.8 `sourceFindingIds`: `SCHED-F003`, `SCHED-F004`, `SCHED-F008`, `SCHED-F009`, `SCHED-F022`, `SCHED-F025`.

6.4.9 `sourceRequirementIds`: `BCA2-REQ-025`, `BCA2-REQ-031`, `BCA2-REQ-053`, `BCA2-REQ-054`.

# 7. Invariants מסכמים

## 7.1 הפרדה שאסור לשבור

7.1.1 חמשת המכנים `D_B`, ‏`D_L(g)`, ‏`D_P(g)`, ‏`D_R(s)`, ‏`D_S(e)` מוצגים בנפרד.

7.1.2 External waits מוצגים בנפרד כ־Calendar duration.

7.1.3 Gate readiness מוצג בנפרד כמצב/יחס Gates.

7.1.4 אין Average, Weighted average או “אחוז כולל” מעל המכנים וה־Gate state.

7.1.5 Review ו־Acceptance work שייכים ל־Lifecycle denominator בלבד ואינם Members ב־Subject שהם בודקים.

## 7.2 Claims האסורים כעת

7.2.1 אין כיום Root/Denominator/Resources/Wait bounds/Gate 1 שמקיימים את כל Preconditions; לכן Product percentage מדויק הוא `unknown/unavailable`.

7.2.2 Product Remaining hours הם `unknown/unavailable`.

7.2.3 Low/High Calendar schedule ו־Final ETA הם `unknown/unavailable`.

7.2.4 טווחי ROM היסטוריים אינם Current Estimate ואינם Substitute ל־MATH-017 או MATH-018.

7.2.5 Gate 29 נשאר `BLOCKED`; זהו Predicate בינארי ולא אחוז.

## 7.3 מכנה החוזה

7.3.1 מספר רשומות הנוסחה הוא `32` בדיוק.

7.3.2 כל רשומה חייבת לכלול תשעת השדות שב־1.3.1 פעם אחת.

7.3.3 שינוי Formula, Input, Failure terminal, Test או Source mapping יוצר גרסת Contract ו־Digest חדשים; אין תיקון In-place ל־Contract מאושר.
