import type {
  BotFlowRepository,
} from "../../db/botFlowRepository.ts";
import type {
  PersistedBotFlow,
  PersistedBotFlowVersion,
  ValidatedBotFlowDefinition,
} from "../../shared/domain/botFlow.ts";
import {
  validateBotFlowDefinition,
  type BotFlowDefinitionIssue,
} from "../../shared/validation/botFlowDefinition.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "./botFlowKey.ts";
import {
  compileKeywordButtonMenuBotFlowComposerDraft,
  compileKeywordBotFlowComposerDraft,
  compileKeywordSequenceBotFlowComposerDraft,
} from "./botFlowComposer.ts";

const BOT_FLOW_LIST_LIMIT = 100;
const BOT_FLOW_VERSION_LIST_LIMIT = 100;
const BOT_FLOW_KEY_PATTERN =
  /^bot_flow_v1_[0-9a-f]{64}$/;
const BOT_FLOW_VERSION_KEY_PATTERN =
  /^bot_flow_version_v1_[0-9a-f]{64}$/;

export type BotFlowServiceErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "STATE_CONFLICT"
  | "INVALID_STATE"
  | "PERSISTENCE_FAILED";

export class BotFlowServiceError extends Error {
  readonly code: BotFlowServiceErrorCode;

  constructor(code: BotFlowServiceErrorCode) {
    super("Bot flow operation failed");
    this.name = "BotFlowServiceError";
    this.code = code;
  }
}

export class BotFlowInputError extends Error {
  readonly issues: readonly BotFlowDefinitionIssue[];

  constructor(
    issues: readonly BotFlowDefinitionIssue[],
  ) {
    super("Bot flow validation failed");
    this.name = "BotFlowInputError";
    this.issues = issues;
  }
}

export interface BotFlowDetails {
  flow: PersistedBotFlow;
  versions: readonly PersistedBotFlowVersion[];
}

export interface SavedBotFlowDraft {
  outcome: "created" | "updated" | "unchanged";
  flow: PersistedBotFlow;
  draftVersion: PersistedBotFlowVersion;
}

export interface PublishedBotFlowDraft {
  outcome: "updated" | "unchanged";
  flow: PersistedBotFlow;
  publishedVersion: PersistedBotFlowVersion;
}

interface SaveDraftRequest {
  definition: ValidatedBotFlowDefinition;
  expectedFlowVersion: number | null;
}

interface PublishDraftRequest {
  botFlowKey: string;
  botFlowVersionKey: string;
  expectedFlowVersion: number;
}

export interface BotFlowService {
  list(
    session: TenantSession,
  ): Promise<readonly PersistedBotFlow[]>;
  readDetails(
    session: TenantSession,
    botFlowKey: unknown,
  ): Promise<BotFlowDetails>;
  saveDraft(
    session: TenantSession,
    input: unknown,
  ): Promise<SavedBotFlowDraft>;
  publishDraft(
    session: TenantSession,
    input: unknown,
  ): Promise<PublishedBotFlowDraft>;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  input: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const inputKeys = Object.keys(input);

  return (
    inputKeys.length === keys.length &&
    keys.every((key) =>
      Object.hasOwn(input, key),
    )
  );
}

function isPositiveInteger(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function parseBotFlowKey(
  value: unknown,
): string | null {
  return typeof value === "string" &&
    BOT_FLOW_KEY_PATTERN.test(value)
    ? value
    : null;
}

async function parseSaveDraftRequest(
  tenantId: number,
  input: unknown,
): Promise<SaveDraftRequest> {
  const buttonMenuComposerResult =
    await compileKeywordButtonMenuBotFlowComposerDraft(
      tenantId,
      input,
    );

  if (buttonMenuComposerResult.success) {
    return {
      definition:
        buttonMenuComposerResult.definition,
      expectedFlowVersion:
        buttonMenuComposerResult.expectedFlowVersion,
    };
  }

  const sequenceComposerResult =
    await compileKeywordSequenceBotFlowComposerDraft(
      tenantId,
      input,
    );

  if (sequenceComposerResult.success) {
    return {
      definition:
        sequenceComposerResult.definition,
      expectedFlowVersion:
        sequenceComposerResult.expectedFlowVersion,
    };
  }

  const legacyComposerResult =
    await compileKeywordBotFlowComposerDraft(
      tenantId,
      input,
    );

  if (legacyComposerResult.success) {
    return {
      definition:
        legacyComposerResult.definition,
      expectedFlowVersion:
        legacyComposerResult.expectedFlowVersion,
    };
  }

  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      "definition",
      "expectedFlowVersion",
    ]) ||
    (input.expectedFlowVersion !== null &&
      !isPositiveInteger(
        input.expectedFlowVersion,
      ))
  ) {
    const preferredComposerFailure = [
      buttonMenuComposerResult,
      sequenceComposerResult,
      legacyComposerResult,
    ].find(
      (result) =>
        !result.issues.includes("invalid-input"),
    );

    throw new BotFlowInputError([
      ...(preferredComposerFailure?.issues ?? [
        "invalid-input" as const,
      ]),
    ]);
  }

  const validation =
    validateBotFlowDefinition(
      input.definition,
    );

  if (!validation.success) {
    throw new BotFlowInputError(
      validation.issues,
    );
  }

  return {
    definition: validation.value,
    expectedFlowVersion:
      input.expectedFlowVersion,
  };
}

function parsePublishDraftRequest(
  input: unknown,
): PublishDraftRequest | null {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      "botFlowKey",
      "botFlowVersionKey",
      "expectedFlowVersion",
    ])
  ) {
    return null;
  }

  const botFlowKey = parseBotFlowKey(
    input.botFlowKey,
  );
  const botFlowVersionKey =
    typeof input.botFlowVersionKey ===
      "string" &&
    BOT_FLOW_VERSION_KEY_PATTERN.test(
      input.botFlowVersionKey,
    )
      ? input.botFlowVersionKey
      : null;

  if (
    !botFlowKey ||
    !botFlowVersionKey ||
    !isPositiveInteger(
      input.expectedFlowVersion,
    )
  ) {
    return null;
  }

  return {
    botFlowKey,
    botFlowVersionKey,
    expectedFlowVersion:
      input.expectedFlowVersion,
  };
}

function serviceError(
  code: BotFlowServiceErrorCode,
): BotFlowServiceError {
  return new BotFlowServiceError(code);
}

function rethrowPersistenceError(
  error: unknown,
): never {
  if (
    error instanceof BotFlowServiceError ||
    error instanceof BotFlowInputError
  ) {
    throw error;
  }

  throw serviceError("PERSISTENCE_FAILED");
}

async function assertStoredFlowIdentity(
  tenantId: number,
  flow: PersistedBotFlow,
): Promise<void> {
  const expectedBotFlowKey =
    await deriveBotFlowKey(
      tenantId,
      flow.name,
    );

  if (
    flow.tenantId !== tenantId ||
    expectedBotFlowKey !== flow.botFlowKey
  ) {
    throw serviceError("PERSISTENCE_FAILED");
  }
}

async function assertStoredVersionIdentity(
  tenantId: number,
  version: PersistedBotFlowVersion,
): Promise<void> {
  const expectedBotFlowKey =
    await deriveBotFlowKey(
      tenantId,
      version.definition.name,
    );
  const expectedVersionKey =
    await deriveBotFlowVersionKey(
      tenantId,
      version.botFlowKey,
      version.versionNumber,
      version.definition,
    );

  if (
    version.tenantId !== tenantId ||
    expectedBotFlowKey !==
      version.botFlowKey ||
    expectedVersionKey !==
      version.botFlowVersionKey
  ) {
    throw serviceError("PERSISTENCE_FAILED");
  }
}

export function createBotFlowService(
  repository: BotFlowRepository,
): BotFlowService {
  return {
    async list(session) {
      requireTenantPermission(
        session,
        "bot.read",
      );

      try {
        const flows =
          await repository.listByTenant(
          session.tenantId,
          BOT_FLOW_LIST_LIMIT,
        );

        await Promise.all(
          flows.map((flow) =>
            assertStoredFlowIdentity(
              session.tenantId,
              flow,
            ),
          ),
        );

        return flows;
      } catch (error) {
        return rethrowPersistenceError(error);
      }
    },

    async readDetails(
      session,
      botFlowKeyInput,
    ) {
      requireTenantPermission(
        session,
        "bot.read",
      );
      const botFlowKey = parseBotFlowKey(
        botFlowKeyInput,
      );

      if (!botFlowKey) {
        throw serviceError("INVALID_INPUT");
      }

      try {
        const flow = await repository.findByKey(
          session.tenantId,
          botFlowKey,
        );

        if (!flow) {
          throw serviceError("NOT_FOUND");
        }

        await assertStoredFlowIdentity(
          session.tenantId,
          flow,
        );
        const versions =
          await repository.listVersions(
            session.tenantId,
            botFlowKey,
            BOT_FLOW_VERSION_LIST_LIMIT,
          );
        await Promise.all(
          versions.map((version) =>
            assertStoredVersionIdentity(
              session.tenantId,
              version,
            ),
          ),
        );
        const latestVersion = versions.find(
          (version) =>
            version.botFlowVersionKey ===
            flow.latestVersionKey,
        );

        if (
          !latestVersion ||
          latestVersion.versionNumber !==
            flow.latestVersionNumber
        ) {
          throw serviceError(
            "PERSISTENCE_FAILED",
          );
        }

        return { flow, versions };
      } catch (error) {
        return rethrowPersistenceError(error);
      }
    },

    async saveDraft(session, input) {
      requireTenantPermission(
        session,
        "bot.write",
      );
      const request =
        await parseSaveDraftRequest(
          session.tenantId,
          input,
        );

      try {
        const botFlowKey =
          await deriveBotFlowKey(
            session.tenantId,
            request.definition.name,
          );
        let versionNumber = 1;

        if (
          request.expectedFlowVersion !== null
        ) {
          const existing =
            await repository.findByKey(
              session.tenantId,
              botFlowKey,
            );

          if (!existing) {
            throw serviceError("NOT_FOUND");
          }

          await assertStoredFlowIdentity(
            session.tenantId,
            existing,
          );

          if (
            existing.version ===
            request.expectedFlowVersion
          ) {
            versionNumber =
              existing.latestVersionNumber + 1;
          } else if (
            existing.version ===
            request.expectedFlowVersion + 1
          ) {
            versionNumber =
              existing.latestVersionNumber;
          } else {
            throw serviceError(
              "STATE_CONFLICT",
            );
          }
        }

        const botFlowVersionKey =
          await deriveBotFlowVersionKey(
            session.tenantId,
            botFlowKey,
            versionNumber,
            request.definition,
          );
        const result =
          await repository.saveDraft({
            tenantId: session.tenantId,
            botFlowKey,
            botFlowVersionKey,
            versionNumber,
            expectedFlowVersion:
              request.expectedFlowVersion,
            definition: request.definition,
          });

        if (
          result.outcome === "created" ||
          result.outcome === "updated" ||
          result.outcome === "unchanged"
        ) {
          return result;
        }

        if (result.outcome === "not-found") {
          throw serviceError("NOT_FOUND");
        }

        throw serviceError("STATE_CONFLICT");
      } catch (error) {
        return rethrowPersistenceError(error);
      }
    },

    async publishDraft(session, input) {
      requireTenantPermission(
        session,
        "bot.write",
      );
      const request =
        parsePublishDraftRequest(input);

      if (!request) {
        throw serviceError("INVALID_INPUT");
      }

      try {
        const targetVersion =
          await repository.findVersionByKey(
            session.tenantId,
            request.botFlowKey,
            request.botFlowVersionKey,
          );

        if (!targetVersion) {
          throw serviceError("NOT_FOUND");
        }

        await assertStoredVersionIdentity(
          session.tenantId,
          targetVersion,
        );

        if (
          targetVersion.botFlowKey !==
            request.botFlowKey ||
          targetVersion.botFlowVersionKey !==
            request.botFlowVersionKey
        ) {
          throw serviceError(
            "PERSISTENCE_FAILED",
          );
        }

        const result =
          await repository.publishDraft(
            session.tenantId,
            request.botFlowKey,
            request.botFlowVersionKey,
            request.expectedFlowVersion,
          );

        if (
          result.outcome === "updated" ||
          result.outcome === "unchanged"
        ) {
          return result;
        }

        if (result.outcome === "not-found") {
          throw serviceError("NOT_FOUND");
        }

        if (result.outcome === "conflict") {
          throw serviceError(
            "STATE_CONFLICT",
          );
        }

        throw serviceError("INVALID_STATE");
      } catch (error) {
        return rethrowPersistenceError(error);
      }
    },
  };
}
