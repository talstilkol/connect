import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import pg from 'pg';
import {createNodePostgresTransactionManager} from '../server/platform/nodePostgresAdapter.ts';
import {createMetaSyncAttribution} from '../server/operations/metaSyncAttribution.ts';
import {readPrivateOperatorFile} from '../server/operations/privateOperatorFiles.ts';
export async function runMetaSyncAttribution(args,env=process.env){
  const [mode,inputPath,outputOrEvidence,confirmation]=args;
  if(!['prepare','apply'].includes(mode)||args.length!==(mode==='prepare'?3:4)||!isAbsolute(outputOrEvidence??''))throw Error('INVALID_ARGUMENTS');
  const input=JSON.parse((await readPrivateOperatorFile(inputPath,65536)).toString('utf8'));
  let digest=null;
  if(mode==='apply'){
    if(confirmation!=='CONFIRM_PROVIDER_EVENT_ATTRIBUTION')throw Error('CONFIRMATION_REQUIRED');
    const bytes=await readPrivateOperatorFile(outputOrEvidence,1048576),evidence=JSON.parse(bytes.toString('utf8'));
    const keys=['schemaVersion','tenantId','eventDigest','connectionVersion','providerRequestId','providerEvidenceReference','statement'];
    if(!evidence||Object.keys(evidence).length!==keys.length||keys.some(k=>!Object.hasOwn(evidence,k))||evidence.schemaVersion!==1||
      ['tenantId','eventDigest','connectionVersion','providerRequestId'].some(k=>evidence[k]!==input[k])||
      typeof evidence.providerEvidenceReference!=='string'||!evidence.providerEvidenceReference.trim()||evidence.providerEvidenceReference.length>2000||
      evidence.statement!=='Provider evidence identifies this exact retained event as belonging to this original sync request.')throw Error('EVIDENCE_IDENTITY_REQUIRED');
    digest=createHash('sha256').update(bytes).digest('hex');
  }
  const url=new URL(env.META_SYNC_ATTRIBUTION_DATABASE_URL??'');
  if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||!url.username||url.hash||[...url.searchParams.keys()].some(k=>k!=='sslmode')||url.searchParams.getAll('sslmode').length>1||
    (!['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.searchParams.get('sslmode')!=='verify-full'))throw Error('DATABASE_CONFIGURATION_REQUIRED');
  const pool=new pg.Pool({connectionString:url.href,max:1,connectionTimeoutMillis:10000,statement_timeout:15000,lock_timeout:5000});
  try{const service=createMetaSyncAttribution(createNodePostgresTransactionManager(pool));
    if(mode==='apply')return await service.apply(input,digest);
    const proposal=await service.prepare(input);await writeFile(outputOrEvidence,JSON.stringify(proposal,null,2)+'\n',{flag:'wx',mode:0o600});return {outcome:'prepared'};
  }finally{await pool.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{process.stdout.write(JSON.stringify(await runMetaSyncAttribution(process.argv.slice(2)))+'\n');}
  catch{process.stderr.write('META_SYNC_ATTRIBUTION_BLOCKED: verify private provider evidence, event/request identity, authorization and proposal freshness.\n');process.exitCode=1;}
}
