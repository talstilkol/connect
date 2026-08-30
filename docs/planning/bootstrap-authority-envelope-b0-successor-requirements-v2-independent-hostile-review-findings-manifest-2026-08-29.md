# 1. Connect — B0 v2 independent hostile-review findings manifest

## 1.1 Identity, isolation and verdict

1.1.1 `artifactId=CONNECT-B0-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-2026-08-29`.

1.1.2 `reviewClass=INDEPENDENT-HOSTILE-REVIEW; FINDINGS-FROZEN-BEFORE-PRODUCER-QA-DISCLOSURE`.

1.1.3 `subjectPath=/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v2-2026-08-29.md`.

1.1.4 `subjectRawSha256=7030c7b8ce0e3c7e3c74a89fee222af87aa51e3e448cfb91988c068d66efe8a4`.

1.1.5 `subjectPhysicalIdentity=824 lines; 72393 bytes`.

1.1.6 Producer QA was not read, searched, summarized or used before this Finding set was frozen.

1.1.7 `reviewDisposition=REJECT; SUCCESSOR-REQUIRED; B0=ABSENT; CONTROL-SEQUENCE-ACCEPTANCE=BLOCKED; GATE29=BLOCKED; DEVELOPMENT-FREEZE=ACTIVE`.

1.1.8 This manifest authorizes no Product code, Build, Runtime test, Git/GitHub mutation, provider operation, credential operation, purchase or deployment.

1.1.9 Repository visibility remains bindingly `PUBLIC`; no Finding or remediation authorizes `PRIVATE`.

## 1.2 Frozen source identities

1.2.1 `SUBJECT@7030c7b8ce0e3c7e3c74a89fee222af87aa51e3e448cfb91988c068d66efe8a4` resolves only to the Subject in §1.1.3.

1.2.2 `B0V1@678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb` resolves only to `/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-requirements-candidate-2026-08-29.md`.

1.2.3 `B0HRM@0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355` resolves only to `/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-requirements-independent-hostile-review-findings-manifest-2026-08-29.md`.

1.2.4 The sources establish the reviewed bytes, predecessor obligations and frozen predecessor Findings only. They grant no authority and prove no closure.

# 2. Frozen independent Findings

## 2.1 `B0V2-HR-F001` — The external Tal trust anchor has no non-circular admission root

2.1.1 `severity=P0`.

2.1.2 `locator=SUBJECT:§§2.2,3.3–3.4,6.1.5`.

2.1.3 `defect=B0V2REQ-029 says the AuthorityTrustProfile is external and lists channel, verifier, trust-root and key properties, but it does not bind a pre-existing L0 trust-anchor root, its custodian, its admission evidence or the verifier that admits that profile. The Genesis receipt is verified through the profile, while the profile's own authority still depends on an authenticated Tal act.`

2.1.4 `attackVector=an attacker or Producer substitutes a new profile that names the attacker's channel/key and then presents a receipt valid under that same substituted profile; all internal signature checks pass while the first trust decision remains self-selected.`

2.1.5 `impact=forged Tal authority can control the mandate, Genesis objects, appointments, revocation and acceptance chain.`

2.1.6 `requiredDelta=define one detached, pre-existing and externally admitted L0TrustAnchorRoot with exact custody, authenticated import ceremony, verifier implementation roots, immutable initial key/channel binding and a recovery path that cannot be authorized solely by the profile or key being replaced.`

2.1.7 `acceptancePredicate=no profile may verify or authorize its own admission; deleting the independently authenticated L0 evidence makes every Tal/Genesis Authority edge BLOCKED; profile-substitution and attacker-key bootstrap vectors fail in two independently implemented validators.`

2.1.8 `state=OPEN-BLOCKING`.

2.1.9 `noMergeKey=B0V2-HR-F001-L0-TRUST-ANCHOR-ADMISSION`.

## 2.2 `B0V2-HR-F002` — Genesis one-use authority has no exact Act or atomic-consumption contract

2.2.1 `severity=P0`.

2.2.2 `locator=SUBJECT:§§2.6–2.8,3.4,6.2.1`.

2.2.3 `defect=B0V2REQ-030 lists several Genesis object classes, while the closed operational Subject/Act registries explicitly exclude Genesis. Section 6.2.1 calls a Genesis receipt exact and one-use, but no GenesisAct enum, actor appointment, exact output package, expected head, reservation, atomic consumption, terminal or replay store is defined.`

2.2.4 `attackVector=one broad Genesis receipt is replayed to create multiple Definition, protocol, conformance or acceptance objects, or is reused with a substituted output root because no atomically consumed exact-effect tuple exists.`

2.2.5 `impact=the supposedly minimal external exception becomes an unbounded parallel authority path and can recreate B0 or its review rules without a unique auditable act.`

2.2.6 `requiredDelta=define a detached GenesisPermit schema and finite GenesisAct registry; bind one exact output-package root, actor, environment, epoch, expected Genesis head and expiry; consume the Permit atomically with one immutable terminal or define one externally attested all-or-nothing package ceremony.`

2.2.7 `acceptancePredicate=unknown Genesis act, extra object, output substitution, concurrent use, replay, response loss and partial package schedules produce at most one committed exact package and never usable authority under ambiguity.`

2.2.8 `state=OPEN-BLOCKING`.

2.2.9 `noMergeKey=B0V2-HR-F002-GENESIS-PERMIT-ATOMIC-CONSUMPTION`.

## 2.3 `B0V2-HR-F003` — The mechanical Requirement DAG is not the semantic Authority/Uses graph

2.3.1 `severity=P0`.

2.3.2 `locator=SUBJECT:§§1.3.5,2.2–2.4,2.14,3.3–3.5,3.12–3.13,6.2`.

2.3.3 `defect=the 233 backward dependencies form a DAG, but no machine-readable graph distinguishes MEMBER-OF, USES, VERIFIES, AUTHORIZES, ISSUED-BY, REVOKES, SUPERSEDES and INVALIDATES edges. Runtime relations described in prose can therefore point forward or form cycles even when the build-order DAG passes.`

2.3.4 `attackVector=a receipt is verified by a profile that is admitted by that receipt, or a review protocol and Genesis authority mutually admit one another; the parser sees only backward Requirement dependencies and reports cycle=0.`

2.3.5 `impact=self-membership, self-review or self-authority cycles can be hidden behind an acyclic document order.`

2.3.6 `requiredDelta=publish a typed semantic graph with exact node roots, edge schemas, allowed source/target classes, authority credit and invalidation semantics; prove the Authority and Membership projections acyclic independently of the build-order graph.`

2.3.7 `acceptancePredicate=two graph readers derive the same typed edge multiset; unknown/untyped edges=0; Authority/Membership cycles=0; every verifier, issuer, review and revocation prose relation is represented and removing the external L0 edge disconnects all authority descendants.`

2.3.8 `state=OPEN-BLOCKING`.

2.3.9 `noMergeKey=B0V2-HR-F003-TYPED-SEMANTIC-AUTHORITY-USES-GRAPH`.

## 2.4 `B0V2-HR-F004` — Permit consumption and the permitted effect have no realizable atomicity boundary

2.4.1 `severity=P0`.

2.4.2 `locator=SUBJECT:§§2.8,2.23–2.24,3.7,3.21`.

2.4.3 `defect=B0V2REQ-033 requires atomic consume+effect commit, while B0V2REQ-047 publishes a filesystem artifact and the Permit/pointer heads live in an unspecified state store. No shared transaction domain, transactional outbox, target idempotency contract or proof that the target enforces the fencing token is required.`

2.4.4 `attackVector=the artifact rename succeeds and Permit consumption fails, or Permit consumption succeeds and the artifact publish fails; a lease takeover or response-loss recovery then repeats or loses the effect.`

2.4.5 `impact=one Permit can cause two visible effects, or an irrevocably consumed Permit can leave no valid output while the ledger cannot determine which side committed.`

2.4.6 `requiredDelta=classify each effect by atomicity strategy; require the staged artifact, Permit state and current pointer to commit in one linearizable domain, or use a formally specified outbox plus content-addressed idempotent target and monotonic recovery; effects without such a strategy remain prohibited.`

2.4.7 `acceptancePredicate=all crash points around reserve, stage, rename, consume, pointer CAS, response loss and lease takeover yield at most one visible content root and one final Permit outcome; cross-store partial commit cannot become frozen/current.`

2.4.8 `state=OPEN-BLOCKING`.

2.4.9 `noMergeKey=B0V2-HR-F004-PERMIT-EFFECT-TRANSACTION-BOUNDARY`.

## 2.5 `B0V2-HR-F005` — Revoke-wins is not linearizable across revocation, time and effect stores

2.5.1 `severity=P0`.

2.5.2 `locator=SUBJECT:§§2.17–2.18,3.7–3.8,3.20,6.2.4`.

2.5.3 `defect=the candidate checks a revocation head at reservation, effect start and commit, but does not require those checks and the effect commit to share one linearization domain. It also provides no total-order/tie rule between effectiveTime, trusted-time receipts, authority epoch and store revision.`

2.5.4 `attackVector=revocation commits after the final read but before a filesystem or other target effect; the target does not validate the fencing token and accepts stale work, while different reducers order equal-boundary time and store events differently.`

2.5.5 `impact=a post-revocation effect can become visible/current or different actors can disagree on the surviving authority set.`

2.5.6 `requiredDelta=bind revocation, Permit, acceptance pointer and effect fence to one monotonic AuthorityRevision or require every target to reject stale fencing tokens; define the linearization point and deterministic ordering for same-boundary epoch/revision/time events and forbid compensation from restoring authority.`

2.5.7 `acceptancePredicate=all interleavings before reserve, after reserve, during stage, immediately before commit, immediately after commit and at equal time boundaries have one specified outcome; no effect whose fence is older than the winning revocation revision becomes current.`

2.5.8 `state=OPEN-BLOCKING`.

2.5.9 `noMergeKey=B0V2-HR-F005-REVOKE-WINS-SHARED-LINEARIZATION`.

## 2.6 `B0V2-HR-F006` — Acceptance and Permit CAS do not fence every mutable security head

2.6.1 `severity=P0`.

2.6.2 `locator=SUBJECT:§§2.8,2.13,2.17,2.22–2.25,3.12–3.13`.

2.6.3 `defect=the envelope names many policy roots, but the Acceptance CAS explicitly expects only pointer, Permit, revocation and epoch heads; a Permit similarly lacks expected key-status, trust-profile, appointment, protocol, classifier, source-supersession and trusted-time decision heads. A digest captured earlier is not a commit-time fence.`

2.6.4 `attackVector=a key becomes COMPROMISED, an appointment is revoked, a protocol is superseded or a classifier changes after eligibility validation but before reserve/effect/commit; the limited expected-head tuple still matches and commits stale authority.`

2.6.5 `impact=authority can be granted or exercised against a security snapshot that was no longer current at its linearization point.`

2.6.6 `requiredDelta=derive one exact SecuritySnapshotRoot and monotonic SecurityRevision over every mutable security head; require the same expected snapshot at eligibility, Permit reservation, effect start, acceptance commit and use, or atomically revalidate all component heads at each linearization point.`

2.6.7 `acceptancePredicate=races for every enumerated mutable head before and during commit all fail closed; two readers prove the accepted/used tuple refers to one current security cut and no omitted head can change without invalidating it.`

2.6.8 `state=OPEN-BLOCKING`.

2.6.9 `noMergeKey=B0V2-HR-F006-COMPLETE-MUTABLE-HEAD-FENCE`.

## 2.7 `B0V2-HR-F007` — Unconfirmed and quarantined outcomes are both terminal and recoverable

2.7.1 `severity=P0`.

2.7.2 `locator=SUBJECT:§§1.4.1–1.4.6,2.23–2.24,3.14,3.18`.

2.7.3 `defect=COMMITTED-UNCONFIRMED and PARTIAL-EFFECT-QUARANTINED are SafeTerminal members, every Attempt must have exactly one immutable terminal and terminal mutation is forbidden; nevertheless RECOVER exists and reconciliation must monotonically resolve uncertainty. NOT-COMMITTED is a terminal but not an AuthorityState.`

2.7.4 `attackVector=after a lost response, a reducer either leaves COMMITTED-UNCONFIRMED forever, violates terminal immutability to confirm it, or appends a second terminal and violates terminal XOR=1.`

2.7.5 `impact=the lifecycle is internally unsatisfiable; implementations will diverge between deadlock, duplicate terminal records and unsafe retry.`

2.7.6 `requiredDelta=separate immutable observation/outcome records from lifecycle State; classify uncertainty/quarantine as non-final states with append-only resolution events, or define one finalization record that is created only after recovery; make every terminal a state or define a separate terminal-result type consistently.`

2.7.7 `acceptancePredicate=commit-before-loss, no-commit loss, conflict, recovery and partial-effect traces each have one legal monotonic event sequence and exactly one final terminal; no rule requires mutation of an immutable terminal.`

2.7.8 `state=OPEN-BLOCKING`.

2.7.9 `noMergeKey=B0V2-HR-F007-TERMINAL-RECONCILIATION-CONTRADICTION`.

## 2.8 `B0V2-HR-F008` — The total transition requirement lacks guards, payloads and a finite Reason universe

2.8.1 `severity=P0`.

2.8.2 `locator=SUBJECT:§§1.4,2.27,3.18,5.1`.

2.8.3 `defect=State and Event sets are listed, but no finite versioned Reason enum, event payload schema, guard precedence, invalid-event rule or linearization marker is required. The same state/event pair can have different outcomes depending on expected heads, key status, time, store result or effect visibility, so one row per pair alone is not executable.`

2.8.4 `attackVector=two implementations choose different implicit guard order for COMMIT near expiry/revocation or encode different reasons for the same malformed payload while both claim Cartesian coverage=100%.`

2.8.5 `impact=the matrix can be mechanically complete yet semantically multi-valued, unreachable or fail-open around concurrent security events.`

2.8.6 `requiredDelta=define finite State/Event/Reason/Terminal schemas, typed event payloads, mutually exclusive and exhaustive guards, guard priority, linearization point, reachability and liveness invariants; generate the matrix from those semantics rather than from labels alone.`

2.8.7 `acceptancePredicate=for every state and typed event payload exactly one guard matches; missing/overlap/unreachable terminal=0; two independent reducers produce byte-identical next state, reason and authority bit for boundary and concurrency traces.`

2.8.8 `state=OPEN-BLOCKING`.

2.8.9 `noMergeKey=B0V2-HR-F008-EXECUTABLE-TOTAL-TRANSITION-SEMANTICS`.

## 2.9 `B0V2-HR-F009` — The Acceptance envelope still has an open semantic denominator

2.9.1 `severity=P0`.

2.9.2 `locator=SUBJECT:§§2.1,2.13,2.22,3.12–3.13,3.18,3.22,6.2.3–6.2.4`.

2.9.3 `defect=B0V2OUT-021 mentions all Inputs while also prohibiting catch-all fields, and it does not explicitly bind the RequirementSetRoot, OutputRegistryRoot, RequirementClosureManifestRoot, NegativeVectorRegistry/result roots, G1/G2 conformance evidence, transition/reducer definitions, effect-classifier root, readback-independence proof or evidence-ledger checkpoint.`

2.9.4 `attackVector=an envelope binds the named subject and reviews but omits a failed vector result, substituted reducer/classifier or incomplete closure manifest; the listed mandatory fields still appear present.`

2.9.5 `impact=a Definition or Instance can become eligible without proving the exact requirements, state semantics and security mechanisms that its authority relies on.`

2.9.6 `requiredDelta=replace all Inputs with an explicit versioned field table and typed semantic-closure traversal; include every requirement/output/test/evidence/conformance/state-machine/classifier/reducer/readback/custody root and its current head, with no catch-all or authority-bearing extension field.`

2.9.7 `acceptancePredicate=forward/inverse traversal from the envelope reaches each semantic security dependency exactly once; omission/substitution/staleness mutants for every field block; two validators return identical ordered reason sets.`

2.9.8 `state=OPEN-BLOCKING`.

2.9.9 `noMergeKey=B0V2-HR-F009-ACCEPTANCE-SEMANTIC-DENOMINATOR`.

## 2.10 `B0V2-HR-F010` — NegativeVectorRegistry entries are labels, not executable vectors

2.10.1 `severity=P0`.

2.10.2 `locator=SUBJECT:§§1.3.6,5.1–5.2,6.2.3,6.4`.

2.10.3 `defect=the registry has 49 set rows and 147 semicolon-separated scenario labels, but no per-vector IDs, canonical input roots, mutation operations, event schedules, evaluator version, exact reason code, observed result or Evidence root. Section 5.1.2 says vectors must later contain those fields, while the acceptance predicate checks only 49 mappings.`

2.10.4 `attackVector=a Producer marks a set present and attaches three phrases without executing a reproducible mutant; mechanical 49/49 mapping passes although the dangerous path was never exercised.`

2.10.5 `impact=negative testing can be claimed complete through labels, allowing replay, race, public-leakage and self-authority defects to remain untested.`

2.10.6 `requiredDelta=enumerate at least 147 immutable vector instances with deterministic IDs and exact schemas for input roots, preconditions, mutation/schedule, runner/evaluator roots, expected state/reason/authority, observed result and Evidence; require runner capability and coverage manifests.`

2.10.7 `acceptancePredicate=every required vector is independently reproducible and produces byte-identical expected/observed predicates; label-only, unevaluated, evidence-free, duplicate and non-deterministic vectors accepted=0.`

2.10.8 `state=OPEN-BLOCKING`.

2.10.9 `noMergeKey=B0V2-HR-F010-EXECUTABLE-NEGATIVE-VECTOR-INSTANCES`.

## 2.11 `B0V2-HR-F011` — Forty-nine unique Output IDs have no machine-bound Output registry

2.11.1 `severity=P1`.

2.11.2 `locator=SUBJECT:§§1.3.3,2.1–3.22,6.4.1`.

2.11.3 `defect=each Requirement contains one unique B0V2OUT-nnn token, but no current Output registry binds that ID to an artifact class, schema/version root, producer, required members, implementation, Evidence or acceptance predicate. B0V2REQ-000 only requires a future registry.`

2.11.4 `attackVector=a placeholder file or incompatible schema is assigned the expected Output ID and counted as present because only token uniqueness is mechanically checked.`

2.11.5 `impact=49/49 Outputs can be reported without proving that any required security object exists or has the required shape.`

2.11.6 `requiredDelta=define an immutable OutputRegistry row for every ID with exact class, schema root, required field denominator, producer appointment, implementation/evidence roots, dependencies, invalidation edges and output-specific acceptance predicate.`

2.11.7 `acceptancePredicate=49/49 output rows resolve one-to-one; wrong class/schema/producer/member/evidence mutants block; output-token presence alone never contributes closure.`

2.11.8 `state=OPEN-BLOCKING`.

2.11.9 `noMergeKey=B0V2-HR-F011-MACHINE-BOUND-OUTPUT-REGISTRY`.

## 2.12 `B0V2-HR-F012` — Public HMAC commitments and opaque references can leak membership and linkability

2.12.1 `severity=P0`.

2.12.2 `locator=SUBJECT:§§2.15,3.11,3.19,6.3.1`.

2.12.3 `defect=B0V2REQ-037 permits a stable HMAC-SHA-256 commitment or approved opaque reference for non-public bytes, but does not require unlinkability, per-context isolation, membership-oracle resistance or a response to later HMAC-key compromise. A Public Git history is permanent even after the private key leaks.`

2.12.4 `attackVector=the same phone number or approval text yields linkable commitments across artifacts; an online verification endpoint becomes a membership oracle; future key compromise enables offline enumeration of every historical low-entropy commitment.`

2.12.5 `impact=PII, customer membership, repeated identities or private decisions can be confirmed or correlated without plaintext appearing in the repository.`

2.12.6 `requiredDelta=default to no public commitment for non-public low-entropy bytes; where a reference is indispensable, require non-derivable context-isolated unlinkable handles, private mapping custody, oracle controls, rotation/compromise analysis and explicit authority for any required cryptographic entropy.`

2.12.7 `acceptancePredicate=cross-artifact equality, chosen-input membership, online-oracle, key-compromise and Git-history vectors reveal neither equality nor membership; no public value is deterministically verifiable from restricted input bytes.`

2.12.8 `state=OPEN-BLOCKING`.

2.12.9 `noMergeKey=B0V2-HR-F012-PUBLIC-COMMITMENT-MEMBERSHIP-LINKABILITY`.

## 2.13 `B0V2-HR-F013` — Public provenance requires non-portable absolute home paths

2.13.1 `severity=P1`.

2.13.2 `locator=SUBJECT:§§1.2.1–1.2.4,3.1,6.3.1`.

2.13.3 `defect=the frozen index and B0V2REQ-027 require absolute paths such as /Users/tal/Documents/connect, which expose local identity/structure, are not stable across reviewers or CI, and conflict with a disclosure-minimized Public artifact. The current index also lacks the required physical identity and explicit supersession values.`

2.13.4 `attackVector=a public reader learns workstation layout, while a second machine cannot resolve the same absolute path and substitutes a local file with the expected logical name.`

2.13.5 `impact=provenance is non-portable, leaks unnecessary operational metadata and can diverge despite syntactically valid digest/locator references.`

2.13.6 `requiredDelta=use repository-rooted canonical logical paths plus content digest, artifact ID, media type and physical identity; keep machine-local absolute path mappings in private observation evidence; define locator grammar and supersession fields explicitly.`

2.13.7 `acceptancePredicate=two clean workspaces resolve all 83 references to identical bytes without publishing a home path; local-path substitution, symlink and changed-physical-identity mutants fail; public metadata classification passes.`

2.13.8 `state=OPEN-BLOCKING`.

2.13.9 `noMergeKey=B0V2-HR-F013-PUBLIC-PORTABLE-SOURCE-IDENTITY`.

## 2.14 `B0V2-HR-F014` — Role-conflict policy enumerates pairs but not mandatory prohibitions or identity equivalence

2.14.1 `severity=P0`.

2.14.2 `locator=SUBJECT:§§2.9–2.10,3.5,3.9,6.1.3`.

2.14.3 `defect=the candidate requires a matrix and pairwise checks but does not state the minimum prohibited intersections, whether the two Reviewer slots must be distinct, or how two agent credentials controlled by one human/session/model are treated as one effective actor. A matrix with every pair allowed can satisfy coverage mechanically.`

2.14.4 `attackVector=one controller holds Producer, QA, both Reviewer, Reconciler and AcceptanceWriter credentials under different actor IDs, or declares those intersections permitted in the generated matrix.`

2.14.5 `impact=the Subject and its Producer can manufacture nominally independent review and acceptance evidence.`

2.14.6 `requiredDelta=publish non-waivable minimum separation rules, an EffectiveController identity/equivalence relation, distinct Reviewer cardinality, quorum and backup constraints; require independence across actor, controlling principal, pre-disclosure packet and review execution context.`

2.14.7 `acceptancePredicate=Producer/QA/Reviewer/Reconciler/AcceptanceWriter self-control vectors and two-credential-same-controller vectors all block; the two Reviewer slots resolve to two distinct eligible effective controllers before either review begins.`

2.14.8 `state=OPEN-BLOCKING`.

2.14.9 `noMergeKey=B0V2-HR-F014-NORMATIVE-ROLE-SEPARATION-CONTROLLER-IDENTITY`.

## 2.15 `B0V2-HR-F015` — Crypto agility and compromise recovery have no downgrade-safe trust transition

2.15.1 `severity=P0`.

2.15.2 `locator=SUBJECT:§§3.3,3.10–3.11,3.20`.

2.15.3 `defect=the candidate names SHA-256 and Ed25519 and an agility version, but does not define the exact Ed25519 mode/encoding/verification rules, signed algorithm-registry root, downgrade protection, cross-sign/quorum migration, trust-root rollover or how to distinguish legitimate pre-compromise receipts from forged backdated receipts after key compromise.`

2.15.4 `attackVector=an attacker selects an older allowed profile, exploits divergent Ed25519 parsing, or uses a compromised key to backdate a profile/receipt and then self-authorize its replacement.`

2.15.5 `impact=implementations can disagree on signature validity and a compromised or downgraded key can retain or regain bootstrap authority.`

2.15.6 `requiredDelta=define exact algorithm identifiers and encodings, strict verification, domain/key usage, version monotonicity, deprecation and downgrade rules; require a recovery quorum or independently held offline trust anchor for compromise and bind transition receipts to both old/new roots when the old key is not compromised.`

2.15.7 `acceptancePredicate=algorithm confusion, malformed encoding, old-profile downgrade, unknown algorithm, cross-domain signature, backdating, compromised-key rollover and recovery-replay vectors all fail identically in independent implementations.`

2.15.8 `state=OPEN-BLOCKING`.

2.15.9 `noMergeKey=B0V2-HR-F015-CRYPTO-DOWNGRADE-COMPROMISE-TRUST-TRANSITION`.

## 2.16 `B0V2-HR-F016` — Shadow G1/G2 removes the operational behavior required by the predecessor

2.16.1 `severity=P0`.

2.16.2 `locator=SUBJECT:§§2.26,3.17,6.2.2–6.2.4; B0V1:§2.26`.

2.16.3 `defect=B0REQ-025 required G1 acceptance, a controlled delta and G2 repetition of QA/review/approval/CAS/readbacks with stale-grant and replay proof. The successor correctly removes recursive authority, but its shadow generations structurally exclude current-pointer eligibility and Permit issuance, so they cannot exercise the operational paths whose behavior they are meant to prove; no equivalence/bisimulation proof or later two-generation operational run is required.`

2.16.4 `attackVector=shadow reducers and stores pass, while the later operational pointer or Permit implementation has a replay, invalidation or fencing defect that the shadow environment could never trigger.`

2.16.5 `impact=two-generation conformance becomes a simulation of a safer subset and the original end-to-end invalidation guarantee is materially weakened.`

2.16.6 `requiredDelta=require an isolated capability sink that executes byte-identical operational state-machine code with zero external effect and prove equivalence to production configuration; after Definition acceptance, require two operational Instance generations before broader authority, without using their results to bootstrap the Definition itself.`

2.16.7 `acceptancePredicate=G1/G2 cover the same Permit, pointer, CAS, readback, reducer, revocation and replay transitions as operational instances; configuration/code-root parity is proven; cross-generation stale grants fail in both shadow and later operational generations.`

2.16.8 `state=OPEN-BLOCKING`.

2.16.9 `noMergeKey=B0V2-HR-F016-TWO-GENERATION-OPERATIONAL-PARITY-REGRESSION`.

## 2.17 `B0V2-HR-F017` — The second readback journal is not transactionally tied to the authoritative revision

2.17.1 `severity=P1`.

2.17.2 `locator=SUBJECT:§§2.23–2.24,3.14–3.16`.

2.17.3 `defect=Readback B comes from a separate integrity journal/checkpoint and must bind the same store revision as Readback A, but no atomic commit receipt, replication/consistency proof or journal-lag state machine binds the two systems. Separate failure domains alone do not prove that B observed the authoritative commit.`

2.17.4 `attackVector=the pointer store commits while the journal write is lost or delayed; an old matching checkpoint is treated as confirmation, or the system remains COMMITTED-UNCONFIRMED forever because no admissible journal catch-up rule exists.`

2.17.5 `impact=confirmation can be false or permanently unavailable, and reconciliation behavior differs across implementations.`

2.17.6 `requiredDelta=atomically emit a signed commit receipt from the authoritative CAS transaction, define how the independent journal verifies and checkpoints that receipt, bind lag/freshness bounds and specify monotonic catch-up or authoritative recovery without treating the journal as a second source of truth.`

2.17.7 `acceptancePredicate=lost, delayed, reordered, forked and stale journal schedules never confirm the wrong revision; a valid receipt is eventually confirmable under stated availability assumptions; outage remains safe and has one recovery path.`

2.17.8 `state=OPEN-BLOCKING`.

2.17.9 `noMergeKey=B0V2-HR-F017-READBACK-JOURNAL-REVISION-BINDING`.

## 2.18 `B0V2-HR-F018` — Filesystem EffectScope does not close symlink, mount and durability attacks

2.18.1 `severity=P1`.

2.18.2 `locator=SUBJECT:§§3.6,3.21`.

2.18.3 `defect=an allowed absolute path set and same-filesystem atomic publish do not bind canonical device/inode identity, symlink/hardlink/mount traversal, no-follow resolution, file permissions, durable fsync ordering or a time-of-check/time-of-use fence.`

2.18.4 `attackVector=an allowed staging or destination path is replaced by a symlink or mount after classification, causing a write outside scope; a crash after rename but before directory durability produces an apparent receipt for a lost file.`

2.18.5 `impact=an allowed planning write can modify an unintended location, expose restricted bytes or disagree with its durable Evidence record.`

2.18.6 `requiredDelta=bind repository/device/inode identity and no-follow path-walk semantics, reject links and mount changes, set private staging permissions, define file+directory fsync/rename order and revalidate identity immediately before commit.`

2.18.7 `acceptancePredicate=symlink, hardlink, mount swap, path traversal, permission, rename-crash and durability-loss vectors either publish exactly the intended bytes at the intended physical target or enter quarantine with zero current authority.`

2.18.8 `state=OPEN-BLOCKING`.

2.18.9 `noMergeKey=B0V2-HR-F018-FILESYSTEM-SCOPE-TOCTOU-DURABILITY`.

## 2.19 `B0V2-HR-F019` — Evidence fork detection lacks an independent anti-equivocation anchor

2.19.1 `severity=P1`.

2.19.2 `locator=SUBJECT:§§2.19–2.21,3.19`.

2.19.3 `defect=B0V2REQ-045 requests a signed checkpoint and independent fork detector, but does not require checkpoint publication/witnessing outside the ledger's operator or prove consistency between checkpoints. A compromised writer/signing domain can produce two valid signed histories for different readers.`

2.19.4 `attackVector=the ledger operator signs fork A for Acceptance and fork B for audit, each with valid parent chains; the local detector sees only its assigned fork and reports no divergence.`

2.19.5 `impact=failures, revocations or review Findings can be selectively hidden while every local append-only proof remains valid.`

2.19.6 `requiredDelta=define append-consistency proofs and at least one independently controlled witness/checkpoint anchor with anti-equivocation gossip or quorum rules; bind witness identities, cadence, outage semantics and disclosure-safe checkpoint content.`

2.19.7 `acceptancePredicate=split-view, withheld-checkpoint, rollback, conflicting-signer and witness-outage vectors are detected before authority; two readers with different presented histories derive CONFLICT, not separate valid Current states.`

2.19.8 `state=OPEN-BLOCKING`.

2.19.9 `noMergeKey=B0V2-HR-F019-EVIDENCE-ANTI-EQUIVOCATION-WITNESS`.

## 2.20 `B0V2-HR-F020` — Independent parsers and validators have no common-mode independence contract

2.20.1 `severity=P1`.

2.20.2 `locator=SUBJECT:§§2.1,2.3,2.11–2.13,2.22,3.3,3.10,3.12,3.20`.

2.20.3 `defect=the document repeatedly requires two independent parsers, serializers, graph readers or validators, but does not define independence by implementation root, library/runtime, author/controller, test corpus or failure domain. Two invocations of one defective implementation can satisfy every count.`

2.20.4 `attackVector=both validators share the same parser/library and accept the same malformed canonical form, graph edge or signature; matching output is reported as independent confirmation.`

2.20.5 `impact=common-mode defects masquerade as independent proof across source, cryptography, graph, envelope and time validation.`

2.20.6 `requiredDelta=define an IndependenceProfile per proof class with distinct implementation/code root and controller, prohibited shared dependencies, presealed inputs and comparison rules; where true diversity is unavailable, count the result as one validator and remain BLOCKED.`

2.20.7 `acceptancePredicate=same-code, same-library, same-controller and shared-parser mutants do not count twice; accepted pairs disclose and satisfy the exact independence denominator before results are compared.`

2.20.8 `state=OPEN-BLOCKING`.

2.20.9 `noMergeKey=B0V2-HR-F020-VALIDATOR-COMMON-MODE-INDEPENDENCE`.

## 2.21 `B0V2-HR-F021` — External N/A authority can waive non-waivable security invariants

2.21.1 `severity=P1`.

2.21.2 `locator=SUBJECT:§3.22.3`.

2.21.3 `defect=B0V2REQ-048 permits N/A when exact external authority exists but does not define which Requirements may be waived, a risk-acceptance schema, expiry or the rule that a waiver cannot produce usable authority when a foundational safety invariant is absent.`

2.21.4 `attackVector=a broad Tal receipt marks cryptographic, revocation, role-separation, Public-disclosure or terminal-safety obligations N/A and the closure denominator still reaches 100%.`

2.21.5 `impact=the acceptance mechanism can bypass the exact controls designed to prevent forged, stale or publicly leaking authority.`

2.21.6 `requiredDelta=classify all P0 authority, integrity, confidentiality and Public-safety invariants as non-waivable; define a narrow exception schema for optional scope only, with exact risk owner, reason, expiry, compensating control and zero usable authority when the omitted control is foundational.`

2.21.7 `acceptancePredicate=N/A attempts for every non-waivable invariant block regardless of signer; optional exceptions are exact, time-bounded and cannot increase effect scope or authority; denominator reports waived rows separately rather than as implemented.`

2.21.8 `state=OPEN-BLOCKING`.

2.21.9 `noMergeKey=B0V2-HR-F021-NONWAIVABLE-SECURITY-INVARIANTS`.

# 3. Frozen counts and non-merge rules

## 3.1 Finding denominator

3.1.1 `findingCount=21`.

3.1.2 `severityCounts=P0:14; P1:7; P2:0; P3:0`.

3.1.3 `stateCounts=OPEN-BLOCKING:21`.

3.1.4 Trust-anchor admission is distinct from the typed semantic graph and from cryptographic migration; Genesis consumption is distinct from operational Permit/effect atomicity; revoke-wins linearization is distinct from complete mutable-head fencing.

3.1.5 Terminal/reconciliation consistency is distinct from total transition semantics; Acceptance-envelope closure is distinct from Output schemas and executable vectors; readback journal binding is distinct from validator implementation independence.

3.1.6 Public commitment linkability is distinct from public path metadata and filesystem-effect escape; two-generation parity is distinct from bootstrap recursion; evidence anti-equivocation is distinct from append-only ordering.

3.1.7 No Finding may be merged, downgraded, deleted, marked closed, marked N/A or allowed to borrow Evidence from another Finding. A successor must map every `B0V2-HR-F001`–`B0V2-HR-F021` one-to-one.

3.1.8 Mechanical shape success does not close a semantic Finding. Producer QA may add Findings but cannot remove or rewrite this frozen set.

3.1.9 The reviewed Subject remains a substantial improvement over B0 v1, but it is not an accepted Requirement baseline and creates no B0 authority.
