import {
  createMetaRepository,
} from "../../db/metaRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import {
  createWhatsappCampaignDeliveryPolicyRepository,
} from "../../db/whatsappCampaignDeliveryPolicyRepository.ts";
import type {
  CurrentSystemAdminWhatsappDeliveryPolicy,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import {
  toWhatsappCampaignDeliveryPolicyRecordView,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentSystemAdminSession,
} from "../auth/currentSystemAdminSession.ts";
import {
  inspectSystemAdminConfiguration,
} from "../auth/systemAdminConfiguration.ts";
import {
  SystemAdminSessionError,
} from "../auth/systemAdminSession.ts";
import {
  requireWhatsappDeliveryPolicyPositiveInteger,
} from "./whatsappCampaignDeliveryPolicyValidation.ts";

const emptyResult = {
  connection: null,
  record: null,
} as const;

export async function readCurrentSystemAdminWhatsappDeliveryPolicy(
  tenantIdInput: unknown,
): Promise<CurrentSystemAdminWhatsappDeliveryPolicy> {
  if (
    inspectClerkConfiguration().status !==
      "configured" ||
    inspectSystemAdminConfiguration().status !==
      "configured"
  ) {
    return {
      status: "configuration-required",
      ...emptyResult,
    };
  }

  try {
    const tenantId =
      requireWhatsappDeliveryPolicyPositiveInteger(
        tenantIdInput,
        "tenant",
      );
    await requireCurrentSystemAdminSession();
    const database =
      await requireRuntimeDatabase();
    const metaRepository =
      createMetaRepository(database);
    const policyRepository =
      createWhatsappCampaignDeliveryPolicyRepository(
        database,
      );
    const [connection, record] =
      await Promise.all([
        metaRepository
          .findConnectionByTenantId(
            tenantId,
          ),
        policyRepository
          .findLatestPolicyEvent(
            tenantId,
          ),
      ]);

    if (!connection) {
      return {
        status: "not-found",
        ...emptyResult,
      };
    }

    return {
      status: "ready",
      connection: {
        tenantId: connection.tenantId,
        businessPortfolioId:
          connection.businessPortfolioId,
        wabaId: connection.wabaId,
        phoneNumberId:
          connection.phoneNumberId,
        status: connection.status,
        version: connection.version,
      },
      record: record
        ? toWhatsappCampaignDeliveryPolicyRecordView(
            record,
          )
        : null,
    };
  } catch (error) {
    if (error instanceof SystemAdminSessionError) {
      return {
        status:
          error.code ===
          "AUTHENTICATION_REQUIRED"
            ? "unauthenticated"
            : "permission-denied",
        ...emptyResult,
      };
    }

    return {
      status: "server-error",
      ...emptyResult,
    };
  }
}
