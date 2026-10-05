import type {Family} from '../core/model';

export const DEATH_PRESENTATION=1.15;
export type DeathPose={char:number;ash:number;headDrop:number;smoke:number;smokePuffs:number;arrowKnock:number};
export function deathPose(cause:Family|null,elapsed:number):DeathPose{
  const t=Math.max(0,Math.min(1,elapsed/DEATH_PRESENTATION));
  if(cause==='lightning'){
    const drop=Math.max(0,(t-.34)/.46),bounce=drop<1?Math.sin(drop*Math.PI)*.23:Math.sin(Math.min(1,(drop-1)/.25)*Math.PI)*.08;
    return{char:1,ash:Math.max(0,Math.min(1,(t-.24)/.38)),headDrop:Math.max(0,Math.min(1,drop-bounce)),smoke:0,smokePuffs:0,arrowKnock:0};
  }
  if(cause==='flame'||cause==='groundFire')return{char:1,ash:0,headDrop:0,smoke:t>.12&&t<.82?Math.sin((t-.12)/.70*Math.PI):0,smokePuffs:1,arrowKnock:0};
  return{char:0,ash:0,headDrop:0,smoke:0,smokePuffs:0,arrowKnock:cause==='arrow'?t:0};
}
