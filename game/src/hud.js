// The HUD for Solmar Bay: wanted stars, cash and health, the mission
// objective, the speedometer, the minimap, the compass strip and the menus.
// All DOM lives in index.html; this module only reads and writes it.

import { currentObjective } from './missions.js';

const MAP_W = 180;
const MAP_H = 180;

export function buildHud(G) {
  const $ = (id) => document.getElementById(id);
  G.ui = {
    stars: $('stars'),
    cash: $('cash'),
    healthFill: $('health-fill'),
    healthText: $('health-text'),
    objective: $('objective'),
    speed: $('speed'),
    minimap: $('minimap'),
    compassStrip: $('compass-strip'),
    compassBeacon: $('compass-beacon'),
    messages: $('messages'),
    menu: $('menu'),
    pauseMenu: $('pause-menu'),
    bustedScreen: $('busted-screen'),
    bustedFine: $('busted-fine'),
    garageMenu: $('garage-menu'),
    prompt: $('prompt'),
    status: $('status'),
  };
  $('start-btn').addEventListener('click', () => G.ui.onStart && G.ui.onStart(false));
  $('continue-btn').addEventListener('click', () => G.ui.onStart && G.ui.onStart(true));
  $('resume-btn').addEventListener('click', () => G.ui.onResume && G.ui.onResume());
  $('respawn-btn').addEventListener('click', () => G.ui.onRespawn && G.ui.onRespawn());
  $('garage-close').addEventListener('click', () => G.ui.onGarageClose && G.ui.onGarageClose());
  $('garage-repair').addEventListener('click', () => G.ui.onGarageBuy && G.ui.onGarageBuy('repair'));
  $('garage-engine').addEventListener('click', () => G.ui.onGarageBuy && G.ui.onGarageBuy('engine'));
  $('garage-armor').addEventListener('click', () => G.ui.onGarageBuy && G.ui.onGarageBuy('armor'));
}

export function showScreen(G, name) {
  const ui = G.ui;
  ui.menu.style.display = name === 'menu' ? 'flex' : 'none';
  ui.pauseMenu.style.display = name === 'pause' ? 'flex' : 'none';
  ui.bustedScreen.style.display = name === 'busted' ? 'flex' : 'none';
  ui.garageMenu.style.display = name === 'garage' ? 'flex' : 'none';
  if (name === 'busted' && ui.bustedFine) {
    ui.bustedFine.textContent = `The Solmar PD took $${G.bustedFine || 0} off you.`;
  }
  if (name === 'garage') refreshGarage(G);
}

function refreshGarage(G) {
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  const v = G.player.vehicle;
  set('garage-cash', `Cash: $${Math.floor(G.player.cash)}`);
  set('garage-damage', v ? `Damage: ${Math.floor(v.damage)}%` : 'No vehicle');
  set('garage-repair', v && v.damage > 0 ? `Repair ($50)` : 'Repair — not needed');
  set('garage-engine', G.upgrades.engine ? 'Engine upgrade — owned' : 'Engine upgrade ($400)');
  set('garage-armor', G.upgrades.armor ? 'Armor — owned' : 'Armor ($300)');
}

function drawMinimap(G) {
  const canvas = G.ui.minimap;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const sx = (x) => (x + 220) * 0.4;
  const sz = (z) => (z + 180) * 0.4 + 18;
  ctx.fillStyle = '#2e7f9e';
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.fillStyle = '#9db380';
  ctx.fillRect(sx(-220), sz(-180), 440 * 0.4, 360 * 0.4);
  ctx.fillStyle = '#1d5a74';
  ctx.fillRect(sx(30), sz(90), 60 * 0.4, 90 * 0.4);
  ctx.fillStyle = '#3a3a40';
  const roadsX = [-200, -160, -120, -80, -40, 0, 40, 80, 120, 160, 200];
  const roadsZ = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
  for (const x of roadsX) ctx.fillRect(sx(x) - 2, sz(-180), 4, 360 * 0.4);
  for (const z of roadsZ) ctx.fillRect(sx(-220), sz(z) - 2, 440 * 0.4, 4);
  // Airfield.
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(sx(125), sz(-162), 80 * 0.4, 14 * 0.4);
  // Collectibles.
  ctx.fillStyle = '#ffd21f';
  for (const c of G.city.caches) {
    if (!c.taken) {
      ctx.beginPath();
      ctx.arc(sx(c.x), sz(c.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Objective beacon.
  const obj = currentObjective(G);
  if (obj && obj.x !== null) {
    ctx.fillStyle = '#ffd21f';
    ctx.beginPath();
    ctx.arc(sx(obj.x), sz(obj.z), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }
  // Traffic and parked cars.
  ctx.fillStyle = '#f2f2f2';
  for (const v of G.vehicles) {
    if (v.driver === 'player') continue;
    ctx.fillRect(sx(v.pos.x) - 1.5, sz(v.pos.z) - 1.5, 3, 3);
  }
  // Police.
  ctx.fillStyle = '#2a6ad4';
  for (const v of G.police) {
    ctx.beginPath();
    ctx.arc(sx(v.pos.x), sz(v.pos.z), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const px = sx(G.player.pos.x);
  const pz = sz(G.player.pos.z);
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(-G.player.angle);
  ctx.fillStyle = '#ff5a3a';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4, 5);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function updateCompass(G) {
  const strip = G.ui.compassStrip;
  if (!strip) return;
  const heading = G.cameraYaw;
  const pxPerRad = 114.6;
  const offset = -((heading * pxPerRad) % (Math.PI * 2 * pxPerRad));
  strip.style.transform = `translateX(${offset - 360}px)`;
  const obj = currentObjective(G);
  const beacon = G.ui.compassBeacon;
  if (beacon) {
    if (obj && obj.x !== null) {
      const dx = obj.x - G.player.pos.x;
      const dz = obj.z - G.player.pos.z;
      const bearing = Math.atan2(-dx, -dz);
      let diff = bearing - heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const x = 360 + diff * pxPerRad;
      beacon.style.display = 'block';
      beacon.style.left = `${Math.max(0, Math.min(720, x))}px`;
    } else {
      beacon.style.display = 'none';
    }
  }
}

export function updateHud(G) {
  const ui = G.ui;
  if (!ui) return;
  ui.stars.textContent = '★'.repeat(G.wanted) + '☆'.repeat(5 - G.wanted);
  ui.cash.textContent = `$${Math.floor(G.player.cash)}`;
  const hp = Math.max(0, Math.round(G.player.health));
  ui.healthFill.style.width = `${hp}%`;
  ui.healthText.textContent = `${hp}`;
  const obj = currentObjective(G);
  let objText = obj ? obj.text : '';
  if (G.mission && G.mission.timer > 0) objText += ` — ${Math.ceil(G.mission.timer)}s`;
  ui.objective.textContent = objText;
  const speed = G.player.vehicle ? Math.abs(G.player.vehicle.speed) * 3.6 : 0;
  ui.speed.textContent = G.player.vehicle ? `${Math.round(speed)} km/h` : '';
  // Messages.
  const now = G.elapsed;
  const active = G.messages.filter((m) => m.until > now);
  G.messages = active;
  ui.messages.innerHTML = active.map((m) => `<div class="toast">${m.text}</div>`).join('');
  // Prompt line.
  let prompt = '';
  if (G.mode === 'play') {
    if (!G.player.vehicle) {
      if (G.nearVehicle) prompt = `Press E to drive the ${G.nearVehicle.spec.name}`;
      else if (G.nearGarage) prompt = 'Press E to open the garage';
      else prompt = 'WASD to move · Click to shoot · E to drive';
    } else if (G.nearGarage) {
      prompt = 'Press E for the garage · E again to leave the vehicle · P pause';
    } else {
      prompt = 'E to leave the vehicle · P pause';
    }
  }
  ui.prompt.textContent = prompt;
  drawMinimap(G);
  updateCompass(G);
}
