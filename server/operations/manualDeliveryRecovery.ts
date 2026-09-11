import type { PostgresTransactionManager } from "../platform/postgresTransaction.ts";
import { createMessageDeliveryRecovery } from "./messageDeliveryRecovery.ts";
export function createManualDeliveryRecovery(transactions: PostgresTransactionManager) {
  return createMessageDeliveryRecovery(transactions, "manual");
}
