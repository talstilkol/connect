import type { AiResponseGenerationRequest, AiResponseGenerationResult, AiResponseProvider } from "../../shared/domain/aiRuntime.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { AiResponseDeferredError, type AiGenerationJournal, type AiGenerationObservation } from "./aiGenerationJournal.ts";
import { inspectOpenAiResponsesConfiguration, type OpenAiResponsesConfiguration } from "./openAiResponsesConfiguration.ts";
import { countOpenAiInputTokens, reserveOpenAiCost } from "./openAiInputTokenCounter.ts";
import { createOpenAiResponsesProvider } from "./openAiResponsesProvider.ts";
import { createOpenAiResponsesBody } from "./openAiResponsesWire.ts";

function replay(observation: AiGenerationObservation): AiResponseGenerationResult | null {
  if (observation.status === "claimed") throw new AiResponseDeferredError();
  return observation.status === "missing" ? null : observation.result;
}

export function createDurableOpenAiResponsesProvider(
  candidate: OpenAiResponsesConfiguration,
  journal: AiGenerationJournal,
  options: Readonly<{ fetch?: typeof fetch; now?: () => Date }> = {},
): AiResponseProvider {
  const now = options.now ?? (() => new Date());
  const transport = options.fetch ?? globalThis.fetch;
  const checked = inspectOpenAiResponsesConfiguration({
    AI_RESPONSES_ENABLED: "true", OPENAI_API_KEY: candidate?.apiKey, OPENAI_MODEL: candidate?.model,
    OPENAI_ALLOWED_MODELS_JSON: JSON.stringify([candidate?.model]), OPENAI_RATE_CARD_JSON: JSON.stringify(candidate?.rateCard),
    OPENAI_MAX_INPUT_TOKENS: String(candidate?.maximumInputTokens), OPENAI_MAX_OUTPUT_TOKENS: String(candidate?.maximumOutputTokens),
    OPENAI_TIMEOUT_MS: String(candidate?.timeoutMs),
  }, now());
  if (checked.status !== "configured" || typeof transport !== "function" ||
    typeof journal?.observe !== "function" || typeof journal?.claim !== "function" || typeof journal?.settle !== "function") {
    throw new Error("AI durable provider configuration is invalid");
  }
  const configuration = checked.configuration;
  const provider = createOpenAiResponsesProvider(configuration, { fetch: transport, now });
  return Object.freeze({
    async generate(input: AiResponseGenerationRequest): Promise<AiResponseGenerationResult> {
      let request: AiResponseGenerationRequest;
      let body: string;
      try {
        body = createOpenAiResponsesBody(input, configuration);
        request = { requestKey: input.requestKey, tenantId: input.tenantId, aiAgentVersionKey: input.aiAgentVersionKey,
          systemPrompt: input.systemPrompt, customerMessage: input.customerMessage,
          passages: input.passages.map(({ passageKey, sourceKey, content }) => ({ passageKey, sourceKey, content })) };
      } catch { return { outcome: "policy-violation" }; }
      const digest = (value: unknown) => sha256Hex(new TextEncoder().encode(JSON.stringify(value)));
      const binding = Object.freeze({
        tenantId: request.tenantId, requestKey: request.requestKey, aiAgentVersionKey: request.aiAgentVersionKey,
        inputDigest: await digest({ namespace: "ai_generation_input_v1", request }),
        policyDigest: await digest({ body, rateCard: configuration.rateCard, maximumInputTokens: configuration.maximumInputTokens }),
      });
      // Database failures include lost commit acknowledgements: preserve the job
      // for recovery; do not write a terminal handoff or make a second HTTP call.
      try {
        const existing = replay(await journal.observe(binding));
        if (existing) return existing;
        const time = now().getTime();
        if (!Number.isFinite(time) || time >= Date.parse(configuration.rateCard.validUntil)) return { outcome: "unavailable" };
        const count = await countOpenAiInputTokens(body, configuration, transport);
        if (count === null) throw new AiResponseDeferredError();
        const reservedMinorUnits = reserveOpenAiCost(count, configuration);
        const claim = await journal.claim({ binding, request, countedInputTokens: count, reservedMinorUnits, timeoutMs: configuration.timeoutMs });
        if (claim.status === "denied") return { outcome: "unavailable" };
        if (claim.status !== "acquired") {
          const result = replay(claim);
          if (!result) throw new AiResponseDeferredError();
          return result;
        }
        const result = await provider.generate(request) as AiResponseGenerationResult;
        return await journal.settle(binding, result);
      } catch { throw new AiResponseDeferredError(); }
    },
  });
}
