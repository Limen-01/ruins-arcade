import {describe,it,expect} from 'vitest';
import {attack,Simulation} from '../src/core/simulation';
import {hits} from '../src/core/collision';
import {fixtureRun} from '../src/patterns/fairness';
import type {Attack,Wave} from '../src/core/model';

const wave=(a:Attack,stage:number):Wave=>({id:1,seed:1,stage,category:'simple',archetype:'discrete',pattern:'audit',announced:0,batches:[{id:0,phase:0,cycle:0,warn:a.warn,active:a.active,attackIds:[a.id],speedClass:a.speedClass}],attacks:[a],end:a.end,scored:false,witness:[],pressure:0,recovery:.9,sequenceSpacing:.3});
const local=(family:'lightning'|'groundFire',active=.5,duration=.7)=>attack(1,'local',family,'audit',{x:2,y:2},'down',[{x:2,y:2}],0,active,duration);
const flame=()=>attack(1,'flame','flame','audit',{x:-.9,y:2},'right',Array.from({length:6},(_,x)=>({x,y:2})),0,.5,.8);

describe('damage lifetime audit',()=>{
  for(const [family,stage,duration] of [['lightning',1,.15],['flame',2,.8],['groundFire',3,.8]] as const){
    it(`${family} kills on late entry while visibly active`,()=>{
      const sim=new Simulation();sim.start();sim.run.stageIndex=stage;sim.run.cell={x:2,y:1};
      const a=family==='flame'?flame():local(family,.5,duration);
      sim.addWave(wave(a,stage));sim.advance(family==='lightning'?.54:.75);
      expect(sim.run.status).toBe('playing');sim.input('down');sim.advance(.13);
      expect(sim.run.status).toBe('dead');expect(sim.run.lastHit).toBe(family);
    });
  }
  it('fast arrow hits entry into its current flight position; passed space is safe',()=>{
    const a=attack(1,'arrow','arrow','audit',{x:-.9,y:2},'right',[],0,.5,.8,'slow');
    const sim=new Simulation();sim.start();sim.run.cell={x:3,y:2};sim.addWave(wave(a,0));sim.advance(.9);sim.input('left');sim.advance(.13);
    expect(sim.run.status).toBe('dead');
    const old=fixtureRun();old.cell={x:0,y:2};old.time=1.1;expect(hits(old,a,1.1,1.2)).toBe(false);
  });
  it('keeps damage through the end boundary, allows crossing after end, and detects re-entry trajectories',()=>{
    const a=flame(),run=fixtureRun(2);run.cell={x:2,y:1};run.move={from:{x:2,y:1},to:{x:2,y:2},start:1.10,end:1.22};
    expect(hits(run,a,1.17,1.20)).toBe(true);
    run.move={from:{x:2,y:2},to:{x:2,y:1},start:1.20,end:1.32};expect(hits(run,a,1.20,1.26)).toBe(true);
    run.move={from:{x:2,y:1},to:{x:2,y:2},start:1.31,end:1.43};expect(hits(run,a,1.34,1.38)).toBe(false);
  });
  it('checks all overlapping mixed-stage events until each end',()=>{
    const sim=new Simulation();sim.start();sim.run.stageIndex=4;sim.run.cell={x:2,y:1};
    const fire=local('groundFire',.5,.8),lightning=attack(1,'lightning','lightning','audit',{x:5,y:5},'down',[{x:5,y:5}],0,.5,.15);
    const w=wave(fire,4);w.attacks=[lightning,fire];w.batches[0].attackIds=['lightning','local'];w.end=1.3;sim.addWave(w);
    sim.advance(.8);expect(sim.run.status).toBe('playing');sim.input('down');sim.advance(.13);
    expect(sim.run.status).toBe('dead');expect(sim.run.lastHit).toBe('groundFire');
  });
  it('long visible lightning strike damages throughout its interval while brief strike expires',()=>{
    const field=attack(1,'long','lightning','audit',{x:2,y:2},'down',[{x:2,y:2}],0,.5,.28,undefined,0,'long');
    const sim=new Simulation();sim.start();sim.run.stageIndex=1;sim.run.cell={x:2,y:1};sim.addWave(wave(field,1));sim.advance(.6);
    expect(sim.run.status).toBe('playing');sim.input('down');sim.advance(.13);expect(sim.run.status).toBe('dead');
    const r=fixtureRun(1);r.cell={x:2,y:2};r.move={from:{x:2,y:2},to:{x:2,y:1},start:.75,end:.87};
    expect(hits(r,field,.75,.84)).toBe(true);
    r.move={from:{x:2,y:1},to:{x:2,y:2},start:.65,end:.77};expect(hits(r,field,.70,.75)).toBe(true);
    const instant=attack(1,'brief','lightning','audit',{x:2,y:2},'down',[{x:2,y:2}],0,.5,.15,undefined,0,'brief');
    expect(hits(r,instant,.70,.75)).toBe(false);
    expect(hits(r,field,.78,.78)).toBe(true);expect(hits(r,field,.79,.79)).toBe(false);
  });
  it('mixed long strike and full-lane flame retain damage until their ends',()=>{
    const sim=new Simulation();sim.start();sim.run.stageIndex=4;sim.run.cell={x:2,y:1};
    const electric=attack(1,'long','lightning','mixed',{x:2,y:2},'down',[{x:2,y:2}],0,.5,.28,undefined,0,'long');
    const lane=flame();lane.id='lane';lane.active=.6;lane.end=1.4;
    const w=wave(electric,4);w.attacks=[electric,lane];w.batches[0].attackIds=['long','lane'];w.end=1.4;sim.addWave(w);
    sim.advance(.6);sim.input('down');sim.advance(.13);expect(sim.run.status).toBe('dead');expect(sim.run.wavesCleared).toBe(0);
  });
});
