# 1. Connect — ביקורת Hostile בלתי־תלויה לדרישות Three-review Protocol v1.2

## 1.1 זהות, Subject וגבולות סמכות

1.1.1 `artifactId=CONNECT-THREE-REVIEW-PROTOCOL-V1-2-SUCCESSOR-REQUIREMENTS-HOSTILE-REVIEW-2026-08-29`.

1.1.2 `reviewClass=INDEPENDENT-STRUCTURAL-SEMANTIC-IDENTITY-SECURITY-HOSTILE-REVIEW`.

1.1.3 Subject=`/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-2-successor-requirements-2026-08-29.md`.

1.1.4 Subject raw SHA-256=`90d3a33aa11204afc6ea1fc92ba31acf615729617470b3137418a71a618c6461`; physical identity=`563 lines`; `44,966 bytes`.

1.1.5 rejected predecessor-requirements root=`3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e`.

1.1.6 mathematical-hostile-review root=`fb5d33c3593adcf614e3fb4f87660fef762af2f9cf12791422a815c7470dec45`; its Findings Manifest root=`35a5ef1b1860c1c95df45a521e87d47ac8acc5fa21c13a8d71bd47ecd5968ff0`.

1.1.7 Intake assessment root=`f970f0d62e4c62bf17f417967f2baebcbed78ef393e4622bfe3b85d5e10e4b08`.

1.1.8 הביקורת לא קראה ולא השתמשה ב־Producer QA של ה־Subject. העצמאות נשמרה באמצעות קריאת ה־Subject, מקורות ה־Findings שה־Subject עצמו מצהיר עליהם ובדיקות מכניות בלתי־תלויות בלבד.

1.1.9 שינוי Byte אחד ב־Subject הופך דוח זה ל־`STALE-FOR-CURRENT`.

1.1.10 הדוח אינו Protocol Definition, אינו סוגר Finding, אינו מנרמל Observation, אינו מפעיל Comparison או Reconciliation ואינו מעניק Acceptance, Gate, Task, Product, Git, Push, Deploy, Provider או שעות.

## 1.2 שיטת הביקורת

1.2.1 נבדקו `MPRR-001`–`MPRR-035`, חמשת שדות כל שורה, כל Reference וכל Dependency מוצהר.

1.2.2 נבדקו בנפרד Bootstrap, ‏`ProtocolUsePermit`, מניעת Self-authority, ‏SourceFreeze, זהויות Request/Result, פרופיל bytes/digest, Collections, ‏Legacy eligibility, סמכות Amendment, עצמאות Normalizers, Partition, Comparison cardinality, Semantic successors, Invalidation, CAS, Archive, Public Evidence, Risk acceptance ושני דורות.

1.2.3 לכל `MPRR-MATH-HR-F001`–`F022` ולכל `INTAKE-E001`–`E012` ניתן סטטוס `FULL`, ‏`PARTIAL` או `ABSENT`. אזכור ID בלבד אינו מקבל Closure credit.

1.2.4 `P0` הוא פער שיכול לאפשר Authority, Identity, Join או Acceptance שגויים, או חשיפת מידע אסור. `P1` הוא אי־דטרמיניזם, Governance gap או Proof gap מהותי. `P2` הוא פער תחזוקה או Interoperability שאינו לבדו מסלול Acceptance.

# 2. תוצאות מכניות

## 2.1 מבנה שורות

2.1.1 Requirement denominator=`35`; IDs רציפים וייחודיים=`35/35`.

2.1.2 לכל שורה בדיוק מופע אחד של `rule`, ‏`causeAndEffect`, ‏`sourceIds`, ‏`acceptancePredicate`, ‏`dependencies`: ‏`35/35` לכל שדה.

2.1.3 Dependency edges=`129`; unknown targets=`0`; self edges=`0`; duplicate dependency rows=`0`; cycles מכניים=`0`.

2.1.4 Source references בשורות=`193`; labels מקומיים ייחודיים=`73`; משפחות label=`6`: ‏`BCA2`, ‏`INTAKE-E`, ‏`MPRR-MATH-HR-F`, ‏`MSSA-F`, ‏`TRD2-REQ`, ‏`TRD2-SHR-F`.

2.1.5 Direct label coverage של ה־Mathematical review=`22/22`; Direct label coverage של ה־Intake defects=`12/12`.

2.1.6 תקינות 2.1.1–2.1.5 אינה מוכיחה שה־Source labels קשורים ל־roots הנכונים, שה־Dependencies מספיקים סמנטית או שהדרישות ניתנות להפעלה בלי מעגל סמכות.

## 2.2 תוצאת Closure ממוקדת

2.2.1 `MPRR-MATH-HR` semantic sufficiency=`FULL 14/22`; `PARTIAL 8/22`; `ABSENT 0/22`.

2.2.2 `INTAKE` semantic sufficiency=`FULL 3/12`; `PARTIAL 9/12`; `ABSENT 0/12`.

2.2.3 המשמעות היא שה־Successor משפר מהותית את מודל הזהויות, ה־Legacy וה־Graph, אך עדיין אינו Requirement baseline בטוח לכתיבת Protocol Definition.

# 3. Findings P0

## 3.1 `MPRR-V12-HR-F001` — Bootstrap ו־SourceFreeze דורשים Permit שאינו יכול להתקיים

3.1.1 `locator=§2.3 MPRR-003;§8.4 MPRR-035`.

3.1.2 MPRR-003 דורש שכל Run כשיר יקפיא Accepted Protocol ו־`ProtocolUsePermit`, בעוד MPRR-035 דורש משני דורות שלפני קבלת ה־Protocol לעבור את MPRR-001–MPRR-034 וללא Permit פורמלי.

3.1.3 אין Mode type נפרד ל־`BOOTSTRAP-CONFORMANCE` עם Freeze profile שאינו טוען Accepted Protocol/Permit. לכן הוכחת שני הדורות בלתי־ישימה או נאלצת להמציא חריג לא־מוגדר.

3.1.4 תיקון נדרש: להגדיר שני Run modes סגורים, Freeze schema ו־authority predicate שונים לכל Mode, ולאסור מעבר מ־Conformance result ל־Formal finding authority.

3.1.5 תנאי קבלה: Generation A/B עוברים עם `BootstrapUseAuthority` בלבד; הכנסת `ProtocolUsePermit` לא־קיים או Accepted Protocol לא־קיים נכשלת; Formal Run לפני Permit מסתיים `PROTOCOL-INELIGIBLE`.

## 3.2 `MPRR-V12-HR-F002` — מסלול הביקורת של ה־Protocol עצמו נשאר מעגלי

3.2.1 `locator=§2.1 MPRR-001;§2.2 MPRR-002;§8.4 MPRR-035;§10.1.5`.

3.2.2 סעיף 10.1.5 דורש QA, ‏Review A, ‏presealed Review B, Reconciliation ו־Acceptance של ה־Protocol Candidate לפני Permit, אך לא מגדיר Protocol חיצוני וקפוא שמסדיר פעולות אלו.

3.2.3 Conformance על Fixtures מוכיח מנגנון, אך אינו מעניק לאותו מנגנון סמכות לנהל את ביקורת עצמו. הפרדת Artifacts לבדה אינה שוברת את מעגל הכללים.

3.2.4 תיקון נדרש: להקפיא `BootstrapReviewProcedure` חיצוני, root-bound וקודם ל־Candidate, עם Actor/Appointment/Review/Reconciliation/Acceptance schemas מוגבלים לקבלת Protocol בלבד.

3.2.5 תנאי קבלה: כל Attestation בקבלת ה־Protocol מצביע רק ל־BootstrapReviewProcedure; ה־Candidate אינו כלל ההכרעה של עצמו; כל Missing/stale/wrong-procedure edge מסתיים `SELF-AUTHORITY-BLOCKED`.

## 3.3 `MPRR-V12-HR-F003` — 73 Source labels אינם Root-qualified

3.3.1 `locator=§1.1;sourceIds בכל MPRR-001–MPRR-035;§9`.

3.3.2 ה־Subject מקפיא roots ל־Intake ול־Mathematical review, אך משתמש גם ב־`BCA2-*`, ‏`TRD2-REQ-*`, ‏`MSSA-F*` ו־`TRD2-SHR-F*` בלי לקשור כל namespace ל־artifact root מדויק.

3.3.3 Label מקומי אינו זהות גלובלית. קובץ אחר יכול להכיל אותו label עם תוכן אחר, ולכן Direct coverage של `73` labels אינה Source provenance.

3.3.4 תיקון נדרש: `SourceNamespaceRegistry` קפוא עם namespace, report/manifest root, subject root, record count, ID set, authority class ו־status; כל source edge הוא tuple של namespace root ו־member ID.

3.3.5 תנאי קבלה: כל 193 source references נפתרים ל־member יחיד תחת root קפוא; dangling, ambiguous, stale או wrong-subject edge מסתיים `SOURCE-GRAPH-INVALID`.

## 3.4 `MPRR-V12-HR-F004` — `H(exact inputs,...)` אינו Constructor קנוני

3.4.1 `locator=§2.4 MPRR-004;§3.3 MPRR-007;§3.4 MPRR-008`.

3.4.2 MPRR-004 אינו מונה את שדות `exact inputs`, אינו מצביע ל־Schema/Projection/version ואינו קובע ש־`H` הוא אותו SHA-256/domain-frame של MPRR-007–008. גם Dependency שלו הוא MPRR-003 בלבד.

3.4.3 שני מימושים יכולים לבחור Input set, order או hash domain שונים ולהפיק Request/Result IDs שונים תוך עמידה מילולית בנוסחה.

3.4.4 תיקון נדרש: להגדיר Request/Result schemas סגורים, projections, domain tags ו־constructor version, ולתלות אותם ב־MPRR-005–MPRR-009.

3.4.5 תנאי קבלה: שני Encoders מפיקים bytes ו־IDs זהים לכל vector; הוספה/השמטה/סידור שדה, hash אחר או unframed hash מסתיימים `RUN-IDENTITY-BLOCKED`.

## 3.5 `MPRR-V12-HR-F005` — SourceFreeze אינו סוגר Lineage לכל שלב

3.5.1 `locator=§2.3 MPRR-003;§5.2 MPRR-018;§6.1–§6.4 MPRR-022–MPRR-025`.

3.5.2 MPRR-003 מתאר Freeze אחד ל־Reconciliation ומונה Reviews, source Manifests ו־“normalized-input Manifests”, אך אינו מגדיר Profiles נפרדים ל־Normalization, Comparison ו־Reconciliation ואינו מחייב roots של Normalizer outputs, Comparison assertions, conflicts ו־resolution inputs.

3.5.3 Input יכול להשתנות בין Normalization, Comparison ו־Reconciliation בלי לשנות את Freeze שנבדק.

3.5.4 תיקון נדרש: PhaseFreezeRegistry עם required roles/cardinalities לכל Run type ו־explicit predecessor Result roots; כל Output מצביע ל־Freeze של אותו שלב.

3.5.5 תנאי קבלה: שינוי בכל Intermediate root יוצר Request successor ומבטל descendants; שום Run אינו יכול לצרוך “latest” או root שאינו member ב־Freeze שלו.

## 3.6 `MPRR-V12-HR-F006` — CAS אינו מחייב Freshness ואטומיות של כל ה־Commit set

3.6.1 `locator=§7.4 MPRR-030;§7.5 MPRR-031`.

3.6.2 MPRR-030 מקדים את MPRR-031 ב־DAG ואינו דורש `Fresh(input,t)=true`. הוא גם דורש write sequence ו־linearization point, אך אינו מחייב transaction אטומי אחת עבור operation ledger, Head ו־Acceptance envelope.

3.6.3 CAS יכול לקבל roots מדויקים אך stale, או לעדכן Head בלי Envelope/operation receipt לאחר כשל חלקי.

3.6.4 תיקון נדרש: לפצל Freshness/graph definition לפני Acceptance; להגדיר atomic commit set ו־durable recovery state machine לכל נקודת כשל.

3.6.5 תנאי קבלה: stale dependency לעולם אינו מתקבל; crash בכל write boundary משאיר zero commit או commit יחיד וניתן לשחזור; readback קשור ל־operation ID ול־same transaction proof.

## 3.7 `MPRR-V12-HR-F007` — Identity-changing Resolution עוקף Reviewer authority

3.7.1 `locator=§4.5 MPRR-014;§5.1 MPRR-017;§6.3 MPRR-024`.

3.7.2 MPRR-014 אוסר על Normalizer להמציא semantic predicates ודורש Reviewer Amendment/ReObservation, אך MPRR-024 מאפשר ל־Resolver לבחור predicates וליצור Semantic successor שנשלח ל־fresh normalization.

3.7.3 Resolver שאינו Reviewer יכול להפוך בפועל למחבר Observation חדש ולעקוף את non-retroactivity וה־Review Envelope.

3.7.4 תיקון נדרש: Resolution identity-changing אינה יוצרת Semantic object ישירות; היא יוצרת `REOBSERVATION-REQUIRED`, ורק Eligible Reviewer records חדשים יכולים להיכנס ל־Normalizer.

3.7.5 תנאי קבלה: predicate שלא נחתם בתוך Eligible Review/ReObservation לעולם אינו Semantic input; Resolver-only mutation מסתיימת `NORMALIZATION-INELIGIBLE`.

## 3.8 `MPRR-V12-HR-F008` — Exact offline archive ו־Public-safe Evidence סותרים זה את זה

3.8.1 `locator=§8.1 MPRR-032;§8.2 MPRR-033`.

3.8.2 MPRR-032 דורש לארכב את כל ה־exact inputs ל־offline replay. MPRR-033 דורש ש־Public artifacts לא יכילו Secrets/PII/private Evidence ומאפשר redaction/reference. אין הפרדה בין Private evidence vault לבין Public receipt set.

3.8.3 אם exact input רגיש מפורסם — קיימת דליפה; אם הוא נחתך או מוחלף — ה־Public archive אינו exact ואינו משחזר את ה־root.

3.8.4 תיקון נדרש: dual-tier custody עם Private encrypted/sealed evidence, Public content-safe receipts, access policy, destruction/retention rules ו־root binding ביניהם בלי פרסום bytes רגישים.

3.8.5 תנאי קבלה: Public clone ו־history מכילים zero prohibited bytes; Authorized isolated replay מן ה־Private tier משחזר roots; Public receipt מאמת existence/integrity אך אינו חושף payload.

## 3.9 `MPRR-V12-HR-F009` — Bootstrap authority ו־ProtocolUsePermit חסרים Lifecycle וסכמת שימוש

3.9.1 `locator=§2.1 MPRR-001;§7.5 MPRR-031;§8.4 MPRR-035`.

3.9.2 ה־Bootstrap root חייב להקדים את ה־Candidate, אך אין דרישה ל־issuer trust root, nonce-free deterministic use identity, one-time/multi-use cardinality, candidate-class constraint, expiry, revocation, successor או consumption ledger. גם `ProtocolUsePermit` מתואר כ־single-scope ללא schema מלא.

3.9.3 Authority מוקדמת וכללית יכולה להיות replayed נגד Candidate אחר או להמשיך לאחר Revocation.

3.9.4 תיקון נדרש: Authority/Permit schemas ו־state machines חיצוניים עם exact scope, subject class, operation binding, validity interval, epoch, revocation, consumption and successor rules.

3.9.5 תנאי קבלה: wrong candidate/scope/epoch, replay, expired, revoked או already-consumed authority מסתיימים `AUTHORITY-INELIGIBLE`; אין fallback ל־historical authority.

# 4. Findings P1

## 4.1 `MPRR-V12-HR-F010` — Result finality ו־authoritative replay אינם Total

4.1.1 `locator=§2.4 MPRR-004`.

4.1.2 “אותו authoritative Result או unresolved state” אינו מגדיר Result state machine, מי בוחר Result authoritative, האם Terminal אחד בלבד מותר, ומה קורה כששתי תוצאות חתומות נוצרות לאותו Request.

4.1.3 נדרשת פונקציית finality חד־ערכית, append-only attempt lineage ו־conflict terminal שאינו מאפשר בחירת Result לפי “latest”.

4.1.4 תנאי קבלה: לכל Request לכל היותר Authoritative Result אחד; שני terminals מתחרים יוצרים `RUN-RESULT-CONFLICT-BLOCKED`; unresolved אינו הופך ל־success בלי receipt חדש.

## 4.2 `MPRR-V12-HR-F011` — Presence states ו־Comparison cardinality עדיין אינם פונקציה מלאה

4.2.1 `locator=§6.1 MPRR-022`.

4.2.2 המצבים `ineligible`, ‏`legacy-only` ו־`review-absent` יכולים לחפוף; אין precedence. גם “assertion אחד לכל distinct normalized value” אינו מגדיר טיפול ב־null/inapplicable, Sets, multi-valued fields או הנוסחה הכוללת למספר assertions.

4.2.3 נדרש classifier סגור ו־cardinality equation לפי Semantic Finding, domain, required field path ו־canonical value group.

4.2.4 תנאי קבלה: כל domain מקבל state יחיד; count צפוי נגזר לפני execution; permutation, null, inapplicable ו־multi-value vectors נותנים אותה תוצאה בשני Comparators.

## 4.3 `MPRR-V12-HR-F012` — Partition ה־Local אינו מגדיר Classifier ו־Precedence

4.3.1 `locator=§4.3 MPRR-012;§5.5 MPRR-021`.

4.3.2 ה־Partition מוגדר כ־disjoint/total, אך אין פונקציה שמכריעה Record שהוא גם Historical וגם schema-invalid, או Review חדש שהוא ineligible עקב Envelope ו־normalization-blocked מסיבות שונות.

4.3.3 נדרש Registry של classification reasons ו־precedence ששומר את כל הסיבות בלי לשבץ Identity ביותר מ־Set אחד.

4.3.4 תנאי קבלה: שני Classifiers מפיקים אותו tag ו־reason Set; overlap/unclassified=0; invalid Legacy אינו משודרג ל־Blocked/Eligible באופן שמשנה LegacyLocalKey.

## 4.4 `MPRR-V12-HR-F013` — Independence matrix סותר את ה־Conformance corpus המשותף

4.4.1 `locator=§5.2 MPRR-018;§8.3 MPRR-034;§8.4 MPRR-035`.

4.4.2 MPRR-018 מתיר כמשותף רק schema/specification ודורש Fixtures שנכתבו עצמאית, בעוד MPRR-034/035 דורשים Corpus/Fixtures נורמטיביים זהים להשוואה. לא נקבע אם Corpus משותף מותר ומה נשאר holdout עצמאי.

4.4.3 נדרש להפריד normative public vectors, independently authored hidden vectors ו־adversarial holdout, ולהגדיר אילו Roots רשאים להיות משותפים בלי לבטל independence.

4.4.4 תנאי קבלה: Independence evaluator מסווג כל shared edge; Shared generated implementation/mapping נכשל; corpus מותר ומוגבל מפורשות; hidden outputs נשארים sealed עד comparison.

## 4.5 `MPRR-V12-HR-F014` — עצמאות אינה חלה על Parsers, Comparators ו־Graph engines

4.5.1 `locator=§5.2 MPRR-018;§8.3 MPRR-034`.

4.5.2 רק שני Normalizers מקבלים Independence matrix. שני Parsers, שני Comparators ושני Graph engines יכולים לשתף owner, code, parser או dependency ולהפיק אותה טעות.

4.5.3 נדרש Independence contract נפרד לכל זוג Engines ול־Comparator orchestration, עם allowed common roots ו־sealed outputs.

4.5.4 תנאי קבלה: forbidden shared edge בכל Engine pair מעניק zero parity credit ומסתיים ב־terminal ייעודי.

## 4.6 `MPRR-V12-HR-F015` — Canonical Set order אינו סוגר Nested values ו־Duplicate equality

4.6.1 `locator=§3.3 MPRR-007`.

4.6.2 “canonical encoded key” אינו מגדיר אם ממיינים לפי framed element, JCS element או semantic projection; אין recursion rule ל־nested sets ואין Equality predicate שקודמת ל־duplicate rejection.

4.6.3 נדרש ElementCanonicalBytes constructor, recursive depth/size bounds ו־Duplicate equality לפי bytes וגם full digest collision handling.

4.6.4 תנאי קבלה: nested/permuted/duplicate/collision vectors מתכנסים לאותם bytes או ל־terminal יחיד בשני Encoders.

## 4.7 `MPRR-V12-HR-F016` — “שלושה Domains” אינם קשורים חד־ערכית ל־QA/Review A/Review B

4.7.1 `locator=§2.3 MPRR-003;§6.1 MPRR-022;§7.1 MPRR-027;§7.2 MPRR-028`.

4.7.2 המסמך דורש שלושה raw Reviews ו־three-domain vector, אך Actor registry כולל Producer, QA, Review A ו־Review B. אין Domain registry שמכריע אם QA הוא Review domain, מה cardinality לכל Domain ומה קורה ל־replacement reviewer.

4.7.3 נדרש closed ReviewDomain registry עם role-to-domain mapping, required counts, replacement/succession וכללי Independence.

4.7.4 תנאי קבלה: כל raw Review ו־presence slot קשורים ל־Domain יחיד; missing/duplicate/wrong-role Reviewer נשאר `REVIEW-INELIGIBLE`.

## 4.8 `MPRR-V12-HR-F017` — Risk acceptance חסר Aggregate ו־Non-waivable governance

4.8.1 `locator=§7.3 MPRR-029`.

4.8.2 P0/P1 חסומים ו־P2/P3 מקבלים authority/evidence/expiry, אך אין רשימת finding classes שאינן ניתנות לוויתור, maximum expiry, cumulative-risk cap, renewal semantics או Separation of Duties בין Resolver, risk owner ו־Acceptor.

4.8.3 סדרת P2 findings יכולה להצטבר לסיכון P0 בלי לעבור Aggregate review.

4.8.4 תנאי קבלה: policy קפואה מגדירה non-waivable classes, max TTL, aggregate thresholds, renewal/revocation ו־forbidden actor overlap; חריגה נשארת blocking.

## 4.9 `MPRR-V12-HR-F018` — Public scan threat model אינו כולל את כל ערוצי הפרסום

4.9.1 `locator=§8.2 MPRR-033`.

4.9.2 “staged/history/export scans” אינו מחייב סריקת Git objects, LFS, submodules, archives, encoded/binary/media payloads, CI logs/artifacts, generated reports, issue/PR metadata או cache provenance.

4.9.3 נדרש PublicationSurface registry, decompression/decoding limits, quarantine-before-persist ו־false-negative failure policy.

4.9.4 תנאי קבלה: כל surface מקבל scanner/owner/terminal; unsupported or scan-incomplete payload אינו מתפרסם; test corpus מכסה nested archive ו־encoded-secret paths.

## 4.10 `MPRR-V12-HR-F019` — “Roots differ only through Delta” אינו Predicate בר־הוכחה

4.10.1 `locator=§8.4 MPRR-035`.

4.10.2 Generation A ו־B חייבים לקבל generation IDs, times, request/result IDs ו־descendant roots שונים גם כאשר Input Delta יחיד. הניסוח אינו מפריד בין direct mutation, expected transitive affected Set ו־invariant Set.

4.10.3 נדרש Delta Manifest עם `changedInputSet`, ‏`expectedAffectedClosure`, ‏`expectedInvariantSet` ו־comparison predicate לכל Node type.

4.10.4 תנאי קבלה: השינוי הישיר הוא בדיוק Delta; כל descendant צפוי משתנה; כל Node מחוץ ל־closure נשאר זהה; missing/extra affected Node חוסם.

## 4.11 `MPRR-V12-HR-F020` — ה־Dependency DAG תקין מכנית אך חסר סמנטית

4.11.1 `locator=dependencies של MPRR-004,MPRR-010,MPRR-016,MPRR-018,MPRR-024,MPRR-030,MPRR-031,MPRR-032,MPRR-033`.

4.11.2 Identity constructors אינם תלויים תמיד ב־type/serialization/digest registry; Normalizer independence אינו תלוי ב־actor authority; CAS קודם ל־Freshness; Public safety מגיע אחרי Archive.

4.11.3 DAG acyclic יכול עדיין לאפשר פעולה לפני prerequisite מהותי או ליצור צורך עתידי ב־cycle.

4.11.4 תנאי קבלה: לכל Rule מופק machine `uses/dependsOn` graph; כל referenced type, constructor, authority, policy ו־safety control הוא ancestor; missing semantic edge=0; cycles=0.

## 4.12 `MPRR-V12-HR-F021` — Crosswalk אינו Manifest Machine-verifiable ואינו סוגר את F022

4.12.1 `locator=§1.2.4;§9.1–§9.3;§10.1.1`.

4.12.2 `MPRR-MATH-HR-F022` ממופה ל־Sections 9.2/9.3 במקום ל־Requirement row בעל חמשת השדות. Intake mappings משתמשים ב־“named safe terminals” או “dependent blocking terminal” ואינם נושאים status/residual-risk/source-root fields.

4.12.3 המסמך מצהיר `accepted=0`, ולכן אין כרגע False closure; אך המבנה העתידי אינו יכול להוכיח `12/12 FULL` או inverse coverage באופן דטרמיניסטי.

4.12.4 תנאי קבלה: Detached machine manifest עם one row per source Finding, exact source root/member, revised rule IDs, field paths, vector IDs, exact terminal, status, residual risk ו־independent review receipt; forward/inverse orphan=0.

# 5. Finding P2

## 5.1 `MPRR-V12-HR-F022` — Safe-terminal taxonomy אינה סגורה

5.1.1 `locator=acceptancePredicate ברחבי MPRR-001–MPRR-035;§9`.

5.1.2 קיימים terminals עם ובלי `-BLOCKED`, ערך state של `unknown/unavailable`, alternatives המחוברות ב־“or”, ו־references כלליים ל־terminal אחר. אין Terminal registry עם type, precedence ו־recoverability.

5.1.3 נדרש closed Terminal registry שמבדיל Result status, Block reason ו־human-readable unknown, וקושר כל negative vector לערך אחד.

5.1.4 תנאי קבלה: כל terminal literal נפתר לרשומה אחת; aliases/unknown literals=0; שני Engines מחזירים אותו typed terminal לכל vector.

# 6. Matrix מול `MPRR-MATH-HR-F001`–`F022`

## 6.1 FULL

6.1.1 `F002=FULL`: ReviewEnvelope identity מופרדת מן ה־payload ומונעת fixed-point.

6.1.2 `F004=FULL`: נדרש Pipeline יחיד מ־typed record עד digest; פערי Run identity נרשמו בנפרד ב־F004 החדש.

6.1.3 `F005=FULL`: Collections מסווגים ו־Set order נדרש; גבולות Nested values נרשמו כ־Finding חדש.

6.1.4 `F006=FULL`: 73 Historical records נשארים Legacy עם zero eligibility.

6.1.5 `F008=FULL`: LegacyLocalKey, NormalizedRecordId ו־Alias edge מופרדים.

6.1.6 `F010=FULL`: Equivalence דורשת גם key-byte equality וגם full-root equality.

6.1.7 `F011=FULL`: נדרש Partition total/disjoint ופונקציה `f:EligibleSet→SemanticSet`; classifier details נרשמו בנפרד.

6.1.8 `F014=FULL`: נדרש typed acyclic graph ו־minimal affected Set.

6.1.9 `F015=FULL`: Freeze member roles, uniqueness key ו־bytewise order נדרשים; Phase lineage נרשם בנפרד.

6.1.10 `F016=FULL`: Local schema מונה field names ומחייב types/cardinalities/Extension registry.

6.1.11 `F017=FULL`: Byte accounting מופרד מ־domain coverage ו־full exclusion נכשל.

6.1.12 `F018=FULL`: Time/clock/expiry boundaries נדרשים כמודל סגור.

6.1.13 `F020=FULL`: `Fresh(object,t)` והיעדר Historical fallback נדרשים.

6.1.14 `F021=FULL`: Controlled Delta, stale-A attack, affected Set ו־B replay נדרשים; precision gap נרשם ב־F019 החדש.

## 6.2 PARTIAL

6.2.1 `F001=PARTIAL`: Bootstrap authority נוסף, אך Freeze ו־קבלת ה־Protocol עצמו עדיין מעגליים.

6.2.2 `F003=PARTIAL`: Request/Result הופרדו, אך Constructors ו־Result finality אינם סגורים.

6.2.3 `F007=PARTIAL`: Amendment authority נוסף, אך identity-changing Resolution עדיין עוקף אותו.

6.2.4 `F009=PARTIAL`: Independence matrix רחב נוסף, אך הוא סותר shared corpus ואינו מכסה Engines אחרים.

6.2.5 `F012=PARTIAL`: Presence vector ו־value groups נוספו, אך state partition ו־cardinality function אינם Total.

6.2.6 `F013=PARTIAL`: Semantic successor נדרש, אך מקור predicates החדש יכול להיות Resolver במקום Eligible Reviewer.

6.2.7 `F019=PARTIAL`: operation/fencing/linearization נוספו, אך Freshness ו־atomic commit set חסרים.

6.2.8 `F022=PARTIAL`: Crosswalk נוסף, אך אינו Detached machine manifest וכולל mapping עצמי/terminals לא־מדויקים.

## 6.3 סיכום

6.3.1 `FULL=14`; `PARTIAL=8`; `ABSENT=0`; `TOTAL=22`.

6.3.2 אין Closure credit. FULL בדוח זה הוא Sufficiency של דרישת התיקון מול Finding קודם, לא הוכחה שה־Protocol העתידי יישם אותה.

# 7. Matrix מול `INTAKE-E001`–`E012`

## 7.1 FULL

7.1.1 `INTAKE-E002=FULL`: failureBoundary מפורש ואינו נגזר מ־prose.

7.1.2 `INTAKE-E006=FULL`: Schema ו־assertion classes מקבלים Registry/Cardinality requirements מפורשים.

7.1.3 `INTAKE-E009=FULL`: Namespace/Alias direction ו־Legacy identity מופרדים.

## 7.2 PARTIAL

7.2.1 `INTAKE-E001=PARTIAL`: external Bootstrap מוזכר, אך קבלת ה־Protocol ו־Conformance Freeze עדיין מעגליים.

7.2.2 `INTAKE-E003=PARTIAL`: prose מופרד, אך Resolver יכול לכתוב identity-changing predicates.

7.2.3 `INTAKE-E004=PARTIAL`: scalar/JSON/frame/digest נדרשים, אך Constructors מסוימים משתמשים ב־`H` לא־מקושר ו־Set nesting אינו סגור.

7.2.4 `INTAKE-E005=PARTIAL`: Envelope/Coverage חזקים יותר, אך exact three-domain/actor mapping ו־Bootstrap review procedure חסרים.

7.2.5 `INTAKE-E007=PARTIAL`: semantic projection ושני Normalizers קיימים, אך Independence/Comparison gaps נשארו.

7.2.6 `INTAKE-E008=PARTIAL`: Normalizer inference אסור, אך ReObservation/Resolution path אינו חד־ערכי.

7.2.7 `INTAKE-E010=PARTIAL`: Request/Result ו־Legacy namespaces הופרדו, אך identity constructors/finality פתוחים.

7.2.8 `INTAKE-E011=PARTIAL`: Freeze/Coverage קיימים, אך Phase lineage ו־Public/Private custody פתוחים.

7.2.9 `INTAKE-E012=PARTIAL`: successor/authority concepts קיימים, אך source namespaces אינם Root-qualified ו־Permit lifecycle אינו סגור.

## 7.3 סיכום

7.3.1 `FULL=3`; `PARTIAL=9`; `ABSENT=0`; `TOTAL=12`.

# 8. פסק דין ותנאי Successor

## 8.1 פסק דין

8.1.1 `verdict=REJECT-AS-PROTOCOL-DEFINITION-REQUIREMENT-BASELINE`.

8.1.2 Independent Findings=`22`: ‏`P0=9`; ‏`P1=12`; ‏`P2=1`; ‏`P3=0`.

8.1.3 open=`22`; closed=`0`; merged=`0`; suppressed=`0`; risk-accepted=`0`.

8.1.4 ה־Subject הוא שיפור משמעותי לעומת predecessor, אך אינו סוגר את Bootstrap, provenance, phase lineage, CAS freshness/atomicity, reviewer authority ו־Public evidence custody.

8.1.5 `Requirement accepted=0/35`; ‏`Review envelopes eligible=0/3`; ‏`semantic Finding denominator=unknown/unavailable`.

8.1.6 Comparison, Reconciliation, Protocol Acceptance ו־Gate credit נשארים חסומים.

8.1.7 `Gate29=BLOCKED`; `development freeze=ACTIVE`; exact Product percentage, remaining hours, critical path ו־ETA=`unknown/unavailable`.

## 8.2 Successor acceptance predicates

8.2.1 Successor חדש בלבד; אין לערוך את Root שנבדק במקום.

8.2.2 כל 22 Findings נשמרים כיחידות עצמאיות; Shared remediation אינה Merge או Closure.

8.2.3 כל 193 source edges חייבים להיות Root-qualified ו־member-resolved.

8.2.4 Bootstrap Conformance, Bootstrap Review ו־Formal Protocol Use חייבים להיות שלושה Modes/authorities נפרדים עם Freeze profiles סגורים.

8.2.5 Identity/serialization/CAS/freshness חייבים לעבור valid, negative, failure, concurrency, recovery ו־attack vectors בשני Engines עצמאיים.

8.2.6 Public Evidence מחייב dual-tier custody והוכחת zero prohibited bytes בכל Publication surface.

8.2.7 Mathematical sufficiency חייבת להיות `22/22 FULL`; Intake sufficiency חייבת להיות `12/12 FULL`; residual `PARTIAL/ABSENT=0`.

8.2.8 רק לאחר exact-root Producer QA וביקורות עצמאיות חדשות על ה־Successor ניתן לשקול Requirement Acceptance. דוח זה אינו מעניק Acceptance.
