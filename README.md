# Photography gallery — v1

A static photo gallery built with **Astro**, deployed on **Cloudflare Pages**, with a
**Sveltia CMS** admin panel. Photos are organised into collections ("rolls"); each
collection is just a folder of images. Build-time image optimisation produces
right-sized AVIF/WebP/JPEG for every device, and strips EXIF/GPS.

This README covers the parts that need *your* accounts. The code is done and verified.

---

## What works right now

Run it locally:

```bash
npm install
npm run dev        # http://localhost:4321
```

Build it (what Cloudflare runs):

```bash
npm run build      # → dist/   (also strips any stray EXIF/GPS from the output)
npm run preview    # serve the built site locally
```

There are three sample collections in `src/content/collections/` demonstrating the
three ways photos can be added (see "Adding photos"). Delete them once your own
content is in.

---

## Go-live checklist (the account steps)

1. **Create a GitHub repo** and push this project to it.
2. **Cloudflare Pages** → Create project → connect the repo. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variable: `SITE_URL` = your final URL (e.g. `https://yourgallery.com`).
     This feeds canonical links, the sitemap, and Open Graph tags.
3. **Domain** (~€10–15/yr, the only near-certain cost). Register via Cloudflare or any
   registrar and point it at the Pages project. Everything else is on free tiers.
4. **Edit `src/lib/site.ts`** — site name, intro line, and your Instagram URL.
5. **Wire up the admin panel** (`/admin`) — see "Admin auth" below.

Push → Cloudflare builds → live. Every later push (or CMS publish) rebuilds in ~1 min.

> Netlify works equally well; the only change is the equivalent build/deploy settings.
> Cloudflare is the default because it eases the future R2 + edge-resizing upgrade.

---

## Adding photos — two paths, identical result

The build's source of truth for *which photos exist* is the image files in a
collection folder. Captions are optional. So both of these produce the same site:

**A — Admin panel (`/admin`).** Log in, create or pick a collection, drag in photos,
optionally type captions/alt, Publish. Sveltia commits the images + metadata to the
repo and the site rebuilds.

**B — Drop files into a folder.** Add JPEGs to
`src/content/collections/<slug>/` (via GitHub's web drag-and-drop uploader, or a local
commit). They're ingested automatically, sorted by filename, captions blank. Add an
`index.md` if you want a title/description.

A collection folder can contain:

```
src/content/collections/<slug>/
    010-name.jpg      photos — sorted by filename (zero-pad: 010, 020, … leaves gaps)
    020-name.jpg
    index.md          optional — collection metadata (front matter)
    captions.yml      optional — per-photo captions/alt
```

`index.md` (all fields optional except `title`):

```yaml
---
title: "Goodbye to Aarhus"
date: 2026-06-01
description: "A short optional paragraph."
cover: 010-name.jpg          # optional; defaults to the first photo
meta_line: "Kodak UltraMax 400 · Olympus OM-1N · Aarhus · June 2026"
---
```

`captions.yml` (filename → caption/alt). A blank/absent caption shows no caption row:

```yaml
010-name.jpg: { caption: "The harbour at dusk", alt: "Boats at dusk" }
020-name.jpg: { caption: "" }    # no caption shown
```

**Captions, either place.** The admin panel stores captions in `index.md` front matter
(a `photos:` list); hand-edits and folder-drops use `captions.yml`. The build reads
both and merges them (the sidecar wins), so the two workflows never fight.

**Lightroom export:** JPEG, **colour space sRGB** (the important one — wide-gamut looks
wrong in browsers), long edge ~3000px, quality ~80–90, output sharpening Screen/Standard.
One master JPEG per photo is all you provide; the build derives every size and format.

---

## Admin auth (one decision to make)

`/admin` writes to your GitHub repo, so it needs auth. Two common options:

- **Cloudflare Access** (simplest here): protect the `/admin` path with an Access policy
  (e.g. one-time email PIN). No extra service to run. Recommended.
- **GitHub OAuth**: deploy a tiny OAuth worker and set `base_url` in
  `public/admin/config.yml`. More moving parts.

Either way, set `backend.repo` in `public/admin/config.yml` to your `owner/repository`.

---

## Decisions still open (from the brief §10)

- Domain name + registrar.
- Hosting: Cloudflare Pages (default) vs Netlify.
- Admin auth: Cloudflare Access (suggested) vs GitHub OAuth.
- Whether the `/all` feed and written posts are in v1 — `/all` is built and on by
  default; toggle in `src/lib/site.ts` (`showAllFeed`, `showPosts`). Written posts are
  not built yet (deferred nice-to-have).
- Exact desktop max-width / spacing — tune the tokens in `src/styles/global.css`
  (`--maxw-photo`, `--photo-gap`) live once it's up.

---

## How it's built (orientation)

- `src/lib/collections.ts` — scans folders, sorts photos, merges metadata + captions.
- `src/components/Photo.astro` — the responsive `<picture>`: per-format quality
  (AVIF 65 / WebP 80 / JPEG 85), widths capped at the master (no upscaling), explicit
  dimensions to prevent layout shift, first image eager + `fetchpriority=high`, rest lazy.
- `src/pages/c/[slug].astro` — the core full-bleed vertical stream.
- `src/pages/index.astro` — home grid (newest first). `about`, `all`, `404`, `rss.xml`,
  `sitemap.xml` round it out.
- `scripts/strip-exif.mjs` — post-build safety net; re-encodes only output images that
  still carry metadata (Astro copies the originals into the build), so nothing deployed
  leaks GPS.

---

## What was verified during the build

- Build completes clean; each photo produced AVIF + WebP + JPEG at every intended width.
- A phone-sized derivative is served, not the 3000px master (srcset + sizes wired up).
- **EXIF/GPS stripped from everything in the output** — derivatives *and* the originals
  Astro copies in (confirmed with a metadata scan: 0 leaks).
- First image eager/`fetchpriority=high`, all others lazy.
- Explicit width/height + `aspect-ratio` on every image (guards CLS).
- Alt text on every `<img>`.
- A photo with no caption leaves no empty gap.
- All three add-photo paths produce correct output, including a folder with no metadata
  at all (title auto-derived from the folder name).

## Still to verify on the deployed site (owner-side, brief §11)

- Lighthouse/PageSpeed on a live collection page — watch **LCP** and **CLS**.
- Open on a real phone and laptop — portrait near-full-height, landscape full-width on
  mobile; desktop max-width treatment.
- Both light and dark mode look right (toggle is in the nav; follows the OS by default).
