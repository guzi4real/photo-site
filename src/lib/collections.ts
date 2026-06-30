import type { ImageMetadata } from "astro";
import { parse as parseYaml } from "yaml";

// ----------------------------------------------------------------------------
// The content model (see build brief §5).
//
// A collection is JUST A FOLDER:
//   src/content/collections/<slug>/
//       010-name.jpg        ← photos, sorted by filename
//       020-name.jpg
//       index.md            ← optional collection metadata (front matter)
//       captions.yml        ← optional per-photo captions/alt
//
// Source of truth for WHICH photos exist  = the image files on disk.
// Source of truth for captions/alt        = captions.yml (optional).
//
// This is what makes the two upload paths produce identical output:
//   • Admin panel writes images + captions.yml into the folder.
//   • A raw file-drop writes images into the folder (captions blank).
// Both are just "files in a folder", and the build reads the folder.
// ----------------------------------------------------------------------------

const ROOT = "/src/content/collections/";

// Eagerly import every image so Astro can derive responsive AVIF/WebP/JPEG.
// (Images must be imported assets for build-time optimisation to apply.)
const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  "/src/content/collections/**/*.{jpg,jpeg,JPG,JPEG,png,PNG,webp,WEBP,avif,AVIF}",
  { eager: true }
);

// Optional collection metadata.
const indexModules = import.meta.glob<{ frontmatter: Record<string, any> }>(
  "/src/content/collections/**/index.md",
  { eager: true }
);

// Optional per-photo captions sidecar (raw text → parsed below).
const captionModules = import.meta.glob<string>(
  "/src/content/collections/**/captions.{yml,yaml}",
  { eager: true, query: "?raw", import: "default" }
);

export interface Photo {
  /** Bare filename, e.g. "010-harbour.jpg". */
  filename: string;
  /** Optimisable image asset (width/height known → no layout shift). */
  src: ImageMetadata;
  /** Caption shown beneath the photo. Empty string = no caption. */
  caption: string;
  /** Accessible alt text (never empty after resolution). */
  alt: string;
  /** 1-based position within the collection (used for the frame label). */
  index: number;
}

export interface Collection {
  slug: string;
  title: string;
  date: Date | null;
  description: string;
  metaLine: string;
  cover: ImageMetadata;
  coverFilename: string;
  photos: Photo[];
}

type CaptionEntry = { caption?: string; alt?: string };

/** Reduce any stored path ("…/010-name.jpg" or "/uploads/010-name.jpg") to "010-name.jpg". */
function basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p;
}

/** Turn "goodbye-to-aarhus" into "Goodbye to Aarhus" for a sensible default. */
function prettifySlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function slugAndFileFromPath(path: string): { slug: string; filename: string } {
  const rest = path.slice(ROOT.length); // "<slug>/.../file.ext"
  const parts = rest.split("/");
  const slug = parts[0];
  const filename = parts[parts.length - 1];
  return { slug, filename };
}

/**
 * Normalise captions into a filename→entry map.
 * Accepts ALL of these so every workflow is covered:
 *   • a raw captions.yml string (hand-edited / folder-drop), keyed map:
 *       010-name.jpg: { caption: "…", alt: "…" }
 *   • a list (what the admin panel writes, in YAML or front matter):
 *       - { file: 010-name.jpg, caption: "…", alt: "…" }
 *   • already-parsed front-matter data (object or array).
 * Keys are reduced to bare filenames so a stored path still matches.
 */
function normaliseCaptions(input: string | unknown | undefined): Map<string, CaptionEntry> {
  const map = new Map<string, CaptionEntry>();
  if (input == null) return map;

  let data: unknown = input;
  if (typeof input === "string") {
    try {
      data = parseYaml(input);
    } catch {
      return map; // malformed sidecar → no captions, don't break the build
    }
  }
  if (!data) return map;

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") {
        const file = (item as any).file ?? (item as any).filename ?? (item as any).image;
        if (typeof file === "string") {
          map.set(basename(file), {
            caption: (item as any).caption ?? "",
            alt: (item as any).alt ?? "",
          });
        }
      }
    }
  } else if (typeof data === "object") {
    for (const [file, val] of Object.entries(data as Record<string, any>)) {
      if (val && typeof val === "object") {
        map.set(basename(file), { caption: val.caption ?? "", alt: val.alt ?? "" });
      } else if (typeof val === "string") {
        map.set(basename(file), { caption: val, alt: "" });
      }
    }
  }
  return map;
}

let cache: Collection[] | null = null;

export function getCollections(): Collection[] {
  if (cache) return cache;

  // 1. Group image assets by collection slug.
  const imagesBySlug = new Map<string, { filename: string; src: ImageMetadata }[]>();
  for (const [path, mod] of Object.entries(imageModules)) {
    const { slug, filename } = slugAndFileFromPath(path);
    if (!imagesBySlug.has(slug)) imagesBySlug.set(slug, []);
    imagesBySlug.get(slug)!.push({ filename, src: mod.default });
  }

  // 2. Index metadata + captions by slug.
  const metaBySlug = new Map<string, Record<string, any>>();
  for (const [path, mod] of Object.entries(indexModules)) {
    metaBySlug.set(slugAndFileFromPath(path).slug, mod.frontmatter ?? {});
  }
  const captionsBySlug = new Map<string, Map<string, CaptionEntry>>();
  for (const [path, raw] of Object.entries(captionModules)) {
    captionsBySlug.set(slugAndFileFromPath(path).slug, normaliseCaptions(raw));
  }

  // 3. Assemble each collection.
  const collections: Collection[] = [];
  for (const [slug, imgs] of imagesBySlug.entries()) {
    imgs.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));

    const meta = metaBySlug.get(slug) ?? {};
    // Captions can come from index.md front matter (admin panel writes a
    // `photos:`/`captions:` list) and/or the captions.yml sidecar. Merge them,
    // letting the sidecar win, so every upload path lands in the same place.
    const fromFrontmatter = normaliseCaptions(meta.photos ?? meta.captions);
    const fromSidecar = captionsBySlug.get(slug) ?? new Map();
    const captions = new Map<string, CaptionEntry>([...fromFrontmatter, ...fromSidecar]);
    const title: string = (meta.title && String(meta.title)) || prettifySlug(slug);

    const photos: Photo[] = imgs.map((img, i) => {
      const entry = captions.get(img.filename) ?? {};
      const caption = (entry.caption ?? "").trim();
      const alt = (entry.alt ?? "").trim() || caption || title;
      return { filename: img.filename, src: img.src, caption, alt, index: i + 1 };
    });

    // Cover: explicit front-matter cover if it matches a photo, else first photo.
    const coverFilename: string =
      (meta.cover && photos.find((p) => p.filename === meta.cover)?.filename) ||
      photos[0]?.filename;
    const cover = photos.find((p) => p.filename === coverFilename)?.src ?? photos[0]?.src;

    if (!cover) continue; // a collection with no images is not a collection

    collections.push({
      slug,
      title,
      date: meta.date ? new Date(meta.date) : null,
      description: meta.description ? String(meta.description) : "",
      metaLine: meta.meta_line ? String(meta.meta_line) : "",
      cover,
      coverFilename,
      photos,
    });
  }

  // 4. Newest first (collections without a date sort last, by title).
  collections.sort((a, b) => {
    if (a.date && b.date) return b.date.getTime() - a.date.getTime();
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });

  cache = collections;
  return collections;
}

export function getCollection(slug: string): Collection | undefined {
  return getCollections().find((c) => c.slug === slug);
}

/** Flat reverse-chronological stream of every photo (for the optional /all feed). */
export function getAllPhotos(): { photo: Photo; collection: Collection }[] {
  const out: { photo: Photo; collection: Collection }[] = [];
  for (const c of getCollections()) {
    for (const p of c.photos) out.push({ photo: p, collection: c });
  }
  return out;
}
