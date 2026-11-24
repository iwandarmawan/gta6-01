// audio.js — tiny WebAudio bleeps. Everything guarded: no audio context in
// headless runs must never break the game.
export function createAudio() {
  let ctx = null;
  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function beep(freq, dur, type, vol) {
    try {
      const c = ensure(); if (!c) return;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = type || 'square'; o.frequency.value = freq || 440;
      g.gain.value = vol || 0.04;
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + (dur || 0.12));
    } catch (e) { /* audio is cosmetic */ }
  }
  return {
    cash() { beep(880, 0.1, 'sine', 0.05); setTimeout(() => beep(1320, 0.14, 'sine', 0.05), 90); },
    pickup() { beep(660, 0.08, 'triangle', 0.05); },
    shot() { beep(180, 0.06, 'sawtooth', 0.05); },
    siren() { beep(700, 0.16, 'sine', 0.03); setTimeout(() => beep(950, 0.16, 'sine', 0.03), 160); },
    bump() { beep(120, 0.08, 'sawtooth', 0.04); },
  };
}
