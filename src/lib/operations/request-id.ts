export const REQUEST_ID_KEY='takween-enquiry-request-v1';
export type Retry={draft:string;id:string};
type RetryStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function selectRequestId(previous:Retry|null,draft:string,persistent:boolean,storage?:RetryStorage):Retry{
  if(previous?.draft===draft)return previous;
  let id:string=crypto.randomUUID();
  if(persistent&&!previous){try{const saved=storage?.getItem(REQUEST_ID_KEY);if(saved&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved))id=saved;}catch{}}
  // Only an opaque UUID is kept across reloads. Never persist the draft or PII.
  if(persistent){try{storage?.setItem(REQUEST_ID_KEY,id);}catch{}}
  return {draft,id};
}
