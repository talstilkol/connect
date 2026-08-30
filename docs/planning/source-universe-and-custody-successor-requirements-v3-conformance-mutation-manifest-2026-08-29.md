# 1. Connect — Source-universe v3 finite conformance and mutation manifest

## 1.1 Identity and non-business-data boundary

1.1.1 `artifactId=CONNECT-SOURCE-UNIVERSE-V3-FINITE-CONFORMANCE-MUTATION-MANIFEST-2026-08-29`.

1.1.2 status=`FROZEN-TEST-INPUT-CANDIDATE; NOT-EXECUTED; NOT-ACCEPTED`.

1.1.3 fixture rule=`tests operate only on exact frozen planning roots, the bound SURS3 subject root and deterministic structural deltas; no fake, mock, demo, sample, synthetic or generated business/customer data is permitted`.

1.1.4 mutation rule=`every mutation is one deterministic transformation named below; mutation identity is SHA-256(canonical test id, bound input roots, operation bytes, expected oracle bytes)`.

1.1.5 boundary=`planning test specification only; no Product/Git/Build/Push/Deploy/provider/account/credential action`.

## 2.1 Requirement conformance records

| testId | requirement | deterministic subject | operation | exact oracle | failure terminal |
|---|---|---|---|---|---|
| `SURS3-CONF-001` | `SURS3-REQ-001` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-REFERENCE-BLOCKED` |
| `SURS3-CONF-002` | `SURS3-REQ-002` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-AUTHORITY-BLOCKED` |
| `SURS3-CONF-003` | `SURS3-REQ-003` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `TERMINAL-REGISTRY-BLOCKED` |
| `SURS3-CONF-004` | `SURS3-REQ-004` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-PREDICATE-CONFLATION-BLOCKED` |
| `SURS3-CONF-005` | `SURS3-REQ-005` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `AUTHORITY-CONFLICT-BLOCKED` |
| `SURS3-CONF-006` | `SURS3-REQ-006` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `DEPENDENCY-CLOSURE-BLOCKED` |
| `SURS3-CONF-007` | `SURS3-REQ-007` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `DISCOVERY-INCOMPLETE-BLOCKED` |
| `SURS3-CONF-008` | `SURS3-REQ-008` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `DISCOVERY-INCOMPLETE-BLOCKED` |
| `SURS3-CONF-009` | `SURS3-REQ-009` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `GIT-SNAPSHOT-BLOCKED` |
| `SURS3-CONF-010` | `SURS3-REQ-010` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `GIT-SNAPSHOT-BLOCKED` |
| `SURS3-CONF-011` | `SURS3-REQ-011` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `UNKNOWN-FAMILY-QUARANTINED` |
| `SURS3-CONF-012` | `SURS3-REQ-012` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-CLASSIFICATION-BLOCKED` |
| `SURS3-CONF-013` | `SURS3-REQ-013` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-RECORD-BLOCKED` |
| `SURS3-CONF-014` | `SURS3-REQ-014` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `PUBLIC-CLASSIFICATION-BLOCKED` |
| `SURS3-CONF-015` | `SURS3-REQ-015` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-CUSTODY-BLOCKED` |
| `SURS3-CONF-016` | `SURS3-REQ-016` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `DERIVATIVE-AMBIGUOUS-BLOCKED` |
| `SURS3-CONF-017` | `SURS3-REQ-017` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-INGEST-QUARANTINED` |
| `SURS3-CONF-018` | `SURS3-REQ-018` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-INGEST-QUARANTINED` |
| `SURS3-CONF-019` | `SURS3-REQ-019` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-AUTHORITY-BLOCKED` |
| `SURS3-CONF-020` | `SURS3-REQ-020` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SELECTION-STATE-BLOCKED` |
| `SURS3-CONF-021` | `SURS3-REQ-021` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-STATE-BLOCKED` |
| `SURS3-CONF-022` | `SURS3-REQ-022` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-STATE-BLOCKED` |
| `SURS3-CONF-023` | `SURS3-REQ-023` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `PUBLIC-EGRESS-BLOCKED` |
| `SURS3-CONF-024` | `SURS3-REQ-024` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-LOCATOR-BLOCKED` |
| `SURS3-CONF-025` | `SURS3-REQ-025` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `IMPLEMENTATION-GRAPH-BLOCKED` |
| `SURS3-CONF-026` | `SURS3-REQ-026` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `IMPLEMENTATION-SNAPSHOT-BLOCKED` |
| `SURS3-CONF-027` | `SURS3-REQ-027` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `DYNAMIC-SOURCE-STALE-BLOCKED` |
| `SURS3-CONF-028` | `SURS3-REQ-028` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `DYNAMIC-SOURCE-STALE-BLOCKED` |
| `SURS3-CONF-029` | `SURS3-REQ-029` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `PROVIDER-ENTITLEMENT-BLOCKED` |
| `SURS3-CONF-030` | `SURS3-REQ-030` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `DECISION-CONFLICT-BLOCKED` |
| `SURS3-CONF-031` | `SURS3-REQ-031` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `D31-LOCATOR-BLOCKED` |
| `SURS3-CONF-032` | `SURS3-REQ-032` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `D31-LOCATOR-BLOCKED` |
| `SURS3-CONF-033` | `SURS3-REQ-033` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-INVALIDATION-BLOCKED` |
| `SURS3-CONF-034` | `SURS3-REQ-034` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-SET-CONFLICT-BLOCKED` |
| `SURS3-CONF-035` | `SURS3-REQ-035` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-CLOSURE-BLOCKED` |
| `SURS3-CONF-036` | `SURS3-REQ-036` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-DENOMINATOR-BLOCKED` |
| `SURS3-CONF-037` | `SURS3-REQ-037` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-DENOMINATOR-BLOCKED` |
| `SURS3-CONF-038` | `SURS3-REQ-038` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-LOCATOR-BLOCKED` |
| `SURS3-CONF-039` | `SURS3-REQ-039` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `UNKNOWN-EGRESS-BLOCKED` |
| `SURS3-CONF-040` | `SURS3-REQ-040` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-INVALIDATION-BLOCKED` |
| `SURS3-CONF-041` | `SURS3-REQ-041` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-REPLAY-BLOCKED` |
| `SURS3-CONF-042` | `SURS3-REQ-042` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-REPLAY-BLOCKED` |
| `SURS3-CONF-043` | `SURS3-REQ-043` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-INVALIDATION-BLOCKED` |
| `SURS3-CONF-044` | `SURS3-REQ-044` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-CLASSIFICATION-BLOCKED` |
| `SURS3-CONF-045` | `SURS3-REQ-045` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `SOURCE-ACCEPTANCE-BLOCKED` |
| `SURS3-CONF-046` | `SURS3-REQ-046` | bound immutable SURS3 row plus every exact dependency/source root named by that row | evaluate the row's canonical `proof/predicate` without substitution or omitted conjunct | all conjuncts true and canonical result=`PASS` | `REVIEW-BLOCKED` |

## 2.2 Reviewer-finding mutation records

| testId | exact finding source | deterministic mutation | exact oracle terminal |
|---|---|---|---|
| `SURS3-MUT-001` | `SRC-SURS2-FINDINGS#SURS2-HR-F001` | remove one SourceReferenceIndex target or inverse occurrence | `SOURCE-REFERENCE-BLOCKED` |
| `SURS3-MUT-002` | `SRC-SURS2-FINDINGS#SURS2-HR-F002` | withhold one eligible seed or continuation edge | `DISCOVERY-INCOMPLETE-BLOCKED` |
| `SURS3-MUT-003` | `SRC-SURS2-FINDINGS#SURS2-HR-F003` | delete one semantically required producer-consumer edge | `DEPENDENCY-CLOSURE-BLOCKED` |
| `SURS3-MUT-004` | `SRC-SURS2-FINDINGS#SURS2-HR-F004` | make one required Git object unavailable or activate an unapproved filter | `GIT-SNAPSHOT-BLOCKED` |
| `SURS3-MUT-005` | `SRC-SURS2-FINDINGS#SURS2-HR-F005` | add one admitted registry member with no discovery-family disposition | `SOURCE-CLASSIFICATION-BLOCKED` |
| `SURS3-MUT-006` | `SRC-SURS2-FINDINGS#SURS2-HR-F006` | place a private locator-derived stable ID in the Public projection | `PUBLIC-CLASSIFICATION-BLOCKED` |
| `SURS3-MUT-007` | `SRC-SURS2-FINDINGS#SURS2-HR-F007` | attempt ADMITTED with authority or custody Unknown | `SOURCE-STATE-BLOCKED` |
| `SURS3-MUT-008` | `SRC-SURS2-FINDINGS#SURS2-HR-F008` | add one observed egress sink without classification | `UNKNOWN-EGRESS-BLOCKED` |
| `SURS3-MUT-009` | `SRC-SURS2-FINDINGS#SURS2-HR-F009` | feed a DNS-rebinding or nested encrypted member through recursive ingestion | `SOURCE-INGEST-QUARANTINED` |
| `SURS3-MUT-010` | `SRC-SURS2-FINDINGS#SURS2-HR-F010` | add one admitted extension without locator profile | `SOURCE-LOCATOR-BLOCKED` |
| `SURS3-MUT-011` | `SRC-SURS2-FINDINGS#SURS2-HR-F011` | evaluate an expired reliance interval after failed refresh | `DYNAMIC-SOURCE-STALE-BLOCKED` |
| `SURS3-MUT-012` | `SRC-SURS2-FINDINGS#SURS2-HR-F012` | derive an Appointment only from the provider receipt it approves | `SOURCE-AUTHORITY-BLOCKED` |
| `SURS3-MUT-013` | `SRC-SURS2-FINDINGS#SURS2-HR-F013` | change one byte in D31 lines 747–751 while retaining the old span root | `D31-LOCATOR-BLOCKED` |
| `SURS3-MUT-014` | `SRC-SURS2-FINDINGS#SURS2-HR-F014` | remove one required affected claim or add one unrelated claim to the oracle set | `SOURCE-INVALIDATION-BLOCKED` |
| `SURS3-MUT-015` | `SRC-SURS2-FINDINGS#SURS2-HR-F015` | count secondary-family tags as new global CandidateSet members | `SOURCE-DENOMINATOR-BLOCKED` |
| `SURS3-MUT-016` | `SRC-SURS2-FINDINGS#SURS2-HR-F016` | delete one mandatory admitted-source relation or inverse edge | `SOURCE-CLOSURE-BLOCKED` |
| `SURS3-MUT-017` | `SRC-SURS2-FINDINGS#SURS2-HR-F017` | crash between successor publication and current-pointer fencing, then retry | `SOURCE-INVALIDATION-BLOCKED` |
| `SURS3-MUT-018` | `SRC-SURS2-FINDINGS#SURS2-HR-F018` | restore an erased payload or make restored Acceptance current without revalidation | `SOURCE-REPLAY-BLOCKED` |
| `SURS3-MUT-019` | `SRC-SURS2-FINDINGS#SURS2-HR-F019` | share one prohibited implementation, library, owner or envelope across independent roles | `SOURCE-ACCEPTANCE-BLOCKED` |
| `SURS3-MUT-020` | `SRC-SURS2-FINDINGS#SURS2-HR-F020` | remove one cause mapping or map one cause to two unordered terminals | `TERMINAL-REGISTRY-BLOCKED` |

## 2.3 Controlled two-generation records

| testId | bound generations | deterministic operation | exact oracle |
|---|---|---|---|
| `SURS3-GEN-001` | A exact subject/root/input set; B exact successor/root/input set | apply one declared source-root Delta and recompute the dependency-closure oracle | `rootB != rootA`; affected set equals exact oracle; unaffected roots remain equal |
| `SURS3-GEN-002` | A and B | submit any A QA/Review/Acceptance receipt against B | `STALE-GENERATION-BLOCKED`; transferred receipt count=`0` |
| `SURS3-GEN-003` | B | replay B from frozen inputs in two independent envelopes | canonical bytes, roots, terminal and affected set are byte-identical |
| `SURS3-GEN-004` | A and B conformance only | scan actor, issuer, membership, ancestry and permit edges | self/same-generation authority count=`0`; formal operational authority issued=`0` |

## 3.1 Counters and acceptance

3.1.1 requirement conformance records=`46`; reviewer-finding mutation records=`20`; two-generation records=`4`; total=`70`.

3.1.2 duplicate test IDs=`0`; unbound requirement IDs=`0`; finding identities merged=`0`; semantic ranges=`0`.

3.1.3 an execution is eligible only when every test binds the same exact SURS3 root, SourceReferenceIndex root, external Bootstrap root, accepted review-protocol root and terminal-registry root.

3.1.4 a PASS requires `70/70`; one missing, skipped, mutated, non-independent or non-reproducible record returns `SOURCE-ACCEPTANCE-BLOCKED`.

3.1.5 current executed=`0/70`; current accepted=`0/70`; Gate29=`BLOCKED`; development freeze=`ACTIVE`.

