import Phaser from 'phaser';
import {Arena} from './scenes/Arena';
import {DEATH_PRESENTATION} from './scenes/deathPresentation';
import {bindInput} from './input/controls';
import {load,save,loadBestSurvivalTime,saveBestSurvivalTime} from './platform/preferences';
import {totalSurvivalTime} from './core/model';
import './style.css';

const prefs=load(),arena=new Arena();let bestTotal=loadBestSurvivalTime();
const displayTime=(seconds:number)=>`${seconds.toFixed(1)} 秒`;
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:720,height:850,backgroundColor:'#315b59',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{pixelArt:false},scene:[arena]});
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const overlay=$<HTMLDivElement>('overlay'),panel=$<HTMLDivElement>('panel');
const stage=$<HTMLElement>('stage'),score=$<HTMLElement>('score'),total=$<HTMLElement>('total'),best=$<HTMLElement>('best');
const pause=$<HTMLButtonElement>('pause'),sound=$<HTMLButtonElement>('sound'),haptic=$<HTMLButtonElement>('haptic');
const STAGE_NAMES=['古代弩機','落雷機關','獸首火焰','地面火焰','混合機關'];
let view:'home'|'tutorial'|'play'|'pause'|'result'='home',countdown=0,resultDelay=0;
const hapticAvailable=typeof navigator.vibrate==='function';
const landscape=matchMedia('(orientation: landscape) and (max-width: 900px)');
function sync():void{
  const run=arena.sim.run;
  stage.textContent=arena.practice?'教學演練':`第 ${run.stageIndex+1} 關 · ${STAGE_NAMES[run.stageIndex]}`;
  score.textContent=run.stageTime.toFixed(1);total.textContent=displayTime(totalSurvivalTime(run));best.textContent=displayTime(bestTotal);
  sound.setAttribute('aria-pressed',String(prefs.sound));haptic.setAttribute('aria-pressed',String(prefs.haptic&&hapticAvailable));
  haptic.disabled=!hapticAvailable;haptic.title=hapticAvailable?'震動':'此裝置不支援震動';
  arena.audio.enabled=prefs.sound;arena.reduced=prefs.reduced;
}
function show(html:string):void{panel.innerHTML=html;overlay.classList.remove('hidden');}
function startRun():void{input.reset();resultDelay=0;arena.audio.unlock();arena.startRun();view='play';overlay.classList.add('hidden');sync();if(landscape.matches)paused();}
function advanceStage():void{input.reset();resultDelay=0;if(!arena.nextStage())return;view='play';overlay.classList.add('hidden');sync();if(landscape.matches)paused();}
function home():void{
  view='home';show(`<h1>遺跡閃避</h1><p>依序挑戰古代弩機、落雷、獸首火焰、地面火焰與混合機關。每關直到倒下才進入下一關。</p><p>最長總生存時間 ${displayTime(bestTotal)}</p><button id="play">開始闖關</button>`);
  $<HTMLButtonElement>('play').onclick=()=>{arena.audio.unlock();if(!prefs.tutorial)tutorial();else startRun();};
}
function tutorial():void{
  view='tutorial';show('<h2>先看清來源</h2><p>格外的紅色箭頭標出弩箭或獸首火焰的來源與方向。落雷和地面火焰只在目標地格預警。放開一次滑動，就移動一格；可預先緩衝下一步。</p><p>試著離開弩箭那一列。演練時間不列入紀錄。</p><button id="begin">開始演練</button><button class="secondary" id="skip">略過教學</button>');
  $<HTMLButtonElement>('begin').onclick=()=>{input.reset();arena.audio.unlock();arena.startPractice();view='play';overlay.classList.add('hidden');sync();if(landscape.matches)paused();};
  $<HTMLButtonElement>('skip').onclick=()=>{prefs.tutorial=true;save(prefs);startRun();};
}
function paused():void{
  if(view!=='play'||arena.sim.run.status!=='playing')return;arena.pauseRun();input.reset();countdown=0;view='pause';
  show(`<h2>遊戲暫停</h2><p>${landscape.matches?'請將裝置轉回直向。':'準備好再繼續。'}</p><label><input type="checkbox" id="reduced"> 減少動態效果</label><button id="resume">繼續</button>`);
  const check=$<HTMLInputElement>('reduced');check.checked=prefs.reduced;
  check.onchange=()=>{prefs.reduced=check.checked;save(prefs);sync();};
  $<HTMLButtonElement>('resume').onclick=()=>{if(landscape.matches)return;countdown=1;show('<h2 id="count">準備</h2>');view='play';};
}
function result():void{
  view='result';const run=arena.sim.run;
  if(arena.practice){
    show('<h2>再試一次</h2><p>看見來源箭頭後，滑出受攻擊的那一列。演練不計時。</p><button id="retry">重新演練</button><button class="secondary" id="skip">略過教學</button>');
    $<HTMLButtonElement>('retry').onclick=()=>{input.reset();arena.startPractice();view='play';overlay.classList.add('hidden');sync();};
    $<HTMLButtonElement>('skip').onclick=()=>{prefs.tutorial=true;save(prefs);startRun();};return;
  }
  if(run.stageIndex<4){
    show(`<h2>第 ${run.stageIndex+1} 關結束</h2><p>${STAGE_NAMES[run.stageIndex]}</p><p>本關生存 ${displayTime(run.stageTime)}<br>累積生存 ${displayTime(totalSurvivalTime(run))}</p><button id="next">下一關</button>`);
    $<HTMLButtonElement>('next').onclick=advanceStage;return;
  }
  const rows=run.stageTimes.map((value,i)=>`<span>第 ${i+1} 關 · ${STAGE_NAMES[i]}</span><b>${displayTime(value)}</b>`).join('');
  show(`<h2>五關結算</h2><div class="stage-list">${rows}</div><p>總生存 ${displayTime(totalSurvivalTime(run))}　最佳 ${displayTime(bestTotal)}</p><button id="retry-run">重試五關</button>`);
  $<HTMLButtonElement>('retry-run').onclick=startRun;
}
arena.onWaveClear=()=>{
  if(arena.practice){arena.pauseRun();prefs.tutorial=true;save(prefs);view='tutorial';show('<h2>演練完成</h2><p>你已避開機關。接下來的五關會出現落雷、兩種火焰與混合波次。</p><button id="realplay">開始闖關</button>');$<HTMLButtonElement>('realplay').onclick=startRun;}
};
arena.onDeath=()=>{
  input.reset();if(prefs.haptic&&hapticAvailable)navigator.vibrate(70);
  if(!arena.practice&&arena.sim.run.stageIndex===4){const value=totalSurvivalTime(arena.sim.run);if(value>bestTotal){bestTotal=value;saveBestSurvivalTime(value);}}
  sync();resultDelay=DEATH_PRESENTATION+.05;
};
arena.onImpact=family=>{if(family==='lightning'&&prefs.haptic&&hapticAvailable)navigator.vibrate(25);};
const input=bindInput($('game'),direction=>{if(view==='play'&&countdown<=0&&arena.sim.run.status==='playing')arena.moveInput(direction);});
pause.onclick=paused;
sound.onclick=()=>{prefs.sound=!prefs.sound;arena.audio.unlock();save(prefs);sync();};
haptic.onclick=()=>{if(!hapticAvailable)return;prefs.haptic=!prefs.haptic;save(prefs);sync();};
function guard():void{if(view==='play'&&arena.sim.run.status==='playing')paused();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)guard();});window.addEventListener('blur',guard);window.addEventListener('game-autopause',guard);
landscape.addEventListener('change',()=>{if(landscape.matches)guard();});
let previous=performance.now();
function frame(now:number):void{
  const dt=Math.min(.1,(now-previous)/1000);previous=now;
  if(view==='play'&&countdown<=0&&arena.sim.run.status==='playing')sync();
  if(countdown>0){countdown-=dt;const label=document.getElementById('count');if(label)label.textContent=countdown>.3?'準備':'開始';if(countdown<=0){countdown=0;arena.resumeRun();overlay.classList.add('hidden');}}
  if(resultDelay>0){resultDelay-=dt;if(resultDelay<=0)result();}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);sync();home();
const query=new URLSearchParams(location.search),capture=query.get('capture');
if(capture&&['localhost','127.0.0.1'].includes(location.hostname)){
  const ready=()=>{if(!arena.ready)return requestAnimationFrame(ready);
    if(capture==='next-stage'||capture==='final'){
      arena.startRun();const r=arena.sim.run;r.stageIndex=capture==='final'?4:0;
      r.stageTimes=capture==='final'?[7.23,9.46,6.18,8.71,11.25]:[7.23,0,0,0,0];r.stageTime=r.stageTimes[r.stageIndex];r.status='dead';
      view='result';result();sync();
    }else if(capture==='death-result'){
      arena.capture('death-lightning',0);view='play';overlay.classList.add('hidden');resultDelay=DEATH_PRESENTATION+.05;sync();
    }else{arena.capture(capture,query.has('time')?Number(query.get('time')):undefined,Number(query.get('stageTime')||0),query.get('pattern')||undefined,Number(query.get('seed')||371));view='play';overlay.classList.add('hidden');sync();}
  };requestAnimationFrame(ready);
}
if(import.meta.env.PROD&&'serviceWorker'in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{});});
