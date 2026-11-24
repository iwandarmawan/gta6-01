// Audio: a tiny WebAudio engine hum and a horn, started only after a user
// gesture. Headless runs never touch it — every call is guarded.
export function makeAudio() {
  let ctx = null, osc = null, gain = null;
  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      osc = ctx.createOscillator();
      gain = ctx.createGain();
      gain.gain.value = 0;
      osc.type = 'sawtooth';
      osc.frequency.value = 55;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      return true;
    } catch (e) { return false; }
  }
  return {
    start() { if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    setEngine(speed, top) {
      if (!ctx || !osc) return;
      osc.frequency.value = 55 + (Math.abs(speed) / Math.max(1, top)) * 90;
      gain.gain.value = 0.015 + Math.abs(speed) / Math.max(1, top) * 0.02;
    },
    horn() {
      if (!ensure()) return;
      try {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square'; o.frequency.value = 330;
        g.gain.setValueAtTime(0.06, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.4);
      } catch (e) {}
    },
  };
}
