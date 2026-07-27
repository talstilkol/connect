import {
  BillingProviderAdapterError,
  BillingProviderProcessorError,
  type BillingProviderAdapter,
  type BillingProviderEventProcessor,
} from "./billingProviderContracts.ts";

export const unavailableBillingProviderAdapter:
  BillingProviderAdapter = {
    providerKey: null,
    async verifyAndNormalize() {
      throw new BillingProviderAdapterError(
        "PROVIDER_UNAVAILABLE",
      );
    },
  };

export const unavailableBillingProviderProcessor:
  BillingProviderEventProcessor = {
    async process() {
      throw new BillingProviderProcessorError(
        "BILLING_PROVIDER_NOT_CONFIGURED",
      );
    },
  };
