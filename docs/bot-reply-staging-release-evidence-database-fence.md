# Bot reply staging release-evidence database fence

## 1. Current state

1.1 Migration `0044_bot_reply_staging_release_evidence_atomic_publish.sql`
adds one PostgreSQL function that performs the release-evidence compare-and-set
and the immutable operator-event write in one database statement.

1.2 The function is `SECURITY DEFINER`, uses a `pg_catalog`-only
`search_path`, qualifies every application table with `public`, and contains no
dynamic SQL.

1.3 Public execution is revoked. No application role receives execution
permission in the migration.

## 2. What is intentionally not claimed

2.1 Migration 0044 is expand-only. It does not wire the function into the
Railway runtime and does not authorize Bot reply staging activation.

2.2 Direct `INSERT`, `UPDATE`, or `DELETE` permissions on the release-evidence
tables are not changed. The current Railway database configuration does not
separate a migration owner from a restricted runtime role, so a table-level
revoke would either be ineffective against the owner or could break unrelated
runtime database access.

2.3 The pre-0044 repository SQL remains a known direct compare-and-set path.
It must not be described as fenced until the two-role deployment and runtime
cutover below are complete.

## 3. Required external deployment decision

3.1 Create two named PostgreSQL principals:

1. A non-login migration owner that owns the schema, tables, triggers, and
   security-definer function.
2. A login runtime role that is not a superuser, has no `BYPASSRLS`, and is not
   a member of the migration-owner role.

3.2 Record the reviewed role names in the deployment runbook. The repository
must not guess either provider-specific role name.

## 4. Required cutover before activation

4.1 Grant the runtime role only the reads required by the release-evidence
repository and execution permission on the 0044 function.

4.2 Revoke direct release-evidence table mutation from the runtime role and
verify the effective privileges from a real runtime connection.

4.3 Replace the operator repository's direct compare-and-set plus event insert
with one call to the 0044 function.

4.4 Run negative PostgreSQL tests from the runtime role:

1. Direct evidence update is denied.
2. Direct operator-event insert is denied.
3. Audit failure rolls back the evidence compare-and-set.
4. A compare-and-set conflict creates no event.
5. An exact replay returns the original event without duplication.

4.5 Keep activation blocked until all five checks pass in staging and the
effective privilege report is attached to the release evidence.
