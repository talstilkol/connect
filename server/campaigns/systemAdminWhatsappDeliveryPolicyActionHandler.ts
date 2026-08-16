import {
  toWhatsappCampaignDeliveryPolicyRecordView,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import {
  SystemAdminSessionError,
  type SystemAdminSession,
} from "../auth/systemAdminSession.ts";
import type {
  SystemAdminWhatsappDeliveryPolicyActionResult,
} from "./systemAdminWhatsappDeliveryPolicyActionResult.ts";
import {
  SystemAdminWhatsappDeliveryPolicyError,
  SystemAdminWhatsappDeliveryPolicyInputError,
  type SystemAdminWhatsappDeliveryPolicyService,
} from "./systemAdminWhatsappDeliveryPolicyService.ts";

interface SystemAdminWhatsappDeliveryPolicyActionContext {
  session: SystemAdminSession;
  service:
    SystemAdminWhatsappDeliveryPolicyService;
}

export interface SystemAdminWhatsappDeliveryPolicyActionHandlerDependencies {
  applicationConfigured(): boolean;
  createContext():
    Promise<SystemAdminWhatsappDeliveryPolicyActionContext>;
}

export interface SystemAdminWhatsappDeliveryPolicyActionHandler {
  approve(
    input: unknown,
  ): Promise<SystemAdminWhatsappDeliveryPolicyActionResult>;
  activateKillSwitch(
    input: unknown,
  ): Promise<SystemAdminWhatsappDeliveryPolicyActionResult>;
}

export function createSystemAdminWhatsappDeliveryPolicyActionHandler(
  dependencies:
    SystemAdminWhatsappDeliveryPolicyActionHandlerDependencies,
): SystemAdminWhatsappDeliveryPolicyActionHandler {
  async function run(
    operation: (
      context:
        SystemAdminWhatsappDeliveryPolicyActionContext,
    ) => ReturnType<
      SystemAdminWhatsappDeliveryPolicyService["approve"]
    >,
  ): Promise<SystemAdminWhatsappDeliveryPolicyActionResult> {
    if (!dependencies.applicationConfigured()) {
      return {
        status: "configuration-required",
      };
    }

    try {
      const context =
        await dependencies.createContext();
      const result = await operation(
        context,
      );

      if (result.outcome === "conflict") {
        return { status: "server-error" };
      }

      return {
        status: "saved",
        outcome: result.outcome,
        record:
          toWhatsappCampaignDeliveryPolicyRecordView(
            result.record,
          ),
      };
    } catch (error) {
      if (error instanceof SystemAdminSessionError) {
        return {
          status:
            error.code ===
            "AUTHENTICATION_REQUIRED"
              ? "unauthenticated"
              : "permission-denied",
        };
      }

      if (
        error instanceof
        SystemAdminWhatsappDeliveryPolicyInputError
      ) {
        return { status: "invalid-input" };
      }

      if (
        error instanceof
        SystemAdminWhatsappDeliveryPolicyError
      ) {
        const status = {
          NOT_FOUND: "not-found",
          CONNECTION_NOT_READY:
            "connection-not-ready",
          CONFLICT: "conflict",
          PERSISTENCE_FAILED:
            "server-error",
        } as const;

        return {
          status: status[error.code],
        };
      }

      return { status: "server-error" };
    }
  }

  return {
    approve(input) {
      return run(({ session, service }) =>
        service.approve(session, input),
      );
    },

    activateKillSwitch(input) {
      return run(({ session, service }) =>
        service.activateKillSwitch(
          session,
          input,
        ),
      );
    },
  };
}
