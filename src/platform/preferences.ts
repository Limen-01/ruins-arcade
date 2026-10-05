export type Preferences = { best: number; sound: boolean; haptic: boolean; reduced: boolean; tutorial: boolean };
const KEY = 'ruins-arcade-v1';
const TOTAL_KEY = 'ruins-arcade-five-stage-v1-best-total';
const SURVIVAL_KEY = 'ruins-arcade-five-stage-v2-best-survival-seconds';
const defaults = (): Preferences => ({ best: 0, sound: true, haptic: false, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, tutorial: false });
export function load(): Preferences { try { return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return defaults(); } }
export function save(p: Preferences): void { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* Memory fallback is the active object. */ } }
export function loadBestTotal():number{try{return Math.max(0,Number(localStorage.getItem(TOTAL_KEY))||0);}catch{return 0;}}
export function saveBestTotal(total:number):void{try{localStorage.setItem(TOTAL_KEY,String(total));}catch{/* In-memory total remains available to the current session. */}}
export function loadBestSurvivalTime():number{try{return Math.max(0,Number(localStorage.getItem(SURVIVAL_KEY))||0);}catch{return 0;}}
export function saveBestSurvivalTime(seconds:number):void{try{localStorage.setItem(SURVIVAL_KEY,String(seconds));}catch{/* In-memory total remains available to the current session. */}}
