# 1. Connect — Discovery Cutoff v3 tool contract

## 1.1 Purpose

1.1.1 v3 replaces v2 only as the active generation cutoff. v1 and v2 remain immutable historical evidence.

1.1.2 v3 freezes a clean Git input commit after the complete Source Universe v4 builder, two Reader implementations, finalizer, verifier and tests exist in committed bytes.

1.1.3 It predeclares four Cutoff outputs, 23 Source Universe v4 package outputs and five review or acceptance outputs.

## 1.2 Required sequence

1.2.1 Commit and verify the entire v4 toolchain before observation.

1.2.1.1 The frozen toolchain includes its closed path registry, every local runtime dependency, both Reader implementations, tests and command manifest. Omitting a transitive local dependency invalidates generation.

1.2.2 Generate the four Cutoff v3 outputs without committing or changing any other path.

1.2.3 Generate the 19 normative v4 members, Reader A, Reader B, manifest and Producer QA while the current HEAD remains the observed HEAD.

1.2.4 Commit Cutoff v3 and v4 package outputs only after final uncommitted verification passes.

1.2.5 Any non-declared byte change between v3 observation and v4 generation makes v3 stale and requires a new cutoff generation.

## 1.3 Invariants and claim limits

1.3.1 Repository visibility remains `PUBLIC`; development freeze remains `ACTIVE`; Gate29 remains `BLOCKED`; owner remains Tal.

1.3.2 No secret, private locator, customer data, cryptographic key, signature, random identifier or unapproved cryptographic operation is generated.

1.3.3 Local Reader PASS is Producer QA only. It is not independent review, trusted time, source admission, Acceptance or authority.

1.3.4 Missing GitHub API surfaces, private source custody, official-source occurrence coverage, Generation B and external reviews remain explicit blockers.

1.3.5 Reader A and Reader B must independently derive the same toolchain root from the exact closed registry. A generic PASS without that root is invalid.
