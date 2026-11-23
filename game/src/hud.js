// HUD: wanted stars, cash, health, speed, clock, mission panel,
// compass, minimap, toasts, and the start / pause / game-over
// screens. All DOM is built here; index.html stays minimal.

import { ROADS, WORLD } from './config.js';

const CSS = `
#hud { position: fixed; inset: 0; pointer-events: none; font-family: sans-serif; color: #fff; z-index: 5; }
.hud-panel { position: absolute; background: rgba(10, 16, 28, 0.55); border-radius: 8px; padding: 8px 12px; }
#hud-stars { top: 12px; left: 12px; font-size: 22px; letter-spacing: 2px; }
#hud-stars .off { color: rgba(255,255,255,0.25); }
#hud-cash { top: 56px; left: 12px; font-size: 20px; font-weight: bold; color: #7dff9a; }
#hud-health { top: 96px; left: 12px; width: 170px; }
#hud-health .bar { height: 10px; background: rgba(255,255,255,0.25); border-radius: 5px; overflow: hidden; }
#hud-health .fill { height: 100%; background: #e84a4a; }
#hud-clock { top: 12px; right: 12px; text-align: right; font-size: 16px; }
#hud-speed { top: 56px; right: 12px; text-align: right; font-size: 20px; font-weight: bold; }
#hud-mission { top: 12px; left: 50%; transform: translateX(-50%); text-align: center; min-width: 280px; }
#hud-mission .name { font-size: 17px; font-weight: bold; color: #ffd94a; }
#hud-mission .obj { font-size: 14px; }
#hud-mission .timer { font-size: 14px; color: #9fd8ff; }
#hud-compass { top: 108px; left: 50%; transform: translateX(-50%); background: transparent; padding: 0; }
#hud-prompt { bottom: 170px; left: 50%; transform: translateX(-50%); font-size: 16px; background: rgba(10,16,28,0.7); }
#hud-toast { top: 38%; left: 50%; transform: translateX(-50%); font-size: 21px; font-weight: bold; text-align: center;
  background: rgba(10,16,28,0.72); max-width: 640px; }
#hud-minimap { position: absolute; left: 12px; bottom: 12px; border: 2px solid rgba(255,255,255,0.5); border-radius: 6px; }
#hud-hint { bottom: 12px; right: 12px; font-size: 12px; color: rgba(255,255,255,0.8); text-align: right; }
.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(6, 10, 20, 0.72); z-index: 10; pointer-events: auto; font-family: sans-serif; color: #fff; }
.overlay .card { text-align: center; max-width: 620px; padding: 28px 36px; background: rgba(10,16,28,0.85);
  border-radius: 14px; border: 1px solid rgba(255,255,255,0.2); }
.overlay h1 { font-size: 54px; margin: 0 0 4px; letter-spacing: 4px; color: #ffd94a; }
.overlay h1.red { color: #ff5a4a; }
.overlay h1.blue { color: #6aa8ff; }
.overlay p { font-size: 15px; line-height: 1.5; color: #d8e2f0; }
.overlay button { pointer-events: auto; font-size: 18px; padding: 10px 26px; margin: 6px; border: none; border-radius: 8px;
  background: #ffd94a; color: #1a2436; font-weight: bold; cursor: pointer; }
.overlay button.ghost { background: rgba(255,255,255,0.16); color: #fff; }
.overlay .keys { text-align: left; display: inline-block; font-size: 14px; line-height: 1.7; }
`;

function el(tag, id, cls) {
  const e = document.createElement(tag);
  if (id) e.id = id;
  if (cls) e.className = cls;
  return e;
}

export function createHud() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = el('div', 'hud');
  document.body.appendChild(root);

  const starsEl = el('div', 'hud-stars', 'hud-panel');
  const cashEl = el('div', 'hud-cash', 'hud-panel');
  const healthEl = el('div', 'hud-health', 'hud-panel');
  healthEl.innerHTML = '<div class="bar"><div class="fill"></div></div>';
  const healthFill = healthEl.querySelector('.fill');
  const clockEl = el('div', 'hud-clock', 'hud-panel');
  const speedEl = el('div', 'hud-speed', 'hud-panel');
  const missionEl = el('div', 'hud-mission', 'hud-panel');
  const compassWrap = el('div', 'hud-compass', 'hud-panel');
  const compass = document.createElement('canvas');
  compass.width = 260;
  compass.height = 28;
  compassWrap.appendChild(compass);
  const promptEl = el('div', 'hud-prompt', 'hud-panel');
  const toastEl = el('div', 'hud-toast', 'hud-panel');
  const minimap = document.createElement('canvas');
  minimap.id = 'hud-minimap';
  minimap.width = 190;
  minimap.height = 190;
  const hintEl = el('div', 'hud-hint', 'hud-panel');
  hintEl.innerHTML = 'WASD move / drive &nbsp;·&nbsp; E enter car / boat &nbsp;·&nbsp; F punch &nbsp;·&nbsp; Shift run &nbsp;·&nbsp; Space brake &nbsp;·&nbsp; P pause &nbsp;·&nbsp; M mute';
  root.append(starsEl, cashEl, healthEl, clockEl, speedEl, missionEl, compassWrap, promptEl, toastEl, minimap, hintEl);
  promptEl.style.display = 'none';
  toastEl.style.display = 'none';
  missionEl.style.display = 'none';

  let toastTimer = 0;
  const hud = {};

  hud.toast = function toast(text, dur) {
    toastEl.textContent = text;
    toastEl.style.display = 'block';
    toastTimer = dur || 3;
  };

  hud.setPrompt = function setPrompt(text) {
    if (!text) {
      promptEl.style.display = 'none';
      return;
    }
    promptEl.textContent = text;
    promptEl.style.display = 'block';
  };

  function drawMinimap(s) {
    const g = minimap.getContext('2d');
    const W = 190;
    const H = 190;
    const sc = W / 540;
    const ox = 10;
    const oy = (H - 400 * sc) / 2;
    const X = (x) => ox + (x - WORLD.minX) * sc;
    const Z = (z) => oy + (z - WORLD.minZ) * sc;
    g.fillStyle = '#2e7fa8';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#8fa07a';
    g.fillRect(X(WORLD.landMinX), Z(WORLD.landMinZ), (WORLD.landMaxX - WORLD.landMinX) * sc, (WORLD.landMaxZ - WORLD.landMinZ) * sc);
    g.fillStyle = '#2e7fa8';
    g.fillRect(X(WORLD.channelMinX), Z(WORLD.landMinZ), (WORLD.channelMaxX - WORLD.channelMinX) * sc, (WORLD.landMaxZ - WORLD.landMinZ) * sc);
    g.fillStyle = '#8fa07a';
    g.fillRect(X(110), Z(-14), 40 * sc, 28 * sc);
    g.fillStyle = '#e8d49a';
    g.fillRect(X(-240), Z(166), 480 * sc, 14 * sc);
    g.strokeStyle = '#3a3f46';
    g.lineWidth = 2.5;
    for (const r of ROADS) {
      g.beginPath();
      g.moveTo(X(r.x1), Z(r.z1));
      g.lineTo(X(r.x2), Z(r.z2));
      g.stroke();
    }
    // Mission target: pulsing diamond.
    if (s.target) {
      const pulse = 3 + Math.sin(s.time * 5) * 1.5;
      g.fillStyle = '#ffd94a';
      const tx = X(s.target.x);
      const tz = Z(s.target.z);
      g.beginPath();
      g.moveTo(tx, tz - pulse - 3);
      g.lineTo(tx + pulse + 3, tz);
      g.lineTo(tx, tz + pulse + 3);
      g.lineTo(tx - pulse - 3, tz);
      g.closePath();
      g.fill();
    }
    // Traffic grey, police blue, boat white.
    g.fillStyle = '#cccccc';
    for (const t of s.trafficCars || []) {
      g.fillRect(X(t.car.pos.x) - 1.5, Z(t.car.pos.z) - 1.5, 3, 3);
    }
    g.fillStyle = '#2244ff';
    for (const p of s.policeCars || []) {
      g.beginPath();
      g.arc(X(p.car.pos.x), Z(p.car.pos.z), 3, 0, Math.PI * 2);
      g.fill();
    }
    if (s.boat) {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(X(s.boat.pos.x), Z(s.boat.pos.z), 3, 0, Math.PI * 2);
      g.fill();
    }
    // Player arrow.
    const px = X(s.player.pos.x);
    const pz = Z(s.player.pos.z);
    g.save();
    g.translate(px, pz);
    // Arrow is drawn pointing down (+Z on the map); rotate by -heading
    // so it points along the player's heading.
    g.rotate(-s.player.heading);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#111111';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, 7);
    g.lineTo(-5, -5);
    g.lineTo(0, -2.5);
    g.lineTo(5, -5);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  function drawCompass(s) {
    const g = compass.getContext('2d');
    g.clearRect(0, 0, 260, 28);
    g.fillStyle = 'rgba(10,16,28,0.55)';
    g.fillRect(0, 0, 260, 28);
    const yaw = s.yaw;
    const span = Math.PI * 0.9;
    // Map north is -Z, so bearing 0 (+Z) is south.
    const labels = [[0, 'S'], [Math.PI / 2, 'E'], [Math.PI, 'N'], [Math.PI * 1.5, 'W']];
    g.strokeStyle = '#ffffff';
    g.fillStyle = '#ffffff';
    g.font = 'bold 12px sans-serif';
    g.textAlign = 'center';
    for (let deg = 0; deg < 360; deg += 15) {
      const b = (deg * Math.PI) / 180;
      let rel = b - yaw;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (Math.abs(rel) > span / 2) continue;
      const x = 130 + (rel / (span / 2)) * 125;
      const major = deg % 90 === 0;
      g.beginPath();
      g.moveTo(x, major ? 6 : 12);
      g.lineTo(x, 22);
      g.stroke();
      if (major) {
        const label = labels.find((l) => Math.abs(l[0] - b) < 0.01);
        if (label) g.fillText(label[1], x, 11);
      }
    }
    // Mission bearing marker.
    if (s.target) {
      const dx = s.target.x - s.player.pos.x;
      const dz = s.target.z - s.player.pos.z;
      const bearing = Math.atan2(dx, dz);
      let rel = bearing - yaw;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (Math.abs(rel) <= span / 2) {
        const x = 130 + (rel / (span / 2)) * 125;
        g.fillStyle = '#ffd94a';
        g.beginPath();
        g.moveTo(x, 20);
        g.lineTo(x + 5, 26);
        g.lineTo(x - 5, 26);
        g.closePath();
        g.fill();
      }
    }
  }

  // s: {cash, health, maxHealth, stars, speedKmh, vehicle, missionName,
  // objective, timeLeft, targetDist, timeOfDay, time, yaw, player,
  // target, policeCars, trafficCars, boat}
  hud.update = function update(s, dt) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += i < s.stars ? '★' : '<span class="off">★</span>';
    }
    starsEl.innerHTML = stars;
    cashEl.textContent = '$' + Math.floor(s.cash);
    healthFill.style.width = Math.max(0, (s.health / s.maxHealth) * 100) + '%';
    const hours = Math.floor(s.timeOfDay * 24);
    const mins = Math.floor((s.timeOfDay * 24 - hours) * 60);
    clockEl.textContent = String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + (s.vehicle === 'car' ? '  •  CAR' : s.vehicle === 'boat' ? '  •  BOAT' : '  •  ON FOOT');
    speedEl.textContent = s.vehicle === 'foot' ? '' : Math.round(s.speedKmh) + ' km/h';
    if (s.missionName) {
      missionEl.style.display = 'block';
      missionEl.innerHTML =
        '<div class="name">' + s.missionName + '</div>' +
        '<div class="obj">' + s.objective + '</div>' +
        '<div class="timer">' + Math.ceil(s.timeLeft) + 's &nbsp;·&nbsp; ' + Math.round(s.targetDist) + 'm</div>';
    } else {
      missionEl.style.display = 'none';
    }
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toastEl.style.display = 'none';
    }
    drawMinimap(s);
    drawCompass(s);
  };

  function makeOverlay() {
    const ov = el('div', null, 'overlay');
    const card = el('div', null, 'card');
    ov.appendChild(card);
    document.body.appendChild(ov);
    return { ov, card };
  }

  hud.showStart = function showStart(save, onPlay) {
    const { ov, card } = makeOverlay();
    card.innerHTML =
      '<h1>SOLMAR BAY</h1>' +
      '<p>An original open-world crime story. Explore a sun-soaked coastal city on foot and by car, ' +
      'take jobs from Rico, dodge the law, and sail the harbour. No city, name or song here belongs to anyone else.</p>' +
      '<p>Cash $' + save.cash + ' &nbsp;·&nbsp; Missions done ' + save.missionsDone + ' / 3' +
      (save.storyComplete ? ' &nbsp;·&nbsp; Story complete' : '') + '</p>' +
      '<div class="keys">WASD — move / drive &nbsp;·&nbsp; E — enter car or boat &nbsp;·&nbsp; F — punch &nbsp;·&nbsp; Shift — run<br>' +
      'Space — brake &nbsp;·&nbsp; Mouse drag — camera &nbsp;·&nbsp; Wheel — zoom &nbsp;·&nbsp; P — pause &nbsp;·&nbsp; M — mute</div>' +
      '<p></p>';
    const play = el('button');
    play.textContent = '▶  Play';
    play.addEventListener('click', () => {
      ov.remove();
      onPlay();
    });
    card.appendChild(play);
    hud._startOverlay = ov;
  };

  hud.showPause = function showPause(cbs) {
    const { ov, card } = makeOverlay();
    card.innerHTML = '<h1>PAUSED</h1><p>Take a breath. The city waits.</p>';
    const resume = el('button');
    resume.textContent = 'Resume';
    resume.addEventListener('click', () => { ov.remove(); cbs.onResume(); });
    const restart = el('button', null, 'ghost');
    restart.textContent = 'Restart run';
    restart.addEventListener('click', () => { ov.remove(); cbs.onRestart(); });
    const mute = el('button', null, 'ghost');
    mute.textContent = cbs.muted ? 'Unmute (M)' : 'Mute (M)';
    mute.addEventListener('click', () => { ov.remove(); cbs.onMute(); });
    const quit = el('button', null, 'ghost');
    quit.textContent = 'Quit to menu';
    quit.addEventListener('click', () => { ov.remove(); cbs.onQuit(); });
    card.append(resume, restart, mute, quit);
  };

  hud.showGameOver = function showGameOver(kind, onRetry, onQuit) {
    const { ov, card } = makeOverlay();
    const wasted = kind === 'wasted';
    card.innerHTML =
      '<h1 class="' + (wasted ? 'red' : 'blue') + '">' + (wasted ? 'WASTED' : 'BUSTED') + '</h1>' +
      '<p>' + (wasted
        ? 'Vic went down in Solmar Bay. The city keeps moving without you.'
        : 'The Solmar Bay police caught up with Vic. The run ends here.') + '</p>' +
      '<p>Press R or Retry to get back on your feet — your cash stays yours.</p>';
    const retry = el('button');
    retry.textContent = 'Retry (R)';
    retry.addEventListener('click', () => { ov.remove(); onRetry(); });
    const quit = el('button', null, 'ghost');
    quit.textContent = 'Quit to menu';
    quit.addEventListener('click', () => { ov.remove(); onQuit(); });
    card.append(retry, quit);
  };

  hud.hideStart = function hideStart() {
    if (hud._startOverlay) {
      hud._startOverlay.remove();
      hud._startOverlay = null;
    }
  };

  return hud;
}
