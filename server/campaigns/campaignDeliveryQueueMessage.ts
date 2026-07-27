export interface CampaignDeliveryQueueMessage {
  version: 1;
  deliveryKey: string;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isDeliveryKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^campaign_delivery_v1_[0-9a-f]{64}$/.test(
      value,
    )
  );
}

export function createCampaignDeliveryQueueMessage(
  deliveryKey: string,
): CampaignDeliveryQueueMessage {
  if (!isDeliveryKey(deliveryKey)) {
    throw new Error(
      "campaign delivery queue key is invalid",
    );
  }

  return {
    version: 1,
    deliveryKey,
  };
}

export function parseCampaignDeliveryQueueMessage(
  value: unknown,
): CampaignDeliveryQueueMessage | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 2 ||
    value.version !== 1 ||
    !isDeliveryKey(value.deliveryKey)
  ) {
    return null;
  }

  return {
    version: 1,
    deliveryKey: value.deliveryKey,
  };
}
