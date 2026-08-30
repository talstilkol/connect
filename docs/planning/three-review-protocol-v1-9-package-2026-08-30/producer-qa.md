# Protocol v1.9 — Producer QA

## 1. זהות וגבול

1.1 ArtifactId=`CONNECT-THREE-REVIEW-PROTOCOL-V1-9-IMMUTABLE-SUCCESSOR-2026-08-30`.

1.2 זהו QA של ה־Producer בלבד. הוא אינו ביקורת עוינת עצמאית, אינו closure credit ואינו Authority.

1.3 המצב שנאכף בכל תוצאה הוא `Acceptance=0;Gate29=BLOCKED;developmentFreeze=ACTIVE;repository=PUBLIC;authorityOutputs=0`.

## 2. קלטים קפואים

2.1 ביקורת v1.8 אומתה מול SHA-256=`7fe0c2b079172e4c6a946dd86da32a34cd8a718060a7cdc7a5ae7fa60823d40d`.

2.2 findings manifest של v1.8 אומת מול SHA-256=`6c4f8cda5d06f2df169c39607c2ef898e55379f6a34da225110f91ba5220fae1`.

2.3 `frozen-source-receipt.jsonl` מכיל 47 receipts מדויקים. `frozenSourceReceiptSetRoot=1e596919f5328df65ba283ecfbf50ba21adfb751edeec0dea2497505bf304ca4`.

2.4 לא שוכפלו carriers קיימים: `duplicateSourceBytesAdded=0`. הקוראים משתמשים רק ב־repo-relative allowlist הקפוא, ללא Git, network או workspace enumeration.

## 3. Reproducibility של ה־Producer

3.1 הפקודה `node generate.mjs` הסתיימה ב־exit 0.

3.2 הרצה חוזרת על אותם קלטים הפיקה 17/17 קבצים זהים ברמת bytes ו־SHA-256; `changed=[]`.

3.3 תוצאת ההרצה: 40 closure rows,‏ 574 predecessor behaviors,‏ 4,016 semantic predicates,‏ 53,450 semantic uses,‏ 743 vectors ו־13 payload members.

3.4 `packageRoot=1c74cc220d04948be08ce2aec1d3a17125882a5a8a7204630657011a739ac614`.

3.5 `manifestRoot=7c495484acb39238b0906c169fe7b8cad0d728000e2f04a86dec56c66cafc133`.

## 4. שני Readers בלתי תלויים

4.1 Reader A הוא Node.js; Reader B הוא Ruby. שניהם read-only כברירת מחדל ומימשו parsing, canonicalization, schemas, roots, evaluators ו־reports בנפרד.

4.2 שתי הריצות הסתיימו ב־exit 0 וב־`status=PASS`.

4.3 לכל Reader יש 17 counters, וכל 17 הערכים הם אפס.

4.4 roots משותפים וזהים:

4.4.1 `commonResultRoot=a4b5f65e3026f98448c88e063ce3996cd18364fce2aed67c719c33a884c8465f`.

4.4.2 `validatorResultSetRoot=81d92ded92ed8bee8455f8ec69ea4f08daaca3b5f2aa1746417c877bfff5b555`.

4.4.3 `vectorResultSetRoot=ce48d70f138386d90bbce7d1be359059d3ae03635ef0e12c2ffad44b704f28ca`.

4.5 שבעה validators מקומיים הם `PASS`; שמונת validators התלויים בראיות חיצוניות הם `MISSING-EXTERNAL-INPUT`. לכן Acceptance נגזרת ל־0 ולא מתקבל Permit.

## 5. מכנים מכניים

5.1 closure denominator הוא 40/40 שורות נפרדות: 25 ממצאי v1.7 ועוד 15 ממצאי v1.8; unique finding IDs=40; merged=0; `acceptanceCredit=0` בכל שורה.

5.2 behavior denominator הוא 574/574 operations מקוריים מ־v1.7. evaluator input root מסיר שדות Oracle, וכל שדות Oracle הידועים עוברים mutation מטמורפי בלי לשנות actual result.

5.3 semantic denominator הוא 4,016/4,016 predicates ו־53,450/53,450 uses. נבדקו source byte ranges, active target roots, active value roots, no weakening, no collision ו־bijective predicate coverage.

5.4 CAS reference contract מכיל בדיוק 65 comparisons,‏ 17 durable members ו־24 recovery schedules. `productionAdapterExecutable=false` נשמר.

5.5 causal corpus מכיל 743/743 traces. כל event קושר `evidenceRoot` ו־`previousEventRoot`; effect נצפה לפני Oracle comparison; omission, injection או reroute משנים את trace root.

5.6 path corpus הוא exact closed set של שבע מחלקות: absolute, parent traversal, dot segment, symlink metadata, device metadata, FIFO metadata ו־oversize. ה־oversize case קשור ל־receipt פיזי גדול מ־40 MiB.

## 6. Report-path ו־immutability QA

6.1 כתיבת report מותרת רק לתוך ספריית detached reports המדויקת, עם parent קיים, target חדש, `O_EXCL`/create-new ו־`O_NOFOLLOW` כאשר זמין.

6.2 שני Readers דחו ב־exit 1: path בתוך package, path מחוץ לספריית detached reports, parent שאינו קיים, target קיים ו־broken symlink. אף target אסור לא נוצר.

6.3 broken symlink נדחה ב־preflight באמצעות `lstat`/`symlink?`, לפני קריאת package ולפני write.

6.4 inventory של 17 החברים הנורמטיביים נמדד לפני ואחרי שתי ריצות ה־Readers, כולל bytes, mode ו־mtime. שני roots זהים: `995768785d6033c329c78959668c62420b8c27da0a6cd5c5260f07ef82e3c44d`; `changed=[]`.

6.5 detached Reader A report: SHA-256=`c1ad2f2fbbac83fde776c0de3c1eaa02f18068a7c9ea946f7f814e7151df7ac6`; bytes=9,269; lines=1; mode=0600.

6.6 detached Reader B report: SHA-256=`d23750dd2465ba09d60d8d84a6a1e0bf1d2f51e4366ecd00a8ab639ad074e959`; bytes=9,269; lines=1; mode=0600.

## 7. Artifact growth

7.1 normative package projection=16,068,933 bytes.

7.2 out-of-band reserve=262,144 bytes; total projected addition=16,331,077 bytes.

7.3 largest member=13,053,654 bytes, מתחת לגבול 52,428,800 bytes.

7.4 קיימים 118,453,311 bytes של מקורות durable/reconstructible שנעשה בהם reuse ללא העתקה.

7.5 global repository budget הוא `UNKNOWN`; לכן `largeArtifactAdmission=DENIED-BUDGET-UNKNOWN`. גודל תקין של member יחיד אינו עוקף את deny הגלובלי.

## 8. חסמים שנשארו בכוונה

8.1 לא נוצרו key, credential, signature או trust root, ולא נבחר אלגוריתם חתימה.

8.2 חסרים appointments חתומים, שלוש ביקורות עצמאיות, reconciliation, אישור Tal, semantic receipt חיצוני, שני scanner receipts חתומים, trusted time/revocation/finality, authenticated remote PUBLIC receipt ו־production CAS adapter receipt.

8.3 ה־QA אינו טוען שהחוזים החיצוניים או adapter הייצור קיימים. רק ביקורת עוינת עצמאית מאוחרת יכולה להעניק closure disposition; גם אז Authority דורשת את כל הראיות החיצוניות ואת CAS durable receipt.
