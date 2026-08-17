import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import {
  Readable,
} from "node:stream";

import {
  RAILWAY_API_ENDPOINT_PATH,
} from "./railwayApiContract.ts";
import type {
  RailwayPostgresApiRuntime,
} from "./railwayPostgresApiRuntime.ts";

const INTERNAL_REQUEST_ORIGIN = "http://127.0.0.1";
const LIVENESS_PATH = "/health/live";
const READINESS_PATH = "/health/ready";
const MAXIMUM_REQUEST_TARGET_LENGTH = 2_048;
const MAXIMUM_HEADER_BYTES = 16_384;
const RESPONSE_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
});

export interface RailwayNodeHttpServerOptions {
  readonly port: number;
  readonly runtime: Pick<
    RailwayPostgresApiRuntime,
    "handler" | "readiness"
  >;
}

export interface RailwayNodeHttpServer {
  readonly start: () => Promise<void>;
  readonly close: () => Promise<void>;
}

export interface RailwayNodeHttpServerDependencies {
  readonly createServer: typeof createServer;
}

const defaultDependencies = Object.freeze({ createServer });

function jsonResponse(
  status: number,
  state: "live" | "ready" | "unavailable" | "not-found",
): Response {
  return new Response(JSON.stringify({ status: state }), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function hasRequestBody(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

function appendNodeHeaders(
  target: Headers,
  source: IncomingMessage["headers"],
): void {
  for (const [name, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        target.append(name, item);
      }
    } else if (typeof value === "string") {
      target.set(name, value);
    }
  }
}

export function createRailwayNodeWebRequest(
  request: IncomingMessage,
): Request {
  const method = request.method?.toUpperCase() ?? "";
  const target = request.url ?? "";

  if (
    !/^[A-Z]+$/.test(method) ||
    target.length === 0 ||
    target.length > MAXIMUM_REQUEST_TARGET_LENGTH ||
    !target.startsWith("/") ||
    target.startsWith("//") ||
    target.includes("#")
  ) {
    throw new Error("Railway Node request target is invalid");
  }

  const headers = new Headers();
  appendNodeHeaders(headers, request.headers);
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
  };

  if (hasRequestBody(method)) {
    init.body = Readable.toWeb(request) as ReadableStream<Uint8Array>;
    init.duplex = "half";
  }

  return new Request(
    new URL(target, INTERNAL_REQUEST_ORIGIN),
    init,
  );
}

export function createRailwayNodeRequestDispatcher(
  runtime: Pick<RailwayPostgresApiRuntime, "handler" | "readiness">,
): (request: Request) => Promise<Response> {
  if (
    typeof runtime?.handler?.handle !== "function" ||
    typeof runtime?.readiness?.check !== "function"
  ) {
    throw new Error("Railway Node HTTP runtime is invalid");
  }

  return async (request) => {
    const url = new URL(request.url);

    if (url.search !== "" || url.hash !== "") {
      return jsonResponse(404, "not-found");
    }

    if (url.pathname === LIVENESS_PATH && request.method === "GET") {
      return jsonResponse(200, "live");
    }

    if (url.pathname === READINESS_PATH && request.method === "GET") {
      const state = await runtime.readiness.check();
      return state.status === "ready"
        ? jsonResponse(200, "ready")
        : jsonResponse(503, "unavailable");
    }

    if (url.pathname === RAILWAY_API_ENDPOINT_PATH) {
      return runtime.handler.handle(request);
    }

    return jsonResponse(404, "not-found");
  };
}

async function writeNodeResponse(
  response: Response,
  target: ServerResponse,
): Promise<void> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  target.statusCode = response.status;
  response.headers.forEach((value, name) => {
    target.setHeader(name, value);
  });
  target.setHeader("content-length", String(bytes.byteLength));
  target.end(bytes);
}

function safeFailureResponse(): Response {
  return jsonResponse(503, "unavailable");
}

function requireOptions(
  options: Readonly<RailwayNodeHttpServerOptions>,
  dependencies: Readonly<RailwayNodeHttpServerDependencies>,
): void {
  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).sort().join(",") !== "port,runtime" ||
    !Number.isSafeInteger(options.port) ||
    options.port < 1 ||
    options.port > 65_535 ||
    typeof dependencies?.createServer !== "function"
  ) {
    throw new Error("Railway Node HTTP server options are invalid");
  }
}

export function createRailwayNodeHttpServer(
  options: Readonly<RailwayNodeHttpServerOptions>,
  dependencies: Readonly<RailwayNodeHttpServerDependencies> =
    defaultDependencies,
): Readonly<RailwayNodeHttpServer> {
  requireOptions(options, dependencies);
  const dispatch = createRailwayNodeRequestDispatcher(options.runtime);
  let started = false;
  let closed = false;
  let closing: Promise<void> | null = null;
  const server: Server = dependencies.createServer(
    {
      headersTimeout: 10_000,
      keepAliveTimeout: 5_000,
      maxHeaderSize: MAXIMUM_HEADER_BYTES,
      requestTimeout: 30_000,
      requireHostHeader: true,
    },
    (request, response) => {
      void (async () => {
        try {
          await writeNodeResponse(
            await dispatch(createRailwayNodeWebRequest(request)),
            response,
          );
        } catch {
          if (!response.headersSent) {
            await writeNodeResponse(safeFailureResponse(), response);
          } else {
            response.destroy();
          }
        }
      })();
    },
  );
  server.maxHeadersCount = 64;
  server.maxRequestsPerSocket = 100;

  return Object.freeze({
    async start() {
      if (closed) {
        throw new Error("Railway Node HTTP server is closed");
      }

      if (started) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => {
          server.off("listening", onListening);
          reject(error);
        };
        const onListening = () => {
          server.off("error", onError);
          started = true;
          resolve();
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(options.port, "0.0.0.0");
      });
    },
    async close() {
      if (!started) {
        return;
      }

      if (!closing) {
        closing = new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            started = false;
            closed = true;
            resolve();
          });
          server.closeIdleConnections();
        });
      }

      await closing;
    },
  });
}
