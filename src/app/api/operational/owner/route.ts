import 'server-only';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {createClient} from '@/lib/supabase/server';
import {verifyOwner} from '@/lib/operations/owner-access';

export const runtime = 'nodejs';
export async function GET() {
  const headers = {'Cache-Control':'private, no-store','Vary':'Cookie'};
  try {
    const {env} = await getCloudflareContext({async:true});
    if ((env as {OPERATIONS_ENABLED?: string}).OPERATIONS_ENABLED !== 'true') return Response.json({error:'Owner operations are unavailable.'},{status:503,headers});
    const client = await createClient({writableCookies:true});
    if (!await verifyOwner(client)) return Response.json({error:'Owner access with MFA is required.'},{status:403,headers});
    return Response.json({authorized:true},{headers});
  } catch { return Response.json({error:'Owner operations are unavailable.'},{status:503,headers}); }
}
