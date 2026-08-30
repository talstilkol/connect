# 1. Connect — החלטת אחסון לחבילות תכנון גדולות במאגר GitHub ציבורי

## 1.1 זהות ומעמד

1.1.1 `artifactId=CONNECT-GITHUB-PUBLIC-LARGE-GENERATED-ARTIFACT-STORAGE-DECISION-2026-08-30`.

1.1.2 class=`PLANNING-ONLY;CURRENT-OFFICIAL-SOURCE-OBSERVATION;STORAGE-DECISION-CANDIDATE;NOT-GIT-MUTATION;NOT-PUBLICATION-PERMIT`.

1.1.3 observation date=`2026-08-30`;repository visibility=`PUBLIC`;Gate29=`BLOCKED`;development freeze=`ACTIVE`.

1.1.4 לא בוצעו Git add, Commit, Push, Release, LFS upload, GitHub Actions mutation או פרסום Artifact.

1.1.5 מסמך זה אינו מוכיח שהחבילות הנוכחיות בטוחות לפרסום; כל חבילה עדיין דורשת classification, secret scan, size readback, independent review ו־Public Push Permit.

# 2. עובדות רשמיות שנצפו

## 2.1 מגבלות Regular Git

2.1.1 המקור הרשמי [About large files on GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) מציין שקובץ גדול מ־`50 MiB` גורר Warning בעת Push.

2.1.2 אותו מקור מציין שקובץ גדול מ־`100 MiB` נחסם ב־GitHub Regular Git.

2.1.3 אותו מקור ממליץ לשמור Repository קטן, רצוי מתחת ל־`1 GB`, ומציין שפחות מ־`5 GB` מומלץ בחוזקה.

2.1.4 מגבלות אלה הן גבולות פלטפורמה, לא הוכחת סודיות, ביצועים, שחזור או תחזוקתיות של Connect.

## 2.2 Git LFS

2.2.1 המקור הרשמי [Git Large File Storage billing](https://docs.github.com/en/billing/concepts/product-billing/git-lfs) מציין ש־LFS מודד Storage ו־Bandwidth וכי כל גרסה חדשה של קובץ כוללת מחדש את מלוא גודל הקובץ בחישוב Storage.

2.2.2 אותו מקור מציין שה־quota והחיוב שייכים לבעל המאגר, לרבות שימוש שמקורו ב־collaborators, forks ו־GitHub Actions downloads.

2.2.3 לכן LFS אינו ברירת מחדל אוטומטית לקורפוס JSON שניתן להפיק מחדש באופן דטרמיניסטי.

## 2.3 Release artifacts ו־attestations

2.3.1 GitHub מציע Releases להפצת קבצים גדולים במקום מעקב שלהם בתוך Regular Git; בחירה זו אינה פותרת לבדה lifecycle, retention, privacy או recoverability.

2.3.2 המקור הרשמי [Using artifact attestations to establish provenance for builds](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) מתאר attestations המקשרות Artifact ל־Build provenance ומציין שהיכולת זמינה למאגר Public בתוכניות Free, Pro ו־Team שנצפו.

2.3.3 Attestation מוכיחה provenance לפי החוזה שלה; היא אינה מוכיחה semantic correctness, Public safety או Acceptance של תוכן החבילה.

# 3. ההחלטה

## 3.1 Regular Git envelope

3.1.1 שום Package member ב־Regular Git לא יהיה בגודל `>=50 MiB`.

3.1.2 הגבול הפנימי הקשיח נמוך מגבול החסימה של GitHub כדי למנוע Warning, תלות בחריגת פלטפורמה וקרבה מסוכנת ל־`100 MiB`.

3.1.3 Browser upload אינו מסלול פרסום קביל לחבילות התכנון; Package publication עתידי יעבור workflow מבוקר בלבד.

3.1.4 Repository total-size budget, growth budget ו־clone-time budget=`unknown/unavailable` עד Measurement קפוא, accepted Owner ו־accepted budget policy.

## 3.2 Deterministic sharding

3.2.1 חבילת JSON או corpus שחבר יחיד שלה היה מגיע ל־`50 MiB` או יותר מפוצלת ל־shards דטרמיניסטיים לפני Freeze.

3.2.2 Shard boundary נגזר מסדר Canonical קפוא ומ־size predicate מדויק; אין שימוש ב־`Math.random()` או ב־`crypto.randomUUID()`.

3.2.3 כל Shard מקבל ordinal רציף, member count, first/last canonical key, byte count, SHA-256 ו־content root.

3.2.4 Package manifest קושר רשימה סדורה ומלאה של כל ה־shards ואת denominator הכולל.

3.2.5 שני Readers עצמאיים מוכיחים `size<50 MiB`, רציפות ordinal, zero overlap, zero omission, zero duplicate member, denominator parity ו־reconstructed corpus root parity.

3.2.6 שינוי Shard אחד, שינוי סדר, החלפה, הסרה, הוספה או duplicate חייבים לשנות את Package root ולהיכשל בווקטור שלילי ייעודי.

## 3.3 Generator-first rule

3.3.1 כאשר corpus נגזר כולו מ־inputs קטנים וקפואים, המקור הנורמטיבי הוא `generator source + exact input roots + canonical algorithm/version + expected output roots`.

3.3.2 פלט גדול הניתן להפקה מחדש אינו מקבל אוטומטית מעמד Source; מעמדו `DERIVED-EVIDENCE` והוא דורש parity מול שתי הפקות עצמאיות.

3.3.3 אם חבילת shards עדיין מסכנת את budget הכולל, הפלט אינו נוסף ל־Regular Git. הוא נשאר `PUBLICATION-STORAGE-UNRESOLVED-BLOCKING` עד חוזה חיצוני מאושר.

## 3.4 External artifact contract

3.4.1 Release, LFS או Artifact store חיצוני אינם מותרים עד בחירה מפורשת לפי cost, retention, deletion, availability, public access, provenance, immutable identity, disaster recovery ו־owner.

3.4.2 Public artifact מכיל `PUBLIC-SAFE` data בלבד; Secret, PII, customer data, credential, private locator או private operational evidence אסורים גם כאשר הקובץ מוצפן או content-addressed.

3.4.3 Manifest ציבורי רשאי להפנות ל־artifact חיצוני רק באמצעות URL/identity שאושרו, digest, media type, byte count, provenance receipt, expiry/lifecycle ו־recovery rule.

3.4.4 חסר, expired, inaccessible, deleted, digest-mismatched או unattested Artifact אינו מקבל QA, Review או Acceptance credit.

# 4. בדיקות שליליות מחייבות

## 4.1 Size ו־coverage

4.1.1 דחה Shard בגודל `50 MiB` בדיוק או יותר.

4.1.2 דחה missing ordinal, duplicate ordinal, out-of-order shard, overlapping member range ו־gap בין ranges.

4.1.3 דחה manifest total שאינו שווה לסכום byte/member counts שנגזר בפועל.

4.1.4 דחה חבילה שבה שני Readers משחזרים roots או denominators שונים.

## 4.2 Public safety ו־lifecycle

4.2.1 דחה Shard או Manifest המכילים absolute workstation path, username, Secret, PII, customer content או private provider identifier.

4.2.2 דחה external artifact ללא approved classification, immutable digest, lifecycle owner או recovery route.

4.2.3 דחה Attestation שה־subject digest, repository identity, workflow identity או commit identity שלה אינם תואמים לחבילה הנבדקת.

4.2.4 דחה מצב שבו generator חדש מפיק root שונה בלי typed supersession ו־independent review.

# 5. השלכות על סדר הבנייה

## 5.1 חבילות פעילות

5.1.1 B0 v6 חייב למדוד את הקורפוס בפועל ולפצל אותו דטרמיניסטית אם חבר יחיד מגיע ל־`50 MiB` או יותר.

5.1.2 Public/Cyber successor review חייב לבדוק member-size, repository-growth, external-artifact lifecycle ו־supply-chain provenance.

5.1.3 Source Universe successor חייב לסווג בנפרד generator, frozen inputs, derived shards, reports ו־external receipts; אין Alias ביניהם.

5.1.4 TRD-2 ו־Master Control Sequence חייבים ליצור Tasks נפרדים ל־size gate, package sharding, provenance, storage lifecycle, cost budget ו־negative tests.

## 5.2 מצב נוכחי

5.2.1 decision candidate materialized=`1`.

5.2.2 independently reviewed=`0`;accepted=`0`;implemented=`0`.

5.2.3 exact repository total size after future accepted artifacts=`unknown/unavailable`.

5.2.4 Public Push Permit=`ABSENT`;Gate29=`BLOCKED`;development freeze=`ACTIVE`.
