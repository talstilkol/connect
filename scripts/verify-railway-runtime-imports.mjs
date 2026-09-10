// Load the production dependency graph without starting services or contacting providers.
if (process.argv.length !== 2) {
  console.error("Railway runtime imports: INVALID_ARGUMENTS");
  process.exitCode = 1;
} else {
  try {
    await import("../server/platform/railwayBullMqApiMain.ts");
    await import("../server/platform/railwayBullMqWorkerMain.ts");
    console.log("Railway runtime imports: PASS");
  } catch {
    console.error("Railway runtime imports: FAIL");
    process.exitCode = 1;
  }
}
