# Protocol v1.8 immutable successor — detached Producer QA

## 1. Outcome

1.1 PRODUCER-MECHANICAL-QA=PASS.

1.2 Reader A and Reader B independently recomputed identical packageRoot, vectorResultSetRoot and commonResultRoot.

1.3 packageRoot=2aec14f85da9068568a0e603292f036bd27a2d4e6c81720e7c59b7bed0c2618d.

1.4 manifestRoot=5adef086892216bc897e9e9507a6963d0c29dbb3776427a3d3347360ebf42c64.

1.5 readerAReportRoot=841f30b29934c2863b951c810d8593ba3b2973724ccfb1eb0237ee7704a27292;readerBReportRoot=ae5c02a490a1b79c36e0ca7eac2e3f5e70ab88fe68e564e93dd4dfd3ebbfe66a;commonResultRoot=3c71f0abdefe0ace8b977efd256537379bac380563203aef05ef5daf3246e0ad.

## 2. Exact denominators

2.1 v1.7ReviewFindings=25;closureRows=25;mergedRows=0;acceptanceCredit=0.

2.2 predecessorFindingRows=31;semanticPreservationRows=57466;v1.7PredicateRows=4016;v1.7SemanticUseRows=53450.

2.3 vectors=649;predecessorVectors=574;successorVectors=75;graphNodes=3245;graphEdges=2596;graphCoverage=649/649.

2.4 schemas=69;unresolvedSchemaReferences=0;emptyFieldTypes=0.

## 3. Authority boundary

3.1 Acceptance=0;Gate29=BLOCKED;developmentFreeze=ACTIVE;repository=PUBLIC;authorityOutputs=0.

3.2 Mechanical PASS is not semantic Acceptance. Independent semantic receipt, three reviews, reconciliation, HumanApproval, trust/time/finality, live CAS heads and continuous PUBLIC receipt remain missing.

3.3 The positive path is synthetic and non-authoritative. Production adapters are absent. No self-acceptance or Permit issuance occurred.

3.4 No product, Git, GitHub, provider or deployment mutation was performed.

