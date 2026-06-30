#!/usr/bin/env python3
"""Generate sample 'master' JPEGs (~3000px long edge, sRGB) with EXIF + GPS,
so we can verify the build strips metadata from derivatives."""
import os, math, piexif
from PIL import Image, ImageDraw, ImageFont

OUT = "/home/claude/photo-site/src/content/collections/goodbye-to-aarhus"
os.makedirs(OUT, exist_ok=True)

def font(size):
    for p in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def grad(w, h, top, bottom):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img

def exif_bytes():
    # Includes GPS — this is exactly what must NOT survive into derivatives.
    zeroth = {piexif.ImageIFD.Make: b"Olympus", piexif.ImageIFD.Model: b"OM-1N",
              piexif.ImageIFD.Software: b"Adobe Lightroom"}
    exif = {piexif.ExifIFD.DateTimeOriginal: b"2026:06:01 18:24:00",
            piexif.ExifIFD.LensModel: b"Zuiko 50mm f/1.8"}
    gps = {piexif.GPSIFD.GPSLatitudeRef: b"N",
           piexif.GPSIFD.GPSLatitude: [(56, 1), (9, 1), (0, 1)],
           piexif.GPSIFD.GPSLongitudeRef: b"E",
           piexif.GPSIFD.GPSLongitude: [(10, 1), (12, 1), (0, 1)]}
    return piexif.dump({"0th": zeroth, "Exif": exif, "GPS": gps})

def make(name, w, h, top, bottom, label):
    img = grad(w, h, top, bottom)
    d = ImageDraw.Draw(img)
    # subtle frame label so render-checks are legible
    d.text((int(w * 0.04), int(h * 0.04)), label, font=font(int(min(w, h) * 0.06)),
           fill=(255, 255, 255))
    d.text((int(w * 0.04), int(h * 0.90)), f"{w}×{h}", font=font(int(min(w, h) * 0.035)),
           fill=(255, 255, 255))
    path = os.path.join(OUT, name)
    img.save(path, "JPEG", quality=90, exif=exif_bytes())
    print("wrote", name, f"{w}x{h}")

# A small roll covering the content edge cases from the brief §11.
make("010-harbour.jpg",   3000, 2000, (40, 58, 86), (170, 140, 110), "010")   # landscape
make("020-doorway.jpg",   2000, 3000, (28, 30, 36), (190, 120, 90),  "020")   # portrait
make("030-rooftops.jpg",  3000, 1800, (200, 170, 120),(60, 70, 95),  "030")   # landscape, no caption
make("040-panorama.jpg",  4000, 1100, (24, 36, 64), (210, 160, 120), "040")   # ultra-wide pano
make("050-stairwell.jpg", 1600, 3200, (18, 20, 26), (120, 90, 70),   "050")   # ultra-tall portrait
make("060-window.jpg",    2400, 2400, (150,160,170),(30, 34, 44),    "060")   # square

print("done")
