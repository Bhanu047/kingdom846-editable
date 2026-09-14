#!/usr/bin/env bash
# Assemble the promo from the recorded tour.
#
#   intro card -> each screen, labelled -> outro card
#
# The screen clips are the real site, recorded by tools/record-tour.mjs. The
# cards come from tools/make-intro-video.py. Nothing here is generated footage:
# a video model cannot render a real interface, so the interface is filmed.
set -euo pipefail
cd "$(dirname "$0")/.."

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
TOUR=dist-video/tour
WORK=dist-video/work
OUT=dist-video/kingdom846-promo.mp4
FONT=/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf
CLIP_SECS=${CLIP_SECS:-7}

mkdir -p "$WORK"; rm -f "$WORK"/*.mp4 "$WORK"/list.txt

label_for() {
  case "$1" in
    home)       echo "The crown, and who holds it" ;;
    about)      echo "Standing, rating and every KvK" ;;
    alliances)  echo "Four alliances, one kingdom" ;;
    events)     echo "Every event, with countdowns" ;;
    timeline)   echo "Every milestone since founding" ;;
    rankings)   echo "Commander rankings" ;;
    guides)     echo "Guides and playbooks" ;;
    battle-lab) echo "Battle Lab — the maths, done" ;;
    transfer)   echo "Transfer windows" ;;
    *)          echo "" ;;
  esac
}

# Screens in tour order, not alphabetical.
ORDER="home about alliances events timeline rankings guides battle-lab transfer"

for name in $ORDER; do
  src="$TOUR/$name.webm"
  [ -f "$src" ] || { echo "skip $name (not recorded)"; continue; }
  text=$(label_for "$name")
  # Trim the dead air at the head (splash + settle), hold CLIP_SECS, and fade
  # a lower-third label in and out over the clip.
  "$FF" -y -loglevel error -ss 2.2 -t "$CLIP_SECS" -i "$src" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,\
pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x02040A,\
drawbox=x=0:y=ih-170:w=iw:h=170:color=0x02040A@0.72:t=fill:enable='between(t,0.4,${CLIP_SECS})',\
drawtext=fontfile=${FONT}:text='${text}':fontcolor=0xF3E8CC:fontsize=46:\
x=(w-text_w)/2:y=h-118:alpha='if(lt(t,0.4),0,if(lt(t,1.0),(t-0.4)/0.6,if(lt(t,${CLIP_SECS}-0.5),1,0)))',\
fade=t=in:st=0:d=0.35,fade=t=out:st=$(echo "$CLIP_SECS-0.35"|bc):d=0.35,\
format=yuv420p" \
    -an -c:v libx264 -preset medium -crf 20 -r 30 "$WORK/$name.mp4"
  echo "file '$(pwd)/$WORK/$name.mp4'" >> "$WORK/list.txt"
  echo "  cut $name"
done

# Normalise the cards to the same codec/rate so concat does not re-encode badly.
for card in kingdom846-intro; do
  "$FF" -y -loglevel error -i "dist-video/$card.mp4" \
    -vf "scale=1920:1080,format=yuv420p" -an -c:v libx264 -preset medium -crf 20 -r 30 \
    "$WORK/_$card.mp4"
done

{ echo "file '$(pwd)/$WORK/_kingdom846-intro.mp4'"
  cat "$WORK/list.txt"
  echo "file '$(pwd)/$WORK/_kingdom846-intro.mp4'"; } > "$WORK/final.txt"

"$FF" -y -loglevel error -f concat -safe 0 -i "$WORK/final.txt" \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -movflags +faststart "$OUT"

dur=$("$FF" -i "$OUT" 2>&1 | grep -oE 'Duration: [0-9:.]+' | head -1)
echo "$OUT  ($dur, $(du -h "$OUT" | cut -f1))"
