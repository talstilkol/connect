import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import {
  requireMetaWebhookConfiguration,
  type MetaWebhookEnvironment,
} from "../meta/metaWebhookConfiguration.ts";
import {
  createMetaWebhookHttpHandler,
  type MetaWebhookHttpHandler,
} from "../meta/metaWebhookHttpHandler.ts";
import type {
  MetaWebhookQueuePort,
} from "../meta/metaWebhookQueuePort.ts";
import {
  createMetaWebhookQueuePublisher,
  MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES,
} from "../meta/metaWebhookQueuePublisher.ts";
import {
  createRateLimitGuard,
  type RateLimitBinding,
} from "../security/rateLimit.ts";
import type {
  PostgresMutationRateLimitPolicy,
} from "./postgresMutationRateLimitBinding.ts";
import {
  inspectPostgresMetaWebhookRateLimitConfiguration,
  type PostgresRateLimitEnvironment,
} from "./postgresMutationRateLimitConfiguration.ts";

export interface RailwayMetaWebhookRuntimeEnvironment
  extends MetaWebhookEnvironment,
    PostgresRateLimitEnvironment {}

export interface RailwayMetaWebhookRuntimeOptions {
  readonly environment: RailwayMetaWebhookRuntimeEnvironment;
  readonly connections: Pick<MetaRepository, "findConnectionByWabaId">;
  readonly queue: MetaWebhookQueuePort;
  readonly createRateLimitBinding: (
    policy: Readonly<PostgresMutationRateLimitPolicy>,
  ) => Readonly<RateLimitBinding>;
  readonly maximumBodyBytes?: number;
}

const optionKeys = Object.freeze([
  "connections",
  "createRateLimitBinding",
  "environment",
  "maximumBodyBytes",
  "queue",
]);

function requireOptions(
  options: Readonly<RailwayMetaWebhookRuntimeOptions>,
): void {
  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).some((key) => !optionKeys.includes(key)) ||
    typeof options.environment !== "object" ||
    options.environment === null ||
    typeof options.connections?.findConnectionByWabaId !== "function" ||
    typeof options.queue?.publish !== "function" ||
    typeof options.createRateLimitBinding !== "function" ||
    (options.maximumBodyBytes !== undefined &&
      (!Number.isSafeInteger(options.maximumBodyBytes) ||
        options.maximumBodyBytes < 1 ||
        options.maximumBodyBytes >
          MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES))
  ) {
    throw new Error("Railway Meta webhook runtime options are invalid");
  }
}

export function createRailwayMetaWebhookRuntime(
  options: Readonly<RailwayMetaWebhookRuntimeOptions>,
): Readonly<MetaWebhookHttpHandler> {
  requireOptions(options);

  let metaConfiguration: ReturnType<
    typeof requireMetaWebhookConfiguration
  >;

  try {
    metaConfiguration = requireMetaWebhookConfiguration(
      options.environment,
    );
  } catch {
    throw new Error("Railway Meta webhook configuration is unavailable");
  }

  const rateLimitConfiguration =
    inspectPostgresMetaWebhookRateLimitConfiguration(
      options.environment,
    );

  if (rateLimitConfiguration.status !== "configured") {
    throw new Error(
      "Railway Meta webhook rate-limit configuration is unavailable",
    );
  }

  let rateLimitBinding: Readonly<RateLimitBinding>;

  try {
    rateLimitBinding = options.createRateLimitBinding(
      rateLimitConfiguration.policy,
    );
  } catch {
    throw new Error(
      "Railway Meta webhook rate-limit configuration is unavailable",
    );
  }

  const publisher = createMetaWebhookQueuePublisher(
    options.connections,
    options.queue,
    metaConfiguration.appSecret,
    createRateLimitGuard(rateLimitBinding, "meta-webhook"),
  );

  return createMetaWebhookHttpHandler(
    publisher,
    metaConfiguration.verifyToken,
    options.maximumBodyBytes === undefined
      ? { maximumBodyBytes: MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES }
      : { maximumBodyBytes: options.maximumBodyBytes },
  );
}
