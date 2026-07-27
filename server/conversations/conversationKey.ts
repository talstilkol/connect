import {
  validateInboundMessage,
} from "../../shared/validation/inboundMessage.ts";
import type {
  ValidatedInboundMessage,
} from "../../shared/domain/conversation.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";

function requireTenantId(tenantId: number): number {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new Error(
      "tenantId must be a positive integer",
    );
  }

  return tenantId;
}

function requireContactId(contactId: number): number {
  if (!Number.isSafeInteger(contactId) || contactId <= 0) {
    throw new Error(
      "contactId must be a positive integer",
    );
  }

  return contactId;
}

async function deriveNamespacedKey(
  namespace: "conversation_v1" | "message_v1",
  identity: Readonly<Record<string, unknown>>,
): Promise<string> {
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace,
        ...identity,
      }),
    ),
  );

  return `${namespace}_${digest}`;
}

export async function deriveConversationKey(
  tenantId: number,
  contactId: number,
): Promise<string> {
  return deriveNamespacedKey("conversation_v1", {
    tenantId: requireTenantId(tenantId),
    contactId: requireContactId(contactId),
  });
}

export async function deriveInboundMessageKey(
  tenantId: number,
  input: unknown,
): Promise<{
  messageKey: string;
  message: ValidatedInboundMessage;
}> {
  requireTenantId(tenantId);

  const validation = validateInboundMessage(input);

  if (!validation.success) {
    throw new Error("inbound message is invalid");
  }

  return {
    messageKey: await deriveNamespacedKey(
      "message_v1",
      {
        tenantId,
        providerMessageId:
          validation.value.providerMessageId,
      },
    ),
    message: validation.value,
  };
}
