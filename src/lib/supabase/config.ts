/** Read lazily: importing helpers must not require credentials during static builds. */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment.");
  }
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("Supabase URL configuration is invalid."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Supabase URL must use HTTPS, or HTTP for local development.");
  }
  if (!key.startsWith("sb_publishable_")) {
    throw new Error("Use a Supabase publishable key for NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; never a secret/service key.");
  }
  return { url: parsed.origin, key };
}
