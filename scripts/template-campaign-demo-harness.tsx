import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import { TemplateDraftEditor } from "../features/templates/TemplateDraftEditor";
import { CampaignManager } from "../features/campaigns/CampaignManager";
import { WorkspaceDraftProvider } from "../features/workspace/WorkspaceDraftProvider";
import { hasPermission } from "../shared/domain/model";
import { inspectTemplateVariables } from "../shared/validation/templateVariables";
import { demoAccounts, demoAudiences, templateCampaignDemo } from "./fixtures/template-campaign-demo";

declare global {
  interface Window { __templateCampaignDemo: typeof templateCampaignDemo }
}
window.__templateCampaignDemo = templateCampaignDemo;
const languageInput = new URLSearchParams(location.search).get("language");
if (languageInput !== "he" && languageInput !== "en" && languageInput !== "ar") throw new Error("Unsupported demo language");
const language = languageInput;
document.documentElement.lang = language;
document.documentElement.dir = language === "en" ? "ltr" : "rtl";

function Harness() {
  const [section, setSection] = useState<"templates" | "campaigns">("templates");
  const [account, setAccount] = useState<keyof typeof demoAccounts>("owner");
  const actor = demoAccounts[account];
  const state = templateCampaignDemo.state;
  return <WorkspaceDraftProvider>
    <main className="page-content">
      <p role="note">DEMO — local action fixtures. No real account, Meta approval, queue or delivery.</p>
      <nav aria-label="Demo journey">
        <button type="button" onClick={() => setSection("templates")}>Demo templates</button>
        <button type="button" onClick={() => setSection("campaigns")}>Demo campaigns</button>
        <label>Demo account<select value={account} onChange={event => {
          const next = event.target.value;
          if (next !== "owner" && next !== "viewer") throw new Error("Unsupported demo account");
          templateCampaignDemo.state.account = next;
          setAccount(next);
        }}><option value="owner">Demo owner</option><option value="viewer">Demo viewer</option></select></label>
        <p data-demo-identity>{actor.userId} · tenant {actor.tenantId} · {actor.role}</p>
      </nav>
      {section === "templates" ? <TemplateDraftEditor key={`template-${account}`} authEnabled interfaceLanguage={language}
        initialTemplates={state.templates} initialStatus="ready" canWrite={hasPermission(actor.role, "templates.write")}
        canSubmit={hasPermission(actor.role, "templates.write")} canSync={hasPermission(actor.role, "templates.write")} /> :
        <CampaignManager key={`campaign-${account}`} authEnabled language={language} initialCampaigns={state.campaigns}
          initialTemplates={state.templates.filter(template => template.status === "approved").map(template => ({
            templateKey: template.templateKey, name: template.name, category: template.category, language: template.language,
            personalizationKeys: inspectTemplateVariables(template.body).numbers.map(number => `body:${number}`),
          }))} initialAudiences={demoAudiences} initialStatus="ready" canWrite={hasPermission(actor.role, "campaigns.write")} deliveryStatus="ready" />}
    </main>
  </WorkspaceDraftProvider>;
}

createRoot(document.getElementById("root")!).render(<Harness />);
