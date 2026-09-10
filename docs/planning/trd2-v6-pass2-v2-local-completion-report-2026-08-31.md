# 1. Connect — TRD-2 v6 Pass 2 v2 local completion report

## 1.1 Identity and boundary

1.1.1 `artifactId=CONNECT-TRD2-V6-PASS2-V2-LOCAL-COMPLETION-2026-08-31`.

1.1.2 Toolchain commits=`3ddb1cb;2a724cd;3a35101`; frozen observed
toolchain commit=`3a35101b3c56eb763d67ec5f30c86e6b67f71da7`; Candidate commit=
`b68b80e61f614c05d50093f5f9feec6d98e486d8`.

1.1.3 Repository=`PUBLIC`; development freeze=`ACTIVE`; Gate29=`BLOCKED`;
accepted Requirements=`0/128`; Finding closure=`0/15`; eligible external review
generations=`0/2`; Definition Acceptance=`ABSENT`.

1.1.4 This report records local Producer evidence only. It is not an independent
review, Finding closure, Acceptance, deployment permission or permission to resume
product development.

# 2. Rejected predecessor boundary

2.1 Pass 2 v1 remains byte-preserved and
`REJECTED-SUPERSEDED-NOT-REUSABLE`.

2.2 Its Registry root=
`0d71281e231c525c6defd79059ec31da630cf4a851e41876331735982ef0ce1e`
and its `318/318` circular outcome agreement receive no Pass 3 input credit.

2.3 Pass 2 v2 wrote only the three successor paths predeclared by Output Path
Registry v2. No v1 byte, root or historical disposition was overwritten.

# 3. Actual-positive inventory

3.1 Closed Schema Registry v2 root=
`aa9ac9f3a6a697a13eb6fe3a236c7c7088adb5fbe63313c74a4c386d4b6ecf19`;
raw SHA-256=
`93ff5dd11fc6c048ff444f8b9fc2a74186a490fff11cb67e37225d487b604f6a`;
physical size=`1891098 bytes`.

3.2 Exact schema-family denominator=`25`; schemas with no actual Positive=`0`.

3.3 Exact actual-positive denominator=`391`: all six immutable Pass 1 artifacts,
their declared recurring nested records and `128` Requirement records plus `128`
separate source-binding records.

3.4 Every Requirement content object contains exactly the five ordered fields
`statement`, `defectCauseImpact`, `proofPredicate`, `dependencies`, `sourceBasis`.
Identity and source locators remain outside that five-field content object.

3.5 Actual-positive inventory root=
`0c71d437d10d9981ce025355fa4d48739f6d50aac41c428b7fd1f87664ebee0e`.

# 4. Recursive closed-schema and mutation evidence

4.1 DSL kinds=`14`: `Array`, `Boolean`, `Bytes32LowerHex`, `CommitHex`,
`Const`, `ContentId`, `Enum`, `LogicalPath`, `Null`, `Nullable`, `Object`,
`OneOf`, `String`, `UIntSafe`.

4.2 Every Object is recursively closed with
`additionalProperties=false`; unknown nested fields are rejected.

4.3 Exact hostile mutation denominator=`124`; every mutation blocked at its
declared terminal. Total fixture denominator=`515=391 actual+124 mutation`.

4.4 Fixture collection root=
`61574aaff485e8dad3444adb206509808f5f92e93f16e347dee22d7b7a5e195f`.

# 5. Independent implementation agreement

5.1 Engine A=`Node.js independent recursive validator`; report root=
`6b6958cf6c4ab66c8b93b3f0d484c6a882bb0230e88e93318827c2e4d97ca5f5`;
source SHA-256=
`696c7dfd81d0c79dffe29e0bf7bfe53fdd2d7d93c7908111cd4ba68805fbc63b`.

5.2 Engine B=`Python independent recursive validator`; report root=
`1290afc2e41f5b49885f63d027294a89b4d488ebd163f9c2cdc654127160b80a`;
source SHA-256=
`b94e9d6d199b8ffce7cc8b5a8626b9bd44628c8c61201b898fa059dc2442fcd9`.

5.3 Agreement=`515/515`; mismatch=`0`; common outcome root=
`47aa5446ab7f654d9b20dd9c1a5aa8390949c91c7ceddbcd386477f36b883294`.

# 6. Pre-commit self-review repair

6.1 The first uncommitted generation passed both engines but Producer self-review
found that the final verifier bound each locator to a source-file digest without
independently resolving the indicated JSON Pointer or Markdown requirement span.

6.2 That generation was rejected before commit, removed from the worktree and
regenerated from a corrected frozen toolchain. Its preliminary roots receive no
credit and are not package members.

6.3 The corrected verifier independently resolves the complete JSON-pointer set,
reconstructs all `256` Requirement/Binding values from exact Markdown byte spans,
checks the exact per-family denominators and compares its own runtime bytes plus
both shared cores to the frozen toolchain.

# 7. Verification and next state

7.1 Full verification=`3960/3960 tests`; TypeScript=`PASS`; ESLint=`0 errors`
with `28` historical warnings; Source guardrails=`PASS`; Secret hygiene including
Git history=`PASS`.

7.2 Post-commit Pass 2 v2 verifier=`PASS`; worktree mode=`COMMITTED-CLEAN`;
local HEAD and remote branch both=
`b68b80e61f614c05d50093f5f9feec6d98e486d8`.

7.3 Local self-review remediation=`5/5`; missing/extra actual-positive denominator=
`0`; Pass 3 may now start as a local Candidate only.

7.4 Next=`Pass 3 — compile 128 Requirement clause ASTs, construct the seven
required state-machine families and prove total admitted state/event/terminal
coverage`. No external closure or Acceptance is implied.
