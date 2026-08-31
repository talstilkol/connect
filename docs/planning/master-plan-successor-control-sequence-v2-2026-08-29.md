# 1. Connect — Master Plan successor control sequence v2

## 1.1 זהות, מצב וגבול טענה

1.1.1 `artifactId=CONNECT-MASTER-PLAN-SUCCESSOR-CONTROL-SEQUENCE-V2-2026-08-29`.

1.1.2 `sequenceVersion=MPSC-2.0-CANDIDATE-G0`.

1.1.3 `artifactClass=PLANNING-CONTROL-SEQUENCE-CANDIDATE; NOT-ACCEPTED; NOT-A-PROGRAM-TASK-REGISTRY`.

1.1.4 מטרת המסמך היא להגדיר רצף סופי, חסר מעגלים ובר־בדיקה מן המנדט החיצוני של טל ועד למסירת Master Plan מדויק שאושר ב־`Gate29`.

1.1.5 המסמך אינו מאשר את עצמו, אינו מקבל Artifact אחר, אינו יוצר Product Task, אינו מעניק שעות או Completion credit ואינו מתיר כתיבת קוד, Build, Test Runtime, Commit, Push, שינוי GitHub, ספק, Credential או Deployment.

1.1.6 כל Status תפעולי נשמר מחוץ ל־Subject זה ב־`PhaseObservation`; לכן מילות מצב במסמך הן דרישות Type ולא תיאור של מצב נוכחי.

1.1.7 `repositoryVisibility=PUBLIC-IS-BINDING`; שינוי ל־Private אינו Route חוקי, אינו Remediation ואינו Compensating control.

1.1.8 אחוז המוצר, שעות המוצר שנותרו, Critical path ו־ETA של המוצר הם `unknown/unavailable` עד לקבלת Program Task registry עם מכנה קביל.

1.1.9 שעות התכנון שנותרו ו־ETA של התכנון הם `unknown/unavailable` עד לקבלת `PlanningWorkRegistry` לפי `PGV2-05`; מספר Phase candidates אינו מכנה שעות ואינו אחוז מוצר.

## 1.2 נושא הביקורת שמוחלף ומקורות התיקון

1.2.1 רצף v1 שנדחה: `/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-2026-08-29.md`, ‏SHA-256=`85af6538252afb0189f2e9dc97184cebafb874d0b2090d9bbc9f7d4c3d8bd970`.

1.2.2 דוח הביקורת העוינת: `/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-hostile-review-2026-08-29.md`, ‏SHA-256=`da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768`.

1.2.3 Manifest הממצאים: `/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-hostile-review-findings-manifest-2026-08-29.md`, ‏SHA-256=`fa0858540ce9f31a73e0e5513c2807379a88012ce472b691dfe2f6c3850ed38d`.

1.2.4 רצף זה נדרש לתת Disposition מפורש לכל `MPSC-HR-F001`–`MPSC-HR-F032`; עצם האזכור אינו Closure.

1.2.5 כל Root נוסף שנזכר כאן הוא Input candidate בלבד, אלא אם Acceptance חיצוני תקף מציין במפורש אחרת.

## 1.3 ארבעה תחומי עבודה שאסור לערבב

1.3.1 `DOMAIN-PLANNING-GENERATION` כולל רק את העבודה שמגדירה, בודקת ומקבלת את ה־Master Plan ואת ה־Program registry שלו.

1.3.2 `DOMAIN-PROGRAM-PLANNING` כולל Product Tasks, Outputs, Tests, Evidence, Gates, Resources, Estimates ו־Schedules המתוכננים לביצוע עתידי; רישום Task אינו ביצועו.

1.3.3 `DOMAIN-EXECUTION` כולל כתיבת קוד, שינוי Data, Build, בדיקות Runtime, התקנה, Release, Migration ו־Rollback; התחום חסום לפני Gate29 והוראת יישום חדשה.

1.3.4 `DOMAIN-EXTERNAL-STATE` כולל Commit, Push, GitHub settings, Provider/API, Secrets, Billing, Meta/WhatsApp, Deployment וכל מערכת מחוץ לקבצי התכנון; התחום חסום ללא Permit ספציפי.

1.3.5 כל Act record חייב למפות ל־Domain אחד בדיוק; `unclassifiedActCount=0` ו־`multiClassifiedActCount=0` הם תנאי קבלה.

1.3.6 `Planning`, ‏`Program planning`, ‏`Execution planning` ו־`Execution` אינם מילים נרדפות; Linter חייב לדחות Alias חופשי ביניהם.

## 1.4 Bootstrap Authority Envelope חיצוני

1.4.1 `B0` הוא Envelope חיצוני, נפרד מכל Subject שנוצר מכוחו, ואינו Phase בתוך הרצף.

1.4.2 שדות החובה של `B0` הם `b0Id`, ‏`mandateReceiptRoot`, ‏`mandateTextDigest`, ‏`authorityOwner=Tal`, ‏`policyVersion`, ‏`sourceFreezeRoot`, ‏`actorAppointmentRoot`, ‏`bootstrapReviewProtocolRoot`, ‏`allowedActTypes`, ‏`allowedSubjectClasses`, ‏`notBefore`, ‏`validThrough`, ‏`revocationPointer`, ‏`issuedAt`, ‏`issuerReceipt`.

1.4.3 `B0` רשאי להסמיך רק את Control-sequence successor עצמו ואת Recovery, Input freeze, Raw custody, Bootstrap lifecycle successor ו־Review protocol successor; הוא אינו מסמיך Master Acceptance, Product work או External-state mutation.

1.4.4 `B0` ופעולות יצירתו אינם Member, Descendant או Hash input של Subject שמבקש ממנו סמכות; כל `selfAuthorityEdge` חוסם.

1.4.5 `B0` חסר, עמום, פג, מבוטל או שאינו קושר את Root הנכון מחזיר `BLOCKED-NO-BOOTSTRAP-AUTHORITY`.

1.4.6 Root ממשי של `B0` הוא `unknown/unavailable` עד יצירת Envelope חיצוני וביקורת exact-root; אין להסיק אותו מהאישור הכללי להמשך.

## 1.5 Bootstrap Review Protocol מוגבל

1.5.1 `BootstrapReviewProtocol` הוא Protocol חיצוני וקפוא המשמש רק לקבלת Control-sequence successor זה ולשלבים `PGV2-00`–`PGV2-04`; הוא אינו קביל לשום Subject מאוחר יותר.

1.5.2 הוא מחייב Subject freeze, Evidence root, Producer QA, Reviewer בלתי תלוי אחד לפחות, Findings manifest, Disposition, exact-root Tal approval ו־protected pointer readback.

1.5.3 לאחר קבלת `PGV2-04`, כל Subject חדש מ־`PGV2-05` ואילך משתמש רק ב־Review Protocol accepted של `PGV2-04`; שימוש רטרואקטיבי בו לקבלת `PGV2-03` או `PGV2-04` אסור.

1.5.4 `undefinedReviewAuthorityCount=0` ו־`reviewAuthorityCycleCount=0` הם תנאי קבלה של הרצף.

# 2. חוזים משותפים לכל Phase

## 2.1 Phase Definition record

2.1.1 לכל Phase יש `phaseId`, ‏`definitionVersion`, ‏`domain`, ‏`objective`, ‏`predecessorEdges`, ‏`requiredInputTypes`, ‏`requiredOutputTypes`, ‏`exitPredicateId`, ‏`failureTerminalSet`, ‏`reworkRouteTableId` ו־`successorSet`.

2.1.2 `PhaseDefinition` הוא Immutable Subject; מצב ריצה, זמן, Actor ותוצאות אינם חלק ממנו.

2.1.3 כל Edge קושר `fromPhaseId`, ‏`fromOutputType`, ‏`requiredState`, ‏`toPhaseId`, ‏`joinId`, ‏`conditionRecordId` ו־`edgeType`.

2.1.4 `edgeType` הוא אחד בלבד: `HARD`, ‏`CONDITIONAL`, ‏`PARALLEL-JOIN`, ‏`INVALIDATION-RETURN`, ‏`POST-GATE-HANDOFF`.

2.1.5 `where required`, ‏`as needed`, ‏`relevant` או טווח Phase בפרוזה אינם Prerequisite חוקי; כל תנאי דורש `conditionRecordId` בעל ערך בוליאני ומקור.

## 2.2 Atomic Output record

2.2.1 לכל Output אטומי יש `artifactId`, ‏`artifactType`, ‏`schemaVersion`, ‏`durableLocator`, ‏`byteLength`, ‏`rawDigest`, ‏`canonicalDigest`, ‏`producerActId`, ‏`producerAppointmentId`, ‏`inputRootManifestId`, ‏`generatedAt`, ‏`asOf`, ‏`validThrough`, ‏`supersedesArtifactId`, ‏`supersededByPointer`, ‏`classification`, ‏`publicEgressDisposition`.

2.2.2 לכל Output יש Producer יחיד; Output משותף לכמה Producers או שני Outputs בעלי אותה Identity ודיגסט שונה הם `IDENTITY-COLLISION` וחוסמים.

2.2.3 Phase בעל כמה Outputs מייצר `PhaseOutputManifest` אטומי שמגדיר Member אחד־אחד, `PRIMARY|SUPPORTING`, Join חובה וסדר Canonical.

2.2.4 שני Readers בלתי תלויים חייבים לשחזר אותו Member set, אותו סדר ואותו `phaseOutputRoot`; Missing, Duplicate, Collision או Stale count חייבים להיות אפס.

2.2.5 Output אינו `ACCEPTED` מכוח קיומו; קבלה קיימת רק באמצעות Envelope חיצוני לפי 2.3.

## 2.3 Detached Phase Acceptance envelope

2.3.1 לכל Generation יש `PhaseCandidateRoot`, ‏`EvidenceBundleRoot`, ‏`ProducerQARoot`, ‏`ReviewARoot`, ‏`ReviewBRoot`, ‏`ComparisonRoot`, ‏`ReconciliationRoot`, ‏`VetoSetRoot`, ‏`ApprovalRequirementRoot`, ‏`ApprovalReceiptRoot`, ‏`AcceptanceAttemptId`, ‏`expectedPreviousPointer`, ‏`authorityEpoch`, ‏`trustedTimeReceipt`, ‏`validThrough` ו־`AcceptanceWriterAppointment`.

2.3.2 ה־Acceptance envelope וה־current pointer אינם Member או Ancestor של ה־Subject שאותו הם מקבלים.

2.3.3 `Producer`, ‏`ReviewerA`, ‏`ReviewerB`, ‏`Reconciler`, ‏`Approver` ו־`AcceptanceWriter` הם Roles נפרדים; מטריצת Conflict חיצונית קובעת אילו צירופים אסורים.

2.3.4 P0 או P1 פתוח אינו ניתן ל־Risk acceptance; P2/P3 דורש Policy מפורש, Authority מתאים, Expiry ו־Residual-risk evidence, אחרת הוא חוסם.

2.3.5 כתיבת current pointer היא CAS חד־ניסיוני מול `expectedPreviousPointer`; Response loss, Timeout, ABA, Replay או Conflict עוברים ל־`TERMINAL-RECONCILE`, לא ל־Success משוער.

2.3.6 שתי קריאות בלתי תלויות אחרי CAS חייבות להחזיר אותו Tuple: `pointerId,envelopeDigest,subjectRoot,authorityEpoch,version`; אי־התאמה חוסמת.

## 2.4 Typed state machine

2.4.1 מצבי Phase generation הם בדיוק `DECLARED`, ‏`PREPARATORY-UNACCEPTED`, ‏`ENTRY-READY`, ‏`ACTIVE`, ‏`OUTPUT-FROZEN`, ‏`QA-PASSED`, ‏`UNDER-REVIEW`, ‏`RECONCILED`, ‏`APPROVAL-PENDING`, ‏`ACCEPTANCE-PENDING`, ‏`ACCEPTED-CURRENT`, ‏`SUPERSEDED`, ‏`INVALIDATED`, ‏`REJECTED`, ‏`BLOCKED`, ‏`EXPIRED`.

2.4.2 מעבר ל־`ACTIVE` דורש `EntryReceipt` שקושר כל Prerequisite exact root; קובץ שנכתב מוקדם נשאר `PREPARATORY-UNACCEPTED` ומקבל אפס Phase credit.

2.4.3 `complete`, ‏`pass`, ‏`frozen`, ‏`accepted`, ‏`clean` ו־`current` אינם ניתנים להמרה זה לזה; Type checker דוחה Coercion.

2.4.4 לכל Pair של `state,event` מוגדר Transition אחד או `ILLEGAL-EVENT`; Undefined transition count חייב להיות אפס.

2.4.5 Failure לעולם אינו יוצר Output accepted, Permit, Completion credit או Authority.

## 2.5 Failure terminals

2.5.1 Terminals בטוחים הם `REJECTED-NEEDS-SUCCESSOR`, ‏`BLOCKED-MISSING-INPUT`, ‏`BLOCKED-MISSING-AUTHORITY`, ‏`BLOCKED-CONFLICT`, ‏`BLOCKED-EXTERNAL-WAIT`, ‏`BLOCKED-UNBOUNDED`, ‏`EXPIRED-REVALIDATION-REQUIRED`, ‏`HANDED-OFF` ו־`ACCEPTED-CURRENT`.

2.5.2 לכל Failure יש `failureReasonCode`, ‏`detectedBy`, ‏`evidenceRoot`, ‏`retryEligibility`, ‏`escalationOwner`, ‏`returnPhaseId`, ‏`invalidatedDescendantRoot` ו־`terminalAt`.

2.5.3 שלושה Successor attempts רצופים ללא ירידה מונוטונית ב־Blocking Finding set מחזירים `BLOCKED-REQUIRES-NEW-AUTHORITY`; המספר שלוש הוא Policy של רצף זה ולא Deadline מוצר.

2.5.4 External wait ללא Owner, Poll rule, Evidence source או Bound נשאר `BLOCKED-UNBOUNDED` ומכריח ETA=`unknown/unavailable`.

## 2.6 Rework and invalidation

2.6.1 `ReworkRouteTable` ממפה כל Defect class לאחד: `RETURN-SUBJECT`, ‏`RETURN-SOURCE`, ‏`RETURN-REQUIREMENT`, ‏`RETURN-SCOPE`, ‏`RETURN-PROGRAM`, ‏`RETURN-SCHEDULE`, ‏`RETURN-MASTER`, ‏`RETURN-AUTHORITY`, ‏`BLOCKED-NEW-DECISION`.

2.6.2 כל תיקון Byte מייצר Generation חדש עם `parentGeneration`, ‏`changedRootSet`, ‏`closedFindingSet`, ‏`newFindingSet` ו־`monotonicMeasure`.

2.6.3 Triggers כוללים שינוי Source/member/digest/freshness, Decision, Policy, Legal, Provider, Role/authority epoch, Evidence, Capacity/calendar, Git branch/head/settings, Review Protocol או Master input.

2.6.4 Reverse dependency traversal מבטל את כל ורק ה־Descendants התלויים, מנקה current pointers ומעניק ל־Artifact stale אפס Authority, Credit ו־ETA contribution.

2.6.5 Mutation corpus חייב להפעיל כל Trigger וכל Defect class ולהוכיח Route יחיד, no stale review reuse ו־termination total.

## 2.7 Phase Observation

2.7.1 Status נצפה באמצעות append-only `PhaseObservation` עם `observationId`, ‏`phaseGenerationId`, ‏`observedState`, ‏`observerAppointmentId`, ‏`queryId`, ‏`sourceRoot`, ‏`observedAt`, ‏`validThrough`, ‏`supersedesObservationId`.

2.7.2 Current view נגזר מ־Observation cut אחד; שינוי Observation אינו משנה את Phase Subject.

2.7.3 Observation חסר, פג, בעל Query לא־ידוע או Source root לא־תואם מוצג `UNKNOWN`, לעולם לא `CURRENT`.

## 2.8 Typed Gate registry

2.8.1 Gate identities נפרדות הן `DEFINITION-ACCEPTANCE-GATE`, ‏`PROGRAM-ACCEPTANCE-GATE`, ‏`PUBLIC-REPOSITORY-HARDENING-GATE`, ‏`GATE29-MASTER-PLANNING-ACCEPTANCE`, ‏`GATE30-GO-LIVE`.

2.8.2 מעבר Gate אחד אינו מסיק מעבר Gate אחר; אין Alias חופשי או Authority inheritance.

2.8.3 לכל Gate יש `gateId`, ‏`gateType`, ‏`subjectRoot`, ‏`evidenceRoot`, ‏`predicateManifestRoot`, ‏`approvalRoot`, ‏`authorityEpoch`, ‏`attemptId`, ‏`expectedHead`, ‏`validThrough`, ‏`terminalState` ו־`readbackRoot`.

2.8.4 `Gate29` מאשר Master לצורך Handoff תכנוני בלבד; הוא אינו Go-live, אינו Push permit ואינו Product completion.

2.8.5 `Gate30` שייך ל־Program graph אחרי הוראת יישום, וכולל Release, Cutover, Rollback, Observation window ו־Post-GA service lifecycle.

## 2.9 Metrics and denominators

2.9.1 כל Metric כולל `metricName`, ‏`denominatorRoot`, ‏`queryRoot`, ‏`asOf`, ‏`freshnessState`, ‏`value`, ‏`unit`, ‏`unknownReason`.

2.9.2 Counts נגזרים מ־Manifest accepted ולא מקבוע מודפס; שינוי Member או Root מבטל את ה־Metric.

2.9.3 `acceptedPlanningPhaseFraction` מותר רק לאחר קבלת רצף זה ורישום Phase instances; לפני כן הערך `unknown/unavailable`, ולא `0/N` סמכותי.

2.9.4 Product completion נמדד רק מול Program Task denominator accepted; Planning phase count לעולם אינו נכנס למונה או למכנה המוצר.

2.9.5 ETA מפורסם רק אם שני Schedulers בלתי תלויים מפיקים אותו Schedule class מכל Inputs טריים וכל Critical External wait חסום בגבול; אחרת ETA=`unknown/unavailable`.

## 2.10 Public repository invariant

2.10.1 המאגר הקנוני הוא Git root הפנימי `/Users/tal/Documents/connect/web`; Root חיצוני `/Users/tal/Documents/connect` אינו Repo target מורשה.

2.10.2 `RepoAuthorityRegistry` חייב לקשור Provider, owner/name, repository ID, visibility=`PUBLIC`, default branch, protected branch, expected HEAD, remote URL, authority epoch ו־readback query.

2.10.3 כל Git או GitHub Act עתידי בודק Repo root, branch, HEAD, diff, Actor, Permit, visibility ו־fresh settings; Wrong-root guard מחזיר `BLOCKED-WRONG-REPOSITORY`.

2.10.4 אין פעולת Git/GitHub ברת־השגה בגרף pre-Gate29; הכנת מפרט ו־Read-only evidence בלבד מותרות כאשר הן חלק ממשימת תכנון.

2.10.5 כל Push עתידי תלוי ב־`PUBLIC-REPOSITORY-HARDENING-GATE` טרי וב־one-use `ExactDiffPushPermit`; Feature חסר דורש Compensating-control Decision accepted או חוסם.

# 3. Phase registry — Planning-generation

## 3.1 חוזה קריאה של הרשומה

3.1.1 כל אחד מן השלבים `PGV2-00`–`PGV2-29` שייך ל־`DOMAIN-PLANNING-GENERATION` בלבד.

3.1.2 בכל רשומה להלן `entry` הוא Join מלא של exact-root Inputs; חסר אחד מחזיר `BLOCKED-MISSING-INPUT`.

3.1.3 `outputs` הם Types ולא שמות קבצים; כל Instance חייב לממש אותם כרשומות 2.2 ולצרף `PhaseOutputManifest`.

3.1.4 `exit` הוא Predicate שנדרש בנוסף למחזור 2.3; Predicate שעבר ללא Acceptance envelope אינו מקבל Phase credit.

3.1.5 `failure` הוא Terminal ברירת המחדל; `rework` הוא ה־Return edge היחיד המותר לאחר Successor.

## 3.2 `PGV2-00` — Recovery and authority baseline

3.2.1 `objective=לקבע את ה־Master הדחוי, roots של מקורות קיימים, שתי זהויות Git, החלטת Public, היסטוריית אובדן Evidence ומנדט המשתמש בלי להעניק להם Acceptance משתמע`.

3.2.2 `entry=B0 valid + mandate receipt + read-only filesystem/Git observations`.

3.2.3 `outputs=RecoveryBaseline; RepoAuthorityCandidate; DurableArtifactInventory; MissingEvidenceRegister; DirectivePrecedenceReceipt`.

3.2.4 `exit=שני Readers משחזרים אותם roots, Git identities ו־absence facts; outer Git מסומן non-authoritative; visibility intent Public; unknowns אינם מוחלפים בהנחה`.

3.2.5 `failure=BLOCKED-CONFLICT|BLOCKED-MISSING-AUTHORITY`.

3.2.6 `rework=RETURN-SOURCE אל PGV2-00 generation חדש`.

## 3.3 `PGV2-01` — Review Input Freeze

3.3.1 `objective=ליצור Freeze מצומצם של Bytes ומקורות המשמשים לביקורות היסוד בלבד, בנפרד מ־ProgramAdmittedSourceSet העתידי`.

3.3.2 `entry=PGV2-00 accepted + B0 valid`.

3.3.3 `outputs=ReviewInputFreezeManifest; LocatorManifest; CustodyReceiptSet; ExclusionAndUnknownRegister`.

3.3.4 `exit=כל Member קושר path/media locator, bytes, digest, custody, claim limit ו־freshness; two-reader member/root parity; ReviewInputFreeze אינו Alias ל־SourceSet`.

3.3.5 `failure=BLOCKED-MISSING-INPUT|BLOCKED-CONFLICT`.

3.3.6 `rework=RETURN-SOURCE אל PGV2-01; שינוי Member מבטל PGV2-02–PGV2-10 לפי reverse graph`.

## 3.4 `PGV2-02` — Raw Master audit custody

3.4.1 `objective=לשמר ללא Merge את שלוש ביקורות ה־Master ואת כל הזהויות המקומיות מול Root נושא אחד`.

3.4.2 `entry=PGV2-01 accepted + שלושה Reviewer packets predeclared`.

3.4.3 `outputs=RawReviewAEnvelope; RawReviewBEnvelope; RawReviewCEnvelope; LocalFindingIdentitySet; CustodyParityReport`.

3.4.4 `exit=כל Finding מקומי נשמר byte-for-byte ובעל noMerge identity; duplicate/orphan/lost count=0; אין עדיין Semantic merge או Acceptance`.

3.4.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-MISSING-INPUT`.

3.4.6 `rework=RETURN-SOURCE אל PGV2-01 אם ה־Freeze שגוי, אחרת RETURN-SUBJECT אל PGV2-02`.

## 3.5 `PGV2-03` — Bootstrap lifecycle definition acceptance

3.5.1 `objective=להגדיר Lifecycle לא־עצמי עבור Candidate, Evidence, QA, Review, Reconciliation, Approval, CAS, invalidation ו־replay`.

3.5.2 `entry=PGV2-00 accepted + PGV2-01 accepted + B0 + BootstrapReviewProtocol`.

3.5.3 `outputs=BootstrapLifecycleDefinition; LifecycleSchemaSet; ConformanceCorpus; TwoGenerationProof; DefinitionAcceptanceEnvelope`.

3.5.4 `exit=כל דרישות ה־Bootstrap admitted נסגרות one-to-one; two-generation proof עובר; אין self-membership או self-authority; external exact-root acceptance current`.

3.5.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-MISSING-AUTHORITY|BLOCKED-CONFLICT`.

3.5.6 `rework=RETURN-SUBJECT אל PGV2-03; שינוי B0 מחזיר PGV2-00`.

## 3.6 `PGV2-04` — Three-review protocol definition acceptance

3.6.1 `objective=להגדיר Protocol lossless ל־Reviewer-local Findings, dual normalization, comparison, authorship, conflict, resolution ו־protected acceptance`.

3.6.2 `entry=PGV2-03 accepted + B0 + BootstrapReviewProtocol + ReviewInputFreeze accepted`.

3.6.3 `outputs=ThreeReviewProtocolDefinition; ProtocolSchemaSet; VectorCorpus; TwoGenerationProof; ProtocolAcceptanceEnvelope`.

3.6.4 `exit=כל דרישות Protocol וכל Finding predecessor מקבלים disposition וראיה; semantic/inverse coverage מלאה; no authorship overwrite; exact-root acceptance current`.

3.6.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-CONFLICT|BLOCKED-MISSING-AUTHORITY`.

3.6.6 `rework=RETURN-SUBJECT אל PGV2-04; אין שימוש ב־Protocol Candidate כדי לאשר את עצמו`.

## 3.7 `PGV2-05` — Planning work registry and bounded estimate

3.7.1 `objective=ליצור מכנה אטומי ונפרד לכל העבודה הנדרשת להשלמת PGV2-00–PGV2-29`.

3.7.2 `entry=PGV2-03 accepted + PGV2-04 accepted + PhaseDefinitionSet frozen`.

3.7.3 `outputs=PlanningWorkRegistry; PlanningResourceRegistry; PlanningExternalWaitRegistry; ActualLedger; PlanningScheduleSnapshotLow; PlanningScheduleSnapshotHigh`.

3.7.4 `exit=לכל Output מתוכנן יש Producers אטומיים; unique-work union ללא double count; Owner/Backup/Capacity/Calendar/Mutex/Wait מוגדרים; שני Schedulers מסכימים או ETA נשאר unknown`.

3.7.5 `failure=BLOCKED-UNBOUNDED|BLOCKED-MISSING-INPUT|REJECTED-NEEDS-SUCCESSOR`.

3.7.6 `rework=RETURN-SCHEDULE אל PGV2-05 בכל שינוי Phase, resource, capacity, wait או Actual`.

## 3.8 `PGV2-06` — Source universe and custody definition acceptance

3.8.1 `objective=להגדיר יקום מקורות סופי, discovery families, authority, precedence, custody, dynamic refresh, quarantine, Public egress ו־invalidation`.

3.8.2 `entry=PGV2-03 accepted + PGV2-04 accepted + PGV2-01 accepted`.

3.8.3 `outputs=SourceUniverseDefinition; SourceReferenceIndexContract; CustodyAndLocatorSchemas; DynamicAuthorityPolicy; SourceDefinitionAcceptanceEnvelope`.

3.8.4 `exit=כל SURS requirement ו־Finding admitted נסגר one-to-one; discovery finite; raw/auth/freshness states נפרדים; mixed media loaders מוגדרים; exact-root acceptance current`.

3.8.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-MISSING-INPUT|BLOCKED-CONFLICT`.

3.8.6 `rework=RETURN-SUBJECT אל PGV2-06; שינוי ReviewInputFreeze מחזיר PGV2-01`.

## 3.9 `PGV2-07` — Formal reconciliation of raw Master audits

3.9.1 `objective=לנרמל ולהשוות את כל ה־Reviewer-local Findings בלי לאבד זהות, ניסוח, Severity, Predicate או authorship`.

3.9.2 `entry=PGV2-02 accepted + PGV2-04 accepted + ReviewInputFreeze accepted + שני Normalizer appointments בלתי תלויים`.

3.9.3 `outputs=NormalizerARun; NormalizerBRun; SemanticIdentityRegistry; ComparisonManifest; ConflictManifest; ResolutionManifest; AuditReconciliationRoot`.

3.9.4 `exit=forward/inverse local coverage=100%; normalizer parity או conflicts מפורשים; unresolved blocking conflict=0; downgrade ללא Evidence=0`.

3.9.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-CONFLICT`.

3.9.6 `rework=RETURN-SUBJECT אל PGV2-07; מקור Raw שגוי מחזיר PGV2-02; Protocol defect מחזיר PGV2-04`.

## 3.10 `PGV2-08` — TRD-2 requirement input freeze

3.10.1 `objective=לקבע מכנה מפורש ולא־ריק של כל הדרישות והממצאים שעל TRD-2 Definition לספק`.

3.10.2 `entry=PGV2-03 accepted + PGV2-04 accepted + PGV2-06 accepted + PGV2-07 accepted`.

3.10.3 `outputs=TRD2RequirementInputManifest; ApplicabilityDecisionSet; SourceBasisIndex; ForwardInverseCoverageSchema`.

3.10.4 `exit=כל Member בעל ID+root+locator+applicability+reason; unresolved applicability=0; ranges in machine fields=0; two-reader root parity`.

3.10.5 `failure=BLOCKED-MISSING-INPUT|BLOCKED-CONFLICT|REJECTED-NEEDS-SUCCESSOR`.

3.10.6 `rework=RETURN-REQUIREMENT אל PGV2-08; שינוי Source/Review root מבטל PGV2-09 ו־PGV2-10`.

## 3.11 `PGV2-09` — TRD-2 requirement successor acceptance

3.11.1 `objective=ליצור Requirement manifest אטומי שסוגר כל Member של TRD2RequirementInputManifest ללא Merge או השמטה`.

3.11.2 `entry=PGV2-08 accepted + PGV2-04 accepted`.

3.11.3 `outputs=TRD2DefinitionRequirementManifest; DependencyDAG; ClosureCrosswalk; RequirementAcceptanceEnvelope`.

3.11.4 `exit=forward/inverse coverage=100%; each row atomic; required fields complete; dangling/self/duplicate/cycle=0; כל Blocking review finding סגור ב־Successor exact root`.

3.11.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-CONFLICT`.

3.11.6 `rework=RETURN-REQUIREMENT אל PGV2-09; מכנה שגוי מחזיר PGV2-08`.

## 3.12 `PGV2-10` — TRD-2 machine definition acceptance

3.12.1 `objective=להגדיר חוזה מכונה מלא ל־Work, Task, Output, Test, Evidence, Graph, Gate, Time, Security, Data lifecycle ו־Acceptance`.

3.12.2 `entry=PGV2-03 accepted + PGV2-04 accepted + PGV2-09 accepted`.

3.12.3 `outputs=TRD2Definition; SchemaSet; CanonicalSerializationContract; ParserAndGraphSpecification; VectorCorpus; TwoGenerationProof; DefinitionAcceptanceEnvelope`.

3.12.4 `exit=כל Requirement accepted מוכח; שני Readers/Graph solvers מסכימים; mutation/negative corpus עובר; כל P0/P1 סגור; protected definition pointer current`.

3.12.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-CONFLICT|BLOCKED-MISSING-AUTHORITY`.

3.12.6 `rework=RETURN-SUBJECT אל PGV2-10; Requirement defect מחזיר PGV2-09`.

## 3.13 `PGV2-11` — Source candidate inventory and custody

3.13.1 `objective=לגלות ולסווג את כל מקורות ה־Candidate בפועל לפי SourceUniverseDefinition accepted, בלי לבחור אותם עדיין כמקורות סמכותיים`.

3.13.2 `entry=PGV2-06 accepted + PGV2-10 accepted + authorized read-only custody scope + Public-safe handling policy`.

3.13.3 `outputs=SourceCandidateInventory; DiscoveryRunReceiptSet; CustodyReceiptSet; MediaLocatorSet; QuarantineManifest; CandidateClassDenominatorSet`.

3.13.4 `exit=כל Discovery family רץ או מקבל Unknown/Unavailable reason מתועד; prohibited Public content=0; two-run membership parity; כל Candidate מקבל disposition pending ולא Admission משתמע`.

3.13.5 `failure=BLOCKED-MISSING-AUTHORITY|BLOCKED-EXTERNAL-WAIT|REJECTED-NEEDS-SUCCESSOR`.

3.13.6 `rework=RETURN-SOURCE אל PGV2-11; Definition defect מחזיר PGV2-06`.

## 3.14 `PGV2-12` — Program Admitted SourceSet acceptance

3.14.1 `objective=לבחור מתוך Candidate inventory את מקורות ה־Authority, Evidence ו־Context המדויקים עם precedence ו־claim limits`.

3.14.2 `entry=PGV2-11 output frozen + Selector/Reviewer appointments + Decision precedence policy accepted`.

3.14.3 `outputs=ProgramAdmittedSourceSet; SelectionAssertionSet; SourceConflictSet; ExclusionSet; SourceSetAcceptanceEnvelope`.

3.14.4 `exit=Candidate disposition coverage=100%; accepted/excluded/quarantined/unknown partitions disjoint and total; dangling/self/duplicate=0; two-reader root parity; exact acceptance current`.

3.14.5 `failure=BLOCKED-CONFLICT|BLOCKED-MISSING-AUTHORITY|REJECTED-NEEDS-SUCCESSOR`.

3.14.6 `rework=RETURN-SOURCE אל PGV2-12; Candidate inventory delta מחזיר PGV2-11; אין Return edge אל PGV2-07`.

## 3.15 `PGV2-13` — Requirement, Question, Decision and Conflict universe

3.15.1 `objective=לאטם ולסווג כל Statement קביל כ־Requirement, Question, Decision, Conflict, Example, Context או Non-authoritative text`.

3.15.2 `entry=PGV2-10 accepted + PGV2-12 accepted + extraction policy accepted`.

3.15.3 `outputs=SpanManifest; StatementManifest; RequirementManifest; QuestionManifest; DecisionManifest; DecisionAmendmentGraph; ConflictManifest; ApplicabilityManifest; ForwardInverseSourceGraph`.

3.15.4 `exit=כל Span סמנטי מקבל Class אחד; כל Q/D ידוע מקבל Identity ומקור exact; orphan=0; silent Example/Question promotion=0; unresolved Conflict חוסם ולא נעלם`.

3.15.5 `failure=BLOCKED-CONFLICT|REJECTED-NEEDS-SUCCESSOR|BLOCKED-MISSING-INPUT`.

3.15.6 `rework=RETURN-REQUIREMENT אל PGV2-13; SourceSet delta מחזיר PGV2-12`.

## 3.16 `PGV2-14` — Scope, stage, package and capability registry

3.16.1 `objective=לפתור Pilot/Post-Pilot, Scope classes, S00–S28, Packages, conditional capabilities, routes ו־surface identities`.

3.16.2 `entry=PGV2-13 accepted + applicable scope Decisions current`.

3.16.3 `outputs=ScopeRegistry; StageRegistry; PackageTemplateRegistry; PackageInstanceRegistry; CapabilityActivationRegistry; RouteSurfaceIdentityRegistry; ScopeDispositionManifest`.

3.16.4 `exit=כל Requirement מקבל Scope disposition אחד; alias/overlap ambiguity=0; inactive or deferred item מקבל אפס Product denominator/credit; activation תלוי Decision exact`.

3.16.5 `failure=BLOCKED-CONFLICT|BLOCKED-MISSING-INPUT|REJECTED-NEEDS-SUCCESSOR`.

3.16.6 `rework=RETURN-SCOPE אל PGV2-14; Requirement/Decision delta מחזיר PGV2-13`.

## 3.17 `PGV2-15` — Program materialization specification and permit

3.17.1 `objective=להגדיר את פעולות התכנון הדטרמיניסטיות שמותר להן ליצור Program records, בלי לבצע Product work או External-state mutation`.

3.17.2 `entry=PGV2-10 accepted + PGV2-13 accepted + PGV2-14 accepted + Planning role appointments`.

3.17.3 `outputs=ProgramMaterializationSpecification; InputRootManifest; OutputSchemaRoot; OrderedActLedger; MaterializationPermitRequest; PlanningOnlyBoundaryProof`.

3.17.4 `exit=כל Act ממופה DOMAIN-PLANNING-GENERATION; reachable executable Product/External act count=0; exact-root reviews+approval; one-use non-replayable planning permit current`.

3.17.5 `failure=BLOCKED-MISSING-AUTHORITY|REJECTED-NEEDS-SUCCESSOR|BLOCKED-CONFLICT`.

3.17.6 `rework=RETURN-SUBJECT אל PGV2-15; input delta מחזיר Phase מקור מתאים`.

## 3.18 `PGV2-16` — Program Task candidate materialization

3.18.1 `objective=לרשום כל Task leaf נדרש עבור S00–S28 וה־Scopes הפעילים, עם שדות מקומיים מלאים וללא inherited credit`.

3.18.2 `entry=PGV2-15 planning permit valid + exact accepted roots של PGV2-10, PGV2-13 ו־PGV2-14`.

3.18.3 `outputs=TaskRegistryCandidate; OutputRegistryCandidate; TestDefinitionRegistry; EvidenceRequirementRegistry; EdgeJoinRegistry; GateRequirementRegistry; ResourceRequirementRegistry; MutexRegistry; ExternalWaitRegistry`.

3.18.4 `exit=כל Leaf אטומי ובעל unique producer; parent hours/credit=0; every Task has inputs, outputs, tests, evidence, entry, exit, failure, rollback/recovery and dependencies; schema errors=0`.

3.18.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-MISSING-INPUT|EXPIRED-REVALIDATION-REQUIRED`.

3.18.6 `rework=RETURN-PROGRAM אל PGV2-16; Specification defect מחזיר PGV2-15; source/scope change מחזיר Phase מקור`.

## 3.19 `PGV2-17` — Coverage, cyber and lifecycle crosswalks

3.19.1 `objective=למפות כל Requirement, Decision, Finding, Threat, Control, Framework, Dynamic source, DataClass, Gate ו־Capability אל Tasks, Tests ו־Evidence`.

3.19.2 `entry=PGV2-16 candidate frozen + Framework source set current + Public-repository control requirements current`.

3.19.3 `outputs=RequirementTaskCrosswalk; DecisionTaskCrosswalk; FindingClosureCrosswalk; ThreatControlTestCrosswalk; FrameworkCoverageCrosswalk; DataLifecycleCrosswalk; PublicRepositoryControlCrosswalk; OrphanReport`.

3.19.4 `exit=forward coverage=100% לכל Scope פעיל; inverse orphan=0; unsupported readiness claim=0; כל Control קושר Owner, Task, negative Test ו־Evidence requirement`.

3.19.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-MISSING-INPUT|BLOCKED-CONFLICT`.

3.19.6 `rework=RETURN-PROGRAM אל PGV2-17; Task delta מחזיר PGV2-16; Source/Framework delta מחזיר PGV2-12`.

## 3.20 `PGV2-18` — Resource-constrained estimates and schedules

3.20.1 `objective=להפיק Actual, ETC, Low/High schedules ו־Critical paths מן ה־Task candidate, Resources, Calendars, Mutexes ו־External waits`.

3.20.2 `entry=PGV2-16 frozen + PGV2-17 pass + כל Task פעיל estimated או typed Unknown + capacity/wait observations fresh`.

3.20.3 `outputs=DenominatorVectorSet; UniqueWorkUnion; AssignmentManifest; CapacityCalendarManifest; WaitBoundManifest; ScheduleSnapshotLow; ScheduleSnapshotHigh; CriticalNearCriticalPathReport`.

3.20.4 `exit=MATH contract predicates pass; no double count; two deterministic schedulers agree; כל Critical wait bounded עבור ETA מפורסם; אחרת exact hours/ETA remain unknown`.

3.20.5 `failure=BLOCKED-UNBOUNDED|REJECTED-NEEDS-SUCCESSOR|EXPIRED-REVALIDATION-REQUIRED`.

3.20.6 `rework=RETURN-SCHEDULE אל PGV2-18; Task/crosswalk delta מחזיר PGV2-16 או PGV2-17`.

## 3.21 `PGV2-19` — Program Candidate producer QA

3.21.1 `objective=לבדוק Schema, Identity, References, Atomicity, Graph, Coverage, Schedule, Authority, Public content, Security ו־Data lifecycle על אותם frozen bytes`.

3.21.2 `entry=atomic join של roots הקפואים PGV2-16, PGV2-17 ו־PGV2-18`.

3.21.3 `outputs=ParserSpecificationCheckA; ParserSpecificationCheckB; GraphCheckA; GraphCheckB; ConformanceResult; MutationResult; AttackCaseResult; ProducerFindingManifest; ProducerQARoot`.

3.21.4 `exit=parser/graph parity; dangling/duplicate/cycle/forbidden mutation=0; public-sensitive-content violations=0; כל Finding נשמר וחוסם לפי Policy`.

3.21.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-CONFLICT`.

3.21.6 `rework=RETURN-PROGRAM אל PGV2-16, RETURN-PROGRAM אל PGV2-17 או RETURN-SCHEDULE אל PGV2-18 לפי defect-class יחיד`.

## 3.22 `PGV2-20` — Independent Program Reviews A and B

3.22.1 `objective=לקבל שתי ביקורות עצמאיות מבניות, אבטחתיות, סמנטיות ולוח־זמנים על Subject ו־Evidence זהים`.

3.22.2 `entry=PGV2-19 QA passed + Review B packet presealed לפני disclosure של Review A + appointments eligible`.

3.22.3 `outputs=ReviewAEnvelope; ReviewBEnvelope; ReviewerLocalFindingManifestA; ReviewerLocalFindingManifestB; IndependenceProof; ReviewRootSet`.

3.22.4 `exit=exact subject/evidence roots זהים; local findings נשמרים; independence ו־coverage מוכחים; subject mutation during review=0`.

3.22.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-CONFLICT|BLOCKED-MISSING-AUTHORITY`.

3.22.6 `rework=RETURN-PROGRAM אל PGV2-20 לביקורת חדשה בלבד; Subject change מחזיר PGV2-19`.

## 3.23 `PGV2-21` — Program Finding reconciliation and successor routing

3.23.1 `objective=להשוות losslessly את ממצאי Producer ו־Reviewers, לפתור Conflicts ולנתב כל תיקון ל־Phase מקור יחיד`.

3.23.2 `entry=PGV2-04 accepted + PGV2-20 complete + two independent normalizer runs`.

3.23.3 `outputs=ProgramFindingIdentityRegistry; NormalizerParityReport; ComparisonManifest; ConflictManifest; ResolutionManifest; VetoCandidateSet; ReworkRouteManifest`.

3.23.4 `exit=local inverse coverage=100%; unexplained merge/downgrade/predicate loss=0; כל P0/P1/P2 closed-by-evidence או blocking; route total and unique`.

3.23.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-CONFLICT|BLOCKED-REQUIRES-NEW-AUTHORITY`.

3.23.6 `rework=לפי ReworkRouteTable אל המוקדם מבין PGV2-11–PGV2-20 שמושפע; כל Descendant מורץ מחדש ואסור למחזר Review receipt`.

## 3.24 `PGV2-22` — Program approval requirements and veto closure

3.24.1 `objective=לגזור מכנה לא־ריק של Approvers, Domain vetoes, scopes, conflicts, expiry ו־revocation עבור Program Candidate exact root`.

3.24.2 `entry=PGV2-21 reconciled + successor Program candidate frozen + Appointment registry current`.

3.24.3 `outputs=ProgramApprovalRequirementManifest; DomainVetoSet; AppointmentConflictMatrix; ApprovalRequestSet; ApprovalReceiptSet; ResidualRiskRegister`.

3.24.4 `exit=100% approval denominator fresh/root-matched/unrevoked; P0/P1 open=0; domain veto open=0; blanket or inferred approval count=0`.

3.24.5 `failure=BLOCKED-MISSING-AUTHORITY|REJECTED-NEEDS-SUCCESSOR|EXPIRED-REVALIDATION-REQUIRED`.

3.24.6 `rework=RETURN-PROGRAM אל PGV2-21 עבור Finding; RETURN-AUTHORITY אל PGV2-22 עבור Appointment/receipt`.

## 3.25 `PGV2-23` — Program Candidate protected acceptance

3.25.1 `objective=ליצור Program root accepted/current לפני שה־Master assembly רשאי לצרוך אותו`.

3.25.2 `entry=PGV2-22 pass + expected Program pointer + AcceptanceWriter appointment + trusted time`.

3.25.3 `outputs=ProgramAcceptanceEnvelope; ProgramAcceptanceAttempt; ProgramPointerReadbackA; ProgramPointerReadbackB; TerminalReconciliationReceipt`.

3.25.4 `exit=one-use CAS succeeds; two readbacks match attempt and each other; exact Program subject/evidence/review/reconciliation/veto/approval roots bound; one current head proven`.

3.25.5 `failure=BLOCKED-CONFLICT|BLOCKED-MISSING-AUTHORITY|EXPIRED-REVALIDATION-REQUIRED`.

3.25.6 `rework=TERMINAL-RECONCILE תחילה; Subject defect מחזיר PGV2-21; authority defect מחזיר PGV2-22`.

## 3.26 `PGV2-24` — Public repository hardening specification acceptance

3.26.1 `objective=להגדיר מפרט מלא ומורשה מראש להגנת מאגר Public בלי לבצע שינוי GitHub או Push`.

3.26.2 `entry=PGV2-04 accepted + PGV2-12 accepted + PGV2-13 accepted + PGV2-17 Public crosswalk frozen + D18/Public-source requirements admitted`.

3.26.3 `outputs=RepoAuthorityRegistryCandidate; PublicHardeningControlManifest; GitHubSettingsDesiredState; ExactMutationPlan; NegativeReadbackSpecification; FeatureAvailabilityMatrix; CompensatingDecisionRequirementSet; PushBlockSpecification`.

3.26.4 `exit=כל Control מ־D18, BCA2 ו־Public/cyber source universe מקבל disposition one-to-one, owner, planned act, negative test ו־evidence; canonical repo/branch/head bound; visibility remains Public; actual mutation count=0`.

3.26.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-MISSING-INPUT|BLOCKED-CONFLICT`.

3.26.6 `rework=RETURN-SUBJECT אל PGV2-24; source/control delta מחזיר PGV2-12 או PGV2-17`.

## 3.27 `PGV2-25` — Master assembly input freeze and candidate

3.27.1 `objective=להרכיב Master Candidate אחד מתוך roots מפורשים, accepted/current/fresh, ללא טווחי Phase או קלט משתמע`.

3.27.2 `entry=accepted exact roots של PGV2-10, PGV2-12, PGV2-13, PGV2-14, PGV2-17, PGV2-18, PGV2-23 ו־PGV2-24`.

3.27.3 `outputs=MasterAssemblyInputManifest; MasterMachineRootCandidate; NumberedHumanView; NavigationIndex; ArtifactInventory; RegenerationReceipt`.

3.27.4 `exit=InputManifest מונה כל Member ו־required state במפורש; no ranges; כל root resolves/current/fresh; Human view regenerates byte-deterministically; circular/self membership=0`.

3.27.5 `failure=BLOCKED-MISSING-INPUT|EXPIRED-REVALIDATION-REQUIRED|REJECTED-NEEDS-SUCCESSOR`.

3.27.6 `rework=RETURN-MASTER אל PGV2-25 עבור assembly defect; input defect חוזר ל־producer Phase ומבטל את PGV2-25`.

## 3.28 `PGV2-26` — Master producer QA, independent reviews and reconciliation

3.28.1 `objective=לבצע assurance מבני, security-semantic, schedule, source, Public-content, replay ו־authority על אותם Master bytes`.

3.28.2 `entry=PGV2-25 output frozen + Review B packet presealed + appointments eligible + PGV2-04 protocol current`.

3.28.3 `outputs=MasterProducerQARoot; MasterReviewAEnvelope; MasterReviewBEnvelope; MasterLocalFindingManifests; MasterComparisonRoot; MasterConflictRoot; MasterReconciliationRoot; MasterVetoCandidateSet`.

3.28.4 `exit=subject/evidence identity parity; local inverse coverage=100%; all blocking findings closed-by-successor or remain blocking; domain-veto predicates explicit; exact root stable`.

3.28.5 `failure=REJECTED-NEEDS-SUCCESSOR|BLOCKED-CONFLICT|BLOCKED-MISSING-AUTHORITY`.

3.28.6 `rework=RETURN-MASTER אל PGV2-25 עבור Master-only defect; derived input defect חוזר ל־Phase המוקדם המושפע וכל Descendant מורץ מחדש`.

## 3.29 `PGV2-27` — Master approval requirements and exact-root receipts

3.29.1 `objective=לגזור ולהשלים את כל אישורי האדם וה־Domain הנדרשים עבור Master subject/evidence/review/reconciliation roots מדויקים`.

3.29.2 `entry=PGV2-26 reconciled clean candidate + Appointment registry current + no inferred authority`.

3.29.3 `outputs=MasterApprovalRequirementManifest; DomainVetoSet; AppointmentMatrix; TalExactRootApprovalRequest; DomainApprovalRequestSet; ApprovalReceiptSet; RejectionOrExpirySet`.

3.29.4 `exit=מכנה Approvers לא־ריק; 100% receipts fresh/root-matched/unrevoked; Tal receipt קושר roots מדויקים; blanket continuation approval=0`.

3.29.5 `failure=BLOCKED-MISSING-AUTHORITY|REJECTED-NEEDS-SUCCESSOR|EXPIRED-REVALIDATION-REQUIRED`.

3.29.6 `rework=RETURN-AUTHORITY אל PGV2-27 עבור Receipt; RETURN-MASTER אל PGV2-25 עבור rejection requiring content change`.

## 3.30 `PGV2-28` — Gate29 protected Master acceptance

3.30.1 `objective=להפוך Generation אחד של Master ל־current לצורך Handoff תכנוני בלבד באמצעות protected CAS`.

3.30.2 `entry=PGV2-27 pass + expected Master head + AcceptanceWriter appointment + trusted time + all vetoes closed`.

3.30.3 `outputs=Gate29Envelope; Gate29Attempt; MasterPointerReadbackA; MasterPointerReadbackB; Gate29TerminalReconciliationReceipt`.

3.30.4 `exit=Envelope קושר Master subject, evidence, parser comparison, Producer QA, Review A/B, reconciliation, vetoes, Tal/domain approvals, previous head, authority epoch, time and attempt; two readbacks match exactly`.

3.30.5 `failure=BLOCKED-CONFLICT|BLOCKED-MISSING-AUTHORITY|EXPIRED-REVALIDATION-REQUIRED`.

3.30.6 `rework=TERMINAL-RECONCILE תחילה; content defect מחזיר PGV2-25; approval defect מחזיר PGV2-27; לעולם אין Handoff על הצלחה משוערת`.

## 3.31 `PGV2-29` — Bounded planning handoff

3.31.1 `objective=לסיים את Planning-generation ב־Receipt מוגבל שמציג את Root שהתקבל ומבקש הוראת יישום חדשה ומדויקת`.

3.31.2 `entry=PGV2-28 accepted/current readbacks + no invalidation event`.

3.31.3 `outputs=PlanningHandoffReceipt; AcceptedMasterIdentity; OutstandingExternalDecisionManifest; NewInstructionRequest`.

3.31.4 `exit=HANDED-OFF או BLOCKED; mutation/code/build/test-runtime/commit/push/provider act count=0; אין טענת Product completion או Go-live`.

3.31.5 `failure=BLOCKED-CONFLICT|EXPIRED-REVALIDATION-REQUIRED|BLOCKED-EXTERNAL-WAIT`.

3.31.6 `rework=Gate29 invalidation מחזירה PGV2-28; Master invalidation מחזירה Phase המוקדם המושפע`.

# 4. Post-Gate29 conditional Program boundary

## 4.1 גבול סמכות

4.1.1 `PXV2-00`–`PXV2-05` אינם Planning-generation phases, אינם חלק ממכנה PGV2 ואינם מורשים כעת.

4.1.2 הם מתארים Edges עתידיים שחייבים להופיע כ־Program Tasks accepted לפני ביצוע; הם אינם מחליפים Task, Permit או הוראת משתמש.

4.1.3 כל Edge ב־Section 4 דורש `PGV2-29=HANDED-OFF`, Master current, הוראת יישום חדשה, accepted Task identity, exact scope, Environment, Actor, Permit ו־Evidence-return destination.

4.1.4 בהיעדר אחד מאלה Terminal הוא `BLOCKED-NO-EXECUTION-AUTHORITY`.

## 4.2 `PXV2-00` — Implementation instruction receipt

4.2.1 `objective=לקשור הוראת משתמש חדשה ל־Master root ול־Task slice מוגבל`.

4.2.2 `outputs=ImplementationInstructionReceipt; AuthorizedTaskSlice; ExplicitExclusionSet; PermitRequirementSet`.

4.2.3 `exit=scope exact/non-blank; no blanket carry-forward; כל Task accepted/current; excluded external acts remain blocked`.

4.2.4 `failure=BLOCKED-NO-EXECUTION-AUTHORITY|BLOCKED-CONFLICT`.

## 4.3 `PXV2-01` — Public repository hardening mutation and gate

4.3.1 `objective=לבצע, רק אם הוראה ו־Permit מכסים זאת, את שינויי GitHub המאושרים למאגר Public הקנוני`.

4.3.2 `entry=PXV2-00 + PGV2-24 specification accepted/current + RepoAuthorityRegistry exact + one-use admin mutation permit + expected live settings root`.

4.3.3 `outputs=AdminMutationReceipt; LiveSettingsReadbackA; LiveSettingsReadbackB; FeatureAvailabilityReceipt; CompensatingDecisionReceiptSet; PublicRepositoryHardeningGateEnvelope`.

4.3.4 `exit=כל Control required מוכח live בשתי קריאות; repo/branch/head match; visibility=PUBLIC; feature unavailable ללא Decision accepted חוסם; Permit consumed once`.

4.3.5 `failure=PUSH-BLOCKED|BLOCKED-WRONG-REPOSITORY|BLOCKED-CONFLICT|BLOCKED-MISSING-AUTHORITY`.

4.3.6 `rework=setting drift מבטל Gate ומחייב Permit חדש; אין Auto-retry של Admin mutation`.

## 4.4 `PXV2-02` — Exact-diff Push act

4.4.1 `objective=לאפשר Push יחיד רק ל־diff, branch, expected head ו־Actor שאושרו`.

4.4.2 `entry=PXV2-01 gate fresh + accepted Task + one-use ExactDiffPushPermit + local/remote pre-readback match`.

4.4.3 `outputs=PushAttemptReceipt; RemoteHeadReadbackA; RemoteHeadReadbackB; WorkflowTriggerReceipt; PermitConsumptionReceipt`.

4.4.4 `exit=diff/root/head match; two remote readbacks match; required checks reach typed terminal; replay/expiry/wrong diff/head blocks`.

4.4.5 `failure=PUSH-BLOCKED|BLOCKED-CONFLICT|TERMINAL-RECONCILE`.

4.4.6 `rework=אין replay; נדרש Task/Permit חדש לאחר Reconciliation`.

## 4.5 `PXV2-03` — Bounded execution slices and evidence return

4.5.1 `objective=לבצע רק Tasks accepted מתוך AuthorizedTaskSlice ולהחזיר Evidence אטומי`.

4.5.2 `entry=PXV2-00; ואם נדרש Push גם PXV2-02; כל Provider/Secret/Data/Legal permit applicable`.

4.5.3 `outputs=TaskExecutionReceiptSet; TestEvidenceSet; SecurityEvidenceSet; RollbackEvidenceSet; MasterEvidenceReturnManifest`.

4.5.4 `exit=כל Task terminal typed; output/test/evidence joins complete; failure אינו מקבל completion credit; evidence invalidates stale plans where required`.

4.5.5 `failure=BLOCKED|FAILED-ROLLED-BACK|FAILED-RECOVERY-REQUIRED`.

4.5.6 `rework=רק דרך accepted successor Task ו־Instruction receipt חדש אם Scope משתנה`.

## 4.6 `PXV2-04` — Gate30, staged release and rollback proof

4.6.1 `objective=לקבל או לחסום Go-live לפי Release candidate, canary, rollback, security, legal, provider ו־operational evidence`.

4.6.2 `entry=כל Gate30 prerequisite Tasks complete + ReleaseCandidateRoot frozen + approval/veto denominator current`.

4.6.3 `outputs=Gate30Envelope; CutoverReceipt; CanaryObservation; RollbackDecisionReceipt; GoLiveOrRollbackTerminal`.

4.6.4 `exit=GO-LIVE-ACCEPTED או ROLLED-BACK|BLOCKED; Gate29 או Handoff לעולם אינם תחליף`.

4.6.5 `failure=ROLLED-BACK|BLOCKED|INCIDENT-RESPONSE-ACTIVE`.

4.6.6 `rework=Release successor חדש; אין Retry על אותו one-use Cutover permit`.

## 4.7 `PXV2-05` — Post-GA service lifecycle

4.7.1 `objective=לנהל Observation window, SLO, incident, retention, backup/restore, vulnerability, dependency, cost ו־continuous compliance לאחר Go-live`.

4.7.2 `entry=PXV2-04 GO-LIVE-ACCEPTED + ServiceOwnershipRoot + OnCallRoot + monitoring evidence current`.

4.7.3 `outputs=ServiceObservationLedger; IncidentAndProblemRecords; SLOEvidence; BackupRestoreEvidence; SecurityMaintenanceEvidence; DecisionAndRoadmapFeedback`.

4.7.4 `exit=אין סיום Product מוחלט; כל Release/Incident/Policy delta יוצר Lifecycle generation ונכנס חזרה ל־Master evidence`.

4.7.5 `failure=INCIDENT-RESPONSE-ACTIVE|SERVICE-SUSPENDED|ROLLBACK-REQUIRED`.

4.7.6 `rework=לפי Runbook accepted ו־Program Task successors; Authority אינה יורשת מ־Gate30`.

# 5. Typed edge and join registry

## 5.1 Node sets

5.1.1 `PlanningNodeSet={PGV2-00..PGV2-29}` ובו בדיוק 30 Node identities רציפים.

5.1.2 `PostGateNodeSet={PXV2-00..PXV2-05}` ובו בדיוק 6 Node identities רציפים.

5.1.3 `ExternalAuthorityNodeSet={B0,NEW-IMPLEMENTATION-INSTRUCTION,EXTERNAL-PERMITS}`; Nodes אלה אינם מקבלים Completion credit.

5.1.4 כל Join `J-<target>` הוא AND של כל Edge בטבלה בעל אותו Target, למעט Edge שמסומן `CONDITIONAL` ודורש Condition record מפורש.

## 5.2 Forward edge registry

| edgeId | from | required output/state | to | edgeType | join/condition |
|---|---|---|---|---|---|
| `MPSC2-E001` | `B0` | valid authority | `PGV2-00` | `HARD` | `J-PG00` |
| `MPSC2-E002` | `PGV2-00` | accepted RecoveryBaseline | `PGV2-01` | `HARD` | `J-PG01` |
| `MPSC2-E003` | `PGV2-01` | accepted ReviewInputFreeze | `PGV2-02` | `HARD` | `J-PG02` |
| `MPSC2-E004` | `PGV2-00` | accepted RecoveryBaseline | `PGV2-03` | `HARD` | `J-PG03` |
| `MPSC2-E005` | `PGV2-01` | accepted ReviewInputFreeze | `PGV2-03` | `HARD` | `J-PG03` |
| `MPSC2-E006` | `PGV2-03` | accepted Bootstrap lifecycle | `PGV2-04` | `HARD` | `J-PG04` |
| `MPSC2-E007` | `PGV2-01` | accepted ReviewInputFreeze | `PGV2-04` | `HARD` | `J-PG04` |
| `MPSC2-E008` | `PGV2-03` | accepted lifecycle | `PGV2-05` | `HARD` | `J-PG05` |
| `MPSC2-E009` | `PGV2-04` | accepted Review Protocol | `PGV2-05` | `HARD` | `J-PG05` |
| `MPSC2-E010` | `PGV2-03` | accepted lifecycle | `PGV2-06` | `HARD` | `J-PG06` |
| `MPSC2-E011` | `PGV2-04` | accepted Review Protocol | `PGV2-06` | `HARD` | `J-PG06` |
| `MPSC2-E012` | `PGV2-01` | accepted ReviewInputFreeze | `PGV2-06` | `HARD` | `J-PG06` |
| `MPSC2-E013` | `PGV2-02` | accepted raw custody | `PGV2-07` | `HARD` | `J-PG07` |
| `MPSC2-E014` | `PGV2-04` | accepted Review Protocol | `PGV2-07` | `HARD` | `J-PG07` |
| `MPSC2-E015` | `PGV2-01` | accepted ReviewInputFreeze | `PGV2-07` | `HARD` | `J-PG07` |
| `MPSC2-E016` | `PGV2-03` | accepted lifecycle | `PGV2-08` | `HARD` | `J-PG08` |
| `MPSC2-E017` | `PGV2-04` | accepted Review Protocol | `PGV2-08` | `HARD` | `J-PG08` |
| `MPSC2-E018` | `PGV2-06` | accepted Source definition | `PGV2-08` | `HARD` | `J-PG08` |
| `MPSC2-E019` | `PGV2-07` | accepted audit reconciliation | `PGV2-08` | `HARD` | `J-PG08` |
| `MPSC2-E020` | `PGV2-08` | accepted TRD2 input manifest | `PGV2-09` | `HARD` | `J-PG09` |
| `MPSC2-E021` | `PGV2-04` | accepted Review Protocol | `PGV2-09` | `HARD` | `J-PG09` |
| `MPSC2-E022` | `PGV2-03` | accepted lifecycle | `PGV2-10` | `HARD` | `J-PG10` |
| `MPSC2-E023` | `PGV2-04` | accepted Review Protocol | `PGV2-10` | `HARD` | `J-PG10` |
| `MPSC2-E024` | `PGV2-09` | accepted TRD2 requirements | `PGV2-10` | `HARD` | `J-PG10` |
| `MPSC2-E025` | `PGV2-06` | accepted Source definition | `PGV2-11` | `HARD` | `J-PG11` |
| `MPSC2-E026` | `PGV2-10` | accepted TRD2 definition | `PGV2-11` | `HARD` | `J-PG11` |
| `MPSC2-E027` | `PGV2-11` | frozen candidate inventory | `PGV2-12` | `HARD` | `J-PG12` |
| `MPSC2-E028` | `PGV2-10` | accepted TRD2 definition | `PGV2-13` | `HARD` | `J-PG13` |
| `MPSC2-E029` | `PGV2-12` | accepted SourceSet | `PGV2-13` | `HARD` | `J-PG13` |
| `MPSC2-E030` | `PGV2-13` | accepted semantic universe | `PGV2-14` | `HARD` | `J-PG14` |
| `MPSC2-E031` | `PGV2-10` | accepted TRD2 definition | `PGV2-15` | `HARD` | `J-PG15` |
| `MPSC2-E032` | `PGV2-13` | accepted semantic universe | `PGV2-15` | `HARD` | `J-PG15` |
| `MPSC2-E033` | `PGV2-14` | accepted scope registry | `PGV2-15` | `HARD` | `J-PG15` |
| `MPSC2-E034` | `PGV2-15` | accepted planning permit | `PGV2-16` | `HARD` | `J-PG16` |
| `MPSC2-E035` | `PGV2-10` | accepted TRD2 definition | `PGV2-16` | `HARD` | `J-PG16` |
| `MPSC2-E036` | `PGV2-13` | accepted semantic universe | `PGV2-16` | `HARD` | `J-PG16` |
| `MPSC2-E037` | `PGV2-14` | accepted scope registry | `PGV2-16` | `HARD` | `J-PG16` |
| `MPSC2-E038` | `PGV2-16` | frozen Program candidate | `PGV2-17` | `HARD` | `J-PG17` |
| `MPSC2-E039` | `PGV2-12` | accepted framework sources | `PGV2-17` | `HARD` | `J-PG17` |
| `MPSC2-E040` | `PGV2-16` | frozen Program candidate | `PGV2-18` | `HARD` | `J-PG18` |
| `MPSC2-E041` | `PGV2-17` | passed crosswalk set | `PGV2-18` | `HARD` | `J-PG18` |
| `MPSC2-E042` | `PGV2-16` | frozen Program candidate | `PGV2-19` | `PARALLEL-JOIN` | `J-PG19` |
| `MPSC2-E043` | `PGV2-17` | passed crosswalk set | `PGV2-19` | `PARALLEL-JOIN` | `J-PG19` |
| `MPSC2-E044` | `PGV2-18` | frozen schedule roots | `PGV2-19` | `PARALLEL-JOIN` | `J-PG19` |
| `MPSC2-E045` | `PGV2-19` | QA passed | `PGV2-20` | `HARD` | `J-PG20` |
| `MPSC2-E046` | `PGV2-04` | accepted Review Protocol | `PGV2-21` | `HARD` | `J-PG21` |
| `MPSC2-E047` | `PGV2-20` | complete independent reviews | `PGV2-21` | `HARD` | `J-PG21` |
| `MPSC2-E048` | `PGV2-21` | reconciled successor root | `PGV2-22` | `HARD` | `J-PG22` |
| `MPSC2-E049` | `PGV2-22` | approval/veto closure | `PGV2-23` | `HARD` | `J-PG23` |
| `MPSC2-E050` | `PGV2-04` | accepted Review Protocol | `PGV2-24` | `HARD` | `J-PG24` |
| `MPSC2-E051` | `PGV2-12` | accepted source/control roots | `PGV2-24` | `HARD` | `J-PG24` |
| `MPSC2-E052` | `PGV2-13` | accepted Decisions | `PGV2-24` | `HARD` | `J-PG24` |
| `MPSC2-E053` | `PGV2-17` | frozen Public crosswalk | `PGV2-24` | `HARD` | `J-PG24` |
| `MPSC2-E054` | `PGV2-05` | current Planning work/schedule root | `PGV2-25` | `HARD` | `J-PG25` |
| `MPSC2-E055` | `PGV2-10` | accepted TRD2 definition | `PGV2-25` | `HARD` | `J-PG25` |
| `MPSC2-E056` | `PGV2-12` | accepted SourceSet | `PGV2-25` | `HARD` | `J-PG25` |
| `MPSC2-E057` | `PGV2-13` | accepted semantic universe | `PGV2-25` | `HARD` | `J-PG25` |
| `MPSC2-E058` | `PGV2-14` | accepted scope/package root | `PGV2-25` | `HARD` | `J-PG25` |
| `MPSC2-E059` | `PGV2-17` | passed crosswalk roots | `PGV2-25` | `HARD` | `J-PG25` |
| `MPSC2-E060` | `PGV2-18` | current schedule roots | `PGV2-25` | `HARD` | `J-PG25` |
| `MPSC2-E061` | `PGV2-23` | accepted Program root | `PGV2-25` | `HARD` | `J-PG25` |
| `MPSC2-E062` | `PGV2-24` | accepted Public hardening specification | `PGV2-25` | `HARD` | `J-PG25` |
| `MPSC2-E063` | `PGV2-25` | frozen Master candidate | `PGV2-26` | `HARD` | `J-PG26` |
| `MPSC2-E064` | `PGV2-04` | accepted Review Protocol | `PGV2-26` | `HARD` | `J-PG26` |
| `MPSC2-E065` | `PGV2-26` | reconciled Master root | `PGV2-27` | `HARD` | `J-PG27` |
| `MPSC2-E066` | `PGV2-27` | exact approval root | `PGV2-28` | `HARD` | `J-PG28` |
| `MPSC2-E067` | `PGV2-28` | Gate29 accepted/current | `PGV2-29` | `HARD` | `J-PG29` |
| `MPSC2-E068` | `PGV2-05` | final Planning work closure snapshot | `PGV2-29` | `HARD` | `J-PG29` |
| `MPSC2-E069` | `PGV2-29` | HANDED-OFF receipt | `PXV2-00` | `POST-GATE-HANDOFF` | `J-PX00` |
| `MPSC2-E070` | `NEW-IMPLEMENTATION-INSTRUCTION` | exact instruction receipt | `PXV2-00` | `POST-GATE-HANDOFF` | `J-PX00` |
| `MPSC2-E071` | `PXV2-00` | authorized hardening task | `PXV2-01` | `CONDITIONAL` | `C-GIT-MUTATION-REQUIRED` |
| `MPSC2-E072` | `PGV2-24` | accepted hardening specification | `PXV2-01` | `POST-GATE-HANDOFF` | `J-PX01` |
| `MPSC2-E073` | `EXTERNAL-PERMITS` | one-use admin permit | `PXV2-01` | `POST-GATE-HANDOFF` | `J-PX01` |
| `MPSC2-E074` | `PXV2-01` | fresh Public hardening gate | `PXV2-02` | `CONDITIONAL` | `C-PUSH-REQUESTED` |
| `MPSC2-E075` | `EXTERNAL-PERMITS` | exact-diff Push permit | `PXV2-02` | `POST-GATE-HANDOFF` | `J-PX02` |
| `MPSC2-E076` | `PXV2-00` | authorized execution slice | `PXV2-03` | `POST-GATE-HANDOFF` | `J-PX03` |
| `MPSC2-E077` | `PXV2-02` | remote Push readbacks | `PXV2-03` | `CONDITIONAL` | `C-TASK-REQUIRES-PUSH` |
| `MPSC2-E078` | `PXV2-03` | release-candidate evidence | `PXV2-04` | `CONDITIONAL` | `C-GO-LIVE-IN-SCOPE` |
| `MPSC2-E079` | `PXV2-04` | GO-LIVE-ACCEPTED | `PXV2-05` | `POST-GATE-HANDOFF` | `J-PX05` |

## 5.3 Graph invariants

5.3.1 שני Graph readers בלתי תלויים חייבים לקרוא את 79 הקשתות ולהפיק אותו Node set, Edge set, Join set ו־Condition set.

5.3.2 בגרף ה־Forward ללא `INVALIDATION-RETURN`: `cycle=0`, ‏`selfEdge=0`, ‏`danglingNode=0`, ‏`duplicateEdge=0`, וכל `PGV2` reachable מ־`B0`.

5.3.3 `ReviewInputFreeze` מופיע רק לפני ביקורות היסוד; `ProgramAdmittedSourceSet` נוצר ב־PGV2-12 ואין שום Edge ממנו חזרה ל־PGV2-07.

5.3.4 PGV2-18 ו־PGV2-24 רשאים להתקדם במקביל לאחר PGV2-17; PGV2-25 הוא Join שמחייב את שניהם ואת Program acceptance.

5.3.5 כל Conditional edge דורש Condition record בעל `value`, ‏`sourceRoot`, ‏`decidedBy`, ‏`asOf`, ‏`validThrough`; Unknown condition חוסם את Branch ואינו נחשב False.

5.3.6 Topological view נוצר מן הטבלה בלבד; Core-flow prose אינו מקור סמכות.

5.3.7 כל Rework/Invalidation edge נשמר בגרף נפרד עם Generation עולה ואינו נכנס ל־DAG ה־Forward; לכן הוא אינו Cycle סמוי.

# 6. Deterministic rework routing

## 6.1 Earliest-affected-phase table

| defectClass | unique return phase | mandatory invalidated descendants |
|---|---|---|
| `BOOTSTRAP-AUTHORITY` | `PGV2-00` | `PGV2-00..PGV2-29` |
| `REVIEW-INPUT-BYTES-OR-CUSTODY` | `PGV2-01` | every consumer selected by reverse graph |
| `RAW-REVIEW-IDENTITY-OR-ENVELOPE` | `PGV2-02` | `PGV2-07` and every semantic descendant |
| `BOOTSTRAP-LIFECYCLE` | `PGV2-03` | `PGV2-04..PGV2-29` where lifecycle-dependent |
| `REVIEW-PROTOCOL` | `PGV2-04` | every later review/reconciliation/acceptance receipt |
| `PLANNING-WORK-RESOURCE-WAIT` | `PGV2-05` | Planning metric/schedule snapshots and handoff metric |
| `SOURCE-UNIVERSE-DEFINITION` | `PGV2-06` | `PGV2-08` and every source-dependent descendant |
| `RAW-AUDIT-NORMALIZATION` | `PGV2-07` | `PGV2-08..PGV2-10` and derived descendants |
| `TRD2-INPUT-MEMBER-OR-APPLICABILITY` | `PGV2-08` | `PGV2-09..PGV2-29` where dependent |
| `TRD2-REQUIREMENT` | `PGV2-09` | `PGV2-10..PGV2-29` |
| `TRD2-DEFINITION` | `PGV2-10` | `PGV2-11..PGV2-29` |
| `SOURCE-CANDIDATE-DISCOVERY` | `PGV2-11` | `PGV2-12..PGV2-29` source descendants |
| `SOURCE-SELECTION-PRECEDENCE` | `PGV2-12` | `PGV2-13..PGV2-29` |
| `SEMANTIC-EXTRACTION-DECISION` | `PGV2-13` | `PGV2-14..PGV2-29` |
| `SCOPE-STAGE-PACKAGE` | `PGV2-14` | `PGV2-15..PGV2-29` |
| `MATERIALIZATION-SPEC-OR-PERMIT` | `PGV2-15` | `PGV2-16..PGV2-29` |
| `PROGRAM-TASK-OUTPUT-TEST-EVIDENCE` | `PGV2-16` | `PGV2-17..PGV2-29` |
| `CROSSWALK-COVERAGE-CONTROL` | `PGV2-17` | `PGV2-18..PGV2-29` plus `PGV2-24` |
| `ESTIMATE-CAPACITY-CALENDAR-WAIT` | `PGV2-18` | `PGV2-19..PGV2-29` schedule consumers |
| `PROGRAM-PRODUCER-QA` | `PGV2-19` | `PGV2-20..PGV2-23` and Master consumers |
| `PROGRAM-REVIEW-PACKET-ELIGIBILITY` | `PGV2-20` | `PGV2-21..PGV2-23` and Master consumers |
| `PROGRAM-RECONCILIATION` | `PGV2-21` | `PGV2-22..PGV2-23` and Master consumers |
| `PROGRAM-APPROVAL-VETO` | `PGV2-22` | `PGV2-23` and Master consumers |
| `PROGRAM-ACCEPTANCE-POINTER` | `PGV2-23` | every Master consumer; Terminal reconcile first |
| `PUBLIC-HARDENING-SPECIFICATION` | `PGV2-24` | `PGV2-25..PGV2-29` and all Public gate descendants |
| `MASTER-ASSEMBLY` | `PGV2-25` | `PGV2-26..PGV2-29` |
| `MASTER-QA-REVIEW-RECONCILIATION` | `PGV2-26` | `PGV2-27..PGV2-29` |
| `MASTER-APPROVAL-VETO` | `PGV2-27` | `PGV2-28..PGV2-29` |
| `GATE29-CAS-READBACK` | `PGV2-28` | `PGV2-29` and all Post-Gate handoff grants; Terminal reconcile first |
| `HANDOFF-RECEIPT` | `PGV2-29` | Post-Gate instruction eligibility only |
| `POST-GATE-AUTHORITY-OR-SCOPE` | `PXV2-00` | affected `PXV2` generations; never a pre-Gate automatic retry |
| `PUBLIC-LIVE-SETTINGS-OR-PUSH` | `PXV2-01` | `PXV2-02..PXV2-05`; new one-use permit required |

## 6.2 Routing invariants

6.2.1 כל Finding מקבל `defectClass` אחד מן הטבלה; Class עמום או מרובה חוסם Rework עד Reconciliation.

6.2.2 `mandatory invalidated descendants` מחושב מ־Dependency root ולא מרשימת הטקסט בלבד; הטבלה מגדירה את נקודת החזרה המוקדמת המינימלית.

6.2.3 Successor generation אינו רשאי לצרוך QA, Review, Approval, Permit או readback של Subject root קודם.

6.2.4 `monotonicMeasure=(blockingFindingCount,unresolvedConflictCount,unknownCriticalInputCount)` חייב לרדת Lexicographically או להסתיים לפי 2.5.3.

6.2.5 Mutation suite נדרשת לבחור בדיוק Route אחד לכל שורה ולוודא Invalidation של כל ורק ה־Descendants.

# 7. External acceptance lifecycle של Control Sequence v2

## 7.1 איסור Self-acceptance

7.1.1 רצף זה נשאר Candidate עד שה־Bytes הסופיים מוקפאים, מחושבים ומקבלים Root חיצוני.

7.1.2 `ControlSequenceAcceptance` אינו Phase ב־`PlanningNodeSet` ואינו משתמש ב־PGV2-04 Candidate כדי לבקר או לאשר את עצמו.

7.1.3 סמכותו נגזרת רק מ־B0 ומ־BootstrapReviewProtocol חיצוניים שמאפשרים במפורש Subject class=`CONTROL-SEQUENCE-SUCCESSOR`.

## 7.2 Required acceptance packet

7.2.1 ה־Packet כולל `ControlSequenceSubjectRoot`, ‏`SourceRootManifest`, ‏`ProducerQARoot`, ‏`GraphReaderARoot`, ‏`GraphReaderBRoot`, ‏`HostileReviewARoot`, ‏`HostileReviewBRoot`, ‏`FindingComparisonRoot`, ‏`ReconciliationRoot`, ‏`VetoSetRoot`, ‏`TalExactRootApprovalReceipt` ו־`AuthorityEpoch`.

7.2.2 כל Review נוצר אחרי Subject freeze, על אותם bytes, בידי Appointment eligible, וללא קריאת ביקורת האחר לפני Sealing.

7.2.3 כל `MPSC-HR-F001`–`MPSC-HR-F032` חייב לקבל one-to-one Disposition ו־evidentiary Closure; Section 8 הוא Candidate crosswalk בלבד.

7.2.4 Acceptance writer מבצע one-use CAS מול expected ControlSequence pointer ושתי קריאות readback; Response loss עובר Terminal reconcile.

7.2.5 Consumer דוחה Draft, Rejected, Stale, Expired או Root שאינו תואם exact Acceptance packet.

## 7.3 Current claim

7.3.1 `ControlSequenceSubjectRoot=unknown/unavailable` עד freeze מלא של קובץ זה.

7.3.2 `ControlSequenceAcceptance=NOT-STARTED`; ‏`acceptedControlSequenceGenerations=0`.

7.3.3 `Gate29=BLOCKED`; ‏`developmentFreeze=ACTIVE`; ‏`External-state mutation authority=NONE`.

# 8. One-to-one closure candidate עבור 32 ממצאי v1

## 8.1 Closure table

| findingId | successor sections | required successor evidence | candidate disposition |
|---|---|---|---|
| `MPSC-HR-F001` | `1.4;1.5;3.2–3.6;7` | detached B0 graph + zero self-authority + external acceptance packet | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F002` | `1.5;3.5;3.6` | bootstrap-only Protocol roots + zero undefined/cyclic review edge | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F003` | `3.3;3.9;3.13;3.14;5` | distinct ReviewInputFreeze/ProgramAdmittedSourceSet + DAG parity | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F004` | `3.10;3.11;3.12` | non-empty TRD2RequirementInputManifest + applicability total + inverse coverage | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F005` | `2.2;3.1` | atomic output registry + two-reader output-root parity | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F006` | `2.3;2.4` | detached lifecycle envelopes + conflict matrix + CAS readbacks | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F007` | `2.5;2.6;6` | total defect routing + monotonic closure + safe terminal corpus | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F008` | `2.6;6.2` | reverse invalidation graph + trigger mutation corpus | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F009` | `3.23;3.24;3.25;5.2` | complete Program acceptance path before PGV2-25 consumer | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F010` | `2.10;3.26;4.3;4.4;5.2` | live Public gate + one-use permits + mutation + two readbacks + visibility invariant | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F011` | `2.3;3.30` | full Gate29 envelope + one-use CAS + two readbacks + XOR terminal | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F012` | `1.3;3.17;3.31;4.1` | reachable pre-Gate executable action count=0 + explicit Post-Gate authority boundary | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F013` | `2.9;3.7;5.2` | accepted PlanningWorkRegistry + resource/wait denominators + dual schedule | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F014` | `2.4;2.5;3` | total state/event matrix + per-Phase failure/rework + model-check result | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F015` | `1.4;7` | external exact-root reviews/reconciliation/Tal approval/CAS pointer | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F016` | `5.1;5.2;5.3` | exact node/edge/join/condition parity + reachability/cycle proof | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F017` | `3.3;3.14;5.3` | typed source-set identities + DAG-derived core view | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F018` | `2.4;2.7` | EntryReceipt rule + PREPARATORY-UNACCEPTED observations | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F019` | `2.4` | state type checker with zero coercion | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F020` | `3.27` | explicit MasterAssemblyInputManifest with no ranges and exact member states | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F021` | `3.24;3.29` | derived non-empty approval denominator + named appointments + root-matched receipts | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F022` | `2.8;3.31;4.6;4.7` | Gate30/Release/Post-GA Program paths + handoff-only assertion | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F023` | `3.19;3.26` | one-to-one D18/BCA2 control crosswalk with owner/test/evidence/decision | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F024` | `2.10;3.26;4.3` | canonical RepoAuthorityRegistry + wrong-root negative proof + two live reads | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F025` | `2.2;3.1` | atomic outputs + primary/supporting joins + unique producers | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F026` | `2.9;3.20` | exact MATH-bound ScheduleSnapshot + two-scheduler parity + wait rule | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F027` | `1.1;2.9` | accepted denominator root/query/asOf/name or typed unknown | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F028` | `2.9;3.10;3.19` | manifest-derived counts + regeneration invalidation parity | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F029` | `3.31;4.1;5.2` | bounded HANDED-OFF/BLOCKED terminal + exact future instruction/Task/Permit edges | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F030` | `1.3` | four-domain terminology lint with one class per Act | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F031` | `2.8` | five distinct typed gates + zero implicit state inheritance | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |
| `MPSC-HR-F032` | `1.1;2.7` | append-only external observation records + stale/unknown semantics | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-REVIEW` |

## 8.2 Closure limits

8.2.1 הטבלה מכילה בדיוק 32 Candidate dispositions ואינה ממזגת Finding אחד באחר.

8.2.2 `ADDRESSED-IN-CANDIDATE` פירושו שקיים נוסח מתקן; הוא אינו `CLOSED-BY-EVIDENCE`, אינו Review PASS ואינו Acceptance.

8.2.3 כל Reviewer רשאי לפתוח Finding חדש או לסווג תיקון Partial; אין Auto-close מכוח Section reference.

8.2.4 `openPredecessorFindings=32` עד השלמת Section 7.2 וקבלה חיצונית.

# 9. Conformance and acceptance test specification

## 9.1 Structural test set

9.1.1 `MPSC2-T-STRUCT-001`: קיימים בדיוק 30 Phase headings רציפים `PGV2-00`–`PGV2-29`, ללא חור או כפילות.

9.1.2 `MPSC2-T-STRUCT-002`: קיימים בדיוק 6 Post-Gate headings רציפים `PXV2-00`–`PXV2-05`, ללא חור או כפילות.

9.1.3 `MPSC2-T-STRUCT-003`: לכל PGV2 Phase בדיוק ששת שדות הרשומה `objective,entry,outputs,exit,failure,rework`.

9.1.4 `MPSC2-T-STRUCT-004`: Edge IDs הם בדיוק `MPSC2-E001`–`MPSC2-E079`, ללא חור או כפילות.

9.1.5 `MPSC2-T-STRUCT-005`: כל Edge endpoint פותר ל־Planning, Post-Gate או External node מוכר; dangling/self/duplicate edge count=0.

9.1.6 `MPSC2-T-STRUCT-006`: כל סעיף ממוספר במסמך בעל Identity ייחודי; duplicate numbered clause count=0.

9.1.7 `MPSC2-T-STRUCT-007`: Closure table מכיל בדיוק את `MPSC-HR-F001`–`MPSC-HR-F032` פעם אחת כל אחד.

9.1.8 `MPSC2-T-STRUCT-008`: בכל Closure row ה־Disposition הוא Candidate-only ואינו משתמש ב־`CLOSED`, ‏`PASS` או `ACCEPTED`.

## 9.2 Graph and lifecycle test set

9.2.1 `MPSC2-T-GRAPH-001`: שני Readers מפיקים אותו Forward DAG, אותו Topological order class, אותם 79 Edges ואותם Joins.

9.2.2 `MPSC2-T-GRAPH-002`: כל Planning Phase reachable מ־B0 וכל Post-Gate Phase reachable רק דרך PGV2-29+new instruction.

9.2.3 `MPSC2-T-GRAPH-003`: אין Path מ־ProgramAdmittedSourceSet אל PGV2-07 ואין Cycle סמנטי בין Source selection ל־Audit reconciliation.

9.2.4 `MPSC2-T-GRAPH-004`: PGV2-25 בלתי reachable ללא Program accepted root, Public hardening specification ו־Planning work closure root.

9.2.5 `MPSC2-T-GRAPH-005`: לכל Phase State/Event pair Transition מוגדר או ILLEGAL; undefined count=0.

9.2.6 `MPSC2-T-GRAPH-006`: כל Rework class בוחר Return phase אחד, מגדיל Generation ומבטל את כל Descendants המושפעים.

9.2.7 `MPSC2-T-GRAPH-007`: שלושה Attempts ללא Monotonic progress מסתיימים BLOCKED ולא Loop אינסופי.

## 9.3 Authority and exact-root negative test set

9.3.1 `MPSC2-T-AUTH-001`: B0 חסר, פג, מבוטל או Subject לא־תואם חוסם PGV2-00.

9.3.2 `MPSC2-T-AUTH-002`: Review Protocol Candidate שמנסה לאשר את עצמו נחסם.

9.3.3 `MPSC2-T-AUTH-003`: Producer שמופיע ב־Role אסור לפי Conflict matrix חוסם Acceptance.

9.3.4 `MPSC2-T-AUTH-004`: Approval כללי שאינו קושר Subject/Evidence/Review roots מדויקים מקבל zero authority.

9.3.5 `MPSC2-T-AUTH-005`: Expired/revoked appointment, receipt או authority epoch חוסם.

9.3.6 `MPSC2-T-AUTH-006`: CAS wrong expected head, ABA, replay, duplicate attempt, timeout או response loss אינו מייצר accepted/current.

9.3.7 `MPSC2-T-AUTH-007`: Readback יחיד או שני Readbacks שונים חוסמים Handoff.

9.3.8 `MPSC2-T-AUTH-008`: מעבר Definition Gate, Program Gate, Public Gate או Gate29 אינו גורר מצב של Gate אחר.

## 9.4 Planning-only boundary negative test set

9.4.1 `MPSC2-T-FREEZE-001`: כל pre-Gate Act שמסווג Code write, Build, Runtime test, Commit, Push, GitHub mutation, Provider או Deploy נחסם.

9.4.2 `MPSC2-T-FREEZE-002`: ניסוח `prepare`, ‏`specify` או `plan` שמכיל בפועל executable mutation מסווג לפי Effect ולא לפי שם ונחסם.

9.4.3 `MPSC2-T-FREEZE-003`: PGV2-29 מסיים רק `HANDED-OFF|BLOCKED`; אינו מתחיל PXV2-00 בלי Instruction receipt חדש.

9.4.4 `MPSC2-T-FREEZE-004`: Program Task קיים אך לא accepted/current אינו מעניק Execution authority.

## 9.5 Public repository negative test set

9.5.1 `MPSC2-T-PUBLIC-001`: Target שהוא outer root, owner/repo אחר, branch אחר או HEAD אחר נחסם `BLOCKED-WRONG-REPOSITORY`.

9.5.2 `MPSC2-T-PUBLIC-002`: ניסיון לשנות visibility מ־Public ל־Private נכשל גם אם יתר ההקשחה תקינה.

9.5.3 `MPSC2-T-PUBLIC-003`: Push לפני Public gate fresh נכשל `PUSH-BLOCKED`.

9.5.4 `MPSC2-T-PUBLIC-004`: Secret/code/dependency scanning או ruleset feature חסר ללא Compensating Decision accepted חוסם.

9.5.5 `MPSC2-T-PUBLIC-005`: stale live settings, readback mismatch או settings drift מבטל Public gate ואת Push permit.

9.5.6 `MPSC2-T-PUBLIC-006`: diff, expected HEAD, Actor או branch שאינם תואמים Permit חוסמים ומכלים Attempt בלי Push חוזר.

9.5.7 `MPSC2-T-PUBLIC-007`: Secret או sensitive data ב־commit history, PR ref, fork path, LFS, release, package או artifact transparency surface חוסם Public egress.

## 9.6 Metrics and freshness negative test set

9.6.1 `MPSC2-T-METRIC-001`: Constant count שאינו נגזר מ־Manifest root נפסל.

9.6.2 `MPSC2-T-METRIC-002`: שינוי Member/root מבטל Count, Coverage, Schedule ו־ETA תלויים.

9.6.3 `MPSC2-T-METRIC-003`: Critical wait ללא Bound מחזיר ETA=`unknown/unavailable` ולא מספר מקורב.

9.6.4 `MPSC2-T-METRIC-004`: Planning phase fraction אינו מתקבל כ־Product completion.

9.6.5 `MPSC2-T-METRIC-005`: Observation חסר או stale מחזיר Status=`UNKNOWN`.

## 9.7 Acceptance conditions for this Candidate

9.7.1 כל Tests ב־9.1–9.6 חייבים לקבל Result root; עצם כתיבתם אינו PASS.

9.7.2 שני Graph readers, שתי ביקורות עצמאיות ו־Reconciliation חייבים לעבוד על אותו frozen Subject root.

9.7.3 `MPSC-HR-F001`–`MPSC-HR-F032` חייבים לקבל Closure evidence one-to-one; Finding חדש נטען למכנה ואינו מוסתר.

9.7.4 Tal נדרש לאשר את Root המדויק לאחר הצגת Evidence/Reviews/Reconciliation; האישור הכללי הקודם מאפשר המשך תכנון בלבד.

9.7.5 עד להשלמת 9.7.1–9.7.4: `sequenceStatus=CANDIDATE`, ‏`Gate29=BLOCKED`, ‏`developmentFreeze=ACTIVE`, ‏`PublicRepoMutation=NOT-AUTHORIZED`.
