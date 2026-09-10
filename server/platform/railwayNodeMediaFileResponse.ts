import type { ServerResponse } from "node:http";
import type { AuthorizedMetaMediaFile } from "../meta/metaMediaFileRead.ts";

// Copy at most one 64 KiB chunk into Node's output queue at a time. Waiting for
// each write callback bounds buffering for slow clients; 'finish' is required
// before the service may clear its borrowed file buffer. This proves local
// transmission completion, not that the user saved the file to disk.
export async function writeRailwayNodeMediaFileResponse(target: ServerResponse, file: AuthorizedMetaMediaFile,
  headers: Headers, signal: AbortSignal): Promise<void> {
  if (signal.aborted || target.destroyed || target.headersSent) throw new Error("Media response unavailable");
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      target.off("finish", finish); target.off("close", fail); target.off("error", fail);
      signal.removeEventListener("abort", fail);
    };
    const finish = () => { if (!settled) { settled = true; cleanup(); resolve(); } };
    const fail = () => {
      if (!settled) { settled = true; cleanup(); target.destroy(); reject(new Error("Media response interrupted")); }
    };
    target.once("finish", finish); target.once("close", fail); target.once("error", fail);
    signal.addEventListener("abort", fail, { once: true });
    void (async () => {
      target.statusCode = 200;
      headers.forEach((value, name) => target.setHeader(name, value));
      for (let offset = 0; offset < file.bytes.length; offset += 65_536) {
        if (settled || signal.aborted || target.destroyed) return fail();
        const chunk = Buffer.from(file.bytes.subarray(offset, Math.min(offset + 65_536, file.bytes.length)));
        await new Promise<void>((written, failed) => target.write(chunk, error => error ? failed(error) : written()));
      }
      if (!settled) target.end();
    })().catch(fail);
  });
}
