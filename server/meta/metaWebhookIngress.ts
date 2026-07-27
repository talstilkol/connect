import type { MetaRepository } from "../../db/metaRepository";
import type { MetaConnectionRecord } from "../../shared/domain/metaConnection";
import {
  parseMetaWebhookEnvelope,
  type MetaWebhookEnvelope,
} from "./metaWebhookEnvelope.ts";
import {
  sha256Hex,
  verifyMetaWebhookSignature,
} from "./metaWebhookSecurity.ts";

export type MetaWebhookIngressErrorCode =
  | "INVALID_SIGNATURE"
  | "CONNECTION_NOT_FOUND"
  | "RECEIPT_ALREADY_PROCESSING"
  | "PROCESSING_FAILED"
  | "RECEIPT_TRANSITION_FAILED";

export class MetaWebhookIngressError extends Error {
  readonly code: MetaWebhookIngressErrorCode;

  constructor(code: MetaWebhookIngressErrorCode, message: string) {
    super(message);
    this.name = "MetaWebhookIngressError";
    this.code = code;
  }
}

export class MetaWebhookProcessorError extends Error {
  readonly safeCode: string;

  constructor(safeCode: string) {
    if (!/^[A-Z0-9_]{1,100}$/.test(safeCode)) {
      throw new Error("Meta webhook processor code is invalid");
    }

    super("Meta webhook processing failed");
    this.name = "MetaWebhookProcessorError";
    this.safeCode = safeCode;
  }
}

export interface MetaWebhookProcessingEvent {
  tenantId: number;
  receiptId: number;
  eventKey: string;
  connection: MetaConnectionRecord;
  envelope: MetaWebhookEnvelope;
}

export type MetaWebhookProcessor = (
  event: MetaWebhookProcessingEvent,
) => Promise<void>;

export type MetaWebhookIngressResult =
  | {
      outcome: "processed";
      tenantId: number;
      receiptId: number;
      eventKey: string;
    }
  | {
      outcome: "duplicate";
      tenantId: number;
      receiptId: number;
      eventKey: string;
    };

export interface MetaWebhookIngress {
  receive(
    rawPayload: Uint8Array,
    signatureHeader: string | null,
  ): Promise<MetaWebhookIngressResult>;
}

function processorFailureCode(error: unknown): string {
  return error instanceof MetaWebhookProcessorError
    ? error.safeCode
    : "META_PROCESSOR_FAILED";
}

export function createMetaWebhookIngress(
  repository: MetaRepository,
  processor: MetaWebhookProcessor,
  appSecret: string,
): MetaWebhookIngress {
  return {
    async receive(rawPayload, signatureHeader) {
      const signatureValid = await verifyMetaWebhookSignature(
        rawPayload,
        signatureHeader,
        appSecret,
      );

      if (!signatureValid) {
        throw new MetaWebhookIngressError(
          "INVALID_SIGNATURE",
          "Meta webhook signature is invalid",
        );
      }

      const envelope = parseMetaWebhookEnvelope(rawPayload);
      const connection = await repository.findConnectionByWabaId(
        envelope.wabaId,
      );

      if (!connection || connection.status !== "connected") {
        throw new MetaWebhookIngressError(
          "CONNECTION_NOT_FOUND",
          "Meta webhook WABA is not connected to a tenant",
        );
      }

      const eventKey = await sha256Hex(rawPayload);
      const claimedReceipt = await repository.claimWebhookReceipt({
        tenantId: connection.tenantId,
        wabaId: envelope.wabaId,
        eventKey,
        objectType: envelope.objectType,
      });

      if (!claimedReceipt.claimed) {
        if (claimedReceipt.receipt.status === "processed") {
          return {
            outcome: "duplicate",
            tenantId: connection.tenantId,
            receiptId: claimedReceipt.receipt.id,
            eventKey,
          };
        }

        throw new MetaWebhookIngressError(
          "RECEIPT_ALREADY_PROCESSING",
          "Meta webhook receipt is already being processed",
        );
      }

      try {
        await processor({
          tenantId: connection.tenantId,
          receiptId: claimedReceipt.receipt.id,
          eventKey,
          connection,
          envelope,
        });
      } catch (error) {
        try {
          await repository.failWebhookReceipt(
            connection.tenantId,
            claimedReceipt.receipt.id,
            processorFailureCode(error),
          );
        } catch {
          throw new MetaWebhookIngressError(
            "RECEIPT_TRANSITION_FAILED",
            "Meta webhook failure could not be recorded",
          );
        }

        throw new MetaWebhookIngressError(
          "PROCESSING_FAILED",
          "Meta webhook processing failed",
        );
      }

      try {
        await repository.completeWebhookReceipt(
          connection.tenantId,
          claimedReceipt.receipt.id,
        );
      } catch {
        throw new MetaWebhookIngressError(
          "RECEIPT_TRANSITION_FAILED",
          "Meta webhook completion could not be recorded",
        );
      }

      return {
        outcome: "processed",
        tenantId: connection.tenantId,
        receiptId: claimedReceipt.receipt.id,
        eventKey,
      };
    },
  };
}
