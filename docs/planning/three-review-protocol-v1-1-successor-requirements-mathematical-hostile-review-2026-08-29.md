# 1. Connect — ביקורת עוינת מתמטית וזהותית לדרישות Three-review Protocol v1.1

## 1.1 זהות, Subject וגבולות

1.1.1 `artifactId=CONNECT-THREE-REVIEW-PROTOCOL-V1-1-SUCCESSOR-REQUIREMENTS-MATHEMATICAL-HOSTILE-REVIEW-2026-08-29`.

1.1.2 `reviewClass=INDEPENDENT-MATHEMATICAL-IDENTITY-HOSTILE-REVIEW`.

1.1.3 Subject=`/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-1-successor-requirements-2026-08-29.md`.

1.1.4 Subject SHA-256=`3daa9e3d29cd77521ce0fe3f29bfa716254282e315ef27cbd0cd17e8605a9f0e`; physical identity=`475 lines`; `26,083 bytes`.

1.1.5 Predecessor Protocol SHA-256=`6f08bf3a00c995503a37ff930a826d915d85591277908b7813e52a0a6b6b8539`.

1.1.6 Intake assessment SHA-256=`f970f0d62e4c62bf17f417967f2baebcbed78ef393e4622bfe3b85d5e10e4b08`.

1.1.7 הביקורת חלה רק על ה־Subject root שב־1.1.4. שינוי Byte יחיד הופך אותה `STALE-FOR-CURRENT`.

1.1.8 הביקורת אינה משנה את ה־Subject, אינה מפעילה Normalization או Reconciliation, אינה יוצרת Acceptance, Tasks, שעות או ETA ואינה מעניקה Gate credit.

## 1.2 שיטה

1.2.1 נבדקו כל `35` מזהי `MPRR-001`–`MPRR-035` וכל חמשת שדות הרשומה.

1.2.2 נבדקה Direct coverage של `INTAKE-E001`–`INTAKE-E012`, ולאחריה Sufficiency סמנטית של כל תיקון.

1.2.3 נבנה גרף Dependencies מכני, נבדקו Reference closure, Self-edge, Duplicate edge ו־Cycle.

1.2.4 נבדקו בנפרד Type closure, Canonical bytes, Framing, Digest, Alias, local/semantic identity, Normalizer independence, Union cardinality, Comparison, Conflict, Reconciliation, CAS, Freshness ו־Two-generation proof.

1.2.5 `P0` מציין Requirement gap שיכול להפיק זהות, Join, Run או Acceptance שגויים; `P1` מציין אי־דטרמיניזם או Proof gap מהותי; אין Finding שמקבל Closure בדוח זה.

## 1.3 תוצאות מכניות תקינות

1.3.1 Requirement IDs=`35/35`, רציפים וייחודיים.

1.3.2 לכל Requirement בדיוק מופע אחד של `rule`, ‏`causeAndEffect`, ‏`sourceIds`, ‏`acceptancePredicate`, ‏`dependencies`: ‏`35/35` לכל שדה.

1.3.3 Direct identity coverage של Intake defects=`12/12`; אף `INTAKE-E` אינו חסר.

1.3.4 Dependency references=`129`; unknown references=`0`; self-edges=`0`; duplicate dependency rows=`0`; cycles=`0`.

1.3.5 התקינות המכנית של 1.3 אינה מוכיחה שה־Requirements מספיקים מתמטית או שסגרו את Defects הסמנטיים.

## 1.4 פסק דין

1.4.1 `verdict=REJECT-AS-PROTOCOL-DEFINITION-REQUIREMENT-BASELINE`.

1.4.2 נמצאו `22` Findings עצמאיים: `14 P0`, ‏`8 P1`, ‏`0 P2`, ‏`0 P3`.

1.4.3 Sufficiency מול 12 Defects: ‏`FULL=1`, ‏`PARTIAL=11`, ‏`ABSENT=0`; Direct mention אינו Closure.

1.4.4 החסמים המרכזיים הם Self-root במעטפת, Run identity שתלויה ב־Terminal עתידי, ערבוב Legacy/eligible observations, Normalizer independence לא־מספק, Union לא־Total, Comparison ללא Cardinality contract ו־Bootstrap מעגלי לשני דורות.

1.4.5 Semantic Finding denominator, Comparison, Reconciliation, Acceptance ו־Gate credit נשארים חסומים; Product percentage, remaining hours, critical path ו־ETA נשארים `unknown/unavailable`.

# 2. Findings P0

## 2.1 `MPRR-MATH-HR-F001` — `INTAKE-E001` וסמכות שני הדורות נשארים מעגליים

2.1.1 `severity=P0`.

2.1.2 `subjectLocator=§2.1 MPRR-001;§2.2 MPRR-002;§7.4 MPRR-030;§8.4 MPRR-035`.

2.1.3 `defect`: `INTAKE-E001` מופיע רק ב־MPRR-001, שמגדיר predecessor/scope אך אינו דורש Protocol-use authority חיצונית לפני Run. במקביל MPRR-035 דורש שני Runs עם protected Acceptance כדי להפוך את אותו Protocol ל־eligible.

2.1.4 `identityImpact`: Protocol שטרם הוכח נדרש להפעיל את מנגנון ה־Acceptance שמוכיח אותו; זו סמכות Same-generation עקיפה גם אם כל Artifact מופרד פיזית.

2.1.5 `requiredRequirementDelta`: להגדיר Bootstrap authority/permit חיצוני שקודם ל־Protocol Candidate, Conformance-only generation שאינו Reconciliation אמיתי, ו־Protocol-use permit שנוצר רק אחרי detached acceptance.

2.1.6 `closurePredicate`: אין Run פורמלי תחת Protocol לא־eligible; שני דורות הם Fixtures/Conformance generations תחת authority קודמת; כל שימוש מוקדם מסתיים `PROTOCOL-INELIGIBLE`.

2.1.7 `sourceIds=INTAKE-E001,BCA2-REQ-001,BCA2-REQ-005,TRD2-REQ-002,TRD2-REQ-060`.

## 2.2 `MPRR-MATH-HR-F002` — `envelopeRoot` יוצר Self-reference ללא Constructor

2.2.1 `severity=P0`.

2.2.2 `subjectLocator=§4.1 MPRR-010`.

2.2.3 `defect`: `envelopeRoot` הוא אחד מ־18 שדות חובה, אך לא מוגדר אם הוא מוחרג מן ה־Preimage, מחושב מעל Projection עם Sentinel או נשמר כ־Detached receipt.

2.2.4 `identityImpact`: Hash של Envelope הכולל את ה־Hash של עצמו אינו ניתן לחישוב באופן רגיל; Implementations יכולים לבחור Conventions שונים ועדיין לטעון 18/18.

2.2.5 `requiredRequirementDelta`: להסיר `envelopeRoot` מן ה־hashed record ולהחזיק Detached identity, או להגדיר Projection מדויק שאינו Self-referential ושם שדה נפרד ל־claimed root.

2.2.6 `closurePredicate`: שני Encoders מפיקים אותו Root ללא Fixed-point/self field; שינוי claimed root אינו משנה את ה־Preimage; mismatch מסתיים `REVIEW-ENVELOPE-ROOT-BLOCKED`.

2.2.7 `sourceIds=INTAKE-E004,INTAKE-E005,TRD2-REQ-011`.

## 2.3 `MPRR-MATH-HR-F003` — Run identity כוללת Terminal שטרם קיים

2.3.1 `severity=P0`.

2.3.2 `subjectLocator=§2.4 MPRR-004`.

2.3.3 `defect`: Rule דורש ש־NormalizationRun, ComparisonRun ו־ReconciliationRun identities יכילו `terminal`, אף שה־Terminal הוא Result לאחר יצירת ה־Run.

2.3.4 `identityImpact`: Run ID אינו ידוע לפני הביצוע או משתנה בסיום; Receipts/locks/expected head אינם יכולים להיקשר ל־Input identity יציבה.

2.3.5 `requiredRequirementDelta`: להפריד `RunRequestId=H(inputs,policy,expectedHead)` מ־`RunResultId=H(runRequestId,outputs,terminal)` ומ־append-only status receipt.

2.3.6 `closurePredicate`: Request identity קבועה לפני execution; כל Terminal אפשרי יוצר Result בלבד; replay של Request זהה אינו יוצר Run identity חדשה.

2.3.7 `sourceIds=INTAKE-E010,TRD2-REQ-013,TRD2-REQ-060`.

## 2.4 `MPRR-MATH-HR-F004` — JCS ו־Binary framing אינם מחוברים ל־Serialization pipeline יחיד

2.4.1 `severity=P0`.

2.4.2 `subjectLocator=§3.2 MPRR-006;§3.3 MPRR-007;§3.4 MPRR-008;§5.1 MPRR-017`.

2.4.3 `defect`: MPRR-006 דורש Canonical JSON, MPRR-007 דורש field-tagged binary preimage, ו־MPRR-017 דורש canonical key bytes; אין כלל הקובע האם Binary frames raw typed values, JCS bytes, JSON field fragments או Projection אחר.

2.4.4 `identityImpact`: שני מימושים יכולים לעמוד בכל Rule בנפרד ולהפיק Bytes ו־SHA-256 שונים.

2.4.5 `requiredRequirementDelta`: להגדיר Pipeline יחיד: validated typed record → normalized field values → canonical set ordering → exact semantic projection → one serialization → domain framing → digest.

2.4.6 `closurePredicate`: לכל Vector קיימת Preimage אחת בלבד; JCS-only, binary-only, double-encoded ו־field-fragment variants מלבד המוסכם נכשלים באותו Terminal.

2.4.7 `sourceIds=INTAKE-E004,INTAKE-E007,INTAKE-E008,TRD2-REQ-010,TRD2-REQ-011`.

## 2.5 `MPRR-MATH-HR-F005` — Sets אינם מקבלים Canonical order כולל

2.5.1 `severity=P0`.

2.5.2 `subjectLocator=§3.3 MPRR-007;§4.3 MPRR-012;§4.6 MPRR-015;§5.1 MPRR-017;§6.1 MPRR-022`.

2.5.3 `defect`: Arrays מקבלות Count/Item framing וששת assertion classes מוגדרים duplicate-free, אך אין דרישה שכל Set ימוין לפי canonical encoded bytes; JCS אינו ממיין Array members.

2.5.4 `identityImpact`: אותו Set בסדר אחר מפיק Semantic key או Comparison root שונים וגורם ל־false disagreement.

2.5.5 `requiredRequirementDelta`: לסווג כל Collection כ־ordered list, mathematical set או multiset; Set דורש uniqueness וסדר canonical bytewise לאחר normalization.

2.5.6 `closurePredicate`: Permutation של כל Set אינה משנה Bytes/Root; שינוי סדר של ordered list כן משנה; duplicate member נכשל ולא נמחק בשקט.

2.5.7 `sourceIds=INTAKE-E004,INTAKE-E006,INTAKE-E007`.

## 2.6 `MPRR-MATH-HR-F006` — 73 Legacy observations מתערבבות עם Review-eligible observations

2.6.1 `severity=P0`.

2.6.2 `subjectLocator=§4.1 MPRR-010;§4.7 MPRR-016;§5.5 MPRR-021;§9.1.2`.

2.6.3 `defect`: Intake קבע `0/3` מעטפות כשירות, אך Requirements דורשות 73/73 local observations תחת Envelopes/Schema חדשים, בלי להבחין בין raw legacy preservation לבין Findings שנצפו מחדש תחת Review eligible.

2.6.4 `authorityImpact`: יצירת Envelope מאוחרת יכולה להיראות כאילו Reviewer היסטורי ידע Manifest root, instruction, appointment או timestamp שלא היו בדוח המקורי.

2.6.5 `requiredRequirementDelta`: להגדיר `LegacyObservation` שאינו ניתן ל־upgrade, ו־`EligibleReviewObservation` חדש שנוצר רק מ־Review/re-attestation חדש; לשמר provenance וקישור comparison ללא ירושת authority.

2.6.6 `closurePredicate`: 73 Legacy records נשמרים unmerged אך מקבלים zero formal comparison eligibility; כל eligible record נושא Review envelope שנוצר בזמן ה־Review ואינו Backfill.

2.6.7 `sourceIds=INTAKE-E005,INTAKE-E006,INTAKE-E011,TRD2-REQ-057`.

## 2.7 `MPRR-MATH-HR-F007` — אין סמכות להשלמת שדות ו־Canonical predicates חסרים

2.7.1 `severity=P0`.

2.7.2 `subjectLocator=§4.3 MPRR-012;§4.5 MPRR-014;§5.1 MPRR-017`.

2.7.3 `defect`: Rule אוסר inferred missing values אך דורש canonical defect predicates, failureBoundary ושישה Assertion sets שאינם קיימים ב־Manifests הנוכחיים; לא מוגדר מי רשאי ליצור אותם ובאיזה Root/Appointment.

2.7.4 `identityImpact`: Normalizer עלול להפוך prose למשמעות ולהיות בפועל Reviewer/Resolver, או שהדרישה אינה ניתנת למימוש עבור 73 הרשומות.

2.7.5 `requiredRequirementDelta`: להגדיר signed Reviewer Amendment/Re-observation record, authority, predecessor, exact source spans, non-retroactivity, disagreement state ו־zero inference by normalizer.

2.7.6 `closurePredicate`: Normalizer רק מקרין שדות שכבר אושרו; שדה חסר נשאר ineligible; Amendment לא משנה raw observation ומקבל identity/authority עצמאיים.

2.7.7 `sourceIds=INTAKE-E002,INTAKE-E003,INTAKE-E006,INTAKE-E008,INTAKE-E009`.

## 2.8 `MPRR-MATH-HR-F008` — Local identity אינה מבחינה Raw Manifest מ־Normalized Manifest

2.8.1 `severity=P0`.

2.8.2 `subjectLocator=§4.7 MPRR-016;§5.5 MPRR-021`.

2.8.3 `defect`: Local key הוא `(raw Review root, local Manifest root, local ID)`, אך “local Manifest” יכול להיות ה־9/10-field source Manifest או Successor normalization-input Manifest. בנוסף כיוון one-to-one/one-to-many alias mapping אינו מוגדר.

2.8.4 `identityImpact`: הוספת שדות למיפוי יכולה לשנות את זהות Observation המקורית; Alias יכול להתרחב ל־Finding נוסף או להיקשר בכיוון הלא נכון.

2.8.5 `requiredRequirementDelta`: להגדיר `LegacyLocalKey(rawReviewRoot,rawSourceManifestRoot,sourceLocalId)` ו־`NormalizedRecordId` נפרד; Alias edge כולל from/to domain ו־cardinality.

2.8.6 `closurePredicate`: יצירת normalized successor אינה משנה LegacyLocalKey; כל Alias הוא edge בלבד עם zero union cardinality; ambiguous direction נשאר `MAPPING-BLOCKED`.

2.8.7 `sourceIds=INTAKE-E009,INTAKE-E010`.

## 2.9 `MPRR-MATH-HR-F009` — שני Normalizers אינם מוכחים בלתי תלויים

2.9.1 `severity=P0`.

2.9.2 `subjectLocator=§5.2 MPRR-018;§7.1 MPRR-027;§8.3 MPRR-034`.

2.9.3 `defect`: “separately implemented/versioned” ו־output blindness אינם אוסרים shared code, generated implementation, common parser, same owner, shared dependency bug או shared precomputed mapping.

2.9.4 `identityImpact`: שני Outputs זהים יכולים להיות תוצאה של אותו Defect ולא הוכחת פירוש יחיד.

2.9.5 `requiredRequirementDelta`: להגדיר independence matrix עבור owners, code roots, parser roots, toolchains, dependencies, environments, fixtures ו־information flow; Shared schema בלבד מותר במפורש.

2.9.6 `closurePredicate`: Independence receipt עובר לפני output disclosure; forbidden common implementation edge מכשיל; parity ללא independence מקבל zero semantic-ID credit.

2.9.7 `sourceIds=INTAKE-E005,INTAKE-E007,TRD2-REQ-057,TRD2-REQ-058`.

## 2.10 `MPRR-MATH-HR-F010` — Full-digest equality אינה מספיקה ללא Key-byte equality

2.10.1 `severity=P0`.

2.10.2 `subjectLocator=§3.4 MPRR-008;§5.2 MPRR-018;§5.3 MPRR-019`.

2.10.3 `defect`: Exact equivalence מוגדרת רק לפי full semantic roots. Requirement מטפל ב־truncated collision אך לא ב־full SHA-256 collision או Digest implementation fault כאשר canonical key bytes שונים.

2.10.4 `identityImpact`: שני Keys שונים בעלי Digest זהה יכולים להתמזג; Root parity לבדה אינה מוכיחה Encoding parity.

2.10.5 `requiredRequirementDelta`: Equivalence דורשת גם exact canonical-key-byte equality וגם full digest equality; unequal bytes/equal digest הוא `FULL-DIGEST-COLLISION-BLOCKED`.

2.10.6 `closurePredicate`: Collision mutation אינה מתמזגת, שני Objects נשמרים, alias מושבת ו־Protocol successor נדרש; אין Counter/Suffix/Random fallback.

2.10.7 `sourceIds=INTAKE-E004,INTAKE-E007,TRD2-REQ-011`.

## 2.11 `MPRR-MATH-HR-F011` — Union אינו Total כאשר Record אינו eligible או Normalizers חלוקים

2.11.1 `severity=P0`.

2.11.2 `subjectLocator=§5.2.4;§5.5 MPRR-021;§6.4 MPRR-025;§9.1.2`.

2.11.3 `defect`: MPRR-018 נותן “no semantic ID” במקרה Difference, בעוד MPRR-021 דורש inverse map מן Semantic Findings לשחזר את כל 73; אין Partition ל־eligible, blocked ו־legacy sets.

2.11.4 `mathematicalImpact`: או שה־Inverse coverage שקרי, או ש־Record חסום נזרק, או שנוצר לו Semantic ID בניגוד ל־Rule.

2.11.5 `requiredRequirementDelta`: להגדיר `L=Legacy∪Eligible∪Blocked` כ־disjoint tagged partition; פונקציה `f:E→S`; ‏`Σ[s∈S]|f⁻¹(s)|=|E|`; Blocked נשמר מחוץ ל־S ומונע Comparison אם נדרש Scope מלא.

2.11.6 `closurePredicate`: כל Local identity מופיעה בדיוק ב־Partition אחד; inverse coverage הוא 100% של E ולא טענה כוזבת על B/L; Semantic denominator אינו מספר עד Eligibility closure.

2.11.7 `sourceIds=INTAKE-E005,INTAKE-E006,INTAKE-E007,INTAKE-E008`.

## 2.12 `MPRR-MATH-HR-F012` — Comparison חסר Presence matrix ו־Cardinality contract

2.12.1 `severity=P0`.

2.12.2 `subjectLocator=§6.1 MPRR-022;§6.2 MPRR-023;§6.4 MPRR-025`.

2.12.3 `defect`: לא מוגדר אם Assertion הוא pairwise, n-way או אחד לכל distinct normalized value; אין exact field universe, denominator או R1/R2/R3 presence vector. “Existence disagreement” אינו ניתן להוכחה ללא Eligibility-aware absence.

2.12.4 `mathematicalImpact`: Field או Reviewer יכול להישמט בלי Orphan; מספר Assertions יכול להשתנות לפי implementation; no-finding יכול להתפרש בטעות כ־disagreement.

2.12.5 `requiredRequirementDelta`: להגדיר לכל Semantic Finding את review-domain presence vector, eligible/not-observed/ineligible states, field path universe וקבוצה canonical של value groups/participants.

2.12.6 `closurePredicate`: כל eligible participant וכל required field מופיעים פעם אחת; assertion count נגזר דטרמיניסטית; absent Review אינו “no defect”; שני Comparators מחזירים אותו manifest root.

2.12.7 `sourceIds=INTAKE-E005,INTAKE-E006,INTAKE-E007,TRD2-REQ-058`.

## 2.13 `MPRR-MATH-HR-F013` — Resolution יכול לשנות שדה Identity בלי Successor Semantic Finding

2.13.1 `severity=P0`.

2.13.2 `subjectLocator=§6.2 MPRR-023;§6.3 MPRR-024;§6.4 MPRR-025`.

2.13.3 `defect`: Resolution רשאי לבחור predicates עבור conflict ב־scope/invariant/boundary/terminal, אך שדות אלה הם חלק מן Semantic key; אין כלל שמחייב Semantic successor או re-partition לאחר הבחירה.

2.13.4 `identityImpact`: Reconciled Finding יכול לשמור ID ישן אף שמשמעותו השתנתה, או לשנות Key ולהעביר Observations בלי Proof חדש.

2.13.5 `requiredRequirementDelta`: לסווג conflicts ל־identity-preserving ו־identity-changing; שינוי Key יוצר successor semantic object, מחדש normalization/comparison ומותיר prior object immutable.

2.13.6 `closurePredicate`: Resolution לעולם אינה משנה Key תחת אותו ID; כל changed predicate root יוצר new full key/root ו־explicit predecessor edge; אין closure/status transfer.

2.13.7 `sourceIds=INTAKE-E003,INTAKE-E007,TRD2-REQ-013,TRD2-REQ-058`.

## 2.14 `MPRR-MATH-HR-F014` — Invalidation graph אינו Typed ואינו מוכיח “exactly affected”

2.14.1 `severity=P0`.

2.14.2 `subjectLocator=§2.4 MPRR-004;§7.5 MPRR-031;§8.3 MPRR-034`.

2.14.3 `defect`: Mutation traversal נדרש תחת שני Graph engines, אך אין Node/Edge type registry, allowed direction/cardinality, cycle policy, generation boundary או affected-set function.

2.14.4 `identityImpact`: שני Engines יכולים להסכים על אותו Graph חסר; Cycle יכול להשבית הכל או להשאיר stale descendant current.

2.14.5 `requiredRequirementDelta`: להגדיר typed dependency/invalidation graph, no-dangling/self/cycle rules, supersession edges, traversal direction ו־minimal affected-set semantics.

2.14.6 `closurePredicate`: כל mutation vector מפיק אותו minimal affected set; edge חסר/אסור/cyclic מסתיים `INVALIDATION-GRAPH-BLOCKED`; היסטוריה נשמרת אך current pointer/eligibility מוסרים.

2.14.7 `sourceIds=INTAKE-E010,INTAKE-E011,INTAKE-E012,TRD2-REQ-034,TRD2-REQ-061`.

# 3. Findings P1

## 3.1 `MPRR-MATH-HR-F015` — SourceFreeze membership order ו־Roles אינם קנוניים

3.1.1 `severity=P1`.

3.1.2 `subjectLocator=§2.3 MPRR-003`.

3.1.3 `defect`: נדרש “identical ordered membership” אך אין sort key, unique role cardinality, duplicate-path/root handling או distinction בין Subject, Protocol, Review, Manifest, Schema, Normalizer ו־Appointment members.

3.1.4 `identityImpact`: שתי Readbacks יכולות להכיל אותו Set בסדר אחר או duplicate alias ולהחזיר Roots שונים.

3.1.5 `requiredRequirementDelta`: להגדיר typed member role, canonical relative path/URI, uniqueness key, canonical order ו־required cardinality per role.

3.1.6 `closurePredicate`: Permutation אינה משנה Freeze root; missing/duplicate/wrong-role member נכשל; seven current review artifacts אינם backfill ל־Reviewer knowledge.

3.1.7 `sourceIds=INTAKE-E011,INTAKE-E012,TRD2-REQ-001`.

## 3.2 `MPRR-MATH-HR-F016` — Lossless local schema אינו מונה Exact field names/cardinalities

3.2.1 `severity=P1`.

3.2.2 `subjectLocator=§3.5 MPRR-009;§4.3 MPRR-012`.

3.2.3 `defect`: ניסוחים כגון `review/local/source IDs`, ‏`affected clauses/artifacts`, ‏`six assertion sets` ו־`extensions` אינם Registry סגור של field names/types/cardinalities; “extensions” מתנגש עם no unknown keys.

3.2.4 `identityImpact`: שני Schemas יכולים לטעון Lossless compliance אך למפות IDs/arrays/extensions אחרת.

3.2.5 `requiredRequirementDelta`: לדרוש field registry מפורש, required/optional/inapplicable rules, array/set semantics, Extension namespace/version/claim-limit והשפעה על raw/semantic roots.

3.2.6 `closurePredicate`: Schema diff בין implementations הוא אפס; 23 predecessor fields וכל successor fields מקבלים mapping מפורש; Extension לא יכול להשפיע על Semantic key ללא Definition successor.

3.2.7 `sourceIds=INTAKE-E006,TRD2-REQ-007,TRD2-REQ-009`.

## 3.3 `MPRR-MATH-HR-F017` — Coverage exclusions יכולים לאפשר Review חלקי

3.3.1 `severity=P1`.

3.3.2 `subjectLocator=§4.2 MPRR-011`.

3.3.3 `defect`: covered plus excluded ranges רשאים לכסות 100% Subject, אך אין allowed-exclusion taxonomy או כלל שמונע Exclusion של כל ה־Subject.

3.3.4 `authorityImpact`: Review ריק יכול להיות “complete” מתמטית באמצעות exclusion מלא ועדיין להיראות eligible.

3.3.5 `requiredRequirementDelta`: להפריד byte-accounting completeness מ־review coverage; להגדיר אילו media/regions ניתנים להחרגה, claim-limit effect ומינימום Domain coverage.

3.3.6 `closurePredicate`: full exclusion אינו eligible; כל exclusion מקבל authority/reason וגורע מן claim scope; unexplained gap/overlap או excluded required region yields `REVIEW-INELIGIBLE`.

3.3.7 `sourceIds=INTAKE-E005,INTAKE-E011`.

## 3.4 `MPRR-MATH-HR-F018` — Timestamp, Clock ו־Expiry model אינם סגורים

3.4.1 `severity=P1`.

3.4.2 `subjectLocator=§3.1 MPRR-005;§4.1 MPRR-010;§6.3 MPRR-024;§7.4 MPRR-030;§7.5 MPRR-031`.

3.4.3 `defect`: Timestamps/durations נדרשים כ־types, אך אין UTC/offset precision, clock source, monotonic ordering, skew policy, inclusive expiry boundary או Unknown-clock terminal.

3.4.4 `identityImpact`: preseal ordering, appointment expiry, stale review ו־CAS validity יכולים להשתנות בין implementations.

3.4.5 `requiredRequirementDelta`: להגדיר canonical timestamp, trusted clock observation, comparison semantics ו־expiry interval policy.

3.4.6 `closurePredicate`: boundary/skew/rollback vectors מחזירים אותו state; clock Unknown אינו עובר preseal, authority או Freshness predicate.

3.4.7 `sourceIds=INTAKE-E004,INTAKE-E005,TRD2-REQ-007,TRD2-REQ-061`.

## 3.5 `MPRR-MATH-HR-F019` — CAS חסר Idempotency/linearization record מלא

3.5.1 `severity=P1`.

3.5.2 `subjectLocator=§7.4 MPRR-030`.

3.5.3 `defect`: expected head/readback נדרשים, אך אין operation ID, idempotency key, authority epoch, single-use state, fencing token, write sequence או מיפוי מלא של timeout-before/after-commit.

3.5.4 `identityImpact`: Retry לאחר lost response יכול ליצור שתי Envelopes או לקרוא Head תקין שנכתב בידי Operation אחר.

3.5.5 `requiredRequirementDelta`: להגדיר CAS request/result/receipt schemas, linearization point, idempotent replay, fencing ו־authoritative readback tied to operation identity.

3.5.6 `closurePredicate`: duplicate/replay/lost-response/interleaving vectors מתכנסים ל־Envelope אחד של ה־Operation או `ACCEPTANCE-CONFLICT`; Head match לבדו אינו proof.

3.5.7 `sourceIds=TRD2-REQ-013,TRD2-REQ-060,BCA2-REQ-044`.

## 3.6 `MPRR-MATH-HR-F020` — Freshness חסר asOf, validThrough ו־Current-root predicate

3.6.1 `severity=P1`.

3.6.2 `subjectLocator=§7.5 MPRR-031`.

3.6.3 `defect`: רשימת mutation triggers אינה מגדירה Snapshot identity, asOf/validThrough, current root lookup או distinction בין stale, superseded, revoked ו־historical.

3.6.4 `identityImpact`: Receipt ישן יכול להישאר “current” עד אירוע מפורש גם אחרי Expiry או Head change שלא נרשם נכון.

3.6.5 `requiredRequirementDelta`: להגדיר `Fresh(object,t)` מעל exact dependency roots, current heads, validity interval ו־invalidation ledger.

3.6.6 `closurePredicate`: Expiry/root/head/appointment/tool/schema changes מסמנים descendants stale; ללא fresh successor Current result הוא `unknown/unavailable`, לא historical fallback.

3.6.7 `sourceIds=INTAKE-E011,INTAKE-E012,TRD2-REQ-061`.

## 3.7 `MPRR-MATH-HR-F021` — Two-generation proof אינו מחייב Delta מבוקר

3.7.1 `severity=P1`.

3.7.2 `subjectLocator=§8.3 MPRR-034;§8.4 MPRR-035`.

3.7.3 `defect`: שני דורות יכולים להיות Replay של אותו Input או שני Happy paths; אין requirement ל־distinct subject roots, controlled mutation, stale receipt rejection, invalidation set ו־recovery after failure.

3.7.4 `proofImpact`: שתי הרצות זהות אינן מוכיחות successor, stale-head או non-transfer semantics.

3.7.5 `requiredRequirementDelta`: להגדיר Generation A, controlled Delta, Generation B, expected affected set, stale A receipt attack ו־B recovery/readback proof.

3.7.6 `closurePredicate`: roots שונים עקב Delta ידוע; A receipts אינם תקפים ל־B; stale-A CAS נכשל; B replay offline משחזר את כל roots/terminals.

3.7.7 `sourceIds=BCA2-REQ-045,TRD2-REQ-064`.

## 3.8 `MPRR-MATH-HR-F022` — אין Matrix שמוכיחה Semantic closure של 12 Intake defects

3.8.1 `severity=P1`.

3.8.2 `subjectLocator=§1.2 Requirement-row contract; כל sourceIds`.

3.8.3 `defect`: כל 12 IDs מופיעים, אך אין Forward/Inverse closure matrix מ־Intake defect ל־Requirement(s), Definition field, negative vector ו־safe terminal; `INTAKE-E001` בפרט ממופה ל־Rule שאינו סוגר Authority.

3.8.4 `proofImpact`: Direct mention יכול להעניק 12/12 coverage גם כאשר התיקון שגוי או חלקי.

3.8.5 `requiredRequirementDelta`: להגדיר detached Coverage manifest עם כל 12 IDs, exact requirements, semantics addressed, conformance vectors, residual risk ו־status.

3.8.6 `closurePredicate`: Direct identity coverage=12/12 וגם semantic predicate coverage=12/12; כל residual partial נשאר blocking ואינו נספר Closed.

3.8.7 `sourceIds=INTAKE-E001,INTAKE-E002,INTAKE-E003,INTAKE-E004,INTAKE-E005,INTAKE-E006,INTAKE-E007,INTAKE-E008,INTAKE-E009,INTAKE-E010,INTAKE-E011,INTAKE-E012`.

# 4. Sufficiency matrix מול `INTAKE-E001`–`INTAKE-E012`

## 4.1 סטטוסים

4.1.1 `FULL` פירושו שה־Requirement Candidate מחייב את כל ליבת התיקון וה־safe terminal.

4.1.2 `PARTIAL` פירושו שקיימת Direct identity ודרישה רלוונטית, אך Finding בפרקים 2–3 משאיר דרך לעקוף את התיקון.

## 4.2 מטריצה

4.2.1 `INTAKE-E001=PARTIAL`: predecessor/scope קיימים; external Protocol-use authority ו־bootstrap לא נסגרו.

4.2.2 `INTAKE-E002=FULL`: `failureBoundary` מפורש, typed ואינו נגזר מ־prose לפי MPRR-013.

4.2.3 `INTAKE-E003=PARTIAL`: prose מופרד, אך author/authority של canonical predicates חסר.

4.2.4 `INTAKE-E004=PARTIAL`: types/framing/alias קיימים, אך serialization composition, self-root ו־set ordering פתוחים.

4.2.5 `INTAKE-E005=PARTIAL`: 18-field Envelope נדרש, אך `envelopeRoot`, non-retroactivity ו־coverage exclusions פתוחים.

4.2.6 `INTAKE-E006=PARTIAL`: lossless schema נדרש, אך field/cardinality/extension registry והשלמת מידע חסר אינם סגורים.

4.2.7 `INTAKE-E007=PARTIAL`: semantic projection ושני Normalizers קיימים, אך independence, predicate authority ו־byte-equality פתוחים.

4.2.8 `INTAKE-E008=PARTIAL`: Macro נכשל, אך אין authorized re-observation/concrete replacement path ללא invention.

4.2.9 `INTAKE-E009=PARTIAL`: mapping נדרש, אך edge direction/authority ו־legacy preservation אינם סגורים.

4.2.10 `INTAKE-E010=PARTIAL`: namespace tuple קיים, אך raw/normalized Manifest identity נשארת דו־משמעית.

4.2.11 `INTAKE-E011=PARTIAL`: SourceFreeze נדרש, אך canonical membership ו־retroactive reviewer knowledge אינם סגורים.

4.2.12 `INTAKE-E012=PARTIAL`: successor/source roots נדרשים, אך Protocol eligibility/bootstrap נשארים מעגליים.

4.2.13 סיכום=`FULL=1`; `PARTIAL=11`; `ABSENT=0`; `TOTAL=12`.

# 5. QA של 35 Requirement rows

## 5.1 Field ו־ID coverage

5.1.1 מזהים=`MPRR-001`–`MPRR-035` בדיוק; missing=`0`; duplicate=`0`.

5.1.2 `rule=35`; ‏`causeAndEffect=35`; ‏`sourceIds=35`; ‏`acceptancePredicate=35`; ‏`dependencies=35`.

5.1.3 Direct Intake identity set הוא בדיוק `INTAKE-E001`–`INTAKE-E012`.

## 5.2 Dependency graph

5.2.1 parsed edges=`129`; unknown target=`0`; self-edge=`0`; duplicate dependency row=`0`; cycles=`0`.

5.2.2 MPRR-034 תלוי ב־MPRR-001–MPRR-033; MPRR-035 תלוי ב־MPRR-001–MPRR-034. מבנה זה מכני תקין אך אינו פותר את Bootstrap של F001.

# 6. Adversarial vectors מחייבים ל־Successor

## 6.1 Identity ו־Serialization

6.1.1 Envelope שמנסה לכלול את Root של עצמו נכשל.

6.1.2 אותו Set בשתי Permutations מפיק Bytes זהים; ordered list אינו מתיישר אוטומטית.

6.1.3 JCS(JSON), framed-JCS ו־direct-binary variants אינם כולם תקפים; רק Pipeline אחד עובר.

6.1.4 equal full digest עם unequal key bytes מגיע `FULL-DIGEST-COLLISION-BLOCKED`.

## 6.2 Local ו־Semantic identity

6.2.1 Legacy observation אינו מקבל Review eligibility דרך Envelope שנוצר בדיעבד.

6.2.2 Normalizer אינו רשאי להמציא failureBoundary או canonical predicate מן prose.

6.2.3 Normalized record successor אינו משנה LegacyLocalKey.

6.2.4 Shared code/dependency בין Normalizers מבטל independence receipt.

## 6.3 Union ו־Comparison

6.3.1 Local record ineligible נשמר ב־Blocked partition ואינו מקבל Semantic ID.

6.3.2 Alias אינו מוסיף Local או Semantic cardinality.

6.3.3 Missing Review domain אינו מתפרש כ־“Reviewer found no defect”.

6.3.4 n-way Comparison מייצר אותו Assertion set ללא תלות בסדר participants.

6.3.5 Identity-changing resolution יוצר Semantic successor ולא משנה ID קיים.

## 6.4 CAS, Freshness ושני דורות

6.4.1 Timeout לפני/אחרי linearization ו־duplicate retry מתכנסים ל־Envelope אחד או Conflict.

6.4.2 Change ב־Schema/Normalizer/Appointment/Subject invalidates בדיוק את descendants הצפויים.

6.4.3 Generation B כולל controlled Delta; Receipt של A אינו תקף ל־B; Replay identical בלבד אינו two-generation proof.

# 7. תנאי סגירת הביקורת

## 7.1 תנאים בינריים

7.1.1 כל 22 Findings נשמרים עצמאיים; תיקון משותף אינו Merge ואינו Closure משותף.

7.1.2 Successor Requirement Candidate חייב להשיג semantic sufficiency=`12/12 FULL` מול Intake matrix, לא רק Direct mention.

7.1.3 Successor חייב לשמור `35/35` או להצהיר denominator חדש מפורש, עם field completeness ו־Dependency graph תקינים.

7.1.4 שני Parsers, שני Normalizers, שני Comparators ושני Graph engines בלתי תלויים חייבים להסכים על כל Valid/Invalid vector לאחר Independence proof.

7.1.5 Review זה אינו מקבל Protocol, אינו מאשר Normalization של 73 Legacy observations ואינו מאפשר Comparison/Reconciliation/CAS אמיתי.

# 8. Safe disposition

## 8.1 מצב נוכחי

8.1.1 `reviewResult=REJECT` עבור Subject SHA שב־1.1.4.

8.1.2 `findingCount=22`; ‏`P0=14`; ‏`P1=8`; ‏`P2=0`; ‏`P3=0`.

8.1.3 `directIntakeCoverage=12/12`; ‏`semanticSufficiency=1/12 FULL`; אין Closure credit.

8.1.4 `formalReviewEnvelopeEligible=0/3`; ‏`protocolCompliantSemanticDigests=0/73`; ‏`semanticFindingDenominator=unknown/unavailable`.

8.1.5 Comparison, Reconciliation, Closure, Protocol Acceptance ו־Gate credit נשארים חסומים.

8.1.6 `Gate29=BLOCKED`; `development freeze=ACTIVE`; Product percentage, remaining hours, critical path ו־ETA=`unknown/unavailable`.
