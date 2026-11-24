// HUD: wanted stars, cash, health, objective, speed, timer and a minimap
// canvas pinned vertically centered on the left edge (bottom-anchored HUD
// falls into a headless-Chromium compositing hole — keep it centered).
import { wantedStars } from './police.js';
import { SEA_EDGE } from './config.js';

export function makeHud() {
  const hud = document.getElementById('hud');
  const els = {
    stars: document.getElementById('hud-stars'),
    cash: document.getElementById('hud-cash'),
    health: document.getElementById('hud-health-bar'),
    objective: document.getElementById('hud-objective'),
    timer: document.getElementById('hud-timer'),
    speed: document.getElementById('hud-speed'),
    state: document.getElementById('hud-state'),
  };
  const map = document.getElementById('minimap');
  const mctx = map.getContext('2d');
  return { hud, els, map, mctx };
}

export function updateHud(h, s) {
  h.els.stars.textContent = wantedStars(s.wanted);
  h.els.cash.textContent = '$' + s.cash;
  h.els.health.style.width = Math.max(0, Math.min(100, s.health)) + '%';
  h.els.objective.textContent = s.objective;
  h.els.timer.textContent = s.timer > 0 ? Math.ceil(s.timer) + 's' : '';
  h.els.speed.textContent = Math.round(Math.abs(s.speed) * 2.4) + ' km/h';
  h.els.state.textContent = s.stateLabel || '';
  drawMinimap(h, s);
}

function drawMinimap(h, s) {
  const c = h.mctx, W = h.map.width, H = h.map.height;
  const scale = W / 440;
  const px = (x) => (x + 220) * scale;
  const pz = (z) => (z + 220) * scale;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#10161c';
  c.fillRect(0, 0, W, H);
  // Sea, west.
  c.fillStyle = '#2e4a5e';
  c.fillRect(0, 0, px(SEA_EDGE) , H);
  // Roads.
  c.strokeStyle = '#3a444e';
  c.lineWidth = 2;
  for (let i = -4; i <= 4; i++) {
    const p = i * 44 - 4;
    c.beginPath(); c.moveTo(px(p), 0); c.lineTo(px(p), H); c.stroke();
    c.beginPath(); c.moveTo(0, pz(p)); c.lineTo(W, pz(p)); c.stroke();
  }
  // Lighthouse + beacon.
  c.fillStyle = '#fff2c0';
  c.beginPath(); c.arc(px(-178), pz(0), 4, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#ffc94d';
  c.beginPath(); c.arc(px(s.target.x), pz(s.target.z), 7, 0, Math.PI * 2); c.stroke();
  // Police dots.
  c.fillStyle = '#3a7bff';
  for (const p of s.police || []) { c.beginPath(); c.arc(px(p.x), pz(p.z), 2.5, 0, Math.PI * 2); c.fill(); }
  // Player arrow.
  c.save();
  c.translate(px(s.player.x), pz(s.player.z));
  c.rotate(-s.player.heading);
  c.fillStyle = '#ffffff';
  c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 5); c.lineTo(-4, 5); c.closePath(); c.fill();
  c.restore();
}
