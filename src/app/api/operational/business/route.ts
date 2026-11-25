import 'server-only';
import {operationsRuntime,operationsOrigin} from '@/lib/operations/runtime';
import {createClient} from '@/lib/supabase/server';import {verifyOwner} from '@/lib/operations/owner-access';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
const json=(status:number,body:object)=>Response.json(body,{status,headers});
export async function POST(request:Request){
 try{
  const config=await operationsRuntime();if(config.OPERATIONS_ENABLED!=='true'||config.BUSINESS_OPERATIONS_ENABLED!=='true'||!config.ENQUIRY_SITE_LIMITER)return json(503,{error:'Business operations are not activated.'});
  if(request.headers.get('origin')!==operationsOrigin(config))return json(403,{error:'Request denied.'});
  if(!(await config.ENQUIRY_SITE_LIMITER.limit({key:'owner-workspace'})).success)return json(429,{error:'Too many requests. Wait a minute.'});
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return json(415,{error:'Expected JSON.'});
  const reader=request.body?.getReader();if(!reader)return json(400,{error:'Missing request.'});let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>20000){await reader.cancel();return json(413,{error:'Request too large.'});}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return json(400,{error:'Invalid JSON.'});}
  if(!body||typeof body!=='object'||Array.isArray(body))return json(400,{error:'Invalid request.'});
  const client=await createClient({writableCookies:true});if(!await verifyOwner(client))return json(403,{error:'Current owner access with MFA required.'});
  if(body.operation==='list'){
   if(Object.keys(body).some(k=>!['operation','kind','search','offset'].includes(k))||!['materials','movements','machines','maintenance','estimates','events','scheduling','finance','job_costs','reports','choices','products','variants','customers','customer_notes'].includes(body.kind)||typeof body.search!=='string'||body.search.length>100||!Number.isInteger(body.offset)||body.offset<0||body.offset>100000)return json(400,{error:'Invalid filters.'});
   const result=await client.rpc('takween_business_list',{p_kind:body.kind,p_search:body.search,p_offset:body.offset});if(result.error)return json(503,{error:'Records unavailable. Refresh after configuration is verified.'});return json(200,{rows:result.data});
  }
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(body.operation==='export'){
   if(Object.keys(body).some(k=>!['operation','kind','ids','requestId'].includes(k))||!['customers','finance','materials','orders'].includes(body.kind)||typeof body.requestId!=='string'||!uuid.test(body.requestId)||!Array.isArray(body.ids)||body.ids.length<1||body.ids.length>25||body.ids.some((id:unknown)=>typeof id!=='string'||!uuid.test(id))||new Set(body.ids).size!==body.ids.length)return json(400,{error:'Invalid export selection.'});
   const result=await client.rpc('takween_business_export',{p_request_id:body.requestId,p_kind:body.kind,p_ids:body.ids});if(result.error)return json(409,{error:'Export not confirmed. No automatic retry; review access and selection before a new explicit request.'});return json(200,{export:result.data});
  }
  if(body.operation!=='command'||Object.keys(body).some(k=>!['operation','requestId','payload'].includes(k))||typeof body.requestId!=='string'||!uuid.test(body.requestId)||!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))return json(400,{error:'Invalid operation.'});
  const result=await client.rpc('takween_business_command',{p_request_id:body.requestId,p_payload:body.payload});
  if(result.error)return json(['23505','40001'].includes(result.error.code)?409:400,{error:'Operation not confirmed. Check values, stock and current version; refresh before retrying with the same request.'});
  return json(200,{result:result.data});
 }catch{return json(503,{error:'Outcome not confirmed. Refresh before retrying; do not create another request.'});}
}
