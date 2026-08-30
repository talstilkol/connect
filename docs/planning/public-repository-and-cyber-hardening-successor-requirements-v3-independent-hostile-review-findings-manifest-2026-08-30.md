# 1. Connect — Public Repository and Cyber Hardening v3 independent hostile-review Findings Manifest

## 1.1 Identity and exact denominator

1.1.1 artifactId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-V3-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30.

1.1.2 artifactClass=DETACHED-NON-MERGED-INDEPENDENT-FINDINGS-MANIFEST;PLANNING-ONLY;NOT-AUTHORITY;NOT-IMPLEMENTATION;NOT-OPERATIONAL-EVIDENCE;NOT-ACCEPTANCE;NOT-CLOSURE.

1.1.3 frozen Subject=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-2026-08-30.md;SHA-256=a93bc7bde79f6427e69d70bd55280cd7fb7f3e3dc9bd30bb62e3be607dcf2c30;820 lines;49169 bytes.

1.1.4 frozen atomic manifest=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-atomic-package-manifest-2026-08-30.json;SHA-256=623f8a7bc4864d11be9eb398c9d2987388b030c991acccca312b1720cdf6f9c4.

1.1.5 companion review=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-independent-hostile-review-2026-08-30.md.

1.1.6 frozen new-Finding denominator=34 distinct records.

1.1.7 severity totals=P0 23;P1 11;P2 0;P3 0.

1.1.8 state totals=OPEN 34/34;CLOSED 0/34;ACCEPTED 0/34;MERGED 0;SUPPRESSED 0.

1.1.9 every record has one exact Finding identity, severity, evidence, impact, remediation, closureTest and noMergeKey. No record, range, control or evidence can implicitly close another.

1.1.10 all 59 inherited closure records remain independently unaccepted. This Manifest adds no implementation or closure credit.

1.1.11 PUBLIC remains binding;Acceptance=0;Public Push Permit=ABSENT;deploy Permit=ABSENT;release Permit=ABSENT;Gate29=BLOCKED;development freeze=ACTIVE.

## 1.2 Severity semantics

| Severity | Meaning |
|---|---|
| P0 | the planned model can permit false schema, closure, Public Push, privileged mutation, deploy, release or acceptance credit, or omits a foundational causal predicate |
| P1 | a material assurance, privacy, provenance, governance, resilience or operability requirement remains underdefined and must close before acceptance |
| P2 | important precision defect without a demonstrated acceptance-bypass path |
| P3 | advisory improvement only |

# 2. Detached Findings

## 2.1 PRCV3-IHR-F001 — one docs-only locator grammar cannot represent Product or Git paths and readers trust CWD

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Subject §§1.1.4-1.1.5 say every Public locator begins with `docs/`;typed registry `publicLocatorPolicy.requiredPrefix=docs/`;PRCV3-REQ-021 must represent arbitrary changeset paths;both readers join locators to `process.cwd()` without proving repository identity.
- impact=application source, `.github` policy, root manifests, lockfiles and infrastructure are either unrepresentable or accepted by violating the declared grammar;running a reader from a different directory or symlinked tree can validate the wrong bytes.
- remediation=define separate closed grammars for planning-package paths, repository-content paths, private Evidence locators and external resources;bind the logical repository to immutable host/repository node identity and an independently verified filesystem root before reads.
- closureTest=valid non-doc repository paths and dotfiles are representable;absolute, parent, NUL, backslash-alias, Unicode/case-alias, symlink escape and wrong-CWD cases deny;both readers resolve the same immutable repository identity.
- noMergeKey=PRCV3-LOCATOR-DOMAIN-AND-ROOT-CONFLATION.

## 2.2 PRCV3-IHR-F002 — the declared schemas reject the package's own instances

- severity=P0;state=OPEN;closureCredit=0.
- evidence=`schemaDefinitions.RegistryObject` requires `subjectRoot` and forbids additional properties, while all 56 registry objects omit `subjectRoot` and add `type`,`requiredFields`,`acceptanceCredit`;FindingClosure and NegativeVector instances likewise add undeclared fields while their schemas set `additionalProperties=false`.
- impact=the purported typed foundation has no valid in-package instance;an implementation can choose whichever incompatible interpretation produces PASS.
- remediation=publish exact JSON Schema or equivalently closed schemas for every member and instance;remove contradictions;version schemas and bind schema roots into package identity.
- closureTest=two independent standards-conformant validators accept every positive instance, reject every unknown/missing/wrong-type field vector and emit byte-identical schema roots and failure terminals.
- noMergeKey=PRCV3-SCHEMA-INSTANCE-SELF-CONTRADICTION.

## 2.3 PRCV3-IHR-F003 — 51 domain outputs have field-name lists, not closed typed schemas or evaluators

- severity=P0;state=OPEN;closureCredit=0.
- evidence=only five generic entries exist in `schemaDefinitions`;outputs such as RemoteRefObjectUniverse, WorktreeIndexSnapshot, SecretDetectorCoverageRegistry, ExactPublicChangesetAllowlist and GitHubControlPlaneChangeStateMachine are represented by untyped `requiredFields` name arrays and prose.
- impact=cardinality, value domains, ordering, identity, unknown-field handling and cross-field invariants are implementation-defined, so separate producers can produce incompatible or unsafe objects while claiming the same output type.
- remediation=materialize a closed schema and causal evaluator for all 56 output types, including types, enums, cardinalities, canonical ordering, uniqueness, referential constraints, state transitions and exact terminals.
- closureTest=every domain object has one rooted schema/evaluator pair;independent implementations agree on a positive corpus and a malformed/cross-field negative corpus;no prose fallback is accepted.
- noMergeKey=PRCV3-DOMAIN-OUTPUT-SCHEMA-AND-EVALUATOR-ABSENT.

## 2.4 PRCV3-IHR-F004 — canonical identity and mandatory domain separation are unspecified or violated

- severity=P0;state=OPEN;closureCredit=0.
- evidence=typed registry says `RFC8785-LIKE` and `domainSeparationRequired=true`;manifest roots use plain SHA-256 over tuples with no artifact-domain prefix;reader A uses JavaScript default sort while reader B uses Buffer byte ordering;number, Unicode, duplicate-key and normalization rules are not closed.
- impact=two conforming-looking producers can derive different identities, or different artifact kinds can share an unseparated hash domain, defeating CAS, replay and evidence binding.
- remediation=select one exact canonicalization standard/profile;define byte encoding and domain prefix for every root class;define duplicate-key, number, Unicode and ordering behavior;use one normative vector corpus.
- closureTest=independent implementations produce identical roots for multilingual and boundary corpora, reject ambiguous encodings, and demonstrate distinct roots for identical payload bytes in different artifact domains.
- noMergeKey=PRCV3-CANONICALIZATION-AND-DOMAIN-SEPARATION-NONCAUSAL.

## 2.5 PRCV3-IHR-F005 — both readers omit the manifest, four members and physical frozen-input verification

- severity=P0;state=OPEN;closureCredit=0.
- evidence=each reader opens only the Subject, registries, graph, vectors and closures;neither opens the atomic manifest, the other reader, either stored report or any frozen physical input;only five selected input hash strings are compared inside the registry.
- impact=a changed manifest, reader, report or source byte can coexist with two green core-reader reports;the package and its admitted review universe are not independently authenticated.
- remediation=make each reader verify the full manifest algorithm, every member root, its own inclusion rules, all physical frozen-input roots and the exact admitted Finding extraction from source manifests.
- closureTest=mutating any one of nine members, the manifest tuple order, any frozen input byte, source Finding count or report binding makes both fresh readers fail with a causal terminal.
- noMergeKey=PRCV3-READERS-DO-NOT-VERIFY-ATOMIC-PACKAGE-OR-INPUT-BYTES.

## 2.6 PRCV3-IHR-F006 — reader independence is asserted by file difference, not demonstrated by independent semantics

- severity=P1;state=OPEN;closureCredit=0.
- evidence=distinct source roots and zero shared local modules are the only independence evidence;both consume the same generated structures, hard-code the same counts, implement the same three toy operations and share the same semantic blind spots.
- impact=correlated specification or generator errors can yield unanimous PASS;file inequality is not organizational, provenance or semantic independence.
- remediation=bind independent authorship/provenance, disjoint implementations and review eligibility;create an externally rooted differential corpus and an adjudication rule for reader disagreement.
- closureTest=the two readers independently acquire schemas and source roots, detect planted defects the other misses, agree on the common corpus, and route every disagreement to a third authority without acceptance.
- noMergeKey=PRCV3-READER-INDEPENDENCE-PREDICATE-UNPROVED.

## 2.7 PRCV3-IHR-F007 — the 59-Finding universe aliases the first 32 current review records without a verified equivalence map

- severity=P0;state=OPEN;closureCredit=0.
- evidence=the v2 Findings Manifest contains 59 `PRCH2V2-IHR-F001..F059` records;v3 admits 32 `PRCS-HR-F001..F032` records rooted to the predecessor manifest plus only 27 records rooted to the v2 manifest;`wrapperIdentity` is extra, unvalidated data and no content-equivalence root exists.
- impact=changes in the current review wrapper's evidence, remediation or closure test for the first 32 records can be lost while v3 still claims exact 59 coverage.
- remediation=materialize a one-to-one alias/equivalence registry binding predecessor ID/root, wrapper ID/root, canonical record projection and semantic-delta disposition for all 32 preserved records.
- closureTest=both readers extract all 59 records from the v2 root, prove the 32 equivalences field by field, reject any changed wrapper content and preserve both source roots in every closure.
- noMergeKey=PRCV3-FINDING-WRAPPER-ALIAS-EQUIVALENCE-UNPROVED.

## 2.8 PRCV3-IHR-F008 — all negative vectors are tautological synthetic controls with self-supplied terminals

- severity=P0;state=OPEN;closureCredit=0.
- evidence=every vector mutates an invented `control_*` field absent from its target domain schema;on oracle failure each reader sets terminal=`vector.expectedTerminal` and then compares it to the same value.
- impact=any Finding can appear causally tested without exercising a ref, object, path, scanner, workflow, identity, Permit, deployment or release rule.
- remediation=replace synthetic fields with schema-valid domain preimages and operations;derive terminal from the target evaluator, never from the vector's expected value.
- closureTest=changing only `expectedTerminal` makes the test fail;wrong OID, extra object, stale cut, scanner disagreement, visibility change, bypass, wrong OIDC claim and replay vectors reach evaluator-derived exact terminals.
- noMergeKey=PRCV3-NEGATIVE-VECTOR-EXPECTED-TERMINAL-TAUTOLOGY.

## 2.9 PRCV3-IHR-F009 — a closure can be marked accepted without accepted roots for every mapped Requirement

- severity=P0;state=OPEN;closureCredit=0.
- evidence=closure records list `requirementIds`, but the FindingClosure schema has no accepted Requirement roots, versions, epochs or dispositions;those references create no graph edges;`accepted` is an unconstrained Boolean and `independentDisposition` is outside the declared schema.
- impact=a closure producer can set accepted=true with unrelated evidence while one or more mapped Requirements remain absent, stale or revoked.
- remediation=bind every mapped Requirement's accepted object root, evaluator receipt, epoch and revocation state into the closure object and graph;require an independent signed disposition over that exact cut.
- closureTest=removing, changing, expiring or revoking any mapped Requirement root invalidates only that exact closure and every dependent acceptance;Boolean-only promotion is rejected.
- noMergeKey=PRCV3-CLOSURE-NOT-BOUND-TO-MAPPED-REQUIREMENT-ROOTS.

## 2.10 PRCV3-IHR-F010 — final acceptance has no dependency path from CacheArtifactTrustRegistry

- severity=P0;state=OPEN;closureCredit=0.
- evidence=independent graph traversal finds PRCV3-REQ-055 reaches 55/56 Requirements and omits PRCV3-REQ-028;Findings PRCS-HR-F003 and PRCS-HR-F017 nevertheless map to REQ-028 only through non-edge closure metadata.
- impact=a poisoned or cross-trust cache/artifact state can remain unaccepted while the final assertion reaches PASS.
- remediation=add explicit accepted-object edges from every closure-mapped Requirement and every mandatory control, including REQ-028, to closure and final acceptance cuts.
- closureTest=the final transitive closure equals the exact mandatory Requirement denominator;removing or revoking CacheArtifactTrustRegistry makes acceptance, Push, deploy and release deny.
- noMergeKey=PRCV3-FINAL-GRAPH-OMITS-CACHE-ARTIFACT-TRUST.

## 2.11 PRCV3-IHR-F011 — sole-producer identity is not production authority and bootstrap authority is absent

- severity=P0;state=OPEN;closureCredit=0.
- evidence=producer declarations contain IDs and null implementation roots but no actor, key, capability, authorization root, conflict rule or output signature;B0 and canonical Tal mandate are typed ABSENT;bootstrapLayer strings are not authority receipts.
- impact=an arbitrary implementation can claim the sole producer ID and issue control, closure, acceptance or Permit objects.
- remediation=bind every producer to accepted bootstrap authority, implementation root, signer/identity, capability scope, input schema, output schema, key lifecycle, conflict behavior and revocation.
- closureTest=wrong actor/key/root/capability, duplicate producer, revoked producer or absent B0 denies before output creation;only one independently authorized producer can advance each object head.
- noMergeKey=PRCV3-SOLE-PRODUCER-IDENTITY-WITHOUT-AUTHORITY.

## 2.12 PRCV3-IHR-F012 — object, evidence, acceptance and Permit lifecycle/CAS/time semantics are non-causal

- severity=P0;state=OPEN;closureCredit=0.
- evidence=all registry objects have null epoch/expiry and a descriptive revocation string;Permit has field names but no state-transition table, trusted-clock algorithm, maximum TTL, atomic issue/consume store, monotonic head, replay key or revocation propagation.
- impact=stale, replayed, concurrently consumed, post-revocation or clock-forged objects can be interpreted as current.
- remediation=define typed state machines for object proposal, evidence, review, acceptance, Permit issue, atomic consume, expiry and revocation with trusted time, CAS heads and downstream invalidation.
- closureTest=stale head, double consume, clock rollback, expiry boundary, concurrent issuer, revoked dependency and reordered event vectors deterministically deny and invalidate all descendants.
- noMergeKey=PRCV3-LIFECYCLE-CAS-REVOCATION-TIME-SEMANTICS-ABSENT.

## 2.13 PRCV3-IHR-F013 — remote ref/object/fork/unreachable acquisition has no finite cut or complete receipt grammar

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-009 names aggregate fields but no typed query start/end cut, ref namespace, ref name/OID tuples, object format, pagination, rate-limit state, API/transport receipts, hidden refs, fork snapshot or unreachable-object acquisition authority.
- impact=missing refs or objects can be silently outside the denominator while the universe is labeled complete;counts can match a different repository state.
- remediation=define a cutoff-bound acquisition protocol over exact advertised/API refs, object closure, object format, forks, inaccessible states and platform-supported unreachable-object evidence.
- closureTest=added/deleted/moved ref, omitted page, rate limit, stale head, SHA format change, inaccessible fork or extra/unreachable object changes the root and prevents COMPLETE.
- noMergeKey=PRCV3-REMOTE-REF-OBJECT-CUTOFF-AND-RECEIPT-GRAMMAR-ABSENT.

## 2.14 PRCV3-IHR-F014 — worktree/index/object snapshot and writer freeze omit security-relevant Git states

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-010 has broad entry arrays but no exact schemas for index stages, intent-to-add, skip-worktree, assume-unchanged, sparse state, filters, attributes, modes, symlink targets, gitlinks, alternates, replace/graft refs, path bytes, Unicode/case collisions or nested repositories;writerFreeze is a field, not an enforced barrier.
- impact=user work can be omitted or wrong bytes can enter the intended Commit after a green snapshot.
- remediation=materialize a byte-level Git state model and an enforceable writer barrier with pre/post head and filesystem/index CAS;classify every special state and escape path.
- closureTest=each special index/worktree/object state has a negative vector;concurrent write, symlink escape, alternate object, case collision or filter transformation invalidates the snapshot and allowlist.
- noMergeKey=PRCV3-WORKTREE-INDEX-GIT-STATE-AND-WRITER-BARRIER-INCOMPLETE.

## 2.15 PRCV3-IHR-F015 — GitHub-only and residual-copy surface universes are open and under-enumerated

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-015 prose lists selected surfaces but supplies no closed enum or endpoint/cutoff schema for settings, collaborators, teams, invitations, Apps, OAuth, deploy keys, Webhooks, Secrets/variables, environments, Pages, LFS, alerts, advisories, comments, attachments, audit logs, forks, clones and platform caches.
- impact=secret, PII, release or control-plane exposure on an omitted surface can coexist with COMPLETE and a Public Push Permit.
- remediation=separate closed content, metadata, control-plane, credential, artifact and residual-copy universes;bind API pagination, retention, accessibility and cutoff receipts per surface.
- closureTest=each supported surface has an exact endpoint/acquisition state and one omission vector;unknown, inaccessible, rate-limited or newly added unclassified surfaces keep completeness false.
- noMergeKey=PRCV3-GITHUB-ONLY-AND-RESIDUAL-SURFACE-UNIVERSE-OPEN.

## 2.16 PRCV3-IHR-F016 — the exact allowlist cannot satisfy its two-builder closure and omits Git tree semantics

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCH2V2-IHR-F033 closure requires two independent builders;PRCV3-REQ-021 declares one sole producer and no witness/adjudicator roots;its fields do not close deletion, rename, tree OID, symlink, gitlink, LFS pointer/object, attributes/filter, submodule, path byte or per-entry reviewer semantics.
- impact=a one-sided or incomplete allowlist can bless different Commit bytes or omit a security-relevant object.
- remediation=define two independent derivation witnesses plus an adjudicator and an exact Git commit/tree/blob/mode/path/LFS/submodule model tied to expected old and new OIDs.
- closureTest=both builders derive byte-identical roots;one omitted, added, deleted, renamed, mode-changed, filtered, generated, linked or surplus object causes disagreement and denies without manual merge.
- noMergeKey=PRCV3-ALLOWLIST-TWO-BUILDER-AND-GIT-TREE-SEMANTICS-ABSENT.

## 2.17 PRCV3-IHR-F017 — Public Push Permit lacks an executable atomic consume-and-readback transaction

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-054 lists Permit fields but has no implementation root;repository host/node identity, transport endpoint, ref namespace, lease acquisition, atomic one-use consumption, accepted object set, remote receipt and post-receive readback algorithms are absent.
- impact=a Permit can be replayed, applied to the wrong repository/ref, race a head move or claim success for a partial/extra-object transfer.
- remediation=define separate issuer and consumer implementations with immutable repository identity, trusted short TTL, expected-old lease, exact new OID/object set, atomic consume CAS and authoritative post-receive readback.
- closureTest=wrong host/node/ref, stale old OID, extra object, partial receive, concurrent update, expired/revoked/used Permit or mismatched post-readback deterministically denies.
- noMergeKey=PRCV3-PUBLIC-PUSH-PERMIT-ATOMIC-CONSUME-READBACK-ABSENT.

## 2.18 PRCV3-IHR-F018 — PUBLIC is not continuously read back or coupled to immediate Permit revocation

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-002 defines allowed value PUBLIC, but no event/readback monitor, freshness maximum, owner-transfer condition or automatic revocation edge connects later visibility/control changes to outstanding Push, deploy and release Permits.
- impact=a Permit issued while Public can remain usable after repository visibility, ownership or effective access changes.
- remediation=bind fresh visibility/owner/control-plane readback at issue and consume time;subscribe or poll within an accepted freshness bound;revoke descendants on any mismatch.
- closureTest=visibility-change, owner-transfer, stale-readback and monitor-gap vectors revoke all outstanding Permits before side effect;Private is never accepted as rollback.
- noMergeKey=PRCV3-PUBLIC-INVARIANT-NOT-CONTINUOUSLY-REVOCATION-COUPLED.

## 2.19 PRCV3-IHR-F019 — Secret candidate and two-scanner closure has no materialized independent coverage/result model

- severity=P0;state=OPEN;closureCredit=0.
- evidence=current observation has six unresolved coordinates and zero cleared;PRCV3-REQ-017/018 list fields but no candidate transition schema, scanner instances, engine/ruleset roots, identical input cut, class-by-class coverage, custom provider patterns, false-negative corpus receipts, disagreement adjudicator or combined outcome.
- impact=one scanner, an uncovered Secret class, an unjustified false positive or an unresolved candidate can be promoted to cleared.
- remediation=materialize a private candidate state machine and two independently rooted scanner executions over the exact same history/worktree/index/GitHub surface cuts, with a separate adjudicator and provider-specific pattern decisions.
- closureTest=all six current coordinates have rooted owner/classification/rotation-or-false-positive dispositions;scanner disagreement, corpus miss, coverage gap, changed root or open candidate blocks the allowlist and Permit.
- noMergeKey=PRCV3-SECRET-CANDIDATE-TWO-SCANNER-MATERIALIZATION-ABSENT.

## 2.20 PRCV3-IHR-F020 — public-history and fork residual copies have no bounded, legally reviewed terminal state

- severity=P1;state=OPEN;closureCredit=0.
- evidence=Secret and incident prose mention revocation and residual copies, but no typed distinction exists between credential containment, Git history rewrite, GitHub cache/support purge, fork remediation, third-party clone impossibility, legal notice and accepted residual risk.
- impact=the plan can imply expunging success that a Public repository cannot prove, or delay credential rotation while pursuing deletion.
- remediation=make revoke/rotate the first terminal for credentials;model each residual-copy surface, platform escalation receipt, notification duty, legal decision and irreducible public-clone risk separately.
- closureTest=incident drills prove rotation before rewrite;every known platform surface has a receipt or explicit unresolved state;unreachable third-party copies can never be marked deleted without authority and evidence.
- noMergeKey=PRCV3-PUBLIC-HISTORY-FORK-RESIDUAL-COPY-TERMINAL-UNDEFINED.

## 2.21 PRCV3-IHR-F021 — PII policy lacks exact legal-role, jurisdiction, transfer, retention and rights matrices

- severity=P1;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-016 lists broad classes but no controller/processor role, tenant/data-subject identity, jurisdiction, lawful/publication authority, cross-border transfer, retention trigger, deletion/legal-hold conflict, direct-marketing suppression or rights-response schema;LEGAL-DECISION is absent.
- impact=personal/customer/employee data can be incorrectly published or retained under a generic privacyState.
- remediation=bind a legally reviewed data inventory and per-purpose role/jurisdiction/authority/transfer/retention/rights matrix;keep unknown classes and legal decisions blocking.
- closureTest=each data element resolves to subject, tenant, purpose, role, jurisdiction, authority, transfer basis, retention trigger and rights path;unknown or conflicting values deny Public publication.
- noMergeKey=PRCV3-PII-LEGAL-ROLE-JURISDICTION-RIGHTS-MATRIX-ABSENT.

## 2.22 PRCV3-IHR-F022 — license and every-byte provenance lack a closed rights/adjudication universe

- severity=P1;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-019/020 name author, assignmentOrLicense and legal state, but no contributor identity proof, employer/contractor assignment, third-party notice, generated-content source, dependency/license compatibility, dual-license transition or dispute adjudication schema exists;accepted license and Legal decision remain absent.
- impact=bytes with unresolved publication rights can be included by a shallow non-null field check.
- remediation=define closed provenance classes, evidence authorities, compatibility rules, contributor/third-party/generated-content paths, legal veto and immutable transition receipts.
- closureTest=every Public byte root has one accepted rights chain and scope;missing assignment, incompatible dependency, unknown generator input, disputed ownership or absent notice blocks allowlist, release and package publication.
- noMergeKey=PRCV3-EVERY-BYTE-RIGHTS-AND-ADJUDICATION-UNIVERSE-OPEN.

## 2.23 PRCV3-IHR-F023 — personal-account owner powers defeat the claimed two-person and bypass model

- severity=P0;state=OPEN;closureCredit=0.
- evidence=frozen GitHub observation binds `talstilkol/connect`;organization ownership, MFA denominator, owner succession and independent destructive-operation approval are absent;branch/CODEOWNERS review cannot constrain the personal repository owner from transfer, deletion or settings weakening.
- impact=one account can bypass or remove the controls that are supposed to require independent approval.
- remediation=move to an accepted organization governance envelope or explicitly reject readiness;bind immutable repository node ID, at least two named independent owners, MFA/effective-access readback, succession and destructive-operation rules.
- closureTest=one human alone cannot weaken Rulesets, transfer/delete repository, change visibility, alter owners or exercise bypass;owner-loss and compromise drills preserve PUBLIC and recover control.
- noMergeKey=PRCV3-PERSONAL-ACCOUNT-OWNER-BYPASS-AND-SUCCESSION-UNRESOLVED.

## 2.24 PRCV3-IHR-F024 — GitHub mutation is ordered before privileged-identity acceptance and can self-permit

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-034 GitHubControlPlaneChangeStateMachine consumes actor and permit but does not depend on PRCV3-REQ-035;instead REQ-035 depends on REQ-034;no separate GitHub-change Permit producer exists.
- impact=an unvetted actor or the mutation producer itself can authorize the first security-control change and define the identities that later validate it.
- remediation=create an externally bootstrapped privileged-identity and mutation-authority envelope before control-plane changes;separate issuer, executor and readback roles.
- closureTest=unknown/self/single actor, stale identity snapshot or missing second authority denies before mutation;the post-state registry cannot retroactively authorize its own producer.
- noMergeKey=PRCV3-GITHUB-MUTATION-BEFORE-PRIVILEGED-IDENTITY-SELF-PERMIT.

## 2.25 PRCV3-IHR-F025 — control-plane rollback may restore the observed insecure baseline

- severity=P1;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-034 requires rollback after partial failure but has no minimum-security invariant or distinction between safe forward recovery and restoration of the observed state with no main protection, zero Rulesets and allow-all Actions.
- impact=a failed hardening transaction can deliberately return to a known unsafe configuration and still report successful rollback.
- remediation=define a non-regression security floor, ordered preconditions, safe intermediate states and forward-recovery preference;rollback below the floor requires separate emergency authority and leaves all side effects disabled.
- closureTest=partial-operation vectors never leave a writable unprotected branch, broad Actions policy or active privileged path;rollback to the frozen insecure baseline is classified BLOCKED, not success.
- noMergeKey=PRCV3-CONTROL-PLANE-ROLLBACK-WITHOUT-SECURITY-FLOOR.

## 2.26 PRCV3-IHR-F026 — the GitHub control-plane operation and capability universes are not closed

- severity=P0;state=OPEN;closureCredit=0.
- evidence=`operationSet` has no closed enum covering visibility, transfer/delete/archive, collaborators/teams, Apps, deploy keys, Webhooks, Secrets/variables, environments, Pages, Actions, security features, Rulesets, releases/packages and bypass;no GitHub plan/feature capability receipt is required.
- impact=an omitted setting can weaken security outside CAS, and a plan can demand unavailable controls then silently substitute weaker behavior.
- remediation=define exact operation, readback and rollback schemas per GitHub surface plus repository-plan/API capability discovery;unknown or unsupported operations fail closed.
- closureTest=every mutable security-relevant setting maps to one operation/readback pair;unclassified, unsupported, reordered, partially applied or manually changed settings revoke the transaction and all dependent Permits.
- noMergeKey=PRCV3-GITHUB-CONTROL-PLANE-OPERATION-CAPABILITY-UNIVERSE-OPEN.

## 2.27 PRCV3-IHR-F027 — deploy and release permits are merged and not independently typed or consumed

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-055 combines deployPermit, releasePermit and final assertion in one output and producer;only one generic Permit schema exists;separate target, environment, artifact, registry coordinate, TTL, authority, consume and readback rules are absent;both paths depend on a new Public Push Permit.
- impact=deploy authority can be confused with publication authority, reused across targets or block safe digest-preserving promotion/rollback while permitting an unsafe conflated action.
- remediation=define distinct PrivilegedOperation, Deployment and Release Permit state machines with separate issuers, consumers, subjects, TTLs, CAS heads and receipts;bind them to an immutable artifact without requiring a new Push when none occurs.
- closureTest=a deploy Permit cannot publish and a release Permit cannot deploy;wrong environment/registry/artifact, replay or cross-use denies;staging-to-production promotion and reviewed rollback use exact existing digest roots.
- noMergeKey=PRCV3-DEPLOY-RELEASE-PERMIT-CONFLATION.

## 2.28 PRCV3-IHR-F028 — no finite asset, data-flow, trust-boundary, threat and abuse-case universe exists

- severity=P0;state=OPEN;closureCredit=0.
- evidence=the package defines control families but no rooted system components, assets, data classes, actors, data flows, trust boundaries, entry points, side effects, threat actors, abuse cases or failure modes;AISecurityControlSuite covers only a later subset.
- impact=controls and tests can be complete against their own list while entire attack surfaces are absent, making best-in-class or all-cyber coverage non-testable.
- remediation=produce finite versioned universes and a traceability matrix from every asset/flow/boundary/threat/abuse/failure identity to prevention, detection, response, test and residual risk.
- closureTest=every externally reachable and privileged flow is enumerated;adding an unclassified component or boundary invalidates coverage;independent threat modeling finds no orphan universe identity.
- noMergeKey=PRCV3-CYBER-ASSET-FLOW-THREAT-DENOMINATOR-ABSENT.

## 2.29 PRCV3-IHR-F029 — monitoring, audit, backup, restore and recovery exercises are not materialized

- severity=P1;state=OPEN;closureCredit=0.
- evidence=OperationalEvidenceReadbackRegistry and CyberIncidentResponseStateMachine use generic fields but no monitoring source, alert route, audit-log custody, immutable retention, repository/config backup, restore proof, RPO/RTO, ownership or exercise schedule objects exist.
- impact=controls can drift or fail silently, and recovery from account, repository, signer or evidence loss remains unproved.
- remediation=materialize monitoring/SLO, alert/on-call, audit custody, backup inventory, restore procedure, RPO/RTO and periodic exercise registries with exact receipts.
- closureTest=control drift and simulated repository/account/evidence loss trigger routed alerts;independent restores reproduce exact refs/settings/evidence within accepted objectives;missed alert or stale drill blocks readiness.
- noMergeKey=PRCV3-MONITORING-AUDIT-BACKUP-RESTORE-EXERCISE-ABSENT.

## 2.30 PRCV3-IHR-F030 — cyber source version, custody, cutoff and conflict resolution remain external and absent

- severity=P1;state=OPEN;closureCredit=0.
- evidence=ACCEPTED-SOURCE-UNIVERSE and trusted-time authority are absent;PRCV3-REQ-046 lists generic source fields but no current closed source identities, official bytes, license, publication/errata roots, retrieval interval, supersession or exact conflict adjudication instances exist.
- impact=outdated, ambiguous or misidentified standards and guidance can drive controls without invalidating acceptance.
- remediation=bind the accepted Source Universe, exact official byte captures, authority/edition/status, licenses, trusted retrieval cut, errata/supersession chain and preserved conflicts.
- closureTest=each control maps to exact current source bytes;fetch failure, version conflict, changed publication, missing license, stale cut or unadjudicated semantic delta blocks affected controls and acceptance.
- noMergeKey=PRCV3-CYBER-SOURCE-VERSION-CUSTODY-CUTOFF-CONFLICT-ABSENT.

## 2.31 PRCV3-IHR-F031 — SLSA and attestation claims have no exact normative version/Track/Level evaluator

- severity=P1;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-041/042 list version, track, level and policy fields but no accepted SLSA source root, per-version normative requirement table, claim algorithm, builder class, distribution model or consumer enforcement instance exists.
- impact=an attestation can be present and a SLSA label selected without proving the exact normative requirements or consumer behavior.
- remediation=freeze the exact SLSA version and applicable Track/Level;materialize every normative predicate, evidence root and consumer decision;keep claim none until independent assessment passes all predicates.
- closureTest=omitting any normative predicate, using the wrong subject/builder/workflow/version or disabling consumer verification returns claim none and blocks release.
- noMergeKey=PRCV3-SLSA-ATTESTATION-NORMATIVE-EVALUATOR-ABSENT.

## 2.32 PRCV3-IHR-F032 — AI security has no closed component, tool, memory, side-effect and TEVV denominator

- severity=P1;state=OPEN;closureCredit=0.
- evidence=D02 and D25 are absent;PRCV3-REQ-047 lists aggregate fields but no model/provider/version, prompt/context source, retrieval corpus, tool, memory, tenant boundary, side-effect, evaluator, adversarial case or drift-threshold instances exist.
- impact=prompt injection, poisoning, cross-tenant leakage or unauthorized side effects can fall outside the AI control/test set.
- remediation=build an AI BOM and finite threat/control/TEVV matrix per component, input, memory, tool and side effect;default all side effects off until D02/D25 and independent evaluations are accepted.
- closureTest=unknown model/tool/context/memory, poisoned source, tenant crossing, stale approval, model change or failed adversarial evaluation disables side effects and invalidates the AI acceptance root.
- noMergeKey=PRCV3-AI-BOM-TOOL-MEMORY-SIDE-EFFECT-TEVV-DENOMINATOR-OPEN.

## 2.33 PRCV3-IHR-F033 — dependency/SBOM scope is not closed across build, runtime, Actions, images and services

- severity=P1;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-022/023 use generic ecosystem/component fields but no closed ecosystem list covers package managers, transitive lock resolution, GitHub Actions/reusable workflows, base images, OS packages, downloaded tools, browser assets, infrastructure modules and external services.
- impact=an executable or vulnerable dependency can remain outside SBOM, provenance, policy and response SLAs.
- remediation=derive a complete dependency universe from every build/deploy/runtime context;bind immutable resolution, publisher, license, vulnerability sources, reachability, owner and exception expiry per class.
- closureTest=adding an undeclared action, image layer, downloaded binary, transitive package or service changes the universe root and blocks build/release;SBOM and installed-state reconciliation has zero unexplained components.
- noMergeKey=PRCV3-DEPENDENCY-SBOM-ECOSYSTEM-AND-EXECUTION-SCOPE-OPEN.

## 2.34 PRCV3-IHR-F034 — incident and disclosure lifecycles lack executable drills and independent recovery re-rooting

- severity=P1;state=OPEN;closureCredit=0.
- evidence=PRCV3-REQ-043-045 contain prose state-machine fields but no executable transition tables, scenario corpus, role/notification authority, evidence-compromise root replacement, signer/control-plane rebootstrap or completed drill receipts exist.
- impact=the same compromised identity, evidence store or signer can attest its own recovery, and a paper incident plan can receive credit without demonstrated containment.
- remediation=materialize executable incident/disclosure state machines, independent recovery authority, re-root protocol, communication/legal decisions and periodic adversarial drills for identity, repository, workflow, provider, signer, release and evidence compromise.
- closureTest=for every scenario the compromised authority is unable to approve recovery;containment, revocation, preservation, re-root, restoration, notification and post-incident verification produce independent rooted receipts;failed or stale drills block readiness.
- noMergeKey=PRCV3-INCIDENT-DISCLOSURE-DRILL-AND-INDEPENDENT-REROOT-ABSENT.

# 3. Exact disposition

3.1 accepted new Findings=0/34.

3.2 closed new Findings=0/34.

3.3 inherited closure credit=0/59.

3.4 merged or suppressed records=0.

3.5 the Subject's mechanically correct roots and safe blocking state are observations, not Finding closures.

3.6 successor acceptance is prohibited until all 34 records close independently, all 59 inherited records close under causal evidence, every mandatory Requirement is in the final transitive cut and the PUBLIC invariant remains current.

3.7 current Acceptance=0;Public Push Permit=ABSENT;deploy Permit=ABSENT;release Permit=ABSENT;repository visibility=PUBLIC;Gate29=BLOCKED;development freeze=ACTIVE.
