# 1. Connect — Bootstrap Authority Envelope B0 successor requirements v6

## 1.1 Identity and immutable claim limit

1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-V6-2026-08-30-G0`.

1.1.2 `artifactClass=IMMUTABLE-PLANNING-ONLY-SUCCESSOR-CANDIDATE;NOT-AUTHORITY;NOT-ACCEPTANCE`.

1.1.3 Frozen predecessor Subject SHA-256 `bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92`; frozen v5 package manifest SHA-256 `5a054f5d4a482a0e74a9146dd3aeee865a5f28ee245d76784dbaa03ed3a118c4`; frozen v5 hostile-review Findings SHA-256 `a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031`.

1.1.4 Repository paths are relative to the public Git top level and begin with `docs/`; absolute paths, traversal, symlink substitution and an extra repository-name prefix block.

1.1.5 Active blockers are exactly 31: 20 v5 independent Findings plus the 11 v4 Findings still open after v5. `B0V4-HR-F012` is preserved closed with no additional credit.

1.1.6 Candidate closure is one-to-one and non-merged. Every Requirement below has one Output, one typed control and five executable mutation vectors.

1.1.7 Planning-admitted instances validate schemas only. They are explicitly non-operational, zero-authority and cannot substitute for external L0 admission, current Appointments, Permits, receipts, Acceptance or review closure.

1.1.8 `Acceptance=0`; accepted Requirements `0/127`; implemented Outputs `0/127`; operational vectors `0/7430`; `B0=ABSENT`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.

## 1.2 Exact denominators

| Denominator | Value |
|---|---:|
| Active blockers | 31 |
| v5 independent Findings | 20 |
| Remaining open v4 Findings | 11 |
| Preserved-closed v4 Findings | 1 |
| Requirements / five-field atoms | 127 / 635 |
| Outputs | 127 |
| Base five-field negative vectors | 635 |
| Full domain mutation vectors | 6795 |
| Total portable negative vectors | 7430 |
| Authoritative inherited fields under semantic extraction | 900 |
| Genesis class-specific schemas / planning-admitted instances | 33 / 33 |
| Recovery members / witnesses | 5 / 2 |
| Roles / unordered conflict pairs | 21 / 210 |
| Mutable object classes / heads | 94 / 36 |

# 2. One-to-one Requirements

## 1.1 `B0V6REQ-000` — One-to-one materialization for B0V5-IHR-F001: stored paths do not resolve from the public Git root

1.1.1 `statement`: addresses=B0V5-IHR-F001; noMergeKey=B0V5-PUBLIC-GIT-ROOT-LOGICAL-PATH-NAMESPACE-MISMATCH; output=B0V6OUT-000; uses=B0V6-CONTROL-000; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.1.2 `threatCauseImpact`: If B0V5-IHR-F001 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.1.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-000-A1,B0V6-V-000-A2,B0V6-V-000-A3,B0V6-V-000-A4,B0V6-V-000-A5.

1.1.4 `dependencies`: buildDependencies=none.

1.1.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F001; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/0.

## 1.2 `B0V6REQ-001` — One-to-one materialization for B0V5-IHR-F002: supersession selectors overlap without an application order

1.2.1 `statement`: addresses=B0V5-IHR-F002; noMergeKey=B0V5-SUPERSESSION-SELECTOR-OVERLAP-WITHOUT-COMPOSITION-ORDER; output=B0V6OUT-001; uses=B0V6-CONTROL-001; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.2.2 `threatCauseImpact`: If B0V5-IHR-F002 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.2.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-001-A1,B0V6-V-001-A2,B0V6-V-001-A3,B0V6-V-001-A4,B0V6-V-001-A5.

1.2.4 `dependencies`: buildDependencies=B0V6REQ-000.

1.2.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F002; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/1.

## 1.3 `B0V6REQ-002` — One-to-one materialization for B0V5-IHR-F003: replacement safety and non-weakening are prose assertions

1.3.1 `statement`: addresses=B0V5-IHR-F003; noMergeKey=B0V5-SUPERSESSION-NONWEAKENING-RELATION-NOT-EXECUTABLE; output=B0V6OUT-002; uses=B0V6-CONTROL-002; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.3.2 `threatCauseImpact`: If B0V5-IHR-F003 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.3.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-002-A1,B0V6-V-002-A2,B0V6-V-002-A3,B0V6-V-002-A4,B0V6-V-002-A5.

1.3.4 `dependencies`: buildDependencies=B0V6REQ-001.

1.3.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F003; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/2.

## 1.4 `B0V6REQ-003` — One-to-one materialization for B0V5-IHR-F004: active inherited semantics are outside the NamedUse graph

1.4.1 `statement`: addresses=B0V5-IHR-F004; noMergeKey=B0V5-ACTIVE-INHERITED-SEMANTIC-BYTES-OUTSIDE-NAMEDUSE-GRAPH; output=B0V6OUT-003; uses=B0V6-CONTROL-003; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.4.2 `threatCauseImpact`: If B0V5-IHR-F004 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.4.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-003-A1,B0V6-V-003-A2,B0V6-V-003-A3,B0V6-V-003-A4,B0V6-V-003-A5.

1.4.4 `dependencies`: buildDependencies=B0V6REQ-002.

1.4.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F004; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/3.

## 1.5 `B0V6REQ-004` — One-to-one materialization for B0V5-IHR-F005: prior-interface roots bind promises, not provider instances

1.5.1 `statement`: addresses=B0V5-IHR-F005; noMergeKey=B0V5-PRIOR-INTERFACE-ROOTS-BIND-PROMISES-NOT-PROVIDER-INSTANCES; output=B0V6OUT-004; uses=B0V6-CONTROL-004; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.5.2 `threatCauseImpact`: If B0V5-IHR-F005 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.5.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-004-A1,B0V6-V-004-A2,B0V6-V-004-A3,B0V6-V-004-A4,B0V6-V-004-A5.

1.5.4 `dependencies`: buildDependencies=B0V6REQ-003.

1.5.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F005; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/4.

## 1.6 `B0V6REQ-005` — One-to-one materialization for B0V5-IHR-F006: vector oracle semantics are not portable or root-bound

1.6.1 `statement`: addresses=B0V5-IHR-F006; noMergeKey=B0V5-VECTOR-CORPUS-OMITS-PORTABLE-ROOTED-ORACLE-SEMANTICS; output=B0V6OUT-005; uses=B0V6-CONTROL-005; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.6.2 `threatCauseImpact`: If B0V5-IHR-F006 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.6.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-005-A1,B0V6-V-005-A2,B0V6-V-005-A3,B0V6-V-005-A4,B0V6-V-005-A5.

1.6.4 `dependencies`: buildDependencies=B0V6REQ-004.

1.6.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F006; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/5.

## 1.7 `B0V6REQ-006` — One-to-one materialization for B0V5-IHR-F007: vector coverage does not match the normative denominator

1.7.1 `statement`: addresses=B0V5-IHR-F007; noMergeKey=B0V5-VECTOR-DENOMINATOR-DOES-NOT-COVER-CLAIMED-DOMAINS; output=B0V6OUT-006; uses=B0V6-CONTROL-006; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.7.2 `threatCauseImpact`: If B0V5-IHR-F007 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.7.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-006-A1,B0V6-V-006-A2,B0V6-V-006-A3,B0V6-V-006-A4,B0V6-V-006-A5.

1.7.4 `dependencies`: buildDependencies=B0V6REQ-005.

1.7.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F007; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/6.

## 1.8 `B0V6REQ-007` — One-to-one materialization for B0V5-IHR-F008: placeholders are marked as real, non-mock domain state

1.8.1 `statement`: addresses=B0V5-IHR-F008; noMergeKey=B0V5-VECTOR-PLACEHOLDERS-MISCLASSIFIED-AS-NONMOCK-REAL-STATE; output=B0V6OUT-007; uses=B0V6-CONTROL-007; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.8.2 `threatCauseImpact`: If B0V5-IHR-F008 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.8.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-007-A1,B0V6-V-007-A2,B0V6-V-007-A3,B0V6-V-007-A4,B0V6-V-007-A5.

1.8.4 `dependencies`: buildDependencies=B0V6REQ-006.

1.8.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F008; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/7.

## 1.9 `B0V6REQ-008` — One-to-one materialization for B0V5-IHR-F009: the causal meta-oracle trusts asserted verdicts

1.9.1 `statement`: addresses=B0V5-IHR-F009; noMergeKey=B0V5-VECTOR-CAUSAL-SPEC-ORACLE-READS-ASSERTED-VERDICTS; output=B0V6OUT-008; uses=B0V6-CONTROL-008; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.9.2 `threatCauseImpact`: If B0V5-IHR-F009 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.9.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-008-A1,B0V6-V-008-A2,B0V6-V-008-A3,B0V6-V-008-A4,B0V6-V-008-A5.

1.9.4 `dependencies`: buildDependencies=B0V6REQ-007.

1.9.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F009; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/8.

## 1.10 `B0V6REQ-009` — One-to-one materialization for B0V5-IHR-F010: package-root closure vectors test the v4 package

1.10.1 `statement`: addresses=B0V5-IHR-F010; noMergeKey=B0V5-PACKAGE-ROOT-CLOSURE-VECTOR-TARGETS-V4-NOT-V5; output=B0V6OUT-009; uses=B0V6-CONTROL-009; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.10.2 `threatCauseImpact`: If B0V5-IHR-F010 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.10.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-009-A1,B0V6-V-009-A2,B0V6-V-009-A3,B0V6-V-009-A4,B0V6-V-009-A5.

1.10.4 `dependencies`: buildDependencies=B0V6REQ-008.

1.10.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F010; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/9.

## 1.11 `B0V6REQ-010` — One-to-one materialization for B0V5-IHR-F011: 107 Acceptance invalidation rules name v4 heads

1.11.1 `statement`: addresses=B0V5-IHR-F011; noMergeKey=B0V5-ACCEPTANCE-INVALIDATION-RULES-REFERENCE-V4-HEADS; output=B0V6OUT-010; uses=B0V6-CONTROL-010; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.11.2 `threatCauseImpact`: If B0V5-IHR-F011 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.11.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-010-A1,B0V6-V-010-A2,B0V6-V-010-A3,B0V6-V-010-A4,B0V6-V-010-A5.

1.11.4 `dependencies`: buildDependencies=B0V6REQ-009.

1.11.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F011; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/10.

## 1.12 `B0V6REQ-011` — One-to-one materialization for B0V5-IHR-F012: Acceptance binds 84 Outputs, not all 96

1.12.1 `statement`: addresses=B0V5-IHR-F012; noMergeKey=B0V5-ACCEPTANCE-OUTPUT-ROOT-DENOMINATOR-STOPS-AT-84; output=B0V6OUT-011; uses=B0V6-CONTROL-011; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.12.2 `threatCauseImpact`: If B0V5-IHR-F012 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.12.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-011-A1,B0V6-V-011-A2,B0V6-V-011-A3,B0V6-V-011-A4,B0V6-V-011-A5.

1.12.4 `dependencies`: buildDependencies=B0V6REQ-010.

1.12.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F012; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/11.

## 1.13 `B0V6REQ-012` — One-to-one materialization for B0V5-IHR-F013: four Acceptance producer classes are outside the role universe

1.13.1 `statement`: addresses=B0V5-IHR-F013; noMergeKey=B0V5-ACCEPTANCE-PRODUCER-CLASSES-OUTSIDE-CLOSED-ROLE-UNIVERSE; output=B0V6OUT-012; uses=B0V6-CONTROL-012; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.13.2 `threatCauseImpact`: If B0V5-IHR-F013 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.13.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-012-A1,B0V6-V-012-A2,B0V6-V-012-A3,B0V6-V-012-A4,B0V6-V-012-A5.

1.13.4 `dependencies`: buildDependencies=B0V6REQ-011.

1.13.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F013; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/12.

## 1.14 `B0V6REQ-013` — One-to-one materialization for B0V5-IHR-F014: witness and proof-class independence has no admitted instances

1.14.1 `statement`: addresses=B0V5-IHR-F014; noMergeKey=B0V5-WITNESS-AND-INDEPENDENCE-INSTANCES-NOT-CLOSED; output=B0V6OUT-013; uses=B0V6-CONTROL-013; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.14.2 `threatCauseImpact`: If B0V5-IHR-F014 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.14.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-013-A1,B0V6-V-013-A2,B0V6-V-013-A3,B0V6-V-013-A4,B0V6-V-013-A5.

1.14.4 `dependencies`: buildDependencies=B0V6REQ-012.

1.14.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F014; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/13.

## 1.15 `B0V6REQ-014` — One-to-one materialization for B0V5-IHR-F015: Permit schemas are untyped name lists

1.15.1 `statement`: addresses=B0V5-IHR-F015; noMergeKey=B0V5-PERMIT-SCHEMAS-ARE-UNTYPED-FIELD-NAME-LISTS; output=B0V6OUT-014; uses=B0V6-CONTROL-014; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.15.2 `threatCauseImpact`: If B0V5-IHR-F015 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.15.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-014-A1,B0V6-V-014-A2,B0V6-V-014-A3,B0V6-V-014-A4,B0V6-V-014-A5.

1.15.4 `dependencies`: buildDependencies=B0V6REQ-013.

1.15.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F015; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/14.

## 1.16 `B0V6REQ-015` — One-to-one materialization for B0V5-IHR-F016: Acceptance CAS is an unrooted string operation sequence

1.16.1 `statement`: addresses=B0V5-IHR-F016; noMergeKey=B0V5-ACCEPTANCE-CAS-IS-UNROOTED-STRING-OP-SEQUENCE; output=B0V6OUT-015; uses=B0V6-CONTROL-015; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.16.2 `threatCauseImpact`: If B0V5-IHR-F016 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.16.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-015-A1,B0V6-V-015-A2,B0V6-V-015-A3,B0V6-V-015-A4,B0V6-V-015-A5.

1.16.4 `dependencies`: buildDependencies=B0V6REQ-014.

1.16.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F016; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/15.

## 1.17 `B0V6REQ-016` — One-to-one materialization for B0V5-IHR-F017: all Genesis classes share one generic slot schema

1.17.1 `statement`: addresses=B0V5-IHR-F017; noMergeKey=B0V5-GENESIS-CLASS-SLOTS-SHARE-ONE-GENERIC-SCHEMA; output=B0V6OUT-016; uses=B0V6-CONTROL-016; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.17.2 `threatCauseImpact`: If B0V5-IHR-F017 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.17.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-016-A1,B0V6-V-016-A2,B0V6-V-016-A3,B0V6-V-016-A4,B0V6-V-016-A5.

1.17.4 `dependencies`: buildDependencies=B0V6REQ-015.

1.17.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F017; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/16.

## 1.18 `B0V6REQ-017` — One-to-one materialization for B0V5-IHR-F018: external admission and first Permit lack a causal program

1.18.1 `statement`: addresses=B0V5-IHR-F018; noMergeKey=B0V5-GENESIS-EXTERNAL-ADMISSION-AND-FIRST-PERMIT-LACK-CAUSAL-PROGRAM; output=B0V6OUT-017; uses=B0V6-CONTROL-017; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.18.2 `threatCauseImpact`: If B0V5-IHR-F018 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.18.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-017-A1,B0V6-V-017-A2,B0V6-V-017-A3,B0V6-V-017-A4,B0V6-V-017-A5.

1.18.4 `dependencies`: buildDependencies=B0V6REQ-016.

1.18.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F018; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/17.

## 1.19 `B0V6REQ-018` — One-to-one materialization for B0V5-IHR-F019: detached Acceptance artifact has no schema

1.19.1 `statement`: addresses=B0V5-IHR-F019; noMergeKey=B0V5-DETACHED-ACCEPTANCE-ARTIFACT-SCHEMA-ABSENT; output=B0V6OUT-018; uses=B0V6-CONTROL-018; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.19.2 `threatCauseImpact`: If B0V5-IHR-F019 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.19.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-018-A1,B0V6-V-018-A2,B0V6-V-018-A3,B0V6-V-018-A4,B0V6-V-018-A5.

1.19.4 `dependencies`: buildDependencies=B0V6REQ-017.

1.19.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F019; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/18.

## 1.20 `B0V6REQ-019` — One-to-one materialization for B0V5-IHR-F020: recovery records are not executable schemas

1.20.1 `statement`: addresses=B0V5-IHR-F020; noMergeKey=B0V5-RECOVERY-MEMBER-WITNESS-ATTEMPT-SCHEMAS-NOT-EXECUTABLE; output=B0V6OUT-019; uses=B0V6-CONTROL-019; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.20.2 `threatCauseImpact`: If B0V5-IHR-F020 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.20.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-019-A1,B0V6-V-019-A2,B0V6-V-019-A3,B0V6-V-019-A4,B0V6-V-019-A5.

1.20.4 `dependencies`: buildDependencies=B0V6REQ-018.

1.20.5 `sourceBasis`: cites=B0V5IHRM@a89f57955ffa9137cc9d1debaa996ab24e75302dd18e5812bb681ad404fdf031::B0V5-IHR-F020; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/19.

## 1.21 `B0V6REQ-020` — One-to-one materialization for B0V4-HR-F001: Close remaining v4 blocker B0V4-HR-F001 without closure transfer

1.21.1 `statement`: addresses=B0V4-HR-F001; noMergeKey=B0V4-SOURCE-MEMBER-SPAN-IDENTITY-COLLAPSE; output=B0V6OUT-020; uses=B0V6-CONTROL-020; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.21.2 `threatCauseImpact`: If B0V4-HR-F001 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.21.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-020-A1,B0V6-V-020-A2,B0V6-V-020-A3,B0V6-V-020-A4,B0V6-V-020-A5.

1.21.4 `dependencies`: buildDependencies=B0V6REQ-019.

1.21.5 `sourceBasis`: cites=B0V4HRM@409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed::B0V4-HR-F001; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/20.

## 1.22 `B0V6REQ-021` — One-to-one materialization for B0V4-HR-F002: Close remaining v4 blocker B0V4-HR-F002 without closure transfer

1.22.1 `statement`: addresses=B0V4-HR-F002; noMergeKey=B0V4-TYPED-SUPERSESSION-NONLITERAL-UNRESOLVED; output=B0V6OUT-021; uses=B0V6-CONTROL-021; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.22.2 `threatCauseImpact`: If B0V4-HR-F002 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.22.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-021-A1,B0V6-V-021-A2,B0V6-V-021-A3,B0V6-V-021-A4,B0V6-V-021-A5.

1.22.4 `dependencies`: buildDependencies=B0V6REQ-020.

1.22.5 `sourceBasis`: cites=B0V4HRM@409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed::B0V4-HR-F002; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/21.

## 1.23 `B0V6REQ-022` — One-to-one materialization for B0V4-HR-F003: Close remaining v4 blocker B0V4-HR-F003 without closure transfer

1.23.1 `statement`: addresses=B0V4-HR-F003; noMergeKey=B0V4-PRESERVED-B0V1-SOURCE-LOCATORS-UNRESOLVED; output=B0V6OUT-022; uses=B0V6-CONTROL-022; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.23.2 `threatCauseImpact`: If B0V4-HR-F003 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.23.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-022-A1,B0V6-V-022-A2,B0V6-V-022-A3,B0V6-V-022-A4,B0V6-V-022-A5.

1.23.4 `dependencies`: buildDependencies=B0V6REQ-021.

1.23.5 `sourceBasis`: cites=B0V4HRM@409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed::B0V4-HR-F003; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/22.

## 1.24 `B0V6REQ-023` — One-to-one materialization for B0V4-HR-F004: Close remaining v4 blocker B0V4-HR-F004 without closure transfer

1.24.1 `statement`: addresses=B0V4-HR-F004; noMergeKey=B0V4-NAMEDUSE-SEMANTIC-UNIVERSE-AND-INTERFACE-INSTANCES-ABSENT; output=B0V6OUT-023; uses=B0V6-CONTROL-023; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.24.2 `threatCauseImpact`: If B0V4-HR-F004 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.24.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-023-A1,B0V6-V-023-A2,B0V6-V-023-A3,B0V6-V-023-A4,B0V6-V-023-A5.

1.24.4 `dependencies`: buildDependencies=B0V6REQ-022.

1.24.5 `sourceBasis`: cites=B0V4HRM@409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed::B0V4-HR-F004; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/23.

## 1.25 `B0V6REQ-024` — One-to-one materialization for B0V4-HR-F005: Close remaining v4 blocker B0V4-HR-F005 without closure transfer

1.25.1 `statement`: addresses=B0V4-HR-F005; noMergeKey=B0V4-MUTABLE-HEAD-MEMBERSHIP-SELF-CYCLES; output=B0V6OUT-024; uses=B0V6-CONTROL-024; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.25.2 `threatCauseImpact`: If B0V4-HR-F005 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.25.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-024-A1,B0V6-V-024-A2,B0V6-V-024-A3,B0V6-V-024-A4,B0V6-V-024-A5.

1.25.4 `dependencies`: buildDependencies=B0V6REQ-023.

1.25.5 `sourceBasis`: cites=B0V4HRM@409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed::B0V4-HR-F005; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/24.

## 1.26 `B0V6REQ-025` — One-to-one materialization for B0V4-HR-F006: Close remaining v4 blocker B0V4-HR-F006 without closure transfer

1.26.1 `statement`: addresses=B0V4-HR-F006; noMergeKey=B0V4-VECTOR-PROGRAMS-SCENARIO-VACUOUS-NO-CAUSAL-ORACLE; output=B0V6OUT-025; uses=B0V6-CONTROL-025; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.26.2 `threatCauseImpact`: If B0V4-HR-F006 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.26.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-025-A1,B0V6-V-025-A2,B0V6-V-025-A3,B0V6-V-025-A4,B0V6-V-025-A5.

1.26.4 `dependencies`: buildDependencies=B0V6REQ-024.

1.26.5 `sourceBasis`: cites=B0V4HRM@409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed::B0V4-HR-F006; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/25.

## 1.27 `B0V6REQ-026` — One-to-one materialization for B0V4-HR-F007: Close remaining v4 blocker B0V4-HR-F007 without closure transfer

1.27.1 `statement`: addresses=B0V4-HR-F007; noMergeKey=B0V4-PERMIT-REVISION-FENCE-TIME-REPLAY-FIELDS-NOT-CLOSED; output=B0V6OUT-026; uses=B0V6-CONTROL-026; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.27.2 `threatCauseImpact`: If B0V4-HR-F007 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.27.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-026-A1,B0V6-V-026-A2,B0V6-V-026-A3,B0V6-V-026-A4,B0V6-V-026-A5.

1.27.4 `dependencies`: buildDependencies=B0V6REQ-025.

1.27.5 `sourceBasis`: cites=B0V4HRM@409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed::B0V4-HR-F007; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/26.

## 1.28 `B0V6REQ-027` — One-to-one materialization for B0V4-HR-F008: Close remaining v4 blocker B0V4-HR-F008 without closure transfer

1.28.1 `statement`: addresses=B0V4-HR-F008; noMergeKey=B0V4-TWO-WITNESS-AND-PROOF-CLASS-INDEPENDENCE-DENOMINATORS-ABSENT; output=B0V6OUT-027; uses=B0V6-CONTROL-027; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.28.2 `threatCauseImpact`: If B0V4-HR-F008 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.28.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-027-A1,B0V6-V-027-A2,B0V6-V-027-A3,B0V6-V-027-A4,B0V6-V-027-A5.

1.28.4 `dependencies`: buildDependencies=B0V6REQ-026.

1.28.5 `sourceBasis`: cites=B0V4HRM@409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed::B0V4-HR-F008; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/27.

## 1.29 `B0V6REQ-028` — One-to-one materialization for B0V4-HR-F009: Close remaining v4 blocker B0V4-HR-F009 without closure transfer

1.29.1 `statement`: addresses=B0V4-HR-F009; noMergeKey=B0V4-ACCEPTANCE-CAS-EXPECTED-POINTER-FENCE-ATTEMPT-COMPARES-ABSENT; output=B0V6OUT-028; uses=B0V6-CONTROL-028; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.29.2 `threatCauseImpact`: If B0V4-HR-F009 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.29.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-028-A1,B0V6-V-028-A2,B0V6-V-028-A3,B0V6-V-028-A4,B0V6-V-028-A5.

1.29.4 `dependencies`: buildDependencies=B0V6REQ-027.

1.29.5 `sourceBasis`: cites=B0V4HRM@409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed::B0V4-HR-F009; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/28.

## 1.30 `B0V6REQ-029` — One-to-one materialization for B0V4-HR-F010: Close remaining v4 blocker B0V4-HR-F010 without closure transfer

1.30.1 `statement`: addresses=B0V4-HR-F010; noMergeKey=B0V4-GENESIS-FOUNDATION-LABELS-NOT-CLOSED-CAUSAL-SCHEMAS; output=B0V6OUT-029; uses=B0V6-CONTROL-029; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.30.2 `threatCauseImpact`: If B0V4-HR-F010 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.30.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-029-A1,B0V6-V-029-A2,B0V6-V-029-A3,B0V6-V-029-A4,B0V6-V-029-A5.

1.30.4 `dependencies`: buildDependencies=B0V6REQ-028.

1.30.5 `sourceBasis`: cites=B0V4HRM@409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed::B0V4-HR-F010; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/29.

## 1.31 `B0V6REQ-030` — One-to-one materialization for B0V4-HR-F011: Close remaining v4 blocker B0V4-HR-F011 without closure transfer

1.31.1 `statement`: addresses=B0V4-HR-F011; noMergeKey=B0V4-RECOVERY-MEMBER-SCHEMA-AND-AUTHORITYOWNER-SEPARATION-GAP; output=B0V6OUT-030; uses=B0V6-CONTROL-030; materialize exactly one typed zero-authority closure candidate without closure transfer.

1.31.2 `threatCauseImpact`: If B0V4-HR-F011 is merged, asserted, left label-only or granted borrowed credit, the B0 authority and Acceptance predicate can become non-causal or non-single-valued.

1.31.3 `requiredProof`: The exact source Finding, typed control, five executable closure axes, rooted program, five mutation-sensitive vectors and zero-credit state must agree; vectors=B0V6-V-030-A1,B0V6-V-030-A2,B0V6-V-030-A3,B0V6-V-030-A4,B0V6-V-030-A5.

1.31.4 `dependencies`: buildDependencies=B0V6REQ-029.

1.31.5 `sourceBasis`: cites=B0V4HRM@409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed::B0V4-HR-F011; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/blockerClosureControls/30.

## 1.32 `B0V6REQ-031` — Byte-exact inherited five-field bundle for B0V5REQ-000

1.32.1 `statement`: preservesV5=B0V5REQ-000; output=B0V6OUT-031; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.32.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.32.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-031-F1,B0V6-V-031-F2,B0V6-V-031-F3,B0V6-V-031-F4,B0V6-V-031-F5.

1.32.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.32.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-000; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.33 `B0V6REQ-032` — Byte-exact inherited five-field bundle for B0V5REQ-001

1.33.1 `statement`: preservesV5=B0V5REQ-001; output=B0V6OUT-032; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.33.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.33.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-032-F1,B0V6-V-032-F2,B0V6-V-032-F3,B0V6-V-032-F4,B0V6-V-032-F5.

1.33.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.33.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-001; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.34 `B0V6REQ-033` — Byte-exact inherited five-field bundle for B0V5REQ-002

1.34.1 `statement`: preservesV5=B0V5REQ-002; output=B0V6OUT-033; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.34.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.34.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-033-F1,B0V6-V-033-F2,B0V6-V-033-F3,B0V6-V-033-F4,B0V6-V-033-F5.

1.34.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.34.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-002; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.35 `B0V6REQ-034` — Byte-exact inherited five-field bundle for B0V5REQ-003

1.35.1 `statement`: preservesV5=B0V5REQ-003; output=B0V6OUT-034; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.35.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.35.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-034-F1,B0V6-V-034-F2,B0V6-V-034-F3,B0V6-V-034-F4,B0V6-V-034-F5.

1.35.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.35.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-003; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.36 `B0V6REQ-035` — Byte-exact inherited five-field bundle for B0V5REQ-004

1.36.1 `statement`: preservesV5=B0V5REQ-004; output=B0V6OUT-035; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.36.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.36.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-035-F1,B0V6-V-035-F2,B0V6-V-035-F3,B0V6-V-035-F4,B0V6-V-035-F5.

1.36.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.36.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-004; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.37 `B0V6REQ-036` — Byte-exact inherited five-field bundle for B0V5REQ-005

1.37.1 `statement`: preservesV5=B0V5REQ-005; output=B0V6OUT-036; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.37.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.37.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-036-F1,B0V6-V-036-F2,B0V6-V-036-F3,B0V6-V-036-F4,B0V6-V-036-F5.

1.37.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.37.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-005; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.38 `B0V6REQ-037` — Byte-exact inherited five-field bundle for B0V5REQ-006

1.38.1 `statement`: preservesV5=B0V5REQ-006; output=B0V6OUT-037; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.38.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.38.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-037-F1,B0V6-V-037-F2,B0V6-V-037-F3,B0V6-V-037-F4,B0V6-V-037-F5.

1.38.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.38.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-006; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.39 `B0V6REQ-038` — Byte-exact inherited five-field bundle for B0V5REQ-007

1.39.1 `statement`: preservesV5=B0V5REQ-007; output=B0V6OUT-038; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.39.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.39.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-038-F1,B0V6-V-038-F2,B0V6-V-038-F3,B0V6-V-038-F4,B0V6-V-038-F5.

1.39.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.39.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-007; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.40 `B0V6REQ-039` — Byte-exact inherited five-field bundle for B0V5REQ-008

1.40.1 `statement`: preservesV5=B0V5REQ-008; output=B0V6OUT-039; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.40.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.40.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-039-F1,B0V6-V-039-F2,B0V6-V-039-F3,B0V6-V-039-F4,B0V6-V-039-F5.

1.40.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.40.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-008; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.41 `B0V6REQ-040` — Byte-exact inherited five-field bundle for B0V5REQ-009

1.41.1 `statement`: preservesV5=B0V5REQ-009; output=B0V6OUT-040; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.41.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.41.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-040-F1,B0V6-V-040-F2,B0V6-V-040-F3,B0V6-V-040-F4,B0V6-V-040-F5.

1.41.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.41.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-009; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.42 `B0V6REQ-041` — Byte-exact inherited five-field bundle for B0V5REQ-010

1.42.1 `statement`: preservesV5=B0V5REQ-010; output=B0V6OUT-041; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.42.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.42.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-041-F1,B0V6-V-041-F2,B0V6-V-041-F3,B0V6-V-041-F4,B0V6-V-041-F5.

1.42.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.42.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-010; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.43 `B0V6REQ-042` — Byte-exact inherited five-field bundle for B0V5REQ-011

1.43.1 `statement`: preservesV5=B0V5REQ-011; output=B0V6OUT-042; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.43.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.43.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-042-F1,B0V6-V-042-F2,B0V6-V-042-F3,B0V6-V-042-F4,B0V6-V-042-F5.

1.43.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.43.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-011; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.44 `B0V6REQ-043` — Byte-exact inherited five-field bundle for B0V5REQ-012

1.44.1 `statement`: preservesV5=B0V5REQ-012; output=B0V6OUT-043; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.44.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.44.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-043-F1,B0V6-V-043-F2,B0V6-V-043-F3,B0V6-V-043-F4,B0V6-V-043-F5.

1.44.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.44.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-012; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.45 `B0V6REQ-044` — Byte-exact inherited five-field bundle for B0V5REQ-013

1.45.1 `statement`: preservesV5=B0V5REQ-013; output=B0V6OUT-044; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.45.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.45.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-044-F1,B0V6-V-044-F2,B0V6-V-044-F3,B0V6-V-044-F4,B0V6-V-044-F5.

1.45.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.45.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-013; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.46 `B0V6REQ-045` — Byte-exact inherited five-field bundle for B0V5REQ-014

1.46.1 `statement`: preservesV5=B0V5REQ-014; output=B0V6OUT-045; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.46.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.46.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-045-F1,B0V6-V-045-F2,B0V6-V-045-F3,B0V6-V-045-F4,B0V6-V-045-F5.

1.46.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.46.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-014; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.47 `B0V6REQ-046` — Byte-exact inherited five-field bundle for B0V5REQ-015

1.47.1 `statement`: preservesV5=B0V5REQ-015; output=B0V6OUT-046; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.47.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.47.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-046-F1,B0V6-V-046-F2,B0V6-V-046-F3,B0V6-V-046-F4,B0V6-V-046-F5.

1.47.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.47.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-015; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.48 `B0V6REQ-047` — Byte-exact inherited five-field bundle for B0V5REQ-016

1.48.1 `statement`: preservesV5=B0V5REQ-016; output=B0V6OUT-047; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.48.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.48.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-047-F1,B0V6-V-047-F2,B0V6-V-047-F3,B0V6-V-047-F4,B0V6-V-047-F5.

1.48.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.48.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-016; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.49 `B0V6REQ-048` — Byte-exact inherited five-field bundle for B0V5REQ-017

1.49.1 `statement`: preservesV5=B0V5REQ-017; output=B0V6OUT-048; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.49.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.49.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-048-F1,B0V6-V-048-F2,B0V6-V-048-F3,B0V6-V-048-F4,B0V6-V-048-F5.

1.49.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.49.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-017; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.50 `B0V6REQ-049` — Byte-exact inherited five-field bundle for B0V5REQ-018

1.50.1 `statement`: preservesV5=B0V5REQ-018; output=B0V6OUT-049; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.50.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.50.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-049-F1,B0V6-V-049-F2,B0V6-V-049-F3,B0V6-V-049-F4,B0V6-V-049-F5.

1.50.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.50.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-018; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.51 `B0V6REQ-050` — Byte-exact inherited five-field bundle for B0V5REQ-019

1.51.1 `statement`: preservesV5=B0V5REQ-019; output=B0V6OUT-050; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.51.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.51.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-050-F1,B0V6-V-050-F2,B0V6-V-050-F3,B0V6-V-050-F4,B0V6-V-050-F5.

1.51.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.51.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-019; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.52 `B0V6REQ-051` — Byte-exact inherited five-field bundle for B0V5REQ-020

1.52.1 `statement`: preservesV5=B0V5REQ-020; output=B0V6OUT-051; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.52.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.52.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-051-F1,B0V6-V-051-F2,B0V6-V-051-F3,B0V6-V-051-F4,B0V6-V-051-F5.

1.52.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.52.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-020; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.53 `B0V6REQ-052` — Byte-exact inherited five-field bundle for B0V5REQ-021

1.53.1 `statement`: preservesV5=B0V5REQ-021; output=B0V6OUT-052; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.53.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.53.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-052-F1,B0V6-V-052-F2,B0V6-V-052-F3,B0V6-V-052-F4,B0V6-V-052-F5.

1.53.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.53.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-021; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.54 `B0V6REQ-053` — Byte-exact inherited five-field bundle for B0V5REQ-022

1.54.1 `statement`: preservesV5=B0V5REQ-022; output=B0V6OUT-053; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.54.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.54.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-053-F1,B0V6-V-053-F2,B0V6-V-053-F3,B0V6-V-053-F4,B0V6-V-053-F5.

1.54.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.54.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-022; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.55 `B0V6REQ-054` — Byte-exact inherited five-field bundle for B0V5REQ-023

1.55.1 `statement`: preservesV5=B0V5REQ-023; output=B0V6OUT-054; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.55.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.55.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-054-F1,B0V6-V-054-F2,B0V6-V-054-F3,B0V6-V-054-F4,B0V6-V-054-F5.

1.55.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.55.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-023; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.56 `B0V6REQ-055` — Byte-exact inherited five-field bundle for B0V5REQ-024

1.56.1 `statement`: preservesV5=B0V5REQ-024; output=B0V6OUT-055; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.56.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.56.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-055-F1,B0V6-V-055-F2,B0V6-V-055-F3,B0V6-V-055-F4,B0V6-V-055-F5.

1.56.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.56.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-024; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.57 `B0V6REQ-056` — Byte-exact inherited five-field bundle for B0V5REQ-025

1.57.1 `statement`: preservesV5=B0V5REQ-025; output=B0V6OUT-056; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.57.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.57.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-056-F1,B0V6-V-056-F2,B0V6-V-056-F3,B0V6-V-056-F4,B0V6-V-056-F5.

1.57.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.57.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-025; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.58 `B0V6REQ-057` — Byte-exact inherited five-field bundle for B0V5REQ-026

1.58.1 `statement`: preservesV5=B0V5REQ-026; output=B0V6OUT-057; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.58.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.58.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-057-F1,B0V6-V-057-F2,B0V6-V-057-F3,B0V6-V-057-F4,B0V6-V-057-F5.

1.58.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.58.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-026; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.59 `B0V6REQ-058` — Byte-exact inherited five-field bundle for B0V5REQ-027

1.59.1 `statement`: preservesV5=B0V5REQ-027; output=B0V6OUT-058; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.59.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.59.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-058-F1,B0V6-V-058-F2,B0V6-V-058-F3,B0V6-V-058-F4,B0V6-V-058-F5.

1.59.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.59.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-027; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.60 `B0V6REQ-059` — Byte-exact inherited five-field bundle for B0V5REQ-028

1.60.1 `statement`: preservesV5=B0V5REQ-028; output=B0V6OUT-059; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.60.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.60.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-059-F1,B0V6-V-059-F2,B0V6-V-059-F3,B0V6-V-059-F4,B0V6-V-059-F5.

1.60.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.60.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-028; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.61 `B0V6REQ-060` — Byte-exact inherited five-field bundle for B0V5REQ-029

1.61.1 `statement`: preservesV5=B0V5REQ-029; output=B0V6OUT-060; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.61.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.61.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-060-F1,B0V6-V-060-F2,B0V6-V-060-F3,B0V6-V-060-F4,B0V6-V-060-F5.

1.61.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.61.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-029; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.62 `B0V6REQ-061` — Byte-exact inherited five-field bundle for B0V5REQ-030

1.62.1 `statement`: preservesV5=B0V5REQ-030; output=B0V6OUT-061; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.62.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.62.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-061-F1,B0V6-V-061-F2,B0V6-V-061-F3,B0V6-V-061-F4,B0V6-V-061-F5.

1.62.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.62.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-030; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.63 `B0V6REQ-062` — Byte-exact inherited five-field bundle for B0V5REQ-031

1.63.1 `statement`: preservesV5=B0V5REQ-031; output=B0V6OUT-062; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.63.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.63.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-062-F1,B0V6-V-062-F2,B0V6-V-062-F3,B0V6-V-062-F4,B0V6-V-062-F5.

1.63.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.63.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-031; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.64 `B0V6REQ-063` — Byte-exact inherited five-field bundle for B0V5REQ-032

1.64.1 `statement`: preservesV5=B0V5REQ-032; output=B0V6OUT-063; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.64.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.64.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-063-F1,B0V6-V-063-F2,B0V6-V-063-F3,B0V6-V-063-F4,B0V6-V-063-F5.

1.64.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.64.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-032; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.65 `B0V6REQ-064` — Byte-exact inherited five-field bundle for B0V5REQ-033

1.65.1 `statement`: preservesV5=B0V5REQ-033; output=B0V6OUT-064; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.65.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.65.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-064-F1,B0V6-V-064-F2,B0V6-V-064-F3,B0V6-V-064-F4,B0V6-V-064-F5.

1.65.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.65.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-033; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.66 `B0V6REQ-065` — Byte-exact inherited five-field bundle for B0V5REQ-034

1.66.1 `statement`: preservesV5=B0V5REQ-034; output=B0V6OUT-065; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.66.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.66.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-065-F1,B0V6-V-065-F2,B0V6-V-065-F3,B0V6-V-065-F4,B0V6-V-065-F5.

1.66.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.66.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-034; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.67 `B0V6REQ-066` — Byte-exact inherited five-field bundle for B0V5REQ-035

1.67.1 `statement`: preservesV5=B0V5REQ-035; output=B0V6OUT-066; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.67.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.67.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-066-F1,B0V6-V-066-F2,B0V6-V-066-F3,B0V6-V-066-F4,B0V6-V-066-F5.

1.67.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.67.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-035; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.68 `B0V6REQ-067` — Byte-exact inherited five-field bundle for B0V5REQ-036

1.68.1 `statement`: preservesV5=B0V5REQ-036; output=B0V6OUT-067; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.68.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.68.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-067-F1,B0V6-V-067-F2,B0V6-V-067-F3,B0V6-V-067-F4,B0V6-V-067-F5.

1.68.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.68.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-036; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.69 `B0V6REQ-068` — Byte-exact inherited five-field bundle for B0V5REQ-037

1.69.1 `statement`: preservesV5=B0V5REQ-037; output=B0V6OUT-068; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.69.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.69.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-068-F1,B0V6-V-068-F2,B0V6-V-068-F3,B0V6-V-068-F4,B0V6-V-068-F5.

1.69.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.69.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-037; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.70 `B0V6REQ-069` — Byte-exact inherited five-field bundle for B0V5REQ-038

1.70.1 `statement`: preservesV5=B0V5REQ-038; output=B0V6OUT-069; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.70.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.70.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-069-F1,B0V6-V-069-F2,B0V6-V-069-F3,B0V6-V-069-F4,B0V6-V-069-F5.

1.70.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.70.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-038; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.71 `B0V6REQ-070` — Byte-exact inherited five-field bundle for B0V5REQ-039

1.71.1 `statement`: preservesV5=B0V5REQ-039; output=B0V6OUT-070; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.71.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.71.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-070-F1,B0V6-V-070-F2,B0V6-V-070-F3,B0V6-V-070-F4,B0V6-V-070-F5.

1.71.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.71.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-039; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.72 `B0V6REQ-071` — Byte-exact inherited five-field bundle for B0V5REQ-040

1.72.1 `statement`: preservesV5=B0V5REQ-040; output=B0V6OUT-071; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.72.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.72.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-071-F1,B0V6-V-071-F2,B0V6-V-071-F3,B0V6-V-071-F4,B0V6-V-071-F5.

1.72.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.72.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-040; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.73 `B0V6REQ-072` — Byte-exact inherited five-field bundle for B0V5REQ-041

1.73.1 `statement`: preservesV5=B0V5REQ-041; output=B0V6OUT-072; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.73.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.73.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-072-F1,B0V6-V-072-F2,B0V6-V-072-F3,B0V6-V-072-F4,B0V6-V-072-F5.

1.73.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.73.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-041; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.74 `B0V6REQ-073` — Byte-exact inherited five-field bundle for B0V5REQ-042

1.74.1 `statement`: preservesV5=B0V5REQ-042; output=B0V6OUT-073; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.74.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.74.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-073-F1,B0V6-V-073-F2,B0V6-V-073-F3,B0V6-V-073-F4,B0V6-V-073-F5.

1.74.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.74.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-042; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.75 `B0V6REQ-074` — Byte-exact inherited five-field bundle for B0V5REQ-043

1.75.1 `statement`: preservesV5=B0V5REQ-043; output=B0V6OUT-074; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.75.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.75.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-074-F1,B0V6-V-074-F2,B0V6-V-074-F3,B0V6-V-074-F4,B0V6-V-074-F5.

1.75.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.75.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-043; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.76 `B0V6REQ-075` — Byte-exact inherited five-field bundle for B0V5REQ-044

1.76.1 `statement`: preservesV5=B0V5REQ-044; output=B0V6OUT-075; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.76.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.76.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-075-F1,B0V6-V-075-F2,B0V6-V-075-F3,B0V6-V-075-F4,B0V6-V-075-F5.

1.76.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.76.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-044; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.77 `B0V6REQ-076` — Byte-exact inherited five-field bundle for B0V5REQ-045

1.77.1 `statement`: preservesV5=B0V5REQ-045; output=B0V6OUT-076; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.77.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.77.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-076-F1,B0V6-V-076-F2,B0V6-V-076-F3,B0V6-V-076-F4,B0V6-V-076-F5.

1.77.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.77.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-045; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.78 `B0V6REQ-077` — Byte-exact inherited five-field bundle for B0V5REQ-046

1.78.1 `statement`: preservesV5=B0V5REQ-046; output=B0V6OUT-077; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.78.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.78.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-077-F1,B0V6-V-077-F2,B0V6-V-077-F3,B0V6-V-077-F4,B0V6-V-077-F5.

1.78.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.78.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-046; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.79 `B0V6REQ-078` — Byte-exact inherited five-field bundle for B0V5REQ-047

1.79.1 `statement`: preservesV5=B0V5REQ-047; output=B0V6OUT-078; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.79.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.79.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-078-F1,B0V6-V-078-F2,B0V6-V-078-F3,B0V6-V-078-F4,B0V6-V-078-F5.

1.79.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.79.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-047; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.80 `B0V6REQ-079` — Byte-exact inherited five-field bundle for B0V5REQ-048

1.80.1 `statement`: preservesV5=B0V5REQ-048; output=B0V6OUT-079; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.80.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.80.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-079-F1,B0V6-V-079-F2,B0V6-V-079-F3,B0V6-V-079-F4,B0V6-V-079-F5.

1.80.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.80.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-048; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.81 `B0V6REQ-080` — Byte-exact inherited five-field bundle for B0V5REQ-049

1.81.1 `statement`: preservesV5=B0V5REQ-049; output=B0V6OUT-080; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.81.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.81.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-080-F1,B0V6-V-080-F2,B0V6-V-080-F3,B0V6-V-080-F4,B0V6-V-080-F5.

1.81.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.81.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-049; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.82 `B0V6REQ-081` — Byte-exact inherited five-field bundle for B0V5REQ-050

1.82.1 `statement`: preservesV5=B0V5REQ-050; output=B0V6OUT-081; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.82.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.82.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-081-F1,B0V6-V-081-F2,B0V6-V-081-F3,B0V6-V-081-F4,B0V6-V-081-F5.

1.82.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.82.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-050; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.83 `B0V6REQ-082` — Byte-exact inherited five-field bundle for B0V5REQ-051

1.83.1 `statement`: preservesV5=B0V5REQ-051; output=B0V6OUT-082; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.83.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.83.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-082-F1,B0V6-V-082-F2,B0V6-V-082-F3,B0V6-V-082-F4,B0V6-V-082-F5.

1.83.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.83.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-051; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.84 `B0V6REQ-083` — Byte-exact inherited five-field bundle for B0V5REQ-052

1.84.1 `statement`: preservesV5=B0V5REQ-052; output=B0V6OUT-083; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.84.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.84.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-083-F1,B0V6-V-083-F2,B0V6-V-083-F3,B0V6-V-083-F4,B0V6-V-083-F5.

1.84.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.84.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-052; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.85 `B0V6REQ-084` — Byte-exact inherited five-field bundle for B0V5REQ-053

1.85.1 `statement`: preservesV5=B0V5REQ-053; output=B0V6OUT-084; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.85.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.85.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-084-F1,B0V6-V-084-F2,B0V6-V-084-F3,B0V6-V-084-F4,B0V6-V-084-F5.

1.85.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.85.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-053; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.86 `B0V6REQ-085` — Byte-exact inherited five-field bundle for B0V5REQ-054

1.86.1 `statement`: preservesV5=B0V5REQ-054; output=B0V6OUT-085; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.86.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.86.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-085-F1,B0V6-V-085-F2,B0V6-V-085-F3,B0V6-V-085-F4,B0V6-V-085-F5.

1.86.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.86.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-054; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.87 `B0V6REQ-086` — Byte-exact inherited five-field bundle for B0V5REQ-055

1.87.1 `statement`: preservesV5=B0V5REQ-055; output=B0V6OUT-086; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.87.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.87.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-086-F1,B0V6-V-086-F2,B0V6-V-086-F3,B0V6-V-086-F4,B0V6-V-086-F5.

1.87.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.87.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-055; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.88 `B0V6REQ-087` — Byte-exact inherited five-field bundle for B0V5REQ-056

1.88.1 `statement`: preservesV5=B0V5REQ-056; output=B0V6OUT-087; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.88.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.88.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-087-F1,B0V6-V-087-F2,B0V6-V-087-F3,B0V6-V-087-F4,B0V6-V-087-F5.

1.88.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.88.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-056; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.89 `B0V6REQ-088` — Byte-exact inherited five-field bundle for B0V5REQ-057

1.89.1 `statement`: preservesV5=B0V5REQ-057; output=B0V6OUT-088; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.89.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.89.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-088-F1,B0V6-V-088-F2,B0V6-V-088-F3,B0V6-V-088-F4,B0V6-V-088-F5.

1.89.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.89.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-057; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.90 `B0V6REQ-089` — Byte-exact inherited five-field bundle for B0V5REQ-058

1.90.1 `statement`: preservesV5=B0V5REQ-058; output=B0V6OUT-089; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.90.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.90.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-089-F1,B0V6-V-089-F2,B0V6-V-089-F3,B0V6-V-089-F4,B0V6-V-089-F5.

1.90.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.90.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-058; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.91 `B0V6REQ-090` — Byte-exact inherited five-field bundle for B0V5REQ-059

1.91.1 `statement`: preservesV5=B0V5REQ-059; output=B0V6OUT-090; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.91.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.91.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-090-F1,B0V6-V-090-F2,B0V6-V-090-F3,B0V6-V-090-F4,B0V6-V-090-F5.

1.91.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.91.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-059; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.92 `B0V6REQ-091` — Byte-exact inherited five-field bundle for B0V5REQ-060

1.92.1 `statement`: preservesV5=B0V5REQ-060; output=B0V6OUT-091; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.92.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.92.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-091-F1,B0V6-V-091-F2,B0V6-V-091-F3,B0V6-V-091-F4,B0V6-V-091-F5.

1.92.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.92.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-060; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.93 `B0V6REQ-092` — Byte-exact inherited five-field bundle for B0V5REQ-061

1.93.1 `statement`: preservesV5=B0V5REQ-061; output=B0V6OUT-092; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.93.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.93.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-092-F1,B0V6-V-092-F2,B0V6-V-092-F3,B0V6-V-092-F4,B0V6-V-092-F5.

1.93.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.93.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-061; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.94 `B0V6REQ-093` — Byte-exact inherited five-field bundle for B0V5REQ-062

1.94.1 `statement`: preservesV5=B0V5REQ-062; output=B0V6OUT-093; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.94.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.94.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-093-F1,B0V6-V-093-F2,B0V6-V-093-F3,B0V6-V-093-F4,B0V6-V-093-F5.

1.94.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.94.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-062; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.95 `B0V6REQ-094` — Byte-exact inherited five-field bundle for B0V5REQ-063

1.95.1 `statement`: preservesV5=B0V5REQ-063; output=B0V6OUT-094; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.95.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.95.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-094-F1,B0V6-V-094-F2,B0V6-V-094-F3,B0V6-V-094-F4,B0V6-V-094-F5.

1.95.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.95.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-063; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.96 `B0V6REQ-095` — Byte-exact inherited five-field bundle for B0V5REQ-064

1.96.1 `statement`: preservesV5=B0V5REQ-064; output=B0V6OUT-095; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.96.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.96.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-095-F1,B0V6-V-095-F2,B0V6-V-095-F3,B0V6-V-095-F4,B0V6-V-095-F5.

1.96.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.96.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-064; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.97 `B0V6REQ-096` — Byte-exact inherited five-field bundle for B0V5REQ-065

1.97.1 `statement`: preservesV5=B0V5REQ-065; output=B0V6OUT-096; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.97.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.97.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-096-F1,B0V6-V-096-F2,B0V6-V-096-F3,B0V6-V-096-F4,B0V6-V-096-F5.

1.97.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.97.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-065; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.98 `B0V6REQ-097` — Byte-exact inherited five-field bundle for B0V5REQ-066

1.98.1 `statement`: preservesV5=B0V5REQ-066; output=B0V6OUT-097; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.98.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.98.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-097-F1,B0V6-V-097-F2,B0V6-V-097-F3,B0V6-V-097-F4,B0V6-V-097-F5.

1.98.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.98.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-066; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.99 `B0V6REQ-098` — Byte-exact inherited five-field bundle for B0V5REQ-067

1.99.1 `statement`: preservesV5=B0V5REQ-067; output=B0V6OUT-098; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.99.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.99.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-098-F1,B0V6-V-098-F2,B0V6-V-098-F3,B0V6-V-098-F4,B0V6-V-098-F5.

1.99.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.99.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-067; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 1.100 `B0V6REQ-099` — Byte-exact inherited five-field bundle for B0V5REQ-068

1.100.1 `statement`: preservesV5=B0V5REQ-068; output=B0V6OUT-099; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

1.100.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

1.100.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-099-F1,B0V6-V-099-F2,B0V6-V-099-F3,B0V6-V-099-F4,B0V6-V-099-F5.

1.100.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

1.100.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-068; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.101 `B0V6REQ-100` — Byte-exact inherited five-field bundle for B0V5REQ-069

2.101.1 `statement`: preservesV5=B0V5REQ-069; output=B0V6OUT-100; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.101.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.101.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-100-F1,B0V6-V-100-F2,B0V6-V-100-F3,B0V6-V-100-F4,B0V6-V-100-F5.

2.101.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.101.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-069; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.102 `B0V6REQ-101` — Byte-exact inherited five-field bundle for B0V5REQ-070

2.102.1 `statement`: preservesV5=B0V5REQ-070; output=B0V6OUT-101; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.102.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.102.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-101-F1,B0V6-V-101-F2,B0V6-V-101-F3,B0V6-V-101-F4,B0V6-V-101-F5.

2.102.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.102.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-070; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.103 `B0V6REQ-102` — Byte-exact inherited five-field bundle for B0V5REQ-071

2.103.1 `statement`: preservesV5=B0V5REQ-071; output=B0V6OUT-102; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.103.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.103.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-102-F1,B0V6-V-102-F2,B0V6-V-102-F3,B0V6-V-102-F4,B0V6-V-102-F5.

2.103.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.103.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-071; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.104 `B0V6REQ-103` — Byte-exact inherited five-field bundle for B0V5REQ-072

2.104.1 `statement`: preservesV5=B0V5REQ-072; output=B0V6OUT-103; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.104.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.104.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-103-F1,B0V6-V-103-F2,B0V6-V-103-F3,B0V6-V-103-F4,B0V6-V-103-F5.

2.104.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.104.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-072; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.105 `B0V6REQ-104` — Byte-exact inherited five-field bundle for B0V5REQ-073

2.105.1 `statement`: preservesV5=B0V5REQ-073; output=B0V6OUT-104; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.105.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.105.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-104-F1,B0V6-V-104-F2,B0V6-V-104-F3,B0V6-V-104-F4,B0V6-V-104-F5.

2.105.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.105.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-073; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.106 `B0V6REQ-105` — Byte-exact inherited five-field bundle for B0V5REQ-074

2.106.1 `statement`: preservesV5=B0V5REQ-074; output=B0V6OUT-105; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.106.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.106.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-105-F1,B0V6-V-105-F2,B0V6-V-105-F3,B0V6-V-105-F4,B0V6-V-105-F5.

2.106.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.106.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-074; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.107 `B0V6REQ-106` — Byte-exact inherited five-field bundle for B0V5REQ-075

2.107.1 `statement`: preservesV5=B0V5REQ-075; output=B0V6OUT-106; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.107.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.107.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-106-F1,B0V6-V-106-F2,B0V6-V-106-F3,B0V6-V-106-F4,B0V6-V-106-F5.

2.107.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.107.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-075; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.108 `B0V6REQ-107` — Byte-exact inherited five-field bundle for B0V5REQ-076

2.108.1 `statement`: preservesV5=B0V5REQ-076; output=B0V6OUT-107; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.108.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.108.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-107-F1,B0V6-V-107-F2,B0V6-V-107-F3,B0V6-V-107-F4,B0V6-V-107-F5.

2.108.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.108.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-076; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.109 `B0V6REQ-108` — Byte-exact inherited five-field bundle for B0V5REQ-077

2.109.1 `statement`: preservesV5=B0V5REQ-077; output=B0V6OUT-108; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.109.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.109.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-108-F1,B0V6-V-108-F2,B0V6-V-108-F3,B0V6-V-108-F4,B0V6-V-108-F5.

2.109.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.109.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-077; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.110 `B0V6REQ-109` — Byte-exact inherited five-field bundle for B0V5REQ-078

2.110.1 `statement`: preservesV5=B0V5REQ-078; output=B0V6OUT-109; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.110.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.110.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-109-F1,B0V6-V-109-F2,B0V6-V-109-F3,B0V6-V-109-F4,B0V6-V-109-F5.

2.110.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.110.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-078; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.111 `B0V6REQ-110` — Byte-exact inherited five-field bundle for B0V5REQ-079

2.111.1 `statement`: preservesV5=B0V5REQ-079; output=B0V6OUT-110; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.111.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.111.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-110-F1,B0V6-V-110-F2,B0V6-V-110-F3,B0V6-V-110-F4,B0V6-V-110-F5.

2.111.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.111.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-079; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.112 `B0V6REQ-111` — Byte-exact inherited five-field bundle for B0V5REQ-080

2.112.1 `statement`: preservesV5=B0V5REQ-080; output=B0V6OUT-111; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.112.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.112.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-111-F1,B0V6-V-111-F2,B0V6-V-111-F3,B0V6-V-111-F4,B0V6-V-111-F5.

2.112.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.112.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-080; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.113 `B0V6REQ-112` — Byte-exact inherited five-field bundle for B0V5REQ-081

2.113.1 `statement`: preservesV5=B0V5REQ-081; output=B0V6OUT-112; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.113.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.113.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-112-F1,B0V6-V-112-F2,B0V6-V-112-F3,B0V6-V-112-F4,B0V6-V-112-F5.

2.113.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.113.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-081; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.114 `B0V6REQ-113` — Byte-exact inherited five-field bundle for B0V5REQ-082

2.114.1 `statement`: preservesV5=B0V5REQ-082; output=B0V6OUT-113; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.114.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.114.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-113-F1,B0V6-V-113-F2,B0V6-V-113-F3,B0V6-V-113-F4,B0V6-V-113-F5.

2.114.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.114.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-082; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.115 `B0V6REQ-114` — Byte-exact inherited five-field bundle for B0V5REQ-083

2.115.1 `statement`: preservesV5=B0V5REQ-083; output=B0V6OUT-114; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.115.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.115.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-114-F1,B0V6-V-114-F2,B0V6-V-114-F3,B0V6-V-114-F4,B0V6-V-114-F5.

2.115.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.115.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-083; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.116 `B0V6REQ-115` — Byte-exact inherited five-field bundle for B0V5REQ-084

2.116.1 `statement`: preservesV5=B0V5REQ-084; output=B0V6OUT-115; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.116.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.116.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-115-F1,B0V6-V-115-F2,B0V6-V-115-F3,B0V6-V-115-F4,B0V6-V-115-F5.

2.116.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.116.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-084; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.117 `B0V6REQ-116` — Byte-exact inherited five-field bundle for B0V5REQ-085

2.117.1 `statement`: preservesV5=B0V5REQ-085; output=B0V6OUT-116; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.117.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.117.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-116-F1,B0V6-V-116-F2,B0V6-V-116-F3,B0V6-V-116-F4,B0V6-V-116-F5.

2.117.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.117.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-085; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.118 `B0V6REQ-117` — Byte-exact inherited five-field bundle for B0V5REQ-086

2.118.1 `statement`: preservesV5=B0V5REQ-086; output=B0V6OUT-117; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.118.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.118.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-117-F1,B0V6-V-117-F2,B0V6-V-117-F3,B0V6-V-117-F4,B0V6-V-117-F5.

2.118.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.118.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-086; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.119 `B0V6REQ-118` — Byte-exact inherited five-field bundle for B0V5REQ-087

2.119.1 `statement`: preservesV5=B0V5REQ-087; output=B0V6OUT-118; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.119.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.119.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-118-F1,B0V6-V-118-F2,B0V6-V-118-F3,B0V6-V-118-F4,B0V6-V-118-F5.

2.119.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.119.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-087; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.120 `B0V6REQ-119` — Byte-exact inherited five-field bundle for B0V5REQ-088

2.120.1 `statement`: preservesV5=B0V5REQ-088; output=B0V6OUT-119; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.120.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.120.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-119-F1,B0V6-V-119-F2,B0V6-V-119-F3,B0V6-V-119-F4,B0V6-V-119-F5.

2.120.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.120.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-088; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.121 `B0V6REQ-120` — Byte-exact inherited five-field bundle for B0V5REQ-089

2.121.1 `statement`: preservesV5=B0V5REQ-089; output=B0V6OUT-120; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.121.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.121.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-120-F1,B0V6-V-120-F2,B0V6-V-120-F3,B0V6-V-120-F4,B0V6-V-120-F5.

2.121.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.121.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-089; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.122 `B0V6REQ-121` — Byte-exact inherited five-field bundle for B0V5REQ-090

2.122.1 `statement`: preservesV5=B0V5REQ-090; output=B0V6OUT-121; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.122.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.122.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-121-F1,B0V6-V-121-F2,B0V6-V-121-F3,B0V6-V-121-F4,B0V6-V-121-F5.

2.122.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.122.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-090; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.123 `B0V6REQ-122` — Byte-exact inherited five-field bundle for B0V5REQ-091

2.123.1 `statement`: preservesV5=B0V5REQ-091; output=B0V6OUT-122; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.123.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.123.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-122-F1,B0V6-V-122-F2,B0V6-V-122-F3,B0V6-V-122-F4,B0V6-V-122-F5.

2.123.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.123.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-091; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.124 `B0V6REQ-123` — Byte-exact inherited five-field bundle for B0V5REQ-092

2.124.1 `statement`: preservesV5=B0V5REQ-092; output=B0V6OUT-123; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.124.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.124.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-123-F1,B0V6-V-123-F2,B0V6-V-123-F3,B0V6-V-123-F4,B0V6-V-123-F5.

2.124.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.124.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-092; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.125 `B0V6REQ-124` — Byte-exact inherited five-field bundle for B0V5REQ-093

2.125.1 `statement`: preservesV5=B0V5REQ-093; output=B0V6OUT-124; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.125.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.125.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-124-F1,B0V6-V-124-F2,B0V6-V-124-F3,B0V6-V-124-F4,B0V6-V-124-F5.

2.125.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.125.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-093; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.126 `B0V6REQ-125` — Byte-exact inherited five-field bundle for B0V5REQ-094

2.126.1 `statement`: preservesV5=B0V5REQ-094; output=B0V6OUT-125; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.126.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.126.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-125-F1,B0V6-V-125-F2,B0V6-V-125-F3,B0V6-V-125-F4,B0V6-V-125-F5.

2.126.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.126.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-094; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

## 2.127 `B0V6REQ-126` — Byte-exact inherited five-field bundle for B0V5REQ-095

2.127.1 `statement`: preservesV5=B0V5REQ-095; output=B0V6OUT-126; preserve all five source fields as separately rooted exact UTF-8 atoms; active semantic extraction covers every authoritative inherited byte; preservation never transfers authority, Acceptance or closure.

2.127.2 `threatCauseImpact`: Dropping, rewriting, merging or wrapper-only parsing of an inherited field can erase a mandatory safety conjunct or hide a machine-semantic dependency.

2.127.3 `requiredProof`: All five exact source spans, bytes, base64 values and roots must match; every field has one portable executable mutation vector; vectors=B0V6-V-126-F1,B0V6-V-126-F2,B0V6-V-126-F3,B0V6-V-126-F4,B0V6-V-126-F5.

2.127.4 `dependencies`: buildDependencies=B0V6REQ-000,B0V6REQ-001,B0V6REQ-002,B0V6REQ-003,B0V6REQ-004,B0V6REQ-005,B0V6REQ-006,B0V6REQ-007,B0V6REQ-008,B0V6REQ-009,B0V6REQ-010,B0V6REQ-011,B0V6REQ-012,B0V6REQ-013,B0V6REQ-014,B0V6REQ-015,B0V6REQ-016,B0V6REQ-017,B0V6REQ-018,B0V6REQ-019,B0V6REQ-020,B0V6REQ-021,B0V6REQ-022,B0V6REQ-023,B0V6REQ-024,B0V6REQ-025,B0V6REQ-026,B0V6REQ-027,B0V6REQ-028,B0V6REQ-029,B0V6REQ-030.

2.127.5 `sourceBasis`: cites=B0V5@bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92::B0V5REQ-095; cites=B0V6NR@330dfacd62c5b6980e3d0a1be9ace4d87bb543ba5d7c28e822a2e4367feb63d4::/semanticExtractionPolicy.

# 3. Current state

3.1 `authorityCredit=0`; `acceptanceCredit=0`; `freshIndependentHostileReview=PENDING`.

3.2 `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.
