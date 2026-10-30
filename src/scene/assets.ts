import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import * as T from 'three';
const urls=import.meta.glob(['../assets/station-*.glb','../assets/simready-*.glb','../assets/kit-*.glb'],{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const models=new Map<string,T.Group>();
export async function loadModels(){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 await Promise.all(Object.entries(urls).map(async([path,url])=>{
  const gltf=await loader.loadAsync(url),name=path.split('/').pop()!.replace('.glb','');
  if(name.startsWith('simready-')){gltf.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(gltf.scene),center=bounds.getCenter(new T.Vector3());gltf.scene.position.set(-center.x,-bounds.min.y,-center.z);}
  // A wrapper preserves source-origin corrections when the instance is positioned.
  const source=new T.Group();source.add(gltf.scene);models.set(name,source);
 }));
}
export function model(name:string){
 const external=models.has('simready-'+name),source=models.get('simready-'+name)??models.get(name);if(!source)return null;
 const copy=source.clone(true);copy.userData.asset=name;if(external)copy.userData.simreadyAsset=name;
 copy.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;o.userData.sharedAsset=true;}});return copy;
}
/** Shared static geometry is instanced by material. Preserve station selection per instance. */
export function instanceWarehouse(root:T.Group){
 root.updateMatrixWorld(true);
 const batches=new Map<string,{geometry:T.BufferGeometry;material:T.Material|T.Material[];meshes:T.Mesh[];matrices:T.Matrix4[];selections:unknown[]}>();
 root.traverse(o=>{
  if(!o.userData.staticModel)return;
  o.traverse(child=>{if(!(child instanceof T.Mesh))return;
   const key=child.geometry.uuid+':'+(Array.isArray(child.material)?child.material.map(m=>m.uuid).join(','):child.material.uuid);
   let b=batches.get(key);if(!b){b={geometry:child.geometry,material:child.material,meshes:[],matrices:[],selections:[]};batches.set(key,b);}
   b.meshes.push(child);b.matrices.push(child.matrixWorld.clone());b.selections.push(o.userData.select??o.parent?.userData.select);
  });
 });
 for(const b of batches.values()){
  if(b.matrices.length<2)continue;
  const mesh=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);
  b.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));b.meshes.forEach(m=>m.visible=false);
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.sharedAsset=true;mesh.userData.instanceSelections=b.selections;root.add(mesh);
 }
}
export function animatedInstances(name:string,count:number){
 const source=model(name);if(!source)throw new Error('Missing model: '+name);source.updateMatrixWorld(true);
 const group=new T.Group(),parts:{mesh:T.InstancedMesh;local:T.Matrix4}[]=[];
 source.traverse(o=>{if(o instanceof T.Mesh){const mesh=new T.InstancedMesh(o.geometry,o.material,count);mesh.userData.sharedAsset=true;mesh.frustumCulled=false;group.add(mesh);parts.push({mesh,local:o.matrixWorld.clone()});}});
 group.userData.asset=name;const matrix=new T.Matrix4();
 return {group,setMatrixAt(i:number,m:T.Matrix4){for(const p of parts)p.mesh.setMatrixAt(i,matrix.multiplyMatrices(m,p.local));},commit(){for(const p of parts)p.mesh.instanceMatrix.needsUpdate=true;}};
}
