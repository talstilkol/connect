import type {
  MetaCredentialRepository,
} from "../../db/metaCredentialRepository.ts";
import type {
  MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import {
  createMetaCredentialVault,
  type MetaCredentialVaultOptions,
} from "../meta/metaCredentialVault.ts";
import {
  createMessageTemplateSubmissionRuntime,
} from "../templates/messageTemplateSubmissionRuntime.ts";
import {
  inspectMessageTemplateSubmissionReadiness,
  type MessageTemplateSubmissionEnvironment,
} from "../templates/messageTemplateSubmissionReadiness.ts";
import type {
  MessageTemplateSubmissionService,
} from "../templates/messageTemplateSubmissionService.ts";
import {
  createMessageTemplateSyncRuntime,
} from "../templates/messageTemplateSyncRuntime.ts";
import type {
  MessageTemplateSyncService,
} from "../templates/messageTemplateSyncService.ts";
import type {
  MetaGraphTransportOptions,
} from "../meta/metaGraphTransport.ts";

export type RailwayMessageTemplateProviderRuntimeErrorCode =
  | "configuration-disabled"
  | "configuration-incomplete"
  | "dependencies-invalid";

export class RailwayMessageTemplateProviderRuntimeError extends Error {
  readonly code: RailwayMessageTemplateProviderRuntimeErrorCode;

  constructor(code: RailwayMessageTemplateProviderRuntimeErrorCode) {
    super(`Railway Meta template runtime failed: ${code}`);
    this.name = "RailwayMessageTemplateProviderRuntimeError";
    this.code = code;
  }
}

export interface RailwayMessageTemplateProviderRuntimeOptions {
  readonly environment: MessageTemplateSubmissionEnvironment;
  readonly templates: MessageTemplateRepository;
  readonly metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  readonly credentials: MetaCredentialRepository;
  readonly transportOptions?: MetaGraphTransportOptions;
  readonly credentialVaultOptions?: MetaCredentialVaultOptions;
  readonly clock?: () => Date;
}

export interface RailwayMessageTemplateProviderRuntime {
  readonly submission: MessageTemplateSubmissionService;
  readonly synchronization: MessageTemplateSyncService;
}

const allowedOptionKeys = Object.freeze([
  "clock",
  "credentialVaultOptions",
  "credentials",
  "environment",
  "metaConnections",
  "templates",
  "transportOptions",
]);

function requireOptions(
  options: Readonly<RailwayMessageTemplateProviderRuntimeOptions>,
): void {
  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).some(
      (key) => !allowedOptionKeys.includes(key),
    ) ||
    !options.environment ||
    typeof options.environment !== "object" ||
    typeof options.templates?.findByKey !== "function" ||
    typeof options.templates?.claimSubmission !== "function" ||
    typeof options.templates?.completeSubmission !== "function" ||
    typeof options.templates?.releaseSubmission !== "function" ||
    typeof options.templates?.applyStatusEvent !== "function" ||
    typeof options.templates?.listByTenant !== "function" ||
    typeof options.metaConnections?.findConnectionByTenantId !== "function" ||
    typeof options.credentials?.findByTenantId !== "function" ||
    typeof options.credentials?.store !== "function" ||
    (options.clock !== undefined && typeof options.clock !== "function")
  ) {
    throw new RailwayMessageTemplateProviderRuntimeError(
      "dependencies-invalid",
    );
  }
}

/**
 * Railway-only composition boundary for Meta template provider operations.
 * The encrypted envelope remains in PostgreSQL and the access token is only
 * decrypted inside the server-side vault callback used by the Graph adapter.
 * No secret or repository is exposed by the returned runtime.
 */
export function createRailwayMessageTemplateProviderRuntime(
  options: Readonly<RailwayMessageTemplateProviderRuntimeOptions>,
): Readonly<RailwayMessageTemplateProviderRuntime> {
  requireOptions(options);
  const readiness = inspectMessageTemplateSubmissionReadiness(
    options.environment,
  );

  if (readiness.status !== "configured") {
    throw new RailwayMessageTemplateProviderRuntimeError(
      readiness.status === "disabled"
        ? "configuration-disabled"
        : "configuration-incomplete",
    );
  }

  const credentialVault = createMetaCredentialVault(
    options.credentials,
    options.environment,
    options.credentialVaultOptions,
  );
  const common = Object.freeze({
    environment: options.environment,
    templates: options.templates,
    metaConnections: options.metaConnections,
    credentialVault,
    transportOptions: options.transportOptions,
  });

  return Object.freeze({
    submission: createMessageTemplateSubmissionRuntime(common),
    synchronization: createMessageTemplateSyncRuntime({
      ...common,
      clock: options.clock,
    }),
  });
}
