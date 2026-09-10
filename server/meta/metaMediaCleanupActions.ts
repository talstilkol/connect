"use server";

import { createCurrentRailwayMetaMediaCleanupHandler } from "./currentMetaMediaCleanup.ts";
import type { MetaMediaCleanupRequestStatus } from "../../shared/domain/metaMediaCleanup.ts";

export async function requestMetaMediaCleanupAction(input: unknown): Promise<MetaMediaCleanupRequestStatus> {
  return createCurrentRailwayMetaMediaCleanupHandler().request(input);
}
