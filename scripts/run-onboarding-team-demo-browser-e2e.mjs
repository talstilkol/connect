import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { launchAcceptanceBrowser, readAcceptanceBrowserName, restrictAcceptancePage } from "./browser-acceptance.mjs";
import { createOnboardingTeamDemo, demoActors, demoOrganizationId, demoTenantId } from "./fixtures/onboarding-team-demo.mjs";
import { readWorkspaceSetupMessages } from "../shared/i18n/workspaceSetup.ts";
import { readTeamManagementMessages } from "../features/team/teamManagementMessages.ts";
import { readTeamDirectoryMessages } from "../features/team/teamDirectoryMessages.ts";
import { readInvitationMessages } from "../shared/i18n/invitation.ts";

if (process.argv.length > 2) throw new Error("Onboarding/team demo accepts no arguments; use CONNECT_E2E_BROWSER.");
const engine = readAcceptanceBrowserName();
const output = new URL("../output/demo-journeys/onboarding-team/", import.meta.url);
const entryPath = "/__onboarding-team-demo.js";
const actionsId = "\0connect-onboarding-team-demo-actions";
const routerId = "\0connect-onboarding-team-demo-navigation";
const linkId = "\0connect-onboarding-team-demo-link";
let fixture = createOnboardingTeamDemo();
const actions = `const actorKey=new URLSearchParams(location.search).get('actor')||'founder';
const send=async(operation,input)=>{const response=await fetch('/__demo-action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation,input,actorKey})});if(!response.ok)throw Error('Local demo action failed');return response.json();};
export const saveBusinessProfileAction=input=>send('profile.save',input);
export const inviteTeamMemberAction=input=>send('invitation.request',input);
export const changeTeamMemberRoleAction=input=>send('member.role',input);
export const changeTeamMemberStatusAction=input=>send('member.status',input);
export const transferTeamOwnershipAction=()=>{throw Error('Ownership transfer is covered by the existing team suite');};
export const acceptDemoInvitation=(previous,formData)=>send('invitation.accept',{previousStatus:previous?.status??null,fieldNames:[...formData.keys()]});`;
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import '/app/globals.css';
import {WorkspaceOnboarding} from '/features/workspace/WorkspaceOnboarding.tsx';
import {WorkspaceDraftProvider} from '/features/workspace/WorkspaceDraftProvider.tsx';
import {TeamDirectory} from '/features/team/TeamDirectory.tsx';
import {InvitationAcceptanceForm} from '/app/invite/[invitationKey]/InvitationAcceptanceForm.tsx';
import {acceptDemoInvitation} from '/__demo-actions';
const query=new URLSearchParams(location.search);const language=query.get('language');const actorKey=query.get('actor')||'founder';const section=query.get('section')||'onboarding';
if(!['he','en','ar'].includes(language))throw Error('Unsupported demo language');
document.documentElement.lang=language;document.documentElement.dir=language==='en'?'ltr':'rtl';
const view=await fetch('/__demo-state?actor='+encodeURIComponent(actorKey)).then(response=>{if(!response.ok)throw Error('Demo state unavailable');return response.json();});
const navigate=value=>{const url=new URL(location.href);url.searchParams.set('section',value);location.assign(url.href);};
const content=section==='onboarding'?React.createElement(WorkspaceDraftProvider,{initialBusinessProfileDraft:view.profile,initialBusinessProfileVersion:view.profile?.version??0,initialOrganizationId:view.organizationId},React.createElement(WorkspaceOnboarding,{language,metaConnection:{status:'disconnected'},serverPersistenceEnabled:true,onConnectMeta(){throw Error('Meta is outside this demo');}})):section==='team'?React.createElement(TeamDirectory,{language,directory:view.directory,status:view.profile?'ready':'onboarding-required'}):React.createElement(InvitationAcceptanceForm,{language,action:acceptDemoInvitation});
createRoot(document.getElementById('root')).render(React.createElement('main',{className:'page-content'},React.createElement('p',{role:'note'},'LOCAL DEMO — fixture identities and local memory; no Clerk, email, real invitation or database.'),React.createElement('p',{'data-demo-actor':actorKey},view.actor.id+' · '+(view.actor.role??'not provisioned')),React.createElement('nav',{'aria-label':'Demo journey'},['onboarding','team','accept'].map(value=>React.createElement('button',{key:value,type:'button',onClick:()=>navigate(value)},'Demo '+value))),content));`;
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Local onboarding and team demo acceptance</title></head><body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`;
const allowedActionModules = new Set(["../../server/onboarding/saveBusinessProfileAction", "../../server/team/teamInvitationActions.ts", "../../server/team/teamMembershipActions.ts", "/__demo-actions"]);
const server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), configFile: false, envFile: false, appType: "custom", logLevel: "error",
  plugins: [{ name: "connect-onboarding-team-demo-boundary", enforce: "pre",
    resolveId(source) { if (source === entryPath) return entryPath; if (allowedActionModules.has(source)) return actionsId; if (source === "next/navigation") return routerId; if (source === "next/link") return linkId; },
    load(id) { if (id === entryPath) return entry; if (id === actionsId) return actions; if (id === routerId) return `export function useRouter(){return {refresh(){location.reload();}};}`; if (id === linkId) return `import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children);}`; },
    configureServer(vite) { vite.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (!["/", "/__demo-state", "/__demo-action"].includes(url.pathname)) return next();
      response.setHeader("Cache-Control", "no-store");
      try {
        if (url.pathname === "/") { response.setHeader("Content-Type", "text/html;charset=utf-8"); response.end(await vite.transformIndexHtml("/", html)); return; }
        response.setHeader("Content-Type", "application/json");
        if (url.pathname === "/__demo-state" && request.method === "GET") { response.end(JSON.stringify(fixture.view(url.searchParams.get("actor")))); return; }
        if (url.pathname !== "/__demo-action" || request.method !== "POST") { response.statusCode = 405; response.end(); return; }
        const chunks = []; let bytes = 0;
        for await (const chunk of request) { bytes += chunk.length; if (bytes > 4096) throw new Error("Demo payload too large"); chunks.push(chunk); }
        const { operation, input, actorKey } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        response.end(JSON.stringify(await fixture.request(operation, input, actorKey)));
      } catch { response.statusCode = 500; response.end(JSON.stringify({ status: "server-error" })); }
    }); },
  }, react()], server: { host: "127.0.0.1", port: 0 } });

let browser; let activePage; let failure;
const errors = []; const externalRequests = []; const journeys = [];
try {
  await mkdir(output, { recursive: true });
  await server.listen(); const address = server.httpServer.address(); assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await launchAcceptanceBrowser();
  for (const language of ["he", "en", "ar"]) {
    fixture = createOnboardingTeamDemo();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
    const page = activePage = await context.newPage(); page.setDefaultTimeout(15_000);
    page.on("pageerror", error => errors.push({ language, message: error.message }));
    page.on("request", request => { if (new URL(request.url()).origin !== origin) externalRequests.push(request.url()); });
    await restrictAcceptancePage(page, origin);
    const o = readWorkspaceSetupMessages(language).onboarding;
    const t = readTeamManagementMessages(language);
    const d = readTeamDirectoryMessages(language);
    const invitation = readInvitationMessages(language);
    const steps = [];
    const button = name => page.getByRole("button", { name, exact: true });
    const text = value => page.getByText(value, { exact: true }).waitFor();
    const open = async (section, actor = "founder") => { await page.goto(`${origin}/?language=${language}&actor=${actor}&section=${section}`, { waitUntil: "networkidle" }); await page.getByRole("note").waitFor(); };
    const expectCall = async (operation, input, actor = "founder") => {
      const call = await fixture.waitForPending();
      assert.deepEqual(call, { operation, input, actor: fixture.view(actor).actor });
    };
    const memberRow = () => page.locator(".team-member-row").filter({ hasText: demoActors.invitee.email });
    const management = () => page.locator('[aria-labelledby="team-management-title"]');
    const acceptStatus = status => page.locator(`[data-invitation-status="${status}"]`).waitFor();
    const navigate = async name => { await button(`Demo ${name}`).click(); await page.waitForLoadState("networkidle"); };

    await open("team"); await page.getByRole("alert").filter({ hasText: d.statuses["onboarding-required"] }).waitFor();
    assert.equal(await button(d.invite).count(), 0); assert.equal(fixture.state.calls.length, 0);
    await navigate("onboarding");
    assert.equal(await button(o.saveActions.server).isDisabled(), true);
    const profile = { businessName: `Demo workspace ${language}`, timezone: "Asia/Jerusalem", interfaceLanguage: language };
    await page.getByRole("textbox", { name: o.fields.businessName, exact: true }).fill(profile.businessName);
    await page.getByRole("combobox", { name: o.fields.timezone, exact: true }).selectOption(profile.timezone);
    assert.equal(await button(o.saveActions.server).isDisabled(), true);
    await page.getByRole("combobox", { name: o.fields.interfaceLanguage, exact: true }).selectOption(language);
    const profileInput = { ...profile, expectedVersion: 0, expectedOrganizationId: demoOrganizationId };
    await button(o.saveActions.server).click(); await expectCall("profile.save", profileInput);
    assert.equal(await button(o.saveActions.saving).isDisabled(), true);
    fixture.release("server-error"); await text(o.saveFailures["server-error"]);
    assert.equal(fixture.state.profile, null); assert.equal(fixture.state.members.length, 0);
    assert.equal(await page.getByRole("textbox", { name: o.fields.businessName, exact: true }).inputValue(), profile.businessName);
    await button(o.saveActions.server).click(); await expectCall("profile.save", profileInput); fixture.release();
    await text(o.notices.tenantCreated);
    assert.deepEqual(fixture.state.members.map(({ role, status }) => ({ role, status })), [{ role: "owner", status: "active" }]);
    steps.push("W02: required fields, failed first save without a member, retained input and successful createdTenant result with one fixture owner");

    await navigate("team"); await page.getByText(demoActors.founder.email, { exact: true }).waitFor();
    await text(t.empty); await navigate("onboarding");
    assert.equal(await page.getByRole("textbox", { name: o.fields.businessName, exact: true }).inputValue(), profile.businessName);
    await button(o.saveActions.server).click(); await expectCall("profile.save", { ...profileInput, expectedVersion: 1 }); fixture.release();
    await text(o.notices.serverUpdated); assert.equal(fixture.state.profile.version, 2); assert.equal(fixture.state.members.length, 1);
    steps.push("W02: full harness navigation reload reads the retained fixture profile; versioned update does not create a second owner");

    await navigate("team"); await button(d.invite).click();
    const email = page.locator("#team-invitation-email"); const role = page.locator("#team-invitation-role");
    await email.fill(demoActors.invitee.email); await role.selectOption("agent");
    const inviteInput = { email: demoActors.invitee.email, role: "agent" };
    await button(t.inviteSubmit).evaluate(element => { element.click(); element.click(); }); await expectCall("invitation.request", inviteInput);
    assert.equal(await email.isDisabled(), true); assert.equal(await role.isDisabled(), true);
    assert.equal(fixture.state.calls.filter(call => call.operation === "invitation.request").length, 1);
    fixture.release("server-error"); await page.getByRole("alert").filter({ hasText: t.unavailable }).waitFor();
    assert.equal(await button(t.inviteSubmit).isDisabled(), true); assert.equal(fixture.state.invitation, null);
    await button(t.refresh).click(); await page.waitForLoadState("networkidle"); await button(d.invite).click();
    await email.fill(demoActors.invitee.email); await role.selectOption("agent");
    await button(t.inviteSubmit).click(); await expectCall("invitation.request", inviteInput); fixture.release();
    await text(t.inviteQueued); assert.equal(await email.inputValue(), ""); assert.equal(fixture.state.members.length, 1);
    await email.fill(demoActors.invitee.email); await button(t.inviteSubmit).click(); await expectCall("invitation.request", inviteInput); fixture.release();
    await text(t.invitePending); assert.equal(fixture.state.members.length, 1);
    steps.push("W04: invitation double-click guard, error lock, actual refresh/retry, queued and already-pending results; no member exists before acceptance");

    await open("accept", "invitee"); await acceptStatus("ready");
    await button(invitation.actions.accept).click(); await expectCall("invitation.accept", { previousStatus: null, fieldNames: [] }, "invitee");
    assert.equal(await button(invitation.actions.accepting).isDisabled(), true);
    fixture.release("identity-verification-required"); await acceptStatus("identity-verification-required");
    assert.equal(fixture.state.members.length, 1); assert.equal(await button(invitation.actions.accept).isEnabled(), true);
    fixture.state.invitation.status = "expired";
    await button(invitation.actions.accept).click(); await expectCall("invitation.accept", { previousStatus: "identity-verification-required", fieldNames: [] }, "invitee"); fixture.release();
    await acceptStatus("invitation-unavailable"); assert.equal(fixture.state.members.length, 1);
    fixture.state.invitation.status = "queued";
    await button(invitation.actions.accept).click(); await expectCall("invitation.accept", { previousStatus: "invitation-unavailable", fieldNames: [] }, "invitee"); fixture.release();
    await acceptStatus("accepted"); assert.equal(await button(invitation.actions.accept).isDisabled(), true); assert.equal(fixture.state.members.length, 2);
    await page.reload({ waitUntil: "networkidle" }); await button(invitation.actions.accept).click(); await expectCall("invitation.accept", { previousStatus: null, fieldNames: [] }, "invitee"); fixture.release();
    await acceptStatus("already-accepted"); assert.equal(await button(invitation.actions.accept).isDisabled(), true); assert.equal(fixture.state.members.length, 2);
    steps.push("W04: actual acceptance form shows verification-required/expired/accepted/already-accepted fixture results; pending/complete controls and one membership across reload");

    await open("team"); await memberRow().waitFor(); await page.locator("#team-managed-member").selectOption(demoActors.invitee.memberKey);
    await page.locator("#team-managed-role").selectOption("viewer");
    await management().getByRole("button", { name: t.save, exact: true }).click();
    await expectCall("member.role", { memberKey: demoActors.invitee.memberKey, expectedVersion: 1, role: "viewer" }); fixture.release("conflict");
    await management().getByRole("alert").filter({ hasText: t.conflict }).waitFor();
    assert.equal(await page.locator("#team-managed-member").isDisabled(), true); assert.equal(fixture.state.members[1].role, "agent");
    await management().getByRole("button", { name: t.refresh, exact: true }).click(); await page.waitForLoadState("networkidle");
    await page.locator("#team-managed-member").selectOption(demoActors.invitee.memberKey); await page.locator("#team-managed-role").selectOption("viewer");
    await management().getByRole("button", { name: t.save, exact: true }).click();
    await expectCall("member.role", { memberKey: demoActors.invitee.memberKey, expectedVersion: 1, role: "viewer" }); fixture.release();
    await memberRow().getByText(d.roles.viewer, { exact: true }).waitFor(); assert.equal(fixture.state.members[1].version, 2);
    steps.push("W04: role change conflict locks management; refresh then retry updates the member row and version");

    const beforeCancel = fixture.state.calls.length;
    await button(t.suspend).click(); await button(t.cancel).click(); assert.equal(fixture.state.calls.length, beforeCancel);
    await button(t.suspend).click(); await button(t.confirm).click();
    await expectCall("member.status", { memberKey: demoActors.invitee.memberKey, expectedVersion: 2, status: "suspended" }); fixture.release();
    await memberRow().getByText(t.suspended, { exact: true }).waitFor(); assert.equal(await page.locator("#team-managed-role").isDisabled(), true);
    await button(t.restore).click(); await expectCall("member.status", { memberKey: demoActors.invitee.memberKey, expectedVersion: 3, status: "active" }); fixture.release();
    await memberRow().getByText(t.active, { exact: true }).waitFor(); assert.equal(fixture.state.members[1].version, 4);
    steps.push("W04: cancelling confirmation sends nothing; suspend/restore send current versions and update the visible access state");
    await page.screenshot({ path: fileURLToPath(new URL(`${engine}-${language}-team.png`, output)), fullPage: true });

    const beforeViewer = fixture.state.calls.length;
    await open("team", "invitee"); await text(t.ownerOnly); await memberRow().getByText(d.roles.viewer, { exact: true }).waitFor();
    assert.equal(await button(d.invite).count(), 0); assert.equal(await page.locator("#team-managed-member").count(), 0); assert.equal(fixture.state.calls.length, beforeViewer);
    await navigate("onboarding"); await page.getByRole("textbox", { name: o.fields.businessName, exact: true }).fill("Unauthorized demo change");
    await button(o.saveActions.server).click(); await expectCall("profile.save", { ...profile, businessName: "Unauthorized demo change", expectedVersion: 2, expectedOrganizationId: demoOrganizationId }, "invitee"); fixture.release();
    await text(o.saveFailures["permission-denied"]); assert.deepEqual(fixture.state.profile, { ...profile, version: 2 });
    steps.push("W02/W04: accepted viewer has no team mutation controls; rejected profile update surfaces permission-denied without changing the fixture profile");

    assert.equal(fixture.state.calls.length, 15); assert.equal(fixture.state.results.length, 15);
    assert.equal(fixture.state.members.filter(member => member.role === "owner").length, 1);
    journeys.push({ language, status: "passed", steps, ...structuredClone(fixture.state) });
    await context.close(); activePage = null;
  }
  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
} catch (error) {
  failure = error;
  await activePage?.screenshot({ path: fileURLToPath(new URL(`${engine}-failure.png`, output)), fullPage: true }).catch(() => {});
} finally {
  fixture.close();
  const report = { schemaVersion: 1, suite: "onboarding-team-demo", status: failure ? "failed" : "passed", engine, browserVersion: browser?.version() ?? null,
    workflows: ["W02", "W04"], scenarios: journeys.reduce((total, journey) => total + journey.steps.length, 0), languages: ["he", "en", "ar"], journeys, errors, externalRequests,
    scope: { actualComponents: ["WorkspaceOnboarding", "WorkspaceDraftProvider", "TeamDirectory", "TeamInvitationForm", "TeamManagement", "InvitationAcceptanceForm"], productCss: true,
      fixtureActors: demoActors, fixtureTenantId: demoTenantId, localActionEndpoint: true, persistence: "isolated Node process memory, retained across real browser reloads", authCredentials: false,
      actualClerkAccounts: false, realMfa: false, realEmailDelivery: false, actualInvitationActivationGate: false, realDatabaseProvisioning: false, productionAuthorizationAcceptance: false,
      invitationRevocationUi: "not implemented in the product; this suite covers member access suspension and an expired invitation response", actualWorkspaceRouting: false,
      limitations: "UI-to-local-fixture journey only. Server Actions, Clerk, organization/email verification, invitation delivery and persistence are doubles; no provider acceptance or production access-control proof." },
    failure: failure instanceof Error ? { message: failure.message, stack: failure.stack } : failure ?? null };
  await writeFile(new URL(`${engine}.json`, output), JSON.stringify(report, null, 2) + "\n");
  await browser?.close(); await server.close();
}
if (failure) throw failure;
console.log("CONNECT_DEMO_RESULT " + JSON.stringify({ suite: "onboarding-team-demo", status: "passed", scenarios: journeys.reduce((total, journey) => total + journey.steps.length, 0), languages: ["he", "en", "ar"], externalProviderCalls: 0, scope: "Real onboarding/team/acceptance React UI with explicit fixture actors and local memory only; no real accounts, email, MFA or database." }));
