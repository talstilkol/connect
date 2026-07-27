function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function deriveCsvSourceDigest(
  csvText: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(csvText);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);

  return toHex(new Uint8Array(digest));
}
