"use client";
import {useState,type FormEvent} from "react";
import {site} from "@/config/site";
import {formatEnquiry,validateDesignFile,whatsappUrl} from "@/lib/enquiry";
export function QuoteForm() {
  const [fileName,setFileName]=useState("");
  const [fileError,setFileError]=useState("");
  const [draft,setDraft]=useState("");
  const [message,setMessage]=useState("");
  function prepare(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setDraft("");
    if(fileError){setMessage("Remove or replace the unsupported file before preparing a draft.");return;}
    const data=new FormData(event.currentTarget);
    setDraft(formatEnquiry({name:String(data.get("name")??""),contact:String(data.get("contact")??""),material:String(data.get("material")??""),quantity:String(data.get("quantity")??"1"),details:String(data.get("details")??"")}));
    setMessage("Draft prepared on this device. Nothing has been sent.");
  }
  const whatsapp=whatsappUrl(site.whatsappNumber,draft);
  return <form className="quote-form" onSubmit={prepare} onChange={()=>{setDraft("");setMessage("");}}>
    <div className="form-grid">
      <label>Your name<input name="name" autoComplete="name" required maxLength={100}/></label>
      <label>Email or phone<input name="contact" required maxLength={150}/></label>
      <label>Preferred material<select name="material" defaultValue="Please advise"><option>Please advise</option><option>PLA</option><option>PETG</option></select></label>
      <label>Quantity<input name="quantity" type="number" defaultValue={1} min={1} max={10000} required/></label>
    </div>
    <label>Tell us about your idea<textarea name="details" rows={4} required minLength={10} maxLength={3000} placeholder="Purpose, approximate dimensions, intended use and any deadline."/></label>
    <div className="file-area">
      <label htmlFor="design-file">Select a design file for local validation</label>
      <p id="file-help">STL, 3MF or STEP · 25 MB preview limit. The file stays on your device. Secure uploads are planned.</p>
      <input id="design-file" type="file" accept=".stl,.3mf,.step,.stp" aria-describedby="file-help file-result" aria-invalid={Boolean(fileError)} onChange={event=>{const file=event.currentTarget.files?.[0];const error=file?validateDesignFile(file):null;setFileError(error??"");setFileName(file&&!error?file.name:"");}}/>
      <p id="file-result" role="status">{fileError||(fileName?`${fileName} selected locally. Not uploaded.`:"No file selected.")}</p>
    </div>
    <button className="button" type="submit">Prepare enquiry draft ↗</button>
    <p className="form-note">Preview only. This form does not submit an enquiry or create an order. Pricing and feasibility require manual review.</p>
    <p role="status" aria-live="polite">{message}</p>
    {draft&&<div className="draft-panel"><label>Your enquiry draft<textarea readOnly rows={10} value={draft}/></label><div className="button-row"><button className="button button-secondary" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(draft);setMessage("Draft copied. No enquiry has been sent.");}catch{setMessage("Select and copy the draft text manually.");}}}>Copy draft</button>{whatsapp?<a className="button" href={whatsapp} target="_blank" rel="noopener noreferrer">Review in WhatsApp ↗</a>:<p className="form-note">WhatsApp contact will appear once the business number is confirmed.</p>}</div><p className="form-note">WhatsApp opens a message for your review. It does not attach the selected file.</p></div>}
  </form>;
}
