export interface ProductionImplementationState {
  metaWebhookQueue: boolean;
  campaignDeliveryQueue: boolean;
  targetQueueAdapter: boolean;
  campaignScheduler: boolean;
  campaignDeliveryAdapter: boolean;
  botReplyDeliveryAdapter: boolean;
  aiProvider: boolean;
  billingProvider: boolean;
  rateLimitPolicy: boolean;
  fileScanner: boolean;
  monitoringAndAlerting: boolean;
  backupAndRestore: boolean;
  sloMeasurement: boolean;
  dataRetentionPolicy: boolean;
}

export const currentProductionImplementationState:
  ProductionImplementationState = Object.freeze({
    metaWebhookQueue: true,
    campaignDeliveryQueue: true,
    targetQueueAdapter: false,
    campaignScheduler: true,
    campaignDeliveryAdapter: false,
    botReplyDeliveryAdapter: false,
    aiProvider: false,
    billingProvider: false,
    rateLimitPolicy: false,
    fileScanner: false,
    monitoringAndAlerting: false,
    backupAndRestore: false,
    sloMeasurement: false,
    dataRetentionPolicy: false,
  });
