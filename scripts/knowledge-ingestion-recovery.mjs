import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import pg from 'pg';
import {requireKnowledgeConfiguration} from '../server/platform/s3KnowledgeConfiguration.ts';
import {createS3KnowledgeStorage} from '../server/platform/s3KnowledgeStorage.ts';
import {createNodePostgresTransactionManager} from '../server/platform/nodePostgresAdapter.ts';
import {createKnowledgeIngestionRecovery} from '../server/operations/knowledgeIngestionRecovery.ts';
import {readPrivateOperatorFile} from '../server/operations/privateOperatorFiles.ts';
export async function runKnowledgeIngestionRecovery(args,env=process.env){
  const [mode,inputPath,outputOrEvidence,confirmation]=args;
  if(!['prepare','apply'].includes(mode)||args.length!==(mode==='prepare'?3:4)||!isAbsolute(outputOrEvidence??''))throw Error('INVALID_ARGUMENTS');
  const input=JSON.parse((await readPrivateOperatorFile(inputPath,65536)).toString('utf8'));
  const confirmations={'reprocess':'CONFIRM_EXACT_VERSION_REPROCESS','absent':'CONFIRM_PROVIDER_TERMINAL_OBJECT_ABSENT'};
  if(mode==='apply'&&(!Object.hasOwn(confirmations,input.action)||confirmation!==confirmations[input.action]))throw Error('CONFIRMATION_REQUIRED');
  const evidence=mode==='apply'?createHash('sha256').update(await readPrivateOperatorFile(outputOrEvidence,1048576)).digest('hex'):null;
  const url=new URL(env.KNOWLEDGE_RECOVERY_DATABASE_URL??'');
  if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||!url.username||url.hash||[...url.searchParams.keys()].some(k=>k!=='sslmode')||url.searchParams.getAll('sslmode').length>1||
    (!['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.searchParams.get('sslmode')!=='verify-full'))throw Error('DATABASE_CONFIGURATION_REQUIRED');
  const pool=new pg.Pool({connectionString:url.href,max:1,connectionTimeoutMillis:10000,statement_timeout:15000,lock_timeout:5000});
  let storage;
  const getStorage=()=>{if(!storage){const configuration=requireKnowledgeConfiguration(env);if(!configuration)throw Error('KNOWLEDGE_CONFIGURATION_REQUIRED');storage=createS3KnowledgeStorage(configuration);}return storage;};
  try{const service=createKnowledgeIngestionRecovery(createNodePostgresTransactionManager(pool),{
    inspect:(...parameters)=>getStorage().inspect(...parameters),read:(...parameters)=>getStorage().read(...parameters),
  });
    if(mode==='apply')return await service.apply(input,evidence);
    const proposal=await service.prepare(input);await writeFile(outputOrEvidence,JSON.stringify(proposal,null,2)+'\n',{flag:'wx',mode:0o600});return {outcome:'prepared'};
  }finally{storage?.close();await pool.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{process.stdout.write(JSON.stringify(await runKnowledgeIngestionRecovery(process.argv.slice(2)))+'\n');}
  catch{process.stderr.write('KNOWLEDGE_RECOVERY_BLOCKED: verify private evidence, authority, exact version and scan state.\n');process.exitCode=1;}
}
