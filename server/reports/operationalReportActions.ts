"use server";

import {
  createOperationalReportRepository,
} from "../../db/operationalReportRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantSession,
} from "../auth/currentTenantSession.ts";
import {
  createOperationalReportActionHandler,
} from "./operationalReportActionHandler.ts";
import type {
  LoadOperationalReportActionResult,
} from "./operationalReportActionResult.ts";
import {
  createOperationalReportService,
} from "./operationalReportService.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status ===
    "configured"
  );
}

function createActionHandler() {
  return createOperationalReportActionHandler({
    applicationConfigured,
    async createContext() {
      const database =
        await requireRuntimeDatabase();
      const session =
        await requireCurrentTenantSession(
          database,
        );
      const service =
        createOperationalReportService(
          createOperationalReportRepository(
            database,
          ),
        );

      return {
        session,
        service,
      };
    },
  });
}

export async function loadOperationalReportAction(
  input: unknown,
): Promise<LoadOperationalReportActionResult> {
  try {
    return await createActionHandler().load(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}
