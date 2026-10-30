import { Simulation } from './engine';
import type { Command } from './types';
let sim=new Simulation(42), speed=60;
self.onmessage=(e:MessageEvent<Command>)=>{const c=e.data;if(c.type==='speed')speed=c.value;if(c.type==='scenario')sim.inject(c.id);if(c.type==='reset')sim=new Simulation(c.seed);self.postMessage({...sim.snapshot(),speed});};
setInterval(()=>{if(speed>0)self.postMessage({...sim.advance(speed/4),speed});},250);
self.postMessage({...sim.snapshot(),speed});
