import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const domainUrl = new URL(
  "../shared/domain/botFlowGraphDraft.ts",
  import.meta.url,
);
const compilerUrl = new URL(
  "../server/bot/botFlowGraphComposer.ts",
  import.meta.url,
);
const serviceUrl = new URL(
  "../server/bot/botFlowService.ts",
  import.meta.url,
);

test("keeps free-graph persistence identities behind the server compiler", async () => {
  const [domain, compiler] = await Promise.all([
    readFile(domainUrl, "utf8"),
    readFile(compilerUrl, "utf8"),
  ]);

  assert.match(
    compiler,
    /hasExactKeys\(input, \[\s*"name",\s*"keywords",\s*"matchMode",\s*"entryDraftNodeKey",\s*"nodes",\s*"expectedFlowVersion",/,
  );
  assert.match(
    compiler,
    /const nodes = canonicalGraphNodes\(draft\)/,
  );
  assert.match(
    compiler,
    /deriveBotFlowBlockKey\(\s*botFlowKey,\s*index \+ 1/,
  );
  assert.match(
    compiler,
    /deriveBotFlowOptionKey\(\s*blockKey,\s*optionIndex \+ 1/,
  );
  assert.match(
    domain,
    /draftNodeKey: string/,
  );
  assert.doesNotMatch(domain, /Math\.random\(/);
  assert.doesNotMatch(domain, /crypto\.randomUUID\(/);
  assert.doesNotMatch(compiler, /Math\.random\(/);
  assert.doesNotMatch(compiler, /crypto\.randomUUID\(/);
});

test("tries the bounded graph compiler before the legacy raw-definition contract", async () => {
  const service = await readFile(serviceUrl, "utf8");
  const graphCompilerPosition = service.indexOf(
    "compileKeywordGraphBotFlowComposerDraft",
    service.indexOf("async function parseSaveDraftRequest"),
  );
  const rawDefinitionPosition = service.indexOf(
    '"definition",',
    service.indexOf("async function parseSaveDraftRequest"),
  );

  assert.ok(graphCompilerPosition >= 0);
  assert.ok(rawDefinitionPosition >= 0);
  assert.ok(
    graphCompilerPosition < rawDefinitionPosition,
  );
});
