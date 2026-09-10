#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  contentRoot,
  pretty,
  readRegularFileNoFollow,
  sha256Bytes,
} from './b0-v8-core.mjs';
import {
  REVIEW_PROTOCOL_FINDINGS,
  REVIEW_ROLE_SLOTS,
  REVIEW_VALIDATOR_IDS,
  evaluateCurrentReviewProtocolState,
  runReviewProtocolMutationCampaign,
} from './review-protocol-v1-10-core.mjs';

const DATE = '2026-08-30';
const PACKAGE_DIR = `docs/planning/three-review-protocol-v1-10-g1-package-${DATE}`;
const OUTPUTS = Object.freeze({
  subject: `${PACKAGE_DIR}/subject.md`,
  registry: `${PACKAGE_DIR}/normative-registry.json`,
  sourceIndex: `${PACKAGE_DIR}/frozen-source-index.json`,
  crosswalk: `${PACKAGE_DIR}/closure-crosswalk.json`,
  corpus: `${PACKAGE_DIR}/mutation-corpus.json`,
  manifest: `${PACKAGE_DIR}/normative-package-manifest.json`,
  producerQa: `${PACKAGE_DIR}/producer-qa.json`,
});
const SOURCE_PATHS = Object.freeze([
  `docs/planning/three-review-protocol-v1-9-package-${DATE}/subject.md`,
  `docs/planning/three-review-protocol-v1-9-package-${DATE}/normative-package-manifest.json`,
  `docs/planning/three-review-protocol-v1-9-package-${DATE}/governance.json`,
  `docs/planning/three-review-protocol-v1-9-package-${DATE}/external-evidence-contracts.json`,
  `docs/planning/three-review-protocol-v1-9-package-${DATE}/cas-recovery-contract.json`,
  `docs/planning/three-review-protocol-v1-9-package-${DATE}/schemas.json`,
  `docs/planning/three-review-protocol-v1-9-independent-hostile-review-${DATE}.md`,
  `docs/planning/three-review-protocol-v1-9-independent-hostile-review-findings-manifest-${DATE}.md`,
  `docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-atomic-package-manifest-${DATE}.json`,
  `docs/planning/connect-all-remaining-work-execution-plan-${DATE}.md`,
  'scripts/b0-v8-core.mjs',
]);
const TOOL_MEMBERS = Object.freeze([
  ['MPRRV110-B0-CORE-DEPENDENCY', 'scripts/b0-v8-core.mjs'],
  ['MPRRV110-CORE', 'scripts/review-protocol-v1-10-core.mjs'],
  ['MPRRV110-BUILDER', 'scripts/create-review-protocol-v1-10-candidate.mjs'],
  ['MPRRV110-READER-A', 'scripts/verify-review-protocol-v1-10-candidate.mjs'],
  ['MPRRV110-READER-B', 'scripts/verify-review-protocol-v1-10-candidate.py'],
  ['MPRRV110-TESTS', 'tests/review-protocol-v1-10-core.test.mjs'],
]);

function runGit(args) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

function assertCleanInput() {
  if (!fs.existsSync('.git') || !fs.existsSync('package.json')) throw new Error('run from repository root');
  if (runGit(['status', '--porcelain=v1', '--untracked-files=all']) !== '') throw new Error('Protocol v1.10 builder requires a clean worktree');
  for (const logicalPath of Object.values(OUTPUTS)) if (fs.existsSync(logicalPath)) throw new Error(`immutable output exists: ${logicalPath}`);
}

function patchFor(logicalPath, content) {
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `*** Add File: ${logicalPath}\n${lines.map((line) => `+${line}`).join('\n')}\n`;
}

function emitPatch(files) {
  process.stdout.write(`*** Begin Patch\n${files.map(([logicalPath, content]) => patchFor(logicalPath, content)).join('')}*** End Patch\n`);
}

function buildRegistry() {
  const externalByFinding = {
    'MPRR-V19-IHR-F001': ['INDEPENDENT-CLOSURE-EXECUTION'],
    'MPRR-V19-IHR-F002': [],
    'MPRR-V19-IHR-F003': ['SEVEN-SIGNED-APPOINTMENTS'],
    'MPRR-V19-IHR-F004': ['APPROVED-SIGNATURE-ADAPTER', 'TRUSTED-TIME', 'REVOCATION'],
    'MPRR-V19-IHR-F005': ['TWO-INDEPENDENT-SCANNERS'],
    'MPRR-V19-IHR-F006': ['AUTHENTICATED-REMOTE-PUBLIC'],
    'MPRR-V19-IHR-F007': ['DURABLE-CAS-ADAPTER'],
    'MPRR-V19-IHR-F008': ['DURABLE-RECOVERY-ADAPTER'],
    'MPRR-V19-IHR-F009': ['INDEPENDENT-PREDECESSOR-ORACLE'],
    'MPRR-V19-IHR-F010': ['INDEPENDENT-SEMANTIC-RECEIPT'],
    'MPRR-V19-IHR-F011': ['OPERATION-INSTRUMENTATION'],
    'MPRR-V19-IHR-F012': [],
    'MPRR-V19-IHR-F013': [],
    'MPRR-V19-IHR-F014': [],
    'MPRR-V19-IHR-F015': ['SAFE-DESCRIPTOR-BOUND-REPORT-ADAPTER'],
    'MPRR-V19-IHR-F016': ['APPROVED-GLOBAL-ARTIFACT-BUDGET'],
    'MPRR-V19-IHR-F017': ['THREE-INDEPENDENT-REVIEWER-APPOINTMENTS'],
  };
  const controlRows = REVIEW_PROTOCOL_FINDINGS.map(([findingId, severity], index) => ({
    closureStatus: 'OPEN-PENDING-INDEPENDENT-EVIDENCE',
    controlId: `MPRRV110-CONTROL-${String(index + 1).padStart(3, '0')}`,
    externalEvidenceRequired: externalByFinding[findingId],
    findingId,
    localStatus: 'IMPLEMENTED-CANDIDATE',
    severity,
    testId: `MPRRV110-MUTATION-${String(index + 1).padStart(3, '0')}`,
  }));
  const receiptSchemaBase = {
    additionalProperties: false,
    nullableKeys: [],
    requiredKeys: ['evidenceClass', 'expiresAt', 'issuedAt', 'issuerAppointmentRoot', 'packageRoot', 'payloadRoot', 'receiptId', 'revocationHeadRoot', 'verificationArtifactRoot', 'verificationReceiptRoot'],
    schemaId: 'MPRRV110-EVIDENCE-RECEIPT-SCHEMA',
  };
  return {
    algorithmPolicy: { approvedAlgorithms: [], keyGenerationPerformed: false, selectionState: 'UNSELECTED-PER-USE-APPROVAL-REQUIRED' },
    artifactClass: 'IMMUTABLE-PLANNING-CANDIDATE-NOT-AUTHORITY-NOT-ACCEPTANCE',
    artifactId: 'MPRR-V1-10-NORMATIVE-REGISTRY-2026-08-30-G1',
    controlRows,
    currentState: evaluateCurrentReviewProtocolState(),
    externalEvidence: { externalClosureCount: 0, independentReviewerEvidencePresent: false, operationalEvidencePresent: false },
    growthPolicy: { admission: 'DENIED-UNTIL-APPROVED-GLOBAL-BUDGET', duplicateBytesMustBeDerived: true, globalBudgetPresent: false },
    ownerModel: { ownerCount: 1, primaryBackupModel: 'REMOVED', workOwner: 'Tal' },
    receiptSchema: { ...receiptSchemaBase, schemaRoot: contentRoot('MPRR-V1-10-CLOSED-SCHEMA-V1', receiptSchemaBase) },
    reportPolicy: { safeDescriptorBoundAdapterPresent: false, writesAllowed: false },
    repositoryVisibility: 'PUBLIC',
    roleSlots: [...REVIEW_ROLE_SLOTS],
    schemaVersion: 'MPRR-V1-10-NORMATIVE-REGISTRY-V1',
    validatorIds: [...REVIEW_VALIDATOR_IDS],
  };
}

function buildSourceIndex(repositoryRoot) {
  const rows = SOURCE_PATHS.map((logicalPath, index) => {
    const fact = readRegularFileNoFollow(repositoryRoot, logicalPath, 50 * 1024 * 1024);
    return { bytes: fact.byteLength, logicalPath, mode: fact.mode, ordinal: index + 1, sha256: fact.sha256 };
  });
  const base = { artifactClass: 'FROZEN-GIT-SOURCE-INDEX-PLANNING-ONLY', artifactId: 'MPRR-V1-10-SOURCE-INDEX-2026-08-30-G1', repositoryVisibility: 'PUBLIC', rows, schemaVersion: 'MPRR-V1-10-SOURCE-INDEX-V1', sourceCount: rows.length };
  return { ...base, sourceSetRoot: contentRoot('MPRR-V1-10-SOURCE-SET-V1', rows) };
}

function buildCrosswalk(registry) {
  const rows = registry.controlRows.map((row, index) => ({ ...row, ordinal: index + 1 }));
  const base = { artifactClass: 'ONE-TO-ONE-FINDING-CONTROL-CROSSWALK', artifactId: 'MPRR-V1-10-CROSSWALK-2026-08-30-G1', closureCount: 0, findingCount: rows.length, inheritedFindingCount: 40, inheritedIndependentMechanicalClosureCount: 1, repositoryVisibility: 'PUBLIC', rows, schemaVersion: 'MPRR-V1-10-CROSSWALK-V1' };
  return { ...base, crosswalkRoot: contentRoot('MPRR-V1-10-CROSSWALK-V1', base) };
}

function buildCorpus() {
  const cases = runReviewProtocolMutationCampaign();
  const base = { artifactClass: 'DETERMINISTIC-PROTOCOL-MUTATION-CORPUS-NO-BUSINESS-DATA', artifactId: 'MPRR-V1-10-MUTATION-CORPUS-2026-08-30-G1', blockedCount: cases.length, caseCount: cases.length, cases, repositoryVisibility: 'PUBLIC', schemaVersion: 'MPRR-V1-10-MUTATION-CORPUS-V1' };
  return { ...base, corpusRoot: contentRoot('MPRR-V1-10-MUTATION-CORPUS-V1', base) };
}

function renderSubject(sourceCommit, registry, sourceIndex, crosswalk, corpus) {
  const rows = registry.controlRows.map((row, index) => `${index + 1}. ${row.findingId} (${row.severity}) — ${REVIEW_PROTOCOL_FINDINGS[index][2]}; local=${row.localStatus}; closure=${row.closureStatus}; external=${row.externalEvidenceRequired.length === 0 ? 'none' : row.externalEvidenceRequired.join(',')}.`);
  return `# 1. Connect — Three-review Protocol v1.10 G1 immutable Candidate\n\n## 1.1 מצב\n\n1.1.1 Input commit=\`${sourceCommit}\`; repository=\`PUBLIC\`.\n\n1.1.2 זהו Candidate תכנוני, לא Authority, לא Acceptance, לא Permit ולא הרשאה להסיר את Development freeze.\n\n1.1.3 Tal הוא Owner יחיד של העבודה; Primary/Backup הוסרו. דרישת הפרדת שבעה תפקידי בקרה נשארת חסומה עד Appointments חיצוניים אמיתיים.\n\n1.1.4 מצב אמיתי: Acceptance=0; authorityOutputs=0; B0=ABSENT; Gate29=BLOCKED; developmentFreeze=ACTIVE.\n\n## 2. מנגנון מקומי\n\n2.1 מסלול Protocol vector סגור מריץ 15 Validators על Evidence typed. הוא יכול להחזיר רק ELIGIBLE-PLANNING-VECTOR-NOT-AUTHORITY.\n\n2.2 שלוש מחלקות ביקורת הן חובה ובסדר סגור: Structural, Semantic/Security, Estimate/Schedule.\n\n2.3 מסלול אמיתי חסום כאשר Appointments, signatures, scanners, remote PUBLIC, durable CAS/Recovery, trusted time, שלוש ביקורות, reconciliation או human approval חסרים.\n\n2.4 לא נבחר אלגוריתם חתימה, לא נוצר Key ולא הופקה אקראיות קריפטוגרפית.\n\n2.5 Report writes חסומים עד Adapter descriptor-bound בטוח; growth admission חסום עד תקציב גלובלי מאושר.\n\n2.6 כל תלות קוד טרנזיטיבית, לרבות b0-v8-core.mjs, מופיעה ב־Manifest וב־Source index.\n\n## 3. בקרות 17 הממצאים\n\n${rows.join('\n\n')}\n\n## 4. מונים\n\n4.1 Validators=15/15 במסלול Protocol vector; Mutations blocked=${corpus.blockedCount}/${corpus.caseCount}.\n\n4.2 Sources=${sourceIndex.sourceCount}; sourceSetRoot=\`${sourceIndex.sourceSetRoot}\`.\n\n4.3 Local controls=${crosswalk.findingCount}; independent closure=${crosswalk.closureCount}/${crosswalk.findingCount}; inherited mechanical closure=1/40.\n\n## 5. כלל סיום\n\n5.1 Producer QA ו־Cross-runtime Readers אינם ביקורת עצמאית ואינם יוצרים Acceptance.\n`;
}

function member(role, logicalPath, content) {
  const bytes = Buffer.from(content, 'utf8');
  return { bytes: bytes.length, logicalPath, role, sha256: sha256Bytes(bytes) };
}

function build() {
  assertCleanInput();
  const repositoryRoot = process.cwd();
  const sourceCommit = runGit(['rev-parse', 'HEAD']);
  const generatedAt = new Date(runGit(['show', '-s', '--format=%cI', sourceCommit])).toISOString().replace('.000Z', 'Z');
  const registry = buildRegistry();
  const sourceIndex = buildSourceIndex(repositoryRoot);
  const crosswalk = buildCrosswalk(registry);
  const corpus = buildCorpus();
  const subject = renderSubject(sourceCommit, registry, sourceIndex, crosswalk, corpus);
  const generated = new Map([[OUTPUTS.subject, subject], [OUTPUTS.registry, pretty(registry)], [OUTPUTS.sourceIndex, pretty(sourceIndex)], [OUTPUTS.crosswalk, pretty(crosswalk)], [OUTPUTS.corpus, pretty(corpus)]]);
  const memberDrafts = [
    member('MPRRV110-SUBJECT', OUTPUTS.subject, generated.get(OUTPUTS.subject)),
    member('MPRRV110-REGISTRY', OUTPUTS.registry, generated.get(OUTPUTS.registry)),
    member('MPRRV110-SOURCE-INDEX', OUTPUTS.sourceIndex, generated.get(OUTPUTS.sourceIndex)),
    member('MPRRV110-CROSSWALK', OUTPUTS.crosswalk, generated.get(OUTPUTS.crosswalk)),
    member('MPRRV110-CORPUS', OUTPUTS.corpus, generated.get(OUTPUTS.corpus)),
    ...TOOL_MEMBERS.map(([role, logicalPath]) => { const fact = readRegularFileNoFollow(repositoryRoot, logicalPath, 10 * 1024 * 1024); return { bytes: fact.byteLength, logicalPath, role, sha256: fact.sha256 }; }),
  ];
  const members = memberDrafts.map((row, index) => ({ ...row, ordinal: index + 1 }));
  const packageId = 'MPRR-V1-10-IMMUTABLE-CANDIDATE-PACKAGE-2026-08-30-G1';
  const projection = { members, packageId, sourceCommit };
  const manifest = { artifactClass: 'IMMUTABLE-PLANNING-PACKAGE-MANIFEST-NOT-ACCEPTANCE', artifactId: 'MPRR-V1-10-MANIFEST-2026-08-30-G1', generatedAt, maxMemberBytesExclusive: 10 * 1024 * 1024, maxTotalBytesInclusive: 25 * 1024 * 1024, memberCount: members.length, members, packageContentRoot: contentRoot('MPRR-V1-10-PACKAGE-CONTENT-V1', projection), packageId, repositoryVisibility: 'PUBLIC', schemaVersion: 'MPRR-V1-10-PACKAGE-MANIFEST-V1', sourceCommit, totalBytes: members.reduce((sum, row) => sum + row.bytes, 0) };
  const qaBase = { artifactClass: 'PRODUCER-SELF-QA-NOT-INDEPENDENT-NOT-ACCEPTANCE', artifactId: 'MPRR-V1-10-PRODUCER-QA-2026-08-30-G1', externalClosureCount: 0, generatedAt, localControlCount: 17, mutationBlockedCount: corpus.blockedCount, packageContentRoot: manifest.packageContentRoot, result: 'PASS-LOCAL-CANDIDATE-NOT-ACCEPTED', sourceCommit, validatorCount: 15 };
  const producerQa = { ...qaBase, reportRoot: contentRoot('MPRR-V1-10-PRODUCER-QA-V1', qaBase) };
  generated.set(OUTPUTS.manifest, pretty(manifest)); generated.set(OUTPUTS.producerQa, pretty(producerQa));
  emitPatch([...generated.entries()]);
}

build();
