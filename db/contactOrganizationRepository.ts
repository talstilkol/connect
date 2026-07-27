import type {
  ContactGroupRecord,
  ContactListMembership,
  ContactOrganizationSnapshot,
  ContactTagAssignment,
} from "../shared/domain/contactOrganization";
import type { D1DatabaseBinding } from "./d1";

const UPSERT_TAG_SQL = `
  INSERT INTO contact_tags (tenant_id, name, normalized_name)
  VALUES (?1, ?2, ?3)
  ON CONFLICT (tenant_id, normalized_name) DO UPDATE SET
    name = excluded.name,
    updated_at = CURRENT_TIMESTAMP
  WHERE contact_tags.name IS NOT excluded.name
`;

const UPSERT_LIST_SQL = `
  INSERT INTO contact_lists (tenant_id, name, normalized_name)
  VALUES (?1, ?2, ?3)
  ON CONFLICT (tenant_id, normalized_name) DO UPDATE SET
    name = excluded.name,
    updated_at = CURRENT_TIMESTAMP
  WHERE contact_lists.name IS NOT excluded.name
`;

const SELECT_TAG_BY_NAME_SQL = `
  SELECT
    id,
    name,
    0 AS contactCount
  FROM contact_tags
  WHERE tenant_id = ?1
    AND normalized_name = ?2
  LIMIT 1
`;

const SELECT_LIST_BY_NAME_SQL = `
  SELECT
    id,
    name,
    0 AS contactCount
  FROM contact_lists
  WHERE tenant_id = ?1
    AND normalized_name = ?2
  LIMIT 1
`;

const LIST_TAGS_SQL = `
  SELECT
    tags.id,
    tags.name,
    count(assignments.contact_id) AS contactCount
  FROM contact_tags AS tags
  LEFT JOIN contact_tag_assignments AS assignments
    ON assignments.tenant_id = tags.tenant_id
    AND assignments.tag_id = tags.id
  WHERE tags.tenant_id = ?1
  GROUP BY tags.id, tags.name, tags.normalized_name
  ORDER BY tags.normalized_name ASC, tags.id ASC
`;

const LIST_LISTS_SQL = `
  SELECT
    lists.id,
    lists.name,
    count(memberships.contact_id) AS contactCount
  FROM contact_lists AS lists
  LEFT JOIN contact_list_memberships AS memberships
    ON memberships.tenant_id = lists.tenant_id
    AND memberships.list_id = lists.id
  WHERE lists.tenant_id = ?1
  GROUP BY lists.id, lists.name, lists.normalized_name
  ORDER BY lists.normalized_name ASC, lists.id ASC
`;

const SELECT_TAG_TARGET_SQL = `
  SELECT 1 AS found
  FROM contacts AS contacts
  INNER JOIN contact_tags AS tags
    ON tags.tenant_id = contacts.tenant_id
  WHERE contacts.tenant_id = ?1
    AND contacts.id = ?2
    AND tags.id = ?3
  LIMIT 1
`;

const SELECT_LIST_TARGET_SQL = `
  SELECT 1 AS found
  FROM contacts AS contacts
  INNER JOIN contact_lists AS lists
    ON lists.tenant_id = contacts.tenant_id
  WHERE contacts.tenant_id = ?1
    AND contacts.id = ?2
    AND lists.id = ?3
  LIMIT 1
`;

const INSERT_TAG_ASSIGNMENT_SQL = `
  INSERT INTO contact_tag_assignments (
    tenant_id,
    contact_id,
    tag_id
  )
  VALUES (?1, ?2, ?3)
  ON CONFLICT (contact_id, tag_id) DO NOTHING
`;

const DELETE_TAG_ASSIGNMENT_SQL = `
  DELETE FROM contact_tag_assignments
  WHERE tenant_id = ?1
    AND contact_id = ?2
    AND tag_id = ?3
`;

const INSERT_LIST_MEMBERSHIP_SQL = `
  INSERT INTO contact_list_memberships (
    tenant_id,
    contact_id,
    list_id
  )
  VALUES (?1, ?2, ?3)
  ON CONFLICT (contact_id, list_id) DO NOTHING
`;

const DELETE_LIST_MEMBERSHIP_SQL = `
  DELETE FROM contact_list_memberships
  WHERE tenant_id = ?1
    AND contact_id = ?2
    AND list_id = ?3
`;

interface GroupRow {
  id: number;
  name: string;
  contactCount: number;
}

interface TagAssignmentRow {
  contactId: number;
  tagId: number;
}

interface ListMembershipRow {
  contactId: number;
  listId: number;
}

export class ContactOrganizationTargetNotFoundError extends Error {
  constructor() {
    super("Contact organization target was not found in the tenant");
    this.name = "ContactOrganizationTargetNotFoundError";
  }
}

export interface ContactOrganizationRepository {
  saveTag(
    tenantId: number,
    name: string,
    normalizedName: string,
  ): Promise<ContactGroupRecord>;
  saveList(
    tenantId: number,
    name: string,
    normalizedName: string,
  ): Promise<ContactGroupRecord>;
  readSnapshot(
    tenantId: number,
    contactIds: readonly number[],
  ): Promise<ContactOrganizationSnapshot>;
  setTagAssignment(
    tenantId: number,
    contactId: number,
    tagId: number,
    assigned: boolean,
  ): Promise<void>;
  setListMembership(
    tenantId: number,
    contactId: number,
    listId: number,
    assigned: boolean,
  ): Promise<void>;
}

function assertPositiveInteger(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

function parseGroupRow(row: GroupRow): ContactGroupRecord {
  if (
    !Number.isSafeInteger(row.id) ||
    row.id <= 0 ||
    typeof row.name !== "string" ||
    !row.name.trim() ||
    !Number.isSafeInteger(row.contactCount) ||
    row.contactCount < 0
  ) {
    throw new Error("D1 returned an invalid contact group");
  }

  return row;
}

function placeholders(values: readonly number[]): string {
  return values.map((_, index) => `?${index + 2}`).join(", ");
}

function listTagAssignmentsSql(contactIds: readonly number[]): string {
  return `
    SELECT
      contact_id AS contactId,
      tag_id AS tagId
    FROM contact_tag_assignments
    WHERE tenant_id = ?1
      AND contact_id IN (${placeholders(contactIds)})
    ORDER BY contact_id ASC, tag_id ASC
  `;
}

function listMembershipsSql(contactIds: readonly number[]): string {
  return `
    SELECT
      contact_id AS contactId,
      list_id AS listId
    FROM contact_list_memberships
    WHERE tenant_id = ?1
      AND contact_id IN (${placeholders(contactIds)})
    ORDER BY contact_id ASC, list_id ASC
  `;
}

function assertWriteSucceeded(
  result: { success: boolean; error?: string },
  fallback: string,
): void {
  if (!result.success) {
    throw new Error(result.error ?? fallback);
  }
}

export function createContactOrganizationRepository(
  database: D1DatabaseBinding,
): ContactOrganizationRepository {
  async function saveGroup(
    tenantId: number,
    name: string,
    normalizedName: string,
    upsertSql: string,
    selectSql: string,
  ): Promise<ContactGroupRecord> {
    assertPositiveInteger(tenantId, "tenantId");
    const result = await database
      .prepare(upsertSql)
      .bind(tenantId, name, normalizedName)
      .run();
    assertWriteSucceeded(result, "D1 contact group write failed");

    const group = await database
      .prepare(selectSql)
      .bind(tenantId, normalizedName)
      .first<GroupRow>();

    if (!group) {
      throw new Error("D1 did not return the saved contact group");
    }

    return parseGroupRow(group);
  }

  async function assertTarget(
    tenantId: number,
    contactId: number,
    groupId: number,
    sql: string,
  ): Promise<void> {
    const target = await database
      .prepare(sql)
      .bind(tenantId, contactId, groupId)
      .first<{ found: number }>();

    if (!target) {
      throw new ContactOrganizationTargetNotFoundError();
    }
  }

  async function setRelationship(
    tenantId: number,
    contactId: number,
    groupId: number,
    assigned: boolean,
    targetSql: string,
    insertSql: string,
    deleteSql: string,
  ): Promise<void> {
    assertPositiveInteger(tenantId, "tenantId");
    assertPositiveInteger(contactId, "contactId");
    assertPositiveInteger(groupId, "groupId");
    await assertTarget(tenantId, contactId, groupId, targetSql);

    const result = await database
      .prepare(assigned ? insertSql : deleteSql)
      .bind(tenantId, contactId, groupId)
      .run();
    assertWriteSucceeded(result, "D1 contact relationship write failed");
  }

  return {
    saveTag(tenantId, name, normalizedName) {
      return saveGroup(
        tenantId,
        name,
        normalizedName,
        UPSERT_TAG_SQL,
        SELECT_TAG_BY_NAME_SQL,
      );
    },

    saveList(tenantId, name, normalizedName) {
      return saveGroup(
        tenantId,
        name,
        normalizedName,
        UPSERT_LIST_SQL,
        SELECT_LIST_BY_NAME_SQL,
      );
    },

    async readSnapshot(tenantId, contactIds) {
      assertPositiveInteger(tenantId, "tenantId");

      if (contactIds.length > 50) {
        throw new Error("contactIds must not exceed 50");
      }

      for (const contactId of contactIds) {
        assertPositiveInteger(contactId, "contactId");
      }

      const tagsResult = await database
        .prepare(LIST_TAGS_SQL)
        .bind(tenantId)
        .all<GroupRow>();
      const listsResult = await database
        .prepare(LIST_LISTS_SQL)
        .bind(tenantId)
        .all<GroupRow>();

      if (!tagsResult.success || !listsResult.success) {
        throw new Error(
          tagsResult.error ??
            listsResult.error ??
            "D1 contact organization read failed",
        );
      }

      let tagAssignments: readonly ContactTagAssignment[] = [];
      let listMemberships: readonly ContactListMembership[] = [];

      if (contactIds.length > 0) {
        const values = [tenantId, ...contactIds];
        const tagResult = await database
          .prepare(listTagAssignmentsSql(contactIds))
          .bind(...values)
          .all<TagAssignmentRow>();
        const listResult = await database
          .prepare(listMembershipsSql(contactIds))
          .bind(...values)
          .all<ListMembershipRow>();

        if (!tagResult.success || !listResult.success) {
          throw new Error(
            tagResult.error ??
              listResult.error ??
              "D1 contact relationships read failed",
          );
        }

        tagAssignments = tagResult.results ?? [];
        listMemberships = listResult.results ?? [];
      }

      return {
        scopeContactIds: contactIds,
        tags: (tagsResult.results ?? []).map(parseGroupRow),
        lists: (listsResult.results ?? []).map(parseGroupRow),
        tagAssignments,
        listMemberships,
      };
    },

    setTagAssignment(tenantId, contactId, tagId, assigned) {
      return setRelationship(
        tenantId,
        contactId,
        tagId,
        assigned,
        SELECT_TAG_TARGET_SQL,
        INSERT_TAG_ASSIGNMENT_SQL,
        DELETE_TAG_ASSIGNMENT_SQL,
      );
    },

    setListMembership(tenantId, contactId, listId, assigned) {
      return setRelationship(
        tenantId,
        contactId,
        listId,
        assigned,
        SELECT_LIST_TARGET_SQL,
        INSERT_LIST_MEMBERSHIP_SQL,
        DELETE_LIST_MEMBERSHIP_SQL,
      );
    },
  };
}
