import type { SensitiveMetaAccessToken } from "./metaPorts.ts";
import { MetaGraphError, type MetaGraphTransport } from "./metaGraphTransport.ts";
import { isMetaDataSyncRequestId, MetaDataSyncError, validateMetaDataSyncRequest, type MetaDataSyncProvider, type MetaDataSyncRequest } from "./metaDataSync.ts";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createMetaGraphDataSyncProvider(transport: MetaGraphTransport): MetaDataSyncProvider {
  return Object.freeze({
    async verifyPhone(rawRequest: MetaDataSyncRequest, accessToken: SensitiveMetaAccessToken) {
      const request = validateMetaDataSyncRequest(rawRequest);
      const response = await transport.requestJson<unknown>({ method: "GET", pathSegments: [request.phoneNumberId], accessToken,
        query: { fields: "id,is_on_biz_app,platform_type" } });
      if (!record(response) || response.id !== request.phoneNumberId || response.is_on_biz_app !== true || response.platform_type !== "CLOUD_API") {
        throw new MetaDataSyncError("SYNC_PHONE_NOT_VERIFIED");
      }
    },
    async request(rawRequest: MetaDataSyncRequest, accessToken: SensitiveMetaAccessToken) {
      const request = validateMetaDataSyncRequest(rawRequest);
      if (request.status !== "dispatching") throw new MetaDataSyncError("INVALID_SYNC_CLAIM");
      try {
        const response = await transport.requestJson<unknown>({ method: "POST", pathSegments: [request.phoneNumberId, "smb_app_data"], accessToken,
          jsonBody: { messaging_product: "whatsapp", sync_type: request.syncType } });
        if (!record(response) || response.messaging_product !== "whatsapp" || !isMetaDataSyncRequestId(response.request_id)) {
          return { status: "unknown" as const, requestId: null };
        }
        return { status: "accepted" as const, requestId: response.request_id };
      } catch (error) {
        // A 5xx, timeout or malformed response may follow an accepted request.
        // Even an explicit rejection never enables automatic POST retries.
        return { status: error instanceof MetaGraphError && error.code === "API_ERROR" &&
          error.httpStatus !== null && error.httpStatus >= 400 && error.httpStatus < 500
          ? "rejected" as const : "unknown" as const, requestId: null };
      }
    },
  });
}
