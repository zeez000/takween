import "server-only";
import {getCloudflareContext} from "@opennextjs/cloudflare";
import {handleEnquiry, type EnquiryEnvironment} from "@/lib/enquiry-handler";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const {env} = await getCloudflareContext({async:true});
    if((env as {PERSISTENT_ENQUIRIES_ENABLED?:string}).PERSISTENT_ENQUIRIES_ENABLED==='true')return Response.json({error:'Use the persistent enquiry workflow.'},{status:503,headers:{'Cache-Control':'no-store'}});
    return handleEnquiry(request, env as unknown as EnquiryEnvironment);
  } catch {
    return Response.json({error:"Enquiries are unavailable. Please email us directly."}, {status:503,headers:{"Cache-Control":"no-store"}});
  }
}
