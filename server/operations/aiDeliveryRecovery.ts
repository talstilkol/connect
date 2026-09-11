import type { PostgresTransactionManager } from "../platform/postgresTransaction.ts";
import { createMessageDeliveryRecovery } from "./messageDeliveryRecovery.ts";
export function createAiDeliveryRecovery(transactions: PostgresTransactionManager) {
  return createMessageDeliveryRecovery(transactions, "ai");
}
