import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const manifest=JSON.parse(await readFile('scripts/assets/manifest.json','utf8')), report=[];
for(const a of manifest.assets){const file=`src/assets/simready-${a.role}.glb`,bytes=await readFile(file),doc=await io.read(file);let triangles=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;if(triangles>20000)throw Error(`${a.id} exceeds triangle budget`);report.push({id:a.id,file,bytes:bytes.length,triangles,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile('scripts/assets/optimized-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
