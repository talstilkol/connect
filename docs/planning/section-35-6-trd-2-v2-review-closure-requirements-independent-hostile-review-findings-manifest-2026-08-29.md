# 1. Connect — TRD-2 v2 review-closure independent hostile-review findings manifest

## 1.1 זהות וגבול סמכות

1.1.1 `artifactId=CONNECT-SECTION-35-6-TRD-2-V2-REVIEW-CLOSURE-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-2026-08-29-V1`.

1.1.2 reviewed Subject path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v2-review-closure-requirements-2026-08-29.md`; exact raw SHA-256=`7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d`.

1.1.3 source review path=`/Users/tal/Documents/connect/web/docs/planning/section-35-6-trd-2-v2-review-closure-requirements-independent-hostile-review-2026-08-29.md`; exact raw SHA-256=`fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b`; physical identity=`439 lines/32524 bytes`.

1.1.4 status=`REVIEWER-LOCAL-OBSERVATIONS; OPEN; NOT-RECONCILED; NOT-ACCEPTED; NOT-GATE-CREDIT`.

1.1.5 namespace=`TRD2V2-IHR-F001..TRD2V2-IHR-F016`; count=`16`; severity=`P0=9,P1=7,P2=0,P3=0`.

1.1.6 Public repository intent=`PRESERVED`; Private visibility remediation=`FORBIDDEN`; Git/Push/Merge/Release/Deploy/Provider authority=`NONE`.

1.1.7 Gate29=`BLOCKED`; Development freeze=`ACTIVE`; Product completion, remaining person-hours, critical path ו־calendar ETA=`unknown/unavailable`.

## 1.2 Record contract

1.2.1 לכל Finding בדיוק עשרה שדות: `findingId`, `severity`, `location`, `defect`, `cause`, `consequence`, `requiredFix`, `acceptancePredicate`, `status`, `noMergeKey`.

1.2.2 `noMergeKey` חייב להיות זהה בדיוק ל־`findingId`; Similarity, shared source, shared remediation או shared consequence אינם Merge authority.

1.2.3 כל Acceptance predicate הוא דרישת Closure עתידית בלבד; הוא אינו מוכיח שה־Fix קיים ואינו סוגר את ה־Finding.

# 2. P0 findings

## 2.1 `TRD2V2-IHR-F001`

- `findingId`: TRD2V2-IHR-F001

- `severity`: P0

- `location`: subject §§2.1.1–2.1.4,4–7,8.1; source record contracts in Producer §3, Math report §§2–4 and manifest §1.2, Security manifest §1.2, Structural report §2.2

- `defect`: 84 identities are present but full observations are not preserved; severity, locators, safe terminals, source basis, statuses, merge keys, report/closure locators, source contract/finding identities and D31 digest/claim-limit data are omitted

- `cause`: the selected five-field projection was treated as equivalent to lossless observation preservation

- `consequence`: the reviewed Subject alone cannot reconstruct the authoritative reviewer-local record, its claim limit or fail-closed behavior

- `requiredFix`: create a successor with one complete SourceObservationEnvelope per local identity, or exact record bytes plus recordDigest, recordLocator and a field-complete projection manifest; preserve all 84 without merge

- `acceptancePredicate`: two independent extractors reconstruct all source fields and exact record digests for 84/84 records; omitted, changed and unresolved fields are zero; D31 digest and claim limit are preserved

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F001

## 2.2 `TRD2V2-IHR-F003`

- `findingId`: TRD2V2-IHR-F003

- `severity`: P0

- `location`: subject §§2.1.2–2.1.5,3–7,9.1.2,9.1.5–9.1.6

- `defect`: Markdown records lack a canonical grammar, encoding/code-point policy, escaping, list semantics, unknown representation, field/order authority and record/collection digest algorithm

- `cause`: heading and line-count QA replaced a single defined source-to-logical-to-byte serialization pipeline

- `consequence`: parsers can pass 85/85 structure while producing different values, arrays or roots; byte-exact preservation cannot be replayed formally

- `requiredFix`: define a versioned CanonicalizationProfile for raw bytes and logical records, including UTF-8, LF, code-point/Bidi policy, escaping, fixed fields, ordered arrays, MissingValue union and record/collection digests

- `acceptancePredicate`: two independent serializers produce identical 85 record digests and collection root; Unicode, Bidi, newline, delimiter and order mutants are rejected or change the root; hidden fields are zero

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F003

## 2.3 `TRD2V2-IHR-F004`

- `findingId`: TRD2V2-IHR-F004

- `severity`: P0

- `location`: subject §§1.1.2–1.1.5,2.1.6,3.1 TRD2V2-REQ-000,7.5 TRD2V2-REQ-056,9.2

- `defect`: REQ-000 is inside the Subject it is expected to authorize, omits the current Subject root and points to a task instruction whose durable authority-local ID is unknown; B0 is only a later requirement inside the same Subject

- `cause`: external authority, Freeze, Candidate identity and Acceptance lifecycle were not separated into earlier detached records

- `consequence`: the Subject cannot grant itself authority, Freeze or Acceptance; the acyclic ID graph still contains a Bootstrap paradox

- `requiredFix`: create detached predecessor B0/AuthorityEnvelope and FreezeReceipt records with exact candidate root, scope, actor/role, authority root, times, revocation and permitted acts

- `acceptancePredicate`: B0 and FreezeReceipt predate and are outside the Candidate; authority ID/root resolves; exact candidate root is bound; self and future-generation authority edges are zero in two readers

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F004

## 2.4 `TRD2V2-IHR-F005`

- `findingId`: TRD2V2-IHR-F005

- `severity`: P0

- `location`: subject §2.1.5 and every dependencies field, especially TRD2V2-REQ-008..051 and TRD2V2-REQ-052

- `defect`: the syntactic graph has two weak components; Structural rows are disconnected from Freeze, while Producer/Math/Security rows omit cross-family closure prerequisites and edge types

- `cause`: reviewer-local dependencies were preserved in one untyped list and no separate derived closure graph was created

- `consequence`: an executor can validate security or mathematics before required schema/authority, or process all Structural requirements without the Freeze root

- `requiredFix`: preserve source dependencies separately and add typed provenance, closure-prerequisite, validation and invalidation edge registries with reviewed rationale

- `acceptancePredicate`: all 85 records are reachable from a detached Freeze root; weak components equal one; no dangling, self or cycle edges; every predicate input is a typed predecessor; required-edge mutants fail

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F005

## 2.5 `TRD2V2-IHR-F006`

- `findingId`: TRD2V2-IHR-F006

- `severity`: P0

- `location`: subject §§2.1.3–2.1.4,4.1–4.7,6.1–6.20,9.2.2

- `defect`: seven Rules and twenty Acceptance predicates are unknown, but no typed MissingValue record, authority owner, resolution workflow, successor trigger or safe terminal is defined

- `cause`: correct non-invention was represented as prose strings instead of a closed missing-value state machine

- `consequence`: the artifact is not a complete closure baseline and consumers can coerce missing values to empty/default or fill them without authority

- `requiredFix`: define a MissingValue union with field, reason, source root, blocker, authority role, resolution predicate, safe terminal, successor trigger and status; forbid inference

- `acceptancePredicate`: all 27 missing values are typed and acceptanceEligible=false; default, coercion and inference mutants fail; authorized resolution creates a successor rather than mutating the Subject

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F006

## 2.6 `TRD2V2-IHR-F007`

- `findingId`: TRD2V2-IHR-F007

- `severity`: P0

- `location`: subject all acceptancePredicate fields and §§9.1.5–9.2.2

- `defect`: predicates have no executable language/version, evaluator, exact input root, test IDs, expected output, failure terminal, evidence schema or runner identity; twenty are explicitly absent

- `cause`: reviewer prose was copied without compilation into independent ConformancePredicate records

- `consequence`: the same bytes can receive different PASS, FAIL or UNKNOWN results from different reviewers

- `requiredFix`: create executable ConformancePredicate records with version, input schema/root, evaluator root, test vectors, expected result, failure terminal, evidence schema and validity

- `acceptancePredicate`: every acceptable Rule has an executable predicate; unknown predicates are zero before Acceptance; two runners produce identical result roots; missing, stale or wrong-root evidence blocks

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F007

## 2.7 `TRD2V2-IHR-F008`

- `findingId`: TRD2V2-IHR-F008

- `severity`: P0

- `location`: subject §§2.1.2–2.1.4,4.1–4.7,6.1–6.20; Producer source §3; Security manifest §§2–4

- `defect`: seven Producer and twenty Security safe terminals exist in source records but are absent from the successor rows; twenty missing predicates refer to safe terminals that were not copied

- `cause`: fail-closed behavior was excluded from the selected projection

- `consequence`: missing evidence or predicates leave Public, provider, deletion, restore, AI, file and tenant capability fallback behavior undefined

- `requiredFix`: preserve every exact source safe terminal; represent a genuinely missing terminal as MissingValue; bind each terminal to its capability, metric or gate scope

- `acceptancePredicate`: all 27 source safe terminals are byte-exact or typed missing according to source; every missing, stale and wrong-root path reaches the required terminal; implicit enabled/default-success paths are zero

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F008

## 2.8 `TRD2V2-IHR-F009`

- `findingId`: TRD2V2-IHR-F009

- `severity`: P0

- `location`: subject §§1.1,2.1.6,6.6 TRD2V2-REQ-037,7.5–7.6 TRD2V2-REQ-056..057,9.2.2

- `defect`: no accepted Protocol root, complete ReviewEnvelope, reviewer appointment/independence proof or eligible packet is bound; the Subject itself states the workflow is blocked

- `cause`: legacy observations were preserved before the review lifecycle protocol received independent acceptance

- `consequence`: this review and the 84 observations can provide discovery only, not closure transfer, acceptance or protocol conformance

- `requiredFix`: accept an external protocol first, bind eligible review records to the exact successor root, prove appointments/independence, run two actual generations and retain detached results

- `acceptancePredicate`: protocol acceptance predates the packet; roles and independence pass; two normalizers agree; two real generations complete without receipt carry-over; legacy observations remain historical only

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F009

## 2.9 `TRD2V2-IHR-F010`

- `findingId`: TRD2V2-IHR-F010

- `severity`: P0

- `location`: subject TRD2V2-REQ-044,046,047,048,049,074,075,077,079,080,081 and their dependency fields

- `defect`: file-derived data, Legal Hold, deletion, backup, restore, privacy replay, re-deletion, unknown attempts, test-input expiry and invalidation lack a shared typed lifecycle graph and transition table

- `cause`: Security and Structural lifecycle observations remain in separate dependency components

- `consequence`: restore can be accepted without re-deletion, deletion without hold-race reconciliation, or derived purge without object-version lineage; byte consistency can be mistaken for privacy safety

- `requiredFix`: define a DataLifecycle graph covering source object, derived data, backup cohort, restore quarantine, privacy replay, re-deletion, Hold, CAS, partial/unknown attempts and invalidation

- `acceptancePredicate`: every data class/store is uniquely covered; active, hold, partial and unknown states fail closed; deletion, restore, hold-race, resurrection and cascade mutants fail all required modes; deleted or opted-out data never reactivates

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F010

# 3. P1 findings

## 3.1 `TRD2V2-IHR-F002`

- `findingId`: TRD2V2-IHR-F002

- `severity`: P1

- `location`: subject §§4–8, especially §8.1.2–8.1.6 and every sourceIds field

- `defect`: severity is only an aggregate; rows lack original/effective severity and source binding, and Security F019 promotion is not bound to machine-evaluated reachability

- `cause`: severity was retained as a family summary instead of a local observation field

- `consequence`: rows can be misassigned, promoted late or downgraded while the aggregate vector remains unchanged

- `requiredFix`: add originalSeverity, effectiveSeverity, severitySourceRoot, transitionConditionRoot, evaluatedAt and immutable history per local observation; derive aggregates only

- `acceptancePredicate`: 84/84 severity bindings resolve; the derived vector is exactly P0=39,P1=37,P2=6,P3=2; permutation, reassignment, downgrade and F019 reachability mutants fail

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F002

## 3.2 `TRD2V2-IHR-F011`

- `findingId`: TRD2V2-IHR-F011

- `severity`: P1

- `location`: subject §§1.1.3–1.1.5,3.1, all sourceIds fields,9.1.3–9.1.5

- `defect`: most rows carry only root and local ID; source artifact path/capture identity, section/record locator, record digest, parser profile and deterministic root-to-artifact resolver are absent

- `cause`: an artifact hash was treated as a complete addressable record identity

- `consequence`: offline replay requires an undefined filesystem search and cannot deterministically handle missing artifacts or repeated IDs under another root

- `requiredFix`: add a SourceArtifactIndex and SourceRecordLocator with capture address, artifact root, record locator/digest, parser profile, authority class and unavailable terminal

- `acceptancePredicate`: 84/84 locators resolve uniquely in two resolvers; root, path, locator and digest mismatches fail; no filesystem search or ambiguous ID remains

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F011

## 3.3 `TRD2V2-IHR-F012`

- `findingId`: TRD2V2-IHR-F012

- `severity`: P1

- `location`: subject §§2.1.6,8.1.7,9.1.6,9.2.1–9.2.3

- `defect`: accepted, closed, Gate29, freeze and PASS-CANDIDATE states are embedded without asOf or validThrough inside immutable candidate bytes

- `cause`: invariant content, author-time observation and lifecycle state were not separated

- `consequence`: future acceptance makes the bytes stale or requires mutation that invalidates the reviewed root; readers cannot tell Current from historical

- `requiredFix`: keep only invariants in the Subject and move status, acceptance and invalidation into detached snapshots/envelopes with subjectRoot, time bounds, supersession and pointer CAS

- `acceptancePredicate`: status changes do not alter the Subject root; every status read is root- and time-bound; stale snapshots are not Current; ambiguous CAS creates conflict with zero automatic second write

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F012

## 3.4 `TRD2V2-IHR-F013`

- `findingId`: TRD2V2-IHR-F013

- `severity`: P1

- `location`: subject especially TRD2V2-REQ-008,018,032–051,056–080

- `defect`: many Rules combine multiple schemas, transitions, tests, actors and outputs but have no AtomicClause children or conjunctive roll-up

- `cause`: no-merge preservation was conflated with a ban on decomposing an immutable parent observation

- `consequence`: partial implementation can appear as full observation closure; ownership, output, evidence, failure and rework cannot be isolated

- `requiredFix`: retain each observation as a zero-credit immutable parent and create one-action AtomicClause children with separate product/evidence outputs and test IDs

- `acceptancePredicate`: every compound Rule is decomposed; each child passes atomicity; parent closure requires all mandatory children; source parent identity and noMergeKey remain intact with no semantic omission

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F013

## 3.5 `TRD2V2-IHR-F014`

- `findingId`: TRD2V2-IHR-F014

- `severity`: P1

- `location`: subject TRD2V2-REQ-034,045,050,072,078 and §§8.1.4,9.2.3

- `defect`: Public intent and the ban on Private remediation are preserved, but exact D18-A2/current Public-cyber roots, control denominator, readback schema and Hardening gate are absent; REQ-050 predicate is unknown

- `cause`: a historical Security observation was preserved while newer Public/cyber review outputs remained outside the raw intake

- `consequence`: visibility must remain Public, but Push, Merge, Release and Deploy cannot be authorized; a broad policy claim can precede control evidence

- `requiredFix`: keep Public binding; disposition D18-A2 and all current Public/cyber findings; define PublicRepoHardeningProfile, bypass tests, exact-diff permit and two live readbacks under later authority

- `acceptancePredicate`: Public remains intended; Private remediation paths are zero; D18/current cyber roots have explicit dispositions; every admitted control maps to test, evidence and gate; mutation paths remain unreachable until the gate passes

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F014

## 3.6 `TRD2V2-IHR-F015`

- `findingId`: TRD2V2-IHR-F015

- `severity`: P1

- `location`: subject §§1.1.4–1.1.5,2.1,4.4 TRD2V2-REQ-004,7.3–7.4 TRD2V2-REQ-054..055,9.2.2

- `defect`: no accepted finite SourceSet root, discovery cut or admitted/excluded disposition exists; at least 32 current Public/cyber observations are outside the frozen 84

- `cause`: the artifact was produced before Source-universe acceptance as a narrow closure intake

- `consequence`: it is historical preservation only and cannot support complete TRD2 or complete cyber coverage claims

- `requiredFix`: accept a Source-universe contract, create CandidateSourceSet and AdmittedSourceSet exact roots, disposition every source and create a successor on cut change

- `acceptancePredicate`: admitted plus excluded plus blocked equals the finite candidate denominator; missing and double dispositions are zero; later sources are outside the exact cut or included in a successor

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F015

## 3.7 `TRD2V2-IHR-F016`

- `findingId`: TRD2V2-IHR-F016

- `severity`: P1

- `location`: subject §9.1.1–9.1.6

- `defect`: PASS-CANDIDATE has no detached runner/version, command, input root, raw output root, time, environment, negative vectors or independent replay evidence

- `cause`: QA result prose was embedded in the Subject rather than emitted as evidence

- `consequence`: the PASS cannot be replayed offline, detect parser drift or remain clearly separate from independent review credit

- `requiredFix`: create a detached MechanicalQAResult with subject root, runner root/version, vector root, command/config, counters, raw-output digest, times and independent replay

- `acceptancePredicate`: two independent runs on the same root produce identical counters and output digest; every invariant has a failing negative mutation; self-authored PASS grants zero Acceptance credit

- `status`: OPEN-REVIEWER-LOCAL

- `noMergeKey`: TRD2V2-IHR-F016

# 4. QA and disposition

## 4.1 Manifest QA

4.1.1 exact IDs=`TRD2V2-IHR-F001..TRD2V2-IHR-F016`; unique=`16`; missing=`0`; duplicate=`0`.

4.1.2 ten fields per record=`16/16`; missing field=`0`; extra field=`0`.

4.1.3 severity partition=`P0=9,P1=7,P2=0,P3=0`; total=`16`.

4.1.4 status=`OPEN-REVIEWER-LOCAL` for `16/16`; closed=`0`; merged=`0`; suppressed=`0`; accepted=`0`.

4.1.5 noMergeKey equals findingId=`16/16`.

## 4.2 Source-root QA

4.2.1 reviewed Subject root=`7bd7806dda480f06490ad6f5ca393721e7fc40056969f6d14366658ee4e23a7d`.

4.2.2 independent report root=`fcc70815ab354d472039dce93d2d123314a01b14398e6b06364290fa8a7c058b`.

4.2.3 raw intake root=`031166ff25d41f1714fb8a7f8091173059312ea513d12708cffe6d6fe3314f53`.

4.2.4 Producer/Math/Security/Structural source roots=`8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f;66082d029e559471dd53bff2e48bd4eacaaa3b1aba402e91c73c751147c3a362;61690f575bcfe59361b0f6eddbff615980aaa92e8655fef3e289ea6d23e28c1b;f9e66d51c762670fc8b9096276cdaa1b5c4b9d76ee200f0fe2ecb54f671be5ec;3937f0f183ea1d0a388b289394b9c33be75d518d6ea4a25208cacb4c711137ae;34f21d38dd0a032175153052bdc5cc0db2a9dd99ee867119e8e2cb58cccc8421`.

## 4.3 Safe terminal

4.3.1 review verdict=`REJECT-AS-LOSSLESS-EXECUTABLE-TRD2-CLOSURE-BASELINE`.

4.3.2 next artifact=`SUCCESSOR-REQUIRED`; current Subject mutation=`FORBIDDEN`.

4.3.3 TRD-2 successor Definition generation=`BLOCKED`; accepted Subject rows=`0/85`; accepted findings=`0/16`.

4.3.4 Gate29=`BLOCKED`; Development freeze=`ACTIVE`; Public intent=`PRESERVED`; Product/Git/Provider authority=`NONE`.

4.3.5 Product completion, remaining person-hours, critical path ו־calendar ETA=`unknown/unavailable`.
