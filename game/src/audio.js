// Procedural sound, no audio files: an engine hum that follows speed, a
// two-tone police siren while wanted, a shot crack and a mission chime.
// Everything is guarded — headless runs and browsers without a gesture get
// silence instead of an exception.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.engine = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenHigh = false;
    this.sirenTimer = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 60;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      osc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      osc.start();
      this.engine = osc;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch {
      this.ctx = null;
    }
  }

  setEngine(speed01) {
    if (!this.ctx || !this.engine) return;
    this.engine.frequency.value = 55 + speed01 * 130;
    this.engineGain.gain.value = 0.02 + speed01 * 0.05;
  }

  setSiren(on, dt) {
    if (!this.ctx || !this.sirenOsc) return;
    if (!on) {
      this.sirenGain.gain.value = 0;
      return;
    }
    this.sirenTimer += dt;
    if (this.sirenTimer > 0.4) {
      this.sirenTimer = 0;
      this.sirenHigh = !this.sirenHigh;
      this.sirenOsc.frequency.value = this.sirenHigh ? 950 : 700;
    }
    this.sirenGain.gain.value = 0.03;
  }

  blip(freq, dur, vol, type = 'sine') {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch {
      // Silence on failure.
    }
  }

  shot() {
    this.blip(180, 0.12, 0.15, 'square');
  }

  chime() {
    this.blip(660, 0.15, 0.08);
    setTimeout(() => this.blip(880, 0.25, 0.08), 120);
  }
}
