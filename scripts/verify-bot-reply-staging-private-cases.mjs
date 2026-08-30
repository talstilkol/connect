import {
  botReplyStagingPrivateCaseSourceVersion,
  createBotReplyStagingPrivateCaseSource,
} from "../server/operations/botReplyStagingPrivateCaseSource.ts";

const source = createBotReplyStagingPrivateCaseSource(
  process.env,
  Object.freeze({ now: () => new Date() }),
);
const configured = source.isConfigured() === true;

process.stdout.write(`${JSON.stringify({
  status: configured ? "configured" : "blocked",
  code: configured
    ? "BOT_REPLY_STAGING_PRIVATE_CASES_VERIFIED"
    : "BOT_REPLY_STAGING_PRIVATE_CASES_REQUIRED",
  sourceVersion: botReplyStagingPrivateCaseSourceVersion,
})}\n`);

if (!configured) process.exitCode = 1;
