import {
  createRailwayNodeHttpServer,
  type RailwayNodeHttpServer,
} from "./railwayNodeHttpServer.ts";
import type {
  RailwayPostgresApiRuntime,
} from "./railwayPostgresApiRuntime.ts";

export type RailwayNodeServiceErrorCode =
  | "options-invalid"
  | "start-failed"
  | "shutdown-failed"
  | "already-closed";

export class RailwayNodeServiceError extends Error {
  readonly code: RailwayNodeServiceErrorCode;

  constructor(code: RailwayNodeServiceErrorCode) {
    super(`Railway Node service failed: ${code}`);
    this.name = "RailwayNodeServiceError";
    this.code = code;
  }
}

export interface RailwayNodeServiceOptions {
  readonly port: number;
  readonly runtime: RailwayPostgresApiRuntime;
}

export interface RailwayNodeService {
  readonly start: () => Promise<void>;
  readonly close: () => Promise<void>;
}

export interface RailwayNodeServiceDependencies {
  readonly createHttpServer: (
    options: Readonly<{
      port: number;
      runtime: Pick<
        RailwayPostgresApiRuntime,
        "handler" | "metaWebhookHandler" | "readiness"
      >;
    }>,
  ) => Readonly<RailwayNodeHttpServer>;
}

const defaultDependencies = Object.freeze({
  createHttpServer: createRailwayNodeHttpServer,
});

function requireOptions(
  options: Readonly<RailwayNodeServiceOptions>,
  dependencies: Readonly<RailwayNodeServiceDependencies>,
): void {
  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).sort().join(",") !== "port,runtime" ||
    !Number.isSafeInteger(options.port) ||
    options.port < 1 ||
    options.port > 65_535 ||
    typeof options.runtime?.handler?.handle !== "function" ||
    (options.runtime.metaWebhookHandler !== undefined &&
      options.runtime.metaWebhookHandler !== null &&
      typeof options.runtime.metaWebhookHandler?.handle !== "function") ||
    typeof options.runtime?.readiness?.check !== "function" ||
    typeof options.runtime?.close !== "function" ||
    typeof dependencies?.createHttpServer !== "function"
  ) {
    throw new RailwayNodeServiceError("options-invalid");
  }
}

export function createRailwayNodeService(
  options: Readonly<RailwayNodeServiceOptions>,
  dependencies: Readonly<RailwayNodeServiceDependencies> =
    defaultDependencies,
): Readonly<RailwayNodeService> {
  requireOptions(options, dependencies);
  const server = dependencies.createHttpServer({
    port: options.port,
    runtime: options.runtime,
  });
  let started = false;
  let closed = false;
  let closing: Promise<void> | null = null;

  return Object.freeze({
    async start() {
      if (closed) {
        throw new RailwayNodeServiceError("already-closed");
      }

      if (started) {
        return;
      }

      try {
        await server.start();
        started = true;
      } catch {
        try {
          await options.runtime.close();
        } catch {
          // The public failure remains bounded even when cleanup also fails.
        }
        closed = true;
        throw new RailwayNodeServiceError("start-failed");
      }
    },
    async close() {
      if (closed) {
        return;
      }

      if (!closing) {
        closing = (async () => {
          let failed = false;

          if (started) {
            try {
              await server.close();
            } catch {
              failed = true;
            }
          }

          try {
            await options.runtime.close();
          } catch {
            failed = true;
          }

          started = false;
          closed = true;

          if (failed) {
            throw new RailwayNodeServiceError("shutdown-failed");
          }
        })();
      }

      await closing;
    },
  });
}
