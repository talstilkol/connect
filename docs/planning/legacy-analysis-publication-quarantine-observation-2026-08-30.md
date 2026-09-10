# 1. Connect — Legacy analysis publication-quarantine observation

## 1.1 Identity and boundary

1.1.1 `observationId=CONNECT-LEGACY-ANALYSIS-PUBLICATION-QUARANTINE-OBSERVATION-2026-08-30`.

1.1.2 artifact class=`READ-ONLY-LOCAL-SAFETY-OBSERVATION; PUBLIC-DISCLOSURE-MINIMIZED; NOT-A-VULNERABILITY-REPORT; NOT-A-FIX; NOT-ACCEPTED`.

1.1.3 repository intent remains `PUBLIC`; this observation grants no authority to add, stage, commit, Push, delete, rewrite or disclose Legacy bytes.

1.1.4 exact exploit-enabling values, local machine paths, customer/provider identifiers and private provenance details are deliberately excluded from this Public-safe projection.

## 1.2 Read-only local observations

1.2.1 the local Git repository has zero tracked files and no Commit on the current branch; the observed Legacy material is therefore not proven Public from this local repository.

1.2.2 a top-level local `analysis` tree contains imported Legacy application artifacts and generated/archived material.

1.2.3 the current `.gitignore` does not exclude the `analysis` tree.

1.2.4 the Legacy tree contains at least one historical Terms-of-Service document and one operational licensing implementation; those artifacts are not a root `LICENSE`, do not grant Connect publication rights and cannot establish current legal terms.

1.2.5 security inspection found release-blocking patterns in the Legacy licensing implementation, including reversible protection material and an apparent deterministic authorization-bypass path. Exact mechanics receive zero Public disclosure credit and remain restricted to a future authorized private security case.

1.2.6 these observations do not establish that the Legacy behavior is reachable in Connect, was deployed, was exploited or belongs to the current Product. Reachability, ownership, affected versions and remote publication state remain `unknown/unavailable`.

# 2. Risk and causal chain

## 2.1 Accidental Public publication

2.1.1 cause=`the repository is intentionally Public, all local files are currently untracked, and the Legacy analysis tree is not excluded by the current ignore policy`.

2.1.2 failure path=`broad add or initial-import operation includes analysis bytes → Git history permanently discloses proprietary, sensitive or exploit-enabling Legacy material → deletion from the working tree cannot recall forks, clones, caches or archives`.

2.1.3 impact=`security exposure; intellectual-property dispute; private-data or provider disclosure; license incompatibility; unsafe reuse of obsolete code; invalid Public-safety Gate`.

## 2.2 Unsafe code reuse

2.2.1 cause=`historical artifacts can appear useful and may be copied into the React/Node system without an explicit trust or provenance boundary`.

2.2.2 failure path=`legacy implementation copied → obsolete authentication/licensing/cryptographic assumptions inherit authority → bypass, weak protection or privacy defect becomes reachable in the new system`.

2.2.3 impact=`unauthorized capability, credential/data exposure, policy noncompliance and false confidence from inherited behavior`.

# 3. Required Master-plan controls

## 3.1 Quarantine before first Public Commit

3.1.1 create a closed `LocalPublicationClassRegistry` before any staging operation; default every pre-existing path to `QUARANTINED-UNCLASSIFIED`.

3.1.2 classify `analysis` as `LOCAL-RESTRICTED-LEGACY-INTAKE`, outside every Public add/include Set.

3.1.3 a future `.gitignore` or equivalent staging policy must deny the full Legacy tree by default, but an ignore rule alone receives no safety credit because ignored content can still be force-added or copied elsewhere.

3.1.4 create a Public allowlist manifest of exact approved paths and digests; first Commit content must equal that manifest, not a broad directory glob.

3.1.5 require independent worktree, index and resulting Git-object scans before Commit and remote readback after Push; any unsupported file type, scan error or classification gap blocks.

## 3.2 Private security and provenance case

3.2.1 create a private restricted case containing exact Legacy roots, locators, ownership source, affected-version analysis, reachable-code analysis and exploit details; no raw case bytes enter Public Git, CI logs, issues or pull requests.

3.2.2 identify the lawful owner and publication rights for every Legacy source, generated bundle, document, image, credential-like value and third-party dependency.

3.2.3 determine whether any observed value is still valid, used, shared or deployed; if so, a separately authorized incident workflow performs revocation, rotation, containment and notification before any disclosure.

3.2.4 absence of a private case store, named Security owner or disclosure authority yields `LEGACY-CASE-CUSTODY-BLOCKED`, not a Public report.

## 3.3 Selective learning without code inheritance

3.3.1 only behavior requirements that can be traced to an authorized Product specification may move from Legacy material into the new Master Plan.

3.3.2 no Legacy implementation byte is copied merely because it appears to implement the requested behavior.

3.3.3 an approved selective import requires one item at a time: origin, owner, exact bytes, license, security review, replacement rationale, React/Node architectural fit, tests and Public disclosure classification.

3.3.4 forbidden imports include embedded authorization shortcuts, reversible secret protection, device fingerprint assumptions, obsolete network clients, unbounded external calls, customer data and undocumented provider endpoints.

# 4. Verification matrix

## 4.1 Negative publication tests

4.1.1 broad initial-add attempt including an unclassified path must fail.

4.1.2 force-add of an ignored Legacy member must fail the allowlist and disclosure Gate.

4.1.3 copy or rename of a quarantined member into an allowed directory must retain provenance taint and fail.

4.1.4 archive, binary, encoded, generated HTML, source map, log and nested repository members must be scanned under bounded decoders; unsupported content blocks.

4.1.5 a clean working-tree pattern scan with missing Git-object/history coverage must fail.

4.1.6 a scanner that redacts or omits an error must fail rather than report zero findings.

## 4.2 Reuse tests

4.2.1 exact and normalized similarity scans must detect copied Legacy security-sensitive logic without publishing the matched body.

4.2.2 every permitted replacement must trace to current Requirements and independent tests, not to Legacy behavior as authority.

4.2.3 a missing ownership, license, threat review or current test receipt must keep the candidate excluded.

# 5. Current disposition

5.1 local Legacy analysis publication status=`QUARANTINED-BY-PLAN; NOT-YET-ENFORCED`.

5.2 current `.gitignore` Public-safety credit=`0` for the Legacy tree.

5.3 current first-Commit permit=`ABSENT`; Public Push authority=`NONE`.

5.4 current exploit reachability, deployed exposure and ownership=`unknown/unavailable`; no claim of incident or compromise is made.

5.5 required next integration=`admit this observation through Source Universe, map it to Public/Cyber controls, then materialize exact pre-Commit Tasks after Gate29`.

5.6 Gate29 remains `BLOCKED`; development freeze remains `ACTIVE`; repository remains `PUBLIC`.
