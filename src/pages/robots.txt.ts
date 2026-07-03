import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const origin = site?.href.replace(/\/$/, "") ?? "";

  const body = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${origin}/sitemap.xml
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
