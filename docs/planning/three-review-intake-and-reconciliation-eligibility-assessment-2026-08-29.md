# 1. Connect — ביקורת Intake וכשירות Reconciliation לשלוש ביקורות ה־Master

## 1.1 זהות, מושא וסמכות

1.1.1 מזהה המסמך הוא `CONNECT-THREE-REVIEW-INTAKE-AND-RECONCILIATION-ELIGIBILITY-ASSESSMENT-2026-08-29`.

1.1.2 מושא שלוש הביקורות הוא `/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`.

1.1.3 ה־Raw SHA-256 של המושא שנצפה מחדש הוא `643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

1.1.4 הזהות הפיזית של המושא היא `10,425 lines`, ‏`1,059,872 bytes`.

1.1.5 מסמך זה בודק Intake ו־Eligibility בלבד. הוא אינו מבצע Formal normalization, Comparison, Equivalence proof, Reconciliation, Finding closure, Acceptance, Task materialization, חישוב שעות, ETA, Gate credit או שינוי Product/Git/Provider.

1.1.6 לא בוצעו Browse, Build, Runtime test, Git mutation, Commit, Push, Deploy, Provider call, Credential use או שינוי בקובץ קיים.

1.1.7 רק הקובץ הנוכחי נוסף. שבעת Artifacts של Protocol/Reports/Manifests ו־Subject anchor אחד, שמונה קבצים פיזיים בסך הכול, נשמרו ללא שינוי.

## 1.2 פסק דין תמציתי

1.2.1 `byte-intake=PASS` עבור שבעת Artifacts של Protocol/Reports/Manifests ועבור Subject anchor אחד שנצפו ונקשרו ל־Raw roots שבסעיף 2.

1.2.2 `local-finding-cardinality=PASS`: ‏`23 + 24 + 26 = 73` תצפיות Reviewer-local.

1.2.3 `exact-local-id-uniqueness=PASS`: ‏`73/73` מזהים ייחודיים; exact duplicate count=`0`.

1.2.4 `review-envelope-eligibility=FAIL`: ‏`0/3` מעטפות Review עומדות ב־16/16 שדות של הפרוטוקול.

1.2.5 `finding-normalization-eligibility=FAIL`: אף Manifest אינו עומד בסכמת Finding המלאה של הפרוטוקול.

1.2.6 `protocol-executability=FAIL`: הפרוטוקול הוא Draft לא־מאושר ומכיל סתירות וחוסרים בתוך Identity constructor עצמו.

1.2.7 `formal-comparison=BLOCKED`.

1.2.8 `formal-reconciliation=BLOCKED`.

1.2.9 `semantic-finding-union-count=unknown/unavailable`. המספר 73 הוא Union קשיח של תצפיות מקומיות בלבד, לא מספר חולשות סמנטיות לאחר Reconciliation.

1.2.10 `Gate29=BLOCKED`, ‏`development-freeze=ACTIVE`, ‏`new-gate-credit=0`.

# 2. Frozen input set

## 2.1 Subject ופרוטוקול

| Input | Lines | Bytes | Raw SHA-256 | Intake disposition |
|---|---:|---:|---|---|
| `connect-master-execution-plan-2026-08-26.md` | 10,425 | 1,059,872 | `643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67` | exact subject root |
| `master-plan-three-review-reconciliation-protocol-2026-08-29.md` | 327 | 11,540 | `6f08bf3a00c995503a37ff930a826d915d85591277908b7813e52a0a6b6b8539` | draft target only; not accepted authority |

## 2.2 R1 — StructuralCompletenessReview

| Input | Lines | Bytes | Raw SHA-256 | Intake disposition |
|---|---:|---:|---|---|
| `master-plan-structural-audit-2026-08-29.md` | 637 | 35,732 | `6438c5b8fbf92d41d923884ae587abfc08b19507539f8260055194bd86533b4b` | retain raw review; envelope-ineligible |
| `master-plan-structural-audit-findings-manifest-2026-08-29.md` | 103 | 28,738 | `1b8a196dc7ba6c2a647cf100d382d3f9ace7dd38fcf6fc97ec27fb6ac44329e8` | retain 23 local observations; normalization-ineligible |

2.2.1 דוח R1 מצהיר שקרא את כל 10,425 השורות, אך אינו מוסר `bytesObserved` ואינו מכיל Review envelope מלאה.

2.2.2 Manifest R1 מפנה לנתיב הדוח וה־Subject, אך אינו מקבע את Raw SHA של אחד מהם בתוך זהות ה־Manifest.

## 2.3 R2 — SecuritySemanticReview

| Input | Lines | Bytes | Raw SHA-256 | Intake disposition |
|---|---:|---:|---|---|
| `master-plan-security-semantic-audit-2026-08-29.md` | 493 | 38,854 | `d0d19b90b07f6e59bdef63b5eaaabe5c2ffa162fe90371fdd135876c264855b6` | retain raw review; envelope-ineligible |
| `master-plan-security-audit-findings-manifest-2026-08-29.md` | 607 | 42,715 | `6e93c50f6b73767e5e059b2740c0589f3382282cf47c6fb42c6f058608c6b3e8` | retain 24 local observations; normalization-ineligible |

2.3.1 Manifest R2 מקבע נכון את Subject raw root ואת Raw root של דוח R2 שנצפו לעיל.

2.3.2 דוח R2 אינו מצהיר במפורש `100% of subject bytes read`; Coverage rules ומדידות רבות אינן תחליף לשדה מעטפה זה.

## 2.4 R3 — ScheduleEstimateReview

| Input | Lines | Bytes | Raw SHA-256 | Intake disposition |
|---|---:|---:|---|---|
| `master-plan-schedule-and-estimate-audit-2026-08-29.md` | 630 | 43,188 | `35869ec7bbd04eaf5db3f7e6637276bb7d35c7d942f20fc6ab1457c24da95fee` | retain raw review; envelope-ineligible |
| `master-plan-schedule-audit-findings-manifest-2026-08-29.md` | 653 | 39,823 | `efba1c56115b8a1ddcb8a042baf4a410321b09bd850fcda5d0b85df2757cf4d7` | retain 26 local observations; normalization-ineligible |

2.4.1 Manifest R3 מקבע נכון את Subject raw root ואת Raw root של דוח R3 שנצפו לעיל.

2.4.2 דוח R3 מצהיר על מעבר מתחילת Subject ועד סופו, אך אינו מכיל את יתר שדות המעטפה החסרים.

## 2.5 כלל Root binding

2.5.1 ה־Roots שבסעיפים 2.1–2.4 הם Observations של Intake זה. הם אינם ממלאים בדיעבד שדה חסר בתוך Review או Manifest.

2.5.2 אין להסיק ש־Review ידע את Root של Manifest שנוצר אחריו רק מפני שה־Intake יכול לחשב אותו כעת.

2.5.3 שינוי Byte בכל אחד משבעת Artifacts של Protocol/Reports/Manifests או ב־Subject anchor מבטל את הערכת הכשירות הנוכחית ודורש Intake חדש; הוא אינו מאפשר Patch ל־Receipt קיים.

# 3. Union קשיח של 73 זהויות מקומיות

## 3.1 חוזה Union זמני

3.1.1 ה־Union בסעיף זה שומר כל Reviewer-local observation פעם אחת ללא Merge, Alias, Dedup, Equivalence, Parent credit או Closure transfer.

3.1.2 מפתח השימור הזמני הוא הצמד `(rawReviewRoot, manifestLocalId)`. הוא אינו `semanticFindingId` של הפרוטוקול ואינו קלט Comparison.

3.1.3 Similarity בכותרת, Locator, Severity, Defect, Impact או Remediation אינה משנה את Cardinality 73.

## 3.2 R1 — 23/23

3.2.1 `MPSA-20260829-P0-001`.

3.2.2 `MPSA-20260829-P0-002`.

3.2.3 `MPSA-20260829-P0-003`.

3.2.4 `MPSA-20260829-P0-004`.

3.2.5 `MPSA-20260829-P0-005`.

3.2.6 `MPSA-20260829-P0-006`.

3.2.7 `MPSA-20260829-P0-007`.

3.2.8 `MPSA-20260829-P1-001`.

3.2.9 `MPSA-20260829-P1-002`.

3.2.10 `MPSA-20260829-P1-003`.

3.2.11 `MPSA-20260829-P1-004`.

3.2.12 `MPSA-20260829-P1-005`.

3.2.13 `MPSA-20260829-P1-006`.

3.2.14 `MPSA-20260829-P1-007`.

3.2.15 `MPSA-20260829-P1-008`.

3.2.16 `MPSA-20260829-P1-009`.

3.2.17 `MPSA-20260829-P1-010`.

3.2.18 `MPSA-20260829-P2-001`.

3.2.19 `MPSA-20260829-P2-002`.

3.2.20 `MPSA-20260829-P2-003`.

3.2.21 `MPSA-20260829-P2-004`.

3.2.22 `MPSA-20260829-P3-001`.

3.2.23 `MPSA-20260829-P3-002`.

## 3.3 R2 — 24/24

3.3.1 `MSSA-F001`.

3.3.2 `MSSA-F002`.

3.3.3 `MSSA-F003`.

3.3.4 `MSSA-F004`.

3.3.5 `MSSA-F005`.

3.3.6 `MSSA-F006`.

3.3.7 `MSSA-F007`.

3.3.8 `MSSA-F008`.

3.3.9 `MSSA-F009`.

3.3.10 `MSSA-F010`.

3.3.11 `MSSA-F011`.

3.3.12 `MSSA-F012`.

3.3.13 `MSSA-F013`.

3.3.14 `MSSA-F014`.

3.3.15 `MSSA-F015`.

3.3.16 `MSSA-F016`.

3.3.17 `MSSA-F017`.

3.3.18 `MSSA-F018`.

3.3.19 `MSSA-F019`.

3.3.20 `MSSA-F020`.

3.3.21 `MSSA-F021`.

3.3.22 `MSSA-F022`.

3.3.23 `MSSA-F023`.

3.3.24 `MSSA-F024`.

## 3.4 R3 — 26/26

3.4.1 `MSAF-20260829-F001`.

3.4.2 `MSAF-20260829-F002`.

3.4.3 `MSAF-20260829-F003`.

3.4.4 `MSAF-20260829-F004`.

3.4.5 `MSAF-20260829-F005`.

3.4.6 `MSAF-20260829-F006`.

3.4.7 `MSAF-20260829-F007`.

3.4.8 `MSAF-20260829-F008`.

3.4.9 `MSAF-20260829-F009`.

3.4.10 `MSAF-20260829-F010`.

3.4.11 `MSAF-20260829-F011`.

3.4.12 `MSAF-20260829-F012`.

3.4.13 `MSAF-20260829-F013`.

3.4.14 `MSAF-20260829-F014`.

3.4.15 `MSAF-20260829-F015`.

3.4.16 `MSAF-20260829-F016`.

3.4.17 `MSAF-20260829-F017`.

3.4.18 `MSAF-20260829-F018`.

3.4.19 `MSAF-20260829-F019`.

3.4.20 `MSAF-20260829-F020`.

3.4.21 `MSAF-20260829-F021`.

3.4.22 `MSAF-20260829-F022`.

3.4.23 `MSAF-20260829-F023`.

3.4.24 `MSAF-20260829-F024`.

3.4.25 `MSAF-20260829-F025`.

3.4.26 `MSAF-20260829-F026`.

## 3.5 Cardinality ו־Severity מקומיים

3.5.1 R1=`23`: ‏`P0=7`, ‏`P1=10`, ‏`P2=4`, ‏`P3=2`.

3.5.2 R2=`24`: ‏`P0=10`, ‏`P1=10`, ‏`P2=4`, ‏`P3=0`.

3.5.3 R3=`26`: ‏`P0=12`, ‏`P1=9`, ‏`P2=4`, ‏`P3=1`.

3.5.4 סך תצפיות מקומיות=`73`: ‏`P0=29`, ‏`P1=29`, ‏`P2=12`, ‏`P3=3`.

3.5.5 התפלגות 3.5.4 אינה התפלגות Semantic findings; Findings חופפים טרם נורמלו או הושוו.

# 4. כשירות מעטפות Review לפי Protocol §2.2

## 4.1 מקרא

4.1.1 `PRESENT` פירושו שקיים ערך מפורש שניתן לשמר כמועמד למעטפה.

4.1.2 `PARTIAL` פירושו שקיים Prose דומה אך הוא אינו עומד בחוזה המלא או אינו קשור לזהות/Root הנדרשים.

4.1.3 `MISSING` פירושו שאין ערך; אסור להשלים אותו בהסקה.

4.1.4 גם `PRESENT` אינו הופך את הדוח למעטפה. נדרש Artifact מעטפה נפרד בעל 16/16 שדות ו־Raw root משלו.

## 4.2 מטריצת 16 השדות

| # | שדה Protocol | R1 Structural | R2 Security | R3 Schedule |
|---:|---|---|---|---|
| 1 | `reviewId` | MISSING | PRESENT | PRESENT |
| 2 | `reviewDomain` | PARTIAL: title | PARTIAL: title/id | PARTIAL: title/id |
| 3 | `reviewerIdentity` | MISSING | MISSING | MISSING |
| 4 | `reviewerIndependenceClaim` | MISSING | MISSING | PARTIAL: המילה “עצמאית” בלבד |
| 5 | `instructionRootOrExactInstructionText` | MISSING | MISSING | MISSING |
| 6 | `subjectPath` | PRESENT | PRESENT | PRESENT |
| 7 | `subjectRawRoot` | PRESENT | PRESENT | PRESENT |
| 8 | `bytesObserved` | MISSING: line count בלבד | PRESENT | PRESENT |
| 9 | `coverageMethod` | PRESENT: full-line claim | PARTIAL: ללא 100%-bytes claim | PRESENT: start-to-finish claim |
| 10 | `toolAndVersionObservations` | MISSING | MISSING | MISSING |
| 11 | `startedAtObservation` | MISSING | MISSING | MISSING |
| 12 | `completedAtObservation` | MISSING | MISSING | MISSING |
| 13 | `findingManifestRoot` | MISSING | MISSING | MISSING |
| 14 | `reviewVerdict` | PRESENT | PRESENT | PRESENT |
| 15 | `claimLimits` | PARTIAL: prose | PARTIAL: prose | PARTIAL: prose |
| 16 | `rawReviewRoot` | MISSING | MISSING | MISSING |

## 4.3 חסרים מדויקים לפי Review

4.3.1 R1 חסר במפורש: `reviewId`, ‏`reviewerIdentity`, ‏`reviewerIndependenceClaim`, ‏`instructionRootOrExactInstructionText`, ‏`bytesObserved`, ‏`toolAndVersionObservations`, ‏`startedAtObservation`, ‏`completedAtObservation`, ‏`findingManifestRoot`, ‏`rawReviewRoot`.

4.3.2 R1 חלקי ואינו קביל ללא Materialization מפורש: `reviewDomain`, ‏`claimLimits`.

4.3.3 R2 חסר במפורש: `reviewerIdentity`, ‏`reviewerIndependenceClaim`, ‏`instructionRootOrExactInstructionText`, ‏`toolAndVersionObservations`, ‏`startedAtObservation`, ‏`completedAtObservation`, ‏`findingManifestRoot`, ‏`rawReviewRoot`.

4.3.4 R2 חלקי ואינו קביל: `reviewDomain`, ‏`coverageMethod` משום שאין הצהרת 100% bytes, ו־`claimLimits` משום שאינו שדה מעטפה.

4.3.5 R3 חסר במפורש: `reviewerIdentity`, ‏`instructionRootOrExactInstructionText`, ‏`toolAndVersionObservations`, ‏`startedAtObservation`, ‏`completedAtObservation`, ‏`findingManifestRoot`, ‏`rawReviewRoot`.

4.3.6 R3 חלקי ואינו קביל: `reviewDomain`, ‏`reviewerIndependenceClaim`, ‏`claimLimits`.

4.3.7 `reviewerIndependenceClaim` אינו Authority evidence גם אם ייכתב. Protocol §7.4.6 אוסר לקבל Reviewer identity או authority שמוצהרים רק בתוך ה־Review הנבדק.

## 4.4 Disposition

4.4.1 R1=`REVIEW-INELIGIBLE-RETAIN-RAW`.

4.4.2 R2=`REVIEW-INELIGIBLE-RETAIN-RAW`.

4.4.3 R3=`REVIEW-INELIGIBLE-RETAIN-RAW`.

4.4.4 Review-eligible count=`0/3`; אין להסיק ערך חסר מן ה־Intake, משם קובץ, Git author, Conversation או Agent identity.

# 5. כשירות Schema של Findings לפי Protocol §3.1

## 5.1 מקרא מיפוי

5.1.1 `EXACT` הוא שדה מקומי מפורש בעל אותה משמעות בסיסית.

5.1.2 `ANALOG` הוא שדה דומה אך אינו עומד בסוג, בשם, Cardinality או Normalization של הפרוטוקול.

5.1.3 `GLOBAL` הוא ערך ברמת Manifest שאסור לרשת לרשומה מקומית.

5.1.4 `MISSING` הוא מידע שאינו קיים ברשומה ואסור להמציאו.

## 5.2 מטריצת 23 השדות

| # | שדה Protocol | R1: 9 fields | R2: 10 fields | R3: 10 fields |
|---:|---|---|---|---|
| 1 | `reviewFindingId` | ANALOG `reportLocalId` | ANALOG `findingId` | ANALOG `reportLocalId` + `sourceFindingId` |
| 2 | `reviewDomain` | MISSING | MISSING | MISSING |
| 3 | `subjectRawRoot` | MISSING | GLOBAL only | GLOBAL only |
| 4 | `severity` | EXACT | EXACT | EXACT |
| 5 | `status` | MISSING | EXACT `OPEN` | MISSING; global prose only |
| 6 | `affectedClauseIds` | ANALOG scalar locator | ANALOG scalar locator | ANALOG scalar locator |
| 7 | `affectedArtifactOrRegistryIds` | MISSING | MISSING | MISSING |
| 8 | `violatedInvariantIds` | MISSING | MISSING | MISSING |
| 9 | `observableDefect` | ANALOG `defect` | ANALOG `defect` | ANALOG `defect` |
| 10 | `cause` | MISSING | MISSING | MISSING |
| 11 | `impact` | EXACT | EXACT | ANALOG `scheduleEstimateImpact` |
| 12 | `exploitOrFailurePath` | MISSING | MISSING | MISSING |
| 13 | `safeTerminal` | MISSING | MISSING | MISSING |
| 14 | `requiredRemediationPredicates` | ANALOG remediation prose | ANALOG remediation prose | ANALOG remediation prose |
| 15 | `requiredPositiveAssertions` | MISSING | MISSING | MISSING |
| 16 | `requiredNegativeAssertions` | MISSING | MISSING | MISSING |
| 17 | `requiredFailureAssertions` | MISSING | MISSING | MISSING |
| 18 | `requiredConcurrencyAssertions` | MISSING | MISSING | MISSING |
| 19 | `requiredRecoveryAssertions` | MISSING | MISSING | MISSING |
| 20 | `requiredAttackAssertions` | MISSING | MISSING | MISSING |
| 21 | `evidenceReferences` | ANALOG mixed locator | ANALOG mixed locator | ANALOG mixed locator |
| 22 | `claimLimits` | MISSING | MISSING | MISSING |
| 23 | `reviewerDisposition` | MISSING | MISSING | MISSING |

## 5.3 כל השדות החסרים המשותפים

5.3.1 `reviewDomain`.

5.3.2 `subjectRawRoot` ברמת כל Finding ללא ירושה.

5.3.3 `affectedClauseIds` כמערך מפורש, ממוין וללא כפילות; Locator מעורב אינו תחליף.

5.3.4 `affectedArtifactOrRegistryIds` כמערך מפורש.

5.3.5 `violatedInvariantIds` כמערך מפורש.

5.3.6 `cause`.

5.3.7 `exploitOrFailurePath`.

5.3.8 `safeTerminal`.

5.3.9 `requiredPositiveAssertions`.

5.3.10 `requiredNegativeAssertions`.

5.3.11 `requiredFailureAssertions`.

5.3.12 `requiredConcurrencyAssertions`.

5.3.13 `requiredRecoveryAssertions`.

5.3.14 `requiredAttackAssertions`.

5.3.15 `evidenceReferences` כמערך עצמאי ולא כחלק מ־Locator.

5.3.16 `claimLimits` ברמת Finding.

5.3.17 `reviewerDisposition`.

5.3.18 בנוסף, R1 ו־R3 חסרים `status` מקומי. R2 כולל `status=OPEN`, אך אינו מכניס אותו ל־Semantic input שלו.

5.3.19 `requiredRemediation` או `acceptancePredicate` יחיד אינם תחליף לששת מצבי Assertion הנפרדים.

5.3.20 `dependencies` הוא Extension שימושי אך אינו ממלא אף שדה חסר של הפרוטוקול.

# 6. אי־תאימות Semantic digest

## 6.1 R1

6.1.1 לכל 23 הרשומות יש JSON תקין בן חמישה מפתחות בלבד: `schema`, ‏`reportLocalId`, ‏`severity`, ‏`subjectLocator`, ‏`defectCode`.

6.1.2 הוא מכניס Local ID ו־Severity לזהות, חסר Subject root, חסרים שלושת מערכי הזהויות, חסר Failure boundary וחסר Safe terminal.

6.1.3 `defectCode` אינו ממופה ל־`observableDefect` או ל־Invariant registry סמכותי.

## 6.2 R2

6.2.1 לכל 24 הרשומות יש JSON תקין בן תשעה מפתחות: `findingId`, ‏`severity`, ‏`locator`, ‏`defect`, ‏`impact`, ‏`remediation`, ‏`acceptance`, ‏`dependencies`, ‏`mergeKey`.

6.2.2 הוא נועד במפורש למנוע Merge באמצעות Local ID, ומכניס Severity, Prose, Remediation ו־Dependencies לזהות—בניגוד ל־Protocol §3.2.8.

6.2.3 הוא אינו כולל Subject root, מערכי הזהויות, Invariants, Failure boundary או Safe terminal.

## 6.3 R3

6.3.1 קיימים 26 ערכי `semanticDigestInput`, אך כולם Macro טקסטואלי מן הצורה `JCS-v1(all fields …; noMergeKey=…)`.

6.3.2 concrete JSON input count=`0/26`; לכן אין Bytes שאפשר להעביר ל־RFC 8785 JCS או ל־SHA-256 באופן משוחזר.

6.3.3 גם אילו ה־Projection היה Materialized, הוא כולל Local IDs, Severity, Prose, Remediation ו־Acceptance, ואינו תואם ל־Identity key של הפרוטוקול.

## 6.4 תוצאה

6.4.1 full `semanticFindingDigest` count=`0/73`.

6.4.2 `CMF-*` semantic ID count=`0/73`.

6.4.3 two-normalizer parity count=`0/73`.

6.4.4 Formal equivalence proof count=`0`.

6.4.5 Formal duplicate proof count=`0`.

6.4.6 Safe disposition=`PRESERVE-ALL-73-LOCAL-OBSERVATIONS-UNMERGED`.

# 7. חסמים פנימיים בפרוטוקול

## 7.1 Status ו־Root set

7.1.1 Protocol status הוא `DRAFT-NOT-INDEPENDENTLY-REVIEWED-NOT-ACCEPTED` לפי §1.1.5.

7.1.2 §8.2 עדיין טוען שהביקורות הפיזיות הזמינות הן `0/3`, בעוד Intake זה צפה בשלושה דוחות ושלושה Manifests. אין לשנות את ה־Draft בדיעבד; נדרש Successor בעל Frozen input roots.

7.1.3 Draft לא־מאושר יכול לשמש יעד ביקורת, אך אינו Authority להפעלת Reconciliation פורמלי.

## 7.2 `failureBoundary` אינו ניתן להפקה

7.2.1 Protocol §3.2.1 מכניס `failureBoundary` ל־normalized semantic key.

7.2.2 רשימת 23 השדות ב־§3.1 אינה מגדירה שדה `failureBoundary`.

7.2.3 `exploitOrFailurePath` אינו מוגדר כמקור דטרמיניסטי ל־`failureBoundary`, ואסור להסיק אחד מן השני.

7.2.4 תוצאה=`PROTOCOL-SCHEMA-BLOCKED` גם אם בעתיד יופק Manifest בן 23/23 שדות.

## 7.3 סתירת `observableDefect`

7.3.1 §3.2.1 מכניס `observableDefect` ל־Digest.

7.3.2 §3.2.8 קובע ש־Reviewer-local wording אינו נכנס לזהות.

7.3.3 אין Canonical defect vocabulary, Invariant-bound predicate או Algorithm שמפריד Meaning מן ה־Prose המקומי.

7.3.4 שני Reviewers המתארים אותו כשל במילים שונות יפיקו Digests שונים, בניגוד ליעד §1.2.4 ול־Exact-equivalence §4.1.

## 7.4 Framing ו־Truncation אינם סגורים

7.4.1 `first32` ב־§3.2.6 אינו מגדיר אם היחידה היא bits, bytes או hexadecimal characters.

7.4.2 `domain-length:value-length:value` אינו מגדיר במלואו Field tags, יחידת Length, Array framing, Empty, Null, `unknown/unavailable` או Canonical integer encoding.

7.4.3 Unicode NFC מוגדר, אך אין Confusable profile או Script policy שמממש את Attack assertion §7.4.1.

7.4.4 אין Machine schema או Digest constructor מלא ל־Comparison assertion, Conflict, Resolution או Reconciliation records.

## 7.5 Independence ו־Authority

7.5.1 `reviewerIndependenceClaim` הוא Claim בלבד, בעוד §7.4.6 דורש לדחות Identity או Authority שמוצהרים רק בתוך Review.

7.5.2 הפרוטוקול אינו מציין External appointment evidence field או Authority root שמוכיחים את ה־Claim.

7.5.3 R1/R2/R3 הם Domains להשוואה; הם אינם Review A/B שמאשרים Candidate ואינם יכולים להעניק DefinitionAcceptance לעצמם.

7.5.4 כל חסר, סתירה, Parser disagreement, Normalizer disagreement או Root drift נשאר `AMBIGUOUS-BLOCKED` ללא Merge.

# 8. Collision ו־Identity issues

## 8.1 תוצאות מכניות

8.1.1 Exact duplicate `manifestLocalId` בתוך R1=`0`, בתוך R2=`0`, בתוך R3=`0`.

8.1.2 Exact duplicate `manifestLocalId` על פני R1+R2+R3=`0`.

8.1.3 כל 73 ה־Local IDs הם ASCII; לא נמצא Unicode-confusable בתוך מזהי ה־Union עצמם.

8.1.4 אין להסיק מכך שאין Collision סמנטי. Local namespaces שונים נועדו בדיוק לשמור Observations נפרדים.

## 8.2 בעיות Namespace ומיפוי

8.2.1 R1 report headings משתמשים ב־`P0-001…P3-002`, אך Manifest משתמש ב־`MPSA-20260829-*` ואינו כולל `sourceFindingId`. הקשר ניתן לניחוש לפי Severity וסיומת בלבד; ניחוש אינו Mapping קביל.

8.2.2 R2 משתמש ב־`MSSA-F001…MSSA-F024` ללא Date או Review-root namespace. יש לקשור כל ID ל־Raw review root כדי למנוע Collision עם דוח עתידי שממחזר אותו.

8.2.3 R3 שומר גם `MSAF-20260829-F###` וגם `SCHED-F###`. ‏`SCHED-F###` הוא Source attribute של אותה תצפית, לא Finding נוסף ולא Alias מוכח מעבר ל־Mapping המקומי.

8.2.4 R1 local IDs מקודדים Severity בתוך הזהות. Reclassification עתידי עלול לדרוש שינוי ID או להשאיר Severity שונה מן ה־ID; זו הסיבה ש־Protocol מוציא Severity מן הזהות הסמנטית.

8.2.5 כל שלושת ה־Semantic inputs כוללים Local ID או `noMergeKey`. הדבר נכון לשימור 73 Observations, אך מונע מהם להוכיח Cross-review equivalence.

## 8.3 מועמדי Overlap שאסור למזג כעת

8.3.1 `missing §35.6`: ‏R1 `MPSA-20260829-P0-001`, ‏R2 `MSSA-F001`, ‏R3 `MSAF-20260829-F001`.

8.3.2 `self-approval/root lifecycle`: ‏R1 `MPSA-20260829-P0-002`, ‏R2 `MSSA-F002` ו־`MSSA-F003`, ‏R3 `MSAF-20260829-F002`.

8.3.3 `D18-A2/Public delta`: ‏R1 `MPSA-20260829-P0-007`, ‏R2 `MSSA-F004`, ‏R3 `MSAF-20260829-F012`.

8.3.4 `Public GitHub hardening`: ‏R1 `MPSA-20260829-P1-009`, ‏R2 `MSSA-F014`, ‏R3 `MSAF-20260829-F012`.

8.3.5 `dual Git roots`: ‏R1 `MPSA-20260829-P1-010`, ‏R2 `MSSA-F013`, ‏R3 `MSAF-20260829-F011`.

8.3.6 `temporary review evidence`: ‏R1 `MPSA-20260829-P2-003`, ‏R2 `MSSA-F024`.

8.3.7 `framework/artifact denominator`: ‏R1 `MPSA-20260829-P0-005`, ‏R2 `MSSA-F011`.

8.3.8 `canceled/invalid estimates`: ‏R1 `MPSA-20260829-P1-006`, ‏R3 `MSAF-20260829-F003`, ‏`MSAF-20260829-F004` ו־`MSAF-20260829-F014`.

8.3.9 כל קבוצה 8.3 היא `POTENTIAL-OVERLAP-NOT-EQUIVALENCE`. אין Presence matrix, Majority vote, Parent credit, Duplicate status או Closure transfer.

# 9. Eligibility defects ו־Safe disposition

| ID | Defect | Impact | Safe disposition |
|---|---|---|---|
| `INTAKE-E001` | Protocol Draft אינו reviewed/accepted | אין Authority פורמלית לנרמול או Reconciliation | `PROTOCOL-INELIGIBLE` |
| `INTAKE-E002` | `failureBoundary` נדרש לזהות אך חסר בסכמה | אין Input דטרמיניסטי ל־Digest | `PROTOCOL-SCHEMA-BLOCKED` |
| `INTAKE-E003` | `observableDefect` prose נכנס לזהות בניגוד לאיסור wording | ניסוחים שונים אינם יכולים להתאחד באופן מוכח | `NORMALIZATION-BLOCKED` |
| `INTAKE-E004` | Framing, `first32`, null/confusable וכללי Output record חסרים | Implementations עצמאיים עלולים להפיק Roots שונים | `NORMALIZATION-BLOCKED` |
| `INTAKE-E005` | 0/3 Review envelopes מלאות | Review authority, coverage ו־roots אינם קבילים | `REVIEW-INELIGIBLE` |
| `INTAKE-E006` | Manifests בני 9/10 שדות במקום Schema מלא | Cause, boundaries, terminals, assertions ו־claim limits נאבדים | `PRESERVE-RAW-NO-COMPARE` |
| `INTAKE-E007` | שלושה Digest contracts שונים ומנוגדים לפרוטוקול | אין Semantic key משותף | `NO-MERGE` |
| `INTAKE-E008` | R3 משתמש ב־Macro במקום concrete JSON | אין Bytes ל־JCS/SHA-256 | `DIGEST-INPUT-INELIGIBLE` |
| `INTAKE-E009` | R1 source-heading mapping אינו מפורש | Local observation עלולה להיקשר ל־Finding הלא נכון | `MAPPING-BLOCKED` |
| `INTAKE-E010` | Local namespace scoping אינו אחיד | שימוש עתידי יכול למחזר ID או לספור Alias כ־Finding | `BIND-TO-RAW-ROOT` |
| `INTAKE-E011` | Report↔Manifest roots אינם בתוך מעטפות Review | קובץ שהוחלף יכול להיכנס ל־Run | `SOURCE-FREEZE-REQUIRED` |
| `INTAKE-E012` | Protocol input status נשאר 0/3 ואינו מקבע את Roots הנוכחיים | Run אינו משוחזר מן ה־Draft | `SUCCESSOR-REQUIRED` |

9.1 אין ממצא בסעיף 9 שמקבל Closure, Risk acceptance, Severity reconciliation או Gate credit במסמך זה.

9.2 אין Majority rule. גם אם שלוש ביקורות מתארות לכאורה אותו נושא, כל Observation נשמר עד Full-digest equivalence proof תקין.

# 10. Exact next artifacts — רשימת Outputs נדרשים, לא Tasks

## 10.1 Protocol definition artifacts

10.1.1 `master-plan-three-review-reconciliation-protocol-v1.1-candidate.md`: Successor שמוסיף `failureBoundary` מפורש, מפריד Defect semantics מ־Reviewer prose, מגדיר Framing/first32/Unicode/nulls ומוסיף Schemas מלאים לכל Output record.

10.1.2 `master-plan-three-review-reconciliation-protocol-v1.1-review-a.md`: ביקורת Definition חיצונית הקשורה ל־Raw root המדויק של ה־Candidate.

10.1.3 `master-plan-three-review-reconciliation-protocol-v1.1-presealed-review-b.md`: Envelope עיוור שנחתם לפני Review A וקושר את אותו Candidate root; הוא אינו Approval.

10.1.4 `master-plan-three-review-reconciliation-protocol-v1.1-review-b.md`: פלט Review B מן ה־Envelope הקפוא, ללא Self-authorization.

10.1.5 מסמך Intake זה אינו יוצר Protocol acceptance או DefinitionAcceptance. סמכות חיצונית עתידית נשארת מחוץ ל־Subject ול־Reviews.

## 10.2 Source freeze artifacts

10.2.1 `three-review-source-freeze-manifest-v1.json`: exact Subject, Protocol successor, שלושת Report roots ושלושת Manifest roots; path, media type, byte count, digest, producer observation ו־supersession state.

10.2.2 `three-review-source-freeze-independent-readback-a.json`.

10.2.3 `three-review-source-freeze-independent-readback-b.json`.

10.2.4 שני Readbacks שונים או Root חסר מסתיימים `SOURCE-FREEZE-CONFLICT-BLOCKED`.

## 10.3 Review envelopes

10.3.1 `three-review-r1-structural-review-envelope-v1.json` עם 16/16 שדות Protocol ו־External reviewer-appointment evidence.

10.3.2 `three-review-r2-security-review-envelope-v1.json` עם 16/16 שדות ו־100%-bytes coverage disposition מפורש.

10.3.3 `three-review-r3-schedule-review-envelope-v1.json` עם 16/16 שדות ו־External independence evidence.

10.3.4 שדה שאין לו Fact נשאר חסר וה־Review נשאר `REVIEW-INELIGIBLE`; אין Placeholder, Dummy identity או inferred timestamp.

## 10.4 Lossless normalized local manifests

10.4.1 `three-review-r1-structural-normalization-input-v1.jsonl`: בדיוק 23 Records, כל שדות Protocol-successor מקומיים, Mapping מפורש מ־`P0-001…P3-002` ל־MPSA IDs וכל Prose מקור שמור Lossless.

10.4.2 `three-review-r2-security-normalization-input-v1.jsonl`: בדיוק 24 Records, כל השדות המקומיים, Status ו־Claim limits מפורשים, וכל Record קשור ל־Subject/Review roots.

10.4.3 `three-review-r3-schedule-normalization-input-v1.jsonl`: בדיוק 26 Records, concrete JSON במקום Macro, והפרדה מפורשת בין `reportLocalId` ל־`sourceFindingId`.

10.4.4 כל אחד משלושת ה־Artifacts שומר את כל 73 Observations ואינו מסמן Duplicate או Equivalent.

## 10.5 Independent normalizer artifacts

10.5.1 `three-review-normalizer-a-definition-and-version.json`.

10.5.2 `three-review-normalizer-b-definition-and-version.json`.

10.5.3 `three-review-normalizer-a-output-manifest-v1.json`: ‏73 Local inputs, full framed key bytes, full SHA-256 ו־CMF candidate לכל Record.

10.5.4 `three-review-normalizer-b-output-manifest-v1.json`: אותו חוזה ממימוש בלתי תלוי.

10.5.5 `three-review-normalizer-parity-report-v1.json`: השוואת 73/73 full digests; כל Difference מסתיים `AMBIGUOUS-BLOCKED`.

## 10.6 Collision and identity registry

10.6.1 `three-review-local-to-semantic-identity-registry-v1.json`: כל Local observation פעם אחת, Raw review root, Local ID, Source ID אם קיים, full semantic digest ו־collision state.

10.6.2 Truncated-ID collision אינו נפתר ב־Counter, Suffix או Randomness; נדרש Protocol Definition successor דטרמיניסטי.

## 10.7 Outputs שאינם מורשים כעת

10.7.1 `ReviewComparisonManifest` אינו מורשה לפני שכל סעיפי 10.1–10.6 קבילים.

10.7.2 `ReconciliationManifest` אינו מורשה לפני Comparison קביל וביקורת עצמאית שלו.

10.7.3 `ReconciliationReceipt`, ‏`AcceptanceEnvelope`, ‏`DefinitionAcceptance`, ‏`PlanningMaterializationPermit` ו־Gate29 credit אינם נוצרים במסגרת Intake זה.

# 11. QA מכני שבוצע

## 11.1 Report↔Manifest cardinality

11.1.1 R1 report Finding headings=`23`, unique=`23`; Manifest records=`23`, unique=`23`.

11.1.2 R2 report Finding headings=`24`, unique=`24`; Manifest records=`24`, unique=`24`.

11.1.3 R3 report Finding headings=`26`, unique=`26`; Manifest records=`26`, unique=`26`.

11.1.4 Local union records=`73`; unique local IDs=`73`; exact duplicate local IDs=`0`.

## 11.2 Manifest field and digest-input QA

11.2.1 R1: כל 23 Records כוללים בדיוק תשעה שדות לפי החוזה המקומי; 23/23 JSON inputs ניתנים ל־Parse; כולם בעלי אותה סדרת חמישה Keys.

11.2.2 R2: ‏24/24 Records, ‏24/24 `status=OPEN`, ‏24/24 JSON inputs ניתנים ל־Parse, ‏24/24 unique merge keys, field-order mismatch=`0`, unsorted-dependency count=`0`.

11.2.3 R3: ‏26/26 `reportLocalId`, ‏26/26 `sourceFindingId`, יחס סיומות אחד־לאחד; ‏26 semantic macros; concrete JSON input=`0/26`.

11.2.4 Protocol-compliant semantic digests=`0/73`.

11.2.5 Formal reconciliation aliases=`0`; proved duplicates=`0`; proved non-defects=`0`; proved closures=`0`.

## 11.3 Claim limits של QA

11.3.1 QA זה מוכיח Byte identity, Local cardinality, Parseability מוגבלת ו־Exact duplicate absence בלבד.

11.3.2 הוא אינו מוכיח Truth, Reviewer identity, Independence, 100% subject comprehension, Finding equivalence, Severity correctness, Remediation sufficiency או Evidence validity.

11.3.3 Hash של מסמך Intake זה אינו מוטמע בתוכו כדי למנוע Self-reference; הוא מחושב ומדווח חיצונית לאחר Freeze.

# 12. Safe terminal ופסק דין סופי

12.1 כל 73 ה־Reviewer-local Findings נשמרים פתוחים ונפרדים.

12.2 כל Field חסר נשאר `unknown/unavailable`; אין Backfill מן השיחה, משם קובץ, Agent identity, Git history או דוח אחר.

12.3 כל Root mismatch, missing input, malformed record, duplicate local ID, mapping ambiguity, parser disagreement, normalizer disagreement, truncated collision או authority ambiguity מסתיים `INTAKE-OR-NORMALIZATION-BLOCKED`.

12.4 פסק הדין הוא `INTAKE-PASS-FOR-RAW-PRESERVATION / FORMAL-NORMALIZATION-INELIGIBLE / COMPARISON-BLOCKED / RECONCILIATION-BLOCKED`.

12.5 לא נוצרו Task leaves, שעות, ETA, Acceptance, Reconciliation receipt, Closure או Gate credit.

12.6 Gate29 נשאר `BLOCKED`; Freeze נשאר `ACTIVE`; Semantic union denominator נשאר `unknown/unavailable`.
