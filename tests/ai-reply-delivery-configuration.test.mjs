import assert from 'node:assert/strict';
import test from 'node:test';
import { requireRailwayAiReplyDeliveryConfiguration } from '../server/platform/railwayAiReplyDeliveryConfiguration.ts';
const key = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8='; // Existing template-sync fixture.
test('AI delivery requires explicit complete Meta configuration and can run independently of generation or manual replies', () => {
  assert.equal(requireRailwayAiReplyDeliveryConfiguration(), false);
  assert.equal(requireRailwayAiReplyDeliveryConfiguration({ AI_REPLY_DELIVERY_ENABLED: 'false' }), false);
  for (const flag of ['true','1','TRUE','']) assert.throws(() => requireRailwayAiReplyDeliveryConfiguration({ AI_REPLY_DELIVERY_ENABLED: flag }));
  assert.equal(requireRailwayAiReplyDeliveryConfiguration({ AI_REPLY_DELIVERY_ENABLED: 'true', MANUAL_REPLY_ENABLED: 'false',
    META_GRAPH_API_VERSION: 'v23.0', META_CREDENTIAL_ENCRYPTION_KEY_V1: key, WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: key }), true);
});

import { readRailwayBullMqWorkerEnvironment } from '../server/platform/railwayBullMqWorkerMain.ts';
import { openAiFixture } from './fixtures/openai-responses.mjs';
test('the real worker entry point forwards the configured AI generation and delivery settings', async () => {
  const fixture = await openAiFixture();
  const values = { ...fixture.environment, AI_REPLY_DELIVERY_ENABLED: 'true' };
  const previous = Object.fromEntries(Object.keys(values).map((name) => [name, process.env[name]]));
  try {
    Object.assign(process.env, values);
    const captured = readRailwayBullMqWorkerEnvironment();
    for (const [name, value] of Object.entries(values)) assert.equal(captured[name], value, name);
  } finally {
    for (const [name, value] of Object.entries(previous)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
