import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  createCloudflareEvidenceFromResponses,
  createDeploymentArtifactDigest,
  readCloudflareApiJson,
} from "../scripts/create-cloudflare-evidence.mjs";
import {
  inspectDeploymentProvenanceEvidence,
} from "../server/operations/deploymentProvenanceEvidence.ts";
import {
  inspectEnvironmentIsolationEvidence,
} from "../server/operations/environmentIsolationEvidence.ts";
import {
  buildReleaseManifest,
} from "../scripts/create-release-manifest.mjs";

const environmentNames = [
  "development",
  "preview",
  "staging",
  "production",
];
const verifiedAt =
  "2026-08-14T12:00:00.000Z";
const now = new Date(verifiedAt);
const artifactDigest =
  `sha256:${createHash("sha256")
    .update("cloudflare-deployment-artifact")
    .digest("hex")}`;

function uuid(index) {
  return `00000000-0000-4000-8000-${String(
    index,
  ).padStart(12, "0")}`;
}

function envelope(result) {
  return {
    errors: [],
    messages: [],
    result,
    success: true,
  };
}

function releaseManifest() {
  return buildReleaseManifest({
    commitSha: "1".repeat(40),
    treeSha: "2".repeat(40),
    packageJson: {
      name:
        "connect-whatsapp-platform",
      version: "0.1.0",
      engines: {
        node: ">=24.18.1",
      },
    },
    packageLockText:
      "cloudflare-evidence-lock",
    migrations: [
      {
        file: "0000_initial.sql",
        sha256: createHash("sha256")
          .update(
            "cloudflare-evidence-migration",
          )
          .digest("hex"),
      },
    ],
  });
}

function workerName(environment) {
  return `connect-${environment}`;
}

function queueName(environment, purpose) {
  return `connect-${environment}-${purpose}`;
}

function versionResponse(
  environment,
  index,
  overrides = {},
) {
  const bindings = [
    {
      name: "DB",
      type: "d1",
      database_id: uuid(100 + index),
    },
    {
      name: "FILES",
      type: "r2_bucket",
      bucket_name:
        `connect-${environment}-files`,
    },
    {
      name: "META_WEBHOOK_QUEUE",
      type: "queue",
      queue_name:
        queueName(environment, "meta"),
    },
    {
      name: "CAMPAIGN_DELIVERY_QUEUE",
      type: "queue",
      queue_name:
        queueName(environment, "campaign"),
    },
    {
      name: "TEAM_INVITATION_QUEUE",
      type: "queue",
      queue_name:
        queueName(environment, "invitation"),
    },
    {
      name: "META_WEBHOOK_RATE_LIMITER",
      type: "ratelimit",
      namespace_id:
        `rate-${environment}-meta`,
    },
    {
      name: "TENANT_MUTATION_RATE_LIMITER",
      type: "ratelimit",
      namespace_id:
        `rate-${environment}-tenant`,
    },
    {
      name: "SYSTEM_ADMIN_MUTATION_RATE_LIMITER",
      type: "ratelimit",
      namespace_id:
        `rate-${environment}-admin`,
    },
    {
      name: "CLERK_SECRET_KEY",
      type: "secret_text",
    },
    {
      name: "META_APP_SECRET",
      type: "secret_text",
    },
  ];

  return envelope({
    id: uuid(20 + index),
    resources: {
      bindings,
      script: {
        etag: `etag-${environment}`,
      },
    },
    ...overrides,
  });
}

function deploymentsResponse(
  environment,
  index,
  manifest,
  overrides = {},
) {
  const annotation = {
    schemaVersion: 1,
    releaseId: manifest.releaseId,
    commitSha: manifest.commitSha,
    artifactDigest,
  };

  return envelope({
    deployments: [
      {
        id: uuid(10 + index),
        created_on:
          "2026-08-14T11:00:00.000Z",
        versions: [
          {
            percentage: 100,
            version_id: uuid(20 + index),
          },
        ],
        annotations: {
          "workers/message":
            JSON.stringify(annotation),
        },
        ...overrides,
      },
    ],
  });
}

function schedulesResponse(environment) {
  return envelope({
    schedules: [
      {
        cron:
          environment === "production"
            ? "* * * * *"
            : `*/${
                environmentNames.indexOf(
                  environment,
                ) + 2
              } * * * *`,
      },
    ],
  });
}

function queueEntry(
  environment,
  purpose,
  index,
) {
  const name =
    queueName(environment, purpose);
  const deadLetterName =
    `${name}-dlq`;

  return [
    {
      queue_id:
        `queue-${index}-${purpose}`,
      queue_name: name,
      consumers: [
        {
          type: "worker",
          script_name:
            workerName(environment),
          queue_name: name,
          dead_letter_queue:
            deadLetterName,
        },
      ],
    },
    {
      queue_id:
        `queue-${index}-${purpose}-dlq`,
      queue_name: deadLetterName,
      consumers: [],
    },
  ];
}

function queuesResponse() {
  const result =
    environmentNames.flatMap(
      (environment, index) =>
        [
          "meta",
          "campaign",
          "invitation",
        ].flatMap((purpose) =>
          queueEntry(
            environment,
            purpose,
            index,
          ),
        ),
    );

  return {
    ...envelope(result),
    result_info: {
      count: result.length,
      page: 1,
      per_page: 100,
      total_count: result.length,
      total_pages: 1,
    },
  };
}

function environmentResponses(manifest) {
  return Object.fromEntries(
    environmentNames.map(
      (environment, index) => [
        environment,
        {
          scriptName:
            workerName(environment),
          deploymentsResponse:
            deploymentsResponse(
              environment,
              index,
              manifest,
            ),
          versionResponse:
            versionResponse(
              environment,
              index,
            ),
          schedulesResponse:
            schedulesResponse(environment),
        },
      ],
    ),
  );
}

test("builds bounded isolation v2 and deployment provenance from read-only Cloudflare responses", () => {
  const manifest = releaseManifest();
  const evidence =
    createCloudflareEvidenceFromResponses({
      environmentResponses:
        environmentResponses(manifest),
      queuesResponse: queuesResponse(),
      releaseManifest: manifest,
      artifactDigest,
      verifiedAt,
    });
  const serialized = JSON.stringify(evidence);

  assert.equal(
    evidence.environmentIsolation
      .schemaVersion,
    2,
  );
  assert.equal(
    serialized.includes(
      workerName("production"),
    ),
    false,
  );
  assert.equal(
    serialized.includes(
      "CLERK_SECRET_KEY",
    ),
    false,
  );
  assert.deepEqual(
    inspectEnvironmentIsolationEvidence(
      {
        ENVIRONMENT_ISOLATION_EVIDENCE_JSON:
          JSON.stringify(
            evidence.environmentIsolation,
          ),
      },
      now,
    ),
    {
      status: "configured",
      code:
        "ENVIRONMENT_ISOLATION_EVIDENCE_VERIFIED",
      environmentCount: 4,
      resourceFingerprintCount: 52,
    },
  );
  assert.equal(
    inspectDeploymentProvenanceEvidence(
      {
        APP_DEPLOYED_COMMIT_SHA:
          manifest.commitSha,
        APP_RELEASE_ID:
          manifest.releaseId,
        APP_DEPLOYMENT_ARTIFACT_DIGEST:
          artifactDigest,
        DEPLOYMENT_PROVENANCE_EVIDENCE_JSON:
          JSON.stringify(
            evidence.deploymentProvenance,
          ),
      },
      now,
    ).status,
    "configured",
  );
});

test("rejects canary deployments, missing DLQ links, reused resources, and release annotation mismatch", () => {
  const manifest = releaseManifest();
  const baseEnvironments =
    environmentResponses(manifest);
  const canary = structuredClone(
    baseEnvironments,
  );
  canary.production.deploymentsResponse
    .result.deployments[0].versions = [
      {
        percentage: 50,
        version_id: uuid(23),
      },
      {
        percentage: 50,
        version_id: uuid(24),
      },
    ];
  const missingDlq =
    structuredClone(queuesResponse());
  missingDlq.result =
    missingDlq.result.filter(
      (queue) =>
        queue.queue_name !==
        "connect-preview-meta-dlq",
    );
  missingDlq.result_info.count =
    missingDlq.result.length;
  missingDlq.result_info.total_count =
    missingDlq.result.length;
  const reusedD1 = structuredClone(
    baseEnvironments,
  );
  reusedD1.preview.versionResponse
    .result.resources.bindings[0]
    .database_id =
      reusedD1.development.versionResponse
        .result.resources.bindings[0]
        .database_id;
  const annotationMismatch =
    structuredClone(baseEnvironments);
  annotationMismatch.production
    .deploymentsResponse.result
    .deployments[0].annotations[
      "workers/message"
    ] = JSON.stringify({
      schemaVersion: 1,
      releaseId: manifest.releaseId,
      commitSha: manifest.commitSha,
      artifactDigest:
        `sha256:${"9".repeat(64)}`,
    });

  for (const input of [
    {
      environments: canary,
      queues: queuesResponse(),
      code:
        /CLOUDFLARE_DEPLOYMENT_RESPONSE_INVALID/,
    },
    {
      environments: baseEnvironments,
      queues: missingDlq,
      code:
        /CLOUDFLARE_QUEUE_BINDING_INVALID/,
    },
    {
      environments: reusedD1,
      queues: queuesResponse(),
      code:
        /ENVIRONMENT_ISOLATION_SNAPSHOT_INVALID/,
    },
    {
      environments:
        annotationMismatch,
      queues: queuesResponse(),
      code:
        /CLOUDFLARE_DEPLOYMENT_ANNOTATION_INVALID/,
    },
  ]) {
    assert.throws(
      () =>
        createCloudflareEvidenceFromResponses({
          environmentResponses:
            input.environments,
          queuesResponse: input.queues,
          releaseManifest: manifest,
          artifactDigest,
          verifiedAt,
        }),
      input.code,
    );
  }
});

test("uses only the fixed Cloudflare origin, GET, bounded JSON, and bearer authorization", async () => {
  const calls = [];
  const response = await readCloudflareApiJson(
    "/client/v4/accounts/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/queues?page=1&per_page=100",
    "TEST_ONLY_CLOUDFLARE_READ_TOKEN",
    async (url, init) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify(envelope([])),
        {
          status: 200,
          headers: {
            "content-type":
              "application/json",
          },
        },
      );
    },
  );

  assert.deepEqual(response, envelope([]));
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://api.cloudflare.com/client/v4/accounts/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/queues?page=1&per_page=100",
  );
  assert.equal(calls[0].init.method, "GET");
  assert.equal(
    calls[0].init.headers.Authorization,
    "Bearer TEST_ONLY_CLOUDFLARE_READ_TOKEN",
  );
  assert.equal(calls[0].init.body, undefined);
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.redirect, "error");

  await assert.rejects(
    readCloudflareApiJson(
      "https://attacker.example/queues",
      "TEST_ONLY_CLOUDFLARE_READ_TOKEN",
      async () => {
        throw new Error("must not run");
      },
    ),
    /CLOUDFLARE_API_CONFIGURATION_INVALID/,
  );
});

test("derives a deterministic digest from the complete built artifact", async () => {
  const first =
    await createDeploymentArtifactDigest();
  const second =
    await createDeploymentArtifactDigest();

  assert.match(
    first,
    /^sha256:[a-f0-9]{64}$/,
  );
  assert.equal(first, second);
});
