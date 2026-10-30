#!/usr/bin/env python3
"""Use checksum-verified upstream GLBs to build the selected browser assets."""
import json,pathlib,subprocess,hashlib,sys
root=pathlib.Path(__file__).resolve().parents[2]
m=json.loads((root/'scripts/assets/manifest.json').read_text())
for a in m['assets']:
 if len(sys.argv)>1 and a['role'] not in sys.argv[1:]:continue
 raw=root/'scripts/assets/raw'/a['filename']
 if hashlib.sha256(raw.read_bytes()).hexdigest()!=a['sha256']:raise SystemExit('Checksum mismatch: '+a['id'])
 out=root/'src/assets'/('simready-'+a['role']+'.glb')
 ratio=a.get('simplify_ratio',1 if a['role']=='pallet' else .04 if a['role']=='forklift' else .05 if a['role']=='loaded-pallet' else .2)
 subprocess.run([str(root/'node_modules/.bin/gltf-transform'),'optimize',str(raw),str(out),'--compress','meshopt','--texture-compress','webp','--texture-size','512','--simplify-ratio',str(ratio),'--simplify-error','.01'],check=True,cwd=root)
 print(a['id'],out.stat().st_size,flush=True)
