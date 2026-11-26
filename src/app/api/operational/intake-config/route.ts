import {operationsRuntime} from '@/lib/operations/runtime';
export const runtime='nodejs';
export async function GET(){
  const config=await operationsRuntime();
  const enabled=config.PERSISTENT_ENQUIRIES_ENABLED==='true'&&Boolean(config.ENQUIRY_PRIVACY_VERSION?.trim())&&Boolean(config.ENQUIRY_PRIVACY_NOTICE?.trim());
  // Public capability booleans only; never expose provider/database credentials.
  const emailEnabled=config.PERSISTENT_ENQUIRIES_ENABLED!=='true'&&(config as {ENQUIRY_ENABLED?:string}).ENQUIRY_ENABLED==='true';
  return Response.json(enabled?{enabled:true,privacyVersion:config.ENQUIRY_PRIVACY_VERSION,privacyNotice:config.ENQUIRY_PRIVACY_NOTICE}:{enabled:false,emailEnabled},{headers:{'Cache-Control':'no-store'}});
}
