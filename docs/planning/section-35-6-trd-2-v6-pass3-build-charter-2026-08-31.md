# 1. Connect — TRD-2 v6 Pass 3 build charter

## 1.1 Authority and zero-credit boundary

1.1.1 `artifactId=CONNECT-TRD2-V6-PASS3-BUILD-CHARTER-2026-08-31`.

1.1.2 Pass 3 may consume only the immutable Pass 1 artifacts and the accepted
local mechanical outputs of Pass 2 v2 rooted at
`aa9ac9f3a6a697a13eb6fe3a236c7c7088adb5fbe63313c74a4c386d4b6ecf19`.

1.1.3 Pass 2 v1 and every v5 semantic root remain rejected predecessor
evidence. Their bytes may be cited as defect/source material but no v5 record,
root, result or closure state may be copied as an accepted v6 result.

1.1.4 Repository=`PUBLIC`; development freeze=`ACTIVE`; Gate29=`BLOCKED`;
accepted Requirements=`0/128`; Finding closure=`0/15`; review generations=`0/2`.

# 2. Closed output boundary

2.1 Pass 3 may emit exactly three predeclared normative paths:

2.1.1 `docs/planning/trd2-v6-candidate-v2-2026-08-31/subject.json`.

2.1.2 `docs/planning/trd2-v6-candidate-v2-2026-08-31/clause-ast-registry.json`.

2.1.3 `docs/planning/trd2-v6-candidate-v2-2026-08-31/state-machine-registry.json`.

2.2 No Pass 4–6, review, reconciliation or Acceptance path may appear.

2.3 The toolchain and all semantic predecessor inputs must be frozen in Git
before generation. Any toolchain byte change invalidates uncommitted outputs and
requires complete regeneration.

# 3. Subject contract

3.1 Subject contains exactly `128` Requirement records and `128` separate source
bindings reconstructed from the frozen Markdown source.

3.2 Each Requirement contains exactly five content fields; identity, source span,
schema and dependency metadata remain outside those five fields.

3.3 Subject binds the Pass 1 source/parser roots, Pass 2 v2 Registry/root corpus,
the exact raw roots of its semantic predecessor inputs and zero-credit state.

3.4 Absolute workstation paths, credentials, personal data and private evidence
are forbidden in every emitted byte.

# 4. Clause AST contract

4.1 Exactly one AST is compiled for each Requirement; AST denominator=`128`;
missing, duplicate or shared-credit ASTs=`0`.

4.2 Each AST binds the exact Requirement root, statement bytes, result type,
result ID, predecessor predicate ID/root, five vector IDs, dependency IDs,
failure terminal and source-basis fields.

4.3 Operators and argument types are closed. Unknown opcode, unknown argument,
missing clause, reordered cardinality or cross-Requirement receipt reuse blocks.

4.4 Compilation must losslessly render the exact source statement. Pass 3 proves
typed/lossless compilation only; truth of the business/security clause remains
blocked until Pass 5 vectors, external review and Acceptance.

# 5. State-machine contract

5.1 Required machine families=`7`: `REVIEW`, `MISSING-VALUE`,
`DATA-LIFECYCLE`, `RETENTION`, `BACKUP-RESTORE`, `PUBLIC-FLOW`, `SEVERITY`.

5.2 Every admitted state/event pair has exactly one explicit transition row.
Implicit default, ambiguous row, duplicate row and missing row are forbidden.

5.3 Every transition carries typed guard AST, authority/time/head/fence needs,
next state, durable-effect class and one named safe terminal.

5.4 MissingValue includes conflict ingress, conflict reconciliation, authority
expiry and revocation. Review includes generation seal, reconciliation,
Acceptance, appeal, custody, expiry and revocation without self-approval.

5.5 Data lifecycle retains the exact `10×16×20=3200` class/state/event
denominator. Active or held delete passes=`0`; PURGED-to-live transitions=`0`;
ACTIVE+EXPIRE=`BLOCK` until an exact inactive observation exists.

5.6 Retention defines pre-delete authorization, exact provider-confirmed subset,
fenced CAS, prepare/finalize outcomes and explicit partial/unknown reconciliation;
post-delete readback is audit-only.

5.7 Backup/Restore IDs exclude their own identity field from the domain
constructor, bind exact backup/object/R2/window digests, quarantine every restore
and require privacy replay/re-delete before activation.

5.8 Public-flow machines bind all `52` predecessor controls to typed source,
sink, classification and disclosure-safe evidence conditions. Severity machines
bind all `84` envelopes, require exact trigger evidence and make SOE-050 first
reachability escalation append-only and exactly once.

# 6. Local acceptance predicate

6.1 Two independently implemented readers must reproduce all roots, denominators,
AST renderings and transition outcomes.

6.2 Required hostile mutations include omission, duplicate, unknown field/opcode,
cross-Requirement substitution, missing transition, duplicate transition,
illegal active/hold delete, PURGED resurrection, missing authority/time/head/fence,
circular ID and duplicate SOE-050 escalation.

6.3 Local Pass 3 completes only with disagreement=`0`, missing/extra=`0`, all
mutations blocked and full repository quality gates passing.

6.4 Local completion grants no Finding closure and no Acceptance. Pass 4 may then
consume the exact frozen Subject/AST/machine roots as local Candidate inputs only.
