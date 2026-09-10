#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workspaceRoot = process.cwd();
const webRoot = path.join(workspaceRoot, 'web');
const manifestLogicalPath = 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-atomic-package-manifest-2026-08-30.json';
const registrySuffix = '-v7-normative-registry-2026-08-30.json';
const sourceIndexSuffix = '-v7-frozen-source-index-2026-08-30.json';
const tempRootArgument = process.argv.find((argument) => argument.startsWith('--temp-root='));
const tempRoot = tempRootArgument
  ? tempRootArgument.slice('--temp-root='.length)
  : '/private/tmp/connect-b0-v7-independent-hostile-review-2026-08-30';
if (!tempRoot.startsWith('/private/tmp/connect-b0-v7-independent-hostile-review-')) {
  throw new Error('temp root must use the exact hostile-review prefix under /private/tmp');
}
const readerA = path.join(webRoot, 'docs/planning/qa/b0-v7-qa-reader-a.mjs');
const readerB = path.join(webRoot, 'docs/planning/qa/b0-v7-qa-reader-b.py');

function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('non-safe-integer');
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  throw new Error(`unsupported canonical type ${typeof value}`);
}

function shaBytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function rooted(domain, value) {
  return shaBytes(Buffer.from(`${domain}\n${canonical(value)}`, 'utf8'));
}

function withoutKey(value, key) {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
}

function pretty(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function originalBytes(logicalPath) {
  return fs.readFileSync(path.join(webRoot, logicalPath));
}

function originalJson(logicalPath) {
  return JSON.parse(originalBytes(logicalPath).toString('utf8'));
}

const baselineManifest = originalJson(manifestLogicalPath);
const registryLogicalPath = baselineManifest.members.find((member) => member.logicalPath.endsWith(registrySuffix)).logicalPath;
const sourceIndexLogicalPath = baselineManifest.members.find((member) => member.logicalPath.endsWith(sourceIndexSuffix)).logicalPath;
const baselineSourceIndex = originalJson(sourceIndexLogicalPath);
const allReferencedPaths = [...new Set([
  ...baselineManifest.members.map((member) => member.logicalPath),
  ...baselineSourceIndex.sources.map((source) => source.logicalPath),
])];

function refreshRegistryRoot(registry) {
  registry.registryContentRoot = rooted('B0V7-NORMATIVE-REGISTRY-V1', withoutKey(registry, 'registryContentRoot'));
}

function refreshSourceIndexRoots(sourceIndex) {
  sourceIndex.sourceSetRoot = rooted('B0V7-FROZEN-SOURCE-SET-V1', sourceIndex.sources.map(({ ordinal, logicalPath, sha256, bytes, sourceClass }) => ({ ordinal, logicalPath, sha256, bytes, sourceClass })));
  sourceIndex.indexContentRoot = rooted('B0V7-FROZEN-SOURCE-INDEX-V1', withoutKey(sourceIndex, 'indexContentRoot'));
}

function refreshManifest(manifest, overrides) {
  for (const [logicalPath, bytes] of overrides.entries()) {
    const member = manifest.members.find((entry) => entry.logicalPath === logicalPath);
    if (!member) throw new Error(`override is not a package member: ${logicalPath}`);
    member.bytes = bytes.length;
    member.sha256 = shaBytes(bytes);
  }
  manifest.memberCount = manifest.members.length;
  manifest.requiredMemberCount = manifest.members.filter((member) => member.required).length;
  manifest.largestMemberBytes = Math.max(...manifest.members.map((member) => member.bytes));
  manifest.everyMemberBelowMaximum = manifest.members.every((member) => member.bytes < manifest.maximumPublicGitMemberBytesExclusive);
  const projection = manifest.members.map(({ ordinal, logicalPath, sha256, bytes, required }) => ({ ordinal, logicalPath, sha256, bytes, required }));
  manifest.packageContentRoot = rooted('B0V7-PACKAGE-CONTENT-ROOT-V1', projection);
  manifest.manifestProjectionRoot = rooted('B0V7-MANIFEST-PROJECTION-V1', {
    members: projection,
    packageContentRoot: manifest.packageContentRoot,
    rootAlgorithm: manifest.rootAlgorithm,
  });
}

function materializeCase(caseId, mutate) {
  const caseRoot = path.join(tempRoot, caseId);
  if (fs.existsSync(caseRoot)) throw new Error(`deterministic case path already exists: ${caseRoot}`);
  fs.mkdirSync(caseRoot, { recursive: true });
  const manifest = structuredClone(baselineManifest);
  const registry = originalJson(registryLogicalPath);
  const sourceIndex = originalJson(sourceIndexLogicalPath);
  const overrides = new Map();
  mutate({ manifest, registry, sourceIndex, overrides });
  if (overrides.has(registryLogicalPath)) throw new Error('mutation must edit registry object, not raw override');
  if (overrides.has(sourceIndexLogicalPath)) throw new Error('mutation must edit source index object, not raw override');
  refreshRegistryRoot(registry);
  refreshSourceIndexRoots(sourceIndex);
  overrides.set(registryLogicalPath, Buffer.from(pretty(registry), 'utf8'));
  overrides.set(sourceIndexLogicalPath, Buffer.from(pretty(sourceIndex), 'utf8'));
  refreshManifest(manifest, overrides);

  for (const logicalPath of allReferencedPaths) {
    const destination = path.join(caseRoot, logicalPath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const override = overrides.get(logicalPath);
    if (override) fs.writeFileSync(destination, override, { flag: 'wx' });
    else fs.symlinkSync(path.join(webRoot, logicalPath), destination);
  }
  const manifestPath = path.join(caseRoot, manifestLogicalPath);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, pretty(manifest), { flag: 'wx' });
  return { caseRoot, manifest };
}

function runReader(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 120000 });
  let parsed = null;
  try { parsed = JSON.parse(result.stdout); } catch { parsed = null; }
  return {
    exitCode: result.status,
    verdict: parsed?.facts?.verdict ?? null,
    memberCount: parsed?.facts?.memberCount ?? null,
    globalConjunctCount: parsed?.facts?.globalConjunctCount ?? null,
    stderrFirstLine: result.stderr.trim().split('\n')[0] || null,
  };
}

function execute(caseId, mutate) {
  const { caseRoot, manifest } = materializeCase(caseId, mutate);
  const manifestArgument = `--manifest=${manifestLogicalPath}`;
  return {
    caseId,
    mutatedManifestSha256: shaBytes(fs.readFileSync(path.join(caseRoot, manifestLogicalPath))),
    mutatedPackageContentRoot: manifest.packageContentRoot,
    readerA: runReader(process.execPath, [readerA, manifestArgument], caseRoot),
    readerB: runReader('python3', [readerB, manifestArgument], caseRoot),
  };
}

if (fs.existsSync(tempRoot)) throw new Error(`deterministic temp root already exists: ${tempRoot}`);
fs.mkdirSync(tempRoot, { recursive: false });

const cases = [
  execute('01-symlink-contained-paths', () => {}),
  execute('02-detached-schema-metadata', ({ registry }) => {
    registry.detachedAcceptance.externalSchema.additionalProperties = true;
    registry.detachedAcceptance.externalSchema.requiredFieldCount = 0;
    registry.detachedAcceptance.internalSchema.fields[0].nullable = true;
  }),
  execute('03-authority-role-collapse', ({ registry }) => {
    const first = registry.authorityBootstrap.roles[0];
    for (const role of registry.authorityBootstrap.roles) {
      role.controllerId = first.controllerId;
      role.controllerRoot = first.controllerRoot;
      role.appointmentAuthority = role.roleId;
    }
  }),
  execute('04-cas-declaration-without-durable-writes', ({ registry }) => {
    registry.casStateMachine.crashModel = 'NO-CRASH-SEMANTICS';
    registry.casStateMachine.responseLossRecovery = 'NONE';
    registry.casStateMachine.steps[14].durability = 'READ-ONLY';
    registry.casStateMachine.steps[14].writes = [];
  }),
  execute('05-recovery-duplicate-acknowledgements', ({ registry }) => {
    const acknowledgement = structuredClone(registry.recoveryReducer.planningPositiveState.attempt.acknowledgements[0]);
    registry.recoveryReducer.planningPositiveState.attempt.acknowledgements = [structuredClone(acknowledgement), structuredClone(acknowledgement), structuredClone(acknowledgement)];
  }),
  execute('06-recovery-atomicity-rule-disabled', ({ registry }) => {
    registry.recoveryReducer.atomicityRule = 'NO-ATOMICITY;NO-DURABLE-RECOVERY';
  }),
  execute('07-global-zero-conjuncts', ({ registry }) => {
    registry.globalModel.predicateIds = [];
    registry.globalModel.conjunctCount = 0;
    registry.globalModel.currentRealStateSeparate = false;
    registry.globalModel.mutationRule = 'NO-SEMANTIC-MUTATIONS';
    registry.globalModel.planningPositiveModelRoot = '0'.repeat(64);
  }),
  execute('08-interface-policy-reversal', ({ registry }) => {
    for (const expected of registry.expectedInterfaces) {
      expected.commonSourceDerivationAllowed = true;
      expected.frozenBeforeActualProducer = false;
      expected.futureProviderReadAllowed = true;
    }
    registry.actualInterfaceEvidenceBinding.expectedValueDependency = 'EXPECTED-VALUE-TABLE';
    registry.actualInterfaceEvidenceBinding.futureProviderDependency = 'FUTURE-PROVIDER';
  }),
  execute('09-source-receipt-counter-reversal', ({ sourceIndex }) => {
    sourceIndex.sourceCount = 0;
    sourceIndex.predecessorPackageMemberCount = 0;
    sourceIndex.predecessorPackageMemberByteCoverage = 'NONE';
    sourceIndex.locatorPolicy = 'ABSOLUTE-AND-SYMLINK-LOCATORS-ALLOWED';
    sourceIndex.repositoryRootDefinition = 'UNTRUSTED-CURRENT-WORKING-DIRECTORY';
  }),
  execute('10-public-top-level-private', ({ registry, manifest }) => {
    registry.repositoryVisibility = 'PRIVATE';
    manifest.currentState.repositoryVisibility = 'PRIVATE';
  }),
  execute('11-predecessor-non-weakening-disabled', ({ registry }) => {
    registry.predecessorSemanticNonWeakening.activeIdentityCount = 0;
    registry.predecessorSemanticNonWeakening.exactByteVerificationRequired = false;
    registry.predecessorSemanticNonWeakening.mergeCreditAllowed = true;
    registry.predecessorSemanticNonWeakening.rangeCreditAllowed = true;
    registry.predecessorSemanticNonWeakening.predecessorPackageMemberCount = 0;
  }),
  execute('12-self-acceptance-rule-reversed', ({ registry }) => {
    registry.noSelfAcceptanceRule = 'PRODUCER-PASS-IS-AUTHORITY-AND-ACCEPTANCE';
  }),
  execute('13-manifest-policy-fields-reversed', ({ manifest }) => {
    manifest.maximumPublicGitMemberBytesExclusive = 1;
    manifest.requiredMemberCount = 0;
    manifest.everyMemberBelowMaximum = false;
    manifest.largestMemberBytes = 0;
  }),
  execute('14-manifest-duplicate-member', ({ manifest }) => {
    const duplicate = structuredClone(manifest.members.find((member) => member.role === 'SUBJECT'));
    duplicate.ordinal = manifest.members.length + 1;
    manifest.members.push(duplicate);
  }),
];

const result = {
  schemaVersion: 'B0V7-INDEPENDENT-HOSTILE-REVIEW-HARNESS-RESULT-V1',
  frozenSubjectSha256: shaBytes(originalBytes('docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-2026-08-30.md')),
  frozenManifestSha256: shaBytes(originalBytes(manifestLogicalPath)),
  frozenPackageContentRoot: baselineManifest.packageContentRoot,
  caseCount: cases.length,
  everyCaseAcceptedByBothPackagedReaders: cases.every((entry) => entry.readerA.exitCode === 0 && entry.readerA.verdict === 'PASS' && entry.readerB.exitCode === 0 && entry.readerB.verdict === 'PASS'),
  cases,
};
result.resultContentRoot = rooted('B0V7-INDEPENDENT-HOSTILE-REVIEW-HARNESS-RESULT-V1', result);
process.stdout.write(pretty(result));
