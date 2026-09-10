# 1. Connect — Master Control Sequence v2 entry/graph semantic-risk observation

## 1.1 Identity and boundary

1.1.1 `observationId=CONNECT-MPSC2-ENTRY-GRAPH-RISK-2026-08-29-O1`.

1.1.2 Subject path=`/Users/tal/Documents/connect/web/docs/planning/master-plan-successor-control-sequence-v2-2026-08-29.md`.

1.1.3 exact Subject root=`sha256:403a9f77d85c67ebc4498c12a0c74912f8c015cfbccd665f3043a99c9d98310e`.

1.1.4 observation class=`PRODUCER-SEMANTIC-RISK; NOT-INDEPENDENT-REVIEW; NOT-A-FINDING-CLOSURE; NOT-ACCEPTANCE`.

1.1.5 Subject was not modified; no Product, Git, GitHub, provider or external state was changed.

1.1.6 repository visibility remains `PUBLIC`; Gate29 remains blocked.

## 1.2 Confirmed mechanical facts

1.2.1 Planning phase records=`30`, each with an `entry` field.

1.2.2 forward-edge registry=`79` total rows; pre-Gate Planning edges=`68` rows terminating at `PGV2-*`.

1.2.3 all explicit `PGV2-*` references inside Planning `entry` text have corresponding Phase-to-Phase edges under a local parser.

1.2.4 that check does not cover non-Phase conditions and therefore does not prove semantic graph completeness.

1.2.5 external node set declared by Subject=`{B0,NEW-IMPLEMENTATION-INSTRUCTION,EXTERNAL-PERMITS}`.

## 1.3 External or non-Phase entry conditions not represented as complete typed graph nodes

1.3.1 `PGV2-00` additionally requires mandate receipt and read-only filesystem/Git observations.

1.3.2 `PGV2-01` requires B0 to remain valid, but the forward registry contains no direct B0→PGV2-01 freshness/revocation edge.

1.3.3 `PGV2-02` requires three predeclared Reviewer packets.

1.3.4 `PGV2-03` requires live B0 and BootstrapReviewProtocol; neither has a direct typed edge to this phase.

1.3.5 `PGV2-04` requires live B0 and BootstrapReviewProtocol; neither has a direct typed edge to this phase.

1.3.6 `PGV2-05` requires frozen PhaseDefinitionSet whose sole producer/current-pointer edge is not explicit.

1.3.7 `PGV2-07` requires two independent Normalizer appointments.

1.3.8 `PGV2-11` requires authorized read-only custody scope and accepted Public-safe handling policy.

1.3.9 `PGV2-12` requires Selector/Reviewer appointments and an accepted Decision-precedence policy.

1.3.10 `PGV2-13` requires an accepted extraction policy.

1.3.11 `PGV2-14` requires current applicable Scope Decisions.

1.3.12 `PGV2-15` requires Planning-role appointments.

1.3.13 `PGV2-17` requires current Framework SourceSet and current Public-repository control requirements; the latter must not be confused with the later PGV2-24 accepted hardening specification.

1.3.14 `PGV2-18` requires a complete Task estimate/typed-Unknown state plus fresh capacity/wait observations.

1.3.15 `PGV2-20` requires presealed Review-B packet and eligible appointments.

1.3.16 `PGV2-21` requires two independent Normalizer runs.

1.3.17 `PGV2-22` requires current Appointment registry and a frozen successor Program root.

1.3.18 `PGV2-23` requires expected Program pointer, AcceptanceWriter appointment and trusted time.

1.3.19 `PGV2-24` requires admitted D18/Public-source requirements in addition to phase roots.

1.3.20 `PGV2-26` requires presealed Review-B packet and eligible appointments.

1.3.21 `PGV2-27` requires current Appointment registry and a no-inferred-authority assertion.

1.3.22 `PGV2-28` requires expected Master head, AcceptanceWriter appointment, trusted time and closed veto denominator.

1.3.23 `PGV2-29` requires absence of an invalidation Event.

## 1.4 Why this is a blocker candidate

1.4.1 a Phase-only DAG can remain acyclic and reachable even when an external authority, policy, appointment, time receipt, permit or exact head is missing, stale, revoked or conflicting.

1.4.2 B0 validity is time/revocation-sensitive; a transitive B0→PGV2-00→later-Phase path does not prove B0 was current at a later phase's atomic acceptance attempt.

1.4.3 BootstrapReviewProtocol is named as external but absent from the declared ExternalAuthorityNodeSet and forward-edge registry.

1.4.4 entry prose cannot serve as a machine dependency if the graph invariants, reachability, invalidation routing and Acceptance CAS consume only registered edges.

1.4.5 untyped artifact aliases such as `ReviewInputFreeze`, `Framework source set current`, `Public-source requirements` and `Appointment registry current` risk resolving to more than one producer/root.

1.4.6 PGV2-17↔PGV2-24 needs a type distinction: admitted Public/cyber requirements may precede PGV2-17, while the accepted live-mutation hardening specification is produced later by PGV2-24; conflation would create a semantic cycle.

## 1.5 Required independent-review checks

1.5.1 extract every noun phrase in all 30 `entry` fields and classify it as Phase output, accepted external input, observation, authority, appointment, policy, pointer, permit, time receipt or assertion.

1.5.2 require one exact sole producer/current pointer and one typed graph edge for every non-optional entry member.

1.5.3 compare two independent semantic-use extractors against the printed edge registry; missing, ambiguous, hidden, forward and cyclic edges must all equal zero.

1.5.4 require B0/Protocol/Appointment/Permit/Time freshness at the same atomic Acceptance CAS where the phase changes state.

1.5.5 require explicit invalidation propagation from each external head to the earliest affected phase and every descendant.

1.5.6 verify safe terminals for absent, stale, expired, revoked, conflicting, inaccessible and response-loss cases for every external dependency class.

1.5.7 verify Post-Gate nodes separately; this observation does not claim their entry graph is complete.

## 1.6 Current disposition

1.6.1 this observation records a semantic-review hypothesis; independent reviewer disposition=`ABSENT`.

1.6.2 Control Sequence v2 accepted=`0`.

1.6.3 prior 32 Finding closures accepted=`0/32`.

1.6.4 no phase, percentage, schedule or execution credit is granted by this observation.

1.6.5 `Gate29=BLOCKED`; development freeze=`ACTIVE`.
