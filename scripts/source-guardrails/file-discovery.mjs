import { readdir, realpath, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { relativePath } from "./paths.mjs";

const sourceExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".mts",
]);
const ignoredSourceGraphDirectoryNames = new Set([
  ".git",
  ".next",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
]);
export function isSourceFileExtension(extension) {
  return sourceExtensions.has(extension);
}

export async function listSourceFiles(
  directory,
  canonicalRoot = directory,
) {
  return listProjectFiles(
    directory,
    (name) => sourceExtensions.has(extname(name)),
    Object.freeze({
      canonicalRoot:
        await canonicalExistingPath(canonicalRoot),
      visitedCanonicalDirectories: new Set(),
    }),
  );
}

export async function listProjectFiles(
  directory,
  includesFile,
  traversal = undefined,
) {
  const canonicalDirectory =
    await canonicalExistingPath(directory);
  const state = traversal ?? Object.freeze({
    canonicalRoot: canonicalDirectory,
    visitedCanonicalDirectories: new Set(),
  });
  const canonicalRelativePath = relativePath(
    state.canonicalRoot,
    canonicalDirectory,
  );
  if (
    canonicalRelativePath === ".." ||
    canonicalRelativePath.startsWith("../") ||
    canonicalRelativePath.split("/").some((name) =>
      ignoredSourceGraphDirectoryNames.has(name)
    ) ||
    state.visitedCanonicalDirectories.has(canonicalDirectory)
  ) {
    return [];
  }
  const visitedCanonicalDirectories = new Set(
    state.visitedCanonicalDirectories,
  );
  visitedCanonicalDirectories.add(canonicalDirectory);
  const nestedTraversal = Object.freeze({
    canonicalRoot: state.canonicalRoot,
    visitedCanonicalDirectories,
  });
  let entries;
  try {
    entries = await readdir(directory, {
      withFileTypes: true,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (
        entry.isDirectory() &&
        !ignoredSourceGraphDirectoryNames.has(entry.name)
      ) {
        return listProjectFiles(
          path,
          includesFile,
          nestedTraversal,
        );
      }
      if (
        entry.isSymbolicLink() &&
        !ignoredSourceGraphDirectoryNames.has(entry.name)
      ) {
        let target;
        try {
          target = await stat(path);
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "ENOENT"
          ) {
            return [];
          }
          throw error;
        }
        if (target.isDirectory()) {
          return listProjectFiles(
            path,
            includesFile,
            nestedTraversal,
          );
        }
        return target.isFile() && includesFile(entry.name)
          ? [path]
          : [];
      }
      return entry.isFile() && includesFile(entry.name)
        ? [path]
        : [];
    }),
  );
  return nested.flat();
}

export async function listProjectSourceFiles(directory) {
  return listProjectFiles(
    directory,
    (name) => sourceExtensions.has(extname(name)),
  );
}

export async function listProjectPackageManifests(directory) {
  return listProjectFiles(
    directory,
    (name) => name === "package.json",
  );
}

export async function listImmediateSourceFiles(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  return entries
    .filter(
      (entry) =>
        (entry.isFile() || entry.isSymbolicLink()) &&
        sourceExtensions.has(extname(entry.name)),
    )
    .map((entry) => join(directory, entry.name));
}

export async function listSymbolicLinks(directory) {
  let entries;

  try {
    entries = await readdir(directory, {
      withFileTypes: true,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }

  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) return [path];
      if (
        entry.isDirectory() &&
        !ignoredSourceGraphDirectoryNames.has(
          entry.name,
        )
      ) {
        return listSymbolicLinks(path);
      }
      return [];
    }),
  );
  return nested.flat();
}

export async function canonicalExistingPath(file) {
  try {
    return normalize(await realpath(file));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return normalize(resolve(file));
    }
    throw error;
  }
}
