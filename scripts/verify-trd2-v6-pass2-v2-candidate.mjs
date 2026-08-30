#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { canonicalV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS1_REUSED_PATHS,
  TRD2_V6_PASS2_V1_REJECTED_PATHS,
  TRD2_V6_PASS2_V2_EXTERNAL_PATHS,
  TRD2_V6_PASS2_V2_NORMATIVE_PATHS,
  TRD2_V6_PASS2_V2_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS2_V2_PATHS,
  TRD2_V6_PASS2_V2_PRODUCER_PATHS,
  TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH,
  TRD2_V6_PASS2_V2_TOOLCHAIN_PATHS,
  TRD2_V6_PASS2_V2_TOOLCHAIN_REGISTRY_PATH,
  pass2V2ToolchainRoot,
  validateCanonicalV2Report,
  validateClosedSchemaRegistryV2,
  validateOutputPathRegistryV2,
  validatePass2V2ToolchainRegistry,
} from './trd2-v6-pass2-v2-core.mjs';

const [REGISTRY_PATH, REPORT_A_PATH, REPORT_B_PATH] = TRD2_V6_PASS2_V2_PATHS;
const RESTART_CHARTER_PATH = 'docs/planning/section-35-6-trd-2-v6-pass2-v2-restart-charter-2026-08-31.md';
const EXPECTED_FAMILIES = Object.freeze([
  'F015-DEPENDENT-ARTIFACT-V1', 'F015-DIRECT-OCCURRENCE-V1', 'F015-DISPOSITION-V1',
  'F015-REPLACEMENT-LEDGER-V1', 'OUTPUT-REGISTRY-BINDING-V1', 'PARSER-FIXTURE-SCHEMA-V1',
  'PARSER-FIXTURE-V1', 'PARSER-GRAMMAR-AND-CORPUS-V1', 'PARSER-GRAMMAR-V1', 'PARSER-OUTCOME-V1',
  'PARSER-REPORT-V1', 'PASS1-ACCEPTANCE-STATE-V1', 'PASS1-F015-SUMMARY-V1',
  'PASS1-GENERATED-ARTIFACT-V1', 'PASS1-GENERATION-RECEIPT-V1', 'PASS1-PARSER-AGREEMENT-V1',
  'PASS1-PASS-STATE-V1', 'PASS1-PRODUCER-QA-V1', 'REQUIREMENT-SOURCE-BINDING-V2', 'REQUIREMENT-V2',
  'SOURCE-CAPTURE-MANIFEST-V1', 'SOURCE-CAPTURE-ROW-V1', 'SOURCE-CAPTURE-V1', 'TOOLCHAIN-FILE-V1',
  'TOOLCHAIN-REGISTRY-BINDING-V1',
].sort());

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
  return result.stdout;
}

function readCommitBlob(commitId, logicalPath) {
  return runGit(['show', `${commitId}:${logicalPath}`], null);
}

function worktreeMode() {
  const paths = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null)
    .toString('utf8').split('\0').filter(Boolean).map((record) => record.slice(3));
  if (paths.length === 0) return 'COMMITTED-CLEAN';
  const expected = new Set(TRD2_V6_PASS2_V2_PATHS);
  if (paths.length !== expected.size || paths.some((logicalPath) => !expected.has(logicalPath))) throw new Error('Pass 2 v2 verifier found unrelated or incomplete worktree changes');
  return 'WORKTREE-CANDIDATE';
}

function verifyOutputBoundary() {
  for (const logicalPath of [...TRD2_V6_PASS1_REUSED_PATHS, ...TRD2_V6_PASS2_V1_REJECTED_PATHS, ...TRD2_V6_PASS2_V2_PATHS]) if (!fs.existsSync(logicalPath)) throw new Error(`required immutable/current artifact missing: ${logicalPath}`);
  const allowed = new Set([...TRD2_V6_PASS1_REUSED_PATHS, ...TRD2_V6_PASS2_V2_PATHS]);
  const future = [...TRD2_V6_PASS2_V2_NORMATIVE_PATHS, ...TRD2_V6_PASS2_V2_PRODUCER_PATHS, ...TRD2_V6_PASS2_V2_EXTERNAL_PATHS]
    .filter((logicalPath) => !allowed.has(logicalPath));
  for (const logicalPath of future) if (fs.existsSync(logicalPath)) throw new Error(`future Pass 3-6/external artifact appeared during Pass 2 v2: ${logicalPath}`);
}

function assertRow(row, expectedPath, observedHead, expectedDisposition) {
  const bytes = readCommitBlob(observedHead, expectedPath);
  if (row.logicalPath !== expectedPath || row.observedCommit !== observedHead || row.byteLength !== bytes.length || row.sha256 !== sha256Bytes(bytes)) throw new Error(`provenance row mismatch: ${expectedPath}`);
  if (expectedDisposition !== undefined) {
    const parsed = JSON.parse(bytes.toString('utf8'));
    if (row.disposition !== expectedDisposition || row.artifactRoot !== parsed.artifactRoot) throw new Error(`artifact disposition mismatch: ${expectedPath}`);
  }
}

function verifyProvenance(registry) {
  const provenance = registry.provenance;
  const expectedKeys = ['observedHead', 'observedObjectFormat', 'outputRegistrySha256', 'rejectedPassTwoV1', 'requirementSource', 'restartCharterSha256', 'reusedPassOne', 'toolchain', 'toolchainRegistrySha256', 'toolchainRoot'].sort();
  if (canonicalV6(Object.keys(provenance).sort()) !== canonicalV6(expectedKeys)) throw new Error('Pass 2 v2 provenance exact keys mismatch');
  const observedHead = provenance.observedHead;
  if (observedHead !== runGit(['rev-parse', observedHead]).trim() || provenance.observedObjectFormat !== runGit(['rev-parse', '--show-object-format']).trim()) throw new Error('Pass 2 v2 observed Git identity mismatch');
  const outputRegistryBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_V2_OUTPUT_REGISTRY_PATH);
  const toolchainRegistryBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_V2_TOOLCHAIN_REGISTRY_PATH);
  validateOutputPathRegistryV2(JSON.parse(outputRegistryBytes.toString('utf8')));
  validatePass2V2ToolchainRegistry(JSON.parse(toolchainRegistryBytes.toString('utf8')));
  if (provenance.outputRegistrySha256 !== sha256Bytes(outputRegistryBytes) || provenance.toolchainRegistrySha256 !== sha256Bytes(toolchainRegistryBytes)) throw new Error('Pass 2 v2 registry provenance mismatch');
  if (!Array.isArray(provenance.toolchain) || provenance.toolchain.length !== TRD2_V6_PASS2_V2_TOOLCHAIN_PATHS.length) throw new Error('Pass 2 v2 toolchain denominator mismatch');
  provenance.toolchain.forEach((row, index) => assertRow(row, TRD2_V6_PASS2_V2_TOOLCHAIN_PATHS[index], observedHead));
  if (provenance.toolchainRoot !== pass2V2ToolchainRoot(provenance.toolchain)) throw new Error('Pass 2 v2 toolchain root mismatch');
  if (!Array.isArray(provenance.reusedPassOne) || provenance.reusedPassOne.length !== TRD2_V6_PASS1_REUSED_PATHS.length) throw new Error('Pass 1 reuse denominator mismatch');
  provenance.reusedPassOne.forEach((row, index) => assertRow(row, TRD2_V6_PASS1_REUSED_PATHS[index], observedHead, 'IMMUTABLE-REUSED'));
  if (!Array.isArray(provenance.rejectedPassTwoV1) || provenance.rejectedPassTwoV1.length !== TRD2_V6_PASS2_V1_REJECTED_PATHS.length) throw new Error('Rejected Pass 2 v1 denominator mismatch');
  provenance.rejectedPassTwoV1.forEach((row, index) => assertRow(row, TRD2_V6_PASS2_V1_REJECTED_PATHS[index], observedHead, 'REJECTED-SUPERSEDED-NOT-REUSABLE'));
  const requirementBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH);
  if (provenance.requirementSource.requirementCount !== 128 || provenance.requirementSource.byteLength !== requirementBytes.length || provenance.requirementSource.sha256 !== sha256Bytes(requirementBytes) || provenance.requirementSource.logicalPath !== TRD2_V6_PASS2_V2_REQUIREMENT_SOURCE_PATH || provenance.requirementSource.observedCommit !== observedHead) throw new Error('Requirement source provenance mismatch');
  if (provenance.restartCharterSha256 !== sha256Bytes(readCommitBlob(observedHead, RESTART_CHARTER_PATH))) throw new Error('Restart charter provenance mismatch');
  return observedHead;
}

function verifyActualLocators(registry, observedHead) {
  const sourceCache = new Map();
  for (const fixture of registry.fixtures.filter(({ fixtureClass }) => fixtureClass === 'ACTUAL-POSITIVE')) {
    const locator = fixture.sourceLocator;
    if (!sourceCache.has(locator.logicalPath)) sourceCache.set(locator.logicalPath, readCommitBlob(observedHead, locator.logicalPath));
    const bytes = sourceCache.get(locator.logicalPath);
    if (sha256Bytes(bytes) !== locator.sourceSha256 || locator.endByte > bytes.length) throw new Error(`Actual locator source mismatch: ${fixture.fixtureId}`);
    if (locator.captureMode === 'WHOLE-FILE-WITH-JSON-POINTER') {
      if (locator.startByte !== 0 || locator.endByte !== bytes.length || locator.captureSha256 !== locator.sourceSha256) throw new Error(`Whole-file locator mismatch: ${fixture.fixtureId}`);
    } else if (sha256Bytes(bytes.subarray(locator.startByte, locator.endByte)) !== locator.captureSha256) throw new Error(`Exact requirement capture mismatch: ${fixture.fixtureId}`);
  }
}

function verifyRequirementContract(registry) {
  const schema = registry.schemas.find(({ family }) => family === 'REQUIREMENT-V2');
  const binding = registry.schemas.find(({ family }) => family === 'REQUIREMENT-SOURCE-BINDING-V2');
  if (schema?.actualPositiveCount !== 128 || binding?.actualPositiveCount !== 128) throw new Error('Requirement/binding denominator mismatch');
  const contentSpec = schema.rootSpec.properties.content;
  const required = ['statement', 'defectCauseImpact', 'proofPredicate', 'dependencies', 'sourceBasis'].sort();
  if (contentSpec.kind !== 'Object' || contentSpec.additionalProperties !== false || canonicalV6(Object.keys(contentSpec.properties).sort()) !== canonicalV6(required) || canonicalV6([...contentSpec.required].sort()) !== canonicalV6(required)) throw new Error('Requirement does not contain exactly five content fields');
}

function main() {
  const mode = worktreeMode();
  verifyOutputBoundary();
  const registry = validateClosedSchemaRegistryV2(JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')));
  const observedHead = verifyProvenance(registry);
  verifyActualLocators(registry, observedHead);
  if (registry.actualPositiveCount !== 391 || registry.schemas.length !== EXPECTED_FAMILIES.length || canonicalV6(registry.schemas.map(({ family }) => family).sort()) !== canonicalV6(EXPECTED_FAMILIES)) throw new Error('Actual-positive family/record denominator mismatch');
  verifyRequirementContract(registry);
  const reportA = validateCanonicalV2Report(JSON.parse(fs.readFileSync(REPORT_A_PATH, 'utf8')), registry);
  const reportB = validateCanonicalV2Report(JSON.parse(fs.readFileSync(REPORT_B_PATH, 'utf8')), registry);
  if (reportA.engineId !== 'CANONICAL-V2-ENGINE-A' || reportB.engineId !== 'CANONICAL-V2-ENGINE-B' || reportA.sourceSha256 === reportB.sourceSha256) throw new Error('Canonical v2 engine separation mismatch');
  const frozenA = registry.provenance.toolchain.find(({ logicalPath }) => logicalPath === 'scripts/verify-trd2-v6-canonical-v2-engine-a.mjs');
  const frozenB = registry.provenance.toolchain.find(({ logicalPath }) => logicalPath === 'scripts/verify-trd2-v6-canonical-v2-engine-b.py');
  if (frozenA?.sha256 !== reportA.sourceSha256 || frozenB?.sha256 !== reportB.sourceSha256) throw new Error('Canonical v2 engine source provenance mismatch');
  if (canonicalV6(reportA.outcomes) !== canonicalV6(reportB.outcomes) || reportA.outcomeRoot !== reportB.outcomeRoot || reportA.mismatchCount !== 0 || reportB.mismatchCount !== 0 || reportA.status !== 'PASS' || reportB.status !== 'PASS') throw new Error('Canonical v2 engines disagree or observed a mismatch');
  const actualOutcomes = reportA.outcomes.slice(0, registry.actualPositiveCount);
  const mutationOutcomes = reportA.outcomes.slice(registry.actualPositiveCount);
  if (actualOutcomes.some(({ observedStatus, observedTerminal }) => observedStatus !== 'PASS' || observedTerminal !== 'ACCEPT')) throw new Error('An actual positive did not pass');
  if (mutationOutcomes.some(({ observedStatus }) => observedStatus !== 'BLOCK')) throw new Error('A mutation did not block');
  process.stdout.write(`${JSON.stringify({
    acceptance: 0,
    actualPositiveAgreement: `${registry.actualPositiveCount}/${registry.actualPositiveCount}`,
    engineAgreement: `${registry.fixtureCount}/${registry.fixtureCount}`,
    findingClosure: '0/15',
    fixtureCount: registry.fixtureCount,
    mutationAgreement: `${registry.mutationFixtureCount}/${registry.mutationFixtureCount}`,
    observedHead,
    outcomeRoot: reportA.outcomeRoot,
    pass: '2-v2',
    rejectedV1ReusableForPass3: false,
    requirementCoverage: '128/128',
    reviewGenerations: '0/2',
    schemaCount: registry.schemaCount,
    selfReviewRemediation: '5/5-LOCAL',
    status: 'PASS-2-V2-LOCAL-CANDIDATE-COMPLETE-EXTERNAL-CLOSURE-ZERO',
    worktreeMode: mode,
  }, null, 2)}\n`);
}

main();
