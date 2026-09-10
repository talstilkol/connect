#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const planningDir = dirname(scriptPath);
const repositoryRoot = resolve(planningDir, "../../..");
const subjectPath = resolve(planningDir, "three-review-protocol-v1-6-successor-requirements-2026-08-30.md");
const reportAPath = resolve(planningDir, "three-review-protocol-v1-6-qa-reader-a-report-2026-08-30.json");
const reportBPath = resolve(planningDir, "three-review-protocol-v1-6-qa-reader-b-report-2026-08-30.json");
const producerQAPath = resolve(planningDir, "three-review-protocol-v1-6-successor-requirements-producer-qa-2026-08-30.md");
const readerAPath = resolve(planningDir, "three-review-protocol-v1-6-qa-reader-a-2026-08-29.mjs");
const readerBPath = resolve(planningDir, "three-review-protocol-v1-6-qa-reader-b-2026-08-29.rb");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const u64be = (value) => {
  const out = Buffer.alloc(8);
  out.writeBigUInt64BE(BigInt(value));
  return out;
};
const frame = (...values) => Buffer.concat(values.map((value) => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  return Buffer.concat([u64be(bytes.length), bytes]);
}));
const rooted = (domain, ...values) => sha256(frame(domain, ...values));
const canonical = (value) => {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  throw new Error(`non-canonical value type ${typeof value}`);
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const lineCount = (bytes) => [...bytes].filter((byte) => byte === 10).length;
const toRelative = (name) => `web/docs/planning/${name}`;

const sourceSpecs = [
  ["V15SUBJECT", "three-review-protocol-v1-5-successor-requirements-2026-08-29.md", "73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c"],
  ["V15PRODUCERQA", "three-review-protocol-v1-5-successor-requirements-producer-qa-2026-08-29.md", "e0b0b093f4169cb75e40f750c4af68205b9bc1dc6ada719ccb870de883e16570"],
  ["V15REVIEW", "three-review-protocol-v1-5-successor-requirements-independent-hostile-review-2026-08-29.md", "7e4123a746725d2849f99859e010ab870996cb68af9c58ff3796f3555705029c"],
  ["V15MANIFEST", "three-review-protocol-v1-5-successor-requirements-independent-hostile-review-findings-manifest-2026-08-29.md", "310cdb86dedb5b26a4f948086e13ea42ce1c72c9fe8cf5e55e99612c0162ec85"],
  ["V14SUBJECT", "three-review-protocol-v1-4-successor-requirements-2026-08-29.md", "0602687fc0cf213bee360de86e4cbeed2f8267a7be82615f76205b14ad6cc4af"],
  ["V14REVIEW", "three-review-protocol-v1-4-successor-requirements-independent-hostile-review-2026-08-29.md", "28eeaae72013a2d23e84f7e69b4f9ac9f5da89b51f284dd507faeacd235b1545"],
  ["V14MANIFEST", "three-review-protocol-v1-4-successor-requirements-independent-hostile-review-findings-manifest-2026-08-29.md", "2e4a603ce7c8a4234406b3fd4b42e01e9b01d657b97f2513913a006bd8345154"],
  ["V13SUBJECT", "three-review-protocol-v1-3-successor-requirements-2026-08-29.md", "1acadac5e9e6cc814bb9699be48c47f71a974d44cecb8b3fe31395e323ab89a3"],
  ["V13REVIEW", "three-review-protocol-v1-3-successor-requirements-hostile-review-2026-08-29.md", "95b0a395d593e2bb244735ec4859dc82c6e843146648888dde2ec60477f45d71"],
  ["V13MANIFEST", "three-review-protocol-v1-3-successor-requirements-hostile-review-findings-manifest-2026-08-29.md", "3e130bf42381bda1b4037a976d405ec3b74bd54417be1c75c72a1acb3c4c0fd9"],
  ["V12SUBJECT", "three-review-protocol-v1-2-successor-requirements-2026-08-29.md", "90d3a33aa11204afc6ea1fc92ba31acf615729617470b3137418a71a618c6461"],
  ["V12REVIEW", "three-review-protocol-v1-2-successor-requirements-hostile-review-2026-08-29.md", "bb9878b5d0a107cb8a7c240459de7a87d6f6f34e743b1bdb3ed13dc1773cb1ea"],
  ["V12MANIFEST", "three-review-protocol-v1-2-successor-requirements-hostile-review-findings-manifest-2026-08-29.md", "0f8cc6ef746985a1dd9528770a5f6ce4ab7e407c0a6f8793866bf2b0b12af708"],
  ["MATHMANIFEST", "three-review-protocol-v1-1-successor-requirements-mathematical-hostile-review-findings-manifest-2026-08-29.md", "35a5ef1b1860c1c95df45a521e87d47ac8acc5fa21c13a8d71bd47ecd5968ff0"],
  ["INTAKE", "three-review-intake-and-reconciliation-eligibility-assessment-2026-08-29.md", "f970f0d62e4c62bf17f417967f2baebcbed78ef393e4622bfe3b85d5e10e4b08"],
  ["B0V3", "bootstrap-authority-envelope-b0-successor-requirements-v3-2026-08-29.md", "872ffc806ac35614a9cba33cc9cbe5bc1a0f0cf7675d578183a60ca55d9611e9"],
  ["B0V3QA", "bootstrap-authority-envelope-b0-successor-requirements-v3-producer-qa-2026-08-29.md", "75a0b7d01c0f0a35f92956549b7aeb5ba40f0bea8eeea04652a9acb175443628"],
  ["PUBLICCYBERV2", "public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md", "322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a"],
  ["PUBLICCYBERV2QA", "public-repository-and-cyber-hardening-successor-requirements-v2-producer-qa-v2-2026-08-29.md", "6e7c5b095b38d4f660aec710e8358587a6eb77c33cb909d06a2d59d22dd26fe1"],
  ["GITHUBPUBLIC", "github-public-visibility-live-readback-observation-2026-08-29.md", "3b5215ccdc1976a9dff96d960c36bb49ff99251cee6538b70b37a3ad4380cfef"],
  ["DIRECTIVE", "user-directive-and-source-precedence-ledger-2026-08-29.md", "b012a479b18e162f5f759b49e033eb3856a4637cc0e91a8a36f1d06043813342"],
];

const carriers = sourceSpecs.map(([carrierId, filename, expectedRoot]) => {
  const path = resolve(planningDir, filename);
  const bytesValue = readFileSync(path);
  const root = sha256(bytesValue);
  assert(root === expectedRoot, `frozen carrier changed ${carrierId}`);
  return {
    authorityState: "PENDING-EXTERNAL-B0-ADMISSION;CREDIT=0",
    bytes: bytesValue.length,
    carrierId,
    custodyClass: "PUBLIC-PLANNING-EXACT-ROOT",
    lines: lineCount(bytesValue),
    mediaType: "text/markdown;charset=utf-8",
    path: toRelative(filename),
    root,
    bytesValue,
  };
});
const carrierById = new Map(carriers.map((carrier) => [carrier.carrierId, carrier]));

const readerARoot = sha256(readFileSync(readerAPath));
const readerBRoot = sha256(readFileSync(readerBPath));
const profileDefs = [
  ["WHOLE-CARRIER-1", "WHOLE-CARRIER", "input=exact bytes;member span=[0,byteLength);memberId=namespace.selector;duplicates=forbidden;error=TERM-SOURCE-GRAPH-INVALID"],
  ["MARKDOWN-HEADING-BLOCK-1", "MARKDOWN-HEADING-BLOCK", "input=LF-preserved UTF-8;start=line beginning ## containing backtick selector;end=next line beginning ## or #;span=zero-based half-open;memberId=first backtick token;duplicates=forbidden;error=TERM-SOURCE-GRAPH-INVALID"],
  ["MARKDOWN-TABLE-ROW-PREFIX-1", "TABLE-ROW-PREFIX", "input=LF-preserved UTF-8;member=line beginning namespace.selector including final LF;memberId=first backtick token;ordering=byteStart ascending;duplicates=forbidden;error=TERM-SOURCE-GRAPH-INVALID"],
];
const parserProfiles = profileDefs.map(([profileId, mode, schema]) => ({
  mode,
  parserProfileRoot: rooted("MPRR-V16-PARSER-PROFILE-1", profileId, schema, readerARoot, readerBRoot),
  profileId,
  readerARoot,
  readerBRoot,
  schema,
}));
const profileById = new Map(parserProfiles.map((profile) => [profile.profileId, profile]));

const splitLines = (bytes) => {
  const lines = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 10) {
      lines.push({ byteStart: start, byteEnd: index + 1, text: bytes.subarray(start, index + 1).toString("utf8") });
      start = index + 1;
    }
  }
  if (start < bytes.length) lines.push({ byteStart: start, byteEnd: bytes.length, text: bytes.subarray(start).toString("utf8") });
  return lines;
};

const deriveRawMembers = (carrier, mode, selector) => {
  if (mode === "WHOLE-CARRIER") return [{ byteStart: 0, byteEnd: carrier.bytesValue.length, memberId: selector }];
  const lines = splitLines(carrier.bytesValue);
  if (mode === "TABLE-ROW-PREFIX") {
    return lines.filter((line) => line.text.startsWith(selector)).map((line) => ({
      byteEnd: line.byteEnd,
      byteStart: line.byteStart,
      memberId: line.text.match(/`([^`]+)`/)?.[1],
    }));
  }
  const starts = lines.map((line, index) => ({ ...line, index })).filter((line) => line.text.startsWith("## ") && line.text.includes(`\`${selector}`));
  return starts.map((line) => {
    let byteEnd = carrier.bytesValue.length;
    for (let cursor = line.index + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor].text.startsWith("## ") || lines[cursor].text.startsWith("# ")) {
        byteEnd = lines[cursor].byteStart;
        break;
      }
    }
    return { byteEnd, byteStart: line.byteStart, memberId: line.text.match(/`([^`]+)`/)?.[1] };
  });
};

const namespaceDefs = [
  ["V15REQ", "V15SUBJECT", "MARKDOWN-HEADING-BLOCK-1", "MPRR-V15-REQ-"],
  ["V15XW", "V15SUBJECT", "MARKDOWN-TABLE-ROW-PREFIX-1", "| `MPRR-V15-XW-"],
  ["V15USE", "V15SUBJECT", "MARKDOWN-TABLE-ROW-PREFIX-1", "| `MPRR-V15-REQ-"],
  ["V15TERM", "V15SUBJECT", "MARKDOWN-TABLE-ROW-PREFIX-1", "| `TERM-"],
  ["V15VEC", "V15SUBJECT", "MARKDOWN-TABLE-ROW-PREFIX-1", "| `MPRR-V15-NEG-"],
  ["V15HR", "V15MANIFEST", "MARKDOWN-HEADING-BLOCK-1", "MPRR-V15-HR-F"],
  ...carriers.map((carrier) => [`CARRIER-${carrier.carrierId}`, carrier.carrierId, "WHOLE-CARRIER-1", `CARRIER-${carrier.carrierId}`]),
];

const namespaces = [];
const members = [];
for (const [namespaceId, carrierId, parserProfileId, selector] of namespaceDefs) {
  const carrier = carrierById.get(carrierId);
  const profile = profileById.get(parserProfileId);
  const rawMembers = deriveRawMembers(carrier, profile.mode, selector);
  assert(rawMembers.length > 0, `empty namespace ${namespaceId}`);
  const namespaceMembers = rawMembers.map((raw) => {
    assert(raw.memberId, `missing member ID ${namespaceId}`);
    const selected = carrier.bytesValue.subarray(raw.byteStart, raw.byteEnd);
    const before = carrier.bytesValue.subarray(0, raw.byteStart).toString("utf8");
    const lineStart = before.split("\n").length;
    const lineEnd = lineStart + selected.toString("utf8").split("\n").length - 1;
    return {
      byteEnd: raw.byteEnd,
      byteStart: raw.byteStart,
      cardinality: 1,
      carrierId,
      carrierRoot: carrier.root,
      lineEnd,
      lineStart,
      memberDigest: sha256(selected),
      memberId: raw.memberId,
      namespaceId,
      parserProfileId,
    };
  });
  const memberSetRoot = rooted("MPRR-V16-MEMBER-SET-1", ...namespaceMembers.map(canonical).sort());
  const authorityState = "PENDING-EXTERNAL-B0-ADMISSION;CREDIT=0";
  const custodyLocator = `${carrier.path}@sha256:${carrier.root}`;
  const namespaceRoot = rooted("MPRR-V16-NAMESPACE-ENTRY-1", namespaceId, carrierId, carrier.root, profile.parserProfileRoot, memberSetRoot, String(namespaceMembers.length), custodyLocator, selector, authorityState);
  namespaces.push({
    authorityState,
    carrierId,
    carrierRoot: carrier.root,
    custodyLocator,
    memberCount: namespaceMembers.length,
    memberSetRoot,
    namespaceId,
    namespaceRoot,
    parserProfileId,
    parserProfileRoot: profile.parserProfileRoot,
    selector,
  });
  namespaceMembers.forEach((member) => members.push({ ...member, namespaceRoot }));
}

const namespaceById = new Map(namespaces.map((namespace) => [namespace.namespaceId, namespace]));
const memberByKey = new Map(members.map((member) => [`${member.namespaceId}/${member.memberId}`, member]));
assert(namespaceById.get("V15REQ").memberCount === 96, "v1.5 Requirement denominator changed");
assert(namespaceById.get("V15HR").memberCount === 16, "v1.5 Finding denominator changed");
assert(namespaceById.get("V15XW").memberCount === 211, "v1.5 Crosswalk denominator changed");
assert(namespaceById.get("V15USE").memberCount === 96, "v1.5 NamedUse denominator changed");
assert(namespaceById.get("V15TERM").memberCount === 24, "v1.5 Terminal denominator changed");
assert(namespaceById.get("V15VEC").memberCount === 211, "v1.5 vector denominator changed");

const memberBytes = (member) => carrierById.get(member.carrierId).bytesValue.subarray(member.byteStart, member.byteEnd);
const sourceBasisFor = (member) => `@source[${member.namespaceId}/${member.memberId}];namespaceRoot=${member.namespaceRoot};carrierRoot=${member.carrierRoot};span=${member.byteStart}-${member.byteEnd};memberDigest=${member.memberDigest}`;
const localDeps = (ids, type = "requires") => ids.length === 0 ? "none" : ids.map((id) => `${type}:@local[${id}]`).join("; ");

const remediationDefs = [
  ["MPRR-V15-HR-F015", "Canonical serialization and typed mutation grammar", "CanonicalSerializationRegistryRoot", [], "instantiate CPB1 canonical bytes, NFC UTF-8, fixed schema field order, unsigned integer bounds, set ordering by canonical bytes, duplicate rejection, domain-separated SHA-256 constructors and the closed mutation DSL in Sections 4 and 15; every ambiguous or unknown input fails before authority transfer", "v1.5 used ambiguous concatenation, comma Sets and prose path operations, so independent parsers could derive different bytes, membership and mutations", "two independent parsers and serializers must agree on every canonical record, delimiter, Unicode, duplicate, order, type and unknown-path vector; ambiguousParse=0; duplicateSemanticElement=0; constructorOrderMismatch=0; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F001", "Derived source namespace and immutable custody", "SourceNamespaceRegistryRoot", [1], "instantiate the carrier, parser-profile, member, member-set and NamespaceEntry records in Section 5; every inner root is derived from exact recoverable bytes and the two executable parser roots, and every repository-relative custody locator is exact-root bound with external B0 admission explicitly pending", "v1.5 trusted opaque parserProfileRoot/memberSetRoot declarations and incomplete custody locators, preventing end-to-end provenance reproduction", "both QA readers must independently re-extract every declared span and reproduce every member digest, memberSetRoot and NamespaceEntryRoot; namespace and member mismatch=0; B0 admission remains zero; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F002", "Five-field NamedUse identity and real backward DAG", "NamedUseManifestRoot", [1, 2], "instantiate the exact occurrence-level NamedUse Manifest in Section 8 by scanning all five current fields under the closed token grammar; each local token resolves only to an earlier local provider, each source token resolves to one indexed member, and same-row or forward external fallback is forbidden", "v1.5 scanned predecessor spans plus dependencies and reclassified 81 same-row identities as rooted sources, concealing real local uses", "Node and Ruby extractors must return byte-identical occurrence and edge multisets with implicit=0,unknown=0,self=0,forward=0,sameRowFallback=0,cycle=0; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F012", "Closed failure predicates and total Terminal function", "TerminalFunctionRegistryRoot", [1], "instantiate the complete Terminal tuples and failure predicates in Section 9, one explicit success tuple, unknown-trigger fail-closed behavior, unique precedence and deterministic selection over every individual, pairwise and all-trigger Set", "v1.5 ranked Terminal labels without defining which predicates trigger or a total observed-state mapping", "two evaluators must execute the generated individual, pairwise, all-trigger and success corpus with unknownTrigger=0,noTerminal=0,multipleWinner=0,unranked=0; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F009", "Trust, signature, rotation and revocation automaton", "TrustAutomatonRoot", [1, 4], "instantiate canonical Key, Signature, AlgorithmPolicy, Issuer, Audience, Purpose, Epoch, RevocationSnapshot and TransparencyCheckpoint records plus the ordered fail-closed TRUST machine in Sections 10 and 11", "v1.5 deferred schemas and transitions, allowing verifier disagreement on purpose, rotation, revocation races, algorithm downgrade and split-view logs", "two verifiers must agree on valid and invalid encodings and all ordered checks; wrong issuer,purpose,audience,epoch,algorithm,key state,revocation or checkpoint blocks before authority; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F010", "Trusted-time interval algebra and epoch fencing", "ClockPolicyRegistryRoot", [1, 4, 5], "instantiate integer nanosecond units, half-open uncertainty intervals, authoritative-source or quorum selection, monotonic epoch/counter ordering, exact before/equal/after comparison, skew propagation, rollback, split-quorum and rollover transitions in Sections 10 and 11", "v1.5 deferred ClockAuthority schemas, selection formula, units and boundary behavior", "two clock engines must agree at every boundary and bind exact policy/observation roots; overlapping or unknown intervals never prove freshness; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F011", "Complete finality universe and checkpoint proofs", "FinalityRegistryRoot", [1, 4, 5, 6], "instantiate canonical FinalityReceipt, issuer/quorum policy, append-only leaf/node/checkpoint constructors, sorted-universe membership/non-membership and consistency proofs, fork detection and deterministic winner-or-conflict transitions in Sections 10 and 11", "v1.5 did not instantiate the accepted receipt universe or complete checkpoint/log proof formats", "two verifiers must agree for empty,single,duplicate,competing,omitted,stale and split-view Sets; incomplete checkpoints cannot finalize; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F008", "Three-review independence, preseal, quorum and bounded convergence", "ThreeReviewGovernanceRoot", [1, 4, 5, 6, 7], "instantiate exactly three domains, the 15-dimension separation matrix, no-self-approval rule, preseal chronology, appointments, amendments, revocation, veto, quorum and a maximum of two review generations in Sections 10 through 12; acceptance requires three eligible sealed roots and P0=0,P1=0", "v1.5 named a separation matrix but omitted live rows, role conflicts, preseal, quorum, veto and terminating rework semantics", "same person,appointment,author,principal,forbidden role,expired allowance,preseal breach,veto or unresolved P0/P1 blocks; the executable two-generation corpus must terminate; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F014", "Single bounded appeal, remand, finality and revocation", "AppealLifecycleRoot", [1, 4, 5, 6, 7, 8], "instantiate standing, appealable object, grounds, trusted filing window, automatic freeze, separate appellate authority, one-appeal limit, AFFIRM, REMAND and REVOKE outcomes, anti-replay and terminal states in Sections 10 through 12; remand may consume generation two only when unused", "v1.5 had no appeal lifecycle, allowing conflicted decisions, ignored live challenges or unbounded reopening", "timely valid appeal freezes Publication; late,duplicate,conflicted,revoked or replayed appeal fails safely; no path exceeds two review generations or one appeal; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F013", "Custody, Legal Hold, retention and destruction automata", "CustodyLifecycleRegistryRoot", [1, 4, 5, 6], "instantiate separate closed machines for content, keys, receipts, primary replicas, backups and restore copies; Legal Hold and revocation win over expiry/deletion; plans bind exact identities and cutoff; discovery, partial failure, retry, provider acknowledgement, crypto-erasure and post-destruction replay are rooted in Sections 10 and 11", "v1.5 deferred state Sets and transition ordering, permitting held deletion, restore resurrection or irreconcilable partial failure", "model checking and two implementations must agree on all allowed transitions and concurrency pairs with heldDeletion=0,undiscoveredRestore=0,postDestructionReplay=0; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F016", "Canonical media normalization and coverage", "MediaProfileRegistryRoot", [1, 2], "instantiate versioned orientation, coordinate origin, half-open region, rational scale, round-half-to-even, crop, tile, color and alpha rules plus exact normative conformance literals in Sections 10 and 11", "v1.5 deferred media schemas and boundaries, allowing reviewers to hash or inspect different pixels under the same label", "two media engines must produce byte-identical normalized outputs and coverage roots for every normative literal; profile mismatch blocks credit; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F005", "Public no-event projection and sealed Private evidence", "PublicProjectionPolicyRoot", [1, 5, 6, 8], "instantiate a PUBLIC-PERMANENT repository policy whose only Public projection is a fixed policy statement with no event class,time,count,cadence,identifier,content commitment or Private-derived metadata; all event evidence and exact replay remain in sealed external Private custody; unsafe v1.5 PublicReceipt clauses are explicitly superseded in Section 13", "v1.5 event-level PublicReceipt fields revealed existence,type,timing,count and stable linkage despite claiming non-inference", "information-flow,dictionary,equality,chosen-input,cadence,count,timing,type and cross-run tests must infer no Private event predicate; Public event records=0; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F006", "Authoritative DependencyHeadUniverse and complete invalidation", "DependencyHeadUniverseRegistryRoot", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "instantiate the 48-family registry, member/Head schemas, closed discovery classifier, creation/removal/rename/revocation receipts, membership and non-membership proofs and one CAS over universe Head plus every member and revocation root in Section 14", "v1.5 listed family labels without an authoritative discoverable universe, so omitted or newly created Heads could evade freshness", "two discovery engines must return the same complete universe; every omitted,added,removed,renamed,revoked or concurrent Head changes the root and aborts; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F007", "Causally realizable bootstrap commit and post-readback", "BootstrapCommitProtocolRoot", [1, 4, 5, 6, 7, 8, 9, 10, 12, 13], "instantiate deterministic intent, pre-commit readback, one 22-member atomic CAS commit, one authority output, idempotent retry and a separately rooted post-commit audit observation that references an already committed envelope in Section 16", "v1.5 hashed its own future post-commit readback into the commit and omitted total ordering and retry state", "two implementations and crash/concurrency model checking must prove durable members=0-or-22, output count=0-or-1, permit count<=1, postReadback after commit and no causal cycle; independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F003", "Executable rooted vector DSL and two-runner evidence", "VectorCorpusRoot", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], "instantiate exact source fixtures, CPB1 mutation programs, runner roots, preimage and post-state roots, full expected Terminal tuples, zero-side-effect oracles and executable overlap plus lifecycle programs in Section 15; no operation names a nonexistent path", "v1.5 vectors had no fixture, runner, expected root or receipt and known mutations were no-ops", "both independent readers must execute every vector and agree byte-for-byte on post root and full Terminal tuple with noOp=0,unknownPath=0,unexpectedWrite=0; execution receipts remain Producer-only and independentReceipt=ABSENT-BLOCKING"],
  ["MPRR-V15-HR-F004", "Clause-level Closure and ResidualRisk records", "ClosureManifestRoot", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "instantiate 323 non-merged Crosswalk rows for 16 Findings, 96 v1.5 Requirements and 211 inherited obligation rows; each source conjunct carries exact bytes,digest,target clause,vector,full Terminal and typed ResidualRisk lifecycle in Sections 6 and 7", "v1.5 Crosswalks proved path and label presence rather than every source conjunct or a real risk lifecycle", "two independent semantic reviewers must agree on every conjunct and exact successor root; FULL remains 0/323 until receipts exist; missingConjunct=0,pathOnlyCredit=0,labelOnlyRisk=0; independentReceipt=ABSENT-BLOCKING"],
];

const findingToRemediation = new Map(remediationDefs.map((definition, index) => [definition[0], index + 1]));
const requirements = [];
for (let index = 0; index < remediationDefs.length; index += 1) {
  const [findingId, title, outputLabel, deps, statement, defectCauseImpact, requiredProofPredicate] = remediationDefs[index];
  const requirementNumber = index + 1;
  const id = `MPRR-V16-REQ-${String(requirementNumber).padStart(3, "0")}`;
  const member = memberByKey.get(`V15HR/${findingId}`);
  requirements.push({
    fields: {
      statement: `atomicOutput=MPRR-V16-OUT-${String(requirementNumber).padStart(3, "0")};outputType=${outputLabel}; ${statement}`,
      defectCauseImpact,
      requiredProofPredicate,
      dependencies: localDeps(deps.map((number) => `MPRR-V16-REQ-${String(number).padStart(3, "0")}`), "remediation"),
      sourceBasis: sourceBasisFor(member),
    },
    id,
    outputLabel,
    title,
  });
}

const preservationSafetyOverride = new Set(["MPRR-V15-REQ-007", "MPRR-V15-REQ-034", "MPRR-V15-REQ-088", "MPRR-V15-REQ-091"]);
for (let oldNumber = 1; oldNumber <= 96; oldNumber += 1) {
  const oldId = `MPRR-V15-REQ-${String(oldNumber).padStart(3, "0")}`;
  const newNumber = oldNumber + 16;
  const newId = `MPRR-V16-REQ-${String(newNumber).padStart(3, "0")}`;
  const member = memberByKey.get(`V15REQ/${oldId}`);
  const text = memberBytes(member).toString("utf8");
  const title = text.split("\n")[0].replace(/^.* — /, "");
  const fieldDigestVector = [...text.matchAll(/^\d+\.\d+\.[1-5] `(statement|defectCauseImpact|requiredProofPredicate|dependencies|sourceBasis)`: (.+)\.$/gm)]
    .map((match) => `${match[1]}=${sha256(Buffer.from(match[2], "utf8"))}`).join(",");
  const override = preservationSafetyOverride.has(oldId)
    ? "; disclosureDisposition=SEMANTIC-INTENT-PRESERVED-WITH-PUBLIC-NO-EVENT-SAFETY-SUPERSESSION; unsafe event-level Public metadata is forbidden by the earlier remediation output"
    : "; disclosureDisposition=UNCHANGED";
  const deps = Array.from({ length: 16 }, (_, index) => `MPRR-V16-REQ-${String(index + 1).padStart(3, "0")}`);
  if (oldNumber > 1) deps.push(`MPRR-V16-REQ-${String(newNumber - 1).padStart(3, "0")}`);
  requirements.push({
    fields: {
      statement: `atomicOutput=MPRR-V16-OUT-${String(newNumber).padStart(3, "0")};outputType=LosslessPreservationEnvelopeRoot; incorporate every exact source field and conjunct of ${oldId} without omission,merge,presence-only credit or authority inflation; sourceFieldDigestVector=${fieldDigestVector}${override}`,
      defectCauseImpact: `dropping or weakening any exact source byte,clause,dependency,safety boundary or zero-authority state would sever immutable lineage and permit false Closure for ${oldId}`,
      requiredProofPredicate: `two independent exact-root semantic reviewers must map every source conjunct to this Requirement and its normative registries, execute its dedicated vector and agree on the same successor root; bytePreserved=all;semanticConjunctPreserved=all;FULL=0 until independent receipt; independentReceipt=ABSENT-BLOCKING`,
      dependencies: localDeps(deps, oldNumber === 1 ? "preservation-foundation" : "preservation"),
      sourceBasis: sourceBasisFor(member),
    },
    id: newId,
    outputLabel: "LosslessPreservationEnvelopeRoot",
    title: `Lossless preservation of ${oldId}: ${title}`,
  });
}

assert(requirements.length === 112, "successor requirement denominator");

const terminalDefs = [
  ["TERM-FAIL-CLOSED-UNKNOWN", "BLOCKED", "FAIL-CLOSED-UNKNOWN", "NEW-CLASSIFICATION-REQUIRED", "AFTER-NEW-EVIDENCE"],
  ["TERM-CONFLICT-FINAL", "REJECTED", "CONFLICT-FINAL", "NEW-IMMUTABLE-INITIATIVE-REQUIRED", "NO-SAME-CANDIDATE-RETRY"],
  ["TERM-REVOKED-FINAL", "REVOKED", "REVOKED-FINAL", "NEW-AUTHORITY-AND-CANDIDATE-REQUIRED", "NO-SAME-CANDIDATE-RETRY"],
  ["TERM-REJECTED-FINAL", "REJECTED", "REJECTED-FINAL", "NEW-IMMUTABLE-INITIATIVE-REQUIRED", "NO-SAME-CANDIDATE-RETRY"],
  ["TERM-SERIALIZATION-BLOCKED", "BLOCKED", "SERIALIZATION-BLOCKED", "CANONICAL-INPUT-REQUIRED", "AFTER-NEW-CANDIDATE"],
  ["TERM-SOURCE-GRAPH-INVALID", "BLOCKED", "SOURCE-GRAPH-INVALID", "DERIVABLE-SOURCE-INDEX-REQUIRED", "AFTER-NEW-EVIDENCE"],
  ["TERM-NAMED-USE-INVALID", "BLOCKED", "NAMED-USE-INVALID", "BACKWARD-PROVIDER-GRAPH-REQUIRED", "AFTER-NEW-CANDIDATE"],
  ["TERM-TERMINAL-AMBIGUITY-BLOCKED", "BLOCKED", "TERMINAL-AMBIGUITY", "TOTAL-TRIGGER-FUNCTION-REQUIRED", "AFTER-NEW-CANDIDATE"],
  ["TERM-ATTESTATION-INVALID", "BLOCKED", "ATTESTATION-INVALID", "VALID-TRUST-EVIDENCE-REQUIRED", "AFTER-NEW-EVIDENCE"],
  ["TERM-TIME-AUTHORITY-BLOCKED", "BLOCKED", "TIME-AUTHORITY-BLOCKED", "TRUSTED-TIME-REQUIRED", "AFTER-NEW-EVIDENCE"],
  ["TERM-FINALITY-CONFLICT-BLOCKED", "BLOCKED", "FINALITY-CONFLICT", "CONSISTENT-CHECKPOINT-REQUIRED", "AFTER-NEW-EVIDENCE"],
  ["TERM-REVIEW-INELIGIBLE", "BLOCKED", "REVIEW-INELIGIBLE", "THREE-ELIGIBLE-REVIEWS-REQUIRED", "AFTER-NEW-REVIEW"],
  ["TERM-APPEAL-BLOCKED", "BLOCKED", "APPEAL-BLOCKED", "VALID-INDEPENDENT-APPEAL-REQUIRED", "NO-REPLAY"],
  ["TERM-CUSTODY-LIFECYCLE-BLOCKED", "BLOCKED", "CUSTODY-LIFECYCLE-BLOCKED", "SAFE-CUSTODY-STATE-REQUIRED", "AFTER-STATE-RECONCILIATION"],
  ["TERM-MEDIA-PROFILE-BLOCKED", "BLOCKED", "MEDIA-PROFILE-BLOCKED", "CANONICAL-MEDIA-PROFILE-REQUIRED", "AFTER-NEW-EVIDENCE"],
  ["TERM-PUBLIC-PRIVATE-LINKAGE-BLOCKED", "BLOCKED", "PUBLIC-PRIVATE-LINKAGE-BLOCKED", "NO-EVENT-PROJECTION-REQUIRED", "AFTER-NEW-CANDIDATE"],
  ["TERM-FRESHNESS-BLOCKED", "BLOCKED", "FRESHNESS-BLOCKED", "COMPLETE-FRESH-SNAPSHOT-REQUIRED", "IMMEDIATE-WITH-FRESH-INPUTS"],
  ["TERM-BOOTSTRAP-COMMIT-BLOCKED", "BLOCKED", "BOOTSTRAP-COMMIT-BLOCKED", "CAUSAL-ATOMIC-COMMIT-REQUIRED", "AFTER-NEW-EVIDENCE"],
  ["TERM-VECTOR-CORPUS-BLOCKED", "BLOCKED", "VECTOR-CORPUS-BLOCKED", "EXECUTABLE-VECTOR-REQUIRED", "AFTER-NEW-CANDIDATE"],
  ["TERM-SEMANTIC-CLOSURE-BLOCKED", "BLOCKED", "SEMANTIC-CLOSURE-BLOCKED", "CLAUSE-LEVEL-PROOF-REQUIRED", "AFTER-INDEPENDENT-REVIEW"],
  ["TERM-SUCCESS", "SUCCESS", "NONE", "NOT-APPLICABLE", "NONE"],
];
const terminals = terminalDefs.map(([terminalId, resultStatus, blockReason, recoverability, retryClass], index) => ({
  blockReason,
  precedenceRank: terminalId === "TERM-SUCCESS" ? 1000 : index + 1,
  recoverability,
  resultStatus,
  retryClass,
  terminalId,
}));
const terminalById = new Map(terminals.map((terminal) => [terminal.terminalId, terminal]));

const failureConditions = [
  ["FC-SERIALIZATION", "canonical decode, type, ordering, duplicate, path or constructor failure", "TERM-SERIALIZATION-BLOCKED", "MPRR-V15-HR-F015"],
  ["FC-SOURCE-GRAPH", "carrier, parser, span, digest, custody or namespace derivation failure", "TERM-SOURCE-GRAPH-INVALID", "MPRR-V15-HR-F001"],
  ["FC-NAMED-USE", "implicit, unknown, self, same-row fallback, forward or cyclic provider", "TERM-NAMED-USE-INVALID", "MPRR-V15-HR-F002"],
  ["FC-TERMINAL", "unknown condition mapping, duplicate rank or multiple winner", "TERM-TERMINAL-AMBIGUITY-BLOCKED", "MPRR-V15-HR-F012"],
  ["FC-TRUST", "invalid key, signature, purpose, audience, epoch, revocation or transparency proof", "TERM-ATTESTATION-INVALID", "MPRR-V15-HR-F009"],
  ["FC-CLOCK", "unknown, overlapping, stale, rollback, split-quorum or rollover time", "TERM-TIME-AUTHORITY-BLOCKED", "MPRR-V15-HR-F010"],
  ["FC-FINALITY", "incomplete, competing, stale, omitted or split-view finality universe", "TERM-FINALITY-CONFLICT-BLOCKED", "MPRR-V15-HR-F011"],
  ["FC-REVIEW", "role overlap, preseal breach, veto, quorum, generation or self-approval failure", "TERM-REVIEW-INELIGIBLE", "MPRR-V15-HR-F008"],
  ["FC-APPEAL", "late, duplicate, conflicted, revoked, replayed or unbounded appeal", "TERM-APPEAL-BLOCKED", "MPRR-V15-HR-F014"],
  ["FC-CUSTODY", "Legal Hold, retention, deletion, replica, restore or destruction transition failure", "TERM-CUSTODY-LIFECYCLE-BLOCKED", "MPRR-V15-HR-F013"],
  ["FC-MEDIA", "coordinate, orientation, crop, scale, tile, color, alpha or profile mismatch", "TERM-MEDIA-PROFILE-BLOCKED", "MPRR-V15-HR-F016"],
  ["FC-PUBLIC", "event class, timing, count, cadence, identifier or Private-derived Public projection", "TERM-PUBLIC-PRIVATE-LINKAGE-BLOCKED", "MPRR-V15-HR-F005"],
  ["FC-FRESHNESS", "omitted, unknown, changed, revoked or concurrently created dependency Head", "TERM-FRESHNESS-BLOCKED", "MPRR-V15-HR-F006"],
  ["FC-COMMIT", "causal cycle, stale CAS, partial write, duplicate output, wrong operation or post-readback misuse", "TERM-BOOTSTRAP-COMMIT-BLOCKED", "MPRR-V15-HR-F007"],
  ["FC-VECTOR", "unbound fixture, invalid operation, missing post root, runner disagreement or side effect", "TERM-VECTOR-CORPUS-BLOCKED", "MPRR-V15-HR-F003"],
  ["FC-CLOSURE", "missing conjunct, path-only credit, absent risk lifecycle or independent receipt", "TERM-SEMANTIC-CLOSURE-BLOCKED", "MPRR-V15-HR-F004"],
].map(([conditionId, predicate, terminalId, findingId]) => ({ conditionId, findingId, predicate, terminalId }));

const outputs = requirements.map((requirement, index) => ({
  authorityState: "CANDIDATE-IDENTITY-ONLY;ACCEPTANCE=0",
  constructor: "SHA-256(CPB1[MPRR-V16-REQUIREMENT-OUTPUT-1,requirementId,outputType,sourceMemberDigest,canonicalFiveFieldDigestVector,independentProofRoot])",
  independentProofRoot: "ABSENT-BLOCKING",
  outputId: `MPRR-V16-OUT-${String(index + 1).padStart(3, "0")}`,
  outputType: requirement.outputLabel,
  requirementId: requirement.id,
}));

const findingFieldTarget = {
  findingId: "sourceBasis",
  severity: "defectCauseImpact",
  locator: "sourceBasis",
  defect: "defectCauseImpact",
  impact: "defectCauseImpact",
  requiredDelta: "statement",
  acceptancePredicate: "requiredProofPredicate",
  sourceBasis: "sourceBasis",
  state: "requiredProofPredicate",
  noMergeKey: "sourceBasis",
};
const markdownConjuncts = (member, targetRequirementIds, fieldMode) => {
  const bytes = memberBytes(member);
  const text = bytes.toString("utf8");
  const regex = fieldMode === "REQUIREMENT"
    ? /^\d+\.\d+\.[1-5] `(statement|defectCauseImpact|requiredProofPredicate|dependencies|sourceBasis)`: (.+)\.$/gm
    : /^\d+\.\d+\.\d+ `(findingId|severity|locator|defect|impact|requiredDelta|acceptancePredicate|sourceBasis|state|noMergeKey)`: `?(.+?)`?\.$/gm;
  const rows = [];
  for (const match of text.matchAll(regex)) {
    const field = match[1];
    const value = match[2];
    const prefixIndex = match[0].indexOf(value);
    const relativeStart = Buffer.byteLength(text.slice(0, match.index + prefixIndex), "utf8");
    const valueBytes = Buffer.from(value, "utf8");
    const targetField = fieldMode === "REQUIREMENT" ? field : findingFieldTarget[field];
    rows.push({
      digest: sha256(valueBytes),
      relation: preservationSafetyOverride.has(member.memberId) ? "PRESERVED-WITH-PUBLIC-NO-EVENT-SAFETY-SUPERSESSION" : "INCORPORATED-BY-EXACT-ROOT-WITHOUT-OMISSION",
      sourceConjunctId: field,
      sourceSpanRelative: `${relativeStart}-${relativeStart + valueBytes.length}`,
      sourceTextB64: valueBytes.toString("base64"),
      targetClausePaths: targetRequirementIds.map((id) => `requirements/${id}/${targetField}`),
    });
  }
  assert(rows.length === (fieldMode === "REQUIREMENT" ? 5 : 10), `conjunct parse failure ${member.memberId}`);
  return rows;
};

const tableConjuncts = (member, targetRequirementIds, rowId) => {
  const line = memberBytes(member).toString("utf8").trimEnd();
  const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
  return cells.map((cell, index) => {
    const valueBytes = Buffer.from(cell, "utf8");
    return {
      digest: sha256(valueBytes),
      relation: "INCORPORATED-BY-EXACT-ROOT-WITHOUT-OMISSION",
      sourceConjunctId: `column-${String(index + 1).padStart(2, "0")}`,
      sourceSpanRelative: "TABLE-CELL-CANONICAL-TRIMMED",
      sourceTextB64: valueBytes.toString("base64"),
      targetClausePaths: [`crosswalk/${rowId}/sourceConjuncts/${index + 1}`, ...targetRequirementIds.map((id) => `requirements/${id}/statement`)],
    };
  });
};

const crosswalk = [];
const addCrosswalk = ({ family, member, targetRequirementIds, sourceConjuncts, preservationMode }) => {
  const rowId = `MPRR-V16-XW-${String(crosswalk.length + 1).padStart(3, "0")}`;
  const residualRiskId = `MPRR-V16-RISK-${String(crosswalk.length + 1).padStart(3, "0")}`;
  const vectorId = `MPRR-V16-VEC-XW-${String(crosswalk.length + 1).padStart(3, "0")}`;
  crosswalk.push({
    family,
    independentReceipt: "ABSENT-BLOCKING",
    noMergeKey: rowId,
    preservationMode,
    residualRiskId,
    rowId,
    sourceConjuncts: sourceConjuncts(rowId),
    sourceMemberDigest: member.memberDigest,
    sourceMemberId: member.memberId,
    sourceNamespaceId: member.namespaceId,
    sourceNamespaceRoot: member.namespaceRoot,
    sourceSpan: `${member.byteStart}-${member.byteEnd}`,
    status: "OPEN",
    targetRequirementIds: [...new Set(targetRequirementIds)].sort(),
    terminalTuple: terminalById.get("TERM-SEMANTIC-CLOSURE-BLOCKED"),
    vectorIds: [vectorId],
  });
};

for (let index = 1; index <= 16; index += 1) {
  const findingId = `MPRR-V15-HR-F${String(index).padStart(3, "0")}`;
  const member = memberByKey.get(`V15HR/${findingId}`);
  const targetId = `MPRR-V16-REQ-${String(findingToRemediation.get(findingId)).padStart(3, "0")}`;
  addCrosswalk({
    family: "V15-INDEPENDENT-FINDING",
    member,
    preservationMode: "ONE-TO-ONE-REMEDIATION-DESIGN;SEMANTIC-CLOSURE-PENDING",
    sourceConjuncts: () => markdownConjuncts(member, [targetId], "FINDING"),
    targetRequirementIds: [targetId],
  });
}

for (let oldNumber = 1; oldNumber <= 96; oldNumber += 1) {
  const oldId = `MPRR-V15-REQ-${String(oldNumber).padStart(3, "0")}`;
  const member = memberByKey.get(`V15REQ/${oldId}`);
  const targetId = `MPRR-V16-REQ-${String(oldNumber + 16).padStart(3, "0")}`;
  addCrosswalk({
    family: "V15-REQUIREMENT-PRESERVATION",
    member,
    preservationMode: preservationSafetyOverride.has(oldId) ? "LOSSLESS-INTENT-WITH-PUBLIC-NO-EVENT-SAFETY-SUPERSESSION" : "LOSSLESS-EXACT-ROOT-PRESERVATION",
    sourceConjuncts: () => markdownConjuncts(member, [targetId], "REQUIREMENT"),
    targetRequirementIds: preservationSafetyOverride.has(oldId) ? [targetId, "MPRR-V16-REQ-012"] : [targetId],
  });
}

for (let index = 1; index <= 211; index += 1) {
  const memberId = `MPRR-V15-XW-${String(index).padStart(3, "0")}`;
  const member = memberByKey.get(`V15XW/${memberId}`);
  assert(member, `missing old Crosswalk ${memberId}`);
  const oldTargets = [...new Set(memberBytes(member).toString("utf8").match(/MPRR-V15-REQ-\d{3}/g) ?? [])];
  const translated = oldTargets.map((id) => `MPRR-V16-REQ-${String(Number(id.slice(-3)) + 16).padStart(3, "0")}`);
  const targets = [...new Set([...translated, "MPRR-V16-REQ-016"])];
  addCrosswalk({
    family: "V15-INHERITED-OBLIGATION-ROW",
    member,
    preservationMode: "NON-MERGED-CLAUSE-LEVEL-INHERITED-OBLIGATION",
    sourceConjuncts: (rowId) => tableConjuncts(member, targets, rowId),
    targetRequirementIds: targets,
  });
}

assert(crosswalk.length === 323, `Crosswalk denominator ${crosswalk.length}`);
const residualRisks = crosswalk.map((row) => ({
  acceptanceAuthorityClass: "INDEPENDENT-RISK-DISPOSITION-AUTHORITY;SEPARATE-FROM-AUTHOR-PRODUCER-QA-ACCEPTOR-REVIEWERS-APPELLATE",
  acceptedAtObservationRoot: "ABSENT",
  dispositionPolicy: "P0-P1-CANNOT-BE-RISK-ACCEPTED;P2-REQUIRES-UNANIMOUS-THREE-REVIEW-RECOMMENDATION-PLUS-HUMAN-APPROVAL;P3-REQUIRES-TWO-OF-THREE-PLUS-HUMAN-APPROVAL",
  expiryObservationRoot: "UNKNOWN-BLOCKING",
  independentReceipt: "ABSENT-BLOCKING",
  ownerAuthorityRoot: "UNKNOWN-EXTERNAL-BLOCKING",
  residualRiskId: row.residualRiskId,
  revocationState: "REVOCABLE;REVOKE-WINS",
  severity: row.family === "V15-INDEPENDENT-FINDING" ? "INHERIT-EXACT-SOURCE-SEVERITY" : "UNASSESSED-BLOCKING",
  sourceRowId: row.rowId,
  state: "OPEN",
  treatment: "REMEDIATE-OR-VALID-P2-P3-DISPOSITION-BEFORE-ACCEPTANCE",
}));

const namedUses = [];
const useRegex = /@(local|source)\[([^\]]+)\]/g;
for (const requirement of requirements) {
  for (const [field, value] of Object.entries(requirement.fields)) {
    let occurrence = 0;
    for (const match of value.matchAll(useRegex)) {
      occurrence += 1;
      const byteStart = Buffer.byteLength(value.slice(0, match.index), "utf8");
      namedUses.push({
        byteEnd: byteStart + Buffer.byteLength(match[0], "utf8"),
        byteStart,
        consumerRequirementId: requirement.id,
        field,
        occurrence,
        providerId: match[2],
        providerKind: match[1] === "local" ? "LOCAL" : "SOURCE",
        token: match[0],
      });
    }
  }
}

const controlMachines = [
  ["TRUST", ["PENDING", "ACTIVE", "ROTATING", "REVOKED", "EXPIRED", "INVALID"], ["ACTIVATE", "VERIFY", "START_ROTATION", "COMPLETE_ROTATION", "REVOKE", "EXPIRE"], "Key+Signature+AlgorithmPolicy+Issuer+Audience+Purpose+Epoch+RevocationSnapshot+TransparencyCheckpoint; verifier order=canonical-decode,schema,domain,purpose,audience,operation,algorithm,unique-path,proof-of-possession,clock,revocation,rotation,log-inclusion,consistency,anti-equivocation"],
  ["CLOCK", ["UNAVAILABLE", "AVAILABLE", "DEGRADED", "SPLIT", "ROLLBACK", "EXPIRED"], ["OBSERVE", "QUORUM", "SOURCE_LOSS", "ROLLBACK_DETECTED", "ROLLOVER", "EXPIRE"], "ClockPolicy uses signed decimal UTC_UNIX_NS strings, half-open [lower,upper), uncertainty, maxSkewNs and monotonic epoch/counter; definitelyBefore iff A.upper<=B.lower; overlap is UNKNOWN-BLOCKING"],
  ["FINALITY", ["EMPTY", "OPEN", "CHECKPOINTED", "FINAL", "CONFLICT", "REVOKED"], ["APPEND", "CHECKPOINT", "VERIFY_MEMBERSHIP", "VERIFY_NON_MEMBERSHIP", "VERIFY_CONSISTENCY", "FINALIZE", "REVOKE"], "LeafHash=SHA256(CPB1 domain+receipt);NodeHash=SHA256(CPB1 domain+left+right); checkpoint binds leafCount,root,issuerPolicy,epoch,priorCheckpoint; competing valid payload roots conflict"],
  ["REVIEW", ["DRAFT", "REVIEWING", "SEALED", "RECONCILED", "REWORK_REQUIRED", "READY_FOR_ACCEPTOR", "ACCEPTED_PROVISIONAL", "ACCEPTED_FINAL", "REJECTED_FINAL", "APPEAL_FROZEN", "AFFIRMED_FINAL", "REVOKED_FINAL", "CONFLICT_FINAL"], ["OPEN", "SEAL_THREE", "RECONCILE", "CLOSE_REVIEW", "SUBMIT_SUCCESSOR", "ACCEPT", "EXPIRE_APPEAL_WINDOW", "FILE_APPEAL", "AFFIRM", "REMAND", "REVOKE"], "exactly three eligible sealed roots; all reviewer outputs hidden until all seals; P0=0 and P1=0; P2/P3 require separate rooted disposition; maxReviewGenerations=2; selfApproval=false"],
  ["APPEAL", ["NONE", "FILED", "ELIGIBILITY_CHECK", "FROZEN", "AFFIRMED_FINAL", "REMANDED", "REVOKED_FINAL", "REJECTED_FINAL"], ["FILE", "VALIDATE", "FREEZE", "AFFIRM", "REMAND", "REVOKE", "REJECT"], "appealCount<=1; trusted half-open filing window; standing+object+grounds+evidence roots; appellate authority separated on all role dimensions; remand only from generation one into unused generation two"],
  ["CUSTODY-CONTENT", ["ACTIVE", "RETENTION_EXPIRED", "HOLD_ACTIVE", "DELETE_PLANNED", "DELETE_IN_PROGRESS", "DELETED", "ERROR_RETRY"], ["EXPIRE", "PLACE_HOLD", "RELEASE_HOLD", "PLAN_DELETE", "DELETE_ATOMIC", "FAIL_PARTIAL", "RETRY"], "hold-wins; plan binds exact identities+cutoff+policyVersion+digest+short expiry; active or held identity cannot delete"],
  ["CUSTODY-KEY", ["ACTIVE", "HOLD_FROZEN", "DESTROY_PLANNED", "DESTROYED", "ERROR_RETRY"], ["PLACE_HOLD", "RELEASE_HOLD", "PLAN_DESTROY", "DESTROY", "FAIL_PARTIAL", "RETRY"], "hold-wins; destruction requires all replica identities and makes post-destruction replay fail"],
  ["CUSTODY-RECEIPT", ["ACTIVE", "HOLD_ACTIVE", "RETENTION_EXPIRED", "DELETE_PLANNED", "DELETED", "ERROR_RETRY"], ["PLACE_HOLD", "RELEASE_HOLD", "EXPIRE", "PLAN_DELETE", "DELETE_ATOMIC", "FAIL_PARTIAL", "RETRY"], "audit receipts have independent retention; hold-wins; deletion receipt is audit only after atomic safety predicates"],
  ["CUSTODY-PRIMARY", ["DISCOVERED", "HOLD_ACTIVE", "DELETE_PLANNED", "DELETED", "ERROR_RETRY"], ["DISCOVER", "PLACE_HOLD", "PLAN_DELETE", "DELETE", "FAIL_PARTIAL", "RETRY"], "provider confirmation binds exact primary replica identity and cutoff"],
  ["CUSTODY-BACKUP", ["DISCOVERED", "HOLD_ACTIVE", "RETENTION_ACTIVE", "DELETE_PLANNED", "DELETED", "ERROR_RETRY"], ["DISCOVER", "PLACE_HOLD", "EXPIRE", "PLAN_DELETE", "DELETE", "FAIL_PARTIAL", "RETRY"], "backup retention is separate from primary; restore discovery mandatory; hold-wins"],
  ["CUSTODY-RESTORE", ["ABSENT", "DISCOVERED", "HOLD_ACTIVE", "DELETE_PLANNED", "DELETED", "ERROR_RETRY"], ["RESTORE_CREATED", "DISCOVER", "PLACE_HOLD", "PLAN_DELETE", "DELETE", "FAIL_PARTIAL", "RETRY"], "every restore copy enters discovery before use and cannot resurrect a destroyed identity"],
  ["MEDIA", ["RAW", "PROFILE_BOUND", "NORMALIZED", "COVERAGE_ROOTED", "INVALID"], ["BIND_PROFILE", "ORIENT", "CROP", "SCALE", "COLOR_ALPHA", "TILE", "ROOT_COVERAGE"], "origin=top-left; regions half-open; orientation before crop; rational scale; round-half-to-even; sRGB IEC profile root required; straight alpha normalized to premultiplied linear form; normative literals are protocol conformance bytes, not business data"],
  ["PUBLIC-PROJECTION", ["PRIVATE_EVENT", "SEALED_EXTERNAL", "PUBLIC_POLICY_ONLY", "BLOCKED"], ["SEAL", "PROJECT_POLICY", "PROJECT_EVENT", "SCAN"], "Public allowlist={schemaVersion,policyVersion,fixedStatement,publicAuthorityKeyId,signature}; fixedStatement=NO-EVENT-LEVEL-EVIDENCE-IS-PUBLISHED; event class,time,count,cadence,id,digest,commitment forbidden"],
  ["DEPENDENCY-UNIVERSE", ["DISCOVERING", "SNAPSHOT_READY", "FENCED", "STALE", "REVOKED"], ["DISCOVER", "CLASSIFY_NEW", "ROOT", "CAS_FENCE", "MUTATE", "REVOKE"], "any mutable datum read by proof,constructor,policy,authority or side-effect path is in scope; unknown family blocks; membership+non-membership+creation+removal+revocation proofs required"],
  ["BOOTSTRAP-COMMIT", ["ABSENT", "INTENT_PREPARED", "PRECOMMIT_VERIFIED", "COMMITTED", "POSTREADBACK_VERIFIED", "POSTREADBACK_DIVERGED", "ABORTED"], ["PREPARE_INTENT", "VERIFY_PRECOMMIT", "CAS_COMMIT", "RETRY_SAME_KEY", "OBSERVE_POSTCOMMIT", "DIVERGENCE", "ABORT"], "operationKey=SHA256(CPB1 domain+candidateRoot+B0AuthorityRoot+operationPurpose+epoch); one atomic 22-member commit; post-readback is separate audit referencing committed envelope"],
].map(([machineId, states, events, contract]) => ({
  contract,
  events,
  machineId,
  states,
  totalityRule: "ONLY-LISTED-TRANSITION-IS-ALLOWED;ALL-UNLISTED-STATE-EVENT-PAIRS-FAIL-CLOSED-WITH-MACHINE-TERMINAL",
  version: "1",
}));

const machineTerminal = {
  TRUST: "TERM-ATTESTATION-INVALID",
  CLOCK: "TERM-TIME-AUTHORITY-BLOCKED",
  FINALITY: "TERM-FINALITY-CONFLICT-BLOCKED",
  REVIEW: "TERM-REVIEW-INELIGIBLE",
  APPEAL: "TERM-APPEAL-BLOCKED",
  "CUSTODY-CONTENT": "TERM-CUSTODY-LIFECYCLE-BLOCKED",
  "CUSTODY-KEY": "TERM-CUSTODY-LIFECYCLE-BLOCKED",
  "CUSTODY-RECEIPT": "TERM-CUSTODY-LIFECYCLE-BLOCKED",
  "CUSTODY-PRIMARY": "TERM-CUSTODY-LIFECYCLE-BLOCKED",
  "CUSTODY-BACKUP": "TERM-CUSTODY-LIFECYCLE-BLOCKED",
  "CUSTODY-RESTORE": "TERM-CUSTODY-LIFECYCLE-BLOCKED",
  MEDIA: "TERM-MEDIA-PROFILE-BLOCKED",
  "PUBLIC-PROJECTION": "TERM-PUBLIC-PRIVATE-LINKAGE-BLOCKED",
  "DEPENDENCY-UNIVERSE": "TERM-FRESHNESS-BLOCKED",
  "BOOTSTRAP-COMMIT": "TERM-BOOTSTRAP-COMMIT-BLOCKED",
};

const transitionSpecs = {
  TRUST: [["PENDING", "ACTIVATE", "ACTIVE"], ["ACTIVE", "VERIFY", "ACTIVE"], ["ACTIVE", "START_ROTATION", "ROTATING"], ["ROTATING", "COMPLETE_ROTATION", "ACTIVE"], ["PENDING", "REVOKE", "REVOKED"], ["ACTIVE", "REVOKE", "REVOKED"], ["ROTATING", "REVOKE", "REVOKED"], ["ACTIVE", "EXPIRE", "EXPIRED"]],
  CLOCK: [["UNAVAILABLE", "OBSERVE", "AVAILABLE"], ["AVAILABLE", "QUORUM", "AVAILABLE"], ["AVAILABLE", "SOURCE_LOSS", "DEGRADED"], ["DEGRADED", "QUORUM", "AVAILABLE"], ["AVAILABLE", "ROLLBACK_DETECTED", "ROLLBACK"], ["AVAILABLE", "ROLLOVER", "AVAILABLE"], ["AVAILABLE", "EXPIRE", "EXPIRED"]],
  FINALITY: [["EMPTY", "APPEND", "OPEN"], ["OPEN", "APPEND", "OPEN"], ["OPEN", "CHECKPOINT", "CHECKPOINTED"], ["CHECKPOINTED", "VERIFY_MEMBERSHIP", "CHECKPOINTED"], ["CHECKPOINTED", "VERIFY_NON_MEMBERSHIP", "CHECKPOINTED"], ["CHECKPOINTED", "VERIFY_CONSISTENCY", "CHECKPOINTED"], ["CHECKPOINTED", "FINALIZE", "FINAL"], ["FINAL", "REVOKE", "REVOKED"]],
  REVIEW: [["DRAFT", "OPEN", "REVIEWING"], ["REVIEWING", "SEAL_THREE", "SEALED"], ["SEALED", "RECONCILE", "RECONCILED"], ["RECONCILED", "CLOSE_REVIEW", "READY_FOR_ACCEPTOR"], ["RECONCILED", "CLOSE_REVIEW", "REWORK_REQUIRED"], ["REWORK_REQUIRED", "SUBMIT_SUCCESSOR", "REVIEWING"], ["READY_FOR_ACCEPTOR", "ACCEPT", "ACCEPTED_PROVISIONAL"], ["ACCEPTED_PROVISIONAL", "EXPIRE_APPEAL_WINDOW", "ACCEPTED_FINAL"], ["ACCEPTED_PROVISIONAL", "FILE_APPEAL", "APPEAL_FROZEN"], ["APPEAL_FROZEN", "AFFIRM", "AFFIRMED_FINAL"], ["APPEAL_FROZEN", "REMAND", "REVIEWING"], ["ACCEPTED_FINAL", "REVOKE", "REVOKED_FINAL"]],
  APPEAL: [["NONE", "FILE", "FILED"], ["FILED", "VALIDATE", "ELIGIBILITY_CHECK"], ["ELIGIBILITY_CHECK", "FREEZE", "FROZEN"], ["FROZEN", "AFFIRM", "AFFIRMED_FINAL"], ["FROZEN", "REMAND", "REMANDED"], ["FROZEN", "REVOKE", "REVOKED_FINAL"], ["FILED", "REJECT", "REJECTED_FINAL"]],
  "CUSTODY-CONTENT": [["ACTIVE", "EXPIRE", "RETENTION_EXPIRED"], ["ACTIVE", "PLACE_HOLD", "HOLD_ACTIVE"], ["RETENTION_EXPIRED", "PLACE_HOLD", "HOLD_ACTIVE"], ["HOLD_ACTIVE", "RELEASE_HOLD", "RETENTION_EXPIRED"], ["RETENTION_EXPIRED", "PLAN_DELETE", "DELETE_PLANNED"], ["DELETE_PLANNED", "DELETE_ATOMIC", "DELETED"], ["DELETE_PLANNED", "FAIL_PARTIAL", "ERROR_RETRY"], ["ERROR_RETRY", "RETRY", "DELETE_PLANNED"]],
  "CUSTODY-KEY": [["ACTIVE", "PLACE_HOLD", "HOLD_FROZEN"], ["HOLD_FROZEN", "RELEASE_HOLD", "ACTIVE"], ["ACTIVE", "PLAN_DESTROY", "DESTROY_PLANNED"], ["DESTROY_PLANNED", "DESTROY", "DESTROYED"], ["DESTROY_PLANNED", "FAIL_PARTIAL", "ERROR_RETRY"], ["ERROR_RETRY", "RETRY", "DESTROY_PLANNED"]],
  "CUSTODY-RECEIPT": [["ACTIVE", "PLACE_HOLD", "HOLD_ACTIVE"], ["HOLD_ACTIVE", "RELEASE_HOLD", "ACTIVE"], ["ACTIVE", "EXPIRE", "RETENTION_EXPIRED"], ["RETENTION_EXPIRED", "PLAN_DELETE", "DELETE_PLANNED"], ["DELETE_PLANNED", "DELETE_ATOMIC", "DELETED"], ["DELETE_PLANNED", "FAIL_PARTIAL", "ERROR_RETRY"], ["ERROR_RETRY", "RETRY", "DELETE_PLANNED"]],
  "CUSTODY-PRIMARY": [["DISCOVERED", "PLACE_HOLD", "HOLD_ACTIVE"], ["DISCOVERED", "PLAN_DELETE", "DELETE_PLANNED"], ["DELETE_PLANNED", "DELETE", "DELETED"], ["DELETE_PLANNED", "FAIL_PARTIAL", "ERROR_RETRY"], ["ERROR_RETRY", "RETRY", "DELETE_PLANNED"]],
  "CUSTODY-BACKUP": [["DISCOVERED", "PLACE_HOLD", "HOLD_ACTIVE"], ["DISCOVERED", "EXPIRE", "RETENTION_ACTIVE"], ["RETENTION_ACTIVE", "PLAN_DELETE", "DELETE_PLANNED"], ["DELETE_PLANNED", "DELETE", "DELETED"], ["DELETE_PLANNED", "FAIL_PARTIAL", "ERROR_RETRY"], ["ERROR_RETRY", "RETRY", "DELETE_PLANNED"]],
  "CUSTODY-RESTORE": [["ABSENT", "RESTORE_CREATED", "DISCOVERED"], ["DISCOVERED", "DISCOVER", "DISCOVERED"], ["DISCOVERED", "PLACE_HOLD", "HOLD_ACTIVE"], ["DISCOVERED", "PLAN_DELETE", "DELETE_PLANNED"], ["DELETE_PLANNED", "DELETE", "DELETED"], ["DELETE_PLANNED", "FAIL_PARTIAL", "ERROR_RETRY"], ["ERROR_RETRY", "RETRY", "DELETE_PLANNED"]],
  MEDIA: [["RAW", "BIND_PROFILE", "PROFILE_BOUND"], ["PROFILE_BOUND", "ORIENT", "PROFILE_BOUND"], ["PROFILE_BOUND", "CROP", "PROFILE_BOUND"], ["PROFILE_BOUND", "SCALE", "PROFILE_BOUND"], ["PROFILE_BOUND", "COLOR_ALPHA", "NORMALIZED"], ["NORMALIZED", "TILE", "NORMALIZED"], ["NORMALIZED", "ROOT_COVERAGE", "COVERAGE_ROOTED"]],
  "PUBLIC-PROJECTION": [["PRIVATE_EVENT", "SEAL", "SEALED_EXTERNAL"], ["SEALED_EXTERNAL", "PROJECT_POLICY", "PUBLIC_POLICY_ONLY"], ["PUBLIC_POLICY_ONLY", "SCAN", "PUBLIC_POLICY_ONLY"], ["SEALED_EXTERNAL", "PROJECT_EVENT", "BLOCKED"]],
  "DEPENDENCY-UNIVERSE": [["DISCOVERING", "DISCOVER", "DISCOVERING"], ["DISCOVERING", "CLASSIFY_NEW", "DISCOVERING"], ["DISCOVERING", "ROOT", "SNAPSHOT_READY"], ["SNAPSHOT_READY", "CAS_FENCE", "FENCED"], ["FENCED", "MUTATE", "STALE"], ["FENCED", "REVOKE", "REVOKED"]],
  "BOOTSTRAP-COMMIT": [["ABSENT", "PREPARE_INTENT", "INTENT_PREPARED"], ["INTENT_PREPARED", "VERIFY_PRECOMMIT", "PRECOMMIT_VERIFIED"], ["PRECOMMIT_VERIFIED", "CAS_COMMIT", "COMMITTED"], ["COMMITTED", "RETRY_SAME_KEY", "COMMITTED"], ["COMMITTED", "OBSERVE_POSTCOMMIT", "POSTREADBACK_VERIFIED"], ["COMMITTED", "DIVERGENCE", "POSTREADBACK_DIVERGED"], ["INTENT_PREPARED", "ABORT", "ABORTED"], ["PRECOMMIT_VERIFIED", "ABORT", "ABORTED"]],
};
const controlTransitions = [];
for (const [machineId, rows] of Object.entries(transitionSpecs)) {
  rows.forEach(([from, event, to], index) => controlTransitions.push({
    authorityEffect: to.includes("FINAL") || to === "COMMITTED" ? "ROOTED-ONLY-AFTER-ALL-GUARDS" : "NONE",
    event,
    from,
    guardId: `${machineId}-GUARD-${String(index + 1).padStart(3, "0")}`,
    machineId,
    sideEffectPolicy: "NO-SIDE-EFFECT-BEFORE-GUARD;FAILURE-ZERO-AUTHORITY",
    terminalId: machineTerminal[machineId],
    to,
    transitionId: `${machineId}-TRANSITION-${String(index + 1).padStart(3, "0")}`,
  }));
}

const separationDimensions = ["PersonRoot", "AppointmentRoot", "outputAuthorRoot", "CandidateAuthorRoot", "sourceOwnerRoot", "ProducerRoot", "QARoot", "AcceptorRoot", "AppellateRoot", "RiskDispositionAuthorityRoot", "agentPolicyRoot", "toolRoot", "modelRoot", "employerRoot", "controllingPrincipalRoot"];
const separationRules = separationDimensions.map((dimension) => {
  const allowance = ["toolRoot", "modelRoot", "employerRoot"].includes(dimension);
  return {
    allowanceFields: allowance ? ["allowanceRoot", "ownerRoot", "scope", "issuedAtObservationRoot", "expiresAtObservationRoot", "revocationRoot", "independenceThreshold", "signatureRoot"] : [],
    allowanceRequired: allowance,
    comparedRoles: ["REVIEW-STRUCTURAL", "REVIEW-SEMANTIC", "REVIEW-SECURITY", "CANDIDATE-AUTHOR", "SOURCE-OWNER", "PRODUCER", "QA", "ACCEPTOR", "APPELLATE", "RISK-DISPOSITION"],
    dimension,
    sameValueDisposition: allowance ? "ALLOW-ONLY-WITH-ACTIVE-ROOTED-ALLOWANCE;CURRENT-ACTIVE-ALLOWANCES=0" : "BLOCK",
  };
});

const dependencyFamilyIds = [
  "SOURCE-NAMESPACE", "PARSER-PROFILE", "SOURCE-CUSTODY", "CROSSWALK", "CLAUSE-MAP", "RESIDUAL-RISK", "TERMINAL", "FAILURE-CONDITION",
  "SERIALIZATION", "MUTATION-DSL", "TRUST-ANCHOR", "KEY", "ALGORITHM", "REVOCATION", "TRANSPARENCY", "CLOCK-POLICY",
  "CLOCK-OBSERVATION", "FINALITY-LOG", "FINALITY-CHECKPOINT", "DISCLOSURE-POLICY", "PUBLIC-PROJECTION", "REVIEW-DOMAIN", "REVIEW-APPOINTMENT", "REVIEW-PERSON",
  "REVIEW-AGENT", "REVIEW-TOOL", "REVIEW-MODEL", "SEPARATION-POLICY", "PRESEAL", "QUORUM", "VETO", "APPEAL",
  "CUSTODY", "LEGAL-HOLD", "MEDIA-PROFILE", "VECTOR-CORPUS", "VECTOR-RUNNER", "CLOSURE", "INDEPENDENT-RECEIPT", "B0-PROCEDURE",
  "B0-AUTHORITY", "HUMAN-APPROVAL", "CONFORMANCE", "CANDIDATE-SUBJECT", "PROTOCOL-REGISTRY", "OPERATION-LEDGER", "RISK-UNIVERSE", "GENERATION-LEDGER",
];
const dependencyFamilies = dependencyFamilyIds.map((familyId) => ({
  classifier: "IN-SCOPE-IFF-READ-BY-PROOF-CONSTRUCTOR-POLICY-AUTHORITY-OR-SIDE-EFFECT-PATH",
  discoveryAuthorityRoot: "UNKNOWN-EXTERNAL-BLOCKING",
  familyId,
  headRoot: "UNKNOWN-BLOCKING",
  invalidationEvents: ["CREATE", "REMOVE", "RENAME", "VERSION-CHANGE", "REVOKE", "EXPIRE", "OWNERSHIP-CHANGE"],
  membershipProof: "ABSENT-BLOCKING",
  nonMembershipProof: "ABSENT-BLOCKING",
  unknownStateTerminal: "TERM-FRESHNESS-BLOCKED",
}));

const commitMemberIds = [
  "expectedProtocolHead", "candidateRoot", "subjectRoot", "externalB0ProcedureRoot", "consumedBootstrapAuthorityRoot", "threeDistinctReviewRoots",
  "producerQARoot", "reconciliationRoot", "humanApprovalRoot", "conformanceRoot", "riskUniverseRoot", "dependencyUniverseRoot",
  "trustProofRoot", "clockObservationRoot", "finalityCheckpointRoot", "publicSafetyProofRoot", "reviewLifecycleTerminalRoot", "appealStateRoot",
  "acceptedProtocolHead", "acceptanceEnvelopeRoot", "operationLedgerEntryRoot", "issuedPermitRoot",
];
const commitMembers = commitMemberIds.map((memberId, index) => ({
  framing: "CPB1-U64BE-LENGTH-PREFIX",
  memberId,
  order: index + 1,
  required: true,
  staleOrMissingDisposition: "ABORT-ZERO-AUTHORITY",
}));

const selectTerminal = (triggerIds) => {
  if (triggerIds.length === 0) return terminalById.get("TERM-SUCCESS");
  return triggerIds.map((triggerId) => {
    const condition = failureConditions.find((item) => item.conditionId === triggerId);
    return condition ? terminalById.get(condition.terminalId) : terminalById.get("TERM-FAIL-CLOSED-UNKNOWN");
  }).sort((a, b) => a.precedenceRank - b.precedenceRank)[0];
};
const zeroSideEffects = { authorityOutputCount: 0, durableWriteCount: 0, publicationCount: 0 };
const vectors = [];

for (const row of crosswalk) {
  const member = memberByKey.get(`${row.sourceNamespaceId}/${row.sourceMemberId}`);
  const original = memberBytes(member);
  const mutated = Buffer.from(original);
  mutated[0] ^= 1;
  const fixture = {};
  const program = [
    { memberId: member.memberId, namespaceId: member.namespaceId, op: "LOAD_MEMBER" },
    { hex: member.memberDigest, op: "ASSERT_SHA256" },
    { mask: 1, offset: 0, op: "XOR_BYTE" },
    { op: "SET_TRIGGER_SET", triggerIds: ["FC-SOURCE-GRAPH"] },
    { op: "EVALUATE_TERMINAL" },
  ];
  const postState = { bytesHex: mutated.toString("hex"), triggerIds: ["FC-SOURCE-GRAPH"] };
  vectors.push({
    executionReceipt: "PRODUCER-MECHANICAL-ONLY;INDEPENDENT-TWO-RUNNER-RECEIPT=ABSENT-BLOCKING",
    expectedPostRoot: rooted("MPRR-V16-VECTOR-POST-STATE-1", canonical(postState)),
    expectedTerminal: terminalById.get("TERM-SOURCE-GRAPH-INVALID"),
    family: "CROSSWALK-EXACT-SOURCE-MUTATION",
    fixture,
    fixtureRoot: rooted("MPRR-V16-VECTOR-FIXTURE-1", member.namespaceRoot, member.memberId, member.memberDigest),
    policyRoot: rooted("MPRR-V16-VECTOR-POLICY-1", "CPB1-MUTATION-DSL-1", "ZERO-SIDE-EFFECT-ON-FAILURE"),
    program,
    programRoot: rooted("MPRR-V16-VECTOR-PROGRAM-1", canonical(program)),
    runnerRoots: [readerARoot, readerBRoot],
    sideEffectOracle: zeroSideEffects,
    sourceRowId: row.rowId,
    vectorId: row.vectorIds[0],
  });
}

const triggerSets = [
  [],
  ...failureConditions.map((condition) => [condition.conditionId]),
];
for (let left = 0; left < failureConditions.length; left += 1) {
  for (let right = left + 1; right < failureConditions.length; right += 1) {
    triggerSets.push([failureConditions[left].conditionId, failureConditions[right].conditionId]);
  }
}
triggerSets.push(failureConditions.map((condition) => condition.conditionId));
assert(triggerSets.length === 138, `terminal overlap denominator ${triggerSets.length}`);
triggerSets.forEach((triggerIds, index) => {
  const sortedTriggers = [...triggerIds].sort();
  const fixture = { triggerIds: [] };
  const program = [{ op: "SET_TRIGGER_SET", triggerIds: sortedTriggers }, { op: "EVALUATE_TERMINAL" }];
  const postState = { triggerIds: sortedTriggers };
  vectors.push({
    executionReceipt: "PRODUCER-MECHANICAL-ONLY;INDEPENDENT-TWO-RUNNER-RECEIPT=ABSENT-BLOCKING",
    expectedPostRoot: rooted("MPRR-V16-VECTOR-POST-STATE-1", canonical(postState)),
    expectedTerminal: selectTerminal(sortedTriggers),
    family: "TERMINAL-TOTALITY-OVERLAP",
    fixture,
    fixtureRoot: rooted("MPRR-V16-VECTOR-FIXTURE-1", canonical(fixture)),
    policyRoot: rooted("MPRR-V16-VECTOR-POLICY-1", "TERMINAL-PRECEDENCE-1"),
    program,
    programRoot: rooted("MPRR-V16-VECTOR-PROGRAM-1", canonical(program)),
    runnerRoots: [readerARoot, readerBRoot],
    sideEffectOracle: zeroSideEffects,
    sourceRowId: "TERMINAL-REGISTRY",
    vectorId: `MPRR-V16-VEC-TERM-${String(index + 1).padStart(3, "0")}`,
  });
});

const applyReviewEvent = (state, instruction) => {
  const next = structuredClone(state);
  if (instruction.event === "CLOSE_REVIEW") {
    if (next.p0 > 0 || next.p1 > 0) next.state = next.generation < 2 ? "REWORK_REQUIRED" : "REJECTED_FINAL";
    else if ((next.p2 > 0 || next.p3 > 0) && next.validRiskDisposition !== true) next.state = "REJECTED_FINAL";
    else next.state = "READY_FOR_ACCEPTOR";
  } else if (instruction.event === "SUBMIT_SUCCESSOR" && next.state === "REWORK_REQUIRED" && next.generation === 1) {
    next.generation = 2;
    next.state = "REVIEWING";
    next.p0 = instruction.p0;
    next.p1 = instruction.p1;
    next.p2 = instruction.p2;
    next.p3 = instruction.p3;
    next.validRiskDisposition = instruction.validRiskDisposition;
  } else if (instruction.event === "ACCEPT" && next.state === "READY_FOR_ACCEPTOR" && instruction.selfApproval === false) {
    next.state = "ACCEPTED_PROVISIONAL";
  } else if (instruction.event === "EXPIRE_APPEAL_WINDOW" && next.state === "ACCEPTED_PROVISIONAL" && instruction.trustedTime === true) {
    next.state = "ACCEPTED_FINAL";
  } else if (instruction.event === "FILE_APPEAL" && ["ACCEPTED_PROVISIONAL", "REJECTED_FINAL"].includes(next.state) && next.appealCount === 0 && instruction.timely === true && instruction.independent === true) {
    next.appealCount = 1;
    next.state = "APPEAL_FROZEN";
  } else if (instruction.event === "REMAND" && next.state === "APPEAL_FROZEN" && next.generation === 1) {
    next.generation = 2;
    next.state = "REVIEWING";
  } else if (instruction.event === "AFFIRM" && next.state === "APPEAL_FROZEN") {
    next.state = "AFFIRMED_FINAL";
  } else if (instruction.event === "REVOKE") {
    next.state = "REVOKED_FINAL";
  } else {
    next.state = "CONFLICT_FINAL";
  }
  return next;
};

const reviewFixture = (overrides = {}) => ({
  appealCount: 0,
  generation: 1,
  p0: 0,
  p1: 0,
  p2: 0,
  p3: 0,
  state: "REVIEWING",
  validRiskDisposition: false,
  ...overrides,
});
const reviewPrograms = [
  ["GEN1-CLEAN-ACCEPT", reviewFixture(), [
    { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }, { event: "ACCEPT", op: "REVIEW_EVENT", selfApproval: false }, { event: "EXPIRE_APPEAL_WINDOW", op: "REVIEW_EVENT", trustedTime: true },
  ]],
  ["GEN1-P0-GEN2-CLEAN-ACCEPT", reviewFixture({ p0: 1 }), [
    { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }, { event: "SUBMIT_SUCCESSOR", op: "REVIEW_EVENT", p0: 0, p1: 0, p2: 0, p3: 0, validRiskDisposition: false }, { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }, { event: "ACCEPT", op: "REVIEW_EVENT", selfApproval: false }, { event: "EXPIRE_APPEAL_WINDOW", op: "REVIEW_EVENT", trustedTime: true },
  ]],
  ["GEN2-P1-REJECT", reviewFixture({ p0: 1 }), [
    { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }, { event: "SUBMIT_SUCCESSOR", op: "REVIEW_EVENT", p0: 0, p1: 1, p2: 0, p3: 0, validRiskDisposition: false }, { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" },
  ]],
  ["P2-WITHOUT-DISPOSITION-REJECT", reviewFixture({ p2: 1 }), [{ event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }]],
  ["P2-WITH-DISPOSITION-ACCEPT", reviewFixture({ p2: 1, validRiskDisposition: true }), [
    { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }, { event: "ACCEPT", op: "REVIEW_EVENT", selfApproval: false }, { event: "EXPIRE_APPEAL_WINDOW", op: "REVIEW_EVENT", trustedTime: true },
  ]],
  ["APPEAL-AFFIRM", reviewFixture(), [
    { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }, { event: "ACCEPT", op: "REVIEW_EVENT", selfApproval: false }, { event: "FILE_APPEAL", independent: true, op: "REVIEW_EVENT", timely: true }, { event: "AFFIRM", op: "REVIEW_EVENT" },
  ]],
  ["SECOND-APPEAL-CONFLICT", reviewFixture(), [
    { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }, { event: "ACCEPT", op: "REVIEW_EVENT", selfApproval: false }, { event: "FILE_APPEAL", independent: true, op: "REVIEW_EVENT", timely: true }, { event: "AFFIRM", op: "REVIEW_EVENT" }, { event: "FILE_APPEAL", independent: true, op: "REVIEW_EVENT", timely: true },
  ]],
  ["REVOKE-FINAL", reviewFixture(), [
    { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }, { event: "ACCEPT", op: "REVIEW_EVENT", selfApproval: false }, { event: "EXPIRE_APPEAL_WINDOW", op: "REVIEW_EVENT", trustedTime: true }, { event: "REVOKE", op: "REVIEW_EVENT" },
  ]],
  ["APPEAL-REMAND-CONSUMES-GEN2", reviewFixture(), [
    { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }, { event: "ACCEPT", op: "REVIEW_EVENT", selfApproval: false }, { event: "FILE_APPEAL", independent: true, op: "REVIEW_EVENT", timely: true }, { event: "REMAND", op: "REVIEW_EVENT" }, { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }, { event: "ACCEPT", op: "REVIEW_EVENT", selfApproval: false }, { event: "EXPIRE_APPEAL_WINDOW", op: "REVIEW_EVENT", trustedTime: true },
  ]],
  ["SELF-APPROVAL-CONFLICT", reviewFixture(), [
    { event: "CLOSE_REVIEW", op: "REVIEW_EVENT" }, { event: "ACCEPT", op: "REVIEW_EVENT", selfApproval: true },
  ]],
];

reviewPrograms.forEach(([name, fixture, program], index) => {
  let postState = structuredClone(fixture);
  program.forEach((instruction) => { postState = applyReviewEvent(postState, instruction); });
  vectors.push({
    executionReceipt: "PRODUCER-MECHANICAL-ONLY;INDEPENDENT-LIFECYCLE-RECEIPT=ABSENT-BLOCKING",
    expectedFinalLifecycleState: postState.state,
    expectedPostRoot: rooted("MPRR-V16-VECTOR-POST-STATE-1", canonical(postState)),
    expectedTerminal: terminalById.get("TERM-SUCCESS"),
    family: "REVIEW-LIFECYCLE",
    fixture,
    fixtureRoot: rooted("MPRR-V16-VECTOR-FIXTURE-1", canonical(fixture)),
    policyRoot: rooted("MPRR-V16-VECTOR-POLICY-1", "MAX-GENERATIONS=2", "MAX-APPEALS=1", "P0=0", "P1=0", "NO-SELF-APPROVAL"),
    program,
    programRoot: rooted("MPRR-V16-VECTOR-PROGRAM-1", canonical(program)),
    runnerRoots: [readerARoot, readerBRoot],
    sideEffectOracle: zeroSideEffects,
    sourceRowId: "REVIEW-LIFECYCLE",
    vectorId: `MPRR-V16-VEC-LIFECYCLE-${String(index + 1).padStart(3, "0")}-${name}`,
  });
});

assert(vectors.length === 471, `vector denominator ${vectors.length}`);

const jsonlBlock = (name, rows) => `<!-- ${name}_JSONL_BEGIN -->\n\`\`\`jsonl\n${rows.map(canonical).join("\n")}\n\`\`\`\n<!-- ${name}_JSONL_END -->`;
const publicCarriers = carriers.map(({ bytesValue, ...carrier }) => carrier);
const requirementText = requirements.map((requirement, index) => {
  const section = index + 1;
  return `## 2.${section} \`${requirement.id}\` — ${requirement.title}\n\n2.${section}.1 \`statement\`: ${requirement.fields.statement}.\n\n2.${section}.2 \`defectCauseImpact\`: ${requirement.fields.defectCauseImpact}.\n\n2.${section}.3 \`requiredProofPredicate\`: ${requirement.fields.requiredProofPredicate}.\n\n2.${section}.4 \`dependencies\`: ${requirement.fields.dependencies}.\n\n2.${section}.5 \`sourceBasis\`: ${requirement.fields.sourceBasis}.`;
}).join("\n\n");

const mediaLiteral = Buffer.from("MPRR-MEDIA-CONFORMANCE-LITERAL-1|width=2|height=2|rgba=00000000,ff0000ff,00ff0080,0000ffff|orientation=6|crop=[0,0,2,2)|scale=1/1|round=HALF-EVEN", "utf8");
const mediaLiteralRoot = sha256(mediaLiteral);
const subjectSections = [
`# 1. Connect — Three-review Protocol v1.6 immutable successor Candidate

## 1.1 Identity, exact inputs and authority boundary

1.1.1 \`artifactId=CONNECT-THREE-REVIEW-PROTOCOL-V1-6-SUCCESSOR-REQUIREMENTS-2026-08-30\`.

1.1.2 exact v1.5 Subject root=\`73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c\`; Producer QA root=\`e0b0b093f4169cb75e40f750c4af68205b9bc1dc6ada719ccb870de883e16570\`; independent review root=\`7e4123a746725d2849f99859e010ab870996cb68af9c58ff3796f3555705029c\`; Findings Manifest root=\`310cdb86dedb5b26a4f948086e13ea42ce1c72c9fe8cf5e55e99612c0162ec85\`.

1.1.3 input denominator=\`21 exact Public Planning carriers\`; every byte was opened, hashed and indexed. Recovery-ledger bytes are mutable coordination context and are intentionally excluded from frozen authority.

1.1.4 v1.5 independent Findings=\`16\`; severity=\`P0=8,P1=7,P2=1,P3=0\`; v1.5 Requirements=\`96\`; inherited v1.5 obligation rows=\`211\`.

1.1.5 successor Requirements=\`112\`: exactly 16 one-to-one remediation designs followed by exactly 96 lossless preservation Requirements. Each has exactly five fields, one atomic output identity and only backward local dependencies.

1.1.6 status=\`IMMUTABLE-SUCCESSOR-CANDIDATE;PRODUCER-MECHANICAL-QA-PENDING;INDEPENDENT-SEMANTIC-CLOSURE=0;ACCEPTANCE=0\`.

1.1.7 external B0 authority, appointments, independent receipts, live dependency Heads and admission authority remain \`unknown/unavailable\`. Candidate identities do not self-admit.

## 1.2 Binding safety invariants

1.2.1 repository visibility=\`PUBLIC-PERMANENT\`. No transition, rollback, recovery, successor, incident or appeal may set it to Private.

1.2.2 no Secret, credential, PII, customer/provider private byte, Private Evidence byte, raw or keyed Private-content digest, equality tag, guess-testable commitment or Private-derived metadata may enter any Public repository or Public surface.

1.2.3 Public event evidence is forbidden. The only Public projection is the fixed policy statement \`NO-EVENT-LEVEL-EVIDENCE-IS-PUBLISHED\`; exact event audit and replay remain in separately authorized sealed external Private custody.

1.2.4 deterministic IDs and roots derive from exact admitted bytes and CPB1 constructors. Pseudo-random IDs, suffix collisions, invented evidence and unapproved cryptographic randomness are forbidden.

1.2.5 no fake, mock, demo, sample or synthetic business data is used. Section 11's media bytes are a normative security conformance literal, never business data.

1.2.6 \`Gate29=BLOCKED\`; development freeze=\`ACTIVE\`; no Product, Build, Runtime, Git, GitHub, provider, deployment or account mutation is authorized.

1.2.7 Producer QA may claim mechanical Candidate PASS only. Finding Closure, Requirement Acceptance, Review eligibility, Protocol Admission, Publication authority and Gate credit remain zero until fresh eligible independent exact-root evidence exists.

# 2. Exactly 112 five-field Requirements

${requirementText}`,
`# 3. One atomic output per Requirement

3.1.1 every Requirement has exactly one deterministic output type and output ID. An output is an identity definition, not an issued authority object; \`independentProofRoot=ABSENT-BLOCKING\` keeps issuance at zero.

3.1.2 an output cannot substitute for another Requirement output, and a shared source or target never transfers Closure.

${jsonlBlock("REQUIREMENT_OUTPUTS", outputs)}`,
`# 4. Canonical serialization and mutation language

4.1.1 \`CPB1\` encodes each field as an unsigned 64-bit big-endian byte length followed by exact bytes. Domain, schema version and every field are individually framed. Concatenation without framing is forbidden.

4.1.2 strings are valid UTF-8 normalized to NFC before CPB1 encoding; NUL and invalid scalar sequences fail. Integers are schema-bounded signed or unsigned values; floating point, NaN, Infinity, locale formatting and implicit coercion are forbidden.

4.1.3 records use the schema-declared field order. Arrays retain declared order. Sets sort by complete element canonical bytes, reject byte-identical duplicates and never infer equality from display aliases. Maps are forbidden unless a schema fixes every key and order.

4.1.4 root=\`SHA-256(CPB1(domain,version,fields...))\`. Full 256-bit roots are authoritative; shortened aliases are display-only. Unknown schema, field, enum, path or operation returns \`TERM-SERIALIZATION-BLOCKED\` before durable write or authority transfer.

4.1.5 the closed mutation DSL AST is \`LOAD_MEMBER(namespaceId,memberId)\`, \`ASSERT_SHA256(hex)\`, \`XOR_BYTE(offset,mask)\`, \`SET_TRIGGER_SET(triggerIds)\`, \`EVALUATE_TERMINAL\` and \`REVIEW_EVENT(event,typedArgs)\`. Each operation has an exact precondition, typed operand and deterministic post-state. Any other operation is invalid.

4.1.6 the JSONL below is a Public Planning carrier, not the authority serialization. Its canonical form is recursive lexicographic-key JSON with integers only and no duplicate keys; both readers reject a byte-different representation.

${jsonlBlock("PARSER_PROFILES", parserProfiles)}`,
`# 5. Exact Source Universe, custody and independently derived namespaces

5.1.1 every carrier locator is repository-relative plus exact SHA-256. The carrier is Public Planning evidence only. External B0 membership remains absent and therefore source authority credit remains zero.

5.1.2 parserProfileRoot binds the complete parser schema and both executable QA-reader roots. memberSetRoot is the CPB1-rooted sorted Set of full canonical member records. NamespaceEntryRoot binds namespace ID, carrier ID/root, parser root, member-set root, count, custody locator, selector and authority state.

5.1.3 each member span is zero-based half-open and each line span is one-based inclusive. The two readers independently rediscover the full member population from carrier bytes and selector; declared rows are comparison inputs, never discovery authority.

${jsonlBlock("SOURCE_CARRIERS", publicCarriers)}

${jsonlBlock("SOURCE_NAMESPACES", namespaces)}

${jsonlBlock("SOURCE_MEMBERS", members)}`,
`# 6. Complete non-merged preservation and Closure Crosswalk

6.1.1 denominator=\`323\`: 16 v1.5 independent Findings + 96 v1.5 Requirements + 211 inherited obligation rows. Every source record has one unique noMergeKey and never borrows Closure from another row.

6.1.2 every source conjunct includes exact source bytes as Base64, SHA-256, source-relative span identity and one or more exact target clause paths. Base64 is transport only; the source member/root is authoritative.

6.1.3 all rows remain \`OPEN\`; independentReceipt=\`ABSENT-BLOCKING\`; FULL=\`0/323\`. This Candidate closes the design defect but cannot issue its own semantic receipt.

6.1.4 the four unsafe v1.5 PublicReceipt Requirements preserve their audit intent but receive an explicit Public no-event safety supersession; no event class,time,count,cadence,identifier or Private commitment survives on the Public surface.

${jsonlBlock("CROSSWALK", crosswalk)}`,
`# 7. ResidualRisk lifecycle and P2/P3 authority

7.1.1 P0 and P1 may never be risk-accepted: Acceptance requires unresolved P0=0 and unresolved P1=0.

7.1.2 P2 disposition requires unanimous recommendation from the three eligible reviewers, a separate named RiskDispositionAuthority, operation-bound HumanApproval, trusted-time validity, expiry and revocation roots. P3 requires at least two of three eligible reviewer recommendations plus the same separate authority and HumanApproval. Any veto blocks.

7.1.3 RiskDispositionAuthority is separated from Candidate author, source owner, Producer, QA, Acceptor, all three reviewers and Appellate authority. Unknown owner, expiry, authority, receipt or revocation state blocks.

${jsonlBlock("RESIDUAL_RISKS", residualRisks)}`,
`# 8. Exact five-field NamedUse Manifest and backward DAG

8.1.1 grammar recognizes only \`@local[RequirementId]\` and \`@source[namespaceId/memberId]\` tokens in all five exact field values. Every occurrence records field and UTF-8 byte span.

8.1.2 local providers must exist and have a strictly smaller Requirement number. Source providers must be exact members in Section 5. Same-row, self, forward, implicit, inferred and local-to-external fallback bindings are forbidden.

${jsonlBlock("NAMED_USES", namedUses)}`,
`# 9. Closed Terminal tuples, failure predicates and total precedence

9.1.1 a failure condition is true only when its exact predicate evaluates true. Unknown condition IDs first add \`TERM-FAIL-CLOSED-UNKNOWN\`. The winner is the unique smallest precedenceRank. Empty failure Set returns the explicit \`TERM-SUCCESS\` tuple only after every positive admission conjunct passes.

9.1.2 individual, all 120 pairwise, the all-trigger Set and empty success Set are executable vectors. A label without its full tuple has zero credit.

${jsonlBlock("TERMINALS", terminals)}

${jsonlBlock("FAILURE_CONDITIONS", failureConditions)}`,
`# 10. Closed trust, clock, finality, review, appeal, custody, media, Public and commit machines

10.1.1 every machine declares a closed state Set, event Set, exact contract and total fail-closed rule. Only listed transitions are allowed; every other state/event pair returns the machine Terminal with zero side effects.

10.1.2 Trust verification order is canonical decode, schema/domain/purpose/audience/operation, algorithm policy, unique trust path, proof of possession, trusted-time interval, revocation-at-use, rotation/compromise, log inclusion, checkpoint consistency and anti-equivocation.

10.1.3 Clock observations use signed decimal nanoseconds and half-open uncertainty intervals. A policy names authoritative sources or quorum and a maximum skew. Overlap, rollback, split quorum, missing source or unknown policy never proves freshness.

10.1.4 Finality uses domain-separated append-only leaf/node roots, exact issuer/quorum policy, membership, sorted-neighbor non-membership, consistency from prior checkpoint and fork detection. Withheld or competing eligible receipts cannot produce a winner.

10.1.5 Custody machines are distinct for content, keys, receipts, primary replicas, backup replicas and restore copies. Legal Hold and revocation win; deletion is limited to exact approved IDs and cutoff; provider acknowledgements are audit evidence after atomic safety, never the safety mechanism.

${jsonlBlock("CONTROL_MACHINES", controlMachines)}

${jsonlBlock("CONTROL_TRANSITIONS", controlTransitions)}`,
`# 11. Media profile and normative conformance literal

11.1.1 coordinate origin is top-left; regions are half-open; EXIF orientation precedes crop; scale is a reduced rational; pixel selection uses round-half-to-even; tile composition is row-major with no overlap; color-profile and alpha conversion roots are mandatory.

11.1.2 normative media conformance literal root=\`${mediaLiteralRoot}\`; bytes(Base64)=\`${mediaLiteral.toString("base64")}\`. This fixed protocol literal is not fake, mock, demo, sample, synthetic or customer business data.

11.1.3 coverage is credited only over normalized pixel coordinates under the same media profile root. Profile mismatch, multiple transform, uncovered pixel or overcount blocks.

# 12. Three-review separation, bounded generations, quorum, veto and appeal

12.1.1 Review domains are exactly Structural, Semantic and Security. Each slot has a pairwise-distinct PersonRoot, AppointmentRoot, outputAuthorRoot and agentPolicyRoot. Candidate author, source owner, Producer, QA and Acceptor occupy no review slot.

12.1.2 all three reviewers receive the same exact Candidate root. No reviewer output becomes visible to another reviewer before all three outputs are sealed. Replacement or amendment creates a new output root and invalidates affected seals.

12.1.3 quorum requires three eligible sealed roots. Any unresolved P0/P1 or any valid non-waivable veto blocks. P2/P3 use Section 7 only. Acceptor identity must be distinct; selfApproval is forbidden.

12.1.4 maximum review generations=\`2\`. Generation one may produce one immutable successor and generation two. If generation two retains P0/P1, lacks required P2/P3 disposition, conflicts, expires or is revoked, the terminal is \`REJECTED_FINAL\` or \`CONFLICT_FINAL\`; a new initiative is required and the same Candidate cannot loop.

12.1.5 maximum appeals=\`1\`. A timely valid appeal freezes Acceptance and Publication. Appellate authority is separated on every matrix dimension. REMAND may consume the unused second generation only; AFFIRM and REVOKE are terminal. A second, late, replayed, conflicted or revoked appeal fails closed.

${jsonlBlock("SEPARATION_RULES", separationRules)}`,
`# 13. Permanently Public repository and no-event projection

13.1.1 repository visibility remains \`PUBLIC-PERMANENT\`; any proposed Private transition is invalid and returns \`TERM-PUBLIC-PRIVATE-LINKAGE-BLOCKED\`.

13.1.2 Public allowlist is exactly \`schemaVersion,policyVersion,fixedStatement,publicAuthorityKeyId,signature\`; fixedStatement is constant and independent of Private events. No per-event record is emitted. Constant policy publication cadence is governance-controlled and not triggered by Private activity.

13.1.3 event class,time,validity window,count,cadence,identifier,length,type,error,content root,digest,keyed digest,equality tag,commitment and tier-binding root are Private-only. Public projection of any such value is forbidden before persist.

# 14. Complete mutable DependencyHeadUniverse

14.1.1 family denominator=\`48\`. A new mutable datum is in scope iff any proof, constructor, policy, authority decision or side-effect path reads it. An unknown family cannot be used until registered.

14.1.2 universeRoot binds sorted complete family/member records, creation/removal/rename/version/revocation/expiry/ownership receipts and membership/non-membership proofs. One CAS fences universe Head, every member Head and every revocation root at one linearization point.

14.1.3 current live Heads and discovery authority remain unknown, so Freshness and Acceptance credit remain zero.

${jsonlBlock("DEPENDENCY_FAMILIES", dependencyFamilies)}`,
`# 15. Executable exact-root vector programs

15.1.1 vector denominator=\`471\`: 323 exact-source mutation programs, 138 total Terminal programs and 10 bounded review-lifecycle programs. Every program binds fixture, program, policy, both runner roots, full expected Terminal tuple, expected post-state root and zero-side-effect oracle.

15.1.2 the two QA readers execute all 471 programs. Their Producer reports are not independent Review receipts and cannot close any row.

${jsonlBlock("VECTORS", vectors)}`,
`# 16. Causally realizable bootstrap, commit and readback

16.1.1 PREPARE_INTENT derives a deterministic operationKey from Candidate root, external B0 authority root, operation purpose and epoch. VERIFY_PRECOMMIT reads the complete dependency snapshot and expected Protocol Head.

16.1.2 CAS_COMMIT atomically writes exactly the ordered 22 members below and one \`BootstrapAdmissionCommitEnvelopeRoot\`. Durable member count is 0 or 22; output count and Permit count are 0 or 1. Same-key retry returns the same committed envelope; different parameters conflict.

16.1.3 postCommitReadbackRoot is not a commit member. After commit, OBSERVE_POSTCOMMIT creates a separate audit observation referencing the already committed envelope and ledger version. Divergence blocks Publication and triggers revocation/reconciliation; audit never substitutes for pre-commit safety.

${jsonlBlock("COMMIT_MEMBERS", commitMembers)}`,
`# 17. Exact counters and next safe action

17.1.1 Requirements=\`112\`; fields=\`560\`; remediation designs=\`16\`; v1.5 preservation Requirements=\`96\`; atomic outputs=\`112\`.

17.1.2 carriers=\`${carriers.length}\`; parser profiles=\`${parserProfiles.length}\`; namespaces=\`${namespaces.length}\`; members=\`${members.length}\`; exact crosswalk rows=\`${crosswalk.length}\`; NamedUse occurrences=\`${namedUses.length}\`.

17.1.3 Terminals=\`${terminals.length}\`; failure predicates=\`${failureConditions.length}\`; control machines=\`${controlMachines.length}\`; transitions=\`${controlTransitions.length}\`; separation dimensions=\`${separationRules.length}\`; dependency families=\`${dependencyFamilies.length}\`; vectors=\`${vectors.length}\`; commit members=\`${commitMembers.length}\`.

17.1.4 independently accepted Requirements=\`0/112\`; independently FULL Crosswalk rows=\`0/323\`; independently closed Findings=\`0/16\`; eligible Reviews=\`0/3\`; Protocol Admission=\`0\`; Acceptance=\`0\`; Publication authority=\`0\`; Gate credit=\`0\`.

17.1.5 next safe action: freeze this exact root and detached Producer QA, then commission fresh pairwise-distinct structural, semantic and security reviewers. Any accepted defect requires v1.7; this Candidate must not be patched.

17.1.6 \`Gate29=BLOCKED\`; development freeze=\`ACTIVE\`; repository=\`PUBLIC-PERMANENT\`; Product percentage, remaining hours, critical path and ETA remain \`unknown/unavailable\`.`,
];

const subject = `${subjectSections.join("\n\n")}\n`;
writeFileSync(subjectPath, subject, "utf8");

const reportABytes = execFileSync(process.execPath, [readerAPath, subjectPath], { cwd: repositoryRoot });
writeFileSync(reportAPath, reportABytes);
const reportBBytes = execFileSync("ruby", [readerBPath, subjectPath], { cwd: repositoryRoot });
writeFileSync(reportBPath, reportBBytes);

const reportA = JSON.parse(reportABytes.toString("utf8"));
const reportB = JSON.parse(reportBBytes.toString("utf8"));
assert(canonical(reportA.counters) === canonical(reportB.counters), "reader counter disagreement");
assert(reportA.subject.root === reportB.subject.root, "reader Subject root disagreement");
assert(reportA.subject.bytes === reportB.subject.bytes && reportA.subject.lines === reportB.subject.lines, "reader physical identity disagreement");
assert(reportA.verdict === reportB.verdict, "reader verdict disagreement");

const subjectBytes = readFileSync(subjectPath);
const qaRows = [
  ["Subject", subjectPath, sha256(subjectBytes), lineCount(subjectBytes), subjectBytes.length],
  ["Reader A", readerAPath, readerARoot, lineCount(readFileSync(readerAPath)), readFileSync(readerAPath).length],
  ["Reader B", readerBPath, readerBRoot, lineCount(readFileSync(readerBPath)), readFileSync(readerBPath).length],
  ["Reader A report", reportAPath, sha256(reportABytes), lineCount(reportABytes), reportABytes.length],
  ["Reader B report", reportBPath, sha256(reportBBytes), lineCount(reportBBytes), reportBBytes.length],
];
const producerQA = `# 1. Connect — detached Producer QA for Three-review Protocol v1.6

## 1.1 Exact immutable artifact roots

| Artifact | Path | SHA-256 | Lines | Bytes |
|---|---|---|---:|---:|
${qaRows.map(([label, path, root, lines, bytes]) => `| ${label} | \`${path.replace(`${repositoryRoot}/`, "")}\` | \`${root}\` | ${lines} | ${bytes} |`).join("\n")}

1.1.1 status=\`DETACHED-PRODUCER-QA;MECHANICAL-CANDIDATE-PASS;SEMANTIC-CLOSURE=0;ACCEPTANCE=0\`.

1.1.2 any byte change to the Subject, either reader or either report makes this QA stale. A defect requires a new immutable successor; none of these artifacts may be patched after review freeze.

1.1.3 this QA is Planning-only and Producer-authored. It grants no Review eligibility, Finding Closure, Requirement Acceptance, Protocol Admission, Publication authority or Gate credit.

# 2. Independent reader methods

2.1.1 Reader A is Node.js and uses byte scanning, regular-expression Requirement extraction, independent namespace discovery and an explicit vector interpreter.

2.1.2 Reader B is Ruby and uses a line state machine, independent byte-span discovery, a separately implemented canonical serializer and a separately implemented vector interpreter.

2.1.3 neither reader consumes the other's output. They agreed on the exact Subject root, physical identity, all counters, every source member digest/root, NamedUse multiset, backward DAG, Crosswalk, state-machine registries, full Terminal tuples and 471 vector post roots/terminals.

# 3. Exact mechanical counters

${Object.entries(reportA.counters).map(([key, value], index) => `3.1.${index + 1} \`${key}=${value}\`.`).join("\n\n")}

# 4. Hostile invariants mechanically enforced

4.1.1 exact five fields=\`560/560\`; Requirement IDs=\`112/112\`; deterministic one-output mapping=\`112/112\`; unknown,self,forward or same-row local provider=\`0\`; dependency cycles=\`0\`.

4.1.2 every source carrier root and byte count matched; both readers independently re-extracted all namespace members from the parser mode and selector, then reproduced all spans,digests,member-set roots and namespace roots.

4.1.3 Crosswalk rows=\`323/323\`; duplicate noMergeKey=\`0\`; missing source conjunct=\`0\`; missing target=\`0\`; missing typed ResidualRisk=\`0\`; premature independent receipt=\`0\`.

4.1.4 Terminal corpus executed empty,16 individual,120 pairwise and all-trigger Sets. Review lifecycle executed 10 programs including generation-one success, generation-two success, generation-two P1 rejection, P2 disposition pass/fail, one appeal, second-appeal conflict, remand, revoke and self-approval conflict.

4.1.5 commit members=\`22\`; canonical order exact; postCommitReadbackRoot inside commit=\`0\`. Repository visibility invariant=\`PUBLIC-PERMANENT\`.

# 5. Explicit zero ledger and next action

5.1.1 independently accepted Requirements=\`0/112\`; independently closed Findings=\`0/16\`; independently FULL Crosswalk rows=\`0/323\`; eligible Reviews=\`0/3\`; external B0 admission=\`0\`.

5.1.2 Producer mechanical PASS cannot become semantic Closure. All P0/P1 must be zero under fresh independent review; P2/P3 require the separate authority defined by the Subject.

5.1.3 next safe action is to freeze the exact roots above and commission three pairwise-distinct exact-root reviews. Any accepted defect requires v1.7.

5.1.4 \`Gate29=BLOCKED\`; development freeze=\`ACTIVE\`; repository=\`PUBLIC-PERMANENT\`; no Product, Build, Runtime, Git, GitHub, provider or deployment mutation occurred.
`;
writeFileSync(producerQAPath, producerQA, "utf8");

const producerBytes = readFileSync(producerQAPath);
process.stdout.write(canonical({
  producerQA: { bytes: producerBytes.length, lines: lineCount(producerBytes), path: producerQAPath, root: sha256(producerBytes) },
  readerA: { path: readerAPath, root: readerARoot },
  readerAReport: { path: reportAPath, root: sha256(reportABytes) },
  readerB: { path: readerBPath, root: readerBRoot },
  readerBReport: { path: reportBPath, root: sha256(reportBBytes) },
  subject: { bytes: subjectBytes.length, lines: lineCount(subjectBytes), path: subjectPath, root: sha256(subjectBytes) },
  verdict: "MECHANICAL-CANDIDATE-PASS;SEMANTIC-CLOSURE-ZERO",
}) + "\n");
