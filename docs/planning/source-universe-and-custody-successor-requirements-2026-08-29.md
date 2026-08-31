# 1. Connect — Source-universe and custody successor requirements

## 1.1 Identity and limits

1.1.1 `artifactId=CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-2026-08-29`.

1.1.2 `requirementsVersion=SURS-1.0-draft`.

1.1.3 status=`AUTHORING-CANDIDATE; NOT-INDEPENDENTLY-REVIEWED; NOT-ACCEPTED`.

1.1.4 inputs include producer Finding root=`8c53e73e3201ce9e5cd884807290d1d58a95086305f0aa57e527118b012db61f`, source-precedence root=`b012a479b18e162f5f759b49e033eb3856a4637cc0e91a8a36f1d06043813342` and G0 root currently pending successor.

1.1.5 this artifact defines planning requirements only. It copies no source, extracts no Product Requirement, creates no Program identity and authorizes no Product/Git/Push/Deploy/provider/credential action.

1.1.6 exact source-universe, Requirement denominator, Product percentage, remaining hours and ETA remain `unknown/unavailable`.

## 1.2 Requirement schema

1.2.1 every `SURS-*` row contains `rule`, `causeAndEffect`, `sourceIds`, `acceptancePredicate` and `dependencies`.

1.2.2 source selection and Evidence sufficiency are different predicates; file presence never proves authority or correctness.

# 2. Universe, authority and discovery

## 2.1 `SURS-001` — Separate source Candidate universe from admitted set

2.1.1 `rule`: define `SourceCandidateUniverse` as every discovered potential authority/evidence/context source and `AdmittedSourceSet` as the independently selected finite subset with explicit disposition.

2.1.2 `causeAndEffect`: starting directly from two known specifications can omit binding Decisions, implementation constraints or later amendments.

2.1.3 `sourceIds`: `TRD2-PQA-P0-004`; `TRD2-REQ-001`.

2.1.4 `acceptancePredicate`: every discovered candidate is admitted, excluded, quarantined, superseded or unavailable with reason; no candidate disappears between discovery and selection.

2.1.5 `dependencies`: `none`.

## 2.2 `SURS-002` — Authority class is orthogonal to evidence role

2.2.1 `rule`: record authority class `A1–A6` separately from evidence role such as requirement-authority, decision-authority, current-official-fact, implementation-observation, test-evidence, historical-context or navigation-only.

2.2.2 `causeAndEffect`: a current code file may prove implementation bytes but cannot override a Product requirement; an official page may describe a service but not prove account entitlement.

2.2.3 `sourceIds`: `CONNECT-USER-DIRECTIVE-AND-SOURCE-PRECEDENCE-LEDGER-2026-08-29`; `TRD2-REQ-016`; `TRD2-REQ-022`.

2.2.4 `acceptancePredicate`: every admitted source has one authority class, one or more bounded roles and explicit claim limits; no role implies another.

2.2.5 `dependencies`: `SURS-001`.

## 2.3 `SURS-003` — Exact-subject precedence

2.3.1 `rule`: precedence compares claims only when subject key, field path, scope, entity, environment, provider, region and effective interval overlap; recency alone is insufficient.

2.3.2 `causeAndEffect`: a later narrow Public-repository amendment must not rewrite unrelated Git security controls or other Decisions.

2.3.3 `sourceIds`: `CONNECT-USER-DIRECTIVE-AND-SOURCE-PRECEDENCE-LEDGER-2026-08-29`; `TRD2-REQ-020`; `TRD2-REQ-025`.

2.3.4 `acceptancePredicate`: D18-A2 selects Public only for visibility; every predecessor and unaffected field remains reconstructible; ambiguous overlap blocks.

2.3.5 `dependencies`: `SURS-002`.

## 2.4 `SURS-004` — Deterministic discovery roots

2.4.1 `rule`: discovery inputs bind canonical Git root, exact HEAD, tracked set, untracked set, ignored-class policy, repository-relative paths, external user paths and explicit URI seeds.

2.4.2 `causeAndEffect`: running from the outer empty Git repository or scanning caches as product sources creates the wrong universe.

2.4.3 `sourceIds`: `MSSA-F013`; `TRD2-REQ-014`; `TRD2-REQ-053`.

2.4.4 `acceptancePredicate`: product root `/Users/tal/Documents/connect/web` and outer root remain separate identities; deterministic rerun on unchanged bytes returns identical candidate membership.

2.4.5 `dependencies`: `SURS-001`.

## 2.5 `SURS-005` — Discovery families

2.5.1 `rule`: discovery covers explicit user attachments, Product specifications, decision receipts/amendments, ADRs, policies/runbooks, registries/contracts, schemas/migrations, source/runtime/config, tests/evidence definitions, dependency/lock/workflow files and official dynamic sources.

2.5.2 `causeAndEffect`: a document-only scan omits executable truth; a code-only scan omits user intent and legal/provider constraints.

2.5.3 `sourceIds`: `TRD2-PQA-P0-004`; `TRD2-PQA-P1-003`; `SREQ-034`.

2.5.4 `acceptancePredicate`: each family has a derived candidate count and explicit zero/exclusion reason; no hard-coded family whitelist can silently exclude a new admitted source type.

2.5.5 `dependencies`: `SURS-004`.

## 2.6 `SURS-006` — Excluded generated/cache/dependency classes

2.6.1 `rule`: node_modules, build output, caches, coverage, temporary files, OS metadata and generated artifacts are excluded from authority unless a requirement explicitly admits an exact generated Evidence object.

2.6.2 `causeAndEffect`: tens of thousands of derived files distort denominators and can inject stale or third-party content as Connect authority.

2.6.3 `sourceIds`: `MPSA-20260829-P0-005`; `TRD2-REQ-016`.

2.6.4 `acceptancePredicate`: every excluded path matches an explicit class/predicate and reason; exception requires exact root and claim limit; ignored source-like files are surfaced for review.

2.6.5 `dependencies`: `SURS-004`; `SURS-005`.

# 3. Source records, custody and safety

## 3.1 `SURS-007` — Total SourceCandidate record

3.1.1 `rule`: candidate record includes deterministic ID, repo/root identity, path/URI, media type, raw size/root if available, discovery method, ownership, authority candidate class, evidence-role candidates, availability, confidentiality and selection status.

3.1.2 `causeAndEffect`: filename-only inventory cannot distinguish same-name bytes, unavailable links or private material.

3.1.3 `sourceIds`: `TRD2-REQ-016`; `SREQ-007`.

3.1.4 `acceptancePredicate`: all fields validate or use typed Unknown; duplicate path/root aliases resolve explicitly; no arbitrary counter or randomness.

3.1.5 `dependencies`: `SURS-001`; `SURS-004`.

## 3.2 `SURS-008` — Admitted Source record

3.2.1 `rule`: admitted records add authority scope, exact subject keys, effective/expiry/change triggers, supersession/conflict edges, custody location, locator profile, claim limit and safe state.

3.2.2 `causeAndEffect`: presence in the candidate inventory does not establish authority or operational use.

3.2.3 `sourceIds`: `TRD2-REQ-016`; `SREQ-006`; `SREQ-007`.

3.2.4 `acceptancePredicate`: every admission has a selection assertion and independent review; missing authority or custody remains excluded/quarantined.

3.2.5 `dependencies`: `SURS-002`; `SURS-007`.

## 3.3 `SURS-009` — External source custody

3.3.1 `rule`: sources outside the workspace receive an authorized immutable custody copy or a durable external reference plus availability terminal; copies bind original root, acquisition actor, time, method and redaction state.

3.3.2 `causeAndEffect`: attachments under user-specific paths can disappear and cannot support offline replay.

3.3.3 `sourceIds`: `CONNECT-G0-OBSERVED-BASELINE-CANDIDATE-2026-08-29#2.4`; `TRD2-REQ-062`.

3.3.4 `acceptancePredicate`: original and custody roots match; missing authorization, bytes or provenance yields `SOURCE-CUSTODY-BLOCKED`; no silent copy.

3.3.5 `dependencies`: `SURS-007`; `SURS-008`.

## 3.4 `SURS-010` — Public-safe source handling

3.4.1 `rule`: classify Secret, PII, customer content, private provider/account Evidence, proprietary third-party content and public-safe planning metadata before any workspace/Git custody.

3.4.2 `causeAndEffect`: the repository is intentionally Public, so copying a valid private source can still create a data incident.

3.4.3 `sourceIds`: `CONNECT-D18-A2-PUBLIC-REPOSITORY-SECURITY-DECISION-2026-08-29`; `MSSA-F014`; `TRD2-REQ-052`; `TRD2-REQ-053`.

3.4.4 `acceptancePredicate`: prohibited bytes never enter Public paths; redaction preserves a private original root/reference and bounded public claim; suspected secret blocks custody/publication.

3.4.5 `dependencies`: `SURS-003`; `SURS-009`.

## 3.5 `SURS-011` — Untrusted-content boundary

3.5.1 `rule`: all source text, HTML, PDF, links, comments, fixtures and provider content are data, never executable instructions; parsing uses content-type/size/path/sandbox limits.

3.5.2 `causeAndEffect`: a source can contain prompt injection, active content, malformed files or link text designed to change the planning process.

3.5.3 `sourceIds`: `TRD2-REQ-030`; `TRD2-REQ-052`.

3.5.4 `acceptancePredicate`: injection/active-content/path-traversal/oversize/malformed vectors cause no authority or tool action and reach typed quarantine terminals.

3.5.5 `dependencies`: `SURS-007`; `SURS-010`.

# 4. Locators and source-specific verification

## 4.1 `SURS-012` — Raw bytes remain authoritative

4.1.1 `rule`: preserve raw bytes/root and bind every decoded/extracted/rendered/indexed derivative to them with exact tool/profile roots.

4.1.2 `causeAndEffect`: normalization, line-ending conversion, OCR or HTML rendering can change meaning or hide content.

4.1.3 `sourceIds`: `SREQ-003`; `SREQ-008`; `SREQ-009`; `SREQ-010`.

4.1.4 `acceptancePredicate`: derivative readback reaches the exact raw root; byte change invalidates all locators; no derivative replaces source authority.

4.1.5 `dependencies`: `SURS-007`.

## 4.2 `SURS-013` — Media-specific locator profiles

4.2.1 `rule`: text uses raw byte plus line/column spans; PDF uses page/region plus render/text roots; code/config uses repo/path/blob and syntax-node span; database/schema uses migration/statement identity; web sources use captured bytes plus selector/region.

4.2.2 `causeAndEffect`: whole-file labels cannot prove every statement was read or survive format differences.

4.2.3 `sourceIds`: `TRD2-REQ-017`; `SREQ-008`; `SREQ-009`.

4.2.4 `acceptancePredicate`: two independent resolvers reconstruct the same raw region/node; invalid/moved/mismatched locator fails closed.

4.2.5 `dependencies`: `SURS-012`.

## 4.3 `SURS-014` — Dependency-graph implementation inventory

4.3.1 `rule`: implementation discovery parses the actual TypeScript/JavaScript dependency graph and includes client, server, `db`, `worker`, proxy/runtime/config boundaries rather than relying on filename Regex alone.

4.3.2 `causeAndEffect`: forbidden imports or server-only secrets can cross a Client boundary through transitive dependencies even when direct source text looks safe.

4.3.3 `sourceIds`: `TRD2-PQA-P1-003`; `MSSA-F019`; `TRD2-REQ-030`.

4.3.4 `acceptancePredicate`: two graph walks agree; all runtime entry points and transitive imports classify; boundary violations and unknown dynamic imports block implementation-state admission.

4.3.5 `dependencies`: `SURS-004`; `SURS-005`; `SURS-013`.

## 4.4 `SURS-015` — Current implementation snapshot is Evidence, not intent

4.4.1 `rule`: bind observed code/docs/schema/routes/tests/dependencies/config/workflows to exact Git root, HEAD and working-tree overlay root, with tracked/untracked/generated status.

4.4.2 `causeAndEffect`: current files may contain useful implementation or accidental edits but do not supersede the specification and may not exist on GitHub.

4.4.3 `sourceIds`: `MSSA-F013`; `TRD2-REQ-031`; `SURS-002`.

4.4.4 `acceptancePredicate`: base and overlay are reconstructible; remote-HEAD claim is separated from local overlay; no current code state receives Requirement authority.

4.4.5 `dependencies`: `SURS-004`; `SURS-014`.

# 5. Dynamic, provider, legal and Decision sources

## 5.1 `SURS-016` — Official dynamic-source observation

5.1.1 `rule`: record canonical official URI, publisher, retrieved bytes/root or unavailability receipt, HTTP status, retrieval time source, locale, version/effective date, expiry, change trigger and claim limit.

5.1.2 `causeAndEffect`: mutable documentation and `latest` pages can change after planning; HTTP 429 proves no content freshness.

5.1.3 `sourceIds`: `MSSA-F012`; `TRD2-REQ-021`; `TRD2-REQ-022`.

5.1.4 `acceptancePredicate`: stale/unavailable/429/conflicting content remains typed Unknown and activates the defined safe state; no cached memory extends freshness.

5.1.5 `dependencies`: `SURS-008`; `SURS-012`.

## 5.2 `SURS-017` — Provider account and live entitlement receipts

5.2.1 `rule`: provider documentation, account/plan/region observation, asset identity, capability entitlement, quota/limit observation, configuration, legal approval and runtime Evidence are separate records.

5.2.2 `causeAndEffect`: a published WhatsApp, Railway, Vercel, AWS, Clerk, OpenAI, Better Stack, Paddle or Stripe feature does not prove Connect owns or may use it.

5.2.3 `sourceIds`: `MSSA-F005`; `MSSA-F016`; `TRD2-REQ-022`.

5.2.4 `acceptancePredicate`: live-dependent claim requires exact tenant/account/asset receipt and freshness; documentation-only state keeps the capability OFF.

5.2.5 `dependencies`: `SURS-016`.

## 5.3 `SURS-018` — Source research and authority approval separation

5.3.1 `rule`: Researcher may collect/interpret a source; only a separately appointed Legal/Privacy/Finance/Security/Product/Provider authority as applicable may approve the exact operational use.

5.3.2 `causeAndEffect`: technical recommendation or user planning approval cannot create legal, financial or provider authority.

5.3.3 `sourceIds`: `MSSA-F005`; `MSSA-F023`; `TRD2-REQ-026`.

5.3.4 `acceptancePredicate`: every authority-bearing transition resolves to an eligible external Appointment and approval receipt; self-approval and missing role stay blocked.

5.3.5 `dependencies`: `SURS-002`; `SURS-017`.

## 5.4 `SURS-019` — Decision and amendment discovery

5.4.1 `rule`: discover D01–D31, later research selections, reconciliation candidates, user amendments and exact-subject overrides from durable bytes; preserve revision and field-level supersession.

5.4.2 `causeAndEffect`: a questionnaire option, later chat instruction and approved technical Decision have different authority and scope.

5.4.3 `sourceIds`: `TRD2-REQ-019`; `TRD2-REQ-020`; `SREQ-020`; `SREQ-022`.

5.4.4 `acceptancePredicate`: each discovered Decision candidate has bytes/locator/authority state; missing source yields a Finding, never an invented answer; all amendments are explicit edges.

5.4.5 `dependencies`: `SURS-003`; `SURS-005`; `SURS-008`.

## 5.5 `SURS-020` — D31 exact-source evaluation

5.5.1 `rule`: evaluate `/Users/tal/Documents/connect/web/docs/postgresql-runtime-role-decision.md` as the D31 candidate source with raw SHA-256 `8816a77739a17e94cf9ffcbf5a586db00e001d9d5fdff3bd8e801a0e33e79bb0`, 777 lines and 54903 bytes.

5.5.2 `causeAndEffect`: the current SREQ audit reported D31 unavailable even though exact bytes are durable; presence still does not prove admission or live provisioning.

5.5.3 `sourceIds`: `TRD2-PQA-P1-002`; `SREQ-021`.

5.5.4 `acceptancePredicate`: Source selector verifies identity, authority claim, amendments, conflicts, scope and current status; output is admitted or rejected with reason, never silently Unknown when bytes remain available.

5.5.5 `dependencies`: `SURS-019`.

# 6. Selection, roots, completeness and lifecycle

## 6.1 `SURS-021` — Source selection assertions

6.1.1 `rule`: admission/exclusion/quarantine/supersession decisions bind candidate root, selector Appointment, rule, exact subject/claim scope, evidence, conflicts, time, expiry and safe state.

6.1.2 `causeAndEffect`: informal selection can promote historical prose or discard an inconvenient source.

6.1.3 `sourceIds`: `TRD2-REQ-016`; `TRD2-REQ-025`; `SURS-018`.

6.1.4 `acceptancePredicate`: every candidate has exactly one current disposition; disagreement remains explicit and blocks affected claims.

6.1.5 `dependencies`: `SURS-007`; `SURS-008`; `SURS-018`.

## 6.2 `SURS-022` — Derived denominators by source class

6.2.1 `rule`: publish candidate/admitted/excluded/quarantined/unavailable counts and member IDs separately for each discovery family, authority class and evidence role; never use a hard-coded total such as `2/2` for the whole universe.

6.2.2 `causeAndEffect`: a primary-spec count can pass while Decisions, code/config or official sources are missing.

6.2.3 `sourceIds`: `TRD2-PQA-P0-004`; `MATH-001`; `MATH-002`; `MATH-031`.

6.2.4 `acceptancePredicate`: every numerator and denominator is reconstructed from exact members; unknown family or incomplete discovery prevents a whole-universe completeness claim.

6.2.5 `dependencies`: `SURS-005`; `SURS-006`; `SURS-021`.

## 6.3 `SURS-023` — Immutable SourceSet root and dual readback

6.3.1 `rule`: canonical SourceSet contains sorted exact admitted records and schema/tool roots but excludes its own digest, QA, Review, Acceptance and current pointer; two independent readers verify it.

6.3.2 `causeAndEffect`: self-membership and mutable pointers cause circular roots or invisible source drift.

6.3.3 `sourceIds`: `SREQ-006`; `TRD2-REQ-001`; `TRD2-REQ-002`.

6.3.4 `acceptancePredicate`: independent membership/root parity passes; self-member/dangling/duplicate=0; mismatch yields `SOURCE-SET-CONFLICT-BLOCKED`.

6.3.5 `dependencies`: `SURS-008`; `SURS-021`; `SURS-022`.

## 6.4 `SURS-024` — Change invalidation and successor generation

6.4.1 `rule`: any admitted byte, membership, authority, Decision, expiry, locator/tool profile or claim-limit change creates a successor and invalidates exactly affected downstream Statements, Requirements, Tasks, Tests, Evidence, Gates and schedules.

6.4.2 `causeAndEffect`: a stale source can continue to authorize current behavior if change propagation is manual.

6.4.3 `sourceIds`: `SREQ-012`; `TRD2-REQ-061`.

6.4.4 `acceptancePredicate`: two graph engines return the same affected set; historical records remain immutable; no closure transfers automatically.

6.4.5 `dependencies`: `SURS-023`.

## 6.5 `SURS-025` — Archive and offline replay

6.5.1 `rule`: archive permitted source bytes or protected references, manifests, locators, extraction/render profiles, selection assertions, conflicts, reviews and acceptance in a confidentiality-aware inventory.

6.5.2 `causeAndEffect`: disappearing attachments and mutable web pages prevent reproduction of why a Requirement was admitted.

6.5.3 `sourceIds`: `TRD2-REQ-062`; `SURS-009`; `SURS-010`.

6.5.4 `acceptancePredicate`: offline verifier reconstructs all public-safe roots and verifies protected-reference integrity without exposing private bytes; missing member blocks replay.

6.5.5 `dependencies`: `SURS-010`; `SURS-012`; `SURS-023`.

## 6.6 `SURS-026` — QA, hostile review and acceptance

6.6.1 `rule`: two discovery runs, two SourceSet parsers, structural/security hostile review, negative/mutation corpus and detached exact-root acceptance must prove SURS-001–SURS-025.

6.6.2 `causeAndEffect`: one inventory run can repeat its own exclusion, path, authority or custody error.

6.6.3 `sourceIds`: `TRD2-REQ-030`; `TRD2-REQ-064`; `SREQ-037`; `SREQ-038`; `SREQ-039`.

6.6.4 `acceptancePredicate`: candidate membership parity, dangling/duplicate/self-member=0, prohibited-public-content=0, source-family gaps=0 or typed blocking Unknown, every mutation killed, all P0/P1/P2 closed or blocking.

6.6.5 `dependencies`: `SURS-001`; `SURS-002`; `SURS-003`; `SURS-004`; `SURS-005`; `SURS-006`; `SURS-007`; `SURS-008`; `SURS-009`; `SURS-010`; `SURS-011`; `SURS-012`; `SURS-013`; `SURS-014`; `SURS-015`; `SURS-016`; `SURS-017`; `SURS-018`; `SURS-019`; `SURS-020`; `SURS-021`; `SURS-022`; `SURS-023`; `SURS-024`; `SURS-025`.

# 7. Current disposition

## 7.1 Counters

7.1.1 requirement denominator=`26`; current accepted=`0/26`.

7.1.2 exact SourceCandidate and admitted-source denominators=`unknown/unavailable`.

7.1.3 exact Product Requirement, Program Task, completion, hour and ETA denominators=`unknown/unavailable`.

7.1.4 earliest safe next action=`independent hostile review of this exact requirements Candidate; then create a successor rather than patch any reviewed root`.

7.1.5 no source custody, extraction, Program materialization, Product change, Git mutation, Push, Deploy or provider action is authorized.

7.1.6 Gate29=`BLOCKED`; development freeze=`ACTIVE`.
