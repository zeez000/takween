import type {Metadata} from 'next';
import Link from 'next/link';
import {operationsRuntime} from '@/lib/operations/runtime';
import {OwnerDashboard} from '@/components/owner-dashboard';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Owner workspace',robots:{index:false,follow:false},openGraph:null,twitter:null};
export default async function OwnerPage(){
  const config=await operationsRuntime();
  return <main id="main-content" className="shell section"><Link className="text-link" href="/">← Return to the studio</Link><h1>Owner workspace</h1>
    {config.OPERATIONS_ENABLED==='true'?<OwnerDashboard/>:<p role="status">Owner operations are not enabled. No customer records are available here.</p>}
  </main>;
}
