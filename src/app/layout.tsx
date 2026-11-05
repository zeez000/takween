import type {Metadata} from "next";
import type {ReactNode} from "react";
import {site} from "@/config/site";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-700.css";
import "./globals.css";
import "./cinematic.css";
export const metadata:Metadata={title:`${site.name} | Custom 3D Printing, Bengaluru`,description:site.description,robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:ReactNode}) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
