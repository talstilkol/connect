import type {
  MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import type {
  MetaCredentialVault,
} from "../meta/metaPorts.ts";
import {
  requireMetaGraphConfiguration,
} from "../meta/metaGraphConfiguration.ts";
import {
  createMetaGraphTransport,
  type MetaGraphTransportOptions,
} from "../meta/metaGraphTransport.ts";
import {
  createMetaMessageTemplateListAdapter,
} from "./metaMessageTemplateListAdapter.ts";
import type {
  MessageTemplateSubmissionEnvironment,
} from "./messageTemplateSubmissionReadiness.ts";
import {
  createMessageTemplateSyncService,
  type MessageTemplateSyncService,
} from "./messageTemplateSyncService.ts";

export interface MessageTemplateSyncRuntimeInput {
  environment: MessageTemplateSubmissionEnvironment;
  templates: MessageTemplateRepository;
  metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  credentialVault: MetaCredentialVault;
  transportOptions?: MetaGraphTransportOptions;
  clock?: () => Date;
}

export function createMessageTemplateSyncRuntime(
  input: MessageTemplateSyncRuntimeInput,
): MessageTemplateSyncService {
  const graphConfiguration =
    requireMetaGraphConfiguration(input.environment);
  const transport = createMetaGraphTransport(
    graphConfiguration,
    input.transportOptions,
  );

  return createMessageTemplateSyncService({
    templates: input.templates,
    metaConnections: input.metaConnections,
    credentialVault: input.credentialVault,
    lister: createMetaMessageTemplateListAdapter(transport),
    clock: input.clock,
  });
}
