# 1. Connect — Reviewer-local Findings manifest לביקורת Master Plan successor control sequence

## 1.1 זהות וגבולות

1.1.1 `artifactId=CONNECT-MASTER-PLAN-SUCCESSOR-CONTROL-SEQUENCE-HOSTILE-REVIEW-FINDINGS-2026-08-29-R1`.

1.1.2 `manifestClass=REVIEWER-LOCAL-LOSSLESS-FINDING-INDEX; NOT-RECONCILED; NOT-ACCEPTED`.

1.1.3 דוח המקור הוא `/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-hostile-review-2026-08-29.md`, ‏SHA-256=`da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768`.

1.1.4 נושא הביקורת הוא `/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-2026-08-29.md`, ‏SHA-256=`85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970`.

1.1.5 ה־Manifest מכיל בדיוק `32` רשומות: `15 P0`, ‏`14 P1`, ‏`3 P2`, ‏`0 P3`.

1.1.6 כל שדות Defect/Consequence/Fix/Predicate בטבלה הם אינדקס Reviewer-local; הסעיף המלא בדוח שב־1.1.3 נשאר הנוסח הסמכותי של אותו Finding.

1.1.7 אין Merge בין Findings. כל `noMergeKey` שווה ל־`reportLocalId`; כל הרשומות במצב `OPEN`.

## 1.2 חוזה רשומה

1.2.1 לכל רשומה בדיוק השדות: `reportLocalId`, ‏`severity`, ‏`reportSection`, ‏`subjectRoot`, ‏`location`, ‏`defect`, ‏`consequence`, ‏`requiredFix`, ‏`acceptancePredicate`, ‏`status`, ‏`noMergeKey`.

1.2.2 `reportSection` פותר לסעיף מלא בדוח הקפוא; `subjectRoot` חייב להיות זהה בכל הרשומות.

1.2.3 ה־Manifest אינו Acceptance, אינו Reconciliation ואינו מעניק Product/Git/Provider authority.

# 2. Findings P0

| reportLocalId | severity | reportSection | subjectRoot | location | defect | consequence | requiredFix | acceptancePredicate | status | noMergeKey |
|---|---:|---:|---|---|---|---|---|---|---|---|
| `MPSC-HR-F001` | `P0` | `§2.1` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.1.3;§2.3.1–§2.3.4;§3.1.6` | Baseline/BCA acceptance precede an external B0 authority contract. | Self-approval or bootstrap deadlock. | Add detached B0 bound to Tal mandate, source root, policy, actors and exact subject/evidence roots. | Zero self-authority edges; every act resolves to B0; exact external QA/review/approval; missing authority blocks. | `OPEN` | `MPSC-HR-F001` |
| `MPSC-HR-F002` | `P0` | `§2.2` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.3.4;§2.4.2–§2.4.4;§2.6.4` | PG02 requires reviews before PG03 defines their Protocol; PG05 can bypass PG03. | Undefined or circular review authority. | Define external bootstrap-only review protocol; require accepted PG03 for later subjects. | Authorization graph has zero cycle and zero undefined review edge. | `OPEN` | `MPSC-HR-F002` |
| `MPSC-HR-F003` | `P0` | `§2.3` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.5.2;§2.7.2;§2.8.2;§2.9.2;§2.10.1–§2.10.4;§3.1.6` | PG04 requires a frozen SourceSet that is created only through PG06→PG09. | No complete topological order. | Split early ReviewInputFreeze from later ProgramAdmittedSourceSet. | Two graph readers return same DAG; cycle/orphan=0; every source-set reference resolves to one typed root. | `OPEN` | `MPSC-HR-F003` |
| `MPSC-HR-F004` | `P0` | `§2.4` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.7.1–§2.7.4;§2.6.4;§2.10.3–§2.10.4` | PG06 claims total disposition before SURS/Admitted SourceSet exist; `where required` is not executable. | False completeness against a moving denominator. | Freeze explicit TRD2RequirementInputManifest and typed applicability decisions. | 100% forward/inverse coverage; unresolved applicability=0; any member/root change invalidates descendants. | `OPEN` | `MPSC-HR-F004` |
| `MPSC-HR-F005` | `P0` | `§2.5` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `all output fields; especially §2.3.3;§2.13.3;§2.21.3` | Outputs lack immutable artifact identity, digest, producer, inputs, expiry and supersession. | Wrong/stale bytes can satisfy phases. | Add atomic Output registry and exact root manifest for every phase instance. | Two readers reconstruct same rooted output set; missing/duplicate/stale/collision=0. | `OPEN` | `MPSC-HR-F005` |
| `MPSC-HR-F006` | `P0` | `§2.6` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `all exit/current fields;§2.3.4;§2.4.4;§2.6.4;§2.24.2–§2.24.4` | No common detached phase acceptance model or role separation. | Presence or producer assertion can masquerade as acceptance. | Define per-generation Candidate/Evidence/QA/reviews/reconciliation/veto/approval/CAS envelope and conflict matrix. | Every accepted phase has a valid exact envelope and current pointer; prohibited role intersections=0. | `OPEN` | `MPSC-HR-F006` |
| `MPSC-HR-F007` | `P0` | `§2.7` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§1.2.2;§2.19.1–§2.19.4;§2.22.3–§2.22.4` | Rework uses `as needed/relevant` without typed return edge, generation, bound or terminal. | Stale derivatives, reused reviews or infinite loop. | Add defect-class routing, successor generations, monotonic closure and safe blocked terminal. | Mutation corpus selects one return route; all affected descendants rerun; termination policy total. | `OPEN` | `MPSC-HR-F007` |
| `MPSC-HR-F008` | `P0` | `§2.8` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§1.2.2;§2.6.1;§2.9–§2.24` | Only subject byte edits invalidate; authority/source/policy/legal/capacity/Git/evidence changes do not propagate. | Stale schedules, reviews, approvals or Gate29 can remain current. | Add reverse invalidation graph, triggers, asOf/validThrough/revocation and pointer clearing. | Each mutation invalidates all and only dependent descendants; stale grants zero credit/authority. | `OPEN` | `MPSC-HR-F008` |
| `MPSC-HR-F009` | `P0` | `§2.9` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.17–§2.19;§2.21.1–§2.21.2` | PG18 produces no accepted Program root before PG20 requires one. | PG20 is unreachable or consumes unaccepted work. | Add detached ProgramCandidate acceptance or explicitly defer acceptance to Master and change PG20 prerequisite. | Complete Producer→QA→Review→Reconcile→Veto→Approval→CAS path exists before first accepted-root consumer. | `OPEN` | `MPSC-HR-F009` |
| `MPSC-HR-F010` | `P0` | `§2.10` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§1.2.3;§2.20.1–§2.20.5;§2.25.2;§3.1.6` | Public hardening is readiness only; actual mutation/permit/readback is outside the phase graph. | A Push can lack a proven live hardening gate. | Add PublicRepoHardeningGate, one-use exact-diff permit, mutation act, compensating decision and two live readbacks. | Every Push edge requires fresh gate; wrong root/head/diff, replay, expiry or mismatch blocks; visibility remains Public. | `OPEN` | `MPSC-HR-F010` |
| `MPSC-HR-F011` | `P0` | `§2.11` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.24.1–§2.24.4` | Gate29 CAS omits mandatory bound roots/epoch/time/attempt and has one readback. | Wrong/stale/ABA or response-loss state can look accepted. | Bind full envelope, expected head, one-use attempt, two readbacks and XOR terminal reconciliation. | Readback tuples equal attempt and each other; replay/timeout/conflict/loss/ABA never emits handoff. | `OPEN` | `MPSC-HR-F011` |
| `MPSC-HR-F012` | `P0` | `§2.12` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§1.1.5;§2.8.3;§2.17.3;§2.25.1–§2.25.4` | Planning-only phases contain implementations, executable tests and execution wording. | Freeze can be bypassed by hidden tooling/product work. | Keep pre-Gate29 work specification-only; move all code/build/runtime/external actions to post-instruction Program registry. | Reachable pre-Gate29 executable action count=0; every future action resolves to accepted Task and exact instruction. | `OPEN` | `MPSC-HR-F012` |
| `MPSC-HR-F013` | `P0` | `§2.13` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§1.1.4–§1.1.6;§2.13;§2.16;§3.1.5` | No atomic work/resource/wait denominator exists for completing PG00–PG24. | Planning ETA, cost, critical path and finiteness remain unknowable. | Create separate authorized Bootstrap/Lifecycle/Planning work registry with Actual/ETC/resources/waits/rework. | Every phase output has work producers; unique union and two schedules agree; unbounded wait yields unknown ETA. | `OPEN` | `MPSC-HR-F013` |
| `MPSC-HR-F014` | `P0` | `§2.14` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `all §2.1–§2.25; especially §2.9.4;§2.18.4;§2.23.4;§2.24.4` | Most phases define success only, not total safe failure transitions. | Unknown, timeout or conflict can become undefined or assumed success. | Add finite state enum, failure reason, retry/escalation, expiry and allowed transitions per phase. | Model checker covers every event/state pair; undefined transition=0; failures create no accepted output/permit. | `OPEN` | `MPSC-HR-F014` |
| `MPSC-HR-F015` | `P0` | `§2.15` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§1.1.2–§1.1.4;§2;§3` | The draft control sequence has no external lifecycle that can accept it without self-reference. | It cannot yet authorize its own ordering/current claims. | Create successor under external B0, independent reviews/reconciliation and detached exact-root acceptance. | External pointer binds subject/evidence/reviews/reconciliation/Tal approval; consumers reject draft/rejected/stale roots. | `OPEN` | `MPSC-HR-F015` |

# 3. Findings P1

| reportLocalId | severity | reportSection | subjectRoot | location | defect | consequence | requiredFix | acceptancePredicate | status | noMergeKey |
|---|---:|---:|---|---|---|---|---|---|---|---|
| `MPSC-HR-F016` | `P1` | `§3.1` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2 heading;§3.1.6` | Ordered list omits PG00/01/05/19 from explicit chain and has no typed joins/conditionals. | Readers derive different valid schedules. | Add typed edge/join registry for every phase. | Two parsers return same DAG/order class; every phase reachable; missing/extra edge=0. | `OPEN` | `MPSC-HR-F016` |
| `MPSC-HR-F017` | `P1` | `§3.2` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§1.2.1;§2.6–§2.8` | Core flow says TRD-2 before Source universe while phase order splits Source definition/inventory around TRD-2. | PG06 input order is ambiguous. | Use full typed names and generate Core flow from DAG. | Generated Core view has zero textual edge contradiction. | `OPEN` | `MPSC-HR-F017` |
| `MPSC-HR-F018` | `P1` | `§3.3` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.4.2/§2.4.5;§2.6.2/§2.6.5;§2.7.2/§2.7.5;§3.1.2` | PG03/05/06 are Active though entry prerequisites are unmet. | Preparatory artifacts can receive unauthorized phase credit. | Separate PREPARATORY-UNACCEPTED from ACTIVE and require EntryReceipt. | Every ACTIVE phase has all exact prerequisite receipts; prework gets zero phase credit. | `OPEN` | `MPSC-HR-F018` |
| `MPSC-HR-F019` | `P1` | `§3.4` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.10.2;§2.15.2;§2.17.2;§2.18.2;§2.19.2;§2.21.2;§2.22.2` | Complete, pass, frozen, accepted, clean and current are used as if interchangeable. | Frozen/rejected input can cross an acceptance edge. | Define typed states and exact edge eligibility; prohibit coercion. | Type checker rejects state substitution; coercion count=0. | `OPEN` | `MPSC-HR-F019` |
| `MPSC-HR-F020` | `P1` | `§3.5` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.21.2` | `PG10–PG19 accepted/current roots` is a range and disjunctive prose, not an input manifest. | Master assembly can omit or ingest transitional roots. | Replace with explicit MasterAssemblyInputManifest and required state per member. | No ranges; every exact required member resolves and is accepted/current/fresh by type. | `OPEN` | `MPSC-HR-F020` |
| `MPSC-HR-F021` | `P1` | `§3.6` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.23.1–§2.23.4;§2.24.2` | Mandatory approvers/scopes/eligibility/expiry/revocation/conflicts are not enumerated. | Missing or blanket approval can be treated as sufficient. | Add derived ApprovalRequirementManifest and named Appointment matrix. | Exact non-empty approval denominator has 100% fresh, unrevoked, root-matched receipts; any defect blocks. | `OPEN` | `MPSC-HR-F021` |
| `MPSC-HR-F022` | `P1` | `§3.7` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§1.1.4;§1.2.1;§2.15.1;§2.25;§3.1.7` | Gate30/GA scope, release, observation and service lifecycle are not mandatory in the handoff contract. | PG24 can be misread as whole-program completion. | Require canonical Gate30 and post-GA lifecycle in Program graph; declare PG24 handoff-only. | Gate30 and applicable instances have complete paths; no GA claim at Gate29/PG24. | `OPEN` | `MPSC-HR-F022` |
| `MPSC-HR-F023` | `P1` | `§3.8` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.20.1–§2.20.4` | PG19 shorthand omits per-control work/owner/evidence/negative test and several D18-A2 controls. | Partial checklist can look complete. | Import D18-A2 and BCA2-REQ-047–050 one-to-one with dispositions. | 100% control forward/inverse coverage; unsupported feature requires accepted compensating decision. | `OPEN` | `MPSC-HR-F023` |
| `MPSC-HR-F024` | `P1` | `§3.9` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.1.1;§2.20.2–§2.20.4` | Canonical `/web` repo, outer repo rejection, branch/head/remote identity are not bound. | Hardening evidence can target the wrong repository. | Add RepoAuthorityRegistry and wrong-root guard to every Git action. | Outer-root action fails; two reads match repo/branch/head/settings; fallback count=0. | `OPEN` | `MPSC-HR-F024` |
| `MPSC-HR-F025` | `P1` | `§3.10` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.1.2;§2.3.3;§2.4.3;§2.5.3;§2.8.3;§2.14.3;§2.16.3;§2.17.3;§2.22.3` | Multi-output phases lack atomic records, primary/support distinction, joins and unique producers. | Partial outputs or collisions can close a phase. | Split outputs into atomic records and mandatory joins. | Collision=0; exactly one producer per output; required join complete. | `OPEN` | `MPSC-HR-F025` |
| `MPSC-HR-F026` | `P1` | `§3.11` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.16.1–§2.16.4;§3.1.5` | PG15 omits deterministic solver/input/freshness/wait/publication semantics. | Same root can yield conflicting or falsely bounded ETA. | Bind MATH-001–032 to exact ScheduleSnapshot schema and algorithm policy. | Two schedulers agree; critical unbounded wait forces unknown; stale input blocks publication. | `OPEN` | `MPSC-HR-F026` |
| `MPSC-HR-F027` | `P1` | `§3.12` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§3.1.1;§3.1.4` | `0/25 accepted` uses an unaccepted draft denominator and no acceptance query. | Candidate count appears authoritative. | Label candidate count; compute accepted fraction only from accepted root/registry or return unknown. | Published metric includes denominatorRoot/query/asOf/name; no Product blending. | `OPEN` | `MPSC-HR-F027` |
| `MPSC-HR-F028` | `P1` | `§3.13` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.2.2;§2.4.2–§2.4.4;§2.6.4;§2.7.1;§2.9.1;§2.11.1/§2.11.4;§2.12.1;§2.16.4` | Counts are printed constants, not manifest-derived denominators. | New member/root can leave a stale completeness claim. | Derive every count from typed accepted manifest and query root. | Regeneration parity; source/member change invalidates count; unbound magic claims=0. | `OPEN` | `MPSC-HR-F028` |
| `MPSC-HR-F029` | `P1` | `§3.14` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.25.1–§2.25.4` | PG24 delegates exit and evidence feedback to an undefined future registry/instruction. | Sequence has no finite terminal and broad instruction can over-authorize. | Make PG24 bounded handoff; define exact receipt and separate execution/evidence lifecycle. | PG24 ends HANDED-OFF/BLOCKED with zero mutation; every future action binds task/permit/environment and returns evidence. | `OPEN` | `MPSC-HR-F029` |

# 4. Findings P2

| reportLocalId | severity | reportSection | subjectRoot | location | defect | consequence | requiredFix | acceptancePredicate | status | noMergeKey |
|---|---:|---:|---|---|---|---|---|---|---|---|
| `MPSC-HR-F030` | `P2` | `§4.1` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§1.1.4–§1.1.5;§2.13;§2.25` | Program planning, Planning-generation and execution planning are undefined/overlapping. | Authority, hours and credit domain vary by reader. | Add four-domain glossary and classify every action. | Terminology linter maps every action to exactly one domain; unclassified=0. | `OPEN` | `MPSC-HR-F030` |
| `MPSC-HR-F031` | `P2` | `§4.2` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.8.4;§2.24;§3.1.7` | Definition CAS, Gate29, Public gate and Gate30 lack separate gate identities/namespaces. | Passing one can be mistaken for authority of another. | Add typed Gate registry and prohibit implicit authority inheritance. | Four distinct gate entities; no state implication/free-text alias. | `OPEN` | `MPSC-HR-F031` |
| `MPSC-HR-F032` | `P2` | `§4.3` | `85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970` | `§2.1.4–§2.25.5;§3.1.1–§3.1.7` | Current/status fields lack observation timestamp, observer, source root, query, expiry and supersession. | Historical status can remain presented as current. | Move status to append-only external PhaseObservation records. | Current view derives from observation cut/root; stale detected; status change leaves Subject bytes unchanged. | `OPEN` | `MPSC-HR-F032` |

# 5. QA invariants

## 5.1 Cardinality ו־Identity

5.1.1 קבוצת המזהים היא בדיוק `MPSC-HR-F001`–`MPSC-HR-F032`, ללא חור או כפילות.

5.1.2 התפלגות Severity היא בדיוק `P0=15`, ‏`P1=14`, ‏`P2=3`, ‏`P3=0`.

5.1.3 לכל רשומה `noMergeKey=reportLocalId`, ‏`status=OPEN`, ‏`subjectRoot=85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970`.

5.1.4 כל `reportSection` פותר בדיוק ל־Finding אחד בדוח Root שב־1.1.3.

## 5.2 Disposition

5.2.1 `reviewResult=REJECT-AS-DETERMINISTIC-CONTROL-SEQUENCE`.

5.2.2 כל 32 Findings פתוחים ודורשים disposition אחד־לאחד ב־Successor; אין Closure מכוח כתיבת Manifest זה.

5.2.3 Product/Planning percentage, Remaining hours, Critical path ו־ETA=`unknown/unavailable`.

5.2.4 `Gate29=BLOCKED`; ‏`Gate30=BLOCKED/NOT-REACHED`; ‏`development freeze=ACTIVE`; ‏`repositoryVisibility=PUBLIC-AS-INTENDED`.
