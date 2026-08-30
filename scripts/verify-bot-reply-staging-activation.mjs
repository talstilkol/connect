import {
  inspectRailwayBotReplyStagingActivation,
} from "../server/platform/railwayBotReplyStagingActivationPreflight.ts";

const result = inspectRailwayBotReplyStagingActivation(process.env);
process.stdout.write(`${JSON.stringify(result)}\n`);
if (result.activationAllowed !== true) process.exitCode = 1;
