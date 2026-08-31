import {
  POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_TABLE_CONTRACTS,
  createPostgresWhatsappDeliveryPolicyDataSnapshot,
} from "../server/platform/postgresWhatsappDeliveryPolicyDataMigration.ts";
import {
  readD1DataMigrationSnapshot,
} from "./read-d1-data-migration-snapshot.mjs";

export function readD1WhatsappDeliveryPolicySnapshot(database) {
  return readD1DataMigrationSnapshot({
    database,
    tableContracts: POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresWhatsappDeliveryPolicyDataSnapshot,
  });
}
