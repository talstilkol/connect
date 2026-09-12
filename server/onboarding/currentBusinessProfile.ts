import type {
  BusinessProfileView,
} from "../../shared/domain/businessProfileView.ts";
import {
  createCurrentRailwayBusinessProfileHandler,
} from "./currentRailwayBusinessProfileHandler.ts";

export async function readCurrentBusinessProfile(): Promise<
  BusinessProfileView | null
> {
  const result = await createCurrentRailwayBusinessProfileHandler().load();
  if (
    result.status === "configuration-required" ||
    result.status === "unauthenticated" ||
    (result.status === "loaded" && result.profile === null)
  ) {
    return null;
  }
  if (result.status !== "loaded" || result.profile === null) {
    throw new Error("Current business profile is unavailable");
  }
  return Object.freeze({
    businessName: result.profile.businessName,
    timezone: result.profile.timezone,
    interfaceLanguage: result.profile.interfaceLanguage,
    version: result.profile.version,
  });
}
