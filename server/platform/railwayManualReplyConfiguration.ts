import { requireMetaGraphConfiguration, type MetaGraphEnvironment } from "../meta/metaGraphConfiguration.ts";
import type { MetaCredentialEncryptionEnvironment } from "../meta/metaCredentialVault.ts";
import type { WhatsappRateLimitKeyEnvironment } from "../campaigns/whatsappRateLimitKeyDeriver.ts";

export type RailwayManualReplyEnvironment = MetaGraphEnvironment & MetaCredentialEncryptionEnvironment & WhatsappRateLimitKeyEnvironment & {
  MANUAL_REPLY_ENABLED?: string;
};
export function requireRailwayManualReplyConfiguration(environment: RailwayManualReplyEnvironment = {}): boolean {
  if (environment.MANUAL_REPLY_ENABLED === undefined || environment.MANUAL_REPLY_ENABLED === "false") return false;
  if (environment.MANUAL_REPLY_ENABLED !== "true") throw new Error("Manual reply enablement is invalid");
  requireMetaGraphConfiguration(environment);
  for (const key of [environment.META_CREDENTIAL_ENCRYPTION_KEY_V1, environment.WHATSAPP_RATE_LIMIT_HMAC_KEY_V1]) {
    if (typeof key !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(key)) throw new Error("Manual reply encryption or admission configuration is unavailable");
  }
  return true;
}
