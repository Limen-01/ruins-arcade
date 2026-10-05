export type Direction = 'up'|'down'|'left'|'right';
export type Family = 'arrow'|'lightning'|'flame'|'groundFire';
export type ArrowSpeed = 'slow'|'medium'|'fast';
export type LightningMode = 'brief'|'long';
export type Archetype = 'discrete'|'grouped'|'sequential';
export type Category = 'simple'|'moderate'|'advanced';
export type Cell = {x:number;y:number};
export type Point = {x:number;y:number};
export type Move = {from:Cell;to:Cell;start:number;end:number};
export type Attack = {
  waveId:number;batchId:number;id:string;family:Family;pattern:string;origin:Point;direction:Direction;
  cells:Cell[];warn:number;active:number;end:number;cleanup:number;speedClass?:ArrowSpeed;lightningMode?:LightningMode;
};
export type Batch = {id:number;phase:number;cycle:number;warn:number;active:number;attackIds:string[];speedClass?:ArrowSpeed};
export type Witness = {at:number;direction:Direction}[];
export type Wave = {
  id:number;seed:number;stage:number;category:Category;archetype:Archetype;pattern:string;
  announced:number;batches:Batch[];attacks:Attack[];end:number;scored:boolean;witness:Witness;
  pressure:number;recovery:number;sequenceSpacing:number;variant?:string;
};
export type Run = {
  time:number;stageTime:number;practice:boolean;cell:Cell;move:Move|null;queued:Direction|null;
  status:'ready'|'playing'|'paused'|'dead';stageIndex:number;stageTimes:number[];wavesCleared:number;
  wave:Wave|null;lastHit:Family|null;nextWaveId:number;
};
export const STAGE_FAMILIES: (Family|'mixed')[]=['arrow','lightning','flame','groundFire','mixed'];
export const STEP=1/120,MOVE_TIME=.12,RADIUS=.16;
export const vec:Record<Direction,Cell>={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
export const directions:Direction[]=['up','down','left','right'];
export function inside(c:Cell):boolean{return c.x>=0&&c.x<6&&c.y>=0&&c.y<6;}
export function destination(c:Cell,d:Direction):Cell{const v=vec[d];return{x:c.x+v.x,y:c.y+v.y};}
export function position(run:Run,time=run.time):Point{
  if(!run.move)return run.cell;
  const a=Math.max(0,Math.min(1,(time-run.move.start)/MOVE_TIME));
  return{x:run.move.from.x+(run.move.to.x-run.move.from.x)*a,y:run.move.from.y+(run.move.to.y-run.move.from.y)*a};
}
export function totalSurvivalTime(run:Run):number{return run.stageTimes.reduce((sum,n)=>sum+n,0)+(run.status==='dead'||run.practice?0:run.stageTime);}
export function newRun():Run{return{time:0,stageTime:0,practice:false,cell:{x:2,y:2},move:null,queued:null,status:'ready',stageIndex:0,stageTimes:[0,0,0,0,0],wavesCleared:0,wave:null,lastHit:null,nextWaveId:1};}
export function command(run:Run,d:Direction):boolean{
  if(run.status!=='playing')return false;
  const base=run.move?.to??run.cell;
  if(!inside(destination(base,d)))return false;
  if(run.move){if(run.queued)return false;run.queued=d;return true;}
  run.move={from:{...run.cell},to:destination(run.cell,d),start:run.time,end:run.time+MOVE_TIME};return true;
}
