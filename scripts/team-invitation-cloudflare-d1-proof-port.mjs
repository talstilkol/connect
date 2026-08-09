import {
  buildTeamInvitationBrowserProofQuery,
  parseTeamInvitationBrowserProofRow,
  TeamInvitationBrowserProofReaderError,
} from "../db/teamInvitationBrowserProofReader.ts";

const accountIdPattern = /^[a-f0-9]{32}$/;
const databaseIdPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const maximumTokenLength = 2_048;
const maximumResponseLength = 16_384;

export class TeamInvitationCloudflareD1ProofPortError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      "TeamInvitationCloudflareD1ProofPortError";
    this.code = code;
  }
}

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return (
    actual.length === expected.length &&
    actual.every(
      (key, index) => key === expected[index],
    )
  );
}

function requireConfiguration(value) {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "accountId",
      "apiToken",
      "databaseId",
      "fetchImpl",
    ]) ||
    typeof value.accountId !== "string" ||
    !accountIdPattern.test(value.accountId) ||
    typeof value.databaseId !== "string" ||
    !databaseIdPattern.test(value.databaseId) ||
    typeof value.apiToken !== "string" ||
    value.apiToken.length < 24 ||
    value.apiToken.length > maximumTokenLength ||
    !/^[\x21-\x7e]+$/.test(value.apiToken) ||
    typeof value.fetchImpl !== "function"
  ) {
    throw new TeamInvitationCloudflareD1ProofPortError(
      "INVALID_CONFIGURATION",
    );
  }

  return value;
}

function requireResponseShape(value) {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "errors",
      "messages",
      "result",
      "success",
    ]) ||
    value.success !== true ||
    !Array.isArray(value.errors) ||
    value.errors.length !== 0 ||
    !Array.isArray(value.messages) ||
    !Array.isArray(value.result) ||
    value.result.length !== 1
  ) {
    throw new TeamInvitationCloudflareD1ProofPortError(
      "RESPONSE_INVALID",
    );
  }

  const queryResult = value.result[0];

  if (
    !isPlainObject(queryResult) ||
    !hasExactKeys(queryResult, [
      "meta",
      "results",
      "success",
    ]) ||
    queryResult.success !== true ||
    !Array.isArray(queryResult.results) ||
    queryResult.results.length !== 1 ||
    !isPlainObject(queryResult.meta) ||
    queryResult.meta.changed_db !== false ||
    queryResult.meta.changes !== 0 ||
    queryResult.meta.rows_written !== 0
  ) {
    throw new TeamInvitationCloudflareD1ProofPortError(
      "RESPONSE_INVALID",
    );
  }

  try {
    return parseTeamInvitationBrowserProofRow(
      queryResult.results[0],
    );
  } catch {
    throw new TeamInvitationCloudflareD1ProofPortError(
      "RESPONSE_INVALID",
    );
  }
}

function requireFetchResponse(value) {
  if (
    !isPlainObject(value) ||
    typeof value.status !== "number" ||
    !isPlainObject(value.headers) ||
    typeof value.headers.get !== "function" ||
    typeof value.text !== "function"
  ) {
    throw new TeamInvitationCloudflareD1ProofPortError(
      "RESPONSE_INVALID",
    );
  }

  return value;
}

function throwIfAborted(signal) {
  if (signal.aborted) {
    throw new TeamInvitationCloudflareD1ProofPortError(
      "ABORTED",
    );
  }
}

export function createTeamInvitationCloudflareD1ProofPort(
  rawConfiguration,
) {
  const configuration =
    requireConfiguration(rawConfiguration);
  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${configuration.accountId}/d1/database/${configuration.databaseId}/query`;

  return Object.freeze({
    async readDatabaseProof(input, signal) {
      throwIfAborted(signal);

      let query;

      try {
        query =
          buildTeamInvitationBrowserProofQuery(
            input,
          );
      } catch (error) {
        if (
          error instanceof
            TeamInvitationBrowserProofReaderError &&
          error.code === "INVALID_INPUT"
        ) {
          throw new TeamInvitationCloudflareD1ProofPortError(
            "INVALID_INPUT",
          );
        }

        throw new TeamInvitationCloudflareD1ProofPortError(
          "INVALID_INPUT",
        );
      }

      let rawResponse;

      try {
        rawResponse =
          await configuration.fetchImpl(
            endpoint,
            {
              method: "POST",
              headers: {
                Accept: "application/json",
                Authorization:
                  `Bearer ${configuration.apiToken}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                sql: query.sql,
                params: query.params,
              }),
              cache: "no-store",
              redirect: "error",
              signal,
            },
          );
      } catch {
        if (signal.aborted) {
          throw new TeamInvitationCloudflareD1ProofPortError(
            "ABORTED",
          );
        }

        throw new TeamInvitationCloudflareD1ProofPortError(
          "NETWORK_UNAVAILABLE",
        );
      }

      throwIfAborted(signal);

      const response =
        requireFetchResponse(rawResponse);
      const contentType =
        response.headers.get(
          "content-type",
        );

      if (
        response.status !== 200 ||
        typeof contentType !== "string" ||
        !contentType
          .toLowerCase()
          .includes("application/json")
      ) {
        throw new TeamInvitationCloudflareD1ProofPortError(
          "RESPONSE_INVALID",
        );
      }

      let text;

      try {
        text = await response.text();
      } catch {
        if (signal.aborted) {
          throw new TeamInvitationCloudflareD1ProofPortError(
            "ABORTED",
          );
        }

        throw new TeamInvitationCloudflareD1ProofPortError(
          "NETWORK_UNAVAILABLE",
        );
      }

      throwIfAborted(signal);

      if (
        text.length === 0 ||
        text.length > maximumResponseLength
      ) {
        throw new TeamInvitationCloudflareD1ProofPortError(
          "RESPONSE_INVALID",
        );
      }

      let value;

      try {
        value = JSON.parse(text);
      } catch {
        throw new TeamInvitationCloudflareD1ProofPortError(
          "RESPONSE_INVALID",
        );
      }

      return requireResponseShape(value);
    },
  });
}
