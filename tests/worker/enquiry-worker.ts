import {handleEnquiry,type EnquiryEnvironment} from '../../src/lib/enquiry-handler';
// Local workerd integration harness only. Never deploy: provider transport is mocked.
const worker = {fetch(request:Request,env:EnquiryEnvironment){return handleEnquiry(request,{...env,ENQUIRY_ENABLED:'true',SITE_URL:'http://127.0.0.1:8791',RESEND_API_KEY:'local-test-not-a-key',RESEND_FROM_EMAIL:'studio@example.invalid'},async()=>Response.json({id:'local-mock-provider-id'}));}};
export default worker;
