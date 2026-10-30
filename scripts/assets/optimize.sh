#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
shopt -s nullglob
files=(scripts/assets/converted/*.glb)
if ((${#files[@]}==0)); then echo 'No approved external GLBs; procedural-v1 needs no model downloads.'; exit 0; fi
command -v gltf-transform >/dev/null || { echo 'Install @gltf-transform/cli and its supported texture dependencies first.' >&2; exit 1; }
mkdir -p public/assets
for src in "${files[@]}"; do
  gltf-transform optimize "$src" "public/assets/$(basename "$src")" --compress meshopt --texture-compress webp --texture-size 1024 --simplify-ratio 0.25
  gltf-transform inspect "public/assets/$(basename "$src")"
done
# Inspect output triangle counts before approval; 20k per external asset is the acceptance target.
