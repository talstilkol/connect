import { dirname, normalize, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalExistingPath } from "./file-discovery.mjs";
import { escapeRegularExpression, stripResourceSuffix } from "./paths.mjs";

export function resolvePackageTargetPath(
  manifestFile,
  target,
) {
  try {
    const manifestDirectoryUrl = pathToFileURL(
      `${dirname(manifestFile)}/`,
    );
    return fileURLToPath(
      new URL(target, manifestDirectoryUrl),
    );
  } catch {
    return null;
  }
}

function packageTargetPatternMatchesFile(
  manifestFile,
  target,
  file,
) {
  let decodedTarget;
  try {
    decodedTarget = decodeURIComponent(
      target.split(/[?#]/, 1)[0],
    );
  } catch {
    return false;
  }
  const patternParts = decodedTarget.split("*");
  if (patternParts.length < 2) return false;

  let pattern = escapeRegularExpression(
    patternParts[0],
  );
  for (
    let index = 1;
    index < patternParts.length;
    index += 1
  ) {
    pattern += index === 1 ? "(.*)" : "\\1";
    pattern += escapeRegularExpression(
      patternParts[index],
    );
  }

  const relativeFile = `./${relative(
    dirname(manifestFile),
    file,
  ).replaceAll("\\", "/")}`;
  return new RegExp(`^${pattern}$`, "u").test(
    relativeFile,
  );
}

export async function packageTargetPatternMatchesCanonicalFile(
  manifestFile,
  target,
  file,
  canonicalFile,
  canonicalSymbolicLinkByPath,
) {
  if (
    packageTargetPatternMatchesFile(
      manifestFile,
      target,
      file,
    )
  ) {
    return true;
  }

  let decodedTarget;
  try {
    decodedTarget = decodeURIComponent(
      stripResourceSuffix(target),
    );
  } catch {
    return false;
  }
  const wildcardIndex = decodedTarget.indexOf("*");
  if (wildcardIndex === -1) return false;

  const targetPathPattern = stripResourceSuffix(
    decodedTarget,
  );
  if (
    wildcardIndex < targetPathPattern.lastIndexOf("/")
  ) {
    return true;
  }

  const manifestDirectory = normalize(
    resolve(dirname(manifestFile)),
  );
  for (
    const [symbolicLinkPath, canonicalTarget] of
      canonicalSymbolicLinkByPath
  ) {
    if (
      symbolicLinkPath !== manifestDirectory &&
      !symbolicLinkPath.startsWith(
        `${manifestDirectory}/`,
      )
    ) {
      continue;
    }
    const canonicalRelativeFile = relative(
      canonicalTarget,
      canonicalFile,
    );
    if (
      canonicalRelativeFile === ".." ||
      canonicalRelativeFile.startsWith("../")
    ) {
      continue;
    }
    const aliasCandidate = canonicalRelativeFile === ""
      ? symbolicLinkPath
      : resolve(
        symbolicLinkPath,
        canonicalRelativeFile,
      );
    if (
      packageTargetPatternMatchesFile(
        manifestFile,
        target,
        aliasCandidate,
      )
    ) {
      return true;
    }
  }

  const staticPrefix = decodedTarget.slice(
    0,
    wildcardIndex,
  );
  const staticPrefixPath = resolve(
    dirname(manifestFile),
    staticPrefix,
  );
  const aliasDirectory = staticPrefix.endsWith("/")
    ? staticPrefixPath
    : dirname(staticPrefixPath);
  for (const symbolicLinkPath of
    canonicalSymbolicLinkByPath.keys()) {
    if (
      aliasDirectory === symbolicLinkPath ||
      aliasDirectory.startsWith(
        `${symbolicLinkPath}/`,
      )
    ) {
      return true;
    }
  }
  const canonicalAliasDirectory =
    await canonicalExistingPath(aliasDirectory);
  const canonicalRelativeFile = relative(
    canonicalAliasDirectory,
    canonicalFile,
  );
  if (
    canonicalRelativeFile === "" ||
    canonicalRelativeFile === ".." ||
    canonicalRelativeFile.startsWith(`..${"/"}`) ||
    resolve(
      canonicalAliasDirectory,
      canonicalRelativeFile,
    ) !== canonicalFile
  ) {
    return false;
  }

  return packageTargetPatternMatchesFile(
    manifestFile,
    target,
    resolve(aliasDirectory, canonicalRelativeFile),
  );
}
