import { relative } from "node:path";

export function escapeRegularExpression(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

export function stripResourceSuffix(specifier) {
  const queryIndex = specifier.indexOf("?");
  const fragmentIndex = specifier.startsWith("#")
    ? -1
    : specifier.indexOf("#");
  const suffixIndexes = [
    queryIndex,
    fragmentIndex,
  ].filter((index) => index >= 0);

  return suffixIndexes.length === 0
    ? specifier
    : specifier.slice(0, Math.min(...suffixIndexes));
}

export function relativePath(root, file) {
  return relative(root, file).replaceAll(
    "\\",
    "/",
  );
}
