"use client";
import {useEffect,useRef} from "react";
import type {ReactNode} from "react";
export function Reveal({children}:{children:ReactNode}) {
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const element=ref.current;
    if(!element || !("IntersectionObserver" in window))return;
    const observer=new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting || entry.intersectionRatio<.08)return;
      element.classList.add("reveal-entered");
      observer.disconnect();
    },{threshold:.08});
    observer.observe(element);
    return ()=>observer.disconnect();
  },[]);
  return <div ref={ref} className="reveal">{children}</div>;
}
