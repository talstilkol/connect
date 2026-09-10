# 1. Connect — Public repository and cyber hardening successor requirements v3

## 1.1 Identity and immutable boundary

1.1.1 artifactId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-SUCCESSOR-REQUIREMENTS-V3-2026-08-30.

1.1.2 artifactClass=ATOMIC-PLANNING-CANDIDATE;NOT-IMPLEMENTATION;NOT-ACCEPTED;NOT-A-GITHUB-SETTING-RECEIPT;NOT-A-PUSH-DEPLOY-OR-RELEASE-PERMIT.

1.1.3 repository visibility=PUBLIC and cannot change as remediation, rollback or incident response.

1.1.4 logical repository root=the Public repository root; every Public locator begins with docs/ and is repository-relative.

1.1.5 prohibited Public locators=workspace-relative prefixes, host-absolute paths, parent traversal and URI locators.

1.1.6 deterministic identity=canonical JSON plus domain-separated SHA-256 only; randomness is prohibited.

1.1.7 current Acceptance=0;Gate29=BLOCKED;development freeze=ACTIVE.

## 1.2 Frozen exact input roots

- V2-SUBJECT: path=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md;sha256=322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a;claimClass=FROZEN-PREDECESSOR;state=READ.
- V2-INDEPENDENT-REVIEW: path=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-independent-hostile-review-2026-08-30.md;sha256=491217c85358d6e96744987000aceeb64fdfad3221a65e9a3d38a564942e475a;claimClass=FROZEN-REVIEW;state=READ.
- V2-INDEPENDENT-FINDINGS: path=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-independent-hostile-review-findings-manifest-2026-08-30.md;sha256=f049b4b681d1c03bed1b4856a61a064383faa3b3bab58a2baca85bf546f81c16;claimClass=FROZEN-FINDINGS;state=READ.
- PREDECESSOR-REPORT: path=docs/planning/public-repository-and-cyber-source-hostile-review-2026-08-29.md;sha256=af7bd90255fe0cb037d19ad8138609a3b35df50c33219470c845dec15919c6d5;claimClass=FROZEN-PREDECESSOR-REVIEW;state=READ.
- PREDECESSOR-FINDINGS: path=docs/planning/public-repository-and-cyber-source-hostile-review-findings-manifest-2026-08-29.md;sha256=a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4;claimClass=FROZEN-PREDECESSOR-FINDINGS;state=READ.
- GITHUB-LIVE-V3: path=docs/planning/github-public-hardening-live-readback-observation-v3-2026-08-30.md;sha256=0dea5b462e4bff0d1866a585a585f7e0d0405609ad21ade4e8ecac1210e521cb;claimClass=CURRENT-BOUNDED-OBSERVATION;state=READ.
- LEGACY-QUARANTINE-V2: path=docs/planning/legacy-analysis-publication-quarantine-observation-v2-2026-08-30.md;sha256=00d8c970eb6f8a747d6353f309bc0c0109df6dd454582447325f123cf512df7c;claimClass=CURRENT-CORRECTIVE-OBSERVATION;state=READ.
- LICENSE-OBSERVATION: path=docs/planning/public-repository-license-strategy-observation-2026-08-30.md;sha256=d5d8267370435cba5fcaa481f3af8a8d60641e319dfc3237ce3abd7a834b3f96;claimClass=CURRENT-BOUNDED-OBSERVATION;state=READ.
- SECRET-SCAN-V2: path=docs/planning/public-repository-secret-scan-observation-v2-2026-08-30.md;sha256=3e8bb89858b660e8fe923643301c7225cafd622acdca6842a913a1f6d9bb9983;claimClass=CURRENT-CORRECTIVE-OBSERVATION;state=READ;supersedes=SECRET-SCAN-V1.
- SECRET-SCAN-V1: path=docs/planning/public-repository-secret-scan-observation-v1-2026-08-30.md;sha256=3ec83742da420a92d243b96cc0dae77112bb206fbe9f4d7a179a0f967d315755;claimClass=HISTORICAL-ONLY;state=READ.
- B0: path=TYPED-ABSENT;sha256=TYPED-ABSENT;claimClass=EXTERNAL-AUTHORITY;state=ABSENT.
- CANONICAL-TAL-MANDATE: path=TYPED-ABSENT;sha256=TYPED-ABSENT;claimClass=EXTERNAL-AUTHORITY;state=ABSENT.
- ACCEPTED-REVIEW-PROTOCOL: path=TYPED-ABSENT;sha256=TYPED-ABSENT;claimClass=EXTERNAL-AUTHORITY;state=ABSENT.
- ACCEPTED-SOURCE-UNIVERSE: path=TYPED-ABSENT;sha256=TYPED-ABSENT;claimClass=EXTERNAL-AUTHORITY;state=ABSENT.
- ACCEPTED-CONTROL-SEQUENCE: path=TYPED-ABSENT;sha256=TYPED-ABSENT;claimClass=EXTERNAL-AUTHORITY;state=ABSENT.
- LEGAL-DECISION: path=TYPED-ABSENT;sha256=TYPED-ABSENT;claimClass=EXTERNAL-LEGAL-AUTHORITY;state=ABSENT.
- D02: path=TYPED-ABSENT;sha256=TYPED-ABSENT;claimClass=EXTERNAL-DECISION;state=ABSENT.
- D25: path=TYPED-ABSENT;sha256=TYPED-ABSENT;claimClass=EXTERNAL-DECISION;state=ABSENT.
- TRUSTED-TIME-AUTHORITY: path=TYPED-ABSENT;sha256=TYPED-ABSENT;claimClass=EXTERNAL-EVIDENCE-AUTHORITY;state=ABSENT.

1.2.1 Secret-scan v2 is the current history observation. Secret-scan v1 is historical-only and cannot satisfy current remote-history, worktree, index or allowlist predicates.

1.2.2 current observed baseline is blocking: PUBLIC;main protection absent;Rulesets zero;Actions allow-all;full-SHA enforcement absent;first-time-only external approval;CodeQL, Secret Protection and Private Vulnerability Reporting disabled;current exact worktree denominator absent.

1.2.3 current Secret denominator records 5 heads,6 Pull Request refs,307 reachable Commits,15 merge-aware rows,6 coordinates,0 cleared candidates;unreachable objects,external forks and several GitHub-only surfaces remain explicitly incomplete.

## 1.3 Atomic package members

- subject=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-2026-08-30.md.
- registry=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-typed-registries-2026-08-30.json.
- graph=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-producer-dependency-graph-2026-08-30.json.
- vectors=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-operation-oracle-vector-pack-2026-08-30.json.
- closures=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-finding-closure-registry-2026-08-30.json.
- readerA=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-a-2026-08-30.mjs.
- readerB=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-b-2026-08-30.mjs.
- reportA=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-a-report-2026-08-30.json.
- reportB=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-b-report-2026-08-30.json.
- manifest=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-atomic-package-manifest-2026-08-30.json.
- qa=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-producer-qa-2026-08-30.md.

# 2. Semantics

2.1 every Requirement below produces exactly one typed object with exactly one distinct producer identity.

2.2 a producer declaration is not an implementation. Every executable producer root is absent in this planning package; implementation and operational credit remain zero.

2.3 dependencies contain only lower-numbered Requirement IDs. Typed external inputs occur only in FrozenInputManifest.

2.4 exact closure means one detached record, one noMergeKey, one vector body and one independent disposition for each admitted Finding; ranges, Merge and presence-only credit are forbidden.

2.5 missing, stale, inaccessible, conflicting, mutable or unknown evidence returns the Requirement failure terminal and never PASS.

2.6 operation/oracle vectors are planning-model executions only. They do not prove GitHub, provider, Product, deployment or release behavior.

# 3. Topologically ordered Requirements

## 3.1 PRCV3-REQ-000

- outputObjectId=PRCV3-OBJECT-000.
- outputType=FrozenInputManifest.
- soleProducerId=PRCV3-PRODUCER-000.
- dependencies=NONE.
- findingIds=PRCH2V2-IHR-F047.
- statement=Freeze every authority, predecessor, review and current observation input. Secret scan v2 is current; v1 is historical-only.
- requiredFields=inputId,path,sha256,claimClass,supersedes,state.
- proof=Every admitted use resolves to one exact root and claim class; absence, substitution, duplicate or forbidden promotion denies.
- failure=FOUNDATION-INPUT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.2 PRCV3-REQ-001

- outputObjectId=PRCV3-OBJECT-001.
- outputType=CanonicalSchemaAndLocatorRegistry.
- soleProducerId=PRCV3-PRODUCER-001.
- dependencies=PRCV3-REQ-000.
- findingIds=PRCH2V2-IHR-F044,PRCH2V2-IHR-F056,PRCH2V2-IHR-F057.
- statement=Define closed typed schemas, canonical JSON, domain-separated SHA-256 identities and repository-relative locator grammar.
- requiredFields=schemaId,version,canonicalJsonProfile,digestProfile,pathGrammar,fieldTypes,errorTerminal.
- proof=Two independent stdlib readers reject unknown fields, ambiguous encodings, absolute or parent-relative paths, URI locators and unsupported operations.
- failure=SCHEMA-LOCATOR-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.3 PRCV3-REQ-002

- outputObjectId=PRCV3-OBJECT-002.
- outputType=PublicRepositoryInvariant.
- soleProducerId=PRCV3-PRODUCER-002.
- dependencies=PRCV3-REQ-000,PRCV3-REQ-001.
- findingIds=NONE.
- statement=Make PUBLIC the only permitted visibility in normal, rollback and incident states.
- requiredFields=repositoryVisibility,allowedValues,incidentRule,rollbackRule,readbackPredicate.
- proof=Any Private value or visibility-change remediation denies; current readback must equal PUBLIC.
- failure=PUBLIC-INVARIANT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.4 PRCV3-REQ-003

- outputObjectId=PRCV3-OBJECT-003.
- outputType=LogicalRepositoryRootRegistry.
- soleProducerId=PRCV3-PRODUCER-003.
- dependencies=PRCV3-REQ-001,PRCV3-REQ-002.
- findingIds=PRCS-HR-F008,PRCH2V2-IHR-F034,PRCH2V2-IHR-F056.
- statement=Bind the logical root to the Public repository root and prohibit outer or host-specific repository authority.
- requiredFields=logicalRootId,repositoryId,relativeRoot,outerRootState,wrongRootTerminal.
- proof=Every command, locator and receipt binds the logical root; wrong-root, absolute-root or unresolved-root cases deny before mutation.
- failure=REPOSITORY-ROOT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.5 PRCV3-REQ-004

- outputObjectId=PRCV3-OBJECT-004.
- outputType=ObservationSupersessionRegistry.
- soleProducerId=PRCV3-PRODUCER-004.
- dependencies=PRCV3-REQ-000,PRCV3-REQ-001.
- findingIds=PRCS-HR-F030,PRCH2V2-IHR-F051.
- statement=Bind current GitHub, Legacy, license and Secret observations and preserve supersession semantics.
- requiredFields=observationId,root,claimClass,currentFor,supersedes,continuityState.
- proof=Secret v1 cannot satisfy current history claims; any missing correction or unexplained continuity break denies.
- failure=OBSERVATION-CONTINUITY-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.6 PRCV3-REQ-005

- outputObjectId=PRCV3-OBJECT-005.
- outputType=PrivateEvidenceCustodyAndTimeRegistry.
- soleProducerId=PRCV3-PRODUCER-005.
- dependencies=PRCV3-REQ-001,PRCV3-REQ-004.
- findingIds=PRCS-HR-F005,PRCS-HR-F026,PRCH2V2-IHR-F058.
- statement=Define private evidence custody, disclosure-safe Public projections, trusted-time absence and immutable receipt lifecycle.
- requiredFields=custodian,producer,receiptSchema,trustedTimeState,appendOnlyCommitment,accessPolicy,retention,revocation.
- proof=Replacement, replay, clock substitution, unauthorized access, broken custody or Public equality-oracle output denies.
- failure=EVIDENCE-CUSTODY-TIME-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.7 PRCV3-REQ-006

- outputObjectId=PRCV3-OBJECT-006.
- outputType=ProducerDefinitionRegistry.
- soleProducerId=PRCV3-PRODUCER-006.
- dependencies=PRCV3-REQ-000,PRCV3-REQ-001.
- findingIds=PRCH2V2-IHR-F042,PRCH2V2-IHR-F045.
- statement=Declare exactly one typed producer per output and distinguish external bootstrap definitions from produced objects.
- requiredFields=producerId,outputObjectId,inputObjectIds,implementationRoot,implementationState,bootstrapLayer.
- proof=Producer/output cardinality is one-to-one; duplicate, hidden, self-object dependency or executable-root absence blocks implementation credit.
- failure=PRODUCER-DEFINITION-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.8 PRCV3-REQ-007

- outputObjectId=PRCV3-OBJECT-007.
- outputType=ExactProducerDependencyGraph.
- soleProducerId=PRCV3-PRODUCER-007.
- dependencies=PRCV3-REQ-001,PRCV3-REQ-006.
- findingIds=PRCH2V2-IHR-F042.
- statement=Materialize the complete typed producer and object dependency graph.
- requiredFields=nodeId,nodeType,producerId,dependencies,topologicalIndex,implementationState.
- proof=Two graph readers agree on all nodes and edges; unknown, forward, self, duplicate, hidden or cyclic edges deny.
- failure=DEPENDENCY-GRAPH-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.9 PRCV3-REQ-008

- outputObjectId=PRCV3-OBJECT-008.
- outputType=AdmittedReviewFindingUniverse.
- soleProducerId=PRCV3-PRODUCER-008.
- dependencies=PRCV3-REQ-000,PRCV3-REQ-004,PRCV3-REQ-006,PRCV3-REQ-007.
- findingIds=PRCH2V2-IHR-F048,PRCH2V2-IHR-F049.
- statement=Admit every Finding from the predecessor and v2 hostile review with no fixed predecessor-only ceiling.
- requiredFields=reviewRoot,findingId,severity,noMergeKey,state,disposition.
- proof=Exactly 59 current identities resolve one-to-one; omission, range, Merge, suppression or presence-only credit denies.
- failure=REVIEW-UNIVERSE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.10 PRCV3-REQ-009

- outputObjectId=PRCV3-OBJECT-009.
- outputType=RemoteRefObjectUniverse.
- soleProducerId=PRCV3-PRODUCER-009.
- dependencies=PRCV3-REQ-003,PRCV3-REQ-004,PRCV3-REQ-005,PRCV3-REQ-007.
- findingIds=PRCS-HR-F006,PRCH2V2-IHR-F035.
- statement=Freeze exact remote heads, Pull Request refs, tags, reachable object closure and explicit unknown denominators.
- requiredFields=acquisitionRoot,heads,pullRequestRefs,tags,reachableObjects,mergeAwareHistory,unreachableState,forkState,inaccessibleState.
- proof=Expected counts and roots bind acquisition; missing ref identity, stale head, unreachable/fork/inaccessible ambiguity or parser disagreement blocks COMPLETE.
- failure=REMOTE-REF-OBJECT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.11 PRCV3-REQ-010

- outputObjectId=PRCV3-OBJECT-010.
- outputType=WorktreeIndexSnapshot.
- soleProducerId=PRCV3-PRODUCER-010.
- dependencies=PRCV3-REQ-003,PRCV3-REQ-005,PRCV3-REQ-009.
- findingIds=PRCH2V2-IHR-F034.
- statement=Freeze current worktree, index, untracked, ignored and submodule state after writers stop.
- requiredFields=snapshotRoot,worktreeEntries,indexEntries,untrackedEntries,ignoredEntries,submodules,writerFreeze,currentState.
- proof=Any writer, unclassified entry, index/worktree mismatch, sparse/shallow ambiguity or stale snapshot denies.
- failure=WORKTREE-INDEX-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.12 PRCV3-REQ-011

- outputObjectId=PRCV3-OBJECT-011.
- outputType=UserChangePreservationRegistry.
- soleProducerId=PRCV3-PRODUCER-011.
- dependencies=PRCV3-REQ-010.
- findingIds=PRCH2V2-IHR-F034.
- statement=Classify every mutable entry and preserve user-owned work without implicit deletion or overwrite.
- requiredFields=entryId,ownerClass,preserveRule,overlapState,deletionAuthority,reviewState.
- proof=Unresolved ownership, overlap, deletion, replacement or merge conflict denies the changeset.
- failure=USER-CHANGE-PRESERVATION-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.13 PRCV3-REQ-012

- outputObjectId=PRCV3-OBJECT-012.
- outputType=GeneratedOutputRegistry.
- soleProducerId=PRCV3-PRODUCER-012.
- dependencies=PRCV3-REQ-003,PRCV3-REQ-005,PRCV3-REQ-010.
- findingIds=PRCH2V2-IHR-F037.
- statement=Bind local generated outputs, caches, archives, code generation and compiled assets to exact provenance.
- requiredFields=outputId,sourceRoots,recipeRoot,toolRoot,environmentRoot,trackedState,publicationClass,reproducibilityClass.
- proof=Undeclared input, changed tool, stale output, ignored-to-Public promotion or unexplained nondeterminism denies.
- failure=GENERATED-OUTPUT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.14 PRCV3-REQ-013

- outputObjectId=PRCV3-OBJECT-013.
- outputType=BuildUploadContextRegistry.
- soleProducerId=PRCV3-PRODUCER-013.
- dependencies=PRCV3-REQ-003,PRCV3-REQ-012.
- findingIds=PRCH2V2-IHR-F037.
- statement=Constrain build, upload, archive, container and deploy contexts to explicit Product-root includes.
- requiredFields=contextId,root,includeManifest,excludeManifest,siblingState,archivePolicy,destination.
- proof=Parent, outer, sibling, broad glob or undeclared archive member denies before build or upload.
- failure=BUILD-CONTEXT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.15 PRCV3-REQ-014

- outputObjectId=PRCV3-OBJECT-014.
- outputType=LegacyQuarantineAndTaintRegistry.
- soleProducerId=PRCV3-PRODUCER-014.
- dependencies=PRCV3-REQ-004,PRCV3-REQ-010,PRCV3-REQ-012,PRCV3-REQ-013.
- findingIds=PRCH2V2-IHR-F036.
- statement=Preserve Legacy quarantine across copies, transforms, generated output, history and semantic reuse.
- requiredFields=legacyRootState,taintId,similarityProfile,decoderProfile,importAuthority,semanticTestSet,privateCaseState.
- proof=Copied, renamed, normalized, encoded, archived, generated or behaviorally recreated risky content denies without one-item closure.
- failure=LEGACY-TAINT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.16 PRCV3-REQ-015

- outputObjectId=PRCV3-OBJECT-015.
- outputType=GitHubOnlySurfaceUniverse.
- soleProducerId=PRCV3-PRODUCER-015.
- dependencies=PRCV3-REQ-003,PRCV3-REQ-004,PRCV3-REQ-005,PRCV3-REQ-009.
- findingIds=PRCS-HR-F006,PRCS-HR-F020,PRCS-HR-F021.
- statement=Enumerate forks, Pull Requests, Issues, Discussions, Actions logs/artifacts/caches, Releases, packages, deployments, Wiki and previews.
- requiredFields=surfaceId,apiClass,visibility,acquisitionState,retention,inaccessibleState,evidenceRoot.
- proof=Every eligible surface has exact state; inaccessible, withheld, rate-limited or unknown surfaces block COMPLETE.
- failure=GITHUB-SURFACE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.17 PRCV3-REQ-016

- outputObjectId=PRCV3-OBJECT-016.
- outputType=SensitiveDataAndPIIPolicy.
- soleProducerId=PRCV3-PRODUCER-016.
- dependencies=PRCV3-REQ-005,PRCV3-REQ-015.
- findingIds=PRCS-HR-F021,PRCS-HR-F022,PRCH2V2-IHR-F039.
- statement=Define Secret, PII, customer, employee, special-category and non-secret-sensitive publication policy.
- requiredFields=dataClass,subjectOrTenant,publicationAuthority,minimization,reidentificationBound,retention,incidentClass,detectors.
- proof=Unknown class, authority, tenant, retention or detector coverage denies; Public output leaks no value or equality oracle.
- failure=SENSITIVE-DATA-PII-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.18 PRCV3-REQ-017

- outputObjectId=PRCV3-OBJECT-017.
- outputType=SecretCandidateLedger.
- soleProducerId=PRCV3-PRODUCER-017.
- dependencies=PRCV3-REQ-004,PRCV3-REQ-005,PRCV3-REQ-009,PRCV3-REQ-010,PRCV3-REQ-012,PRCV3-REQ-015.
- findingIds=PRCS-HR-F006,PRCS-HR-F022,PRCH2V2-IHR-F038.
- statement=Bind all current history and proposed-snapshot Secret candidates in a private redacted ledger.
- requiredFields=candidateId,observationRoot,rowIdentity,coordinateIdentity,surface,classification,owner,revocationReceipt.
- proof=Open, duplicate-unresolved, ownerless or untriaged candidate remains blocking; confirmed credentials require revoke/rotate first.
- failure=SECRET-CANDIDATE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.19 PRCV3-REQ-018

- outputObjectId=PRCV3-OBJECT-018.
- outputType=SecretDetectorCoverageRegistry.
- soleProducerId=PRCV3-PRODUCER-018.
- dependencies=PRCV3-REQ-016,PRCV3-REQ-017.
- findingIds=PRCS-HR-F006,PRCS-HR-F021,PRCS-HR-F022,PRCH2V2-IHR-F038.
- statement=Require two independently rooted scanners and selected-provider custom patterns over identical frozen roots.
- requiredFields=detectorId,implementationRoot,rulesetRoot,surfaceSet,secretClasses,customPatterns,falseNegativeCorpus,independenceClass.
- proof=Missing second scanner, unsupported class, corpus miss, custom-pattern gap, bypass or log leak denies.
- failure=SECRET-DETECTOR-COVERAGE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.20 PRCV3-REQ-019

- outputObjectId=PRCV3-OBJECT-019.
- outputType=InterimAndSuccessorLicenseRegistry.
- soleProducerId=PRCV3-PRODUCER-019.
- dependencies=PRCV3-REQ-000,PRCV3-REQ-004,PRCV3-REQ-005.
- findingIds=PRCS-HR-F024,PRCH2V2-IHR-F040.
- statement=Encode interim no-license, Contributions-closed, Release/package-blocked state and exact Legal successor transition.
- requiredFields=state,contributionPolicy,releasePolicy,packagePolicy,legalDecisionRoot,licenseBytesRoot,noticeRoot,transitionAuthority.
- proof=Contribution, license addition, Open Source claim, package or binary Release denies until counsel-approved roots exist.
- failure=LICENSE-STATE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.21 PRCV3-REQ-020

- outputObjectId=PRCV3-OBJECT-020.
- outputType=EveryPublicByteProvenanceRegistry.
- soleProducerId=PRCV3-PRODUCER-020.
- dependencies=PRCV3-REQ-010,PRCV3-REQ-012,PRCV3-REQ-014,PRCV3-REQ-016,PRCV3-REQ-019.
- findingIds=PRCS-HR-F024,PRCH2V2-IHR-F037,PRCH2V2-IHR-F041.
- statement=Bind every code, document, image, font, dataset, fixture, generated output and copied specification byte to publication rights.
- requiredFields=contentRoot,contentClass,author,assignmentOrLicense,sourceRoot,modificationHistory,publicationScope,legalState.
- proof=Missing, conflicting, incompatible or unverifiable provenance denies even when the byte is not shipped.
- failure=PUBLIC-BYTE-PROVENANCE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.22 PRCV3-REQ-021

- outputObjectId=PRCV3-OBJECT-021.
- outputType=ExactPublicChangesetAllowlist.
- soleProducerId=PRCV3-PRODUCER-021.
- dependencies=PRCV3-REQ-009,PRCV3-REQ-010,PRCV3-REQ-011,PRCV3-REQ-012,PRCV3-REQ-014,PRCV3-REQ-015,PRCV3-REQ-016,PRCV3-REQ-017,PRCV3-REQ-018,PRCV3-REQ-019,PRCV3-REQ-020.
- findingIds=PRCH2V2-IHR-F033,PRCH2V2-IHR-F034,PRCH2V2-IHR-F036,PRCH2V2-IHR-F037,PRCH2V2-IHR-F038,PRCH2V2-IHR-F039,PRCH2V2-IHR-F040,PRCH2V2-IHR-F041.
- statement=Produce the exact content-addressed allowlist for one proposed Public changeset.
- requiredFields=repositoryRoot,baseRef,expectedOldOid,path,mode,blobOid,objectClosure,provenanceRoot,licenseState,privacyState,scanRoots,intendedCommit.
- proof=Added, omitted, renamed, mode-changed, generated, unlicensed, unresolved or surplus object invalidates the allowlist.
- failure=PUBLIC-ALLOWLIST-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.23 PRCV3-REQ-022

- outputObjectId=PRCV3-OBJECT-022.
- outputType=DependencySBOMVulnerabilityRegistry.
- soleProducerId=PRCV3-PRODUCER-022.
- dependencies=PRCV3-REQ-012,PRCV3-REQ-019,PRCV3-REQ-020.
- findingIds=PRCS-HR-F007,PRCH2V2-IHR-F055.
- statement=Close runtime, development, optional, peer, workspace and transitive dependency/SBOM/vulnerability denominators.
- requiredFields=ecosystem,component,relationship,lockRoot,installedRoot,sbomRoot,license,advisoryRoot,reachability,owner,sla,exceptionExpiry.
- proof=Omission, lock/install mismatch, vulnerable reachable component, stale advisory or expired exception denies.
- failure=DEPENDENCY-SBOM-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.24 PRCV3-REQ-023

- outputObjectId=PRCV3-OBJECT-023.
- outputType=ExecutableDependencyRegistry.
- soleProducerId=PRCV3-PRODUCER-023.
- dependencies=PRCV3-REQ-013,PRCV3-REQ-022.
- findingIds=PRCS-HR-F007,PRCS-HR-F018,PRCS-HR-F026,PRCS-HR-F031.
- statement=Root Actions, reusable/local/container actions, images, tools, downloads, native binaries and transitive executables.
- requiredFields=componentId,class,source,immutableRoot,checksum,publisher,transitives,reviewExpiry.
- proof=Mutable tag, moved image, wrong fork, checksum mismatch, missing owner or expired review denies before execution.
- failure=EXECUTABLE-DEPENDENCY-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.25 PRCV3-REQ-024

- outputObjectId=PRCV3-OBJECT-024.
- outputType=ActionsWorkflowInventory.
- soleProducerId=PRCV3-PRODUCER-024.
- dependencies=PRCV3-REQ-009,PRCV3-REQ-013,PRCV3-REQ-015,PRCV3-REQ-023.
- findingIds=PRCS-HR-F002.
- statement=Inventory every workflow and reusable workflow by exact root and full behavior.
- requiredFields=workflowId,root,events,inputs,checkedOutRefs,jobs,permissions,secrets,environments,cache,artifacts,network,sideEffects.
- proof=Unknown trigger, expression, reusable edge, permission, input, sink or side effect denies.
- failure=ACTIONS-INVENTORY-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.26 PRCV3-REQ-025

- outputObjectId=PRCV3-OBJECT-025.
- outputType=WorkflowTrustMatrix.
- soleProducerId=PRCV3-PRODUCER-025.
- dependencies=PRCV3-REQ-024.
- findingIds=PRCS-HR-F002,PRCS-HR-F016.
- statement=Define a closed default-DENY trust row for every workflow/event/actor/ref combination.
- requiredFields=workflowId,event,actorClass,sourceRef,checkedOutRef,artifactTrust,cacheTrust,tokenScopes,environment,decision.
- proof=Fork, edited workflow, privileged target, workflow-run artifact, issue comment, dispatch and unknown combination vectors deny.
- failure=WORKFLOW-TRUST-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.27 PRCV3-REQ-026

- outputObjectId=PRCV3-OBJECT-026.
- outputType=ContextTaintAndArgumentPolicy.
- soleProducerId=PRCV3-PRODUCER-026.
- dependencies=PRCV3-REQ-024,PRCV3-REQ-025.
- findingIds=PRCS-HR-F002.
- statement=Prevent attacker-controlled context interpolation and argument substitution.
- requiredFields=source,taintClass,sink,typedBoundary,sanitizer,argumentSchema,outputProvenance.
- proof=Every tainted source-to-sink path crosses an approved typed boundary; injection or substitution denies without side effect.
- failure=CONTEXT-TAINT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.28 PRCV3-REQ-027

- outputObjectId=PRCV3-OBJECT-027.
- outputType=WorkflowPrivilegeGraph.
- soleProducerId=PRCV3-PRODUCER-027.
- dependencies=PRCV3-REQ-023,PRCV3-REQ-025,PRCV3-REQ-026.
- findingIds=PRCS-HR-F003,PRCS-HR-F005,PRCS-HR-F017.
- statement=Separate untrusted build/test from signer, OIDC, deployment and release privilege.
- requiredFields=jobId,trustDomain,permissions,inputDigests,outputDigests,transitionPolicy,sideEffects.
- proof=No untrusted path reaches write token, Secret, environment or signer except a digest-bound validated transition.
- failure=PRIVILEGE-GRAPH-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.29 PRCV3-REQ-028

- outputObjectId=PRCV3-OBJECT-028.
- outputType=CacheArtifactTrustRegistry.
- soleProducerId=PRCV3-PRODUCER-028.
- dependencies=PRCV3-REQ-012,PRCV3-REQ-024,PRCV3-REQ-027.
- findingIds=PRCS-HR-F003,PRCS-HR-F017.
- statement=Partition caches and bind artifacts before privileged reuse.
- requiredFields=trustDomain,namespace,producerWorkflow,run,head,digest,schema,scanRoot,retention,purge.
- proof=Low-trust restore or producer/head/digest/schema/retention mismatch denies consumption.
- failure=CACHE-ARTIFACT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.30 PRCV3-REQ-029

- outputObjectId=PRCV3-OBJECT-029.
- outputType=RunnerEnvironmentRegistry.
- soleProducerId=PRCV3-PRODUCER-029.
- dependencies=PRCV3-REQ-013,PRCV3-REQ-023,PRCV3-REQ-027.
- findingIds=PRCS-HR-F018,PRCS-HR-F031.
- statement=Bind runner image, tools, downloads, egress and workspace inheritance.
- requiredFields=runnerLabel,resolvedImage,sbom,tools,downloads,egressPolicy,workspaceBoundary,hermeticityExceptions.
- proof=Unknown image, host, download, checksum or workspace inheritance denies; credentials never precede untrusted install.
- failure=RUNNER-ENVIRONMENT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.31 PRCV3-REQ-030

- outputObjectId=PRCV3-OBJECT-030.
- outputType=RequiredCheckRegistry.
- soleProducerId=PRCV3-PRODUCER-030.
- dependencies=PRCV3-REQ-024,PRCV3-REQ-025.
- findingIds=PRCS-HR-F013.
- statement=Bind required checks to exact source and tested SHA, including merge-group behavior.
- requiredFields=checkName,expectedApp,event,workflowRoot,headOrMergeGroupSha,freshness,invalidation.
- proof=Wrong-source, stale, skipped, missing or wrong-SHA status denies.
- failure=REQUIRED-CHECK-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.32 PRCV3-REQ-031

- outputObjectId=PRCV3-OBJECT-031.
- outputType=CodeOwnershipReviewRegistry.
- soleProducerId=PRCV3-PRODUCER-031.
- dependencies=PRCV3-REQ-003,PRCV3-REQ-011,PRCV3-REQ-019.
- findingIds=PRCS-HR-F014.
- statement=Protect CODEOWNERS/workflows with catch-all, validated patterns and an independent second approval.
- requiredFields=pathPattern,owners,sensitiveClass,baseBranch,syntaxState,secondApprovalRule,selfReviewRule.
- proof=Invalid ownership, one-owner-only, self-review or unprotected ownership change denies.
- failure=CODE-OWNERSHIP-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.33 PRCV3-REQ-032

- outputObjectId=PRCV3-OBJECT-032.
- outputType=BypassSurfaceRegistry.
- soleProducerId=PRCV3-PRODUCER-032.
- dependencies=PRCV3-REQ-003,PRCV3-REQ-005,PRCV3-REQ-031.
- findingIds=PRCS-HR-F008,PRCS-HR-F015.
- statement=Separate deny-by-default branch, tag, push-protection, environment, Actions, release and expunging bypasses.
- requiredFields=surface,actors,purpose,ticket,secondApprover,scope,expiry,postReadback,zeroUseReview.
- proof=Unlisted, self, admin, stale, overbroad or unreviewed bypass denies.
- failure=BYPASS-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.34 PRCV3-REQ-033

- outputObjectId=PRCV3-OBJECT-033.
- outputType=BranchTagRulesetContract.
- soleProducerId=PRCV3-PRODUCER-033.
- dependencies=PRCV3-REQ-030,PRCV3-REQ-031,PRCV3-REQ-032.
- findingIds=PRCS-HR-F001,PRCS-HR-F013,PRCS-HR-F014,PRCS-HR-F015,PRCS-HR-F032.
- statement=Define separate exact active branch and tag Rulesets while PUBLIC.
- requiredFields=refClass,patterns,rules,checks,reviewPolicy,updateDeletePolicy,bypassActors,signatureDecision.
- proof=Force/update/delete, stale approval, wrong check source, one-person sensitive review or wrong signature behavior denies.
- failure=RULESET-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.35 PRCV3-REQ-034

- outputObjectId=PRCV3-OBJECT-034.
- outputType=GitHubControlPlaneChangeStateMachine.
- soleProducerId=PRCV3-PRODUCER-034.
- dependencies=PRCV3-REQ-004,PRCV3-REQ-005,PRCV3-REQ-015,PRCV3-REQ-024,PRCV3-REQ-033.
- findingIds=PRCS-HR-F008,PRCH2V2-IHR-F050.
- statement=Authorize GitHub settings changes separately from code Push with exact before/after CAS and rollback.
- requiredFields=beforeRoot,operationSet,actor,permit,ordering,partialFailure,rollback,afterRoot,readback.
- proof=Wrong repository, stale before-state, omitted/reordered operation, partial apply, concurrent change or mismatched readback denies.
- failure=GITHUB-CONTROL-PLANE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.36 PRCV3-REQ-035

- outputObjectId=PRCV3-OBJECT-035.
- outputType=PrivilegedIdentityRegistry.
- soleProducerId=PRCV3-PRODUCER-035.
- dependencies=PRCV3-REQ-003,PRCV3-REQ-005,PRCV3-REQ-032,PRCV3-REQ-034.
- findingIds=PRCS-HR-F008.
- statement=Bind every human, App, token, deploy key and recovery identity to least privilege and lifecycle.
- requiredFields=identityId,class,owner,role,scope,credentialClass,expiry,revocation,breakGlass.
- proof=Unknown admin, classic PAT, write deploy key, permanent bypass or failed revocation denies.
- failure=PRIVILEGED-IDENTITY-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.37 PRCV3-REQ-036

- outputObjectId=PRCV3-OBJECT-036.
- outputType=ProviderOIDCPolicySet.
- soleProducerId=PRCV3-PRODUCER-036.
- dependencies=PRCV3-REQ-024,PRCV3-REQ-027,PRCV3-REQ-029,PRCV3-REQ-035.
- findingIds=PRCS-HR-F003,PRCS-HR-F004,PRCS-HR-F019,PRCH2V2-IHR-F046.
- statement=Produce one exact provider-specific OIDC policy per selected role after the neutral identity model.
- requiredFields=provider,role,issuer,audience,subjectClaims,repositoryId,workflowId,environment,ref,scope,ttl,replay,revocation,readback.
- proof=Omitted role, wrong claim/audience/ref/environment/repository, replay, expiry or long-lived fallback denies.
- failure=OIDC-POLICY-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.38 PRCV3-REQ-037

- outputObjectId=PRCV3-OBJECT-037.
- outputType=EnvironmentDispatchRegistry.
- soleProducerId=PRCV3-PRODUCER-037.
- dependencies=PRCV3-REQ-025,PRCV3-REQ-032,PRCV3-REQ-036.
- findingIds=PRCS-HR-F004,PRCS-HR-F019.
- statement=Separate staging/production and bind dispatch, review, inputs, concurrency and Secret release.
- requiredFields=environment,reviewers,preventSelfReview,protectedRefs,actorSchema,inputSchema,concurrencyFence,secretReleasePoint.
- proof=Wrong actor/ref/input, self-review, duplicate concurrency or pre-approval Secret access denies.
- failure=ENVIRONMENT-DISPATCH-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.39 PRCV3-REQ-038

- outputObjectId=PRCV3-OBJECT-038.
- outputType=DeploymentStateMachine.
- soleProducerId=PRCV3-PRODUCER-038.
- dependencies=PRCV3-REQ-005,PRCV3-REQ-013,PRCV3-REQ-027,PRCV3-REQ-029,PRCV3-REQ-036,PRCV3-REQ-037.
- findingIds=PRCH2V2-IHR-F052.
- statement=Bind deployment target, plan/apply, health, drift, data compatibility and tested rollback.
- requiredFields=target,desiredRoot,currentRoot,plan,approval,applyReceipt,healthChecks,drift,dataCompatibility,rollback.
- proof=Wrong target/config/artifact, stale plan, partial apply, concurrent deploy, health failure, drift or unsafe rollback denies.
- failure=DEPLOYMENT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.40 PRCV3-REQ-039

- outputObjectId=PRCV3-OBJECT-039.
- outputType=ReproducibleBuildRegistry.
- soleProducerId=PRCV3-PRODUCER-039.
- dependencies=PRCV3-REQ-012,PRCV3-REQ-013,PRCV3-REQ-022,PRCV3-REQ-023,PRCV3-REQ-029.
- findingIds=PRCS-HR-F031,PRCH2V2-IHR-F059.
- statement=Bind complete build recipe/materials and reproducibility or explicit bounded variance.
- requiredFields=artifactClass,sourceTree,materials,recipe,toolchain,environment,flags,variancePolicy,independentRebuild.
- proof=Omitted or substituted source/material/tool/flag/environment, digest mismatch or unexplained nondeterminism denies.
- failure=REPRODUCIBLE-BUILD-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.41 PRCV3-REQ-040

- outputObjectId=PRCV3-OBJECT-040.
- outputType=ReleaseIdentityRegistry.
- soleProducerId=PRCV3-PRODUCER-040.
- dependencies=PRCV3-REQ-021,PRCV3-REQ-022,PRCV3-REQ-023,PRCV3-REQ-033,PRCV3-REQ-039.
- findingIds=PRCS-HR-F001,PRCS-HR-F020,PRCH2V2-IHR-F040.
- statement=Bind protected tag, reviewed Commit, immutable release, assets, packages and consumer coordinates.
- requiredFields=tag,commit,release,assets,packages,digests,publisher,sourceArchive,versionPolicy.
- proof=Tag move/delete, asset replacement, coordinate/digest/publisher/source mismatch denies.
- failure=RELEASE-IDENTITY-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.42 PRCV3-REQ-041

- outputObjectId=PRCV3-OBJECT-041.
- outputType=AttestationConsumerRegistry.
- soleProducerId=PRCV3-PRODUCER-041.
- dependencies=PRCV3-REQ-005,PRCV3-REQ-027,PRCV3-REQ-036,PRCV3-REQ-039,PRCV3-REQ-040.
- findingIds=PRCS-HR-F001,PRCS-HR-F003,PRCS-HR-F005,PRCS-HR-F025,PRCH2V2-IHR-F059.
- statement=Bind attestation producer and independent consumer policy to exact artifact and build roots.
- requiredFields=predicateType,subjects,signer,repository,workflow,environment,transparencyPolicy,verificationTime,failureAction.
- proof=Wrong or missing subject, signer, repository, workflow, environment, bundle or prohibited metadata denies.
- failure=ATTESTATION-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.43 PRCV3-REQ-042

- outputObjectId=PRCV3-OBJECT-042.
- outputType=SLSAClaimRegistry.
- soleProducerId=PRCV3-PRODUCER-042.
- dependencies=PRCV3-REQ-000,PRCV3-REQ-041.
- findingIds=PRCS-HR-F005,PRCS-HR-F025.
- statement=Separate exact SLSA version, Source/Build Tracks and Levels with no presence-only credit.
- requiredFields=version,track,level,normativeRequirement,evidenceRoot,consumerPolicy,independentAssessment.
- proof=Any unproved requirement or attestation-only promotion leaves claim none.
- failure=SLSA-CLAIM-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.44 PRCV3-REQ-043

- outputObjectId=PRCV3-OBJECT-043.
- outputType=ReleaseIncidentRollbackStateMachine.
- soleProducerId=PRCV3-PRODUCER-043.
- dependencies=PRCV3-REQ-005,PRCV3-REQ-015,PRCV3-REQ-038,PRCV3-REQ-040,PRCV3-REQ-041.
- findingIds=PRCS-HR-F001,PRCS-HR-F006,PRCS-HR-F020,PRCH2V2-IHR-F053.
- statement=Handle bad releases through immutable successor, trust revocation, consumer notice and compatible rollback.
- requiredFields=releaseCoordinate,detection,trustRevocation,yankOrDeprecate,successor,consumerNotice,rollbackCompatibility,residualCopies.
- proof=Compromised release cannot remain recommended; missing surface action, notification or reviewed rollback denies.
- failure=RELEASE-ROLLBACK-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.45 PRCV3-REQ-044

- outputObjectId=PRCV3-OBJECT-044.
- outputType=VulnerabilityDisclosureLifecycle.
- soleProducerId=PRCV3-PRODUCER-044.
- dependencies=PRCV3-REQ-005,PRCV3-REQ-019,PRCV3-REQ-040,PRCV3-REQ-043.
- findingIds=PRCS-HR-F023.
- statement=Define private coordinated vulnerability handling and independent fix verification.
- requiredFields=supportedVersions,scope,privateIntake,targets,severity,embargo,advisory,cveDecision,verification,publication,safeHarbor.
- proof=Public exploit detail, missed target, unverified fix or unauthorized publication denies.
- failure=VULNERABILITY-DISCLOSURE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.46 PRCV3-REQ-045

- outputObjectId=PRCV3-OBJECT-045.
- outputType=CyberIncidentResponseStateMachine.
- soleProducerId=PRCV3-PRODUCER-045.
- dependencies=PRCV3-REQ-005,PRCV3-REQ-015,PRCV3-REQ-017,PRCV3-REQ-018,PRCV3-REQ-032,PRCV3-REQ-034,PRCV3-REQ-035,PRCV3-REQ-036,PRCV3-REQ-038,PRCV3-REQ-043,PRCV3-REQ-044.
- findingIds=PRCS-HR-F006,PRCS-HR-F015,PRCH2V2-IHR-F054.
- statement=Cover identity, Ruleset, Action, dependency, runner, OIDC, signer, release, availability and evidence compromise.
- requiredFields=scenario,detection,authorityIsolation,revocation,evidencePreservation,blastRadius,eradication,recovery,verification,notification,invalidation.
- proof=Compromised evidence cannot self-attest recovery; every scenario reaches deterministic containment and re-rooted verification.
- failure=CYBER-INCIDENT-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.47 PRCV3-REQ-046

- outputObjectId=PRCV3-OBJECT-046.
- outputType=CyberSourceCustodySuite.
- soleProducerId=PRCV3-PRODUCER-046.
- dependencies=PRCV3-REQ-000,PRCV3-REQ-005.
- findingIds=PRCS-HR-F009,PRCS-HR-F010,PRCS-HR-F011,PRCS-HR-F027,PRCS-HR-F028,PRCS-HR-F030,PRCH2V2-IHR-F047,PRCH2V2-IHR-F057.
- statement=Produce closed source denominator, exact custody, conflict preservation and successor-only freshness.
- requiredFields=denominator,captures,conflicts,freshness,trustedTimeState,semanticDelta,affectedMappings,oldRootRetention.
- proof=Uncaptured, stale, conflicting, fetch-failed or unlicensed source remains BLOCKED or UNKNOWN.
- failure=CYBER-SOURCE-CUSTODY-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.48 PRCV3-REQ-047

- outputObjectId=PRCV3-OBJECT-047.
- outputType=AISecurityControlSuite.
- soleProducerId=PRCV3-PRODUCER-047.
- dependencies=PRCV3-REQ-005,PRCV3-REQ-023,PRCV3-REQ-036,PRCV3-REQ-046.
- findingIds=PRCS-HR-F011,PRCS-HR-F012,PRCS-HR-F027,PRCS-HR-F029,PRCS-HR-F030,PRCH2V2-IHR-F047.
- statement=Bind AI BOM, threat applicability, controls, TEVV, change invalidation and side-effect disablement.
- requiredFields=billOfMaterials,threatApplicability,controls,negativeTests,tevV,driftTriggers,incidentTriggers,residualRisk.
- proof=Unknown component/threat, poisoned context/tool/memory, stale approval, drift or failed evaluation disables side effects.
- failure=AI-SECURITY-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.49 PRCV3-REQ-048

- outputObjectId=PRCV3-OBJECT-048.
- outputType=OperationalEvidenceReadbackRegistry.
- soleProducerId=PRCV3-PRODUCER-048.
- dependencies=PRCV3-REQ-005,PRCV3-REQ-007,PRCV3-REQ-009,PRCV3-REQ-010,PRCV3-REQ-015,PRCV3-REQ-018,PRCV3-REQ-034,PRCV3-REQ-038,PRCV3-REQ-040,PRCV3-REQ-041,PRCV3-REQ-045,PRCV3-REQ-046,PRCV3-REQ-047.
- findingIds=PRCS-HR-F004,PRCS-HR-F008,PRCS-HR-F010,PRCS-HR-F030,PRCH2V2-IHR-F051,PRCH2V2-IHR-F058.
- statement=Define named local, GitHub, provider, deployment, release and consumer readback classes.
- requiredFields=readbackClass,producer,authority,endpointClass,requestRoot,responseRoot,subjectRoot,environment,timeReceipt,freshness,projection.
- proof=Missing, stale, mutable, inaccessible, conflicting or disclosure-unsafe evidence denies; a checkbox or positive run is insufficient.
- failure=OPERATIONAL-EVIDENCE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.50 PRCV3-REQ-049

- outputObjectId=PRCV3-OBJECT-049.
- outputType=ConformanceOperationOracleRegistry.
- soleProducerId=PRCV3-PRODUCER-049.
- dependencies=PRCV3-REQ-001,PRCV3-REQ-007,PRCV3-REQ-048.
- findingIds=PRCS-HR-F009,PRCH2V2-IHR-F043,PRCH2V2-IHR-F044,PRCH2V2-IHR-F045.
- statement=Define finite canonical mutation operations and causal field oracles executable without prose.
- requiredFields=operationId,finiteKind,inputSchema,mutationSchema,oracleKind,terminalMap,implementationRoot.
- proof=Unsupported operation, unknown field, oracle mismatch, implementation absence or prose fallback denies.
- failure=CONFORMANCE-ORACLE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.51 PRCV3-REQ-050

- outputObjectId=PRCV3-OBJECT-050.
- outputType=NegativeVectorRegistry.
- soleProducerId=PRCV3-PRODUCER-050.
- dependencies=PRCV3-REQ-008,PRCV3-REQ-049.
- findingIds=PRCS-HR-F002,PRCS-HR-F006,PRCS-HR-F007,PRCS-HR-F012,PRCS-HR-F013,PRCS-HR-F014,PRCS-HR-F015,PRCS-HR-F016,PRCS-HR-F017,PRCS-HR-F018,PRCS-HR-F019,PRCS-HR-F020,PRCS-HR-F021,PRCS-HR-F022,PRCS-HR-F023,PRCS-HR-F024,PRCS-HR-F025,PRCS-HR-F026,PRCS-HR-F027,PRCS-HR-F028,PRCS-HR-F029,PRCS-HR-F031,PRCS-HR-F032,PRCH2V2-IHR-F043.
- statement=Provide exactly one separately traceable executable negative vector per admitted Finding.
- requiredFields=vectorId,findingId,targetObjectId,preimage,operation,oracle,expectedTerminal.
- proof=Exactly 59 vectors execute; omission, duplicate Finding, range, Merge, presence-only body or terminal mismatch denies.
- failure=NEGATIVE-VECTOR-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.52 PRCV3-REQ-051

- outputObjectId=PRCV3-OBJECT-051.
- outputType=FindingClosureRegistry.
- soleProducerId=PRCV3-PRODUCER-051.
- dependencies=PRCV3-REQ-008,PRCV3-REQ-048,PRCV3-REQ-050.
- findingIds=PRCH2V2-IHR-F048,PRCH2V2-IHR-F049.
- statement=Bind every admitted Finding to exact Requirements, vector, evidence and independent disposition.
- requiredFields=findingId,severity,noMergeKey,sourceReviewRoot,requirementIds,vectorId,closureTest,evidenceRoots,accepted.
- proof=Exactly 59 detached records exist; any orphan, duplicate, range, Merge, suppression, absent evidence or self-closure denies.
- failure=FINDING-CLOSURE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.53 PRCV3-REQ-052

- outputObjectId=PRCV3-OBJECT-052.
- outputType=ReviewReconciliationEnvelope.
- soleProducerId=PRCV3-PRODUCER-052.
- dependencies=PRCV3-REQ-005,PRCV3-REQ-008,PRCV3-REQ-051.
- findingIds=PRCH2V2-IHR-F048.
- statement=Reconcile every current review without a 32-only ceiling or scope suppression.
- requiredFields=reviewUniverseRoot,reviewerEligibility,independence,findings,dispositions,objections,veto,appeal,expiry,revocation.
- proof=Author/self review, omitted Finding, collusion, invalid disposition, veto, stale or reordered event denies.
- failure=REVIEW-RECONCILIATION-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.54 PRCV3-REQ-053

- outputObjectId=PRCV3-OBJECT-053.
- outputType=CyberAcceptanceEnvelope.
- soleProducerId=PRCV3-PRODUCER-053.
- dependencies=PRCV3-REQ-002,PRCV3-REQ-004,PRCV3-REQ-007,PRCV3-REQ-021,PRCV3-REQ-034,PRCV3-REQ-038,PRCV3-REQ-040,PRCV3-REQ-043,PRCV3-REQ-045,PRCV3-REQ-048,PRCV3-REQ-051,PRCV3-REQ-052.
- findingIds=PRCH2V2-IHR-F048,PRCH2V2-IHR-F049,PRCH2V2-IHR-F051.
- statement=Bind the complete package, every admitted Finding and current observation root in one acceptance CAS.
- requiredFields=subjectRoot,packageRoot,dependencyHeads,findingUniverseRoot,observationRoots,evidenceRoots,residualRisks,scope,epoch,expiry,acceptedPointer.
- proof=Any open Finding, absent implementation/evidence, stale observation, changed dependency or missing authority keeps Acceptance zero.
- failure=CYBER-ACCEPTANCE-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.55 PRCV3-REQ-054

- outputObjectId=PRCV3-OBJECT-054.
- outputType=PublicPushPermit.
- soleProducerId=PRCV3-PRODUCER-054.
- dependencies=PRCV3-REQ-009,PRCV3-REQ-010,PRCV3-REQ-021,PRCV3-REQ-025,PRCV3-REQ-033,PRCV3-REQ-034,PRCV3-REQ-045,PRCV3-REQ-053.
- findingIds=PRCS-HR-F001,PRCS-HR-F002,PRCH2V2-IHR-F033,PRCH2V2-IHR-F034,PRCH2V2-IHR-F035,PRCH2V2-IHR-F038,PRCH2V2-IHR-F040,PRCH2V2-IHR-F049.
- statement=Permit only one exact atomic Public Push after full Acceptance and fresh current-head/time/readback checks.
- requiredFields=permitId,repositoryId,ref,expectedOldOid,newOid,objectSetRoot,allowlistRoot,observationRoots,evidenceRoots,issuedAt,expiresAt,revocation,oneUse,casState.
- proof=Missing, stale, conflicting, replayed, expired, revoked, used, wrong-head, extra-object or non-atomic transition denies; visibility remains PUBLIC.
- failure=PUBLIC-PUSH-BLOCKED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

## 3.56 PRCV3-REQ-055

- outputObjectId=PRCV3-OBJECT-055.
- outputType=PrivilegedDeployReleasePermitAndFinalAssertion.
- soleProducerId=PRCV3-PRODUCER-055.
- dependencies=PRCV3-REQ-036,PRCV3-REQ-037,PRCV3-REQ-038,PRCV3-REQ-040,PRCV3-REQ-041,PRCV3-REQ-042,PRCV3-REQ-043,PRCV3-REQ-045,PRCV3-REQ-053,PRCV3-REQ-054.
- findingIds=PRCS-HR-F001,PRCS-HR-F003,PRCS-HR-F004,PRCS-HR-F005,PRCH2V2-IHR-F049.
- statement=Separate privileged deploy/release authority from Push and assert bounded v3 acceptance only after every dependency and all 59 Findings close.
- requiredFields=deployPermit,releasePermit,artifactRoot,environmentRoot,providerPolicyRoot,releaseRoot,consumerReadbacks,findingClosures,acceptanceState.
- proof=Push PASS cannot satisfy deploy/release; implementation/evidence roots are absent, so current Acceptance remains zero and Gate29 remains BLOCKED.
- failure=PUBLIC-CYBER-V3-NOT-ACCEPTED.
- implementationState=ABSENT;operationalEvidenceRoots=EMPTY;acceptanceCredit=0.

# 4. Finding closure and current state

4.1 admitted Finding identities=59/59:32 predecessor identities and27 v2-review identities.

4.2 closure records=59/59;negative vector bodies=59/59;accepted closures=0/59.

4.3 Requirements=56;declared outputs=56;declared sole producers=56;implemented producers=0;operational Evidence roots=0.

4.4 two independent stdlib reader reports are package members and validate syntax, topology, exact identity mapping and finite vector execution only.

4.5 fresh independent hostile review, accepted external authority roots, implemented producers and operational evidence remain absent.

4.6 Subject Acceptance=0;Public Push Permit=ABSENT;deploy Permit=ABSENT;release Permit=ABSENT.

4.7 repository remains PUBLIC;Gate29 remains BLOCKED;development freeze remains ACTIVE.

