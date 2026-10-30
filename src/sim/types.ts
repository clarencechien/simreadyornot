export type Status = 'running'|'warning'|'fault'|'changeover'|'offline';
type Base = {ts:number;site:string};
type Work = Base & {line:string;station:string;unitId:string};
export type SimEvent =
 | Work & {type:'WorkStarted';sku:string}
 | Work & {type:'WorkCompleted';result:'Pass'|'Fail';ctSec:number}
 | Base & {type:'FaultOccurred';line:string;station:string;code:string;severity:1|2|3}
 | Base & {type:'FaultCleared';line:string;station:string;code:string}
 | Base & {type:'MaterialsLoaded';line:string;station:string;partNo:string;qty:number}
 | Base & {type:'UnitsDeparted';to:string;mode:'Sea'|'Air'|'Truck';qty:number;sku:string;eta:number}
 | Base & {type:'UnitsArrived';from:string;qty:number;sku:string}
 | Base & {type:'AgvTask';agvId:string;from:string;to:string;state:'Assigned'|'Moving'|'Done'};
export type Sample = {ts:number;uph:number;fpy:number;oee:number;ct:number;inventory:number;agv:number;transit:number;otd:number;eta:number};
export type Machine = {id:string;name:string;status:Status;ct:number;processed:number;failed:number;busyUntil:number;unit:string|null;queue:string[];alarm:string|null;spc:number[]};
export type Line = {id:string;site:string;sku:string;status:Status;machines:Machine[];completed:number;failed:number;history:Sample[];metrics:Sample;faultUntil:number;npiUntil:number};
export type SiteState = {id:string;inventory:number;agv:number;completed:number;oee:number;uph:number;fpy:number;history:Sample[]};
export type Shipment = {id:number;from:string;to:string;mode:'Sea'|'Air'|'Truck';qty:number;sku:string;depart:number;eta:number;plannedEta:number};
export type Snapshot = {speed?:number;seed:number;ts:number;lines:Line[];sites:SiteState[];shipments:Shipment[];events:SimEvent[];active:string[];history:Sample[];total:number;failed:number;otd:number;airCost:number;demand:number};
export type Command = {type:'speed';value:number}|{type:'scenario';id:string}|{type:'reset';seed:number};
