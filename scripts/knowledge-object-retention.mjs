import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { readPrivateOperatorFile } from '../server/operations/privateOperatorFiles.ts';
import { createNodePostgresTransactionManager } from '../server/platform/nodePostgresAdapter.ts';
import { createKnowledgeObjectRetention } from '../server/operations/knowledgeObjectRetention.ts';
import { requireKnowledgeConfiguration } from '../server/platform/s3KnowledgeConfiguration.ts';
import { createS3KnowledgeCleanupStorage } from '../server/platform/s3KnowledgeCleanupStorage.ts';

export async function runKnowledgeObjectRetention(args, env=process.env) {
  const [mode,inputPath,outputOrEvidencePath,confirmation]=args;
  const count={status:2,review:4,prepare:3,enqueue:4,run:3}[mode];
  if(!count||args.length!==count)throw Error('INVALID_ARGUMENTS');
  const input=JSON.parse((await readPrivateOperatorFile(inputPath,65536)).toString('utf8'));
  if(mode==='review'&&confirmation!==(input.legalHold===true?'APPLY_LEGAL_HOLD':'CONFIRM_NO_LEGAL_HOLD'))throw Error('CONFIRMATION_REQUIRED');
  if(mode==='enqueue'&&confirmation!=='CONFIRM_EXACT_VERSION_DELETION')throw Error('CONFIRMATION_REQUIRED');
  if(mode==='run'&&outputOrEvidencePath!=='RUN_APPROVED_DELETION')throw Error('CONFIRMATION_REQUIRED');
  if(mode==='prepare'&&!isAbsolute(outputOrEvidencePath??''))throw Error('INVALID_PRIVATE_FILE');
  const evidence=['review','enqueue'].includes(mode)?createHash('sha256').update(await readPrivateOperatorFile(outputOrEvidencePath,1048576)).digest('hex'):null;
  const url=new URL(env.KNOWLEDGE_RETENTION_DATABASE_URL??'');
  if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||!url.username||url.hash||
    [...url.searchParams.keys()].some(k=>k!=='sslmode')||url.searchParams.getAll('sslmode').length>1||(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.searchParams.get('sslmode')!=='verify-full'))throw Error('DATABASE_CONFIGURATION_REQUIRED');
  const pool=new pg.Pool({connectionString:url.href,max:1,connectionTimeoutMillis:10000,statement_timeout:15000,lock_timeout:5000});
  let storage;
  try {
    const service=createKnowledgeObjectRetention({transactions:createNodePostgresTransactionManager(pool),environment:{RETENTION_POLICY_JSON:env.RETENTION_POLICY_JSON}});
    if(mode==='status')return await service.status(input);
    if(mode==='review')return await service.review(input,evidence);
    if(mode==='prepare'){
      const proposal=await service.prepare(input);await writeFile(outputOrEvidencePath,`${JSON.stringify(proposal,null,2)}\n`,{flag:'wx',mode:0o600});return {outcome:'prepared'};
    }
    if(mode==='enqueue')return await service.enqueue(input,evidence);
    const config=requireKnowledgeConfiguration(env);if(!config)throw Error('KNOWLEDGE_CONFIGURATION_REQUIRED');
    storage=createS3KnowledgeCleanupStorage(config);
    return await service.run(input,storage);
  } finally { storage?.close(); await pool.end(); }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{process.stdout.write(`${JSON.stringify(await runKnowledgeObjectRetention(process.argv.slice(2)))}\n`);}
  catch{process.stderr.write('KNOWLEDGE_RETENTION_BLOCKED: check private input, authority, retention review, policy, current state and S3 permissions.\n');process.exitCode=1;}
}
