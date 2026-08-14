import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(
    new URL(relativePath, projectRoot),
    "utf8",
  );
}

test("keeps design tokens outside the global feature stylesheet", async () => {
  const [globalSource, tokenSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("styles/tokens.css"),
    ]);

  assert.match(
    globalSource,
    /@import "\.\.\/styles\/tokens\.css";/,
  );
  assert.doesNotMatch(globalSource, /:root\s*\{/);
  assert.match(tokenSource, /^:root\s*\{/);
  assert.match(tokenSource, /--ink:|--surface:|--shadow:/);
});

test("keeps document foundations in their ordered stylesheet", async () => {
  const [globalSource, foundationSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("styles/foundations.css"),
    ]);
  const tokenImport = globalSource.indexOf(
    '@import "../styles/tokens.css";',
  );
  const foundationImport = globalSource.indexOf(
    '@import "../styles/foundations.css";',
  );

  assert.ok(tokenImport >= 0);
  assert.ok(foundationImport > tokenImport);
  assert.doesNotMatch(globalSource, /box-sizing:\s*border-box/);
  assert.match(foundationSource, /\*\s*\{[\s\S]*box-sizing:\s*border-box/);
  assert.match(foundationSource, /body\s*\{[\s\S]*background:\s*var\(--canvas\)/);
});
