# 1. Connect — Source PDF visual and text verification receipt

## 1.1 Identity and claim limits

1.1.1 `artifactId=CONNECT-SOURCE-PDF-VISUAL-TEXT-VERIFICATION-2026-08-29`.

1.1.2 source path=`/Users/tal/Downloads/אפיון מערכת - דיוור WhatsApp ובוט AI.docx.pdf`.

1.1.3 source raw SHA-256=`48e87c0a5ca6a40cbd3f320f08dfd3ca946c31a6f3409aafbfff6b9642302f6a`.

1.1.4 source physical identity=`129784 bytes; PDF1.4; 4 A4 pages; 596×842 points; rotation0; unencrypted; tagged; no JavaScript; no form`.

1.1.5 verification status=`VISUALLY-RENDERED-ALL-PAGES; TEXT-EXTRACTED; CONTENT-INVENTORY-CANDIDATE; NOT-REQUIREMENT-UNIVERSE-ACCEPTANCE`.

1.1.6 this receipt proves only the exact observations below. It does not prove that the Master covers every Requirement, that later Decisions are correct, or that any Product capability is implemented or ready.

1.1.7 no source byte, Product Code, Git state, external account, provider, Build, runtime or Production state was changed.

# 2. Verification method

## 2.1 Visual render

2.1.1 renderer=`pdftoppm/Poppler available in the workspace`; exact tool version receipt=`unknown/unavailable`.

2.1.2 render profile=`PNG; 144 DPI; 1192×1684 pixels; RGB; non-interlaced`.

2.1.3 page1 render raw SHA-256=`e46439fe0e6218b5b19634f1f79d13d6a07763bb7873f6d4a97a57870b81127b`.

2.1.4 page2 render raw SHA-256=`465c4202631f3f793071345c3d43627aede6cb5664f8e277f7515c8b143279fd`.

2.1.5 page3 render raw SHA-256=`3436b38519788a7b08a72d3dfabae8785508beedd738d7f94caa574919ef4e61`.

2.1.6 page4 render raw SHA-256=`af3d167485c3776ab1f521ae29b5784a1c304d82ee55c759489f67f9c9cd82f9`.

2.1.7 every page was visually inspected at original render detail.

## 2.2 Text extraction

2.2.1 extractor=`pdftotext -layout/Poppler available in the workspace`; exact tool version receipt=`unknown/unavailable`.

2.2.2 extracted text physical identity=`155 lines/14093 bytes`.

2.2.3 extracted text raw SHA-256=`6800eaf2a76b41440c3a0fc9bd61d2b421ace3f431a1235b993dd63bf389fe3d`.

2.2.4 Hebrew/English bidirectional control characters are present in extracted bytes and are expected from the RTL PDF; the extraction is navigation Evidence, not a canonical Requirement serialization.

2.2.5 exact Requirement extraction requires a separately versioned source-normalization and line/region crosswalk reviewed against the page renders.

# 3. Visual findings

## 3.1 Legibility and layout

3.1.1 all four page images are readable.

3.1.2 no observed heading, body paragraph, list item, table cell, footer or page number is clipped.

3.1.3 no observed text overlaps another semantic element.

3.1.4 the Admin capability table on page3 and Integrations table on page4 are fully visible with row/column boundaries intact.

3.1.5 Hebrew RTL body and embedded English technical terms remain visually understandable.

3.1.6 page transitions preserve Section order; page footer numbering is `1/4`, `2/4`, `3/4`, `4/4`.

## 3.2 Non-semantic visual artifact

3.2.1 a small standalone gray vertical glyph/mark appears near the upper-left margin on the title page and at least one following page render.

3.2.2 the extracted text represents this mark as `I`.

3.2.3 the mark does not overlap or alter observed semantic content.

3.2.4 status=`P3-SOURCE-PRESENTATION-ARTIFACT`; remediation=`remove only in a future source-document revision if the source owner wants visual cleanup`; no Product or Requirement impact is claimed.

# 4. Page-by-page semantic inventory

## 4.1 Page1

4.1.1 title=`מסמך אפיון מערכת`.

4.1.2 subtitle=`מערכת דיוור WhatsApp רשמית (WhatsApp Business API) בשילוב בוט חכם מבוסס בינה מלאכותית`.

4.1.3 page1 is a cover and adds no other observed Requirement text.

## 4.2 Page2

4.2.1 Section1 defines a high-level SaaS Specification using official Meta WhatsApp Business Platform, a flow-based bot and optional LLM responses.

4.2.2 Section1 states a subscription model, per-business workspace, business-number connection, Template Messages and automated bot operation.

4.2.3 Section1 explicitly says the PDF is not a detailed UI/UX Specification and contains no Wireframes/Mockups.

4.2.4 Section2 goals include Multi-Tenant business WhatsApp management, recurring self-service subscription, scheduled high-volume approved Templates, visual-flow bot, optional LLM with business Knowledge and a super-admin panel.

4.2.5 Section3 target audiences include SMBs, marketing/digital agencies managing multiple customers, and service/support teams.

4.2.6 Section4 identifies Subscriber, Admin and Contact user circles and Meta Cloud API plus an LLM provider as primary external services.

4.2.7 Section5 describes Landing/Pricing, plan selection, PCI-oriented payment input, recurring charge, automatic account creation, credential delivery, first login and WhatsApp connection.

4.2.8 Section5 requires a later policy for failed-payment retries, notification and automatic suspension.

4.2.9 Section6 begins the Admin panel definition.

## 4.3 Page3

4.3.1 Section6 Admin capabilities are subscriber list/filter, manual subscriber creation, subscription extension, cancellation with history and subscriber/plan/quota/contact editing.

4.3.2 Section6 recommends later Dashboard, Admin Audit Log and multi-admin authorization.

4.3.3 Section7 defines the Client panel as the customer's WhatsApp/bot operations workspace.

4.3.4 Section7.1 requires official Facebook Embedded Signup for business-number connection, business ownership verification and required API permissions.

4.3.5 Section7.2 requires Meta-compatible Template construction with header, body, buttons and variables plus official approval submission.

4.3.6 Section7.3 requires Campaign recipients from external Excel and internal Contacts, tag/segment filtering and sent/delivered/read/failed reporting.

4.3.7 Section7.4 includes future scheduling and recurring Campaigns.

4.3.8 Section7.5 describes visual drag-and-drop Flow Builder branches, text, interactive buttons and human handoff.

4.3.9 Section7.6 describes System Prompt, uploaded documents for Knowledge/RAG and fallback among flow bot, AI and human response.

## 4.4 Page4

4.4.1 Section8 integration classes are Meta WhatsApp Business Platform, Payment Gateway, LLM API and Database/File storage.

4.4.2 Section9 non-functional requirements are sensitive-data encryption, secure API tokens, PCI-DSS in payment flow, Queue-based scale, `99.5%+` availability target, Multi-Tenant Data isolation, Audit/logging and monitoring/alerts.

4.4.3 Section10 leaves open exact subscription packages/quotas, Billing provider, AI provider, failed-payment/suspension policy, MVP bot scope and Hebrew/English/Arabic requirements.

4.4.4 Section11 labels the PDF a preliminary basis requiring further customer refinement before detailed UX/UI, Technical Design, cost and schedule work.

# 5. Source-precedence and conflict observations

5.1 the PDF is a primary high-level Requirement source; it is not the sole Decision authority after Tal's later explicit choices.

5.2 later D21 selects a closed single-Tenant Pilot, so the PDF's broad Multi-Tenant SaaS target remains a destination architecture while Pilot activation is narrower.

5.3 later D23 selects one manual Pilot plan, so the PDF's self-service recurring Billing remains post-Pilot/conditional and Checkout stays OFF under D03-A4.

5.4 later D24 selects recurring Campaigns after Pilot, so PDF Section7.4 does not authorize recurring Campaign implementation in Pilot.

5.5 later D25 selects `agent-approval-only`, so PDF language about automated intelligent responses is constrained to human-approved drafts during the selected Pilot.

5.6 later D22 selects Hebrew-first Israeli SMB, while Arabic/English depth remains an explicit Roadmap/market Decision rather than an assumed Pilot parity claim.

5.7 every such precedence mapping must appear as explicit forward/inverse Requirement/Decision crosswalk rows; prose here gives navigation only and no closure credit.

# 6. Completeness gaps and next actions

6.1 exact page-region IDs and normalized Requirement IDs=`not materialized`.

6.2 exact forward crosswalk from every PDF statement to Decision, Stage, Task, Test, Evidence and Gate=`not materialized`.

6.3 exact inverse crosswalk proving no Master/Task claims an unsupported PDF Requirement=`not materialized`.

6.4 visual verification accepted=`0/1` because this Producer observation has no independent reproduction/review.

6.5 Requirement-universe acceptance=`0/1`; Section35.6 Task leaves=`0`; Gate29=`BLOCKED`; development freeze=`ACTIVE`.

6.6 next safe action=`include this exact source/root and receipt in G0; later generate region-level PDF Requirement extraction under an accepted Definition and compare it against the second user specification`.
