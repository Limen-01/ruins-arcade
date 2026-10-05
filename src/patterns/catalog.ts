import {Archetype,ArrowSpeed,Attack,Batch,Category,Cell,Direction,Family,Run,STAGE_FAMILIES,Wave} from '../core/model';
import {attack} from '../core/simulation';
import {ACTIVE_DURATION,ARROW_SPEEDS,CATEGORIES,LONG_LIGHTNING_DURATION,activeDurationAt,arrowFlightAt,arrowWeights,chooseWeighted,complexityWeights,pressureAt,recoveryAt,sequenceAt,warningAt} from '../config/balance';

export const DEDICATED_IDS=[
  'arrow-volley','arrow-staircase','arrow-four-side-relay','arrow-crossfire','arrow-slow-fast',
  'lightning-scatter','lightning-cluster-relay','lightning-short-lines','lightning-line-relay','lightning-dense-alternation','lightning-random-relay',
  'flame-multi-line','flame-alternating-bands','flame-moving-corridor','flame-central-pocket','flame-sequential-relay',
  'ground-fire-islands','ground-fire-chain','ground-fire-fragments','ground-fire-progressive'
] as const;
export type DedicatedPattern=typeof DEDICATED_IDS[number];
export type Pattern=DedicatedPattern|`mixed:${string}+${string}`;
type Definition={id:DedicatedPattern;family:Family;archetype:Archetype;phases:string[];batches:[number,number];transforms:string};
export const PATTERN_CATALOG:readonly Definition[]=DEDICATED_IDS.map((id,index)=>{
  const family:Family=index<5?'arrow':index<11?'lightning':index<16?'flame':'groundFire';
  const archetype:Archetype=id.endsWith('volley')||id.endsWith('islands')?'discrete':id.includes('relay')||id.includes('staircase')||id.includes('chain')||id.includes('progressive')?'sequential':'grouped';
  const phases=id.split('-').slice(1);return{id,family,archetype,phases,batches:[index===0||index===5||index===11||index===16?1:3,id==='flame-central-pocket'?8:12],transforms:'bounded translation, reflection and row/column rotation'};
});
export class Rng{
  constructor(public state:number){let x=(state>>>0)||0x9e3779b9;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;this.state=x>>>0;}
  next():number{let x=this.state;x^=x<<13;x^=x>>>17;x^=x<<5;this.state=x>>>0;return this.state/4294967296;}
  int(max:number):number{return Math.floor(this.next()*max);}
  pick<T>(values:readonly T[]):T{return values[this.int(values.length)];}
}
const cell=(x:number,y:number):Cell=>({x,y});
const wrap=(n:number)=>(n+60)%6;
const clamp=(n:number,min=0,max=5)=>Math.max(min,Math.min(max,n));
const unique=(cells:Cell[]):Cell[]=>[...new Map(cells.map(c=>[`${c.x},${c.y}`,c])).values()];
const shuffled=<T>(rng:Rng,values:readonly T[]):T[]=>{const result=[...values];for(let i=result.length-1;i>0;i--){const j=rng.int(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;};
const lineCells=(axis:'row'|'col',index:number,reverse=false):Cell[]=>Array.from({length:6},(_,k)=>axis==='row'?cell(reverse?5-k:k,index):cell(index,reverse?5-k:k));
const patch=(x:number,y:number,w:number,h:number):Cell[]=>Array.from({length:w*h},(_,i)=>cell(clamp(x,0,6-w)+i%w,clamp(y,0,6-h)+Math.floor(i/w)));
const segment=(axis:'row'|'col',index:number,start:number,length:number):Cell[]=>Array.from({length},(_,i)=>axis==='row'?cell(clamp(start+i),index):cell(index,clamp(start+i)));
type Spec={family:Family;axis?:'row'|'col';index?:number;reverse?:boolean;cells?:Cell[]};
const lane=(family:'arrow'|'flame',axis:'row'|'col',index:number,reverse=false):Spec=>({family,axis,index:wrap(index),reverse});
const local=(family:'lightning'|'groundFire',cells:Cell[]):Spec=>({family,cells:unique(cells)});
export function chooseCategory(stageTime:number,rng:Rng,stage=0):Category{return chooseWeighted(CATEGORIES,complexityWeights(pressureAt(stageTime,stage),stage),rng.next());}
export function patternsFor(stage:number,category:Category):DedicatedPattern[]{
  const pools:DedicatedPattern[][]=[
    category==='simple'?['arrow-volley']:category==='moderate'?['arrow-volley','arrow-staircase','arrow-four-side-relay']:['arrow-crossfire','arrow-slow-fast','arrow-four-side-relay','arrow-staircase'],
    category==='simple'?['lightning-scatter','lightning-random-relay']:category==='moderate'?['lightning-scatter','lightning-cluster-relay','lightning-short-lines','lightning-random-relay']:['lightning-line-relay','lightning-dense-alternation','lightning-cluster-relay','lightning-random-relay'],
    category==='simple'?['flame-multi-line','flame-central-pocket']:category==='moderate'?['flame-multi-line','flame-alternating-bands','flame-central-pocket']:['flame-moving-corridor','flame-central-pocket','flame-sequential-relay','flame-multi-line','flame-central-pocket'],
    category==='simple'?['ground-fire-islands']:category==='moderate'?['ground-fire-islands','ground-fire-chain']:['ground-fire-fragments','ground-fire-progressive','ground-fire-chain']
  ];
  return stage===4?pools.flat():pools[stage];
}
class Builder{
  attacks:Attack[]=[];batches:Batch[]=[];variant='';readonly pressure:number;readonly spacing:number;
  arrowSpeed?:ArrowSpeed;lightningDuration?:number;allowSpeedChanges=false;
  constructor(readonly run:Run,readonly rng:Rng,readonly waveId:number,readonly pattern:string,readonly extraWarning:number){this.pressure=pressureAt(run.stageTime,run.stageIndex);this.spacing=sequenceAt(this.pressure,run.stageIndex);}
  add(offset:number,specs:Spec[],phase:number,cycle:number,forcedSpeed?:ArrowSpeed,groundDuration?:number):void{
    const batchId=this.batches.length,when=this.run.time+offset;
    const speed=specs.some(s=>s.family==='arrow')?(this.allowSpeedChanges&&forcedSpeed?forcedSpeed:(this.arrowSpeed??=chooseWeighted(ARROW_SPEEDS,arrowWeights(this.pressure),this.rng.next()))):undefined;
    if(specs.some(s=>s.family==='lightning'))this.lightningDuration??=this.rng.next()<.35+.25*this.pressure?LONG_LIGHTNING_DURATION:ACTIVE_DURATION.lightning;
    const created=specs.map((spec,i)=>{
      const id=`b${batchId}e${i}`,axis=spec.axis??'row',reverse=spec.reverse??false,index=spec.index??0;
      const cells=spec.cells??lineCells(axis,index,reverse);
      const origin=spec.cells?spec.cells[0]:axis==='row'?cell(reverse?5.9:-.9,index):cell(index,reverse?5.9:-.9);
      const direction:Direction=spec.cells?'down':axis==='row'?(reverse?'left':'right'):(reverse?'up':'down');
      const denseLead=spec.family==='flame'?specs.filter(s=>s.family==='flame').length>=5?.20:specs.filter(s=>s.family==='flame').length>=4?.10:0:spec.family==='arrow'&&specs.filter(s=>s.family==='arrow').length>=3?.10:0;
      const active=when+warningAt(spec.family,this.pressure,this.extraWarning+denseLead,this.run.stageIndex);
      const duration=spec.family==='arrow'?arrowFlightAt(speed!,this.pressure,this.allowSpeedChanges):spec.family==='groundFire'?Math.max(.32,(groundDuration??ACTIVE_DURATION.groundFire)-.18*this.pressure):spec.family==='lightning'?activeDurationAt('lightning',this.pressure,this.lightningDuration===LONG_LIGHTNING_DURATION):activeDurationAt('flame',this.pressure);
      return attack(this.waveId,id,spec.family,this.pattern,origin,direction,cells,when,active,duration,speed,batchId,spec.family==='lightning'?(this.lightningDuration===LONG_LIGHTNING_DURATION?'long':'brief'):undefined);
    });
    this.attacks.push(...created);
    this.batches.push({id:batchId,phase,cycle,warn:when,active:Math.min(...created.map(a=>a.active)),attackIds:created.map(a=>a.id),speedClass:speed});
  }
  lastOffset():number{return this.batches.length?this.batches[this.batches.length-1].warn-this.run.time:0;}
}
function buildDedicated(b:Builder,id:DedicatedPattern,category:Category,start=0):void{
  const rng=b.rng,p=b.pressure,s=id==='ground-fire-progressive'?.2:id==='arrow-slow-fast'?.58-.13*p:id==='arrow-staircase'||id==='arrow-four-side-relay'||id==='arrow-crossfire'?.58-.13*p:id==='flame-alternating-bands'||id==='flame-moving-corridor'?1:.5,axis=rng.pick(['row','col'] as const),other=axis==='row'?'col':'row',flip=rng.int(2)===1;
  const base=rng.int(6),c=cell(rng.int(6),rng.int(6));
  const count=category==='advanced'?Math.min(id.startsWith('arrow-')?14:10,6+Math.floor(p*(id.startsWith('arrow-')?8:4))):category==='moderate'?3+Math.floor(p*(id.startsWith('arrow-')?4:2)):1;
  const add=(n:number,specs:Spec[],phase=n%3,cycle=Math.floor(n/3),speed?:ArrowSpeed,duration?:number)=>b.add(start+n*s,specs,phase,cycle,speed,duration);
  switch(id){
    case'arrow-volley':{
      const lanes=category==='simple'?1:category==='moderate'?2+Number(p>.55):3+Math.floor(p*2);
      add(0,Array.from({length:lanes},(_,i)=>lane('arrow',i%2?other:axis,base+i*2,flip!==Boolean(i%2))),0,0);break;
    }
    case'arrow-staircase':for(let n=0;n<count;n++)add(n,[lane('arrow',axis,base+n%4*(flip?-1:1),flip),...(category==='advanced'&&n%4===3?[lane('arrow',other,base+Math.floor(n/4),!flip)]:[])],n%4,Math.floor(n/4));break;
    case'arrow-four-side-relay':for(let n=0;n<Math.max(4,count);n++){
      const side=n%4;add(n,[lane('arrow',side<2?'row':'col',base+Math.floor(n/4)%3,side===1||side===3),...(category==='advanced'&&n%4===3?[lane('arrow','row',base+Math.floor(n/4)+2,!flip)]:[])],side,Math.floor(n/4));
    }break;
    case'arrow-crossfire':for(let n=0;n<Math.max(6,count);n++){
      const phase=n%3,cycle=Math.floor(n/3),row=base+cycle,col=base+cycle*2;
      add(n,phase===0?[lane('arrow','row',row,flip),...(p>.55?[lane('arrow','row',row+2,!flip)]:[])]:phase===1?[lane('arrow','col',col,!flip),...(p>.55?[lane('arrow','col',col+2,flip)]:[])]:[lane('arrow','row',row+3,flip),lane('arrow','col',col+3,!flip),...(p>.65?[lane('arrow','row',row+1,!flip)]:[])],phase,cycle);
    }break;
    case'arrow-slow-fast':b.allowSpeedChanges=true;for(let n=0;n<Math.max(6,count);n++){
      const phase=n%2,cycle=Math.floor(n/2),index=base+cycle;
      add(n,phase===0?[lane('arrow','row',index,flip)]:[lane('arrow','col',index+1,!flip),lane('arrow','row',index+2,!flip)],phase,cycle,phase===0?'slow':cycle%2?'medium':'fast');
    }break;
    case'lightning-scatter':{
      const size=category==='simple'?rng.pick([2,2,3,4]):rng.pick(category==='moderate'?[2,4,6]:[4,6,12,16]);
      const cells=Array.from({length:36},(_,i)=>cell(i%6,Math.floor(i/6)));
      for(let i=cells.length-1;i>0;i--){const j=rng.int(i+1);[cells[i],cells[j]]=[cells[j],cells[i]];}
      for(let n=0;n<(category==='advanced'?3:category==='moderate'?2:1);n++){
        const start=(n*size)%36,rotated=[...cells.slice(start),...cells.slice(0,start)];
        add(n,rotated.slice(0,size).map(target=>local('lightning',[target])),n,n);
      }
      break;
    }
    case'lightning-cluster-relay':for(let n=0;n<Math.max(4,count);n++){
      const w=n%3===0?2:n%3===1?2:3,h=n%3===0?1:2;
      add(n,[local('lightning',patch(rng.int(7-w),rng.int(7-h),w,h))],n%3,Math.floor(n/3));
    }break;
    case'lightning-short-lines':for(let n=0;n<(category==='advanced'?3:category==='moderate'?2:1);n++){
      const length=3+(n%3),row=segment('row',wrap(base+n),rng.int(7-length),length),col=segment('col',wrap(base+2+n),rng.int(7-length),length);
      add(n,[local('lightning',unique([...row,...col]))],n,0);
    }break;
    case'lightning-line-relay':for(let n=0;n<Math.max(6,count);n++){
      const length=3+n%3,phase=n%3,row=segment('row',wrap(base+Math.floor(n/3)),rng.int(7-length),length),col=segment('col',wrap(base+2+Math.floor(n/3)),rng.int(7-length),length);
      add(n,[local('lightning',phase===0?row:phase===1?col:unique([...row,...col]))],phase,Math.floor(n/3));
    }break;
    case'lightning-dense-alternation':{
      const near=rng.int(5),far=rng.int(5),startY=rng.int(5),rotation=rng.int(2);
      for(let n=0;n<Math.max(6,count);n++){
        const phase=n%2,cycle=Math.floor(n/2),first=patch(phase?far:near,(startY+cycle)%5,2,2),second=patch(phase?near:far,(startY+cycle+2)%5,2,2);
        add(n,[local('lightning',rotation?unique([...first,...second]).map(v=>cell(v.y,v.x)):unique([...first,...second]))],phase,cycle);
      }
      break;
    }
    case'lightning-random-relay':{
      const number=category==='simple'?6:category==='moderate'?9:12;
      b.lightningDuration??=rng.next()<.5?ACTIVE_DURATION.lightning:LONG_LIGHTNING_DURATION;
      const spacing=.46-.18*p;
      let previous='';
      for(let n=0;n<number;n++){
        const candidates=shuffled(rng,Array.from({length:36},(_,i)=>cell(i%6,Math.floor(i/6))));
        const size=category==='simple'?2:category==='moderate'?2+rng.int(2):2+rng.int(3);
        const targets=candidates.filter(v=>`${v.x},${v.y}`!==previous).slice(0,size);
        previous=`${targets[0].x},${targets[0].y}`;
        b.add(start+n*spacing,targets.map(target=>local('lightning',[target])),n%3,Math.floor(n/3));
      }
      break;
    }
    case'flame-multi-line':{
      const lines=category==='simple'?rng.pick([1,1,2]):category==='moderate'?rng.pick([2,3,3,4]):rng.pick([3,4,4,5]);
      const mixed=lines===5?false:lines===4?rng.next()<.18:rng.next()<.38;
      const primary=shuffled(rng,[0,1,2,3,4,5]),secondary=shuffled(rng,[0,1,2,3,4,5]);
      const split=mixed?Math.max(1,Math.floor(lines/2)):lines;
      add(0,Array.from({length:lines},(_,i)=>lane('flame',i<split?axis:other,i<split?primary[i]:secondary[i-split],rng.int(2)===1)),0,0);break;
    }
    case'flame-alternating-bands':for(let n=0;n<Math.max(4,count);n++)add(n,[lane('flame',axis,base+n%2*2,flip),lane('flame',axis,base+n%2*2+3,!flip)],n%2,Math.floor(n/2));break;
    case'flame-moving-corridor':for(let n=0;n<Math.max(6,count);n++){
      const gap=1+((base+n)%3),specs=[lane('flame',axis,gap-1,flip),lane('flame',axis,gap+2,!flip)];
      b.add(start+n*s+Math.floor(n/3)*.20,specs,n%3,Math.floor(n/3));
    }break;
    case'flame-central-pocket':{
      const pocket=cell(rng.pick([2,3]),rng.pick([2,3])),shape=rng.pick(['open-1x2','enclosed-2x2','enclosed-3x2','enclosed-3x3'] as const),specs:Spec[]=[];
      const rows=shape==='open-1x2'?[pocket.y-1]:[pocket.y-1,pocket.y+1];
      if(shape.startsWith('enclosed-3'))rows.push(pocket.y===2?5:0);
      const cols=[pocket.x-1,pocket.x+1];if(shape==='enclosed-3x3')cols.push(pocket.x===2?5:0);
      b.variant=`${shape}:pocket:${pocket.x},${pocket.y}`;
      for(const row of rows)specs.push(lane('flame','row',row,row%2===0));
      for(const col of cols)specs.push(lane('flame','col',col,col%2===0));
      add(0,specs,0,0);break;
    }
    case'flame-sequential-relay':for(let n=0;n<Math.max(6,count);n++){
      const specs=[lane('flame',n%2?'col':'row',base+n,flip)];
      if(n%3===2)specs.push(lane('flame',n%2?'row':'col',base+n+2,!flip));
      add(n,specs,n%3,Math.floor(n/3));
    }break;
    case'ground-fire-islands':{
      const sizes=category==='simple'?[1,2]:category==='moderate'?[1,2,3]:[2,3,4];
      const size=rng.pick(sizes),cells=size===1?[c]:size===2?[c,cell(wrap(c.x+2),c.y)]:patch(c.x,c.y,2,2).slice(0,size);
      for(let n=0;n<(category==='advanced'?3:category==='moderate'?2:1);n++)add(n,[local('groundFire',cells.map(c=>cell(wrap(c.x+n),c.y)))],n,n,undefined,n%2?.45:1.0);
      break;
    }
    case'ground-fire-chain':for(let n=0;n<(category==='simple'?2:category==='moderate'?3:4);n++)add(n,[local('groundFire',[axis==='row'?cell(wrap(base+n),c.y):cell(c.x,wrap(base+n))])],n,0,undefined,.48);break;
    case'ground-fire-fragments':for(let n=0;n<Math.max(6,count);n++){
      const phase=n%2,cycle=Math.floor(n/2),pieces:Cell[]=[];
      for(let i=0;i<3;i++){const x=wrap(base+i*2+phase),y=wrap(c.y+cycle+i);pieces.push(cell(x,y),cell(wrap(x+1),y));}
      add(n,[local('groundFire',pieces)],phase,cycle,undefined,.88);
    }break;
    case'ground-fire-progressive':{
      const rowPaths=shuffled(rng,[0,1,2,3,4,5]),colPaths=shuffled(rng,[0,1,2,3,4,5]);
      const pathCount=category==='simple'?2:category==='moderate'?3:4;
      const paths=Array.from({length:pathCount},(_,i)=>({axis:i%2?'col':'row' as 'row'|'col',fixed:i%2?colPaths[Math.floor(i/2)]:rowPaths[Math.floor(i/2)]}));
      for(let n=0;n<Math.max(6,count);n++){
      const mode=cycleMode(rng.state),phase=n%3,cycle=Math.floor(n/3),step=mode==='edge-center'?phase:mode==='center-edge'?2-phase:phase;
      b.variant=mode;
      const positions=mode==='middle-both'?[2-step,3+step]:[flip?5-step:step];
      const cells=positions.flatMap(v=>paths.map(path=>path.axis==='row'?cell(clamp(v),wrap(path.fixed+cycle)):cell(wrap(path.fixed+cycle),clamp(v))));
      const groupStart=cycle*(2*s+warningAt('groundFire',p,b.extraWarning,b.run.stageIndex)+.05);
      b.add(start+groupStart+phase*s,[local('groundFire',cells)],phase,cycle,undefined,.70);
      }
      break;
    }
  }
}
function cycleMode(seed:number):'edge-center'|'center-edge'|'middle-both'{return['edge-center','center-edge','middle-both'][seed%3] as 'edge-center'|'center-edge'|'middle-both';}
const mixedPairs:readonly[Family,Family][]=[['lightning','arrow'],['lightning','groundFire'],['lightning','flame'],['arrow','lightning'],['flame','lightning'],['groundFire','arrow'],['groundFire','flame'],['arrow','flame']];
function compose(b:Builder,category:Category,preferLightning=false):void{
  const [leadFamily,secondFamily]=b.rng.pick(preferLightning?mixedPairs.filter(pair=>pair[0]==='lightning'):mixedPairs);
  const stageFor=(family:Family)=>STAGE_FAMILIES.indexOf(family);
  const leading=b.rng.pick(patternsFor(stageFor(leadFamily),category));
  const supporting=b.rng.pick(category==='advanced'&&secondFamily==='lightning'?['lightning-line-relay','lightning-dense-alternation'] as DedicatedPattern[]:patternsFor(stageFor(secondFamily),category==='advanced'?'moderate':'simple'));
  buildDedicated(b,leading,category,0);
  const offset=category==='simple'?.32:.25;
  buildDedicated(b,supporting,category==='advanced'?'moderate':'simple',offset);
  b.variant=`${leading}+${supporting}`;
}
export function scheduleWave(run:Run,rng:Rng,category:Category,id:number,pattern?:Pattern,extraWarning=0,preferLightning=false):Wave{
  if(run.stageIndex<0||run.stageIndex>4)throw new Error('Invalid stage');
  const selected=pattern??(run.stageIndex===4?undefined:rng.pick(patternsFor(run.stageIndex,category)));
  const b=new Builder(run,rng,id,selected??'mixed:composed',extraWarning);
  if(run.stageIndex===4){
    if(selected?.startsWith('mixed:')){
      const parts=selected.slice(6).split('+') as DedicatedPattern[];
      if(parts.length!==2||!DEDICATED_IDS.includes(parts[0])||!DEDICATED_IDS.includes(parts[1]))throw new Error('Invalid mixed composition');
      buildDedicated(b,parts[0],category,0);buildDedicated(b,parts[1],category==='advanced'?'moderate':'simple',category==='simple'?.32:.25);
    }else if(selected){buildDedicated(b,selected as DedicatedPattern,category,0);}
    else compose(b,category,preferLightning);
  }else{
    if(!selected||!DEDICATED_IDS.includes(selected as DedicatedPattern)||PATTERN_CATALOG.find(d=>d.id===selected)?.family!==STAGE_FAMILIES[run.stageIndex])throw new Error('Stage family restriction violated');
    buildDedicated(b,selected as DedicatedPattern,category,0);
  }
  const name=selected??`mixed:${b.variant}`;
  for(const a of b.attacks)a.pattern=name;
  const p=b.pressure;
  const actualSpacing=b.batches.length>1?b.batches[1].warn-b.batches[0].warn:0;
  const recovery=name.includes('flame-sequential-relay')?Math.max(.16,recoveryAt(p,run.stageIndex)-.12):recoveryAt(p,run.stageIndex);
  return{id,seed:rng.state,stage:run.stageIndex,category,archetype:b.batches.length===1?'discrete':'sequential',pattern:name,announced:run.time,batches:b.batches,attacks:b.attacks,end:Math.max(...b.attacks.map(a=>a.end)),scored:false,witness:[],pressure:p,recovery,sequenceSpacing:actualSpacing,variant:b.variant||undefined};
}
