import type {
  VerifiedMetaAssetSnapshot,
} from "./metaConnectionService.ts";
import type {
  MetaGraphTransport,
} from "./metaGraphTransport.ts";
import type {
  MetaAssetVerificationInput,
  MetaAssetVerifier,
  SensitiveMetaAccessToken,
} from "./metaPorts.ts";

const MAX_PHONE_NUMBER_PAGES = 20;

export type MetaGraphAssetVerificationErrorCode =
  | "INVALID_ASSET_ID"
  | "INVALID_WABA_RESPONSE"
  | "BUSINESS_PORTFOLIO_MISMATCH"
  | "INVALID_PHONE_RESPONSE"
  | "PHONE_NUMBER_NOT_FOUND"
  | "PAGINATION_ERROR";

export class MetaGraphAssetVerificationError extends Error {
  readonly code: MetaGraphAssetVerificationErrorCode;

  constructor(
    code: MetaGraphAssetVerificationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MetaGraphAssetVerificationError";
    this.code = code;
  }
}

interface MetaPhoneNumberPage {
  phoneNumberIds: readonly string[];
  nextCursor: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireMetaAssetId(
  value: unknown,
  code: MetaGraphAssetVerificationErrorCode,
  message: string,
): string {
  if (typeof value !== "string") {
    throw new MetaGraphAssetVerificationError(code, message);
  }

  const normalizedValue = value.trim();

  if (!/^[1-9][0-9]{0,63}$/.test(normalizedValue)) {
    throw new MetaGraphAssetVerificationError(code, message);
  }

  return normalizedValue;
}

function normalizeInput(
  input: MetaAssetVerificationInput,
): MetaAssetVerificationInput {
  return {
    accessToken: input.accessToken,
    businessPortfolioId: requireMetaAssetId(
      input.businessPortfolioId,
      "INVALID_ASSET_ID",
      "Meta business portfolio ID is invalid",
    ),
    wabaId: requireMetaAssetId(
      input.wabaId,
      "INVALID_ASSET_ID",
      "Meta WABA ID is invalid",
    ),
    phoneNumberId: requireMetaAssetId(
      input.phoneNumberId,
      "INVALID_ASSET_ID",
      "Meta phone number ID is invalid",
    ),
  };
}

function requireWabaOwner(
  response: unknown,
  expectedWabaId: string,
): string {
  if (!isRecord(response)) {
    throw new MetaGraphAssetVerificationError(
      "INVALID_WABA_RESPONSE",
      "Meta WABA response is invalid",
    );
  }

  const responseWabaId = requireMetaAssetId(
    response.id,
    "INVALID_WABA_RESPONSE",
    "Meta WABA response is invalid",
  );
  const ownerBusinessInfo = response.owner_business_info;

  if (
    responseWabaId !== expectedWabaId ||
    !isRecord(ownerBusinessInfo)
  ) {
    throw new MetaGraphAssetVerificationError(
      "INVALID_WABA_RESPONSE",
      "Meta WABA response is invalid",
    );
  }

  return requireMetaAssetId(
    ownerBusinessInfo.id,
    "INVALID_WABA_RESPONSE",
    "Meta WABA owner response is invalid",
  );
}

function readPhoneNumberPage(response: unknown): MetaPhoneNumberPage {
  if (!isRecord(response) || !Array.isArray(response.data)) {
    throw new MetaGraphAssetVerificationError(
      "INVALID_PHONE_RESPONSE",
      "Meta phone number response is invalid",
    );
  }

  const phoneNumberIds = response.data.map((entry) => {
    if (!isRecord(entry)) {
      throw new MetaGraphAssetVerificationError(
        "INVALID_PHONE_RESPONSE",
        "Meta phone number response is invalid",
      );
    }

    return requireMetaAssetId(
      entry.id,
      "INVALID_PHONE_RESPONSE",
      "Meta phone number response is invalid",
    );
  });

  if (response.paging === undefined) {
    return { phoneNumberIds, nextCursor: null };
  }

  if (!isRecord(response.paging)) {
    throw new MetaGraphAssetVerificationError(
      "INVALID_PHONE_RESPONSE",
      "Meta phone number pagination is invalid",
    );
  }

  const nextPage = response.paging.next;

  if (nextPage === undefined) {
    return { phoneNumberIds, nextCursor: null };
  }

  if (
    typeof nextPage !== "string" ||
    nextPage.trim().length === 0 ||
    !isRecord(response.paging.cursors)
  ) {
    throw new MetaGraphAssetVerificationError(
      "INVALID_PHONE_RESPONSE",
      "Meta phone number pagination is invalid",
    );
  }

  const afterCursor = response.paging.cursors.after;

  if (
    typeof afterCursor !== "string" ||
    afterCursor.trim().length === 0 ||
    afterCursor.length > 4096
  ) {
    throw new MetaGraphAssetVerificationError(
      "INVALID_PHONE_RESPONSE",
      "Meta phone number pagination cursor is invalid",
    );
  }

  return {
    phoneNumberIds,
    nextCursor: afterCursor,
  };
}

async function verifyPhoneNumber(
  transport: MetaGraphTransport,
  wabaId: string,
  phoneNumberId: string,
  accessToken: SensitiveMetaAccessToken,
): Promise<void> {
  const visitedCursors = new Set<string>();
  let afterCursor: string | null = null;

  for (
    let pageNumber = 1;
    pageNumber <= MAX_PHONE_NUMBER_PAGES;
    pageNumber += 1
  ) {
    const query: Record<string, string> = {
      fields: "id",
    };

    if (afterCursor !== null) {
      query.after = afterCursor;
    }

    const page = readPhoneNumberPage(
      await transport.requestJson<unknown>({
        method: "GET",
        pathSegments: [wabaId, "phone_numbers"],
        accessToken,
        query,
      }),
    );

    if (page.phoneNumberIds.includes(phoneNumberId)) {
      return;
    }

    if (page.nextCursor === null) {
      throw new MetaGraphAssetVerificationError(
        "PHONE_NUMBER_NOT_FOUND",
        "Meta phone number does not belong to the WABA",
      );
    }

    if (
      visitedCursors.has(page.nextCursor) ||
      pageNumber === MAX_PHONE_NUMBER_PAGES
    ) {
      throw new MetaGraphAssetVerificationError(
        "PAGINATION_ERROR",
        "Meta phone number pagination could not be completed",
      );
    }

    visitedCursors.add(page.nextCursor);
    afterCursor = page.nextCursor;
  }
}

export function createMetaGraphAssetVerifier(
  transport: MetaGraphTransport,
): MetaAssetVerifier {
  return {
    async verifyAssets(
      input: MetaAssetVerificationInput,
    ): Promise<VerifiedMetaAssetSnapshot> {
      const normalizedInput = normalizeInput(input);
      const wabaResponse =
        await transport.requestJson<unknown>({
          method: "GET",
          pathSegments: [normalizedInput.wabaId],
          accessToken: normalizedInput.accessToken,
          query: {
            fields: "id,owner_business_info{id}",
          },
        });
      const ownerBusinessPortfolioId = requireWabaOwner(
        wabaResponse,
        normalizedInput.wabaId,
      );

      if (
        ownerBusinessPortfolioId !==
        normalizedInput.businessPortfolioId
      ) {
        throw new MetaGraphAssetVerificationError(
          "BUSINESS_PORTFOLIO_MISMATCH",
          "Meta WABA does not belong to the business portfolio",
        );
      }

      await verifyPhoneNumber(
        transport,
        normalizedInput.wabaId,
        normalizedInput.phoneNumberId,
        normalizedInput.accessToken,
      );

      return {
        businessPortfolioId:
          normalizedInput.businessPortfolioId,
        wabaId: normalizedInput.wabaId,
        phoneNumberId: normalizedInput.phoneNumberId,
      };
    },
  };
}
