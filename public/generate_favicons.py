"""One-off generator for FCRS favicon PNG/ICO from brand colours (#6F8F72, white F). Run from App/public."""
from __future__ import annotations

import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.join(ROOT, ".pillow_pkg")
if os.path.isdir(PKG):
    sys.path.insert(0, PKG)

from PIL import Image, ImageDraw, ImageFont  # noqa: E402

GREEN = (0x6F, 0x8F, 0x72, 255)
WHITE = (255, 255, 255, 255)


def render_f_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    rx = max(2, int(round(18 * size / 100)))
    dr.rounded_rectangle((0, 0, size - 1, size - 1), radius=rx, fill=GREEN)

    font_size = int(round(52 * size / 100))
    if size <= 16:
        font_size = max(font_size, 11)
    elif size <= 32:
        font_size = max(font_size, 18)

    font = None
    font_paths = [
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    env_font = os.environ.get("FONT_ARIAL_BOLD", "").strip()
    if env_font:
        font_paths.insert(0, env_font)
    for path in font_paths:
        if path and os.path.isfile(path):
            try:
                font = ImageFont.truetype(path, font_size)
                break
            except OSError:
                continue
    if font is None:
        font = ImageFont.load_default()

    txt = "F"
    bbox = dr.textbbox((0, 0), txt, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1] - max(1, size // 40)
    dr.text((x, y), txt, fill=WHITE, font=font)
    return img


def main() -> None:
    os.chdir(ROOT)
    targets = (
        ("favicon-16x16.png", 16),
        ("favicon-32x32.png", 32),
        ("apple-touch-icon.png", 180),
        ("android-chrome-192x192.png", 192),
        ("android-chrome-512x512.png", 512),
    )
    for name, s in targets:
        im = render_f_icon(s)
        im.save(name, "PNG", optimize=True)
        print(name, os.path.getsize(name), "bytes")

    i32 = render_f_icon(32)
    i16 = render_f_icon(16)
    i32.save("favicon.ico", format="ICO", append_images=[i16])
    print("favicon.ico", os.path.getsize("favicon.ico"), "bytes")


if __name__ == "__main__":
    main()
