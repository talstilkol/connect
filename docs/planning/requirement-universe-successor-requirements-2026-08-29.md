# 1. Connect — Requirements for the Requirement-Universe Successor

1.1 תאריך: `2026-08-29`.

1.2 Artifact ID: `CONNECT-REQUIREMENT-UNIVERSE-SUCCESSOR-REQUIREMENTS-2026-08-29`.

1.3 סטטוס: `TRD-SUCCESSOR-REQUIREMENTS-CANDIDATE; PLANNING-ONLY; NOT-INDEPENDENTLY-REVIEWED; NOT-ACCEPTED`.

1.4 מקור הביקורת: `/Users/tal/Documents/connect/web/docs/planning/product-specification-traceability-adversarial-audit-2026-08-29.md`; SHA-256=`a3451b91db1811e0ff6bdb19b6d519bfd4ecf2c5c17c734a3a5bad0f4c125717`.

1.5 מסמך זה מגדיר Requirements למחליף של `product-specification-traceability.md`. הוא אינו מחלץ עדיין את כלל דרישות המוצר, אינו עונה על שאלות פתוחות ואינו יוצר Program Stage/Task/Test/Evidence/Gate IDs.

1.6 אין במסמך זה טענת Product implementation, completion, readiness, ETA או אחוז. אין בו Fake, Mock, Demo או Sample business data.

1.7 לא שונו Product Code, ‏Git, ‏Build, ‏Runtime, ‏Deploy, ‏Provider, חשבון, Credentials או מקור אפיון.

# 2. גבול סמכות וכרונולוגיה

2.1 `TRD-A` הוא קבלת מסמך Requirements זה לפי exact digest.

2.2 לפני `TRD-A=ACCEPTED` מותר לבצע Review ותיקוני Planning למסמך זה בלבד; אסור להפיק Requirement universe קנוני או Program IDs.

2.3 לאחר `TRD-A`, אך לפני קבלת Requirement/Decision Candidate, מותר להפיק Source, Span, Statement, Question, Decision, Conflict, Requirement ו־Applicability records בלבד.

2.4 Program Stage/Task/Test/Evidence/Gate IDs מותרים רק לאחר Candidate נפרד של Requirement/Decision universe שעבר QA, שני Reviews וקבלה לפי exact root.

2.5 Product development נשאר כפוף ל־Master/Gate29 ואינו מורשה על ידי מסמך זה.

# 3. תחביר נורמטיבי

3.1 `MUST` הוא תנאי הכרחי לקבלת Successor.

3.2 `MUST NOT` הוא מצב שגורם Fail-closed.

3.3 `unknown/unavailable` הוא ערך חוקי רק כאשר מצורפים reason, source observation ו־safe state; הוא אינו Placeholder להשלמה מדומיינת.

3.4 כל Requirement במסמך זה משתמש ב־ID מסוג `SREQ-*`. אלה Requirements של תהליך התכנון בלבד, לא Product Requirement IDs מסוג `REQ-*` ולא Program Task IDs.

3.5 לכל SREQ קיימים בדיוק: `requirementId`, ‏`sourceFindingIds`, ‏`requirement`, ‏`acceptancePredicate`, ‏`dependencies`.

# 4. חוזי ליבה וזהות

## 4.1 SREQ-001 — גבול ה־Successor

4.1.1 requirementId=`SREQ-001`.

4.1.2 sourceFindingIds=`PSTA-20260829-P0-001;PSTA-20260829-P2-001`.

4.1.3 requirement=ה־Successor MUST להיות Source of truth חדש ונפרד; `product-specification-traceability.md` נשאר Historical category view ואינו נכתב מחדש בדיעבד.

4.1.4 acceptancePredicate=Candidate מציין predecessor digest, אינו משתמש ב־27 SPEC כמכנה, וכל consumer קנוני מצביע רק ל־accepted successor root.

4.1.5 dependencies=`none`.

## 4.2 SREQ-002 — Common record envelope

4.2.1 requirementId=`SREQ-002`.

4.2.2 sourceFindingIds=`PSTA-20260829-P2-004;PSTA-20260829-P3-001`.

4.2.3 requirement=כל record MUST לכלול `schemaVersion,recordType,recordId,generationId,identityDigest,semanticDigest,status,predecessorRecordIds,sourceRootDigest,producerId,producedAt`. Digests הם lowercase 64-hex; arrays קיימים תמיד, ייחודיים ובסדר קנוני; timestamps הם RFC3339 UTC; keys שאינם ב־schema אסורים. ערך שאינו ידוע משתמש ב־`UnknownValue={state:unknown|unavailable,reason,sourceObservationIds,observedAt,safeState}` ולא בהשמטה, string ריק או placeholder.

4.2.4 acceptancePredicate=Schema validator דוחה שדה חסר, key לא מוכר, enum לא מוכר, digest באורך שגוי, predecessor לא פתיר או timestamp לא־RFC3339.

4.2.5 dependencies=`SREQ-001`.

## 4.3 SREQ-003 — Canonical serialization

4.3.1 requirementId=`SREQ-003`.

4.3.2 sourceFindingIds=`PSTA-20260829-P2-004`.

4.3.3 requirement=קלטי identity/semantic digest MUST להיות JSON קנוני: UTF-8, ‏Unicode NFC לערכי Metadata בלבד, keys בסדר lexicographic, ללא whitespace, מספרים כ־integer או decimal string מוגדר, arrays בסדר סמנטי מפורש ו־null מפורש. `identityDigest` מחושב מן ה־identity tuple הייעודי לכל schema; `semanticDigest` כולל את כל שדות התוכן, status, predecessors, generation ו־source root אך מוציא `recordId,identityDigest,semanticDigest,producerId,producedAt`. ‏`producedAt` מגיע מ־Generation bootstrap input קפוא ולא מקריאת clock בכל runner. ‏Raw source bytes לעולם אינם עוברים normalization.

4.3.4 acceptancePredicate=שתי serializations בלתי תלויות של אותו record מפיקות bytes ו־SHA-256 זהים; החלפת key order או whitespace אינה משנה semantic object אך raw-source mutation כן משנה source digest.

4.3.5 dependencies=`SREQ-002`.

## 4.4 SREQ-004 — מזהים דטרמיניסטיים ללא Randomness

4.4.1 requirementId=`SREQ-004`.

4.4.2 sourceFindingIds=`PSTA-20260829-P0-002;PSTA-20260829-P3-001`.

4.4.3 requirement=כל `recordId` חדש MUST להיגזר מ־SHA-256 של identity input קנוני המבוסס על בתים אמיתיים, locator וסוג record. Source-native keys כגון question number או Dxx נשמרים בשדה נפרד ואינם מחליפים `recordId`. אין `Math.random`, UUID אקראי, clock-only ID או סדר תלוי־הרצה. Prefix מקוצר מותר רק עם full digest ו־collision escalation דטרמיניסטי ל־64 hex; collision של full digest עם identity inputs שונים נכשל סגור ודורש hash-algorithm/schema revision.

4.4.4 acceptancePredicate=שתי ריצות על אותם Inputs מפיקות אותם IDs; collision-prefix mutant מוכרח לעבור ל־full digest ולא ל־suffix אקראי.

4.4.5 dependencies=`SREQ-003`.

## 4.5 SREQ-005 — No-merge identity

4.5.1 requirementId=`SREQ-005`.

4.5.2 sourceFindingIds=`PSTA-20260829-P0-002;PSTA-20260829-P3-001`.

4.5.3 requirement=Statement identity MUST לכלול sourceArtifactId+exact locator+raw span digest. טקסט זהה בשני מקומות נשאר שתי רשומות. Equivalent claims נקשרים ב־Relation ואינם מתמזגים לפי title, text או embedding.

4.5.4 acceptancePredicate=Duplicate-text fixture משני locators יוצר שני IDs ו־relation אופציונלי; dedup-by-title/text mutant נכשל.

4.5.5 dependencies=`SREQ-003;SREQ-004`.

## 4.6 SREQ-006 — Source-set root

4.6.1 requirementId=`SREQ-006`.

4.6.2 sourceFindingIds=`PSTA-20260829-P0-001;PSTA-20260829-P2-001`.

4.6.3 requirement=Source-set root MUST להיות Manifest immutable של כל admitted artifact IDs, raw digests, authority classes ו־schema/toolchain roots. הוא MUST NOT לכלול את ה־digest של עצמו, QA, Review, Acceptance או current pointer שמקבלים אותו.

4.6.4 acceptancePredicate=שינוי Byte, source membership או schema root יוצר sourceSetDigest חדש; self-membership scan מחזיר אפס; כל downstream record קשור ל־sourceSetDigest יחיד.

4.6.5 dependencies=`SREQ-002;SREQ-003`.

# 5. Source, line ו־PDF-region locators

## 5.1 SREQ-007 — SourceArtifact schema

5.1.1 requirementId=`SREQ-007`.

5.1.2 sourceFindingIds=`PSTA-20260829-P0-001`.

5.1.3 requirement=`SourceArtifact` MUST לכלול `sourceArtifactId,logicalName,mediaType,rawByteLength,rawSha256,authorityClass,authorityScope,observedPathOrUri,admittedAt,effectiveAt,expiry,supersessionEdges,availabilityState`. שני מקורות A3 המדויקים MUST להיכלל; receipt הוא Evidence ולא Requirement authority. מקור ללא durable bytes נשמר כ־`SourceObservation` עם observation provenance ואינו מקבל exact-root authority/closure credit.

5.1.4 acceptancePredicate=‏TXT digest=`52eb4f838d876ae30ff60dd93b1295a3d57759a08c2929787c07d5c4fcf7bb6b` ו־PDF digest=`48e87c0a5ca6a40cbd3f320f08dfd3ca946c31a6f3409aafbfff6b9642302f6a` נפתרים לבתים המדויקים; `2/2` admitted; החלפת filename ללא digest נכון נכשלת.

5.1.5 dependencies=`SREQ-006`.

## 5.2 SREQ-008 — Exact TXT locator

5.2.1 requirementId=`SREQ-008`.

5.2.2 sourceFindingIds=`PSTA-20260829-P0-004`.

5.2.3 requirement=`TextSpan` MUST לכלול byte range חצי־פתוח 0-based, line/column range 1-based, column unit=`Unicode scalar after strict UTF-8 decode`, line-ending profile, rawSpanSha256, decodedNfcSha256 ו־readingOrder. Byte range הוא הסמכות; line/column הוא navigation view נגזר.

5.2.4 acceptancePredicate=כל locator משחזר raw bytes ואת line span; out-of-range, invalid UTF-8, changed line ending או mismatched span digest נכשל סגור.

5.2.5 dependencies=`SREQ-007`.

## 5.3 SREQ-009 — Exact PDF page-region locator

5.3.1 requirementId=`SREQ-009`.

5.3.2 sourceFindingIds=`PSTA-20260829-P0-004`.

5.3.3 requirement=`PdfRegion` MUST לכלול `pageNumber` 1-based, MediaBox width/height, rotation, coordinateSystem=`PDF-POINTS-BOTTOM-LEFT-UNROTATED`, ‏`xMin,yMin,xMax,yMax` כ־decimal strings, readingOrderIndex, extractionArtifactId, extractionProfileDigest, extractedTextByteRange, visibleTextNfcSha256, regionRenderProfileDigest, regionRenderSha256, pageRenderSha256 ו־visualReviewState.

5.3.4 acceptancePredicate=Page 1–4 בלבד למקור הנוכחי; bbox נמצא בתוך MediaBox ובעל שטח חיובי; overlay מצביע לטקסט הנכון; region/text/render digest mismatch נכשל.

5.3.5 dependencies=`SREQ-007`.

## 5.4 SREQ-010 — PDF visual/text dual verification

5.4.1 requirementId=`SREQ-010`.

5.4.2 sourceFindingIds=`PSTA-20260829-P0-004`.

5.4.3 requirement=PDF statement MUST להיקשר גם ל־region render וגם ל־extracted text span. RTL/Bidi controls נשמרים ב־raw extraction; אין reorder סמנטי אוטומטי. OCR או extraction לבדם אינם מספיקים כאשר render אינו תואם.

5.4.4 acceptancePredicate=4/4 page renders וה־layout extraction ניתנים לשחזור מול receipt; visual reviewer מאשר כל region; Bidi mutation אינו משנה את raw locator בשקט.

5.4.5 dependencies=`SREQ-009`.

## 5.5 SREQ-011 — Source-span coverage ledger

5.5.1 requirementId=`SREQ-011`.

5.5.2 sourceFindingIds=`PSTA-20260829-P0-002;PSTA-20260829-P0-004`.

5.5.3 requirement=כל semantic span MUST להיות מכוסה בדיוק פעם אחת ב־Statement או ב־explicit exclusion record מסוג formatting/empty/nonsemantic-artifact. חפיפה מותרת רק עם relation מנומק; whole-document locator אסור ל־atomic statement.

5.5.4 acceptancePredicate=`zero unclassified semantic spans`, ‏`zero unexplained overlaps`, ‏`zero orphan visible PDF text regions`; whitespace/footer/visual mark exclusions ניתנים לשחזור.

5.5.5 dependencies=`SREQ-008;SREQ-009;SREQ-010`.

## 5.6 SREQ-012 — Source change invalidation

5.6.1 requirementId=`SREQ-012`.

5.6.2 sourceFindingIds=`PSTA-20260829-P2-001`.

5.6.3 requirement=כל source byte, page geometry, extraction profile או admitted membership change MUST לפסול את ה־Generation ולהפעיל re-locator/reclassification; locator לעולם אינו מועתק אוטומטית בין digests.

5.6.4 acceptancePredicate=Single-byte, line-ending, page-rotation ו־bbox mutations משנים Candidate או נכשלים; אין stale locator credit.

5.6.5 dependencies=`SREQ-006;SREQ-008;SREQ-009`.

# 6. Statements, Requirements ושאלות

## 6.1 SREQ-013 — Semantic atomization

6.1.1 requirementId=`SREQ-013`.

6.1.2 sourceFindingIds=`PSTA-20260829-P0-002`.

6.1.3 requirement=כל Statement MUST להכיל claim עצמאי אחד. פיצול מתבצע לפי Actor, Action, Object, Condition, Environment/Scope ו־Acceptance effect; conjunction מפוצל אלא אם הוא invariant אטומי שאינו ניתן לבדיקה בנפרד.

6.1.4 acceptancePredicate=Compound-claim review מחזיר אפס record עם שני effects בלתי תלויים; split שומר את כל locators וה־parent span ללא אובדן טקסט.

6.1.5 dependencies=`SREQ-011`.

## 6.2 SREQ-014 — Statement classification

6.2.1 requirementId=`SREQ-014`.

6.2.2 sourceFindingIds=`PSTA-20260829-P0-008`.

6.2.3 requirement=`statementClass` MUST להיות אחד מ־`must,should,may,question,example,recommendation,future,definition,context,non-requirement`. Class נובע מהמקור ואינו משתנה משום שקיים Implementation או Decision מאוחר.

6.2.4 acceptancePredicate=כל Statement מקבל Class יחיד; quota examples אינם Acceptance values; Question אינו Requirement; Recommendation/Future נשמרים בלי Pilot activation אוטומטי.

6.2.5 dependencies=`SREQ-013`.

## 6.3 SREQ-015 — Statement schema

6.3.1 requirementId=`SREQ-015`.

6.3.2 sourceFindingIds=`PSTA-20260829-P0-002;PSTA-20260829-P0-004`.

6.3.3 requirement=`Statement` MUST לכלול envelope ועוד `sourceSpanIds,statementClass,language,actor,action,object,conditions,scopeHints,acceptanceEffect,sourceModality,normalizedTextDigest,classificationRationale,reviewState`.

6.3.4 acceptancePredicate=Exact-field schema עובר לכל Statement; כל sourceSpan פתיר; actor/action/object חסר נרשם unknown עם reason; classification review נפרד מן producer.

6.3.5 dependencies=`SREQ-002;SREQ-013;SREQ-014`.

## 6.4 SREQ-016 — Requirement admission

6.4.1 requirementId=`SREQ-016`.

6.4.2 sourceFindingIds=`PSTA-20260829-P0-002;PSTA-20260829-P0-008`.

6.4.3 requirement=רק `must|should|may`, או Statement אחר שקודם במפורש על ידי Decision accepted, רשאי ליצור Requirement Candidate. Question, Example, Context או Recommendation אינם promoted בשקט. Equivalent Statements נשארים עצמאיים ומקושרים לאותו Requirement רק לאחר Review relation.

6.4.4 acceptancePredicate=Admission audit מסביר כל Requirement→Statement edge; `zero question/example promotion`; unresolved conflict יוצר Requirement variants ולא union.

6.4.5 dependencies=`SREQ-014;SREQ-015`.

## 6.5 SREQ-017 — Requirement schema

6.5.1 requirementId=`SREQ-017`.

6.5.2 sourceFindingIds=`PSTA-20260829-P0-002;PSTA-20260829-P0-005`.

6.5.3 requirement=`Requirement` MUST לכלול envelope ועוד `statementIds,subjectKey,actor,action,object,conditions,acceptanceEffect,criticality,authorityState,decisionEdgeIds,conflictSetIds,applicabilityRecordIds,safeState,categoryIds,requirementDisposition`. ‏`REQ-*` ID נגזר רק לאחר TRD-A.

6.5.4 acceptancePredicate=כל Requirement עובר exact schema; source statements נשמרים; criticality ואפליקביליות אינן נגזרות מ־implementation; no orphan Requirement.

6.5.5 dependencies=`SREQ-016`.

## 6.6 SREQ-018 — Question universe 1–83

6.6.1 requirementId=`SREQ-018`.

6.6.2 sourceFindingIds=`PSTA-20260829-P0-003`.

6.6.3 requirement=`Question` MUST לכלול `questionId=Q-TXT-001..083,sourceStatementId,sourceNumber,group,priority,subjectKey,status,answerDecisionIds,scope,safeState,resolutionEvidenceIds`. Status enum=`unanswered,answered,superseded,deferred,not-applicable,disputed`.

6.6.4 acceptancePredicate=`83/83` IDs רציפים וייחודיים; text/priority/group תואמים exact lines; answered דורש Decision source; unanswered נשאר unknown/fail-closed.

6.6.5 dependencies=`SREQ-008;SREQ-014;SREQ-015`.

## 6.7 SREQ-019 — עשר החלטות קריטיות מן המקור

6.7.1 requirementId=`SREQ-019`.

6.7.2 sourceFindingIds=`PSTA-20260829-P0-003`.

6.7.3 requirement=עשרת הפריטים ב־TXT §16 MUST להישמר כ־`CriticalDecisionPrompt` records נפרדים המקושרים לשאלות ול־Decision IDs, בלי להניח ש־10 prompts שווים ל־10 Decisions מאוחרים אחד־לאחד.

6.7.4 acceptancePredicate=`10/10` exact prompts קיימים; כל mapping הוא Edge מפורש; many-to-many מותר; zero implied answer.

6.7.5 dependencies=`SREQ-018`.

# 7. Decisions, amendments, conflicts ו־Applicability

## 7.1 SREQ-020 — Decision manifest D01–D31

7.1.1 requirementId=`SREQ-020`.

7.1.2 sourceFindingIds=`PSTA-20260829-P0-007`.

7.1.3 requirement=`Decision` MUST לכלול `decisionId,revisionId,sourceSpanIds,authorityClass,subjectKey,selectedValue,status,scope,effectiveAt,expiry,changeTriggers,predecessorRevisionId,supersededFieldPaths,requiredApprovals,approvalStates,safeState,affectedRequirementIds`. Base coverage target הוא D01–D31 וכל amendments שנמצאו במקור הקפוא.

7.1.4 acceptancePredicate=כל Decision admitted קשור ל־durable bytes; revision אינו משכתב predecessor; selected-for-planning אינו accepted/implemented/ready; exact-subject uniqueness audit עובר.

7.1.5 dependencies=`SREQ-007;SREQ-015`.

## 7.2 SREQ-021 — D31 missing-source handling

7.2.1 requirementId=`SREQ-021`.

7.2.2 sourceFindingIds=`PSTA-20260829-P0-003;PSTA-20260829-P0-007`.

7.2.3 requirement=ה־subject, value ו־source של D31 הם `unknown/unavailable` בביקורת הנוכחית. אם source מדויק אינו admitted, המערכת MUST ליצור QA Finding מסוג `MISSING-DECISION-SOURCE` ולא Decision מזויף, ולא לטעון `31/31` closure.

7.2.4 acceptancePredicate=Missing D31 blocks decision-universe acceptance; אין invented title/value/answer; closure מתאפשר רק באמצעות source bytes או explicit authoritative amendment שמגדיר את המצב.

7.2.5 dependencies=`SREQ-020`.

## 7.3 SREQ-022 — Authority precedence ו־amendments

7.3.1 requirementId=`SREQ-022`.

7.3.2 sourceFindingIds=`PSTA-20260829-P0-007;PSTA-20260829-P1-006`.

7.3.3 requirement=Resolver MUST להשוות claims רק באותו `subject,scope,environment,entity,provider,region,effectiveTime`. Precedence A1–A6 נשמרת; amendment מחליף רק exact field paths שהוסמכו. תאריך מאוחר לבדו אינו authority.

7.3.4 acceptancePredicate=D18-A2 Public, D02/D03/D05/D14/D29/D30-A4 ויתר revisions נשמרים כ־edges; lower authority override mutant נכשל; historical provenance נשאר נגיש.

7.3.5 dependencies=`SREQ-020`.

## 7.4 SREQ-023 — Conflict/variant schema

7.4.1 requirementId=`SREQ-023`.

7.4.2 sourceFindingIds=`PSTA-20260829-P1-005`.

7.4.3 requirement=`ClaimRelation` MUST להשתמש ב־`equivalent,refines,compatible-variant,conflicts,duplicate-text-distinct-occurrence,supersedes-field`. ‏`ConflictSet` MUST לכלול members, smallestConflictingField, scope tuple, resolutionDecisionId, status ו־safeState.

7.4.4 acceptancePredicate=Roles 3-vs-6, Excel-vs-Excel/CSV ו־availability 99.5%-vs-TBD מקבלים relation מפורש; `zero silent union`; unresolved numeric conflict נשאר blocked.

7.4.5 dependencies=`SREQ-015;SREQ-020;SREQ-022`.

## 7.5 SREQ-024 — Supersession ללא מחיקת Provenance

7.5.1 requirementId=`SREQ-024`.

7.5.2 sourceFindingIds=`PSTA-20260829-P0-007;PSTA-20260829-P1-006`.

7.5.3 requirement=Supersession MUST להיות directioned, field-scoped, versioned ו־time/scoped. Predecessor bytes/status אינם משתנים; active view נגזר מן graph.

7.5.4 acceptancePredicate=Replaying all revisions reconstructs every historical active view; whole-record overwrite ללא exact authority נכשל.

7.5.5 dependencies=`SREQ-022;SREQ-023`.

## 7.6 SREQ-025 — ScopeProfile ו־Applicability

7.6.1 requirementId=`SREQ-025`.

7.6.2 sourceFindingIds=`PSTA-20260829-P0-007;PSTA-20260829-P0-008`.

7.6.3 requirement=`ScopeProfile` MUST להיות Registry versioned. לכל Requirement×ScopeProfile יהיה `Applicability` אחד מתוך `in-scope,out-of-scope,deferred,conditional,not-applicable,unknown`, עם decision source, effective window, condition ו־safe state. Pilot/Post-Pilot אינם prose labels.

7.6.4 acceptancePredicate=D21/D23/D24/D25/D22 ו־D29/D30-A4 מפיקים Scope-specific results בלי למחוק target architecture; post-Pilot mutant בתוך Pilot נכשל.

7.6.5 dependencies=`SREQ-017;SREQ-020;SREQ-022`.

## 7.7 SREQ-026 — Safe-state contract

7.7.1 requirementId=`SREQ-026`.

7.7.2 sourceFindingIds=`PSTA-20260829-P0-003;PSTA-20260829-P0-007`.

7.7.3 requirement=כל unanswered, disputed, expired, external-blocked, source-unavailable או unresolved conflict record MUST להגדיר typed safe state. Safe state לעולם אינו capability enablement; הוא יכול להיות OFF, Human-only, Manual-review או No-change לפי Decision מאושר.

7.7.4 acceptancePredicate=Missing safeState נכשל; D02-A4 maps AI-OFF, D03-A4 Checkout-OFF, D05/D14-A4 Uploads-OFF, D29/D30-A4 conditional capabilities OFF בלי readiness credit.

7.7.5 dependencies=`SREQ-018;SREQ-020;SREQ-023;SREQ-025`.

# 8. Status, Evidence, Categories ו־Trace graph

## 8.1 SREQ-027 — Orthogonal status axes

8.1.1 requirementId=`SREQ-027`.

8.1.2 sourceFindingIds=`PSTA-20260829-P0-006;PSTA-20260829-P1-007`.

8.1.3 requirement=כל Requirement MUST לשמור בנפרד: `requirementDisposition={admitted,rejected,disputed,superseded}`, ‏`scopeApplicability={in-scope,out-of-scope,deferred,conditional,not-applicable,unknown}`, ‏`implementationState={not-started,in-progress,implemented,not-applicable,unknown}`, ‏`verificationState={unverified,passed,failed,expired,not-applicable}`, ‏`externalReadiness={not-required,blocked,configured-unverified,verified,expired,unknown}`, ‏`approvalState={not-required,pending,approved,rejected,expired,unknown}`. Parent status נגזר מילדים; compound prose status אסור.

8.1.4 acceptancePredicate=Schema/transition table דוחים unknown enum ומעבר לא חוקי; implemented-but-unverified, out-of-pilot ו־provider-blocked מקבלים מצבים שונים.

8.1.5 dependencies=`SREQ-017;SREQ-025`.

## 8.2 SREQ-028 — Evidence ו־local-complete

8.2.1 requirementId=`SREQ-028`.

8.2.2 sourceFindingIds=`PSTA-20260829-P0-006;PSTA-20260829-P1-006;PSTA-20260829-P3-002`.

8.2.3 requirement=`EvidenceClaim` MUST לכלול `evidenceId,claimType,subjectRequirementId,repoRoot,gitHeadOrArtifactDigest,environment,producer,observedAt,expiresAt,inputDigests,outputDigest,testId,result,reviewState`. ‏`local-complete` מותר רק כ־derived view כאשר כל child in-scope נסגר ב־Evidence תקף.

8.2.4 acceptancePredicate=‏13 ה־legacy claims מקבלים `unverified-local-claim` עד Evidence audit; wrong HEAD/environment, expired result או missing child מורידים Parent closure אוטומטית.

8.2.5 dependencies=`SREQ-027`.

## 8.3 SREQ-029 — Category IDs אינם Requirement IDs

8.3.1 requirementId=`SREQ-029`.

8.3.2 sourceFindingIds=`PSTA-20260829-P0-002;PSTA-20260829-P3-001`.

8.3.3 requirement=‏SPEC-01–27 MUST לעבור ל־`SPEC-CAT-*` historical navigation records. Category composition הוא רשימת child Requirement IDs עם composition digest; Category אינו מקבל closure עצמאי.

8.3.4 acceptancePredicate=Child-set mutation משנה composition digest; category-to-requirement confusion mutant נכשל; provenance ל־legacy row נשמר.

8.3.5 dependencies=`SREQ-017`.

## 8.4 SREQ-030 — Trace node registry

8.4.1 requirementId=`SREQ-030`.

8.4.2 sourceFindingIds=`PSTA-20260829-P0-005`.

8.4.3 requirement=Node types MUST להיות Registry versioned לפחות עבור `source,span,statement,question,critical-decision-prompt,decision,relation,conflict,requirement,category,scope,external-wait,stage,task,test,evidence,gate`.

8.4.4 acceptancePredicate=כל edge endpoint פותר ל־type מותר; unknown type/dangling node נכשל; Program node types נשארים ללא instances עד SREQ-033.

8.4.5 dependencies=`SREQ-002`.

## 8.5 SREQ-031 — Forward edge schema

8.5.1 requirementId=`SREQ-031`.

8.5.2 sourceFindingIds=`PSTA-20260829-P0-005`.

8.5.3 requirement=`TraceEdge` MUST לכלול deterministic edgeId, fromId/type, toId/type, relationType, scopeProfileId, generationId, authority, rationale, status ו־sourceRoot. Relations MUST לכלול `contains,classifies,derives,asks,answers,constrains,resolves,applies-to,implemented-by,verified-by,proves,blocks,authorized-by`.

8.5.4 acceptancePredicate=כל admitted in-scope Requirement מגיע ל־Disposition; לאחר Program phase הוא מגיע ל־Task→Test→Evidence→Gate או typed ExternalWait; edge direction mutation נכשל.

8.5.5 dependencies=`SREQ-017;SREQ-020;SREQ-025;SREQ-030`.

## 8.6 SREQ-032 — Inverse coverage ו־Graph integrity

8.6.1 requirementId=`SREQ-032`.

8.6.2 sourceFindingIds=`PSTA-20260829-P0-005;PSTA-20260829-P2-004`.

8.6.3 requirement=Inverse view MUST להיגזר מאותם edges, לא להישמר כגרף ידני שני. כל Program Task/Test/Evidence/Gate עתידי MUST לחזור ל־Requirement/Decision/Control authority. Execution/supersession subgraphs MUST להיות acyclic.

8.6.4 acceptancePredicate=`zero inverse orphan,zero dangling,zero self-edge,zero forbidden cycle,zero duplicate edge`; שני כיווני traversal מחזירים אותו edge set.

8.6.5 dependencies=`SREQ-031`.

## 8.7 SREQ-033 — Embargo על Program IDs

8.7.1 requirementId=`SREQ-033`.

8.7.2 sourceFindingIds=`PSTA-20260829-P0-005;PSTA-20260829-P2-002`.

8.7.3 requirement=לפני `TRD-A=ACCEPTED` ו־Requirement/Decision Candidate accepted, המערכת MUST NOT materialize Stage/Task/Test/Evidence/Gate IDs או שעות. Schema definitions מותרות; instances, denominators, ETA ו־completion אסורים.

8.7.4 acceptancePredicate=Pre-acceptance output scan מחזיר zero Program instances; ניסיון ליצור Task מוקדם נכשל עם typed `PRECONDITION-NOT-ACCEPTED`.

8.7.5 dependencies=`SREQ-001;SREQ-017;SREQ-020;SREQ-032`.

# 9. Coverage, Algorithm ו־QA

## 9.1 SREQ-034 — כיסוי כל משפחות המקור

9.1.1 requirementId=`SREQ-034`.

9.1.2 sourceFindingIds=`PSTA-20260829-P1-001;PSTA-20260829-P1-002;PSTA-20260829-P1-003;PSTA-20260829-P1-004`.

9.1.3 requirement=Normalization MUST לעבור על כל אזורי TXT/PDF, לרבות Roles, purchase/onboarding/admin, dashboards/Meta, contacts/templates/campaigns/scheduler/inbox, Bot/AI/knowledge/safety, reports/billing/security/privacy, entities/architecture/performance, questions, roadmap ו־critical decisions. אין Feature family whitelist מצומצם ל־27 SPEC.

9.1.4 acceptancePredicate=Source-span ledger מכסה כל semantic region; כל משפחה מקבלת statements ו־classification; absence מתועד כ־zero genuine statements ולא כהשמטה.

9.1.5 dependencies=`SREQ-011;SREQ-015`.

## 9.2 SREQ-035 — אלגוריתם נרמול מחייב

9.2.1 requirementId=`SREQ-035`.

9.2.2 sourceFindingIds=`PSTA-20260829-P0-001;PSTA-20260829-P0-002;PSTA-20260829-P0-003;PSTA-20260829-P0-004;PSTA-20260829-P0-005;PSTA-20260829-P0-007;PSTA-20260829-P0-008`.

9.2.3 requirement=האלגוריתם MUST לרוץ בסדר יחיד: `A01 admit/freeze sources → A02 build byte/page indexes → A03 inventory visible spans → A04 segment atomic statements → A05 classify/review → A06 materialize Q001–Q083 and critical prompts → A07 materialize D01–D31+amendments or missing-source findings → A08 reconcile relations/conflicts/precedence → A09 admit Requirements → A10 compute scope/applicability/safe states → A11 build non-Program trace graph → A12 run QA/mutations → A13 freeze Candidate → A14 detached reviews/acceptance`. אין דילוג או backward mutation.

9.2.4 acceptancePredicate=Run ledger מוכיח A01–A14 פעם אחת ובסדר; output digest של כל שלב הוא input לשלב הבא; failure עוצר ואין partial promotion.

9.2.5 dependencies=`SREQ-006;SREQ-011;SREQ-016;SREQ-018;SREQ-020;SREQ-023;SREQ-025;SREQ-032;SREQ-033;SREQ-034`.

## 9.3 SREQ-036 — Completeness QA

9.3.1 requirementId=`SREQ-036`.

9.3.2 sourceFindingIds=`PSTA-20260829-P0-001;PSTA-20260829-P0-002;PSTA-20260829-P0-003;PSTA-20260829-P0-004;PSTA-20260829-P0-005;PSTA-20260829-P2-003;PSTA-20260829-P2-004`.

9.3.3 requirement=QA MUST למדוד ממכנים נגזרים: `2/2 source roots`, all semantic spans classified, `83/83 questions`, `10/10 critical prompts`, D01–D31 coverage status, all amendments discovered בתוך ה־accepted Source Manifest, exact locators, all conflicts dispositioned, forward coverage 100% לפי scope, inverse orphans 0 ו־all schemas valid.

9.3.4 acceptancePredicate=QA receipt מפרסם numerator/denominator/member IDs/digests לכל בדיקה; denominator unknown חוסם pass; prose-only PASS אסור.

9.3.5 dependencies=`SREQ-035`.

## 9.4 SREQ-037 — Negative QA

9.4.1 requirementId=`SREQ-037`.

9.4.2 sourceFindingIds=`PSTA-20260829-P2-003;PSTA-20260829-P2-004`.

9.4.3 requirement=Negative suite MUST לדחות לפחות: wrong/missing source digest, out-of-range line/bbox, wrong render/text digest, missing/duplicate Q, Question/Example promotion, silent source union, lower-precedence override, expired Decision, missing safe state, post-Pilot→Pilot leakage, local-complete ללא Evidence, wrong HEAD/environment, dangling/self/cycle edge, duplicate ID, stale Candidate ו־self-member root.

9.4.4 acceptancePredicate=כל Case בעל deterministic ID, exact expected error ו־actual terminal; כל המקרים נכשלים סגור; unknown error או unexpected pass חוסמים.

9.4.5 dependencies=`SREQ-036`.

## 9.5 SREQ-038 — Mutation QA

9.5.1 requirementId=`SREQ-038`.

9.5.2 sourceFindingIds=`PSTA-20260829-P2-004`.

9.5.3 requirement=Mutation suite MUST ליצור copies דטרמיניסטיים של Candidate אמיתי ולשנות כל פעם שדה אחד: source byte, locator, bbox, class, question status, Decision value/predecessor, scope, conflict resolution, child membership, evidence digest או edge direction. אין business/sample data.

9.5.4 acceptancePredicate=Mutation score=`killed required mutants / required mutants = 100%`; surviving mutant חוסם; mutant bytes, expected validator ו־result digest נשמרים.

9.5.5 dependencies=`SREQ-003;SREQ-037`.

# 10. Lifecycle, outputs ו־Acceptance

## 10.1 SREQ-039 — Reproducibility ו־independent review

10.1.1 requirementId=`SREQ-039`.

10.1.2 sourceFindingIds=`PSTA-20260829-P0-002;PSTA-20260829-P2-001`.

10.1.3 requirement=שני runners/reviewers בלתי תלויים MUST לעבוד על אותו immutable Candidate. Machine counts/digests חייבים להיות זהים; semantic disagreements נשמרים כ־Review finding ולא מוכרעים אוטומטית.

10.1.4 acceptancePredicate=שני QA receipts קושרים אותו candidateDigest; counts/IDs/digests זהים; reviewer independence ואי־שינוי Candidate מוכחים.

10.1.5 dependencies=`SREQ-035;SREQ-036;SREQ-037;SREQ-038`.

## 10.2 SREQ-040 — Detached multi-generation lifecycle

10.2.1 requirementId=`SREQ-040`.

10.2.2 sourceFindingIds=`PSTA-20260829-P2-001`.

10.2.3 requirement=Lifecycle MUST להיות `Bootstrap Bn → immutable Candidate Cn → detached QA Qn → independent Reviews Rn.1/Rn.2 → Acceptance Manifest Mn → exact human acceptance → external CAS current pointer`. ‏Q/R/M/signature/pointer אינם ancestors או members של Cn.

10.2.4 acceptancePredicate=שתי Generations מלאות עוברות בלי post-freeze edit; candidate byte mutation יוצר Generation חדשה; self/ancestor/member scan מחזיר אפס.

10.2.5 dependencies=`SREQ-006;SREQ-039`.

## 10.3 SREQ-041 — Output artifact registry ו־derived views

10.3.1 requirementId=`SREQ-041`.

10.3.2 sourceFindingIds=`PSTA-20260829-P2-002;PSTA-20260829-P2-004;PSTA-20260829-P3-002`.

10.3.3 requirement=Future output registry MUST למנות `source-manifest,span-manifest,statement-manifest,question-manifest,critical-prompt-manifest,decision-manifest,relation-conflict-manifest,requirement-manifest,applicability-manifest,trace-edge-manifest,JSON Schemas,QA receipts,review receipts,acceptance manifest`. כל JSON Schema MUST להגדיר type, pattern, enum, required fields, cardinality, additionalProperties=false ו־cross-record invariants. Markdown/HTML הם views נגזרים; אין free-form completion prose כמקור אמת.

10.3.4 acceptancePredicate=כל output בעל producer,input digests,output digest,schema,retention ו־acceptance; view regeneration זהה; שינוי ידני ב־view אינו משנה canonical data.

10.3.5 dependencies=`SREQ-002;SREQ-035;SREQ-040`.

## 10.4 SREQ-042 — Unknown/no-fake/acceptance gate

10.4.1 requirementId=`SREQ-042`.

10.4.2 sourceFindingIds=`PSTA-20260829-P0-001;PSTA-20260829-P0-002;PSTA-20260829-P0-003;PSTA-20260829-P0-004;PSTA-20260829-P0-005;PSTA-20260829-P0-006;PSTA-20260829-P0-007;PSTA-20260829-P0-008;PSTA-20260829-P1-006;PSTA-20260829-P2-003`.

10.4.3 requirement=Successor MUST NOT להשלים ערכים, תשובות, Evidence, owners, dates או provider facts באמצעות Fake/Mock/Demo/Sample data. Deterministic protocol mutants מוכיחים validator בלבד. Acceptance מחייב SREQ-001–042, exact Candidate root, QA, Reviews ו־explicit acceptance; אחרת status נשאר BLOCKED.

10.4.4 acceptancePredicate=`42/42` SREQs pass עם member-level evidence; unknown fields כוללים reason+safe state; fake readiness evidence count=0; Program IDs count=0 לפני קבלת Requirement universe.

10.4.5 dependencies=`SREQ-001;SREQ-002;SREQ-003;SREQ-004;SREQ-005;SREQ-006;SREQ-007;SREQ-008;SREQ-009;SREQ-010;SREQ-011;SREQ-012;SREQ-013;SREQ-014;SREQ-015;SREQ-016;SREQ-017;SREQ-018;SREQ-019;SREQ-020;SREQ-021;SREQ-022;SREQ-023;SREQ-024;SREQ-025;SREQ-026;SREQ-027;SREQ-028;SREQ-029;SREQ-030;SREQ-031;SREQ-032;SREQ-033;SREQ-034;SREQ-035;SREQ-036;SREQ-037;SREQ-038;SREQ-039;SREQ-040;SREQ-041`.

# 11. Acceptance summary

11.1 SREQ denominator=`42`; current accepted=`0/42` משום שמסמך זה הוא Candidate producer בלבד.

11.2 Current exact Requirement denominator=`unknown/unavailable`; actual Requirement records created=`0`.

11.3 Current Question records created=`0`; החוזה העתידי דורש `83/83` לאחר TRD-A.

11.4 Current Decision records created על ידי מסמך זה=`0`; D31 subject/source/value נשאר `unknown/unavailable`.

11.5 Current Program Stage/Task/Test/Evidence/Gate IDs created=`0`.

11.6 Earliest next action=`independent hostile review of this exact Candidate; תיקון; exact-root acceptance`. רק לאחר מכן מותר להתחיל A01 של SREQ-035.

11.7 Verdict=`SUFFICIENT-AS-SUCCESSOR-REQUIREMENTS-CANDIDATE; NOT-YET-ACCEPTED; NO-EXTRACTION-OR-PROGRAM-MATERIALIZATION-AUTHORIZED`.
