import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// No R2, database, Images or paid-service bindings for the read-only preview.
export default defineCloudflareConfig();
