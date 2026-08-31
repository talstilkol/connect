# 1. Connect — WhatsApp message payload and media-limit source observation

## 1.1 Identity and evidence boundary

1.1.1 `observationId=CONNECT-WHATSAPP-MESSAGE-PAYLOAD-MEDIA-LIMIT-SOURCE-OBSERVATION-2026-08-29`.

1.1.2 companion rate/policy observation=`/Users/tal/Documents/connect/web/docs/planning/whatsapp-rate-limits-and-policy-source-refresh-observation-v4-2026-08-29.md`.

1.1.3 source=`Meta official WhatsApp Business Platform public Postman collection`; exact collection response root=`SHA-256 b2e4501315b2e0f3cd9b444574b00af5a4e8757eadd40353db0beca5ae80ff1f/729545 bytes`; collection `lastRevision=49422662705`; `updatedAt=2026-05-14T22:42:30.000Z`.

1.1.4 status=`CURRENT-COLLECTION-ROOT-OBSERVED; DIRECT-DEVELOPER-PAGE-BYTES-UNAVAILABLE-429; NOT-LIVE-WABA-EVIDENCE; NOT-IMPLEMENTED; NOT-ACCEPTED`.

1.1.5 all values below are candidate schema bounds from this exact official collection root; they require freshness review before implementation and do not authorize a send.

## 1.2 Authentication and asset constraints

1.2.1 collection-level description identifies required permissions=`whatsapp_business_management,whatsapp_business_messaging`; a query that targets the business portfolio may also require `business_management` according to use case.

1.2.2 collection-level description states a user access token typically expires after 24 hours and a system-user token can last up to 60 days or be configured as permanent; Connect must not treat nominal permanence as a reason to omit rotation, revocation, least privilege or secret-vault custody.

1.2.3 collection prerequisites require a Meta business portfolio, WABA and business phone number; possession of IDs or a token is not proof of asset ownership, phone registration, display-name approval, quality or send entitlement.

1.2.4 phone-number response descriptions expose `quality_rating` values `Green,Yellow,Red,NA`; a read value is dynamic and must be bound to phone, WABA, observed time, Graph version and response root.

## 1.3 Message and interaction bounds observed

1.3.1 Text Object source member=`5222a915-6791-47f8-a698-3c222549b5b0`; observed text-body maximum=`4096 characters`.

1.3.2 Message Object source member=`3d9a91da-4953-4e7b-9826-5154a7052303`; observed recipient type=`individual`; each send must bind one exact recipient authorization and cannot infer broadcast safety from the payload schema.

1.3.3 Action Object source member=`a363309c-d7b1-4d8b-8764-c9e167df70f6`; observed Reply Button maximum=`3`; button title maximum=`20 characters`; button ID maximum=`256 characters`.

1.3.4 the same Action Object reports List/Multi-product section count=`minimum 1,maximum 10`.

1.3.5 Section Object source member=`70d805f9-86c6-447f-ad08-dff04d0f7aef`; observed maximum=`10 rows across sections`; row title=`24 characters`; row ID=`200 characters`; optional row description=`72 characters`.

1.3.6 the same Section Object reports multi-product bounds=`minimum 1 product per section,maximum 30 products across all sections`.

1.3.7 a valid payload shape, length or component count does not prove consent, open service window, approved Template, product/legal eligibility, quality, available rate budget or delivery.

## 1.4 Media bounds observed

1.4.1 Media source member=`07604859-e1cb-4188-a1d0-bead1f0fd2d8`; observed audio maximum=`16 MB`; MIME allowlist=`audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg`; OGG requires Opus.

1.4.2 observed document maximum=`100 MB`; listed MIME families include text, PDF, legacy Microsoft Office and Office Open XML documents.

1.4.3 observed image maximum=`5 MB`; MIME allowlist=`image/jpeg,image/png`.

1.4.4 observed static sticker maximum=`100 KB`; MIME=`image/webp`.

1.4.5 observed video maximum=`16 MB`; MIME list=`video/mp4,video/3sp`; codec constraint=`H.264 video with AAC audio`; one audio stream or none.

1.4.6 Download Media source member=`487a745d-0382-4400-b092-18d3eb6d85d7`; Retrieve Media URL source member=`742d824d-6bef-4128-abc4-6a02291c5a6b`; observed media-URL validity=`5 minutes` and authenticated download required.

1.4.7 D06's Connect Knowledge intake cap remains `10 MiB`; it is a separate Product/Security limit and is intentionally stricter than a provider document maximum. The enforced bound is the minimum of the approved Connect limit and the fresh applicable provider limit.

## 1.5 Required Connect controls

1.5.1 validate byte size after streaming, not only `Content-Length`; reject decompression bombs, polyglots, MIME/extension/signature mismatch, unsupported codecs and incomplete reads.

1.5.2 never fetch arbitrary customer-supplied media URLs. Retrieve the provider URL by exact media ID, bind phone ownership where supported, enforce HTTPS/destination allowlist, block redirects to non-allowlisted destinations and apply SSRF controls.

1.5.3 download within the observed short-lived window using a server-held least-privilege token; do not expose the provider URL or token to the browser, logs or Public artifacts.

1.5.4 place incoming media in Quarantine, bind checksum/object version and scan result, and release only through the separately approved D05/D14 flow.

1.5.5 validate character counts with an explicitly versioned Unicode counting rule; bytes, Unicode scalar values, grapheme clusters and displayed glyphs are not interchangeable.

1.5.6 validate each interactive/template subtype against its exact Graph-version schema; unknown or removed fields fail closed and cannot be silently dropped.

1.5.7 client-side validation is assistance only; the server repeats all authorization, schema, size, MIME, URL, Tenant and policy checks before queue admission and again before dispatch.

1.5.8 every provider-version, collection revision, payload schema, media table, MIME list, codec rule, token policy or quality enum change invalidates the affected validator profile.

## 1.6 Current disposition

1.6.1 current rate ceilings remain `unknown/unavailable`; this observation adds payload/media candidates only and does not fill the throughput gap.

1.6.2 current direct developer-page confirmation and live Pilot account readback remain absent; no numerical value here is Production-ready.

1.6.3 outbound autonomous messaging, bulk campaigns and unsupervised AI sends remain `OFF`; Knowledge/Media upload remains blocked by D05/D14 and all applicable gates.

1.6.4 Tal review status=`SOURCE-OBSERVED; LIVE-VERIFY-PENDING`; Gate29 remains blocked; development freeze remains active; repository remains `PUBLIC`.
