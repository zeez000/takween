// Read-only configuration/API reachability check. Never prints credentials or bodies.
import nextEnv from "@next/env";
const silent = { info() {}, warn() {}, error() {} };
nextEnv.loadEnvConfig(process.cwd(), true, silent);
try {
  const { getSupabaseConfig } = await import("../src/lib/supabase/config.ts");
  const { url, key } = getSupabaseConfig();
  const response = await fetch(new URL("/auth/v1/settings", url), {
    headers: { apikey: key },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object" || !("external" in body)) {
    console.error(`Supabase read-only configuration check failed (HTTP ${response.status}). No response body logged.`);
    process.exitCode = 1;
  } else {
    console.log("PASS: Supabase Auth settings reachable with configured publishable key (HTTP 200). No records or sessions created.");
    console.log("Database tables, RLS, storage and authentication workflows remain unverified.");
  }
} catch {
  console.error("Supabase check failed: verify required environment configuration, publishable key and network access. No credential or remote error details logged.");
  process.exitCode = 1;
}
