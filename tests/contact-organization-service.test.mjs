import assert from "node:assert/strict";
import test from "node:test";

import {
  ContactOrganizationInputError,
  createContactOrganizationService,
} from "../server/contacts/contactOrganizationService.ts";

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function fixture() {
  const state = {
    tags: [],
    lists: [],
    tagAssignments: [],
    listMemberships: [],
    reads: [],
  };
  const snapshot = (contactIds) => ({
    scopeContactIds: contactIds,
    tags: [],
    lists: [],
    tagAssignments: [],
    listMemberships: [],
  });
  const repository = {
    async saveTag(tenantId, name, normalizedName) {
      state.tags.push({ tenantId, name, normalizedName });
      return { id: 11, name, contactCount: 0 };
    },
    async saveList(tenantId, name, normalizedName) {
      state.lists.push({ tenantId, name, normalizedName });
      return { id: 12, name, contactCount: 0 };
    },
    async readSnapshot(tenantId, contactIds) {
      state.reads.push({ tenantId, contactIds });
      return snapshot(contactIds);
    },
    async setTagAssignment(
      tenantId,
      contactId,
      tagId,
      assigned,
    ) {
      state.tagAssignments.push({
        tenantId,
        contactId,
        tagId,
        assigned,
      });
    },
    async setListMembership(
      tenantId,
      contactId,
      listId,
      assigned,
    ) {
      state.listMemberships.push({
        tenantId,
        contactId,
        listId,
        assigned,
      });
    },
  };

  return {
    state,
    service: createContactOrganizationService(repository),
  };
}

test("normalizes tag names and derives tenant scope from the session", async () => {
  const testFixture = fixture();

  await testFixture.service.createTag(session(), "  TAG Name  ");

  assert.deepEqual(testFixture.state.tags, [
    {
      tenantId: 7,
      name: "TAG Name",
      normalizedName: "tag name",
    },
  ]);
  assert.deepEqual(testFixture.state.reads, [
    {
      tenantId: 7,
      contactIds: [],
    },
  ]);
});

test("assigns tags and lists without accepting tenant scope from input", async () => {
  const testFixture = fixture();

  await testFixture.service.setTagAssignment(session(), {
    contactId: 23,
    groupId: 11,
    assigned: true,
  });
  await testFixture.service.setListMembership(session(), {
    contactId: 23,
    groupId: 12,
    assigned: false,
  });

  assert.deepEqual(testFixture.state.tagAssignments, [
    {
      tenantId: 7,
      contactId: 23,
      tagId: 11,
      assigned: true,
    },
  ]);
  assert.deepEqual(testFixture.state.listMemberships, [
    {
      tenantId: 7,
      contactId: 23,
      listId: 12,
      assigned: false,
    },
  ]);
});

test("deduplicates bounded contact IDs for snapshot reads", async () => {
  const testFixture = fixture();

  await testFixture.service.read(session("agent"), [23, 23, 24]);

  assert.deepEqual(testFixture.state.reads[0], {
    tenantId: 7,
    contactIds: [23, 24],
  });
});

test("rejects invalid input and viewer writes before repository access", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.createList(session(), " "),
    (error) =>
      error instanceof ContactOrganizationInputError &&
      error.issue === "invalid-name",
  );
  await assert.rejects(
    testFixture.service.setTagAssignment(session(), {
      contactId: 0,
      groupId: 11,
      assigned: true,
    }),
    (error) =>
      error instanceof ContactOrganizationInputError &&
      error.issue === "invalid-assignment",
  );
  await assert.rejects(
    testFixture.service.createTag(session("viewer"), "tag-name"),
    (error) => error.code === "PERMISSION_DENIED",
  );

  assert.deepEqual(testFixture.state.tags, []);
  assert.deepEqual(testFixture.state.lists, []);
  assert.deepEqual(testFixture.state.tagAssignments, []);
});

test("rejects oversized, control-character, and extended organization input", async () => {
  const testFixture = fixture();

  for (const name of ["A".repeat(129), "Priority\u0000Hidden"]) {
    await assert.rejects(
      testFixture.service.createTag(session(), name),
      (error) =>
        error instanceof ContactOrganizationInputError &&
        error.issue === "invalid-name",
    );
  }
  await assert.rejects(
    testFixture.service.setListMembership(session(), {
      contactId: 23,
      groupId: 12,
      assigned: true,
      tenantId: 7,
    }),
    (error) =>
      error instanceof ContactOrganizationInputError &&
      error.issue === "invalid-assignment",
  );

  assert.deepEqual(testFixture.state.tags, []);
  assert.deepEqual(testFixture.state.listMemberships, []);
});
