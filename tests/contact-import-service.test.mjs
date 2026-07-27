import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTACT_IMPORT_CHUNK_SIZE,
} from "../shared/domain/contactImportJob.ts";
import {
  ContactImportInputError,
  createContactImportService,
} from "../server/contacts/contactImportService.ts";

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function fixture() {
  const state = {
    job: {
      id: 31,
      tenantId: 7,
      idempotencyKey: "contact_import_v1_key",
      fileName: "contacts.csv",
      totalRows: 3,
      processedRows: 0,
      createdRows: 0,
      updatedRows: 0,
      unchangedRows: 0,
      rejectedRows: 0,
      duplicateRows: 0,
      status: "processing",
      createdByExternalUserId: "external-user-id",
      createdAt: "created-at",
      updatedAt: "updated-at",
      completedAt: null,
    },
    rows: [],
    contacts: new Map(),
  };

  const imports = {
    async startOrFind(input) {
      state.startInput = input;
      return state.job;
    },
    async findJob(tenantId, jobId) {
      state.findJobInput = { tenantId, jobId };
      return tenantId === 7 && jobId === 31 ? state.job : null;
    },
    async findRowBySource(tenantId, jobId, sourceRowNumber) {
      return (
        state.rows.find(
          (row) =>
            row.tenantId === tenantId &&
            row.jobId === jobId &&
            row.sourceRowNumber === sourceRowNumber,
        ) ?? null
      );
    },
    async findRowByPhoneFingerprint(
      tenantId,
      jobId,
      phoneFingerprint,
    ) {
      return (
        state.rows.find(
          (row) =>
            row.tenantId === tenantId &&
            row.jobId === jobId &&
            row.phoneFingerprint === phoneFingerprint,
        ) ?? null
      );
    },
    async recordAccepted(input) {
      const existing = state.contacts.get(input.profile.phoneNumber);
      const contact = {
        id: existing?.id ?? state.contacts.size + 1,
        tenantId: input.tenantId,
        ...input.profile,
        mailingStatus: existing?.mailingStatus ?? "unsubscribed",
        consentStatus: existing?.consentStatus ?? "unknown",
        consentSource: existing?.consentSource ?? null,
        consentRecordedAt: existing?.consentRecordedAt ?? null,
        consentWithdrawnAt: existing?.consentWithdrawnAt ?? null,
        consentEvidenceReference:
          existing?.consentEvidenceReference ?? null,
        version: existing ? existing.version + 1 : 1,
        createdAt: existing?.createdAt ?? "created-at",
        updatedAt: "updated-at",
      };
      state.contacts.set(input.profile.phoneNumber, contact);
      state.rows.push({
        id: state.rows.length + 1,
        tenantId: input.tenantId,
        jobId: input.jobId,
        sourceRowNumber: input.sourceRowNumber,
        contactId: contact.id,
        phoneFingerprint: input.phoneFingerprint,
        status: input.status,
        reason: null,
      });
    },
    async recordRejected(
      tenantId,
      jobId,
      sourceRowNumber,
      reason,
    ) {
      state.rows.push({
        id: state.rows.length + 1,
        tenantId,
        jobId,
        sourceRowNumber,
        contactId: null,
        phoneFingerprint: null,
        status: "rejected",
        reason,
      });
    },
    async recordDuplicate(
      tenantId,
      jobId,
      sourceRowNumber,
      contactId,
      phoneFingerprint,
    ) {
      state.rows.push({
        id: state.rows.length + 1,
        tenantId,
        jobId,
        sourceRowNumber,
        contactId,
        phoneFingerprint,
        status: "duplicate",
        reason: "duplicate_in_file",
      });
    },
    async refreshJob() {
      const count = (status) =>
        state.rows.filter((row) => row.status === status).length;
      state.job = {
        ...state.job,
        processedRows: state.rows.length,
        createdRows: count("created"),
        updatedRows: count("updated"),
        unchangedRows: count("unchanged"),
        rejectedRows: count("rejected"),
        duplicateRows: count("duplicate"),
        status:
          state.rows.length === state.job.totalRows
            ? "completed"
            : "processing",
        completedAt:
          state.rows.length === state.job.totalRows
            ? "completed-at"
            : null,
      };
      return state.job;
    },
  };

  const contacts = {
    async saveProfile() {
      throw new Error("not used by import");
    },
    async findByTenantAndPhone(tenantId, phoneNumber) {
      const contact = state.contacts.get(phoneNumber) ?? null;
      return contact?.tenantId === tenantId ? contact : null;
    },
    async findByTenantAndId() {
      return null;
    },
    async listByTenant() {
      return [];
    },
  };

  return {
    state,
    service: createContactImportService({
      contacts,
      imports,
    }),
  };
}

test("starts an idempotent tenant-scoped contact import", async () => {
  const testFixture = fixture();
  const result = await testFixture.service.start(session(), {
    fileName: " contacts.csv ",
    sourceDigest: "a".repeat(64),
    totalRows: 3,
    mapping: {
      phoneNumber: 0,
      firstName: 1,
      lastName: null,
      email: null,
      company: null,
    },
  });

  assert.equal(result.id, 31);
  assert.equal(testFixture.state.startInput.tenantId, 7);
  assert.equal(
    testFixture.state.startInput.createdByExternalUserId,
    "external-user-id",
  );
  assert.match(
    testFixture.state.startInput.idempotencyKey,
    /^contact_import_v1_[0-9a-f]{64}$/,
  );
});

test("classifies created, rejected, and duplicate rows without importing consent", async () => {
  const testFixture = fixture();
  const result = await testFixture.service.processChunk(session(), {
    jobId: 31,
    rows: [
      {
        sourceRowNumber: 2,
        phoneNumber: "+972501234567",
        firstName: "contact-name",
        lastName: "",
        email: "",
        company: "",
      },
      {
        sourceRowNumber: 3,
        phoneNumber: "0501234567",
        firstName: "",
        lastName: "",
        email: "",
        company: "",
      },
      {
        sourceRowNumber: 4,
        phoneNumber: "+972501234567",
        firstName: "different-name-is-ignored-for-duplicate-row",
        lastName: "",
        email: "",
        company: "",
      },
    ],
  });

  assert.equal(result.job.status, "completed");
  assert.equal(result.job.createdRows, 1);
  assert.equal(result.job.rejectedRows, 1);
  assert.equal(result.job.duplicateRows, 1);
  assert.equal(result.contacts.length, 1);
  assert.equal(result.contacts[0].mailingStatus, "unsubscribed");
  assert.equal(result.contacts[0].consentStatus, "unknown");
});

test("skips already-recorded source rows on a retried chunk", async () => {
  const testFixture = fixture();
  const row = {
    sourceRowNumber: 2,
    phoneNumber: "+972501234567",
    firstName: "",
    lastName: "",
    email: "",
    company: "",
  };

  await testFixture.service.processChunk(session(), {
    jobId: 31,
    rows: [row],
  });
  await testFixture.service.processChunk(session(), {
    jobId: 31,
    rows: [row],
  });

  assert.equal(testFixture.state.rows.length, 1);
  assert.equal(testFixture.state.contacts.size, 1);
});

test("rejects oversized chunks and viewer writes before repository access", async () => {
  const oversizedFixture = fixture();
  const oversizedRows = Array.from(
    { length: CONTACT_IMPORT_CHUNK_SIZE + 1 },
    (_, index) => ({
      sourceRowNumber: index + 2,
      phoneNumber: "+972501234567",
      firstName: "",
      lastName: "",
      email: "",
      company: "",
    }),
  );

  await assert.rejects(
    oversizedFixture.service.processChunk(session(), {
      jobId: 31,
      rows: oversizedRows,
    }),
    (error) =>
      error instanceof ContactImportInputError &&
      error.issue === "chunk-too-large",
  );
  await assert.rejects(
    fixture().service.start(session("viewer"), {
      fileName: "contacts.csv",
      sourceDigest: "a".repeat(64),
      totalRows: 1,
      mapping: {
        phoneNumber: 0,
        firstName: null,
        lastName: null,
        email: null,
        company: null,
      },
    }),
    (error) => error.code === "PERMISSION_DENIED",
  );
});
