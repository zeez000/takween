import 'server-only';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import type {Limiter} from '../enquiry-handler';
export type OperationsRuntime = {OPERATIONS_ENABLED?:string;BUSINESS_OPERATIONS_ENABLED?:string;PERSISTENT_ENQUIRIES_ENABLED?:string;ENQUIRY_PRIVACY_VERSION?:string;ENQUIRY_PRIVACY_NOTICE?:string;SITE_URL?:string;REQUEST_ORIGIN?:string;ENQUIRY_SITE_LIMITER?:Limiter};
export function operationsOrigin(config:Pick<OperationsRuntime,'SITE_URL'|'REQUEST_ORIGIN'>){
  const url=new URL(config.REQUEST_ORIGIN?.trim()||config.SITE_URL||'');
  const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if((url.protocol!=='https:'&&!(local&&url.protocol==='http:'))||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Invalid request origin');
  return url.origin;
}
export async function operationsRuntime():Promise<OperationsRuntime>{
  try{return (await getCloudflareContext({async:true})).env as OperationsRuntime;}catch{return {};}
}
