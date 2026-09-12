import { runtimeFixture } from './ai-runtime.mjs';
import { quarantineConfig } from './meta-media-quarantine.mjs';
import { sha256Hex } from '../../server/meta/metaWebhookSecurity.ts';
import { deriveKnowledgeSourceKey } from '../../server/ai/aiAgentKey.ts';
import { knowledgeObjectKey } from '../../server/platform/s3KnowledgeStorage.ts';
export async function knowledgeFixture(tenantId=7) {
  const f=await runtimeFixture({tenantId}); const bytes=new TextEncoder().encode(f.input.version.definition.systemPrompt);
  const contentSha256=await sha256Hex(bytes),sourceKey=await deriveKnowledgeSourceKey(tenantId,contentSha256);
  return { bytes,config:quarantineConfig,payload:{fileName:'מדיניות-שירות.txt',mediaType:'text/plain',segments:[Buffer.from(bytes).toString('base64')]},
    intent:{tenantId,sourceKey,contentSha256,sizeBytes:bytes.length,mediaType:'text/plain',bucket:quarantineConfig.bucket,objectKey:knowledgeObjectKey(tenantId,sourceKey),kmsKeyArn:quarantineConfig.kmsKeyArn} };
}
