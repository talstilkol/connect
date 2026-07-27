import {
  normalizeAiAgentName,
  validateAiAgentDefinition,
} from "../../shared/validation/aiAgentDefinition.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";

const AI_AGENT_KEY_PATTERN =
  /^ai_agent_v1_[0-9a-f]{64}$/;
const KNOWLEDGE_SOURCE_KEY_PATTERN =
  /^knowledge_source_v1_[0-9a-f]{64}$/;
const CONTENT_DIGEST_PATTERN =
  /^[0-9a-f]{64}$/;

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

export async function deriveAiAgentKey(
  tenantId: number,
  name: unknown,
): Promise<string> {
  requireTenantId(tenantId);
  const normalizedName = normalizeAiAgentName(name);

  if (!normalizedName) {
    throw new Error("AI agent name is invalid");
  }

  return namespacedKey("ai_agent_v1_", {
    namespace: "ai_agent_v1",
    tenantId,
    name: normalizedName,
  });
}

export async function deriveAiAgentVersionKey(
  tenantId: number,
  aiAgentKey: string,
  version: number,
  definition: unknown,
): Promise<string> {
  requireTenantId(tenantId);
  requirePositiveOrdinal(version, "version");

  if (!AI_AGENT_KEY_PATTERN.test(aiAgentKey)) {
    throw new Error("aiAgentKey is invalid");
  }

  const validation =
    validateAiAgentDefinition(definition);

  if (!validation.success) {
    throw new Error(
      "AI agent definition is invalid",
    );
  }

  const expectedAiAgentKey =
    await deriveAiAgentKey(
      tenantId,
      validation.value.name,
    );

  if (expectedAiAgentKey !== aiAgentKey) {
    throw new Error(
      "AI agent identity does not match definition",
    );
  }

  return namespacedKey("ai_agent_version_v1_", {
    namespace: "ai_agent_version_v1",
    tenantId,
    aiAgentKey,
    version,
    definition: validation.value,
  });
}

export async function deriveKnowledgeSourceKey(
  tenantId: number,
  contentSha256: string,
): Promise<string> {
  requireTenantId(tenantId);

  if (
    typeof contentSha256 !== "string" ||
    !CONTENT_DIGEST_PATTERN.test(contentSha256)
  ) {
    throw new Error(
      "contentSha256 must be a lowercase SHA-256 digest",
    );
  }

  return namespacedKey("knowledge_source_v1_", {
    namespace: "knowledge_source_v1",
    tenantId,
    contentSha256,
  });
}

export async function deriveKnowledgePassageKey(
  tenantId: number,
  sourceKey: string,
  passageOrdinal: number,
  contentSha256: string,
): Promise<string> {
  requireTenantId(tenantId);
  requirePositiveOrdinal(
    passageOrdinal,
    "passageOrdinal",
  );

  if (
    typeof sourceKey !== "string" ||
    !KNOWLEDGE_SOURCE_KEY_PATTERN.test(sourceKey)
  ) {
    throw new Error("sourceKey is invalid");
  }

  if (
    typeof contentSha256 !== "string" ||
    !CONTENT_DIGEST_PATTERN.test(contentSha256)
  ) {
    throw new Error(
      "contentSha256 must be a lowercase SHA-256 digest",
    );
  }

  return namespacedKey("knowledge_passage_v1_", {
    namespace: "knowledge_passage_v1",
    tenantId,
    sourceKey,
    passageOrdinal,
    contentSha256,
  });
}
