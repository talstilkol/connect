import { isManualReplyText } from "../../shared/domain/manualReply.ts";
import type { BotReplyAdmissionController } from "../bot/botReplyAdmission.ts";
import { decideMetaBotReplyRetry } from "../bot/metaBotReplyRetryPolicy.ts";
import type { createMetaCredentialVault } from "../meta/metaCredentialVault.ts";
import { MetaGraphError, type MetaGraphTransport } from "../meta/metaGraphTransport.ts";
import type { SensitiveMetaAccessToken } from "../meta/metaPorts.ts";
import { ManualReplyError, type ManualReplyClaim, type PostgresManualReplyRepository } from "../platform/postgresManualReplyRepository.ts";

export function createMetaManualReplySender(transport: MetaGraphTransport) {
  return Object.freeze({
    async send(claim: ManualReplyClaim, accessToken: SensitiveMetaAccessToken): Promise<string> {
      if (!/^[1-9][0-9]{0,63}$/.test(claim.phoneNumberId) || !/^\+[1-9][0-9]{0,14}$/.test(claim.recipientPhoneNumber) ||
          !isManualReplyText(claim.text)) throw new MetaGraphError("INVALID_REQUEST", "Manual reply request is invalid");
      const response = await transport.requestJson<{ messaging_product?: unknown; messages?: unknown }>({ method: "POST",
        pathSegments: [claim.phoneNumberId, "messages"], accessToken,
        jsonBody: { messaging_product: "whatsapp", recipient_type: "individual", type: "text",
          to: claim.recipientPhoneNumber.slice(1), text: { preview_url: false, body: claim.text } } });
      if (response?.messaging_product !== "whatsapp" || !Array.isArray(response.messages) || response.messages.length !== 1 ||
          typeof response.messages[0]?.id !== "string" || !/^[^\u0000-\u001f\u007f]{1,255}$/.test(response.messages[0].id) ||
          response.messages[0].id.trim() !== response.messages[0].id) throw new MetaGraphError("INVALID_RESPONSE", "Manual reply acceptance is invalid");
      return response.messages[0].id;
    },
  });
}

export function createManualReplyWorker(dependencies: Readonly<{
  replies: Pick<PostgresManualReplyRepository, "claim" | "seal" | "defer" | "fail" | "unknown" | "recover" | "reject" | "accepted">;
  admission: BotReplyAdmissionController;
  vault: Pick<ReturnType<typeof createMetaCredentialVault>, "withAccessToken">;
  sender: ReturnType<typeof createMetaManualReplySender>;
  clock?: Readonly<{ now(): Date }>;
}>) {
  const clock = dependencies.clock ?? { now: () => new Date() };
  const { replies, admission, vault, sender } = dependencies;
  return Object.freeze({
    async run(stopping: () => boolean = () => false): Promise<void> {
      await replies.recover();
      if (stopping()) return;
      const claim = await replies.claim();
      if (!claim) return;
      let reservation: string | null = null;
      let sealed = false;
      let providerAttempted = false;
      try {
        const startedAt = clock.now().toISOString();
        if (claim.serviceWindowExpiresAt <= startedAt) { await replies.fail(claim, "SERVICE_WINDOW_CLOSED"); return; }
        const decision = await admission.reserve({ tenantId: claim.tenantId, businessPortfolioId: claim.businessPortfolioId,
          wabaId: claim.wabaId, phoneNumberId: claim.phoneNumberId, recipientPhoneNumber: claim.recipientPhoneNumber,
          deliveryKey: claim.deliveryKey, deliveryAttemptNumber: claim.claimVersion, reservedAt: startedAt, serviceWindowExpiresAt: claim.serviceWindowExpiresAt });
        if (decision.outcome === "deferred") { await replies.defer(claim, decision.retryAt, decision.errorCode); return; }
        reservation = decision.reservationKey;
        await vault.withAccessToken(claim.tenantId, async (accessToken) => {
          if (stopping()) throw new Error("Manual reply worker is stopping");
          // A committed seal is the only path to the provider. Crashes after it never re-enter send.
          sealed = await replies.seal(claim, reservation!);
          if (!sealed) {
            await admission.settleBeforeSubmit(reservation!, clock.now().toISOString());
            reservation = null;
            return;
          }
          providerAttempted = true;
          const providerMessageId = await sender.send(claim, accessToken);
          await replies.accepted(claim, providerMessageId);
        });
      } catch (error) {
        if (!sealed) {
          if (reservation !== null) await admission.settleBeforeSubmit(reservation, clock.now().toISOString());
          if (error instanceof ManualReplyError) await replies.fail(claim, error.code);
          else await replies.defer(claim, new Date(clock.now().getTime() + 30_000).toISOString(), "DEPENDENCY_UNAVAILABLE");
          return;
        }
        // Only an explicit 4xx Graph rejection proves that this POST was not accepted.
        if (providerAttempted && error instanceof MetaGraphError && error.code === "API_ERROR" &&
            error.httpStatus !== null && error.httpStatus >= 400 && error.httpStatus < 500) {
          const cooldownCode = error.graphCode === 130429 || error.graphCode === 131056 ? error.graphCode : null;
          if (cooldownCode !== null) {
            const scope = cooldownCode === 130429 ? "sender" : "pair";
            const cooldown = decideMetaBotReplyRetry({ attemptCount: 1, providerErrorCode: cooldownCode,
              cooldownScope: scope, providerRetryAfterSeconds: error.retryAfterSeconds });
            if (cooldown.action === "defer") await admission.deferProviderRejection(reservation!, scope, cooldownCode,
              cooldown.retryAfterSeconds, clock.now().toISOString());
            else await admission.settleProviderFailure(reservation!, clock.now().toISOString());
          } else await admission.settleProviderFailure(reservation!, clock.now().toISOString());
          await replies.reject(claim, error.graphCode === 131047 ? "SERVICE_WINDOW_CLOSED" : "PROVIDER_REJECTED");
          return;
        }
        await replies.unknown(claim);
      }
    },
  });
}

/** One claim per tick, no overlapping ticks; close drains the active provider call before the pool closes. */
export function createManualReplyWorkerLoop(run: (stopping: () => boolean) => Promise<void>, recordFailure: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active: Promise<void> | null = null;
  let started = false;
  let closed = false;
  const tick = async () => {
    timer = null;
    if (closed || active !== null) return;
    active = run(() => closed).catch(() => { try { recordFailure(); } catch { /* Content-free telemetry cannot break recovery. */ } });
    try { await active; } finally { active = null; if (!closed) timer = setTimeout(() => { void tick(); }, 1_000); }
  };
  return Object.freeze({
    async start() { if (closed) throw new Error("Manual reply worker is closed"); if (started) return; started = true; timer = setTimeout(() => { void tick(); }, 0); },
    async close() { closed = true; if (timer !== null) clearTimeout(timer); timer = null; if (active !== null) await active; },
  });
}

// AI and human replies share the transport and single-attempt lifecycle, with independent repositories.
export const createTextReplyDeliveryWorker = createManualReplyWorker;
export const createMetaTextReplySender = createMetaManualReplySender;
