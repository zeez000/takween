"use client";
import {useRef,useState,type FormEvent} from "react";
import {site} from "@/config/site";
import {formatEnquiry,validateDesignFile} from "@/lib/enquiry";
import {selectRequestId,REQUEST_ID_KEY} from '@/lib/operations/request-id';
export function QuoteForm() {
  const [fileName,setFileName]=useState("");
  const [fileError,setFileError]=useState("");
  const [draft,setDraft]=useState("");
  const [message,setMessage]=useState("");
  const [sending,setSending]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null);
  const busy=useRef(false);
  const retry=useRef<{draft:string;id:string}|null>(null);
  const [persistence,setPersistence]=useState<{privacyVersion:string;privacyNotice:string}|null>(null);
  const configRequested=useRef(false);
  const [category,setCategory]=useState('printing');
  async function loadPersistence(){
    if(configRequested.current)return;configRequested.current=true;
    try{const r=await fetch('/api/operational/intake-config',{cache:'no-store',signal:AbortSignal.timeout(5000)});const c=await r.json();
      if(r.ok&&c.enabled===true&&typeof c.privacyVersion==='string'&&typeof c.privacyNotice==='string')setPersistence(c);
    }catch{/* Keep the existing manual/provider-only fallback while configuration is unavailable. */}
  }
  async function prepare(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setDraft("");
    if(busy.current)return;
    if(fileError){setMessage("Remove or replace the unsupported file before preparing a draft.");return;}
    // Unnamed controls keep draft values out of native submissions before hydration.
    const controls=event.currentTarget.elements;
    const value=(id:string)=>(controls.namedItem(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    const values={
      name:value("draft-name"),contact:value("draft-email"),material:value("draft-material"),
      quantity:value("draft-quantity"),details:value("draft-details")
    };
    const process=persistence&&category==='fateen_machining'?value('machining-process'):undefined;
    const referralConsent=persistence&&category==='fateen_machining'?(controls.namedItem('referral-consent') as HTMLInputElement)?.checked:false;
    const formatted=formatEnquiry(values)+(persistence?`\nCategory: ${category}${process?`\nProcess: ${process}`:''}`:'');
    const consent=persistence?(controls.namedItem('contact-consent') as HTMLInputElement)?.checked:false;
    if(persistence&&!consent){setMessage('Please review the privacy notice and consent before submitting.');return;}
    if(persistence&&category==='fateen_machining'&&!referralConsent){setMessage('Referral consent is required for a machining request. No information is forwarded automatically.');return;}
    if((event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-draft")==="true"){
      setDraft(formatted);setMessage("Draft prepared on this device. Nothing has been sent.");return;
    }
    const fingerprint=formatted+(persistence?`\n${persistence.privacyVersion}|${consent}|${referralConsent}`:'');
    let storage:Storage|undefined;try{storage=window.sessionStorage;}catch{}
    retry.current=selectRequestId(retry.current,fingerprint,Boolean(persistence),storage);
    busy.current=true;setSending(true);
    try{
      const controller=new AbortController();
      let timeout:ReturnType<typeof setTimeout>|undefined;
      const deadline=new Promise<never>((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(Error('Request deadline exceeded'));},20000)});
      let response:Response;let result;
      try{const completed=await Promise.race([fetch(persistence?'/api/operational/enquiries':'/api/enquiry',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},
        body:JSON.stringify(persistence?{name:values.name,email:values.contact,material:values.material,quantity:Number(values.quantity),description:values.details,
          website:value('website'),requestId:retry.current.id,category,contactConsent:true,referralConsent,privacyVersion:persistence.privacyVersion,...(process?{process}:{})}
          :{name:values.name,email:values.contact,material:values.material,quantity:values.quantity,details:values.details,website:value('website'),requestId:retry.current.id})}).then(async response=>({response,result:await response.json()})),deadline]);response=completed.response;result=completed.result;}
      finally{clearTimeout(timeout);}
      if(persistence){
        if(response.status===409){setDraft(formatted);setMessage('This identifier belongs to different details. Use Start a separate enquiry for a new project; no existing request was overwritten.');return;}
        if(response.status!==201||result.status!=='stored'||!/^TK-[0-9a-f]{32}$/.test(result.reference))throw Error('Storage not confirmed');
        setMessage(`Your enquiry is stored. Reference: ${result.reference}. Email delivery is not confirmed.`);return;
      }
      if(response.status!==202 || result.status!=="accepted" || typeof result.id!=="string" || !result.id.trim())throw new Error("Not accepted");
      setMessage("Your enquiry was accepted by our email provider. Inbox delivery is not yet confirmed.");
    }catch{
      setDraft(formatted);setMessage(persistence?'Storage could not be confirmed. Retry the same request, or copy the draft and email us directly.':"We could not confirm your enquiry was accepted. Retry, or copy the draft and email us directly.");
    }finally{busy.current=false;setSending(false);}
  }
  return <form method="post" className="quote-form" onFocusCapture={()=>void loadPersistence()} onSubmit={prepare} onChange={()=>{setDraft("");setMessage("");}}>
    <div className="form-grid">
      <label>Your name<input id="draft-name" autoComplete="name" required maxLength={100} disabled={sending}/></label>
      <label>Your email<input id="draft-email" type="email" autoComplete="email" required maxLength={150} disabled={sending}/></label>
      <label>Preferred material{persistence&&category==='fateen_machining'?<input id="draft-material" defaultValue="Please advise" maxLength={80} disabled={sending}/>:<select id="draft-material" defaultValue="Please advise" disabled={sending}><option>Please advise</option><option>PLA</option><option>PETG</option></select>}</label>
      <label>Quantity<input id="draft-quantity" type="number" defaultValue={1} min={1} max={10000} required disabled={sending}/></label>
    </div>
    <label>Tell us about your idea<textarea id="draft-details" rows={4} required minLength={10} maxLength={3000} disabled={sending} placeholder="Purpose, approximate dimensions, intended use and any deadline."/></label>
    {persistence&&<><label>Request category<select id="request-category" value={category} disabled={sending} onChange={e=>setCategory(e.target.value)}><option value="printing">3D printing</option><option value="fateen_machining">Fateen machining</option></select></label>
      {category==='fateen_machining'&&<><label>Requested machining process<select id="machining-process" defaultValue="unsure" disabled={sending}><option value="unsure">Please advise</option><option value="wire_cut_edm">Wire-cut EDM</option><option value="surface_grinding">Surface grinding</option><option value="turning">Turning</option></select></label>
        <label><input id="referral-consent" type="checkbox" style={{width:'auto',marginRight:12}} required disabled={sending}/>I consent to an owner-reviewed referral to Fateen. No automatic forwarding or service availability is promised.</label></>}
    </>}
    <div className="file-area">
      <label htmlFor="design-file">Select a design file for local validation</label>
      <p id="file-help">STL, 3MF or STEP · 25 MB preview limit. The file stays on your device. Secure uploads are planned.</p>
      <input ref={fileInput} id="design-file" type="file" accept=".stl,.3mf,.step,.stp" disabled={sending} aria-describedby="file-help file-result" aria-invalid={Boolean(fileError)} onChange={event=>{const file=event.currentTarget.files?.[0];const error=file?validateDesignFile(file):null;setFileError(error??"");setFileName(file&&!error?file.name:"");}}/>
      <p id="file-result" role="status">{fileError||(fileName?`${fileName} selected locally. Not uploaded.`:"No file selected.")}</p>
      {(fileName||fileError)&&<button className="button button-secondary" type="button" disabled={sending} onClick={()=>{
        if(fileInput.current)fileInput.current.value="";
        setFileName("");setFileError("");setDraft("");setMessage("");
      }}>Clear selected file</button>}
    </div>
    <div hidden aria-hidden="true"><label>Leave this field empty<input id="website" tabIndex={-1} autoComplete="off"/></label></div>
    {persistence&&<label><input id="contact-consent" type="checkbox" style={{width:'auto',marginRight:12}} required disabled={sending}/>{persistence.privacyNotice}</label>}
    <div className="button-row"><button className="button" type="submit" disabled={sending}>{sending?"Sending…":"Send enquiry ↗"}</button>
    <button className="button button-secondary" type="submit" data-draft="true" disabled={sending}>Prepare enquiry draft ↗</button></div>
    {persistence&&<button className="button button-secondary" type="button" disabled={sending} onClick={()=>{retry.current=null;try{sessionStorage.removeItem(REQUEST_ID_KEY)}catch{}setMessage('The next submission will be a separate enquiry. Existing requests are retained.');}}>Start a separate enquiry</button>}
    <p className="form-note">Enquiries do not create orders or quotations. Design files remain on your device and are not attached. Pricing and feasibility require manual review.</p>
    <p role="status" aria-live="polite" style={{overflowWrap:'anywhere'}}>{message}</p>
    {draft&&<div className="draft-panel">
      <label>Your enquiry draft<textarea readOnly rows={10} value={draft}/></label>
      <div className="button-row">
        <button className="button button-secondary" type="button" onClick={async()=>{
          try { await navigator.clipboard.writeText(draft); setMessage("Draft copied. Paste it into your email app."); }
          catch { setMessage("Select and copy the draft text manually."); }
        }}>Copy draft</button>
        <a className="button" href={`mailto:${site.enquiryEmail}`}>Open email app ↗</a>
      </div>
      <p className="form-note">Paste your draft into your email app and send it when ready. Your selected file stays on this device.</p>
    </div>}
  </form>;
}
