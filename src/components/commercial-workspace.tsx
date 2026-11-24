'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {money,parsePaise,orderTransitions,currentQuotation,quotationRevisionLabel,type Quotation,type ProductionOrder} from '@/lib/operations/commercial';
import {createPrivateRequestScope,privateRequestSignal,type PrivateRequestScope} from '@/lib/operations/private-requests';
type Source={id:string;reference:string;customer:{name:string}};
type Line={description:string;material:string;quantity:string;price:string};
export function CommercialWorkspace({enquiries,securityScope,onAccessDenied}:{enquiries:Source[];securityScope:PrivateRequestScope;onAccessDenied:()=>void}){
 const [kind,setKind]=useState<'quotations'|'orders'>('quotations');const [search,setSearch]=useState('');const [state,setState]=useState('');const [offset,setOffset]=useState(0);
 const [quotes,setQuotes]=useState<Quotation[]>([]);const [orders,setOrders]=useState<ProductionOrder[]>([]);const [selected,setSelected]=useState<Quotation|null>(null);
 const [lines,setLines]=useState<Line[]>([]);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('Choose a view and load stored records.');
 const retry=useRef<{fingerprint:string;id:string}|null>(null);const lock=useRef(false);
 const [scope]=useState(createPrivateRequestScope);
 useEffect(()=>{scope.resume();const hide=()=>{if(document.hidden){scope.pause();setQuotes([]);setOrders([]);setSelected(null);setLines([]);setBusy(false);lock.current=false;setMessage('Private commercial records hidden. Reload the view when you return.');}else scope.resume();};document.addEventListener('visibilitychange',hide);return()=>{scope.pause();retry.current=null;document.removeEventListener('visibilitychange',hide);};},[scope]);
 async function request(body:object){const tickets=[scope.capture(),securityScope.capture()],transport=privateRequestSignal(tickets,20000);
  try{const r=await fetch('/api/operational/commercial',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:transport.signal});for(const t of tickets)t.assertCurrent();
   if(r.status===401||r.status===403){scope.invalidate();retry.current=null;setQuotes([]);setOrders([]);setSelected(null);setLines([]);onAccessDenied();throw Error('Request not authorized. Sign in again.');}
   const data=await r.json();for(const t of tickets)t.assertCurrent();if(!r.ok)throw Error(data.error||'Operation not confirmed.');return data;
  }finally{transport.dispose();}}
 async function load(next=0){const data=await request({operation:'list',kind,search,state,offset:next});setOffset(next);setSelected(null);setLines([]);if(kind==='quotations')setQuotes(data.rows);else setOrders(data.rows);setMessage(data.rows.length?'Stored records loaded.':'No stored records match this view.');}
 async function task(run:()=>Promise<void>){if(lock.current)return;scope.invalidate();const tickets=[scope.capture(),securityScope.capture()];lock.current=true;setBusy(true);setMessage('Working…');const current=()=>tickets.every(t=>t.isCurrent());try{await run();}catch(e){if(current())setMessage(e instanceof Error?e.message:'Operation not confirmed.');}finally{if(current()){setBusy(false);lock.current=false;}}}
 async function command(operation:'quote'|'order',payload:object){const fingerprint=JSON.stringify({operation,payload});if(retry.current?.fingerprint!==fingerprint)retry.current={fingerprint,id:crypto.randomUUID()};
  const result=await request({operation,payload,requestId:retry.current.id});retry.current=null;return result.result;}
 const value=(form:HTMLFormElement,id:string)=>(form.elements.namedItem(id) as HTMLInputElement).value;
 function edit(q:Quotation){setSelected(q);setLines(q.items.map(i=>({description:i.description,material:i.material,quantity:String(i.quantity),price:(i.unit_paise/100).toFixed(2)})));}
 async function pdf(q:Quotation){const tickets=[scope.capture(),securityScope.capture()];const {quotation}=await request({operation:'pdf',kind:'quotations',search:'',state:'',offset:0,id:q.id});const {quotationPdf}=await import('@/lib/operations/quotation-pdf');for(const t of tickets)t.assertCurrent();const bytes=await quotationPdf(quotation);for(const t of tickets)t.assertCurrent();const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=`${q.reference}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Private PDF downloaded. Nothing was emailed.');}
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;await task(async()=>{
  if(!selected)return;const tax=value(form,'quote-tax');
  await command('quote',{action:'save',id:selected.id,version:selected.version,entity:value(form,'quote-entity'),terms:value(form,'quote-terms'),notes:value(form,'quote-notes'),validUntil:value(form,'quote-valid')||null,taxBps:tax===''?null:parsePaise(tax),
   items:lines.map(i=>({description:i.description,material:i.material,quantity:Number(i.quantity),unitPaise:parsePaise(i.price)}))});await load(offset);setMessage('Draft saved. Reloaded authoritative totals.');
 });}
 const states=kind==='quotations'?['draft','approved','sent','accepted','rejected','expired']:['queued','designing','printing','machining','quality_check','ready','completed','on_hold','cancelled'];
 return <section aria-label="Quotations and production" aria-busy={busy} style={{overflowWrap:'anywhere',marginTop:40}}>
  <h2>Quotations, orders and production</h2><p>Private owner records. Prices, tax, terms and contracting authority require manual review. No emails or payments are triggered.</p><p>PDFs are assembled locally after authorization. The embedded Inter Latin font does not cover all scripts or emoji; unsupported characters produce an error. Internal job notes are excluded.</p>
  <form method="post" className="quote-form" onSubmit={e=>{e.preventDefault();void task(()=>load());}}>
   <label>Commercial view<select value={kind} disabled={busy} onChange={e=>{setKind(e.target.value as typeof kind);setState('');setQuotes([]);setOrders([]);setSelected(null);}}><option value="quotations">Quotations</option><option value="orders">Orders / production</option></select></label>
   <label>Search commercial records<input value={search} disabled={busy} onChange={e=>setSearch(e.target.value)} maxLength={100}/></label>
   <label>Commercial state<select value={state} disabled={busy} onChange={e=>setState(e.target.value)}><option value="">All states</option>{states.map(s=><option key={s}>{s}</option>)}</select></label>
   <button className="button" disabled={busy}>Load commercial records</button>
  </form>
  {kind==='quotations'&&<form method="post" className="quote-form" onSubmit={e=>{e.preventDefault();const id=value(e.currentTarget,'quote-enquiry');void task(async()=>{const r=await command('quote',{action:'create',enquiryId:id});await load();setMessage(`Draft created: ${r.reference}. Enter commercial details before approval.`);});}}>
   <label>Enquiry for new quotation<select id="quote-enquiry" required disabled={busy}><option value="">Choose from the current request list</option>{enquiries.map(e=><option value={e.id} key={e.id}>{e.reference} · {e.customer.name}</option>)}</select></label>
   <button className="button" disabled={busy||!enquiries.length}>Create quotation draft</button>
  </form>}
  {kind==='quotations'&&quotes.map(q=><details className="quote-form" key={q.id}><summary>{q.reference} · revision {q.revision} · {q.state} · {q.customer_snapshot.name}</summary>
   <p>{quotationRevisionLabel(q)}</p>
   <p>{q.enquiryReference} · {q.category} · {money(q.total_paise)}</p><p>Entity: {q.entity||'Not set'} · Tax: {q.tax_bps===null?'Not decided':`${q.tax_bps/100}%`} · Validity: {q.valid_until??'Not set'}</p>
   <ul>{q.items.map((i,n)=><li key={n}>{i.description} · {i.material} · {i.quantity} × {money(i.unit_paise)} = {money(i.total_paise)}</li>)}</ul>
   <p>Terms: {q.terms||'Not set'}</p><p>Quotation notes: {q.notes||'None'}</p>
   <div className="button-row"><button className="button button-secondary" disabled={busy} onClick={()=>void task(()=>pdf(q))}>Download quotation PDF</button>
    {currentQuotation(q)&&q.state==='draft'&&<button className="button" disabled={busy} onClick={()=>edit(q)}>Edit draft</button>}
    {currentQuotation(q)&&!['draft','accepted'].includes(q.state)&&<button className="button button-secondary" disabled={busy} onClick={()=>void task(async()=>{await command('quote',{action:'create',enquiryId:q.enquiry_id});await load();setMessage('New blank revision created. Enter reviewed line items and terms.');})}>Create new revision</button>}
   </div>
   {currentQuotation(q)&&['draft','approved','sent'].includes(q.state)&&<form method="post" onSubmit={e=>{e.preventDefault();const f=e.currentTarget;const target=value(f,`quote-state-${q.id}`),evidence=value(f,`quote-evidence-${q.id}`);void task(async()=>{await command('quote',{action:'transition',id:q.id,version:q.version,state:target,evidence});await load(offset);setMessage('Manual quotation state recorded. No message was sent.');});}}>
    <label>Next quotation state<select disabled={busy} id={`quote-state-${q.id}`} required>{(q.state==='draft'?['approved']:q.state==='approved'?['sent']:['accepted','rejected','expired']).map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Evidence / decision note<textarea disabled={busy} id={`quote-evidence-${q.id}`} required maxLength={2000} placeholder="Record owner approval, manual send, or customer decision evidence."/></label>
    <button className="button" disabled={busy}>Record quotation state</button></form>}
   {currentQuotation(q)&&q.state==='accepted'&&<form method="post" onSubmit={e=>{e.preventDefault();const note=value(e.currentTarget,`order-note-${q.id}`);void task(async()=>{const o=await command('order',{action:'create',quotationId:q.id,note});setMessage(`Order ${o.reference} created. Switch to Orders / production to review.`);});}}><label>Order creation note<textarea disabled={busy} id={`order-note-${q.id}`} required maxLength={2000}/></label><button className="button" disabled={busy}>Create order from accepted quotation</button></form>}
   <h3>Quotation audit history</h3><ul>{q.history.map((h,n)=><li key={n}>{h.kind} · {h.note} · {h.created_at}</li>)}</ul>
  </details>)}
  {selected&&kind==='quotations'&&<form key={selected.id} method="post" className="quote-form" onSubmit={save}><h3>Edit draft {selected.reference}</h3>
   <label>Contracting entity<input disabled={busy} id="quote-entity" defaultValue={selected.entity} maxLength={200}/></label>
   <label>Tax percent (blank means undecided)<input disabled={busy} id="quote-tax" inputMode="decimal" defaultValue={selected.tax_bps===null?'':String(selected.tax_bps/100)}/></label>
   <label>Valid until<input disabled={busy} id="quote-valid" type="date" defaultValue={selected.valid_until??''}/></label>
   <label>Quotation terms<textarea disabled={busy} id="quote-terms" defaultValue={selected.terms} maxLength={3000}/></label><label>Customer-facing quotation notes<textarea disabled={busy} id="quote-notes" defaultValue={selected.notes} maxLength={3000}/></label>
   {lines.map((line,index)=><fieldset key={index} disabled={busy}><legend>Line {index+1}</legend>{(['description','material','quantity','price'] as const).map(key=><label key={key}>{key==='price'?'Unit price INR':key}<input value={line[key]} required={key!=='material'} maxLength={key==='description'?500:key==='material'?80:20} inputMode={['quantity','price'].includes(key)?'decimal':undefined} onChange={e=>setLines(lines.map((v,n)=>n===index?{...v,[key]:e.target.value}:v))}/></label>)}<button className="button button-secondary" type="button" onClick={()=>setLines(lines.filter((_,n)=>n!==index))}>Remove line {index+1}</button></fieldset>)}
   <div className="button-row"><button className="button button-secondary" type="button" disabled={busy||lines.length>=50} onClick={()=>setLines([...lines,{description:'',material:'',quantity:'1',price:''}])}>Add line item</button><button className="button" disabled={busy||!lines.length}>Save quotation draft</button><button className="button button-secondary" type="button" disabled={busy} onClick={()=>setSelected(null)}>Close draft editor</button></div>
  </form>}
  {kind==='orders'&&orders.map(o=><details className="quote-form" key={o.id}><summary>{o.reference} · {o.state} · {o.snapshot.quotation.customer_snapshot.name}</summary>
   <p>{o.category} · Accepted quotation {o.snapshot.quotation.reference} revision {o.snapshot.quotation.revision} · {money(o.snapshot.quotation.total_paise)}</p>
   <ul>{o.snapshot.items.map((i,n)=><li key={n}>{i.description} · {i.material} · Quantity {i.quantity}</li>)}</ul>
   {orderTransitions(o.state,o.category).length>0&&<>
    <form method="post" onSubmit={e=>{e.preventDefault();const f=e.currentTarget;const state=value(f,`job-state-${o.id}`),note=value(f,`job-note-${o.id}`);void task(async()=>{await command('order',{action:'transition',id:o.id,version:o.version,state,note});await load(offset);});}}>
     <label>Next production state<select disabled={busy} id={`job-state-${o.id}`}>{orderTransitions(o.state,o.category).map(s=><option key={s}>{s}</option>)}</select></label><label>Production transition note<textarea disabled={busy} id={`job-note-${o.id}`} required maxLength={2000}/></label><button className="button" disabled={busy}>Record production state</button>
    </form>
    <form method="post" onSubmit={e=>{e.preventDefault();const f=e.currentTarget;const fields={note:value(f,`observation-${o.id}`),material:value(f,`material-${o.id}`),estimatedCostPaise:value(f,`estimate-${o.id}`),actualCostPaise:value(f,`actual-${o.id}`),materialMg:value(f,`usage-${o.id}`),printMinutes:value(f,`minutes-${o.id}`)};void task(async()=>{await command('order',{action:'production',id:o.id,version:o.version,note:fields.note,material:fields.material,
     estimatedCostPaise:fields.estimatedCostPaise===''?null:parsePaise(fields.estimatedCostPaise),actualCostPaise:fields.actualCostPaise===''?null:parsePaise(fields.actualCostPaise),materialMg:fields.materialMg===''?null:Number(fields.materialMg),printMinutes:fields.printMinutes===''?null:Number(fields.printMinutes)});await load(offset);});}}>
     <p>Append an observation. Costs are per-entry observations, not an automatic invoice or profit calculation.</p>
     <label>Internal job observation<textarea disabled={busy} id={`observation-${o.id}`} required maxLength={2000}/></label><label>Material used<input disabled={busy} id={`material-${o.id}`} maxLength={80}/></label>
     <label>Estimated cost INR<input disabled={busy} id={`estimate-${o.id}`} inputMode="decimal"/></label><label>Actual cost INR<input disabled={busy} id={`actual-${o.id}`} inputMode="decimal"/></label><label>Material usage milligrams<input disabled={busy} id={`usage-${o.id}`} type="number" min={0} max={1000000000}/></label><label>Print time minutes<input disabled={busy} id={`minutes-${o.id}`} type="number" min={0} max={525600}/></label>
     <button className="button" disabled={busy}>Append production observation</button>
    </form></>}
   <h3>Job history</h3><ul>{o.history.map((h,n)=><li key={n}>{h.from_state??'Created'} → {h.to_state} · {h.note} · {h.created_at}</li>)}</ul>
   <h3>Private production observations</h3><ul>{o.production.map((j,n)=><li key={n}>{j.note} · {j.material} · {j.material_mg??'—'} mg · {j.print_minutes??'—'} min · Estimated {j.estimated_cost_paise===null?'not recorded':money(j.estimated_cost_paise)} · Actual {j.actual_cost_paise===null?'not recorded':money(j.actual_cost_paise)}</li>)}</ul>
  </details>)}
  <div className="button-row"><button className="button button-secondary" disabled={busy||offset===0} onClick={()=>void task(()=>load(Math.max(0,offset-25)))}>Previous commercial page</button><button className="button button-secondary" disabled={busy||(kind==='quotations'?quotes.length:orders.length)<25} onClick={()=>void task(()=>load(offset+25))}>Next commercial page</button></div>
  <p role="status" aria-live="polite">{message}</p>
 </section>;
}
