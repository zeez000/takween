import 'server-only';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {handlePersistentEnquiry, type IntakeEnvironment} from '@/lib/operations/intake';
import {storeEnquiry, type RepositoryEnvironment} from '@/lib/operations/repository';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const {env} = await getCloudflareContext({async:true});
    const config = env as unknown as IntakeEnvironment & RepositoryEnvironment;
    return handlePersistentEnquiry(request, config, (id,payload) => storeEnquiry(config,id,payload));
  } catch {
    return Response.json({error:'Stored enquiries are unavailable.'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
