# 1. Connect — TRD-2 v6 Pass 3 v2 successor build charter

## 1.1 Authority and zero-credit boundary

1.1.1 `artifactId=CONNECT-TRD2-V6-PASS3-V2-BUILD-CHARTER-2026-08-31`.

1.1.2 The Pass 3 v1 charter at commit `1ae5944` is predeclaration history only.
It emitted `0/3` outputs and is superseded because it targeted rejected v2 paths.

1.1.3 Pass 3 v2 may consume the immutable Pass 1 artifacts and the completed
local Pass 2 v3 Registry rooted at
`6374ced141b6a1bafff816e1676a5004dbcb51b4fd8fc0437b1b2eb7be6c83e6`.

1.1.4 Pass 2 v1, Pass 2 v2 and every v5 semantic result remain rejected as
successor results. Their exact bytes may be read only as defect/source material.

1.1.5 Repository=`PUBLIC`; development freeze=`ACTIVE`; Gate29=`BLOCKED`;
accepted Requirements=`0/128`; Finding closure=`0/15`; review generations=`0/2`.

1.1.6 The three uncommitted outputs first generated from toolchain commit
`b3e2398` are rejected with zero credit. Independent Engine B exposed an
unsupported `null`/`BODY-PATH` predecessor identity mode in its own validator;
the outputs were removed from the worktree before the verifier fix was frozen.

1.1.7 The three uncommitted outputs generated from toolchain commit `9933c1d`
are also rejected with zero credit. The repository Source Guard correctly
blocked an unnecessary direct Python npm shortcut as an unmodelled package
runtime entry. Engine B remains invoked only by the frozen Pass 3 verifier; all
repository gates must pass before the next generation commit is frozen.

## 1.2 Closed output boundary

1.2.1 Pass 3 v2 may emit exactly these three already-predeclared v3 paths:

1.2.1.1 `docs/planning/trd2-v6-candidate-v3-2026-08-31/subject.json`.

1.2.1.2 `docs/planning/trd2-v6-candidate-v3-2026-08-31/clause-ast-registry.json`.

1.2.1.3 `docs/planning/trd2-v6-candidate-v3-2026-08-31/state-machine-registry.json`.

1.2.2 Their exact top-level schema IDs are respectively
`CONNECT-TRD2-V6-SUBJECT-V3-SCHEMA`,
`CONNECT-TRD2-V6-CLAUSE-AST-REGISTRY-V3-SCHEMA` and
`CONNECT-TRD2-V6-STATE-MACHINE-REGISTRY-V3-SCHEMA`.

1.2.3 No Pass 4–6, Producer report, external review, reconciliation or
Acceptance path may appear during Pass 3 v2.

1.2.4 Toolchain and semantic inputs must be frozen in Git before generation.
Any tool byte change invalidates all uncommitted Pass 3 outputs.

## 1.3 Subject contract

1.3.1 Subject contains exactly `128` Requirement records and `128` independent
source bindings reconstructed from the frozen Markdown bytes.

1.3.2 Each Requirement retains exactly five content fields. Identity, byte
span, Schema and dependency metadata stay outside those five fields.

1.3.3 Subject binds the exact Pass 1 source/parser roots, Pass 2 v3 Registry
root, Requirement collection root, binding collection root and zero-credit
current state.

1.3.4 Absolute workstation paths, Secrets, personal data, private evidence and
unapproved cryptographic randomness are forbidden in every output byte.

## 1.4 Clause AST contract

1.4.1 Programs=`128`; one and only one program per Requirement; missing,
duplicate and shared-credit programs=`0`.

1.4.2 Every program binds its Requirement root, exact statement SHA-256,
source-binding digest, predecessor semantic program root, result ID/type,
dependency Requirement IDs, failure terminal and exactly five vector IDs.

1.4.3 Operators and argument types are closed. Every Clause Node is typed;
unknown opcode, unknown argument, absent clause, ambiguous union, reordered
cardinality and cross-Requirement substitution block safely.

1.4.4 Compilation must render the exact source statement losslessly. This Pass
proves compilation only; clause truth remains pending executable vectors,
external review, reconciliation and Acceptance.

1.4.5 Clause Node and Counterexample Obligation bytes are deterministic virtual
content-addressed records reconstructed from the exact frozen v5 semantic
program and Requirement bytes. The Registry persists their ordered semantic
indices through sorted roots; both independent engines must reconstruct every
record, validate it against its declared closed schema and reproduce every
persisted root. A root that cannot be reconstructed byte-for-byte is a blocking
`CLAUSE-AST-UNRESOLVABLE-ROOT`, not evidence.

1.4.6 This virtual-record rule is bounded to Pass 3 compilation. Pass 4 must
materialize the referenced vector fixtures, operations and oracles in the
predeclared executable corpus; it may not treat a hash alone as executable
evidence.

## 1.5 State Machine contract

1.5.1 Required families=`7`: `REVIEW`, `MISSING-VALUE`,
`DATA-LIFECYCLE`, `RETENTION`, `BACKUP-RESTORE`, `PUBLIC-FLOW`, `SEVERITY`.

1.5.2 Every admitted state/event pair has one explicit transition. Missing,
duplicate, implicit-default and ambiguous transitions are forbidden.

1.5.3 Every transition binds a typed Guard Profile, from/to state, event,
durable-effect class, disposition and named safe terminal.

1.5.4 Review covers generation seal, reconciliation, Acceptance, appeal,
custody, expiry and revocation without self-approval. Missing Value covers
conflict ingress/reconciliation plus authority expiry and revocation.

1.5.5 Data Lifecycle denominator=`10×16×20=3200`. Active/held delete passes=`0`;
PURGED-to-live transitions=`0`; ACTIVE+EXPIRE blocks without exact inactive
evidence.

1.5.6 Retention enforces authorized subset, provider-confirmed subset, Active
and Legal-Hold disjointness, cutoff, expiry, head/fence and explicit
partial/unknown reconciliation. Post-delete readback remains audit-only.

1.5.7 Backup/Restore binds `backupIdRoot`, exact database/object/R2/window
digests, quarantine identity, privacy replay and re-delete evidence before
activation.

1.5.8 Public Flow binds all `52` predecessor controls. Severity binds all `84`
envelopes and makes SOE-050 first-reachability escalation append-only and once.

## 1.6 Local verification predicate

1.6.1 Two separately implemented engines must independently reproduce Subject,
AST and State Machine roots and every declared denominator.

1.6.2 Required hostile cases include omission, duplicate, unknown field/opcode,
cross-Requirement substitution, missing/duplicate transition, illegal
Active/Hold delete, PURGED resurrection, missing authority/time/head/fence,
circular identity and duplicate SOE-050 escalation.

1.6.3 Completion requires engine disagreement=`0`, missing/extra=`0`, all
mutations blocked, exact runtime-to-frozen-tool hashes and full repository gates.

1.6.4 Local completion grants no Finding closure or Acceptance. Only exact
committed roots may become bounded inputs to a future Pass 4 successor.
