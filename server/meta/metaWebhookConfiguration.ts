export interface MetaWebhookEnvironment {
  META_APP_SECRET?: string;
  META_WEBHOOK_VERIFY_TOKEN?: string;
}

export interface MetaWebhookConfiguration {
  appSecret: string;
  verifyToken: string;
}

function requireSecret(
  value: string | undefined,
  fieldName: keyof MetaWebhookEnvironment,
): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required Meta secret: ${fieldName}`);
  }

  return value;
}

export function requireMetaWebhookConfiguration(
  environment: MetaWebhookEnvironment,
): MetaWebhookConfiguration {
  return {
    appSecret: requireSecret(
      environment.META_APP_SECRET,
      "META_APP_SECRET",
    ),
    verifyToken: requireSecret(
      environment.META_WEBHOOK_VERIFY_TOKEN,
      "META_WEBHOOK_VERIFY_TOKEN",
    ),
  };
}
