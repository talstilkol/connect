# 1. Connect — B0 Requirements independent hostile-review findings manifest

## 1.1 Identity and freeze

1.1.1 `artifactId=CONNECT-B0-REQUIREMENTS-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-2026-08-29`.

1.1.2 `reviewClass=INDEPENDENT-HOSTILE-REVIEW; FINDINGS-FROZEN-BEFORE-PRODUCER-QA-DISCLOSURE`.

1.1.3 `subjectPath=/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-requirements-candidate-2026-08-29.md`.

1.1.4 `subjectRawSha256=678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb`.

1.1.5 `subjectPhysicalIdentity=383 lines; 21252 bytes`.

1.1.6 `reviewDisposition=REJECT; SUCCESSOR-REQUIRED; B0-ABSENT; GATE29-BLOCKED`.

## 1.2 Rooted source aliases used below

1.2.1 `SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb` resolves only to the Subject in 1.1.3.

1.2.2 `DIRECTIVE@b012a479b18e162f5f759b49e033eb3856a4637cc0e91a8a36f1d06043813342` resolves to `/Users/tal/Documents/connect/web/docs/planning/user-directive-and-source-precedence-ledger-2026-08-29.md`.

1.2.3 `BCA2@f35ae1f0c8cf22ec379e0bf8b4f264a30c254df68181d25e3d4fe33ef46f20aa` resolves to `/Users/tal/Documents/connect/web/docs/planning/bootstrap-lifecycle-successor-requirements-2026-08-29.md`.

1.2.4 `MPSC2@403a9f77d85c67ebc4498c12a0c74912f8c015cfbccd665f3043a99c9d98310e` resolves to `/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-v2-2026-08-29.md`.

1.2.5 `MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768` resolves to `/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-hostile-review-2026-08-29.md`.

1.2.6 `D18-A2@448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9` resolves to `/Users/tal/Documents/connect/web/docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md`.

1.2.7 `PROTOCOL-MATH@fb5d33c3593adcf614e3fb4f87660fef762af2f9cf12791422a815c7470dec45` resolves to `/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-1-successor-requirements-mathematical-hostile-review-2026-08-29.md`.

1.2.8 `PROTOCOL-V12-HR@bb9878b5d0a107cb8a7c240459de7a87d6f6f34e743b1bdb3ed13dc1773cb1ea` resolves to `/Users/tal/Documents/connect/web/docs/planning/three-review-protocol-v1-2-successor-requirements-hostile-review-2026-08-29.md`.

1.2.9 `SOURCE-HR@a9c479e0b066b781f5d742c63439f94d31811e3949e1823dae6824e5b4a225fa` resolves to `/Users/tal/Documents/connect/web/docs/planning/source-universe-and-custody-requirements-hostile-review-2026-08-29.md`.

# 2. Frozen findings

## 2.1 `B0-HR-F001` — Source basis is not exact-root resolvable

2.1.1 `severity=P0`.

2.1.2 `locator=SUBJECT:§1.2.5; every §2.x.5; §3.1.4`.

2.1.3 `defect=the 27 sourceBasis rows contain 84 tokens, zero tokens encode an exact artifact root plus locator, zero rows are fully exact-rooted, and 17 distinct tokens are plainly semantic aliases such as “Protocol math findings” or “BCA2 role requirements”; §1.2.5 names selected MPSC finding IDs but omits the hostile-review path and digest`.

2.1.4 `impact=a successor can cite a different generation, report or similarly named section and still appear traceable; requirement completeness and non-regression cannot be independently reconstructed`.

2.1.5 `requiredDelta=replace every sourceBasis member with sourceAlias@fullSha256::exactSectionOrFindingId; freeze an explicit SourceReferenceIndex; reject dangling, ambiguous, range-only, generation-free and claim-limit-incompatible references`.

2.1.6 `acceptancePredicate=27/27 rows resolve through two independent readers to the same immutable path, digest and exact locator; unresolved=0; ambiguous=0; wrong-generation mutants=0 accepted; forward and inverse source coverage are byte-identical`.

2.1.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§1.2.5,2.1.5–2.27.5,3.1.4; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F005`.

2.1.8 `state=OPEN-BLOCKING`.

2.1.9 `noMergeKey=B0-HR-F001-SOURCE-REFERENCE-ROOT-LOCATOR`.

## 2.2 `B0-HR-F002` — Navigation evidence is promoted into authority input

2.2.1 `severity=P0`.

2.2.2 `locator=SUBJECT:§§1.2.1,2.2.5,2.4.5,2.5.5,2.7.5,2.15.5,2.16.5,2.18.5; DIRECTIVE:§§1.1.4–1.1.6,6.1–6.6`.

2.2.3 `defect=the Subject uses the draft directive ledger as authority basis even though that ledger explicitly says it is not accepted, lacks a complete immutable transcript, and treats quoted directives as navigation evidence only`.

2.2.4 `impact=B0 requirements and a future mandate can be derived from producer-normalized prose rather than durable user authority, recreating self-authorization one layer earlier`.

2.2.5 `requiredDelta=separate navigation evidence from authority evidence; require a durable exact-root Tal receipt over the canonical mandate and claim-limit manifest; mark the directive ledger non-authoritative in the B0 input graph`.

2.2.6 `acceptancePredicate=no Authority edge originates from DIRECTIVE draft; every binding claim resolves to a Tal-authenticated exact-root receipt or remains UNKNOWN/BLOCKED; transcript-unavailable state never receives authority credit`.

2.2.7 `sourceBasis=DIRECTIVE@b012a479b18e162f5f759b49e033eb3856a4637cc0e91a8a36f1d06043813342::§§1.1.4–1.1.6,6.1–6.6; SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§1.2.1,2.2.5,2.4.5`.

2.2.8 `state=OPEN-BLOCKING`.

2.2.9 `noMergeKey=B0-HR-F002-NAVIGATION-EVIDENCE-AUTHORITY-PROMOTION`.

## 2.3 `B0-HR-F003` — Tal is a label, not an authenticated trust anchor

2.3.1 `severity=P0`.

2.3.2 `locator=SUBJECT:§§2.2,2.4,2.9,2.17,2.18,2.22`.

2.3.3 `defect=TalExactRootApprovalReceipt, appointment, revocation and supersession are required, but no verifier, authenticated channel, trust-anchor identifier, signature or MAC scheme, key ownership, challenge/nonce, anti-replay context, key rotation or compromise rule is defined`.

2.3.4 `impact=an unauthenticated producer message or replayed approval can be represented as Tal authority; forged appointments or revocations can take control of the full bootstrap chain`.

2.3.5 `requiredDelta=define an external AuthorityTrustProfile binding Tal identity to an approved authentication channel and verifier; bind purpose, roots, nonce/challenge, epoch, issuedAt, expiry and supersession; define key/channel rotation, compromise and recovery without storing secrets publicly`.

2.3.6 `acceptancePredicate=forged-channel, wrong-identity, wrong-purpose, wrong-root, replay, expired-key, rotated-key and compromised-key vectors all fail closed; two independent verifiers return the same authority identity and reason set`.

2.3.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.2,2.4,2.9,2.17–2.18,2.22; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F001`.

2.3.8 `state=OPEN-BLOCKING`.

2.3.9 `noMergeKey=B0-HR-F003-EXTERNAL-TAL-TRUST-ANCHOR`.

## 2.4 `B0-HR-F004` — Genesis acts are circular or absent from the allowlists

2.4.1 `severity=P0`.

2.4.2 `locator=SUBJECT:§§2.3,2.4,2.6–2.8,2.13; MPSC2:§§1.4–1.5`.

2.4.3 `defect=the system needs a CanonicalMandate, B0 Definition, B0 Instance, bootstrap protocol and permits before ordinary B0-authorized acts can occur, yet CANONICAL-MANDATE, B0-DEFINITION and B0-INSTANCE are absent from the subject whitelist and no external GenesisAct contract exists; using B0 to create them is circular, while creating them without B0 is undefined`.

2.4.4 `impact=the first valid B0 can neither be constructed nor reviewed under the stated rules; an implementation must deadlock or silently invent genesis authority`.

2.4.5 `requiredDelta=define a minimal external GenesisAuthority path rooted directly in Tal-authenticated receipts, with exact allowed genesis objects, acts, actors, roots and safe terminals; explicitly prohibit B0 from authorizing its own definition, instance or trust anchor`.

2.4.6 `acceptancePredicate=authorization DAG has one externally rooted genesis path, zero self-authority cycles and zero undefined act edges; every genesis object has one issuer and one review route; removing the external Tal receipt makes all genesis outputs BLOCKED`.

2.4.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.3–2.8,2.13; MPSC2@403a9f77d85c67ebc4498c12a0c74912f8c015cfbccd665f3043a99c9d98310e::§§1.4–1.5; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F001`.

2.4.8 `state=OPEN-BLOCKING`.

2.4.9 `noMergeKey=B0-HR-F004-GENESIS-AUTHORITY-DAG`.

## 2.5 `B0-HR-F005` — Bootstrap review authority is not independently bootstrapped

2.5.1 `severity=P0`.

2.5.2 `locator=SUBJECT:§§2.10,2.14,2.20,3.2.1–3.2.3`.

2.5.3 `defect=the BootstrapReviewProtocol must be frozen before review and every review must point to a prior external protocol, but the protocol’s own issuer, acceptance basis, immutable rule denominator, reviewer cardinality, independence predicate and veto semantics are not defined; the candidate acceptance path merely says “two independent reviews”`.

2.5.4 `impact=a producer-selected protocol or under-specified reviewer set can validate the authority that later validates that same protocol, preserving the review-authority cycle under different artifact names`.

2.5.5 `requiredDelta=define a separately rooted BootstrapReviewAuthority and a minimal immutable protocol admitted by the GenesisAuthority; enumerate review count, role conflicts, packet seal, finding schema, severity/veto, reconciliation limits and successor-only correction`.

2.5.6 `acceptancePredicate=bootstrap protocol admission consumes only prior external authority; exact review denominator is non-empty and fixed; producer/reviewer/reconciler/acceptance-writer conflicts are machine-evaluated; protocol mutation invalidates every dependent review`.

2.5.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.10,2.14,2.20,3.2; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F002; PROTOCOL-V12-HR@bb9878b5d0a107cb8a7c240459de7a87d6f6f34e743b1bdb3ed13dc1773cb1ea::§§2–4`.

2.5.8 `state=OPEN-BLOCKING`.

2.5.9 `noMergeKey=B0-HR-F005-BOOTSTRAP-REVIEW-AUTHORITY`.

## 2.6 `B0-HR-F006` — Subject and Act allowlists do not bound the actual effect

2.6.1 `severity=P0`.

2.6.2 `locator=SUBJECT:§§2.6–2.8,2.15`.

2.6.3 `defect=closed labels for Subject class and Act type do not bind filesystem root, exact output schema, target locator, byte/effect budget, repository root, network destination, public-egress class or permitted write primitive; “effect-based classifier” has no rooted classifier specification`.

2.6.4 `impact=a malicious or misclassified act can use an allowed label while writing unrelated files, leaking evidence, invoking a hidden external effect or substituting a different semantic subject with the same class`.

2.6.5 `requiredDelta=add an EffectScopeManifest to every permit containing exact input/output roots, allowed path set, operation enum, side-effect class, target environment, egress policy, maximum occurrence and denied capabilities; bind the classifier version and proof`.

2.6.6 `acceptancePredicate=wrong-path, extra-output, alternate-schema, hidden-network, shell/Git/provider, over-budget, public-egress and same-class-substitution mutants all terminate BLOCKED before effect; allowed effect set is finite and reconstructible`.

2.6.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.6–2.8,2.15; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F012`.

2.6.8 `state=OPEN-BLOCKING`.

2.6.9 `noMergeKey=B0-HR-F006-EFFECT-SCOPE-ALLOWLIST`.

## 2.7 `B0-HR-F007` — One-use Permit consumption is not atomic with the Act

2.7.1 `severity=P0`.

2.7.2 `locator=SUBJECT:§§2.8,2.19,2.23–2.24`.

2.7.3 `defect=the Permit promises one consumption receipt and rejects duplicate attempts, but defines no atomic unconsumed→reserved→consumed state change, expected version, execution fence, idempotency key, lease recovery or coupling between consumption and the permitted effect`.

2.7.4 `impact=two concurrent actors can both observe an unused Permit and perform the effect; response loss can cause a retry that repeats the effect while the ledger still later shows only one successful receipt`.

2.7.5 `requiredDelta=define a fenced Permit state machine and atomic reservation before any effect; bind one Attempt ID, expected Permit version, actor and effect digest; define committed, rejected, abandoned, expired and committed-unconfirmed reconciliation`.

2.7.6 `acceptancePredicate=parallel replay, delayed replay, response-loss retry, duplicated actor, reused attempt and reservation-expiry tests yield at most one effect; terminal XOR=1 and no terminal can be overwritten`.

2.7.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.8,2.19,2.23–2.24; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F011`.

2.7.8 `state=OPEN-BLOCKING`.

2.7.9 `noMergeKey=B0-HR-F007-PERMIT-ATOMIC-CONSUMPTION`.

## 2.8 `B0-HR-F008` — Revocation is not fenced against in-flight work

2.8.1 `severity=P0`.

2.8.2 `locator=SUBJECT:§§2.8,2.17–2.18,2.22–2.25`.

2.8.3 `defect=revocation is said to invalidate descendants and clear grants, but no atomic check binds the revocation head and authority epoch at request, effect start and commit; there is no rule for a revoke racing an in-flight Permit or acceptance CAS`.

2.8.4 `impact=a stale Permit can commit after Tal revokes it, or one reader can show revoked while another pointer remains current, creating split authority`.

2.8.5 `requiredDelta=bind expectedRevocationHead and expectedAuthorityEpoch to Permit reservation and final commit; define revoke-wins concurrency semantics, cancellation/compensation, descendant current-pointer clearing and immutable historical retention`.

2.8.6 `acceptancePredicate=revocation-before-reserve, during-effect, before-commit, after-commit and concurrent-CAS schedules produce one specified terminal each; no post-revocation effect becomes current; two reducers agree on the surviving authority set`.

2.8.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.8,2.17–2.18,2.22–2.25; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F008`.

2.8.8 `state=OPEN-BLOCKING`.

2.8.9 `noMergeKey=B0-HR-F008-REVOCATION-INFLIGHT-FENCE`.

## 2.9 `B0-HR-F009` — Appointment and conflict semantics are placeholders

2.9.1 `severity=P1`.

2.9.2 `locator=SUBJECT:§§2.9–2.10,2.20–2.22`.

2.9.3 `defect=appointments have owner, scope and epoch but no authenticated issuer, credential binding, delegation chain, selection rule when primary and backup overlap, quorum, exact prohibited-role intersections or emergency replacement semantics`.

2.9.4 `impact=the same human or agent can occupy nominally distinct roles, multiple appointments can create ambiguous authority, and a revoked primary can leave an unauthorized backup active`.

2.9.5 `requiredDelta=publish a rooted Appointment schema and exact RoleConflictMatrix covering producer, QA, reviewers, reconciler, approvers and acceptance writer; bind issuer authority, identity proof, delegation, priority, quorum, validity and revocation`.

2.9.6 `acceptancePredicate=every act resolves to one selected eligible appointment at one snapshot; prohibited intersections=0; ambiguous/overlapping/delegation-cycle/revoked/issuer-mismatch vectors fail closed; backup activation is auditable`.

2.9.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.9–2.10,2.20–2.22; BCA2@f35ae1f0c8cf22ec379e0bf8b4f264a30c254df68181d25e3d4fe33ef46f20aa::BCA2-REQ-033; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F006`.

2.9.8 `state=OPEN-BLOCKING`.

2.9.9 `noMergeKey=B0-HR-F009-APPOINTMENT-CONFLICT-MATRIX`.

## 2.10 `B0-HR-F010` — Cryptographic identity, signature and key lifecycle are undefined

2.10.1 `severity=P0`.

2.10.2 `locator=SUBJECT:§§2.2,2.4,2.8,2.11–2.12,2.17–2.19,2.22`.

2.10.3 `defect=deterministic identity and canonical serialization are required, but digest algorithm/version, exact domain-separator bytes, canonical schema, collision handling, receipt authentication algorithm, key identifiers, verifier rules, rotation and compromise recovery are absent; a zero-collision corpus cannot prove collision resistance`.

2.10.4 `impact=different implementations can derive different roots, cross-type objects can collide semantically, and unsigned receipts or stale keys can be accepted as authority`.

2.10.5 `requiredDelta=define versioned canonical bytes and approved digest/MAC/signature profiles with literal domain separators, key IDs, verification context, algorithm agility, collision terminal, rotation and compromise invalidation; distinguish deterministic object identity from authenticated authority`.

2.10.6 `acceptancePredicate=two independent implementations match all normative vectors; cross-domain/confusable/null/order/schema/version/key-rotation mutants fail; unknown algorithms and keys return BLOCKED; collision produces a dedicated non-retry terminal`.

2.10.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.2,2.4,2.8,2.11–2.12,2.17–2.19,2.22; PROTOCOL-MATH@fb5d33c3593adcf614e3fb4f87660fef762af2f9cf12791422a815c7470dec45::§§2–4`.

2.10.8 `state=OPEN-BLOCKING`.

2.10.9 `noMergeKey=B0-HR-F010-CRYPTO-IDENTITY-SIGNATURE-KEYS`.

## 2.11 `B0-HR-F011` — Public hash publication can leak sensitive low-entropy values

2.11.1 `severity=P1`.

2.11.2 `locator=SUBJECT:§§2.4,2.12,2.15,2.19,2.22; D18-A2:§§3.1–3.4,4.4`.

2.11.3 `defect=the Subject requires roots and public-safe outputs but does not distinguish a public digest from a private commitment; hashing a phone number, token-shaped value, customer identifier or low-entropy approval text can create a public dictionary oracle even when raw bytes remain private`.

2.11.4 `impact=a Public repository may reveal or confirm sensitive values through brute-force comparison, logs, roots or manifests without containing the plaintext`.

2.11.5 `requiredDelta=define classification-aware commitment policy: public raw digest only for approved public bytes; private evidence uses a private index or approved keyed commitment with key custody; public artifacts expose opaque references only when disclosure review passes`.

2.11.6 `acceptancePredicate=low-entropy/PII/secret-shaped vectors never emit a public reversible-verification digest; public manifest scan finds prohibited commitments=0; two classifiers agree on egress disposition; missing classification blocks write/publication`.

2.11.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.4,2.12,2.15,2.19,2.22; D18-A2@448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9::§§3.1–3.4,4.4`.

2.11.8 `state=OPEN-BLOCKING`.

2.11.9 `noMergeKey=B0-HR-F011-PUBLIC-HASH-DICTIONARY-LEAKAGE`.

## 2.12 `B0-HR-F012` — The input freeze omits security-critical heads

2.12.1 `severity=P0`.

2.12.2 `locator=SUBJECT:§2.13`.

2.12.3 `defect=the six frozen roots omit the B0 Definition root, canonical serialization and digest profile roots, AuthorityTrustProfile/key set, trusted-time source, revocation head, Permit schema/state-store head, classification/egress policy, current-pointer store identity and acceptance-policy root`.

2.12.4 `impact=an instance can keep the same listed freeze while its verifier, keys, clock, revocation state, serialization, disclosure policy or current store changes, enabling subject substitution and stale authority`.

2.12.5 `requiredDelta=replace the informal root list with a typed complete B0InputRootManifest and dependency closure; enumerate every security-relevant root and authoritative head, its claim scope and invalidation edge`.

2.12.6 `acceptancePredicate=two independent dependency traversals return the same non-empty complete root set; changing any verifier/key/time/revocation/serialization/permit/classification/store root invalidates the instance and every descendant; omitted-input mutants fail`.

2.12.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.13; SOURCE-HR@a9c479e0b066b781f5d742c63439f94d31811e3949e1823dae6824e5b4a225fa::§§2–4`.

2.12.8 `state=OPEN-BLOCKING`.

2.12.9 `noMergeKey=B0-HR-F012-SECURITY-CRITICAL-INPUT-ROOTS`.

## 2.13 `B0-HR-F013` — The “full” acceptance envelope is materially incomplete

2.13.1 `severity=P0`.

2.13.2 `locator=SUBJECT:§§2.22–2.24`.

2.13.3 `defect=the envelope list does not explicitly bind B0 Definition root/version, CanonicalMandate root, policy and protocol roots, trust/key/time profiles, permit and consumption receipt, revocation/current heads, serialization profile, classification disposition, pointer/store identity, comparison predicate version or complete approval denominator`.

2.13.4 `impact=a valid-looking envelope can accept the correct Subject under the wrong mandate, verifier, permit, revocation state, protocol, policy or pointer store`.

2.13.5 `requiredDelta=define an exact AcceptanceEnvelope schema with mandatory fields and full dependency-root closure; prohibit catch-all “Inputs” fields; bind every approval requirement and receipt one-to-one and atomically snapshot all heads used for eligibility`.

2.13.6 `acceptancePredicate=field/schema denominator is explicit and non-empty; missing/wrong/stale field mutants all return BLOCKED; two validators return byte-identical eligibility reason sets; inverse traversal reaches every authority and policy dependency exactly once`.

2.13.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.22–2.24; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F011; BCA2@f35ae1f0c8cf22ec379e0bf8b4f264a30c254df68181d25e3d4fe33ef46f20aa::BCA2-REQ-044`.

2.13.8 `state=OPEN-BLOCKING`.

2.13.9 `noMergeKey=B0-HR-F013-ACCEPTANCE-ENVELOPE-CLOSURE`.

## 2.14 `B0-HR-F014` — Response-loss semantics make a false no-grant claim

2.14.1 `severity=P0`.

2.14.2 `locator=SUBJECT:§§2.23.1–2.24.3`.

2.14.3 `defect=B0REQ-023 says reconciliation distinguishes UNKNOWN, yet requiredProof says timeout, mismatch or response loss “produces no current grant”; after an atomic CAS commits and the response/readbacks are lost, the client cannot prove that no grant exists`.

2.14.4 `impact=one actor can treat the grant as absent and retry while another observes it as current, producing ABA, duplicate authority or split-brain state`.

2.14.5 `requiredDelta=define COMMITTED-CONFIRMED, NOT-COMMITTED, COMMITTED-UNCONFIRMED and CONFLICT terminals; freeze all dependent acts during UNKNOWN; reconcile only from an authoritative linearizable store or an explicit recovery protocol, never by assumption`.

2.14.6 `acceptancePredicate=commit-before-loss, no-commit loss, stale read, conflicting read and prolonged outage schedules yield the specified terminal; UNKNOWN grants zero usable authority and forbids retry with the same Attempt; eventual reconciliation is monotonic`.

2.14.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.23–2.24; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F011`.

2.14.8 `state=OPEN-BLOCKING`.

2.14.9 `noMergeKey=B0-HR-F014-CAS-RESPONSE-LOSS-SPLIT-BRAIN`.

## 2.15 `B0-HR-F015` — “Two independent readbacks” has no consistency contract

2.15.1 `severity=P1`.

2.15.2 `locator=SUBJECT:§§2.22–2.24`.

2.15.3 `defect=independence is not defined: two calls can hit the same stale cache, replica, credential, query implementation or observer; no consistency level, snapshot/version fence, maximum staleness or authoritative source is bound`.

2.15.4 `impact=two matching stale values can falsely confirm current authority, while two legitimate transiently different values can be misclassified without a safe recovery path`.

2.15.5 `requiredDelta=define ReadbackA and ReadbackB source/query/credential independence, required consistency and snapshot tuple; bind store revision and proof of freshness; specify mismatch and source-outage recovery`.

2.15.6 `acceptancePredicate=same-cache, stale-replica, same-query, stale-token and mixed-revision mutants do not count as two independent confirmations; accepted readbacks bind one revision and exact attempt tuple; ambiguity returns UNKNOWN`.

2.15.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.22–2.24; BCA2@f35ae1f0c8cf22ec379e0bf8b4f264a30c254df68181d25e3d4fe33ef46f20aa::BCA2-REQ-044`.

2.15.8 `state=OPEN-BLOCKING`.

2.15.9 `noMergeKey=B0-HR-F015-READBACK-INDEPENDENCE-CONSISTENCY`.

## 2.16 `B0-HR-F016` — Observation status conflicts with authoritative current state

2.16.1 `severity=P1`.

2.16.2 `locator=SUBJECT:§2.25`.

2.16.3 `defect=Current, Expired, Revoked and Blocked are modeled as PhaseObservation records, while UNKNOWN appears only in requiredProof; no reducer defines precedence between observations, the authoritative pointer, revocation head and trusted time, or prevents an observer from asserting Current`.

2.16.4 `impact=a stale or malicious observation can present revoked authority as current, and independent views can disagree without a canonical safe result`.

2.16.5 `requiredDelta=make observations non-authoritative evidence only; define a deterministic current-state reducer over one fenced cut of pointer, epoch, revocation and time; include UNKNOWN and COMMITTED-UNCONFIRMED explicitly`.

2.16.6 `acceptancePredicate=observation alone can never grant authority; conflicting/stale/missing observation vectors reduce identically to UNKNOWN/BLOCKED; state changes do not mutate Subject bytes; reducer inputs bind one cut root`.

2.16.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.25; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F032`.

2.16.8 `state=OPEN-BLOCKING`.

2.16.9 `noMergeKey=B0-HR-F016-OBSERVATION-NONAUTHORITY-REDUCER`.

## 2.17 `B0-HR-F017` — Two-generation proof is recursively impossible

2.17.1 `severity=P0`.

2.17.2 `locator=SUBJECT:§§2.26,3.2.1–3.2.3`.

2.17.3 `defect=B0 Definition and Instance lifecycle must be proven by G1 accepting and G2 repeating the full lifecycle, but construction and acceptance of those generations already require an accepted B0 Definition, valid Permits and bootstrap review authority; no externally authorized conformance/shadow-generation route is defined`.

2.17.4 `impact=the Definition cannot satisfy its acceptance predicate before it is trusted, or the first generations must bypass the very rules they are meant to prove`.

2.17.5 `requiredDelta=define staged genesis: externally authorized conformance generations with zero operational authority, followed by exact-root Definition acceptance, then operational Instance issuance; conformance success must not itself grant a Permit`.

2.17.6 `acceptancePredicate=authorization graph is acyclic; G1/G2 test objects cannot authorize any act; both generations exercise delta/invalidation/replay under external genesis receipts; only a later accepted operational instance can issue a Permit`.

2.17.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.26,3.2; BCA2@f35ae1f0c8cf22ec379e0bf8b4f264a30c254df68181d25e3d4fe33ef46f20aa::BCA2-REQ-045; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F001`.

2.17.8 `state=OPEN-BLOCKING`.

2.17.9 `noMergeKey=B0-HR-F017-TWO-GENERATION-GENESIS-RECURSION`.

## 2.18 `B0-HR-F018` — Negative corpus and safe terminals are not total

2.18.1 `severity=P0`.

2.18.2 `locator=SUBJECT:§2.27`.

2.18.3 `defect=the requirement claims coverage of every state/event pair but enumerates neither the state set, event set nor transition table; invalid vectors are limited to BLOCKED, REJECTED or EXPIRED and omit UNKNOWN, CONFLICT, REVOKED, SUPERSEDED, ABORTED, COLLISION, PARTIAL-EFFECT and COMMITTED-UNCONFIRMED`.

2.18.4 `impact=undefined transitions can fail open or be mapped differently by implementations, especially around concurrency, response loss, revocation and partial writes`.

2.18.5 `requiredDelta=define finite versioned State, Event, Reason and Terminal enums; publish the full transition matrix and invariants; give every terminal retry, cleanup, escalation, descendant-invalidation and authority semantics`.

2.18.6 `acceptancePredicate=cartesian state×event coverage=100%; undefined and multi-transition counts=0; every invalid/concurrent/partial-effect vector reaches one safe terminal with usableAuthority=0 unless COMMITTED-CONFIRMED`.

2.18.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.27; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F014`.

2.18.8 `state=OPEN-BLOCKING`.

2.18.9 `noMergeKey=B0-HR-F018-TOTAL-STATE-EVENT-TERMINALS`.

## 2.19 `B0-HR-F019` — Append-only evidence lacks fork, custody and disclosure controls

2.19.1 `severity=P1`.

2.19.2 `locator=SUBJECT:§§2.15,2.19–2.21`.

2.19.3 `defect=append-only records and two-reader reconstruction are required without defining the durable store, ordering key, append concurrency, fork detection, checkpoint/root publication, retention, redaction, private-evidence boundary or who may read/write each class`.

2.19.4 `impact=two valid-looking ledgers can omit different failures, reorder events or publish sensitive evidence; “append-only” becomes an assertion rather than a custody guarantee`.

2.19.5 `requiredDelta=define an EvidenceCustodyProfile with store identity, ordered sequence/CAS, parent hash, checkpoint, fork detector, access controls, classification, retention/legal hold and public-reference policy; preserve original findings immutably`.

2.19.6 `acceptancePredicate=concurrent append, omitted event, reordered event, fork, rollback, unauthorized read/write, redaction and retention-conflict mutants are detected; two readers derive identical ordered roots and disclosure dispositions`.

2.19.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.15,2.19–2.21; SOURCE-HR@a9c479e0b066b781f5d742c63439f94d31811e3949e1823dae6824e5b4a225fa::§§2–4; D18-A2@448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9::§4.4`.

2.19.8 `state=OPEN-BLOCKING`.

2.19.9 `noMergeKey=B0-HR-F019-EVIDENCE-LEDGER-CUSTODY-FORKS`.

## 2.20 `B0-HR-F020` — Trusted time is named but not verifiable

2.20.1 `severity=P1`.

2.20.2 `locator=SUBJECT:§§2.17–2.18,2.25`.

2.20.3 `defect=no trusted-time authority, receipt schema, clock identifier, format, maximum skew, monotonicity rule, rollback detection, outage behavior or bounded validity policy is defined; validity duration is deferred to Tal without a decision/request contract`.

2.20.4 `impact=actors can disagree at expiry boundaries, roll clocks backward, preserve stale authority or block forever because no admissible time evidence exists`.

2.20.5 `requiredDelta=define a TimeTrustProfile and external decision for maximum validity by artifact class; bind signed/source-rooted time receipts, skew and monotonic sequence; specify outage and boundary terminals`.

2.20.6 `acceptancePredicate=before/notBefore/at-expiry/after-expiry, skew, rollback, source-outage and conflicting-time vectors yield identical results in two validators; missing trusted time always blocks; no duration is invented`.

2.20.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.17–2.18,2.25; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F008`.

2.20.8 `state=OPEN-BLOCKING`.

2.20.9 `noMergeKey=B0-HR-F020-TRUSTED-TIME-PROFILE`.

## 2.21 `B0-HR-F021` — Partial planning writes have no atomicity or compensation contract

2.21.1 `severity=P1`.

2.21.2 `locator=SUBJECT:§§2.7,2.15,2.19,2.27`.

2.21.3 `defect=permitted planning Author/Freeze acts can write artifacts, but the model does not define staging, atomic publish, partial-write detection, cleanup, idempotent successor creation or a PARTIAL-EFFECT terminal`.

2.21.4 `impact=a crash or denied write can leave a truncated or mixed-generation public artifact that later readers may freeze, review or expose`.

2.21.5 `requiredDelta=bind each write to a staged artifact and expected destination state; publish atomically after digest verification; record partial effects, cleanup and successor-only recovery without overwriting evidence`.

2.21.6 `acceptancePredicate=crash-before-write, mid-write, post-write-pre-receipt, destination-conflict and cleanup-failure vectors never yield a frozen/current artifact; partial outputs are quarantined and have usableAuthority=0`.

2.21.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.7,2.15,2.19,2.27; MPSC-HR@da14357afaaaaf08fb5b1044a320aee985ebcf91ff9102ea4a99d8ebe495a768::MPSC-HR-F005`.

2.21.8 `state=OPEN-BLOCKING`.

2.21.9 `noMergeKey=B0-HR-F021-PARTIAL-PLANNING-WRITE`.

## 2.22 `B0-HR-F022` — Requirement closure has no machine-bound denominator

2.22.1 `severity=P1`.

2.22.2 `locator=SUBJECT:§§2.1,3.1–3.2`.

2.22.3 `defect=B0REQ-000 requests forward/inverse coverage, but no successor crosswalk schema requires one immutable row per B0REQ with implementedBy IDs, test IDs, evidence IDs, disposition and noMerge identity; prose count 27 can therefore survive semantic omission`.

2.22.4 `impact=a B0 Definition can claim 100% while implementing only labels or combining independent obligations, and new review findings can be left outside the acceptance denominator`.

2.22.5 `requiredDelta=define a rooted RequirementClosureManifest covering B0REQ-000–026 and every hostile-review finding one-to-one; bind implementation, tests, evidence, disposition, reviewer and successor root; prohibit merge or N/A without authority`.

2.22.6 `acceptancePredicate=27/27 requirements and 22/22 review findings appear exactly once; forward/inverse coverage=100%; missing, merged, duplicate, unknown, untested and evidence-free rows=0; denominator changes invalidate acceptance`.

2.22.7 `sourceBasis=SUBJECT@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§§2.1,3.1–3.2; BCA2@f35ae1f0c8cf22ec379e0bf8b4f264a30c254df68181d25e3d4fe33ef46f20aa::BCA2-REQ-051`.

2.22.8 `state=OPEN-BLOCKING`.

2.22.9 `noMergeKey=B0-HR-F022-REQUIREMENT-CLOSURE-DENOMINATOR`.

# 3. Frozen counts and acceptance boundary

3.1.1 `findingCount=22`.

3.1.2 `severityCounts=P0:14; P1:8; P2:0; P3:0`.

3.1.3 `stateCounts=OPEN-BLOCKING:22`.

3.1.4 Similar themes are intentionally not merged: source resolvability differs from source authority; Genesis authority differs from review authority; Permit consumption differs from revocation fencing; cryptographic identity differs from public hash leakage; CAS uncertainty differs from readback independence and observation reduction.

3.1.5 This manifest is the frozen independent finding set. Producer QA was not read before this freeze and cannot remove, merge, downgrade or renumber these findings.

3.1.6 The reviewed Subject remains a useful requirement sketch but is rejected as an acceptance baseline. It creates no B0 instance or authority.
