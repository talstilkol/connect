# 1. Connect — Section 35.6 TRD-2 v6 immutable-successor build charter

## 1.1 Purpose and status

1.1.1 `charterId=CONNECT-SECTION-35-6-TRD-2-V6-IMMUTABLE-SUCCESSOR-BUILD-CHARTER-2026-08-30`.

1.1.2 artifact class=`PLANNING-ONLY; SUCCESSOR-CONSTRUCTION-INSTRUCTION; NOT-THE-V6-SUBJECT; NOT-PRODUCER-QA; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE`.

1.1.3 purpose=`construct one immutable v6 Candidate that closes, without merging, every finding in the exact v5 independent hostile-review denominator`.

1.1.4 repository visibility remains `PUBLIC`; the successor must use repository-relative portable locators and disclosure-safe evidence only.

1.1.5 Gate29 remains `BLOCKED`; development freeze remains `ACTIVE`; product code, builds, runtime tests, Git, GitHub, provider, credential, send, upload, deletion, restore and deployment mutations remain forbidden.

## 1.2 Frozen predecessor identities

1.2.1 v5 Subject raw SHA-256=`933b5d68f765afbe5df792051f8b01441d2e0b6043eb3745aea3f593cadcf2be`.

1.2.2 v5 inherited-manifest root=`85783c16a14b84d66cdf08220ced97d7d8e89602b1fc2ab1fe6f4e92ae9c7bba`.

1.2.3 v5 executable-contract root=`c30727d07c28697899299af552ac3fbf6ce6e16a22de81a4dce31b703d0c1dc4`.

1.2.4 v5 semantic-graph root=`92845a0f60b71491538ae9161da08b32730a3a4cf26edd4c6a477f85ca9abfda`.

1.2.5 v5 detached-packet root=`d9ce7f0785801062c3711503b8a808c9c25fa523e9fe8e1325a553621bcf3f4e`.

1.2.6 v5 Requirement-binding root=`67dd12d206e6c133d9ebdb71f5d2cb0c8a4227e95dd1a27e69f448f421b7d80d`.

1.2.7 v5 independent Review raw SHA-256=`123b3f1a08b9388a0368042ea32a08a3408b813016bc259b4293215dc723547b`.

1.2.8 v5 Findings Manifest raw SHA-256=`05b752be0bbbb5bdb789df31dcf72b69a69e1da9d55f38d1349b94af0a975ce8`.

1.2.9 exact non-merged finding denominator=`TRD2V5-IHR-F001..TRD2V5-IHR-F015`; severity denominator=`P0=12;P1=2;P2=1;P3=0`; accepted/closed=`0/15`.

# 2. Construction invariants

## 2.1 Immutable-successor rule

2.1.1 do not edit, overwrite, rename or reinterpret any v5 Subject, package, QA, Review or Findings byte.

2.1.2 v6 must carry a one-to-one disposition row for all 15 finding IDs. Every row binds predecessor finding digest, v6 remediation Requirement ID, exact changed artifact members, positive vectors, negative vectors, closure predicate and residual claim limit.

2.1.3 one remediation may contribute evidence to several findings, but no finding is merged, suppressed, replaced, implicitly closed or credited through another finding.

2.1.4 every inherited v5 Requirement remains a separately addressable member with exact provenance. If semantics change, v6 records a typed supersession rather than silently rewriting the predecessor claim.

2.1.5 hash/count/schema presence is mechanical evidence only. Semantic closure requires executable fixtures, independently derived expected outcomes and actual detached results from eligible reviewers.

## 2.2 Determinism and identity

2.2.1 `Math.random()` is forbidden.

2.2.2 `crypto.randomUUID()` is forbidden because no exact use-specific approval exists.

2.2.3 every v6 ID is derived deterministically from a canonical type tag, schema version and exact content body that explicitly excludes the ID field itself.

2.2.4 canonical collection order is explicit and stable; duplicate keys, duplicate IDs, unsupported Unicode, unknown fields, non-canonical numbers, alternate escapes and unstable ordering fail closed.

2.2.5 every root states algorithm, input domain, excluded fields, normalization, ordering, byte encoding and separator rules. A prose label such as `hash all fields` is insufficient.

## 2.3 No fabricated authority or business data

2.3.1 fixtures may use only frozen specification bytes, formally constructed machine states and disclosure-safe proof fixtures whose values are derived by the chartered constructors.

2.3.2 no customer, credential, provider, production, personal, billing, WhatsApp, Legal, deletion or restore receipt may be invented.

2.3.3 an absent external value is represented by the typed `MissingValue` machine and yields its safe terminal; it is never replaced with sample, demo, placeholder or synthetic authority.

2.3.4 planning fixtures prove the definition and reducer only. They do not authorize or claim that an external provider action occurred.

## 2.4 Public-safe portability

2.4.1 publishable members may contain only repository-relative logical locators or content-addressed member IDs.

2.4.2 absolute workstation paths, usernames, home directories, credentials, tokens, private Evidence, customer content, exploit details and business-private data are forbidden.

2.4.3 private evidence is represented only by a public-safe receipt containing allowed type, algorithm, exact digest, approved classification, freshness and verifier result; the private bytes remain outside Public Git.

# 3. Required v6 artifact set

## 3.1 Atomic package members

3.1.1 `V6-SUBJECT`: five-field Requirements plus normative registries and explicit supersession records.

3.1.2 `V6-SOURCE-CAPTURE-MANIFEST`: every predecessor source member, exact portable locator, full-member digest, byte span inside a content-addressed capture and capture digest.

3.1.3 `V6-CLOSED-SCHEMA-REGISTRY`: one non-contradictory complete schema per record family.

3.1.4 `V6-PARSER-GRAMMAR-AND-CORPUS`: one byte grammar plus exact positive and negative corpus bytes and typed decoded expectations.

3.1.5 `V6-CLAUSE-AST-REGISTRY`: one typed semantic clause AST per v6 Requirement.

3.1.6 `V6-CAUSAL-GRAPH`: complete node, edge, producer, consumer, invalidation, failure and terminal graph.

3.1.7 `V6-STATE-MACHINE-REGISTRY`: Review, MissingValue, lifecycle, Retention, Backup/Restore, severity and Public-flow machines.

3.1.8 `V6-EXECUTABLE-VECTOR-CORPUS`: exact fixtures, typed operations, derived oracles and mutation expectations.

3.1.9 `V6-RAW-ROOT-OVERLAY-AND-INVALIDATION`: outer freeze binding and non-circular pre-head/successor-head rules.

3.1.10 `V6-DETACHED-ACCEPTANCE-PACKET`: exact immutable inputs only; no future result is embedded as if it already existed.

3.1.11 `V6-FINDING-CLOSURE-CROSSWALK`: 15 non-merged rows.

3.1.12 `V6-ATOMIC-PACKAGE-MANIFEST`: canonical ordered member list and one package root whose derivation excludes the manifest's own self-reference.

## 3.2 Producer-only outputs kept outside the Subject

3.2.1 generator source and generation receipt.

3.2.2 Parser Engine A report and Parser Engine B report.

3.2.3 Canonical/Schema Engine A report and Engine B report.

3.2.4 Graph Engine A report and Engine B report.

3.2.5 Vector Runner A report and Runner B report.

3.2.6 Producer QA report.

3.2.7 none of the outputs in 3.2 is a v6 Subject input, independent-review receipt, generation seal, Reconciliation or Definition Acceptance.

# 4. Finding-by-finding build work

## 4.1 `TRD2V5-IHR-F001` — parser grammar and corpus

4.1.1 freeze one EBNF-equivalent byte grammar with every terminal and lexical category defined.

4.1.2 define UTF-8 validity, normalization policy, line endings, whitespace, quoting, table-cell escaping, control characters and unknown-field behavior.

4.1.3 store exact positive and negative fixture bytes, capture IDs, byte offsets, full digests and expected typed maps.

4.1.4 include mutations for duplicate field, unknown field, missing field, invalid UTF-8, ambiguous quote, truncated record, invalid escape, reordered non-canonical key and trailing bytes.

4.1.5 closure requires two independently implemented parsers to produce byte-equal typed maps and identical rejection terminals for every fixture.

## 4.2 `TRD2V5-IHR-F002` — closed canonical schemas

4.2.1 replace every competing short/long schema with one complete closed schema per family.

4.2.2 explicitly define all fields, types, optionality, nullability, ranges, enum members, unknown-field rule and cross-field invariants.

4.2.3 bind exact canonical encoding and content-ID construction for individual records and ordered collections.

4.2.4 provide real fixture bodies for every schema-oracle case; no label-only mutation counts.

4.2.5 closure requires every positive v6 record to validate, every single-fault mutation to reject at the expected terminal, and two engines to derive identical roots.

## 4.3 `TRD2V5-IHR-F003` — complete causal graph

4.3.1 derive expected node-family and edge-family sets from the schema and Requirement registries rather than copying declared counts.

4.3.2 include every Requirement, clause, fixture, vector, state, event, authority, receipt, result, review generation, reconciliation, Acceptance, head and invalidation family.

4.3.3 include all severity vectors and every result/receipt node family omitted in v5.

4.3.4 typed causal edges distinguish `PRODUCES|CONSUMES|INVALIDATES|FAILS_TO|BLOCKS_AT|SUPERSEDES|BINDS_EXACTLY`; umbrella membership edges cannot satisfy causal reachability.

4.3.5 closure requires every Acceptance input to have a non-umbrella producer path, no unexpected family, no dangling edge, no prohibited cycle and mutation sensitivity for every mandatory family.

## 4.4 `TRD2V5-IHR-F004` — Requirement-specific clause ASTs

4.4.1 parse each exact Requirement statement into a typed, closed clause AST without dropping conjunctions, quantifiers, boundaries, exceptions or fail-closed terminals.

4.4.2 define every operator's input types, output, side effects, error states and deterministic evaluation order.

4.4.3 bind each AST node to its exact source clause span and to at least one positive and one falsifying exact fixture.

4.4.4 forbid a shared generic receipt from closing multiple statements unless each individual clause result is independently present and rooted.

4.4.5 closure requires independent implication review for all v6 statements, zero omitted clauses and zero cross-Requirement receipt substitution.

## 4.5 `TRD2V5-IHR-F005` — executable vectors

4.5.1 replace root-only fixtures with portable exact fixture documents and deterministic lookup rules.

4.5.2 every vector declares exact pre-state, typed operation sequence, trusted-input roots, expected post-state, terminal, side-effect set and recovery state.

4.5.3 concurrency cases require one fenced winner or an explicit zero-winner blocked state; `permittedWinnerCount` cannot substitute for observed committed writers.

4.5.4 crash matrices cover before intent, after intent, before CAS, after CAS before response, after provider prepare, after partial effect, after finalize and during readback/reconciliation where relevant.

4.5.5 closure requires two independent runners, same outcomes/effects, real mutation sensitivity and zero generic label-only vectors.

## 4.6 `TRD2V5-IHR-F006` — root overlays and invalidation

4.6.1 create one outer packet that binds the exact raw roots of all v6 normative members.

4.6.2 every Requirement predicate and receipt consumes one typed overlay containing Subject, schema, graph, vectors, binding and packet roots.

4.6.3 create a complete dependency-to-head map and graph every invalidation edge.

4.6.4 separate immutable pre-review heads from successor commit heads so a valid commit cannot invalidate its own prerequisite evidence.

4.6.5 closure requires stale-root, substituted-root, missing-head, advanced-head and self-invalidation mutations to block identically in two validators.

## 4.7 `TRD2V5-IHR-F007` — review authority, atomicity and custody

4.7.1 define closed schemas for Appointment, review authority, evidence custody, generation receipt, Reconciliation, appeal, revocation, expiry and Definition Acceptance.

4.7.2 define atomic operations for generation seal, reconcile, accept, revoke, expire, appeal, retry and response-loss recovery.

4.7.3 every operation binds actor identity, controller, role, appointment/revocation heads, trusted time, expected pointer, fence, attempt ID, input roots, output roots and one-use state.

4.7.4 require exactly two eligible disjoint review generations, lossless Reconciliation, no self-approval and complete evidence custody.

4.7.5 closure requires executable CAS/crash/replay/expiry/revocation/separation vectors and independently verified committed-envelope readback.

## 4.8 `TRD2V5-IHR-F008` — MissingValue transitions

4.8.1 define one total state/event transition table including conflict ingress, conflict resolution, authority expiry, revocation and appeal.

4.8.2 every transition uses typed actor/controller roots, expected head/fence, trusted time and deterministic successor head.

4.8.3 absence, stale input, conflict, expired authority and revoked authority never infer a value and never reach PASS.

4.8.4 closure requires one disposition for every state/operation pair and byte-equal one-winner/recovery results from two engines.

## 4.9 `TRD2V5-IHR-F009` — lifecycle trigger legality

4.9.1 define closed schemas for lifecycle event, guard AST, authority, data-class identity, record identity, active status, Legal Hold, provider/store, trusted time and expected heads.

4.9.2 split any class that contains records with different lifecycle authority or retention schedules.

4.9.3 explicitly resolve `ACTIVE + EXPIRE`; inactive-only prose cannot coexist with an executable active transition.

4.9.4 execute the accepted reachable tuple denominator, not merely all Cartesian rows; every excluded tuple records why it is unreachable or invalid.

4.9.5 closure requires active/held delete passes=`0`, purged-to-live paths=`0`, all admitted receipts present and two engines with zero disagreement.

## 4.10 `TRD2V5-IHR-F010` — Retention Plan v2 and atomic deletion

4.10.1 unify complete Plan and DeleteReceipt schemas; define deterministic ID/digest constructors and short validity bounds.

4.10.2 Plan binds policy version, cutoff, exact candidate identities, provider-confirmed authorized subset, exclusions, active/Hold proofs, expected heads, fence and expiry.

4.10.3 deletion can target only identities in the exact intersection of fresh Plan authorization and provider confirmation at or before cutoff.

4.10.4 define provider capability classes, prepare/finalize semantics, idempotency, compensation, partial/unknown effect handling and reconciliation.

4.10.5 post-delete readback is audit evidence only and cannot retroactively make an unsafe delete safe.

4.10.6 closure requires all crash/partial/CAS/replay/expiry/provider-disagreement vectors; unauthorized, active or held deletions must remain zero.

## 4.11 `TRD2V5-IHR-F011` — Backup/Restore evidence v2

4.11.1 define one complete closed BackupEvidence and RestoreEvidence schema.

4.11.2 construct `backupId` from an explicitly ID-excluded canonical body; construct restore IDs by the same non-self-referential rule.

4.11.3 bind exact backup source, immutable object-version inventory, digests, provider/Region, R2 consistency proof, start/end trusted time and retention-boundary observations.

4.11.4 Restore binds the exact `backupId`, distinct restore identity, target, restored object inventory, exact digests, prior privacy/Legal Hold obligations and re-delete requirements.

4.11.5 activation occurs only after privacy replay and required re-delete receipts; no PURGED identity silently returns to a live state.

4.11.6 closure requires deterministic ID recomputation, exact inventory equality, boundary-window proof and two-engine recovery fixtures including mismatch, truncation, stale backup and privacy replay failure.

## 4.12 `TRD2V5-IHR-F012` — Public information-flow controls

4.12.1 bind all 52 Public-hardening clauses to explicit source, transform, sink, store, log, artifact, Git-history, runtime, provider, backup and recovery flow nodes.

4.12.2 derive a closed Public surface denominator and execute clause-specific disclosure-safe fixtures; a repeated generic gate shape is not evidence.

4.12.3 include taint propagation through serialization, error handling, telemetry, workflow artifacts, caches, exports, deletion and restore.

4.12.4 preserve only safe evidence roots in Public outputs; Private evidence bytes never enter the package.

4.12.5 closure requires `52/52` controls and the exact successor vector denominator to execute, omitted surfaces=`0`, private/secret/PII/business flows=`0`, and recovery re-emission=`0`.

## 4.13 `TRD2V5-IHR-F013` — severity transitions and SOE-050

4.13.1 publish one valid append-only SeverityEvent schema with prior/current version, authority, trigger evidence, expected head, fence, time and appeal/correction linkage.

4.13.2 define the total legal transition matrix and exact first-only `P2→P0` SOE-050 escalation trigger.

4.13.3 graph every severity history and vector, including current producer and invalidation paths.

4.13.4 execute first, duplicate, stale, revoked, concurrent, crash, appeal and correction cases.

4.13.5 closure requires all histories to validate, exactly one append per accepted transition, SOE-050 escalation exactly once and every invalid authority/conflict path to block.

## 4.14 `TRD2V5-IHR-F014` — Public path disclosure

4.14.1 replace all publishable absolute local paths with repository-relative logical locators while retaining exact content digests.

4.14.2 scan every v6 publishable member and relevant reachable Git history for workstation paths, usernames and private location metadata.

4.14.3 closure requires absolute local path count=`0` and an explicit Protocol-authorized disposition of this P2; silent waiver is forbidden.

## 4.15 `TRD2V5-IHR-F015` — unavailable predecessor ledger root

4.15.1 first attempt read-only content-addressed acquisition of exact predecessor bytes `c0feec2e5c37ca134240c5b164d2014df927dad5abd8df8863e40818fc540755` without substituting same-name changed bytes.

4.15.2 if the exact bytes are unavailable, choose the only safe branch: enumerate every dependent observation, invalidate it and independently recompute it from a newly frozen ledger root.

4.15.3 the choice and every affected member must be recorded in the outer packet and causal graph.

4.15.4 closure requires exact acquisition or complete invalidation/re-derivation; silent substitution count=`0`.

# 5. Required construction order

## 5.1 Pass 1 — custody and grammar

5.1.1 freeze all allowed predecessor roots and portable captures.

5.1.2 resolve the F015 acquisition-versus-re-derivation branch.

5.1.3 build grammar and exact parser corpus.

5.1.4 run two parser implementations and stop on any disagreement.

## 5.2 Pass 2 — schemas and deterministic constructors

5.2.1 build the complete schema registry.

5.2.2 build canonical encoders and ID/root constructors.

5.2.3 validate every positive record and every single-fault mutation in two engines.

5.2.4 freeze schema/corpus roots before graph or vector generation.

## 5.3 Pass 3 — semantics and state machines

5.3.1 compile all Requirement clause ASTs.

5.3.2 construct review, MissingValue, lifecycle, Retention, Backup/Restore, Public-flow and severity machines.

5.3.3 prove total transition and terminal coverage for each admitted state/event denominator.

## 5.4 Pass 4 — causal graph and overlays

5.4.1 derive all expected families from frozen registries.

5.4.2 build causal graph and dependency-to-head invalidation graph.

5.4.3 build non-circular pre-head/successor-head overlay rules.

5.4.4 run two graph implementations and all omission/substitution/cycle mutations.

## 5.5 Pass 5 — vectors and runners

5.5.1 derive the exact target/vector denominator from the frozen semantic registries.

5.5.2 build portable fixtures, operations and independent expected-result oracles.

5.5.3 run two independent runners and compare state, terminal, effect and recovery projections.

5.5.4 any disagreement or non-mutant-sensitive control blocks package freeze.

## 5.6 Pass 6 — outer freeze and Producer QA

5.6.1 bind all normative members into one detached outer packet.

5.6.2 derive the atomic package root with an explicit non-self-referential algorithm.

5.6.3 produce a one-to-one 15-row closure crosswalk.

5.6.4 Producer QA re-derives all counts, roots, coverage and zero-claim constraints from bytes rather than trusting generator declarations.

5.6.5 freeze the exact v6 Subject/package only if Producer QA has zero unresolved mechanical discrepancy.

# 6. Independent acceptance route

## 6.1 Fresh hostile review

6.1.1 a fresh reviewer receives the exact frozen v6 Subject/package roots but not producer conclusions as trusted input.

6.1.2 the reviewer independently parses all members, re-derives denominators/roots and attacks all 15 closure claims plus any newly discovered surface.

6.1.3 every new finding receives its own ID, severity, state, no-merge key, evidence, failure trace, remediation, negative vectors and closure evidence.

6.1.4 a v6 rejection routes to immutable v7; v6 bytes are preserved.

## 6.2 Protocol generations

6.2.1 even a clean first hostile review does not create Definition Acceptance.

6.2.2 the then-accepted review Protocol must produce exactly two eligible disjoint generation receipts against the same exact Subject roots.

6.2.3 Reconciliation must preserve every finding and disagreement losslessly.

6.2.4 Definition Acceptance requires zero open P0/P1 and an explicit allowed disposition for every P2/P3, including F014.

# 7. Zero-credit ledger and completion predicate

7.1 v6 Subject=`ABSENT`.

7.2 v6 Producer QA=`ABSENT`.

7.3 v6 independent review=`ABSENT`.

7.4 v5 Findings independently closed by v6=`0/15`.

7.5 accepted v6 Requirements=`0`.

7.6 executed eligible review generations=`0/2`.

7.7 Reconciliation=`ABSENT`; Definition Acceptance=`ABSENT`.

7.8 successful construction is not completion. Completion occurs only when exact frozen v6 bytes pass fresh hostile review, the accepted Protocol route, Reconciliation and Definition Acceptance without unresolved mandatory findings.

7.9 Gate29 remains `BLOCKED`; development freeze remains `ACTIVE`; repository remains `PUBLIC`.
