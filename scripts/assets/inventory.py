#!/usr/bin/env python3
"""Fetch complete upstream metadata without downloading models. Preserve source files."""
import argparse, json, pathlib, urllib.request
BASE='https://huggingface.co/datasets/codepawl/simready-glb/resolve/main/'
TERMS=('pallet','rack','cart','crate','box','tool','workbench','safety','light','warehouse','factory','logistic','tray','bin','conveyor','forklift')
def main():
    p=argparse.ArgumentParser();p.add_argument('--output',default='asset-inventory.md');args=p.parse_args()
    cache=pathlib.Path('.cache/asset-inventory');cache.mkdir(parents=True,exist_ok=True)
    results=[]
    for source in ['thumbs/metadata.jsonl','manifest.jsonl']:
        data=urllib.request.urlopen(BASE+source,timeout=90).read()
        (cache/source.replace('/','-')).write_bytes(data)
        for number,line in enumerate(data.decode().splitlines(),1):
            if not line.strip():continue
            row=json.loads(line)
            if any(t in json.dumps(row).lower() for t in TERMS):results.append((source,number,row))
    text=['# SimReady asset inventory','',f'Complete source files read; {len(results)} matching metadata records. Models have not been approved or downloaded.','']
    for source,number,row in results:
        title=str(row.get('name',row.get('id',row.get('path',f'record {number}'))))
        text += [f'## {title}',f'Source: `{source}:{number}`','```json',json.dumps(row,ensure_ascii=False,indent=2),'```','']
        thumb=row.get('thumbnail',row.get('thumbnail_url',row.get('thumb')))
        if thumb:text += [f'![{title}]({thumb if str(thumb).startswith("https://") else BASE+str(thumb)})','']
    pathlib.Path(args.output).write_text('\n'.join(text))
if __name__=='__main__':main()
