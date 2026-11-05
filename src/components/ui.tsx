import type { ReactNode } from "react";
import Link from "next/link";
export function ButtonLink({href,children,secondary=false}:{href:string;children:ReactNode;secondary?:boolean}) {
  return <Link className={`button ${secondary?"button-secondary":""}`} href={href}>{children}</Link>;
}
export function SectionHeading({eyebrow,title,children}:{eyebrow:string;title:string;children?:ReactNode}) {
  return <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children && <p className="section-description">{children}</p>}</div>;
}
export function Placeholder({title,children}:{title:string;children:ReactNode}) {
  return <div className="placeholder"><span className="pill">PLANNED</span><h3>{title}</h3><div className="placeholder-description">{children}</div></div>;
}
