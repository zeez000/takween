import 'server-only';
import {operationsRuntime,operationsOrigin} from '@/lib/operations/runtime';
import {createClient} from '@/lib/supabase/server';
import {verifyOwner} from '@/lib/operations/owner-access';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
const json=(status:number,body:object)=>Response.json(body,{status,headers});
export async function POST(request:Request){
 try{
  const config=await operationsRuntime();if(config.OPERATIONS_ENABLED!=='true'||!config.ENQUIRY_SITE_LIMITER)return json(503,{error:'Operations unavailable.'});
  if(request.headers.get('origin')!==operationsOrigin(config))return json(403,{error:'Request denied.'});
  if(!(await config.ENQUIRY_SITE_LIMITER.limit({key:'owner-workspace'})).success)return json(429,{error:'Too many requests. Wait a minute.'});
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return json(415,{error:'Expected JSON.'});
  const reader=request.body?.getReader();if(!reader)return json(400,{error:'Missing request.'});
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>45000){await reader.cancel();return json(413,{error:'Request too large.'});}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return json(400,{error:'Invalid JSON.'});}
  if(!body||typeof body!=='object'||Array.isArray(body))return json(400,{error:'Invalid request.'});
  const client=await createClient({writableCookies:true});if(!await verifyOwner(client))return json(403,{error:'Current owner access with MFA required. Sign in again.'});
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(body.operation==='list'||body.operation==='pdf'){
   if(!['quotations','orders'].includes(body.kind)||typeof body.search!=='string'||body.search.length>100||typeof body.state!=='string'||body.state.length>30||!Number.isInteger(body.offset)||body.offset<0||body.offset>100000)return json(400,{error:'Invalid filters.'});
   if(body.operation==='pdf'&&(body.kind!=='quotations'||typeof body.id!=='string'||!uuid.test(body.id)))return json(400,{error:'Invalid quotation.'});
   const result=await client.rpc('takween_commercial_list',{p_kind:body.kind,p_search:body.search,p_state:body.state,p_offset:body.offset,p_id:body.operation==='pdf'?body.id:null});
   if(result.error)return json(503,{error:'Records unavailable.'});
   if(body.operation==='list')return json(200,{rows:result.data});
   if(!Array.isArray(result.data)||result.data.length!==1)return json(404,{error:'Quotation not found.'});
   // Authenticated snapshot only. Font shaping/PDF generation runs locally in the
   // owner's browser, keeping expensive work off the free Worker CPU budget.
   return json(200,{quotation:result.data[0]});
  }
  if(!['quote','order'].includes(body.operation)||typeof body.requestId!=='string'||!uuid.test(body.requestId)||!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))return json(400,{error:'Invalid operation.'});
  const result=await client.rpc(body.operation==='quote'?'takween_quote_command':'takween_order_command',{p_request_id:body.requestId,p_payload:body.payload});
  if(result.error){const conflict=['23505','40001'].includes(result.error.code);return json(conflict?409:400,{error:conflict?'Conflict or stale version. Refresh before retrying; do not create another request.':'Operation not confirmed. Check fields, lifecycle and owner permissions.'});}
  return json(200,{result:result.data});
 }catch{return json(503,{error:'Operation could not be confirmed. Refresh before retrying with the same request.'});}
}
