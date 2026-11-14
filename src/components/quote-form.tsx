"use client";
import {useState,type FormEvent} from "react";
import {site} from "@/config/site";
import {formatEnquiry} from "@/lib/enquiry";
export function QuoteForm() {
  const [draft,setDraft]=useState("");
  const [message,setMessage]=useState("");
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  async function prepare(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setDraft(""); setSent(false);
    // Unnamed controls keep draft values out of native submissions before hydration.
    const form=event.currentTarget;
    const controls=form.elements;
    const value=(id:string)=>(controls.namedItem(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    const values = {
      name:value("draft-name"),contact:value("draft-email"),material:value("draft-material"),
      quantity:value("draft-quantity"),details:value("draft-details")
    };
    setSending(true);
    try {
      const response = await fetch("/api/enquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...values,email:values.contact,website:""})});
      if (!response.ok) throw new Error("Delivery failed");
      setSent(true);
      setMessage("Enquiry sent successfully. We will reply by email.");
      form.reset();
    } catch {
      setDraft(formatEnquiry(values));
      setMessage("We could not send your enquiry. Copy the draft below and email it to us.");
    } finally {setSending(false);}
  }
  return <form className="quote-form" onSubmit={prepare} onChange={()=>{setDraft("");setMessage("");}}>
    <div className="form-grid">
      <label>Your name<input id="draft-name" autoComplete="name" required maxLength={100}/></label>
      <label>Your email<input id="draft-email" type="email" autoComplete="email" required maxLength={150}/></label>
      <label>Preferred material<select id="draft-material" defaultValue="Please advise"><option>Please advise</option><option>PLA</option><option>PETG</option></select></label>
      <label>Quantity<input id="draft-quantity" type="number" defaultValue={1} min={1} max={10000} required/></label>
    </div>
    <label>Tell us about your idea<textarea id="draft-details" rows={4} required minLength={10} maxLength={3000} placeholder="Purpose, approximate dimensions, intended use and any deadline."/></label>
    <div className="file-area"><p><strong>Have a 3D design file?</strong> File uploads are not available yet. After sending your enquiry, reply to our email or contact us directly at {site.enquiryEmail} to share your STL, 3MF or STEP file.</p></div>
    <button className="button" type="submit" disabled={sending}>{sending?"Sending…":"Send enquiry ↗"}</button>
    <p className="form-note">Enquiries are sent to our business email. Design files are not uploaded or attached. Pricing and feasibility require manual review.</p>
    <p role="status" aria-live="polite">{message}</p>
    {draft&&!sent&&<div className="draft-panel">
      <label>Your enquiry draft<textarea readOnly rows={10} value={draft}/></label>
      <div className="button-row">
        <button className="button button-secondary" type="button" onClick={async()=>{
          try { await navigator.clipboard.writeText(draft); setMessage("Draft copied. No enquiry has been sent."); }
          catch { setMessage("Select and copy the draft text manually."); }
        }}>Copy draft</button>
        <a className="button" href={`mailto:${site.enquiryEmail}`}>Open email app ↗</a>
      </div>
      <p className="form-note">Paste your draft into your email app and send it when ready. Your selected file stays on this device.</p>
    </div>}
  </form>;
}
