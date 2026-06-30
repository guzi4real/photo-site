import type { APIRoute } from "astro";
import { getCollections } from "../lib/collections";
import { SITE } from "../lib/site";

export const GET: APIRoute = ({ site }) => {
  const origin = site?.href.replace(/\/$/, "") ?? "";
  const urls = ["/", "/about"];
  if (SITE.showAllFeed) urls.push("/all");
  for (const c of getCollections()) urls.push(`/c/${c.slug}`);

  const body = urls
    .map((u) => `  <url><loc>${origin}${u}</loc></url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
