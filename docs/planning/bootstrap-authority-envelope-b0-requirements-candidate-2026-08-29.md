# 1. Connect — Bootstrap Authority Envelope B0 requirement candidate

## 1.1 זהות, מטרה ומצב

1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-REQUIREMENTS-2026-08-29-G0`.

1.1.2 `artifactClass=BOOTSTRAP-AUTHORITY-REQUIREMENT-CANDIDATE; NOT-B0-INSTANCE; NOT-ACCEPTED`.

1.1.3 המטרה היא להגדיר כיצד מנדט חיצוני של טל מסמיך מספר מצומצם של פעולות תכנון ראשוניות בלי שה־Subject יאשר את עצמו ובלי להרחיב סמכות לפיתוח או למערכות חיצוניות.

1.1.4 מסמך זה אינו B0, אינו Receipt של טל, אינו Review Protocol, אינו Acceptance ואינו Permit.

1.1.5 Product code, Build, runtime Test, Git/GitHub mutation, Commit, Push, Provider, Credential, Purchase ו־Deployment נשארים מחוץ לסמכות.

1.1.6 החלטת המאגר היא `PUBLIC`; שינוי Visibility ל־Private אינו מותר מכוח B0.

## 1.2 מקורות קפואים

1.2.1 directive ledger=`/Users/tal/Documents/connect/web/docs/planning/user-directive-and-source-precedence-ledger-2026-08-29.md`; SHA-256=`b012a479b18e162f5f759b49e033eb3856a4637cc0e91a8a36f1d06043813342`.

1.2.2 BCA2 requirements=`/Users/tal/Documents/connect/web/docs/planning/bootstrap-lifecycle-successor-requirements-2026-08-29.md`; SHA-256=`f35ae1f0c8cf22ec379e0bf8b4f264a30c254df68181d25e3d4fe33ef46f20aa`.

1.2.3 rejected BCA1=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-bootstrap-and-candidate-generation-architecture-2026-08-29.md`; SHA-256=`3341f8aefad38f52921287ccc6224b7ab8a5b1c17e730b420508812b72d7fac6`.

1.2.4 control sequence v2 candidate=`/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-v2-2026-08-29.md`; SHA-256=`403a9f77d85c67ebc4498c12a0c74912f8c015cfbccd665f3043a99c9d98310e`.

1.2.5 control-sequence finding sources=`MPSC-HR-F001`, ‏`MPSC-HR-F002`, ‏`MPSC-HR-F006`, ‏`MPSC-HR-F011`, ‏`MPSC-HR-F012`, ‏`MPSC-HR-F015`, ‏`MPSC-HR-F021`, ‏`MPSC-HR-F032`.

## 1.3 חוזה שורת דרישה

1.3.1 לכל `B0REQ-000`–`B0REQ-026` בדיוק השדות `statement`, ‏`threatCauseImpact`, ‏`requiredProof`, ‏`dependencies`, ‏`sourceBasis`.

1.3.2 דרישה אינה מתקבלת מכוח נוכחותה; כל Proof נבדק על B0 Definition/Instance roots קפואים וב־Evidence חיצוני.

1.3.3 כל Missing, Unknown, Conflict, Expiry או Root mismatch מחזיר `BLOCKED`, לא Success משוער.

# 2. Requirement manifest

## 2.1 `B0REQ-000` — Root requirement set

2.1.1 `statement`: B0 Definition יוכיח את כל דרישות `B0REQ-001`–`B0REQ-026` מול InputRootManifest קפוא ולא־ריק.

2.1.2 `threatCauseImpact`: קבלה מול רשימה חלקית מאפשרת להשמיט גבול סמכות קריטי וליצור Self-authorization.

2.1.3 `requiredProof`: forward/inverse coverage=100%; missing/duplicate/unknown requirement=0; שינוי Member/root מבטל כל B0 Definition/Instance descendant.

2.1.4 `dependencies`: none.

2.1.5 `sourceBasis`: `MPSC-HR-F001;MPSC-HR-F015;BCA2-REQ-001;BCA2-REQ-002`.

## 2.2 `B0REQ-001` — Authority owner חיצוני

2.2.1 `statement`: `authorityOwner` של B0 הוא טל בלבד, והוא מאשר Root מדויק; Producer או המסמך אינם Authority owner.

2.2.2 `threatCauseImpact`: Producer approval או inferred consent מאפשרים למסמך להעניק סמכות לעצמו.

2.2.3 `requiredProof`: TalExactRootApprovalReceipt קושר B0 subject/evidence roots, scope, epoch ו־expiry; blanket approval או changed root מקבלים zero authority.

2.2.4 `dependencies`: `B0REQ-000`.

2.2.5 `sourceBasis`: `directive-ledger §3.3;MPSC-HR-F001;MPSC-HR-F015;MPSC-HR-F021`.

## 2.3 `B0REQ-002` — Subject ו־Authority envelope נפרדים

2.3.1 `statement`: B0 Definition Subject, B0 Instance envelope, authoring/review Acts ו־current pointer הם Roots נפרדים ללא Membership או Authority cycle.

2.3.2 `threatCauseImpact`: Envelope בתוך ה־Subject או Subject שיוצר את Envelope יוצר Hash cycle או Self-acceptance.

2.3.3 `requiredProof`: שני graph readers מוכיחים self-membership=0, self-authority=0, cycle=0; pointer אינו Member של Root שאליו הוא מצביע.

2.3.4 `dependencies`: `B0REQ-000;B0REQ-001`.

2.3.5 `sourceBasis`: `BCA2-REQ-001;BCA2-REQ-005;MPSC-HR-F001;MPSC-HR-F006`.

## 2.4 `B0REQ-003` — Canonical mandate text

2.4.1 `statement`: מנדט B0 נשמר כ־CanonicalMandate Subject נפרד עם exact bytes, digest, language, scope, exclusions ו־supersession relation.

2.4.2 `threatCauseImpact`: סיכום חופשי של שיחת המשתמש יכול להרחיב או לצמצם סמכות בלי ראיה.

2.4.3 `requiredProof`: canonical bytes מוצגים לטל ומקבלים Receipt exact-root; raw transcript ID שאינו זמין נשמר `unknown/unavailable` ואינו מומצא.

2.4.4 `dependencies`: `B0REQ-001;B0REQ-002`.

2.4.5 `sourceBasis`: `directive-ledger §1.1.5–§1.1.6;§3.3;MPSC-HR-F001`.

## 2.5 `B0REQ-004` — Directive precedence and amendments

2.5.1 `statement`: B0 קושר את precedence policy ואת כל amendments החלים, כולל Development freeze ו־Public visibility, ללא silent override.

2.5.2 `threatCauseImpact`: הוראה כללית מאוחרת עלולה להיתפס כביטול Freeze ספציפי או כהיתר להפוך את המאגר ל־Private.

2.5.3 `requiredProof`: conflict traversal מראה שהמשך תכנון מותר, פיתוח/External mutation חסומים ו־visibility=PUBLIC; conflict/ambiguity נשאר BLOCKED.

2.5.4 `dependencies`: `B0REQ-003`.

2.5.5 `sourceBasis`: `directive-ledger §2;§3.2;§3.3;MPSC-HR-F010;MPSC-HR-F012`.

## 2.6 `B0REQ-005` — Subject-class whitelist

2.6.1 `statement`: B0 מסמיך רק `CONTROL-SEQUENCE-SUCCESSOR`, ‏`RECOVERY-BASELINE`, ‏`REVIEW-INPUT-FREEZE`, ‏`RAW-REVIEW-CUSTODY`, ‏`BOOTSTRAP-LIFECYCLE-SUCCESSOR` ו־`REVIEW-PROTOCOL-SUCCESSOR`.

2.6.2 `threatCauseImpact`: Wildcard או free-text scope יכול לזלוג ל־Master Acceptance, Product או Provider.

2.6.3 `requiredProof`: allowlist enum closed; unknown class rejected; no wildcard/prefix matching; every Act subject class is one exact member.

2.6.4 `dependencies`: `B0REQ-004`.

2.6.5 `sourceBasis`: `MPSC-v2 §1.4.3;§1.5.1;MPSC-HR-F001;MPSC-HR-F012`.

## 2.7 `B0REQ-006` — Explicit Act-type whitelist

2.7.1 `statement`: allowed Acts הם Author, Freeze, Read-only parse, Producer QA, Independent review, Compare, Reconcile, exact-root approval observation, CAS ו־Readback על Subject classes שב־B0REQ-005 בלבד.

2.7.2 `threatCauseImpact`: Subject whitelist לבדו אינו מונע Act מסוכן כמו Push או Provider mutation על Artifact תכנוני.

2.7.3 `requiredProof`: effect-based classifier ממפה כל Act ל־Enum אחד; executable Product/External-state Act count=0; unclassified/multi-classified=0.

2.7.4 `dependencies`: `B0REQ-005`.

2.7.5 `sourceBasis`: `directive-ledger §3.3.5–§3.3.6;MPSC-v2 §1.3;MPSC-HR-F012`.

## 2.8 `B0REQ-007` — One-use exact-subject BootstrapActPermit

2.8.1 `statement`: כל Act instance מקבל Permit חד־ניסיוני הקושר Act type, exact subject/input/evidence roots, Actor, environment, authority epoch ו־expiry.

2.8.2 `threatCauseImpact`: B0 רחב ורב־שימושי מאפשר Replay או פעולה על Root אחר.

2.8.3 `requiredProof`: wrong root/actor/environment/epoch, expiry, replay, duplicate attempt או broader scope נחסמים; consumption receipt אחד לכל Permit.

2.8.4 `dependencies`: `B0REQ-002;B0REQ-005;B0REQ-006`.

2.8.5 `sourceBasis`: `BCA2-REQ-002;MPSC-HR-F006;MPSC-HR-F011`.

## 2.9 `B0REQ-008` — Named actors and appointments

2.9.1 `statement`: Producer, QA, Reviewer, Reconciler, Approver ו־AcceptanceWriter פותרים ל־Appointment records בעלי Owner, scope, epoch, validity ו־revocation.

2.9.2 `threatCauseImpact`: כינוי Role או Agent זמני ללא Identity אינו מוכיח מי פעל ומי היה מוסמך.

2.9.3 `requiredProof`: missing/ambiguous/stale/revoked appointment=BLOCKED; every Act has exactly one eligible appointment.

2.9.4 `dependencies`: `B0REQ-001;B0REQ-007`.

2.9.5 `sourceBasis`: `MPSC-HR-F006;MPSC-HR-F021;BCA2 role requirements`.

## 2.10 `B0REQ-009` — Role-conflict matrix

2.10.1 `statement`: Conflict matrix אוסרת צירופי Producer/Reviewer/Reconciler/Approver/AcceptanceWriter שעלולים לאפשר Self-review או Self-approval.

2.10.2 `threatCauseImpact`: שמות Role נפרדים ללא Constraint מאפשרים לאותו Actor לשלוט בכל השרשרת.

2.10.3 `requiredProof`: כל prohibited intersection נבדק; conflict count=0 לכל Acceptance; חסר Backup/independent appointment חוסם.

2.10.4 `dependencies`: `B0REQ-008`.

2.10.5 `sourceBasis`: `MPSC-HR-F002;MPSC-HR-F006;BCA2 review/approval requirements`.

## 2.11 `B0REQ-010` — Deterministic identity constructors

2.11.1 `statement`: IDs של B0, Permit, Act, Appointment, Attempt ו־Receipt נגזרים מ־Canonical content ו־Domain separator; אין Randomness.

2.11.2 `threatCauseImpact`: ID לא־שחזור מונע parity, replay detection ו־collision proof.

2.11.3 `requiredProof`: שני constructors מפיקים אותם IDs; collision corpus=0; `Math.random` ו־`crypto.randomUUID` usage=0.

2.11.4 `dependencies`: `B0REQ-002;B0REQ-007`.

2.11.5 `sourceBasis`: `BCA2-REQ-004;strict project ID rule`.

## 2.12 `B0REQ-011` — One canonical serialization pipeline

2.12.1 `statement`: כל Subject ו־Envelope משתמשים ב־Serialization version אחד עם UTF-8, Unicode normalization, field order, collection order, null/absence framing ו־domain separator מוגדרים.

2.12.2 `threatCauseImpact`: שתי Serializations חוקיות לאותו Object מאפשרות root mismatch או collision סמנטי.

2.12.3 `requiredProof`: two serializers byte/root parity; confusable/null/order/missing-field vectors total; alternative pipeline count=0.

2.12.4 `dependencies`: `B0REQ-010`.

2.12.5 `sourceBasis`: `Protocol math findings;MPSC-HR-F005;BCA2 identity requirements`.

## 2.13 `B0REQ-012` — Exact input freeze

2.13.1 `statement`: כל B0 Instance קושר `SourceFreezeRoot`, ‏`PolicyRoot`, ‏`CanonicalMandateRoot`, ‏`AppointmentRoot`, ‏`BootstrapReviewProtocolRoot` ו־`AllowedScopeRoot` מפורשים.

2.13.2 `threatCauseImpact`: Namespace או מקור לא־מקובע מאפשרים לאותה Authority להתייחס ל־Bytes שונים.

2.13.3 `requiredProof`: every reference resolves via frozen index; missing/dangling/range/alias=0; any root delta invalidates Instance and Permits.

2.13.4 `dependencies`: `B0REQ-003;B0REQ-008;B0REQ-011`.

2.13.5 `sourceBasis`: `MPSC-HR-F001;MPSC-HR-F003;Protocol v1.2 hostile findings;Source-universe hostile findings`.

## 2.14 `B0REQ-013` — Bootstrap Review Protocol freeze

2.14.1 `statement`: BootstrapReviewProtocol קפוא ונקשר ל־B0 לפני Review; הוא אינו נוצר או משתנה מכוח ה־Subject שהוא בודק.

2.14.2 `threatCauseImpact`: Protocol עתידי או self-reviewed מייצר review-authority cycle.

2.14.3 `requiredProof`: authorization DAG cycle=0; every bootstrap review edge resolves to prior external Protocol root; protocol mutation invalidates reviews.

2.14.4 `dependencies`: `B0REQ-002;B0REQ-009;B0REQ-012`.

2.14.5 `sourceBasis`: `MPSC-HR-F002;Protocol v1.2 hostile self-review finding`.

## 2.15 `B0REQ-014` — Public repository safety invariant

2.15.1 `statement`: B0 מסמיך רק תכנון Public-safe; הוא אינו מסמיך פרסום Secret, PII, Customer data, private Evidence, License grant או Visibility change.

2.15.2 `threatCauseImpact`: מאגר Public מגדיל את שטח החשיפה של כל Artifact שנכתב או נדחף.

2.15.3 `requiredProof`: classification+egress disposition לכל Output; prohibited content count=0; visibility field exactly PUBLIC; Private mutation attempt fails.

2.15.4 `dependencies`: `B0REQ-004;B0REQ-006;B0REQ-012`.

2.15.5 `sourceBasis`: `directive-ledger §3.2;D18-A2;MPSC-HR-F010;MPSC-HR-F024`.

## 2.16 `B0REQ-015` — No Product or external mutation authority

2.16.1 `statement`: B0 never authorizes Product code, Build, Runtime test, Git mutation, Commit, Push, GitHub settings, Provider, Credential, Purchase או Deployment.

2.16.2 `threatCauseImpact`: Bootstrap label יכול לשמש לעקיפת Freeze ולהסתיר Implementation.

2.16.3 `requiredProof`: effect graph reachable מ־B0 מכיל 0 executable Product/External acts; simulated prohibited requests terminate BLOCKED.

2.16.4 `dependencies`: `B0REQ-005;B0REQ-006;B0REQ-014`.

2.16.5 `sourceBasis`: `directive-ledger §3.3;MPSC-HR-F012`.

## 2.17 `B0REQ-016` — Trusted time and bounded validity

2.17.1 `statement`: B0 Instance, Permits, Appointments, Reviews ו־Approval receipts כוללים trusted time, `notBefore`, ‏`validThrough` ו־freshness policy.

2.17.2 `threatCauseImpact`: Authority לא־מוגבלת בזמן נשארת תקפה אחרי שינוי מנדט, Role או Source.

2.17.3 `requiredProof`: boundary tests before/at/after expiry; no local untrusted clock alone; missing time source=BLOCKED; validity duration דורש Tal exact approval ואינו מומצא במסמך זה.

2.17.4 `dependencies`: `B0REQ-001;B0REQ-007;B0REQ-008`.

2.17.5 `sourceBasis`: `MPSC-HR-F006;MPSC-HR-F008;MPSC-HR-F032`.

## 2.18 `B0REQ-017` — Revocation and supersession

2.18.1 `statement`: Tal יכול לבטל או להחליף B0, Mandate, Appointment או Permit; revocation מפנה ל־Root ומנקה current grants.

2.18.2 `threatCauseImpact`: Amendment מאוחר ללא propagation משאיר Authority ישנה פעילה.

2.18.3 `requiredProof`: revocation mutation invalidates all dependent Acts/Reviews/Approvals/Permits; stale grant authority=0; historical bytes נשמרים.

2.18.4 `dependencies`: `B0REQ-004;B0REQ-016`.

2.18.5 `sourceBasis`: `MPSC-HR-F008;MPSC-HR-F032;directive precedence policy`.

## 2.19 `B0REQ-018` — Append-only Act and evidence ledger

2.19.1 `statement`: כל Request, Permit, Attempt, Result, Evidence, Failure, Approval observation ו־Readback הוא Record append-only בעל exact roots ו־lineage.

2.19.2 `threatCauseImpact`: overwrite של Result או Evidence מוחק היסטוריה ומאפשר ל־Failure להיראות Success.

2.19.3 `requiredProof`: mutation/overwrite attempts fail; parent lineage complete; two readers reconstruct same ordered event set.

2.19.4 `dependencies`: `B0REQ-007;B0REQ-011;B0REQ-012`.

2.19.5 `sourceBasis`: `MPSC-HR-F005;MPSC-HR-F006;Protocol lineage findings`.

## 2.20 `B0REQ-019` — Detached QA and independent review packet

2.20.1 `statement`: Producer QA ו־Review packet קושרים Subject, Inputs, Evidence, Instructions, Protocol, Tool lineage ו־Actor appointments מדויקים ונשמרים מחוץ ל־Subject.

2.20.2 `threatCauseImpact`: Review על Bytes או Instructions שונים אינו בר־השוואה ויכול להעניק false closure.

2.20.3 `requiredProof`: packet-root parity; Review B preseal לפני Review A disclosure; subject mutation creates successor and invalidates both reviews.

2.20.4 `dependencies`: `B0REQ-009;B0REQ-013;B0REQ-018`.

2.20.5 `sourceBasis`: `MPSC-HR-F002;MPSC-HR-F006;BCA2 review requirements`.

## 2.21 `B0REQ-020` — Lossless findings and reconciliation

2.21.1 `statement`: כל Reviewer-local Finding נשמר עם authorship/noMerge identity; Comparison ו־Resolution אינם משנים את הרשומה המקורית.

2.21.2 `threatCauseImpact`: Merge, downgrade או Resolver overwrite יכולים להעלים חסם סמכות.

2.21.3 `requiredProof`: local inverse coverage=100%; unexplained merge/downgrade/predicate loss=0; P0/P1 open blocks; Resolution links successors בלבד.

2.21.4 `dependencies`: `B0REQ-019`.

2.21.5 `sourceBasis`: `Protocol requirements/reviews;MPSC-HR-F006;MPSC-HR-F007`.

## 2.22 `B0REQ-021` — Full acceptance envelope

2.22.1 `statement`: Acceptance envelope קושר Subject, Inputs, Evidence, Producer QA, Reviews, Comparison, Reconciliation, Vetoes, Tal exact approval, Appointments, authority epoch, time ו־expected head.

2.22.2 `threatCauseImpact`: Envelope חלקי מאפשר לקבל Root שונה, ישן או בעל חסם פתוח.

2.22.3 `requiredProof`: missing/wrong/stale/revoked field=BLOCKED; two independent validators return identical eligibility boolean and reason set.

2.22.4 `dependencies`: `B0REQ-001;B0REQ-012;B0REQ-016;B0REQ-020`.

2.22.5 `sourceBasis`: `MPSC-HR-F006;MPSC-HR-F011;MPSC-HR-F021`.

## 2.23 `B0REQ-022` — Fenced one-use CAS

2.23.1 `statement`: current pointer write משתמש ב־one-use Attempt, expected previous pointer/version, authority epoch ו־atomic commit של Envelope digest.

2.23.2 `threatCauseImpact`: Replay, ABA, partial write או stale authority יכולים ליצור current Root שגוי.

2.23.3 `requiredProof`: replay/ABA/wrong head/epoch/partial commit tests fail; exactly one terminal per Attempt; no retry on same Attempt ID.

2.23.4 `dependencies`: `B0REQ-010;B0REQ-018;B0REQ-021`.

2.23.5 `sourceBasis`: `MPSC-HR-F011;Protocol CAS findings;BCA2 acceptance requirements`.

## 2.24 `B0REQ-023` — Two readbacks and response-loss reconciliation

2.24.1 `statement`: לאחר CAS נדרשות שתי קריאות בלתי תלויות של Tuple מלא ו־Terminal reconciliation שמבדיל Success, Conflict, Rejection ו־Unknown.

2.24.2 `threatCauseImpact`: Response loss או Readback יחיד יכולים להפוך אי־ודאות ל־Success משוער.

2.24.3 `requiredProof`: readbacks match attempt+each other; timeout/mismatch/loss produces no current grant; XOR terminal count=1.

2.24.4 `dependencies`: `B0REQ-022`.

2.24.5 `sourceBasis`: `MPSC-HR-F011;BCA2 protected readback requirements`.

## 2.25 `B0REQ-024` — External status observations

2.25.1 `statement`: Current/Expired/Revoked/Blocked הם PhaseObservation records חיצוניים עם query, observer, source, time, expiry ו־supersession.

2.25.2 `threatCauseImpact`: Status בתוך Subject או ללא זמן נשאר מוצג Current לאחר שינוי חיצוני.

2.25.3 `requiredProof`: subject bytes unchanged across status transitions; stale/missing observation returns UNKNOWN; current view reproducible from one cut.

2.25.4 `dependencies`: `B0REQ-016;B0REQ-017;B0REQ-018`.

2.25.5 `sourceBasis`: `MPSC-HR-F032;MPSC-v2 §2.7`.

## 2.26 `B0REQ-025` — Two-generation conformance

2.26.1 `statement`: B0 Definition ו־Instance lifecycle מוכחים על שתי Generations מבוקרות, כולל Source/mandate/role delta, invalidation ו־successor acceptance.

2.26.2 `threatCauseImpact`: Happy-path Generation יחיד אינו מוכיח revocation, expiry, invalidation או replay safety.

2.26.3 `requiredProof`: G1 accepts; controlled delta creates G2; G1 grants become stale; G2 repeats QA/review/approval/CAS/readbacks; cross-generation replay fails.

2.26.4 `dependencies`: `B0REQ-017;B0REQ-020;B0REQ-023;B0REQ-024`.

2.26.5 `sourceBasis`: `BCA2 two-generation requirements;MPSC-HR-F007;MPSC-HR-F008`.

## 2.27 `B0REQ-026` — Total negative corpus and safe terminal

2.27.1 `statement`: Conformance corpus מכסה missing, malformed, wrong-root, wrong-role, conflict, stale, expired, revoked, replay, timeout, response-loss, Public violation ו־prohibited Act לכל lifecycle edge.

2.27.2 `threatCauseImpact`: Transition או Error class שלא נבדקו יכולים להפוך לכשל פתוח או Success בלתי צפוי.

2.27.3 `requiredProof`: every state/event pair defined; undefined transition=0; every invalid vector ends BLOCKED/REJECTED/EXPIRED; accepted Permit count=0 for invalid vectors.

2.27.4 `dependencies`: `B0REQ-005;B0REQ-007;B0REQ-014;B0REQ-015;B0REQ-016;B0REQ-017;B0REQ-021;B0REQ-023;B0REQ-025`.

2.27.5 `sourceBasis`: `MPSC-HR-F014;MPSC-HR-F015;MPSC-v2 §9`.

# 3. Dependency and acceptance constraints

## 3.1 Mechanical invariants

3.1.1 Requirement IDs הם בדיוק `B0REQ-000`–`B0REQ-026`, ללא חור או כפילות.

3.1.2 לכל 27 Requirements בדיוק חמשת השדות שב־1.3.1.

3.1.3 כל Dependency פותר ל־Requirement קודם; dangling/self/duplicate/cycle=0.

3.1.4 Source basis שאינו קושר exact Artifact root נשאר locator evidence בלבד ואינו Closure.

## 3.2 Acceptance path

3.2.1 Candidate זה עובר Producer QA ושתי ביקורות עצמאיות על Root קפוא, Comparison, Reconciliation ו־Successor loop.

3.2.2 B0 Definition נבנה רק מן Requirement root accepted ומקבל Review/Acceptance חיצוניים.

3.2.3 CanonicalMandate root ו־B0 Definition/Instance roots מוצגים לטל לאישור exact-root; אין inferred receipt.

3.2.4 עד אז `B0=ABSENT`, ‏`ControlSequenceAcceptance=BLOCKED`, ‏`Gate29=BLOCKED`, ‏`developmentFreeze=ACTIVE`.
