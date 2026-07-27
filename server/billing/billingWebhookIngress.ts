import type {
  BillingProviderAdapter,
  BillingProviderEventProcessor,
  BillingReceiptStore,
  BillingTenantResolver,
  BillingWebhookRequest,
} from "./billingProviderContracts.ts";
import {
  BillingProviderAdapterError,
  BillingProviderProcessorError,
} from "./billingProviderContracts.ts";
import {
  BillingProviderEventError,
  parseBillingProviderEvent,
} from "./billingProviderEvent.ts";
import {
  requirePositiveTenantId,
} from "./tenantSubscriptionValidation.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";

const MAX_BODY_BYTES = 262_144;
const MAX_HEADER_COUNT = 32;
const MAX_HEADER_VALUE_LENGTH = 4_096;
const HEADER_NAME_PATTERN =
  /^[!#$%&'*+\-.^_`|~0-9a-z]+$/;

export type BillingWebhookIngressErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_SIGNATURE"
  | "INVALID_PROVIDER_EVENT"
  | "PROVIDER_UNAVAILABLE"
  | "TENANT_NOT_FOUND"
  | "TENANT_RESOLUTION_FAILED"
  | "RECEIPT_ALREADY_PROCESSING"
  | "RECEIPT_STORE_FAILED"
  | "PROCESSING_FAILED"
  | "RECEIPT_TRANSITION_FAILED";

export class BillingWebhookIngressError extends Error {
  readonly code: BillingWebhookIngressErrorCode;

  constructor(
    code: BillingWebhookIngressErrorCode,
  ) {
    super("Billing webhook processing failed");
    this.name = "BillingWebhookIngressError";
    this.code = code;
  }
}

export type BillingWebhookIngressResult =
  | {
      outcome: "processed";
      tenantId: number;
      eventKey: string;
      receiptKey: string;
    }
  | {
      outcome: "duplicate";
      tenantId: number;
      eventKey: string;
      receiptKey: string;
    };

export interface BillingWebhookIngress {
  receive(
    request: BillingWebhookRequest,
  ): Promise<BillingWebhookIngressResult>;
}

function validateRequest(
  request: BillingWebhookRequest,
): BillingWebhookRequest {
  if (
    typeof request !== "object" ||
    request === null ||
    !(request.rawBody instanceof Uint8Array) ||
    request.rawBody.byteLength === 0 ||
    request.rawBody.byteLength > MAX_BODY_BYTES ||
    typeof request.headers !== "object" ||
    request.headers === null ||
    Array.isArray(request.headers)
  ) {
    throw new BillingWebhookIngressError(
      "INVALID_REQUEST",
    );
  }

  const headerEntries = Object.entries(
    request.headers,
  );

  if (headerEntries.length > MAX_HEADER_COUNT) {
    throw new BillingWebhookIngressError(
      "INVALID_REQUEST",
    );
  }

  const headers: Record<string, string> = {};

  for (const [name, value] of headerEntries) {
    if (
      !HEADER_NAME_PATTERN.test(name) ||
      typeof value !== "string" ||
      value.length > MAX_HEADER_VALUE_LENGTH ||
      /[\r\n]/.test(value)
    ) {
      throw new BillingWebhookIngressError(
        "INVALID_REQUEST",
      );
    }

    headers[name] = value;
  }

  return {
    rawBody: request.rawBody.slice(),
    headers: Object.freeze(headers),
  };
}

function mapAdapterError(
  error: unknown,
): BillingWebhookIngressError {
  if (error instanceof BillingProviderAdapterError) {
    return new BillingWebhookIngressError(
      error.code,
    );
  }

  return new BillingWebhookIngressError(
    "INVALID_PROVIDER_EVENT",
  );
}

function processorFailureCode(
  error: unknown,
): string {
  return error instanceof
    BillingProviderProcessorError
    ? error.safeCode
    : "BILLING_PROCESSOR_FAILED";
}

function validReceiptKey(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 255 &&
    value.trim() === value &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

export async function createBillingProviderEventKey(
  providerKey: string,
  providerEventId: string,
): Promise<string> {
  const source = new TextEncoder().encode(
    `billing-provider-event-v1:${providerKey}:${providerEventId}`,
  );

  return `billing_provider_event_v1_${await sha256Hex(source)}`;
}

export function createBillingWebhookIngress(
  adapter: BillingProviderAdapter,
  tenantResolver: BillingTenantResolver,
  receiptStore: BillingReceiptStore,
  processor: BillingProviderEventProcessor,
): BillingWebhookIngress {
  return {
    async receive(request) {
      const validatedRequest =
        validateRequest(request);

      if (adapter.providerKey === null) {
        throw new BillingWebhookIngressError(
          "PROVIDER_UNAVAILABLE",
        );
      }

      let normalizedValue: unknown;

      try {
        normalizedValue =
          await adapter.verifyAndNormalize(
            validatedRequest,
          );
      } catch (error) {
        throw mapAdapterError(error);
      }

      let event;

      try {
        event =
          parseBillingProviderEvent(
            normalizedValue,
          );
      } catch (error) {
        if (
          error instanceof
          BillingProviderEventError
        ) {
          throw new BillingWebhookIngressError(
            "INVALID_PROVIDER_EVENT",
          );
        }

        throw error;
      }

      if (event.providerKey !== adapter.providerKey) {
        throw new BillingWebhookIngressError(
          "INVALID_PROVIDER_EVENT",
        );
      }

      let resolution;

      try {
        resolution =
          await tenantResolver.resolve({
          providerKey: event.providerKey,
          providerCustomerReference:
            event.providerCustomerReference,
          providerSubscriptionReference:
            event.providerSubscriptionReference,
        });
      } catch {
        throw new BillingWebhookIngressError(
          "TENANT_RESOLUTION_FAILED",
        );
      }

      if (!resolution) {
        throw new BillingWebhookIngressError(
          "TENANT_NOT_FOUND",
        );
      }

      let tenantId: number;

      try {
        tenantId = requirePositiveTenantId(
          resolution.tenantId,
        );
      } catch {
        throw new BillingWebhookIngressError(
          "TENANT_NOT_FOUND",
        );
      }

      const eventKey =
        await createBillingProviderEventKey(
          event.providerKey,
          event.providerEventId,
        );
      let receipt;

      try {
        receipt = await receiptStore.claim({
          tenantId,
          providerKey: event.providerKey,
          providerEventId:
            event.providerEventId,
          eventKey,
          eventType: event.type,
        });
      } catch {
        throw new BillingWebhookIngressError(
          "RECEIPT_STORE_FAILED",
        );
      }

      if (
        !receipt ||
        typeof receipt.claimed !== "boolean" ||
        !validReceiptKey(receipt.receiptKey) ||
        (
          !receipt.claimed &&
          receipt.status !== "processed" &&
          receipt.status !== "processing"
        )
      ) {
        throw new BillingWebhookIngressError(
          "RECEIPT_STORE_FAILED",
        );
      }

      if (!receipt.claimed) {
        if (receipt.status === "processed") {
          return {
            outcome: "duplicate",
            tenantId,
            eventKey,
            receiptKey: receipt.receiptKey,
          };
        }

        throw new BillingWebhookIngressError(
          "RECEIPT_ALREADY_PROCESSING",
        );
      }

      try {
        await processor.process({
          tenantId,
          eventKey,
          receiptKey: receipt.receiptKey,
          event,
        });
      } catch (error) {
        try {
          await receiptStore.fail(
            tenantId,
            receipt.receiptKey,
            processorFailureCode(error),
          );
        } catch {
          throw new BillingWebhookIngressError(
            "RECEIPT_TRANSITION_FAILED",
          );
        }

        throw new BillingWebhookIngressError(
          "PROCESSING_FAILED",
        );
      }

      try {
        await receiptStore.complete(
          tenantId,
          receipt.receiptKey,
        );
      } catch {
        throw new BillingWebhookIngressError(
          "RECEIPT_TRANSITION_FAILED",
        );
      }

      return {
        outcome: "processed",
        tenantId,
        eventKey,
        receiptKey: receipt.receiptKey,
      };
    },
  };
}
