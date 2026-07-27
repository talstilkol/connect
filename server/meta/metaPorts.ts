import type { VerifiedMetaAssetSnapshot } from "./metaConnectionService";

declare const sensitiveMetaAccessTokenBrand: unique symbol;

export type SensitiveMetaAccessToken = string & {
  readonly [sensitiveMetaAccessTokenBrand]: true;
};

export function toSensitiveMetaAccessToken(
  value: string,
): SensitiveMetaAccessToken {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > 8192
  ) {
    throw new Error("Meta access token is invalid");
  }

  return value as SensitiveMetaAccessToken;
}

export interface MetaAuthorizationCodeExchanger {
  exchangeAuthorizationCode(
    authorizationCode: string,
  ): Promise<SensitiveMetaAccessToken>;
}

export interface MetaAssetVerificationInput {
  accessToken: SensitiveMetaAccessToken;
  businessPortfolioId: string;
  wabaId: string;
  phoneNumberId: string;
}

export interface MetaAssetVerifier {
  verifyAssets(
    input: MetaAssetVerificationInput,
  ): Promise<VerifiedMetaAssetSnapshot>;
}

export interface MetaCredentialVault {
  storeAccessToken(
    tenantId: number,
    accessToken: SensitiveMetaAccessToken,
  ): Promise<void>;
  withAccessToken<TResult>(
    tenantId: number,
    operation: (
      accessToken: SensitiveMetaAccessToken,
    ) => Promise<TResult>,
  ): Promise<TResult>;
}

export interface MetaWabaSubscriber {
  subscribeWaba(
    wabaId: string,
    accessToken: SensitiveMetaAccessToken,
  ): Promise<void>;
}
