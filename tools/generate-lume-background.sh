#!/bin/sh
set -eu

if [ "$#" -lt 1 ] || [ "$#" -gt 3 ]; then
  printf 'Usage: %s "prompt" [output.png] [seed]\n' "$0" >&2
  exit 2
fi

prompt=$1
output=${2:-lume-background.png}
seed=${3:-$(date +%s)}
model=${LUME_FLUX_MODEL:-dhairyashil/FLUX.1-schnell-mflux-4bit}
generator=${MFLUX_GENERATE:-mflux-generate}

if ! command -v "$generator" >/dev/null 2>&1; then
  printf 'Could not find %s. Install MFLUX with `uv tool install --python 3.13 mflux`, or set MFLUX_GENERATE to its full path.\n' "$generator" >&2
  exit 127
fi

exec "$generator" \
  --model "$model" \
  --base-model schnell \
  --steps "${LUME_FLUX_STEPS:-4}" \
  --width "${LUME_FLUX_WIDTH:-768}" \
  --height "${LUME_FLUX_HEIGHT:-1360}" \
  --seed "$seed" \
  --prompt "$prompt" \
  --output "$output" \
  --no-exif
