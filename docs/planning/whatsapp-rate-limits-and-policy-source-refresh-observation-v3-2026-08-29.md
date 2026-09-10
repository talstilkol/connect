# 1. Connect — WhatsApp rate-limits and policy source refresh observation v3

## 1.1 Identity and boundary

1.1.1 `observationId=CONNECT-WHATSAPP-RATE-LIMITS-POLICY-SOURCE-REFRESH-2026-08-29-O3`.

1.1.2 predecessor observation=`/Users/tal/Documents/connect/web/docs/planning/whatsapp-rate-limit-source-refresh-observation-v2-2026-08-29.md`; predecessor raw SHA-256=`f68a1917acd6755d705c2e1ebadf67795c3da96512d40e794dfbae73145f462b`.

1.1.3 `observedAtDate=2026-08-29`; trusted Meta timestamp and signed response receipt=`unknown/unavailable`.

1.1.4 `observationClass=READ-ONLY-OFFICIAL-POLICY-DELTA; NOT-A-LIVE-WABA-LIMIT-RECEIPT; NOT-A-SEND-AUTHORIZATION; NOT-LEGAL-ADVICE`.

1.1.5 Repository remains `PUBLIC`; no Product, Git, GitHub, Meta, credential, send, template, account or provider mutation occurred.

## 1.2 Successful official policy observation

1.2.1 official source=`https://business.whatsapp.com/policy/preview?lang=fr_FR`; publisher surface=`WhatsApp Business`; retrieval through public Web search succeeded after the Meta developer-document pages returned HTTP 429 in the predecessor refresh.

1.2.2 the observed policy applies to WhatsApp Business services, including the Business Platform and Meta-hosted Cloud API; a service provider acting for clients is subject to the policy together with its clients.

1.2.3 a business may contact a person only when the person supplied the phone number and gave opt-in that clearly identifies WhatsApp messaging and the business name.

1.2.4 opt-out, stop and block requests expressed on WhatsApp or elsewhere must be respected; the person must be removed from contact lists as applicable.

1.2.5 business-initiated conversations may be started only with an approved message template used for its approved purpose.

1.2.6 after a user message, the observed customer-service window is `24 hours` from the user's last message; after that window, an approved template is required.

1.2.7 automated replies are permitted inside that window only with prompt, clear and direct escalation paths when needed, such as human-agent transfer, phone, email, web support, physical location or support form.

1.2.8 excessive negative feedback, harm, policy violations or unauthorized bulk messaging may cause limitation or removal of access; low-quality businesses may be limited.

1.2.9 the policy can change; therefore this observation requires a source-refresh trigger and cannot be treated as perpetual authorization.

## 1.3 Rate-limit facts still unavailable

1.3.1 exact current Cloud API throughput per phone number=`unknown/unavailable from authoritative bytes in this refresh`.

1.3.2 exact current business-initiated unique-recipient tiers, upgrade/downgrade rules and portfolio sharing=`unknown/unavailable from authoritative bytes in this refresh`.

1.3.3 exact current pair-rate, template pacing, quality thresholds, error-code backoff, media upload/download and webhook delivery limits=`unknown/unavailable from authoritative bytes in this refresh`.

1.3.4 live limits and quality state for Tal's father's test WABA, Business portfolio and phone-number IDs=`unknown/unavailable`; no credentialed provider read was authorized or performed.

1.3.5 historical values, third-party summaries, cached snippets and undocumented empirical throughput receive zero authority for raising a send allowance.

## 1.4 Required Connect controls

1.4.1 the send path must use the minimum of independently bounded layers: `Connect global`, `tenant`, `WABA/portfolio`, `phone number`, `recipient pair`, `template/category`, `quality/risk`, `provider response/backoff` and `campaign budget`.

1.4.2 any missing, stale, conflicting or inaccessible provider-limit input must fail closed for allowance increases; it may reduce/stop sending but may never increase capacity.

1.4.3 every outbound message must bind an opt-in receipt, purpose/category, recipient, business identity, source, captured time, withdrawal state and retention rule before eligibility.

1.4.4 every inbound user message must update the service-window state from the provider event only after authenticity, deduplication, ordering and tenant/phone binding; local wall-clock inference alone is insufficient.

1.4.5 outside the current user-service window, only an approved/current template matching the intended category and locale may enter the send queue.

1.4.6 an opt-out or block event must acquire higher priority than queued sends, atomically fence unsent work and propagate to every campaign/contact projection before any later eligibility decision.

1.4.7 automation must expose a deterministic human-escalation path and must not trap the user in an AI-only loop.

1.4.8 provider throttling, quality downgrade, template pause/disable, account restriction, policy violation or ambiguous response must open a typed safe terminal and reconciliation flow rather than blind retry.

1.4.9 retries require provider error classification, idempotency identity, attempt budget, bounded exponential backoff without unapproved jitter, retry-after precedence and a no-duplicate delivery predicate.

1.4.10 live limit observations must be stored as append-only records containing provider asset IDs, metric type, value/unit, source endpoint, request/response digests, observed time, expiry, authority scope and supersession pointer; Secrets and personal data must not enter the Public repository.

## 1.5 Tal research responsibility and next evidence

1.5.1 Tal's factual sign-off may confirm only the policy facts in Section 1.2 against the cited official source; numerical rate-limit sign-off remains blocked.

1.5.2 next acceptable evidence is either retrievable official Meta developer documentation with exact bytes/version or authorized read-only live Graph/WhatsApp Manager observations for the approved test assets, followed by independent reconciliation.

1.5.3 no live Meta request may be performed until an accepted Task, exact read-only scope, named asset owner, Credential handling boundary and external permit exist.

1.5.4 `numericRateLimitClaimsAccepted=0`; `liveAssetLimitClaimsAccepted=0`; observed policy statements are not an accepted denominator and receive no Readiness credit.

1.5.5 `Gate29=BLOCKED`; development freeze=`ACTIVE`.
