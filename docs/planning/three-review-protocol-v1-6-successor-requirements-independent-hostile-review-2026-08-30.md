# Protocol v1.6 Successor Requirements — Independent Hostile Review

## 1. תוצאה מחייבת של הביקורת

### 1.1 Verdict

1.1.1 INDEPENDENT-HOSTILE-VERDICT=REJECT-AS-NONEXECUTABLE-CANDIDATE.

1.1.2 Acceptance=0.

1.1.3 Gate29=BLOCKED.

1.1.4 development freeze=ACTIVE.

1.1.5 repository=PUBLIC-PERMANENT.

1.1.6 independentReceipt=ABSENT-BLOCKING.

1.1.7 נמצאו 31 Findings פתוחים ונפרדים: P0=18, P1=12, P2=1, P3=0.

1.1.8 שום Finding של predecessor לא נסגר סמנטית: CLOSED=0, PARTIAL=16, OPEN=0 מתוך 16 Findings של v1.5. PARTIAL אינו Closure ואינו מעניק Acceptance credit.

### 1.2 הסיבה הקצרה

1.2.1 ה-Subject מציג כמות גדולה של registries, roots ו-vectors, אך חלק מה-identities אינם ניתנים לשחזור לפי הסכמה הכתובה, חלק מה-proof predicates אינם materialized, וחלק מה-vectors מזריקים מראש את תוצאת הכשל במקום להריץ את החוזה שאמור לזהות אותו.

1.2.2 מסלול הקבלה אינו דורש בפועל שלוש מעטפות Review חתומות, quorum, appointment חיצוני או reconciliation receipt; ה-runner מפעיל מסלול lifecycle שונה מה-transition registry.

1.2.3 ה-closure crosswalk מפנה ב-211 שורות חזרה לתאים בתוך אותו crosswalk ובכך מאפשר ל-candidate להעיד על עצמו. ה-dependency, commit, CAS, trusted-time, revocation ו-public-projection controls אינם סגורים עד רמת producer executable.

## 2. זהות קפואה ותחום הבדיקה

### 2.1 Subject

2.1.1 path=docs/planning/three-review-protocol-v1-6-successor-requirements-2026-08-30.md.

2.1.2 required-and-observed SHA-256=618b18c4ce61f066f7e400fe0ed9d0fec16c08a8a936f7559be1b9f0850b3a34.

2.1.3 wc -l=5619.

2.1.4 wc -c=4465608.

2.1.5 ה-Subject לא שונה במסגרת הביקורת.

### 2.2 Boundary

2.2.1 נבדק רק Protocol v1.6 הקפוא מול הראיות והחוזים שעליהם הוא טוען להסתמך.

2.2.2 לא שונו קוד מוצר, Git, GitHub, ספקים, Subject או artifact קיים.

2.2.3 מסקנות Producer QA ודוחות QA reader לא שימשו כסמכות. סקריפטי ה-reader עצמם נקראו כראיית implementation בלבד, וכל המונים, ה-hashes וה-cross-checks חושבו מחדש.

### 2.3 Inputs סמנטיים שנבדקו

2.3.1 docs/planning/three-review-protocol-v1-5-successor-requirements-2026-08-29.md.

2.3.2 docs/planning/three-review-protocol-v1-5-successor-requirements-independent-hostile-review-2026-08-29.md.

2.3.3 docs/planning/three-review-protocol-v1-5-successor-requirements-independent-hostile-review-findings-manifest-2026-08-29.md.

2.3.4 docs/planning/master-plan-three-review-reconciliation-protocol-2026-08-29.md.

2.3.5 docs/planning/three-review-intake-and-reconciliation-eligibility-assessment-2026-08-29.md.

2.3.6 docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v3-2026-08-29.md.

2.3.7 docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md.

2.3.8 docs/planning/three-review-protocol-v1-6-qa-reader-a-2026-08-29.mjs.

2.3.9 docs/planning/three-review-protocol-v1-6-qa-reader-b-2026-08-29.rb.

## 3. שיטת ביקורת עצמאית

### 3.1 בדיקות מכניות

3.1.1 חושבו מחדש SHA-256, bytes, lines, ID cardinality, uniqueness, contiguous ranges ו-field counts.

3.1.2 כל 21 carriers, כל 675 byte spans וכל 675 member digests נבדקו ישירות מול bytes של המקורות.

3.1.3 חושבו מחדש parserProfileRoot, memberSetRoot ו-namespaceRoot תחת הסכמה המוצהרת וגם תחת האלגוריתם שה-artifact מצליח לשחזר בפועל.

3.1.4 כל 323 crosswalk rows, כל 4016 conjuncts, כל 1828 NamedUse rows, כל 106 transitions וכל 471 vectors נותחו בלי לקבל verdict מדוח קיים.

### 3.2 בדיקות עוינות

3.2.1 נבדקו self-reference, circular authority, vacuous predicates, missing producers, fake executability, parser/schema mismatch ו-detached-envelope.

3.2.2 נבדקו replay, operation-key identity, CAS coverage, trusted time, finality, revocation, reviewer independence, lifecycle totality ו-terminal consistency.

3.2.3 נבדקו absolute paths, secret/PII signatures, Math.random, crypto.randomUUID ו-Public-repository leakage.

## 4. מונים ומבנה

### 4.1 Registry counts

| Counter | Observed |
|---|---:|
| Requirement IDs | 112 |
| Requirement outputs | 112 |
| Parser profiles | 3 |
| Source carriers | 21 |
| Source namespaces | 27 |
| Source members | 675 |
| Closure crosswalk rows | 323 |
| Closure conjuncts | 4016 |
| Residual-risk rows | 323 |
| NamedUse rows | 1828 |
| Terminal rows | 21 |
| Failure-condition rows | 16 |
| Control machines | 15 |
| Control transitions | 106 |
| Separation rules | 15 |
| Dependency families | 48 |
| Executable-vector rows | 471 |
| Commit members | 22 |

### 4.2 Structural results

4.2.1 Requirement IDs unique=112, first=MPRR-V16-REQ-001, last=MPRR-V16-REQ-112, gaps=0, duplicates=0.

4.2.2 statement=112, defectCauseImpact=112, requiredProofPredicate=112, dependencies=112, sourceBasis=112.

4.2.3 Requirement-output rows with independentProofRoot=ABSENT-BLOCKING: 112/112.

4.2.4 Requirement-output rows that do not materialize the declared sourceMemberDigest and canonicalFiveFieldDigestVector constructor inputs: 112/112.

4.2.5 Carrier roots, sizes and line counts reproduce after deleting the extra leading web/ component: 21/21. They resolve from the declared repository root without that repair: 0/21.

4.2.6 Source byte spans and member digests reproduce against the repaired carrier paths: 675/675.

4.2.7 Declared one-based-inclusive line ranges reproduce inclusive semantics: 0/675. They reproduce only when lineEnd is treated as exclusive: 675/675.

4.2.8 Parser profile roots reproduce under the written CPB1(domain,version,fields...) rule: 0/3. They reproduce only when version is silently appended to the domain token: 3/3.

4.2.9 Member-set roots reproduce from full emitted member records: 0/27. They reproduce only after silently removing namespaceRoot from each member: 27/27.

4.2.10 Namespace roots reproduce under the written separate-version framing: 0/27. They reproduce under the undocumented domain-suffix variant: 27/27.

4.2.11 Crosswalk conjuncts with numeric source-relative spans=640/4016; symbolic TABLE-CELL-CANONICAL-TRIMMED locators=3376/4016.

4.2.12 Crosswalk rows that contain candidate-owned self-reference=211/323; self-referential conjunct locators=3376.

4.2.13 Residual-risk owners UNKNOWN=323/323; status UNASSESSED=307/323; inherited source status without a new assessment=16/323.

4.2.14 Vector families: CROSSWALK-EXACT-SOURCE-MUTATION=323, TERMINAL-PRECEDENCE-PAIR=138, REVIEW-LIFECYCLE=10.

4.2.15 Crosswalk vectors whose fixture is empty and whose program explicitly executes SET_TRIGGER_SET(FC-SOURCE-GRAPH)=323/323.

4.2.16 Lifecycle vectors whose first event is invalid from the fixture state under the declared REVIEW transition table=10/10.

4.2.17 Lifecycle vectors mapping a negative final state to TERM-SUCCESS=5/10.

4.2.18 Guard IDs referenced by transitions=106; executable guard definitions=0.

4.2.19 Role-instance records=0; appointment records=0; eligibility-evaluator records=0; materialized three-review envelopes=0.

## 5. Findings summary

### 5.1 P0

| ID | Defect |
|---|---|
| MPRR-V16-IHR-F001 | כל 21 custody locators אינם repo-relative מה-repository root בפועל |
| MPRR-V16-IHR-F002 | memberSetRoot מוגדר על full records אך השדה namespaceRoot יוצר מעגל וה-hash משמיט אותו בשקט |
| MPRR-V16-IHR-F003 | 112 outputs הם declarations ללא constructor inputs וללא materialized proof |
| MPRR-V16-IHR-F004 | NamedUse מוכיח רק producer annotations ולכן implicit=0 הוא predicate חלול |
| MPRR-V16-IHR-F005 | 211 closure rows נשענות על self-reference לתוך ה-crosswalk של אותו candidate |
| MPRR-V16-IHR-F006 | 323 vectors מזריקים FC-SOURCE-GRAPH ואינם מגלים את הכשל |
| MPRR-V16-IHR-F007 | policyRoot הוא opaque identity ללא registry או custody locator |
| MPRR-V16-IHR-F008 | שני ה-runners אינם מוכיחים עצמאות או provenance נפרד |
| MPRR-V16-IHR-F009 | מסלול acceptance אינו צורך שלוש Reviews, seals או quorum |
| MPRR-V16-IHR-F010 | separation rules אינן מייצרות appointments או eligibility decision |
| MPRR-V16-IHR-F011 | חוזה מעטפת ה-Review המייסד אינו ב-source universe ואינו materialized |
| MPRR-V16-IHR-F012 | DependencyHeadUniverse אינו closed ואינו כולל registries שה-candidate עצמו קורא |
| MPRR-V16-IHR-F013 | operationKey משמיט inputs משני-זהות ומשאיר replay alias |
| MPRR-V16-IHR-F014 | אין binding מחייב candidateRoot=subjectRoot ולשורשי B0 המקבילים |
| MPRR-V16-IHR-F015 | ה-CAS אינו מגדר כל dependency member/head/revocation root |
| MPRR-V16-IHR-F016 | post-readback divergence אינו מבטל Permit שכבר הונפק |
| MPRR-V16-IHR-F017 | negative lifecycle finals מסומנים TERM-SUCCESS |
| MPRR-V16-IHR-F018 | validRiskDisposition הוא boolean לא קשור ל-risk evidence או HumanApproval |

### 5.2 P1

| ID | Defect |
|---|---|
| MPRR-V16-IHR-F019 | parser/namespace CPB1 version framing שונה מהסכמה הכתובה |
| MPRR-V16-IHR-F020 | כל 675 line spans מפרים את inclusive contract |
| MPRR-V16-IHR-F021 | 3376 conjuncts חסרים exact source-relative span |
| MPRR-V16-IHR-F022 | failure predicates הם prose ואינם observed-state evaluators |
| MPRR-V16-IHR-F023 | control machines חסרות guard registry, schemas ו-initial state |
| MPRR-V16-IHR-F024 | trust/key/signature contract אינו ניתן להרצה |
| MPRR-V16-IHR-F025 | clock contract חסר observations ו-SPLIT אינו reachable |
| MPRR-V16-IHR-F026 | finality contract חסר receipts ו-CONFLICT אינו reachable |
| MPRR-V16-IHR-F027 | REVIEW/APPEAL table סותר את ה-interpreter ואינו total |
| MPRR-V16-IHR-F028 | custody lifecycle חסר schemas, concurrency proof ו-reachable delete state |
| MPRR-V16-IHR-F029 | Public projection חסר executable information-flow/leakage proof |
| MPRR-V16-IHR-F030 | אין vector/model-check producer לרוב control families |

### 5.3 P2

| ID | Defect |
|---|---|
| MPRR-V16-IHR-F031 | media contract אינו materialized ואינו מכוסה ב-vectors |

### 5.4 Manifest

5.4.1 ה-evidence locator, impact, remediation ו-closure test הנפרדים לכל Finding נמצאים ב-docs/planning/three-review-protocol-v1-6-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md.

## 6. ביקורת semantic closure מול v1.5

### 6.1 כלל ההכרעה

6.1.1 שינוי טקסט או הוספת registry אינם Closure. Finding נסגר רק כאשר producer materialized, evidence independently reproducible, authority non-circular, negative tests detect the defect, ו-independent receipt קיים.

### 6.2 Disposition של כל predecessor Finding

| v1.5 Finding | v1.6 Requirement | Disposition | Blocking evidence |
|---|---|---|---|
| MPRR-V15-HR-F001 | MPRR-V16-REQ-002 | PARTIAL | F001,F002,F019,F020 |
| MPRR-V15-HR-F002 | MPRR-V16-REQ-003 | PARTIAL | F004 |
| MPRR-V15-HR-F003 | MPRR-V16-REQ-015 | PARTIAL | F006,F007,F008,F030 |
| MPRR-V15-HR-F004 | MPRR-V16-REQ-016 | PARTIAL | F005,F021 |
| MPRR-V15-HR-F005 | MPRR-V16-REQ-012 | PARTIAL | F029 |
| MPRR-V15-HR-F006 | MPRR-V16-REQ-013 | PARTIAL | F012,F015 |
| MPRR-V15-HR-F007 | MPRR-V16-REQ-014 | PARTIAL | F013,F014,F015,F016 |
| MPRR-V15-HR-F008 | MPRR-V16-REQ-008 | PARTIAL | F008,F009,F010,F011 |
| MPRR-V15-HR-F009 | MPRR-V16-REQ-005 | PARTIAL | F023,F024 |
| MPRR-V15-HR-F010 | MPRR-V16-REQ-006 | PARTIAL | F023,F025 |
| MPRR-V15-HR-F011 | MPRR-V16-REQ-007 | PARTIAL | F023,F026 |
| MPRR-V15-HR-F012 | MPRR-V16-REQ-004 | PARTIAL | F009,F017,F018,F027 |
| MPRR-V15-HR-F013 | MPRR-V16-REQ-010 | PARTIAL | F023,F028 |
| MPRR-V15-HR-F014 | MPRR-V16-REQ-009 | PARTIAL | F017,F027 |
| MPRR-V15-HR-F015 | MPRR-V16-REQ-001 | PARTIAL | F002,F019,F020 |
| MPRR-V15-HR-F016 | MPRR-V16-REQ-011 | PARTIAL | F031 |

6.2.1 predecessor closure count: CLOSED=0, PARTIAL=16, OPEN=0, TOTAL=16.

6.2.2 semantic closure numerator=0; denominator=16.

## 7. Cause-effect analysis

### 7.1 Source identity

7.1.1 extra web/ in locator → resolver starts at the repository root → target becomes a nonexistent nested path → reader cannot reproduce source custody without an undocumented path repair.

7.1.2 namespaceRoot embedded in each member → memberSetRoot hashes full members → namespaceRoot also depends on memberSetRoot → literal construction is circular. The observed implementation avoids the circle by excluding namespaceRoot, but the schema never authorizes that exclusion.

### 7.2 Closure

7.2.1 candidate crosswalk cell → sourceConjunct locator points to that same candidate crosswalk → targetRequirementPath points to a generic preservation sentence → no external source bytes are bound to the new target predicate → the candidate can attest to its own completeness.

7.2.2 empty vector fixture → producer mutates one byte → producer explicitly inserts FC-SOURCE-GRAPH → terminal selector returns the associated terminal → the asserted failure does not demonstrate that source verification detected anything.

### 7.3 Review lifecycle

7.3.1 fixture begins REVIEWING → first event CLOSE_REVIEW → declared transition table permits CLOSE_REVIEW only from RECONCILED → vector interpreter and normative machine are different protocols.

7.3.2 runner checks p0/p1/p2 booleans → it never consumes three review roots or reviewer appointments → ACCEPTED_FINAL can be reached without the three-review evidence named by the commit envelope.

7.3.3 p2=1 plus validRiskDisposition=true → ACCEPTED_FINAL → no risk ID, recommendation set, approval root, validity interval or revocation head is consumed → risk acceptance is producer assertion.

### 7.4 Commit and replay

7.4.1 operationKey binds only candidateRoot, B0AuthorityRoot, purpose and epoch → two materially different envelopes can share a key → RETRY_SAME_KEY may replay stale reviews, approval, dependencies or subject.

7.4.2 commit member list contains aggregate dependencyUniverseRoot only → member heads and revocation heads may change outside the CAS fence → accepted evidence can be stale at commit.

7.4.3 Permit is emitted at COMMITTED → later DIVERGENCE only changes the commit-machine state → no REVOKE transition or revocation write is defined → previously issued authority can remain live.

## 8. Security, privacy ו-Public repository

### 8.1 Lexical scans

8.1.1 raw absolute Unix paths in Subject=0.

8.1.2 absolute Unix paths in decoded Base64 crosswalk payloads=0.

8.1.3 Math.random occurrences=0.

8.1.4 crypto.randomUUID occurrences=0.

8.1.5 detected private-key headers, common secret-token prefixes, JWT-shaped values and email-shaped PII=0.

8.1.6 תוצאה זו היא lexical non-detection בלבד; היא אינה proof של non-interference או Public-safety.

### 8.2 Leakage verdict

8.2.1 לא נמצא secret/PII value קונקרטי ב-Subject.

8.2.2 עם זאת, PublicProjectionPolicyRoot אינו materialized, guards אינם מוגדרים, ואין valid/conflicting/vetoed/appealed/expired/revoked/duplicate/reordered/concurrent vector corpus. לכן Public-repo leakage prevention remains unproven.

## 9. Authority accounting

### 9.1 Current state

9.1.1 acceptedProtocolHead=ABSENT.

9.1.2 external B0 admission receipt=ABSENT.

9.1.3 three independent Review roots=ABSENT.

9.1.4 reconciliation root=ABSENT.

9.1.5 HumanApproval root=ABSENT.

9.1.6 conformance root=ABSENT.

9.1.7 authority-producing outputs=0.

9.1.8 development permitted=0.

### 9.2 Required safe next action

9.2.1 לייצר successor חדש בלבד; לא לתקן את ה-Subject הקפוא.

9.2.2 ה-successor חייב לסגור כל אחד מ-31 ה-Findings בנפרד, להפיק outputs materialized, להשתמש ב-source locators תקינים מה-repository root, להסיר authority עצמית, ולהריץ independent implementations מול אותו normative schema.

9.2.3 עד receipt חיצוני מלא: Acceptance=0, Gate29=BLOCKED, freeze=ACTIVE, repository=PUBLIC-PERMANENT.
