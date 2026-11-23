import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {SubmissionConflict, type EnquiryPayload, type StoreResult} from './intake.ts';

export type RepositoryEnvironment = {SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string};
export async function storeEnquiry(env: RepositoryEnvironment, id: string, payload: EnquiryPayload): Promise<StoreResult> {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (!url || !key?.startsWith('sb_secret_')) throw Error('Operational database configuration is unavailable');
  const parsed = new URL(url);
  const local = ['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw Error('Invalid database origin');
  // No user cookie/session is ever attached to this narrowly scoped service client.
  const client = createClient(parsed.origin, key, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch: (input, init) => fetch(input, {...init, signal:AbortSignal.timeout(10000)})}});
  const {data,error} = await client.rpc('takween_submit_enquiry', {p_request_id:id,p_payload:payload});
  if (error?.code === '23505') throw new SubmissionConflict();
  if (error || !Array.isArray(data) || data.length !== 1) throw Error('Database storage was not confirmed');
  return data[0] as StoreResult;
}
