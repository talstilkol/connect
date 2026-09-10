import type {
  MessageTemplateSubmissionOutboxRepository,
} from "../../db/messageTemplateSubmissionOutboxRepository.ts";
import type {
  MetaCredentialRepository,
} from "../../db/metaCredentialRepository.ts";
import {
  createMetaCredentialVault,
  type MetaCredentialVaultOptions,
} from "../meta/metaCredentialVault.ts";
import {
  requireMetaGraphConfiguration,
} from "../meta/metaGraphConfiguration.ts";
import {
  createMetaGraphTransport,
  type MetaGraphTransportOptions,
} from "../meta/metaGraphTransport.ts";
import {
  createMetaMessageTemplateAdapter,
} from "../templates/metaMessageTemplateAdapter.ts";
import {
  inspectMessageTemplateSubmissionReadiness,
  type MessageTemplateSubmissionEnvironment,
} from "../templates/messageTemplateSubmissionReadiness.ts";
import {
  createMessageTemplateSubmissionWorker,
} from "../templates/messageTemplateSubmissionWorker.ts";
import type {
  OperationalTelemetrySink,
} from "../operations/operationalTelemetry.ts";

export type RailwayMessageTemplateSubmissionWorkerRuntimeErrorCode =
  | "configuration-disabled"
  | "configuration-incomplete"
  | "dependencies-invalid";

export class RailwayMessageTemplateSubmissionWorkerRuntimeError extends Error {
  readonly code: RailwayMessageTemplateSubmissionWorkerRuntimeErrorCode;

  constructor(code: RailwayMessageTemplateSubmissionWorkerRuntimeErrorCode) {
    super(`Railway Meta template worker runtime failed: ${code}`);
    this.name = "RailwayMessageTemplateSubmissionWorkerRuntimeError";
    this.code = code;
  }
}

export interface RailwayMessageTemplateSubmissionWorkerRuntimeOptions {
  readonly environment: MessageTemplateSubmissionEnvironment;
  readonly outbox: MessageTemplateSubmissionOutboxRepository;
  readonly credentials: MetaCredentialRepository;
  readonly transportOptions?: MetaGraphTransportOptions;
  readonly credentialVaultOptions?: MetaCredentialVaultOptions;
  readonly clock?: () => string;
  readonly telemetrySink?: OperationalTelemetrySink;
  readonly telemetryClock?: Readonly<{ now: () => Date }>;
}

const allowedOptionKeys = Object.freeze([
  "clock",
  "credentialVaultOptions",
  "credentials",
  "environment",
  "outbox",
  "telemetryClock",
  "telemetrySink",
  "transportOptions",
]);

function requireOptions(
  options: Readonly<RailwayMessageTemplateSubmissionWorkerRuntimeOptions>,
): void {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some((key) => !allowedOptionKeys.includes(key)) ||
    !options.environment || typeof options.environment !== "object" ||
    typeof options.outbox?.claim !== "function" ||
    typeof options.outbox?.markSubmitted !== "function" ||
    typeof options.outbox?.markRejected !== "function" ||
    typeof options.outbox?.markAmbiguous !== "function" ||
    typeof options.credentials?.findByTenantId !== "function" ||
    typeof options.credentials?.store !== "function" ||
    (options.clock !== undefined && typeof options.clock !== "function") ||
    (options.telemetrySink !== undefined &&
      typeof options.telemetrySink.record !== "function") ||
    (options.telemetryClock !== undefined &&
      typeof options.telemetryClock.now !== "function") ||
    ((options.telemetrySink === undefined) !==
      (options.telemetryClock === undefined))
  ) {
    throw new RailwayMessageTemplateSubmissionWorkerRuntimeError(
      "dependencies-invalid",
    );
  }
}

/**
 * Railway-only composition boundary for one durable outbox delivery attempt.
 * The decrypted access token exists only inside the vault callback used by the
 * Meta adapter and is never exposed by the returned worker.
 */
export function createRailwayMessageTemplateSubmissionWorkerRuntime(
  options: Readonly<RailwayMessageTemplateSubmissionWorkerRuntimeOptions>,
) {
  requireOptions(options);
  const readiness = inspectMessageTemplateSubmissionReadiness(
    options.environment,
  );

  if (readiness.status !== "configured") {
    throw new RailwayMessageTemplateSubmissionWorkerRuntimeError(
      readiness.status === "disabled"
        ? "configuration-disabled"
        : "configuration-incomplete",
    );
  }

  const graphConfiguration = requireMetaGraphConfiguration(
    options.environment,
  );
  const credentialVault = createMetaCredentialVault(
    options.credentials,
    options.environment,
    options.credentialVaultOptions,
  );
  const transport = createMetaGraphTransport(
    graphConfiguration,
    options.transportOptions,
  );

  return createMessageTemplateSubmissionWorker({
    outbox: options.outbox,
    credentialVault,
    submitter: createMetaMessageTemplateAdapter(transport),
    graphApiVersion: graphConfiguration.apiVersion,
    clock: options.clock,
    ...(options.telemetrySink === undefined
      ? {}
      : {
          telemetry: Object.freeze({
            sink: options.telemetrySink,
            clock: options.telemetryClock!,
          }),
        }),
  });
}
