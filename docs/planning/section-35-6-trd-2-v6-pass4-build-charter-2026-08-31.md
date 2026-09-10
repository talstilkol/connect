# 1. Connect — TRD-2 v6 Pass 4 causal-graph build charter

## 1.1 Authority and bounded status

1.1.1 `artifactId=CONNECT-TRD2-V6-PASS4-CAUSAL-GRAPH-BUILD-CHARTER-2026-08-31`.

1.1.2 Pass 4 authority is the committed Pass 3 v2 Candidate at
`50007de6dd7a28740514fe6070fa804f4bd0e8f5` and the local-completion report
`docs/planning/trd2-v6-pass3-v2-local-completion-report-2026-08-31.md`.

1.1.3 exact consumed content roots are:

1.1.3.1 Subject=
`4f02df67992c3fadbd64bc104cdff1b149889ca912370fa3f2594e4805f95fb8`.

1.1.3.2 Clause AST Registry=
`120cac68a82eca4bb1169cabaf7a591a57ccca8498a6334306806e4bbdf79a7d`.

1.1.3.3 State Machine Registry=
`782fdc11ee64943b174dd0616c0b7c3820537f4f991b68a2c7639db45914e04d`.

1.1.3.4 Closed Schema Registry=
`6374ced141b6a1bafff816e1676a5004dbcb51b4fd8fc0437b1b2eb7be6c83e6`.

1.1.4 repository=`PUBLIC`; development freeze=`ACTIVE`; Gate29=`BLOCKED`;
accepted Requirements=`0/128`; Finding closure=`0/15`; review generations=
`0/2`.

## 1.2 Closed output boundary

1.2.1 Pass 4 may emit exactly these three predeclared paths:

1.2.1.1 `docs/planning/trd2-v6-candidate-v3-2026-08-31/causal-graph.json`.

1.2.1.2 `docs/planning/trd2-v6-candidate-v3-2026-08-31/graph-engine-a-report.json`.

1.2.1.3 `docs/planning/trd2-v6-candidate-v3-2026-08-31/graph-engine-b-report.json`.

1.2.2 Their schemas are respectively
`CONNECT-TRD2-V6-CAUSAL-GRAPH-V3-SCHEMA` and
`CONNECT-TRD2-V6-GRAPH-REPORT-V3-SCHEMA`.

1.2.3 Pass 4 must not emit the executable vector corpus, final root overlay,
detached packet, finding crosswalk, atomic package, Producer QA or external
review/Acceptance records.

1.2.4 Toolchain and inputs must be committed before generation. Any tool byte
change invalidates uncommitted Pass 4 output bytes.

## 1.3 Expected-family derivation

1.3.1 Expected families must be derived mechanically from the frozen Schema,
Subject, Clause AST, State Machine, Parser and output-path registries. A copied
manual count is not an authority.

1.3.2 The graph must represent every already produced normative record and
every predeclared downstream family needed for vectors, authority, receipts,
results, reviews, reconciliation, Acceptance, heads and invalidation.

1.3.3 A downstream artifact that does not yet exist is represented as a typed
`DECLARED` or `BLOCKED` graph node bound to its frozen Schema identity. It must
not contain an invented external value or claim `PRODUCED`.

1.3.4 `expectedFamilies` is sorted and unique; `omittedFamilies` must be empty;
unexpected families, aliases and family merging fail closed.

## 1.4 Node identity and producer model

1.4.1 Every node conforms exactly to `CONNECT-TRD2-V6-GRAPH-NODE-V3-SCHEMA`.

1.4.2 `nodeKey`, family, bound root, status and producer mode are derived from
the canonical body without self-reference. `Math.random()` and unapproved
cryptographic randomness remain forbidden.

1.4.3 `PRODUCED` is permitted only when the exact committed bytes/root can be
reconstructed and verified. External authority/receipt/review nodes remain
`BLOCKED` until real Evidence exists.

1.4.4 Duplicate node keys, duplicate identity bodies, dangling bound roots,
unknown status and false producer claims block the graph.

## 1.5 Typed causal edges

1.5.1 Every edge conforms exactly to
`CONNECT-TRD2-V6-GRAPH-EDGE-V3-SCHEMA`.

1.5.2 Allowed edge types are exactly `PRODUCES`, `CONSUMES`, `INVALIDATES`,
`FAILS-TO`, `BLOCKS-AT`, `SUPERSEDES` and `BINDS-EXACTLY`.

1.5.3 Every edge endpoint must exist and must differ. Duplicate edges,
dangling endpoints, unsupported edge types and unqualified umbrella edges fail
closed.

1.5.4 Dependency direction is canonical: a prerequisite points toward the
consumer/result that depends on it. Invalidation points from changed dependency
to the stale head/result it invalidates.

1.5.5 Umbrella membership edges never count toward causal reachability.

1.5.6 Every future Acceptance input must have a non-umbrella path from a
declared sole or external producer boundary. Missing paths remain blocking and
cannot be converted to PASS by a count alone.

1.5.7 The graph cannot contain a `PRODUCED` node bound to its own final
`artifactRoot`, because that would make the artifact identity self-referential.
Its family is represented inside the graph by the exact frozen Schema
declaration and a typed blocked construction node. Pass 6 binds the final raw
graph root from outside the graph in the non-self-referential Package Manifest.

## 1.6 Cycle and reachability rules

1.6.1 The causal dependency subgraph must be acyclic after excluding the
separately typed invalidation relation.

1.6.2 Every `PRODUCED` node must be reachable from immutable source/schema
roots through typed non-umbrella edges.

1.6.3 Every external node must terminate in a declared blocked safe state until
its real appointment, receipt, result or trusted-time input is supplied.

1.6.4 A self-edge, hidden membership shortcut or Acceptance-of-Acceptance path
is prohibited.

## 1.7 Overlay and invalidation sequencing

1.7.1 Pass 4 implements and tests a deterministic overlay prerequisite checker
and dependency-to-head invalidation constructor.

1.7.2 The final
`raw-root-overlay-and-invalidation.json` is deliberately deferred because its
closed schema requires exact `vectorCorpusRoot`, `packetRoot`, `bindingRoot`,
`preReviewHead` and `successorHead` values that do not all exist before Passes
5 and 6.

1.7.3 Missing roots must yield a typed blocking result. Placeholder, demo,
zero-filled, guessed or future-precomputed roots are forbidden.

1.7.4 `preReviewHead` and `successorHead` must differ. The successor may
invalidate predecessor evidence but cannot invalidate the immutable pre-head
that authorized its own review.

1.7.5 The final overlay is emitted only after all exact inputs exist and two
validators agree on stale-root, substituted-root, missing-head, advanced-head
and self-invalidation mutations.

## 1.8 Independent engines and hostile cases

1.8.1 Engine A is Node.js. Engine B is a separately implemented Python
standard-library validator invoked by the frozen top-level verifier.

1.8.2 Both engines independently derive the family set, node identities, edge
identities, typed graph root, reachability, cycle result and outcome root.

1.8.3 Required hostile mutations include mandatory-family omission,
unexpected-family insertion, node substitution, edge substitution, dangling
endpoint, duplicate edge, prohibited cycle, umbrella-only reachability and
false `PRODUCED` status.

1.8.4 Every mutation must fail at its exact expected terminal in both engines;
engine disagreement=`0`.

## 1.9 Local completion predicate

1.9.1 exact schema validation=`PASS`; expected/actual family difference=`0`;
dangling edges=`0`; duplicate identities=`0`; prohibited cycles=`0`.

1.9.2 both graph engines reproduce byte-identical graph/outcome roots and all
hostile mutations block.

1.9.3 full repository builds, tests, TypeScript, ESLint, Source Guard and Secret
hygiene must pass from the committed toolchain and again after the Candidate
commit.

1.9.4 Pass 4 local completion grants no Finding closure, review generation or
Acceptance. Pass 5 is the next bounded local pass only after exact committed
Pass 4 readback.
