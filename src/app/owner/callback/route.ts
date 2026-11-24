import 'server-only';
import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {operationsRuntime,operationsOrigin} from '@/lib/operations/runtime';
export async function GET(request:Request){
  const url=new URL(request.url);const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
  const config=await operationsRuntime();
  if(config.OPERATIONS_ENABLED!=='true')return new Response('Owner onboarding is disabled.',{status:503,headers});
  const hash=url.searchParams.get('token_hash');
  if(url.searchParams.get('type')!=='invite'||!hash||hash.length>512)return new Response('Invalid invitation.',{status:400,headers});
  try{
    const client=await createClient({writableCookies:true});const verified=await client.auth.verifyOtp({type:'invite',token_hash:hash});
    if(verified.error)return new Response('Invitation expired or invalid.',{status:403,headers});
    const allowed=await client.rpc('takween_owner_provisioning_allowed');
    if(allowed.error||allowed.data!==true){await client.auth.signOut();return new Response('Owner access denied.',{status:403,headers});}
    const target=new URL('/owner',operationsOrigin(config));target.searchParams.set('invited','1');
    const response=NextResponse.redirect(target);for(const [key,value] of Object.entries(headers))response.headers.set(key,value);return response;
  }catch{return new Response('Owner onboarding is unavailable.',{status:503,headers});}
}
