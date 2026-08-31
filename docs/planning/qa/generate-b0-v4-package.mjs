#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE = 'web/docs/planning';
const OUTPUT = {
  registry: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-normative-registry-2026-08-29.json`,
  subject: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-2026-08-29.md`,
  sourceIndex: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-source-member-span-index-2026-08-29.json`,
  crosswalk: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-closure-crosswalk-2026-08-29.json`,
  vectors: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-executable-vector-programs-2026-08-29.json`,
  manifest: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-atomic-package-manifest-2026-08-29.json`,
};
const ENGINE_A = `${BASE}/qa/b0-v4-qa-engine-a.mjs`;
const ENGINE_B = `${BASE}/qa/b0-v4-qa-engine-b.py`;
const GENERATOR = `${BASE}/qa/generate-b0-v4-package.mjs`;

const SOURCES = [
  ['B0V3', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v3-2026-08-29.md`, '872ffc806ac35614a9cba33cc9cbe5bc1a0f0cf7675d578183a60ca55d9611e9', 'Exact 70 v3 five-field Requirements, Outputs, registries and candidate constraints', 'PREDECESSOR-CANDIDATE;ZERO-AUTHORITY'],
  ['B0V3QA', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v3-producer-qa-2026-08-29.md`, '75a0b7d01c0f0a35f92956549b7aeb5ba40f0bea8eeea04652a9acb175443628', 'Detached v3 Producer QA claims and denominators', 'PRODUCER-OBSERVATION;ZERO-AUTHORITY'],
  ['B0V3R', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v3-independent-hostile-review-2026-08-29.md`, '987b6d92c750dc8c94c9c113e45a3b41c723a2b1d5d8abbe5afd2f3a2d7c36f7', 'Detached independent hostile-review method, evidence and verdict', 'INDEPENDENT-REVIEW;ZERO-AUTHORITY'],
  ['B0V3RM', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v3-independent-hostile-review-findings-manifest-2026-08-29.md`, 'b62f0a0202e4b2b0eb4e58eebebe5bfc923ba7bcd32f19a83b3035b97490717f', 'Exactly 13 individually indexed v3 independent-Finding records', 'INDEPENDENT-FINDINGS;ZERO-AUTHORITY'],
  ['B0V2', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v2-2026-08-29.md`, '7030c7b8ce0e3c7e3c74a89fee222af87aa51e3e448cfb91988c068d66efe8a4', 'Exact 49 v2 five-field Requirements and registries', 'PREDECESSOR-CANDIDATE;ZERO-AUTHORITY'],
  ['B0V2R', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v2-independent-hostile-review-2026-08-29.md`, 'c75b8829a716f92ae8aa430b97637165a65408fcd064a5af5f139f55cdd0585f', 'Detached v2 independent hostile review', 'INDEPENDENT-REVIEW;ZERO-AUTHORITY'],
  ['B0V2RM', `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v2-independent-hostile-review-findings-manifest-2026-08-29.md`, '3b1730573462d2adbecf01a8062d27ca0cb8ac3620101d6eaa2288559d6681df', 'Exactly 21 individually indexed v2 independent-Finding records', 'INDEPENDENT-FINDINGS;ZERO-AUTHORITY'],
  ['B0V1', `${BASE}/bootstrap-authority-envelope-b0-requirements-candidate-2026-08-29.md`, '678503eb90573d6017ed18218ab97df81550b84d02235c482fd6c2aa1f87bddb', 'Exactly 27 individually indexed original Requirement records', 'PREDECESSOR-CANDIDATE;ZERO-AUTHORITY'],
  ['B0HRM', `${BASE}/bootstrap-authority-envelope-b0-requirements-independent-hostile-review-findings-manifest-2026-08-29.md`, '0ca1b2b4ba4c6bdc8d10748a0a8924c4e397323309dc75f5cf41ba35aecad355', 'Exactly 22 individually indexed legacy independent-Finding records', 'INDEPENDENT-FINDINGS;ZERO-AUTHORITY'],
  ['UDL', `${BASE}/user-directive-and-source-precedence-ledger-2026-08-29.md`, 'b012a479b18e162f5f759b49e033eb3856a4637cc0e91a8a36f1d06043813342', 'Directive navigation, amendment and precedence evidence', 'DIRECTIVE-LEDGER;NO-B0-AUTHORITY'],
  ['MCSV2', `${BASE}/master-plan-successor-control-sequence-v2-2026-08-29.md`, '403a9f77d85c67ebc4498c12a0c74912f8c015cfbccd665f3043a99c9d98310e', 'Control-sequence planning bounds, B0 block and non-retroactivity', 'CONTROL-CANDIDATE;ZERO-AUTHORITY'],
  ['PUBCYBERV2', `${BASE}/public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md`, '322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a', 'Public repository and cyber hardening successor predicates', 'SECURITY-CANDIDATE;ZERO-AUTHORITY'],
  ['D18A2', `${BASE}/d18-a2-public-repository-security-decision-2026-08-29.md`, '448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9', 'Binding Public repository work constraint and safeguards', 'PUBLIC-WORK-CONSTRAINT;NO-B0-AUTHORITY'],
  ['TRPV15', `${BASE}/three-review-protocol-v1-5-successor-requirements-2026-08-29.md`, '73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c', 'Later three-review protocol candidate observed after v2 cut', 'NON-RETROACTIVE-OBSERVATION;ZERO-AUTHORITY'],
].map(([alias, logicalPath, expectedSha256, claimLimit, authorityClass]) => ({ alias, logicalPath, expectedSha256, claimLimit, authorityClass }));

const sha = (value) => createHash('sha256').update(value).digest('hex');
const bytes = (logicalPath) => readFileSync(resolve(logicalPath));
const text = (logicalPath) => bytes(logicalPath).toString('utf8');
const pad = (value) => String(value).padStart(3, '0');

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const canonicalSha = (value) => sha(Buffer.from(canonical(value), 'utf8'));
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const write = (logicalPath, value) => {
  mkdirSync(dirname(resolve(logicalPath)), { recursive: true });
  writeFileSync(resolve(logicalPath), value, 'utf8');
};

for (const source of SOURCES) {
  const observed = sha(bytes(source.logicalPath));
  if (observed !== source.expectedSha256) throw new Error(`Frozen source changed: ${source.alias} ${observed}`);
}

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
      if (!found) throw new Error(`Missing ${field} in ${match[1]}`);
      fields[field] = found[1];
    }
    return { id: `${prefix}-${match[1]}`, title: match[2], fields, block };
  });
}

function parseHeadingMembers(sourceText) {
  const members = [];
  const headingPattern = /^#{1,3} .+`(?<id>(?:B0V3REQ-\d{3}|B0V2REQ-\d{3}|B0REQ-\d{3}|B0V3-HR-F\d{3}|B0V2-HR-F\d{3}|B0-HR-F\d{3}))`.*$/gm;
  const headings = [...sourceText.matchAll(headingPattern)];
  for (let index = 0; index < headings.length; index += 1) {
    const startChar = headings[index].index;
    const nextHeading = sourceText.slice(startChar + 1).search(/^#{1,2} /m);
    const endChar = nextHeading < 0 ? sourceText.length : startChar + 1 + nextHeading;
    members.push({ locator: headings[index].groups.id, startChar, endChar });
  }
  const linePattern = /^(?<clause>\d+(?:\.\d+)+) .+$/gm;
  for (const match of sourceText.matchAll(linePattern)) {
    const startChar = match.index;
    const newline = sourceText.indexOf('\n', startChar);
    const endChar = newline < 0 ? sourceText.length : newline + 1;
    members.push({ locator: `§${match.groups.clause}`, startChar, endChar });
  }
  const unique = new Map();
  for (const member of members) if (!unique.has(member.locator)) unique.set(member.locator, member);
  return [...unique.values()].sort((left, right) => left.startChar - right.startChar || left.locator.localeCompare(right.locator));
}

function parseJsonMembers(sourceText) {
  const members = [];
  const topLevel = [...sourceText.matchAll(/^  "(?<key>[^"]+)":/gm)];
  for (let index = 0; index < topLevel.length; index += 1) {
    const startChar = topLevel[index].index;
    const endChar = index + 1 < topLevel.length ? topLevel[index + 1].index : sourceText.lastIndexOf('\n}') + 1;
    members.push({ locator: `/${topLevel[index].groups.key}`, startChar, endChar });
  }
  const idPattern = /^\s+"(?:supersessionId|cycleBreakId|fieldId|outputId|headId|directiveId|profileId|policyId)": "(?<id>[^"]+)".*$/gm;
  for (const match of sourceText.matchAll(idPattern)) {
    const startChar = match.index;
    const newline = sourceText.indexOf('\n', startChar);
    members.push({ locator: match.groups.id, startChar, endChar: newline < 0 ? sourceText.length : newline + 1 });
  }
  const unique = new Map();
  for (const member of members) if (!unique.has(member.locator)) unique.set(member.locator, member);
  return [...unique.values()].sort((left, right) => left.startChar - right.startChar || left.locator.localeCompare(right.locator));
}

function lineAt(sourceText, charIndex) {
  return sourceText.slice(0, charIndex).split('\n').length;
}

function indexArtifact(alias, logicalPath, claimLimit, authorityClass) {
  const sourceBytes = bytes(logicalPath);
  const sourceText = sourceBytes.toString('utf8');
  return {
    alias,
    logicalPath,
    sha256: sha(sourceBytes),
    bytes: sourceBytes.length,
    lines: (sourceText.match(/\n/g) || []).length,
    claimLimit,
    authorityClass,
    authorityCredit: 0,
    importIdentity: 'REPOSITORY-ROOT-RELATIVE-PATH+SHA256+BYTE-SPAN',
    machineLocalResolution: 'PRIVATE-NON-AUTHORITATIVE-OBSERVATION;NOT-IN-PUBLIC-PACKAGE',
    members: (logicalPath.endsWith('.json') ? parseJsonMembers(sourceText) : parseHeadingMembers(sourceText)).map((member) => {
      const startByteInclusive = Buffer.byteLength(sourceText.slice(0, member.startChar), 'utf8');
      const endByteExclusive = Buffer.byteLength(sourceText.slice(0, member.endChar), 'utf8');
      return {
        locator: member.locator,
        startLine: lineAt(sourceText, member.startChar),
        endLineInclusive: lineAt(sourceText, Math.max(member.startChar, member.endChar - 1)),
        startByteInclusive,
        endByteExclusive,
        sha256: sha(sourceBytes.subarray(startByteInclusive, endByteExclusive)),
      };
    }),
  };
}

const v3Text = text(SOURCES.find((source) => source.alias === 'B0V3').logicalPath);
const v2Text = text(SOURCES.find((source) => source.alias === 'B0V2').logicalPath);
const v1Text = text(SOURCES.find((source) => source.alias === 'B0V1').logicalPath);
const v3Requirements = parseFiveFieldRequirements(v3Text, 'B0V3REQ');
const v2Requirements = parseFiveFieldRequirements(v2Text, 'B0V2REQ');
const v1Requirements = parseFiveFieldRequirements(v1Text, 'B0REQ');
if (v3Requirements.length !== 70 || v2Requirements.length !== 49 || v1Requirements.length !== 27) throw new Error('Unexpected predecessor Requirement denominator');

const v3OutputClasses = new Map([...v3Text.matchAll(/^\| `(?<id>B0V3OUT-\d{3})` \| `B0V3REQ-\d{3}` \| `(?<artifactClass>[^`]+)` \|/gm)].map((match) => [match.groups.id, match.groups.artifactClass]));
if (v3OutputClasses.size !== 70) throw new Error(`Expected 70 v3 Output classes, got ${v3OutputClasses.size}`);

const v2VectorScenarios = new Map([...v2Text.matchAll(/^\| `B0V2-NVS-(?<id>\d{3})` \| `B0V2REQ-\d{3}` \| (?<scenarios>[^|]+) \| (?<terminal>[^|]+) \|$/gm)].map((match) => [Number(match.groups.id), { scenarios: match.groups.scenarios.trim().split(';').map((item) => item.trim()), terminal: match.groups.terminal.replaceAll('`', '').trim() }]));
if (v2VectorScenarios.size !== 49) throw new Error(`Expected 49 v2 vector sets, got ${v2VectorScenarios.size}`);

const v3NewVectorScenarios = new Map();
for (const match of v3Text.matchAll(/^\| `B0V3REQ-(?<id>0(?:49|5\d|6\d))` \| `B0V3-V-\d{3}-A\/B\/C` \| (?<a>[^|]+) \| (?<b>[^|]+) \| (?<c>[^|]+) \| `(?<terminal>[^`]+)` \|$/gm)) {
  v3NewVectorScenarios.set(Number(match.groups.id), { scenarios: [match.groups.a.trim(), match.groups.b.trim(), match.groups.c.trim()], terminal: match.groups.terminal });
}
if (v3NewVectorScenarios.size !== 21) throw new Error(`Expected 21 v3 vector sets, got ${v3NewVectorScenarios.size}`);

const supersession = (id, sourceAlias, sourceId, field, oldAtom, replacementAtom, preservedSafetyIntent, proof) => ({
  supersessionId: id,
  sourceReference: `${sourceAlias}@${SOURCES.find((source) => source.alias === sourceAlias).expectedSha256}::${sourceId}.${field}`,
  sourceId,
  field,
  oldAtom,
  disposition: 'TYPED-SUPERSESSION;OLD-REPRESENTATION-NON-NORMATIVE;SAFETY-INTENT-PRESERVED',
  replacementAtom,
  preservedSafetyIntent,
  nonWeakeningProof: proof,
  closureTransfer: false,
  authorityCredit: 0,
});

const v2 = (number) => v2Requirements[number].fields;
const v3 = (number) => v3Requirements[number].fields;
const typedSupersessions = [
  supersession('B0V4-SUP-LIFE-001', 'B0V2', 'B0V2REQ-022', 'requiredProof', 'response loss may yield COMMITTED-UNCONFIRMED as an immutable terminal', 'Response loss appends RESPONSE-LOST and moves the Attempt to non-final UNCERTAIN; exactly one immutable FinalizationRecord is created only after authoritative reconciliation.', 'Response loss never proves absence; the Attempt cannot retry or grant authority while uncertain.', 'The replacement preserves one-use, no-retry and zero-authority while removing only the contradiction between terminal immutability and later reconciliation.'),
  supersession('B0V4-SUP-LIFE-002', 'B0V2', 'B0V2REQ-040', 'statement', 'COMMITTED-UNCONFIRMED is one of the exact terminals', 'COMMITTED-UNCONFIRMED becomes OutcomeObservation=RESPONSE-LOST plus AttemptState=UNCERTAIN; it is not FinalResult.', 'Unknown commit state grants zero usable authority and freezes dependent Acts.', 'FinalResult remains immutable; uncertainty is strictly safer because it cannot become authority until a fenced readback resolves it.'),
  supersession('B0V4-SUP-LIFE-003', 'B0V2', 'B0V2REQ-040', 'requiredProof', 'every response-loss case yields one terminal before reconciliation', 'Every response-loss case yields one non-final uncertainty observation and later exactly one immutable final result.', 'No false absence, replay or concurrent retry is permitted.', 'The replacement adds a monotonic observation layer and retains exactly-one-finalization.'),
  supersession('B0V4-SUP-LIFE-004', 'B0V2', 'B0V2REQ-044', 'requiredProof', 'terminal mutation forbidden applies to labels that included uncertainty/quarantine', 'Terminal mutation remains forbidden for FinalResult; UNCERTAIN and QUARANTINED are AttemptState values and may transition only through explicit ordered reconciliation guards.', 'No final authority result can be overwritten or duplicated.', 'State movement is append-only and ends in exactly one immutable FinalizationRecord.'),
  supersession('B0V4-SUP-PATH-001', 'B0V2', 'B0V2REQ-027', 'statement', 'authoritative SourceReferenceIndex entry includes an absolute path', 'Authoritative identity is repository-root-relative logicalPath + full SHA-256 + byte span; an absolute resolver mapping may exist only in private non-authoritative local observation and is never a Public package member.', 'The exact bytes, locator and physical identity remain independently resolvable.', 'Two clean workspaces must resolve the same root while machine-local identity disclosure becomes impossible in the Public package.'),
  supersession('B0V4-SUP-GEN-001', 'B0V2', 'B0V2REQ-025', 'requiredProof', 'G1/G2 cannot issue Permits', 'G1/G2 cannot issue GenesisPermit or OperationalPermit; each may instantiate and consume only ConformancePermit with usableAuthority=0 and capabilityBits=0 through the byte-identical permit reducer.', 'G1/G2 never become Current, bootstrap a Definition or reach an external target.', 'The separate type exercises the exact logic without creating operational authority.'),
  supersession('B0V4-SUP-GEN-002', 'B0V2', 'B0V2REQ-043', 'requiredProof', 'only a later accepted operational Instance can issue Permit', 'Only a later independently accepted operational Instance can issue OperationalPermit; ConformancePermit is a zero-authority test input, not an issued authority object.', 'Operational Permit issuance remains impossible before accepted B0.', 'The type distinction prevents recursive authority and preserves operational parity.'),
  supersession('B0V4-SUP-GEN-003', 'B0V2', '§6.2.2', 'clause', 'G1/G2 conformance objects cannot issue Permits', 'G1/G2 cannot issue authority-bearing Permits; they may instantiate a sealed ConformancePermit whose authority and capability bits are structurally zero.', 'No conformance generation grants authority or effects.', 'The conformance object is not a Permit authority edge and cannot be promoted or converted.'),
  supersession('B0V4-SUP-ROLE-001', 'B0V3', 'B0V3REQ-062', 'statement', 'closed role universe omits Approver and contains seven roles', 'Closed work-role universe is AuthorityOwner, Producer, QA, Reviewer1, Reviewer2, Reconciler, Approver, AcceptanceWriter.', 'Every approval remains authenticated, scoped, current and controller-separated.', 'Adding Approver restores the imported role and increases the prohibited-pair denominator from 21 to 28.'),
  supersession('B0V4-SUP-ROLE-002', 'B0V3', 'B0V3REQ-062', 'requiredProof', 'complete seven-role matrix has 21 prohibited pairs', 'Complete eight-role matrix has all 28 unordered pairs explicitly prohibited from sharing an EffectiveController.', 'No Producer, QA, reviewer, reconciler, approver, writer or authority owner can manufacture an independent act.', 'The stronger denominator preserves all former 21 prohibitions and adds the seven missing Approver pairs.'),
];

const hiddenPairs = ['001:049', '009:062', '021:057', '025:064', '026:055', '026:056', '029:049', '029:063', '030:050', '033:052', '036:063', '037:060', '039:057', '044:055', '044:056', '047:052', '047:066'];
const cycleBreaks = hiddenPairs.map((pair, index) => {
  const [source, target] = pair.split(':');
  return {
    cycleBreakId: `B0V4-CB-${pad(index + 1)}`,
    legacyNamedUse: `B0V3REQ-${source}->B0V3REQ-${target}`,
    legacyReverseBuildDependency: `B0V3REQ-${target}->B0V3REQ-${source}`,
    disposition: 'SPLIT-THROUGH-PRIOR-IMMUTABLE-INTERFACE',
    replacementPriorInterface: `B0V4-IFACE-${pad(index + 1)}`,
    interfaceSchema: {
      interfaceId: `B0V4-IFACE-${pad(index + 1)}`,
      schemaVersion: 1,
      immutable: true,
      authorityCredit: 0,
      fields: ['interfaceId', 'schemaVersion', 'consumerClass', 'providerClass', 'inputRoot', 'outputRoot', 'validationPredicate'],
    },
    consumerRequirement: `B0V4REQ-${pad(Number(source) + 14)}`,
    providerRequirement: `B0V4REQ-${pad(Number(target) + 14)}`,
    buildRule: 'CONSUMER-DEPENDS-ONLY-ON-PRIOR-INTERFACE;PROVIDER-LATER-IMPLEMENTS-INTERFACE;NO-FORWARD-REQUIREMENT-DEPENDENCY',
    closureTransfer: false,
  };
});

const roles = ['AuthorityOwner', 'Producer', 'QA', 'Reviewer1', 'Reviewer2', 'Reconciler', 'Approver', 'AcceptanceWriter'];
const pairMatrix = [];
for (let left = 0; left < roles.length; left += 1) {
  for (let right = left + 1; right < roles.length; right += 1) {
    pairMatrix.push({
      pairId: `B0V4-ROLE-PAIR-${String(pairMatrix.length + 1).padStart(2, '0')}`,
      leftRole: roles[left],
      rightRole: roles[right],
      disposition: 'PROHIBITED-SHARED-EFFECTIVE-CONTROLLER',
      appliesTo: ['PRIMARY', 'BACKUP', 'QUORUM', 'EMERGENCY', 'SESSION', 'CREDENTIAL-CONTROLLER', 'DELEGATED-CONTROLLER'],
      exceptionAllowed: false,
    });
  }
}

const legacyHeads = ['L0Anchor', 'TrustProfile', 'AlgorithmRegistry', 'KeyStatus', 'TrustedTimeDecision', 'CanonicalMandate', 'DirectivePrecedence', 'SubjectClass', 'ActClass', 'EffectClassifier', 'TransactionStrategy', 'Appointment', 'RoleConflict', 'ReviewProtocol', 'SourceSupersession', 'RequirementSet', 'OutputRegistry', 'VectorRegistry', 'SemanticGraph', 'StateMachine', 'EvidenceCheckpoint', 'Revocation', 'GenesisLedger', 'PermitLedger', 'AcceptancePointer', 'StoreIdentity'];
const successorHeads = ['RecoveryQuorumPolicy', 'PublicDisclosurePolicy', 'IndependenceProfiles', 'WitnessPolicy', 'JournalPolicy', 'CapabilitySinkParity', 'ExceptionRegistry', 'GenesisFoundation', 'AcceptanceSchema', 'ConvergencePolicy'];
const headNames = [...legacyHeads, ...successorHeads];
const heads = headNames.map((name, index) => ({
  headId: `B0V4-HEAD-${String(index + 1).padStart(2, '0')}`,
  name,
  versionType: 'MONOTONIC-U64',
  rootType: 'SHA256-OF-CANONICAL-IMMUTABLE-MEMBER-SET',
  unknownMemberPolicy: 'BLOCK',
  advancementRule: 'ONE-LINEARIZABLE-AUTHORITY-STORE-TRANSACTION',
}));
const headByName = new Map(heads.map((head) => [head.name, head.headId]));
const objectMappings = {
  L0Anchor: ['L0TrustAnchorAdmission', 'L0ChannelBinding', 'L0CeremonyTranscriptIndex'],
  TrustProfile: ['AuthorityTrustProfile', 'TalIdentityBinding', 'VerifierProfile'],
  AlgorithmRegistry: ['AlgorithmRegistry', 'SerializationAlgorithmProfile', 'SignatureProfile'],
  KeyStatus: ['KeyStatusRegistry', 'KeyTransitionReceiptIndex', 'CompromiseCut'],
  TrustedTimeDecision: ['TrustedTimeDecision', 'TimeSourceProfile', 'ValidityDurationRegistry'],
  CanonicalMandate: ['CanonicalMandate', 'CanonicalMandateReceipt'],
  DirectivePrecedence: ['ApplicableDirectiveRegistry', 'DirectivePrecedenceSnapshot'],
  SubjectClass: ['SubjectClassRegistry'],
  ActClass: ['ActClassRegistry'],
  EffectClassifier: ['EffectClassifier', 'EffectScopeRegistry'],
  TransactionStrategy: ['EffectAtomicityStrategyRegistry', 'AcceptanceTransactionTopology'],
  Appointment: ['AppointmentRegistry', 'DelegationRegistry', 'BackupActivationRegistry'],
  RoleConflict: ['RoleUniverse', 'EffectiveControllerConflictMatrix', 'ControllerEquivalencePolicy'],
  ReviewProtocol: ['BootstrapReviewProtocol', 'ReviewAuthorityProfile', 'VetoPolicy'],
  SourceSupersession: ['SourceReferenceIndex', 'TypedSupersessionRegistry', 'ImportLifecycleRegistry'],
  RequirementSet: ['RequirementSet', 'RequirementClosureManifest', 'FindingClosureCrosswalk'],
  OutputRegistry: ['OutputRegistry', 'OutputCustodyProjectionRegistry', 'OutputImplementationIndex'],
  VectorRegistry: ['VectorProgramRegistry', 'VectorFixtureRegistry', 'VectorResultRegistry'],
  SemanticGraph: ['TypedSemanticGraph', 'NamedUseGraph', 'AuthorityGraph'],
  StateMachine: ['AttemptStateMachine', 'TransitionGuardRegistry', 'ReasonCodeRegistry', 'CurrentAuthorityReducer', 'FinalizationDefinition'],
  EvidenceCheckpoint: ['EvidenceLedgerHead', 'EvidenceCheckpointRegistry'],
  Revocation: ['RevocationRegistry', 'SupersessionRegistry', 'InvalidationRegistry'],
  GenesisLedger: ['GenesisLedgerHead', 'GenesisAttemptRegistry'],
  PermitLedger: ['PermitLedgerHead', 'PermitAttemptRegistry'],
  AcceptancePointer: ['AcceptancePointer', 'AcceptanceFinalizationRegistry'],
  StoreIdentity: ['AuthorityStoreIdentity', 'StoreCapabilityReceipt', 'FencingCapabilityProfile'],
  RecoveryQuorumPolicy: ['RecoveryQuorumProfile', 'RecoveryAttemptLedger', 'RecoveryRotationRegistry'],
  PublicDisclosurePolicy: ['PublicDisclosurePolicy', 'PublicSurfaceInventory', 'EgressDecisionRegistry'],
  IndependenceProfiles: ['ValidatorIndependenceProfile', 'ReviewerIndependenceProfile', 'ReadbackIndependenceProfile'],
  WitnessPolicy: ['WitnessRegistry', 'WitnessPolicy', 'WitnessCheckpointIndex'],
  JournalPolicy: ['JournalCatchupPolicy', 'JournalCredentialProfile', 'JournalCheckpointRegistry'],
  CapabilitySinkParity: ['CapabilitySinkParityConfig', 'ConformanceGenerationRegistry', 'OperationalParityRegistry'],
  ExceptionRegistry: ['ExceptionRegistry', 'P2P3DispositionRegistry'],
  GenesisFoundation: ['GenesisFoundationPackage', 'GenesisFoundationCeremonyProfile'],
  AcceptanceSchema: ['AcceptanceFieldRegistry', 'AcceptanceEnvelopeSchema'],
  ConvergencePolicy: ['SuccessorConvergencePolicy', 'ReviewEpochRegistry'],
};
const objectToHead = [];
for (const head of heads) {
  const classes = objectMappings[head.name];
  if (!classes) throw new Error(`Missing object-class mapping for ${head.name}`);
  for (const objectClass of classes) {
    objectToHead.push({
      objectClass,
      headId: head.headId,
      membershipPath: [`${objectClass}->${head.name}`, `${head.name}->SecurityUniverseHead`],
      mutable: true,
      invalidationRule: `ADVANCE-${head.headId}-AND-SECURITY-UNIVERSE-REVISION`,
    });
  }
}

const baseAcceptanceFields = [
  ['envelopeId', 'DETERMINISTIC-ID', 'PUBLIC', 'AcceptanceSchema', 'AcceptanceWriter'],
  ['schemaVersion', 'U32-EQUAL-1', 'PUBLIC', 'AcceptanceSchema', 'AcceptanceWriter'],
  ['subjectRoot', 'SHA256', 'PUBLIC', 'RequirementSet', 'Producer'],
  ['b0DefinitionRoot', 'SHA256', 'PUBLIC', 'RequirementSet', 'Producer'],
  ['b0InstanceRoot', 'SHA256', 'RESTRICTED', 'AcceptancePointer', 'AcceptanceWriter'],
  ['l0AdmissionRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'L0Anchor', 'AuthorityOwner'],
  ['genesisFoundationRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'GenesisFoundation', 'AuthorityOwner'],
  ['canonicalMandateRoot', 'SHA256', 'PUBLIC', 'CanonicalMandate', 'AuthorityOwner'],
  ['canonicalMandateReceiptRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'CanonicalMandate', 'AuthorityOwner'],
  ['requirementSetRoot', 'SHA256', 'PUBLIC', 'RequirementSet', 'Producer'],
  ['requirementClosureManifestRoot', 'SHA256', 'PUBLIC', 'RequirementSet', 'QA'],
  ['all84OutputsRoot', 'SHA256', 'PUBLIC', 'OutputRegistry', 'Producer'],
  ['sourceMemberSpanIndexRoot', 'SHA256', 'PUBLIC', 'SourceSupersession', 'Producer'],
  ['typedSemanticGraphRoot', 'SHA256', 'PUBLIC', 'SemanticGraph', 'Producer'],
  ['namedUseGraphRoot', 'SHA256', 'PUBLIC', 'SemanticGraph', 'QA'],
  ['identityProfileRoot', 'SHA256', 'PUBLIC', 'AlgorithmRegistry', 'Producer'],
  ['serializationProfileRoot', 'SHA256', 'PUBLIC', 'AlgorithmRegistry', 'Producer'],
  ['algorithmRegistryRoot', 'SHA256', 'PUBLIC', 'AlgorithmRegistry', 'AuthorityOwner'],
  ['keyStatusRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'KeyStatus', 'AuthorityOwner'],
  ['trustedTimeDecisionRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'TrustedTimeDecision', 'AuthorityOwner'],
  ['authorityTrustProfileRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'TrustProfile', 'AuthorityOwner'],
  ['securityUniverseRoot', 'SHA256', 'INTERNAL', 'StoreIdentity', 'AcceptanceWriter'],
  ['securityRevision', 'MONOTONIC-U64', 'INTERNAL', 'StoreIdentity', 'AcceptanceWriter'],
  ['genesisPermitRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'GenesisLedger', 'AuthorityOwner'],
  ['operationalPermitRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'PermitLedger', 'AuthorityOwner'],
  ['effectAtomicityStrategyId', 'ENUM-SINGLE-LINEARIZABLE-DOMAIN', 'INTERNAL', 'TransactionStrategy', 'AcceptanceWriter'],
  ['acceptanceTransactionTopologyRoot', 'SHA256', 'INTERNAL', 'TransactionStrategy', 'AcceptanceWriter'],
  ['appointmentRegistryRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'Appointment', 'AuthorityOwner'],
  ['roleUniverseRoot', 'SHA256', 'PUBLIC', 'RoleConflict', 'AuthorityOwner'],
  ['controllerConflictMatrixRoot', 'SHA256', 'PUBLIC', 'RoleConflict', 'QA'],
  ['bootstrapReviewProtocolRoot', 'SHA256', 'PUBLIC', 'ReviewProtocol', 'AuthorityOwner'],
  ['sealedReviewPacketRoot', 'SHA256', 'INTERNAL', 'ReviewProtocol', 'Producer'],
  ['producerQaRoot', 'SHA256', 'PUBLIC', 'ReviewProtocol', 'QA'],
  ['reviewer1ReportRoot', 'SHA256', 'PUBLIC', 'ReviewProtocol', 'Reviewer1'],
  ['reviewer2ReportRoot', 'SHA256', 'PUBLIC', 'ReviewProtocol', 'Reviewer2'],
  ['comparisonRoot', 'SHA256', 'PUBLIC', 'ReviewProtocol', 'Reconciler'],
  ['reconciliationRoot', 'SHA256', 'PUBLIC', 'ReviewProtocol', 'Reconciler'],
  ['vetoRegistryRoot', 'SHA256', 'PUBLIC', 'ReviewProtocol', 'Reconciler'],
  ['authorityOwnerExactRootApprovalReceipt', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'CanonicalMandate', 'AuthorityOwner'],
  ['approverExactRootApprovalReceipt', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'Appointment', 'Approver'],
  ['vectorProgramRegistryRoot', 'SHA256', 'PUBLIC', 'VectorRegistry', 'Producer'],
  ['vectorExecutionResultRoot', 'SHA256', 'INTERNAL', 'VectorRegistry', 'QA'],
  ['vectorCoverageRoot', 'SHA256', 'PUBLIC', 'VectorRegistry', 'QA'],
  ['attemptStateMachineRoot', 'SHA256', 'PUBLIC', 'StateMachine', 'Producer'],
  ['transitionGuardRegistryRoot', 'SHA256', 'PUBLIC', 'StateMachine', 'Producer'],
  ['reasonCodeRegistryRoot', 'SHA256', 'PUBLIC', 'StateMachine', 'Producer'],
  ['currentAuthorityReducerRoot', 'SHA256', 'PUBLIC', 'StateMachine', 'QA'],
  ['finalizationDefinitionRoot', 'SHA256', 'PUBLIC', 'StateMachine', 'QA'],
  ['g1ReceiptRoot', 'SHA256', 'INTERNAL', 'CapabilitySinkParity', 'QA'],
  ['g2ReceiptRoot', 'SHA256', 'INTERNAL', 'CapabilitySinkParity', 'QA'],
  ['o1ReceiptRoot', 'SHA256', 'INTERNAL', 'CapabilitySinkParity', 'QA'],
  ['o2ReceiptRoot', 'SHA256', 'INTERNAL', 'CapabilitySinkParity', 'QA'],
  ['evidenceLedgerHead', 'SHA256', 'RESTRICTED', 'EvidenceCheckpoint', 'Witness1'],
  ['witnessCheckpointRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'WitnessPolicy', 'Witness1'],
  ['publicDisclosurePolicyRoot', 'SHA256', 'PUBLIC', 'PublicDisclosurePolicy', 'QA'],
  ['outputCustodyProjectionRoot', 'SHA256', 'PUBLIC', 'PublicDisclosurePolicy', 'QA'],
  ['acceptancePointerExpectedVersion', 'MONOTONIC-U64', 'INTERNAL', 'AcceptancePointer', 'AcceptanceWriter'],
  ['authorityStoreIdentityRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'StoreIdentity', 'AuthorityOwner'],
  ['acceptanceCommitReceiptRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'AcceptancePointer', 'AcceptanceWriter'],
  ['readbackAReceiptRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'JournalPolicy', 'QA'],
  ['readbackBReceiptRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'JournalPolicy', 'QA'],
  ['readbackIndependenceProofRoot', 'SHA256', 'INTERNAL', 'IndependenceProfiles', 'QA'],
  ['revocationHead', 'SHA256', 'RESTRICTED', 'Revocation', 'AuthorityOwner'],
  ['supersessionHead', 'SHA256', 'RESTRICTED', 'Revocation', 'AuthorityOwner'],
  ['invalidationClosureRoot', 'SHA256', 'INTERNAL', 'Revocation', 'QA'],
  ['finalizationRecordRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'AcceptancePointer', 'AcceptanceWriter'],
  ['currentReducerResultRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'StateMachine', 'QA'],
  ['applicableDirectiveRegistryRoot', 'SHA256', 'PUBLIC', 'DirectivePrecedence', 'QA'],
  ['recoveryQuorumProfileRoot', 'OPAQUE-PRIVATE-REFERENCE', 'RESTRICTED', 'RecoveryQuorumPolicy', 'AuthorityOwner'],
  ['convergenceDecisionRoot', 'SHA256', 'PUBLIC', 'ConvergencePolicy', 'Reconciler'],
  ['p2p3DispositionRegistryRoot', 'SHA256', 'PUBLIC', 'ExceptionRegistry', 'AuthorityOwner'],
];
const acceptanceFields = baseAcceptanceFields.map(([name, type, classification, sourceHeadName, producer], index) => ({
  fieldId: `B0V4-AF-${String(index + 1).padStart(3, '0')}`,
  name,
  type,
  cardinality: 'EXACTLY-ONE',
  classification,
  sourceHead: headByName.get(sourceHeadName),
  freshness: 'MUST-EQUAL-COMMIT-TIME-SECURITY-UNIVERSE-CUT',
  invalidation: `ANY-${headByName.get(sourceHeadName)}-ADVANCE-INVALIDATES`,
  producer,
  closurePredicate: 'PRESENT;TYPE-VALID;ROOT-RESOLVED;CURRENT;INDEPENDENTLY-VALIDATED',
}));
for (const head of heads) {
  acceptanceFields.push({
    fieldId: `B0V4-AF-${String(acceptanceFields.length + 1).padStart(3, '0')}`,
    name: `securityHead_${head.name}`,
    type: 'HEAD-ID+MONOTONIC-VERSION+SHA256',
    cardinality: 'EXACTLY-ONE',
    classification: 'INTERNAL',
    sourceHead: head.headId,
    freshness: 'EXACT-COMMIT-TIME-VERSION',
    invalidation: `ANY-${head.headId}-ADVANCE-INVALIDATES`,
    producer: 'AcceptanceWriter',
    closurePredicate: 'ID-EXACT;VERSION-EXACT;ROOT-EXACT;MEMBERSHIP-PROVED',
  });
}

const newOutputClasses = ['TYPED-ATOM-SUPERSESSION-REGISTRY', 'PORTABLE-SOURCE-IMPORT-LIFECYCLE', 'THREE-PERMIT-GENERATION-PARITY-PROTOCOL', 'COMPLETE-NAMED-USE-GRAPH', 'GENESIS-FOUNDATION-PACKAGE-SCHEMA', 'GENERATED-MUTABLE-HEAD-REGISTRY', 'EIGHT-ROLE-APPROVER-PRESERVATION-MATRIX', 'EXECUTABLE-VECTOR-PROGRAM-REGISTRY', 'FIELD-CLOSED-ACCEPTANCE-ENVELOPE', 'OUTPUT-CUSTODY-PUBLIC-PROJECTION-REGISTRY', 'EXACT-ACCEPTANCE-CAS-TOPOLOGY', 'L0-RECOVERY-QUORUM-PROFILE', 'APPLICABLE-DIRECTIVE-REGISTRY', 'BOUNDED-SUCCESSOR-CONVERGENCE-POLICY'];
const outputClasses = [...newOutputClasses, ...[...v3OutputClasses.values()]];
const sensitiveOutputPattern = /(AUTHORITY|TRUST|KEY|CRYPTO|PERMIT|APPOINTMENT|EVIDENCE|RECOVERY|STORE|RECEIPT|ACCEPTANCE|WITNESS|JOURNAL|TIME)/;
const outputRegistry = outputClasses.map((artifactClass, index) => ({
  outputId: `B0V4OUT-${pad(index)}`,
  requirementId: `B0V4REQ-${pad(index)}`,
  artifactClass,
  schemaVersion: 1,
  requiredMembers: ['artifactId', 'schemaVersion', 'subjectRoot', 'producerAppointmentRoot', 'dependencyRoots', 'state'],
  requiredMemberCardinality: 'EACH-EXACTLY-ONE',
  producerRole: index === 6 ? 'AuthorityOwner' : index === 13 ? 'Reconciler' : 'Producer',
  implementationRoot: null,
  evidenceRoots: [],
  acceptancePredicate: 'IMPLEMENTED;ROOT-RESOLVED;VECTOR-EVIDENCE-COMPLETE;INDEPENDENTLY-ACCEPTED',
  state: 'PLANNED;NOT-IMPLEMENTED;NOT-ACCEPTED',
  planningArtifactClassification: 'PUBLIC',
  runtimeInstanceClassification: sensitiveOutputPattern.test(artifactClass) ? 'RESTRICTED' : 'INTERNAL',
  planningCustody: 'PUBLIC-REPOSITORY-ROOT-RELATIVE-PATH',
  runtimeCustody: 'ABSENT;WHEN-CREATED=APPROVED-EXTERNAL-CUSTODY-ONLY',
  publicRepresentation: 'FULL-PLANNING-SCHEMA;NO-OPERATIONAL-INSTANCE;NO-PRIVATE-DIGEST;NO-EQUALITY-OR-MEMBERSHIP-ORACLE',
  publicationSurface: 'PUBLIC-REPOSITORY-PLANNING-PACKAGE',
  egressPolicyHead: headByName.get('PublicDisclosurePolicy'),
  redactionSuccessorRule: 'NO-IN-PLACE-REDACTION;IMMUTABLE-SUCCESSOR-ONLY',
  repositoryVisibility: 'PUBLIC',
}));

const applicableDirectiveRegistry = [
  {
    directiveId: 'B0V4-DIR-001',
    sourceReference: `UDL@${SOURCES.find((source) => source.alias === 'UDL').expectedSha256}`,
    claimLimit: 'DIRECTIVE-NAVIGATION;AMENDMENT-ORDER;PLANNING-ONLY',
    precedence: 10,
    temporalApplicability: 'CURRENT-WORK-EPOCH;DOES-NOT-RETROACTIVELY-ACCEPT-B0',
    disposition: 'APPLICABLE-WORK-CONTEXT',
    authorityCredit: 0,
  },
  {
    directiveId: 'B0V4-DIR-002',
    sourceReference: `MCSV2@${SOURCES.find((source) => source.alias === 'MCSV2').expectedSha256}`,
    claimLimit: 'CONTROL-SEQUENCE;B0-BLOCK;GATE29;FREEZE;NON-RETROACTIVITY',
    precedence: 20,
    temporalApplicability: 'CURRENT-PLANNING-CONTROL',
    disposition: 'APPLICABLE-CONTROL-CANDIDATE',
    authorityCredit: 0,
  },
  {
    directiveId: 'B0V4-DIR-003',
    sourceReference: `PUBCYBERV2@${SOURCES.find((source) => source.alias === 'PUBCYBERV2').expectedSha256}`,
    claimLimit: 'PUBLIC-REPOSITORY-AND-CYBER-REQUIREMENT-PREDICATES',
    precedence: 30,
    temporalApplicability: 'CURRENT-PUBLIC-SECURITY-PLANNING',
    disposition: 'APPLICABLE-SECURITY-CANDIDATE',
    authorityCredit: 0,
  },
  {
    directiveId: 'B0V4-DIR-004',
    sourceReference: `D18A2@${SOURCES.find((source) => source.alias === 'D18A2').expectedSha256}`,
    claimLimit: 'REPOSITORY-VISIBILITY=PUBLIC;PUBLIC-SAFEGUARDS;NO-PRIVATE-FALLBACK',
    precedence: 40,
    temporalApplicability: 'BINDING-CURRENT-AND-SUCCESSOR-PUBLIC-WORK-CONSTRAINT',
    disposition: 'APPLICABLE-PUBLIC-INVARIANT',
    authorityCredit: 0,
  },
  {
    directiveId: 'B0V4-DIR-005',
    sourceReference: `TRPV15@${SOURCES.find((source) => source.alias === 'TRPV15').expectedSha256}`,
    claimLimit: 'LATER-THREE-REVIEW-PROTOCOL-CANDIDATE-OBSERVATION',
    precedence: 0,
    temporalApplicability: 'POST-B0V2-CUT;NON-RETROACTIVE;NOT-A-B0-BOOTSTRAP-AUTHORITY',
    disposition: 'EXCLUDED-FROM-B0-AUTHORITY;OBSERVATION-ONLY',
    authorityCredit: 0,
  },
];

const registry = {
  artifactId: 'CONNECT-B0-V4-NORMATIVE-REGISTRY-PACK-2026-08-29-G0',
  artifactClass: 'IMMUTABLE-DETACHED-NORMATIVE-REGISTRY-PACK;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE',
  schemaVersion: 1,
  repositoryVisibility: 'PUBLIC',
  publicInvariant: {
    requiredVisibility: 'PUBLIC',
    permanence: 'NO-REQUIREMENT;ROLLBACK;RECOVERY;EXCEPTION;SUCCESSOR-MAY-SELECT-PRIVATE',
    prohibitedPublicMaterial: ['SECRET', 'PII', 'RESTRICTED-EVIDENCE', 'PRIVATE-BYTES-DIGEST', 'EQUALITY-REVEALING-COMMITMENT', 'MEMBERSHIP-ORACLE', 'MACHINE-LOCAL-IDENTITY'],
    publicRoots: ['SUBJECT-SHA256', 'NORMATIVE-REGISTRY-SHA256', 'SOURCE-MEMBER-SPAN-INDEX-SHA256', 'CROSSWALK-SHA256', 'VECTOR-PROGRAM-PACK-SHA256', 'ATOMIC-PACKAGE-MANIFEST-SHA256', 'DETACHED-QA-ROOTS'],
    privateRootPublication: 'PROHIBITED;PUBLIC-ROW-MAY-STATE-ABSENT-WITHOUT-DERIVATIVE-COMMITMENT',
  },
  importLifecycle: {
    states: ['DISCOVERED', 'BYTE-VERIFIED', 'MEMBER-INDEXED', 'IMPORTED-PROVENANCE-ONLY', 'TYPED-SUPERSEDED', 'REVOKED-SOURCE', 'REJECTED'],
    authoritativeIdentity: ['repositoryRootRelativeLogicalPath', 'fullSha256', 'physicalByteCount', 'physicalLineCount', 'exactMemberLocator', 'startByteInclusive', 'endByteExclusive', 'memberSha256'],
    transitionRules: [
      'DISCOVERED->BYTE-VERIFIED requires exact full SHA-256 and physical identity',
      'BYTE-VERIFIED->MEMBER-INDEXED requires exact non-overflowing byte span and member SHA-256',
      'MEMBER-INDEXED->IMPORTED-PROVENANCE-ONLY grants zero authority and zero closure transfer',
      'IMPORTED-PROVENANCE-ONLY->TYPED-SUPERSEDED requires one literal old atom, one replacement atom and non-weakening proof',
      'ANY-MISMATCH->REJECTED;NO-AUTHORITY;NO-FALLBACK',
    ],
    localResolverMapping: 'MAY-EXIST-ONLY-OUTSIDE-PUBLIC-PACKAGE;PRIVATE;NON-AUTHORITATIVE;NEVER-A-SOURCE-IDENTITY-MEMBER',
    cleanWorkspaceProof: 'TWO-INDEPENDENT-CLEAN-WORKSPACES-MUST-RESOLVE-SAME-BYTES-BEFORE-ACCEPTANCE;CURRENT-RECEIPTS=ABSENT',
  },
  typedSupersessions,
  cycleBreaks,
  roleUniverse: {
    roles,
    pairMatrix,
    pairCount: pairMatrix.length,
    approverSemantics: 'Approver is a distinct appointed work role; exact Tal AuthorityOwner approval is a separate mandatory receipt; neither substitutes for the other.',
    reviewerCardinality: 'EXACTLY-TWO-DISTINCT-EFFECTIVE-CONTROLLERS',
    backupRule: 'EACH-BACKUP-DISTINCT-FROM-PRIMARY-AND-EVERY-ROLE-CONFLICTING-WITH-PRIMARY',
    exceptionAllowed: false,
  },
  genesisFoundation: {
    packageId: 'B0V4-GENESIS-FOUNDATION-PACKAGE-V1',
    admissionClass: 'EXTERNAL-L0-CEREMONY-ONLY;PREEXISTS-B0;NOT-ISSUED-OR-VERIFIED-BY-B0-DESCENDANT',
    mandatoryMembers: [
      'L0TrustAnchorAdmission',
      'TalIdentityBinding',
      'InitialRecoveryQuorumProfile',
      'AlgorithmRegistryHeadAndMembers',
      'InitialKeyStatusHeadAndMembers',
      'TrustedTimeSourceAndInitialDecision',
      'CanonicalSerializationProfile',
      'DeterministicIdentityProfile',
      'AuthorityStoreIdentityAndCapabilityReceipt',
      'EmptyGenesisLedgerHead',
      'EmptyPermitLedgerHead',
      'InitialAppointmentRegistryIncludingApprover',
      'EightRoleConflictMatrix',
      'ControllerEquivalencePolicy',
      'InitialSecurityUniverseHeadAndRevision',
      'WitnessPolicyAndAppointments',
      'ApplicableDirectiveRegistryRoot',
      'PublicDisclosurePolicyRoot',
      'BootstrapReviewProtocolRoot',
      'JournalPolicyRoot',
      'ExceptionRegistryEmptyHead',
      'ExpectedInitialHeadVector',
      'ExternalCeremonyTranscriptRoot',
      'TwoIndependentFoundationValidatorRoots',
    ],
    memberCardinality: 'EACH-EXACTLY-ONE;UNKNOWN-MEMBER-BLOCKED',
    externalCeremony: {
      issuer: 'EXTERNAL-L0-QUORUM',
      witnesses: 'TWO-CONTROLLER-SEPARATED-OFFLINE-WITNESSES',
      verifierInputs: 'PREPROVISIONED-OUTSIDE-B0',
      output: 'ONE-IMMUTABLE-FOUNDATION-ADMISSION-RECEIPT',
      selfApprovalAllowed: false,
    },
    firstGenesisPermit: {
      issuer: 'EXTERNAL-L0-QUORUM-USING-ADMITTED-FOUNDATION',
      actorAppointmentSource: 'INITIAL-APPOINTMENT-REGISTRY-MEMBER',
      expectedLedgerHeadSource: 'EMPTY-GENESIS-LEDGER-HEAD-MEMBER',
      trustedTimeSource: 'INITIAL-TRUSTED-TIME-DECISION-MEMBER',
      securitySnapshotSource: 'INITIAL-SECURITY-UNIVERSE-HEAD-MEMBER',
      atomicAction: 'ONE-USE-CEREMONY-BOUND-GENESIS-LEDGER-CAS',
      createsOwnPrerequisite: false,
    },
    currentFoundationReceipt: null,
    currentFirstGenesisPermitReceipt: null,
  },
  permitTypeRegistry: [
    {
      permitType: 'GenesisPermit',
      issuer: 'EXTERNAL-L0-QUORUM',
      usableAuthority: 1,
      allowedTargets: ['CANONICAL-MANDATE-CANDIDATE', 'B0-DEFINITION-CANDIDATE', 'B0-INSTANCE-CANDIDATE', 'REVIEW-PROTOCOL', 'SEALED-REVIEW-PACKET', 'ZERO-AUTHORITY-GENERATION', 'DETACHED-ACCEPTANCE-ARTIFACT'],
      conversionAllowed: false,
    },
    {
      permitType: 'ConformancePermit',
      issuer: 'SEALED-CONFORMANCE-HARNESS-ONLY',
      usableAuthority: 0,
      capabilityBits: 0,
      target: 'IN-MEMORY-CAPABILITY-SINK',
      mayBecomeCurrent: false,
      conversionAllowed: false,
    },
    {
      permitType: 'OperationalPermit',
      issuer: 'INDEPENDENTLY-ACCEPTED-OPERATIONAL-B0-INSTANCE-ONLY',
      usableAuthority: 1,
      availabilityBeforeB0Acceptance: false,
      conversionAllowed: false,
    },
  ],
  generationProtocol: {
    g1: 'ConformancePermit;exact reducer/CAS/revocation path;capability sink;usableAuthority=0;cannot become Current',
    g2: 'Fresh ConformancePermit;fresh roots;exact reducer/CAS/revocation path;capability sink;usableAuthority=0;cannot become Current',
    o1: 'Only after accepted Definition and external OperationalPermit;cannot bootstrap Definition',
    o2: 'Fresh operational generation proving replay/revocation/invalidation after O1;cannot retroactively validate G1/G2',
    parityProof: ['BYTE-IDENTICAL-REDUCER-ROOT', 'BYTE-IDENTICAL-GUARD-ROOT', 'BYTE-IDENTICAL-SERIALIZATION-ROOT', 'CONFIG-DIFF-EXACTLY-AUTHORITY-BIT+CAPABILITY-SINK'],
    currentReceipts: { g1: null, g2: null, o1: null, o2: null },
  },
  mutableHeadRegistry: {
    derivationRule: 'HEAD-SET=UNIQUE-SORT(objectToHead.headId);UNKNOWN-MUTABLE-OBJECT-CLASS=BLOCKED',
    heads,
    generatedHeadCount: heads.length,
    objectToHead,
    objectClassCount: objectToHead.length,
    securityUniverseHead: {
      aggregate: 'SHA256(CANONICAL-SORTED-ARRAY-OF-ALL-HEAD-ID+VERSION+ROOT-TUPLES)',
      revision: 'ONE-MONOTONIC-U64-IN-AUTHORITY-STORE',
      updateRule: 'ANY-SOURCE-HEAD-ADVANCE-AND-AGGREGATE-ADVANCE-OCCUR-IN-SAME-TRANSACTION',
      membershipGapPolicy: 'BLOCK',
      aliasPolicy: 'BLOCK',
    },
  },
  acceptanceFieldRegistry: {
    schemaId: 'B0V4-ACCEPTANCE-ENVELOPE-FIELD-REGISTRY-V1',
    fieldCount: acceptanceFields.length,
    fields: acceptanceFields,
    unknownFieldPolicy: 'REJECT',
    optionalAuthorityFieldCount: 0,
    omissionMutationRequirement: 'ONE-NEGATIVE-MUTANT-PER-FIELD-BEFORE-ACCEPTANCE',
  },
  outputRegistry,
  acceptanceCas: {
    effectClass: 'ACCEPTANCE-COMMIT',
    assignedStrategy: 'SINGLE-LINEARIZABLE-DOMAIN',
    authorityStoreId: 'B0-LINEARIZABLE-AUTHORITY-STORE-V1',
    requiredStoreCapability: 'SERIALIZABLE-TRANSACTION+COMPARE-EXPECTED-VERSIONS+ATOMIC-DURABLE-COMMIT+MONOTONIC-FENCE',
    currentStoreCapabilityReceipt: null,
    coResidentTransactionalKeys: [
      'SecurityUniverseRevisionAndHead',
      'AllGeneratedSourceHeads',
      'PermitLedgerHeadAndAttempt',
      'RevocationHeadAndAuthorityRevision',
      'AcceptancePointerVersionAndRoot',
      'FinalizationRecord',
      'CommitReceiptOutboxRecord',
    ],
    transaction: [
      'BEGIN-SERIALIZABLE',
      'READ-AND-COMPARE-EXPECTED-SECURITY-UNIVERSE-REVISION-AND-ALL-HEAD-ROOTS',
      'READ-AND-COMPARE-EXPECTED-PERMIT-HEAD;REQUIRE-UNUSED-CURRENT-PERMIT',
      'READ-AND-ORDER-REVOCATION-WINS-AT-EQUAL-AUTHORITY-REVISION',
      'VALIDATE-ALL-ACCEPTANCE-FIELDS-AND-INDEPENDENT-VETOES',
      'CONSUME-EXACTLY-ONE-PERMIT',
      'ADVANCE-ACCEPTANCE-POINTER-EXACTLY-ONE-VERSION',
      'APPEND-EXACTLY-ONE-FINALIZATION-RECORD',
      'APPEND-COMMIT-RECEIPT-PAYLOAD-TO-CORESIDENT-TRANSACTIONAL-OUTBOX',
      'COMMIT',
    ],
    soleLinearizationPoint: 'DURABLE-COMMIT-OF-THE-SINGLE-SERIALIZABLE-AUTHORITY-STORE-TRANSACTION',
    responseLossRule: 'READ-AUTHORITATIVE-ATTEMPT+POINTER+FINALIZATION-BY-EXACT-ID;NEVER-INFER-ABSENCE-FROM-TIMEOUT',
    receiptRule: 'OUTBOX-DELIVERY-IS-EVIDENCE-ONLY;COMMIT-STATE-COMES-FROM-CORESIDENT-FINALIZATION-RECORD',
    independentJournalRule: 'ASYNC-REVISION-BOUND-INTEGRITY-EVIDENCE-ONLY;NEVER-AUTHORITY;MISMATCH-BLOCKS-CONFIRMATION',
    crashTerminals: [
      { cut: 'BEFORE-COMMIT', terminal: 'NOT-COMMITTED', authority: 0 },
      { cut: 'AT-COMMIT-RESPONSE-LOST', terminal: 'UNCERTAIN-UNTIL-AUTHORITATIVE-READBACK', authority: 0 },
      { cut: 'AFTER-DURABLE-COMMIT', terminal: 'COMMITTED-CONFIRMED-ONLY-AFTER-TWO-INDEPENDENT-READBACKS', authority: 0 },
      { cut: 'OUTBOX-DELIVERY-FAILURE', terminal: 'COMMITTED-BUT-NOT-CONFIRMED;RETRY-DELIVERY-IDEMPOTENTLY', authority: 0 },
    ],
  },
  recoveryQuorum: {
    profileId: 'B0V4-L0-RECOVERY-QUORUM-3-OF-5-V1',
    memberSlots: ['RECOVERY-CUSTODIAN-01', 'RECOVERY-CUSTODIAN-02', 'RECOVERY-CUSTODIAN-03', 'RECOVERY-CUSTODIAN-04', 'RECOVERY-CUSTODIAN-05'],
    threshold: 3,
    totalMembers: 5,
    controllerRule: 'ALL-FIVE-DISTINCT-EFFECTIVE-CONTROLLERS;NONE-MAY-CONTROL-PRODUCER,QA,REVIEWER1,REVIEWER2,RECONCILER,APPROVER,ACCEPTANCEWRITER',
    custody: 'OFFLINE;SEPARATE-FAILURE-DOMAINS;NO-SHARE;SECRET;DEVICE-ID;LOCATION;OR-DIGEST-IN-PUBLIC-REPOSITORY',
    activationChallenge: ['RECOVERY-PURPOSE', 'COMPROMISE-CUT', 'NEW-ANCHOR-ROOT', 'NEW-ALGORITHM-AND-KEY-STATUS-ROOTS', 'TRUSTED-TIME-DECISION', 'EXPECTED-RECOVERY-ATTEMPT-LEDGER-HEAD', 'VALIDITY-WINDOW'],
    witnesses: 'EXACTLY-TWO-DISTINCT-WITNESS-CONTROLLERS;NEITHER-A-QUORUM-MEMBER-NOR-WORK-ROLE-CONTROLLER',
    rotation: 'NEW-PROFILE-EXTERNALLY-ADMITTED-BEFORE-ACTIVATION;OLD-PROFILE-REVOKED-IN-SAME-AUTHORITY-REVISION;NO-SIMULTANEOUS-ACTIVE-QUORUMS-AFTER-COMMIT',
    memberLoss: 'ONE-OR-TWO-UNAVAILABLE-MEMBERS-TOLERATED;BELOW-THRESHOLD=BLOCKED-EXTERNAL-RECOVERY-REQUIRED',
    compromiseOrdering: 'COMPROMISE-CUT-REVOKES-AFFECTED-MEMBER-BEFORE-ANY-RECOVERY-ATTEMPT-AT-EQUAL-REVISION',
    attemptLedger: 'APPEND-ONLY;ONE-USE-ATTEMPT-ID;EXPECTED-HEAD-CAS;REPLAY-BLOCKED',
    initialProfileAdmission: 'GENESIS-FOUNDATION-EXTERNAL-CEREMONY',
    replacementProfileAdmission: 'CURRENT-UNCOMPROMISED-L0-QUORUM+TWO-WITNESSES',
    currentProfileReceipt: null,
  },
  applicableDirectiveRegistry,
  vectorProgramSchema: {
    schemaId: 'B0V4-NEGATIVE-VECTOR-PROGRAM-DSL-V1',
    exactFields: ['vectorId', 'requirementId', 'slot', 'fixtureId', 'fixtureRoot', 'fixtureMemberSha256', 'preconditionRoot', 'program', 'programRoot', 'runnerRoots', 'evaluatorRoots', 'expected', 'observed', 'evidenceRoot', 'disposition'],
    operations: ['REMOVE', 'REPLACE', 'SET', 'EVENT'],
    fixtureRule: 'REAL-FROZEN-REQUIREMENT-OR-FINDING-BYTES-DERIVED-CANONICAL-PAYLOAD;NO-MOCK;NO-SAMPLE;NO-SYNTHETIC-BUSINESS-DATA',
    executionRule: 'TWO-INDEPENDENT-ENGINES-MUST-EMIT-BYTE-EQUAL-TERMINAL-SEMANTICS;ENGINE-SPEC-RECEIPTS-DO-NOT-COUNT-AS-OPERATIONAL-EVIDENCE',
    expectedVectorCount: 252,
  },
  convergencePolicy: {
    policyId: 'B0V4-BOUNDED-SUCCESSOR-CONVERGENCE-V1',
    maximumSuccessorRoundsPerReviewEpoch: 3,
    deterministicRoundId: 'SHA256(DOMAIN=B0V4-REVIEW-ROUND;PARENT-SUBJECT-ROOT;DECIMAL-ROUND-ORDINAL)',
    automaticRecursionAllowed: false,
    progressMeasure: ['UNRESOLVED-P0', 'UNRESOLVED-P1', 'UNDECIDED-P2', 'UNDECIDED-P3', 'MISSING-OPERATIONAL-VECTOR-RECEIPTS', 'UNACCEPTED-REQUIREMENTS', 'MISSING-EXTERNAL-ROOTS'],
    successorAdmissionRule: 'EXPLICIT-NEW-GENESISPERMIT+STRICT-LEXICOGRAPHIC-DECREASE-WITHOUT-EARLIER-COMPONENT-INCREASE',
    noProgressTerminal: 'BLOCKED-REQUIRES-NEW-EXTERNAL-AUTHORITY-OR-DESIGN-DECISION',
    roundLimitTerminal: 'BLOCKED-REVIEW-EPOCH-EXHAUSTED;NO-AUTOMATIC-SUCCESSOR',
    successPredicate: {
      freshProducerQa: 'EXACT-CURRENT-SUBJECT-AND-PACKAGE-ROOT;PASS-MECHANICAL-ONLY',
      minimumIndependentHostileReviews: 2,
      independentReviewRule: 'PRESEALED-SAME-PACKET;DISTINCT-EFFECTIVE-CONTROLLERS;NO-PEER-DISCLOSURE-BEFORE-SEAL',
      unresolvedP0: 0,
      unresolvedP1: 0,
      p2p3Rule: 'EVERY-P2-AND-P3-HAS-EXPLICIT-ACCEPT-OR-DEFER-RECEIPT-FROM-AUTHORIZED-ROLE;DEFER-HAS-OWNER,EXPIRY,REVIEW-TRIGGER,NON-AUTHORITY-BOUNDARY',
      vectorRule: 'ALL-252-PROGRAMS-EXECUTED-AGAINST-REAL-SEALED-IMPLEMENTATION-BY-TWO-INDEPENDENT-RUNNERS;ALL-RECEIPTS-ROOTED;ALL-EXPECTED-TERMINALS-MATCH',
      bootstrapSelfApprovalCount: 0,
      exactTalRootApproval: 'PRESENT-AND-CURRENT',
      approverExactRootApproval: 'PRESENT-AND-CURRENT',
      externalL0Foundation: 'PRESENT-AND-CURRENT',
      canonicalMandateReceipt: 'PRESENT-AND-CURRENT',
      acceptanceCas: 'COMMITTED-CONFIRMED-WITH-TWO-INDEPENDENT-READBACKS',
    },
    currentState: 'CANDIDATE-ONLY;SUCCESS-PREDICATE-NOT-SATISFIED;NO-RECURSION-AUTHORIZED',
  },
  engineRoots: {
    mechanicalSemanticEngineA: sha(bytes(ENGINE_A)),
    mechanicalSemanticEngineB: sha(bytes(ENGINE_B)),
    generator: sha(bytes(GENERATOR)),
  },
  currentAuthorityState: {
    externalL0Authority: 'ABSENT',
    canonicalMandateReceipt: 'ABSENT',
    acceptedRequirementCount: '0/84',
    implementedOutputCount: '0/84',
    independentlyClosedV3FindingCount: '0/13',
    operationalVectorExecutionCount: '0/252',
    b0: 'ABSENT',
    controlSequenceAcceptance: 'BLOCKED',
    gate29: 'BLOCKED',
    developmentFreeze: 'ACTIVE',
    authorityCredit: 0,
  },
};

write(OUTPUT.registry, pretty(registry));
const registryRoot = sha(bytes(OUTPUT.registry));

const v3FindingRoot = SOURCES.find((source) => source.alias === 'B0V3RM').expectedSha256;
const v3SubjectRoot = SOURCES.find((source) => source.alias === 'B0V3').expectedSha256;
const registryRef = `B0V4NR@${registryRoot}`;
const newRequirementDefinitions = [
  {
    title: 'Atom-exact import lifecycle and non-weakening supersession',
    statement: 'addressesNew=B0V3-HR-F001; noMergeKey=B0V3-LIFECYCLE-EXACT-IMPORT-CONTRADICTION; output=B0V4OUT-000; bind imported atoms separately to B0V4-SUP-LIFE-001, B0V4-SUP-LIFE-002, B0V4-SUP-LIFE-003 and B0V4-SUP-LIFE-004 so uncertainty/quarantine are non-final AttemptState values while exactly one FinalResult remains immutable.',
    threat: 'Two mandatory lifecycle interpretations can produce opposite reducer results and either overwrite a terminal or prevent safe reconciliation.',
    proof: 'All four predecessor atoms, replacements, safety intents and non-weakening arguments are literal; two independent reducers must agree for preserve-old, response-loss, reconcile, partial-effect and second-finalization schedules; no silent replacement, merge or closure transfer; vectors=B0V4-V-000-A/B/C.',
    deps: [],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F001; ${registryRef}::B0V4-SUP-LIFE-001; ${registryRef}::B0V4-SUP-LIFE-002; ${registryRef}::B0V4-SUP-LIFE-003; ${registryRef}::B0V4-SUP-LIFE-004`,
  },
  {
    title: 'Portable exact import identity with private zero-authority resolution',
    statement: 'addressesNew=B0V3-HR-F002; noMergeKey=B0V3-PORTABLE-PATH-EXACT-IMPORT-CONTRADICTION; output=B0V4OUT-001; authoritative source identity is repository-root-relative logicalPath plus full SHA-256, physical counts and exact byte span; machine-local resolver mappings are private observations and never Public members or authority.',
    threat: 'An authoritative absolute path discloses machine identity and breaks clean-workspace reproducibility, while deleting physical identity permits substitution.',
    proof: 'B0V4-SUP-PATH-001 is literal; two clean workspaces must resolve identical bytes and member spans; public machine-local path count=0; private resolver authorityCredit=0; path traversal, symlink, same-name substitution and promotion of local mapping block; vectors=B0V4-V-001-A/B/C.',
    deps: [],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F002; ${registryRef}::/importLifecycle`,
  },
  {
    title: 'GenesisPermit, ConformancePermit and OperationalPermit separation',
    statement: 'addressesNew=B0V3-HR-F003; noMergeKey=B0V3-GENERATION-PERMIT-PARITY-EXACT-IMPORT-CONTRADICTION; output=B0V4OUT-002; freeze three non-convertible Permit types; G1/G2 use only zero-authority ConformancePermit through byte-identical reducers and capability sink; OperationalPermit remains impossible until an independently accepted operational Instance; O1/O2 cannot bootstrap Definition.',
    threat: 'Skipping Permit logic makes parity false; using an operational Permit in G1/G2 grants recursive authority.',
    proof: 'B0V4-SUP-GEN-001, B0V4-SUP-GEN-002 and B0V4-SUP-GEN-003 are literal independent rows; type confusion and conversion are blocked; parity config differs only in immutable authority/capability masks; G1/G2/O1/O2 execution receipts remain absent and mandatory; vectors=B0V4-V-002-A/B/C.',
    deps: [0],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F003; ${registryRef}::/permitTypeRegistry`,
  },
  {
    title: 'Complete NamedUse graph and seventeen prior-interface cycle breaks',
    statement: 'addressesNew=B0V3-HR-F004; noMergeKey=B0V3-HIDDEN-NAMED-USE-BUILD-ORDER-LOOPS; output=B0V4OUT-003; classify every machine token use and split each of the exact seventeen hidden v3 forward uses through one prior immutable B0V4-IFACE row; the parsed dependency graph remains the only build order and all build edges point backward.',
    threat: 'A prose-only construction use can hide a two-node cycle even when the declared build DAG is acyclic.',
    proof: 'Cycle-break rows=17/17; prior interfaces=17/17; complete NamedUse token classification has unclassified=0 and symmetric difference=0; two independent graph engines agree on nodes, edges and acyclicity; deletion, hidden-forward-use and reverse-edge mutations block; vectors=B0V4-V-003-A/B/C.',
    deps: [0, 1, 2],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F004; ${registryRef}::/cycleBreaks`,
  },
  {
    title: 'Externally admitted first-Genesis foundation',
    statement: 'addressesNew=B0V3-HR-F005; noMergeKey=B0V3-FIRST-GENESIS-PREREQUISITE-BOOTSTRAP-HOLE; output=B0V4OUT-004; define one detached GenesisFoundationPackage with the complete initial authority/store/head/time/algorithm/key/appointment/controller/recovery/witness/directive/Public/review denominator and an external L0 ceremony before the first GenesisPermit.',
    threat: 'If the first Permit creates or verifies its own Appointment, ledger, store, time, key or snapshot prerequisite, bootstrap authority is circular.',
    proof: 'Foundation members are closed and each exactly one; unknown/missing/substituted member blocks; the issuer/verifiers/witnesses preexist B0; first-Permit preconditions resolve only to admitted foundation members; external ceremony and capability receipts are currently absent; vectors=B0V4-V-004-A/B/C.',
    deps: [0, 1, 2, 3],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F005; ${registryRef}::/genesisFoundation`,
  },
  {
    title: 'Generated total mutable-object to authoritative-head coverage',
    statement: 'addressesNew=B0V3-HR-F006; noMergeKey=B0V3-MUTABLE-HEAD-COMPLETENESS-DERIVATION-ABSENT; output=B0V4OUT-005; generate the authoritative head set from a closed MutableObjectToHeadMap; every mutable authority-bearing class maps to exactly one head and one immutable membership path into SecurityUniverseHead; unknown or multiply mapped classes block.',
    threat: 'A mutable policy omitted from the snapshot can change after eligibility without invalidating Acceptance or Permit use.',
    proof: `objectClasses=${objectToHead.length}/${objectToHead.length}; generatedHeads=${heads.length}/${heads.length}; duplicate/unknown/unmapped=0; each head/source-object change advances the same SecurityUniverse revision; per-object omission/race vectors remain mandatory; vectors=B0V4-V-005-A/B/C.`,
    deps: [0, 1, 3, 4],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F006; ${registryRef}::/mutableHeadRegistry`,
  },
  {
    title: 'Imported Approver and complete eight-role separation',
    statement: 'addressesNew=B0V3-HR-F007; noMergeKey=B0V3-IMPORTED-APPROVER-ROLE-DROPPED; output=B0V4OUT-006; preserve Approver as a distinct role, retain AuthorityOwner exact-root approval as a separate mandatory act, and prohibit shared EffectiveController for all 28 unordered pairs across eight roles including backups, credentials, delegations and sessions.',
    threat: 'Omitting Approver permits silent role equivalence, rejection of every approval or self-approval through an untested controller pair.',
    proof: 'roles=8/8; unorderedPairs=28/28; prohibited=28/28; Approver Appointment and AuthorityOwner receipt are independently mandatory; controller alias, stale appointment, writer overlap and generation/root replay block; vectors=B0V4-V-006-A/B/C.',
    deps: [0, 3, 4, 5],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F007; ${registryRef}::/roleUniverse`,
  },
  {
    title: 'Executable vector programs, real frozen fixtures and exact terminals',
    statement: 'addressesNew=B0V3-HR-F008; noMergeKey=B0V3-VECTOR-IDENTITY-WITHOUT-EXECUTABLE-SPECIFICATION; output=B0V4OUT-007; materialize exactly 252 immutable vector programs and 252 real frozen-source-derived fixtures, each with exact operations, runner/evaluator roots, expected terminal semantics and detached execution receipt slots.',
    threat: 'A label-only vector lets different runners choose different mutations and oracles while claiming the same identity.',
    proof: 'programs=252/252; fixtures=252/252; required fields non-null except observed/Evidence before execution; two independent planning DSL engines must execute all programs and agree; operational execution and Acceptance remain 0/252 until real implementation receipts; vectors=B0V4-V-007-A/B/C.',
    deps: [0, 1, 2, 3, 4, 5, 6],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F008; ${registryRef}::/vectorProgramSchema`,
  },
  {
    title: 'Literal field-closed Acceptance envelope',
    statement: `addressesNew=B0V3-HR-F009; noMergeKey=B0V3-ACCEPTANCE-GROUPS-WITHOUT-FIELD-DENOMINATOR; output=B0V4OUT-008; bind one closed AcceptanceFieldRegistry with exactly ${acceptanceFields.length} literal fields, each carrying type, cardinality, classification, source head, freshness, invalidation, producer and closure predicate; unknown and optional authority fields are rejected.`,
    threat: 'Group labels can hide omitted approvals, stale nested heads, or divergent schema interpretations.',
    proof: `fields=${acceptanceFields.length}/${acceptanceFields.length}; unique=${acceptanceFields.length}/${acceptanceFields.length}; optionalAuthorityFields=0; all ${heads.length} generated heads have distinct exact fields; forward/inverse traversal and one omission/substitution/staleness mutant per field are mandatory; vectors=B0V4-V-008-A/B/C.`,
    deps: [0, 2, 3, 4, 5, 6, 7],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F009; ${registryRef}::/acceptanceFieldRegistry`,
  },
  {
    title: 'Per-Output custody and permanent Public projection',
    statement: 'addressesNew=B0V3-HR-F010; noMergeKey=B0V3-OUTPUT-CUSTODY-PUBLIC-PROJECTION-UNBOUND; output=B0V4OUT-009; bind all 84 Outputs to planning/runtime classification, custody, Public representation, publication surface, egress-policy head and immutable redaction/successor rule; repository visibility is permanently Public and restricted runtime instances have no Public derivative commitment.',
    threat: 'A globally stated Public rule cannot prevent one Output from leaking restricted bytes or disappearing from its required Public surface.',
    proof: 'custody/projection rows=84/84; repositoryVisibility=PUBLIC for every row; planning schema is public while runtime instances remain absent/restricted; private digest, equality oracle, membership oracle and machine-local identity counts=0; vectors=B0V4-V-009-A/B/C.',
    deps: [0, 1, 3, 5, 7, 8],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F010; ${registryRef}::/outputRegistry`,
  },
  {
    title: 'Exact realizable Acceptance CAS topology and recovery',
    statement: 'addressesNew=B0V3-HR-F011; noMergeKey=B0V3-ACCEPTANCE-CAS-STRATEGY-STORE-LINEARIZATION-UNBOUND; output=B0V4OUT-010; assign ACCEPTANCE-COMMIT only to SINGLE-LINEARIZABLE-DOMAIN with all security heads, Permit, revocation, pointer, finalization and receipt outbox co-resident in one serializable authority-store transaction whose durable commit is the sole linearization point.',
    threat: 'Cross-store validation and commit can observe different cuts, partially consume a Permit or lose the only proof after response loss.',
    proof: 'Strategy, store identity, capability, keys, ordered transaction, sole point, revocation order, receipt and every crash terminal are literal; unavailable store-capability receipt blocks; split-store, head-race, equal-revision revoke, receipt failure and response-loss schedules have one safe outcome; vectors=B0V4-V-010-A/B/C.',
    deps: [0, 2, 4, 5, 6, 8, 9],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F011; ${registryRef}::/acceptanceCas`,
  },
  {
    title: 'Realizable externally controlled L0 recovery quorum',
    statement: 'addressesNew=B0V3-HR-F012; noMergeKey=B0V3-L0-RECOVERY-QUORUM-SEMANTICS-OPEN; output=B0V4OUT-011; freeze a 3-of-5 offline RecoveryQuorumProfile with five controller-separated custodians, two separate witnesses, exact challenge, epochs, validity, rotation/revocation ordering and an append-only one-use recovery-attempt ledger.',
    threat: 'An undefined quorum can collapse to one compromised controller, replay old material, strand recovery or revive revoked authority.',
    proof: 'members=5/5; threshold=3; distinct controllers=5; witnesses=2; work-role overlap=0; threshold underflow, old-quorum replay, compromised backdate, outage, rotation and revocation-race schedules block; current profile/custody ceremony receipts are absent; vectors=B0V4-V-011-A/B/C.',
    deps: [0, 1, 3, 4, 5, 6, 10],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F012; ${registryRef}::/recoveryQuorum`,
  },
  {
    title: 'Applicable directive roots, precedence and non-retroactivity',
    statement: 'addressesNew=B0V3-HR-F013; noMergeKey=B0V3-APPLICABLE-DIRECTIVE-ROOT-UNIVERSE-OMITTED; output=B0V4OUT-012; freeze the exact UDL, control v2, Public/cyber v2 and D18-A2 roots with claim limits, precedence and temporal scope; classify Protocol v1.5 as later non-retroactive observation with zero authority.',
    threat: 'Readers can choose different directives, revive Private, or retroactively apply a later protocol if applicable roots are not frozen.',
    proof: 'directive rows=5/5; exact roots resolve; authorityCredit=0 for all; D18-A2 Public invariant is applicable; stale root, omitted D18, conflicting Private, observation-as-authority and later-protocol retroactivity block; vectors=B0V4-V-012-A/B/C.',
    deps: [0, 1, 3, 4, 5, 7, 8, 9, 10, 11],
    source: `B0V3RM@${v3FindingRoot}::B0V3-HR-F013; ${registryRef}::/applicableDirectiveRegistry`,
  },
  {
    title: 'Bounded terminal convergence without recursive self-approval',
    statement: 'output=B0V4OUT-013; define a maximum of three explicitly permitted successor rounds per review epoch and no automatic recursion; success requires fresh Producer QA, two independent hostile Reviews, zero unresolved P0/P1, explicit authorized P2/P3 accept-or-defer receipts, all 252 real operational vector receipts, external L0 foundation, exact mandate and approvals, confirmed CAS/readbacks and bootstrap self-approval count zero.',
    threat: 'An unbounded successor rule can recurse forever or declare success by lowering review quality, silently deferring findings or self-approving bootstrap roots.',
    proof: 'Round ID and lexicographic progress measure are deterministic; no-progress and round-limit states are terminal BLOCKED; P0/P1 cannot be deferred; P2/P3 cannot be implicit; every successor needs a fresh external GenesisPermit; candidate Producer QA alone never satisfies success; vectors=B0V4-V-013-A/B/C.',
    deps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    source: `B0V3R@${SOURCES.find((source) => source.alias === 'B0V3R').expectedSha256}::§3.1.3; ${registryRef}::/convergencePolicy`,
  },
];

const supersessionsByV3 = new Map([
  [25, ['B0V4-SUP-GEN-001', 'B0V4-SUP-GEN-002', 'B0V4-SUP-GEN-003']],
  [26, ['B0V4-SUP-LIFE-001', 'B0V4-SUP-LIFE-002', 'B0V4-SUP-LIFE-003', 'B0V4-SUP-LIFE-004']],
  [27, ['B0V4-SUP-PATH-001']],
  [40, ['B0V4-SUP-LIFE-001', 'B0V4-SUP-LIFE-002', 'B0V4-SUP-LIFE-003', 'B0V4-SUP-LIFE-004']],
  [43, ['B0V4-SUP-GEN-001', 'B0V4-SUP-GEN-002', 'B0V4-SUP-GEN-003']],
  [44, ['B0V4-SUP-LIFE-001', 'B0V4-SUP-LIFE-002', 'B0V4-SUP-LIFE-003', 'B0V4-SUP-LIFE-004']],
  [55, ['B0V4-SUP-LIFE-001', 'B0V4-SUP-LIFE-002', 'B0V4-SUP-LIFE-003', 'B0V4-SUP-LIFE-004']],
  [56, ['B0V4-SUP-LIFE-001', 'B0V4-SUP-LIFE-002', 'B0V4-SUP-LIFE-003', 'B0V4-SUP-LIFE-004']],
  [61, ['B0V4-SUP-PATH-001']],
  [62, ['B0V4-SUP-ROLE-001', 'B0V4-SUP-ROLE-002']],
  [64, ['B0V4-SUP-GEN-001', 'B0V4-SUP-GEN-002', 'B0V4-SUP-GEN-003']],
]);

function mappedDependencies(v3Fields) {
  const mapped = [...v3Fields.dependencies.matchAll(/B0V3REQ-(\d{3})/g)].map((match) => Number(match[1]) + 14);
  return [...new Set([...Array.from({ length: 14 }, (_, index) => index), ...mapped])].sort((left, right) => left - right);
}

const preservedRequirements = v3Requirements.map((row, index) => {
  const number = index + 14;
  const appliedSupersessions = supersessionsByV3.get(index) || [];
  const supersessionClause = appliedSupersessions.length === 0 ? 'typedSupersession=NONE' : `typedSupersession=${appliedSupersessions.join(',')};old-representation-non-normative-only-at-listed-atoms;safety-intent-preserved`;
  const v2Row = index < v2Requirements.length ? v2Requirements[index] : null;
  const v1Row = index < v1Requirements.length ? v1Requirements[index] : null;
  const lowerStatement = `${v2Row ? `; v2StatementConjunct=${JSON.stringify(v2Row.fields.statement)}` : ''}${v1Row ? `; originalStatementConjunct=${JSON.stringify(v1Row.fields.statement)}` : ''}`;
  const lowerThreat = `${v2Row ? `; v2ThreatCauseImpactConjunct=${JSON.stringify(v2Row.fields.threatCauseImpact)}` : ''}${v1Row ? `; originalThreatCauseImpactConjunct=${JSON.stringify(v1Row.fields.threatCauseImpact)}` : ''}`;
  const lowerProof = `${v2Row ? `; v2RequiredProofConjunct=${JSON.stringify(v2Row.fields.requiredProof)}` : ''}${v1Row ? `; originalRequiredProofConjunct=${JSON.stringify(v1Row.fields.requiredProof)}` : ''}`;
  const lowerDependencies = `${v2Row ? `; v2DependenciesConjunct=${JSON.stringify(v2Row.fields.dependencies)}` : ''}${v1Row ? `; originalDependenciesConjunct=${JSON.stringify(v1Row.fields.dependencies)}` : ''}`;
  const lowerSources = `${v2Row ? `; v2SourceBasisConjunct=${JSON.stringify(v2Row.fields.sourceBasis)}` : ''}${v1Row ? `; originalSourceBasisConjunct=${JSON.stringify(v1Row.fields.sourceBasis)}` : ''}`;
  return {
    title: `Lossless preservation of ${row.id} — ${row.title}`,
    statement: `preservesV3=${row.id}; output=B0V4OUT-${pad(number)}; allFivePredecessorFieldsRemainDistinct=true; ${supersessionClause}; v3StatementConjunct=${JSON.stringify(row.fields.statement)}${lowerStatement}; strengthening=all-v4-hardening-registries-are-mandatory-and-no-predecessor-Acceptance-transfers.`,
    threat: `v3ThreatCauseImpactConjunct=${JSON.stringify(row.fields.threatCauseImpact)}${lowerThreat}; a missing, narrowed, merged, range-only or transferred predecessor field can hide an authority defect behind successor presence.`,
    proof: `v3RequiredProofConjunct=${JSON.stringify(row.fields.requiredProof)}${lowerProof}; exact predecessor field digests and values must match the detached crosswalk forward and inverse; typed supersession is legal only for the listed atom rows; missing/narrowed/merged/transferred=0; vectors=B0V4-V-${pad(number)}-A/B/C; operational Evidence remains absent.`,
    deps: mappedDependencies(row.fields),
    dependencyConjunct: `${row.fields.dependencies}${lowerDependencies}`,
    source: `B0V3@${v3SubjectRoot}::${row.id}; v3SourceBasisConjunct=${JSON.stringify(row.fields.sourceBasis)}${lowerSources}; ${registryRef}::/typedSupersessions`,
    predecessor: row,
  };
});

const allRequirements = [...newRequirementDefinitions.map((row) => ({ ...row, dependencyConjunct: 'none' })), ...preservedRequirements];
if (allRequirements.length !== 84) throw new Error(`Expected 84 v4 Requirements, got ${allRequirements.length}`);

const subjectLines = [
  '# 1. Connect — Bootstrap Authority Envelope B0 immutable successor requirements v4',
  '',
  '## 1.1 Identity, scope and non-authority',
  '',
  '1.1.1 `artifactId=CONNECT-BOOTSTRAP-AUTHORITY-ENVELOPE-B0-SUCCESSOR-REQUIREMENTS-V4-2026-08-29-G0`.',
  '',
  '1.1.2 `artifactClass=IMMUTABLE-REQUIREMENT-SUCCESSOR-CANDIDATE;NOT-B0-DEFINITION;NOT-B0-INSTANCE;NOT-AUTHORITY;NOT-ACCEPTED`.',
  '',
  `1.1.3 Normative registry root=${registryRoot}; every registry member is mandatory. The Subject and detached package members form one all-or-nothing Candidate package; a missing or changed member blocks all credit.`,
  '',
  '1.1.4 This Candidate authorizes planning artifacts only. It authorizes no Product code, Build, Runtime, Git mutation, Commit, Push, GitHub setting, provider operation, credential operation, purchase, deployment or external message.',
  '',
  '1.1.5 Repository visibility is permanently `PUBLIC`. No requirement, recovery, rollback, exception or successor may select `PRIVATE`, expose a Secret/PII/restricted Evidence/private-byte digest/equality oracle/membership oracle/machine-local identity, or weaken the D18-A2 Public invariant.',
  '',
  '1.1.6 `externalL0Authority=ABSENT`; `genesisFoundationReceipt=ABSENT`; `canonicalMandateReceipt=ABSENT`; `acceptedRequirementCount=0/84`; `implementedOutputCount=0/84`; `independentlyClosedV3FindingCount=0/13`; `operationalVectorExecutionCount=0/252`; `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`.',
  '',
  '## 1.2 Frozen input roots',
  '',
  '| Alias | SHA-256 | Repository-root-relative path | Claim limit | Authority credit |',
  '|---|---|---|---|---:|',
  ...SOURCES.map((source) => `| \`${source.alias}\` | \`${source.expectedSha256}\` | \`${source.logicalPath}\` | ${source.claimLimit} | 0 |`),
  '',
  '1.2.1 Every source reference resolves by repository-root-relative logical path, exact full SHA-256, exact physical identity and exact member byte span. An absolute local path has zero normative value and is prohibited from the Public package.',
  '',
  '1.2.2 Source bytes prove provenance only. No source can admit itself, authenticate Tal, grant a Permit, close a Finding, transfer Acceptance or contribute authority merely by being present.',
  '',
  '## 1.3 Exact Requirement contract',
  '',
  '1.3.1 Requirement IDs are contiguous and unique. Each has exactly five fields: `statement`, `threatCauseImpact`, `requiredProof`, `dependencies`, `sourceBasis`.',
  '',
  '1.3.2 Every Requirement binds exactly one unique Output. Output presence is neither implementation nor Evidence, closure, Acceptance or authority.',
  '',
  '1.3.3 The 70 v3 Requirements, 49 v2 Requirements, 27 originals, 22 legacy Findings, 21 v2-review Findings and 13 v3-review Findings each retain a literal one-to-one row. Ranges, merges, presence-only credit and closure transfer are forbidden.',
  '',
  '1.3.4 Exact predecessor field values remain distinct mandatory conjuncts. Only the ten atom-level typed-supersession rows may replace a contradictory representation; every replacement preserves the old safety intent and strengthens determinism or confidentiality.',
  '',
  '1.3.5 The parsed `dependencies` IDs are the complete build DAG. Every dependency points to a lower-numbered v4 Requirement. Semantic uses are separately classified by the detached complete NamedUse graph; prose receives zero edge credit.',
  '',
  '1.3.6 Object identity is deterministic, canonical and domain-separated. Random ID generation, mock/fake/demo/sample/synthetic business data, implicit retry and default success are prohibited.',
  '',
  '# 2. One-to-one v3 Finding remediation and bounded convergence',
  '',
];

function addRequirement(lines, section, number, row) {
  lines.push(`## ${section}.${number + 1} \`B0V4REQ-${pad(number)}\` — ${row.title}`, '');
  const prefix = `${section}.${number + 1}`;
  lines.push(`${prefix}.1 \`statement\`: ${row.statement}`, '');
  lines.push(`${prefix}.2 \`threatCauseImpact\`: ${row.threat}`, '');
  lines.push(`${prefix}.3 \`requiredProof\`: ${row.proof}`, '');
  const dependencyIds = row.deps.map((dependency) => `\`B0V4REQ-${pad(dependency)}\``).join('; ');
  lines.push(`${prefix}.4 \`dependencies\`: v3DependencyConjunct=${JSON.stringify(row.dependencyConjunct)}; buildDependencies=${dependencyIds || 'none'}.`, '');
  lines.push(`${prefix}.5 \`sourceBasis\`: ${row.source}`, '');
}

newRequirementDefinitions.forEach((row, index) => addRequirement(subjectLines, 2, index, { ...row, dependencyConjunct: 'none' }));
subjectLines.push('# 3. Lossless preservation of all seventy v3 Requirements', '');
preservedRequirements.forEach((row, index) => addRequirement(subjectLines, 3, index + 14, row));
subjectLines.push(
  '# 4. Detached machine registries and one atomic package',
  '',
  `4.1 Normative registry=${registryRoot}; Requirements=84; fields=420; Outputs=84; typed supersessions=10; cycle breaks=17; roles=8; role pairs=28; generated heads=${heads.length}; mapped mutable object classes=${objectToHead.length}; Acceptance fields=${acceptanceFields.length}; vector programs=252.`,
  '',
  '4.2 The exact source/member/span index, closure crosswalk, NamedUse graph and vector program pack are detached immutable package members. The later atomic package manifest binds their exact roots. Absence or mismatch of any member makes the complete Candidate unavailable.',
  '',
  '4.3 Producer QA may claim only `PASS-CANDIDATE-MECHANICAL-ONLY`. It cannot accept a Requirement, close a Finding, create L0, satisfy a mandate, implement an Output, grant a Permit, satisfy an operational vector or create B0.',
  '',
  '# 5. Bounded terminal',
  '',
  '5.1 Candidate generation never recurses automatically. At most three explicitly permitted successor rounds exist per review epoch, and each admitted successor must strictly reduce the frozen blocker measure without increasing an earlier component.',
  '',
  '5.2 Success requires fresh Producer QA, two independent hostile Reviews, unresolved P0=0, unresolved P1=0, an explicit authorized accept/defer receipt for every P2/P3, all 252 real operational vector receipts from independent runners, no bootstrap self-approval, external L0 foundation and mandate, exact AuthorityOwner and Approver receipts, and confirmed CAS/readbacks.',
  '',
  '5.3 Current terminal is `CANDIDATE-NOT-ACCEPTED;B0-ABSENT;GATE29-BLOCKED;DEVELOPMENT-FREEZE-ACTIVE;PUBLIC-INVARIANT-PERMANENT`. No claim in this Subject changes that terminal.',
  '',
);
write(OUTPUT.subject, `${subjectLines.join('\n')}\n`);
const subjectRoot = sha(bytes(OUTPUT.subject));

const sourceIndex = {
  artifactId: 'CONNECT-B0-V4-EXACT-SOURCE-MEMBER-SPAN-INDEX-2026-08-29-G0',
  artifactClass: 'IMMUTABLE-DETACHED-SOURCE-MEMBER-SPAN-INDEX;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE',
  schemaVersion: 1,
  subjectSha256: subjectRoot,
  normativeRegistrySha256: registryRoot,
  locatorSemantics: 'START-BYTE-INCLUSIVE;END-BYTE-EXCLUSIVE;UTF8-RAW-BYTES;REPOSITORY-ROOT-RELATIVE-LOGICAL-PATH',
  publicInvariant: 'PUBLIC;NO-ABSOLUTE-MACHINE-LOCAL-PATH;NO-PRIVATE-BYTE-COMMITMENT',
  artifacts: [
    ...SOURCES.map((source) => indexArtifact(source.alias, source.logicalPath, source.claimLimit, source.authorityClass)),
    indexArtifact('B0V4NR', OUTPUT.registry, 'Exact normative registry members and closed denominators', 'V4-NORMATIVE-REGISTRY;ZERO-AUTHORITY'),
    indexArtifact('B0V4', OUTPUT.subject, 'Exact 84 v4 five-field Requirement rows and candidate terminal', 'V4-SUBJECT-CANDIDATE;ZERO-AUTHORITY'),
  ],
  currentState: 'INDEX-COMPLETE;AUTHORITY-CREDIT=0;ACCEPTANCE-CREDIT=0',
};
write(OUTPUT.sourceIndex, pretty(sourceIndex));
const sourceIndexRoot = sha(bytes(OUTPUT.sourceIndex));

const artifactByAlias = new Map(sourceIndex.artifacts.map((artifact) => [artifact.alias, artifact]));
function member(alias, locator) {
  const artifact = artifactByAlias.get(alias);
  if (!artifact) throw new Error(`Unknown source alias ${alias}`);
  const found = artifact.members.find((candidate) => candidate.locator === locator);
  if (!found) throw new Error(`Missing member ${alias}::${locator}`);
  return found;
}

const v4Requirements = parseFiveFieldRequirements(text(OUTPUT.subject), 'B0V4REQ');
if (v4Requirements.length !== 84) throw new Error(`Expected 84 generated Requirements, got ${v4Requirements.length}`);

function fieldPreservation(sourceFields, targetFields) {
  return ['statement', 'threatCauseImpact', 'requiredProof', 'dependencies', 'sourceBasis'].map((field) => ({
    field,
    sourceValue: sourceFields[field],
    sourceValueSha256: sha(Buffer.from(sourceFields[field], 'utf8')),
    targetValueSha256: sha(Buffer.from(targetFields[field], 'utf8')),
    targetContainsExactSourceValue: targetFields[field].includes(sourceFields[field]),
  }));
}

const v3FindingText = text(SOURCES.find((source) => source.alias === 'B0V3RM').logicalPath);
const v3Findings = [...v3FindingText.matchAll(/^\| `(?<id>B0V3-HR-F\d{3})` \| (?<severity>P\d) \| `(?<state>[^`]+)` \| `(?<noMergeKey>[^`]+)` \|$/gm)].map((match) => match.groups);
if (v3Findings.length !== 13) throw new Error(`Expected 13 v3 Findings, got ${v3Findings.length}`);

const v3FindingRows = v3Findings.map((finding, index) => ({
  sourceId: finding.id,
  sourceMemberSha256: member('B0V3RM', finding.id).sha256,
  severity: finding.severity,
  noMergeKey: finding.noMergeKey,
  targetRequirementId: `B0V4REQ-${pad(index)}`,
  targetOutputId: `B0V4OUT-${pad(index)}`,
  mappingCardinality: 'ONE-SOURCE-TO-ONE-TARGET',
  candidateDelta: 'MATERIALIZED',
  independentClosureState: 'OPEN-PENDING-FRESH-INDEPENDENT-HOSTILE-REVIEWS-AND-REQUIRED-EVIDENCE',
  acceptanceTransferred: false,
  closureTransferred: false,
  evidenceBorrowed: false,
}));

const v3RequirementRows = v3Requirements.map((row, index) => ({
  sourceId: row.id,
  sourceMemberSha256: member('B0V3', row.id).sha256,
  targetRequirementId: `B0V4REQ-${pad(index + 14)}`,
  targetOutputId: `B0V4OUT-${pad(index + 14)}`,
  exactFiveFieldPreservation: fieldPreservation(row.fields, v4Requirements[index + 14].fields),
  appliedTypedSupersessions: supersessionsByV3.get(index) || [],
  mappingCardinality: 'ONE-SOURCE-TO-ONE-TARGET',
  state: 'PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-ACCEPTANCE',
  acceptanceTransferred: false,
  closureTransferred: false,
}));

const v2RequirementRows = v2Requirements.map((row, index) => ({
  sourceId: row.id,
  sourceMemberSha256: member('B0V2', row.id).sha256,
  intermediateV3RequirementId: `B0V3REQ-${pad(index)}`,
  targetRequirementId: `B0V4REQ-${pad(index + 14)}`,
  targetOutputId: `B0V4OUT-${pad(index + 14)}`,
  exactFiveFieldPreservation: fieldPreservation(row.fields, v4Requirements[index + 14].fields),
  mappingCardinality: 'ONE-SOURCE-TO-ONE-TARGET',
  state: 'PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-ACCEPTANCE',
  acceptanceTransferred: false,
  closureTransferred: false,
}));

const originalRequirementRows = v1Requirements.map((row, index) => ({
  sourceId: row.id,
  sourceMemberSha256: member('B0V1', row.id).sha256,
  intermediateV2RequirementId: `B0V2REQ-${pad(index)}`,
  intermediateV3RequirementId: `B0V3REQ-${pad(index)}`,
  targetRequirementId: `B0V4REQ-${pad(index + 14)}`,
  targetOutputId: `B0V4OUT-${pad(index + 14)}`,
  exactFiveFieldPreservation: fieldPreservation(row.fields, v4Requirements[index + 14].fields),
  mappingCardinality: 'ONE-SOURCE-TO-ONE-TARGET',
  state: 'PRESERVED-IN-CANDIDATE;OPEN-PENDING-INDEPENDENT-ACCEPTANCE',
  acceptanceTransferred: false,
  closureTransferred: false,
}));

const legacyFindingRows = Array.from({ length: 22 }, (_, index) => {
  const sourceId = `B0-HR-F${pad(index + 1)}`;
  return {
    sourceId,
    sourceMemberSha256: member('B0HRM', sourceId).sha256,
    intermediateV3RequirementId: `B0V3REQ-${pad(index + 27)}`,
    targetRequirementId: `B0V4REQ-${pad(index + 41)}`,
    targetOutputId: `B0V4OUT-${pad(index + 41)}`,
    mappingCardinality: 'ONE-SOURCE-TO-ONE-TARGET',
    state: 'PRESERVED-REMEDIATION-IN-CANDIDATE;CLOSURE-NOT-TRANSFERRED',
    acceptanceTransferred: false,
    closureTransferred: false,
  };
});

const v2ReviewFindingRows = Array.from({ length: 21 }, (_, index) => {
  const sourceId = `B0V2-HR-F${pad(index + 1)}`;
  return {
    sourceId,
    sourceMemberSha256: member('B0V2RM', sourceId).sha256,
    intermediateV3RequirementId: `B0V3REQ-${pad(index + 49)}`,
    targetRequirementId: `B0V4REQ-${pad(index + 63)}`,
    targetOutputId: `B0V4OUT-${pad(index + 63)}`,
    mappingCardinality: 'ONE-SOURCE-TO-ONE-TARGET',
    state: 'PRESERVED-REMEDIATION-IN-CANDIDATE;CLOSURE-NOT-TRANSFERRED',
    acceptanceTransferred: false,
    closureTransferred: false,
  };
});

const tokenPattern = /(?:B0V4REQ|B0V4OUT|B0V3REQ|B0V2REQ|B0REQ|B0V3-HR-F|B0V2-HR-F|B0-HR-F)-\d{3}|B0V4-V-\d{3}-[ABC]|B0V4-IFACE-\d{3}|B0V4-SUP-[A-Z]+-\d{3}/g;
function classifyToken(token, field) {
  if (token.startsWith('B0V4REQ-') && field === 'dependencies') return 'BUILD-DEPENDS-ON';
  if (token.startsWith('B0V4REQ-')) return 'NAMED-REQUIREMENT-REFERENCE';
  if (token.startsWith('B0V4OUT-')) return 'PRODUCES-OR-REFERENCES-OUTPUT';
  if (token.startsWith('B0V4-V-')) return 'COVERED-BY-VECTOR';
  if (token.startsWith('B0V3REQ-')) return 'PRESERVES-OR-CITES-V3-REQUIREMENT';
  if (token.startsWith('B0V2REQ-')) return 'PRESERVES-OR-CITES-V2-REQUIREMENT';
  if (token.startsWith('B0REQ-')) return 'PRESERVES-OR-CITES-ORIGINAL-REQUIREMENT';
  if (token.startsWith('B0V3-HR-F') || token.startsWith('B0V2-HR-F') || token.startsWith('B0-HR-F')) return 'ADDRESSES-OR-CITES-FINDING';
  if (token.startsWith('B0V4-IFACE-')) return 'USES-PRIOR-IMMUTABLE-INTERFACE';
  if (token.startsWith('B0V4-SUP-')) return 'APPLIES-TYPED-SUPERSESSION';
  return null;
}

const namedTokenUses = [];
const unclassifiedTokenUses = [];
for (const requirement of v4Requirements) {
  for (const [field, value] of Object.entries(requirement.fields)) {
    for (const match of value.matchAll(tokenPattern)) {
      const edgeClass = classifyToken(match[0], field);
      const row = {
        useId: `B0V4-USE-${canonicalSha({ source: requirement.id, field, token: match[0], ordinal: match.index }).slice(0, 24)}`,
        sourceRequirementId: requirement.id,
        field,
        targetToken: match[0],
        edgeClass,
        authorityCredit: 0,
      };
      if (edgeClass) namedTokenUses.push(row);
      else unclassifiedTokenUses.push(row);
    }
  }
}

const buildEdges = [];
for (const requirement of v4Requirements) {
  const sourceNumber = Number(requirement.id.slice(-3));
  for (const match of requirement.fields.dependencies.matchAll(/B0V4REQ-(\d{3})/g)) {
    const targetNumber = Number(match[1]);
    buildEdges.push({
      edgeId: `B0V4-BUILD-${pad(sourceNumber)}-${pad(targetNumber)}`,
      fromRequirement: requirement.id,
      toRequirement: `B0V4REQ-${pad(targetNumber)}`,
      direction: 'CONSUMER-TO-PRIOR-PRODUCER',
      backward: targetNumber < sourceNumber,
    });
  }
}

const crosswalk = {
  artifactId: 'CONNECT-B0-V4-LOSSLESS-CLOSURE-CROSSWALK-AND-NAMED-USE-GRAPH-2026-08-29-G0',
  artifactClass: 'IMMUTABLE-DETACHED-CROSSWALK;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE;NOT-CLOSURE',
  schemaVersion: 1,
  subjectSha256: subjectRoot,
  normativeRegistrySha256: registryRoot,
  sourceMemberSpanIndexSha256: sourceIndexRoot,
  crosswalks: {
    v3Findings: v3FindingRows,
    v3Requirements: v3RequirementRows,
    v2Requirements: v2RequirementRows,
    originalRequirements: originalRequirementRows,
    legacyFindings: legacyFindingRows,
    v2ReviewFindings: v2ReviewFindingRows,
  },
  namedUseGraph: {
    extractionRule: 'EVERY-MACHINE-ID-TOKEN-IN-EVERY-V4-FIVE-FIELD-ROW-IS-ONE-LITERAL-USE;NO-PROSE-EDGE-CREDIT',
    namedTokenUses,
    namedTokenUseCount: namedTokenUses.length,
    unclassifiedTokenUses,
    buildEdges,
    buildEdgeCount: buildEdges.length,
    hiddenV3CycleBreaks: cycleBreaks,
    cycleBreakCount: cycleBreaks.length,
    buildDagRule: 'EVERY-BUILD-EDGE-TARGET-NUMBER-IS-LOWER-THAN-SOURCE-NUMBER',
    priorInterfaceRule: 'EACH-HIDDEN-FORWARD-USE-IS-REPLACED-BY-ONE-PRIOR-IMMUTABLE-INTERFACE;NO-FORWARD-BUILD-EDGE',
  },
  exactDenominators: {
    v3Findings: 13,
    v3Requirements: 70,
    v2Requirements: 49,
    originalRequirements: 27,
    legacyFindings: 22,
    v2ReviewFindings: 21,
    typedSupersessions: 10,
    hiddenCycleBreaks: 17,
    closureTransfer: 0,
    acceptanceTransfer: 0,
  },
  currentState: 'CANDIDATE-MAPPINGS-MATERIALIZED;INDEPENDENT-CLOSURE=0;ACCEPTANCE=0;AUTHORITY=0',
};
write(OUTPUT.crosswalk, pretty(crosswalk));
const crosswalkRoot = sha(bytes(OUTPUT.crosswalk));

const newAttackScenarios = [
  ['finalize COMMITTED-UNCONFIRMED then reconcile', 'treat UNCERTAIN as immutable FinalResult', 'two reducers select old and new lifecycle interpretations'],
  ['authoritative source identity uses ABSOLUTE-MACHINE-LOCAL path kind', 'same repository-relative identity resolves different bytes', 'private local resolver mapping is promoted to authority'],
  ['G1 instantiates OperationalPermit', 'G1 skips the Permit reducer but claims parity', 'capability sink binding is replaced by external target class'],
  ['delete one literal NamedUse classification', 'hide a forward normative use only in prose', 'restore one legacy reverse pair and require cycle detection'],
  ['omit initial Approver Appointment from GenesisFoundation', 'substitute expected empty GenesisLedger head', 'use local default time in first GenesisPermit validation'],
  ['mutate PublicDisclosurePolicy without advancing its generated head', 'rotate WitnessPolicy without SecurityUniverse advance', 'change ValidatorIndependenceProfile through an unmapped class'],
  ['omit Approver from closed role universe', 'silently map AuthorityOwner to Approver', 'share EffectiveController between Approver and AcceptanceWriter'],
  ['allow two plausible operations for one vector identity', 'remove exact precondition root from vector row', 'remove one runner implementation root'],
  ['omit one literal Acceptance field', 'duplicate Approver exact-root receipt field', 'inject unknown authority-bearing extension field'],
  ['project a restricted runtime instance as full Public bytes', 'publish deterministic digest of private bytes', 'validate Output under stale egress-policy head'],
  ['commit Permit store while Acceptance pointer store fails', 'advance one security head between validation and CAS', 'order revocation and commit equally but let commit win'],
  ['reduce recovery threshold below three', 'share EffectiveController between two recovery custodians', 'replay old recovery quorum after atomic rotation'],
  ['omit D18-A2 Public decision from applicable directives', 'substitute stale control-sequence root', 'apply Protocol v1.5 retroactively as B0 authority'],
  ['reuse Producer QA from a predecessor root', 'declare success with one unresolved P1', 'automatically create a fourth successor round after epoch exhaustion'],
];

function slug(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'UNSPECIFIED-ATTACK';
}

function terminalFor(scenario, inheritedTerminal) {
  const lower = scenario.toLowerCase();
  if (lower.includes('response loss') || lower.includes('stale journal') || lower.includes('mixed store revision') || lower.includes('outage')) return 'UNCERTAIN';
  if (lower.includes('revoke') || lower.includes('revocation')) return 'REVOKED';
  if (lower.includes('collision')) return 'COLLISION';
  if (lower.includes('conflict') || lower.includes('aba') || lower.includes('concurrent pointer')) return 'CONFLICT';
  if (lower.includes('at-expiry')) return 'EXPIRED';
  if (lower.includes('partial effect') || lower.includes('mid-write') || lower.includes('cleanup failure')) return 'QUARANTINED';
  if (inheritedTerminal === 'REVOKED') return 'REVOKED';
  if (inheritedTerminal === 'REJECTED') return 'REJECTED';
  return 'BLOCKED';
}

const fixtureRows = [];
const vectorRows = [];
for (let requirementNumber = 0; requirementNumber < 84; requirementNumber += 1) {
  const requirement = v4Requirements[requirementNumber];
  let sourceAlias;
  let sourceLocator;
  let scenarioSet;
  let inheritedTerminal = 'BLOCKED';
  if (requirementNumber <= 12) {
    sourceAlias = 'B0V3RM';
    sourceLocator = `B0V3-HR-F${pad(requirementNumber + 1)}`;
    scenarioSet = newAttackScenarios[requirementNumber];
  } else if (requirementNumber === 13) {
    sourceAlias = 'B0V3R';
    sourceLocator = '§3.1.3';
    scenarioSet = newAttackScenarios[13];
  } else {
    const predecessorNumber = requirementNumber - 14;
    sourceAlias = 'B0V3';
    sourceLocator = `B0V3REQ-${pad(predecessorNumber)}`;
    const inherited = predecessorNumber < 49 ? v2VectorScenarios.get(predecessorNumber) : v3NewVectorScenarios.get(predecessorNumber);
    scenarioSet = inherited.scenarios;
    inheritedTerminal = inherited.terminal;
  }
  const sourceMember = member(sourceAlias, sourceLocator);
  for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
    const slot = ['A', 'B', 'C'][slotIndex];
    const vectorId = `B0V4-V-${pad(requirementNumber)}-${slot}`;
    const fixtureId = `B0V4-FIX-${pad(requirementNumber)}-${slot}`;
    const payload = {
      requirementId: requirement.id,
      outputId: `B0V4OUT-${pad(requirementNumber)}`,
      fields: requirement.fields,
      source: {
        alias: sourceAlias,
        locator: sourceLocator,
        artifactSha256: artifactByAlias.get(sourceAlias).sha256,
        memberSha256: sourceMember.sha256,
        startByteInclusive: sourceMember.startByteInclusive,
        endByteExclusive: sourceMember.endByteExclusive,
      },
      authorityCredit: 0,
      usableAuthority: 0,
      implementationState: 'NOT-IMPLEMENTED',
      acceptanceState: 'NOT-ACCEPTED',
      repositoryVisibility: 'PUBLIC',
      attack: null,
    };
    const fixtureBody = {
      fixtureId,
      fixtureClass: 'REAL-FROZEN-SOURCE-DERIVED-CANONICAL-REQUIREMENT-FIXTURE',
      sourceMemberSpanIndexSha256: sourceIndexRoot,
      sourceMemberSha256: sourceMember.sha256,
      payload,
      mockData: false,
      sampleData: false,
      syntheticBusinessData: false,
    };
    const fixtureRoot = canonicalSha(fixtureBody);
    const fixture = { ...fixtureBody, fixtureRoot };
    fixtureRows.push(fixture);
    const scenario = scenarioSet[slotIndex];
    const attack = {
      profileId: `B0V4-ATTACK-${pad(requirementNumber)}-${slot}`,
      sourceScenario: scenario,
      exactMutationIntent: `APPLY-NEGATIVE-CASE-TO-${requirement.id};NO-AUTHORITY;NO-EXTERNAL-EFFECT`,
      scheduleOrdinal: slotIndex + 1,
    };
    const program = [{ op: 'SET', path: '/attack', value: attack }];
    if (slot === 'A') program.push({ op: 'REMOVE', path: '/fields/requiredProof' });
    if (slot === 'B') program.push({ op: 'REPLACE', path: '/source/memberSha256', value: canonicalSha({ domain: 'B0V4-NEGATIVE-SOURCE-SUBSTITUTION', vectorId, original: sourceMember.sha256 }) });
    if (scenario.toLowerCase().includes('reconcile') || scenario.toLowerCase().includes('race') || scenario.toLowerCase().includes('response loss') || scenario.toLowerCase().includes('commit')) {
      program.push({ op: 'EVENT', event: { eventId: `B0V4-EVENT-${pad(requirementNumber)}-${slot}`, ordinal: 1, action: scenario } });
    }
    const precondition = {
      fixtureRoot,
      sourceMemberSha256: sourceMember.sha256,
      subjectSha256: subjectRoot,
      normativeRegistrySha256: registryRoot,
      authorityCredit: 0,
      requiredInitialAttackValue: null,
    };
    const expected = {
      terminalState: terminalFor(scenario, inheritedTerminal),
      reasonCode: `NEG-${slug(scenario)}`,
      usableAuthority: 0,
      postcondition: 'NO-CURRENT-POINTER;NO-EXTERNAL-EFFECT;NO-CLOSURE-CREDIT',
    };
    vectorRows.push({
      vectorId,
      requirementId: requirement.id,
      slot,
      fixtureId,
      fixtureRoot,
      fixtureMemberSha256: sourceMember.sha256,
      precondition,
      preconditionRoot: canonicalSha(precondition),
      program,
      programRoot: canonicalSha(program),
      runnerRoots: [sha(bytes(ENGINE_A)), sha(bytes(ENGINE_B))],
      evaluatorRoots: [sha(bytes(ENGINE_A)), sha(bytes(ENGINE_B))],
      expected,
      inheritedExpectedTerminalText: inheritedTerminal,
      observed: null,
      evidenceRoot: null,
      disposition: 'SPECIFIED;PLANNING-DSL-EXECUTION-PENDING-DETACHED-QA;OPERATIONAL-EXECUTION-ABSENT;NOT-ACCEPTED',
    });
  }
}

const vectorPack = {
  artifactId: 'CONNECT-B0-V4-EXECUTABLE-NEGATIVE-VECTOR-PROGRAM-PACK-2026-08-29-G0',
  artifactClass: 'IMMUTABLE-DETACHED-VECTOR-PROGRAM-AND-FIXTURE-PACK;PLANNING-ONLY;NOT-OPERATIONAL-EVIDENCE;NOT-AUTHORITY;NOT-ACCEPTANCE',
  schemaVersion: 1,
  subjectSha256: subjectRoot,
  normativeRegistrySha256: registryRoot,
  sourceMemberSpanIndexSha256: sourceIndexRoot,
  closureCrosswalkSha256: crosswalkRoot,
  dsl: registry.vectorProgramSchema,
  fixtureCount: fixtureRows.length,
  vectorCount: vectorRows.length,
  fixtures: fixtureRows,
  vectors: vectorRows,
  executionState: {
    planningDslEngineAReceipts: 'PENDING-DETACHED-QA',
    planningDslEngineBReceipts: 'PENDING-DETACHED-QA',
    operationalExecutionReceipts: '0/252',
    acceptedVectors: '0/252',
  },
  authorityCredit: 0,
};
write(OUTPUT.vectors, pretty(vectorPack));
const vectorPackRoot = sha(bytes(OUTPUT.vectors));

const packageMemberPaths = [OUTPUT.registry, OUTPUT.subject, OUTPUT.sourceIndex, OUTPUT.crosswalk, OUTPUT.vectors, GENERATOR, ENGINE_A, ENGINE_B];
const manifestMembers = packageMemberPaths.map((logicalPath, index) => {
  const memberBytes = bytes(logicalPath);
  return {
    ordinal: index + 1,
    logicalPath,
    sha256: sha(memberBytes),
    bytes: memberBytes.length,
    required: true,
    authorityCredit: 0,
  };
});
const manifest = {
  artifactId: 'CONNECT-B0-V4-ATOMIC-CANDIDATE-PACKAGE-MANIFEST-2026-08-29-G0',
  artifactClass: 'IMMUTABLE-ATOMIC-CANDIDATE-PACKAGE-MANIFEST;PLANNING-ONLY;NOT-AUTHORITY;NOT-ACCEPTANCE',
  schemaVersion: 1,
  packageSemantics: 'ALL-MEMBERS-REQUIRED;ANY-MISSING-OR-CHANGED-MEMBER-BLOCKS-THE-ENTIRE-CANDIDATE;NO-PARTIAL-CREDIT',
  memberCount: manifestMembers.length,
  members: manifestMembers,
  packageContentRoot: canonicalSha(manifestMembers.map((row) => ({ ordinal: row.ordinal, logicalPath: row.logicalPath, sha256: row.sha256, bytes: row.bytes }))),
  subjectSha256: subjectRoot,
  normativeRegistrySha256: registryRoot,
  sourceMemberSpanIndexSha256: sourceIndexRoot,
  closureCrosswalkSha256: crosswalkRoot,
  vectorProgramPackSha256: vectorPackRoot,
  producerQaMembership: 'DETACHED;MUST-REFERENCE-THIS-MANIFEST-ROOT;CANNOT-BE-A-MEMBER-WITHOUT-HASH-CYCLE',
  independentReviewMembership: 'DETACHED;ABSENT;MUST-REFERENCE-THIS-MANIFEST-ROOT',
  repositoryVisibility: 'PUBLIC',
  authorityCredit: 0,
  acceptanceCredit: 0,
  currentState: 'FROZEN-CANDIDATE-PACKAGE;PRODUCER-QA-PENDING;INDEPENDENT-REVIEW-PENDING;B0-ABSENT;GATE29-BLOCKED;FREEZE-ACTIVE',
};
write(OUTPUT.manifest, pretty(manifest));

const summary = {
  subjectSha256: subjectRoot,
  normativeRegistrySha256: registryRoot,
  sourceMemberSpanIndexSha256: sourceIndexRoot,
  closureCrosswalkSha256: crosswalkRoot,
  vectorProgramPackSha256: vectorPackRoot,
  atomicPackageManifestSha256: sha(bytes(OUTPUT.manifest)),
  requirements: 84,
  fields: 420,
  outputs: 84,
  vectors: vectorRows.length,
  fixtures: fixtureRows.length,
  sourceArtifacts: sourceIndex.artifacts.length,
  generatedHeads: heads.length,
  mutableObjectClasses: objectToHead.length,
  acceptanceFields: acceptanceFields.length,
  namedTokenUses: namedTokenUses.length,
  buildEdges: buildEdges.length,
};
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
