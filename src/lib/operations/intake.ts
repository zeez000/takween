import type {Limiter} from '../enquiry-handler.ts';

export type IntakeEnvironment = {
  PERSISTENT_ENQUIRIES_ENABLED?: string;
  ENQUIRY_PRIVACY_VERSION?: string;
  SITE_URL?: string;
  ENQUIRY_IP_LIMITER?: Limiter;
  ENQUIRY_SITE_LIMITER?: Limiter;
};
export type EnquiryPayload = {
  name: string; email: string; description: string; quantity: number;
  material: string; category: 'printing' | 'fateen_machining';
  contactConsent: true; referralConsent: boolean; privacyVersion: string;
  phone?: string; colour?: string; dimensions?: string; preferredDeadline?: string;
  process?: 'wire_cut_edm' | 'surface_grinding' | 'turning' | 'unsure';
};
export type StoreResult = {reference: string; notification_status: string};
export type EnquiryStore = (id: string, payload: EnquiryPayload) => Promise<StoreResult>;
export class SubmissionConflict extends Error {}
const json = (status: number, body: object) => Response.json(body, {
  status, headers: {'Cache-Control': 'no-store', ...(status === 429 ? {'Retry-After': '60'} : {})},
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = ['requestId','website','name','email','description','quantity','material','category',
  'contactConsent','referralConsent','privacyVersion','phone','colour','dimensions','preferredDeadline','process'];

export function validateIntake(value: unknown, privacyVersion: string): {id: string; payload: EnquiryPayload} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => !fields.includes(key))) return null;
  if (typeof body.requestId !== 'string' || !uuid.test(body.requestId) || body.website !== '' ||
    body.contactConsent !== true || typeof body.referralConsent !== 'boolean' ||
    !privacyVersion || privacyVersion.length > 50 || body.privacyVersion !== privacyVersion) return null;
  for (const [key, min, max] of [['name',1,100],['email',3,150],['description',10,3000],['material',1,80]] as const) {
    if (typeof body[key] !== 'string' || body[key].trim().length < min || body[key].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body[key])) return null;
  }
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(body.email as string) ||
    !Number.isInteger(body.quantity) || Number(body.quantity) < 1 || Number(body.quantity) > 10000) return null;
  const category = body.category;
  if (category !== 'printing' && category !== 'fateen_machining') return null;
  if (category === 'printing' && (!['PLA','PETG','Please advise'].includes(body.material as string) || body.referralConsent || body.process !== undefined)) return null;
  if (category === 'fateen_machining' && (!body.referralConsent || !['wire_cut_edm','surface_grinding','turning','unsure'].includes(String(body.process)))) return null;
  for (const [key,max] of [['phone',32],['colour',80],['dimensions',200]] as const) {
    if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].trim().length < (key === 'phone' ? 3 : 1) || body[key].length > max || /[\u0000-\u001f]/.test(body[key]))) return null;
  }
  if (body.preferredDeadline !== undefined) {
    if (typeof body.preferredDeadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.preferredDeadline)) return null;
    const date = new Date(`${body.preferredDeadline}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== body.preferredDeadline) return null;
  }
  // Explicit construction prevents extra fields reaching the service-only RPC.
  const payload: EnquiryPayload = {
    name: (body.name as string).trim(), email: body.email as string,
    description: (body.description as string).trim(), quantity: body.quantity as number,
    material: (body.material as string).trim(), category,
    contactConsent: true, referralConsent: body.referralConsent, privacyVersion,
  };
  for (const key of ['phone','colour','dimensions','preferredDeadline','process'] as const) {
    if (body[key] !== undefined) Object.assign(payload, {[key]: (body[key] as string).trim()});
  }
  return {id: body.requestId.toLowerCase(), payload};
}

export async function handlePersistentEnquiry(request: Request, env: IntakeEnvironment, store: EnquiryStore) {
  if (env.PERSISTENT_ENQUIRIES_ENABLED !== 'true' || !env.ENQUIRY_PRIVACY_VERSION ||
      !env.ENQUIRY_IP_LIMITER || !env.ENQUIRY_SITE_LIMITER) return json(503, {error: 'Stored enquiries are not available. Please email us directly.'});
  let origin: string;
  try { origin = new URL(env.SITE_URL ?? '').origin; } catch { return json(503, {error: 'Enquiries are unavailable.'}); }
  if (request.headers.get('origin') !== origin) return json(403, {error: 'Request not permitted.'});
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) return json(503, {error: 'Enquiries are unavailable.'});
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
    const key = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,'0')).join('');
    // Share existing limiter keys with the provider-only endpoint: no extra abuse budget.
    if (!(await env.ENQUIRY_IP_LIMITER.limit({key})).success || !(await env.ENQUIRY_SITE_LIMITER.limit({key:'enquiry'})).success) return json(429, {error: 'Too many requests. Please retry later.'});
  } catch { return json(503, {error: 'Enquiries are unavailable.'}); }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json(415, {error: 'Expected JSON.'});
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > 16384)) return json(413, {error: 'Request is too large.'});
  if (!request.body) return json(400, {error: 'Please check your enquiry.'});
  let value: unknown;
  const reader = request.body.getReader();
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const {done,value: chunk} = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > 16384) { await reader.cancel(); return json(413, {error: 'Request is too large.'}); }
      chunks.push(chunk);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    value = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  } catch { return json(400, {error: 'Please check your enquiry.'}); }
  finally { reader.releaseLock(); }
  const submission = validateIntake(value, env.ENQUIRY_PRIVACY_VERSION);
  if (!submission) return json(400, {error: 'Please check the details and required consent.'});
  try {
    const stored = await store(submission.id, submission.payload);
    if (!/^TK-[0-9a-f]{32}$/.test(stored.reference) || stored.notification_status !== 'pending') throw Error('Invalid storage acknowledgement');
    return json(201, {status:'stored', reference:stored.reference, notificationStatus:'pending',
      message:'Your request is stored. No email notification or quotation is confirmed.'});
  } catch (error) {
    return error instanceof SubmissionConflict
      ? json(409, {error:'This submission identifier was already used for different details.'})
      : json(503, {error:'Storage could not be confirmed. Retry with the same request, or email us directly.'});
  }
}
