import { AsyncLocalStorage } from "node:async_hooks";

import {
  isProviderRequestTelemetryValid,
  type ProviderRequestTelemetry,
  type ProviderRequestTelemetryOperation,
} from "./operationalTelemetry.ts";

const maximumRequestsPerScope = 64;

export interface ProviderRequestTelemetryClock {
  readonly now: () => Date;
}

export interface ProviderRequestTelemetryScope {
  readonly run: <T>(operation: () => Promise<T>) => Promise<T>;
  readonly record: (request: ProviderRequestTelemetry) => boolean;
  readonly snapshot: () => readonly ProviderRequestTelemetry[];
}

export interface ProviderRequestTelemetryDescriptor {
  readonly provider: ProviderRequestTelemetry["provider"];
  readonly operation: ProviderRequestTelemetryOperation;
}

function readClock(
  clock: Readonly<ProviderRequestTelemetryClock>,
): Date | null {
  try {
    const value = clock.now();
    return value instanceof Date && Number.isFinite(value.getTime())
      ? value
      : null;
  } catch {
    return null;
  }
}

function measurement(
  descriptor: Readonly<ProviderRequestTelemetryDescriptor>,
  started: Date | null,
  completed: Date | null,
  outcome: ProviderRequestTelemetry["outcome"],
): ProviderRequestTelemetry | null {
  if (
    started === null ||
    completed === null ||
    completed.getTime() < started.getTime()
  ) {
    return null;
  }

  const value = Object.freeze({
    provider: descriptor.provider,
    operation: descriptor.operation,
    outcome,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMilliseconds: completed.getTime() - started.getTime(),
  });

  return isProviderRequestTelemetryValid(value) ? value : null;
}

export function createProviderRequestTelemetryScope():
Readonly<ProviderRequestTelemetryScope> {
  const storage = new AsyncLocalStorage<ProviderRequestTelemetry[]>();

  return Object.freeze({
    async run<T>(operation: () => Promise<T>): Promise<T> {
      if (typeof operation !== "function") {
        throw new Error("Provider request telemetry operation is invalid");
      }
      return storage.run([], operation);
    },
    record(request: ProviderRequestTelemetry): boolean {
      const requests = storage.getStore();
      if (
        requests === undefined ||
        requests.length >= maximumRequestsPerScope ||
        !isProviderRequestTelemetryValid(request)
      ) {
        return false;
      }
      requests.push(structuredClone(request));
      return true;
    },
    snapshot(): readonly ProviderRequestTelemetry[] {
      const requests = storage.getStore() ?? [];
      return Object.freeze(
        requests.map((request) => Object.freeze(structuredClone(request))),
      );
    },
  });
}

export async function observeProviderRequest<T>(
  scope: Readonly<ProviderRequestTelemetryScope>,
  clock: Readonly<ProviderRequestTelemetryClock>,
  descriptor: Readonly<ProviderRequestTelemetryDescriptor>,
  operation: () => Promise<T>,
): Promise<T> {
  const operationMatchesProvider = descriptor?.provider === "meta"
    ? descriptor.operation === "campaign-message.send" ||
      descriptor.operation === "bot-reply.send" ||
      descriptor.operation === "message-template.submit" ||
      descriptor.operation === "message-template.list"
    : descriptor?.provider === "clerk"
      ? descriptor.operation === "organization-invitation.list" ||
        descriptor.operation === "organization-invitation.create"
      : false;
  if (
    typeof scope?.record !== "function" ||
    typeof clock?.now !== "function" ||
    typeof operation !== "function" ||
    !operationMatchesProvider
  ) {
    throw new Error("Provider request telemetry is invalid");
  }

  const started = readClock(clock);
  try {
    const result = await operation();
    const request = measurement(
      descriptor,
      started,
      readClock(clock),
      "completed",
    );
    if (request !== null) {
      scope.record(request);
    }
    return result;
  } catch (error) {
    const request = measurement(
      descriptor,
      started,
      readClock(clock),
      "failed",
    );
    if (request !== null) {
      scope.record(request);
    }
    throw error;
  }
}
