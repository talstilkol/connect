# 1. Connect — Three-review Protocol v1.4 independent hostile-review Findings Manifest

## 1.1 Identity and authority boundary

1.1.1 `manifestId=CONNECT-THREE-REVIEW-PROTOCOL-V1-4-SUCCESSOR-REQUIREMENTS-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-2026-08-29`.

1.1.2 reviewed Subject path=`/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-4-successor-requirements-2026-08-29.md`.

1.1.3 reviewed Subject raw SHA-256=`0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af`; physical identity=`1320 lines;189350 bytes`.

1.1.4 review independence rule=`findings frozen without reading the v1.4 Producer QA artifact`.

1.1.5 authority state=`EXTERNAL-B0-ROOT-UNKNOWN/UNAVAILABLE`; therefore this Manifest is an independent hostile-review observation only and grants no Requirement Acceptance, Finding Closure, Protocol Admission, Publication permit or Gate credit.

1.1.6 disposition=`REJECT-SUCCESSOR-CANDIDATE;NEW-IMMUTABLE-SUCCESSOR-REQUIRED`.

1.1.7 record denominator=`15`; severity vector=`P0=7,P1=7,P2=1,P3=0`; open=`15`; closed=`0`; merged=`0`; suppressed=`0`; riskAccepted=`0`.

1.1.8 every record below contains exactly ten fields: `findingId`, `severity`, `locator`, `defect`, `impact`, `requiredDelta`, `acceptancePredicate`, `sourceBasis`, `state`, `noMergeKey`.

1.1.9 `noMergeKey=findingId`. Shared topic, source Finding, target Requirement, dependency or remediation never transfers Closure.

# 2. P0 Findings

## 2.1 `MPRR-V14-HR-F001`

2.1.1 `findingId`: `MPRR-V14-HR-F001`.

2.1.2 `severity`: `P0`.

2.1.3 `locator`: `subject:§1.2.7-§1.2.8;§1.3.1-§1.3.4;MPRR-V14-REQ-006;MPRR-V14-REQ-007;all 105 sourceBasis references`.

2.1.4 `defect`: `all 105 sourceBasis strings are syntactically rooted aliases, but the Subject itself says those aliases are navigation-only and requires a canonical NamespaceEntryRoot plus byte-identical SourceMember proof; no detached NamespaceEntry or member-resolution evidence for these 105 references is bound to the Candidate`.

2.1.5 `impact`: `the 57 predecessor-preservation claims and 24 Finding remediations have zero eligible provenance under the Candidate's own rules, so token and raw-artifact-root presence can be mistaken for source membership and exact field preservation`.

2.1.6 `requiredDelta`: `publish a detached exact-root SourceReferenceIndex for this Candidate containing canonical NamespaceEntryRoot, typed carrier roots, canonical member locator, parser/schema root, exact byte extent or extracted bytes, member digest and cardinality-one proof for every one of the 105 references; bind its root into every admission packet and reject raw-artifact-root substitution`.

2.1.7 `acceptancePredicate`: `two independently implemented resolvers return the same 105 canonical member records; resolved=105,unresolved=0,ambiguous=0,duplicate=0,carrierSubstitution=0,rawAliasAsNamespaceRoot=0; any mismatch returns SOURCE-GRAPH-INVALID and no source or preservation credit`.

2.1.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Findings MPRR-V13-HR-F001 and MPRR-V13-HR-F002`.

2.1.9 `state`: `OPEN`.

2.1.10 `noMergeKey`: `MPRR-V14-HR-F001`.

## 2.2 `MPRR-V14-HR-F002`

2.2.1 `findingId`: `MPRR-V14-HR-F002`.

2.2.2 `severity`: `P0`.

2.2.3 `locator`: `subject:§1.2.6-§1.2.7;MPRR-V14-REQ-001-024;MPRR-V14-REQ-025-081;§5.1.1-§5.1.3`.

2.2.4 `defect`: `the Subject defines the semantic uses graph to equal the 621 dependency tuples by assertion, but provides no machine named-use inventory proving exhaustiveness; early requirements use later Terminal, engine, serializer, authority, receipt and state-machine concepts without a dependency or an enumerated external-B0 member, while preserved predecessor fields retain V13 dependency identifiers whose translation semantics are not defined inside the sole local edge graph`.

2.2.5 `impact`: `the mechanical graph is a valid DAG while the actual prerequisite graph can contain omitted or forward uses; a requirement may be accepted before the control that gives its terms meaning, recreating the exact defect reported as MPRR-V13-HR-F005`.

2.2.6 `requiredDelta`: `emit one canonical NamedUseManifest row for every referenced type, schema, constructor, policy, authority, engine, state machine, terminal and output; each row must bind consumerRequirementId, symbol, providerKind, providerRequirementId or exact external-B0 member, edgeType and source span; explicitly translate inherited V13 dependency fields to V14 identities and reorder requirements until all local providers are earlier`.

2.2.7 `acceptancePredicate`: `two lexical-plus-semantic extractors produce an identical named-use multiset and identical typed dependency multiset; unknown=0,self=0,duplicate=0,forward=0,cycle=0,implicit=0,untranslatedInheritedUse=0,semanticMissingEdge=0; every external use resolves to one admitted B0 member and unresolved external use blocks`.

2.2.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F005`.

2.2.9 `state`: `OPEN`.

2.2.10 `noMergeKey`: `MPRR-V14-HR-F002`.

## 2.3 `MPRR-V14-HR-F003`

2.3.1 `findingId`: `MPRR-V14-HR-F003`.

2.3.2 `severity`: `P0`.

2.3.3 `locator`: `subject:MPRR-V14-REQ-024;§3.3.1-§3.3.2`.

2.3.4 `defect`: `MPRR-V14-REQ-024 requires each of the 91 closure rows to bind complete successor target Set, revised field paths, vector IDs, one canonical terminal, residual risk and an independent exact-root verdict; the §3.3 table contains only family, source tuple, carrier locator, target Set, Producer status and independent status`.

2.3.5 `impact`: `a row can preserve an identifier mapping while losing a source field, test, safe terminal or residual risk; all 91 rows can appear present even though the required semantic Closure records do not exist`.

2.3.6 `requiredDelta`: `replace the navigation table with a detached canonical 91-record Closure Manifest containing every field demanded by MPRR-V14-REQ-024, including exact revised field paths, dedicated vector roots, terminal tuple, residual-risk record and independent receipt bound to the exact successor root; PARTIAL and ABSENT must be machine-blocking`.

2.3.7 `acceptancePredicate`: `two parsers return exactly 91 unique source obligations and every row has a non-empty complete target Set, field-delta Set, executable vector Set, one registered Terminal tuple, residual-risk state and exact-root independent status; FULL=91 only after independent proof and any missing field returns SEMANTIC-COVERAGE-BLOCKED`.

2.3.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F008`.

2.3.9 `state`: `OPEN`.

2.3.10 `noMergeKey`: `MPRR-V14-HR-F003`.

## 2.4 `MPRR-V14-HR-F004`

2.4.1 `findingId`: `MPRR-V14-HR-F004`.

2.4.2 `severity`: `P0`.

2.4.3 `locator`: `subject:§4.1.1-§4.1.25;§4.2.1-§4.2.13;MPRR-V14-REQ-001-024 requiredProofPredicate fields`.

2.4.4 `defect`: `the 24 dedicated vectors use the mutation label violate:<FindingId> and the 12 compound vectors use short prose descriptions; none binds canonical input bytes/root, exact mutated field/path and value, preconditions, engine and policy roots, execution steps, expected observations, readbacks or evidence root`.

2.4.5 `impact`: `the vector denominator is token presence rather than an executable adversarial corpus; an implementation can claim all 36 vectors while never exercising the stated defect, so none of the 24 predecessor Findings is truly proven closed`.

2.4.6 `requiredDelta`: `define a canonical NegativeVector schema and instantiate 36 executable records with exact fixtures from real frozen artifacts, mutation operation, pre-state, authority and time context, expected single terminal tuple, prohibited side effects, observation/readback assertions and deterministic replay root; add boundary and pairwise-overlap vectors where one mutation triggers multiple controls`.

2.4.7 `acceptancePredicate`: `two independent runners replay all 36 exact-root vectors and agree byte-for-byte on terminal and side-effect evidence; generic labels=0,missingFixture=0,missingMutationPath=0,missingPrecondition=0,missingReadback=0,unexpectedDurableWrite=0; stale, replayed and subject-substituted variants remain blocked`.

2.4.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;all 24 V13 hostile Findings`.

2.4.9 `state`: `OPEN`.

2.4.10 `noMergeKey`: `MPRR-V14-HR-F004`.

## 2.5 `MPRR-V14-HR-F005`

2.5.1 `findingId`: `MPRR-V14-HR-F005`.

2.5.2 `severity`: `P0`.

2.5.3 `locator`: `subject:MPRR-V14-REQ-016;MPRR-V14-REQ-017;§5.2.1-§5.2.2`.

2.5.4 `defect`: `Freshness requires a complete dependency-version vector and atomically fences the members supplied in that vector, but no authoritative DependencyHeadUniverseSnapshot with membership and non-membership proof establishes that every mutable dependency Head and revocation ledger was included`.

2.5.5 `impact`: `a caller can omit a newly created or inconvenient dependency Head, atomically validate the remaining vector and commit against a stale or revoked prerequisite while all declared CAS checks pass`.

2.5.6 `requiredDelta`: `add an authoritative scoped DependencyHeadUniverse registry and immutable snapshot root with complete membership/non-membership proof, owner, schema/version, discovery evidence, asOf, validThrough and invalidators; the acceptance CAS must fence both the universe Head and every member version at one linearization point`.

2.5.7 `acceptancePredicate`: `omitting, adding or concurrently creating any in-scope mutable dependency changes the universe root and aborts the CAS; two independent completeness evaluators agree; accepted readbacks bind universe root, member vector, revocation roots and one linearization point; omittedHead=0`.

2.5.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F007`.

2.5.9 `state`: `OPEN`.

2.5.10 `noMergeKey`: `MPRR-V14-HR-F005`.

## 2.6 `MPRR-V14-HR-F006`

2.6.1 `findingId`: `MPRR-V14-HR-F006`.

2.6.2 `severity`: `P0`.

2.6.3 `locator`: `subject:§1.2.1-§1.2.2;MPRR-V14-REQ-019;MPRR-V14-REQ-073;MPRR-V14-REQ-076;§5.2.3`.

2.6.4 `defect`: `the exact preservation of V13-REQ-049 still requires Public content-safe hashes and a root-binding record linking Public and Private tiers, while MPRR-V14-REQ-019 forbids every raw digest, keyed digest, equality tag or root derived from Private payload; the generic stricter-wins rule provides no canonical satisfiable replacement schema, public-field allowlist or information-flow proof`.

2.6.5 `impact`: `implementations may either leak guessable or correlatable Private predicates to satisfy public integrity, or drop the preserved existence/integrity claim and still assert lossless preservation; private-derived metadata such as length, type, count, identity or error class also remains outside a closed leak model`.

2.6.6 `requiredDelta`: `define a field-level PublicReceipt schema with a strict public allowlist, non-content-derived receipt identity, audience and epoch separation, metadata privacy budget and an externally trusted audit-event attestation whose declared verification limit does not claim cryptographic proof of Private bytes; keep every Private-content commitment and tier-binding root only in the sealed Private tier and publish an explicit predecessor-conflict delta`.

2.6.7 `acceptancePredicate`: `a formal information-flow inventory plus dictionary, equality, cross-run correlation, length/type/count inference and chosen-input vectors proves zero Private predicate leakage from every Public field and signature input; exact Private replay remains possible; both predecessor clauses have an explicit non-contradictory disposition; any public Private-derived commitment returns PUBLIC-PRIVATE-LINKAGE-BLOCKED`.

2.6.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F009;preserved V13-REQ-049 and V13-REQ-052`.

2.6.9 `state`: `OPEN`.

2.6.10 `noMergeKey`: `MPRR-V14-HR-F006`.

## 2.7 `MPRR-V14-HR-F007`

2.7.1 `findingId`: `MPRR-V14-HR-F007`.

2.7.2 `severity`: `P0`.

2.7.3 `locator`: `subject:MPRR-V14-REQ-008;MPRR-V14-REQ-030;MPRR-V14-REQ-044;§5.2.1`.

2.7.4 `defect`: `the Subject fixes three domain IDs and one appointment slot per domain, but it never states a mandatory pairwise inequality over Reviewer Person roots, appointment issuers, reviewer-agent policy roots and prohibited control ownership; the inherited forbidden-role-overlap matrix may therefore allow one actor to hold three nominally independent appointments`.

2.7.5 `impact`: `one reviewer or one controlling principal can populate all three presence positions, satisfy cardinality=3 and manufacture apparent independent agreement`.

2.7.6 `requiredDelta`: `add a closed ThreeReviewSeparationMatrix requiring pairwise-distinct eligible Person and Appointment roots across the structural, semantic and security slots, distinct Reviewer/Producer/QA/Acceptor control, and explicit engine/tool/model shared-edge limits; any permitted organizational commonality must be enumerated and cannot relax independent authorship or sealing`.

2.7.7 `acceptancePredicate`: `same Person, same appointment, cross-slot delegation, common output author, Producer or QA occupying a review slot, shared unapproved agent/tool root and replacement without successor each return REVIEW-INELIGIBLE; three eligible rows imply three pairwise-distinct reviewer authorities and three sealed outputs`.

2.7.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F003;preserved V13-REQ-006,V13-REQ-019,V13-REQ-020`.

2.7.9 `state`: `OPEN`.

2.7.10 `noMergeKey`: `MPRR-V14-HR-F007`.

# 3. P1 Findings

## 3.1 `MPRR-V14-HR-F008`

3.1.1 `findingId`: `MPRR-V14-HR-F008`.

3.1.2 `severity`: `P1`.

3.1.3 `locator`: `subject:MPRR-V14-REQ-002;§4.1;§4.2;MPRR-V14-REQ-037`.

3.1.4 `defect`: `MPRR-V14-REQ-002 requires a total vector-to-terminal function and deterministic overlap precedence, but the Subject publishes only one exactSafeTerminal label per 36 vector rows; it does not materialize ResultStatus, BlockReason, Recoverability and RetryClass tuples or precedence for the many requirement predicates and cross-control overlaps`.

3.1.5 `impact`: `two engines can choose different terminals for a simultaneous authority, freshness, privacy and publication failure while each remains consistent with one row; retry and recovery behavior can diverge and unsafe work may continue`.

3.1.6 `requiredDelta`: `materialize a closed Terminal registry and total precedence table before any terminal reference; map every atomic predicate failure and every reachable overlap class to exactly one full terminal tuple and define monotonic fail-closed precedence`.

3.1.7 `acceptancePredicate`: `two engines enumerate the same closed failure universe and return one identical full terminal tuple for every single and overlap vector; unmapped=0,ambiguous=0,alias=0,disjunction=0; Unknown failure maps to a registered blocking terminal`.

3.1.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F013`.

3.1.9 `state`: `OPEN`.

3.1.10 `noMergeKey`: `MPRR-V14-HR-F008`.

## 3.2 `MPRR-V14-HR-F009`

3.2.1 `findingId`: `MPRR-V14-HR-F009`.

3.2.2 `severity`: `P1`.

3.2.3 `locator`: `subject:MPRR-V14-REQ-009;MPRR-V14-REQ-015;MPRR-V14-REQ-017;MPRR-V14-REQ-018;MPRR-V14-REQ-071;MPRR-V14-REQ-072;§5.2.1`.

3.2.4 `defect`: `the B0 authority is explicitly consumed in the Admission CAS, but no single canonical bootstrap AdmissionCommitSet enumerates and atomically transitions the B0 authority consumption, HumanApproval consumption, accepted Head, operation ledger, Acceptance envelope, Conformance evidence, Risk snapshot, dependency-universe vector, ProtocolUsePermit issuance and both readbacks; preserved formal-acceptance commit semantics mention Permit consumption rather than bootstrap Permit issuance`.

3.2.5 `impact`: `a crash or concurrent request can split accepted Head, approval consumption and Permit issuance, or reuse a still-unconsumed HumanApproval under another external authority while every individual record appears valid`.

3.2.6 `requiredDelta`: `define a mode-specific canonical BOOTSTRAP-PROTOCOL-ADMISSION transaction schema, linearization point, idempotency rule, fencing token and crash-recovery table; consume B0 authority and HumanApproval and issue exactly one evidence-bound ProtocolUsePermit in the same atomic set, with pre- and post-commit readbacks`.

3.2.7 `acceptancePredicate`: `crash and concurrency injection at every boundary yields either zero committed members or exactly one complete recoverable commit set; splitHead=0,splitAuthorityConsumption=0,splitApprovalConsumption=0,splitPermitIssuance=0,duplicatePermit=0; two readbacks bind the same operation, expected Head, evidence roots and dependency-universe vector`.

3.2.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Findings MPRR-V13-HR-F004,MPRR-V13-HR-F007,MPRR-V13-HR-F011,MPRR-V13-HR-F016`.

3.2.9 `state`: `OPEN`.

3.2.10 `noMergeKey`: `MPRR-V14-HR-F009`.

## 3.3 `MPRR-V14-HR-F010`

3.3.1 `findingId`: `MPRR-V14-HR-F010`.

3.3.2 `severity`: `P1`.

3.3.3 `locator`: `subject:MPRR-V14-REQ-003;MPRR-V14-REQ-012;§4.1 MPRR-V14-NEG-F010`.

3.3.4 `defect`: `the attestation requirement lists many fields but does not require one canonical verification state machine covering trust-path uniqueness, schema and domain separation of signed bytes, algorithm deprecation, key-purpose separation, proof of possession, revocation snapshot at use time, rotation overlap and append-only log inclusion plus consistency; its only dedicated vector is the generic token violate:MPRR-V13-HR-F010`.

3.3.5 `impact`: `different verifiers can accept different trust paths or revoked/deprecated keys, and an equivocation log can present split views while all named fields are present`.

3.3.6 `requiredDelta`: `require canonical Attestation, Key, TrustPath, AlgorithmPolicy, RevocationSnapshot and transparency-checkpoint schemas plus one ordered verification automaton; bind purpose, audience, operation, schema root and canonical payload bytes into every signature and define fail-closed rotation and compromise semantics`.

3.3.7 `acceptancePredicate`: `two independent verifiers agree on canonical valid and invalid corpora covering ambiguous paths, algorithm confusion/deprecation, wrong purpose/audience, malformed encoding, stale or split revocation, rotation overlap, log non-inclusion and split-view consistency; any disagreement or Unknown returns ATTESTATION-INVALID`.

3.3.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F010`.

3.3.9 `state`: `OPEN`.

3.3.10 `noMergeKey`: `MPRR-V14-HR-F010`.

## 3.4 `MPRR-V14-HR-F011`

3.4.1 `findingId`: `MPRR-V14-HR-F011`.

3.4.2 `severity`: `P1`.

3.4.3 `locator`: `subject:MPRR-V14-REQ-004;MPRR-V14-REQ-017;§4.1 MPRR-V14-NEG-F021`.

3.4.4 `defect`: `the ClockAuthority requirement names quorum or authoritative source, uncertainty, skew and cross-clock comparison but does not require a deterministic source-selection/quorum rule, interval-order algebra, epoch rollover rule or a closed result for overlapping and incomparable uncertainty intervals`.

3.4.5 `impact`: `two compliant clock evaluators can disagree on whether authority, approval, risk or evidence was valid at the acceptance boundary, extending stale authority or reordering evidence`.

3.4.6 `requiredDelta`: `define canonical ClockAuthority and ClockObservation schemas plus deterministic quorum/source selection, monotonic epoch transition, uncertainty interval comparison, skew ceiling and Unknown precedence; bind the chosen clock policy and observation roots into the dependency universe and CAS`.

3.4.7 `acceptancePredicate`: `two clock engines return identical ordering and Freshness states for boundary, overlap, skew, rollback, split-quorum, rollover, unavailable and expired-source vectors; incomparable or Unknown time never proves Freshness and returns TIME-AUTHORITY-BLOCKED`.

3.4.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F021`.

3.4.9 `state`: `OPEN`.

3.4.10 `noMergeKey`: `MPRR-V14-HR-F011`.

## 3.5 `MPRR-V14-HR-F012`

3.5.1 `findingId`: `MPRR-V14-HR-F012`.

3.5.2 `severity`: `P1`.

3.5.3 `locator`: `subject:MPRR-V14-REQ-003;MPRR-V14-REQ-005;MPRR-V14-REQ-011;§4.1 MPRR-V14-NEG-F012`.

3.5.4 `defect`: `the FinalityAuthority policy constrains issuer cardinality and conflicts, but no authoritative FinalityReceiptUniverse snapshot, inclusion/non-membership proof or checkpoint root is bound to ResultEnvelope and readback; the predicate tests a supplied receipt set and can miss a concurrent or withheld competing receipt`.

3.5.5 `impact`: `an actor can present one eligible receipt, omit another eligible conflicting receipt and obtain an apparently authoritative Result despite anti-equivocation rules`.

3.5.6 `requiredDelta`: `add an append-only finality log with canonical checkpoint, receipt membership and non-membership proofs, issuer/quorum policy root, epoch and consistency proof; bind the fresh checkpoint into FinalityReceipt verification, ResultEnvelopeId, dependency universe and authoritative readback`.

3.5.7 `acceptancePredicate`: `withheld, concurrent, duplicate, stale, revoked, cross-epoch and split-view receipts either yield one uniquely proved authoritative result or RUN-RESULT-CONFLICT-BLOCKED; two verifiers agree and omittedEligibleReceipt=0 at the linearization point`.

3.5.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F012`.

3.5.9 `state`: `OPEN`.

3.5.10 `noMergeKey`: `MPRR-V14-HR-F012`.

## 3.6 `MPRR-V14-HR-F013`

3.6.1 `findingId`: `MPRR-V14-HR-F013`.

3.6.2 `severity`: `P1`.

3.6.3 `locator`: `subject:MPRR-V14-REQ-001;§3.1;§3.2;§3.3`.

3.6.4 `defect`: `MPRR-V14-REQ-001 requires separate canonical columns sourceNamespaceRoot, memberId, memberLocator, targetRequirementIdSet, preservationMode and status, but the three crosswalks retain combined sourceTuple cells and use incompatible locator, carrier and status columns; §3.2 also omits preservationMode`.

3.6.5 `impact`: `parsers must split a combined token and infer table-specific meanings, so the canonical machine row schema is not actually instantiated and crosswalk equality depends on bespoke prose parsers`.

3.6.6 `requiredDelta`: `emit one detached canonical crosswalk record format with the exact required columns and typed enums, then serialize all 57 preservation, 24 remediation and 91 obligation rows through that format without combined source tokens or table-specific aliases`.

3.6.7 `acceptancePredicate`: `two generic parsers using one schema extract all rows without table-specific logic; combinedSourceTuple=0,missingColumn=0,unknownEnum=0,arrowInMachineField=0,sourceTargetConflation=0; forward and inverse mappings remain exact`.

3.6.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F023`.

3.6.9 `state`: `OPEN`.

3.6.10 `noMergeKey`: `MPRR-V14-HR-F013`.

## 3.7 `MPRR-V14-HR-F014`

3.7.1 `findingId`: `MPRR-V14-HR-F014`.

3.7.2 `severity`: `P1`.

3.7.3 `locator`: `subject:MPRR-V14-REQ-022;§4.2 MPRR-V14-NEG-C009`.

3.7.4 `defect`: `the custody requirement names separate content, key, receipt and replica state machines and says Legal Hold has explicit precedence, but it does not require exact transition tables, cross-machine invariants, linearization rules for concurrent hold/delete/restore events or the terminal and recovery class for every partial-destruction state`.

3.7.5 `impact`: `implementations can disagree on whether to delete, retain, restore or declare replay unavailable, including after key destruction or replica lag, while each claims an auditable lifecycle`.

3.7.6 `requiredDelta`: `define canonical state and transition registries for content, keys, receipts, primary replicas, backup replicas and restore copies; specify hold-over-delete precedence, atomic deletion-plan identity, provider acknowledgements, partial-failure recovery, crypto-erasure evidence and post-destruction replay semantics`.

3.7.7 `acceptancePredicate`: `two transition engines converge on the same safe state for every ordering of expiry, hold placement/removal, plan issue, key destruction, replica acknowledgement, restore copy discovery and retry; illegal transition=0,untrackedReplica=0,holdBypass=0; partial or Unknown state returns CUSTODY-LIFECYCLE-BLOCKED`.

3.7.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F018`.

3.7.9 `state`: `OPEN`.

3.7.10 `noMergeKey`: `MPRR-V14-HR-F014`.

# 4. P2 Finding

## 4.1 `MPRR-V14-HR-F015`

4.1.1 `findingId`: `MPRR-V14-HR-F015`.

4.1.2 `severity`: `P2`.

4.1.3 `locator`: `subject:MPRR-V14-REQ-013;§4.1 MPRR-V14-NEG-F024`.

4.1.4 `defect`: `byte intervals are well bounded, but media-region coordinates have no required canonical coordinate space, transform/orientation normalization, precision, boundary inclusion or region-equivalence rule`.

4.1.5 `impact`: `two coverage engines can compute different unions, gaps and overlaps for the same PDF page, image, rotated media or transformed region while both follow the phrase media-region coordinates`.

4.1.6 `requiredDelta`: `require a media-type-specific canonical coordinate registry with orientation and transform normalization, units, precision and rounding, half-open boundary convention, clipping, page/frame identity and region equivalence before union and multiplicity are evaluated`.

4.1.7 `acceptancePredicate`: `two coverage engines return identical canonical regions and union measures for rotated, scaled, clipped, nested, boundary-touching, duplicate and transformed media vectors; unexplained gap or forbidden overlap returns COVERAGE-ALGEBRA-BLOCKED`.

4.1.8 `sourceBasis`: `reviewed Subject raw root 0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af;V13 Finding MPRR-V13-HR-F024`.

4.1.9 `state`: `OPEN`.

4.1.10 `noMergeKey`: `MPRR-V14-HR-F015`.

# 5. Manifest disposition

## 5.1 Non-closure

5.1.1 independent semantic Finding count=`15`; independently closed=`0/15`.

5.1.2 source v1.3 Finding Closure remains=`0/24`; this Manifest records sufficiency observations but cannot issue Closure without the external B0 authority root and accepted review procedure.

5.1.3 the mechanical counts that pass do not offset any P0 or P1 semantic Finding.

5.1.4 no reviewed Subject, Product, Git, GitHub, Provider or account state was changed.

5.1.5 `Gate29=BLOCKED`; `development freeze=ACTIVE`; exact Product completion, remaining hours, critical path and ETA remain `unknown/unavailable`.
