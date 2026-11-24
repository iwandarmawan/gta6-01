// Sound, synthesized in the browser with WebAudio: no audio files, no network.
// An engine hum that follows speed, a two-tone siren while the police are
// after you, and short blips for pickups, cash and gunshots. Everything is
// guarded: audio only starts after a real user gesture, and a headless
// browser that cannot hear simply never starts it.
export function makeAudio() {
  const audio = {
    ctx: null, engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null,
    enabled: false,
    // Call from a click or keypress: the browser only allows sound after one.
    unlock() {
      if (audio.ctx) {
        if (audio.ctx.state === 'suspended') audio.ctx.resume();
        return;
      }
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audio.ctx = new Ctx();
        audio.engineOsc = audio.ctx.createOscillator();
        audio.engineOsc.type = 'sawtooth';
        audio.engineOsc.frequency.value = 60;
        audio.engineGain = audio.ctx.createGain();
        audio.engineGain.gain.value = 0;
        const filter = audio.ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 500;
        audio.engineOsc.connect(filter); filter.connect(audio.engineGain); audio.engineGain.connect(audio.ctx.destination);
        audio.engineOsc.start();
        audio.sirenOsc = audio.ctx.createOscillator();
        audio.sirenOsc.type = 'square';
        audio.sirenOsc.frequency.value = 700;
        audio.sirenGain = audio.ctx.createGain();
        audio.sirenGain.gain.value = 0;
        audio.sirenOsc.connect(audio.sirenGain); audio.sirenGain.connect(audio.ctx.destination);
        audio.sirenOsc.start();
        audio.enabled = true;
      } catch {
        audio.enabled = false;
      }
    },
    // speed01 is 0 at rest and 1 at top speed; driving is the only engine sound.
    engine(speed01, driving) {
      if (!audio.enabled || !audio.engineOsc) return;
      audio.engineOsc.frequency.value = 50 + speed01 * 160;
      audio.engineGain.gain.value = driving ? 0.02 + speed01 * 0.03 : 0;
    },
    // Two tones, alternating twice a second, only while wanted.
    siren(on, time) {
      if (!audio.enabled || !audio.sirenOsc) return;
      audio.sirenOsc.frequency.value = Math.floor(time * 2) % 2 === 0 ? 700 : 950;
      audio.sirenGain.gain.value = on ? 0.015 : 0;
    },
    // One short blip: a pickup, a mission step, a fare paid.
    blip(freq = 880) {
      if (!audio.enabled || !audio.ctx) return;
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, audio.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + 0.15);
      osc.connect(gain); gain.connect(audio.ctx.destination);
      osc.start(); osc.stop(audio.ctx.currentTime + 0.16);
    },
    // Cash: two blips, rising.
    cash() { audio.blip(660); setTimeout(() => audio.blip(990), 90); },
    // A gunshot: a burst of filtered noise.
    shot() {
      if (!audio.enabled || !audio.ctx) return;
      const len = audio.ctx.sampleRate * 0.08;
      const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audio.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = audio.ctx.createGain();
      gain.gain.value = 0.12;
      src.connect(gain); gain.connect(audio.ctx.destination);
      src.start();
    },
  };
  return audio;
}
