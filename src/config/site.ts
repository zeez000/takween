export const site = {
  name: "TAKWEEN",
  descriptor: "3D PRINTING STUDIO",
  tagline: "YOU NAME IT. WE MAKE IT.",
  location: "Rajajinagar, Bengaluru",
  description: "A planned custom plastic FDM 3D printing studio in Rajajinagar, Bengaluru. Explore PLA and PETG printing for prototypes, practical parts and personal ideas.",
  serviceStatus: "Preparing to launch",
  // Digits with country code. Confirm before enabling contact.
  whatsappNumber: "",
  capabilities: {
    technology: "Plastic FDM", materials: ["PLA", "PETG"],
    buildVolume: "To be confirmed", layerHeights: "To be confirmed",
    dimensionalTolerance: "Reviewed for each design",
    turnaround: "Confirmed with each quotation"
  },
  fateen: {
    name: "Fateen Technologies",
    statement: "Born from Fateen. Built for what's next.",
    capabilities: [
      {name:"Wire-cut EDM",status:"unconfirmed"},
      {name:"DRO machining",status:"unconfirmed"},
      {name:"Surface grinding",status:"unconfirmed"},
      {name:"Lathe work",status:"unconfirmed"}
    ]
  }
} as const;
export const navigation = [
  {href:"#services",label:"Services"}, {href:"#process",label:"Process"},
  {href:"#materials",label:"Materials"}, {href:"#quote",label:"Your project"}
];
export const serviceCategories = [
  {number:"01",title:"Prototypes & concepts",description:"Explore form, fit and assembly before committing to the next manufacturing step.",example:"Enclosures / concept models"},
  {number:"02",title:"Practical custom parts",description:"Discuss brackets, organisers and plastic parts designed for a specific purpose.",example:"Mounts / fixtures / organisers"},
  {number:"03",title:"Personal ideas",description:"Turn an original idea into a physical object, subject to design and printing review.",example:"Desk objects / personalised pieces"}
];
export const futureModules = [
  {title:"Enquiries & quotations",description:"Review requests and prepare manual quotations."},
  {title:"Production & tracking",description:"Manage approved jobs and share private updates."},
  {title:"Filament inventory",description:"Track spools, consumption and stock movements."},
  {title:"Cost estimation",description:"Estimate costs from owner-configured assumptions."},
  {title:"Product catalogue",description:"Publish approved products and genuine project work."},
  {title:"Profit & expenses",description:"Review actual receipts, costs and monthly performance."}
];
