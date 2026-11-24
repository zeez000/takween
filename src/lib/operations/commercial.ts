export type QuoteItem={description:string;material:string;quantity:number;unit_paise:number;total_paise:number};
export type CommercialEvent={kind?:string;note:string;created_at:string;from_state?:string;to_state?:string};
export type Quotation={id:string;reference:string;enquiry_id:string;enquiryReference:string;revision:number;version:number;state:string;category:string;
 isSuperseded?:boolean;latestRevision?:number;
 entity:string;terms:string;notes:string;valid_until:string|null;tax_bps:number|null;subtotal_paise:number;tax_paise:number;total_paise:number;
 customer_snapshot:{name:string;email:string;phone:string|null};items:QuoteItem[];history:CommercialEvent[]};
export type ProductionEntry={note:string;material:string;material_mg:number|null;print_minutes:number|null;estimated_cost_paise:number|null;actual_cost_paise:number|null;created_at:string};
export type ProductionOrder={id:string;reference:string;version:number;state:string;category:string;history:CommercialEvent[];production:ProductionEntry[];snapshot:{quotation:Quotation;items:QuoteItem[]}};
/** Decimal text to integer minor units; never multiply a binary floating price. */
export function parsePaise(value:string):number{
 if(!/^\d{1,10}(\.\d{1,2})?$/.test(value))throw Error('Enter a nonnegative amount with at most two decimals.');
 const [whole,fraction='']=value.split('.');const n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(n)||n>9000000000000)throw Error('Amount exceeds the supported limit.');return n;
}
export function money(paise:number){return `INR ${(Number(paise)/100).toFixed(2)}`;}
export function currentQuotation(q:Quotation){return q.isSuperseded===false&&q.latestRevision===q.revision;}
export function quotationRevisionLabel(q:Quotation){return q.isSuperseded===true?`SUPERSEDED - latest revision ${q.latestRevision??'unknown'}`:currentQuotation(q)?'Current revision':'Revision status unavailable - refresh before issuing';}
export function orderTransitions(state:string,category:string){
 const work=category==='printing'?'printing':'machining';
 const map:Record<string,string[]>={queued:['designing',work],designing:[work],[work]:['quality_check'],quality_check:[work,'ready'],ready:['quality_check','completed'],on_hold:['queued']};
 return ['completed','cancelled'].includes(state)?[]:[...(map[state]??[]),...(state==='on_hold'?['cancelled']:['on_hold','cancelled'])];
}
