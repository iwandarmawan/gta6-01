// Procedural sound for Solmar Bay: every effect is synthesized with the
// Web Audio API, so the game ships no audio files. Audio starts on the
// first user gesture, as browsers require, and stays silent before that.

export function createAudio() {
  return {
    ctx: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    muted: false,
  };
}

export function ensureAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.35;
    audio.master.connect(audio.ctx.destination);
  } catch (err) {
    audio.ctx = null;
  }
}

function beep(audio, freq, dur, type, vol, slideTo) {
  if (!audio.ctx || audio.muted) return;
  try {
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, audio.ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, audio.ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.2, audio.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start();
    osc.stop(audio.ctx.currentTime + dur);
  } catch (err) {
    // A failed beep never stops the game.
  }
}

function noiseBurst(audio, dur, vol, filterFreq) {
  if (!audio.ctx || audio.muted) return;
  try {
    const len = Math.floor(audio.ctx.sampleRate * dur);
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = audio.ctx.createGain();
    gain.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start();
  } catch (err) {
    // A failed burst never stops the game.
  }
}

export function playPickup(audio) {
  beep(audio, 880, 0.12, 'sine', 0.25, 1320);
}

export function playMissionComplete(audio) {
  beep(audio, 523, 0.15, 'triangle', 0.25);
  setTimeout(() => beep(audio, 659, 0.15, 'triangle', 0.25), 120);
  setTimeout(() => beep(audio, 784, 0.3, 'triangle', 0.3), 240);
}

export function playGunshot(audio) {
  noiseBurst(audio, 0.12, 0.4, 3000);
}

export function playCrash(audio) {
  noiseBurst(audio, 0.25, 0.5, 500);
}

export function playSiren(audio, on) {
  if (!audio.ctx) return;
  try {
    if (on && !audio.sirenOsc) {
      audio.sirenOsc = audio.ctx.createOscillator();
      audio.sirenGain = audio.ctx.createGain();
      audio.sirenOsc.type = 'sine';
      audio.sirenOsc.frequency.value = 700;
      audio.sirenGain.gain.value = 0.05;
      const lfo = audio.ctx.createOscillator();
      const lfoGain = audio.ctx.createGain();
      lfo.frequency.value = 0.6;
      lfoGain.gain.value = 250;
      lfo.connect(lfoGain);
      lfoGain.connect(audio.sirenOsc.frequency);
      audio.sirenOsc.connect(audio.sirenGain);
      audio.sirenGain.connect(audio.master);
      audio.sirenOsc.start();
      lfo.start();
      audio.sirenLfo = lfo;
    } else if (!on && audio.sirenOsc) {
      audio.sirenOsc.stop();
      if (audio.sirenLfo) audio.sirenLfo.stop();
      audio.sirenOsc = null;
      audio.sirenLfo = null;
    }
  } catch (err) {
    // Siren failure is cosmetic.
  }
}

export function updateEngineSound(audio, speed, topSpeed, driving) {
  if (!audio.ctx || audio.muted) return;
  try {
    if (driving && !audio.engineOsc) {
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineGain = audio.ctx.createGain();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 60;
      audio.engineGain.gain.value = 0.04;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      audio.engineOsc.connect(filter);
      filter.connect(audio.engineGain);
      audio.engineGain.connect(audio.master);
      audio.engineOsc.start();
    } else if (!driving && audio.engineOsc) {
      audio.engineOsc.stop();
      audio.engineOsc = null;
    }
    if (audio.engineOsc) {
      const ratio = Math.max(0, Math.min(1, speed / topSpeed));
      audio.engineOsc.frequency.value = 55 + ratio * 140;
      audio.engineGain.gain.value = 0.03 + ratio * 0.05;
    }
  } catch (err) {
    // Engine hum failure is cosmetic.
  }
}
