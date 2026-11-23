import {PDFDocument,rgb,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {quotationFont} from './quotation-font.ts';
import {money,type Quotation} from './commercial.ts';
/** Owner-only on-demand document. No links, scripts, attachments or external IO. */
export async function quotationPdf(q:Quotation){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(Uint8Array.from(atob(quotationFont),c=>c.charCodeAt(0)),{subset:true});
 doc.setTitle(`TAKWEEN LABS quotation ${q.reference} revision ${q.revision}`);doc.setAuthor('TAKWEEN LABS');
 const supported=new Set(font.getCharacterSet());const widths=new Map<string,number>();let page:PDFPage;let y=0;let pageNumber=0;
 function newPage(){page=doc.addPage([595.28,841.89]);pageNumber++;y=750;
  page.drawRectangle({x:0,y:786,width:596,height:56,color:rgb(.055,.055,.065)});
  page.drawText('TAKWEEN LABS',{x:40,y:805,size:19,font,color:rgb(.88,.06,.17)});
  page.drawText(`Quotation | Page ${pageNumber}`,{x:40,y:25,size:9,font,color:rgb(.35,.35,.35)});
 }
 function text(value:string,size=10){
  const cleaned=value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  for(const c of cleaned){if(c!=='\n'&&c!=='\r'&&c!=='\t'&&!supported.has(c.codePointAt(0)!))throw Error('Unsupported font character');}
  for(const paragraph of cleaned.replaceAll('\t',' ').split(/\r?\n/)){
   let line='',width=0;for(const c of paragraph){const key=`${size}:${c}`;let w=widths.get(key);if(w===undefined){w=font.widthOfTextAtSize(c,size);widths.set(key,w);}if(width+w>500){paint(line,size);line='';width=0;}line+=c;width+=w;}paint(line,size);
  }
 }
 function paint(line:string,size:number){if(y<60)newPage();page.drawText(line,{x:40,y,size,font,color:rgb(.08,.08,.1)});y-=size+6;}
 newPage();text(`${q.reference} | Revision ${q.revision}`,13);text(`State: ${q.state.toUpperCase()}${q.state==='draft'?' - NOT AN ISSUED QUOTATION':''}`);
 text(`Contracting entity: ${q.entity||'NOT SET - DRAFT'}`);text(`Customer: ${q.customer_snapshot.name}`);text(`Email: ${q.customer_snapshot.email}`);
 if(q.customer_snapshot.phone)text(`Contact: ${q.customer_snapshot.phone}`);
 text(`Enquiry: ${q.enquiryReference}`);text(`Valid until: ${q.valid_until??'NOT SET - DRAFT'}`);y-=10;
 q.items.forEach((i,index)=>{text(`${index+1}. ${i.description}`,11);text(`Material: ${i.material||'Not specified'} | Quantity: ${i.quantity}`);text(`${money(i.unit_paise)} each | Line total ${money(i.total_paise)}`);y-=6;});
 text(`Subtotal: ${money(q.subtotal_paise)}`,12);text(`Tax: ${q.tax_bps===null?'NOT SET':`${q.tax_bps/100}%`} | ${money(q.tax_paise)}`);text(`Total: ${money(q.total_paise)}`,14);
 y-=10;text('Terms',12);text(q.terms||'NOT SET - DRAFT');if(q.notes){y-=8;text('Quotation notes',12);text(q.notes);}
 y-=12;text('Contact: takweenlabs.in@gmail.com');text('This is a quotation, not a payment receipt or tax invoice.');
 return doc.save();
}
