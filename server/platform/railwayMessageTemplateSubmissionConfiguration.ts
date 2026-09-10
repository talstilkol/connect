import {
  requireMetaGraphConfiguration,
  type MetaGraphEnvironment,
} from "../meta/metaGraphConfiguration.ts";

export interface RailwayMessageTemplateSubmissionEnvironment
  extends MetaGraphEnvironment {
  readonly MESSAGE_TEMPLATE_SUBMISSION_ENABLED?: string;
}

/** Deployment opt-in, not a claim that the remote worker is healthy. */
export function inspectRailwayMessageTemplateSubmissionConfiguration(
  environment: RailwayMessageTemplateSubmissionEnvironment,
): Readonly<
  | { status: "disabled" }
  | { status: "invalid" }
  | { status: "configured"; graphApiVersion: string }
> {
  const enabled = environment.MESSAGE_TEMPLATE_SUBMISSION_ENABLED;
  if (enabled === undefined || enabled === "" || enabled === "false") {
    return Object.freeze({ status: "disabled" });
  }
  if (enabled !== "true") return Object.freeze({ status: "invalid" });

  try {
    const graph = requireMetaGraphConfiguration(environment);
    return Object.freeze({
      status: "configured",
      graphApiVersion: graph.apiVersion,
    });
  } catch {
    return Object.freeze({ status: "invalid" });
  }
}
