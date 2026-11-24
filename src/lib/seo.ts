/** Build-time publication settings. No hostname or launch approval is assumed. */
export function getSeoConfig(env: Record<string, string | undefined> = process.env) {
  const value = env.SITE_URL?.trim();
  const enabled = env.SITE_INDEXING_ENABLED?.trim() || "false";
  if (!["true", "false"].includes(enabled)) throw new Error("SITE_INDEXING_ENABLED must be true or false.");
  let url: string | undefined;
  if (value) {
    let parsed: URL;
    try { parsed = new URL(value); } catch { throw new Error("SITE_URL must be a valid public HTTPS origin."); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/" || ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) {
      throw new Error("SITE_URL must be the confirmed public HTTPS origin without a path, credentials or query.");
    }
    url = parsed.origin;
  }
  if (enabled === "true" && !url) throw new Error("Confirm SITE_URL before enabling indexing.");
  return { url, indexable: enabled === "true" && Boolean(url) };
}
