import assert from "node:assert/strict";
import { inspectOpenAiResponsesConfiguration } from "../../server/ai/openAiResponsesConfiguration.ts";
import { runtimeFixture } from "./ai-runtime.mjs";

// Existing runtime values become the wire-protocol input; no product seed data.
export async function openAiFixture(options = {}) {
  const runtime = await runtimeFixture({ ...options, definition: { billingCurrency: "USD", responseMode: "agent-approval", ...options.definition } });
  await runtime.service.process(runtime.input);
  const request = runtime.calls.find((call) => call.dependency === "provider").request;
  const usage = runtime.calls.find((call) => call.dependency === "record-usage").request.usage;
  const now = new Date("2026-07-26T09:05:00.000Z");
  const environment = {
    AI_RESPONSES_ENABLED: "true",
    OPENAI_API_KEY: runtime.sourceKey, // Noncredential deterministic test identity, never sent over a network.
    OPENAI_MODEL: "gpt-4o-2024-08-06",
    OPENAI_ALLOWED_MODELS_JSON: JSON.stringify(["gpt-4o-2024-08-06"]),
    OPENAI_MAX_INPUT_TOKENS: "16384", OPENAI_MAX_OUTPUT_TOKENS: "4096", OPENAI_TIMEOUT_MS: "1000",
    OPENAI_RATE_CARD_JSON: JSON.stringify({
      model: "gpt-4o-2024-08-06", currency: "USD",
      // Arithmetic test vectors, not claims about provider prices.
      inputMicroUsdPerMillionTokens: usage.inputTokens,
      cachedInputMicroUsdPerMillionTokens: usage.outputTokens,
      cacheWriteMicroUsdPerMillionTokens: null,
      outputMicroUsdPerMillionTokens: usage.inputTokens,
      validUntil: "2026-07-27T09:05:00.000Z",
    }),
  };
  const checked = inspectOpenAiResponsesConfiguration(environment, now);
  assert.equal(checked.status, "configured");
  const configuration = checked.configuration;
  const result = {
    status: "completed", model: configuration.model, service_tier: "default", error: null, incomplete_details: null,
    usage: { input_tokens: usage.inputTokens, output_tokens: usage.outputTokens,
      total_tokens: usage.inputTokens + usage.outputTokens, input_tokens_details: { cached_tokens: 0 } },
    output: [{ type: "message", role: "assistant", status: "completed", content: [{
      type: "output_text", text: JSON.stringify({ answerable: true,
        text: "תשובה המבוססת על המקור המאושר.", groundedPassageKeys: [request.passages[0].passageKey] }),
    }] }],
  };
  return { runtime, request, configuration, environment, now, result };
}
