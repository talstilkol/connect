"use server";

import {
  createCurrentRailwayOperationalReportHandler,
} from "./currentRailwayOperationalReportHandler.ts";
import type {
  LoadOperationalReportActionResult,
} from "./operationalReportActionResult.ts";

export async function loadOperationalReportAction(
  input: unknown,
): Promise<LoadOperationalReportActionResult> {
  try {
    return await createCurrentRailwayOperationalReportHandler().load(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}
