import type {
  Permission,
} from "../../shared/domain/model.ts";
import {
  validatePersistedContact,
  type PersistedContactProfile,
} from "../../shared/validation/persistedContact.ts";
import type {
  ContactService,
} from "../contacts/contactService.ts";
import {
  ContactCursorInputError,
} from "../contacts/contactService.ts";
import {
  toContactRecord,
} from "../contacts/contactRecordMapper.ts";
import type {
  OperationalReportService,
} from "../reports/operationalReportService.ts";
import {
  OperationalReportInputError,
  validateOperationalReportInput,
} from "../reports/operationalReportService.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import {
  requireTenantPermission,
  TenantSessionError,
  type TenantSession,
} from "../auth/tenantSession.ts";
import type {
  RailwayApiJsonObject,
  RailwayApiRequestEnvelope,
  RailwayApiRequestKind,
} from "./railwayApiContract.ts";
import {
  RailwayApiDispatchError,
  type RailwayApiDispatchContext,
  type RailwayApiOperation,
} from "./railwayApiHttpHandler.ts";
import type {
  RailwayTenantSessionResolver,
} from "./railwayTenantSessionResolver.ts";
import {
  deriveRailwayApiMutationRequestDigest,
  type RailwayApiContactSaveResult,
  type RailwayApiMutationExecutor,
} from "./railwayApiMutationExecutor.ts";

export interface RailwayApiMutationSafetyPolicy {
  readonly rateLimit: "tenant-mutation";
  readonly idempotency: "atomic-request-digest-replay";
  readonly audit: "atomic-immutable-event";
  readonly transaction: "required";
}

export interface RailwayApiOperationPolicy {
  readonly id: string;
  readonly requestKind: RailwayApiRequestKind;
  readonly permission: Permission | null;
  readonly mutationSafety: Readonly<RailwayApiMutationSafetyPolicy> | null;
}

export const railwayApiOperationPolicies = Object.freeze([
  Object.freeze({
    id: "workspace.context.read",
    requestKind: "query" as const,
    permission: null,
    mutationSafety: null,
  }),
  Object.freeze({
    id: "contacts.list",
    requestKind: "query" as const,
    permission: "contacts.read" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: "contacts.save",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "reports.read",
    requestKind: "query" as const,
    permission: "reports.read" as const,
    mutationSafety: null,
  }),
] as const satisfies readonly Readonly<RailwayApiOperationPolicy>[]);

export interface RailwayApiOperationRegistryDependencies {
  readonly tenantSessions: RailwayTenantSessionResolver;
  readonly contacts: Pick<ContactService, "list">;
  readonly reports: Pick<OperationalReportService, "read">;
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly mutations: RailwayApiMutationExecutor;
}

export interface RailwayApiOperationRegistry {
  readonly operations: readonly Readonly<RailwayApiOperation>[];
}

type OperationPayloadParser<TPayload> = (
  payload: RailwayApiJsonObject,
) => TPayload;

type OperationExecutor<TPayload> = (
  session: Readonly<TenantSession>,
  payload: TPayload,
  request: Readonly<RailwayApiRequestEnvelope>,
) => Promise<unknown>;

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every(
      (key, index) => key === sortedExpectedKeys[index],
    )
  );
}

function invalidRequest(): never {
  throw new RailwayApiDispatchError("INVALID_REQUEST");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isStringOrNull(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function parseEmptyPayload(
  payload: RailwayApiJsonObject,
): RailwayApiJsonObject {
  if (!hasExactKeys(payload, [])) {
    invalidRequest();
  }

  return payload;
}

function parseContactListPayload(
  payload: RailwayApiJsonObject,
): number | null {
  if (!hasExactKeys(payload, ["beforeContactId"])) {
    invalidRequest();
  }

  const value = payload.beforeContactId;

  if (
    value !== null &&
    (!Number.isSafeInteger(value) || Number(value) <= 0)
  ) {
    invalidRequest();
  }

  return value === null ? null : Number(value);
}

function parseContactSavePayload(
  payload: RailwayApiJsonObject,
): Readonly<PersistedContactProfile> {
  if (
    !hasExactKeys(payload, [
      "phoneNumber",
      "firstName",
      "lastName",
      "email",
      "company",
    ]) ||
    typeof payload.phoneNumber !== "string" ||
    !isStringOrNull(payload.firstName) ||
    !isStringOrNull(payload.lastName) ||
    !isStringOrNull(payload.email) ||
    !isStringOrNull(payload.company)
  ) {
    invalidRequest();
  }

  const validation = validatePersistedContact(payload);

  if (!validation.success) {
    invalidRequest();
  }

  return Object.freeze({ ...validation.value });
}

function isValidContactSaveResult(
  value: unknown,
  session: Readonly<TenantSession>,
  profile: Readonly<PersistedContactProfile>,
): value is RailwayApiContactSaveResult {
  if (!isRecord(value) || typeof value.outcome !== "string") {
    return false;
  }

  if (
    value.outcome === "conflict" ||
    value.outcome === "unavailable"
  ) {
    return value.tenantId === null && value.contact === null;
  }

  if (
    (value.outcome !== "committed" &&
      value.outcome !== "replayed") ||
    !Number.isSafeInteger(value.tenantId) ||
    Number(value.tenantId) !== session.tenantId ||
    !isRecord(value.contact) ||
    !hasExactKeys(value.contact, [
      "id",
      "phoneNumber",
      "firstName",
      "lastName",
      "email",
      "company",
      "mailingStatus",
      "consentStatus",
      "consentSource",
      "consentRecordedAt",
      "consentWithdrawnAt",
      "version",
    ])
  ) {
    return false;
  }

  const contact = value.contact;
  const validation = validatePersistedContact(contact);

  return (
    validation.success &&
    Number.isSafeInteger(contact.id) &&
    Number(contact.id) > 0 &&
    Number.isSafeInteger(contact.version) &&
    Number(contact.version) > 0 &&
    (contact.mailingStatus === "subscribed" ||
      contact.mailingStatus === "unsubscribed") &&
    (contact.consentStatus === "unknown" ||
      contact.consentStatus === "granted" ||
      contact.consentStatus === "withdrawn") &&
    isStringOrNull(contact.consentSource) &&
    isStringOrNull(contact.consentRecordedAt) &&
    isStringOrNull(contact.consentWithdrawnAt) &&
    validation.value.phoneNumber === profile.phoneNumber &&
    validation.value.firstName === profile.firstName &&
    validation.value.lastName === profile.lastName &&
    validation.value.email === profile.email &&
    validation.value.company === profile.company
  );
}

function parseReportPayload(
  payload: RailwayApiJsonObject,
): Readonly<{
  startDate: string;
  endDate: string;
}> {
  if (!hasExactKeys(payload, ["startDate", "endDate"])) {
    invalidRequest();
  }

  if (
    typeof payload.startDate !== "string" ||
    typeof payload.endDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.endDate)
  ) {
    invalidRequest();
  }

  validateOperationalReportInput(payload);

  return Object.freeze({
    startDate: payload.startDate,
    endDate: payload.endDate,
  });
}

function mapOperationError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) {
    throw error;
  }

  if (error instanceof TenantSessionError) {
    throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
  }

  if (
    error instanceof ContactCursorInputError ||
    error instanceof OperationalReportInputError
  ) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }

  throw error;
}

function createOperation<TPayload>(
  policy: Readonly<RailwayApiOperationPolicy>,
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  parsePayload: OperationPayloadParser<TPayload>,
  execute: OperationExecutor<TPayload>,
): Readonly<RailwayApiOperation> {
  return Object.freeze({
    id: policy.id,
    requestKind: policy.requestKind,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        const parsedPayload = parsePayload(payload);
        const session = await dependencies.tenantSessions.resolve(
          context.userIdentity,
        );

        if (policy.permission !== null) {
          requireTenantPermission(session, policy.permission);
        }

        return await execute(session, parsedPayload, request);
      } catch (error) {
        mapOperationError(error);
      }
    },
  });
}

async function executeContactSave(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  profile: Readonly<PersistedContactProfile>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  if (
    request.operation !== "contacts.save" ||
    request.requestKind !== "mutation" ||
    request.idempotencyKey === null
  ) {
    invalidRequest();
  }

  let rateLimitDecision;

  try {
    rateLimitDecision =
      await dependencies.mutationRateLimit.consume(
        `${session.tenantId}:${session.externalUserId}:contacts.save`,
      );
  } catch {
    throw new RailwayApiDispatchError(
      "DEPENDENCY_UNAVAILABLE",
    );
  }

  if (rateLimitDecision.outcome === "limited") {
    throw new RailwayApiDispatchError("RATE_LIMITED");
  }

  if (rateLimitDecision.outcome !== "allowed") {
    throw new RailwayApiDispatchError(
      "DEPENDENCY_UNAVAILABLE",
    );
  }

  const requestDigest =
    await deriveRailwayApiMutationRequestDigest(
      "contacts.save",
      profile,
    );
  let result: unknown;

  try {
    result = await dependencies.mutations.saveContact({
      session,
      idempotencyKey: request.idempotencyKey,
      requestDigest,
      profile,
    });
  } catch {
    throw new RailwayApiDispatchError(
      "DEPENDENCY_UNAVAILABLE",
    );
  }

  if (!isValidContactSaveResult(result, session, profile)) {
    throw new RailwayApiDispatchError(
      "DEPENDENCY_UNAVAILABLE",
    );
  }

  if (result.contact === null) {
    if (result.outcome === "conflict") {
      throw new RailwayApiDispatchError("CONFLICT");
    }

    throw new RailwayApiDispatchError(
      "DEPENDENCY_UNAVAILABLE",
    );
  }

  return {
    replayed: result.outcome === "replayed",
    contact: result.contact,
  };
}

export function createRailwayApiOperationRegistry(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
): Readonly<RailwayApiOperationRegistry> {
  if (
    typeof dependencies.tenantSessions?.resolve !== "function" ||
    typeof dependencies.contacts?.list !== "function" ||
    typeof dependencies.reports?.read !== "function" ||
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    typeof dependencies.mutations?.saveContact !== "function"
  ) {
    throw new Error(
      "Railway API operation dependencies are invalid",
    );
  }

  const [
    workspacePolicy,
    contactsPolicy,
    contactSavePolicy,
    reportsPolicy,
  ] =
    railwayApiOperationPolicies;
  const operations = [
    createOperation(
      workspacePolicy,
      dependencies,
      parseEmptyPayload,
      async (session) => {
        return {
          displayName: session.displayName,
          status: session.status,
          role: session.role,
        };
      },
    ),
    createOperation(
      contactsPolicy,
      dependencies,
      parseContactListPayload,
      async (session, beforeContactId) => {
        const page = await dependencies.contacts.list(
          session,
          beforeContactId,
        );

        return {
          contacts: page.contacts.map(toContactRecord),
          nextCursor: page.nextCursor,
        };
      },
    ),
    createOperation(
      contactSavePolicy,
      dependencies,
      parseContactSavePayload,
      async (session, profile, request) =>
        executeContactSave(
          dependencies,
          session,
          profile,
          request,
        ),
    ),
    createOperation(
      reportsPolicy,
      dependencies,
      parseReportPayload,
      async (session, reportInput) =>
        dependencies.reports.read(
          session,
          reportInput,
        ),
    ),
  ];

  return Object.freeze({
    operations: Object.freeze(operations),
  });
}
