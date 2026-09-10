import { types as nodeUtilTypes } from "node:util";

import type { Pool } from "pg";

import {
  createNodePostgresBotReplyPinnedSessionTransport,
} from "./nodePostgresBotReplyPinnedSessionTransport.ts";
import {
  createRailwayBotReplyPinnedBoundaryDriver,
  type RailwayBotReplyPinnedBoundaryDependencies,
  RailwayBotReplyPinnedBoundaryError,
} from "./railwayBotReplyPinnedBoundaryDriver.ts";

const dependencyKeys = Object.freeze([
  "clock",
  "deadlines",
  "pool",
  "provider",
]);

type ExactRecord = Readonly<Record<string, unknown>>;
type PoolConnect = (...arguments_: unknown[]) => unknown;

export const railwayBotReplyPinnedBoundaryCompositionStatus = Object.freeze({
  activationAllowed: false as const,
  compositionStatus: "dormant" as const,
  concreteAdapterStatus: "missing" as const,
  runtimeImporters: 0 as const,
  trustedWriters: "missing" as const,
});

export interface RailwayBotReplyPinnedBoundaryCompositionDependencies {
  readonly clock: RailwayBotReplyPinnedBoundaryDependencies["clock"];
  readonly deadlines: RailwayBotReplyPinnedBoundaryDependencies["deadlines"];
  readonly pool: Pool;
  readonly provider: RailwayBotReplyPinnedBoundaryDependencies["provider"];
}

export type RailwayBotReplyPinnedBoundaryComposition = ReturnType<
  typeof createRailwayBotReplyPinnedBoundaryDriver
>;

function fail(): never {
  throw new RailwayBotReplyPinnedBoundaryError("invalid-dependencies");
}

function requireExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): ExactRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail();
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return fail();
    }
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) return fail();
    const actualKeys = (ownKeys as string[]).sort();
    const normalizedExpectedKeys = [...expectedKeys].sort();
    if (
      actualKeys.length !== normalizedExpectedKeys.length ||
      actualKeys.some(
        (key, index) => key !== normalizedExpectedKeys[index],
      )
    ) {
      return fail();
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of actualKeys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return fail();
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (error instanceof RailwayBotReplyPinnedBoundaryError) {
      throw error;
    }
    return fail();
  }
}

function requirePoolBinding(value: unknown): Pool {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail();
  }

  try {
    const receiver = value;
    const visited = new Set<object>();
    let current: object | null = receiver;
    while (current !== null) {
      if (nodeUtilTypes.isProxy(current) || visited.has(current)) {
        return fail();
      }
      visited.add(current);
      const descriptor = Object.getOwnPropertyDescriptor(current, "connect");
      if (descriptor !== undefined) {
        if (!("value" in descriptor) || typeof descriptor.value !== "function") {
          return fail();
        }
        const connect = descriptor.value as PoolConnect;
        return Object.freeze({
          connect(...arguments_: unknown[]) {
            return Reflect.apply(connect, receiver, arguments_);
          },
        }) as unknown as Pool;
      }
      current = Object.getPrototypeOf(current) as object | null;
    }
  } catch (error) {
    if (error instanceof RailwayBotReplyPinnedBoundaryError) {
      throw error;
    }
    return fail();
  }
  return fail();
}

export function createRailwayBotReplyPinnedBoundaryComposition(
  rawDependencies:
    Readonly<RailwayBotReplyPinnedBoundaryCompositionDependencies>,
): RailwayBotReplyPinnedBoundaryComposition {
  const dependencies = requireExactRecord(rawDependencies, dependencyKeys);
  const pool = requirePoolBinding(dependencies.pool);
  const sessions = createNodePostgresBotReplyPinnedSessionTransport({ pool });

  return createRailwayBotReplyPinnedBoundaryDriver({
    clock: dependencies.clock as
      RailwayBotReplyPinnedBoundaryDependencies["clock"],
    deadlines: dependencies.deadlines as
      RailwayBotReplyPinnedBoundaryDependencies["deadlines"],
    provider: dependencies.provider as
      RailwayBotReplyPinnedBoundaryDependencies["provider"],
    sessions,
  });
}
