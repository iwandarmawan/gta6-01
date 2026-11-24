// hud.js — HUD text + minimap (vertically centred on the left edge:
// bottom-anchoring hits a headless-Chromium compositing hole).
export function initHud() {
  return {
    mode: document.getElementById('mode'),
    stars: document.getElementById('stars'),
    cash: document.getElementById('cash'),
    hp: document.getElementById('hp'),
    objective: document.getElementById('objective'),
    timer: document.getElementById('timer'),
    speed: document.getElementById('speed'),
    toast: document.getElementById('toast'),
    map: document.getElementById('minimap'),
  };
}

export function updateHud(hud, state) {
  hud.mode.textContent = state.vehicle ? 'W · DRIVING' : 'E · ON FOOT';
  hud.stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(Math.max(0, 5 - state.wanted));
  hud.cash.textContent = '$' + state.cash;
  hud.hp.style.width = Math.max(0, state.hp) + '%';
  hud.objective.textContent = state.missions.objective;
  hud.timer.textContent = state.missions.timer > 0 ? Math.ceil(state.missions.timer) + 's' : '';
  const who = state.vehicle || state.player;
  const kmh = state.vehicle ? Math.round(Math.abs(who.userData.speed || 0) * 3.6) : 0;
  hud.speed.textContent = kmh + ' km/h';
  if (state.toast && performance.now() - state.toastAt < 3500) {
    hud.toast.textContent = state.toast;
    hud.toast.style.opacity = '1';
  } else {
    hud.toast.style.opacity = '0';
  }
  drawMinimap(hud.map, state);
}

function drawMinimap(canvas, state) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(10,16,30,0.72)';
  g.fillRect(0, 0, W, H);
  const scale = W / 420;
  const px = (x) => (x + 210) * scale;
  const pz = (z) => (z + 210) * scale;
  // Roads.
  g.strokeStyle = 'rgba(200,200,220,0.5)';
  g.lineWidth = 2;
  for (const x of [-120, -60, 0, 60, 120]) {
    g.beginPath(); g.moveTo(px(x), pz(-150)); g.lineTo(px(x), pz(150)); g.stroke();
  }
  for (const z of [-120, -60, 0, 60, 120, 140]) {
    g.beginPath(); g.moveTo(px(-190), pz(z)); g.lineTo(px(190), pz(z)); g.stroke();
  }
  // Sea (south).
  g.fillStyle = 'rgba(60,110,160,0.8)';
  g.fillRect(0, pz(150), W, H - pz(150));
  // Mission beacon.
  g.fillStyle = '#ffd27a';
  g.beginPath(); g.arc(px(state.beaconPos.x), pz(state.beaconPos.z), 4, 0, Math.PI * 2); g.fill();
  // Peds.
  g.fillStyle = '#e8a02a';
  for (const p of state.peds) {
    g.fillRect(px(p.position.x) - 1, pz(p.position.z) - 1, 2, 2);
  }
  // Traffic.
  g.fillStyle = '#9ad9ff';
  for (const c of state.traffic) {
    g.fillRect(px(c.position.x) - 1.5, pz(c.position.z) - 1.5, 3, 3);
  }
  // Police.
  g.fillStyle = '#ff4040';
  for (const c of state.police) {
    g.beginPath(); g.arc(px(c.position.x), pz(c.position.z), 3, 0, Math.PI * 2); g.fill();
  }
  // Player (white triangle).
  const who = state.vehicle || state.player;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(px(who.position.x), pz(who.position.z) - 5);
  g.lineTo(px(who.position.x) - 4, pz(who.position.z) + 4);
  g.lineTo(px(who.position.x) + 4, pz(who.position.z) + 4);
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.6)';
  g.strokeRect(0.5, 0.5, W - 1, H - 1);
}
