"""Kingdom 846 share card.

Builds public/assets/kingdom846-share.jpg at 1200x630 -- the 1.91:1 ratio the
social platforms crop to, so nothing is trimmed.

The card is drawn rather than photographed: the crest is composited onto a
navy field, the lettering is filled with a real metallic gradient rather than
flat gold, and the frame carries its own corner ornaments. Everything is
sourced from the site's own palette in tailwind.config.js so the card and the
masthead cannot drift apart.

Run:  python3 tools/make-share-card.py
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import random

W, H = 1200, 630

NAVY_HI   = (12, 26, 50)
NAVY_LO   = (2, 5, 12)
GOLD      = (212, 175, 55)
GOLD_BR   = (232, 199, 102)
GOLD_DEEP = (156, 122, 36)
PARCHMENT = (243, 232, 204)
PARCH_DIM = (217, 203, 163)

SERIF_B = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SERIF_R = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
fnt = lambda p, s: ImageFont.truetype(p, s)


def gold_leaf(size):
    """A vertical metallic-gold gradient: the sheen is what separates gold
    leaf from mustard. Stops run deep -> bright -> specular -> deep -> rim."""
    w, h = size
    stops = [(0.00, (120, 88, 24)), (0.18, (198, 158, 58)), (0.36, (245, 222, 140)),
             (0.46, (255, 248, 214)), (0.58, (214, 176, 62)), (0.80, (140, 104, 30)),
             (1.00, (226, 198, 126))]
    col = Image.new("RGB", (1, h))
    px = col.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        for i in range(len(stops) - 1):
            a, ca = stops[i]
            b, cb = stops[i + 1]
            if a <= t <= b:
                k = (t - a) / (b - a)
                px[0, y] = tuple(int(ca[j] + (cb[j] - ca[j]) * k) for j in range(3))
                break
    return col.resize((w, h), Image.BICUBIC)


def draw_text_gold(base, xy, text, font, track=0.0, glow=True):
    """Stamp text filled with gold leaf instead of a flat colour."""
    d0 = ImageDraw.Draw(base)
    width = sum(d0.textlength(c, font=font) + track for c in text) - track
    asc, desc = font.getmetrics()
    height = asc + desc
    mask = Image.new("L", (int(width) + 8, height + 10), 0)
    md = ImageDraw.Draw(mask)
    x = 0.0
    for ch in text:
        md.text((x, 0), ch, font=font, fill=255)
        x += md.textlength(ch, font=font) + track
    leaf = gold_leaf(mask.size)
    if glow:  # a soft halo so the letters sit in light, like raised metal
        halo = Image.new("RGBA", base.size, (0, 0, 0, 0))
        halo.paste(Image.new("RGBA", mask.size, GOLD + (255,)), (int(xy[0]), int(xy[1])),
                   mask.point(lambda v: int(v * 0.42)))
        base.alpha_composite(halo.filter(ImageFilter.GaussianBlur(13)))
    base.paste(leaf, (int(xy[0]), int(xy[1])), mask)
    return width


def text_width(text, font, track=0.0):
    d0 = ImageDraw.Draw(Image.new("L", (1, 1)))
    return sum(d0.textlength(c, font=font) + track for c in text) - track


def corner_ornament(tile=132):
    """One filigree corner, drawn once and rotated into the other three so the
    frame is exactly symmetric."""
    t = Image.new("RGBA", (tile, tile), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    G = GOLD + (235,)
    GD = GOLD_DEEP + (190,)
    d.arc([14, 14, 104, 104], 180, 270, fill=G, width=3)          # main curl
    d.arc([26, 26, 80, 80], 180, 270, fill=GD, width=2)           # inner echo
    d.arc([6, 52, 46, 92], 200, 330, fill=GD, width=2)            # lower scroll
    d.arc([52, 6, 92, 46], 110, 240, fill=GD, width=2)            # upper scroll
    d.line([(14, 59), (14, 118)], fill=G, width=3)                # rails
    d.line([(59, 14), (118, 14)], fill=G, width=3)
    for c in ((14, 14), (14, 122), (122, 14)):                    # studs
        d.ellipse([c[0] - 4, c[1] - 4, c[0] + 4, c[1] + 4], fill=GOLD_BR + (255,))
    d.polygon([(40, 22), (48, 30), (40, 38), (32, 30)], fill=GOLD_BR + (230,))
    d.polygon([(22, 40), (30, 32), (38, 40), (30, 48)], fill=GOLD_BR + (230,))
    return t


# ---------------------------------------------------------------- background
bg = Image.new("RGB", (W, H), NAVY_LO)
d = ImageDraw.Draw(bg)
for y in range(H):
    t = (y / (H - 1)) ** 0.85
    d.line([(0, y), (W, y)], fill=tuple(int(NAVY_HI[i] + (NAVY_LO[i] - NAVY_HI[i]) * t) for i in range(3)))

# Pool of warm light for the crest to stand in.
glow = Image.new("L", (W, H), 0)
gd = ImageDraw.Draw(glow)
cx, cy, r = 352, 268, 352
for i in range(r, 0, -3):
    gd.ellipse([cx - i, cy - i * 0.94, cx + i, cy + i * 0.94], fill=int(128 * (1 - i / r) ** 1.75))
glow = glow.filter(ImageFilter.GaussianBlur(52))
bg = Image.composite(Image.new("RGB", (W, H), (150, 116, 40)), bg, glow.point(lambda v: int(v * 0.52)))

# Diagonal sheen, as if light crossed a lacquered surface.
sheen = Image.new("L", (W, H), 0)
sd = ImageDraw.Draw(sheen)
sd.polygon([(-260, H), (330, -120), (600, -120), (10, H)], fill=26)
bg = ImageChops.screen(bg, Image.merge("RGB", (sheen,) * 3).filter(ImageFilter.GaussianBlur(90)))

# Vignette back down to near-black at the corners.
vig = Image.new("L", (W, H), 0)
ImageDraw.Draw(vig).ellipse([-W * .06, -H * .20, W * 1.06, H * 1.20], fill=255)
bg = Image.composite(bg, Image.new("RGB", (W, H), (1, 3, 8)), vig.filter(ImageFilter.GaussianBlur(125)))

# Fine grain -- flat digital gradients are the tell of a cheap card.
random.seed(846)
noise = Image.new("L", (W, H))
noise.putdata([random.gauss(128, 8) for _ in range(W * H)])
bg = ImageChops.overlay(bg, Image.merge("RGB", (noise,) * 3))

card = bg.convert("RGBA")

# --------------------------------------------------------------------- frame
d = ImageDraw.Draw(card)
d.rectangle([22, 22, W - 23, H - 23], outline=GOLD_DEEP + (205,), width=3)
d.rectangle([31, 31, W - 32, H - 32], outline=GOLD + (85,), width=1)
orn = corner_ornament()
card.alpha_composite(orn, (22, 22))
card.alpha_composite(orn.transpose(Image.ROTATE_270), (W - 22 - orn.width, 22))
card.alpha_composite(orn.transpose(Image.ROTATE_90), (22, H - 22 - orn.height))
card.alpha_composite(orn.transpose(Image.ROTATE_180), (W - 22 - orn.width, H - 22 - orn.height))

# --------------------------------------------------------------------- crest
crest = Image.open("public/assets/crest-846.png").convert("RGBA")
CH = 418
CWd = int(crest.width * CH / crest.height)
crest = crest.resize((CWd, CH), Image.LANCZOS)
CX, CY = 352 - CWd // 2, 62

# Reflection on the polished floor beneath it.
refl = crest.transpose(Image.FLIP_TOP_BOTTOM)
fade = Image.linear_gradient("L").resize((CWd, CH)).point(lambda v: int((255 - v) * 0.20))
refl.putalpha(ImageChops.multiply(refl.split()[3], fade))
refl = refl.filter(ImageFilter.GaussianBlur(4.2)).crop((0, 0, CWd, 62))
card.alpha_composite(refl, (CX, CY + CH + 4))

# Gold bloom behind the crest, then the crest itself.
bloom = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bloom.paste(Image.new("RGBA", crest.size, (190, 148, 52, 255)), (CX, CY + 6),
            crest.split()[3].point(lambda v: int(v * 0.55)))
card.alpha_composite(bloom.filter(ImageFilter.GaussianBlur(30)))
card.alpha_composite(crest, (CX, CY))

# ---------------------------------------------------------------------- type
d = ImageDraw.Draw(card)
TX = 664
d.line([(TX, 150), (TX, 486)], fill=GOLD_DEEP + (135,), width=1)
for yy in (150, 486):
    d.polygon([(TX, yy - 7), (TX + 6, yy), (TX, yy + 7), (TX - 6, yy)], fill=GOLD + (215,))
TX += 40

fe = fnt(SERIF_R, 20)
x = TX
for ch in "THE ROYAL PORTAL":
    d.text((x, 168), ch, font=fe, fill=GOLD + (225,))
    x += d.textlength(ch, font=fe) + 5.4

draw_text_gold(card, (TX, 196), "KINGDOM", fnt(SERIF_B, 72), track=2.2)
draw_text_gold(card, (TX, 278), "846", fnt(SERIF_B, 72), track=2.2)

d = ImageDraw.Draw(card)
d.line([(TX, 376), (TX + 250, 376)], fill=GOLD + (215,), width=3)
d.polygon([(TX + 262, 376 - 7), (TX + 269, 376), (TX + 262, 376 + 7), (TX + 255, 376)], fill=GOLD_BR + (240,))

ft = fnt(SERIF_B, 30)
x = TX
for ch in "WE TAKE WHAT'S OURS":
    d.text((x, 404), ch, font=ft, fill=PARCHMENT + (242,))
    x += d.textlength(ch, font=ft) + 1.5

d.text((TX, 450), "One Crown. Four Alliances. Endless Glory.", font=fnt(SERIF_R, 22), fill=PARCH_DIM + (208,))

# The domain is right-aligned to where the corner ornament begins, not to the
# frame: aligned to the frame it ran straight into the filigree curl.
fd = fnt(SERIF_R, 19)
ORN_GAP = 18
x = (W - 22 - orn.width) - ORN_GAP - text_width("KINGDOM846.COM", fd, 4.2)
for ch in "KINGDOM846.COM":
    d.text((x, 522), ch, font=fd, fill=GOLD + (205,))
    x += d.textlength(ch, font=fd) + 4.2

card.convert("RGB").save("public/assets/kingdom846-share.jpg", "JPEG",
                         quality=90, optimize=True, progressive=True, subsampling=1)
print("written 1200x630")
