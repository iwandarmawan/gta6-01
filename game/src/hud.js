// Solmar Bay — HUD and live minimap.
// The HUD is DOM (cash, health, stars, speed, ammo, objective, clock,
// mission timer, centre messages, title and pause screens); the minimap is
// a small canvas redrawn every frame: roads, the player arrow, the mission
// blip, police dots and traffic dots, north up.

import { MISSIONS, TUNE, clamp } from './config.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('hud');
    this.cashEl = document.getElementById('hud-cash');
    this.hpFill = document.getElementById('hud-hp-fill');
    this.starsEl = document.getElementById('hud-stars');
    this.speedEl = document.getElementById('hud-speed');
    this.ammoEl = document.getElementById('hud-ammo');
    this.objectiveEl = document.getElementById('hud-objective');
    this.clockEl = document.getElementById('hud-clock');
    this.timerEl = document.getElementById('hud-timer');
    this.msgEl = document.getElementById('hud-message');
    this.vignette = document.getElementById('vignette');
    this.minimap = document.getElementById('minimap');
    this.mm = this.minimap.getContext('2d');
    this.titleEl = document.getElementById('title-screen');
    this.pauseEl = document.getElementById('pause-screen');
    this.pauseMissions = document.getElementById('pause-missions');
    this.pauseCash = document.getElementById('pause-cash');
    this.endEl = document.getElementById('end-screen');
    this.endTitle = document.getElementById('end-title');
    this.endText = document.getElementById('end-text');
    this.msgTimer = 0;
    this.lastCash = -1;
  }

  say(text) {
    this.msgEl.textContent = text;
    this.msgEl.style.opacity = '1';
    this.msgTimer = 4;
  }

  showTitle(cash, bestMission) {
    this.titleEl.style.display = 'flex';
    this.pauseEl.style.display = 'none';
    this.endEl.style.display = 'none';
    document.getElementById('title-cash').textContent = `Cash $${cash} · Best job: ${bestMission === 0 ? 'none yet' : 'Job ' + bestMission}`;
  }

  hideTitle() { this.titleEl.style.display = 'none'; }

  // One place that knows a job's state, so the pause list and the HUD
  // can never disagree about it.
  missionState(m) {
    const g = this.game;
    if (g.missions.done.includes(m.id)) return 'DONE ✓';
    if (m.id === 5 && !(g.missions.done.includes(1) && g.missions.done.includes(2) && g.missions.done.includes(3) && g.missions.done.includes(4))) return 'LOCKED';
    if (g.missions.current && g.missions.current.id === m.id) return 'ACTIVE';
    return 'OPEN';
  }

  showPause() {
    const g = this.game;
    this.pauseEl.style.display = 'flex';
    this.pauseCash.textContent = `Cash $${g.cash}`;
    let html = '';
    for (const m of MISSIONS) {
      const state = this.missionState(m);
      const done = state === 'DONE ✓';
      const active = state === 'ACTIVE';
      html += `<div class="mission-row ${done ? 'done' : ''} ${active ? 'active' : ''}" data-mission="${m.id}">
        <b>Job ${m.id} — ${m.name}</b> · $${m.reward} · <span>${state}</span><br>
        <small>${m.objective}</small></div>`;
    }
    this.pauseMissions.innerHTML = html;
    // Click a row to start that job.
    this.pauseMissions.querySelectorAll('.mission-row').forEach((row) => {
      row.addEventListener('click', () => {
        const id = Number(row.dataset.mission);
        if (g.missions.start(id)) {
          this.hidePause();
          g.resume();
        }
      });
    });
  }

  hidePause() { this.pauseEl.style.display = 'none'; }

  showEnd(kind, fine) {
    this.endEl.style.display = 'flex';
    this.endTitle.textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
    this.endText.textContent = kind === 'busted'
      ? `The Solmar Bay PD took you in. Fine: $${fine}. Your car is impounded at the plaza.`
      : `You got wasted on the streets of Solmar Bay. Hospital bill: $${fine}.`;
  }

  hideEnd() { this.endEl.style.display = 'none'; }

  update(dt) {
    const g = this.game;
    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) this.msgEl.style.opacity = '0';
    }
    // Cash (update only when it changes, to avoid DOM churn).
    if (g.cash !== this.lastCash) {
      this.lastCash = g.cash;
      this.cashEl.textContent = `$${g.cash}`;
    }
    // Health bar: green → red as HP falls; pulse when low.
    const hpPct = clamp(g.player.hp / TUNE.playerHp, 0, 1);
    this.hpFill.style.width = `${Math.round(hpPct * 100)}%`;
    this.hpFill.style.background = hpPct > 0.5 ? '#3fae4a' : hpPct > 0.25 ? '#e8a832' : '#d83a2a';
    this.hpFill.style.opacity = hpPct <= 0.25 && Math.floor(g.time * 3) % 2 === 0 ? '0.5' : '1';
    // Wanted stars: filled ★ for each star, empty ☆ for the rest.
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < g.wanted ? '★' : '☆';
    this.starsEl.textContent = stars;
    this.starsEl.style.color = g.wanted >= 3 ? '#ff5a4a' : '#ffd832';
    // Speed and ammo.
    const kmh = g.player.inCar && g.player.car ? Math.round(g.player.car.speedKmh) : 0;
    this.speedEl.textContent = g.player.inCar ? `${kmh} km/h` : 'on foot';
    const c = g.combat;
    this.ammoEl.textContent = c.weapon === 'pistol'
      ? `PISTOL ${c.mag} / ${c.reserve}${c.reloading > 0 ? ' …reloading' : ''}`
      : 'FISTS — press 2 for pistol';
    // Objective + mission timer.
    this.objectiveEl.textContent = g.missions.objectiveText();
    if (g.missions.current && g.missions.current.id === 3 && g.missions.phase === 'active') {
      const t = Math.max(0, g.missions.timer);
      const mm = Math.floor(t / 60);
      const ss = Math.floor(t % 60).toString().padStart(2, '0');
      this.timerEl.textContent = `⏱ ${mm}:${ss}`;
      this.timerEl.style.display = 'block';
    } else {
      this.timerEl.style.display = 'none';
    }
    // In-game clock: one game hour per two real minutes, starting at 08:00.
    const totalMin = 8 * 60 + Math.floor(g.time * 0.5);
    const hh = Math.floor(totalMin / 60) % 24;
    const mi = totalMin % 60;
    this.clockEl.textContent = `${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
    // Damage vignette: red edges while HP is low or right after a hit.
    const hurt = clamp(1 - hpPct, 0, 1) * 0.55 + (g.hurtFlash > 0 ? 0.35 : 0);
    this.vignette.style.opacity = String(clamp(hurt, 0, 0.9));
    this.drawMinimap();
  }

  drawMinimap() {
    const g = this.game;
    const ctx = this.mm;
    const W = this.minimap.width;
    const H = this.minimap.height;
    const HALF = 290;
    const toX = (x) => ((x + HALF) / (HALF * 2)) * W;
    const toY = (z) => ((z + HALF) / (HALF * 2)) * H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(12, 18, 26, 0.82)';
    ctx.fillRect(0, 0, W, H);
    // Sea (west) and canal (south).
    ctx.fillStyle = '#2f7fb8';
    ctx.fillRect(0, 0, toX(-297), H);
    ctx.fillRect(0, toY(297), W, H - toY(297));
    // Roads: grey lines on the grid.
    ctx.strokeStyle = '#6a6a72';
    ctx.lineWidth = 3;
    for (let k = -5; k <= 5; k += 1) {
      const c = k * 54;
      ctx.beginPath(); ctx.moveTo(toX(c), 0); ctx.lineTo(toX(c), H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, toY(c)); ctx.lineTo(W, toY(c)); ctx.stroke();
    }
    // Plaza + park (park block is centred on 135,-81, spanning 115..155).
    ctx.fillStyle = '#b9a98c';
    ctx.fillRect(toX(-48), toY(-48), toX(0) - toX(-48), toY(0) - toY(-48));
    ctx.fillStyle = '#5da24a';
    ctx.fillRect(toX(115), toY(-101), toX(155) - toX(115), toY(-61) - toY(-101));
    // Mission blip: pulsing gold diamond.
    if (g.missions.marker && g.missions.phase === 'active') {
      const pulse = 5 + Math.sin(g.time * 5) * 2;
      ctx.fillStyle = '#ffd832';
      ctx.beginPath();
      ctx.arc(toX(g.missions.marker.x), toY(g.missions.marker.z), pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cash pickups: small green dots.
    ctx.fillStyle = '#32d832';
    for (const p of g.pickups) {
      if (p.taken) continue;
      ctx.fillRect(toX(p.x) - 1.5, toY(p.z) - 1.5, 3, 3);
    }
    // Traffic: grey dots; police: flashing blue/red dots.
    ctx.fillStyle = '#9a9aa2';
    for (const car of g.traffic.cars) {
      if (car.dead) continue;
      ctx.fillRect(toX(car.x) - 1.5, toY(car.z) - 1.5, 3, 3);
    }
    const flashBlue = Math.floor(g.time * 2) % 2 === 0;
    ctx.fillStyle = flashBlue ? '#2a4aff' : '#ff2a2a';
    for (const car of g.police.cars) {
      ctx.beginPath();
      ctx.arc(toX(car.x), toY(car.z), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player arrow: white triangle pointing along the heading.
    const px = toX(g.player.x);
    const py = toY(g.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(Math.sin(g.player.heading), -Math.cos(g.player.heading)) + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // North marker.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('N', W - 12, 12);
  }
}
