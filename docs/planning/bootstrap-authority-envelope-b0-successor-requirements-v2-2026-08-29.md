# 1. Connect — Bootstrap Authority Envelope B0 successor requirements v2

## 1.1 Identity, scope and status

1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-SUCCESSOR-REQUIREMENTS-V2-2026-08-29-G0`.

1.1.2 `artifactClass=BOOTSTRAP-AUTHORITY-REQUIREMENT-SUCCESSOR-CANDIDATE; NOT-B0-DEFINITION; NOT-B0-INSTANCE; NOT-AUTHORITY; NOT-ACCEPTED`.

1.1.3 This immutable successor preserves all 27 predecessor Requirements and addresses all 22 hostile-review Findings as distinct open obligations. Presence here is not closure.

1.1.4 This artifact defines planning requirements only. It authorizes no Product code, Build, Runtime test, Git mutation, Commit, Push, GitHub setting, provider operation, credential operation, purchase or deployment.

1.1.5 Repository visibility is bindingly `PUBLIC`. Neither B0 nor this successor may authorize `PRIVATE`, publish a Secret/PII/private Evidence value, or weaken Public-repository controls.

1.1.6 `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`.

## 1.2 Frozen source-reference index

1.2.1 `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb` resolves only to `/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-requirements-candidate-2026-08-29.md`; claim limit=predecessor Requirement wording, dependency graph and acceptance constraints; authority credit=zero.

1.2.2 `B0HR@56631b6c02b57f21adc363245754fedf44fc4d35baf733cfb362bbcd01ae7e3b` resolves only to `/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-requirements-independent-hostile-review-2026-08-29.md`; claim limit=independent review method, counts and verdict; authority credit=zero.

1.2.3 `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355` resolves only to `/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-requirements-independent-hostile-review-findings-manifest-2026-08-29.md`; claim limit=frozen Finding records `B0-HR-F001`–`B0-HR-F022`; authority credit=zero.

1.2.4 A `sourceBasis` member is valid only as `alias@fullSha256::exactLocator`, where alias and digest match exactly one row in §1.2. Unknown alias, wrong digest, range-only locator, missing locator, changed bytes or incompatible claim use is `BLOCKED`.

1.2.5 The three documents above are provenance and review evidence, not Tal authority. No Authority edge may originate from them.

## 1.3 Requirement-row contract

1.3.1 Requirement IDs are exactly `B0V2REQ-000`–`B0V2REQ-048`.

1.3.2 Every Requirement contains exactly these five fields: `statement`, `threatCauseImpact`, `requiredProof`, `dependencies`, `sourceBasis`.

1.3.3 Every `statement` contains exactly one `output=B0V2OUT-nnn`; Output IDs are unique and total.

1.3.4 Every predecessor-preservation row contains exactly one `preserves=B0REQ-nnn`; every hostile-remediation row contains exactly one `addresses=B0-HR-Fnnn`.

1.3.5 Dependencies are ordered backward only. Missing, self, duplicate, forward or cyclic Dependency is `BLOCKED`.

1.3.6 Every `requiredProof` binds one exact `negativeVectorSet=B0V2-NVS-nnn`; absent, duplicate or unregistered vector set is `BLOCKED`.

1.3.7 `ADDRESSED-IN-CANDIDATE` means only that a candidate delta exists. It never means `CLOSED`, `ACCEPTED`, `AUTHORIZED` or `CURRENT`.

## 1.4 Normative security universes

1.4.1 `AuthorityState={DRAFT,STAGED,SEALED,AUTHENTICATION-PENDING,AUTHENTICATED,REVIEW-PENDING,REVIEWED,RESERVED,EFFECT-STAGED,COMMIT-PENDING,COMMITTED-UNCONFIRMED,COMMITTED-CONFIRMED,BLOCKED,REJECTED,EXPIRED,REVOKED,SUPERSEDED,CONFLICT,ABORTED,COLLISION,PARTIAL-EFFECT-QUARANTINED}`.

1.4.2 `AuthorityEvent={CREATE,SEAL,AUTHENTICATE,REVIEW,RESERVE,START-EFFECT,STAGE-EFFECT,COMMIT,RESPONSE-LOSS,READBACK-MATCH,READBACK-MISMATCH,EXPIRE,REVOKE,SUPERSEDE,CANCEL,COLLISION-DETECTED,PARTIAL-EFFECT-DETECTED,RECOVER,STORE-CONFLICT,TIME-UNKNOWN,KEY-COMPROMISED}`.

1.4.3 `SafeTerminal={COMMITTED-CONFIRMED,COMMITTED-UNCONFIRMED,NOT-COMMITTED,BLOCKED,REJECTED,EXPIRED,REVOKED,SUPERSEDED,CONFLICT,ABORTED,COLLISION,PARTIAL-EFFECT-QUARANTINED}`.

1.4.4 Only `COMMITTED-CONFIRMED` may have `usableAuthority=1`, and only for an operational B0 Instance whose complete Acceptance envelope remains current. Every other terminal has `usableAuthority=0`.

1.4.5 Conformance and shadow generations always have `usableAuthority=0`, including after successful tests.

1.4.6 Every state/event pair must resolve to exactly one explicit transition row. No implicit success, guessed success, default retry or terminal overwrite is allowed.

# 2. Preserved predecessor Requirements

## 2.1 `B0V2REQ-000` — Root requirement closure

2.1.1 `statement`: `preserves=B0REQ-000; output=B0V2OUT-000`; produce one immutable B0 v2 RequirementSetRoot containing exactly `B0V2REQ-000`–`B0V2REQ-048`, their five-field rows, SourceReferenceIndex root, Output registry root, preservation/finding crosswalk root and NegativeVectorRegistry root.

2.1.2 `threatCauseImpact`: A partial denominator can omit an original authority boundary or a hostile Finding while still claiming completeness, enabling self-authorization.

2.1.3 `requiredProof`: two independent parsers prove IDs=49, fields=245, Outputs=49 unique, predecessor rows=27, Finding rows=22, forward/inverse coverage=100%, unknown/duplicate/missing=0; any Member/root delta invalidates every descendant; `negativeVectorSet=B0V2-NVS-000`.

2.1.4 `dependencies`: none.

2.1.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.1`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F022`.

## 2.2 `B0V2REQ-001` — External authority owner

2.2.1 `statement`: `preserves=B0REQ-001; output=B0V2OUT-001`; define an AuthorityOwnerPolicy in which Tal is the only authority owner, while identity authentication, root approval and authority proof originate outside the B0 Subject, Definition, Instance, Producer and review chain.

2.2.2 `threatCauseImpact`: A label saying “Tal” without an external trust anchor permits forged, replayed or producer-inferred authority.

2.2.3 `requiredProof`: an external authenticated receipt binds Tal identity, exact subject/evidence/claim-limit roots, purpose, challenge, authority epoch, issuedAt, notBefore, validThrough and supersession; removal of that receipt makes every Authority edge fail; `negativeVectorSet=B0V2-NVS-001`.

2.2.4 `dependencies`: `B0V2REQ-000`.

2.2.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.2`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F003`.

## 2.3 `B0V2REQ-002` — Detached Subject and envelopes

2.3.1 `statement`: `preserves=B0REQ-002; output=B0V2OUT-002`; define a DetachmentGraph where CanonicalMandate Subject, B0 Definition Subject, B0 Instance envelope, Review packet, Acceptance envelope, Act records, Evidence records and current pointer are distinct immutable Roots with no membership or authority back-edge.

2.3.2 `threatCauseImpact`: Subject/envelope membership or authority cycles allow an object to approve, hash or mutate itself.

2.3.3 `requiredProof`: two graph readers agree on nodes and edges; self-membership=0, self-authority=0, cycles=0; current pointer is never a Member of its target; successor bytes never overwrite predecessor bytes; `negativeVectorSet=B0V2-NVS-002`.

2.3.4 `dependencies`: `B0V2REQ-000`; `B0V2REQ-001`.

2.3.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.3`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F004`.

## 2.4 `B0V2REQ-003` — Canonical mandate exact receipt

2.4.1 `statement`: `preserves=B0REQ-003; output=B0V2OUT-003`; produce a CanonicalMandatePackage containing exact UTF-8 bytes, language, digest, claim-limit manifest, allowed scope, exclusions, precedence, supersession relation and a detached Tal-authenticated exact-root receipt.

2.4.2 `threatCauseImpact`: Free-form summaries, unavailable transcript identity or blanket consent can silently expand authority.

2.4.3 `requiredProof`: Tal receives the exact canonical bytes and claim-limit root; receipt purpose is `APPROVE-CANONICAL-B0-MANDATE`; changed byte/root/purpose or absent raw transcript ID yields `BLOCKED`, never an invented transcript; `negativeVectorSet=B0V2-NVS-003`.

2.4.4 `dependencies`: `B0V2REQ-001`; `B0V2REQ-002`.

2.4.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.4`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F002`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F003`.

## 2.5 `B0V2REQ-004` — Directive precedence and amendments

2.5.1 `statement`: `preserves=B0REQ-004; output=B0V2OUT-004`; produce one DirectivePrecedenceSnapshot that binds the exact CanonicalMandate receipt, all applicable amendments, the active development freeze and `repositoryVisibility=PUBLIC`, while classifying navigation ledgers as non-authoritative.

2.5.2 `threatCauseImpact`: An unrooted “continue” or stale Private statement can be misread as permission for implementation, external mutation or visibility regression.

2.5.3 `requiredProof`: deterministic conflict traversal yields planning-only authority, Product/external effects denied and Public invariant fixed; missing/ambiguous/conflicting amendment yields `BLOCKED`; `negativeVectorSet=B0V2-NVS-004`.

2.5.4 `dependencies`: `B0V2REQ-003`.

2.5.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.5`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F002`.

## 2.6 `B0V2REQ-005` — Closed Subject-class registry

2.6.1 `statement`: `preserves=B0REQ-005; output=B0V2OUT-005`; define a closed SubjectClassRegistry containing only `CONTROL-SEQUENCE-SUCCESSOR`, `RECOVERY-BASELINE`, `REVIEW-INPUT-FREEZE`, `RAW-REVIEW-CUSTODY`, `BOOTSTRAP-LIFECYCLE-SUCCESSOR` and `REVIEW-PROTOCOL-SUCCESSOR` for operational B0 permits; genesis objects are governed separately and cannot inherit this registry.

2.6.2 `threatCauseImpact`: Wildcards, prefixes or mixing genesis and operational classes can expand B0 into Product, provider or self-creation authority.

2.6.3 `requiredProof`: enum is non-empty and closed; wildcard/prefix/free-text/unknown/same-label-different-schema inputs fail; every operational Permit resolves to exactly one exact class; `negativeVectorSet=B0V2-NVS-005`.

2.6.4 `dependencies`: `B0V2REQ-004`.

2.6.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.6`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F006`.

## 2.7 `B0V2REQ-006` — Closed Act-type registry

2.7.1 `statement`: `preserves=B0REQ-006; output=B0V2OUT-006`; define a closed ActClassRegistry for `AUTHOR`, `FREEZE`, `READ-ONLY-PARSE`, `PRODUCER-QA`, `INDEPENDENT-REVIEW`, `COMPARE`, `RECONCILE`, `EXACT-ROOT-APPROVAL-OBSERVE`, `CAS` and `READBACK`, each with one effect class and no hidden capability.

2.7.2 `threatCauseImpact`: A safe label can conceal a filesystem, network, Git, provider or disclosure effect.

2.7.3 `requiredProof`: one rooted classifier maps each requested Act to exactly one enum and effect class; unclassified/multi-classified/extra-effect count=0; denied capability reachability=0; `negativeVectorSet=B0V2-NVS-006`.

2.7.4 `dependencies`: `B0V2REQ-005`.

2.7.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.7`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F006`.

## 2.8 `B0V2REQ-007` — One-use exact-subject Permit schema

2.8.1 `statement`: `preserves=B0REQ-007; output=B0V2OUT-007`; define one BootstrapActPermit schema binding Permit ID, one Attempt ID, exact Subject/Input/Evidence/EffectScope roots, Act type, actor Appointment, environment, authority epoch, revocation head, expected Permit head, notBefore and validThrough.

2.8.2 `threatCauseImpact`: A reusable, broad or unfenced Permit enables replay, root substitution and concurrent duplicate effects.

2.8.3 `requiredProof`: wrong root/actor/environment/epoch/head, expiry, replay, duplicate attempt and broader scope fail before effect; one atomic terminal receipt exists per Attempt and cannot be overwritten; `negativeVectorSet=B0V2-NVS-007`.

2.8.4 `dependencies`: `B0V2REQ-002`; `B0V2REQ-005`; `B0V2REQ-006`.

2.8.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.8`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F007`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F008`.

## 2.9 `B0V2REQ-008` — Named authenticated Appointments

2.9.1 `statement`: `preserves=B0REQ-008; output=B0V2OUT-008`; define an AppointmentRegistrySchema for Producer, QA, Reviewer, Reconciler, Approver and AcceptanceWriter with authenticated issuer, actor identity proof, delegation chain, exact scope, priority, quorum group, epoch, validity and revocation.

2.9.2 `threatCauseImpact`: A role alias without issuer and identity binding cannot prove who acted or whether a backup was eligible.

2.9.3 `requiredProof`: every Act resolves at one fenced snapshot to exactly one selected eligible Appointment; missing/ambiguous/stale/revoked/issuer-mismatch/delegation-cycle fails; `negativeVectorSet=B0V2-NVS-008`.

2.9.4 `dependencies`: `B0V2REQ-001`; `B0V2REQ-007`.

2.9.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.9`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F009`.

## 2.10 `B0V2REQ-009` — Exact role-conflict matrix

2.10.1 `statement`: `preserves=B0REQ-009; output=B0V2OUT-009`; produce a RoleConflictMatrix that explicitly covers every pair and prohibited quorum overlap among Producer, QA, each Reviewer, Reconciler, Approver and AcceptanceWriter, including primary/backup activation and emergency replacement.

2.10.2 `threatCauseImpact`: Distinct role names without exact intersections and quorum semantics allow self-review, self-reconciliation or self-approval.

2.10.3 `requiredProof`: full role-pair denominator is non-empty; prohibited intersections=0 in every Acceptance; backup selection is unique and auditable; missing independent appointment blocks; `negativeVectorSet=B0V2-NVS-009`.

2.10.4 `dependencies`: `B0V2REQ-008`.

2.10.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.10`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F005`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F009`.

## 2.11 `B0V2REQ-010` — Deterministic object identity

2.11.1 `statement`: `preserves=B0REQ-010; output=B0V2OUT-010`; define an IdentityProfile in which every B0 object ID is a versioned domain-separated digest of canonical content; object identity is explicitly distinct from authenticated authority.

2.11.2 `threatCauseImpact`: Non-reproducible or cross-domain identity breaks parity, replay detection and collision handling; a digest alone can be mistaken for authority.

2.11.3 `requiredProof`: two implementations derive identical IDs; cross-domain and collision vectors cannot alias; collision reaches `COLLISION` without retry or authority; `Math.random` and `crypto.randomUUID` usage=0; `negativeVectorSet=B0V2-NVS-010`.

2.11.4 `dependencies`: `B0V2REQ-002`; `B0V2REQ-007`.

2.11.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.11`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F010`.

## 2.12 `B0V2REQ-011` — Canonical serialization

2.12.1 `statement`: `preserves=B0REQ-011; output=B0V2OUT-011`; define one versioned SerializationProfile with literal domain-separator bytes, UTF-8, Unicode normalization, schema/version framing, field order, collection order, integer/time encoding and explicit null/absence representation.

2.12.2 `threatCauseImpact`: Multiple legal serializations or omitted framing permit semantic collisions and root mismatch.

2.12.3 `requiredProof`: two independent serializers produce byte-identical normative vectors; alternate pipeline count=0; confusable, null, order, missing-field, schema and version mutants fail; `negativeVectorSet=B0V2-NVS-011`.

2.12.4 `dependencies`: `B0V2REQ-010`.

2.12.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.12`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F010`.

## 2.13 `B0V2REQ-012` — Complete exact input freeze

2.13.1 `statement`: `preserves=B0REQ-012; output=B0V2OUT-012`; define a typed B0InputRootManifest containing the complete transitive security-root closure, authoritative heads, store identities, claim scopes and invalidation edges required by the B0 Definition and Instance.

2.13.2 `threatCauseImpact`: Omitted verifier, key, clock, revocation, serialization, Permit, classification or store roots allow security semantics to change under an unchanged freeze.

2.13.3 `requiredProof`: two independent traversals derive the same non-empty closure; missing/dangling/alias/range/claim mismatch=0; mutation of any Member invalidates Instance, Permit, Review and Acceptance descendants; `negativeVectorSet=B0V2-NVS-012`.

2.13.4 `dependencies`: `B0V2REQ-003`; `B0V2REQ-008`; `B0V2REQ-011`.

2.13.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.13`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F012`.

## 2.14 `B0V2REQ-013` — Detached bootstrap review protocol

2.14.1 `statement`: `preserves=B0REQ-013; output=B0V2OUT-013`; define a detached immutable BootstrapReviewProtocolDefinition admitted by prior external GenesisAuthority, with exact non-empty reviewer denominator, independence predicate, packet seal, Finding schema, severity/veto rules, reconciliation limits and successor-only correction.

2.14.2 `threatCauseImpact`: A protocol created or changed by its Subject reproduces the review-authority cycle.

2.14.3 `requiredProof`: authorization DAG is acyclic; protocol admission consumes only an earlier external Genesis receipt; protocol mutation invalidates dependent Reviews; no Subject/Producer can amend review rules; `negativeVectorSet=B0V2-NVS-013`.

2.14.4 `dependencies`: `B0V2REQ-002`; `B0V2REQ-009`; `B0V2REQ-012`.

2.14.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.14`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F005`.

## 2.15 `B0V2REQ-014` — Public repository safety invariant

2.15.1 `statement`: `preserves=B0REQ-014; output=B0V2OUT-014`; define a PublicDisclosurePolicy that classifies every field and permits public raw digests only for approved public bytes, while private/restricted Evidence remains outside the repository and exposes only disclosure-approved opaque references.

2.15.2 `threatCauseImpact`: Raw content or low-entropy digests can disclose, confirm or correlate Secrets, PII, customer data and private approval text in a Public repository.

2.15.3 `requiredProof`: classification and egress disposition exist before every write; prohibited plaintext/metadata/commitment count=0; missing classification blocks; `repositoryVisibility` remains exactly `PUBLIC`; `negativeVectorSet=B0V2-NVS-014`.

2.15.4 `dependencies`: `B0V2REQ-004`; `B0V2REQ-006`; `B0V2REQ-012`.

2.15.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.15`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F011`.

## 2.16 `B0V2REQ-015` — Denied Product and external capabilities

2.16.1 `statement`: `preserves=B0REQ-015; output=B0V2OUT-015`; define a closed DeniedCapabilityRegistry containing Product code, Build, Runtime test, Git mutation, Commit, Push, GitHub settings, visibility change, provider, credential, purchase, deployment, external message and unapproved network effect.

2.16.2 `threatCauseImpact`: A bootstrap or planning label can conceal implementation or external-state mutation and bypass the active freeze.

2.16.3 `requiredProof`: effect graph reachable from any B0 object contains zero denied capability; every simulated denied request terminates `BLOCKED` before side effect; no allowlist may override this registry; `negativeVectorSet=B0V2-NVS-015`.

2.16.4 `dependencies`: `B0V2REQ-005`; `B0V2REQ-006`; `B0V2REQ-014`.

2.16.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.16`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F006`.

## 2.17 `B0V2REQ-016` — Trusted time and bounded validity

2.17.1 `statement`: `preserves=B0REQ-016; output=B0V2OUT-016`; define a TimeTrustProfile binding approved external time source identity, signed or source-rooted receipt, canonical format, monotonic sequence, maximum skew, rollback rule, outage behavior and per-artifact `notBefore`/`validThrough` policy.

2.17.2 `threatCauseImpact`: Untrusted, rolled-back or unbounded time preserves stale authority or creates contradictory expiry decisions.

2.17.3 `requiredProof`: two validators agree before/notBefore/at-expiry/after-expiry, skew, rollback, outage and conflicting-source cases; local clock alone grants nothing; undecided duration remains `BLOCKED`; `negativeVectorSet=B0V2-NVS-016`.

2.17.4 `dependencies`: `B0V2REQ-001`; `B0V2REQ-007`; `B0V2REQ-008`.

2.17.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.17`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F020`.

## 2.18 `B0V2REQ-017` — Revocation and supersession

2.18.1 `statement`: `preserves=B0REQ-017; output=B0V2OUT-017`; define a RevocationPolicy in which an authenticated Tal revocation or supersession binds exact Root, authority epoch, revocation-head version, effective time, reason and descendant invalidation set while retaining immutable history.

2.18.2 `threatCauseImpact`: A stale grant can remain usable after a mandate, appointment, key, Permit or B0 is revoked.

2.18.3 `requiredProof`: revoke-wins fencing is checked at reservation, effect start and commit; stale grant authority=0; descendant current pointers clear through fenced CAS; historical records are not overwritten; `negativeVectorSet=B0V2-NVS-017`.

2.18.4 `dependencies`: `B0V2REQ-004`; `B0V2REQ-016`.

2.18.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.18`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F008`.

## 2.19 `B0V2REQ-018` — Append-only event evidence

2.19.1 `statement`: `preserves=B0REQ-018; output=B0V2OUT-018`; define one EvidenceEventSchema for Request, Permit, Attempt, reservation, staged effect, Result, Failure, Review, approval observation, CAS and Readback, each with exact roots, parent sequence, store revision and classification.

2.19.2 `threatCauseImpact`: Overwrite, reorder or fork can hide a failure, fabricate lineage or publish restricted Evidence.

2.19.3 `requiredProof`: append uses expected head and parent hash; overwrite/omission/reorder/fork/rollback/unauthorized access is detected; two readers reconstruct the same ordered event root; `negativeVectorSet=B0V2-NVS-018`.

2.19.4 `dependencies`: `B0V2REQ-007`; `B0V2REQ-011`; `B0V2REQ-012`.

2.19.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.19`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F019`.

## 2.20 `B0V2REQ-019` — Detached review packet

2.20.1 `statement`: `preserves=B0REQ-019; output=B0V2OUT-019`; define a detached ReviewPacketSchema binding exact Subject, Inputs, Evidence, Instructions, protocol, Tool lineage, Actor appointments, packet seal and pre-disclosure order.

2.20.2 `threatCauseImpact`: Reviews of different bytes, inputs or instructions cannot be compared and can create false closure.

2.20.3 `requiredProof`: packet-root parity=100%; independent review findings are sealed before disclosure; Subject mutation creates a successor and invalidates all packets and Reviews; `negativeVectorSet=B0V2-NVS-019`.

2.20.4 `dependencies`: `B0V2REQ-009`; `B0V2REQ-013`; `B0V2REQ-018`.

2.20.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.20`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F005`.

## 2.21 `B0V2REQ-020` — Lossless Findings and reconciliation

2.21.1 `statement`: `preserves=B0REQ-020; output=B0V2OUT-020`; define a FindingCustodyPolicy preserving every reviewer-local Finding with authorship, immutable identity, noMergeKey, severity, predicate and original state; Comparison and Resolution may only add links.

2.21.2 `threatCauseImpact`: Merge, downgrade, deletion or predicate replacement can conceal an authority blocker.

2.21.3 `requiredProof`: local forward/inverse coverage=100%; unexplained merge/downgrade/deletion/predicate loss=0; P0/P1 open blocks; successor evidence never changes original Finding bytes; `negativeVectorSet=B0V2-NVS-020`.

2.21.4 `dependencies`: `B0V2REQ-019`.

2.21.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.21`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F022`.

## 2.22 `B0V2REQ-021` — Complete Acceptance envelope

2.22.1 `statement`: `preserves=B0REQ-021; output=B0V2OUT-021`; define an AcceptanceEnvelopeSchema with mandatory exact roots for Subject, B0 Definition/version, CanonicalMandate, all Inputs, serialization, cryptography, trust/key/time profiles, protocol, appointments, Producer QA, Reviews, Comparison, Reconciliation, Vetoes, Tal approval denominator and receipts, Permit/consumption, classification, revocation/current heads, pointer/store identity, authority epoch and expected head.

2.22.2 `threatCauseImpact`: Any omitted field permits acceptance under the wrong mandate, verifier, key, protocol, Permit, revocation state or store.

2.22.3 `requiredProof`: schema denominator is explicit and non-empty; catch-all fields prohibited; missing/wrong/stale/revoked mutant fails; two validators emit byte-identical eligibility and reason sets; `negativeVectorSet=B0V2-NVS-021`.

2.22.4 `dependencies`: `B0V2REQ-001`; `B0V2REQ-012`; `B0V2REQ-016`; `B0V2REQ-020`.

2.22.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.22`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F013`.

## 2.23 `B0V2REQ-022` — Fenced one-use Acceptance CAS

2.23.1 `statement`: `preserves=B0REQ-022; output=B0V2OUT-022`; define an AcceptanceCASPolicy binding one Attempt, expected pointer/version, expected Permit head, expected revocation head, authority epoch, fencing token, complete Envelope digest and atomic terminal record.

2.23.2 `threatCauseImpact`: Replay, ABA, stale authority, partial write or response loss can create an ambiguous current Root.

2.23.3 `requiredProof`: replay/ABA/wrong head/epoch/fence/partial commit fails; exactly one immutable terminal per Attempt; response loss may yield `COMMITTED-UNCONFIRMED`, never assumed absence; `negativeVectorSet=B0V2-NVS-022`.

2.23.4 `dependencies`: `B0V2REQ-010`; `B0V2REQ-018`; `B0V2REQ-021`.

2.23.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.23`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F007`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F014`.

## 2.24 `B0V2REQ-023` — Independent readbacks and reconciliation

2.24.1 `statement`: `preserves=B0REQ-023; output=B0V2OUT-023`; define a ReadbackReconciliationPolicy with Readback A from the authoritative linearizable pointer store and Readback B from a separately credentialed, separately implemented integrity journal/checkpoint, both binding one store revision, Attempt tuple and freshness proof.

2.24.2 `threatCauseImpact`: Two calls to one stale cache or mixed revisions can falsely confirm or deny authority.

2.24.3 `requiredProof`: same-cache/query/credential, stale replica/token, mixed revision, timeout, mismatch and outage do not count as two confirmations; ambiguity freezes dependent Acts in `COMMITTED-UNCONFIRMED`; reconciliation is monotonic; `negativeVectorSet=B0V2-NVS-023`.

2.24.4 `dependencies`: `B0V2REQ-022`.

2.24.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.24`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F014`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F015`.

## 2.25 `B0V2REQ-024` — Non-authoritative observations and reducer

2.25.1 `statement`: `preserves=B0REQ-024; output=B0V2OUT-024`; define a CurrentAuthorityReducerSpec that treats observations as evidence only and derives current state from one fenced cut of pointer, store revision, authority epoch, revocation head, key status and trusted time.

2.25.2 `threatCauseImpact`: A stale or malicious observation can otherwise assert Current after revocation or expiry.

2.25.3 `requiredProof`: observation alone never grants authority; conflicting/stale/missing evidence reduces identically to `BLOCKED` or `COMMITTED-UNCONFIRMED`; Subject bytes remain unchanged across status transitions; `negativeVectorSet=B0V2-NVS-024`.

2.25.4 `dependencies`: `B0V2REQ-016`; `B0V2REQ-017`; `B0V2REQ-018`.

2.25.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.25`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F016`.

## 2.26 `B0V2REQ-025` — Two-generation conformance

2.26.1 `statement`: `preserves=B0REQ-025; output=B0V2OUT-025`; define a ConformanceGenerationProtocol with externally authorized G1 and G2 shadow objects that exercise source, mandate, role, key, time and revocation deltas while always carrying `usableAuthority=0`.

2.26.2 `threatCauseImpact`: Operational generations that must already be accepted to prove their own acceptance create recursion.

2.26.3 `requiredProof`: G1/G2 are created only by external Genesis receipts, cannot issue Permits or become current, and prove invalidation/replay behavior; only a later independently accepted Definition may support an operational Instance; `negativeVectorSet=B0V2-NVS-025`.

2.26.4 `dependencies`: `B0V2REQ-017`; `B0V2REQ-020`; `B0V2REQ-023`; `B0V2REQ-024`.

2.26.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.26`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F017`.

## 2.27 `B0V2REQ-026` — Total negative corpus and safe terminals

2.27.1 `statement`: `preserves=B0REQ-026; output=B0V2OUT-026`; define a StateEventTerminalMatrixSpec over the finite universes in §1.4, with exactly one transition and one reason for every state/event pair, explicit retry/cleanup/escalation/invalidation semantics and no implicit success.

2.27.2 `threatCauseImpact`: Undefined concurrency, collision, response-loss and partial-effect transitions can fail open or diverge across implementations.

2.27.3 `requiredProof`: cartesian coverage=100%; undefined/multiple transition=0; every invalid vector terminates safely with `usableAuthority=0`; only `COMMITTED-CONFIRMED` may grant; `negativeVectorSet=B0V2-NVS-026`.

2.27.4 `dependencies`: `B0V2REQ-005`; `B0V2REQ-007`; `B0V2REQ-014`; `B0V2REQ-015`; `B0V2REQ-016`; `B0V2REQ-017`; `B0V2REQ-021`; `B0V2REQ-023`; `B0V2REQ-025`.

2.27.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§2.27`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F018`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F021`.

# 3. One-to-one hostile-Finding remediation Requirements

## 3.1 `B0V2REQ-027` — Exact-root SourceReferenceIndex

3.1.1 `statement`: `addresses=B0-HR-F001; output=B0V2OUT-027`; produce a detached SourceReferenceIndex whose every entry binds alias, absolute path, full SHA-256, physical identity, exact locator grammar, claim limit, authority-credit flag and supersession relation.

3.1.2 `threatCauseImpact`: Ambiguous semantic aliases and generation-free references allow source substitution and irreproducible closure claims.

3.1.3 `requiredProof`: 49/49 sourceBasis rows resolve through two independent readers to the same immutable path, digest and exact locator; unresolved/ambiguous/wrong-generation/range-only/claim-mismatch accepted=0; `negativeVectorSet=B0V2-NVS-027`.

3.1.4 `dependencies`: `B0V2REQ-000`; `B0V2REQ-012`.

3.1.5 `sourceBasis`: `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb::§3.1.4`; `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F001`.

## 3.2 `B0V2REQ-028` — Navigation evidence is never authority

3.2.1 `statement`: `addresses=B0-HR-F002; output=B0V2OUT-028`; produce an AuthorityEvidenceSeparationPolicy with disjoint `NAVIGATION`, `PROVENANCE`, `REVIEW-EVIDENCE` and `EXTERNAL-AUTHORITY` edge types; only an authenticated external Tal receipt may originate an Authority edge.

3.2.2 `threatCauseImpact`: Producer-normalized notes or draft ledgers can otherwise be promoted into binding authority.

3.2.3 `requiredProof`: provenance graph has zero Authority edges from B0V1, B0HR or B0HRM; unavailable transcript remains `unknown/unavailable`; every binding claim resolves to one external receipt or blocks; `negativeVectorSet=B0V2-NVS-028`.

3.2.4 `dependencies`: `B0V2REQ-001`; `B0V2REQ-003`; `B0V2REQ-027`.

3.2.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F002`.

## 3.3 `B0V2REQ-029` — External Tal trust and authentication lifecycle

3.3.1 `statement`: `addresses=B0-HR-F003; output=B0V2OUT-029`; produce an AuthorityTrustProfile external to B0 that binds Tal identity, approved authentication channel, verifier identities, challenge-response purpose, approved signature profile, key IDs, trust roots, epoch, expiry, rotation, compromise, recovery and supersession without publishing private key material.

3.3.2 `threatCauseImpact`: A forged channel, stale key, replayed receipt or compromised verifier can seize the bootstrap chain.

3.3.3 `requiredProof`: forged-channel/wrong-identity/wrong-purpose/wrong-root/replay/expired/rotated/compromised/unknown-key and unknown-algorithm vectors fail closed; two independent verifiers emit identical identity and reason sets; `negativeVectorSet=B0V2-NVS-029`.

3.3.4 `dependencies`: `B0V2REQ-001`; `B0V2REQ-010`; `B0V2REQ-011`; `B0V2REQ-016`; `B0V2REQ-027`; `B0V2REQ-028`.

3.3.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F003`.

## 3.4 `B0V2REQ-030` — Acyclic external GenesisAuthority

3.4.1 `statement`: `addresses=B0-HR-F004; output=B0V2OUT-030`; produce a GenesisAuthorityDefinition rooted directly in one Tal-authenticated receipt and limited to creating the CanonicalMandate package, B0 Definition candidate, B0 Instance candidate, BootstrapReviewProtocol, sealed review artifacts, zero-authority conformance objects and detached acceptance artifacts.

3.4.2 `threatCauseImpact`: If B0 creates its own trust anchor, Definition, Instance or review rules, genesis is circular; if no path exists, genesis is undefined.

3.4.3 `requiredProof`: levels are strictly `L0 external trust`, `L1 mandate/genesis receipt`, `L2 Definition candidate+review protocol`, `L3 reviews+reconciliation`, `L4 Definition acceptance`, `L5 operational Instance`, `L6 Permit`; backward/self edges=0; removing the L1 receipt blocks all descendants; `negativeVectorSet=B0V2-NVS-030`.

3.4.4 `dependencies`: `B0V2REQ-002`; `B0V2REQ-003`; `B0V2REQ-005`; `B0V2REQ-006`; `B0V2REQ-009`; `B0V2REQ-013`; `B0V2REQ-015`; `B0V2REQ-027`; `B0V2REQ-028`; `B0V2REQ-029`.

3.4.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F004`.

## 3.5 `B0V2REQ-031` — Independently bootstrapped review authority

3.5.1 `statement`: `addresses=B0-HR-F005; output=B0V2OUT-031`; produce a BootstrapReviewAuthorityDefinition admitted only at Genesis level, binding exactly two independent hostile Review slots, one Producer QA slot, one Reconciler and one AcceptanceWriter, with presealed packets, P0/P1 veto, immutable findings and successor-only remediation.

3.5.2 `threatCauseImpact`: Producer-selected rules, zero reviewers or role overlap can make the Subject validate its own authority.

3.5.3 `requiredProof`: exact denominator is non-empty and immutable; Producer, either Reviewer, Reconciler and AcceptanceWriter are pairwise checked by the RoleConflictMatrix; protocol/root mutation invalidates all Reviews; `negativeVectorSet=B0V2-NVS-031`.

3.5.4 `dependencies`: `B0V2REQ-009`; `B0V2REQ-013`; `B0V2REQ-019`; `B0V2REQ-020`; `B0V2REQ-027`; `B0V2REQ-029`; `B0V2REQ-030`.

3.5.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F005`.

## 3.6 `B0V2REQ-032` — Exact finite EffectScopeManifest

3.6.1 `statement`: `addresses=B0-HR-F006; output=B0V2OUT-032`; produce an EffectScopeManifest binding exact input and proposed output roots, allowed absolute workspace path set, operation enum, schema root, side-effect class, target environment, public-egress disposition, byte/occurrence budget, classifier version and denied capabilities.

3.6.2 `threatCauseImpact`: Same-class substitution, extra output, hidden network or shell effect can bypass label-only allowlists.

3.6.3 `requiredProof`: wrong path, extra output, alternate schema, hidden network, shell/Git/provider, over-budget, public-egress and same-class-substitution vectors all block before effect; finite allowed effect set is reconstructible; `negativeVectorSet=B0V2-NVS-032`.

3.6.4 `dependencies`: `B0V2REQ-005`; `B0V2REQ-006`; `B0V2REQ-007`; `B0V2REQ-014`; `B0V2REQ-015`; `B0V2REQ-027`; `B0V2REQ-030`.

3.6.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F006`.

## 3.7 `B0V2REQ-033` — Atomic Permit reservation, effect and consumption

3.7.1 `statement`: `addresses=B0-HR-F007; output=B0V2OUT-033`; produce a PermitStateMachineDefinition with `UNCONSUMED→RESERVED→EFFECT-STAGED→COMMIT-PENDING→terminal`, expected Permit head, monotonically increasing fencing token, one Attempt ID, idempotency key, lease expiry, atomic consume+effect commit and recovery-only reconciliation.

3.7.2 `threatCauseImpact`: Concurrent actors or response-loss retries can perform more than one effect from one Permit.

3.7.3 `requiredProof`: parallel/delayed replay, duplicated actor, reused attempt, reservation expiry, response loss and lease takeover yield at most one committed effect; terminal XOR=1; same Attempt is never retried; `negativeVectorSet=B0V2-NVS-033`.

3.7.4 `dependencies`: `B0V2REQ-007`; `B0V2REQ-010`; `B0V2REQ-017`; `B0V2REQ-018`; `B0V2REQ-022`; `B0V2REQ-023`; `B0V2REQ-027`; `B0V2REQ-032`.

3.7.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F007`.

## 3.8 `B0V2REQ-034` — Revoke-wins in-flight fencing

3.8.1 `statement`: `addresses=B0-HR-F008; output=B0V2OUT-034`; produce a RevocationConcurrencyPolicy binding expected revocation head, authority epoch and fencing token at Permit reservation, effect start and final commit, with revoke-wins semantics, cancellation, quarantine, compensation eligibility and descendant-pointer clearing.

3.8.2 `threatCauseImpact`: A stale in-flight Permit can commit after revocation and create split authority.

3.8.3 `requiredProof`: revoke-before-reserve, during-effect, before-commit, after-commit and concurrent-CAS schedules each yield one specified terminal; no post-revocation effect becomes current; two reducers agree; `negativeVectorSet=B0V2-NVS-034`.

3.8.4 `dependencies`: `B0V2REQ-016`; `B0V2REQ-017`; `B0V2REQ-022`; `B0V2REQ-023`; `B0V2REQ-024`; `B0V2REQ-027`; `B0V2REQ-029`; `B0V2REQ-033`.

3.8.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F008`.

## 3.9 `B0V2REQ-035` — Appointment issuance, selection and conflict semantics

3.9.1 `statement`: `addresses=B0-HR-F009; output=B0V2OUT-035`; produce an AppointmentSelectionPolicy specifying authenticated issuer chain, credential binding, delegation depth, primary/backup priority, activation predicate, quorum, pairwise conflict matrix, emergency replacement, epoch and revoke-wins selection.

3.9.2 `threatCauseImpact`: Ambiguous or overlapping appointments can let one actor occupy nominally independent roles or keep a revoked backup active.

3.9.3 `requiredProof`: each Act resolves to one eligible Appointment at one snapshot; overlap/delegation-cycle/issuer-mismatch/revoked/ambiguous backup and insufficient-quorum vectors fail; activation is append-only audited; `negativeVectorSet=B0V2-NVS-035`.

3.9.4 `dependencies`: `B0V2REQ-008`; `B0V2REQ-009`; `B0V2REQ-016`; `B0V2REQ-017`; `B0V2REQ-027`; `B0V2REQ-029`; `B0V2REQ-030`; `B0V2REQ-031`.

3.9.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F009`.

## 3.10 `B0V2REQ-036` — Complete cryptographic and key lifecycle profile

3.10.1 `statement`: `addresses=B0-HR-F010; output=B0V2OUT-036`; produce a CryptoProfile with canonical-byte version, literal domain separators, `SHA-256` object digest, `Ed25519` detached authority signature, key ID and verifier context, algorithm whitelist/agility version, private-key non-public custody, key states `PENDING/ACTIVE/ROTATED/REVOKED/COMPROMISED`, rotation overlap rule, compromise cut-off and collision terminal.

3.10.2 `threatCauseImpact`: Unversioned algorithms, unsigned roots, unknown keys or stale/compromised keys can produce divergent identity or forged authority.

3.10.3 `requiredProof`: two implementations match normative bytes/digests/signatures; cross-domain/confusable/null/order/schema/version/unknown-algorithm/unknown-key/rotated-key/compromised-key vectors fail; collision terminates `COLLISION`; `negativeVectorSet=B0V2-NVS-036`.

3.10.4 `dependencies`: `B0V2REQ-010`; `B0V2REQ-011`; `B0V2REQ-014`; `B0V2REQ-016`; `B0V2REQ-017`; `B0V2REQ-018`; `B0V2REQ-027`; `B0V2REQ-029`.

3.10.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F010`.

## 3.11 `B0V2REQ-037` — Disclosure-safe Public commitments

3.11.1 `statement`: `addresses=B0-HR-F011; output=B0V2OUT-037`; produce a ClassificationCommitmentPolicy where `PUBLIC` bytes may expose raw SHA-256, while `INTERNAL/CONFIDENTIAL/RESTRICTED` bytes remain in private custody and may expose only an approved opaque reference or `HMAC-SHA-256` commitment whose key, input and verification service never enter the Public repository.

3.11.2 `threatCauseImpact`: A raw digest of low-entropy PII, token-shaped data or approval text creates an offline dictionary oracle.

3.11.3 `requiredProof`: low-entropy/PII/secret-shaped vectors emit no public raw digest or reversible metadata; missing/disputed classification blocks; two classifiers agree; keyed commitments use an ACTIVE private key and disclosure-approved purpose; `negativeVectorSet=B0V2-NVS-037`.

3.11.4 `dependencies`: `B0V2REQ-014`; `B0V2REQ-018`; `B0V2REQ-019`; `B0V2REQ-027`; `B0V2REQ-036`.

3.11.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F011`.

## 3.12 `B0V2REQ-038` — Complete security-root dependency closure

3.12.1 `statement`: `addresses=B0-HR-F012; output=B0V2OUT-038`; produce a SecurityRootClosureManifest that explicitly binds Definition/version, CanonicalMandate, serialization, digest/signature/commitment profiles, AuthorityTrustProfile/key set, TimeTrustProfile, revocation head, Permit schema/state-store head, EffectScope, Appointment/Conflict roots, ReviewAuthority/protocol, EvidenceCustody, classification/egress, Acceptance policy, pointer store identity and expected store heads.

3.12.2 `threatCauseImpact`: An omitted security head lets the verifier, key, time, revocation, disclosure or store semantics change without invalidation.

3.12.3 `requiredProof`: two traversals produce the same non-empty closure and claim scopes; mutation or omission of any enumerated Member invalidates Instance and descendants; unclassified catch-all input count=0; `negativeVectorSet=B0V2-NVS-038`.

3.12.4 `dependencies`: `B0V2REQ-012`; `B0V2REQ-016`; `B0V2REQ-017`; `B0V2REQ-018`; `B0V2REQ-021`; `B0V2REQ-022`; `B0V2REQ-027`; `B0V2REQ-029`; `B0V2REQ-031`; `B0V2REQ-032`; `B0V2REQ-033`; `B0V2REQ-034`; `B0V2REQ-035`; `B0V2REQ-036`; `B0V2REQ-037`.

3.12.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F012`.

## 3.13 `B0V2REQ-039` — Acceptance dependency and approval denominator

3.13.1 `statement`: `addresses=B0-HR-F013; output=B0V2OUT-039`; produce an AcceptanceClosureDenominator that enumerates every mandatory field of `B0V2OUT-021`, each dependency Root/head, every required approval role and exact receipt, freshness predicate, veto and one-to-one eligibility reason code.

3.13.2 `threatCauseImpact`: A field named “Inputs” or an implicit approval set can conceal a missing mandate, verifier, Permit, revocation state or veto.

3.13.3 `requiredProof`: forward/inverse traversal reaches every authority and policy dependency exactly once; missing/wrong/stale/revoked field or approval blocks; two validators return byte-identical booleans and ordered reasons; `negativeVectorSet=B0V2-NVS-039`.

3.13.4 `dependencies`: `B0V2REQ-021`; `B0V2REQ-027`; `B0V2REQ-030`; `B0V2REQ-031`; `B0V2REQ-033`; `B0V2REQ-034`; `B0V2REQ-035`; `B0V2REQ-036`; `B0V2REQ-037`; `B0V2REQ-038`.

3.13.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F013`.

## 3.14 `B0V2REQ-040` — CAS response-loss and split-brain safety

3.14.1 `statement`: `addresses=B0-HR-F014; output=B0V2OUT-040`; produce a CASUncertaintyPolicy with exact terminals `COMMITTED-CONFIRMED`, `NOT-COMMITTED`, `COMMITTED-UNCONFIRMED` and `CONFLICT`; response loss never proves absence and freezes all dependent authority until authoritative recovery.

3.14.2 `threatCauseImpact`: Assuming no grant after a lost response permits retry while another actor observes the committed grant.

3.14.3 `requiredProof`: commit-before-loss, no-commit loss, stale read, conflicting read and prolonged outage each yield one terminal; unknown grants zero usable authority and same Attempt cannot retry; reconciliation is monotonic; `negativeVectorSet=B0V2-NVS-040`.

3.14.4 `dependencies`: `B0V2REQ-022`; `B0V2REQ-023`; `B0V2REQ-027`; `B0V2REQ-033`; `B0V2REQ-034`; `B0V2REQ-039`.

3.14.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F014`.

## 3.15 `B0V2REQ-041` — Readback independence and one-revision proof

3.15.1 `statement`: `addresses=B0-HR-F015; output=B0V2OUT-041`; produce a ReadbackIndependenceProfile binding separate source paths, implementations, credentials and failure domains for Readback A/B, plus required consistency, store revision, maximum staleness, attempt tuple and freshness proof.

3.15.2 `threatCauseImpact`: Two matching stale reads from one cache can falsely confirm current authority.

3.15.3 `requiredProof`: same-cache/query/credential/failure-domain, stale replica/token and mixed-revision mutants are rejected; accepted pair binds one revision and tuple; outage or ambiguity returns `COMMITTED-UNCONFIRMED`; `negativeVectorSet=B0V2-NVS-041`.

3.15.4 `dependencies`: `B0V2REQ-023`; `B0V2REQ-027`; `B0V2REQ-036`; `B0V2REQ-038`; `B0V2REQ-040`.

3.15.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F015`.

## 3.16 `B0V2REQ-042` — Canonical non-authoritative observation reducer

3.16.1 `statement`: `addresses=B0-HR-F016; output=B0V2OUT-042`; produce an ObservationReducerDefinition whose only authoritative inputs are one fenced cut of pointer, revision, epoch, revocation head, key status and trusted time; observations are signed evidence with zero grant power.

3.16.2 `threatCauseImpact`: Conflicting, stale or malicious observations can otherwise present revoked authority as current.

3.16.3 `requiredProof`: observation-only, conflicting, stale and missing vectors reduce identically to a safe state; reducer reason ordering is deterministic; `UNKNOWN` is represented as `COMMITTED-UNCONFIRMED` or `BLOCKED`, never Current; `negativeVectorSet=B0V2-NVS-042`.

3.16.4 `dependencies`: `B0V2REQ-024`; `B0V2REQ-027`; `B0V2REQ-034`; `B0V2REQ-038`; `B0V2REQ-040`; `B0V2REQ-041`.

3.16.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F016`.

## 3.17 `B0V2REQ-043` — Zero-authority two-generation genesis

3.17.1 `statement`: `addresses=B0-HR-F017; output=B0V2OUT-043`; produce a StagedConformanceGenesisPlan where external GenesisAuthority creates G1 and G2 shadow Definition/Instance objects, exercises controlled deltas and acceptance mechanics, but structurally excludes Permit issuance, current-pointer eligibility and operational effects.

3.17.2 `threatCauseImpact`: Letting conformance objects use the mechanism they are proving creates recursive trust and accidental operational authority.

3.17.3 `requiredProof`: authorization graph is acyclic; G1/G2 have `usableAuthority=0` in all states; source/mandate/role/key/time/revocation delta invalidates G1; cross-generation replay fails; only later accepted operational Instance can issue Permit; `negativeVectorSet=B0V2-NVS-043`.

3.17.4 `dependencies`: `B0V2REQ-025`; `B0V2REQ-027`; `B0V2REQ-029`; `B0V2REQ-030`; `B0V2REQ-031`; `B0V2REQ-036`; `B0V2REQ-038`; `B0V2REQ-039`; `B0V2REQ-042`.

3.17.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F017`.

## 3.18 `B0V2REQ-044` — Finite total state-event-terminal matrix

3.18.1 `statement`: `addresses=B0-HR-F018; output=B0V2OUT-044`; produce a machine-readable TransitionMatrix with one row for every Cartesian pair in `AuthorityState×AuthorityEvent`, exactly one next state, terminal, reason, retry rule, cleanup rule, escalation rule, descendant invalidation rule and `usableAuthority` bit.

3.18.2 `threatCauseImpact`: Missing or multi-valued transitions can fail open around collision, response loss, revocation, conflicts and partial effects.

3.18.3 `requiredProof`: Cartesian row count equals `|AuthorityState|×|AuthorityEvent|`; missing/duplicate/multi-terminal=0; invalid/concurrent/partial vectors have usableAuthority=0; terminal mutation forbidden; `negativeVectorSet=B0V2-NVS-044`.

3.18.4 `dependencies`: `B0V2REQ-026`; `B0V2REQ-027`; `B0V2REQ-033`; `B0V2REQ-034`; `B0V2REQ-040`; `B0V2REQ-041`; `B0V2REQ-042`; `B0V2REQ-043`.

3.18.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F018`.

## 3.19 `B0V2REQ-045` — Fork-detecting Evidence custody

3.19.1 `statement`: `addresses=B0-HR-F019; output=B0V2OUT-045`; produce an EvidenceCustodyProfile binding durable store identity, ordered sequence CAS, parent hash, signed checkpoint, independent fork detector, role-based read/write access, classification, retention, legal hold, redaction-as-successor and Public-reference policy.

3.19.2 `threatCauseImpact`: An unrooted append-only claim permits divergent ledgers, reordered failures, unauthorized access and Public leakage.

3.19.3 `requiredProof`: concurrent append, omission, reorder, fork, rollback, unauthorized read/write, in-place redaction and retention/legal-hold conflict are detected; two readers derive identical ordered roots and disclosure dispositions; `negativeVectorSet=B0V2-NVS-045`.

3.19.4 `dependencies`: `B0V2REQ-018`; `B0V2REQ-020`; `B0V2REQ-027`; `B0V2REQ-036`; `B0V2REQ-037`; `B0V2REQ-038`; `B0V2REQ-044`.

3.19.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F019`.

## 3.20 `B0V2REQ-046` — Verifiable trusted-time profile

3.20.1 `statement`: `addresses=B0-HR-F020; output=B0V2OUT-046`; produce a TimeDecisionAndVerificationProfile binding an externally approved source, receipt schema, source/clock ID, UTC format, monotonic counter, maximum skew, rollback detector, outage terminal and exact validity duration per artifact class, with undecided values explicitly blocked.

3.20.2 `threatCauseImpact`: Boundary disagreement, clock rollback or indefinite validity can preserve stale authority or deadlock verification.

3.20.3 `requiredProof`: before/notBefore/at-expiry/after-expiry/skew/rollback/source-outage/conflicting-time vectors yield byte-identical results in two validators; missing decision or trusted time blocks; `negativeVectorSet=B0V2-NVS-046`.

3.20.4 `dependencies`: `B0V2REQ-016`; `B0V2REQ-027`; `B0V2REQ-029`; `B0V2REQ-034`; `B0V2REQ-036`; `B0V2REQ-038`; `B0V2REQ-044`.

3.20.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F020`.

## 3.21 `B0V2REQ-047` — Atomic planning-artifact publication

3.21.1 `statement`: `addresses=B0-HR-F021; output=B0V2OUT-047`; produce an AtomicPlanningPublicationPolicy binding a private staged path, expected destination state, exact bytes/digest, classification, Permit reservation, atomic same-filesystem publish, post-publish verification, quarantine and successor-only recovery.

3.21.2 `threatCauseImpact`: Crash or denied write can leave truncated, mixed-generation or disclosure-unsafe public artifacts that later readers freeze or review.

3.21.3 `requiredProof`: crash-before-write, mid-write, post-write-pre-receipt, destination conflict, classification change and cleanup failure never yield frozen/current status; partials enter `PARTIAL-EFFECT-QUARANTINED`; `negativeVectorSet=B0V2-NVS-047`.

3.21.4 `dependencies`: `B0V2REQ-006`; `B0V2REQ-007`; `B0V2REQ-014`; `B0V2REQ-015`; `B0V2REQ-018`; `B0V2REQ-027`; `B0V2REQ-032`; `B0V2REQ-033`; `B0V2REQ-034`; `B0V2REQ-037`; `B0V2REQ-044`; `B0V2REQ-045`; `B0V2REQ-046`.

3.21.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F021`.

## 3.22 `B0V2REQ-048` — Machine-bound preservation and closure denominator

3.22.1 `statement`: `addresses=B0-HR-F022; output=B0V2OUT-048`; produce a RequirementClosureManifest with exactly one row for each `B0REQ-000`–`B0REQ-026` and `B0-HR-F001`–`B0-HR-F022`, binding preservedBy/addressedBy Requirement, implementation artifact, test IDs, Evidence IDs, disposition, reviewer, noMergeKey and successor Root.

3.22.2 `threatCauseImpact`: Label presence, merged Findings or denominator drift can claim 100% while omitting semantic obligations or tests.

3.22.3 `requiredProof`: 27/27 predecessor and 22/22 Finding rows appear exactly once; forward/inverse coverage=100%; missing/merged/duplicate/unknown/untested/evidence-free=0; `N/A` requires exact external authority; denominator change invalidates Acceptance; `negativeVectorSet=B0V2-NVS-048`.

3.22.4 `dependencies`: `B0V2REQ-000`; `B0V2REQ-020`; `B0V2REQ-021`; `B0V2REQ-027`; `B0V2REQ-039`; `B0V2REQ-043`; `B0V2REQ-044`; `B0V2REQ-045`; `B0V2REQ-046`; `B0V2REQ-047`.

3.22.5 `sourceBasis`: `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355::B0-HR-F022`.

# 4. Machine preservation and Finding crosswalks

## 4.1 Predecessor preservation denominator

| Predecessor | Successor Requirement | Output | Preservation state |
|---|---|---|---|
| `B0REQ-000` | `B0V2REQ-000` | `B0V2OUT-000` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-001` | `B0V2REQ-001` | `B0V2OUT-001` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-002` | `B0V2REQ-002` | `B0V2OUT-002` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-003` | `B0V2REQ-003` | `B0V2OUT-003` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-004` | `B0V2REQ-004` | `B0V2OUT-004` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-005` | `B0V2REQ-005` | `B0V2OUT-005` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-006` | `B0V2REQ-006` | `B0V2OUT-006` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-007` | `B0V2REQ-007` | `B0V2OUT-007` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-008` | `B0V2REQ-008` | `B0V2OUT-008` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-009` | `B0V2REQ-009` | `B0V2OUT-009` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-010` | `B0V2REQ-010` | `B0V2OUT-010` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-011` | `B0V2REQ-011` | `B0V2OUT-011` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-012` | `B0V2REQ-012` | `B0V2OUT-012` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-013` | `B0V2REQ-013` | `B0V2OUT-013` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-014` | `B0V2REQ-014` | `B0V2OUT-014` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-015` | `B0V2REQ-015` | `B0V2OUT-015` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-016` | `B0V2REQ-016` | `B0V2OUT-016` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-017` | `B0V2REQ-017` | `B0V2OUT-017` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-018` | `B0V2REQ-018` | `B0V2OUT-018` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-019` | `B0V2REQ-019` | `B0V2OUT-019` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-020` | `B0V2REQ-020` | `B0V2OUT-020` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-021` | `B0V2REQ-021` | `B0V2OUT-021` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-022` | `B0V2REQ-022` | `B0V2OUT-022` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-023` | `B0V2REQ-023` | `B0V2OUT-023` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-024` | `B0V2REQ-024` | `B0V2OUT-024` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-025` | `B0V2REQ-025` | `B0V2OUT-025` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0REQ-026` | `B0V2REQ-026` | `B0V2OUT-026` | `PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |

4.1.1 The denominator is exactly 27. No predecessor row is merged, deleted, marked `N/A` or transferred to another Finding.

4.1.2 Preservation means the complete predecessor obligation remains required and is strengthened by the successor text. It does not transfer Acceptance from the rejected predecessor.

## 4.2 Hostile-Finding remediation denominator

| Finding | Severity | Successor Requirement | Output | noMerge identity | State |
|---|---:|---|---|---|---|
| `B0-HR-F001` | P0 | `B0V2REQ-027` | `B0V2OUT-027` | `B0-HR-F001-SOURCE-REFERENCE-ROOT-LOCATOR` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F002` | P0 | `B0V2REQ-028` | `B0V2OUT-028` | `B0-HR-F002-NAVIGATION-EVIDENCE-AUTHORITY-PROMOTION` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F003` | P0 | `B0V2REQ-029` | `B0V2OUT-029` | `B0-HR-F003-EXTERNAL-TAL-TRUST-ANCHOR` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F004` | P0 | `B0V2REQ-030` | `B0V2OUT-030` | `B0-HR-F004-GENESIS-AUTHORITY-DAG` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F005` | P0 | `B0V2REQ-031` | `B0V2OUT-031` | `B0-HR-F005-BOOTSTRAP-REVIEW-AUTHORITY` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F006` | P0 | `B0V2REQ-032` | `B0V2OUT-032` | `B0-HR-F006-EFFECT-SCOPE-ALLOWLIST` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F007` | P0 | `B0V2REQ-033` | `B0V2OUT-033` | `B0-HR-F007-PERMIT-ATOMIC-CONSUMPTION` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F008` | P0 | `B0V2REQ-034` | `B0V2OUT-034` | `B0-HR-F008-REVOCATION-INFLIGHT-FENCE` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F009` | P1 | `B0V2REQ-035` | `B0V2OUT-035` | `B0-HR-F009-APPOINTMENT-CONFLICT-MATRIX` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F010` | P0 | `B0V2REQ-036` | `B0V2OUT-036` | `B0-HR-F010-CRYPTO-IDENTITY-SIGNATURE-KEYS` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F011` | P1 | `B0V2REQ-037` | `B0V2OUT-037` | `B0-HR-F011-PUBLIC-HASH-DICTIONARY-LEAKAGE` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F012` | P0 | `B0V2REQ-038` | `B0V2OUT-038` | `B0-HR-F012-SECURITY-CRITICAL-INPUT-ROOTS` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F013` | P0 | `B0V2REQ-039` | `B0V2OUT-039` | `B0-HR-F013-ACCEPTANCE-ENVELOPE-CLOSURE` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F014` | P0 | `B0V2REQ-040` | `B0V2OUT-040` | `B0-HR-F014-CAS-RESPONSE-LOSS-SPLIT-BRAIN` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F015` | P1 | `B0V2REQ-041` | `B0V2OUT-041` | `B0-HR-F015-READBACK-INDEPENDENCE-CONSISTENCY` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F016` | P1 | `B0V2REQ-042` | `B0V2OUT-042` | `B0-HR-F016-OBSERVATION-NONAUTHORITY-REDUCER` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F017` | P0 | `B0V2REQ-043` | `B0V2OUT-043` | `B0-HR-F017-TWO-GENERATION-GENESIS-RECURSION` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F018` | P0 | `B0V2REQ-044` | `B0V2OUT-044` | `B0-HR-F018-TOTAL-STATE-EVENT-TERMINALS` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F019` | P1 | `B0V2REQ-045` | `B0V2OUT-045` | `B0-HR-F019-EVIDENCE-LEDGER-CUSTODY-FORKS` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F020` | P1 | `B0V2REQ-046` | `B0V2OUT-046` | `B0-HR-F020-TRUSTED-TIME-PROFILE` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F021` | P1 | `B0V2REQ-047` | `B0V2OUT-047` | `B0-HR-F021-PARTIAL-PLANNING-WRITE` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |
| `B0-HR-F022` | P1 | `B0V2REQ-048` | `B0V2OUT-048` | `B0-HR-F022-REQUIREMENT-CLOSURE-DENOMINATOR` | `ADDRESSED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-REVIEW` |

4.2.1 The denominator is exactly 22: P0=14, P1=8. No Finding is merged, downgraded, deleted, closed, marked `N/A` or allowed to borrow closure from another Finding.

4.2.2 Independent Review must evaluate every acceptancePredicate from the frozen Finding manifest against this exact successor Root. A shared theme does not reduce cardinality.

# 5. NegativeVectorRegistry

## 5.1 Registry contract

5.1.1 Each `B0V2-NVS-nnn` is a distinct vector set and maps to exactly one Requirement. Each set below contains three minimum adversarial vectors; an implementation may add vectors but cannot delete or merge these.

5.1.2 Every vector must record exact input roots, mutation, expected terminal, expected reason, expected `usableAuthority=0`, observed result and immutable Evidence root.

5.1.3 If the expected outcome is not deterministically provable, the vector terminates `BLOCKED` or `COMMITTED-UNCONFIRMED`, never guessed Success.

## 5.2 Vector-set denominator

| Vector set | Requirement | Minimum distinct vectors | Expected safe result |
|---|---|---|---|
| `B0V2-NVS-000` | `B0V2REQ-000` | omitted Requirement; duplicate Requirement; changed denominator Root | `BLOCKED` |
| `B0V2-NVS-001` | `B0V2REQ-001` | Producer self-approval; blanket Tal message; wrong exact Root | `BLOCKED` |
| `B0V2-NVS-002` | `B0V2REQ-002` | Subject contains envelope; pointer is Member; authority back-edge | `BLOCKED` |
| `B0V2-NVS-003` | `B0V2REQ-003` | changed mandate byte; wrong receipt purpose; invented transcript ID | `BLOCKED` |
| `B0V2-NVS-004` | `B0V2REQ-004` | stale Private claim; generic continue as development permit; conflicting amendment | `BLOCKED` |
| `B0V2-NVS-005` | `B0V2REQ-005` | wildcard class; prefix match; same label with alternate schema | `BLOCKED` |
| `B0V2-NVS-006` | `B0V2REQ-006` | hidden shell effect; multiple classifiers; unclassified network effect | `BLOCKED` |
| `B0V2-NVS-007` | `B0V2REQ-007` | replay; wrong epoch; duplicate Attempt | `BLOCKED` |
| `B0V2-NVS-008` | `B0V2REQ-008` | unsigned Appointment; revoked actor; delegation cycle | `BLOCKED` |
| `B0V2-NVS-009` | `B0V2REQ-009` | Producer=Reviewer; Reconciler=AcceptanceWriter; ambiguous backup | `BLOCKED` |
| `B0V2-NVS-010` | `B0V2REQ-010` | cross-domain bytes; collision signal; random ID request | `COLLISION` or `BLOCKED` |
| `B0V2-NVS-011` | `B0V2REQ-011` | Unicode confusable; null/absence alias; reordered collection | `BLOCKED` |
| `B0V2-NVS-012` | `B0V2REQ-012` | omitted key root; changed revocation head; wrong store identity | `BLOCKED` |
| `B0V2-NVS-013` | `B0V2REQ-013` | protocol authored by Subject; zero reviewers; post-review rule mutation | `BLOCKED` |
| `B0V2-NVS-014` | `B0V2REQ-014` | PII plaintext; low-entropy raw digest; missing classification | `BLOCKED` |
| `B0V2-NVS-015` | `B0V2REQ-015` | Product edit; Git mutation; provider or credential effect | `BLOCKED` |
| `B0V2-NVS-016` | `B0V2REQ-016` | local clock only; rollback; conflicting time receipts | `BLOCKED` |
| `B0V2-NVS-017` | `B0V2REQ-017` | stale epoch; revoke during effect; superseded mandate | `REVOKED` or `BLOCKED` |
| `B0V2-NVS-018` | `B0V2REQ-018` | forked parent; reordered event; unauthorized disclosure | `BLOCKED` |
| `B0V2-NVS-019` | `B0V2REQ-019` | wrong Subject Root; changed instructions; Reviewer sees peer findings preseal | `REJECTED` |
| `B0V2-NVS-020` | `B0V2REQ-020` | merged Findings; severity downgrade; overwritten predicate | `BLOCKED` |
| `B0V2-NVS-021` | `B0V2REQ-021` | missing trust Root; stale approval; catch-all Inputs field | `BLOCKED` |
| `B0V2-NVS-022` | `B0V2REQ-022` | ABA; wrong expected head; response loss after commit | `CONFLICT` or `COMMITTED-UNCONFIRMED` |
| `B0V2-NVS-023` | `B0V2REQ-023` | same cache twice; mixed revision; stale credential | `COMMITTED-UNCONFIRMED` |
| `B0V2-NVS-024` | `B0V2REQ-024` | forged Current observation; stale observation; conflicting cut | `BLOCKED` |
| `B0V2-NVS-025` | `B0V2REQ-025` | G1 issues Permit; G2 replay G1; shadow becomes current | `BLOCKED` |
| `B0V2-NVS-026` | `B0V2REQ-026` | missing state/event row; two terminals; implicit retry | `BLOCKED` |
| `B0V2-NVS-027` | `B0V2REQ-027` | wrong digest; ambiguous alias; range-only locator | `BLOCKED` |
| `B0V2-NVS-028` | `B0V2REQ-028` | ledger promoted to authority; summary treated as receipt; unavailable transcript credited | `BLOCKED` |
| `B0V2-NVS-029` | `B0V2REQ-029` | forged Tal channel; rotated key; compromised verifier | `BLOCKED` |
| `B0V2-NVS-030` | `B0V2REQ-030` | B0 creates itself; missing Genesis receipt; backward authority edge | `BLOCKED` |
| `B0V2-NVS-031` | `B0V2REQ-031` | Producer-selected rules; Reviewer conflict; altered veto rule | `BLOCKED` |
| `B0V2-NVS-032` | `B0V2REQ-032` | extra path; hidden network; exceeded byte budget | `BLOCKED` |
| `B0V2-NVS-033` | `B0V2REQ-033` | concurrent reserve; expired lease takeover; same Attempt retry | `CONFLICT` or `BLOCKED` |
| `B0V2-NVS-034` | `B0V2REQ-034` | revoke before reserve; revoke before commit; concurrent pointer clear | `REVOKED` |
| `B0V2-NVS-035` | `B0V2REQ-035` | issuer mismatch; overlapping primary/backup; insufficient quorum | `BLOCKED` |
| `B0V2-NVS-036` | `B0V2REQ-036` | unknown algorithm; wrong domain separator; compromised key | `BLOCKED` or `COLLISION` |
| `B0V2-NVS-037` | `B0V2REQ-037` | phone-number digest; public HMAC key; unapproved correlation metadata | `BLOCKED` |
| `B0V2-NVS-038` | `B0V2REQ-038` | omitted time profile; changed classifier; substituted pointer store | `BLOCKED` |
| `B0V2-NVS-039` | `B0V2REQ-039` | missing approval row; stale veto; duplicate dependency | `BLOCKED` |
| `B0V2-NVS-040` | `B0V2REQ-040` | commit then response loss; no commit then loss; prolonged outage | `COMMITTED-UNCONFIRMED` or `NOT-COMMITTED` |
| `B0V2-NVS-041` | `B0V2REQ-041` | same failure domain; stale journal; mixed store revision | `COMMITTED-UNCONFIRMED` |
| `B0V2-NVS-042` | `B0V2REQ-042` | observation-only Current; revoked pointer with stale Current; missing cut Member | `BLOCKED` |
| `B0V2-NVS-043` | `B0V2REQ-043` | shadow Permit; shadow current pointer; cross-generation replay | `BLOCKED` |
| `B0V2-NVS-044` | `B0V2REQ-044` | absent Cartesian row; ambiguous next state; terminal overwrite | `BLOCKED` |
| `B0V2-NVS-045` | `B0V2REQ-045` | ledger fork; in-place redaction; legal-hold deletion | `BLOCKED` |
| `B0V2-NVS-046` | `B0V2REQ-046` | at-expiry disagreement; time rollback; undecided validity duration | `BLOCKED` or `EXPIRED` |
| `B0V2-NVS-047` | `B0V2REQ-047` | mid-write crash; destination conflict; cleanup failure | `PARTIAL-EFFECT-QUARANTINED` |
| `B0V2-NVS-048` | `B0V2REQ-048` | omitted predecessor; merged Finding; evidence-free closure row | `BLOCKED` |

# 6. Acceptance and lifecycle constraints

## 6.1 Candidate review path

6.1.1 Freeze this successor’s exact bytes, SHA-256, line count and byte count. The frozen Root creates no B0 authority.

6.1.2 Producer QA checks mechanical shape, provenance resolution, backward-only DAG, one-Output rule, the 27-row preservation denominator, 22-row Finding denominator and 49-row NegativeVectorRegistry.

6.1.3 Two independently appointed hostile Reviewers receive the same presealed packet and do not receive one another’s Findings before both seals exist.

6.1.4 Comparison and Reconciliation preserve every local Finding. Any open P0/P1 forces an immutable successor; this artifact is never patched into Acceptance.

6.1.5 Tal exact-root approval may be requested only after the external AuthorityTrustProfile and CanonicalMandate receipt path are independently admissible. Blanket approval never substitutes for exact-root authentication.

## 6.2 Genesis and operational boundary

6.2.1 External GenesisAuthority may create only the objects enumerated by `B0V2REQ-030` and always under an exact one-use genesis receipt.

6.2.2 G1/G2 conformance objects cannot issue Permits, become current or authorize planning effects.

6.2.3 A B0 Definition becomes eligible only after all 49 Requirements have implemented Outputs, Evidence and passing vector sets, two independent hostile Reviews have no open P0/P1, Reconciliation is complete and Tal approves the exact Definition Root through the external trust path.

6.2.4 An operational B0 Instance becomes usable only after complete-envelope CAS is `COMMITTED-CONFIRMED`, both independent readbacks bind one revision, the reducer returns current, and no revocation/expiry/key compromise exists.

6.2.5 `COMMITTED-UNCONFIRMED`, split-brain, missing time, missing classification, missing Evidence, unresolved Review, stale Root or any unknown state grants zero authority.

## 6.3 Public and execution boundary

6.3.1 Public repository controls are monotonic: a rollback or successor cannot automatically change visibility to Private or disclose previously private Evidence.

6.3.2 This successor and its QA may be written as planning artifacts only. Product, Git, GitHub, provider and external-state mutations remain prohibited.

6.3.3 Product completion percentage, Product remaining hours, Planning remaining hours and calendar ETA remain `unknown/unavailable` because this artifact supplies no accepted Program denominator or measured throughput basis.

## 6.4 Acceptance predicate for this successor

6.4.1 Requirement IDs=`49/49`; exact five-field rows=`49/49`; unique Outputs=`49/49`; backward Dependency closure=`100%`; source rows exact-root+locator resolvable=`49/49`.

6.4.2 Predecessor preservation=`27/27`; hostile Findings represented independently=`22/22`; NegativeVectorRegistry mappings=`49/49`; merge/downgrade/deletion/closure-transfer=`0`.

6.4.3 Producer QA alone cannot satisfy independent Acceptance. Until the full path in §6.1–§6.2 completes, `acceptedRequirementCount=0/49`, `closedFindingCount=0/22`, `B0=ABSENT` and `Gate29=BLOCKED`.
