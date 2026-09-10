#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  B0_V8_DATE,
  B0_V8_FINDINGS,
  canonical,
  contentRoot,
  makeB0V8Registry,
  pretty,
  readRegularFileNoFollow,
  runB0V8MutationCampaign,
  sha256Bytes,
  validateB0V8Registry,
  validatePackageManifest,
} from './b0-v8-core.mjs';

const OUTPUTS = Object.freeze({
  subject: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-${B0_V8_DATE}.md`,
  registry: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-normative-registry-${B0_V8_DATE}.json`,
  sourceIndex: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-frozen-source-index-${B0_V8_DATE}.json`,
  crosswalk: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-closure-crosswalk-${B0_V8_DATE}.json`,
  corpus: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-mutation-corpus-${B0_V8_DATE}.json`,
  manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-atomic-package-manifest-${B0_V8_DATE}.json`,
  producerQa: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-producer-qa-${B0_V8_DATE}.json`,
});

const SOURCE_PATHS = Object.freeze([
  `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-${B0_V8_DATE}.md`,
  `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-atomic-package-manifest-${B0_V8_DATE}.json`,
  `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-normative-registry-${B0_V8_DATE}.json`,
  `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-closure-crosswalk-${B0_V8_DATE}.json`,
  `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-independent-hostile-review-${B0_V8_DATE}.md`,
  `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-independent-hostile-review-findings-manifest-${B0_V8_DATE}.md`,
  `docs/planning/discovery-cutoff-candidate-v1-${B0_V8_DATE}/receipt.json`,
  `docs/planning/discovery-cutoff-candidate-v1-${B0_V8_DATE}/manifest.json`,
  `docs/planning/connect-all-remaining-work-execution-plan-${B0_V8_DATE}.md`,
]);

const TOOL_MEMBERS = Object.freeze([
  ['B0V8-CORE-IMPLEMENTATION', 'scripts/b0-v8-core.mjs'],
  ['B0V8-CANDIDATE-BUILDER', 'scripts/create-b0-v8-candidate.mjs'],
  ['B0V8-JAVASCRIPT-VERIFIER', 'scripts/verify-b0-v8-candidate.mjs'],
  ['B0V8-PYTHON-STRUCTURAL-READER', 'scripts/verify-b0-v8-candidate.py'],
  ['B0V8-UNIT-TESTS', 'tests/b0-v8-core.test.mjs'],
]);

function runGit(args) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

function assertCleanCommittedInput() {
  if (!fs.existsSync('package.json') || !fs.existsSync('.git')) throw new Error('run from the product repository root');
  const status = runGit(['status', '--porcelain=v1', '--untracked-files=all']);
  if (status !== '') throw new Error('B0 v8 builder requires a completely clean worktree');
  for (const logicalPath of Object.values(OUTPUTS)) {
    if (fs.existsSync(logicalPath)) throw new Error(`immutable output already exists: ${logicalPath}`);
  }
}

function patchFor(logicalPath, content) {
  if (fs.existsSync(logicalPath)) throw new Error(`refusing to overwrite immutable output: ${logicalPath}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Add File: ${logicalPath}\n${lines.map((line) => `+${line}`).join('\n')}\n`;
}

function emitPatch(files) {
  let patch = '*** Begin Patch\n';
  for (const [logicalPath, content] of files) patch += patchFor(logicalPath, content);
  patch += '*** End Patch\n';
  process.stdout.write(patch);
}

function buildSourceIndex(repositoryRoot) {
  const sourceRows = SOURCE_PATHS.map((logicalPath, index) => {
    const fact = readRegularFileNoFollow(repositoryRoot, logicalPath, 50 * 1024 * 1024);
    return { bytes: fact.byteLength, logicalPath, mode: fact.mode, ordinal: index + 1, sha256: fact.sha256 };
  });
  const index = {
    artifactClass: 'FROZEN-LOCAL-SOURCE-INDEX-PLANNING-ONLY',
    artifactId: 'CONNECT-B0-V8-FROZEN-SOURCE-INDEX-2026-08-30-G0',
    repositoryVisibility: 'PUBLIC',
    schemaVersion: 'CONNECT-B0-V8-SOURCE-INDEX-V1',
    sourceCount: sourceRows.length,
    sourceRows,
    sourceSetRoot: contentRoot('CONNECT-B0-V8-FROZEN-SOURCE-SET-V1', sourceRows),
  };
  return index;
}

function buildCrosswalk(registry) {
  const rows = registry.findingControls.map((control, index) => ({
    closureStatus: control.closureStatus,
    controlId: control.controlId,
    externalEvidenceRequired: control.externalEvidenceRequired,
    findingId: control.findingId,
    localStatus: control.localStatus,
    ordinal: index + 1,
    severity: control.severity,
    testIds: control.testIds,
  }));
  const base = {
    artifactClass: 'ONE-TO-ONE-FINDING-CONTROL-CROSSWALK-PLANNING-ONLY',
    artifactId: 'CONNECT-B0-V8-CLOSURE-CROSSWALK-2026-08-30-G0',
    closureCount: 0,
    findingCount: rows.length,
    repositoryVisibility: 'PUBLIC',
    rows,
    schemaVersion: 'CONNECT-B0-V8-CLOSURE-CROSSWALK-V1',
  };
  return { ...base, crosswalkRoot: contentRoot('CONNECT-B0-V8-CLOSURE-CROSSWALK-V1', base) };
}

function buildCorpus(registry) {
  const cases = runB0V8MutationCampaign(registry);
  const base = {
    artifactClass: 'DETERMINISTIC-PROTOCOL-MUTATION-CORPUS-NO-BUSINESS-DATA',
    artifactId: 'CONNECT-B0-V8-MUTATION-CORPUS-2026-08-30-G0',
    blockedCount: cases.filter((row) => row.actual === 'BLOCK').length,
    caseCount: cases.length,
    cases,
    repositoryVisibility: 'PUBLIC',
    schemaVersion: 'CONNECT-B0-V8-MUTATION-CORPUS-V1',
  };
  return { ...base, corpusRoot: contentRoot('CONNECT-B0-V8-MUTATION-CORPUS-V1', base) };
}

function renderSubject({ sourceCommit, registry, sourceIndex, crosswalk, corpus }) {
  const controlRows = registry.findingControls.map((control, index) => `${index + 1}. ${control.findingId} (${control.severity}) — ${B0_V8_FINDINGS[index][2]}; local=${control.localStatus}; closure=${control.closureStatus}; external=${control.externalEvidenceRequired.length === 0 ? 'none' : control.externalEvidenceRequired.join(',')}.`);
  return `# 1. Connect — Bootstrap Authority Envelope B0 v8 immutable candidate\n\n## 1.1 Verdict and claim boundary\n\n1.1.1 \`artifactId=CONNECT-B0-V8-SUBJECT-2026-08-30-G0\`.\n\n1.1.2 This is an immutable planning Candidate built from committed input \`${sourceCommit}\`. It is not Authority, Acceptance, production evidence or permission to remove the development freeze.\n\n1.1.3 Current state remains \`B0=ABSENT\`, \`Gate29=BLOCKED\`, \`developmentFreeze=ACTIVE\`, \`Acceptance=0\`, \`authorityOutputs=0\`, \`repositoryVisibility=PUBLIC\`.\n\n1.1.4 Tal is the sole work owner. Primary/Backup assignments are removed. Logical separation requirements remain unsatisfied until externally appointed, controller-separated evidence exists.\n\n1.1.5 No signature algorithm was selected, no key was generated, and no cryptographic-random value was created. Per-use approval remains required before an actual cryptographic use.\n\n## 2. Executable local controls\n\n2.1 Canonical JSON rejects unsafe integers, non-scalar Unicode and unknown object keys. Every package boundary has an exact closed schema rooted by SHA-256 with domain separation.\n\n2.2 Source reads walk every path component, reject traversal, symlinks and hard links, require regular files, open with no-follow, compare device/inode/size after open and enforce repository containment and byte limits.\n\n2.3 CAS uses exact state and attempt schemas, exact head/revision revalidation, a typed Permit, detached receipts, keyed Permit/replay/attempt ledgers, one returned atomic state, a persisted Outbox identity and authoritative response-loss readback.\n\n2.4 Recovery requires five distinct member controllers, exactly three unique acknowledgements, two distinct non-overlapping witnesses, exact head revalidation and one returned rotation/revocation/consume/head transition.\n\n2.5 A causal global trace is ordered and root-linked. Producer PASS, Reader PASS and Review do not create Acceptance.\n\n## 3. Exact finding controls\n\n${controlRows.join('\n\n')}\n\n## 4. Frozen package facts\n\n4.1 Frozen source rows: \`${sourceIndex.sourceCount}\`; source set root: \`${sourceIndex.sourceSetRoot}\`.\n\n4.2 Finding crosswalk rows: \`${crosswalk.findingCount}\`; locally implemented Candidate controls: \`14/14\`; independent closure: \`${crosswalk.closureCount}/14\`.\n\n4.3 Hostile protocol mutations blocked locally: \`${corpus.blockedCount}/${corpus.caseCount}\`; corpus root: \`${corpus.corpusRoot}\`.\n\n## 5. External blockers retained\n\n5.1 Trusted time, external trust anchors, actual signature verification, authenticated GitHub PUBLIC evidence, durable adapter evidence, independent Reader appointments and predecessor behavior-oracle completion remain absent.\n\n5.2 The deterministic protocol vectors contain no customer, contact, campaign, payment or other business records. They exercise only protocol states and hashes.\n\n5.3 A Producer QA or cross-runtime Reader result may verify reproducibility but cannot close a Finding or create B0.\n\n## 6. Terminal rule\n\n6.1 The Candidate remains \`NOT-ACCEPTED\` until all external receipts are supplied, the predecessor behavior oracle is complete, two genuinely independent Readers are appointed and a detached authorized Acceptance is recorded.\n`;
}

function makeMember(role, logicalPath, content) {
  const bytes = Buffer.from(content, 'utf8');
  return { bytes: bytes.length, logicalPath, role, sha256: sha256Bytes(bytes) };
}

function build() {
  assertCleanCommittedInput();
  const repositoryRoot = process.cwd();
  const sourceCommit = runGit(['rev-parse', 'HEAD']);
  const commitInstant = new Date(runGit(['show', '-s', '--format=%cI', sourceCommit])).toISOString().replace('.000Z', 'Z');
  const registry = makeB0V8Registry();
  validateB0V8Registry(registry);
  const sourceIndex = buildSourceIndex(repositoryRoot);
  const crosswalk = buildCrosswalk(registry);
  const corpus = buildCorpus(registry);
  const subject = renderSubject({ sourceCommit, registry, sourceIndex, crosswalk, corpus });
  const generated = new Map([
    [OUTPUTS.subject, subject],
    [OUTPUTS.registry, pretty(registry)],
    [OUTPUTS.sourceIndex, pretty(sourceIndex)],
    [OUTPUTS.crosswalk, pretty(crosswalk)],
    [OUTPUTS.corpus, pretty(corpus)],
  ]);
  const memberDrafts = [
    makeMember('B0V8-SUBJECT', OUTPUTS.subject, generated.get(OUTPUTS.subject)),
    makeMember('B0V8-NORMATIVE-REGISTRY', OUTPUTS.registry, generated.get(OUTPUTS.registry)),
    makeMember('B0V8-FROZEN-SOURCE-INDEX', OUTPUTS.sourceIndex, generated.get(OUTPUTS.sourceIndex)),
    makeMember('B0V8-CLOSURE-CROSSWALK', OUTPUTS.crosswalk, generated.get(OUTPUTS.crosswalk)),
    makeMember('B0V8-MUTATION-CORPUS', OUTPUTS.corpus, generated.get(OUTPUTS.corpus)),
    ...TOOL_MEMBERS.map(([role, logicalPath]) => {
      const fact = readRegularFileNoFollow(repositoryRoot, logicalPath, 10 * 1024 * 1024);
      return { bytes: fact.byteLength, logicalPath, role, sha256: fact.sha256 };
    }),
  ];
  const members = memberDrafts.map((member, index) => ({ ...member, ordinal: index + 1 }));
  const packageId = 'CONNECT-B0-V8-IMMUTABLE-CANDIDATE-PACKAGE-2026-08-30-G0';
  const projection = { packageId, sourceCommit, members };
  const manifest = {
    artifactClass: 'IMMUTABLE-PLANNING-PACKAGE-MANIFEST-NOT-AUTHORITY-NOT-ACCEPTANCE',
    artifactId: 'CONNECT-B0-V8-ATOMIC-PACKAGE-MANIFEST-2026-08-30-G0',
    generatedAt: commitInstant,
    maxMemberBytesExclusive: registry.storagePolicy.maxMemberBytesExclusive,
    maxTotalBytesInclusive: registry.storagePolicy.maxPackageBytesInclusive,
    memberCount: members.length,
    members,
    packageContentRoot: contentRoot('CONNECT-B0-V8-PACKAGE-CONTENT-V1', projection),
    packageId,
    repositoryVisibility: 'PUBLIC',
    schemaVersion: 'CONNECT-B0-V8-PACKAGE-MANIFEST-V1',
    sourceCommit,
    totalBytes: members.reduce((sum, member) => sum + member.bytes, 0),
  };
  validatePackageManifest(manifest);
  const producerQaBase = {
    artifactClass: 'PRODUCER-SELF-QA-NOT-INDEPENDENT-NOT-ACCEPTANCE',
    artifactId: 'CONNECT-B0-V8-PRODUCER-QA-2026-08-30-G0',
    b0: 'ABSENT',
    externalClosureCount: 0,
    findingControlCount: registry.findingControls.length,
    gate29: 'BLOCKED',
    generatedAt: commitInstant,
    mutationBlockedCount: corpus.blockedCount,
    packageContentRoot: manifest.packageContentRoot,
    result: 'PASS-LOCAL-CANDIDATE-NOT-ACCEPTED',
    sourceCommit,
  };
  const producerQa = { ...producerQaBase, reportRoot: contentRoot('CONNECT-B0-V8-PRODUCER-QA-V1', producerQaBase) };
  generated.set(OUTPUTS.manifest, pretty(manifest));
  generated.set(OUTPUTS.producerQa, pretty(producerQa));
  if (canonical(corpus.cases.map((row) => row.findingId)) !== canonical(B0_V8_FINDINGS.map(([findingId]) => findingId))) throw new Error('corpus finding order mismatch');
  emitPatch([...generated.entries()]);
}

build();
