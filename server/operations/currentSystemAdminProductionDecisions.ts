import {
  createProductionDecisionRepository,
} from "../../db/productionDecisionRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  CurrentSystemAdminProductionDecisions,
} from "../../shared/domain/productionDecisionRecord.ts";
import {
  toProductionDecisionRecordView,
} from "../../shared/domain/productionDecisionRecord.ts";
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
  createSystemAdminProductionDecisionService,
} from "./systemAdminProductionDecisionService.ts";

export async function readCurrentSystemAdminProductionDecisions():
  Promise<CurrentSystemAdminProductionDecisions> {
  if (
    inspectClerkConfiguration().status !==
      "configured" ||
    inspectSystemAdminConfiguration().status !==
      "configured"
  ) {
    return {
      status: "configuration-required",
      records: [],
    };
  }

  try {
    const session =
      await requireCurrentSystemAdminSession();
    const database =
      await requireRuntimeDatabase();
    const service =
      createSystemAdminProductionDecisionService(
        createProductionDecisionRepository(
          database,
        ),
      );
    const records =
      await service.list(session);

    return {
      status: "ready",
      records: records.map(
        toProductionDecisionRecordView,
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
        records: [],
      };
    }

    return {
      status: "server-error",
      records: [],
    };
  }
}
