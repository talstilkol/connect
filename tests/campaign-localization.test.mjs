import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  campaignActivationResultStatuses,
  campaignSaveResultStatuses,
  campaignViewStatuses,
  readCampaignMessages,
} from "../features/campaigns/campaignMessages.ts";
import {
  readCampaignPageMessages,
} from "../features/campaigns/campaignPageMessages.ts";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(new URL(relativePath, projectRoot), "utf8");
}

test("localizes every campaign status and bounded action result", () => {
  assert.equal(campaignViewStatuses.length, 7);
  assert.equal(campaignSaveResultStatuses.length, 11);
  assert.equal(campaignActivationResultStatuses.length, 10);

  for (const language of ["he", "en", "ar"]) {
    const messages = readCampaignMessages(language);

    assert.equal(
      Object.keys(messages.manager.campaignStatuses).length,
      campaignViewStatuses.length,
    );
    assert.equal(
      Object.keys(messages.manager.saveResults).length,
      campaignSaveResultStatuses.length,
    );
    assert.equal(
      Object.keys(messages.manager.activationResults).length,
      campaignActivationResultStatuses.length,
    );
    assert.ok(
      campaignViewStatuses.every(
        (status) =>
          messages.manager.campaignStatuses[status].trim().length > 0,
      ),
    );
    assert.ok(
      campaignSaveResultStatuses.every(
        (status) =>
          messages.manager.saveResults[status].trim().length > 0,
      ),
    );
    assert.ok(
      campaignActivationResultStatuses.every(
        (status) =>
          messages.manager.activationResults[status].trim().length > 0,
      ),
    );

    assert.match(messages.manager.directory.recipients(0), /0/);
    assert.match(messages.manager.form.groupOption("", 0), /0/);
    assert.match(messages.rehearsal.form.localRows(0), /0/);
    assert.match(messages.rehearsal.audit.incomplete(0), /0/);
    assert.match(messages.rehearsal.planning.variable.allBody(0), /0/);
  }

  assert.equal(readCampaignPageMessages("en").title, "Campaigns");
  assert.equal(readCampaignPageMessages("ar").title, "الحملات");
});

test("passes workspace language through both campaign flows", async () => {
  const [section, manager, rehearsal] = await Promise.all([
    readSource("features/workspace/WorkspaceSectionContent.tsx"),
    readSource("features/campaigns/CampaignManager.tsx"),
    readSource("features/campaigns/CampaignDraftComposer.tsx"),
  ]);

  assert.match(
    section,
    /<Campaigns[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(section, /const CampaignManager = lazy/);
  assert.match(
    section,
    /<CampaignManager[\s\S]{0,160}language=\{language\}/,
  );
  assert.match(manager, /readCampaignMessages\(language\)/);
  assert.match(
    manager,
    /<CampaignDraftComposer language=\{language\}/,
  );
  assert.match(rehearsal, /readCampaignMessages\(language\)/);

  for (const source of [manager, rehearsal]) {
    assert.doesNotMatch(source, /[\u0590-\u05ff]/);
  }
});
