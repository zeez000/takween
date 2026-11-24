import type { MetadataRoute } from "next";
import { getSeoConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const { url, indexable } = getSeoConfig();
  return {
    rules: indexable
      ? { userAgent: "*", allow: "/", disallow: ["/admin", "/track", "/api/", "/private/"] }
      : { userAgent: "*", disallow: "/" },
    ...(indexable && url ? { sitemap: `${url}/sitemap.xml` } : {}),
  };
}
