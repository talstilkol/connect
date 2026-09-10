import type {
  MessageTemplateSubmissionOutboxRepository,
} from "../../db/messageTemplateSubmissionOutboxRepository.ts";
import {
  MetaCredentialVaultError,
} from "../meta/metaCredentialVault.ts";
import {
  MetaGraphError,
} from "../meta/metaGraphTransport.ts";
import type {
  MetaCredentialVault,
} from "../meta/metaPorts.ts";
import {
  MetaMessageTemplateContractError,
  type MetaMessageTemplateSubmitter,
  type SubmittedMetaMessageTemplate,
} from "./metaMessageTemplateAdapter.ts";
import {
  recordOperationalTelemetry,
  type ProviderRequestTelemetry,
  type OperationalTelemetrySink,
} from "../operations/operationalTelemetry.ts";
import {
  createMessageTemplateSubmissionQueueMessage,
} from "./messageTemplateSubmissionQueueMessage.ts";

export type MessageTemplateSubmissionWorkerOutcome =
  | "submitted"
  | "rejected"
  | "ambiguous"
  | "blocked"
  | "duplicate"
  | "not-found";

export interface MessageTemplateSubmissionWorkerResult {
  readonly outcome: MessageTemplateSubmissionWorkerOutcome;
}

export class MessageTemplateSubmissionWorkerError extends Error {
  constructor() {
    super("Message template submission worker could not complete");
    this.name = "MessageTemplateSubmissionWorkerError";
  }
}

export interface MessageTemplateSubmissionWorkerDependencies {
  readonly outbox: MessageTemplateSubmissionOutboxRepository;
  readonly credentialVault: Pick<MetaCredentialVault, "withAccessToken">;
  readonly submitter: MetaMessageTemplateSubmitter;
  readonly graphApiVersion: string;
  readonly clock?: () => string;
  readonly telemetry?: Readonly<{
    sink: OperationalTelemetrySink;
    clock: Readonly<{ now: () => Date }>;
  }>;
}

const graphVersionPattern = /^v[1-9][0-9]*\.[0-9]+$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const metaTemplateIdPattern = /^[1-9][0-9]{0,254}$/;

function requireTimestamp(value: unknown): string {
  if (
    typeof value !== "string" || !timestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value
  ) {
    throw new MessageTemplateSubmissionWorkerError();
  }

  return value;
}

function parseProviderResult(
  value: unknown,
  expectedCategory: "MARKETING" | "UTILITY",
): Readonly<SubmittedMetaMessageTemplate> | null {
  if (
    typeof value !== "object" || value === null || Array.isArray(value) ||
    Object.keys(value).length !== 3
  ) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.metaTemplateId !== "string" ||
    !metaTemplateIdPattern.test(record.metaTemplateId) ||
    record.status !== "pending_review" ||
    record.category !== expectedCategory
  ) {
    return null;
  }

  return Object.freeze({
    metaTemplateId: record.metaTemplateId,
    status: "pending_review" as const,
    category: expectedCategory,
  });
}

function knownRejectionCode(error: unknown): string | null {
  if (error instanceof MetaCredentialVaultError) {
    return "CREDENTIAL_UNAVAILABLE";
  }

  if (error instanceof MetaMessageTemplateContractError) {
    return error.code === "INVALID_TEMPLATE_REQUEST"
      ? "META_TEMPLATE_REQUEST_INVALID"
      : null;
  }

  if (!(error instanceof MetaGraphError)) {
    return null;
  }

  if (error.code === "INVALID_REQUEST") {
    return "META_TEMPLATE_REQUEST_INVALID";
  }

  if (
    error.code === "API_ERROR" && error.httpStatus !== null &&
    error.httpStatus >= 400 && error.httpStatus < 500
  ) {
    return error.httpStatus === 429
      ? "META_RATE_LIMITED"
      : "META_TEMPLATE_REJECTED";
  }

  return null;
}

function readTelemetryClock(
  telemetry: MessageTemplateSubmissionWorkerDependencies["telemetry"],
): Date | null {
  if (telemetry === undefined) {
    return null;
  }

  try {
    const value = telemetry.clock.now();
    return value instanceof Date && Number.isFinite(value.getTime())
      ? value
      : null;
  } catch {
    return null;
  }
}

function providerMeasurement(
  started: Date | null,
  completed: Date | null,
  outcome: ProviderRequestTelemetry["outcome"],
): ProviderRequestTelemetry | undefined {
  if (
    started === null ||
    completed === null ||
    completed.getTime() < started.getTime()
  ) {
    return undefined;
  }

  return Object.freeze({
    provider: "meta",
    operation: "message-template.submit",
    outcome,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMilliseconds: completed.getTime() - started.getTime(),
  });
}

async function recordDeliveryAttempt(
  telemetry: MessageTemplateSubmissionWorkerDependencies["telemetry"],
  started: Date | null,
  completed: Date | null,
  outcome: MessageTemplateSubmissionWorkerOutcome | "failed",
  providerRequest: ProviderRequestTelemetry | undefined,
): Promise<void> {
  if (
    telemetry === undefined ||
    started === null ||
    completed === null ||
    completed.getTime() < started.getTime()
  ) {
    return;
  }

  await recordOperationalTelemetry(telemetry.sink, {
    version: 1,
    kind: "delivery-attempt",
    queue: "message-template-submission",
    outcome,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMilliseconds: completed.getTime() - started.getTime(),
    ...(providerRequest === undefined
      ? {}
      : { providerRequests: [providerRequest] }),
  });
}

export function createMessageTemplateSubmissionWorker(
  dependencies: Readonly<MessageTemplateSubmissionWorkerDependencies>,
) {
  if (
    !dependencies || typeof dependencies !== "object" ||
    typeof dependencies.outbox?.claim !== "function" ||
    typeof dependencies.outbox?.markSubmitted !== "function" ||
    typeof dependencies.outbox?.markRejected !== "function" ||
    typeof dependencies.outbox?.markAmbiguous !== "function" ||
    typeof dependencies.credentialVault?.withAccessToken !== "function" ||
    typeof dependencies.submitter?.submit !== "function" ||
    typeof dependencies.graphApiVersion !== "string" ||
    !graphVersionPattern.test(dependencies.graphApiVersion) ||
    (dependencies.clock !== undefined && typeof dependencies.clock !== "function") ||
    (dependencies.telemetry !== undefined && (
      typeof dependencies.telemetry !== "object" ||
      typeof dependencies.telemetry.sink?.record !== "function" ||
      typeof dependencies.telemetry.clock?.now !== "function"
    ))
  ) {
    throw new MessageTemplateSubmissionWorkerError();
  }

  const clock = dependencies.clock ?? (() => new Date().toISOString());
  const timestamp = () => requireTimestamp(clock());

  async function markRejected(
    tenantId: number,
    submissionKey: string,
    errorCode: string,
  ): Promise<MessageTemplateSubmissionWorkerResult> {
    try {
      await dependencies.outbox.markRejected(
        tenantId,
        submissionKey,
        errorCode,
        timestamp(),
      );
      return Object.freeze({ outcome: "rejected" as const });
    } catch {
      throw new MessageTemplateSubmissionWorkerError();
    }
  }

  async function markAmbiguous(
    tenantId: number,
    submissionKey: string,
  ): Promise<MessageTemplateSubmissionWorkerResult> {
    try {
      await dependencies.outbox.markAmbiguous(
        tenantId,
        submissionKey,
        "PROVIDER_OUTCOME_UNKNOWN",
        timestamp(),
      );
      return Object.freeze({ outcome: "ambiguous" as const });
    } catch {
      throw new MessageTemplateSubmissionWorkerError();
    }
  }

  return Object.freeze({
    async process(
      tenantIdInput: unknown,
      submissionKeyInput: unknown,
    ): Promise<MessageTemplateSubmissionWorkerResult> {
      const deliveryStarted = readTelemetryClock(dependencies.telemetry);
      let providerRequest: ProviderRequestTelemetry | undefined;

      try {
        const result = await (async (): Promise<
          MessageTemplateSubmissionWorkerResult
        > => {
          let message;

          try {
            message = createMessageTemplateSubmissionQueueMessage(
              tenantIdInput,
              submissionKeyInput,
            );
          } catch {
            throw new MessageTemplateSubmissionWorkerError();
          }

          let claim;

          try {
            claim = await dependencies.outbox.claim(
              message.tenantId,
              message.submissionKey,
              dependencies.graphApiVersion,
              timestamp(),
            );
          } catch {
            throw new MessageTemplateSubmissionWorkerError();
          }

          if (claim.outcome !== "claimed") {
            return Object.freeze({ outcome: claim.outcome });
          }

          let providerResult: Readonly<SubmittedMetaMessageTemplate> | null;

          try {
            providerResult = await dependencies.credentialVault.withAccessToken(
              message.tenantId,
              async (accessToken) => {
                const providerStarted = readTelemetryClock(
                  dependencies.telemetry,
                );
                try {
                  const submitted = await dependencies.submitter.submit({
                    wabaId: claim.prepared.outbox.wabaId,
                    accessToken,
                    template: claim.prepared.template,
                  });
                  providerRequest = providerMeasurement(
                    providerStarted,
                    readTelemetryClock(dependencies.telemetry),
                    "completed",
                  );
                  return parseProviderResult(
                    submitted,
                    claim.prepared.template.category,
                  );
                } catch (error) {
                  providerRequest = providerMeasurement(
                    providerStarted,
                    readTelemetryClock(dependencies.telemetry),
                    "failed",
                  );
                  throw error;
                }
              },
            );
          } catch (error) {
            const rejectionCode = knownRejectionCode(error);
            return rejectionCode === null
              ? markAmbiguous(message.tenantId, message.submissionKey)
              : markRejected(
                  message.tenantId,
                  message.submissionKey,
                  rejectionCode,
                );
          }

          if (providerResult === null) {
            return markAmbiguous(message.tenantId, message.submissionKey);
          }

          try {
            await dependencies.outbox.markSubmitted(
              message.tenantId,
              message.submissionKey,
              providerResult.metaTemplateId,
              timestamp(),
            );
          } catch {
            throw new MessageTemplateSubmissionWorkerError();
          }

          return Object.freeze({ outcome: "submitted" as const });
        })();
        await recordDeliveryAttempt(
          dependencies.telemetry,
          deliveryStarted,
          readTelemetryClock(dependencies.telemetry),
          result.outcome,
          providerRequest,
        );
        return result;
      } catch (error) {
        await recordDeliveryAttempt(
          dependencies.telemetry,
          deliveryStarted,
          readTelemetryClock(dependencies.telemetry),
          "failed",
          providerRequest,
        );
        throw error;
      }
    },
  });
}
