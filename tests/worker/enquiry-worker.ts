import {handleEnquiry,type EnquiryEnvironment} from '../../src/lib/enquiry-handler';
import {handlePersistentEnquiry} from '../../src/lib/operations/intake';
// Local workerd integration harness only. Never deploy: provider transport is mocked.
const worker = {fetch(request:Request,env:EnquiryEnvironment){
  if(new URL(request.url).pathname==='/persistent') return handlePersistentEnquiry(request,{
    ...env,PERSISTENT_ENQUIRIES_ENABLED:'true',ENQUIRY_PRIVACY_VERSION:'local-test',SITE_URL:'http://127.0.0.1:8791',
  },async()=>({reference:'TK-'+'a'.repeat(32),notification_status:'pending'}));
  return handleEnquiry(request,{...env,ENQUIRY_ENABLED:'true',SITE_URL:'http://127.0.0.1:8791',RESEND_API_KEY:'local-test-not-a-key',RESEND_FROM_EMAIL:'studio@example.invalid'},async()=>Response.json({id:'local-mock-provider-id'}));
}};
export default worker;
