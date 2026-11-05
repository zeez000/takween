export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = [".stl", ".3mf", ".step", ".stp"];
export type EnquiryDraft = {name:string;contact:string;material:string;quantity:string;details:string};
export function validateDesignFile(file: {name:string;size:number}): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) return "Choose an STL, 3MF, STEP or STP file.";
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_FILE_BYTES) return "The preview limit is 25 MB.";
  return null;
}
export function formatEnquiry(draft:EnquiryDraft): string {
  return ["Custom 3D printing enquiry",`Name: ${draft.name.trim()}`,`Contact: ${draft.contact.trim()}`,`Material: ${draft.material}`,`Quantity: ${draft.quantity}`,`Project: ${draft.details.trim()}`,"Please review feasibility, price and turnaround.","No design file is attached to this message."].join("\n");
}
export function whatsappUrl(number:string,message:string): string | null {
  if (!/^[1-9]\d{7,14}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
