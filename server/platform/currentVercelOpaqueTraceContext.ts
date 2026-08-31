import { headers } from "next/headers.js";

import {
  deriveOpaqueW3cTraceContext,
  type W3cTraceContext,
} from "./w3cTraceContext.ts";

export interface VercelOpaqueTraceEnvironment {
  readonly VERCEL_ENV?: string;
  readonly CONNECT_TRACE_CONTEXT_HMAC_KEY?: string;
}

interface VercelOpaqueTraceDependencies {
  readonly readRequestId: () => Promise<string | null>;
}

const defaultDependencies = Object.freeze({
  async readRequestId(): Promise<string | null> {
    return (await headers()).get("x-vercel-id");
  },
}) satisfies VercelOpaqueTraceDependencies;

function readEnvironment(): VercelOpaqueTraceEnvironment {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    CONNECT_TRACE_CONTEXT_HMAC_KEY:
      process.env.CONNECT_TRACE_CONTEXT_HMAC_KEY,
  };
}

function productionLike(environment: string | undefined): boolean {
  return environment === "preview" || environment === "production";
}

export async function resolveVercelOpaqueTraceContext(
  environment: Readonly<VercelOpaqueTraceEnvironment>,
  dependencies: Readonly<VercelOpaqueTraceDependencies> = defaultDependencies,
): Promise<W3cTraceContext | null> {
  if (
    !environment ||
    typeof environment !== "object" ||
    typeof dependencies?.readRequestId !== "function" ||
    (environment.VERCEL_ENV !== undefined &&
      !["development", "preview", "production"].includes(
        environment.VERCEL_ENV,
      ))
  ) {
    throw new Error("Vercel opaque trace configuration is invalid");
  }

  const key = environment.CONNECT_TRACE_CONTEXT_HMAC_KEY;
  if (key === undefined || key === "") {
    if (productionLike(environment.VERCEL_ENV)) {
      throw new Error("Vercel opaque trace configuration is required");
    }
    return null;
  }

  let requestId: string | null;
  try {
    requestId = await dependencies.readRequestId();
  } catch {
    throw new Error("Vercel request identity is unavailable");
  }

  if (requestId === null) {
    if (productionLike(environment.VERCEL_ENV)) {
      throw new Error("Vercel request identity is required");
    }
    return null;
  }

  const context = await deriveOpaqueW3cTraceContext(requestId, key);
  if (context === null) {
    throw new Error("Vercel opaque trace input is invalid");
  }

  return context;
}

export function readCurrentVercelOpaqueTraceContext():
Promise<W3cTraceContext | null> {
  return resolveVercelOpaqueTraceContext(readEnvironment());
}
