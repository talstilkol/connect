# 1. Connect — TRD-2 Definition Requirement Manifest

## 1.1 Identity and disposition

1.1.1 `artifactId=CONNECT-SECTION-35-6-TRD-2-DEFINITION-REQUIREMENT-MANIFEST-2026-08-29`.

1.1.2 `manifestVersion=TRD2-RM-1.0-draft`.

1.1.3 target=`a new TRD-2.0 Definition Candidate; TRD-1.0 remains rejected and is never relabeled accepted`.

1.1.4 status=`AUTHORING-IN-PROGRESS; INPUT-ROOTS-PRESENT; NOT-FROZEN; NOT-INDEPENDENTLY-REVIEWED; NOT-ACCEPTED`.

1.1.5 this manifest specifies what TRD-2 must define. It is not TRD-2 itself, does not create Program Task identities and grants no Materialization permit.

1.1.6 no Product Code, Build, runtime Test, Git mutation, Push, Deployment, provider/account mutation, credential use, procurement or Production change is authorized.

1.1.7 exact Product completion, remaining person-hours, critical path and calendar ETA remain `unknown/unavailable`.

## 1.2 Frozen inputs currently available

1.2.1 Master subject raw SHA-256=`643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

1.2.2 rejected TRD-1.0 raw SHA-256=`1e3b0a3d64a60108db358d52d98b399e8739e489a3ebb6742e9b10f20ea60beb`.

1.2.3 TRD-1.0 Producer self-audit raw SHA-256=`64c1fd7250e85ebddabdf2acb9d4cbd64c17672e7fa2ef5f5433a725aee9616d`; open findings=`34`.

1.2.4 Bootstrap-generation architecture raw SHA-256=`3341f8aefad38f52921287ccc6224b7ab8a5b1c17e730b420508812b72d7fac6`.

1.2.5 structural review raw SHA-256=`6438c5b8fbf92d41d923884ae587abfc08b19507539f8260055194bd86533b4b`; normalized manifest raw SHA-256=`1b8a196dc7ba6c2a647cf100d382d3f9ace7dd38fcf6fc97ec27fb6ac44329e8`; open findings=`23`.

1.2.6 schedule review raw SHA-256=`35869ec7bbd04eaf5db3f7e6637276bb7d35c7d942f20fc6ab1457c24da95fee`; normalized manifest raw SHA-256=`efba1c56115b8a1ddcb8a042baf4a410321b09bd850fcda5d0b85df2757cf4d7`; open findings=`26`.

1.2.7 security-semantic review raw SHA-256=`d0d19b90b07f6e59bdef63b5eaaabe5c2ffa162fe90371fdd135876c264855b6`; normalized manifest raw SHA-256=`6e93c50f6b73767e5e059b2740c0589f3382282cf47c6fb42c6f058608c6b3e8`; open findings=`24`.

1.2.8 traceability adversarial audit raw SHA-256=`a3451b91db1811e0ff6bdb19b6d519bfd4ecf2c5c17c734a3a5bad0f4c125717`; open findings=`21`.

1.2.9 BCA-2 successor-requirement root=`f35ae1f0c8cf22ec379e0bf8b4f264a30c254df68181d25e3d4fe33ef46f20aa`; requirements=`55`.

1.2.10 user-directive/source-precedence root=`b012a479b18e162f5f759b49e033eb3856a4637cc0e91a8a36f1d06043813342`.

1.2.11 cyber-framework/Public-repository refresh root=`99165fa78752269a26a21cc0394a81a9345463439961e316db3252f46351ee88`.

1.2.12 Requirement-universe successor-requirement root=`7147b60425cda87fc23f3e2ba147693668d70b74a56d6c6162d918b78d019bad`; requirements=`42`; accepted=`0/42`.

1.2.13 progress/estimate/ETA mathematical-contract root=`d539927f18c6e7d7a718947c6f9e160fd09a780ca5d3d2f1fce2c3dc9c863110`; contracts=`32`; accepted=`0/32`.

## 1.3 Requirement-row contract

1.3.1 every requirement below has exactly four local fields: `rule`, `causeAndEffect`, `sourceIds`, `acceptancePredicate`.

1.3.2 `sourceIds` preserve report-local identities; no Finding is merged by title, topic, component or severity.

1.3.3 a source range is navigation only. The future machine manifest must enumerate every identity explicitly.

1.3.4 `PASS` always means the future TRD-2 subject plus detached Evidence satisfies the predicate; prose presence in this manifest receives zero closure credit.

# 2. Generation, authority and root safety

## 2.1 `TRD2-REQ-001` — Exact source freeze

2.1.1 `rule`: TRD-2 defines `SourceFreezeManifest` with every admitted raw root, media type, authority class, claim limit, effective observation, expiry, supersession edge and exclusion reason.

2.1.2 `causeAndEffect`: without one finite input root, a source can disappear or change while the same Definition digest is claimed.

2.1.3 `sourceIds`: `TRD-P0-006`; `MPSA-20260829-P0-005`; `MSAF-20260829-F019`; `PSTA-20260829-P0-001`.

2.1.4 `acceptancePredicate`: two independent readers enumerate identical members and roots; missing or changed bytes yield `SOURCE-FREEZE-INVALID` and no Candidate freeze.

## 2.2 `TRD2-REQ-002` — No same-generation authority

2.2.1 `rule`: no Candidate contains any act, receipt or status that creates, parses, reviews, reconciles, vetoes, approves, accepts, roots or hands off that exact Candidate.

2.2.2 `causeAndEffect`: self-membership lets an object award itself validity and creates a circular authority path.

2.2.3 `sourceIds`: `TRD-P0-001`; `MPSA-20260829-P0-002`; `MSAF-20260829-F002`; `BCA2-REQ-001`.

2.2.4 `acceptancePredicate`: all self-membership, ancestor, backward-approval and same-generation credit vectors are rejected by both parsers.

## 2.3 `TRD2-REQ-003` — Five identity and denominator domains

2.3.1 `rule`: define distinct `BootstrapAct`, `CandidateLifecycleAct`, `PlanningGenerationTask`, `ProgramTask` and `ServiceLifecycleTask` domains and denominators.

2.3.2 `causeAndEffect`: mixing governance, plan generation, build work and recurring operations creates self-authorization and false completion.

2.3.3 `sourceIds`: `TRD-P0-001`; `MSAF-20260829-F002`; `MSAF-20260829-F024`; `BCA2-REQ-013`; `BCA2-REQ-019`; `BCA2-REQ-020`; `BCA2-REQ-021`; `BCA2-REQ-022`; `BCA2-REQ-023`.

2.3.4 `acceptancePredicate`: every admitted Work identity belongs to exactly one domain; cross-domain views use a unique-ID union and never duplicate hours or credit.

## 2.4 `TRD2-REQ-004` — Detached Acceptance envelope

2.4.1 `rule`: Definition, Generation-plan, Program-registry and Master subjects each receive a separate immutable Acceptance envelope outside the subject root.

2.4.2 `causeAndEffect`: adding approval status inside frozen bytes changes the bytes and invalidates prior review.

2.4.3 `sourceIds`: `TRD-P0-003`; `MPSA-20260829-P0-002`; `MSAF-20260829-F002`; `BCA2-REQ-005`.

2.4.4 `acceptancePredicate`: every envelope binds exact subject, Evidence, QA, Reviews, reconciliation, veto, user-approval observation, authority epoch and expected head without changing the subject.

## 2.5 `TRD2-REQ-005` — Immutable successor generations

2.5.1 `rule`: any subject-byte or admitted-source change creates generation `n+1`; no rejected or reviewed generation is patched in place.

2.5.2 `causeAndEffect`: in-place correction lets old signatures appear to cover new content.

2.5.3 `sourceIds`: `TRD-P0-001`; `TRD-P1-003`; `MPSA-20260829-P0-002`; `MSAF-20260829-F019`; `BCA2-REQ-003`.

2.5.4 `acceptancePredicate`: two complete generation vectors show old receipts remain bound only to the old root; successor creation never carries closure automatically.

## 2.6 `TRD2-REQ-006` — Scoped materialization permits

2.6.1 `rule`: define `DefinitionMaterializationPermit` and `PlanningGenerationExecutionPermit` with exact root, scope, issuer authority, expected head, epoch, issuedAt, expiresAt, revocation and permitted output namespace.

2.6.2 `causeAndEffect`: prose prohibition alone cannot prevent draft Definitions from issuing apparently canonical identities.

2.6.3 `sourceIds`: `TRD-P0-008`; `BCA2-REQ-006`; `BCA2-REQ-044`.

2.6.4 `acceptancePredicate`: absent, wrong-root, draft-root, expired, revoked, replayed or wrong-scope permit yields zero admitted records and terminal `MATERIALIZATION-BLOCKED`.

# 3. Total type system and deterministic bytes

## 3.1 `TRD2-REQ-007` — Total scalar and tagged-union registry

3.1.1 `rule`: define every referenced scalar and union, including Genesis/null, typed Unknown, IDs, roots, epochs, bounded integers, duration, confidence, claims and terminals.

3.1.2 `causeAndEffect`: an undefined type lets two valid-looking parsers assign different meaning to the same field.

3.1.3 `sourceIds`: `TRD-P1-001`; `TRD-P1-002`; `MPSA-20260829-P1-004`; `MPSA-20260829-P2-001`.

3.1.4 `acceptancePredicate`: schema reference closure is 100%; every valid and invalid scalar/union vector has one identical terminal under both parsers.

## 3.2 `TRD2-REQ-008` — Typed unknown is not a success value

3.2.1 `rule`: encode Unknown as a tagged object with reason, source attempt, safe state and resolution authority; never encode it as omission, null, zero, false or empty string.

3.2.2 `causeAndEffect`: collapsing Unknown into a normal scalar can silently open a Gate or create a guessed limit.

3.2.3 `sourceIds`: `TRD-P1-001`; `MPSA-20260829-P1-005`; `MSAF-20260829-F016`; `BCA2-REQ-036`.

3.2.4 `acceptancePredicate`: all coercion vectors fail closed; Unknown cannot satisfy a success Join, nonzero limit, role appointment, source freshness or duration bound.

## 3.3 `TRD2-REQ-009` — Integer canonical units

3.3.1 `rule`: store effort, duration, size, count, rate and money as bounded integers in explicit units; decimal or floating-point planning values are forbidden in canonical records.

3.3.2 `causeAndEffect`: floating representation and implicit units produce cross-parser root and arithmetic drift.

3.3.3 `sourceIds`: `TRD-P0-002`; `TRD-P1-011`; `MSAF-20260829-F003`; `MSAF-20260829-F022`.

3.3.4 `acceptancePredicate`: vectors for leading zeros, exponent form, negative zero, overflow, unit mismatch and non-integer values are rejected identically.

## 3.4 `TRD2-REQ-010` — Versioned JSON Schema and canonical JSON

3.4.1 `rule`: use one pinned JSON Schema dialect and RFC8785/JCS-compatible canonical JSON profile after mandatory UTF-8/NFC validation; every record declares schema ID and version.

3.4.2 `causeAndEffect`: prose field ordering cannot guarantee identical bytes or roots across implementations.

3.4.3 `sourceIds`: `TRD-P0-002`; `TRD-P1-019`; `PSTA-20260829-P2-004`.

3.4.4 `acceptancePredicate`: two independent implementations reproduce the exact canonical bytes and SHA-256 for every valid vector and reject every normalization or schema ambiguity.

## 3.5 `TRD2-REQ-011` — Domain-separated root construction

3.5.1 `rule`: every identity/root preimage uses a versioned domain label plus unambiguous length framing of canonical bytes; full SHA-256 is authoritative and display prefixes are non-authoritative.

3.5.2 `causeAndEffect`: delimiter concatenation, prefix collision or domain reuse can bind one receipt to another object class.

3.5.3 `sourceIds`: `TRD-P0-002`; `TRD-P1-019`; `MPSA-20260829-P0-002`.

3.5.4 `acceptancePredicate`: delimiter, prefix, Unicode-confusable, class-substitution and truncated-collision attack vectors fail closed without suffixes or randomness.

## 3.6 `TRD2-REQ-012` — Deterministic ID constructors

3.6.1 `rule`: define constructors for every Source, Statement, Requirement, Question, Decision, Finding, Task, Output, Test, Evidence, Edge, Join, Gate, Scope, Package, Wait, Role, Appointment, Resource, Mutex, Candidate and Acceptance object.

3.6.2 `causeAndEffect`: ad-hoc counters or missing constructors allow identity collision, silent renumbering and lost crosswalks.

3.6.3 `sourceIds`: `TRD-P0-002`; `TRD-P0-006`; `MPSA-20260829-P0-005`; `MSAF-20260829-F026`.

3.6.4 `acceptancePredicate`: constructor registry is finite; two implementations produce identical full roots; collision yields rejection and Definition successor, never `Math.random()` or unapproved cryptographic randomness.

## 3.7 `TRD2-REQ-013` — Immutable record envelope and fork rejection

3.7.1 `rule`: every mutable logical object uses immutable record versions with record root, Genesis marker, previous root, sequence, expected head, supersession reason and fork/conflict state.

3.7.2 `causeAndEffect`: without a defined Genesis and chain, two successors can both claim to be current.

3.7.3 `sourceIds`: `TRD-P1-003`; `TRD-P1-004`; `BCA2-REQ-014`; `BCA2-REQ-046`.

3.7.4 `acceptancePredicate`: valid successor, replay, stale head, fork, gap, rollback, superseded and lost-response vectors converge to one authoritative head or `CONFLICT-BLOCKED`.

## 3.8 `TRD2-REQ-014` — Cross-platform workspace path profile

3.8.1 `rule`: define repository-relative canonical paths plus explicit repoRootId; reject traversal, symlink escape, hard-link ambiguity, Unicode/case aliases, separator variants, reserved names and wrong Git root.

3.8.2 `causeAndEffect`: absolute-path containment alone can accept a semantically different file or evidence from the outer Repository.

3.8.3 `sourceIds`: `TRD-P1-018`; `MPSA-20260829-P1-010`; `MSAF-20260829-F011`; `BCA2-REQ-048`.

3.8.4 `acceptancePredicate`: two independent path scanners agree; the canonical app root passes; outer-root and every attack vector fail before any Source/Git/Evidence operation.

## 3.9 `TRD2-REQ-015` — Schema registry and migration lifecycle

3.9.1 `rule`: define schema IDs, versions, compatibility class, migration, tombstone, last-reader proof, deprecation, invalidation and zero-silent-fallback rules.

3.9.2 `causeAndEffect`: changing a Definition without a migration can reinterpret old records while retaining their apparent status.

3.9.3 `sourceIds`: `TRD-P2-005`; `MPSA-20260829-P1-007`; `MPSA-20260829-P2-002`.

3.9.4 `acceptancePredicate`: every old version has exactly one explicit disposition; incompatible input never falls back to a newer/older parser silently.

# 4. Sources, statements, Requirements and Decisions

## 4.1 `TRD2-REQ-016` — Source record and authority class

4.1.1 `rule`: define finite Source records with bytes/root, locator, media type, authority class, exact-subject scope, effective observation, expiry, change trigger, legal/capture state and claim limit.

4.1.2 `causeAndEffect`: a URL or filename alone cannot prove which bytes or authority governed a Requirement.

4.1.3 `sourceIds`: `TRD-P1-013`; `PSTA-20260829-P0-001`; `PSTA-20260829-P0-004`; `TRD2-REQ-001`.

4.1.4 `acceptancePredicate`: both primary specifications and every admitted Decision/framework source resolve to exact records; stale/unavailable sources invoke their safe state.

## 4.2 `TRD2-REQ-017` — Reproducible statement locators

4.2.1 `rule`: text uses exact line/byte spans; PDF uses page plus reproducible bounding region and normalized text span tied to render/text roots.

4.2.2 `causeAndEffect`: category labels cannot prove that every source statement was read or prevent one sentence from disappearing.

4.2.3 `sourceIds`: `PSTA-20260829-P0-002`; `PSTA-20260829-P0-004`; `PSTA-20260829-P3-001`.

4.2.4 `acceptancePredicate`: two independent extractors reconstruct the same statement set and locators; every source byte/region is classified or explicitly excluded with reason.

## 4.3 `TRD2-REQ-018` — Atomic Requirement and statement classification

4.3.1 `rule`: split by actor, action, object, condition, scope and acceptance effect; classify every statement as `MUST|SHOULD|MAY|QUESTION|EXAMPLE|RECOMMENDATION|FUTURE|CONTEXT|NON-REQUIREMENT`.

4.3.2 `causeAndEffect`: examples, questions and future ideas must not become current acceptance requirements accidentally.

4.3.3 `sourceIds`: `TRD-P0-006`; `PSTA-20260829-P0-002`; `PSTA-20260829-P0-008`; `PSTA-20260829-P1-001`; `PSTA-20260829-P1-002`; `PSTA-20260829-P1-003`; `PSTA-20260829-P1-004`.

4.3.4 `acceptancePredicate`: every span has one class; examples add no quota; questions add no answer; future items require a Gate; compound Requirements are rejected and split.

## 4.4 `TRD2-REQ-019` — Question and critical-decision records

4.4.1 `rule`: define `Q001`–`Q083` plus the ten Section16 critical-decision observations with exact locator, subject, priority, state, answer/Decision edge, scope and safe state.

4.4.2 `causeAndEffect`: the current 27-category view contains zero explicit Question records and can hide unanswered policy.

4.4.3 `sourceIds`: `PSTA-20260829-P0-003`; `PSTA-20260829-P0-007`; `MPSA-20260829-P0-006`.

4.4.4 `acceptancePredicate`: 83/83 Question IDs and 10/10 critical-decision observations exist once; unanswered remains typed Unknown and fail-closed; no Question is silently treated as a Requirement answer.

## 4.5 `TRD2-REQ-020` — Versioned Decision and amendment chain

4.5.1 `rule`: each D01–D31 and amendment/reconciliation records subject key, selected value, scope, source root, predecessor, status, approvals, effective time, expiry, safe state and affected identities.

4.5.2 `causeAndEffect`: mutable prose lets later decisions such as Public repository, Hebrew-first Pilot and Human-approved AI disappear behind older requirements.

4.5.3 `sourceIds`: `PSTA-20260829-P0-007`; `MPSA-20260829-P0-006`; `MPSA-20260829-P0-007`; `TRD2-REQ-001`.

4.5.4 `acceptancePredicate`: every Decision has one active exact-subject successor; D18-A2 selects Public; Q23 pre-charter cap is zero; conflicting active values are rejected.

## 4.6 `TRD2-REQ-021` — Framework role and version registry

4.6.1 `rule`: classify each framework as Governance, Control catalogue, Verification standard, Test guide, Awareness, Threat intelligence, Provider guidance or Legal authority and bind an exact version/root.

4.6.2 `causeAndEffect`: awareness lists or `latest` URLs cannot prove requirement-level verification or compliance.

4.6.3 `sourceIds`: `TRD-P1-013`; `TRD-P2-003`; `MPSA-20260829-P0-005`; `CONNECT-CYBER-FRAMEWORK-AND-PUBLIC-REPOSITORY-SOURCE-REFRESH-2026-08-29`.

4.6.4 `acceptancePredicate`: every framework claim stays within its role; stable-version selection is explicit; draft/changed source creates a reviewed Delta and no silent Gate credit.

## 4.7 `TRD2-REQ-022` — Provider documentation is not live entitlement

4.7.1 `rule`: separate documentation observation, account/plan/region observation, provider receipt, legal approval, implementation and live Evidence states.

4.7.2 `causeAndEffect`: published limits or features do not prove they apply to the exact Connect account, entity or asset.

4.7.3 `sourceIds`: `TRD-P1-013`; `TRD-P2-003`; `MSAF-20260829-F016`; `CONNECT-CYBER-FRAMEWORK-AND-PUBLIC-REPOSITORY-SOURCE-REFRESH-2026-08-29`.

4.7.4 `acceptancePredicate`: missing/stale/429/conflicting provider observation yields typed Unknown and disables the dependent capability; no documentation-only Ready state exists.

## 4.8 `TRD2-REQ-023` — Forward and inverse authority graph

4.8.1 `rule`: materialize `Source→Statement→Requirement/Question→Decision→Stage→Task→Test→Evidence→Gate` plus exact inverse edges.

4.8.2 `causeAndEffect`: one-way category tables can omit Requirements or allow unsupported Tasks while still claiming coverage.

4.8.3 `sourceIds`: `TRD-P0-006`; `PSTA-20260829-P0-005`; `PSTA-20260829-P1-005`; `PSTA-20260829-P2-003`.

4.8.4 `acceptancePredicate`: zero orphan in both directions; every conflict/variant preserved; every `local-complete` claim derives from all admitted children and exact Evidence rather than prose.

## 4.9 `TRD2-REQ-024` — Stage, capability, Scope and route mapping

4.9.1 `rule`: define one registry linking source Sections, the historical 21 capability packages, S00–S28, Scope manifests, route/surface IDs and Gate instances without numeric alias ambiguity.

4.9.2 `causeAndEffect`: overlapping Section/Stage/Gate numbers and unmapped packages can remove a whole work partition.

4.9.3 `sourceIds`: `TRD-P0-006`; `MPSA-20260829-P2-004`; `MSAF-20260829-F015`; `MSAF-20260829-F026`.

4.9.4 `acceptancePredicate`: every identity maps once or through reviewed many-to-many membership; no free Gate name, implicit range, category loss or unexplained overlap remains.

## 4.10 `TRD2-REQ-025` — Conflict, variant and supersession records

4.10.1 `rule`: preserve differences between the two specifications and later Decisions as field-level Conflict/Variant/Supersession records with authority, scope, safe state and resolution predicate.

4.10.2 `causeAndEffect`: implicit union or overwrite can activate a broad SaaS, Billing, recurring, multilingual or autonomous-AI requirement during the narrower Pilot.

4.10.3 `sourceIds`: `PSTA-20260829-P1-005`; `PSTA-20260829-P0-007`; `TRD2-REQ-020`.

4.10.4 `acceptancePredicate`: every observed conflict has exactly one open/resolved disposition; resolution never deletes provenance; unresolved conflict blocks the affected Task/Gate.

# 5. People, execution objects and auditable results

## 5.1 `TRD2-REQ-026` — Person, Role, Appointment and authority

5.1.1 `rule`: define immutable Person references, Role definitions and time-bounded Appointment records with issuer, exact subject/scope, primary/backup relation, eligibility proof, conflict-of-interest state, start, expiry and revocation.

5.1.2 `causeAndEffect`: a role label such as Security, Legal or Approver does not prove that a named person held that authority for the exact act and time.

5.1.3 `sourceIds`: `BCA2-REQ-033`; `BCA2-REQ-041`; `TRD2-REQ-008`.

5.1.4 `acceptancePredicate`: every authority-bearing act resolves to one eligible active Appointment; self-appointment, missing backup where required, expired, revoked, wrong-scope and same-person independence vectors fail closed.

## 5.2 `TRD2-REQ-027` — Total Task-leaf schema

5.2.1 `rule`: every future Task leaf must contain immutable identity, work domain, stage/package/scope, source requirements, objective, ordered procedure, inputs, outputs, tests, evidence predicates, dependencies, resources, role appointments, estimate state, external waits, risk/safe state and completion terminal.

5.2.2 `causeAndEffect`: a title and estimate are not executable; omitted tests, authority or safe-state fields allow prose to masquerade as complete work.

5.2.3 `sourceIds`: `TRD-P0-004`; `TRD-P1-005`; `MPSA-20260829-P1-001`; `BCA2-REQ-007`; `BCA2-REQ-010`.

5.2.4 `acceptancePredicate`: schema reference closure is complete; every field is required or a typed inapplicable record with reason; zero Task can be admitted before an accepted Program-registry generation.

## 5.3 `TRD2-REQ-028` — Output identity and acceptance contract

5.3.1 `rule`: define Output as an exact immutable artifact or external receipt with producer Task, canonical path/locator, media/schema, expected properties, digest/version, confidentiality, retention class and accepting Test set.

5.3.2 `causeAndEffect`: “document created” or “API configured” cannot prove which bytes or provider object were evaluated.

5.3.3 `sourceIds`: `BCA2-REQ-012`; `BCA2-REQ-015`; `TRD2-REQ-027`.

5.3.4 `acceptancePredicate`: every Output is produced by exactly one admitted Task version, consumed only through explicit edges and receives no credit without its complete Test and Evidence set.

## 5.4 `TRD2-REQ-029` — Test definition and exact result binding

5.4.1 `rule`: define Test purpose, target root/version, preconditions, deterministic procedure, expected observation, failure terminal, runner identity/version, environment, time, result root and Evidence output.

5.4.2 `causeAndEffect`: a test name or historical pass can be replayed against changed code, data, configuration or policy.

5.4.3 `sourceIds`: `TRD-P0-005`; `TRD-P1-014`; `BCA2-REQ-040`; `TRD2-REQ-028`.

5.4.4 `acceptancePredicate`: stale-target, altered-runner, missing-precondition, skipped, flaky-unresolved, wrong-environment and result-without-raw-Evidence vectors cannot satisfy a Gate.

## 5.5 `TRD2-REQ-030` — Mutation and negative-test records

5.5.1 `rule`: define intentional Mutation vectors over schema, graph, source, authority, time, path, estimate, Evidence and security boundaries with exact expected rejection terminal.

5.5.2 `causeAndEffect`: positive examples alone do not prove that unsafe near-valid inputs are rejected.

5.5.3 `sourceIds`: `TRD-P1-002`; `TRD-P1-014`; `BCA2-REQ-040`; `TRD2-REQ-029`.

5.5.4 `acceptancePredicate`: each safety invariant has at least one minimal negative vector and one boundary vector under two independent parsers; surviving forbidden mutations are P0.

## 5.6 `TRD2-REQ-031` — Evidence identity, provenance and claim limit

5.6.1 `rule`: Evidence binds subject root, claim type, collector, method, raw locator/root, environment, observation time, freshness, integrity, confidentiality, redaction, retention, source authority and explicit claim limit.

5.6.2 `causeAndEffect`: an image, log excerpt or success statement can be valid bytes yet prove the wrong tenant, environment, version or time.

5.6.3 `sourceIds`: `TRD-P0-005`; `TRD-P1-012`; `BCA2-REQ-012`; `BCA2-REQ-015`.

5.6.4 `acceptancePredicate`: every claim resolves to sufficient fresh Evidence for that exact subject; copied, self-declared, stale, wrong-scope, over-claimed, secret-bearing or mutable-only evidence fails closed.

## 5.7 `TRD2-REQ-032` — Closed claim vocabulary and derivation

5.7.1 `rule`: define finite claim states such as `OBSERVED`, `PLANNED`, `IMPLEMENTED`, `TESTED`, `VERIFIED`, `ACCEPTED`, `LIVE-ENTITLED`, `PRODUCTION-READY`, `UNKNOWN` and `REJECTED` with allowed derivation edges.

5.7.2 `causeAndEffect`: words such as done, ready, supported or secured conflate planning, code presence, local tests, provider entitlement and production proof.

5.7.3 `sourceIds`: `TRD-P1-012`; `TRD-P1-017`; `MPSA-20260829-P0-003`; `TRD2-REQ-022`; `TRD2-REQ-031`.

5.7.4 `acceptancePredicate`: no stronger claim derives from a weaker one; every displayed status is computed from exact admitted children; unrecognized prose status yields `CLAIM-INVALID`.

## 5.8 `TRD2-REQ-033` — Error taxonomy and fail-closed terminals

5.8.1 `rule`: define exhaustive typed terminals for invalid, unknown, blocked, expired, superseded, stale, conflict, unavailable, rejected, revoked, retryable and fatal states plus their permitted recovery authority.

5.8.2 `causeAndEffect`: generic failure or silent fallback lets different operators recover differently and may reopen an unsafe capability.

5.8.3 `sourceIds`: `TRD-P1-001`; `MPSA-20260829-P1-008`; `BCA2-REQ-046`; `TRD2-REQ-008`.

5.8.4 `acceptancePredicate`: every invalid vector reaches exactly one safe terminal; no terminal converts to success through retry, omission, default, exception swallowing or status text.

# 6. Graph, Gate, Scope and constrained execution

## 6.1 `TRD2-REQ-034` — Typed Edge registry

6.1.1 `rule`: define a finite Edge registry with exact from/to domains, direction, condition, cardinality, admission effect, credit effect, schedule effect, invalidation propagation and cycle policy.

6.1.2 `causeAndEffect`: prose dependencies cannot distinguish authority, prerequisite, evidence, supersession, schedule, resource and traceability relations.

6.1.3 `sourceIds`: `BCA2-REQ-027`; `BCA2-REQ-028`; `TRD2-REQ-023`.

6.1.4 `acceptancePredicate`: every graph edge is schema-valid; forbidden domain pairs and implicit edges are rejected; all acyclic subgraphs pass independent cycle and topological-order checks.

## 6.2 `TRD2-REQ-035` — Join and Condition semantics

6.2.1 `rule`: define explicit `ALL`, `ANY`, `QUORUM`, `ORDERED`, `CONDITIONAL` and `NOT-APPLICABLE` joins with bounded members, evaluation order, Unknown propagation and short-circuit rules.

6.2.2 `causeAndEffect`: a comma-separated prerequisite list cannot prove whether all, one or a quorum must pass.

6.2.3 `sourceIds`: `TRD-P1-006`; `TRD-P1-007`; `BCA2-REQ-027`; `TRD2-REQ-008`.

6.2.4 `acceptancePredicate`: truth tables cover every success/failure/Unknown combination; empty joins, hidden defaults, circular conditions and `ANY` used for mandatory controls fail closed.

## 6.3 `TRD2-REQ-036` — Gate instance and veto semantics

6.3.1 `rule`: Gate instances bind exact scope/generation, required predicates, evidence set, named authority, veto set, expiry, reopen triggers and one immutable decision receipt.

6.3.2 `causeAndEffect`: a named Gate without instance identity can be passed once and reused for another scope or changed subject.

6.3.3 `sourceIds`: `TRD-P0-007`; `BCA2-REQ-016`; `BCA2-REQ-042`; `TRD2-REQ-004`.

6.3.4 `acceptancePredicate`: missing predicate, open veto, Unknown, stale evidence, wrong authority, wrong root, expiry or scope mismatch yields `GATE-BLOCKED`; Gate29 never authorizes implementation, Push or Deploy.

## 6.4 `TRD2-REQ-037` — Finding, severity and disposition

6.4.1 `rule`: define Finding identity, exact subject/locator, invariant, defect, impact, severity basis, exploit/trigger, remediation, acceptance predicate, dependencies, status, owner appointment, evidence and immutable disposition history.

6.4.2 `causeAndEffect`: merging findings by similar title can hide distinct defects; closing by prose can erase the required predicate.

6.4.3 `sourceIds`: `TRD-P0-009`; `MPSA-20260829-P0-004`; `BCA2-REQ-042`; `BCA2-REQ-043`.

6.4.4 `acceptancePredicate`: every reviewer-local Finding remains individually addressable; downgrade, duplicate, risk acceptance, false positive and closure require separate authorized records and exact Evidence.

## 6.5 `TRD2-REQ-038` — Scope and conditional-package activation

6.5.1 `rule`: define immutable Scope manifests and Package instances with included/excluded Requirement and Task identities, activation Decision, prerequisites, expiry, safe default and mutually exclusive variant rules.

6.5.2 `causeAndEffect`: broad future SaaS capabilities can leak into a single-tenant closed Pilot or be counted as current work without an activation decision.

6.5.3 `sourceIds`: `TRD-P1-010`; `MPSA-20260829-P0-001`; `BCA2-REQ-022`; `BCA2-REQ-030`; `TRD2-REQ-025`.

6.5.4 `acceptancePredicate`: Pilot and Post-Pilot scopes produce disjoint explicit activation views; inactive packages receive zero denominator, hours, readiness and Gate credit.

## 6.6 `TRD2-REQ-039` — Resource identity and eligibility

6.6.1 `rule`: define human, service, environment, account, asset and tool Resources with capacity/entitlement observation, scope, region, owner, availability, constraints, cost class, freshness and safe state.

6.6.2 `causeAndEffect`: assuming a developer, provider plan, WABA, database, runner or scanner exists creates an infeasible schedule and unsafe Tasks.

6.6.3 `sourceIds`: `BCA2-REQ-017`; `BCA2-REQ-033`; `BCA2-REQ-034`; `TRD2-REQ-022`.

6.6.4 `acceptancePredicate`: a Task assignment requires every Resource to be observed, eligible and available for the exact window; Unknown or stale entitlement blocks assignment and ETA.

## 6.7 `TRD2-REQ-040` — Capacity calendar

6.7.1 `rule`: define versioned working calendars per human/resource with timezone, bounded availability intervals, leave, non-project allocation, skills, parallelism cap, source observation and freshness.

6.7.2 `causeAndEffect`: person-hours cannot be converted into calendar time without observed capacity and timezone-aware availability.

6.7.3 `sourceIds`: `BCA2-REQ-024`; `BCA2-REQ-034`; `BCA2-REQ-031`; `TRD2-REQ-039`.

6.7.4 `acceptancePredicate`: missing, overlapping, negative, stale or over-allocated intervals yield `CALENDAR-UNKNOWN`; no default full-time calendar or invented velocity is allowed.

## 6.8 `TRD2-REQ-041` — Mutex, concurrency and environment lock

6.8.1 `rule`: define Mutex identities, members, capacity, acquisition order, lease/fencing token, timeout, release, deadlock rule and environment-change exclusion.

6.8.2 `causeAndEffect`: Tasks that share one WABA, database migration slot, credential, deployment environment or reviewer may be impossible or unsafe in parallel.

6.8.3 `sourceIds`: `BCA2-REQ-035`; `BCA2-REQ-030`; `TRD2-REQ-034`.

6.8.4 `acceptancePredicate`: schedules never exceed capacity; unordered multi-lock, stale lease, concurrent exclusive mutation and unbounded lock wait vectors fail closed.

# 7. Estimate, Actual, waiting and schedule mathematics

## 7.1 `TRD2-REQ-042` — External request, wait and receipt

7.1.1 `rule`: separate authorized ExternalRequest, non-labor ExternalWait and ExternalReceipt with provider/authority, request root, prerequisites, issued time, SLA observation range, expiry, retry/escalation policy and safe state.

7.1.2 `causeAndEffect`: review, procurement, Meta approval, DNS, legal advice and provider provisioning wait time are neither implementation hours nor guaranteed calendar durations.

7.1.3 `sourceIds`: `BCA2-REQ-017`; `BCA2-REQ-024`; `BCA2-REQ-036`; `BCA2-REQ-037`.

7.1.4 `acceptancePredicate`: waits add zero labor Actual/ETC; absent receipt keeps dependent work blocked; retry never fabricates receipt or resets a hard deadline silently.

## 7.2 `TRD2-REQ-043` — Estimate, Actual, ETC and Credit

7.2.1 `rule`: define estimate ranges, estimator/source, confidence class, basis, freshness, Actual ledger, remaining ETC, binary evidence-based Credit and unique-work aggregation as distinct objects.

7.2.2 `causeAndEffect`: a prose estimate or percent complete can double-count shared work, hide uncertainty and convert elapsed time into progress.

7.2.3 `sourceIds`: `BCA2-REQ-018`; `BCA2-REQ-025`; `BCA2-REQ-026`; `MPSA-20260829-P0-007`; `MPSA-20260829-P0-008`.

7.2.4 `acceptancePredicate`: no Task has Credit without all predicates; no shared Task is summed twice; unknown estimates/capacity remain Unknown; Actual never reduces required Evidence.

## 7.3 `TRD2-REQ-044` — Feasible schedule snapshot

7.3.1 `rule`: derive immutable low/high feasible schedule snapshots only from accepted DAG, admitted scopes, estimate ranges, assignment eligibility, calendars, mutexes, external-wait observations and an explicit as-of root.

7.3.2 `causeAndEffect`: summing leaf hours does not account for dependencies, people, parallelism, blocked providers or calendar availability.

7.3.3 `sourceIds`: `BCA2-REQ-030`; `BCA2-REQ-031`; `BCA2-REQ-053`; `MPSA-20260829-P0-009`; `MPSA-20260829-P0-010`.

7.3.4 `acceptancePredicate`: independent schedulers return the same deterministic bounds; infeasible, underconstrained, stale or partially estimated input yields typed Unknown rather than a date.

# 8. Data safety, retention, deletion and recovery

## 8.1 `TRD2-REQ-045` — DataClass and lifecycle separation

8.1.1 `rule`: define atomic DataClass records by purpose, subject, controller/processor role, store, jurisdiction, active lifecycle, legal basis, retention trigger set, backup behavior, deletion authority and Evidence restrictions.

8.1.2 `causeAndEffect`: mixing messages, contacts, consent, audit, billing, security logs and backups under one lifetime can delete required records or retain personal data too long.

8.1.3 `sourceIds`: `TRD-P0-010`; `TRD-P1-015`; `TRD2-REQ-018`; `TRD2-REQ-038`.

8.1.4 `acceptancePredicate`: each record maps to exactly one lifecycle-homogeneous DataClass; mixed triggers/lifetimes require a split; Unknown classification blocks ingestion and deletion.

## 8.2 `TRD2-REQ-046` — Retention trigger matrix and Legal Hold

8.2.1 `rule`: define the finite legal trigger matrix per DataClass, active-record exclusion, tenant/subject scope, clock source, pause/restart semantics, Legal Hold precedence, authority and immutable hold/release receipts.

8.2.2 `causeAndEffect`: a generic “older than N days” rule can erase active conversations, consent evidence, disputes or records under Legal Hold.

8.2.3 `sourceIds`: `TRD-P0-010`; `TRD-P1-015`; `TRD2-REQ-020`; `TRD2-REQ-045`.

8.2.4 `acceptancePredicate`: forbidden trigger/DataClass pairs, active records, open Hold, unknown legal basis, clock rollback and unauthorized release all produce `RETENTION-BLOCKED`.

## 8.3 `TRD2-REQ-047` — Deletion Plan v2

8.3.1 `rule`: define a short-lived immutable deletion Plan with plan ID/root, policy/version/root, exact tenant/DataClass/store identities, cutoff, eligible record identities/version roots, provider preflight confirmations, creator/approver separation, expiry and single-use state.

8.3.2 `causeAndEffect`: recomputing a broad query during execution can delete records added, reactivated, held or changed after review.

8.3.3 `sourceIds`: `TRD-P0-010`; `TRD-P1-015`; `TRD2-REQ-004`; `TRD2-REQ-046`.

8.3.4 `acceptancePredicate`: expired, changed-policy, wrong-cutoff, identity drift, missing provider confirmation, changed Legal Hold, reused or self-approved Plan cannot execute.

## 8.4 `TRD2-REQ-048` — Atomic bounded deletion and post-delete Audit

8.4.1 `rule`: deletion executes atomically or as a provider-defined bounded transaction only over identities and versions in the valid Plan, with precondition checks at mutation time, idempotency, tombstone/receipt and immutable failure accounting.

8.4.2 `causeAndEffect`: verifying after deletion cannot restore wrongly deleted data and therefore is Audit, not a safety control.

8.4.3 `sourceIds`: `TRD-P0-010`; `TRD-P1-015`; `TRD2-REQ-031`; `TRD2-REQ-047`.

8.4.4 `acceptancePredicate`: over-broad, partial-unaccounted, changed-version, changed-Hold, out-of-cutoff and replay vectors mutate zero unauthorized identities; post-delete checks receive no prevention credit.

## 8.5 `TRD2-REQ-049` — Backup Evidence v2

8.5.1 `rule`: bind each Backup to exact `backupId`, provider object/version IDs, source snapshot root, manifest root, per-object digest/size, encryption/key-version reference, region, start/end, consistency boundary, lifecycle expiry and independent integrity Evidence.

8.5.2 `causeAndEffect`: a job-success receipt does not prove that all required objects exist, are consistent, decryptable or retained for the promised window.

8.5.3 `sourceIds`: `TRD-P1-016`; `TRD2-REQ-022`; `TRD2-REQ-031`; `TRD2-REQ-045`.

8.5.4 `acceptancePredicate`: completeness, exact R2 object/version consistency, digest, encryption, retention-age and restore-reference checks all pass; lifecycle configuration alone proves no retention duration.

## 8.6 `TRD2-REQ-050` — Restore Evidence v2, RPO and RTO

8.6.1 `rule`: every Restore attempt references one exact `backupId` and manifest root, target-isolated environment, requested recovery point, started/usable/verified times, restored object digests, application consistency tests, cleanup and signed result.

8.6.2 `causeAndEffect`: a successful command or unrelated restore test cannot prove recoverability, data age, completeness or measured recovery time for the claimed Backup.

8.6.3 `sourceIds`: `TRD-P1-016`; `TRD2-REQ-029`; `TRD2-REQ-031`; `TRD2-REQ-049`.

8.6.4 `acceptancePredicate`: wrong/unlinked backup, digest mismatch, non-isolated target, missing application checks, unmeasured interval or stale exercise cannot satisfy RPO/RTO/restore-readiness claims.

# 9. Security values, Public repository and durable artifacts

## 9.1 `TRD2-REQ-051` — SecurityValue and use-specific X24

9.1.1 `rule`: classify IDs, keys, tokens, nonces, salts, challenges and secrets by security purpose; require an exact use-specific X24 approval record for any cryptographic randomness, including constructor, entropy source, length, storage, rotation and threat.

9.1.2 `causeAndEffect`: deterministic IDs are correct for content identity but unsafe for secrets; blanket approval does not authorize `crypto.randomUUID()` or any CSPRNG use.

9.1.3 `sourceIds`: `MSSA-F008`; `TRD2-REQ-011`; `TRD2-REQ-012`; `TRD2-REQ-020`.

9.1.4 `acceptancePredicate`: security-purpose values without exact X24 remain blocked; non-security IDs use deterministic constructors; `Math.random()` is rejected everywhere; no randomness is introduced by example or default.

## 9.2 `TRD2-REQ-052` — Secrets, PII and Evidence-safety boundary

9.2.1 `rule`: define prohibited Public content, secret/PII classifiers, redaction, encryption/reference-only rules, local/private Evidence stores, export policy, retention and incident terminal across Source, Output, log and Evidence objects.

9.2.2 `causeAndEffect`: a Public repository can expose credentials, phone numbers, message content, provider receipts or customer data even when product code is correct.

9.2.3 `sourceIds`: `MSSA-F014`; `MSSA-F024`; `TRD2-REQ-031`; `TRD2-REQ-045`.

9.2.4 `acceptancePredicate`: staged/history/package/export scans and schema checks find zero prohibited value; any suspected secret or PII blocks publication and invokes the incident workflow without printing the value.

## 9.3 `TRD2-REQ-053` — Public repository and canonical Git root

9.3.1 `rule`: bind D18-A2 Public visibility, canonical product repo root, expected remote, default branch, protected-branch/ruleset policy, review/signing/status-check requirements, Actions permissions, dependency/security alerts and private disclosure channel.

9.3.2 `causeAndEffect`: two local Git roots and an unprotected Public remote can publish the wrong tree, bypass review or expose unsafe history.

9.3.3 `sourceIds`: `MSSA-F004`; `MSSA-F013`; `MSSA-F014`; `BCA2-REQ-047`; `BCA2-REQ-048`; `BCA2-REQ-049`.

9.3.4 `acceptancePredicate`: canonical-root and remote identities match; outer repo receives zero authority; required live GitHub controls have fresh receipts; Public remains binding and is never “fixed” by making the repository Private.

## 9.4 `TRD2-REQ-054` — Exact-diff Git mutation permit

9.4.1 `rule`: define a single-use short-lived Git mutation permit with expected base/head, allowed paths, exact diff root, actor, branch, remote, prohibited content scan receipts and permitted operation.

9.4.2 `causeAndEffect`: approval to continue planning or make changes is not approval to publish unrelated dirty files, secrets or a different commit.

9.4.3 `sourceIds`: `BCA2-REQ-050`; `MSSA-F013`; `MSSA-F014`; `TRD2-REQ-052`; `TRD2-REQ-053`.

9.4.4 `acceptancePredicate`: changed base/diff/path/branch/remote, dirty unlisted content, failed scan, expiry, replay or missing review yields `GIT-MUTATION-BLOCKED`; Definition acceptance itself creates no Push permit.

## 9.5 `TRD2-REQ-055` — Durable A01–A09 artifact registry

9.5.1 `rule`: define every required planning artifact with stable ID, exact path, raw/canonical root, schema, producer act, input roots, status, freeze time, successor, confidentiality and detached Evidence/Review references.

9.5.2 `causeAndEffect`: temporary files or remembered hashes cannot be independently replayed, reviewed or included in an immutable Master root.

9.5.3 `sourceIds`: `MSSA-F003`; `MSSA-F024`; `BCA2-REQ-012`; `BCA2-REQ-015`; `TRD2-REQ-001`.

9.5.4 `acceptancePredicate`: all required artifacts are durable and read back byte-for-byte; missing, temporary-only, path-aliased or digest-mismatched artifacts block root assembly.

# 10. Candidate lifecycle, independent review and protected acceptance

## 10.1 `TRD2-REQ-056` — Candidate and Evidence packet schemas

10.1.1 `rule`: define immutable Candidate, Producer-QA and Review-packet schemas that bind exact subject/source/schema/tool roots, conformance results, finding set, exclusions, presealed packet identity and expiry.

10.1.2 `causeAndEffect`: reviewers cannot be proven to have inspected the same bytes or to have remained blind to another review.

10.1.3 `sourceIds`: `MSSA-F002`; `MSSA-F003`; `BCA2-REQ-040`; `BCA2-REQ-041`; `TRD2-REQ-004`.

10.1.4 `acceptancePredicate`: packets for Review A and B bind identical Candidate/input roots; Review B is sealed before Review A disclosure; producer output cannot write reviewer fields.

## 10.2 `TRD2-REQ-057` — Review assertions and independence

10.2.1 `rule`: every review assertion includes reviewer Person/Appointment, independence/conflict state, method, subject root, invariant/test, observation, severity, Finding root, time and signed receipt.

10.2.2 `causeAndEffect`: a “reviewed” label cannot prove competence, independence, coverage or the exact reviewed generation.

10.2.3 `sourceIds`: `MSSA-F002`; `MSSA-F009`; `BCA2-REQ-041`; `TRD2-REQ-026`; `TRD2-REQ-037`.

10.2.4 `acceptancePredicate`: producer/reviewer, reviewer/reconciler and forbidden-role overlap fail; missing method or subject root yields zero review credit; disagreement remains explicit.

## 10.3 `TRD2-REQ-058` — Dual normalization, comparison and reconciliation

10.3.1 `rule`: two independently implemented normalizers convert complete reviewer-local records into the accepted total Finding schema; a comparison artifact enumerates strict union, exact semantic equivalence candidates, differences and one authorized disposition per identity.

10.3.2 `causeAndEffect`: current short manifests with different field sets cannot support formal cross-review equivalence or safe deduplication.

10.3.3 `sourceIds`: `TRD-P0-009`; `MPSA-20260829-P0-004`; `MSSA-F009`; `BCA2-REQ-043`; `TRD2-REQ-037`.

10.3.4 `acceptancePredicate`: both normalizers agree on canonical records; all reviewer-local identities survive; no title/topic merge; unresolved P0/P1/P2 disagreement blocks acceptance and receives zero closure.

## 10.4 `TRD2-REQ-059` — Veto, downgrade and risk acceptance

10.4.1 `rule`: define non-self-issued veto, severity-downgrade and risk-acceptance records with exact Finding root, rationale, threat/control impact, compensating controls, accountable authority, Legal/Security/Business approvals as applicable, expiry and reopen triggers.

10.4.2 `causeAndEffect`: a producer can otherwise close or downgrade a blocking defect merely by changing prose or accepting its own risk.

10.4.3 `sourceIds`: `MSSA-F009`; `MSSA-F022`; `BCA2-REQ-042`; `TRD2-REQ-026`; `TRD2-REQ-037`.

10.4.4 `acceptancePredicate`: P0 is never silently accepted; missing authority/evidence/expiry blocks; accepted risk remains visible and does not become verified control or completed remediation.

## 10.5 `TRD2-REQ-060` — Protected compare-and-swap Acceptance

10.5.1 `rule`: a protected acceptor verifies expected current head, exact Candidate and all detached QA/Review/reconciliation/veto/user-approval roots, writes one append-only Acceptance envelope and performs readback.

10.5.2 `causeAndEffect`: concurrent acceptance, lost response or stale review can point “current” to the wrong generation.

10.5.3 `sourceIds`: `MSSA-F002`; `MSSA-F003`; `BCA2-REQ-044`; `TRD2-REQ-013`; `TRD2-REQ-056`.

10.5.4 `acceptancePredicate`: stale head, duplicate, conflict, timeout, partial write or ambiguous response converges through readback to one accepted head or `ACCEPTANCE-CONFLICT`; never assumes success.

## 10.6 `TRD2-REQ-061` — Freshness, invalidation and reopen propagation

10.6.1 `rule`: define change events, dependency traversal, expiry clocks and successor rules that invalidate affected Evidence, Tests, Findings, Gates, estimates, schedules and claims without mutating historical receipts.

10.6.2 `causeAndEffect`: source, provider, code, policy, decision, schema or account changes can make a previously valid result unsafe.

10.6.3 `sourceIds`: `MSSA-F012`; `BCA2-REQ-046`; `TRD2-REQ-005`; `TRD2-REQ-034`.

10.6.4 `acceptancePredicate`: each mutation vector produces the exact affected-set under both graph engines; stale descendants lose current credit while immutable history remains replayable.

## 10.7 `TRD2-REQ-062` — Archive and offline replay

10.7.1 `rule`: archive every generation’s admitted inputs, canonical subject, schemas, parser/tool versions, Evidence, reviews, findings, decisions and acceptance envelope in a deterministic inventory that can be verified offline.

10.7.2 `causeAndEffect`: live URLs, mutable provider pages and temporary outputs cannot reproduce why a historical Gate or decision passed.

10.7.3 `sourceIds`: `MSSA-F003`; `MSSA-F012`; `MSSA-F024`; `TRD2-REQ-055`.

10.7.4 `acceptancePredicate`: an isolated verifier reconstructs all roots and authority edges without network or secret disclosure; missing archive member invalidates replayability, not historical bytes.

# 11. Reporting, conformance and attack-oriented assurance

## 11.1 `TRD2-REQ-063` — Separate progress vector and human view

11.1.1 `rule`: expose separate Bootstrap, Candidate-lifecycle, Planning-generation, Program-scope and Service-lifecycle denominators with credited/total identities, Actual, ETC, Unknown reasons and as-of root; any human numbered view derives from the same registry.

11.1.2 `causeAndEffect`: one blended percentage or manually maintained list can conceal zero Program materialization and diverge from evidence.

11.1.3 `sourceIds`: `BCA2-REQ-019`; `BCA2-REQ-020`; `BCA2-REQ-021`; `BCA2-REQ-022`; `BCA2-REQ-023`; `BCA2-REQ-025`; `MPSA-20260829-P0-007`.

11.1.4 `acceptancePredicate`: denominators never mix; renderer totals match machine records; absent accepted Program denominator forces exact Product percent, hours and ETA to `unknown/unavailable`.

## 11.2 `TRD2-REQ-064` — Definition conformance, attack corpus and acceptance

11.2.1 `rule`: TRD-2 must ship with two independent parsers, two graph implementations, schema/reference closure, canonical-byte vectors, generation vectors, lifecycle vectors, negative/mutation corpus and attack cases spanning authority, supply chain, tenant/auth, provider/rate, AI, file, retention, recovery, public Git, Evidence and deployment boundaries.

11.2.2 `causeAndEffect`: a formally worded Definition can remain ambiguous or omit cyber failure modes until exercised by independent implementations and hostile inputs.

11.2.3 `sourceIds`: `MSSA-F001`–`MSSA-F024`; `BCA2-REQ-040`–`BCA2-REQ-046`; `TRD2-REQ-029`; `TRD2-REQ-030`; `TRD2-REQ-058`.

11.2.4 `acceptancePredicate`: all 64 requirements are represented in the Candidate and independently proven; reference/locator/orphan/duplicate/cycle errors are zero; every forbidden vector reaches its named safe terminal; all P0/P1/P2 review findings are closed or explicitly blocking; detached exact-root approval and protected Acceptance succeed.

# 12. Current safe disposition

## 12.1 Requirement-manifest state

12.1.1 this authoring generation contains `64` Definition requirements and grants `0/64` acceptance credit.

12.1.2 all three raw review and normalized-manifest roots are physically present; their strict-union intake and formal reconciliation eligibility remain unaccepted and receive zero closure credit.

12.1.3 this manifest must receive structural, security-semantic and mathematical hostile review against its exact frozen root.

12.1.4 only an accepted TRD-2 Definition may authorize creation of a Planning-generation Candidate; only that accepted generation may materialize Program Task identities.

12.1.5 until those predicates pass: `Gate29=BLOCKED`; `Development freeze=ACTIVE`; Product completion, remaining person-hours, critical path and calendar ETA=`unknown/unavailable`.
