import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);

const checks = [
  {
    code: "RTL_DOCUMENT_REQUIRED",
    file: "app/layout.tsx",
    pattern:
      /<html\s+lang="he"\s+dir="rtl">/,
  },
  {
    code: "VISIBLE_FOCUS_REQUIRED",
    file: "app/globals.css",
    pattern: /:focus-visible/,
  },
  {
    code: "LINK_FOCUS_REQUIRED",
    file: "app/globals.css",
    pattern: /a:focus-visible/,
  },
  {
    code: "REDUCED_MOTION_REQUIRED",
    file: "app/globals.css",
    pattern:
      /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
  },
  {
    code: "MOBILE_BREAKPOINT_REQUIRED",
    file: "app/globals.css",
    pattern:
      /@media\s*\(max-width:\s*560px\)/,
  },
  {
    code: "TABLET_BREAKPOINT_REQUIRED",
    file: "app/globals.css",
    pattern:
      /@media\s*\(max-width:\s*820px\)/,
  },
  {
    code: "DESKTOP_BREAKPOINT_REQUIRED",
    file: "app/globals.css",
    pattern:
      /@media\s*\(max-width:\s*1100px\)/,
  },
  {
    code: "RESPONSIVE_OVERFLOW_REQUIRED",
    file: "app/globals.css",
    pattern: /overflow-x:\s*auto/,
  },
  {
    code: "MAIN_NAVIGATION_LABEL_REQUIRED",
    file: "features/workspace/WorkspaceApp.tsx",
    pattern:
      /<nav[^>]*aria-label="ניווט ראשי"/,
  },
  {
    code: "MOBILE_MENU_STATE_REQUIRED",
    file: "features/workspace/WorkspaceApp.tsx",
    pattern: /aria-expanded=\{mobileMenuOpen\}/,
  },
  {
    code: "SKIP_LINK_REQUIRED",
    file: "features/workspace/WorkspaceApp.tsx",
    pattern:
      /className="skip-link"[\s\S]{0,100}href="#workspace-content"/,
  },
  {
    code: "DIALOG_SEMANTICS_REQUIRED",
    file: "features/workspace/WorkspaceApp.tsx",
    pattern:
      /role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby=/,
  },
  {
    code: "DIALOG_ESCAPE_REQUIRED",
    file: "features/workspace/useAccessibleDialog.ts",
    pattern:
      /event\.key\s*===\s*["']Escape["']/,
  },
  {
    code: "DIALOG_FOCUS_TRAP_REQUIRED",
    file: "features/workspace/useAccessibleDialog.ts",
    pattern:
      /resolveFocusTrapTarget\(/,
  },
  {
    code: "UNAVAILABLE_ACTIONS_DISABLED",
    file: "features/workspace/WorkspaceApp.tsx",
    pattern:
      /aria-label="עזרה"[\s\S]{0,220}\bdisabled\b[\s\S]{0,300}aria-label="התראות"[\s\S]{0,220}\bdisabled\b/,
  },
];

export async function inspectInterfaceGuardrails(
  root = projectRoot,
) {
  const contents = new Map();
  const findings = [];

  for (const check of checks) {
    let source = contents.get(check.file);

    if (source === undefined) {
      source = await readFile(
        new URL(
          check.file,
          new URL(
            `file://${root.endsWith("/") ? root : `${root}/`}`,
          ),
        ),
        "utf8",
      );
      contents.set(check.file, source);
    }

    if (!check.pattern.test(source)) {
      findings.push({
        code: check.code,
        file: check.file,
      });
    }
  }

  return Object.freeze({
    status:
      findings.length === 0
        ? "passed"
        : "failed",
    checksRun: checks.length,
    findings: Object.freeze(findings),
  });
}

async function runCli() {
  const report =
    await inspectInterfaceGuardrails();

  if (report.status === "passed") {
    console.log(
      `Interface guardrails: PASS (${report.checksRun} checks)`,
    );
    return;
  }

  console.error(
    `Interface guardrails: FAIL (${report.findings.length} findings)`,
  );

  for (const finding of report.findings) {
    console.error(
      `[${finding.code}] ${finding.file}`,
    );
  }

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
