export interface ContactGroupRecord {
  id: number;
  name: string;
  contactCount: number;
}

export interface ContactTagAssignment {
  contactId: number;
  tagId: number;
}

export interface ContactListMembership {
  contactId: number;
  listId: number;
}

export interface ContactOrganizationSnapshot {
  scopeContactIds: readonly number[];
  tags: readonly ContactGroupRecord[];
  lists: readonly ContactGroupRecord[];
  tagAssignments: readonly ContactTagAssignment[];
  listMemberships: readonly ContactListMembership[];
}

export const emptyContactOrganizationSnapshot: ContactOrganizationSnapshot = {
  scopeContactIds: [],
  tags: [],
  lists: [],
  tagAssignments: [],
  listMemberships: [],
};
