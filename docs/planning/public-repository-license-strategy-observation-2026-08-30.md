# 1. Connect — Public repository license-strategy observation

## 1.1 Identity and boundary

1.1.1 `observationId=CONNECT-PUBLIC-REPOSITORY-LICENSE-STRATEGY-OBSERVATION-2026-08-30`.

1.1.2 observation date=`2026-08-30`; trusted server timestamp=`unknown/unavailable`.

1.1.3 artifact class=`READ-ONLY-LEGAL-AND-PRODUCT-PLANNING-OBSERVATION; NOT-LEGAL-ADVICE; NOT-A-LICENSE-GRANT; NOT-A-REPOSITORY-MUTATION; NOT-ACCEPTED`.

1.1.4 binding repository visibility remains `PUBLIC`; no option in this observation permits a change to Private.

1.1.5 no `LICENSE`, `NOTICE`, `CLA`, `DCO`, repository setting, Git object, Push, Release or package was created or changed.

## 1.2 Verified official-source observations

1.2.1 GitHub states that a Public repository is not thereby Open Source: an explicit license is required to grant broad rights to use, modify and distribute the software. Source: [GitHub — Licensing a repository](https://docs.github.com/en/enterprise-cloud@latest/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

1.2.2 GitHub states that, without a license, default copyright law applies and the owner retains rights, while GitHub Terms still permit users to view and fork Public content through GitHub functionality. Sources: [GitHub — Licensing a repository](https://docs.github.com/en/enterprise-cloud@latest/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository); [GitHub Terms — license grant to other users](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#5-license-grant-to-other-users).

1.2.3 GitHub states that content contributed to a repository containing a license notice is contributed under that license unless another agreement applies. This makes contributor authority, provenance and any separate agreement part of the license decision. Source: [GitHub Terms — contributions under repository license](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#6-contributions-under-repository-license).

1.2.4 GNU describes `AGPL-3.0` as a strong copyleft license designed for network-interactive/server software: a modified program made available for interaction over a network must offer the corresponding source to those users. Sources: [GNU — Why the Affero GPL](https://www.gnu.org/licenses/why-affero-gpl.en.html); [GNU — license recommendations for server software](https://www.gnu.org/licenses/license-recommendations.html#server-software).

1.2.5 Apache describes `Apache-2.0` as permissive and including an express contributor patent grant; modified or larger works may be distributed under different terms when its notice and other conditions are satisfied. Sources: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0); [Choose a License — Apache-2.0](https://choosealicense.com/licenses/apache-2.0/).

1.2.6 the sources above explain license mechanics; they do not decide Israeli/company ownership, employee or contractor assignments, compatibility of every dependency or asset, tax/commercial terms, trademark use, privacy duties or the enforceability of a dual-license structure. Those facts remain `unknown/unavailable` pending qualified counsel and exact ownership Evidence.

# 2. Decision model

## 2.1 Option 1 — interim no-license state

2.1.1 effect=`Public viewing/forking remains possible under GitHub Terms, but Connect grants no general software-use, modification, redistribution or production-deployment license outside those platform rights`.

2.1.2 benefit=`does not accidentally grant rights before ownership, contributor and business-model review`.

2.1.3 cost=`external reuse and contribution are legally unclear or discouraged; it is not an Open Source project; every existing third-party byte must still be lawfully held and attributed`.

2.1.4 safe use=`temporary fail-closed state only`; external Contributions, packages, binary Releases and claims that Connect is Open Source remain OFF.

## 2.2 Option 2 — AGPL plus commercial dual license

2.2.1 effect=`community users receive AGPL rights and network-copyleft duties; the copyright owner can separately offer commercial terms for uses that do not want the AGPL obligations`.

2.2.2 benefit=`best functional fit among the reviewed standard licenses for a Public commercial SaaS when protection against closed modified hosted forks is a primary objective`.

2.2.3 cost=`some customers, investors, integrators or dependencies may reject AGPL; dual licensing remains operationally viable only if the company owns or has sufficiently broad relicensing rights for every included contribution`.

2.2.4 required controls=`company copyright ownership; employee/contractor assignment review; inbound contribution agreement selected by Legal; complete third-party provenance and compatibility inventory; exact AGPL application boundary; source-offer mechanism; commercial-license owner and sales process; trademark policy; NOTICE/SBOM/license scan; no incompatible code or asset`.

## 2.3 Option 3 — Apache-2.0

2.3.1 effect=`broad commercial, modification and redistribution rights with preservation conditions and an express patent grant; no network-copyleft requirement`.

2.3.2 benefit=`low-friction adoption, integrations and enterprise consumption; familiar standard license and clearer patent grant than minimal permissive licenses`.

2.3.3 cost=`a competitor may operate a modified closed hosted service without publishing its modifications, subject to the license conditions`.

2.3.4 required controls=`same ownership/provenance review; NOTICE handling; third-party compatibility; trademark policy; inbound contribution policy; dependency and asset license inventory`.

## 2.4 Option 4 — custom source-available commercial license

2.4.1 effect=`code stays publicly readable while commercial or competitive uses can be restricted by custom terms`.

2.4.2 benefit=`can align narrowly with a proprietary business model`.

2.4.3 cost=`not Open Source when it restricts fields of use or competition; higher drafting, compatibility, trust and enforcement cost; GitHub license detection and ecosystem expectations may not fit`.

2.4.4 required controls=`qualified counsel authors the exact text; no improvised license; compatibility and contributor ownership review; clear transition, termination, trademark and commercial-use terms`.

# 3. Recommended planning decision

## 3.1 Current safe state

3.1.1 recommendation=`LICENSE-INTERIM-NONE; CONTRIBUTIONS-CLOSED; RELEASE-AND-PACKAGE-BLOCKED` until the predicates in section 3.2 are satisfied.

3.1.2 reason=`the repository must remain Public, but business priority, copyright ownership, contributor rights and dependency/asset compatibility are not yet proven; selecting a license now could grant irreversible rights or create obligations the company cannot satisfy`.

3.1.3 this is a temporary non-grant, not a recommendation to market Connect as proprietary, Open Source or source-available.

## 3.2 Target candidate after Legal review

3.2.1 recommended target candidate=`AGPL-3.0-or-later + separately drafted commercial dual license` if Tal confirms that defense against closed hosted forks is more important than frictionless third-party adoption.

3.2.2 alternate target=`Apache-2.0` if Tal confirms that ecosystem adoption, integrations and permissive enterprise use are more important than network copyleft.

3.2.3 custom source-available terms are not recommended as the default because the present requirements do not justify their additional legal and ecosystem complexity.

3.2.4 no target receives Acceptance merely from this recommendation; qualified Israeli/company counsel must confirm ownership, inbound rights, business fit and exact texts before any license bytes are added.

# 4. Required Task and Evidence set

## 4.1 Ownership and provenance

4.1.1 enumerate every code, document, image, font, dataset, generated output and copied specification byte intended for Public Git history.

4.1.2 bind each item to author, employer/contractor status, assignment or license, source root, modification history and permitted publication/use scope.

4.1.3 quarantine any item whose origin, ownership or redistribution authority is missing, conflicting or unverifiable.

4.1.4 inspect existing Public Git history separately because later deletion or a new license does not retroactively eliminate prior disclosure or third-party copies.

## 4.2 Business and Legal decision

4.2.1 Tal and the Product owner choose one primary objective: `NETWORK-COPYLEFT-PROTECTION|PERMISSIVE-ADOPTION|CUSTOM-COMMERCIAL-RESTRICTION`.

4.2.2 qualified counsel records the approved code-license identity and exact text, documentation/content license, data/asset treatment, trademark policy, commercial-license terms where applicable, and jurisdiction/company owner.

4.2.3 Legal selects an inbound contribution mechanism and confirms whether company ownership, a CLA, DCO plus project license, or closed Contributions is sufficient for the selected model.

4.2.4 Finance/Product confirms the commercial-license owner, pricing authority and support/warranty boundary if dual licensing is selected.

## 4.3 Supply-chain compatibility

4.3.1 produce dependency, transitive-dependency, build-tool, container, font, icon, media and dataset license inventories bound to exact versions and digests.

4.3.2 evaluate compatibility separately for source publication, SaaS operation, client bundle distribution, container distribution, documentation and commercial dual licensing.

4.3.3 every exception binds exact item, rationale, owner, expiry and Legal approval; unknown or incompatible items block Release.

## 4.4 Publication and negative verification

4.4.1 future licensed publication requires exact `LICENSE`, `NOTICE`, copyright, trademark, contribution, third-party attribution and source-offer artifacts appropriate to the selected model.

4.4.2 negative tests reject a missing license, ambiguous owner, incompatible dependency, unlicensed asset, omitted NOTICE, unauthorized contributor, license text drift, wrong SPDX identity, stale source offer and false Open Source claim.

4.4.3 live GitHub readback must identify the intended license only after exact Legal-approved bytes are committed under a separately authorized Public-safe Push.

# 5. Current disposition

5.1 accepted license decision=`0/1`.

5.2 proven Public-byte ownership denominator=`0`; current completeness=`unknown/unavailable`.

5.3 immediate state=`repository remains PUBLIC; do not add a license or accept external Contributions from this observation alone`.

5.4 Gate29 remains `BLOCKED`; development freeze remains `ACTIVE`; no Git/GitHub mutation is authorized.
