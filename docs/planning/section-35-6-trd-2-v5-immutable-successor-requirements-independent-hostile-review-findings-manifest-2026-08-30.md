# 1. Connect — Section 35.6 TRD-2 v5 independent hostile-review non-merged findings manifest

## 1.1 Identity and binding

1.1.1 artifactId=CONNECT-SECTION-35-6-TRD-2-V5-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-2026-08-30-V1.

1.1.2 artifactClass=PLANNING-ONLY; DETACHED-REVIEWER-LOCAL-FINDINGS-MANIFEST; NON-PROTOCOL-GENERATION; NON-RECONCILIATION; NON-ACCEPTANCE; NON-GATE-CREDIT.

1.1.3 review artifact=section-35-6-trd-2-v5-immutable-successor-requirements-independent-hostile-review-2026-08-30.md.

1.1.4 exact v5 Subject raw SHA-256=933b5d68f765afbe5df792051f8b01441d2e0b6043eb3745aea3f593cadcf2be.

1.1.5 exact package roots: inherited manifest=85783c16a14b84d66cdf08220ced97d7d8e89602b1fc2ab1fe6f4e92ae9c7bba; executable contract=c30727d07c28697899299af552ac3fbf6ce6e16a22de81a4dce31b703d0c1dc4; semantic graph=92845a0f60b71491538ae9161da08b32730a3a4cf26edd4c6a477f85ca9abfda; detached packet=d9ce7f0785801062c3711503b8a808c9c25fa523e9fe8e1325a553621bcf3f4e; Requirement bindings=67dd12d206e6c133d9ebdb71f5d2cb0c8a4227e95dd1a27e69f448f421b7d80d.

1.1.6 visibility=PUBLIC; Private remediation=FORBIDDEN; secret/credential/PII/customer/business/private-evidence emission=FORBIDDEN.

## 1.2 Exact denominator and verdict

1.2.1 distinct findings=15; P0=12; P1=2; P2=1; P3=0.

1.2.2 status counts: OPEN-UNACCEPTED=15; ACCEPTED=0; CLOSED=0; MERGED=0; SUPPRESSED=0; RISK-ACCEPTED=0; CLOSURE-TRANSFERRED=0.

1.2.3 every finding has one unique findingId and one equal unique noMergeKey. No record is a replacement, alias, merge or closure transfer for another record or for a v4 finding.

1.2.4 exact verdict=REJECT-AS-SEMANTICALLY-NON-EXECUTABLE; accepted Requirements=0/128; externally appointed result receipts=0/128; generations=0/2; Reconciliation=ABSENT; Definition Acceptance=ABSENT; Gate29=BLOCKED; Development freeze=ACTIVE.

1.2.5 Severity policy: P0 blocks semantic correctness/security or Acceptance integrity; P1 is a fail-closed but materially incomplete state/custody definition; P2 is a bounded Public metadata disclosure requiring explicit Protocol-authorized disposition; P3 count=0.

# 2. Non-merged finding records

## 2.1 TRD2V5-IHR-F001 — parser grammar and corpus are contradictory

2.1.1 findingId=TRD2V5-IHR-F001; noMergeKey=TRD2V5-IHR-F001; severity=P0; status=OPEN-UNACCEPTED.

2.1.2 locator=executable contract parserContract.grammar, parserContract.schemas and parserContract.negativeCorpus; remediation Requirement=TRD2V5-REQ-000; predecessor context=TRD2V4-IHR-F001; predecessor closure credit=0.

2.1.3 evidence denominator: negative corpus rows=6; exact mutated-byte fixtures=0/6; parser schemas ignoring additional fields=4/4; PARSE-N02 unknown-field row expecting duplicate-field terminal=1/1; undefined grammar categories include UTF8-SCALAR, UTF8-SCALAR-EXCEPT-BACKTICK-LF, LABEL and TABLE_CELL.

2.1.4 defect=the grammar is not closed or unambiguous, unknown-field behavior contradicts its mutation oracle, and corpus operations are labels without bytes, offsets or expected decoded maps.

2.1.5 impact=two parsers can choose different legal interpretations and fixtures while claiming the same terminal; 8-capture/128-part/84-envelope agreement cannot imply one Field-map semantics.

2.1.6 requiredRemediation=publish one closed byte grammar, define every lexical symbol, balance quoting, choose one unknown-field rule, and bind exact positive/negative bytes, capture IDs, offsets, roots and expected typed maps to two independent parsers.

2.1.7 acceptancePredicate=all grammar symbols resolve; ambiguity count=0; unknown-field rule is single-valued; exact fixture denominator is nonzero and complete; two independently appointed parser receipts match for every fixture and mutation.

2.1.8 safeTerminal=SOURCE-FIELD-MAP-BLOCKED; claimLimit=no parser or Field-map closure.

## 2.2 TRD2V5-IHR-F002 — canonical/closed schemas reject their own records

2.2.1 findingId=TRD2V5-IHR-F002; noMergeKey=TRD2V5-IHR-F002; severity=P0; status=OPEN-UNACCEPTED.

2.2.2 locator=canonicalSchema, semanticProgramSchema, executableVectorSchema, closedMachineSchemas, schemaOracleCorpus and severityEventSchema; remediation Requirement=TRD2V5-REQ-001; predecessor context=TRD2V4-IHR-F002; predecessor closure credit=0.

2.2.3 evidence denominator: SemanticPredicate records with forbidden extra keys=128/128; executable vectors with forbidden extra keys=1765/1765; SeverityEvent records with forbidden extra keys=84/84; priorVersion null versus UInt64Safe=84/84; authorityRoot not Bytes32LowerHex=84/84; missing triggerEvidenceRoot=84/84.

2.2.4 conflicting required-field counts: semantic program=14 versus 5; vector=15 versus 5; Retention=18 versus 8; Atomic Delete=14 versus 6; Backup=14 versus 6; Restore=14 versus 6.

2.2.5 defect=strict and permissive engines cannot both satisfy the package; the 51 schema-oracle entries omit actual fixture bodies; canonical control-character escaping does not select one unique byte encoding.

2.2.6 impact=records and roots cannot be independently validated or recomputed from one canonical byte stream; count/root agreement can conceal incompatible decoders.

2.2.7 requiredRemediation=replace parallel contradictory schemas with one complete closed schema per family; define exact escaping and typed operator arguments; provide actual corpus bytes and domain/collection constructors.

2.2.8 acceptancePredicate=two independent canonical engines accept every exact positive record, reject every exact mutation at the same terminal, and reproduce every record/collection root; unknown/undeclared types=0.

2.2.9 safeTerminal=CANONICAL-ROOT-ORACLE-BLOCKED; claimLimit=no canonical or root-oracle closure.

## 2.3 TRD2V5-IHR-F003 — semantic graph omits required causal families

2.3.1 findingId=TRD2V5-IHR-F003; noMergeKey=TRD2V5-IHR-F003; severity=P0; status=OPEN-UNACCEPTED.

2.3.2 locator=complete semantic graph familyCounts, nodes, edges, omittedMandatoryFamilies and membershipProof; remediation Requirement=TRD2V5-REQ-002; predecessor context=TRD2V4-IHR-F003; predecessor closure credit=0.

2.3.3 evidence denominator: contract SeverityVectors=420; graph SeverityVector nodes=0; severity test edges=0; declared omittedMandatoryFamilies=0. Acceptance inputs without semantic producer after umbrella-edge removal=46/46.

2.3.4 blanket edges: FreezeIncludesMandatoryMember=5438 and MandatoryMemberForAcceptance=5438. Receipt/result/invalidation node families=0. Mechanical graph SCC cycles=0, dangling=0 and duplicates=0 do not supply omitted semantics.

2.3.5 defect=membership and direct Acceptance reachability replace causal producer/use/invalidation proof; a mandatory executable family is wholly absent while completeness is declared.

2.3.6 impact=Acceptance reachability can remain true after semantic evidence is missing, disconnected or substituted.

2.3.7 requiredRemediation=graph every contract and receipt/result family, including all 420 severity vectors; add typed producer, consumer, invalidation, failure and terminal edges; exclude umbrella membership from causal reachability; execute graph mutations.

2.3.8 acceptancePredicate=expected family set equals actual family set; every one of 46 Acceptance roots has at least one non-umbrella producer path; all mutations change the typed graph root and block; omitted families=0 by independent derivation.

2.3.9 safeTerminal=TYPED-SEMANTIC-GRAPH-BLOCKED; claimLimit=no graph or Acceptance-subgraph closure.

## 2.4 TRD2V5-IHR-F004 — semantic predicates do not encode Requirement clauses

2.4.1 findingId=TRD2V5-IHR-F004; noMergeKey=TRD2V5-IHR-F004; severity=P0; status=OPEN-UNACCEPTED.

2.4.2 locator=executable contract semanticPredicates and semanticProgramSchema; remediation Requirement=TRD2V5-REQ-003; predecessor context=TRD2V4-IHR-F004; predecessor closure credit=0.

2.4.3 evidence denominator: inherited predicates=113; identical inherited operator sequences=113/113; predicates with statement field=0/128; predicates with statement/clause AST=0/128; actual predicate result receipts=0/128.

2.4.4 defect=BYTE-SLICE and five-field equality prove custody; NO-MERGE proves identity; SEMANTIC-REPLAY delegates to generic vectors. None proves the inherited statement. Remediation operators are high-level names without typed semantics.

2.4.5 impact=all 113 inherited Requirements can receive shared replay credit without executing one statement-specific obligation or counterexample.

2.4.6 requiredRemediation=compile every Requirement into a closed typed clause AST, define every operator, bind each clause to exact positive and falsifying fixtures, and forbid cross-Requirement/shared receipt credit.

2.4.7 acceptancePredicate=128/128 clause ASTs independently imply their exact Subject statements; every clause has at least one exact counterexample; omitted clauses=0; shared-credit receipts=0.

2.4.8 safeTerminal=PREDICATE-PROGRAM-BLOCKED and INHERITED-V4-REQUIREMENT-REPLAY-BLOCKED; claimLimit=byte preservation only.

## 2.5 TRD2V5-IHR-F005 — executable vectors are generic and impossible to dereference

2.5.1 findingId=TRD2V5-IHR-F005; noMergeKey=TRD2V5-IHR-F005; severity=P0; status=OPEN-UNACCEPTED.

2.5.2 locator=mainVectors, atomicVectors, missingValueVectors, publicVectors, severityVectors and contractVectors; remediation Requirement=TRD2V5-REQ-004; predecessor context=TRD2V4-IHR-F005; predecessor closure credit=0.

2.5.3 evidence denominator: total vectors=1765=353 targets×5; embedded fixture bytes/documents=0/1765; root-only fixtures=1765/1765; positive self-root comparisons=353/353; failure removals of generic evidenceRoot=353/353; concurrency permittedWinnerCount=1 with committedWriterCount=0=353/353; pre-commit-only recovery=353/353.

2.5.4 defect=ID pointers do not address array registries and main /requirements has no fixture document; a digest alone is not a fixture; operations and side effects are shared labels rather than target semantics.

2.5.5 impact=no independent runner can reproduce pre-state, operation, post-state, terminal, side-effect set or recovery. Root equality can pass without executing the target obligation.

2.5.6 requiredRemediation=provide portable exact fixture bytes and valid lookup semantics; define exact per-target operations and mutations; require exactly-one-winner CAS, concrete side effects and recovery before and after commit.

2.5.7 acceptancePredicate=every vector resolves its fixture and target; every operation is executable; observed state/terminal/effects match exact oracles in two independent runners; generic label-only vectors=0.

2.5.8 safeTerminal=EXECUTABLE-VECTOR-CORPUS-BLOCKED; claimLimit=no vector execution credit.

## 2.6 TRD2V5-IHR-F006 — Requirement raw-root overlays and invalidation are not closed

2.6.1 findingId=TRD2V5-IHR-F006; noMergeKey=TRD2V5-IHR-F006; severity=P0; status=OPEN-UNACCEPTED.

2.6.2 locator=semanticPredicates.expectedInputRoots, Requirement-root bindings, detached packet requirementRootBindings, invalidationContract and graph edges; remediation Requirements=TRD2V5-REQ-005 and TRD2V5-REQ-014; predecessor context=TRD2V4-IHR-F006 and TRD2V4-IHR-F015; predecessor closure credit=0.

2.6.3 evidence denominator: predicates directly expecting v5 Subject raw root=0/128; packet raw root=0/128; contract raw root=0/128; graph raw root=0/128; binding raw root=0/128. Overlay IDs=128; occurrences outside their binding definitions=0/128.

2.6.4 binding artifact raw root appears in an outer frozen input=0/5; packet requirement binding value=DETACHED-AFTER-PACKET with no exact root. Invalidation heads=30, current MISSING=30/30, dependency-to-head map=0 and graph invalidation edges=0.

2.6.5 semantic cycle=committing a generation, reconciliation or Definition Acceptance changes a head that belongs to the snapshot whose any change invalidates the dependent receipt; no pre/successor exclusion rule is defined.

2.6.6 impact=bindings can be substituted after freeze, stale receipts can be reused, and valid future commits can invalidate their own evidence.

2.6.7 requiredRemediation=outer-bind all six v5 raw artifacts; consume typed overlays in all predicates; graph every receipt-to-head dependency; define atomic pre-head/successor-head rules that avoid self-invalidation.

2.6.8 acceptancePredicate=one immutable outer packet binds all raw roots; every predicate receipt includes the same current overlay/snapshot root; any dependent-head mutation blocks; commit readbacks equal the declared successor snapshot without circularity.

2.6.9 safeTerminal=VALIDATION-RESULT-STALE or DEFINITION-INPUT-MISSING; claimLimit=no freshness/raw-binding closure.

## 2.7 TRD2V5-IHR-F007 — review atomicity, authority and custody are incomplete

2.7.1 findingId=TRD2V5-IHR-F007; noMergeKey=TRD2V5-IHR-F007; severity=P0; status=OPEN-UNACCEPTED.

2.7.2 locator=reviewOperations, contractVectors, ReviewGenerationReceipt, ReconciliationReceipt, DefinitionAcceptanceEnvelope and invalidationContract; remediation Requirement=TRD2V5-REQ-006; predecessor context=TRD2V4-IHR-F007; predecessor closure credit=0.

2.7.3 evidence denominator: review operations=3; review vectors=15; exact state-store/committed-envelope fixtures=0/15; APPEAL occurrences in exact six=0; CUSTODY or CHAIN-OF-CUSTODY occurrences=0.

2.7.4 RECONCILE and DEFINITION-ACCEPT required lists omit appointmentSetRoot and role identity roots while their programs assert current appointment and separation. Local appeal, custody transfer, review-authority expiry and revocation producers are absent.

2.7.5 defect=CAS, one-use authority, two generations, no-self-approval and crash recovery are assertion labels not closed state transitions with complete inputs.

2.7.6 impact=authority consumption, separation, reconciliation completeness and evidence custody cannot be audited or recovered deterministically.

2.7.7 requiredRemediation=define complete review/authority/custody schemas and exact operations for generation seal, reconcile, accept, revoke, expire and appeal; include typed actor inequality and one-use consumption; execute all crash/CAS vectors.

2.7.8 acceptancePredicate=exactly two disjoint generation receipts, one lossless reconciliation and one Acceptance envelope validate against current appointment/revocation/time/custody roots; P0/P1 open set=0; every P2/P3 has explicit accepted disposition; self-approval=0.

2.7.9 safeTerminal=REVIEW-GENERATION-SEAL-BLOCKED, RECONCILIATION-BLOCKED or DEFINITION-ACCEPTANCE-BLOCKED; claimLimit=no generation/reconciliation/Acceptance credit.

## 2.8 TRD2V5-IHR-F008 — MissingValue conflict and expiry transitions are absent

2.8.1 findingId=TRD2V5-IHR-F008; noMergeKey=TRD2V5-IHR-F008; severity=P1; status=OPEN-UNACCEPTED.

2.8.2 locator=missingValueTransitionSchema, missingValueMachines and missingValueVectors; remediation Requirement=TRD2V5-REQ-007; predecessor context=TRD2V4-IHR-F008; predecessor closure credit=0.

2.8.3 evidence denominator: machines=27; vectors=135; legal transitions=8; transitions entering CONFLICT=0/8; transitions leaving CONFLICT=0/8; expiry transitions=0/8; actual transition receipts=0; current UNRESOLVED=27/27.

2.8.4 defect=CAS conflict cannot become the declared CONFLICT state; expired/revoked appointment behavior lacks a complete local transition; ACCEPT actor inequality is an untyped string.

2.8.5 impact=current behavior is fail-closed, but future implementations can diverge on conflict, expiry and reviewer/controller identity separation.

2.8.6 requiredRemediation=add typed conflict ingress/reconciliation and authority-expiry transitions, distinct actor roots, deterministic new heads and exact transition/concurrency/recovery fixtures.

2.8.7 acceptancePredicate=every state/operation pair has one disposition; conflict and expired/revoked authority cannot PASS; one-winner/readback receipts validate in two engines; inferred/default values=0.

2.8.8 safeTerminal=SOURCE-REFERENCE-INVALID; claimLimit=no MissingValue resolution credit.

## 2.9 TRD2V5-IHR-F009 — lifecycle trigger legality is undefined

2.9.1 findingId=TRD2V5-IHR-F009; noMergeKey=TRD2V5-IHR-F009; severity=P0; status=OPEN-UNACCEPTED.

2.9.2 locator=dataLifecycle classes, states, events and matrixRows; remediation Requirement=TRD2V5-REQ-009; predecessor context=TRD2V4-IHR-F010; predecessor closure credit=0.

2.9.3 evidence denominator: classes=10; states=16; events=20; rows=3200; missing/duplicate/ambiguous=0/0/0; admitted denominator=0; actual receipts=0; undeclared trigger schema references=3200/3200.

2.9.4 state/event pairs identical across all ten classes=291/320; varying=29/320. ACTIVE direct-delete blocks=30/30; held direct-delete blocks=60/60; PURGED outgoing ALLOW=0/200.

2.9.5 contradictory rows=ACTIVE→EXPIRED ALLOW with INACTIVE-RECORD prose guard=8; corresponding executable active/hold Boolean requirements=true=0/10.

2.9.6 defect=guard strings and an undeclared event type cannot validate authority, Legal Hold, active status, trusted time, provider/store identity or CAS. Structural blocks are therefore not executable safety proof.

2.9.7 requiredRemediation=publish closed event and guard ASTs; bind exact current heads; resolve ACTIVE/EXPIRE; execute all admitted tuples in two engines and prove reachable-state non-resurrection.

2.9.8 acceptancePredicate=accepted source-universe denominator is nonzero and closed; every admitted class/state/event has one executed receipt; ACTIVE/HOLD delete passes=0; PURGED-to-live paths=0; engine disagreements=0.

2.9.9 safeTerminal=DATA-LIFECYCLE-BLOCKED; claimLimit=matrix shape only.

## 2.10 TRD2V5-IHR-F010 — Retention Plan v2 atomic deletion is asserted, not defined

2.10.1 findingId=TRD2V5-IHR-F010; noMergeKey=TRD2V5-IHR-F010; severity=P0; status=OPEN-UNACCEPTED.

2.10.2 locator=retentionV2.planSchema, atomicDeleteSchema, closed RetentionPlanV2 and AtomicDeleteReceiptV2; remediation Requirement=TRD2V5-REQ-010; predecessor context=TRD2V4-IHR-F011; predecessor closure credit=0.

2.10.3 evidence denominator: plan fields 18 versus closed 8; delete receipt fields 14 versus closed 6; actual plans=0; executed deletes=0; connected adapter=false; exact delete vectors=0.

2.10.4 defect=provider prepare/finalize, compensation and cross-provider transaction semantics are absent; allOrNothingDurableState is a scalar assertion; generic vectors never exercise partial/unknown provider effects after CAS.

2.10.5 impact=irreversible deletion can exceed authorization, partially finalize or become unknown without a mathematically sufficient pre-delete safety proof and recovery path.

2.10.6 requiredRemediation=unify complete schemas; define deterministic IDs, exact candidate/authorized/confirmed sets, provider capabilities and compensation/reconciliation; execute every crash point while keeping post-delete readback audit-only.

2.10.7 acceptancePredicate=confirmed identities are an exact pre-delete authorized subset; active or held members=0; one fenced CAS produces zero or one recoverable commit; unauthorized/partial/unknown effects cannot be reported PASS.

2.10.8 safeTerminal=RETENTION-DELETE-BLOCKED or RETENTION-DELETE-PARTIAL/UNKNOWN-RECONCILIATION-REQUIRED; claimLimit=no deletion-safety credit.

## 2.11 TRD2V5-IHR-F011 — Backup/Restore identity and evidence are not constructively bound

2.11.1 findingId=TRD2V5-IHR-F011; noMergeKey=TRD2V5-IHR-F011; severity=P0; status=OPEN-UNACCEPTED.

2.11.2 locator=backupRestoreV2, closed BackupEvidenceV2 and RestoreEvidenceV2, and lifecycle restore rows; remediation Requirement=TRD2V5-REQ-011; predecessor context=TRD2V4-IHR-F012; predecessor closure credit=0.

2.11.3 evidence denominator: nested Backup fields 14 versus closed 6; nested Restore fields 14 versus closed 6; actual Backup evidence=0; actual Restore evidence=0; syntactic PURGED outgoing ALLOW=0/200.

2.11.4 mathematical defect=backupId must content-address complete evidence that includes backupId, but no exclusion rule breaks the self-hash. restoreId and newRestoreIdentity have no deterministic constructor.

2.11.5 semantic defect=R2 equality, boundary observations, retention window, distinct identities, prior obligations, privacy replay and re-delete are labels without typed proof bodies or exact fixtures.

2.11.6 impact=backup identity may be impossible/non-portable and a restore can be activated from evidence that does not independently bind source, object set, R2, time window and deletion obligations.

2.11.7 requiredRemediation=hash an explicitly backupId-excluded body; provide one complete closed evidence schema; bind exact source/backup/restore identities, digests, R2 inventory, two window boundaries and privacy/re-delete receipts; execute recovery fixtures.

2.11.8 acceptancePredicate=every ID is deterministically recomputable; source, backup and restore identities are distinct; exact digests/R2/window agree; privacy replay and required re-delete precede activation; PURGED resurrection paths=0.

2.11.9 safeTerminal=RESTORE-PRIVACY-REPLAY-BLOCKED; claimLimit=no Backup/Restore safety credit.

## 2.12 TRD2V5-IHR-F012 — Public control mapping has no information-flow execution

2.12.1 findingId=TRD2V5-IHR-F012; noMergeKey=TRD2V5-IHR-F012; severity=P0; status=OPEN-UNACCEPTED.

2.12.2 locator=publicControls, publicHardeningGates, publicVectors, privatePathCount and PRCH2 v2 source; remediation Requirement=TRD2V5-REQ-012; predecessor context=TRD2V4-IHR-F013; predecessor closure credit=0.

2.12.3 evidence denominator: source Requirements=52; unique mappings=52/52; controls with statement/assertion AST/program=0/52; gates=52 with distinct shape count=1; vectors=260; accepted control receipts=0/52; gate receipts=0/52.

2.12.4 defect=scan names and privatePathCount=0 replace a closed Public source/sink/information-flow denominator and exact Git/runtime/provider/recovery fixtures.

2.12.5 impact=secret, PII, Private Evidence or business data can flow to Public Git history, logs, artifacts, runtime surfaces or recovery while generic root tests pass.

2.12.6 requiredRemediation=bind each PRCH2 clause to typed flows and exact disclosure-safe fixtures; execute clause-specific scans/vectors over a closed runtime and repository surface denominator; retain only safe evidence roots.

2.12.7 acceptancePredicate=52/52 controls and 260/260 exact vectors execute; surface denominator omission=0; private/secret/PII/business flow count=0; rollback/recovery does not re-emit removed data.

2.12.8 safeTerminal=PUBLIC-HARDENING-BLOCKED; claimLimit=mapping/count only.

## 2.13 TRD2V5-IHR-F013 — severity transition and SOE-050 escalation are not executable

2.13.1 findingId=TRD2V5-IHR-F013; noMergeKey=TRD2V5-IHR-F013; severity=P0; status=OPEN-UNACCEPTED.

2.13.2 locator=severityEventSchema, severityEvents, severityBindings, severityVectors and semantic graph; remediation Requirement=TRD2V5-REQ-013; predecessor context=TRD2V4-IHR-F014; predecessor closure credit=0.

2.13.3 evidence denominator: bindings=84; genesis events=84; schema-invalid genesis events=84/84; vectors=420; graph severity-vector nodes=0/420; actual transition receipts=0.

2.13.4 SOE-050 positive vector supplies accepted reachability observation=0, appends P0 event=0 and changes history head=0; it only verifies current P2 root. triggerEvidenceRoot is absent from 84/84 genesis events.

2.13.5 defect=no valid transition schema or executable trigger body enforces append-only history, legal severity changes, first-only P2→P0 escalation, revoked evaluator blocking or appeal correction.

2.13.6 impact=first Push/Merge/Release/Deploy reachability can fail to escalate SOE-050 or can be interpreted differently by implementations.

2.13.7 requiredRemediation=publish valid event/transition schemas, exact trigger evidence and current heads; graph and execute all 420 vectors including first, duplicate, stale, revoked, concurrent and crash cases.

2.13.8 acceptancePredicate=84 histories validate; every legal transition appends exactly one event under CAS/fence; SOE-050 first accepted reachability yields P0 exactly once; missing/stale/revoked/conflict cases block.

2.13.9 safeTerminal=SEVERITY-TRANSITION-BLOCKED; claimLimit=no severity/escalation closure.

## 2.14 TRD2V5-IHR-F014 — absolute local paths leak in PUBLIC artifacts

2.14.1 findingId=TRD2V5-IHR-F014; noMergeKey=TRD2V5-IHR-F014; severity=P2; status=OPEN-UNACCEPTED.

2.14.2 locator=inherited manifest sourceArtifact.pathAdvisoryOnly and executable contract subject.pathAdvisoryOnly; predecessor context=NEW-V5-OBSERVATION; predecessor closure credit=0.

2.14.3 evidence denominator: exact-six absolute /Users path occurrences=2; files affected=2/6; bounded email/PEM/AWS/GitHub-token pattern hits=0.

2.14.4 defect=advisory-only changes authority semantics but does not redact the local username and workstation directory layout from a permanently PUBLIC repository.

2.14.5 impact=unnecessary personal/operational metadata disclosure; bounded P2 because no secret/token was observed in this scan.

2.14.6 requiredRemediation=publish repository-relative locators only, preserve content hashes, and run disclosure-safe current-tree and Git-history scans on the successor.

2.14.7 acceptancePredicate=absolute local path count=0 in all publishable successor bytes and relevant Git history, with accepted Protocol disposition for this P2.

2.14.8 safeTerminal=PUBLIC-HARDENING-BLOCKED; claimLimit=two exact pathname occurrences only.

## 2.15 TRD2V5-IHR-F015 — predecessor ledger root is unavailable in the frozen custody set

2.15.1 findingId=TRD2V5-IHR-F015; noMergeKey=TRD2V5-IHR-F015; severity=P1; status=OPEN-UNACCEPTED.

2.15.2 locator=v4 hostile review section 1.3.10 and allowed predecessor/source-capture set; predecessor context=NEW-CUSTODY-OBSERVATION; predecessor closure credit=0.

2.15.3 expected identity=c0feec2e5c37ca134240c5b164d2014df927dad5abd8df8863e40818fc540755, 993 lines / 98306 bytes. Current same-name path=cd18e7b68ec95a08e3152a2caef27bead53e81c9bbd4b4ffc14fe622ee8f0d74, 1075 lines / 108174 bytes. Expected-root captures=0/8.

2.15.4 defect=the exact bytes cited by the v4 review are neither at the advisory path nor attached as a content-addressed capture in the allowed frozen set.

2.15.5 impact=the cited predecessor observation cannot be replayed; substituting changed bytes would violate raw-root custody and can silently alter inherited semantics.

2.15.6 requiredRemediation=attach the exact c0feec... bytes and bind them into the packet/graph, or explicitly invalidate and re-derive every dependent observation from a new frozen root.

2.15.7 acceptancePredicate=the cited exact bytes are portably acquired and hash-equal, or every dependent observation is enumerated, invalidated and independently recomputed against a newly accepted source root; silent substitution=0.

2.15.8 safeTerminal=PORTABLE-PACKET-BLOCKED or DEFINITION-INPUT-MISSING; claimLimit=one exact missing predecessor byte identity.

# 3. Non-merge, acceptance and routing rules

## 3.1 Non-merge invariants

3.1.1 The 15 IDs TRD2V5-IHR-F001 through TRD2V5-IHR-F015 form an exact closed denominator for this review. Missing IDs=0; duplicate IDs=0.

3.1.2 noMergeKey equality is one-to-one with findingId. A shared source Requirement, predecessor Finding, terminal or remediation file does not merge defects.

3.1.3 F002 schema contradiction, F005 vector executability, F009 lifecycle safety, F010 delete atomicity, F011 restore safety, F012 Public flow and F013 severity execution remain distinct because each has a different falsifying fixture, unsafe state and acceptance predicate.

3.1.4 No Finding may inherit closure from v4, from a producer statement, from a hash/count, from another v5 Finding or from a future successor. Each requires its own exact accepted disposition and proof.

## 3.2 Severity and disposition arithmetic

3.2.1 P0 set={F001,F002,F003,F004,F005,F006,F007,F009,F010,F011,F012,F013}; count=12.

3.2.2 P1 set={F008,F015}; count=2.

3.2.3 P2 set={F014}; count=1.

3.2.4 P3 set={}; count=0.

3.2.5 P0+P1+P2+P3=12+2+1+0=15. Open P0/P1=14; therefore Definition Acceptance is forbidden. F014 requires explicit accepted Protocol-authorized P2 disposition and cannot be silently waived.

## 3.3 Final frozen state

3.3.1 OPEN=15/15; ACCEPTED=0/15; CLOSED=0/15; MERGED=0/15; SUPPRESSED=0/15; RISK-ACCEPTED=0/15; CLOSURE-TRANSFERRED=0/15.

3.3.2 accepted Requirements=0/128; result receipts=0/128; generation seals=0/2; Reconciliation=ABSENT; Definition Acceptance=ABSENT.

3.3.3 exact verdict=REJECT-AS-SEMANTICALLY-NON-EXECUTABLE.

3.3.4 Gate29=BLOCKED; Development freeze=ACTIVE; product/build/runtime/Git/GitHub/provider/credential mutations=0.

3.3.5 Mechanical structure, hashes, roots, counts, manifests and generic labels are not semantic Acceptance.
