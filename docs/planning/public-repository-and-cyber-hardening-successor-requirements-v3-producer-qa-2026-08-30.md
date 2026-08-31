# 1. Connect — Public repository and cyber hardening successor requirements v3 Producer QA

## 1.1 Identity and claim boundary

1.1.1 artifactId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-SUCCESSOR-REQUIREMENTS-V3-PRODUCER-QA-2026-08-30.

1.1.2 artifactClass=PRODUCER-SELF-QA;PLANNING-PACKAGE-INTEGRITY-ONLY;NOT-INDEPENDENT-REVIEW;NOT-IMPLEMENTATION;NOT-OPERATIONAL-EVIDENCE;NOT-ACCEPTANCE.

1.1.3 Subject=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-2026-08-30.md.

1.1.4 atomic manifest=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-atomic-package-manifest-2026-08-30.json;SHA-256=623f8a7bc4864d11be9eb398c9d2987388b030c991acccca312b1720cdf6f9c4;130 lines;5582 bytes.

1.1.5 packageContentRoot=9755380dc62dcc2149fe0aba8c6f885d7d875407a753e9d6c05b5f41f5b5e431.

1.1.6 coreContentRoot agreed by both readers=3c89fdee750784e12c1776728fb0551c2dfa9dc7b0a4efe94288d74d39c7af51.

1.1.7 this QA is deliberately outside the nine-member atomic manifest so the manifest does not authenticate itself or create a QA/manifest hash cycle. Its final physical hash is reported externally.

1.1.8 no Product code, build, runtime Test, Git, GitHub, provider, credential, Push, deploy or release mutation was performed.

## 1.2 Producer verdict

1.2.1 Producer QA result=PASS-PLANNING-PACKAGE-INTEGRITY.

1.2.2 Acceptance result=0. Producer QA cannot independently close a Finding, approve its own Subject or supply operational evidence.

1.2.3 repository visibility=PUBLIC;Gate29=BLOCKED;development freeze=ACTIVE.

# 2. Frozen input verification

| Input | Repository-relative path | SHA-256 | Claim class |
|---|---|---|---|
| v2 Subject | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md | 322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a | frozen predecessor |
| v2 independent review | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-independent-hostile-review-2026-08-30.md | 491217c85358d6e96744987000aceeb64fdfad3221a65e9a3d38a564942e475a | frozen review |
| v2 independent Findings | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-independent-hostile-review-findings-manifest-2026-08-30.md | f049b4b681d1c03bed1b4856a61a064383faa3b3bab58a2baca85bf546f81c16 | frozen Findings |
| predecessor report | docs/planning/public-repository-and-cyber-source-hostile-review-2026-08-29.md | af7bd90255fe0cb037d19ad8138609a3b35df50c33219470c845dec15919c6d5 | frozen predecessor review |
| predecessor Findings | docs/planning/public-repository-and-cyber-source-hostile-review-findings-manifest-2026-08-29.md | a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4 | frozen predecessor Findings |
| GitHub live readback v3 | docs/planning/github-public-hardening-live-readback-observation-v3-2026-08-30.md | 0dea5b462e4bff0d1866a585a585f7e0d0405609ad21ade4e8ecac1210e521cb | current bounded observation |
| Legacy quarantine v2 | docs/planning/legacy-analysis-publication-quarantine-observation-v2-2026-08-30.md | 00d8c970eb6f8a747d6353f309bc0c0109df6dd454582447325f123cf512df7c | current corrective observation |
| license observation | docs/planning/public-repository-license-strategy-observation-2026-08-30.md | d5d8267370435cba5fcaa481f3af8a8d60641e319dfc3237ce3abd7a834b3f96 | current bounded observation |
| Secret scan v2 | docs/planning/public-repository-secret-scan-observation-v2-2026-08-30.md | 3e8bb89858b660e8fe923643301c7225cafd622acdca6842a913a1f6d9bb9983 | current corrective observation |
| Secret scan v1 | docs/planning/public-repository-secret-scan-observation-v1-2026-08-30.md | 3ec83742da420a92d243b96cc0dae77112bb206fbe9f4d7a179a0f967d315755 | historical-only |

2.1 all ten physical roots matched the registry declarations during Producer QA.

2.2 Secret scan v1 cannot satisfy any current remote-history, worktree, index or Public-allowlist predicate.

2.3 B0, canonical Tal mandate, accepted Review Protocol, accepted Source Universe, accepted Control Sequence, Legal decision, D02, D25 and trusted-time authority are typed ABSENT. Their absence is intentionally blocking.

# 3. Atomic package verification

| Role | Member path | SHA-256 | Lines | Bytes |
|---|---|---|---:|---:|
| Subject | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-2026-08-30.md | a93bc7bde79f6427e69d70bd55280cd7fb7f3e3dc9bd30bb62e3be607dcf2c30 | 820 | 49169 |
| typed registries | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-typed-registries-2026-08-30.json | b6ac2d2cbb6e0048fba1a36f53be1fa0cc4e96d163c9385b6b90cae3558d4385 | 4391 | 126824 |
| producer/dependency graph | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-producer-dependency-graph-2026-08-30.json | 15ac5c3e515af79e3deedaa4dfb130632a9f0f874e93e2bee0132c33da7681e5 | 3247 | 91408 |
| operation/oracle/vector pack | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-operation-oracle-vector-pack-2026-08-30.json | 1f13d5641ca923ffa84ff5f8c84744ef50f397359373193fdf91ca9104e4048b | 1764 | 57078 |
| Finding closure registry | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-finding-closure-registry-2026-08-30.json | a19a2771f218883a9ab9ab0678e956dfefdb23970cfdac92fc247c6c87708f5f | 1395 | 68374 |
| reader A | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-a-2026-08-30.mjs | 04f0d38705dd6d6c98594ee1bef2dc2101626b6bcb2fb0b87269ff28dac0cbca | 170 | 10581 |
| reader B | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-b-2026-08-30.mjs | 31ca4f4724a88b3a5780a306136a3a5d224fa610f489564e1dc9a691f45e9901 | 184 | 10688 |
| reader A report | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-a-report-2026-08-30.json | 98158f708651c08c9ff68a246a20e69e22e8b0eafc83ed617b0b6825306c130b | 66 | 2507 |
| reader B report | docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-b-report-2026-08-30.json | 6161dade9d25e6cb0086b9ba1373b51a121e12f7620f8413c052bb06ffc2d856 | 66 | 2509 |
| total | nine members | packageContentRoot above | 12103 | 419138 |

3.1 every member physically matched path, SHA-256, line count and byte count.

3.2 packageContentRoot was independently recomputed from the ordered path, member SHA-256 and byte count tuples and matched the manifest.

3.3 all JSON members parsed successfully.

3.4 all Public locators use the docs/ prefix. Exact scans found zero workspace-prefix locators, host-absolute paths, parent traversal, URI locators, deterministic-ID randomness calls or secret-value patterns in package members.

# 4. Mechanical denominators

| Denominator | Result |
|---|---:|
| Requirements | 56/56 |
| typed output objects | 56/56 |
| unique sole producers | 56/56 |
| implemented producer roots | 0/56 |
| graph nodes | 187 |
| graph edges | 349 |
| declared graph cycles | 0 |
| admitted Findings | 59/59 |
| predecessor identities | 32/32 |
| new v2-review identities | 27/27 |
| unique noMergeKeys | 59/59 |
| closure records | 59/59 |
| negative vector bodies | 59/59 |
| operation kinds | 3 |
| oracle kinds | 3 |
| vector terminal matches per reader | 59/59 |
| merged records | 0 |
| range records | 0 |
| presence-only vector bodies | 0 |
| operational evidence roots | 0 |
| accepted Requirements | 0/56 |
| accepted Finding closures | 0/59 |

4.1 severity preservation=P0 31;P1 27;P2 1;P3 0.

4.2 every closure record contains one exact Finding identity, severity, noMergeKey, source-review root, explicit Requirement ID array, one vector ID, remediation, closure test, empty evidence-root array and accepted=false.

4.3 the previous 32-only ceiling is removed. The admitted denominator includes every current identity from both review roots.

# 5. Domain materialization

| Domain | Typed outputs |
|---|---|
| authority/schema/producer graph | PRCV3-REQ-000 through PRCV3-REQ-008 |
| repository root/ref/object/worktree/user changes | PRCV3-REQ-003,009,010,011 |
| generated output/build context/Legacy taint | PRCV3-REQ-012,013,014 |
| GitHub-only/Public surface and sensitive data | PRCV3-REQ-015,016 |
| Secrets | PRCV3-REQ-017,018 |
| license and every-byte provenance | PRCV3-REQ-019,020 |
| exact Public allowlist | PRCV3-REQ-021 |
| dependency/SBOM/executable supply chain | PRCV3-REQ-022,023 |
| Actions/workflow trust/taint/privilege/cache/runner | PRCV3-REQ-024 through PRCV3-REQ-029 |
| required checks/CODEOWNERS/bypass/Rulesets | PRCV3-REQ-030 through PRCV3-REQ-033 |
| GitHub control-plane and identities | PRCV3-REQ-034,035 |
| OIDC/environment/deploy | PRCV3-REQ-036,037,038 |
| reproducible build/release/attestation/SLSA | PRCV3-REQ-039 through PRCV3-REQ-042 |
| release rollback/vulnerability/cyber incident | PRCV3-REQ-043,044,045 |
| cyber sources and AI security | PRCV3-REQ-046,047 |
| readback/conformance/vectors/closure/review | PRCV3-REQ-048 through PRCV3-REQ-052 |
| Acceptance/Public Push/deploy-release permits | PRCV3-REQ-053,054,055 |

5.1 current observation states are explicit:5 heads;6 Pull Request refs;307 reachable Commits;15 merge-aware rows;6 open coordinates;unreachable object state UNKNOWN;external fork state UNKNOWN;GitHub-only surface state INCOMPLETE;current frozen worktree/index/allowlist snapshot ABSENT.

5.2 every missing, stale, conflicting, inaccessible or unknown state fails closed.

# 6. Independent stdlib reader verification

6.1 reader A uses regex shape checks, declared topological indices and direct mutation execution.

6.2 reader B uses index membership, Kahn DAG traversal and reducer-style mutation execution.

6.3 reader source roots are distinct;shared local modules=0;both use only Node standard-library modules.

6.4 both readers emitted errors=0,result=PASS-PLANNING-PACKAGE and identical coreContentRoot.

6.5 freshly rerun stdout matched each stored report byte-for-byte.

6.6 reader PASS proves package shape, graph integrity, exact Finding/vector mapping and planning-model terminal behavior only. It does not prove any control operated in GitHub, a provider, Product, deployment or release.

# 7. Current blocking disposition

7.1 implemented producers=0/56.

7.2 operational evidence roots=0.

7.3 independently accepted Requirements=0/56.

7.4 independently closed Findings=0/59.

7.5 fresh independent v3 hostile review=ABSENT.

7.6 Public Push Permit=ABSENT;deploy Permit=ABSENT;release Permit=ABSENT.

7.7 Subject Acceptance=0.

7.8 repository visibility=PUBLIC.

7.9 Gate29=BLOCKED.

7.10 development freeze=ACTIVE.

7.11 no visibility change is an allowed remediation, rollback or incident action.

