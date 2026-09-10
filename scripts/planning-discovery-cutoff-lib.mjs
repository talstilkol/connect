import {
  execFileSync,
} from "node:child_process";
import {
  createHash,
} from "node:crypto";
import {
  readFile,
} from "node:fs/promises";
import {
  dirname,
  isAbsolute,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

export const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);

export const workspaceContainerRoot =
  dirname(projectRoot);

export const outputRegistryPath =
  "docs/planning/discovery-cutoff-output-path-registry-v1-2026-08-30.json";

const maximumGitOutputBytes =
  32 * 1024 * 1024;

function invalid(message) {
  const error = new Error(message);
  error.code = "INVALID_DISCOVERY_CUTOFF";
  return error;
}

export function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

export function canonicalJson(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw invalid(
        "canonical JSON rejects non-finite numbers",
      );
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((item) => canonicalJson(item))
      .join(",")}]`;
  }

  if (
    typeof value === "object" &&
    Object.getPrototypeOf(value) ===
      Object.prototype
  ) {
    const entries = Object.keys(value)
      .sort()
      .map((key) =>
        `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
      );
    return `{${entries.join(",")}}`;
  }

  throw invalid(
    "canonical JSON rejects unsupported values",
  );
}

export function domainDigest(
  domain,
  payload,
) {
  if (!/^[A-Z0-9._-]+$/.test(domain)) {
    throw invalid("invalid digest domain");
  }

  return sha256(
    Buffer.from(
      `${domain}\n${canonicalJson(payload)}`,
      "utf8",
    ),
  );
}

export function assertSafeRelativePath(
  candidate,
) {
  if (
    typeof candidate !== "string" ||
    candidate.length === 0 ||
    candidate.includes("\0") ||
    candidate.includes("\\") ||
    candidate.startsWith("file:") ||
    isAbsolute(candidate)
  ) {
    throw invalid("unsafe output path");
  }

  const normalized = normalize(candidate);
  if (
    normalized !== candidate ||
    normalized === ".." ||
    normalized.startsWith(`..${sep}`)
  ) {
    throw invalid("output path escapes repository");
  }

  return candidate;
}

export function assertExactKeys(
  value,
  expectedKeys,
  label,
) {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length ||
    actual.some(
      (key, index) => key !== expected[index],
    )
  ) {
    throw invalid(`${label} has unknown or missing fields`);
  }
}

export function createEnvelope({
  schema,
  domain,
  payload,
}) {
  return Object.freeze({
    schema,
    payload,
    payloadSha256: domainDigest(
      domain,
      payload,
    ),
  });
}

export function verifyEnvelope({
  envelope,
  schema,
  domain,
}) {
  assertExactKeys(
    envelope,
    ["schema", "payload", "payloadSha256"],
    schema,
  );
  if (envelope.schema !== schema) {
    throw invalid(`unexpected schema for ${schema}`);
  }
  const expected = domainDigest(
    domain,
    envelope.payload,
  );
  if (envelope.payloadSha256 !== expected) {
    throw invalid(`payload digest mismatch for ${schema}`);
  }
  return true;
}

export function git(
  argumentsList,
  cwd = projectRoot,
) {
  return execFileSync(
    "git",
    argumentsList,
    {
      cwd,
      encoding: null,
      maxBuffer: maximumGitOutputBytes,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

export function parseNullSeparated(
  buffer,
) {
  if (buffer.byteLength === 0) {
    return [];
  }
  return buffer
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

export function rawSetObservation(
  buffer,
) {
  return Object.freeze({
    entryCount:
      parseNullSeparated(buffer).length,
    rawSha256: sha256(buffer),
  });
}

export function assertRfc3339(
  value,
  label,
) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw invalid(`${label} must be explicit UTC RFC3339 time`);
  }
  return value;
}

export async function readOutputRegistry() {
  const absolutePath = resolve(
    projectRoot,
    outputRegistryPath,
  );
  const registry = JSON.parse(
    await readFile(absolutePath, "utf8"),
  );
  assertExactKeys(
    registry,
    [
      "schema",
      "version",
      "owner",
      "outputDirectory",
      "outputPaths",
    ],
    "output registry",
  );
  if (
    registry.schema !==
      "CONNECT-DISCOVERY-CUTOFF-OUTPUT-PATH-REGISTRY-V1" ||
    registry.version !== 1 ||
    registry.owner !== "Tal"
  ) {
    throw invalid("unsupported output registry");
  }
  assertSafeRelativePath(
    registry.outputDirectory,
  );
  if (
    !Array.isArray(registry.outputPaths) ||
    registry.outputPaths.length !== 4 ||
    new Set(registry.outputPaths).size !==
      registry.outputPaths.length
  ) {
    throw invalid("output registry must contain four unique paths");
  }
  registry.outputPaths.forEach((path) => {
    assertSafeRelativePath(path);
    if (
      !path.startsWith(
        `${registry.outputDirectory}/`,
      )
    ) {
      throw invalid("output is outside declared directory");
    }
  });
  return Object.freeze({
    ...registry,
    outputPaths: Object.freeze([
      ...registry.outputPaths,
    ]),
  });
}

export function toWorkspaceLabel(
  absolutePath,
) {
  const relativePath = relative(
    workspaceContainerRoot,
    absolutePath,
  );
  if (relativePath === ".git") {
    return "workspace-container";
  }
  if (relativePath === "web/.git") {
    return "product-repository";
  }
  return `other-nested-${sha256(
    Buffer.from(relativePath, "utf8"),
  ).slice(0, 16)}`;
}

export function jsonBytes(value) {
  return Buffer.from(
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

export function repoAbsolutePath(
  relativePath,
) {
  assertSafeRelativePath(relativePath);
  const absolutePath = resolve(
    projectRoot,
    relativePath,
  );
  const relativeCheck = relative(
    projectRoot,
    absolutePath,
  );
  if (
    relativeCheck.startsWith(`..${sep}`) ||
    relativeCheck === ".."
  ) {
    throw invalid("resolved path escaped repository");
  }
  return absolutePath;
}
