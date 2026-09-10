import type { MetaConnectionView } from "../../shared/domain/metaConnectionView.ts";
import { createCurrentRailwayMetaConnectionReadHandler } from "./currentRailwayMetaConnectionReadHandler.ts";

export async function readCurrentMetaConnection(): Promise<MetaConnectionView> {
  return createCurrentRailwayMetaConnectionReadHandler().read();
}
