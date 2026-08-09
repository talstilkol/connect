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

export class PrivateSecretFileError
  extends Error {
  constructor(code) {
    super(code);
    this.name = "PrivateSecretFileError";
    this.code = code;
  }
}

function fail(code) {
  throw new PrivateSecretFileError(code);
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
    fail("PRIVATE_SECRET_FILE_CONFIGURATION_INVALID");
  }

  return Object.freeze({
    filePath: value.filePath,
    maximumFileBytes:
      value.maximumFileBytes,
  });
}

function requireFileMetadata(
  value,
  maximumFileBytes,
) {
  if (
    !value.isFile() ||
    value.nlink !== 1 ||
    (value.mode & 0o777) !== 0o600 ||
    value.uid !== process.getuid() ||
    value.size < 1 ||
    value.size > maximumFileBytes
  ) {
    fail("PRIVATE_SECRET_FILE_INVALID");
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
    fail("PRIVATE_SECRET_FILE_INVALID");
  }

  try {
    return new TextDecoder("utf-8", {
      fatal: true,
    }).decode(buffer.subarray(0, bytesRead));
  } catch {
    fail("PRIVATE_SECRET_FILE_INVALID");
  }
}

export async function readPrivateSecretFile(
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
    fail("PRIVATE_SECRET_FILE_INVALID");
  }

  try {
    const before = await file.stat();
    requireFileMetadata(
      before,
      configuration.maximumFileBytes,
    );
    const rawValue = await readBoundedFile(
      file,
      configuration.maximumFileBytes,
    );
    const after = await file.stat();

    if (
      !hasUnchangedMetadata(before, after)
    ) {
      fail("PRIVATE_SECRET_FILE_INVALID");
    }

    return rawValue;
  } finally {
    await file.close();
  }
}
