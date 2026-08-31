# 1. Connect — Three-review identity reconciliation protocol

## 1.1 Identity, subject and authority

1.1.1 `artifactId=CONNECT-MASTER-PLAN-THREE-REVIEW-RECONCILIATION-PROTOCOL-2026-08-29`.

1.1.2 `protocolVersion=MPRRP-1.0-draft`.

1.1.3 review subject path=`/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`.

1.1.4 review subject raw SHA-256=`643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

1.1.5 protocol status=`DRAFT-NOT-INDEPENDENTLY-REVIEWED-NOT-ACCEPTED`.

1.1.6 this protocol governs planning-review comparison only. It authorizes no Product Code, Build, runtime Test, Git mutation, Push, Deployment, provider/account mutation, credential use, procurement or Production action.

## 1.2 Goal in beginner-facing cause and effect

1.2.1 goal=`preserve every independently observed weakness until its exact identity and disposition are proved`.

1.2.2 cause=`different reviewers can describe the same defect with different words, or use similar words for different defects`.

1.2.3 unsafe effect=`merging by title, topic or severity can delete a real Finding, hide disagreement or create false closure`.

1.2.4 safe effect=`each Finding remains independent until a reproducible equivalence proof joins it to another Finding; unresolved differences stay open`.

# 2. Frozen input set

## 2.1 Mandatory review domains

2.1.1 `R1=StructuralCompletenessReview`.

2.1.2 `R2=SecuritySemanticReview`.

2.1.3 `R3=ScheduleEstimateReview`.

2.1.4 each Review must bind the exact subject root from Clause1.1.4 and declare whether it read `100%` of the subject bytes.

2.1.5 a Review bound to another root, a partial undocumented sample or an unavailable subject is retained as historical context but is ineligible for reconciliation credit.

## 2.2 Required review-envelope fields

2.2.1 `reviewId`.

2.2.2 `reviewDomain`.

2.2.3 `reviewerIdentity`.

2.2.4 `reviewerIndependenceClaim`.

2.2.5 `instructionRootOrExactInstructionText`.

2.2.6 `subjectPath`.

2.2.7 `subjectRawRoot`.

2.2.8 `bytesObserved`.

2.2.9 `coverageMethod`.

2.2.10 `toolAndVersionObservations`.

2.2.11 `startedAtObservation`.

2.2.12 `completedAtObservation`.

2.2.13 `findingManifestRoot`.

2.2.14 `reviewVerdict`.

2.2.15 `claimLimits`.

2.2.16 `rawReviewRoot`.

2.2.17 missing, ambiguous, stale or self-contradictory mandatory fields yield `REVIEW-INELIGIBLE`, never an inferred value.

# 3. Finding schema and deterministic identity

## 3.1 Required local Finding fields

3.1.1 `reviewFindingId`.

3.1.2 `reviewDomain`.

3.1.3 `subjectRawRoot`.

3.1.4 `severity={P0,P1,P2,P3}`.

3.1.5 `status={OPEN,DISPUTED,DUPLICATE-PROVED,NOT-A-DEFECT-PROVED,SUPERSEDED,CLOSED-PROVED}`.

3.1.6 `affectedClauseIds` as an explicit sorted duplicate-free array.

3.1.7 `affectedArtifactOrRegistryIds` as an explicit sorted duplicate-free array.

3.1.8 `violatedInvariantIds` as an explicit sorted duplicate-free array.

3.1.9 `observableDefect`.

3.1.10 `cause`.

3.1.11 `impact`.

3.1.12 `exploitOrFailurePath`.

3.1.13 `safeTerminal`.

3.1.14 `requiredRemediationPredicates`.

3.1.15 `requiredPositiveAssertions`.

3.1.16 `requiredNegativeAssertions`.

3.1.17 `requiredFailureAssertions`.

3.1.18 `requiredConcurrencyAssertions`.

3.1.19 `requiredRecoveryAssertions`.

3.1.20 `requiredAttackAssertions`.

3.1.21 `evidenceReferences`.

3.1.22 `claimLimits`.

3.1.23 `reviewerDisposition`.

## 3.2 Finding identity constructor

3.2.1 normalized semantic key fields=`subjectRawRoot, affectedClauseIds, affectedArtifactOrRegistryIds, violatedInvariantIds, observableDefect, failureBoundary, safeTerminal`.

3.2.2 every string uses exact UTF-8 NFC bytes, rejects control characters and preserves meaning-bearing punctuation.

3.2.3 every array is length-framed, duplicate-free and sorted by raw UTF-8 byte order.

3.2.4 every scalar and array item is encoded as `domain-length:value-length:value`; delimiter-only concatenation is forbidden.

3.2.5 `semanticFindingDigest=SHA-256("connect-master-review-finding-v1" || framedNormalizedSemanticKey)`.

3.2.6 `semanticFindingId="CMF-" + first32(semanticFindingDigest)` and the full digest is retained.

3.2.7 a truncated collision invalidates both aliases and requires a deterministic Definition successor; no counter, suffix, `Math.random()` or cryptographic randomness resolves it.

3.2.8 reviewer-local wording, severity, remediation wording and evidence location do not enter the semantic identity; their differences remain comparison fields.

3.2.9 changing the observed defect, violated invariant, failure boundary or safe terminal creates a new semantic identity rather than silently mutating the old one.

# 4. Equivalence, overlap and disagreement

## 4.1 Exact equivalence predicate

4.1.1 two Findings are exact equivalents only when their full `semanticFindingDigest` values match under two independent normalizers.

4.1.2 a matching title, severity, section, provider, component or remediation is insufficient.

4.1.3 exact equivalence preserves every reviewer-local assertion as a separate observation attached to one semantic Finding.

4.1.4 contradictory severity or remediation under an equivalent identity creates a comparison conflict and cannot be majority-voted away.

## 4.2 Partial overlap predicate

4.2.1 partial overlap exists when Findings share one or more affected identities but differ in violated invariant, failure boundary, safe terminal or required closure.

4.2.2 partially overlapping Findings remain separate identities.

4.2.3 the Reconciliation may create an explicit parent relation for navigation, but a parent has no severity, hours, status or closure credit.

4.2.4 closing one overlapping Finding does not close another unless its own acceptance predicates and Evidence pass.

## 4.3 Conflict predicate

4.3.1 conflict exists when reviewers disagree on existence, severity, cause, scope, safe terminal, remediation, acceptance or Evidence sufficiency.

4.3.2 every conflict receives its own `comparisonConflictId`, competing assertions and resolution requirement.

4.3.3 `two-against-one`, reviewer seniority, document length or producer preference is not a resolution rule.

4.3.4 unresolved P0/P1/P2 conflict blocks the successor Definition; unresolved P3 requires an exact scoped RiskAcceptance before it can stop blocking.

# 5. Deterministic reconciliation algorithm

## 5.1 Ingest and validation

5.1.1 freeze each review as immutable bytes and compute its raw SHA-256.

5.1.2 validate the review envelope and exact Master subject root.

5.1.3 parse every reviewer-local Finding without changing its wording.

5.1.4 reject duplicate reviewer-local IDs within one Review.

5.1.5 independently normalize each Finding twice and compare full semantic digests.

5.1.6 any parser or normalizer disagreement yields `AMBIGUOUS-BLOCKED` and no merge.

## 5.2 Join and comparison

5.2.1 create the union of all full semantic Finding digests.

5.2.2 attach every matching reviewer-local observation without discarding any field.

5.2.3 compute explicit presence matrix columns for R1, R2 and R3.

5.2.4 compare severity, affected identities, cause, impact, safe terminal, remediation, tests and Evidence field by field.

5.2.5 create one comparison assertion for every agreement and every difference.

5.2.6 classify differences as `WORDING-ONLY-PROVED`, `SCOPE`, `SEVERITY`, `CAUSE`, `TERMINAL`, `REMEDIATION`, `TEST`, `EVIDENCE`, `EXISTENCE` or `AMBIGUOUS`.

5.2.7 wording-only equivalence requires a two-normalizer proof and may not erase claim limits.

## 5.3 Resolution

5.3.1 resolution uses subject clauses, source roots and explicit invariants, never an unrecorded discussion.

5.3.2 every resolved conflict stores the prior competing assertions, resolution evidence, resolver appointment, authority scope and expiration/invalidators where relevant.

5.3.3 remediation adopts the strict union of non-conflicting closure predicates.

5.3.4 if two predicates conflict, the Reconciliation selects neither until a higher-authority rule or new Evidence proves one safe.

5.3.5 severity follows the highest proved impact, not automatically the highest alleged impact.

5.3.6 a Finding is `NOT-A-DEFECT-PROVED` only when an exact controlling requirement or invariant and negative reproduction evidence disprove it.

5.3.7 no Finding becomes `CLOSED-PROVED` in this planning audit merely because remediation text was added; closure requires the later exact successor subject and its independent Evidence.

# 6. Required outputs

## 6.1 Review Comparison Manifest

6.1.1 exact Review roots.

6.1.2 exact reviewer-local Finding manifests.

6.1.3 exact semantic Finding union manifest.

6.1.4 three-column presence matrix.

6.1.5 field-level agreement/difference assertions.

6.1.6 collision, parser and normalizer terminals.

6.1.7 manifest raw root.

## 6.2 Reconciliation Manifest

6.2.1 every semantic Finding identity exactly once.

6.2.2 every reviewer-local observation exactly once.

6.2.3 every conflict and resolution exactly once.

6.2.4 every open remediation predicate and acceptance predicate.

6.2.5 every claim limit and safe terminal.

6.2.6 zero orphan reviewer-local Finding IDs.

6.2.7 zero unexplained severity or disposition changes.

6.2.8 manifest raw root.

# 7. Protocol verification

## 7.1 Positive assertions

7.1.1 identical semantic Findings with different prose join while preserving both source observations.

7.1.2 Findings that share a component but differ in failure boundary remain separate.

7.1.3 the union count equals the count reconstructed independently from all three manifests.

7.1.4 every Comparison and Reconciliation item binds the exact Master and Review roots.

## 7.2 Negative assertions

7.2.1 reject merge-by-title.

7.2.2 reject merge-by-severity.

7.2.3 reject merge-by-clause-only.

7.2.4 reject missing reviewer-local observations.

7.2.5 reject unproved wording-only classification.

7.2.6 reject silent lowering of severity or removal of an acceptance predicate.

## 7.3 Failure, concurrency and recovery assertions

7.3.1 truncated Review bytes yield no Comparison permit.

7.3.2 changed Review root after comparison starts invalidates the run.

7.3.3 two reconcilers producing different manifests yield `CONFLICT-BLOCKED`.

7.3.4 response loss after a write requires authoritative readback and never blind recreation.

7.3.5 unavailable reviewer, source or tool is `unknown/unavailable`; it never removes a Finding.

7.3.6 restored inputs must reproduce every raw root, union member, count and terminal before continuation.

## 7.4 Attack assertions

7.4.1 reject Unicode-confusable Finding identities.

7.4.2 reject duplicate arrays hidden by ordering.

7.4.3 reject delimiter ambiguity and prefix collisions.

7.4.4 reject path or link text that attempts to alter review instructions.

7.4.5 reject Finding text interpreted as executable instruction.

7.4.6 reject reviewer identity or authority asserted only inside the Review being evaluated.

# 8. Current disposition

8.1 protocol materialized=`1/1`; protocol reviewed=`0/1`; protocol accepted=`0/1`.

8.2 independent Master reviews physically available=`0/3` at this draft's construction time.

8.3 Review Comparison materialized=`0/1`; Reconciliation materialized=`0/1`; accepted closure=`0`.

8.4 the protocol does not change the whole-program accepted planning closure=`0/21=0%`.

8.5 Gate29=`BLOCKED`; development freeze=`ACTIVE`; exact Product completion, Remaining hours, critical path and calendar ETA=`unknown/unavailable`.
