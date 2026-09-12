import type { ContactOrganizationSnapshot } from "../../shared/domain/contactOrganization.ts";

export interface ContactOrganizationState extends ContactOrganizationSnapshot {
  readonly relationshipRevisions: Readonly<Partial<Record<number, number>>>;
}

export function createContactOrganizationState(
  snapshot: ContactOrganizationSnapshot,
): ContactOrganizationState {
  return {
    ...snapshot,
    relationshipRevisions: Object.freeze(Object.fromEntries(
      snapshot.revision === undefined ? [] : snapshot.scopeContactIds.map(
        (contactId) => [contactId, snapshot.revision],
      ),
    )),
  };
}

export function readContactOrganizationRevision(
  organization: ContactOrganizationSnapshot | ContactOrganizationState,
  contactId: number,
): number | undefined {
  return "relationshipRevisions" in organization
    ? organization.relationshipRevisions[contactId]
    : organization.scopeContactIds.includes(contactId)
      ? organization.revision
      : undefined;
}

export function mergeContactOrganization(
  current: ContactOrganizationSnapshot | ContactOrganizationState,
  incoming: ContactOrganizationSnapshot,
): ContactOrganizationState {
  const state = "relationshipRevisions" in current
    ? current
    : createContactOrganizationState(current);
  // A revision belongs to the relationships actually read in that snapshot.
  // Fresh group counts or another contact's response cannot refresh this scope.
  const refreshedContactIds = new Set(incoming.scopeContactIds.filter((contactId) => {
    const knownRevision = state.relationshipRevisions[contactId];
    return incoming.revision === undefined || knownRevision === undefined ||
      incoming.revision >= knownRevision;
  }));
  const relationshipRevisions = { ...state.relationshipRevisions };
  for (const contactId of refreshedContactIds) {
    if (incoming.revision === undefined) delete relationshipRevisions[contactId];
    else relationshipRevisions[contactId] = incoming.revision;
  }
  const groups = current.revision === undefined ||
    (incoming.revision !== undefined && incoming.revision >= current.revision)
    ? incoming : current;

  return {
    ...(groups.revision === undefined ? {} : { revision: groups.revision }),
    relationshipRevisions: Object.freeze(relationshipRevisions),
    scopeContactIds: [...new Set([...current.scopeContactIds, ...incoming.scopeContactIds])],
    tags: groups.tags,
    lists: groups.lists,
    tagAssignments: [
      ...current.tagAssignments.filter((item) => !refreshedContactIds.has(item.contactId)),
      ...incoming.tagAssignments.filter((item) => refreshedContactIds.has(item.contactId)),
    ],
    listMemberships: [
      ...current.listMemberships.filter((item) => !refreshedContactIds.has(item.contactId)),
      ...incoming.listMemberships.filter((item) => refreshedContactIds.has(item.contactId)),
    ],
  };
}
