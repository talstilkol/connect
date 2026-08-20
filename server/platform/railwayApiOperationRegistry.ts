import {
  ContactNotFoundError,
} from "../../db/contactConsentRepository.ts";
import type {
  ContactRecord,
} from "../../shared/domain/contactRecord.ts";
import type {
  Permission,
} from "../../shared/domain/model.ts";
import {
  validateContactConsentTransition,
  type ContactConsentTransition,
} from "../../shared/validation/contactConsent.ts";
import {
  validatePersistedContact,
  type PersistedContactProfile,
} from "../../shared/validation/persistedContact.ts";
import type {
  ContactService,
} from "../contacts/contactService.ts";
import type {
  ContactOrganizationService,
} from "../contacts/contactOrganizationService.ts";
import {
  ContactOrganizationInputError,
  parseContactOrganizationAssignment,
  parseContactOrganizationName,
} from "../contacts/contactOrganizationService.ts";
import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization.ts";
import {
  parseRailwayContactOrganizationSnapshot,
} from "../contacts/railwayContactDirectoryHandler.ts";
import {
  ContactConsentInputError,
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
import {
  toOperationalReportView,
} from "../reports/operationalReportView.ts";
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
  deriveRailwayApiDeterministicIdempotencyKey,
  deriveRailwayApiMutationRequestDigest,
  type RailwayApiContactSaveResult,
  type RailwayApiMutationExecutor,
} from "./railwayApiMutationExecutor.ts";
import type {
  RailwayContactOrganizationMutationExecutor,
  RailwayContactOrganizationMutationOperation,
  RailwayContactOrganizationMutationResult,
} from "./railwayContactOrganizationMutationExecutor.ts";

export interface RailwayApiMutationSafetyPolicy {
  readonly rateLimit: "tenant-mutation";
  readonly idempotency:
    | "atomic-request-digest-replay"
    | "deterministic-domain-event-replay";
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
    id: "contacts.consent.grant",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "deterministic-domain-event-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "contacts.consent.unsubscribe",
    requestKind: "mutation" as const,
    permission: "contacts.write" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "deterministic-domain-event-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
  Object.freeze({
    id: "contacts.organization.tag.save",
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
    id: "contacts.organization.list.save",
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
    id: "contacts.organization.tag-assignment",
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
    id: "contacts.organization.list-membership",
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
  readonly contactConsent: Pick<
    ContactService,
    "grantConsent" | "unsubscribe"
  >;
  readonly contactOrganization: Pick<ContactOrganizationService, "read">;
  readonly contactOrganizationMutations:
    RailwayContactOrganizationMutationExecutor;
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

interface ContactSavePayload extends PersistedContactProfile {
  readonly submissionOccurredAt: string;
}

interface ContactConsentPayload extends ContactConsentTransition {
  readonly contactId: number;
}

interface ContactOrganizationNamePayload {
  readonly name: string;
}

interface ContactOrganizationAssignmentPayload {
  readonly contactId: number;
  readonly groupId: number;
  readonly assigned: boolean;
}

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
): Readonly<ContactSavePayload> {
  if (
    !hasExactKeys(payload, [
      "company",
      "email",
      "firstName",
      "lastName",
      "phoneNumber",
      "submissionOccurredAt",
    ]) ||
    typeof payload.phoneNumber !== "string" ||
    !isStringOrNull(payload.firstName) ||
    !isStringOrNull(payload.lastName) ||
    !isStringOrNull(payload.email) ||
    !isStringOrNull(payload.company) ||
    typeof payload.submissionOccurredAt !== "string"
  ) {
    invalidRequest();
  }

  const validation = validatePersistedContact(payload);

  const submissionMilliseconds = Date.parse(
    payload.submissionOccurredAt,
  );

  if (
    !validation.success ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      payload.submissionOccurredAt,
    ) ||
    !Number.isFinite(submissionMilliseconds) ||
    new Date(submissionMilliseconds).toISOString() !==
      payload.submissionOccurredAt
  ) {
    invalidRequest();
  }

  return Object.freeze({
    ...validation.value,
    submissionOccurredAt: payload.submissionOccurredAt,
  });
}

function parseContactConsentPayload(
  payload: RailwayApiJsonObject,
): Readonly<ContactConsentPayload> {
  if (
    !hasExactKeys(payload, [
      "contactId",
      "evidenceReference",
      "occurredAt",
      "source",
    ]) ||
    !Number.isSafeInteger(payload.contactId) ||
    Number(payload.contactId) <= 0 ||
    typeof payload.source !== "string" ||
    typeof payload.occurredAt !== "string" ||
    (payload.evidenceReference !== null &&
      typeof payload.evidenceReference !== "string")
  ) {
    invalidRequest();
  }

  const validation = validateContactConsentTransition({
    source: payload.source,
    occurredAt: payload.occurredAt,
    evidenceReference: payload.evidenceReference,
  });

  if (!validation.success) {
    invalidRequest();
  }

  return Object.freeze({
    contactId: Number(payload.contactId),
    ...validation.value,
  });
}

function parseContactOrganizationNamePayload(
  payload: RailwayApiJsonObject,
): Readonly<ContactOrganizationNamePayload> {
  if (
    !hasExactKeys(payload, ["name"]) ||
    typeof payload.name !== "string"
  ) {
    invalidRequest();
  }

  const parsed = parseContactOrganizationName(payload.name);

  return Object.freeze({ name: parsed.name });
}

function parseContactOrganizationAssignmentPayload(
  payload: RailwayApiJsonObject,
): Readonly<ContactOrganizationAssignmentPayload> {
  if (!hasExactKeys(payload, ["assigned", "contactId", "groupId"])) {
    invalidRequest();
  }

  return parseContactOrganizationAssignment(payload);
}

function isValidContactRecord(
  value: unknown,
): value is ContactRecord {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
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

  const validation = validatePersistedContact(value);

  return (
    validation.success &&
    Number.isSafeInteger(value.id) &&
    Number(value.id) > 0 &&
    Number.isSafeInteger(value.version) &&
    Number(value.version) > 0 &&
    (value.mailingStatus === "subscribed" ||
      value.mailingStatus === "unsubscribed") &&
    (value.consentStatus === "unknown" ||
      value.consentStatus === "granted" ||
      value.consentStatus === "withdrawn") &&
    isStringOrNull(value.consentSource) &&
    isStringOrNull(value.consentRecordedAt) &&
    isStringOrNull(value.consentWithdrawnAt)
  );
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
    !isValidContactRecord(value.contact)
  ) {
    return false;
  }

  const contact = value.contact;
  const validation = validatePersistedContact(contact);

  return (
    validation.success &&
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

function toContactOrganizationView(
  snapshot: Readonly<ContactOrganizationSnapshot>,
): Readonly<ContactOrganizationSnapshot> {
  return Object.freeze({
    scopeContactIds: Object.freeze([...snapshot.scopeContactIds]),
    tags: Object.freeze(
      snapshot.tags.map(({ id, name, contactCount }) =>
        Object.freeze({ id, name, contactCount }),
      ),
    ),
    lists: Object.freeze(
      snapshot.lists.map(({ id, name, contactCount }) =>
        Object.freeze({ id, name, contactCount }),
      ),
    ),
    tagAssignments: Object.freeze(
      snapshot.tagAssignments.map(({ contactId, tagId }) =>
        Object.freeze({ contactId, tagId }),
      ),
    ),
    listMemberships: Object.freeze(
      snapshot.listMemberships.map(({ contactId, listId }) =>
        Object.freeze({ contactId, listId }),
      ),
    ),
  });
}

function mapOperationError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) {
    throw error;
  }

  if (error instanceof TenantSessionError) {
    switch (error.code) {
      case "TENANT_MEMBERSHIP_REQUIRED":
        throw new RailwayApiDispatchError(
          "TENANT_MEMBERSHIP_REQUIRED",
        );
      case "TENANT_SELECTION_REQUIRED":
        throw new RailwayApiDispatchError(
          "TENANT_SELECTION_REQUIRED",
        );
      case "PERMISSION_DENIED":
        throw new RailwayApiDispatchError("PERMISSION_DENIED");
      default:
        throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
    }
  }

  if (
    error instanceof ContactCursorInputError ||
    error instanceof ContactConsentInputError ||
    error instanceof ContactOrganizationInputError ||
    error instanceof OperationalReportInputError
  ) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }

  if (error instanceof ContactNotFoundError) {
    throw new RailwayApiDispatchError("NOT_FOUND");
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

async function requireTenantMutationRequest(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  operation: string,
  payload: Readonly<object>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<Readonly<{
  idempotencyKey: string;
  requestDigest: string;
}>> {
  if (
    request.operation !== operation ||
    request.requestKind !== "mutation" ||
    request.idempotencyKey === null
  ) {
    invalidRequest();
  }

  let requestDigest: string;
  let expectedIdempotencyKey: string;

  try {
    [requestDigest, expectedIdempotencyKey] = await Promise.all([
      deriveRailwayApiMutationRequestDigest(operation, payload),
      deriveRailwayApiDeterministicIdempotencyKey(operation, payload),
    ]);
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (request.idempotencyKey !== expectedIdempotencyKey) {
    invalidRequest();
  }

  let rateLimitDecision;

  try {
    rateLimitDecision = await dependencies.mutationRateLimit.consume(
      `${session.tenantId}:${session.externalUserId}:${operation}`,
    );
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (rateLimitDecision.outcome === "limited") {
    throw new RailwayApiDispatchError("RATE_LIMITED");
  }

  if (rateLimitDecision.outcome !== "allowed") {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  return Object.freeze({
    idempotencyKey: request.idempotencyKey,
    requestDigest,
  });
}

async function executeContactSave(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  payload: Readonly<ContactSavePayload>,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    "contacts.save",
    payload,
    request,
  );

  const profile = Object.freeze({
    phoneNumber: payload.phoneNumber,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    company: payload.company,
  });
  let result: unknown;

  try {
    result = await dependencies.mutations.saveContact({
      session,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
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

async function executeContactConsent(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  payload: Readonly<ContactConsentPayload>,
  request: Readonly<RailwayApiRequestEnvelope>,
  action: "grant" | "unsubscribe",
): Promise<unknown> {
  const operation = action === "grant"
    ? "contacts.consent.grant"
    : "contacts.consent.unsubscribe";

  await requireTenantMutationRequest(
    dependencies,
    session,
    operation,
    payload,
    request,
  );

  const transition = Object.freeze({
    source: payload.source,
    occurredAt: payload.occurredAt,
    evidenceReference: payload.evidenceReference,
  });
  const persisted = action === "grant"
    ? await dependencies.contactConsent.grantConsent(
        session,
        payload.contactId,
        transition,
      )
    : await dependencies.contactConsent.unsubscribe(
        session,
        payload.contactId,
        transition,
      );

  if (
    !isRecord(persisted) ||
    persisted.tenantId !== session.tenantId ||
    persisted.id !== payload.contactId
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  const contact = toContactRecord(persisted);

  if (!isValidContactRecord(contact)) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  return { contact };
}

async function executeContactOrganizationMutation(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  session: Readonly<TenantSession>,
  operation: RailwayContactOrganizationMutationOperation,
  payload: Readonly<
    ContactOrganizationNamePayload | ContactOrganizationAssignmentPayload
  >,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<unknown> {
  const mutationRequest = await requireTenantMutationRequest(
    dependencies,
    session,
    operation,
    payload,
    request,
  );
  let rawResult: unknown;

  try {
    rawResult = await dependencies.contactOrganizationMutations.execute({
      session,
      operation,
      idempotencyKey: mutationRequest.idempotencyKey,
      requestDigest: mutationRequest.requestDigest,
      payload,
    });
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (
    !isRecord(rawResult) ||
    typeof rawResult.outcome !== "string" ||
    !hasExactKeys(rawResult, ["organization", "outcome", "tenantId"])
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  const result = rawResult as RailwayContactOrganizationMutationResult;

  if (
    result.outcome === "conflict" ||
    result.outcome === "not-found" ||
    result.outcome === "unavailable"
  ) {
    if (result.tenantId !== null || result.organization !== null) {
      throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }

    throw new RailwayApiDispatchError(
      result.outcome === "conflict"
        ? "CONFLICT"
        : result.outcome === "not-found"
          ? "NOT_FOUND"
          : "DEPENDENCY_UNAVAILABLE",
    );
  }

  const expectedContactIds = "contactId" in payload
    ? [payload.contactId]
    : [];
  const organization = parseRailwayContactOrganizationSnapshot(
    result.organization,
    expectedContactIds,
  );

  if (
    result.tenantId !== session.tenantId ||
    organization === null
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  return Object.freeze({
    replayed: result.outcome === "replayed",
    organization,
  });
}

export function createRailwayApiOperationRegistry(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
): Readonly<RailwayApiOperationRegistry> {
  if (
    typeof dependencies.tenantSessions?.resolve !== "function" ||
    typeof dependencies.contacts?.list !== "function" ||
    typeof dependencies.contactConsent?.grantConsent !== "function" ||
    typeof dependencies.contactConsent?.unsubscribe !== "function" ||
    typeof dependencies.contactOrganization?.read !== "function" ||
    typeof dependencies.contactOrganizationMutations?.execute !== "function" ||
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
    contactConsentGrantPolicy,
    contactConsentUnsubscribePolicy,
    contactTagSavePolicy,
    contactListSavePolicy,
    contactTagAssignmentPolicy,
    contactListMembershipPolicy,
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
        const organization =
          await dependencies.contactOrganization.read(
            session,
            page.contacts.map((contact) => contact.id),
          );

        return {
          contacts: page.contacts.map(toContactRecord),
          nextCursor: page.nextCursor,
          organization: toContactOrganizationView(organization),
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
      contactConsentGrantPolicy,
      dependencies,
      parseContactConsentPayload,
      async (session, payload, request) =>
        executeContactConsent(
          dependencies,
          session,
          payload,
          request,
          "grant",
        ),
    ),
    createOperation(
      contactConsentUnsubscribePolicy,
      dependencies,
      parseContactConsentPayload,
      async (session, payload, request) =>
        executeContactConsent(
          dependencies,
          session,
          payload,
          request,
          "unsubscribe",
        ),
    ),
    createOperation(
      contactTagSavePolicy,
      dependencies,
      parseContactOrganizationNamePayload,
      (session, payload, request) =>
        executeContactOrganizationMutation(
          dependencies,
          session,
          "contacts.organization.tag.save",
          payload,
          request,
        ),
    ),
    createOperation(
      contactListSavePolicy,
      dependencies,
      parseContactOrganizationNamePayload,
      (session, payload, request) =>
        executeContactOrganizationMutation(
          dependencies,
          session,
          "contacts.organization.list.save",
          payload,
          request,
        ),
    ),
    createOperation(
      contactTagAssignmentPolicy,
      dependencies,
      parseContactOrganizationAssignmentPayload,
      (session, payload, request) =>
        executeContactOrganizationMutation(
          dependencies,
          session,
          "contacts.organization.tag-assignment",
          payload,
          request,
        ),
    ),
    createOperation(
      contactListMembershipPolicy,
      dependencies,
      parseContactOrganizationAssignmentPayload,
      (session, payload, request) =>
        executeContactOrganizationMutation(
          dependencies,
          session,
          "contacts.organization.list-membership",
          payload,
          request,
        ),
    ),
    createOperation(
      reportsPolicy,
      dependencies,
      parseReportPayload,
      async (session, reportInput) =>
        toOperationalReportView(
          await dependencies.reports.read(
            session,
            reportInput,
          ),
        ),
    ),
  ];

  return Object.freeze({
    operations: Object.freeze(operations),
  });
}
