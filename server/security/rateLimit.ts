export const rateLimitPolicyIds = [
  "clerk-organization-invitation",
  "meta-webhook",
  "tenant-mutation",
  "system-admin-mutation",
] as const;

export type RateLimitPolicyId =
  (typeof rateLimitPolicyIds)[number];

export interface RateLimitBinding {
  limit(input: {
    key: string;
  }): Promise<{
    success: boolean;
  }>;
}

export interface RateLimitGuard {
  consume(
    subject: string,
  ): Promise<
    | { outcome: "allowed" }
    | { outcome: "limited" }
  >;
}

export class RateLimitConfigurationError extends Error {
  constructor() {
    super("Rate limit configuration is unavailable");
    this.name = "RateLimitConfigurationError";
  }
}

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Rate limit enforcement is unavailable");
    this.name = "RateLimitUnavailableError";
  }
}

const MAXIMUM_SUBJECT_LENGTH = 512;
const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u001f\u007f]/;

function requirePolicyId(
  value: string,
): RateLimitPolicyId {
  if (
    !rateLimitPolicyIds.includes(
      value as RateLimitPolicyId,
    )
  ) {
    throw new RateLimitConfigurationError();
  }

  return value as RateLimitPolicyId;
}

function requireSubject(value: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAXIMUM_SUBJECT_LENGTH ||
    value.trim() !== value ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    throw new RateLimitConfigurationError();
  }

  return value;
}

function requireCrypto(
  value: Pick<Crypto, "subtle"> | undefined,
): Pick<Crypto, "subtle"> {
  const cryptoObject =
    value ??
    (typeof crypto === "undefined" ? undefined : crypto);

  if (
    !cryptoObject?.subtle ||
    typeof cryptoObject.subtle.digest !== "function"
  ) {
    throw new RateLimitConfigurationError();
  }

  return cryptoObject;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

export async function deriveRateLimitKey(
  policyId: RateLimitPolicyId,
  subject: string,
  cryptoOverride?: Pick<Crypto, "subtle">,
): Promise<string> {
  const normalizedPolicyId =
    requirePolicyId(policyId);
  const normalizedSubject =
    requireSubject(subject);
  const cryptoObject =
    requireCrypto(cryptoOverride);
  const digest = await cryptoObject.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      `connect:rate-limit:v1:${normalizedPolicyId}:${normalizedSubject}`,
    ),
  );

  return `rate_limit_v1_${bytesToHex(
    new Uint8Array(digest),
  )}`;
}

export function isRateLimitBinding(
  value: unknown,
): value is RateLimitBinding {
  return (
    typeof value === "object" &&
    value !== null &&
    "limit" in value &&
    typeof value.limit === "function"
  );
}

export function createRateLimitGuard(
  binding: unknown,
  policyId: RateLimitPolicyId,
  cryptoOverride?: Pick<Crypto, "subtle">,
): RateLimitGuard {
  if (!isRateLimitBinding(binding)) {
    throw new RateLimitConfigurationError();
  }

  requirePolicyId(policyId);

  return {
    async consume(subject) {
      const key = await deriveRateLimitKey(
        policyId,
        subject,
        cryptoOverride,
      );

      try {
        const result = await binding.limit({ key });

        if (
          typeof result !== "object" ||
          result === null ||
          typeof result.success !== "boolean"
        ) {
          throw new RateLimitUnavailableError();
        }

        return result.success
          ? { outcome: "allowed" }
          : { outcome: "limited" };
      } catch (error) {
        if (
          error instanceof
          RateLimitUnavailableError
        ) {
          throw error;
        }

        throw new RateLimitUnavailableError();
      }
    },
  };
}
