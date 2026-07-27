import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";

export async function deriveMessageTemplateKey(
  tenantId: number,
  name: string,
  language: string,
): Promise<string> {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new Error("tenantId must be a positive integer");
  }

  if (
    typeof name !== "string" ||
    !/^[a-z0-9_]{1,255}$/.test(name)
  ) {
    throw new Error("template name is invalid");
  }

  if (
    typeof language !== "string" ||
    !/^[A-Za-z]{2}(?:_[A-Za-z]{2})?$/.test(language)
  ) {
    throw new Error("template language is invalid");
  }

  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        tenantId,
        name,
        language,
      }),
    ),
  );

  return `template_v1_${digest}`;
}
