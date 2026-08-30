# 1. Connect — Discovery Cutoff preflight observation

## 1.1 זהות ומגבלת טענה

1.1.1 `artifactId=CONNECT-DISCOVERY-CUTOFF-PREFLIGHT-OBSERVATION-2026-08-30`.

1.1.2 observedAt=`2026-08-30T18:16:41Z`.

1.1.3 clockAuthority=`LOCAL-CLOCK-UNTRUSTED`.

1.1.4 status=`PREFLIGHT-ONLY;NOT-DISCOVERY-CUTOFF-RECEIPT;NOT-ACCEPTED`.

1.1.5 `Owner=Tal`; ‏repository visibility=`PUBLIC`;
‏Development freeze=`ACTIVE`; ‏Gate29=`BLOCKED`.

1.1.6 המסמך אינו כולל Source bytes חיצוניים, נתיב Host מוחלט,
Secret, Credential, מידע לקוח או מזהה חשבון.

## 1.2 זהות המאגר שנצפה

1.2.1 product repository identity=`talstilkol/connect`.

1.2.2 branch=`codex/cloudflare-evidence-builders`.

1.2.3 observed HEAD=`840a46e68c2b19e32feb4b940d446350ce1f525b`.

1.2.4 remote branch readback באותו שלב תאם ל־observed HEAD.

1.2.5 default remote branch=`main`.

1.2.6 default remote branch head=`aabaee803a0c00569806195ddf51995f873b27f0`.

1.2.7 unauthenticated repository surface returned=`HTTP 200`; Claim
מוגבל להוכחת נגישות ציבורית בזמן התצפית.

## 1.3 Local frontier

1.3.1 tracked-at-HEAD count=`2,184`; raw NUL stream SHA-256=
`b5b16e54d5a53ee474caa383bbc6d57f8fc00acc26c86f29040ea439c0ba969d`.

1.3.2 index count=`2,184`; raw NUL stream SHA-256=
`0203191e8e02b9ed049b477fed19481ac082cf5ed114f0b617f6636ed19ccdf7`.

1.3.3 product worktree status count=`0`; raw SHA-256=
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

1.3.4 staged count=`0`; modified count=`0`; untracked count=`0`.

1.3.5 untracked raw SHA-256=
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

1.3.6 ignored path count=`40,630`; ignored NUL path stream SHA-256=
`d2c82cacaacd6191f4024c03d674a27bea51ae5e56ae0ab7160fa8fc76cf57fe`.

1.3.7 tracked symlink count=`0`; submodule count=`0`.

1.3.8 nested Git identities count=`2`: `workspace-container` ו־
`product-repository`. רק `product-repository` הוא Public Git authority.

1.3.9 workspace-container status count=`5`; raw status SHA-256=
`9daec4a802660b36ee188feb8453d791107e99556de6f433a571cef8d19c899d`.

1.3.10 תוכן ה־workspace-container אינו Source ציבורי אוטומטי. כל
פריט מחוץ ל־product repository מקבל `UNKNOWN` עד Classification.

## 1.4 Remote frontier

1.4.1 remote branch/tag entry count=`5`; tag count=`0`.

1.4.2 raw `ls-remote --heads --tags` SHA-256=
`ae084de1319743736141691ec949784ec0bef97f529809cdc28026150313a4ba`.

1.4.3 refs שנצפו: `main`, ‏`codex/cloudflare-evidence-builders`,
‏`codex/github-evidence-builders`, ‏`codex/pr-quality-gates` ו־
`fix/node-test-load-ts`.

1.4.4 Pull request refs, GitHub Rulesets, Security settings ו־API
pagination לא נכללו ב־`ls-remote`; מצבם ב־Cutoff מלא=
`UNKNOWN-REMOTE-COVERAGE-BLOCKING`.

1.4.5 `gh` CLI אינו מאומת כרגע. Git transport עובד, אך אינו תחליף
ל־GitHub API readback.

## 1.5 Source families

1.5.1 `SRC-USER-DIRECTIVES` class=`USER-DIRECTIVE`;
custody=`PUBLIC-PROJECTION-PARTIAL`; status=`DISCOVERED-NOT-ADMITTED`.

1.5.2 `SRC-SPEC-DETAILED-TEXT` class=`PROVIDED-SPECIFICATION`;
custody=`EXTERNAL-PRIVATE-CANDIDATE`; historical digest exists;
status=`BYTE-RECHECK-AND-RIGHTS-REVIEW-REQUIRED`.

1.5.3 `SRC-SPEC-WHATSAPP-PDF` class=`PROVIDED-SPECIFICATION`;
custody=`EXTERNAL-PRIVATE-CANDIDATE`; historical digest exists;
status=`BYTE-RECHECK-AND-RIGHTS-REVIEW-REQUIRED`.

1.5.4 `SRC-OFFICIAL-EXTERNAL` class=`OFFICIAL-EXTERNAL`;
custody=`PUBLIC-URL-PLUS-CAPTURE-REQUIRED`; status=
`DISCOVERY-INCOMPLETE`.

1.5.5 `SRC-REPOSITORY-HEAD` class=`OBSERVED-SYSTEM`;
custody=`PUBLIC-SAFE-WORKING-SET`; status=`OBSERVED`.

1.5.6 `SRC-PLANNING-DERIVATIVES` class=`DERIVED-PLANNING`;
custody=`PUBLIC-SAFE-SUBJECT-TO-SECRET-AND-RIGHTS-SCAN`; status=
`DISCOVERED-NOT-ADMITTED`.

1.5.7 ignored files class=`IMPLEMENTATION-BYPRODUCT-OR-PRIVATE`;
custody=`PROHIBITED-FROM-PUBLIC-SOURCE-SET-BY-DEFAULT`.

## 1.6 חסמים לפני Cutoff Candidate

1.6.1 `BLOCK-DC-001=TRUSTED_TIME_ABSENT`.

1.6.2 `BLOCK-DC-002=DECLARED_OUTPUT_PATH_SET_NOT_YET_FROZEN`.

1.6.3 `BLOCK-DC-003=DETERMINISTIC_BUILDER_AND_VERIFIER_ABSENT`.

1.6.4 `BLOCK-DC-004=GITHUB_API_AND_PR_REF_COVERAGE_ABSENT`.

1.6.5 `BLOCK-DC-005=PRIVATE_SOURCE_CUSTODY_AND_RIGHTS_UNAPPROVED`.

1.6.6 `BLOCK-DC-006=OFFICIAL_SOURCE_CAPTURE_FRONTIER_INCOMPLETE`.

1.6.7 `BLOCK-DC-007=B0_AND-REVIEW-PROTOCOL-NOT-ACCEPTED`.

1.6.8 `BLOCK-DC-008=INDEPENDENT-REVIEW-ABSENT`.

## 1.7 מסקנה ופעולה הבאה

1.7.1 ה־preflight מוכיח שה־product repository היה נקי ושה־local
frontier הבסיסי ניתן למדידה.

1.7.2 הוא אינו מוכיח Source Universe מלא ואינו זכאי לאישור Tal.

1.7.3 הפעולה הבאה היא להכניס Builder ו־Verifier דטרמיניסטיים ב־commit
נפרד, להקפיא מראש את נתיבי הפלט, ואז ליצור Candidate שמצביע לאחור אל
אותו commit בלי Self-membership.
