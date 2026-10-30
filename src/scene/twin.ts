import * as T from 'three';
import {model,instanceWarehouse,animatedInstances} from './assets';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sites, routes, stations } from '../data/world';
import type { Snapshot, Status } from '../sim/types';
export type Selection={level:number;site:string;line:string;station:string};
const colors:Record<Status,number>={running:0x5ee7b0,warning:0xffc777,fault:0xff5f75,changeover:0x63b7ff,offline:0x657384};
const point=(lon:number,lat:number)=>new T.Vector3(lon/180*45,0,-lat/90*25);
export class TwinScene {
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera(44,1,.1,500);controls:OrbitControls;
 private root=new T.Group();private ray=new T.Raycaster();private pointer=new T.Vector2();private labels:{el:HTMLButtonElement;point:T.Vector3;offset:number[]}[]=[];private animations:((t:number)=>void)[]=[];
 private machines=new Map<string,{light:T.Mesh;body:T.Object3D}>();private pillars=new Map<string,T.Mesh>();private routeMaterials:T.LineBasicMaterial[]=[];private destination:T.Vector3|null=null;private focus:T.Vector3|null=null;private snapshot:Snapshot|null=null;private selection:Selection;private clock=new T.Clock();private frame=0;private low=false;
 constructor(private host:HTMLElement,private labelHost:HTMLElement,private onSelect:(s:Partial<Selection>)=>void,selection:Selection){
  this.selection=selection;this.renderer=new T.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;this.renderer.setClearColor(0x141d23);host.append(this.renderer.domElement);this.scene.fog=new T.FogExp2(0x141d23,.0015);const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.scene.environment=pmrem.fromScene(room,0,.1,100,{size:64}).texture;this.scene.environmentIntensity=.45;room.dispose();pmrem.dispose();
  this.scene.add(new T.HemisphereLight(0xf1f4f0,0x454843,.65));const sun=new T.DirectionalLight(0xfff4dd,2.4);sun.position.set(-18,35,20);sun.shadow.bias=-.00015;sun.shadow.normalBias=.025;sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-48,right:48,top:40,bottom:-40,near:.5,far:110});this.scene.add(sun);const fill=new T.DirectionalLight(0xc6d5e0,.3);fill.position.set(-20,8,-10);this.scene.add(fill);
  this.camera.position.set(12,67,55);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.maxPolarAngle=Math.PI/2.1;this.controls.minDistance=4;this.controls.maxDistance=150;this.controls.addEventListener('start',()=>{this.destination=null;this.focus=null;});this.scene.add(this.root);
  let start={x:0,y:0};this.renderer.domElement.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};});this.renderer.domElement.addEventListener('pointerup',e=>{if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)return;const b=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);for(const h of this.ray.intersectObjects(this.root.children,true)){if(h.instanceId!==undefined){const selection=h.object.userData.instanceSelections?.[h.instanceId];if(selection){this.onSelect(selection);return;}}let obj:T.Object3D|null=h.object;while(obj){if(obj.userData.select){this.onSelect(obj.userData.select);return;}obj=obj.parent;}}});
  new ResizeObserver(()=>this.resize()).observe(host);this.view(selection);this.resize();this.render();
 }
 private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 private mat(color:number){return new T.MeshStandardMaterial({color,metalness:.25,roughness:.6});}
 private box(w:number,h:number,d:number,color:number,x=0,y=0,z=0,parent:T.Object3D=this.root,rounded=false){const m=new T.Mesh(rounded?new RoundedBoxGeometry(w,h,d,2,.08):new T.BoxGeometry(w,h,d),this.mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 private line(points:T.Vector3[],color:number,opacity=1){const m=new T.LineBasicMaterial({color,transparent:true,opacity});const line=new T.Line(new T.BufferGeometry().setFromPoints(points),m);this.root.add(line);return line;}
 private label(text:string,sub:string,p:T.Vector3,select:Partial<Selection>,type=''){const el=document.createElement('button');el.className=`scene-label ${type}`;el.innerHTML=`<span>${text}</span><small>${sub}</small>`;el.addEventListener('click',()=>this.onSelect(select));this.labelHost.append(el);const offsets:Record<string,number[]>={'TW-HQ':[48,-12],'TH-01':[-48,12],'HUB-SG':[15,53],'HUB-LA':[-54,-12],'MX-01':[37,26]};this.labels.push({el,point:p,offset:this.selection.level===0?(offsets[select.site??'']??[0,0]):[0,0]});}
 view(s:Selection){this.host.dataset.cameraReady="false";this.frame=0;this.selection={...s};this.root.traverse(o=>{const mesh=o as T.Mesh;if(o instanceof T.InstancedMesh)o.dispose();if(mesh.userData.sharedAsset)return;mesh.geometry?.dispose();if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>m.dispose());});this.root.clear();this.labelHost.replaceChildren();this.labels=[];this.animations=[];this.machines.clear();this.pillars.clear();this.routeMaterials=[];
  if(s.level===0){this.world();this.destination=new T.Vector3(8,65,55);this.focus=new T.Vector3(0,0,-1);}else this.factory(s);instanceWarehouse(this.root);const assets=new Set<string>();this.root.traverse(o=>{if(o.userData.simreadyAsset)assets.add(o.userData.simreadyAsset);});this.host.dataset.simreadyAssets=[...assets].sort().join(',');const originals=new Set<string>();this.root.traverse(o=>{if(o.userData.asset)originals.add(o.userData.asset);});this.host.dataset.modelAssets=[...originals].sort().join(',');this.renderer.shadowMap.needsUpdate=true;if(this.snapshot)this.update(this.snapshot);
 }
 private world(){this.box(180,.15,95,0x0a1421,0,-.5,0).receiveShadow=false;const grid=new T.GridHelper(150,60,0x1c3547,0x122636);grid.position.y=-.38;this.root.add(grid);
  // Original schematic silhouettes; no map tiles or external geographic assets.
  const continents=[
   [[-168,66],[-146,70],[-130,58],[-125,48],[-117,32],[-104,23],[-87,17],[-80,8],[-77,9],[-87,25],[-81,29],[-81,37],[-67,46],[-55,53],[-65,62],[-90,70],[-120,72]],
   [[-80,9],[-66,8],[-50,-1],[-36,-7],[-42,-24],[-55,-36],[-67,-55],[-74,-42],[-75,-20],[-81,-3]],
   [[-18,35],[5,37],[24,32],[35,31],[51,12],[43,-5],[35,-18],[19,-35],[11,-25],[8,-5],[-7,5],[-17,18]],
   [[-11,36],[-9,52],[5,60],[20,70],[44,68],[70,76],[111,72],[142,62],[178,65],[170,51],[143,43],[132,33],[122,21],[110,20],[108,6],[101,2],[98,16],[88,22],[78,8],[70,22],[55,25],[43,38],[30,42],[19,39],[8,44]],
   [[112,-12],[135,-12],[153,-25],[146,-39],[127,-34],[114,-24]], [[-52,60],[-44,61],[-21,76],[-42,82],[-60,77]], [[130,32],[141,40],[144,44],[140,34]], [[47,-13],[50,-16],[48,-25],[44,-24]], [[95,5],[104,-3],[118,-8],[130,-5],[119,1],[111,3]]];
  for(const polygon of continents){const shape=new T.Shape();polygon.forEach(([lon,lat],i)=>{const p=point(lon,lat);if(!i)shape.moveTo(p.x,-p.z);else shape.lineTo(p.x,-p.z);});shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:false});geo.rotateX(-Math.PI/2);const mesh=new T.Mesh(geo,this.mat(0x1c3645));mesh.position.y=-.22;this.root.add(mesh);const edge=new T.LineSegments(new T.EdgesGeometry(geo,30),new T.LineBasicMaterial({color:0x366174,transparent:true,opacity:.7}));edge.position.y=-.21;this.root.add(edge);}
  for(const s of sites){const p=point(s.lon,s.lat),group=new T.Group();group.position.copy(p);group.userData.select={level:s.lines?1:0,site:s.id,line:`${s.id}/L1`,station:''};this.root.add(group);const ring=new T.Mesh(new T.RingGeometry(.65,.76,48),new T.MeshBasicMaterial({color:s.color,side:T.DoubleSide,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.y=.2;group.add(ring);const pillar=this.box(.38,2,.38,new T.Color(s.color).getHex(),0,1.2,0,group);this.pillars.set(s.id,pillar);const orb=new T.Mesh(new T.SphereGeometry(.3,16,16),new T.MeshBasicMaterial({color:s.color}));orb.position.y=3;group.add(orb);this.animations.push(t=>{ring.scale.setScalar(1+(.5+.5*Math.sin(t*1.5+s.lat))*.45);orb.position.y=pillar.scale.y*2+.5;});this.label(s.id,s.country,p.clone().add(new T.Vector3(0,4.4,0)),group.userData.select,s.lines?'':'hub');}
  routes.forEach((r,i)=>{const a=sites.find(s=>s.id===r.from)!,b=sites.find(s=>s.id===r.to)!;const p=point(a.lon,a.lat),q=point(b.lon,b.lat);p.y=q.y=.8;const mid=p.clone().lerp(q,.5);mid.y=4+p.distanceTo(q)*.13;const curve=new T.QuadraticBezierCurve3(p,mid,q);const line=this.line(curve.getPoints(70),r.mode==='Air'?0x5ee7cd:0x5e9ccd,.48);this.routeMaterials.push(line.material as T.LineBasicMaterial);const dots=new T.InstancedMesh(new T.SphereGeometry(.12,6,6),new T.MeshBasicMaterial({color:r.mode==='Air'?0x89ffe5:0x8ebfff}),18);this.root.add(dots);const dummy=new T.Object3D();this.animations.push(()=>{const t=this.snapshot?.ts??0;const affected=this.snapshot?.active.includes('fault')&&r.from==='TW-HQ';for(let j=0;j<18;j++){dummy.position.copy(curve.getPoint((t*.0006+j/(affected?18:9)+i*.12)%1));dummy.scale.setScalar(j<(affected?18:9)?1:0);dummy.updateMatrix();dots.setMatrixAt(j,dummy.matrix);}dots.instanceMatrix.needsUpdate=true;});});
 }
 private place(name:string,x:number,y:number,z:number,rotation=0,staticModel=true){const asset=model(name);if(!asset)throw new Error('Required scene model missing: '+name);asset.position.set(x,y,z);asset.rotation.y=rotation;asset.userData.staticModel=staticModel;this.root.add(asset);return asset;}
 private factory(s:Selection){
  const site=sites.find(x=>x.id===s.site)!;const single=s.level>=2,count=single?1:site.lines,centerZ=(count-1)*3.5,depth=Math.max(19,count*7+12);
  this.place(`kit-hall-${count}`,0,0,0);
  for(let i=0;i<count;i++){
   const id=single?s.line:`${s.site}/L${i+1}`,z=i*7-centerZ;
   for(let j=0;j<8;j++){
    this.machine(j,-14+j*4.25,z,id);
    if(j<7){const widths=[1.25,2.65,2.1,3.25,3.25,4.05,2.1,1.25],gap=4.25-(widths[j]+widths[j+1])/2;const transfer=this.place('kit-transfer',-14+j*4.25+widths[j]/2+gap/2,0,z);transfer.scale.x=gap/.85;}
   }
   this.label(`LINE ${id.split('/L')[1]}`,site.id,new T.Vector3(-17,.1,z),{level:2,site:s.site,line:id,station:''},'line');
   this.place('workbench',-10,0,z-2.8,Math.PI);
   this.place('service-cart',1,0,z-2.8);
   this.place('extinguisher',-17,0,z-1.5);
   const boards=animatedInstances('kit-pcb',32);this.root.add(boards.group);const dummy=new T.Object3D();
   this.animations.push(()=>{const l=this.snapshot?.lines.find(x=>x.id===id);for(let j=0;j<32;j++){const k=j%8,m=l?.machines[k];dummy.position.set(-14+k*4.25-(j<8?0:1+Math.floor(j/8)*.25),1.055,z);dummy.scale.setScalar((j<8?!!m?.unit:(m?.queue.length??0)>Math.floor(j/8)-1)?1:0);if(m?.unit&&j<8)dummy.position.x+=Math.max(0,Math.min(1,1-(m.busyUntil-(this.snapshot?.ts??0))/m.ct))*.7;dummy.updateMatrix();boards.setMatrixAt(j,dummy.matrix);}boards.commit();});
  }
  if(!single){
   for(const x of [-29,-24,24,29])this.storage(x,-centerZ);
   // Receiving and dispatch have distinct equipment and staging bays.
   for(let k=0;k<5;k++)this.place('loaded-pallet',-28+k*1.35,0,depth/2+.1);
   for(let k=0;k<3;k++)this.place('pallet',25,.21*k,depth/2+.1);
   this.place('pallet-jack',-25,0,depth/2-2,Math.PI/2);
   this.place('conveyor',26,0,depth/2-2,Math.PI/2);
   this.place('workbench',30,0,depth/2-2,Math.PI/2);
   for(const x of [-31,31])this.place('extinguisher',x,0,-depth/2+1);
  }
  // Forklift stays in the receiving aisle; AMRs use the marked production perimeter.
  for(let a=0;a<3;a++){
   const vehicle=this.place(a===0?'forklift':'kit-amr',0,0,0,0,false);
   vehicle.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
   this.animations.push(()=>{
    const t=(this.snapshot?.ts??0)*.055+a*21;
    if(a===0){const d=t%16;vehicle.position.set(-26+Math.min(d,16-d),0,depth/2-2.7);vehicle.rotation.y=d<8?Math.PI/2:-Math.PI/2;return;}
    const width=37.6,length=depth-3.6,d=t%(2*(width+length));let x=-18.8,z=-depth/2+1.8;
    if(d<width)x+=d;else if(d<width+length){x=18.8;z+=d-width;}else if(d<2*width+length){x=18.8-(d-width-length);z=depth/2-1.8;}else z=depth/2-1.8-(d-2*width-length);
    vehicle.position.set(x,0,z);vehicle.rotation.y=d<width?Math.PI/2:d<width+length?0:d<2*width+length?-Math.PI/2:Math.PI;
   });
  }
  if(s.level===3){const j=Number(s.station.split('/S')[1]??3),x=-14+j*4.25;this.destination=new T.Vector3(x+3.6,3.7,6);this.focus=new T.Vector3(x,1.15,0);this.label(stations[j],'LIVE TELEMETRY',new T.Vector3(x,2.9,0),{},'machine');}
  else{this.destination=single?new T.Vector3(5,17,25):new T.Vector3(32,42,50);this.focus=new T.Vector3(0,.6,0);}
 }
 private machine(j:number,x:number,z:number,line:string){const group=new T.Group();group.position.set(x,0,z);group.userData.select={level:3,site:this.selection.site,line,station:`${line}/S${j}`};this.root.add(group);const asset=model(`station-${j}`);if(asset){asset.userData.staticModel=true;group.add(asset);}const h=j===5?1.7:2.6;const body=this.box(.08,.4,.08,0x536775,1,h,0,group);const light=new T.Mesh(new T.CylinderGeometry(.1,.1,.2,12),new T.MeshBasicMaterial({color:colors.running}));light.position.set(1,h+.3,0);group.add(light);this.machines.set(`${line}/S${j}`,{light,body:asset??body});
 if(this.selection.level===2)this.label(stations[j],`STATION ${String(j+1).padStart(2,'0')}`,new T.Vector3(x,3.4,z),group.userData.select,'station');
 }
 focusWarehouse(side:number){const x=side*26,z=-((sites.find(s=>s.id===this.selection.site)?.lines??1)-1)*3.5;this.destination=new T.Vector3(x+side*9,12,z+17);this.focus=new T.Vector3(x,1,z);}
 private storage(x:number,z:number){for(let row=0;row<3;row++){const asset=model('warehouse-rack');if(asset){asset.userData.staticModel=true;asset.position.set(x,0,z-4+row*4);asset.rotation.y=Math.PI/2;this.root.add(asset);for(const shelf of [.65,2.13])for(const slot of [-1,1]){const cargo=model('loaded-pallet');if(cargo){cargo.userData.staticModel=true;cargo.position.set(x,shelf,z-4+row*4+slot);cargo.rotation.y=Math.PI/2;this.root.add(cargo);}}}}}
 update(s:Snapshot){this.snapshot=s;for(const site of s.sites){const p=this.pillars.get(site.id);if(p){p.scale.y=site.id.startsWith('HUB')?1:Math.max(.3,site.uph/180);(p.material as T.MeshStandardMaterial).color.setHex(s.lines.some(l=>l.site===site.id&&l.status==='fault')?colors.fault:site.oee<45?colors.warning:colors.running);}}for(const l of s.lines)for(const m of l.machines){const mesh=this.machines.get(m.id);if(mesh)(mesh.light.material as T.MeshBasicMaterial).color.setHex(colors[m.status]);}this.routeMaterials.forEach((m,i)=>m.color.setHex(s.active.includes('port')&&(routes[i].from==='HUB-SG'||routes[i].to==='HUB-SG')?0xffb85b:routes[i].mode==='Air'?0x5ee7cd:0x5e9ccd));}
 quality(low:boolean){this.low=low;this.host.dataset.quality=low?'low':'high';this.renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.25));this.renderer.shadowMap.enabled=!low;this.renderer.shadowMap.needsUpdate=true;this.scene.traverse(o=>{const ms=(o as T.Mesh).material;if(ms)(Array.isArray(ms)?ms:[ms]).forEach(m=>m.needsUpdate=true);});this.resize();}
 private render=()=>{requestAnimationFrame(this.render);const dt=this.clock.getDelta(),t=this.clock.elapsedTime,blend=1-Math.exp(-5*Math.min(dt,.5));if(this.destination&&this.focus){this.camera.position.lerp(this.destination,blend);this.controls.target.lerp(this.focus,blend);if(this.camera.position.distanceTo(this.destination)<.05){this.destination=null;this.focus=null;this.host.dataset.cameraReady="true";}}this.controls.update();this.animations.forEach(fn=>fn(t));this.renderer.render(this.scene,this.camera);for(const {el,point:p,offset} of this.labels){const v=p.clone().project(this.camera);el.style.transform=`translate(-50%,-100%) translate(${(v.x*.5+.5)*this.host.clientWidth+offset[0]}px,${(-v.y*.5+.5)*this.host.clientHeight+offset[1]}px)`;el.hidden=v.z>1||Math.abs(v.x)>1.15||Math.abs(v.y)>1.15;}if(++this.frame===2||this.frame%30===0){this.host.dataset.triangles=String(this.renderer.info.render.triangles);this.host.dataset.drawCalls=String(this.renderer.info.render.calls);this.host.dataset.quality=this.low?'low':'high';}};
 projectStation(){if(this.selection.level!==3)return null;const j=Number(this.selection.station.split('/S')[1]);const p=new T.Vector3(-14+j*4.25,2.5,0).project(this.camera);return {x:(p.x*.5+.5)*this.host.clientWidth,y:(-p.y*.5+.5)*this.host.clientHeight};}
}
