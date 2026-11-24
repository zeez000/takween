import {operationsRuntime} from '@/lib/operations/runtime';
export const runtime='nodejs';
export async function GET(){
  const config=await operationsRuntime();
  const enabled=config.PERSISTENT_ENQUIRIES_ENABLED==='true'&&Boolean(config.ENQUIRY_PRIVACY_VERSION?.trim())&&Boolean(config.ENQUIRY_PRIVACY_NOTICE?.trim());
  return Response.json(enabled?{enabled:true,privacyVersion:config.ENQUIRY_PRIVACY_VERSION,privacyNotice:config.ENQUIRY_PRIVACY_NOTICE}:{enabled:false},{headers:{'Cache-Control':'no-store'}});
}
