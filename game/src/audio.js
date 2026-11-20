// audio.js — Solmar Bay sound, all synthesised with WebAudio: no audio
// files at all. Engine hum follows speed, a two-tone siren wails near
// police, pickups blip and missions play a little sting. M toggles mute.
(function (global) {
  'use strict';

  function makeAudio() {
    const audio = {
      ctx: null,
      master: null,
      engineOsc: null,
      engineGain: null,
      sirenOsc: null,
      sirenGain: null,
      muted: false,
      started: false,
    };
    return audio;
  }

  // Browsers only allow audio after a user gesture; call from the first
  // click or keypress that starts the game.
  function startAudio(audio) {
    if (audio.started) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.muted ? 0 : 0.5;
      audio.master.connect(audio.ctx.destination);
      // Engine: a low sawtooth whose pitch follows the car's speed.
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 55;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      const engineFilter = audio.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      audio.engineOsc.connect(engineFilter);
      engineFilter.connect(audio.engineGain);
      audio.engineGain.connect(audio.master);
      audio.engineOsc.start();
      // Siren: a sine that swings between two notes.
      audio.sirenOsc = audio.ctx.createOscillator();
      audio.sirenOsc.type = 'sine';
      audio.sirenOsc.frequency.value = 700;
      audio.sirenGain = audio.ctx.createGain();
      audio.sirenGain.gain.value = 0;
      audio.sirenOsc.connect(audio.sirenGain);
      audio.sirenGain.connect(audio.master);
      audio.sirenOsc.start();
      audio.started = true;
    } catch (err) {
      // No audio on this machine: the game plays silent, never crashes.
      audio.started = false;
    }
  }

  function setEngine(audio, speedKmh, inCar) {
    if (!audio.started) return;
    const t = audio.ctx.currentTime;
    const target = inCar ? 0.05 + Math.min(0.11, Math.abs(speedKmh) / 1200) : 0;
    audio.engineGain.gain.setTargetAtTime(target, t, 0.1);
    audio.engineOsc.frequency.setTargetAtTime(52 + Math.abs(speedKmh) * 1.1, t, 0.1);
  }

  function setSiren(audio, nearPolice) {
    if (!audio.started) return;
    const t = audio.ctx.currentTime;
    audio.sirenGain.gain.setTargetAtTime(nearPolice ? 0.045 : 0, t, 0.2);
    // Two-tone wail: alternate 700 and 950 Hz twice a second.
    const f = Math.floor(performance.now() / 450) % 2 === 0 ? 700 : 950;
    audio.sirenOsc.frequency.setTargetAtTime(f, t, 0.05);
  }

  function blip(audio, freq, dur, vol) {
    if (!audio.started) return;
    const t = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.12));
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t);
    osc.stop(t + (dur || 0.12) + 0.02);
  }

  function sting(audio) {
    if (!audio.started) return;
    // Mission complete: three rising notes.
    blip(audio, 523, 0.14, 0.22);
    setTimeout(function () { blip(audio, 659, 0.14, 0.22); }, 130);
    setTimeout(function () { blip(audio, 784, 0.3, 0.25); }, 260);
  }

  function failSting(audio) {
    if (!audio.started) return;
    // Mission failed: two falling notes, low and slow.
    blip(audio, 392, 0.2, 0.22);
    setTimeout(function () { blip(audio, 262, 0.35, 0.22); }, 200);
  }

  // A gunshot is a burst of white noise through a low-pass filter: a
  // sharp crack that decays in a tenth of a second. The noise buffer is
  // built once and reused for every shot.
  function noiseBurst(audio, dur, vol, freq) {
    if (!audio.started) return;
    if (!audio.noiseBuf) {
      const len = Math.floor(audio.ctx.sampleRate * 0.3);
      audio.noiseBuf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = audio.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const t = audio.ctx.currentTime;
    const src = audio.ctx.createBufferSource();
    src.buffer = audio.noiseBuf;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq || 1800;
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.12));
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start(t);
    src.stop(t + (dur || 0.12) + 0.02);
  }

  function shot(audio) {
    // Every shot cracks a little differently so a firefight never sounds looped.
    noiseBurst(audio, 0.12, 0.5, 1800 * (0.9 + Math.random() * 0.2));
    blip(audio, 180, 0.06, 0.25); // the low thump under the crack
  }

  function thud(audio) {
    noiseBurst(audio, 0.09, 0.35, 500); // a punch landing: dull and short
  }

  function reloadSound(audio) {
    if (!audio.started) return;
    blip(audio, 1200, 0.05, 0.18);
    setTimeout(function () { blip(audio, 900, 0.05, 0.18); }, 220);
  }

  function setMuted(audio, muted) {
    audio.muted = muted;
    if (audio.started && audio.master) {
      audio.master.gain.setTargetAtTime(muted ? 0 : 0.5, audio.ctx.currentTime, 0.05);
    }
  }

  global.VP = global.VP || {};
  global.VP.makeAudio = makeAudio;
  global.VP.startAudio = startAudio;
  global.VP.setEngine = setEngine;
  global.VP.setSiren = setSiren;
  global.VP.blip = blip;
  global.VP.sting = sting;
  global.VP.failSting = failSting;
  global.VP.shot = shot;
  global.VP.thud = thud;
  global.VP.reloadSound = reloadSound;
  global.VP.setMuted = setMuted;
})(typeof window !== 'undefined' ? window : globalThis);
