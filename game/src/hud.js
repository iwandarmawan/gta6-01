// hud.js — Solmar Bay HUD: cash, health, wanted stars, speed, objective,
// in-game clock, centre messages, damage vignette, and a live minimap
// drawn on a 2D canvas (roads, beach, player arrow, mission blip, police).
(function (global) {
  'use strict';

  function makeHud() {
    const hud = {
      cash: document.getElementById('hud-cash'),
      health: document.getElementById('hud-health-fill'),
      stars: document.getElementById('hud-stars'),
      speed: document.getElementById('hud-speed'),
      speedLabel: document.getElementById('hud-speed-label'),
      objective: document.getElementById('hud-objective'),
      clock: document.getElementById('hud-clock'),
      message: document.getElementById('hud-message'),
      vignette: document.getElementById('vignette'),
      wantedFlash: document.getElementById('wanted-flash'),
      minimap: document.getElementById('minimap'),
      mapCtx: null,
      lastMessage: '',
    };
    if (hud.minimap) hud.mapCtx = hud.minimap.getContext('2d');
    return hud;
  }

  function fmtCash(n) {
    return '$' + Math.floor(n).toLocaleString('en-US');
  }

  function updateHud(hud, state) {
    if (hud.cash) hud.cash.textContent = fmtCash(state.cash);
    if (hud.health) {
      hud.health.style.width = Math.max(0, Math.min(100, state.health)) + '%';
      hud.health.style.background = state.health > 50 ? '#37c978' : state.health > 25 ? '#f2a93b' : '#e84a4a';
    }
    if (hud.stars) {
      let s = '';
      for (let i = 0; i < 5; i++) s += i < state.wanted ? '★' : '☆';
      hud.stars.textContent = s;
      hud.stars.style.color = state.wanted > 0 ? '#ffd23b' : '#ffffff88';
    }
    if (hud.speed) {
      if (state.inCar) {
        hud.speed.textContent = String(Math.round(Math.abs(state.speedKmh)));
        hud.speedLabel.textContent = 'km/h';
      } else {
        hud.speed.textContent = state.running ? 'RUN' : 'WALK';
        hud.speedLabel.textContent = '';
      }
    }
    if (hud.objective) hud.objective.textContent = state.objective || '';
    if (hud.clock) {
      const h = Math.floor(state.clockMinutes / 60) % 24;
      const m = Math.floor(state.clockMinutes % 60);
      hud.clock.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }
    if (hud.message) {
      if (state.message && state.message !== hud.lastMessage) {
        hud.message.textContent = state.message;
        hud.message.style.opacity = '1';
        hud.lastMessage = state.message;
      }
      if (!state.message && hud.lastMessage) {
        hud.message.style.opacity = '0';
        hud.lastMessage = '';
      }
    }
    if (hud.vignette) {
      const hurt = state.health < 100 ? (100 - state.health) / 100 : 0;
      hud.vignette.style.opacity = String(Math.min(0.7, hurt * 0.9));
    }
    if (hud.wantedFlash) {
      hud.wantedFlash.style.opacity = state.wanted > 0 && Math.floor(performance.now() / 500) % 2 === 0 ? '0.12' : '0';
    }
  }

  // Draw the minimap: roads as grey lines, the sea on the right, the plaza
  // as a square, the player as a white arrow, the mission as a pulsing
  // yellow diamond, police as flashing blue/red dots, traffic as grey dots.
  function drawMinimap(hud, world) {
    const ctx = hud.mapCtx;
    if (!ctx) return;
    const S = hud.minimap.width;
    const city = world.city;
    const span = city.half * 2 + 200; // world units across the map
    const toMap = function (x, z) {
      return [
        ((x + city.half + 100) / span) * S,
        ((z + city.half + 100) / span) * S,
      ];
    };
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#20262e';
    ctx.fillRect(0, 0, S, S);
    // Sea on the east edge.
    const sea = toMap(VP.CITY.BEACH_X, 0);
    ctx.fillStyle = '#2f7fb8';
    ctx.fillRect(sea[0], 0, S - sea[0], S);
    // Roads.
    ctx.strokeStyle = '#6a7078';
    ctx.lineWidth = 3;
    for (const r of city.roads) {
      const a = toMap(-city.half, r);
      const b = toMap(city.half, r);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      const c = toMap(r, -city.half);
      const d = toMap(r, city.half);
      ctx.beginPath();
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.stroke();
    }
    // Plaza.
    const pl = toMap(city.plaza.x - 18, city.plaza.z - 18);
    ctx.fillStyle = '#c9bda6';
    ctx.fillRect(pl[0], pl[1], 36 / span * S, 36 / span * S);
    // Traffic dots.
    ctx.fillStyle = '#9aa0a8';
    for (const car of world.traffic) {
      const p = toMap(car.x, car.z);
      ctx.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3);
    }
    // Police dots, flashing.
    const flash = Math.floor(performance.now() / 300) % 2 === 0;
    ctx.fillStyle = flash ? '#2244ff' : '#ff2222';
    for (const car of world.police) {
      const p = toMap(car.x, car.z);
      ctx.beginPath();
      ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Mission blip, pulsing yellow diamond.
    if (!world.mission.done) {
      const p = toMap(world.mission.marker.x, world.mission.marker.z);
      const r = 4 + Math.sin(performance.now() / 250) * 1.5;
      ctx.fillStyle = '#f2d05a';
      ctx.beginPath();
      ctx.moveTo(p[0], p[1] - r);
      ctx.lineTo(p[0] + r, p[1]);
      ctx.lineTo(p[0], p[1] + r);
      ctx.lineTo(p[0] - r, p[1]);
      ctx.closePath();
      ctx.fill();
    }
    // Player arrow, pointing along the heading, north up. The map puts
    // world +x right and +z down, and the arrow is drawn pointing up, so
    // the rotation that aims it along (sin h, cos h) is PI - h.
    const pp = toMap(world.playerX, world.playerZ);
    ctx.save();
    ctx.translate(pp[0], pp[1]);
    ctx.rotate(Math.PI - world.playerHeading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // North marker.
    ctx.fillStyle = '#ffffffcc';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('N', S - 12, 13);
  }

  global.VP = global.VP || {};
  global.VP.makeHud = makeHud;
  global.VP.updateHud = updateHud;
  global.VP.drawMinimap = drawMinimap;
})(typeof window !== 'undefined' ? window : globalThis);
