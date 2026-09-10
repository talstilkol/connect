import { S3Client,DeleteObjectCommand } from '@aws-sdk/client-s3';
import { MetaMediaCleanupError,type MetaMediaCleanupStorage } from '../meta/metaMediaCleanup.ts';
import { validMetaMediaObjectVersion } from '../meta/metaMediaInspection.ts';
import { validateMetaMediaUploadIntent } from '../meta/metaMediaUploadJournal.ts';
import { requireS3MetaMediaQuarantineConfiguration,type S3MetaMediaQuarantineEnvironment } from './s3MetaMediaQuarantineConfiguration.ts';
import { metaMediaQuarantineS3ClientConfiguration,verifyS3MetaMediaQuarantineBucket } from './s3MetaMediaQuarantineStorage.ts';
const fail=(code:MetaMediaCleanupError['code']):never=>{throw new MetaMediaCleanupError(code);};
// Dedicated deletion role: six bucket checks and DeleteObjectVersion only.
// No body, listing, tag mutation, unversioned DELETE, or Object Lock bypass.
export function createS3MetaMediaCleanupStorage(environment:S3MetaMediaQuarantineEnvironment,options:Readonly<{client?:Pick<S3Client,'send'>;requestTimeoutMs?:number}>={}):MetaMediaCleanupStorage{
  const config=requireS3MetaMediaQuarantineConfiguration(environment),timeout=options.requestTimeoutMs??30_000;
  if(!Number.isSafeInteger(timeout)||timeout<1||timeout>60_000||Object.keys(options).some(k=>!['client','requestTimeoutMs'].includes(k)))return fail('INVALID_REQUEST');
  const owned=options.client?undefined:new S3Client(metaMediaQuarantineS3ClientConfiguration(config)),client=options.client??owned!;
  let active=false,closed=false;const pending=new Set<AbortController>();
  async function request<T>(work:(signal:AbortSignal)=>Promise<T>):Promise<T>{
    const controller=new AbortController();pending.add(controller);let timer:ReturnType<typeof setTimeout>|undefined;
    const operation=Promise.resolve().then(()=>{if(closed||controller.signal.aborted)return fail('DEPENDENCY_UNAVAILABLE');return work(controller.signal);});
    void operation.then(()=>pending.delete(controller),()=>pending.delete(controller));
    const deadline=new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new MetaMediaCleanupError('OUTCOME_UNKNOWN'));},timeout);});
    try{return await Promise.race([operation,deadline]);}finally{clearTimeout(timer);}
  }
  return Object.freeze({
    async remove(raw,versionId,authorize){
      if(closed||active||pending.size)return fail('DEPENDENCY_UNAVAILABLE');active=true;
      try{
        const intent=validateMetaMediaUploadIntent(raw);
        if(intent.bucket!==config.bucket||intent.kmsKeyArn!==config.kmsKeyArn||!validMetaMediaObjectVersion(versionId)||typeof authorize!=='function')return fail('INVALID_REQUEST');
        const check=async()=>{if(closed)return fail('STALE_CLAIM');await authorize();};
        await check();await verifyS3MetaMediaQuarantineBucket(config,client,request);await check();
        const command=new DeleteObjectCommand({Bucket:config.bucket,Key:intent.objectKey,VersionId:versionId,ExpectedBucketOwner:config.accountId});
        const result=await request(async signal=>{
          command.middlewareStack.add(next=>async args=>{await check();if(signal.aborted)return fail('OUTCOME_UNKNOWN');return next(args);},
            {step:'deserialize',priority:'low',name:'connectMediaAuthorizeBeforeCleanup'});
          // Also runs with a client port that does not execute SDK middleware.
          await check();if(signal.aborted)return fail('OUTCOME_UNKNOWN');return client.send(command,{abortSignal:signal});
        });
        if(result.$metadata.httpStatusCode!==204||result.DeleteMarker===true||(result.VersionId!==undefined&&result.VersionId!==versionId))return fail('OUTCOME_UNKNOWN');
        // Return the provider acknowledgement even if authorization changed
        // during DELETE. The caller records this fact under the existing claim.
      }catch(error){
        if(error instanceof MetaMediaCleanupError)throw error;
        const code=error&&typeof error==='object'&&'code'in error?error.code:undefined;
        if(['UNSAFE_BUCKET','CONFIGURATION_INVALID','INVALID_INPUT'].includes(String(code)))throw error;
        const status=error&&typeof error==='object'&&'$metadata'in error?(error.$metadata as {httpStatusCode?:number})?.httpStatusCode:undefined;
        if(status!==undefined&&status>=400&&status<500&&![408,409,429].includes(status))return fail('DELETE_REJECTED');
        return fail('OUTCOME_UNKNOWN');
      }finally{active=false;}
    },
    close(){closed=true;for(const controller of pending)controller.abort();owned?.destroy();},
  } satisfies MetaMediaCleanupStorage);
}
