import 'server-only';
import {operationsRuntime,operationsOrigin} from '@/lib/operations/runtime';
import {createClient} from '@/lib/supabase/server';
import {verifyOwner} from '@/lib/operations/owner-access';
export const runtime='nodejs';
const response=(status:number,body:object)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
export async function POST(request:Request){
  try{
    const config=await operationsRuntime();if(config.OPERATIONS_ENABLED!=='true')return response(503,{error:'Workspace unavailable.'});
    if(request.headers.get('origin')!==operationsOrigin(config))return response(403,{error:'Request denied.'});
    if(!config.ENQUIRY_SITE_LIMITER)return response(503,{error:'Workspace unavailable.'});
    if(!(await config.ENQUIRY_SITE_LIMITER.limit({key:'owner-workspace'})).success)return response(429,{error:'Too many workspace requests. Wait a minute.'});
    if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return response(415,{error:'Expected JSON.'});
    const reader=request.body?.getReader();if(!reader)return response(400,{error:'Invalid request.'});
    const chunks:Uint8Array[]=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();return response(413,{error:'Request too large.'})}chunks.push(value)}}finally{reader.releaseLock()}
    const bytes=new Uint8Array(size);let i=0;for(const c of chunks){bytes.set(c,i);i+=c.length;}
    let body;
    try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return response(400,{error:'Invalid JSON.'});}
    if(!body||typeof body!=='object'||Array.isArray(body))return response(400,{error:'Invalid request.'});
    const client=await createClient({writableCookies:true});
    if(body?.action==='logout'){const result=await client.auth.signOut();return response(result.error?503:200,{signedOut:!result.error});}
    if(body?.action==='provision'){
      const identity=await client.auth.getUser();if(identity.error||!identity.data.user)return response(403,{error:'Access denied.'});
      const allowed=await client.rpc('takween_owner_provisioning_allowed');
      return allowed.error||allowed.data!==true?response(403,{error:'Access denied.'}):response(200,{allowed:true});
    }
    if(!await verifyOwner(client))return response(403,{error:'Owner access with MFA required.'});
    if(body?.action==='inbox'){
      if(typeof body.search!=='string'||body.search.length>100||!['','printing','fateen_machining'].includes(body.category)||!Number.isInteger(body.offset)||body.offset<0||body.offset>100000)return response(400,{error:'Invalid filters.'});
      const result=await client.rpc('takween_owner_inbox',{p_search:body.search,p_category:body.category,p_offset:body.offset});
      return result.error?response(503,{error:'Inbox unavailable.'}):response(200,{rows:result.data});
    }
    if(body?.action==='note'){
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if(typeof body.id!=='string'||!uuid.test(body.id)||typeof body.noteId!=='string'||!uuid.test(body.noteId)||typeof body.body!=='string'||!body.body.trim()||body.body.length>2000)return response(400,{error:'Invalid note.'});
      const result=await client.rpc('takween_owner_add_note',{p_enquiry_id:body.id,p_note_id:body.noteId,p_body:body.body});
      return result.error?response(503,{error:'Note could not be confirmed.'}):response(200,{stored:true});
    }
    return response(400,{error:'Unknown action.'});
  }catch{return response(503,{error:'Workspace unavailable.'});}
}
