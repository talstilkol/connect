import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMetaSignupBeginResult } from '../server/meta/metaSignupLaunch.ts';
import { createPostgresMetaSignupLaunchRepository } from '../server/platform/postgresMetaSignupLaunchRepository.ts';
import { createMetaSignupService } from '../server/meta/metaSignupService.ts';

const session = { tenantId:7,externalUserId:'launch-test-owner',role:'owner',status:'active',displayName:'Launch tests' };
const configuration = { status:'configured',appId:'100001',configurationId:'500005',apiVersion:'v23.0' };
const ready = { status:'ready',launchId:1,expiresAt:'2026-09-09T10:00:00.000Z' };
const input = { launchId:1,authorizationCode:'protected-launch-code',businessPortfolioId:'100001',wabaId:'200002',phoneNumberId:'300003' };

test('launch result parsing is closed and rejects identity leaks, invalid IDs and noncanonical clocks', () => {
  assert.deepEqual(parseMetaSignupBeginResult(ready),ready); assert.ok(Object.isFrozen(parseMetaSignupBeginResult(ready)));
  for (const changed of [{ launchId:'1' },{ launchId:0 },{ launchId:1.5 },{ expiresAt:'2026-02-30T10:00:00.000Z' },{ expiresAt:'2026-09-09T10:00:00Z' },{ tenantId:7 }]) {
    assert.equal(parseMetaSignupBeginResult({ ...ready,...changed }),null);
  }
  assert.deepEqual(parseMetaSignupBeginResult({ status:'attempt-in-progress' }),{ status:'attempt-in-progress' });
  assert.equal(parseMetaSignupBeginResult({ status:'connected' }),null);
});

test('repository rejects invalid session or configuration before opening a transaction', async () => {
  const repository = createPostgresMetaSignupLaunchRepository({ async transaction() { assert.fail('Invalid request must not reach storage'); } });
  for (const changed of [{ tenantId:0 },{ externalUserId:'bad\nactor' },{ externalUserId:'' },{ role:'viewer' }]) await assert.rejects(repository.begin({ ...session,...changed },'a'.repeat(64)));
  await assert.rejects(repository.begin(session,'invalid-configuration'));
});

test('preparation honors configuration and permission before using a server-derived configuration binding', async () => {
  const calls=[];
  const dependencies={ configuration,connections:{},attempts:{},orchestrator:{},launches:{ async begin(actor,key) { calls.push({ actor,key }); return ready; } } };
  const service=createMetaSignupService(dependencies);
  assert.deepEqual(await service.begin(session),ready); assert.deepEqual(calls[0].actor,session); assert.match(calls[0].key,/^[0-9a-f]{64}$/);
  await service.begin(session); assert.equal(calls[0].key,calls[1].key);
  await assert.rejects(service.begin({ ...session,role:'agent' }));
  assert.deepEqual(await createMetaSignupService({ ...dependencies,orchestrator:null }).begin(session),{ status:'configuration-required' });
  assert.deepEqual(await createMetaSignupService({ ...dependencies,configuration:{ status:'configuration-invalid' } }).begin(session),{ status:'configuration-invalid' });
  assert.equal(calls.length,2);
});

test('a claimed completion requires its database baseline and launch identity participates in the request digest', async () => {
  const commands=[],contexts=[]; let baseline;
  const service=createMetaSignupService({ configuration,launches:{},connections:{ async read() { return { tenantId:7,status:'connected',version:2 }; } },
    attempts:{ async claim(command) { commands.push(command); return { outcome:'claimed',baselineConnectionVersion:baseline }; },async complete() {} },
    orchestrator:{ async completeEmbeddedSignup(_session,request,context) { assert.equal(request.launchId,undefined); contexts.push(context); return { tenantId:7,status:'connected',version:2 }; } } });
  assert.deepEqual(await service.complete(session,input),{ status:'server-error' }); assert.deepEqual(contexts,[]);
  baseline=null; assert.equal((await service.complete(session,{ ...input,launchId:2 })).status,'connected');
  assert.deepEqual(contexts,[{ expectedConnectionVersion:null }]);
  assert.equal(commands[0].claimKey,commands[1].claimKey); assert.notEqual(commands[0].requestDigest,commands[1].requestDigest);
  assert.doesNotMatch(JSON.stringify(commands),/protected-launch-code/);
});
