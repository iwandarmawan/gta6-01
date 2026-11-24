// audio.js — tiny WebAudio bleeps, guarded so a missing AudioContext never breaks the game.
let ctx = null;
function audio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}
export function beep(freq = 440, dur = 0.08, type = 'square', vol = 0.04) {
  const ac = audio();
  if (!ac) return;
  try {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(ac.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.stop(ac.currentTime + dur);
  } catch { /* sound is cosmetic */ }
}
export const sfx = {
  pickup: () => beep(660, 0.09, 'sine', 0.05),
  cash: () => { beep(880, 0.07, 'sine', 0.05); setTimeout(() => beep(1320, 0.1, 'sine', 0.05), 70); },
  siren: () => beep(700, 0.15, 'sawtooth', 0.02),
  shot: () => beep(180, 0.06, 'square', 0.06),
  engine: () => beep(90, 0.12, 'sawtooth', 0.02),
};
