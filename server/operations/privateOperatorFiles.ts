import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute } from "node:path";

export async function readPrivateOperatorFile(path: string, limit: number): Promise<Buffer> {
  if (typeof path !== "string" || !isAbsolute(path) || !Number.isSafeInteger(limit) || limit < 1 || limit > 1_048_576) throw Error("INVALID_PRIVATE_FILE");
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.uid !== process.getuid?.() || stat.mode & 0o077 || stat.size < 1 || stat.size > limit) throw Error("INVALID_PRIVATE_FILE");
    const bytes = Buffer.alloc(limit + 1); let bytesRead = 0;
    while (bytesRead < bytes.length) {
      const part = await file.read(bytes, bytesRead, bytes.length - bytesRead, bytesRead);
      if (part.bytesRead === 0) break;
      bytesRead += part.bytesRead;
    }
    if (bytesRead !== stat.size || bytesRead < 1 || bytesRead > limit) throw Error("INVALID_PRIVATE_FILE");
    return bytes.subarray(0, bytesRead);
  } finally { await file.close(); }
}
