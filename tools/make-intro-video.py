"""Kingdom 846 title card, rendered as video.

Five seconds, 1920x1080, H.264. Meant to be cut onto the front or the end of
a screen recording of the portal: the crest rises out of the dark, the light
comes up behind it, the wordmark and the address settle underneath.

Everything is drawn from the repo's own assets and palette -- the same crest
and the same gold as the share card -- so the clip, the card and the site all
look like one thing.

  python3 tools/make-intro-video.py            # 16:9, for the web
  python3 tools/make-intro-video.py --vertical # 9:16, for phone shares

Output: dist-video/kingdom846-intro.mp4
"""
import math, os, random, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import imageio_ffmpeg

VERTICAL = '--vertical' in sys.argv
W, H = (1080, 1920) if VERTICAL else (1920, 1080)
FPS, SECONDS = 30, 5
TOTAL = FPS * SECONDS

GOLD, GOLD_BR, GOLD_DEEP = (212,175,55), (232,199,102), (156,122,36)
PARCHMENT = (243,232,204)
SERIF_B = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SERIF_R = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"

OUT_DIR = os.path.join(os.getcwd(), 'dist-video')
os.makedirs(OUT_DIR, exist_ok=True)

crest_src = Image.open('public/assets/crest-846.png').convert('RGBA')

def ease_out(t):  return 1 - pow(1 - t, 3)
def ease_in_out(t): return 4*t*t*t if t < .5 else 1 - pow(-2*t+2, 3)/2
def clamp01(x): return max(0.0, min(1.0, x))
def seg(f, a, b):
    """Progress through the window between second a and second b."""
    return clamp01((f/FPS - a) / (b - a))

# Grain, generated once: regenerating per frame makes the noise crawl.
random.seed(846)
grain = Image.new('L', (W, H))
grain.putdata([random.gauss(128, 6) for _ in range(W*H)])

def gold_leaf(size):
    w, h = size
    stops = [(0.00,(120,88,24)),(0.20,(198,158,58)),(0.38,(245,222,140)),
             (0.48,(255,248,214)),(0.60,(214,176,62)),(0.82,(140,104,30)),(1.00,(226,198,126))]
    col = Image.new('RGB',(1,h)); px = col.load()
    for y in range(h):
        t = y/max(h-1,1)
        for i in range(len(stops)-1):
            a,ca = stops[i]; b,cb = stops[i+1]
            if a <= t <= b:
                k=(t-a)/(b-a); px[0,y]=tuple(int(ca[j]+(cb[j]-ca[j])*k) for j in range(3)); break
    return col.resize((w,h), Image.BICUBIC)

def stamp_gold(base, text, font, cx, y, track, alpha):
    """Centred gold-leaf text at the given opacity."""
    if alpha <= 2: return
    d0 = ImageDraw.Draw(base)
    width = sum(d0.textlength(c, font=font)+track for c in text) - track
    asc, desc = font.getmetrics()
    mask = Image.new('L', (int(width)+8, asc+desc+10), 0)
    md = ImageDraw.Draw(mask); x = 0.0
    for ch in text:
        md.text((x,0), ch, font=font, fill=255)
        x += md.textlength(ch, font=font) + track
    mask = mask.point(lambda v: int(v*alpha/255))
    leaf = gold_leaf(mask.size)
    pos = (int(cx-width/2), int(y))
    halo = Image.new('RGBA', base.size, (0,0,0,0))
    halo.paste(Image.new('RGBA', mask.size, GOLD+(255,)), pos, mask.point(lambda v:int(v*.45)))
    base.alpha_composite(halo.filter(ImageFilter.GaussianBlur(14)))
    base.paste(leaf, pos, mask)

def stamp_flat(base, text, font, cx, y, track, colour, alpha):
    if alpha <= 2: return
    d0 = ImageDraw.Draw(base)
    width = sum(d0.textlength(c, font=font)+track for c in text) - track
    layer = Image.new('RGBA', base.size, (0,0,0,0))
    ld = ImageDraw.Draw(layer); x = cx - width/2
    for ch in text:
        ld.text((x,y), ch, font=font, fill=colour+(int(alpha),))
        x += ld.textlength(ch, font=font) + track
    base.alpha_composite(layer)

CREST_H = int(H * (0.40 if VERTICAL else 0.46))
cw = int(crest_src.width * CREST_H / crest_src.height)
crest = crest_src.resize((cw, CREST_H), Image.LANCZOS)
CREST_CY = int(H * (0.40 if VERTICAL else 0.42))

f_title = ImageFont.truetype(SERIF_B, int(H * (0.055 if VERTICAL else 0.072)))
f_url   = ImageFont.truetype(SERIF_R, int(H * (0.024 if VERTICAL else 0.030)))

frames_dir = os.path.join(OUT_DIR, 'frames')
os.makedirs(frames_dir, exist_ok=True)
for old in os.listdir(frames_dir):
    os.remove(os.path.join(frames_dir, old))

for f in range(TOTAL):
    # The light comes up first, and keeps rising -- the whole clip brightens
    # slightly so it never feels static.
    lift = ease_out(seg(f, 0.0, 2.6))
    base_top = tuple(int(c) for c in (4 + 16*lift, 9 + 30*lift, 18 + 56*lift))
    bg = Image.new('RGB', (W, H), (2,4,10))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = (y/(H-1)) ** 0.85
        d.line([(0,y),(W,y)], fill=tuple(int(base_top[i]+((2,4,10)[i]-base_top[i])*t) for i in range(3)))

    # Pool of warm light behind the crest, opening as the crest arrives.
    glow = Image.new('L',(W,H),0); gd = ImageDraw.Draw(glow)
    r = int(min(W,H) * (0.18 + 0.30*lift))
    for i in range(r, 0, -4):
        gd.ellipse([W//2-i, CREST_CY-int(i*.94), W//2+i, CREST_CY+int(i*.94)],
                   fill=int(150*(1-i/r)**1.5))
    glow = glow.filter(ImageFilter.GaussianBlur(int(min(W,H)*0.05)))
    bg = Image.composite(Image.new('RGB',(W,H),(150,116,40)), bg,
                         glow.point(lambda v: int(v*0.62*lift)))

    vig = Image.new('L',(W,H),0)
    ImageDraw.Draw(vig).ellipse([-W*.08,-H*.20,W*1.08,H*1.20], fill=255)
    bg = Image.composite(bg, Image.new('RGB',(W,H),(1,3,8)),
                         vig.filter(ImageFilter.GaussianBlur(int(min(W,H)*0.11))))
    bg = ImageChops.overlay(bg, Image.merge('RGB',(grain,)*3))
    frame = bg.convert('RGBA')

    # Crest: rises, settles, and drifts a breath closer for the rest of the clip.
    cp = ease_out(seg(f, 0.15, 2.15))
    if cp > 0:
        scale = (0.88 + 0.12*cp) * (1 + 0.012*ease_in_out(seg(f, 2.15, 5.0)))
        rise  = int((1-cp) * H * 0.055)
        cwi, chi = max(1,int(cw*scale)), max(1,int(CREST_H*scale))
        c = crest.resize((cwi, chi), Image.LANCZOS)
        if cp < 1:
            a = c.split()[3].point(lambda v: int(v*cp))
            c.putalpha(a)
        pos = (W//2 - cwi//2, CREST_CY - chi//2 + rise)
        bloom = Image.new('RGBA',(W,H),(0,0,0,0))
        bloom.paste(Image.new('RGBA', c.size, (190,148,52,255)),
                    (pos[0], pos[1]+6), c.split()[3].point(lambda v:int(v*0.5*cp)))
        frame.alpha_composite(bloom.filter(ImageFilter.GaussianBlur(int(min(W,H)*0.028))))
        frame.alpha_composite(c, pos)

    ty = CREST_CY + int(CREST_H*0.60)
    stamp_gold(frame, 'KINGDOM 846', f_title, W//2, ty,
               track=H*0.006, alpha=255*ease_out(seg(f, 2.0, 3.2)))

    ua = 255*ease_out(seg(f, 2.9, 4.1))
    stamp_flat(frame, "WE TAKE WHAT'S OURS", f_url, W//2, ty + int(H*0.120),
               H*0.004, PARCHMENT, ua*0.92)
    stamp_flat(frame, 'KINGDOM846.COM', f_url, W//2, ty + int(H*0.168),
               H*0.006, GOLD, 255*ease_out(seg(f, 3.4, 4.6)))

    # Gold rule drawing outward from the centre, under the wordmark.
    rp = ease_out(seg(f, 2.6, 3.8))
    if rp > 0:
        half = int(W*0.11*rp)
        ImageDraw.Draw(frame).line(
            [(W//2-half, ty+int(H*0.098)), (W//2+half, ty+int(H*0.098))],
            fill=GOLD+(int(210*rp),), width=max(2,int(H*0.0028)))

    frame.convert('RGB').save(os.path.join(frames_dir, f'f{f:04d}.png'))

exe = imageio_ffmpeg.get_ffmpeg_exe()
out = os.path.join(OUT_DIR, f"kingdom846-intro{'-vertical' if VERTICAL else ''}.mp4")
subprocess.run([exe, '-y', '-loglevel', 'error', '-framerate', str(FPS),
                '-i', os.path.join(frames_dir, 'f%04d.png'),
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
                '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], check=True)
for old in os.listdir(frames_dir):
    os.remove(os.path.join(frames_dir, old))
os.rmdir(frames_dir)
print(f'{out}  ({W}x{H}, {SECONDS}s, {os.path.getsize(out)//1024} KB)')
