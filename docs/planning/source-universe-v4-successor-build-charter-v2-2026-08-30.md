# 1. Connect — Source Universe v4 successor build charter v2

## 1.1 זהות ומעמד

1.1.1 `charterId=CONNECT-SOURCE-UNIVERSE-V4-SUCCESSOR-BUILD-CHARTER-V2-2026-08-30`.

1.1.2 predecessor charter=`docs/planning/source-universe-v4-successor-build-charter-2026-08-29.md`.

1.1.3 predecessor charter SHA-256=`5d94d24b0c0c2310d22d354e40dd8a8dfa0317c6d5ff25bd777bc8c82b169d62`.

1.1.4 v3 Subject SHA-256=`6cb64b3877f194302a25fd25f5fa73c76a4d06d208f0e62a124e5591e5247092`.

1.1.5 v3 independent Review SHA-256=`8c4bce0652c5a126f88449135370f2a4b1ef35dd582f1c518083a0911e08a7c9`.

1.1.6 v3 Findings Manifest SHA-256=`e94273e22a07f498b40de34e2a5dc406b94b28bbef5e5ca9e2735b7302a14b1b`.

1.1.7 מסמך זה מחליף את הוראות הבנייה של Charter v1; הוא אינו Source Universe, אינו Acceptance ואינו הרשאת פיתוח או פרסום.

1.1.8 repository visibility=`PUBLIC`; מעבר ל־Private אינו תיקון, Rollback או Incident response.

1.1.9 development freeze=`ACTIVE`;Gate29=`BLOCKED`.

## 1.2 סיבת התיקון

1.2.1 Charter v1 נוצר לפני ראיות וביקורות חדשות מ־30.08.2026 ולכן רשימת Seed ידנית שלו אינה מספיקה.

1.2.2 Source Universe שמתחיל מרשימה ידנית עלול להשמיט Branch, קובץ לא־Tracked, מסמך החלטה, ביקורת או מקור חיצוני; כל השמטה כזו עוברת בהמשך ל־Requirements ול־Tasks.

1.2.3 v2 מחייב Discovery נגזר מן המצב הקפוא בפועל ורשימת החרגות סגורה, במקום הנחה שהקבצים הידועים מראש הם היקום המלא.

1.2.4 v2 מתקן את מרחב הנתיבים: שורש לוגי יחיד הוא שורש המאגר הציבורי; locator ציבורי מתחיל בנתיב Repo-relative כגון `docs/...`, ולעולם לא ב־`web/`, נתיב Host מוחלט או `file:` URI.

# 2. גבולות Authority ופרטיות

## 2.1 ארבע שכבות מקור נפרדות

2.1.1 `SourceClass1=USER-DIRECTIVE`; מקור בעל סמכות לכוונת מוצר, Scope ואישור, אך לא להוכחת חוק, ספק או Runtime.

2.1.2 `SourceClass2=PROVIDED-SPECIFICATION`; תוכן שסופק בידי Tal, אך Authenticity, Copyright, Privacy ו־completeness שלו נבדקים בנפרד.

2.1.3 `SourceClass3=OFFICIAL-EXTERNAL`; מסמך רשמי, Standard או Provider source שנלכד עם bytes, URL, זמן, Authority ו־freshness.

2.1.4 `SourceClass4=OBSERVED-SYSTEM`; Git, filesystem, GitHub, provider או Runtime readback מוגבל לזמן, לחשבון ול־Environment שנצפו.

2.1.5 `SourceClass5=DERIVED-PLANNING`; Audit, Review, Decision, Registry או Plan שנגזר ממקורות קודמים ואינו מקבל Authority גבוהה יותר מהקלט שלו.

2.1.6 אין לבצע Alias בין Directive, Specification, Official fact, Observation ו־Derived claim.

## 2.2 Public ו־Private custody

2.2.1 כל Candidate מסווג לפני כתיבה למאגר כ־`PUBLIC-SAFE`,‏ `PRIVATE-REQUIRED`,‏ `PROHIBITED` או `UNKNOWN`.

2.2.2 `UNKNOWN` פועל כמו `PROHIBITED` עבור Public egress.

2.2.3 Source bytes הכוללים Secret, Credential, PII, customer data, account identifier, private operational locator או חומר בעל זכויות לא־ברורות אינם נכתבים למאגר הציבורי.

2.2.4 Public receipt רשאי להכיל רק שדות שעברו classification, minimization ו־re-identification review; Digest לבדו אינו בהכרח בטוח לפרסום כאשר תחום הניחוש קטן.

2.2.5 אם אין Private evidence store מאושר, המקור נשאר `PRIVATE-CUSTODY-ABSENT-BLOCKING`; אסור להעתיקו ל־Git כדי לסגור את החסם.

2.2.6 מסלולי Host מוחלטים המופיעים במסמכים היסטוריים נשמרים רק בתוך bytes היסטוריים; successor registries משתמשים ב־opaque private Source ID ולא משכפלים את הנתיב.

# 3. הקפאת Discovery ללא Self-membership

## 3.1 Generation input freeze

3.1.1 לפני יצירת קובץ v4 כלשהו, ה־Builder מקפיא `DiscoveryCutoffReceipt` חיצוני עם Repository identity, observed HEAD, tracked index root, worktree root, untracked-file root, Remote-ref observation root וזמן Observation.

3.1.2 ה־Builder שומר מראש רשימה סגורה של כל נתיבי הפלט של v4; נתיבים אלה חייבים להיות absent בזמן ה־Cutoff.

3.1.3 רק קבצים שקיימים לפני ה־Cutoff יכולים להיות Source candidates של v4; פלטי v4 אינם מקורות של עצמם.

3.1.4 כל קובץ חדש או שינוי byte לאחר Cutoff מבטל את Generation ומחייב v5 או restart מלא לפני Freeze.

3.1.5 `DiscoveryCutoffReceipt` אינו יכול להיות חבר ב־root שהוא מתאר; הוא נעטף ב־detached input envelope שנוצר לפני Candidate root.

## 3.2 Local repository discovery

3.2.1 יש לגלות בנפרד `tracked-at-HEAD`,‏ `tracked-modified`,‏ `staged`,‏ `untracked`,‏ `ignored`,‏ `submodule`,‏ `symlink` ו־`nested-repository` states.

3.2.2 אין להשתמש ב־`git ls-files` בלבד; הוא אינו מכסה untracked, ignored, nested repository או external provided sources.

3.2.3 כל שינוי משתמש נשמר; Discovery הוא Read-only ואינו מבצע add, clean, checkout, reset, stash, commit או path rewrite.

3.2.4 outer empty Git directory וה־Product repository המקונן הם שתי זהויות נפרדות; רק ה־Product repository הוא Public Git authority, וה־outer workspace הוא Discovery container בלבד.

3.2.5 קובץ unreadable, traversal, symlink escape, device file, socket או permission error מקבל terminal מפורש ואינו נספר כנסרק בהצלחה.

## 3.3 Remote repository discovery

3.3.1 Remote discovery מקפיא כל Branch head, Tag, Pull Request ref ו־default Branch שנראה ב־read-only ref observation.

3.3.2 לכל Ref נדרש reachable-commit set; Merge commit נסרק גם כהפרש Merge-aware ולא רק כהיסטוריית parent יחיד.

3.3.3 inaccessible Fork, deleted ref, unreachable object, GitHub-only surface או API pagination gap מקבלים מצב `UNKNOWN-REMOTE-COVERAGE-BLOCKING`.

3.3.4 Remote content שאינו קיים מקומית אינו מושמט; הוא נלכד ב־isolated read-only mirror או נשאר חסם מפורש.

3.3.5 Remote observation אינו משנה local refs, HEAD, index או worktree.

# 4. Seed מינימלי מחייב ל־Generation v4

## 4.1 Seed families

4.1.1 ה־Builder חייב לגלות את כל ה־Cutoff universe; הרשימה להלן היא Minimum ולא Allowlist סופי.

4.1.2 User directives ו־precedence חייבים לכלול את ה־directive ledger, Decision intake, research approval, PUBLIC visibility clarification, development-freeze directive וכל תיקון מאוחר יותר שקיים ב־durable bytes.

4.1.3 Specifications חייבים לכלול את מסמך הטקסט הראשוני ואת ארבעת עמודי ה־PDF שסופקו, או typed private-custody blockers אם bytes אינם זמינים בגבול המאושר.

4.1.4 Decision family חייבת לכלול D01–D31 וכל Amendment, לרבות D02-A5, D03-A5, D05/D14-A5, D18-A2 ו־D29/D30-A4.

4.1.5 Review family חייבת לכלול את שלוש ביקורות ה־Master המקוריות, כל Findings Manifest, כל Successor review עד Cutoff וכל Closure/Producer QA עם class נפרד.

4.1.6 Repository family חייבת לכלול GitHub live readback, license strategy, Legacy quarantine ו־Secret scans לפי סדר supersession.

4.1.7 Official-source family חייבת לכלול Cyber, AI, supply-chain, WhatsApp, OpenAI, Billing, Storage, Malware scanning, Encryption, Identity, Hosting, Database, Queue, Monitoring, Legal ו־Privacy sources שנלכדו עד Cutoff.

4.1.8 Implementation-observation family כוללת את הקוד, tests, migrations, configs, docs ו־scripts הקיימים בפועל, אך אינה הופכת אותם אוטומטית לדרישות נורמטיביות.

## 4.2 Roots שחייבים להופיע כ־Candidate inputs

4.2.1 `d03-stripe-paddle-billing-reconciliation-and-adapter-contract-2026-08-30.md` root=`37ac4b5141b0ded0c0045ec26d79e4f71c73f768c60dc22a66b7aa8161289358`.

4.2.2 `d05-d14-a5-sse-kms-encryption-reconciliation-2026-08-30.md` root=`646a5a4f617bc4def246e252a9a9b2c3189566ad35d8d56c3469dc0c31220b34`.

4.2.3 `github-public-hardening-live-readback-observation-v3-2026-08-30.md` root=`0dea5b462e4bff0d1866a585a585f7e0d0405609ad21ade4e8ecac1210e521cb`.

4.2.4 `legacy-analysis-publication-quarantine-observation-v2-2026-08-30.md` root=`00d8c970eb6f8a747d6353f309bc0c0109df6dd454582447325f123cf512df7c`.

4.2.5 `public-repository-secret-scan-observation-v2-2026-08-30.md` root=`3e8bb89858b660e8fe923643301c7225cafd622acdca6842a913a1f6d9bb9983`; v1 הוא Historical observation בלבד.

4.2.6 `whatsapp-rate-limits-and-policy-source-refresh-observation-v5-2026-08-30.md` root=`1acbfc6f015fe26e14e2195abce9e8ad4bc651e6c44c2694f4f931959e0a828d`.

4.2.7 `three-review-protocol-v1-6-successor-requirements-independent-hostile-review-2026-08-30.md` root=`1d20ee7d8fd3dcfaf4a9d82369c38c658f895835c5a0d1b5422f7d0ef8dc55f3`.

4.2.8 `three-review-protocol-v1-6-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md` root=`acdc17a0ee6b77a0cfa9dda0c00dbd5999e6518488c35667857f25d21517abbb`.

4.2.9 `bootstrap-authority-envelope-b0-successor-requirements-v5-independent-hostile-review-2026-08-30.md` root=`91f2b2b44115ad73908092694c9a4800b464775ac523d08a7800bee884b8edc6`.

4.2.10 `bootstrap-authority-envelope-b0-successor-requirements-v5-independent-hostile-review-findings-manifest-2026-08-30.md` root=`a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031`.

4.2.11 `public-repository-and-cyber-hardening-successor-requirements-v2-independent-hostile-review-2026-08-30.md` root=`491217c85358d6e96744987000aceeb64fdfad3221a65e9a3d38a564942e475a`.

4.2.12 `public-repository-and-cyber-hardening-successor-requirements-v2-independent-hostile-review-findings-manifest-2026-08-30.md` root=`f049b4b681d1c03bed1b4856a61a064383faa3b3bab58a2baca85bf546f81c16`.

4.2.13 `master-plan-successor-control-sequence-v2-independent-hostile-review-2026-08-30.md` root=`06283b49e49207173d6e55b3130098d824c0d6fc5181d666ea75a5afb2453392`.

4.2.14 `master-control-sequence-v3-successor-build-charter-v2-2026-08-30.md` root=`ab541e8cc5cc0b0e2f2989ba4c90334659d8d0ca624ae669912a605f66a586cb`.

4.2.15 `section-35-6-trd-2-v6-successor-build-charter-2026-08-30.md` root=`2f23e658a33cded6e1398e284fa3e5a612fbe007357708ff09f60cb06e0fd17f`.

4.2.16 כל successor או review שנוצר לאחר חתימת Charter זה ולפני Cutoff מתגלה מכנית; הוא אינו מושמט מפני שאינו מודפס ברשימה.

4.2.17 אם Root מודפס אינו תואם bytes ב־Cutoff, התוצאה היא `SEED-ROOT-MISMATCH-BLOCKING`, לא עדכון שקט של Root.

# 5. סדר בנייה מחייב

## 5.1 שלבים 1–6

5.1.1 שלב 1 מקפיא B0, Review Protocol, Public policy, canonical serialization, path grammar, state axes, terminal registry ו־authority matrix כ־external accepted dependencies או כחסמים.

5.1.2 שלב 2 מפיק DiscoveryCutoffReceipt, complete frontier, inaccessible set ו־CandidateSet ללא Self-membership.

5.1.3 שלב 3 מפיק SourceOccurrenceLedger עבור כל occurrence מילולי, ו־TargetSpanLedger עם exact bytes, boundaries, digest ו־inverse edges.

5.1.4 שלב 4 מסווג כל Object פעם אחת כ־external input, normative output, observation או Evidence ומקצה sole producer יחיד.

5.1.5 שלב 5 מפיק typed semantic uses graph ומוכיח זהות מלאה ל־explicit dependency graph באמצעות שני Extractors עצמאיים.

5.1.6 שלב 6 מגדיר custody, authenticity, authority, freshness, sufficiency, recursive safety, locator ו־axis profiles לפני Selection או Admission.

## 5.2 שלבים 7–12

5.2.1 שלב 7 מחייב review עצמאי לכל Admission ומפריד Selector, Reviewer, Custody owner ו־Authority owner.

5.2.2 שלב 8 מקפיא Public handling policy לפני projection, derivative, log, evidence או external write.

5.2.3 שלב 9 מטפל ב־Decision, Provider ו־dynamic source events עם producer, scope, trusted-time, partition ו־safe-state מפורשים.

5.2.4 שלב 10 מפריד Archive, Restore, Retention, Legal Hold, Erasure, Tombstone, Key custody ו־current pointer ומונע resurrection.

5.2.5 שלב 11 מפיק AuthoritativeFieldRegistry מלא, trigger union שווה בדיוק, inverse dependency graph ו־fenced successor publication.

5.2.6 שלב 12 מפיק clause-lossless preservation graph לכל Requirement ו־Finding קודמים; `FULL` בלבד מקבל preservation credit.

## 5.3 שלבים 13–16

5.3.1 שלב 13 מפיק conformance envelope לכל Requirement ו־negative mutation envelope לכל 26 דרישות v2, ‏20 Findings של ביקורת v2, ‏32 Findings דור ראשון ו־24 Findings v3, ללא Range או shared-presence credit.

5.3.2 שלב 14 מקפיא שתי Generations נשלטות עם exact preimage, Delta, postimage, affected set, unaffected set, roots ו־stale receipt terminal.

5.3.3 שלב 15 מפעיל שני stdlib Readers עצמאיים ומחייב byte-identical ledgers עבור schema, graph, roots, locators, vectors ו־generation proof.

5.3.4 שלב 16 מקפיא Package Candidate, מפיק Producer QA נפרד, ואז שולח לשלוש ביקורות עצמאיות לפי Protocol accepted בלבד.

# 6. דרישות v3 Findings שאסור לאחד

## 6.1 מכנה ושימור

6.1.1 identities=`SURS3-HR-F001..F024`.

6.1.2 severity preservation=`12 P0+12 P1+0 P2+0 P3` עד Reconciliation עצמאי.

6.1.3 accepted closure before fresh v4 reviews=`0/24`.

6.1.4 כל Finding מקבל שורת Closure נפרדת עם exact predecessor root/span, successor root/span, test ID, evidence root, reviewer disposition ו־status.

6.1.5 תיקון משותף רשאי להיות Dependency משותפת; הוא אינו מאחד Findings ואינו מעניק Closure קבוצתי.

## 6.2 קבוצות תיקון מחייבות

6.2.1 literal occurrence ו־byte locator=`F001,F002`.

6.2.2 object classification, sole producers ו־semantic DAG=`F003,F005,F006,F023`.

6.2.3 Public policy, egress completeness, detector thresholds ו־opaque projection lifecycle=`F004,F014,F015,F016`.

6.2.4 custody, Admission review, provider/dynamic authority=`F005,F012,F017,F018,F019,F022`.

6.2.5 Archive, Retention, Hold, Erasure ו־invalidation=`F006,F020,F021,F023`.

6.2.6 executable tests, terminal registry, mutation coverage ו־two-generation proof=`F007,F008,F009,F010,F013`.

6.2.7 clause-lossless preservation=`F011,F012,F013,F014`.

6.2.8 accepted Review lifecycle, independence ו־atomic publication=`F024`.

# 7. Package outputs

## 7.1 חברים מחייבים

7.1.1 immutable v4 Subject.

7.1.2 Discovery input manifest ו־Cutoff detached envelope.

7.1.3 Candidate Source inventory עם Public projection נפרד מ־Private custody manifest.

7.1.4 SourceOccurrenceLedger ו־TargetSpanLedger.

7.1.5 object-class/sole-producer registry ו־typed explicit/semantic graph pair.

7.1.6 Authority, Admission, state-axis, terminal ו־authoritative-field registries.

7.1.7 Public-handling, egress, detector ו־private-evidence reference contracts.

7.1.8 Archive/Restore/Retention/Hold/Erasure/Tombstone/Key lifecycle contracts.

7.1.9 clause-preservation ו־Finding-closure crosswalks.

7.1.10 conformance, mutation ו־controlled-generation vector corpus.

7.1.11 שני Readers בלתי־תלויים ושני Reports.

7.1.12 atomic package manifest, canonical content root ו־Producer QA detached.

## 7.2 כללי Package root

7.2.1 canonical serialization, ordering, newline, encoding, path namespace ו־domain-separation string מוגדרים לפני Hashing.

7.2.2 Package manifest אינו חבר ב־content root של עצמו; הוא עוטף רשימת Member roots קפואה בפרוטוקול חיצוני מוגדר.

7.2.3 שינוי byte, path, order, dependency, oracle, source, policy או Finding status יוצר Generation חדשה.

7.2.4 `Math.random()`, arbitrary counters, process-local identity ו־unapproved cryptographic randomness אסורים בכל ID path.

# 8. Acceptance ובקרות כשל

## 8.1 תנאי PASS למועמד מכני

8.1.1 כל Package member קיים, hash תואם וניתן לקריאה משורש המאגר הציבורי.

8.1.2 כל literal source occurrence מופיע פעם אחת; כל Target span משוחזר זהה בשני Readers.

8.1.3 explicit graph שווה ל־semantic graph; unknown, self, duplicate, forward-hidden ו־cycle counts הם אפס.

8.1.4 כל 24 Findings וכל obligations הקודמים מופיעים one-to-one; closed semantic Findings לפני Review עצמאי=`0`.

8.1.5 כל vector ניתן להרצה ללא שיפוט פרוזה ומסתיים ב־terminal יחיד צפוי.

8.1.6 כל missing, stale, conflicting, inaccessible, unclassified או private-without-custody input נכשל סגור.

## 8.2 תנאי Acceptance סופי

8.2.1 B0 ו־Review Protocol חייבים להיות accepted ונקראים מחדש באותה פעולת Acceptance.

8.2.2 שלוש ביקורות עצמאיות, Reconciliation מלא, zero open planning blockers ו־exact-root Tal approval נדרשים.

8.2.3 Public-safe publication נבדקת בנפרד מאיכות Source Universe; Candidate תקין אינו Public Push Permit.

8.2.4 operational/provider/legal facts שלא נבדקו חיים נשארים `unknown/unavailable` ואינם מקבלים readiness credit.

8.2.5 current state=`v4 Subject absent;package 0/12 minimum members;independent reviews 0/3;accepted 0/1;Gate29 BLOCKED;freeze ACTIVE;repository PUBLIC`.
