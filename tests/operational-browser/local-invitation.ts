import {readFile} from 'node:fs/promises';import {resolve,relative} from 'node:path';import {randomUUID,randomBytes} from 'node:crypto';import {createClient} from '@supabase/supabase-js';import {Client} from 'pg';
export function validateLocalInvitationTarget(status:{runtime?:string;env?:Record<string,string>}){
 if(!['native','docker','podman'].includes(status.runtime??''))throw Error('Actual disposable local runtime required');
 for(const [key,protocols] of [['API_URL',['http:','https:']],['DB_URL',['postgres:','postgresql:']]] as const){const u=new URL(status.env?.[key]??'');if(!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||!new Set<string>(protocols).has(u.protocol))throw Error('Refusing non-loopback invitation target');}
}
/** Generate a fresh LOCAL-only link, never send email, never extend Auth expiry. */
export async function localInvitation(){
 if(process.env.TAKWEEN_LOCAL_INTEGRATION!=='1')throw Error('Explicit local integration opt-in required for synthetic invitation');
 const file=resolve(process.env.TAKWEEN_LOCAL_SUPABASE_STATUS??''),inside=relative(resolve('artifacts'),file);if(!inside||inside.startsWith('..')||resolve('artifacts',inside)!==file)throw Error('Private status must be an ignored local artifact');
 const status=JSON.parse(await readFile(file,'utf8'));validateLocalInvitationTarget(status);const env=status.env;
 const service=createClient(env.API_URL,env.SECRET_KEY??env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const link=await service.auth.admin.generateLink({type:'invite',email:`invite-${randomUUID()}@example.invalid`});if(link.error||!link.data.user||!link.data.properties.hashed_token)throw Error('Synthetic local invitation could not be prepared');
 const db=new Client({connectionString:env.DB_URL});try{await db.connect();await db.query('insert into takween.admin_roles(user_id) values($1)',[link.data.user.id]);}finally{await db.end();}
 return {hash:link.data.properties.hashed_token,password:randomBytes(24).toString('base64url')};
}
