# 1. Connect — User directive and source-precedence ledger

## 1.1 Identity and claim limits

1.1.1 `artifactId=CONNECT-USER-DIRECTIVE-AND-SOURCE-PRECEDENCE-LEDGER-2026-08-29`.

1.1.2 `ledgerVersion=1.0-draft`.

1.1.3 purpose=`freeze the currently observable authority order before Requirement normalization and the Section35.6 successor`.

1.1.4 status=`PRODUCER-MATERIALIZED; NOT-INDEPENDENTLY-REVIEWED; NOT-ACCEPTED`.

1.1.5 this ledger does not claim that the visible conversation is a complete immutable transcript. Exact message IDs, server timestamps and raw conversation-export digest are `unknown/unavailable`.

1.1.6 a quoted user instruction below is navigation Evidence only until it is tied to a durable transcript/export or exact acceptance packet.

1.1.7 no Product Code, Build, runtime Test, Git mutation, Push, Deployment, provider/account mutation, credential use, purchase or Production action is authorized by this ledger.

# 2. Authority order

## 2.1 Precedence classes

2.1.1 `A1=latest explicit user amendment for the exact subject`.

2.1.2 `A2=exact user decision export or later research-decision approval for the exact subject`.

2.1.3 `A3=primary Product specification source`.

2.1.4 `A4=current official external authority for mutable provider, legal, security-standard or platform fact`.

2.1.5 `A5=accepted internal ADR/registry/runbook for an otherwise undecided implementation detail`.

2.1.6 `A6=historical plan, estimate, audit or recommendation`.

2.1.7 a lower-precedence class cannot silently override a higher-precedence class; conflict creates a versioned Decision delta and fail-closed state.

2.1.8 official external facts do not override Product intent, but they can make the requested path unavailable, unlawful, unsafe or conditional.

2.1.9 implementation state never proves Requirement authority, and a written Requirement never proves implementation state.

## 2.2 Conflict resolution

2.2.1 compare sources only within the exact subject, scope, environment, entity, provider, region and effective-time tuple.

2.2.2 record both claims, their roots, precedence classes and the smallest conflicting field.

2.2.3 select the higher-precedence claim only when it is unambiguous and does not require an unavailable external entitlement or named authority.

2.2.4 otherwise preserve `unknown/unavailable`, disable the affected capability and create a Decision or ExternalWait record.

2.2.5 no conflict is closed by deleting historical provenance.

# 3. Binding user directives currently observed

## 3.1 Product and technology

3.1.1 observed directive=`המערכת תתבסס על ריאקט ולא ווינדווס פורם`.

3.1.2 normalized effect=`React Web is the primary client surface; Windows Forms is excluded`.

3.1.3 precedence=`A1`; implementation/readiness claim=`none`.

3.1.4 observed direction=`official WhatsApp connection`.

3.1.5 normalized effect=`unofficial WhatsApp automation is excluded; Meta WhatsApp Business Platform is the provider boundary`.

3.1.6 exact Meta assets, entitlements, live limits and provider approval remain `unknown/unavailable` until live Evidence.

## 3.2 Repository visibility

3.2.1 observed amendment=`הערה: על המאגר להיות public`.

3.2.2 normalized effect=`the canonical Connect source repository remains Public`.

3.2.3 precedence=`A1`; superseded claim=`D18 private visibility requirement only`.

3.2.4 exact Decision artifact=`/Users/tal/Documents/connect/web/docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md`; raw SHA-256=`448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`.

3.2.5 Public visibility does not authorize Public Secrets, PII, customer data, private operational Evidence, an open-source License, direct Push, weak GitHub governance or any visibility change.

## 3.3 Work mode and authorization boundary

3.3.1 observed directive=`אתה מפסיק לתכנת` followed by a requirement to complete the exhaustive numbered Master Plan before returning to implementation.

3.3.2 normalized effect=`Product development freeze remains active until the complete Master Candidate is independently reviewed, accepted by exact root and Gate29 passes`.

3.3.3 observed later statement=`מאשר לך את כל השינויים שלך המשך ברצף לפי התוכנית שלך`.

3.3.4 normalized effect=`continued planning-authoring, correction, research and review are authorized inside the workspace`.

3.3.5 the blanket statement does not silently revoke the more specific development freeze and does not replace exact-root acceptance, named Legal/Finance/Security authority, provider entitlement, credential-use authorization, Push/Deploy approval or a use-specific X24 approval.

3.3.6 Product Code, Build, runtime Test, Git mutation, Push, Deployment and provider/account mutation remain outside the current work mode.

## 3.4 Communication and research ownership

3.4.1 observed directive=`Tal owns research and development of rate limiting and WhatsApp sending-rate restrictions and must be updated on every limit`.

3.4.2 normalized effect=`Tal is the named research owner for WhatsApp/Connect rate-limit policy; every mutable numeric limit requires dated official-source plus live-account scope before operational use`.

3.4.3 hard-coded or remembered WhatsApp numeric limits are not accepted Evidence.

3.4.4 observed directive=`every assistant message ends with a next-message reasoning recommendation from Low through Ultra`.

3.4.5 current planning default=`Ultra` because semantic reconciliation, cyber coverage and recursive scheduling require maximum review depth.

# 4. Durable source corpus

## 4.1 Primary Product specification sources

4.1.1 source=`/Users/tal/.codex/attachments/b2c4be15-c1e2-4414-8452-3d79aca8d94a/pasted-text.txt`; raw SHA-256=`52eb4f838d876ae30ff60dd93b1295a3d57759a08c2929787c07d5c4fcf7bb6b`; physical identity=`818 lines/33837 bytes`; class=`A3`; status=`primary detailed initial specification; exact normalized Requirement manifest absent`.

4.1.2 source=`/Users/tal/Downloads/אפיון מערכת - דיוור WhatsApp ובוט AI.docx.pdf`; raw SHA-256=`48e87c0a5ca6a40cbd3f320f08dfd3ca946c31a6f3409aafbfff6b9642302f6a`; physical identity=`129784 bytes/PDF1.4/4 A4 pages`; class=`A3`; status=`primary high-level specification; visually verified; exact region-level Requirement manifest absent`.

4.1.3 PDF verification receipt=`/Users/tal/Documents/connect/web/docs/planning/source-pdf-visual-and-text-verification-2026-08-29.md`; raw SHA-256=`030502fafc90e5a7ed1a02da1ddb7ff0c091473ec25af3d0bd452f288f53f8db`; class=`verification Evidence, not Requirement authority`.

4.1.4 when the two primary specifications differ in detail without a later user Decision, the result is not an implicit union or overwrite; it is an explicit Requirement conflict/variant record.

## 4.2 User decision sources

4.2.1 source=`/Users/tal/Documents/connect/web/docs/decision-intake-2026-08-21.md`; raw SHA-256=`052297f38f63d6e525641a5e1d044267cf7d553fd3e7a9d2d469669eca090937`; class=`A2 historical intake`; status=`records the exported D01–D30 answers but contains later-superseded states`.

4.2.2 source=`/Users/tal/Documents/connect/web/docs/researched-decision-approval-2026-08-26.md`; raw SHA-256=`f981cf9313e08fe0cfbd0603717af1a999fd1a367b5521d4191d0cfc3b27128b`; class=`A2 later research selection`; status=`supersedes D02/D03/D05/D14/D29/D30 intake state, subject to later amendments and refreshed official facts`.

4.2.3 source=`/Users/tal/Documents/connect/web/docs/connect-all-remaining-decisions.html`; raw SHA-256=`8051f3ead6c97dea0fe1e620eef758b35fb0c70909c35085c409ce002d285833`; class=`questionnaire presentation`; status=`does not itself prove which radio options Tal selected`.

4.2.4 D18-A2 in Section3.2 is the latest exact-subject amendment and therefore overrides the Private visibility text still present in older sources.

4.2.5 D02-A4 current reconciliation=`/Users/tal/Documents/connect/web/docs/planning/d02-a4-openai-model-routing-reconciliation-2026-08-29.md`; raw SHA-256=`221af06420bd0d5680ae708c997e9f22b7b48eecc9278dbe740cb66346c68d54`; status=`planning selection only; not independently reviewed; AI OFF`.

4.2.6 D03-A4 current reconciliation=`/Users/tal/Documents/connect/web/docs/planning/d03-a4-billing-provider-reconciliation-2026-08-29.md`; raw SHA-256=`d57a5d2510d773c5b154908cf46b0b8dd510d7e2c3a254d1ee7f50df2ee71801`; status=`planning selection only; Finance/Tax/Legal approval absent; Checkout OFF`.

4.2.7 D05-A4+D14-A4 current reconciliation=`/Users/tal/Documents/connect/web/docs/planning/d05-d14-a4-object-storage-and-malware-scanning-reconciliation-2026-08-29.md`; raw SHA-256=`af79eaa1ff0046f8cad0a7cc6904f4ab75b549285cc0a27b6f082c8b088f9a78`; status=`planning selection only; account/live Evidence absent; uploads OFF`.

4.2.8 D29-A4+D30-A4 current reconciliation=`/Users/tal/Documents/connect/web/docs/planning/d29-d30-a4-post-pilot-roadmap-enterprise-integrations-mobile-reconciliation-2026-08-29.md`; raw SHA-256=`b30fe8fe609b0710193dd67f951ec41fa543644a403869e211bf41d2dea8cf0f`; status=`planning selection only; conditional capabilities OFF`.

## 4.3 Historical planning source

4.3.1 source=`/Users/tal/.codex/attachments/2c461c02-4225-4dca-afee-6698bce84883/pasted-text.txt`; raw SHA-256=`78a76e08c79a3e14c4b33f3e4d519a4afa7046735c1fe255a3e5cdaf9a83b550`; physical identity=`638 lines/20287 bytes`; class=`A6`.

4.3.2 this source contains an earlier fifteen-stage summary, `70% ±5%` management estimate and older Decision recommendations.

4.3.3 those estimates are historical/non-canonical and cannot supply current completion, remaining hours or ETA because Section35.6, accepted Scope manifests and accepted Schedule do not exist.

4.3.4 its descriptive content is retained as provenance and gap-discovery input; it cannot override later Decisions or current official facts.

## 4.4 Existing Master and traceability source

4.4.1 Master source=`/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`; raw SHA-256=`643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`; physical identity=`10425 lines/1059872 bytes/5164 numbered clauses/zero duplicate clause IDs`; class=`A6 rejected execution Candidate`.

4.4.2 traceability source=`/Users/tal/Documents/connect/web/docs/product-specification-traceability.md`; raw SHA-256=`ca069fc6187e23d720f4654d2df1a58a8d58666d2bc29bb8454cfe51c1532acb`; class=`existing mapping Candidate; current completeness and source-root binding require fresh audit`.

4.4.3 the current Master is valuable planning input but is not executable because promised Section35.6 is absent and its audit findings remain open.

# 5. Required normalization outputs

## 5.1 Source manifest

5.1.1 enumerate every admitted source with immutable ID, path/URL, raw digest, media type, authority class, exact-subject scope, effective time, expiry and supersession edges.

5.1.2 sources without durable bytes remain observation records and receive no exact-root completeness credit.

## 5.2 Requirement manifest

5.2.1 assign a deterministic Requirement ID to every independent normative statement in both primary specifications.

5.2.2 bind each text Requirement to exact source-line range and each PDF Requirement to page plus bounding region or independently reproducible text span.

5.2.3 split combined statements by actor, action, object, condition, environment and acceptance effect.

5.2.4 classify each statement as `must|should|may|question|example|future|non-requirement-context` without silently promoting examples or recommendations.

5.2.5 record later Decision constraints, conflicts, supersession and Pilot/Post-Pilot applicability as separate edges.

5.2.6 produce forward mapping `Source→Requirement→Decision→Stage→Task→Test→Evidence→Gate` and inverse mapping from every Task/Gate back to exact authority.

## 5.3 Decision manifest

5.3.1 materialize D01–D31 and every amendment/reconciliation as versioned records rather than mutable prose rows.

5.3.2 each record includes subject key, selected value, scope, source root, predecessor Decision, status, external approvals, effective time, expiry/change triggers, safe state and affected Requirements/Gates.

5.3.3 a planning selection is distinct from Legal approval, provider eligibility, live configuration, implementation, staging evidence and Production readiness.

# 6. Current closure and safe next action

6.1 Source corpus identity materially recorded=`8 durable/local sources plus current amendment observations`; accepted source freeze=`0/1`.

6.2 normalized primary-spec Requirement universe=`0/2 sources accepted`.

6.3 accepted Decision manifest=`0/1`.

6.4 exact Task denominator=`0`; exact completion percentage, remaining person-hours and calendar ETA=`unknown/unavailable`.

6.5 next safe action=`independently review this authority order, complete the three-audit reconciliation, build TRD-2.0, then generate the exact source and Requirement manifests before any Program Task materialization`.

6.6 Gate29=`BLOCKED`; development freeze=`ACTIVE`; repository visibility=`PUBLIC-AS-INTENDED; HARDENING-NOT-READY`.
