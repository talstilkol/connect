// Test-only inputs based on the structure of Meta's public history examples.
export const businessPhone = "15550783881";
export const customerPhone = "16505551234";
export const connection = { tenantId: 7, wabaId: "200002", phoneNumberId: "300003", businessPortfolioId: "100001", status: "connected", version: 2 };
export const scope = { tenantId: 7, wabaId: "200002", phoneNumberId: "300003", connectionVersion: 2 };
export function message(overrides = {}) {
  return { from: businessPhone, id: "wamid.history-text", timestamp: "1739230955", type: "text", text: { body: "history fixture" }, history_context: { status: "READ" }, ...overrides };
}
export function chunk(overrides = {}) {
  return { metadata: { phase: 0, chunk_order: 1, progress: 55 }, threads: [{ id: customerPhone, messages: [message()] }], ...overrides };
}
export function value(history = [chunk()], phoneNumberId = connection.phoneNumberId) {
  return { messaging_product: "whatsapp", metadata: { display_phone_number: businessPhone, phone_number_id: phoneNumberId }, history };
}
export function mediaValue(phoneNumberId = connection.phoneNumberId) {
  const v = value([], phoneNumberId); delete v.history;
  v.messages = [{ from: customerPhone, id: "wamid.history-media", timestamp: "1738796547", type: "image", image: { id: "24230790383178626", mime_type: "image/jpeg", sha256: "a".repeat(64) } }];
  return v;
}
export function declinedValue(phoneNumberId = connection.phoneNumberId) { return value([{ errors: [{ code: 2593109, message: "provider history sharing refusal" }] }], phoneNumberId); }
export function payload(v = value(), wabaId = connection.wabaId) {
  return { object: "whatsapp_business_account", entry: [{ id: wabaId, changes: [{ field: "history", value: v }] }] };
}
