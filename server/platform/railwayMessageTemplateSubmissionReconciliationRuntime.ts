import type {
  MessageTemplateSubmissionOutboxRepository,
} from "../../db/messageTemplateSubmissionOutboxRepository.ts";
import type {
  MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
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
  createMetaMessageTemplateListAdapter,
  type MetaMessageTemplateListAdapterTelemetry,
} from "../templates/metaMessageTemplateListAdapter.ts";
import {
  createMessageTemplateSubmissionReconciliation,
} from "../templates/messageTemplateSubmissionReconciliation.ts";
import {
  inspectMessageTemplateSubmissionReadiness,
  type MessageTemplateSubmissionEnvironment,
} from "../templates/messageTemplateSubmissionReadiness.ts";

export type RailwayMessageTemplateSubmissionReconciliationRuntimeErrorCode =
  | "configuration-disabled"
  | "configuration-incomplete"
  | "dependencies-invalid";

export class RailwayMessageTemplateSubmissionReconciliationRuntimeError
  extends Error {
  readonly code:
    RailwayMessageTemplateSubmissionReconciliationRuntimeErrorCode;

  constructor(
    code: RailwayMessageTemplateSubmissionReconciliationRuntimeErrorCode,
  ) {
    super(`Railway Meta template reconciliation runtime failed: ${code}`);
    this.name =
      "RailwayMessageTemplateSubmissionReconciliationRuntimeError";
    this.code = code;
  }
}

export interface RailwayMessageTemplateSubmissionReconciliationRuntimeOptions {
  readonly environment: MessageTemplateSubmissionEnvironment;
  readonly outbox: MessageTemplateSubmissionOutboxRepository;
  readonly templates: Pick<MessageTemplateRepository, "findByKey">;
  readonly credentials: MetaCredentialRepository;
  readonly transportOptions?: MetaGraphTransportOptions;
  readonly credentialVaultOptions?: MetaCredentialVaultOptions;
  readonly clock?: () => string;
  readonly notFoundGraceSeconds?: number;
  readonly providerRequestTelemetry?: MetaMessageTemplateListAdapterTelemetry;
}

const allowedOptionKeys = Object.freeze([
  "clock",
  "credentialVaultOptions",
  "credentials",
  "environment",
  "notFoundGraceSeconds",
  "outbox",
  "providerRequestTelemetry",
  "templates",
  "transportOptions",
]);

function requireOptions(
  options: Readonly<
    RailwayMessageTemplateSubmissionReconciliationRuntimeOptions
  >,
): void {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some((key) => !allowedOptionKeys.includes(key)) ||
    !options.environment || typeof options.environment !== "object" ||
    typeof options.outbox?.find !== "function" ||
    typeof options.outbox?.reconcileSubmitted !== "function" ||
    typeof options.outbox?.reconcileRejected !== "function" ||
    typeof options.templates?.findByKey !== "function" ||
    typeof options.credentials?.findByTenantId !== "function" ||
    typeof options.credentials?.store !== "function" ||
    (options.clock !== undefined && typeof options.clock !== "function") ||
    (options.providerRequestTelemetry !== undefined && (
      typeof options.providerRequestTelemetry.scope?.record !== "function" ||
      typeof options.providerRequestTelemetry.clock?.now !== "function"
    ))
  ) {
    throw new RailwayMessageTemplateSubmissionReconciliationRuntimeError(
      "dependencies-invalid",
    );
  }
}

/**
 * Railway-only read/reconcile composition for provider outcomes that are not
 * known after the original POST. This runtime can issue GET requests only;
 * it deliberately has no Meta submission adapter and therefore cannot resend.
 */
export function createRailwayMessageTemplateSubmissionReconciliationRuntime(
  options: Readonly<
    RailwayMessageTemplateSubmissionReconciliationRuntimeOptions
  >,
) {
  requireOptions(options);
  const readiness = inspectMessageTemplateSubmissionReadiness(
    options.environment,
  );

  if (readiness.status !== "configured") {
    throw new RailwayMessageTemplateSubmissionReconciliationRuntimeError(
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

  return createMessageTemplateSubmissionReconciliation({
    outbox: options.outbox,
    templates: options.templates,
    credentialVault,
    lister: createMetaMessageTemplateListAdapter(
      transport,
      options.providerRequestTelemetry,
    ),
    clock: options.clock,
    notFoundGraceSeconds: options.notFoundGraceSeconds,
  });
}
