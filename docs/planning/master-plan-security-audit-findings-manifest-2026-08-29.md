# 1. Connect — Manifest מנורמל לממצאי ביקורת האבטחה והסמנטיקה

## 1.1 זהות והיקף

1.1.1 מזהה ה־Manifest הוא `CONNECT-MASTER-PLAN-SECURITY-AUDIT-FINDINGS-MANIFEST-2026-08-29`.

1.1.2 מושא הביקורת הוא `/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`.

1.1.3 ה־Raw SHA-256 של מושא הביקורת הוא `643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

1.1.4 דוח המקור של הממצאים הוא `/Users/tal/Documents/connect/web/docs/planning/master-plan-security-semantic-audit-2026-08-29.md`.

1.1.5 ה־Raw SHA-256 הקפוא של דוח המקור הוא `d0d19b90b07f6e59bdef63b5eaaabe5c2ffa162fe90371fdd135876c264855b6`.

1.1.6 סטטוס ה־Manifest הוא `PLANNING-AUDIT-NOT-ACCEPTANCE`.

1.1.7 מניין הרשומות הוא בדיוק `24/24`: ‏`P0=10`, ‏`P1=10`, ‏`P2=4`, ‏`P3=0`.

1.1.8 כל 24 הרשומות הן `OPEN`. ה־Manifest אינו סוגר Finding, אינו מעניק Gate credit ואינו מאשר פיתוח, Merge, Release, Deploy, Credential, Provider, Billing, Delete או X24.

## 1.2 כלל No-merge וקנוניזציה

1.2.1 קיימת רשומה אחת ורק אחת לכל `MSSA-F001–MSSA-F024`.

1.2.2 אסור למזג רשומות לפי כותרת, תחום, Control, Threat, Severity, Remediation משותף או תלות משותפת. `findingId` הוא גבול הסמנטיקה וה־Closure.

1.2.3 השדה `noMergeSemanticDigestInput` הוא JSON קומפקטי ב־UTF-8, ללא Whitespace חיצוני, בסדר שדות קבוע: `findingId`, ‏`severity`, ‏`locator`, ‏`defect`, ‏`impact`, ‏`remediation`, ‏`acceptance`, ‏`dependencies`, ‏`mergeKey`.

1.2.4 `dependencies` מסודר לקסיקוגרפית. `mergeKey` חייב להיות זהה ל־`findingId`. שינוי בכל Field יוצר קלט Digest חדש ומבטל Attestation התלוי בקלט הקודם.

1.2.5 אין להסיק Hash מן המחרוזת בלי לציין במפורש Algorithm, Byte encoding ו־Canonicalization version. מסמך זה מספק את הקלט המדויק, לא Hash מומצא לכל רשומה.

1.2.6 Locator מסוג `subject:` מפנה לסעיפים במושא הביקורת. Locator מסוג `audit:` מפנה לסעיפים בדוח המקור. Locator מסוג `live-observation:` הוא Observation לא־מקודם שחייב Capture/Digest עצמאי לפני Gate use.

# 2. רשומות P0

## 2.1 MSSA-F001

2.1.1 `findingId`: `MSSA-F001`.

2.1.2 `severity`: `P0`.

2.1.3 `locator`: `subject:2.14|34.34.7.1|35.1.1|35.5.1|35.5→35.7`.

2.1.4 `defect`: אין Section 35.6 ואין Registry קנוני של Task leaves אף שה־Master מגדיר עלים כמקור הביצוע היחיד.

2.1.5 `impact`: אין WBS executable, ‏DAG, שעות Bottom-up, Coverage denominator או הוכחה שכל סיכון ו־Gate קיבלו עבודה.

2.1.6 `remediation`: לשלב Registry מלא של עלים בני עד שמונה שעות עם 18/18 שדות מקומיים, IDs דטרמיניסטיים ו־zero inherited fields.

2.1.7 `acceptance`: כל Requirement, Decision, Gate, Threat, Control, Finding, Dynamic source, Capability ו־Conditional package ממופים לעלה; orphan, duplicate, cycle, parent credit ועלים מעל שמונה שעות שווים לאפס.

2.1.8 `dependencies`: `MP-F001`, ‏`MP-F037`, ‏`MP-F040`, ‏`MP-F052`.

2.1.9 `status`: `OPEN`.

2.1.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F001","severity":"P0","locator":"subject:2.14|34.34.7.1|35.1.1|35.5.1|35.5→35.7","defect":"missing canonical Task-leaf Registry","impact":"no executable WBS,DAG,bottom-up hours,coverage denominator or full-risk proof","remediation":"materialize <=8h deterministic 18/18-field zero-inheritance leaves","acceptance":"full universe mapped; orphan=0;duplicate=0;cycle=0;parentCredit=0;over8h=0","dependencies":["MP-F001","MP-F037","MP-F040","MP-F052"],"mergeKey":"MSSA-F001"}`.

## 2.2 MSSA-F002

2.2.1 `findingId`: `MSSA-F002`.

2.2.2 `severity`: `P0`.

2.2.3 `locator`: `subject:34.20|34.36.7.4|34.38.10.10|35.1.1`.

2.2.4 `defect`: ה־Root אינו מפריד את Candidate מ־Producer QA, ‏Review A, ‏presealed Review B, ‏VetoSet, ‏Tal approval ו־DefinitionAcceptance חיצוניים.

2.2.5 `impact`: Candidate או Task leaf עלולים לאשר את עצמם וליצור מעגל סמכות סביב Gate29.

2.2.6 `remediation`: להפוך את כל פעולות הביקורת, ה־Veto, אישור Tal וה־protected CAS ל־Attestations חיצוניים שאינם Task leaves, שעות או Status בתוך Candidate.

2.2.7 `acceptance`: Review B נחתם לפני Review A; כל Actors נפרדים; כל Roots זהים; Missing, stale, conflict, timeout, response loss או ambiguity מסתיימים `REJECTED/BLOCKED` ללא Permit.

2.2.8 `dependencies`: `MSSA-F001`, ‏`MSSA-F003`.

2.2.9 `status`: `OPEN`.

2.2.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F002","severity":"P0","locator":"subject:34.20|34.36.7.4|34.38.10.10|35.1.1","defect":"bootstrap and self-approval authorities are not externally separated","impact":"candidate or Task leaf can authorize itself and Gate29","remediation":"externalize ProducerQA,presealed ReviewB,ReviewA,VetoSet,Tal approval and protected CAS","acceptance":"separate actors;same roots;preseal before ReviewA;all uncertainty terminates REJECTED/BLOCKED without permit","dependencies":["MSSA-F001","MSSA-F003"],"mergeKey":"MSSA-F002"}`.

## 2.3 MSSA-F003

2.3.1 `findingId`: `MSSA-F003`.

2.3.2 `severity`: `P0`.

2.3.3 `locator`: `subject:header|34.38.10.3-10|35.5.0.1;audit:2.2.10`.

2.3.4 `defect`: אין Root manifest זמין ודיגסטי, Canonical digest, Reviews על אותם Bytes או Approval receipt עמיד.

2.3.5 `impact`: שינוי Byte או Appendix יכול לעבור בלי ביטול Approval, ו־Review היסטורי עלול להיות מיוחס ל־Candidate אחר.

2.3.6 `remediation`: לחייב durable absolute locations, raw/canonical digests, schema, producer, reviewed root, checkedAt, expiry ו־supersession לכל A01–A09 ול־Master.

2.3.7 `acceptance`: שני Parsers בלתי תלויים מפיקים אותו Manifest; Reviews A/B קשורים לאותו Root; כל שינוי Byte מבטל תלות; Digest מחושב אחרי Freeze.

2.3.8 `dependencies`: `MP-F030`, ‏`MP-F042`, ‏`MP-F052`, ‏`MSSA-F001`, ‏`MSSA-F002`.

2.3.9 `status`: `OPEN`.

2.3.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F003","severity":"P0","locator":"subject:header|34.38.10.3-10|35.5.0.1;audit:2.2.10","defect":"root assembly,digest,reviews and approval receipts are inadmissible","impact":"byte or appendix substitution can retain stale approval","remediation":"durable A01-A09 and Master manifest with raw/canonical digests,review root,expiry and supersession","acceptance":"two parsers same manifest;A/B same root;byte change invalidates dependencies;digest after freeze","dependencies":["MP-F030","MP-F042","MP-F052","MSSA-F001","MSSA-F002"],"mergeKey":"MSSA-F003"}`.

## 2.4 MSSA-F004

2.4.1 `findingId`: `MSSA-F004`.

2.4.2 `severity`: `P0`.

2.4.3 `locator`: `subject:4.7|5.22|7.4.1|35.4.10.1;decision:D18-A2`.

2.4.4 `defect`: ה־Master מניח Repository פרטי, בניגוד להחלטה העדכנית והמחייבת D18-A2 להשאירו Public.

2.4.5 `impact`: Governance עלול להיסגר באמצעות שינוי Visibility אסור, או ש־Public repository יישאר ללא בקרות חשיפה מתאימות.

2.4.6 `remediation`: להוסיף D18-A2 כ־Superseding decision ולעדכן Scope, Threats, Controls, Tasks, DS-016, Acceptance, VDP ו־GitHub recovery ל־Public-by-design.

2.4.7 `acceptance`: zero stale private-required decisions; Public מופיע ב־Scope וב־live export; Secret/customer-data paths מוכחים absent; Gate2 מותאם ל־Public.

2.4.8 `dependencies`: `D18-A2`, ‏`DS-016`, ‏`MSSA-F014`.

2.4.9 `status`: `OPEN`.

2.4.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F004","severity":"P0","locator":"subject:4.7|5.22|7.4.1|35.4.10.1;decision:D18-A2","defect":"Master private-repository assumption conflicts with binding Public decision D18-A2","impact":"forbidden visibility change or under-governed public exposure","remediation":"supersede all private assumptions and redesign DS-016,threats,controls,tasks,VDP,recovery and Gate2 for Public","acceptance":"stalePrivateDecision=0;Public scope and live export;secret/customer paths absent;Public Gate2","dependencies":["D18-A2","DS-016","MSSA-F014"],"mergeKey":"MSSA-F004"}`.

## 2.5 MSSA-F005

2.5.1 `findingId`: `MSSA-F005`.

2.5.2 `severity`: `P0`.

2.5.3 `locator`: `subject:17.6.3|17.10|35.4.1-13|35.5.29.5|35.7.3.3`.

2.5.4 `defect`: אין שרשרת רשומות אטומית שמחייבת Permit ו־Attempt לאותם Source bytes, ‏Legal decision, ‏Capability revision ו־authority epoch.

2.5.5 `impact`: Terms, role, geography, rate, consent או Legal applicability יכולים להשתנות בין Review ל־Network בלי לבטל Permit ישן.

2.5.6 `remediation`: לקבע את הרצף `MetadataObservation→LegalAssessment→LegalPermit→CapturePermit→AuthorizedCapture→RawDigest→SourceVerification→Parse→SourceUse→SourceSeal→CapabilityProfile→PreExecutionCASPermit→Attempt→ProviderFact/Capture`.

2.5.7 `acceptance`: כל Permit מחייב Roots מדויקים, effectiveAt, expiresAt ו־authorityEpoch; mutation/expiry מבטלים Permit; concurrency test מוכיח ש־Delta גובר על Snapshot ישן.

2.5.8 `dependencies`: `DS-001`, ‏`MP-F010`, ‏`MP-F029`, ‏`MP-F048`, ‏`MSSA-F007`, ‏`MSSA-F008`, ‏`MSSA-F016`.

2.5.9 `status`: `OPEN`.

2.5.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F005","severity":"P0","locator":"subject:17.6.3|17.10|35.4.1-13|35.5.29.5|35.7.3.3","defect":"no atomic source-to-legal-to-permit-to-capture binding","impact":"stale source,legal,rate,consent or authority can authorize a side effect","remediation":"bind full metadata-to-legal-to-capture chain through pre-execution CAS and provider fact","acceptance":"exact roots,effectiveAt,expiresAt,authorityEpoch;mutation revokes permit;delta wins concurrency test","dependencies":["DS-001","MP-F010","MP-F029","MP-F048","MSSA-F007","MSSA-F008","MSSA-F016"],"mergeKey":"MSSA-F005"}`.

## 2.6 MSSA-F006

2.6.1 `findingId`: `MSSA-F006`.

2.6.2 `severity`: `P0`.

2.6.3 `locator`: `subject:35.1.3.10|CTL-001-CTL-020|TH-001-TH-032`.

2.6.4 `defect`: Recovery קיים כ־Prose בלבד ואינו Test mode קנוני הקשור ל־Task ול־Evidence.

2.6.5 `impact`: מחיקה, Restore, Unknown outcome, Queue rebuild, Credential recovery, Incident recovery ו־Cutover יכולים לעבור Completeness בלי Recovery שנוסה.

2.6.6 `remediation`: להוסיף `recoveryTestIds` חובה לכל Control, Threat, Task ו־Capability, וכן `attackTestIds` למסלולים יריבים.

2.6.7 `acceptance`: לכל Risky capability יש Positive, Negative, Failure, Concurrency ו־Recovery tests נפרדים עם Producer, Artifact root, expected terminal, observed result ו־independent review.

2.6.8 `dependencies`: `MSSA-F001`, ‏`MSSA-F007`.

2.6.9 `status`: `OPEN`.

2.6.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F006","severity":"P0","locator":"subject:35.1.3.10|CTL-001-CTL-020|TH-001-TH-032","defect":"recovery is prose rather than canonical executable test identity","impact":"high-risk recovery paths can pass completeness untested","remediation":"mandatory recoveryTestIds plus adversarial attackTestIds on controls,threats,tasks and capabilities","acceptance":"five separate modes with producer,artifact root,expected terminal,observed result and independent review","dependencies":["MSSA-F001","MSSA-F007"],"mergeKey":"MSSA-F006"}`.

## 2.7 MSSA-F007

2.7.1 `findingId`: `MSSA-F007`.

2.7.2 `severity`: `P0`.

2.7.3 `locator`: `subject:17.16.1-6|35.5.8|TH/CTL capabilityIds|TH/CTL implementationTaskIds`.

2.7.4 `defect`: אין Registry אחד־לאחד לכל Capability ו־External/irreversible side-effect instance.

2.7.5 `impact`: Permit או Control למשפחת Send עלולים לדלוף ל־Template, Media, Billing, Email, Delete או Connector אחרים.

2.7.6 `remediation`: ליצור Instance record לכל mutation ולכל Capability מושבתת עם operation, asset, credential, transport, permit, unknown ledger, owner, tests, kill ו־reachability.

2.7.7 `acceptance`: כל reachable callsite שייך ל־Instance יחיד; כל Instance מקבל Gate וחמישה Test modes; Instance חסר או shared permit משאיר Route unimported/disabled.

2.7.8 `dependencies`: `MSSA-F001`, ‏`MSSA-F005`, ‏`MSSA-F006`.

2.7.9 `status`: `OPEN`.

2.7.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F007","severity":"P0","locator":"subject:17.16.1-6|35.5.8|TH/CTL capabilityIds|TH/CTL implementationTaskIds","defect":"no exact registry for each capability and side-effect instance","impact":"permit or control can bleed across distinct mutations","remediation":"one-to-one instance records with operation,asset,credential,transport,permit,unknown ledger,owner,tests,kill and reachability","acceptance":"one instance per reachable callsite;own gate;five modes;missing/shared instance stays unimported and disabled","dependencies":["MSSA-F001","MSSA-F005","MSSA-F006"],"mergeKey":"MSSA-F007"}`.

## 2.8 MSSA-F008

2.8.1 `findingId`: `MSSA-F008`.

2.8.2 `severity`: `P0`.

2.8.3 `locator`: `subject:10.16.5|13.5.5|23.5.7.4|34.33.25|35.5.21|35.5.51`.

2.8.4 `defect`: X24 אינו מכיל אישור נפרד לכל שימוש ב־CSPRNG, ואישור Master כללי אינו הרשאת שימוש.

2.8.5 `impact`: Auth, OAuth state, CSRF, PKCE, invitation/recovery, HMAC challenge או ephemeral key עלולים להיות צפויים, קבועים או בלתי ניתנים למימוש בטוח.

2.8.6 `remediation`: Decision נפרד לכל Use עם primitive, entropy, encoding, TTL, single-use, storage, rotation, revocation, owner, tests ו־expiry; אין `Math.random()` ואין `crypto.randomUUID()` ללא אישור נפרד.

2.8.7 `acceptance`: Tal מאשר כל Decision root מדויק בנפרד; source scan מוכיח שאין שימוש אחר; Revocation משביתה רק את ה־Use המתאים.

2.8.8 `dependencies`: `MSSA-F002`, ‏`MSSA-F015`, ‏`MSSA-F016`, ‏`MSSA-F017`, ‏`X24`.

2.8.9 `status`: `OPEN`.

2.8.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F008","severity":"P0","locator":"subject:10.16.5|13.5.5|23.5.7.4|34.33.25|35.5.21|35.5.51","defect":"X24 lacks exact use-specific CSPRNG approvals","impact":"security tokens or states can be predictable,fixed or unimplementable","remediation":"one decision per use covering primitive,entropy,encoding,TTL,single-use,storage,rotation,revocation,owner,tests and expiry","acceptance":"Tal approves each exact decision root;scan finds no other use;revocation is use-scoped","dependencies":["MSSA-F002","MSSA-F015","MSSA-F016","MSSA-F017","X24"],"mergeKey":"MSSA-F008"}`.

## 2.9 MSSA-F009

2.9.1 `findingId`: `MSSA-F009`.

2.9.2 `severity`: `P0`.

2.9.3 `locator`: `subject:1.8|10.17.1|29.16.4|31.12.3`.

2.9.4 `defect`: Severity reclassification ו־Risk acceptance אינם מופרדים באופן חד־משמעי.

2.9.5 `impact`: P0/P1 עלול לעבור הורדת חומרה מנהלית בלי שינוי Exposure, תיקון או Retest.

2.9.6 `remediation`: להגדיר Reclassification המבוסס Facts, שני Reviewers, Threat evidence ו־Retest; Risk acceptance מותר רק אחרי Effective severity P2/P3.

2.9.7 `acceptance`: Transition מ־P0/P1 ל־accepted/conditional בלתי אפשרי; immutable history שומר Original severity, rationale, reviewers ו־evidence root.

2.9.8 `dependencies`: `MSSA-F002`, ‏`MSSA-F003`.

2.9.9 `status`: `OPEN`.

2.9.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F009","severity":"P0","locator":"subject:1.8|10.17.1|29.16.4|31.12.3","defect":"severity reclassification and risk acceptance are ambiguous","impact":"P0/P1 can be administratively downgraded without exposure change,fix or retest","remediation":"facts,two reviewers,threat evidence and retest for reclassification;risk acceptance only at effective P2/P3","acceptance":"no P0/P1 accepted or conditional transition;immutable original severity,rationale,reviewers,evidence root","dependencies":["MSSA-F002","MSSA-F003"],"mergeKey":"MSSA-F009"}`.

## 2.10 MSSA-F010

2.10.1 `findingId`: `MSSA-F010`.

2.10.2 `severity`: `P0`.

2.10.3 `locator`: `subject:4.10-12|7.7.8|35.4.8.1;file:web/package.json`.

2.10.4 `defect`: `next=16.3.0` ו־`eslint-config-next=16.3.0` נשארו ב־Package, וה־Master עצמו מסווג את הגרסה כחסומה לפי שני Source snapshots קריטיים.

2.10.5 `impact`: Build או Rollback עלולים להפיק Artifact פגיע; Dirty worktree אינו הוכחת תיקון.

2.10.6 `remediation`: לאחר Gate29 ו־Gate1 בלבד, לבצע Dependency-only slice לגרסה המתוקנת העדכנית שאושרה לאחר רענון רשמי.

2.10.7 `acceptance`: אפס Next מושפע ב־resolved graph, שני Artifacts מאומתים, Regression מלא, Advisory mapping ו־rollback artifact מתוקן; עד אז Build/Preview/Deploy blocked.

2.10.8 `dependencies`: `DS-009`, ‏`DS-010`, ‏`MSSA-F014`, ‏`MSSA-F019`.

2.10.9 `status`: `OPEN`.

2.10.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F010","severity":"P0","locator":"subject:4.10-12|7.7.8|35.4.8.1;file:web/package.json","defect":"Next 16.3.0 remains blocked by the Master's own critical source snapshots","impact":"build or rollback can produce a vulnerable artifact","remediation":"post-Gate29/Gate1 dependency-only upgrade selected from dated official refresh","acceptance":"affectedNext=0 in resolved graph;two verified artifacts;full regression;advisory map;fixed rollback artifact","dependencies":["DS-009","DS-010","MSSA-F014","MSSA-F019"],"mergeKey":"MSSA-F010"}`.

# 3. רשומות P1

## 3.1 MSSA-F011

3.1.1 `findingId`: `MSSA-F011`.

3.1.2 `severity`: `P1`.

3.1.3 `locator`: `subject:35.3.10|35.7.2.0.1|35.7.4.5|FR-lock`.

3.1.4 `defect`: Framework lock ו־Requirement crosswalk מציגים 67 מזהים ייחודיים במקום 76 ותשעה FR IDs אינם קיימים ב־Root.

3.1.5 `impact`: Framework coverage ו־Applicability יכולים להיראות מלאים כאשר Requirements חסרים.

3.1.6 `remediation`: לבנות A08/A09 durable lock מלא עם exact artifacts, digests, licenses, freshness, mappings ושתי ביקורות.

3.1.7 `acceptance`: `FR=76/76`, ‏`RG=2/2`, ‏`DS=25/25`; gap, duplicate ו־orphan שווים אפס.

3.1.8 `dependencies`: `A08`, ‏`A09`, ‏`MSSA-F001`, ‏`MSSA-F003`.

3.1.9 `status`: `OPEN`.

3.1.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F011","severity":"P1","locator":"subject:35.3.10|35.7.2.0.1|35.7.4.5|FR-lock","defect":"framework lock and requirement crosswalk are incomplete at 67 of 76 FR identifiers","impact":"coverage and applicability can appear complete with missing requirements","remediation":"durable A08/A09 lock with exact artifacts,digests,licenses,freshness,mappings and two reviews","acceptance":"FR=76/76;RG=2/2;DS=25/25;gap=0;duplicate=0;orphan=0","dependencies":["A08","A09","MSSA-F001","MSSA-F003"],"mergeKey":"MSSA-F011"}`.

## 3.2 MSSA-F012

3.2.1 `findingId`: `MSSA-F012`.

3.2.2 `severity`: `P1`.

3.2.3 `locator`: `subject:DS-001-DS-025;audit:2.2.9`.

3.2.4 `defect`: כל 25 Dynamic sources חסרים exact artifact/API response digest ו־Human authority מלא.

3.2.5 `impact`: URL או תאריך יכולים להחליף Bytes, Entitlement, Legal authority או Account state בפועל.

3.2.6 `remediation`: לקשור captured bytes/API exports, digest, scope, authority, legal disposition, expiry, safe state, delta trigger ו־SourceUse לכל DS.

3.2.7 `acceptance`: Dynamic source ללא Snapshot תקף אינו נכנס ל־Gate; `known digest=25/25` או response-digested capture, עם Human authority מתאים.

3.2.8 `dependencies`: `A08`, ‏`MSSA-F005`, ‏`MSSA-F011`.

3.2.9 `status`: `OPEN`.

3.2.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F012","severity":"P1","locator":"subject:DS-001-DS-025;audit:2.2.9","defect":"all dynamic sources lack exact artifact or API-response digests and complete human authority","impact":"URL or date can substitute for actual bytes,entitlement,legal authority or account state","remediation":"bind captured bytes or API exports,digest,scope,authority,legal disposition,expiry,safe state,delta trigger and SourceUse","acceptance":"no valid snapshot means no gate;known digest=25/25 or response-digested capture with proper human authority","dependencies":["A08","MSSA-F005","MSSA-F011"],"mergeKey":"MSSA-F012"}`.

## 3.3 MSSA-F013

3.3.1 `findingId`: `MSSA-F013`.

3.3.2 `severity`: `P1`.

3.3.3 `locator`: `filesystem:/Users/tal/Documents/connect/.git|/Users/tal/Documents/connect/web/.git`.

3.3.4 `defect`: שני Git roots קיימים בלי WorkspaceRoot lock מחייב.

3.3.5 `impact`: Script, Reviewer או Operator יכולים למדוד, לחתום, לבצע Status או Staging ב־Repository הלא נכון.

3.3.6 `remediation`: כל Planning/QA Task יחייב WorkspaceRoot, ‏GitDir, remote identity, HEAD ו־path-containment proof.

3.3.7 `acceptance`: wrong-root negative test נכשל לפני כל פעולה; Repository המוצר מזוהה תמיד כ־`/Users/tal/Documents/connect/web`.

3.3.8 `dependencies`: `MSSA-F003`, ‏`MSSA-F014`.

3.3.9 `status`: `OPEN`.

3.3.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F013","severity":"P1","locator":"filesystem:/Users/tal/Documents/connect/.git|/Users/tal/Documents/connect/web/.git","defect":"two Git roots exist without an enforced workspace-root lock","impact":"commands can inspect,sign,status or stage the wrong repository","remediation":"bind every planning and QA task to workspaceRoot,GitDir,remote identity,HEAD and path-containment proof","acceptance":"wrong-root test fails before action;product repository always resolves to /Users/tal/Documents/connect/web","dependencies":["MSSA-F003","MSSA-F014"],"mergeKey":"MSSA-F013"}`.

## 3.4 MSSA-F014

3.4.1 `findingId`: `MSSA-F014`.

3.4.2 `severity`: `P1`, מקודם ל־`P0` אם Merge או Deploy reachable.

3.4.3 `locator`: `live-observation:GitHub-public|main-unprotected|rulesets=0|actions-broad|sha-pinning-unproven|secret-scan-off|push-protection-off|dependabot-open=1|code-scan-unproven`.

3.4.4 `defect`: Public הוא Intended, אך בקרות GitHub החיות אינן מוקשחות או אינן מוכחות כ־Artifact.

3.4.5 `impact`: שינוי לא מבוקר, Workflow mutable, Credential leak או Dependency compromise יכולים להגיע ל־default branch ול־Release path.

3.4.6 `remediation`: לשמור Public ולהוסיף Ruleset, PR reviews, CODEOWNERS, required checks, no-force-push, full-SHA Actions, least permissions/OIDC, secret/push/code/dependency scanning ו־signed live export.

3.4.7 `acceptance`: כל Governance controls עוברים live positive/negative/recovery tests ונקשרים ל־DS-016 digest; עד אז Merge/Release/Deploy blocked.

3.4.8 `dependencies`: `D18-A2`, ‏`DS-016`, ‏`MSSA-F004`, ‏`MSSA-F010`, ‏`MSSA-F013`, ‏`MSSA-F019`.

3.4.9 `status`: `OPEN`.

3.4.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F014","severity":"P1","locator":"live-observation:GitHub-public|main-unprotected|rulesets=0|actions-broad|sha-pinning-unproven|secret-scan-off|push-protection-off|dependabot-open=1|code-scan-unproven","defect":"intended Public repository lacks hardened or artifact-proven live governance;promote to P0 if merge or deploy is reachable","impact":"uncontrolled change,mutable workflow,credential leak or dependency compromise can reach default branch and release","remediation":"Public plus ruleset,PR reviews,CODEOWNERS,required checks,no-force-push,full-SHA actions,least permissions/OIDC and security scans","acceptance":"live five-mode governance evidence bound to DS-016;otherwise merge,release and deploy blocked","dependencies":["D18-A2","DS-016","MSSA-F004","MSSA-F010","MSSA-F013","MSSA-F019"],"mergeKey":"MSSA-F014"}`.

## 3.5 MSSA-F015

3.5.1 `findingId`: `MSSA-F015`.

3.5.2 `severity`: `P1`.

3.5.3 `locator`: `subject:TH-001|TH-017|TH-018|CTL-004|CTL-005|CTL-006|CTL-020|MP-F014|MP-F015|MP-F020|MP-F025|MP-F026|MP-F051`.

3.5.4 `defect`: Tenant isolation, Auth ו־BFF controls אינם קשורים ל־Tasks, live exports, named owners, Evidence ו־Reviewers קבילים.

3.5.5 `impact`: BOLA, stale membership, Preview→Prod, CSRF/XSS session riding, RLS bypass או direct Railway route אינם נשללים.

3.5.6 `remediation`: לבנות route/trust/session matrix, named roles, X24 decisions, Clerk/Vercel exports, OIDC/user envelope, RLS live matrix ו־direct-ingress denial.

3.5.7 `acceptance`: אותו Artifact עובר Positive, Negative, Failure, Concurrency ו־Recovery tests לכל boundary; privileged mutation נשארת disabled עד השלמה.

3.5.8 `dependencies`: `MSSA-F006`, ‏`MSSA-F007`, ‏`MSSA-F008`, ‏`MSSA-F012`.

3.5.9 `status`: `OPEN`.

3.5.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F015","severity":"P1","locator":"subject:TH-001|TH-017|TH-018|CTL-004|CTL-005|CTL-006|CTL-020|MP-F014|MP-F015|MP-F020|MP-F025|MP-F026|MP-F051","defect":"tenant,auth and BFF controls lack admissible task,live-export,owner,evidence and review bindings","impact":"BOLA,stale membership,preview-to-prod,session riding,RLS bypass or direct ingress remain unexcluded","remediation":"route/trust/session matrix,named roles,X24,live identity exports,exact envelopes,RLS matrix and ingress denial","acceptance":"same artifact passes five modes per boundary;privileged mutations disabled until complete","dependencies":["MSSA-F006","MSSA-F007","MSSA-F008","MSSA-F012"],"mergeKey":"MSSA-F015"}`.

## 3.6 MSSA-F016

3.6.1 `findingId`: `MSSA-F016`.

3.6.2 `severity`: `P1`.

3.6.3 `locator`: `subject:DS-001|MP-F005-MP-F010|MP-F029|MP-F033|Gate12`.

3.6.4 `defect`: Meta asset, Legal source, live rate ו־one-attempt controls אינם מוכחים על Instance חי ומדויק.

3.6.5 `impact`: wrong asset, credential או recipient; stale consent, quality או rate; duplicate attempt; false sent status; blind retry.

3.6.6 `remediation`: לקשור Test WABA graph, exact source/legal chain, live rate snapshots, layered minimum, one-attempt fault matrix, provider/webhook facts, kill, drain ו־reconciliation.

3.6.7 `acceptance`: כל Instance עובר חמישה Modes, Tal מאשר Policy root, ו־Outbound cap נשאר אפס עד Live evidence תקף.

3.6.8 `dependencies`: `MSSA-F005`, ‏`MSSA-F006`, ‏`MSSA-F007`, ‏`MSSA-F008`, ‏`MSSA-F012`.

3.6.9 `status`: `OPEN`.

3.6.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F016","severity":"P1","locator":"subject:DS-001|MP-F005-MP-F010|MP-F029|MP-F033|Gate12","defect":"Meta asset,legal source,live rate and one-attempt controls lack exact live-instance proof","impact":"wrong asset,credential,recipient;stale consent,quality,rate;duplicate attempt;false sent;blind retry","remediation":"bind test-WABA graph,source/legal chain,live rate,layered minimum,fault matrix,provider facts,kill,drain and reconciliation","acceptance":"five modes per instance;Tal approves policy root;outbound cap remains zero until valid live evidence","dependencies":["MSSA-F005","MSSA-F006","MSSA-F007","MSSA-F008","MSSA-F012"],"mergeKey":"MSSA-F016"}`.

## 3.7 MSSA-F017

3.7.1 `findingId`: `MSSA-F017`.

3.7.2 `severity`: `P1`.

3.7.3 `locator`: `subject:DS-002|DS-006-DS-008|MP-F019|MP-F027|MP-F028|MP-F048|MP-F050`.

3.7.4 `defect`: AI ו־File pipeline חסרים Provider/Admin/Legal/AWS/scanner evidence חי וקשור ל־Root.

3.7.5 `impact`: שימוש אסור בנתונים, ZDR כוזב, Cross-tenant retrieval, malicious-file release, parser escape או orphan derived data.

3.7.6 `remediation`: להוכיח AI-off/Upload-off, Provider exports, Legal classification, AISVS/eval provenance, S3/GuardDuty TBAC, parser isolation ו־cascade deletion/recovery.

3.7.7 `acceptance`: אותו Artifact עובר חמישה Modes וביקורת עצמאית; AI, Upload ו־Knowledge נשארים disabled לפי Scope עד השלמה.

3.7.8 `dependencies`: `MSSA-F005`, ‏`MSSA-F006`, ‏`MSSA-F008`, ‏`MSSA-F012`.

3.7.9 `status`: `OPEN`.

3.7.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F017","severity":"P1","locator":"subject:DS-002|DS-006-DS-008|MP-F019|MP-F027|MP-F028|MP-F048|MP-F050","defect":"AI and file pipelines lack root-bound live provider,admin,legal,AWS and scanner evidence","impact":"prohibited data use,false ZDR,cross-tenant retrieval,malicious release,parser escape or orphan data","remediation":"prove off-states,provider exports,legal classification,AISVS/eval provenance,TBAC,parser isolation and cascade recovery","acceptance":"same artifact passes five modes and independent review;AI,Upload,Knowledge disabled until complete","dependencies":["MSSA-F005","MSSA-F006","MSSA-F008","MSSA-F012"],"mergeKey":"MSSA-F017"}`.

## 3.8 MSSA-F018

3.8.1 `findingId`: `MSSA-F018`.

3.8.2 `severity`: `P1`.

3.8.3 `locator`: `subject:MP-F011-MP-F013|MP-F016|MP-F019|DS-006-DS-008|retention-v2|backup-restore-v2`.

3.8.4 `defect`: Retention, Delete, Backup ו־Restore חסרים Legal policy, adapters, account separation, WORM, cohort ו־live restore evidence.

3.8.5 `impact`: wrongful deletion, Legal Hold breach, false 90-day/ransomware claim, inconsistent restore או resurrection של opt-out/deleted/unknown operations.

3.8.6 `remediation`: לקשור approved data-class policy, deletion saga, legal-hold races, WORM separation, signed manifest, exact restore binding, quarantine, re-deletion ledger ו־real 90-day cohort.

3.8.7 `acceptance`: חמישה Modes וביקורת עצמאית לכל Adapter; Delete adapter ו־GA/ransomware/90-day claims נשארים disabled עד Evidence.

3.8.8 `dependencies`: `MSSA-F005`, ‏`MSSA-F006`, ‏`MSSA-F007`, ‏`MSSA-F012`.

3.8.9 `status`: `OPEN`.

3.8.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F018","severity":"P1","locator":"subject:MP-F011-MP-F013|MP-F016|MP-F019|DS-006-DS-008|retention-v2|backup-restore-v2","defect":"retention,delete,backup and restore lack legal policy,adapters,separation,WORM,cohort and live restore evidence","impact":"wrongful deletion,legal-hold breach,false resilience claim,inconsistent restore or resurrection","remediation":"bind approved data-class policy,deletion saga,hold races,WORM separation,signed manifest,restore binding,quarantine,re-deletion and real cohort","acceptance":"five modes and independent review per adapter;delete and resilience claims disabled until evidence","dependencies":["MSSA-F005","MSSA-F006","MSSA-F007","MSSA-F012"],"mergeKey":"MSSA-F018"}`.

## 3.9 MSSA-F019

3.9.1 `findingId`: `MSSA-F019`.

3.9.2 `severity`: `P1`.

3.9.3 `locator`: `subject:MP-F018|MP-F024|MP-F025|MP-F034-MP-F036|DS-004|DS-005|DS-009|DS-010|DS-016`.

3.9.4 `defect`: Supply-chain, SSRF/egress ו־Deployment controls אינם קשורים לאכיפה חיה, Trust anchor או Release artifact.

3.9.5 `impact`: Dependency/workflow compromise, wrong artifact, SSRF/private destination, Preview→Prod, certificate/callback takeover או rollback פגיע.

3.9.6 `remediation`: להפיק clean graph, SBOM, provenance, verified signature, fixed adapters, DNS/IP/redirect tests, Public governance, container/TLS proof ו־composite release manifest.

3.9.7 `acceptance`: חמישה Modes, external canary/rollback ו־Root-bound attestations עוברים; Generic URL/connectors absent; Merge/Release/Deploy blocked עד השלמה.

3.9.8 `dependencies`: `MSSA-F003`, ‏`MSSA-F006`, ‏`MSSA-F010`, ‏`MSSA-F012`, ‏`MSSA-F014`.

3.9.9 `status`: `OPEN`.

3.9.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F019","severity":"P1","locator":"subject:MP-F018|MP-F024|MP-F025|MP-F034-MP-F036|DS-004|DS-005|DS-009|DS-010|DS-016","defect":"supply-chain,SSRF,egress and deployment controls lack live enforcement,trust anchor and release binding","impact":"dependency or workflow compromise,wrong artifact,SSRF,preview-to-prod,takeover or vulnerable rollback","remediation":"clean graph,SBOM,provenance,verified signature,fixed adapters,network tests,Public governance,TLS proof and composite manifest","acceptance":"five modes,external canary and rollback,root-bound attestations;generic URLs absent;release path blocked until complete","dependencies":["MSSA-F003","MSSA-F006","MSSA-F010","MSSA-F012","MSSA-F014"],"mergeKey":"MSSA-F019"}`.

## 3.10 MSSA-F020

3.10.1 `findingId`: `MSSA-F020`.

3.10.2 `severity`: `P1`.

3.10.3 `locator`: `subject:5.4|29.5.5|35.1.7|MP-F050`.

3.10.4 `defect`: No-fabrication policy אינו מגובה ב־Registry קנוני של Provenance לכל Test input.

3.10.5 `impact`: Artifact אמיתי יכול לחרוג מ־Purpose, Expiry או Tenant; Sandbox יכול להיות מוצג כ־Live; invented business data יכול לחדור ל־Evidence.

3.10.6 `remediation`: Registry לכל Input עם source class, exact digest, data class, approval, purpose, scope, expiry, destruction receipt ו־dependent-results invalidation.

3.10.7 `acceptance`: `syntheticBusinessEvidenceCount=0`; כל Input ו־Derived result ניתנים לעקיבה ולביטול; Missing provenance דוחה Evidence.

3.10.8 `dependencies`: `MSSA-F001`, ‏`MSSA-F006`.

3.10.9 `status`: `OPEN`.

3.10.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F020","severity":"P1","locator":"subject:5.4|29.5.5|35.1.7|MP-F050","defect":"no-fabrication policy lacks canonical provenance workflow for every test input","impact":"real data can exceed purpose,expiry or tenant;sandbox can masquerade as live;invented data can enter evidence","remediation":"registry source class,digest,data class,approval,purpose,scope,expiry,destruction receipt and dependent invalidation","acceptance":"syntheticBusinessEvidenceCount=0;all inputs and results traceable and revocable;missing provenance rejects evidence","dependencies":["MSSA-F001","MSSA-F006"],"mergeKey":"MSSA-F020"}`.

# 4. רשומות P2

## 4.1 MSSA-F021

4.1.1 `findingId`: `MSSA-F021`.

4.1.2 `severity`: `P2`.

4.1.3 `locator`: `subject:16.9.3|17.1|17.11.6`.

4.1.4 `defect`: Message, Intent, Operation ו־Provider Attempt אינם מוגדרים במילון וב־State machine יחידים.

4.1.5 `impact`: Uniqueness עלול לחול על הישות הלא נכונה, או ש־Retry יוסווה כ־Business decision חדש בלי Approval מלא.

4.1.6 `remediation`: להגדיר זהויות ו־Lineage פורמליים; כל Attempt חדש דורש Intent, Approval ו־Permit חדשים.

4.1.7 `acceptance`: Attempt קודם חייב להיות מוכח `not-started`; אחרת נשאר UNKNOWN ללא Retry; state-machine tests מכסים concurrency ו־recovery.

4.1.8 `dependencies`: `MSSA-F007`, ‏`MSSA-F016`.

4.1.9 `status`: `OPEN`.

4.1.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F021","severity":"P2","locator":"subject:16.9.3|17.1|17.11.6","defect":"message,intent,operation and provider-attempt identities lack one formal state machine","impact":"uniqueness can bind the wrong entity or retry can masquerade as a new business decision","remediation":"formal identities and lineage;every new attempt requires new intent,approval and permit","acceptance":"prior attempt proven not-started or remains UNKNOWN without retry;state-machine concurrency and recovery tests","dependencies":["MSSA-F007","MSSA-F016"],"mergeKey":"MSSA-F021"}`.

## 4.2 MSSA-F022

4.2.1 `findingId`: `MSSA-F022`.

4.2.2 `severity`: `P2`.

4.2.3 `locator`: `subject:risk-register|findings-register|conditional-severity-prose`.

4.2.4 `defect`: Severity promotions נכתבים כטקסט חופשי ואינם Machine-readable.

4.2.5 `impact`: Parser יכול לבחור חומרה נמוכה או לא להפעיל Promotion predicate.

4.2.6 `remediation`: להוסיף `baseSeverity`, ‏`promotionPredicate`, ‏`effectiveSeverity`, ‏`evaluatedAt`, ‏`evidenceRoot` ו־`reviewers`.

4.2.7 `acceptance`: Predicate לא ידוע מקבל את החומרה הגבוהה; Parser tests מוכיחים Transition עקבי ו־immutable history.

4.2.8 `dependencies`: `MSSA-F003`, ‏`MSSA-F009`.

4.2.9 `status`: `OPEN`.

4.2.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F022","severity":"P2","locator":"subject:risk-register|findings-register|conditional-severity-prose","defect":"severity promotion is free text rather than machine-readable state","impact":"parser can select lower severity or skip promotion predicate","remediation":"add baseSeverity,promotionPredicate,effectiveSeverity,evaluatedAt,evidenceRoot and reviewers","acceptance":"unknown predicate selects higher severity;parser transition tests and immutable history","dependencies":["MSSA-F003","MSSA-F009"],"mergeKey":"MSSA-F022"}`.

## 4.3 MSSA-F023

4.3.1 `findingId`: `MSSA-F023`.

4.3.2 `severity`: `P2`.

4.3.3 `locator`: `subject:DS-001-DS-025|checkedBy=Codex-research`.

4.3.4 `defect`: Source researcher, Source verifier, Legal authority, Account capability verifier ו־Approver אינם שדות סמכות נפרדים.

4.3.5 `impact`: Retrieval accuracy עלולה להיחשב בטעות Legal applicability, Contract acceptance או Operational entitlement.

4.3.6 `remediation`: להפריד `retrievedBy`, ‏`sourceVerifiedBy`, ‏`legalDispositionBy`, ‏`accountCapabilityVerifiedBy` ו־`approvedForUseBy`.

4.3.7 `acceptance`: Actor אינו ממלא Role שלא הוסמך לו; missing authority מסיים SourceUse כ־BLOCKED.

4.3.8 `dependencies`: `MSSA-F002`, ‏`MSSA-F005`, ‏`MSSA-F012`.

4.3.9 `status`: `OPEN`.

4.3.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F023","severity":"P2","locator":"subject:DS-001-DS-025|checkedBy=Codex-research","defect":"research,retrieval verification,legal authority,account verification and approval are not separate authority fields","impact":"retrieval accuracy can be mistaken for legal applicability,contract acceptance or entitlement","remediation":"separate retrievedBy,sourceVerifiedBy,legalDispositionBy,accountCapabilityVerifiedBy and approvedForUseBy","acceptance":"no actor fills an unauthorized role;missing authority terminates SourceUse BLOCKED","dependencies":["MSSA-F002","MSSA-F005","MSSA-F012"],"mergeKey":"MSSA-F023"}`.

## 4.4 MSSA-F024

4.4.1 `findingId`: `MSSA-F024`.

4.4.2 `severity`: `P2`.

4.4.3 `locator`: `subject:34.38.10.5;filesystem:/private/tmp/connect-independent-review-a02a-a04-2026-08-27.md`.

4.4.4 `defect`: ה־Master מפנה ל־Review evidence ב־Temporary storage, וה־Bytes אינם קיימים בזמן הביקורת.

4.4.5 `impact`: Digest ללא Bytes אינו ניתן לביקורת, שחזור או Revocation, ו־Reset מוחק Chain of custody.

4.4.6 `remediation`: לקדם Review רק ל־durable evidence store עם immutable path, bytes, digest, producer, retention, redaction ו־manifest membership.

4.4.7 `acceptance`: Temporary output משמש Navigation בלבד; כל promoted Review ניתן לקריאה, Digest verification, reproduction ו־supersession מן ה־Root.

4.4.8 `dependencies`: `MSSA-F003`.

4.4.9 `status`: `OPEN`.

4.4.10 `noMergeSemanticDigestInput`: `{"findingId":"MSSA-F024","severity":"P2","locator":"subject:34.38.10.5;filesystem:/private/tmp/connect-independent-review-a02a-a04-2026-08-27.md","defect":"review evidence is referenced from temporary storage and bytes are absent","impact":"digest without bytes cannot be audited,reproduced or revoked and custody disappears","remediation":"promote only to durable evidence store with immutable path,bytes,digest,producer,retention,redaction and manifest membership","acceptance":"temporary output is navigation only;promoted review supports read,digest verification,reproduction and supersession from root","dependencies":["MSSA-F003"],"mergeKey":"MSSA-F024"}`.

# 5. בקרות שלמות וקבלה

## 5.1 Cardinality

5.1.1 טווח המזהים חייב להיות בדיוק `MSSA-F001–MSSA-F024` ללא Gap, Duplicate או מזהה נוסף.

5.1.2 `recordCount=24`, ‏`uniqueFindingIdCount=24`, ‏`uniqueMergeKeyCount=24`.

5.1.3 `openCount=24`, ‏`closedCount=0`, ‏`mergedCount=0`, ‏`suppressedCount=0`.

5.1.4 `P0=10`, ‏`P1=10`, ‏`P2=4`, ‏`P3=0`.

## 5.2 No-merge invariants

5.2.1 כותרת או Remediation משותפת אינן מאפשרות סגירה משותפת.

5.2.2 Closure receipt חייב לציין Finding ID, ה־Semantic input המדויק או Digest מחושב ממנו, Evidence root, Producer, independent Reviewer, checkedAt, expiry ו־Retest result.

5.2.3 שינוי Severity, Locator, Defect, Impact, Remediation, Acceptance או Dependencies אינו עדכון שקוף; הוא Revision חדש שחייב Supersession link ושתי גרסאות נשמרות.

5.2.4 Finding נסגר רק אם Acceptance שלו עובר במלואו. סגירת תלות אינה סוגרת Finding תלוי.

5.2.5 Risk acceptance אינו Closure ואינו Merge. הוא אסור ל־P0/P1 ונרשם כ־Artifact נפרד ל־P2/P3 בלבד.

## 5.3 Safe terminal

5.3.1 כל Gap, Duplicate, Parsing ambiguity, malformed JSON input, unsorted dependency, merge-key mismatch, stale report SHA או subject SHA mismatch מסתיים `MANIFEST-REJECTED`.

5.3.2 `MANIFEST-REJECTED` משאיר את פסק הדין `REJECT`, ‏Gate29 `BLOCKED`, ‏Freeze `ACTIVE`, וכל Capability מסוכנת במצב הבטוח המתועד בדוח.

5.3.3 ה־Manifest אינו מהווה `DefinitionAcceptance`. Producer של ה־Manifest אינו רשאי לאשר אותו, להעניק לעצמו Review credit או להנפיק Planning materialization permit.

# 6. פסק דין

6.1 ה־Manifest מנרמל `24/24` ממצאים בלי מיזוג סמנטי.

6.2 פסק הדין המיובא מדוח המקור נשאר `REJECT`; ‏Gate29 נשאר `BLOCKED`; ‏Development freeze נשאר `ACTIVE`.

6.3 רק Closure evidence נפרד, Root-bound, Independently reviewed ותקף לכל Finding יכול לשנות את Status שלו. עצם קיום ה־Manifest אינו התקדמות ביצועית ואינו הרשאת חזרה לפיתוח.
