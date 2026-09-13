// Explicitly authorized local demo identities; never provider accounts or consent evidence.
export const contactDemoAccounts = {
  owner: { id: 'user_demo_contact_owner', tenantId: 43001, role: 'owner', email: 'contacts-owner@connect-demo.invalid' },
  viewer: { id: 'user_demo_contact_viewer', tenantId: 43001, role: 'viewer', email: 'contacts-viewer@connect-demo.invalid' },
};
export const contactDemoAt = '2026-09-13T10:00:00.000Z';
export const contactDemoRows = [1, 2].map(index => ({
  id: 43000 + index, phoneNumber: `+1202555012${index}`, firstName: `Demo Contact ${index}`,
  lastName: '', email: `contact-${index}@connect-demo.invalid`, company: 'Local demo', version: 1,
  mailingStatus: 'unsubscribed', consentStatus: 'unknown', consentSource: null,
  consentRecordedAt: null, consentWithdrawnAt: null,
}));
export function createContactManagementDemo(role = 'owner') {
  const state = { account: contactDemoAccounts[role], contacts: structuredClone(contactDemoRows),
    organization: { revision: 1, scopeContactIds: [43001, 43002], tags: [], lists: [], tagAssignments: [], listMemberships: [] },
    calls: [], pending: null, failure: null };
  let resolveAction;
  function snapshot() { return structuredClone(state.organization); }
  function complete(name, args) {
    if (name !== 'loadMoreContactsAction' && role !== 'owner') return { status: 'permission-denied' };
    if (state.failure) { const status = state.failure; state.failure = null; return { status }; }
    if (name === 'loadMoreContactsAction') return { status: 'loaded', contacts: structuredClone(state.contacts), nextCursor: null, organization: snapshot() };
    if (name === 'saveContactAction') {
      const input = args[0];
      const existing = state.contacts.find(row => row.phoneNumber === input.phoneNumber);
      const row = { ...(existing ?? { ...contactDemoRows[0], id: 43003 }), ...input,
        version: existing ? existing.version + 1 : 1 };
      delete row.submissionOccurredAt;
      state.contacts = existing ? state.contacts.map(item => item.id === row.id ? row : item) : [...state.contacts, row];
      state.organization.scopeContactIds = state.contacts.map(item => item.id);
      return { status: 'saved', contact: structuredClone(row) };
    }
    if (name === 'grantContactConsentAction' || name === 'unsubscribeContactAction') {
      const [id, transition] = args;
      const row = state.contacts.find(item => item.id === id);
      if (!row) throw Error('Unknown demo contact');
      const granted = name === 'grantContactConsentAction';
      Object.assign(row, { version: row.version + 1, mailingStatus: granted ? 'subscribed' : 'unsubscribed',
        consentStatus: granted ? 'granted' : 'withdrawn', consentSource: transition.source,
        ...(granted ? { consentRecordedAt: transition.occurredAt } : { consentWithdrawnAt: transition.occurredAt }) });
      return { status: 'saved', contact: structuredClone(row) };
    }
    const o = state.organization;
    if (name === 'createContactTagAction' || name === 'createContactListAction') {
      const kind = name === 'createContactTagAction' ? 'tags' : 'lists';
      o[kind].push({ id: kind === 'tags' ? 43011 : 43012, name: args[0], contactCount: 0 });
    } else if (name === 'setContactTagAssignmentAction' || name === 'setContactListMembershipAction') {
      const input = args[0];
      if (input.expectedRevision !== o.revision) return { status: 'conflict' };
      const tag = name === 'setContactTagAssignmentAction';
      const key = tag ? 'tagId' : 'listId';
      const field = tag ? 'tagAssignments' : 'listMemberships';
      o[field] = o[field].filter(item => item.contactId !== input.contactId || item[key] !== input.groupId);
      if (input.assigned) o[field].push({ contactId: input.contactId, [key]: input.groupId });
      o[tag ? 'tags' : 'lists'].find(item => item.id === input.groupId).contactCount = o[field].filter(item => item[key] === input.groupId).length;
    } else throw Error('Unexpected contact demo action: ' + name);
    o.revision += 1;
    return { status: 'saved', organization: snapshot() };
  }
  return { state, snapshot,
    action(name, ...args) {
      if (state.pending) throw Error('Duplicate pending demo action');
      state.calls.push({ name, args: structuredClone(args), actor: state.account.id });
      state.pending = name;
      return new Promise(resolve => { resolveAction = () => {
        const result = complete(name, args); state.pending = null; resolveAction = null; resolve(result);
      }; });
    },
    release() { if (!resolveAction) throw Error('No pending demo action'); resolveAction(); },
  };
}
