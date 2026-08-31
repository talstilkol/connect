# 1. Connect — Three-review Protocol v1.5 independent hostile-review Findings Manifest

## 1.1 Identity and authority boundary

1.1.1 `manifestId=CONNECT-THREE-REVIEW-PROTOCOL-V1-5-SUCCESSOR-REQUIREMENTS-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-2026-08-29`.

1.1.2 reviewed Subject path=`/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-5-successor-requirements-2026-08-29.md`.

1.1.3 reviewed Subject raw SHA-256=`73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c`; physical identity=`2237 lines;1059512 bytes`.

1.1.4 detached review path=`/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-5-successor-requirements-independent-hostile-review-2026-08-29.md`.

1.1.5 Producer QA root=`e0b0b093f4169cb75e40f750c4af68205b9bc1dc6ada719ccb870de883e16570`; authority and semantic credit from Producer QA=`0`.

1.1.6 authority state=`EXTERNAL-B0-ADMISSION-ABSENT`; this Manifest is an independent hostile-review observation and grants no Requirement Acceptance, Finding Closure, Review eligibility, Protocol Admission, Publication permit or Gate credit.

1.1.7 disposition=`REJECT-SUCCESSOR-CANDIDATE;NEW-IMMUTABLE-SUCCESSOR-REQUIRED`.

1.1.8 record denominator=`16`; severity vector=`P0=8,P1=7,P2=1,P3=0`; open=`16`; closed=`0`; merged=`0`; suppressed=`0`; riskAccepted=`0`.

1.1.9 every Finding record below contains exactly ten fields: `findingId`, `severity`, `locator`, `defect`, `impact`, `requiredDelta`, `acceptancePredicate`, `sourceBasis`, `state`, `noMergeKey`.

1.1.10 `noMergeKey=findingId`. Shared topic, source, target Requirement, Crosswalk row, vector, dependency, terminal or remediation never transfers Closure.

1.1.11 repository visibility invariant=`PUBLIC-PERMANENT`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; this Manifest performs no Product, Build, Runtime, Git, GitHub or provider mutation.

# 2. P0 Findings

## 2.1 `MPRR-V15-HR-F001`

2.1.1 `findingId`: `MPRR-V15-HR-F001`.

2.1.2 `severity`: `P0`.

2.1.3 `locator`: `subject:§1.3.1-§1.3.4;MPRR-V15-REQ-001;§3.1-§3.2;all 9 NamespaceEntry rows and 292 member rows`.

2.1.4 `defect`: `the final NamespaceEntryRoot constructor is stated, but parserProfileRoot and memberSetRoot are opaque declared inputs with no canonical schemas, serialization, member ordering, duplicate rule, constructor or independently rooted parser artifact; most carriers also lack a bound custody/retrieval locator. Rehashing those declared inner roots reproduces 9 outer values but does not derive a namespace identity from exact carrier bytes and authority`.

2.1.5 `impact`: `a producer can substitute a parser profile or member-set construction while preserving all visible member rows, and an independent reviewer cannot regenerate the authority-bearing source namespace end to end; all 292 source relationships therefore remain navigation evidence rather than admitted provenance`.

2.1.6 `requiredDelta`: `define canonical ParserProfile and MemberSet record schemas, LF/framing/ordering/duplicate/error rules, roots for executable parser artifacts, immutable carrier custody locators and B0 authority membership; construct every NamespaceEntryRoot solely from independently recoverable frozen inputs`.

2.1.7 `acceptancePredicate`: `two independently implemented resolvers starting only from admitted carrier locators and canonical schemas reproduce identical parserProfileRoot, memberSetRoot, NamespaceEntryRoot and 292 member digests; namespace=9/9,member=292/292,opaqueDeclaredInnerRoot=0,unresolved=0,ambiguous=0,duplicate=0,carrierSubstitution=0; any mismatch returns SOURCE-GRAPH-INVALID and earns zero source credit`.

2.1.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F001`.

2.1.9 `state`: `OPEN`.

2.1.10 `noMergeKey`: `MPRR-V15-HR-F001`.

## 2.2 `MPRR-V15-HR-F002`

2.2.1 `findingId`: `MPRR-V15-HR-F002`.

2.2.2 `severity`: `P0`.

2.2.3 `locator`: `subject:MPRR-V15-REQ-011;§5.1.1-§5.1.2;96 NamedUse rows;MPRR-V15-REQ-016..096`.

2.2.4 `defect`: `the extraction profile scans each predecessor source-member span plus only the current dependency field instead of all five exact current v1.5 fields, and uses an under-specified backtick/suffix token heuristic. It then classifies a same-row or forward local candidate as an exact rooted source use. This occurs for 81 current local identities and hides the exact self/forward semantic relationship the DAG must expose`.

2.2.5 `impact`: `the declared 1919-edge graph can remain mechanically acyclic while actual statement, defect, predicate or sourceBasis uses are missing or rebound to an earlier artifact with different semantics; provider order and authority completeness are unproven for all 96 Requirements`.

2.2.6 `requiredDelta`: `extract NamedUses from the exact five fields of every frozen v1.5 Requirement under a canonical grammar; bind every symbol occurrence and source span to one earlier local provider or one separately named admitted external provider, forbid same-row external fallback for current identities, and reorder Requirements until the real graph is acyclic`.

2.2.7 `acceptancePredicate`: `two independently implemented lexical-plus-semantic extractors produce byte-identical occurrence and edge multisets; requirement=96,implicit=0,unknown=0,self=0,forward=0,duplicate=0,cycle=0,sameRowRootedFallback=0,untranslatedInheritedIdentity=0; every external provider resolves to exactly one admitted B0 member`.

2.2.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F002`.

2.2.9 `state`: `OPEN`.

2.2.10 `noMergeKey`: `MPRR-V15-HR-F002`.

## 2.3 `MPRR-V15-HR-F003`

2.3.1 `findingId`: `MPRR-V15-HR-F003`.

2.3.2 `severity`: `P0`.

2.3.3 `locator`: `subject:MPRR-V15-REQ-012;§7.1;all 211 NegativeVector rows;MPRR-V15-NEG-PRES-001..081;MPRR-V15-NEG-NEW-F002;MPRR-V15-NEG-NEW-F003`.

2.3.4 `defect`: `the NegativeVector schema has no exact frozen Candidate fixture root, canonical operation-language version, runner/engine/policy roots, expected mutated root, expected post-state root or rooted oracle evidence. All 81 preservation vectors remove sourceImportDigest values that do not exist in their target Requirements; F003 names nonexistent MPRR-V15-XW-OBL-001; F002 removes a provider binding absent from the referenced NamedUse row. Execution receipts are absent for 211/211`.

2.3.5 `impact`: `none of the records can be deterministically applied to the frozen Subject, independently replayed or shown to trigger the intended defect; prose operations may be treated as passing without mutating anything, so no Finding, obligation or Requirement can close`.

2.3.6 `requiredDelta`: `define a canonical typed mutation DSL and instantiate each vector with exact fixture/Candidate root, schema root, target preimage, mutation preconditions, runner and policy identities, expected mutated and post-state roots, exact terminal, prohibited side effects, readback evidence and two independently signed execution receipts; replace every nonexistent mutation target`.

2.3.7 `acceptancePredicate`: `two independent eligible runners execute all exact records and produce identical roots and terminals; executed=211/211,fixtureBound=211/211,validMutationTarget=211/211,expectedPostRoot=211/211,twoRunnerAgreement=211/211,noOpMutation=0,unknownPath=0,unexpectedDurableWrite=0,authorityOutputOnFailure=0; any mismatch blocks Closure`.

2.3.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F004;211 vector records`.

2.3.9 `state`: `OPEN`.

2.3.10 `noMergeKey`: `MPRR-V15-HR-F003`.

## 2.4 `MPRR-V15-HR-F004`

2.4.1 `findingId`: `MPRR-V15-HR-F004`.

2.4.2 `severity`: `P0`.

2.4.3 `locator`: `subject:MPRR-V15-REQ-002;MPRR-V15-REQ-013;§4.1;all 211 Crosswalk rows`.

2.4.4 `defect`: `all Crosswalk rows name five target field paths, vector IDs, a terminal and a colon-delimited residualRiskRecordId, but no row contains clause-to-clause source semantics, proof that each source conjunct survives, an instantiated ResidualRisk record or an exact-root independent receipt. One arbitrary vector per row does not cover every semantic delta or every required field`.

2.4.5 `impact`: `211 rows can pass presence and range checks while weakening, contradicting or omitting source obligations; the declared residual risk is neither reviewable nor lifecycle-bound, and zero old obligation or prior Finding has semantic Closure`.

2.4.6 `requiredDelta`: `publish one canonical clause-level Closure Manifest mapping every source conjunct to exact successor clauses and executable proof roots; instantiate typed ResidualRisk records with owner, severity, treatment, expiry, revocation, acceptance authority and independent review; bind every required vector and receipt to the exact successor root`.

2.4.7 `acceptancePredicate`: `two independent semantic reviewers agree on every source conjunct and every target proof; Crosswalk FULL=211/211,old obligations=91/91,prior Findings=24/24,v1.4 remediations=15/15,v1.4 preservation=81/81; pathOnlyCredit=0,labelOnlyRisk=0,missingConjunct=0,partial=0,absent=0; each receipt binds the exact successor root`.

2.4.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Findings MPRR-V14-HR-F003 and MPRR-V14-HR-F013`.

2.4.9 `state`: `OPEN`.

2.4.10 `noMergeKey`: `MPRR-V15-HR-F004`.

## 2.5 `MPRR-V15-HR-F005`

2.5.1 `findingId`: `MPRR-V15-HR-F005`.

2.5.2 `severity`: `P0`.

2.5.3 `locator`: `subject:MPRR-V15-REQ-007;MPRR-V15-REQ-034;MPRR-V15-REQ-088;MPRR-V15-REQ-091`.

2.5.4 `defect`: `PublicReceipt exposes eventClass, issuedAtObservationId, validThroughObservationId, publicReceiptId and signature. One receipt is emitted per event, so observers can infer event existence, type, timing, validity windows, count, cadence and stable-linkage patterns even though the same clause forbids Private-derived metadata/type/count/identity and claims no type/count inference`.

2.5.5 `impact`: `a permanently Public repository or surface can leak operational and security-sensitive event metadata, enable correlation across runs and reveal Private workflow state without exposing content bytes; the claimed public/private non-linkability predicate is internally unsatisfied`.

2.5.6 `requiredDelta`: `redesign Public evidence around unlinkable, padded/batched, epoch-separated attestations with a minimal public policy statement; keep event class, exact timing, per-event identifiers and all content/metadata commitments in sealed Private evidence unless a separately approved disclosure policy proves necessity and privacy bounds`.

2.5.7 `acceptancePredicate`: `formal information-flow inventory and dictionary,equality,chosen-input,cadence,count,timing,type and cross-run correlation tests yield Private predicate inference=0 and stable cross-event linkage=0; one public observation cannot determine whether or which Private event occurred; exact Private audit/replay remains possible; any failure returns PUBLIC-PRIVATE-LINKAGE-BLOCKED`.

2.5.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F006;B0 v3 root 872ffc806ac35614a9cba33cc9cbe5bc1a0f0cf7675d578183a60ca55d9611e9;public/cyber v2 root 322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a`.

2.5.9 `state`: `OPEN`.

2.5.10 `noMergeKey`: `MPRR-V15-HR-F005`.

## 2.6 `MPRR-V15-HR-F006`

2.6.1 `findingId`: `MPRR-V15-HR-F006`.

2.6.2 `severity`: `P0`.

2.6.3 `locator`: `subject:MPRR-V15-REQ-014;MPRR-V15-REQ-032;MPRR-V15-REQ-085-087;§8.1.1-§8.1.34`.

2.6.4 `defect`: `Section 8 lists mutable family labels but supplies no authoritative registry/member schema, universe-root constructor, discovery scope, ownership, live Head, membership/non-membership proof format, new-family classifier or mutation receipt. A caller can omit an unlisted or newly created Head and keep the declared family list unchanged`.

2.6.5 `impact`: `CAS can atomically validate an incomplete version vector and accept a stale, revoked or selectively omitted dependency; freshness and minimal invalidation are not complete even if every supplied member matches`.

2.6.6 `requiredDelta`: `instantiate an authoritative DependencyHeadUniverse registry with canonical family/member records, scope and discovery rules, constructor, live Head, ownership, creation/removal/revocation receipts, membership and non-membership proofs, and a closed policy for classifying new mutable families; fence its Head and every member/revocation root in one CAS`.

2.6.7 `acceptancePredicate`: `two independent discovery implementations return the same complete universe and root; omitted,added,removed,renamed,revoked or concurrently created in-scope Head changes the universe root and aborts acceptance; omittedHead=0,unknownFamily=0,unfencedMember=0; pre/post readbacks bind one linearization point`.

2.6.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F005`.

2.6.9 `state`: `OPEN`.

2.6.10 `noMergeKey`: `MPRR-V15-HR-F006`.

## 2.7 `MPRR-V15-HR-F007`

2.7.1 `findingId`: `MPRR-V15-HR-F007`.

2.7.2 `severity`: `P0`.

2.7.3 `locator`: `subject:MPRR-V15-REQ-015;§9.1.1-§9.1.26,especially §9.1.22-§9.1.25`.

2.7.4 `defect`: `postCommitReadbackRoot is declared a member of the same 22-member transaction and is hashed into its sole output. A genuine post-commit readback can exist only after the commit/output, creating a causal cycle; if precomputed, it is not a post-commit readback. The ordered-root sequence, idempotent-operation-key constructor, state transitions and recovery authority are also unspecified`.

2.7.5 `impact`: `the commit cannot be implemented as stated without prediction, a fixed point or mislabeling; implementations can disagree on output identity, issue duplicate permits during retry or expose partial state while still claiming 0-or-22 atomicity and one-output behavior`.

2.7.6 `requiredDelta`: `define a causally ordered protocol with pre-commit intent/CAS, one atomic durable commit/output, then a separately rooted post-commit observation referencing the committed envelope; specify canonical member order/framing, idempotency-key constructor, transaction states, retry/recovery authority and duplicate-output prevention`.

2.7.7 `acceptancePredicate`: `model checking and two implementations agree for crash before,during,after commit plus retry and concurrency; durable commit members are 0-or-all, authority output count is exactly 0 on abort and 1 on success, permit count never exceeds 1, postReadback references an already committed output, canonical output root agrees byte-for-byte and no causal cycle exists`.

2.7.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F009`.

2.7.9 `state`: `OPEN`.

2.7.10 `noMergeKey`: `MPRR-V15-HR-F007`.

## 2.8 `MPRR-V15-HR-F008`

2.8.1 `findingId`: `MPRR-V15-HR-F008`.

2.8.2 `severity`: `P0`.

2.8.3 `locator`: `subject:MPRR-V15-REQ-008;MPRR-V15-REQ-023;MPRR-V15-REQ-045;MPRR-V15-REQ-059;MPRR-V15-REQ-082-084;§9.1.6`.

2.8.4 `defect`: `the Subject names ThreeReviewSeparationMatrix but does not instantiate its rows, prohibited-overlap universe, Candidate-author/source-owner conflicts, exception lifecycle or eligibility evaluator. Shared engine/tool/model allowances lack owner, expiry, revocation and independence thresholds. Preseal, quorum, veto and downgrade remain inherited prose without live schemas or receipts`.

2.8.5 `impact`: `one controlling principal, Candidate author or source owner can influence nominally distinct slots; an expired allowance or unsealed Review B can be counted; three root labels and three outputs can appear independent without three genuinely eligible authorities`.

2.8.6 `requiredDelta`: `publish a closed separation and eligibility matrix covering Person,Appointment,outputAuthor,CandidateAuthor,sourceOwner,Producer,QA,Acceptor,agentPolicy,tool,model,employer and controlling principal; define preseal, replacement, amendment, exception, expiry, revocation, quorum, veto and downgrade state machines and bind each slot to one exact sealed output`.

2.8.7 `acceptancePredicate`: `same person,appointment,author,controlling principal,forbidden role,expired/revoked allowance,preseal breach,post-seal influence,missing veto or ineligible replacement each returns REVIEW-INELIGIBLE; eligible=3/3 implies three pairwise-distinct authorities, three sealed roots, correct blind chronology and one valid quorum/veto disposition; current credit remains 0/3 until receipts exist`.

2.8.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F007;v1.3 Requirements 006,019,020,043-046`.

2.8.9 `state`: `OPEN`.

2.8.10 `noMergeKey`: `MPRR-V15-HR-F008`.

# 3. P1 Findings

## 3.1 `MPRR-V15-HR-F009`

3.1.1 `findingId`: `MPRR-V15-HR-F009`.

3.1.2 `severity`: `P1`.

3.1.3 `locator`: `subject:MPRR-V15-REQ-004;MPRR-V15-REQ-018;trust/revocation vectors in §7.1`.

3.1.4 `defect`: `MPRR-V15-REQ-004 says the accepted Protocol shall define trust, key, signature, transparency and revocation schemas and an ordered state machine, but this Candidate does not instantiate those schemas, transition tables, canonical encodings or log-proof formats. A small number of prose vector rows does not cover malformed keys, purpose/audience confusion, rotation, revocation races, log split-view or algorithm downgrade`.

3.1.5 `impact`: `implementations can validate the same signature differently, accept revoked or wrong-purpose authority, disagree on rotation boundaries and miss transparency equivocation while claiming the requirement is present`.

3.1.6 `requiredDelta`: `instantiate canonical key,signature,algorithm,issuer,audience,purpose,epoch,revocation and transparency-log records; publish an ordered fail-closed verification/transition automaton and exhaustive malformed,boundary,race,downgrade and split-view vectors`.

3.1.7 `acceptancePredicate`: `two independent verifiers agree on all valid and invalid fixtures; wrong issuer,purpose,audience,epoch,algorithm,key status,revocation state,log membership,checkpoint consistency or encoding returns the exact safe terminal before authority transfer; executable coverage includes rotation/revocation boundary races and log equivocation`.

3.1.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F010`.

3.1.9 `state`: `OPEN`.

3.1.10 `noMergeKey`: `MPRR-V15-HR-F009`.

## 3.2 `MPRR-V15-HR-F010`

3.2.1 `findingId`: `MPRR-V15-HR-F010`.

3.2.2 `severity`: `P1`.

3.2.3 `locator`: `subject:MPRR-V15-REQ-005;MPRR-V15-REQ-019;clock vectors in §7.1`.

3.2.4 `defect`: `the Candidate defers ClockAuthority schemas, source-selection/quorum formula, interval operations, skew units, inclusive/exclusive boundaries, rollback handling and epoch-transition table to a future accepted Protocol. No executable exact-boundary corpus is present`.

3.2.5 `impact`: `two conforming implementations can disagree on freshness, expiry, revocation order and rollover at the same observation, enabling stale authority or rejecting valid evidence`.

3.2.6 `requiredDelta`: `instantiate canonical time-observation and authority records, unit/precision rules, interval algebra, quorum/source-selection formula, uncertainty/skew propagation, monotonicity and rollback rules, epoch transitions and deterministic boundary terminals`.

3.2.7 `acceptancePredicate`: `two independent implementations agree at before,equal,after boundaries under maximum skew,source loss,rollback,split quorum and epoch rollover; ambiguity=0,unit mismatch=0; stale or unordered observation blocks before commit and every result binds the exact clock-policy and observation roots`.

3.2.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F011`.

3.2.9 `state`: `OPEN`.

3.2.10 `noMergeKey`: `MPRR-V15-HR-F010`.

## 3.3 `MPRR-V15-HR-F011`

3.3.1 `findingId`: `MPRR-V15-HR-F011`.

3.3.2 `severity`: `P1`.

3.3.3 `locator`: `subject:MPRR-V15-REQ-006;MPRR-V15-REQ-020;finality vectors in §7.1`.

3.3.4 `defect`: `the Candidate does not instantiate the complete receipt/checkpoint/log schemas, issuer/quorum rules, append-only checkpoint constructor, membership/non-membership and consistency proof formats, accepted receipt universe or deterministic linearization needed to prevent competing finality`.

3.3.5 `impact`: `hidden, omitted or equivocated finality receipts can make two implementations accept different winners or treat an incomplete checkpoint as authoritative`.

3.3.6 `requiredDelta`: `instantiate the full FinalityReceipt universe, canonical append-only log/checkpoint constructors, issuer/quorum policy, membership/non-membership/consistency proofs, fork detection, deterministic winner/abort rules and freshness binding`.

3.3.7 `acceptancePredicate`: `two independent verifiers agree for empty,single,duplicate,competing,omitted,stale and split-view receipt Sets; incomplete or inconsistent checkpoint cannot finalize; exactly one final outcome or one registered conflict terminal exists and accepted readback binds the same current checkpoint root`.

3.3.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F012`.

3.3.9 `state`: `OPEN`.

3.3.10 `noMergeKey`: `MPRR-V15-HR-F011`.

## 3.4 `MPRR-V15-HR-F012`

3.4.1 `findingId`: `MPRR-V15-HR-F012`.

3.4.2 `severity`: `P1`.

3.4.3 `locator`: `subject:MPRR-V15-REQ-003;MPRR-V15-REQ-017;MPRR-V15-REQ-052;§6.1;§7.1`.

3.4.4 `defect`: `Section 6 gives 24 Terminal tuple labels and unique precedence ranks but no canonical trigger predicates, success tuple, failure-condition registry or mapping algorithm from an observed failure Set to the triggered Terminal Set. No pairwise or higher-order overlap executions demonstrate totality`.

3.4.5 `impact`: `implementations can disagree about which failures triggered, apply precedence to different Sets or return no terminal while each claims to honor the same rank table`.

3.4.6 `requiredDelta`: `instantiate a closed failure-condition registry with canonical predicates, observation inputs, one success tuple, condition-to-Terminal mapping, triggered-Set constructor and complete precedence/tie/impossible-state rules; generate boundary,pairwise and higher-order overlap vectors`.

3.4.7 `acceptancePredicate`: `for every valid or invalid state the evaluator returns exactly one registered terminal or success tuple; unknownTrigger=0,noTerminal=0,multipleWinner=0,unranked=0; two independent evaluators agree over the full generated overlap corpus and every result binds the exact registry root`.

3.4.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F008`.

3.4.9 `state`: `OPEN`.

3.4.10 `noMergeKey`: `MPRR-V15-HR-F012`.

## 3.5 `MPRR-V15-HR-F013`

3.5.1 `findingId`: `MPRR-V15-HR-F013`.

3.5.2 `severity`: `P1`.

3.5.3 `locator`: `subject:MPRR-V15-REQ-009;MPRR-V15-REQ-037;custody/hold vectors in §7.1`.

3.5.4 `defect`: `the Candidate promises separate custody, Legal Hold, deletion and destruction state machines but does not instantiate their state Sets, transition IDs, preconditions, authorization, revoke-wins order, replica-discovery rules, partial-failure table or retry/linearization semantics`.

3.5.5 `impact`: `concurrent expiry, hold placement/removal, restore, provider acknowledgement, key destruction or retry can delete held data, resurrect destroyed data, retain expired copies or produce irreconcilable receipt state`.

3.5.6 `requiredDelta`: `publish separate closed canonical state/transition registries for content,keys,receipts,primary replicas,backups and restores; define hold-wins/revoke-wins ordering, plan identity/cutoff, atomic delete limits, discovery, partial failure, retry, crypto-erasure and post-destruction replay rules with exact receipts`.

3.5.7 `acceptancePredicate`: `model checking plus two implementations agree across every allowed transition and concurrency pair; held data deletion=0,expired unheld retention=0,undiscovered restore=0,post-destruction replay success=0,unauthorized transition=0; partial failures converge to one safe registered state and all receipts bind exact identities`.

3.5.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F014`.

3.5.9 `state`: `OPEN`.

3.5.10 `noMergeKey`: `MPRR-V15-HR-F013`.

## 3.6 `MPRR-V15-HR-F014`

3.6.1 `findingId`: `MPRR-V15-HR-F014`.

3.6.2 `severity`: `P1`.

3.6.3 `locator`: `subject:entire v1.5 Subject;v1.2-v1.5 lineage;three-review intake;public/cyber v2 §2.9.6`.

3.6.4 `defect`: `the protocol lineage and intake contain no appeal lifecycle at all: no standing, scope, filing deadline, evidence root, freeze effect, independent appellate appointment, conflict rule, outcome Set, finality/reopen rule, anti-replay, expiry, revocation or CAS binding. This conflicts with the public/cyber requirement that objections, veto, appeals, expiry and revocation be governed under an accepted protocol`.

3.6.5 `impact`: `an erroneous acceptance or veto has no deterministic challenge path; a conflicted authority may decide its own challenge; stale appeals may reopen final state or live appeals may be ignored while Publication proceeds`.

3.6.6 `requiredDelta`: `instantiate a canonical Appeal/Challenge registry and state machine covering standing,appealable objects,grounds,filing window,evidence,automatic freeze,independent authority,separation,quorum,outcomes,remand,finality,reopen thresholds,replay,expiry,revocation and dependency/CAS membership`.

3.6.7 `acceptancePredicate`: `valid timely appeal freezes affected Acceptance/Publication before side effects; late,duplicate,wrong-object,conflicted,revoked or replayed appeal returns one safe terminal; appellate authority is independent of author,Producer,QA,Acceptor and original reviewers; final/remand/reopen outcomes are deterministic, rooted and fenced by the same freshness CAS`.

3.6.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;public/cyber v2 root 322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a §2.9.6;literal appeal occurrence count in v1.2-v1.5 plus intake=0`.

3.6.9 `state`: `OPEN`.

3.6.10 `noMergeKey`: `MPRR-V15-HR-F014`.

## 3.7 `MPRR-V15-HR-F015`

3.7.1 `findingId`: `MPRR-V15-HR-F015`.

3.7.2 `severity`: `P1`.

3.7.3 `locator`: `subject:§1.3;§4.1 field Sets;§5.1 Sets;§7.1 operations;§8.1;§9.1.24`.

3.7.4 `defect`: `comma-delimited Sets and path operations such as remove,insert and assignment have no canonical grammar, escaping, type system, ordering, duplicate or invalid-operation rule; the bootstrap constructor says ordered roots without defining the order and uses an ambiguous concatenation notation. Different parsers/runners can derive different bytes, membership or mutations from the same text`.

3.7.5 `impact`: `roots and test outcomes are implementation-dependent; delimiter injection, duplicate collapse, ordering differences and path ambiguity can change authority-bearing evidence without changing human-visible intent`.

3.7.6 `requiredDelta`: `define one versioned canonical serialization and mutation grammar with typed AST, UTF-8/Unicode profile, framing, length prefixes, escaping, Set ordering/deduplication, path resolution, precondition and invalid-operation terminal; use it for every constructor, Crosswalk Set, NamedUse binding, vector operation, universe member and commit member`.

3.7.7 `acceptancePredicate`: `two independent parsers/serializers/runners produce byte-identical ASTs, roots and mutations over valid plus adversarial delimiter,Unicode,duplicate,order,type and unknown-path corpus; ambiguousParse=0,duplicateSemanticElement=0,unknownOperation=0,constructorOrderMismatch=0; invalid input fails before authority transfer`.

3.7.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Findings MPRR-V14-HR-F004,MPRR-V14-HR-F009,MPRR-V14-HR-F013`.

3.7.9 `state`: `OPEN`.

3.7.10 `noMergeKey`: `MPRR-V15-HR-F015`.

# 4. P2 Finding

## 4.1 `MPRR-V15-HR-F016`

4.1.1 `findingId`: `MPRR-V15-HR-F016`.

4.1.2 `severity`: `P2`.

4.1.3 `locator`: `subject:MPRR-V15-REQ-010;MPRR-V15-REQ-028;media vector in §7.1`.

4.1.4 `defect`: `the Candidate says a future accepted Protocol shall define media coordinate,orientation,color,alpha,rounding,crop,scale,tile and transform registries, but it does not instantiate those schemas, normalization equations, boundary rules or reference fixtures; the single prose vector cannot establish multi-pass coverage equivalence`.

4.1.5 `impact`: `reviewers and engines can inspect or hash different pixels/regions after orientation,scaling,cropping,color conversion or rounding while reporting identical coverage labels`.

4.1.6 `requiredDelta`: `instantiate versioned canonical media profiles, coordinate spaces, transforms, rounding and boundary inclusion rules, color/alpha handling, tile composition and reference fixtures with known canonical outputs; bind review coverage to normalized coordinates and profile roots`.

4.1.7 `acceptancePredicate`: `two independent implementations produce byte-identical normalized rasters,regions,tiles and coverage roots for orientation,crop,scale,edge,rounding,color and alpha corpus; uncovered,overcounted and multiply transformed coordinates are detected deterministically; profile mismatch blocks semantic coverage credit`.

4.1.8 `sourceBasis`: `Subject root 73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c;v1.4 Finding MPRR-V14-HR-F015`.

4.1.9 `state`: `OPEN`.

4.1.10 `noMergeKey`: `MPRR-V15-HR-F016`.

# 5. Manifest disposition

## 5.1 Counters

5.1.1 total=`16`; P0=`8`; P1=`7`; P2=`1`; P3=`0`.

5.1.2 OPEN=`16`; CLOSED=`0`; MERGED=`0`; SUPPRESSED=`0`; RISK-ACCEPTED=`0`.

5.1.3 independently accepted Requirements=`0/96`; FULL Crosswalk rows=`0/211`; old obligations=`0/91`; prior Findings=`0/24`; v1.4 remediations=`0/15`; two-runner vector agreements=`0/211`; eligible reviews=`0/3`.

5.1.4 no record may move from OPEN without its own exact-root acceptancePredicate evidence and a fresh eligible independent receipt. Closing one record never closes another record.

5.1.5 final result=`REJECT`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository visibility=`PUBLIC-PERMANENT`.
