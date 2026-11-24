// Procedural night audio: engine hum, police siren, gunshot, cash chime.
// Everything is synthesized with WebAudio — no audio files, no network.
export function makeAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  const api = {
    ensure() {
      if (ctx) return;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 50;
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(ctx.destination);
        engineOsc.start();
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'triangle';
        sirenOsc.frequency.value = 700;
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(ctx.destination);
        sirenOsc.start();
      } catch (e) {
        ctx = null;
      }
    },
    engine(speed, on) {
      if (!ctx) return;
      engineGain.gain.value = on ? 0.03 + Math.min(0.05, Math.abs(speed) * 0.0012) : 0;
      engineOsc.frequency.value = 48 + Math.abs(speed) * 2.2;
    },
    siren(on, t) {
      if (!ctx) return;
      sirenGain.gain.value = on ? 0.018 : 0;
      if (on) sirenOsc.frequency.value = 650 + Math.sin(t * 4) * 180;
    },
    shot() {
      if (!ctx) return;
      const dur = 0.12;
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = 0.14;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    },
    chime() {
      if (!ctx) return;
      [880, 1318].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.06;
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.09);
        o.stop(ctx.currentTime + i * 0.09 + 0.25);
      });
    },
  };
  return api;
}
