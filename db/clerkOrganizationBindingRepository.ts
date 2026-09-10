import type { TenantId } from "../shared/domain/model.ts";

export interface ClerkOrganizationBinding {
  readonly tenantId: TenantId;
  readonly externalOrganizationId: string;
}

export interface ClerkOrganizationBindingReader {
  findByTenantId(
    tenantId: TenantId,
  ): Promise<Readonly<ClerkOrganizationBinding> | null>;
}

export interface ClerkOrganizationBindingWriter {
  ensureBinding(
    binding: Readonly<ClerkOrganizationBinding>,
  ): Promise<Readonly<ClerkOrganizationBinding>>;
}

export interface ClerkOrganizationBindingRepository
  extends ClerkOrganizationBindingReader,
    ClerkOrganizationBindingWriter {}
