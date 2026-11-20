// Audio: everything is synthesised with WebAudio — no audio assets. An
// engine hum tied to speed, a two-tone siren near police, gunshots, pickup
// blips, mission stings and menu clicks. M toggles mute; the context starts
// on the first user gesture, as browsers require.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenHigh = false;
  let sirenTimer = 0;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctx = null;
    }
    if (!ctx) return null;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'square';
    sirenOsc.frequency.value = 700;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(ctx.destination);
    sirenOsc.start();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 3000;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(t);
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    engine(speed, inCar) {
      if (!ensure()) return;
      const target = muted ? 0 : inCar ? 0.03 + Math.min(0.09, Math.abs(speed) * 0.0022) : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + Math.abs(speed) * 3.2, ctx.currentTime, 0.1);
    },
    siren(on) {
      if (!ensure()) return;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.035 : 0, ctx.currentTime, 0.2);
      if (on) {
        sirenTimer += 1 / 60;
        if (sirenTimer > 0.45) {
          sirenTimer = 0;
          sirenHigh = !sirenHigh;
          sirenOsc.frequency.setTargetAtTime(sirenHigh ? 950 : 700, ctx.currentTime, 0.05);
        }
      }
    },
    shot() {
      noise(0.14, 0.5, 1800);
      tone(140, 0.1, 'square', 0.2, 60);
    },
    enemyShot() {
      noise(0.12, 0.25, 1200);
    },
    punch() {
      noise(0.08, 0.25, 900);
    },
    reload() {
      tone(500, 0.07, 'square', 0.1);
      setTimeout(() => tone(700, 0.07, 'square', 0.1), 350);
    },
    blip() {
      tone(880, 0.09, 'sine', 0.18, 1320);
    },
    crash() {
      noise(0.25, 0.4, 700);
    },
    click() {
      tone(660, 0.05, 'sine', 0.12);
    },
    sting() {
      tone(523, 0.14, 'triangle', 0.16);
      setTimeout(() => tone(659, 0.14, 'triangle', 0.16), 130);
      setTimeout(() => tone(784, 0.24, 'triangle', 0.18), 260);
    },
    busted() {
      tone(392, 0.3, 'triangle', 0.18, 262);
      setTimeout(() => tone(262, 0.5, 'triangle', 0.18), 280);
    },
    fail() {
      tone(330, 0.2, 'triangle', 0.16, 220);
      setTimeout(() => tone(220, 0.35, 'triangle', 0.16, 165), 200);
    },
    horn() {
      tone(370, 0.18, 'square', 0.07);
      setTimeout(() => tone(370, 0.18, 'square', 0.07), 220);
    },
    setMuted(m) {
      muted = m;
      if (engineGain) engineGain.gain.value = 0;
      if (sirenGain) sirenGain.gain.value = 0;
    },
    isMuted() {
      return muted;
    },
  };
}
