"use client";
import Link from "next/link";
import {useState} from "react";
import {navigation,site} from "@/config/site";
export function Header() {
  const [open,setOpen]=useState(false);
  return <header className="header"><div className="shell header-inner">
    <Link href="/" className="wordmark" aria-label={`${site.name} home`}><strong>{site.name}<span>.</span></strong><small>{site.descriptor}</small></Link>
    <button type="button" className="menu-toggle" aria-expanded={open} aria-controls="primary-navigation" aria-label={open?"Close menu":"Open menu"} onClick={()=>setOpen(!open)}>{open?"Close −":"Menu +"}</button>
    <nav id="primary-navigation" className={`navigation ${open?"is-open":""}`} aria-label="Main navigation" onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);document.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();}}}>
      {navigation.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)}>{item.label}</Link>)}
      <Link href="#quote" className="nav-cta" onClick={()=>setOpen(false)}>Discuss a part ↗</Link>
    </nav>
  </div></header>;
}
