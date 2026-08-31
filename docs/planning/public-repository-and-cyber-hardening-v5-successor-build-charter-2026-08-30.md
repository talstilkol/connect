# 1. Connect — Public Repository and Cyber Hardening v5 successor build charter

## 1.1 זהות, מטרה ומעמד

1.1.1 `charterId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-V5-SUCCESSOR-BUILD-CHARTER-2026-08-30`.

1.1.2 `artifactClass=PLANNING-ONLY;BUILDER-INSTRUCTION;NOT-V5-SUBJECT;NOT-REVIEW;NOT-ACCEPTANCE;NOT-PERMIT`.

1.1.3 המטרה היא לבנות Candidate קפוא וחדש ל־v5 שסוגר תכנונית, one-to-one וללא merge, את `PRCV4-IHR-F001..F023`, ושומר בנפרד את כל `93` זהויות ה־Finding שקדמו להם.

1.1.4 denominator הפעיל ל־v5 הוא בדיוק `116=93+23`; אין range credit, alias credit, implicit closure, waiver או suppression.

1.1.5 המאגר חייב להישאר `PUBLIC`. מעבר ל־Private אינו תיקון, Rollback או דרך להסתיר Evidence.

1.1.6 `Acceptance=0`; כל ארבעת ה־Permits `ABSENT`; `Gate29=BLOCKED`; development freeze=`ACTIVE`.

1.1.7 אסורים Product code, Build, Runtime tests, Git/GitHub mutation, Push, Credentials, Provider mutation, Deployment ו־Release.

## 1.2 קלטים קפואים מחייבים

1.2.1 v4 Subject=`docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-2026-08-30.md`; SHA-256=`0f1f5cc9fb349f999b0bbff3f6f683c47c951b793ce3ef847388530717ff7257`.

1.2.2 v4 manifest=`docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-atomic-package-manifest-2026-08-30.json`; SHA-256=`43bd110cd8b59c0a3ea6086203d804df7b0dc6dd3441ec443d7ec740c4e65ed5`; package root=`f799c154c695034935c480a57b6a0047d8e2b67d318e42b0d9b88a0ea78f92cf`.

1.2.3 v4 independent Review=`docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-independent-hostile-review-2026-08-30.md`; SHA-256=`f656b182f617c67ec7d56c37b45a467c70e681863a48487be2d42408cb36b79f`.

1.2.4 v4 Findings Manifest=`docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-independent-hostile-review-findings-manifest-2026-08-30.md`; SHA-256=`23df19ec6dffb1933489eabf49a78c4ef3c88657d840408284267a8f18c0a760`.

1.2.5 mandatory late decision=`docs/planning/github-public-repository-large-generated-artifact-storage-decision-2026-08-30.md`; SHA-256=`508b702087bc2c4011975af87c30bea1208bf5720ec263409d287acb5eb15a84`.

1.2.6 current point-in-time visibility observation=`talstilkol/connect;visibility=PUBLIC;isPrivate=false;observed 2026-08-30`; זהו Observation בלבד ולא continuous receipt.

1.2.7 כל קלט נוסף חייב להיכנס ל־Input Manifest סגור עם path repo-relative, raw SHA-256, bytes, role, acquisition rule ו־admission disposition. קלט שלא הוצהר חוסם Freeze.

# 2. כללי בנייה שאינם ניתנים לעקיפה

## 2.1 Immutable successor

2.1.1 אין לשנות byte כלשהו ב־v4, ב־Review, ב־Findings Manifest, ב־late decision או בראיות קודמות.

2.1.2 כל תיקון נכתב כחבר v5 חדש וכ־Closure row חדש; אין לערוך היסטוריה כדי לגרום ל־v4 להיראות תקין.

2.1.3 כל אחד מ־116 ה־Findings מקבל identity, source root, noMergeKey, Requirement, output, vector set, closure predicate ו־residual state נפרדים.

## 2.2 Determinism וזהויות

2.2.1 `Math.random()` אסור.

2.2.2 `crypto.randomUUID()` אסור משום שאין אישור מדויק לשימוש מסוים.

2.2.3 IDs נגזרים מתג סוג, version ותוכן קנוני אמיתי שאינו כולל את שדה ה־ID עצמו.

2.2.4 לכל root מוגדרים algorithm, domain, normalization, serialization, ordering, separator, included fields ו־excluded fields.

2.2.5 Raw file checksum ו־typed identity root הם טיפוסים שונים; אסור להחליף ביניהם.

## 2.3 Public-safe evidence

2.3.1 בחברים ציבוריים מותרים רק paths יחסיים לשורש המאגר או content-addressed IDs.

2.3.2 Secrets, PII, customer data, credentials, local home paths, private coordinates ו־low-entropy equality oracles אסורים.

2.3.3 ראיה פרטית נשארת מחוץ ל־Public Git ומיוצגת רק ב־public-safe receipt מאושר שאינו מאפשר ניחוש ואימות של המידע הפרטי.

2.3.4 אין להמציא לקוחות, Credentials, scans, provider actions, Pushes, Deployments או Releases. ערך חיצוני חסר נשאר typed Missing וחוסם.

# 3. חבילת v5 האטומית

## 3.1 חברים נורמטיביים

3.1.1 `V5-SUBJECT` — Requirements והגדרות בלבד, ללא טענת מצב חי.

3.1.2 `V5-FROZEN-INPUT-MANIFEST` — universe סגור של כל קלט קפוא.

3.1.3 `V5-FINDING-IDENTITY-AND-CLOSURE-REGISTRY` — `116/116` שורות non-merged.

3.1.4 `V5-CLOSED-SCHEMA-AND-TYPE-REGISTRY` — כל record וכל nested type פעם אחת בלבד.

3.1.5 `V5-CANONICAL-DIGEST-AND-SERIALIZATION-REGISTRY` — הפרדת checksum/identity ו־domain לכל מחלקה.

3.1.6 `V5-PRODUCER-AUTHORITY-AND-SEPARATION-GRAPH` — Genesis, Appointments, Owners, Work roots, Ledgers, Revocation ו־Recovery.

3.1.7 `V5-LIFECYCLE-CAS-AND-RECOVERY-REGISTRY` — issue, consume, revoke, expire, fail, readback ו־forward recovery.

3.1.8 `V5-FOUR-PERMIT-REGISTRY` — Control Plane, Public Push, Deployment ו־Release כטיפוסים וצרכנים נפרדים.

3.1.9 `V5-PUBLIC-INFORMATION-FLOW-AND-SCANNER-REGISTRY` — sources, transforms, sinks, stores, scanners, adjudication ו־disclosure policy.

3.1.10 `V5-PUBLICATION-SIZE-SHARD-AND-STORAGE-REGISTRY` — member size, growth, clone budget, deterministic shards ו־external lifecycle.

3.1.11 `V5-EXECUTABLE-CAUSAL-VECTOR-CORPUS` — positive controls ו־single-fault negative mutations לכל atomic closure predicate.

3.1.12 `V5-CAUSAL-GRAPH` — כל producer, input, schema, Requirement, vector, result, receipt, Review, Acceptance ו־Permit edge.

3.1.13 `V5-ATOMIC-PACKAGE-MANIFEST` — ordered member list, role, bytes, raw SHA-256 ו־cycle-free package root.

## 3.2 כלים ותוצאות מנותקות

3.2.1 Generator source נשמר כחבר root-bound עם exact dependency/runtime identity, אך תוצאתו אינה Acceptance.

3.2.2 Reader A ו־Reader B נבנים באופן עצמאי, עם parser/evaluator שונים, root-bound bytes ו־independence profiles.

3.2.3 Reader reports, Producer QA ו־Review receipts נשמרים מחוץ ל־Subject ומקושרים רק ב־higher-level envelope ללא מעגל עצמי.

3.2.4 Readers הם read-only; הם אינם כותבים לתוך החבילה הקפואה.

# 4. מפת תיקון one-to-one ל־23 Findings החדשים

## 4.1 `PRCV4-IHR-F001` — סתירת graph denominators

4.1.1 להפיק arrays, counters, invariants ו־manifest מאותה קבוצת nodes/edges נגזרת אחת.

4.1.2 שני Readers מחשבים מחדש את הקבוצות ואינם סומכים על counters מוצהרים.

4.1.3 שינוי בכל אחד מערכי edge/node/class count חוסם לפני PASS.

## 4.2 `PRCV4-IHR-F002` — blind spot משותף לשני Readers

4.2.1 להקפיא specification נפרד לכל Reader ולתעד implementation, dependencies, runtime, author/controller ו־input cut.

4.2.2 לבנות corpus שמחליף כל counter, nested schema, source row, vector, Permit field ו־late-input edge בנפרד.

4.2.3 disagreement מוביל ל־`BLOCKED-PENDING-INDEPENDENT-ADJUDICATION`; הוא אינו נהפך לרוב אוטומטי.

## 4.3 `PRCV4-IHR-F003` — nested types ו־evaluators חסרים

4.3.1 להגדיר את כל 42 משפחות הפלט ואת כל nested types בלי unresolved reference.

4.3.2 לכל schema להגדיר fields, types, ranges, enums, cardinality, order, uniqueness, references, unknown-field policy ו־cross-field invariants.

4.3.3 שני validators מקבלים את כל הרשומות התקינות ודוחים mutation בודד לכל field וכל invariant.

## 4.4 `PRCV4-IHR-F004` — checksum לעומת domain-separated identity

4.4.1 להגדיר `RawSha256Checksum` עבור bytes ו־`TypedIdentityRoot` עבור אובייקט קנוני.

4.4.2 כל artifact class מקבל domain ייחודי; אותו payload בשתי מחלקות מפיק identities שונים.

4.4.3 raw checksum מתקבל רק בתוך record typed ומושרש; substitution בין הטיפוסים נדחה.

## 4.5 `PRCV4-IHR-F005` — Genesis ו־authority ל־Producers הראשונים

4.5.1 לבנות Genesis preimage חיצוני שאינו תלוי בפלטי Producers `000..003`.

4.5.2 לקשור appointment, expected-empty head, owner separation, revocation ו־recovery לכל Producer.

4.5.3 self-appointment, circular authority, stale head, conflicting Genesis או shared recovery owner חוסמים.

## 4.6 `PRCV4-IHR-F006` — lifecycle/CAS/replay/revocation

4.6.1 להגדיר state machine מלא לאירועי issue, consume, revoke, expire, fail-before-write, fail-after-write ו־response-loss.

4.6.2 כל transition קושר expected head, revision, epoch, fence, trusted time, actor, attempt ו־append-only event.

4.6.3 concurrent consume מפיק winner יחיד; readback מחזיר terminal יחיד ללא effect כפול.

## 4.7 `PRCV4-IHR-F007` — Finding extraction ו־Alias equivalence

4.7.1 להגדיר grammar קנוני ל־Finding records או פורמט canonical record חדש עם byte-span provenance.

4.7.2 שני Readers מפיקים per-field roots עבור evidence, impact, remediation, closureTest ו־noMergeKey.

4.7.3 כל Alias דורש projection one-to-one מוכח; similarity בלבד אינה Alias.

## 4.8 `PRCV4-IHR-F008` — vectors שאינם executions

4.8.1 לכל vector לשמור exact pre-state, operation, mutation operand, evaluator root, actual terminal ו־effect set.

4.8.2 expected terminal נקרא רק לאחר actual execution ואינו מזין את evaluator.

4.8.3 שינוי oracle בלבד אינו משנה actual result; שינוי causal input חייב לשנות או לחסום את התוצאה הצפויה.

## 4.9 `PRCV4-IHR-F009` — כיסוי 204 mappings ותתי־predicates

4.9.1 לפרק כל closureTest ל־atomic predicates וליצור forward/inverse coverage בין 116 Findings, Requirements, predicates ו־vectors.

4.9.2 לכל mapping ולכל predicate נדרשים positive control ו־causal negative mutation בהתאם לסמנטיקה שלו.

4.9.3 מחיקת vector יוצרת חוסר כיסוי מדויק ואינה נסגרת באמצעות vector של Finding אחר.

## 4.10 `PRCV4-IHR-F010` — dual allowlist builders ו־adjudicator

4.10.1 למנות Builder A, Builder B ו־Adjudicator כ־typed producers נפרדים.

4.10.2 לאכוף disjoint implementation, work receipt, ledger, owner, appointment ו־authority ancestry על אותו frozen input cut.

4.10.3 shared root/owner/input mismatch חוסם; disagreement אינו מאושר על ידי אחד ה־Builders.

## 4.11 `PRCV4-IHR-F011` — scanner independence

4.11.1 למנות שני scanner producers ו־adjudicator נפרד עם engines/rulesets/work/owners/ledgers נפרדים.

4.11.2 שני scanners מקבלים אותו exact byte cut ודוחים alias של engine או ruleset.

4.11.3 scan חסר, stale, unequal-input או disagreement לא־מוכרע חוסם כל Public Permit.

## 4.12 `PRCV4-IHR-F012` — GitHub Control Plane Permit

4.12.1 להגדיר issue/consume/revoke/expire transaction עם issuedAt, expiresAt, expected Permit head, epoch ו־one-use ledger.

4.12.2 לקשור plan, ordered steps, security floor, per-step receipt, failure class ו־authoritative readback.

4.12.3 stale/replay/reorder/skip/shared-role או recovery שמחליש control חוסמים.

## 4.13 `PRCV4-IHR-F013` — Public Push Permit

4.13.1 לקשור exact repository, owner, ref, expected old OID, sent object set, accepted object set, quarantined set ו־visibility.

4.13.2 לבצע Permit-head CAS אטומי ולהגדיר failure receipt ו־response-loss readback.

4.13.3 surplus/missing object, wrong OID, non-PUBLIC readback, replay, expiry או revocation חוסמים.

## 4.14 `PRCV4-IHR-F014` — Deployment Permit

4.14.1 להפריד issuer, consumer ו־independent reader.

4.14.2 לקשור environment, target/current digest, expected heads, trusted TTL, one-use ledger, apply/failure/readback ו־forward recovery.

4.14.3 response loss מוכרע מקריאת target סמכותית; Deployment Permit אינו מאשר Push או Release.

## 4.15 `PRCV4-IHR-F015` — Release Permit

4.15.1 להפריד issuer, publisher ו־independent reader.

4.15.2 לקשור Commit, tag, assets/packages, digests, coordinates, expected heads, TTL, consume, failure ו־public readback.

4.15.3 recovery לאחר פרסום הוא yank/deprecate/successor; אסור להחליף artifact ציבורי mutable באותה זהות.

## 4.16 `PRCV4-IHR-F016` — הפרדת ארבעת ה־Permits

4.16.1 להגדיר ארבעה schemas, domains, issuer policies ו־consumer NamedUses שונים.

4.16.2 לבנות מטריצת `4x4`; ארבע presentations חוקיות ו־12 presentations cross-class חייבות להידחות.

4.16.3 payload זהה או root alias אינם מאפשרים consumer מסוג אחר.

## 4.17 `PRCV4-IHR-F017` — manifest ו־Reader receipts ב־Acceptance cut

4.17.1 להשאיר את package root cycle-free, ואז לבנות higher-level envelope שקושר manifest SHA ואת שני report roots.

4.17.2 ה־Acceptance cut קושר גם Subject, schemas, graph, vectors, reviews, reconciliation, expected head ו־CAS attempt.

4.17.3 manifest/report חסר, שונה או מוחלף חוסם בלי לשנות בדיעבד את package root.

## 4.18 `PRCV4-IHR-F018` — no-self-review/no-self-acceptance

4.18.1 להגדיר implementation, evidence, reviewer A, reviewer B, veto, reconciliation ו־acceptance producers בנפרד.

4.18.2 לבדוק disjoint people, keys, implementations, work receipts, ledgers, appointments ו־authority-owner ancestry לפי policy קפוא.

4.18.3 Producer QA ו־Readers אינם יכולים לכתוב Acceptance credit; reviewer זכאי יכול להטיל veto.

## 4.19 `PRCV4-IHR-F019` — public Secret-coordinate oracle

4.19.1 להסיר מכל public member digest חשוף של coordinate set בעל entropy נמוך.

4.19.2 private validation משתמשת ב־keyed commitment או מנגנון מאושר אחר מחוץ ל־Public Git; אין לייצר key או לבחור primitive בלי החלטת Security מדויקת.

4.19.3 ה־public projection רשאי לחשוף רק aggregate מאושר שאינו מאפשר candidate equality test.

## 4.20 `PRCV4-IHR-F020` — late storage decision admission

4.20.1 להכניס את exact decision bytes/root מסעיף 1.2.5 ל־Input Manifest ול־causal graph.

4.20.2 לבצע forward/inverse clause reconciliation ולתעד typed supersession לכל כלל v4 שהושפע.

4.20.3 omission או mutation של ה־late decision חוסמים בשני Readers.

## 4.21 `PRCV4-IHR-F021` — size/growth/clone gates

4.21.1 למדוד bytes אמיתיים לכל member ולהפעיל תנאי strict: `memberSize < 52,428,800`.

4.21.2 repository total, growth per transaction ו־clone-time budgets דורשים policy/owner/measurement accepted; ערך חסר או stale חוסם.

4.21.3 `52,428,799` bytes יכול לעבור רק אם כל התנאים האחרים עוברים; `52,428,800` ומעלה נדחה.

## 4.22 `PRCV4-IHR-F022` — deterministic sharding ו־generator-first

4.22.1 derived corpus נבנה מחדש מ־frozen inputs באמצעות generator/root/version קפואים, ללא randomness.

4.22.2 shard manifest כולל ordinal, first/last canonical key, count, bytes, raw checksum ו־reconstructed corpus root.

4.22.3 gap, overlap, duplicate, reorder, wrong range/count/root או generator drift חוסמים; שני generators עצמאיים חייבים להגיע לאותו corpus root.

## 4.23 `PRCV4-IHR-F023` — external artifact lifecycle

4.23.1 כל עוד לא נבחר store ונקלט contract מאושר, ExternalArtifact state נשאר `MISSING-BLOCKING`.

4.23.2 contract provider-neutral כולל classification, immutable locator/identity, digest, media type, bytes, provenance, cost, retention, deletion, expiry, availability, owner ו־disaster recovery.

4.23.3 Secret/PII/customer/private locator, mutable identity, mismatched digest, expired/deleted/inaccessible object, missing owner, exceeded budget או failed restore חוסמים.

# 5. סדר ביצוע מחייב ל־Builder

## 5.1 Freeze קלטים

5.1.1 לאמת מחדש את כל hashes וה־roots בסעיף 1.2.

5.1.2 להפיק Input Manifest סגור ולהוכיח path portability, regular-file status ו־absence של publish-prohibited material.

5.1.3 להקפיא `116/116` Finding identities לפני יצירת Requirement חדש.

## 5.2 Schemas, grammar ו־identity

5.2.1 לבנות closed schemas וכל nested type.

5.2.2 לקבע canonical parser/serializer ו־digest domains.

5.2.3 להריץ positive/negative parser, schema, type ו־digest corpus בשני Engines.

## 5.3 Authority, independence ו־lifecycle

5.3.1 לבנות Genesis ו־Appointments שאינם מעגליים.

5.3.2 לבנות producer/owner/ledger separation ל־Builders, Scanners, Reviewers ו־Acceptance.

5.3.3 לבנות CAS/lifecycle/revocation/response-loss reducers ולבדוק את כל crash cuts.

## 5.4 Permits ו־Public flows

5.4.1 לבנות ארבעה Permit protocols וטבלת cross-use מלאה.

5.4.2 לקשור Public flow, scanner receipts, exact object sets, visibility ו־readbacks.

5.4.3 לשמור כל Permit `ABSENT` במצב האמיתי עד קבלת external evidence חוקי.

## 5.5 Artifact budgets ו־storage

5.5.1 להטמיע את ה־late decision ואת כל clause deltas.

5.5.2 למדוד ולפצל deterministically כל member לפני הגעה ל־50 MiB.

5.5.3 להשאיר external storage blocked עד selected-store lifecycle accepted.

## 5.6 Vectors, graph ו־Readers

5.6.1 לגזור vector denominator מה־atomic closure predicates ולא לקבע מספר שרירותי.

5.6.2 ליצור graph forward/inverse מלא ולחשב counters מן המערכים עצמם.

5.6.3 שני Readers בונים את ה־semantic result מן ה־bytes ולא קוראים producer verdicts.

5.6.4 Reports detached ו־read-only; package bytes אינם משתנים לאחר Freeze.

# 6. תנאי Freeze וגבול הטענה

## 6.1 Candidate mechanical freeze

6.1.1 כל member קיים, regular, non-symlink, repo-relative, מתחת 50 MiB, hash/bytes/root תואמים.

6.1.2 Input set, package set, schema/type set, Finding set, vector set, graph set ו־Permit set הם exact, closed ו־unique.

6.1.3 שני Readers מסכימים על roots, denominators, actual terminals ו־zero-error counters; כל negative mutation נהרג.

6.1.4 Producer QA מדווח Candidate בלבד ואינו Review או Acceptance.

## 6.2 Independent review required

6.2.1 Reviewer שלא בנה את v5 מבצע hostile review על כל 116 הזהויות ועל 23 closure predicates החדשים.

6.2.2 כל Finding שנסגר דורש evidence locator, causal execution, independent Reader parity ו־review disposition משלו.

6.2.3 disagreement, missing evidence, stale root או unaccepted external input משאירים את ה־Finding פתוח.

## 6.3 Safe terminal

6.3.1 עד Independent Acceptance חוקי: `Acceptance=0`.

6.3.2 `GitHubControlPlanePermit=ABSENT`; `PublicPushPermit=ABSENT`; `DeploymentPermit=ABSENT`; `ReleasePermit=ABSENT`.

6.3.3 repository=`PUBLIC`; `Gate29=BLOCKED`; development freeze=`ACTIVE`.

6.3.4 charter זה אינו מעניק הרשאת Commit, Push, GitHub mutation, Deployment, Release או פיתוח.
