'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {site} from '@/config/site';
const OperationalForm=dynamic(()=>import('@/components/quote-form').then(m=>m.QuoteForm));

/** Manual contact is the server-rendered and fail-closed public default. */
export function PublicContact(){
  const [enabled,setEnabled]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),5000);
    void fetch('/api/operational/intake-config',{cache:'no-store',signal:controller.signal})
      .then(async response=>{
        if(!response.ok)return;
        const config=await response.json();
        if(!controller.signal.aborted)setEnabled(config?.enabled===true||config?.emailEnabled===true);
      }).catch(()=>{/* Unavailable configuration keeps manual email visible. */})
      .finally(()=>clearTimeout(timer));
    return()=>{controller.abort();clearTimeout(timer);};
  },[]);
  if(enabled)return <OperationalForm/>;
  return <div className="quote-form" aria-labelledby="manual-contact-title">
    <p className="eyebrow">CONTACT THE STUDIO</p>
    <h3 id="manual-contact-title">Tell us what you have in mind.</h3>
    <p>Email your idea, intended use, approximate dimensions and quantity. We can discuss the next steps personally.</p>
    <a className="button" href={`mailto:${site.enquiryEmail}`}>Email TAKWEEN LABS ↗</a>
    <p style={{overflowWrap:'anywhere'}}>{site.enquiryEmail}</p>
    <p className="form-note">Opens your email app. Write and send your message there. This website does not submit enquiries or upload files in this preview.</p>
    <p className="form-note">Email starts a conversation, not an order or a confirmed quotation. Availability, feasibility and pricing require manual review.</p>
  </div>;
}
