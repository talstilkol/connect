# 1. Connect — Independent hostile review of Section 35.6 TRD-2 v2 review-closure requirements

## 1.1 זהות הביקורת

1.1.1 `artifactId=CONNECT-SECTION-35-6-TRD-2-V2-REVIEW-CLOSURE-REQUIREMENTS-INDEPENDENT-HOSTILE-REVIEW-2026-08-29-V1`.

1.1.2 `reviewClass=PLANNING-ONLY; INDEPENDENT-HOSTILE-REVIEW; NOT-PRODUCER-QA; NOT-ACCEPTANCE; NOT-GATE-CREDIT`.

1.1.3 Subject path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v2-review-closure-requirements-2026-08-29.md`.

1.1.4 exact Subject raw SHA-256=`7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d`; physical identity=`1102 lines/92415 bytes`.

1.1.5 ה־Subject לא שונה במהלך הביקורת. לא נקרא שום Producer QA שנוצר עבור ה־Subject הנבדק. ה־Producer coverage audit הישן נבדק רק מפני שהוא אחד מארבעת מקורות ה־84 הקפואים שאותם ה־Subject טוען לשמר.

1.1.6 reviewer-local namespace=`TRD2V2-IHR-F001..TRD2V2-IHR-F016`; כל מזהה הוא Observation עצמאי; Merge, Alias, Downgrade, Suppression, Risk acceptance ו־Closure אסורים בביקורת זו.

1.1.7 authority limit=`הביקורת רשאית לגלות ולנסח דרישות תיקון בלבד`; durable reviewer-appointment message ID=`unknown/unavailable`; אין כאן Bootstrap authority, Definition acceptance, Product Task, Git permission, Push, Build, Deploy או Provider mutation.

## 1.2 גבולות ההכרעה

1.2.1 מטרת הבדיקה היא להבחין בין שלוש טענות שונות: שימור זהויות, שימור תצפיות מלאות, ויכולת להשתמש ברשומות כחוזה Closure בר־ביצוע.

1.2.2 מעבר של `85 IDs/5 fields` אינו מוכיח שימור Lossless, סמכות, DAG סמנטי, Canonical serialization או Acceptance executability.

1.2.3 כל ממצא נבחן לפי ה־Subject הקפוא והמקורות הקפואים בלבד. מקורות מאוחרים נבדקו רק כדי לקבוע האם ה־Subject רשאי לטעון Current source-universe closure; הם אינם מוטמעים בדיעבד בתוך ה־84.

1.2.4 Product completion, remaining person-hours, critical path ו־calendar ETA אינם נגזרים מן ה־Subject הזה ונשארים `unknown/unavailable`.

# 2. מקורות שנבדקו

## 2.1 שורשי ה־Subject וה־Raw intake

2.1.1 reviewed predecessor Subject root=`2bd122db5e6e40395b8cf038ff3dae7a25e88f6c23cfc64c8490e35c637beb6a`.

2.1.2 raw multi-review intake root=`031166ff25d41f1714fb8a7f8091173059312ea513d12708cffe6d6fe3314f53`.

## 2.2 ארבע משפחות המקור המקומיות

2.2.1 Producer coverage-audit root=`8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f`; expected identities=`7`.

2.2.2 Math report root=`66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362`; Math findings-manifest root=`61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b`; expected identities=`24`.

2.2.3 Security report root=`f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec`; Security findings-manifest root=`3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae`; expected identities=`20`.

2.2.4 Structural report root=`34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421`; embedded records=`33`.

## 2.3 מקורות Current שנבדקו רק לצורך גבול Claim

2.3.1 D18-A2 Public-repository decision root=`448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`.

2.3.2 Public-repository/cyber hostile-review report root=`af7bd90255fe0cb037d19ad8138609a3b35df50c33219470c845dec15919c6d5`.

2.3.3 Public-repository/cyber findings-manifest root=`a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4`; local observations=`32`; status=`OPEN; NOT-RECONCILED; NOT-ACCEPTED`.

2.3.4 שלושת השורשים שב־2.3.1–2.3.3 אינם מופיעים ב־Subject. עובדה זו אינה משנה את 84 המקורות ההיסטוריים, אך היא מונעת Claim שה־Subject הוא Current complete cyber/Public closure universe.

# 3. תוצאות מכניות עצמאיות

## 3.1 מבנה הרשומות

3.1.1 requirement headings=`85`; הרצף הוא בדיוק `TRD2V2-REQ-000` עד `TRD2V2-REQ-084`; gaps=`0`; duplicates=`0`.

3.1.2 לכל אחת מ־85 הרשומות קיימים בדיוק ובאותו סדר חמשת השדות `rule,causeAndEffect,sourceIds,acceptancePredicate,dependencies`; missing fields=`0`; extra fields=`0`.

3.1.3 duplicate numbered clauses=`0`.

3.1.4 localObservationId count=`84`; unique=`84`; Set equality מול Raw intake=`PASS`; missing=`0`; extra=`0`; duplicate=`0`.

## 3.2 שורשי מקור

3.2.1 root occurrences בתוך שדות הרשומות=`130`.

3.2.2 החלוקה היא: reviewed predecessor=`1`; raw intake=`1`; Producer root=`7`; Math report=`24`; Math manifest=`24`; Security report=`20`; Security manifest=`20`; Structural report=`33`.

3.2.3 כל שמונת ערכי ה־SHA-256 שב־3.2.2 תואמים ל־bytes המקומיים שנבדקו; root-value mismatch=`0`.

## 3.3 העתקת Projection שה־Subject עצמו הגדיר

3.3.1 Producer: defect, cause כאשר קיים, impact ו־acceptance predicate הושוו למקור; mismatches=`0/27`; ל־`TRD2-PQA-P1-002` אין cause במקור והחסר לא הומצא.

3.3.2 Math: requiredDefinitionDelta→rule, defect, mathematicalImpact/scheduleImpact ו־acceptancePredicate הושוו לכל 24 הרשומות; mismatches=`0/96`.

3.3.3 Security: requiredRemediation→rule, defect ו־impact הושוו לכל 20 הרשומות; mismatches=`0/60`; עשרים Acceptance predicates נשמרו כחסרים ולא הומצאו.

3.3.4 Structural: requiredRemediation→rule, defect, impact ו־acceptancePredicate הושוו לכל 33 הרשומות; mismatches=`0/132`.

3.3.5 המסקנה של 3.3 היא `PASS-ON-SELECTED-PROJECTION-ONLY`; היא אינה מוכיחה שימור של שאר שדות התצפית.

## 3.4 Severity arithmetic

3.4.1 Producer=`P0=4,P1=3,P2=0,P3=0`.

3.4.2 Math=`P0=12,P1=10,P2=2,P3=0`.

3.4.3 Security=`P0=9,P1=9,P2=2,P3=0`; `TRD2-SHR-F019` הוא P2 מקומי עם Promotion ל־P0 אם Push/Merge/Release/Deploy נעשה reachable לפני Hardening.

3.4.4 Structural=`P0=14,P1=15,P2=2,P3=2`.

3.4.5 סכום reviewer-local=`P0=39,P1=37,P2=6,P3=2,total=84`; arithmetic mismatch=`0`.

3.4.6 החשבון תקין, אך שיוך Severity לכל Row אינו נמצא בתוך חמשת שדות הרשומה; לכן 3.4 אינו מרפא את ממצא `TRD2V2-IHR-F002`.

## 3.5 Dependency graph

3.5.1 nodes=`85`; dependency edges=`83`; zero-dependency roots=`2`; one-dependency rows=`69`; two-dependency rows=`14`.

3.5.2 dangling edges=`0`; self edges=`0`; duplicate edges=`0`; syntactic cycles=`0`.

3.5.3 Structural dependency translation=`33/33 exact`; mismatches=`0`.

3.5.4 weak components=`2`: component A=`TRD2V2-REQ-000..051`, size `52`; component B=`TRD2V2-REQ-052..084`, size `33`.

3.5.5 המסקנה היא `PASS-SYNTACTIC-DAG; FAIL-SEMANTIC-CLOSURE-DAG`.

## 3.6 Missing-value counters

3.6.1 rules declared `unknown/unavailable`=`7`, exactly `TRD2V2-REQ-001..007`.

3.6.2 acceptance predicates declared `unknown/unavailable`=`20`, exactly `TRD2V2-REQ-032..051`.

3.6.3 durable authority-local ID in `TRD2V2-REQ-000`=`unknown/unavailable`.

3.6.4 cause in `TRD2V2-REQ-006`=`unknown/unavailable` because the source has no cause field; no cause was invented.

# 4. Verdict and finding inventory

## 4.1 Verdict

4.1.1 identity/cardinality verdict=`PASS`.

4.1.2 five-field mechanical-shape verdict=`PASS`.

4.1.3 selected-field copy verdict=`PASS`.

4.1.4 lossless-observation-preservation verdict=`REJECT`.

4.1.5 executable-closure-baseline verdict=`REJECT`.

4.1.6 Bootstrap/non-self authority verdict=`REJECT`.

4.1.7 canonicalization/serialization verdict=`REJECT`.

4.1.8 Public/security/data-lifecycle closure verdict=`REJECT-CURRENT; PUBLIC-INTENT-PRESERVED`.

4.1.9 overall verdict=`REJECT-AS-LOSSLESS-EXECUTABLE-TRD2-CLOSURE-BASELINE; SUCCESSOR-REQUIRED`.

## 4.2 Finding counters

4.2.1 findings=`16`; `P0=9`; `P1=7`; `P2=0`; `P3=0`.

4.2.2 open=`16/16`; closed=`0`; merged=`0`; suppressed=`0`; accepted=`0`.

# 5. Findings P0

## 5.1 `TRD2V2-IHR-F001` — 84 identities נשמרו אך 84 observations מלאות לא נשמרו

5.1.1 location=`subject §§2.1.1–2.1.4,4–7,8.1; source record contracts in Producer §3, Math report §§2–4 and manifest §1.2, Security manifest §1.2, Structural report §2.2`.

5.1.2 defect=`כל Row מעתיק Projection של חמישה שדות בלבד ומשמיט שדות סמכותיים מן המקור: severity, locator/subjectLocator, safeTerminal כאשר קיים, sourceBasis, status, merge/noMerge key, reportSection/closure locator, sourceContractIds/sourceFindingIds; ברשומת D31 מושמטים גם observed D31 digest, physical identity ו-claim limit`.

5.1.3 cause=`חוזה §2.1.2 הגדיר העתקה צרה של remediation/defect/cause/impact/predicate, בעוד §1.1.5 טוען לשימור אחד-לאחד של observation שלם`.

5.1.4 consequence=`Consumer אינו יכול לשחזר מן ה־Subject בלבד את התצפית המקומית, את גבול ה־Claim או את מצב הכשל; שינוי או היעלמות מקור חיצוני הופכים Identity pointer לתחליף חלקי ולא לשימור Lossless`.

5.1.5 required fix=`ליצור Successor עם SourceObservationEnvelope מלא לכל 84 הזהויות, או עם exact record bytes/recordDigest/recordLocator ו־typed projection manifest שמוכיח שכל שדה נשמר; אין לשנות או למזג את ה־84`.

5.1.6 acceptance predicate=`שני Extractors בלתי תלויים משחזרים לכל 84 הרשומות את כל שדות המקור ואת exact record digest; omitted/changed/unresolved fields=0; D31 digest/claim-limit נשמרים; comparison root זהה`.

## 5.2 `TRD2V2-IHR-F003` — אין Canonical serialization לחמשת השדות ול־Manifest root

5.2.1 location=`subject §§2.1.2–2.1.5,3–7,9.1.2,9.1.5–9.1.6`.

5.2.2 defect=`Markdown prose אינו מגדיר grammar, UTF-8/code-point policy, line endings, Bidi controls, escaping, semicolon/list semantics, field ordering authority, canonical unknown value, dependency-array ordering או per-record digest`.

5.2.3 cause=`ה־QA בודק Headings וחמש שורות, אך לא מגדיר serialization pipeline יחיד מן Source record אל Logical record ואל bytes`.

5.2.4 consequence=`שני Parsers יכולים להסכים על 85/85 שורות אך לחשב values, arrays או Roots שונים; Byte-for-byte claim ב־§9.1.5 אינו ניתן לשחזור פורמלי`.

5.2.5 required fix=`להגדיר CanonicalizationProfile versioned: raw-source bytes נשמרים ללא normalization; logical records מקודדים ב־canonical JSON/CBOR מוגדר, UTF-8, LF, code-point/Bidi policy, exact escaping, fixed field order, ordered arrays, MissingValue union ו־record/collection digests`.

5.2.6 acceptance predicate=`שני Serializers בלתי תלויים מקבלים אותם Source roots ומפיקים 85 record digests ו־collection root זהים; Unicode/Bidi/newline/delimiter/order mutants משנים Root או נדחים; hidden field count=0`.

## 5.3 `TRD2V2-IHR-F004` — Bootstrap authority ו־Freeze הם Self-referential ולא Root-bound

5.3.1 location=`subject §§1.1.2–1.1.5,2.1.6,3.1 TRD2V2-REQ-000,7.5 TRD2V2-REQ-056,9.2`.

5.3.2 defect=`TRD2V2-REQ-000 נמצא בתוך ה־Subject שאותו הוא אמור לבסס, אינו מכיל את Root ה־Subject הנוכחי, ומפנה ל-task instruction dated 2026-08-29 עם durable authority-local ID unknown; B0 עצמו מופיע רק כדרישת תיקון מאוחרת בתוך TRD2V2-REQ-056`.

5.3.3 cause=`Freeze requirement, external authority, Candidate identity ו־Acceptance lifecycle לא הופרדו ל־detached records מוקדמים`.

5.3.4 consequence=`ה־Subject אינו יכול להעניק לעצמו סמכות, Freeze או Acceptance; כל Closure שמסתמך על REQ-000 יוצר Bootstrap paradox גם אם ה־DAG התחבירי acyclic`.

5.3.5 required fix=`ליצור B0/AuthorityEnvelope ו־FreezeReceipt חיצוניים הקודמים ל־Candidate, עם exact candidate root, scope, actor/role, authority source, issuedAt, expiry/revocation, permitted acts ו־detached acceptance rule`.

5.3.6 acceptance predicate=`B0 ו־FreezeReceipt הם Artifacts מוקדמים ואינם Members ב־Candidate; הם נקשרים ל־7bd... או ל־Successor root exact; authority ID/root resolved; self/future-generation authority edges=0; שני Readers מסכימים`.

## 5.4 `TRD2V2-IHR-F005` — ה־DAG נקי תחבירית אך מפוצל וסמנטית חסר

5.4.1 location=`subject §2.1.5; all dependencies fields; especially TRD2V2-REQ-008..051 and TRD2V2-REQ-052`.

5.4.2 defect=`קיימים שני Weak components; 33 Structural rows אינם תלויים ב־Freeze/authority root כלל; 51 Producer/Math/Security rows תלויות כמעט רק ב־REQ-000 ואינן מקודדות prerequisites בין Source admission, schema, protocol, formulas, security controls, tests ו־evidence`.

5.4.3 cause=`Reviewer-local dependencies נשמרו כ־ID list יחיד, ונאסר להוסיף Edge חדש, אך לא נוצר Overlay נפרד ל־provenance dependency מול closure/execution dependency`.

5.4.4 consequence=`Topological executor יכול לאשר Security/Math Rule לפני Schema/authority שעליהם הוא נשען, או לעבד את כל Structural component בלי Freeze; zero-cycle אינו מוכיח lawful order`.

5.4.5 required fix=`להפריד typed edge registries: sourceObservationDependency, provenanceDependency, closurePrerequisite, validationDependency ו־invalidationEdge; לשמר את Edge המקורי ללא שינוי ולהוסיף reviewed derived edges עם rationale`.

5.4.6 acceptance predicate=`כל 85 הרשומות reachable מ־detached Freeze root; weak components=1; dangling/self/cycle=0 בשני Engines; כל Predicate input מופיע כ־typed predecessor; removing any required edge triggers an expected semantic-order failure`.

## 5.5 `TRD2V2-IHR-F006` — 27 שדות חסרים ללא Resolution workflow בעל סמכות

5.5.1 location=`subject §§2.1.3–2.1.4,4.1–4.7,6.1–6.20,9.2.2`.

5.5.2 defect=`7 Rules ו־20 Acceptance predicates הם unknown/unavailable; ה־Subject אינו מגדיר MissingValue schema, owner/authority, resolution input, successor trigger, deadline/safe terminal או איסור promotion פרט לטקסט כללי`.

5.5.3 cause=`נמנעה המצאה נכונה של מידע חסר, אך החסר הושאר כ־string ולא כ־state machine סגור`.

5.5.4 consequence=`ה־Artifact אינו Closure requirements מלא; Consumer עלול להתעלם מה־string, להמירו ל־empty/default או להשלים Rule/Predicate ללא סמכות`.

5.5.5 required fix=`להגדיר MissingValue discriminated union עם missingField, reasonCode, sourceRoot, blocker, requiredAuthorityRole, resolutionPredicate, safeTerminal, successorTrigger ו־status; אין inference מ־remediation או safe terminal`.

5.5.6 acceptance predicate=`27/27 החסרים מופיעים כ־typed MissingValue records; כל אחד unresolved ולכן acceptanceEligible=false; default/coercion/inference mutants נכשלים; Resolution מאושר יוצר Successor root ואינו משנה את ה־Subject in place`.

## 5.6 `TRD2V2-IHR-F007` — Acceptance predicates אינם Executable contracts

5.6.1 location=`subject all acceptancePredicate fields; §§9.1.5–9.2.2`.

5.6.2 defect=`אין Predicate language/version, evaluator, exact input roots, test IDs, expected outputs, failure terminals, Evidence schema או runner identity; 20 Predicates חסרים, והנותרים הם prose עם מונחים כגון two Readers, every, Current, exact ו־valid שאינם bound ל־schemas`.

5.6.3 cause=`המקורות הועתקו כניסוח דרישה אך לא עברו compilation לחוזה Conformance נפרד`.

5.6.4 consequence=`אין דרך דטרמיניסטית להכריע PASS/FAIL/UNKNOWN; שני בודקים יכולים לטעון Closure שונה על אותם bytes`.

5.6.5 required fix=`ליצור ConformancePredicate records נפרדים עם predicateVersion, inputSchema/root, evaluator/runner root, testVectorIds, expectedResult, failureTerminal, evidenceSchema, asOf/validThrough ו־determinism rule`.

5.6.6 acceptance predicate=`לכל Rule בר־קבלה קיים Predicate executable אחד לפחות; unknown predicate count=0 לפני Acceptance; two-runner result/root equality=100%; missing/stale/wrong-root Evidence מחזיר BLOCKED ולא PASS`.

## 5.7 `TRD2V2-IHR-F008` — Safe terminals של Security ו־Producer אבדו מן הרשומות

5.7.1 location=`subject §§2.1.2–2.1.4,4.1–4.7,6.1–6.20; Producer source §3; Security manifest §§2–4`.

5.7.2 defect=`ל־7 Producer observations ול־20 Security observations יש safe terminals במקור, אך הם אינם שדה בחמשת שדות ה־Successor; דווקא 20 Security predicates החסרים מפנים בהסבר ל־safe terminal שאינו מועתק`.

5.7.3 cause=`ה־Projection בחר causeAndEffect ו־predicate אך השמיט Failure behavior סמכותי`.

5.7.4 consequence=`כאשר Predicate חסר או Evidence אינו תקף, Consumer אינו מחזיק locally את מצב ה־OFF/BLOCKED הנדרש; Public, provider, deletion, restore, AI, file ו־tenant capabilities עלולות להישאר עם fallback לא מוגדר`.

5.7.5 required fix=`לשמר exact safeTerminal לכל מקור שיש בו שדה כזה; למקור שאין בו Safe terminal ליצור MissingValue ולא להסיק אחד; לקשור כל terminal ל־Capability/Metric/Gate scope`.

5.7.6 acceptance predicate=`27/27 source safe terminals משוחזרים byte-exact או מסומנים typed missing לפי מקור; כל missing/stale/wrong-root path מפעיל terminal; zero implicit enabled/default-success paths`.

## 5.8 `TRD2V2-IHR-F009` — Review protocol, eligibility ו־independence אינם Root accepted

5.8.1 location=`subject §§1.1,2.1.6,6.6 TRD2V2-REQ-037,7.5–7.6 TRD2V2-REQ-056..057,9.2.2`.

5.8.2 defect=`ה־Subject דורש Protocol מתוקן, שני Normalizers, שתי Generations ו־independent reviews, אך אינו קושר accepted Protocol root, ReviewEnvelope schema, reviewer appointments/independence proof או eligible Review packet; §9.2.2 מודה שהשלב חסום`.

5.8.3 cause=`ה־84 הגיעו מ־legacy/raw intake לפני Protocol acceptance, וה־Successor נבנה כמפת דרישות לפני שה־Lifecycle authority הושלם`.

5.8.4 consequence=`הביקורת הנוכחית יכולה לשמש Discovery בלבד; היא אינה יכולה להעניק Acceptance, closure transfer או protocol conformance ל־Subject`.

5.8.5 required fix=`לקבל תחילה Protocol root חיצוני; ליצור ReviewEnvelope/appointment/independence/normalization records הקשורים ל־Successor exact root; להריץ שתי Generations אמיתיות ולשמור detached Results`.

5.8.6 acceptance predicate=`Protocol acceptance envelope resolves and predates Review packet; reviewer roles ו־independence constraints pass; two independent normalizers agree; two actual generations complete without receipt carry-over; legacy observations remain historical only`.

## 5.9 `TRD2V2-IHR-F010` — Data lifecycle אינו Closure graph אטומי

5.9.1 location=`subject TRD2V2-REQ-044,046,047,048,049,074,075,077,079,080,081 and their dependencies`.

5.9.2 defect=`File/derived data, Legal Hold, deletion adapters, backup, restore, privacy replay, re-deletion, unknown provider attempts, test-input expiry ו־invalidation מופיעים כ־Rules נפרדים אך ללא typed lifecycle edges, state-transition table או invariant משותף`.

5.9.3 cause=`ה־DAG שימר Reviewer dependencies בלבד; Security rows 044–051 תלויות רק ב־REQ-000, בעוד Structural rows נמצאות ברכיב אחר`.

5.9.4 consequence=`אפשר תאורטית לאשר Restore בלי re-deletion, deletion בלי hold-race reconciliation, או derived-data purge בלי source-object/version lineage; Byte consistency עלולה להיראות Privacy safety`.

5.9.5 required fix=`להוסיף DataLifecycle graph typed המכסה Source object→derived data→backup cohort→restore quarantine→privacy replay→re-deletion, וכן Hold/CAS/partial/unknown attempt states ו־invalidation edges`.

5.9.6 acceptance predicate=`כל Data class ו־store מופיעים פעם אחת; active/hold/partial/unknown states חסומים; deletion/restore/hold-race/resurrection/cascade mutants נכשלים בחמשת Test modes; no restored deleted/opted-out/held data becomes active`.

# 6. Findings P1

## 6.1 `TRD2V2-IHR-F002` — Severity arithmetic נכון אך Severity אינה Row-bound

6.1.1 location=`subject §§4–8, especially §8.1.2–8.1.6; all sourceIds fields`.

6.1.2 defect=`אין severity, originalSeverity, effectiveSeverity או severitySourceRoot בכל Row; §8 מכיל רק aggregate vectors. 33 Structural IDs אינם מקודדים Severity בשם, ו־Security F019 כולל Promotion condition שאינו machine-bound ל־reachability state`.

6.1.3 cause=`Severity נשמרה כסיכום Family ולא כחלק מ־SourceObservationEnvelope`.

6.1.4 consequence=`Consumer יכול לשייך Severity שגויה, לפספס Promotion או לבצע Downgrade ועדיין לשמור על אותו aggregate total`.

6.1.5 required fix=`להוסיף לכל Local observation originalSeverity, effectiveSeverity, severitySourceRoot, transitionConditionRoot, evaluatedAt ו־immutable history; aggregate נגזר בלבד`.

6.1.6 acceptance predicate=`84/84 severity bindings resolve למקור; aggregate נגזר הוא בדיוק 39/37/6/2; permutation, reassignment, downgrade ו־F019 reachability mutants נכשלים; no manually edited aggregate`.

## 6.2 `TRD2V2-IHR-F011` — Source roots קיימים אך Record locators ו־Resolver contract חסרים

6.2.1 location=`subject §§1.1.3–1.1.5,3.1, all sourceIds fields,9.1.3–9.1.5`.

6.2.2 defect=`רוב Rows נושאות root+localObservationId בלבד; אין source path/capture ID, report section/record locator, record digest, parser profile או root→artifact resolver. Math/Security families דורשות שני Artifacts אך ה־Subject אינו מפרט path לכל אחד`.

6.2.3 cause=`Hash שימש כתחליף ל־addressable source-record identity`.

6.2.4 consequence=`Offline replay חייב לסרוק Universe לא מוגדר כדי למצוא bytes; ID זהה תחת Root אחר או Artifact חסר אינו מקבל terminal דטרמיניסטי`.

6.2.5 required fix=`להוסיף SourceArtifactIndex ו־SourceRecordLocator עם path/capture URI, artifact root, record locator, record digest, parser/canonicalization profile, authority class ו־unavailable terminal`.

6.2.6 acceptance predicate=`84/84 locators פותרים ל־record אחד; root/path/locator/digest mismatch, duplicate ID ו־missing artifact נכשלים בשני Resolvers; no filesystem search is required`.

## 6.3 `TRD2V2-IHR-F012` — Mutable lifecycle state משובץ בתוך Immutable candidate bytes

6.3.1 location=`subject §§2.1.6,8.1.7,9.1.6,9.2.1–9.2.3`.

6.3.2 defect=`accepted=0/85, closed=0/84, Gate29=BLOCKED, freeze=ACTIVE ו־PASS-CANDIDATE נכתבו ללא asOf/validThrough בתוך אותו Artifact שמיועד להישאר immutable`.

6.3.3 cause=`Definition content, author-time observation ו־lifecycle state לא הופרדו`.

6.3.4 consequence=`כל Acceptance עתידי הופך את ה־bytes ל־stale או דורש mutation שמבטל Review root; קורא אינו יודע אם הסטטוס Current או historical`.

6.3.5 required fix=`להשאיר ב־Subject רק invariants וליצור detached StatusSnapshot/AcceptanceEnvelope/Invalidation records עם subjectRoot, asOf, validThrough, supersession ו־current-pointer CAS`.

6.3.6 acceptance predicate=`שינוי status אינו משנה Subject root; כל Status read נושא asOf/validThrough ו־subjectRoot; stale snapshot אינו Current; CAS ambiguity yields conflict with zero automatic second write`.

## 6.4 `TRD2V2-IHR-F013` — Rules מורכבים אינם Semantically atomic

6.4.1 location=`subject especially TRD2V2-REQ-008,018,032–051,056–080`.

6.4.2 defect=`רשומות רבות דורשות כמה Schemas, transitions, tests, actors ו־outputs באותו rule; one-observation preservation נשמר, אך אין AtomicClause children או conjunctive roll-up`.

6.4.3 cause=`האיסור על Merge הובן גם כאיסור על Decomposition תחת Parent immutable`.

6.4.4 consequence=`Partial implementation יכולה להיראות Closure של Observation שלם; אין Owner/output/evidence יחיד ואין דרך לבודד failure או rework`.

6.4.5 required fix=`לשמור כל Observation כ־immutable Parent ללא Effort/Credit וליצור AtomicClause children, כל אחד בעל פעולה אחת, Product output אחד, Evidence output נפרד, test IDs ו־conjunctive parent predicate`.

6.4.6 acceptance predicate=`כל compound Rule מפורק; every child passes atomicity schema; parent gets closure only when all mandatory children pass; splitting preserves source parent/noMergeKey and introduces no semantic omission`.

## 6.5 `TRD2V2-IHR-F014` — Public invariant נשמר, אך Public hardening אינו Closure-ready

6.5.1 location=`subject TRD2V2-REQ-034,045,050,072,078; §§8.1.4,9.2.3`.

6.5.2 defect=`ה־Subject אומר במפורש never use Private visibility ו־Public remains intended, אך אינו קושר exact D18-A2 root, current Public/cyber 32-observation roots, control denominator, live readback schema או Hardening gate; Predicate של REQ-050 הוא unknown`.

6.5.3 cause=`ה־Security observation נשמרה כדרישה היסטורית, בזמן שמחקר Public/cyber מקיף יותר נוצר מחוץ ל־Raw intake`.

6.5.4 consequence=`אין סמכות להפוך את המאגר ל־Private, אך גם אין בסיס לאשר Push/Merge/Release/Deploy למאגר Public; broad policy claim עלול להקדים Control evidence`.

6.5.5 required fix=`לשמור Public כ־binding invariant; להודות או לדחות במפורש את D18-A2 ו־32 ממצאי Public/cyber; להגדיר PublicRepoHardeningProfile, control denominator, bypass tests, exact-diff permit ו־שני live readbacks לאחר Authority חדשה`.

6.5.6 acceptance predicate=`repository-intent remains Public; Private remediation path count=0; D18/current cyber roots receive explicit disposition; every admitted Public control maps Requirement→Test→Evidence→Gate; until that gate, Push/Merge/Release/Deploy remain unreachable`.

## 6.6 `TRD2V2-IHR-F015` — Source universe אינו Current, סופי או Accepted

6.6.1 location=`subject §§1.1.4–1.1.5,2.1,4.4 TRD2V2-REQ-004,7.3–7.4 TRD2V2-REQ-054..055,9.2.2`.

6.6.2 defect=`ה־Subject קופא על 84 observations אך אינו נושא accepted SourceSet root, finite discovery cut, admitted/excluded dispositions או supersession rule למקורות מאוחרים; לפחות 32 Public/cyber observations Current נמצאות מחוץ ל־84`.

6.6.3 cause=`ה־Artifact נוצר לפני Source-universe acceptance ונועד להיות Closure intake צר`.

6.6.4 consequence=`הוא יכול לשמש historical preservation layer בלבד; כל Claim של complete TRD2 closure או complete cyber coverage יהיה רחב מן הראיות`.

6.6.5 required fix=`לקבל Source-universe contract, ליצור CandidateSourceSet ו־AdmittedSourceSet exact roots, ולתת לכל Source candidate disposition/claim limit; שינוי Cut יוצר Successor`.

6.6.6 acceptance predicate=`finite source cut קיים; admitted+excluded+blocked equals candidate denominator; missing/double-disposition=0; every later source is either outside claim by exact Cut or included in a successor root`.

## 6.7 `TRD2V2-IHR-F016` — Author-time PASS אינו Evidence artifact

6.7.1 location=`subject §9.1.1–9.1.6`.

6.7.2 defect=`§9.1.6 מצהיר PASS-CANDIDATE אך אינו קושר runner/version, command/input root, raw output root, timestamp, environment, negative vectors או independent rerun`.

6.7.3 cause=`תוצאת QA נכתבה כפרוזה בתוך ה־Subject במקום detached evidence`.

6.7.4 consequence=`הצהרת PASS אינה ניתנת לאימות Offline ואינה מגלה parser drift; היא עלולה להתפרש כ־Independent review למרות disclaimer`.

6.7.5 required fix=`ליצור detached MechanicalQAResult עם subjectRoot, runner root/version, test-vector root, command/config, exact counters, raw-output digest, executedAt/validThrough ו־independent replay result`.

6.7.6 acceptance predicate=`שני Runs בלתי תלויים על אותו Root מפיקים אותם counters/output digest; negative mutations לכל invariant נכשלים; self-authored PASS grants zero Acceptance credit`.

# 7. Passed invariants and non-findings

## 7.1 מה כן תקין

7.1.1 ה־Subject לא משנה Product code, Git, Provider, Build או Deploy, ושומר Development freeze ו־Gate29 blocked.

7.1.2 הוא אינו ממציא Rule ל־7 Producer observations ואינו ממציא Predicate ל־20 Security observations.

7.1.3 הוא שומר 84 local identities ללא Merge, Suppression, Closure או Acceptance credit.

7.1.4 הוא שומר את Public repository intent ואוסר במפורש להשתמש ב־Private visibility כפתרון.

7.1.5 הוא אינו מפרסם Product percentage, Remaining hours, Critical path או ETA מספריים; הערכים נשארים unknown/unavailable.

7.1.6 ה־DAG התחבירי, רצף IDs, חמשת השדות, שורשי המקור והעתקת ה־Projection שנבחרה עברו את הבדיקות המכניות שבפרק 3.

## 7.2 מה ה־PASS אינו אומר

7.2.1 `85/85 shape PASS` אינו `85/85 accepted`.

7.2.2 `84/84 identity PASS` אינו `84/84 lossless observation PASS`.

7.2.3 `0 syntactic cycles` אינו `semantic prerequisite graph valid`.

7.2.4 `source root present` אינו `record locator, authority, admission or claim limit valid`.

7.2.5 `Public intent preserved` אינו `Public Push permitted`.

# 8. Required successor order

## 8.1 סדר Fail-closed

8.1.1 קבל תחילה Bootstrap/Review protocol חיצוניים; אין להכניס B0 לתוך ה־Subject שהוא מסמיך.

8.1.2 קבל Source-universe contract ו־AdmittedSourceSet root לפני טענת completeness.

8.1.3 צור SourceObservationEnvelope מלא ו־CanonicalizationProfile לכל 84 המקומיים; אל תמזג או תסגור אותם.

8.1.4 הפרד original reviewer dependencies מ־derived closure DAG; קשר את כל הרשומות ל־Freeze root חיצוני.

8.1.5 פתר 27 MissingValue records רק דרך Authority מתאימה וב־Successor generation.

8.1.6 פרק Rules מורכבים ל־AtomicClause children והפוך Predicates ל־Executable Conformance records.

8.1.7 קשר Public/security/data-lifecycle controls ל־typed graphs, safe terminals, Tests, Evidence ו־Gates.

8.1.8 בצע Mechanical QA detached, Independent reviews, Reconciliation ו־exact-root Acceptance; שום finding פעיל אינו יכול לחיות יחד עם Acceptance success.

## 8.2 Safe terminal

8.2.1 TRD-2 successor Definition generation=`BLOCKED`.

8.2.2 accepted rows=`0/85`; accepted reviewer-local findings=`0/16`.

8.2.3 Gate29=`BLOCKED`; Development freeze=`ACTIVE`.

8.2.4 Product completion, remaining person-hours, critical path ו־calendar ETA=`unknown/unavailable`.

8.2.5 Git/Push/Merge/Release/Deploy/Provider authority=`NONE`; repository visibility intent=`PUBLIC`.
