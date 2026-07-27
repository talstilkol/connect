import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);

export async function inspectDependencyLock(
  root = projectRoot,
) {
  const [packageText, lockText] =
    await Promise.all([
      readFile(
        new URL(
          "package.json",
          new URL(
            `file://${root.endsWith("/") ? root : `${root}/`}`,
          ),
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "package-lock.json",
          new URL(
            `file://${root.endsWith("/") ? root : `${root}/`}`,
          ),
        ),
        "utf8",
      ),
    ]);
  const packageJson = JSON.parse(packageText);
  const lock = JSON.parse(lockText);
  const rootPackage = lock.packages?.[""];
  const findings = [];

  for (const dependencyType of [
    "dependencies",
    "devDependencies",
  ]) {
    const declared =
      packageJson[dependencyType] ?? {};
    const locked =
      rootPackage?.[dependencyType] ?? {};

    if (
      JSON.stringify(declared) !==
      JSON.stringify(locked)
    ) {
      findings.push({
        code: "LOCK_ROOT_MISMATCH",
        dependencyType,
      });
      continue;
    }

    for (const [name, version] of Object.entries(
      declared,
    )) {
      const entry =
        lock.packages?.[`node_modules/${name}`];

      if (
        !entry ||
        entry.version !== version ||
        typeof entry.integrity !== "string" ||
        !entry.integrity.startsWith("sha512-")
      ) {
        findings.push({
          code: "LOCK_ENTRY_INVALID",
          dependencyType,
        });
        break;
      }
    }
  }

  return Object.freeze({
    status:
      findings.length === 0
        ? "passed"
        : "failed",
    dependencyCount:
      Object.keys(
        packageJson.dependencies ?? {},
      ).length +
      Object.keys(
        packageJson.devDependencies ?? {},
      ).length,
    findings: Object.freeze(findings),
  });
}

async function runCli() {
  const report =
    await inspectDependencyLock();

  if (report.status === "passed") {
    console.log(
      `Dependency lock: PASS (${report.dependencyCount} direct dependencies)`,
    );
    return;
  }

  console.error(
    `Dependency lock: FAIL (${report.findings.length} findings)`,
  );
  process.exitCode = 1;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(
        `file://${process.argv[1]}`,
      ),
    )
) {
  await runCli();
}
