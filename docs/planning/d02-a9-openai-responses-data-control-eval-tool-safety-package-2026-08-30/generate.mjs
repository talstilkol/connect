#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const PACKAGE = "docs/planning/d02-a9-openai-responses-data-control-eval-tool-safety-package-2026-08-30";
const SOURCE_CUT = "2026-08-30T02:15:04Z";
const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const sourceIndex = args.indexOf("--source-dir");
if (outIndex < 0 || !args[outIndex + 1]) throw new Error("--out is required");
if (sourceIndex < 0 || !args[sourceIndex + 1]) throw new Error("--source-dir is required");
const outputRoot = path.resolve(args[outIndex + 1]);
const sourceCaptureRoot = path.resolve(args[sourceIndex + 1]);
const namespaceRoot = process.cwd();
if (!fs.existsSync(path.join(namespaceRoot, "docs"))) throw new Error("run from namespace root containing docs/");
fs.mkdirSync(outputRoot, { recursive: true });

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error("non-canonical number");
    return String(value);
  }
  if (typeof value === "string") {
    if (value !== value.normalize("NFC")) throw new Error("non-NFC string");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) => canonical(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  throw new Error("unsupported canonical value");
}

function domainRoot(domain, value) {
  return sha256(Buffer.from("CONNECT-D02-A9:" + domain + ":" + canonical(value), "utf8"));
}

function extent(bytes) {
  const text = bytes.toString("utf8");
  return {
    sha256: sha256(bytes),
    lines: (text.match(/\n/g) || []).length,
    words: text.trim() ? text.trim().split(/\s+/u).length : 0,
    bytes: bytes.length
  };
}

function writeJson(name, value) {
  fs.mkdirSync(path.dirname(path.join(outputRoot, name)), { recursive: true });
  fs.writeFileSync(path.join(outputRoot, name), JSON.stringify(value, null, 2) + "\n", "utf8");
}

function readLogical(logicalPath) {
  if (!logicalPath.startsWith("docs/") || path.posix.normalize(logicalPath) !== logicalPath || logicalPath.includes("\\")) {
    throw new Error("invalid logical path " + logicalPath);
  }
  return fs.readFileSync(path.join(namespaceRoot, logicalPath));
}

const inputSpecs = [
  ["001", "docs/decision-intake-2026-08-21.md", "USER-D02-DIRECTIVE", "052297f38f63d6e525641a5e1d044267cf7d553fd3e7a9d2d469669eca090937"],
  ["002", "docs/researched-decision-approval-2026-08-26.md", "RESEARCHED-DECISION", "f981cf9313e08fe0cfbd0603717af1a999fd1a367b5521d4191d0cfc3b27128b"],
  ["003", "docs/planning/d02-a4-openai-model-routing-reconciliation-2026-08-29.md", "ENGINEERING-RECONCILIATION", "221af06420bd0d5680ae708c997e9f22b7b48eecc9278dbe740cb66346c68d54"],
  ["004", "docs/planning/d02-a5-openai-responses-data-control-and-model-selection-reconciliation-2026-08-29.md", "SEMANTIC-SUCCESSOR", "1981729d8a0001d38f439508cdf668cbbd18b8bda0c70cde2152e19ff93281e5"],
  ["005", "docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-2026-08-30.md", "SEMANTIC-SUCCESSOR", "3788b73457a3bb25a679dc42875b641a21156f3b93e3b29676a3489e826ad3db"],
  ["006", "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-semantic-successor-2026-08-30.md", "SEMANTIC-SUCCESSOR", "f1246bc52124a59645a2446d4c83075358c9f6214f84bc6ee7e7ce6b8208b446"],
  ["007", "docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-2026-08-30.md", "INDEPENDENT-REVIEW", "344c42bcdbf60eed1332bfaa7e20d9725e80cad5e0f2d05863c3cbef6ba5f16d"],
  ["008", "docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-findings-manifest-2026-08-30.md", "FINDINGS-MANIFEST", "55f985944dae7684af73f3214e966650a3949ae52b1b28dc54ef198a886dceca"],
  ["009", "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md", "CLOSURE-CROSSWALK", "3f2b6689b638453872c019b96ed451a6096d3d771935d73dde82ff116b3b3cbc"],
  ["010", "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md", "PRODUCER-QA", "4ef56a1332504d04fad5176eba41a4dc40ae5a82f611e8208e0e51ff6cb8a21e"],
  ["011", "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-2026-08-30.md", "INDEPENDENT-REVIEW", "15d8f46c32b09301e58bf9e1867d0bab7e2c40b17634a3aa12c903e6dc99be62"],
  ["012", "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-findings-manifest-2026-08-30.md", "FINDINGS-MANIFEST", "d488c9f36d88797bf74b6db60e422c4bd9d55443eff032fa38aff490fd813c9b"],
  ["013", "docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md", "DURABLE-USER-PUBLIC-DIRECTIVE", "448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9"]
];

const consumerMap = {
  "001": ["D02A9-ROOT-AUTHORITY-CHAIN", "D02A9-ROOT-PREDECESSOR-SEMANTICS"],
  "002": ["D02A9-ROOT-AUTHORITY-CHAIN", "D02A9-ROOT-PREDECESSOR-SEMANTICS"],
  "003": ["D02A9-ROOT-AUTHORITY-CHAIN", "D02A9-ROOT-PREDECESSOR-SEMANTICS"],
  "004": ["D02A9-ROOT-AUTHORITY-CHAIN", "D02A9-ROOT-PREDECESSOR-SEMANTICS"],
  "005": ["D02A9-ROOT-AUTHORITY-CHAIN", "D02A9-ROOT-PREDECESSOR-SEMANTICS", "D02A9-ROOT-A6-FINDING-CARRY"],
  "006": ["D02A9-ROOT-AUTHORITY-CHAIN", "D02A9-ROOT-PREDECESSOR-SEMANTICS", "D02A9-ROOT-A7-FINDING-CARRY"],
  "007": ["D02A9-ROOT-PREDECESSOR-SEMANTICS", "D02A9-ROOT-A6-FINDING-CARRY"],
  "008": ["D02A9-ROOT-PREDECESSOR-SEMANTICS", "D02A9-ROOT-A6-FINDING-CARRY"],
  "009": ["D02A9-ROOT-PREDECESSOR-SEMANTICS", "D02A9-ROOT-A7-FINDING-CARRY"],
  "010": ["D02A9-ROOT-PREDECESSOR-SEMANTICS", "D02A9-ROOT-A7-FINDING-CARRY"],
  "011": ["D02A9-ROOT-PREDECESSOR-SEMANTICS", "D02A9-ROOT-A7-FINDING-CARRY"],
  "012": ["D02A9-ROOT-PREDECESSOR-SEMANTICS", "D02A9-ROOT-A7-FINDING-CARRY"],
  "013": ["D02A9-ROOT-PREDECESSOR-SEMANTICS", "D02A9-ROOT-PUBLIC-DIRECTIVE"]
};

const admittedEntries = inputSpecs.map(([suffix, logicalPath, role, expectedSha], index) => {
  const bytes = readLogical(logicalPath);
  const actual = extent(bytes);
  if (actual.sha256 !== expectedSha) throw new Error("frozen input mismatch " + logicalPath);
  return {
    ordinal: index + 1,
    inputId: "D02A9-IN-" + suffix,
    inheritedInputId: "D02A8-IN-" + suffix,
    logicalPath,
    role,
    sha256: actual.sha256,
    lines: actual.lines,
    words: actual.words,
    bytes: actual.bytes,
    requiredConsumerRootIds: consumerMap[suffix]
  };
});
const admittedRoot = domainRoot("ADMITTED-INPUT-MANIFEST-V1", admittedEntries);
const admittedManifest = {
  artifactId: "CONNECT-D02-A9-EXACT-ADMITTED-13-INPUT-MANIFEST-2026-08-30",
  manifestVersion: "1.0.0",
  canonicalization: "RFC8785-JCS-INTEGER-SUBSET",
  rootDomain: "CONNECT-D02-A9:ADMITTED-INPUT-MANIFEST-V1",
  entryCount: admittedEntries.length,
  admittedManifestRoot: admittedRoot,
  exactOrderedInputIds: admittedEntries.map((entry) => entry.inputId),
  entries: admittedEntries,
  unconsumedInputCount: 0,
  substitutionPolicy: "SUBSTITUTE-DUPLICATE-OMIT-REORDER-PATH-CHANGE-OR-ORPHAN-BLOCKS"
};

const immediateSpecs = [
  ["A8-SUBJECT", "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-immutable-successor-2026-08-30.md", "IMMEDIATE-PREDECESSOR-SUBJECT"],
  ["A8-CROSSWALK", "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md", "PREDECESSOR-CROSSWALK"],
  ["A8-QA", "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md", "PREDECESSOR-PRODUCER-QA"],
  ["A8-REVIEW", "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-2026-08-30.md", "REMEDIATION-AUTHORITY"],
  ["A8-FINDINGS", "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-findings-manifest-2026-08-30.md", "REMEDIATION-FINDINGS-MANIFEST"]
];

function splitPhysicalLines(bytes) {
  const lines = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 10) {
      lines.push(bytes.subarray(start, index + 1));
      start = index + 1;
    }
  }
  if (start < bytes.length) lines.push(bytes.subarray(start));
  return lines;
}

function classifyLine(text) {
  const body = text.replace(/\r?\n$/, "");
  const trimmed = body.trim();
  if (!trimmed) return "BLANK";
  if (/^#{1,6}\s/u.test(trimmed)) return "HEADING";
  if (/^\|.*\|$/u.test(trimmed)) return "TABLE-ROW";
  if (/^[0-9]+(?:\.[0-9]+)+\s/u.test(trimmed)) return "NUMBERED-CLAUSE";
  if (/^(?:[-*+]\s|[0-9]+\.\s)/u.test(trimmed)) return "LIST-ITEM";
  if (/^```/u.test(trimmed)) return "CODE-FENCE";
  return "PROSE-OR-CODE";
}

function dispositionFor(role, kind, text) {
  if (kind === "BLANK") return ["FORMAT-ONLY", "NONE"];
  if (role === "REMEDIATION-FINDINGS-MANIFEST" || /D02-A8-IHR-F00[1-7]/u.test(text)) {
    const match = text.match(/D02-A8-IHR-F00[1-7]/u);
    return ["REMEDIATION-SOURCE", match ? match[0] : "D02A9-ROOT-A8-FINDING-CLOSURE-CANDIDATES"];
  }
  if (["INDEPENDENT-REVIEW", "FINDINGS-MANIFEST", "CLOSURE-CROSSWALK", "PRODUCER-QA", "PREDECESSOR-CROSSWALK", "PREDECESSOR-PRODUCER-QA", "REMEDIATION-AUTHORITY"].includes(role)) {
    return ["EVIDENCE-ONLY-PRESERVED", "D02A9-ROOT-PREDECESSOR-SEMANTICS"];
  }
  if (/\b(?:Luna|Terra|gpt-[0-9])/iu.test(text)) {
    return ["PRESERVED-AS-HISTORICAL-CANDIDATE-NOT-AUTHORITY", "D02A9-ROOT-MODEL-SELECTION-AUTHORITY"];
  }
  if (role === "DURABLE-USER-PUBLIC-DIRECTIVE") return ["PRESERVE-AUTHORITY", "D02A9-ROOT-PUBLIC-DIRECTIVE"];
  return ["PRESERVE-AS-SEMANTIC-CONSTRAINT", "D02A9-ROOT-PREDECESSOR-SEMANTICS"];
}

const universeSources = admittedEntries.map((entry) => ({
  sourceId: entry.inputId,
  logicalPath: entry.logicalPath,
  role: entry.role,
  sha256: entry.sha256,
  lines: entry.lines,
  bytes: entry.bytes
})).concat(immediateSpecs.map(([sourceId, logicalPath, role]) => {
  const bytes = readLogical(logicalPath);
  const e = extent(bytes);
  return { sourceId: "D02A9-" + sourceId, logicalPath, role, sha256: e.sha256, lines: e.lines, bytes: e.bytes };
}));

const semanticMembers = [];
for (let sourceIndex2 = 0; sourceIndex2 < universeSources.length; sourceIndex2 += 1) {
  const source = universeSources[sourceIndex2];
  const chunks = splitPhysicalLines(readLogical(source.logicalPath));
  chunks.forEach((rawLine, lineIndex) => {
    const text = rawLine.toString("utf8");
    const kind = classifyLine(text);
    const normalized = text.replace(/\r?\n$/, "").normalize("NFC").replace(/[ \t]+/gu, " ").trim();
    const [disposition, successorTarget] = dispositionFor(source.role, kind, text);
    semanticMembers.push({
      ordinal: semanticMembers.length + 1,
      memberId: "D02A9-SM-" + String(sourceIndex2 + 1).padStart(2, "0") + "-" + String(lineIndex + 1).padStart(4, "0"),
      sourceId: source.sourceId,
      logicalPath: source.logicalPath,
      lineNumber: lineIndex + 1,
      locator: "line:" + String(lineIndex + 1),
      lineKind: kind,
      exactByteLength: rawLine.length,
      exactLineSha256: sha256(rawLine),
      normalizedTextSha256: sha256(Buffer.from(normalized, "utf8")),
      disposition,
      successorTarget,
      normative: !["BLANK", "CODE-FENCE"].includes(kind) && !["INDEPENDENT-REVIEW", "PRODUCER-QA", "PREDECESSOR-PRODUCER-QA"].includes(source.role)
    });
  });
}
const semanticUniverseRoot = domainRoot("TOTAL-PREDECESSOR-SEMANTIC-UNIVERSE-V1", semanticMembers);
const semanticShards = [];
for (let start = 0; start < semanticMembers.length; start += 100) {
  const members = semanticMembers.slice(start, start + 100);
  const suffix = String(semanticShards.length + 1).padStart(3, "0");
  semanticShards.push({
    artifactId: "CONNECT-D02-A9-PREDECESSOR-SEMANTIC-SHARD-" + suffix,
    shardId: "D02A9-SEMANTIC-SHARD-" + suffix,
    ordinal: semanticShards.length + 1,
    firstMemberOrdinal: members[0].ordinal,
    lastMemberOrdinal: members[members.length - 1].ordinal,
    memberCount: members.length,
    memberRoot: domainRoot("PREDECESSOR-SEMANTIC-SHARD-V1", members),
    members
  });
}
const semanticUniverse = {
  artifactId: "CONNECT-D02-A9-TOTAL-PREDECESSOR-SEMANTIC-UNIVERSE-2026-08-30",
  universeVersion: "1.0.0",
  extractionAlgorithm: "EXACT-PHYSICAL-LINE-V1-LF-PRESERVING",
  sourceCount: universeSources.length,
  sources: universeSources,
  memberCount: semanticMembers.length,
  tableRowCount: semanticMembers.filter((m) => m.lineKind === "TABLE-ROW").length,
  numberedClauseCount: semanticMembers.filter((m) => m.lineKind === "NUMBERED-CLAUSE").length,
  blankMemberCount: semanticMembers.filter((m) => m.lineKind === "BLANK").length,
  undispositionedCount: semanticMembers.filter((m) => !m.disposition || !m.successorTarget).length,
  semanticUniverseRoot,
  shardCount: semanticShards.length,
  shards: semanticShards.map((shard) => ({
    ordinal: shard.ordinal,
    shardId: shard.shardId,
    logicalPath: PACKAGE + "/semantic-shards/semantic-shard-" + String(shard.ordinal).padStart(3, "0") + ".json",
    firstMemberOrdinal: shard.firstMemberOrdinal,
    lastMemberOrdinal: shard.lastMemberOrdinal,
    memberCount: shard.memberCount,
    memberRoot: shard.memberRoot
  }))
};

function decodeEntities(text) {
  const named = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/giu, (_, token) => {
    if (token[0] === "#" && token[1].toLowerCase() === "x") return String.fromCodePoint(parseInt(token.slice(2), 16));
    if (token[0] === "#") return String.fromCodePoint(parseInt(token.slice(1), 10));
    return named[token.toLowerCase()];
  });
}

function normalizeHtml(bytes) {
  let text = bytes.toString("utf8");
  text = text.replace(/<!--[^]*?-->/gu, " ")
    .replace(/<(script|style|svg|noscript)\b[^>]*>[^]*?<\/\1>/giu, " ")
    .replace(/<[^>]+>/gu, " ");
  return decodeEntities(text).normalize("NFC").replace(/\s+/gu, " ").trim();
}

function parseHeaders(text) {
  const blocks = text.split(/\r?\n\r?\n/).filter((block) => /^HTTP\//u.test(block));
  const block = blocks[blocks.length - 1] || "";
  const out = {};
  for (const line of block.split(/\r?\n/).slice(1)) {
    const index = line.indexOf(":");
    if (index > 0) out[line.slice(0, index).toLowerCase()] = line.slice(index + 1).trim();
  }
  return out;
}

const sourceSpecs = [
  ["001", "OPENAI-DATA-CONTROLS", "https://developers.openai.com/api/docs/guides/your-data", ["TRAINING-OPT-IN-DISTINCT", "DEFAULT-ABUSE-RETENTION", "ZDR-MAM-APPROVAL", "APPLICATION-STATE-EXCEPTIONS", "PROMPT-CACHE-EXCEPTIONS", "RESIDENCY-CAPABILITY-SPECIFIC"], ["Types of data stored with the OpenAI API", "Zero Data Retention", "Storage requirements and retention controls per endpoint", "Data residency controls"]],
  ["002", "OPENAI-RESPONSES-CREATE", "https://developers.openai.com/api/reference/cli/resources/responses/methods/create", ["RESPONSES-STORE-DIMENSION", "TOOLS-DIMENSION", "PROMPT-OBJECT-FIELD-EXISTS", "PROMPT-CACHE-OPTIONS-DIMENSION"], ["Create a model response", "tools", "tool_choice", "store"]],
  ["003", "OPENAI-FUNCTION-CALLING", "https://developers.openai.com/api/docs/guides/function-calling", ["TOOL-CAPABILITY-NOT-BUSINESS-AUTHORITY"], ["Function calling", "Handling function calls", "Strict mode"]],
  ["004", "OPENAI-MCP-CONNECTORS", "https://developers.openai.com/api/docs/guides/tools-connectors-mcp", ["THIRD-PARTY-TOOL-DATA-PATH", "APPROVAL-CONTROL-DISTINCT"], ["Connectors and MCP servers", "Approvals", "Data sharing"]],
  ["005", "OPENAI-SAFETY-BEST-PRACTICES", "https://developers.openai.com/api/docs/guides/safety-best-practices", ["MODERATION-ADVERSARIAL-HUMAN-REVIEW-DISTINCT"], ["Safety best practices", "Moderation", "Human in the loop"]],
  ["006", "OPENAI-RED-TEAMING", "https://developers.openai.com/api/docs/guides/red-teaming", ["RED-TEAMING-COMPLEMENTS-EVALS"], ["Red teaming", "Test broadly"]],
  ["007", "OPENAI-RBAC", "https://developers.openai.com/api/docs/guides/rbac", ["ORGANIZATION-AND-PROJECT-PERMISSIONS-DISTINCT"], ["Role-based access control", "Organization roles", "Project roles"]],
  ["008", "OPENAI-EVALUATION-BEST-PRACTICES", "https://developers.openai.com/api/docs/guides/evaluation-best-practices", ["REPRESENTATIVE-CASES", "CALIBRATED-HUMAN-JUDGMENT"], ["Evaluation best practices", "Design your eval", "Human feedback"]],
  ["009", "OPENAI-DEPRECATIONS", "https://developers.openai.com/api/docs/deprecations", ["HOSTED-EVALS-2026-SHUTDOWN", "REUSABLE-PROMPTS-2026-SHUTDOWN", "PROMPT-CONTENT-MOVE-TO-APPLICATION"], ["Deprecations", "2026-11-30", "Reusable prompts", "Evals"]],
  ["010", "OPENAI-MODEL-CATALOG", "https://developers.openai.com/api/docs/models", ["MODEL-CATALOG-OBSERVATION-NOT-CONNECT-FITNESS"], ["Models", "Featured models"]],
  ["011", "OPENAI-RETRIEVE-MODEL", "https://developers.openai.com/api/reference/typescript/resources/models/methods/retrieve", ["MODEL-ID-OWNER-CREATED-SHUTDOWN-BASIC-READBACK"], ["Retrieve model", "id", "owned_by"]]
];
const sourceReceiptsList = sourceSpecs.map(([suffix, sourceId, url, claimCodes, claimLocators], index) => {
  const bodyPath = path.join(sourceCaptureRoot, "d02a9-source-" + suffix + ".html");
  const headersPath = path.join(sourceCaptureRoot, "d02a9-source-" + suffix + ".headers");
  if (!fs.existsSync(bodyPath) || !fs.existsSync(headersPath)) throw new Error("source capture missing " + suffix);
  const body = fs.readFileSync(bodyPath);
  const headers = parseHeaders(fs.readFileSync(headersPath, "utf8"));
  const normalized = normalizeHtml(body);
  const receiptCore = {
    ordinal: index + 1,
    receiptId: "D02A9-SRC-" + suffix,
    sourceId,
    request: { method: "GET", url, accept: "text/html", credentialMode: "NONE" },
    response: {
      status: 200,
      resolvedUrl: url,
      contentType: headers["content-type"] || "text/html",
      contentLength: body.length,
      etag: headers.etag || "UNAVAILABLE",
      lastModified: headers["last-modified"] || "UNAVAILABLE",
      rawResponseSha256: sha256(body)
    },
    observation: {
      retrievedAt: SOURCE_CUT,
      extractorId: "CONNECT-HTML-TEXT-V1",
      normalizedTextBytes: Buffer.byteLength(normalized, "utf8"),
      normalizedTextSha256: sha256(Buffer.from(normalized, "utf8")),
      claimCodes,
      claimLocators,
      locatorCommitment: domainRoot("SOURCE-LOCATORS-V1", claimLocators),
      pageBytesPublished: false,
      disclosureMode: "DIGESTS-METADATA-AND-LOCATORS-ONLY"
    },
    freshness: {
      policy: "EXACT-CUT-ONLY-NEW-RETRIEVAL-REQUIRED",
      changeDetector: "COMPARE-RAW-AND-NORMALIZED-DIGESTS-USING-CONNECT-HTML-TEXT-V1",
      terminals: ["SOURCE-UNAVAILABLE", "SOURCE-STALE", "SOURCE-CHANGED", "SOURCE-CONFLICT"]
    },
    acceptance: { state: "OBSERVED-UNACCEPTED", accepted: false, acceptanceRoot: "MISSING", acceptanceCredit: 0 }
  };
  return { ...receiptCore, historicalObservationCommitment: domainRoot("SOURCE-RECEIPT-V1", receiptCore) };
});
const sourceObservationRoot = domainRoot("SOURCE-OBSERVATION-SET-V1", sourceReceiptsList);
const sourceReceipts = {
  artifactId: "CONNECT-D02-A9-DETACHED-OFFICIAL-SOURCE-RECEIPTS-2026-08-30",
  receiptVersion: "1.0.0",
  sourceCut: SOURCE_CUT,
  receiptCount: sourceReceiptsList.length,
  officialDomainEscapeCount: sourceReceiptsList.filter((r) => !new URL(r.request.url).hostname.endsWith("openai.com")).length,
  publishedPageByteCount: 0,
  acceptedCount: 0,
  sourceObservationRoot,
  receipts: sourceReceiptsList,
  offlineReproduction: "RECOMPUTE-EACH-HISTORICAL-COMMITMENT-AND-SET-ROOT-FROM-PUBLISHED-METADATA",
  freshRetrievalContract: "FETCH-TO-DETACHED-CAPTURE-THEN-BOTH-READERS-RECOMPUTE-RAW-AND-NORMALIZED-DIGESTS",
  residualLimit: "DIGESTS-PROVE-IDENTITY-AND-CHANGE-DETECTION-BUT-NOT-SEMANTIC-TRUTH-OR-ACCEPTANCE"
};

const snapshotSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:connect:d02:a9:snapshot-schema:1",
  title: "Connect D02-A9 planning snapshot",
  type: "object",
  additionalProperties: false,
  required: ["artifactId", "schemaVersion", "snapshotId", "snapshotClass", "generatedAt", "safeState", "rootStates", "evidenceStates", "currentTerminal"],
  properties: {
    artifactId: { const: "CONNECT-D02-A9-CURRENT-BLOCKED-SNAPSHOT-2026-08-30" },
    schemaVersion: { const: "1.0.0" },
    snapshotId: { type: "string", pattern: "^D02A9-SNAPSHOT-[0-9]{3}$" },
    snapshotClass: { const: "CURRENT-NON-AUTHORIZING-PLANNING-SNAPSHOT" },
    generatedAt: { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$" },
    safeState: { "$ref": "#/$defs/safeState" },
    rootStates: { type: "array", minItems: 3, maxItems: 3, uniqueItems: true, items: { "$ref": "#/$defs/rootState" } },
    evidenceStates: { type: "array", minItems: 13, maxItems: 13, uniqueItems: true, items: { "$ref": "#/$defs/evidenceState" } },
    currentTerminal: { const: "PROFILE-NOT-ADMITTED" }
  },
  "$defs": {
    safeState: {
      type: "object", additionalProperties: false,
      required: ["aiRuntime", "gate29", "developmentFreeze", "repositoryVisibility", "planningAcceptance", "aiAdmission", "runtimePermit", "acceptanceCount"],
      properties: {
        aiRuntime: { const: "OFF" }, gate29: { const: "BLOCKED" }, developmentFreeze: { const: "ACTIVE" }, repositoryVisibility: { const: "PUBLIC" },
        planningAcceptance: { const: "MISSING" }, aiAdmission: { const: "MISSING" }, runtimePermit: { const: "MISSING" },
        acceptanceCount: { type: "integer", minimum: 0, maximum: 0 }
      }
    },
    rootState: {
      type: "object", additionalProperties: false,
      required: ["ordinal", "rootId", "rootClass", "state", "rootSha256", "version", "acceptanceCredit"],
      properties: {
        ordinal: { type: "integer", minimum: 1, maximum: 3 },
        rootId: { type: "string", enum: ["D02A9-ROOT-PLANNING-ACCEPTANCE", "D02A9-ROOT-AI-ADMISSION", "D02A9-ROOT-RUNTIME-PERMIT"] },
        rootClass: { type: "string", enum: ["D02-PLANNING-CONTRACT-ACCEPTANCE", "AI-PROFILE-ADMISSION", "AI-RUNTIME-PERMIT"] },
        state: { type: "string", enum: ["MISSING", "PRESENT-UNACCEPTED", "ACCEPTED", "EXPIRED", "REVOKED", "CONSUMED", "BLOCKED"] },
        rootSha256: { type: "string", pattern: "^(?:MISSING|[0-9a-f]{64})$" },
        version: { type: "integer", minimum: 0, maximum: 2147483647 },
        acceptanceCredit: { type: "integer", minimum: 0, maximum: 1 }
      }
    },
    evidenceState: {
      type: "object", additionalProperties: false,
      required: ["ordinal", "evidenceId", "state", "rootSha256", "acceptanceCredit"],
      properties: {
        ordinal: { type: "integer", minimum: 1, maximum: 13 }, evidenceId: { type: "string", pattern: "^D02A9-EVIDENCE-[0-9]{3}$" },
        state: { type: "string", enum: ["MISSING", "PRESENT-UNACCEPTED", "ACCEPTED", "EXPIRED", "REVOKED", "BLOCKED"] },
        rootSha256: { type: "string", pattern: "^(?:MISSING|[0-9a-f]{64})$" }, acceptanceCredit: { type: "integer", minimum: 0, maximum: 1 }
      }
    }
  }
};

const transitionSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:connect:d02:a9:transition-schema:1",
  title: "Connect D02-A9 authority transition record",
  type: "object", additionalProperties: false,
  required: ["transitionId", "schemaVersion", "recordClass", "rootId", "rootClass", "fromState", "toState", "event", "previousVersion", "nextVersion", "expectedPreviousRoot", "evidenceRoot", "authorityReceiptRoot", "trustedTime", "expiresAt", "revocationCutRoot", "operationKey", "casResult", "consumptionCount", "postReadback", "controlOnly", "acceptanceCredit"],
  properties: {
    transitionId: { type: "string", pattern: "^D02A9-TR-[0-9]{3}$" }, schemaVersion: { const: "1.0.0" },
    recordClass: { type: "string", enum: ["NON-AUTHORIZING-POSITIVE-CONTROL", "EXTERNAL-EVIDENCE-TRANSITION"] },
    rootId: { type: "string", enum: ["D02A9-ROOT-PLANNING-ACCEPTANCE", "D02A9-ROOT-AI-ADMISSION", "D02A9-ROOT-RUNTIME-PERMIT"] },
    rootClass: { type: "string", enum: ["D02-PLANNING-CONTRACT-ACCEPTANCE", "AI-PROFILE-ADMISSION", "AI-RUNTIME-PERMIT"] },
    fromState: { type: "string", enum: ["MISSING", "PRESENT-UNACCEPTED", "ACCEPTED", "EXPIRED", "REVOKED", "CONSUMED", "BLOCKED"] },
    toState: { type: "string", enum: ["MISSING", "PRESENT-UNACCEPTED", "ACCEPTED", "EXPIRED", "REVOKED", "CONSUMED", "BLOCKED"] },
    event: { type: "string", enum: ["NOOP", "SUBMIT", "ACCEPT", "EXPIRE", "REVOKE", "CONSUME", "REPLAY", "CAS-MISMATCH", "POST-READBACK-MISMATCH", "REPLACE"] },
    previousVersion: { type: "integer", minimum: 0, maximum: 2147483646 }, nextVersion: { type: "integer", minimum: 0, maximum: 2147483647 },
    expectedPreviousRoot: { type: "string", pattern: "^(?:MISSING|[0-9a-f]{64})$" }, evidenceRoot: { type: "string", pattern: "^(?:MISSING|[0-9a-f]{64})$" },
    authorityReceiptRoot: { type: "string", pattern: "^(?:MISSING|CONTROL-[A-Z0-9-]+|[0-9a-f]{64})$" },
    trustedTime: { type: "string", pattern: "^(?:CONTROL-NOT-EXTERNAL|[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)$" },
    expiresAt: { type: "string", pattern: "^(?:NOT-APPLICABLE|CONTROL-NOT-EXTERNAL|[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)$" },
    revocationCutRoot: { type: "string", pattern: "^(?:MISSING|CONTROL-[A-Z0-9-]+|[0-9a-f]{64})$" }, operationKey: { type: "string", pattern: "^[0-9a-f]{64}$" },
    casResult: { type: "string", enum: ["MATCH", "MISMATCH", "NOT-APPLICABLE"] }, consumptionCount: { type: "integer", minimum: 0, maximum: 1 },
    postReadback: { type: "string", enum: ["MATCH", "MISMATCH", "MISSING", "NOT-APPLICABLE"] }, controlOnly: { type: "boolean" },
    acceptanceCredit: { type: "integer", minimum: 0, maximum: 1 }
  }
};

const evidenceNames = ["MODEL-SELECTION", "CONNECT-PROMPT-BYTES", "AI-PROFILE", "ACCOUNT-READBACK", "LEGAL-PRIVACY", "SOURCE-ACCEPTANCE", "APPROVAL-SET", "EVAL-EVIDENCE", "GATE29-PERMIT", "FREEZE-LIFT", "RUNTIME-READBACK", "TRUSTED-TIME-REVOCATION-CAS", "POST-READBACK"];
const currentSnapshot = {
  artifactId: "CONNECT-D02-A9-CURRENT-BLOCKED-SNAPSHOT-2026-08-30", schemaVersion: "1.0.0", snapshotId: "D02A9-SNAPSHOT-001",
  snapshotClass: "CURRENT-NON-AUTHORIZING-PLANNING-SNAPSHOT", generatedAt: SOURCE_CUT,
  safeState: { aiRuntime: "OFF", gate29: "BLOCKED", developmentFreeze: "ACTIVE", repositoryVisibility: "PUBLIC", planningAcceptance: "MISSING", aiAdmission: "MISSING", runtimePermit: "MISSING", acceptanceCount: 0 },
  rootStates: [
    ["D02A9-ROOT-PLANNING-ACCEPTANCE", "D02-PLANNING-CONTRACT-ACCEPTANCE"], ["D02A9-ROOT-AI-ADMISSION", "AI-PROFILE-ADMISSION"], ["D02A9-ROOT-RUNTIME-PERMIT", "AI-RUNTIME-PERMIT"]
  ].map(([rootId, rootClass], index) => ({ ordinal: index + 1, rootId, rootClass, state: "MISSING", rootSha256: "MISSING", version: 0, acceptanceCredit: 0 })),
  evidenceStates: evidenceNames.map((name, index) => ({ ordinal: index + 1, evidenceId: "D02A9-EVIDENCE-" + String(index + 1).padStart(3, "0"), semanticKey: undefined })).map(({ ordinal, evidenceId }, index) => ({ ordinal, evidenceId, state: "MISSING", rootSha256: "MISSING", acceptanceCredit: 0 })),
  currentTerminal: "PROFILE-NOT-ADMITTED"
};

const planningPredicates = ["PACKAGE-ENVELOPE", "AUTHORITY-CHAIN", "PREDECESSOR-SEMANTICS", "PUBLIC-DIRECTIVE", "INDEPENDENT-A9-REVIEW", "A9-SEVEN-FINDING-CLOSURE", "PROGRAM-ACCEPTANCE"];
const aiPredicates = ["MODEL-SELECTION", "CONNECT-PROMPT", "AI-PROFILE", "ACCOUNT", "LEGAL-PRIVACY", "SOURCE-ACCEPTANCE", "APPROVALS", "EVAL"];
const runtimePredicates = ["GATE29", "FREEZE-LIFT", "RUNTIME-ACCOUNT", "TRUSTED-TIME", "REVOCATION-CLEAR", "CAS-MATCH", "SINGLE-USE", "POST-READBACK"];
const allPredicates = [...planningPredicates, ...aiPredicates, ...runtimePredicates];
const invalidationPredicates = ["EXPIRED", "REVOKED", "REPLAY", "CAS-MISMATCH", "POST-READBACK-MISMATCH"];

const transitionRows = [
  ["001", "MISSING", "MISSING", "NOOP"], ["002", "MISSING", "PRESENT-UNACCEPTED", "SUBMIT"], ["003", "PRESENT-UNACCEPTED", "ACCEPTED", "ACCEPT"],
  ["004", "ACCEPTED", "EXPIRED", "EXPIRE"], ["005", "ACCEPTED", "REVOKED", "REVOKE"], ["006", "ACCEPTED", "CONSUMED", "CONSUME"],
  ["007", "CONSUMED", "BLOCKED", "REPLAY"], ["008", "PRESENT-UNACCEPTED", "BLOCKED", "CAS-MISMATCH"], ["009", "ACCEPTED", "BLOCKED", "POST-READBACK-MISMATCH"],
  ["010", "EXPIRED", "PRESENT-UNACCEPTED", "REPLACE"], ["011", "REVOKED", "PRESENT-UNACCEPTED", "REPLACE"], ["012", "BLOCKED", "PRESENT-UNACCEPTED", "REPLACE"]
].map(([suffix, fromState, toState, event], index) => ({ ordinal: index + 1, transitionRuleId: "D02A9-TRULE-" + suffix, fromState, toState, event }));

function controlHash(label) { return sha256(Buffer.from("D02A9-CONTROL:" + label, "utf8")); }
function transitionRecord(suffix, rootId, rootClass, fromState, toState, event, overrides = {}) {
  const previousVersion = fromState === "MISSING" ? 0 : 1;
  const nextVersion = event === "NOOP" ? previousVersion : previousVersion + 1;
  const base = {
    transitionId: "D02A9-TR-" + suffix, schemaVersion: "1.0.0", recordClass: "NON-AUTHORIZING-POSITIVE-CONTROL", rootId, rootClass,
    fromState, toState, event, previousVersion, nextVersion,
    expectedPreviousRoot: fromState === "MISSING" ? "MISSING" : controlHash(suffix + ":PREVIOUS"),
    evidenceRoot: ["MISSING", "BLOCKED"].includes(toState) ? "MISSING" : controlHash(suffix + ":EVIDENCE"),
    authorityReceiptRoot: "CONTROL-NOT-AUTHORITY", trustedTime: "CONTROL-NOT-EXTERNAL", expiresAt: "CONTROL-NOT-EXTERNAL",
    revocationCutRoot: "CONTROL-NOT-AUTHORITY", operationKey: "", casResult: ["ACCEPT", "CONSUME"].includes(event) ? "MATCH" : event === "CAS-MISMATCH" ? "MISMATCH" : "NOT-APPLICABLE",
    consumptionCount: event === "CONSUME" ? 1 : 0, postReadback: event === "POST-READBACK-MISMATCH" ? "MISMATCH" : "NOT-APPLICABLE", controlOnly: true, acceptanceCredit: 0,
    ...overrides
  };
  base.operationKey = domainRoot("TRANSITION-OPERATION-KEY-V1", { transitionId: base.transitionId, rootId: base.rootId, fromState: base.fromState, toState: base.toState, event: base.event, previousVersion: base.previousVersion, nextVersion: base.nextVersion, expectedPreviousRoot: base.expectedPreviousRoot, evidenceRoot: base.evidenceRoot });
  return base;
}

function predicateValues(trueGroups, invalidations = []) {
  return [...allPredicates, ...invalidationPredicates].map((predicateId) => ({ predicateId, value: trueGroups.includes(predicateId) || invalidations.includes(predicateId) }));
}
const planTrue = planningPredicates.slice();
const aiTrue = [...planningPredicates, ...aiPredicates];
const runtimeTrue = [...planningPredicates, ...aiPredicates, ...runtimePredicates];
const positiveControlInputs = [
  ["001", "ALL-MISSING-CURRENT-SAFE-STATE", predicateValues([]), transitionRecord("001", "D02A9-ROOT-PLANNING-ACCEPTANCE", "D02-PLANNING-CONTRACT-ACCEPTANCE", "MISSING", "MISSING", "NOOP")],
  ["002", "PLANNING-SATISFIABLE-HIGHER-ROOTS-BLOCKED", predicateValues(planTrue), transitionRecord("002", "D02A9-ROOT-PLANNING-ACCEPTANCE", "D02-PLANNING-CONTRACT-ACCEPTANCE", "PRESENT-UNACCEPTED", "ACCEPTED", "ACCEPT")],
  ["003", "AI-ADMISSION-SATISFIABLE-RUNTIME-BLOCKED", predicateValues(aiTrue), transitionRecord("003", "D02A9-ROOT-AI-ADMISSION", "AI-PROFILE-ADMISSION", "PRESENT-UNACCEPTED", "ACCEPTED", "ACCEPT")],
  ["004", "RUNTIME-PERMIT-MATHEMATICALLY-SATISFIABLE", predicateValues(runtimeTrue), transitionRecord("004", "D02A9-ROOT-RUNTIME-PERMIT", "AI-RUNTIME-PERMIT", "PRESENT-UNACCEPTED", "ACCEPTED", "ACCEPT")],
  ["005", "EXPIRY-RETURNS-SAFE-BLOCK", predicateValues(runtimeTrue, ["EXPIRED"]), transitionRecord("005", "D02A9-ROOT-AI-ADMISSION", "AI-PROFILE-ADMISSION", "ACCEPTED", "EXPIRED", "EXPIRE")],
  ["006", "REVOCATION-RETURNS-SAFE-BLOCK", predicateValues(runtimeTrue, ["REVOKED"]), transitionRecord("006", "D02A9-ROOT-AI-ADMISSION", "AI-PROFILE-ADMISSION", "ACCEPTED", "REVOKED", "REVOKE")],
  ["007", "REPLAY-RETURNS-SAFE-BLOCK", predicateValues(runtimeTrue, ["REPLAY"]), transitionRecord("007", "D02A9-ROOT-RUNTIME-PERMIT", "AI-RUNTIME-PERMIT", "CONSUMED", "BLOCKED", "REPLAY")],
  ["008", "CAS-MISMATCH-RETURNS-SAFE-BLOCK", predicateValues(runtimeTrue.filter((p) => p !== "CAS-MATCH"), ["CAS-MISMATCH"]), transitionRecord("008", "D02A9-ROOT-RUNTIME-PERMIT", "AI-RUNTIME-PERMIT", "PRESENT-UNACCEPTED", "BLOCKED", "CAS-MISMATCH")],
  ["009", "POST-READBACK-MISMATCH-RETURNS-SAFE-BLOCK", predicateValues(runtimeTrue.filter((p) => p !== "POST-READBACK"), ["POST-READBACK-MISMATCH"]), transitionRecord("009", "D02A9-ROOT-RUNTIME-PERMIT", "AI-RUNTIME-PERMIT", "ACCEPTED", "BLOCKED", "POST-READBACK-MISMATCH")]
].map(([suffix, purpose, predicates, transition], index) => ({ ordinal: index + 1, controlId: "D02A9-PC-" + suffix, purpose, controlOnly: true, authorityCredit: 0, predicates, transition }));

function evaluateControl(control) {
  const map = Object.fromEntries(control.predicates.map((p) => [p.predicateId, p.value]));
  const all = (ids) => ids.every((id) => map[id] === true);
  let planning = all(planningPredicates) ? "ACCEPTED-CONTROL" : "BLOCKED";
  let ai = planning === "ACCEPTED-CONTROL" && all(aiPredicates) ? "ACCEPTED-CONTROL" : "BLOCKED";
  let runtime = ai === "ACCEPTED-CONTROL" && all(runtimePredicates) ? "ACCEPTED-CONTROL" : "BLOCKED";
  let terminal = runtime === "ACCEPTED-CONTROL" ? "CONTROL-SATISFIABLE-NON-AUTHORIZING" : ai === "ACCEPTED-CONTROL" ? "RUNTIME-CONJUNCT-MISSING" : planning === "ACCEPTED-CONTROL" ? "AI-CONJUNCT-MISSING" : "PLANNING-CONJUNCT-MISSING";
  const precedence = [["REPLAY", "REPLAY-BLOCKED"], ["CAS-MISMATCH", "CAS-MISMATCH-BLOCKED"], ["REVOKED", "REVOKED-BLOCKED"], ["EXPIRED", "EXPIRED-BLOCKED"], ["POST-READBACK-MISMATCH", "POST-READBACK-MISMATCH-BLOCKED"]];
  for (const [predicate, value] of precedence) {
    if (map[predicate]) { runtime = "BLOCKED"; if (["REVOKED", "EXPIRED"].includes(predicate)) ai = "BLOCKED"; terminal = value; break; }
  }
  return { controlId: control.controlId, planning, aiAdmission: ai, runtimePermit: runtime, terminal, acceptanceCredit: 0 };
}
const controlActuals = positiveControlInputs.map(evaluateControl);
const positiveControls = {
  artifactId: "CONNECT-D02-A9-NON-AUTHORIZING-POSITIVE-CONTROLS-2026-08-30", controlVersion: "1.0.0",
  predicateOrder: [...allPredicates, ...invalidationPredicates], controlCount: positiveControlInputs.length,
  externalFactCount: 0, acceptanceCredit: 0, controls: positiveControlInputs,
  interpretation: "BOOLEAN-SATISFIABILITY-WITNESSES-ONLY-NOT-FAKE-EXTERNAL-EVIDENCE"
};
const controlOracle = { artifactId: "CONNECT-D02-A9-DETACHED-POSITIVE-CONTROL-ORACLE-2026-08-30", readByReaders: false, expectedToActualFlow: 0, entryCount: controlActuals.length, entries: controlActuals };
const transitionMachine = {
  artifactId: "CONNECT-D02-A9-CLOSED-TRANSITION-MACHINE-2026-08-30", machineVersion: "1.0.0",
  states: ["MISSING", "PRESENT-UNACCEPTED", "ACCEPTED", "EXPIRED", "REVOKED", "CONSUMED", "BLOCKED"],
  terminalPrecedence: ["REPLAY", "CAS-MISMATCH", "REVOKED", "EXPIRED", "POST-READBACK-MISMATCH", "MISSING-CONJUNCT", "CONTROL-SATISFIABLE-NON-AUTHORIZING"],
  allowedTransitions: transitionRows,
  versionRule: "NOOP-KEEPS-VERSION-ALL-OTHER-TRANSITIONS-INCREMENT-BY-ONE",
  casRule: "ACCEPT-AND-CONSUME-REQUIRE-MATCH-CAS-MISMATCH-REQUIRES-MISMATCH",
  replayRule: "CONSUMED-TO-BLOCKED-ONLY-NEVER-SUCCESS",
  recoveryRule: "EXPIRED-REVOKED-OR-BLOCKED-MAY-REPLACE-TO-PRESENT-UNACCEPTED-ONLY",
  positiveControlArtifactId: positiveControls.artifactId,
  detachedOracleArtifactId: controlOracle.artifactId
};

const a8Registry = JSON.parse(readLogical("docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/registry.json").toString("utf8"));
function replacePrefix(value) {
  if (typeof value === "string") return value.replaceAll("D02A8", "D02A9").replaceAll("A8", "A9");
  if (Array.isArray(value)) return value.map(replacePrefix);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replacePrefix(v)]));
  return value;
}
const authorityChain = replacePrefix(a8Registry.authorityChain);
authorityChain.push({ nodeId: "D02A9-AUTH-007", sequence: 7, inputId: "D02A9-A8-SUBJECT", scope: "D02", authorityClass: "IMMUTABLE-EXECUTABLE-SUCCESSOR", predecessorId: "D02A9-AUTH-006", d02Disposition: "PRESERVE-WITH-STRONGER-CONTROLS", modelDisposition: "INHERIT-TYPED-BLOCKED-SELECTION", state: "CANDIDATE-NOT-ACCEPTED" });
const a6Carry = replacePrefix(a8Registry.a6FindingRegistry).map((r) => ({ ...r, candidateDisposition: "PRESERVED-A7-PROPOSAL-NO-INDEPENDENT-CREDIT" }));
const a7Carry = replacePrefix(a8Registry.a7FindingRegistry).map((r) => ({ ...r, candidateDisposition: "PRESERVED-A8-PROPOSAL-NO-INDEPENDENT-CREDIT" }));
const a8FindingSeverities = ["P1", "P1", "P1", "P1", "P2", "P1", "P1"];
const a8FindingClosureCandidates = a8FindingSeverities.map((severity, index) => {
  const findingId = "D02-A8-IHR-F" + String(index + 1).padStart(3, "0");
  return { ordinal: index + 1, findingId, severity, state: "OPEN", candidateDisposition: "A9-CANDIDATE-REMEDIATED", independentClosureRoot: "MISSING", acceptanceCredit: 0, noMergeKey: findingId, mutationGroupId: "D02A9-MG-F" + String(index + 1).padStart(3, "0") };
});

const rootDefinitions = [
  ["INPUT-MANIFEST", "EXACT-ADMITTED-INPUT-MANIFEST", "D02A9-PRODUCER-001", []],
  ["PREDECESSOR-SEMANTICS", "TOTAL-PREDECESSOR-SEMANTIC-UNIVERSE", "D02A9-PRODUCER-002", ["D02A9-ROOT-INPUT-MANIFEST"]],
  ["AUTHORITY-CHAIN", "D02-AUTHORITY-CHAIN", "D02A9-PRODUCER-003", ["D02A9-ROOT-INPUT-MANIFEST"]],
  ["PUBLIC-DIRECTIVE", "DURABLE-PUBLIC-DIRECTIVE", "D02A9-PRODUCER-004", ["D02A9-ROOT-INPUT-MANIFEST"]],
  ["A6-FINDING-CARRY", "A6-FINDING-CARRY", "D02A9-PRODUCER-002", ["D02A9-ROOT-PREDECESSOR-SEMANTICS"]],
  ["A7-FINDING-CARRY", "A7-FINDING-CARRY", "D02A9-PRODUCER-002", ["D02A9-ROOT-PREDECESSOR-SEMANTICS"]],
  ["A8-FINDING-CLOSURE-CANDIDATES", "A8-FINDING-CANDIDATE-CLOSURE", "D02A9-PRODUCER-005", ["D02A9-ROOT-PREDECESSOR-SEMANTICS"]],
  ["SOURCE-OBSERVATION", "OFFICIAL-SOURCE-OBSERVATION", "D02A9-PRODUCER-006", []],
  ["SOURCE-ACCEPTED", "OFFICIAL-SOURCE-ACCEPTANCE", "D02A9-PRODUCER-007", ["D02A9-ROOT-SOURCE-OBSERVATION"]],
  ["MODEL-SELECTION-AUTHORITY", "MODEL-SELECTION-AUTHORITY", "D02A9-PRODUCER-008", []],
  ["PROMPT-ARTIFACT", "CONNECT-PROMPT-BYTES", "D02A9-PRODUCER-009", []],
  ["AI-PROFILE", "AI-PROFILE", "D02A9-PRODUCER-010", []],
  ["ACCOUNT", "ACCOUNT-SNAPSHOT", "D02A9-PRODUCER-011", []],
  ["LEGAL", "LEGAL-PRIVACY-BUNDLE", "D02A9-PRODUCER-012", []],
  ["APPROVAL-SET", "SIX-DOMAIN-APPROVAL-SET", "D02A9-PRODUCER-013", []],
  ["EVAL", "DETACHED-EVAL-EVIDENCE", "D02A9-PRODUCER-014", []],
  ["PACKAGE-ENVELOPE", "ATOMIC-PACKAGE-ENVELOPE", "D02A9-PRODUCER-015", []],
  ["INDEPENDENT-A9-REVIEW", "INDEPENDENT-REVIEW-DISPOSITION", "D02A9-PRODUCER-016", []],
  ["PROGRAM-ACCEPTANCE", "PROGRAM-ACCEPTANCE", "D02A9-PRODUCER-017", []],
  ["PLANNING-ACCEPTANCE", "D02-PLANNING-CONTRACT-ACCEPTANCE", "D02A9-PRODUCER-017", ["D02A9-ROOT-PACKAGE-ENVELOPE", "D02A9-ROOT-AUTHORITY-CHAIN", "D02A9-ROOT-PREDECESSOR-SEMANTICS", "D02A9-ROOT-PUBLIC-DIRECTIVE", "D02A9-ROOT-INDEPENDENT-A9-REVIEW", "D02A9-ROOT-A8-FINDING-CLOSURE-CANDIDATES", "D02A9-ROOT-PROGRAM-ACCEPTANCE"]],
  ["AI-ADMISSION", "AI-PROFILE-ADMISSION", "D02A9-PRODUCER-018", ["D02A9-ROOT-PLANNING-ACCEPTANCE", "D02A9-ROOT-MODEL-SELECTION-AUTHORITY", "D02A9-ROOT-PROMPT-ARTIFACT", "D02A9-ROOT-AI-PROFILE", "D02A9-ROOT-ACCOUNT", "D02A9-ROOT-LEGAL", "D02A9-ROOT-SOURCE-ACCEPTED", "D02A9-ROOT-APPROVAL-SET", "D02A9-ROOT-EVAL"]],
  ["GATE29", "GATE29-PERMIT", "D02A9-PRODUCER-019", ["D02A9-ROOT-PUBLIC-DIRECTIVE"]],
  ["FREEZE-LIFT", "FREEZE-LIFT-AUTHORITY", "D02A9-PRODUCER-020", []],
  ["RUNTIME-ACCOUNT", "RUNTIME-ACCOUNT-READBACK", "D02A9-PRODUCER-011", []],
  ["TRUSTED-TIME", "TRUSTED-TIME-CUT", "D02A9-PRODUCER-021", []],
  ["REVOCATION-CUT", "REVOCATION-CUT", "D02A9-PRODUCER-021", []],
  ["CAS", "COMPARE-AND-SWAP", "D02A9-PRODUCER-022", []],
  ["SINGLE-USE", "SINGLE-USE-CONSUME", "D02A9-PRODUCER-022", ["D02A9-ROOT-CAS"]],
  ["POST-READBACK", "POST-READBACK", "D02A9-PRODUCER-023", []],
  ["RUNTIME-PERMIT", "AI-RUNTIME-PERMIT", "D02A9-PRODUCER-024", ["D02A9-ROOT-AI-ADMISSION", "D02A9-ROOT-GATE29", "D02A9-ROOT-FREEZE-LIFT", "D02A9-ROOT-RUNTIME-ACCOUNT", "D02A9-ROOT-TRUSTED-TIME", "D02A9-ROOT-REVOCATION-CUT", "D02A9-ROOT-CAS", "D02A9-ROOT-SINGLE-USE", "D02A9-ROOT-POST-READBACK"]]
].map(([suffix, rootClass, producerId, orderedDependencyIds], index) => ({ ordinal: index + 1, rootId: "D02A9-ROOT-" + suffix, rootClass, producerId, orderedDependencyIds, successMode: "ALL-OF", failureTerminal: suffix + "-MISSING-OR-INVALID" }));

const producerClasses = {
  "001": ["MECHANICAL-PACKAGE-BUILDER", "D02A9-IN-001", "ACTIVE-NON-AUTHORIZING"], "002": ["MECHANICAL-SEMANTIC-EXTRACTOR", "D02A9-IN-001", "ACTIVE-NON-AUTHORIZING"],
  "003": ["D02-AUTHORITY-BINDER", "D02A9-IN-001", "ACTIVE-NON-AUTHORIZING"], "004": ["PUBLIC-AUTHORITY-BINDER", "D02A9-IN-013", "ACTIVE-NON-AUTHORIZING"],
  "005": ["FINDING-CLOSURE-CANDIDATE-BUILDER", "D02A9-A8-FINDINGS", "ACTIVE-NON-AUTHORIZING"], "006": ["SOURCE-RECEIPT-BUILDER", "OPENAI-OFFICIAL-DOCUMENTATION", "ACTIVE-NON-AUTHORIZING"],
  "007": ["EXTERNAL-SOURCE-ADJUDICATOR", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"], "008": ["PRODUCT-AI-FINANCE-MODEL-AUTHORITY", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"],
  "009": ["CONNECT-PROMPT-OWNER", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"], "010": ["AI-PROFILE-BUILDER", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"],
  "011": ["AUTHENTICATED-ACCOUNT-READBACK", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"], "012": ["LEGAL-PRIVACY-AUTHORITY", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"],
  "013": ["SIX-DOMAIN-APPROVERS", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"], "014": ["INDEPENDENT-EVAL-RUNNERS", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"],
  "015": ["ATOMIC-PACKAGE-SEALER", "D02A9-IN-001", "ACTIVE-NON-AUTHORIZING"], "016": ["INDEPENDENT-A9-REVIEWER", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"],
  "017": ["D02-PROGRAM-ACCEPTOR", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"], "018": ["AI-ADMISSION-AUTHORITY", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"],
  "019": ["GATE29-AUTHORITY", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"], "020": ["FREEZE-LIFT-AUTHORITY", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"],
  "021": ["TRUSTED-TIME-AND-REVOCATION-AUTHORITY", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"], "022": ["CAS-AND-SINGLE-USE-AUTHORITY", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"],
  "023": ["POST-READBACK-AUTHORITY", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"], "024": ["RUNTIME-PERMIT-AUTHORITY", "EXTERNAL-APPOINTMENT-MISSING", "MISSING"]
};
const appointmentRows = Object.entries(producerClasses).map(([suffix, [producerClass, authoritySourceId, appointmentState]], index) => {
  const producerId = "D02A9-PRODUCER-" + suffix;
  return {
    ordinal: index + 1, appointmentId: "D02A9-APPOINTMENT-" + suffix, producerId, producerClass, authoritySourceId,
    scope: "D02-A9-EXACT-ROOT-OUTPUTS", subject: "CONNECT-D02-A9-IMMUTABLE-SUCCESSOR",
    issuedAt: appointmentState === "MISSING" ? "MISSING" : SOURCE_CUT, expiresAt: appointmentState === "MISSING" ? "MISSING" : "NOT-APPLICABLE-NON-AUTHORIZING",
    revocationRoot: "MISSING", appointmentState,
    allowedOutputRootIds: rootDefinitions.filter((root) => root.producerId === producerId).map((root) => root.rootId),
    acceptanceCredit: 0
  };
});
const appointmentsRoot = domainRoot("PRODUCER-APPOINTMENTS-V1", appointmentRows);
const producerAppointments = { artifactId: "CONNECT-D02-A9-EXACT-PRODUCER-APPOINTMENTS-2026-08-30", appointmentVersion: "1.0.0", appointmentCount: appointmentRows.length, appointmentsRoot, selfAuthorityCount: appointmentRows.filter((row) => row.authoritySourceId === row.producerId || row.allowedOutputRootIds.includes(row.authoritySourceId)).length, appointments: appointmentRows };

const dagNodes = rootDefinitions.map((root) => ({ nodeId: root.rootId, nodeClass: root.rootClass, producerId: root.producerId }));
const dagEdges = [];
for (const root of rootDefinitions) {
  for (const dependency of root.orderedDependencyIds) dagEdges.push({ edgeId: "D02A9-EDGE-" + String(dagEdges.length + 1).padStart(3, "0"), from: dependency, to: root.rootId, edgeType: "REQUIRED-ALL-OF" });
}
const dependencyDag = {
  artifactId: "CONNECT-D02-A9-EXACT-DEPENDENCY-DAG-2026-08-30", graphVersion: "1.0.0", edgeDirection: "DEPENDENCY-TO-CONSUMER",
  nodeCount: dagNodes.length, edgeCount: dagEdges.length, nodes: dagNodes, edges: dagEdges,
  prohibitedEdges: [["D02A9-ROOT-GATE29", "D02A9-ROOT-PLANNING-ACCEPTANCE"], ["D02A9-ROOT-FREEZE-LIFT", "D02A9-ROOT-PLANNING-ACCEPTANCE"], ["D02A9-ROOT-RUNTIME-PERMIT", "D02A9-ROOT-AI-ADMISSION"], ["D02A9-ROOT-RUNTIME-PERMIT", "D02A9-ROOT-PLANNING-ACCEPTANCE"]].map(([from, to], index) => ({ prohibitionId: "D02A9-PEDGE-" + String(index + 1).padStart(3, "0"), from, to })),
  exactNodeRoot: domainRoot("DAG-NODES-V1", dagNodes), exactEdgeRoot: domainRoot("DAG-EDGES-V1", dagEdges), expectedCycleCount: 0, expectedDanglingCount: 0
};

const semanticRegistry = {
  artifactId: "CONNECT-D02-A9-SEMANTIC-REGISTRY-2026-08-30", registryVersion: "1.0.0", canonicalization: "RFC8785-JCS-INTEGER-SUBSET",
  safeState: currentSnapshot.safeState, admittedInputManifest: { artifactId: admittedManifest.artifactId, admittedManifestRoot: admittedRoot, exactCount: 13 },
  predecessorSemanticUniverse: { artifactId: semanticUniverse.artifactId, semanticUniverseRoot, exactMemberCount: semanticMembers.length, exactTableRowCount: semanticUniverse.tableRowCount },
  sourceReceiptSet: { artifactId: sourceReceipts.artifactId, sourceObservationRoot, exactCount: 11, acceptedCount: 0 },
  authorityChain,
  authorityConflict: { conflictId: "D02A9-CONFLICT-001", olderNodeId: "D02A9-AUTH-002", newerNodeId: "D02A9-AUTH-003", deterministicCurrentPolicy: "NO-OPERATIONAL-MODEL-SELECTED", resolutionRule: "CURRENT-TYPED-MODEL-SELECTION-AUTHORITY-ALL-OF", unresolvedAmbiguityCount: 0 },
  modelSelectionAuthority: replacePrefix(a8Registry.modelSelectionAuthority), approvalRegistry: replacePrefix(a8Registry.approvalRegistry),
  aiProfileMembers: replacePrefix(a8Registry.aiProfileMembers), promptPolicy: replacePrefix(a8Registry.promptPolicy), accountParentRows: replacePrefix(a8Registry.accountParentRows), accountChildren: replacePrefix(a8Registry.accountChildren), legalPrivacyMembers: replacePrefix(a8Registry.legalPrivacyMembers),
  a6FindingCarry: a6Carry, a7FindingCarry: a7Carry, a8FindingClosureCandidates,
  rootDefinitions, currentRootStates: currentSnapshot.rootStates,
  stateMachine: { artifactId: transitionMachine.artifactId, planningPredicates, aiPredicates, runtimePredicates, invalidationPredicates },
  producerAppointments: { artifactId: producerAppointments.artifactId, appointmentsRoot, exactCount: appointmentRows.length },
  dependencyDag: { artifactId: dependencyDag.artifactId, exactNodeRoot: dependencyDag.exactNodeRoot, exactEdgeRoot: dependencyDag.exactEdgeRoot, nodeCount: dagNodes.length, edgeCount: dagEdges.length },
  officialSourceIds: sourceReceiptsList.map((receipt) => receipt.sourceId),
  publicDirective: { inputId: "D02A9-IN-013", locator: "D18-A2:1.1.4", policy: "PUBLIC", liveReadbackState: "UNKNOWN-NOT-RUN", acceptanceCredit: 0 },
  immutableState: { aiRuntime: "OFF", gate29: "BLOCKED", developmentFreeze: "ACTIVE", repositoryVisibility: "PUBLIC", acceptanceCount: 0, selfAcceptance: 0, productMutationCount: 0, gitMutationCount: 0, githubMutationCount: 0, providerMutationCount: 0 }
};

const vectors = [];
function addVector(finding, phase, artifact, operation, pointer, value, terminal, description) {
  vectors.push({ vectorId: "D02A9-MV-" + String(vectors.length + 1).padStart(4, "0"), findingId: finding, mutationGroupId: "D02A9-MG-" + finding.slice(-4), phase, artifact, operation, pointer, ...(value === undefined ? {} : { value }), description });
  return terminal;
}
const oracleEntries = [];
function v(finding, phase, artifact, operation, pointer, value, terminal, description) {
  addVector(finding, phase, artifact, operation, pointer, value, terminal, description);
  oracleEntries.push({ vectorId: vectors[vectors.length - 1].vectorId, expectedTerminal: terminal });
}
const snapRequired = snapshotSchema.required;
for (const key of snapRequired) v("D02-A8-IHR-F001", "INNER", "snapshot", "DELETE", [key], undefined, "SNAPSHOT-SCHEMA-INVALID", "delete snapshot required " + key);
const trRequired = transitionSchema.required;
for (const key of trRequired) v("D02-A8-IHR-F001", "INNER", "positiveControls", "DELETE", ["controls", 1, "transition", key], undefined, "TRANSITION-SCHEMA-INVALID", "delete transition required " + key);
v("D02-A8-IHR-F001", "INNER", "snapshot", "SET", ["snapshotId"], 7, "SNAPSHOT-SCHEMA-INVALID", "snapshot type");
v("D02-A8-IHR-F001", "INNER", "snapshot", "SET", ["generatedAt"], "invalid-time", "SNAPSHOT-SCHEMA-INVALID", "snapshot pattern");
v("D02-A8-IHR-F001", "INNER", "snapshot", "SET", ["safeState", "gate29"], "OPEN", "SNAPSHOT-SCHEMA-INVALID", "snapshot const");
v("D02-A8-IHR-F001", "INNER", "snapshot", "SET", ["rootStates", 0, "state"], "UNKNOWN", "SNAPSHOT-SCHEMA-INVALID", "snapshot enum");
v("D02-A8-IHR-F001", "INNER", "snapshot", "SET", ["rootStates", 0, "rootSha256"], "bad", "SNAPSHOT-SCHEMA-INVALID", "snapshot pattern nested");
v("D02-A8-IHR-F001", "INNER", "snapshot", "SET", ["rootStates", 0, "ordinal"], 0, "SNAPSHOT-SCHEMA-INVALID", "snapshot lower bound");
v("D02-A8-IHR-F001", "INNER", "snapshot", "SET", ["rootStates", 0, "version"], 2147483648, "SNAPSHOT-SCHEMA-INVALID", "snapshot upper bound");
v("D02-A8-IHR-F001", "INNER", "snapshot", "SET", ["unexpected"], true, "SNAPSHOT-SCHEMA-INVALID", "snapshot unknown field");
v("D02-A8-IHR-F001", "INNER", "positiveControls", "SET", ["controls", 1, "transition", "event"], "UNKNOWN", "TRANSITION-SCHEMA-INVALID", "transition enum");
v("D02-A8-IHR-F001", "INNER", "positiveControls", "SET", ["controls", 1, "transition", "operationKey"], "bad", "TRANSITION-SCHEMA-INVALID", "transition pattern");
v("D02-A8-IHR-F001", "INNER", "positiveControls", "SET", ["controls", 1, "transition", "consumptionCount"], 2, "TRANSITION-SCHEMA-INVALID", "transition maximum");
v("D02-A8-IHR-F001", "INNER", "positiveControls", "SET", ["controls", 1, "transition", "unexpected"], true, "TRANSITION-SCHEMA-INVALID", "transition unknown field");
v("D02-A8-IHR-F001", "INNER", "snapshotSchema", "SET", ["properties", "safeState", "$ref"], "#/$defs/missing", "SCHEMA-DEFINITION-INVALID", "broken ref");

v("D02-A8-IHR-F002", "INNER", "positiveControls", "DELETE", ["controls", 1], undefined, "POSITIVE-CONTROL-INVALID", "missing planning positive control");
v("D02-A8-IHR-F002", "INNER", "positiveControls", "SET", ["controls", 1, "controlOnly"], false, "POSITIVE-CONTROL-INVALID", "control claims authority");
v("D02-A8-IHR-F002", "INNER", "positiveControls", "SET", ["controls", 1, "authorityCredit"], 1, "POSITIVE-CONTROL-INVALID", "control grants credit");
v("D02-A8-IHR-F002", "INNER", "positiveControls", "SET", ["controls", 1, "transition", "nextVersion"], 9, "TRANSITION-SEMANTICS-INVALID", "illegal version transition");
v("D02-A8-IHR-F002", "INNER", "positiveControls", "SET", ["controls", 1, "transition", "casResult"], "MISMATCH", "TRANSITION-SEMANTICS-INVALID", "accept CAS mismatch");
v("D02-A8-IHR-F002", "INNER", "positiveControls", "SET", ["controls", 6, "transition", "toState"], "ACCEPTED", "TRANSITION-SEMANTICS-INVALID", "replay to success");
v("D02-A8-IHR-F002", "INNER", "positiveControls", "SET", ["controls", 4, "predicates", allPredicates.length, "value"], false, "POSITIVE-CONTROL-INVALID", "expiry control removed");
v("D02-A8-IHR-F002", "INNER", "transitionMachine", "DELETE", ["allowedTransitions", 6], undefined, "TRANSITION-MACHINE-INVALID", "remove replay rule");
v("D02-A8-IHR-F002", "INNER", "transitionMachine", "SET", ["terminalPrecedence", 0], "CONTROL-SATISFIABLE-NON-AUTHORIZING", "TRANSITION-MACHINE-INVALID", "negative precedence weakened");

for (const description of ["omit member", "substitute member hash", "add member", "reorder member", "mutate reader A", "mutate reader B", "mutate toolchain", "mutate report A", "mutate report B", "mutate Subject", "mutate crosswalk", "mutate Producer QA"]) {
  v("D02-A8-IHR-F003", "OUTER", "packageEnvelope", "SYNTHETIC", [description], undefined, "PACKAGE-ENVELOPE-INVALID", description);
}

v("D02-A8-IHR-F004", "INNER", "semanticShards", "DELETE", [0, "members", 0], undefined, "SEMANTIC-UNIVERSE-INVALID", "omit semantic member");
v("D02-A8-IHR-F004", "INNER", "semanticShards", "SWAP", [0, "members", 0], undefined, "SEMANTIC-UNIVERSE-INVALID", "reorder semantic members");
v("D02-A8-IHR-F004", "INNER", "semanticShards", "SET", [0, "members", 0, "exactLineSha256"], "0".repeat(64), "SEMANTIC-UNIVERSE-INVALID", "change exact line digest");
v("D02-A8-IHR-F004", "INNER", "semanticShards", "SET", [0, "members", 0, "disposition"], "", "SEMANTIC-UNIVERSE-INVALID", "undisposition member");
const tableIndex = semanticMembers.findIndex((m) => m.lineKind === "TABLE-ROW");
v("D02-A8-IHR-F004", "INNER", "semanticShards", "DELETE", [Math.floor(tableIndex / 100), "members", tableIndex % 100], undefined, "SEMANTIC-UNIVERSE-INVALID", "omit table row");
v("D02-A8-IHR-F004", "INNER", "semanticUniverse", "SET", ["tableRowCount"], semanticUniverse.tableRowCount - 1, "SEMANTIC-UNIVERSE-INVALID", "wrong table denominator");

v("D02-A8-IHR-F005", "INNER", "sourceReceipts", "DELETE", ["receipts", 0], undefined, "SOURCE-RECEIPTS-INVALID", "omit source receipt");
v("D02-A8-IHR-F005", "INNER", "sourceReceipts", "SET", ["receipts", 0, "response", "rawResponseSha256"], "0".repeat(64), "SOURCE-RECEIPTS-INVALID", "raw source digest change");
v("D02-A8-IHR-F005", "INNER", "sourceReceipts", "SET", ["receipts", 0, "observation", "normalizedTextSha256"], "0".repeat(64), "SOURCE-RECEIPTS-INVALID", "normalized digest change");
v("D02-A8-IHR-F005", "INNER", "sourceReceipts", "SET", ["receipts", 0, "response", "status"], 404, "SOURCE-RECEIPTS-INVALID", "unavailable source");
v("D02-A8-IHR-F005", "INNER", "sourceReceipts", "SET", ["receipts", 0, "observation", "extractorId"], "UNKNOWN", "SOURCE-RECEIPTS-INVALID", "extractor substitution");
v("D02-A8-IHR-F005", "INNER", "sourceReceipts", "SET", ["receipts", 0, "observation", "claimLocators", 0], "changed", "SOURCE-RECEIPTS-INVALID", "locator change");
v("D02-A8-IHR-F005", "INNER", "sourceReceipts", "SET", ["receipts", 0, "acceptance", "accepted"], true, "SOURCE-RECEIPTS-INVALID", "observation to acceptance");

v("D02-A8-IHR-F006", "INNER", "dag", "DELETE", ["edges", 0], undefined, "DAG-INVALID", "delete exact edge");
v("D02-A8-IHR-F006", "INNER", "dag", "SWAP", ["edges", 0], undefined, "DAG-INVALID", "reorder exact edge");
v("D02-A8-IHR-F006", "INNER", "dag", "SET", ["edges", 0, "edgeType"], "OPTIONAL", "DAG-INVALID", "edge type mutation");
v("D02-A8-IHR-F006", "INNER", "dag", "SET", ["edges", 0, "from"], "D02A9-ROOT-RUNTIME-PERMIT", "DAG-INVALID", "edge endpoint mutation");
v("D02-A8-IHR-F006", "INNER", "appointments", "DELETE", ["appointments", 0], undefined, "PRODUCER-APPOINTMENT-INVALID", "delete appointment");
v("D02-A8-IHR-F006", "INNER", "appointments", "SET", ["appointments", 0, "producerId"], "UNAPPOINTED", "PRODUCER-APPOINTMENT-INVALID", "producer substitution");
v("D02-A8-IHR-F006", "INNER", "appointments", "SET", ["appointments", 0, "authoritySourceId"], "D02A9-PRODUCER-001", "PRODUCER-APPOINTMENT-INVALID", "self authority");
v("D02-A8-IHR-F006", "INNER", "appointments", "SET", ["appointments", 0, "allowedOutputRootIds"], [], "PRODUCER-APPOINTMENT-INVALID", "output scope removal");

v("D02-A8-IHR-F007", "INNER", "inputManifest", "DELETE", ["entries", 0], undefined, "INPUT-MANIFEST-INVALID", "omit input");
v("D02-A8-IHR-F007", "INNER", "inputManifest", "SWAP", ["entries", 0], undefined, "INPUT-MANIFEST-INVALID", "reorder inputs");
v("D02-A8-IHR-F007", "INNER", "inputManifest", "SET", ["entries", 0, "logicalPath"], admittedEntries[1].logicalPath, "INPUT-MANIFEST-INVALID", "substitute path");
v("D02-A8-IHR-F007", "INNER", "inputManifest", "SET", ["entries", 0, "sha256"], "0".repeat(64), "INPUT-MANIFEST-INVALID", "substitute bytes root");
v("D02-A8-IHR-F007", "INNER", "inputManifest", "SET", ["entries", 0, "inputId"], admittedEntries[1].inputId, "INPUT-MANIFEST-INVALID", "duplicate id");
v("D02-A8-IHR-F007", "INNER", "inputManifest", "SET", ["entries", 0, "requiredConsumerRootIds"], [], "INPUT-MANIFEST-INVALID", "orphan input");
v("D02-A8-IHR-F007", "INNER", "inputManifest", "SET", ["entryCount"], 12, "INPUT-MANIFEST-INVALID", "wrong input denominator");
v("D02-A8-IHR-F007", "INNER", "semanticRegistry", "SET", ["admittedInputManifest", "admittedManifestRoot"], "0".repeat(64), "INPUT-MANIFEST-INVALID", "detached admitted root mismatch");

const mutationCorpus = { artifactId: "CONNECT-D02-A9-FULL-ONE-TO-ONE-MUTATION-CORPUS-2026-08-30", corpusVersion: "1.0.0", expectedToActualFlow: 0, vectorCount: vectors.length, innerVectorCount: vectors.filter((x) => x.phase === "INNER").length, outerVectorCount: vectors.filter((x) => x.phase === "OUTER").length, findingDenominator: 7, vectors };
const mutationOracle = { artifactId: "CONNECT-D02-A9-DETACHED-MUTATION-ORACLE-2026-08-30", oracleVersion: "1.0.0", readByReaders: false, expectedToActualFlow: 0, vectorCount: oracleEntries.length, entries: oracleEntries };

const envelopeSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "urn:connect:d02:a9:package-envelope-schema:1", title: "Connect D02-A9 external atomic package envelope",
  type: "object", additionalProperties: false,
  required: ["artifactId", "envelopeVersion", "namespaceRoot", "logicalPackageRoot", "selfMembership", "memberCount", "memberOrder", "members", "contentRootAlgorithm", "contentRoot", "safeState"],
  properties: {
    artifactId: { const: "CONNECT-D02-A9-EXTERNAL-ATOMIC-PACKAGE-ENVELOPE-2026-08-30" }, envelopeVersion: { const: "1.0.0" }, namespaceRoot: { const: "web" }, logicalPackageRoot: { const: PACKAGE + "/" }, selfMembership: { const: "EXCLUDED-NON-SELF-REFERENTIAL" },
    memberCount: { type: "integer", minimum: 1, maximum: 256 }, memberOrder: { type: "array", minItems: 1, maxItems: 256, uniqueItems: true, items: { type: "string", pattern: "^docs/" } },
    members: { type: "array", minItems: 1, maxItems: 256, uniqueItems: true, items: { "$ref": "#/$defs/member" } },
    contentRootAlgorithm: { const: "SHA256-DOMAIN-SEPARATED-JCS-ORDERED-MEMBER-EXTENTS" }, contentRoot: { type: "string", pattern: "^[0-9a-f]{64}$" }, safeState: { "$ref": "#/$defs/safeState" }
  },
  "$defs": {
    member: { type: "object", additionalProperties: false, required: ["ordinal", "logicalPath", "role", "sha256", "lines", "words", "bytes"], properties: { ordinal: { type: "integer", minimum: 1, maximum: 256 }, logicalPath: { type: "string", pattern: "^docs/" }, role: { type: "string", minLength: 1, maxLength: 96 }, sha256: { type: "string", pattern: "^[0-9a-f]{64}$" }, lines: { type: "integer", minimum: 0, maximum: 1000000 }, words: { type: "integer", minimum: 0, maximum: 10000000 }, bytes: { type: "integer", minimum: 1, maximum: 100000000 } } },
    safeState: snapshotSchema["$defs"].safeState
  }
};

writeJson("snapshot.schema.json", snapshotSchema);
writeJson("transition.schema.json", transitionSchema);
writeJson("envelope.schema.json", envelopeSchema);
writeJson("snapshot.json", currentSnapshot);
writeJson("transition-machine.json", transitionMachine);
writeJson("positive-controls.json", positiveControls);
writeJson("control-oracle.json", controlOracle);
writeJson("admitted-input-manifest.json", admittedManifest);
writeJson("predecessor-semantic-universe.json", semanticUniverse);
semanticShards.forEach((shard) => writeJson("semantic-shards/semantic-shard-" + String(shard.ordinal).padStart(3, "0") + ".json", shard));
writeJson("source-receipts.json", sourceReceipts);
writeJson("producer-appointments.json", producerAppointments);
writeJson("dependency-dag.json", dependencyDag);
writeJson("semantic-registry.json", semanticRegistry);
writeJson("mutation-corpus.json", mutationCorpus);
writeJson("mutation-oracle.json", mutationOracle);

const generationReport = {
  artifactId: "CONNECT-D02-A9-DETERMINISTIC-GENERATION-REPORT-2026-08-30", generatorVersion: "1.0.0", generatedAt: SOURCE_CUT,
  outputCount: 16 + semanticShards.length, admittedInputCount: admittedEntries.length, semanticSourceCount: universeSources.length, semanticMemberCount: semanticMembers.length,
  semanticShardCount: semanticShards.length,
  tableRowCount: semanticUniverse.tableRowCount, sourceReceiptCount: sourceReceiptsList.length, rootDefinitionCount: rootDefinitions.length,
  dagNodeCount: dagNodes.length, dagEdgeCount: dagEdges.length, appointmentCount: appointmentRows.length, positiveControlCount: positiveControlInputs.length,
  mutationVectorCount: vectors.length, innerMutationVectorCount: mutationCorpus.innerVectorCount, outerMutationVectorCount: mutationCorpus.outerVectorCount,
  roots: { admittedManifestRoot: admittedRoot, semanticUniverseRoot, sourceObservationRoot, appointmentsRoot, dagNodeRoot: dependencyDag.exactNodeRoot, dagEdgeRoot: dependencyDag.exactEdgeRoot },
  safeState: currentSnapshot.safeState, acceptanceCredit: 0
};
writeJson("generation-report.json", generationReport);
console.log(JSON.stringify(generationReport));
