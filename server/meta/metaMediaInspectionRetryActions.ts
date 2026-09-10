"use server";

import { createCurrentRailwayMetaMediaInspectionRetryHandler } from "./currentMetaMediaInspectionRetry.ts";
import type { MetaMediaInspectionRetryStatus } from "../../shared/domain/metaMediaInspectionRetry.ts";

export async function requestMetaMediaInspectionRetryAction(input: unknown): Promise<MetaMediaInspectionRetryStatus> {
  return createCurrentRailwayMetaMediaInspectionRetryHandler().request(input);
}
