export function isWhatsAppDisplayName(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512 &&
    value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
}

export function contactDisplayName(contact: {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string;
  whatsappDisplayName?: string;
}): string {
  const localName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return localName || contact.whatsappDisplayName || contact.phoneNumber;
}
