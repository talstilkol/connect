# 1. Connect — TRD-2 v6 Pass 3 v2 local completion report

## 1.1 Status and claim boundary

1.1.1 `artifactId=CONNECT-TRD2-V6-PASS3-V2-LOCAL-COMPLETION-REPORT-2026-08-31`.

1.1.2 result=`COMPLETE-LOCAL-CANDIDATE-NOT-INDEPENDENTLY-ACCEPTED`.

1.1.3 Candidate commit=
`50007de6dd7a28740514fe6070fa804f4bd0e8f5`; remote branch readback matched
the exact commit.

1.1.4 repository=`PUBLIC`; development freeze=`ACTIVE`; Gate29=`BLOCKED`;
accepted Requirements=`0/128`; Finding closure=`0/15`; eligible independent
review generations=`0/2`.

1.1.5 This report proves bounded local construction and verification only. It
does not represent Product approval, independent hostile review,
Reconciliation, Definition Acceptance or authorization to deploy.

## 1.2 Frozen inputs

1.2.1 Pass 2 v3 Closed Schema Registry root=
`6374ced141b6a1bafff816e1676a5004dbcb51b4fd8fc0437b1b2eb7be6c83e6`.

1.2.2 Pass 3 v2 toolchain commits=
`b3e2398`, `9933c1d`, `980f27c`; the final generated outputs were produced only
after all three commits were frozen.

1.2.3 Subject input roots, predecessor captures, Requirement source spans and
schema identities are consumed from immutable committed paths. No workstation
absolute path, Secret, customer record or invented provider receipt is an input.

## 1.3 Exact outputs

1.3.1 Subject content root=
`4f02df67992c3fadbd64bc104cdff1b149889ca912370fa3f2594e4805f95fb8`;
raw SHA-256=
`48f74903c52e42136852178cc034456db3fe4b2340e59fcf9e13df4b645665d6`;
physical size=`355716 bytes`.

1.3.2 Clause AST Registry content root=
`120cac68a82eca4bb1169cabaf7a591a57ccca8498a6334306806e4bbdf79a7d`;
raw SHA-256=
`3344d08d8a4f71afa0d8a6043596e4a3fed04e9de54a5a9bbb9850692e3958ff`;
physical size=`409935 bytes`.

1.3.3 State Machine Registry content root=
`782fdc11ee64943b174dd0616c0b7c3820537f4f991b68a2c7639db45914e04d`;
raw SHA-256=
`6c9058a04ef31eb5c6f7215e5ecf39d995a62f06dfd4ddff25b104c1ef8b30fa`;
physical size=`3033392 bytes`.

## 1.4 Mechanical denominators

1.4.1 Requirements=`128`; independent source bindings=`128`; compiled Clause
programs=`128`; closed operators=`44`.

1.4.2 Reconstructable virtual Clause Nodes=`492`; reconstructable virtual
Counterexample Obligations=`492`; unreconstructable roots=`0`.

1.4.3 State families=`7`; machines=`17`; canonical transitions=`3554`;
expanded transitions=`7879`; Data Lifecycle denominator=`3200`.

1.4.4 Engine A and separately implemented Engine B produced identical semantic
outcomes. Agreement root=
`77b81b0e40749b0edbb1961e0a7cc5b679b8e81921389ef5b9a38fb8f8b96732`.

1.4.5 Toolchain root=
`f85f83270aca2d9d959af33913143d04e5edb1fb92fce04925bc3397316bc2b2`.

1.4.6 Hostile mutations=`8/8 BLOCK`; missing/extra Requirement, program,
state-family and transition coverage=`0`.

## 1.5 Repository gates

1.5.1 both application builds=`PASS`.

1.5.2 tests=`3984/3984 PASS`; TypeScript=`PASS`; ESLint=`0 errors and 28
historical warnings`.

1.5.3 Source Guard=`PASS` across `806` files, `35` client graphs and `1860`
TypeScript dependency edges.

1.5.4 Secret hygiene including Git history=`PASS`.

1.5.5 final verifier after commit=`COMMITTED-CLEAN`.

## 1.6 Rejected pre-freeze attempts

1.6.1 The uncommitted outputs first generated from commit `b3e2398` have zero
credit. Engine B found an unsupported `null`/`BODY-PATH` identity mode. The
files were removed before the validator fix was frozen.

1.6.2 The uncommitted outputs generated from commit `9933c1d` also have zero
credit. Source Guard blocked an unnecessary direct Python package entry. The
package boundary was corrected at `980f27c`, then all outputs were regenerated.

1.6.3 No rejected root is an input to Pass 4.

## 1.7 Next authorized local pass

1.7.1 Pass 4 may construct the complete causal graph and two independent Graph
Engine reports from the exact committed Pass 3 roots.

1.7.2 Pass 4 may implement and test root-overlay/invalidation rules, but must
not emit the final overlay before exact Pass 5 vector and Pass 6 packet/head
roots exist.

1.7.3 Atomic Package construction remains Pass 6 work. No placeholder or
future root may be invented to accelerate it.
