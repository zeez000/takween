import type { MetadataRoute } from "next";
import { getSeoConfig } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const { url, indexable } = getSeoConfig();
  return indexable && url ? [{ url: `${url}/`, changeFrequency: "monthly", priority: 1 }] : [];
}
