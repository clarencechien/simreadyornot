#!/usr/bin/env python3
"""Normalize approved GLBs; use a separately installed Blender for USD conversion."""
import pathlib,shutil,subprocess
root=pathlib.Path(__file__).parent;out=root/'converted';out.mkdir(exist_ok=True)
for src in (root/'raw').glob('*'):
    if src.suffix=='.glb':shutil.copy2(src,out/src.name)
    elif src.suffix in ('.usd','.usda','.usdc'):
        raise SystemExit(f'{src.name}: USD conversion requires a validated Blender USD importer; no unverified conversion performed')
    else:raise SystemExit(f'Unsupported format: {src.name}')
print('GLB normalization complete. No USD converter or assets required for procedural-v1.')
