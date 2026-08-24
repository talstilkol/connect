-- Authoritative Clerk Organization binding for Railway tenant isolation.
-- Existing tenants remain unbound until an approved backfill or authenticated
-- onboarding replay proves the signed Clerk Organization identity.

ALTER TABLE tenants
  ADD COLUMN clerk_organization_id TEXT;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_clerk_organization_id_valid
  CHECK (
    clerk_organization_id IS NULL
    OR (
      length(clerk_organization_id) BETWEEN 1 AND 255
      AND clerk_organization_id = btrim(clerk_organization_id)
      AND clerk_organization_id !~ '[[:cntrl:]]'
    )
  );

CREATE UNIQUE INDEX tenants_clerk_organization_id_uq
  ON tenants (clerk_organization_id)
  WHERE clerk_organization_id IS NOT NULL;
