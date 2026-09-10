# 1. Connect — Public Repository and Cyber Hardening v5 independent hostile-review Findings Manifest

## 1.1 Identity, denominator and claim limit

1.1.1 `artifactId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-V5-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30`.

1.1.2 `reviewId=PRCV5-IHR-2026-08-30`.

1.1.3 `artifactClass=DETACHED-NON-MERGED-INDEPENDENT-FINDINGS-MANIFEST;PLANNING-ONLY;NOT-AUTHORITY;NOT-IMPLEMENTATION;NOT-OPERATIONAL-EVIDENCE;NOT-ACCEPTANCE;NOT-CLOSURE`.

1.1.4 Frozen Subject SHA-256=`2ac2fb4f46d4277081f6cf763c8b24bba4a2610e8fd1679dd43c0990a82ae140`;frozen manifest SHA-256=`2478e12103c568b8a68183c4974a0cb0cf47f2d8fb43671732c5a809c00ae949`;frozen packageContentRoot=`19be4c773af62a79945c01c1d3a71d2c7d650b1cbda0b99ca1ef815e82b8a31b`.

1.1.5 New Findings denominator=`18`;IDs=`PRCV5-IHR-F001..F018`;each ID and noMergeKey is separate. Range, merge, Alias, waiver, suppression and shared credit are forbidden.

1.1.6 Every Finding below is `OPEN`;closureCredit=`0`;Acceptance credit=`0`.

# 2. Non-merged Findings

## 2.1 PRCV5-IHR-F001 — logical locators are relative to the wrong repository root

- severity=P0;state=OPEN;closureCredit=0.
- evidence=The actual Git top-level contains the package at `web/docs/planning/...`, while the manifest and all tools use `docs/planning/...`, reject `web/`, and resolve against caller CWD. Generator and both Readers PASS only from `web/` and terminate ENOENT from the actual Git top-level.
- impact=A checkout-root invocation, CI runner or independent reviewer cannot locate the frozen package using its declared repository-relative coordinates;the portability and public-safe locator claim is false.
- remediation=Define one explicit repositoryRoot discovery rule from Git top-level or a frozen manifest anchor;store actual Git-root-relative paths;resolve every path beneath that root independent of caller CWD.
- closureTest=Generator and both Readers produce the same roots and counters from Git top-level, any nested CWD and an independent checkout;changing root, adding `..`, absolute prefixes or resolving outside the root blocks before open.
- noMergeKey=PRCV5-REPOSITORY-ROOT-LOCATOR-NAMESPACE-CWD-DEPENDENT

## 2.2 PRCV5-IHR-F002 — bytes are opened before path, symlink, file-type and size validation

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Reader A reads members at line 203 before lstat at line 204;Reader B reads at line 366 before file/symlink checks at line 368. Source reads have no lstat/symlink/type check. Shards are fully read and parsed before size validation;parents are never held or revalidated.
- impact=A symlink swap, replaced parent, FIFO/device or oversized payload can be opened, blocked on, escaped or consumed before the supposed fail-closed check;the checked pathname can differ from the opened object.
- remediation=Resolve under a trusted root with descriptor-relative no-follow opens;validate every parent/final component, regular-file identity and pre-read size;stream with a hard cap;post-readback the same object identity.
- closureTest=final symlink, parent symlink, rename race, FIFO, device, hard-link substitution, size boundary and growth-during-read all block before untrusted bytes are consumed or output is written.
- noMergeKey=PRCV5-READ-BEFORE-SAFETY-CHECK-PATH-SYMLINK-SIZE-TOCTOU

## 2.3 PRCV5-IHR-F003 — the count-correct causal DAG omits critical semantic universes

- severity=P0;state=OPEN;closureCredit=0.
- evidence=The graph is a valid `6969/7417` DAG, but its derivationInputs omit digest, lifecycle, PUBLIC-flow and publication roots;it has no Genesis/appointment/Recovery, CAS, trusted-time, revocation, visibility, scanner, budget, storage or operation-effect nodes/edges. Detached Acceptance has only four ancestors and no Finding, Requirement, output, Producer or Permit ancestor.
- impact=Correct counters and acyclicity can coexist with complete causal omission;Review/Acceptance can be represented without any path from the obligations or operational gates they purport to accept.
- remediation=Derive one closed cross-registry graph with every semantic root, exact node/edge constructors, authority/lifecycle/evidence/Permit/publication joins and an all-of Acceptance cut.
- closureTest=independent graph regeneration proves uniqueness, endpoints, DAG, exact edge set and required reachability;removing any obligation or gate severs one named path and blocks Acceptance.
- noMergeKey=PRCV5-CAUSAL-GRAPH-SEMANTIC-UNIVERSES-AND-ACCEPTANCE-REACHABILITY-OMITTED

## 2.4 PRCV5-IHR-F004 — vector evaluator identities, targets, pre-state roots and effects are ignored

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Fourteen in-memory single-field mutations left actual terminals unchanged: AST languageRoot/predicateId/preStateRoot/targets;SCHEMA schemaRoot/preStateRoot/target;NamedUse name/cell/pre-state;Permit-schema preStateRoot;lifecycle reducerId/preStateRef;digest preStateRoot. effectSet and vectorClass are also unread by every evaluator.
- impact=A vector may report the expected terminal while naming a different language, schema, reducer, Finding, predicate, Permit cell, preimage or effect;rooted carrier bytes do not create causal binding.
- remediation=Define an exact evaluator input projection per kind and require every declared binding field;recompute evaluator/schema/reducer/pre-state/effect roots and reject unused or surplus semantic fields.
- closureTest=mutating each binding field alone changes the actual terminal to BLOCK;mutating expectedTerminal alone never changes actualTerminal;both Readers expose identical field-use coverage.
- noMergeKey=PRCV5-VECTOR-EVALUATOR-TARGET-PRESTATE-EFFECT-BINDING-ERASURE

## 2.5 PRCV5-IHR-F005 — 93 inherited closure obligations collapse to identity-only predicates

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Every inherited row has one atomic predicate named IDENTITY and two identity/noMerge vectors despite `204` distinct Requirement edges and source closureTests containing operational, authority, lifecycle and evidence obligations.
- impact=Exact ID preservation can be mistaken for testing the inherited semantic Finding;none of the original closure clauses is causally exercised.
- remediation=Parse every inherited closureTest into a separate finite atomic-predicate set and bind each predicate to its Requirements, real output state, positive control and single-fault negative vector.
- closureTest=all 93 source closureTests round-trip to exact rooted predicates;removing or changing one predicate/vector blocks only that Finding and cannot receive identity, range or another Finding's credit.
- noMergeKey=PRCV5-INHERITED-93-CLOSURE-SEMANTICS-REDUCED-TO-IDENTITY

## 2.6 PRCV5-IHR-F006 — 23 remediation controls execute synthetic mini-states, not real outputs

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Each remediation control generates one vector-owned positive object and single-conjunct flag mutations. These AST states are not derived from the authority, lifecycle, Permit, scanner, publication, graph or Acceptance objects named by the v4 Finding.
- impact=All control flags can PASS while the actual subsystem remains missing, contradictory or disconnected;the 23 one-to-one labels do not close the 23 semantics.
- remediation=Replace flag mini-states with operations over exact root-bound registry instances and authoritative readbacks;bind every control predicate to its concrete producer/output and failure terminal.
- closureTest=each of the 23 controls has a real positive execution and one causal negative per conjunct;substituting the synthetic state, wrong output root or unconnected provider receipt blocks.
- noMergeKey=PRCV5-TWENTY-THREE-REMEDIATION-CONTROLS-SYNTHETIC-NONCAUSAL

## 2.7 PRCV5-IHR-F007 — the exhaustive CAS proof never traverses a crash or durable Recovery state

- severity=P0;state=OPEN;closureCredit=0.
- evidence=At each of 492 alleged crash cuts the model clones state, marks one actor terminal, checks the in-memory store did not change, then discards the crashed state. No restart, persisted attempt, recovery actor or resumed traversal occurs;failure-before-write and response-loss are fixed wrapper branches.
- impact=`crashMutationCount=0` is tautological;partial persistence, lost responses, repeated effects and divergent readbacks remain untested despite the exhaustive label.
- remediation=Model durable store writes, crashable boundaries, restarted processes, operation-key lookup, authoritative readback and forward Recovery as actual transitions included in exhaustive traversal.
- closureTest=every pre/post-write crash cut reaches one legal terminal;response loss converges without duplicate effect/event/outbox;partial durability and retry without readback block.
- noMergeKey=PRCV5-CAS-CRASH-CUTS-COUNTED-BUT-NOT-TRAVERSED-OR-RECOVERED

## 2.8 PRCV5-IHR-F008 — authority, trusted time, revocation and replay are caller-controlled scalars

- severity=P0;state=OPEN;closureCredit=0.
- evidence=CAS admission consumes `schemaValid`, `authorityCurrent`, `revoked` and `replayUsed` booleans plus caller strings/hashes;trusted time is a lexical string comparison;epoch is unused. No signed issuer, clock, revocation-head or descendant-closure receipt is verified.
- impact=A caller can assert its own authority, freshness and non-revocation, or supply lexically ordered but unauthenticated timestamps, while the reducer returns COMMITTED.
- remediation=Bind typed signed authority, trusted-time, revision, revocation-closure and replay-ledger receipts to repository/operation/Permit identities and freshness windows;verify signatures and current heads before CAS.
- closureTest=forged signer, wrong subject, stale epoch, rollback clock, revoked ancestor, stale revocation head, replayed operation key and mismatched repository all deny;only fresh authoritative receipts pass.
- noMergeKey=PRCV5-CAS-AUTHORITY-TIME-REVOCATION-REPLAY-CALLER-CONTROLLED

## 2.9 PRCV5-IHR-F009 — the four-Permit matrix is only class-string equality

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PERMIT-NAMEDUSE returns PASS iff presentedPermitClass equals consumerPermitClass. Replacing a legal cell's namedUse with `consumeWrongPermit` leaves PASS. It never reads Permit bytes, typeTag, domain, schema, issuer, consumer, reader, TTL, CAS, revocation, one-use ledger, target or effect.
- impact=Four same-class string pairs appear as legal presentations without demonstrating any legal Permit, and cross-class denial does not prove typed consumer isolation.
- remediation=Execute each class-specific NamedUse over exact Permit bytes and common lifecycle admission;bind schema/domain, roles, target, operation, one-use CAS and effect type.
- closureTest=four fully valid typed Permits succeed only at their named consumers;all twelve cross-class and all wrong-name/root/domain/payload/role presentations deny.
- noMergeKey=PRCV5-FOUR-PERMIT-MATRIX-CLASS-STRING-EQUALITY-NOT-TYPED-CONSUMPTION

## 2.10 PRCV5-IHR-F010 — authority and independence are unverified planning labels

- severity=P0;state=OPEN;closureCredit=0.
- evidence=The 54-row appointment chain is structurally continuous and has zero self edges, but actual Genesis, every appointment and actual Recovery are MISSING. Producer/group roots are deterministic labels;Readers do not recompute row roots, appointment heads, authority-edge equivalence, ancestry or authority DAG.
- impact=Distinct hashes can stand in for distinct people, keys, implementations or owners, and a future coordinated rewrite can claim independence without an authoritative appointment chain.
- remediation=Admit a detached signed Genesis, CAS-bound appointments and independent Recovery receipts;recompute all row/group roots and enforce disjoint prohibited ancestry through a closed authority graph.
- closureTest=missing/forged/stale/conflicting appointment, self-appointment, shared prohibited ancestor/root, circular authority or compromised Recovery owner blocks;valid detached receipts reproduce the exact chain.
- noMergeKey=PRCV5-AUTHORITY-APPOINTMENT-INDEPENDENCE-PLANNING-LABELS-UNVERIFIED

## 2.11 PRCV5-IHR-F011 — PUBLIC pre/post invariants lack authenticated remote receipts

- severity=P0;state=OPEN;closureCredit=0.
- evidence=The package stores an unauthenticated PUBLIC literal. Pre/post/continuous receipts are MISSING and correctly block, but no schema/evaluator verifies provider response bytes, repository node identity, signer, trusted observation time, freshness or operation association.
- impact=A future arbitrary 64-hex value or wrong-repository observation can be labeled a visibility receipt;the PUBLIC invariant is not causally enforced around mutation.
- remediation=Define authenticated provider readback receipts bound to repository node, operation attempt, pre/post phase, visibility/private flags, trusted time and freshness;join them atomically to every allowed operation.
- closureTest=wrong repository, PRIVATE at any phase, missing phase, stale/unsigned response, response-loss ambiguity or TOCTOU blocks;fresh pre/post PUBLIC receipts from the authoritative source pass.
- noMergeKey=PRCV5-PUBLIC-PRE-POST-INVARIANT-UNAUTHENTICATED-REMOTE-RECEIPTS

## 2.12 PRCV5-IHR-F012 — scanner receipts do not execute or authenticate scan semantics

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Actual scanner receipts are null/MISSING. Planning receipts contain deterministic hashes;their schema has no signer/signature, authority appointment, explicit packageContentRoot equality, scan terminal, finding count/detail, clean predicate or executable ruleset/corpus binding. Readers validate shapes and distinct literals only.
- impact=Opaque hashes can be relabeled as two independent clean scans and adjudication without either engine scanning the exact bytes or an independent owner resolving disagreement.
- remediation=Define signed scan receipts over exact byte cut, engine/ruleset/version, class/provider corpus, findings and terminal;verify appointments, freshness, independent execution and adjudication.
- closureTest=engine/ruleset alias, unequal input, missing class/pattern, stale/forged receipt, hidden finding or unresolved disagreement blocks every Public Permit;two independent clean scans and separate adjudication pass.
- noMergeKey=PRCV5-SCANNER-ADJUDICATION-RECEIPTS-OPAQUE-NONEXECUTED-UNAUTHENTICATED

## 2.13 PRCV5-IHR-F013 — canonical JSON and schema semantics are incompletely implemented

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Both JSON parsers accept duplicate keys;neither enforces NFC or rejects negative zero;Reader A sorts keys by UTF-16 rather than Unicode code points. Validators ignore schema/instance roots and field descriptor bindings, and schema closure scans output-family references but not all nested-schema references.
- impact=Different parsers can derive different identities or accept a byte sequence prohibited by the declared profile;stale/mutated schema semantics can validate under both Readers.
- remediation=Implement one explicit lexical JSON profile independently in both Readers, including duplicate/NFC/number/key-order rules;recompute every schema/type/instance/language root and execute descriptor metadata exactly.
- closureTest=duplicate keys, non-NFC strings/keys, negative zero, astral-key ordering, unknown/surplus fields, descriptor mutations and stale roots all deny identically;valid Unicode corpus yields identical canonical bytes/roots.
- noMergeKey=PRCV5-CANONICAL-JSON-SCHEMA-LANGUAGE-INCOMPLETE-COMMON-MODE

## 2.14 PRCV5-IHR-F014 — Acceptance is split across two unjoined objects

- severity=P0;state=OPEN;closureCredit=0.
- evidence=`PRCV5-OBJECT-040` is produced by Producer 040 and has no manifest-SHA or Reader-report-root fields. The graph's `PRCV5-DETACHED-ACCEPTANCE` is attributed to a separate special Producer but has no production edge, schema, authority appointment or CAS envelope. Its ancestors exclude all Findings, Requirements, outputs and Permits.
- impact=A future Acceptance can bind one partial object while omitting the other, or cite mechanical reports without the semantic/operational universe and sole authorized acceptance Producer.
- remediation=Create one cycle-free detached Acceptance envelope with exact Subject/package/manifest/report/review/reconciliation/evidence/closure roots, all-of predicate, sole appointed Producer and expected-old CAS.
- closureTest=removing/substituting any required root, changing manifest bytes, omitting any Finding/Requirement/Permit gate, wrong Producer or stale head blocks;one exact higher cut succeeds without a hash cycle.
- noMergeKey=PRCV5-DUAL-UNJOINED-ACCEPTANCE-OBJECTS-MISSING-EXACT-HIGHER-CUT

## 2.15 PRCV5-IHR-F015 — Reader independence and two-generator parity are nominal

- severity=P0;state=OPEN;closureCredit=0.
- evidence=The Readers use different languages but near-isomorphic checks, evaluator logic and CAS model, and share every demonstrated blind spot. `independentRegenerators` names both Readers, yet neither invokes or reimplements generation;only the Producer's Node Generator exists.
- impact=PASS/PASS and two distinct source hashes do not detect common semantic omission or prove independent reconstruction of derived bytes.
- remediation=Implement independently designed Reader specifications and a second independent generator;publish per-check semantic coverage, disagreement handling and byte/root parity from the identical frozen cut.
- closureTest=seeded mutations missed by one implementation are caught by the other and force disagreement BLOCK;two independent generators reproduce all 26 generated artifacts and every shard root from Git top-level.
- noMergeKey=PRCV5-READER-INDEPENDENCE-AND-DUAL-GENERATION-NOMINAL-COMMON-MODE

## 2.16 PRCV5-IHR-F016 — source-reference root and zero duplication are trusted declarations

- severity=P1;state=OPEN;closureCredit=0.
- evidence=Independent review confirms current sources=`14`,duplicate source hashes=`0`,duplicate member hashes=`0`,source/member hash intersections=`0`. Both Readers nevertheless trust `sourceBytesPhysicallyDuplicated=0` and per-source booleans and do not recompute sourceReferenceRoot or physical set intersection.
- impact=A future package can preserve Reader PASS while its source-reference aggregate or duplication claim is stale after a coordinated outer-root update.
- remediation=Recompute sourceReferenceRoot from exact source projections and compare physical content/object identities across source and package sets;do not consume producer duplication booleans as proof.
- closureTest=duplicate source/member bytes, stale sourceReferenceRoot, changed source order/role/path/bytes or false duplication flag blocks both Readers;the current 14/0 cut passes.
- noMergeKey=PRCV5-SOURCE-REFERENCE-ROOT-ZERO-DUPLICATION-DECLARATIVE-NOT-RECOMPUTED

## 2.17 PRCV5-IHR-F017 — repository budgets and external storage have no executable admission gate

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Current 28 members are below 50 MiB, but total/growth/clone budgets are three null rows with no schema, measurement/readback algorithm, freshness or Push binding. External storage accepts opaque policy/recovery hashes and has no locator/content/readback/expiry/deletion/restore evaluator.
- impact=Future arbitrary measurements or hashes can be labeled accepted, or a stale/mutable/private/unavailable object can enter a publication decision without executing the required lifecycle.
- remediation=Define typed budget and external-artifact snapshots/transitions with authoritative acquisition, owner/policy authority, freshness, immutable content readback, retention/deletion/availability, restore execution and Public-Push all-of integration.
- closureTest=unknown/stale/exceeded budget, 50 MiB boundary, mutable/mismatched/private/expired/deleted/unavailable artifact, missing owner or failed restore denies;fresh within-budget measurements and exact restore pass.
- noMergeKey=PRCV5-REPOSITORY-BUDGET-EXTERNAL-STORAGE-ADMISSION-NONEXECUTABLE

## 2.18 PRCV5-IHR-F018 — no semantic end-to-end positive path proves joint satisfiability

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Positive fixtures exist only per component. No one input cut instantiates actual Genesis/appointments, trusted time, operational scanners, authenticated PUBLIC receipts, budgets, storage, independent Reviews, reconciliation, Acceptance CAS and a legal Permit consume;the graph cannot express that join.
- impact=Fail-closed components may be mutually unsatisfiable, and local positive tests cannot demonstrate that any authorized safe operation can ever succeed.
- remediation=Materialize a disclosure-safe deterministic positive model spanning every required planning/authority/evidence/review/Acceptance/Permit boundary, with typed external inputs remaining separate and non-invented.
- closureTest=one complete positive model reaches exactly one legal effect while PUBLIC remains invariant;single-fault mutation of every boundary blocks;the current missing-input state remains blocked and receives zero credit.
- noMergeKey=PRCV5-SEMANTIC-END-TO-END-POSITIVE-SATISFIABILITY-PATH-ABSENT

# 3. Exact counters and disposition

## 3.1 Counters

3.1.1 unique Finding IDs=`18`.

3.1.2 unique noMergeKeys=`18`.

3.1.3 severity counts=`P0 17;P1 1;P2 0;P3 0`.

3.1.4 state counts=`OPEN 18;CLOSED 0;ACCEPTED 0;MERGED 0;SUPPRESSED 0`.

3.1.5 closureCredit sum=`0`;Acceptance credit sum=`0`.

## 3.2 Frozen safe state

3.2.1 v5 predecessor Findings remain distinct and OPEN=`116`;independent v5 closure=`0/116`.

3.2.2 v4-review remediation controls independently closed=`0/23`.

3.2.3 `GitHubControlPlanePermit=ABSENT`;`PublicPushPermit=ABSENT`;`DeploymentPermit=ABSENT`;`ReleasePermit=ABSENT`.

3.2.4 repository=`PUBLIC`;`Gate29=BLOCKED`;development freeze=`ACTIVE`;Review Acceptance=`0`.

3.2.5 `verdict=REJECT-V5-AS-A-SEMANTICALLY-EXECUTABLE-SUCCESSOR;REQUIRE-IMMUTABLE-V6`.
