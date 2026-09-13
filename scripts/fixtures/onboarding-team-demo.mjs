import assert from "node:assert/strict";

// User-authorized deterministic demo actors. These are not Clerk accounts,
// authentication tokens or provider credentials. Persistence is process memory.
export const demoOrganizationId = "org_demo_onboarding_team";
export const demoTenantId = 7201;
export const demoActors = Object.freeze({
  founder: { id: "demo-onboarding-founder", email: "founder@connect-demo.invalid", memberKey: "demo-founder-member", displayName: "Demo Founder" },
  invitee: { id: "demo-onboarding-invitee", email: "invitee@connect-demo.invalid", memberKey: "demo-invitee-member", displayName: "Demo Invitee" },
});

export function createOnboardingTeamDemo() {
  const state = { profile: null, members: [], invitation: null, calls: [], results: [] };
  let pending = null;
  const waiters = new Set();
  const memberFor = actorKey => state.members.find(member => member.memberKey === demoActors[actorKey]?.memberKey);
  function actorFor(actorKey) {
    assert.ok(Object.hasOwn(demoActors, actorKey), "Unknown demo actor");
    return { id: demoActors[actorKey].id, tenantId: state.profile ? demoTenantId : null, role: memberFor(actorKey)?.role ?? null };
  }
  function member(actorKey, role) {
    const actor = demoActors[actorKey];
    return { memberKey: actor.memberKey, referenceCode: actor.memberKey, displayName: actor.displayName, primaryEmail: actor.email, role, status: "active", version: 1 };
  }
  function complete(operation, input, actorKey) {
    if (operation === "profile.save") {
      if (actorKey !== "founder") return { status: "permission-denied" };
      if (input.expectedOrganizationId !== demoOrganizationId || input.expectedVersion !== (state.profile?.version ?? 0)) return { status: "conflict" };
      const createdTenant = state.profile === null;
      state.profile = { businessName: input.businessName, timezone: input.timezone, interfaceLanguage: input.interfaceLanguage, version: input.expectedVersion + 1 };
      if (createdTenant) state.members.push(member("founder", "owner"));
      return { status: "saved", createdTenant, profile: state.profile };
    }
    if (operation === "invitation.accept") {
      if (!state.invitation || state.invitation.status === "expired") return { status: "invitation-unavailable" };
      if (demoActors[actorKey].email !== state.invitation.email) return { status: "identity-verification-required" };
      if (state.invitation.status === "accepted") return { status: "already-accepted" };
      state.members.push(member(actorKey, state.invitation.role));
      state.invitation.status = "accepted";
      return { status: "accepted" };
    }
    const actor = memberFor(actorKey);
    if (actor?.role !== "owner" || actor.status !== "active") return { status: "permission-denied" };
    if (operation === "invitation.request") {
      assert.equal(input.email, demoActors.invitee.email);
      if (state.invitation?.status === "queued") return { status: "already-pending" };
      state.invitation = { email: input.email, role: input.role, status: "queued" };
      return { status: "queued" };
    }
    if (operation === "member.role" || operation === "member.status") {
      const target = state.members.find(item => item.memberKey === input.memberKey);
      if (!target || target.currentUser || target.role === "owner") return { status: "invalid-input" };
      if (target.version !== input.expectedVersion) return { status: "conflict" };
      if (operation === "member.role") target.role = input.role;
      else target.status = input.status;
      target.version++;
      return { status: "saved", outcome: "updated", membership: { memberKey: target.memberKey, role: target.role, status: target.status, version: target.version } };
    }
    throw new Error(`Unexpected demo operation: ${operation}`);
  }
  return {
    state,
    view(actorKey) {
      return structuredClone({ actor: actorFor(actorKey), profile: state.profile, organizationId: demoOrganizationId,
        directory: { identityStatus: "ready", members: state.members.map(item => ({ ...item, currentUser: item.memberKey === demoActors[actorKey].memberKey })) } });
    },
    request(operation, input, actorKey) {
      assert.equal(pending, null, "Unexpected concurrent demo action");
      const call = { operation, input: structuredClone(input), actor: actorFor(actorKey) };
      state.calls.push(call);
      return new Promise(resolve => {
        pending = { operation, input, actorKey, resolve, call };
        for (const waiter of waiters) { clearTimeout(waiter.timer); waiter.resolve(structuredClone(call)); }
        waiters.clear();
      });
    },
    waitForPending() {
      if (pending) return Promise.resolve(structuredClone(pending.call));
      return new Promise((resolve, reject) => {
        const waiter = { resolve, timer: setTimeout(() => { waiters.delete(waiter); reject(new Error("Demo action was not received within 15 seconds")); }, 15_000) };
        waiters.add(waiter);
      });
    },
    release(failure) {
      assert.ok(pending, "No pending demo action");
      const current = pending;
      const result = failure ? { status: failure } : complete(current.operation, current.input, current.actorKey);
      state.results.push({ operation: current.operation, result: structuredClone(result) });
      pending = null;
      current.resolve(structuredClone(result));
    },
    close() {
      if (pending) this.release("server-error");
      for (const waiter of waiters) clearTimeout(waiter.timer);
      waiters.clear();
    },
  };
}
