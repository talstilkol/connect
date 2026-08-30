import type {
  MessageTemplateSubmissionCandidateRepository,
  MessageTemplateSubmissionOutboxRepository,
} from "../../db/messageTemplateSubmissionOutboxRepository.ts";
import type {
  MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import type {
  MetaCredentialRepository,
} from "../../db/metaCredentialRepository.ts";
import type {
  MetaCredentialVaultOptions,
} from "../meta/metaCredentialVault.ts";
import type {
  MetaGraphTransportOptions,
} from "../meta/metaGraphTransport.ts";
import {
  createMessageTemplateSubmissionMaintenanceRunner,
  type MessageTemplateSubmissionQueuePublisher,
} from "../templates/messageTemplateSubmissionMaintenanceRunner.ts";
import type {
  MessageTemplateSubmissionEnvironment,
} from "../templates/messageTemplateSubmissionReadiness.ts";
import type {
  MetaMessageTemplateListAdapterTelemetry,
} from "../templates/metaMessageTemplateListAdapter.ts";
import {
  createRailwayMessageTemplateSubmissionReconciliationRuntime,
} from "./railwayMessageTemplateSubmissionReconciliationRuntime.ts";

export interface RailwayMessageTemplateSubmissionMaintenanceRuntimeOptions {
  readonly environment: MessageTemplateSubmissionEnvironment;
  readonly outbox: MessageTemplateSubmissionOutboxRepository &
    MessageTemplateSubmissionCandidateRepository;
  readonly templates: Pick<MessageTemplateRepository, "findByKey">;
  readonly credentials: MetaCredentialRepository;
  readonly publisher: MessageTemplateSubmissionQueuePublisher;
  readonly transportOptions?: MetaGraphTransportOptions;
  readonly credentialVaultOptions?: MetaCredentialVaultOptions;
  readonly clock?: () => string;
  readonly notFoundGraceSeconds?: number;
  readonly batchSize?: number;
  readonly pendingMinimumAgeSeconds?: number;
  readonly ambiguousMinimumAgeSeconds?: number;
  readonly providerRequestTelemetry?: MetaMessageTemplateListAdapterTelemetry;
}

/**
 * Railway scheduler composition. The queue publisher remains an explicit port
 * until the production queue service and its delivery contract are approved.
 */
export function createRailwayMessageTemplateSubmissionMaintenanceRuntime(
  options: Readonly<
    RailwayMessageTemplateSubmissionMaintenanceRuntimeOptions
  >,
) {
  const reconciler =
    createRailwayMessageTemplateSubmissionReconciliationRuntime({
      environment: options.environment,
      outbox: options.outbox,
      templates: options.templates,
      credentials: options.credentials,
      transportOptions: options.transportOptions,
      credentialVaultOptions: options.credentialVaultOptions,
      clock: options.clock,
      notFoundGraceSeconds: options.notFoundGraceSeconds,
      providerRequestTelemetry: options.providerRequestTelemetry,
    });

  return createMessageTemplateSubmissionMaintenanceRunner({
    candidates: options.outbox,
    publisher: options.publisher,
    reconciler,
    clock: options.clock,
    batchSize: options.batchSize,
    pendingMinimumAgeSeconds: options.pendingMinimumAgeSeconds,
    ambiguousMinimumAgeSeconds: options.ambiguousMinimumAgeSeconds,
  });
}
