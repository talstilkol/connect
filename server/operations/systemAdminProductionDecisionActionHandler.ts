import {
  toProductionDecisionRecordView,
} from "../../shared/domain/productionDecisionRecord.ts";
import {
  SystemAdminSessionError,
  type SystemAdminSession,
} from "../auth/systemAdminSession.ts";
import type {
  SystemAdminProductionDecisionActionResult,
} from "./systemAdminProductionDecisionActionResult.ts";
import {
  SystemAdminProductionDecisionError,
  SystemAdminProductionDecisionInputError,
  type SystemAdminProductionDecisionService,
} from "./systemAdminProductionDecisionService.ts";

interface SystemAdminProductionDecisionActionContext {
  session: SystemAdminSession;
  service:
    SystemAdminProductionDecisionService;
}

export interface SystemAdminProductionDecisionActionHandlerDependencies {
  applicationConfigured(): boolean;
  createContext():
    Promise<SystemAdminProductionDecisionActionContext>;
}

export interface SystemAdminProductionDecisionActionHandler {
  save(
    input: unknown,
  ): Promise<SystemAdminProductionDecisionActionResult>;
}

export function createSystemAdminProductionDecisionActionHandler(
  dependencies:
    SystemAdminProductionDecisionActionHandlerDependencies,
): SystemAdminProductionDecisionActionHandler {
  return {
    async save(input) {
      if (
        !dependencies.applicationConfigured()
      ) {
        return {
          status:
            "configuration-required",
        };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const result = await service.save(
          session,
          input,
        );

        if (
          result.outcome !== "created" &&
          result.outcome !== "updated" &&
          result.outcome !== "unchanged"
        ) {
          return { status: "server-error" };
        }

        return {
          status: "saved",
          outcome: result.outcome,
          record:
            toProductionDecisionRecordView(
              result.record,
            ),
        };
      } catch (error) {
        if (
          error instanceof
          SystemAdminSessionError
        ) {
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
          SystemAdminProductionDecisionInputError
        ) {
          return {
            status: "invalid-input",
          };
        }

        if (
          error instanceof
          SystemAdminProductionDecisionError
        ) {
          return {
            status:
              error.code === "CONFLICT"
                ? "conflict"
                : "server-error",
          };
        }

        return { status: "server-error" };
      }
    },
  };
}
