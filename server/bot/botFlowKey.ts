import {
  validateBotFlowDefinition,
  normalizeBotFlowName,
} from "../../shared/validation/botFlowDefinition.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";

const BOT_FLOW_KEY_PATTERN =
  /^bot_flow_v1_[0-9a-f]{64}$/;
const BOT_BLOCK_KEY_PATTERN =
  /^bot_block_v1_[0-9a-f]{64}$/;

function requireTenantId(tenantId: number): number {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new Error(
      "tenantId must be a positive integer",
    );
  }

  return tenantId;
}

function requirePositiveOrdinal(
  value: number,
  fieldName: string,
): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `${fieldName} must be a positive integer`,
    );
  }

  return value;
}

async function namespacedKey(
  prefix: string,
  input: Record<string, unknown>,
): Promise<string> {
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify(input),
    ),
  );

  return `${prefix}${digest}`;
}

export async function deriveBotFlowKey(
  tenantId: number,
  name: unknown,
): Promise<string> {
  requireTenantId(tenantId);
  const normalizedName = normalizeBotFlowName(name);

  if (!normalizedName) {
    throw new Error("bot flow name is invalid");
  }

  return namespacedKey("bot_flow_v1_", {
    namespace: "bot_flow_v1",
    tenantId,
    name: normalizedName,
  });
}

export async function deriveBotFlowBlockKey(
  botFlowKey: string,
  ordinal: number,
): Promise<string> {
  if (!BOT_FLOW_KEY_PATTERN.test(botFlowKey)) {
    throw new Error("botFlowKey is invalid");
  }

  requirePositiveOrdinal(ordinal, "ordinal");

  return namespacedKey("bot_block_v1_", {
    namespace: "bot_block_v1",
    botFlowKey,
    ordinal,
  });
}

export async function deriveBotFlowOptionKey(
  blockKey: string,
  ordinal: number,
): Promise<string> {
  if (!BOT_BLOCK_KEY_PATTERN.test(blockKey)) {
    throw new Error("blockKey is invalid");
  }

  requirePositiveOrdinal(ordinal, "ordinal");

  return namespacedKey("bot_option_v1_", {
    namespace: "bot_option_v1",
    blockKey,
    ordinal,
  });
}

export async function deriveBotFlowVersionKey(
  tenantId: number,
  botFlowKey: string,
  version: number,
  definition: unknown,
): Promise<string> {
  requireTenantId(tenantId);
  requirePositiveOrdinal(version, "version");

  if (!BOT_FLOW_KEY_PATTERN.test(botFlowKey)) {
    throw new Error("botFlowKey is invalid");
  }

  const validation =
    validateBotFlowDefinition(definition);

  if (!validation.success) {
    throw new Error(
      "bot flow definition is invalid",
    );
  }

  const expectedBotFlowKey = await deriveBotFlowKey(
    tenantId,
    validation.value.name,
  );

  if (expectedBotFlowKey !== botFlowKey) {
    throw new Error(
      "bot flow identity does not match definition",
    );
  }

  return namespacedKey("bot_flow_version_v1_", {
    namespace: "bot_flow_version_v1",
    tenantId,
    botFlowKey,
    version,
    definition: validation.value,
  });
}
