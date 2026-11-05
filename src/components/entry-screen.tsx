"use client";
import {useEffect,useRef} from "react";
import {site} from "@/config/site";
const KEY="takween-entry-seen";
export function EntryScreen(){
  const dialog=useRef<HTMLDialogElement>(null);
  const restore=useRef("");
  const closing=useRef(false);
  useEffect(()=>{
    const element=dialog.current;
    if(!element || location.hash || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try{if(sessionStorage.getItem(KEY))return;}catch{/* Intro still remains immediately skippable. */}
    restore.current=document.body.style.overflow;
    element.showModal();document.body.style.overflow="hidden";
    const bypass=()=>{if(location.hash){element.getAnimations().forEach(animation=>animation.cancel());element.close();document.body.style.overflow=restore.current;window.dispatchEvent(new Event("takween:entered"));}};
    window.addEventListener("hashchange",bypass);
    return()=>{window.removeEventListener("hashchange",bypass);element.getAnimations().forEach(animation=>animation.cancel());element.close();document.body.style.overflow=restore.current;};
  },[]);
  async function dismiss(){
    if(closing.current)return;closing.current=true;
    const element=dialog.current;
    if(element?.open && !matchMedia("(prefers-reduced-motion: reduce)").matches){
      await element.animate([{opacity:1,transform:"translateY(0)"},{opacity:0,transform:"translateY(-8px)"}],{duration:220,easing:"cubic-bezier(.22,1,.36,1)"}).finished.catch(()=>{});
    }
    try{sessionStorage.setItem(KEY,"1");}catch{/* Storage is optional. */}
    dialog.current?.close();document.body.style.overflow=restore.current;
    window.dispatchEvent(new Event("takween:entered"));
    document.querySelector<HTMLAnchorElement>(".header .wordmark")?.focus({preventScroll:true});
  }
  return <dialog ref={dialog} className="entry-screen" aria-labelledby="entry-title" onCancel={event=>{event.preventDefault();dismiss();}}>
    <button className="entry-skip" type="button" onClick={dismiss}>Skip intro ↗</button>
    <div className="entry-trace" aria-hidden="true"/>
    <div className="entry-content"><p className="eyebrow">{site.name} / 3D PRINTING STUDIO</p><p id="entry-title" className="entry-title">YOU NAME IT.<br/><span>WE MAKE IT.</span></p><p>From a simple idea to something you can hold.</p><button type="button" className="button" onClick={dismiss}>ENTER THE EXPERIENCE ↗</button><small>No waiting. Explore at your own pace.</small></div>
    <span className="entry-location">RAJAJINAGAR / BENGALURU</span>
  </dialog>;
}
