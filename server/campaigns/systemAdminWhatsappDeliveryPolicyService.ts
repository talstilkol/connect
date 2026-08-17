import type {
  WhatsappCampaignDeliveryPolicyRepository,
} from "../../db/whatsappCampaignDeliveryPolicyRepository.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import type {
  WhatsappCampaignDeliveryPolicyMutationResult,
  WhatsappCampaignDeliveryPolicyRecord,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import type {
  WhatsappPhoneThroughputPolicy,
  WhatsappPortfolioCapacity,
} from "../../shared/domain/whatsappRateLimit.ts";
import type {
  SystemAdminSession,
} from "../auth/systemAdminSession.ts";
import {
  requireWhatsappDeliveryPolicyDigest,
  requireWhatsappDeliveryPolicyGraphVersion,
  requireWhatsappDeliveryPolicyPositiveInteger,
  requireWhatsappDeliveryPolicyTimestamp,
  requireWhatsappDeliveryPolicyVersion,
  requireWhatsappPortfolioCapacity,
  requireWhatsappPhoneThroughputPolicy,
  requireWhatsappProviderIdentifier,
  requireWhatsappReservationDuration,
} from "./whatsappCampaignDeliveryPolicyValidation.ts";

export type SystemAdminWhatsappDeliveryPolicyErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "CONNECTION_NOT_READY"
  | "PERSISTENCE_FAILED";

export class SystemAdminWhatsappDeliveryPolicyInputError extends Error {
  constructor() {
    super(
      "System admin WhatsApp delivery policy input is invalid",
    );
    this.name =
      "SystemAdminWhatsappDeliveryPolicyInputError";
  }
}

export class SystemAdminWhatsappDeliveryPolicyError extends Error {
  readonly code:
    SystemAdminWhatsappDeliveryPolicyErrorCode;

  constructor(
    code:
      SystemAdminWhatsappDeliveryPolicyErrorCode,
  ) {
    super(
      "System admin WhatsApp delivery policy operation failed",
    );
    this.name =
      "SystemAdminWhatsappDeliveryPolicyError";
    this.code = code;
  }
}

export interface SystemAdminWhatsappDeliveryPolicyService {
  approve(
    session: SystemAdminSession,
    input: unknown,
  ): Promise<WhatsappCampaignDeliveryPolicyMutationResult>;
  activateKillSwitch(
    session: SystemAdminSession,
    input: unknown,
  ): Promise<WhatsappCampaignDeliveryPolicyMutationResult>;
}

type Clock = () => string;

interface NormalizedApprovalInput {
  tenantId: number;
  expectedConnectionVersion: number;
  expectedPolicyVersion: number;
  businessPortfolioId: string;
  wabaId: string;
  phoneNumberId: string;
  portfolioCapacity:
    WhatsappPortfolioCapacity;
  phoneThroughput: WhatsappPhoneThroughputPolicy;
  reservationDurationSeconds: number;
  metaGraphApiVersion: string;
  evidenceDigest: string;
  evidenceCheckedAt: string;
  evidenceExpiresAt: string;
}

interface NormalizedKillSwitchInput {
  tenantId: number;
  expectedConnectionVersion: number;
  expectedPolicyVersion: number;
}

function inputError(): never {
  throw new SystemAdminWhatsappDeliveryPolicyInputError();
}

function isExactRecord(
  value: unknown,
  fields: readonly string[],
): value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !==
      Object.prototype
  ) {
    return false;
  }

  const keys = Object.keys(value);

  return (
    keys.length === fields.length &&
    keys.every((key) =>
      fields.includes(key),
    )
  );
}

function normalizeApprovalInput(
  input: unknown,
): NormalizedApprovalInput {
  if (
    !isExactRecord(input, [
      "tenantId",
      "expectedConnectionVersion",
      "expectedPolicyVersion",
      "businessPortfolioId",
      "wabaId",
      "phoneNumberId",
      "portfolioLimitKind",
      "portfolioLimitValue",
      "phoneThroughputMessagesPerSecond",
      "maximumOutboundMessagesPerSecond",
      "reservationDurationSeconds",
      "metaGraphApiVersion",
      "evidenceDigest",
      "evidenceCheckedAt",
      "evidenceExpiresAt",
    ])
  ) {
    return inputError();
  }

  try {
    return {
      tenantId:
        requireWhatsappDeliveryPolicyPositiveInteger(
          input.tenantId,
          "tenant",
        ),
      expectedConnectionVersion:
        requireWhatsappDeliveryPolicyPositiveInteger(
          input.expectedConnectionVersion,
          "connection version",
        ),
      expectedPolicyVersion:
        requireWhatsappDeliveryPolicyVersion(
          input.expectedPolicyVersion,
          true,
        ),
      businessPortfolioId:
        requireWhatsappProviderIdentifier(
          input.businessPortfolioId,
          "business portfolio identifier",
        ),
      wabaId:
        requireWhatsappProviderIdentifier(
          input.wabaId,
          "WABA identifier",
        ),
      phoneNumberId:
        requireWhatsappProviderIdentifier(
          input.phoneNumberId,
          "phone number identifier",
        ),
      portfolioCapacity:
        requireWhatsappPortfolioCapacity(
          input.portfolioLimitKind,
          input.portfolioLimitValue,
        ),
      phoneThroughput:
        requireWhatsappPhoneThroughputPolicy(
          input.phoneThroughputMessagesPerSecond,
          input.maximumOutboundMessagesPerSecond,
        ),
      reservationDurationSeconds:
        requireWhatsappReservationDuration(
          input.reservationDurationSeconds,
        ),
      metaGraphApiVersion:
        requireWhatsappDeliveryPolicyGraphVersion(
          input.metaGraphApiVersion,
        ),
      evidenceDigest:
        requireWhatsappDeliveryPolicyDigest(
          input.evidenceDigest,
        ),
      evidenceCheckedAt:
        requireWhatsappDeliveryPolicyTimestamp(
          input.evidenceCheckedAt,
          "evidence checked timestamp",
        ),
      evidenceExpiresAt:
        requireWhatsappDeliveryPolicyTimestamp(
          input.evidenceExpiresAt,
          "evidence expiration timestamp",
        ),
    };
  } catch {
    return inputError();
  }
}

function normalizeKillSwitchInput(
  input: unknown,
): NormalizedKillSwitchInput {
  if (
    !isExactRecord(input, [
      "tenantId",
      "expectedConnectionVersion",
      "expectedPolicyVersion",
    ])
  ) {
    return inputError();
  }

  try {
    return {
      tenantId:
        requireWhatsappDeliveryPolicyPositiveInteger(
          input.tenantId,
          "tenant",
        ),
      expectedConnectionVersion:
        requireWhatsappDeliveryPolicyPositiveInteger(
          input.expectedConnectionVersion,
          "connection version",
        ),
      expectedPolicyVersion:
        requireWhatsappDeliveryPolicyVersion(
          input.expectedPolicyVersion,
        ),
    };
  } catch {
    return inputError();
  }
}

function requireSessionActor(
  session: SystemAdminSession,
): string {
  try {
    return requireWhatsappProviderIdentifier(
      session?.externalUserId,
      "actor",
    );
  } catch {
    throw new SystemAdminWhatsappDeliveryPolicyError(
      "PERSISTENCE_FAILED",
    );
  }
}

function currentTimestamp(
  clock: Clock,
): string {
  try {
    return requireWhatsappDeliveryPolicyTimestamp(
      clock(),
      "recorded timestamp",
    );
  } catch {
    throw new SystemAdminWhatsappDeliveryPolicyError(
      "PERSISTENCE_FAILED",
    );
  }
}

function capacityColumns(
  capacity: WhatsappPortfolioCapacity,
): readonly ["bounded", number] | readonly ["unlimited", null] {
  return capacity.kind === "bounded"
    ? [
        "bounded",
        capacity.maximumUniqueRecipients,
      ]
    : ["unlimited", null];
}

function requireMutationResult(
  result:
    WhatsappCampaignDeliveryPolicyMutationResult,
  tenantId: number,
): WhatsappCampaignDeliveryPolicyMutationResult {
  if (result.outcome === "conflict") {
    throw new SystemAdminWhatsappDeliveryPolicyError(
      "CONFLICT",
    );
  }

  if (
    result.record.tenantId !== tenantId
  ) {
    throw new SystemAdminWhatsappDeliveryPolicyError(
      "PERSISTENCE_FAILED",
    );
  }

  return result;
}

function unchanged(
  record:
    WhatsappCampaignDeliveryPolicyRecord,
): WhatsappCampaignDeliveryPolicyMutationResult {
  return {
    outcome: "unchanged",
    record,
  };
}

export function createSystemAdminWhatsappDeliveryPolicyService(
  dependencies: {
    metaRepository: Pick<
      MetaRepository,
      "findConnectionByTenantId"
    >;
    policyRepository: Pick<
      WhatsappCampaignDeliveryPolicyRepository,
      "findLatestPolicyEvent" | "recordPolicyEvent"
    >;
  },
  clock: Clock = () =>
    new Date().toISOString(),
): SystemAdminWhatsappDeliveryPolicyService {
  async function loadState(
    tenantId: number,
  ) {
    try {
      const [connection, latestPolicy] =
        await Promise.all([
          dependencies.metaRepository
            .findConnectionByTenantId(
              tenantId,
            ),
          dependencies.policyRepository
            .findLatestPolicyEvent(
              tenantId,
            ),
        ]);

      return {
        connection,
        latestPolicy,
      };
    } catch {
      throw new SystemAdminWhatsappDeliveryPolicyError(
        "PERSISTENCE_FAILED",
      );
    }
  }

  async function record(
    command: Parameters<
      WhatsappCampaignDeliveryPolicyRepository["recordPolicyEvent"]
    >[0],
    tenantId: number,
  ) {
    try {
      return requireMutationResult(
        await dependencies.policyRepository
          .recordPolicyEvent(command),
        tenantId,
      );
    } catch (error) {
      if (
        error instanceof
        SystemAdminWhatsappDeliveryPolicyError
      ) {
        throw error;
      }

      throw new SystemAdminWhatsappDeliveryPolicyError(
        "PERSISTENCE_FAILED",
      );
    }
  }

  return {
    async approve(session, input) {
      const actorExternalUserId =
        requireSessionActor(session);
      const normalized =
        normalizeApprovalInput(input);
      const recordedAt =
        currentTimestamp(clock);
      const {
        connection,
        latestPolicy,
      } = await loadState(
        normalized.tenantId,
      );

      if (!connection) {
        throw new SystemAdminWhatsappDeliveryPolicyError(
          "NOT_FOUND",
        );
      }

      if (
        connection.version !==
          normalized.expectedConnectionVersion ||
        connection.businessPortfolioId !==
          normalized.businessPortfolioId ||
        connection.wabaId !==
          normalized.wabaId ||
        connection.phoneNumberId !==
          normalized.phoneNumberId ||
        (latestPolicy?.policyVersion ?? 0) !==
          normalized.expectedPolicyVersion
      ) {
        throw new SystemAdminWhatsappDeliveryPolicyError(
          "CONFLICT",
        );
      }

      if (connection.status !== "connected") {
        throw new SystemAdminWhatsappDeliveryPolicyError(
          "CONNECTION_NOT_READY",
        );
      }

      if (
        normalized.evidenceCheckedAt >
          recordedAt ||
        normalized.evidenceCheckedAt >=
          normalized.evidenceExpiresAt ||
        recordedAt >=
          normalized.evidenceExpiresAt
      ) {
        return inputError();
      }

      const [
        portfolioLimitKind,
        portfolioLimitValue,
      ] = capacityColumns(
        normalized.portfolioCapacity,
      );

      return record(
        {
          tenantId: normalized.tenantId,
          connectionVersion:
            connection.version,
          expectedPolicyVersion:
            normalized.expectedPolicyVersion,
          deliveryState: "enabled",
          portfolioLimitKind,
          portfolioLimitValue,
          phoneThroughputMessagesPerSecond:
            normalized.phoneThroughput
              .maximumMessagesPerSecond,
          maximumOutboundMessagesPerSecond:
            normalized.phoneThroughput
              .maximumOutboundMessagesPerSecond,
          reservationDurationSeconds:
            normalized.reservationDurationSeconds,
          metaGraphApiVersion:
            normalized.metaGraphApiVersion,
          evidenceDigest:
            normalized.evidenceDigest,
          evidenceCheckedAt:
            normalized.evidenceCheckedAt,
          evidenceExpiresAt:
            normalized.evidenceExpiresAt,
          actorExternalUserId,
          recordedAt,
        },
        normalized.tenantId,
      );
    },

    async activateKillSwitch(
      session,
      input,
    ) {
      const actorExternalUserId =
        requireSessionActor(session);
      const normalized =
        normalizeKillSwitchInput(input);
      const recordedAt =
        currentTimestamp(clock);
      const {
        connection,
        latestPolicy,
      } = await loadState(
        normalized.tenantId,
      );

      if (!connection || !latestPolicy) {
        throw new SystemAdminWhatsappDeliveryPolicyError(
          "NOT_FOUND",
        );
      }

      if (
        connection.version !==
          normalized.expectedConnectionVersion ||
        latestPolicy.policyVersion !==
          normalized.expectedPolicyVersion
      ) {
        throw new SystemAdminWhatsappDeliveryPolicyError(
          "CONFLICT",
        );
      }

      if (
        latestPolicy.deliveryState ===
        "disabled"
      ) {
        return unchanged(latestPolicy);
      }

      const [
        portfolioLimitKind,
        portfolioLimitValue,
      ] = capacityColumns(
        latestPolicy.portfolioCapacity,
      );

      return record(
        {
          tenantId: normalized.tenantId,
          connectionVersion:
            connection.version,
          expectedPolicyVersion:
            normalized.expectedPolicyVersion,
          deliveryState: "disabled",
          portfolioLimitKind,
          portfolioLimitValue,
          phoneThroughputMessagesPerSecond:
            latestPolicy.phoneThroughput
              ?.maximumMessagesPerSecond ?? null,
          maximumOutboundMessagesPerSecond:
            latestPolicy.phoneThroughput
              ?.maximumOutboundMessagesPerSecond ?? null,
          reservationDurationSeconds:
            latestPolicy.reservationDurationSeconds,
          metaGraphApiVersion:
            latestPolicy.metaGraphApiVersion,
          evidenceDigest:
            latestPolicy.evidenceDigest,
          evidenceCheckedAt:
            latestPolicy.evidenceCheckedAt,
          evidenceExpiresAt:
            latestPolicy.evidenceExpiresAt,
          actorExternalUserId,
          recordedAt,
        },
        normalized.tenantId,
      );
    },
  };
}
