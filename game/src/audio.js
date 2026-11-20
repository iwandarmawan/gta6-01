// Solmar Bay — all sound is synthesised with WebAudio: no audio assets.
// Engine hum follows speed, sirens wail near police, gunshots are noise
// bursts, pickups blip and missions sting. The context is created on the
// first user gesture, so browsers never block it.

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenPhase = 0;
    this.sirenTimer = 0;
  }

  // Call from a user gesture (click / keypress) — the only safe moment.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      // Engine: a low sawtooth whose pitch follows the car's speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 42;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      this.engineOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      // Siren: a square wave that alternates between two tones.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'square';
      this.sirenOsc.frequency.value = 720;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch {
      // No audio in this browser: the game stays silent, never crashes.
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) {
      if (m && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
      else this.ctx.resume().catch(() => {});
    }
  }

  // Per-frame: engine pitch from speed, siren volume from police distance.
  update(dt, speedKmh, nearestPolice) {
    if (!this.ctx || this.muted) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      if (this.sirenGain) this.sirenGain.gain.value = 0;
      return;
    }
    const t = this.ctx.currentTime;
    if (this.engineGain) {
      const target = speedKmh > 1 ? 0.045 + Math.min(speedKmh / 2400, 0.05) : 0.012;
      this.engineGain.gain.setTargetAtTime(target, t, 0.1);
      this.engineOsc.frequency.setTargetAtTime(42 + speedKmh * 1.6, t, 0.1);
    }
    if (this.sirenGain) {
      // Two-tone wail, swapping every 0.4 s, fading in as police close in.
      this.sirenTimer += dt;
      if (this.sirenTimer > 0.4) {
        this.sirenTimer = 0;
        this.sirenPhase = 1 - this.sirenPhase;
        this.sirenOsc.frequency.setTargetAtTime(this.sirenPhase ? 950 : 700, t, 0.05);
      }
      const near = nearestPolice == null ? 0 : Math.max(0, 1 - nearestPolice / 90);
      this.sirenGain.gain.setTargetAtTime(near * 0.05, t, 0.2);
    }
  }

  // One-shot blip: a sine that sweeps from f0 to f1 over `dur` seconds.
  blip(f0, f1, dur, vol) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }

  // Gunshot: a short burst of filtered noise plus a low thump.
  gunshot() {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * 0.12);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.35;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(t);
      this.blip(160, 50, 0.1, 0.25);
    } catch { /* ignore */ }
  }

  punch() { this.blip(220, 70, 0.12, 0.3); }
  // Car horn: two short low blasts, the way traffic honks at a blockage.
  horn() {
    this.blip(370, 370, 0.12, 0.2);
    window.setTimeout(() => this.blip(370, 370, 0.12, 0.2), 140);
  }
  pickup() { this.blip(880, 1320, 0.18, 0.22); }
  click() { this.blip(660, 660, 0.06, 0.15); }
  // Mission sting: a rising three-note arpeggio.
  sting() {
    if (!this.ctx || this.muted) return;
    [523, 659, 784].forEach((f, i) => {
      window.setTimeout(() => this.blip(f, f, 0.22, 0.22), i * 110);
    });
  }
  // Fail sting: two falling notes.
  fail() {
    if (!this.ctx || this.muted) return;
    [392, 262].forEach((f, i) => {
      window.setTimeout(() => this.blip(f, f * 0.8, 0.25, 0.2), i * 160);
    });
  }
}
