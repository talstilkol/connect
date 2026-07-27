import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaGraphAssetVerifier,
  MetaGraphAssetVerificationError,
} from "../server/meta/metaGraphAssetVerifier.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";

const accessToken = toSensitiveMetaAccessToken(
  "asset-verifier-fixture-access-token",
);

const verificationInput = {
  accessToken,
  businessPortfolioId: "123456789",
  wabaId: "234567891",
  phoneNumberId: "345678912",
};

test("verifies the WABA owner and phone number membership", async () => {
  const requests = [];
  const verifier = createMetaGraphAssetVerifier({
    async requestJson(request) {
      requests.push(request);

      if (request.pathSegments.length === 1) {
        return {
          id: "234567891",
          owner_business_info: {
            id: "123456789",
          },
        };
      }

      return {
        data: [{ id: "345678912" }],
      };
    },
  });

  assert.deepEqual(
    await verifier.verifyAssets(verificationInput),
    {
      businessPortfolioId: "123456789",
      wabaId: "234567891",
      phoneNumberId: "345678912",
    },
  );
  assert.deepEqual(requests, [
    {
      method: "GET",
      pathSegments: ["234567891"],
      accessToken,
      query: {
        fields: "id,owner_business_info{id}",
      },
    },
    {
      method: "GET",
      pathSegments: ["234567891", "phone_numbers"],
      accessToken,
      query: {
        fields: "id",
      },
    },
  ]);
});

test("rejects a WABA owned by a different business portfolio", async () => {
  let requests = 0;
  const verifier = createMetaGraphAssetVerifier({
    async requestJson() {
      requests += 1;
      return {
        id: "234567891",
        owner_business_info: {
          id: "999999999",
        },
      };
    },
  });

  await assert.rejects(
    verifier.verifyAssets(verificationInput),
    (error) =>
      error instanceof MetaGraphAssetVerificationError &&
      error.code === "BUSINESS_PORTFOLIO_MISMATCH",
  );
  assert.equal(requests, 1);
});

test("uses only a bounded cursor for Meta phone pagination", async () => {
  const requests = [];
  const verifier = createMetaGraphAssetVerifier({
    async requestJson(request) {
      requests.push(request);

      if (request.pathSegments.length === 1) {
        return {
          id: "234567891",
          owner_business_info: {
            id: "123456789",
          },
        };
      }

      if (request.query.after === undefined) {
        return {
          data: [{ id: "456789123" }],
          paging: {
            cursors: {
              after: "cursor-page-2",
            },
            next:
              "https://untrusted.invalid/path?access_token=must-not-be-used",
          },
        };
      }

      return {
        data: [{ id: "345678912" }],
      };
    },
  });

  await verifier.verifyAssets(verificationInput);

  assert.equal(requests.length, 3);
  assert.deepEqual(requests[2], {
    method: "GET",
    pathSegments: ["234567891", "phone_numbers"],
    accessToken,
    query: {
      fields: "id",
      after: "cursor-page-2",
    },
  });
  assert.doesNotMatch(
    JSON.stringify(requests),
    /untrusted\.invalid|must-not-be-used/,
  );
});

test("reports a phone number that is absent from every page", async () => {
  const verifier = createMetaGraphAssetVerifier({
    async requestJson(request) {
      if (request.pathSegments.length === 1) {
        return {
          id: "234567891",
          owner_business_info: {
            id: "123456789",
          },
        };
      }

      return {
        data: [{ id: "456789123" }],
      };
    },
  });

  await assert.rejects(
    verifier.verifyAssets(verificationInput),
    (error) =>
      error instanceof MetaGraphAssetVerificationError &&
      error.code === "PHONE_NUMBER_NOT_FOUND",
  );
});

test("rejects malformed and repeated Meta pagination", async (context) => {
  await context.test("missing cursor", async () => {
    const verifier = createMetaGraphAssetVerifier({
      async requestJson(request) {
        if (request.pathSegments.length === 1) {
          return {
            id: "234567891",
            owner_business_info: {
              id: "123456789",
            },
          };
        }

        return {
          data: [],
          paging: {
            next: "https://graph.facebook.com/next",
          },
        };
      },
    });

    await assert.rejects(
      verifier.verifyAssets(verificationInput),
      (error) =>
        error instanceof MetaGraphAssetVerificationError &&
        error.code === "INVALID_PHONE_RESPONSE",
    );
  });

  await context.test("repeated cursor", async () => {
    const verifier = createMetaGraphAssetVerifier({
      async requestJson(request) {
        if (request.pathSegments.length === 1) {
          return {
            id: "234567891",
            owner_business_info: {
              id: "123456789",
            },
          };
        }

        return {
          data: [],
          paging: {
            cursors: {
              after: "same-cursor",
            },
            next: "https://graph.facebook.com/next",
          },
        };
      },
    });

    await assert.rejects(
      verifier.verifyAssets(verificationInput),
      (error) =>
        error instanceof MetaGraphAssetVerificationError &&
        error.code === "PAGINATION_ERROR",
    );
  });
});

test("rejects malformed Meta asset IDs before Graph access", async () => {
  let requests = 0;
  const verifier = createMetaGraphAssetVerifier({
    async requestJson() {
      requests += 1;
      return {};
    },
  });

  await assert.rejects(
    verifier.verifyAssets({
      ...verificationInput,
      wabaId: "../other-waba",
    }),
    (error) =>
      error instanceof MetaGraphAssetVerificationError &&
      error.code === "INVALID_ASSET_ID",
  );
  assert.equal(requests, 0);
});
