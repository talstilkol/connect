# 1. Connect — Source-universe v3 frozen SourceReferenceIndex

## 1.1 Identity and boundary

1.1.1 `artifactId=CONNECT-SOURCE-UNIVERSE-V3-FROZEN-SOURCE-REFERENCE-INDEX-2026-08-29`.

1.1.2 status=`FROZEN-INPUT-CANDIDATE; NOT-ACCEPTED`.

1.1.3 purpose=`bind every upstream token consumed by SURS v3 or its predecessor crosswalk to one exact namespace, artifact, full SHA-256, locator, bounded claim, evidence role and inverse consumer`.

1.1.4 boundary=`planning only; no Product/Git/Build/Push/Deploy/provider/account/credential mutation`.

1.1.5 canonical token grammar=`<namespace>#<local-id>`; comparison=`exact UTF-8 bytes, case-sensitive`; aliases and ranges are forbidden.

1.1.6 records below are the complete closed set; any token outside it returns `SOURCE-REFERENCE-BLOCKED`.

## 1.2 Source namespace roots

1.2.1 `SRC-V2` path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-2026-08-29.md`; SHA-256=`5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe`; locator grammar=`requirement SURS-NNN`.

1.2.2 `SRC-SURS2-REVIEW` path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-independent-hostile-review-2026-08-29.md`; SHA-256=`59f83f8d68439c404a10857bcd18535bbc826f12eb7c3e0da06106d7e6d4a923`; bounded claim=`review context and verdict only`.

1.2.3 `SRC-SURS2-FINDINGS` path=`web/docs/planning/source-universe-and-custody-successor-requirements-v2-independent-hostile-review-findings-manifest-2026-08-29.md`; SHA-256=`4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea`; locator grammar=`section 2.n`.

1.2.4 `SRC-SURS1-FINDINGS` path=`web/docs/planning/source-universe-and-custody-requirements-hostile-review-findings-manifest-2026-08-29.md`; SHA-256=`a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b`; locator grammar=`section 2.n`.

1.2.5 `SRC-D31` path=`web/docs/postgresql-runtime-role-decision.md`; raw SHA-256=`8816a77739a17e94cf9ffcbf5a586db00e001d9d5fdff3bd8e801a0e33e79bb0`; locator profile=`UTF-8/LF line span bound to raw root and span root`.

## 2.1 Canonical target records

| token | namespace | artifactId | full SHA-256 | exact media locator | bounded claim | authority/evidence role | inverse consumers |
|---|---|---|---|---|---|---|---|
| `SRC-V2#SURS-001` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-001 | full five-field requirement SURS-001 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-007` |
| `SRC-V2#SURS-002` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-002 | full five-field requirement SURS-002 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-004` |
| `SRC-V2#SURS-003` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-003 | full five-field requirement SURS-003 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-005` |
| `SRC-V2#SURS-004` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-004 | full five-field requirement SURS-004 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-009` |
| `SRC-V2#SURS-005` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-005 | full five-field requirement SURS-005 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-011` |
| `SRC-V2#SURS-006` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-006 | full five-field requirement SURS-006 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-012` |
| `SRC-V2#SURS-007` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-007 | full five-field requirement SURS-007 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-013` |
| `SRC-V2#SURS-008` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-008 | full five-field requirement SURS-008 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-021` |
| `SRC-V2#SURS-009` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-009 | full five-field requirement SURS-009 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-015` |
| `SRC-V2#SURS-010` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-010 | full five-field requirement SURS-010 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-023` |
| `SRC-V2#SURS-011` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-011 | full five-field requirement SURS-011 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-017` |
| `SRC-V2#SURS-012` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-012 | full five-field requirement SURS-012 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-016` |
| `SRC-V2#SURS-013` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-013 | full five-field requirement SURS-013 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-024` |
| `SRC-V2#SURS-014` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-014 | full five-field requirement SURS-014 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-025` |
| `SRC-V2#SURS-015` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-015 | full five-field requirement SURS-015 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-026` |
| `SRC-V2#SURS-016` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-016 | full five-field requirement SURS-016 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-027` |
| `SRC-V2#SURS-017` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-017 | full five-field requirement SURS-017 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-029` |
| `SRC-V2#SURS-018` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-018 | full five-field requirement SURS-018 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-019` |
| `SRC-V2#SURS-019` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-019 | full five-field requirement SURS-019 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-030` |
| `SRC-V2#SURS-020` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-020 | full five-field requirement SURS-020 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-031` |
| `SRC-V2#SURS-021` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-021 | full five-field requirement SURS-021 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-020` |
| `SRC-V2#SURS-022` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-022 | full five-field requirement SURS-022 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-036` |
| `SRC-V2#SURS-023` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-023 | full five-field requirement SURS-023 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-034` |
| `SRC-V2#SURS-024` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-024 | full five-field requirement SURS-024 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-040` |
| `SRC-V2#SURS-025` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-025 | full five-field requirement SURS-025 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-041` |
| `SRC-V2#SURS-026` | `SRC-V2` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-2026-08-29` | `5eb769c734690f4cde2885c798c3275d711791b9c1ea6d1a71d0badd0dea25fe` | requirement SURS-026 | full five-field requirement SURS-026 | rejected predecessor planning requirement; preservation evidence | `SURS3-REQ-046` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F001` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.1 | full finding SURS2-HR-F001 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-001` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F002` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.2 | full finding SURS2-HR-F002 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-008` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F003` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.3 | full finding SURS2-HR-F003 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-006` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F004` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.4 | full finding SURS2-HR-F004 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-010` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F005` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.5 | full finding SURS2-HR-F005 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-044` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F006` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.6 | full finding SURS2-HR-F006 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-014` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F007` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.7 | full finding SURS2-HR-F007 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-022` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F008` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.8 | full finding SURS2-HR-F008 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-039` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F009` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.9 | full finding SURS2-HR-F009 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-018` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F010` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.10 | full finding SURS2-HR-F010 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-038` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F011` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.11 | full finding SURS2-HR-F011 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-028` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F012` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.12 | full finding SURS2-HR-F012 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-002` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F013` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.13 | full finding SURS2-HR-F013 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-032` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F014` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.14 | full finding SURS2-HR-F014 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-033` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F015` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.15 | full finding SURS2-HR-F015 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-037` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F016` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.16 | full finding SURS2-HR-F016 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-035` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F017` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.17 | full finding SURS2-HR-F017 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-043` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F018` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.18 | full finding SURS2-HR-F018 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-042` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F019` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.19 | full finding SURS2-HR-F019 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-045` |
| `SRC-SURS2-FINDINGS#SURS2-HR-F020` | `SRC-SURS2-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-SUCCESSOR-REQUIREMENTS-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `4c013fa9f72177b0081c6563101d20a48c278205e13f129c7b3205985a4530ea` | section 2.20 | full finding SURS2-HR-F020 including defect, impact, remediation and predicate | raw independent hostile-review evidence; reviewer-local; not accepted | `SURS3-REQ-003` |
| `SRC-SURS1-FINDINGS#SURS-HR-F001` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.1 | full predecessor finding SURS-HR-F001 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-001` |
| `SRC-SURS1-FINDINGS#SURS-HR-F002` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.2 | full predecessor finding SURS-HR-F002 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-002` |
| `SRC-SURS1-FINDINGS#SURS-HR-F003` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.3 | full predecessor finding SURS-HR-F003 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-003` |
| `SRC-SURS1-FINDINGS#SURS-HR-F004` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.4 | full predecessor finding SURS-HR-F004 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-004` |
| `SRC-SURS1-FINDINGS#SURS-HR-F005` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.5 | full predecessor finding SURS-HR-F005 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-005` |
| `SRC-SURS1-FINDINGS#SURS-HR-F006` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.6 | full predecessor finding SURS-HR-F006 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-006` |
| `SRC-SURS1-FINDINGS#SURS-HR-F007` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.7 | full predecessor finding SURS-HR-F007 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-007` |
| `SRC-SURS1-FINDINGS#SURS-HR-F008` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.8 | full predecessor finding SURS-HR-F008 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-008` |
| `SRC-SURS1-FINDINGS#SURS-HR-F009` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.9 | full predecessor finding SURS-HR-F009 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-009` |
| `SRC-SURS1-FINDINGS#SURS-HR-F010` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.10 | full predecessor finding SURS-HR-F010 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-010` |
| `SRC-SURS1-FINDINGS#SURS-HR-F011` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.11 | full predecessor finding SURS-HR-F011 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-011` |
| `SRC-SURS1-FINDINGS#SURS-HR-F012` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.12 | full predecessor finding SURS-HR-F012 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-012` |
| `SRC-SURS1-FINDINGS#SURS-HR-F013` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.13 | full predecessor finding SURS-HR-F013 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-013` |
| `SRC-SURS1-FINDINGS#SURS-HR-F014` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.14 | full predecessor finding SURS-HR-F014 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-014` |
| `SRC-SURS1-FINDINGS#SURS-HR-F015` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.15 | full predecessor finding SURS-HR-F015 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-015` |
| `SRC-SURS1-FINDINGS#SURS-HR-F016` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.16 | full predecessor finding SURS-HR-F016 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-016` |
| `SRC-SURS1-FINDINGS#SURS-HR-F017` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.17 | full predecessor finding SURS-HR-F017 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-017` |
| `SRC-SURS1-FINDINGS#SURS-HR-F018` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.18 | full predecessor finding SURS-HR-F018 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-018` |
| `SRC-SURS1-FINDINGS#SURS-HR-F019` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.19 | full predecessor finding SURS-HR-F019 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-019` |
| `SRC-SURS1-FINDINGS#SURS-HR-F020` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.20 | full predecessor finding SURS-HR-F020 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-020` |
| `SRC-SURS1-FINDINGS#SURS-HR-F021` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.21 | full predecessor finding SURS-HR-F021 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-021` |
| `SRC-SURS1-FINDINGS#SURS-HR-F022` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.22 | full predecessor finding SURS-HR-F022 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-022` |
| `SRC-SURS1-FINDINGS#SURS-HR-F023` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.23 | full predecessor finding SURS-HR-F023 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-023` |
| `SRC-SURS1-FINDINGS#SURS-HR-F024` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.24 | full predecessor finding SURS-HR-F024 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-024` |
| `SRC-SURS1-FINDINGS#SURS-HR-F025` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.25 | full predecessor finding SURS-HR-F025 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-025` |
| `SRC-SURS1-FINDINGS#SURS-HR-F026` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.26 | full predecessor finding SURS-HR-F026 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-026` |
| `SRC-SURS1-FINDINGS#SURS-HR-F027` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.27 | full predecessor finding SURS-HR-F027 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-027` |
| `SRC-SURS1-FINDINGS#SURS-HR-F028` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.28 | full predecessor finding SURS-HR-F028 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-028` |
| `SRC-SURS1-FINDINGS#SURS-HR-F029` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.29 | full predecessor finding SURS-HR-F029 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-029` |
| `SRC-SURS1-FINDINGS#SURS-HR-F030` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.30 | full predecessor finding SURS-HR-F030 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-030` |
| `SRC-SURS1-FINDINGS#SURS-HR-F031` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.31 | full predecessor finding SURS-HR-F031 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-031` |
| `SRC-SURS1-FINDINGS#SURS-HR-F032` | `SRC-SURS1-FINDINGS` | `CONNECT-SOURCE-UNIVERSE-AND-CUSTODY-REQUIREMENTS-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29` | `a5933db4817fe7acaf9385347fcfb9059eef5cdd3d97bdb18b92fe81c9ee0a5b` | section 2.32 | full predecessor finding SURS-HR-F032 | raw predecessor hostile-review evidence; reviewer-local; not accepted | `PCW-032` |
| `SRC-D31#DECISION-7.1` | `SRC-D31` | `CONNECT-D31-POSTGRESQL-RUNTIME-ROLE-DECISION-CANDIDATE` | `8816a77739a17e94cf9ffcbf5a586db00e001d9d5fdff3bd8e801a0e33e79bb0` | UTF-8/LF lines 747–751 inclusive; span SHA-256=6a13c3d00d7576d97cbcbe69340a019a83b79831987942d7c39534a49ec97578; 5 lines; 464 bytes | Tal decision 7.1 approving target architecture option A and isolated provider boundary condition | technical-decision candidate; authority/admission still requires v3 selection | `SURS3-REQ-031`; `SURS3-REQ-032` |

## 2.2 Exact occurrence ledger

2.2.1 one occurrence is one ordered pair `(token,consumer)`; a target may lawfully have multiple inverse consumers, but every occurrence resolves to exactly one target record.

| occurrenceId | token | consumer |
|---|---|---|
| `SRI-OCC-001` | `SRC-V2#SURS-001` | `SURS3-REQ-007` |
| `SRI-OCC-002` | `SRC-V2#SURS-002` | `SURS3-REQ-004` |
| `SRI-OCC-003` | `SRC-V2#SURS-003` | `SURS3-REQ-005` |
| `SRI-OCC-004` | `SRC-V2#SURS-004` | `SURS3-REQ-009` |
| `SRI-OCC-005` | `SRC-V2#SURS-005` | `SURS3-REQ-011` |
| `SRI-OCC-006` | `SRC-V2#SURS-006` | `SURS3-REQ-012` |
| `SRI-OCC-007` | `SRC-V2#SURS-007` | `SURS3-REQ-013` |
| `SRI-OCC-008` | `SRC-V2#SURS-008` | `SURS3-REQ-021` |
| `SRI-OCC-009` | `SRC-V2#SURS-009` | `SURS3-REQ-015` |
| `SRI-OCC-010` | `SRC-V2#SURS-010` | `SURS3-REQ-023` |
| `SRI-OCC-011` | `SRC-V2#SURS-011` | `SURS3-REQ-017` |
| `SRI-OCC-012` | `SRC-V2#SURS-012` | `SURS3-REQ-016` |
| `SRI-OCC-013` | `SRC-V2#SURS-013` | `SURS3-REQ-024` |
| `SRI-OCC-014` | `SRC-V2#SURS-014` | `SURS3-REQ-025` |
| `SRI-OCC-015` | `SRC-V2#SURS-015` | `SURS3-REQ-026` |
| `SRI-OCC-016` | `SRC-V2#SURS-016` | `SURS3-REQ-027` |
| `SRI-OCC-017` | `SRC-V2#SURS-017` | `SURS3-REQ-029` |
| `SRI-OCC-018` | `SRC-V2#SURS-018` | `SURS3-REQ-019` |
| `SRI-OCC-019` | `SRC-V2#SURS-019` | `SURS3-REQ-030` |
| `SRI-OCC-020` | `SRC-V2#SURS-020` | `SURS3-REQ-031` |
| `SRI-OCC-021` | `SRC-V2#SURS-021` | `SURS3-REQ-020` |
| `SRI-OCC-022` | `SRC-V2#SURS-022` | `SURS3-REQ-036` |
| `SRI-OCC-023` | `SRC-V2#SURS-023` | `SURS3-REQ-034` |
| `SRI-OCC-024` | `SRC-V2#SURS-024` | `SURS3-REQ-040` |
| `SRI-OCC-025` | `SRC-V2#SURS-025` | `SURS3-REQ-041` |
| `SRI-OCC-026` | `SRC-V2#SURS-026` | `SURS3-REQ-046` |
| `SRI-OCC-027` | `SRC-SURS2-FINDINGS#SURS2-HR-F001` | `SURS3-REQ-001` |
| `SRI-OCC-028` | `SRC-SURS2-FINDINGS#SURS2-HR-F002` | `SURS3-REQ-008` |
| `SRI-OCC-029` | `SRC-SURS2-FINDINGS#SURS2-HR-F003` | `SURS3-REQ-006` |
| `SRI-OCC-030` | `SRC-SURS2-FINDINGS#SURS2-HR-F004` | `SURS3-REQ-010` |
| `SRI-OCC-031` | `SRC-SURS2-FINDINGS#SURS2-HR-F005` | `SURS3-REQ-044` |
| `SRI-OCC-032` | `SRC-SURS2-FINDINGS#SURS2-HR-F006` | `SURS3-REQ-014` |
| `SRI-OCC-033` | `SRC-SURS2-FINDINGS#SURS2-HR-F007` | `SURS3-REQ-022` |
| `SRI-OCC-034` | `SRC-SURS2-FINDINGS#SURS2-HR-F008` | `SURS3-REQ-039` |
| `SRI-OCC-035` | `SRC-SURS2-FINDINGS#SURS2-HR-F009` | `SURS3-REQ-018` |
| `SRI-OCC-036` | `SRC-SURS2-FINDINGS#SURS2-HR-F010` | `SURS3-REQ-038` |
| `SRI-OCC-037` | `SRC-SURS2-FINDINGS#SURS2-HR-F011` | `SURS3-REQ-028` |
| `SRI-OCC-038` | `SRC-SURS2-FINDINGS#SURS2-HR-F012` | `SURS3-REQ-002` |
| `SRI-OCC-039` | `SRC-SURS2-FINDINGS#SURS2-HR-F013` | `SURS3-REQ-032` |
| `SRI-OCC-040` | `SRC-SURS2-FINDINGS#SURS2-HR-F014` | `SURS3-REQ-033` |
| `SRI-OCC-041` | `SRC-SURS2-FINDINGS#SURS2-HR-F015` | `SURS3-REQ-037` |
| `SRI-OCC-042` | `SRC-SURS2-FINDINGS#SURS2-HR-F016` | `SURS3-REQ-035` |
| `SRI-OCC-043` | `SRC-SURS2-FINDINGS#SURS2-HR-F017` | `SURS3-REQ-043` |
| `SRI-OCC-044` | `SRC-SURS2-FINDINGS#SURS2-HR-F018` | `SURS3-REQ-042` |
| `SRI-OCC-045` | `SRC-SURS2-FINDINGS#SURS2-HR-F019` | `SURS3-REQ-045` |
| `SRI-OCC-046` | `SRC-SURS2-FINDINGS#SURS2-HR-F020` | `SURS3-REQ-003` |
| `SRI-OCC-047` | `SRC-SURS1-FINDINGS#SURS-HR-F001` | `PCW-001` |
| `SRI-OCC-048` | `SRC-SURS1-FINDINGS#SURS-HR-F002` | `PCW-002` |
| `SRI-OCC-049` | `SRC-SURS1-FINDINGS#SURS-HR-F003` | `PCW-003` |
| `SRI-OCC-050` | `SRC-SURS1-FINDINGS#SURS-HR-F004` | `PCW-004` |
| `SRI-OCC-051` | `SRC-SURS1-FINDINGS#SURS-HR-F005` | `PCW-005` |
| `SRI-OCC-052` | `SRC-SURS1-FINDINGS#SURS-HR-F006` | `PCW-006` |
| `SRI-OCC-053` | `SRC-SURS1-FINDINGS#SURS-HR-F007` | `PCW-007` |
| `SRI-OCC-054` | `SRC-SURS1-FINDINGS#SURS-HR-F008` | `PCW-008` |
| `SRI-OCC-055` | `SRC-SURS1-FINDINGS#SURS-HR-F009` | `PCW-009` |
| `SRI-OCC-056` | `SRC-SURS1-FINDINGS#SURS-HR-F010` | `PCW-010` |
| `SRI-OCC-057` | `SRC-SURS1-FINDINGS#SURS-HR-F011` | `PCW-011` |
| `SRI-OCC-058` | `SRC-SURS1-FINDINGS#SURS-HR-F012` | `PCW-012` |
| `SRI-OCC-059` | `SRC-SURS1-FINDINGS#SURS-HR-F013` | `PCW-013` |
| `SRI-OCC-060` | `SRC-SURS1-FINDINGS#SURS-HR-F014` | `PCW-014` |
| `SRI-OCC-061` | `SRC-SURS1-FINDINGS#SURS-HR-F015` | `PCW-015` |
| `SRI-OCC-062` | `SRC-SURS1-FINDINGS#SURS-HR-F016` | `PCW-016` |
| `SRI-OCC-063` | `SRC-SURS1-FINDINGS#SURS-HR-F017` | `PCW-017` |
| `SRI-OCC-064` | `SRC-SURS1-FINDINGS#SURS-HR-F018` | `PCW-018` |
| `SRI-OCC-065` | `SRC-SURS1-FINDINGS#SURS-HR-F019` | `PCW-019` |
| `SRI-OCC-066` | `SRC-SURS1-FINDINGS#SURS-HR-F020` | `PCW-020` |
| `SRI-OCC-067` | `SRC-SURS1-FINDINGS#SURS-HR-F021` | `PCW-021` |
| `SRI-OCC-068` | `SRC-SURS1-FINDINGS#SURS-HR-F022` | `PCW-022` |
| `SRI-OCC-069` | `SRC-SURS1-FINDINGS#SURS-HR-F023` | `PCW-023` |
| `SRI-OCC-070` | `SRC-SURS1-FINDINGS#SURS-HR-F024` | `PCW-024` |
| `SRI-OCC-071` | `SRC-SURS1-FINDINGS#SURS-HR-F025` | `PCW-025` |
| `SRI-OCC-072` | `SRC-SURS1-FINDINGS#SURS-HR-F026` | `PCW-026` |
| `SRI-OCC-073` | `SRC-SURS1-FINDINGS#SURS-HR-F027` | `PCW-027` |
| `SRI-OCC-074` | `SRC-SURS1-FINDINGS#SURS-HR-F028` | `PCW-028` |
| `SRI-OCC-075` | `SRC-SURS1-FINDINGS#SURS-HR-F029` | `PCW-029` |
| `SRI-OCC-076` | `SRC-SURS1-FINDINGS#SURS-HR-F030` | `PCW-030` |
| `SRI-OCC-077` | `SRC-SURS1-FINDINGS#SURS-HR-F031` | `PCW-031` |
| `SRI-OCC-078` | `SRC-SURS1-FINDINGS#SURS-HR-F032` | `PCW-032` |
| `SRI-OCC-079` | `SRC-D31#DECISION-7.1` | `SURS3-REQ-031` |
| `SRI-OCC-080` | `SRC-D31#DECISION-7.1` | `SURS3-REQ-032` |

## 3.1 Frozen counters and predicates

3.1.1 namespace roots=`5`; target records=`79`; unique tokens=`79`; occurrence records=`80`.

3.1.2 duplicate token identities=`0`; unresolved target roots=`0`; target records without locator=`0`; target records without bounded claim=`0`; target records without evidence role=`0`; target records without inverse consumer=`0`.

3.1.3 acceptance predicate=`two independent resolvers emit identical canonical target and occurrence bytes; every SURS v3 sourceBasis and PCW token equals one occurrence; target and inverse cardinalities reconcile; deleting/changing one token, root, locator, claim or inverse edge returns SOURCE-REFERENCE-BLOCKED`.

3.1.4 exact acceptance remains `0/1`; this index is a frozen input candidate, not accepted authority.

3.1.5 Gate29=`BLOCKED`; development freeze=`ACTIVE`.

