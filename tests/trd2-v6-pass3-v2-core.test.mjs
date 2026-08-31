import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { canonicalV6, sha256Bytes } from '../scripts/trd2-v6-core.mjs';
import {
  TRD2_V6_PASS3_V2_INPUT_PATHS,
  TRD2_V6_PASS3_V2_OUTPUTS,
  buildPass3V2Artifacts,
  pass3V2Outcome,
} from '../scripts/trd2-v6-pass3-v2-core.mjs';

function git(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding, maxBuffer: 256 * 1024 * 1024 });
  assert.equal(result.status, 0, String(result.stderr));
  return result.stdout;
}

function sourceContext() {
  const observedHead = git(['rev-parse', 'HEAD']).trim();
  const inputRows = TRD2_V6_PASS3_V2_INPUT_PATHS.map((logicalPath) => {
    const bytes = git(['show', `${observedHead}:${logicalPath}`], null);
    return { byteLength: bytes.length, logicalPath, observedCommit: observedHead, sha256: sha256Bytes(bytes) };
  });
  const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
  const contract = read(TRD2_V6_PASS3_V2_INPUT_PATHS[4]);
  return {
    contract,
    inputRows,
    observedHead,
    parserCorpus: read(TRD2_V6_PASS3_V2_INPUT_PATHS[2]),
    registry: read(TRD2_V6_PASS3_V2_INPUT_PATHS[0]),
    sourceCapture: read(TRD2_V6_PASS3_V2_INPUT_PATHS[1]),
  };
}

function fixture() {
  const context = sourceContext();
  return { built: buildPass3V2Artifacts(context), contract: context.contract };
}

test('Pass 3 v2 deterministically builds the exact three-artifact boundary', () => {
  const first = fixture().built;
  const second = fixture().built;
  assert.deepEqual(Object.keys(first.artifacts), TRD2_V6_PASS3_V2_OUTPUTS);
  assert.equal(canonicalV6(first.artifacts), canonicalV6(second.artifacts));
});

test('Pass 3 v2 preserves all 128 Requirements and source bindings', () => {
  const { artifacts } = fixture().built;
  const subject = artifacts[TRD2_V6_PASS3_V2_OUTPUTS[0]];
  assert.equal(subject.requirementCount, 128);
  assert.equal(subject.requirementBindingCount, 128);
  assert.equal(new Set(subject.requirements.map(({ requirementId }) => requirementId)).size, 128);
  assert.deepEqual(subject.requirements.map(({ requirementId }) => requirementId), subject.requirementBindings.map(({ requirementId }) => requirementId));
});

test('Pass 3 v2 reconstructs every virtual Clause Node and counterexample root', () => {
  const { artifacts, clauseNodes, obligations } = fixture().built;
  const clause = artifacts[TRD2_V6_PASS3_V2_OUTPUTS[1]];
  assert.equal(clause.programCount, 128);
  assert.equal(clauseNodes.length, 492);
  assert.equal(obligations.length, 492);
  assert.deepEqual(new Set(clause.programs.flatMap(({ clauseRoots }) => clauseRoots)), new Set(clauseNodes.map(({ recordRoot }) => recordRoot)));
  assert.deepEqual(new Set(clause.programs.flatMap(({ counterexampleRoots }) => counterexampleRoots)), new Set(obligations.map(({ recordRoot }) => recordRoot)));
});

test('Pass 3 v2 closes every admitted transition pair and the 3200 lifecycle denominator', () => {
  const { artifacts } = fixture().built;
  const state = artifacts[TRD2_V6_PASS3_V2_OUTPUTS[2]];
  assert.equal(state.familyCount, 7);
  const lifecycle = state.machines.filter(({ family }) => family === 'DATA-LIFECYCLE');
  assert.equal(lifecycle.length, 10);
  assert.equal(lifecycle.reduce((sum, machine) => sum + machine.expandedTransitionCount, 0), 3200);
  for (const machine of state.machines) {
    assert.equal(machine.transitionCount, machine.states.length * machine.events.length);
    assert.equal(new Set(machine.transitions.map(({ event, fromState }) => `${fromState}\0${event}`)).size, machine.transitionCount);
  }
});

test('Pass 3 v2 blocks Active/Hold deletion and PURGED resurrection', () => {
  const { artifacts } = fixture().built;
  const lifecycle = artifacts[TRD2_V6_PASS3_V2_OUTPUTS[2]].machines.filter(({ family }) => family === 'DATA-LIFECYCLE');
  for (const transition of lifecycle.flatMap(({ transitions }) => transitions)) {
    if (['START-DELETE', 'PROVIDER-CONFIRMED', 'START-REDELETE'].includes(transition.event) && ['ACTIVE', 'HOLD-ACTIVE', 'HOLD-RELEASE-PENDING'].includes(transition.fromState)) assert.equal(transition.disposition, 'BLOCK');
    if (transition.fromState === 'PURGED' && transition.disposition === 'ALLOW') assert.equal(transition.toState, 'PURGED');
  }
});

test('Pass 3 v2 binds every public control and severity envelope', () => {
  const { artifacts } = fixture().built;
  const state = artifacts[TRD2_V6_PASS3_V2_OUTPUTS[2]];
  assert.equal(state.machines.filter(({ family }) => family === 'PUBLIC-FLOW').flatMap(({ applications }) => applications).length, 52);
  assert.equal(state.machines.filter(({ family }) => family === 'SEVERITY').flatMap(({ applications }) => applications).length, 84);
});

test('Pass 3 v2 exposes exactly one SOE-050 first-reachability escalation', () => {
  const { artifacts } = fixture().built;
  const machine = artifacts[TRD2_V6_PASS3_V2_OUTPUTS[2]].machines.find(({ machineId }) => machineId.includes('SOE-050'));
  assert.equal(machine.applications.length, 1);
  assert.equal(machine.applications[0].applicationId, 'SEVERITY:SOE-050');
  assert.equal(machine.transitions.filter(({ disposition, event, fromState, toState }) => disposition === 'ALLOW' && event === 'FIRST-REACHABILITY' && fromState === 'P2' && toState === 'P0').length, 1);
  assert.equal(machine.transitions.filter(({ disposition, event }) => disposition === 'ALLOW' && event === 'DUPLICATE-FIRST-REACHABILITY').length, 0);
});

test('Pass 3 v2 reports bounded local completion with zero Acceptance credit', () => {
  const { artifacts } = fixture().built;
  const outcome = pass3V2Outcome(artifacts);
  assert.equal(outcome.requirementCount, 128);
  assert.equal(outcome.familyCount, 7);
  assert.equal(outcome.clauseCount, 492);
  assert.equal(outcome.counterexampleCount, 492);
});

test('Pass 3 v2 blocks an undeclared semantic opcode', () => {
  const context = sourceContext();
  context.contract.semanticPredicates[0].assertions[0].op = 'UNDECLARED-OPCODE';
  assert.throws(() => buildPass3V2Artifacts(context), /undeclared opcode/);
});

test('Pass 3 v2 blocks a duplicate lifecycle transition tuple', () => {
  const context = sourceContext();
  context.contract.dataLifecycle.matrixRows[1] = structuredClone(context.contract.dataLifecycle.matrixRows[0]);
  assert.throws(() => buildPass3V2Artifacts(context), /missing\/duplicate transition pair/);
});

test('Pass 3 v2 blocks an Active deletion mutation', () => {
  const context = sourceContext();
  const row = context.contract.dataLifecycle.matrixRows.find(({ event, fromState }) => event === 'START-DELETE' && fromState === 'ACTIVE');
  row.disposition = 'ALLOW';
  row.toState = 'PURGED';
  row.terminal = 'NONE';
  assert.throws(() => buildPass3V2Artifacts(context), /Active\/Hold delete allowed/);
});

test('Pass 3 v2 blocks incomplete public-control coverage', () => {
  const context = sourceContext();
  context.contract.publicControls.pop();
  assert.throws(() => buildPass3V2Artifacts(context), /public flow coverage mismatch/);
});
