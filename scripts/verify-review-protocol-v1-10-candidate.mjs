#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  assertClosedObject,
  assertRepoRelativePath,
  canonical,
  contentRoot,
  pretty,
  readRegularFileNoFollow,
  sha256Bytes,
} from './b0-v8-core.mjs';
import {
  REVIEW_PROTOCOL_FINDINGS,
  REVIEW_ROLE_SLOTS,
  REVIEW_VALIDATOR_IDS,
  evaluateCurrentReviewProtocolState,
  evaluateReviewProtocolInput,
  makeReviewProtocolVector,
  runReviewProtocolMutationCampaign,
} from './review-protocol-v1-10-core.mjs';

const DATE = '2026-08-30';
const PACKAGE_DIR = `docs/planning/three-review-protocol-v1-10-g1-package-${DATE}`;
const REPORT_DIR = `docs/planning/three-review-protocol-v1-10-g1-detached-reports-${DATE}`;
const PATHS = Object.freeze({
  manifest: `${PACKAGE_DIR}/normative-package-manifest.json`, registry: `${PACKAGE_DIR}/normative-registry.json`, sourceIndex: `${PACKAGE_DIR}/frozen-source-index.json`, crosswalk: `${PACKAGE_DIR}/closure-crosswalk.json`, corpus: `${PACKAGE_DIR}/mutation-corpus.json`,
  reportA: `${REPORT_DIR}/qa-reader-a-report.json`, reportB: `${REPORT_DIR}/qa-reader-b-report.json`,
});

function runGit(args, encoding = 'utf8', maxBuffer = 4 * 1024 * 1024) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${encoding ? result.stderr.trim() : result.stderr.toString('utf8').trim()}`);
  return result.stdout;
}

function readGitBlob(commitOid, logicalPath, maxBytesExclusive) {
  assertRepoRelativePath(logicalPath);
  const entries = runGit(['ls-tree', '-z', '--full-tree', commitOid, '--', logicalPath], null).toString('utf8').split('\0').filter(Boolean);
  if (entries.length !== 1) throw new Error(`Git path must resolve exactly once: ${logicalPath}`);
  const match = /^(100644|100755) blob ([0-9a-f]{40,64})\t(.+)$/.exec(entries[0]);
  if (!match || match[3] !== logicalPath) throw new Error(`Git path is not an exact regular blob: ${logicalPath}`);
  const bytes = runGit(['cat-file', 'blob', match[2]], null, maxBytesExclusive);
  if (bytes.length >= maxBytesExclusive) throw new Error(`Git blob exceeds byte limit: ${logicalPath}`);
  return { byteLength: bytes.length, bytes, logicalPath, mode: Number.parseInt(match[1].slice(-3), 8), sha256: sha256Bytes(bytes) };
}

function readJson(repositoryRoot, logicalPath, maxBytes = 25 * 1024 * 1024) {
  const fact = readRegularFileNoFollow(repositoryRoot, logicalPath, maxBytes);
  return { fact, value: JSON.parse(fact.bytes.toString('utf8')) };
}

function validateManifest(repositoryRoot, manifest) {
  const keys = ['artifactClass', 'artifactId', 'generatedAt', 'maxMemberBytesExclusive', 'maxTotalBytesInclusive', 'memberCount', 'members', 'packageContentRoot', 'packageId', 'repositoryVisibility', 'schemaVersion', 'sourceCommit', 'totalBytes'];
  assertClosedObject(manifest, keys, 'manifest');
  if (manifest.repositoryVisibility !== 'PUBLIC' || manifest.schemaVersion !== 'MPRR-V1-10-PACKAGE-MANIFEST-V1' || !Array.isArray(manifest.members) || manifest.members.length !== 11 || manifest.memberCount !== 11) throw new Error('manifest invariant mismatch');
  const paths = new Set(); const hashes = new Set(); const roles = new Set(); let total = 0;
  manifest.members.forEach((member, index) => {
    assertClosedObject(member, ['bytes', 'logicalPath', 'ordinal', 'role', 'sha256'], `manifest.members[${index}]`);
    if (member.ordinal !== index + 1 || paths.has(member.logicalPath) || hashes.has(member.sha256) || roles.has(member.role)) throw new Error('manifest order or uniqueness mismatch');
    paths.add(member.logicalPath); hashes.add(member.sha256); roles.add(member.role);
    const fact = member.logicalPath.startsWith('scripts/') || member.logicalPath.startsWith('tests/') ? readGitBlob(manifest.sourceCommit, member.logicalPath, manifest.maxMemberBytesExclusive) : readRegularFileNoFollow(repositoryRoot, member.logicalPath, manifest.maxMemberBytesExclusive);
    if (fact.sha256 !== member.sha256 || fact.byteLength !== member.bytes) throw new Error(`manifest member drift: ${member.logicalPath}`);
    total += member.bytes;
  });
  if (!manifest.members.some((member) => member.role === 'MPRRV110-B0-CORE-DEPENDENCY' && member.logicalPath === 'scripts/b0-v8-core.mjs')) throw new Error('manifest missing transitive B0 core dependency');
  if (total !== manifest.totalBytes || total > manifest.maxTotalBytesInclusive) throw new Error('manifest total budget mismatch');
  const projection = { members: manifest.members, packageId: manifest.packageId, sourceCommit: manifest.sourceCommit };
  if (contentRoot('MPRR-V1-10-PACKAGE-CONTENT-V1', projection) !== manifest.packageContentRoot) throw new Error('manifest package root mismatch');
}

function validateRegistry(registry) {
  const keys = ['algorithmPolicy', 'artifactClass', 'artifactId', 'controlRows', 'currentState', 'externalEvidence', 'growthPolicy', 'ownerModel', 'receiptSchema', 'reportPolicy', 'repositoryVisibility', 'roleSlots', 'schemaVersion', 'validatorIds'];
  assertClosedObject(registry, keys, 'registry');
  if (registry.repositoryVisibility !== 'PUBLIC' || registry.schemaVersion !== 'MPRR-V1-10-NORMATIVE-REGISTRY-V1') throw new Error('registry invariant mismatch');
  if (canonical(registry.validatorIds) !== canonical(REVIEW_VALIDATOR_IDS) || canonical(registry.roleSlots) !== canonical(REVIEW_ROLE_SLOTS)) throw new Error('registry validator/role denominator mismatch');
  if (registry.ownerModel.workOwner !== 'Tal' || registry.ownerModel.ownerCount !== 1 || registry.ownerModel.primaryBackupModel !== 'REMOVED') throw new Error('registry owner model mismatch');
  if (canonical(registry.currentState) !== canonical(evaluateCurrentReviewProtocolState())) throw new Error('registry current state mismatch');
  if (registry.externalEvidence.externalClosureCount !== 0 || registry.externalEvidence.independentReviewerEvidencePresent !== false || registry.externalEvidence.operationalEvidencePresent !== false) throw new Error('registry external evidence overclaim');
  if (registry.algorithmPolicy.approvedAlgorithms.length !== 0 || registry.algorithmPolicy.keyGenerationPerformed !== false || registry.algorithmPolicy.selectionState !== 'UNSELECTED-PER-USE-APPROVAL-REQUIRED') throw new Error('registry cryptographic policy mismatch');
  if (registry.reportPolicy.safeDescriptorBoundAdapterPresent !== false || registry.reportPolicy.writesAllowed !== false) throw new Error('registry report adapter overclaim');
  if (registry.growthPolicy.globalBudgetPresent !== false || registry.growthPolicy.duplicateBytesMustBeDerived !== true || !registry.growthPolicy.admission.startsWith('DENIED')) throw new Error('registry growth policy mismatch');
  const { schemaRoot, ...schemaBase } = registry.receiptSchema;
  if (schemaBase.additionalProperties !== false || contentRoot('MPRR-V1-10-CLOSED-SCHEMA-V1', schemaBase) !== schemaRoot) throw new Error('registry receipt schema mismatch');
  if (!Array.isArray(registry.controlRows) || registry.controlRows.length !== 17) throw new Error('registry control denominator mismatch');
  registry.controlRows.forEach((row, index) => {
    assertClosedObject(row, ['closureStatus', 'controlId', 'externalEvidenceRequired', 'findingId', 'localStatus', 'severity', 'testId'], `control[${index}]`);
    if (row.findingId !== REVIEW_PROTOCOL_FINDINGS[index][0] || row.severity !== REVIEW_PROTOCOL_FINDINGS[index][1] || row.localStatus !== 'IMPLEMENTED-CANDIDATE' || row.closureStatus !== 'OPEN-PENDING-INDEPENDENT-EVIDENCE') throw new Error('registry control overclaim or identity mismatch');
  });
}

function validateSourceIndex(index, sourceCommit) {
  assertClosedObject(index, ['artifactClass', 'artifactId', 'repositoryVisibility', 'rows', 'schemaVersion', 'sourceCount', 'sourceSetRoot'], 'sourceIndex');
  if (index.repositoryVisibility !== 'PUBLIC' || !Array.isArray(index.rows) || index.rows.length !== 11 || index.sourceCount !== 11) throw new Error('source index denominator mismatch');
  const paths = new Set(); const hashes = new Set();
  index.rows.forEach((row, position) => {
    assertClosedObject(row, ['bytes', 'logicalPath', 'mode', 'ordinal', 'sha256'], `source[${position}]`);
    if (row.ordinal !== position + 1 || paths.has(row.logicalPath) || hashes.has(row.sha256)) throw new Error('source index order/uniqueness mismatch');
    paths.add(row.logicalPath); hashes.add(row.sha256);
    const fact = readGitBlob(sourceCommit, row.logicalPath, 50 * 1024 * 1024);
    if (fact.sha256 !== row.sha256 || fact.byteLength !== row.bytes || fact.mode !== row.mode) throw new Error(`source drift: ${row.logicalPath}`);
  });
  if (!index.rows.some((row) => row.logicalPath === 'scripts/b0-v8-core.mjs')) throw new Error('source index missing transitive B0 core dependency');
  if (contentRoot('MPRR-V1-10-SOURCE-SET-V1', index.rows) !== index.sourceSetRoot) throw new Error('source index root mismatch');
}

function validateCrosswalk(registry, crosswalk) {
  assertClosedObject(crosswalk, ['artifactClass', 'artifactId', 'closureCount', 'crosswalkRoot', 'findingCount', 'inheritedFindingCount', 'inheritedIndependentMechanicalClosureCount', 'repositoryVisibility', 'rows', 'schemaVersion'], 'crosswalk');
  if (crosswalk.findingCount !== 17 || crosswalk.closureCount !== 0 || crosswalk.inheritedFindingCount !== 40 || crosswalk.inheritedIndependentMechanicalClosureCount !== 1 || !Array.isArray(crosswalk.rows) || crosswalk.rows.length !== 17) throw new Error('crosswalk denominator mismatch');
  crosswalk.rows.forEach((row, index) => {
    const { ordinal, ...control } = row;
    if (ordinal !== index + 1 || canonical(control) !== canonical(registry.controlRows[index])) throw new Error('crosswalk row mismatch');
  });
  const { crosswalkRoot, ...base } = crosswalk;
  if (contentRoot('MPRR-V1-10-CROSSWALK-V1', base) !== crosswalkRoot) throw new Error('crosswalk root mismatch');
}

function validateCorpus(corpus) {
  assertClosedObject(corpus, ['artifactClass', 'artifactId', 'blockedCount', 'caseCount', 'cases', 'corpusRoot', 'repositoryVisibility', 'schemaVersion'], 'corpus');
  if (corpus.caseCount !== 17 || corpus.blockedCount !== 17 || !Array.isArray(corpus.cases) || corpus.cases.length !== 17) throw new Error('corpus denominator mismatch');
  corpus.cases.forEach((row, index) => {
    assertClosedObject(row, ['actual', 'findingId', 'mutationId', 'ordinal', 'target', 'testRoot'], `mutation[${index}]`);
    const { testRoot, ...base } = row;
    if (row.ordinal !== index + 1 || row.findingId !== REVIEW_PROTOCOL_FINDINGS[index][0] || row.actual !== 'BLOCK' || contentRoot('MPRR-V1-10-MUTATION-RESULT-V1', base) !== testRoot) throw new Error('corpus row mismatch');
  });
  const { corpusRoot, ...base } = corpus;
  if (contentRoot('MPRR-V1-10-MUTATION-CORPUS-V1', base) !== corpusRoot || canonical(runReviewProtocolMutationCampaign()) !== canonical(corpus.cases)) throw new Error('corpus execution/root mismatch');
}

function verifyCandidate() {
  const repositoryRoot = process.cwd();
  const manifest = readJson(repositoryRoot, PATHS.manifest).value; validateManifest(repositoryRoot, manifest);
  const registry = readJson(repositoryRoot, PATHS.registry).value; validateRegistry(registry);
  const sourceIndex = readJson(repositoryRoot, PATHS.sourceIndex).value; validateSourceIndex(sourceIndex, manifest.sourceCommit);
  const crosswalk = readJson(repositoryRoot, PATHS.crosswalk).value; validateCrosswalk(registry, crosswalk);
  const corpus = readJson(repositoryRoot, PATHS.corpus).value; validateCorpus(corpus);
  const positive = evaluateReviewProtocolInput(makeReviewProtocolVector());
  if (positive.status !== 'ELIGIBLE-PLANNING-VECTOR-NOT-AUTHORITY' || positive.validatorCount !== 15 || positive.blockedCount !== 0) throw new Error('positive protocol vector failed');
  if (evaluateCurrentReviewProtocolState().status !== 'BLOCKED') throw new Error('current state must remain blocked');
  const reader = manifest.members.find((member) => member.role === 'MPRRV110-READER-A');
  if (!reader) throw new Error('Reader A not pinned');
  const base = { artifactClass: 'CROSS-CHECK-READER-A-NOT-INDEPENDENT-NOT-ACCEPTANCE', artifactId: 'MPRR-V1-10-READER-A-REPORT-2026-08-30-G1', closureCount: 0, corpusRoot: corpus.corpusRoot, findingCount: 17, packageContentRoot: manifest.packageContentRoot, positiveValidatorCount: 15, readerArtifactSha256: reader.sha256, result: 'PASS-CANDIDATE-NOT-ACCEPTED', sourceCommit: manifest.sourceCommit, sourceSetRoot: sourceIndex.sourceSetRoot };
  return { ...base, reportRoot: contentRoot('MPRR-V1-10-READER-A-REPORT-V1', base) };
}

function runPython() {
  const result = spawnSync('python3', ['scripts/verify-review-protocol-v1-10-candidate.py'], { cwd: process.cwd(), encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Reader B failed: ${(result.stderr || result.stdout).trim()}`);
  return JSON.parse(result.stdout);
}

function patchFor(logicalPath, content) {
  if (fs.existsSync(logicalPath)) throw new Error(`report already exists: ${logicalPath}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Add File: ${logicalPath}\n${lines.map((line) => `+${line}`).join('\n')}\n`;
}

function emitReports(reportA, reportB) {
  if (runGit(['status', '--porcelain=v1', '--untracked-files=all']).trim() !== '') throw new Error('--emit-patch requires clean worktree');
  process.stdout.write(`*** Begin Patch\n${patchFor(PATHS.reportA, pretty(reportA))}${patchFor(PATHS.reportB, pretty(reportB))}*** End Patch\n`);
}

function checkExisting(reportA, reportB) {
  const storedA = readJson(process.cwd(), PATHS.reportA).value; const storedB = readJson(process.cwd(), PATHS.reportB).value;
  if (canonical(storedA) !== canonical(reportA) || canonical(storedB) !== canonical(reportB)) throw new Error('stored report drift');
  return { status: 'PASS-EXISTING-PROTOCOL-V1-10-CANDIDATE-NOT-ACCEPTED', packageContentRoot: reportA.packageContentRoot, readerAReportRoot: reportA.reportRoot, readerBReportRoot: reportB.reportRoot };
}

const reportA = verifyCandidate(); const reportB = runPython();
for (const key of ['packageContentRoot', 'sourceSetRoot', 'corpusRoot', 'findingCount', 'positiveValidatorCount']) if (reportA[key] !== reportB[key]) throw new Error(`Reader fact mismatch: ${key}`);
if (process.argv.includes('--emit-patch')) emitReports(reportA, reportB);
else if (process.argv.includes('--check-existing')) process.stdout.write(`${JSON.stringify(checkExisting(reportA, reportB))}\n`);
else process.stdout.write(`${JSON.stringify({ status: 'PASS-PROTOCOL-V1-10-CANDIDATE-NOT-ACCEPTED', readerA: reportA, readerB: reportB })}\n`);
