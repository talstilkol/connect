# 1. Connect — Bootstrap Authority Envelope B0 v8 immutable candidate

## 1.1 Verdict and claim boundary

1.1.1 `artifactId=CONNECT-B0-V8-SUBJECT-2026-08-30-G0`.

1.1.2 This is an immutable planning Candidate built from committed input `e458970e81ca5d0cb092fbf590a98631d6358276`. It is not Authority, Acceptance, production evidence or permission to remove the development freeze.

1.1.3 Current state remains `B0=ABSENT`, `Gate29=BLOCKED`, `developmentFreeze=ACTIVE`, `Acceptance=0`, `authorityOutputs=0`, `repositoryVisibility=PUBLIC`.

1.1.4 Tal is the sole work owner. Primary/Backup assignments are removed. Logical separation requirements remain unsatisfied until externally appointed, controller-separated evidence exists.

1.1.5 No signature algorithm was selected, no key was generated, and no cryptographic-random value was created. Per-use approval remains required before an actual cryptographic use.

## 2. Executable local controls

2.1 Canonical JSON rejects unsafe integers, non-scalar Unicode and unknown object keys. Every package boundary has an exact closed schema rooted by SHA-256 with domain separation.

2.2 Source reads walk every path component, reject traversal, symlinks and hard links, require regular files, open with no-follow, compare device/inode/size after open and enforce repository containment and byte limits.

2.3 CAS uses exact state and attempt schemas, exact head/revision revalidation, a typed Permit, detached receipts, keyed Permit/replay/attempt ledgers, one returned atomic state, a persisted Outbox identity and authoritative response-loss readback.

2.4 Recovery requires five distinct member controllers, exactly three unique acknowledgements, two distinct non-overlapping witnesses, exact head revalidation and one returned rotation/revocation/consume/head transition.

2.5 A causal global trace is ordered and root-linked. Producer PASS, Reader PASS and Review do not create Acceptance.

## 3. Exact finding controls

1. B0V7-IHR-F001 (P0) — closed schema dialect and recursive validation; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=none.

2. B0V7-IHR-F002 (P0) — detached authenticated Acceptance context; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=DETACHED-ACCEPTANCE-CONTEXT.

3. B0V7-IHR-F003 (P0) — Genesis, Appointment, trust and signature contract; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=GENESIS-APPOINTMENT-SIGNATURE,TRUST-ANCHOR.

4. B0V7-IHR-F004 (P0) — typed Permit, trusted time, revocation and keyed replay; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=TRUSTED-TIME,PERMIT-SIGNATURE,REVOCATION-RECEIPT.

5. B0V7-IHR-F005 (P0) — one executable CAS transaction and durable adapter contract; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=DURABLE-TRANSACTION-ADAPTER.

6. B0V7-IHR-F006 (P0) — controller-separated 3-of-5 Recovery quorum; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=FIVE-CONTROLLER-APPOINTMENTS,TWO-WITNESS-APPOINTMENTS.

7. B0V7-IHR-F007 (P0) — exact Recovery read revalidation and atomic rotation; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=DURABLE-RECOVERY-ADAPTER.

8. B0V7-IHR-F008 (P0) — causal global policy and no-self-credit; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=EXTERNAL-ADMISSION-TRACE.

9. B0V7-IHR-F009 (P0) — actual-interface provenance and precommit policy; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=DETACHED-INTERFACE-PROVENANCE-RECEIPT.

10. B0V7-IHR-F010 (P1) — detached Reader provenance and independence; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=TWO-INDEPENDENT-READER-APPOINTMENTS.

11. B0V7-IHR-F011 (P1) — no-follow source reads and repository containment; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=none.

12. B0V7-IHR-F012 (P1) — authenticated PUBLIC remote evidence; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=AUTHENTICATED-PUBLIC-REMOTE-RECEIPT.

13. B0V7-IHR-F013 (P1) — closed package inventory and total growth bound; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=none.

14. B0V7-IHR-F014 (P0) — executable predecessor behavior non-weakening; local=IMPLEMENTED-CANDIDATE; closure=OPEN-PENDING-INDEPENDENT-EVIDENCE; external=INDEPENDENT-PREDECESSOR-BEHAVIOR-ORACLE.

## 4. Frozen package facts

4.1 Frozen source rows: `9`; source set root: `c221c71d96fa38f3485430fc9f2296f3dcb8bda625c50463add4a75f6ed34daa`.

4.2 Finding crosswalk rows: `14`; locally implemented Candidate controls: `14/14`; independent closure: `0/14`.

4.3 Hostile protocol mutations blocked locally: `14/14`; corpus root: `22e9dc0b37b988cfdf4acff89840251ef2fe1489032424f23132b6027df72bf1`.

## 5. External blockers retained

5.1 Trusted time, external trust anchors, actual signature verification, authenticated GitHub PUBLIC evidence, durable adapter evidence, independent Reader appointments and predecessor behavior-oracle completion remain absent.

5.2 The deterministic protocol vectors contain no customer, contact, campaign, payment or other business records. They exercise only protocol states and hashes.

5.3 A Producer QA or cross-runtime Reader result may verify reproducibility but cannot close a Finding or create B0.

## 6. Terminal rule

6.1 The Candidate remains `NOT-ACCEPTED` until all external receipts are supplied, the predecessor behavior oracle is complete, two genuinely independent Readers are appointed and a detached authorized Acceptance is recorded.
