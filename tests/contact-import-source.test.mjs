import assert from "node:assert/strict";
import test from "node:test";

import { strToU8, zipSync } from "fflate";
import {
  ContactImportSourceError,
  parseContactImportSourceFile,
} from "../shared/contactImport/parseContactImportSource.ts";
import {
  CONTACT_IMPORT_MAX_FILE_BYTES,
} from "../shared/contactImport/sourcePolicy.ts";

const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

const rootRelationships = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

function workbookXml({ sheetCount = 1, hidden = false } = {}) {
  const sheets = Array.from({ length: sheetCount }, (_, index) => {
    const sheetNumber = index + 1;
    return `<sheet name="Contacts ${sheetNumber}" sheetId="${sheetNumber}" r:id="rId${sheetNumber}"${hidden && index === 0 ? ' state="hidden"' : ""}/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheets}</sheets>
</workbook>`;
}

function workbookRelationships(sheetCount = 1, external = false) {
  const worksheets = Array.from({ length: sheetCount }, (_, index) => {
    const sheetNumber = index + 1;
    return `<Relationship Id="rId${sheetNumber}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetNumber}.xml"/>`;
  }).join("");
  const externalRelationship = external
    ? '<Relationship Id="external" Type="external-link" Target="https://example.invalid/data" TargetMode="External"/>'
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${worksheets}${externalRelationship}
</Relationships>`;
}

function worksheetXml({ formula = false, dimension = "A1:B3" } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>phone</t></is></c>
      <c r="B1" t="inlineStr"><is><t>name</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="n"><v>972501234567</v></c>
      <c r="B2" t="inlineStr">${formula ? "<f>CONCAT(A2)</f>" : ""}<is><t>First contact</t></is></c>
    </row>
    <row r="3">
      <c r="A3" t="inlineStr"><is><t>+972509876543</t></is></c>
      <c r="B3" t="inlineStr"><is><t>Second contact</t></is></c>
    </row>
  </sheetData>
</worksheet>`;
}

function createXlsxBytes({
  formula = false,
  hidden = false,
  external = false,
  macro = false,
  sheetCount = 1,
  dimension = "A1:B3",
} = {}) {
  const entries = {
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRelationships),
    "xl/workbook.xml": strToU8(workbookXml({ sheetCount, hidden })),
    "xl/_rels/workbook.xml.rels": strToU8(
      workbookRelationships(sheetCount, external),
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      worksheetXml({ formula, dimension }),
    ),
  };

  if (sheetCount > 1) {
    entries["xl/worksheets/sheet2.xml"] = strToU8(worksheetXml());
  }

  if (macro) {
    entries["xl/vbaProject.bin"] = new Uint8Array([1, 2, 3]);
  }

  return zipSync(entries, {
    level: 6,
    mtime: new Date("2000-01-01T00:00:00.000Z"),
  });
}

function sourceFile(name, bytes, declaredSize = bytes.byteLength) {
  return {
    name,
    size: declaredSize,
    async arrayBuffer() {
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
    },
  };
}

async function assertSourceError(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof ContactImportSourceError);
    assert.equal(error.code, code);
    return true;
  });
}

test("parses a bounded XLSX into the existing contact row shape", async () => {
  const result = await parseContactImportSourceFile(
    sourceFile("contacts.xlsx", createXlsxBytes()),
  );

  assert.equal(result.format, "xlsx");
  assert.deepEqual(result.headers, ["phone", "name"]);
  assert.deepEqual(result.rows, [
    ["972501234567", "First contact"],
    ["+972509876543", "Second contact"],
  ]);
  assert.match(result.sourceDigest, /^[0-9a-f]{64}$/);
});

test("parses UTF-8 CSV through the same bounded source contract", async () => {
  const bytes = new TextEncoder().encode(
    "phone,name\n+972501234567,First contact\n",
  );
  const result = await parseContactImportSourceFile(
    sourceFile("contacts.csv", bytes),
  );

  assert.equal(result.format, "csv");
  assert.deepEqual(result.headers, ["phone", "name"]);
  assert.deepEqual(result.rows, [["+972501234567", "First contact"]]);
});

test("rejects legacy XLS, invalid UTF-8, and a file that changes while read", async () => {
  await assertSourceError(
    parseContactImportSourceFile(
      sourceFile("contacts.xls", new Uint8Array([1])),
    ),
    "unsupported-format",
  );
  await assertSourceError(
    parseContactImportSourceFile(
      sourceFile("contacts.csv", new Uint8Array([0xc3, 0x28])),
    ),
    "invalid-text-encoding",
  );
  await assertSourceError(
    parseContactImportSourceFile(
      sourceFile("contacts.csv", new Uint8Array([1, 2]), 3),
    ),
    "file-changed",
  );
  await assertSourceError(
    parseContactImportSourceFile(
      sourceFile(
        "contacts.csv",
        new Uint8Array([1]),
        CONTACT_IMPORT_MAX_FILE_BYTES + 1,
      ),
    ),
    "file-too-large",
  );
});

test("rejects formulas, macros, external links, and hidden sheets", async () => {
  await assertSourceError(
    parseContactImportSourceFile(
      sourceFile("formula.xlsx", createXlsxBytes({ formula: true })),
    ),
    "formula-not-allowed",
  );
  await assertSourceError(
    parseContactImportSourceFile(
      sourceFile("macro.xlsx", createXlsxBytes({ macro: true })),
    ),
    "macro-not-allowed",
  );
  await assertSourceError(
    parseContactImportSourceFile(
      sourceFile("external.xlsx", createXlsxBytes({ external: true })),
    ),
    "external-link-not-allowed",
  );
  await assertSourceError(
    parseContactImportSourceFile(
      sourceFile("hidden.xlsx", createXlsxBytes({ hidden: true })),
    ),
    "hidden-sheet-not-allowed",
  );
});

test("rejects multiple worksheets and dimensions that could exhaust memory", async () => {
  await assertSourceError(
    parseContactImportSourceFile(
      sourceFile("multiple.xlsx", createXlsxBytes({ sheetCount: 2 })),
    ),
    "single-sheet-required",
  );
  await assertSourceError(
    parseContactImportSourceFile(
      sourceFile(
        "wide.xlsx",
        createXlsxBytes({ dimension: "A1:CW3" }),
      ),
    ),
    "column-limit",
  );
  await assertSourceError(
    parseContactImportSourceFile(
      sourceFile(
        "large-dimension.xlsx",
        createXlsxBytes({ dimension: "A1:J50001" }),
      ),
    ),
    "dimension-limit",
  );
});
