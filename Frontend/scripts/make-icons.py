"""App icons drawn in code (no AI-generated artwork), and the SI watermark on the logo.

    python scripts/make-icons.py      (run in Frontend/)

- favicon.png, apple-touch-icon.png, pwa-192.png, pwa-512.png: a pulse line inside an orbit arc,
  drawn here with Pillow.
- logo-vitalx.png: the header logo was generated with AI. NASA Space Apps requires a visible
  watermark on SI-generated images, so this adds an "AI-generated logo" strip under it (once).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PUBLIC = Path(__file__).resolve().parent.parent / 'public'
BACKGROUND = (22, 25, 29, 255)   # --color-space-900
WHITE = (240, 242, 245, 255)
BLUE = (30, 155, 240, 255)
SUPERSAMPLE = 4
LOGO_HEIGHT = 96
WATERMARK = 'AI-generated logo'


def draw_icon(size):
    s = size * SUPERSAMPLE
    img = Image.new('RGBA', (s, s), BACKGROUND)
    d = ImageDraw.Draw(img)
    # Keep the drawing inside the central 70% so it survives maskable/rounded crops
    pad = s * 0.17
    box = [pad, pad, s - pad, s - pad]
    width = max(2, round(s * 0.045))
    d.arc(box, start=110, end=330, fill=WHITE, width=width)
    d.arc(box, start=40, end=140, fill=BLUE, width=width)

    # Pulse line across the middle, ending in a dot like a telemetry probe
    mid = s * 0.52
    u = s / 100
    points = [(14, 0), (38, 0), (44, -8), (52, 18), (60, -26), (67, 6), (72, 0), (84, 0)]
    line = [(x * u, mid + y * u) for x, y in points]
    d.line(line, fill=WHITE, width=width, joint='curve')
    r = s * 0.04
    end_x, end_y = line[-1]
    d.ellipse([end_x - r, end_y - r, end_x + r, end_y + r], fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)


def watermark_logo():
    path = PUBLIC / 'logo-vitalx.png'
    logo = Image.open(path).convert('RGBA')
    if logo.height != LOGO_HEIGHT:
        print('logo-vitalx.png already watermarked')
        return
    strip = 34
    out = Image.new('RGBA', (logo.width, logo.height + strip), (0, 0, 0, 0))
    out.paste(logo, (0, 0))
    d = ImageDraw.Draw(out)
    font = ImageFont.load_default(size=26)
    text_w = d.textlength(WATERMARK, font=font)
    d.text((logo.width - text_w - 4, logo.height + 1), WATERMARK, font=font, fill=(185, 192, 200, 255))
    out.save(path)
    print('logo-vitalx.png watermarked')


if __name__ == '__main__':
    for name, size in [('favicon.png', 64), ('apple-touch-icon.png', 180), ('pwa-192.png', 192), ('pwa-512.png', 512)]:
        draw_icon(size).save(PUBLIC / name)
        print(name, size)
    watermark_logo()
