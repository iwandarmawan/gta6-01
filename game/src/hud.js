// The HUD: wanted stars, compass, cash, health, objective banner, toasts, menus
// and the minimap. The minimap sits vertically centred on the left edge — never
// bottom-anchored, which a headless compositor renders as a dark hole.
import { BEACH_X, GARAGE, LIGHTHOUSE, MARINA, PLAZA, WORLD } from './config.js';

export function createHud(G) {
  const $ = (id) => document.getElementById(id);
  const hud = {
    starsEl: $('stars'),
    compassEl: $('compass'),
    cashEl: $('cash'),
    hpEl: $('hpbar'),
    speedEl: $('speed'),
    objectiveEl: $('objective'),
    bannerEl: $('banner'),
    bannerTitle: $('banner-title'),
    bannerSub: $('banner-sub'),
    toastEl: $('toast'),
    menuEl: $('menu'),
    pauseEl: $('pause'),
    garageEl: $('garage'),
    bustedEl: $('busted'),
    bustedText: $('busted-text'),
    map: $('minimap').getContext('2d'),
    bannerTimer: 0,
    toastTimer: 0,
    banner(title, sub = '') {
      hud.bannerTitle.textContent = title;
      hud.bannerSub.textContent = sub;
      hud.bannerEl.classList.add('show');
      hud.bannerTimer = 3.2;
    },
    objective(text) {
      hud.objectiveEl.textContent = text;
      G.objectiveBase = text;
    },
    flash(text) {
      hud.toastEl.textContent = text;
      hud.toastEl.classList.add('show');
      hud.toastTimer = 2.6;
    },
    showBusted(fine) {
      hud.bustedText.textContent = `Busted! The PD fined you $${fine}.`;
      hud.bustedEl.classList.add('show');
      setTimeout(() => hud.bustedEl.classList.remove('show'), 3200);
    },
    showMenu(show) {
      hud.menuEl.classList.toggle('show', show);
    },
    showPause(show) {
      hud.pauseEl.classList.toggle('show', show);
    },
    showGarage(show) {
      hud.garageEl.classList.toggle('show', show);
    },
  };
  return hud;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// One frame of HUD updates: stars, compass, cash, health, speed, timers, minimap.
export function updateHud(G, dt) {
  const H = G.hud;
  const P = G.player;
  H.bannerTimer = Math.max(0, H.bannerTimer - dt);
  if (H.bannerTimer === 0) H.bannerEl.classList.remove('show');
  H.toastTimer = Math.max(0, H.toastTimer - dt);
  if (H.toastTimer === 0) H.toastEl.classList.remove('show');

  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < P.wanted ? '★' : '☆';
  H.starsEl.textContent = stars;
  const heading = P.vehicle ? P.vehicle.heading : P.heading;
  const idx = Math.round(((heading % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 4)) % 8;
  H.compassEl.textContent = `N NE E SE S SW W NW · ${COMPASS[idx]}`;
  H.cashEl.textContent = `$${P.cash}`;
  H.hpEl.style.width = `${Math.max(0, Math.min(100, P.hp))}%`;
  const speed = P.vehicle ? Math.abs(P.vehicle.speed) * 3.6 : 0;
  H.speedEl.textContent = P.vehicle ? `${Math.round(speed)} km/h` : '';
  drawMinimap(G);
}

// The minimap: roads, sea, beach, player arrow, police dots, beacon and garage.
function drawMinimap(G) {
  const ctx = G.hud.map;
  const S = 160;
  const scale = S / WORLD;
  const toMap = (x, z) => [(x + WORLD / 2) * scale, (z + WORLD / 2) * scale];
  ctx.fillStyle = '#7fae56';
  ctx.fillRect(0, 0, S, S);
  // Sea and beach on the east edge.
  const [bx] = toMap(BEACH_X, 0);
  ctx.fillStyle = '#e8d8a8';
  ctx.fillRect(bx, 0, S - bx, S);
  const [sx] = toMap(190, 0);
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(sx, 0, S - sx, S);
  // Roads.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let c = -180; c <= 180; c += 60) {
    const [x] = toMap(c, 0);
    const [, z] = toMap(0, c);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, S);
    ctx.moveTo(0, z);
    ctx.lineTo(S, z);
    ctx.stroke();
  }
  // Landmarks: garage (blue), lighthouse (white), marina (cyan), plaza (yellow).
  function dot(x, z, color, r = 3) {
    const [mx, mz] = toMap(x, z);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx, mz, r, 0, Math.PI * 2);
    ctx.fill();
  }
  dot(GARAGE.pos[0], GARAGE.pos[1], '#3a6ad8', 3);
  dot(LIGHTHOUSE[0], LIGHTHOUSE[1], '#ffffff', 3);
  dot(MARINA[0], MARINA[1], '#2ec8d8', 3);
  dot(PLAZA[0], PLAZA[1], '#ffd21f', 3);
  // Mission beacon.
  if (G.beacon) {
    const [mx, mz] = toMap(G.beacon.x, G.beacon.z);
    ctx.strokeStyle = '#ffd21f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, mz, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Police cars.
  for (const car of G.police.cars) dot(car.x, car.z, '#ff2222', 2.5);
  // The player: a white arrow pointing where they face.
  const [px, pz] = toMap(G.player.x, G.player.z);
  const heading = G.player.vehicle ? G.player.vehicle.heading : G.player.heading;
  ctx.fillStyle = '#ffffff';
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(-heading);
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4.5, 5);
  ctx.lineTo(-4.5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
