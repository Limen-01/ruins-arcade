import {Attack,Direction,LightningMode,MOVE_TIME,Run,STEP,Wave,command,newRun,totalSurvivalTime} from './model';
import {hits} from './collision';

export class Simulation {
  run:Run=newRun();
  retryRun():void{this.run=newRun();this.run.status='playing';}
  start():void{this.retryRun();}
  nextStage():boolean{
    const old=this.run;if(old.status!=='dead'||old.stageIndex>=4)return false;
    const fresh=newRun();fresh.status='playing';fresh.stageIndex=old.stageIndex+1;fresh.stageTimes=old.stageTimes.slice();this.run=fresh;return true;
  }
  pause():void{if(this.run.status==='playing'){this.run.status='paused';this.run.queued=null;}}
  resume():void{if(this.run.status==='paused')this.run.status='playing';}
  input(d:Direction):boolean{return command(this.run,d);}
  addWave(wave:Wave):void{
    const r=this.run;
    if(r.status!=='playing'||r.wave||wave.id!==r.nextWaveId||wave.stage!==r.stageIndex||wave.attacks.length===0||wave.batches.length===0)throw new Error('Invalid wave announcement');
    const ids=new Set<string>();
    const arrowSpeeds=new Set(wave.attacks.filter(a=>a.family==='arrow').map(a=>a.speedClass));
    if(arrowSpeeds.size>1&&!wave.pattern.includes('arrow-slow-fast'))throw new Error('Ordinary wave arrows must share one speed');
    const lightning=wave.attacks.filter(a=>a.family==='lightning');
    if(lightning.length){const first=lightning[0],lead=first.active-first.warn,duration=first.end-first.active;
      if(lightning.some(a=>Math.abs(a.active-a.warn-lead)>1e-6||Math.abs(a.end-a.active-duration)>1e-6||a.lightningMode!==first.lightningMode))throw new Error('Lightning timing must be uniform within a wave');}
    const sources=new Map<string,number>();
    for(const batch of wave.batches){
      const members=wave.attacks.filter(a=>a.batchId===batch.id);
      if(!members.length||batch.attackIds.length!==members.length||members.some(a=>!batch.attackIds.includes(a.id)))throw new Error('Invalid batch ownership');
      if(members.some(a=>Math.abs(a.warn-batch.warn)>1e-6))throw new Error('Invalid batch warning time');
      const speeds=new Set(members.filter(a=>a.family==='arrow').map(a=>a.speedClass));
      if(speeds.size>1||speeds.size===1&&batch.speedClass!==[...speeds][0])throw new Error('Arrow speed differs within batch');
      Object.freeze(batch.attackIds);Object.freeze(batch);
      for(const id of batch.attackIds){if(ids.has(id))throw new Error('Duplicate attack ID');ids.add(id);}
    }
    for(const a of wave.attacks){
      if(a.waveId!==wave.id||a.warn<r.time-1e-6||!ids.has(a.id))throw new Error('Invalid event schedule');
      if(a.family==='flame'){
        const row=a.direction==='left'||a.direction==='right';
        const index=row?a.cells[0]?.y:a.cells[0]?.x;
        const values=a.cells.map(c=>row?c.x:c.y).sort((x,y)=>x-y);
        const origin=row?a.origin.x:a.origin.y;
        if(a.cells.length!==6||index===undefined||a.cells.some(c=>(row?c.y:c.x)!==index)||values.some((v,i)=>v!==i)||
          (a.direction==='right'||a.direction==='down'?origin>=0:origin<=5)||
          (row?a.origin.y:a.origin.x)!==index)throw new Error('Beast-head flame must cover one sourced complete lane');
      }
      if(a.family==='lightning'&&!['brief','long'].includes(a.lightningMode??'brief'))throw new Error('Invalid lightning mode');
      if(a.family==='arrow'){
        const source=`${a.origin.x},${a.origin.y}`,prior=sources.get(source);
        if(prior!==undefined&&a.warn<prior-1e-6)throw new Error(`Reused arrow source needs a separate warning cycle: ${wave.pattern} ${source} ${a.warn.toFixed(2)} < ${prior.toFixed(2)}`);
        sources.set(source,a.active);
      }
      for(const c of a.cells)Object.freeze(c);
      Object.freeze(a.cells);Object.freeze(a.origin);Object.freeze(a);
    }
    Object.freeze(wave.batches);Object.freeze(wave.attacks);r.wave=wave;r.nextWaveId++;
  }
  releaseWave():number|null{
    const r=this.run,wave=r.wave;
    if(!wave||!wave.scored||r.time<wave.end+wave.recovery-1e-9)return null;
    const actualRecovery=r.time-wave.end;r.wave=null;return actualRecovery;
  }
  step(dt=STEP):void{
    const r=this.run;if(r.status!=='playing')return;
    const t0=r.time,t1=t0+dt;
    const segments:[number,number][]=r.move&&r.move.end>t0&&r.move.end<t1?[[t0,r.move.end],[r.move.end,t1]]:[[t0,t1]];
    for(const [start,end] of segments){
      // Stable authored event order determines the cause of simultaneous hits.
      let found:Attack|undefined,first=end;
      for(const a of r.wave?.attacks??[]){
        if(!hits(r,a,start,end))continue;
        let low=start,high=end;
        for(let i=0;i<24;i++){const middle=(low+high)/2;if(hits(r,a,start,middle))high=middle;else low=middle;}
        if(!found||high<first-1e-7){found=a;first=high;}
      }
      if(found){r.time=first;if(!r.practice){r.stageTime+=first-start;r.stageTimes[r.stageIndex]=r.stageTime;}r.status='dead';r.lastHit=found.family;r.queued=null;return;}
      r.time=end;if(!r.practice)r.stageTime+=end-start;
      if(r.move&&r.time>=r.move.end-1e-9){r.cell=r.move.to;r.move=null;if(r.queued){const next=r.queued;r.queued=null;command(r,next);}}
    }
    const wave=r.wave;
    if(wave&&!wave.scored&&r.time>=wave.end-1e-9){wave.scored=true;r.wavesCleared++;}
    // Keep the completed wave through its visual cleanup; the scheduler clears it after recovery.
  }
  advance(seconds:number):void{let left=seconds;while(left>1e-10&&this.run.status==='playing'){const dt=Math.min(left,STEP);this.step(dt);left-=dt;}}
  total():number{return totalSurvivalTime(this.run);}
}
export function attack(waveId:number,id:string,family:Attack['family'],pattern:string,origin:Attack['origin'],direction:Direction,cells:Attack['cells'],warn:number,active:number,duration:number,speedClass?:Attack['speedClass'],batchId=0,lightningMode?:LightningMode):Attack{
  return{waveId,batchId,id,family,pattern,origin,direction,cells,warn,active,end:active+duration,cleanup:active+duration+.18,speedClass,lightningMode};
}
export{MOVE_TIME};
