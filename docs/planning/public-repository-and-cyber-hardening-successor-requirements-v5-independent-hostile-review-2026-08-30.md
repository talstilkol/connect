# 1. Connect — Public Repository and Cyber Hardening v5 independent hostile review

## 1.1 Review identity and authority limit

1.1.1 `artifactId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-V5-INDEPENDENT-HOSTILE-REVIEW-2026-08-30`.

1.1.2 `reviewId=PRCV5-IHR-2026-08-30`.

1.1.3 `artifactClass=DETACHED-INDEPENDENT-HOSTILE-REVIEW;PLANNING-ONLY;NOT-AUTHORITY;NOT-IMPLEMENTATION;NOT-OPERATIONAL-EVIDENCE;NOT-ACCEPTANCE;NOT-A-PERMIT`.

1.1.4 Frozen Subject=`docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-2026-08-30.md`; expected and independently observed SHA-256=`2ac2fb4f46d4277081f6cf763c8b24bba4a2610e8fd1679dd43c0990a82ae140`.

1.1.5 Frozen external manifest=`docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-atomic-package-manifest-2026-08-30.json`; expected and independently observed SHA-256=`2478e12103c568b8a68183c4974a0cb0cf47f2d8fb43671732c5a809c00ae949`.

1.1.6 Expected and independently recomputed package content root=`19be4c773af62a79945c01c1d3a71d2c7d650b1cbda0b99ca1ef815e82b8a31b`.

1.1.7 Companion non-merged Findings Manifest=`docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-independent-hostile-review-findings-manifest-2026-08-30.md`.

1.1.8 Producer QA and stored Reader reports were not treated as authority. Fresh Reader executions and source inspection were used only as review evidence.

1.1.9 No frozen v5 byte, predecessor, Product code, Git state, GitHub state, provider state, deployment or release was changed. The only new bytes are this Review and its Findings Manifest.

## 1.2 Exact verdict

1.2.1 `frozenByteIdentity=PASS`.

1.2.2 `declaredPackageRootAndElevenSemanticRoots=PASS` after independent recomputation from physical bytes and canonical objects.

1.2.3 `finiteDenominators=PASS`: Findings=`116`;new remediation controls=`23`;Requirement edges=`227`;output families=`42`;nested types=`70`;admitted instances=`112`;vectors=`3152`;graph=`6969 nodes/7417 edges`;Permit matrix=`4 types/16 cells/12 cross-class denials`;sources=`14`;physical source/member duplicate intersections=`0`.

1.2.4 `graphStructuralCoherence=PASS`: unique nodes=`6969`;unique relation triples=`7417`;self edges=`0`;dangling edges=`0`;independent Kahn traversal consumed all `6969` nodes.

1.2.5 `freshReaderExecutionFromDeclaredWorkingDirectory=PASS/PASS`: Reader A and Reader B each returned PASS with `58` checks and `0` errors when the current directory was the physical `web/` directory.

1.2.6 `freshReaderExecutionFromActualGitTopLevel=FAIL/FAIL`: both Readers and the Generator terminate `ENOENT` because every locator is resolved relative to the caller's current directory and the actual Git-root paths begin with `web/docs/...`.

1.2.7 `semanticClosure=FAIL`; accepted closures=`0/116`;independently closed v4-review remediation controls=`0/23`.

1.2.8 `semanticEndToEndPositivePath=FAIL`: the detached Acceptance node has only four ancestors—manifest, two Reader reports and fresh Review—and has zero Finding, Requirement, output, Producer or Permit ancestors.

1.2.9 `hostileReviewVerdict=REJECT-V5-AS-A-SEMANTICALLY-EXECUTABLE-SUCCESSOR;REQUIRE-IMMUTABLE-V6`.

1.2.10 New detached Findings=`18`;severity totals=`P0 17;P1 1;P2 0;P3 0`;OPEN=`18`;CLOSED=`0`;ACCEPTED=`0`;MERGED=`0`;SUPPRESSED=`0`.

1.2.11 Review Acceptance=`0`;all four operational Permits=`ABSENT`;`Gate29=BLOCKED`;development freeze=`ACTIVE`;repository=`PUBLIC`.

# 2. Independent method

## 2.1 Physical bytes, roots and paths

2.1.1 The actual Git top-level was independently resolved as the directory containing `web/`. Every frozen physical v5 member is below `web/docs/planning/...`;the manifest instead records `docs/planning/...` and expressly rejects a `web/` prefix.

2.1.2 Subject and manifest SHA-256 values were recomputed from exact raw bytes. All `28` package-member raw hashes and byte counts were rechecked before recomputing the domain-separated package projection.

2.1.3 Each of the eleven structured registry roots was recomputed by removing only its declared root field and hashing `DOMAIN + LF + canonical object`. No embedded root string was accepted as evidence of itself.

2.1.4 All `14` source references were opened from physical bytes, rehashed and compared with their recorded content IDs and byte counts. Hash-set intersection proved zero identical source/member byte objects and zero duplicate hashes within either set.

2.1.5 The path/open order in Generator and both Readers was inspected. Payload reads occur before final-file type, symlink and size checks;source reads omit those checks entirely;parent-directory identity is never held or revalidated.

## 2.2 Finite universes and causal checks

2.2.1 All `116` closure rows were compared by ordinal, exact Finding ID, unique noMergeKey, Requirement set, output set, atomic-predicate set, vector set, source-root projection, residual state and zero credit.

2.2.2 Each of the `23` new remediation controls was inspected separately against its exact v4 Finding. No range, Alias, merged or shared closure credit was assigned.

2.2.3 The `42` output schemas, `70` nested schemas and `112` admitted planning instances were parsed. The actual Reader validator implementations were compared with the schema metadata and canonical profile.

2.2.4 All `3152` vectors from all `13` shards were reconstructed in vectorId order. Evaluator-kind, operation, expected terminal, actual terminal, comparison terminal, root uniqueness and shard membership were counted independently.

2.2.5 The graph was rebuilt as a set of node IDs and relation triples. A separate acyclicity traversal, class counters, endpoint check and reverse reachability search to detached Acceptance were performed.

## 2.3 Hostile mutations

2.3.1 Vector mutations were applied only in memory. Frozen files were not edited.

2.3.2 Fourteen declared binding fields were mutated independently while holding the executable causal input fixed. Reader A's actual terminal remained byte-for-byte unchanged in every case: AST `languageRoot`, `predicateId`, `preStateRoot`, `targetPredicateIds`;SCHEMA `schemaRoot`, `preStateRoot`, `targetSchemaId`;PERMIT-NAMEDUSE `namedUse`, `targetPermitCellId`, pre-state named use;PERMIT-SCHEMA `preStateRoot`;LIFECYCLE `reducerId`, `preStateRef`;DIGEST `preStateRoot`.

2.3.3 For every evaluator kind, mutation of `effectSet`, `vectorClass` and a synthetic target label also left the actual terminal unchanged. These mutations demonstrate evaluator erasure, not package-byte tamper resistance.

2.3.4 Canonical-parser adversarial cases were inspected independently: both JSON loaders accept duplicate keys;neither rejects non-NFC strings or negative zero;Reader A orders object keys by UTF-16 code units rather than the declared Unicode code-point order. For keys U+E000 and U+10000, Reader A orders `10000,e000`, while code-point order is `e000,10000`.

## 2.4 Remote PUBLIC and disclosure checks

2.4.1 A read-only authenticated GitHub API request independently observed `talstilkol/connect` as `visibility=public`, `private=false`, `archived=false`, `disabled=false`, `default_branch=main`.

2.4.2 That observation is a bounded Review observation, not trusted-time Evidence, not a continuous visibility receipt and not Acceptance.

2.4.3 All `28` package members were scanned without printing candidate values for common private-key, GitHub-token, AWS-key, JWT, email, absolute `/Users/` and Windows-drive patterns. Matching member counts were zero for every pattern. This bounded scan is not operational Secret/PII clearance.

# 3. Independent results

## 3.1 Frozen identity and root recomputation

3.1.1 Subject byte count=`4164`;line count=`49`;word count=`487`;SHA-256 matched 1.1.4.

3.1.2 Manifest byte count=`14602`;line count=`331`;word count=`579`;SHA-256 matched 1.1.5.

3.1.3 Package members=`28`;aggregate member bytes=`9229494`;largest member bytes=`2528353`;members at or above `52428800` bytes=`0`.

3.1.4 The exact semantic roots recomputed as follows:

| registry | recomputed root | terminal |
| --- | --- | --- |
| frozen inputs | `b3772017bb3d10f08d591602cf62e5f3b4e19c1edcae50682b40708d5d6a255f` | PASS |
| closure | `2f5da2e293d8e9a2e02b6c81a7e5172ec31b79c1a666216a4deb407bf16ebfb3` | PASS |
| schemas/types | `73b33871f764b6b86aa0ed62cd59a43aec6613989a15f685859a7e2716d17a9a` | PASS |
| digest/serialization | `814dda15046b8bf7ec1e630c981e2ccb5664dc4695137eb890f696d9456b254f` | PASS |
| authority/separation | `18e7ad6a5f18eeb79542b0ea643e4fd3786468642848eff3de9e8bc3fc3e5e34` | PASS |
| lifecycle/CAS | `6d04f7817c547501213668141bf1349d34d436b6350222b91ffb5b1d934c0d87` | PASS |
| four Permits | `3af9fa6086f33bc10fb2dbbf0e19d150f234d11872aa5cdf7280f099531b6abc` | PASS |
| PUBLIC flow/scanners | `d0e65750d9eef8c90d4f1dfdd71c4ab055608c7b50289a680fe40d29c25dcab6` | PASS |
| publication/storage | `aaf0de82300c643add7519b475350511fb1d558bfef11e2dd85010caba34d8f4` | PASS |
| vector index | `32312fdc37a7ec0adc9f5c3413d9b5cc32fbb562eef6dd571195ffe6286baedf` | PASS |
| causal graph | `5197de7303e43f6751719c4f64153f8e07ba2ce273a72d71f960e92ff6debf61` | PASS |

3.1.5 Reconstructed vector corpus root=`b413728a0ca577f11e750b11a3ef8bfaadc455d84b69732fc35e3d854f4e20e6`;source-reference root=`85bba2ddb20912535e1239d2885dbea77aadbb9a04da753762cebf668e062c8e`.

## 3.2 Exact 116-Finding identity preservation

3.2.1 Registry rows=`116`;unique Finding IDs=`116`;unique noMergeKeys=`116`;source generations=`93 inherited + 23 v4-review`;closure-credit sum=`0`;acceptance-credit sum=`0`.

3.2.2 Requirement edges=`227=204 inherited + 23 new`. Every referenced Requirement and output ID exists. Identity preservation therefore passes.

3.2.3 All `93` inherited rows expose exactly one atomic predicate, an `IDENTITY` predicate, and exactly two vectors. None decomposes the inherited source closureTest or operational obligation. Identity preservation is not semantic closure;see `PRCV5-IHR-F005`.

3.2.4 The `23` v4-review rows expose `143` atomic predicates and `189` linked vectors, but every remediation-control vector executes over a vector-owned synthetic mini-state rather than the real registry/output/provider state named by the Finding. See `PRCV5-IHR-F006`.

3.2.5 All `116` rows correctly remain OPEN with zero credit. The exact per-row audit ledger appears in section 7;no row receives range credit.

## 3.3 Schemas, canonical identity and Readers

3.3.1 Physical counts pass: output families=`42`;nested types=`70`;primitive types=`9`;admitted planning instances=`112`;unresolved declared type references=`0`.

3.3.2 The current `112` planning instances satisfy the implemented validators. That result does not prove the declared schema language: Reader validators hard-code array size `1..4096` and uniqueness, ignore field metadata bindings, do not recompute schemaRoot or instanceRoot, and do not validate nested-type references from nested schemas.

3.3.3 The canonical profile declares duplicate-key rejection, NFC and Unicode code-point key order. Both Readers use permissive JSON parsers, neither checks NFC or negative zero, and Reader A uses JavaScript default key sorting. See `PRCV5-IHR-F013`.

3.3.4 Current package JSON members=`24`;independently observed duplicate keys=`0`;independently observed non-NFC strings/keys=`0`. Those current facts do not cure the fail-open parser contract.

3.3.5 The digest boundary corpus has only six records and checks inequality among selected constants. It does not exercise duplicate-key, normalization, negative-zero, astral-key ordering or raw-checksum/typed-root substitution through each consuming schema.

## 3.4 Vector corpus and ignored bindings

3.4.1 Vector evaluator distribution is AST=`432`;SCHEMA=`2450`;PERMIT-SCHEMA=`240`;PERMIT-NAMEDUSE=`16`;LIFECYCLE-SCENARIO=`8`;DIGEST-BOUNDARY=`6`.

3.4.2 Actual terminals are `BLOCK=2873;PASS=279`;expected terminals are `BLOCK=2874;PASS=278`;comparison terminals are `PASS=3151;BLOCK=1`. The one expected-only mutation confirms that expected terminal does not feed the actual evaluator.

3.4.3 Vector IDs and vector roots are each unique across all `3152` records. All `13` shard ordinals, first/last IDs, raw byte hashes, record counts, vector-root content roots and global order reconstruct the declared corpus root.

3.4.4 The evaluator reads only a strict subset of each vector. Mutation of the fourteen binding fields listed in 2.3.2 did not change actual terminals. In particular, a same-class Permit presentation still PASSes after `namedUse` is replaced by `consumeWrongPermit`;a lifecycle scenario still PASSes after `reducerId` and `preStateRef` are replaced;and a schema vector is unchanged after `schemaRoot` or target schema is replaced. See `PRCV5-IHR-F004` and `PRCV5-IHR-F009`.

3.4.5 Shard mutation controls are AST flags such as `ranges=CONTIGUOUS` and `generatorRoot=STABLE`;they do not mutate shard bytes or independently regenerate the corpus. The Generator's `independentRegenerators` array names the two Readers, but neither Reader invokes or reimplements generation. See `PRCV5-IHR-F015`.

## 3.5 Causal graph

3.5.1 Physical node and edge arrays are internally coherent: `6969/7417`;unique=`6969/7417`;self=`0`;dangling=`0`;DAG=`true`.

3.5.2 Graph derivation inputs include only frozen-input, closure, schema, authority, Permit and vector roots. Digest, lifecycle, PUBLIC-flow/scanner and publication/storage roots are omitted.

3.5.3 The graph contains no Genesis, appointment, recovery, CAS state/transition, trusted-time receipt, revocation, visibility receipt, scanner receipt, storage budget, external-store contract or publication-operation node classes.

3.5.4 Graph edge classes contain Finding-to-Requirement, predicate-to-vector, vector-to-result, schema/output/Producer and four Permit-to-consumer labels. They contain no authority appointment, Permit issue/consume/CAS, scanner execution, remote PUBLIC readback, budget admission, operation effect, recovery or revocation edge.

3.5.5 Reverse reachability from `PRCV5-DETACHED-ACCEPTANCE` yields exactly four ancestors: `PRCV5-MANIFEST-ENVELOPE`, `PRCV5-READER-A-REPORT`, `PRCV5-READER-B-REPORT`, and `PRCV5-FRESH-INDEPENDENT-REVIEW`. Finding ancestors=`0`;Requirement ancestors=`0`;output ancestors=`0`;Producer ancestors=`0`;Permit ancestors=`0`.

3.5.6 Both Readers verify counts, endpoint existence, class counters and array roots, but not node/edge uniqueness, DAG traversal, exact relation derivation, reachability or the absent semantic universes. See `PRCV5-IHR-F003`.

## 3.6 Authority, separation and Acceptance cut

3.6.1 Planning producers=`54`;unique Producer IDs=`54`;unique output-object IDs=`54`;appointments=`54`;appointment-head continuity=`54/54`;authority edges=`54`;self edges=`0`;all edges originate at the single external Genesis role.

3.6.2 Actual Genesis=`MISSING-BLOCKING`;all appointments=`MISSING-BLOCKING`;actual Recovery receipt=`MISSING-BLOCKING`;authority credit=`0`;Acceptance credit=`0`. This is a safe current state.

3.6.3 Producer, appointment, group, owner, implementation, work and ledger roots are deterministic planning labels. Neither Reader recomputes the row roots, appointment chain, authority-edge equivalence, authority DAG or appointment ancestry;it checks counts, output uniqueness, literal selfAppointment=false and literal distinctCount values. See `PRCV5-IHR-F010`.

3.6.4 There are two unjoined Acceptance concepts. `PRCV5-OBJECT-040` is a planning output of `PRCV5-PRODUCER-040`, while the graph's detached Acceptance node is the special output of `PRCV5-ACCEPTANCE-PRODUCER`;the latter Producer has no production edge.

3.6.5 The object-040 schema has packageRoot and reviewRoot fields but no manifest SHA, Reader-A report root or Reader-B report root. The graph gives the detached node those inputs but gives it no schema, authority appointment, CAS head or Producer edge. See `PRCV5-IHR-F014`.

## 3.7 Lifecycle, CAS, trusted time and Recovery

3.7.1 The two-actor interleaving model reports complete schedules=`155117520`;reachable states=`279`;one-commit schedules=`155117520`;two-commit schedules=`0`;crash-cut state/actor pairs=`492`.

3.7.2 Each alleged crash cut merely clones a state, marks an actor terminal and checks that this local edit did not mutate the store. The crashed state is never traversed, persisted, restarted or recovered. `crashMutationCount=0` is therefore tautological and is not an exhaustive crash/recovery proof.

3.7.3 Failure-before-write and response-loss are two fixed wrapper branches around one in-memory actor. There is no durable attempt record, operation-key preimage, effect/event/outbox root store, restarted-reader schedule or authoritative provider readback.

3.7.4 Trusted time is three caller-supplied strings compared lexically. Authority and revocation are caller-supplied booleans/hashes. `epoch` is carried but unused. No signed authority, trusted-time, revocation or descendant-closure receipt is parsed or verified. See `PRCV5-IHR-F007` and `PRCV5-IHR-F008`.

## 3.8 Four Permit classes and matrix

3.8.1 Four distinct planning schemas, domains and NamedUse labels exist;all planning instances validate structurally;all current states are `ABSENT`;all operational and Acceptance credits are zero.

3.8.2 The complete matrix has `16` records: four same-class records and twelve cross-class records. Its executable predicate is only `presentedPermitClass === consumerPermitClass`.

3.8.3 The matrix never reads Permit bytes, typeTag, schemaRoot, domain, namedUse, issuer, consumer, independent Reader, target, repository identity, TTL, head, epoch, fence, revocation, one-use ledger or CAS result. All four positive presentations are synthetic class-string equalities, not legal Permit consumes. See `PRCV5-IHR-F009`.

3.8.4 Permit-schema vectors validate deterministic zero-credit fixtures only. They are not connected to the lifecycle reducer, PUBLIC receipts, scanner receipts, provider object/ref state or effects.

## 3.9 PUBLIC invariant, scanners and disclosure

3.9.1 The independent live GitHub observation is PUBLIC. The frozen package's PUBLIC observation is an unauthenticated JSON literal with no response bytes, repository-node binding, issuer/signature, trusted time or freshness terminal.

3.9.2 Pre-operation, post-operation and continuous PUBLIC receipts are all `MISSING-BLOCKING`;Public Permit credit=`0`. The current block is correct, but the package defines no authenticated receipt verifier for a future transition. See `PRCV5-IHR-F011`.

3.9.3 Scanner profiles contain distinct deterministic engine/ruleset/implementation/work/ledger/owner hashes. Actual receipts are null and `MISSING-BLOCKING`.

3.9.4 The two scanner planning receipts and adjudication fixture are deterministic zero-credit records. Their schemas require opaque hashes but no signer, signature, scanner authority appointment, packageContentRoot equality, ruleset execution, finding detail, clean/blocked disposition or freshness verifier. See `PRCV5-IHR-F012`.

3.9.5 Current bounded public-pattern scan found zero matching member files. The private-evidence policy correctly prohibits public low-entropy coordinate digests and leaves the private validation mechanism `MISSING-SECURITY-DECISION-BLOCKING`.

## 3.10 Publication, size, source references and storage

3.10.1 All current `28` members are regular physical files below `50 MiB`;aggregate bytes=`9229494`;largest=`2528353`;all `13` vector shards are below the limit.

3.10.2 Repository-total, per-transaction-growth and clean-clone budgets are three null/MISSING rows. There is no budget schema, measurement acquisition/readback algorithm, freshness rule, selector, operation binding or Public-Push decision evaluator. See `PRCV5-IHR-F017`.

3.10.3 External storage selection remains MISSING and blocking. Its planning schema accepts opaque policy/recovery hashes but has no immutable locator resolver, content readback, expiry/deletion transition, budget join, restore execution or Public-Push binding. This is safely blocked now but is not an executable lifecycle for future admission.

3.10.4 The `14` current source references and declared physical duplication zero were independently confirmed. The Readers, however, trust `sourceBytesPhysicallyDuplicated=0` and each source's duplication boolean, and never recompute sourceReferenceRoot or compare source/member content sets. See `PRCV5-IHR-F016`.

3.10.5 Readers read full shard/member/source bytes before size/type/symlink checks. A FIFO, device, symlink swap, parent-directory replacement or oversized file can be opened before the fail-closed predicate runs. See `PRCV5-IHR-F002`.

## 3.11 Reader and Generator independence

3.11.1 Reader A and Reader B use different languages, but their validation lists, vector evaluators, CAS model and graph blind spots are near-isomorphic.

3.11.2 Both return PASS from `web/` and both fail from the Git top-level. Neither discovers the repository root, resolves against the manifest location or opens relative to a trusted directory handle. See `PRCV5-IHR-F001`.

3.11.3 Neither Reader regenerates any package artifact. The only generator is the package Producer's Node program;its fresh `--verify` run from `web/` reports `26` generated artifacts and PASS. The same Generator fails from Git root.

3.11.4 The two Readers share every demonstrated semantic blind spot: ignored vector bindings, synthetic CAS crash counts, class-string Permit matrix, missing graph universes, opaque scanner/PUBLIC roots, missing acceptance join and permissive canonical parsing. See `PRCV5-IHR-F015`.

## 3.12 Semantic positive satisfiability

3.12.1 Positive component fixtures exist for schemas, closure labels, eight lifecycle scenarios and four same-class Permit labels.

3.12.2 No single positive input cut instantiates actual Genesis and appointments, trusted time, operational scanners, authenticated PUBLIC pre/post receipts, accepted repository budgets, a selected external-store contract, two independent Reviews, reconciliation, Acceptance CAS and one legal Permit consume.

3.12.3 Because the graph omits those joins and Acceptance has only four ancestors, there is no executable end-to-end path whose positive success demonstrates that all fail-closed conditions are satisfiable together. See `PRCV5-IHR-F018`.

# 4. One-to-one disposition of the 23 v4-review remediations

## 4.1 Exact non-merged crosswalk

| v4 Finding | v5 control | independent disposition | exact blocking v5 Finding(s) |
| --- | --- | --- | --- |
| `PRCV4-IHR-F001` | `PRCV5-CTRL-001` | FAIL;physical graph counts are correct, but semantic derivation and Acceptance reachability are incomplete | `PRCV5-IHR-F003` |
| `PRCV4-IHR-F002` | `PRCV5-CTRL-002` | FAIL;two languages retain common root, safety and semantic blind spots | `PRCV5-IHR-F001`,`F002`,`F013`,`F015` |
| `PRCV4-IHR-F003` | `PRCV5-CTRL-003` | FAIL;declared schema language is not what either Reader completely executes | `PRCV5-IHR-F013` |
| `PRCV4-IHR-F004` | `PRCV5-CTRL-004` | FAIL;selected digest constants pass, but canonical ambiguity and consumer substitution coverage remain | `PRCV5-IHR-F013` |
| `PRCV4-IHR-F005` | `PRCV5-CTRL-005` | FAIL;planning chain is structurally acyclic, but actual Genesis/appointments/Recovery and verification are absent | `PRCV5-IHR-F010` |
| `PRCV4-IHR-F006` | `PRCV5-CTRL-006` | FAIL;crash/recovery, time, revocation and durable readback are not executed | `PRCV5-IHR-F007`,`F008` |
| `PRCV4-IHR-F007` | `PRCV5-CTRL-007` | MECHANICAL-PASS;exact current field-root extraction and zero-credit Alias provenance are preserved;closure remains OPEN | none;no closure credit |
| `PRCV4-IHR-F008` | `PRCV5-CTRL-008` | FAIL;actual terminals execute, but evaluator/target/prestate/effect bindings are ignored | `PRCV5-IHR-F004`,`F006` |
| `PRCV4-IHR-F009` | `PRCV5-CTRL-009` | FAIL;inherited semantics collapse to identity and new controls are synthetic | `PRCV5-IHR-F005`,`F006` |
| `PRCV4-IHR-F010` | `PRCV5-CTRL-010` | FAIL;disjoint hashes are planning labels without executed authority ancestry or end-to-end agreement | `PRCV5-IHR-F010`,`F018` |
| `PRCV4-IHR-F011` | `PRCV5-CTRL-011` | FAIL;operational scanners and authenticated receipts are absent and the verifier is incomplete | `PRCV5-IHR-F012` |
| `PRCV4-IHR-F012` | `PRCV5-CTRL-012` | FAIL;Control Permit schema is not joined to authenticated CAS/time/recovery or NamedUse consumption | `PRCV5-IHR-F007`,`F008`,`F009` |
| `PRCV4-IHR-F013` | `PRCV5-CTRL-013` | FAIL;Push Permit lacks authenticated PUBLIC/object/ref readback execution and legal consume | `PRCV5-IHR-F009`,`F011`,`F014` |
| `PRCV4-IHR-F014` | `PRCV5-CTRL-014` | FAIL;Deployment fixture is not an authoritative target readback transaction | `PRCV5-IHR-F007`,`F008`,`F009`,`F018` |
| `PRCV4-IHR-F015` | `PRCV5-CTRL-015` | FAIL;Release fixture is not an authoritative public-identity/recovery transaction | `PRCV5-IHR-F007`,`F008`,`F009`,`F018` |
| `PRCV4-IHR-F016` | `PRCV5-CTRL-016` | FAIL;4x4 execution compares only two caller-controlled class strings | `PRCV5-IHR-F009` |
| `PRCV4-IHR-F017` | `PRCV5-CTRL-017` | FAIL;object-040 and detached Acceptance are fragmented and the required higher cut is not schema/authority bound | `PRCV5-IHR-F003`,`F014` |
| `PRCV4-IHR-F018` | `PRCV5-CTRL-018` | FAIL;current self-acceptance is zero, but future disjoint authority and sole Acceptance production are unproved | `PRCV5-IHR-F010`,`F014` |
| `PRCV4-IHR-F019` | `PRCV5-CTRL-019` | MECHANICAL-PASS;public oracle is prohibited and the missing private decision blocks;closure remains OPEN | none;no closure credit |
| `PRCV4-IHR-F020` | `PRCV5-CTRL-020` | MECHANICAL-PASS;exact late-decision SHA and `48/48` forward/inverse clause rows are present;closure remains OPEN | none;no closure credit |
| `PRCV4-IHR-F021` | `PRCV5-CTRL-021` | FAIL;current member size passes, but repository/growth/clone gates are not executable | `PRCV5-IHR-F002`,`F017` |
| `PRCV4-IHR-F022` | `PRCV5-CTRL-022` | FAIL;current shards reconstruct, but there is one Generator, no independent regeneration and invalid Git-root locators | `PRCV5-IHR-F001`,`F015` |
| `PRCV4-IHR-F023` | `PRCV5-CTRL-023` | FAIL;MISSING state is safe, but future external-store admission is opaque and not lifecycle-executable | `PRCV5-IHR-F017`,`F018` |

4.1.1 Exact outcomes: independent semantic closure=`0/23`;mechanical planning preservation without closure=`3/23`;failed semantic remediation=`20/23`;Acceptance credit=`0`.

# 5. New Finding cross-reference

## 5.1 Path, filesystem and graph

5.1.1 `PRCV5-IHR-F001` — logical locators are relative to the wrong root and every tool is caller-CWD dependent.

5.1.2 `PRCV5-IHR-F002` — Readers and Generator open bytes before fail-closed path/type/symlink/size validation.

5.1.3 `PRCV5-IHR-F003` — the count-correct DAG omits critical semantic universes and has no causal Acceptance closure.

## 5.2 Vectors, closure and lifecycle

5.2.1 `PRCV5-IHR-F004` — vector targets, evaluator identities, pre-state roots and effect bindings are ignored.

5.2.2 `PRCV5-IHR-F005` — all 93 inherited closure semantics are reduced to identity-only predicates.

5.2.3 `PRCV5-IHR-F006` — all 23 remediation controls execute synthetic mini-states rather than real outputs.

5.2.4 `PRCV5-IHR-F007` — the exhaustive CAS claim does not traverse any crash or durable Recovery state.

5.2.5 `PRCV5-IHR-F008` — authority, trusted time, revocation and replay admission are caller-controlled scalars.

## 5.3 Permits, authority, PUBLIC and scanners

5.3.1 `PRCV5-IHR-F009` — the 4x4 Permit matrix is only a class-string equality test.

5.3.2 `PRCV5-IHR-F010` — authority and independence are unverified deterministic planning labels with missing actual Genesis/Recovery.

5.3.3 `PRCV5-IHR-F011` — PUBLIC pre/post invariants have no authenticated, trusted-time remote receipt protocol.

5.3.4 `PRCV5-IHR-F012` — scanner and adjudication receipts have no executed or authenticated scan semantics.

## 5.4 Canonicalization, Acceptance, Readers and storage

5.4.1 `PRCV5-IHR-F013` — canonical JSON and schema semantics are incompletely and divergently implemented.

5.4.2 `PRCV5-IHR-F014` — Acceptance is split across two unjoined objects and omits the exact higher-level binding.

5.4.3 `PRCV5-IHR-F015` — Reader independence and two-generator parity are nominal, not adversarially independent.

5.4.4 `PRCV5-IHR-F016` — source-reference root and zero-duplication claims are not recomputed by either Reader.

5.4.5 `PRCV5-IHR-F017` — repository budgets and external-storage lifecycle have no executable admission gate.

5.4.6 `PRCV5-IHR-F018` — no semantic end-to-end positive path proves joint satisfiability.

# 6. Safe terminal and mandatory successor boundary

## 6.1 Current state

6.1.1 `Acceptance=0`;accepted Findings=`0/116`;new Review Findings accepted=`0/18`.

6.1.2 `GitHubControlPlanePermit=ABSENT`;`PublicPushPermit=ABSENT`;`DeploymentPermit=ABSENT`;`ReleasePermit=ABSENT`.

6.1.3 repository=`PUBLIC`;`Gate29=BLOCKED`;development freeze=`ACTIVE`.

6.1.4 Mechanical Reader PASS and root parity provide zero Review, operational, Permit, closure or Acceptance credit.

## 6.2 Immutable-successor requirement

6.2.1 Do not edit v5. A successor must close each of `PRCV5-IHR-F001..F018` separately, preserve all `116` predecessor identities separately, and add no range/merge/Alias/shared credit.

6.2.2 Missing actual authority, trusted time, scanner receipts, PUBLIC receipts, accepted budgets, store contract, review and Acceptance remain typed blockers. They must not be replaced by invented witnesses.

# 7. Exact 116-row audit ledger

## 7.1 Row-level identity, predicate and vector disposition

| ordinal | Finding ID | generation | Requirement edges | atomic predicates | vectors | credit | residual |
| ---: | --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | `PRCS-HR-F001` | INHERITED-V4-PRESERVED-OPEN | 5 | 1 | 2 | 0 | OPEN |
| 2 | `PRCS-HR-F002` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 3 | `PRCS-HR-F003` | INHERITED-V4-PRESERVED-OPEN | 4 | 1 | 2 | 0 | OPEN |
| 4 | `PRCS-HR-F004` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 5 | `PRCS-HR-F005` | INHERITED-V4-PRESERVED-OPEN | 4 | 1 | 2 | 0 | OPEN |
| 6 | `PRCS-HR-F006` | INHERITED-V4-PRESERVED-OPEN | 7 | 1 | 2 | 0 | OPEN |
| 7 | `PRCS-HR-F007` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 8 | `PRCS-HR-F008` | INHERITED-V4-PRESERVED-OPEN | 6 | 1 | 2 | 0 | OPEN |
| 9 | `PRCS-HR-F009` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 10 | `PRCS-HR-F010` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 11 | `PRCS-HR-F011` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 12 | `PRCS-HR-F012` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 13 | `PRCS-HR-F013` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 14 | `PRCS-HR-F014` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 15 | `PRCS-HR-F015` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 16 | `PRCS-HR-F016` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 17 | `PRCS-HR-F017` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 18 | `PRCS-HR-F018` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 19 | `PRCS-HR-F019` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 20 | `PRCS-HR-F020` | INHERITED-V4-PRESERVED-OPEN | 4 | 1 | 2 | 0 | OPEN |
| 21 | `PRCS-HR-F021` | INHERITED-V4-PRESERVED-OPEN | 4 | 1 | 2 | 0 | OPEN |
| 22 | `PRCS-HR-F022` | INHERITED-V4-PRESERVED-OPEN | 4 | 1 | 2 | 0 | OPEN |
| 23 | `PRCS-HR-F023` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 24 | `PRCS-HR-F024` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 25 | `PRCS-HR-F025` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 26 | `PRCS-HR-F026` | INHERITED-V4-PRESERVED-OPEN | 4 | 1 | 2 | 0 | OPEN |
| 27 | `PRCS-HR-F027` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 28 | `PRCS-HR-F028` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 29 | `PRCS-HR-F029` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 30 | `PRCS-HR-F030` | INHERITED-V4-PRESERVED-OPEN | 5 | 1 | 2 | 0 | OPEN |
| 31 | `PRCS-HR-F031` | INHERITED-V4-PRESERVED-OPEN | 4 | 1 | 2 | 0 | OPEN |
| 32 | `PRCS-HR-F032` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 33 | `PRCH2V2-IHR-F033` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 34 | `PRCH2V2-IHR-F034` | INHERITED-V4-PRESERVED-OPEN | 5 | 1 | 2 | 0 | OPEN |
| 35 | `PRCH2V2-IHR-F035` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 36 | `PRCH2V2-IHR-F036` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 37 | `PRCH2V2-IHR-F037` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 38 | `PRCH2V2-IHR-F038` | INHERITED-V4-PRESERVED-OPEN | 4 | 1 | 2 | 0 | OPEN |
| 39 | `PRCH2V2-IHR-F039` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 40 | `PRCH2V2-IHR-F040` | INHERITED-V4-PRESERVED-OPEN | 4 | 1 | 2 | 0 | OPEN |
| 41 | `PRCH2V2-IHR-F041` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 42 | `PRCH2V2-IHR-F042` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 43 | `PRCH2V2-IHR-F043` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 44 | `PRCH2V2-IHR-F044` | INHERITED-V4-PRESERVED-OPEN | 4 | 1 | 2 | 0 | OPEN |
| 45 | `PRCH2V2-IHR-F045` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 46 | `PRCH2V2-IHR-F046` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 47 | `PRCH2V2-IHR-F047` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 48 | `PRCH2V2-IHR-F048` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 49 | `PRCH2V2-IHR-F049` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 50 | `PRCH2V2-IHR-F050` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 51 | `PRCH2V2-IHR-F051` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 52 | `PRCH2V2-IHR-F052` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 53 | `PRCH2V2-IHR-F053` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 54 | `PRCH2V2-IHR-F054` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 55 | `PRCH2V2-IHR-F055` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 56 | `PRCH2V2-IHR-F056` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 57 | `PRCH2V2-IHR-F057` | INHERITED-V4-PRESERVED-OPEN | 4 | 1 | 2 | 0 | OPEN |
| 58 | `PRCH2V2-IHR-F058` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 59 | `PRCH2V2-IHR-F059` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 60 | `PRCV3-IHR-F001` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 61 | `PRCV3-IHR-F002` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 62 | `PRCV3-IHR-F003` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 63 | `PRCV3-IHR-F004` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 64 | `PRCV3-IHR-F005` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 65 | `PRCV3-IHR-F006` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 66 | `PRCV3-IHR-F007` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 67 | `PRCV3-IHR-F008` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 68 | `PRCV3-IHR-F009` | INHERITED-V4-PRESERVED-OPEN | 3 | 1 | 2 | 0 | OPEN |
| 69 | `PRCV3-IHR-F010` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 70 | `PRCV3-IHR-F011` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 71 | `PRCV3-IHR-F012` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 72 | `PRCV3-IHR-F013` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 73 | `PRCV3-IHR-F014` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 74 | `PRCV3-IHR-F015` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 75 | `PRCV3-IHR-F016` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 76 | `PRCV3-IHR-F017` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 77 | `PRCV3-IHR-F018` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 78 | `PRCV3-IHR-F019` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 79 | `PRCV3-IHR-F020` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 80 | `PRCV3-IHR-F021` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 81 | `PRCV3-IHR-F022` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 82 | `PRCV3-IHR-F023` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 83 | `PRCV3-IHR-F024` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 84 | `PRCV3-IHR-F025` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 85 | `PRCV3-IHR-F026` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 86 | `PRCV3-IHR-F027` | INHERITED-V4-PRESERVED-OPEN | 2 | 1 | 2 | 0 | OPEN |
| 87 | `PRCV3-IHR-F028` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 88 | `PRCV3-IHR-F029` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 89 | `PRCV3-IHR-F030` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 90 | `PRCV3-IHR-F031` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 91 | `PRCV3-IHR-F032` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 92 | `PRCV3-IHR-F033` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 93 | `PRCV3-IHR-F034` | INHERITED-V4-PRESERVED-OPEN | 1 | 1 | 2 | 0 | OPEN |
| 94 | `PRCV4-IHR-F001` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 5 | 7 | 0 | OPEN |
| 95 | `PRCV4-IHR-F002` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 96 | `PRCV4-IHR-F003` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 97 | `PRCV4-IHR-F004` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 5 | 7 | 0 | OPEN |
| 98 | `PRCV4-IHR-F005` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 99 | `PRCV4-IHR-F006` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 100 | `PRCV4-IHR-F007` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 101 | `PRCV4-IHR-F008` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 102 | `PRCV4-IHR-F009` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 103 | `PRCV4-IHR-F010` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 7 | 9 | 0 | OPEN |
| 104 | `PRCV4-IHR-F011` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 7 | 9 | 0 | OPEN |
| 105 | `PRCV4-IHR-F012` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 106 | `PRCV4-IHR-F013` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 7 | 9 | 0 | OPEN |
| 107 | `PRCV4-IHR-F014` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 7 | 9 | 0 | OPEN |
| 108 | `PRCV4-IHR-F015` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 7 | 9 | 0 | OPEN |
| 109 | `PRCV4-IHR-F016` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 110 | `PRCV4-IHR-F017` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 111 | `PRCV4-IHR-F018` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 7 | 9 | 0 | OPEN |
| 112 | `PRCV4-IHR-F019` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 5 | 7 | 0 | OPEN |
| 113 | `PRCV4-IHR-F020` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 114 | `PRCV4-IHR-F021` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 6 | 8 | 0 | OPEN |
| 115 | `PRCV4-IHR-F022` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 7 | 9 | 0 | OPEN |
| 116 | `PRCV4-IHR-F023` | NEW-V4-INDEPENDENT-HOSTILE-REVIEW | 1 | 7 | 9 | 0 | OPEN |

7.1.1 Ledger totals recompute exactly: Requirement-edge sum=`227`;atomic-predicate sum=`236`;vector-reference sum=`375`;credit sum=`0`.
