# 1. Connect — B0 Requirements independent hostile review

## 1.1 Review identity

1.1.1 `artifactId=CONNECT-B0-REQUIREMENTS-INDEPENDENT-HOSTILE-REVIEW-2026-08-29`.

1.1.2 `reviewType=INDEPENDENT; HOSTILE; EXACT-SUBJECT-ROOT; SEMANTIC-AND-MECHANICAL`.

1.1.3 `subjectPath=/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-requirements-candidate-2026-08-29.md`.

1.1.4 `expectedSubjectSha256=678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb`.

1.1.5 `observedSubjectSha256=678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb`.

1.1.6 `subjectPhysicalIdentity=383 lines; 21252 bytes`.

1.1.7 `rootMatch=PASS`.

1.1.8 The independent finding set was frozen before Producer QA was read. Producer QA disclosure therefore did not select, remove, merge, downgrade or renumber findings.

## 1.2 Findings manifest

1.2.1 manifest path=`/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-requirements-independent-hostile-review-findings-manifest-2026-08-29.md`.

1.2.2 manifest SHA-256=`0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355`.

1.2.3 manifest physical identity=`491 lines; 35747 bytes`.

1.2.4 manifest contains exactly `B0-HR-F001`–`B0-HR-F022`; every Finding has the fields `severity`, `locator`, `defect`, `impact`, `requiredDelta`, `acceptancePredicate`, `sourceBasis`, `state` and `noMergeKey`.

1.2.5 `findingCount=22`; `P0=14`; `P1=8`; `P2=0`; `P3=0`; `OPEN-BLOCKING=22`.

## 1.3 Claim boundary

1.3.1 This review does not edit the Subject, does not create B0, does not accept a Requirement, and grants no Product, Git, GitHub, provider, credential, purchase or deployment authority.

1.3.2 Repository visibility remains `PUBLIC` as the binding user decision. Private visibility is not proposed as remediation.

1.3.3 `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`.

# 2. Review method

## 2.1 Frozen-input discipline

2.1.1 The exact Subject digest was verified before parsing.

2.1.2 The Subject was read completely in two non-overlapping ranges.

2.1.3 Producer QA was not opened until the independent findings manifest had been written and hashed.

2.1.4 Rooted external references used for the semantic test are recorded in the manifest §1.2; no similarly named document was silently substituted.

## 2.2 Mechanical readers

2.2.1 Reader A used a Node parser over Requirement headings, exact field labels and dependency tokens.

2.2.2 Reader B used an independently written Ruby parser, a Kahn topological traversal and a separate clause-identity scan.

2.2.3 Both readers operated on the same frozen Subject bytes and agreed on the Requirement and dependency counts.

## 2.3 Hostile semantic models

2.3.1 `BOOTSTRAP-PARADOX`: assume no prior trusted B0, then ask which external authority legally creates each prerequisite object and Act.

2.3.2 `SUBJECT-SUBSTITUTION`: keep an allowed class label while replacing path, schema, purpose, output or effect.

2.3.3 `PERMIT-REPLAY`: race two actors, lose the response, retry, expire or revoke during execution.

2.3.4 `SPLIT-BRAIN`: commit once, return conflicting or stale readbacks, then test whether authority can be used or retried.

2.3.5 `TRUST-SUBSTITUTION`: forge Tal, an appointment, a key, a clock, a verifier or a protocol while preserving textual labels.

2.3.6 `PUBLIC-LEAKAGE`: publish a digest or reference to private low-entropy content and test offline confirmation risk.

2.3.7 `PARTIAL-EFFECT`: crash or lose authorization during a permitted planning write.

2.3.8 `TOTALITY`: enumerate whether every material failure can reach one safe terminal without guessed Success.

# 3. Mechanical results

## 3.1 Requirement shape

3.1.1 Requirement headings=`27`.

3.1.2 Unique Requirement IDs=`27`.

3.1.3 Exact sequence=`B0REQ-000`–`B0REQ-026`; gaps=`0`; duplicates=`0`.

3.1.4 Rows with exactly the five required fields=`27/27`.

3.1.5 Missing-field rows=`0`; extra-field rows=`0`.

## 3.2 Dependency graph

3.2.1 Dependency edges=`65`.

3.2.2 Unknown targets=`0`; self-edges=`0`; duplicate edges=`0`; forward references=`0`.

3.2.3 Topological traversal visited=`27/27`; directed cycles=`0`.

3.2.4 Numbered clauses=`157`; duplicate numbered clause identities=`0`.

## 3.3 Source-reference shape

3.3.1 Source-basis rows=`27`.

3.3.2 Source-basis tokens=`84`.

3.3.3 Tokens encoding their own exact full artifact SHA-256 plus exact locator=`0/84`.

3.3.4 Rows fully composed of exact-root+locator references=`0/27`.

3.3.5 Distinct plainly ambiguous semantic aliases=`17`, including `BCA2 role requirements`, `strict project ID rule`, `Protocol math findings`, `Protocol v1.2 hostile findings`, `Source-universe hostile findings` and `Protocol CAS findings`.

3.3.6 The mechanical Requirement graph therefore passes, but its provenance graph fails the Subject’s own §3.1.4 exact-root condition.

# 4. Semantic verdict by required review theme

## 4.1 External authority and canonical mandate

4.1.1 The Subject correctly states that Tal, not the Producer, is the authority owner and that blanket approval is insufficient.

4.1.2 It does not define how a verifier authenticates Tal or how a receipt is protected against forgery, replay, wrong purpose, stale keys or compromised channels. This is `B0-HR-F003`.

4.1.3 It derives authority requirements from a ledger that explicitly disclaims accepted authority and complete transcript identity. This is `B0-HR-F002`.

4.1.4 Exact bytes alone do not repair the missing trust anchor. A future successor must bind both the canonical mandate root and the authenticated external approval context.

## 4.2 Detached Subject and bootstrap paradox

4.2.1 The conceptual separation of Subject, envelope, Acts and pointer is correct and mechanically useful.

4.2.2 The first CanonicalMandate, B0 Definition, B0 Instance and BootstrapReviewProtocol still have no non-circular creation path. Core genesis classes are absent from the allowlist and cannot be created by the B0 they precede. This is `B0-HR-F004`.

4.2.3 Bootstrap review has no separately admitted rule denominator or trust path. This is `B0-HR-F005`.

4.2.4 Two-generation conformance recursively assumes the accepted mechanism that it is supposed to prove. This is `B0-HR-F017`.

## 4.3 Scope and one-use authorization

4.3.1 Closed class names and Act names are necessary but insufficient; an effect can retain the label and change its path, schema, destination or side effect. This is `B0-HR-F006`.

4.3.2 Permit replay is mentioned, but Permit consumption is not atomically fenced with the permitted effect. This is `B0-HR-F007`.

4.3.3 Revocation is not atomically joined to reservation and commit, so in-flight stale authority is possible. This is `B0-HR-F008`.

4.3.4 Named roles exist in prose, but issuer, delegation, exact conflict matrix, quorum and backup selection remain placeholders. This is `B0-HR-F009`.

## 4.4 Deterministic identity, keys and Public safety

4.4.1 The prohibition on `Math.random` and unauthorized `crypto.randomUUID` is preserved.

4.4.2 Deterministic identity still lacks a complete digest/signature/key profile and collision terminal. This is `B0-HR-F010`.

4.4.3 A raw digest is not automatically safe for a Public repository; low-entropy private content may be confirmed by an offline dictionary. This is `B0-HR-F011`.

4.4.4 Public remains binding. The required correction is classification-aware commitment and private Evidence custody, never a forced Visibility change.

## 4.5 Freeze, acceptance and current-state safety

4.5.1 The listed Input roots omit trust, key, time, revocation, serialization, permit-state, classification and store heads. This is `B0-HR-F012`.

4.5.2 The envelope called “full” omits mandatory authority and policy roots and has no explicit approval denominator. This is `B0-HR-F013`.

4.5.3 CAS response-loss text incorrectly claims that uncertainty proves no current grant. This is `B0-HR-F014`.

4.5.4 Two readbacks are not independent merely because there are two calls; source and consistency independence are absent. This is `B0-HR-F015`.

4.5.5 Observation records are not authority, yet the Subject lacks a canonical reducer over pointer, revocation, epoch and time. This is `B0-HR-F016`.

## 4.6 Evidence, time and total failure handling

4.6.1 The negative corpus is not executable because State, Event and Terminal universes are not enumerated. Safe terminals for uncertainty, collision and partial effects are missing. This is `B0-HR-F018`.

4.6.2 Append-only evidence lacks a rooted custody/store/fork/disclosure contract. This is `B0-HR-F019`.

4.6.3 Trusted time lacks an admissible source, skew and rollback policy. This is `B0-HR-F020`.

4.6.4 Permitted planning writes lack atomic staging and a PARTIAL-EFFECT recovery path. This is `B0-HR-F021`.

4.6.5 Requirement presence is not requirement closure; the successor needs a rooted one-to-one closure denominator. This is `B0-HR-F022`.

# 5. Finding disposition table

## 5.1 One-to-one summary

| Finding | Severity | Independent defect class | Required successor proof | State |
|---|---:|---|---|---|
| `B0-HR-F001` | P0 | source references | 27/27 exact root+locator parity | OPEN-BLOCKING |
| `B0-HR-F002` | P0 | authority provenance | navigation ledger has zero Authority edges | OPEN-BLOCKING |
| `B0-HR-F003` | P0 | Tal trust anchor | authenticated receipt and adversarial verifier corpus | OPEN-BLOCKING |
| `B0-HR-F004` | P0 | genesis DAG | one external acyclic genesis path | OPEN-BLOCKING |
| `B0-HR-F005` | P0 | bootstrap review authority | rooted protocol denominator and role independence | OPEN-BLOCKING |
| `B0-HR-F006` | P0 | effect scope | exact path/schema/effect/egress Permit scope | OPEN-BLOCKING |
| `B0-HR-F007` | P0 | Permit replay | atomic reserve/consume/effect terminal | OPEN-BLOCKING |
| `B0-HR-F008` | P0 | revocation race | epoch+revocation fencing at commit | OPEN-BLOCKING |
| `B0-HR-F009` | P1 | appointment conflicts | exact issuer/delegation/quorum/matrix | OPEN-BLOCKING |
| `B0-HR-F010` | P0 | cryptographic profile | canonical bytes, keys, signatures and collision terminal | OPEN-BLOCKING |
| `B0-HR-F011` | P1 | Public hash leakage | classification-aware commitments | OPEN-BLOCKING |
| `B0-HR-F012` | P0 | freeze completeness | full security-root dependency closure | OPEN-BLOCKING |
| `B0-HR-F013` | P0 | acceptance completeness | mandatory envelope denominator | OPEN-BLOCKING |
| `B0-HR-F014` | P0 | CAS uncertainty | committed-unconfirmed safe state | OPEN-BLOCKING |
| `B0-HR-F015` | P1 | readback consistency | independent sources and one revision | OPEN-BLOCKING |
| `B0-HR-F016` | P1 | observation reduction | non-authoritative observation reducer | OPEN-BLOCKING |
| `B0-HR-F017` | P0 | two-generation recursion | zero-authority conformance genesis | OPEN-BLOCKING |
| `B0-HR-F018` | P0 | state-machine totality | complete state×event matrix | OPEN-BLOCKING |
| `B0-HR-F019` | P1 | evidence custody | ordered fork-detecting classified ledger | OPEN-BLOCKING |
| `B0-HR-F020` | P1 | trusted time | rooted time profile and boundary corpus | OPEN-BLOCKING |
| `B0-HR-F021` | P1 | partial planning effect | atomic staging/quarantine/recovery | OPEN-BLOCKING |
| `B0-HR-F022` | P1 | closure denominator | 27 Requirements and 22 Findings one-to-one | OPEN-BLOCKING |

## 5.2 No-merge rationale

5.2.1 `B0-HR-F001` and `B0-HR-F002` are separate: a reference may resolve exactly yet still lack authority.

5.2.2 `B0-HR-F004`, `B0-HR-F005` and `B0-HR-F017` are separate: genesis authorization, review-rule authorization and multi-generation conformance are different graph edges and require different tests.

5.2.3 `B0-HR-F007` and `B0-HR-F008` are separate: replay prevention does not prove revoke-wins concurrency.

5.2.4 `B0-HR-F010` and `B0-HR-F011` are separate: a cryptographically correct digest can still create a Public privacy oracle.

5.2.5 `B0-HR-F014`, `B0-HR-F015` and `B0-HR-F016` are separate: write uncertainty, read-source independence and status-view authority are distinct layers.

# 6. Producer QA comparison after finding freeze

## 6.1 Root and mechanical agreement

6.1.1 Producer QA path=`/Users/tal/Documents/connect/web/docs/planning/bootstrap-authority-envelope-b0-requirements-producer-qa-2026-08-29.md`; SHA-256=`96393206fe9fb3f00c8714f9f57586292ce3dd779ec94eec3ff0e16c994dd1f5`.

6.1.2 Producer QA and this review agree on Subject root, 27 Requirements, five fields per Requirement, 65 dependency edges, no gaps, no duplicates and an acyclic Requirement DAG.

6.1.3 Producer QA correctly labels itself non-independent, gives zero evidentiary closure and states that B0, appointments, reviews, reconciliation and Tal exact-root receipt are absent.

## 6.2 Semantic disagreement

6.2.1 Producer QA treats the presence of phrases such as external authority, one-use Permit, trusted time, fenced CAS, two readbacks and total negative corpus as semantic coverage.

6.2.2 This independent review tests whether those phrases define a complete, non-circular, adversary-resistant and executable contract. The 22 frozen Findings demonstrate that presence is not closure.

6.2.3 Producer QA PASS-AS-REQUIREMENT-CANDIDATE therefore does not conflict with this review’s `REJECT-AS-ACCEPTANCE-BASELINE`; it cannot supply independent acceptance.

# 7. Required successor order

## 7.1 Remediation sequence

7.1.1 First repair provenance and external trust: `B0-HR-F001`–`B0-HR-F003`.

7.1.2 Then remove genesis/review recursion: `B0-HR-F004`, `B0-HR-F005`, `B0-HR-F017`.

7.1.3 Then define exact effect scope, Permit consumption and revocation fencing: `B0-HR-F006`–`B0-HR-F009`.

7.1.4 Then freeze cryptography, Public commitment and all security heads: `B0-HR-F010`–`B0-HR-F012`.

7.1.5 Then define complete acceptance, CAS/readback and observation reduction: `B0-HR-F013`–`B0-HR-F016`.

7.1.6 Finally define total state handling, evidence custody, trusted time, partial-effect recovery and one-to-one closure: `B0-HR-F018`–`B0-HR-F022`.

7.1.7 Every Byte change creates a new B0 Requirement successor root. The reviewed Subject remains immutable provenance and cannot be patched into PASS.

## 7.2 Successor acceptance minimum

7.2.1 The successor must include a one-to-one disposition for all 22 Findings and preserve all 27 original Requirement identities or publish explicit versioned replacements.

7.2.2 Two independent mechanical readers must agree on Requirements, fields, sources, dependencies, state/event totality and closure denominator.

7.2.3 Two independent hostile reviewers must use the same presealed exact-root packet and must not see one another’s findings before seal.

7.2.4 A reconciler may link evidence and successor requirements but may not edit or merge the reviewer-local Finding records.

7.2.5 Exact-root Tal approval is required only after the trust profile and genesis path themselves are externally admissible; blanket approval remains insufficient.

7.2.6 P0/P1 open count must be zero before any B0 Definition acceptance attempt.

# 8. Final verdict

8.1.1 `mechanicalVerdict=PASS-REQUIREMENT-SHAPE-AND-DAG`.

8.1.2 `provenanceVerdict=FAIL-EXACT-ROOT-SOURCE-RESOLUTION`.

8.1.3 `semanticVerdict=REJECT-SUCCESSOR-REQUIRED`.

8.1.4 `acceptedRequirementCount=0/27`.

8.1.5 `closedFindingCount=0/22`.

8.1.6 `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`.

8.1.7 Product completion, Product remaining hours, Planning remaining hours and calendar ETA remain `unknown/unavailable`; this review supplies no such denominator.

8.1.8 No Product, Git, GitHub, Provider or external-state mutation was performed.
