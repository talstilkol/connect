const KEY_VERSION = "v1";
const HMAC_KEY_PATTERN = /^[A-Za-z0-9+/]{43}=$/;
const providerIdentifierPattern =
  /^[^\u0000-\u001f\u007f]{1,255}$/;
const deliveryKeyPattern =
  /^campaign_delivery_v1_[0-9a-f]{64}$/;
const botReplyDeliveryKeyPattern =
  /^bot_reply_delivery_v1_[0-9a-f]{64}$/;
const phoneNumberPattern = /^\+[1-9][0-9]{0,14}$/;
type OwnedBytes = Uint8Array<ArrayBuffer>;

export interface WhatsappRateLimitKeyEnvironment {
  WHATSAPP_RATE_LIMIT_HMAC_KEY_V1?: string;
}

export interface WhatsappRateLimitKeyInput {
  businessPortfolioId: string;
  phoneNumberId: string;
  recipientPhoneNumber: string;
  deliveryKey: string;
  deliveryAttemptNumber: number;
  queueAttemptNumber: number;
  queueMessageId: string;
}

export interface DerivedWhatsappRateLimitKeys {
  reservationKey: string;
  portfolioKey: string;
  senderKey: string;
  recipientKey: string;
}

export interface WhatsappServiceReplyRateLimitKeyInput {
  businessPortfolioId: string;
  phoneNumberId: string;
  recipientPhoneNumber: string;
  deliveryKey: string;
  deliveryAttemptNumber: number;
}

export interface WhatsappRateLimitKeyDeriver {
  isConfigured(): boolean;
  derive(
    input: WhatsappRateLimitKeyInput,
  ): Promise<DerivedWhatsappRateLimitKeys>;
  deriveServiceReply(
    input: WhatsappServiceReplyRateLimitKeyInput,
  ): Promise<DerivedWhatsappRateLimitKeys>;
}

export interface WhatsappRateLimitKeyDeriverOptions {
  crypto?: Pick<Crypto, "subtle">;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeKey(value: string | undefined): OwnedBytes | null {
  const encoded = value?.trim();

  if (!encoded || !HMAC_KEY_PATTERN.test(encoded)) {
    return null;
  }

  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    if (
      bytes.byteLength !== 32 ||
      bytesToBase64(bytes) !== encoded
    ) {
      bytes.fill(0);
      return null;
    }

    return bytes;
  } catch {
    return null;
  }
}

function readProviderIdentifier(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is invalid`);
  }

  const normalized = value.trim();

  if (!providerIdentifierPattern.test(normalized)) {
    throw new Error(`${fieldName} is invalid`);
  }

  return normalized;
}

function normalizeInput(
  input: WhatsappRateLimitKeyInput,
): WhatsappRateLimitKeyInput {
  if (
    !phoneNumberPattern.test(
      input.recipientPhoneNumber,
    ) ||
    !deliveryKeyPattern.test(input.deliveryKey) ||
    !Number.isSafeInteger(
      input.deliveryAttemptNumber,
    ) ||
    input.deliveryAttemptNumber < 1 ||
    !Number.isSafeInteger(input.queueAttemptNumber) ||
    input.queueAttemptNumber < 1
  ) {
    throw new Error(
      "WhatsApp rate-limit key input is invalid",
    );
  }

  return {
    businessPortfolioId: readProviderIdentifier(
      input.businessPortfolioId,
      "businessPortfolioId",
    ),
    phoneNumberId: readProviderIdentifier(
      input.phoneNumberId,
      "phoneNumberId",
    ),
    recipientPhoneNumber:
      input.recipientPhoneNumber,
    deliveryKey: input.deliveryKey,
    deliveryAttemptNumber:
      input.deliveryAttemptNumber,
    queueAttemptNumber: input.queueAttemptNumber,
    queueMessageId: readProviderIdentifier(
      input.queueMessageId,
      "queueMessageId",
    ),
  };
}

function normalizeServiceReplyInput(
  input: WhatsappServiceReplyRateLimitKeyInput,
): WhatsappServiceReplyRateLimitKeyInput {
  if (
    !phoneNumberPattern.test(input.recipientPhoneNumber) ||
    !botReplyDeliveryKeyPattern.test(input.deliveryKey) ||
    !Number.isSafeInteger(input.deliveryAttemptNumber) ||
    input.deliveryAttemptNumber < 1
  ) {
    throw new Error(
      "WhatsApp service-reply rate-limit key input is invalid",
    );
  }

  return {
    businessPortfolioId: readProviderIdentifier(
      input.businessPortfolioId,
      "businessPortfolioId",
    ),
    phoneNumberId: readProviderIdentifier(
      input.phoneNumberId,
      "phoneNumberId",
    ),
    recipientPhoneNumber: input.recipientPhoneNumber,
    deliveryKey: input.deliveryKey,
    deliveryAttemptNumber: input.deliveryAttemptNumber,
  };
}

function hexadecimal(bytes: Uint8Array): string {
  return Array.from(
    bytes,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function signingPayload(
  purpose: string,
  values: readonly string[],
): OwnedBytes {
  return new Uint8Array(
    new TextEncoder().encode(
      JSON.stringify([
        "connect",
        "whatsapp-rate-limit",
        KEY_VERSION,
        purpose,
        ...values,
      ]),
    ),
  );
}

export function createWhatsappRateLimitKeyDeriver(
  environment: WhatsappRateLimitKeyEnvironment,
  options: WhatsappRateLimitKeyDeriverOptions = {},
): WhatsappRateLimitKeyDeriver {
  const cryptoObject =
    options.crypto ??
    (typeof crypto === "undefined" ? undefined : crypto);
  const keyBytes = decodeKey(
    environment.WHATSAPP_RATE_LIMIT_HMAC_KEY_V1,
  );
  const configured = Boolean(
    cryptoObject?.subtle &&
      typeof cryptoObject.subtle.importKey === "function" &&
      typeof cryptoObject.subtle.sign === "function" &&
      keyBytes,
  );
  let keyPromise: Promise<CryptoKey> | null = null;

  const requireKey = (): Promise<CryptoKey> => {
    if (!configured || !cryptoObject || !keyBytes) {
      throw new Error(
        "WhatsApp rate-limit HMAC configuration is invalid",
      );
    }

    if (keyPromise === null) {
      keyPromise = cryptoObject.subtle
        .importKey(
          "raw",
          keyBytes,
          {
            name: "HMAC",
            hash: "SHA-256",
          },
          false,
          ["sign"],
        )
        .finally(() => {
          keyBytes.fill(0);
        });
    }

    return keyPromise;
  };

  const sign = async (
    purpose: string,
    values: readonly string[],
  ): Promise<string> => {
    const key = await requireKey();
    const signature = new Uint8Array(
      await cryptoObject!.subtle.sign(
        "HMAC",
        key,
        signingPayload(purpose, values),
      ),
    );

    if (signature.byteLength !== 32) {
      throw new Error(
        "WhatsApp rate-limit HMAC result is invalid",
      );
    }

    return hexadecimal(signature);
  };

  const deriveProviderScopes = async (
    businessPortfolioId: string,
    phoneNumberId: string,
    recipientPhoneNumber: string,
    reservationPurpose: string,
    reservationValues: readonly string[],
  ): Promise<DerivedWhatsappRateLimitKeys> => {
    const [portfolio, sender, recipient, reservation] =
      await Promise.all([
        sign("portfolio", [businessPortfolioId]),
        sign("sender", [phoneNumberId]),
        sign("recipient", [
          businessPortfolioId,
          recipientPhoneNumber,
        ]),
        sign(reservationPurpose, reservationValues),
      ]);

    return {
      reservationKey:
        `whatsapp_rate_reservation_v1_${reservation}`,
      portfolioKey:
        `whatsapp_portfolio_v1_${portfolio}`,
      senderKey: `whatsapp_sender_v1_${sender}`,
      recipientKey:
        `whatsapp_recipient_v1_${recipient}`,
    };
  };

  return {
    isConfigured() {
      return configured;
    },

    async derive(rawInput) {
      const input = normalizeInput(rawInput);
      return deriveProviderScopes(
        input.businessPortfolioId,
        input.phoneNumberId,
        input.recipientPhoneNumber,
        "reservation",
        [
          input.businessPortfolioId,
          input.phoneNumberId,
          input.recipientPhoneNumber,
          input.deliveryKey,
          String(input.deliveryAttemptNumber),
          String(input.queueAttemptNumber),
          input.queueMessageId,
        ],
      );
    },

    async deriveServiceReply(rawInput) {
      const input = normalizeServiceReplyInput(rawInput);
      return deriveProviderScopes(
        input.businessPortfolioId,
        input.phoneNumberId,
        input.recipientPhoneNumber,
        "service-reply-reservation",
        [
          input.businessPortfolioId,
          input.phoneNumberId,
          input.recipientPhoneNumber,
          input.deliveryKey,
          String(input.deliveryAttemptNumber),
        ],
      );
    },
  };
}
