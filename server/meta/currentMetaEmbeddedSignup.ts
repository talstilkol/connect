import type { MetaEmbeddedSignupView } from "../../shared/domain/metaEmbeddedSignupView.ts";
import { createCurrentRailwayMetaSignupHandler } from "./currentRailwayMetaSignupHandler.ts";

export async function readCurrentMetaEmbeddedSignup(): Promise<MetaEmbeddedSignupView> {
  return createCurrentRailwayMetaSignupHandler().readConfiguration();
}
