import { Attack, Point, RADIUS, Run, position } from './model';

const sq = (v: number) => v * v;
function segmentDistanceSq(a: Point, b: Point, c: Point, d: Point): number {
  // Minimum over synchronized motion of both segment endpoints.
  const rx = a.x - c.x, ry = a.y - c.y, vx = (b.x - a.x) - (d.x - c.x), vy = (b.y - a.y) - (d.y - c.y);
  const u = Math.max(0, Math.min(1, -(rx * vx + ry * vy) / (vx * vx + vy * vy || 1)));
  return sq(rx + vx * u) + sq(ry + vy * u);
}
function pointRect(p: Point, c: Point, half: number): boolean {
  return Math.abs(p.x - c.x) <= half && Math.abs(p.y - c.y) <= half;
}
function segmentAabb(a:Point,b:Point,minX:number,maxX:number,minY:number,maxY:number):boolean{
  let lo = 0, hi = 1;
  for (const [p, v, min, max] of [[a.x, b.x - a.x, minX, maxX], [a.y, b.y - a.y, minY, maxY]]) {
    if (Math.abs(v) < 1e-10) { if (p < min || p > max) return false; }
    else { const t0 = (min - p) / v, t1 = (max - p) / v; lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1)); }
  }
  return lo <= hi;
}
function segmentRect(a: Point, b: Point, c: Point, half: number): boolean {
  if (pointRect(a, c, half) || pointRect(b, c, half)) return true;
  return segmentAabb(a,b,c.x-half,c.x+half,c.y-half,c.y+half);
}
export function arrowPosition(a: Attack, t: number): Point {
  const f = Math.max(0, Math.min(1, (t - a.active) / (a.end - a.active)));
  const v = a.direction === 'right' ? { x: 1, y: 0 } : a.direction === 'left' ? { x: -1, y: 0 } : a.direction === 'down' ? { x: 0, y: 1 } : { x: 0, y: -1 };
  return { x: a.origin.x + v.x * 6.8 * f, y: a.origin.y + v.y * 6.8 * f };
}
export function hits(run: Run, a: Attack, t0: number, t1: number, margin = 0): boolean {
  const start = Math.max(t0, a.active), end = Math.min(t1, a.end);
  if (start > end) return false;
  const p0 = position(run, start), p1 = position(run, end);
  if (a.family === 'arrow') return segmentDistanceSq(p0, p1, arrowPosition(a, start), arrowPosition(a, end)) <= sq(RADIUS + .14 + margin);
  const half = (a.family === 'lightning' ? .34 : .31) + RADIUS + margin;
  if (a.family === 'flame' && a.cells.length) {
    const horizontal = a.direction === 'left' || a.direction === 'right';
    const xs=a.cells.map(c=>c.x),ys=a.cells.map(c=>c.y);
    const values=(horizontal?xs:ys).slice().sort((x,y)=>x-y);
    if(a.cells.length!==6||values.some((v,i)=>v!==i))throw new Error('Flame collision requires a complete lane');
    const minX=Math.min(...xs)-half,maxX=Math.max(...xs)+half,minY=Math.min(...ys)-half,maxY=Math.max(...ys)+half;
    if(horizontal&&Math.min(...ys)!==Math.max(...ys)||!horizontal&&Math.min(...xs)!==Math.max(...xs))throw new Error('Flame cells must form one straight segment');
    return segmentAabb(p0,p1,minX,maxX,minY,maxY);
  }
  return a.cells.some(c => segmentRect(p0, p1, c, half));
}
