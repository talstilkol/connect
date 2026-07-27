import type {
  MetaGraphTransport,
} from "./metaGraphTransport";
import type {
  MetaWabaSubscriber,
  SensitiveMetaAccessToken,
} from "./metaPorts";

export class MetaGraphContractError extends Error {
  readonly code = "INVALID_SUBSCRIPTION_RESPONSE";

  constructor() {
    super("Meta Graph returned an invalid WABA subscription response");
    this.name = "MetaGraphContractError";
  }
}

function requireWabaId(value: string): string {
  const normalizedValue = value.trim();

  if (
    normalizedValue.length === 0 ||
    normalizedValue.length > 255 ||
    !/^[a-zA-Z0-9_-]+$/.test(normalizedValue)
  ) {
    throw new Error("WABA ID is invalid");
  }

  return normalizedValue;
}

function isSuccessfulSubscriptionResponse(
  value: unknown,
): value is { success: true } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "success" in value &&
    value.success === true
  );
}

export function createMetaGraphWabaSubscriber(
  transport: MetaGraphTransport,
): MetaWabaSubscriber {
  return {
    async subscribeWaba(
      wabaId: string,
      accessToken: SensitiveMetaAccessToken,
    ): Promise<void> {
      const response = await transport.requestJson<unknown>({
        method: "POST",
        pathSegments: [
          requireWabaId(wabaId),
          "subscribed_apps",
        ],
        accessToken,
      });

      if (!isSuccessfulSubscriptionResponse(response)) {
        throw new MetaGraphContractError();
      }
    },
  };
}
