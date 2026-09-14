#!/usr/bin/env bash
# Assemble the promo from the recorded tour.
#
#   title card -> each screen, captioned -> title card
#
# The screen clips are the real site, recorded by tools/record-tour.mjs. The
# cards come from tools/make-intro-video.py. Nothing here is generated
# footage: a video model cannot render a real interface, so it is filmed.
#
# Captions are composited as PNG overlays rather than drawn with ffmpeg's
# drawtext -- the bundled ffmpeg is built without freetype, so drawtext does
# not exist. Pillow draws them instead, which also keeps the caption in the
# same typeface and gold as the rest of the brand.
set -euo pipefail
cd "$(dirname "$0")/.."

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
TOUR=dist-video/tour
WORK=dist-video/work
CAPS=$WORK/caps
OUT=dist-video/kingdom846-promo.mp4
CLIP=${CLIP_SECS:-7}
ORDER="home about alliances events timeline rankings guides battle-lab transfer"

rm -rf "$WORK"; mkdir -p "$CAPS"

python3 - "$CAPS" <<'PY'
import sys, os
from PIL import Image, ImageDraw, ImageFont
caps = sys.argv[1]
GOLD, PARCH = (212,175,55), (243,232,204)
F_B = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
LABELS = {
 'home':       ('The crown, and who holds it',       'Live kingdom status, and the countdown to the next rotation'),
 'about':      ('Standing, rating and every KvK',    'S-Tier - rating 3.115, tenth in the world'),
 'alliances':  ('Four alliances, one kingdom',       'Leadership, power, bear hunt and rally times'),
 'events':     ('Every event, with countdowns',      'Turn on reminders and your phone tells you first'),
 'timeline':   ('Every milestone since founding',    'Heroes, pets, Truegold, Masters and KvK firsts'),
 'rankings':   ('Commander rankings',                'Who is carrying the kingdom'),
 'guides':     ('Guides and playbooks',              'Bear hunts, combat, gear and KvK preparation'),
 'battle-lab': ('Battle Lab - the maths, done',      'Formations, bear traps, mystic trial, PvP'),
 'transfer':   ('Transfer windows',                  'When they open, and how to request a place'),
}
W, BAR = 1920, 190
for key, (title, sub) in LABELS.items():
    img = Image.new('RGBA', (W, BAR), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Soft-topped scrim so the caption sits on the footage without a hard edge.
    for y in range(BAR):
        a = int(215 * min(1.0, (y / 46) ** 0.8)) if y < 46 else 215
        d.line([(0,y),(W,y)], fill=(2,4,10,a))
    d.line([(0,0),(W,0)], fill=GOLD + (120,), width=2)
    ft = ImageFont.truetype(F_B, 52); fs = ImageFont.truetype(F_B, 27)
    def centred(text, font, y, fill, track):
        width = sum(d.textlength(c, font=font)+track for c in text) - track
        x = (W - width)/2
        for ch in text:
            d.text((x,y), ch, font=font, fill=fill)
            x += d.textlength(ch, font=font) + track
    centred(title, ft, 44, PARCH+(255,), 1.5)
    centred(sub.upper(), fs, 118, GOLD+(225,), 3.2)
    img.save(os.path.join(caps, f'{key}.png'))
print(f'  {len(LABELS)} captions drawn')
PY

for name in $ORDER; do
  src="$TOUR/$name.webm"
  [ -f "$src" ] || { echo "  skip $name"; continue; }
  # Trim the splash and settle off the head, hold CLIP seconds, fade the
  # caption in after the screen has had a moment to read, and fade the whole
  # shot at both ends so the cuts are not abrupt.
  "$FF" -y -loglevel error -ss 2.4 -t "$CLIP" -i "$src" -i "$CAPS/$name.png" \
    -filter_complex "\
[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,\
pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x02040A,setsar=1[v];\
[1:v]format=rgba,fade=t=in:st=0.5:d=0.6:alpha=1,fade=t=out:st=$(echo "$CLIP-0.7"|bc):d=0.5:alpha=1[c];\
[v][c]overlay=0:H-h:format=auto,\
fade=t=in:st=0:d=0.4,fade=t=out:st=$(echo "$CLIP-0.4"|bc):d=0.4,format=yuv420p[o]" \
    -map "[o]" -an -c:v libx264 -preset medium -crf 20 -r 30 "$WORK/$name.mp4"
  echo "  cut $name"
done

# Normalise the card to the same codec and frame rate so concat is seamless.
"$FF" -y -loglevel error -i dist-video/kingdom846-intro.mp4 \
  -vf "scale=1920:1080,setsar=1,format=yuv420p" -an \
  -c:v libx264 -preset medium -crf 20 -r 30 "$WORK/_card.mp4"

{ echo "file '$(pwd)/$WORK/_card.mp4'"
  for name in $ORDER; do
    [ -f "$WORK/$name.mp4" ] && echo "file '$(pwd)/$WORK/$name.mp4'"
  done
  echo "file '$(pwd)/$WORK/_card.mp4'"; } > "$WORK/final.txt"

"$FF" -y -loglevel error -f concat -safe 0 -i "$WORK/final.txt" \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -movflags +faststart "$OUT"

dur=$("$FF" -i "$OUT" 2>&1 | grep -oE 'Duration: [0-9:.]+' | head -1)
echo "$OUT  ($dur, $(du -h "$OUT" | cut -f1))"
