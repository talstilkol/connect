import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { inspectPilotConfiguration, runPilotConfigurationCli } from "../scripts/inspect-pilot-configuration.mjs";

const services = ["web", "api", "worker"];
const command = new URL("../scripts/inspect-pilot-configuration.mjs", import.meta.url);
const environmentReference = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const referenceEnvironment = Object.fromEntries(environmentReference.split("\n")
  .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
  .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]));

test("all three services block the empty process and the committed environment reference", () => {
  for (const service of services) {
    for (const environment of [{}, referenceEnvironment]) {
      const report = inspectPilotConfiguration(service, environment);
      assert.equal(report.status, "blocked");
      assert.equal(report.liveReadinessVerified, false);
      assert.ok(report.checks.some((check) => check.required && !check.accepted));
      assert.ok(report.unverified.includes("live-qr-and-end-to-end-delivery"));
    }
  }
});

test("the pilot boundary rejects production, development and mixed deployment environments", () => {
  for (const service of services) {
    for (const APP_RUNTIME_ENVIRONMENT of ["production", "development", "test", "staging"]) {
      for (const VERCEL_OIDC_ENVIRONMENT of ["production", "development", "preview"]) {
        const report = inspectPilotConfiguration(service, { APP_RUNTIME_ENVIRONMENT, VERCEL_OIDC_ENVIRONMENT });
        const boundary = report.checks.find((check) => check.id === "staging-boundary");
        assert.equal(boundary.accepted, APP_RUNTIME_ENVIRONMENT === "staging" && VERCEL_OIDC_ENVIRONMENT === "preview");
        assert.equal(report.status, "blocked");
      }
    }
  }
});

test("roles inspect their own configuration and retain disabled media without activating it", () => {
  const web = inspectPilotConfiguration("web", referenceEnvironment);
  assert.deepEqual(web.checks.map((check) => check.id), ["staging-boundary", "public-origin", "clerk", "web-api"]);
  const api = inspectPilotConfiguration("api", referenceEnvironment);
  const worker = inspectPilotConfiguration("worker", referenceEnvironment);
  assert.ok(api.checks.some((check) => check.id === "coexistence-pilot" && !check.accepted));
  assert.ok(worker.checks.some((check) => check.id === "worker-scheduler" && !check.accepted));
  for (const [report, id] of [[api, "media-file-read"], [worker, "media-worker"]]) {
    const check = report.checks.find((entry) => entry.id === id);
    assert.equal(check.status, "disabled");
    assert.equal(check.required, false);
    assert.equal(check.accepted, true);
  }
});

test("an enabled media path with absent storage settings blocks instead of being ignored", () => {
  for (const [service, key, modes, id] of [
    ["api", "META_MEDIA_FILE_READ_MODE", ["enabled", ""], "media-file-read"],
    ["worker", "META_MEDIA_WORKER_MODE", ["upload", "inspect", "cleanup", ""], "media-worker"],
  ]) {
    for (const mode of modes) {
      const report = inspectPilotConfiguration(service, { [key]: mode });
      const check = report.checks.find((entry) => entry.id === id);
      assert.equal(check.accepted, false);
      assert.equal(report.status, "blocked");
    }
  }
});

test("reports never echo supplied values or inspector exceptions", () => {
  // Reuse actual repository content as invalid input; no provider data is invented.
  const environment = Object.fromEntries(Object.keys(referenceEnvironment)
    .map((key) => [key, environmentReference]));
  for (const service of services) {
    const output = runPilotConfigurationCli([`--service=${service}`], environment);
    assert.equal(output.exitCode, 1);
    assert.equal(output.stderr, "");
    const report = JSON.parse(output.stdout);
    for (const check of report.checks) {
      assert.deepEqual(Object.keys(check), ["id", "status", "required", "accepted", "checkedKeys", "missingKeys", "invalidKeys"]);
      assert.ok(check.checkedKeys.every((key) => /^[A-Z][A-Z0-9_]*$/.test(key)));
    }
    assert.ok(!output.stdout.includes(JSON.stringify(environmentReference).slice(1, -1)));
    assert.ok(!output.stdout.includes("configuration\": {"));
  }
  const certificateReport = inspectPilotConfiguration("api", {
    ...environment, APP_RUNTIME_ENVIRONMENT: "staging", POSTGRES_TLS_MODE: "verify-full",
  });
  assert.ok(certificateReport.checks.find((check) => check.id === "postgres")
    .invalidKeys.includes("POSTGRES_TLS_CA_PEM"));
  const throwing = new Proxy({}, { get() { throw new Error(environmentReference); } });
  assert.deepEqual(runPilotConfigurationCli(["--service=api"], throwing), {
    exitCode: 1, stdout: "", stderr: "Pilot configuration: INSPECTION_FAILED\n",
  });
});

test("CLI rejects missing, duplicate and unknown arguments without reflecting input", () => {
  for (const args of [[], ["--service=web", "--service=api"], ["--service=production"], [environmentReference]]) {
    assert.deepEqual(runPilotConfigurationCli(args, {}), {
      exitCode: 1, stdout: "", stderr: "Pilot configuration: INVALID_ARGUMENTS\n",
    });
  }
  assert.throws(() => inspectPilotConfiguration("production", {}), /SERVICE_INVALID/);
  for (const invalid of [null, undefined, [], "staging"]) {
    assert.throws(() => inspectPilotConfiguration("api", invalid), /INPUT_INVALID/);
  }
});

test("real CLI terminates with a bounded redacted report without provider configuration", () => {
  for (const service of services) {
    const result = spawnSync(process.execPath, [command.pathname, `--service=${service}`], {
      env: {}, encoding: "utf8", timeout: 10_000, maxBuffer: 64_000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    const report = JSON.parse(result.stdout);
    assert.equal(report.service, service);
    assert.equal(report.status, "blocked");
    assert.equal(report.liveReadinessVerified, false);
  }
});
