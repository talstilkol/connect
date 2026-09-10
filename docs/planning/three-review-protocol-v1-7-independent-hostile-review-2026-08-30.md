# Protocol v1.7 — independent hostile review

## 1. Identity, scope and authority

1.1 ReviewId=`MPRR-V17-IHR-2026-08-30`.

1.2 Subject package=`docs/planning/three-review-protocol-v1-7-package-2026-08-30`.

1.3 Review mode=`INDEPENDENT-HOSTILE;READ-ONLY-SUBJECT;ZERO-IMPLICIT-CREDIT`.

1.4 The Subject, both bundled readers, its manifest, generator, payload and stored Producer QA reports were not changed by this review.

1.5 This review is not Acceptance, HumanApproval, B0 authority, a reconciliation receipt, a semantic-closure receipt, a CommitReceipt, a Permit or a deployment authorization.

1.6 Binding authority state after review:

1.6.1 Acceptance=`0`.

1.6.2 Gate29=`BLOCKED`.

1.6.3 developmentFreeze=`ACTIVE`.

1.6.4 repository=`PUBLIC`.

1.6.5 authorityOutputs=`0`.

1.7 Verdict=`REJECT`.

1.8 Exact denominator=`25` non-merged findings: `P0=16`, `P1=8`, `P2=1`, `P3=0`; closed=`0`; open=`25`.

1.9 The authoritative finding records and closure predicates are in `docs/planning/three-review-protocol-v1-7-independent-hostile-review-findings-manifest-2026-08-30.md`.

## 2. Independent physical verification

2.1 The following values were recomputed from physical bytes, not copied as acceptance credit.

| # | Repository-relative path | SHA-256 | Lines | Bytes |
|---:|---|---|---:|---:|
| 1 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/causal-source-graph.json` | `5ce75bcfc0530fbc768daca720c255faca2aa204998143d1cef076acca4ec387` | 1 | 763235 |
| 2 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/causal-vectors.jsonl` | `6baf55f2f1427469faa01eeba28f7a0b9e9985cde6f2f0df27df5f84e54d9e75` | 574 | 640136 |
| 3 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/closure-crosswalk.jsonl` | `e9dc3f6a2fc93955f4112919700acec31bbf67f23a7ccd3cae53e53563e84f42` | 31 | 368475 |
| 4 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/generate.mjs` | `1b4ac975b8fd11bd19f6b33b4c5a6b9104f00847c8d8dd811a350665203c618f` | 2407 | 149638 |
| 5 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/normative-package-manifest.json` | `94b6b0358a3a1bc80188e004bb9d000e9c18f2673ab70c39bc63c8353ca5e7ee` | 1 | 4065 |
| 6 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/normative-registry.json` | `50c965baae8dfc8a8d48ddc72cd2780cd9f9b4945f9ae2e79a01d5233242606f` | 1 | 2237679 |
| 7 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/predecessor-clause-crosswalk.jsonl` | `6e1520fc83db5d270a0b3c6d7c01e75736d42e369f84f5731996739e27a1e7af` | 323 | 2453866 |
| 8 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/predecessor-closure.jsonl` | `1fe4af3d80593fe3191a2fb284166877d542ae01413044c1bf8a157e873c811b` | 128 | 107854 |
| 9 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/predecessor-semantic-predicates.jsonl` | `f973a00b0c7146c92819e4c5800a1dc3d48c7a9fe98b1a0c4291c9f30d7f3c14` | 4016 | 12155769 |
| 10 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/producer-qa.md` | `6da00715dfedc26263609af989f57ce59cb3678ca1e4770e530e48d2816fb320` | 42 | 2630 |
| 11 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/qa-reader-a-report.json` | `878f3eb0eb4a01d2bbbad15f798da5d5fc35e0a0fea417a49e65d045447e26e2` | 1 | 1772 |
| 12 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/qa-reader-b-report.json` | `4bb2ddc792b499ba14405863514da8f3df5a52e072c9576809c5e5358067b4d8` | 1 | 1772 |
| 13 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/reader-a.mjs` | `50a987ec4f5fc188f3a1910cb6bdc26a83fe2a63ae68e81ca70d0ba7cbe230ed` | 507 | 33056 |
| 14 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/reader-b.rb` | `b9b4bbd1e376354106608ea78bbd83a77f728e38445eeaf0a5febdf708894091` | 560 | 33619 |
| 15 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/requirement-outputs.jsonl` | `1d9e7e277b180693ce8b09a7b08f7ff883b86b60309695fde6883de677c0d8f1` | 112 | 806644 |
| 16 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/semantic-use-index.jsonl` | `51be90827b9d9fc96b1f4764e234656465f28762cdc4344e7526071df529ed2d` | 53450 | 19513155 |
| 17 | `docs/planning/three-review-protocol-v1-7-package-2026-08-30/subject.md` | `240781df75773ab69941677d67ea0e6819a1b279e362d1777535f0ed96a4c50a` | 1964 | 266494 |

2.2 Payload integrity result:

2.2.1 Manifest payload members independently observed=`10`.

2.2.2 Exact byte/root/line matches=`10/10`.

2.2.3 CPB1 package root independently recomputed=`495ba345115f7623802adef7d7268ba7a6fe7049e68f9b04866f77f3602b5d39`.

2.2.4 Manifest-declared package root=`495ba345115f7623802adef7d7268ba7a6fe7049e68f9b04866f77f3602b5d39`.

2.2.5 Physical package-root equality=`PASS`.

2.2.6 Generator and two reader roots independently match all three `producerTools` declarations.

2.3 Frozen predecessor inputs:

2.3.1 v1.6 Subject=`618b18c4ce61f066f7e400fe0ed9d0fec16c08a8a936f7559be1b9f0850b3a34`; 5619 lines; 4465608 bytes.

2.3.2 v1.6 Review=`1d20ee7d8fd3dcfaf4a9d82369c38c658f895835c5a0d1b5422f7d0ef8dc55f3`; 319 lines; 16708 bytes.

2.3.3 v1.6 Findings=`acdc17a0ee6b77a0cfa9dda0c00dbd5999e6518488c35667857f25d21517abbb`; 651 lines; 33366 bytes.

2.4 Repository observation:

2.4.1 Local Git top-level=`/Users/tal/Documents/connect/web`.

2.4.2 Local origin=`https://github.com/talstilkol/connect.git`.

2.4.3 A read-only GitHub query on 2026-08-30 returned `visibility=PUBLIC`, `isPrivate=false`, default branch=`main`.

2.4.4 This point-in-time observation does not prove the package's claimed continuous `PUBLIC-PERMANENT` invariant.

## 3. Independent semantic audit

### 3.1 Manifest and root authority

3.1.1 The current physical CPB1 root is correct.

3.1.2 The bundled readers do not recompute it. Reader A only iterates `manifest.payloadMembers` at lines 95–103, then inserts `manifest.packageRoot` into the result at lines 477–487. Reader B has the same behavior at lines 73–80 and 530–540.

3.1.3 Neither reader hashes its own bytes, the other reader, or the generator against the manifest's tool records. Reader A consumes the manifest-declared generator root at lines 158–165; Reader B does so at lines 138–145.

3.1.4 Neither reader proves an exact closed payload universe, validates `frozenInputs`, or checks the declared root constructor. Therefore physical correctness was established by this hostile review, but is not established by the bundled PASS.

### 3.2 Repository root and source universe

3.2.1 Current carriers=`9`, parser profiles=`4`, namespaces=`14`, source members=`475`.

3.2.2 Current duplicate carrier IDs, namespace IDs and composite member IDs=`0`.

3.2.3 An independent executable rescan found exactly 112 v1.6 requirement headings and 31 v1.6 finding headings; their ordered IDs and byte starts match the registry.

3.2.4 The bundled readers hash the textual selection rules but do not execute them. They validate only the already-emitted members at Reader A lines 123–156 and Reader B lines 102–136. Omissions and duplicate logical identities are not independently rediscovered.

3.2.5 The repository root is derived positionally as `packageDir/../../..`. There is no `realpath`, symlink-escape rejection, Git top-level binding, repository identity, origin, ref, worktree, index or remote-state binding.

### 3.3 Schemas and canonical data

3.3.1 Schema records=`63`.

3.3.2 Schemas with empty `fieldTypes`=`61/63`.

3.3.3 Schema references observed in fields ending with `SchemaId`=`150`; unresolved occurrences=`114`; unique unresolved schema identifiers=`21`.

3.3.4 The 21 unresolved identifiers comprise 15 machine context schemas and 6 external-input schemas. `contextSchemaId` and `expectedSchemaId` are absent from `semanticUseDiscovery.referenceFieldKinds`, so the stored `unresolvedSemanticUses=0` does not detect them.

3.3.5 The readers do not validate `schemaRoot`, required fields, unknown fields or field types. A bundled PASS therefore is not schema conformance.

3.3.6 The canonical serializers do not reject duplicate JSON keys or enforce NFC. JavaScript sorts object keys by UTF-16 code units while Ruby sorts strings differently for non-BMP keys. Only one CPB1 framing vector exists; no cross-language Unicode/duplicate/number conformance suite closes the gap.

### 3.4 Outputs, closures and predecessor preservation

3.4.1 Requirement outputs=`112`; closure rows=`31`; predecessor closure rows=`128`; predecessor clause rows=`323`; semantic predicates=`4016`.

3.4.2 Exact non-merge mechanics are materially improved: 31 distinct current findings, 323 distinct predecessor rows, numeric byte spans, physical source digests, 0 self-owned predecessor locators and 0 symbolic predecessor conjunct locators were independently observed.

3.4.3 Predicate target clauses=`19456`; predicates with multiple targets=`3376`; maximum target clauses per predicate=`28`.

3.4.4 Reader A lines 224–233 and Reader B lines 230–241 establish root linkage only. They do not evaluate whether the source conjunct's meaning is entailed by, equivalent to, or completely preserved by the target field.

3.4.5 All 31 current closure rows, 323 predecessor clause rows, 128 predecessor preservation rows, 4016 semantic predicates and 112 outputs retain zero acceptance credit or an explicit candidate-only state. This is correct fail-closed state, but semantic preservation remains unproven.

3.4.6 Output roots bind constructor inputs and five-field digests, but not the record's `authorityState`, `custodyLocator`, `independentReceiptBlockId` or `title`. These fields can change the semantic/custody envelope without changing `outputRoot`.

### 3.5 Detached evidence and review independence

3.5.1 Review appointments, role instances, review slots and commit bindings use the Subject file root `240781df...50a`; they do not bind the normative package root `495ba345...5d39`, manifest root, registry root or reader roots.

3.5.2 There is no `packageRoot` field in the normative registry's review governance or detached bindings.

3.5.3 The 12 detached-binding vectors compare fixture-supplied left/right literals at Reader A lines 424–425 and Reader B lines 461–462. They do not load and resolve the declared binding paths against a concrete evidence envelope.

3.5.4 No detached-binding positive-control vector proves that a correctly bound independent receipt can advance only the intended package.

3.5.5 Current independent appointments, review envelopes, reconciliation, HumanApproval and independent semantic receipt are missing. Current acceptance credit therefore correctly remains zero.

### 3.6 Causal vectors, graph and state machines

3.6.1 Vectors=`574`; all expected authority outputs=`0`; `TERM-ACCEPTED` vectors=`0`.

3.6.2 Oracle-contaminated vectors=`387`: 354 source-mutation vectors use `expectedPostDigest`, 20 external-input vectors use `expectedState`, 4 replay vectors use `expectedDecision`, and 9 trace vectors use `expectedState` during actual evaluation.

3.6.3 The most direct causal violation is Reader A lines 389–395 and Reader B's equivalent branch: `expectedPostDigest` is tested before the actual terminal is selected. The expected oracle is therefore an evaluator input, not post-execution comparison only.

3.6.4 The graph contains 2832 nodes and 2478 edges, but models only the 354 source-mutation vectors. The remaining 220 vectors have no complete causal path.

3.6.5 The graph reader checks endpoints, cycles and a string test for forbidden precondition relations at Reader A lines 280–303. It does not verify declared node/edge counts, unique node IDs, node roots, required order, exact relation grammar, vector/graph bijection or a graph root.

3.6.6 Machine vectors directly look up transitions at Reader A lines 436–447 and Reader B lines 485–497. They never execute the referenced guard despite the vector program claiming `EXECUTE-DEFINED-GUARD`.

3.6.7 All 93 guard expressions merely compare a `derivedEvent` string to the transition event. The 15 context schemas are undefined, and no executable raw-observation-to-derived-event function exists.

3.6.8 The model checker proves table totality and graph reachability, but does not prove guard evaluation, terminal/lifecycle consistency or authority-effect consistency. Three registered transitions can reach `TERM-ACCEPTED`, yet none is tested by a positive control.

### 3.7 CAS, recovery and fail-closed behavior

3.7.1 `commitContract.admissionExecutable=false`.

3.7.2 CAS comparisons=`65`; unique comparison IDs=`65`; current states: 33 `MISSING-EXTERNAL-INPUT`, 32 `STATIC-HEAD-MATCH;LIVE-REVOCATION-MISSING`.

3.7.3 Current CAS admission is therefore correctly blocked.

3.7.4 The Subject nevertheless labels the CAS and post-readback evaluators as producer-implemented at lines 179 and 189. The registry contains prose atomicity/replay/readback rules, not an executable durable transaction or recovery procedure.

3.7.5 The CAS vectors compare synthetic fixture roots or test whether a listed field is null. They do not perform one atomic compare-and-write over all durable members, persist a receipt, inject crash boundaries, recover response loss from storage, or atomically advance/read a revocation head.

3.7.6 The dependency coverage vector compares only fixture-array cardinalities. It does not prove exact set identity, instrumented consumption or live head freshness.

3.7.7 Both readers hardcode `actualAuthorityOutputs=0` for every vector and hardcode Acceptance, Gate29, freeze and repository fields in their reports at Reader A lines 463 and 478–490 and Reader B lines 516 and 531–544. They do not validate those values against the manifest or registry.

3.7.8 This hardcoding prevents the current Producer QA from issuing authority, which is safe now, but also means an authority-state inconsistency is not detected by the readers.

3.7.9 The external-input gate compares the registry's missing-state literal with fixture literals. It does not parse or validate future external evidence bytes, signatures, appointments, trust, time, finality or revocation.

3.7.10 There is no positive synthetic acceptance/permit control. Therefore the suite proves neither that a valid externally supplied quorum can progress nor that only such a quorum can progress.

### 3.8 Public invariant

3.8.1 The repository is presently PUBLIC by a read-only GitHub observation.

3.8.2 The registry's `PUBLIC-PERMANENT` value is declarative. Public projection vectors consume fixture-supplied `fieldClasses` and compare a literal payload string at Reader A lines 448–450.

3.8.3 The package does not continuously query repository visibility, bind remote identity/ref, execute two independent secret scanners, validate the external dictionary/seal, or prove the exact bytes of a prospective public write.

3.8.4 No repository, Git, GitHub, provider, deployment or product mutation was performed by this review.

## 4. Finding summary

| # | Finding ID | Severity | Short title | State |
|---:|---|---|---|---|
| 1 | `MPRR-V17-IHR-F001` | P0 | Readers trust, but do not recompute, packageRoot | OPEN |
| 2 | `MPRR-V17-IHR-F002` | P0 | Producer-tool roots are not verified | OPEN |
| 3 | `MPRR-V17-IHR-F003` | P0 | Manifest payload/frozen-input universe is not closed | OPEN |
| 4 | `MPRR-V17-IHR-F004` | P1 | Repository root and origin are not identity-bound | OPEN |
| 5 | `MPRR-V17-IHR-F005` | P1 | Parser profiles are not executed by readers | OPEN |
| 6 | `MPRR-V17-IHR-F006` | P0 | Schema conformance is not enforced | OPEN |
| 7 | `MPRR-V17-IHR-F007` | P0 | 114 schema-reference occurrences are unresolved | OPEN |
| 8 | `MPRR-V17-IHR-F008` | P1 | Canonical JSON is ambiguous across readers | OPEN |
| 9 | `MPRR-V17-IHR-F009` | P1 | Output identity omits authority/custody envelope fields | OPEN |
| 10 | `MPRR-V17-IHR-F010` | P0 | Detached evidence binds Subject, not package | OPEN |
| 11 | `MPRR-V17-IHR-F011` | P1 | Detached-binding vectors test literals, not evidence | OPEN |
| 12 | `MPRR-V17-IHR-F012` | P0 | Semantic predecessor preservation is asserted, not evaluated | OPEN |
| 13 | `MPRR-V17-IHR-F013` | P0 | 387 vectors inject expected values into actual evaluation | OPEN |
| 14 | `MPRR-V17-IHR-F014` | P0 | Causal graph is partial and under-validated | OPEN |
| 15 | `MPRR-V17-IHR-F015` | P0 | Machine runner skips guards | OPEN |
| 16 | `MPRR-V17-IHR-F016` | P0 | Guard events have no typed derivation evaluator | OPEN |
| 17 | `MPRR-V17-IHR-F017` | P0 | Model check omits authority and terminal consistency | OPEN |
| 18 | `MPRR-V17-IHR-F018` | P0 | Acceptance and authority output are hardcoded | OPEN |
| 19 | `MPRR-V17-IHR-F019` | P0 | No non-vacuous positive acceptance control exists | OPEN |
| 20 | `MPRR-V17-IHR-F020` | P0 | CAS admission is non-executable | OPEN |
| 21 | `MPRR-V17-IHR-F021` | P1 | Crash recovery and durable replay are prose-only | OPEN |
| 22 | `MPRR-V17-IHR-F022` | P0 | External-input gates do not validate evidence | OPEN |
| 23 | `MPRR-V17-IHR-F023` | P1 | Continuous PUBLIC invariant is not executed | OPEN |
| 24 | `MPRR-V17-IHR-F024` | P1 | Dependency/live-head proof is count-only | OPEN |
| 25 | `MPRR-V17-IHR-F025` | P2 | Readers overwrite reports inside the frozen package | OPEN |

## 5. Positive controls and credit boundary

5.1 Credit granted only for directly observed current facts:

5.1.1 10/10 payload byte/root/line records match.

5.1.2 The independently recomputed CPB1 package root matches.

5.1.3 All three tool files match their declared current hashes.

5.1.4 The present source-carrier bytes and the independently rescanned 112/31 v1.6 heading universes match.

5.1.5 Current crosswalk denominators are exact: 31, 323, 128 and 4016, with acceptance credit zero.

5.1.6 All 20 external blocks are missing; the commit contract is non-executable; no authority output is emitted.

5.1.7 GitHub presently reports the repository PUBLIC.

5.2 No credit granted for:

5.2.1 Bundled reader PASS as semantic acceptance.

5.2.2 Relation labels as proof of semantic entailment.

5.2.3 Fixture expected values as independent causal outcomes.

5.2.4 Textual schemas, guards, atomicity, recovery, trust, time, finality or public-policy statements without executable validators.

5.2.5 Missing external receipts, appointments, reviews or approvals.

5.2.6 A claimed permanent public state based on one point-in-time observation.

## 6. Final verdict

6.1 Physical integrity verdict=`PASS-FOR-CURRENT-BYTES`.

6.2 Mechanical linkage verdict=`PARTIAL-PASS`.

6.3 Semantic predecessor preservation verdict=`UNPROVEN`.

6.4 Causal-vector validity verdict=`FAIL`.

6.5 Schema and detached-evidence readiness verdict=`FAIL`.

6.6 CAS/recovery/admission readiness verdict=`FAIL`.

6.7 Current no-self-acceptance state verdict=`PASS-FOR-CURRENT-STATE-ONLY`.

6.8 Future no-self-acceptance enforcement verdict=`UNPROVEN`.

6.9 Overall verdict=`REJECT` because 16 P0 and 8 P1 findings remain open.

6.10 Required state remains Acceptance=`0`, Gate29=`BLOCKED`, developmentFreeze=`ACTIVE`, repository=`PUBLIC`, authorityOutputs=`0`.

6.11 No finding may close by prose, presence, merged credit, Producer self-attestation or a new bundled PASS. Each finding requires its exact closure predicate plus an independent hostile rerun over immutable bytes.
