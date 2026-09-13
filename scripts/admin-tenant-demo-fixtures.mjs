import { matchesSystemAdminTenantDirectoryFilters } from '../shared/domain/systemAdminTenantDirectory.ts';

// Local, explicitly authorized demo identities; no real admin or paid account.
export const adminTenantDemoAccount = { id: 'user_demo_admin_tenants', email: 'admin-tenants@example.com', role: 'system-admin-fixture' };
export const adminTenantDemoId = 44001;
export const adminTenantDemoAt = '2026-09-13T09:00:00.000Z';
export function createAdminTenantDemo() {
  const state = {
    calls: [], pending: null, failure: null,
    tenant: { tenantId: adminTenantDemoId, displayName: 'Demo admin business', tenantStatus: 'active', subscription: null,
      businessProfile: { businessName: 'Demo admin business', timezone: 'Asia/Jerusalem', interfaceLanguage: 'he', version: 2,
        createdAt: '2026-09-01T00:00:00.000Z', updatedAt: adminTenantDemoAt } },
  };
  let release;
  const directory = () => ({ tenants: [structuredClone(state.tenant)], nextCursor: null });
  const keysAre = (value, keys) => Object.keys(value).sort().join(',') === [...keys].sort().join(',');
  function complete(name, input) {
    if (state.failure) { const status = state.failure; state.failure = null; return { status }; }
    if (name === 'loadSystemAdminTenantDirectoryAction') return { status: 'loaded', directory: { tenants:
      matchesSystemAdminTenantDirectoryFilters(state.tenant, input) ? [structuredClone(state.tenant)] : [], nextCursor: null } };
    if (input.tenantId !== adminTenantDemoId) return { status: 'not-found' };
    if (name === 'updateBusinessProfileAdminAction') {
      if (!keysAre(input, ['tenantId', 'expectedVersion', 'businessName', 'timezone', 'interfaceLanguage'])) return { status: 'invalid-input' };
      const profile = state.tenant.businessProfile;
      if (input.expectedVersion !== profile.version) return { status: 'conflict' };
      if (!input.businessName.trim() || !['he', 'en', 'ar'].includes(input.interfaceLanguage)) return { status: 'invalid-input' };
      state.tenant.businessProfile = { ...profile, businessName: input.businessName, timezone: input.timezone,
        interfaceLanguage: input.interfaceLanguage, version: profile.version + 1, updatedAt: adminTenantDemoAt };
      state.tenant.displayName = input.businessName;
      return { status: 'saved', outcome: 'updated', profile: structuredClone(state.tenant.businessProfile) };
    }
    if (name === 'createTenantSubscriptionAdminAction') {
      if (!keysAre(input, ['tenantId', 'status', 'startsAt', 'endsAt']) || !['active', 'trial'].includes(input.status) || !(input.startsAt < input.endsAt)) return { status: 'invalid-input' };
      if (state.tenant.subscription) return { status: 'conflict' };
      state.tenant.subscription = { status: input.status, startsAt: input.startsAt, endsAt: input.endsAt, cancelledAt: null,
        version: 1, createdAt: adminTenantDemoAt, updatedAt: adminTenantDemoAt };
    } else {
      const subscription = state.tenant.subscription;
      if (!subscription) return { status: 'not-found' };
      if (input.expectedVersion !== subscription.version) return { status: 'conflict' };
      if (subscription.status === 'cancelled') return { status: 'invalid-transition' };
      if (name === 'extendTenantSubscriptionAdminAction') {
        if (!keysAre(input, ['tenantId', 'expectedVersion', 'newEndsAt']) || !(input.newEndsAt > subscription.endsAt)) return { status: 'invalid-input' };
        subscription.endsAt = input.newEndsAt;
      } else if (name === 'changeTenantSubscriptionStatusAdminAction') {
        if (!keysAre(input, ['tenantId', 'expectedVersion', 'status']) || !['active', 'suspended', 'blocked'].includes(input.status)) return { status: 'invalid-input' };
        subscription.status = input.status;
      } else if (name === 'cancelTenantSubscriptionAdminAction') {
        if (!keysAre(input, ['tenantId', 'expectedVersion'])) return { status: 'invalid-input' };
        subscription.status = 'cancelled'; subscription.cancelledAt = adminTenantDemoAt;
      } else throw new Error('Unexpected local admin action: ' + name);
      subscription.version += 1; subscription.updatedAt = adminTenantDemoAt;
    }
    state.tenant.tenantStatus = state.tenant.subscription.status;
    return { status: 'saved', outcome: name === 'createTenantSubscriptionAdminAction' ? 'created' : 'updated', subscription: structuredClone(state.tenant.subscription) };
  }
  return { state, directory,
    action(name, input) {
      if (state.pending) throw new Error('Concurrent admin demo mutation');
      state.calls.push({ name, input: structuredClone(input), actor: adminTenantDemoAccount.id }); state.pending = name;
      return new Promise(resolve => { release = () => { const result = complete(name, input); state.pending = null; release = undefined; resolve(result); }; });
    },
    release() { if (!release) throw new Error('No admin action pending'); release(); },
  };
}
