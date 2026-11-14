import {NextResponse} from "next/server";

export const runtime = "nodejs";
const DESTINATION = "takweenlabs.in@gmail.com";
const SENDER = "TAKWEEN LABS <onboarding@resend.dev>";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request:Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let originHost = "";
  try { originHost = origin ? new URL(origin).host : ""; } catch { /* invalid origin */ }
  if (!originHost || !host || originHost!==host)
    return NextResponse.json({error:"Forbidden."},{status:403});
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({error:"Enquiry delivery is not configured."},{status:503});
  if (Number(request.headers.get("content-length")||0)>12000)
    return NextResponse.json({error:"Request too large."},{status:413});
  if (request.headers.get("content-type")?.split(";")[0]?.trim()!=="application/json")
    return NextResponse.json({error:"Expected JSON."},{status:415});
  let body:Record<string,unknown>;
  try {body = await request.json();} catch {
    return NextResponse.json({error:"Invalid request."},{status:400});
  }
  if (!body || typeof body!=="object" || Array.isArray(body))
    return NextResponse.json({error:"Invalid request."},{status:400});
  if (body.website) return NextResponse.json({ok:true});
  const name = typeof body.name==="string"?body.name.trim():"";
  const email = typeof body.email==="string"?body.email.trim():"";
  const details = typeof body.details==="string"?body.details.trim():"";
  const material = body.material;
  const quantity = Number(body.quantity);
  if (!name || name.length>100 || !emailPattern.test(email) || email.length>150 ||
      !details || details.length<10 || details.length>3000 ||
      !["Please advise","PLA","PETG"].includes(String(material)) ||
      !Number.isInteger(quantity) || quantity<1 || quantity>10000 ||
      body.fileName || body.fileData) {
    return NextResponse.json({error:"Please check your enquiry details. Files cannot be uploaded yet."},{status:400});
  }
  const text = [
    "New TAKWEEN LABS enquiry",
    "Name: "+name, "Email: "+email, "Material: "+material,
    "Quantity: "+quantity, "Project: "+details,
    "No design file was uploaded."
  ].join("\n\n");
  try {
    const result = await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({from:SENDER,to:[DESTINATION],reply_to:email,subject:"New TAKWEEN LABS enquiry",text})
    });
    if (!result.ok) {
      console.error("Resend rejected enquiry",result.status);
      return NextResponse.json({error:"We could not send your enquiry. Please try again or email us directly."},{status:502});
    }
    return NextResponse.json({ok:true});
  } catch {
    return NextResponse.json({error:"Email service unavailable. Please try again later."},{status:502});
  }
}
