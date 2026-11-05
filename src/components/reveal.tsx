"use client";
import {motion,useReducedMotion} from "motion/react";
import type {ReactNode} from "react";
export function Reveal({children}:{children:ReactNode}) {
  const reduce=useReducedMotion();
  return <motion.div initial={false} whileInView={reduce?{opacity:1,y:0}:{opacity:[.65,1],y:[16,0]}} viewport={{once:true,amount:.08}} transition={{duration:reduce?0:.65,ease:"easeOut"}} className="reveal">{children}</motion.div>;
}
