#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const packageDir = realpathSync(resolve(process.argv[2] ?? new URL(".", import.meta.url).pathname));
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? resolve(process.argv[reportFlag + 1]) : null;
const repositoryRoot = realpathSync(resolve(packageDir, "../../.."));
const packageLogicalRoot = "docs/planning/three-review-protocol-v1-8-package-2026-08-30";
const semanticShardNames = [
  "semantic-preservation-000001-030000.jsonl",
  "semantic-preservation-030001-057466.jsonl",
];
const publicRegularGitMemberByteLimitExclusive = 50 * 1024 * 1024;
const requiredPayloadNames = [
  "subject.md",
  "normative-registry.json",
  "closure-crosswalk.jsonl",
  "contract-preservation.json",
  "predecessor-finding-preservation.jsonl",
  ...semanticShardNames,
  "causal-vectors.jsonl",
  "causal-source-graph.json",
];
const requiredTools = Object.freeze({
  "DETERMINISTIC-PRODUCER": `${packageLogicalRoot}/generate.mjs`,
  "INDEPENDENT-MECHANICAL-READER-A": `${packageLogicalRoot}/reader-a.mjs`,
  "INDEPENDENT-MECHANICAL-READER-B": `${packageLogicalRoot}/reader-b.rb`,
});
const requiredToolRoles = Object.keys(requiredTools);
const requiredFrozenPaths = [
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/subject.md",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/normative-registry.json",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/requirement-outputs.jsonl",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/closure-crosswalk.jsonl",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/predecessor-closure.jsonl",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/predecessor-clause-crosswalk.jsonl",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/predecessor-semantic-predicates.jsonl",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/causal-vectors.jsonl",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/causal-source-graph.json",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/semantic-use-index.jsonl",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/normative-package-manifest.json",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/generate.mjs",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/reader-a.mjs",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/reader-b.rb",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/qa-reader-a-report.json",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/qa-reader-b-report.json",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/producer-qa.md",
  "docs/planning/three-review-protocol-v1-7-independent-hostile-review-2026-08-30.md",
  "docs/planning/three-review-protocol-v1-7-independent-hostile-review-findings-manifest-2026-08-30.md",
  "docs/planning/three-review-protocol-v1-6-successor-requirements-2026-08-30.md",
  "docs/planning/three-review-protocol-v1-6-successor-requirements-independent-hostile-review-2026-08-30.md",
  "docs/planning/three-review-protocol-v1-6-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md",
  "docs/planning/three-review-protocol-v1-5-successor-requirements-2026-08-29.md",
  "docs/planning/three-review-protocol-v1-5-successor-requirements-independent-hostile-review-findings-manifest-2026-08-29.md",
  "docs/planning/master-plan-three-review-reconciliation-protocol-2026-08-29.md",
  "docs/planning/three-review-intake-and-reconciliation-eligibility-assessment-2026-08-29.md",
  "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v3-2026-08-29.md",
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md",
];

const file = (name) => resolve(packageDir, name);
const logical = (name) => `${packageLogicalRoot}/${name}`;
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
const rooted = (domain, version, ...values) => sha256(frame(domain, version, ...values));
const compareUtf8 = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
const wellFormedString = (value) => {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
};
const canonical = (value) => {
  if (value === null) return "null";
  if (typeof value === "string") {
    if (!wellFormedString(value) || value !== value.normalize("NFC")) throw new Error("invalid or non-NFC string");
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort(compareUtf8).map((key) => `${canonical(key)}:${canonical(value[key])}`).join(",")}}`;
  throw new Error(`non-canonical type ${typeof value}`);
};
const lineCount = (bytes) => {
  if (bytes.length === 0) return 0;
  let count = 0;
  for (const byte of bytes) if (byte === 10) count += 1;
  return bytes.at(-1) === 10 ? count : count + 1;
};
const lineNumberAt = (bytes, offset) => {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (bytes[index] === 10) line += 1;
  return line;
};
const exactSet = (left, right) => left.length === new Set(left).size && right.length === new Set(right).size && [...left].sort(compareUtf8).join("\n") === [...right].sort(compareUtf8).join("\n");
const parseCanonical = (text) => {
  const value = JSON.parse(text);
  if (`${canonical(value)}\n` !== text) throw new Error("non-canonical JSON bytes");
  return value;
};
const readCanonicalJson = (path) => parseCanonical(readFileSync(path, "utf8"));
const readCanonicalJsonl = (path) => {
  const text = readFileSync(path, "utf8");
  if (!text.endsWith("\n")) throw new Error(`JSONL missing final LF: ${path}`);
  return text.slice(0, -1).split("\n").filter(Boolean).map((line) => {
    const value = JSON.parse(line);
    if (canonical(value) !== line) throw new Error(`non-canonical JSONL record: ${path}`);
    return value;
  });
};
const coreRoot = (domain, record, rootField) => {
  const core = Object.fromEntries(Object.entries(record).filter(([key]) => key !== rootField));
  return rooted(domain, "1", canonical(core));
};
const labelRoot = (label) => sha256(Buffer.from(`MPRR-V18-SYMBOLIC-TEST-ROOT:${label}`, "utf8"));

const counters = {
  authorityMismatch: 0,
  canonicalMismatch: 0,
  casMismatch: 0,
  closureMismatch: 0,
  frozenInputMismatch: 0,
  graphMismatch: 0,
  guardMismatch: 0,
  manifestMismatch: 0,
  packageRootMismatch: 0,
  outputModeMismatch: 0,
  parserMismatch: 0,
  pathMismatch: 0,
  predecessorMismatch: 0,
  publicMismatch: 0,
  readerMutationMismatch: 0,
  schemaMismatch: 0,
  semanticMismatch: 0,
  toolRootMismatch: 0,
  unresolvedSchemaReference: 0,
  vectorMismatch: 0,
};
if (reportPath && (reportPath === packageDir || reportPath.startsWith(`${packageDir}/`))) counters.outputModeMismatch += 1;
if (["semantic-preservation.jsonl", "reports/qa-reader-a-report.json", "reports/qa-reader-b-report.json"].some((name) => existsSync(file(name)))) counters.outputModeMismatch += 1;

const manifest = readCanonicalJson(file("normative-package-manifest.json"));
const registry = readCanonicalJson(file("normative-registry.json"));
const closureRows = readCanonicalJsonl(file("closure-crosswalk.jsonl"));
const contractPreservation = readCanonicalJson(file("contract-preservation.json"));
const predecessorRows = readCanonicalJsonl(file("predecessor-finding-preservation.jsonl"));
const semanticShardRows = semanticShardNames.map((name) => readCanonicalJsonl(file(name)));
const semanticRows = semanticShardRows.flat();
const vectors = readCanonicalJsonl(file("causal-vectors.jsonl"));
const graph = readCanonicalJson(file("causal-source-graph.json"));
const immutableReaderPaths = [...requiredPayloadNames, "normative-package-manifest.json", "generate.mjs", "reader-a.mjs", "reader-b.rb"].map(file);
const immutableReaderSnapshot = new Map(immutableReaderPaths.map((path) => {
  const bytes = readFileSync(path);
  return [path, `${sha256(bytes)}:${bytes.length}`];
}));

if (realpathSync(resolve(repositoryRoot, "docs")) !== realpathSync(resolve(packageDir, "../.."))) counters.pathMismatch += 1;
const gitTop = realpathSync(execFileSync("git", ["-C", repositoryRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim());
const gitOrigin = execFileSync("git", ["-C", repositoryRoot, "config", "--get", "remote.origin.url"], { encoding: "utf8" }).trim();
const gitBytes = (...args) => execFileSync("git", ["-C", repositoryRoot, ...args], { maxBuffer: 64 * 1024 * 1024 });
const observedGitHead = gitBytes("rev-parse", "HEAD").toString("utf8").trim();
const observedGitRef = gitBytes("rev-parse", "--abbrev-ref", "HEAD").toString("utf8").trim();
const observedIndexListingRoot = sha256(gitBytes("ls-files", "--stage"));
const observedTrackedDiffRoot = sha256(gitBytes("diff", "--binary", "--", ".", `:(exclude)${packageLogicalRoot}/**`));
const observedExternalUntrackedPaths = gitBytes("ls-files", "--others", "--exclude-standard").toString("utf8").trim().split("\n").filter((path) => path && !path.startsWith(`${packageLogicalRoot}/`)).sort(compareUtf8);
const observedExternalUntrackedSetRoot = rooted("MPRR-V18-EXTERNAL-UNTRACKED-SET", "1", ...observedExternalUntrackedPaths);
const observedGitStateRoot = rooted("MPRR-V18-GIT-STATE", "1", observedGitHead, observedGitRef, observedIndexListingRoot, observedTrackedDiffRoot, observedExternalUntrackedSetRoot);
if (gitTop !== repositoryRoot || gitOrigin !== registry.repositoryIdentity.expectedOrigin || observedGitHead !== registry.repositoryIdentity.expectedGitHead || observedGitRef !== registry.repositoryIdentity.expectedGitRef || observedIndexListingRoot !== registry.repositoryIdentity.indexListingRoot || observedTrackedDiffRoot !== registry.repositoryIdentity.trackedDiffRoot || observedExternalUntrackedSetRoot !== registry.repositoryIdentity.externalUntrackedSetRoot || observedGitStateRoot !== registry.repositoryIdentity.gitStateRoot) counters.pathMismatch += 1;

const payloadPaths = manifest.payloadMembers.map((item) => item.path);
const expectedPayloadPaths = requiredPayloadNames.map(logical);
if (!exactSet(payloadPaths, expectedPayloadPaths)) counters.manifestMismatch += 1;
const payloadCanonicalRecords = [];
for (const member of manifest.payloadMembers) {
  if (isAbsolute(member.path) || member.path.split("/").includes("..") || !expectedPayloadPaths.includes(member.path)) {
    counters.pathMismatch += 1;
    continue;
  }
  const physical = realpathSync(resolve(repositoryRoot, member.path));
  if (!physical.startsWith(`${packageDir}/`)) counters.pathMismatch += 1;
  const bytes = readFileSync(physical);
  if (sha256(bytes) !== member.root || bytes.length !== member.bytes || lineCount(bytes) !== member.lines || bytes.length >= publicRegularGitMemberByteLimitExclusive) counters.manifestMismatch += 1;
  payloadCanonicalRecords.push(canonical(member));
}
if (!exactSet(manifest.producerTools.map((item) => item.role), requiredToolRoles)) counters.toolRootMismatch += 1;
const toolByRole = new Map(manifest.producerTools.map((item) => [item.role, item]));
for (const tool of manifest.producerTools) {
  if (isAbsolute(tool.path) || tool.path.split("/").includes("..") || requiredTools[tool.role] !== tool.path) {
    counters.pathMismatch += 1;
    continue;
  }
  const bytes = readFileSync(resolve(repositoryRoot, tool.path));
  if (sha256(bytes) !== tool.root) counters.toolRootMismatch += 1;
}
const computedPackageRoot = rooted(
  "MPRR-V18-NORMATIVE-PACKAGE",
  "1",
  ...payloadCanonicalRecords.sort(compareUtf8),
  toolByRole.get("DETERMINISTIC-PRODUCER")?.root ?? "",
  toolByRole.get("INDEPENDENT-MECHANICAL-READER-A")?.root ?? "",
  toolByRole.get("INDEPENDENT-MECHANICAL-READER-B")?.root ?? "",
);
if (manifest.packageRootConstructor !== "SHA-256(CPB1(MPRR-V18-NORMATIVE-PACKAGE,1,sorted-canonical-payload-records,generatorRoot,readerARoot,readerBRoot))" || computedPackageRoot !== manifest.packageRoot) counters.packageRootMismatch += 1;

if (!exactSet(manifest.frozenInputs.map((item) => item.path), requiredFrozenPaths) || !exactSet(contractPreservation.sourceUniverse.map((item) => item.path), requiredFrozenPaths)) counters.frozenInputMismatch += 1;
for (const frozen of manifest.frozenInputs) {
  if (isAbsolute(frozen.path) || frozen.path.split("/").includes("..")) {
    counters.pathMismatch += 1;
    continue;
  }
  const physical = realpathSync(resolve(repositoryRoot, frozen.path));
  if (!physical.startsWith(`${repositoryRoot}/`)) counters.pathMismatch += 1;
  const bytes = readFileSync(physical);
  if (sha256(bytes) !== frozen.root || bytes.length !== frozen.bytes || lineCount(bytes) !== frozen.lines) counters.frozenInputMismatch += 1;
}
const sourceUniverseRoot = rooted("MPRR-V18-SOURCE-UNIVERSE", "1", ...contractPreservation.sourceUniverse.map(canonical).sort(compareUtf8));
if (sourceUniverseRoot !== contractPreservation.sourceUniverseRoot || contractPreservation.predecessorPackageRoot !== "495ba345115f7623802adef7d7268ba7a6fe7049e68f9b04866f77f3602b5d39") counters.frozenInputMismatch += 1;

const v17RegistrySnapshot = JSON.parse(readFileSync(resolve(repositoryRoot, "docs/planning/three-review-protocol-v1-7-package-2026-08-30/normative-registry.json"), "utf8"));
const expectedParserProfileIds = ["V15-PREDECESSOR-EXACT-SPAN-1", "V16-FINDING-BLOCK-1", "V16-REQUIREMENT-BLOCK-1", "WHOLE-CARRIER-1"];
if (!exactSet(v17RegistrySnapshot.parserProfiles.map((item) => item.profileId), expectedParserProfileIds)) counters.parserMismatch += 1;
for (const profile of v17RegistrySnapshot.parserProfiles) {
  const core = { mode: profile.mode, profileId: profile.profileId, repositoryRootRule: profile.repositoryRootRule, selectionRule: profile.selectionRule };
  if (rooted("MPRR-V17-PARSER-PROFILE", "1", canonical(core)) !== profile.parserProfileRoot) counters.parserMismatch += 1;
}
const v17CarrierBytes = new Map();
const v17CarrierById = new Map();
for (const carrier of v17RegistrySnapshot.sourceCarriers) {
  if (!requiredFrozenPaths.includes(carrier.path) || isAbsolute(carrier.path) || carrier.path.split("/").includes("..")) {
    counters.parserMismatch += 1;
    continue;
  }
  const physical = realpathSync(resolve(repositoryRoot, carrier.path));
  if (!physical.startsWith(`${repositoryRoot}/`)) counters.parserMismatch += 1;
  const bytes = readFileSync(physical);
  if (sha256(bytes) !== carrier.root || bytes.length !== carrier.bytes || lineCount(bytes) !== carrier.lines) counters.parserMismatch += 1;
  v17CarrierBytes.set(carrier.carrierId, bytes);
  v17CarrierById.set(carrier.carrierId, carrier);
}
const splitBufferLines = (bytes) => {
  const lines = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) if (bytes[index] === 10) {
    lines.push({ byteEndExclusive: index + 1, byteStart: start, bytes: bytes.subarray(start, index + 1) });
    start = index + 1;
  }
  if (start < bytes.length) lines.push({ byteEndExclusive: bytes.length, byteStart: start, bytes: bytes.subarray(start) });
  return lines;
};
const findHeadingBlocks = (bytes, headingPattern, boundaryPattern) => {
  const textValue = bytes.toString("utf8");
  const matches = [...textValue.matchAll(headingPattern)];
  const boundaries = [...textValue.matchAll(boundaryPattern)].map((match) => match.index);
  return matches.map((match, index) => {
    const byteStart = Buffer.byteLength(textValue.slice(0, match.index), "utf8");
    const nextIndex = boundaries.find((boundary) => boundary > match.index) ?? textValue.length;
    const byteEndExclusive = Buffer.byteLength(textValue.slice(0, nextIndex), "utf8");
    return { byteEndExclusive, byteStart, memberId: match[1], ordinal: index + 1, selected: bytes.subarray(byteStart, byteEndExclusive) };
  });
};
const v16SubjectBytes = v17CarrierBytes.get("V16-SUBJECT");
const v16FindingsBytes = v17CarrierBytes.get("V16-FINDINGS");
const requirementBlocks = findHeadingBlocks(v16SubjectBytes, /^## 2\.\d+ `(MPRR-V16-REQ-\d{3})` — (.+)$/gm, /^#{1,2} /gm);
const findingBlocks = findHeadingBlocks(v16FindingsBytes, /^### \d+\.\d+ (MPRR-V16-IHR-F\d{3}) — (.+)$/gm, /^#{1,3} /gm);
const v16PredecessorRows = splitBufferLines(v16SubjectBytes)
  .map((line) => ({ ...line, text: line.bytes.toString("utf8").trimEnd() }))
  .filter((line) => line.text.startsWith("{") && line.text.includes('"rowId":"MPRR-V16-XW-'))
  .map((line) => JSON.parse(line.text));
if (requirementBlocks.length !== 112 || findingBlocks.length !== 31 || v16PredecessorRows.length !== 323) counters.parserMismatch += 1;
const predecessorNamespaceSpecs = {
  V15HR: { carrierId: "V15-FINDINGS", namespaceId: "V15-FINDINGS" },
  V15REQ: { carrierId: "V15-SUBJECT", namespaceId: "V15-REQUIREMENTS" },
  V15XW: { carrierId: "V15-SUBJECT", namespaceId: "V15-CROSSWALK" },
};
const predecessorBlocksByNamespace = new Map(Object.values(predecessorNamespaceSpecs).map((item) => [item.namespaceId, []]));
for (const row of v16PredecessorRows) {
  const spec = predecessorNamespaceSpecs[row.sourceNamespaceId];
  const span = String(row.sourceSpan).match(/^(\d+)-(\d+)$/);
  if (!spec || !span) { counters.parserMismatch += 1; continue; }
  const bytes = v17CarrierBytes.get(spec.carrierId);
  const byteStart = Number(span[1]);
  const byteEndExclusive = Number(span[2]);
  const selected = bytes?.subarray(byteStart, byteEndExclusive);
  if (!selected || byteStart < 0 || byteEndExclusive <= byteStart || byteEndExclusive > bytes.length || sha256(selected) !== row.sourceMemberDigest) { counters.parserMismatch += 1; continue; }
  predecessorBlocksByNamespace.get(spec.namespaceId).push({ byteEndExclusive, byteStart, memberId: row.sourceMemberId, selected });
}
const parserById = new Map(v17RegistrySnapshot.parserProfiles.map((item) => [item.profileId, item]));
const namespaceSpecs = [
  ["V16-REQUIREMENTS", "V16-SUBJECT", "V16-REQUIREMENT-BLOCK-1", requirementBlocks, "MPRR-V16-REQ-[0-9]{3}"],
  ["V16-FINDINGS", "V16-FINDINGS", "V16-FINDING-BLOCK-1", findingBlocks, "MPRR-V16-IHR-F[0-9]{3}"],
  ["V15-FINDINGS", "V15-FINDINGS", "V15-PREDECESSOR-EXACT-SPAN-1", predecessorBlocksByNamespace.get("V15-FINDINGS"), "MPRR-V15-HR-F[0-9]{3}"],
  ["V15-REQUIREMENTS", "V15-SUBJECT", "V15-PREDECESSOR-EXACT-SPAN-1", predecessorBlocksByNamespace.get("V15-REQUIREMENTS"), "MPRR-V15-REQ-[0-9]{3}"],
  ["V15-CROSSWALK", "V15-SUBJECT", "V15-PREDECESSOR-EXACT-SPAN-1", predecessorBlocksByNamespace.get("V15-CROSSWALK"), "MPRR-V15-XW-[0-9]{3}"],
  ...v17RegistrySnapshot.sourceCarriers.map((carrier) => [`CARRIER-${carrier.carrierId}`, carrier.carrierId, "WHOLE-CARRIER-1", [{ byteEndExclusive: carrier.bytes, byteStart: 0, memberId: `CARRIER-${carrier.carrierId}`, selected: v17CarrierBytes.get(carrier.carrierId) }], `CARRIER-${carrier.carrierId}`]),
];
const discoveredParserMembers = [];
const discoveredParserNamespaces = [];
for (const [namespaceId, carrierId, profileId, blocks, selector] of namespaceSpecs) {
  const carrier = v17CarrierById.get(carrierId);
  const bytes = v17CarrierBytes.get(carrierId);
  if (!carrier || !bytes || !parserById.has(profileId) || !blocks) { counters.parserMismatch += 1; continue; }
  const sortedBlocks = [...blocks].sort((left, right) => left.byteStart - right.byteStart);
  if (new Set(sortedBlocks.map((block) => block.memberId)).size !== sortedBlocks.length || sortedBlocks.some((block, index) => index > 0 && sortedBlocks[index - 1].byteEndExclusive > block.byteStart)) counters.parserMismatch += 1;
  const cores = sortedBlocks.map((block) => {
    const core = {
      byteEndExclusive: block.byteEndExclusive,
      byteStart: block.byteStart,
      carrierId,
      carrierRoot: carrier.root,
      lineEndExclusive: lineNumberAt(bytes, block.byteEndExclusive),
      lineStartInclusive: lineNumberAt(bytes, block.byteStart),
      memberDigest: sha256(block.selected),
      memberId: block.memberId,
      namespaceId,
      parserProfileRoot: parserById.get(profileId).parserProfileRoot,
      schema: "MPRR-V17-MEMBER-CORE-1",
    };
    return { ...core, memberCoreRoot: rooted("MPRR-V17-MEMBER-CORE", "1", canonical(core)) };
  });
  const memberSetRoot = rooted("MPRR-V17-MEMBER-SET", "1", ...cores.map((item) => item.memberCoreRoot).sort(compareUtf8));
  const namespaceCore = { carrierId, carrierRoot: carrier.root, custodyLocator: carrier.custodyLocator, memberCount: cores.length, memberSetRoot, namespaceId, parserProfileRoot: parserById.get(profileId).parserProfileRoot, schema: "MPRR-V17-NAMESPACE-CORE-1", selector };
  const namespaceRoot = rooted("MPRR-V17-NAMESPACE", "1", canonical(namespaceCore));
  discoveredParserNamespaces.push({ ...namespaceCore, namespaceRoot });
  cores.forEach((core) => discoveredParserMembers.push({ ...core, namespaceRoot }));
}
if (!exactSet(discoveredParserMembers.map(canonical), v17RegistrySnapshot.sourceMembers.map(canonical)) || !exactSet(discoveredParserNamespaces.map(canonical), v17RegistrySnapshot.sourceNamespaces.map(canonical))) counters.parserMismatch += 1;
const parserRediscoverySetRoot = rooted("MPRR-V18-PARSER-REDISCOVERY-SET", "1", ...[
  ...v17RegistrySnapshot.parserProfiles,
  ...discoveredParserNamespaces,
  ...discoveredParserMembers,
].map(canonical).sort(compareUtf8));
if (parserRediscoverySetRoot !== registry.parserRediscoveryContract.rediscoverySetRoot || registry.parserRediscoveryContract.sourceMemberCount !== discoveredParserMembers.length || registry.parserRediscoveryContract.sourceNamespaceCount !== discoveredParserNamespaces.length) counters.parserMismatch += 1;

const schemaById = new Map(registry.schemas.map((schema) => [schema.schemaId, schema]));
if (schemaById.size !== registry.schemas.length) counters.schemaMismatch += 1;
let validateRecord;
const typeValid = (value, type) => {
  if (type.startsWith("nullable:")) return value === null || typeValid(value, type.slice(9));
  if (type.startsWith("enum:")) return typeof value === "string" && type.slice(5).split("|").includes(value);
  if (type === "string") return typeof value === "string" && wellFormedString(value) && value === value.normalize("NFC");
  if (type === "sha256") return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
  if (type === "uint") return Number.isSafeInteger(value) && value >= 0;
  if (type === "boolean") return typeof value === "boolean";
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "array<object>") return Array.isArray(value) && value.every((item) => item !== null && typeof item === "object" && !Array.isArray(item));
  if (type === "array<string>") return Array.isArray(value) && value.every((item) => typeof item === "string" && wellFormedString(item) && item === item.normalize("NFC"));
  if (type === "array<sha256>") return Array.isArray(value) && value.every((item) => /^[0-9a-f]{64}$/.test(item));
  if (type.startsWith("object:")) return value !== null && typeof value === "object" && !Array.isArray(value) && validateRecord(value, type.slice(7));
  if (type.startsWith("array<object>:")) return Array.isArray(value) && value.every((item) => item !== null && typeof item === "object" && !Array.isArray(item) && validateRecord(item, type.slice(14)));
  return false;
};
validateRecord = (record, schemaId) => {
  const schema = schemaById.get(schemaId);
  if (!schema) return false;
  const keys = Object.keys(record);
  if (schema.unknownFieldPolicy === "REJECT" && keys.some((key) => !Object.hasOwn(schema.fieldTypes, key))) return false;
  if (schema.requiredFields.some((key) => !Object.hasOwn(record, key))) return false;
  return Object.entries(record).every(([key, value]) => Object.hasOwn(schema.fieldTypes, key) && typeValid(value, schema.fieldTypes[key]));
};
for (const schema of registry.schemas) {
  const descriptorValid = Object.values(schema.fieldTypes).every((type) => {
    if (["string", "sha256", "uint", "boolean", "object", "array<object>", "array<string>", "array<sha256>"].includes(type) || type.startsWith("enum:") || type.startsWith("nullable:")) return true;
    if (type.startsWith("object:")) return schemaById.has(type.slice(7));
    if (type.startsWith("array<object>:")) return schemaById.has(type.slice(14));
    return false;
  });
  if (!validateRecord(schema, "SCHEMA-SCHEMA") || Object.keys(schema.fieldTypes).length === 0 || !exactSet(schema.requiredFields, Object.keys(schema.fieldTypes)) || schema.unknownFieldPolicy !== "REJECT" || !descriptorValid || coreRoot("MPRR-V18-SCHEMA", schema, "schemaRoot") !== schema.schemaRoot) counters.schemaMismatch += 1;
}
if (!validateRecord(registry, "SCHEMA-REGISTRY") || !validateRecord(manifest, "SCHEMA-MANIFEST") || !validateRecord(contractPreservation, "SCHEMA-CONTRACT-PRESERVATION") || !validateRecord(registry.authorityState, "SCHEMA-AUTHORITY-STATE") || !validateRecord(manifest.authorityState, "SCHEMA-AUTHORITY-STATE")) counters.schemaMismatch += 1;
for (const [record, schemaId, rootField, domain] of [
  [registry.repositoryIdentity, "SCHEMA-REPOSITORY-IDENTITY", "identityRoot", "MPRR-V18-REPOSITORY-IDENTITY"],
  [registry.canonicalContract, "SCHEMA-CANONICAL-CONTRACT", "canonicalRoot", "MPRR-V18-CANONICAL-CONTRACT"],
  [registry.acceptanceContract, "SCHEMA-ACCEPTANCE-CONTRACT", "acceptanceRoot", "MPRR-V18-ACCEPTANCE-CONTRACT"],
  [registry.casContract, "SCHEMA-CAS-CONTRACT", "casRoot", "MPRR-V18-CAS-CONTRACT"],
  [registry.recoveryContract, "SCHEMA-RECOVERY-CONTRACT", "recoveryRoot", "MPRR-V18-RECOVERY-CONTRACT"],
  [registry.parserRediscoveryContract, "SCHEMA-PARSER-REDISCOVERY-CONTRACT", "contractRoot", "MPRR-V18-PARSER-REDISCOVERY-CONTRACT"],
  [registry.machineExecutionContract, "SCHEMA-MACHINE-EXECUTION-CONTRACT", "contractRoot", "MPRR-V18-MACHINE-EXECUTION-CONTRACT"],
  [registry.publicInvariant, "SCHEMA-PUBLIC-INVARIANT", "publicRoot", "MPRR-V18-PUBLIC-INVARIANT"],
  [registry.governance, "SCHEMA-GOVERNANCE", "governanceRoot", "MPRR-V18-GOVERNANCE"],
  [registry.semanticPreservationContract, "SCHEMA-SEMANTIC-PRESERVATION-CONTRACT", "semanticRoot", "MPRR-V18-SEMANTIC-PRESERVATION-CONTRACT"],
]) {
  if (!validateRecord(record, schemaId) || coreRoot(domain, record, rootField) !== record[rootField]) counters.schemaMismatch += 1;
}
for (const [records, schemaId, rootField, domain] of [
  [registry.controls, "SCHEMA-CONTROL", "controlRoot", "MPRR-V18-CONTROL"],
  [registry.guards, "SCHEMA-GUARD", "guardRoot", "MPRR-V18-GUARD"],
  [registry.machines, "SCHEMA-MACHINE", "machineRoot", "MPRR-V18-MACHINE"],
  [registry.externalInputs, "SCHEMA-EXTERNAL-INPUT", "inputRoot", "MPRR-V18-EXTERNAL-INPUT"],
]) {
  for (const record of records) {
    if (!validateRecord(record, schemaId) || coreRoot(domain, record, rootField) !== record[rootField]) counters.schemaMismatch += 1;
  }
}
const schemaRefs = [];
const collectSchemaRefs = (value) => {
  if (Array.isArray(value)) return value.forEach(collectSchemaRefs);
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if ((key === "schemaId" || key.endsWith("SchemaId")) && typeof child === "string") schemaRefs.push(child);
    if (key === "fieldTypes") continue;
    collectSchemaRefs(child);
  }
};
collectSchemaRefs(registry);
collectSchemaRefs(closureRows);
collectSchemaRefs(predecessorRows);
collectSchemaRefs(semanticRows);
collectSchemaRefs(vectors);
collectSchemaRefs(graph);
for (const schema of registry.schemas) for (const type of Object.values(schema.fieldTypes)) {
  if (type.startsWith("object:")) schemaRefs.push(type.slice(7));
  if (type.startsWith("array<object>:")) schemaRefs.push(type.slice(14));
}
counters.unresolvedSchemaReference += schemaRefs.filter((id) => !schemaById.has(id)).length;

const findingsBytes = readFileSync(resolve(repositoryRoot, "docs/planning/three-review-protocol-v1-7-independent-hostile-review-findings-manifest-2026-08-30.md"));
if (closureRows.length !== 25 || new Set(closureRows.map((row) => row.sourceFindingId)).size !== 25 || new Set(closureRows.map((row) => row.controlId)).size !== 25) counters.closureMismatch += 1;
const controlById = new Map(registry.controls.map((item) => [item.controlId, item]));
const vectorById = new Map(vectors.map((item) => [item.vectorId, item]));
for (const row of closureRows) {
  if (!validateRecord(row, "SCHEMA-CLOSURE") || coreRoot("MPRR-V18-CLOSURE", row, "rowRoot") !== row.rowRoot || row.acceptanceCredit !== 0 || row.independentReceiptState !== "MISSING") counters.closureMismatch += 1;
  if (sha256(findingsBytes.subarray(row.sourceByteStart, row.sourceByteEndExclusive)) !== row.sourceFindingRoot) counters.closureMismatch += 1;
  if (controlById.get(row.controlId)?.findingId !== row.sourceFindingId || row.vectorIds.some((id) => !vectorById.has(id))) counters.closureMismatch += 1;
}

const v17ClosureLines = readFileSync(resolve(repositoryRoot, "docs/planning/three-review-protocol-v1-7-package-2026-08-30/closure-crosswalk.jsonl"), "utf8").trimEnd().split("\n");
if (predecessorRows.length !== 31 || new Set(predecessorRows.map((row) => row.sourceFindingId)).size !== 31) counters.predecessorMismatch += 1;
for (const row of predecessorRows) {
  const line = v17ClosureLines[row.sourceLine - 1];
  if (!validateRecord(row, "SCHEMA-PREDECESSOR-PRESERVATION") || coreRoot("MPRR-V18-PREDECESSOR-PRESERVATION", row, "proofRoot") !== row.proofRoot || !line || sha256(Buffer.from(line, "utf8")) !== row.sourceRecordRoot || row.successorCanonicalRecord !== line || sha256(Buffer.from(row.successorCanonicalRecord, "utf8")) !== row.successorClauseRoot || row.successorClauseRoot !== row.sourceRecordRoot || row.mode !== "NORMATIVE-INCLUSION-BY-EXACT-BYTES" || row.acceptanceCredit !== 0) counters.predecessorMismatch += 1;
}

const semanticSources = new Map();
for (const path of [
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/predecessor-semantic-predicates.jsonl",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/semantic-use-index.jsonl",
]) semanticSources.set(path, readFileSync(resolve(repositoryRoot, path), "utf8").trimEnd().split("\n"));
const expectedSemanticCount = [...semanticSources.values()].reduce((sum, lines) => sum + lines.length, 0);
const seenSemantic = new Set();
if (semanticRows.length !== expectedSemanticCount) counters.semanticMismatch += 1;
for (const row of semanticRows) {
  const lines = semanticSources.get(row.sourcePath);
  const line = lines?.[row.sourceLine - 1];
  const key = `${row.sourcePath}#${row.sourceLine}`;
  if (seenSemantic.has(key)) counters.semanticMismatch += 1;
  seenSemantic.add(key);
  if (!validateRecord(row, "SCHEMA-EXACT-SEMANTIC-PRESERVATION") || coreRoot("MPRR-V18-SEMANTIC-PRESERVATION", row, "proofRoot") !== row.proofRoot || !line || sha256(Buffer.from(line, "utf8")) !== row.sourceRecordRoot || row.successorCanonicalRecord !== line || sha256(Buffer.from(row.successorCanonicalRecord, "utf8")) !== row.successorClauseRoot || row.successorClauseRoot !== row.sourceRecordRoot || row.mode !== "NORMATIVE-INCLUSION-BY-EXACT-CANONICAL-BYTES" || row.acceptanceCredit !== 0) counters.semanticMismatch += 1;
}
if ([...semanticSources.entries()].some(([path, lines]) => lines.some((_, index) => !seenSemantic.has(`${path}#${index + 1}`)))) counters.semanticMismatch += 1;
const semanticProofSetRoot = rooted("MPRR-V18-SEMANTIC-PROOF-SET", "1", ...semanticRows.map((row) => row.proofRoot).sort(compareUtf8));
const semanticContract = registry.semanticPreservationContract;
const observedSemanticShardMembers = semanticShardNames.map((name, index) => {
  const bytes = readFileSync(file(name));
  const rows = semanticShardRows[index];
  return {
    bytes: bytes.length,
    firstProofId: rows[0]?.proofId ?? "",
    lastProofId: rows.at(-1)?.proofId ?? "",
    lines: lineCount(bytes),
    path: logical(name),
    recordCount: rows.length,
    root: sha256(bytes),
    sequence: index + 1,
  };
});
const semanticShardSetRoot = rooted("MPRR-V18-SEMANTIC-SHARD-SET", "1", ...semanticContract.shardMembers.map(canonical));
if (
  semanticContract.proofCount !== semanticRows.length
  || semanticContract.proofSetRoot !== semanticProofSetRoot
  || !exactSet(semanticContract.sourcePaths, [...semanticSources.keys()])
  || !semanticContract.exactByteIdentityRequired
  || semanticContract.maxShardBytesExclusive !== publicRegularGitMemberByteLimitExclusive
  || semanticContract.shardCount !== semanticShardNames.length
  || canonical(semanticContract.shardMembers) !== canonical(observedSemanticShardMembers)
  || semanticContract.shardSetRoot !== semanticShardSetRoot
  || semanticContract.shardMembers.some((member) => !validateRecord(member, "SCHEMA-SEMANTIC-SHARD") || member.bytes >= publicRegularGitMemberByteLimitExclusive)
  || semanticRows.some((row, index) => row.proofId !== `MPRR-V18-SEMANTIC-PROOF-${String(index + 1).padStart(6, "0")}`)
) counters.semanticMismatch += 1;

const guardById = new Map(registry.guards.map((item) => [item.guardId, item]));
const machineById = new Map(registry.machines.map((item) => [item.machineId, item]));
const modelInvariantRoot = rooted("MPRR-V18-MODEL-INVARIANT", "1", ...[...registry.guards, ...registry.machines].map(canonical).sort(compareUtf8));
let modelInvariantClean = guardById.size === registry.guards.length && machineById.size === registry.machines.length && registry.machineExecutionContract.modelInvariantRoot === modelInvariantRoot && exactSet(registry.machineExecutionContract.guardIds, [...guardById.keys()]) && exactSet(registry.machineExecutionContract.machineIds, [...machineById.keys()]);
for (const machine of registry.machines) {
  const transitionKeys = machine.transitions.map((transition) => `${transition.fromState}\u0000${transition.event}`);
  const valid = new Set(machine.states).size === machine.states.length && new Set(transitionKeys).size === transitionKeys.length && machine.transitions.every((transition) => {
    const guard = guardById.get(transition.guardId);
    return guard && guard.event === transition.event && machine.states.includes(transition.fromState) && machine.states.includes(transition.toState) && ((transition.event === "ALL_VALID" && transition.authorityEffect === "ELIGIBLE-NOT-ISSUED" && transition.terminal === "TERM-PERMIT-ELIGIBLE") || (transition.event === "INPUT_INVALID" && transition.authorityEffect === "NONE" && transition.terminal === "TERM-BLOCKED"));
  }) && machine.states.includes(machine.initialState);
  if (!valid) { counters.guardMismatch += 1; modelInvariantClean = false; }
}
const deriveEvent = (context) => {
  if (!validateRecord(context, "SCHEMA-GUARD-CONTEXT")) return "MALFORMED";
  if (!context.externalValid || !context.semanticValid || !context.independenceValid || !context.casValid || !context.publicValid || !context.timeValid) return "INPUT_INVALID";
  return "ALL_VALID";
};
const executeMachine = (machineId, state, context) => {
  const machine = machineById.get(machineId);
  if (!machine || !machine.states.includes(state)) return { terminal: "TERM-MALFORMED", event: "MALFORMED" };
  const event = deriveEvent(context);
  const candidates = machine.transitions.filter((transition) => transition.fromState === state && transition.event === event);
  if (candidates.length !== 1) return { terminal: "TERM-MALFORMED", event };
  const transition = candidates[0];
  const guard = guardById.get(transition.guardId);
  const guardPass = guard && guard.event === event && guard.requiredTrueFields.every((field) => context[field] === true);
  return guardPass ? { terminal: transition.terminal, event, toState: transition.toState } : { terminal: "TERM-GUARD-REJECTED", event };
};
const exhaustiveContexts = [
  { casValid: true, externalValid: true, independenceValid: true, publicValid: true, semanticValid: true, timeValid: true },
  ...["casValid", "externalValid", "independenceValid", "publicValid", "semanticValid", "timeValid"].map((field) => ({ casValid: true, externalValid: true, independenceValid: true, publicValid: true, semanticValid: true, timeValid: true, [field]: false })),
];
const exhaustiveTerminals = exhaustiveContexts.map((context) => executeMachine("MPRR-V18-MACHINE-ACCEPTANCE", "PENDING", context).terminal);
if (registry.machineExecutionContract.exhaustiveContextCount !== exhaustiveContexts.length || exhaustiveTerminals[0] !== "TERM-PERMIT-ELIGIBLE" || exhaustiveTerminals.slice(1).some((terminal) => terminal !== "TERM-BLOCKED")) { counters.guardMismatch += 1; modelInvariantClean = false; }

const deriveAcceptance = (snapshot, authorityAdapterPresent = false) => {
  const principals = snapshot.principals ?? [];
  const unique = principals.length >= 7 && new Set(principals).size === principals.length;
  const separated = unique && !(snapshot.producerPrincipals ?? []).some((root) => (snapshot.reviewerPrincipals ?? []).includes(root) || root === snapshot.acceptorPrincipal);
  const rootsBound = (snapshot.receiptPackageRoots ?? []).length > 0 && snapshot.receiptPackageRoots.every((root) => root === snapshot.packageRoot);
  const eligible = [snapshot.closureComplete, snapshot.externalReceiptsValid, snapshot.semanticReceiptValid, snapshot.casCommitted, snapshot.publicInvariant, snapshot.timeFresh, snapshot.finalityValid, unique, separated, rootsBound].every(Boolean);
  return {
    Acceptance: eligible && snapshot.executionMode === "AUTHORITATIVE" && authorityAdapterPresent ? 1 : 0,
    Gate29: eligible ? "PERMIT-ELIGIBLE-NOT-ISSUED" : "BLOCKED",
    authorityOutputs: eligible && snapshot.executionMode === "AUTHORITATIVE" && authorityAdapterPresent ? 1 : 0,
    permitEligible: eligible,
  };
};
const currentSnapshot = {
  acceptorPrincipal: null,
  casCommitted: false,
  closureComplete: closureRows.every((row) => row.acceptanceCredit === 1),
  executionMode: "NON-AUTHORITATIVE-QA",
  externalReceiptsValid: registry.externalInputs.every((item) => item.state === "VALID"),
  finalityValid: false,
  packageRoot: manifest.packageRoot,
  principals: [],
  producerPrincipals: [],
  publicInvariant: false,
  receiptPackageRoots: [],
  reviewerPrincipals: [],
  semanticReceiptValid: false,
  timeFresh: false,
};
const derivedAuthority = deriveAcceptance(currentSnapshot, registry.acceptanceContract.authorityAdapterPresent);
const expectedAuthority = {
  Acceptance: derivedAuthority.Acceptance,
  Gate29: derivedAuthority.Gate29 === "PERMIT-ELIGIBLE-NOT-ISSUED" ? "BLOCKED" : derivedAuthority.Gate29,
  authorityOutputs: derivedAuthority.authorityOutputs,
  developmentFreeze: registry.governance.freezeRequired ? "ACTIVE" : "INACTIVE",
  independentReceipt: registry.externalInputs.find((item) => item.inputId === "EXT-INDEPENDENT-SEMANTIC-RECEIPT")?.state === "VALID" ? "VALID" : "MISSING-EXTERNAL-INPUT",
  repository: registry.publicInvariant.requiredVisibility,
};
if (canonical(expectedAuthority) !== canonical(registry.authorityState) || canonical(expectedAuthority) !== canonical(manifest.authorityState)) counters.authorityMismatch += 1;

const canonicalConforms = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return canonical(parsed) === raw;
  } catch {
    return false;
  }
};
const resolveEvidencePath = (record, path) => path.split(".").reduce((value, segment) => value !== null && typeof value === "object" && Object.hasOwn(value, segment) ? value[segment] : undefined, record);
const evaluate = (input, context) => {
  let terminal = "TERM-MALFORMED";
  let permitEligible = false;
  if (input.operation === "PREDECESSOR_VECTOR_INTEGRITY") {
    const lines = readFileSync(resolve(repositoryRoot, input.sourcePath), "utf8").trimEnd().split("\n");
    const original = Buffer.from(lines[input.sourceLine - 1] ?? "", "utf8");
    const mutated = Buffer.from(original);
    if (sha256(original) === input.baselineRoot && input.mutationOffset >= 0 && input.mutationOffset < mutated.length) {
      mutated[input.mutationOffset] ^= input.xorMask;
      terminal = sha256(mutated) !== sha256(original) ? "TERM-SOURCE-MUTATION-DETECTED" : "TERM-MALFORMED";
    }
  } else if (input.operation === "PACKAGE_ROOT_CHECK") {
    const root = rooted("MPRR-V18-NORMATIVE-PACKAGE", "1", ...input.payloadRecords.sort(compareUtf8), ...input.toolRoots);
    terminal = root === input.declaredRoot ? "TERM-MECHANICAL-CLEAN" : "TERM-PACKAGE-INVALID";
  } else if (input.operation === "PARSER_REDISCOVERY") {
    terminal = input.declaredRediscoveryRoot === parserRediscoverySetRoot ? "TERM-MECHANICAL-CLEAN" : "TERM-PARSER-INVALID";
  } else if (input.operation === "TOOL_ROOT_CHECK") {
    terminal = sha256(readFileSync(resolve(repositoryRoot, input.path))) === input.declaredRoot ? "TERM-MECHANICAL-CLEAN" : "TERM-TOOL-INVALID";
  } else if (input.operation === "SET_EQUALITY") {
    terminal = exactSet(input.expected, input.actual) ? "TERM-MECHANICAL-CLEAN" : "TERM-UNIVERSE-INVALID";
  } else if (input.operation === "REPOSITORY_IDENTITY") {
    terminal = context.rootRealpathStable && context.gitOrigin === input.expectedOrigin && context.gitStateRoot === input.expectedGitStateRoot ? "TERM-MECHANICAL-CLEAN" : "TERM-REPOSITORY-INVALID";
  } else if (input.operation === "SCHEMA_RECORD") {
    terminal = validateRecord(input.record, input.schemaId) ? "TERM-MECHANICAL-CLEAN" : "TERM-SCHEMA-INVALID";
  } else if (input.operation === "SCHEMA_REFERENCES") {
    terminal = input.references.every((id) => schemaById.has(id)) ? "TERM-MECHANICAL-CLEAN" : "TERM-SCHEMA-INVALID";
  } else if (input.operation === "CANONICAL_JSON") {
    terminal = canonicalConforms(input.rawJson) ? "TERM-MECHANICAL-CLEAN" : "TERM-CANONICAL-INVALID";
  } else if (input.operation === "ENVELOPE_ROOT") {
    terminal = rooted("MPRR-V18-OUTPUT-ENVELOPE", "1", canonical(input.envelope)) === input.declaredRoot ? "TERM-MECHANICAL-CLEAN" : "TERM-ENVELOPE-INVALID";
  } else if (input.operation === "DETACHED_PACKAGE_BINDING") {
    terminal = validateRecord(input.expectedEnvelope, "SCHEMA-DETACHED-EVIDENCE") && validateRecord(input.receiptEnvelope, "SCHEMA-DETACHED-EVIDENCE") && canonical(input.expectedEnvelope) === canonical(input.receiptEnvelope) ? "TERM-MECHANICAL-CLEAN" : "TERM-BINDING-INVALID";
  } else if (input.operation === "BINDING_PATHS") {
    const valid = input.bindings.length > 0 && input.bindings.every((item) => {
      const left = resolveEvidencePath(input.evidence, item.leftPath);
      const right = resolveEvidencePath(input.evidence, item.rightPath);
      return item.operator === "CANONICAL-STRICT-EQUALS" && item.multiplicity === "EXACTLY-ONE" && left !== undefined && canonical(left) === canonical(right);
    });
    terminal = valid ? "TERM-MECHANICAL-CLEAN" : "TERM-BINDING-INVALID";
  } else if (input.operation === "SEMANTIC_IDENTITY") {
    terminal = input.mode === "NORMATIVE-INCLUSION-BY-EXACT-CANONICAL-BYTES" && input.sourceRoot === input.targetRoot ? "TERM-MECHANICAL-CLEAN" : "TERM-SEMANTIC-INVALID";
  } else if (input.operation === "BYTE_MUTATION") {
    const original = Buffer.from(input.bytesHex, "hex");
    const mutated = Buffer.from(original);
    if (input.offset >= 0 && input.offset < mutated.length) mutated[input.offset] ^= input.xorMask;
    terminal = sha256(original) !== sha256(mutated) ? "TERM-SOURCE-MUTATION-DETECTED" : "TERM-MALFORMED";
  } else if (input.operation === "GRAPH_COVERAGE") {
    terminal = exactSet(input.vectorIds, input.graphVectorIds) && input.oracleToEvaluatorEdges === 0 ? "TERM-MECHANICAL-CLEAN" : "TERM-GRAPH-INVALID";
  } else if (input.operation === "MACHINE_STEP") {
    terminal = executeMachine(input.machineId, input.state, input.context).terminal;
  } else if (input.operation === "EVENT_DERIVATION") {
    const event = deriveEvent(input.context);
    terminal = event === "ALL_VALID" ? "TERM-EVENT-DERIVED" : event === "INPUT_INVALID" ? "TERM-INPUT-INVALID" : "TERM-MALFORMED";
  } else if (input.operation === "MODEL_INVARIANT") {
    terminal = modelInvariantClean && input.declaredModelInvariantRoot === modelInvariantRoot ? "TERM-MECHANICAL-CLEAN" : "TERM-MODEL-INVALID";
  } else if (input.operation === "AUTHORITY_DERIVATION" || input.operation === "ACCEPTANCE_DERIVATION") {
    const actual = deriveAcceptance(input.snapshot, false);
    permitEligible = actual.permitEligible;
    if (input.operation === "AUTHORITY_DERIVATION") terminal = actual.Acceptance === input.claimedAcceptance && actual.authorityOutputs === input.claimedAuthorityOutputs ? "TERM-MECHANICAL-CLEAN" : "TERM-AUTHORITY-MISMATCH";
    else terminal = actual.permitEligible ? "TERM-PERMIT-ELIGIBLE" : "TERM-BLOCKED";
  } else if (input.operation === "NO_SELF_ACCEPTANCE") {
    const actual = deriveAcceptance(input.snapshot, false);
    permitEligible = actual.permitEligible;
    terminal = actual.permitEligible && actual.Acceptance === 0 && actual.authorityOutputs === 0 && !registry.acceptanceContract.authorityAdapterPresent && registry.acceptanceContract.noSelfAcceptance ? "TERM-NO-SELF-ACCEPTANCE" : "TERM-AUTHORITY-MISMATCH";
  } else if (input.operation === "AUTHORITY_STATE_CHECK") {
    terminal = validateRecord(input.claimedState, "SCHEMA-AUTHORITY-STATE") && canonical(input.claimedState) === canonical(expectedAuthority) ? "TERM-MECHANICAL-CLEAN" : "TERM-AUTHORITY-MISMATCH";
  } else if (input.operation === "CAS_TRANSACTION") {
    const comparisonIds = input.comparisons.map((item) => item.comparisonId);
    const headsMatch = exactSet(comparisonIds, registry.casContract.comparisonMemberIds) && input.comparisons.length === 65 && input.comparisons.every((item) => item.expectedRoot === item.observedRoot && item.revocationFresh && !item.revoked);
    const durableSetValid = exactSet(input.durableWriteIds, registry.casContract.durableMemberIds);
    if (!headsMatch) terminal = input.durableWriteIds.length === 0 && input.permitCount === 0 ? "TERM-CAS-ABORTED" : "TERM-RECOVERY-INVALID";
    else if (input.crashPoint === "BEFORE-COMMIT") terminal = "TERM-RECOVERED-NO-WRITE";
    else if (!durableSetValid || input.permitCount > 1) terminal = "TERM-RECOVERY-INVALID";
    else if (input.crashPoint === "AFTER-COMMIT-BEFORE-RESPONSE") terminal = input.receiptDurable ? "TERM-RECOVERED-EXACT-RECEIPT" : "TERM-RECOVERY-INVALID";
    else terminal = input.receiptDurable && input.permitCount === 1 && input.readbackMatches ? "TERM-COMMITTED" : "TERM-REVOKED";
  } else if (input.operation === "RECOVERY_SCHEDULE") {
    const fullCommit = exactSet(input.committedMemberIds, registry.recoveryContract.durableMemberIds);
    const noCommit = input.committedMemberIds.length === 0;
    if (!registry.recoveryContract.crashPoints.includes(input.crashPoint)) terminal = "TERM-RECOVERY-INVALID";
    else if (["BEFORE-COMPARE", "AFTER-COMPARE-BEFORE-COMMIT"].includes(input.crashPoint)) terminal = noCommit ? "TERM-RECOVERED-NO-WRITE" : "TERM-RECOVERY-INVALID";
    else if (!fullCommit) terminal = "TERM-RECOVERY-INVALID";
    else if (input.crashPoint === "AFTER-COMMIT-BEFORE-RESPONSE") terminal = input.exactReceiptAvailable ? "TERM-RECOVERED-EXACT-RECEIPT" : "TERM-RECOVERY-INVALID";
    else terminal = input.exactReceiptAvailable && input.revocationConsumed ? "TERM-REVOKED" : "TERM-RECOVERY-INVALID";
  } else if (input.operation === "EXTERNAL_EVIDENCE") {
    const { receiptRoot, signatureRoot, ...receiptCore } = input.receipt;
    const computedReceiptRoot = rooted("MPRR-V18-EXTERNAL-RECEIPT", "1", canonical(receiptCore));
    const computedSignatureRoot = rooted("MPRR-V18-REFERENCE-SIGNATURE", "1", input.receipt.issuerRoot, computedReceiptRoot);
    const valid = validateRecord(input.receipt, "SCHEMA-EXTERNAL-RECEIPT") && receiptRoot === computedReceiptRoot && signatureRoot === computedSignatureRoot && input.trustedIssuerRoots.includes(input.receipt.issuerRoot) && input.receipt.fresh && !input.receipt.revoked && input.receipt.packageRoot === input.expectedPackageRoot && input.receipt.manifestRoot === input.expectedManifestRoot && input.receipt.subjectRoot === input.expectedSubjectRoot && input.receipt.audience === input.expectedAudience && input.receipt.purpose === input.expectedPurpose;
    terminal = valid ? "TERM-MECHANICAL-CLEAN" : "TERM-EXTERNAL-INVALID";
  } else if (input.operation === "PUBLIC_INVARIANT") {
    const { transactionRoot, ...transactionCore } = input.transaction;
    const writeObjectSetRoot = rooted("MPRR-V18-WRITE-OBJECT-SET", "1", ...input.transaction.writeObjectRoots.slice().sort(compareUtf8));
    const computedTransactionRoot = rooted("MPRR-V18-PUSH-TRANSACTION", "1", canonical(transactionCore));
    const receiptsValid = input.scannerReceipts.length === 2 && new Set(input.scannerReceipts.map((item) => item.scannerId)).size === 2 && new Set(input.scannerReceipts.map((item) => item.scannerRoot)).size === 2 && new Set(input.scannerReceipts.map((item) => item.dictionarySealRoot)).size === 1 && input.scannerReceipts.every((item) => {
      const { receiptRoot, ...receiptCore } = item;
      return receiptRoot === rooted("MPRR-V18-SCANNER-RECEIPT", "1", canonical(receiptCore)) && item.transactionRoot === transactionRoot && item.clean && item.candidateCount === 0;
    });
    const valid = input.requiredVisibility === "PUBLIC" && input.observedVisibility === "PUBLIC" && transactionRoot === computedTransactionRoot && input.transaction.writeObjectSetRoot === writeObjectSetRoot && input.transaction.writeObjectRoots.length === new Set(input.transaction.writeObjectRoots).size && receiptsValid;
    terminal = valid ? "TERM-MECHANICAL-CLEAN" : "TERM-PUBLIC-UNSAFE";
  } else if (input.operation === "DEPENDENCY_HEADS") {
    const expectedIds = registry.casContract.comparisonMemberIds.filter((item) => /^CAS-DEPENDENCY-\d{3}$/.test(item));
    const valid = expectedIds.length === 32 && exactSet(input.dependencies.map((item) => item.memberId), expectedIds) && input.dependencies.every((item) => item.readCount === 1 && item.expectedRoot === item.observedRoot && item.revocationFresh && !item.revoked);
    terminal = valid ? "TERM-MECHANICAL-CLEAN" : "TERM-DEPENDENCY-STALE";
  } else if (input.operation === "READER_OUTPUT_MODE") {
    terminal = input.defaultMode === "READ-ONLY" && (!input.writeRequested || input.explicitDetachedOutput) ? "TERM-MECHANICAL-CLEAN" : "TERM-READER-MUTATION-RISK";
  }
  const authorityOutputs = permitEligible && input.executionMode === "AUTHORITATIVE" && context.authorityAdapterPresent ? 1 : 0;
  return { authorityOutputs, permitEligible, stateRoot: rooted("MPRR-V18-ACTUAL-RESULT", "1", terminal, String(permitEligible), String(authorityOutputs)), terminal };
};

const vectorResults = [];
for (const vector of vectors) {
  if (!validateRecord(vector, "SCHEMA-VECTOR") || !validateRecord(vector.input, vector.inputSchemaId) || !validateRecord(vector.oracle, vector.oracleSchemaId) || coreRoot("MPRR-V18-VECTOR", vector, "vectorRoot") !== vector.vectorRoot || rooted("MPRR-V18-VECTOR-INPUT", "1", canonical(vector.input)) !== vector.inputRoot || rooted("MPRR-V18-VECTOR-ORACLE", "1", canonical(vector.oracle)) !== vector.oracleRoot) {
    counters.vectorMismatch += 1;
    continue;
  }
  const evaluationContext = { authorityAdapterPresent: registry.acceptanceContract.authorityAdapterPresent, gitOrigin, gitStateRoot: observedGitStateRoot, repositoryRoot, rootRealpathStable: gitTop === repositoryRoot };
  const actual = evaluate(structuredClone(vector.input), evaluationContext);
  const mutatedOracle = { ...vector.oracle, terminal: `${vector.oracle.terminal}-ORACLE-MUTATION` };
  const metamorphicActual = evaluate(structuredClone(vector.input), evaluationContext);
  if (mutatedOracle.terminal === vector.oracle.terminal || canonical(metamorphicActual) !== canonical(actual)) counters.vectorMismatch += 1;
  const matches = actual.terminal === vector.oracle.terminal && actual.permitEligible === vector.oracle.permitEligible && actual.authorityOutputs === vector.oracle.authorityOutputs;
  if (!matches) counters.vectorMismatch += 1;
  vectorResults.push({ actual, vectorId: vector.vectorId });
}

const nodeIds = graph.nodes.map((node) => node.nodeId);
const edgeIds = graph.edges.map((edge) => edge.edgeId);
if (!validateRecord(graph, "SCHEMA-GRAPH") || graph.nodeCount !== graph.nodes.length || graph.edgeCount !== graph.edges.length || new Set(nodeIds).size !== nodeIds.length || new Set(edgeIds).size !== edgeIds.length || coreRoot("MPRR-V18-CAUSAL-GRAPH", graph, "graphRoot") !== graph.graphRoot) counters.graphMismatch += 1;
const graphVectorIds = new Set(graph.nodes.filter((node) => node.nodeType === "RAW-INPUT").map((node) => node.vectorId));
if (!exactSet([...graphVectorIds], vectors.map((vector) => vector.vectorId))) counters.graphMismatch += 1;
const allowedRelations = new Set(["INPUT-TO-EVALUATOR", "EVALUATOR-TO-ACTUAL", "ACTUAL-TO-COMPARISON", "ORACLE-TO-COMPARISON"]);
if (canonical(graph.requiredOrder) !== canonical(["INPUT-TO-EVALUATOR", "EVALUATOR-TO-ACTUAL", "ACTUAL-TO-COMPARISON", "ORACLE-TO-COMPARISON"])) counters.graphMismatch += 1;
for (const edge of graph.edges) if (!allowedRelations.has(edge.relation) || !nodeIds.includes(edge.from) || !nodeIds.includes(edge.to)) counters.graphMismatch += 1;
const actualByVectorId = new Map(vectorResults.map((item) => [item.vectorId, item.actual]));
for (const vector of vectors) {
  const prefix = `${vector.vectorId}:`;
  const nodes = graph.nodes.filter((node) => node.vectorId === vector.vectorId);
  const edges = graph.edges.filter((edge) => edge.vectorId === vector.vectorId);
  const types = nodes.map((node) => node.nodeType);
  const actualRoot = actualByVectorId.get(vector.vectorId)?.stateRoot ?? "";
  const comparisonRoot = rooted("MPRR-V18-POST-EXECUTION-COMPARISON", "1", actualRoot, vector.oracleRoot);
  const expectedNodes = [
    { nodeId: `${prefix}INPUT`, nodeType: "RAW-INPUT", root: vector.inputRoot, vectorId: vector.vectorId },
    { nodeId: `${prefix}EVALUATOR`, nodeType: "EVALUATOR", root: labelRoot(`EVALUATOR:${vector.input.operation}`), vectorId: vector.vectorId },
    { nodeId: `${prefix}ACTUAL`, nodeType: "ACTUAL-RESULT", root: actualRoot, vectorId: vector.vectorId },
    { nodeId: `${prefix}ORACLE`, nodeType: "EXPECTED-ORACLE", root: vector.oracleRoot, vectorId: vector.vectorId },
    { nodeId: `${prefix}COMPARE`, nodeType: "POST-EXECUTION-COMPARISON", root: comparisonRoot, vectorId: vector.vectorId },
  ];
  const expectedEdges = [
    { edgeId: `${vector.vectorId}:EDGE-1`, from: `${prefix}INPUT`, relation: "INPUT-TO-EVALUATOR", to: `${prefix}EVALUATOR`, vectorId: vector.vectorId },
    { edgeId: `${vector.vectorId}:EDGE-2`, from: `${prefix}EVALUATOR`, relation: "EVALUATOR-TO-ACTUAL", to: `${prefix}ACTUAL`, vectorId: vector.vectorId },
    { edgeId: `${vector.vectorId}:EDGE-3`, from: `${prefix}ACTUAL`, relation: "ACTUAL-TO-COMPARISON", to: `${prefix}COMPARE`, vectorId: vector.vectorId },
    { edgeId: `${vector.vectorId}:EDGE-4`, from: `${prefix}ORACLE`, relation: "ORACLE-TO-COMPARISON", to: `${prefix}COMPARE`, vectorId: vector.vectorId },
  ];
  if (nodes.length !== 5 || edges.length !== 4 || !exactSet(types, ["RAW-INPUT", "EVALUATOR", "ACTUAL-RESULT", "EXPECTED-ORACLE", "POST-EXECUTION-COMPARISON"]) || !exactSet(nodes.map(canonical), expectedNodes.map(canonical)) || !exactSet(edges.map(canonical), expectedEdges.map(canonical))) counters.graphMismatch += 1;
}

const computedCasComparisonSetRoot = rooted("MPRR-V18-CAS-COMPARISON-ID-SET", "1", ...registry.casContract.comparisonMemberIds.slice().sort(compareUtf8));
const computedCasDurableSetRoot = rooted("MPRR-V18-CAS-DURABLE-MEMBER-ID-SET", "1", ...registry.casContract.durableMemberIds.slice().sort(compareUtf8));
if (!registry.casContract.referenceEvaluatorExecutable || registry.casContract.productionAdapterExecutable || registry.casContract.currentAdmissionState !== "BLOCKED-MISSING-EXTERNAL-HEADS" || registry.casContract.comparisonMemberIds.length !== 65 || registry.casContract.durableMemberIds.length !== 17 || new Set(registry.casContract.comparisonMemberIds).size !== 65 || new Set(registry.casContract.durableMemberIds).size !== 17 || registry.casContract.comparisonSetRoot !== computedCasComparisonSetRoot || registry.casContract.durableMemberSetRoot !== computedCasDurableSetRoot || !registry.recoveryContract.referenceEvaluatorExecutable || registry.recoveryContract.productionAdapterExecutable || !exactSet(registry.recoveryContract.durableMemberIds, registry.casContract.durableMemberIds) || registry.recoveryContract.crashPoints.length !== 5) counters.casMismatch += 1;
if (registry.publicInvariant.requiredVisibility !== "PUBLIC" || registry.publicInvariant.requiredScannerCount !== 2 || registry.publicInvariant.currentContinuousReceiptState !== "MISSING-EXTERNAL-INPUT") counters.publicMismatch += 1;
for (const [path, before] of immutableReaderSnapshot) {
  const bytes = readFileSync(path);
  if (`${sha256(bytes)}:${bytes.length}` !== before) counters.readerMutationMismatch += 1;
}

const status = Object.values(counters).every((value) => value === 0) ? "PASS" : "FAIL";
const vectorResultSetRoot = rooted("MPRR-V18-VECTOR-RESULT-SET", "1", ...vectorResults.map(canonical).sort(compareUtf8));
const commonResultRoot = rooted("MPRR-V18-COMMON-QA-RESULT", "1", computedPackageRoot, canonical(counters), vectorResultSetRoot, canonical(expectedAuthority));
const report = {
  ...expectedAuthority,
  commonResultRoot,
  counters,
  manifestRoot: sha256(readFileSync(file("normative-package-manifest.json"))),
  packageRoot: computedPackageRoot,
  readerId: "MPRR-V18-READER-A",
  readerKind: "INDEPENDENT-MECHANICAL;NON-AUTHORITATIVE",
  status,
  vectorResultSetRoot,
  verifiedCounts: {
    closureRows: closureRows.length,
    frozenInputs: manifest.frozenInputs.length,
    graphEdges: graph.edges.length,
    graphNodes: graph.nodes.length,
    predecessorFindingRows: predecessorRows.length,
    schemas: registry.schemas.length,
    semanticPreservationRows: semanticRows.length,
    vectors: vectors.length,
  },
};
if (reportPath) writeFileSync(reportPath, `${canonical(report)}\n`, "utf8");
else process.stdout.write(`${canonical(report)}\n`);
if (status !== "PASS") process.exitCode = 1;
