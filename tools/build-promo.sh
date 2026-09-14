#!/usr/bin/env bash
# Cut the recorded tour into the promo.
#
#   title card -> each screen, captioned -> title card
#
# Reads dist-video/tour/segments.json, which record-tour.mjs wrote with the
# exact second each screen began, so the cut never has to guess where the
# footage is.
#
# Captions are drawn with Pillow and composited as PNG overlays: the bundled
# ffmpeg is built without freetype, so drawtext does not exist in it.
#
# The caption input needs -loop 1 and its own -t. A PNG is one frame, so
# without it the caption appears for a thirtieth of a second and is gone --
# which looks exactly like the overlay silently failing.
set -euo pipefail
cd "$(dirname "$0")/.."

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
TOUR=dist-video/tour
WORK=dist-video/work
OUT=dist-video/kingdom846-promo.mp4
PER=${PER_SCREEN:-15}      # seconds held on each screen
LEAD=${LEAD:-2}            # skip into the segment before cutting

# Guides and transfer are left out: with no synced content in the local
# database they render empty, and an empty page is worse than a missing one.
SCREENS="home about alliances events timeline rankings battle-lab"

rm -rf "$WORK"; mkdir -p "$WORK/caps"

python3 - "$WORK/caps" <<'PY'
import sys, os
from PIL import Image, ImageDraw, ImageFont
caps = sys.argv[1]
GOLD, PARCH = (212,175,55), (243,232,204)
F = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
LABELS = {
 'home':       ('The crown, and who holds it',    'Live kingdom status, and the countdown to the next rotation'),
 'about':      ('Every KvK, and where we stand',  'S-Tier  -  rating 3.115, tenth in the world'),
 'alliances':  ('Four alliances, one kingdom',    'Leadership, power, bear hunt and rally times'),
 'events':     ('Every event, with countdowns',   'Switch on reminders and your phone tells you first'),
 'timeline':   ('Every milestone since founding', 'Heroes, pets, Truegold, Masters and KvK firsts'),
 'rankings':   ('Commander rankings',             'Who is carrying the kingdom'),
 'battle-lab': ('Battle Lab  -  the maths, done', 'Bear, mystic trial, PvP and formations'),
}
W, BAR = 1920, 200
for key,(title,sub) in LABELS.items():
    img = Image.new('RGBA', (W, BAR), (0,0,0,0)); d = ImageDraw.Draw(img)
    for y in range(BAR):
        a = int(220 * min(1.0, (y/52)**0.8)) if y < 52 else 220
        d.line([(0,y),(W,y)], fill=(2,4,10,a))
    d.line([(0,0),(W,0)], fill=GOLD+(130,), width=2)
    ft, fs = ImageFont.truetype(F,54), ImageFont.truetype(F,27)
    def centred(t,f,y,fill,tr):
        w = sum(d.textlength(c,font=f)+tr for c in t)-tr; x=(W-w)/2
        for ch in t: d.text((x,y),ch,font=f,fill=fill); x += d.textlength(ch,font=f)+tr
    centred(title, ft, 48, PARCH+(255,), 1.5)
    centred(sub.upper(), fs, 126, GOLD+(228,), 3.0)
    img.save(os.path.join(caps, f'{key}.png'))
print(f'  {len(LABELS)} captions')
PY

for name in $SCREENS; do
  start=$(python3 -c "import json,sys;d={s['name']:s for s in json.load(open('$TOUR/segments.json'))};print(d['$name']['start'])" 2>/dev/null || echo "")
  [ -n "$start" ] || { echo "  skip $name"; continue; }
  ss=$(python3 -c "print(round($start + $LEAD, 2))")
  "$FF" -y -loglevel error -ss "$ss" -t "$PER" -i "$TOUR/tour.webm" \
    -loop 1 -framerate 30 -t "$PER" -i "$WORK/caps/$name.png" \
    -filter_complex "\
[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x02040A,setsar=1[v];\
[1:v]format=rgba,fade=t=in:st=0.6:d=0.7:alpha=1,fade=t=out:st=$(python3 -c "print($PER-1.1)"):d=0.6:alpha=1[c];\
[v][c]overlay=0:H-h:format=auto,fade=t=in:st=0:d=0.45,fade=t=out:st=$(python3 -c "print($PER-0.45)"):d=0.45,format=yuv420p[o]" \
    -map "[o]" -an -c:v libx264 -preset medium -crf 20 -r 30 "$WORK/$name.mp4"
  echo "  cut $name  (from ${ss}s)"
done

"$FF" -y -loglevel error -i dist-video/kingdom846-intro.mp4 \
  -vf "scale=1920:1080,setsar=1,format=yuv420p" -an -c:v libx264 -preset medium -crf 20 -r 30 "$WORK/_card.mp4"

{ echo "file '$(pwd)/$WORK/_card.mp4'"
  for n in $SCREENS; do [ -f "$WORK/$n.mp4" ] && echo "file '$(pwd)/$WORK/$n.mp4'"; done
  echo "file '$(pwd)/$WORK/_card.mp4'"; } > "$WORK/final.txt"

"$FF" -y -loglevel error -f concat -safe 0 -i "$WORK/final.txt" \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -movflags +faststart "$OUT"

echo "$OUT  ($("$FF" -i "$OUT" 2>&1 | grep -oE 'Duration: [0-9:.]+' | head -1), $(du -h "$OUT" | cut -f1))"
