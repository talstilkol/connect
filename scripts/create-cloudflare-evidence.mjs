import {
  createHash,
} from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import {
  join,
  relative,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  buildDeploymentProvenanceEvidence,
} from "../server/operations/deploymentProvenanceEvidence.ts";
import {
  buildEnvironmentIsolationEvidence,
  environmentIsolationEnvironmentNames,
} from "../server/operations/environmentIsolationEvidence.ts";
import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const artifactDirectory = join(
  projectRoot,
  ".artifacts",
);
const deploymentArtifactDirectory = join(
  projectRoot,
  "dist",
);
const cloudflareApiOrigin =
  "https://api.cloudflare.com";
const maximumApiResponseBytes =
  2_097_152;
const maximumArtifactBytes =
  64 * 1_024 * 1_024;
const maximumArtifactFiles = 5_000;
const accountIdPattern = /^[a-f0-9]{32}$/;
const workerNamePattern =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const identifierPattern =
  /^[A-Za-z0-9_.:-]{1,512}$/;
const uuidPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const commitPattern = /^[a-f0-9]{40}$/;
const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;
const environmentVariableNames =
  Object.freeze({
    development:
      "CONNECT_DEVELOPMENT_WORKER_NAME",
    preview:
      "CONNECT_PREVIEW_WORKER_NAME",
    staging:
      "CONNECT_STAGING_WORKER_NAME",
    production:
      "CONNECT_PRODUCTION_WORKER_NAME",
  });
const bindingDefinitions =
  Object.freeze({
    d1: {
      name: "DB",
      type: "d1",
      identityField: "database_id",
    },
    r2: {
      name: "FILES",
      type: "r2_bucket",
      identityField: "bucket_name",
    },
    metaWebhookQueue: {
      name: "META_WEBHOOK_QUEUE",
      type: "queue",
      identityField: "queue_name",
    },
    campaignDeliveryQueue: {
      name: "CAMPAIGN_DELIVERY_QUEUE",
      type: "queue",
      identityField: "queue_name",
    },
    teamInvitationQueue: {
      name: "TEAM_INVITATION_QUEUE",
      type: "queue",
      identityField: "queue_name",
    },
    metaWebhookRateLimiter: {
      name: "META_WEBHOOK_RATE_LIMITER",
      type: "ratelimit",
      identityField: "namespace_id",
    },
    tenantMutationRateLimiter: {
      name: "TENANT_MUTATION_RATE_LIMITER",
      type: "ratelimit",
      identityField: "namespace_id",
    },
    systemAdminMutationRateLimiter: {
      name: "SYSTEM_ADMIN_MUTATION_RATE_LIMITER",
      type: "ratelimit",
      identityField: "namespace_id",
    },
  });

function fail(code) {
  throw new Error(code);
}

function isObject(value) {
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

function canonicalTimestamp(value) {
  if (typeof value !== "string") {
    fail("CLOUDFLARE_EVIDENCE_TIMESTAMP_INVALID");
  }

  const milliseconds = Date.parse(value);

  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !==
      value
  ) {
    fail("CLOUDFLARE_EVIDENCE_TIMESTAMP_INVALID");
  }

  return value;
}

function requireIdentifier(value, code) {
  if (
    typeof value !== "string" ||
    !identifierPattern.test(value)
  ) {
    fail(code);
  }

  return value;
}

function requireCloudflareEnvelope(
  response,
  code,
) {
  if (
    !isObject(response) ||
    response.success !== true ||
    !Array.isArray(response.errors) ||
    response.errors.length !== 0 ||
    !("result" in response)
  ) {
    fail(code);
  }

  return response.result;
}

function activeDeployment(response) {
  const result =
    requireCloudflareEnvelope(
      response,
      "CLOUDFLARE_DEPLOYMENT_RESPONSE_INVALID",
    );

  if (
    !isObject(result) ||
    !Array.isArray(result.deployments) ||
    result.deployments.length < 1 ||
    result.deployments.length > 100
  ) {
    fail("CLOUDFLARE_DEPLOYMENT_RESPONSE_INVALID");
  }

  const deployment = result.deployments[0];

  if (
    !isObject(deployment) ||
    typeof deployment.id !== "string" ||
    !uuidPattern.test(deployment.id) ||
    canonicalTimestamp(
      deployment.created_on,
    ) !== deployment.created_on ||
    !Array.isArray(deployment.versions) ||
    deployment.versions.length !== 1 ||
    !isObject(deployment.versions[0]) ||
    deployment.versions[0].percentage !==
      100 ||
    typeof deployment.versions[0]
      .version_id !== "string" ||
    !uuidPattern.test(
      deployment.versions[0].version_id,
    )
  ) {
    fail("CLOUDFLARE_DEPLOYMENT_RESPONSE_INVALID");
  }

  return Object.freeze({
    id: deployment.id,
    createdOn: deployment.created_on,
    versionId:
      deployment.versions[0].version_id,
    annotations:
      isObject(deployment.annotations)
        ? deployment.annotations
        : {},
  });
}

function versionBindings(
  response,
  expectedVersionId,
) {
  const result =
    requireCloudflareEnvelope(
      response,
      "CLOUDFLARE_VERSION_RESPONSE_INVALID",
    );

  if (
    !isObject(result) ||
    result.id !== expectedVersionId ||
    !isObject(result.resources) ||
    !Array.isArray(
      result.resources.bindings,
    ) ||
    result.resources.bindings.length > 256 ||
    !isObject(result.resources.script) ||
    typeof result.resources.script.etag !==
      "string" ||
    result.resources.script.etag.length < 1 ||
    result.resources.script.etag.length >
      512 ||
    /[\0\r\n]/.test(
      result.resources.script.etag,
    )
  ) {
    fail("CLOUDFLARE_VERSION_RESPONSE_INVALID");
  }

  return Object.freeze({
    bindings: result.resources.bindings,
    scriptEtag:
      result.resources.script.etag,
  });
}

function scheduleIdentity(response) {
  const result =
    requireCloudflareEnvelope(
      response,
      "CLOUDFLARE_SCHEDULE_RESPONSE_INVALID",
    );

  if (
    !isObject(result) ||
    !Array.isArray(result.schedules) ||
    result.schedules.length < 1 ||
    result.schedules.length > 20
  ) {
    fail("CLOUDFLARE_SCHEDULE_RESPONSE_INVALID");
  }

  const crons = result.schedules.map(
    (schedule) => {
      if (
        !isObject(schedule) ||
        typeof schedule.cron !== "string" ||
        schedule.cron.length < 1 ||
        schedule.cron.length > 256 ||
        /[\0\r\n]/.test(schedule.cron)
      ) {
        fail("CLOUDFLARE_SCHEDULE_RESPONSE_INVALID");
      }

      return schedule.cron;
    },
  );

  if (new Set(crons).size !== crons.length) {
    fail("CLOUDFLARE_SCHEDULE_RESPONSE_INVALID");
  }

  return [...crons].sort().join("|");
}

function queueDirectory(response) {
  const result =
    requireCloudflareEnvelope(
      response,
      "CLOUDFLARE_QUEUE_RESPONSE_INVALID",
    );

  if (
    !Array.isArray(result) ||
    result.length < 1 ||
    result.length > 100 ||
    !isObject(response.result_info) ||
    response.result_info.page !== 1 ||
    response.result_info.total_pages !== 1 ||
    response.result_info.count !==
      result.length ||
    response.result_info.total_count !==
      result.length
  ) {
    fail("CLOUDFLARE_QUEUE_RESPONSE_INVALID");
  }

  const entries = result.map((queue) => {
    if (
      !isObject(queue) ||
      typeof queue.queue_id !== "string" ||
      !identifierPattern.test(queue.queue_id) ||
      typeof queue.queue_name !== "string" ||
      !identifierPattern.test(queue.queue_name) ||
      !Array.isArray(queue.consumers)
    ) {
      fail("CLOUDFLARE_QUEUE_RESPONSE_INVALID");
    }

    return Object.freeze({
      id: queue.queue_id,
      name: queue.queue_name,
      consumers: queue.consumers,
    });
  });
  const ids = entries.map((entry) => entry.id);
  const names = entries.map((entry) => entry.name);

  if (
    new Set(ids).size !== ids.length ||
    new Set(names).size !== names.length
  ) {
    fail("CLOUDFLARE_QUEUE_RESPONSE_INVALID");
  }

  return entries;
}

function requiredBinding(
  bindings,
  definition,
) {
  const matches = bindings.filter(
    (binding) =>
      isObject(binding) &&
      binding.name === definition.name &&
      binding.type === definition.type,
  );

  if (
    matches.length !== 1 ||
    typeof matches[0][
      definition.identityField
    ] !== "string"
  ) {
    fail("CLOUDFLARE_BINDING_SET_INVALID");
  }

  return requireIdentifier(
    matches[0][definition.identityField],
    "CLOUDFLARE_BINDING_SET_INVALID",
  );
}

function queueResource(
  directory,
  queueName,
) {
  const matches = directory.filter(
    (entry) => entry.name === queueName,
  );

  if (matches.length !== 1) {
    fail("CLOUDFLARE_QUEUE_BINDING_INVALID");
  }

  return matches[0];
}

function queueAndDeadLetterIdentities(
  directory,
  queueName,
  scriptName,
) {
  const queue =
    queueResource(directory, queueName);
  const consumers = queue.consumers.filter(
    (consumer) =>
      isObject(consumer) &&
      consumer.type === "worker" &&
      consumer.script_name === scriptName &&
      consumer.queue_name === queueName,
  );

  if (
    consumers.length !== 1 ||
    typeof consumers[0].dead_letter_queue !==
      "string" ||
    !identifierPattern.test(
      consumers[0].dead_letter_queue,
    )
  ) {
    fail("CLOUDFLARE_QUEUE_CONSUMER_INVALID");
  }

  const deadLetterQueue = queueResource(
    directory,
    consumers[0].dead_letter_queue,
  );

  return Object.freeze({
    queue: `${queue.id}:${queue.name}`,
    deadLetterQueue:
      `${deadLetterQueue.id}:${deadLetterQueue.name}`,
  });
}

function secretSetIdentity(
  bindings,
  scriptName,
  versionId,
) {
  const names = bindings
    .filter(
      (binding) =>
        isObject(binding) &&
        binding.type === "secret_text",
    )
    .map((binding) => binding.name);

  if (
    names.length < 1 ||
    names.length > 100 ||
    names.some(
      (name) =>
        typeof name !== "string" ||
        !identifierPattern.test(name),
    ) ||
    new Set(names).size !== names.length
  ) {
    fail("CLOUDFLARE_SECRET_SET_INVALID");
  }

  return JSON.stringify({
    scriptName,
    versionId,
    names: [...names].sort(),
  });
}

function deploymentAnnotation(
  deployment,
  releaseManifest,
  artifactDigest,
) {
  const message =
    deployment.annotations["workers/message"];
  let value;

  if (
    typeof message !== "string" ||
    message.length > 1_000
  ) {
    fail("CLOUDFLARE_DEPLOYMENT_ANNOTATION_INVALID");
  }

  try {
    value = JSON.parse(message);
  } catch {
    fail("CLOUDFLARE_DEPLOYMENT_ANNOTATION_INVALID");
  }

  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "releaseId",
      "commitSha",
      "artifactDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    value.releaseId !==
      releaseManifest.releaseId ||
    value.commitSha !==
      releaseManifest.commitSha ||
    value.artifactDigest !== artifactDigest
  ) {
    fail("CLOUDFLARE_DEPLOYMENT_ANNOTATION_INVALID");
  }
}

export function createCloudflareEvidenceFromResponses({
  environmentResponses,
  queuesResponse,
  releaseManifest,
  artifactDigest,
  verifiedAt,
}) {
  if (
    !isObject(environmentResponses) ||
    !hasExactKeys(
      environmentResponses,
      environmentIsolationEnvironmentNames,
    ) ||
    !isObject(releaseManifest) ||
    typeof releaseManifest.releaseId !==
      "string" ||
    !releaseIdPattern.test(
      releaseManifest.releaseId,
    ) ||
    typeof releaseManifest.commitSha !==
      "string" ||
    !commitPattern.test(
      releaseManifest.commitSha,
    ) ||
    typeof artifactDigest !== "string" ||
    !fingerprintPattern.test(artifactDigest)
  ) {
    fail("CLOUDFLARE_EVIDENCE_INPUT_INVALID");
  }

  const timestamp =
    canonicalTimestamp(verifiedAt);
  const directory =
    queueDirectory(queuesResponse);
  let productionDeployment;
  const environments =
    environmentIsolationEnvironmentNames.map(
      (name) => {
        const raw = environmentResponses[name];

        if (
          !isObject(raw) ||
          !hasExactKeys(raw, [
            "scriptName",
            "deploymentsResponse",
            "versionResponse",
            "schedulesResponse",
          ]) ||
          typeof raw.scriptName !== "string" ||
          !workerNamePattern.test(
            raw.scriptName,
          )
        ) {
          fail("CLOUDFLARE_ENVIRONMENT_RESPONSE_INVALID");
        }

        const deployment =
          activeDeployment(
            raw.deploymentsResponse,
          );
        const version = versionBindings(
          raw.versionResponse,
          deployment.versionId,
        );
        const resources = {};

        for (const [
          resourceClass,
          definition,
        ] of Object.entries(
          bindingDefinitions,
        )) {
          resources[resourceClass] =
            requiredBinding(
              version.bindings,
              definition,
            );
        }

        const metaQueues =
          queueAndDeadLetterIdentities(
            directory,
            resources.metaWebhookQueue,
            raw.scriptName,
          );
        const campaignQueues =
          queueAndDeadLetterIdentities(
            directory,
            resources.campaignDeliveryQueue,
            raw.scriptName,
          );
        const invitationQueues =
          queueAndDeadLetterIdentities(
            directory,
            resources.teamInvitationQueue,
            raw.scriptName,
          );

        resources.metaWebhookQueue =
          metaQueues.queue;
        resources.metaWebhookDeadLetterQueue =
          metaQueues.deadLetterQueue;
        resources.campaignDeliveryQueue =
          campaignQueues.queue;
        resources.campaignDeliveryDeadLetterQueue =
          campaignQueues.deadLetterQueue;
        resources.teamInvitationQueue =
          invitationQueues.queue;
        resources.teamInvitationDeadLetterQueue =
          invitationQueues.deadLetterQueue;
        resources.secretSet =
          secretSetIdentity(
            version.bindings,
            raw.scriptName,
            deployment.versionId,
          );
        resources.scheduler = JSON.stringify({
          scriptName: raw.scriptName,
          schedule:
            scheduleIdentity(
              raw.schedulesResponse,
            ),
        });

        if (name === "production") {
          deploymentAnnotation(
            deployment,
            releaseManifest,
            artifactDigest,
          );
          productionDeployment = {
            scriptName: raw.scriptName,
            deploymentId: deployment.id,
            versionId:
              deployment.versionId,
            scriptEtag:
              version.scriptEtag,
            createdOn:
              deployment.createdOn,
          };
        }

        return {
          name,
          resources,
        };
      },
    );

  if (!productionDeployment) {
    fail("CLOUDFLARE_PRODUCTION_DEPLOYMENT_REQUIRED");
  }

  return Object.freeze({
    environmentIsolation:
      buildEnvironmentIsolationEvidence({
        verifiedAt: timestamp,
        environments,
      }),
    deploymentProvenance:
      buildDeploymentProvenanceEvidence({
        verifiedAt: timestamp,
        releaseManifest: {
          releaseId:
            releaseManifest.releaseId,
          commitSha:
            releaseManifest.commitSha,
          treeSha:
            releaseManifest.treeSha,
          packageLockSha256:
            releaseManifest.packageLockSha256,
          migrationSetSha256:
            releaseManifest.migrationSetSha256,
        },
        artifactDigest,
        deploymentIdentity:
          JSON.stringify(
            productionDeployment,
          ),
      }),
  });
}

async function collectArtifactFiles(
  root,
  directory = root,
) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(
        ...(await collectArtifactFiles(
          root,
          path,
        )),
      );
      continue;
    }

    const stats = await lstat(path);

    if (!stats.isFile() || stats.isSymbolicLink()) {
      fail("CLOUDFLARE_ARTIFACT_INVALID");
    }

    files.push({
      path,
      relativePath:
        relative(root, path).replaceAll(
          "\\",
          "/",
        ),
      size: stats.size,
    });
  }

  return files;
}

export async function createDeploymentArtifactDigest(
  root = deploymentArtifactDirectory,
) {
  const files =
    await collectArtifactFiles(root);
  const totalBytes = files.reduce(
    (sum, file) => sum + file.size,
    0,
  );

  if (
    files.length < 1 ||
    files.length > maximumArtifactFiles ||
    totalBytes > maximumArtifactBytes
  ) {
    fail("CLOUDFLARE_ARTIFACT_INVALID");
  }

  const hash = createHash("sha256");

  for (const file of [...files].sort(
    (left, right) =>
      left.relativePath.localeCompare(
        right.relativePath,
        "en",
      ),
  )) {
    hash.update(file.relativePath);
    hash.update("\0");
    hash.update(await readFile(file.path));
    hash.update("\0");
  }

  return `sha256:${hash.digest("hex")}`;
}

export async function readCloudflareApiJson(
  endpoint,
  apiToken,
  fetchImpl = fetch,
  signal = new AbortController().signal,
) {
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("/client/v4/accounts/") ||
    endpoint.length > 2_048 ||
    /[\s\0]/.test(endpoint) ||
    typeof apiToken !== "string" ||
    apiToken.length < 24 ||
    apiToken.length > 2_048 ||
    !/^[\x21-\x7e]+$/.test(apiToken) ||
    typeof fetchImpl !== "function" ||
    !(signal instanceof AbortSignal)
  ) {
    fail("CLOUDFLARE_API_CONFIGURATION_INVALID");
  }

  let response;

  try {
    response = await fetchImpl(
      `${cloudflareApiOrigin}${endpoint}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization:
            `Bearer ${apiToken}`,
        },
        cache: "no-store",
        redirect: "error",
        signal,
      },
    );
  } catch {
    fail(
      signal.aborted
        ? "CLOUDFLARE_API_ABORTED"
        : "CLOUDFLARE_API_READ_FAILED",
    );
  }

  const contentType =
    response.headers.get("content-type");

  if (
    response.status !== 200 ||
    typeof contentType !== "string" ||
    !contentType
      .toLowerCase()
      .includes("application/json")
  ) {
    fail("CLOUDFLARE_API_RESPONSE_INVALID");
  }

  const text = await response.text();

  if (
    text.length < 2 ||
    text.length > maximumApiResponseBytes
  ) {
    fail("CLOUDFLARE_API_RESPONSE_INVALID");
  }

  try {
    return JSON.parse(text);
  } catch {
    fail("CLOUDFLARE_API_RESPONSE_INVALID");
  }
}

function requireConfiguration(environment) {
  const accountId =
    environment.CLOUDFLARE_ACCOUNT_ID;
  const apiToken =
    environment.CLOUDFLARE_API_TOKEN;

  if (
    typeof accountId !== "string" ||
    !accountIdPattern.test(accountId) ||
    typeof apiToken !== "string" ||
    apiToken.length < 24 ||
    apiToken.length > 2_048
  ) {
    fail("CLOUDFLARE_EVIDENCE_CONFIGURATION_INVALID");
  }

  const workers = Object.fromEntries(
    environmentIsolationEnvironmentNames.map(
      (name) => {
        const workerName =
          environment[
            environmentVariableNames[name]
          ];

        if (
          typeof workerName !== "string" ||
          !workerNamePattern.test(workerName)
        ) {
          fail("CLOUDFLARE_EVIDENCE_CONFIGURATION_INVALID");
        }

        return [name, workerName];
      },
    ),
  );

  if (
    new Set(Object.values(workers)).size !==
      environmentIsolationEnvironmentNames.length
  ) {
    fail("CLOUDFLARE_EVIDENCE_CONFIGURATION_INVALID");
  }

  return Object.freeze({
    accountId,
    apiToken,
    workers,
  });
}

export async function createCurrentCloudflareEvidence({
  environment = process.env,
  now = new Date(),
  fetchImpl = fetch,
  createReleaseManifest =
    createCurrentReleaseManifest,
  createArtifactDigest =
    createDeploymentArtifactDigest,
}) {
  if (!Number.isFinite(now.getTime())) {
    fail("CLOUDFLARE_EVIDENCE_CLOCK_INVALID");
  }

  const configuration =
    requireConfiguration(environment);
  const baseEndpoint =
    `/client/v4/accounts/${configuration.accountId}`;
  const [
    releaseManifest,
    artifactDigest,
    queuesResponse,
  ] = await Promise.all([
    createReleaseManifest(),
    createArtifactDigest(),
    readCloudflareApiJson(
      `${baseEndpoint}/queues?page=1&per_page=100`,
      configuration.apiToken,
      fetchImpl,
    ),
  ]);
  const environmentResponses = {};

  for (const name of
    environmentIsolationEnvironmentNames) {
    const scriptName =
      configuration.workers[name];
    const scriptEndpoint =
      `${baseEndpoint}/workers/scripts/${scriptName}`;
    const deploymentsResponse =
      await readCloudflareApiJson(
        `${scriptEndpoint}/deployments`,
        configuration.apiToken,
        fetchImpl,
      );
    const deployment =
      activeDeployment(
        deploymentsResponse,
      );
    const [versionResponse, schedulesResponse] =
      await Promise.all([
        readCloudflareApiJson(
          `${scriptEndpoint}/versions/${deployment.versionId}`,
          configuration.apiToken,
          fetchImpl,
        ),
        readCloudflareApiJson(
          `${scriptEndpoint}/schedules`,
          configuration.apiToken,
          fetchImpl,
        ),
      ]);

    environmentResponses[name] = {
      scriptName,
      deploymentsResponse,
      versionResponse,
      schedulesResponse,
    };
  }

  return createCloudflareEvidenceFromResponses({
    environmentResponses,
    queuesResponse,
    releaseManifest,
    artifactDigest,
    verifiedAt: now.toISOString(),
  });
}

async function writeEvidence(fileName, evidence) {
  await mkdir(artifactDirectory, {
    recursive: true,
  });
  await writeFile(
    join(artifactDirectory, fileName),
    `${JSON.stringify(evidence, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "w",
      mode: 0o644,
    },
  );
}

async function runCli() {
  if (process.argv.length !== 2) {
    fail("CLOUDFLARE_EVIDENCE_ARGUMENTS_INVALID");
  }

  const evidence =
    await createCurrentCloudflareEvidence({});

  await Promise.all([
    writeEvidence(
      "environment-isolation-evidence.json",
      evidence.environmentIsolation,
    ),
    writeEvidence(
      "deployment-provenance-evidence.json",
      evidence.deploymentProvenance,
    ),
  ]);

  console.log(
    `Cloudflare evidence: PASS (${evidence.environmentIsolation.evidenceDigest}, ${evidence.deploymentProvenance.evidenceDigest})`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(`file://${process.argv[1]}`),
    )
) {
  try {
    await runCli();
  } catch (error) {
    const code =
      error instanceof Error &&
      /^[A-Z][A-Z0-9_]+$/.test(
        error.message,
      )
        ? error.message
        : "CLOUDFLARE_EVIDENCE_FAILED";

    console.error(
      `Cloudflare evidence: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
