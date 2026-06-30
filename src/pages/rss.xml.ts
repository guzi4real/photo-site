import type { APIRoute } from "astro";
import { getCollections } from "../lib/collections";
import { SITE } from "../lib/site";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const GET: APIRoute = ({ site }) => {
  const origin = site?.href.replace(/\/$/, "") ?? "";
  const items = getCollections()
    .map((c) => {
      const link = `${origin}/c/${c.slug}`;
      const pub = c.date ? c.date.toUTCString() : new Date().toUTCString();
      return `    <item>
      <title>${esc(c.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${pub}</pubDate>
      <description>${esc(c.description || `${c.photos.length} photos`)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(SITE.name)}</title>
    <link>${origin}/</link>
    <description>${esc(SITE.description)}</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
