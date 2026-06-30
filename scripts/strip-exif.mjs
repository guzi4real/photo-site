// Post-build safety net: Astro/Vite copies the original master images into the
// output as well as the optimised derivatives. The derivatives are already
// metadata-free, but the copied originals still carry EXIF/GPS. This pass
// re-encodes ONLY the files that still contain metadata (so the clean
// derivatives are left byte-for-byte untouched), guaranteeing nothing in the
// deployed output leaks location data. Runs in plain Node (Cloudflare Pages).
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";

const DIST = process.argv[2] || "dist";

const EXIF = Buffer.from("Exif\0", "latin1");
const XMP = Buffer.from("http://ns.adobe.com/xap", "latin1");
const hasMetadata = (buf) => buf.includes(EXIF) || buf.includes(XMP);

async function* walk(dir) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let scanned = 0,
  stripped = 0;
for await (const file of walk(DIST)) {
  const ext = extname(file).toLowerCase();
  if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png" && ext !== ".webp") continue;
  scanned++;
  const buf = await readFile(file);
  if (!hasMetadata(buf)) continue;
  let img = sharp(buf); // sharp drops all metadata unless withMetadata() is called
  if (ext === ".png") img = img.png();
  else if (ext === ".webp") img = img.webp({ quality: 90 });
  else img = img.jpeg({ quality: 90, mozjpeg: true });
  await writeFile(file, await img.toBuffer());
  stripped++;
  console.log("  stripped metadata:", file);
}
console.log(`strip-exif: scanned ${scanned} image(s), stripped ${stripped}.`);
