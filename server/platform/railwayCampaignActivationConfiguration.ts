import {
  requireMetaGraphConfiguration,
  type MetaGraphEnvironment,
} from "../meta/metaGraphConfiguration.ts";

export interface RailwayCampaignActivationEnvironment extends MetaGraphEnvironment {
  readonly CAMPAIGN_ACTIVATION_ENABLED?: string;
}

/** Operator opt-in for new activations; does not probe or stop the delivery worker. */
export function inspectRailwayCampaignActivationConfiguration(
  environment: RailwayCampaignActivationEnvironment,
): Readonly<
  | { status: "disabled" }
  | { status: "invalid" }
  | { status: "configured"; graphApiVersion: string }
> {
  if (!environment || typeof environment !== "object" || Array.isArray(environment)) {
    return Object.freeze({ status: "invalid" });
  }
  const enabled = environment.CAMPAIGN_ACTIVATION_ENABLED;
  if (enabled === undefined || enabled === "" || enabled === "false") {
    return Object.freeze({ status: "disabled" });
  }
  if (enabled !== "true") return Object.freeze({ status: "invalid" });
  try {
    return Object.freeze({
      status: "configured",
      graphApiVersion: requireMetaGraphConfiguration(environment).apiVersion,
    });
  } catch {
    return Object.freeze({ status: "invalid" });
  }
}
