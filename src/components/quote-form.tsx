"use client";
import {useRef,useState,type FormEvent} from "react";
import {site} from "@/config/site";
import {formatEnquiry,validateDesignFile} from "@/lib/enquiry";
export function QuoteForm() {
  const [fileName,setFileName]=useState("");
  const [fileError,setFileError]=useState("");
  const [draft,setDraft]=useState("");
  const [message,setMessage]=useState("");
  const [sending,setSending]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null);
  const busy=useRef(false);
  const retry=useRef<{draft:string;id:string}|null>(null);
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
    const formatted=formatEnquiry(values);
    if((event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-draft")==="true"){
      setDraft(formatted);setMessage("Draft prepared on this device. Nothing has been sent.");return;
    }
    if(!retry.current || retry.current.draft!==formatted)retry.current={draft:formatted,id:crypto.randomUUID()};
    busy.current=true;setSending(true);
    try{
      const response=await fetch("/api/enquiry",{method:"POST",signal:AbortSignal.timeout(20000),headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name:values.name,email:values.contact,material:values.material,quantity:values.quantity,details:values.details,
          website:value("website"),requestId:retry.current.id})});
      const result=await response.json();
      if(response.status!==202 || result.status!=="accepted" || typeof result.id!=="string" || !result.id.trim())throw new Error("Not accepted");
      setMessage("Your enquiry was accepted by our email provider. Inbox delivery is not yet confirmed.");
    }catch{
      setDraft(formatted);setMessage("We could not confirm your enquiry was accepted. Retry, or copy the draft and email us directly.");
    }finally{busy.current=false;setSending(false);}
  }
  return <form className="quote-form" onSubmit={prepare} onChange={()=>{setDraft("");setMessage("");}}>
    <div className="form-grid">
      <label>Your name<input id="draft-name" autoComplete="name" required maxLength={100} disabled={sending}/></label>
      <label>Your email<input id="draft-email" type="email" autoComplete="email" required maxLength={150} disabled={sending}/></label>
      <label>Preferred material<select id="draft-material" defaultValue="Please advise" disabled={sending}><option>Please advise</option><option>PLA</option><option>PETG</option></select></label>
      <label>Quantity<input id="draft-quantity" type="number" defaultValue={1} min={1} max={10000} required disabled={sending}/></label>
    </div>
    <label>Tell us about your idea<textarea id="draft-details" rows={4} required minLength={10} maxLength={3000} disabled={sending} placeholder="Purpose, approximate dimensions, intended use and any deadline."/></label>
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
    <div className="button-row"><button className="button" type="submit" disabled={sending}>{sending?"Sending…":"Send enquiry ↗"}</button>
    <button className="button button-secondary" type="submit" data-draft="true" disabled={sending}>Prepare enquiry draft ↗</button></div>
    <p className="form-note">Enquiries do not create orders or quotations. Design files remain on your device and are not attached. Pricing and feasibility require manual review.</p>
    <p role="status" aria-live="polite">{message}</p>
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
