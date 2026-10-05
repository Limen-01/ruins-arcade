import { Direction } from '../core/model';
export function swipeDirection(dx: number, dy: number, tileCss: number): Direction | null {
  const major=Math.max(Math.abs(dx),Math.abs(dy)), minor=Math.min(Math.abs(dx),Math.abs(dy));
  if (major<Math.min(24,Math.max(14,tileCss*.2))||major<minor*1.25) return null;
  return Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
}
export function bindInput(surface: HTMLElement, emit: (d: Direction)=>void): { reset: ()=>void } {
  let pointer: {id:number;x:number;y:number}|null=null;
  surface.addEventListener('pointerdown',e=>{if(pointer||e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};surface.setPointerCapture(e.pointerId);});
  surface.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const d=swipeDirection(e.clientX-pointer.x,e.clientY-pointer.y,surface.clientWidth*76/720);pointer=null;if(d)emit(d);});
  surface.addEventListener('pointercancel',()=>{pointer=null;});
  window.addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||/input|textarea|select/i.test((e.target as Element)?.tagName||''))return;const map:Record<string,Direction>={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};const d=map[e.code];if(d){e.preventDefault();emit(d);}});
  return {reset:()=>{pointer=null;}};
}
