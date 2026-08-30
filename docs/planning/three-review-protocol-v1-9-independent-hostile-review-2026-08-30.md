# Protocol v1.9 — ביקורת עוינת עצמאית

## 1. זהות, גבול ותוצאה

1.1 ReviewId=`MPRR-V19-IHR-2026-08-30`.

1.2 SubjectPath=`docs/planning/three-review-protocol-v1-9-package-2026-08-30`.

1.3 הזהות הקפואה אומתה מחדש: `packageRoot=1c74cc220d04948be08ce2aec1d3a17125882a5a8a7204630657011a739ac614`; `manifestRoot=7c495484acb39238b0906c169fe7b8cad0d728000e2f04a86dec56c66cafc133`; `subjectRoot=35aadffd26dc4b7b19f02078dafec746b70c0ceecffe87a5f9a94a036fd55299`.

1.4 גבול התפקיד היה Reviewer-only. לא שונה אף byte של Subject, package, Readers, Producer QA, reports או predecessors; לא בוצעו Product, Git, GitHub, Provider, Deployment או network mutations.

1.5 verdict=`REJECT-AS-A-CLOSED-EXECUTABLE-SUCCESSOR;SAFE-BLOCKED-PLANNING-PACKAGE`.

1.6 ממצאים חדשים ונפרדים=17; חומרה=`P0:11;P1:5;P2:1;P3:0`; מצבים=`OPEN-BLOCKING:17;CLOSED:0`; merged=0; accepted=0; waived=0; suppressed=0.

1.7 מיפוי predecessor קשיח=40/40. תוצאת closure עצמאית: `CLOSED-INDEPENDENT-MECHANICAL=1/40`; `OPEN-BLOCKING=39/40`. לפי חומרת predecessor: `P0 closed=0/27;P1 closed=1/11;P2 closed=0/2`.

1.8 הקרדיט הסגור היחיד הוא `MPRR-V17-IHR-F008`, canonical JSON. זהו קרדיט מכני בלבד; `AcceptanceCredit=0` והוא אינו מעניק Review, Approval, Permit או Gate29 passage.

1.9 המצב הבטוח נשמר: `Acceptance=0;Gate29=BLOCKED;developmentFreeze=ACTIVE;repository=PUBLIC;authorityOutputs=0`. Producer PASS נותן Acceptance=0.

## 2. שחזור עצמאי ומכנים

2.1 כל 13 payload members ושלושת producer tools התאימו ל-manifest. ה-manifest הפיזי, Subject וה-package constructor התאימו לשלושת השורשים שבסעיף 1.3.

2.2 שני ה-Readers הורצו מחדש בנפרד, stdout בלבד וללא report path. Reader A ו-Reader B הסתיימו `exit=0;status=PASS`; כל 17 counters היו אפס. לשניהם:

2.2.1 `commonResultRoot=a4b5f65e3026f98448c88e063ce3996cd18364fce2aed67c719c33a884c8465f`.

2.2.2 `validatorResultSetRoot=81d92ded92ed8bee8455f8ec69ea4f08daaca3b5f2aa1746417c877bfff5b555`.

2.2.3 `vectorResultSetRoot=ce48d70f138386d90bbce7d1be359059d3ae03635ef0e12c2ffad44b704f28ca`.

2.2.4 שבעה validators מקומיים סווגו PASS; שמונת ה-validators החיצוניים סווגו תמיד `MISSING-EXTERNAL-INPUT`. לכן ה-PASS הוא consistency של Producer בלבד.

2.3 המכנים הפיזיים אומתו: closure rows=40; predecessor behaviors=574; semantic predicates=4,016; semantic uses=53,450; vectors=743; traces=743; schemas=33; frozen sources=47; CAS comparisons=65; durable members=17; recovery schedules=24.

2.4 חלוקת 743 ה-vectors היא: `CLOSURE=40;PREDECESSOR-BEHAVIOR=574;AUTHORITY=16;CAS=82;RECOVERY=24;PATH=7`. בכל 743 השורות `expectedAuthorityOutputs=0`; אין positive end-to-end Permit-eligible control.

2.5 חלוקת 574 ה-behaviors כוללת בין היתר `SOURCE_MEMBER_MUTATION=354;CAS_MISSING_COMPARISON=65;CAS_RACE=32;OPERATION_KEY_MUTATION=20;EXTERNAL_INPUT_GATE=20;OBSERVED_STATE_EVALUATION=18;MACHINE_TRANSITION=15;DETACHED_BINDING=12;MACHINE_TRACE=9;MODEL_CHECK_ALL=1`.

2.6 47 receipts נקראו מן ה-allowlist, ו-root, mode, bytes ו-lines של ה-bytes הנוכחיים התאימו. `frozenSourceReceiptSetRoot=1e596919f5328df65ba283ecfbf50ba21adfb751edeec0dea2497505bf304ca4`.

2.7 33 schema IDs נוכחיים הם ייחודיים; required fields שווים לשדות; references נוכחיים פתורים; אין `OBJECT` או `ARRAY-OBJECT`. זהו PASS על ה-bytes הנוכחיים, לא mutation proof ולא schema לראיות החיצוניות שטרם קיימות.

2.8 projection נוכחי חושב ל-`normativePackageProjectedBytes=16,068,933`; largest member=13,053,654; projected addition=16,331,077; global budget=`UNKNOWN`; admission=`DENIED-BUDGET-UNKNOWN`. ה-deny הוא תקין; הטענה `duplicateSourceBytesAdded=0` אינה נגזרת על ידי Readers.

## 3. תוצאות ניסיונות ההפרכה

3.1 Closure: `VERIFY-ONE-TO-ONE-CLOSURE-ROW` מחזיר clean אם `(closureId,findingId)` קיים. הוא אינו מריץ את `exactClosurePredicate`. event בשם `CLOSURE-PREDICATE-EVALUATED` הוא hash של טקסט ה-predicate, לא תוצאת predicate. לכן 40/40 הוא inventory, לא closure execution.

3.2 Authority: role slots, separation rule ו-external contracts הם records קפואים, אך אין קלט או evaluator ל-appointments, principals, reviews, approval, signatures, time, revocation או replay. כל הסטטוסים החיצוניים נבחרים לפי membership ב-hardcoded `localValidatorIds`.

3.3 CAS: 65 comparisons ו-17 durable rows נספרים, אבל אין live read, operation-key insertion, storage transaction, concurrency או readback. ה-vectors מסווגים row חסר כ-abort ומזהה durable קיים כ-clean.

3.4 Recovery: terminal נקבע רק משני counters בתוך קלט ה-vector. `scheduleId`, `crashBoundary` ו-`recoveryAction` אינם משפיעים על ההחלטה; לא מתבצעים crash, restart או storage-only recovery.

3.5 Behavior: חלק ניכר מן ה-evaluator קורא fixture fields כמצב אמת. guards אינם מורצים ב-machine transitions; `MODEL_CHECK_ALL` עובר ללא model; detached bindings ו-CAS races משווים שני literals מאותו fixture.

3.6 Semantics: ה-reader מאמת source byte digest ואת ה-root שה-v1.7 כבר הצהיר עבור target/value. הוא אינו מפרש conjunct, אינו בודק entailment מול successor semantics ואינו מריץ semantic-erasure/nonweakening mutation.

3.7 Traces: כל trace נוצר שוב מאותה פונקציית template שמייצרת את ה-expected bytes. 696 traces הם בני חמישה events ו-47 בני שישה; אין instrumentation של file descriptors, guards, signature checks, CAS effects, restarts או remote observations.

3.8 Paths: שבעת path vectors מסווגים strings קבועים. שלושת fixtures של symlink/device/FIFO אינם נפתחים או נבדקים. payload/tool bytes נקראים לפני regular-file/no-follow/size admission; frozen sources משתמשים ב-realpath+lstat ואז read נפרד.

3.9 Report writes: target final נפתח ב-create-new/no-follow, אך parent מאומת לפי path ואז נפתח מאוחר יותר לפי אותו pathname. אין directory descriptor קשור, ולכן parent-swap בין preflight ל-open נשאר TOCTOU.

3.10 PUBLIC/scanners/Git: אין authenticated remote observation, Git object enumeration, scanner execution או pre-push CAS recheck. `repository=PUBLIC` הוא policy/state literal; אין הוכחה ל-remote בפועל.

3.11 Reader parity: Node ו-Ruby נפרדים תחבירית, אך שניהם מממשים את אותם shadow evaluators ואת אותם templates. parity אינו מזהה common-mode semantic failure.

## 4. disposition מדויק לכל 40 ממצאי predecessor

| # | Finding | disposition | evidence/blocker |
|---:|---|---|---|
| 1 | MPRR-V17-IHR-F001 | OPEN-BLOCKING | MPRR-V19-IHR-F001,F014; אין physical removal/reorder corpus |
| 2 | MPRR-V17-IHR-F002 | OPEN-BLOCKING | MPRR-V19-IHR-F001,F014; אין one-byte/tool-swap execution |
| 3 | MPRR-V17-IHR-F003 | OPEN-BLOCKING | MPRR-V19-IHR-F001,F012,F014; אין missing/extra/duplicate/wrong-role mutation corpus |
| 4 | MPRR-V17-IHR-F004 | OPEN-BLOCKING | MPRR-V19-IHR-F006,F014; אין immutable repository/Git identity או descriptor-bound source read |
| 5 | MPRR-V17-IHR-F005 | OPEN-BLOCKING | MPRR-V19-IHR-F009; אין four-parser rediscovery ומחלקות ambiguity מלאות |
| 6 | MPRR-V17-IHR-F006 | OPEN-BLOCKING | MPRR-V19-IHR-F012; current schema PASS ללא recursive mutation closure |
| 7 | MPRR-V17-IHR-F007 | OPEN-BLOCKING | MPRR-V19-IHR-F012; schema-reference universe אינו נבדק adversarially |
| 8 | MPRR-V17-IHR-F008 | CLOSED-INDEPENDENT-MECHANICAL | שני canonical parsers ו-cross-language bytes נבדקו; AcceptanceCredit=0 |
| 9 | MPRR-V17-IHR-F009 | OPEN-BLOCKING | MPRR-V19-IHR-F009,F010; envelope/locator semantics אינם מורצים |
| 10 | MPRR-V17-IHR-F010 | OPEN-BLOCKING | MPRR-V19-IHR-F003,F004; external envelopes/appointments אינם executable |
| 11 | MPRR-V17-IHR-F011 | OPEN-BLOCKING | MPRR-V19-IHR-F003,F004,F009; binding operators ומכפלה אינם מורצים |
| 12 | MPRR-V17-IHR-F012 | OPEN-BLOCKING | MPRR-V19-IHR-F010; custody אינה entailment |
| 13 | MPRR-V17-IHR-F013 | OPEN-BLOCKING | MPRR-V19-IHR-F009; actual נשלט עדיין על ידי fixture semantics |
| 14 | MPRR-V17-IHR-F014 | OPEN-BLOCKING | MPRR-V19-IHR-F011; traces synthesized |
| 15 | MPRR-V17-IHR-F015 | OPEN-BLOCKING | MPRR-V19-IHR-F009; guards אינם executed |
| 16 | MPRR-V17-IHR-F016 | OPEN-BLOCKING | MPRR-V19-IHR-F009; raw-to-event derivation אינה קיימת |
| 17 | MPRR-V17-IHR-F017 | OPEN-BLOCKING | MPRR-V19-IHR-F007,F009; model check hardcoded ולא מחובר ל-CAS |
| 18 | MPRR-V17-IHR-F018 | OPEN-BLOCKING | MPRR-V19-IHR-F002,F004; authority report אינו מחובר ל-external validators/CAS |
| 19 | MPRR-V17-IHR-F019 | OPEN-BLOCKING | MPRR-V19-IHR-F002; positive fully typed path חסר |
| 20 | MPRR-V17-IHR-F020 | OPEN-BLOCKING | MPRR-V19-IHR-F007; CAS shadow בלבד |
| 21 | MPRR-V17-IHR-F021 | OPEN-BLOCKING | MPRR-V19-IHR-F008; recovery shadow בלבד |
| 22 | MPRR-V17-IHR-F022 | OPEN-BLOCKING | MPRR-V19-IHR-F004; signature/trust/time/revocation אינם verified |
| 23 | MPRR-V17-IHR-F023 | OPEN-BLOCKING | MPRR-V19-IHR-F005,F006; scanners ו-remote PUBLIC חסרים |
| 24 | MPRR-V17-IHR-F024 | OPEN-BLOCKING | MPRR-V19-IHR-F006,F007; אין 65 live authenticated reads |
| 25 | MPRR-V17-IHR-F025 | OPEN-BLOCKING | MPRR-V19-IHR-F015; detached-parent swap race לא נסגר |
| 26 | MPRR-V18-IHR-F001 | OPEN-BLOCKING | MPRR-V19-IHR-F002; אין fully supplied validator-set positive control |
| 27 | MPRR-V18-IHR-F002 | OPEN-BLOCKING | MPRR-V19-IHR-F003; appointments/quorum/separation אינם executed |
| 28 | MPRR-V18-IHR-F003 | OPEN-BLOCKING | MPRR-V19-IHR-F004; אין approved algorithm או verifier/trust store |
| 29 | MPRR-V18-IHR-F004 | OPEN-BLOCKING | MPRR-V19-IHR-F002,F004; external targets אינם consumed actual records |
| 30 | MPRR-V18-IHR-F005 | OPEN-BLOCKING | MPRR-V19-IHR-F012; negative recursive schema corpus חסר |
| 31 | MPRR-V18-IHR-F006 | OPEN-BLOCKING | MPRR-V19-IHR-F006,F014; allowlist משפר reproducibility אך repository identity ו-open atomicity חסרים |
| 32 | MPRR-V18-IHR-F007 | OPEN-BLOCKING | MPRR-V19-IHR-F005; scanner receipts אינם קיימים/מאומתים |
| 33 | MPRR-V18-IHR-F008 | OPEN-BLOCKING | MPRR-V19-IHR-F006; remote PUBLIC/push transaction אינם observed |
| 34 | MPRR-V18-IHR-F009 | OPEN-BLOCKING | MPRR-V19-IHR-F007; production CAS adapter=false ואין fault injection |
| 35 | MPRR-V18-IHR-F010 | OPEN-BLOCKING | MPRR-V19-IHR-F008; אין durable restart execution |
| 36 | MPRR-V18-IHR-F011 | OPEN-BLOCKING | MPRR-V19-IHR-F010; semantic execution/receipt חסרים |
| 37 | MPRR-V18-IHR-F012 | OPEN-BLOCKING | MPRR-V19-IHR-F009; behavior adapter אינו physical-state execution |
| 38 | MPRR-V18-IHR-F013 | OPEN-BLOCKING | MPRR-V19-IHR-F011; trace אינו instrumented |
| 39 | MPRR-V18-IHR-F014 | OPEN-BLOCKING | MPRR-V19-IHR-F015; parent-dir TOCTOU/race test חסר |
| 40 | MPRR-V18-IHR-F015 | OPEN-BLOCKING | MPRR-V19-IHR-F013,F014; path vectors אינם filesystem tests |

4.1 כל row קיבל disposition משלו. אין range credit, merge credit, inferred credit או transfer בין rows.

## 5. ממצאים חדשים, לא ממוזגים

### 5.1 MPRR-V19-IHR-F001 — Closure validator בודק נוכחות ולא את predicate

5.1.1 Severity=`P0`; state=`OPEN-BLOCKING`.

5.1.2 Evidence=`reader-a.mjs:231-234,500-502,515-523`; `reader-b.rb:239-244,527-553`; `vectors.jsonl` family CLOSURE=40.

5.1.3 `VERIFY-ONE-TO-ONE-CLOSURE-ROW` מחזיר clean לפי identity בלבד. טקסט `exactClosurePredicate` מוכנס ל-hash של event, אך אין dispatcher, adapter או assertion שמריץ אותו.

5.1.4 Impact=כל 40 rows יכולים לעבור גם כאשר physical mutation, external authority, CAS, semantics, path או positive-control predicates אינם מתקיימים.

5.1.5 Closure=לייצג כל predicate כמכלול typed executable assertions; להריץ לכל row את ה-positive וה-negative corpus הפרטי שלו על copy מבודד; לקשור actual receipts/effects; לאפשר clean רק אם כל assertion עבר.

### 5.2 MPRR-V19-IHR-F002 — אין positive end-to-end Permit-eligible path

5.2.1 Severity=`P0`; state=`OPEN-BLOCKING`.

5.2.2 Evidence=`reader-a.mjs:443-475,500-509`; `reader-b.rb:464-502,527-538`; vectors=743; authority outputs=0/743.

5.2.3 status של שמונת ה-validators החיצוניים תמיד נקבע `MISSING-EXTERNAL-INPUT` לפי hardcoded set. ה-vector היחיד של result-set מצפה BLOCKED. אין דרך להזין 15 validator results תקינים, להגיע `Acceptance=1/ELIGIBLE` באופן synthetic non-authoritative, ואז להוכיח שכל mutation מחזירה block.

5.2.4 Impact=fail-closed הנוכחי בטוח, אך satisfiability של ה-policy וה-wiring המלא אינם מוכחים; predicate 19/26 נשאר פתוח.

5.2.5 Closure=להוסיף external-fixture adapter בלתי סמכותי שמקבל exact typed receipt bytes, מריץ את כל 15 validators, מגיע ל-eligible רק ב-all-of, ואחריו 1:1 mutation לכל receipt, root, role, time, revocation, PUBLIC, CAS ו-finality prerequisite.

### 5.3 MPRR-V19-IHR-F003 — appointments, quorum ו-separation הם policy strings ללא evaluator

5.3.1 Severity=`P0`; state=`OPEN-BLOCKING`.

5.3.2 Evidence=`governance.json`; `external-evidence-contracts.json`; `reader-a.mjs:373-418,443-465`; `reader-b.rb:422-450,464-491`.

5.3.3 Readers בודקים שבעה slot records ומחרוזת separation מדויקת. הם אינם קוראים שבעה appointment envelopes, אינם גוזרים principal לכל slot ואינם בודקים quorum, membership, pairwise exclusions, purpose, epoch, expiry או revocation.

5.3.4 Impact=contract denominator קיים, אך אין הוכחה שאף principal ממונה או ששבעת התפקידים נפרדים.

5.3.5 Closure=להגדיר schema נפרד ל-appointment ו-role assignment; לאמת seven-of-seven מול trust root; לגזור sets ולבדוק exact cardinality וכל exclusion; להריץ unappointed, duplicate principal, same-count substitution, cross-role, expired, revoked ו-wrong-epoch vectors.

### 5.4 MPRR-V19-IHR-F004 — signature, trust, time, revocation ו-replay אינם ניתנים להרצה

5.4.1 Severity=`P0`; state=`OPEN-BLOCKING`.

5.4.2 Evidence=`external-evidence-contracts.json`; `governance.json`; `reader-a.mjs:373-393,443-465`; `reader-b.rb:422-436,464-491`.

5.4.3 approved algorithms ריק, trust store ו-verification adapter חסרים. Readers משווים את מחרוזת החוזה והמצב MISSING בלבד; אין canonical receipt parser, key lookup, crypto verification, clock/freshness math, revocation-head lookup, nonce/operation-key replay rule או finality verification.

5.4.4 Impact=אין כרגע authority, כנדרש; אבל predicate שטוען verification chain, freshness/revocation/replay execution לא נסגר.

5.4.5 Closure=לאחר אישור חיצוני, להקפיא algorithm/trust store בנפרד מן evidence; לאמת canonical signed envelopes ו-key appointment/rotation; לבצע trusted-time, expiry, revocation, finality ו-replay checks; להוסיף malformed, forged, altered, wrong-key, stale, revoked, replayed ו-cross-package vectors.

### 5.5 MPRR-V19-IHR-F005 — scanner receipts אינם schemas או executions

5.5.1 Severity=`P0`; state=`OPEN-BLOCKING`.

5.5.2 Evidence=`external-evidence-contracts.json` contract SCANNER-RECEIPTS; `reader-a.mjs:373-393,443-465`; `reader-b.rb:422-436,464-491`.

5.5.3 קיימת דרישה טקסטואלית ל-two receipts, אך אין scanner receipt schema, scanner binary/config/rule/dictionary binding evaluator, byte-universe enumeration, signature/freshness validation או distinct-appointment check.

5.5.4 Impact=secret/PII/public-safe proof אינו קיים. `repository=PUBLIC` נשאר policy, לא disclosure-safe evidence.

5.5.5 Closure=להפיק שני receipts חתומים משני scanners ממונים ונפרדים על אותו exact write/object byte universe; לקשור tool/config/rules/dictionary/time/revocation; להריץ candidate, dictionary-swap, duplicate scanner, stale receipt ו-wrong-universe mutations.

### 5.6 MPRR-V19-IHR-F006 — remote PUBLIC ו-Git transaction אינם observed או transaction-bound

5.6.1 Severity=`P0`; state=`OPEN-BLOCKING`.

5.6.2 Evidence=`governance.json`; `external-evidence-contracts.json` contract REMOTE-PUBLIC-OBSERVATION; `reader-a.mjs:403-418,443-465`; `reader-b.rb:445-450,464-491`.

5.6.3 אין authenticated remote identity/visibility/ref receipt, אין old/new head fetch, אין complete prospective Git object set ואין pre-push CAS recheck. Reader גם אינו קושר local repository identity או intended Git state ל-package verification.

5.6.4 Impact=policy אומר PUBLIC, אבל ה-remote יכול להיות private או להשתנות בין scan ל-push; scanner universe ו-CAS head יכולים להיות שייכים ל-transactions שונים.

5.6.5 Closure=להגדיר read-only authenticated remote observation; לגזור object closure מן exact local commit/ref; לקשור remote old head, intended new head ושני scanner receipts ל-transaction root אחד; לבצע re-observation מייד לפני mutation ולהיכשל על drift.

### 5.7 MPRR-V19-IHR-F007 — CAS 65/17 הוא shadow model ללא storage transaction

5.7.1 Severity=`P0`; state=`OPEN-BLOCKING`.

5.7.2 Evidence=`cas-recovery-contract.json`; `reader-a.mjs:370-372,500-506`; `reader-b.rb:417-421,527-535`; `productionAdapterExecutable=false`.

5.7.3 65 rows מסומנים MISSING ונבחרים לפי ID; 17 durable members עוברים אם ID קיים. אין read של expected/observed/revocation roots, אין operation-key computation/unique insert, אין serializable transaction, atomic write, concurrent interleaving או post-commit readback.

5.7.4 Impact=`MECHANICAL-CLEAN` על durable member אינו all-or-none proof; zero-or-one Permit ו-CAS non-bypass אינם מוכחים.

5.7.5 Closure=לחבר transactional adapter עם 65 instrumented authenticated reads ו-17 writes בקבוצה אטומית אחת; לגזור operationKey/preimage; לבצע commit/readback; fault-inject stale/revoked heads, same/different preimage races, response loss ו-partial write.

### 5.8 MPRR-V19-IHR-F008 — 24 recovery schedules מסווגים לפי expected counters

5.8.1 Severity=`P0`; state=`OPEN-BLOCKING`.

5.8.2 Evidence=`reader-a.mjs:189-192,370-372,500-506,545-554`; `reader-b.rb:527-535,566-573`; `cas-recovery-contract.json`.

5.8.3 evaluator מחזיר recovered רק אם שני fields בקלט הם 17 ו-1; אחרת no-authority. הוא אינו משווה את input ל-schedule record ואינו משתמש ב-crashBoundary/recoveryAction בהחלטה. trace רק מכריז `PROCESS-RESTARTED-FROM-STORAGE-ONLY`.

5.8.4 Impact=אפשר לשנות schedule identity/action ועדיין לקבל terminal לפי expected counters; אין proof של restart, durable receipt replay, rollback או revocation consumption.

5.8.5 Closure=להריץ את state machine מעל storage adapter מבודד, להזריק crash בכל 24 boundaries, ליצור process חדש שקורא storage בלבד, ולבדוק exact 0-or-17 members, maximum one Permit, same receipt replay ו-no partial authority.

### 5.9 MPRR-V19-IHR-F009 — predecessor behaviors נשארו fixture-driven ו-guards אינם executed

5.9.1 Severity=`P0`; state=`OPEN-BLOCKING`.

5.9.2 Evidence=`reader-a.mjs:302-365`; `reader-b.rb:319-412`; behavior kinds=20; behaviors=574.

5.9.3 `OBSERVED_STATE_EVALUATION` מאמין ל-booleans שב-fixture; `DETACHED_BINDING` ו-`CAS_RACE` משווים literals; replay מאמין ל-sameKey/sameEnvelope; machine transitions מחפשות tuple בלי להריץ guard; dependency coverage בודק counts; `MODEL_CHECK_ALL` מחזיר clean תמיד.

5.9.4 Impact=oracle field mutation אינה מספיקה: שדות fixture אחרים עדיין מכתיבים את ה-actual. 574/574 הוא deterministic replay של fixtures, לא physical behavior preservation.

5.9.5 Closure=להגדיר raw typed inputs ומצב adapter לכל operation; לגזור observations/events/guards; לבצע side effects מבודדים; להשוות oracle רק אחרי actual; להריץ missing/unknown/ambiguous guard, same-count substitution, model state-space וכל mutation פיזי.

### 5.10 MPRR-V19-IHR-F010 — byte/root custody מוצגת כ-semantic entailment

5.10.1 Severity=`P0`; state=`OPEN-BLOCKING`.

5.10.2 Evidence=`reader-a.mjs:236-262`; `reader-b.rb:246-279`; `semantic-entailment.jsonl` rows=4,016; external semantic receipt=MISSING.

5.10.3 Reader מאמת source slice digest ואז משווה `activeTargetRoot/valueRoot` ל-output roots של v1.7, לרבות `sourceDeclared...` מאותם claims. אין evaluator לשפת predicate, אין successor clause execution ואין semantic-erasure, weakening או collision mutation מעבר ל-unique labels.

5.10.4 Impact=claim חלש או שגוי של predecessor נשמר bit-exact ומסומן entailed; 53,450 resolved uses מוכיחים lookup, לא משמעות.

5.10.5 Closure=להגדיר executable conjunct language; למפות כל source clause ל-successor target bytes עצמאיים; להריץ truth/nonweakening checks; למחוק או להחליש כל conjunct בתורו; לאסור generic-presence credit; לקבל external signed semantic receipt על exact package.

### 5.11 MPRR-V19-IHR-F011 — causal traces מסונתזים ולא instrumented

5.11.1 Severity=`P0`; state=`OPEN-BLOCKING`.

5.11.2 Evidence=`reader-a.mjs:511-595`; `reader-b.rb:542-612`; traces=743; lengths=`5:696;6:47`.

5.11.3 expected trace וה-observed trace נבנים מאותה פונקציית template ומאותם frozen records. labels כגון `CRASH-BOUNDARY-INJECTED`, `PROCESS-RESTARTED` ו-`TYPE-SIZE-NOFOLLOW-GUARD-EVALUATED` אינם נובעים מ-instrumented effects.

5.11.4 Impact=trace יכול לעבור כאשר הפעולה המתוארת כלל לא קרתה; common generator מונע זיהוי omission או oracle dependency אמיתיים.

5.11.5 Closure=לפלוט events מתוך instrumentation של actual read/parse/derive/guard/trust/signature/CAS/write/restart/remote operations; להגדיר grammar תלוי operation; להשוות ל-oracle רק לאחר effect; להריץ omission,injection,reroute ו-oracle-edge mutations.

### 5.12 MPRR-V19-IHR-F012 — schema PASS חסר meta-validation ו-recursive mutation corpus

5.12.1 Severity=`P1`; state=`OPEN-BLOCKING`.

5.12.2 Evidence=`reader-a.mjs:162-229`; `reader-b.rb:166-237`; `schemas.json` schemas=33.

5.12.3 ה-bytes הנוכחיים עקביים, אך Readers אינם דורשים exact schema ID set/count, אינם דוחים duplicate schema IDs לפני בניית Map/Hash, אינם מאמתים כל schema record באמצעות meta-schema, ו-stack/cycle argument אינו נאכף. אין vectors ל-missing/extra/type/range/duplicate/wrong-version עבור כל field.

5.12.4 Impact=מכנה 33 ו-zero-generic הוא current-instance check, לא closed schema-universe proof; external appointment/scanner/remote receipt record schemas גם אינם קיימים.

5.12.5 Closure=להקפיא exact schema ID universe; self-validate כל schema; לדחות duplicate fields/IDs, unresolved/cyclic refs ו-required mismatch; להריץ recursive mutation matrix לכל schema ולכל nested field בשני Readers.

### 5.13 MPRR-V19-IHR-F013 — שבעת path vectors הם classifiers ללא filesystem effects

5.13.1 Severity=`P1`; state=`OPEN-BLOCKING`.

5.13.2 Evidence=`reader-a.mjs:477-499`; `reader-b.rb:504-526`; PATH vectors=7; אין `path-fixture` נורמטיבי.

5.13.3 absolute/parent/dot נבדקים תחבירית. symlink/device/FIFO עוברים לפי prefix string בלבד. oversize נבדק לפי declared source receipt bytes. אף case אינו פותח filesystem object או מוכיח no-follow, regular-file, bound size ו-post-open containment.

5.13.4 Impact=path corpus יכול לעבור גם אם real admission code follows symlinks, opens device/FIFO או reads oversized bytes לפני rejection.

5.13.5 Closure=ליצור fixtures מבודדים מחוץ לחבילה, להריץ actual admission עם descriptor-bound root/no-follow/fstat/size limit, ולהוכיח terminals עבור absolute,parent,dot,symlink,device,FIFO,oversize וגם positive regular allowlisted file.

### 5.14 MPRR-V19-IHR-F014 — package/source reads אינם descriptor-bound ו-size check מאוחר

5.14.1 Severity=`P1`; state=`OPEN-BLOCKING`.

5.14.2 Evidence=`reader-a.mjs:108-143`; `reader-b.rb:102-150`.

5.14.3 payload/tools נקראים באמצעות pathname בלי lstat/no-follow/regular-file/post-open containment; limit נבדק רק אחרי `readFileSync/binread`. frozen source עושה realpath+lstat ואז read נפרד, ללא descriptor identity או pre-read size cap.

5.14.4 Impact=symlink alias, parent swap, FIFO/device או oversized replacement יכולים לשנות identity/availability לפני fail. Current bytes הם regular files, אך closure דורש adversarial safety ולא snapshot בלבד.

5.14.5 Closure=לפתוח כל member/source מתוך repository/package dir descriptor עם no-follow; fstat regular file, size/mode ו-containment על אותו descriptor לפני bounded read; לקשור inode/device או equivalent read receipt; להריץ swap/symlink/device/FIFO/oversize races.

### 5.15 MPRR-V19-IHR-F015 — detached report parent נשאר TOCTOU

5.15.1 Severity=`P1`; state=`OPEN-BLOCKING`.

5.15.2 Evidence=`reader-a.mjs:16-32,631-635`; `reader-b.rb:16-31,650-654`.

5.15.3 preflight מאמת realpath של parent, אך שומר candidate pathname. לאחר כל QA הוא פותח את pathname מחדש. `O_EXCL/O_NOFOLLOW` מגנים על final component בלבד; החלפת parent directory/symlink בין השלבים יכולה לנתב create אל namespace אחר.

5.15.4 Impact=report write יכול לצאת מן detached directory גם כשה-target חדש. invalid final targets נכשלו ב-Producer QA, אך parent-swap race לא נבדק.

5.15.5 Closure=לפתוח ולאחוז descriptor של detached directory לפני package read; לבצע create-new/no-follow relative ל-dirfd; fstat parent/final; לבדוק identity לפני ואחרי; להריץ parent rename/symlink swap race בשני implementations.

### 5.16 MPRR-V19-IHR-F016 — duplicate carrier bytes=0 הוא literal ולא מדידה

5.16.1 Severity=`P2`; state=`OPEN-BLOCKING`.

5.16.2 Evidence=`artifact-growth-projection.json`; `reader-a.mjs:420-441`; `reader-b.rb:452-462`.

5.16.3 Readers מחשבים package size ו-source byte sum, אך `duplicateSourceBytesAdded` עובר רק אם השדה שווה literal 0. אין content/chunk comparison או carrier-copy detector. `reusedContentAddressedSourceBytes` הוא סכום receipts ואינו unique-content sum.

5.16.4 Impact=ה-deny עקב budget UNKNOWN נשאר בטוח, אך zero-duplication ו-reuse magnitude אינם independently proven ויכולים להטעות admission planning.

5.16.5 Closure=להגדיר בדיוק מהו duplicate carrier; לגזור unique source content roots; למדוד exact copied full carriers/chunks לפי policy; לחשב projection מן inventory ולא משדה declared; לשמור deny עד budget חיצוני מאושר.

### 5.17 MPRR-V19-IHR-F017 — Reader parity אינה מוכיחה independence מול common-mode semantics

5.17.1 Severity=`P1`; state=`OPEN-BLOCKING`.

5.17.2 Evidence=`reader-a.mjs:302-365,500-595`; `reader-b.rb:319-412,527-612`; identical common roots.

5.17.3 שתי השפות מיישמות את אותו classification design: closure identity lookup, fixture-driven predecessor, expected-counter recovery, string path classifier ו-template traces. parity מוכיחה תרגום עקבי של algorithm משותף, לא oracle בלתי תלוי.

5.17.4 Impact=כל הכשלים המשותפים F001,F007-F011,F013 עוברים בשני Readers ומפיקים אותו PASS/root.

5.17.5 Closure=להחזיק spec/oracle חיצוני immutable; למנות implementation owner נפרד לכל Reader; ליצור mutation corpus בידי גורם שלישי; לדרוש שכל Reader מגלה independently כל mutation ופולט actual events משלו, בלי expected-to-actual generator משותף.

## 6. מסקנה ומצב סמכות

6.1 החבילה משפרת reproducibility לעומת v1.8: allowlist קפוא, roots תקינים, schemas נוכחיים typed, report target final create-new/no-follow, budget UNKNOWN גורר deny, וכל authority נשארת אפס.

6.2 השיפורים האלה אינם סוגרים 39 predicates. המכנים 40/574/4,016/53,450/743/33/47/65/17/24 נכונים ברמת inventory, אך ה-evaluators המרכזיים הם presence checks, classifiers או shadow models.

6.3 FinalDisposition=`REJECT-CLOSURE;RETAIN-SAFE-PLANNING-BLOCK`.

6.4 `IndependentReviewAcceptance=0;ProducerAcceptance=0;HumanApproval=0;Permit=0;Gate29=BLOCKED;developmentFreeze=ACTIVE;repository=PUBLIC;authorityOutputs=0`.
