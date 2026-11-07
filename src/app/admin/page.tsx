import Link from "next/link";
import type {Metadata} from "next";
export const metadata:Metadata={title:"Operations outline",description:"Planned operating platform. No customer records or administrative actions are available.",robots:{index:false,follow:false},openGraph:null,twitter:null};
import {Placeholder,SectionHeading} from "@/components/ui";
import {futureModules} from "@/config/site";
export default function AdminPreview(){return <main id="main-content" className="shell section"><Link className="text-link" href="/">← Return to the studio</Link><SectionHeading eyebrow="OPERATING PLATFORM / PLANNED" title="A foundation for the business.">This is a public feature outline. Authentication and operational data are not implemented. No private information is available here.</SectionHeading><p className="notice">Administrative access must be implemented before adding any customer, financial, inventory or production data.</p><div className="cards three-columns">{futureModules.map(module=><Placeholder key={module.title} title={module.title}>{module.description}</Placeholder>)}</div></main>;}
