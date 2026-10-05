import {describe,it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {attack,Simulation} from '../src/core/simulation';
import {totalSurvivalTime} from '../src/core/model';
import {arrowFlightAt,warningAt,pressureAt} from '../src/config/balance';
import {Rng,scheduleWave} from '../src/patterns/catalog';
import {fixtureRun,flameBatchGeometry,flameEdgeGeometry,hasRepeatedFlameGeometry,nextWave,replayWave,validateDisclosure,validateWave} from '../src/patterns/fairness';

const out='docs/evidence/v17';mkdirSync(out,{recursive:true});
const overlaps=(a:{family:string;warn:number;active:number;end:number},b:{family:string;warn:number;active:number;end:number})=>a.family!==b.family&&Math.max(a.active,b.active)<Math.min(a.end,b.end);
const warningOverlap=(a:{family:string;warn:number;active:number;end:number},b:{family:string;warn:number;active:number;end:number})=>a.family!==b.family&&Math.max(a.active,b.warn)<Math.min(a.end,b.active);

describe('v1.7 survival time and arrangements',()=>{
  it('records the exact lethal simulation instant and excludes pause, tutorial and death',()=>{
    const sim=new Simulation();sim.start();sim.advance(.1);expect(sim.run.stageTime).toBeCloseTo(.1,8);
    sim.pause();sim.advance(2);expect(sim.run.stageTime).toBeCloseTo(.1,8);
    sim.resume();sim.advance(.05);
    const start=sim.run.time,hit=start+.047;
    const a=attack(1,'fatal','lightning','fixture',{x:2,y:2},'down',[{x:2,y:2}],start,hit,.12,undefined,0,'brief');
    sim.addWave({id:1,seed:1,stage:0,category:'simple',archetype:'discrete',pattern:'fixture',announced:start,batches:[{id:0,phase:0,cycle:0,warn:start,active:hit,attackIds:['fatal']}],attacks:[a],end:a.end,scored:false,witness:[],pressure:0,recovery:.9,sequenceSpacing:0});
    sim.advance(.2);expect(sim.run.status).toBe('dead');expect(sim.run.stageTime).toBeCloseTo(hit,5);expect(sim.run.stageTimes[0]).toBeCloseTo(hit,5);
    const frozen=sim.run.stageTime;sim.advance(2);expect(sim.run.stageTime).toBe(frozen);
    expect(totalSurvivalTime(sim.run)).toBeCloseTo(hit,5);
    expect(sim.nextStage()).toBe(true);expect(sim.run.stageTime).toBe(0);expect(totalSurvivalTime(sim.run)).toBeCloseTo(hit,5);
    sim.advance(.17);expect(totalSurvivalTime(sim.run)).toBeCloseTo(hit+.17,5);
    sim.retryRun();expect(totalSurvivalTime(sim.run)).toBe(0);
    sim.run.stageTimes=[.1234,.2345,.3456,.4567,0];sim.run.stageIndex=4;sim.run.stageTime=.5678;
    expect(totalSurvivalTime(sim.run)).toBeCloseTo(.1234+.2345+.3456+.4567+.5678,10);
    const tutorial=new Simulation();tutorial.start();tutorial.run.practice=true;tutorial.advance(1.7);expect(tutorial.run.stageTime).toBe(0);
  });
  it('strengthens later crossbow waves without speeding up the opening',()=>{
    const records=[];
    for(const time of[0,15,40]){
      const row={time,pressure:pressureAt(time),warning:warningAt('arrow',pressureAt(time)),ordinaryFastFlight:arrowFlightAt('fast',pressureAt(time)),slowFastSlowFlight:arrowFlightAt('slow',pressureAt(time),true),slowFastFastFlight:arrowFlightAt('fast',pressureAt(time),true),patterns:{} as Record<string,{batches:number;projectiles:number;duration:number}>};
      for(const id of['arrow-volley','arrow-staircase','arrow-four-side-relay','arrow-crossfire','arrow-slow-fast'] as const){
        const w=scheduleWave(fixtureRun(0,time),new Rng(73),'advanced',1,id);
        row.patterns[id]={batches:w.batches.length,projectiles:w.attacks.length,duration:w.end};
        if(id!=='arrow-slow-fast')expect(new Set(w.attacks.map(a=>(a.end-a.active).toFixed(6))).size).toBe(1);
        expect(w.attacks.every(a=>a.end-a.active<1.1)).toBe(true);
        const sources=new Map<string,number>();for(const a of w.attacks){const key=`${a.origin.x},${a.origin.y}`;expect(a.warn).toBeGreaterThanOrEqual(sources.get(key)??0);sources.set(key,a.active);}
      }
      records.push(row);
    }
    expect(records[2].patterns['arrow-crossfire'].batches).toBeGreaterThan(records[0].patterns['arrow-crossfire'].batches);
    expect(records[2].patterns['arrow-crossfire'].projectiles).toBeGreaterThan(records[0].patterns['arrow-crossfire'].projectiles);
    expect(records[2].warning).toBeLessThan(records[0].warning);
    expect(records[2].ordinaryFastFlight).toBeLessThan(records[0].ordinaryFastFlight);
    expect(records[2].slowFastSlowFlight).toBeGreaterThan(records[0].slowFastSlowFlight);
    writeFileSync(`${out}/crossbow-tuning.json`,JSON.stringify(records,null,2));
  });
  it('uses multi-location opening point batches and overlapping later lightning relays',()=>{
    const opening=scheduleWave(fixtureRun(1,0),new Rng(43),'simple',1,'lightning-scatter');
    expect(opening.batches[0].attackIds.length).toBeGreaterThanOrEqual(2);
    expect(new Set(opening.attacks.map(a=>`${a.cells[0].x},${a.cells[0].y}`)).size).toBe(opening.attacks.length);
    const lines=scheduleWave(fixtureRun(1,0),new Rng(11),'simple',1,'lightning-short-lines');
    expect(lines.batches).toHaveLength(1);expect(lines.attacks.every(a=>a.warn===lines.attacks[0].warn&&a.active===lines.attacks[0].active)).toBe(true);
    const relay=scheduleWave(fixtureRun(1,40),new Rng(43),'advanced',1,'lightning-random-relay');
    expect(relay.batches.length).toBeGreaterThanOrEqual(10);
    expect(relay.batches.every(b=>b.attackIds.length>=2)).toBe(true);
    expect(relay.batches[1].warn).toBeLessThan(relay.attacks[0].end);
    expect(new Set(relay.attacks.map(a=>(a.active-a.warn).toFixed(6))).size).toBe(1);
    expect(new Set(relay.attacks.map(a=>(a.end-a.active).toFixed(6))).size).toBe(1);
    writeFileSync(`${out}/lightning-tuning.json`,JSON.stringify({openingBatch:opening.batches[0].attackIds.length,relayBatches:relay.batches.length,relayAttacks:relay.attacks.length,relaySpacing:relay.batches[1].warn-relay.batches[0].warn,warning:relay.attacks[0].active-relay.attacks[0].warn,active:relay.attacks[0].end-relay.attacks[0].active},null,2));
  });
  it('changes full-lane flame geometry across consecutive batches and adjacent waves',()=>{
    const w=scheduleWave(fixtureRun(2,40),new Rng(29),'advanced',1,'flame-moving-corridor');
    expect(hasRepeatedFlameGeometry(w)).toBe(false);
    const geometry=w.batches.map(b=>flameBatchGeometry(w,b));expect(new Set(geometry).size).toBeGreaterThan(1);
    const recent=flameEdgeGeometry(w,'last');let accepted=0;
    for(let seed=1;seed<=12;seed++){
      const selection=nextWave(fixtureRun(2,40),seed*811,'','',recent);
      if(!selection.wave)continue;accepted++;expect(hasRepeatedFlameGeometry(selection.wave)).toBe(false);expect(flameEdgeGeometry(selection.wave,'first')).not.toBe(recent);
      expect(replayWave(fixtureRun(2,40),selection.wave,selection.wave.witness)).toBe(true);
    }
    expect(accepted).toBeGreaterThan(0);
    writeFileSync(`${out}/flame-repeat.json`,JSON.stringify({oldMovingCorridorAdjacentRepeatsPerThreeBatches:2,newMovingCorridorAdjacentRepeats:geometry.filter((g,i)=>i>0&&g===geometry[i-1]).length,accepted},null,2));
  },120000);
  it('generates accepted mixed waves with cross-family warning and active overlap',()=>{
    let accepted=0,activePairs=0,warningPairs=0,activeSeconds=0,activeWarningSeconds=0,lightning=0,solo=0,rejected=0,fallback=0;const examples=[];
    for(let seed=1;seed<=20;seed++){
      const run=fixtureRun(4,25);run.cell={x:seed%6,y:Math.floor(seed/6)%6};
      const s=nextWave(run,seed*929);rejected+=s.rejected;fallback+=Number(s.fallback);if(!s.wave)continue;
      accepted++;const w=s.wave;lightning+=Number(w.attacks.some(a=>a.family==='lightning'));
      let active=0,warn=0;for(let i=0;i<w.attacks.length;i++)for(let j=0;j<i;j++){
        if(overlaps(w.attacks[i],w.attacks[j]))active++;
        if(warningOverlap(w.attacks[i],w.attacks[j])||warningOverlap(w.attacks[j],w.attacks[i]))warn++;
      }
      activePairs+=active;warningPairs+=warn;solo+=Number(new Set(w.attacks.map(a=>a.family)).size===1);
      const bounds=[...new Set(w.attacks.flatMap(a=>[a.warn,a.active,a.end]))].sort((a,b)=>a-b);
      let waveActive=0,waveWarning=0;
      for(let i=1;i<bounds.length;i++){
        const mid=(bounds[i-1]+bounds[i])/2,activeFamilies=new Set(w.attacks.filter(a=>a.active<=mid&&mid<a.end).map(a=>a.family));
        const warningFamilies=new Set(w.attacks.filter(a=>a.warn<=mid&&mid<a.active).map(a=>a.family));
        if(activeFamilies.size>=2)waveActive+=bounds[i]-bounds[i-1];
        if([...activeFamilies].some(f=>[...warningFamilies].some(g=>f!==g)))waveWarning+=bounds[i]-bounds[i-1];
      }
      activeSeconds+=waveActive;activeWarningSeconds+=waveWarning;
      examples.push({pattern:w.pattern,activePairs:active,warningPairs:warn,activeSeconds:+waveActive.toFixed(3),activeWarningSeconds:+waveWarning.toFixed(3),attacks:w.attacks.length,rejected:s.rejected,fallback:s.fallback});
      expect(validateWave(run,w)).not.toBeNull();expect(validateDisclosure(run,w)).toBe(true);expect(replayWave(run,w,w.witness)).toBe(true);
    }
    expect(accepted).toBeGreaterThanOrEqual(15);expect(lightning).toBeGreaterThan(0);expect(solo).toBeLessThan(accepted/2);expect(activeSeconds).toBeGreaterThan(0);expect(activeWarningSeconds).toBeGreaterThan(0);
    writeFileSync(`${out}/mixed-overlap.json`,JSON.stringify({sample:20,accepted,solo,lightning,activePairs,warningPairs,activeSeconds:+activeSeconds.toFixed(3),activeWarningSeconds:+activeWarningSeconds.toFixed(3),rejected,fallback,examples},null,2));
  },180000);
  it('measures accepted and replayed crossbow and lightning density at opening and late pressure',async()=>{
    const rows=[];
    for(const stage of[0,1])for(const time of[0,40]){
      const row={stage,time,attempts:12,accepted:0,rejected:0,fallback:0,batches:0,attacks:0,warningSum:0,flightSum:0,arrowAttacks:0,pointBatches:0,pointLocations:0,relayWaves:0,patterns:{} as Record<string,number>};
      for(let seed=1;seed<=12;seed++){
        await new Promise<void>(resolve=>setTimeout(resolve,0));
        const run=fixtureRun(stage,time);run.cell={x:seed%6,y:Math.floor(seed/6)%6};
        const s=nextWave(run,seed*1619+stage*911+time*17);row.rejected+=s.rejected;row.fallback+=Number(s.fallback);
        if(!s.wave)continue;row.accepted++;const w=s.wave;expect(replayWave(run,w,w.witness)).toBe(true);
        row.batches+=w.batches.length;row.attacks+=w.attacks.length;row.patterns[w.pattern]=(row.patterns[w.pattern]??0)+1;
        for(const a of w.attacks){row.warningSum+=a.active-a.warn;if(a.family==='arrow'){row.arrowAttacks++;row.flightSum+=a.end-a.active;}}
        if(w.pattern==='lightning-random-relay')row.relayWaves++;
        for(const b of w.batches){const attacks=w.attacks.filter(a=>a.batchId===b.id);if(attacks.length>1&&attacks.every(a=>a.family==='lightning'&&a.cells.length===1)){row.pointBatches++;row.pointLocations+=attacks.length;}}
      }
      rows.push({...row,meanBatches:row.batches/row.accepted,meanAttacks:row.attacks/row.accepted,meanWarning:row.warningSum/row.attacks,meanArrowFlight:row.arrowAttacks?row.flightSum/row.arrowAttacks:null});
    }
    expect(rows[0].meanAttacks).toBeLessThan(rows[1].meanAttacks);
    expect(rows[0].meanWarning).toBeGreaterThan(rows[1].meanWarning);
    expect(rows.every(r=>r.accepted>=10)).toBe(true);
    writeFileSync(`${out}/accepted-family-audit.json`,JSON.stringify(rows,null,2));
  },180000);
});
