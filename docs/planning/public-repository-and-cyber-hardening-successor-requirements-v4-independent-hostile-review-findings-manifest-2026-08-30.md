# 1. Connect — Public Repository and Cyber Hardening v4 independent hostile-review Findings Manifest

## 1.1 Identity, denominator and claim limit

1.1.1 `artifactId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-V4-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30`.

1.1.2 `reviewId=PRCV4-IHR-2026-08-30`.

1.1.3 `artifactClass=DETACHED-NON-MERGED-INDEPENDENT-FINDINGS-MANIFEST;PLANNING-ONLY;NOT-AUTHORITY;NOT-IMPLEMENTATION;NOT-OPERATIONAL-EVIDENCE;NOT-ACCEPTANCE;NOT-CLOSURE`.

1.1.4 Frozen Subject=`docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-2026-08-30.md`;SHA-256=`0f1f5cc9fb349f999b0bbff3f6f683c47c951b793ce3ef847388530717ff7257`.

1.1.5 Frozen manifest envelope=`docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-atomic-package-manifest-2026-08-30.json`;SHA-256=`43bd110cd8b59c0a3ea6086203d804df7b0dc6dd3441ec443d7ec740c4e65ed5`;package root=`f799c154c695034935c480a57b6a0047d8e2b67d318e42b0d9b88a0ea78f92cf`.

1.1.6 Mandatory late input=`docs/planning/github-public-repository-large-generated-artifact-storage-decision-2026-08-30.md`;SHA-256=`508b702087bc2c4011975af87c30bea1208bf5720ec263409d287acb5eb15a84`.

1.1.7 Companion Review=`docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-independent-hostile-review-2026-08-30.md`.

1.1.8 New detached Finding denominator=`23`;severity totals=`P0 22;P1 1;P2 0;P3 0`.

1.1.9 State totals=`OPEN 23/23;CLOSED 0/23;ACCEPTED 0/23;MERGED 0;SUPPRESSED 0`.

1.1.10 The frozen inherited 93-record denominator remains separately open and unaccepted. No record below merges, replaces, suppresses or closes any inherited Finding;the immutable-v5 active denominator is `93+23=116` distinct Findings.

1.1.11 Every record has one severity, evidence, impact, remediation, closureTest and noMergeKey. Evidence or closure credit for one noMergeKey cannot close another.

1.1.12 `Acceptance=0;repositoryVisibility=PUBLIC;Gate29=BLOCKED;developmentFreeze=ACTIVE;all four Permits=ABSENT`.

## 1.2 Severity semantics

| Severity | Meaning |
|---|---|
| P0 | the v4 model can admit false package coherence, schema/evaluator validity, authority, Finding closure, Permit use or Acceptance, or omits a mandatory publication/storage gate |
| P1 | a material public-evidence/privacy assurance gap must close before any publication or Acceptance |
| P2 | important precision defect without a demonstrated bypass path |
| P3 | advisory only;none found |

# 2. Detached Findings

## 2.1 PRCV4-IHR-F001 — the graph contradicts its own exact denominators

- severity=P0;state=OPEN;closureCredit=0.
- evidence=`docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-producer-dependency-graph-2026-08-30.json` physically contains 109 nodes, 619 edges and 204 closure-requirement edges, matching the manifest and independent regeneration;the root-bound `invariants` object instead declares 631 edges and 216 closure-requirement edges.
- impact=the same immutable graph has two incompatible truths;an implementation can select the counters that produce PASS, and Producer QA's mechanically coherent claim is false.
- remediation=produce immutable v5 graph bytes from one canonical derived edge set;bind derived counters once;reject every disagreement between arrays, per-class counts, invariant counters and manifest counters.
- closureTest=two independent graph derivations reconstruct exactly the same nodes/edges/counters;changing either declared invariant to any value other than the physical derivation makes both Readers fail before emitting PASS.
- noMergeKey=PRCV4-GRAPH-INVARIANT-DENOMINATOR-CONTRADICTION

## 2.2 PRCV4-IHR-F002 — both Readers share the blind spot and emit a false mechanical PASS

- severity=P0;state=OPEN;closureCredit=0.
- evidence=fresh Node and Ruby runs each return 79/79 PASS, but neither reads `graph.invariants.edges` or `graph.invariants.closureRequirementEdges`;their semantic check lists, hard-coded counters and critical-field lists are near-isomorphic despite distinct languages and DAG algorithms.
- impact=correlated omission converts a demonstrated package contradiction into unanimous PASS;language difference and source-root difference do not prove semantic independence.
- remediation=build independently specified readers with rooted authorship/provenance, separate derivation logic, full schema/graph/source/vector/late-input checks, a mutation corpus and third-party disagreement adjudication.
- closureTest=plant one defect in every declared/derived counter, nested schema, source record, vector execution, Permit transaction and late-storage predicate;each Reader independently fails the applicable mutations, agrees on clean bytes and routes any disagreement to a non-accepting adjudicator.
- noMergeKey=PRCV4-READERS-CORRELATED-BLIND-SPOT-FALSE-PASS

## 2.3 PRCV4-IHR-F003 — 42 claimed output schemas contain 70 undefined nested types and no evaluator bodies

- severity=P0;state=OPEN;closureCredit=0.
- evidence=the registry has 357 top-level required-field labels, but 70 referenced nested types have no definition;cross-field invariants are prose strings;there is no materialized standards-conformant schema, evaluator implementation, positive corpus, malformed corpus or cross-field corpus.
- impact=cardinality, identity, enum, ordering, uniqueness, referential and transition semantics remain implementation-defined;opaque roots can be accepted under incompatible meanings.
- remediation=materialize a closed schema and independently executable evaluator for every output and nested type, with exact roots, failure terminals, positive instances and full malformed/cross-field negative corpora.
- closureTest=two independent validators resolve every type reference exactly once, accept every admitted instance and reject missing, unknown, wrong-type, cardinality, ordering, referential and cross-field mutations with byte-identical terminals;unresolved type count is zero.
- noMergeKey=PRCV4-CLOSED-SCHEMA-EVALUATOR-CATALOG-NOT-MATERIALIZED

## 2.4 PRCV4-IHR-F004 — universal digest domain separation contradicts raw file and envelope SHA identities

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Subject 2.4 says every digest uses `CONNECT-PRCV4:<artifactDomain>:` plus canonical bytes;the manifest and both Readers compute individual member/input SHA values and the manifest-envelope SHA as raw SHA-256 over file bytes, with no file-byte or envelope domain prefix.
- impact=the same digest field can mean a raw byte checksum or a domain-separated object identity;cross-class substitution and incompatible CAS/evidence implementations remain possible.
- remediation=define distinct checksum and identity types;assign every identity class a closed domain;bind raw transport checksums only inside a domain-separated typed record;version the migration in immutable v5.
- closureTest=identical payload bytes in every two distinct artifact classes produce distinct identity roots;raw checksum substitution where a typed identity is required fails;both Readers agree on all boundary vectors.
- noMergeKey=PRCV4-RAW-SHA-VERSUS-UNIVERSAL-DOMAIN-SEPARATION

## 2.5 PRCV4-IHR-F005 — bootstrap Producers 000–003 have no admitted Genesis, appointment or recovery authority

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Producer records 000–003 have `bootstrapAuthorityObjectId=null`;Producer 003 creates the BootstrapAuthorityEnvelope that authorizes only later Producers;the schema has B0/Tal roots and prose self-authorization denial but no typed Genesis preimage, expected-empty head, appointment receipt, authority-owner separation or recovery transition.
- impact=the bytes that validate and construct bootstrap authority can be emitted by unauthorised producers, or the bootstrap object can authorize its own producer circularly.
- remediation=materialize class-specific Genesis and Recovery schemas, rooted admitted instances, sole-producer appointments from accepted B0/Tal authority, expected-empty/current-head CAS and independent recovery ownership.
- closureTest=an admitted Genesis instance uniquely authorizes Producers 000–003 without consuming their outputs;self-appointment, conflicting Genesis, stale head, wrong B0/Tal root, shared recovery owner and compromised-authority recovery all terminate failure.
- noMergeKey=PRCV4-BOOTSTRAP-GENESIS-APPOINTMENT-RECOVERY-ABSENT

## 2.6 PRCV4-IHR-F006 — lifecycle, CAS, time, replay and revocation rules are labels rather than executable transitions

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV4-REQ-005 requires an undefined `Transition` array plus Hash/Id labels and prose invariants;it has no typed transition instance or evaluator binding current head, expected-old head, epoch, trusted-time receipt, expiry, append-only event, response-loss state and descendant revocation atomically.
- impact=replay, clock rollback, duplicate consumption, stale evidence, lost response or partial revocation can be interpreted differently while all required labels are present.
- remediation=materialize typed transition/consume/revoke events, an atomic current-head store, deterministic evaluator programs and forward recovery schedules for success, failure-before-write, failure-after-write and response-loss cases.
- closureTest=concurrent consume has one winner;replay, stale revision, time rollback, expiry and revoked ancestor deny;response loss converges by authoritative readback without duplicate effect;every accepted event advances one CAS head and revocation reaches all descendants.
- noMergeKey=PRCV4-LIFECYCLE-CAS-TIME-REPLAY-REVOCATION-NONEXECUTABLE

## 2.7 PRCV4-IHR-F007 — Finding records and Alias equivalence are not rooted field by field

- severity=P0;state=OPEN;closureCredit=0.
- evidence=ID ordering and counts match 32 predecessor, 59 v2 and 34 v3 source records, but each closure uses a whole-file `sourceFindingRoot`;Readers never parse evidence, impact, remediation, closureTest or noMergeKey from source bytes;all 32 Alias equivalence roots remain null/UNPROVED.
- impact=source-field changes, extraction ambiguity or wrapper drift can preserve every counted ID and whole-file root reference while changing the semantic closure obligation.
- remediation=define a closed Markdown/source extraction grammar or canonical source-record format;derive one record root per Finding;bind predecessor/wrapper projections and semantic deltas field by field.
- closureTest=both Readers independently extract all source fields, produce identical per-record roots and 32 equivalence projections, and reject a one-character change in every field without changing any other Finding's identity.
- noMergeKey=PRCV4-FINDING-RECORD-EXTRACTION-ALIAS-EQUIVALENCE-UNPROVED

## 2.8 PRCV4-IHR-F008 — all 93 vectors are unmaterialized operation labels, not causal executions

- severity=P0;state=OPEN;closureCredit=0.
- evidence=every vector preimage is `SPECIFIED-NOT-MATERIALIZED`, every evaluator and receipt root is null, and executed vectors are zero;operations carry a field name/type but no concrete preimage, operand, after-state or evaluator program;seven stale-CAS vectors target generic State fields rather than a complete transition.
- impact=expected terminal text and field linkage can look causal without executing the rule named by the Finding;no negative result is reproducible or portable.
- remediation=materialize canonical preimages, exact typed mutations, evaluator source/program roots, oracle bodies, actual terminals and receipts for every vector;keep expected terminals comparison-only.
- closureTest=every vector terminates through its evaluator;changing only expected terminal fails comparison;changing preimage, operand, current head, schedule or evaluator root changes the causal result;all negative vectors terminate failure.
- noMergeKey=PRCV4-VECTOR-PREIMAGE-MUTATION-EVALUATOR-RECEIPT-ABSENT

## 2.9 PRCV4-IHR-F009 — one vector per Finding collapses multi-Requirement and multi-case closure predicates

- severity=P0;state=OPEN;closureCredit=0.
- evidence=93 Findings create 204 Requirement mappings;58 Findings map to more than one Requirement, yet every Finding has exactly one vector against one target Requirement and no subcase matrix for compound closure tests.
- impact=one passing mutation can supply vector credit while another mapped Requirement or distinct adversarial branch of the same noMergeKey was never exercised.
- remediation=derive a finite vector matrix per Finding over every mapped Requirement and every atomic closure predicate, with explicit denominator, coverage root and no range/alias credit.
- closureTest=forward and inverse joins prove each mapped Requirement/subpredicate has at least one causal negative and required positive control;removing any vector creates one exact missing coverage edge and blocks only the affected Finding.
- noMergeKey=PRCV4-VECTOR-COVERAGE-COLLAPSES-204-MAPPINGS

## 2.10 PRCV4-IHR-F010 — dual allowlist builders and adjudicator are opaque roots owned by one Producer

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV4-REQ-027 stores `builderARoot`, `builderBRoot` and `adjudicatorRoot`, but the graph contains only sole Producer 027;there are no distinct implementation, work, ledger, authority-owner or appointment nodes/edges for either builder or adjudicator.
- impact=one principal or implementation can generate all three roots and claim independent agreement over an unsafe changeset.
- remediation=model both builders and adjudicator as separately appointed typed producers with disjoint implementation/work/ledger/authority-owner roots, identical frozen inputs and deterministic comparison.
- closureTest=shared implementation, owner, work receipt, ledger, authority or input cut denies;independent outputs agree byte-for-byte on the clean corpus;one omitted/surplus/path-mode/object/provenance mutation produces disagreement and blocks the allowlist.
- noMergeKey=PRCV4-DUAL-ALLOWLIST-WITNESS-ADJUDICATOR-INDEPENDENCE-OPAQUE

## 2.11 PRCV4-IHR-F011 — two-scanner independence and disagreement ownership are not represented in the producer graph

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV4-REQ-019 uses undefined ScannerRecord/ScannerDisagreement types and receipt Hashes;the graph has only sole Producer 019 and no distinct scanner implementations, ruleset owners, work roots, ledgers or independent adjudicator authority.
- impact=one scanner run can be duplicated or relabeled as two independent engines, and the same authority can suppress disagreement.
- remediation=materialize separately appointed scanner and adjudicator producers with disjoint implementation/ruleset/work/ledger/authority-owner roots and a byte-identical input-cut contract.
- closureTest=same-engine alias, shared ruleset, unequal cut, missing class/provider pattern, corpus miss or shared adjudicator authority denies;two truly independent scans and a separate adjudicator produce rooted outcomes.
- noMergeKey=PRCV4-SECRET-SCANNER-WITNESS-ADJUDICATOR-INDEPENDENCE-OPAQUE

## 2.12 PRCV4-IHR-F012 — GitHub control-plane Permit lacks a complete typed transaction

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV4-REQ-025's closed top-level schema omits issuedAt, expiresAt, expected-old Permit head/epoch, typed failure receipt and forward/response-loss recovery although Subject 3.26 requires short TTL, atomic consume, failure handling and forward recovery.
- impact=a stale or replayed control Permit, lost response or partial mutation can be re-executed or rolled back without an exact security-preserving terminal.
- remediation=add a typed control Permit issue/consume/revision/revoke transaction with expected-old head, trusted issue/expiry, one-use ledger, per-step receipt, failure-before/after-write classification, response-loss readback and non-weakening forward recovery.
- closureTest=stale/replayed/expired/revoked Permit, reordered/skipped step, weak intermediate state and shared issuer/executor/reader deny;response loss converges exactly once;recovery never falls below the rooted security floor.
- noMergeKey=PRCV4-CONTROL-PLANE-PERMIT-TRANSACTION-INCOMPLETE

## 2.13 PRCV4-IHR-F013 — Public Push Permit omits accepted-object, failure and response-loss state

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV4-REQ-029 binds sentObjectRoot and a remoteReceipt Hash but no exact acceptedObjectRoot, typed failure receipt, response-loss reconciliation, Permit-head epoch/revocation record or retry schedule;expectedOldOid alone is the ref lease, not the Permit consumption head.
- impact=a server can accept a different object set or update the ref while the client loses the response, permitting unsafe retry, duplicate consumption or false object-set proof.
- remediation=materialize atomic Permit-head CAS plus exact sent/accepted/quarantined object sets, authoritative remote ref/object/visibility readback, failure receipt, revocation head and response-loss recovery.
- closureTest=wrong old OID, surplus/missing accepted object, stale/replayed/expired/revoked Permit and visibility mismatch deny;lost response followed by retry performs authoritative readback and never creates a second effect.
- noMergeKey=PRCV4-PUBLIC-PUSH-PERMIT-ACCEPTED-OBJECT-RESPONSE-LOSS-INCOMPLETE

## 2.14 PRCV4-IHR-F014 — Deployment Permit omits time, revision, reader and response-loss semantics

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV4-REQ-031 has issuer/consumer roots but no independent reader root, issuedAt/expiresAt, expected-old Permit/revision head, consume epoch, revocation record or authoritative response-loss/readback recovery fields.
- impact=a stale plan or ambiguous provider response can be consumed twice or accepted without an independent observation of target state, health and drift.
- remediation=materialize a typed deployment issue/consume/revision/revoke protocol with separate issuer/consumer/reader, trusted TTL, expected current target and Permit heads, one-use ledger, apply/failure/readback receipts and forward recovery.
- closureTest=wrong target/current root, stale revision, replay, expiry, revocation, shared role and health/drift failure deny;response loss converges by target readback;digest-preserving rollback cannot authorize a new Push or Release.
- noMergeKey=PRCV4-DEPLOYMENT-PERMIT-TIME-REVISION-READBACK-INCOMPLETE

## 2.15 PRCV4-IHR-F015 — Release Permit omits time, revision, reader and post-publication recovery semantics

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV4-REQ-032 has issuer/consumer roots but no independent reader root, issuedAt/expiresAt, expected-old Permit/revision head, consume epoch, revocation record, typed failure receipt or authoritative tag/asset/package readback.
- impact=a stale/replayed Permit or lost publisher response can create a tag, asset or package whose final public identity is unknown, mutable or consumed twice.
- remediation=materialize a typed release issue/consume/revision/revoke protocol with separate issuer/publisher/reader, trusted TTL, expected heads, one-use ledger, exact tag/asset/package receipts, response-loss readback and yank/deprecate/successor recovery.
- closureTest=wrong Commit/digest/coordinate, stale/replayed/expired/revoked Permit, shared roles and mutable replacement deny;lost response converges by authoritative public readback;release cannot deploy.
- noMergeKey=PRCV4-RELEASE-PERMIT-TIME-REVISION-READBACK-INCOMPLETE

## 2.16 PRCV4-IHR-F016 — four-way Permit separation is an opaque assertion, not typed consumer enforcement

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV4-REQ-041 stores four generic State fields plus issuer/consumer/cross-use Hashes;it defines no Permit type tags, NamedUse signatures, consumer interfaces, class-specific consume functions or executable cross-use denial matrix.
- impact=the same payload/root can be interpreted by a different consumer class while an opaque separation Hash claims success.
- remediation=define disjoint class-specific Permit schemas and consumer NamedUses with typed inputs/outputs, unique domains, issuer/consumer authority constraints and a complete cross-use evaluator matrix.
- closureTest=each valid Permit succeeds only at its named consumer;all 12 ordered cross-class presentations terminate the exact denial terminal;payload/root aliasing cannot satisfy another class.
- noMergeKey=PRCV4-FOUR-PERMIT-NAMEDUSE-CROSS-CONSUMER-SEPARATION-OPAQUE

## 2.17 PRCV4-IHR-F017 — the external manifest envelope and Reader receipts are not bound by the Acceptance schema

- severity=P0;state=OPEN;closureCredit=0.
- evidence=the package root deliberately excludes the manifest and reports;PRCV4-REQ-040 requires package/schema/graph/review roots but no manifest-envelope SHA or Reader-report roots;the stored reports are external companions only.
- impact=a future Acceptance can cite the correct package root while omitting or substituting the envelope that declares member order, denominators, input root and claim limits, and omit the receipts that bind its hash.
- remediation=retain cycle-free package roots but include the exact manifest-envelope identity and required detached receipt roots in a higher-level acceptance cut with explicit roles and expected-old CAS.
- closureTest=changing, removing or substituting the manifest or either required receipt invalidates only the higher-level acceptance envelope;clean recomputation remains cycle-free and binds all exact bytes.
- noMergeKey=PRCV4-MANIFEST-AND-READER-RECEIPTS-NOT-ACCEPTANCE-BOUND

## 2.18 PRCV4-IHR-F018 — no-self-review and no-self-acceptance lack a disjoint authority cut

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Producers 039 and 040 are authorized by the same BootstrapAuthority object;ReviewerIdentity and ReviewDisposition are undefined nested types;`self review denied` is prose and the graph has no disjoint implementation/reviewer/acceptance-owner authority edges.
- impact=one authority can appoint the implementation producer, reviewer and acceptance producer, satisfying hashes while reviewing and accepting its own work.
- remediation=model implementation, evidence, review, veto and acceptance as independently appointed producers with disjoint people/keys/implementation/work/ledger/authority-owner roots and a non-circular eligibility evaluator.
- closureTest=any shared owner, key, implementation, work receipt, ledger or appointment ancestor across prohibited roles denies;an eligible independent reviewer can veto;neither Producer QA nor package Readers can create Acceptance credit.
- noMergeKey=PRCV4-NO-SELF-REVIEW-ACCEPTANCE-AUTHORITY-CUT-UNPROVED

## 2.19 PRCV4-IHR-F019 — a frozen public Secret-coordinate commitment is an equality oracle

- severity=P1;state=OPEN;closureCredit=0.
- evidence=the frozen public Secret-scan observation publishes a deterministic digest over a six-coordinate set and explicitly compares coordinate-set digest equality;v4's PrivateEvidenceLocator and Secret lifecycle prohibit a public equality oracle.
- impact=an observer can test guessed low-entropy path/line/rule sets against the public commitment even though raw Secret values are redacted.
- remediation=classify the disclosure as a public residual;stop publishing bare low-entropy commitments;use a privately held keyed commitment or an approved zero-knowledge/public aggregate projection that exposes no equality oracle.
- closureTest=a public adversary with candidate coordinate sets cannot verify equality;authorized private Readers can validate custody and counts;no public artifact contains raw coordinate/path/value or a guess-verification oracle.
- noMergeKey=PRCV4-PUBLIC-SECRET-COORDINATE-EQUALITY-ORACLE

## 2.20 PRCV4-IHR-F020 — the mandatory late storage decision is outside v4's frozen universe

- severity=P0;state=OPEN;closureCredit=0.
- evidence=`docs/planning/github-public-repository-large-generated-artifact-storage-decision-2026-08-30.md` with SHA-256 `508b702087bc2c4011975af87c30bea1208bf5720ec263409d287acb5eb15a84` appears in no v4 physical input, graph node, Requirement dependency, package root or supersession record.
- impact=v4 cannot claim a complete current Public-repository publication plan because a mandatory post-v4 storage/security decision has no causal path to review or Acceptance.
- remediation=leave v4 immutable and produce v5 that imports the exact late-decision bytes, records typed supersession/reconciliation and maps every new storage obligation to sole producers, schemas, graph edges and non-merged Findings.
- closureTest=mutating or omitting the late input makes both v5 Readers fail;forward/inverse reconciliation resolves every decision clause exactly once;v4 hashes remain unchanged.
- noMergeKey=PRCV4-LATE-STORAGE-DECISION-NOT-ADMITTED-OR-SUPERSEDED

## 2.21 PRCV4-IHR-F021 — member-size, repository-growth and clone budgets have no executable publication gate

- severity=P0;state=OPEN;closureCredit=0.
- evidence=current seven v4 members total 545716 bytes, maximum 126109 bytes and zero members at or above 52428800 bytes, but no v4 schema/Reader/vector enforces `memberSize<50 MiB`, repository total-size budget, growth budget or clone-time budget.
- impact=the present small package passes by accident;the same control model can authorize a future warning-scale/blocked-scale member or unbounded repository growth.
- remediation=add rooted byte measurements, strict per-member threshold, accepted repository total/growth/clone budgets, budget owner/policy, before/after projections and Public Push denial on unknown or exceeded values.
- closureTest=52428799-byte members pass only when every other predicate passes;52428800 bytes and above deny;unknown budget, exceeded total/growth/clone limit, stale measurement and Reader disagreement deny.
- noMergeKey=PRCV4-SIZE-GROWTH-CLONE-BUDGET-GATE-ABSENT

## 2.22 PRCV4-IHR-F022 — deterministic sharding and generator-first lifecycle are absent

- severity=P0;state=OPEN;closureCredit=0.
- evidence=v4 has no shard descriptor, ordinal, canonical first/last key, member count, reconstructed corpus root, generator source/input/algorithm identity, dual-generation parity or shard mutation matrix.
- impact=a large derived corpus can be split with gaps, overlaps, duplicates or unstable boundaries, or checked in as opaque source without reproducible provenance.
- remediation=materialize deterministic generator-first schemas/programs, canonical shard boundaries below 50 MiB, ordered shard manifest, reconstruction oracle and independent dual-generation parity.
- closureTest=missing/duplicate/out-of-order ordinal, overlap, gap, wrong range/count/bytes/root, shard substitution and generator-root drift each terminate failure;clean shards reconstruct the exact canonical corpus root without randomness.
- noMergeKey=PRCV4-DETERMINISTIC-SHARDING-GENERATOR-FIRST-LIFECYCLE-ABSENT

## 2.23 PRCV4-IHR-F023 — external artifact storage has no closed public-safe lifecycle

- severity=P0;state=OPEN;closureCredit=0.
- evidence=v4 mentions releases, packages, LFS and artifact surfaces but defines no selected external-store contract binding public-safe classification, URL/identity, digest, media type, bytes, provenance, cost, retention, deletion, expiry, availability, owner and disaster recovery.
- impact=an external Release/LFS/artifact object can be missing, mutable, private-data-bearing, expired, unaffordable or unrecoverable while an opaque Hash receives QA/Review/Acceptance credit.
- remediation=in immutable v5 define a selected-store-agnostic lifecycle schema, classification gate, immutable identity/provenance receipt, cost/retention/deletion owner, availability/readback and recovery contract;keep unresolved selection blocking.
- closureTest=Secret/PII/customer/private-locator content, missing classification, mutable or mismatched digest, wrong attestation subject, expired/deleted/inaccessible object, absent owner, exceeded budget or failed recovery all deny;verified public-safe artifact readback and restore reproduce exact bytes.
- noMergeKey=PRCV4-EXTERNAL-ARTIFACT-PUBLIC-SAFE-LIFECYCLE-ABSENT

# 3. Exact counters and disposition

## 3.1 Counters

3.1.1 unique Finding IDs=`23`.

3.1.2 unique noMergeKeys=`23`.

3.1.3 severity counts=`P0 22;P1 1;P2 0;P3 0`.

3.1.4 state counts=`OPEN 23;CLOSED 0;ACCEPTED 0;MERGED 0;SUPPRESSED 0`.

3.1.5 closureCredit sum=`0`.

3.1.6 predecessor closure records remain accepted=`0/93` and are not altered by this Manifest.

3.1.7 immutable-v5 active Finding denominator=`116`.

## 3.2 Required successor and invariant state

3.2.1 `requiredSuccessor=IMMUTABLE-PUBLIC-CYBER-V5`.

3.2.2 v5 must preserve v4/predecessor bytes and carry a one-to-one closure row for every Finding above. No control, evidence, range, Alias or Reader PASS closes a different noMergeKey.

3.2.3 This Manifest is not Acceptance and cannot supply closure credit.

3.2.4 `Acceptance=0;acceptedRequirements=0/42;acceptedInheritedClosures=0/93;acceptedNewClosures=0/23`.

3.2.5 `GitHubControlPlanePermit=ABSENT;PublicPushPermit=ABSENT;DeploymentPermit=ABSENT;ReleasePermit=ABSENT`.

3.2.6 `repositoryVisibility=PUBLIC;Gate29=BLOCKED;developmentFreeze=ACTIVE`.
