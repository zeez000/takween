import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

/** Per-request client. Enable cookie writes only in a Route Handler/Server Action.
 * Server Components can read cookies but cannot persist refreshed sessions.
 * Authentication/proxy refresh flows are deliberately not installed in this phase.
 */
export async function createClient({ writableCookies = false } = {}) {
  const { url, key } = getSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values) {
        if (!writableCookies) return;
        for (const { name, value, options } of values) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
