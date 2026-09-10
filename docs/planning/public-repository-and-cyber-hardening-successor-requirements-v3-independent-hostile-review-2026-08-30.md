# 1. Connect — Public Repository and Cyber Hardening v3 independent hostile review

## 1.1 Review identity and frozen Subject

1.1.1 artifactId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-V3-INDEPENDENT-HOSTILE-REVIEW-2026-08-30.

1.1.2 artifactClass=DETACHED-INDEPENDENT-HOSTILE-PLANNING-REVIEW;NOT-AUTHORITY;NOT-IMPLEMENTATION;NOT-OPERATIONAL-EVIDENCE;NOT-ACCEPTANCE;NOT-A-PUSH-DEPLOY-OR-RELEASE-PERMIT.

1.1.3 frozen Subject path=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-2026-08-30.md.

1.1.4 frozen Subject SHA-256=a93bc7bde79f6427e69d70bd55280cd7fb7f3e3dc9bd30bb62e3be607dcf2c30;820 lines;49169 bytes.

1.1.5 atomic manifest path=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-atomic-package-manifest-2026-08-30.json;SHA-256=623f8a7bc4864d11be9eb398c9d2987388b030c991acccca312b1720cdf6f9c4;130 lines;5582 bytes.

1.1.6 packageContentRoot=9755380dc62dcc2149fe0aba8c6f885d7d875407a753e9d6c05b5f41f5b5e431;coreContentRoot=3c89fdee750784e12c1776728fb0551c2dfa9dc7b0a4efe94288d74d39c7af51.

1.1.7 companion Findings Manifest path=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-independent-hostile-review-findings-manifest-2026-08-30.md.

1.1.8 review boundary=the exact frozen nine-member package and its ten physical frozen inputs. No Subject member, Product file, Git object, Git ref, GitHub setting, provider, credential, build, Push, deploy or release was changed.

1.1.9 Producer QA was read only after the independent hash, root, reader and semantic checks had been derived. It supplied no independent credit.

1.1.10 repository visibility is a binding invariant: PUBLIC. Private is not an allowed remediation, rollback or incident state.

## 1.2 Verdict first

1.2.1 verdict=REJECT-AS-A-CLOSED-EXECUTABLE-OR-ACCEPTANCE-READY-SUCCESSOR.

1.2.2 The package is mechanically stronger than v2: its nine members are byte-consistent, its declared graph is acyclic, the previous 32-only ceiling is visibly addressed, and it preserves the safe current state of Acceptance=0. Those properties do not make the security model causal.

1.2.3 this review adds 34 distinct non-merged Findings:23 P0;11 P1;0 P2;0 P3.

1.2.4 disposition totals=OPEN 34/34;CLOSED 0/34;ACCEPTED 0/34;MERGED 0;SUPPRESSED 0.

1.2.5 no inherited Finding receives closure credit. The v3 closure registry itself reports accepted closures=0/59 and operational Evidence roots=0.

1.2.6 required current state remains:

| State | Independent result |
|---|---|
| Subject Acceptance | 0 |
| independently accepted v3 Requirements | 0/56 |
| independently accepted inherited closures | 0/59 |
| independently accepted new review Findings | 0/34 |
| implemented producers | 0/56 |
| operational Evidence roots | 0 |
| Public Push Permit | ABSENT |
| deploy Permit | ABSENT |
| release Permit | ABSENT |
| repository visibility | PUBLIC |
| Gate29 | BLOCKED |
| development freeze | ACTIVE |

# 2. Inputs and physical verification

## 2.1 Nine-member package

| Role | Repository-relative path | SHA-256 | Lines | Bytes |
|---|---|---|---:|---:|
| Subject | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-2026-08-30.md | a93bc7bde79f6427e69d70bd55280cd7fb7f3e3dc9bd30bb62e3be607dcf2c30 | 820 | 49169 |
| typed registries | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-typed-registries-2026-08-30.json | b6ac2d2cbb6e0048fba1a36f53be1fa0cc4e96d163c9385b6b90cae3558d4385 | 4391 | 126824 |
| producer graph | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-producer-dependency-graph-2026-08-30.json | 15ac5c3e515af79e3deedaa4dfb130632a9f0f874e93e2bee0132c33da7681e5 | 3247 | 91408 |
| vector pack | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-operation-oracle-vector-pack-2026-08-30.json | 1f13d5641ca923ffa84ff5f8c84744ef50f397359373193fdf91ca9104e4048b | 1764 | 57078 |
| closure registry | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-finding-closure-registry-2026-08-30.json | a19a2771f218883a9ab9ab0678e956dfefdb23970cfdac92fc247c6c87708f5f | 1395 | 68374 |
| reader A | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-a-2026-08-30.mjs | 04f0d38705dd6d6c98594ee1bef2dc2101626b6bcb2fb0b87269ff28dac0cbca | 170 | 10581 |
| reader B | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-b-2026-08-30.mjs | 31ca4f4724a88b3a5780a306136a3a5d224fa610f489564e1dc9a691f45e9901 | 184 | 10688 |
| report A | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-a-report-2026-08-30.json | 98158f708651c08c9ff68a246a20e69e22e8b0eafc83ed617b0b6825306c130b | 66 | 2507 |
| report B | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-b-report-2026-08-30.json | 6161dade9d25e6cb0086b9ba1373b51a121e12f7620f8413c052bb06ffc2d856 | 66 | 2509 |

2.1.1 every member matched its declared path, SHA-256, physical line count and byte count.

2.1.2 packageContentRoot and coreContentRoot were independently recomputed from the declared tuple algorithm and matched exactly.

2.1.3 every JSON member parsed. Both stored reader reports were regenerated from the frozen sources and matched byte-for-byte.

## 2.2 Frozen physical inputs

2.2.1 all ten non-null input locators existed and matched their declared roots: v2 Subject;v2 review;v2 Findings;predecessor review;predecessor Findings;GitHub live v3;Legacy quarantine v2;license observation;Secret scan v2;Secret scan v1.

2.2.2 the nine typed-absent authority or decision inputs remain absent: B0;canonical Tal mandate;accepted Review Protocol;accepted Source Universe;accepted Control Sequence;Legal decision;D02;D25;trusted-time authority.

2.2.3 Secret scan v2 remains the current bounded history observation. Its own state is blocking:6 unresolved coordinates;0 cleared candidates;unreachable objects UNKNOWN;external forks UNKNOWN;current writer-frozen worktree/index snapshot ABSENT.

# 3. Independent mechanical results

## 3.1 Shape and graph

| Denominator | Result |
|---|---:|
| Requirements | 56/56 unique and contiguous |
| declared output objects | 56/56 unique |
| declared producer identities | 56/56 unique |
| graph nodes | 187 |
| graph edges | 349 |
| graph cycles | 0 |
| admitted closure records | 59 |
| negative vectors | 59 |
| unique noMergeKey values | 59 |
| accepted closure records | 0 |
| implemented producer roots | 0 |
| operational Evidence roots | 0 |

3.1.1 the declared graph has one PRODUCES edge for each output and no dangling, self or forward-numbered declared edge.

3.1.2 final Requirement PRCV3-REQ-055 has a 55-Requirement transitive closure and omits PRCV3-REQ-028. This is a semantic graph defect, not a cycle or parser defect.

3.1.3 the current package contains no `Math.random`, `crypto.randomUUID`, host-absolute locator or file URI. This statement is limited to the frozen package bytes and does not validate future producer output.

## 3.2 What the two reader PASS results prove

3.2.1 they prove only that the five core files have the expected hard-coded counts, the declared graph is acyclic under their edge model, and each synthetic mutation causes its own supplied oracle to return its own supplied expected terminal.

3.2.2 they do not validate the atomic manifest, reader sources, stored reports, physical frozen input bytes, domain schemas, schema instances, legal authority, Git object semantics, GitHub state, scanner independence, permit lifecycle or operational behavior.

3.2.3 therefore PASS-PLANNING-PACKAGE is retained as a bounded mechanical observation and receives zero semantic or acceptance credit.

# 4. Hostile semantic Findings summary

| Finding | Severity | Short title |
|---|---|---|
| PRCV3-IHR-F001 | P0 | one docs-only locator grammar cannot represent Product or Git paths and readers trust CWD |
| PRCV3-IHR-F002 | P0 | the declared schemas reject the package's own instances |
| PRCV3-IHR-F003 | P0 | 51 domain outputs have field-name lists, not closed typed schemas or evaluators |
| PRCV3-IHR-F004 | P0 | canonical identity and mandatory domain separation are unspecified or violated |
| PRCV3-IHR-F005 | P0 | both readers omit the manifest, four members and physical frozen-input verification |
| PRCV3-IHR-F006 | P1 | reader independence is asserted by file difference, not demonstrated by independent semantics |
| PRCV3-IHR-F007 | P0 | the 59-Finding universe aliases the first 32 current review records without a verified equivalence map |
| PRCV3-IHR-F008 | P0 | all negative vectors are tautological synthetic controls with self-supplied terminals |
| PRCV3-IHR-F009 | P0 | a closure can be marked accepted without accepted roots for every mapped Requirement |
| PRCV3-IHR-F010 | P0 | final acceptance has no dependency path from CacheArtifactTrustRegistry |
| PRCV3-IHR-F011 | P0 | sole-producer identity is not production authority and bootstrap authority is absent |
| PRCV3-IHR-F012 | P0 | object, evidence, acceptance and Permit lifecycle/CAS/time semantics are non-causal |
| PRCV3-IHR-F013 | P0 | remote ref/object/fork/unreachable acquisition has no finite cut or complete receipt grammar |
| PRCV3-IHR-F014 | P0 | worktree/index/object snapshot and writer freeze omit security-relevant Git states |
| PRCV3-IHR-F015 | P0 | GitHub-only and residual-copy surface universes are open and under-enumerated |
| PRCV3-IHR-F016 | P0 | the exact allowlist cannot satisfy its two-builder closure and omits Git tree semantics |
| PRCV3-IHR-F017 | P0 | Public Push Permit lacks an executable atomic consume-and-readback transaction |
| PRCV3-IHR-F018 | P0 | PUBLIC is not continuously read back or coupled to immediate Permit revocation |
| PRCV3-IHR-F019 | P0 | Secret candidate and two-scanner closure has no materialized independent coverage/result model |
| PRCV3-IHR-F020 | P1 | public-history and fork residual copies have no bounded, legally reviewed terminal state |
| PRCV3-IHR-F021 | P1 | PII policy lacks exact legal-role, jurisdiction, transfer, retention and rights matrices |
| PRCV3-IHR-F022 | P1 | license and every-byte provenance lack a closed rights/adjudication universe |
| PRCV3-IHR-F023 | P0 | personal-account owner powers defeat the claimed two-person and bypass model |
| PRCV3-IHR-F024 | P0 | GitHub mutation is ordered before privileged-identity acceptance and can self-permit |
| PRCV3-IHR-F025 | P1 | control-plane rollback may restore the observed insecure baseline |
| PRCV3-IHR-F026 | P0 | the GitHub control-plane operation and capability universes are not closed |
| PRCV3-IHR-F027 | P0 | deploy and release permits are merged and not independently typed or consumed |
| PRCV3-IHR-F028 | P0 | no finite asset, data-flow, trust-boundary, threat and abuse-case universe exists |
| PRCV3-IHR-F029 | P1 | monitoring, audit, backup, restore and recovery exercises are not materialized |
| PRCV3-IHR-F030 | P1 | cyber source version, custody, cutoff and conflict resolution remain external and absent |
| PRCV3-IHR-F031 | P1 | SLSA and attestation claims have no exact normative version/Track/Level evaluator |
| PRCV3-IHR-F032 | P1 | AI security has no closed component, tool, memory, side-effect and TEVV denominator |
| PRCV3-IHR-F033 | P1 | dependency/SBOM scope is not closed across build, runtime, Actions, images and services |
| PRCV3-IHR-F034 | P1 | incident and disclosure lifecycles lack executable drills and independent recovery re-rooting |

# 5. Causal analysis

## 5.1 Schema and oracle chain

5.1.1 `schemaDefinitions.RegistryObject` requires `subjectRoot` and forbids extra properties, while every materialized registry object omits `subjectRoot` and adds undeclared properties such as `type`, `requiredFields` and `acceptanceCredit`.

5.1.2 `schemaDefinitions.FindingClosure` and `NegativeVector` similarly forbid fields that every closure and vector record actually contains. No reader attempts schema validation.

5.1.3 each negative vector mutates an invented top-level key such as `control_033_prch2v2_exact_public_allowlist_absent`. That key is neither a required field of ExactPublicChangesetAllowlist nor a Git/Secret/GitHub input.

5.1.4 on any oracle mismatch each reader assigns `vector.expectedTerminal` directly. It then checks that this value equals the same `vector.expectedTerminal`. This is a tautology, not causal validation of the target Requirement.

5.1.5 consequence: two readers can PASS even if every domain rule, closure and Permit implementation is absent or wrong. Current zero credit is honest, but the planned promotion path is unsafe.

## 5.2 Closure and acceptance chain

5.2.1 a closure record contains `requirementIds`, but those references are not graph edges and the closure schema has no accepted Requirement roots, versions, epochs or dispositions.

5.2.2 PRCV3-REQ-051 can therefore be implemented as an accepted Boolean plus arbitrary evidence roots without proving all mapped Requirements.

5.2.3 PRCV3-REQ-055 reaches 55 of 56 Requirements. PRCV3-REQ-028 CacheArtifactTrustRegistry is absent from its transitive closure even though Findings PRCS-HR-F003 and PRCS-HR-F017 map to it.

5.2.4 consequence: a poisoned or cross-trust cache/artifact path can be outside the final acceptance cut.

## 5.3 Repository and Public Push chain

5.3.1 the package declares that every Public locator begins with `docs/`. An exact changeset containing `.github/`, `package.json`, application source, lockfiles, infrastructure or any non-doc path is therefore either unrepresentable or accepted by violating the canonical locator rule.

5.3.2 both readers resolve package paths against `process.cwd()` without binding the current directory to immutable repository host/node identity. A different directory or symlinked `docs` tree can satisfy their local reads.

5.3.3 remote counts are frozen, but no typed acquisition cut binds query start/end, pagination, advertised ref names and OIDs, object format, alternates, GitHub-only refs, rate limits, forks or inaccessible states into one CAS root.

5.3.4 worktree fields omit index stages, intent-to-add, skip-worktree, assume-unchanged, sparse rules, filters, attributes, symlink targets, gitlinks, alternates, replace/graft refs, path byte normalization and case collisions.

5.3.5 Public Push has no executable prepare/issue/consume/post-readback transaction, trusted maximum TTL, atomic one-use store, remote lease receipt or exact sent/accepted object proof.

## 5.4 Secret, GitHub and authority chain

5.4.1 the current six candidate coordinates remain open. The requirement for two scanners is a prose field set: no scanner instances, ruleset digests, identical input roots, per-class coverage, independent false-negative corpus outcomes or combined adjudication state exist.

5.4.2 GitHubOnlySurfaceUniverse omits a closed enumeration and cutoff contract for repository settings, collaborators, teams, invitations, Apps, OAuth, deploy keys, Webhooks, Actions Secrets/variables, environments, Pages, LFS, code/Secret alerts, advisories, comments, attachments, audit logs and residual copies.

5.4.3 PRCV3-REQ-034 can consume an actor and Permit before PRCV3-REQ-035 has accepted privileged identities. Its `permit` field has no separate authoritative producer.

5.4.4 the repository remains under a personal-account governance model in the frozen readback. An owner can transfer, delete or weaken the repository outside branch review. No accepted organization, owner succession or two-person destructive-operation authority is bound.

## 5.5 Cyber completeness chain

5.5.1 the package begins with control families but lacks a closed system/asset/data/actor/flow/trust-boundary/entry-point/abuse-case/threat/failure universe. Without this denominator, “all cyber weaknesses” is not a testable statement.

5.5.2 source custody, SLSA version claims, AI component and side-effect inventory, monitoring, backup/restore and incident drills remain declarative and unrooted.

5.5.3 the combined deploy/release final object does not define two separately authorized, separately expiring and separately consumed transactions. It also forces every deploy/release path through a new Public Push, which is incorrect for a digest-preserving promotion or reviewed rollback.

# 6. Required successor build order

## 6.1 Foundation repairs

6.1.1 separate four locator grammars: planning-package path;repository-content path;private Evidence locator;external resource locator. Bind each reader to immutable repository identity before opening any path.

6.1.2 publish exact machine schemas for every domain object, operation, state transition, Evidence receipt and Permit. Validate every current instance and negative schema corpus with two genuinely independent validators.

6.1.3 define one exact canonical JSON profile and domain-separated digest prefix per artifact type. Recompute package, graph, registry, vector and evidence roots under those rules.

6.1.4 bind the atomic manifest and every frozen input byte in both reader reports. Prove reader provenance, independence and disjoint implementation, then use differential malformed corpora to measure disagreement.

## 6.2 Closure repairs

6.2.1 materialize an exact alias/equivalence registry for the 32 predecessor identities and the v2 wrapper records. Preserve both roots and reject any content drift.

6.2.2 replace all synthetic `control_*` vectors with domain-valid preimages and mutations: ref OID changes;extra Git objects;index stages;scanner disagreement;candidate replay;visibility change;Ruleset bypass;wrong OIDC claim;stale deployment plan;wrong release digest.

6.2.3 require every closure to bind accepted Requirement roots, vector execution receipts, operational Evidence roots, independent reviewer disposition, review epoch, expiry and revocation. Add those edges to the dependency graph.

6.2.4 add PRCV3-REQ-028 and every subsequently admitted Requirement to the final acceptance transitive cut.

## 6.3 Repository and Secret repairs

6.3.1 define exact local and remote acquisition cuts with ref names/OIDs, object format, pagination, retries, rate-limit receipts, forks, inaccessible surfaces and writer barriers.

6.3.2 define two independent allowlist builders plus an adjudicator. Model Git trees, deletion, rename, modes, symlinks, gitlinks, LFS, attributes, generated outputs and the precise sent object closure.

6.3.3 implement a separate authoritative Public Push Permit producer and atomic consumer with repository host/node identity, expected remote OID, one-use CAS, trusted short TTL, revocation and post-receive readback.

6.3.4 materialize a private Secret candidate lifecycle and two-scanner coverage matrix over byte-identical roots. Rotation/revocation precedes history repair; residual public copies remain an explicit incident/legal risk.

## 6.4 Governance and cyber repairs

6.4.1 resolve personal-account governance or record an explicit bounded rejection. Privileged identities and destructive-operation authority must precede GitHub mutation.

6.4.2 split GitHub control-plane, Public Push, deploy and release into distinct state machines and Permits. Every machine requires independent authority, immutable subject, trusted time, CAS, rollback floor and readback.

6.4.3 create the finite cyber denominator before controls: assets;data classes;actors;flows;trust boundaries;surfaces;threats;abuse cases;failure modes;controls;tests;residual risks.

6.4.4 bind monitoring, audit custody, backup/restore, recovery drills, disclosure drills, exact source versions, SLSA/attestation policy, AI BOM/TEVV and full dependency universes.

# 7. Acceptance rule for a successor

7.1 all 34 Findings in the companion Manifest remain separately open until their exact closure tests pass.

7.2 all 59 inherited closures remain unaccepted until their exact source identities, mapped Requirements, causal vectors, operational Evidence and independent dispositions are rooted.

7.3 mechanical package PASS cannot close a semantic Finding.

7.4 unknown, inaccessible, stale, conflicting, mutable, untrusted-time or unreviewed state fails closed.

7.5 PUBLIC remains the only allowed repository visibility.

7.6 current Acceptance=0;Public Push Permit=ABSENT;deploy Permit=ABSENT;release Permit=ABSENT;Gate29=BLOCKED;development freeze=ACTIVE.
