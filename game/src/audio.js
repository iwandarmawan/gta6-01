// Synthesized sound with WebAudio: no audio files, everything is
// oscillators and filtered noise. The context is created on the
// first user gesture (browser autoplay rules) and every call is
// guarded so a silent browser never breaks the game.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    engineFilter: null,
    sirenOsc: null,
    sirenGain: null,
    sirenHigh: false,
    sirenTimer: 0,
    muted: false,
  };

  // Create (or resume) the context. Call from a user gesture.
  audio.ensure = function ensure() {
    try {
      if (!audio.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audio.ctx = new AC();
        audio.master = audio.ctx.createGain();
        audio.master.gain.value = audio.muted ? 0 : 0.5;
        audio.master.connect(audio.ctx.destination);
      }
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
    } catch (err) {
      // No audio: the game stays silent.
    }
  };

  audio.setMuted = function setMuted(muted) {
    audio.muted = muted;
    if (audio.master) audio.master.gain.value = muted ? 0 : 0.5;
  };

  function makeOsc(type, freq) {
    const osc = audio.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    return osc;
  }

  // Continuous engine hum. speed01 is 0..1 of top speed.
  audio.engine = function engine(on, speed01) {
    if (!audio.ctx) return;
    try {
      if (on && !audio.engineOsc) {
        audio.engineOsc = makeOsc('sawtooth', 70);
        audio.engineFilter = audio.ctx.createBiquadFilter();
        audio.engineFilter.type = 'lowpass';
        audio.engineFilter.frequency.value = 420;
        audio.engineGain = audio.ctx.createGain();
        audio.engineGain.gain.value = 0.05;
        audio.engineOsc.connect(audio.engineFilter);
        audio.engineFilter.connect(audio.engineGain);
        audio.engineGain.connect(audio.master);
        audio.engineOsc.start();
      }
      if (!audio.engineOsc) return;
      if (!on) {
        audio.engineOsc.stop();
        audio.engineOsc = null;
        return;
      }
      audio.engineOsc.frequency.value = 55 + speed01 * 165;
      audio.engineGain.gain.value = 0.04 + speed01 * 0.05;
    } catch (err) {
      // Ignore audio errors.
    }
  };

  // Two-tone police siren while the player is wanted.
  audio.siren = function siren(on, dt) {
    if (!audio.ctx) return;
    try {
      if (on && !audio.sirenOsc) {
        audio.sirenOsc = makeOsc('square', 720);
        audio.sirenGain = audio.ctx.createGain();
        audio.sirenGain.gain.value = 0.035;
        audio.sirenOsc.connect(audio.sirenGain);
        audio.sirenGain.connect(audio.master);
        audio.sirenOsc.start();
        audio.sirenTimer = 0;
        audio.sirenHigh = false;
      }
      if (!audio.sirenOsc) return;
      if (!on) {
        audio.sirenOsc.stop();
        audio.sirenOsc = null;
        return;
      }
      audio.sirenTimer += dt;
      if (audio.sirenTimer > 0.45) {
        audio.sirenTimer = 0;
        audio.sirenHigh = !audio.sirenHigh;
        audio.sirenOsc.frequency.value = audio.sirenHigh ? 950 : 720;
      }
    } catch (err) {
      // Ignore audio errors.
    }
  };

  // Short sine blip (pickup, UI, mission step).
  audio.beep = function beep(freq, dur) {
    if (!audio.ctx) return;
    try {
      const osc = makeOsc('sine', freq || 880);
      const gain = audio.ctx.createGain();
      gain.gain.value = 0.18;
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + (dur || 0.12));
      osc.stop(audio.ctx.currentTime + (dur || 0.12));
    } catch (err) {
      // Ignore audio errors.
    }
  };

  // Little success arpeggio.
  audio.jingle = function jingle() {
    if (!audio.ctx) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => audio.beep(f, 0.22), i * 110);
    });
  };

  // Crash: a burst of filtered noise.
  audio.crash = function crash(strength) {
    if (!audio.ctx) return;
    try {
      const len = Math.floor(audio.ctx.sampleRate * 0.18);
      const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audio.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      const gain = audio.ctx.createGain();
      gain.gain.value = 0.25 * Math.min(1, strength || 0.5);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(audio.master);
      src.start();
    } catch (err) {
      // Ignore audio errors.
    }
  };

  return audio;
}
