// HUD: a DOM overlay plus a live canvas minimap. Cash, health, wanted
// stars, speed, ammo, the objective line, the mission countdown, a damage
// vignette, a busted warning, toasts, and the menu panels (title, pause with
// the mission list and cash, briefing, busted/wasted, job failed). The
// minimap draws the roads, the player arrow, the mission blip, police dots
// and traffic dots, north up.
export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    cash: $('hud-cash'),
    clock: $('hud-clock'),
    health: $('hud-health'),
    healthBar: $('hud-healthbar'),
    stars: $('hud-stars'),
    objective: $('hud-objective'),
    timer: $('hud-timer'),
    speed: $('hud-speed'),
    ammo: $('hud-ammo'),
    weapon: $('hud-weapon'),
    crosshair: $('crosshair'),
    vignette: $('vignette'),
    bust: $('hud-bust'),
    toast: $('hud-toast'),
    minimap: $('minimap'),
    panels: {
      title: $('panel-title'),
      pause: $('panel-pause'),
      brief: $('panel-brief'),
      over: $('panel-over'),
    },
    briefTitle: $('brief-title'),
    briefText: $('brief-text'),
    overTitle: $('over-title'),
    overText: $('over-text'),
    pauseCash: $('pause-cash'),
    pauseMissions: $('pause-missions'),
  };
  const mapCtx = els.minimap.getContext('2d');
  let toastTimer = 0;
  let flashTimer = 0;
  let wantedFlash = 0;

  function showPanel(name) {
    for (const key of Object.keys(els.panels)) {
      els.panels[key].classList.toggle('hidden', key !== name);
    }
    if (!name) {
      for (const key of Object.keys(els.panels)) els.panels[key].classList.add('hidden');
    }
  }

  return {
    showPanel,
    objective(text) {
      els.objective.textContent = text;
    },
    toast(text) {
      els.toast.textContent = text;
      els.toast.classList.remove('hidden');
      toastTimer = 3;
    },
    damageFlash() {
      flashTimer = 0.35;
    },
    flashWanted() {
      wantedFlash = 0.8;
    },
    bustWarning(frac) {
      if (frac > 0) {
        els.bust.classList.remove('hidden');
        els.bust.textContent = `BUSTED IN ${Math.max(0, 1.5 - frac * 1.5).toFixed(1)}s — RUN!`;
      } else {
        els.bust.classList.add('hidden');
      }
    },
    showBrief(def) {
      els.briefTitle.textContent = `JOB ${def.id}: ${def.name} — $${def.reward}`;
      els.briefText.textContent = def.brief;
      showPanel('brief');
    },
    showOver(title, text) {
      els.overTitle.textContent = title;
      els.overText.textContent = text;
      showPanel('over');
    },
    showPause(G) {
      els.pauseCash.textContent = `$${G.cash}`;
      els.pauseMissions.innerHTML = '';
      const defs = G.missionDefs;
      for (let i = 0; i < defs.length; i += 1) {
        const done = G.missionsDone[defs[i].id];
        const locked = defs[i].id === 5 && !G.missionsDone[4];
        const li = document.createElement('li');
        li.textContent = `${done ? '✓' : locked ? '🔒' : '○'} JOB ${defs[i].id}: ${defs[i].name} — $${defs[i].reward}${done ? ' (done)' : ''}`;
        els.pauseMissions.appendChild(li);
      }
      showPanel('pause');
    },
    update(G, dt) {
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) els.toast.classList.add('hidden');
      }
      if (flashTimer > 0) flashTimer -= dt;
      if (wantedFlash > 0) wantedFlash -= dt;
      els.vignette.style.opacity = flashTimer > 0 ? String(Math.min(0.7, flashTimer * 2)) : '0';
      els.cash.textContent = `$${G.cash}`;
      // The in-game clock: the city wakes at 08:00 and the day runs on.
      const mins = 8 * 60 + Math.floor(G.time / 60);
      const hh = Math.floor(mins / 60) % 24;
      const mm = (mins % 60).toString().padStart(2, '0');
      els.clock.textContent = `${hh}:${mm}`;
      els.health.textContent = `${Math.ceil(G.player.health)} HP`;
      els.healthBar.style.width = `${Math.max(0, G.player.health)}%`;
      els.healthBar.style.background = G.player.health > 50 ? '#39d353' : G.player.health > 25 ? '#f2c94c' : '#e5534b';
      // Low health pulses the bar so a glance is enough to notice.
      els.healthBar.style.opacity = G.player.health <= 25 ? String(0.55 + 0.45 * Math.abs(Math.sin(G.time * 5))) : '1';
      let stars = '';
      for (let i = 0; i < 5; i += 1) stars += i < G.wanted ? '★' : '☆';
      els.stars.textContent = stars;
      els.stars.style.color = wantedFlash > 0 ? '#ff2a2a' : '#ffc93c';
      const speed = G.inCar ? Math.abs(G.car.speed) * 3.6 : Math.abs(G.player.speed || 0) * 3.6;
      els.speed.textContent = `${Math.round(speed)} km/h`;
      els.ammo.textContent = G.combat.weapon === 'pistol'
        ? (G.combat.reloading > 0 ? 'RELOADING…' : `${G.combat.mag} / ${G.combat.reserve}`)
        : 'FISTS';
      els.weapon.textContent = G.combat.weapon === 'pistol' ? 'PISTOL [1 fists / 2 pistol]' : 'FISTS [1 fists / 2 pistol]';
      els.crosshair.classList.toggle('hidden', !(G.combat.weapon === 'pistol' && !G.inCar && G.mode === 'play'));
      // Mission countdown.
      if (G.mission && G.mission.state === 'active' && G.mission.id === 3 && G.mission.stage === 'deliver') {
        els.timer.classList.remove('hidden');
        const t = Math.max(0, G.mission.timer);
        const mm = Math.floor(t / 60);
        const ss = Math.floor(t % 60).toString().padStart(2, '0');
        els.timer.textContent = `⏱ ${mm}:${ss}`;
        els.timer.style.color = t < 20 ? '#ff2a2a' : '#ffffff';
      } else {
        els.timer.classList.add('hidden');
      }
      this.drawMinimap(G);
    },
    drawMinimap(G) {
      const c = mapCtx;
      const S = 150;
      const half = G.city.half;
      const toMap = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
      c.clearRect(0, 0, S, S);
      c.fillStyle = 'rgba(10, 14, 20, 0.75)';
      c.fillRect(0, 0, S, S);
      // Roads.
      c.strokeStyle = '#8a8f94';
      c.lineWidth = 2;
      for (const p of G.city.roads) {
        const [x1] = toMap(p, -half);
        const [, y1] = toMap(-half, p);
        c.beginPath();
        c.moveTo(x1, 0);
        c.lineTo(x1, S);
        c.stroke();
        c.beginPath();
        c.moveTo(0, y1);
        c.lineTo(S, y1);
        c.stroke();
      }
      // Beach.
      c.fillStyle = '#e8d8a8';
      const [bx] = toMap(G.city.half, 0);
      c.fillRect(bx, 0, S - bx, S);
      // Mission blip.
      if (G.mission && G.mission.target) {
        const [mx, my] = toMap(G.mission.target.x, G.mission.target.z);
        c.fillStyle = '#ffc93c';
        c.beginPath();
        c.arc(mx, my, 5, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1.5;
        c.stroke();
      }
      // Police dots (red) and traffic dots (white).
      c.fillStyle = '#ff2a2a';
      for (const car of G.police.cars) {
        const [x, y] = toMap(car.x, car.z);
        c.fillRect(x - 2, y - 2, 4, 4);
      }
      c.fillStyle = '#ffffff';
      for (const car of G.traffic.cars) {
        const [x, y] = toMap(car.x, car.z);
        c.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      // Player arrow (green), rotated to face the heading.
      const px = G.inCar ? G.car.x : G.player.x;
      const pz = G.inCar ? G.car.z : G.player.z;
      const heading = G.inCar ? G.car.angle : G.player.angle;
      const [ax, ay] = toMap(px, pz);
      c.save();
      c.translate(ax, ay);
      c.rotate(heading + Math.PI / 2);
      c.fillStyle = '#39d353';
      c.beginPath();
      c.moveTo(0, -7);
      c.lineTo(5, 6);
      c.lineTo(-5, 6);
      c.closePath();
      c.fill();
      c.restore();
    },
  };
}
