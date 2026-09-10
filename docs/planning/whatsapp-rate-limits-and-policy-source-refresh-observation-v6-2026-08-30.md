# 1. Connect — WhatsApp Rate Limits and Policy source refresh observation v6

## 1.1 Identity and boundary

1.1.1 `observationId=CONNECT-WHATSAPP-RATE-LIMIT-POLICY-SOURCE-REFRESH-O6-2026-08-30`.

1.1.2 predecessor path=`docs/planning/whatsapp-rate-limits-and-policy-source-refresh-observation-v5-2026-08-30.md`.

1.1.3 predecessor raw SHA-256=`1acbfc6f015fe26e14e2195abce9e8ad4bc651e6c44c2694f4f931959e0a828d`.

1.1.4 observation date=`2026-08-30`.

1.1.5 trusted server timestamp=`unknown/unavailable`.

1.1.6 status=`READ-ONLY SOURCE OBSERVATION; NOT SOURCE-CUSTODY-ADMITTED; NOT WABA EVIDENCE; NOT ACCEPTED`.

1.1.7 no Token, WABA ID, business portfolio ID, phone-number ID, customer identifier, recipient, message, Template, send or provider mutation was used.

1.1.8 repository=`PUBLIC`; autonomous dispatch=`OFF`; bulk business-initiated dispatch=`OFF`; development freeze=`ACTIVE`; Gate29=`BLOCKED`.

1.1.9 owner of WhatsApp and Connect rate-limit research=`Tal`.

## 1.2 Claim limit

1.2.1 this observation records what two official surfaces exposed to the research reader at one point in time.

1.2.2 it does not prove a current numerical limit, account entitlement, WABA status, Meta approval, legal permission or safe dispatch capacity.

1.2.3 official pages may change without notice; every mutable policy and limit requires freshness and invalidation rules.

1.2.4 example responses inside vendor documentation are not live account readback and receive zero capacity credit.

1.2.5 no sample identifier, sample message or sample business data from the documentation is imported into Connect planning data.

# 2. Official source observations

## 2.1 WhatsApp Business Messaging Policy

2.1.1 canonical opening URL=`https://business.whatsapp.com/policy`.

2.1.2 observed redirect=`https://whatsappbusiness.com/policy/`.

2.1.3 observed page title=`WhatsApp Business Messaging Policy`.

2.1.4 observed page footer year=`2026`.

2.1.5 the page was readable by the research reader on `2026-08-30`.

2.1.6 exact response bytes, HTTP headers, server timestamp and content digest were not admitted into Source custody.

## 2.2 Meta official Postman workspace

2.2.1 workspace URL=`https://www.postman.com/meta/whatsapp-business-platform/overview`.

2.2.2 Cloud API documentation URL=`https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api`.

2.2.3 observed owner path=`postman.com/meta/whatsapp-business-platform`.

2.2.4 observed workspace claim=`official WhatsApp Business Platform collections`.

2.2.5 exact Postman collection export, revision ID, checksum and signed ownership proof were not captured.

## 2.3 Meta developer documentation

2.3.1 Cloud API overview=`https://developers.facebook.com/docs/whatsapp/cloud-api/overview`.

2.3.2 Messaging limits=`https://developers.facebook.com/docs/whatsapp/messaging-limits`.

2.3.3 direct retrieval result in this research path=`HTTP 429 Too Many Requests`.

2.3.4 the research-reader HTTP 429 is not a WhatsApp Cloud API limit, WABA restriction, quality signal or account Evidence.

2.3.5 no numerical clause from an unofficial copy, search snippet, blog, memory or third-party fork is promoted to Program authority.

# 3. Policy facts observed from the official policy page

## 3.1 Contact and consent

3.1.1 the business may contact a person only when the person provided the mobile number and gave opt-in permission for subsequent messages or calls.

3.1.2 the business is responsible for lawful opt-in, required notices and required permissions.

3.1.3 the business must honor requests made on or off WhatsApp to block, discontinue or opt out.

3.1.4 the policy recommends clear message-category expectations and separate opt-in by category.

3.1.5 a numerical provider allowance never overrides consent, opt-out, suppression, legal purpose or category scope.

## 3.2 Conversation initiation and service window

3.2.1 business-initiated conversations require an approved Message Template.

3.2.2 the Template must be used for its designated purpose.

3.2.3 Meta may approve, reject, pause or later review a Template.

3.2.4 a business may reply without a Template within `24` hours of the last user message.

3.2.5 outside that customer-service window, only an approved Message Template may be used.

3.2.6 window state is an authorization predicate, not merely a pricing or rate dimension.

## 3.3 Automation and human escalation

3.3.1 automation may be used when responding during the service window.

3.3.2 the business must provide prompt, clear and direct escalation paths.

3.3.3 observed escalation examples include a human agent, phone, email, Web support, physical location or support form.

3.3.4 Connect recommendation=`in-chat human handoff plus at least one independently available out-of-chat support path for the Pilot`.

3.3.5 automation must not conceal failure, trap a user in a loop or treat unavailable humans as successful escalation.

## 3.4 Data protection

3.4.1 the business is responsible for notices, permissions, consents, a published privacy policy and applicable-law compliance.

3.4.2 policy-obtained data about a person may be used only as reasonably necessary to support messaging with that person, subject to the policy wording and applicable law.

3.4.3 the policy prohibits asking for or sharing full payment-card numbers, financial-account numbers, personal ID numbers and other sensitive identifiers.

3.4.4 customer-chat information must not be shared with another customer.

3.4.5 Connect consequence=`sensitive-data detection, operator warnings, no card-data collection, tenant isolation, redaction and incident handling are mandatory requirements`.

## 3.5 Regulated and prohibited uses

3.5.1 the policy contains prohibited organizations, activities, products, services and content.

3.5.2 some regulated verticals have limited country-specific exceptions with age, license, geography and regulatory conditions.

3.5.3 the policy page’s country lists are mutable and are not copied into an enduring Connect allowlist.

3.5.4 Connect safe default=`regulated-vertical and unknown-category campaigns OFF unless an exact current policy snapshot, country, age, license and legal review all authorize them`.

3.5.5 the Israel-first Pilot does not imply that a regulated vertical is permitted in Israel.

## 3.6 Enforcement and change

3.6.1 Meta may limit or remove access for policy violations, negative feedback, harm, unauthorized scale or low quality.

3.6.2 user blocks and reports can affect the amount of messaging or calls a business may initiate.

3.6.3 the policy may be updated; a freshness monitor and change invalidation path are mandatory.

3.6.4 a provider capacity field cannot be treated as stable when quality, policy, account or Template state changes.

# 4. Platform facts observed from the official Postman surface

## 4.1 Required assets and permissions

4.1.1 required asset families observed=`Meta business portfolio; WhatsApp Business Account; business phone number`.

4.1.2 core permission names observed=`whatsapp_business_management; whatsapp_business_messaging`.

4.1.3 some portfolio operations may require `business_management` depending on the use case.

4.1.4 Connect consequence=`each operation has an exact least-privilege permission map; one broad Token is not reused across onboarding, messaging, template management and readback`.

## 4.2 Token lifecycle

4.2.1 the Postman page described user access tokens as short-lived and system-user tokens as longer-lived or potentially non-expiring.

4.2.2 those lifecycle descriptions are mutable and are not accepted as Connect Secret policy without current account/provider evidence.

4.2.3 Connect recommendation=`use the shortest workable lifetime, dedicated system identity, least privilege, vault storage, rotation, revocation, access review and no browser exposure`.

4.2.4 a non-expiring Token, if offered, is not the recommended default.

## 4.3 Phone registration security

4.3.1 the Postman surface states that Cloud API phone registration enables two-step verification using a six-digit registration code.

4.3.2 the code is a Secret and must not be stored in Git, documentation, logs, screenshots, tickets or chat.

4.3.3 code custody, owner, backup owner, rotation, recovery and revocation remain unresolved external decisions.

4.3.4 no registration action was performed.

## 4.4 Usage response-header shape

4.4.1 official Postman examples exposed the response-header name `x-business-use-case-usage`.

4.4.2 observed field names inside the historical example=`type; call_count; total_cputime; total_time; estimated_time_to_regain_access`.

4.4.3 the example identified an old Graph API version and old response date; its values are historical sample content, not current limits.

4.4.4 Connect consequence=`capture these and any successor usage headers from approved live read-only calls, bind them to account, operation, Graph version and time, and retain the raw authorized receipt privately`.

4.4.5 absence, parse failure, unknown schema or stale usage readback must reduce outbound admission, never increase it.

# 5. Numerical limit status

## 5.1 Still unknown or unavailable

5.1.1 per-phone-number message throughput=`unknown/unavailable`.

5.1.2 high-throughput eligibility, activation and ceiling=`unknown/unavailable`.

5.1.3 business portfolio, WABA and App call-count formulas and windows=`unknown/unavailable`.

5.1.4 per-recipient pair-rate burst and recovery=`unknown/unavailable`.

5.1.5 unique-recipient or conversation messaging tiers=`unknown/unavailable`.

5.1.6 per-user marketing-message limit and suppression behavior=`unknown/unavailable`.

5.1.7 test-number and unverified-account limits=`unknown/unavailable`.

5.1.8 Template creation, edit and submission limits=`unknown/unavailable`.

5.1.9 media limits=`unknown/unavailable` unless admitted from a separate exact current source.

5.1.10 webhook delivery, timeout and retry limits=`unknown/unavailable`.

5.1.11 current error catalogue, retry class, cooldown and `Retry-After` behavior=`unknown/unavailable`.

## 5.2 What is known without a number

5.2.1 provider capacity is multi-dimensional and can depend on asset, operation, quality, policy and account state.

5.2.2 provider usage headers can expose live usage-related fields for some Graph operations.

5.2.3 quality degradation, user blocks or reports and policy violations can reduce effective sending ability.

5.2.4 Templates, consent, opt-out, purpose and the service window independently control authorization.

5.2.5 unknown numerical capacity requires a zero allowance for autonomous campaign dispatch.

# 6. Required authorization and limiter model

## 6.1 Message authorization predicate

6.1.1 a dispatch is eligible only when all predicates below pass on the same fresh generation.

6.1.2 tenant=`active and authorized`.

6.1.3 sender asset=`exact approved business portfolio, WABA, App and phone binding`.

6.1.4 recipient=`valid, not blocked and not suppressed`.

6.1.5 consent=`valid for sender, recipient, channel, purpose and category; not revoked or expired`.

6.1.6 message=`approved content class, policy-safe and legally allowed`.

6.1.7 Template=`required when applicable; exact approved name, language, category, version and active status`.

6.1.8 service window=`provider-confirmed or conservatively derived; stale or ambiguous is outside-window`.

6.1.9 provider account=`not restricted; current quality and eligibility accepted`.

6.1.10 budget=`tenant, campaign, provider and global cost caps available`.

6.1.11 rate=`every applicable limiter dimension has positive fresh allowance`.

6.1.12 operational safety=`queue healthy, circuit closed, incident state clear and operator stop not active`.

6.1.13 approval=`human approval bound to exact campaign, audience root, content root, Template root, schedule, limits and expiry when required`.

6.1.14 any predicate failure=`BLOCKED; no best-effort send`.

## 6.2 LimitSnapshot fields

6.2.1 `snapshotId` is deterministic from the canonical approved content, never random.

6.2.2 required identity=`provider; environment; business portfolio; WABA; App; phone; Graph version`.

6.2.3 required limit key=`dimension; operation; message class; Template category; recipient scope; purpose`.

6.2.4 required measure=`unit; maximum; current usage; remaining; window; reset; burst; concurrency`.

6.2.5 required evidence=`official Source receipt; live-account receipt; observedAt; trusted-time status; expiry; digest`.

6.2.6 required governance=`owner; reviewer; approval root; policy version; invalidation events`.

6.2.7 missing or ambiguous required field=`INVALID-SNAPSHOT`.

## 6.3 Layered effective allowance

6.3.1 effective allowance=`minimum of every applicable accepted provider limit, account eligibility, Connect safety cap, tenant cap, recipient cap, cost cap and queue capacity`.

6.3.2 minimum limiter dimensions=`global; provider; business portfolio; WABA; App; phone; tenant; campaign; Template category; recipient; purpose; message class; media class; operation; time window`.

6.3.3 per-recipient ordering is serialized so concurrent workers cannot bypass pair safety.

6.3.4 Queue admission does not grant a permanent send Permit; dispatch re-evaluates current authorization and rate state.

6.3.5 capacity increase requires fresh evidence and exact Tal approval.

6.3.6 capacity decrease or restriction invalidates descendant allowances immediately.

## 6.4 Retry and backpressure

6.4.1 retry is allowed only for an exact accepted transient error class.

6.4.2 permission, consent, opt-out, policy, quality, Template, recipient, billing, malformed and unknown errors are non-retryable by default.

6.4.3 provider retry hint is accepted only when authentic, parseable, fresh and inside Connect’s maximum retry budget.

6.4.4 fallback schedule is deterministic, bounded and versioned.

6.4.5 `Math.random()` is prohibited.

6.4.6 random jitter remains absent unless Tal later approves the exact cryptographic-randomness use.

6.4.7 exhausted retries reach one explicit DLQ or blocked terminal and never count as success.

6.4.8 backpressure protects inbound support and opt-out processing before outbound marketing.

# 7. Tal’s required research and approval package

## 7.1 Official-source package

7.1.1 exact current Meta documentation bytes or approved source export.

7.1.2 canonical URL, response headers, observed time, trusted-time status and digest.

7.1.3 current Graph version and documentation revision.

7.1.4 complete numerical clause extraction with source locations.

7.1.5 official policy page snapshot and change-monitor rule.

## 7.2 Live account package

7.2.1 redacted exact business portfolio, WABA, App and phone binding.

7.2.2 effective permissions and Token class without revealing Token bytes.

7.2.3 current throughput, quality, tier, restriction and eligibility fields exposed by the account.

7.2.4 current Template statuses and categories.

7.2.5 approved read-only response headers and error schema observations.

7.2.6 webhook terminal and provider-message-ID mapping without customer content.

7.2.7 named Primary and Backup for Meta operations and emergency stop.

## 7.3 Approval record

7.3.1 Tal approves an exact package root, not a number copied into chat.

7.3.2 approval binds environment, redacted asset scope, Graph version, effective time, expiry and maximum internal cap.

7.3.3 any provider schema, policy, quality, restriction, Template or Graph-version change invalidates the approval.

7.3.4 no Secret or customer data is required in the Public approval record.

# 8. Current disposition

## 8.1 Result

8.1.1 new official policy facts observed=`opt-in; opt-out; Template initiation; 24-hour service window; human escalation; data safeguards; restricted uses; quality enforcement; mutable policy`.

8.1.2 new official Postman facts observed=`required asset and permission families; two-step phone registration; usage-header field names`.

8.1.3 new current numerical limits admitted=`0`.

8.1.4 live WABA receipts=`0`.

8.1.5 Tal numerical sign-off=`BLOCKED-PENDING-OFFICIAL-NUMERIC-SOURCE-AND-LIVE-WABA-EVIDENCE`.

8.1.6 autonomous send=`OFF`.

8.1.7 bulk campaign send=`OFF`.

8.1.8 AI side effects=`OFF`.

8.1.9 Gate29=`BLOCKED`.

8.1.10 development freeze=`ACTIVE`.

8.1.11 repository=`PUBLIC`.

8.1.12 next safe action=`independent hostile review, then admission through the accepted Source Universe protocol`.
