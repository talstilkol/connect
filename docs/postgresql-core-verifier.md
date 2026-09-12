# PostgreSQL core verifier

The R219 verifier runs locally on PostgreSQL 16 and 17 with Node 24. It accepts only a loopback URL with an explicit port, the exact database name `connect_driver_integration`, no URL password, and no query or fragment. Provision a dedicated disposable database with a trusted local test role. The database must have no public tables before execution.

Run `npm run verify:node-postgres-integration` with `CONNECT_POSTGRES_INTEGRATION_URL` set to that actual local test database. Never point the verifier at customer data. Its existing empty-database and database-name checks remain mandatory.

1. Apply the ordered migration inventory. At migration 0054, run the nine original provider-operation-fence cases on the historical schema which admitted that protocol, reusing existing fixtures.
2. Capture operation and outcome evidence, finish all 86 migrations through 0085, and compare the captured evidence exactly. This is upgrade coverage, not permission to use the retired protocol in the current application.
3. Recheck the dedicated database identity, drop and recreate this run's public schema, and apply all migrations afresh. This intentional reset separates legacy upgrade evidence from current application fixtures.
4. Run current cutover/application/concurrency coverage, including credential-bound Bot delivery boundaries, service-window rejection, rate deferral, immutable ledgers, and campaign acceptance/status settlement. Current Bot fixtures derive actual shared quota keys and use database-clock provider proof timestamps. A bounded wait honors an existing pair reservation; the test does not reset the quota or substitute a false identity.

R219 results per server version: 92 current-schema scenarios and nine historical upgrade scenarios, 101 total. PostgreSQL 16.13 and 17.11 both passed. The result also reports `legacyProviderEvidencePreserved: true`; it does not certify live Meta delivery.

The campaign provider repository now acquires the tenant advisory barrier before acceptance/status row locks and quota settlement. The helper import is allowed only from the local core verifier and its test. Direct dormant-protocol SQL from those importers, and runtime imports of the verifier, remain blocked by source guardrails.

No external provider request, account connection, production migration, or deployment is part of this verifier. The test loopback schema must be discarded after use. See [the active completion plan](planning/code-completion-plan-2026-09-11.md) and [R219 validation](../outputs/launch-validation-2026-09-09/core-current-protocol-validation-20260912.json).
