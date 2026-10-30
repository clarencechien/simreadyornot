#!/usr/bin/env python3
"""Compress the authored Blender kit while preserving all geometry detail."""
import pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[2]
for p in sorted((root/'src/assets').glob('*.glb')):
 if not p.name.startswith(('kit-','station-')):continue
 subprocess.run([str(root/'node_modules/.bin/gltf-transform'),'optimize',str(p),str(p),'--compress','meshopt','--simplify','false','--texture-compress','webp'],check=True,cwd=root)
