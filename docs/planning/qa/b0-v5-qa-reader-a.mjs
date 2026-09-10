#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = 'web/docs/planning';
const PATHS = {
  subject: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-2026-08-30.md`,
  registry: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-normative-registry-2026-08-30.json`,
  index: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-source-member-span-index-2026-08-30.json`,
  crosswalk: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-closure-crosswalk-2026-08-30.json`,
  vectors: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-executable-vector-corpus-2026-08-30.json`,
  manifest: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-atomic-package-manifest-2026-08-30.json`,
  report: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v5-qa-reader-a-report-2026-08-30.json`,
};
const EXPECTED_INPUTS = {
  [`${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-2026-08-29.md`]: '4a45fd1b9e2aeefefff28862676f5cfa7c87f5141d81edcf9691a908c7c8f0c9',
  [`${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-normative-registry-2026-08-29.json`]: '94a4d151425325e43832e57b2579e78bf7fa1e56bcdfda1ec704137eb53501d2',
  [`${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-source-member-span-index-2026-08-29.json`]: '641459c7a09b30eb0c5ea48359194b092f0d5d00109c7df3f43a3bf53030ad7a',
  [`${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-closure-crosswalk-2026-08-29.json`]: '24d3d90b404847d7a7ca5a457edf8117cca0f12a79cbc552eac8ef47d1763451',
  [`${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-executable-vector-programs-2026-08-29.json`]: 'a004e0dfed0e7741d5a1f9c02b7fa9a4efef644209ff730041aaf8cb819d9fbd',
  [`${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-atomic-package-manifest-2026-08-29.json`]: '8a782b55eb92768288a5f1d64e04f76869c4af739e1e2f997a257c34c65709ad',
  [`${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-independent-hostile-review-2026-08-30.md`]: '04911c4607c08ccd3763b4ac9ccf08e20722a0dfe321f1c94e6832b599bf9d83',
  [`${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-independent-hostile-review-findings-manifest-2026-08-30.md`]: '409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed',
};

const raw = (path) => readFileSync(resolve(path));
const utf8 = (path) => raw(path).toString('utf8');
const hash = (value) => createHash('sha256').update(value).digest('hex');
function orderedJson(value) {
  if (Array.isArray(value)) return `[${value.map(orderedJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${orderedJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const rooted = (domain, value) => hash(Buffer.from(`${domain}\n${orderedJson(value)}`, 'utf8'));
const parseJson = (path) => JSON.parse(utf8(path));
const registry = parseJson(PATHS.registry);
const index = parseJson(PATHS.index);
const crosswalk = parseJson(PATHS.crosswalk);
const corpus = parseJson(PATHS.vectors);
const manifest = parseJson(PATHS.manifest);
const subjectText = utf8(PATHS.subject);
const proofClasses = ['PARSER', 'SERIALIZER', 'GRAPH', 'SIGNATURE', 'TIME', 'ENVELOPE', 'STATE-REDUCER', 'VECTOR-RUNNER', 'READBACK'];

function parseRequirements(sourceText, prefix) {
  const pattern = new RegExp('^## \\d+\\.\\d+ `' + prefix + '-(\\d{3})` — (.+)$', 'gm');
  const headings = [...sourceText.matchAll(pattern)];
  return headings.map((heading, indexNumber) => {
    const block = sourceText.slice(heading.index, indexNumber + 1 < headings.length ? headings[indexNumber + 1].index : sourceText.length);
    const fields = {};
    for (const name of ['statement', 'threatCauseImpact', 'requiredProof', 'dependencies', 'sourceBasis']) {
      const match = block.match(new RegExp('`' + name + '`: ([^\\n]+)'));
      if (!match) throw new Error(`Missing ${name} in ${prefix}-${heading[1]}`);
      fields[name] = match[1];
    }
    return { id: `${prefix}-${heading[1]}`, fields };
  });
}

function packageRoot(domain, members) {
  const projection = members.map(({ ordinal, logicalPath, sha256, bytes, required }) => ({ ordinal, logicalPath, sha256, bytes, required }));
  return hash(Buffer.from(`${domain}\n${orderedJson(projection)}`, 'utf8'));
}

function assignPointer(document, pointer, value) {
  const components = pointer.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
  let cursor = document;
  for (let indexNumber = 0; indexNumber < components.length - 1; indexNumber += 1) cursor = cursor[components[indexNumber]];
  cursor[components.at(-1)] = JSON.parse(JSON.stringify(value));
}

function mutate(state, operations) {
  const result = JSON.parse(JSON.stringify(state));
  for (const operation of operations) {
    if (operation.op !== 'SET') throw new Error(`Unknown operation ${operation.op}`);
    assignPointer(result, operation.path, operation.value);
  }
  return result;
}

const oracleReaders = {
  'SOURCE-MEMBER-IDENTITY': (state) => {
    const data = Buffer.from(state.memberBytesBase64, 'base64');
    const decoded = data.toString('utf8');
    return data.length > 1 && data.length === state.endByteExclusive - state.startByteInclusive && hash(data) === state.memberSha256 && decoded.includes(`\`${state.locator}\``) && state.requiredFieldLabels.every((field) => decoded.includes(`\`${field}\``));
  },
  'TYPED-SUPERSESSION-LITERAL': (state) => {
    const source = Buffer.from(state.sourceMemberBytesBase64, 'base64');
    const atom = Buffer.from(state.oldAtomBytesBase64, 'base64');
    const selected = source.subarray(state.oldAtomStartByteWithinMember, state.oldAtomEndByteWithinMember);
    return state.locatorResolvable === true && hash(source) === state.sourceMemberSha256 && state.oldAtomEndByteWithinMember - state.oldAtomStartByteWithinMember === atom.length && selected.equals(atom) && source.indexOf(atom, state.oldAtomStartByteWithinMember + 1) === -1;
  },
  'LOCATOR-RESOLUTION': (state) => {
    const data = Buffer.from(state.memberBytesBase64, 'base64');
    return state.resolves === true && state.locator === state.expectedLocator && state.logicalPath.startsWith('web/') && !state.logicalPath.includes('..') && !state.logicalPath.startsWith('/') && hash(data) === state.memberSha256 && data.length === state.endByteExclusive - state.startByteInclusive;
  },
  'SEMANTIC-INTERFACE': (state) => {
    const body = { ...state.interface };
    const declared = body.instanceRoot;
    delete body.instanceRoot;
    return Boolean(body.consumerClass && body.providerClass && body.inputRoot && body.outputRoot && body.validationPredicate && body.validationPredicateRoot)
      && rooted('CONNECT-B0-V5-PRIOR-INTERFACE-V1', body) === declared
      && state.edges.some((edge) => edge.edgeClass === 'CONSUMES-PRIOR-INTERFACE' && edge.source === body.consumerRequirement && edge.target === body.interfaceId)
      && state.edges.some((edge) => edge.edgeClass === 'IMPLEMENTS-PRIOR-INTERFACE' && edge.source === body.providerRequirement && edge.target === body.interfaceId)
      && state.citationEdgeClass === 'CITES-SOURCE-MEMBER' && !state.semanticEdgeClasses.includes(state.citationEdgeClass);
  },
  'MUTABLE-HEAD-DAG': (state) => {
    const classNames = state.objectToHead.map((row) => row.objectClass);
    const heads = new Set(state.headIds);
    return classNames.length === 94 && new Set(classNames).size === 94 && state.headIds.length === 36 && heads.size === 36 && state.objectToHead.every((row) => heads.has(row.headId) && row.membershipPath.length === 2 && row.membershipPath[0].sourceNode !== row.membershipPath[0].targetNode && row.membershipPath[1].sourceNode !== row.membershipPath[1].targetNode && row.membershipPath[0].targetNode === row.membershipPath[1].sourceNode && row.membershipPath[1].targetNode === 'Head:SecurityUniverseHead');
  },
  'VECTOR-CAUSAL-SPEC': (state) => {
    const data = Buffer.from(state.fixtureBytesBase64, 'base64');
    return hash(data) === state.fixtureSha256 && state.operationPaths.some((path) => state.oracleReadPaths.includes(path)) && state.oracleKind !== 'STORED-EXPECTED' && state.storedExpectedUsedAsOracleInput === false && state.controlDecision === 'ELIGIBLE' && state.mutationDecision === 'BLOCKED';
  },
  'ACCEPTANCE-PERMIT-FIELDS': (state) => state.requiredAcceptanceNames.every((name) => state.acceptanceFieldNames.includes(name)) && state.requiredPermitNames.every((name) => state.permitFieldNames.includes(name)) && state.values.notBefore <= state.values.trustedNow && state.values.trustedNow < state.values.validThrough && state.values.attemptUsed === false && state.values.providedFence >= state.values.currentFence && state.values.expectedPermitHead === state.values.currentPermitHead && state.values.expectedRevocationHead === state.values.currentRevocationHead,
  'WITNESS-INDEPENDENCE': (state) => state.witnesses.length === 2 && state.witnesses[0].controller !== state.witnesses[1].controller && state.witnesses[0].checkpointRoot === state.witnesses[1].checkpointRoot && state.witnesses.every((witness) => witness.acknowledgementRoot) && state.profiles.length === 9 && new Set(state.profiles.map((profile) => profile.proofClass)).size === 9 && proofClasses.every((proofClass) => state.profiles.some((profile) => profile.proofClass === proofClass)) && state.profiles.every((profile) => profile.implementationRootA !== profile.implementationRootB && profile.dependencyRootA !== profile.dependencyRootB && profile.runtimeRootA !== profile.runtimeRootB && profile.controllerRootA !== profile.controllerRootB),
  'ACCEPTANCE-CAS': (state) => state.expectedPointerVersion === state.currentPointerVersion && state.expectedPointerRoot === state.currentPointerRoot && state.attemptUsed === false && state.providedFence >= state.currentFence && state.commitRevision > state.revocationRevision && state.notBefore <= state.trustedNow && state.trustedNow < state.validThrough && !(state.responseLost && state.retryEffectRequested),
  'GENESIS-CAUSALITY': (state) => {
    const ids = new Set(state.memberSlots.map((member) => member.memberId));
    return state.memberSlots.length === state.expectedMemberCount && ids.size === state.expectedMemberCount && state.memberSlots.every((member) => member.slotSchemaRoot && member.currentInstanceRoot === null) && state.externalIssuerClass === 'EXTERNAL-L0-QUORUM-PREEXISTING-B0' && state.validatorProfileIds.length === 2 && new Set(state.validatorProfileIds).size === 2 && state.firstPermitPrerequisiteMemberIds.every((id) => ids.has(id)) && state.createsOwnPrerequisite === false;
  },
  'RECOVERY-QUORUM': (state) => {
    const all = [...state.memberControllers, ...state.witnessControllers];
    return state.memberControllers.length === 5 && new Set(state.memberControllers).size === 5 && state.witnessControllers.length === 2 && new Set(all).size === 7 && all.every((controller) => !state.excludedRoleControllers.includes(controller)) && state.excludedRoleControllers.includes('AuthorityOwner') && new Set(state.signingMemberIds).size >= state.threshold && state.attemptUsed === false && state.sameChallenge === true;
  },
  'PACKAGE-CONTENT-ROOT': (state) => state.domain === 'CONNECT-B0-V5-PACKAGE-CONTENT-V1' && state.members.every((member, indexNumber) => member.ordinal === indexNumber + 1) && new Set(state.members.map((member) => member.logicalPath)).size === state.members.length && packageRoot(state.domain, state.members) === state.declaredRoot,
  'INHERITED-ATOM': (state) => {
    const source = Buffer.from(state.sourceValueBase64, 'base64');
    const stored = Buffer.from(state.storedValueBase64, 'base64');
    const disposition = state.disposition === 'ACTIVE-INHERITED-MANDATORY-CONJUNCT' || (state.disposition.includes('SUPERSEDED') && state.replacementIds.length > 0);
    return source.equals(stored) && hash(stored) === state.storedValueSha256 && disposition;
  },
};

const checks = [];
function runCheck(name, predicate) {
  try {
    const detail = predicate();
    if (detail === false) throw new Error('predicate returned false');
    checks.push({ name, state: 'PASS', detail: typeof detail === 'string' ? detail : 'verified' });
  } catch (error) {
    checks.push({ name, state: 'FAIL', detail: error.message });
  }
}

runCheck('frozen-input-roots', () => {
  for (const [path, expected] of Object.entries(EXPECTED_INPUTS)) if (hash(raw(path)) !== expected) throw new Error(path);
  return `${Object.keys(EXPECTED_INPUTS).length}/${Object.keys(EXPECTED_INPUTS).length}`;
});
runCheck('atomic-member-hashes-and-package-root', () => {
  if (manifest.memberCount !== 8 || manifest.members.length !== 8) return false;
  for (const member of manifest.members) if (hash(raw(member.logicalPath)) !== member.sha256 || raw(member.logicalPath).length !== member.bytes) throw new Error(member.logicalPath);
  if (manifest.packageContentRoot !== packageRoot(manifest.packageContentRootAlgorithm.domainUtf8, manifest.members)) return false;
  const preimage = Buffer.from(manifest.packageRootPreimageBase64, 'base64');
  return hash(preimage) === manifest.packageContentRoot;
});
runCheck('cross-root-bindings', () => manifest.subjectSha256 === hash(raw(PATHS.subject)) && manifest.normativeRegistrySha256 === hash(raw(PATHS.registry)) && manifest.sourceMemberSpanIndexSha256 === hash(raw(PATHS.index)) && manifest.closureCrosswalkSha256 === hash(raw(PATHS.crosswalk)) && manifest.executableVectorCorpusSha256 === hash(raw(PATHS.vectors)));
runCheck('requirements-and-five-fields', () => {
  const requirements = parseRequirements(subjectText, 'B0V5REQ');
  return requirements.length === 96 && requirements.every((requirement, indexNumber) => requirement.id === `B0V5REQ-${String(indexNumber).padStart(3, '0')}` && Object.keys(requirement.fields).length === 5);
});
runCheck('non-merged-finding-replacements', () => registry.replacementRegistry.length === 12 && crosswalk.hostileFindingClosureRows.length === 12 && new Set(registry.replacementRegistry.map((row) => row.findingId)).size === 12 && new Set(registry.replacementRegistry.map((row) => row.noMergeKey)).size === 12 && registry.replacementRegistry.every((row) => row.oldMembers.length > 0 && row.oldMembers.every((member) => member.disposition.startsWith('SUPERSEDED'))));
runCheck('literal-atom-supersessions', () => registry.exactAtomSupersessions.length === 10 && registry.exactAtomSupersessions.every((row) => {
  const data = raw(row.sourceMember.logicalPath).subarray(row.sourceMember.startByteInclusive, row.sourceMember.endByteExclusive);
  const atom = Buffer.from(row.oldAtomUtf8Base64, 'base64');
  return hash(data) === row.sourceMember.memberSha256 && hash(atom) === row.oldAtomSha256 && data.subarray(row.oldAtomStartByteWithinMember, row.oldAtomEndByteWithinMember).equals(atom) && data.indexOf(atom, row.oldAtomStartByteWithinMember + 1) === -1;
}));
runCheck('source-index-artifacts-and-member-spans', () => {
  let total = 0;
  for (const artifact of index.artifacts) {
    if (!artifact.logicalPath.startsWith('web/') || artifact.logicalPath.includes('..') || artifact.logicalPath.startsWith('/')) throw new Error(artifact.logicalPath);
    const data = raw(artifact.logicalPath);
    if (hash(data) !== artifact.sha256 || data.length !== artifact.bytes) throw new Error(artifact.alias);
    const locators = new Set();
    for (const member of artifact.members) {
      if (locators.has(member.locator)) throw new Error(`${artifact.alias}:${member.locator}`);
      locators.add(member.locator);
      const selected = data.subarray(member.startByteInclusive, member.endByteExclusive);
      if (selected.length !== member.byteLength || hash(selected) !== member.sha256) throw new Error(`${artifact.alias}:${member.locator}`);
      if (/^(B0V4REQ|B0V3REQ|B0V2REQ|B0REQ|B0V4-HR-F)/.test(member.locator) && !member.locator.includes('.') && selected.length <= 1) throw new Error(`collapsed:${artifact.alias}:${member.locator}`);
      total += 1;
    }
  }
  return total === index.memberCount ? `${total}/${index.memberCount}` : false;
});
runCheck('inherited-v4-requirements-and-fields', () => crosswalk.inheritedV4Requirements.length === 84 && crosswalk.inheritedV4Requirements.flatMap((row) => row.fields).length === 420 && crosswalk.inheritedV4Requirements.every((row) => row.fields.every((field) => {
  const exactValueBytes = Buffer.from(field.exactOldValue, 'utf8');
  const sourceFieldBytes = raw(field.sourceField.logicalPath).subarray(field.sourceField.startByteInclusive, field.sourceField.endByteExclusive);
  return Buffer.from(field.exactOldValueUtf8Base64, 'base64').equals(exactValueBytes)
    && sourceFieldBytes.equals(exactValueBytes)
    && hash(sourceFieldBytes) === field.sourceField.memberSha256
    && hash(exactValueBytes) === field.exactOldValueSha256
    && field.supersededAtomSelectors.every((selector) => {
      const atom = Buffer.from(selector.exactOldAtomUtf8Base64, 'base64');
      return atom.length > 0
        && exactValueBytes.subarray(selector.startByteWithinField, selector.endByteWithinField).equals(atom)
        && atom.toString('utf8') === selector.exactOldAtom
        && hash(atom) === selector.exactOldAtomSha256
        && field.replacementIds.includes(selector.replacementId)
        && selector.disposition.startsWith('SUPERSEDED');
    });
})));
runCheck('all-inherited-source-references-resolve', () => crosswalk.inheritedSourceReferenceResolution.unresolved.length === 0 && crosswalk.inheritedSourceReferenceResolution.referenceCount === crosswalk.inheritedSourceReferenceResolution.resolvedCount && crosswalk.inheritedSourceReferenceResolution.references.every((row) => row.state === 'RESOLVED-EXACT'));
runCheck('named-use-and-interface-instances', () => registry.priorInterfaceRegistry.interfaces.length === 17 && crosswalk.namedUseGraph.priorInterfaces.length === 17 && crosswalk.namedUseGraph.unclassifiedMarkerUses.length === 0 && crosswalk.namedUseGraph.priorInterfaces.every((row) => row.consumerUseCount === 1 && row.providerImplementationCount === 1) && !crosswalk.namedUseGraph.semanticUseEdgeClasses.includes(crosswalk.namedUseGraph.citationEdgeClass) && crosswalk.namedUseGraph.buildEdges.every((edge) => Number(edge.targetRequirementId.slice(-3)) < Number(edge.sourceRequirementId.slice(-3))));
runCheck('closed-mutable-head-map', () => registry.mutableHeadRegistry.objectClassCount === 94 && registry.mutableHeadRegistry.generatedHeadCount === 36 && oracleReaders['MUTABLE-HEAD-DAG']({ headIds: registry.mutableHeadRegistry.heads.map((head) => head.headId), objectToHead: registry.mutableHeadRegistry.objectToHead }));
runCheck('acceptance-permit-field-closure', () => registry.permitSchemas.length === 3 && new Set(registry.permitSchemas.map((schema) => schema.permitType)).size === 3 && registry.acceptanceFieldRegistry.fieldCount === registry.acceptanceFieldRegistry.fields.length && registry.acceptanceFieldRegistry.requiredCausalFieldNames.every((name) => registry.acceptanceFieldRegistry.fields.some((field) => field.name === name)));
runCheck('witness-and-nine-class-independence', () => registry.independenceProfileRegistry.length === 9 && new Set(registry.independenceProfileRegistry.map((profile) => profile.proofClass)).size === 9 && proofClasses.every((proofClass) => registry.independenceProfileRegistry.some((profile) => profile.proofClass === proofClass)) && ['witness1AcknowledgementRoot', 'witness2AcknowledgementRoot', 'witnessCommonCheckpointRoot'].every((name) => registry.acceptanceFieldRegistry.fields.some((field) => field.name === name)));
runCheck('genesis-schema-and-first-permit', () => registry.genesisFoundation.memberSlotCount === registry.genesisFoundation.memberSlots.length && registry.genesisFoundation.memberSlots.length === 33 && registry.genesisFoundation.memberSlots.every((slot) => slot.slotSchemaRoot && slot.currentInstanceRoot === null) && registry.genesisFoundation.externalCeremonySchema.currentReceiptRoot === null && registry.genesisFoundation.currentFoundationInstanceRoot === null && registry.genesisFoundation.createsOwnPrerequisite === false);
runCheck('acceptance-cas-compare-order-and-recovery', () => {
  const operations = registry.acceptanceCas.orderedTransaction.map((step) => step.op);
  return ['COMPARE-EXPECTED-ACCEPTANCE-POINTER-VERSION-AND-ROOT', 'COMPARE-EXPECTED-PERMIT-LEDGER-HEAD-AND-UNUSED-PERMIT-ID', 'COMPARE-EXPECTED-REVOCATION-HEAD-AUTHORITY-REVISION-AND-FENCING-TOKEN', 'RESERVE-UNIQUE-DETERMINISTIC-ATTEMPT-ID-AND-ADVANCE-FENCE', 'COMMIT-DURABLY'].every((operation) => operations.includes(operation)) && registry.acceptanceCas.responseLossRecovery.rule.includes('NEVER-RETRY-EFFECT');
});
runCheck('recovery-quorum-and-role-separation', () => registry.recoveryQuorum.memberSlots.length === 5 && registry.recoveryQuorum.witnessSlots.length === 2 && registry.recoveryQuorum.threshold === 3 && registry.recoveryQuorum.controllerExclusionRoles.length === 8 && registry.recoveryQuorum.controllerExclusionRoles.includes('AuthorityOwner') && registry.roleUniverse.pairMatrix.length === 28);
runCheck('directive-head-and-bounded-convergence', () => registry.directiveUniverse.directiveCount === registry.directiveUniverse.directives.length && registry.directiveUniverse.directives.every((directive) => directive.currentHeadId === 'B0V5-HEAD-07') && registry.convergencePolicy.maximumSuccessorRoundsPerReviewEpoch === 3 && registry.convergencePolicy.automaticRecursionAllowed === false);
runCheck('public-output-and-zero-state', () => registry.outputRegistry.length === 96 && registry.outputRegistry.every((output) => output.repositoryVisibility === 'PUBLIC' && output.implementationRoot === null && output.acceptanceCredit === 0) && registry.currentAuthorityState.acceptedRequirementCount === '0/96' && registry.currentAuthorityState.operationalVectorExecutionCount === '0/288' && registry.currentAuthorityState.Gate29 === 'BLOCKED');

let vectorPassCount = 0;
runCheck('causal-vector-corpus', () => {
  if (corpus.fixtureCount !== 288 || corpus.vectorCount !== 288 || corpus.fixtures.length !== 288 || corpus.vectors.length !== 288) return false;
  const fixtures = new Map(corpus.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  for (const vector of corpus.vectors) {
    const fixture = fixtures.get(vector.fixtureId);
    const encoded = Buffer.from(fixture.fixtureBytesBase64, 'base64');
    if (encoded.toString('utf8') !== orderedJson(fixture.fixtureDocument) || hash(encoded) !== fixture.fixtureSha256 || fixture.fixtureSha256 !== vector.fixtureSha256) throw new Error(`${vector.vectorId}:fixture`);
    const reader = oracleReaders[vector.program.oracle.kind];
    if (!reader || vector.program.oracle.storedExpectedValueIsOracleInput !== false) throw new Error(`${vector.vectorId}:oracle`);
    if (!reader(fixture.fixtureDocument.domainState)) throw new Error(`${vector.vectorId}:control`);
    if (reader(mutate(fixture.fixtureDocument.domainState, vector.program.operations))) throw new Error(`${vector.vectorId}:mutation`);
    if (vector.expected.controlDecision !== 'ELIGIBLE' || vector.expected.mutationDecision !== 'BLOCKED' || vector.expected.usableAuthority !== 0) throw new Error(`${vector.vectorId}:expected`);
    if (vector.programRoot !== rooted('CONNECT-B0-V5-VECTOR-PROGRAM-V1', vector.program)) throw new Error(`${vector.vectorId}:program-root`);
    vectorPassCount += 1;
  }
  return `${vectorPassCount}/288`;
});
runCheck('public-package-path-and-sensitive-projection-scan', () => {
  for (const path of [PATHS.subject, PATHS.registry, PATHS.index, PATHS.crosswalk, PATHS.vectors, PATHS.manifest]) {
    const value = utf8(path);
    if (value.includes('/Users/') || value.includes('file://')) throw new Error(path);
  }
  return 'no-machine-local-public-paths';
});

const failures = checks.filter((check) => check.state === 'FAIL');
const report = {
  artifactId: 'CONNECT-B0-V5-INDEPENDENTLY-IMPLEMENTED-QA-READER-A-REPORT-2026-08-30-G0',
  artifactClass: 'DETACHED-PRODUCER-QA-READER-REPORT;PLANNING-MECHANICAL-EVIDENCE-ONLY;NOT-INDEPENDENT-HOSTILE-REVIEW;NOT-AUTHORITY;NOT-ACCEPTANCE',
  readerLanguage: 'JAVASCRIPT-NODE-BUILTINS-ONLY',
  atomicPackageManifestSha256: hash(raw(PATHS.manifest)),
  packageContentRoot: manifest.packageContentRoot,
  checkCount: checks.length,
  passedCheckCount: checks.length - failures.length,
  failedCheckCount: failures.length,
  planningDslVectorPassCount: vectorPassCount,
  operationalVectorExecutionCount: 0,
  independentlyClosedFindingCount: '0/12',
  acceptedRequirementCount: '0/96',
  Gate29: 'BLOCKED',
  verdict: failures.length === 0 ? 'MECHANICAL-PASS' : 'MECHANICAL-FAIL',
  checks,
  authorityCredit: 0,
  acceptanceCredit: 0,
};
writeFileSync(resolve(PATHS.report), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ verdict: report.verdict, passed: report.passedCheckCount, checks: report.checkCount, vectors: vectorPassCount })}\n`);
if (failures.length) process.exitCode = 1;
