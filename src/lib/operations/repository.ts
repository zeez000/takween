import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {SubmissionConflict, type EnquiryPayload, type StoreResult} from './intake.ts';
import type {NotificationJob,NotificationRepository} from './dispatcher.ts';

export type RepositoryEnvironment = {SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string};
export function serviceDatabase(env: RepositoryEnvironment) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (!url || !key?.startsWith('sb_secret_')) throw Error('Operational database configuration is unavailable');
  const parsed = new URL(url);
  const local = ['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw Error('Invalid database origin');
  // No user cookie/session is ever attached to this narrowly scoped service client.
  return createClient(parsed.origin, key, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch: (input, init) => fetch(input, {...init, signal:AbortSignal.timeout(10000)})}});
}
export async function storeEnquiry(env: RepositoryEnvironment, id: string, payload: EnquiryPayload): Promise<StoreResult> {
  const client=serviceDatabase(env);
  const {data,error} = await client.rpc('takween_submit_enquiry', {p_request_id:id,p_payload:payload});
  if (error?.code === '23505') throw new SubmissionConflict();
  if (error || !Array.isArray(data) || data.length !== 1) throw Error('Database storage was not confirmed');
  return data[0] as StoreResult;
}
export function notificationRepository(env:RepositoryEnvironment):NotificationRepository{
  const client=serviceDatabase(env);
  return {
    async claim(){const {data,error}=await client.rpc('takween_claim_notification');if(error)throw Error('Notification claim unavailable');return data as NotificationJob|null;},
    async finish(job,outcome,providerId){const {data,error}=await client.rpc('takween_finish_notification',{p_id:job.id,p_lease_token:job.leaseToken,p_outcome:outcome,p_provider_id:providerId??null});if(error)throw Error('Notification outcome not confirmed');return data===true;},
  };
}
