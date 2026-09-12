import assert from "node:assert/strict";
import test from "node:test";
import { mergeContactOrganization, readContactOrganizationRevision } from "../features/contacts/contactOrganizationState.ts";

const snapshot = (revision, scopeContactIds, overrides = {}) => ({
  revision, scopeContactIds,
  tags: [{ id: 5, name: "Priority", contactCount: 0 }],
  lists: [{ id: 8, name: "Pilot", contactCount: 0 }],
  tagAssignments: [], listMemberships: [], ...overrides,
});

test("group-only responses never advance cached relationship revisions", () => {
  const current = snapshot(11, [23, 24]);
  const merged = mergeContactOrganization(current, snapshot(14, [], {
    tags: [{ id: 5, name: "Priority", contactCount: 1 }],
  }));
  assert.equal(merged.revision, 14);
  assert.equal(readContactOrganizationRevision(merged, 23), 11);
  assert.equal(readContactOrganizationRevision(merged, 24), 11);
});

test("one-contact refreshes never authorize another contact's stale assignments", () => {
  const current = snapshot(11, [23, 24]);
  const merged = mergeContactOrganization(current, snapshot(14, [23], {
    tagAssignments: [{ contactId: 23, tagId: 5 }],
  }));
  assert.equal(readContactOrganizationRevision(merged, 23), 14);
  assert.equal(readContactOrganizationRevision(merged, 24), 11);
  assert.deepEqual(merged.tagAssignments, [{ contactId: 23, tagId: 5 }]);
});

test("repeated mutations keep advancing only the selected contact", () => {
  let state = snapshot(11, [23, 24]);
  for (const revision of [12, 13, 14]) {
    state = mergeContactOrganization(state, snapshot(revision, [23], {
      tagAssignments: revision === 13 ? [] : [{ contactId: 23, tagId: 5 }],
    }));
    assert.equal(readContactOrganizationRevision(state, 23), revision);
    assert.equal(readContactOrganizationRevision(state, 24), 11);
  }
});

test("late responses cannot overwrite newer group counts or contact state", () => {
  const current = snapshot(14, [23], {
    tags: [{ id: 5, name: "Priority", contactCount: 1 }],
    tagAssignments: [{ contactId: 23, tagId: 5 }],
  });
  const merged = mergeContactOrganization(current, snapshot(12, [23, 24]));
  assert.equal(merged.revision, 14);
  assert.equal(merged.tags[0].contactCount, 1);
  assert.deepEqual(merged.tagAssignments, current.tagAssignments);
  assert.equal(readContactOrganizationRevision(merged, 23), 14);
  assert.equal(readContactOrganizationRevision(merged, 24), 12);
});

test("a full refresh restores a common revision without mutating the previous state", () => {
  const current = snapshot(11, [23, 24]);
  const partial = mergeContactOrganization(current, snapshot(14, []));
  const refreshed = mergeContactOrganization(partial, snapshot(15, [23, 24], {
    listMemberships: [{ contactId: 24, listId: 8 }],
  }));
  assert.equal(readContactOrganizationRevision(refreshed, 23), 15);
  assert.equal(readContactOrganizationRevision(refreshed, 24), 15);
  assert.equal(readContactOrganizationRevision(partial, 24), 11);
  assert.equal(current.revision, 11);
  assert.deepEqual(refreshed.listMemberships, [{ contactId: 24, listId: 8 }]);
});

test("newly displayed contacts and versionless scopes have no mutation revision", () => {
  const current = snapshot(11, [23]);
  assert.equal(readContactOrganizationRevision(current, 24), undefined);
  const merged = mergeContactOrganization(current, snapshot(undefined, [23]));
  assert.equal(readContactOrganizationRevision(merged, 23), undefined);
  assert.equal(merged.revision, 11);
});
