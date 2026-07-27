import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";

const REQUEST_KEY_PATTERN =
  /^ai_provider_request_v1_[0-9a-f]{64}$/;

export async function deriveAiReplyOutboxKey(
  tenantId: number,
  requestKey: string,
): Promise<string> {
  if (
    !Number.isSafeInteger(tenantId) ||
    tenantId <= 0 ||
    typeof requestKey !== "string" ||
    !REQUEST_KEY_PATTERN.test(requestKey)
  ) {
    throw new Error(
      "AI reply outbox identity is invalid",
    );
  }

  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace: "ai_reply_outbox_v1",
        tenantId,
        requestKey,
      }),
    ),
  );

  return `ai_reply_outbox_v1_${digest}`;
}

