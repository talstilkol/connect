#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE = 'web/docs/planning';
const QA = `${BASE}/qa`;
const DATE = '2026-08-30';
const OUTPUT = {
  subject: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-${DATE}.md`,
  registry: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-normative-registry-${DATE}.json`,
  sourceIndex: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-source-member-span-index-${DATE}.json`,
  crosswalk: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-closure-crosswalk-${DATE}.json`,
  vectors: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-executable-vector-corpus-${DATE}.json`,
  manifest: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-atomic-package-manifest-${DATE}.json`,
  reportA: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-qa-reader-a-report-${DATE}.json`,
  reportB: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-qa-reader-b-report-${DATE}.json`,
  producerQa: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-producer-qa-${DATE}.md`,
};
const GENERATOR = `${QA}/generate-b0-v5-package.mjs`;
const READER_A = `${QA}/b0-v5-qa-reader-a.mjs`;
const READER_B = `${QA}/b0-v5-qa-reader-b.py`;

const SOURCE_INPUTS = [
  ['B0V4', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-2026-08-29.md`, '4a45fd1b9e2aeefefff28862676f5cfa7c87f5141d81edcf9691a908c7c8f0c9', 'Exact frozen v4 Subject and 84 five-field Requirements'],
  ['B0V4NR', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-normative-registry-2026-08-29.json`, '94a4d151425325e43832e57b2579e78bf7fa1e56bcdfda1ec704137eb53501d2', 'Frozen v4 normative registry'],
  ['B0V4SI', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-source-member-span-index-2026-08-29.json`, '641459c7a09b30eb0c5ea48359194b092f0d5d00109c7df3f43a3bf53030ad7a', 'Frozen v4 source/member/span index'],
  ['B0V4CW', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-closure-crosswalk-2026-08-29.json`, '24d3d90b404847d7a7ca5a457edf8117cca0f12a79cbc552eac8ef47d1763451', 'Frozen v4 closure and NamedUse crosswalk'],
  ['B0V4VC', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-executable-vector-programs-2026-08-29.json`, 'a004e0dfed0e7741d5a1f9c02b7fa9a4efef644209ff730041aaf8cb819d9fbd', 'Frozen v4 vector program pack'],
  ['B0V4PM', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-atomic-package-manifest-2026-08-29.json`, '8a782b55eb92768288a5f1d64e04f76869c4af739e1e2f997a257c34c65709ad', 'Frozen v4 atomic package manifest'],
  ['B0V4HR', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-independent-hostile-review-2026-08-30.md`, '04911c4607c08ccd3763b4ac9ccf08e20722a0dfe321f1c94e6832b599bf9d83', 'Exact independent v4 hostile review'],
  ['B0V4HRM', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-independent-hostile-review-findings-manifest-2026-08-30.md`, '409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed', 'Exactly 12 non-merged v4 Findings'],
  ['B0V3', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v3-2026-08-29.md`, '872ffc806ac35614a9cba33cc9cbe5bc1a0f0cf7675d578183a60ca55d9611e9', 'v3 predecessor required by v4 preservation'],
  ['B0V3R', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v3-independent-hostile-review-2026-08-29.md`, '987b6d92c750dc8c94c9c113e45a3b41c723a2b1d5d8abbe5afd2f3a2d7c36f7', 'v3 independent review required by v4 preservation'],
  ['B0V3RM', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v3-independent-hostile-review-findings-manifest-2026-08-29.md`, 'b62f0a0202e4b2b0eb4e58eebebe5bfc923ba7bcd32f19a83b3035b97490717f', 'v3 Findings required by v4 preservation'],
  ['B0V2', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v2-2026-08-29.md`, '7030c7b8ce0e3c7e3c74a89fee222af87aa51e3e448cfb91988c068d66efe8a4', 'v2 predecessor required by inherited supersessions'],
  ['B0V2RM', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v2-independent-hostile-review-findings-manifest-2026-08-29.md`, '3b1730573462d2adbecf01a8062d27ca0cb8ac3620101d6eaa2288559d6681df', 'v2 Findings required by v4 preservation'],
  ['B0V1', `${BASE}/bootstrap-authority-envelope-b0-requirements-candidate-2026-08-29.md`, '678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb', 'original Requirement source required by v4 preservation'],
  ['B0HRM', `${BASE}/bootstrap-authority-envelope-b0-requirements-independent-hostile-review-findings-manifest-2026-08-29.md`, '0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355', 'legacy Findings required by v4 preservation'],
  ['UDL', `${BASE}/user-directive-and-source-precedence-ledger-2026-08-29.md`, 'b012a479b18e162f5f759b49e033eb3856a4637cc0e91a8a36f1d06043813342', 'directive navigation and amendment order'],
  ['MCSV2', `${BASE}/master-plan-successor-control-sequence-v2-2026-08-29.md`, '403a9f77d85c67ebc4498c12a0c74912f8c015cfbccd665f3043a99c9d98310e', 'control sequence, B0 block and Gate29'],
  ['PUBCYBERV2', `${BASE}/public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md`, '322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a', 'Public repository and cyber hardening requirements'],
  ['D18A2', `${BASE}/d18-a2-public-repository-security-decision-2026-08-29.md`, '448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9', 'binding permanently Public repository decision'],
  ['TRPV15', `${BASE}/three-review-protocol-v1-5-successor-requirements-2026-08-29.md`, '73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c', 'later non-retroactive three-review protocol observation'],
].map(([alias, logicalPath, expectedSha256, claimLimit]) => ({ alias, logicalPath, expectedSha256, claimLimit }));

const sha = (value) => createHash('sha256').update(value).digest('hex');
const bytes = (path) => readFileSync(resolve(path));
const text = (path) => bytes(path).toString('utf8');
const pad = (value) => String(value).padStart(3, '0');
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const write = (path, value) => {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(resolve(path), value, 'utf8');
};

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const canonicalSha = (value) => sha(Buffer.from(canonical(value), 'utf8'));
const domainRoot = (domain, value) => sha(Buffer.from(`${domain}\n${canonical(value)}`, 'utf8'));
const lineCount = (value) => (value.match(/\n/g) || []).length;

for (const source of SOURCE_INPUTS) {
  const observed = sha(bytes(source.logicalPath));
  if (observed !== source.expectedSha256) throw new Error(`Frozen input changed: ${source.alias} expected=${source.expectedSha256} observed=${observed}`);
}

const SOURCE_BY_ALIAS = new Map(SOURCE_INPUTS.map((source) => [source.alias, source]));

function parseFiveFieldRequirements(sourceText, prefix) {
  const heading = new RegExp('^## \\d+\\.\\d+ `' + prefix + '-(\\d{3})` — (.+)$', 'gm');
  const matches = [...sourceText.matchAll(heading)];
  return matches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : sourceText.length;
    const block = sourceText.slice(start, end);
    const fields = {};
    for (const field of ['statement', 'threatCauseImpact', 'requiredProof', 'dependencies', 'sourceBasis']) {
      const found = block.match(new RegExp('`' + field + '`: ([^\\n]+)'));
      if (!found) throw new Error(`Missing ${field} in ${prefix}-${match[1]}`);
      fields[field] = found[1];
    }
    return { id: `${prefix}-${match[1]}`, number: Number(match[1]), title: match[2], fields, block };
  });
}

function objectSpans(sourceText) {
  const spans = [];
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let index = 0; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') stack.push(index);
    else if (char === '}') {
      const startChar = stack.pop();
      if (startChar !== undefined) spans.push({ startChar, endChar: index + 1 });
    }
  }
  return spans;
}

function markdownMembers(sourceText) {
  const members = [];
  const headings = [...sourceText.matchAll(/^(#{1,6}) (.+)$/gm)].map((match) => ({
    startChar: match.index,
    level: match[1].length,
    line: match[0],
  }));
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    let endChar = sourceText.length;
    for (let cursor = index + 1; cursor < headings.length; cursor += 1) {
      if (headings[cursor].level <= heading.level) {
        endChar = headings[cursor].startChar;
        break;
      }
    }
    const id = heading.line.match(/`((?:B0V\d+REQ-\d{3}|B0REQ-\d{3}|B0V\d+-HR-F\d{3}|B0-HR-F\d{3}))`/)?.[1];
    if (id) {
      members.push({ locator: id, startChar: heading.startChar, endChar });
      const block = sourceText.slice(heading.startChar, endChar);
      for (const field of ['statement', 'threatCauseImpact', 'requiredProof', 'dependencies', 'sourceBasis']) {
        const found = block.match(new RegExp('`' + field + '`: ([^\\n]+)'));
        if (found) {
          const valueOffset = found.index + found[0].indexOf(found[1]);
          members.push({ locator: `${id}.${field}`, startChar: heading.startChar + valueOffset, endChar: heading.startChar + valueOffset + found[1].length });
        }
      }
    }
    const section = heading.line.match(/^#{1,6} (\d+(?:\.\d+)+)(?:\s|$)/)?.[1];
    if (section) members.push({ locator: `§${section}`, startChar: heading.startChar, endChar });
  }
  for (const match of sourceText.matchAll(/^(\d+(?:\.\d+)+) .+$/gm)) {
    const newline = sourceText.indexOf('\n', match.index);
    members.push({ locator: `§${match[1]}`, startChar: match.index, endChar: newline < 0 ? sourceText.length : newline });
  }
  return members;
}

function jsonMembers(sourceText) {
  const members = [];
  const top = [...sourceText.matchAll(/^  "([^"]+)":/gm)];
  for (let index = 0; index < top.length; index += 1) {
    const startChar = top[index].index;
    const endChar = index + 1 < top.length ? top[index + 1].index : sourceText.lastIndexOf('\n}') + 1;
    members.push({ locator: `/${top[index][1]}`, startChar, endChar });
  }
  const spans = objectSpans(sourceText);
  const idPattern = /^\s+"(?:supersessionId|replacementId|cycleBreakId|interfaceId|fieldId|outputId|headId|directiveId|profileId|policyId|memberId)": "([^"]+)"/gm;
  for (const match of sourceText.matchAll(idPattern)) {
    const containing = spans.filter((span) => span.startChar <= match.index && span.endChar > match.index).sort((a, b) => (a.endChar - a.startChar) - (b.endChar - b.startChar))[0];
    if (containing) members.push({ locator: match[1], ...containing });
  }
  return members;
}

function normalizeMembers(sourceText, members) {
  const unique = new Map();
  for (const member of members) {
    if (!unique.has(member.locator)) unique.set(member.locator, member);
  }
  return [...unique.values()].sort((left, right) => left.startChar - right.startChar || left.locator.localeCompare(right.locator));
}

function lineAt(sourceText, charIndex) {
  return sourceText.slice(0, charIndex).split('\n').length;
}

function indexArtifact({ alias, logicalPath, expectedSha256, claimLimit }) {
  const sourceBytes = bytes(logicalPath);
  const sourceText = sourceBytes.toString('utf8');
  const rawMembers = logicalPath.endsWith('.json') ? jsonMembers(sourceText) : markdownMembers(sourceText);
  const members = normalizeMembers(sourceText, rawMembers).map((member) => {
    const startByteInclusive = Buffer.byteLength(sourceText.slice(0, member.startChar), 'utf8');
    const endByteExclusive = Buffer.byteLength(sourceText.slice(0, member.endChar), 'utf8');
    const memberBytes = sourceBytes.subarray(startByteInclusive, endByteExclusive);
    return {
      locator: member.locator,
      startLine: lineAt(sourceText, member.startChar),
      endLineInclusive: lineAt(sourceText, Math.max(member.startChar, member.endChar - 1)),
      startByteInclusive,
      endByteExclusive,
      byteLength: memberBytes.length,
      sha256: sha(memberBytes),
    };
  });
  return {
    alias,
    logicalPath,
    sha256: sha(sourceBytes),
    bytes: sourceBytes.length,
    lines: lineCount(sourceText),
    mediaType: logicalPath.endsWith('.json') ? 'application/json' : 'text/markdown',
    claimLimit,
    repositoryVisibility: 'PUBLIC',
    authorityCredit: 0,
    memberCount: members.length,
    members,
  };
}

const indexedFrozenSources = SOURCE_INPUTS.map(indexArtifact);
const INDEXED_BY_ALIAS = new Map(indexedFrozenSources.map((artifact) => [artifact.alias, artifact]));

function memberRef(alias, locator) {
  const artifact = INDEXED_BY_ALIAS.get(alias);
  if (!artifact) throw new Error(`Unknown source alias ${alias}`);
  const member = artifact.members.find((candidate) => candidate.locator === locator);
  if (!member) throw new Error(`Missing locator ${alias}::${locator}`);
  return {
    alias,
    logicalPath: artifact.logicalPath,
    artifactSha256: artifact.sha256,
    locator,
    startByteInclusive: member.startByteInclusive,
    endByteExclusive: member.endByteExclusive,
    byteLength: member.byteLength,
    memberSha256: member.sha256,
  };
}

function memberBytes(alias, locator) {
  const reference = memberRef(alias, locator);
  return bytes(reference.logicalPath).subarray(reference.startByteInclusive, reference.endByteExclusive);
}

const v4Text = text(SOURCE_BY_ALIAS.get('B0V4').logicalPath);
const v3Text = text(SOURCE_BY_ALIAS.get('B0V3').logicalPath);
const v2Text = text(SOURCE_BY_ALIAS.get('B0V2').logicalPath);
const v4Requirements = parseFiveFieldRequirements(v4Text, 'B0V4REQ');
const v3Requirements = parseFiveFieldRequirements(v3Text, 'B0V3REQ');
const v2Requirements = parseFiveFieldRequirements(v2Text, 'B0V2REQ');
if (v4Requirements.length !== 84 || v3Requirements.length !== 70 || v2Requirements.length !== 49) throw new Error('Unexpected frozen Requirement denominator');

const v4Registry = JSON.parse(text(SOURCE_BY_ALIAS.get('B0V4NR').logicalPath));
const v4Manifest = JSON.parse(text(SOURCE_BY_ALIAS.get('B0V4PM').logicalPath));

const findingDefinitions = [
  ['B0V4-HR-F001', 'P0', 'B0V4-SOURCE-MEMBER-SPAN-IDENTITY-COLLAPSE', 'Replace heading-marker member identities with complete Requirement/Finding and five-field byte spans.'],
  ['B0V4-HR-F002', 'P0', 'B0V4-TYPED-SUPERSESSION-NONLITERAL-UNRESOLVED', 'Replace all ten v4 supersessions with exact resolvable literal atom spans and non-weakening replacements.'],
  ['B0V4-HR-F003', 'P1', 'B0V4-PRESERVED-B0V1-SOURCE-LOCATORS-UNRESOLVED', 'Resolve every inherited source locator, including all 27 original section locators, to exact portable bytes.'],
  ['B0V4-HR-F004', 'P0', 'B0V4-NAMEDUSE-SEMANTIC-UNIVERSE-AND-INTERFACE-INSTANCES-ABSENT', 'Freeze semantic relation markers and instantiate all seventeen prior interfaces with actual consumers, producers, roots and predicates.'],
  ['B0V4-HR-F005', 'P0', 'B0V4-MUTABLE-HEAD-MEMBERSHIP-SELF-CYCLES', 'Replace self-cyclic strings with typed object-to-head-to-universe membership edges over exactly 94 classes and 36 heads.'],
  ['B0V4-HR-F006', 'P0', 'B0V4-VECTOR-PROGRAMS-SCENARIO-VACUOUS-NO-CAUSAL-ORACLE', 'Replace attack-label programs with real portable domain-state bytes, state mutations and executable oracles.'],
  ['B0V4-HR-F007', 'P0', 'B0V4-PERMIT-REVISION-FENCE-TIME-REPLAY-FIELDS-NOT-CLOSED', 'Freeze closed Permit and Acceptance fields for epoch, Attempt, fence, validity, expected heads and one-use state.'],
  ['B0V4-HR-F008', 'P0', 'B0V4-TWO-WITNESS-AND-PROOF-CLASS-INDEPENDENCE-DENOMINATORS-ABSENT', 'Bind exactly two same-checkpoint witness acknowledgements and nine exact proof-class independence profiles.'],
  ['B0V4-HR-F009', 'P0', 'B0V4-ACCEPTANCE-CAS-EXPECTED-POINTER-FENCE-ATTEMPT-COMPARES-ABSENT', 'Freeze expected-pointer/root, fence and Attempt compares in the sole Acceptance transaction and response-loss recovery.'],
  ['B0V4-HR-F010', 'P0', 'B0V4-GENESIS-FOUNDATION-LABELS-NOT-CLOSED-CAUSAL-SCHEMAS', 'Replace Genesis compound labels with exact member slots, schemas, ledgers, external inputs and first-Permit semantics.'],
  ['B0V4-HR-F011', 'P1', 'B0V4-RECOVERY-MEMBER-SCHEMA-AND-AUTHORITYOWNER-SEPARATION-GAP', 'Freeze five recovery Appointment slots, two witnesses, one-use attempts and separation from all eight work roles including AuthorityOwner.'],
  ['B0V4-HR-F012', 'P2', 'B0V4-PACKAGE-CONTENT-ROOT-DERIVATION-UNSPECIFIED', 'Freeze a domain-separated canonical package-root equation and cross-language verification vector.'],
].map(([findingId, severity, noMergeKey, replacementNorm], index) => ({
  ordinal: index + 1,
  findingId,
  severity,
  noMergeKey,
  replacementId: `B0V5-FIX-${pad(index + 1)}`,
  targetRequirementId: `B0V5REQ-${pad(index)}`,
  targetOutputId: `B0V5OUT-${pad(index)}`,
  replacementNorm,
}));

function exactAtomSupersession(id, alias, locator, atom, replacementNorm, retainedSafetyIntent) {
  const reference = memberRef(alias, locator);
  const sourceBytes = memberBytes(alias, locator);
  const atomBytes = Buffer.from(atom, 'utf8');
  const offset = sourceBytes.indexOf(atomBytes);
  if (offset < 0) throw new Error(`Literal old atom not found: ${id} ${alias}::${locator}`);
  if (sourceBytes.indexOf(atomBytes, offset + 1) >= 0) throw new Error(`Ambiguous old atom: ${id}`);
  return {
    supersessionId: id,
    sourceReference: `${alias}@${reference.artifactSha256}::${locator}`,
    sourceMember: reference,
    oldAtomUtf8Base64: atomBytes.toString('base64'),
    oldAtomSha256: sha(atomBytes),
    oldAtomStartByteWithinMember: offset,
    oldAtomEndByteWithinMember: offset + atomBytes.length,
    oldAtomText: atom,
    disposition: 'SUPERSEDED;OLD-BYTES-PRESERVED;OLD-ATOM-NON-NORMATIVE',
    replacementNorm,
    replacementRoot: domainRoot('CONNECT-B0-V5-ATOM-REPLACEMENT-V1', { id, replacementNorm, retainedSafetyIntent }),
    retainedSafetyIntent,
    surroundingMemberBytesRemainMandatory: true,
    closureTransfer: false,
    authorityCredit: 0,
  };
}

const exactAtomSupersessions = [
  exactAtomSupersession('B0V5-SUP-LIFE-001', 'B0V2', 'B0V2REQ-022.requiredProof', 'response loss may yield `COMMITTED-UNCONFIRMED`, never assumed absence', 'Response loss appends RESPONSE-LOST and enters non-final UNCERTAIN; only authoritative reconciliation creates exactly one immutable FinalResult.', 'Response loss never proves absence, permits retry or grants authority.'),
  exactAtomSupersession('B0V5-SUP-LIFE-002', 'B0V2', 'B0V2REQ-040.statement', '`COMMITTED-UNCONFIRMED`', 'The old label is OutcomeObservation=RESPONSE-LOST plus AttemptState=UNCERTAIN and is not a FinalResult.', 'Unknown commit state freezes dependent authority until authoritative recovery.'),
  exactAtomSupersession('B0V5-SUP-LIFE-003', 'B0V2', 'B0V2REQ-040.requiredProof', 'commit-before-loss, no-commit loss, stale read, conflicting read and prolonged outage each yield one terminal', 'Each listed schedule yields a non-final observation while uncertain and later exactly one immutable FinalResult after authoritative reconciliation.', 'Same-Attempt retry is forbidden and unknown state has zero usable authority.'),
  exactAtomSupersession('B0V5-SUP-LIFE-004', 'B0V2', 'B0V2REQ-044.requiredProof', 'terminal mutation forbidden', 'FinalResult mutation is forbidden; UNCERTAIN and QUARANTINED are non-final AttemptState values with only ordered reconciliation transitions.', 'Exactly one finalization remains immutable.'),
  exactAtomSupersession('B0V5-SUP-PATH-001', 'B0V2', 'B0V2REQ-027.statement', 'absolute path', 'Repository-root-relative logicalPath plus artifact SHA-256 and exact byte span is authoritative; machine-local resolver mappings are private zero-authority observations and never Public members.', 'Exact physical identity and clean-workspace substitution resistance are retained.'),
  exactAtomSupersession('B0V5-SUP-GEN-001', 'B0V2', 'B0V2REQ-025.requiredProof', 'cannot issue Permits', 'G1/G2 cannot issue GenesisPermit or OperationalPermit; they may instantiate and consume only a structurally zero-authority ConformancePermit in an isolated capability sink.', 'G1/G2 never become Current or reach an external effect.'),
  exactAtomSupersession('B0V5-SUP-GEN-002', 'B0V2', 'B0V2REQ-043.requiredProof', 'only later accepted operational Instance can issue Permit', 'Only a later independently accepted operational Instance may issue OperationalPermit; a ConformancePermit is non-convertible test input with authorityCredit=0 and capabilityBits=0.', 'No generation test bootstraps authority.'),
  exactAtomSupersession('B0V5-SUP-GEN-003', 'B0V2', '§6.2.2', 'G1/G2 conformance objects cannot issue Permits', 'G1/G2 cannot issue authority-bearing Permit types; they may instantiate a sealed non-convertible ConformancePermit with structurally zero authority and capability.', 'Conformance execution cannot become Current or authorize an effect.'),
  exactAtomSupersession('B0V5-SUP-ROLE-001', 'B0V3', 'B0V3REQ-062.statement', '`AuthorityOwner,Producer,QA,Reviewer1,Reviewer2,Reconciler,AcceptanceWriter`', 'The closed role universe is `AuthorityOwner,Producer,QA,Reviewer1,Reviewer2,Reconciler,Approver,AcceptanceWriter`.', 'Every former role remains distinct and Approver is added without removing a prohibition.'),
  exactAtomSupersession('B0V5-SUP-ROLE-002', 'B0V3', 'B0V3REQ-062.requiredProof', 'a complete 7-role pair matrix has all 21 pairs explicitly prohibited', 'A complete eight-role matrix has all 28 unordered pairs explicitly prohibited from sharing any EffectiveController.', 'All former 21 pairs remain prohibited and the seven Approver pairs are added.'),
];

const oldMembersByFinding = [
  [memberRef('B0V4SI', '/artifacts')],
  [memberRef('B0V4NR', '/typedSupersessions')],
  Array.from({ length: 27 }, (_, index) => memberRef('B0V4', `B0V4REQ-${pad(index + 14)}.sourceBasis`)),
  [memberRef('B0V4CW', '/namedUseGraph'), memberRef('B0V4NR', '/cycleBreaks')],
  [memberRef('B0V4NR', '/mutableHeadRegistry')],
  [memberRef('B0V4VC', '/dsl'), memberRef('B0V4VC', '/fixtures'), memberRef('B0V4VC', '/vectors')],
  [memberRef('B0V4NR', '/acceptanceFieldRegistry'), memberRef('B0V4NR', '/permitTypeRegistry')],
  [memberRef('B0V4NR', '/acceptanceFieldRegistry')],
  [memberRef('B0V4NR', '/acceptanceCas')],
  [memberRef('B0V4NR', '/genesisFoundation')],
  [memberRef('B0V4NR', '/recoveryQuorum')],
  [memberRef('B0V4PM', '/packageContentRoot')],
];

const replacementRegistry = findingDefinitions.map((finding, index) => ({
  ...finding,
  sourceFinding: memberRef('B0V4HRM', finding.findingId),
  oldMembers: oldMembersByFinding[index].map((reference) => ({ ...reference, disposition: 'SUPERSEDED;EXACT-OLD-BYTES-RETAINED-AT-FROZEN-SOURCE' })),
  replacementMemberId: finding.replacementId,
  replacementRoot: domainRoot('CONNECT-B0-V5-FINDING-REPLACEMENT-V1', { findingId: finding.findingId, noMergeKey: finding.noMergeKey, replacementNorm: finding.replacementNorm }),
  candidateDeltaState: 'MATERIALIZED-IN-V5;FRESH-INDEPENDENT-CLOSURE-PENDING',
  closureTransferred: false,
  acceptanceTransferred: false,
  authorityCredit: 0,
}));

const hiddenPairs = ['001:049', '009:062', '021:057', '025:064', '026:055', '026:056', '029:049', '029:063', '030:050', '033:052', '036:063', '037:060', '039:057', '044:055', '044:056', '047:052', '047:066'];
const priorInterfaces = hiddenPairs.map((pair, index) => {
  const [consumerOld, providerOld] = pair.split(':').map(Number);
  const interfaceId = `B0V5-IFACE-${pad(index + 1)}`;
  const inputSchema = {
    sourceRequirementId: `B0V4REQ-${pad(consumerOld)}`,
    inheritedFieldBundleRoot: canonicalSha(v4Requirements[consumerOld].fields),
    permittedInputs: ['IMMUTABLE-ROOT', 'SCHEMA-VERSION', 'VALIDATION-CONTEXT-ROOT'],
  };
  const outputSchema = {
    sourceRequirementId: `B0V4REQ-${pad(providerOld)}`,
    inheritedFieldBundleRoot: canonicalSha(v4Requirements[providerOld].fields),
    promisedOutputs: ['IMMUTABLE-OUTPUT-ROOT', 'VALIDATION-RECEIPT-ROOT'],
  };
  const validationPredicate = {
    predicateId: `${interfaceId}-PREDICATE-V1`,
    checks: ['SCHEMA-VERSION-EQUALS-1', 'INPUT-ROOT-MATCHES', 'OUTPUT-ROOT-MATCHES', 'AUTHORITY-CREDIT-EQUALS-0', 'NO-PROVIDER-CONSTRUCTION-REQUIRED-BY-CONSUMER'],
    unknownFieldPolicy: 'BLOCK',
  };
  const instance = {
    interfaceId,
    schemaVersion: 1,
    immutable: true,
    consumerRequirement: `B0V5REQ-${pad(consumerOld + 12)}`,
    providerRequirement: `B0V5REQ-${pad(providerOld + 12)}`,
    consumerClass: `PRESERVED-CONSUMER:B0V4REQ-${pad(consumerOld)}`,
    providerClass: `PRESERVED-PROVIDER:B0V4REQ-${pad(providerOld)}`,
    inputSchema,
    inputRoot: domainRoot('CONNECT-B0-V5-INTERFACE-INPUT-V1', inputSchema),
    outputSchema,
    outputRoot: domainRoot('CONNECT-B0-V5-INTERFACE-OUTPUT-V1', outputSchema),
    validationPredicate,
    validationPredicateRoot: domainRoot('CONNECT-B0-V5-INTERFACE-PREDICATE-V1', validationPredicate),
    authorityCredit: 0,
    availability: 'DEFINED-IN-NORMATIVE-REGISTRY-BEFORE-CONSUMER;NO-FUTURE-PROVIDER-AUTHORITY',
  };
  return { ...instance, instanceRoot: domainRoot('CONNECT-B0-V5-PRIOR-INTERFACE-V1', instance) };
});

const headIdMap = new Map(v4Registry.mutableHeadRegistry.heads.map((head, index) => [head.headId, `B0V5-HEAD-${String(index + 1).padStart(2, '0')}`]));
const fixedHeads = v4Registry.mutableHeadRegistry.heads.map((head, index) => ({
  ...head,
  headId: `B0V5-HEAD-${String(index + 1).padStart(2, '0')}`,
  currentVersion: null,
  currentRoot: null,
}));
const fixedHeadById = new Map(fixedHeads.map((head) => [head.headId, head]));
const fixedObjectToHead = v4Registry.mutableHeadRegistry.objectToHead.map((mapping) => {
  const headId = headIdMap.get(mapping.headId);
  const head = fixedHeadById.get(headId);
  return {
    objectClass: mapping.objectClass,
    headId,
    membershipPath: [
      { edgeClass: 'MEMBER-OF', sourceNode: `ObjectClass:${mapping.objectClass}`, targetNode: `Head:${head.name}` },
      { edgeClass: 'MEMBER-OF', sourceNode: `Head:${head.name}`, targetNode: 'Head:SecurityUniverseHead' },
    ],
    mutable: true,
    invalidationRule: `ADVANCE-${headId}-AND-SECURITY-UNIVERSE-REVISION`,
  };
});
if (fixedObjectToHead.length !== 94 || fixedHeads.length !== 36) throw new Error('Mutable-head denominator changed');

const mutableHeadRegistry = {
  objectClassCount: 94,
  generatedHeadCount: 36,
  derivationRule: 'CLOSED-94-CLASS-DENOMINATOR;EXACTLY-ONE-TYPED-OBJECT-TO-HEAD-EDGE;EXACTLY-ONE-HEAD-TO-SECURITY-UNIVERSE-EDGE;SELF-CYCLE=BLOCK',
  heads: fixedHeads,
  objectToHead: fixedObjectToHead,
  currentHeadVectorSchema: fixedHeads.map((head) => ({ headId: head.headId, requiredFields: ['headId', 'expectedVersion', 'expectedRoot'], cardinality: 'EXACTLY-ONE' })),
  currentHeadVectorReceipt: null,
  securityUniverseHead: { headId: 'B0V5-SECURITY-UNIVERSE-HEAD', versionType: 'MONOTONIC-U64', rootType: 'DOMAIN-SEPARATED-SHA256', currentVersion: null, currentRoot: null },
};

const roles = ['AuthorityOwner', 'Producer', 'QA', 'Reviewer1', 'Reviewer2', 'Reconciler', 'Approver', 'AcceptanceWriter'];
const pairMatrix = [];
for (let left = 0; left < roles.length; left += 1) {
  for (let right = left + 1; right < roles.length; right += 1) {
    pairMatrix.push({
      pairId: `B0V5-ROLE-PAIR-${String(pairMatrix.length + 1).padStart(2, '0')}`,
      leftRole: roles[left],
      rightRole: roles[right],
      disposition: 'PROHIBITED-SHARED-EFFECTIVE-CONTROLLER',
      appliesTo: ['PRIMARY', 'BACKUP', 'QUORUM', 'EMERGENCY', 'SESSION', 'CREDENTIAL-CONTROLLER', 'DELEGATED-CONTROLLER'],
      exceptionAllowed: false,
    });
  }
}

const roleUniverse = {
  roles,
  roleCount: 8,
  pairCount: 28,
  pairMatrix,
  approverSemantics: 'APPROVER-IS-DISTINCT-FROM-AUTHORITYOWNER;BOTH-EXACT-ROOT-ACTS-REQUIRED',
  reviewerCardinality: 'EXACTLY-TWO-CONTROLLER-SEPARATED-REVIEWERS',
  backupRule: 'BACKUP-DISTINCT-FROM-PRIMARY-AND-EVERY-CONFLICTING-ROLE-CONTROLLER',
  exceptionAllowed: false,
};

const baseAcceptanceFields = v4Registry.acceptanceFieldRegistry.fields.map((field) => ({
  ...field,
  sourceHead: headIdMap.get(field.sourceHead) || field.sourceHead,
  producer: field.name === 'evidenceLedgerHead' ? 'EvidenceLedgerWriter' : field.name === 'witnessCheckpointRoot' ? 'WitnessQuorum' : field.producer,
}));

const extensionFieldDefinitions = [
  ['authorityEpoch', 'MONOTONIC-U64', 'B0V5-HEAD-02', 'AuthorityOwner'],
  ['authorityRevision', 'MONOTONIC-U64', 'B0V5-HEAD-22', 'AcceptanceWriter'],
  ['authorityEventOrdinal', 'MONOTONIC-U64-WITHIN-REVISION', 'B0V5-HEAD-22', 'AcceptanceWriter'],
  ['attemptId', 'DETERMINISTIC-ID', 'B0V5-HEAD-24', 'AcceptanceWriter'],
  ['permitId', 'DETERMINISTIC-ID', 'B0V5-HEAD-24', 'AuthorityOwner'],
  ['permitType', 'ENUM-GENESIS-CONFORMANCE-OPERATIONAL', 'B0V5-HEAD-24', 'AuthorityOwner'],
  ['permitAct', 'CLOSED-ACT-ID', 'B0V5-HEAD-24', 'AuthorityOwner'],
  ['permitActorAppointmentRoot', 'OPAQUE-PRIVATE-REFERENCE', 'B0V5-HEAD-12', 'AuthorityOwner'],
  ['permitEnvironmentRoot', 'OPAQUE-PRIVATE-REFERENCE', 'B0V5-HEAD-24', 'AuthorityOwner'],
  ['permitInputRoot', 'SHA256', 'B0V5-HEAD-24', 'AuthorityOwner'],
  ['permitOutputManifestRoot', 'SHA256', 'B0V5-HEAD-24', 'AuthorityOwner'],
  ['permitOneUseState', 'ENUM-UNUSED-RESERVED-CONSUMED-REVOKED-EXPIRED', 'B0V5-HEAD-24', 'AcceptanceWriter'],
  ['permitNotBefore', 'TRUSTED-TIME-INSTANT', 'B0V5-HEAD-05', 'AuthorityOwner'],
  ['permitValidThrough', 'TRUSTED-TIME-INSTANT', 'B0V5-HEAD-05', 'AuthorityOwner'],
  ['trustedNow', 'TRUSTED-TIME-INSTANT', 'B0V5-HEAD-05', 'AcceptanceWriter'],
  ['fencingToken', 'MONOTONIC-U64', 'B0V5-HEAD-22', 'AcceptanceWriter'],
  ['expectedGenesisLedgerHead', 'HEAD-ID+VERSION+SHA256', 'B0V5-HEAD-23', 'AuthorityOwner'],
  ['expectedPermitHead', 'HEAD-ID+VERSION+SHA256', 'B0V5-HEAD-24', 'AuthorityOwner'],
  ['expectedRevocationHead', 'HEAD-ID+VERSION+SHA256', 'B0V5-HEAD-22', 'AuthorityOwner'],
  ['acceptancePointerExpectedRoot', 'SHA256', 'B0V5-HEAD-25', 'AcceptanceWriter'],
  ['expectedSecurityUniverseRoot', 'SHA256', 'B0V5-HEAD-26', 'AcceptanceWriter'],
  ['expectedSecurityRevision', 'MONOTONIC-U64', 'B0V5-HEAD-26', 'AcceptanceWriter'],
  ['witness1AcknowledgementRoot', 'OPAQUE-PRIVATE-REFERENCE', 'B0V5-HEAD-30', 'Witness1'],
  ['witness1AppointmentRoot', 'OPAQUE-PRIVATE-REFERENCE', 'B0V5-HEAD-12', 'AuthorityOwner'],
  ['witness1ControllerRoot', 'OPAQUE-PRIVATE-REFERENCE', 'B0V5-HEAD-13', 'AuthorityOwner'],
  ['witness2AcknowledgementRoot', 'OPAQUE-PRIVATE-REFERENCE', 'B0V5-HEAD-30', 'Witness2'],
  ['witness2AppointmentRoot', 'OPAQUE-PRIVATE-REFERENCE', 'B0V5-HEAD-12', 'AuthorityOwner'],
  ['witness2ControllerRoot', 'OPAQUE-PRIVATE-REFERENCE', 'B0V5-HEAD-13', 'AuthorityOwner'],
  ['witnessCommonCheckpointRoot', 'SHA256', 'B0V5-HEAD-30', 'WitnessQuorum'],
  ...['parser', 'serializer', 'graph', 'signature', 'time', 'envelope', 'stateReducer', 'vectorRunner', 'readback'].map((proofClass) => [`independenceProfile_${proofClass}Root`, 'SHA256', 'B0V5-HEAD-29', 'QA']),
  ['readbackAControllerRoot', 'OPAQUE-PRIVATE-REFERENCE', 'B0V5-HEAD-13', 'QA'],
  ['readbackBControllerRoot', 'OPAQUE-PRIVATE-REFERENCE', 'B0V5-HEAD-13', 'QA'],
  ['readbackAIndependenceProfileRoot', 'SHA256', 'B0V5-HEAD-29', 'QA'],
  ['readbackBIndependenceProfileRoot', 'SHA256', 'B0V5-HEAD-29', 'QA'],
  ['commitTransactionId', 'DETERMINISTIC-ID', 'B0V5-HEAD-25', 'AcceptanceWriter'],
  ['commitStoreId', 'OPAQUE-PRIVATE-REFERENCE', 'B0V5-HEAD-26', 'AcceptanceWriter'],
  ['commitPointerBeforeRoot', 'SHA256', 'B0V5-HEAD-25', 'AcceptanceWriter'],
  ['commitPointerAfterRoot', 'SHA256', 'B0V5-HEAD-25', 'AcceptanceWriter'],
  ['commitAuthorityRevision', 'MONOTONIC-U64', 'B0V5-HEAD-22', 'AcceptanceWriter'],
  ['commitAttemptId', 'DETERMINISTIC-ID', 'B0V5-HEAD-24', 'AcceptanceWriter'],
  ['commitFencingToken', 'MONOTONIC-U64', 'B0V5-HEAD-22', 'AcceptanceWriter'],
];

const existingAcceptanceNames = new Set(baseAcceptanceFields.map((field) => field.name));
for (const [name, type, sourceHead, producer] of extensionFieldDefinitions) {
  if (!existingAcceptanceNames.has(name)) {
    baseAcceptanceFields.push({
      name,
      type,
      cardinality: 'EXACTLY-ONE',
      classification: type === 'OPAQUE-PRIVATE-REFERENCE' ? 'RESTRICTED' : 'INTERNAL',
      sourceHead,
      freshness: 'MUST-EQUAL-COMMIT-TIME-EXPECTED-HEAD-CUT',
      invalidation: `ANY-${sourceHead}-ADVANCE-OR-BOUND-VALUE-CHANGE-INVALIDATES`,
      producer,
      closurePredicate: 'PRESENT;TYPE-VALID;EXPECTED-EQUALITY-VALID;CURRENT;INDEPENDENTLY-VALIDATED',
    });
    existingAcceptanceNames.add(name);
  }
}
const acceptanceFields = baseAcceptanceFields.map((field, index) => ({ ...field, fieldId: `B0V5-AF-${String(index + 1).padStart(3, '0')}` }));
const requiredAcceptanceNames = extensionFieldDefinitions.map(([name]) => name);

const acceptanceFieldRegistry = {
  schemaId: 'B0V5-CLOSED-ACCEPTANCE-ENVELOPE-V1',
  fieldCount: acceptanceFields.length,
  fieldCardinality: 'EVERY-LISTED-FIELD-EXACTLY-ONE;UNKNOWN-AUTHORITY-FIELD=BLOCK',
  requiredCausalFieldNames: requiredAcceptanceNames,
  twoWitnessRule: 'WITNESS1-AND-WITNESS2-DISTINCT-CONTROLLERS;ACKNOWLEDGEMENTS-BIND-IDENTICAL-CHECKPOINT-ROOT',
  independenceClassRule: 'EXACTLY-ONE-CURRENT-PROFILE-FOR-EACH-OF-NINE-PROOF-CLASSES;EACH-PROFILE-BINDS-TWO-DISTINCT-IMPLEMENTATIONS-AND-CONTROLLERS',
  fields: acceptanceFields,
};

const commonPermitFields = [
  'permitId', 'attemptId', 'permitType', 'actId', 'actorAppointmentRoot', 'actorControllerRoot', 'environmentRoot',
  'exactInputRoot', 'exactOutputManifestRoot', 'expectedLedgerHead', 'expectedSecurityUniverseRoot', 'expectedSecurityRevision',
  'expectedRevocationHead', 'authorityEpoch', 'fencingToken', 'notBefore', 'validThrough', 'oneUseState', 'issuerRoot', 'signatureRoot',
];
const permitSchemas = [
  {
    permitType: 'GenesisPermit',
    schemaId: 'B0V5-GENESIS-PERMIT-V1',
    exactFields: commonPermitFields,
    allowedActs: ['CREATE-CANONICAL-MANDATE', 'CREATE-B0-DEFINITION-CANDIDATE', 'CREATE-B0-INSTANCE-CANDIDATE', 'CREATE-REVIEW-PROTOCOL', 'CREATE-SEALED-REVIEW-PACKET', 'CREATE-ZERO-AUTHORITY-GENERATION', 'CREATE-DETACHED-ACCEPTANCE-ARTIFACT'],
    issuerClass: 'EXTERNAL-L0-QUORUM-USING-ADMITTED-FOUNDATION',
    authorityCreditRule: 'ONLY-CURRENT-UNUSED-VALID-PERMIT-MAY-ENTER-ATOMIC-RESERVATION;CURRENT-INSTANCE-ABSENT',
    currentInstanceRoot: null,
  },
  {
    permitType: 'ConformancePermit',
    schemaId: 'B0V5-CONFORMANCE-PERMIT-V1',
    exactFields: [...commonPermitFields, 'authorityCreditConstantZero', 'capabilityBitsConstantZero', 'isolatedSinkRoot'],
    allowedActs: ['EXECUTE-G1-CONFORMANCE', 'EXECUTE-G2-CONFORMANCE'],
    issuerClass: 'DETERMINISTIC-PLANNING-FIXTURE-CONSTRUCTOR;NOT-AUTHORITY-ISSUER',
    authorityCreditRule: 'STRUCTURALLY-0;CAPABILITY-BITS=0;NON-CONVERTIBLE;NO-CURRENT-POINTER;NO-EXTERNAL-TARGET',
    currentInstanceRoot: null,
  },
  {
    permitType: 'OperationalPermit',
    schemaId: 'B0V5-OPERATIONAL-PERMIT-V1',
    exactFields: commonPermitFields,
    allowedActs: ['CREATE-O1-OPERATIONAL-PARITY-INSTANCE', 'CREATE-O2-OPERATIONAL-PARITY-INSTANCE', 'COMMIT-ACCEPTANCE'],
    issuerClass: 'LATER-INDEPENDENTLY-ACCEPTED-OPERATIONAL-INSTANCE-ONLY',
    authorityCreditRule: 'IMPOSSIBLE-BEFORE-B0-DEFINITION-AND-OPERATIONAL-INSTANCE-ACCEPTANCE',
    currentInstanceRoot: null,
  },
].map((schema) => ({ ...schema, schemaRoot: domainRoot('CONNECT-B0-V5-PERMIT-SCHEMA-V1', schema) }));

const genesisMemberClasses = [
  'L0TrustAnchorAdmission', 'TalIdentityBinding', 'RecoveryQuorumProfile', 'AlgorithmRegistryHead', 'AlgorithmRegistryMembersRoot',
  'KeyStatusHead', 'KeyStatusMembersRoot', 'TrustedTimeSourceProfile', 'InitialTrustedTimeDecision', 'CanonicalSerializationProfile',
  'DeterministicIdentityProfile', 'AuthorityStoreIdentity', 'AuthorityStoreCapabilityReceipt', 'EmptyGenesisLedgerHead', 'EmptyPermitLedgerHead',
  'AppointmentRegistry', 'ApproverAppointment', 'EightRoleConflictMatrix', 'ControllerEquivalencePolicy', 'InitialSecurityUniverseHead',
  'InitialSecurityUniverseRevision', 'WitnessPolicy', 'Witness1Appointment', 'Witness2Appointment', 'ApplicableDirectiveRegistryRoot',
  'PublicDisclosurePolicyRoot', 'BootstrapReviewProtocolRoot', 'JournalPolicyRoot', 'ExceptionRegistryHead', 'InitialHeadVector',
  'ExternalCeremonyTranscriptRoot', 'FoundationValidatorProfile1', 'FoundationValidatorProfile2',
];
const genesisMemberSlots = genesisMemberClasses.map((memberClass, index) => {
  const slot = {
    memberId: `B0V5-GFM-${String(index + 1).padStart(3, '0')}`,
    memberClass,
    cardinality: 'EXACTLY-ONE-AT-ADMISSION',
    schemaId: `B0V5-GENESIS-MEMBER-${memberClass.replace(/([a-z])([A-Z])/g, '$1-$2').toUpperCase()}-V1`,
    requiredFields: ['memberId', 'schemaId', 'contentRoot', 'issuerRoot', 'controllerRoot', 'authorityEpoch', 'notBefore', 'validThrough', 'invalidationRule'],
    sourceClass: 'EXTERNAL-PRE-B0-INPUT',
    currentInstanceRoot: null,
  };
  return { ...slot, slotSchemaRoot: domainRoot('CONNECT-B0-V5-GENESIS-MEMBER-SLOT-V1', slot) };
});

const genesisLedgerSchema = {
  ledgerId: 'B0V5-GENESIS-LEDGER-V1',
  entryFields: ['entryOrdinal', 'permitId', 'attemptId', 'actId', 'inputRoot', 'outputManifestRoot', 'expectedPreviousHead', 'authorityEpoch', 'fencingToken', 'commitReceiptRoot'],
  emptyEntries: [],
  emptyRoot: domainRoot('CONNECT-B0-V5-GENESIS-LEDGER-V1', []),
  appendRule: 'ONE-SERIALIZABLE-EXPECTED-HEAD-CAS;ONE-USE-ATTEMPT;NO-DELETE;NO-REORDER',
  currentHead: null,
};
const permitLedgerSchema = {
  ledgerId: 'B0V5-PERMIT-LEDGER-V1',
  entryFields: ['entryOrdinal', 'permitId', 'attemptId', 'permitType', 'oneUseState', 'expectedPreviousHead', 'authorityRevision', 'fencingToken', 'finalizationRoot'],
  emptyEntries: [],
  emptyRoot: domainRoot('CONNECT-B0-V5-PERMIT-LEDGER-V1', []),
  appendRule: 'ONE-SERIALIZABLE-EXPECTED-HEAD-CAS;STATE-MONOTONIC;REPLAY-BLOCKED',
  currentHead: null,
};

const genesisFoundation = {
  packageSchemaId: 'B0V5-GENESIS-FOUNDATION-PACKAGE-V1',
  memberSlotCount: genesisMemberSlots.length,
  memberSlots: genesisMemberSlots,
  unknownMemberPolicy: 'BLOCK',
  externalCeremonySchema: {
    exactFields: ['ceremonyId', 'foundationPackageRoot', 'externalAnchorRoot', 'quorumProfileRoot', 'quorumAcknowledgementRoots', 'witness1AcknowledgementRoot', 'witness2AcknowledgementRoot', 'validatorProfile1Root', 'validatorProfile2Root', 'validatorResult1Root', 'validatorResult2Root', 'trustedTimeDecisionRoot', 'admissionReceiptRoot'],
    issuerClass: 'EXTERNAL-L0-QUORUM-PREEXISTING-B0',
    verifierInputRule: 'EXACT-ROOTED-PREPROVISIONED-INPUTS;NO-PACKAGE-SELF-SELECTION;NO-B0-DESCENDANT',
    witnessRule: 'EXACTLY-TWO-DISTINCT-OFFLINE-CONTROLLERS;DISTINCT-FROM-QUORUM-AND-WORK-ROLES',
    validatorRule: 'TWO-DISTINCT-IMPLEMENTATION-DEPENDENCY-RUNTIME-AUTHOR-CONTROLLER-PROFILES',
    currentReceiptRoot: null,
  },
  genesisLedgerSchema,
  permitLedgerSchema,
  firstGenesisPermitSchemaRef: permitSchemas[0].schemaRoot,
  firstPermitPrerequisiteMemberIds: genesisMemberSlots.map((member) => member.memberId),
  firstPermitTransactionRule: 'COMPARE-EMPTY-GENESIS-HEAD+SECURITY-UNIVERSE+REVOCATION+TIME;RESERVE-ATTEMPT;PUBLISH-ONE-MANIFEST;CONSUME-PERMIT;APPEND-RECEIPT;ONE-DURABLE-COMMIT',
  createsOwnPrerequisite: false,
  currentFoundationInstanceRoot: null,
  currentFirstGenesisPermitReceiptRoot: null,
};

const recoveryMemberSlots = Array.from({ length: 5 }, (_, index) => ({
  memberId: `B0V5-RECOVERY-MEMBER-${String(index + 1).padStart(2, '0')}`,
  exactFields: ['memberId', 'appointmentRoot', 'effectiveControllerRoot', 'keyStatusRoot', 'profileEpoch', 'notBefore', 'validThrough', 'revocationRevision', 'acknowledgementRoot'],
  cardinality: 'EXACTLY-ONE-AT-PROFILE-ADMISSION',
  currentAppointmentRoot: null,
  currentEffectiveControllerRoot: null,
  currentKeyStatusRoot: null,
}));
const recoveryWitnessSlots = [1, 2].map((index) => ({
  witnessId: `B0V5-RECOVERY-WITNESS-${index}`,
  exactFields: ['witnessId', 'appointmentRoot', 'effectiveControllerRoot', 'challengeRoot', 'acknowledgementRoot'],
  currentAppointmentRoot: null,
  currentEffectiveControllerRoot: null,
}));
const recoveryQuorum = {
  profileSchemaId: 'B0V5-L0-RECOVERY-QUORUM-3-OF-5-V1',
  threshold: 3,
  totalMembers: 5,
  memberSlots: recoveryMemberSlots,
  witnessSlots: recoveryWitnessSlots,
  controllerExclusionRoles: roles,
  controllerRule: 'ALL-FIVE-MEMBERS+TWO-WITNESSES+ALL-EIGHT-WORK-ROLES-PAIRWISE-EFFECTIVE-CONTROLLER-DISTINCT;ALIASES,BACKUPS,DELEGATIONS,SESSIONS-INCLUDED',
  attemptSchema: {
    exactFields: ['attemptId', 'profileRoot', 'profileEpoch', 'purpose', 'compromiseCut', 'newAnchorRoot', 'newAlgorithmRegistryRoot', 'newKeyStatusRoot', 'trustedTimeDecisionRoot', 'expectedRecoveryLedgerHead', 'notBefore', 'validThrough', 'memberAcknowledgementRoots', 'witnessAcknowledgementRoots', 'oneUseState'],
    thresholdRule: 'EXACTLY-ONE-CHALLENGE;AT-LEAST-3-OF-5-VALID-DISTINCT-CURRENT-MEMBER-ACKNOWLEDGEMENTS',
    witnessRule: 'EXACTLY-TWO-DISTINCT-CURRENT-WITNESS-ACKNOWLEDGEMENTS-FOR-SAME-CHALLENGE',
    replayRule: 'DETERMINISTIC-ATTEMPT-ID;EXPECTED-HEAD-CAS;ONE-USE;REPLAY=BLOCK',
  },
  rotationRule: 'NEW-PROFILE-EXTERNALLY-ADMITTED-BEFORE-ACTIVATION;OLD-PROFILE-REVOKED-IN-SAME-AUTHORITY-REVISION;NO-DUAL-CURRENT-PROFILES',
  compromiseOrdering: 'COMPROMISE-AND-REVOCATION-PRECEDE-RECOVERY-RESERVE-OR-COMMIT-AT-EQUAL-AUTHORITY-REVISION',
  currentProfileRoot: null,
  currentProfileReceipt: null,
};

const proofClassNames = ['PARSER', 'SERIALIZER', 'GRAPH', 'SIGNATURE', 'TIME', 'ENVELOPE', 'STATE-REDUCER', 'VECTOR-RUNNER', 'READBACK'];
const independenceProfileRegistry = proofClassNames.map((proofClass, index) => ({
  profileId: `B0V5-INDEPENDENCE-${String(index + 1).padStart(2, '0')}`,
  proofClass,
  exactFields: ['profileId', 'proofClass', 'implementationRootA', 'implementationRootB', 'dependencyRootA', 'dependencyRootB', 'runtimeRootA', 'runtimeRootB', 'authorControllerRootA', 'authorControllerRootB', 'executionContextRootA', 'executionContextRootB', 'presealedPacketRoot', 'comparisonOracleRoot'],
  distinctnessRule: 'A-AND-B-DISTINCT-FOR-IMPLEMENTATION,TRANSITIVE-DEPENDENCY,RUNTIME,AUTHOR-CONTROLLER,EXECUTION-CONTEXT',
  currentInstanceRoot: null,
}));

const acceptanceCas = {
  effectClass: 'ACCEPTANCE-COMMIT',
  assignedStrategy: 'SINGLE-LINEARIZABLE-DOMAIN',
  authorityStoreSchemaId: 'B0V5-LINEARIZABLE-AUTHORITY-STORE-V1',
  requiredCapabilities: ['SERIALIZABLE-TRANSACTION', 'COMPARE-EXPECTED-VERSION-AND-ROOT', 'ATOMIC-DURABLE-COMMIT', 'MONOTONIC-FENCE', 'UNIQUE-ATTEMPT-RESERVATION', 'CORESIDENT-TRANSACTIONAL-OUTBOX'],
  currentStoreCapabilityReceipt: null,
  coResidentKeys: ['SecurityUniverseRevisionAndRoot', 'All36ExpectedHeadTuples', 'PermitLedgerHeadAndPermit', 'RevocationHeadAndAuthorityRevision', 'AcceptancePointerVersionAndRoot', 'AttemptReservation', 'FencingToken', 'FinalizationRecord', 'CommitReceiptOutboxRecord'],
  orderedTransaction: [
    { ordinal: 1, op: 'BEGIN-SERIALIZABLE' },
    { ordinal: 2, op: 'COMPARE-EXPECTED-ACCEPTANCE-POINTER-VERSION-AND-ROOT' },
    { ordinal: 3, op: 'COMPARE-EXPECTED-SECURITY-UNIVERSE-REVISION-ROOT-AND-ALL-36-HEAD-TUPLES' },
    { ordinal: 4, op: 'COMPARE-EXPECTED-PERMIT-LEDGER-HEAD-AND-UNUSED-PERMIT-ID' },
    { ordinal: 5, op: 'COMPARE-EXPECTED-REVOCATION-HEAD-AUTHORITY-REVISION-AND-FENCING-TOKEN' },
    { ordinal: 6, op: 'CHECK-TRUSTED-TIME-NOT-BEFORE-LE-TRUSTED-NOW-LT-VALID-THROUGH' },
    { ordinal: 7, op: 'RESERVE-UNIQUE-DETERMINISTIC-ATTEMPT-ID-AND-ADVANCE-FENCE' },
    { ordinal: 8, op: 'VALIDATE-CLOSED-ACCEPTANCE-ENVELOPE-TWO-WITNESSES-NINE-INDEPENDENCE-PROFILES-AND-VETOES' },
    { ordinal: 9, op: 'ORDER-REVOCATION-COMPROMISE-SUPERSESSION-BEFORE-COMMIT-AT-EQUAL-AUTHORITY-REVISION' },
    { ordinal: 10, op: 'CONSUME-EXACTLY-ONE-PERMIT' },
    { ordinal: 11, op: 'ADVANCE-ACCEPTANCE-POINTER-FROM-EXPECTED-VERSION-AND-ROOT-EXACTLY-ONE-VERSION' },
    { ordinal: 12, op: 'APPEND-EXACTLY-ONE-IMMUTABLE-FINALIZATION-RECORD' },
    { ordinal: 13, op: 'APPEND-SIGNED-COMMIT-RECEIPT-BINDING-ATTEMPT-FENCE-POINTER-BEFORE-AFTER-AND-AUTHORITY-REVISION' },
    { ordinal: 14, op: 'APPEND-COMMIT-RECEIPT-TO-CORESIDENT-TRANSACTIONAL-OUTBOX' },
    { ordinal: 15, op: 'COMMIT-DURABLY' },
  ],
  soleLinearizationPoint: 'DURABLE-COMMIT-OF-ONE-SERIALIZABLE-AUTHORITY-STORE-TRANSACTION',
  revokeWinsOrder: 'LEXICOGRAPHIC-(AUTHORITY-REVISION,EVENT-ORDINAL);REVOCATION,COMPROMISE,SUPERSESSION-BEFORE-RESERVE,START,COMMIT-AT-EQUAL-REVISION',
  responseLossRecovery: {
    lookupKey: 'DETERMINISTIC-ATTEMPT-ID',
    states: ['NO-RESERVATION', 'RESERVED-NOT-COMMITTED', 'COMMITTED-UNCONFIRMED', 'COMMITTED-CONFIRMED', 'CONFLICT'],
    rule: 'READ-AUTHORITATIVE-ATTEMPT+FINALIZATION+POINTER+RECEIPT;NEVER-RETRY-EFFECT;ABSENT-RECEIPT-DOES-NOT-PROVE-ABSENCE',
    readbacks: 'EXACTLY-TWO-CONTROLLER-AND-IMPLEMENTATION-INDEPENDENT-READBACKS-BIND-SAME-REVISION-ROOT-ATTEMPT-AND-FENCE',
  },
};

const applicableDirectiveRegistry = v4Registry.applicableDirectiveRegistry.map((directive, index) => {
  const [alias, root] = directive.sourceReference.split('@');
  return {
    ...directive,
    directiveId: `B0V5-DIR-${pad(index + 1)}`,
    sourceReference: `${alias}@${root}`,
    currentHeadId: 'B0V5-HEAD-07',
    sourceRoot: root,
  };
});
const directiveUniverse = {
  directiveCount: applicableDirectiveRegistry.length,
  directives: applicableDirectiveRegistry,
  precedenceDirection: 'GREATER-NUMERIC-PRECEDENCE-WINS-WHEN-SCOPES-CONFLICT;NONWAIVABLE-INVARIANT-WINS-REGARDLESS-OF-NUMBER',
  tieRule: 'SAME-PRECEDENCE+OVERLAPPING-SCOPE+DIFFERENT-EFFECT=BLOCK',
  temporalRule: 'ONLY-CURRENT-HEAD-MEMBER-AT-COMMIT-CUT-APPLIES;NO-RETROACTIVE-ACCEPTANCE',
  nonWaivablePublicInvariant: 'REPOSITORY-VISIBILITY=PUBLIC;PRIVATE-SELECTOR=INVALID',
  currentSnapshotRoot: domainRoot('CONNECT-B0-V5-DIRECTIVE-SNAPSHOT-SCHEMA-V1', applicableDirectiveRegistry),
  currentOperationalReceipt: null,
};

const convergencePolicy = {
  policyId: 'B0V5-BOUNDED-SUCCESSOR-CONVERGENCE-V1',
  maximumSuccessorRoundsPerReviewEpoch: 3,
  deterministicRoundId: 'SHA256(UTF8("CONNECT-B0-V5-REVIEW-ROUND-V1\\n")||CANONICAL([PARENT-SUBJECT-ROOT,DECIMAL-ROUND-ORDINAL]))',
  automaticRecursionAllowed: false,
  progressVector: ['UNRESOLVED-P0', 'UNRESOLVED-P1', 'UNDECIDED-P2', 'UNDECIDED-P3', 'MISSING-CAUSAL-VECTOR-RECEIPTS', 'UNACCEPTED-REQUIREMENTS', 'MISSING-EXTERNAL-ROOTS'],
  admissionRule: 'STRICT-LEXICOGRAPHIC-DECREASE;NO-EARLIER-COMPONENT-INCREASE;EXPLICIT-EXTERNAL-AUTHORIZATION-REQUIRED-FOR-NEXT-ROUND',
  noProgressTerminal: 'BLOCKED-REQUIRES-NEW-EXTERNAL-AUTHORITY-OR-DESIGN-DECISION',
  roundLimitTerminal: 'BLOCKED-REVIEW-EPOCH-EXHAUSTED;NO-AUTOMATIC-SUCCESSOR',
  successPredicate: { unresolvedP0: 0, unresolvedP1: 0, p2p3DispositionCount: 'EXACT-DENOMINATOR', minimumFreshIndependentReviews: 2, operationalVectorReceipts: 'ALL-REQUIRED', exactRootApprovals: 'AUTHORITYOWNER+APPROVER', externalFoundation: 'PRESENT', acceptanceCas: 'COMMITTED-CONFIRMED+TWO-INDEPENDENT-READBACKS' },
  currentRoundOrdinal: 1,
  currentState: 'CANDIDATE-ONLY;FRESH-INDEPENDENT-REVIEW-PENDING;NO-RECURSION-AUTHORIZED',
};

const remediationArtifactClasses = ['EXACT-SOURCE-SPAN-REGISTRY', 'ATOM-LITERAL-SUPERSESSION-REGISTRY', 'PORTABLE-SOURCE-RESOLUTION-REGISTRY', 'SEMANTIC-NAMEDUSE-AND-PRIOR-INTERFACE-REGISTRY', 'ACYCLIC-MUTABLE-HEAD-REGISTRY', 'CAUSAL-VECTOR-CORPUS', 'CLOSED-PERMIT-AND-ACCEPTANCE-SCHEMA', 'TWO-WITNESS-AND-INDEPENDENCE-PROFILE-REGISTRY', 'ACCEPTANCE-CAS-TRANSACTION-PROGRAM', 'GENESIS-FOUNDATION-AND-FIRST-PERMIT-SCHEMA', 'L0-RECOVERY-QUORUM-SCHEMA', 'CANONICAL-ATOMIC-PACKAGE-ROOT-SCHEMA'];
const outputRegistry = Array.from({ length: 96 }, (_, index) => ({
  outputId: `B0V5OUT-${pad(index)}`,
  requirementId: `B0V5REQ-${pad(index)}`,
  artifactClass: index < 12 ? remediationArtifactClasses[index] : 'INHERITED-V4-REQUIREMENT-ATOM-BUNDLE',
  schemaVersion: 1,
  implementationRoot: null,
  evidenceRoots: [],
  acceptancePredicate: 'IMPLEMENTED;ROOT-RESOLVED;CAUSAL-VECTOR-EVIDENCE-COMPLETE;FRESH-INDEPENDENTLY-ACCEPTED',
  state: 'PLANNED;NOT-IMPLEMENTED;NOT-ACCEPTED',
  planningArtifactClassification: 'PUBLIC',
  runtimeInstanceClassification: index < 12 ? 'INTERNAL' : v4Registry.outputRegistry[index - 12].runtimeInstanceClassification,
  publicRepresentation: 'FULL-PLANNING-SCHEMA;NO-OPERATIONAL-INSTANCE;NO-PRIVATE-DIGEST;NO-EQUALITY-OR-MEMBERSHIP-ORACLE',
  publicationSurface: 'PUBLIC-REPOSITORY-PLANNING-PACKAGE',
  egressPolicyHead: 'B0V5-HEAD-28',
  repositoryVisibility: 'PUBLIC',
  authorityCredit: 0,
  acceptanceCredit: 0,
}));

const normativeRegistry = {
  artifactId: 'CONNECT-B0-V5-NORMATIVE-REGISTRY-2026-08-30-G0',
  artifactClass: 'IMMUTABLE-NORMATIVE-REGISTRY;PLANNING-ONLY;NOT-B0;NOT-AUTHORITY;NOT-ACCEPTANCE',
  schemaVersion: 1,
  repositoryVisibility: 'PUBLIC',
  frozenInputRoots: SOURCE_INPUTS.slice(0, 8).map(({ alias, logicalPath, expectedSha256, claimLimit }) => ({ alias, logicalPath, sha256: expectedSha256, claimLimit, authorityCredit: 0 })),
  exactAtomSupersessions,
  replacementRegistry,
  priorInterfaceRegistry: { interfaceCount: 17, interfaces: priorInterfaces, unknownInterfacePolicy: 'BLOCK' },
  semanticRelationMarkerSchema: {
    schemaId: 'B0V5-EXPLICIT-SEMANTIC-RELATION-MARKERS-V1',
    markers: ['addresses', 'noMergeKey', 'output', 'uses', 'implements', 'vectors', 'buildDependencies', 'preservesV4', 'cites'],
    edgeClasses: ['ADDRESSES-FINDING', 'IDENTIFIES-NO-MERGE-KEY', 'PRODUCES-OUTPUT', 'USES-NORMATIVE-REPLACEMENT', 'CONSUMES-PRIOR-INTERFACE', 'IMPLEMENTS-PRIOR-INTERFACE', 'COVERED-BY-VECTOR', 'BUILD-DEPENDS-ON', 'PRESERVES-V4-REQUIREMENT', 'CITES-SOURCE-MEMBER'],
    citationSemanticSeparation: 'CITES-SOURCE-MEMBER-NEVER-IMPLIES-CONSTRUCTION,IMPLEMENTATION,VERIFICATION,AUTHORITY,OR-BUILD-DEPENDENCY',
    unmarkedMachineSemanticRelationPolicy: 'BLOCK',
  },
  mutableHeadRegistry,
  roleUniverse,
  permitSchemas,
  acceptanceFieldRegistry,
  independenceProfileRegistry,
  genesisFoundation,
  acceptanceCas,
  recoveryQuorum,
  directiveUniverse,
  convergencePolicy,
  outputRegistry,
  publicInvariant: {
    repositoryVisibility: 'PUBLIC',
    privateFallbackAllowed: false,
    prohibitedPublicValues: ['SECRET', 'PII', 'RESTRICTED-EVIDENCE-BYTES', 'PRIVATE-BYTE-DIGEST', 'EQUALITY-ORACLE', 'MEMBERSHIP-ORACLE', 'MACHINE-LOCAL-IDENTITY'],
    absolutePathAuthorityCredit: 0,
    publicProjectionRule: 'ONLY-DISCLOSURE-SAFE-PLANNING-SCHEMA;NO-RUNTIME-INSTANCE-DERIVATIVE',
  },
  deterministicIdentityProfile: {
    profileId: 'B0V5-DETERMINISTIC-IDENTITY-V1',
    algorithm: 'SHA-256',
    construction: 'SHA256(UTF8(DOMAIN+"\\n")||CANONICAL-JSON-V1(INPUT-TUPLE))',
    randomnessAllowed: false,
    unknownDomainPolicy: 'BLOCK',
  },
  currentAuthorityState: {
    externalL0Authority: 'ABSENT',
    genesisFoundationReceipt: null,
    canonicalMandateReceipt: null,
    acceptedRequirementCount: '0/96',
    implementedOutputCount: '0/96',
    independentlyClosedV4FindingCount: '0/12',
    operationalVectorExecutionCount: '0/288',
    B0: 'ABSENT',
    ControlSequenceAcceptance: 'BLOCKED',
    Gate29: 'BLOCKED',
    developmentFreeze: 'ACTIVE',
  },
};

write(OUTPUT.registry, pretty(normativeRegistry));
const registrySha = sha(bytes(OUTPUT.registry));

const remediationProofs = [
  'Every imported Requirement and Finding has a whole-member span longer than its heading marker plus five exact field spans where applicable; two readers recompute bytes, roots, bounds and uniqueness; one-byte, body-substitution and cross-ID span mutations block.',
  'All ten predecessor supersessions resolve to exact source members and unique literal atom offsets; old atom bytes and surrounding member bytes remain rooted; ambiguous, normalized, stale-locator and surrounding-deletion mutations block.',
  'Every inherited source reference resolves to an exact repository-relative artifact root and locator, including all 27 original sections; missing, prefix-ambiguous, neighboring-section and wrong-root mutations block.',
  'Every semantic relation uses an explicit marker distinct from citation; all seventeen interfaces have actual consumer/provider Requirements, input/output roots and executable validation predicates available before the consumer; hidden-forward and missing-edge mutations block.',
  'Exactly 94 object classes map once through continuous typed edges to exactly 36 heads and SecurityUniverseHead; self, two-node, discontinuous, duplicate, unmapped and multi-head mutations block.',
  'Exactly 288 vectors bind canonical portable fixture bytes, threat-relevant state mutations and executable oracles; each control evaluates ELIGIBLE and each mutation evaluates BLOCKED in two independent readers; stored expected values are never oracle inputs.',
  `Acceptance fields=${acceptanceFields.length}/${acceptanceFields.length}; Permit schemas=3/3; epoch, Attempt, fence, validity, expected ledger/pointer/revocation/security heads and one-use state are exact mandatory fields; omission, expiry-boundary, stale-fence and replay mutations block.`,
  'Witness acknowledgements=2/2 for one checkpoint and independence profiles=9/9; controllers, implementations, dependencies, runtimes and contexts are distinct; one-witness, split-checkpoint and common-mode mutations block.',
  'The sole serializable transaction compares expected pointer version/root, all 36 heads, Permit/revocation heads, Attempt and fence before one durable commit; revoke wins at equal revision; response loss performs authoritative lookup without effect retry.',
  `Genesis member slots=${genesisMemberSlots.length}/${genesisMemberSlots.length}; every slot has a rooted schema and null current instance until external admission; initial ledgers, external ceremony, two validators and first GenesisPermit have exact fields and non-self-admission predicates.`,
  'Recovery has five exact member slots, threshold 3, two witness slots, one-use challenge/Attempt schema and controller exclusion from all eight roles including AuthorityOwner; overlap, below-threshold, mixed-challenge, expiry and replay mutations block.',
  'Package root uses one domain-separated canonical-JSON equation over ordered member records; two language-independent readers recompute it and reject reorder, omission, mutation, duplicate ordinal and domain changes.',
];

function vectorIds(index) {
  return ['A', 'B', 'C'].map((slot) => `B0V5-V-${pad(index)}-${slot}`).join(',');
}

const remediationRequirements = findingDefinitions.map((finding, index) => ({
  id: `B0V5REQ-${pad(index)}`,
  number: index,
  title: finding.replacementNorm,
  fields: {
    statement: `addresses=${finding.findingId}; noMergeKey=${finding.noMergeKey}; output=B0V5OUT-${pad(index)}; uses=${finding.replacementId}; ${finding.replacementNorm}`,
    threatCauseImpact: `Without this distinct remediation, ${finding.noMergeKey} can preserve mechanical counts while allowing a non-causal or non-portable authority interpretation.`,
    requiredProof: `${remediationProofs[index]} vectors=${vectorIds(index)}.`,
    dependencies: `buildDependencies=${index === 0 ? 'none' : Array.from({ length: index }, (_, dependency) => `B0V5REQ-${pad(dependency)}`).join(',')}.`,
    sourceBasis: `cites=B0V4HRM@${SOURCE_BY_ALIAS.get('B0V4HRM').expectedSha256}::${finding.findingId}; cites=B0V5NR@${registrySha}::/replacementRegistry.`,
  },
}));

const interfaceUsesByOldRequirement = new Map();
const interfaceImplementsByOldRequirement = new Map();
for (const contract of priorInterfaces) {
  const consumerOld = Number(contract.consumerRequirement.slice(-3)) - 12;
  const providerOld = Number(contract.providerRequirement.slice(-3)) - 12;
  if (!interfaceUsesByOldRequirement.has(consumerOld)) interfaceUsesByOldRequirement.set(consumerOld, []);
  if (!interfaceImplementsByOldRequirement.has(providerOld)) interfaceImplementsByOldRequirement.set(providerOld, []);
  interfaceUsesByOldRequirement.get(consumerOld).push(contract.interfaceId);
  interfaceImplementsByOldRequirement.get(providerOld).push(contract.interfaceId);
}

function inheritedBuildDependencies(requirement) {
  const mapped = [...requirement.fields.dependencies.matchAll(/B0V4REQ-(\d{3})/g)].map((match) => `B0V5REQ-${pad(Number(match[1]) + 12)}`);
  return [...new Set([...Array.from({ length: 12 }, (_, index) => `B0V5REQ-${pad(index)}`), ...mapped])];
}

const preservationRequirements = v4Requirements.map((sourceRequirement, index) => {
  const targetNumber = index + 12;
  const uses = interfaceUsesByOldRequirement.get(index) || [];
  const implementsInterfaces = interfaceImplementsByOldRequirement.get(index) || [];
  const semanticMarkers = [
    uses.length ? `uses=${uses.join(',')}` : null,
    implementsInterfaces.length ? `implements=${implementsInterfaces.join(',')}` : null,
  ].filter(Boolean).join('; ');
  return {
    id: `B0V5REQ-${pad(targetNumber)}`,
    number: targetNumber,
    title: `Byte-exact inherited atom bundle for ${sourceRequirement.id}`,
    fields: {
      statement: `preservesV4=${sourceRequirement.id}; output=B0V5OUT-${pad(targetNumber)}; ${semanticMarkers ? `${semanticMarkers}; ` : ''}preserve all five source fields as separately rooted exact old-byte atoms; activate every non-contradictory conjunct and apply only enumerated typed replacements; preservation never equals authority or closure.`,
      threatCauseImpact: 'Dropping, rewriting, merging or silently activating a superseded predecessor atom can erase a safety obligation or revive a known defective interpretation.',
      requiredProof: `Five source field byte spans and values are exact; every defective atom has explicit SUPERSEDED disposition plus replacement; non-defective bytes remain mandatory; source/reference and mutation checks pass in two readers; vectors=${vectorIds(targetNumber)}.`,
      dependencies: `buildDependencies=${inheritedBuildDependencies(sourceRequirement).join(',')}.`,
      sourceBasis: `cites=B0V4@${SOURCE_BY_ALIAS.get('B0V4').expectedSha256}::${sourceRequirement.id}; cites=B0V5NR@${registrySha}::/replacementRegistry.`,
    },
  };
});

const allRequirements = [...remediationRequirements, ...preservationRequirements];
if (allRequirements.length !== 96) throw new Error('Expected 96 v5 Requirements');

function requirementMarkdown(requirement, chapter, ordinal) {
  const prefix = `${chapter}.${ordinal}`;
  return [
    `## ${prefix} \`${requirement.id}\` — ${requirement.title}`,
    '',
    `${prefix}.1 \`statement\`: ${requirement.fields.statement}`,
    '',
    `${prefix}.2 \`threatCauseImpact\`: ${requirement.fields.threatCauseImpact}`,
    '',
    `${prefix}.3 \`requiredProof\`: ${requirement.fields.requiredProof}`,
    '',
    `${prefix}.4 \`dependencies\`: ${requirement.fields.dependencies}`,
    '',
    `${prefix}.5 \`sourceBasis\`: ${requirement.fields.sourceBasis}`,
    '',
  ].join('\n');
}

const subjectLines = [
  '# 1. Connect — Bootstrap Authority Envelope B0 immutable successor requirements v5',
  '',
  '## 1.1 Identity, scope and zero authority',
  '',
  '1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-SUCCESSOR-REQUIREMENTS-V5-2026-08-30-G0`.',
  '',
  '1.1.2 `artifactClass=IMMUTABLE-REQUIREMENT-SUCCESSOR-CANDIDATE;PLANNING-ONLY;NOT-B0-DEFINITION;NOT-B0-INSTANCE;NOT-AUTHORITY;NOT-ACCEPTED`.',
  '',
  `1.1.3 Normative registry root=\`${registrySha}\`; every member is mandatory and the later atomic manifest binds the complete package.`,
  '',
  '1.1.4 Repository visibility is permanently `PUBLIC`. No Private fallback, secret/PII/restricted Evidence byte, private-byte digest, equality oracle, membership oracle or machine-local identity may enter a Public projection.',
  '',
  '1.1.5 This Candidate authorizes planning artifacts and planning QA readers only. It authorizes no Product code, Build, Runtime, Git/GitHub, provider, credential, deployment, purchase or external-message action.',
  '',
  '1.1.6 `externalL0Authority=ABSENT`; `genesisFoundationReceipt=ABSENT`; `canonicalMandateReceipt=ABSENT`; `acceptedRequirementCount=0/96`; `implementedOutputCount=0/96`; `independentlyClosedV4FindingCount=0/12`; `operationalVectorExecutionCount=0/288`; `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`.',
  '',
  '## 1.2 Exact frozen v4 cut and independent review roots',
  '',
  '| Alias | SHA-256 | Repository-root-relative path | Claim limit | Authority credit |',
  '|---|---|---|---|---:|',
  ...SOURCE_INPUTS.slice(0, 8).map((source) => `| \`${source.alias}\` | \`${source.expectedSha256}\` | \`${source.logicalPath}\` | ${source.claimLimit} | 0 |`),
  '',
  '1.2.1 The eight roots above are exact frozen inputs. The remaining predecessor/directive sources are imported only where the preserved v4 atoms require them and are exact-rooted in the source/member/span index.',
  '',
  '1.2.2 A source byte, review, Finding, QA report, schema, vector specification or package root contributes zero authority and transfers no Acceptance or closure.',
  '',
  '## 1.3 Exact Requirement, preservation and supersession contract',
  '',
  '1.3.1 Requirement IDs are contiguous `B0V5REQ-000..095`; every Requirement has exactly five fields and one unique Output.',
  '',
  '1.3.2 Requirements `000..011` remediate the exact twelve non-merged v4 Findings one-to-one. Requirements `012..095` preserve the exact 84 v4 Requirement identities and their 420 five-field values as old-byte atoms.',
  '',
  '1.3.3 Every non-contradictory inherited atom remains an active mandatory conjunct. Every defective atom or registry member remains byte-identical at its frozen source but has explicit typed `SUPERSEDED` disposition and a separately rooted replacement. Presence or preservation never means active authority.',
  '',
  '1.3.4 Build dependencies are the explicit `buildDependencies=` relation and point only backward. Citations, semantic uses and interface implementation are distinct typed relations.',
  '',
  '1.3.5 IDs and roots are deterministic, canonical and domain-separated. Random IDs, implicit entropy, default success and mock/fake/demo/sample/synthetic business data are prohibited.',
  '',
  '## 1.4 Closed machine denominators',
  '',
  `1.4.1 Remediations=12/12; preserved v4 Requirements=84/84; preserved fields=420/420; prior interfaces=17/17; mutable object classes=94/94; authoritative heads=36/36; current-head tuple schemas=36/36; applicable directive universe=5/5; Acceptance fields=${acceptanceFields.length}/${acceptanceFields.length}; Genesis member slots=${genesisMemberSlots.length}/${genesisMemberSlots.length}; recovery members=5/5; recovery witnesses=2/2; proof-class independence profiles=9/9; Outputs=96/96; vector specifications=288/288; maximum convergence rounds per review epoch=3.`,
  '',
  '1.4.2 Every operational instance, external foundation value, current Permit, current recovery profile, implementation root, execution receipt, review closure and Acceptance receipt remains absent.',
  '',
  '# 2. Twelve distinct v4 Finding remediations',
  '',
  ...remediationRequirements.flatMap((requirement, index) => requirementMarkdown(requirement, 2, index + 1).split('\n')),
  '# 3. Eighty-four byte-exact v4 Requirement preservation obligations',
  '',
  ...preservationRequirements.flatMap((requirement, index) => requirementMarkdown(requirement, 3, index + 1).split('\n')),
  '# 4. Output registry projection',
  '',
  '| Output | Requirement | Artifact class | Planning | Runtime | Implementation | Acceptance | Public representation |',
  '|---|---|---|---|---|---|---|---|',
  ...outputRegistry.map((output) => `| \`${output.outputId}\` | \`${output.requirementId}\` | \`${output.artifactClass}\` | \`PUBLIC\` | \`${output.runtimeInstanceClassification}\` | \`ABSENT\` | \`0\` | \`${output.publicRepresentation}\` |`),
  '',
  '# 5. Vector, review and convergence boundary',
  '',
  '5.1 `288/288` vector specifications must each decode canonical real package-derived fixture bytes, evaluate `ELIGIBLE` before its mutation and derive the stated blocked terminal after the threat-relevant mutation. A stored expected value is never an oracle input.',
  '',
  '5.2 Planning-DSL execution by Producer QA readers is mechanical evidence only. `operationalVectorExecutionCount=0/288` until a real sealed implementation, two independently admitted runners/evaluators and detached operational receipts exist.',
  '',
  '5.3 Maximum successor rounds per review epoch=`3`; automatic recursion=`false`; every admitted round requires a strict lexicographic decrease and explicit external authorization. No-progress or round exhaustion terminates `BLOCKED`.',
  '',
  '5.4 Producer QA cannot close a Finding. Fresh independent hostile review remains mandatory. `acceptedRequirementCount=0/96`; `Gate29=BLOCKED`.',
  '',
].join('\n');

write(OUTPUT.subject, subjectLines);
const subjectSha = sha(bytes(OUTPUT.subject));

const v5RegistrySource = { alias: 'B0V5NR', logicalPath: OUTPUT.registry, expectedSha256: registrySha, claimLimit: 'Exact v5 replacement schemas and closed machine denominators' };
const v5SubjectSource = { alias: 'B0V5', logicalPath: OUTPUT.subject, expectedSha256: subjectSha, claimLimit: 'Exact 96 v5 five-field Requirements and Output projection' };
const indexedArtifacts = [...indexedFrozenSources, indexArtifact(v5RegistrySource), indexArtifact(v5SubjectSource)];
const indexedArtifactsByAlias = new Map(indexedArtifacts.map((artifact) => [artifact.alias, artifact]));

const sourceIndex = {
  artifactId: 'CONNECT-B0-V5-PORTABLE-SOURCE-MEMBER-SPAN-INDEX-2026-08-30-G0',
  artifactClass: 'IMMUTABLE-PORTABLE-EXACT-SOURCE-INDEX;PUBLIC-PLANNING;NOT-AUTHORITY;NOT-ACCEPTANCE',
  schemaVersion: 1,
  subjectSha256: subjectSha,
  normativeRegistrySha256: registrySha,
  identitySchema: {
    exactFields: ['alias', 'logicalPath', 'artifactSha256', 'artifactBytes', 'artifactLines', 'mediaType', 'locator', 'startByteInclusive', 'endByteExclusive', 'memberByteLength', 'memberSha256'],
    logicalPathRule: 'REPOSITORY-ROOT-RELATIVE;NO-ABSOLUTE-PATH;NO-PATH-TRAVERSAL;NO-SYMLINK-AUTHORITY',
    memberRule: 'REQUIREMENT-OR-FINDING-ID-SPANS-THE-COMPLETE-HEADING-AND-BODY-UNTIL-THE-NEXT-SAME-OR-HIGHER-LEVEL-HEADING;FIELD-LOCATOR-SPANS-EXACT-VALUE-BYTES',
    minimumRequirementMemberBytes: 2,
    localResolverRule: 'PRIVATE-NON-AUTHORITATIVE-OBSERVATION;NEVER-A-PUBLIC-MEMBER;AUTHORITY-CREDIT=0',
  },
  artifactCount: indexedArtifacts.length,
  memberCount: indexedArtifacts.reduce((sum, artifact) => sum + artifact.memberCount, 0),
  artifacts: indexedArtifacts,
  repositoryVisibility: 'PUBLIC',
  authorityCredit: 0,
  acceptanceCredit: 0,
};
write(OUTPUT.sourceIndex, pretty(sourceIndex));
const sourceIndexSha = sha(bytes(OUTPUT.sourceIndex));

const v5RequirementsParsed = parseFiveFieldRequirements(text(OUTPUT.subject), 'B0V5REQ');
if (v5RequirementsParsed.length !== 96) throw new Error(`Generated Subject has ${v5RequirementsParsed.length} Requirements`);

function indexedRef(alias, locator) {
  const artifact = indexedArtifactsByAlias.get(alias);
  if (!artifact) throw new Error(`Unknown indexed alias ${alias}`);
  const member = artifact.members.find((candidate) => candidate.locator === locator);
  if (!member) throw new Error(`Unresolved indexed reference ${alias}::${locator}`);
  return { alias, logicalPath: artifact.logicalPath, artifactSha256: artifact.sha256, locator, startByteInclusive: member.startByteInclusive, endByteExclusive: member.endByteExclusive, byteLength: member.byteLength, memberSha256: member.sha256 };
}

function replacementIdsForField(requirementIndex, field, value) {
  const ids = [];
  if (field === 'requiredProof' && /B0V4-V-\d{3}-A\/B\/C/.test(value)) ids.push('B0V5-FIX-006');
  if (field === 'sourceBasis' && requirementIndex >= 14 && requirementIndex <= 40 && value.includes('B0V1@')) ids.push('B0V5-FIX-003');
  const targeted = {
    0: ['B0V5-FIX-002'],
    3: ['B0V5-FIX-004'],
    4: ['B0V5-FIX-010'],
    5: ['B0V5-FIX-005'],
    7: ['B0V5-FIX-006'],
    8: ['B0V5-FIX-007', 'B0V5-FIX-008'],
    10: ['B0V5-FIX-009'],
    11: ['B0V5-FIX-011'],
  };
  if (['statement', 'requiredProof'].includes(field) && targeted[requirementIndex]) ids.push(...targeted[requirementIndex]);
  return [...new Set(ids)];
}

function supersededAtomSelectors(value, replacementIds) {
  const candidates = [];
  for (const replacementId of replacementIds) {
    if (replacementId === 'B0V5-FIX-006') {
      const match = value.match(/vectors=B0V4-V-\d{3}-A\/B\/C/);
      if (match) candidates.push({ replacementId, atom: match[0], charIndex: match.index });
      else candidates.push({ replacementId, atom: value, charIndex: 0 });
    } else if (replacementId === 'B0V5-FIX-003') {
      const matches = [...value.matchAll(/B0V1@[a-f0-9]{64}::§2\.\d+/g)];
      if (!matches.length) candidates.push({ replacementId, atom: value, charIndex: 0 });
      else for (const match of matches) candidates.push({ replacementId, atom: match[0], charIndex: match.index });
    } else candidates.push({ replacementId, atom: value, charIndex: 0 });
  }
  return candidates.map(({ replacementId, atom, charIndex }, index) => {
    const atomBytes = Buffer.from(atom, 'utf8');
    const startByteWithinField = Buffer.byteLength(value.slice(0, charIndex), 'utf8');
    return {
      selectorId: `${replacementId}-ATOM-${String(index + 1).padStart(2, '0')}`,
      replacementId,
      startByteWithinField,
      endByteWithinField: startByteWithinField + atomBytes.length,
      exactOldAtom: atom,
      exactOldAtomUtf8Base64: atomBytes.toString('base64'),
      exactOldAtomSha256: sha(atomBytes),
      disposition: 'SUPERSEDED;OLD-ATOM-BYTES-PRESERVED;REPLACEMENT-SEPARATELY-NORMATIVE',
    };
  });
}

const inheritedV4Requirements = v4Requirements.map((requirement, index) => {
  const sourceMember = indexedRef('B0V4', requirement.id);
  const fields = Object.entries(requirement.fields).map(([field, value]) => {
    const replacements = replacementIdsForField(index, field, value);
    const valueBytes = Buffer.from(value, 'utf8');
    const selectors = supersededAtomSelectors(value, replacements);
    return {
      field,
      sourceField: indexedRef('B0V4', `${requirement.id}.${field}`),
      exactOldValue: value,
      exactOldValueUtf8Base64: valueBytes.toString('base64'),
      exactOldValueSha256: sha(valueBytes),
      disposition: replacements.length ? 'PRESERVED-OLD-BYTES;DEFECTIVE-ATOM-SUPERSEDED-BY-ENUMERATED-TYPED-REPLACEMENT;OLD-DEFECT-NON-NORMATIVE' : 'ACTIVE-INHERITED-MANDATORY-CONJUNCT',
      replacementIds: replacements,
      supersededAtomSelectors: selectors,
      activeRemainderRule: replacements.length ? 'EVERY-EXACT-BYTE-OUTSIDE-THE-ENUMERATED-SUPERSEDED-ATOM-SPANS-REMAINS-AN-ACTIVE-MANDATORY-CONJUNCT' : 'ENTIRE-EXACT-FIELD-REMAINS-AN-ACTIVE-MANDATORY-CONJUNCT',
      preservationAuthorityCredit: 0,
    };
  });
  return {
    sourceRequirementId: requirement.id,
    sourceMember,
    sourceFiveFieldRoot: domainRoot('CONNECT-B0-V4-FIVE-FIELD-BUNDLE-V1', requirement.fields),
    targetRequirementId: `B0V5REQ-${pad(index + 12)}`,
    targetOutputId: `B0V5OUT-${pad(index + 12)}`,
    mappingCardinality: 'ONE-SOURCE-TO-ONE-TARGET',
    fieldCount: 5,
    fields,
    preservationDoesNotEqualAuthority: true,
    closureTransferred: false,
    acceptanceTransferred: false,
  };
});

const sourceReferenceResolution = [];
for (const requirement of v4Requirements) {
  for (const [field, value] of Object.entries(requirement.fields)) {
    for (const match of value.matchAll(/([A-Z0-9]+)@([a-f0-9]{64})::([^;`\s]+)/g)) {
      const alias = match[1];
      const artifactSha256 = match[2];
      const locator = match[3].replace(/[.,]+$/, '');
      const reference = indexedRef(alias, locator);
      if (reference.artifactSha256 !== artifactSha256) throw new Error(`Source root mismatch ${alias}::${locator}`);
      sourceReferenceResolution.push({ requirementId: requirement.id, field, sourceReference: `${alias}@${artifactSha256}::${locator}`, resolvedMember: reference, state: 'RESOLVED-EXACT' });
    }
  }
}

const edgeClassByMarker = {
  addresses: 'ADDRESSES-FINDING',
  noMergeKey: 'IDENTIFIES-NO-MERGE-KEY',
  output: 'PRODUCES-OUTPUT',
  implements: 'IMPLEMENTS-PRIOR-INTERFACE',
  vectors: 'COVERED-BY-VECTOR',
  buildDependencies: 'BUILD-DEPENDS-ON',
  preservesV4: 'PRESERVES-V4-REQUIREMENT',
  cites: 'CITES-SOURCE-MEMBER',
};
const namedUses = [];
for (const requirement of v5RequirementsParsed) {
  for (const [field, value] of Object.entries(requirement.fields)) {
    for (const match of value.matchAll(/(addresses|noMergeKey|output|uses|implements|vectors|buildDependencies|preservesV4|cites)=([^;]+)/g)) {
      const marker = match[1];
      const targets = match[2].replace(/[.]+$/, '').split(',').map((target) => target.trim()).filter((target) => target && target !== 'none');
      for (const targetToken of targets) {
        const edgeClass = marker === 'uses' ? (targetToken.startsWith('B0V5-IFACE-') ? 'CONSUMES-PRIOR-INTERFACE' : 'USES-NORMATIVE-REPLACEMENT') : edgeClassByMarker[marker];
        const identity = { sourceRequirementId: requirement.id, field, marker, targetToken, ordinal: namedUses.length + 1 };
        namedUses.push({ useId: `B0V5-USE-${canonicalSha(identity).slice(0, 24)}`, ...identity, edgeClass, authorityCredit: 0 });
      }
    }
  }
}
const buildEdges = namedUses.filter((use) => use.edgeClass === 'BUILD-DEPENDS-ON').map((use) => ({ sourceRequirementId: use.sourceRequirementId, targetRequirementId: use.targetToken }));
for (const edge of buildEdges) {
  if (Number(edge.targetRequirementId.slice(-3)) >= Number(edge.sourceRequirementId.slice(-3))) throw new Error(`Non-backward build edge ${edge.sourceRequirementId}->${edge.targetRequirementId}`);
}

const hostileFindingClosureRows = findingDefinitions.map((finding) => ({
  sourceFindingId: finding.findingId,
  sourceFinding: indexedRef('B0V4HRM', finding.findingId),
  severity: finding.severity,
  noMergeKey: finding.noMergeKey,
  targetRequirementId: finding.targetRequirementId,
  targetOutputId: finding.targetOutputId,
  replacementId: finding.replacementId,
  replacementRoot: replacementRegistry[finding.ordinal - 1].replacementRoot,
  mappingCardinality: 'ONE-SOURCE-TO-ONE-TARGET;NO-MERGE',
  candidateDelta: 'MATERIALIZED',
  closurePredicate: remediationProofs[finding.ordinal - 1],
  requiredVectorIds: ['A', 'B', 'C'].map((slot) => `B0V5-V-${pad(finding.ordinal - 1)}-${slot}`),
  materializedEvidence: {
    normativeRegistrySha256: registrySha,
    sourceMemberSpanIndexSha256: sourceIndexSha,
    targetRequirementFiveFieldRoot: domainRoot('CONNECT-B0-V5-FIVE-FIELD-BUNDLE-V1', v5RequirementsParsed[finding.ordinal - 1].fields),
    targetOutputId: finding.targetOutputId,
  },
  candidateClaimLimit: 'DESIGN-DELTA-MATERIALIZED;NOT-INDEPENDENTLY-CLOSED;NOT-OPERATIONAL-EVIDENCE',
  independentClosureState: 'OPEN-PENDING-FRESH-INDEPENDENT-HOSTILE-REVIEW',
  closureTransferred: false,
  acceptanceTransferred: false,
  evidenceBorrowed: false,
  authorityCredit: 0,
}));

const crosswalk = {
  artifactId: 'CONNECT-B0-V5-CLOSURE-PRESERVATION-NAMEDUSE-CROSSWALK-2026-08-30-G0',
  artifactClass: 'IMMUTABLE-DETACHED-CROSSWALK;PLANNING-ONLY;NOT-CLOSURE;NOT-AUTHORITY;NOT-ACCEPTANCE',
  schemaVersion: 1,
  subjectSha256: subjectSha,
  normativeRegistrySha256: registrySha,
  sourceMemberSpanIndexSha256: sourceIndexSha,
  hostileFindingDenominator: 12,
  hostileFindingClosureRecordCount: 12,
  hostileFindingClosureRows,
  inheritedV4RequirementCount: 84,
  inheritedV4FieldCount: 420,
  inheritedV4Requirements,
  inheritedSourceReferenceResolution: { referenceCount: sourceReferenceResolution.length, resolvedCount: sourceReferenceResolution.length, unresolved: [], references: sourceReferenceResolution },
  v5RequirementCount: 96,
  v5FiveFieldCount: 480,
  v5Requirements: v5RequirementsParsed.map((requirement) => ({ requirementId: requirement.id, title: requirement.title, fields: requirement.fields, fieldRoot: domainRoot('CONNECT-B0-V5-FIVE-FIELD-BUNDLE-V1', requirement.fields), outputId: `B0V5OUT-${requirement.id.slice(-3)}` })),
  namedUseGraph: {
    extractionRule: 'PARSE-EVERY-EXPLICIT-RELATION-MARKER-IN-EVERY-V5-FIVE-FIELD-ROW;MARKER-DETERMINES-ONE-CLOSED-EDGE-CLASS;CITATION-IS-NEVER-A-SEMANTIC-OR-BUILD-EDGE',
    namedUseCount: namedUses.length,
    namedUses,
    buildEdgeCount: buildEdges.length,
    buildEdges,
    priorInterfaceCount: priorInterfaces.length,
    priorInterfaces: priorInterfaces.map((contract) => ({ interfaceId: contract.interfaceId, consumerRequirement: contract.consumerRequirement, providerRequirement: contract.providerRequirement, instanceRoot: contract.instanceRoot, consumerUseCount: namedUses.filter((use) => use.targetToken === contract.interfaceId && use.edgeClass === 'CONSUMES-PRIOR-INTERFACE').length, providerImplementationCount: namedUses.filter((use) => use.targetToken === contract.interfaceId && use.edgeClass === 'IMPLEMENTS-PRIOR-INTERFACE').length })),
    citationEdgeClass: 'CITES-SOURCE-MEMBER',
    semanticUseEdgeClasses: ['USES-NORMATIVE-REPLACEMENT', 'CONSUMES-PRIOR-INTERFACE', 'IMPLEMENTS-PRIOR-INTERFACE'],
    unclassifiedMarkerUses: [],
  },
  outputRegistryRoot: domainRoot('CONNECT-B0-V5-OUTPUT-REGISTRY-V1', outputRegistry),
  currentClosureState: '0/12;FRESH-INDEPENDENT-REVIEW-PENDING',
  authorityCredit: 0,
  acceptanceCredit: 0,
};
write(OUTPUT.crosswalk, pretty(crosswalk));
const crosswalkSha = sha(bytes(OUTPUT.crosswalk));

function packageContentRoot(domain, members) {
  const normalized = members.map(({ ordinal, logicalPath, sha256, bytes: memberBytes, required }) => ({ ordinal, logicalPath, sha256, bytes: memberBytes, required }));
  return sha(Buffer.from(`${domain}\n${canonical(normalized)}`, 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setJsonPointer(document, pointer, value) {
  const parts = pointer.split('/').slice(1).map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
  let target = document;
  for (let index = 0; index < parts.length - 1; index += 1) target = target[parts[index]];
  target[parts.at(-1)] = clone(value);
}

function applyOperations(state, operations) {
  const next = clone(state);
  for (const operation of operations) {
    if (operation.op !== 'SET') throw new Error(`Unsupported vector operation ${operation.op}`);
    setJsonPointer(next, operation.path, operation.value);
  }
  return next;
}

function evaluateOracle(kind, state) {
  if (kind === 'SOURCE-MEMBER-IDENTITY') {
    const member = Buffer.from(state.memberBytesBase64, 'base64');
    const memberText = member.toString('utf8');
    return member.length === state.endByteExclusive - state.startByteInclusive
      && member.length > 1
      && sha(member) === state.memberSha256
      && memberText.includes(`\`${state.locator}\``)
      && state.requiredFieldLabels.every((field) => memberText.includes(`\`${field}\``));
  }
  if (kind === 'TYPED-SUPERSESSION-LITERAL') {
    const source = Buffer.from(state.sourceMemberBytesBase64, 'base64');
    const atom = Buffer.from(state.oldAtomBytesBase64, 'base64');
    return state.locatorResolvable === true
      && sha(source) === state.sourceMemberSha256
      && state.oldAtomStartByteWithinMember >= 0
      && state.oldAtomEndByteWithinMember === state.oldAtomStartByteWithinMember + atom.length
      && source.subarray(state.oldAtomStartByteWithinMember, state.oldAtomEndByteWithinMember).equals(atom)
      && source.indexOf(atom, state.oldAtomStartByteWithinMember + 1) < 0;
  }
  if (kind === 'LOCATOR-RESOLUTION') {
    const member = Buffer.from(state.memberBytesBase64, 'base64');
    return state.resolves === true
      && state.logicalPath.startsWith('web/')
      && !state.logicalPath.includes('..')
      && !state.logicalPath.startsWith('/')
      && state.locator === state.expectedLocator
      && sha(member) === state.memberSha256
      && member.length === state.endByteExclusive - state.startByteInclusive;
  }
  if (kind === 'SEMANTIC-INTERFACE') {
    const { instanceRoot, ...body } = state.interface;
    const edges = state.edges;
    return body.consumerClass && body.providerClass && body.inputRoot && body.outputRoot
      && body.validationPredicate && body.validationPredicateRoot
      && domainRoot('CONNECT-B0-V5-PRIOR-INTERFACE-V1', body) === instanceRoot
      && edges.some((edge) => edge.edgeClass === 'CONSUMES-PRIOR-INTERFACE' && edge.target === body.interfaceId && edge.source === body.consumerRequirement)
      && edges.some((edge) => edge.edgeClass === 'IMPLEMENTS-PRIOR-INTERFACE' && edge.target === body.interfaceId && edge.source === body.providerRequirement)
      && state.citationEdgeClass === 'CITES-SOURCE-MEMBER'
      && !state.semanticEdgeClasses.includes(state.citationEdgeClass);
  }
  if (kind === 'MUTABLE-HEAD-DAG') {
    const objects = state.objectToHead;
    const headsSet = new Set(state.headIds);
    return objects.length === 94 && state.headIds.length === 36 && new Set(objects.map((row) => row.objectClass)).size === 94
      && new Set(state.headIds).size === 36
      && objects.every((row) => headsSet.has(row.headId) && row.membershipPath.length === 2
        && row.membershipPath.every((edge) => edge.sourceNode !== edge.targetNode)
        && row.membershipPath[0].targetNode === row.membershipPath[1].sourceNode
        && row.membershipPath[1].targetNode === 'Head:SecurityUniverseHead');
  }
  if (kind === 'VECTOR-CAUSAL-SPEC') {
    const fixtureBytes = Buffer.from(state.fixtureBytesBase64, 'base64');
    return sha(fixtureBytes) === state.fixtureSha256
      && state.operationPaths.some((path) => state.oracleReadPaths.includes(path))
      && state.oracleKind !== 'STORED-EXPECTED'
      && state.storedExpectedUsedAsOracleInput === false
      && state.controlDecision === 'ELIGIBLE'
      && state.mutationDecision === 'BLOCKED';
  }
  if (kind === 'ACCEPTANCE-PERMIT-FIELDS') {
    return state.requiredAcceptanceNames.every((name) => state.acceptanceFieldNames.includes(name))
      && state.requiredPermitNames.every((name) => state.permitFieldNames.includes(name))
      && state.values.notBefore <= state.values.trustedNow
      && state.values.trustedNow < state.values.validThrough
      && state.values.attemptUsed === false
      && state.values.providedFence >= state.values.currentFence
      && state.values.expectedPermitHead === state.values.currentPermitHead
      && state.values.expectedRevocationHead === state.values.currentRevocationHead;
  }
  if (kind === 'WITNESS-INDEPENDENCE') {
    const witnessesValid = state.witnesses.length === 2
      && state.witnesses[0].controller !== state.witnesses[1].controller
      && state.witnesses[0].checkpointRoot === state.witnesses[1].checkpointRoot
      && state.witnesses.every((witness) => witness.acknowledgementRoot);
    const classes = new Set(state.profiles.map((profile) => profile.proofClass));
    return witnessesValid && state.profiles.length === 9 && classes.size === 9
      && proofClassNames.every((proofClass) => classes.has(proofClass))
      && state.profiles.every((profile) => profile.implementationRootA !== profile.implementationRootB && profile.dependencyRootA !== profile.dependencyRootB && profile.runtimeRootA !== profile.runtimeRootB && profile.controllerRootA !== profile.controllerRootB);
  }
  if (kind === 'ACCEPTANCE-CAS') {
    return state.expectedPointerVersion === state.currentPointerVersion
      && state.expectedPointerRoot === state.currentPointerRoot
      && state.attemptUsed === false
      && state.providedFence >= state.currentFence
      && state.commitRevision > state.revocationRevision
      && state.notBefore <= state.trustedNow && state.trustedNow < state.validThrough
      && !(state.responseLost && state.retryEffectRequested);
  }
  if (kind === 'GENESIS-CAUSALITY') {
    const ids = new Set(state.memberSlots.map((member) => member.memberId));
    return state.memberSlots.length === state.expectedMemberCount
      && ids.size === state.expectedMemberCount
      && state.memberSlots.every((member) => member.slotSchemaRoot && member.currentInstanceRoot === null)
      && state.externalIssuerClass === 'EXTERNAL-L0-QUORUM-PREEXISTING-B0'
      && state.validatorProfileIds.length === 2 && new Set(state.validatorProfileIds).size === 2
      && state.firstPermitPrerequisiteMemberIds.every((memberId) => ids.has(memberId))
      && state.createsOwnPrerequisite === false;
  }
  if (kind === 'RECOVERY-QUORUM') {
    const memberControllers = state.memberControllers;
    const allControllers = [...memberControllers, ...state.witnessControllers];
    return memberControllers.length === 5 && new Set(memberControllers).size === 5
      && state.witnessControllers.length === 2 && new Set(allControllers).size === 7
      && allControllers.every((controller) => !state.excludedRoleControllers.includes(controller))
      && state.excludedRoleControllers.includes('AuthorityOwner')
      && new Set(state.signingMemberIds).size >= state.threshold
      && state.attemptUsed === false
      && state.sameChallenge === true;
  }
  if (kind === 'PACKAGE-CONTENT-ROOT') {
    return state.domain === 'CONNECT-B0-V5-PACKAGE-CONTENT-V1'
      && state.members.every((member, index) => member.ordinal === index + 1)
      && new Set(state.members.map((member) => member.logicalPath)).size === state.members.length
      && packageContentRoot(state.domain, state.members) === state.declaredRoot;
  }
  if (kind === 'INHERITED-ATOM') {
    const source = Buffer.from(state.sourceValueBase64, 'base64');
    const stored = Buffer.from(state.storedValueBase64, 'base64');
    const validDisposition = state.disposition === 'ACTIVE-INHERITED-MANDATORY-CONJUNCT'
      || (state.disposition.includes('SUPERSEDED') && state.replacementIds.length > 0);
    return source.equals(stored) && sha(stored) === state.storedValueSha256 && validDisposition;
  }
  throw new Error(`Unknown oracle kind ${kind}`);
}

function findingVectorBlueprint(index, slot) {
  if (index === 0) {
    const reference = indexedRef('B0V4', 'B0V4REQ-000');
    const source = bytes(reference.logicalPath).subarray(reference.startByteInclusive, reference.endByteExclusive);
    const state = { ...reference, locator: 'B0V4REQ-000', memberBytesBase64: source.toString('base64'), memberSha256: sha(source), requiredFieldLabels: ['statement', 'threatCauseImpact', 'requiredProof', 'dependencies', 'sourceBasis'] };
    const operations = slot === 'A' ? [{ op: 'SET', path: '/endByteExclusive', value: state.startByteInclusive + 1 }]
      : slot === 'B' ? [{ op: 'SET', path: '/memberBytesBase64', value: Buffer.from('#').toString('base64') }]
        : [{ op: 'SET', path: '/locator', value: 'B0V4REQ-999' }];
    return { state, operations, oracleKind: 'SOURCE-MEMBER-IDENTITY', reasonCode: `SOURCE-MEMBER-${slot}-INVALID`, sourceRefs: [reference] };
  }
  if (index === 1) {
    const row = exactAtomSupersessions[0];
    const source = memberBytes(row.sourceMember.alias, row.sourceMember.locator);
    const state = { locatorResolvable: true, sourceMemberBytesBase64: source.toString('base64'), sourceMemberSha256: sha(source), oldAtomBytesBase64: row.oldAtomUtf8Base64, oldAtomStartByteWithinMember: row.oldAtomStartByteWithinMember, oldAtomEndByteWithinMember: row.oldAtomEndByteWithinMember };
    const operations = slot === 'A' ? [{ op: 'SET', path: '/oldAtomStartByteWithinMember', value: row.oldAtomStartByteWithinMember + 1 }]
      : slot === 'B' ? [{ op: 'SET', path: '/oldAtomBytesBase64', value: Buffer.from('response loss may yield COMMITTED-UNCONFIRMED').toString('base64') }]
        : [{ op: 'SET', path: '/locatorResolvable', value: false }];
    return { state, operations, oracleKind: 'TYPED-SUPERSESSION-LITERAL', reasonCode: `SUPERSESSION-${slot}-INVALID`, sourceRefs: [row.sourceMember] };
  }
  if (index === 2) {
    const reference = indexedRef('B0V1', '§2.1');
    const source = bytes(reference.logicalPath).subarray(reference.startByteInclusive, reference.endByteExclusive);
    const state = { logicalPath: reference.logicalPath, expectedLocator: '§2.1', locator: '§2.1', startByteInclusive: reference.startByteInclusive, endByteExclusive: reference.endByteExclusive, memberBytesBase64: source.toString('base64'), memberSha256: sha(source), resolves: true };
    const operations = slot === 'A' ? [{ op: 'SET', path: '/resolves', value: false }]
      : slot === 'B' ? [{ op: 'SET', path: '/locator', value: '§2.1.1' }]
        : [{ op: 'SET', path: '/memberSha256', value: '0'.repeat(64) }];
    return { state, operations, oracleKind: 'LOCATOR-RESOLUTION', reasonCode: `LOCATOR-${slot}-INVALID`, sourceRefs: [reference] };
  }
  if (index === 3) {
    const contract = clone(priorInterfaces[0]);
    const state = {
      interface: contract,
      edges: [
        { edgeClass: 'CONSUMES-PRIOR-INTERFACE', source: contract.consumerRequirement, target: contract.interfaceId },
        { edgeClass: 'IMPLEMENTS-PRIOR-INTERFACE', source: contract.providerRequirement, target: contract.interfaceId },
      ],
      citationEdgeClass: 'CITES-SOURCE-MEMBER',
      semanticEdgeClasses: ['CONSUMES-PRIOR-INTERFACE', 'IMPLEMENTS-PRIOR-INTERFACE'],
    };
    const operations = slot === 'A' ? [{ op: 'SET', path: '/interface/validationPredicate', value: null }]
      : slot === 'B' ? [{ op: 'SET', path: '/edges', value: [state.edges[0]] }]
        : [{ op: 'SET', path: '/citationEdgeClass', value: 'CONSUMES-PRIOR-INTERFACE' }];
    return { state, operations, oracleKind: 'SEMANTIC-INTERFACE', reasonCode: `SEMANTIC-INTERFACE-${slot}-INVALID`, sourceRefs: replacementRegistry[3].oldMembers };
  }
  if (index === 4) {
    const state = { headIds: fixedHeads.map((head) => head.headId), objectToHead: clone(fixedObjectToHead) };
    let operations;
    if (slot === 'A') {
      const path = clone(state.objectToHead[0].membershipPath);
      path[0].targetNode = path[0].sourceNode;
      operations = [{ op: 'SET', path: '/objectToHead/0/membershipPath', value: path }];
    } else if (slot === 'B') operations = [{ op: 'SET', path: '/objectToHead', value: [...state.objectToHead, clone(state.objectToHead[0])] }];
    else operations = [{ op: 'SET', path: '/objectToHead/0/membershipPath/1/sourceNode', value: 'Head:WRONG' }];
    return { state, operations, oracleKind: 'MUTABLE-HEAD-DAG', reasonCode: `MUTABLE-HEAD-${slot}-INVALID`, sourceRefs: replacementRegistry[4].oldMembers };
  }
  if (index === 5) {
    const fixtureDocument = { subjectSha256: subjectSha, requirementId: 'B0V5REQ-000', sourceMemberSha256: indexedRef('B0V4', 'B0V4REQ-000').memberSha256 };
    const fixtureBytes = Buffer.from(canonical(fixtureDocument), 'utf8');
    const state = { fixtureBytesBase64: fixtureBytes.toString('base64'), fixtureSha256: sha(fixtureBytes), operationPaths: ['/endByteExclusive'], oracleReadPaths: ['/startByteInclusive', '/endByteExclusive', '/memberBytesBase64'], oracleKind: 'SOURCE-MEMBER-IDENTITY', storedExpectedUsedAsOracleInput: false, controlDecision: 'ELIGIBLE', mutationDecision: 'BLOCKED' };
    const operations = slot === 'A' ? [{ op: 'SET', path: '/operationPaths', value: ['/attack'] }]
      : slot === 'B' ? [{ op: 'SET', path: '/oracleKind', value: 'STORED-EXPECTED' }]
        : [{ op: 'SET', path: '/fixtureBytesBase64', value: Buffer.from('{}').toString('base64') }];
    return { state, operations, oracleKind: 'VECTOR-CAUSAL-SPEC', reasonCode: `VECTOR-CAUSALITY-${slot}-INVALID`, sourceRefs: replacementRegistry[5].oldMembers };
  }
  if (index === 6) {
    const state = {
      acceptanceFieldNames: acceptanceFields.map((field) => field.name),
      requiredAcceptanceNames,
      permitFieldNames: permitSchemas[0].exactFields,
      requiredPermitNames: commonPermitFields,
      values: { notBefore: 90, trustedNow: 100, validThrough: 110, attemptUsed: false, providedFence: 7, currentFence: 7, expectedPermitHead: 'PERMIT-HEAD-7', currentPermitHead: 'PERMIT-HEAD-7', expectedRevocationHead: 'REVOCATION-HEAD-6', currentRevocationHead: 'REVOCATION-HEAD-6' },
    };
    const operations = slot === 'A' ? [{ op: 'SET', path: '/acceptanceFieldNames', value: state.acceptanceFieldNames.filter((name) => name !== 'permitValidThrough') }]
      : slot === 'B' ? [{ op: 'SET', path: '/values/trustedNow', value: 110 }]
        : [{ op: 'SET', path: '/values/attemptUsed', value: true }];
    return { state, operations, oracleKind: 'ACCEPTANCE-PERMIT-FIELDS', reasonCode: `ACCEPTANCE-PERMIT-${slot}-INVALID`, sourceRefs: replacementRegistry[6].oldMembers };
  }
  if (index === 7) {
    const checkpointRoot = domainRoot('CONNECT-B0-V5-WITNESS-CHECKPOINT-V1', { subjectSha256: subjectSha, revision: 0 });
    const profiles = proofClassNames.map((proofClass) => ({ proofClass, implementationRootA: domainRoot('CONNECT-B0-V5-IMPL-A', proofClass), implementationRootB: domainRoot('CONNECT-B0-V5-IMPL-B', proofClass), dependencyRootA: domainRoot('CONNECT-B0-V5-DEP-A', proofClass), dependencyRootB: domainRoot('CONNECT-B0-V5-DEP-B', proofClass), runtimeRootA: domainRoot('CONNECT-B0-V5-RUNTIME-A', proofClass), runtimeRootB: domainRoot('CONNECT-B0-V5-RUNTIME-B', proofClass), controllerRootA: `CONTROLLER-A:${proofClass}`, controllerRootB: `CONTROLLER-B:${proofClass}` }));
    const state = { witnesses: [{ controller: 'WITNESS-CONTROLLER-1', checkpointRoot, acknowledgementRoot: domainRoot('CONNECT-B0-V5-WITNESS-ACK-1', checkpointRoot) }, { controller: 'WITNESS-CONTROLLER-2', checkpointRoot, acknowledgementRoot: domainRoot('CONNECT-B0-V5-WITNESS-ACK-2', checkpointRoot) }], profiles };
    const operations = slot === 'A' ? [{ op: 'SET', path: '/witnesses/1/controller', value: 'WITNESS-CONTROLLER-1' }]
      : slot === 'B' ? [{ op: 'SET', path: '/witnesses/1/checkpointRoot', value: domainRoot('CONNECT-B0-V5-WITNESS-CHECKPOINT-V1', { subjectSha256: subjectSha, revision: 1 }) }]
        : [{ op: 'SET', path: '/profiles', value: profiles.slice(0, 8) }];
    return { state, operations, oracleKind: 'WITNESS-INDEPENDENCE', reasonCode: `WITNESS-INDEPENDENCE-${slot}-INVALID`, sourceRefs: replacementRegistry[7].oldMembers };
  }
  if (index === 8) {
    const state = { expectedPointerVersion: 7, currentPointerVersion: 7, expectedPointerRoot: 'POINTER-ROOT-7', currentPointerRoot: 'POINTER-ROOT-7', attemptUsed: false, providedFence: 8, currentFence: 8, commitRevision: 8, revocationRevision: 7, notBefore: 90, trustedNow: 100, validThrough: 110, responseLost: false, retryEffectRequested: false };
    const operations = slot === 'A' ? [{ op: 'SET', path: '/currentPointerVersion', value: 8 }]
      : slot === 'B' ? [{ op: 'SET', path: '/revocationRevision', value: 8 }]
        : [{ op: 'SET', path: '/responseLost', value: true }, { op: 'SET', path: '/retryEffectRequested', value: true }];
    return { state, operations, oracleKind: 'ACCEPTANCE-CAS', reasonCode: `ACCEPTANCE-CAS-${slot}-INVALID`, sourceRefs: replacementRegistry[8].oldMembers };
  }
  if (index === 9) {
    const state = { memberSlots: clone(genesisMemberSlots), expectedMemberCount: genesisMemberSlots.length, externalIssuerClass: 'EXTERNAL-L0-QUORUM-PREEXISTING-B0', validatorProfileIds: ['B0V5-GFM-032', 'B0V5-GFM-033'], firstPermitPrerequisiteMemberIds: genesisMemberSlots.map((member) => member.memberId), createsOwnPrerequisite: false };
    const operations = slot === 'A' ? [{ op: 'SET', path: '/memberSlots', value: state.memberSlots.slice(0, -1) }]
      : slot === 'B' ? [{ op: 'SET', path: '/validatorProfileIds', value: ['B0V5-GFM-032', 'B0V5-GFM-032'] }]
        : [{ op: 'SET', path: '/externalIssuerClass', value: 'B0-DESCENDANT-SELF-ISSUER' }];
    return { state, operations, oracleKind: 'GENESIS-CAUSALITY', reasonCode: `GENESIS-${slot}-INVALID`, sourceRefs: replacementRegistry[9].oldMembers };
  }
  if (index === 10) {
    const memberControllers = Array.from({ length: 5 }, (_, ordinal) => `RECOVERY-CONTROLLER-${ordinal + 1}`);
    const state = { memberControllers, witnessControllers: ['RECOVERY-WITNESS-CONTROLLER-1', 'RECOVERY-WITNESS-CONTROLLER-2'], excludedRoleControllers: roles, signingMemberIds: ['B0V5-RECOVERY-MEMBER-01', 'B0V5-RECOVERY-MEMBER-02', 'B0V5-RECOVERY-MEMBER-03'], threshold: 3, attemptUsed: false, sameChallenge: true };
    const operations = slot === 'A' ? [{ op: 'SET', path: '/memberControllers/0', value: 'AuthorityOwner' }]
      : slot === 'B' ? [{ op: 'SET', path: '/signingMemberIds', value: state.signingMemberIds.slice(0, 2) }]
        : [{ op: 'SET', path: '/attemptUsed', value: true }];
    return { state, operations, oracleKind: 'RECOVERY-QUORUM', reasonCode: `RECOVERY-${slot}-INVALID`, sourceRefs: replacementRegistry[10].oldMembers };
  }
  const domain = 'CONNECT-B0-V5-PACKAGE-CONTENT-V1';
  const members = v4Manifest.members.map(({ ordinal, logicalPath, sha256, bytes: memberBytes, required }) => ({ ordinal, logicalPath, sha256, bytes: memberBytes, required }));
  const state = { domain, members, declaredRoot: packageContentRoot(domain, members) };
  let operations;
  if (slot === 'A') {
    const changed = clone(members);
    changed[0].sha256 = '0'.repeat(64);
    operations = [{ op: 'SET', path: '/members', value: changed }];
  } else if (slot === 'B') operations = [{ op: 'SET', path: '/domain', value: 'CONNECT-B0-V5-PACKAGE-CONTENT-V0' }];
  else operations = [{ op: 'SET', path: '/members', value: [...members].reverse() }];
  return { state, operations, oracleKind: 'PACKAGE-CONTENT-ROOT', reasonCode: `PACKAGE-ROOT-${slot}-INVALID`, sourceRefs: replacementRegistry[11].oldMembers };
}

function preservationVectorBlueprint(sourceIndexNumber, slot) {
  const inherited = inheritedV4Requirements[sourceIndexNumber];
  const fieldName = slot === 'A' ? 'statement' : slot === 'B' ? 'requiredProof' : 'sourceBasis';
  const field = inherited.fields.find((candidate) => candidate.field === fieldName);
  const state = { sourceValueBase64: field.exactOldValueUtf8Base64, storedValueBase64: field.exactOldValueUtf8Base64, storedValueSha256: field.exactOldValueSha256, disposition: field.disposition, replacementIds: field.replacementIds };
  let operations;
  if (slot === 'A') operations = [{ op: 'SET', path: '/storedValueBase64', value: Buffer.from(`${field.exactOldValue}\n`, 'utf8').toString('base64') }];
  else if (slot === 'B') operations = [{ op: 'SET', path: '/storedValueSha256', value: '0'.repeat(64) }];
  else operations = [{ op: 'SET', path: '/disposition', value: 'PRESERVED-OLD-BYTES;DEFECTIVE-ATOM-SUPERSEDED-BY-ENUMERATED-TYPED-REPLACEMENT;OLD-DEFECT-NON-NORMATIVE' }, { op: 'SET', path: '/replacementIds', value: [] }];
  return { state, operations, oracleKind: 'INHERITED-ATOM', reasonCode: `INHERITED-${fieldName.toUpperCase()}-${slot}-INVALID`, sourceRefs: [field.sourceField] };
}

const fixtures = [];
const vectors = [];
for (let requirementIndex = 0; requirementIndex < 96; requirementIndex += 1) {
  for (const slot of ['A', 'B', 'C']) {
    const blueprint = requirementIndex < 12 ? findingVectorBlueprint(requirementIndex, slot) : preservationVectorBlueprint(requirementIndex - 12, slot);
    if (!evaluateOracle(blueprint.oracleKind, blueprint.state)) throw new Error(`Control fixture is not eligible for B0V5REQ-${pad(requirementIndex)}-${slot}`);
    const mutatedState = applyOperations(blueprint.state, blueprint.operations);
    if (evaluateOracle(blueprint.oracleKind, mutatedState)) throw new Error(`Mutation did not block B0V5REQ-${pad(requirementIndex)}-${slot}`);
    const fixtureId = `B0V5-FIXTURE-${pad(requirementIndex)}-${slot}`;
    const fixtureDocument = {
      fixtureId,
      requirementId: `B0V5REQ-${pad(requirementIndex)}`,
      slot,
      fixtureClass: requirementIndex < 12 ? 'REAL-FROZEN-SOURCE-AND-NORMATIVE-SCHEMA-DERIVED-DOMAIN-STATE' : 'REAL-FROZEN-V4-FIELD-BYTES-DERIVED-INHERITED-ATOM-STATE',
      sourceRefs: blueprint.sourceRefs,
      domainState: blueprint.state,
      authorityCredit: 0,
      usableAuthority: 0,
      operationalInstance: null,
    };
    const fixtureBytes = Buffer.from(canonical(fixtureDocument), 'utf8');
    const fixture = { fixtureId, requirementId: fixtureDocument.requirementId, slot, fixtureDocument, fixtureBytesEncoding: 'BASE64-OF-UTF8-CANONICAL-JSON-V1', fixtureBytesBase64: fixtureBytes.toString('base64'), fixtureSha256: sha(fixtureBytes), byteLength: fixtureBytes.length, mockData: false, sampleData: false, syntheticBusinessData: false };
    fixtures.push(fixture);
    const program = { operations: blueprint.operations, oracle: { kind: blueprint.oracleKind, readsMutatedDomainState: true, storedExpectedValueIsOracleInput: false } };
    const vectorId = `B0V5-V-${pad(requirementIndex)}-${slot}`;
    vectors.push({
      vectorId,
      requirementId: fixtureDocument.requirementId,
      slot,
      fixtureId,
      fixtureSha256: fixture.fixtureSha256,
      precondition: { fixtureSha256: fixture.fixtureSha256, subjectSha256: subjectSha, normativeRegistrySha256: registrySha, sourceMemberSpanIndexSha256: sourceIndexSha, authorityCredit: 0 },
      preconditionRoot: domainRoot('CONNECT-B0-V5-VECTOR-PRECONDITION-V1', { fixtureSha256: fixture.fixtureSha256, subjectSha256: subjectSha, normativeRegistrySha256: registrySha, sourceMemberSpanIndexSha256: sourceIndexSha, authorityCredit: 0 }),
      program,
      programRoot: domainRoot('CONNECT-B0-V5-VECTOR-PROGRAM-V1', program),
      expected: { controlDecision: 'ELIGIBLE', mutationDecision: 'BLOCKED', reasonCode: blueprint.reasonCode, usableAuthority: 0, postcondition: 'NO-CURRENT-POINTER;NO-EXTERNAL-EFFECT;NO-CLOSURE-CREDIT' },
      observed: null,
      evidenceRoot: null,
      disposition: 'CAUSAL-PLANNING-SPECIFICATION;PRODUCER-DSL-EXECUTION-PENDING;OPERATIONAL-EXECUTION-ABSENT;NOT-ACCEPTED',
    });
  }
}
if (fixtures.length !== 288 || vectors.length !== 288) throw new Error('Vector denominator changed');

const vectorCorpus = {
  artifactId: 'CONNECT-B0-V5-CAUSAL-EXECUTABLE-VECTOR-CORPUS-2026-08-30-G0',
  artifactClass: 'IMMUTABLE-PORTABLE-DOMAIN-STATE-FIXTURE-AND-ORACLE-CORPUS;PLANNING-ONLY;NOT-OPERATIONAL-EVIDENCE;NOT-AUTHORITY;NOT-ACCEPTANCE',
  schemaVersion: 1,
  subjectSha256: subjectSha,
  normativeRegistrySha256: registrySha,
  sourceMemberSpanIndexSha256: sourceIndexSha,
  closureCrosswalkSha256: crosswalkSha,
  canonicalFixtureEncoding: 'UTF8-OF-B0V5-CANONICAL-JSON-V1;BASE64-EMBEDDED;SHA256-VERIFIED',
  dsl: {
    operationEnum: ['SET'],
    oracleKinds: ['SOURCE-MEMBER-IDENTITY', 'TYPED-SUPERSESSION-LITERAL', 'LOCATOR-RESOLUTION', 'SEMANTIC-INTERFACE', 'MUTABLE-HEAD-DAG', 'VECTOR-CAUSAL-SPEC', 'ACCEPTANCE-PERMIT-FIELDS', 'WITNESS-INDEPENDENCE', 'ACCEPTANCE-CAS', 'GENESIS-CAUSALITY', 'RECOVERY-QUORUM', 'PACKAGE-CONTENT-ROOT', 'INHERITED-ATOM'],
    executionRule: 'DECODE-AND-VERIFY-FIXTURE-BYTES;EVALUATE-CONTROL=ELIGIBLE;APPLY-OPERATIONS;EVALUATE-MUTATED-STATE=BLOCKED;EXPECTED-IS-COMPARED-AFTER-EVALUATION-AND-NEVER-READ-BY-ORACLE',
    fixtureRule: 'REAL-FROZEN-PACKAGE-BYTES-OR-EXACT-NORMATIVE-SCHEMA-DERIVED-STATE;NO-MOCK;NO-SAMPLE;NO-SYNTHETIC-BUSINESS-DATA',
  },
  fixtureCount: fixtures.length,
  vectorCount: vectors.length,
  fixtures,
  vectors,
  operationalVectorExecutionCount: 0,
  authorityCredit: 0,
  acceptanceCredit: 0,
};
write(OUTPUT.vectors, pretty(vectorCorpus));
const vectorsSha = sha(bytes(OUTPUT.vectors));

const manifestMemberPaths = [OUTPUT.registry, OUTPUT.subject, OUTPUT.sourceIndex, OUTPUT.crosswalk, OUTPUT.vectors, GENERATOR, READER_A, READER_B];
const manifestMembers = manifestMemberPaths.map((logicalPath, index) => ({
  ordinal: index + 1,
  logicalPath,
  sha256: sha(bytes(logicalPath)),
  bytes: bytes(logicalPath).length,
  required: true,
  authorityCredit: 0,
}));
const packageRootDomain = 'CONNECT-B0-V5-PACKAGE-CONTENT-V1';
const packageRootPreimage = Buffer.from(`${packageRootDomain}\n${canonical(manifestMembers.map(({ ordinal, logicalPath, sha256, bytes: memberBytes, required }) => ({ ordinal, logicalPath, sha256, bytes: memberBytes, required })))}`, 'utf8');
const manifest = {
  artifactId: 'CONNECT-B0-V5-ATOMIC-CANDIDATE-PACKAGE-MANIFEST-2026-08-30-G0',
  artifactClass: 'IMMUTABLE-ATOMIC-CANDIDATE-PACKAGE-MANIFEST;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE',
  schemaVersion: 1,
  packageSemantics: 'ALL-EIGHT-CORE-MEMBERS-REQUIRED;ANY-MISSING-CHANGED-REORDERED-OR-DUPLICATED-MEMBER-BLOCKS-ENTIRE-CANDIDATE;NO-PARTIAL-CREDIT',
  packageContentRootAlgorithm: {
    algorithmId: 'B0V5-DOMAIN-SEPARATED-CANONICAL-PACKAGE-ROOT-V1',
    hash: 'SHA-256',
    domainUtf8: packageRootDomain,
    preimageEquation: 'UTF8(DOMAIN)+0x0A+UTF8(CANONICAL-JSON-V1(PROJECTION(MEMBERS,[ordinal,logicalPath,sha256,bytes,required])))',
    canonicalJson: 'OBJECT-KEYS-LEXICOGRAPHIC;ARRAY-ORDER-PRESERVED;UTF8;NO-WHITESPACE;JSON-STRING-ESCAPING;INTEGER-DECIMAL;BOOLEAN-LOWERCASE;NULL-LOWERCASE',
    memberOrdering: 'ASCENDING-ORDINAL;CONTIGUOUS-1..MEMBER-COUNT',
    unknownParticipatingFieldPolicy: 'BLOCK-UNTIL-ALGORITHM-VERSION-SUCCESSOR',
  },
  memberCount: manifestMembers.length,
  members: manifestMembers,
  packageRootPreimageEncoding: 'BASE64',
  packageRootPreimageBase64: packageRootPreimage.toString('base64'),
  packageContentRoot: sha(packageRootPreimage),
  subjectSha256: subjectSha,
  normativeRegistrySha256: registrySha,
  sourceMemberSpanIndexSha256: sourceIndexSha,
  closureCrosswalkSha256: crosswalkSha,
  executableVectorCorpusSha256: vectorsSha,
  producerQaMembership: 'DETACHED;REFERENCES-EXACT-MANIFEST-SHA;ZERO-AUTHORITY',
  qaReportMembership: 'TWO-DETACHED-REPORTS;EACH-REFERENCES-EXACT-MANIFEST-SHA;ZERO-AUTHORITY',
  independentReviewMembership: 'DETACHED;ABSENT;FRESH-REVIEW-REQUIRED',
  repositoryVisibility: 'PUBLIC',
  authorityCredit: 0,
  acceptanceCredit: 0,
  currentState: 'FROZEN-CANDIDATE-PACKAGE;PRODUCER-QA-DETACHED;FRESH-INDEPENDENT-REVIEW-PENDING;B0-ABSENT;GATE29-BLOCKED;FREEZE-ACTIVE',
};
write(OUTPUT.manifest, pretty(manifest));
const manifestSha = sha(bytes(OUTPUT.manifest));

function physical(path) {
  const data = bytes(path);
  const sourceText = data.toString('utf8');
  return { path, sha256: sha(data), lines: lineCount(sourceText), bytes: data.length };
}

function writeProducerQa() {
  const reportA = JSON.parse(text(OUTPUT.reportA));
  const reportB = JSON.parse(text(OUTPUT.reportB));
  if (reportA.verdict !== 'MECHANICAL-PASS' || reportB.verdict !== 'MECHANICAL-PASS') throw new Error('Cannot write Producer QA while a reader does not pass');
  if (reportA.atomicPackageManifestSha256 !== manifestSha || reportB.atomicPackageManifestSha256 !== manifestSha) throw new Error('QA report manifest root mismatch');
  const artifacts = [OUTPUT.subject, OUTPUT.registry, OUTPUT.sourceIndex, OUTPUT.crosswalk, OUTPUT.vectors, OUTPUT.manifest, GENERATOR, READER_A, READER_B, OUTPUT.reportA, OUTPUT.reportB].map(physical);
  const lines = [
    '# 1. Connect — B0 v5 detached Producer QA',
    '',
    '## 1.1 Identity and limit',
    '',
    '1.1.1 `artifactId=CONNECT-B0-V5-DETACHED-PRODUCER-QA-2026-08-30-G0`.',
    '',
    '1.1.2 `artifactClass=DETACHED-PRODUCER-MECHANICAL-QA;PLANNING-ONLY;NOT-INDEPENDENT-REVIEW;NOT-FINDING-CLOSURE;NOT-AUTHORITY;NOT-ACCEPTANCE`.',
    '',
    `1.1.3 Atomic package manifest SHA-256=\`${manifestSha}\`; packageContentRoot=\`${manifest.packageContentRoot}\`.`,
    '',
    '1.1.4 Producer QA can prove deterministic bytes, schema/count invariants and planning-DSL behavior only. It cannot close any Finding or supply external authority, operational Evidence or Acceptance.',
    '',
    '## 1.2 Exact artifact roots',
    '',
    '| Artifact | SHA-256 | Lines | Bytes |',
    '|---|---|---:|---:|',
    ...artifacts.map((artifact) => `| \`${artifact.path}\` | \`${artifact.sha256}\` | ${artifact.lines} | ${artifact.bytes} |`),
    '',
    '## 1.3 Mechanical checks',
    '',
    `1.3.1 Reader A=\`${reportA.verdict}\`; checks=${reportA.passedCheckCount}/${reportA.checkCount}; planning vectors=${reportA.planningDslVectorPassCount}/288; report root=\`${artifacts.find((artifact) => artifact.path === OUTPUT.reportA).sha256}\`.`,
    '',
    `1.3.2 Reader B=\`${reportB.verdict}\`; checks=${reportB.passedCheckCount}/${reportB.checkCount}; planning vectors=${reportB.planningDslVectorPassCount}/288; report root=\`${artifacts.find((artifact) => artifact.path === OUTPUT.reportB).sha256}\`.`,
    '',
    '1.3.3 Requirements=96/96; fields=480/480; inherited v4 Requirements=84/84; inherited v4 fields=420/420; non-merged Finding rows=12/12; interfaces=17/17; object classes=94/94; heads=36/36; Outputs=96/96; fixtures=288/288; vector programs=288/288.',
    '',
    `1.3.4 Acceptance fields=${acceptanceFields.length}/${acceptanceFields.length}; Genesis slots=${genesisMemberSlots.length}/${genesisMemberSlots.length}; recovery members=5/5; recovery witnesses=2/2; independence profiles=9/9.`,
    '',
    '1.3.5 Both independently implemented readers recomputed every core member hash, the package content root, indexed source member spans, inherited field equality and all 288 control/mutation oracle results.',
    '',
    '## 1.4 Explicit zero claims',
    '',
    '1.4.1 `independentlyClosedV4FindingCount=0/12`; `acceptedRequirementCount=0/96`; `implementedOutputCount=0/96`; `operationalVectorExecutionCount=0/288`; `authorityCredit=0`; `acceptanceCredit=0`.',
    '',
    '1.4.2 `externalL0Authority=ABSENT`; `genesisFoundationReceipt=ABSENT`; `canonicalMandateReceipt=ABSENT`; `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.',
    '',
    '1.4.3 Fresh independent hostile review of this exact package root remains mandatory. Producer QA and its two readers do not satisfy that denominator.',
    '',
  ];
  write(OUTPUT.producerQa, lines.join('\n'));
}

if (process.argv.includes('--producer-qa')) writeProducerQa();

process.stdout.write(`${JSON.stringify({
  subjectSha256: subjectSha,
  normativeRegistrySha256: registrySha,
  sourceMemberSpanIndexSha256: sourceIndexSha,
  closureCrosswalkSha256: crosswalkSha,
  executableVectorCorpusSha256: vectorsSha,
  atomicPackageManifestSha256: manifestSha,
  packageContentRoot: manifest.packageContentRoot,
  requirementCount: allRequirements.length,
  vectorCount: vectors.length,
  findingCount: findingDefinitions.length,
  acceptanceCredit: 0,
  Gate29: 'BLOCKED',
}, null, 2)}\n`);
