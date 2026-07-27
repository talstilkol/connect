-- Supports tenant-scoped keyset pagination ordered by descending contact ID.
CREATE INDEX `contacts_tenant_id_idx` ON `contacts` (`tenant_id`,`id`);
