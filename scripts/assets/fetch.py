#!/usr/bin/env python3
"""Fetch only approved assets, verifying HTTPS and pinned SHA-256 digests."""
import hashlib,json,pathlib,urllib.request
root=pathlib.Path(__file__).parent
manifest=json.loads((root/'manifest.json').read_text())
for item in manifest['assets']:
    if not item.get('approved'):raise SystemExit(f"Asset needs approval: {item['id']}")
    if item.get('license') not in ('CC0','CC-BY-4.0'):raise SystemExit('Unsupported or unverified license')
    if not item['url'].startswith('https://') or len(item.get('sha256',''))!=64:raise SystemExit('HTTPS URL and pinned SHA-256 required')
    name=pathlib.Path(item['filename'])
    if name.name!=str(name):raise SystemExit('Use flat filenames')
    dest=root/'raw'/name;dest.parent.mkdir(exist_ok=True)
    data=dest.read_bytes() if dest.exists() else urllib.request.urlopen(item['url'],timeout=120).read()
    if hashlib.sha256(data).hexdigest()!=item['sha256']:raise SystemExit(f'Checksum mismatch: {name}')
    dest.write_bytes(data)
print(f"Verified {len(manifest['assets'])} approved external assets")
