from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

W, H = 1200, 630
INK      = (17, 34, 64)
INK_DEEP = (5, 11, 24)
GOLD       = (212, 175, 55)
GOLD_BRIGHT= (232, 199, 102)
GOLD_DEEP  = (156, 122, 36)
PARCHMENT  = (243, 232, 204)
PARCH_DIM  = (217, 203, 163)

SERIF_B = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SERIF_R = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"

def f(path, size): return ImageFont.truetype(path, size)

# ---- background: deep vertical gradient, navy into near-black -------------
bg = Image.new("RGB", (W, H), INK_DEEP)
d = ImageDraw.Draw(bg)
for y in range(H):
    t = y / (H - 1)
    # ease so the midtone sits high, like the site's hero
    e = t ** 0.80
    c = tuple(int(INK[i] + (INK_DEEP[i] - INK[i]) * e) for i in range(3))
    d.line([(0, y), (W, y)], fill=c)

# ---- warm radial glow behind where the crest will sit --------------------
glow = Image.new("L", (W, H), 0)
gd = ImageDraw.Draw(glow)
cx, cy, r = 360, 300, 430
for i in range(r, 0, -4):
    a = int(132 * (1 - i / r) ** 1.5)
    gd.ellipse([cx - i, cy - i * 0.95, cx + i, cy + i * 0.95], fill=a)
glow = glow.filter(ImageFilter.GaussianBlur(48))
bg = Image.composite(Image.new("RGB", (W, H), GOLD_DEEP), bg, glow.point(lambda v: int(v * 0.72)))

# ---- vignette ------------------------------------------------------------
vig = Image.new("L", (W, H), 0)
vd = ImageDraw.Draw(vig)
vd.ellipse([-W * 0.16, -H * 0.34, W * 1.16, H * 1.34], fill=255)
vig = vig.filter(ImageFilter.GaussianBlur(150))
bg = Image.composite(bg, Image.new("RGB", (W, H), (3, 6, 14)), vig)

card = bg.convert("RGBA")
d = ImageDraw.Draw(card)

# ---- gold double rule border --------------------------------------------
d.rectangle([26, 26, W - 27, H - 27], outline=GOLD_DEEP + (170,), width=2)
d.rectangle([33, 33, W - 34, H - 34], outline=GOLD + (60,), width=1)

# ---- crest ---------------------------------------------------------------
crest = Image.open("public/assets/crest-846.png").convert("RGBA")
target_h = 486
cw = int(crest.width * target_h / crest.height)
crest = crest.resize((cw, target_h), Image.LANCZOS)

# soft gold drop-shadow so the crest sits on the field rather than floating
sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
mask = crest.split()[3].point(lambda v: int(v * 0.5))
shadow_src = Image.new("RGBA", crest.size, GOLD_DEEP + (255,))
sh.paste(shadow_src, (360 - cw // 2, 315 - target_h // 2 + 8), mask)
sh = sh.filter(ImageFilter.GaussianBlur(26))
card = Image.alpha_composite(card, sh)
card.paste(crest, (360 - cw // 2, 315 - target_h // 2), crest)
d = ImageDraw.Draw(card)

# ---- text helpers --------------------------------------------------------
def tracked(draw, xy, text, font, fill, track=0, anchor_left=True):
    x, y = xy
    if not anchor_left:
        w = sum(draw.textlength(ch, font=font) + track for ch in text) - track
        x -= w
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + track
    return x

def tracked_w(draw, text, font, track=0):
    return sum(draw.textlength(ch, font=font) + track for ch in text) - track

TX = 648            # left edge of the text column
d.line([(TX, 168), (TX, 462)], fill=GOLD_DEEP + (120,), width=1)
TX += 34

# eyebrow
fe = f(SERIF_R, 21)
tracked(d, (TX, 176), "THE ROYAL PORTAL", fe, GOLD + (225,), track=5.0)

# headline
fh = f(SERIF_B, 76)
tracked(d, (TX, 212), "KINGDOM", fh, PARCHMENT + (255,), track=2.5)
w846 = tracked(d, (TX, 300), "846", fh, GOLD_BRIGHT + (255,), track=2.5)

# gold rule under the headline
d.line([(TX, 398), (TX + 210, 398)], fill=GOLD + (210,), width=3)

# tagline
ft = f(SERIF_B, 31)
tracked(d, (TX, 424), "WE TAKE WHAT'S OURS", ft, PARCHMENT + (238,), track=1.6)

# motto
fm = f(SERIF_R, 23)
d.text((TX, 470), "One Crown. Four Alliances. Endless Glory.", font=fm, fill=PARCH_DIM + (205,))

# domain, bottom right
fd = f(SERIF_R, 20)
wdom = tracked_w(d, "KINGDOM846.COM", fd, 4.0)
tracked(d, (W - 74 - wdom, 546), "KINGDOM846.COM", fd, GOLD + (200,), track=4.0)

card.convert("RGB").save("public/assets/kingdom846-share.jpg", "JPEG", quality=92, optimize=True, progressive=True)
print("written")
