import { sites, stations, routes, skus } from '../data/world';
import type { Snapshot, SimEvent, Line, Sample } from './types';
type Action = {at:number;order:number;type:'feed'|'finish'|'sample'|'ship'|'arrive'|'agv';line?:string;station?:number;shipment?:number;agv?:number;phase?:number};
export class Simulation {
 state:Snapshot; private rng:number; private results=new Map<string,{ts:number;pass:boolean}[]>(); private completed=new Map<string,number[]>(); private queue:Action[]=[]; private order=0; private unit=0; private shipment=0; private cycle=[8,22,12,29,27,36,15,8];
 constructor(seed=42){
  this.rng=seed>>>0; this.state={seed,ts:0,lines:[],sites:sites.map(s=>({id:s.id,inventory:s.lines?3200:6400,agv:0,completed:0,oee:0,uph:0,fpy:100,history:[]})),shipments:[],events:[],active:[],history:[],total:0,failed:0,otd:98.4,airCost:1240,demand:1};
  for(const s of sites.filter(s=>s.lines))for(let i=1;i<=s.lines;i++){
   const id=`${s.id}/L${i}`;const sku=s.id==='TW-HQ'?skus[(i-1)*2].id:s.id==='TH-01'?skus[(i-1)%2].id:skus[(i-1)*2].id;
   this.state.lines.push({id,site:s.id,sku,status:'running',machines:stations.map((name,j)=>({id:`${id}/S${j}`,name,status:'running',ct:this.cycle[j],processed:0,failed:0,busyUntil:0,unit:null,queue:[],alarm:null,spc:[]})),completed:0,failed:0,history:[],metrics:this.empty(),faultUntil:0,npiUntil:0});
   this.schedule({at:i*2,type:'feed',line:id});
  }
  this.schedule({at:0,type:'sample'});this.schedule({at:120,type:'ship'});this.schedule({at:5,type:'agv',agv:0,phase:0});
  routes.forEach((r,i)=>{const eta=(i+1)*170; const sh={id:++this.shipment,...r,qty:180,sku:'SRV-MB',depart:-r.days*86400+eta,eta,plannedEta:eta};this.state.shipments.push(sh);this.schedule({at:eta,type:'arrive',shipment:sh.id});});
  this.advance(0);
 }
 private random(){this.rng+=0x6D2B79F5;let t=this.rng;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
 private empty():Sample{return {ts:this.state.ts,uph:0,fpy:100,oee:0,ct:0,inventory:0,agv:0,transit:0,otd:98.4,eta:0};}
 private schedule(a:Omit<Action,'order'>){const v={...a,order:this.order++}; let lo=0,hi=this.queue.length;while(lo<hi){const m=(lo+hi)>>>1;if(this.queue[m].at<v.at||this.queue[m].at===v.at&&this.queue[m].order<v.order)lo=m+1;else hi=m;}this.queue.splice(lo,0,v);}
 private emit(e:SimEvent){this.state.events.push(e);if(this.state.events.length>100)this.state.events.shift();}
 advance(seconds:number){const target=this.state.ts+Math.max(0,seconds);let a:Action|undefined;while(this.queue[0]?.at<=target){a=this.queue.shift()!;this.state.ts=a.at;this.execute(a);}this.state.ts=target;return this.snapshot();}
 snapshot():Snapshot{return structuredClone(this.state);}
 private start(line:Line,j:number){const m=line.machines[j];if(m.unit||!m.queue.length||m.status==='fault'||m.status==='changeover')return;
  m.unit=m.queue.shift()!;const ct=this.cycle[j]*(0.9+this.random()*.2)/(this.state.demand>1?1.18:1);m.ct=ct;m.busyUntil=this.state.ts+ct;
  this.emit({type:'WorkStarted',ts:this.state.ts,site:line.site,line:line.id,station:m.id,unitId:m.unit,sku:line.sku});this.schedule({at:m.busyUntil,type:'finish',line:line.id,station:j});
 }
 private execute(a:Action){const s=this.state;const line=s.lines.find(l=>l.id===a.line);
  if(a.type==='feed'&&line){const site=s.sites.find(x=>x.id===line.site)!; if(site.inventory>0&&line.machines[0].queue.length<8){site.inventory--;line.machines[0].queue.push(`PCB-${++this.unit}`);this.start(line,0);}this.schedule({at:s.ts+38/(s.demand>1?1.22:1),type:'feed',line:line.id});}
  if(a.type==='finish'&&line){const j=a.station!,m=line.machines[j];if(m.status==='fault'||m.status==='changeover'){this.schedule({at:Math.max(line.faultUntil,line.npiUntil,s.ts+1),type:'finish',line:line.id,station:j});return;}const unitId=m.unit;if(!unitId)return;
   const ramp=line.npiUntil>0?Math.max(0,1-(s.ts-line.npiUntil)/1800):0;const pass=j!==6||this.random()>(.018+.12*ramp);if(j===6){const r=this.results.get(line.id)??[];r.push({ts:s.ts,pass});this.results.set(line.id,r);}m.processed++;if(!pass)m.failed++;m.spc.push(m.ct);m.spc=m.spc.slice(-32);
   this.emit({type:'WorkCompleted',ts:s.ts,site:line.site,line:line.id,station:m.id,unitId,result:pass?'Pass':'Fail',ctSec:m.ct});m.unit=null;
   if(pass){if(j===7){line.completed++;s.total++;const times=this.completed.get(line.id)??[];times.push(s.ts);this.completed.set(line.id,times);s.sites.find(x=>x.id===line.site)!.completed++;}else{line.machines[j+1].queue.push(unitId);this.start(line,j+1);}}else{line.failed++;s.failed++;}this.start(line,j);
  }
  if(a.type==='sample'){
   for(const l of s.lines){if(l.faultUntil&&s.ts>=l.faultUntil){l.faultUntil=0;const m=l.machines[5];m.status='running';m.alarm=null;this.emit({type:'FaultCleared',ts:s.ts,site:l.site,line:l.id,station:m.id,code:'REFLOW-TEMP'});this.start(l,5);}if(l.npiUntil&&s.ts>=l.npiUntil){l.machines[3].status='running';l.machines[4].status='running';this.start(l,3);this.start(l,4);if(s.ts>=l.npiUntil+1800)l.npiUntil=0;}
    l.status=l.faultUntil?'fault':l.npiUntil>s.ts?'changeover':'running';
    const elapsed=Math.max(60,Math.min(3600,s.ts));const times=(this.completed.get(l.id)??[]).filter(t=>t>s.ts-3600);this.completed.set(l.id,times);const results=(this.results.get(l.id)??[]).filter(r=>r.ts>s.ts-3600);this.results.set(l.id,results);
    const uph=times.length*3600/elapsed;const quality=results.length?results.filter(r=>r.pass).length/results.length:1;
    const availability=l.status==='fault'?0:l.status==='changeover'?.2:1;const perf=Math.min(1,uph/(3600/36));
    l.metrics={...this.empty(),uph:Math.round(uph),fpy:quality*100,oee:availability*perf*quality*100,ct:l.machines.reduce((n,m)=>n+m.ct,0),inventory:s.sites.find(x=>x.id===l.site)!.inventory};
    const sample={...l.metrics,completed:l.completed};l.history=l.history.filter(h=>h.ts!==s.ts);l.history.push(sample);l.history=l.history.filter(h=>h.ts>=s.ts-3600);
   }
   for(const site of s.sites){const ls=s.lines.filter(l=>l.site===site.id);site.uph=ls.reduce((n,l)=>n+l.metrics.uph,0);site.oee=ls.length?ls.reduce((n,l)=>n+l.metrics.oee,0)/ls.length:0;site.fpy=ls.length?ls.reduce((n,l)=>n+l.metrics.fpy,0)/ls.length:100;site.agv=ls.length?Math.min(99,56+s.demand*12+(site.inventory<2500?9:0)):0;
    site.history=site.history.filter(h=>h.ts!==s.ts);site.history.push({...this.empty(),uph:site.uph,oee:site.oee,fpy:site.fpy,inventory:site.inventory,agv:site.agv});site.history=site.history.filter(h=>h.ts>=s.ts-3600);
   }
   s.history=s.history.filter(h=>h.ts!==s.ts);s.history.push({...this.empty(),uph:s.sites.reduce((n,x)=>n+x.uph,0),oee:s.lines.reduce((n,l)=>n+l.metrics.oee,0)/s.lines.length,fpy:(()=>{const r=[...this.results.values()].flat();return r.length?r.filter(x=>x.pass).length/r.length*100:100;})(),ct:s.lines.reduce((n,l)=>n+l.metrics.ct,0)/s.lines.length,inventory:s.sites.reduce((n,x)=>n+x.inventory,0),agv:s.sites.reduce((n,x)=>n+x.agv,0)/3,transit:s.shipments.reduce((n,x)=>n+x.qty,0),otd:s.otd,eta:s.shipments.length?s.shipments.reduce((n,x)=>n+Math.max(0,x.eta-s.ts)/86400,0)/s.shipments.length:0});s.history=s.history.filter(h=>h.ts>=s.ts-3600);this.schedule({at:s.ts+30,type:'sample'});
  }
  if(a.type==='ship'){for(const r of routes){const site=s.sites.find(x=>x.id===r.from)!;const qty=Math.min(120,site.inventory);if(!qty)continue;site.inventory-=qty;const delayed=s.active.includes('port')&&(r.from==='HUB-SG'||r.to==='HUB-SG');const eta=s.ts+r.days*86400+(delayed?5*86400:0);const sh={id:++this.shipment,from:r.from,to:r.to,mode:r.mode,qty,sku:'SRV-MB',depart:s.ts,eta,plannedEta:s.ts+r.days*86400};s.shipments.push(sh);this.emit({type:'UnitsDeparted',ts:s.ts,site:r.from,to:r.to,mode:r.mode,qty,sku:sh.sku,eta});this.schedule({at:eta,type:'arrive',shipment:sh.id});}this.schedule({at:s.ts+3600,type:'ship'});}
  if(a.type==='arrive'){const sh=s.shipments.find(x=>x.id===a.shipment);if(sh){if(sh.eta>s.ts){this.schedule({at:sh.eta,type:'arrive',shipment:sh.id});return;}s.sites.find(x=>x.id===sh.to)!.inventory+=sh.qty;this.emit({type:'UnitsArrived',ts:s.ts,site:sh.to,from:sh.from,qty:sh.qty,sku:sh.sku});s.shipments=s.shipments.filter(x=>x.id!==sh.id);}}
  if(a.type==='agv'){const phase=a.phase??0;for(const site of s.sites.filter(x=>!x.id.startsWith('HUB'))){this.emit({type:'AgvTask',ts:s.ts,site:site.id,agvId:`${site.id}-AGV-${(a.agv??0)%3+1}`,from:'原料倉',to:'SMT 區',state:phase===0?'Assigned':phase===1?'Moving':'Done'});if(phase===2){site.inventory+=24;const l=s.lines.find(x=>x.site===site.id)!;this.emit({type:'MaterialsLoaded',ts:s.ts,site:site.id,line:l.id,station:l.machines[0].id,partNo:'PCB-S12',qty:24});}}this.schedule({at:s.ts+(phase===0?4:phase===1?22:Math.max(5,32/s.demand)),type:'agv',agv:phase===2?(a.agv??0)+1:a.agv,phase:(phase+1)%3});}
 }
 inject(id:string){const s=this.state;if(s.active.includes(id))return; if(!['fault','port','npi','demand'].includes(id))return;s.active.push(id);
  if(id==='fault'){const l=s.lines.find(l=>l.id==='TH-01/L3')!;l.faultUntil=s.ts+7200;l.status='fault';l.machines[5].status='fault';l.machines[5].alarm='REFLOW-TEMP · 溫區失控';this.emit({type:'FaultOccurred',ts:s.ts,site:l.site,line:l.id,station:l.machines[5].id,code:'REFLOW-TEMP',severity:3});const tw=s.lines.find(l=>l.site==='TW-HQ')!;tw.machines[0].queue.push(...Array.from({length:6},()=>`REROUTED-${++this.unit}`));this.start(tw,0);s.airCost+=3800;const sh={id:++this.shipment,from:'TW-HQ',to:'MX-01',mode:'Air' as const,qty:240,sku:'SRV-MB',depart:s.ts,eta:s.ts+2*86400,plannedEta:s.ts+2*86400};s.shipments.push(sh);this.schedule({at:sh.eta,type:'arrive',shipment:sh.id});this.emit({type:'UnitsDeparted',ts:s.ts,site:'TW-HQ',to:'MX-01',mode:'Air',qty:240,sku:'SRV-MB',eta:sh.eta});}
  if(id==='port'){for(const sh of s.shipments.filter(x=>x.from==='HUB-SG'||x.to==='HUB-SG'))sh.eta+=5*86400;s.otd=82.1;s.sites.find(x=>x.id==='MX-01')!.inventory-=800;}
  if(id==='npi'){for(const l of s.lines.filter(l=>l.site==='TW-HQ')){l.npiUntil=s.ts+300;l.sku='EDGE-M';l.status='changeover';l.machines[3].status='changeover';l.machines[4].status='changeover';}}
  if(id==='demand'){s.demand=2;for(const site of s.sites.filter(x=>!x.id.startsWith('HUB')))site.inventory+=600;}
  this.queue=this.queue.filter(a=>a.type!=='sample');this.schedule({at:s.ts,type:'sample'});this.advance(0);
 }
}
