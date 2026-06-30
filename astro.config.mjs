// @ts-check
import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";

// The deployed origin. Used for canonical URLs, sitemap, and Open Graph tags.
// Override at build time with SITE_URL, e.g. on Cloudflare Pages set an env var.
const SITE = process.env.SITE_URL || "https://example.com";

export default defineConfig({
  site: SITE,

  // Pure static output — deploys to Cloudflare Pages / Netlify with no server.
  output: "static",

  image: {
    // Astro's built-in Sharp service. It strips all metadata (incl. EXIF/GPS)
    // from generated derivatives by default — we never call withMetadata().
    service: {
      entrypoint: "astro/assets/services/sharp",
      config: {
        limitInputPixels: false, // allow large panoramas
      },
    },
  },

  build: {
    // Emit each page as its own directory with index.html (clean URLs).
    format: "directory",
  },

  adapter: cloudflare()
});