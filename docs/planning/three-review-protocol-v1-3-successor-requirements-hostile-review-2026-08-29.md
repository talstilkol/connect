# 1. Connect — ביקורת Hostile בלתי־תלויה לדרישות Three-review Protocol v1.3

## 1.1 זהות, Subject וגבולות סמכות

1.1.1 `artifactId=CONNECT-THREE-REVIEW-PROTOCOL-V1-3-SUCCESSOR-REQUIREMENTS-HOSTILE-REVIEW-2026-08-29`.

1.1.2 `reviewClass=INDEPENDENT-PLANNING-ONLY-STRUCTURAL-SEMANTIC-AUTHORITY-IDENTITY-PUBLIC-SAFETY-HOSTILE-REVIEW`.

1.1.3 Subject=`/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-3-successor-requirements-2026-08-29.md`.

1.1.4 Subject raw SHA-256=`1acadac5e9e6cc814bb9699be48c47f71a974d44cecb8b3fe31395e323ab89a3`; physical identity=`995 lines`; `116,721 bytes`.

1.1.5 predecessor Subject root=`90d3a33aa11204afc6ea1fc92ba31acf615729617470b3137418a71a618c6461`.

1.1.6 predecessor hostile-review report root=`bb9878b5d0a107cb8a7c240459de7a87d6f6f34e743b1bdb3ed13dc1773cb1ea`; predecessor hostile-review Findings Manifest root=`0f8cc6ef746985a1dd9528770a5f6ce4ab7e407c0a6f8793866bf2b0b12af708`.

1.1.7 mathematical Findings Manifest root=`35a5ef1b1860c1c95df45a521e87d47ac8acc5fa21c13a8d71bd47ecd5968ff0`; Intake assessment root=`f970f0d62e4c62bf17f417967f2baebcbed78ef393e4622bfe3b85d5e10e4b08`.

1.1.8 הביקורת לא קראה ולא השתמשה ב־Producer QA של ה־Subject. היא בדקה את ה־Subject, את ה־roots שהוא עצמו מצהיר עליהם ובדיקות מכניות עצמאיות בלבד.

1.1.9 שינוי Byte אחד ב־Subject הופך דוח זה ל־`STALE-FOR-CURRENT`.

1.1.10 הדוח הוא Planning-only. הוא אינו Protocol Definition, אינו מריץ Review/Reconciliation, אינו מקבל Requirement, אינו מעניק Gate credit ואינו מאשר Product, Git, Build, Push, Deploy, Provider או שינוי חשבון.

## 1.2 שיטת הביקורת

1.2.1 נבדקו `MPRR-V13-REQ-001`–`MPRR-V13-REQ-057`, חמשת השדות בכל שורה, כל Dependency מפורש, כל `sourceBasis`, ארבעת ה־crosswalks וההצהרות הכמותיות.

1.2.2 נבדקו בנפרד Source namespace/member identity, ‏Bootstrap/non-self-review, ‏Freeze/Permit lifecycle, ‏Run Request/Result/finality, ‏Phase lineage, ‏Reviewer authorship, ‏canonical serialization, ‏semantic DAG, ‏Freshness/CAS, ‏Public/Private Evidence, ‏Publication surfaces, ‏risk, ‏human approval ושני דורות.

1.2.3 `P0` הוא מסלול שיכול לאפשר Authority, Identity, Provenance, Acceptance או Publication שגויים, או חשיפת מידע אסור. `P1` הוא Proof, determinism, governance או operability gap מהותי. `P2` הוא פער פורמט או Interoperability שאינו לבדו מעניק Acceptance.

1.2.4 Direct ID presence אינו semantic closure. מיפוי נחשב רק כהוכחת שימור זהות אם הוא root-qualified, חד־ערכי וניתן לפענוח מכונה; הוא נחשב semantic closure רק אם revised fields, negative vectors, safe terminal ו־independent verdict קיימים.

# 2. תוצאות מכניות

## 2.1 Requirement rows ושדות

2.1.1 Requirement headings=`57`; unique IDs=`57`; sequence=`MPRR-V13-REQ-001`–`MPRR-V13-REQ-057`; missing=`0`; duplicate=`0`.

2.1.2 לכל Requirement בדיוק מופע אחד של `statement`, ‏`defectCauseImpact`, ‏`requiredProofPredicate`, ‏`dependencies`, ‏`sourceBasis`: ‏`57/57` לכל שדה; total field instances=`285`.

2.1.3 Numbered clauses=`415`; duplicate numbered clause IDs=`0`.

## 2.2 Dependency graph מפורש

2.2.1 parsed explicit dependency edges=`247`.

2.2.2 unknown target=`0`; self-edge=`0`; duplicate edge=`0`; explicit forward edge=`0`; explicit cycle=`0`.

2.2.3 תוצאה זו היא PASS מכני בלבד. סעיף 4.5 מוכיח שה־named semantic uses אינם מיוצגים במלואם ב־247 הקשתות ולכן `semanticMissingEdge=0` אינו מתקיים.

## 2.3 Root-qualified source edges

2.3.1 `sourceBasis` rows=`57`; parsed source edges=`363`; malformed sourceBasis rows=`0`.

2.3.2 unique root-qualified members=`130`: ‏`V12REQ=35`, ‏`V12HR=22`, ‏`MATH=22`, ‏`INTAKE=12`, ‏`BCA2=5`, ‏`TRD2=28`, ‏`MSSA=4`, ‏`TRD2SHR=2`.

2.3.3 namespace root mismatch=`0`; member label absent from declared rooted artifact=`0`.

2.3.4 2.3.1–2.3.3 מוכיחים Presence תחת הקבצים שנבדקו. הם אינם מוכיחים member-byte identity, משום שה־Registry schema חסר locator/parser/member digest כמפורט ב־4.2.

## 2.4 Crosswalk cardinalities

2.4.1 predecessor mappings=`35`; unique=`35`; sequential=`35/35`; duplicate source rows=`0`.

2.4.2 v1.2 hostile-Finding mappings=`22`; unique=`22`; sequential=`22/22`; duplicate source rows=`0`.

2.4.3 mathematical mappings=`22`; unique=`22`; sequential=`22/22`; duplicate source rows=`0`.

2.4.4 Intake mappings=`12`; unique=`12`; sequential=`12/12`; duplicate source rows=`0`.

2.4.5 Direct identity coverage therefore passes as `35+22+22+12=91/91`. Semantic closure does not pass: `0/35` predecessor rows are in the detached machine closure denominator, ו־`0/22`, ‏`0/22`, ‏`0/12` have an independent accepted closure receipt in the Subject.

# 3. Preservation verdict

## 3.1 Matrix

| source family | declared root | direct identities | machine semantic closure in required detached manifest | verdict |
|---|---|---:|---:|---|
| `V12REQ` | `90d3a33aa11204afc6ea1fc92ba31acf615729617470b3137418a71a618c6461` | `35/35` | `0/35`; family excluded from MPRR-V13-REQ-057 denominator | `FAIL` |
| `V12HR` | `0f8cc6ef746985a1dd9528770a5f6ce4ab7e407c0a6f8793866bf2b0b12af708` | `22/22` | `0/22` independently accepted | `PENDING-BLOCKING` |
| `MATH` | `35a5ef1b1860c1c95df45a521e87d47ac8acc5fa21c13a8d71bd47ecd5968ff0` | `22/22` | `0/22` independently accepted | `PENDING-BLOCKING` |
| `INTAKE` | `f970f0d62e4c62bf17f417967f2baebcbed78ef393e4622bfe3b85d5e10e4b08` | `12/12` | `0/12` independently accepted | `PENDING-BLOCKING` |

## 3.2 משמעות

3.2.1 ה־Subject שומר היטב את כל 91 ה־source identities ברמת Presence ואינו ממזג אותם.

3.2.2 הוא אינו מוכיח one-to-one semantic preservation של 35 דרישות v1.2, משום שסעיף 11 הוא Navigation crosswalk בלבד ו־MPRR-V13-REQ-057 דורש machine rows רק ל־Findings ול־Intake defects.

3.2.3 אין להמיר `91/91 direct` ל־Closure, Acceptance או Completion percentage.

# 4. Findings P0

## 4.1 `MPRR-V13-HR-F001` — אין Root יחיד ומוגדר לזהות Namespace

4.1.1 `locator=§1.2.4;§1.3;§2.1 MPRR-V13-REQ-001`.

4.1.2 Registry entry קושר token ל־report root, Manifest root ו־reviewed-subject root, אבל source edge מוגדר כ־`(namespaceRoot,memberId)` בלי לקבוע איזה משלושת ה־roots הוא `namespaceRoot` ובלי Constructor ל־NamespaceEntryId.

4.1.3 Section 1.3 משתמש בפועל ב־Manifest root עבור משפחות מסוימות וב־Requirement artifact root לאחרות. שני Parsers יכולים לבחור carrier root שונה ועדיין לטעון שפתרו אותו token.

4.1.4 תיקון נדרש: להגדיר canonical NamespaceEntry payload ו־full root יחיד; להפריד `memberCarrierRoot`, ‏`reportRoot` ו־`reviewedSubjectRoot`; כל source edge משתמש רק ב־NamespaceEntryRoot או רק ב־carrier root לפי כלל אחד סגור.

4.1.5 תנאי קבלה: שני resolvers מפיקים אותם NamespaceEntry bytes; החלפת report/manifest/subject root או בחירת carrier חלופי מסתיימת `SOURCE-GRAPH-INVALID`; לכל token root authoritative יחיד.

## 4.2 `MPRR-V13-HR-F002` — Member ID אינו מזהה Byte record

4.2.1 `locator=§2.1 MPRR-V13-REQ-001;§1.3.9`.

4.2.2 ה־Registry מחייב Set של Member IDs אך אינו מחייב לכל member canonical locator, record schema/parser, byte extent, member canonical bytes ו־member digest.

4.2.3 אותו label יכול להופיע בכותרת, cross-reference וטבלה בתוך אותו rooted file. Presence של טקסט אינה מוכיחה איזה record הוא ה־member או שהוא byte-identical.

4.2.4 תיקון נדרש: כל Registry member יהיה record עם `memberId`, ‏`recordType`, ‏`canonicalLocator`, ‏`byteRange` או canonical extracted bytes, ‏`memberDigest`, parser/schema root ו־cardinality.

4.2.5 תנאי קבלה: כל אחד מ־130 החברים נפתר לרשומת bytes יחידה; duplicate occurrence, parser disagreement, locator drift או same-ID/different-bytes מסתיימים `SOURCE-GRAPH-INVALID`.

## 4.3 `MPRR-V13-HR-F003` — "Three-review" מאפשר zero-domain או cardinality משתנה

4.3.1 `locator=§4.6 MPRR-V13-REQ-019;§7.1 MPRR-V13-REQ-036;§7.2 MPRR-V13-REQ-037;§15.1`.

4.3.2 ה־Subject אומר שה־Definition יכריז את ה־domains המדויקים ויגזור count, אך אינו קובע invariant שה־formal ReviewDomain Set מכיל בדיוק שלושה domains נדרשים ואינו מגדיר אם QA הוא אחד מהם.

4.3.3 Registry ריק או Registry עם domain יחיד יכול להפיק presence vector ו־assertion count ריקים/קטנים שעוברים vacuously. זה מחליש את `canonical three-domain presence vector` של predecessor MPRR-022.

4.3.4 תיקון נדרש: לקבע exact non-empty domain Set ו־cardinality=`3`, לתת לכל domain stable ID ותפקיד, ולקבוע חד־משמעית ש־QA הוא control נפרד או domain מסוים בלי אפשרות configuration-time שינוי.

4.3.5 תנאי קבלה: 0, 1, 2, 4 domains, missing domain, QA double-count ו־role substitution מסתיימים `REVIEW-INELIGIBLE`; לכל Finding presence vector בדיוק שלוש positions.

## 4.4 `MPRR-V13-HR-F004` — Bootstrap admission משתמש ב־Procedure אך לא ב־Authority

4.4.1 `locator=§2.3 MPRR-V13-REQ-003;§2.4 MPRR-V13-REQ-004;§2.5 MPRR-V13-REQ-005;§10.3 MPRR-V13-REQ-055`.

4.4.2 `BOOTSTRAP-PROTOCOL-ADMISSION` נשלט "only" בידי `BootstrapReviewProcedure`. MPRR-V13-REQ-005 מגדיר בנפרד `BootstrapReviewAuthority`, אך MPRR-V13-REQ-004 ו־055 אינם דורשים אותו ואינם צורכים אותו.

4.4.3 Procedure root מגדיר כללים אך אינו מעניק ל־actor סמכות לבצע Admission. כל מי שמחזיק procedure יכול לטעון שקיבל Candidate, או Authority יכול להישאר replayable בלי consumption.

4.4.4 תיקון נדרש: Admission Freeze יחייב גם exact predecessor procedure root וגם fresh single-use `BootstrapReviewAuthority` הקשור ל־Candidate, operation, acceptor, epoch ו־expected Head; ה־CAS יצרוך אותו אטומית.

4.4.5 תנאי קבלה: procedure-only, authority-only, wrong Candidate, wrong operation, stale/revoked/replayed authority ו־self-issued authority מסתיימים `SELF-AUTHORITY-BLOCKED` או terminal קנוני יחיד אחר.

## 4.5 `MPRR-V13-HR-F005` — ה־semantic uses DAG אינו ה־DAG המכני שנבדק

4.5.1 `locator=§1.2.3;MPRR-V13-REQ-003–006;MPRR-V13-REQ-014;§10.4 MPRR-V13-REQ-056`.

4.5.2 ה־247 explicit dependencies הם acyclic, אך named uses מהותיים חסרים: Req-003 משתמש ב־Appointment, Reviews, Comparison, Reconciliation, Veto, human approval ו־protected admission שמוגדרים מאוחר יותר; Req-004 משתמש ב־Permit lifecycle וב־PhaseFreeze; Req-005 משתמש ב־time/terminal schemas; Req-014 משתמש ב־finality receipt וב־PhaseFreeze שמוגדרים ב־Req-016–018.

4.5.3 הוספת הקשתות הסמנטיות יוצרת forward edges ולעיתים cycle, משום שהדרישות המאוחרות תלויות חזרה ב־Bootstrap procedure. לכן predicate `forwardReference=0,semanticMissingEdge=0` אינו יכול לעבור על מבנה ה־Subject הנוכחי.

4.5.4 תיקון נדרש: לפצל external bootstrap vocabulary/schemas לשכבת foundation שקודמת לכל שימוש, להפריד schema-use מ־runtime-use, להפיק machine uses manifest ולסדר מחדש את 57 הדרישות או Successor שלהן לפי ה־DAG המלא.

4.5.5 תנאי קבלה: extractor עצמאי מפיק את כל named uses; לכל use ancestor מפורש; unknown/self/duplicate/cycle/forward/semantic-missing כולם אפס בשני graph engines.

## 4.6 `MPRR-V13-HR-F006` — Result identity ו־finality receipt עלולים ליצור Fixed point

4.6.1 `locator=§4.1 MPRR-V13-REQ-014;§4.3 MPRR-V13-REQ-016`.

4.6.2 `RunResultId` כולל finality receipt root, בעוד finality receipt הוא הרשומה שבוחרת איזה Result authoritative. ה־Subject אינו אומר שה־receipt חותם pre-result payload ואסור לו לכלול ResultId.

4.6.3 אם ה־receipt מזהה את ה־Result שהוא מאשר, ResultId תלוי ב־receipt root שתלוי חזרה ב־ResultId. אם אינו מזהה את ה־Result, ניתן להצמידו ל־output/terminal אחר.

4.6.4 תיקון נדרש: להגדיר `ResultPayloadRoot` בלתי־תלוי, finality receipt שקשור ל־RequestId+ResultPayloadRoot ואינו מכיל ResultId, ואז ResultEnvelopeId נפרד; לאסור כל back-edge.

4.6.5 תנאי קבלה: byte-level constructor graph acyclic; שני encoders מפיקים אותם roots; receipt של payload אחר, terminal אחר או receipt הכולל ResultEnvelopeId מסתיים `RUN-IDENTITY-BLOCKED`.

## 4.7 `MPRR-V13-HR-F007` — Freshness check אינו fenced מול כל dependency heads

4.7.1 `locator=§8.4 MPRR-V13-REQ-046;§8.5 MPRR-V13-REQ-047;§8.6 MPRR-V13-REQ-048`.

4.7.2 Req-047 דורש observation boundary ו־atomic commit, ו־Req-048 עושה CAS על expected current Head ו־authority epoch, אך אין version vector/fencing על כל source, policy, appointment, revocation, permit, engine ו־clock heads שקבעו `Fresh=true`.

4.7.3 Dependency יכול להשתנות אחרי בדיקת Freshness ולפני linearization בלי לשנות את ה־single expected Head. כך commit יכול לקבל input stale.

4.7.4 תיקון נדרש: Freshness snapshot יפיק immutable dependency-version vector; ה־transaction יאמת וינעל או יעשה CAS על כל current predicate roots וה־revocation ledgers באותה linearization boundary.

4.7.5 תנאי קבלה: mutation concurrent בכל dependency בין read ל־commit גורמת abort; אין accepted envelope אם version אחד השתנה; שני readbacks מוכיחים אותו version vector ו־operation.

## 4.8 `MPRR-V13-HR-F008` — 35 דרישות predecessor אינן בתוך Closure machine denominator

4.8.1 `locator=§1.1.7;§10.5 MPRR-V13-REQ-057;§11.1;§15.1.2`.

4.8.2 Section 11 מציג 35 mappings חד־שורתיים, אבל Req-057 דורש detached closure row רק לכל source Finding ו־Intake defect. הוא אינו דורש 35 rows ל־V12REQ עם revised field paths, vectors, terminals ו־independent verdict.

4.8.3 Requirement יכול להישמר בשם אך לא בסמנטיקה. דוגמה ממשית: MPRR-022 דרש three-domain vector, בעוד successor mappings מפצלים אותו בין Req-019/036/037 ומיפוי Section 11 מצביע רק ל־Req-037.

4.8.4 תיקון נדרש: להרחיב Closure manifest ל־91 source obligations, כולל 35 predecessor requirements, עם one source row לכל identity, full successor target Set, field-level delta, vector Set, terminal, residual risk ו־independent status.

4.8.5 תנאי קבלה: forward/inverse orphans=`0/91`; כל 35 semantics מסווגים `FULL` בידי reviewer exact-root; `PARTIAL/ABSENT` נשאר blocking.

## 4.9 `MPRR-V13-HR-F009` — Public hash של Private Evidence אינו בהכרח content-safe

4.9.1 `locator=§9.1 MPRR-V13-REQ-049;§9.3 MPRR-V13-REQ-051;§9.4 MPRR-V13-REQ-052`.

4.9.2 Public tier מותר להכיל "content-safe hashes" ו־root-binding record, אך אין non-enumerability, unlinkability או dictionary-resistance predicate.

4.9.3 Hash גלוי של secret קצר, email, phone, API token בפורמט ידוע או מסמך בעל entropy נמוכה מאפשר offline guessing וחשיפת equality גם בלי payload bytes.

4.9.4 תיקון נדרש: לאסור publication של raw content digests ל־Private payload; להשתמש ב־opaque attestation/commitment profile עם threat model, secret separation, rotation ו־public metadata minimization, תוך שמירת raw digest ב־Private בלבד.

4.9.5 תנאי קבלה: low-entropy dictionary, equality-correlation ו־cross-run linking vectors מפיקים zero disclosure; Public verifier מקבל integrity claim בלי יכולת לבדוק guess נגד Private content.

## 4.10 `MPRR-V13-HR-F010` — אין Trust/Signature/Key model ל־attestations

4.10.1 `locator=§2.5 MPRR-V13-REQ-005;§4.7 MPRR-V13-REQ-020;§5.5 MPRR-V13-REQ-025;§7.4 MPRR-V13-REQ-040;§8.5–§8.6`.

4.10.2 ה־Subject משתמש ב־trusted issuer, signed Amendment, external Appointment, finality receipt, human approval ו־readback אך אינו דורש SignatureAlgorithmRegistry, key identity, trust-anchor chain, signature scope, key validity, compromise/revocation-at-signing או anti-equivocation log.

4.10.3 Exact root מוכיח content identity, לא מי אישר אותו. Producer או attacker יכול ליצור root תקין ולטעון שהוא Reviewer/Acceptor receipt.

4.10.4 תיקון נדרש: detached attestation schema קנונית לכל authority-bearing record, עם signer key root, algorithm/profile root, trust chain, signed payload root, purpose, epoch, signing-time observation, expiry, revocation/compromise semantics ו־transparency/equivocation rule.

4.10.5 תנאי קבלה: forged, wrong-purpose, wrong-key, expired, revoked-before-signing, compromised, cross-operation replay ו־equivocating signatures מסתיימים `ACTOR-AUTHORITY-BLOCKED` או terminal קנוני ייעודי.

## 4.11 `MPRR-V13-HR-F011` — A/B conformance Evidence אינו חבר מחייב ב־Admission CAS

4.11.1 `locator=§8.6 MPRR-V13-REQ-048;§10.3 MPRR-V13-REQ-055`.

4.11.2 Req-055 דורש Generation A, Delta, Generation B, stale-A attack, recovery ו־replay, אך Req-048 אינו מונה את A/B Result roots, Delta manifest, stale-attack result ו־replay receipt בין inputs שחייבים להיכלל ב־Acceptance envelope וב־atomic CAS.

4.11.3 Procedure יכול להצהיר ששני דורות עברו בלי שה־accepted Head קשור ל־evidence המסוים, או להחליף Evidence בין Candidates.

4.11.4 תיקון נדרש: להגדיר `ConformanceAdmissionEvidenceRoot` קנוני הכולל את כל A/B inputs/results/delta/negative/recovery roots; Admission Freeze, human approval, Permit issuance ו־CAS חייבים לקשור אותו.

4.11.5 תנאי קבלה: missing, swapped, stale, different-Candidate או partially replayed A/B evidence מונע Admission; Permit issuance ו־accepted Head bind אותו exact evidence root.

# 5. Findings P1

## 5.1 `MPRR-V13-HR-F012` — Finality receipt חסר Issuer ו־Lifecycle

5.1.1 `locator=§4.3 MPRR-V13-REQ-016;§4.7 MPRR-V13-REQ-020`.

5.1.2 Req-016 אומר ש־detached receipt בוחר finality, אך אינו מגדיר מי רשאי להנפיקו, cardinality, epoch, fencing, revocation או succession; finality issuer אף אינו מופיע ברשימת actors של Req-020.

5.1.3 שני receipts חוקיים למראה יכולים ליצור conflict תמידי, או actor לא־מורשה יכול לסיים Request.

5.1.4 תיקון נדרש: להוסיף FinalityAuthority/Appointment, single-writer או quorum rule, receipt lifecycle ו־operation fencing.

5.1.5 תנאי קבלה: unauthorized, duplicate, stale epoch, revoked, competing quorum ו־replayed receipt vectors מתכנסים ל־authoritative Result יחיד או `RUN-RESULT-CONFLICT-BLOCKED` בלי latest-wins.

## 5.2 `MPRR-V13-HR-F013` — Proof predicates עצמם משתמשים ב־Terminal disjunction

5.2.1 `locator=§3.4.3;§3.7 MPRR-V13-REQ-013;§5.1.3;§6.1.3;§6.3.3`.

5.2.2 Req-013 אוסר disjunction או alias ודורש terminal קנוני יחיד, אך predicates אחרים מחזירים "SERIALIZATION... or specific terminal", ‏"REVIEW-INELIGIBLE or REVIEW-ENVELOPE..." וארבעה engine terminals בלי precedence לכל vector.

5.2.3 שני engines יכולים להחזיר terminals שונים לאותה תקלה ועדיין לטעון compliance.

5.2.4 תיקון נדרש: להכין לפני כל predicate total vector-to-terminal table ו־precedence function; אין `or`, alias או prose terminal.

5.2.5 תנאי קבלה: כל negative vector ממופה בדיוק לרשומת Terminal אחת; overlap מפעיל precedence דטרמיניסטי זהה בשני engines.

## 5.3 `MPRR-V13-HR-F014` — Independence matrix אינו כולל את כל ה־duplicated engines

5.3.1 `locator=§2.5.3;§6.3 MPRR-V13-REQ-031;§8.2.3;§10.2 MPRR-V13-REQ-054`.

5.3.2 Req-005 דורש שני lifecycle engines, Req-044 שני risk evaluators ו־Req-054 שני risk evaluators, אך Req-031 מחייב independence רק ל־parsers, Normalizers, Comparators ו־graph engines.

5.3.3 שני evaluators החולקים אותו code/dependency defect יכולים להפיק false parity ולקבל Authority או aggregate risk שגויים.

5.3.4 תיקון נדרש: EngineClass registry כולל כל pair שמעניק parity credit, לרבות authority lifecycle, risk, clock/freshness, custody/publication אם כפולים; allowed-common-root matrix לכל class.

5.3.5 תנאי קבלה: כל parity claim מצביע ל־independence receipt; shared forbidden edge מעניק zero credit ו־engine-class-specific terminal.

## 5.4 `MPRR-V13-HR-F015` — Review envelope אינו קושר Run/Freeze/packet root

5.4.1 `locator=§4.5 MPRR-V13-REQ-018;§5.1 MPRR-V13-REQ-021;§8.1 MPRR-V13-REQ-043`.

5.4.2 17-field Review payload כולל subject, instruction ו־local Manifest roots, אך אינו כולל `RunRequestId`, ‏`PhaseFreezeRoot`, ‏`ReviewPacketRoot` או Evidence input root. Review B packet כן כולל Evidence roots, אך ה־Review envelope אינו קושר את packet.

5.4.3 אותו Review output יכול להיות מצורף ל־Run/Freeze אחר או ל־Evidence packet אחר בעל אותו subject/instructions.

5.4.4 תיקון נדרש: להוסיף exact Request, Freeze, packet ו־input Evidence roots ל־Review payload ולהוכיח שהם זהים ל־presealed roots ול־Run Result lineage.

5.4.5 תנאי קבלה: envelope reuse תחת Request/Freeze/packet/Evidence אחר מסתיים `REVIEW-INELIGIBLE`; כל Review Result מצביע למעטפת אחת ול־Freeze אחד.

## 5.5 `MPRR-V13-HR-F016` — Human approval חסר Record contract נגד Replay

5.5.1 `locator=§2.6 MPRR-V13-REQ-006;§4.7 MPRR-V13-REQ-020;§8.6 MPRR-V13-REQ-048`.

5.5.2 exact-root human approver מוזכר, אך אין Requirement לרשומת Approval שקושרת Candidate, conformance evidence, unresolved/risk snapshot, expected Head, operation, intent, expiry, revocation ו־single-use state.

5.5.3 Approval ישן או approval ל־Candidate אחר יכול להיות replayed כל עוד actor Appointment עדיין תקף.

5.5.4 תיקון נדרש: HumanApproval schema חתומה, operation-bound, root-complete, expiring, revocable ו־consumed atomically ב־CAS.

5.5.5 תנאי קבלה: wrong Candidate/evidence/head/operation, stale risk snapshot, expiry, revocation ו־replay נשארים blocking.

## 5.6 `MPRR-V13-HR-F017` — Quarantine-before-persist אינו ישים לכל Public surface

5.6.1 `locator=§9.2 MPRR-V13-REQ-050;§9.3 MPRR-V13-REQ-051`.

5.6.2 GitHub/provider-managed CI logs, issue metadata, security events, caches ו־חלק מ־generated surfaces נכתבים אצל הספק לפני scanner חיצוני. Requirement גורף של scanner ו־quarantine לפני כל persistence אינו מגדיר מנגנון enforceable או מה עושים כשאין hook מוקדם.

5.6.3 Definition יכול להיות בלתי־ישים או להצהיר PASS אחרי scan מאוחר שכבר התרחש לאחר Publication.

5.6.4 תיקון נדרש: לכל surface לבחור אחת מארבע יכולות סגורות: source-side prevent, provider-native pre-persist control, disabled surface, או declared post-persist containment שאינו מקבל zero-exposure claim; unsupported pre-persist surface חסום כברירת מחדל.

5.6.5 תנאי קבלה: capability evidence נבדק לכל surface; surface בלי prevent/disable אינו מקבל Publication permit; post-persist detection מסווג Incident ולא pre-publication PASS.

## 5.7 `MPRR-V13-HR-F018` — Immutable Private archive סותר Retention/Destruction

5.7.1 `locator=§9.1 MPRR-V13-REQ-049;§9.3 MPRR-V13-REQ-051`.

5.7.2 Req-051 דורש immutable inventory של כל exact inputs, בעוד Req-049 דורש retention, legal hold ו־destruction policies. אין state machine שמגדיר tombstone, crypto-erasure, replica deletion, hold precedence או replay disposition אחרי מחיקה.

5.7.3 מערכת עלולה לשמור PII לנצח כדי לשמר replay, או למחוק Evidence בלי יכולת להוכיח מה נמחק ומדוע.

5.7.4 תיקון נדרש: custody lifecycle נפרד ל־content, keys, receipts ו־replicas; legal-hold precedence; deletion plan/receipt; post-destruction replay terminal; אין "immutable bytes forever".

5.7.5 תנאי קבלה: retention expiry עם/בלי hold, key destruction, replica lag, restore copy ו־partial deletion vectors מגיעים למצב יחיד ובטוח עם Audit receipt.

## 5.8 `MPRR-V13-HR-F019` — Untrusted content מוגן רק מפני Workflow authority, לא מפני Semantic corruption

5.8.1 `locator=§9.4 MPRR-V13-REQ-052;§10.2 MPRR-V13-REQ-054`.

5.8.2 predicate דורש ש־instruction injection לא ישנה workflow authority, אך Subject/Review content עוין עדיין יכול לגרום ל־AI/tool Reviewer להשמיט Findings, להמציא Evidence או לשנות severity/remediation בלי לשנות את control flow.

5.8.3 שלוש Reviews יכולות לקבל false agreement אם הן משתמשות באותו prompt/tool vulnerability.

5.8.4 תיקון נדרש: data/instruction channel separation, content-origin labels, tool sandbox, output provenance, adversarial semantic holdouts ו־independence policy גם ל־review agents/models/prompts.

5.8.5 תנאי קבלה: prompt injection, tool-output injection, malicious links ו־embedded instructions אינם משנים authority וגם אינם מקבלים unsupported semantic assertion; detected influence blocks eligibility.

## 5.9 `MPRR-V13-HR-F020` — PublicationSurfaceRegistry חסר Discovery/Freshness מול שינוי ספק

5.9.1 `locator=§9.2 MPRR-V13-REQ-050;§8.4 MPRR-V13-REQ-046`.

5.9.2 Closed list יכול להיות מלא ביום יצירתו אך GitHub/CI/provider יכול להוסיף surface, feature או export path. אין provider capability/version root, discovery evidence, freshness TTL או unknown-new-surface invalidator.

5.9.3 Surface חדש יכול לפרסם bytes בלי scanner ועדיין לא להופיע ב־Registry ולכן לא להיכשל.

5.9.4 תיקון נדרש: root-bound provider capability inventory, periodic/triggered discovery, `asOf/validThrough`, version-change invalidation ו־default deny לכל unclassified surface.

5.9.5 תנאי קבלה: הוספת provider feature, enabling Discussions/Pages/Packages/LFS או API schema drift הופכים Publication permit ל־stale עד Registry successor.

## 5.10 `MPRR-V13-HR-F021` — Trusted clock observation חסר Clock authority

5.10.1 `locator=§3.1 MPRR-V13-REQ-007;§8.4 MPRR-V13-REQ-046;§8.5 MPRR-V13-REQ-047`.

5.10.2 Req-007 דורש trusted-clock observation, skew ו־rollback rules אך אינו דורש ClockAuthority root, source/quorum, monotonic epoch, signed observation או relation בין clocks של registries שונים.

5.10.3 Actor יכול לבחור clock נוח, להאריך Permit או להחזיר receipt לפני expiry; parser agreement על timestamp אינו trust proof.

5.10.4 תיקון נדרש: ClockAuthority/Observation schema עם source root, monotonic counter/epoch, uncertainty interval, quorum או authoritative source, signature, rollback detection ו־fail-closed cross-clock comparison.

5.10.5 תנאי קבלה: skew, rollback, split clocks, expired authority, unavailable clock ו־forged observation אינם מוכיחים Freshness או ordering.

## 5.11 `MPRR-V13-HR-F022` — Aggregate risk חסר closed universe snapshot

5.11.1 `locator=§8.2 MPRR-V13-REQ-044;§8.3 MPRR-V13-REQ-045;§8.6 MPRR-V13-REQ-048`.

5.11.2 "every concurrently current risk receipt" אינו מגדיר Registry head, subject/tenant scope, completeness proof או snapshot root. CAS מאמת risk roots שסופקו, אך לא מוכיח שאין receipt נוסף שהושמט.

5.11.3 Caller יכול לבחור subset מתחת threshold ולהשמיט risk receipt תקף.

5.11.4 תיקון נדרש: canonical RiskUniverseSnapshotRoot מן authoritative registry head, full membership/non-membership proof, scope ו־freshness; aggregate evaluation ו־human approval bind אותו.

5.11.5 תנאי קבלה: omitted, added, wrong-scope, stale, revoked או concurrent risk receipt משנה snapshot ומונע commit; aggregate בשני evaluators זהה.

# 6. Findings P2

## 6.1 `MPRR-V13-HR-F023` — Crosswalk mapping אינו תואם literal source-tuple grammar

6.1.1 `locator=§1.2.4;§11.1;§12;§13.1;§14.1`.

6.1.2 כל mapping נכתב בתוך code span יחיד כגון ``V12REQ@root::MPRR-001 → MPRR-V13-REQ-002``. Parser שמיישם literal `namespace@root::memberId` יכול לפרש את החץ וה־target כחלק מ־memberId.

6.1.3 תיקון נדרש: להפריד source tuple ו־target tuple לשדות machine-readable נפרדים או לטבלה בעלת columns סגורים.

6.1.4 תנאי קבלה: parser יחיד מחלץ בדיוק 35+22+22+12 source IDs ו־target Sets; suffix/arrow אינו חלק מאף memberId.

## 6.2 `MPRR-V13-HR-F024` — Coverage algebra אינו מגדיר overlap בין passes

6.2.1 `locator=§5.2 MPRR-V13-REQ-022`.

6.2.2 predicate אומר inspected plus excluded regions מכסים extent בלי gap או overlap, אך Review עשוי לדרוש tool pass ו־manual pass שחופפים במכוון. לא מוגדר אם overlap נמדד בתוך union, בין classes או לפי multiplicity.

6.2.3 תיקון נדרש: להגדיר interval/media-region algebra, union cardinality, allowed cross-pass overlap ו־forbidden inspected-vs-excluded overlap.

6.2.4 תנאי קבלה: שני coverage engines מסכימים על nested, overlapping, duplicate, excluded ו־multi-pass regions; רק unexplained gap או forbidden class overlap נכשל.

# 7. סדר תיקון מחייב

## 7.1 Foundation

7.1.1 לתקן קודם את NamespaceEntry/member identity, exact three-domain invariant ו־BootstrapReviewAuthority.

7.1.2 לאחר מכן לבנות semantic uses DAG אמיתי וליצור successor root; אין לתקן את ה־Subject שנבדק in place.

## 7.2 Identity ו־acceptance

7.2.1 להפריד ResultPayload/finality envelope, להוסיף attestation/key/clock models ולהוסיף dependency version vector ל־Freshness CAS.

7.2.2 להכניס ConformanceAdmissionEvidenceRoot, HumanApprovalRoot ו־RiskUniverseSnapshotRoot ל־Admission Freeze ול־atomic commit.

## 7.3 Provenance ו־Public safety

7.3.1 להרחיב machine closure ל־91/91 obligations.

7.3.2 להחליף raw Public hashes ב־content-safe attestation profile, לתקן Publication enforcement/discovery ולסגור custody retention/destruction.

## 7.4 Review semantics

7.4.1 לקשור Review envelopes ל־Request/Freeze/packet/Evidence, לסגור terminal precedence ולכסות את כל engine pairs ב־independence receipts.

7.4.2 רק successor שעובר שוב QA מכני וביקורת exact-root עצמאית יכול להפוך Requirement baseline Candidate.

# 8. Verdict ו־Disposition

## 8.1 Counters

8.1.1 findings=`24`; severity vector=`P0=11,P1=11,P2=2,P3=0`; open=`24`; closed=`0`; merged=`0`; suppressed=`0`; riskAccepted=`0`.

8.1.2 mechanical row/field/source presence=`PASS`; explicit dependency DAG=`PASS`; semantic uses DAG=`FAIL`; semantic predecessor preservation=`FAIL`; authority/acceptance safety=`FAIL`; Public Evidence safety=`FAIL`.

8.1.3 direct preservation identity=`91/91`; independently accepted semantic closure=`0/91`.

## 8.2 Verdict

8.2.1 `reviewResult=REJECT` עבור Subject root `1acadac5e9e6cc814bb9699be48c47f71a974d44cecb8b3fe31395e323ab89a3`.

8.2.2 ה־Subject הוא שיפור גדול ומכני מסודר לעומת v1.2, אך 11 מסלולי P0 משאירים אפשרות ל־vacuous Review, self/unauthenticated authority, stale atomic acceptance, semantic requirement loss או Public information disclosure.

8.2.3 אין לשנות את ה־Subject. יש ליצור v1.4 successor root שסוגר כל אחד מ־24 ה־Findings בנפרד, ללא Merge או Closure transfer.

8.2.4 Protocol Definition authoring, real Finding normalization, Comparison, Reconciliation, Acceptance ו־Gate credit נשארים חסומים.

8.2.5 `Gate29=BLOCKED`; `development freeze=ACTIVE`; Product percentage, remaining hours, critical path ו־ETA=`unknown/unavailable`.
