# 1. Connect — Source-universe and custody successor requirements v3 independent hostile-review findings manifest

## 1.1 Manifest identity

1.1.1 `artifactId=CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V3-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29`.

1.1.2 `reviewId=SURS3-HR-2026-08-29`.

1.1.3 subject path=`web/docs/planning/source-universe-and-custody-successor-requirements-v3-2026-08-29.md`; exact SHA-256=`6cb64b3877f194302a25fd25f5fa73c76a4d06d208f0e62a124e5591e5247092`.

1.1.4 SourceReferenceIndex path=`web/docs/planning/source-universe-and-custody-successor-requirements-v3-source-reference-index-2026-08-29.md`; exact SHA-256=`a36a71f9ecd30ceaad7a696c91ac144a7dcd527dfbbb0ab9cffff2f871cfcc20`.

1.1.5 conformance/mutation-manifest path=`web/docs/planning/source-universe-and-custody-successor-requirements-v3-conformance-mutation-manifest-2026-08-29.md`; exact SHA-256=`980c27ab127a81ca8dcb0c7ab6b7ad8fdabf857a1d7ba0a9beb09e14ad046e2e`.

1.1.6 review-report path=`web/docs/planning/source-universe-and-custody-successor-requirements-v3-independent-hostile-review-2026-08-29.md`; exact SHA-256=`8c4bce0652c5a126f88449135370f2a4b1ef35dd582f1c518083a0911e08a7c9`.

1.1.7 review boundary=`planning only; no source collection, Product extraction, Product code, Git mutation, Build, runtime test, Push, Deploy, provider, account, credential or external-state mutation`.

1.1.8 independence statement=`Producer QA was excluded and was not read or used; the subject and both support roots were not modified`.

1.1.9 manifest status=`RAW REVIEWER-LOCAL FINDINGS; NOT-RECONCILED; NOT-ACCEPTED`.

## 1.2 Finding schema

1.2.1 every Finding contains exactly one unique `id`, reviewer-local `severity`, `exactLocation`, `defect`, `rootCause`, `consequence`, `requiredFix`, deterministic `acceptancePredicate`, `status` and `noMergeKey`.

1.2.2 `noMergeKey` preserves defect identity; equal remediation components do not authorize merging Findings.

1.2.3 `status=OPEN-REVIEWER-LOCAL` grants no accepted severity, closure, suppression or risk acceptance.

# 2. Findings

## 2.1 `SURS3-HR-F001` — Literal source occurrences are collapsed into consumer pairs

2.1.1 `severity=P0`.

2.1.2 `exactLocation=SourceReferenceIndex 2.2.1 and SRI-OCC-001..080 at lines 113–198; counters 3.1.1–3.1.3 at lines 200–206; subject sourceBasis clauses 2.1.5..2.46.5 and crosswalk Sections 3–5`.

2.1.3 `defect=the subject contains 126 literal upstream-token occurrences, but the index defines occurrence as the deduplicated ordered pair token,consumer and records only 80 pairs; the repeated 26 v2-preservation and 20 new-Finding-closure crosswalk literals have no distinct occurrence identity or locator`.

2.1.4 `rootCause=occurrence identity omits subject root, section or field locator and ordinal, so equal token-consumer pairs in different semantic assertions collapse`.

2.1.5 `consequence=deleting or tampering with a preservation or closure crosswalk literal can leave the same pair present in sourceBasis and falsely satisfy inverse completeness; SURS2-HR-F001 is not losslessly closed`.

2.1.6 `requiredFix=materialize one record for every literal occurrence with exact subject path and root, section or field identity, ordinal or byte span, token, bounded use and consumer; retain a separate derived unique-pair projection if useful`.

2.1.7 `acceptancePredicate=two independent lexers over the exact successor emit byte-identical 126-record occurrence ledgers and 79-target ledgers; every literal has one locator and inverse edge; deleting or changing each occurrence one at a time yields SOURCE-REFERENCE-BLOCKED even when the same token-consumer pair remains elsewhere`.

2.1.8 `status=OPEN-REVIEWER-LOCAL`.

2.1.9 `noMergeKey=SURS3-SOURCE-REFERENCE-LITERAL-OCCURRENCE-IDENTITY-COLLAPSE`.

## 2.2 `SURS3-HR-F002` — Seventy-eight non-D31 target locators are not byte-executable

2.2.1 `severity=P1`.

2.2.2 `exactLocation=SourceReferenceIndex 1.2.1, 1.2.3 and 1.2.4 at lines 19 and 23–25; target rows at lines 33–110`.

2.2.3 `defect=locators such as requirement SURS-NNN and section 2.n do not bind exact start and end bytes, heading inclusion, newline profile, parser version or extracted-span digest`.

2.2.4 `rootCause=the index treats a human-readable Markdown heading convention as an exact media locator without defining a deterministic extraction grammar`.

2.2.5 `consequence=clean-room resolvers can include different title, body or following-boundary bytes while claiming the same target; claim bounds and mutation detection are not exact`.

2.2.6 `requiredFix=bind each of the 78 non-D31 targets to either an exact raw byte span and span SHA-256 or a rooted Markdown syntax profile with unambiguous boundary rules plus expected extracted-span SHA-256 and byte count`.

2.2.7 `acceptancePredicate=two independent clean-room resolvers reconstruct identical bytes and span roots for all 79 targets; moving a section under a declared identity-preserving event remains resolvable, while heading duplication, boundary mutation or one-byte span change yields SOURCE-REFERENCE-BLOCKED`.

2.2.8 `status=OPEN-REVIEWER-LOCAL`.

2.2.9 `noMergeKey=SURS3-SOURCE-REFERENCE-MARKDOWN-LOCATOR-BYTE-AMBIGUITY`.

## 2.3 `SURS3-HR-F003` — SourceReferenceIndex is both external input and sole normative producer output

2.3.1 `severity=P1`.

2.3.2 `exactLocation=subject 2.1.1–2.1.4 at lines 39–45; producer table Section 6.1; semantic rule 6.2.3`.

2.3.3 `defect=SURS3-REQ-001 says it consumes the immutable index as an external input, while the sole-producer table assigns SourceReferenceIndex production to that same requirement`.

2.3.4 `rootCause=index bytes, index validation and index-admission evidence are represented by one object name instead of separate identities`.

2.3.5 `consequence=authority ancestry and dependency extraction can classify the index as self-produced, externally supplied or validated depending on implementation; root substitution and invalidation ownership are ambiguous`.

2.3.6 `requiredFix=classify the frozen index as one exact external Bootstrap input and make SURS3-REQ-001 produce a separately named SourceReferenceValidationReceipt, or introduce an earlier external producer identity and retain a distinct validator`.

2.3.7 `acceptancePredicate=the typed inventory assigns every object exactly one category, external input or normative output, and one sole producer; SourceReferenceIndex and its validation receipt have different IDs and roots; self-production and dual classification counts equal zero`.

2.3.8 `status=OPEN-REVIEWER-LOCAL`.

2.3.9 `noMergeKey=SURS3-SOURCE-REFERENCE-EXTERNAL-INPUT-VERSUS-PRODUCER-CONFLATION`.

## 2.4 `SURS3-HR-F004` — Public policy is produced after Public projections and evidence

2.4.1 `severity=P0`.

2.4.2 `exactLocation=subject SURS3-REQ-014 at lines 193–203; SURS3-REQ-015 at lines 205–215; SURS3-REQ-018 at lines 241–251; SURS3-REQ-023 at lines 301–311`.

2.4.3 `defect=Public projection, DerivedPublicObject, redaction events and disclosure-safe failure evidence are defined and tested before the authoritative classification, minimization, redaction, re-identification and independent-approval policy exists`.

2.4.4 `rootCause=Public-safe policy was placed as a downstream consumer of the artifacts whose safety it must govern`.

2.4.5 `consequence=a scheduler can create or log Public-adjacent bytes under undefined rules, while a semantic scheduler obtains a cycle from the early Public objects to SURS3-REQ-023 and back`.

2.4.6 `requiredFix=split an early rooted PublicHandlingPolicy and classifier contract before any projection, derivative, log or external write; make later PublicEgressGraph and incident controls consume the early policy without producing it`.

2.4.7 `acceptancePredicate=the semantic graph contains policy-to-projection, policy-to-public-derivative and policy-to-disclosure-evidence edges in topological order and no reverse producer cycle; every attempted Public-adjacent write before an accepted policy root yields PUBLIC-EGRESS-BLOCKED with no prohibited payload bytes`.

2.4.8 `status=OPEN-REVIEWER-LOCAL`.

2.4.9 `noMergeKey=SURS3-PUBLIC-SAFETY-POLICY-AFTER-PUBLIC-OBJECT-CYCLE`.

## 2.5 `SURS3-HR-F005` — Admission consumes later family, axis and locator producers

2.5.1 `severity=P0`.

2.5.2 `exactLocation=subject SURS3-REQ-017 at lines 229–239; SURS3-REQ-021 at lines 277–287; SURS3-REQ-022 at lines 289–299; SURS3-REQ-024 at lines 313–323`.

2.5.3 `defect=SURS3-REQ-017 consumes every admitted content family before AdmittedSource exists; SURS3-REQ-021 consumes exact failure-axis behavior before SURS3-REQ-022 produces it and embeds locator fields before SURS3-REQ-024 produces the locator registry`.

2.5.4 `rootCause=pre-admission type and policy producers were ordered after the admission decision and then made dependent on it`.

2.5.5 `consequence=the printed DAG can run admission with undefined schemas and terminals, while the semantic DAG contains cycles SURS3-REQ-017↔021, 021↔022 and 021↔024`.

2.5.6 `requiredFix=produce supported candidate-family, ingestion, total axis-transition and locator-profile contracts before SelectionAssertion and AdmittedSource; derive admitted-family and coverage reports only after admission`.

2.5.7 `acceptancePredicate=two independent producer-consumer extractors return the same acyclic graph; a topological run defines candidate family, custody, recursive safety, axis table and locator schema before selection/admission; deleting any required edge yields DEPENDENCY-CLOSURE-BLOCKED`.

2.5.8 `status=OPEN-REVIEWER-LOCAL`.

2.5.9 `noMergeKey=SURS3-ADMISSION-LATER-FAMILY-AXIS-LOCATOR-PRODUCER-CYCLES`.

## 2.6 `SURS3-HR-F006` — Archive and invalidation consume later review/test types

2.6.1 `severity=P0`.

2.6.2 `exactLocation=subject SURS3-REQ-030 at lines 385–395; SURS3-REQ-041 at lines 517–527; SURS3-REQ-043 at lines 541–551; SURS3-REQ-045 at lines 565–575; SURS3-REQ-046 at lines 577–587`.

2.6.3 `defect=SURS3-REQ-041 consumes review and Acceptance-envelope types produced only by SURS3-REQ-046, which depends back on 041; SURS3-REQ-043 consumes test-oracle and reviewer-eligibility types produced by SURS3-REQ-045, which depends back on 043; generic DecisionEvent locator consumption also lacks the index/locator producer path`.

2.6.4 `rootCause=generic control-envelope and field-registry types were not separated from source-universe-specific instances and late lifecycle consumers`.

2.6.5 `consequence=archive and invalidation schemas cannot be finalized before their future types exist, and a semantically correct executor deadlocks despite a syntactically valid 336-edge DAG`.

2.6.6 `requiredFix=place generic review, Acceptance, test-oracle, reviewer-eligibility and canonical locator type roots in the external Bootstrap or earlier dedicated requirements; make late rows produce only source-specific instances and extensions`.

2.6.7 `acceptancePredicate=the regenerated typed DAG has zero hidden, forward or cyclic edges; every archive DataClass and invalidation trigger references an earlier exact type producer; generic DecisionEvent locators have a complete transitive path to index validation and locator profiles`.

2.6.8 `status=OPEN-REVIEWER-LOCAL`.

2.6.9 `noMergeKey=SURS3-ARCHIVE-INVALIDATION-LATER-REVIEW-TEST-TYPE-CYCLES`.

## 2.7 `SURS3-HR-F007` — Forty-six conformance tests are tautological prose adapters

2.7.1 `severity=P0`.

2.7.2 `exactLocation=conformance/mutation manifest Section 2.1, lines 15–64; binding rule 3.1.3 at line 106`.

2.7.3 `defect=all 46 records say to evaluate the row's proof/predicate and accept when all conjuncts are true; none supplies exact subject-row digest, dependency-output roots, fixture bytes, evaluator profile, canonical result schema or expected output bytes`.

2.7.4 `rootCause=requirement prose was renamed as a deterministic test without compiling it into a finite input-operation-oracle vector`.

2.7.5 `consequence=an implementation can assert that prose conjuncts are true, omit adversarial cases or choose different fixture domains and still report PASS; the 46 IDs do not prove conformance`.

2.7.6 `requiredFix=materialize one canonical test envelope per requirement with exact subject and row roots, all dependency/output roots, input fixture locators and digests, deterministic operation/version, expected output bytes/root and exact terminal bytes`.

2.7.7 `acceptancePredicate=two clean-room runners execute all conformance envelopes with no prose judgment or missing input and emit byte-identical result ledgers; changing any row, root, fixture, operation or expected byte invalidates the test identity and cannot PASS`.

2.7.8 `status=OPEN-REVIEWER-LOCAL`.

2.7.9 `noMergeKey=SURS3-CONFORMANCE-PROSE-PREDICATE-TAUTOLOGY`.

## 2.8 `SURS3-HR-F008` — Mutation identities and 26/32 negative coverage are absent

2.8.1 `severity=P0`.

2.8.2 `exactLocation=conformance/mutation manifest 1.1.4 at line 11 and Section 2.2 at lines 66–89; subject preservation Sections 3 and 5`.

2.8.3 `defect=the 20 mutation rows name mutation classes but contain no canonical operation bytes, target locators, preimages, postimages or expected state/output roots; the 26 v2 requirements and 32 predecessor Findings have no one-to-one dedicated negative-vector denominator`.

2.8.4 `rootCause=presence of one mutation ID per new review Finding was treated as complete preservation and predecessor conformance coverage`.

2.8.5 `consequence=material clauses can be lost while generic conformance text remains true, and different executors can mutate different members and return the same terminal without proving the expected state`.

2.8.6 `requiredFix=publish immutable mutation envelopes for all 26 v2 requirement identities, 20 v2-review Finding identities and 32 predecessor-Finding identities, each with exact target locator, canonical preimage, one exact Delta, postimage digest, expected affected Set and exact terminal/state bytes`.

2.8.7 `acceptancePredicate=the mutation coverage ledger contains 78 separately traceable identities with no range, merge or presence-only credit; two runners reproduce every preimage, postimage, affected Set and terminal byte-identically; removing or weakening one source clause makes its exact vector fail`.

2.8.8 `status=OPEN-REVIEWER-LOCAL`.

2.8.9 `noMergeKey=SURS3-MUTATION-ENVELOPE-AND-26-20-32-COVERAGE-ABSENCE`.

## 2.9 `SURS3-HR-F009` — Controlled generations are unbound placeholders

2.9.1 `severity=P0`.

2.9.2 `exactLocation=conformance/mutation manifest Section 2.3 at lines 91–98; subject 7.1.1–7.1.3 and SURS3-REQ-046 at lines 577–585`.

2.9.3 `defect=Generation A, Generation B, the changed source, Delta operation, expected affected members and expected output roots are not materialized; rootB != rootA and affected set equals exact oracle merely restate desired properties`.

2.9.4 `rootCause=two-generation lifecycle names were frozen without freezing a GenerationPair vector`.

2.9.5 `consequence=stale-receipt rejection, minimal invalidation, unaffected-root equality and B replay cannot be reproduced or compared; any chosen future pair can redefine the oracle`.

2.9.6 `requiredFix=publish a detached immutable GenerationPair manifest binding exact A and B subject/input roots, one exact Delta target and canonical bytes, exact expected affected and unaffected member Sets, expected terminals and output roots, and identify B as the sole acceptance candidate`.

2.9.7 `acceptancePredicate=two independent envelopes reproduce the frozen A preimage and B postimage, exact affected/unaffected Sets and roots; every A receipt submitted to B returns STALE-GENERATION-BLOCKED; changing the Delta or either root invalidates the pair`.

2.9.8 `status=OPEN-REVIEWER-LOCAL`.

2.9.9 `noMergeKey=SURS3-TWO-GENERATION-UNBOUND-A-B-DELTA-ORACLE`.

## 2.10 `SURS3-HR-F010` — Terminal coverage is not finite and D31 oracle is wrong-shaped

2.10.1 `severity=P0`.

2.10.2 `exactLocation=subject SURS3-REQ-003 at lines 61–71; SURS3-REQ-022 at lines 289–299; SURS3-REQ-032 at lines 409–419; conformance records CONF-032 and MUT-020 at lines 50 and 89`.

2.10.3 `defect=no finite TerminalRegistry record root exists in the frozen test inputs; CONF-032 assigns only D31-LOCATOR-BLOCKED although the requirement's valid negative causes require authority, custody, ingestion, amendment-conflict and authority-conflict terminals on different axes`.

2.10.4 `rootCause=the test table assigns one generic fallback terminal per requirement rather than one oracle record per cause and ordered compound transition`.

2.10.5 `consequence=an evaluator can map a correct D31 span with missing authority to the locator terminal and still satisfy the row-level test, breaking capability safety and orthogonal state semantics`.

2.10.6 `requiredFix=materialize a closed TerminalRegistry and cause-to-axis/capability-effect vector root before conformance; split D31 and every compound row into exact positive, single-cause and ordered multi-cause vectors`.

2.10.7 `acceptancePredicate=every negative vector resolves to exactly one registry record or declared ordered compound transition; undefined, unused, ambiguous and free-text terminal counts are zero; each D31 cause emits the exact required axis, capability effect and terminal bytes under two evaluators`.

2.10.8 `status=OPEN-REVIEWER-LOCAL`.

2.10.9 `noMergeKey=SURS3-TERMINAL-REGISTRY-ABSENCE-AND-D31-SINGLE-FALLBACK`.

## 2.11 `SURS3-HR-F011` — The 26/26 preservation counter is not clause-lossless

2.11.1 `severity=P0`.

2.11.2 `exactLocation=subject Section 3, especially 3.1.2 and V2P-004, V2P-008, V2P-010, V2P-020..024 and V2P-026`.

2.11.3 `defect=single dedicated rows receive full preservation credit even when material source clauses are implemented only in other v3 rows or are absent; examples include SURS-004 toolchain binding, SURS-008 independent admission review, SURS-010 egress coverage, SURS-020 failure table, SURS-021 disagreement oracle, SURS-022 equations, SURS-023 relation cardinalities, SURS-024 closed triggers/publication and SURS-026 independence/tests`.

2.11.4 `rootCause=the crosswalk enforces one dedicated destination identity rather than a clause-level one-to-many preservation graph and then equates token presence with semantic preservation`.

2.11.5 `consequence=the subject reports 26/26 while downstream reviewers and implementers can legally inspect only the named destination and miss required behavior`.

2.11.6 `requiredFix=replace dedicated-only preservation with an exact clause-level crosswalk that may name a finite destination Set and explicit supersession rationale; map at minimum SURS-004 to 009+026, SURS-010 to 023+039, SURS-020 to 031+032, SURS-021 to 020+033, SURS-022 to 036+037, SURS-023 to 034+035, SURS-024 to 040+043 and SURS-026 to 045+046`.

2.11.7 `acceptancePredicate=every normative source clause has at least one exact destination clause and every destination inverse points back; semantic comparison marks FULL only when all source effects, failures and predicates remain; missing, weakened, contradicted and unapproved-superseded counts are zero`.

2.11.8 `status=OPEN-REVIEWER-LOCAL`.

2.11.9 `noMergeKey=SURS3-V2-PRESERVATION-COUNTER-CLAUSE-LOSS`.

## 2.12 `SURS3-HR-F012` — Independent review of each source admission was dropped

2.12.1 `severity=P1`.

2.12.2 `exactLocation=v2 SURS-008 proof at 3.2.4; subject V2P-008 and SURS3-REQ-021 at lines 277–287`.

2.12.3 `defect=v2 required every admission to have an independent review, while v3 admission requires custody, authority, selection and allowed safety but no separate eligible admission-review receipt`.

2.12.4 `rootCause=artifact-level hostile review and candidate-level admission review were conflated during the v3 split`.

2.12.5 `consequence=one authorized selector can admit a source without an independent source-risk check while the preservation crosswalk reports full retention`.

2.12.6 `requiredFix=restore a source-admission review receipt with exact subject root, reviewer eligibility and separation from selector, or record an externally approved supersession decision with an equivalent control and explicit scope`.

2.12.7 `acceptancePredicate=an admission lacking the exact eligible independent-review receipt remains non-admitted; selector-reviewer identity or prohibited-correlation fixtures block; replaying the same valid receipts yields one state root`.

2.12.8 `status=OPEN-REVIEWER-LOCAL`.

2.12.9 `noMergeKey=SURS3-PER-SOURCE-ADMISSION-INDEPENDENT-REVIEW-LOSS`.

## 2.13 `SURS3-HR-F013` — Explicit no-random identity rule and negative vector were lost

2.13.1 `severity=P1`.

2.13.2 `exactLocation=v2 SURS-007 proof at 3.1.4; predecessor SURS-HR-F007; subject SURS3-REQ-013 at lines 181–191; conformance CONF-013 at line 31`.

2.13.3 `defect=v3 says deterministic identity but no longer explicitly rejects arbitrary counters, Math.random() and unapproved randomness and provides no mutation vector for them`.

2.13.4 `rootCause=an explicit predecessor safety predicate was weakened to an inferred property of deterministic serialization`.

2.13.5 `consequence=an implementation can use a random or process-local identity preimage and still claim canonical serialization of the resulting record; replay and duplicate detection then fail`.

2.13.6 `requiredFix=state the absolute prohibition on Math.random() and arbitrary/process-local counters, define allowed deterministic content-addressed IDs, and require separate approval before any cryptographic-random identifier or key action`.

2.13.7 `acceptancePredicate=static and execution-independent checks reject Math.random(), time/process counters and unapproved randomness in every identity path; repeated valid content yields the same ID and any identity input change yields only the contractually expected successor`.

2.13.8 `status=OPEN-REVIEWER-LOCAL`.

2.13.9 `noMergeKey=SURS3-DETERMINISTIC-IDENTITY-EXPLICIT-NO-RANDOM-RULE-LOSS`.

## 2.14 `SURS3-HR-F014` — Public detector thresholds and zero critical-secret false negatives were lost

2.14.1 `severity=P0`.

2.14.2 `exactLocation=predecessor SURS-HR-F010 acceptance predicate; subject PCW-010, SURS3-REQ-023 at lines 301–311 and SURS3-REQ-039 at lines 493–503; mutation MUT-008 at line 77`.

2.14.3 `defect=v3 names a positive/negative corpus and blocked mutations but supplies no rooted per-class detector corpus, accepted precision/recall thresholds or explicit zero-critical-secret-false-negative rule`.

2.14.4 `rootCause=Public classification and egress completeness were expressed as qualitative PASS statements rather than measurable class-specific oracles`.

2.14.5 `consequence=a weak detector can miss critical credentials or over-redact harmless content and still claim that its selected corpus passed; a Public repository can receive prohibited bytes`.

2.14.6 `requiredFix=freeze deterministic non-business-data detector vectors per Secret/PII/customer/provider/proprietary/license class, exact expected classifications, accepted false-positive thresholds and zero false negatives for critical-secret classes across every accessible sink`.

2.14.7 `acceptancePredicate=two independent evaluators reproduce exact per-class confusion matrices and sink outcomes; critical-secret false negatives equal zero; all other metrics meet rooted thresholds; unknown or inaccessible coverage remains UNKNOWN-EGRESS-BLOCKED and can never be reported as zero leakage`.

2.14.8 `status=OPEN-REVIEWER-LOCAL`.

2.14.9 `noMergeKey=SURS3-PUBLIC-DETECTOR-THRESHOLD-AND-CRITICAL-FN-LOSS`.

## 2.15 `SURS3-HR-F015` — Public opaque projection construction and key lifecycle are undefined

2.15.1 `severity=P1`.

2.15.2 `exactLocation=subject SURS3-REQ-014 at lines 193–203 and SURS3-REQ-023 at lines 301–311; mutation MUT-006 at line 75`.

2.15.3 `defect=the projection is called opaque and non-reidentifiable without choosing a construction, secret-key or indirection policy, collision domain, rotation/versioning rule, deletion behavior or exact attack-corpus root`.

2.15.4 `rootCause=desired privacy properties were specified without the mechanism and lifecycle needed to test them`.

2.15.5 `consequence=a plain deterministic hash of a low-entropy locator, owner or provider field can be dictionary-reversed or linked across snapshots while satisfying the label opaque`.

2.15.6 `requiredFix=select a reviewed tokenization, HMAC or protected-indirection design under a separately authorized key-custody decision; bind domain/version, collision handling, rotation, deletion, Public projection limits and adversarial corpus; perform no key generation under the current freeze`.

2.15.7 `acceptancePredicate=the frozen adversarial corpus cannot recover or confirm private preimages or link forbidden domains above the accepted bound; collision, key/version change, deletion and replay vectors produce exact expected terminals and no private value enters Public bytes`.

2.15.8 `status=OPEN-REVIEWER-LOCAL`.

2.15.9 `noMergeKey=SURS3-PUBLIC-OPAQUE-PROJECTION-CONSTRUCTION-AND-KEY-LIFECYCLE`.

## 2.16 `SURS3-HR-F016` — Public egress completeness is defined by already observed sinks

2.16.1 `severity=P0`.

2.16.2 `exactLocation=subject SURS3-REQ-039 at lines 493–503 and its dependencies; mutation MUT-008 at line 77`.

2.16.3 `defect=the egress graph is derived from observed configurations but has no separate finite EgressDiscoveryInputSet, seed-authority proof, traversal/frontier ledger, observation cutoff, withheld/inaccessible-source records or proof that every eligible configuration root was seeded`.

2.16.4 `rootCause=Unknown-sink handling is applied after discovery, while completeness of the discovery denominator is left circular`.

2.16.5 `consequence=an unseen GitHub setting, workflow, deployment, telemetry, backup, CDN or AI-assistant configuration is neither a known sink nor an Unknown sink, allowing false zero-leakage claims`.

2.16.6 `requiredFix=derive a finite EgressDiscoveryInputSet and FrontierLedger from admitted repository, provider, deployment, collaboration, storage, observability and AI-tool configuration roots; record every visited, withheld, inaccessible, excluded and unresolved edge`.

2.16.7 `acceptancePredicate=two independent enumerators emit identical sink/frontier Sets; omitting one eligible configuration root, withholding a page or making one surface inaccessible prevents COMPLETE and yields UNKNOWN-EGRESS-BLOCKED with the exact frontier member; zero leakage is legal only over a proven complete accessible Set`.

2.16.8 `status=OPEN-REVIEWER-LOCAL`.

2.16.9 `noMergeKey=SURS3-PUBLIC-EGRESS-OBSERVED-SINK-CIRCULAR-DENOMINATOR`.

## 2.17 `SURS3-HR-F017` — Decision event types lack an authority-effect matrix

2.17.1 `severity=P1`.

2.17.2 `exactLocation=subject SURS3-REQ-019 at lines 253–263 and SURS3-REQ-030 at lines 385–395`.

2.17.3 `defect=directive, research and reconciliation events share a generic field-level patch and reducer contract without a closed matrix stating which event type and Appointment may modify which authoritative field or only attach evidence`.

2.17.4 `rootCause=research/approval separation is stated at role level but not enforced in DecisionEvent transition semantics`.

2.17.5 `consequence=non-authoritative research or reconciliation evidence can be interpreted as a current Decision amendment and alter operational intent`.

2.17.6 `requiredFix=publish a closed DecisionEventType registry and event-type-by-authority-by-field capability matrix; research may append evidence only, reconciliation may record conflict outcome only under eligible quorum, and authoritative patches require exact approved event types`.

2.17.7 `acceptancePredicate=research-only, wrong-role, wrong-field, expired, revoked and reordered fixtures cannot change authoritative current fields; an eligible approved directive changes only allowed exact fields; two reducers emit identical roots and terminals`.

2.17.8 `status=OPEN-REVIEWER-LOCAL`.

2.17.9 `noMergeKey=SURS3-DECISION-EVENT-TYPE-AUTHORITY-EFFECT-MATRIX-ABSENCE`.

## 2.18 `SURS3-HR-F018` — Provider runtime evidence has no exact producer or acquisition edge

2.18.1 `severity=P1`.

2.18.2 `exactLocation=subject SURS3-REQ-026 at lines 337–347; SURS3-REQ-027 at lines 349–359; SURS3-REQ-029 at lines 373–383; sole-producer table Section 6.1`.

2.18.3 `defect=ProviderReceipt consumes runtime evidence but neither assigns that evidence an exact sole producer nor declares a complete path to ImplementationSnapshot; observer Appointment, provider endpoint/response root and acquisition receipt are not total fields`.

2.18.4 `rootCause=documentation, live provider observation and local runtime evidence remain bundled inside one receipt schema`.

2.18.5 `consequence=a receipt can enable capability using unauthenticated, wrong-environment or stale runtime evidence even when account and approval fields appear valid`.

2.18.6 `requiredFix=split ProviderDocumentationObservation, ProviderEntitlementObservation and RuntimeCapabilityEvidence; bind each to exact actor, endpoint/request/response or runtime root, environment/asset, acquisition authority, freshness and sole producer; add all semantic dependencies`.

2.18.7 `acceptancePredicate=missing or mismatched observer authority, endpoint, response root, runtime-evidence producer, environment, asset, approval or freshness keeps capability OFF with PROVIDER-ENTITLEMENT-BLOCKED; two evaluators reproduce the same receipt ancestry`.

2.18.8 `status=OPEN-REVIEWER-LOCAL`.

2.18.9 `noMergeKey=SURS3-PROVIDER-RUNTIME-EVIDENCE-PRODUCER-AND-ACQUISITION-GAP`.

## 2.19 `SURS3-HR-F019` — Dynamic-source authenticity and cache partition evidence are incomplete

2.19.1 `severity=P1`.

2.19.2 `exactLocation=subject SURS3-REQ-018 at lines 241–251; SURS3-REQ-027 at lines 349–359; SURS3-REQ-028 at lines 361–371`.

2.19.3 `defect=publisher Appointment, redirect and DNS checks are named, but the observation schema does not close TLS/proxy/CDN/publisher-key evidence, DNS observation identity, Vary dimensions, cookie/authenticated-cache partition and trusted-clock proof`.

2.19.4 `rootCause=transport authenticity and HTTP cache identity were summarized as proven publisher path and validator without enumerating all identity-changing intermediaries`.

2.19.5 `consequence=a proxy/CDN or cross-tenant cache object can be treated as official current bytes, or two requests with different authorization/Vary dimensions can share a freshness receipt`.

2.19.6 `requiredFix=extend FetchObservation with rooted transport/publisher verification profile, DNS and per-hop identity, proxy/CDN disposition, cache key including Vary and authentication partition, and trusted-clock evidence; unsupported intermediary state must block`.

2.19.7 `acceptancePredicate=direct, CDN, proxy, certificate/key rotation, DNS change, Vary, authenticated/anonymous cache, 304 and clock-skew vectors resolve identically under two evaluators; any mismatched identity or cache partition yields AuthenticityUnknown or DYNAMIC-SOURCE-STALE-BLOCKED`.

2.19.8 `status=OPEN-REVIEWER-LOCAL`.

2.19.9 `noMergeKey=SURS3-DYNAMIC-AUTHENTICITY-AND-CACHE-PARTITION-EVIDENCE-GAP`.

## 2.20 `SURS3-HR-F020` — Erasure proof does not close all storage and key copies

2.20.1 `severity=P1`.

2.20.2 `exactLocation=subject SURS3-REQ-041 at lines 517–527 and SURS3-REQ-042 at lines 529–539`.

2.20.3 `defect=cryptographic key destruction and tombstones are named without a complete replica/cache/backup/export/escrow/wrapping-key lineage and without a privacy rule for tombstone metadata`.

2.20.4 `rootCause=erasure is scoped to a logical payload reference rather than the closure of every recoverable byte and key copy`.

2.20.5 `consequence=restore or another surviving wrapped key can recover data declared erased, while a Public tombstone can disclose the identity or existence of protected data`.

2.20.6 `requiredFix=materialize per-DataClass storage-copy and key-lineage graphs covering replicas, caches, exports, backups, escrow, DEKs, KEKs and wraps; bind deletion/Hold precedence and disclosure-safe tombstone projection`.

2.20.7 `acceptancePredicate=after authorized erasure, every non-held payload is unrecoverable from all enumerated copies and key paths; held payload remains; restore cannot recreate a current or readable erased object; tombstone bytes satisfy the Public privacy policy`.

2.20.8 `status=OPEN-REVIEWER-LOCAL`.

2.20.9 `noMergeKey=SURS3-ERASURE-STORAGE-COPY-AND-KEY-LINEAGE-NONCLOSURE`.

## 2.21 `SURS3-HR-F021` — Invalidation trigger completeness has no field denominator

2.21.1 `severity=P1`.

2.21.2 `exactLocation=subject SURS3-REQ-043 at lines 541–551 and SURS3-REQ-006 at lines 97–107`.

2.21.3 `defect=the rule requires one trigger for every mutable authoritative field but no canonical versioned AuthoritativeFieldRegistry is produced from all schemas, policies, algorithms, test oracles and external lifecycle fields`.

2.21.4 `rootCause=trigger completeness is measured only over fields already present in the trigger implementation, recreating a circular denominator`.

2.21.5 `consequence=an omitted schema, reviewer, scanner, retention, region or policy field also has no trigger and no detectable missing-trigger record, leaving stale accepted work current`.

2.21.6 `requiredFix=derive and root an AuthoritativeFieldRegistry before the trigger matrix; include every field producer and external lifecycle with forward and inverse edges and generate trigger coverage from that independent denominator`.

2.21.7 `acceptancePredicate=the union of trigger-covered field IDs equals the exact field registry; every field has at least one valid trigger and inverse dependency edge; adding a field without a trigger or deleting an edge yields SOURCE-INVALIDATION-BLOCKED`.

2.21.8 `status=OPEN-REVIEWER-LOCAL`.

2.21.9 `noMergeKey=SURS3-INVALIDATION-TRIGGER-INDEPENDENT-FIELD-DENOMINATOR-ABSENCE`.

## 2.22 `SURS3-HR-F022` — Independence and non-collusion relations are not closed types

2.22.1 `severity=P1`.

2.22.2 `exactLocation=subject SURS3-REQ-045 at lines 565–575; SURS3-REQ-046 at lines 577–587; mutation MUT-019 at line 88`.

2.22.3 `defect=implementation, library, owner, envelope and non-collusion limits are named without a closed relation registry, transitive-correlation rules, allowed exceptions or precedence`.

2.22.4 `rootCause=independence eligibility remains a reviewer judgment rather than a deterministic graph predicate`.

2.22.5 `consequence=two wrappers around the same logic, common author/team, shared transitive dependency, model/provider or execution infrastructure can be accepted as independent by one evaluator and rejected by another`.

2.22.6 `requiredFix=publish an IndependenceRelationRegistry covering owner, organization/team, repository, code ancestry, direct/transitive library, model/provider, prompt or rule source, data source, execution environment and reviewer appointment, plus exact exception authority`.

2.22.7 `acceptancePredicate=two eligibility evaluators return identical decisions for every direct, transitive, shared-owner, shared-model/provider, shared-environment and approved-exception vector; any undeclared relation or exception yields SOURCE-ACCEPTANCE-BLOCKED`.

2.22.8 `status=OPEN-REVIEWER-LOCAL`.

2.22.9 `noMergeKey=SURS3-INDEPENDENCE-NONCOLLUSION-CLOSED-RELATION-ABSENCE`.

## 2.23 `SURS3-HR-F023` — Broad rows violate the stated semantic-atomicity contract

2.23.1 `severity=P1`.

2.23.2 `exactLocation=subject 1.2.2; SURS3-REQ-039 at lines 493–503; SURS3-REQ-041 at lines 517–527; SURS3-REQ-046 at lines 577–587`.

2.23.3 `defect=single rows bundle independently produced and invalidated objects, including egress discovery, classification and incident response; archive, restore, retention, Hold and key custody; and QA, reviews, reconciliation, veto, Acceptance and generations`.

2.23.4 `rootCause=reviewer-Finding closure was treated as permission to aggregate several contract objects under one acceptance predicate`.

2.23.5 `consequence=a failure cannot identify the minimal producer, rework scope or invalidation Set; partial implementation can receive row-level PASS despite missing one bundled object`.

2.23.6 `requiredFix=split every independently produced, versioned, reviewed or invalidated object into an atomic requirement with a sole producer and exact join dependencies; retain one-to-one Finding closure via a separate finite closure Set`.

2.23.7 `acceptancePredicate=every requirement row has one canonical output object or one explicit closure-only assertion and one deterministic PASS boundary; producer count per output equals one; changing one object invalidates only its exact transitive consumers`.

2.23.8 `status=OPEN-REVIEWER-LOCAL`.

2.23.9 `noMergeKey=SURS3-REQUIREMENT-SEMANTIC-ATOMICITY-BUNDLED-CONTRACTS`.

## 2.24 `SURS3-HR-F024` — Review, reconciliation, veto and Acceptance lack a deterministic lifecycle

2.24.1 `severity=P0`.

2.24.2 `exactLocation=subject SURS3-REQ-002 at lines 49–59; SURS3-REQ-045 at lines 565–575; SURS3-REQ-046 at lines 577–587; conformance CONF-046 and acceptance rules at lines 64 and 106–108`.

2.24.3 `defect=the subject names separate envelopes but does not define their exact schemas, state transitions, event order, reviewer quorum, reconciliation choices, veto precedence, appeal, expiry/revocation, fenced current-pointer publication or mapping to the externally accepted review protocol`.

2.24.4 `rootCause=a prose list of lifecycle stages was used in place of a typed protocol-conformance adapter and source-specific Acceptance state machine`.

2.24.5 `consequence=the same Findings and reviews can yield ACCEPTED, REVIEW-BLOCKED or indefinitely pending depending on evaluator ordering; a stale or unauthorized envelope can become current without a protected transition`.

2.24.6 `requiredFix=bind one exact accepted review-protocol root and publish a source-universe adapter defining envelope schemas, role/quorum mapping, state and event registries, reconciliation and veto transitions, expiry/revocation, CAS/fencing and safe terminals; Acceptance must remain detached from the subject bytes`.

2.24.7 `acceptancePredicate=two independent state-machine evaluators produce byte-identical states for valid, conflicting, vetoed, appealed, expired, revoked, stale-generation, duplicate, reordered and concurrent events; only one eligible detached exact-root Acceptance may win a fenced current pointer; every other case remains REVIEW-BLOCKED`.

2.24.8 `status=OPEN-REVIEWER-LOCAL`.

2.24.9 `noMergeKey=SURS3-REVIEW-RECONCILIATION-VETO-ACCEPTANCE-LIFECYCLE-ABSENCE`.

# 3. Counters and disposition

## 3.1 Finding counters

3.1.1 total Findings=`24`.

3.1.2 P0=`12`.

3.1.3 P1=`12`.

3.1.4 P2=`0`.

3.1.5 P3=`0`.

3.1.6 unique Finding IDs=`24`; duplicate Finding IDs=`0`; unique noMergeKeys=`24`; duplicate noMergeKeys=`0`.

3.1.7 open=`24/24`; closed=`0/24`; reconciled=`0/24`; suppressed=`0/24`; risk-accepted=`0/24`; merged=`0/24`.

## 3.2 Mechanical observations retained separately from closure

3.2.1 subject rows=`46`; five-field instances=`230`; declared dependency edges=`336`; syntactic unknown/self/duplicate/forward/cycle counts=`0/0/0/0/0`.

3.2.2 SourceReferenceIndex target rows=`79`; indexed ordered pairs=`80`; actual literal occurrences=`126`; physical root mismatches=`0`; non-D31 byte-executable locator proofs=`0/78`.

3.2.3 frozen test IDs=`70`; executable exact-oracle vectors accepted=`0/70`; controlled GenerationPair vectors=`0/1`.

3.2.4 v2 requirement mappings present=`26/26`; v2-review Finding mappings present=`20/20`; predecessor Finding mappings present=`32/32`; evidentiary closures accepted=`0/26, 0/20 and 0/32`.

## 3.3 Verdict

3.3.1 reviewer verdict=`REJECT AS DEFINITION-ACCEPTANCE-READY; IMMUTABLE SUCCESSOR REQUIRED`.

3.3.2 acceptance terminal=`REVIEW-BLOCKED`.

3.3.3 this reviewer-local manifest grants no closure; reconciliation under an accepted protocol must preserve all 24 identities and exact reviewed roots.

3.3.4 exact Product completion, remaining hours and ETA remain `unknown/unavailable`.

3.3.5 Gate29=`BLOCKED`; development freeze=`ACTIVE`; repository visibility=`Public`.

3.3.6 no Product/Git/Build/test/Push/Deploy/provider/account/credential action is authorized.
