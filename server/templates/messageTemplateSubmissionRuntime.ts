import type {
  MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import {
  createMetaGraphTransport,
  type MetaGraphTransportOptions,
} from "../meta/metaGraphTransport.ts";
import type {
  MetaCredentialVault,
} from "../meta/metaPorts.ts";
import {
  createMessageTemplateSubmissionService,
  type MessageTemplateSubmissionService,
} from "./messageTemplateSubmissionService.ts";
import {
  requireMetaGraphConfiguration,
} from "../meta/metaGraphConfiguration.ts";
import {
  createMetaMessageTemplateAdapter,
} from "./metaMessageTemplateAdapter.ts";
import type {
  MessageTemplateSubmissionEnvironment,
} from "./messageTemplateSubmissionReadiness.ts";

export interface MessageTemplateSubmissionRuntimeInput {
  environment: MessageTemplateSubmissionEnvironment;
  templates: MessageTemplateRepository;
  metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  credentialVault: MetaCredentialVault;
  transportOptions?: MetaGraphTransportOptions;
}

export function createMessageTemplateSubmissionRuntime(
  input: MessageTemplateSubmissionRuntimeInput,
): MessageTemplateSubmissionService {
  const graphConfiguration =
    requireMetaGraphConfiguration(input.environment);
  const transport = createMetaGraphTransport(
    graphConfiguration,
    input.transportOptions,
  );

  return createMessageTemplateSubmissionService({
    templates: input.templates,
    metaConnections: input.metaConnections,
    credentialVault: input.credentialVault,
    submitter:
      createMetaMessageTemplateAdapter(transport),
  });
}
