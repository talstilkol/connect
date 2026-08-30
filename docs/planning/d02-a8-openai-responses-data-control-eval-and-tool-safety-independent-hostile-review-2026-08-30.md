# 1. Connect — ביקורת עוינת עצמאית על D02-A8

## 1.1 זהות, קלט קפוא וגבול סמכות

1.1.1 `reviewId=CONNECT-D02-A8-INDEPENDENT-HOSTILE-REVIEW-2026-08-30-R1`.

1.1.2 Subject=`docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-immutable-successor-2026-08-30.md`; SHA-256=`61774fd3f54bf39d727ff7cdc09ef475fff9bd2b2561e5639e1b947dbbcaec0b`; physical identity=`174 lines/1675 words/17302 bytes`.

1.1.3 Closure crosswalk=`docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md`; SHA-256=`859f721f09b7af35bf0810cdae0dd9beebe84f126d6d05ba6b605a23633a06ad`; physical identity=`37 lines/557 words/6223 bytes`.

1.1.4 Producer QA=`docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md`; SHA-256=`d648af6042f8cd8a5a98cf504c567d2a6806cf25f693a2812578897b38978476`; physical identity=`87 lines/773 words/8633 bytes`.

1.1.5 Package manifest=`docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/package-manifest.json`; SHA-256=`d5e60ec07595a5a55db40e029b815805c28a19ecbba9b0d6e1136af762461de6`; physical identity=`141 lines/247 words/5239 bytes`; declared payloadRoot=`0027d09a844eaa79ac8d779e2691e5af77c8c3ffd1321c0b65b48f7fb085b636`; declared packageCoreRoot=`a1ce88c079503cade993bc11cf8f6f3be7ea13f5db990780030355d4fab8ef53`.

1.1.6 Frozen hashes were recomputed before review and match clauses 1.1.2–1.1.5. This review changes none of those bytes.

1.1.7 Reviewer did not author A8. Review authority is planning-only and cannot close its own Findings, accept D02, select a model, admit AI, issue a RuntimePermit, lift Gate29/freeze, mutate Git/GitHub/provider state or deploy.

1.1.8 Repository invariant=`PUBLIC`. Public visibility is not permission to Push, publish Secrets, release, deploy or claim readiness.

1.1.9 Product code, Build, runtime tests, Git/GitHub/provider/account/deployment mutations performed by this review=`0`.

## 1.2 Method and severity

1.2.1 Method=`exact-root verification + full Subject/crosswalk/QA/package reading + independent Reader rerun + JSON-Schema validation cross-check + mutation-boundary inspection + DAG/producer/transition analysis + predecessor semantic-universe audit + official OpenAI source refresh + safe-state audit`.

1.2.2 `P0` means a currently reachable authority or runtime bypass. `P1` means a material deterministic-contract gap that can admit contradictory future evidence, hide an invalid state, or prevent independent closure. `P2` means a non-authorizing but material reproducibility/evidence defect. `P3` is editorial only.

1.2.3 No P0 is recorded because A8 keeps PlanningAcceptance, AiAdmission and RuntimePermit missing, AI OFF, Gate29 blocked and the development freeze active. The safe current state does not close any P1/P2.

1.2.4 Exact Finding universe=`D02-A8-IHR-F001`–`D02-A8-IHR-F007`; count=`7=0 P0+6 P1+1 P2+0 P3`; state=`OPEN` for all; accepted/closed/waived/merged=`0/7`.

# 2. Verdict

## 2.1 Overall result

2.1.1 `verdict=REJECT-D02-A8-EXECUTABLE-AND-SEMANTIC-SUCCESSOR-REQUIRED`.

2.1.2 A8 materially improves A7: it freezes a machine package, separates three authority layers, splits provider limits from Finance budget, preserves PUBLIC, keeps reusable provider prompts OFF and supplies two mechanically agreeing readers.

2.1.3 Those improvements are candidate evidence only. The readers do not execute the declared schema, do not validate one atomic package, do not prove the positive acceptance transition, do not enforce the exact dependency graph or producer appointments, and cannot reproduce the source observation cut.

2.1.4 A8 candidate remediation of A7 Findings remains proposed=`7/7`; independently accepted closure remains=`0/7`. A8 acceptance=`0/1`.

2.1.5 Current state remains `AI runtime=OFF; PlanningAcceptance=0; AiAdmission=0; RuntimePermit=0; Gate29=BLOCKED; developmentFreeze=ACTIVE; repository=PUBLIC`.

2.1.6 Every P1 requires a new immutable D02-A9 successor. Editing A8 or this review in place cannot close a Finding.

# 3. Mechanical reproduction and source refresh

## 3.1 Reader rerun

3.1.1 Reader A and Reader B were run from the frozen repository. Both exited successfully, reported `PASS`, derived the same packageCoreRoot, fifteen selected projection roots and `179/179` killed producer mutations.

3.1.2 A separate Draft 2020-12 JSON-Schema validator found the frozen baseline registry valid against the frozen schema. That external result proves only the current snapshot; neither packaged reader performs that validation itself.

3.1.3 Reader agreement is real but limited: both readers implement the same selected predicates and omit the same normative and transition checks. Agreement between two incomplete evaluators is not semantic closure.

## 3.2 Official OpenAI observations refreshed on 2026-08-30

3.2.1 [OpenAI Data controls](https://developers.openai.com/api/docs/guides/your-data) still distinguishes default abuse-monitoring retention, application state, ZDR/MAM approval, background storage, prompt-cache state, third-party retention and residency. Responses application state is generally retained for at least 30 days when stored/default; background polling and cache behavior have separate lifecycles.

3.2.2 [Responses create](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) still exposes request dimensions for prompt objects and prompt caching. Current documentation distinguishes the minimum cache TTL setting from maximum retention behavior.

3.2.3 [OpenAI Deprecations](https://developers.openai.com/api/docs/deprecations) still schedules reusable prompts and `/v1/prompts` for shutdown on `2026-11-30`; it also schedules the Evals dashboard/API shutdown on that date after a read-only transition on `2026-10-31`.

3.2.4 These observations support A8's conservative OFF policies. They do not validate A8 receipt construction, select a model, prove account capability, or grant source acceptance.

# 4. Atomic Findings

## 4.1 D02-A8-IHR-F001 — normative JSON Schema is not executed

4.1.1 Severity=`P1`; state=`OPEN`; noMergeKey=`D02-A8-IHR-F001`.

4.1.2 `schema.json` declares closed nested objects, required fields, types, enums and constants. Reader A lines 430–433 and Reader B's matching block check only the schema ID, top-level registry keys, schemaVersion and canonicalization label; neither invokes a JSON-Schema evaluator.

4.1.3 `firstStructuralTerminal` inspects only selected fields. For example, root-state handling checks `rootClass` but not `root`, `state` or `acceptanceCredit`; report counters for the three roots are then hardcoded to zero.

4.1.4 Failure path: a nested unknown field, invalid type, invalid enum or inconsistent accepted-looking root state outside the hand-written predicates can coexist with Reader PASS. The frozen baseline happens to validate only because an external validator was run during this review.

4.1.5 Required remediation: both readers must independently execute the exact declared schema or independent equivalent validators with full reference resolution, closed-world unknown-field handling and mutation coverage for every schema keyword/branch used.

4.1.6 Closure predicate: delete/change/add every required, typed, enum, const, pattern, bound, reference and unknown field one at a time; both readers must return a typed schema terminal, schema/reference/error counts must agree at zero on a valid instance, and no hardcoded counter may override parsed root state.

## 4.2 D02-A8-IHR-F002 — the schema permits only the blocked snapshot, not a valid future transition

4.2.1 Severity=`P1`; state=`OPEN`; noMergeKey=`D02-A8-IHR-F002`.

4.2.2 `ModelSelectionAuthority` permits only `acceptedSelection=null`, null timestamps/revocation, `state=MISSING`; profile/account/approval/legal/source members similarly permit only `MISSING`, `ABSENT` or unaccepted states; `RootState` permits only `root=null`, `state=MISSING`, `acceptanceCredit=0`.

4.2.3 All 179 mutation vectors are negative mutations around that one blocked baseline. There is no valid populated authority/evidence instance, transition table, positive control, expiry/revocation/replay scenario or evaluator that can reach PlanningAcceptance, AiAdmission or RuntimePermit.

4.2.4 Failure path: the package proves that its current snapshot is blocked but cannot determine which future populated record is valid. A later implementation must invent acceptance semantics outside the frozen contract, allowing incompatible builders to claim conformance.

4.2.5 Required remediation: separate immutable snapshot schema from versioned evidence/transition schemas; materialize allowed states, required fields per state, trusted-time rules, scope/subject binding, expiry, revocation, replay/CAS/single-use consumption, recovery and terminal precedence.

4.2.6 Closure predicate: two independently implemented readers accept the same fully populated planning-only positive fixture, reject every single-field negative mutation, prove AiAdmission and RuntimePermit remain unreachable without their extra conjuncts, and return to a safe blocked state on expiry/revocation/replay.

## 4.3 D02-A8-IHR-F003 — the declared immutable payload is not one reader-verified package

4.3.1 Severity=`P1`; state=`OPEN`; noMergeKey=`D02-A8-IHR-F003`.

4.3.2 The manifest declares ten payload members and a payloadRoot, but both readers admit only four inputs: schema, registry, DAG and mutation corpus. They expressly deny the manifest, root instances, oracle and reports, and do not hash their own executable bytes.

4.3.3 Each reader derives a new four-file packageCoreRoot but does not compare it with an independently admitted expected root. The claimed root-instance parity is performed outside reader execution; `root-instances.json` says `readByReaders=false`.

4.3.4 Failure path: reader code, detached root instances, oracle, reports or manifest can drift while the four-file evaluator still reports PASS; a stale report is not causally bound to an exact executable, runtime, input set and exit receipt.

4.3.5 Required remediation: define one non-self-referential signed/hash-rooted package envelope, bind Subject/crosswalk/QA/manifest, normative inputs, readers, toolchain identity and detached outputs through an explicit execution receipt, and let an outer verifier recompute the complete payload before consuming inner reader results.

4.3.6 Closure predicate: changing/removing/adding any package member, reader byte, declared toolchain, report or top-level planning artifact blocks both independent outer verifiers; complete package root and every inner root match one admitted manifest with no circular self-membership.

## 4.4 D02-A8-IHR-F004 — predecessor semantic coverage omits normative table rows and clause bytes

4.4.1 Severity=`P1`; state=`OPEN`; noMergeKey=`D02-A8-IHR-F004`.

4.4.2 A4–A7 clause universes are derived by the regex `^[0-9]+(?:\.[0-9]+)+ `. The A7 predecessor has 114 such numbered lines but also 92 table-form lines, including approval rows, seventeen AiProfile rows, nine account rows, seven Legal/Privacy rows, invalidation rows and Finding dispositions.

4.4.3 A8 stores only locator/count/default-disposition metadata for predecessor clauses; it does not store exact clause bytes or per-member content digests. The 92 table lines receive no member identity or disposition in `D02A8-PCU-006`.

4.4.4 Failure path: the source file hash proves that A7 bytes exist, but the succession proof cannot show which table semantics were preserved, superseded or rejected. A generated successor registry can silently reinterpret a table while all 114 numbered locators remain unchanged.

4.4.5 Required remediation: construct a total semantic member universe over headings, numbered clauses, table headers/data rows and other normative blocks; bind exact normalized bytes/digests, source locator, disposition and successor target for every member.

4.4.6 Closure predicate: two independent extractors derive identical member count/order/content roots; every normative source byte belongs to exactly one classified member; deleting, reordering, changing or leaving any table row undispositioned blocks.

## 4.5 D02-A8-IHR-F005 — source receipts commit producer labels, not reproducible source observations

4.5.1 Severity=`P2`; state=`OPEN`; noMergeKey=`D02-A8-IHR-F005`.

4.5.2 Each observation commitment hashes only `sourceId`, URL, publisher label, `retrievedAt` and producer-authored `claimCodes`; `pageBytesPublished=false`. It contains no captured response/content digest, HTTP status, resolved URL, content type, relevant claim locator, extractor/version or permitted archived representation.

4.5.3 The reader's `SOURCE-CHANGED` test compares claim-code arrays with the same baseline and recomputes the same self-described object. It does not retrieve or compare source content, so an actual page change with unchanged labels is invisible.

4.5.4 Failure path: a future reviewer cannot distinguish the historical 2026-08-30 observation from a later page or verify that the labels were supported at the claimed cut.

4.5.5 Required remediation: create disclosure-safe retrieval receipts that bind request/response metadata, resolved authority, capture time, permitted content or normalized relevant-section digest, exact claim locators, extractor/version, freshness and conflict rules. When source bytes cannot be retained, bind a legally permitted evidence surrogate plus independent corroboration and state the residual limitation.

4.5.6 Closure predicate: two readers reproduce the historical observation root without network access; a fresh retriever detects changed/unavailable/conflicting content; observation remains distinct from external source acceptance.

## 4.6 D02-A8-IHR-F006 — DAG completeness and producer authority are not enforced

4.6.1 Severity=`P1`; state=`OPEN`; noMergeKey=`D02-A8-IHR-F006`.

4.6.2 Readers require 22 node IDs, no dangling references, no cycle and unchanged node classes. They do not require the exact 23 edge IDs, edge endpoints, edge types, sole producers or an admitted producer registry. Removing a required acyclic edge or changing a producer label is outside the mutation corpus and does not violate the implemented predicates.

4.6.3 The DAG names producers `D02A8-PRODUCER-001..022`, while `rootDefinitions` uses unrelated labels such as `EXTERNAL-D02-PROGRAM-ACCEPTOR`, `AI-ADMISSION-AUTHORITY` and `RUNTIME-PERMIT-AUTHORITY`; no mapping or appointment authority joins the two namespaces.

4.6.4 Failure path: a required dependency can disappear without creating a cycle/dangling reference, or an unappointed producer can claim a root. Both can preserve a mechanically acyclic graph while changing authority semantics.

4.6.5 Required remediation: materialize an exact edge registry and producer-appointment registry with one canonical identity per producer, authority source, scope, subject, issuance, expiry, revocation, independence/conflict rules and allowed outputs; validate graph completeness, not only acyclicity.

4.6.6 Closure predicate: deletion/addition/reorder/type/endpoint mutation of any edge and mutation/substitution of any producer or appointment blocks; two graph builders derive the same exact nodes, edges, producers, topological order and authority closure.

## 4.7 D02-A8-IHR-F007 — the thirteen frozen inputs are self-described rather than independently admitted

4.7.1 Severity=`P1`; state=`OPEN`; noMergeKey=`D02-A8-IHR-F007`.

4.7.2 Readers require only `frozenInputs.length===13` and verify each listed path against the hash/line/byte values stored in the same registry. They do not require the exact ordered input IDs/paths/roles or compare `frozenInputManifestRoot` with the detached frozen root because `root-instances.json` is not read.

4.7.3 Only the first six inputs and the PUBLIC input receive strong semantic references. Inputs 7–12 contain the A6/A7 reviews, Findings, crosswalk and QA, but their exact identities are not independently pinned by the reader predicate.

4.7.4 Failure path: an unreferenced review input can be replaced by another self-consistent file while retaining thirteen entries; the reader derives a different root and still reports PASS because no admitted expected root is compared.

4.7.5 Required remediation: define an independently rooted ordered input manifest with exact ID, logical path, role, content hash, extent and required consumer edges; bind it through the outer package verifier and require every input to be consumed or explicitly dispositioned.

4.7.6 Closure predicate: substituting, duplicating, omitting, reordering, path-changing or orphaning any one of the thirteen inputs blocks; both readers reproduce the same admitted input root and report unconsumed input count=`0`.

# 5. Finding accounting and required successor

## 5.1 Exact non-merged denominator

5.1.1 Findings=`7`; severity=`P0 0+P1 6+P2 1+P3 0`; states=`OPEN 7+CLOSED 0`; accepted/waived/merged=`0`.

5.1.2 Exact one-to-one machine-readable handoff is frozen in `docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-findings-manifest-2026-08-30.md`.

5.1.3 `reviewVerdict=REJECT-D02-A8-EXECUTABLE-AND-SEMANTIC-SUCCESSOR-REQUIRED`.

## 5.2 Required D02-A9 shape

5.2.1 Add independently executed closed-world schemas and full schema mutations.

5.2.2 Separate blocked snapshot data from versioned positive evidence and transition schemas; prove both valid and invalid state paths.

5.2.3 Add an outer immutable package verifier that binds every artifact, executable, toolchain and execution receipt without self-reference.

5.2.4 Replace locator counts with a total predecessor semantic-member corpus that includes A7's tables and exact member digests.

5.2.5 Replace claim-label receipts with reproducible disclosure-safe source observations and a real change detector.

5.2.6 Freeze and enforce the exact DAG edge set and one admitted producer/appointment registry.

5.2.7 Independently bind the exact thirteen-input manifest and require every input to have a typed consumer/disposition.

5.2.8 Preserve `AI OFF`, three disjoint root classes, PUBLIC, zero acceptance and no product/Git/GitHub/provider mutations during successor construction.

# 6. Final safe state

## 6.1 Immutable handoff

6.1.1 Exact Findings=`7`; `P0=0`; `P1=6`; `P2=1`; `P3=0`; open=`7`; closed/accepted/waived/merged=`0`.

6.1.2 A8 mechanical rerun=`PASS`; A8 semantic verdict=`REJECT`; A8 Acceptance=`0/1`; accepted A7 Finding closure=`0/7`.

6.1.3 `AI runtime=OFF`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository=`PUBLIC`; PlanningAcceptance/AiAdmission/RuntimePermit=`MISSING/MISSING/MISSING`.

6.1.4 Required next action=`build immutable D02-A9 against all seven Findings, run detached Producer QA, then obtain a new independent hostile review of the exact frozen A9 roots`.
