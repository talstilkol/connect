#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  B0_V8_DATE,
  B0_V8_FINDINGS,
  applyPlanningCas,
  applyPlanningRecovery,
  assertRepoRelativePath,
  canonical,
  contentRoot,
  evaluateAcceptanceGate,
  evaluateCausalTrace,
  makeB0V8Registry,
  makeProtocolCasVector,
  makeProtocolRecoveryVector,
  makeProtocolTrace,
  makeRoot,
  pretty,
  readPlanningCasResult,
  readRegularFileNoFollow,
  runB0V8MutationCampaign,
  sha256Bytes,
  validateB0V8Registry,
  validateClosedSchema,
  validateObjectAgainstClosedSchema,
  validatePackageManifest,
} from './b0-v8-core.mjs';

const PATHS = Object.freeze({
  manifest: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-atomic-package-manifest-${B0_V8_DATE}.json`,
  registry: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-normative-registry-${B0_V8_DATE}.json`,
  sourceIndex: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-frozen-source-index-${B0_V8_DATE}.json`,
  crosswalk: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-closure-crosswalk-${B0_V8_DATE}.json`,
  corpus: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-mutation-corpus-${B0_V8_DATE}.json`,
  reportA: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-qa-reader-a-report-${B0_V8_DATE}.json`,
  reportB: `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-qa-reader-b-report-${B0_V8_DATE}.json`,
});

function runGit(args) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

function readJson(repositoryRoot, logicalPath, maxBytes = 25 * 1024 * 1024) {
  const fact = readRegularFileNoFollow(repositoryRoot, logicalPath, maxBytes);
  return { fact, value: JSON.parse(fact.bytes.toString('utf8')) };
}

function readGitBlobAtCommit(commitOid, logicalPath, maxBytesExclusive) {
  assertRepoRelativePath(logicalPath);
  const tree = spawnSync('git', ['ls-tree', '-z', '--full-tree', commitOid, '--', logicalPath], { cwd: process.cwd(), encoding: null, maxBuffer: 4 * 1024 * 1024 });
  if (tree.status !== 0) throw new Error(`git ls-tree failed for ${logicalPath}: ${tree.stderr.toString('utf8').trim()}`);
  const entries = tree.stdout.toString('utf8').split('\0').filter(Boolean);
  if (entries.length !== 1) throw new Error(`Git source lookup must resolve exactly one entry: ${logicalPath}`);
  const match = /^(100644|100755) blob ([0-9a-f]{40,64})\t(.+)$/.exec(entries[0]);
  if (!match || match[3] !== logicalPath) throw new Error(`Git source is not an exact regular blob: ${logicalPath}`);
  const blob = spawnSync('git', ['cat-file', 'blob', match[2]], { cwd: process.cwd(), encoding: null, maxBuffer: maxBytesExclusive });
  if (blob.status !== 0) throw new Error(`git cat-file failed for ${logicalPath}: ${blob.stderr.toString('utf8').trim()}`);
  if (blob.stdout.length >= maxBytesExclusive) throw new Error(`Git source exceeds exclusive byte limit: ${logicalPath}`);
  return { logicalPath, bytes: blob.stdout, byteLength: blob.stdout.length, sha256: sha256Bytes(blob.stdout), mode: Number.parseInt(match[1].slice(-3), 8) };
}

function schemaById(registry, schemaId) {
  const schema = registry.schemaCatalog.find((candidate) => candidate.schemaId === schemaId);
  if (!schema) throw new Error(`missing schema ${schemaId}`);
  return schema;
}

function validateSourceIndex(registry, index, sourceCommit) {
  validateObjectAgainstClosedSchema(index, schemaById(registry, 'B0V8-SOURCE-INDEX'), 'sourceIndex');
  if (index.repositoryVisibility !== 'PUBLIC' || index.schemaVersion !== 'CONNECT-B0-V8-SOURCE-INDEX-V1') throw new Error('sourceIndex: invariant mismatch');
  if (!Array.isArray(index.sourceRows) || index.sourceRows.length !== index.sourceCount || index.sourceCount < 9) throw new Error('sourceIndex: count mismatch');
  const paths = new Set(); const hashes = new Set();
  index.sourceRows.forEach((row, position) => {
    validateObjectAgainstClosedSchema(row, schemaById(registry, 'B0V8-SOURCE-ROW'), `sourceIndex.sourceRows[${position}]`);
    if (row.ordinal !== position + 1 || paths.has(row.logicalPath) || hashes.has(row.sha256)) throw new Error('sourceIndex: order or uniqueness failure');
    paths.add(row.logicalPath); hashes.add(row.sha256);
    const observed = readGitBlobAtCommit(sourceCommit, row.logicalPath, 50 * 1024 * 1024);
    if (observed.sha256 !== row.sha256 || observed.byteLength !== row.bytes || observed.mode !== row.mode) throw new Error(`sourceIndex: source drift ${row.logicalPath}`);
  });
  if (contentRoot('CONNECT-B0-V8-FROZEN-SOURCE-SET-V1', index.sourceRows) !== index.sourceSetRoot) throw new Error('sourceIndex: sourceSetRoot mismatch');
}

function validateCrosswalk(registry, crosswalk) {
  validateObjectAgainstClosedSchema(crosswalk, schemaById(registry, 'B0V8-CLOSURE-CROSSWALK'), 'crosswalk');
  if (crosswalk.repositoryVisibility !== 'PUBLIC' || crosswalk.schemaVersion !== 'CONNECT-B0-V8-CLOSURE-CROSSWALK-V1' || crosswalk.findingCount !== 14 || crosswalk.closureCount !== 0) throw new Error('crosswalk: invariant mismatch');
  if (!Array.isArray(crosswalk.rows) || crosswalk.rows.length !== 14) throw new Error('crosswalk: row count mismatch');
  crosswalk.rows.forEach((row, index) => {
    validateObjectAgainstClosedSchema(row, schemaById(registry, 'B0V8-CLOSURE-ROW'), `crosswalk.rows[${index}]`);
    const control = registry.findingControls[index];
    if (row.ordinal !== index + 1 || row.findingId !== control.findingId || row.controlId !== control.controlId || row.severity !== control.severity || row.localStatus !== 'IMPLEMENTED-CANDIDATE' || row.closureStatus !== 'OPEN-PENDING-INDEPENDENT-EVIDENCE' || canonical(row.testIds) !== canonical(control.testIds) || canonical(row.externalEvidenceRequired) !== canonical(control.externalEvidenceRequired)) throw new Error('crosswalk: row/control mismatch');
  });
  const { crosswalkRoot, ...base } = crosswalk;
  if (contentRoot('CONNECT-B0-V8-CLOSURE-CROSSWALK-V1', base) !== crosswalkRoot) throw new Error('crosswalk: root mismatch');
}

function validateCorpus(registry, corpus) {
  validateObjectAgainstClosedSchema(corpus, schemaById(registry, 'B0V8-MUTATION-CORPUS'), 'corpus');
  if (corpus.repositoryVisibility !== 'PUBLIC' || corpus.schemaVersion !== 'CONNECT-B0-V8-MUTATION-CORPUS-V1' || corpus.caseCount !== 14 || corpus.blockedCount !== 14) throw new Error('corpus: invariant mismatch');
  if (!Array.isArray(corpus.cases) || corpus.cases.length !== 14) throw new Error('corpus: row count mismatch');
  corpus.cases.forEach((row, index) => {
    validateObjectAgainstClosedSchema(row, schemaById(registry, 'B0V8-MUTATION-CASE'), `corpus.cases[${index}]`);
    const { testRoot, ...base } = row;
    if (row.ordinal !== index + 1 || row.findingId !== B0_V8_FINDINGS[index][0] || row.actual !== 'BLOCK' || contentRoot('CONNECT-B0-V8-MUTATION-RESULT-V1', base) !== testRoot) throw new Error('corpus: invalid mutation result');
  });
  const { corpusRoot, ...base } = corpus;
  if (contentRoot('CONNECT-B0-V8-MUTATION-CORPUS-V1', base) !== corpusRoot) throw new Error('corpus: root mismatch');
  if (canonical(runB0V8MutationCampaign(registry)) !== canonical(corpus.cases)) throw new Error('corpus: executable campaign mismatch');
}

function verifyCandidate() {
  const repositoryRoot = process.cwd();
  const { value: manifest } = readJson(repositoryRoot, PATHS.manifest);
  validatePackageManifest(manifest);
  for (const member of manifest.members) {
    const fact = member.logicalPath.startsWith('scripts/') || member.logicalPath.startsWith('tests/')
      ? readGitBlobAtCommit(manifest.sourceCommit, member.logicalPath, manifest.maxMemberBytesExclusive)
      : readRegularFileNoFollow(repositoryRoot, member.logicalPath, manifest.maxMemberBytesExclusive);
    if (fact.sha256 !== member.sha256 || fact.byteLength !== member.bytes) throw new Error(`manifest member drift: ${member.logicalPath}`);
  }
  const { value: registry } = readJson(repositoryRoot, PATHS.registry);
  validateB0V8Registry(registry);
  if (canonical(registry) !== canonical(makeB0V8Registry())) throw new Error('registry: deterministic rebuild mismatch');
  registry.schemaCatalog.forEach(validateClosedSchema);
  const { value: sourceIndex } = readJson(repositoryRoot, PATHS.sourceIndex);
  const { value: crosswalk } = readJson(repositoryRoot, PATHS.crosswalk);
  const { value: corpus } = readJson(repositoryRoot, PATHS.corpus);
  validateSourceIndex(registry, sourceIndex, manifest.sourceCommit);
  validateCrosswalk(registry, crosswalk);
  validateCorpus(registry, corpus);

  const casVector = makeProtocolCasVector();
  const cas = applyPlanningCas(casVector.state, casVector.attempt);
  const readback = readPlanningCasResult(cas.state, casVector.attempt.attemptId, casVector.attempt.requestRoot);
  if (cas.status !== 'COMMITTED' || readback.status !== 'COMMITTED' || cas.state.outbox.length !== 1) throw new Error('CAS positive protocol vector failed');
  const recoveryVector = makeProtocolRecoveryVector();
  const recovery = applyPlanningRecovery(recoveryVector.state, recoveryVector.request);
  if (recovery.status !== 'COMMITTED' || recovery.state.activeAuthorityRoot !== recoveryVector.request.newAuthorityRoot) throw new Error('Recovery positive protocol vector failed');
  if (evaluateCausalTrace(makeProtocolTrace()).status !== 'PASS') throw new Error('causal trace positive vector failed');
  const gate = evaluateAcceptanceGate({
    producerControllerRoot: makeRoot('CURRENT-TAL-CONTROLLER'),
    readerControllerRoots: [makeRoot('CURRENT-TAL-CONTROLLER'), makeRoot('UNAPPOINTED-READER-B')],
    remoteReceiptPresent: false,
    predecessorOracleComplete: false,
    trustedTimePresent: false,
  });
  if (gate.status !== 'BLOCKED') throw new Error('current Acceptance gate must remain blocked');
  const readerMember = manifest.members.find((member) => member.role === 'B0V8-JAVASCRIPT-VERIFIER');
  if (!readerMember) throw new Error('Reader A is not pinned by manifest');
  const reportBase = {
    artifactClass: 'CROSS-CHECK-READER-A-NOT-INDEPENDENT-NOT-ACCEPTANCE',
    artifactId: 'CONNECT-B0-V8-QA-READER-A-REPORT-2026-08-30-G0',
    b0: 'ABSENT',
    closureCount: 0,
    corpusRoot: corpus.corpusRoot,
    findingCount: crosswalk.findingCount,
    gate29: 'BLOCKED',
    memberCount: manifest.memberCount,
    mutationBlockedCount: corpus.blockedCount,
    packageContentRoot: manifest.packageContentRoot,
    readerArtifactSha256: readerMember.sha256,
    result: 'PASS-REPRODUCIBLE-CANDIDATE-NOT-ACCEPTED',
    sourceCommit: manifest.sourceCommit,
    sourceSetRoot: sourceIndex.sourceSetRoot,
  };
  return { manifest, report: { ...reportBase, reportRoot: contentRoot('CONNECT-B0-V8-QA-READER-A-REPORT-V1', reportBase) } };
}

function runPythonReader() {
  const result = spawnSync('python3', ['scripts/verify-b0-v8-candidate.py'], { cwd: process.cwd(), encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Python Reader failed: ${(result.stderr || result.stdout).trim()}`);
  return JSON.parse(result.stdout);
}

function patchFor(logicalPath, content) {
  if (fs.existsSync(logicalPath)) throw new Error(`refusing to overwrite Reader report: ${logicalPath}`);
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Add File: ${logicalPath}\n${lines.map((line) => `+${line}`).join('\n')}\n`;
}

function emitReports(reportA, reportB) {
  const status = runGit(['status', '--porcelain=v1', '--untracked-files=all']);
  if (status !== '') throw new Error('--emit-patch requires a clean worktree');
  process.stdout.write(`*** Begin Patch\n${patchFor(PATHS.reportA, pretty(reportA))}${patchFor(PATHS.reportB, pretty(reportB))}*** End Patch\n`);
}

function checkExisting(reportA, reportB) {
  const storedA = readJson(process.cwd(), PATHS.reportA).value;
  const storedB = readJson(process.cwd(), PATHS.reportB).value;
  if (canonical(storedA) !== canonical(reportA) || canonical(storedB) !== canonical(reportB)) throw new Error('stored Reader report drift');
  return { status: 'PASS-EXISTING-B0-V8-CANDIDATE-NOT-ACCEPTED', packageContentRoot: reportA.packageContentRoot, readerAReportRoot: reportA.reportRoot, readerBReportRoot: reportB.reportRoot };
}

const { report: reportA } = verifyCandidate();
const reportB = runPythonReader();
if (reportA.packageContentRoot !== reportB.packageContentRoot || reportA.sourceSetRoot !== reportB.sourceSetRoot || reportA.corpusRoot !== reportB.corpusRoot || reportA.mutationBlockedCount !== reportB.mutationBlockedCount) throw new Error('Reader A/B fact mismatch');
if (process.argv.includes('--emit-patch')) emitReports(reportA, reportB);
else if (process.argv.includes('--check-existing')) process.stdout.write(`${JSON.stringify(checkExisting(reportA, reportB))}\n`);
else process.stdout.write(`${JSON.stringify({ status: 'PASS-B0-V8-CANDIDATE-NOT-ACCEPTED', readerA: reportA, readerB: reportB })}\n`);
