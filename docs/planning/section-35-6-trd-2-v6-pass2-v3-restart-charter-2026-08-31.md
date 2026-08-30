# 1. Connect — TRD-2 v6 Pass 2 v3 complete-schema-universe restart

## 1.1 Restart authority

1.1.1 `artifactId=CONNECT-TRD2-V6-PASS2-V3-RESTART-CHARTER-2026-08-31`.

1.1.2 Restart cause=`PASS2V2-SELF-P0-001`; v2 actual-record conformance is
bounded valid history, but v2 is rejected as a complete future construction
Schema Registry.

1.1.3 Pass 3 predecessor charter commit=`1ae5944`; emitted Pass 3 outputs=`0/3`.
That charter is superseded before generation and cannot authorize v3 paths.

1.1.4 Repository=`PUBLIC`; development freeze=`ACTIVE`; Gate29=`BLOCKED`;
accepted Requirements=`0/128`; Finding closure=`0/15`; review generations=`0/2`.

# 2. Immutable successor boundary

2.1 Candidate directory=
`docs/planning/trd2-v6-candidate-v3-2026-08-31`.

2.2 Pass 1 and both rejected Pass 2 generations remain immutable. No old path,
byte, ID, root, report or disposition may be overwritten.

2.3 Output Path Registry v3 is the only path and top-level schema authority:
`docs/planning/trd2-v6-output-path-registry-v3-2026-08-31.json`.

# 3. Complete schema universe

3.1 v3 must revalidate all `391` committed actual-positive records and preserve
their exact primary-source locators.

3.2 v3 must declare every top-level and nested/root-bearing record family needed
by Subject, Clause AST, State Machine, Graph, Overlay, Vector, Package, Producer
reports and the external Review/Reconciliation/Acceptance route.

3.3 Future families are marked `FUTURE-CONSTRUCTION`, receive no actual-positive
credit and must have deterministic construction fixtures plus hostile mutations.

3.4 A closed Output→Schema map covers every planned JSON output. Missing path,
unknown schema, missing nested family and schema without actual/construction
fixture counts must equal `0`.

3.5 Schema references are typed by `Ref`; references must resolve, cycles are
forbidden and validation remains recursively closed at the referenced boundary.

# 4. Engine and acceptance requirements

4.1 Engine A and Engine B must be independent implementations and agree over
actual positives, future construction fixtures and every mutation.

4.2 Actual fixtures must be independently re-resolved from Git source paths and
exact Markdown spans. Construction fixtures must be regenerated from their
declared schemas and identities without random data.

4.3 Any output path without a schema, unresolved Ref, cyclic Ref, accepted unknown
field, identity mismatch or engine disagreement blocks at
`FUTURE-SCHEMA-UNIVERSE-INCOMPLETE`.

4.4 Local completion remains Producer evidence only. A successor Pass 3 charter
may be issued only after v3 is committed, cleanly reverified and self-reviewed.
