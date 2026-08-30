# Protocol v1.9 — Producer freeze record

## 1. Freeze identity

1.1 FreezeState=`PRODUCER-CANDIDATE-FROZEN;PENDING-INDEPENDENT-HOSTILE-REVIEW`.

1.2 PackageRoot=`1c74cc220d04948be08ce2aec1d3a17125882a5a8a7204630657011a739ac614`.

1.3 ManifestRoot=`7c495484acb39238b0906c169fe7b8cad0d728000e2f04a86dec56c66cafc133`.

1.4 SubjectRoot=`35aadffd26dc4b7b19f02078dafec746b70c0ceecffe87a5f9a94a036fd55299`.

1.5 FrozenSourceReceiptSetRoot=`1e596919f5328df65ba283ecfbf50ba21adfb751edeec0dea2497505bf304ca4`.

1.6 CommonResultRoot=`a4b5f65e3026f98448c88e063ce3996cd18364fce2aed67c719c33a884c8465f`.

1.7 ValidatorResultSetRoot=`81d92ded92ed8bee8455f8ec69ea4f08daaca3b5f2aa1746417c877bfff5b555`.

1.8 VectorResultSetRoot=`ce48d70f138386d90bbce7d1be359059d3ae03635ef0e12c2ffad44b704f28ca`.

## 2. Normative inventory

| # | Path | Bytes | Lines | SHA-256 |
|---:|---|---:|---:|---|
| 1 | artifact-growth-projection.json | 655 | 1 | c9c85427704cfd855725977c5a245485d593baf6cfda0bc48b0b2f7405bc2968 |
| 2 | behavior-contract.jsonl | 356,283 | 574 | 31679886e669853aadf3b0a713fd0665671e4b9c518a08793d56cc5a821d5281 |
| 3 | cas-recovery-contract.json | 43,880 | 1 | a7ca338ede0af130e71b02ced60e92030a9cecc7444e971b761dddd7e9f0bc4a |
| 4 | causal-traces.jsonl | 1,427,381 | 743 | 56c5207c41ce55efbf2485dfc8f143c8801baeba4bd68de437aa085e73633142 |
| 5 | closure-crosswalk.jsonl | 31,180 | 40 | 4ff53a5b55cd5139eaea7b04453b42ed3874a7b8acb43f06c039d9a1f7420632 |
| 6 | external-evidence-contracts.json | 2,629 | 1 | 8ee6b404b5fa5ca471703c1b027e101b5a75ca1827e7e9e9fb9f4bb9b339f49c |
| 7 | frozen-source-receipt.jsonl | 22,304 | 47 | 0a747365f2c50c9bdf8e02a080d2bba77aa6aaebc31ab39c86b0d2ceecba9263 |
| 8 | generate.mjs | 57,793 | 614 | 5b8241912ecf75e5d075e19e91f20ce2e49596b0b70d5369a266267c763799cc |
| 9 | governance.json | 1,885 | 1 | 79f2e4dcafe165059059337f3eec681587561deffe0ac3b12b6428a7b7858b68 |
| 10 | normative-package-manifest.json | 4,228 | 1 | 7c495484acb39238b0906c169fe7b8cad0d728000e2f04a86dec56c66cafc133 |
| 11 | reader-a.mjs | 54,220 | 637 | f9b6a881f94b729c8014585960bd2e1a5ee2a246cdc398b6264c573f30b47235 |
| 12 | reader-b.rb | 53,675 | 658 | 1a20f949be33068ffa6ddb76713d18b04c3dd0d6fe45413ac74e37d657b66fa1 |
| 13 | schemas.json | 17,818 | 1 | 8e46dea43394919b9f7f7bb7da1b0add9aa5a75e495457fd666e9019a6b08326 |
| 14 | semantic-entailment.jsonl | 13,053,654 | 4,016 | 68acf9f08d4694118a0bd4fe792c037e3a36d7a37c237934b1cc6cbeac0609e6 |
| 15 | semantic-target-registry.json | 650,629 | 1 | 3805b4a99887c709b11733649f229f48124a57ef4cf90e1d8a53b4fa26af95d4 |
| 16 | subject.md | 3,404 | 47 | 35aadffd26dc4b7b19f02078dafec746b70c0ceecffe87a5f9a94a036fd55299 |
| 17 | vectors.jsonl | 287,315 | 743 | 9149f1dcc4821465697d981df20e280e24cfda5777e3262f135af377b26d7bff |

2.1 PackageRoot נגזר רק מ־13 payload members ושלושת producer tools לפי ה־constructor הקפוא. ה־manifest הפיזי נמדד בנפרד.

2.2 `producer-qa.md` ו־`FINAL.md` הם out-of-band freeze documentation ואינם חברי PackageRoot, כדי למנוע self-reference. detached reports אינם חברי package.

## 3. Detached reports

| Reader | Status | Bytes | Lines | Mode | SHA-256 |
|---|---|---:|---:|---:|---|
| MPRR-V19-READER-A | PASS | 9,269 | 1 | 0600 | c1ad2f2fbbac83fde776c0de3c1eaa02f18068a7c9ea946f7f814e7151df7ac6 |
| MPRR-V19-READER-B | PASS | 9,269 | 1 | 0600 | d23750dd2465ba09d60d8d84a6a1e0bf1d2f51e4366ecd00a8ab639ad074e959 |

3.1 שני הדוחות זהים בכל שדה משותף. ההבדל היחיד המהותי הוא `readerId`, ולכן hashes של קובצי הדוח שונים.

3.2 כל 17 counters הם אפס בשני הדוחות.

3.3 inventory root של bytes+mode+mtime לפני ואחרי הרצת שני הקוראים: `995768785d6033c329c78959668c62420b8c27da0a6cd5c5260f07ef82e3c44d`; לא השתנה אף חבר נורמטיבי.

## 4. Exact denominators

4.1 Findings=40 exact/non-merged: v1.7=25;v1.8=15;acceptanceCredit=0 לכל שורה.

4.2 PredecessorBehaviors=574;SemanticPredicates=4,016;SemanticUses=53,450;SuccessorVectors=743;CausalTraces=743.

4.3 CAS comparisons=65;durable members=17;recovery schedules=24;production adapter executable=false.

4.4 Schemas=33; generic critical object rules=0; unknown nested fields נדחים.

## 5. Growth and source reuse

5.1 NormativePackageProjectedBytes=16,068,933;OutOfBandReserveBytes=262,144;ProjectedAddedBytes=16,331,077.

5.2 ProjectedLargestMemberBytes=13,053,654;MaxRegularGitMemberBytesExclusive=52,428,800.

5.3 ReusedContentAddressedSourceBytes=118,453,311;DuplicateSourceBytesAdded=0.

5.4 GlobalRepositoryGrowthBudgetState=UNKNOWN;LargeArtifactAdmission=DENIED-BUDGET-UNKNOWN.

## 6. Authority state and blockers

6.1 `Acceptance=0;Gate29=BLOCKED;developmentFreeze=ACTIVE;repository=PUBLIC;authorityOutputs=0`.

6.2 חסרים external signed appointments, approved algorithm/trust store, independent signed scanner receipts, authenticated remote PUBLIC visibility/ref/write-object-set receipt, trusted time/revocation/finality, three independent reviews, reconciliation, Tal approval, external semantic receipt ו־production CAS adapter receipt.

6.3 לא נוצרו key, credential או signature; לא נבחר crypto algorithm; לא נטענה מוכנות production adapter.

6.4 לא בוצעו Product, Git, GitHub, Provider או Deployment mutations במהלך בניית החבילה.

6.5 FinalDisposition=`PRODUCER-CANDIDATE-FROZEN;ACCEPTANCE-CREDIT-0;INDEPENDENT-HOSTILE-REVIEW-REQUIRED`.
