import assert from "node:assert/strict";
import test from "node:test";
import { inspectDashboardSetup } from "../shared/validation/dashboardSetup.ts";

test("keeps dashboard setup at zero without a saved business profile", () => {
  const result = inspectDashboardSetup(null);

  assert.equal(result.businessProfileComplete, false);
  assert.equal(result.metaConnectionComplete, false);
  assert.equal(result.completedSteps, 0);
  assert.equal(result.totalSteps, 10);
  assert.equal(result.progressPercent, 0);
  assert.equal(result.nextAction, "business-profile");
});

test("marks only the business profile step as locally complete", () => {
  const result = inspectDashboardSetup({
    businessName: "Connect",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  });

  assert.equal(result.businessProfileComplete, true);
  assert.equal(result.metaConnectionComplete, false);
  assert.equal(result.completedSteps, 1);
  assert.equal(result.totalSteps, 10);
  assert.equal(result.progressPercent, 10);
  assert.equal(result.nextAction, "meta");
});

test("does not count a malformed business profile snapshot", () => {
  const result = inspectDashboardSetup({
    businessName: "",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  });

  assert.equal(result.businessProfileComplete, false);
  assert.equal(result.completedSteps, 0);
  assert.equal(result.nextAction, "business-profile");
});

test("counts a connected Meta snapshot as setup steps two through four", () => {
  const result = inspectDashboardSetup(
    {
      businessName: "Connect",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
    },
    { status: "connected" },
  );

  assert.equal(result.businessProfileComplete, true);
  assert.equal(result.metaConnectionComplete, true);
  assert.equal(result.completedSteps, 4);
  assert.equal(result.progressPercent, 40);
  assert.equal(result.nextAction, "onboarding");
});

test("does not count a pending or restricted Meta connection as complete", () => {
  const businessProfile = {
    businessName: "Connect",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  };

  for (const status of ["pending", "restricted"]) {
    const result = inspectDashboardSetup(businessProfile, { status });

    assert.equal(result.metaConnectionComplete, false);
    assert.equal(result.completedSteps, 1);
    assert.equal(result.nextAction, "meta");
  }
});
