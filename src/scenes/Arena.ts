import Phaser from 'phaser';
import {Attack,Family,STAGE_FAMILIES,position,Wave} from '../core/model';
import {arrowPosition} from '../core/collision';
import {Simulation,attack} from '../core/simulation';
import {flameEdgeGeometry,nextWave,validateWave,waveTargetSignature} from '../patterns/fairness';
import {Pattern,Rng,scheduleWave,PATTERN_CATALOG} from '../patterns/catalog';
import {FIRST_WAVE_DELAY,MIXED_FIRST_WAVE_DELAY} from '../config/balance';
import {AudioEngine} from '../platform/audio';
import {DEATH_PRESENTATION,deathPose} from './deathPresentation';

export const px=(x:number)=>360+(172+x*76-360)*1.25;
export const py=(y:number)=>425+(274+y*73-425)*1.25;
const STONE=0xe5d3a7,BRONZE=0x78684b,DARK=0x514636,RED=0xbe4237;
export type Metrics={announced:number;rejected:number;fallback:number;failed:number;starts:number[];recoveries:number[];patterns:Record<string,number>};
export class Arena extends Phaser.Scene{
  sim=new Simulation();audio=new AudioEngine();
  onWaveClear?:()=>void;
  onDeath?:(family:Family|null)=>void;
  onImpact?:(family:Family)=>void;
  onWave?:(wave:Wave)=>void;
  private graphics!:Phaser.GameObjects.Graphics;private hero!:Phaser.GameObjects.Image;
  private accumulator=0;private seed=0x8a17c425;private previous='';private previousTarget='';private previousFlameGeometry='';private nextWaveAt=FIRST_WAVE_DELAY;
  private deathSent=false;private wavesReported=0;private deathVisual=0;
  private facing:'up'|'down'|'left'|'right'='down';
  private warned=new Set<string>();private activated=new Set<string>();
  reduced=false;practice=false;ready=false;
  metrics:Metrics={announced:0,rejected:0,fallback:0,failed:0,starts:[],recoveries:[],patterns:{}};
  constructor(){super('Arena');}
  preload():void{
    this.load.svg('arena','./assets/arena.svg',{width:720,height:850});
    for(const direction of ['up','down','left','right'])for(const[mode,count]of[['idle',4],['walk',6]]as const)
      for(let i=0;i<count;i++)this.load.svg(`${direction}-${mode}-${i}`,`./assets/hero/${direction}-${mode}-${i}.svg`,{width:80,height:98});
  }
  create():void{
    this.add.image(360,425,'arena').setScale(1.25);
    this.graphics=this.add.graphics().setDepth(2);
    this.hero=this.add.image(px(2),py(2)-18,'down-idle-0').setDisplaySize(61,75).setDepth(4);
    this.ready=true;
  }
  private resetStagePresentation():void{
    this.accumulator=0;this.previous='';this.previousTarget='';this.previousFlameGeometry='';this.nextWaveAt=this.sim.run.stageIndex===4?MIXED_FIRST_WAVE_DELAY:FIRST_WAVE_DELAY;this.deathSent=false;this.wavesReported=0;
    this.deathVisual=0;this.facing='down';this.warned.clear();this.activated.clear();this.hero?.clearTint();
    this.metrics={announced:0,rejected:0,fallback:0,failed:0,starts:[],recoveries:[],patterns:{}};
  }
  startRun():void{this.practice=false;this.sim.retryRun();this.seed=(Date.now()^0x8a17c425)>>>0;this.resetStagePresentation();}
  nextStage():boolean{if(!this.sim.nextStage())return false;this.practice=false;this.seed=(this.seed+0x9e3779b9)>>>0;this.resetStagePresentation();return true;}
  startPractice():void{
    this.sim.retryRun();this.sim.run.practice=true;this.practice=true;this.resetStagePresentation();
    const r=this.sim.run,wave=scheduleWave(r,new Rng(3701),'simple',r.nextWaveId,'arrow-volley',.15);
    const a=wave.attacks[0];a.cells=Array.from({length:6},(_,x)=>({x,y:2}));a.origin={x:-.9,y:2};a.direction='right';wave.end=a.end;
    const witness=validateWave(r,wave);if(!witness)throw new Error('Tutorial wave failed fairness validation');
    wave.witness=witness;this.sim.addWave(wave);this.nextWaveAt=Number.POSITIVE_INFINITY;
  }
  pauseRun():void{this.sim.pause();this.accumulator=0;}
  resumeRun():void{this.sim.resume();this.accumulator=0;}
  moveInput(direction:'up'|'down'|'left'|'right'):void{if(this.sim.input(direction))this.audio.cue('move');}
  capture(kind:string,time?:number,stageTime=0,patternId?:string,seed=371):void{
    this.startRun();const r=this.sim.run;
    if(kind==='disclosure-trap'||kind==='disclosure-corrected'){
      r.stageIndex=2;
      const complete=(row:number)=>Array.from({length:6},(_,x)=>({x,y:row}));
      const first=attack(1,'visible','flame',kind,{x:-.9,y:2},'right',complete(2),0,1.2,.55,undefined,0);
      const second=attack(1,'follow-up','flame',kind,{x:-.9,y:1},'right',complete(1),kind==='disclosure-trap'?.4:0,kind==='disclosure-trap'?.55:1.2,.55,undefined,1);
      this.sim.addWave({id:1,seed:1,stage:2,category:'advanced',archetype:'sequential',pattern:kind,announced:0,batches:[{id:0,phase:0,cycle:0,warn:first.warn,active:first.active,attackIds:[first.id]},{id:1,phase:1,cycle:0,warn:second.warn,active:second.active,attackIds:[second.id]}],attacks:[first,second],end:1.75,scored:false,witness:[],pressure:0,recovery:.9,sequenceSpacing:second.warn});
      r.time=time??.2;r.status='paused';return;
    }
    if(kind.startsWith('late-flame')||kind.startsWith('late-groundFire')||kind.startsWith('late-long-lightning')){
      const family=kind.startsWith('late-flame')?'flame':kind.startsWith('late-long-lightning')?'lightning':'groundFire';r.stageIndex=family==='flame'?2:family==='lightning'?1:3;r.cell={x:2,y:1};
      const cells=family==='flame'?Array.from({length:6},(_,x)=>({x,y:2})):[{x:2,y:2}];
      const event=attack(1,'late-entry',family,kind,{x:-.9,y:2},'right',cells,0,.5,family==='lightning'?.28:1,undefined,0,family==='lightning'?'long':undefined);
      this.sim.addWave({id:1,seed:1,stage:r.stageIndex,category:'simple',archetype:'discrete',pattern:kind,announced:0,batches:[{id:0,phase:0,cycle:0,warn:0,active:.5,attackIds:['late-entry']}],attacks:[event],end:1.5,scored:false,witness:[],pressure:0,recovery:.9,sequenceSpacing:.3});
      r.time=family==='lightning'?.6:.8;if(kind.endsWith('-before'))r.status='paused';else this.sim.input('down');return;
    }
    if(kind.startsWith('death-')){
      r.stageIndex=kind==='death-lightning'?1:kind==='death-arrow'?0:kind==='death-groundFire'?3:2;
      r.status='dead';r.lastHit=kind==='death-lightning'?'lightning':kind==='death-arrow'?'arrow':kind==='death-groundFire'?'groundFire':'flame';
      this.deathVisual=Math.max(0,Math.min(DEATH_PRESENTATION,time??.65));return;
    }
    const fixtures:Record<string,{stage:number;category:'simple'|'moderate'|'advanced';pattern:Pattern;time:number}>={
      lane:{stage:0,category:'simple',pattern:'arrow-volley',time:.65},
      'slow-fast':{stage:0,category:'advanced',pattern:'arrow-slow-fast',time:.75},
      lightning:{stage:1,category:'simple',pattern:'lightning-scatter',time:.72},
      'lightning-sequence':{stage:1,category:'advanced',pattern:'lightning-cluster-relay',time:.62},
      flame:{stage:2,category:'simple',pattern:'flame-multi-line',time:.72},
      'fire-single':{stage:3,category:'simple',pattern:'ground-fire-islands',time:.72},
      'fire-patch':{stage:3,category:'advanced',pattern:'ground-fire-fragments',time:.72},
      grouped:{stage:0,category:'moderate',pattern:'arrow-volley',time:.72},
      sequential:{stage:0,category:'advanced',pattern:'arrow-staircase',time:.62},
      discrete:{stage:0,category:'simple',pattern:'arrow-volley',time:.72},
      recovery:{stage:0,category:'simple',pattern:'arrow-volley',time:2.2},
      mixed:{stage:4,category:'advanced',pattern:'mixed:arrow-staircase+lightning-cluster-relay',time:.72},
      'mixed-lightning':{stage:4,category:'advanced',pattern:'mixed:lightning-line-relay+ground-fire-islands',time:1.2},
      'mixed-flame':{stage:4,category:'advanced',pattern:'mixed:ground-fire-fragments+flame-sequential-relay',time:1.2}
    };
    const named=patternId?PATTERN_CATALOG.find(d=>d.id===patternId):undefined;
    const fixture=named?{stage:STAGE_FAMILIES.indexOf(named.family),category:'advanced' as const,pattern:named.id,time:.72}:fixtures[kind]??fixtures.lane;
    r.stageIndex=fixture.stage;r.stageTime=Math.max(0,stageTime);
    const wave=scheduleWave(r,new Rng(seed),fixture.category,r.nextWaveId,fixture.pattern);
    if(fixture.pattern==='flame-multi-line'&&wave.attacks.length===5){
      const row=wave.attacks[0].direction==='left'||wave.attacks[0].direction==='right';
      const used=new Set(wave.attacks.map(a=>row?a.cells[0].y:a.cells[0].x));
      const opening=[0,1,2,3,4,5].find(i=>!used.has(i));
      if(opening!==undefined)r.cell=row?{x:2,y:opening}:{x:opening,y:2};
    }
    this.sim.addWave(wave);r.time=Math.max(0,time??fixture.time);r.status='paused';
  }
  private sourceArrow(a:Attack,time:number,progress:number):void{
    const g=this.graphics,x=px(a.origin.x),y=py(a.origin.y),angle=a.direction==='right'?0:a.direction==='left'?Math.PI:a.direction==='down'?Math.PI/2:-Math.PI/2;
    const cadence=a.family==='arrow'?(a.speedClass==='fast'?7:a.speedClass==='medium'?5:3):4;
    const pulse=this.reduced?.7:Math.abs(Math.sin((time-a.warn)*(cadence+2*progress)*Math.PI));
    const points=[[-21,-13],[0,-13],[0,-21],[26,0],[0,21],[0,13],[-21,13]].map(([dx,dy])=>({x:x+dx*Math.cos(angle)-dy*Math.sin(angle),y:y+dx*Math.sin(angle)+dy*Math.cos(angle)}));
    g.fillStyle(DARK,.95);g.fillPoints(points,true);
    g.fillStyle(RED,.62+.36*pulse);g.fillPoints(points.map(p=>({x:x+(p.x-x)*(.76+.1*pulse),y:y+(p.y-y)*(.76+.1*pulse)})),true);
    g.lineStyle(2,0xffe5c1,.55+.35*pulse);g.strokePoints(points,true);
    if(a.family==='arrow'){
      const marks=a.speedClass==='fast'?3:a.speedClass==='medium'?2:1;
      for(let i=0;i<marks;i++){
        const dx=(i-(marks-1)/2)*11,dy=29;
        const mx=x+dx*Math.cos(angle)-dy*Math.sin(angle),my=y+dx*Math.sin(angle)+dy*Math.cos(angle);
        g.fillStyle(DARK,.95);g.fillCircle(mx,my,5);g.fillStyle(0xffe6ae,.95);g.fillCircle(mx,my,3.5);
      }
    }
  }
  private sourceMachine(a:Attack,progress:number):void{
    const g=this.graphics,x=px(a.origin.x),y=py(a.origin.y);
    if(a.family==='arrow'){
      g.fillStyle(BRONZE,.96);g.fillRoundedRect(x-30,y-27,60,54,9);g.lineStyle(4,STONE,.9);g.strokeRoundedRect(x-30,y-27,60,54,9);
      g.lineStyle(4,DARK);g.strokeLineShape(new Phaser.Geom.Line(x-32,y-25,x+32,y+25));g.strokeLineShape(new Phaser.Geom.Line(x-32,y+25,x+32,y-25));
      const marks=a.speedClass==='fast'?3:a.speedClass==='medium'?2:1;
      for(let i=0;i<marks;i++){g.fillStyle(0xffd7a0,.5+.45*progress);g.fillCircle(x-13+i*13,y+18,3);}
    }else{
      g.fillStyle(BRONZE,.95);g.fillEllipse(x,y,65,57);g.lineStyle(4,STONE,.86);g.strokeEllipse(x,y,65,57);
      g.fillStyle(DARK);g.fillTriangle(x-23,y-18,x-12,y-37,x-5,y-17);g.fillTriangle(x+23,y-18,x+12,y-37,x+5,y-17);
      g.fillStyle(0xf4bc77,.4+.55*progress);g.fillCircle(x-11,y-5,4);g.fillCircle(x+11,y-5,4);
    }
  }
  private drawAttack(a:Attack,time:number):void{
    if(time<a.warn||time>a.cleanup)return;
    const g=this.graphics,warning=time<a.active,progress=Math.max(0,Math.min(1,(time-a.warn)/(a.active-a.warn)));
    if(a.family==='arrow'||a.family==='flame'){
      if(warning){this.sourceMachine(a,progress);this.sourceArrow(a,time,progress);return;}
      if(time>a.end)return;
      if(a.family==='flame'){
        const first=a.cells[0],last=a.cells[a.cells.length-1];
        g.lineStyle(84,0xf6a44d,.53);g.strokeLineShape(new Phaser.Geom.Line(px(first.x),py(first.y),px(last.x),py(last.y)));
        g.lineStyle(43,0xffe2a3,.78);g.strokeLineShape(new Phaser.Geom.Line(px(first.x),py(first.y),px(last.x),py(last.y)));
        for(const c of a.cells){g.fillStyle(0xffd595,.72);g.fillEllipse(px(c.x),py(c.y)-12,20,33);}
      }else{
        const p=arrowPosition(a,time),angle=a.direction==='right'?0:a.direction==='left'?Math.PI:a.direction==='down'?Math.PI/2:-Math.PI/2,x=px(p.x),y=py(p.y);
        g.fillStyle(0x422f24,.35);g.fillEllipse(x,y+7,34,10);
        g.lineStyle(18,0x785337);g.strokeLineShape(new Phaser.Geom.Line(x-Math.cos(angle)*28,y-Math.sin(angle)*28,x+Math.cos(angle)*16,y+Math.sin(angle)*16));
        g.fillStyle(STONE);g.fillTriangle(x+Math.cos(angle)*24,y+Math.sin(angle)*24,x+Math.cos(angle+2.4)*18,y+Math.sin(angle+2.4)*18,x+Math.cos(angle-2.4)*18,y+Math.sin(angle-2.4)*18);
      }return;
    }
    for(const c of a.cells){
      const x=px(c.x),y=py(c.y),pulse=this.reduced?.72:.62+.38*Math.abs(Math.sin((time-a.warn)*(2+progress*5)*Math.PI));
      if(warning){
        if(a.family==='lightning'){
          g.lineStyle(3,0xf9e9b4,pulse);g.strokeCircle(x,y,27+10*progress);g.lineStyle(2,0x7bd2d1,pulse);g.strokeCircle(x,y,12+5*progress);
          for(let i=0;i<4;i++){const angle=i*Math.PI/2+progress;g.fillStyle(0xfff1bd,pulse);g.fillCircle(x+Math.cos(angle)*33,y+Math.sin(angle)*33,3);}
          if(a.lightningMode==='long'){g.lineStyle(3,0x5dc7d0,.7);g.strokeCircle(x,y,35);}
        }else{
          g.fillStyle(0x6b4a38,.12+.13*progress);g.fillEllipse(x,y+8,69,40);
          g.lineStyle(3,0xffd598,pulse);g.strokeEllipse(x,y+5,62+15*progress,31+9*progress);
          for(let i=-1;i<=1;i++){g.lineStyle(2,0xb86e43,pulse);g.strokeLineShape(new Phaser.Geom.Line(x+i*18-7,y+19,x+i*18+2,y+6));}
        }
      }else if(time<=a.end){
        if(a.family==='lightning'){
            const bolt=[{x:x-10,y:y-105},{x:x+4,y:y-70},{x:x-8,y:y-48},{x:x+11,y:y-20},{x,y:y+20}];
            g.lineStyle(a.lightningMode==='long'?17:14,0x648f9e,.6);g.strokePoints(bolt,false);
            g.lineStyle(a.lightningMode==='long'?8:7,0xffefba,1);g.strokePoints(bolt,false);
            g.fillStyle(0xffe9ad,.48);g.fillEllipse(x,y+11,56,26);
        }else{
          g.fillStyle(0x624435,.55);g.fillEllipse(x,y+19,72,35);
          for(let i=-1;i<=1;i++){
            const sway=this.reduced?0:Math.sin(time*11+i)*5;
            g.fillStyle(i===0?0xffdf9a:0xf4a653,.86);g.fillTriangle(x+i*19-16,y+20,x+i*19+sway,y-41-(i===0?11:0),x+i*19+16,y+20);
            g.fillStyle(0xffeed1,.7);g.fillEllipse(x+i*19,y+4,10,23);
          }
        }
      }else{
        const fade=1-(time-a.end)/(a.cleanup-a.end);
        if(a.family==='groundFire'){g.fillStyle(0x3d4642,.40*fade);g.fillEllipse(x,y+12,65,26);g.lineStyle(2,0x6d7770,.35*fade);g.strokeEllipse(x,y+10,54,18);}
        else{g.fillStyle(0x53635e,.30*fade);g.fillCircle(x,y+6,20);}
      }
    }
  }
  update(_time:number,delta:number):void{
    if(this.sim.run.status==='dead')this.deathVisual=Math.min(DEATH_PRESENTATION,this.deathVisual+delta/1000);
    if(this.sim.run.status==='playing'){
      if(delta>250){this.pauseRun();window.dispatchEvent(new CustomEvent('game-autopause'));return;}
      this.accumulator+=Math.min(delta/1000,.25);
      while(this.accumulator>=1/120){this.sim.step();this.accumulator-=1/120;}
      const r=this.sim.run,wave=r.wave;
      if(wave)for(const a of wave.attacks){
        const key=`${wave.id}:${a.id}`;
        if(r.time>=a.warn&&!this.warned.has(key)){this.warned.add(key);this.audio.cue(a.family==='lightning'?'charge':'warn');}
        if(r.time>=a.active&&!this.activated.has(key)){
          this.activated.add(key);this.audio.cue(a.family==='lightning'?'strike':a.family==='groundFire'?'ignite':'launch');this.onImpact?.(a.family);
          if(a.family==='lightning'&&!this.reduced)this.cameras.main.shake(70,.0015);
        }
      }
      if(r.status==='dead'&&!this.deathSent){this.deathSent=true;this.audio.cue('death');this.onDeath?.(r.lastHit);}
      if(r.status==='playing'&&!this.practice&&r.time>=this.nextWaveAt){
        const recovery=this.sim.releaseWave();if(recovery!==null)this.metrics.recoveries.push(recovery);
        if(!r.wave){
          const selection=nextWave(r,this.seed++,this.previous,this.previousTarget,this.previousFlameGeometry);this.metrics.rejected+=selection.rejected;
          if(selection.wave){
            this.sim.addWave(selection.wave);this.previous=selection.wave.pattern;this.previousTarget=waveTargetSignature(selection.wave);this.previousFlameGeometry=flameEdgeGeometry(selection.wave,'last');this.metrics.announced++;
            this.metrics.fallback+=Number(selection.fallback);this.metrics.starts.push(r.time);
            this.metrics.patterns[selection.wave.pattern]=(this.metrics.patterns[selection.wave.pattern]??0)+1;
            this.onWave?.(selection.wave);this.nextWaveAt=selection.wave.end+selection.wave.recovery;
          }else{this.metrics.failed++;this.nextWaveAt=r.time+.12;}
        }
      }
      if(r.wavesCleared>this.wavesReported){for(let i=this.wavesReported;i<r.wavesCleared;i++)this.audio.cue('clear');this.wavesReported=r.wavesCleared;this.onWaveClear?.();}
      this.audio.tick();
    }
    this.draw();
  }
  private draw():void{
    if(!this.graphics||!this.hero)return;
    const r=this.sim.run,g=this.graphics;g.clear();
    if(r.wave)for(const a of r.wave.attacks)this.drawAttack(a,r.time);
    const p=position(r),walking=!!r.move,bob=walking&&!this.reduced?Math.sin((r.time-r.move!.start)/.12*Math.PI*2)*4:Math.sin(r.time*2)*1.5;
    if(r.move){const dx=r.move.to.x-r.move.from.x,dy=r.move.to.y-r.move.from.y;this.facing=dx>0?'right':dx<0?'left':dy>0?'down':'up';}
    const frame=walking?Math.min(5,Math.floor(Math.max(0,(r.time-r.move!.start)/.12)*6)):Math.floor(r.time*2)%4;
    const texture=`${this.facing}-${walking?'walk':'idle'}-${frame}`;if(this.hero.texture.key!==texture)this.hero.setTexture(texture);
    const pose=deathPose(r.lastHit,r.status==='dead'?this.deathVisual:0),x=px(p.x),y=py(p.y);
    this.hero.setTint(pose.char?0x252321:0xffffff);
    this.hero.setPosition(x+pose.arrowKnock*54,y-18+bob);
    this.hero.setAngle(r.status==='dead'&&r.lastHit==='arrow'?pose.arrowKnock*42:walking?(r.move!.to.x-r.move!.from.x)*5:0);
    this.hero.setAlpha(r.status==='dead'&&r.lastHit==='lightning'?1-pose.ash:1);
    this.hero.setScale(walking&&!this.reduced?.78:.76,walking&&!this.reduced?.72:.76);
    if(r.status==='dead')this.drawDeath(x,y,pose,r.lastHit);
  }
  private drawDeath(x:number,y:number,pose:ReturnType<typeof deathPose>,family:Family|null):void{
    const g=this.graphics;
    if(family==='lightning'&&pose.ash>0){
      g.fillStyle(0x292926,pose.ash);g.fillEllipse(x,y+28,60*pose.ash,22*pose.ash);
      for(let i=0;i<5;i++){g.fillStyle(i%2?0x34332f:0x1e211f,pose.ash);g.fillCircle(x+(i-2)*10,y+23-i%2*4,4+i%3);}
      g.fillStyle(0x252321,pose.ash);g.fillCircle(x,y-31+pose.headDrop*53,16);
      g.fillStyle(0xe2d4af,pose.ash);g.fillCircle(x-5,y-33+pose.headDrop*53,2);g.fillCircle(x+5,y-33+pose.headDrop*53,2);
    }
    if((family==='flame'||family==='groundFire')&&pose.smoke>0){
      const rise=1-pose.smoke;g.fillStyle(0x252826,.64*pose.smoke);
      g.fillEllipse(x,y-58-rise*38,32+rise*16,25+rise*10);
      g.fillEllipse(x+12,y-65-rise*38,20+rise*12,20+rise*8);
    }
    if(family==='arrow'){g.lineStyle(5,0xf1d7a3,(1-pose.arrowKnock)*.8);g.strokeLineShape(new Phaser.Geom.Line(x-20,y-24,x+pose.arrowKnock*76,y-24));}
  }
}
