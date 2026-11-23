import 'server-only';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {handlePersistentEnquiry, type IntakeEnvironment} from '@/lib/operations/intake';
import {storeEnquiry, type RepositoryEnvironment} from '@/lib/operations/repository';
import {operationsOrigin} from '@/lib/operations/runtime';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const {env} = await getCloudflareContext({async:true});
    const config = env as unknown as IntakeEnvironment & RepositoryEnvironment & {ENQUIRY_PRIVACY_NOTICE?:string;REQUEST_ORIGIN?:string};
    if(!config.ENQUIRY_PRIVACY_NOTICE?.trim())return Response.json({error:'Stored enquiries are unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
    return handlePersistentEnquiry(request, {...config,SITE_URL:operationsOrigin(config)}, (id,payload) => storeEnquiry(config,id,payload));
  } catch {
    return Response.json({error:'Stored enquiries are unavailable.'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
