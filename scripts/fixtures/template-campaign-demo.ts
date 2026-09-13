import type { TemplateDraft } from "../../shared/domain/templateDraft.ts";
import type { MessageTemplateView } from "../../shared/domain/messageTemplateView.ts";
import type { CampaignView } from "../../shared/domain/campaignView.ts";
import type { CampaignAudienceSource, CampaignPersonalizationMapping } from "../../shared/domain/campaignAudience.ts";
import type { CampaignControlRequest } from "../../shared/domain/campaignControl.ts";
import { canControlCampaign } from "../../shared/domain/campaignControl.ts";
import { hasPermission, type TenantRole } from "../../shared/domain/model.ts";
import { validateMessageTemplateDraft } from "../../shared/validation/messageTemplateDraft.ts";

// Explicitly authorized, deterministic demo identities. No Clerk account, session,
// database, queue or provider is created. This store models action responses only.
export const demoTimestamp = "2026-09-13T12:00:00.000Z";
export const demoTemplateKey = `template_v1_${"c".repeat(64)}`;
export const demoCampaignKey = `campaign_v1_${"d".repeat(64)}`;
export const demoAccounts = {
  owner: { userId: "demo-template-campaign-owner", tenantId: 701, role: "owner" as TenantRole },
  viewer: { userId: "demo-template-campaign-viewer", tenantId: 701, role: "viewer" as TenantRole },
};
export const demoAudiences = { lists: [{ id: 41, name: "Demo opted-in list", contactCount: 2 }], tags: [] };

type Operation = "template.save" | "template.submit" | "template.sync" | "campaign.save" | "campaign.activate" | "campaign.control" | "campaign.refresh";
type SnapshotInput = { name: string; deliveryMode: "scheduled" | "immediate"; scheduledAt: string | null; templateKey: string; audienceSource: CampaignAudienceSource; personalizationMapping: CampaignPersonalizationMapping };
type Result = { status: string; [key: string]: unknown };
type Call = { operation: Operation; input: unknown; actor: typeof demoAccounts.owner };

export function createTemplateCampaignDemoStore() {
  let pending: { operation: Operation; complete: () => Result; resolve: (value: Result) => void } | null = null;
  const state = {
    account: "owner" as keyof typeof demoAccounts,
    templates: [] as MessageTemplateView[],
    campaigns: [] as CampaignView[],
    calls: [] as Call[],
    results: [] as { operation: Operation; result: Result }[],
  };
  function request(operation: Operation, input: unknown, complete: () => Result) {
    if (pending) throw new Error("Demo action already pending");
    state.calls.push({ operation, input: structuredClone(input), actor: { ...demoAccounts[state.account] } });
    return new Promise<Result>((resolve) => { pending = { operation, complete, resolve }; });
  }
  const writable = () => hasPermission(demoAccounts[state.account].role, "campaigns.write");
  function currentCampaign(input: { campaignKey: string; expectedVersion: number }) {
    return state.campaigns.find(item => item.campaignKey === input.campaignKey && item.version === input.expectedVersion);
  }
  return {
    state,
    get pendingOperation() { return pending?.operation ?? null; },
    release(failure?: "server-error" | "sync-failed" | "audience-invalid") {
      if (!pending) throw new Error("No demo action to release");
      const current = pending;
      const result = failure ? { status: failure } : current.complete();
      state.results.push({ operation: current.operation, result: structuredClone(result) });
      pending = null;
      current.resolve(structuredClone(result));
    },
    simulateOtherTabCampaignUpdate() {
      if (pending || state.campaigns.length !== 1) throw new Error("Demo concurrent update requires one idle campaign");
      state.campaigns[0] = { ...state.campaigns[0], version: state.campaigns[0].version + 1 };
    },
    saveTemplate(input: TemplateDraft) {
      return request("template.save", input, () => {
        if (!writable()) return { status: "permission-denied" };
        const validated = validateMessageTemplateDraft(input);
        if (!validated.success) return { status: "validation-error", issues: validated.issues };
        const template: MessageTemplateView = { ...validated.value, templateKey: demoTemplateKey, version: 1, status: "draft", submittedAt: null, reviewedAt: null, updatedAt: demoTimestamp };
        state.templates = [template];
        return { status: "saved", template };
      });
    },
    submitTemplate(templateKey: string, expectedVersion: number) {
      return request("template.submit", { templateKey, expectedVersion }, () => {
        if (!writable()) return { status: "permission-denied" };
        const template = state.templates.find(item => item.templateKey === templateKey && item.version === expectedVersion && item.status === "draft");
        if (!template) return { status: "state-conflict" };
        state.templates = [{ ...template, status: "pending_review", version: expectedVersion + 1, submittedAt: demoTimestamp }];
        return { status: "submitted", template: state.templates[0] };
      });
    },
    syncTemplates(observedAt: string) {
      return request("template.sync", { observedAt }, () => {
        if (!writable()) return { status: "permission-denied" };
        // The approved response is an explicit local provider fixture, not Meta evidence.
        state.templates = state.templates.map(template => template.status === "pending_review" ? { ...template, status: "approved", reviewedAt: observedAt, version: (template.version ?? 0) + 1 } : template);
        return { status: "synced", templates: state.templates, summary: { received: 1, eligible: 1, updated: 1, unchanged: 0, stale: 0, unmatched: 0, unsupported: 0, observedAt } };
      });
    },
    saveCampaign(input: SnapshotInput) {
      return request("campaign.save", input, () => {
        if (!writable()) return { status: "permission-denied" };
        const template = state.templates.find(item => item.templateKey === input.templateKey && item.status === "approved");
        if (!template) return { status: "template-unavailable" };
        const campaign: CampaignView = { campaignKey: demoCampaignKey, name: input.name, status: "draft", deliveryMode: input.deliveryMode, scheduledAt: input.scheduledAt, timezone: "UTC", templateName: template.name, templateLanguage: template.language, recipientCount: 2, version: 1, activatedAt: null, startedAt: null, completedAt: null, updatedAt: demoTimestamp };
        state.campaigns = [campaign];
        return { status: "saved", campaign };
      });
    },
    activateCampaign(input: { campaignKey: string; expectedVersion: number }) {
      return request("campaign.activate", input, () => {
        if (!writable()) return { status: "permission-denied" };
        const campaign = currentCampaign(input);
        if (!campaign || campaign.status !== "draft") return { status: "state-conflict" };
        state.campaigns = [{ ...campaign, status: "scheduled", version: campaign.version + 1, activatedAt: demoTimestamp }];
        return { status: "activated", campaign: { campaignKey: campaign.campaignKey, status: "scheduled", version: campaign.version + 1, activatedAt: demoTimestamp, startedAt: null } };
      });
    },
    controlCampaign(input: CampaignControlRequest) {
      return request("campaign.control", input, () => {
        if (!writable()) return { status: "permission-denied" };
        const campaign = currentCampaign(input);
        if (!campaign || !canControlCampaign(campaign.status, input.action)) return { status: "state-conflict" };
        const status = input.action === "pause" ? "paused" : input.action === "resume" ? "scheduled" : "cancelled";
        state.campaigns = [{ ...campaign, status, version: campaign.version + 1 }];
        return { status: "controlled", campaign: state.campaigns[0] };
      });
    },
    refreshCampaigns() {
      return request("campaign.refresh", null, () => ({ status: "ready", campaigns: state.campaigns }));
    },
  };
}

export const templateCampaignDemo = createTemplateCampaignDemoStore();
