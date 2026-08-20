import type { ContactRecord } from "../../shared/domain/contactRecord.ts";
import { CONTACT_PAGE_SIZE } from "../../shared/domain/contactRecord.ts";
import {
  emptyContactOrganizationSnapshot,
  type ContactGroupRecord,
  type ContactListMembership,
  type ContactOrganizationSnapshot,
  type ContactTagAssignment,
} from "../../shared/domain/contactOrganization.ts";
import {
  validatePersistedContact,
} from "../../shared/validation/persistedContact.ts";
import type { RailwayApiClient } from "../platform/railwayApiClient.ts";
import type {
  RailwayApiClientConfigurationState,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import type {
  LoadMoreContactsActionResult,
} from "./contactActionResult.ts";

const operationId = "contacts.list";
const responseKeys = Object.freeze([
  "contacts",
  "nextCursor",
  "organization",
]);
const contactKeys = Object.freeze([
  "company",
  "consentRecordedAt",
  "consentSource",
  "consentStatus",
  "consentWithdrawnAt",
  "email",
  "firstName",
  "id",
  "lastName",
  "mailingStatus",
  "phoneNumber",
  "version",
]);
const organizationKeys = Object.freeze([
  "listMemberships",
  "lists",
  "scopeContactIds",
  "tagAssignments",
  "tags",
]);
const groupKeys = Object.freeze(["contactCount", "id", "name"]);
const tagAssignmentKeys = Object.freeze(["contactId", "tagId"]);
const listMembershipKeys = Object.freeze(["contactId", "listId"]);
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type RailwayCurrentContactDirectoryResult =
  | Readonly<{
      status: "ready";
      contacts: readonly Readonly<ContactRecord>[];
      nextCursor: number | null;
      organization: Readonly<ContactOrganizationSnapshot>;
    }>
  | Readonly<{
      status:
        | "configuration-required"
        | "onboarding-required"
        | "tenant-selection-required"
        | "server-error";
      contacts: readonly [];
      nextCursor: null;
      organization: typeof emptyContactOrganizationSnapshot;
    }>;

export interface RailwayContactDirectoryHandlerDependencies {
  readonly applicationConfigured: () => boolean;
  readonly inspectConfiguration: () => RailwayApiClientConfigurationState;
  readonly resolveIdentity: () => Promise<RailwayApiServerIdentityState>;
  readonly createClient: (
    configuration: Readonly<{
      apiOrigin: string;
      deploymentEnvironment: "development" | "preview" | "production";
      oidcToken: string;
      userSessionToken: string;
    }>,
  ) => RailwayApiClient;
}

export interface RailwayContactDirectoryHandler {
  readonly read: () => Promise<RailwayCurrentContactDirectoryResult>;
  readonly load: (
    beforeContactId: unknown,
  ) => Promise<LoadMoreContactsActionResult>;
}

function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const actualKeys = Object.keys(value).sort();

  return (
    actualKeys.length === keys.length &&
    actualKeys.every((key, index) => key === keys[index])
  );
}

function parsePositiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : null;
}

function parseNonnegativeInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : null;
}

function parseOptionalString(value: unknown): string | null | undefined {
  return value === null || typeof value === "string"
    ? value
    : undefined;
}

function isCanonicalTimestampOrNull(value: unknown): value is string | null {
  if (value === null) {
    return true;
  }

  if (
    typeof value !== "string" ||
    !canonicalTimestampPattern.test(value)
  ) {
    return false;
  }

  const milliseconds = Date.parse(value);

  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value
  );
}

export function parseRailwayContactRecord(
  value: unknown,
): Readonly<ContactRecord> | null {
  if (!isExactRecord(value, contactKeys)) {
    return null;
  }

  const id = parsePositiveInteger(value.id);
  const version = parsePositiveInteger(value.version);
  const firstName = parseOptionalString(value.firstName);
  const lastName = parseOptionalString(value.lastName);
  const email = parseOptionalString(value.email);
  const company = parseOptionalString(value.company);
  const consentSource = parseOptionalString(value.consentSource);

  if (
    id === null ||
    version === null ||
    typeof value.phoneNumber !== "string" ||
    firstName === undefined ||
    lastName === undefined ||
    email === undefined ||
    company === undefined ||
    consentSource === undefined ||
    (value.mailingStatus !== "subscribed" &&
      value.mailingStatus !== "unsubscribed") ||
    (value.consentStatus !== "unknown" &&
      value.consentStatus !== "granted" &&
      value.consentStatus !== "withdrawn") ||
    !isCanonicalTimestampOrNull(value.consentRecordedAt) ||
    !isCanonicalTimestampOrNull(value.consentWithdrawnAt)
  ) {
    return null;
  }

  const validation = validatePersistedContact({
    phoneNumber: value.phoneNumber,
    firstName,
    lastName,
    email,
    company,
  });

  if (
    !validation.success ||
    validation.value.phoneNumber !== value.phoneNumber ||
    validation.value.firstName !== firstName ||
    validation.value.lastName !== lastName ||
    validation.value.email !== email ||
    validation.value.company !== company
  ) {
    return null;
  }

  return Object.freeze({
    id,
    phoneNumber: value.phoneNumber,
    firstName,
    lastName,
    email,
    company,
    mailingStatus: value.mailingStatus,
    consentStatus: value.consentStatus,
    consentSource,
    consentRecordedAt: value.consentRecordedAt,
    consentWithdrawnAt: value.consentWithdrawnAt,
    version,
  });
}

function parseContacts(value: unknown): readonly Readonly<ContactRecord>[] | null {
  if (!Array.isArray(value) || value.length > CONTACT_PAGE_SIZE) {
    return null;
  }

  const contacts: Readonly<ContactRecord>[] = [];
  let previousId: number | null = null;

  for (const item of value) {
    const contact = parseRailwayContactRecord(item);

    if (
      contact === null ||
      (previousId !== null && contact.id >= previousId)
    ) {
      return null;
    }

    previousId = contact.id;
    contacts.push(contact);
  }

  return Object.freeze(contacts);
}

function parseGroups(value: unknown): readonly Readonly<ContactGroupRecord>[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const groups: Readonly<ContactGroupRecord>[] = [];
  const ids = new Set<number>();

  for (const item of value) {
    if (!isExactRecord(item, groupKeys)) {
      return null;
    }

    const id = parsePositiveInteger(item.id);
    const contactCount = parseNonnegativeInteger(item.contactCount);

    if (
      id === null ||
      contactCount === null ||
      ids.has(id) ||
      typeof item.name !== "string" ||
      item.name.length === 0 ||
      item.name !== item.name.trim()
    ) {
      return null;
    }

    ids.add(id);
    groups.push(Object.freeze({ id, name: item.name, contactCount }));
  }

  return Object.freeze(groups);
}

function parseScopeContactIds(
  value: unknown,
  contacts: readonly Readonly<ContactRecord>[],
): readonly number[] | null {
  if (!Array.isArray(value) || value.length !== contacts.length) {
    return null;
  }

  const ids: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const id = parsePositiveInteger(value[index]);

    if (id === null || id !== contacts[index]?.id) {
      return null;
    }

    ids.push(id);
  }

  return Object.freeze(ids);
}

function parseRelationships<T extends ContactTagAssignment | ContactListMembership>(
  value: unknown,
  keys: readonly string[],
  groupKey: "tagId" | "listId",
  contactIds: ReadonlySet<number>,
  groupIds: ReadonlySet<number>,
): readonly Readonly<T>[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const relationships: Readonly<T>[] = [];
  let previousContactId: number | null = null;
  let previousGroupId: number | null = null;

  for (const item of value) {
    if (!isExactRecord(item, keys)) {
      return null;
    }

    const contactId = parsePositiveInteger(item.contactId);
    const groupId = parsePositiveInteger(item[groupKey]);

    if (
      contactId === null ||
      groupId === null ||
      !contactIds.has(contactId) ||
      !groupIds.has(groupId) ||
      (previousContactId !== null &&
        (contactId < previousContactId ||
          (contactId === previousContactId &&
            previousGroupId !== null &&
            groupId <= previousGroupId)))
    ) {
      return null;
    }

    previousContactId = contactId;
    previousGroupId = groupId;
    relationships.push(Object.freeze({
      contactId,
      [groupKey]: groupId,
    }) as Readonly<T>);
  }

  return Object.freeze(relationships);
}

function parseOrganization(
  value: unknown,
  contacts: readonly Readonly<ContactRecord>[],
): Readonly<ContactOrganizationSnapshot> | null {
  if (!isExactRecord(value, organizationKeys)) {
    return null;
  }

  const scopeContactIds = parseScopeContactIds(
    value.scopeContactIds,
    contacts,
  );
  const tags = parseGroups(value.tags);
  const lists = parseGroups(value.lists);

  if (scopeContactIds === null || tags === null || lists === null) {
    return null;
  }

  const contactIds = new Set(scopeContactIds);
  const tagAssignments = parseRelationships<ContactTagAssignment>(
    value.tagAssignments,
    tagAssignmentKeys,
    "tagId",
    contactIds,
    new Set(tags.map(({ id }) => id)),
  );
  const listMemberships = parseRelationships<ContactListMembership>(
    value.listMemberships,
    listMembershipKeys,
    "listId",
    contactIds,
    new Set(lists.map(({ id }) => id)),
  );

  return tagAssignments === null || listMemberships === null
    ? null
    : Object.freeze({
        scopeContactIds,
        tags,
        lists,
        tagAssignments,
        listMemberships,
      });
}

function parseSuccess(data: unknown): Readonly<{
  contacts: readonly Readonly<ContactRecord>[];
  nextCursor: number | null;
  organization: Readonly<ContactOrganizationSnapshot>;
}> | null {
  if (!isExactRecord(data, responseKeys)) {
    return null;
  }

  const contacts = parseContacts(data.contacts);
  const nextCursor = data.nextCursor === null
    ? null
    : parsePositiveInteger(data.nextCursor);

  if (
    contacts === null ||
    nextCursor === null && data.nextCursor !== null ||
    (nextCursor !== null &&
      (contacts.length !== CONTACT_PAGE_SIZE ||
        contacts[contacts.length - 1]?.id !== nextCursor))
  ) {
    return null;
  }

  const organization = parseOrganization(data.organization, contacts);

  return organization === null
    ? null
    : Object.freeze({ contacts, nextCursor, organization });
}

function parseCursor(value: unknown): number | null {
  if (value === null) {
    return null;
  }

  const cursor = parsePositiveInteger(value);

  if (cursor === null) {
    throw new Error("invalid-contact-cursor");
  }

  return cursor;
}

function mapFailure(code: string): LoadMoreContactsActionResult {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" };
    case "TENANT_MEMBERSHIP_REQUIRED":
      return { status: "onboarding-required" };
    case "TENANT_SELECTION_REQUIRED":
      return { status: "tenant-selection-required" };
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return { status: "permission-denied" };
    case "NOT_FOUND":
      return { status: "not-found" };
    case "INVALID_REQUEST":
      return { status: "validation-error" };
    default:
      return { status: "server-error" };
  }
}

function requireDependencies(
  dependencies: Readonly<RailwayContactDirectoryHandlerDependencies>,
): void {
  if (!dependencies || typeof dependencies !== "object") {
    throw new Error("Railway contact directory dependencies are invalid");
  }

  const keys = Object.keys(dependencies).sort();

  if (
    keys.some((key) =>
      ![
        "applicationConfigured",
        "createClient",
        "inspectConfiguration",
        "resolveIdentity",
      ].includes(key),
    ) ||
    typeof dependencies.applicationConfigured !== "function" ||
    typeof dependencies.inspectConfiguration !== "function" ||
    typeof dependencies.resolveIdentity !== "function" ||
    typeof dependencies.createClient !== "function"
  ) {
    throw new Error("Railway contact directory dependencies are invalid");
  }
}

export function createRailwayContactDirectoryHandler(
  dependencies: Readonly<RailwayContactDirectoryHandlerDependencies>,
): Readonly<RailwayContactDirectoryHandler> {
  requireDependencies(dependencies);

  async function load(
    beforeContactId: unknown,
  ): Promise<LoadMoreContactsActionResult> {
    if (!dependencies.applicationConfigured()) {
      return { status: "configuration-required" };
    }

    const configurationState = dependencies.inspectConfiguration();

    if (configurationState.status !== "configured") {
      return { status: "configuration-required" };
    }

    let cursor: number | null;

    try {
      cursor = parseCursor(beforeContactId);
    } catch {
      return { status: "validation-error" };
    }

    let identityState: RailwayApiServerIdentityState;

    try {
      identityState = await dependencies.resolveIdentity();
    } catch {
      return { status: "server-error" };
    }

    if (identityState.status === "unauthenticated") {
      return { status: "unauthenticated" };
    }

    if (identityState.status !== "authenticated") {
      return { status: "server-error" };
    }

    const request = Object.freeze({
      contractVersion: RAILWAY_API_CONTRACT_VERSION,
      operation: operationId,
      requestKind: "query",
      idempotencyKey: null,
      payload: Object.freeze({ beforeContactId: cursor }),
    } satisfies RailwayApiRequestEnvelope);

    try {
      const client = dependencies.createClient({
        ...configurationState.configuration,
        oidcToken: identityState.oidcToken,
        userSessionToken: identityState.userSessionToken,
      });
      const response = await client.call(request);

      if (response.outcome === "error") {
        return mapFailure(response.code);
      }

      const page = parseSuccess(response.data);

      return page === null
        ? { status: "server-error" }
        : Object.freeze({ status: "loaded", ...page });
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    load,
    async read(): Promise<RailwayCurrentContactDirectoryResult> {
      const result = await load(null);

      if (result.status === "loaded") {
        return Object.freeze({
          status: "ready",
          contacts: result.contacts,
          nextCursor: result.nextCursor,
          organization: result.organization,
        });
      }

      const status =
        result.status === "configuration-required" ||
        result.status === "onboarding-required" ||
        result.status === "tenant-selection-required"
          ? result.status
          : "server-error";

      return Object.freeze({
        status,
        contacts: [] as const,
        nextCursor: null,
        organization: emptyContactOrganizationSnapshot,
      });
    },
  });
}
