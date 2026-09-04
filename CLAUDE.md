# photo-site

Personal photography gallery. Astro (static output), Sveltia CMS, deployed on Cloudflare Workers.

## Deployment

Push to `main` → Cloudflare Workers Builds runs `npm run build` → auto-deploys.

- `SITE_URL` is a Cloudflare **build** variable, not runtime. It falls back to `https://example.com` locally — that's expected, not a bug.
- `wrangler.jsonc` is committed deliberately. Do **not** let Cloudflare's autoconfig bot regenerate it: it adds a `main` field pointing at `dist/_worker.js/index.js`, which doesn't exist in this static build. If a `cloudflare/workers-autoconfig` PR appears on GitHub, close it rather than merging.

## Content model

Collections are folders under `src/content/collections/<slug>/`.

- **Photos on disk are the source of truth.** A folder with no images doesn't render at all, regardless of metadata.
- Photos sort by filename. `index.md` (title, date, description, cover, meta_line) is optional.
- Captions come from either `index.md` front matter (a `photos:` list — what Sveltia writes) or a `captions.yml` sidecar (hand-edited). The build reads both and merges them, sidecar winning.
- Sveltia only sees collections that have an `index.md` — a folder with images but no `index.md` renders on the site but is invisible in the CMS.

## Image pipeline

`src/components/Photo.astro` generates AVIF/WebP/JPEG at up to six widths per photo, capped at the master's width (no upscaling). Per-format quality differs deliberately (AVIF 65 / WebP 80 / JPEG 85).

`scripts/strip-exif.mjs` runs after `astro build` and strips EXIF/GPS from any output image still carrying it — Astro copies original masters into `dist/` untouched, so this is required, not optional.

## Conventions

- Run `git status` before `git add`; prefer listing files explicitly over `git add .`.
- `npm run dev` skips the EXIF strip and generates images lazily. Use `npm run build` + `npm run preview` to check real production output.
- Reference docs (original implementation plan, design handoff) live outside the repo in `~/Documents/claude/photo-site-docs`.
