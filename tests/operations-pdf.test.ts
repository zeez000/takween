import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
import {PDFDocument,PDFName,PDFDict,PDFRawStream,PDFArray,decodePDFRawStream} from 'pdf-lib';import {quotationPdf} from '../src/lib/operations/quotation-pdf.ts';import {parsePaise,orderTransitions,type Quotation} from '../src/lib/operations/commercial.ts';
const q:Quotation={id:'synthetic',reference:'TQ-SYNTHETIC-LOCAL-ONLY',enquiry_id:'synthetic',enquiryReference:'TK-SYNTHETIC',revision:1,version:1,state:'draft',category:'printing',entity:'Synthetic local entity - not approved',terms:'Synthetic terms for local testing only.',notes:'Not a real commercial quotation.',valid_until:null,tax_bps:125,subtotal_paise:303,tax_paise:4,total_paise:307,customer_snapshot:{name:'Synthetic Local Customer',email:'customer@example.invalid',phone:null},items:[{description:'Synthetic enclosure test',material:'PLA',quantity:3,unit_paise:101,total_paise:303}],history:[]};
test('money parsing uses exact decimal paise and rejects unsafe numeric forms',()=>{assert.equal(parsePaise('1.01'),101);assert.equal(parsePaise('0'),0);assert.equal(parsePaise('123.4'),12340);for(const s of ['-1','1e3','NaN','1.001','Infinity',''])assert.throws(()=>parsePaise(s));assert.deepEqual(orderTransitions('completed','printing'),[]);assert.ok(!orderTransitions('queued','printing').includes('machining'));});
test('branded PDF embeds a font, paginates long content and refuses missing glyphs',async()=>{
 const bytes=await quotationPdf(q);assert.equal(new TextDecoder().decode(bytes.slice(0,5)),'%PDF-');const doc=await PDFDocument.load(bytes);assert.equal(doc.getPageCount(),1);assert.match(doc.getTitle()??'',/TAKWEEN LABS/);
 const long=await quotationPdf({...q,items:Array.from({length:50},()=>({...q.items[0],description:'Long '.repeat(90)})),terms:'Long terms '.repeat(200)});assert.ok((await PDFDocument.load(long)).getPageCount()>1);
 await assert.rejects(quotationPdf({...q,entity:'Unsupported 🧪'}),/Unsupported font/);
 await mkdir('artifacts/phase3',{recursive:true});await writeFile('artifacts/phase3/quotation.pdf',bytes);await writeFile('artifacts/phase3/quotation-long.pdf',long);
});
test('PDF text contains customer-facing notes but excludes internal history and production costs',async()=>{
 const privateJob='PRIVATE_JOB_SENTINEL_9001',privateCost='PRIVATE_COST_SENTINEL_9002';
 const doc=await PDFDocument.load(await quotationPdf({...q,notes:'Customer-facing quotation note',
  history:[{kind:'internal',note:privateJob,created_at:'2026-11-24'}],
  ...{production:[{actual_cost_paise:987654321,note:privateCost}]}}));
 let text='';
 for(const page of doc.getPages()){
  const resources=page.node.Resources();assert.ok(resources);
  const fonts=resources.lookup(PDFName.of('Font'),PDFDict),map=new Map<string,string>();
  for(const [,ref] of fonts.entries()){
   const font=doc.context.lookup(ref,PDFDict),unicode=font.lookup(PDFName.of('ToUnicode'));assert.ok(unicode instanceof PDFRawStream);
   const cmap=new TextDecoder().decode(decodePDFRawStream(unicode).decode());
   for(const m of cmap.matchAll(/<([0-9a-f]+)>\s+<([0-9a-f]+)>/gi))map.set(m[1].toUpperCase().padStart(4,'0'),Buffer.from(m[2],'hex').swap16().toString('utf16le'));
  }
  const contents=page.node.Contents();assert.ok(contents);
  for(const ref of contents instanceof PDFArray?contents.asArray():[contents]){
   const stream=doc.context.lookup(ref);assert.ok(stream instanceof PDFRawStream);
   const operators=new TextDecoder().decode(decodePDFRawStream(stream).decode());
   for(const m of operators.matchAll(/<([0-9a-f]+)>\s*Tj/gi))text+=(m[1].match(/.{4}/g)??[]).map(c=>map.get(c.toUpperCase())??'?').join('')+'\n';
  }
 }
 assert.ok(text.includes('Customer-facing quotation note'));
 assert.ok(text.includes(q.customer_snapshot.email));
 assert.ok(!text.includes(privateJob));assert.ok(!text.includes(privateCost));
 assert.ok(!text.includes('987654321'));
});
