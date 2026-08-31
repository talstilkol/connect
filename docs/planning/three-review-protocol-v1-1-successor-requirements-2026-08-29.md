# 1. Connect — Three-review Protocol v1.1 successor requirements

## 1.1 Identity and authority

1.1.1 `artifactId=CONNECT-THREE-REVIEW-PROTOCOL-V1-1-SUCCESSOR-REQUIREMENTS-2026-08-29`.

1.1.2 `requirementsVersion=MPRRP-1.1-SR-1.0-draft`.

1.1.3 predecessor Protocol raw SHA-256=`6f08bf3a00c995503a37ff930a826d915d85591277908b7813e52a0a6b6b8539`.

1.1.4 intake-assessment raw SHA-256=`f970f0d62e4c62bf17f417967f2baebcbed78ef393e4622bfe3b85d5e10e4b08`.

1.1.5 status=`AUTHORING-CANDIDATE; NOT-INDEPENDENTLY-REVIEWED; NOT-ACCEPTED`.

1.1.6 this artifact defines requirements for a Protocol successor. It is not that Protocol, does not normalize or merge any Finding and grants no Review, Reconciliation, Acceptance, Task, Gate, Git, Push, Deploy or provider authority.

1.1.7 exact semantic Finding denominator, Product completion, remaining person-hours, critical path and calendar ETA remain `unknown/unavailable`.

## 1.2 Requirement-row contract

1.2.1 every `MPRR-*` row contains exactly `rule`, `causeAndEffect`, `sourceIds`, `acceptancePredicate` and `dependencies`.

1.2.2 every source identity is literal and member-level; ranges are navigation only and receive zero coverage credit.

1.2.3 every correction to a reviewed Candidate creates a successor root; no in-place relabeling.

# 2. Subject, lifecycle and source freeze

## 2.1 `MPRR-001` — Immutable predecessor and explicit scope

2.1.1 `rule`: v1.1 declares the v1.0 predecessor root, exact review domains, exact allowed subject classes and explicit non-goals.

2.1.2 `causeAndEffect`: a generic reconciliation protocol can be reused outside its reviewed threat and authority scope.

2.1.3 `sourceIds`: `INTAKE-E001`; `INTAKE-E012`.

2.1.4 `acceptancePredicate`: predecessor is never edited; subject class and claim limit are machine fields; unsupported scope reaches `PROTOCOL-SCOPE-BLOCKED`.

2.1.5 `dependencies`: `none`.

## 2.2 `MPRR-002` — No same-generation authority

2.2.1 `rule`: Protocol Candidate, QA, Review A, presealed Review B, Review B, reconciliation, veto, human approval and Acceptance are separate immutable generations/attestations; none is a member or ancestor of the subject it validates.

2.2.2 `causeAndEffect`: self-membership allows a Protocol to grant itself validity and hides circular approval.

2.2.3 `sourceIds`: `BCA2-REQ-001`; `BCA2-REQ-005`; `TRD2-REQ-002`; `TRD2-REQ-004`.

2.2.4 `acceptancePredicate`: ancestor/member/actor scans find zero forbidden relation; same-generation approval vectors terminate `SELF-AUTHORITY-BLOCKED`.

2.2.5 `dependencies`: `MPRR-001`.

## 2.3 `MPRR-003` — Exact SourceFreezeManifest

2.3.1 `rule`: each reconciliation Run freezes subject, accepted Protocol, three raw Reviews, three local Manifests, schemas, normalizers, instructions and external appointment receipts with path, bytes, media type and full root.

2.3.2 `causeAndEffect`: Intake-computed roots cannot backfill what a Reviewer saw, and mutable inputs can drift during comparison.

2.3.3 `sourceIds`: `INTAKE-E011`; `INTAKE-E012`; `TRD2-REQ-001`.

2.3.4 `acceptancePredicate`: two independent readbacks return identical ordered membership and roots; missing/change/self-member yields `SOURCE-FREEZE-CONFLICT-BLOCKED`.

2.3.5 `dependencies`: `MPRR-001`; `MPRR-002`.

## 2.4 `MPRR-004` — Immutable Run and generation identities

2.4.1 `rule`: define deterministic ProtocolGeneration, ReviewGeneration, NormalizationRun, ComparisonRun and ReconciliationRun identities with predecessor, expected head, source freeze root and terminal.

2.4.2 `causeAndEffect`: reused names or mutable “latest” pointers can attach output to the wrong inputs.

2.4.3 `sourceIds`: `INTAKE-E010`; `TRD2-REQ-013`.

2.4.4 `acceptancePredicate`: replay returns the same identity; changed input creates successor; stale head/fork yields `RUN-CONFLICT-BLOCKED`.

2.4.5 `dependencies`: `MPRR-003`.

# 3. Total types and deterministic bytes

## 3.1 `MPRR-005` — Closed scalar and union registry

3.1.1 `rule`: define all IDs, roots, strings, byte strings, bounded integers, arrays, enums, timestamps, durations, Unknown, null, empty, Genesis and terminal values.

3.1.2 `causeAndEffect`: undefined empty/null/Unknown behavior makes independent parsers disagree.

3.1.3 `sourceIds`: `INTAKE-E004`; `TRD2-REQ-007`; `TRD2-REQ-008`.

3.1.4 `acceptancePredicate`: schema-reference closure is 100%; every valid/invalid scalar vector has one identical result under both parsers.

3.1.5 `dependencies`: `MPRR-001`.

## 3.2 `MPRR-006` — Canonical JSON and Unicode profile

3.2.1 `rule`: pin JSON Schema dialect and RFC8785/JCS-compatible canonical JSON after strict UTF-8 and declared NFC policy; define control-character, bidi and confusable-script rejection rules by field class.

3.2.2 `causeAndEffect`: vague NFC or key ordering does not prevent visually confusable identities or root drift.

3.2.3 `sourceIds`: `INTAKE-E004`; `TRD2-REQ-010`.

3.2.4 `acceptancePredicate`: two implementations reproduce exact bytes; malformed UTF-8, forbidden controls/bidi, confusable IDs and schema ambiguity fail identically.

3.2.5 `dependencies`: `MPRR-005`.

## 3.3 `MPRR-007` — Complete framing and domain separation

3.3.1 `rule`: define a field-tagged length-prefix binary preimage with length unit, integer encoding, array count/item framing, null/empty distinction, domain version and maximum sizes.

3.3.2 `causeAndEffect`: `domain-length:value-length:value` alone permits differing interpretations and delimiter ambiguity.

3.3.3 `sourceIds`: `INTAKE-E004`; `TRD2-REQ-011`.

3.3.4 `acceptancePredicate`: published byte vectors cover every type/boundary; two encoders match; concatenation, truncation, overflow and type-substitution mutants fail.

3.3.5 `dependencies`: `MPRR-005`; `MPRR-006`.

## 3.4 `MPRR-008` — Full digest and display alias

3.4.1 `rule`: full SHA-256 over the domain-separated preimage is authoritative; define `first32` explicitly as a non-authoritative number of lowercase hexadecimal characters or remove the alias.

3.4.2 `causeAndEffect`: bits/bytes/characters ambiguity and truncated aliases can create collisions or inconsistent identifiers.

3.4.3 `sourceIds`: `INTAKE-E004`; `TRD2-REQ-011`; `TRD2-REQ-012`.

3.4.4 `acceptancePredicate`: full-root mismatch always fails; truncated collision invalidates both aliases and requires deterministic successor; no suffix, counter, `Math.random()` or unapproved randomness.

3.4.5 `dependencies`: `MPRR-007`.

## 3.5 `MPRR-009` — Total schema registry and migration

3.5.1 `rule`: every Protocol input/output record has versioned JSON Schema, compatibility class, migration/tombstone policy and no unknown keys or silent fallback.

3.5.2 `causeAndEffect`: prose-only schemas let records drop fields during normalization or reinterpret old runs.

3.5.3 `sourceIds`: `INTAKE-E006`; `TRD2-REQ-015`.

3.5.4 `acceptancePredicate`: all references resolve; every old version has one explicit disposition; incompatible input terminates `SCHEMA-VERSION-BLOCKED`.

3.5.5 `dependencies`: `MPRR-005`; `MPRR-006`.

# 4. Review envelope and local Finding preservation

## 4.1 `MPRR-010` — Review envelope 18/18

4.1.1 `rule`: require `reviewId,reviewDomain,reviewerPersonId,reviewerAppointmentRoot,independenceEvidenceRoot,instructionRoot,subjectPath,subjectRawRoot,bytesObserved,coverageMethod,toolVersionRoots,startedAt,completedAt,localFindingManifestRoot,reviewVerdict,claimLimits,rawReviewRoot,envelopeRoot`.

4.1.2 `causeAndEffect`: the current 0/3 eligible envelopes cannot prove who reviewed what, under which instruction, with which coverage and authority.

4.1.3 `sourceIds`: `INTAKE-E005`; `INTAKE-E011`; `TRD2-REQ-026`; `TRD2-REQ-057`.

4.1.4 `acceptancePredicate`: all 18 fields are present and externally verifiable; missing/inferred/self-asserted authority, root or time yields `REVIEW-INELIGIBLE`.

4.1.5 `dependencies`: `MPRR-002`; `MPRR-003`; `MPRR-009`.

## 4.2 `MPRR-011` — Coverage and instruction evidence

4.2.1 `rule`: coverage records enumerate subject byte ranges/sections inspected, exclusions, tool-assisted passes, manual passes, failures and exact instruction bytes; a prose “read all” statement is insufficient.

4.2.2 `causeAndEffect`: line-count claims do not prove complete bytes, embedded content or a reproducible review method.

4.2.3 `sourceIds`: `INTAKE-E005`; `INTAKE-E011`.

4.2.4 `acceptancePredicate`: covered plus explicitly excluded byte ranges equal the subject extent without unexplained gap/overlap; instruction and tool roots resolve.

4.2.5 `dependencies`: `MPRR-003`; `MPRR-010`.

## 4.3 `MPRR-012` — Lossless local Finding schema

4.3.1 `rule`: each local record contains review/local/source IDs, reviewDomain, subject root, severity, status, affected clauses/artifacts, invariants, reviewer prose, canonical defect predicates, cause, impact, exploit path, explicit failureBoundary, safe terminal, remediation predicates, six assertion sets, evidence references, claim limits, reviewer disposition and extensions.

4.3.2 `causeAndEffect`: the current 9/10-field Manifests lose authority, boundary, assertions and claim-limit semantics required for safe comparison.

4.3.3 `sourceIds`: `INTAKE-E006`; `TRD2-REQ-037`.

4.3.4 `acceptancePredicate`: every source field is preserved verbatim plus mapped fields; no inferred missing value; schema validator and lossless round-trip pass for all local observations.

4.3.5 `dependencies`: `MPRR-009`; `MPRR-010`.

## 4.4 `MPRR-013` — Explicit failureBoundary

4.4.1 `rule`: define failureBoundary as a finite tuple of protected subject, trust boundary, trigger/precondition, forbidden effect, affected scope and terminal; it is not inferred from exploit prose.

4.4.2 `causeAndEffect`: v1.0 digests a field absent from its own schema, making identity impossible to reproduce.

4.4.3 `sourceIds`: `INTAKE-E002`.

4.4.4 `acceptancePredicate`: every local Finding has a validated explicit tuple or remains normalization-ineligible; exploit/path wording changes do not silently alter the tuple.

4.4.5 `dependencies`: `MPRR-005`; `MPRR-012`.

## 4.5 `MPRR-014` — Separate reviewer prose from semantic predicates

4.5.1 `rule`: preserve `observableDefectProse` losslessly but derive identity only from separately enumerated invariant-bound machine predicates reviewed as assertions; never hash free reviewer wording as semantic identity.

4.5.2 `causeAndEffect`: v1.0 both hashes observableDefect and excludes reviewer wording, so equivalent meanings written differently cannot converge.

4.5.3 `sourceIds`: `INTAKE-E003`; `TRD2-REQ-032`.

4.5.4 `acceptancePredicate`: paraphrase vectors preserve one semantic key only when predicate sets are identical under both normalizers; meaning changes produce different full roots.

4.5.5 `dependencies`: `MPRR-012`; `MPRR-013`.

## 4.6 `MPRR-015` — Six assertion classes remain distinct

4.6.1 `rule`: positive, negative, failure, concurrency, recovery and attack assertions are six explicit duplicate-free sets with testable predicates and cannot be collapsed into one acceptance paragraph.

4.6.2 `causeAndEffect`: one combined predicate can omit race, rollback or attack behavior while appearing complete.

4.6.3 `sourceIds`: `INTAKE-E006`; `TRD2-REQ-029`; `TRD2-REQ-030`.

4.6.4 `acceptancePredicate`: each required class has explicit members or typed inapplicability with rationale; cross-class loss mutation is rejected.

4.6.5 `dependencies`: `MPRR-012`.

## 4.7 `MPRR-016` — Reviewer-local namespace binding

4.7.1 `rule`: local identity is the tuple of raw Review root, local Manifest root and local ID; source-heading aliases map through an explicit one-to-one/one-to-many registry and never by ordinal inference.

4.7.2 `causeAndEffect`: R1 changes ID namespace, R2 can reuse undated IDs and R3 carries two IDs; guessed mappings can attach the wrong Finding.

4.7.3 `sourceIds`: `INTAKE-E009`; `INTAKE-E010`.

4.7.4 `acceptancePredicate`: 73/73 current local observations have explicit namespace keys and source mappings; unresolved alias remains `MAPPING-BLOCKED`, never a second Finding or inferred edge.

4.7.5 `dependencies`: `MPRR-003`; `MPRR-012`.

# 5. Normalization and semantic identity

## 5.1 `MPRR-017` — Semantic-key projection

5.1.1 `rule`: define one versioned projection from validated local fields to subject root, exact affected identities, invariant predicate IDs, canonical defect-predicate set, failureBoundary and safe terminal; exclude local ID, severity, prose, remediation wording and Evidence location.

5.1.2 `causeAndEffect`: the current three digest formats intentionally preserve local observations but cannot prove cross-review equivalence.

5.1.3 `sourceIds`: `INTAKE-E007`; `INTAKE-E008`; `TRD2-REQ-058`.

5.1.4 `acceptancePredicate`: concrete canonical key bytes exist for every eligible local record; macro text and omitted projection fields fail.

5.1.5 `dependencies`: `MPRR-006`; `MPRR-007`; `MPRR-013`; `MPRR-014`; `MPRR-016`.

## 5.2 `MPRR-018` — Two independent normalizers

5.2.1 `rule`: Normalizer A and B are separately implemented/versioned, consume identical frozen inputs, emit full framed key bytes/full roots and cannot read each other’s output before sealing.

5.2.2 `causeAndEffect`: one parser can reproduce its own ambiguity and falsely certify it.

5.2.3 `sourceIds`: `INTAKE-E007`; `TRD2-REQ-058`.

5.2.4 `acceptancePredicate`: full-root parity holds for every eligible local record; any difference yields `AMBIGUOUS-BLOCKED` and no semantic ID.

5.2.5 `dependencies`: `MPRR-003`; `MPRR-017`.

## 5.3 `MPRR-019` — Exact equivalence only

5.3.1 `rule`: two local observations are equivalent only when both normalizers emit identical full semantic roots; each local observation remains attached losslessly.

5.3.2 `causeAndEffect`: title, component, severity, locator or remediation similarity can merge distinct failure boundaries.

5.3.3 `sourceIds`: `INTAKE-E007`; `TRD2-REQ-058`.

5.3.4 `acceptancePredicate`: exact-match joins preserve all source assertions; title/severity/clause-only and majority-vote mutants fail.

5.3.5 `dependencies`: `MPRR-018`.

## 5.4 `MPRR-020` — Partial overlap is not equivalence

5.4.1 `rule`: shared affected identities with different invariant, boundary, trigger, forbidden effect or safe terminal remain separate semantic Findings; optional navigation parent has no severity, effort or closure.

5.4.2 `causeAndEffect`: a broad “same topic” group can close one weakness while hiding another.

5.4.3 `sourceIds`: `INTAKE-E007`; `TRD2-REQ-037`.

5.4.4 `acceptancePredicate`: overlap vectors remain separate; closing one transfers zero status or Evidence to another.

5.4.5 `dependencies`: `MPRR-019`.

## 5.5 `MPRR-021` — Strict local-observation union

5.5.1 `rule`: before normalization, preserve every local identity once; after normalization, the inverse map from semantic Findings reconstructs the complete local set without orphan, duplication or alias expansion.

5.5.2 `causeAndEffect`: union counts can shrink through merge or grow when aliases are counted as Findings.

5.5.3 `sourceIds`: `INTAKE-E006`; `INTAKE-E009`; `INTAKE-E010`.

5.5.4 `acceptancePredicate`: for the current input, local cardinality remains exactly 73 throughout; semantic denominator remains derived and may be smaller only through full-root equivalence.

5.5.5 `dependencies`: `MPRR-016`; `MPRR-019`.

# 6. Comparison, conflict and reconciliation records

## 6.1 `MPRR-022` — Comparison assertion schema

6.1.1 `rule`: each field-level comparison binds run/root, semantic identity, participating local identities, field path, normalized values, agreement/difference class, proof roots, terminal and claim limit.

6.1.2 `causeAndEffect`: v1.0 names Comparison fields but provides no machine schema or digest constructor.

6.1.3 `sourceIds`: `INTAKE-E004`; `TRD2-REQ-058`.

6.1.4 `acceptancePredicate`: every compared field has one immutable assertion; missing participant/value/proof yields `COMPARISON-BLOCKED`.

6.1.5 `dependencies`: `MPRR-009`; `MPRR-019`; `MPRR-021`.

## 6.2 `MPRR-023` — Conflict schema and taxonomy

6.2.1 `rule`: conflict records preserve existence, severity, cause, scope, invariant, boundary, terminal, remediation, assertion and Evidence disagreements plus competing local assertions.

6.2.2 `causeAndEffect`: field disagreement cannot be resolved safely through majority, seniority or producer preference.

6.2.3 `sourceIds`: `INTAKE-E006`; `TRD2-REQ-037`; `TRD2-REQ-059`.

6.2.4 `acceptancePredicate`: every non-wording difference creates a conflict or proved separate identity; unresolved P0/P1/P2 remains blocking; P3 requires exact risk acceptance.

6.2.5 `dependencies`: `MPRR-022`.

## 6.3 `MPRR-024` — Resolution schema and authority

6.3.1 `rule`: resolution binds conflict root, prior assertions, controlling source/invariant, resolver Appointment, authority scope, rationale, selected/non-selected predicates, Evidence, expiry and invalidators.

6.3.2 `causeAndEffect`: unrecorded discussion or producer selection can erase a valid reviewer assertion.

6.3.3 `sourceIds`: `INTAKE-E005`; `TRD2-REQ-026`; `TRD2-REQ-059`.

6.3.4 `acceptancePredicate`: missing authority/source/Evidence/expiry blocks; resolution never mutates local observations or changes the subject.

6.3.5 `dependencies`: `MPRR-010`; `MPRR-023`.

## 6.4 `MPRR-025` — Reconciliation manifest

6.4.1 `rule`: one immutable manifest enumerates every semantic Finding, all local observations, comparisons, conflicts, resolutions, strict-union remediation/assertion predicates, claim limits and safe terminals.

6.4.2 `causeAndEffect`: prose summaries cannot prove zero orphan, zero silent downgrade or zero predicate loss.

6.4.3 `sourceIds`: `INTAKE-E004`; `TRD2-REQ-058`.

6.4.4 `acceptancePredicate`: all admitted identities occur exactly once at their level; local inverse coverage=100%; unexplained severity/disposition/predicate change=0.

6.4.5 `dependencies`: `MPRR-021`; `MPRR-022`; `MPRR-023`; `MPRR-024`.

## 6.5 `MPRR-026` — Finding closure is outside comparison

6.5.1 `rule`: comparison/reconciliation can classify and specify remediation but cannot close a Finding; closure references an exact successor subject, Tests and Evidence reviewed separately.

6.5.2 `causeAndEffect`: adding remediation prose to a plan does not prove the defect is fixed.

6.5.3 `sourceIds`: `TRD2-REQ-031`; `TRD2-REQ-037`; `TRD2-REQ-058`.

6.5.4 `acceptancePredicate`: reconciliation output has no self-issued `CLOSED-PROVED`; later closure receipt binds successor root and all required assertion classes.

6.5.5 `dependencies`: `MPRR-015`; `MPRR-025`.

# 7. Independence, acceptance and concurrency

## 7.1 `MPRR-027` — Named independent actors

7.1.1 `rule`: Producer, QA, Review A, Review B, normalizer owners, reconciler, veto authorities, exact-root human approver and protected acceptor resolve through external Person/Appointment records with conflict policy.

7.1.2 `causeAndEffect`: reviewer identity or authority asserted inside its own Review is not proof of independence.

7.1.3 `sourceIds`: `INTAKE-E005`; `TRD2-REQ-026`; `TRD2-REQ-057`.

7.1.4 `acceptancePredicate`: forbidden overlap, self-appointment, missing eligibility, expired/revoked/wrong-scope authority all fail closed.

7.1.5 `dependencies`: `MPRR-002`; `MPRR-010`.

## 7.2 `MPRR-028` — Presealed blind Review B

7.2.1 `rule`: Review B packet identity and instructions are sealed before Review A output is disclosed; both bind identical Candidate/Evidence roots and record allowed information flow.

7.2.2 `causeAndEffect`: a reviewer who sees Review A may repeat its conclusions rather than provide independent detection.

7.2.3 `sourceIds`: `TRD2-REQ-056`; `TRD2-REQ-057`.

7.2.4 `acceptancePredicate`: preseal time/order and roots are proven externally; early disclosure or root difference yields `REVIEW-B-INELIGIBLE`.

7.2.5 `dependencies`: `MPRR-003`; `MPRR-027`.

## 7.3 `MPRR-029` — Veto, downgrade and risk acceptance

7.3.1 `rule`: veto/downgrade/risk records are detached, root-bound, authority-scoped, evidence-backed, expiring and reopenable; accepted risk never becomes verified control.

7.3.2 `causeAndEffect`: severity or blocking state can otherwise be reduced by the producer or by ambiguous business acceptance.

7.3.3 `sourceIds`: `TRD2-REQ-059`; `MSSA-F009`; `MSSA-F022`.

7.3.4 `acceptancePredicate`: unexplained downgrade=0; P0 cannot be silently accepted; missing approval or compensating control stays blocking.

7.3.5 `dependencies`: `MPRR-023`; `MPRR-024`; `MPRR-027`.

## 7.4 `MPRR-030` — Protected compare-and-swap

7.4.1 `rule`: protected acceptance verifies expected current head and exact Protocol/subject/QA/Review/reconciliation/veto/human-approval roots, writes one append-only envelope and performs authoritative readback.

7.4.2 `causeAndEffect`: concurrent writers, stale reviews or lost responses can select the wrong generation.

7.4.3 `sourceIds`: `TRD2-REQ-060`; `BCA2-REQ-044`.

7.4.4 `acceptancePredicate`: stale head, replay, duplicate, timeout, conflict or ambiguous response resolves to one proven head or `ACCEPTANCE-CONFLICT`; never assumes success.

7.4.5 `dependencies`: `MPRR-025`; `MPRR-027`; `MPRR-028`; `MPRR-029`.

## 7.5 `MPRR-031` — Freshness and invalidation

7.5.1 `rule`: byte, source membership, schema, Protocol, normalizer, appointment, subject or authority change invalidates exactly affected descendants and creates a successor run.

7.5.2 `causeAndEffect`: old comparison or acceptance can otherwise appear valid for changed inputs.

7.5.3 `sourceIds`: `TRD2-REQ-061`; `BCA2-REQ-046`.

7.5.4 `acceptancePredicate`: mutation traversal matches under two graph engines; historical receipts remain immutable while current credit is removed.

7.5.5 `dependencies`: `MPRR-004`; `MPRR-030`.

# 8. Recovery, evidence safety and conformance

## 8.1 `MPRR-032` — Durable archive and offline replay

8.1.1 `rule`: archive all exact inputs, schemas, tools, local/semantic manifests, comparisons, conflicts, resolutions and detached receipts in an inventory verifiable without network access.

8.1.2 `causeAndEffect`: temporary storage or live URLs cannot reproduce a historical reconciliation.

8.1.3 `sourceIds`: `MSSA-F024`; `TRD2-REQ-062`.

8.1.4 `acceptancePredicate`: isolated replay reproduces membership, full roots, counts and terminal; missing member yields `REPLAY-INCOMPLETE`.

8.1.5 `dependencies`: `MPRR-003`; `MPRR-025`; `MPRR-030`.

## 8.2 `MPRR-033` — Public-safe Evidence and untrusted content

8.2.1 `rule`: review text and linked content are untrusted data, never executable instructions; Public artifacts exclude Secrets, PII, customer/provider private data and credential-bearing Evidence through layered scan/redaction/reference rules.

8.2.2 `causeAndEffect`: a Finding or link can attempt instruction injection, and a Public repository can disclose sensitive review evidence.

8.2.3 `sourceIds`: `MSSA-F014`; `TRD2-REQ-052`; `TRD2-REQ-053`.

8.2.4 `acceptancePredicate`: instruction-injection/path/link mutants change no control flow; staged/history/export scans find zero prohibited value; suspected leak blocks publication.

8.2.5 `dependencies`: `MPRR-009`; `MPRR-032`.

## 8.3 `MPRR-034` — Conformance and mutation corpus

8.3.1 `rule`: publish valid, boundary, negative, failure, concurrency, recovery and attack vectors for every schema, identity, normalization, comparison, resolution and CAS invariant.

8.3.2 `causeAndEffect`: positive examples cannot prove rejection of near-valid unsafe inputs.

8.3.3 `sourceIds`: `TRD2-REQ-029`; `TRD2-REQ-030`; `TRD2-REQ-064`.

8.3.4 `acceptancePredicate`: two parsers and normalizers plus two graph engines agree on every vector; all forbidden mutations reach the named safe terminal.

8.3.5 `dependencies`: `MPRR-005`; `MPRR-006`; `MPRR-007`; `MPRR-008`; `MPRR-009`; `MPRR-010`; `MPRR-011`; `MPRR-012`; `MPRR-013`; `MPRR-014`; `MPRR-015`; `MPRR-016`; `MPRR-017`; `MPRR-018`; `MPRR-019`; `MPRR-020`; `MPRR-021`; `MPRR-022`; `MPRR-023`; `MPRR-024`; `MPRR-025`; `MPRR-026`; `MPRR-027`; `MPRR-028`; `MPRR-029`; `MPRR-030`; `MPRR-031`; `MPRR-032`; `MPRR-033`.

## 8.4 `MPRR-035` — Two-generation acceptance proof

8.4.1 `rule`: the Protocol is eligible only after two complete immutable generations demonstrate authoring, QA, presealed reviews, reconciliation, veto handling, exact-root approval, protected CAS, readback, invalidation and replay.

8.4.2 `causeAndEffect`: one happy-path generation cannot prove successor, stale-head or recovery semantics.

8.4.3 `sourceIds`: `BCA2-REQ-045`; `TRD2-REQ-064`.

8.4.4 `acceptancePredicate`: both generations pass MPRR-001–MPRR-034; first-generation receipts never transfer to the second; self-membership=0; forbidden vector survival=0.

8.4.5 `dependencies`: `MPRR-001`; `MPRR-002`; `MPRR-003`; `MPRR-004`; `MPRR-005`; `MPRR-006`; `MPRR-007`; `MPRR-008`; `MPRR-009`; `MPRR-010`; `MPRR-011`; `MPRR-012`; `MPRR-013`; `MPRR-014`; `MPRR-015`; `MPRR-016`; `MPRR-017`; `MPRR-018`; `MPRR-019`; `MPRR-020`; `MPRR-021`; `MPRR-022`; `MPRR-023`; `MPRR-024`; `MPRR-025`; `MPRR-026`; `MPRR-027`; `MPRR-028`; `MPRR-029`; `MPRR-030`; `MPRR-031`; `MPRR-032`; `MPRR-033`; `MPRR-034`.

# 9. Current disposition

## 9.1 Counters and next safe output

9.1.1 requirement denominator=`35`; current accepted=`0/35`.

9.1.2 current raw local observations preserved=`73/73`; formal Review envelopes eligible=`0/3`; protocol-compliant semantic digests=`0/73`.

9.1.3 Review Comparison, Reconciliation, closure, Acceptance and Gate credit remain blocked.

9.1.4 next safe output=`MPRRP-1.1 Definition Candidate that implements MPRR-001–MPRR-035, without normalizing current Findings during its own authoring`.

9.1.5 after authoring, the Candidate requires exact-root Producer QA, presealed independent Review B, independent Review A, conflict reconciliation, veto check and detached Acceptance.

9.1.6 until accepted: `Gate29=BLOCKED`; `development freeze=ACTIVE`; exact Product percentage, remaining hours, critical path and ETA=`unknown/unavailable`.
