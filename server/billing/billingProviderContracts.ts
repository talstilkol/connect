import type {
  BillingProviderEvent,
  BillingProviderEventType,
} from "../../shared/domain/billingProvider.ts";

export interface BillingWebhookRequest {
  rawBody: Uint8Array;
  headers: Readonly<Record<string, string>>;
}

export type BillingProviderAdapterErrorCode =
  | "INVALID_SIGNATURE"
  | "INVALID_PROVIDER_EVENT"
  | "PROVIDER_UNAVAILABLE";

export class BillingProviderAdapterError extends Error {
  readonly code: BillingProviderAdapterErrorCode;

  constructor(
    code: BillingProviderAdapterErrorCode,
  ) {
    super("Billing provider rejected the webhook");
    this.name = "BillingProviderAdapterError";
    this.code = code;
  }
}

export interface BillingProviderAdapter {
  readonly providerKey: string | null;
  verifyAndNormalize(
    request: BillingWebhookRequest,
  ): Promise<unknown>;
}

export interface BillingTenantResolution {
  tenantId: number;
}

export interface BillingTenantResolver {
  resolve(input: {
    providerKey: string;
    providerCustomerReference: string;
    providerSubscriptionReference: string;
  }): Promise<BillingTenantResolution | null>;
}

export interface BillingReceiptClaimInput {
  tenantId: number;
  providerKey: string;
  providerEventId: string;
  eventKey: string;
  eventType: BillingProviderEventType;
}

export type BillingReceiptClaimResult =
  | {
      claimed: true;
      receiptKey: string;
    }
  | {
      claimed: false;
      receiptKey: string;
      status: "processed" | "processing";
    };

export interface BillingReceiptStore {
  claim(
    input: BillingReceiptClaimInput,
  ): Promise<BillingReceiptClaimResult>;
  complete(
    tenantId: number,
    receiptKey: string,
  ): Promise<void>;
  fail(
    tenantId: number,
    receiptKey: string,
    safeCode: string,
  ): Promise<void>;
}

export interface BillingProviderProcessingEvent {
  tenantId: number;
  eventKey: string;
  receiptKey: string;
  event: BillingProviderEvent;
}

export interface BillingProviderEventProcessor {
  process(
    input: BillingProviderProcessingEvent,
  ): Promise<void>;
}

export class BillingProviderProcessorError extends Error {
  readonly safeCode: string;

  constructor(safeCode: string) {
    if (!/^[A-Z0-9_]{1,100}$/.test(safeCode)) {
      throw new Error(
        "Billing provider processor code is invalid",
      );
    }

    super("Billing provider processing failed");
    this.name = "BillingProviderProcessorError";
    this.safeCode = safeCode;
  }
}
