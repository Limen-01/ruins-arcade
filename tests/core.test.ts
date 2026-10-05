import {describe,it,expect} from 'vitest';
import {attack,Simulation} from '../src/core/simulation';
import {hits} from '../src/core/collision';
import {STAGE_FAMILIES,Wave,totalSurvivalTime} from '../src/core/model';
import {DEDICATED_IDS,PATTERN_CATALOG,Rng,scheduleWave,patternsFor} from '../src/patterns/catalog';
import {fixtureRun,nextWave,replayWave,validateDisclosure,validateWave} from '../src/patterns/fairness';
import {ACTIVE_DURATION,ARROW_FLIGHT,LONG_LIGHTNING_DURATION,activeDurationAt,complexityWeights,pressureAt,recoveryAt,sequenceAt,warningAt} from '../src/config/balance';
import {DEATH_PRESENTATION,deathPose} from '../src/scenes/deathPresentation';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('docs/evidence/v17',{recursive:true});

const fixtureWave=(stage:number,attacks:ReturnType<typeof attack>[]):Wave=>({id:1,seed:1,stage,category:'simple',archetype:'discrete',pattern:'fixture',announced:0,
  batches:[{id:0,phase:0,cycle:0,warn:attacks[0].warn,active:attacks[0].active,attackIds:attacks.map(a=>a.id),speedClass:attacks.find(a=>a.family==='arrow')?.speedClass}],
  attacks,end:Math.max(...attacks.map(a=>a.end)),scored:false,witness:[],pressure:0,recovery:.9,sequenceSpacing:.3});

describe('stage and wave ownership',()=>{
  it('preserves the five-stage death-only run and fresh state',()=>{
    expect(STAGE_FAMILIES).toEqual(['arrow','lightning','flame','groundFire','mixed']);
    const sim=new Simulation();sim.start();sim.advance(10);expect(sim.nextStage()).toBe(false);
    for(let stage=0;stage<4;stage++){
      sim.run.wavesCleared=stage+2;sim.run.stageTimes[stage]=stage+2;sim.run.status='dead';sim.run.queued='up';
      expect(sim.nextStage()).toBe(true);expect(sim.run.stageIndex).toBe(stage+1);expect(sim.run.wavesCleared).toBe(0);
      expect(sim.run.time).toBe(0);expect(sim.run.stageTime).toBe(0);expect(sim.run.wave).toBeNull();expect(sim.run.queued).toBeNull();
    }
    expect(totalSurvivalTime(sim.run)).toBe(14);sim.run.status='dead';expect(sim.nextStage()).toBe(false);
    sim.retryRun();expect(sim.run.stageTimes).toEqual([0,0,0,0,0]);
  });
  it('completes a wave without awarding points and enforces recovery before the next',()=>{
    const sim=new Simulation();sim.start();sim.run.stageIndex=1;sim.run.cell={x:5,y:5};
    const a=attack(1,'a','lightning','fixture',{x:0,y:0},'down',[{x:0,y:0}],0,.3,.15),b=attack(1,'b','lightning','fixture',{x:0,y:1},'down',[{x:0,y:1}],.2,.5,.15,undefined,1);
    const w=fixtureWave(1,[a,b]);w.batches=[{id:0,phase:0,cycle:0,warn:0,active:.3,attackIds:['a']},{id:1,phase:1,cycle:0,warn:.2,active:.5,attackIds:['b']}];sim.addWave(w);sim.advance(.66);expect(sim.run.wavesCleared).toBe(1);expect(sim.run.stageTime).toBeCloseTo(.66);
    expect(sim.releaseWave()).toBeNull();sim.advance(.9);expect(sim.releaseWave()).toBeGreaterThanOrEqual(.9);expect(sim.run.wavesCleared).toBe(1);expect(sim.run.stageTime).toBeGreaterThan(1.5);
    const fatal=new Simulation();fatal.start();fatal.run.stageIndex=1;
    fatal.addWave(fixtureWave(1,[attack(1,'f','lightning','x',{x:2,y:2},'down',[{x:2,y:2}],0,.2,.15)]));fatal.advance(.5);
    expect(fatal.run.status).toBe('dead');expect(fatal.run.wavesCleared).toBe(0);expect(fatal.run.stageTimes[1]).toBeCloseTo(fatal.run.stageTime);
  });
  it('uses stable event order for simultaneous mixed deaths',()=>{
    const sim=new Simulation();sim.start();sim.run.stageIndex=4;
    const a=attack(1,'a','lightning','x',{x:2,y:2},'down',[{x:2,y:2}],0,.3,.15),b=attack(1,'b','groundFire','x',{x:2,y:2},'down',[{x:2,y:2}],0,.3,.72);
    sim.addWave(fixtureWave(4,[a,b]));sim.advance(.4);expect(sim.run.lastHit).toBe('lightning');expect(sim.run.wavesCleared).toBe(0);
  });
});

describe('compressed effective-time progression',()=>{
  it('preserves the opening curve through five seconds then approaches the ceiling by 40',()=>{
    for(const t of[0,2.5,5])expect(pressureAt(t)).toBeCloseTo(1-Math.exp(-t/30));
    expect(pressureAt(15)).toBeGreaterThan(.7);expect(pressureAt(25)).toBeGreaterThan(.9);expect(pressureAt(40)).toBeGreaterThan(.98);
    expect(recoveryAt(pressureAt(0))).toBeCloseTo(.9);expect(recoveryAt(pressureAt(40))).toBeLessThan(.32);
    expect(sequenceAt(pressureAt(40))).toBeLessThan(.14);
    expect(complexityWeights(pressureAt(40))[0]).toBeGreaterThan(0);
  });
  it('excludes pause, tutorial and death; freezes announced timing/speed',()=>{
    const sim=new Simulation();sim.start();sim.advance(2);const first=sim.run.stageTime;
    sim.pause();sim.advance(3);expect(sim.run.stageTime).toBe(first);sim.resume();sim.run.practice=true;sim.advance(2);expect(sim.run.stageTime).toBe(first);
    sim.run.practice=false;const w=scheduleWave(sim.run,new Rng(13),'advanced',1,'arrow-slow-fast');sim.addWave(w);
    const before=structuredClone(sim.run.wave!.attacks);sim.advance(.5);expect(sim.run.wave!.attacks).toEqual(before);
    sim.run.status='dead';const t=sim.run.stageTime;sim.advance(4);expect(sim.run.stageTime).toBe(t);
  });
});

describe('twenty authored dedicated patterns',()=>{
  it('defines exactly five arrow, six lightning, five lane-flame and four ground-fire IDs',()=>{
    expect(DEDICATED_IDS).toHaveLength(20);expect(PATTERN_CATALOG.map(d=>d.id)).toEqual([...DEDICATED_IDS]);
    expect(PATTERN_CATALOG.filter(d=>d.family==='arrow')).toHaveLength(5);
    expect(PATTERN_CATALOG.filter(d=>d.family==='lightning')).toHaveLength(6);
    expect(PATTERN_CATALOG.filter(d=>d.family==='flame')).toHaveLength(5);
    expect(DEDICATED_IDS).not.toContain('flame-horizontal-vertical-seal');
    expect(PATTERN_CATALOG.filter(d=>d.family==='groundFire')).toHaveLength(4);
    for(let stage=0;stage<4;stage++)for(const category of['simple','moderate','advanced'] as const)
      for(const id of patternsFor(stage,category))expect(PATTERN_CATALOG.find(d=>d.id===id)?.family).toBe(STAGE_FAMILIES[stage]);
  });
  it('keeps ordinary arrow waves at one speed; only slow-fast has authored changes',()=>{
    const volley=scheduleWave(fixtureRun(0,25),new Rng(7),'advanced',1,'arrow-volley');
    expect(new Set(volley.attacks.map(a=>a.direction==='left'||a.direction==='right'?'horizontal':'vertical'))).toEqual(new Set(['horizontal','vertical']));
    for(const id of['arrow-crossfire','arrow-slow-fast','arrow-four-side-relay'] as const){
      const w=scheduleWave(fixtureRun(0,25),new Rng(19),'advanced',1,id);
      expect(w.batches.length).toBeGreaterThanOrEqual(6);expect(new Set(w.batches.map(b=>b.cycle)).size).toBeGreaterThanOrEqual(2);
      for(const b of w.batches)expect(new Set(w.attacks.filter(a=>a.batchId===b.id).map(a=>a.speedClass)).size).toBe(1);
      if(id!=='arrow-slow-fast')expect(new Set(w.attacks.map(a=>a.speedClass)).size).toBe(1);
    }
    const mixed=scheduleWave(fixtureRun(0,25),new Rng(9),'advanced',1,'arrow-slow-fast');
    expect(new Set(mixed.batches.map(b=>b.speedClass))).toContain('slow');expect(new Set(mixed.batches.map(b=>b.speedClass))).toContain('fast');
    const sourceCycles=new Map<string,number>();for(const a of scheduleWave(fixtureRun(0,25),new Rng(13),'advanced',1,'arrow-staircase').attacks){
      const key=`${a.origin.x},${a.origin.y}`;expect(a.id).toBeTruthy();expect(a.warn).toBeGreaterThanOrEqual(sourceCycles.get(key)??0);sourceCycles.set(key,a.active);
    }
    expect(ARROW_FLIGHT).toEqual({slow:.8,medium:.52,fast:.34});
  });
  it('supports lightning batch sizes, multi-tile relays and deduplicated short-line intersections',()=>{
    const counts=new Set<number>();for(let seed=1;seed<=120;seed++)counts.add(scheduleWave(fixtureRun(1,25),new Rng(Math.imul(seed,0x9e3779b1)),'advanced',1,'lightning-scatter').batches[0].attackIds.length);
    for(const n of[4,6,12,16])expect(counts.has(n)).toBe(true);
    const relay=scheduleWave(fixtureRun(1,25),new Rng(31),'advanced',1,'lightning-cluster-relay');
    expect(relay.batches.length).toBeGreaterThanOrEqual(6);expect(relay.attacks.every(a=>a.cells.length>=2)).toBe(true);
    for(const id of['lightning-short-lines','lightning-line-relay'] as const){
      const w=scheduleWave(fixtureRun(1,25),new Rng(12),'advanced',1,id);
      expect(w.attacks.every(a=>a.cells.length>=3&&a.cells.length<=10)).toBe(true);
      expect(w.attacks.every(a=>new Set(a.cells.map(c=>`${c.x},${c.y}`)).size===a.cells.length)).toBe(true);
    }
  });
  it('supports horizontal/vertical flame batches and one reachable central pocket',()=>{
    const orientations=new Set<string>();for(let seed=1;seed<=1200;seed++){
      const multi=scheduleWave(fixtureRun(2,25),new Rng(seed*109),'advanced',1,'flame-multi-line');
      orientations.add([...new Set(multi.attacks.map(a=>a.direction==='left'||a.direction==='right'?'row':'col'))].sort().join('+'));
    }
    expect(orientations).toContain('col+row');expect(orientations).toContain('row');expect(orientations).toContain('col');
    const run=fixtureRun(2,25);run.cell={x:2,y:2};const pocket=scheduleWave(run,new Rng(1),'advanced',1,'flame-central-pocket');
    const active=pocket.attacks[0].active+.1,safe=[];
    for(let y=0;y<6;y++)for(let x=0;x<6;x++){const r=fixtureRun(2);r.cell={x,y};if(!pocket.attacks.some(a=>hits(r,a,active,active)))safe.push(`${x},${y}`);}
    const [,shape,coordinates]=pocket.variant!.match(/^(.*):pocket:(\d,\d)$/)!;
    expect(safe).toContain(coordinates);expect(safe.length).toBeGreaterThan(1);
    expect(shape.startsWith('open')||shape.startsWith('enclosed')).toBe(true);
    const witness=validateWave(run,pocket);expect(witness).not.toBeNull();expect(replayWave(run,pocket,witness!)).toBe(true);
    const relay=scheduleWave(fixtureRun(2,25),new Rng(8),'advanced',1,'flame-sequential-relay');
    expect(relay.batches.length).toBeGreaterThanOrEqual(6);
    expect(relay.batches.every(b=>b.attackIds.length>=1&&b.attackIds.length<=3)).toBe(true);
  });
  it('uses complete sourced flame lanes in every dedicated and mixed pattern',()=>{
    let flames=0;
    for(const id of DEDICATED_IDS.filter(id=>id.startsWith('flame-'))){
      for(let seed=1;seed<=24;seed++){
        const w=scheduleWave(fixtureRun(2,25),new Rng(seed*191),'advanced',1,id);
        for(const a of w.attacks){
          const row=a.direction==='left'||a.direction==='right';
          expect(a.cells).toHaveLength(6);expect(new Set(a.cells.map(c=>row?c.x:c.y))).toEqual(new Set([0,1,2,3,4,5]));
          expect(new Set(a.cells.map(c=>row?c.y:c.x)).size).toBe(1);flames++;
        }
      }
    }
    for(let seed=1;seed<=40;seed++){
      const w=scheduleWave(fixtureRun(4,25),new Rng(seed*997),'advanced',1);
      for(const a of w.attacks.filter(a=>a.family==='flame')){
        const row=a.direction==='left'||a.direction==='right';
        expect(a.cells).toHaveLength(6);expect(new Set(a.cells.map(c=>row?c.x:c.y))).toEqual(new Set([0,1,2,3,4,5]));
        expect(new Set(a.cells.map(c=>row?c.y:c.x)).size).toBe(1);
      }
    }
    expect(flames).toBeGreaterThan(300);
    const invalid=attack(1,'gap','flame','invalid',{x:-.9,y:2},'right',[0,1,3,4,5].map(x=>({x,y:2})),0,1,.5);
    const sim=new Simulation();sim.start();sim.run.stageIndex=2;
    expect(()=>sim.addWave(fixtureWave(2,[invalid]))).toThrow(/complete lane/);
  });
  it('keeps the full-lane 2/4 pocket example and truthful asymmetric channels',()=>{
    const lanes=[1,3],columns=[1,3],burned=(x:number,y:number)=>lanes.includes(y)||columns.includes(x);
    expect(burned(2,2)).toBe(false);expect(burned(0,0)).toBe(false);
    expect([[1,2],[3,2],[2,1],[2,3]].every(([x,y])=>burned(x,y))).toBe(true);
    const shapes=new Set<string>(),shapeSeeds:Record<string,number>={};for(let seed=1;seed<=80;seed++){
      const w=scheduleWave(fixtureRun(2,25),new Rng(seed*131),'advanced',1,'flame-central-pocket');const shape=w.variant!.split(':')[0];shapes.add(shape);shapeSeeds[shape]??=seed*131;
      expect(w.attacks.every(a=>a.cells.length===6)).toBe(true);
    }
    expect(shapes).toContain('open-1x2');expect(shapes).toContain('enclosed-2x2');
    expect(shapes).toContain('enclosed-3x2');expect(shapes).toContain('enclosed-3x3');
    for(const seed of Object.values(shapeSeeds)){
      const r=fixtureRun(2,25),w=scheduleWave(r,new Rng(seed),'advanced',1,'flame-central-pocket');
      const witness=validateWave(r,w);expect(witness,`pocket variant ${w.variant}`).not.toBeNull();expect(replayWave(r,w,witness!)).toBe(true);
    }
    writeFileSync('docs/evidence/v17/v14-pocket-seeds.json',JSON.stringify(shapeSeeds,null,2));
  });
  it('starts stage three with longer flame windup and freezes independently tuned lightning forms',()=>{
    expect(warningAt('flame',pressureAt(0,2),0,2)).toBeCloseTo(1.45);
    expect(warningAt('flame',pressureAt(40,2),0,2)).toBeLessThan(1.0);
    expect(warningAt('lightning',pressureAt(40,1),0,1)).toBeLessThan(warningAt('lightning',pressureAt(0,1),0,1));
    expect(ACTIVE_DURATION.lightning).toBe(.15);expect(LONG_LIGHTNING_DURATION).toBe(.28);
    const strike=scheduleWave(fixtureRun(1,25),new Rng(3),'advanced',1,'lightning-dense-alternation');
    expect(strike.attacks.every(a=>a.lightningMode==='brief'||a.lightningMode==='long')).toBe(true);
    expect(new Set(strike.attacks.map(a=>(a.end-a.active).toFixed(3))).size).toBe(1);
    const sim=new Simulation();sim.start();sim.run.stageIndex=1;sim.addWave(strike);
    const frozen=structuredClone(sim.run.wave!.attacks);sim.advance(.2);expect(sim.run.wave!.attacks).toEqual(frozen);
    expect(sequenceAt(pressureAt(25,1),1)).toBeLessThan(sequenceAt(pressureAt(25)));
    expect(recoveryAt(pressureAt(25,2),2)).toBeLessThan(recoveryAt(pressureAt(25)));
    expect(pressureAt(0,4)).toBeGreaterThan(.5);expect(pressureAt(15,4)).toBeGreaterThan(.9);
    expect(warningAt('flame',pressureAt(0,4),0,4)).toBeLessThan(1.45);
    expect(complexityWeights(pressureAt(0,4),4)[2]).toBeGreaterThan(complexityWeights(pressureAt(0))[2]);
  });
  it('overlaps fragmented ground-fire batches and supports all progressive directions',()=>{
    const fragments=scheduleWave(fixtureRun(3,25),new Rng(7),'advanced',1,'ground-fire-fragments');
    expect(fragments.batches.length).toBeGreaterThanOrEqual(6);
    expect(fragments.attacks[0].end).toBeGreaterThan(fragments.attacks[1].active);
    expect(fragments.attacks.every(a=>a.cells.length>=4)).toBe(true);
    const modes=new Set<string>(),modeSeeds:Record<string,number>={};for(let seed=1;seed<=30;seed++){const mode=scheduleWave(fixtureRun(3,25),new Rng(seed),'advanced',1,'ground-fire-progressive').variant!;modes.add(mode);modeSeeds[mode]??=seed;}
    expect(modes).toEqual(new Set(['edge-center','center-edge','middle-both']));
    writeFileSync('docs/evidence/v17/v13-progressive-seeds.json',JSON.stringify(modeSeeds,null,2));
    for(const id of patternsFor(3,'advanced'))expect(['ground-fire-islands','ground-fire-chain','ground-fire-fragments','ground-fire-progressive']).toContain(id);
  });
  it('composes more than five mixed motifs and replays accepted examples',async()=>{
    const names=new Set<string>();let accepted=0;
    for(let seed=1;seed<=80;seed++){
      if(seed%10===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
      const r=fixtureRun(4,25),w=scheduleWave(r,new Rng(seed*37),'advanced',1);names.add(w.pattern);
      expect(new Set(w.attacks.map(a=>a.family)).size).toBeGreaterThanOrEqual(2);
      const witness=validateWave(r,w);if(witness){accepted++;expect(replayWave(r,w,witness)).toBe(true);}
    }
    expect(names.size).toBeGreaterThan(5);expect(accepted).toBeGreaterThan(20);
  },300000);
});

describe('fairness and release evidence',()=>{
  it('rejects an omnisciently survivable hidden commitment trap',()=>{
    const r=fixtureRun(2),first=attack(1,'visible','flame','trap',{x:-.9,y:2},'right',Array.from({length:6},(_,x)=>({x,y:2})),0,1.2,.55,undefined,0);
    const hidden=attack(1,'hidden','flame','trap',{x:-.9,y:1},'right',Array.from({length:6},(_,x)=>({x,y:1})),.4,.55,.55,undefined,1);
    const w:Wave={...fixtureWave(2,[first,hidden]),batches:[{id:0,phase:0,cycle:0,warn:0,active:1.2,attackIds:['visible']},{id:1,phase:1,cycle:0,warn:.4,active:.55,attackIds:['hidden']}],end:1.75};
    expect(validateWave(r,w)).not.toBeNull();expect(validateDisclosure(r,w)).toBe(false);
  });
  it('leaves correction routes for authored one-second flame warning sequences',()=>{
    for(const id of ['flame-alternating-bands','flame-moving-corridor'] as const){
      const r=fixtureRun(2,25),w=scheduleWave(r,new Rng(107),'advanced',1,id);
      expect(w.batches[1].warn-w.batches[0].warn).toBeCloseTo(1);
      expect(validateDisclosure(r,w)).toBe(true);
    }
  });
  it('keeps each lightning wave uniform, varies locked targets and overlaps random relay warnings',()=>{
    const placements=new Set<string>();
    for(let seed=1;seed<=40;seed++){
      const w=scheduleWave(fixtureRun(1,25),new Rng(seed*177),'advanced',1,'lightning-cluster-relay');
      placements.add(w.attacks[0].cells.map(c=>`${c.x},${c.y}`).join(';'));
      expect(new Set(w.attacks.map(a=>(a.end-a.active).toFixed(3))).size).toBe(1);
      expect(new Set(w.attacks.map(a=>(a.active-a.warn).toFixed(3))).size).toBe(1);
      expect(w.attacks.every(a=>a.lightningMode==='brief'||a.lightningMode==='long')).toBe(true);
    }
    expect(placements.size).toBeGreaterThan(8);
    const relay=scheduleWave(fixtureRun(1,25),new Rng(13),'advanced',1,'lightning-random-relay');
    expect(relay.attacks.every(a=>a.cells.length===1)).toBe(true);
    expect(relay.batches.length).toBeGreaterThanOrEqual(9);
    expect(relay.batches.every(batch=>batch.attackIds.length>=2)).toBe(true);
    for(let i=1;i<relay.batches.length;i++)expect(relay.batches[i].warn).toBeLessThan(relay.attacks.find(a=>a.batchId===relay.batches[i-1].id)!.end);
  });
  it('gates progressive groups after all ignitions while residual fire still burns',()=>{
    const w=scheduleWave(fixtureRun(3,25),new Rng(8),'advanced',1,'ground-fire-progressive');
    for(const cycle of new Set(w.batches.map(b=>b.cycle))){
      const current=w.batches.filter(b=>b.cycle===cycle),next=w.batches.filter(b=>b.cycle===cycle+1);
      if(!next.length)continue;
      const latest=Math.max(...current.map(b=>b.active));expect(next[0].warn).toBeGreaterThan(latest);
      expect(next[0].warn).toBeLessThan(Math.max(...w.attacks.filter(a=>current.some(b=>b.attackIds.includes(a.id))).map(a=>a.end)));
    }
    const chain=scheduleWave(fixtureRun(3,25),new Rng(8),'advanced',1,'ground-fire-chain');expect(chain.attacks.length).toBeLessThanOrEqual(4);
    for(const id of['ground-fire-islands','ground-fire-fragments'] as const){
      const v=scheduleWave(fixtureRun(3,25),new Rng(3),'advanced',1,id);
      for(const b of v.batches)expect(new Set(v.attacks.filter(a=>a.batchId===b.id).map(a=>a.warn)).size).toBe(1);
    }
    const initial=scheduleWave(fixtureRun(3,0),new Rng(1),'simple',1,'ground-fire-islands');
    const later=scheduleWave(fixtureRun(3,40),new Rng(1),'simple',1,'ground-fire-islands');
    expect(initial.attacks[0].active-initial.attacks[0].warn).toBeGreaterThan(later.attacks[0].active-later.attacks[0].warn+.2);
  });
  it('uses exact half-second flame relay warning intervals and shorter harmless recovery',()=>{
    for(const time of[0,25,40]){
      const w=scheduleWave(fixtureRun(2,time),new Rng(5),'advanced',1,'flame-sequential-relay');
      for(let i=1;i<w.batches.length;i++)expect(w.batches[i].warn-w.batches[i-1].warn).toBeCloseTo(.5);
      expect(w.recovery).toBeLessThan(recoveryAt(pressureAt(time,2),2));
      for(const a of w.attacks)expect(a.end-a.active).toBeCloseTo(activeDurationAt('flame',pressureAt(time,2)));
    }
  });
  it('records seeded warning, activation and damage-end timelines',()=>{
    const examples=[
      {stage:0,id:'arrow-staircase'},
      {stage:0,id:'arrow-slow-fast'},
      {stage:1,id:'lightning-random-relay'},
      {stage:2,id:'flame-sequential-relay'},
      {stage:3,id:'ground-fire-islands'},
      {stage:3,id:'ground-fire-fragments'},
      {stage:3,id:'ground-fire-chain'},
      {stage:3,id:'ground-fire-progressive'}
    ] as const;
    const timelines=examples.map(({stage,id})=>{
      const run=fixtureRun(stage,25),wave=scheduleWave(run,new Rng(13),'advanced',1,id);
      const events=wave.attacks.map(a=>({batch:a.batchId,cycle:wave.batches.find(b=>b.id===a.batchId)?.cycle,source:`${a.origin.x},${a.origin.y}`,targetCount:a.cells.length,speed:a.speedClass??null,warning:+a.warn.toFixed(3),activation:+a.active.toFixed(3),damageEnd:+a.end.toFixed(3)}));
      return{pattern:id,events};
    });
    const staircase=timelines[0].events;
    expect(staircase.filter(e=>e.source===staircase[0].source).length).toBeGreaterThan(1);
    expect(new Set(staircase.map(e=>e.speed)).size).toBe(1);
    const progressive=timelines.at(-1)!.events;
    for(let cycle=0;cycle<2;cycle++){
      const current=progressive.filter(e=>e.cycle===cycle),next=progressive.find(e=>e.cycle===cycle+1)!;
      expect(next.warning).toBeGreaterThan(Math.max(...current.map(e=>e.activation)));
      expect(next.warning).toBeLessThan(Math.max(...current.map(e=>e.damageEnd)));
    }
    mkdirSync('docs/evidence/v17',{recursive:true});writeFileSync('docs/evidence/v17/v15-event-timelines.json',JSON.stringify(timelines,null,2));
  });
  it('replays multiple seeded advanced variants of every dedicated ID',async()=>{
    const results:Record<string,{accepted:number;minBatches:number;maxDuration:number}>={};
    for(const id of DEDICATED_IDS){
      await new Promise<void>(resolve=>setTimeout(resolve,0));
      const stage=STAGE_FAMILIES.indexOf(PATTERN_CATALOG.find(d=>d.id===id)!.family);let accepted=0,minBatches=Infinity,maxDuration=0;
      for(let seed=1;seed<=8;seed++){
        const r=fixtureRun(stage,25),w=scheduleWave(r,new Rng(seed*193),'advanced',1,id);
        minBatches=Math.min(minBatches,w.batches.length);maxDuration=Math.max(maxDuration,w.end-r.time);
        const witness=validateWave(r,w);if(witness){accepted++;expect(replayWave(r,w,witness)).toBe(true);}
      }
      results[id]={accepted,minBatches,maxDuration:+maxDuration.toFixed(3)};
      expect(accepted,`pattern ${id}`).toBeGreaterThanOrEqual(2);
      if(!['arrow-volley','lightning-scatter','lightning-short-lines','flame-multi-line','flame-central-pocket','ground-fire-islands','ground-fire-chain','lightning-random-relay'].includes(id))expect(minBatches).toBeGreaterThanOrEqual(6);
    }
    mkdirSync('docs/evidence/v17',{recursive:true});writeFileSync('docs/evidence/v17/v15-catalog-fixtures.json',JSON.stringify(results,null,2));
  },300000);
  it('measures actual selected distribution and wave timing at five stage times',async()=>{
    const summary=[],byStage=[];
    for(const stageTime of[0,5,15,25,40]){
      const stats={stageTime,selected:0,simple:0,moderate:0,advanced:0,batches:0,events:0,duration:0,occupancy:0,slow:0,medium:0,fast:0,rejected:0,fallback:0,failed:0,runtimeMs:0};
      for(let stage=0;stage<5;stage++){
        await new Promise<void>(resolve=>setTimeout(resolve,0));
        const row={stageTime,stage,selected:0,simple:0,moderate:0,advanced:0,batches:0,events:0,overlappingPairs:0,lightningBrief:0,lightningLong:0,flame:0,groundFire:0,warningSum:0,occupancySum:0,rejected:0,fallback:0,failed:0,patterns:{} as Record<string,number>};
        for(let seed=1;seed<=8;seed++){
        const r=fixtureRun(stage,stageTime);r.cell={x:seed%6,y:(seed*3)%6};
        const started=performance.now();
        const selection=nextWave(r,seed*811+stage*1009+stageTime*19);stats.rejected+=selection.rejected;stats.fallback+=Number(selection.fallback);
        row.rejected+=selection.rejected;row.fallback+=Number(selection.fallback);
        stats.runtimeMs+=performance.now()-started;
        if(!selection.wave){stats.failed++;row.failed++;continue;}
        const w=selection.wave;stats.selected++;stats[w.category]++;stats.batches+=w.batches.length;stats.events+=w.attacks.length;stats.duration+=w.end-r.time;
        row.selected++;row[w.category]++;row.batches+=w.batches.length;row.events+=w.attacks.length;row.patterns[w.pattern]=(row.patterns[w.pattern]??0)+1;
        for(let i=0;i<w.attacks.length;i++){
          const a=w.attacks[i];stats.occupancy+=a.end-a.active;row.occupancySum+=a.end-a.active;row.warningSum+=a.active-a.warn;
          if(a.speedClass)stats[a.speedClass]++;
          if(a.family==='lightning')row[a.lightningMode==='long'?'lightningLong':'lightningBrief']++;
          if(a.family==='flame')row.flame++;if(a.family==='groundFire')row.groundFire++;
          for(let j=0;j<i;j++)if(w.attacks[j].active<a.end&&a.active<w.attacks[j].end)row.overlappingPairs++;
        }
        expect(replayWave(r,w,w.witness)).toBe(true);
        }
        byStage.push({...row,meanBatches:+(row.batches/row.selected).toFixed(2),meanWarning:+(row.warningSum/row.events).toFixed(3),meanOccupancy:+(row.occupancySum/row.events).toFixed(3),spacing:+sequenceAt(pressureAt(stageTime,stage),stage).toFixed(3),recovery:+recoveryAt(pressureAt(stageTime,stage),stage).toFixed(3)});
      }
      summary.push({...stats,runtimeMs:+stats.runtimeMs.toFixed(1),meanBatches:+(stats.batches/stats.selected).toFixed(2),meanEvents:+(stats.events/stats.selected).toFixed(2),meanDuration:+(stats.duration/stats.selected).toFixed(3),meanOccupancy:+(stats.occupancy/stats.events).toFixed(3),recovery:+recoveryAt(pressureAt(stageTime)).toFixed(3),spacing:+sequenceAt(pressureAt(stageTime)).toFixed(3)});
    }
    mkdirSync('docs/evidence/v17',{recursive:true});writeFileSync('docs/evidence/v17/v15-pressure-metrics.json',JSON.stringify({aggregate:summary,byStage},null,2));
    expect(summary[0].meanBatches).toBeLessThan(summary[4].meanBatches);
    expect(summary[0].advanced).toBeLessThan(summary[4].advanced);
    console.log(JSON.stringify(summary));
  },300000);
  it('measures complete-wave warning-start cadence through the simulation scheduler',async()=>{
    const samples:{stageTime:number;stage:number;meanStartGap:number;meanActualRecovery:number}[]=[];
    for(const stageTime of[0,5,15,25,40])for(let stage=0;stage<5;stage++){
      await new Promise<void>(resolve=>setTimeout(resolve,0));
      const sim=new Simulation();sim.run=fixtureRun(stage,stageTime);const starts:number[]=[],recoveries:number[]=[];let previous='';
      for(let index=0;index<3;index++){
        const selection=nextWave(sim.run,911+index*97+stage*1009+stageTime*13,previous);
        expect(selection.wave).not.toBeNull();const wave=selection.wave!;previous=wave.pattern;starts.push(sim.run.time);sim.addWave(wave);
        let command=0;while(sim.run.time<wave.end+wave.recovery+1/120&&sim.run.status==='playing'){
          while(command<wave.witness.length&&sim.run.time+1e-8>=wave.witness[command].at)sim.input(wave.witness[command++].direction);
          sim.step();
        }
        expect(sim.run.status).toBe('playing');recoveries.push(sim.releaseWave()!);
      }
      samples.push({stageTime,stage,meanStartGap:+((starts[2]-starts[0])/2).toFixed(3),meanActualRecovery:+(recoveries.reduce((a,b)=>a+b,0)/3).toFixed(3)});
    }
    writeFileSync('docs/evidence/v17/v15-cadence.json',JSON.stringify(samples,null,2));
    const recovery=(t:number)=>samples.filter(s=>s.stageTime===t).reduce((n,s)=>n+s.meanActualRecovery,0)/5;
    expect(recovery(40)).toBeLessThan(recovery(0));
    expect(samples.every(s=>s.meanStartGap>s.meanActualRecovery)).toBe(true);
  },300000);
  it('preserves cartoon death timing and one smoke puff',()=>{
    expect(DEATH_PRESENTATION).toBeGreaterThanOrEqual(1);expect(DEATH_PRESENTATION).toBeLessThanOrEqual(1.3);
    expect(deathPose('lightning',.9).ash).toBeGreaterThan(0);expect(deathPose('lightning',.9).headDrop).toBeGreaterThan(0);
    expect(deathPose('flame',.5).smokePuffs).toBe(1);expect(deathPose('groundFire',.5).smokePuffs).toBe(1);
  });
});

