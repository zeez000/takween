export type Limiter = {limit(options: {key: string}): Promise<{success: boolean}>};
export type EnquiryEnvironment = {
  ENQUIRY_ENABLED?: string; SITE_URL?: string; RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string;
  ENQUIRY_IP_LIMITER?: Limiter; ENQUIRY_SITE_LIMITER?: Limiter;
};
const MAX_BYTES = 16 * 1024;
const reply = (status: number, error: string) => Response.json({error}, {status, headers: {"Cache-Control":"no-store", ...(status === 429 ? {"Retry-After":"60"} : {})}});

async function readBody(request: Request) {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) throw new Error("size");
  if (!request.body) throw new Error("json");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error("size"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(data));
}

export async function handleEnquiry(request: Request, env: EnquiryEnvironment, send: typeof fetch = fetch) {
  let origin: string;
  try { origin = new URL(env.SITE_URL ?? "").origin; } catch { return reply(503, "Enquiries are unavailable. Please email us directly."); }
  if (request.headers.get("origin") !== origin) return reply(403, "This request is not permitted.");
  if (env.ENQUIRY_ENABLED !== "true" || !env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !env.ENQUIRY_IP_LIMITER || !env.ENQUIRY_SITE_LIMITER)
    return reply(503, "Enquiries are unavailable. Please email us directly.");
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.RESEND_FROM_EMAIL) || env.RESEND_FROM_EMAIL.endsWith("@resend.dev"))
    return reply(503, "Enquiries are unavailable. Please email us directly.");
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return reply(503, "Enquiries are unavailable. Please email us directly.");
  try {
    // Worker-provided IP only. Do not trust client email or X-Forwarded-For as a limit key.
    const key = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip)))).map(n=>n.toString(16).padStart(2,"0")).join("");
    if (!(await env.ENQUIRY_IP_LIMITER.limit({key})).success || !(await env.ENQUIRY_SITE_LIMITER.limit({key:"enquiry"})).success)
      return reply(429, "Too many requests. Please wait a minute or email us directly.");
  } catch { return reply(503, "Enquiries are unavailable. Please email us directly."); }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply(415, "Expected JSON.");
  let body;
  try { body = await readBody(request); } catch (error) { return reply(error instanceof Error && error.message === "size" ? 413 : 400, "Invalid or oversized request."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply(400, "Please check your enquiry.");
  const allowed = ["name","email","details","material","quantity","website","requestId"];
  if (Object.keys(body).some(key=>!allowed.includes(key))) return reply(400, "Files and extra fields cannot be submitted.");
  if (body.website !== "") return reply(422, "Your enquiry was not sent. Please email us directly.");
  const {name,email,details,quantity,material,requestId} = body;
  if (typeof name !== "string" || !name.trim() || name.length>100 || typeof email !== "string" || email.length>150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(email) ||
      typeof details !== "string" || details.trim().length<10 || details.length>3000 || !["Please advise","PLA","PETG"].includes(material) ||
      typeof quantity !== "string" || !/^\d+$/.test(quantity) || !Number.isSafeInteger(Number(quantity)) || Number(quantity)<1 || Number(quantity)>10000 ||
      typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))
    return reply(400, "Please check your enquiry details.");
  try {
    const result = await send("https://api.resend.com/emails", {
      method:"POST", signal:AbortSignal.timeout(10000),
      headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`enquiry/${requestId}`},
      body:JSON.stringify({from:env.RESEND_FROM_EMAIL,to:["takweenlabs.in@gmail.com"],reply_to:email,subject:"New TAKWEEN LABS enquiry",
        text:`Name: ${name.trim()}\nEmail: ${email}\nMaterial: ${material}\nQuantity: ${quantity}\n\n${details.trim()}\n\nNo design file uploaded.`})
    });
    if (!result.ok) return reply(502, "Email service did not accept your enquiry. Please retry or email us directly.");
    const accepted = await result.json();
    if (typeof accepted?.id !== "string" || !accepted.id) return reply(502, "We could not confirm acceptance. Please retry or email us directly.");
    return Response.json({status:"accepted",id:accepted.id}, {status:202,headers:{"Cache-Control":"no-store"}});
  } catch { return reply(502, "We could not confirm acceptance. Please retry or email us directly."); }
}
