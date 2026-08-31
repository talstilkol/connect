import type {
  MetaWebhookQueueBinding,
  MetaWebhookQueueMessage,
} from "./metaWebhookQueueMessage.ts";

export interface MetaWebhookQueuePort {
  publish(message: Readonly<MetaWebhookQueueMessage>): Promise<unknown>;
}

export function createCloudflareMetaWebhookQueuePort(
  binding: MetaWebhookQueueBinding,
): Readonly<MetaWebhookQueuePort> {
  if (!binding || typeof binding.send !== "function") {
    throw new Error("Meta webhook queue binding is unavailable");
  }

  return Object.freeze({
    async publish(message: Readonly<MetaWebhookQueueMessage>) {
      return binding.send(message, { contentType: "v8" });
    },
  });
}
