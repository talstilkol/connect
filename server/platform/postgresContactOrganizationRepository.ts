import {
  ContactOrganizationTargetNotFoundError,
  type ContactOrganizationRepository,
} from "../../db/contactOrganizationRepository.ts";
import type {
  ContactGroupRecord,
  ContactListMembership,
  ContactOrganizationSnapshot,
  ContactTagAssignment,
} from "../../shared/domain/contactOrganization.ts";
import {
  parsePostgresPositiveInteger,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const maximumScopedContacts = 50;
const groupRowKeys = Object.freeze(["id", "name", "contactCount"]);
const relationshipRowKeys = Object.freeze(["contactId", "groupId"]);
const relationshipWriteRowKeys = Object.freeze(["found"]);

function relationshipPlaceholders(contactCount: number): string {
  return Array.from(
    { length: contactCount },
    (_, index) => `$${index + 2}`,
  ).join(", ");
}

function listRelationshipsSql(
  relationshipTable: "contact_tag_assignments" | "contact_list_memberships",
  groupColumn: "tag_id" | "list_id",
  contactCount: number,
): string {
  return `
    SELECT
      contact_id AS "contactId",
      ${groupColumn} AS "groupId"
    FROM ${relationshipTable}
    WHERE tenant_id = $1
      AND contact_id IN (${relationshipPlaceholders(contactCount)})
    ORDER BY contact_id ASC, ${groupColumn} ASC
  `;
}

function writeRelationshipSql(
  relationshipTable: "contact_tag_assignments" | "contact_list_memberships",
  groupTable: "contact_tags" | "contact_lists",
  groupColumn: "tag_id" | "list_id",
  assigned: boolean,
): string {
  const write = assigned
    ? `
      INSERT INTO ${relationshipTable} (
        tenant_id, contact_id, ${groupColumn}
      )
      SELECT $1, $2, $3
      FROM target
      ON CONFLICT (tenant_id, contact_id, ${groupColumn}) DO NOTHING
      RETURNING 1
    `
    : `
      DELETE FROM ${relationshipTable}
      WHERE tenant_id = $1
        AND contact_id = $2
        AND ${groupColumn} = $3
        AND EXISTS (SELECT 1 FROM target)
      RETURNING 1
    `;

  return `
    WITH target AS MATERIALIZED (
      SELECT 1
      FROM contacts AS contact
      JOIN ${groupTable} AS contact_group
        ON contact_group.tenant_id = contact.tenant_id
      WHERE contact.tenant_id = $1
        AND contact.id = $2
        AND contact_group.id = $3
    ), relationship_write AS (
      ${write}
    )
    SELECT EXISTS (SELECT 1 FROM target) AS found
  `;
}

export const postgresContactOrganizationSql = Object.freeze({
  upsertTag: `
    INSERT INTO contact_tags (
      tenant_id, name, normalized_name
    )
    VALUES ($1, $2, $3)
    ON CONFLICT (tenant_id, normalized_name) DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = CASE
        WHEN contact_tags.name IS DISTINCT FROM EXCLUDED.name
        THEN date_trunc('milliseconds', CURRENT_TIMESTAMP)
        ELSE contact_tags.updated_at
      END
    RETURNING id, name, 0::bigint AS "contactCount"
  `,
  upsertList: `
    INSERT INTO contact_lists (
      tenant_id, name, normalized_name
    )
    VALUES ($1, $2, $3)
    ON CONFLICT (tenant_id, normalized_name) DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = CASE
        WHEN contact_lists.name IS DISTINCT FROM EXCLUDED.name
        THEN date_trunc('milliseconds', CURRENT_TIMESTAMP)
        ELSE contact_lists.updated_at
      END
    RETURNING id, name, 0::bigint AS "contactCount"
  `,
  listTags: `
    SELECT
      tag.id,
      tag.name,
      count(assignment.contact_id) AS "contactCount"
    FROM contact_tags AS tag
    LEFT JOIN contact_tag_assignments AS assignment
      ON assignment.tenant_id = tag.tenant_id
     AND assignment.tag_id = tag.id
    WHERE tag.tenant_id = $1
    GROUP BY tag.id
    ORDER BY tag.normalized_name ASC, tag.id ASC
  `,
  listLists: `
    SELECT
      contact_list.id,
      contact_list.name,
      count(membership.contact_id) AS "contactCount"
    FROM contact_lists AS contact_list
    LEFT JOIN contact_list_memberships AS membership
      ON membership.tenant_id = contact_list.tenant_id
     AND membership.list_id = contact_list.id
    WHERE contact_list.tenant_id = $1
    GROUP BY contact_list.id
    ORDER BY contact_list.normalized_name ASC, contact_list.id ASC
  `,
  listTagAssignments(contactCount: number) {
    return listRelationshipsSql(
      "contact_tag_assignments",
      "tag_id",
      contactCount,
    );
  },
  listListMemberships(contactCount: number) {
    return listRelationshipsSql(
      "contact_list_memberships",
      "list_id",
      contactCount,
    );
  },
  setTagAssignment(assigned: boolean) {
    return writeRelationshipSql(
      "contact_tag_assignments",
      "contact_tags",
      "tag_id",
      assigned,
    );
  },
  setListMembership(assigned: boolean) {
    return writeRelationshipSql(
      "contact_list_memberships",
      "contact_lists",
      "list_id",
      assigned,
    );
  },
});

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return Number(value);
}

function requireGroupName(value: unknown, fieldName: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim()
  ) {
    throw new Error(`${fieldName} must be a non-blank trimmed string`);
  }

  return value;
}

function parseNonnegativeInteger(value: unknown): number {
  const normalized =
    typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)
      ? Number(value)
      : value;

  if (!Number.isSafeInteger(normalized) || Number(normalized) < 0) {
    throw new Error("PostgreSQL returned an invalid contact count");
  }

  return Number(normalized);
}

function parseGroup(value: unknown): Readonly<ContactGroupRecord> {
  const row = requireExactPostgresRow(value, groupRowKeys);

  return Object.freeze({
    id: parsePostgresPositiveInteger(row.id),
    name: requireGroupName(row.name, "group name"),
    contactCount: parseNonnegativeInteger(row.contactCount),
  });
}

function parseGroups(
  result: Awaited<ReturnType<PostgresQueryExecutor["query"]>>,
): readonly Readonly<ContactGroupRecord>[] {
  return Object.freeze(
    requirePostgresRows(result, Number.MAX_SAFE_INTEGER).map(parseGroup),
  );
}

function requireContactIds(values: readonly number[]): readonly number[] {
  if (!Array.isArray(values) || values.length > maximumScopedContacts) {
    throw new Error("contactIds must not exceed 50");
  }

  return Object.freeze(
    values.map((value) => requirePositiveInteger(value, "contactId")),
  );
}

function parseRelationships(
  result: Awaited<ReturnType<PostgresQueryExecutor["query"]>>,
  contactIds: readonly number[],
  groupIds: ReadonlySet<number>,
): readonly Readonly<{ contactId: number; groupId: number }>[] {
  const allowedContacts = new Set(contactIds);
  const relationships = requirePostgresRows(
    result,
    contactIds.length * groupIds.size,
  ).map((value) => {
    const row = requireExactPostgresRow(value, relationshipRowKeys);
    return Object.freeze({
      contactId: parsePostgresPositiveInteger(row.contactId),
      groupId: parsePostgresPositiveInteger(row.groupId),
    });
  });
  const identities = new Set<string>();

  for (let index = 0; index < relationships.length; index += 1) {
    const relationship = relationships[index]!;
    const previous = index === 0 ? null : relationships[index - 1]!;
    const identity = `${relationship.contactId}:${relationship.groupId}`;

    if (
      !allowedContacts.has(relationship.contactId) ||
      !groupIds.has(relationship.groupId) ||
      identities.has(identity) ||
      (previous !== null &&
        (previous.contactId > relationship.contactId ||
          (previous.contactId === relationship.contactId &&
            previous.groupId >= relationship.groupId)))
    ) {
      throw new Error(
        "PostgreSQL returned an invalid contact relationship",
      );
    }

    identities.add(identity);
  }

  return Object.freeze(relationships);
}

function mapTagAssignments(
  relationships: readonly Readonly<{ contactId: number; groupId: number }>[],
): readonly Readonly<ContactTagAssignment>[] {
  return Object.freeze(
    relationships.map(({ contactId, groupId }) =>
      Object.freeze({ contactId, tagId: groupId }),
    ),
  );
}

function mapListMemberships(
  relationships: readonly Readonly<{ contactId: number; groupId: number }>[],
): readonly Readonly<ContactListMembership>[] {
  return Object.freeze(
    relationships.map(({ contactId, groupId }) =>
      Object.freeze({ contactId, listId: groupId }),
    ),
  );
}

export function createPostgresContactOrganizationRepository(
  queries: PostgresQueryExecutor,
): Readonly<ContactOrganizationRepository> {
  if (typeof queries?.query !== "function") {
    throw new Error(
      "PostgreSQL contact organization dependencies are invalid",
    );
  }

  async function saveGroup(
    tenantIdInput: number,
    nameInput: string,
    normalizedNameInput: string,
    sql: string,
  ): Promise<Readonly<ContactGroupRecord>> {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const name = requireGroupName(nameInput, "name");
    const normalizedName = requireGroupName(
      normalizedNameInput,
      "normalizedName",
    );
    const result = await queries.query<Record<string, unknown>>(sql, [
      tenantId,
      name,
      normalizedName,
    ]);
    const rows = requirePostgresRows(result, 1);

    if (rows.length !== 1) {
      throw new Error("PostgreSQL did not return the saved contact group");
    }

    return parseGroup(rows[0]);
  }

  async function setRelationship(
    tenantIdInput: number,
    contactIdInput: number,
    groupIdInput: number,
    assignedInput: boolean,
    sqlFactory: (assigned: boolean) => string,
  ): Promise<void> {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const contactId = requirePositiveInteger(contactIdInput, "contactId");
    const groupId = requirePositiveInteger(groupIdInput, "groupId");

    if (typeof assignedInput !== "boolean") {
      throw new Error("assigned must be a boolean");
    }

    const result = await queries.query<Record<string, unknown>>(
      sqlFactory(assignedInput),
      [tenantId, contactId, groupId],
    );
    const rows = requirePostgresRows(result, 1);

    if (rows.length !== 1) {
      throw new Error("PostgreSQL returned an invalid relationship write");
    }

    const row = requireExactPostgresRow(rows[0], relationshipWriteRowKeys);

    if (typeof row.found !== "boolean") {
      throw new Error("PostgreSQL returned an invalid relationship target");
    }
    if (!row.found) {
      throw new ContactOrganizationTargetNotFoundError();
    }
  }

  return Object.freeze({
    saveTag(
      tenantId: number,
      name: string,
      normalizedName: string,
    ) {
      return saveGroup(
        tenantId,
        name,
        normalizedName,
        postgresContactOrganizationSql.upsertTag,
      );
    },

    saveList(
      tenantId: number,
      name: string,
      normalizedName: string,
    ) {
      return saveGroup(
        tenantId,
        name,
        normalizedName,
        postgresContactOrganizationSql.upsertList,
      );
    },

    async readSnapshot(
      tenantIdInput: number,
      contactIdsInput: readonly number[],
    ): Promise<Readonly<ContactOrganizationSnapshot>> {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const contactIds = requireContactIds(contactIdsInput);
      const [tagResult, listResult] = await Promise.all([
        queries.query<Record<string, unknown>>(
          postgresContactOrganizationSql.listTags,
          [tenantId],
        ),
        queries.query<Record<string, unknown>>(
          postgresContactOrganizationSql.listLists,
          [tenantId],
        ),
      ]);
      const tags = parseGroups(tagResult);
      const lists = parseGroups(listResult);
      let tagAssignments: readonly Readonly<ContactTagAssignment>[] = [];
      let listMemberships: readonly Readonly<ContactListMembership>[] = [];

      if (contactIds.length > 0) {
        const parameters = [tenantId, ...contactIds];
        const [tagAssignmentResult, listMembershipResult] =
          await Promise.all([
            queries.query<Record<string, unknown>>(
              postgresContactOrganizationSql.listTagAssignments(
                contactIds.length,
              ),
              parameters,
            ),
            queries.query<Record<string, unknown>>(
              postgresContactOrganizationSql.listListMemberships(
                contactIds.length,
              ),
              parameters,
            ),
          ]);
        tagAssignments = mapTagAssignments(
          parseRelationships(
            tagAssignmentResult,
            contactIds,
            new Set(tags.map(({ id }) => id)),
          ),
        );
        listMemberships = mapListMemberships(
          parseRelationships(
            listMembershipResult,
            contactIds,
            new Set(lists.map(({ id }) => id)),
          ),
        );
      }

      return Object.freeze({
        scopeContactIds: contactIds,
        tags,
        lists,
        tagAssignments,
        listMemberships,
      });
    },

    setTagAssignment(
      tenantId: number,
      contactId: number,
      tagId: number,
      assigned: boolean,
    ) {
      return setRelationship(
        tenantId,
        contactId,
        tagId,
        assigned,
        postgresContactOrganizationSql.setTagAssignment,
      );
    },

    setListMembership(
      tenantId: number,
      contactId: number,
      listId: number,
      assigned: boolean,
    ) {
      return setRelationship(
        tenantId,
        contactId,
        listId,
        assigned,
        postgresContactOrganizationSql.setListMembership,
      );
    },
  });
}
