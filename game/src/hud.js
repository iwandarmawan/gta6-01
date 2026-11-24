// HUD: wanted stars, cash, health, speed, objective and timer, compass, and
// the minimap — a canvas pinned to the left edge, vertically centred, so the
// headless compositor never clips it. Plus menu / wasted / busted overlays.
import { POI } from './config.js';

export function makeHud() {
  const root = document.getElementById('hud');
  root.innerHTML = `
    <div id="stars"></div>
    <div id="cash">$0</div>
    <div id="health"><div id="healthbar"></div></div>
    <div id="compass">N</div>
    <div id="objective"></div>
    <div id="timer"></div>
    <div id="speed">0 km/h</div>
    <canvas id="minimap" width="170" height="170"></canvas>
    <div id="toast"></div>
    <div id="menu">
      <h1>SOLMAR BAY</h1>
      <p class="sub">A night in the city — an open-world crime story</p>
      <p>Rico Marlowe owes Vera Costa one last night of work. Steal cars,
      run fares, dodge the Solmar Bay PD and their helicopter, and make the
      lighthouse cache before dawn.</p>
      <p class="keys">WASD move / drive &nbsp;·&nbsp; E enter or leave a car &nbsp;·&nbsp; Click shoot
      &nbsp;·&nbsp; Space handbrake &nbsp;·&nbsp; G garage &nbsp;·&nbsp; T taxi fare</p>
      <button id="startBtn">START THE NIGHT</button>
      <p class="fine">An original game. No Rockstar content. Headphones on.</p>
    </div>
    <div id="endcard" style="display:none"></div>`;
  return {
    stars: document.getElementById('stars'),
    cash: document.getElementById('cash'),
    healthbar: document.getElementById('healthbar'),
    compass: document.getElementById('compass'),
    objective: document.getElementById('objective'),
    timer: document.getElementById('timer'),
    speed: document.getElementById('speed'),
    map: document.getElementById('minimap'),
    toast: document.getElementById('toast'),
    menu: document.getElementById('menu'),
    endcard: document.getElementById('endcard'),
    startBtn: document.getElementById('startBtn'),
  };
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function updateHud(hud, G, dt) {
  hud.stars.textContent = '★'.repeat(G.wanted) + '☆'.repeat(Math.max(0, 5 - G.wanted));
  hud.stars.style.color = G.wanted >= 4 ? '#ff4040' : '#ffd24f';
  hud.cash.textContent = `$${G.cash}`;
  hud.healthbar.style.width = `${Math.max(0, G.health)}%`;
  hud.healthbar.style.background = G.health > 50 ? '#58d68d' : G.health > 25 ? '#f5b041' : '#e74c3c';
  const heading = G.heading || 0;
  const idx = Math.round(((heading % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 4)) % 8;
  hud.compass.textContent = DIRS[idx] + '  ·  ' + (G.inCar ? 'DRIVING' : 'ON FOOT');
  hud.objective.textContent = G.objective || '';
  hud.timer.textContent = G.missionTimer > 0 ? `${Math.ceil(G.missionTimer)}s` : '';
  const kmh = Math.abs(Math.round((G.speed || 0) * 3.2));
  hud.speed.textContent = G.inCar ? `${kmh} km/h` : '';
  if (G.toastIn > 0) {
    hud.toast.textContent = G.toast;
    hud.toast.style.opacity = '1';
  } else {
    hud.toast.style.opacity = '0';
  }
  drawMinimap(hud.map, G);
}

function drawMinimap(canvas, G) {
  const ctx = canvas.getContext('2d');
  const W = 170;
  const S = W / 460; // world -230..230 maps to the canvas
  ctx.clearRect(0, 0, W, W);
  ctx.fillStyle = '#0a1128';
  ctx.fillRect(0, 0, W, W);
  // Sea (north edge).
  ctx.fillStyle = '#0d2a44';
  ctx.fillRect(0, 0, W, (230 - 150) * S);
  // Roads.
  ctx.strokeStyle = '#2c3444';
  ctx.lineWidth = 2;
  for (const x of [-160, -120, -80, -40, 0, 40, 80, 120, 160]) {
    ctx.beginPath();
    ctx.moveTo((x + 230) * S, 0);
    ctx.lineTo((x + 230) * S, W);
    ctx.stroke();
  }
  for (const z of [-100, -60, -20, 20, 60, 100, 140]) {
    ctx.beginPath();
    ctx.moveTo(0, (z + 230) * S);
    ctx.lineTo(W, (z + 230) * S);
    ctx.stroke();
  }
  const dot = (x, z, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc((x + 230) * S, (z + 230) * S, r, 0, Math.PI * 2);
    ctx.fill();
  };
  dot(POI.lighthouse.x, POI.lighthouse.z, '#ffe9a8', 4);
  dot(POI.marina.x, POI.marina.z, '#7fd4ff', 4);
  dot(POI.airfield.x, POI.airfield.z, '#ff7a3c', 4);
  dot(POI.garage.x, POI.garage.z, '#ffb347', 4);
  dot(0, 0, '#ff4fa3', 3);
  // Mission beacon.
  if (G.beacon) {
    const pulse = 4 + Math.sin(performance.now() / 200) * 2;
    dot(G.beacon.x, G.beacon.z, '#ffe14d', pulse);
  }
  // Police.
  for (const c of G.policeCars || []) dot(c.position.x, c.position.z, '#ff4040', 2.5);
  // Player arrow.
  const px = (G.player.position.x + 230) * S;
  const py = (G.player.position.z + 230) * S;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.heading || 0);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4, 5);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
