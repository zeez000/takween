export type NotificationJob = {id:string;leaseToken:string;reference:string;name:string;email:string;description:string;quantity:number;material:string;category:string};
export type NotificationOutcome = 'accepted'|'retry'|'failed'|'uncertain';
export type NotificationRepository = {
  claim():Promise<NotificationJob|null>;
  finish(job:NotificationJob,outcome:NotificationOutcome,providerId?:string):Promise<boolean>;
};
export type NotificationEnvironment = {ENQUIRY_NOTIFICATIONS_ENABLED?:string;RESEND_API_KEY?:string;RESEND_FROM_EMAIL?:string};
/** Provider acceptance is not delivery. No ambiguous result is automatically retried. */
export async function dispatchNotification(env:NotificationEnvironment,repository:NotificationRepository,send:typeof fetch=fetch){
  if(env.ENQUIRY_NOTIFICATIONS_ENABLED!=='true')return {status:'disabled' as const};
  if(!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.RESEND_FROM_EMAIL) || env.RESEND_FROM_EMAIL.endsWith('@resend.dev'))throw Error('Notification configuration unavailable');
  const job=await repository.claim();if(!job)return {status:'empty' as const};
  let outcome:NotificationOutcome='uncertain';let providerId:string|undefined;
  try{
    const result=await send('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),
      headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`notification/${job.id}`},
      body:JSON.stringify({from:env.RESEND_FROM_EMAIL,to:['takweenlabs.in@gmail.com'],reply_to:job.email,
        subject:`TAKWEEN LABS enquiry ${job.reference}`,text:`Reference: ${job.reference}\nName: ${job.name}\nEmail: ${job.email}\nCategory: ${job.category}\nMaterial: ${job.material}\nQuantity: ${job.quantity}\n\n${job.description}\n\nNo files uploaded.`})});
    if(result.ok){const body=await result.json();if(typeof body?.id==='string' && body.id.trim() && body.id.length<=200){outcome='accepted';providerId=body.id.trim();}}
    else if(result.status===429)outcome='retry';
    else if(result.status>=400 && result.status<500)outcome='failed';
  }catch{/* A transport timeout or malformed provider response is ambiguous. */}
  const recorded=await repository.finish(job,outcome,providerId);
  if(!recorded)return {status:'unconfirmed' as const};
  return {status:outcome};
}
