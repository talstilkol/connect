import { KNOWLEDGE_MAX_UPLOAD_BYTES, parseKnowledgeUploadPayload } from "./knowledgeUploadRequest.ts";
export async function prepareKnowledgeUploadForm(input: unknown) {
  if (!(input instanceof FormData) || [...input.keys()].join(",") !== "file") throw new Error("Knowledge form invalid");
  const file = input.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > KNOWLEDGE_MAX_UPLOAD_BYTES) throw new Error("Knowledge file invalid");
  const mediaType = file.type || (/\.md$/i.test(file.name) ? "text/markdown" : /\.txt$/i.test(file.name) ? "text/plain" : "");
  if (!["text/plain","text/markdown"].includes(mediaType)) throw new Error("Knowledge format unsupported");
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const encoded = Buffer.from(bytes).toString("base64"), segments: string[] = [];
    for (let i=0;i<encoded.length;i+=16384) segments.push(encoded.slice(i,i+16384));
    return parseKnowledgeUploadPayload({ fileName:file.name.trim(),mediaType,segments });
  } finally { bytes.fill(0); }
}
