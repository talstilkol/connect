#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { canonicalV6, rootV6, sha256Bytes } from './trd2-v6-core.mjs';
import {
  TRD2_V6_PASS1_REUSED_PATHS,
  TRD2_V6_PASS2_V1_REJECTED_PATHS,
  TRD2_V6_PASS2_V2_PATHS,
  validateCanonicalV2Report,
  validateClosedSchemaRegistryV2,
} from './trd2-v6-pass2-v2-core.mjs';
import {
  TRD2_V6_PASS2_V3_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS2_V3_PATHS,
  TRD2_V6_PASS2_V3_RESTART_CHARTER_PATH,
  TRD2_V6_PASS2_V3_TOOLCHAIN_PATHS,
  TRD2_V6_PASS2_V3_TOOLCHAIN_REGISTRY_PATH,
  pass2V3ToolchainRoot,
  validateCanonicalV3Report,
  validateClosedSchemaRegistryV3,
  validateOutputPathRegistryV3,
  validatePass2V3ToolchainRegistry,
} from './trd2-v6-pass2-v3-core.mjs';
import { TRD2_V6_PASS2_V3_FUTURE_DEFINITIONS } from './trd2-v6-pass2-v3-schema-catalog.mjs';

const [REGISTRY_PATH, REPORT_A_PATH, REPORT_B_PATH] = TRD2_V6_PASS2_V3_PATHS;
const V2_REGISTRY_PATH = TRD2_V6_PASS2_V2_PATHS[0];
const V2_REPORT_A_PATH = TRD2_V6_PASS2_V2_PATHS[1];
const V2_REPORT_B_PATH = TRD2_V6_PASS2_V2_PATHS[2];
const SCRIPT_PATH = 'scripts/verify-trd2-v6-pass2-v3-candidate.mjs';
const REQUIREMENT_FIELDS = Object.freeze(['statement', 'defectCauseImpact', 'proofPredicate', 'dependencies', 'sourceBasis']);

function runGit(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
  return result.stdout;
}

function readCommitBlob(commitId, logicalPath) {
  return runGit(['show', `${commitId}:${logicalPath}`], null);
}

function worktreeMode() {
  const paths = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], null).toString('utf8').split('\0').filter(Boolean).map((record) => record.slice(3));
  if (paths.length === 0) return 'COMMITTED-CLEAN';
  if (paths.length === TRD2_V6_PASS2_V3_PATHS.length && paths.every((path) => TRD2_V6_PASS2_V3_PATHS.includes(path))) return 'WORKTREE-CANDIDATE';
  throw new Error(`Pass 2 v3 verifier found unrelated or incomplete worktree changes: ${paths.join(', ')}`);
}

function assertExactKeys(value, keys, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || canonicalV6(Object.keys(value).sort()) !== canonicalV6([...keys].sort())) throw new Error(`${label}: exact keys mismatch`);
}

function assertEvidenceRow(row, observedHead, expectedPath) {
  assertExactKeys(row, ['artifactRoot', 'byteLength', 'logicalPath', 'observedCommit', 'sha256'], `evidence.${expectedPath}`);
  const bytes = readCommitBlob(observedHead, expectedPath);
  const parsed = JSON.parse(bytes.toString('utf8'));
  if (row.logicalPath !== expectedPath || row.observedCommit !== observedHead || row.byteLength !== bytes.length || row.sha256 !== sha256Bytes(bytes) || row.artifactRoot !== parsed.artifactRoot) throw new Error(`evidence row mismatch: ${expectedPath}`);
}

function verifyProvenance(registry) {
  const provenance = registry.provenance;
  assertExactKeys(provenance, ['observedHead', 'observedObjectFormat', 'outputRegistrySha256', 'restartCharterSha256', 'toolchain', 'toolchainRegistrySha256', 'toolchainRoot', 'v2Evidence'], 'provenance');
  const observedHead = provenance.observedHead;
  if (observedHead !== runGit(['rev-parse', observedHead]).trim() || provenance.observedObjectFormat !== runGit(['rev-parse', '--show-object-format']).trim()) throw new Error('v3 observed Git identity mismatch');
  const outputRegistryBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_V3_OUTPUT_REGISTRY_PATH);
  const toolchainRegistryBytes = readCommitBlob(observedHead, TRD2_V6_PASS2_V3_TOOLCHAIN_REGISTRY_PATH);
  const outputRegistry = validateOutputPathRegistryV3(JSON.parse(outputRegistryBytes.toString('utf8')));
  validatePass2V3ToolchainRegistry(JSON.parse(toolchainRegistryBytes.toString('utf8')));
  if (provenance.outputRegistrySha256 !== sha256Bytes(outputRegistryBytes) || provenance.toolchainRegistrySha256 !== sha256Bytes(toolchainRegistryBytes) || provenance.restartCharterSha256 !== sha256Bytes(readCommitBlob(observedHead, TRD2_V6_PASS2_V3_RESTART_CHARTER_PATH))) throw new Error('v3 registry/charter provenance mismatch');
  if (!Array.isArray(provenance.toolchain) || provenance.toolchain.length !== TRD2_V6_PASS2_V3_TOOLCHAIN_PATHS.length) throw new Error('v3 toolchain denominator mismatch');
  provenance.toolchain.forEach((row, index) => {
    assertExactKeys(row, ['byteLength', 'logicalPath', 'observedCommit', 'sha256'], `toolchain.${index}`);
    const logicalPath = TRD2_V6_PASS2_V3_TOOLCHAIN_PATHS[index];
    const bytes = readCommitBlob(observedHead, logicalPath);
    if (row.logicalPath !== logicalPath || row.observedCommit !== observedHead || row.byteLength !== bytes.length || row.sha256 !== sha256Bytes(bytes)) throw new Error(`v3 toolchain row mismatch: ${logicalPath}`);
  });
  if (provenance.toolchainRoot !== pass2V3ToolchainRoot(provenance.toolchain)) throw new Error('v3 toolchain root mismatch');
  for (const logicalPath of [SCRIPT_PATH, 'scripts/trd2-v6-pass2-v3-core.mjs', 'scripts/trd2-v6-pass2-v3-schema-catalog.mjs', 'scripts/verify-trd2-v6-canonical-v3-engine-a.mjs', 'scripts/verify-trd2-v6-canonical-v3-engine-b.py']) {
    const frozen = provenance.toolchain.find((row) => row.logicalPath === logicalPath);
    if (frozen?.sha256 !== sha256Bytes(fs.readFileSync(logicalPath))) throw new Error(`runtime differs from frozen v3 toolchain: ${logicalPath}`);
  }
  assertExactKeys(provenance.v2Evidence, ['outcomeRoot', 'registry', 'reportA', 'reportB', 'status'], 'provenance.v2Evidence');
  assertEvidenceRow(provenance.v2Evidence.registry, observedHead, V2_REGISTRY_PATH);
  assertEvidenceRow(provenance.v2Evidence.reportA, observedHead, V2_REPORT_A_PATH);
  assertEvidenceRow(provenance.v2Evidence.reportB, observedHead, V2_REPORT_B_PATH);
  const v2Registry = validateClosedSchemaRegistryV2(JSON.parse(readCommitBlob(observedHead, V2_REGISTRY_PATH).toString('utf8')));
  const v2ReportA = validateCanonicalV2Report(JSON.parse(readCommitBlob(observedHead, V2_REPORT_A_PATH).toString('utf8')), v2Registry);
  const v2ReportB = validateCanonicalV2Report(JSON.parse(readCommitBlob(observedHead, V2_REPORT_B_PATH).toString('utf8')), v2Registry);
  if (provenance.v2Evidence.status !== 'BOUNDED-ACTUAL-EVIDENCE-REVALIDATED;NOT-COMPLETE-SCHEMA-REGISTRY' || provenance.v2Evidence.outcomeRoot !== v2ReportA.outcomeRoot || v2ReportA.outcomeRoot !== v2ReportB.outcomeRoot || canonicalV6(v2ReportA.outcomes) !== canonicalV6(v2ReportB.outcomes)) throw new Error('v2 bounded evidence mismatch');
  const bindings = Object.entries(outputRegistry.plannedTopLevelSchemas).sort(([left], [right]) => Buffer.compare(Buffer.from(left), Buffer.from(right))).map(([logicalPath, schemaId]) => {
    const schema = registry.schemas.find((candidate) => candidate.schemaId === schemaId);
    return { builtin: schemaId.startsWith('BUILTIN-'), logicalPath, schemaId, schemaRoot: schema?.schemaRoot ?? null };
  });
  if (canonicalV6(bindings) !== canonicalV6(registry.outputBindings)) throw new Error('output registry differs from committed schema bindings');
  return { observedHead, v2Registry };
}

function verifyOutputBoundary(outputRegistry) {
  for (const logicalPath of [...TRD2_V6_PASS1_REUSED_PATHS, ...TRD2_V6_PASS2_V1_REJECTED_PATHS, ...TRD2_V6_PASS2_V2_PATHS, ...TRD2_V6_PASS2_V3_PATHS]) if (!fs.existsSync(logicalPath)) throw new Error(`required historical/current artifact missing: ${logicalPath}`);
  const allowed = new Set([...TRD2_V6_PASS1_REUSED_PATHS, ...TRD2_V6_PASS2_V3_PATHS]);
  const future = [...outputRegistry.normativePackageMemberPaths, ...outputRegistry.producerOnlyPaths, ...outputRegistry.externalReviewAndAcceptancePaths].filter((logicalPath) => !allowed.has(logicalPath));
  for (const logicalPath of future) if (fs.existsSync(logicalPath)) throw new Error(`future Pass 3-6/external artifact appeared during Pass 2 v3: ${logicalPath}`);
}

function decodeJsonPointer(root, pointer) {
  if (pointer === '') return root;
  if (!pointer.startsWith('/')) throw new Error(`malformed JSON Pointer: ${pointer}`);
  return pointer.slice(1).split('/').reduce((current, encoded) => {
    const segment = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
    if (Array.isArray(current)) {
      if (!/^(0|[1-9][0-9]*)$/.test(segment) || Number(segment) >= current.length) throw new Error(`missing JSON array pointer: ${pointer}`);
      return current[Number(segment)];
    }
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, segment)) throw new Error(`missing JSON object pointer: ${pointer}`);
    return current[segment];
  }, root);
}

function utf8Offset(text, characterOffset) {
  return Buffer.byteLength(text.slice(0, characterOffset), 'utf8');
}

function reconstructRequirement(sourceBytes, locator, family) {
  const captureBytes = sourceBytes.subarray(locator.startByte, locator.endByte);
  const block = captureBytes.toString('utf8');
  if (!Buffer.from(block, 'utf8').equals(captureBytes)) throw new Error(`requirement is not strict UTF-8: ${locator.jsonPointer}`);
  const heading = block.match(/^## \d+\.\d+ `(?<id>TRD2V5-REQ-\d{3})`[^\r\n]*$/m);
  if (heading === null || heading.index !== 0 || locator.jsonPointer !== `#${heading.groups.id}`) throw new Error(`requirement heading mismatch: ${locator.jsonPointer}`);
  const fields = [...block.matchAll(/^- `(?<name>statement|defectCauseImpact|proofPredicate|dependencies|sourceBasis)`: (?<value>[^\r\n]*)$/gm)];
  if (fields.length !== 5 || canonicalV6(fields.map((match) => match.groups.name)) !== canonicalV6(REQUIREMENT_FIELDS)) throw new Error(`requirement field mismatch: ${heading.groups.id}`);
  const content = Object.fromEntries(fields.map((match) => [match.groups.name, match.groups.value]));
  const requirementRoot = rootV6('REQUIREMENT', 'CONNECT-TRD2-V6-REQUIREMENT-RECORD-V2', content);
  if (family === 'REQUIREMENT-V2') return { content, recordKind: 'REQUIREMENT', requirementId: heading.groups.id, requirementRoot, schemaVersion: 'CONNECT-TRD2-V6-REQUIREMENT-RECORD-V2' };
  if (family !== 'REQUIREMENT-SOURCE-BINDING-V2') throw new Error(`unexpected requirement family: ${family}`);
  const last = fields.at(-1);
  return {
    captureSha256: sha256Bytes(captureBytes),
    contentEndByte: locator.startByte + utf8Offset(block, last.index + last[0].length),
    contentStartByte: locator.startByte + utf8Offset(block, fields[0].index),
    headingStartByte: locator.startByte,
    recordKind: 'REQUIREMENT-SOURCE-BINDING',
    requirementId: heading.groups.id,
    requirementRoot,
    schemaVersion: 'CONNECT-TRD2-V6-REQUIREMENT-SOURCE-BINDING-V2',
    sourcePath: locator.logicalPath,
    sourceSha256: locator.sourceSha256,
  };
}

function verifyActualSources(registry, v2Registry) {
  const v2ById = new Map(v2Registry.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const schemaById = new Map(registry.schemas.map((schema) => [schema.schemaId, schema]));
  for (const predecessor of v2Registry.schemas) {
    const successor = schemaById.get(predecessor.schemaId);
    if (successor === undefined || successor.familyStatus !== 'ACTUAL-POSITIVE' || successor.predecessorSchemaRoot !== predecessor.schemaRoot || successor.actualPositiveCount !== predecessor.actualPositiveCount || successor.constructionFixtureCount !== 0 || successor.family !== predecessor.family || canonicalV6(successor.rootSpec) !== canonicalV6(predecessor.rootSpec) || canonicalV6(successor.contentIdentity) !== canonicalV6(predecessor.contentIdentity) || canonicalV6(successor.sourcePaths) !== canonicalV6(predecessor.sourcePaths)) throw new Error(`v2 actual schema lineage mismatch: ${predecessor.schemaId}`);
  }
  const sourceCache = new Map();
  const parsedCache = new Map();
  const actual = registry.fixtures.filter(({ fixtureClass }) => fixtureClass === 'ACTUAL-POSITIVE');
  if (actual.length !== 391) throw new Error(`actual source denominator ${actual.length}/391`);
  const inherited = registry.fixtures.filter(({ sourceFixtureId }) => sourceFixtureId !== null);
  if (inherited.length !== 515 || canonicalV6(inherited.map(({ sourceFixtureId }) => sourceFixtureId).sort()) !== canonicalV6([...v2ById.keys()].sort())) throw new Error(`v2 fixture lineage denominator/coverage mismatch: ${inherited.length}/515`);
  for (const fixture of inherited) {
    const predecessor = v2ById.get(fixture.sourceFixtureId);
    if (predecessor === undefined || predecessor.fixtureRoot !== fixture.sourceFixtureRoot || predecessor.schemaId !== fixture.schemaId || predecessor.bytesBase64 !== fixture.bytesBase64Chunks.join('') || predecessor.sha256 !== fixture.sha256 || canonicalV6(predecessor.sourceLocator) !== canonicalV6(fixture.sourceLocator)) throw new Error(`v2 fixture lineage mismatch: ${fixture.fixtureId}`);
  }
  const reconstructed = new Set();
  for (const fixture of actual) {
    const locator = fixture.sourceLocator;
    if (!sourceCache.has(`${locator.sourceCommit}:${locator.logicalPath}`)) sourceCache.set(`${locator.sourceCommit}:${locator.logicalPath}`, readCommitBlob(locator.sourceCommit, locator.logicalPath));
    const sourceBytes = sourceCache.get(`${locator.sourceCommit}:${locator.logicalPath}`);
    if (sha256Bytes(sourceBytes) !== locator.sourceSha256 || locator.startByte < 0 || locator.endByte > sourceBytes.length || locator.startByte > locator.endByte) throw new Error(`actual locator bounds/source mismatch: ${fixture.fixtureId}`);
    let value;
    if (locator.captureMode === 'WHOLE-FILE-WITH-JSON-POINTER') {
      if (locator.startByte !== 0 || locator.endByte !== sourceBytes.length || locator.captureSha256 !== locator.sourceSha256) throw new Error(`whole-file locator mismatch: ${fixture.fixtureId}`);
      const cacheKey = `${locator.sourceCommit}:${locator.logicalPath}`;
      if (!parsedCache.has(cacheKey)) parsedCache.set(cacheKey, JSON.parse(sourceBytes.toString('utf8')));
      value = decodeJsonPointer(parsedCache.get(cacheKey), locator.jsonPointer);
    } else if (locator.captureMode === 'EXACT-MARKDOWN-REQUIREMENT-BLOCK') {
      if (sha256Bytes(sourceBytes.subarray(locator.startByte, locator.endByte)) !== locator.captureSha256) throw new Error(`requirement capture mismatch: ${fixture.fixtureId}`);
      value = reconstructRequirement(sourceBytes, locator, schemaById.get(fixture.schemaId).family);
    } else throw new Error(`unknown source capture mode: ${locator.captureMode}`);
    const rebuilt = Buffer.from(canonicalV6(value), 'utf8');
    if (rebuilt.toString('base64') !== fixture.bytesBase64Chunks.join('') || sha256Bytes(rebuilt) !== fixture.sha256) throw new Error(`fixture differs from independently resolved source: ${fixture.fixtureId}`);
    const key = `${fixture.schemaId}\0${locator.sourceCommit}\0${locator.logicalPath}\0${locator.jsonPointer}`;
    if (reconstructed.has(key)) throw new Error(`duplicate actual source locator: ${key}`);
    reconstructed.add(key);
  }
  if (reconstructed.size !== 391) throw new Error(`independent actual inventory ${reconstructed.size}/391`);
}

function verifyFutureCatalog(registry) {
  const future = registry.schemas.filter(({ familyStatus }) => familyStatus === 'FUTURE-CONSTRUCTION');
  if (future.length !== TRD2_V6_PASS2_V3_FUTURE_DEFINITIONS.length) throw new Error('future catalog denominator mismatch');
  const schemaById = new Map(future.map((schema) => [schema.schemaId, schema]));
  for (const definition of TRD2_V6_PASS2_V3_FUTURE_DEFINITIONS) {
    const schema = schemaById.get(definition.schemaId);
    if (schema === undefined || schema.family !== definition.family || canonicalV6(schema.rootSpec) !== canonicalV6(definition.rootSpec) || canonicalV6(schema.invariants) !== canonicalV6(definition.invariants) || canonicalV6(schema.contentIdentity) !== canonicalV6(definition.contentIdentity)) throw new Error(`future catalog binding mismatch: ${definition.schemaId}`);
    const construction = registry.fixtures.filter((fixture) => fixture.schemaId === schema.schemaId && fixture.fixtureClass === 'FUTURE-CONSTRUCTION');
    const mutations = registry.fixtures.filter((fixture) => fixture.schemaId === schema.schemaId && fixture.fixtureClass === 'MUTATION');
    if (construction.length !== 1 || mutations.length < 3 || !['UNKNOWN-FIELD', 'MISSING-FIELD', 'CONTENT-IDENTITY-MISMATCH'].every((name) => mutations.some(({ mutation }) => mutation === name))) throw new Error(`future construction/mutation coverage mismatch: ${definition.schemaId}`);
  }
}

function verifyEngineReports(registry) {
  const reportA = validateCanonicalV3Report(JSON.parse(fs.readFileSync(REPORT_A_PATH, 'utf8')), registry);
  const reportB = validateCanonicalV3Report(JSON.parse(fs.readFileSync(REPORT_B_PATH, 'utf8')), registry);
  if (reportA.engineId !== 'CANONICAL-V3-ENGINE-A' || reportB.engineId !== 'CANONICAL-V3-ENGINE-B' || reportA.sourceSha256 === reportB.sourceSha256) throw new Error('v3 engine separation mismatch');
  if (reportA.status !== 'PASS' || reportB.status !== 'PASS' || reportA.mismatchCount !== 0 || reportB.mismatchCount !== 0 || reportA.outcomeRoot !== reportB.outcomeRoot || canonicalV6(reportA.outcomes) !== canonicalV6(reportB.outcomes)) throw new Error('v3 engines disagree or found mismatch');
  const frozenA = registry.provenance.toolchain.find(({ logicalPath }) => logicalPath === 'scripts/verify-trd2-v6-canonical-v3-engine-a.mjs');
  const frozenB = registry.provenance.toolchain.find(({ logicalPath }) => logicalPath === 'scripts/verify-trd2-v6-canonical-v3-engine-b.py');
  if (frozenA?.sha256 !== reportA.sourceSha256 || frozenB?.sha256 !== reportB.sourceSha256) throw new Error('v3 engine source provenance mismatch');
  const sourceA = fs.readFileSync('scripts/verify-trd2-v6-canonical-v3-engine-a.mjs', 'utf8');
  const sourceB = fs.readFileSync('scripts/verify-trd2-v6-canonical-v3-engine-b.py', 'utf8');
  if (sourceA.includes('verify-trd2-v6-canonical-v3-engine-b') || sourceB.includes('verify-trd2-v6-canonical-v3-engine-a')) throw new Error('v3 engine implementations are not separated');
  return reportA;
}

function verifyNoForbiddenRandomness() {
  for (const logicalPath of TRD2_V6_PASS2_V3_TOOLCHAIN_PATHS.filter((path) => path.endsWith('.mjs') || path.endsWith('.py'))) {
    const source = fs.readFileSync(logicalPath, 'utf8');
    if (source.includes('Math' + '.random(') || source.includes('crypto' + '.randomUUID(')) throw new Error(`forbidden random source in ${logicalPath}`);
  }
}

function main() {
  const mode = worktreeMode();
  const outputRegistry = validateOutputPathRegistryV3(JSON.parse(fs.readFileSync(TRD2_V6_PASS2_V3_OUTPUT_REGISTRY_PATH, 'utf8')));
  verifyOutputBoundary(outputRegistry);
  const registry = validateClosedSchemaRegistryV3(JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')));
  const { observedHead, v2Registry } = verifyProvenance(registry);
  verifyActualSources(registry, v2Registry);
  verifyFutureCatalog(registry);
  const report = verifyEngineReports(registry);
  verifyNoForbiddenRandomness();
  process.stdout.write(`${JSON.stringify({
    acceptance: 0,
    actualMutationAgreement: `${registry.actualMutationCount}/${registry.actualMutationCount}`,
    actualPositiveAgreement: `${registry.actualPositiveCount}/${registry.actualPositiveCount}`,
    engineAgreement: `${registry.fixtureCount}/${registry.fixtureCount}`,
    findingClosure: '0/15',
    fixtureCount: registry.fixtureCount,
    futureConstructionAgreement: `${registry.futureConstructionCount}/${registry.futureConstructionCount}`,
    futureMutationAgreement: `${registry.futureMutationCount}/${registry.futureMutationCount}`,
    gate29: 'BLOCKED',
    mode,
    observedHead,
    outcomeRoot: report.outcomeRoot,
    outputSchemaCoverage: `${registry.outputBindingCount}/30`,
    pass: '2-v3',
    referenceEdges: registry.referenceEdgeCount,
    requirementCoverage: '128/128',
    reviewGenerations: '0/2',
    schemaCount: registry.schemaCount,
    status: 'PASS-LOCAL-COMPLETE-SCHEMA-UNIVERSE;NO-ACCEPTANCE-CREDIT',
  }, null, 2)}\n`);
}

main();
