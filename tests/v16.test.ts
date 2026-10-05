import {describe,it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {activeDurationAt,pressureAt,warningAt} from '../src/config/balance';
import {hits} from '../src/core/collision';
import {Rng,chooseCategory,scheduleWave} from '../src/patterns/catalog';
import {fixtureRun,nextWave,replayWave,validateDisclosure,validateWave,waveTargetSignature} from '../src/patterns/fairness';
import type {Attack,Wave} from '../src/core/model';

const out='docs/evidence/v17';mkdirSync(out,{recursive:true});
const axis=(a:Attack)=>a.direction==='left'||a.direction==='right'?'row':'col';
const target=(w:Wave)=>[...new Set(w.attacks.flatMap(a=>a.cells.map(c=>`${c.x+1},${c.y+1}`)))].sort().join('|');

describe('v1.6 spatial geometry and timing',()=>{
  it('keeps finite multi-location point-strike relays with overlapping warnings',()=>{
    const timings=[];
    for(const [category,expected] of [['simple',6],['moderate',9],['advanced',12]] as const){
      const w=scheduleWave(fixtureRun(1,40),new Rng(117),category,1,'lightning-random-relay');
      expect(w.batches).toHaveLength(expected);
      expect(w.attacks.every(a=>a.cells.length===1)).toBe(true);
      expect(w.batches.every(b=>b.attackIds.length>=2)).toBe(true);
      for(let i=1;i<w.batches.length;i++)expect(w.batches[i].warn).toBeLessThan(w.attacks.find(a=>a.batchId===w.batches[i-1].id)!.end);
      expect(new Set(w.attacks.map(a=>(a.active-a.warn).toFixed(4))).size).toBe(1);
      expect(new Set(w.attacks.map(a=>(a.end-a.active).toFixed(4))).size).toBe(1);
      timings.push({category,strikes:w.attacks.length,batches:w.batches.length,warning:+(w.attacks[0].active-w.attacks[0].warn).toFixed(3),active:+(w.attacks[0].end-w.attacks[0].active).toFixed(3),warningGap:+(w.batches[1].warn-w.batches[0].warn).toFixed(3),waveDamageEnd:+w.end.toFixed(3)});
    }
    writeFileSync(`${out}/relay-timings.json`,JSON.stringify(timings,null,2));
  });
  it('varies lightning locations and both short-line axes across all six one-based rows and columns',()=>{
    const rows=new Set<number>(),cols=new Set<number>(),lineRows=new Set<number>(),lineCols=new Set<number>(),examples:{row3?:number;row6?:number;row3Batch?:number;row6Batch?:number}={};
    for(let seed=1;seed<=150;seed++)for(const id of ['lightning-scatter','lightning-cluster-relay','lightning-short-lines','lightning-line-relay','lightning-dense-alternation'] as const){
      const w=scheduleWave(fixtureRun(1,25),new Rng(seed*73),'advanced',1,id);
      for(const a of w.attacks)for(const c of a.cells){rows.add(c.y+1);cols.add(c.x+1);if(id.includes('line')){lineRows.add(c.y+1);lineCols.add(c.x+1);if(id==='lightning-short-lines'&&c.y===2&&examples.row3===undefined){examples.row3=seed*73;examples.row3Batch=a.batchId;}if(id==='lightning-short-lines'&&c.y===5&&examples.row3!==seed*73&&examples.row6===undefined){examples.row6=seed*73;examples.row6Batch=a.batchId;}}}
    }
    expect([...rows].sort()).toEqual([1,2,3,4,5,6]);expect([...cols].sort()).toEqual([1,2,3,4,5,6]);
    expect([...lineRows].sort()).toEqual([1,2,3,4,5,6]);expect([...lineCols].sort()).toEqual([1,2,3,4,5,6]);
    writeFileSync(`${out}/lightning-line-examples.json`,JSON.stringify(examples,null,2));
  });
  it('applies five-line parallel rules, weighted four-line crossing and arbitrary omitted lanes',()=>{
    const omitted=new Set<number>(),counts:Record<number,number>={},mixed4= {count:0,total:0},parallelAdj= {yes:false,separated:false},examples:{separated?:number;mixed?:number}={};
    for(let seed=1;seed<=1200;seed++){
      const w=scheduleWave(fixtureRun(2,40),new Rng(seed*109),'advanced',1,'flame-multi-line'),attacks=w.attacks;
      counts[attacks.length]=(counts[attacks.length]??0)+1;
      const orientations=new Set(attacks.map(axis));
      if(attacks.length===5){expect(orientations.size).toBe(1);const used=new Set(attacks.map(a=>axis(a)==='row'?a.cells[0].y:a.cells[0].x));expect(used.size).toBe(5);omitted.add([0,1,2,3,4,5].find(i=>!used.has(i))!+1);}
      if(attacks.length===4){mixed4.total++;mixed4.count+=Number(orientations.size===2);if(orientations.size===2)examples.mixed??=seed*109;}
      if(orientations.size===1){const indexes=attacks.map(a=>axis(a)==='row'?a.cells[0].y:a.cells[0].x).sort((a,b)=>a-b);parallelAdj.yes||=indexes.some((v,i)=>i>0&&v-indexes[i-1]===1);const separated=indexes.some((v,i)=>i>0&&v-indexes[i-1]>1);parallelAdj.separated||=separated;if(separated&&attacks.length>=3)examples.separated??=seed*109;}
      for(const a of attacks)expect(new Set(a.cells.map(c=>axis(a)==='row'?c.x:c.y)).size).toBe(6);
    }
    expect([...omitted].sort()).toEqual([1,2,3,4,5,6]);expect(mixed4.count).toBeLessThan(mixed4.total/3);
    expect(parallelAdj.yes&&parallelAdj.separated).toBe(true);expect(counts[5]).toBeGreaterThan(0);
    writeFileSync(`${out}/flame-volley-raw.json`,JSON.stringify({counts,mixed4,omitted:[...omitted].sort(),parallelAdj,examples},null,2));
  });
  it('builds horizontal and vertical progressive paths and gates all-path ignition',()=>{
    const w=scheduleWave(fixtureRun(3,25),new Rng(71),'advanced',1,'ground-fire-progressive');
    const first=w.batches.filter(b=>b.cycle===0),second=w.batches.find(b=>b.cycle===1)!;
    expect(first).toHaveLength(3);expect(first[0].attackIds).toHaveLength(1);
    const cells=w.attacks[0].cells;expect(new Set(cells.map(c=>c.x)).size).toBeGreaterThan(1);expect(new Set(cells.map(c=>c.y)).size).toBeGreaterThan(1);
    expect(second.warn).toBeGreaterThan(Math.max(...first.map(b=>b.active)));
    expect(second.warn).toBeLessThan(Math.max(...w.attacks.slice(0,3).map(a=>a.end)));
  });
  it('accepts an interior-omitted five-line flame volley without duplicate firing',()=>{
    let chosen:Wave|null=null,selectedSeed=0;
    for(let seed=1;seed<=160&&!chosen;seed++){
      const run=fixtureRun(2,40),w=scheduleWave(run,new Rng(seed*29),'advanced',1,'flame-multi-line');
      if(w.attacks.length!==5)continue;
      const row=axis(w.attacks[0])==='row',used=new Set(w.attacks.map(a=>row?a.cells[0].y:a.cells[0].x));
      const omitted=[0,1,2,3,4,5].find(i=>!used.has(i))!;
      if(omitted===0||omitted===5)continue;
      const witness=validateWave(run,w);if(!witness||!validateDisclosure(run,w))continue;
      expect(replayWave(run,w,witness)).toBe(true);chosen=w;selectedSeed=seed*29;
    }
    expect(chosen).not.toBeNull();
    const w=chosen!;expect(new Set(w.attacks.map(a=>a.id)).size).toBe(5);
    expect(new Set(w.attacks.map(a=>`${a.origin.x},${a.origin.y}`)).size).toBe(5);
    writeFileSync(`${out}/five-line-accepted.json`,JSON.stringify({seed:selectedSeed,stageTime:40,axis:axis(w.attacks[0]),omittedOneBased:[0,1,2,3,4,5].find(i=>!new Set(w.attacks.map(a=>axis(w.attacks[0])==='row'?a.cells[0].y:a.cells[0].x)).has(i))!+1,warning:w.attacks[0].active-w.attacks[0].warn,active:w.attacks[0].end-w.attacks[0].active},null,2));
  });
  it('shortens ordinary late warnings and active damage independently while preserving the opening',()=>{
    const table=[];
    for(const stage of[1,2,3,4])for(const time of[0,15,40,80]){
      const p=pressureAt(time,stage),family=stage===1?'lightning':stage===2?'flame':'groundFire';
      table.push({stage,time,pressure:+p.toFixed(3),warning:+warningAt(family,p,0,stage).toFixed(3),active:+activeDurationAt(family,p).toFixed(3)});
    }
    for(const stage of[1,2,3]){const values=table.filter(v=>v.stage===stage);expect(values[0].warning).toBeGreaterThan(values.at(-1)!.warning+.35);expect(values[0].active).toBeGreaterThan(values.at(-1)!.active);expect(values.at(-1)!.warning).toBeLessThan(.65);}
    expect(table.find(v=>v.stage===2&&v.time===0)?.warning).toBe(1.45);
    writeFileSync(`${out}/timing-curve.json`,JSON.stringify(table,null,2));
  });
  it('keeps late-entry and re-entry lethal through the shortened visible active windows',()=>{
    for(const [stage,pattern] of [[1,'lightning-scatter'],[2,'flame-multi-line'],[3,'ground-fire-islands']] as const){
      const w=scheduleWave(fixtureRun(stage,40),new Rng(604),stage===2?'simple':'advanced',1,pattern);
      const a=w.attacks[0],r=fixtureRun(stage,40);r.cell=a.cells[0];
      expect(hits(r,a,a.active+.01,a.active+.02)).toBe(true);
      expect(hits(r,a,a.active+.04,a.active+.05)).toBe(true);
      expect(hits(r,a,a.end+.01,a.end+.02)).toBe(false);
    }
  });
  it('measures raw candidates against accepted and simulation-played spatial distributions',async()=>{
    const stats=[];
    for(const stage of[0,1,2,3,4])for(const time of[0,25,40]){
      await new Promise<void>(resolve=>setTimeout(resolve,0));
      const row={stage:stage+1,time,raw:0,accepted:0,played:0,rejected:0,fallback:0,failed:0,rawCells:Array(36).fill(0) as number[],playedCells:Array(36).fill(0) as number[],rawRows:Array(6).fill(0) as number[],playedRows:Array(6).fill(0) as number[],rawCols:Array(6).fill(0) as number[],playedCols:Array(6).fill(0),orientation:{horizontal:0,vertical:0},families:{arrow:0,lightning:0,flame:0,groundFire:0},rawFamilies:{arrow:0,lightning:0,flame:0,groundFire:0},repeatedTargets:0,adjacentSourceReuse:0,longestLightningAbsence:0,timingExtensions:0,warningSum:0,activeSum:0,events:0,rawPatterns:{} as Record<string,number>,patterns:{} as Record<string,number>};
      let previous='',previousTarget='',previousSignature='',absence=0;
      for(let seed=1;seed<=8;seed++){
        const run=fixtureRun(stage,time);run.cell={x:(seed*5)%6,y:(seed*7)%6};
        const rawRng=new Rng(9001+seed*119+stage*701+time*13),raw=scheduleWave(run,rawRng,chooseCategory(time,rawRng,stage),1);row.raw++;
        row.rawPatterns[raw.pattern]=(row.rawPatterns[raw.pattern]??0)+1;
        for(const a of raw.attacks){row.rawFamilies[a.family]++;for(const c of a.cells){row.rawCells[c.y*6+c.x]++;row.rawRows[c.y]++;row.rawCols[c.x]++;}}
        const chosen=nextWave(run,9001+seed*119+stage*701+time*13,previous,previousSignature);row.rejected+=chosen.rejected;row.fallback+=Number(chosen.fallback);
        if(!chosen.wave){row.failed++;continue;}
        const w=chosen.wave;row.accepted++;previous=w.pattern;previousSignature=waveTargetSignature(w);row.patterns[w.pattern]=(row.patterns[w.pattern]??0)+1;
        if(target(w)===previousTarget)row.repeatedTargets++;previousTarget=target(w);
        if(stage===4){if(w.attacks.some(a=>a.family==='lightning'))absence=0;else absence++;row.longestLightningAbsence=Math.max(row.longestLightningAbsence,absence);}
        expect(replayWave(run,w,w.witness)).toBe(true);row.played++;
        for(let i=1;i<w.attacks.length;i++){const a=w.attacks[i],prior=w.attacks[i-1];if(a.batchId!==prior.batchId&&a.family===prior.family&&a.origin.x===prior.origin.x&&a.origin.y===prior.origin.y)row.adjacentSourceReuse++;}
        for(const a of w.attacks){row.families[a.family]++;row.events++;row.warningSum+=a.active-a.warn;row.activeSum+=a.end-a.active;
          if(a.active-a.warn>warningAt(a.family,w.pressure,0,stage)+.05)row.timingExtensions++;
          if(a.family==='lightning'&&w.pattern.includes('line')){const xs=new Set(a.cells.map(c=>c.x)),ys=new Set(a.cells.map(c=>c.y));if(xs.size>1)row.orientation.horizontal++;if(ys.size>1)row.orientation.vertical++;}
          for(const c of a.cells){row.playedCells[c.y*6+c.x]++;row.playedRows[c.y]++;row.playedCols[c.x]++;}}
      }
      stats.push(row);
    }
    writeFileSync(`${out}/candidate-accepted-played.json`,JSON.stringify({sample:'8 seeds x 5 stages x 3 times; one wave per state, with previous-pattern hint',stats},null,2));
    expect(stats.every(row=>row.failed===0)).toBe(true);
    expect(stats.filter(row=>row.stage===5).reduce((n,row)=>n+row.families.lightning,0)).toBeGreaterThan(0);
  },300000);
  it('audits accepted lightning placement and mixed-stage presence on larger independent seed sets',async()=>{
    const make=()=>({waves:0,events:0,rows:Array(6).fill(0) as number[],cols:Array(6).fill(0) as number[],cells:Array(36).fill(0) as number[],horizontal:0,vertical:0,rejected:0,fallback:0});
    const lightning={raw:make(),played:make()},mixed={rawLightningWaves:0,playedLightningWaves:0,playedLightningEvents:0,longestAbsence:0,rejected:0,fallback:0};
    let previous='',signature='',absence=0;
    for(let i=1;i<=100;i++){
      if(i%10===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
      const stage=i<=60?1:4,time=i%2?25:40,seed=0x6a09e667+i*7919,run=fixtureRun(stage,time);run.cell={x:(i*3)%6,y:(i*5)%6};
      const rng=new Rng(seed),raw=scheduleWave(run,rng,chooseCategory(time,rng,stage),1);
      const selected=nextWave(run,seed,stage===4?previous:'',stage===4?signature:'');
      expect(selected.wave).not.toBeNull();const wave=selected.wave!;expect(replayWave(run,wave,wave.witness)).toBe(true);
      if(stage===1){
        lightning.raw.waves++;lightning.played.waves++;lightning.played.rejected+=selected.rejected;lightning.played.fallback+=Number(selected.fallback);
        for(const [sample,bucket] of [[raw,lightning.raw],[wave,lightning.played]] as const)for(const a of sample.attacks){
          bucket.events++;const xs=new Set(a.cells.map(c=>c.x)),ys=new Set(a.cells.map(c=>c.y));
          if(sample.pattern.includes('line')){if(xs.size>1)bucket.horizontal++;if(ys.size>1)bucket.vertical++;}
          for(const c of a.cells){bucket.rows[c.y]++;bucket.cols[c.x]++;bucket.cells[c.y*6+c.x]++;}
        }
      }else{
        mixed.rawLightningWaves+=Number(raw.attacks.some(a=>a.family==='lightning'));
        const count=wave.attacks.filter(a=>a.family==='lightning').length;
        mixed.playedLightningWaves+=Number(count>0);mixed.playedLightningEvents+=count;
        absence=count?0:absence+1;mixed.longestAbsence=Math.max(mixed.longestAbsence,absence);
        mixed.rejected+=selected.rejected;mixed.fallback+=Number(selected.fallback);
        previous=wave.pattern;signature=waveTargetSignature(wave);
      }
    }
    expect(lightning.played.rows.every(n=>n>0)).toBe(true);expect(lightning.played.cols.every(n=>n>0)).toBe(true);expect(lightning.played.cells.every(n=>n>0)).toBe(true);
    expect(lightning.played.horizontal).toBeGreaterThan(0);expect(lightning.played.vertical).toBeGreaterThan(0);
    expect(mixed.playedLightningWaves).toBeGreaterThan(15);
    writeFileSync(`${out}/focused-spatial-audit.json`,JSON.stringify({sample:'60 independent lightning waves and 40 sequential mixed-stage selections at 25/40 seconds',lightning,mixed},null,2));
  },300000);
});
