# 1. Connect Public/Cyber v4 — Producer QA

## 1.1 Identity

1.1.1 Artifact ID: `CONNECT-PRCV4-PRODUCER-QA-2026-08-30`.

1.1.2 Artifact class: `MECHANICAL-PRODUCER-QA;NOT-INDEPENDENT-REVIEW;NOT-SEMANTIC-ACCEPTANCE;NOT-OPERATIONAL-EVIDENCE`.

1.1.3 Logical repository: `github.com/talstilkol/connect`.

1.1.4 Required and observed repository visibility in the frozen planning inputs: `PUBLIC`.

1.1.5 No Product, Git, GitHub, provider, deployment or release mutation was performed while producing this package.

1.1.6 Scope is frozen at exactly 42 Requirements and 93 Findings. No later improvement is included as a control or receives implicit credit.

## 1.2 Disposition

1.2.1 Mechanical package verdict: `PASS`.

1.2.2 Semantic Acceptance: `0`.

1.2.3 Accepted Requirements: `0/42`.

1.2.4 Accepted Finding closures: `0/93`.

1.2.5 Gate29: `BLOCKED`.

1.2.6 Development freeze: `ACTIVE`.

1.2.7 GitHub control-plane Permit: `ABSENT`.

1.2.8 Public Push Permit: `ABSENT`.

1.2.9 Deployment Permit: `ABSENT`.

1.2.10 Release Permit: `ABSENT`.

# 2. Frozen roots

## 2.1 Root values

2.1.1 Physical-input root: `0a509984df065b5a8bbf8777d74e0013bf5ab0801a7a2666faa3e3a347ade40a`.

2.1.2 Semantic-core root: `d9a5932e7f2448e04e185a5baa59a7295a20d7e5ac6351f3d0fb485138cff2a1`.

2.1.3 Atomic-package root: `f799c154c695034935c480a57b6a0047d8e2b67d318e42b0d9b88a0ea78f92cf`.

2.1.4 External manifest-envelope SHA-256: `43bd110cd8b59c0a3ea6086203d804df7b0dc6dd3441ec443d7ec740c4e65ed5`.

## 2.2 Root construction

2.2.1 The physical-input root covers exactly the 15 physical input records in registry order under `INPUT-MANIFEST`.

2.2.2 The semantic-core root covers exactly Subject, Registries, Graph, Vectors and Closures under `CORE-PACKAGE-ROOT`.

2.2.3 The atomic-package root covers the five semantic members plus Reader A and Reader B under `PACKAGE-ROOT`.

2.2.4 Every member preimage is repository-relative path, NUL, lowercase SHA-256, NUL, decimal byte count and LF.

2.2.5 The manifest envelope is not a member of the root it declares.

2.2.6 Reader reports and this QA file are external companions. This avoids a self-hash cycle.

# 3. Exact artifact inventory

## 3.1 Atomic package members

| Number | Role | Repository-relative path | SHA-256 | Lines | Bytes |
|---:|---|---|---|---:|---:|
| 1 | Subject | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-2026-08-30.md | 0f1f5cc9fb349f999b0bbff3f6f683c47c951b793ce3ef847388530717ff7257 | 469 | 32906 |
| 2 | Registries | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-schema-and-typed-registries-2026-08-30.json | 69f2f5ecde68c4223f90f64347fcb0c992620c05220a1a0789714439d4e7a10b | 3625 | 109243 |
| 3 | Graph | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-producer-dependency-graph-2026-08-30.json | 727c6d6e3d53e86a05eb0c09e581488b32546b1ac3fe8d15ed046c7d5240bff2 | 4635 | 126049 |
| 4 | Vectors | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-operation-oracle-vector-pack-2026-08-30.json | e387da4f5775cddfe24b3d5a196fce66408416e1be129e474c3ce37dc32989ca | 1 | 94575 |
| 5 | Closures | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-finding-closure-registry-2026-08-30.json | 32e9828a9ededb7ff2b3f809f5c53a0af94ed870a5ba1c5627ff01a93dadb068 | 1 | 126109 |
| 6 | Reader A | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-reader-a-2026-08-30.mjs | cbfe723307cb16ed3415e4205d01fb62fd13d360fc4c9a9adf9a45e01fefbe6c | 606 | 30014 |
| 7 | Reader B | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-reader-b-2026-08-30.rb | dffdaba8b674b535b601e5cd13b3736c6ee8ad72a1b90b466beacdde127b2b46 | 536 | 26820 |

## 3.2 External companions

| Number | Role | Repository-relative path | SHA-256 | Lines | Bytes |
|---:|---|---|---|---:|---:|
| 1 | Manifest envelope | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-atomic-package-manifest-2026-08-30.json | 43bd110cd8b59c0a3ea6086203d804df7b0dc6dd3441ec443d7ec740c4e65ed5 | 290 | 11045 |
| 2 | Reader A report | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-reader-a-report-2026-08-30.json | 1cd92bc70b270dab787d2761e659364ba6d66389a69b4a1a2fb393670e1e73af | 44 | 1462 |
| 3 | Reader B report | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-reader-b-report-2026-08-30.json | a578da069d5e98064450edb4d2d60a56e142fc4c023820b4bd3f6fbf220c7555 | 48 | 1454 |

# 4. Mechanical verification

## 4.1 Independent Readers

4.1.1 Reader A is Node.js and uses a recursive-descent JSON lexical validator, duplicate-key rejection and Kahn topological sorting.

4.1.2 Reader B is Ruby and uses the native JSON parser, independent value validation and depth-first cycle detection.

4.1.3 Both discover the Git top-level, resolve the real path and normalize the Origin to `github.com/talstilkol/connect`.

4.1.4 Both validate planning-path grammar, reject parent segments, absolute paths, backslashes and symlink escape, and never treat CWD as repository authority.

4.1.5 Reader A result: `79/79 PASS`, zero failed checks and zero errors.

4.1.6 Reader B result: `79/79 PASS`, zero failed checks and zero errors.

4.1.7 Both independently recomputed the same physical-input, core and package roots.

## 4.2 Finite universes and graph

4.2.1 Physical inputs: `15`.

4.2.2 Typed absent inputs: `10`.

4.2.3 Requirements, sole Producers and planned output states: `42/42/42`.

4.2.4 Implemented Producers: `0/42`.

4.2.5 Operational Evidence roots: `0`.

4.2.6 Graph: `109` nodes and `619` edges.

4.2.7 Edge classes: 25 input-consumption, 42 production, 310 dependency-consumption, 38 bootstrap-authorization and 204 Finding-closure root dependencies.

4.2.8 Both algorithms found a complete DAG and zero missing endpoints.

4.2.9 Acceptance Requirement 040 depends on exactly Requirements 000–039.

4.2.10 Final Requirement 041 depends on exactly Requirements 000–040.

## 4.3 Critical field bindings

4.3.1 The Readers explicitly verify fields for locator/root identity, lifecycle/CAS/trusted time/revocation, local HEAD/ref/index/worktree cut and remote refs/objects/forks/unreachable state.

4.3.2 They also verify GitHub-only surfaces, user-change ownership, generated/build-context/legacy state, Actions caches/artifacts/runners and exact dual-builder allowlist.

4.3.3 They verify secret-candidate lifecycle, its current six unresolved coordinates, zero cleared candidates and the Requirement for at least two independent scanners over one cut.

4.3.4 They verify GitHub control-plane, continuous PUBLIC, exact Public Push, deployment and release Permit fields as disjoint controls.

# 5. Finding closure preservation

## 5.1 Exact denominator

5.1.1 Total Findings: `93`.

5.1.2 Inherited Findings: `59`.

5.1.3 New v3 hostile-review Findings: `34`.

5.1.4 Severity counts over the non-merged denominator: `P0=54`, `P1=38`, `P2=1`, `P3=0`.

5.1.5 Unique Finding IDs: `93`.

5.1.6 Unique noMergeKeys: `93`.

5.1.7 Unique Vector IDs: `93`.

## 5.2 Lineage

5.2.1 The inherited universe is exactly 32 predecessor-root records plus 27 v2-wrapper-root records.

5.2.2 The new universe is exactly 34 v3-review-root records.

5.2.3 The first 32 Alias records bind predecessor and wrapper identities and roots.

5.2.4 All 32 field-equivalence roots remain `ABSENT/UNPROVED`; therefore Alias acceptance credit is zero.

5.2.5 Every Finding maps to one or more causal base Requirements 000–037.

5.2.6 No closure maps back to Closure, Review, Acceptance or Final Requirements 038–041; this removes the prior dependency cycle.

5.2.7 Every mapped Requirement has one explicit `acceptedRoot=null,state=ABSENT` record.

5.2.8 Design coverage is `93/93`; semantic closure is `0/93`.

# 6. Negative-vector causal validity

## 6.1 Exact vector universe

6.1.1 Vectors: `93`; one exact Vector per Finding.

6.1.2 Operation definitions: `7`; all seven are exercised by at least one Vector.

6.1.3 Oracle definitions: `2`.

6.1.4 Operation distribution: append unclassified member 53; substitute bound identity 18; omit required property 11; replay stale CAS 8; reorder transaction step 1; cross-use Permit 1; inject conflicting Evidence 1.

6.1.5 Every Vector targets a real field in its target Requirement's closed output schema.

6.1.6 Every expected terminal equals the target Requirement failure terminal.

6.1.7 Runtime terminal authority is the target evaluator, never the expected value in the Vector.

6.1.8 Evaluator implementation roots: `0`.

6.1.9 Executed Vector receipts: `0`.

6.1.10 Accepted Vectors: `0`.

# 7. PUBLIC invariant and exact transactions

## 7.1 Continuous visibility

7.1.1 PUBLIC is required at issue, consume, mutation, post-readback, monitoring and recovery states.

7.1.2 PRIVATE is forbidden as remediation, rollback, failover or incident response.

7.1.3 This package supplies a specification only; it does not supply an operational monitor receipt.

## 7.2 Permit separation

7.2.1 GitHub control-plane, Public Push, deployment and release have distinct schemas, issuers, consumers and failure terminals.

7.2.2 Public Push binds repository node, exact ref, expected-old OID, new OID, sent-object root, dual-witness allowlist, trusted issue/expiry, atomic consume, remote receipt and post-readback.

7.2.3 Deployment cannot release; release cannot deploy; no Permit is cross-usable.

7.2.4 All four current Permit states remain `ABSENT`.

# 8. Unresolved blockers

## 8.1 Authority and implementation

8.1.1 B0 and Tal mandate are absent.

8.1.2 Accepted Review Protocol, Source Universe and Control Sequence are absent.

8.1.3 Trusted-time, Legal and organization-governance authorities are absent.

8.1.4 D02 and D25 remain typed absent decisions.

8.1.5 All 42 Producer implementation, signer and capability roots are absent.

## 8.2 Evidence and repository state

8.2.1 Six Secret candidate coordinates remain unresolved and zero are cleared.

8.2.2 Main protection is observed absent; Ruleset count is zero; Actions is observed allow-all.

8.2.3 A writer-frozen local worktree/index/HEAD cut is absent.

8.2.4 Remote unreachable-object state and external-fork state are unknown.

8.2.5 GitHub-only surface enumeration is incomplete.

8.2.6 Two-scanner receipts, lifecycle dispositions, trusted-time receipts, operational Evidence and independent semantic review are absent.

# 9. Claim limits and future note

## 9.1 Zero implicit credit

9.1.1 Reader agreement proves only that the frozen planning package is mechanically self-consistent under their implemented checks.

9.1.2 It does not prove that a control exists, ran, remained current or resisted a real adversary.

9.1.3 It does not authorize Git/GitHub mutation, Public Push, deployment or release.

9.1.4 It does not accept any Requirement or Finding.

## 9.2 Future non-blocking note

9.2.1 Human-readable pretty-printing of the compact Closure and Vector JSON files may be considered only in a later version with new hashes. It is not a blocker and is not part of v4.

# 10. Final producer verdict

10.1 The v4 successor package is `FINAL` as a mechanically coherent, fail-closed planning candidate covering exactly the frozen 93-Finding scope.

10.2 The package is not independently reviewed and must not self-accept.

10.3 Semantic verdict remains `BLOCKED`.

10.4 Acceptance remains `0`; Gate29 remains `BLOCKED`; development freeze remains `ACTIVE`; repository visibility remains `PUBLIC`.
