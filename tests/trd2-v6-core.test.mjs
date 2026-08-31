import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  TRD2_V6_EXTERNAL_PATHS,
  TRD2_V6_F015_DEPENDENT_PATHS,
  TRD2_V6_F015_OBSERVATION_PATHS,
  TRD2_V6_NORMATIVE_PATHS,
  TRD2_V6_OUTPUT_REGISTRY_PATH,
  TRD2_V6_PASS1_PATHS,
  TRD2_V6_PRODUCER_PATHS,
  TRD2_V6_TOOLCHAIN_PATHS,
  TRD2_V6_TOOLCHAIN_REGISTRY_PATH,
  V6ParseError,
  attachContentIdentity,
  canonicalV6,
  executeParserFixture,
  makeParserGrammarAndCorpus,
  makeParserReport,
  parseCanonicalJsonBytes,
  rootV6,
  validateContentIdentity,
  validateOutputPathRegistry,
  validateParserGrammarAndCorpus,
  validateParserReport,
  validateToolchainPathRegistry,
} from '../scripts/trd2-v6-core.mjs';

test('canonical v6 ordering is insertion-order independent and UTF-8 byte ordered', () => {
  const left = { z: 3, a: 1, b: { y: 2, x: 1 } };
  const right = { b: { x: 1, y: 2 }, a: 1, z: 3 };
  assert.equal(canonicalV6(left), canonicalV6(right));
  assert.equal(canonicalV6(left), '{"a":1,"b":{"x":1,"y":2},"z":3}');
});

test('v6 root has a fixed cross-language conformance vector', () => {
  const value = { enabled: true, label: 'שמירה', ordinal: 7, roots: ['0'.repeat(64)] };
  assert.equal(
    rootV6('CROSS-LANGUAGE-VECTOR', 'CONNECT-TRD2-V6-ROOT-TEST-V1', value),
    '4cf5141b6f879d36a8fc83aeebab05bd9baa62d8272003295b082b0a2ae20c38',
  );
});

test('content IDs exclude their own identity fields and change with the body', () => {
  const first = attachContentIdentity('TRD2V6-TEST', 'TEST-RECORD', 'CONNECT-TRD2-V6-TEST-V1', { value: 1 });
  validateContentIdentity(first, 'TRD2V6-TEST', 'TEST-RECORD', 'CONNECT-TRD2-V6-TEST-V1');
  const second = attachContentIdentity('TRD2V6-TEST', 'TEST-RECORD', 'CONNECT-TRD2-V6-TEST-V1', { value: 2 });
  assert.notEqual(first.artifactId, second.artifactId);
  const weakened = structuredClone(first);
  weakened.value = 2;
  assert.throws(() => validateContentIdentity(weakened, 'TRD2V6-TEST', 'TEST-RECORD', 'CONNECT-TRD2-V6-TEST-V1'));
});

test('canonical v6 rejects non-safe numbers and non-NFC strings', () => {
  assert.throws(() => canonicalV6(1.5));
  assert.throws(() => canonicalV6(Number.MAX_SAFE_INTEGER + 1));
  assert.throws(() => canonicalV6('e\u0301'));
});

test('strict parser rejects duplicate keys before canonical comparison', () => {
  assert.throws(
    () => parseCanonicalJsonBytes(Buffer.from('{"a":1,"a":2}', 'utf8')),
    (error) => error instanceof V6ParseError && error.terminal === 'DUPLICATE-KEY',
  );
});

test('strict parser rejects reordered keys as non-canonical', () => {
  assert.throws(
    () => parseCanonicalJsonBytes(Buffer.from('{"b":2,"a":1}', 'utf8')),
    (error) => error instanceof V6ParseError && error.terminal === 'NON-CANONICAL-ENCODING',
  );
});

test('parser corpus contains exact positive bytes and all required hostile mutations', () => {
  const artifact = validateParserGrammarAndCorpus(makeParserGrammarAndCorpus());
  assert.equal(artifact.positiveFixtureCount, 3);
  assert.equal(artifact.negativeFixtureCount, 15);
  assert.equal(new Set([...artifact.positiveFixtures, ...artifact.negativeFixtures].map(({ fixtureId }) => fixtureId)).size, 18);
  assert.deepEqual(
    artifact.negativeFixtures.slice(0, 9).map(({ mutation }) => mutation),
    [
      'DUPLICATE-FIELD',
      'UNKNOWN-FIELD',
      'MISSING-FIELD',
      'INVALID-UTF8',
      'AMBIGUOUS-QUOTE',
      'TRUNCATED-RECORD',
      'INVALID-ESCAPE',
      'REORDERED-NON-CANONICAL-KEY',
      'TRAILING-BYTES',
    ],
  );
});

test('every corpus fixture executes at its exact expected terminal', () => {
  const artifact = makeParserGrammarAndCorpus();
  for (const fixture of [...artifact.positiveFixtures, ...artifact.negativeFixtures]) {
    const observed = executeParserFixture(Buffer.from(fixture.bytesBase64, 'base64'));
    assert.equal(observed.status, fixture.expectedStatus, fixture.mutation);
    assert.equal(observed.terminal, fixture.expectedTerminal, fixture.mutation);
    assert.equal(observed.decodedRoot, fixture.expectedDecodedRoot, fixture.mutation);
  }
});

test('Parser A report binds all outcomes and rejects an altered outcome root', () => {
  const artifact = makeParserGrammarAndCorpus();
  const report = makeParserReport({
    artifact,
    implementation: 'NODE-TEST-IMPLEMENTATION',
    parserId: 'PARSER-A',
    sourceSha256: '1'.repeat(64),
    toolchainRoot: '2'.repeat(64),
  });
  validateParserReport(report, artifact);
  assert.equal(report.outcomeCount, 18);
  assert.equal(report.mismatchCount, 0);
  const weakened = structuredClone(report);
  weakened.outcomeRoot = '3'.repeat(64);
  assert.throws(() => validateParserReport(weakened, artifact));
});

test('Parser report rejects an authenticated but undeclared outcome field', () => {
  const artifact = makeParserGrammarAndCorpus();
  const report = makeParserReport({
    artifact,
    implementation: 'NODE-TEST-IMPLEMENTATION',
    parserId: 'PARSER-A',
    sourceSha256: '1'.repeat(64),
    toolchainRoot: '2'.repeat(64),
  });
  const body = structuredClone(report);
  delete body.artifactId;
  delete body.artifactRoot;
  body.outcomes[0].undeclared = true;
  const authenticatedButOpen = attachContentIdentity(
    'TRD2V6-PARSER-REPORT',
    'PARSER-REPORT',
    'CONNECT-TRD2-V6-PARSER-REPORT-V1',
    body,
  );
  assert.throws(() => validateParserReport(authenticatedButOpen, artifact), /exact keys mismatch/);
});

test('output registry freezes disjoint normative, Producer and external paths', () => {
  const registry = JSON.parse(fs.readFileSync(TRD2_V6_OUTPUT_REGISTRY_PATH, 'utf8'));
  validateOutputPathRegistry(registry);
  assert.equal(TRD2_V6_NORMATIVE_PATHS.length, 12);
  assert.equal(TRD2_V6_PRODUCER_PATHS.length, 11);
  assert.equal(TRD2_V6_EXTERNAL_PATHS.length, 7);
  assert.equal(TRD2_V6_PASS1_PATHS.length, 6);
  const all = [...TRD2_V6_NORMATIVE_PATHS, ...TRD2_V6_PRODUCER_PATHS, ...TRD2_V6_EXTERNAL_PATHS];
  assert.equal(new Set(all).size, all.length);
});

test('toolchain registry freezes every Pass 1 implementation and every path exists', () => {
  const registry = JSON.parse(fs.readFileSync(TRD2_V6_TOOLCHAIN_REGISTRY_PATH, 'utf8'));
  validateToolchainPathRegistry(registry);
  assert.deepEqual(registry.toolchainPaths, TRD2_V6_TOOLCHAIN_PATHS);
  for (const logicalPath of registry.toolchainPaths) assert.equal(fs.existsSync(logicalPath), true, logicalPath);
});

test('all Pass 1 worktree guards enumerate files inside untracked directories', () => {
  for (const logicalPath of [
    'scripts/create-trd2-v6-pass1-candidate.mjs',
    'scripts/verify-trd2-v6-parser-a.mjs',
    'scripts/verify-trd2-v6-parser-b.py',
    'scripts/finalize-trd2-v6-pass1-candidate.mjs',
    'scripts/verify-trd2-v6-pass1-candidate.mjs',
  ]) {
    assert.match(fs.readFileSync(logicalPath, 'utf8'), /--untracked-files=all/, logicalPath);
  }
});

test('F015 observation and dependent-artifact denominators are unique and closed', () => {
  assert.equal(TRD2_V6_F015_OBSERVATION_PATHS.length, 4);
  assert.equal(new Set(TRD2_V6_F015_OBSERVATION_PATHS).size, 4);
  assert.equal(TRD2_V6_F015_DEPENDENT_PATHS.length, 21);
  assert.equal(new Set(TRD2_V6_F015_DEPENDENT_PATHS).size, 21);
  for (const logicalPath of TRD2_V6_F015_DEPENDENT_PATHS) assert.equal(fs.existsSync(logicalPath), true, logicalPath);
});

test('TRD-2 v6 Pass 1 toolchain contains no forbidden random source', () => {
  for (const logicalPath of TRD2_V6_TOOLCHAIN_PATHS.filter((candidate) => candidate.endsWith('.mjs') || candidate.endsWith('.py'))) {
    const source = fs.readFileSync(logicalPath, 'utf8');
    assert.equal(source.includes('Math' + '.random('), false, logicalPath);
    assert.equal(source.includes('crypto' + '.randomUUID('), false, logicalPath);
  }
});
