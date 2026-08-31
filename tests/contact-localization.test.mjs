import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  contactActionFailureStatuses,
  readContactDirectoryMessages,
} from "../features/contacts/contactDirectoryMessages.ts";
import {
  contactImportActionFailureStatuses,
  contactImportSourceErrorCodes,
  readContactImportMessages,
} from "../features/contacts/contactImportMessages.ts";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(new URL(relativePath, projectRoot), "utf8");
}

test("keeps every contact directory message complete in all workspace languages", () => {
  assert.equal(contactActionFailureStatuses.length, 8);

  for (const language of ["he", "en", "ar"]) {
    const messages = readContactDirectoryMessages(language);

    assert.equal(
      Object.keys(messages.directory.feedback.failures).length,
      contactActionFailureStatuses.length,
    );
    assert.equal(
      Object.keys(messages.directory.feedback.loadFailures).length,
      contactActionFailureStatuses.length,
    );
    assert.equal(
      Object.keys(messages.organization.failures).length,
      contactActionFailureStatuses.length,
    );
    assert.ok(
      contactActionFailureStatuses.every(
        (status) =>
          messages.directory.feedback.failures[status].trim().length > 0 &&
          messages.directory.feedback.loadFailures[status].trim().length >
            0 &&
          messages.organization.failures[status].trim().length > 0,
      ),
    );
    assert.match(messages.directory.loaded(0), /0/);
    assert.match(messages.organization.contactCount(0), /0/);
  }

  assert.equal(
    readContactDirectoryMessages("en").page.title,
    "Contacts",
  );
  assert.equal(
    readContactDirectoryMessages("ar").page.title,
    "جهات الاتصال",
  );
});

test("localizes every contact import field and bounded failure code", () => {
  assert.equal(contactImportSourceErrorCodes.length, 21);
  assert.equal(contactImportActionFailureStatuses.length, 9);

  for (const language of ["he", "en", "ar"]) {
    const messages = readContactImportMessages(language);

    assert.equal(Object.keys(messages.fields).length, 8);
    assert.equal(
      Object.keys(messages.sourceFailures).length,
      contactImportSourceErrorCodes.length,
    );
    assert.equal(
      Object.keys(messages.actionFailures).length,
      contactImportActionFailureStatuses.length,
    );
    assert.ok(
      Object.values(messages.fields).every(
        (label) => label.trim().length > 0,
      ),
    );
    assert.ok(
      contactImportSourceErrorCodes.every(
        (code) => messages.sourceFailures[code].trim().length > 0,
      ),
    );
    assert.ok(
      contactImportActionFailureStatuses.every(
        (status) => messages.actionFailures[status].trim().length > 0,
      ),
    );
    assert.match(messages.mapping.rowsFound(0), /0/);
    assert.match(messages.commit.processing(0, 0), /0\/0/);
  }

  assert.equal(
    readContactImportMessages("en").source.chooseTitle,
    "Choose a contact file",
  );
  assert.equal(
    readContactImportMessages("ar").source.chooseTitle,
    "اختيار ملف جهات اتصال",
  );
});

test("passes the workspace language through every contact feature boundary", async () => {
  const [section, directory, organization, contactImport] =
    await Promise.all([
      readSource("features/workspace/WorkspaceSectionContent.tsx"),
      readSource("features/contacts/ContactDirectory.tsx"),
      readSource("features/contacts/ContactOrganization.tsx"),
      readSource("features/contacts/ContactImport.tsx"),
    ]);

  assert.match(
    section,
    /<Contacts[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(
    section,
    /<ContactDirectory[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(
    directory,
    /readContactDirectoryMessages\(language\)/,
  );
  assert.match(
    directory,
    /<ContactOrganization[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(
    directory,
    /<ContactImport[\s\S]{0,80}language=\{language\}/,
  );
  assert.match(
    organization,
    /readContactDirectoryMessages\(language\)\.organization/,
  );
  assert.match(
    contactImport,
    /readContactImportMessages\(language\)/,
  );
  assert.match(
    contactImport,
    /messages\.sourceFailures\[caughtError\.code\]/,
  );

  for (const source of [directory, organization, contactImport]) {
    assert.doesNotMatch(source, /[\u0590-\u05ff]/);
  }
});
