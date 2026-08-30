# 1. Connect — Legacy analysis publication-quarantine observation v2

## 1.1 Corrective identity

1.1.1 `observationId=CONNECT-LEGACY-ANALYSIS-PUBLICATION-QUARANTINE-OBSERVATION-V2-2026-08-30`.

1.1.2 corrected predecessor raw SHA-256=`b34eee801cf489984f52f951177aa65bd8d0e9c56f2202139337c3c38de6071f`.

1.1.3 correction reason=`the predecessor observed the outer empty Git directory before the nested canonical product repository was identified; its direct-staging and first-Commit risk description is therefore too broad`.

1.1.4 artifact class=`READ-ONLY-LOCAL-SAFETY-CORRECTION; PUBLIC-DISCLOSURE-MINIMIZED; NOT-A-VULNERABILITY-REPORT; NOT-A-FIX; NOT-ACCEPTED`.

1.1.5 repository visibility remains binding `PUBLIC`; this correction grants no authority to add, stage, commit, Push, delete, rewrite, copy or disclose Legacy bytes.

1.1.6 exact exploit-enabling values, local workstation paths, customer/provider identifiers and private provenance details remain excluded.

# 2. Correct repository topology

## 2.1 Outer workspace Git directory

2.1.1 logical identity=`OUTER-WORKSPACE-GIT`.

2.1.2 observed state=`branch master;0 tracked files;0 Commits;no remote`.

2.1.3 this outer Git directory is not the canonical Connect product repository and has no Push authority.

2.1.4 its ignore rules do not prove or control what the nested product repository can publish.

## 2.2 Canonical product repository

2.2.1 logical identity=`PRODUCT-REPO`; repository-relative root=`web/`.

2.2.2 observed state=`nested Git repository;remote talstilkol/connect;visibility Public;local branch codex/cloudflare-evidence-builders;existing local and remote history`.

2.2.3 live GitHub UI displayed 64 Commits during the separate current readback. Therefore the predecessor phrase `before first Public Commit` is invalid for the canonical product repository.

2.2.4 the current product worktree is materially dirty and must be classified separately; this observation gives no safety or ownership conclusion for those entries.

## 2.3 Legacy sibling tree

2.3.1 logical identity=`LEGACY-ANALYSIS-SIBLING`; workspace-relative root=`analysis/`.

2.3.2 `analysis/` is a sibling of `web/`, not a descendant of the canonical product Git worktree.

2.3.3 consequence=`a normal Git add operation executed inside PRODUCT-REPO cannot directly stage the sibling analysis/ path`.

2.3.4 corrected direct-staging risk=`NOT-REACHABLE-BY-NORMAL-PRODUCT-REPO-PATH-ADMISSION`.

2.3.5 this does not prove that identical or derived Legacy bytes are absent from existing Product history, current Product files, generated artifacts, archives, workflow outputs, package contexts or remote copies.

# 3. Preserved Legacy observations and claim limits

## 3.1 Disclosure-minimized observations

3.1.1 the Legacy sibling contains imported application artifacts and generated/archived material.

3.1.2 it contains at least one historical Terms-of-Service document and one operational licensing implementation.

3.1.3 those bytes are not a Connect root license, do not grant Connect publication rights and do not establish current Product terms.

3.1.4 bounded inspection found release-blocking patterns in the Legacy licensing implementation, including reversible protection material and an apparent deterministic authorization-bypass path.

3.1.5 exact mechanics remain restricted to a future authorized private security case and receive zero Public disclosure credit.

3.1.6 current Product reachability, affected versions, deployment, exploitation, ownership and remote-copy state remain `unknown/unavailable`.

## 3.2 What v2 invalidates from v1

3.2.1 invalidated claim=`the canonical product repository has zero tracked files and no Commit`.

3.2.2 invalidated claim=`the Legacy sibling can be captured directly by a broad add from the canonical product repository`.

3.2.3 invalidated framing=`first Public Commit`; corrected framing=`existing Public history plus every future Public changeset`.

3.2.4 invalidated control dependency=`an ignore entry alone is required to stop direct Product-repository staging of the sibling`; path topology already blocks that direct action.

3.2.5 preserved risk=`explicit copy/import, generator/build-context inclusion, archive/package inclusion, history duplication, future outer-repository publication and unsafe semantic reuse`.

# 4. Corrected causal risk model

## 4.1 Explicit copy or import

4.1.1 cause=`a human, script, generator or migration copies Legacy bytes from analysis/ into web/ or a publishable artifact`.

4.1.2 path=`copy/import → new Product-path byte loses visible sibling boundary → review treats it as ordinary Product content → Public Commit, CI artifact, package or deployment exposes it`.

4.1.3 controls=`provenance-taint ledger; content/normalized-similarity detection; exact Public allowlist; one-item import review; ownership/license/security/current-requirement proof`.

## 4.2 Build and packaging context

4.2.1 cause=`a future command selects the outer workspace or parent directory as build, upload, archive, container or deployment context`.

4.2.2 path=`over-broad context → sibling bytes enter artifact or log without entering Product Git → artifact is uploaded, retained or made Public`.

4.2.3 controls=`every future build/deploy Task binds exact PRODUCT-REPO context and explicit include manifest; parent/sibling context mutation must fail`.

## 4.3 Existing-history duplication

4.3.1 cause=`Legacy bytes may already have been copied under a different name or representation before this observation`.

4.3.2 path=`current tree scan appears clean → reachable Git objects, old Branch, Pull Request, Release or artifact retains the bytes → Public exposure persists`.

4.3.3 controls=`content-addressed and normalized history scan; supported decoder inventory; GitHub surface inventory; private triage of any match; no claim of recall after disclosure`.

## 4.4 Unsafe semantic reuse

4.4.1 cause=`a developer learns from Legacy behavior and recreates obsolete authorization or protection logic without copying identical bytes`.

4.4.2 path=`behavior-level inheritance evades byte matching → weak authorization/licensing assumption becomes reachable in the React/Node system`.

4.4.3 controls=`requirements derive only from authorized current specifications; security-sensitive design receives fresh threat model, independent review and tests; Legacy behavior is never authority`.

## 4.5 Future outer-repository mutation

4.5.1 cause=`a remote is later attached to OUTER-WORKSPACE-GIT or the outer repository is selected as a publication target`.

4.5.2 path=`previously local sibling becomes directly stageable in that different repository → accidental publication`.

4.5.3 controls=`RepoAuthorityRegistry admits only PRODUCT-REPO; wrong-root guard blocks OUTER-WORKSPACE-GIT; any future change requires a new exact repository Decision`.

# 5. Required Master-plan controls

## 5.1 Immediate planning controls

5.1.1 classify `analysis/` as `LOCAL-RESTRICTED-LEGACY-INTAKE` in the workspace Source/Publication registry.

5.1.2 exclude the Legacy sibling from every admitted Product SourceSet, build context, upload context, archive, backup class and Public allowlist unless one exact item passes selective-import review.

5.1.3 bind the canonical Git target to `PRODUCT-REPO=web/`; any command resolved from OUTER-WORKSPACE-GIT or another root returns `BLOCKED-WRONG-REPOSITORY`.

5.1.4 create a private restricted case for exact Legacy roots, ownership, reachability and exploit detail only after a private case store, named owner and authority exist.

5.1.5 keep all exact exploit values out of Public Git, Issues, Pull Requests, CI logs, artifacts, Master-plan text and chat summaries.

## 5.2 Existing Public history audit

5.2.1 enumerate all reachable Product Git objects, refs, Tags and locally available remote-tracking refs from a fresh authorized remote readback.

5.2.2 compare exact and normalized Legacy fingerprints against Product history without emitting matched sensitive bodies into Public evidence.

5.2.3 enumerate GitHub Pull Requests, Issues, comments, Actions logs/artifacts/caches, Releases, packages and deployments under the Public/Cyber surface contract.

5.2.4 any match enters a private incident/provenance case; absence is credited only for the exact scanned denominator, algorithms and decoder coverage.

## 5.3 Future Public changeset gate

5.3.1 every proposed changeset equals a content-addressed Public allowlist; broad globs or the outer workspace are forbidden.

5.3.2 worktree, index and resulting Git-object scans must agree before Commit; remote readback follows only a separately authorized exact Push.

5.3.3 a copied/renamed/reformatted/generated Legacy member retains provenance taint and blocks until one-item review closes.

5.3.4 scanner failure, unsupported archive/binary, decoder disagreement or missing history coverage returns `PUBLIC-HARDENING-BLOCKED`.

# 6. Required negative tests

6.1 normal Product-repository staging cannot address `../analysis` as a Product path.

6.2 a copy from the Legacy sibling into an allowed Product directory retains taint and is rejected.

6.3 an outer-workspace archive/build context containing the sibling is rejected.

6.4 an identical byte copy, renamed file, normalized source copy and encoded/archive copy are detected without Public body disclosure.

6.5 a behavioral recreation of the known weak authorization pattern is rejected by independent authorization tests even when byte similarity is zero.

6.6 a clean current worktree with an unscanned reachable historical object does not pass.

6.7 a scanner error or unsupported file does not become a zero-finding result.

6.8 a future Git command targeting OUTER-WORKSPACE-GIT is rejected before staging or network access.

# 7. Current disposition

7.1 direct normal-Git staging path from PRODUCT-REPO to LEGACY-ANALYSIS-SIBLING=`BLOCKED-BY-REPOSITORY-TOPOLOGY`.

7.2 Legacy publication/reuse status=`LOCAL-RESTRICTED;QUARANTINED-BY-PLAN;NOT-YET-PROVEN-ACROSS-HISTORY-OR-BUILD-CONTEXTS`.

7.3 existing Product Public-history Legacy-match count=`unknown/unavailable`; no complete scan receipt exists.

7.4 private security/provenance case=`ABSENT`.

7.5 current Product exact-diff Public Push Permit=`ABSENT`; Git/GitHub mutation authority=`NONE`.

7.6 v1 publication-risk framing is superseded only where enumerated in 3.2; disclosure-minimized Legacy security observations remain unresolved.

7.7 Gate29 remains `BLOCKED`; development freeze remains `ACTIVE`; repository remains `PUBLIC`.
