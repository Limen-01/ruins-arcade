import {Attack,Direction,Run,STEP,Wave,Witness,directions,newRun,position} from '../core/model';
import {Simulation} from '../core/simulation';
import {hits} from '../core/collision';
import {CADENCE,MAX_CANDIDATES,MAX_NODES,REACTION,TIME_MARGIN} from '../config/balance';
import {Pattern,Rng,chooseCategory,scheduleWave} from './catalog';

const SLICE=.08;
const cloneRun=(r:Run):Run=>structuredClone(r);
function cautious(wave:Wave):Wave{
  const copy=structuredClone(wave);
  copy.attacks=wave.attacks.flatMap(a=>a.family==='arrow'
    ?[-TIME_MARGIN,-TIME_MARGIN/2,0,TIME_MARGIN/2,TIME_MARGIN].map((shift,i)=>({...a,id:`${a.id}:margin${i}`,active:a.active+shift,end:a.end+shift,cleanup:a.cleanup+shift}))
    :[{...a,active:a.active-TIME_MARGIN,end:a.end+TIME_MARGIN,cleanup:a.cleanup+TIME_MARGIN}]);
  copy.end=Math.max(...copy.attacks.map(a=>a.end));return copy;
}
function hasFreeCenters(attacks:Attack[]):boolean{
  for(const time of attacks.flatMap(a=>[a.active,(a.active+a.end)/2,a.end])){
    let free=0;for(let y=0;y<6;y++)for(let x=0;x<6;x++){
      const r=newRun();r.cell={x,y};r.time=time;
      if(!attacks.some(a=>hits(r,a,time,time)))free++;
    }
    if(free<1)return false;
  }return true;
}
export function replayWave(start:Run,candidate:Wave,witness:Witness):boolean{
  const sim=new Simulation();sim.run=cloneRun(start);sim.run.wave=null;sim.run.status='playing';sim.addWave(structuredClone(candidate));
  const horizon=candidate.end+TIME_MARGIN+STEP;let index=0;
  while(sim.run.time<horizon&&sim.run.status==='playing'){
    while(index<witness.length&&sim.run.time+1e-8>=witness[index].at)sim.input(witness[index++].direction);
    sim.step();
  }return sim.run.status==='playing'&&sim.run.time>=horizon;
}
type Node={run:Run;elapsed:number;last:number;path:Witness};
export function validateWave(start:Run,candidate:Wave,maxNodes=MAX_NODES,forcedFirst?:Direction,blockedUntil=0):Witness|null{
  if(candidate.stage!==start.stageIndex||candidate.attacks.some(a=>a.warn<start.time-1e-6)||start.wave&&!start.wave.scored)return null;
  const initial=cloneRun(start);initial.status='playing';initial.wave=cautious(candidate);
  if(!hasFreeCenters(initial.wave.attacks))return null;
  const horizon=initial.wave.end+STEP,stack:Node[]=[{run:initial,elapsed:0,last:-100,path:[]}],seen=new Set<string>();
  for(let expanded=0;stack.length&&expanded<maxNodes;expanded++){
    const node=stack.pop()!;if(node.run.status==='dead')continue;
    if(node.run.time>=horizon){if(replayWave(start,candidate,node.path))return node.path;continue;}
    const options:(Direction|null)[]=[];
    if(node.elapsed>=REACTION&&node.elapsed-node.last>=CADENCE&&(!node.path.length||node.elapsed>=blockedUntil))options.push(...(forcedFirst&&!node.path.length?[forcedFirst]:directions));
    if(!forcedFirst||node.path.length||node.elapsed<REACTION)options.push(null);
    for(const direction of options){
      const sim=new Simulation();sim.run=cloneRun(node.run);const path=node.path.slice();
      if(direction&&sim.input(direction))path.push({at:sim.run.time,direction});
      for(let i=0;i<Math.round(SLICE/STEP)&&sim.run.status==='playing';i++)sim.step();
      if(sim.run.status==='dead')continue;
      const r=sim.run,p=position(r),last=direction&&path.length>node.path.length?node.elapsed:node.last;
      const key=`${Math.round((r.time-start.time)/SLICE)}:${Math.round(p.x*13)}:${Math.round(p.y*13)}:${r.move?.to.x??'-'}:${r.move?.to.y??'-'}:${r.queued??'-'}:${Math.min(3,Math.floor((node.elapsed+SLICE-last)/SLICE))}`;
      if(seen.has(key))continue;seen.add(key);stack.push({run:r,elapsed:node.elapsed+SLICE,last,path});
    }
  }return null;
}
export function validateDisclosure(start:Run,candidate:Wave,maxNodes=Math.min(900,MAX_NODES)):boolean{
  const firstHidden=[...new Set(candidate.attacks.map(a=>a.warn))].sort((a,b)=>a-b).find(t=>t>start.time+REACTION+1e-6&&t<=start.time+1.2);
  if(firstHidden===undefined)return true;
  const knownAttacks=candidate.attacks.filter(a=>a.warn<firstHidden-1e-6);
  if(!knownAttacks.length)return true;
  const ids=new Set(knownAttacks.map(a=>a.id));
  const known:Wave={...candidate,attacks:knownAttacks,batches:candidate.batches.map(b=>({...b,attackIds:b.attackIds.filter(id=>ids.has(id))})).filter(b=>b.attackIds.length),end:Math.max(...knownAttacks.map(a=>a.end)),witness:[]};
  for(const direction of directions){
    if(!validateWave(start,known,maxNodes,direction,firstHidden-start.time+REACTION))continue;
    if(!validateWave(start,candidate,maxNodes,direction,firstHidden-start.time+REACTION))return false;
  }
  return true;
}
export type Selection={wave:Wave|null;rejected:number;fallback:boolean;reason?:string};
export function waveTargetSignature(wave:Wave):string{return wave.attacks.map(a=>`${a.family}:${a.direction}:${a.cells.map(c=>`${c.x},${c.y}`).sort().join(';')}`).sort().join('|');}
export function flameBatchGeometry(wave:Wave,batch:Wave['batches'][number]):string{
  return wave.attacks.filter(a=>a.batchId===batch.id&&a.family==='flame').map(a=>`${a.direction==='left'||a.direction==='right'?'row':'col'}:${a.direction==='left'||a.direction==='right'?a.cells[0].y:a.cells[0].x}`).sort().join('|');
}
export function flameEdgeGeometry(wave:Wave,edge:'first'|'last'):string{
  const batches=wave.batches.filter(batch=>flameBatchGeometry(wave,batch));
  return batches.length?flameBatchGeometry(wave,edge==='first'?batches[0]:batches[batches.length-1]):'';
}
export function hasRepeatedFlameGeometry(wave:Wave):boolean{
  const ordered=wave.batches.filter(b=>flameBatchGeometry(wave,b)).sort((a,b)=>a.warn-b.warn);
  return ordered.some((batch,i)=>i>0&&flameBatchGeometry(wave,batch)===flameBatchGeometry(wave,ordered[i-1]));
}
export function nextWave(run:Run,seed:number,previousPattern='',previousTarget='',previousFlameGeometry=''):Selection{
  if(run.wave)return{wave:null,rejected:0,fallback:false,reason:'current wave not released'};
  const rng=new Rng(seed);let rejected=0;
  const preferLightning=run.stageIndex===4&&!!previousPattern&&!previousPattern.includes('lightning');
  const attempt=(pattern?:Pattern,extra=0,lightningFirst=false):Wave|null=>{
    const wave=scheduleWave(run,rng,pattern?'simple':chooseCategory(run.stageTime,rng,run.stageIndex),run.nextWaveId,pattern,extra,lightningFirst);
    if(run.stageIndex===2&&(hasRepeatedFlameGeometry(wave)||previousFlameGeometry&&flameEdgeGeometry(wave,'first')===previousFlameGeometry)){rejected++;return null;}
    const witness=validateWave(run,wave);
    if(!witness||!validateDisclosure(run,wave)){rejected++;return null;}wave.witness=witness;return wave;
  };
  for(let i=0;i<MAX_CANDIDATES;i++){
    const wave=attempt(undefined,0,preferLightning&&i<12);if(wave&&(wave.pattern!==previousPattern||i>=2)&&(waveTargetSignature(wave)!==previousTarget||i>=3))return{wave,rejected,fallback:false};
    if(wave)rejected++;
  }
  const simple:Pattern=run.stageIndex===1?'lightning-scatter':run.stageIndex===2?'flame-multi-line':run.stageIndex===3?'ground-fire-islands':'arrow-volley';
  for(const extra of [.15,.3,.5]){const wave=attempt(simple,extra);if(wave)return{wave,rejected,fallback:true};}
  return{wave:null,rejected,fallback:false,reason:'No validated wave; existing state retained.'};
}
export function fixtureRun(stage=0,stageTime=0):Run{const r=newRun();r.status='playing';r.stageIndex=stage;r.stageTime=stageTime;return r;}
