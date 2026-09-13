import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readAcceptanceBrowserName, restrictAcceptancePage, browserEvidencePrefix } from "../scripts/browser-acceptance.mjs";
import { acceptanceRunResult } from "../scripts/run-react-browser-matrix.mjs";

test("browser selection never silently substitutes an unsupported engine", () => {
  assert.equal(readAcceptanceBrowserName({}), "chromium");
  for (const name of ["chromium", "firefox", "webkit"]) {
    assert.equal(readAcceptanceBrowserName({ CONNECT_E2E_BROWSER: name }), name);
  }
  for (const name of ["", "chrome", "safari", "Firefox", " chromium "]) {
    assert.throws(() => readAcceptanceBrowserName({ CONNECT_E2E_BROWSER: name }), /must be chromium, firefox or webkit/);
  }
});

test("credential-free acceptance refuses ambient Clerk credentials", () => {
  for (const key of ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]) {
    assert.throws(() => readAcceptanceBrowserName({ [key]: "configured" }), /without Clerk credentials/);
  }
});

test("an unavailable browser binary fails explicitly without claiming engine evidence", () => {
  const missingCache = join(tmpdir(), `connect-absent-browser-${process.pid}`);
  assert.equal(existsSync(missingCache), false);
  const helperUrl = new URL("../scripts/browser-acceptance.mjs", import.meta.url).href;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `import { launchAcceptanceBrowser } from ${JSON.stringify(helperUrl)}; await launchAcceptanceBrowser();`], {
    encoding: "utf8", timeout: 10_000,
    env: { ...process.env, CONNECT_E2E_BROWSER: "firefox", PLAYWRIGHT_BROWSERS_PATH: missingCache,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: "" },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /locked firefox browser is unavailable/);
  assert.doesNotMatch(result.stdout, /CONNECT_BROWSER_ACCEPTANCE/);
});

test("acceptance browser can access only its owned loopback server origin", async () => {
  let routeRequest;
  await restrictAcceptancePage({ async route(pattern, handler) {
    assert.equal(pattern, "**/*"); routeRequest = handler;
  } }, "http://127.0.0.1:39001");
  for (const [url, expected] of [
    ["http://127.0.0.1:39001/workspace?lang=he", "continue"],
    ["http://127.0.0.1:39002/api/write", "abort"],
    ["https://127.0.0.1:39001/", "abort"],
    ["https://example.com/", "abort"],
  ]) {
    let outcome;
    await routeRequest({ request: () => ({ url: () => url }),
      continue() { outcome = "continue"; }, abort() { outcome = "abort"; } });
    assert.equal(outcome, expected);
  }
});

test("acceptance rejects external or ambiguous allowed origins before routing", async () => {
  for (const origin of ["https://example.com", "http://localhost:39001", "http://127.0.0.1:39001/path", "http://127.0.0.1:39001/"]) {
    await assert.rejects(restrictAcceptancePage({ route() { assert.fail("must not register"); } }, origin), /exact loopback/);
  }
});

const passingResult = {
  status: 0, signal: null, stderr: "",
  stdout: browserEvidencePrefix + JSON.stringify({ engine: "firefox", version: "1.0" }) + "\nSuite passed\n",
};
test("a suite pass requires evidence from the requested engine", () => {
  assert.equal(acceptanceRunResult("firefox", "workspace-navigation", passingResult).status, "passed");
  assert.equal(acceptanceRunResult("webkit", "workspace-navigation", passingResult).status, "failed");
});

test("missing, malformed and duplicated browser evidence cannot produce a pass", () => {
  for (const stdout of ["", "Suite passed", browserEvidencePrefix + "{invalid}", passingResult.stdout.repeat(2), browserEvidencePrefix + '{"engine":"firefox"}']) {
    assert.equal(acceptanceRunResult("firefox", "workspace-navigation", { ...passingResult, stdout }).status, "failed");
  }
});

test("child failure or timeout overrides prior browser evidence", () => {
  for (const failure of [{ status: 1 }, { status: null, signal: "SIGKILL" }, { error: new Error("timeout") }]) {
    assert.equal(acceptanceRunResult("firefox", "workspace-navigation", { ...passingResult, ...failure }).status, "failed");
  }
});
