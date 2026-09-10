# Protocol v1.8 — ביקורת עוינת עצמאית

## 1. זהות, גבול ותוצאה

1.1 ReviewId=MPRR-V18-IHR-2026-08-30.

1.2 SubjectPath=docs/planning/three-review-protocol-v1-8-package-2026-08-30.

1.3 Subject packageRoot=2aec14f85da9068568a0e603292f036bd27a2d4e6c81720e7c59b7bed0c2618d; manifestRoot=5adef086892216bc897e9e9507a6963d0c29dbb3776427a3d3347360ebf42c64.

1.4 גבול התפקיד היה Reviewer-only. אף byte בחבילת v1.8 לא שונה; לא בוצעו Git, GitHub, Provider, Deployment או Product mutations.

1.5 verdict=REJECT-AS-A-CLOSED-EXECUTABLE-OR-ACCEPTANCE-READY-SUCCESSOR.

1.6 ממצאים חדשים ונפרדים=15; חומרה=P0:11,P1:3,P2:1,P3:0; מצבים=OPEN:15,CLOSED:0; merged=0; accepted=0; waived=0.

1.7 מיפוי predecessor קשיח=25/25. תוצאת closure עצמאית: CLOSED-INDEPENDENT-MECHANICAL=1/25 בלבד; OPEN-BLOCKING=24/25. לפי חומרה: P0 closed=0/16; P1 closed=1/8; P2 closed=0/1.

1.8 הקרדיט הסגור היחיד הוא MPRR-V17-IHR-F008, canonical JSON. הוא קרדיט מכני בלבד ואינו מעניק Acceptance, Authority, HumanApproval, Permit או Gate29 passage.

1.9 מצב בטוח מחייב: Acceptance=0;Gate29=BLOCKED;developmentFreeze=ACTIVE;repository=PUBLIC;authorityOutputs=0;independentReceipt=MISSING-EXTERNAL-INPUT.

## 2. שיטת אימות ותוצאות שחזור

2.1 נקראו כל תשעת payload members, שלושת הכלים, manifest, registry, שני semantic shards, 649 vectors, causal graph, 25 closure rows, 31 predecessor rows, v1.7 review ו־findings manifest.

2.2 hash inventory של החבילה תאם ל־FINAL.md עבור כל 14 הקבצים הרשומים. בין היתר: reader-a=921bb2f54a6777da68e4548d4ae1a803439182889e509b54b32b9e292bcee799; reader-b=c1804fe85caef8dec075f4ea2761ad53ade0984c0d6c041f8e1adc29b152034d; semantic shards=2ef0e6de0bd1ec409f3baddba501f97d4f4347816b95c36e7a818de7a7ae4151 ו־62f07de979c2e5ef005ac9b348ee555d2494d4fab75620df8173bd6db19d17b3.

2.3 שני ה־readers הורצו מחדש בנפרד, במצב stdout וללא report path. שניהם הסתיימו exit=1 והפיקו תוצאה זהה:

2.3.1 status=FAIL.

2.3.2 pathMismatch=1;graphMismatch=1;vectorMismatch=1; יתר 16 המונים=0.

2.3.3 current commonResultRoot=d2eaea3d69a97f1e3725731a02de90dc7d065ce61ae881ffa9260ce81f78fbc6.

2.3.4 current vectorResultSetRoot=fb4cde9c0aed6c6201cb6c7b325f3fe8306c8b7f16107bb73ee89b30814182cd.

2.3.5 roots אלה שונים מה־Producer freeze roots commonResultRoot=3c71f0abdefe0ace8b977efd256537379bac380563203aef05ef5daf3246e0ad ו־vectorResultSetRoot=b3e93ff141db602d79987b555ef45423a3332f22483c2f782a4a9bfaf395da13, אף ש־packageRoot ו־manifestRoot לא השתנו.

2.4 סיבת השינוי שוחזרה: שני ה־readers מחשבים בזמן הריצה HEAD, ref, index, tracked diff וכל רשימת הנתיבים ה־untracked מחוץ לחבילת v1.8. קבצי planning חדשים, שאינם חברי החבילה, משנים את observedExternalUntrackedSetRoot ואת gitStateRoot. הדבר מפיל את F004 identity vector; ה־actual result החדש מפיל בהמשך את graph node root. זהו chain אחד, לא שלושה ממצאים ממוזגים.

2.5 ספירה עצמאית של vector operations: 574/649 הם PREDECESSOR_VECTOR_INTEGRITY; 75 בלבד הם successor vectors. 11 critical schema fields עדיין מסומנים object ללא nested schema, לרבות שלושת acceptance snapshots.

## 3. מיפוי קשיח של כל 25 ממצאי v1.7

| מספר | predecessor Finding | אימות עצמאי | disposition |
|---:|---|---|---|
| 1 | MPRR-V17-IHR-F001 | ה־readers מחשבים packageRoot מן ה־members והכלים; אולם ה־corpus כולל רק declared-root substitution על universe סמלי, ולא removal/reordering של החבילה הפיזית. | OPEN-BLOCKING;MECHANICAL-DELTA-PASS |
| 2 | MPRR-V17-IHR-F002 | שלושת הכלים נקראים ונגזרים פיזית; אין one-byte physical mutation או tool-swap vector. ה־negative משנה declaredRoot בלבד. | OPEN-BLOCKING;MECHANICAL-DELTA-PASS |
| 3 | MPRR-V17-IHR-F003 | exact sets וייחודיות נאכפים בנתיב הראשי; ה־corpus אינו מכסה extra,duplicate,wrong-role,wrong-path כנדרש. | OPEN-BLOCKING;MECHANICAL-DELTA-PASS |
| 4 | MPRR-V17-IHR-F004 | realpath, origin ו־Git state נבדקים, אך untracked bytes אינם קשורים והשחזור תלוי ב־live mutable namespace; rerun נכשל. | OPEN-BLOCKING;MPRR-V18-IHR-F006 |
| 5 | MPRR-V17-IHR-F005 | ארבעה parser profiles מופעלים על ה־current bytes; שני הווקטורים בודקים רק equality של rediscovery root ואינם omission,duplicate,overlap,heading-confusion corpus. | OPEN-BLOCKING;MECHANICAL-DELTA-PASS |
| 6 | MPRR-V17-IHR-F006 | יש validator ורוב ה־schemas typed, אך 11 critical nested fields הם generic object ולכן אין recursive closed typing מלא. | OPEN-BLOCKING;MPRR-V18-IHR-F005 |
| 7 | MPRR-V17-IHR-F007 | observed unresolved references=0, אך אין independently declared exact reference universe/version grammar; generic nested records נשארים מחוץ ל־reference walk typed closure. | OPEN-BLOCKING;MPRR-V18-IHR-F005 |
| 8 | MPRR-V17-IHR-F008 | שני implementations נפרדים אוכפים canonical bytes, duplicate rejection, NFC, UTF-8 byte order, valid Unicode, no floats ו־safe integers; shared six-case corpus כולל positive non-BMP order וחמש מחלקות שליליות. | CLOSED-INDEPENDENT-MECHANICAL;ACCEPTANCE-CREDIT-0 |
| 9 | MPRR-V17-IHR-F009 | envelope root קושר ארבעה fields, אך custodyLocator ו־independentReceiptBlockId הם strings לא פתורים; ה־negative משנה declaredRoot ולא מבצע field swap. | OPEN-BLOCKING |
| 10 | MPRR-V17-IHR-F010 | detached envelope schema קיים, אך אין typed role-specific appointment/review/reconciliation/approval/Permit records הקשורים ל־actual package. | OPEN-BLOCKING;MPRR-V18-IHR-F002+F004 |
| 11 | MPRR-V17-IHR-F011 | path resolver קיים, אך evidence הוא generic object; multiplicity הוא literal שאינו נספר; אין missing,malformed,array-cardinality corpus. | OPEN-BLOCKING;MPRR-V18-IHR-F005 |
| 12 | MPRR-V17-IHR-F012 | 57,466 records נשמרים byte-for-byte, אך ה־v1.7 semantic assertions אינם מורצים נגד successor behavior ואין external semantic receipt. | OPEN-BLOCKING;MPRR-V18-IHR-F011 |
| 13 | MPRR-V17-IHR-F013 | oracle מופרד מן evaluate call החדש, אך כל 574 predecessor vectors הוחלפו ב־line-integrity mutation ואינם מריצים את behavior המקורי. | OPEN-BLOCKING;MPRR-V18-IHR-F012 |
| 14 | MPRR-V17-IHR-F014 | יש 5-node/4-edge template לכל vector, אך אין instrumented nodes עבור physical reads, derivations, guards, receipts או effects. | OPEN-BLOCKING;MPRR-V18-IHR-F013 |
| 15 | MPRR-V17-IHR-F015 | guard מופעל לפני transition בנתיב החדש; אין required malformed,unknown,missing,ambiguous-guard test matrix והקשר עצמו caller-asserted. | OPEN-BLOCKING;MECHANICAL-DELTA-PASS |
| 16 | MPRR-V17-IHR-F016 | deriveEvent מקבל שישה validity booleans; הוא אינו גוזר אותם מ־raw signed observations ולכן caller עדיין בוחר בפועל את האירוע. | OPEN-BLOCKING;MPRR-V18-IHR-F001+F004 |
| 17 | MPRR-V17-IHR-F017 | structural invariant בודק שתי transitions ושבעה contexts, אך אינו מחובר ל־receipt validators, CAS, acceptance derivation או כל 64 combinations. | OPEN-BLOCKING;MPRR-V18-IHR-F001+F009 |
| 18 | MPRR-V17-IHR-F018 | report fields אינם literal constants עוד, אך נגזרים מ־unsafe snapshot booleans ו־hardcoded false values במקום validated immutable evidence. | OPEN-BLOCKING;MPRR-V18-IHR-F001+F005 |
| 19 | MPRR-V17-IHR-F019 | positive Permit-eligible path קיים, אך snapshot generic, roots שרירותיים, roles בלתי ממונים וכל evidence predicates caller-asserted. | OPEN-BLOCKING;MPRR-V18-IHR-F001+F002+F005 |
| 20 | MPRR-V17-IHR-F020 | 65 comparisons ו־17 durable IDs נספרים; זהו in-memory fixture reducer, operationKey אינו נאכף ואין transaction/concurrency/storage adapter. | OPEN-BLOCKING;MPRR-V18-IHR-F009 |
| 21 | MPRR-V17-IHR-F021 | שבעה schedule fixtures קיימים, אך אין crash injection או persisted receipt/revocation adapter. | OPEN-BLOCKING;MPRR-V18-IHR-F010 |
| 22 | MPRR-V17-IHR-F022 | external schema קיים, אך signature הוא public hash, trust ו־expected bindings מגיעים מאותו input, freshness/revocation הם booleans. | OPEN-BLOCKING;MPRR-V18-IHR-F003+F004 |
| 23 | MPRR-V17-IHR-F023 | fixture דורש PUBLIC ושני receipts; visibility, transaction, scanners וה־dictionary seal אינם observed/authenticated externally. | OPEN-BLOCKING;MPRR-V18-IHR-F007+F008 |
| 24 | MPRR-V17-IHR-F024 | exact 32-member set נבדק, אך readCount, observedRoot, freshness ו־revocation הם fixture fields; live heads חסרים. | OPEN-BLOCKING;MPRR-V18-IHR-F009 |
| 25 | MPRR-V17-IHR-F025 | stdout default אינו כותב, אך invalid package-local --report path רק מגדיל counter ואז עדיין נכתב בשורה 773/852. | OPEN-BLOCKING;MPRR-V18-IHR-F014 |

3.1 אין partial closure. כל row שלא מקיים את מלוא predicate המקורי נשאר OPEN גם כאשר mechanical delta עבר.

3.2 closure credit אינו transferable בין rows ובין הממצאים החדשים. F008 closure אינו מפחית שום ממצא אחר.

## 4. ממצאים חדשים, לא ממוזגים

### 4.1 MPRR-V18-IHR-F001 — Permit eligibility נגזרת מ־booleans ומשורש חבילה בשליטת המתקשר

4.1.1 Severity=P0;state=OPEN-BLOCKING.

4.1.2 Evidence=reader-a.mjs:533-544,637-645;reader-b.rb:561-573,672-684;causal-vectors.jsonl:611.

4.1.3 deriveAcceptance אינו מריץ closure rows, external validators, semantic proofs, CAS, PUBLIC, time או finality. הוא קורא שבעה booleans מן snapshot. rootsBound דורש רק שכל receipt root ישווה ל־snapshot.packageRoot; הוא אינו דורש ש־snapshot.packageRoot ישווה ל־manifest.packageRoot או computedPackageRoot.

4.1.4 ה־positive vector מגיע ל־TERM-PERMIT-ELIGIBLE עם packageRoot=da1f8e... בעוד ה־actual packageRoot הוא 2aec14.... כרגע adapterPresent=false ולכן authorityOutputs=0; אם adapter יחובר למסלול זה, הבדיקה מאפשרת bypass של כל evidence gates.

4.1.5 Closure=לבטל validity booleans כקלט סמכותי; להעביר exact immutable receipt bytes/roots; להריץ את validators עצמם; לגזור כל predicate; לדרוש computedPackageRoot=manifest.packageRoot=snapshot.packageRoot וכל role-specific receipt root; לקשור את התוצאה ל־CAS operation; להריץ mutation לכל evidence member ולשורש actual package.

### 4.2 MPRR-V18-IHR-F002 — quorum, appointment ו־role separation אינם סגורים

4.2.1 Severity=P0;state=OPEN-BLOCKING.

4.2.2 Evidence=reader-a.mjs:533-538;reader-b.rb:561-570;causal-vectors.jsonl:611.

4.2.3 sufficient identity הוא principals.length>=7 וייחודיות strings. אין trusted appointment roots, signatures, exact role denominators, role membership, epoch, purpose, expiry או revocation. reviewerPrincipals אינם חייבים להיות subset של principals; acceptor יכול להיות reviewer; מספר reviewers אינו נאכף; רק producer-vs-reviewer/acceptor נבדק.

4.2.4 Impact=שבעה hashes שרירותיים יכולים לספק quorum ולהגיע ל־Permit eligibility.

4.2.5 Closure=להגדיר exact typed role slots/quorum; לאמת כל appointment מול trust root חיצוני, package/generation/purpose/time/revocation; לאכוף set inclusion, exact cardinalities וכל pairwise exclusions; להוסיף same-count substitution, cross-role, expired, revoked ו־unappointed principal vectors.

### 4.3 MPRR-V18-IHR-F003 — external signature ניתנת לזיוף ללא secret או public-key verification

4.3.1 Severity=P0;state=OPEN-BLOCKING.

4.3.2 Evidence=reader-a.mjs:665-670;reader-b.rb:716-723;causal-vectors.jsonl:617.

4.3.3 signatureRoot מחושב כ־SHA-256 framing של issuerRoot ו־receiptRoot. כל מתקשר שיודע את שני הערכים יכול ליצור אותו. trustedIssuerRoots מסופק באותו vector input ולכן אינו trust anchor חיצוני.

4.3.4 Impact=receipt מזויף יכול לעבור TERM-MECHANICAL-CLEAN.

4.3.5 Closure=להגדיר canonical signed envelope; לאמת Ed25519/ECDSA או equivalent approved signature מול independently frozen trust store; לקשור key id, algorithm, issuer appointment, rotation, expiry ו־revocation; לא לאפשר trust roots בתוך untrusted evidence payload; להריץ forged-key, wrong-key, altered-byte, revoked-key ו־cross-epoch vectors.

### 4.4 MPRR-V18-IHR-F004 — external receipt מושווה ל־expected values הנשלטים בידי אותו input

4.4.1 Severity=P0;state=OPEN-BLOCKING.

4.4.2 Evidence=reader-a.mjs:665-670;reader-b.rb:716-723;SCHEMA-VECTOR-INPUT-EXTERNAL-EVIDENCE in normative-registry.json:1;causal-vectors.jsonl:617.

4.4.3 expectedPackageRoot,expectedManifestRoot,expectedSubjectRoot,expectedAudience ו־expectedPurpose מגיעים לצד receipt מאותו input. הם אינם נגזרים מן actual package, manifest, role registry או accepted head set. תוצאת EXTERNAL_EVIDENCE גם אינה מוזנת ל־deriveAcceptance; שם קיים externalReceiptsValid boolean נפרד.

4.4.4 Impact=מתקשר יכול לבחור receipt וגם reference target תואם, ולאחר מכן לטעון boolean valid במסלול הסמכות.

4.4.5 Closure=להסיר expected values מן untrusted input; לגזור אותם מן computed package/manifest/subject roots ומ־role-specific policy; להזין validator result object content-addressed ישירות ל־acceptance derivation; לבדוק cross-package,purpose,audience,generation,epoch,head-set substitution.

### 4.5 MPRR-V18-IHR-F005 — critical nested schemas נשארו generic object

4.5.1 Severity=P0;state=OPEN-BLOCKING.

4.5.2 Evidence=normative-registry.json:1;reader-a.mjs:352-386;reader-b.rb:342-392.

4.5.3 11 fields משתמשים ב־object ללא nested schema: SCHEMA-SCHEMA.fieldTypes;SCHEMA-VECTOR.input;SCHEMA-READER-REPORT.counters;SCHEMA-READER-REPORT.verifiedCounts; acceptance/authority/no-self snapshots; AUTHORITY-STATE-CHECK.claimedState; BINDING-PATHS.evidence; MACHINE-STEP.context; SCHEMA-RECORD.record.

4.5.4 Impact=closed-schema claim אינו נכון דווקא בגבולות הסמכות, הראיות והדוחות. missing/extra/type/cardinality semantics בתוך אותם objects אינם נאכפים על ידי schema validator.

4.5.5 Closure=להחליף כל generic object ב־object:SCHEMA-X סגור; להוסיף bounds, exact cardinalities ו־conditional constraints; לאמת reports עצמם; להוסיף recursive mutation לכל field, unknown nested field, missing nested field, wrong type, duplicate ID ו־cardinality boundary.

### 4.6 MPRR-V18-IHR-F006 — package קפוא תלוי ב־Git state חי ואינו reproducible

4.6.1 Severity=P1;state=OPEN-BLOCKING.

4.6.2 Evidence=reader-a.mjs:175-186,698-738;reader-b.rb:142-160;שני reruns בסעיף 2.3.

4.6.3 ה־readers קוראים את כל external untracked path set בזמן הריצה. תוספת planning artifact מחוץ לחבילה משנה result של חבילה ששורשיה לא השתנו. בנוסף, externalUntrackedSetRoot קושר שמות נתיבים בלבד ולא את bytes שלהם, ולכן שינוי תוכן בקובץ untracked קיים אינו מזוהה.

4.6.4 Impact=אי אפשר לשחזר את Producer PASS מן החבילה הקפואה בלבד; future reviews גורמים DoS ראייתי, בעוד שינוי bytes untracked יכול להישאר בלתי קשור.

4.6.5 Closure=להקפיא repository-state receipt מלא עם canonical manifest של כל path+mode+blob root הנדרש; להפריד package verification מ־current-environment admission; לאפשר שחזור offline; לקשור current-state check ל־explicit transaction snapshot ולא לכל workspace; להריץ add/remove/rename/content-change וסדרי review מאוחרים בלי לשנות package QA root.

### 4.7 MPRR-V18-IHR-F007 — scanner receipts ו־dictionary seal הם self-attested hashes

4.7.1 Severity=P0;state=OPEN-BLOCKING.

4.7.2 Evidence=reader-a.mjs:671-680;reader-b.rb:724-735;causal-vectors.jsonl:619.

4.7.3 reader בודק receiptRoot מחושב, שני scannerId/root שונים, dictionarySealRoot שווה, clean=true ו־candidateCount=0. אין signature, trusted appointment, scanner binary/config root, execution evidence, freshness, expiry או revocation; dictionary seal הוא hash בלתי מאומת.

4.7.4 Impact=שני JSON records שהמתקשר בונה בעצמו יכולים להיראות כשתי סריקות עצמאיות נקיות.

4.7.5 Closure=לקבל שני externally signed receipts מ־independently appointed scanners; לקשור tool/config/rule/dictionary roots, exact byte universe, timestamps, expiry/revocation ו־transaction root; לאמת signatures מול trust store שאינו ב־input; להריץ forged,duplicated,stale,wrong-universe ו־dictionary-swap vectors.

### 4.8 MPRR-V18-IHR-F008 — PUBLIC visibility ו־push transaction אינם observed מן ה־remote

4.8.1 Severity=P0;state=OPEN-BLOCKING.

4.8.2 Evidence=reader-a.mjs:671-680,743;reader-b.rb:724-735;normative-registry.json:1;causal-vectors.jsonl:619.

4.8.3 observedVisibility,remote,ref,oldHead,newHead ו־writeObjectRoots הם input fields. אין GitHub/remote visibility receipt, fetch של ref heads, enumeration של exact object closure או binding ל־prospective push command. בדיקת registry.requiredVisibility=PUBLIC אינה תצפית.

4.8.4 Impact=fixture יכול לעבור בעוד remote אמיתי private, heads שונים או object set חסר.

4.8.5 Closure=להגדיר read-only remote observation adapter ו־signed visibility/ref receipt; לבנות exact push transaction מן local object graph וה־remote old head; לקשור את שני scanner receipts לאותו complete write/object set; לבצע pre-push CAS recheck; להיכשל על visibility/head/object drift.

### 4.9 MPRR-V18-IHR-F009 — CAS הוא shadow reducer ואינו atomic storage transaction

4.9.1 Severity=P0;state=OPEN-BLOCKING.

4.9.2 Evidence=normative-registry.json:1 productionAdapterExecutable=false;reader-a.mjs:648-656,740-742;reader-b.rb:687-701;causal-vectors.jsonl:613.

4.9.3 ה־evaluator משווה expectedRoot ו־observedRoot הנמצאים באותו fixture. הוא אינו קורא storage, אינו בודק operationKey uniqueness/content binding, אינו מבצע compare-and-swap, אינו שומר receipt, ואינו מריץ concurrent interleavings. durableWriteIds הם labels בלבד.

4.9.4 Impact=TERM-COMMITTED אינו ראיה לאטומיות, stale-head exclusion, idempotency או zero-or-one Permit.

4.9.5 Closure=לממש transactional adapter contract עם 65 instrumented live reads ו־17 all-or-none durable writes; לקשור operationKey לכל preimage; persist exact receipt; להריץ race/interleaving,response-loss,replay,stale/revoked-head ו־partial-write fault injection מול adapter אמיתי; productionAdapterExecutable יישאר false עד אז.

### 4.10 MPRR-V18-IHR-F010 — recovery הוא schedule classifier ללא durable recovery execution

4.10.1 Severity=P1;state=OPEN-BLOCKING.

4.10.2 Evidence=normative-registry.json:1 productionAdapterExecutable=false;reader-a.mjs:657-664;reader-b.rb:702-715;causal-vectors.jsonl:615-621.

4.10.3 committedMemberIds,exactReceiptAvailable ו־revocationConsumed הם fixture fields. אין persisted operation lookup, crash injection, durability acknowledgement, torn-write detection, consumer readback או revocation recovery.

4.10.4 Impact=ה־suite מסווג תוצאה רצויה אך אינו מוכיח אותה במצב storage לאחר crash.

4.10.5 Closure=להגדיר rooted crash-state machine המחובר לאותו CAS adapter; להזריק כל crash point לפני/אחרי כל durable boundary; לפתוח process חדש; לקרוא storage בלבד; להוכיח exact receipt replay, no partial authority, one Permit maximum ו־atomic revocation consumption.

### 4.11 MPRR-V18-IHR-F011 — semantic preservation הוא byte copy של טענות v1.7, לא הוכחת semantics

4.11.1 Severity=P0;state=OPEN-BLOCKING.

4.11.2 Evidence=reader-a.mjs:451-496,621-623;reader-b.rb:469-515,653-655;semantic-preservation shards;independentReceipt=MISSING-EXTERNAL-INPUT.

4.11.3 כל 57,466 rows משווים source JSON line ל־successorCanonicalRecord זהה. 4,016 predicate records ו־53,450 use records נשמרים, אך assertions שבתוכם אינם מורצים נגד v1.8 target bytes/behavior. זה מעתיק גם את ה־v1.7 unexecuted semantic mapping שנמצא פגום ב־F012.

4.11.4 Impact=successor יכול לשמור בדיוק claim שגוי או לא־מבוצע ולקבל semanticMismatch=0.

4.11.5 Closure=להגדיר executable statement/conjunct language; לפתור כל source conjunct אל exact active successor target; לבצע entailment/no-weakening/no-collision/no-generic-presence checks; להוכיח coverage ובייקציה; לקבל external package-bound semantic receipt. Byte custody לבדה תישאר credit מכני בלבד.

### 4.12 MPRR-V18-IHR-F012 — 574 predecessor vectors צומצמו לבדיקת line integrity

4.12.1 Severity=P0;state=OPEN-BLOCKING.

4.12.2 Evidence=operation histogram 574 PREDECESSOR_VECTOR_INTEGRITY;reader-a.mjs:585-592;reader-b.rb:616-623;causal-vectors.jsonl:1-574.

4.12.3 evaluator קורא שורת v1.7 vector, משנה byte אחד ומוודא שה־hash השתנה. הוא אינו מפענח או מריץ את operation המקורי, state machine, guard, CAS, external gate או oracle. לכן הסרת oracle contamination נעשתה על ידי הסרת behavior, לא על ידי הפרדת oracle מן behavior.

4.12.4 Impact=574/574 predecessor cases יכולים לעבור גם אם כל התנהגות שהתכוונו לבדוק חסרה.

4.12.5 Closure=להגדיר adapter לכל predecessor operation; להמיר input בלבד ללא expected fields; להריץ actual physical/state mutation; להשוות oracle רק לאחר execution; לבצע oracle-metamorphic test שמוכיח actual invariance; לשמור one-to-one operation semantics ו־terminal mapping.

### 4.13 MPRR-V18-IHR-F013 — causal graph הוא template תוצאתי ולא trace של causality

4.13.1 Severity=P0;state=OPEN-BLOCKING.

4.13.2 Evidence=reader-a.mjs:708-738;causal-source-graph.json;MPRR-V18-VEC-F014-POSITIVE at causal-vectors.jsonl:601.

4.13.3 כל vector מקבל בדיוק RAW-INPUT,EVALUATOR,ACTUAL,ORACLE,COMPARE וארבע edges קבועות. אין nodes עבור file read,parser,guard derivation,trust lookup,signature check,CAS read/write,recovery effect או PUBLIC observation. graph positive vector עצמו בודק רק set equality של [a,b] ו־zero supplied count.

4.13.4 Impact=graph יכול להיות מלא צורנית גם כאשר evaluator מדלג על causal prerequisites; הוא אינו מוכיח no oracle path או actual instrumentation ברמת הפעולה.

4.13.5 Closure=להפיק trace מן instrumented reader events; לדרוש exact operation-specific node/edge grammar; לקשור כל read/derivation/effect/root; לאסור unobserved effect; לבצע edge/node omission,injection,reroute ו־oracle-dependency mutations; graph root ייגזר מן trace ולא מתבנית Producer.

### 4.14 MPRR-V18-IHR-F014 — invalid in-package report path עדיין כותב לחבילה

4.14.1 Severity=P2;state=OPEN-BLOCKING.

4.14.2 Evidence=reader-a.mjs:9-10,157,773;reader-b.rb:9-10,124,851-852;causal-vectors.jsonl:624.

4.14.3 reader מזהה reportPath תחת packageDir ומגדיל outputModeMismatch, אך אינו עוצר. בסוף הוא קורא writeFileSync/File.write לאותו path ואז יוצא FAIL. ה־fixture F025 בודק literal mode בלבד ואינו מפעיל את CLI behavior.

4.14.4 Impact=פקודת verification שגויה יכולה לשנות את ה־frozen package שהיא אמורה לבדוק.

4.14.5 Closure=לפתור realpath של parent לפני כל write; לדחות path בתוך package/repository frozen set לפני קריאה כלשהי; להשתמש create-new/no-follow; להוכיח package byte+mode+mtime manifest זהה לפני/אחרי; להוסיף symlink,nonexistent-parent,race ו־in-package CLI tests.

### 4.15 MPRR-V18-IHR-F015 — vector paths יכולים לברוח משורש המאגר

4.15.1 Severity=P1;state=OPEN-BLOCKING.

4.15.2 Evidence=reader-a.mjs:585-599;reader-b.rb:616-630;SCHEMA-VECTOR input ו־path fields ב־normative-registry.json:1.

4.15.3 PREDECESSOR_VECTOR_INTEGRITY ו־TOOL_ROOT_CHECK מעבירים input.sourcePath/input.path אל resolve או Pathname.join ואז קוראים את התוצאה, ללא absolute-path rejection, parent-traversal rejection, realpath containment, symlink policy, regular-file check או size cap. בשתי השפות absolute path מחליף את repository root.

4.15.4 Impact=חבילת review עוינת יכולה לגרום ל־reader לקרוא קובץ מקומי מחוץ למאגר או device בלתי מוגבל לפני שהקורא יודע אם packageRoot הוא ה־root שאושר. הדבר מאפשר local-file oracle מוגבל ו־availability attack.

4.15.5 Closure=לדרוש externally supplied expectedPackageRoot לפני vector execution; להגדיר exact allowed path set; לדחות absolute ו־dot segments; לפתוח descriptor תחת repository root עם no-follow,regular-file,size limits ולוודא containment לאחר open; להוסיף absolute,parent,symlink,device,FIFO ו־oversize vectors בשני readers.

## 5. תנאי successor v1.9

5.1 v1.8 immutable bytes לא ייערכו. v1.9 חייב לייבא exact roots של v1.8, ביקורת זו ו־findings manifest הנלווה.

5.2 v1.9 denominator חייב להיות לפחות 40 distinct rows: 25 inherited predecessor rows ועוד 15 new Findings. אסור merge,range-credit,implicit closure או self-acceptance.

5.3 כל row צריך typed requirement, sole producer, exact input/output schemas, executable closure predicate, positive control, mutation per prerequisite, causal trace ו־independent result root.

5.4 acceptance derivation יצרוך רק outputs של validators מחוברים; לא validity booleans. actual package/manifest/subject roots, role appointments, external trust/time/revocation, live heads, PUBLIC transaction ו־semantic receipt יהיו explicit required inputs.

5.5 CAS, recovery, remote PUBLIC observation ו־scanner trust יישארו production-absent ולא יקבלו Ready/Permit credit עד adapter-backed fault tests ו־external receipts.

5.6 שני readers יפעלו offline על frozen package ו־frozen receipts באופן reproducible. current-environment admission יהיה שלב נפרד, transaction-scoped, ולא ישנה package QA result.

## 6. סיכום סופי

6.1 ה־transport השתפר מהותית: packageRoot וכל tool roots מחושבים, 57,466 semantic records נשמרים exact, schema references observed=0, parser rediscovery קיים, oracle נקרא לאחר evaluate, וה־default reader mode הוא stdout.

6.2 השיפור אינו סוגר את מרכז הסמכות. ה־positive path הוא boolean-driven ו־root-unbound; trust, PUBLIC, CAS, recovery ו־semantics הם reference fixtures; והחבילה הקפואה כבר אינה משחזרת את Producer PASS.

6.3 final disposition=REJECT;newFindings=15/15 OPEN;inheritedClosed=1/25;inheritedOpen=24/25;Acceptance=0;Gate29=BLOCKED;developmentFreeze=ACTIVE;repository=PUBLIC;authorityOutputs=0.
