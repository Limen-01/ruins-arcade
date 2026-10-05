import type {ArrowSpeed,Category,Family} from '../core/model';

export const BALANCE_VERSION='1.7.0';
export const FIRST_WAVE_DELAY=.7;
export const MIXED_FIRST_WAVE_DELAY=.45;
export const REACTION=.25,CADENCE=.16,TIME_MARGIN=.08,MAX_CANDIDATES=20,MAX_NODES=2400;
export const ARROW_FLIGHT:Record<ArrowSpeed,number>={slow:.8,medium:.52,fast:.34};
export function arrowFlightAt(speed:ArrowSpeed,p:number,slowFast=false):number{
  if(slowFast)return speed==='slow'?.8+.18*p:speed==='fast'?.34-.11*p:.52-.11*p;
  return ARROW_FLIGHT[speed]-(speed==='slow'?.15:speed==='medium'?.12:.09)*p;
}
export const ACTIVE_DURATION:Record<Exclude<Family,'arrow'>,number>={lightning:.15,flame:.55,groundFire:.72};
export const LONG_LIGHTNING_DURATION=.28;
export function activeDurationAt(family:Exclude<Family,'arrow'>,p:number,longLightning=false):number{
  if(family==='lightning')return(longLightning?LONG_LIGHTNING_DURATION:ACTIVE_DURATION.lightning)-(longLightning?.07:.03)*p;
  if(family==='flame')return ACTIVE_DURATION.flame-.17*p;
  return ACTIVE_DURATION.groundFire-.18*p;
}
export function pressureAt(stageTime:number,stage=0):number{
  const time=Math.max(0,stageTime),p5=1-Math.exp(-5/30);
  const base=time<=5?1-Math.exp(-time/30):p5+(1-p5)*(1-Math.exp(-(time-5)/(stage>=1&&stage<=3?7.5:9)));
  return stage===4?.55+.45*(1-Math.exp(-time/8)):base;
}
export function recoveryAt(p:number,stage=0):number{
  if(stage===4)return .26+.34*(1-p);
  const base=.30+.60*(1-p);return stage>=1&&stage<=3?base*(1-.12*p):base;
}
export function sequenceAt(p:number,stage=0):number{
  const base=.13+.17*(1-p);return stage===4?base*(1-.16*p):stage>=1&&stage<=3?base*(1-.12*p):base;
}
export function warningAt(family:Family,p:number,extra=0,stage=0):number{
  if(family==='flame')return (stage===2?1.45-.85*p:1.15-.55*p)+extra;
  if(family==='lightning')return 1.10-.50*p+extra;
  if(family==='groundFire')return 1.12-.52*p+extra;
  return 1.15-.40*p+extra;
}
export function complexityWeights(p:number,stage=0):readonly[number,number,number]{
  if(stage===4)return[32-27*p,25-3*p,43+30*p];
  if(stage>=1&&stage<=3)return[75-71*p,20+5*p,5+66*p];
  return[75-70*p,20+10*p,5+60*p];
}
export function arrowWeights(p:number):readonly[number,number,number]{return[70-45*p,25+10*p,5+35*p];}
export function chooseWeighted<T extends string>(keys:readonly T[],weights:readonly number[],roll:number):T{
  let n=roll*weights.reduce((a,b)=>a+b,0);for(let i=0;i<keys.length;i++){n-=weights[i];if(n<0)return keys[i];}return keys[keys.length-1];
}
export const CATEGORIES:readonly Category[]=['simple','moderate','advanced'];
export const ARROW_SPEEDS:readonly ArrowSpeed[]=['slow','medium','fast'];
