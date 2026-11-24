export class StalePrivateRequest extends Error {constructor(){super('Private request invalidated');}}
export type PrivateTicket={signal:AbortSignal;isCurrent:()=>boolean;assertCurrent:()=>void};
/** Invalidate on view/session boundaries, even if a transport ignores abort. */
export function createPrivateRequestScope(){
 let generation=0,active=true,controller=new AbortController();
 const invalidate=()=>{generation++;controller.abort();controller=new AbortController();};
 return {
  invalidate,
  pause(){active=false;invalidate();},
  resume(){invalidate();active=true;},
  capture():PrivateTicket{
   if(!active)throw new StalePrivateRequest();
   const version=generation,signal=controller.signal;
   const isCurrent=()=>active&&generation===version&&!signal.aborted;
   return {signal,isCurrent,assertCurrent(){if(!isCurrent())throw new StalePrivateRequest();}};
  }
 };
}
export type PrivateRequestScope=ReturnType<typeof createPrivateRequestScope>;
/** Compatible with existing AbortController support; no new AbortSignal.any requirement. */
export function privateRequestSignal(tickets:PrivateTicket[],milliseconds:number){
 for(const ticket of tickets)ticket.assertCurrent();
 const controller=new AbortController(),abort=()=>controller.abort();
 for(const ticket of tickets)ticket.signal.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,milliseconds);
 return {signal:controller.signal,dispose(){clearTimeout(timer);for(const ticket of tickets)ticket.signal.removeEventListener('abort',abort);}};
}
