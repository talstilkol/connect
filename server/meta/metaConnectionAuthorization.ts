import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import type {
  MetaConnectionRecord,
} from "../../shared/domain/metaConnection.ts";

export class MetaConnectionAuthorizationError extends Error {
  readonly code: "CONNECTION_CHANGED" | "CONNECTION_UNAVAILABLE";

  constructor(code: MetaConnectionAuthorizationError["code"]) {
    super("Meta connection authorization could not be confirmed");
    this.name = "MetaConnectionAuthorizationError";
    this.code = code;
  }
}

// Call after local claims and immediately before the provider operation.
// This checks the stored authorization; it cannot cancel an in-flight request.
export async function assertCurrentMetaConnection(
  connections: Pick<MetaRepository, "findConnectionByTenantId">,
  expected: Readonly<MetaConnectionRecord>,
): Promise<void> {
  if (
    !Number.isSafeInteger(expected.tenantId) ||
    expected.tenantId <= 0 ||
    !Number.isSafeInteger(expected.version) ||
    expected.version <= 0 ||
    expected.status !== "connected"
  ) {
    throw new MetaConnectionAuthorizationError("CONNECTION_CHANGED");
  }

  let current;
  try {
    current = await connections.findConnectionByTenantId(expected.tenantId);
  } catch {
    throw new MetaConnectionAuthorizationError("CONNECTION_UNAVAILABLE");
  }

  if (
    !current ||
    current.tenantId !== expected.tenantId ||
    current.status !== "connected" ||
    current.version !== expected.version ||
    current.businessPortfolioId !== expected.businessPortfolioId ||
    current.wabaId !== expected.wabaId ||
    current.phoneNumberId !== expected.phoneNumberId
  ) {
    throw new MetaConnectionAuthorizationError("CONNECTION_CHANGED");
  }
}
