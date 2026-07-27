import assert from "node:assert/strict";
import test from "node:test";
import { inspectCampaignPlanning } from "../shared/validation/campaignPlanning.ts";

test("reports no completed planning checks without draft inputs", () => {
  assert.deepEqual(
    inspectCampaignPlanning({
      name: "",
      deliveryMode: "immediate",
      scheduledAt: "",
      hasTemplateDraft: false,
      hasContactSnapshot: false,
      templateVariableNumbers: [],
      variableColumnMapping: {},
      requiresDynamicUrlMapping: false,
      dynamicUrlColumnIndex: null,
      isDraftSaved: false,
    }),
    {
      detailsComplete: false,
      templateDraftAvailable: false,
      contactSnapshotAvailable: false,
      variableMappingComplete: false,
      draftSaved: false,
      completedCount: 0,
      totalCount: 5,
      isComplete: false,
    },
  );
});

test("completes planning for an immediate draft without template variables", () => {
  const result = inspectCampaignPlanning({
    name: "1",
    deliveryMode: "immediate",
    scheduledAt: "",
    hasTemplateDraft: true,
    hasContactSnapshot: true,
    templateVariableNumbers: [],
    variableColumnMapping: {},
    requiresDynamicUrlMapping: false,
    dynamicUrlColumnIndex: null,
    isDraftSaved: true,
  });

  assert.equal(result.completedCount, 5);
  assert.equal(result.isComplete, true);
});

test("requires scheduled time and every variable mapping", () => {
  const result = inspectCampaignPlanning({
    name: "1",
    deliveryMode: "scheduled",
    scheduledAt: "",
    hasTemplateDraft: true,
    hasContactSnapshot: true,
    templateVariableNumbers: [1],
    variableColumnMapping: {},
    requiresDynamicUrlMapping: false,
    dynamicUrlColumnIndex: null,
    isDraftSaved: false,
  });

  assert.equal(result.detailsComplete, false);
  assert.equal(result.variableMappingComplete, false);
  assert.equal(result.completedCount, 2);
});

test("treats CSV column zero as a valid variable mapping", () => {
  const result = inspectCampaignPlanning({
    name: "1",
    deliveryMode: "immediate",
    scheduledAt: "",
    hasTemplateDraft: true,
    hasContactSnapshot: true,
    templateVariableNumbers: [1],
    variableColumnMapping: { 1: 0 },
    requiresDynamicUrlMapping: true,
    dynamicUrlColumnIndex: 0,
    isDraftSaved: true,
  });

  assert.equal(result.variableMappingComplete, true);
  assert.equal(result.isComplete, true);
});

test("keeps planning incomplete when a dynamic URL has no CSV mapping", () => {
  const result = inspectCampaignPlanning({
    name: "1",
    deliveryMode: "immediate",
    scheduledAt: "",
    hasTemplateDraft: true,
    hasContactSnapshot: true,
    templateVariableNumbers: [],
    variableColumnMapping: {},
    requiresDynamicUrlMapping: true,
    dynamicUrlColumnIndex: null,
    isDraftSaved: true,
  });

  assert.equal(result.variableMappingComplete, false);
  assert.equal(result.completedCount, 4);
  assert.equal(result.isComplete, false);
});
