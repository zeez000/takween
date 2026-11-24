import 'server-only';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {createClient} from '@/lib/supabase/server';
import {verifyOwner} from '@/lib/operations/owner-access';
import {dispatchNotification,type NotificationEnvironment} from '@/lib/operations/dispatcher';
import {notificationRepository,type RepositoryEnvironment} from '@/lib/operations/repository';
import type {Limiter} from '@/lib/enquiry-handler';
import {operationsOrigin} from '@/lib/operations/runtime';
export const runtime='nodejs';
export async function POST(request:Request){
  const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
  try{
    const {env}=await getCloudflareContext({async:true});
    const config=env as NotificationEnvironment & RepositoryEnvironment & {OPERATIONS_ENABLED?:string;SITE_URL?:string;REQUEST_ORIGIN?:string;ENQUIRY_SITE_LIMITER?:Limiter};
    if(config.OPERATIONS_ENABLED!=='true'||config.ENQUIRY_NOTIFICATIONS_ENABLED!=='true')return Response.json({error:'Notification dispatch is disabled.'},{status:503,headers});
    if(request.headers.get('origin')!==operationsOrigin(config))return Response.json({error:'Request denied.'},{status:403,headers});
    if(!config.ENQUIRY_SITE_LIMITER)return Response.json({error:'Dispatch unavailable.'},{status:503,headers});
    if(!(await config.ENQUIRY_SITE_LIMITER.limit({key:'owner-workspace'})).success)return Response.json({error:'Too many requests.'},{status:429,headers});
    if(!await verifyOwner(await createClient({writableCookies:true})))return Response.json({error:'Owner MFA required.'},{status:403,headers});
    const result=await dispatchNotification(config,notificationRepository(config));
    return Response.json(result,{headers});
  }catch{return Response.json({error:'Notification outcome could not be confirmed.'},{status:503,headers});}
}
