import { quarantineConfig as config } from './meta-media-quarantine.mjs';
import { inspectionReply } from './meta-media-inspection.mjs';
import { requiredMetaMediaQuarantineBucketPolicy } from '../../server/platform/s3MetaMediaQuarantinePolicy.ts';

// Existing isolated S3 wire protocol used by inspection and file-reader tests.
export function wireInspectionReply(request,intent,options={},versionId='wire-version+/='){
  const headers={'content-type':'application/xml'};let body='',statusCode=200;
  const query=request.query;
  if(request.method==='HEAD'){
    const head=inspectionReply({constructor:{name:'HeadObjectCommand'}},intent,'NO_THREATS_FOUND',versionId);
    Object.assign(headers,{'x-amz-version-id':options.foreignHead?'foreign-version':versionId,'content-length':String(head.ContentLength),
      'x-amz-checksum-sha256':head.ChecksumSHA256,'x-amz-checksum-type':'FULL_OBJECT','x-amz-server-side-encryption':'aws:kms',
      'x-amz-server-side-encryption-aws-kms-key-id':config.kmsKeyArn,'content-type':head.ContentType,'content-disposition':'attachment','cache-control':'no-store'});
    for(const[key,value]of Object.entries(head.Metadata))headers[`x-amz-meta-${key}`]=value;
  }else if('versions'in query){
    statusCode=options.listStatus??200;
    body=statusCode===200?`<ListVersionsResult><Name>${config.bucket}</Name><Prefix>${intent.objectKey}</Prefix><MaxKeys>2</MaxKeys><IsTruncated>false</IsTruncated><Version><Key>${intent.objectKey}</Key><VersionId>${versionId}</VersionId><IsLatest>true</IsLatest><Size>${intent.sizeBytes}</Size></Version></ListVersionsResult>`:'<Error><Code>InspectionFailed</Code><Message>private-provider-details</Message></Error>';
  }else if('tagging'in query){
    headers['x-amz-version-id']=versionId;body='<Tagging><TagSet><Tag><Key>GuardDutyMalwareScanStatus</Key><Value>NO_THREATS_FOUND</Value></Tag></TagSet></Tagging>';
  }else if('publicAccessBlock'in query)body='<PublicAccessBlockConfiguration><BlockPublicAcls>true</BlockPublicAcls><IgnorePublicAcls>true</IgnorePublicAcls><BlockPublicPolicy>true</BlockPublicPolicy><RestrictPublicBuckets>true</RestrictPublicBuckets></PublicAccessBlockConfiguration>';
  else if('versioning'in query)body='<VersioningConfiguration><Status>Enabled</Status></VersioningConfiguration>';
  else if('ownershipControls'in query)body='<OwnershipControls><Rule><ObjectOwnership>BucketOwnerEnforced</ObjectOwnership></Rule></OwnershipControls>';
  else if('encryption'in query)body=`<ServerSideEncryptionConfiguration><Rule><ApplyServerSideEncryptionByDefault><SSEAlgorithm>aws:kms</SSEAlgorithm><KMSMasterKeyID>${config.kmsKeyArn}</KMSMasterKeyID></ApplyServerSideEncryptionByDefault></Rule></ServerSideEncryptionConfiguration>`;
  else if('policyStatus'in query)body='<PolicyStatus><IsPublic>false</IsPublic></PolicyStatus>';
  else if('policy'in query){body=JSON.stringify(requiredMetaMediaQuarantineBucketPolicy(config));headers['content-type']='application/json';}
  else assert.fail('Unexpected object-body or unsupported S3 request');
  return{response:{statusCode,headers,body:new TextEncoder().encode(body)}};
}
