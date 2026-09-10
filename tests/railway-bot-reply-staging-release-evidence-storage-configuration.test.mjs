import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration,
  railwayBotReplyStagingReleaseEvidenceStoragePolicyVersion,
} from "../server/platform/railwayBotReplyStagingReleaseEvidenceStorageConfiguration.ts";

test("requires an explicit release evidence storage selection", () => {
  for (const environment of [{}, {
    BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "",
  }]) {
    assert.deepEqual(
      inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration(
        environment,
      ),
      {
        status: "disabled",
        code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORAGE_REQUIRED",
        policyVersion: null,
        storageMode: null,
        publicationMode: null,
        runtimeReadMode: null,
        environmentVariablePublication: false,
      },
    );
  }
});

test("selects PostgreSQL transactional storage without environment publication", () => {
  assert.deepEqual(
    inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration({
      BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "postgresql",
    }),
    {
      status: "configured",
      code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORAGE_CONFIGURED",
      policyVersion:
        railwayBotReplyStagingReleaseEvidenceStoragePolicyVersion,
      storageMode: "postgresql",
      publicationMode: "transactional-compare-and-set",
      runtimeReadMode: "repository",
      environmentVariablePublication: false,
    },
  );
});

test("rejects Railway Variables and every unapproved storage mode", () => {
  for (const value of [
    "railway-variables",
    "environment",
    "redis",
    "memory",
    "PostgreSQL",
    " postgresql ",
  ]) {
    const result =
      inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration({
        BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: value,
      });
    assert.equal(result.status, "invalid");
    assert.equal(
      result.code,
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORAGE_INVALID",
    );
    assert.equal(result.environmentVariablePublication, false);
  }
});

test("returns a frozen bounded result without the supplied value", () => {
  const result =
    inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration({
      BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE:
        "secret-unapproved-provider-value",
    });
  assert.equal(Object.isFrozen(result), true);
  assert.doesNotMatch(JSON.stringify(result), /secret|provider-value/i);
  assert.deepEqual(Object.keys(result), [
    "status",
    "code",
    "policyVersion",
    "storageMode",
    "publicationMode",
    "runtimeReadMode",
    "environmentVariablePublication",
  ]);
});
