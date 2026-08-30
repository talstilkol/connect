# 1. Connect — B0 successor requirements v2 Producer QA

## 1.1 QA identity and independence boundary

1.1.1 `artifactId=CONNECT-B0-SUCCESSOR-REQUIREMENTS-V2-PRODUCER-QA-2026-08-29`.

1.1.2 `qaClass=PRODUCER-QA; MECHANICAL-AND-SEMANTIC-SELF-CHECK; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE`.

1.1.3 Subject path=`/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v2-2026-08-29.md`.

1.1.4 Subject SHA-256=`7030c7b8ce0e3c7e3c74a89fee222af87aa51e3e448cfb91988c068d66efe8a4`.

1.1.5 Subject physical identity=`824 lines; 72393 bytes`.

1.1.6 Predecessor Subject SHA-256=`678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb`.

1.1.7 Frozen hostile-review SHA-256=`56631b6c02b57f21adc363245754fedf44fc4d35baf733cfb362bbcd01ae7e3b`.

1.1.8 Frozen hostile-Finding manifest SHA-256=`0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355`.

1.1.9 This QA was created after the Subject Root in 1.1.4 was frozen. Any Subject byte change invalidates this QA and requires a new immutable successor and QA.

## 1.2 Claim boundary

1.2.1 This QA does not accept a Requirement, close a Finding, authenticate Tal, create B0, create a Permit or grant authority.

1.2.2 Repository visibility remains bindingly `PUBLIC`; no Private remediation is proposed.

1.2.3 No Product, Build, Runtime, Git, GitHub, provider, credential, purchase, deployment or external-state action was performed.

# 2. Mechanical QA

## 2.1 Reader independence

2.1.1 Reader 1 used a Node parser over Requirement headings, exact field labels, dependencies, Outputs, preservation/address tokens, source references, crosswalks, vector-set rows and numbered clauses.

2.1.2 Reader 2 used a separately written Ruby parser, Kahn topological traversal, independent row counters and an independent numbered-clause duplicate scan.

2.1.3 Both readers consumed the exact Subject bytes rooted in §1.1.4.

## 2.2 Requirement shape

2.2.1 Requirement headings=`49`.

2.2.2 Unique sequence=`B0V2REQ-000`–`B0V2REQ-048`; gaps=`0`; duplicates=`0`.

2.2.3 Rows with exactly the required five fields=`49/49`; missing-field rows=`0`; extra-field rows=`0`.

2.2.4 Unique aligned Output IDs=`49/49`; each statement contains exactly one aligned `B0V2OUT-nnn`.

2.2.5 Preserved predecessor tokens=`27/27`; unique=`27`; aligned `B0REQ-000`–`B0REQ-026`.

2.2.6 Addressed Finding tokens=`22/22`; unique=`22`; aligned `B0-HR-F001`–`B0-HR-F022`.

## 2.3 Dependency graph

2.3.1 Dependency edges=`233`.

2.3.2 Unknown targets=`0`; self-edges=`0`; duplicate edges within a Requirement=`0`; forward references=`0`.

2.3.3 Reader 2 topological traversal visited=`49/49`; cycles=`0`.

2.3.4 Backward-order predicate passed for every edge.

## 2.4 Provenance and registries

2.4.1 `sourceBasis` rows=`49/49`.

2.4.2 Exact-root+locator source references=`83`; malformed references=`0`; unknown aliases=`0`; wrong indexed digest=`0`; missing locators=`0`.

2.4.3 Predecessor preservation crosswalk rows=`27`; missing/duplicate=`0`.

2.4.4 Hostile-Finding crosswalk rows=`22`; severity count=`P0:14;P1:8`; missing/duplicate=`0`.

2.4.5 NegativeVectorRegistry rows=`49`; Requirement mapping=`49/49`; every requiredProof contains one aligned vector-set ID.

2.4.6 Numbered clauses=`292`; duplicate numbered clause identities=`0`.

## 2.5 Mechanical verdict

2.5.1 Reader 1 verdict=`PASS-CANDIDATE-MECHANICAL-CONTRACT`.

2.5.2 Reader 2 verdict=`PASS-CANDIDATE-MECHANICAL-CONTRACT`.

2.5.3 Mechanical PASS is not semantic Acceptance and cannot close any predecessor Finding.

# 3. Producer semantic self-check

## 3.1 Lossless preservation

3.1.1 All 27 predecessor identities are preserved one-to-one in `B0V2REQ-000`–`B0V2REQ-026` and retain the original obligations for completeness, external Tal authority, detachment, canonical mandate, precedence, class/Act allowlists, one-use Permit, roles, deterministic identity, serialization, freeze, review, Public safety, denied capabilities, time, revocation, evidence, Findings, Acceptance, CAS, readbacks, observations, two generations and negative totality.

3.1.2 Preservation does not import predecessor Acceptance. Every preservation row remains `OPEN-PENDING-INDEPENDENT-REVIEW`.

## 3.2 One-to-one hostile remediation

3.2.1 `B0-HR-F001` has a dedicated exact-root SourceReferenceIndex Requirement.

3.2.2 `B0-HR-F002` has a dedicated navigation/provenance/authority separation Requirement.

3.2.3 `B0-HR-F003` has a dedicated external Tal trust, authentication, verifier, challenge, rotation and compromise Requirement.

3.2.4 `B0-HR-F004` has a dedicated acyclic externally rooted GenesisAuthority Requirement.

3.2.5 `B0-HR-F005` has a dedicated independently bootstrapped review-authority Requirement with an exact two-Reviewer denominator.

3.2.6 `B0-HR-F006` has a dedicated finite path/schema/effect/egress/capability scope Requirement.

3.2.7 `B0-HR-F007` has a dedicated atomic Permit reservation, fencing, consume+effect and response-loss Requirement.

3.2.8 `B0-HR-F008` has a dedicated revoke-wins in-flight epoch/head/fencing Requirement.

3.2.9 `B0-HR-F009` has a dedicated authenticated Appointment issuance, quorum, conflict and backup-selection Requirement.

3.2.10 `B0-HR-F010` has a dedicated canonical-byte, SHA-256, Ed25519, key-state, rotation, compromise and collision Requirement.

3.2.11 `B0-HR-F011` has a dedicated classification-aware Public commitment Requirement that retains private Evidence outside the Public repository.

3.2.12 `B0-HR-F012` has a dedicated complete security-root closure Requirement.

3.2.13 `B0-HR-F013` has a dedicated Acceptance dependency and approval denominator Requirement.

3.2.14 `B0-HR-F014` has a dedicated response-loss and `COMMITTED-UNCONFIRMED` Requirement; it never assumes no grant.

3.2.15 `B0-HR-F015` has a dedicated two-source/readback independence and one-revision Requirement.

3.2.16 `B0-HR-F016` has a dedicated observation-nonauthority and fenced reducer Requirement.

3.2.17 `B0-HR-F017` has a dedicated zero-authority staged two-generation Requirement that cannot issue Permits or become current.

3.2.18 `B0-HR-F018` has a dedicated finite Cartesian state/event matrix and safe-terminal Requirement.

3.2.19 `B0-HR-F019` has a dedicated fork-detecting, access-controlled, classified Evidence-custody Requirement.

3.2.20 `B0-HR-F020` has a dedicated external trusted-time source, skew, rollback, outage and duration-decision Requirement.

3.2.21 `B0-HR-F021` has a dedicated staged atomic publication, quarantine and successor-only recovery Requirement.

3.2.22 `B0-HR-F022` has a dedicated machine-bound 27+22 closure denominator Requirement.

3.2.23 The 22 Findings remain separate and retain their original noMerge identities. Candidate dispositions are not transferred across Findings.

## 3.3 Critical invariants

3.3.1 Authority proof is external to B0 and depends on an authenticated Tal trust path; the Subject and its Producer have zero authority credit.

3.3.2 Genesis and bootstrap review follow a strictly layered DAG; conformance generations have zero operational authority.

3.3.3 Permit reservation, effect staging, consumption, revocation fencing, CAS and terminal recording are specified as one fenced lifecycle with no same-Attempt retry.

3.3.4 Identity, serialization, signatures, key lifecycle, trusted time, disclosure classification, Evidence custody, Acceptance envelope and current-state reduction are explicit security dependencies.

3.3.5 `COMMITTED-CONFIRMED` is the only terminal eligible for usable authority; all uncertainty and failure terminals have zero authority.

3.3.6 The Public invariant is monotonic. A rollback cannot change repository visibility to Private or disclose private Evidence.

3.3.7 Deterministic identity uses no `Math.random` and no `crypto.randomUUID`.

# 4. Open acceptance work

## 4.1 Required independent checks

4.1.1 Two independently appointed hostile Reviewers must inspect the same presealed exact Subject Root without reading this Producer QA before their Finding sets are sealed.

4.1.2 Each Review must test all 27 preservation rows, all 22 frozen hostile predicates, all 49 source rows, the 233-edge DAG, all 49 Output contracts, all 49 Negative-vector sets and the authorization/genesis graph.

4.1.3 Review must specifically challenge algorithm/profile sufficiency, external trust-anchor admissibility, genesis authority limits, Reviewer cardinality, Permit/effect atomicity, revoke-wins races, split-brain recovery, Public commitment leakage, full Acceptance-envelope closure and finite terminal totality.

4.1.4 Comparison and Reconciliation may link successor evidence but may not edit, merge, downgrade or close reviewer-local Findings.

4.1.5 Any Subject byte delta creates a new successor Root and invalidates this QA and all Reviews of the old Root.

## 4.2 Evidence still absent

4.2.1 No external AuthorityTrustProfile instance, authenticated Tal exact-root receipt, accepted CanonicalMandate Root, Genesis receipt, Appointment set or accepted BootstrapReviewProtocol exists in this QA.

4.2.2 None of the 49 required Outputs has implementation/conformance Evidence merely because its Requirement is present.

4.2.3 G1/G2 conformance Evidence, full transition-matrix Evidence, Permit race Evidence, CAS/readback Evidence and Public disclosure Evidence are absent.

4.2.4 Therefore `acceptedRequirementCount=0/49` and `closedFindingCount=0/22`.

# 5. Producer verdict

## 5.1 Status

5.1.1 `producerMechanicalVerdict=PASS-CANDIDATE-SHAPE-PROVENANCE-AND-DAG`.

5.1.2 `producerSemanticCoverageVerdict=READY-FOR-INDEPENDENT-HOSTILE-REVIEW; NOT-ACCEPTED`.

5.1.3 `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`.

5.1.4 Product completion percentage, Product remaining hours, Planning remaining hours and calendar ETA remain `unknown/unavailable`.

5.1.5 This QA creates no Product, Git, GitHub, provider or external-state authority.
