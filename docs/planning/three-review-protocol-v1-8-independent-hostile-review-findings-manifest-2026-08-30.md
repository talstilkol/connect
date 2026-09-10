# Protocol v1.8 — independent hostile review findings manifest

## 1. חוזה manifest

1.1 ManifestId=MPRR-V18-IHR-FINDINGS-2026-08-30.

1.2 SubjectPath=docs/planning/three-review-protocol-v1-8-package-2026-08-30.

1.3 SubjectPackageRoot=2aec14f85da9068568a0e603292f036bd27a2d4e6c81720e7c59b7bed0c2618d.

1.4 SubjectManifestRoot=5adef086892216bc897e9e9507a6963d0c29dbb3776427a3d3347360ebf42c64.

1.5 ReviewPath=docs/planning/three-review-protocol-v1-8-independent-hostile-review-2026-08-30.md.

1.6 NewFindingDenominator=15 exact non-merged Findings.

1.7 SeverityDenominator=P0:11;P1:3;P2:1;P3:0.

1.8 StateDenominator=OPEN-BLOCKING:15;CLOSED:0;ACCEPTED:0;WAIVED:0;MERGED:0;SUPPRESSED:0.

1.9 InheritedDenominator=25;CLOSED-INDEPENDENT-MECHANICAL:1;OPEN-BLOCKING:24. P0 closure=0/16;P1 closure=1/8;P2 closure=0/1.

1.10 כל Finding נסגר רק באמצעות closure predicate הפרטי שלו, immutable evidence bytes, mutation corpus מתאים וביקורת עוינת עצמאית מאוחרת. אין range credit, implicit credit, producer credit או closure transfer.

1.11 AuthorityState=Acceptance:0;Gate29:BLOCKED;developmentFreeze:ACTIVE;repository:PUBLIC;authorityOutputs:0;independentReceipt:MISSING-EXTERNAL-INPUT.

## 2. ממצאים חדשים

### 2.1 MPRR-V18-IHR-F001 — Caller-asserted, root-unbound Permit eligibility

2.1.1 Severity=P0;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-BOOLEAN-AND-ACTUAL-PACKAGE-ADMISSION-BYPASS.

2.1.2 InheritedLinks=MPRR-V17-IHR-F016,F017,F018,F019.

2.1.3 Evidence=reader-a.mjs:533-544,637-645;reader-b.rb:561-573,672-684;causal-vectors.jsonl:611.

2.1.4 Impact=שבעה booleans ושורש שרירותי יכולים להגיע ל־Permit eligibility ללא actual evidence. authorityOutputs נשאר כרגע 0 רק משום שה־adapter חסר.

2.1.5 ExactClosure=derive eligibility only from executed, content-addressed validator outputs; require computedPackageRoot=manifest.packageRoot=snapshot.packageRoot; consume exact closure, receipt, semantic, CAS, PUBLIC, time and finality roots; remove caller validity booleans; mutate every prerequisite and actual package binding.

### 2.2 MPRR-V18-IHR-F002 — Unappointed and under-constrained quorum

2.2.1 Severity=P0;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-ROLE-APPOINTMENT-QUORUM-SEPARATION-GAP.

2.2.2 InheritedLinks=MPRR-V17-IHR-F010,F019.

2.2.3 Evidence=reader-a.mjs:533-538;reader-b.rb:561-570;causal-vectors.jsonl:611.

2.2.4 Impact=שבעה unique strings מספיקים; role membership, reviewer count, acceptor-vs-reviewer separation, appointment, expiry ו־revocation אינם נאכפים.

2.2.5 ExactClosure=freeze exact role slots and quorum; validate signed package-bound appointments from external trust roots; enforce exact cardinality, membership and all pairwise exclusions; execute unappointed,same-count-substitution,cross-role,expired,revoked and wrong-epoch vectors.

### 2.3 MPRR-V18-IHR-F003 — Forgeable external receipt signature

2.3.1 Severity=P0;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-EXTERNAL-SIGNATURE-NOT-AUTHENTICATED.

2.3.2 InheritedLinks=MPRR-V17-IHR-F022.

2.3.3 Evidence=reader-a.mjs:665-670;reader-b.rb:716-723;causal-vectors.jsonl:617.

2.3.4 Impact=signatureRoot הוא public hash של issuerRoot+receiptRoot; trustedIssuerRoots מגיע מאותו untrusted input. כל מתקשר יכול לזייף receipt שעובר.

2.3.5 ExactClosure=verify an approved asymmetric signature over canonical receipt bytes against an independently frozen trust store; bind algorithm,key id,appointment,rotation,expiry and revocation; reject forged,altered,wrong-key,revoked and cross-epoch receipts.

### 2.4 MPRR-V18-IHR-F004 — Caller-controlled external binding target

2.4.1 Severity=P0;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-EXTERNAL-RECEIPT-EXPECTED-TARGET-SELF-SUPPLY.

2.4.2 InheritedLinks=MPRR-V17-IHR-F010,F016,F022.

2.4.3 Evidence=reader-a.mjs:665-670;reader-b.rb:716-723;normative-registry.json:1 SCHEMA-VECTOR-INPUT-EXTERNAL-EVIDENCE;causal-vectors.jsonl:617.

2.4.4 Impact=receipt ו־expected package/manifest/subject/audience/purpose מגיעים מאותו input; validator result אינו מוזן ל־acceptance, שבו קיים boolean נפרד.

2.4.5 ExactClosure=derive expected roots and role policy only from computed package state and frozen governance; return a rooted validator result consumed directly by acceptance; reject cross-package,purpose,audience,generation,epoch and head-set substitutions.

### 2.5 MPRR-V18-IHR-F005 — Generic nested schemas at authority boundaries

2.5.1 Severity=P0;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-CRITICAL-NESTED-OBJECTS-UNTYPED.

2.5.2 InheritedLinks=MPRR-V17-IHR-F006,F007,F011,F015,F018,F019.

2.5.3 Evidence=normative-registry.json:1;reader-a.mjs:352-386;reader-b.rb:342-392;generic critical field count=11.

2.5.4 Impact=acceptance snapshots, authority claims, binding evidence, machine context, schema-record payload and report maps יכולים להכיל shape שאינו recursively closed.

2.5.5 ExactClosure=replace every generic object with a named closed nested schema; define ranges, conditional rules and exact cardinalities; validate reports; execute recursive missing,extra,type,duplicate-ID and cardinality mutations for every nested field.

### 2.6 MPRR-V18-IHR-F006 — Frozen package depends on mutable live Git namespace

2.6.1 Severity=P1;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-LIVE-GIT-TOCTOU-NONREPRODUCIBLE-PACKAGE.

2.6.2 InheritedLinks=MPRR-V17-IHR-F004,F014.

2.6.3 Evidence=reader-a.mjs:175-186,698-738;reader-b.rb:142-160;rerun counters pathMismatch=1,graphMismatch=1,vectorMismatch=1.

2.6.4 Impact=unchanged packageRoot now yields FAIL and different result roots after unrelated planning files were added; untracked file contents are not bound, only paths.

2.6.5 ExactClosure=freeze path+mode+blob-root repository receipt sufficient for offline reconstruction; separate frozen package QA from transaction-scoped current-state admission; bind untracked bytes where relevant; prove later unrelated files do not alter package QA while path/content/state mutations affect only explicit admission receipts.

### 2.7 MPRR-V18-IHR-F007 — Self-attested scanner and dictionary receipts

2.7.1 Severity=P0;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-PUBLIC-SCANNER-RECEIPT-AUTHENTICITY-ABSENT.

2.7.2 InheritedLinks=MPRR-V17-IHR-F023.

2.7.3 Evidence=reader-a.mjs:671-680;reader-b.rb:724-735;causal-vectors.jsonl:619.

2.7.4 Impact=שני caller-built hashes עם clean=true,candidateCount=0 נחשבים independent scanners; scanner tools, trust, freshness, revocation וה־dictionary seal אינם מאומתים.

2.7.5 ExactClosure=require two externally signed receipts from independently appointed scanners; bind tool/config/rule/dictionary roots, exact byte universe, time, expiry,revocation and transaction; verify against an external trust store; run forged,duplicate,stale,wrong-universe and dictionary-swap vectors.

### 2.8 MPRR-V18-IHR-F008 — PUBLIC visibility and push transaction are not observed

2.8.1 Severity=P0;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-REMOTE-VISIBILITY-AND-PUSH-TRANSACTION-SELF-ASSERTED.

2.8.2 InheritedLinks=MPRR-V17-IHR-F023.

2.8.3 Evidence=reader-a.mjs:671-680,743;reader-b.rb:724-735;normative-registry.json:1;causal-vectors.jsonl:619.

2.8.4 Impact=observedVisibility,remote,ref,heads ו־writeObjectRoots הם fixture fields; אין remote receipt או complete Git object enumeration.

2.8.5 ExactClosure=read and authenticate remote PUBLIC visibility/ref heads; derive complete prospective write-object set from Git objects; bind scanners to that set; perform pre-push CAS recheck; fail on visibility,head or object drift.

### 2.9 MPRR-V18-IHR-F009 — CAS fixture reducer is not an atomic transaction

2.9.1 Severity=P0;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-CAS-SHADOW-REDUCER-NO-STORAGE-ATOMICITY.

2.9.2 InheritedLinks=MPRR-V17-IHR-F017,F020,F024.

2.9.3 Evidence=normative-registry.json:1 productionAdapterExecutable=false;reader-a.mjs:648-656,740-742;reader-b.rb:687-701;causal-vectors.jsonl:613.

2.9.4 Impact=expected ו־observed roots מסופקים יחד; operationKey אינו נאכף; אין storage reads/writes, concurrency, receipt persistence או atomicity proof.

2.9.5 ExactClosure=implement one transactional adapter over exact 65 live comparisons and 17 all-or-none durable members; bind operationKey preimage; persist exact receipt; prove zero-or-one Permit with stale/revoked heads, races, replay,response-loss and partial-write fault injection.

### 2.10 MPRR-V18-IHR-F010 — Recovery classifier is not durable recovery

2.10.1 Severity=P1;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-RECOVERY-SHADOW-REDUCER-NO-CRASH-EXECUTION.

2.10.2 InheritedLinks=MPRR-V17-IHR-F021.

2.10.3 Evidence=normative-registry.json:1 productionAdapterExecutable=false;reader-a.mjs:657-664;reader-b.rb:702-715;causal-vectors.jsonl:615-621.

2.10.4 Impact=fixture booleans מסווגים outcomes בלי crash, process restart, durable lookup, torn-write detection או consumer readback.

2.10.5 ExactClosure=connect a rooted recovery state machine to the CAS adapter; inject every durable boundary crash; restart from storage-only state; prove exact receipt replay,no partial authority,one Permit maximum and atomic revocation consumption.

### 2.11 MPRR-V18-IHR-F011 — Byte custody is presented as semantic proof

2.11.1 Severity=P0;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-BYTE-COPY-WITHOUT-SEMANTIC-ENTAILMENT.

2.11.2 InheritedLinks=MPRR-V17-IHR-F012.

2.11.3 Evidence=reader-a.mjs:451-496,621-623;reader-b.rb:469-515,653-655;semantic preservation rows=57466;independent semantic receipt missing.

2.11.4 Impact=ה־successor מעתיק exact את טענות ה־v1.7 שלא הורצו; claim חלש או שגוי מקבל semanticMismatch=0 אם bytes זהים.

2.11.5 ExactClosure=execute every statement/conjunct against exact active successor targets; prove entailment,no weakening,no collision,no generic-presence credit and full bijective coverage; obtain an external package-bound semantic receipt. Treat byte identity only as custody evidence.

### 2.12 MPRR-V18-IHR-F012 — Predecessor behavior replaced by line-hash mutation

2.12.1 Severity=P0;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-PREDECESSOR-VECTORS-BEHAVIOR-ERASED.

2.12.2 InheritedLinks=MPRR-V17-IHR-F013.

2.12.3 Evidence=574/649 operations PREDECESSOR_VECTOR_INTEGRITY;reader-a.mjs:585-592;reader-b.rb:616-623;causal-vectors.jsonl:1-574.

2.12.4 Impact=כל 574 vectors יכולים לעבור בלי להריץ operation,state,guard,CAS,effect או original terminal; oracle contamination הוסר באמצעות מחיקת behavior.

2.12.5 ExactClosure=provide a typed executable adapter for every predecessor operation; mutate physical input/state only; run actual behavior; compare oracle only afterward; prove oracle mutation does not alter actual output; preserve one-to-one operation and terminal semantics.

### 2.13 MPRR-V18-IHR-F013 — Causal graph is a non-instrumented five-node template

2.13.1 Severity=P0;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-GRAPH-TEMPLATE-NOT-CAUSAL-TRACE.

2.13.2 InheritedLinks=MPRR-V17-IHR-F014.

2.13.3 Evidence=reader-a.mjs:708-738;causal-source-graph.json;causal-vectors.jsonl:601.

2.13.4 Impact=graph shape יכול לעבור בלי לתעד file reads,parser,guard,trust,signature,CAS,recovery,PUBLIC או effects; הוא אינו מוכיח causal execution או oracle non-interference.

2.13.5 ExactClosure=derive graph from instrumented operation-specific events; bind every read,derivation,effect and comparison; enforce exact trace grammar; reject node/edge omission,injection,reroute and oracle-to-evaluator dependency.

### 2.14 MPRR-V18-IHR-F014 — Invalid report path still mutates the frozen package

2.14.1 Severity=P2;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-READER-FAILS-AFTER-IN-PACKAGE-WRITE.

2.14.2 InheritedLinks=MPRR-V17-IHR-F025.

2.14.3 Evidence=reader-a.mjs:9-10,157,773;reader-b.rb:9-10,124,851-852;causal-vectors.jsonl:624.

2.14.4 Impact=package-local --report מגדיל counter אך ה־reader כותב את הקובץ לפני exit FAIL, ולכן verification command יכולה לשנות את Subject.

2.14.5 ExactClosure=reject and exit before write after canonical realpath/parent containment checks; use no-follow and create-new semantics; prove byte,mode and mtime inventory unchanged; execute in-package,symlink,nonexistent-parent and race CLI tests.

### 2.15 MPRR-V18-IHR-F015 — Vector-controlled paths escape the repository

2.15.1 Severity=P1;state=OPEN-BLOCKING;acceptanceCredit=0;noMergeKey=MPRR-V18-VECTOR-PATH-ESCAPE-LOCAL-READ.

2.15.2 InheritedLinks=NONE;new security boundary.

2.15.3 Evidence=reader-a.mjs:585-599;reader-b.rb:616-630;normative-registry.json:1 vector path schemas.

2.15.4 Impact=absolute,parent-traversal,symlink,device או oversized paths יכולים להיקרא מחוץ למאגר לפני external expected package identity admission, ולגרום local-file oracle או availability failure.

2.15.5 ExactClosure=require an externally supplied expectedPackageRoot before vector execution; admit paths from one exact closed set; reject absolute and dot segments; open no-follow regular files under repository root with size limits and post-open containment; execute absolute,parent,symlink,device,FIFO and oversize vectors in both readers.

## 3. exact predecessor disposition

| Ordinal | Finding | Disposition | Blocking new Finding or residual predicate |
|---:|---|---|---|
| 1 | MPRR-V17-IHR-F001 | OPEN-BLOCKING | missing physical removal/reordering corpus |
| 2 | MPRR-V17-IHR-F002 | OPEN-BLOCKING | missing physical byte/tool-swap corpus |
| 3 | MPRR-V17-IHR-F003 | OPEN-BLOCKING | missing extra/duplicate/wrong-role/wrong-path corpus |
| 4 | MPRR-V17-IHR-F004 | OPEN-BLOCKING | MPRR-V18-IHR-F006 |
| 5 | MPRR-V17-IHR-F005 | OPEN-BLOCKING | missing omission/duplicate/overlap/heading-confusion corpus |
| 6 | MPRR-V17-IHR-F006 | OPEN-BLOCKING | MPRR-V18-IHR-F005 |
| 7 | MPRR-V17-IHR-F007 | OPEN-BLOCKING | MPRR-V18-IHR-F005;no exact versioned reference universe |
| 8 | MPRR-V17-IHR-F008 | CLOSED-INDEPENDENT-MECHANICAL | acceptanceCredit=0 |
| 9 | MPRR-V17-IHR-F009 | OPEN-BLOCKING | locator/block identity and field-swap absent |
| 10 | MPRR-V17-IHR-F010 | OPEN-BLOCKING | MPRR-V18-IHR-F002,F004 |
| 11 | MPRR-V17-IHR-F011 | OPEN-BLOCKING | MPRR-V18-IHR-F005;multiplicity not executed |
| 12 | MPRR-V17-IHR-F012 | OPEN-BLOCKING | MPRR-V18-IHR-F011 |
| 13 | MPRR-V17-IHR-F013 | OPEN-BLOCKING | MPRR-V18-IHR-F012 |
| 14 | MPRR-V17-IHR-F014 | OPEN-BLOCKING | MPRR-V18-IHR-F013 |
| 15 | MPRR-V17-IHR-F015 | OPEN-BLOCKING | incomplete malformed/unknown/missing/ambiguous guard corpus |
| 16 | MPRR-V17-IHR-F016 | OPEN-BLOCKING | MPRR-V18-IHR-F001,F004 |
| 17 | MPRR-V17-IHR-F017 | OPEN-BLOCKING | MPRR-V18-IHR-F001,F009 |
| 18 | MPRR-V17-IHR-F018 | OPEN-BLOCKING | MPRR-V18-IHR-F001,F005 |
| 19 | MPRR-V17-IHR-F019 | OPEN-BLOCKING | MPRR-V18-IHR-F001,F002,F005 |
| 20 | MPRR-V17-IHR-F020 | OPEN-BLOCKING | MPRR-V18-IHR-F009 |
| 21 | MPRR-V17-IHR-F021 | OPEN-BLOCKING | MPRR-V18-IHR-F010 |
| 22 | MPRR-V17-IHR-F022 | OPEN-BLOCKING | MPRR-V18-IHR-F003,F004 |
| 23 | MPRR-V17-IHR-F023 | OPEN-BLOCKING | MPRR-V18-IHR-F007,F008 |
| 24 | MPRR-V17-IHR-F024 | OPEN-BLOCKING | MPRR-V18-IHR-F009 |
| 25 | MPRR-V17-IHR-F025 | OPEN-BLOCKING | MPRR-V18-IHR-F014 |

3.1 Exact inherited accounting=25 unique rows;closed=1;open=24;merged=0;suppressed=0;implicitCredit=0;authorityCredit=0;acceptanceCredit=0.

3.2 v1.9 minimum active denominator=40 distinct rows: 25 inherited rows plus 15 new rows. A new defect does not merge or replace its inherited links.

## 4. rerun receipt and safe state

4.1 Reader A exit=1;Reader B exit=1;status parity=FAIL/FAIL.

4.2 Shared counters=pathMismatch:1;graphMismatch:1;vectorMismatch:1;allOtherCounters:0.

4.3 currentCommonResultRoot=d2eaea3d69a97f1e3725731a02de90dc7d065ce61ae881ffa9260ce81f78fbc6.

4.4 currentVectorResultSetRoot=fb4cde9c0aed6c6201cb6c7b325f3fe8306c8b7f16107bb73ee89b30814182cd.

4.5 Frozen packageRoot and manifestRoot remained 2aec14f85da9068568a0e603292f036bd27a2d4e6c81720e7c59b7bed0c2618d and 5adef086892216bc897e9e9507a6963d0c29dbb3776427a3d3347360ebf42c64.

4.6 FinalDisposition=REJECT;Acceptance=0;Gate29=BLOCKED;developmentFreeze=ACTIVE;repository=PUBLIC;authorityOutputs=0;PermitEligibility=0 for real authority.
