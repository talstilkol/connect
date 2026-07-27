import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";

const CONVERSATION_KEY_PATTERN =
  /^conversation_v1_[0-9a-f]{64}$/;
const MESSAGE_KEY_PATTERN =
  /^message_v1_[0-9a-f]{64}$/;
const AI_AGENT_VERSION_KEY_PATTERN =
  /^ai_agent_version_v1_[0-9a-f]{64}$/;

interface AiRuntimeTurnIdentity {
  conversationKey: string;
  inboundMessageKey: string;
  aiAgentVersionKey: string;
}

function assertIdentity(
  tenantId: number,
  identity: AiRuntimeTurnIdentity,
): void {
  if (
    !Number.isSafeInteger(tenantId) ||
    tenantId <= 0 ||
    !CONVERSATION_KEY_PATTERN.test(
      identity.conversationKey,
    ) ||
    !MESSAGE_KEY_PATTERN.test(
      identity.inboundMessageKey,
    ) ||
    !AI_AGENT_VERSION_KEY_PATTERN.test(
      identity.aiAgentVersionKey,
    )
  ) {
    throw new Error(
      "AI runtime turn identity is invalid",
    );
  }
}

async function deriveTurnKey(
  prefix: string,
  namespace: string,
  tenantId: number,
  identity: AiRuntimeTurnIdentity,
): Promise<string> {
  assertIdentity(tenantId, identity);
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace,
        tenantId,
        conversationKey:
          identity.conversationKey,
        inboundMessageKey:
          identity.inboundMessageKey,
        aiAgentVersionKey:
          identity.aiAgentVersionKey,
      }),
    ),
  );

  return `${prefix}${digest}`;
}

export async function deriveAiProviderRequestKey(
  tenantId: number,
  identity: AiRuntimeTurnIdentity,
): Promise<string> {
  return deriveTurnKey(
    "ai_provider_request_v1_",
    "ai_provider_request_v1",
    tenantId,
    identity,
  );
}

export async function deriveAiRuntimeAuditKey(
  tenantId: number,
  identity: AiRuntimeTurnIdentity,
): Promise<string> {
  return deriveTurnKey(
    "ai_runtime_audit_v1_",
    "ai_runtime_audit_v1",
    tenantId,
    identity,
  );
}
