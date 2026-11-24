// Tiny WebAudio synth: engine hum, pickup blips, mission chimes and a siren.
// Everything is guarded: audio only starts after the player's first gesture.
export function createAudio() {
  const audio = {
    ctx: null,
    engineOsc: null,
    engineGain: null,
    unlocked: false,
    unlock() {
      if (audio.unlocked) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audio.ctx = new Ctx();
        audio.engineOsc = audio.ctx.createOscillator();
        audio.engineOsc.type = 'sawtooth';
        audio.engineOsc.frequency.value = 55;
        audio.engineGain = audio.ctx.createGain();
        audio.engineGain.gain.value = 0;
        audio.engineOsc.connect(audio.engineGain).connect(audio.ctx.destination);
        audio.engineOsc.start();
        audio.unlocked = true;
      } catch {
        // No audio in this browser: the game plays silent.
      }
    },
    // A short tone: frequency in Hz, seconds long, 'sine' | 'square' | 'triangle'.
    blip(freq, seconds, type = 'sine', volume = 0.12) {
      if (!audio.unlocked || !audio.ctx) return;
      const t = audio.ctx.currentTime;
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
      osc.connect(gain).connect(audio.ctx.destination);
      osc.start(t);
      osc.stop(t + seconds);
    },
    coin() {
      audio.blip(880, 0.12, 'sine', 0.14);
      setTimeout(() => audio.blip(1320, 0.18, 'sine', 0.14), 90);
    },
    missionDone() {
      audio.blip(523, 0.14, 'triangle', 0.16);
      setTimeout(() => audio.blip(659, 0.14, 'triangle', 0.16), 130);
      setTimeout(() => audio.blip(784, 0.26, 'triangle', 0.16), 260);
    },
    siren(on) {
      if (!audio.unlocked || !audio.ctx) return;
      if (!audio.sirenOsc) {
        audio.sirenOsc = audio.ctx.createOscillator();
        audio.sirenOsc.type = 'sine';
        audio.sirenOsc.frequency.value = 700;
        audio.sirenGain = audio.ctx.createGain();
        audio.sirenGain.gain.value = 0;
        audio.sirenOsc.connect(audio.sirenGain).connect(audio.ctx.destination);
        audio.sirenOsc.start();
      }
      audio.sirenGain.gain.value = on ? 0.03 : 0;
      if (on) audio.sirenOsc.frequency.setTargetAtTime(950, audio.ctx.currentTime, 0.4);
    },
    // Engine pitch follows speed: 0 (idle) to 1 (top speed).
    engine(ratio, driving) {
      if (!audio.unlocked || !audio.ctx || !audio.engineGain) return;
      audio.engineGain.gain.value = driving ? 0.02 + ratio * 0.05 : 0.012;
      audio.engineOsc.frequency.value = 50 + ratio * 140;
    },
  };
  return audio;
}
