import {
  constants,
} from "node:fs";
import {
  open,
} from "node:fs/promises";
import {
  isAbsolute,
} from "node:path";

const maximumSupportedFileBytes =
  1_048_576;

export class TrustedEvidenceFileError
  extends Error {
  constructor(code) {
    super(code);
    this.name = "TrustedEvidenceFileError";
    this.code = code;
  }
}

function fail(code) {
  throw new TrustedEvidenceFileError(code);
}

function isObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return (
    actual.length === expected.length &&
    actual.every(
      (key, index) => key === expected[index],
    )
  );
}

function requireConfiguration(value) {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "filePath",
      "maximumFileBytes",
    ]) ||
    !Number.isInteger(constants.O_NOFOLLOW) ||
    typeof process.getuid !== "function" ||
    typeof value.filePath !== "string" ||
    value.filePath.length === 0 ||
    value.filePath.length > 4_096 ||
    value.filePath.includes("\0") ||
    !isAbsolute(value.filePath) ||
    !Number.isSafeInteger(
      value.maximumFileBytes,
    ) ||
    value.maximumFileBytes < 1 ||
    value.maximumFileBytes >
      maximumSupportedFileBytes
  ) {
    fail("TRUSTED_EVIDENCE_FILE_CONFIGURATION_INVALID");
  }

  return value;
}

function requireMetadata(value, maximumFileBytes) {
  if (
    !value.isFile() ||
    value.nlink !== 1 ||
    value.uid !== process.getuid() ||
    (value.mode & 0o022) !== 0 ||
    value.size < 1 ||
    value.size > maximumFileBytes
  ) {
    fail("TRUSTED_EVIDENCE_FILE_INVALID");
  }
}

function hasUnchangedMetadata(before, after) {
  return [
    "dev",
    "ino",
    "mode",
    "nlink",
    "uid",
    "size",
    "mtimeMs",
    "ctimeMs",
  ].every((key) => before[key] === after[key]);
}

async function readBoundedFile(
  file,
  maximumFileBytes,
) {
  const buffer = Buffer.alloc(
    maximumFileBytes + 1,
  );
  let bytesRead = 0;

  while (bytesRead < buffer.length) {
    const result = await file.read(
      buffer,
      bytesRead,
      buffer.length - bytesRead,
      null,
    );

    if (result.bytesRead === 0) {
      break;
    }

    bytesRead += result.bytesRead;
  }

  if (
    bytesRead === 0 ||
    bytesRead > maximumFileBytes
  ) {
    fail("TRUSTED_EVIDENCE_FILE_INVALID");
  }

  try {
    return new TextDecoder("utf-8", {
      fatal: true,
    }).decode(buffer.subarray(0, bytesRead));
  } catch {
    fail("TRUSTED_EVIDENCE_FILE_INVALID");
  }
}

export async function readTrustedEvidenceFile(
  rawConfiguration,
) {
  const configuration =
    requireConfiguration(rawConfiguration);
  let file;

  try {
    file = await open(
      configuration.filePath,
      constants.O_RDONLY |
        constants.O_NOFOLLOW,
    );
  } catch {
    fail("TRUSTED_EVIDENCE_FILE_INVALID");
  }

  try {
    const before = await file.stat();
    requireMetadata(
      before,
      configuration.maximumFileBytes,
    );
    const text = await readBoundedFile(
      file,
      configuration.maximumFileBytes,
    );
    const after = await file.stat();

    if (!hasUnchangedMetadata(before, after)) {
      fail("TRUSTED_EVIDENCE_FILE_INVALID");
    }

    return text;
  } finally {
    await file.close();
  }
}
