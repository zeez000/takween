import Link from "next/link";
import type {Metadata} from "next";
import {getSeoConfig} from "@/lib/seo";
import {AssemblyExperience} from "@/components/assembly/assembly-experience";
import {EntryScreen} from "@/components/entry-screen";
import {Header} from "@/components/header";
import {PartVisual} from "@/components/part-visual";
import {QuoteForm} from "@/components/quote-form";
import {Reveal} from "@/components/reveal";
import {ButtonLink,Placeholder,SectionHeading} from "@/components/ui";
import {serviceCategories,site} from "@/config/site";
const seo = getSeoConfig();
export const metadata:Metadata={alternates:seo.url?{canonical:`${seo.url}/`}:undefined};
const organization = {
  "@context":"https://schema.org", "@type":"Organization",
  name:"TAKWEEN LABS", alternateName:site.name, description:site.description,
  ...(seo.url?{url:seo.url}:{}),
  areaServed:{"@type":"City",name:"Bengaluru",alternateName:"Bangalore"}
};
export default function Home() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organization).replace(/</g,"\\u003c")}}/><EntryScreen/><Header/><main id="main-content">
    <section className="hero shell" aria-labelledby="hero-title">
      <div className="hero-copy"><p className="eyebrow"><span className="status-dot"/>{site.location}</p><p className="hero-prelude">FROM AN IDEA. TO SOMETHING REAL.</p><h1 id="hero-title">YOU NAME IT.<br/><span>WE MAKE IT.</span></h1><p className="hero-description">Custom plastic 3D printing for the things you imagine, the problems you solve, and the parts you need next.</p><div className="button-row"><ButtonLink href="#quote">Start with your idea ↗</ButtonLink><ButtonLink href="#process" secondary>See how it works ↓</ButtonLink></div><div className="hero-footnote"><span>{site.serviceStatus}</span><span>Custom FDM / PLA / PETG</span></div></div>
      <PartVisual/>
    </section>
    <AssemblyExperience/>
    <div className="principles"><div className="shell principles-inner"><span>IDEA → DESIGN → PRINT</span><span>SMALL DETAILS. REAL POSSIBILITIES.</span><span>BUILT LAYER BY LAYER</span></div></div>
    <section id="about" className="shell section"><Reveal><div className="about-layout"><SectionHeading eyebrow="01 / THE STUDIO" title="A place for your next possibility."/><div className="about-copy"><p className="large-copy">A new independent 3D printing identity, with an industrial foundation.</p><p>Planned from an office inside the Fateen Technologies factory in Rajajinagar, Bengaluru, this studio is being built around custom plastic FDM printing and practical conversations about your ideas.</p><p>For engineering students, startups, manufacturers, local businesses and individuals. Every proposed job starts with a review of the design, material and intended use.</p></div></div></Reveal></section>
    <section id="services" className="shell section"><Reveal><SectionHeading eyebrow="02 / CUSTOM PRINTING" title="What do you want to make?">Start with a category. The right process depends on your design.</SectionHeading><div className="cards three-columns">{serviceCategories.map(category=><article className="service-card" key={category.number}><span className="card-number">{category.number} /</span><h3>{category.title}</h3><p>{category.description}</p><div className="card-footer">{category.example}</div></article>)}</div></Reveal></section>
    <section id="process" className="process-band"><div className="shell section"><Reveal><SectionHeading eyebrow="03 / FROM FILE TO FORM" title="Layer by layer. Step by step.">FDM printing builds a plastic object by depositing heated material along a toolpath, one layer at a time.</SectionHeading><ol className="process-grid">{[
      ["Share the idea","Describe the purpose, dimensions and quantity. A design file helps when available."],
      ["Review the details","We plan to review printability, material, orientation and any design questions."],
      ["Approve a quotation","Price and turnaround are agreed manually before any production commitment."],
      ["Print & inspect","Once services launch, approved parts will be printed and checked against agreed requirements."]
    ].map(([title,description],index)=><li key={title}><span className="step-number">0{index+1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol></Reveal></div></section>
    <section id="materials" className="shell section"><Reveal><div className="materials-layout"><SectionHeading eyebrow="04 / MATERIAL MATTERS" title="Choose for the purpose.">PLA and PETG are the planned starting materials. Suitability depends on geometry, load, temperature and environment.</SectionHeading><div className="material-list"><article><span className="material-code">PLA</span><div><h3>Ideas take shape.</h3><p>A starting point for concept models, visual prototypes and many indoor objects. Heat exposure needs consideration.</p></div></article><article><span className="material-code">PETG</span><div><h3>Consider the working conditions.</h3><p>An alternative for some practical parts. We will review strength, temperature and finish requirements for each job.</p></div></article><dl className="capability-list">{[
      ["Process",site.capabilities.technology],["Build volume",site.capabilities.buildVolume],["Layer heights",site.capabilities.layerHeights],["Tolerances",site.capabilities.dimensionalTolerance],["Turnaround",site.capabilities.turnaround]
    ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></div></Reveal></section>
    <section id="portfolio" className="shell section"><Reveal><SectionHeading eyebrow="05 / THE WORK TO COME" title="Space for things worth showing.">The categories above describe potential applications. They are not completed projects.</SectionHeading><div className="portfolio-empty"><div className="outline-part" aria-hidden="true">+</div><div><span className="pill">PORTFOLIO COMING LATER</span><h3>Real work belongs here.</h3><p>Completed parts, photographs and project notes will be added with permission. No customer work is represented in this preview.</p></div></div></Reveal></section>
    <section id="quote" className="quote-band"><div className="shell section quote-layout"><div><SectionHeading eyebrow="06 / YOUR NEXT PROJECT" title="Let's start with an idea.">Prepare a project brief. We will add secure file submission and enquiry management in a later phase.</SectionHeading><div className="quote-aside"><p className="eyebrow">BEFORE YOU BEGIN</p><p>Include what the part needs to do, approximate dimensions, quantity and preferred material if you know it.</p><p>STL and 3MF describe printable geometry. STEP files need conversion and review before slicing.</p><p className="form-note">This preview stores no form data and uploads no files. Reloading the page clears your draft.</p></div></div><QuoteForm/></div></section>
    <section className="shell section"><div className="cards two-columns"><Placeholder title="Private order tracking">A future order page will show approved production updates through an authorised customer session or expiring access link.<Link className="text-link" href="/track">See tracking status →</Link></Placeholder><Placeholder title="Product catalogue">Approved products, genuine photographs and confirmed details will be published here as the business develops.</Placeholder></div></section>
    <section id="fateen" className="shell section fateen-section"><Reveal><p className="eyebrow">THE INDUSTRIAL FOUNDATION</p><h2>NEED SOMETHING<br/>BEYOND PLASTIC?</h2><div className="fateen-layout"><div><h3>{site.fateen.name}</h3><p>The planned home of the 3D printing studio brings a connection to an existing factory. Potential machining capabilities can be discussed after their scope and availability are confirmed.</p><p className="fateen-statement">{site.fateen.statement}</p></div><div><ul className="capability-tags">{site.fateen.capabilities.map(capability=><li key={capability.name}><span>{capability.name}</span><small>Availability unconfirmed</small></li>)}</ul><p className="form-note">Listed for context only. These capabilities are not open for booking through this website.</p></div></div></Reveal></section>
  </main><footer className="footer"><div className="shell"><div className="footer-top"><div className="wordmark"><strong>{site.name}<span>.</span></strong><small>{site.tagline}</small></div><div><p>{site.location}</p><a className="text-link" href={`mailto:${site.enquiryEmail}`}>{site.enquiryEmail}</a></div></div><div className="footer-bottom"><p>Independent 3D printing identity · Foundation preview</p><Link href="/admin">Operations preview →</Link></div></div></footer></>;
}
