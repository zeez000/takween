'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/browser';
import {CommercialWorkspace} from '@/components/commercial-workspace';
import {createPrivateRequestScope,privateRequestSignal} from '@/lib/operations/private-requests';
type Enquiry={id:string;reference:string;description:string;category:string;quantity:number;material:string;status:string;createdAt:string;
  process:string|null;referralConsent:boolean;privacyVersion:string;colour:string|null;dimensions:string|null;preferredDeadline:string|null;
  customer:{name:string;email:string;phone:string|null};history:{kind:string;createdAt:string}[];notes:{id:string;body:string;createdAt:string}[]};
export function OwnerDashboard(){
  const [stage,setStage]=useState<'login'|'mfa'|'inbox'>('login');
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('Invitation-only access. Use your provisioned account and authenticator.');
  const [rows,setRows]=useState<Enquiry[]>([]);const [offset,setOffset]=useState(0);const [search,setSearch]=useState('');const [category,setCategory]=useState('');
  const [enrolment,setEnrolment]=useState<{id:string;secret:string}|null>(null);
  const [invited,setInvited]=useState(false);
  const noteRetries=useRef(new Map<string,{body:string;id:string}>());
  const [securityScope]=useState(createPrivateRequestScope);const inboxSequence=useRef(0);const logoutPending=useRef(false);
  const clearPrivate=useCallback(()=>{securityScope.invalidate();inboxSequence.current++;setRows([]);setSearch('');setOffset(0);setCategory('');setEnrolment(null);noteRetries.current.clear();setInvited(false);setStage('login');setBusy(logoutPending.current);setMessage('Private workspace cleared. Sign in with your provisioned account and MFA.');},[securityScope]);
  useEffect(()=>{
    securityScope.resume();
    const onHidden=()=>{if(document.hidden){securityScope.pause();inboxSequence.current++;setRows([]);setBusy(logoutPending.current);setMessage('Private records hidden. Refresh the inbox when you return.');}else securityScope.resume();};
    let client:ReturnType<typeof createClient>;try{client=createClient();}catch{queueMicrotask(()=>setMessage('Owner configuration is unavailable.'));return;}
    const {data}=client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')clearPrivate();});
    if(new URL(window.location.href).searchParams.get('invited')==='1'){
      const ticket=securityScope.capture();void client.auth.getUser().then(({data,error})=>{if(ticket.isCurrent()&&!error&&data.user){setInvited(true);setStage('mfa');setMessage('Set your password, then enrol and verify your authenticator.');}});
    }
    document.addEventListener('visibilitychange',onHidden);return()=>{securityScope.pause();data.subscription.unsubscribe();document.removeEventListener('visibilitychange',onHidden);};
  },[securityScope,clearPrivate]);
  async function api(action:string,payload:object={}){
    const ticket=securityScope.capture(),transport=privateRequestSignal([ticket],15000);
    try{const r=await fetch('/api/operational/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload}),signal:transport.signal});ticket.assertCurrent();
    if(r.status===401||r.status===403){clearPrivate();throw Error('Request not authorized. Sign in again.');}
    const data=await r.json();ticket.assertCurrent();if(!r.ok)throw Error('Request not authorized or unavailable. Sign in again if your session expired.');return data;
    }finally{transport.dispose();}
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;const ticket=securityScope.capture();setBusy(true);setMessage('');const form=event.currentTarget;
    const value=(id:string)=>(form.elements.namedItem(id) as HTMLInputElement)?.value??'';
    try{
      if(stage==='login'){
        const client=createClient();const result=await client.auth.signInWithPassword({email:value('owner-email'),password:value('owner-password')});
        ticket.assertCurrent();if(result.error)throw Error('Sign-in failed. Check your provisioned account.');
        setStage('mfa');setMessage('Enter your authenticator code. Accounts without an enrolled factor require owner provisioning.');
      }else{
        const client=createClient();const factors=await client.auth.mfa.listFactors();
        ticket.assertCurrent();const factor=enrolment??factors.data?.totp.find(f=>f.status==='verified');
        if(factors.error||!factor)throw Error('No provisioned authenticator. Contact the owner; access remains denied.');
        const verified=await client.auth.mfa.challengeAndVerify({factorId:factor.id,code:value('owner-code')});
        ticket.assertCurrent();if(verified.error)throw Error('Authenticator verification failed.');
        const result=await api('inbox',{search:'',category:'',offset:0});ticket.assertCurrent();setEnrolment(null);setRows(result.rows);setStage('inbox');setMessage('');
      }
    }catch(error){if(ticket.isCurrent())setMessage(error instanceof Error?error.message:'Workspace unavailable.');}finally{if(ticket.isCurrent())setBusy(false);}
  }
  async function load(next=0){const ticket=securityScope.capture(),sequence=++inboxSequence.current;const current=()=>ticket.isCurrent()&&sequence===inboxSequence.current;setBusy(true);try{const result=await api('inbox',{search,category,offset:next});if(!current())return;setRows(result.rows);setOffset(next);setMessage(result.rows.length?'':'No enquiries match this view.');}catch{if(current()){setRows([]);setMessage('Could not load enquiries. Your session may have expired.');}}finally{if(current())setBusy(false);}}
  async function logout(){logoutPending.current=true;clearPrivate();setBusy(true);try{const signedOut=await createClient().auth.signOut();if(signedOut.error)throw Error('revocation');await api('logout');setMessage('Signed out.');}catch{setMessage('Local view cleared. Session revocation could not be confirmed; retry logout.');}finally{logoutPending.current=false;setBusy(false);}}
  return <section aria-label="Private owner workspace" aria-busy={busy}>
    <noscript><p>Owner sign-in requires JavaScript. Use the public email contact if you need assistance.</p></noscript>
    {stage!=='inbox'?<form method="post" className="quote-form" onSubmit={submit}>
      {stage==='login'?<><label>Email<input id="owner-email" type="email" autoComplete="username" required maxLength={150} disabled={busy}/></label><label>Password<input id="owner-password" type="password" autoComplete="current-password" required disabled={busy}/></label></>
        :<label>Authenticator code<input id="owner-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required disabled={busy}/></label>}
      <button className="button" disabled={busy}>{busy?'Checking…':stage==='login'?'Sign in':'Verify MFA'}</button>
    </form>:<>
      <button className="button button-secondary" onClick={logout} disabled={busy}>Log out</button>
      <CommercialWorkspace enquiries={rows} securityScope={securityScope} onAccessDenied={clearPrivate}/>
      <form method="post" className="quote-form" onSubmit={e=>{e.preventDefault();void load()}}><label>Search enquiries<input value={search} maxLength={100} onChange={e=>setSearch(e.target.value)}/></label>
        <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All</option><option value="printing">3D printing</option><option value="fateen_machining">Fateen machining</option></select></label><button className="button" disabled={busy}>Search / refresh</button></form>
      <p>Enquiry inbox · {rows.length} records in this page</p>
      {rows.map(row=><details className="quote-form" style={{overflowWrap:'anywhere'}} key={row.id}><summary>{row.reference} · {row.customer.name} · {row.status}</summary>
        <p>{row.category} · {row.material} · Quantity {row.quantity}</p><p>{row.description}</p><p>{row.customer.email}{row.customer.phone?` · ${row.customer.phone}`:''}</p>
        {row.process&&<p>Requested process: {row.process}. Referral consent: {row.referralConsent?'recorded':'not recorded'}. Routing remains manual.</p>}
        {(row.colour||row.dimensions||row.preferredDeadline)&&<p>Colour: {row.colour??'not specified'} · Dimensions: {row.dimensions??'not specified'} · Preferred deadline: {row.preferredDeadline??'not specified'}</p>}
        <p>Privacy notice: {row.privacyVersion} · Received {new Date(row.createdAt).toLocaleString()}</p>
        <h2>Status history</h2><ul>{row.history.map((h,i)=><li key={i}>{h.kind} · {new Date(h.createdAt).toLocaleString()}</li>)}</ul>
        <h2>Internal notes</h2><ul>{row.notes.map(n=><li key={n.id}>{n.body}</li>)}</ul>
        <form method="post" onSubmit={async e=>{e.preventDefault();if(busy)return;const ticket=securityScope.capture();const form=e.currentTarget;const body=(form.elements.namedItem(`note-${row.id}`) as HTMLTextAreaElement).value;setBusy(true);
          let retry=noteRetries.current.get(row.id);if(!retry||retry.body!==body){retry={body,id:crypto.randomUUID()};noteRetries.current.set(row.id,retry);}
          try{await api('note',{id:row.id,noteId:retry.id,body});ticket.assertCurrent();noteRetries.current.delete(row.id);form.reset();await load(offset);}catch{if(ticket.isCurrent())setMessage('Note could not be confirmed. Refresh before retrying.');}finally{if(ticket.isCurrent())setBusy(false);}}}>
          <label>New internal note<textarea id={`note-${row.id}`} required maxLength={2000} rows={3} disabled={busy}/></label><button className="button" disabled={busy}>Save note</button></form>
      </details>)}
      <div className="button-row"><button className="button button-secondary" disabled={busy||offset===0} onClick={()=>load(Math.max(0,offset-25))}>Previous</button><button className="button button-secondary" disabled={busy||rows.length<25} onClick={()=>load(offset+25)}>Next</button></div>
    </>}
    <p role="status" aria-live="polite">{message}</p>
    {stage==='login'&&<button className="button button-secondary" disabled={busy} onClick={logout}>Clear session / log out</button>}
    {stage==='mfa'&&<>
      {invited&&<form method="post" className="quote-form" onSubmit={async e=>{e.preventDefault();if(busy)return;const ticket=securityScope.capture();const form=e.currentTarget;const password=(form.elements.namedItem('owner-new-password') as HTMLInputElement).value;setBusy(true);
        try{await api('provision');const result=await createClient().auth.updateUser({password});ticket.assertCurrent();if(result.error)throw Error('password');form.reset();setInvited(false);setMessage('Password set. Enrol and verify your authenticator.');}catch{if(ticket.isCurrent())setMessage('Password update could not be confirmed.');}finally{if(ticket.isCurrent())setBusy(false);}}}>
        <label>New owner password<input id="owner-new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy}/></label><button className="button" disabled={busy}>Set password</button>
      </form>}
      {!enrolment?<button className="button button-secondary" disabled={busy} onClick={async()=>{const ticket=securityScope.capture();setBusy(true);try{
        await api('provision');const client=createClient();const factors=await client.auth.mfa.listFactors();
        ticket.assertCurrent();if(factors.error)throw Error('Factor lookup unavailable');
        for(const factor of factors.data.all){ticket.assertCurrent();if(factor.factor_type==='totp'&&factor.status==='unverified'&&factor.friendly_name==='TAKWEEN owner'){const removed=await client.auth.mfa.unenroll({factorId:factor.id});ticket.assertCurrent();if(removed.error)throw Error('Stale enrolment could not be cleared');}}
        const result=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'TAKWEEN owner'});
        ticket.assertCurrent();if(result.error)throw Error('Could not enrol authenticator.');setEnrolment({id:result.data.id,secret:result.data.totp.secret});
      }catch{if(ticket.isCurrent())setMessage('Authenticator setup denied or unavailable.');}finally{if(ticket.isCurrent())setBusy(false);}}}>Set up authenticator</button>
        :<p>Enter this secret in your authenticator, then verify its code: <code>{enrolment.secret}</code>. Keep it private.</p>}
      <button className="button button-secondary" disabled={busy} onClick={logout}>Cancel / log out</button>
    </>}
  </section>;
}
