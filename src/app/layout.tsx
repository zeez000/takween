import type {Metadata} from "next";
import type {ReactNode} from "react";
import {site} from "@/config/site";
import {getSeoConfig} from "@/lib/seo";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-700.css";
import "./globals.css";
import "./cinematic.css";
const seo = getSeoConfig();
export const metadata:Metadata={
  metadataBase: seo.url ? new URL(seo.url) : undefined,
  title:{default:"TAKWEEN LABS | Custom 3D Printing in Bengaluru",template:"%s | TAKWEEN LABS"},
  description:site.description,
  robots:{index:seo.indexable,follow:seo.indexable},
  openGraph:{type:"website",siteName:"TAKWEEN LABS",locale:"en_IN",title:"TAKWEEN LABS | Custom 3D Printing in Bengaluru",description:site.description,...(seo.url?{url:seo.url}:{})},
  twitter:{card:"summary",title:"TAKWEEN LABS | Custom 3D Printing in Bengaluru",description:site.description}
};
export default function RootLayout({children}:{children:ReactNode}) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
