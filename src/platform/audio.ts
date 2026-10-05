export class AudioEngine {
  private ctx: AudioContext | null = null;
  private nextMusic = 0;
  private musicIndex = 0;
  enabled = true;
  unlock(): void { this.ctx ??= new AudioContext(); void this.ctx.resume(); }
  private note(frequency: number, duration: number, type: OscillatorType, volume: number, when = 0): void {
    if (!this.ctx || !this.enabled) return;
    const start = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .015); gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    osc.connect(gain).connect(this.ctx.destination); osc.start(start); osc.stop(start + duration + .02);
  }
  private rustle(duration: number, volume: number): void {
    if(!this.ctx||!this.enabled)return;
    const length=Math.ceil(this.ctx.sampleRate*duration),buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=buffer.getChannelData(0);
    let seed=41171;for(let i=0;i<length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=((seed/4294967296)*2-1)*Math.pow(1-i/length,2);}
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=1900;gain.gain.value=volume;source.connect(filter).connect(gain).connect(this.ctx.destination);source.start();
  }
  cue(name: 'move' | 'warn' | 'charge' | 'launch' | 'strike' | 'ignite' | 'clear' | 'death'): void {
    const score: Record<typeof name, [number, number, OscillatorType, number][]> = {
      move: [[270,.07,'triangle',.018]], warn: [[410,.23,'sine',.025],[615,.18,'sine',.01]],
      charge: [[620,.18,'triangle',.025],[880,.14,'sine',.012]],
      launch: [[155,.18,'sawtooth',.025]], strike: [[720,.12,'sawtooth',.035],[165,.20,'triangle',.025]],
      ignite: [[190,.27,'sawtooth',.025],[285,.19,'triangle',.018]],
      clear: [[392,.16,'sine',.023],[523,.23,'sine',.026]], death: [[196,.36,'triangle',.035],[131,.47,'sine',.025]]
    }; score[name].forEach(([f,d,t,v],i) => this.note(f,d,t,v,i*.075));
    if(name==='launch'||name==='strike'||name==='ignite'||name==='death')this.rustle(name==='strike'?.22:.13,name==='death'?.018:.012);
  }
  tick(): void {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    if (this.ctx.currentTime < this.nextMusic) return;
    const notes = [196, 0, 294, 0, 261.6, 329.6, 294, 0, 174.6, 0, 261.6, 0, 220, 261.6, 196, 0];
    const step=this.musicIndex++%notes.length,f=notes[step];
    if(f)this.note(f,.35,'triangle',.004);
    if(step%4===0){const root=[98,87.3,110,98][step/4];this.note(root,1.5,'sine',.005);this.note(root*1.5,1.4,'sine',.0025,.08);this.note(root*2,1.2,'sine',.002,.16);}
    this.nextMusic = this.ctx.currentTime + .44;
  }
}
