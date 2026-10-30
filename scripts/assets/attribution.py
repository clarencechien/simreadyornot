#!/usr/bin/env python3
import json,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
m=json.loads((root/'scripts/assets/manifest.json').read_text())
credits=m['attribution']+[{k:a[k] for k in ('name','author','license','source','license_url','modifications')} for a in m['assets'] if a.get('approved') and a.get('status') == 'included']
(root/'public/ATTRIBUTION.json').write_text(json.dumps(credits,ensure_ascii=False,indent=2)+'\n')
print(f'{len(credits)} attribution records written')
