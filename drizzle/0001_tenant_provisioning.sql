ALTER TABLE `audit_logs` ADD `idempotency_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `audit_logs_idempotency_key_uq` ON `audit_logs` (`idempotency_key`);--> statement-breakpoint
ALTER TABLE `tenants` ADD `provisioning_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_provisioning_key_uq` ON `tenants` (`provisioning_key`);
