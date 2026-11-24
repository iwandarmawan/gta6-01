// The HUD: everything the player reads while playing, drawn as DOM over
// the canvas. Cash and health top right, wanted stars top left, a compass
// across the top, the objective along the bottom, and a minimap pinned to
// the middle of the left edge — vertically centred, never bottom-anchored,
// because a headless render once swallowed a bottom-anchored minimap whole.
// The start, pause, garage and mission menus are DOM too.
import { WORLD, ROADS_X, ROADS_Z, GARAGE_PRICES } from './config.js';

function el(tag, text, style) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (style) Object.assign(n.style, style);
  return n;
}

const BAR = {
  position: 'absolute', background: 'rgba(0,0,0,0.55)', color: '#fff',
  fontFamily: 'sans-serif', borderRadius: '6px', padding: '6px 10px',
  fontSize: '15px', pointerEvents: 'none', whiteSpace: 'nowrap',
};

export function makeHud() {
  const root = el('div', undefined, {
    position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none',
    fontFamily: 'sans-serif', userSelect: 'none',
  });
  document.body.appendChild(root);

  const stars = el('div', '☆☆☆☆☆', { ...BAR, top: '12px', left: '12px', fontSize: '22px', letterSpacing: '2px', color: '#ffd54f' });
  const compass = el('div', 'N · S', { ...BAR, top: '12px', left: '50%', transform: 'translateX(-50%)' });
  const cash = el('div', '$0', { ...BAR, top: '12px', right: '12px', fontWeight: 'bold' });
  const health = el('div', undefined, { ...BAR, top: '48px', right: '12px', width: '160px', padding: '6px' });
  const healthFill = el('div', undefined, { height: '10px', background: '#4caf50', borderRadius: '3px', width: '100%' });
  health.appendChild(healthFill);
  const objective = el('div', '', { ...BAR, bottom: '52px', left: '50%', transform: 'translateX(-50%)' });
  const hint = el('div', 'WASD move/drive · E enter car · Click shoot · M job · G garage · P pause', {
    ...BAR, bottom: '12px', left: '50%', transform: 'translateX(-50%)', fontSize: '13px', opacity: '0.85',
  });
  const speed = el('div', '0 km/h', { ...BAR, bottom: '12px', right: '12px', fontSize: '18px', fontWeight: 'bold' });
  const banner = el('div', '', {
    ...BAR, top: '18%', left: '50%', transform: 'translateX(-50%)', fontSize: '26px',
    fontWeight: 'bold', textAlign: 'center', display: 'none', padding: '12px 22px',
  });
  const bannerSub = el('div', '', { fontSize: '15px', fontWeight: 'normal', marginTop: '4px' });
  banner.appendChild(bannerSub);
  const toast = el('div', '', { ...BAR, top: '64px', left: '50%', transform: 'translateX(-50%)', display: 'none' });

  // The minimap: a small canvas, vertically centred on the left edge.
  const map = document.createElement('canvas');
  map.width = 150; map.height = 150;
  Object.assign(map.style, {
    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
    border: '2px solid rgba(255,255,255,0.7)', borderRadius: '6px',
    background: '#6fae4e', pointerEvents: 'none',
  });
  root.append(map, stars, compass, cash, health, objective, hint, speed, banner, toast);

  // Menus: one overlay, its content swapped per menu.
  const menu = el('div', undefined, {
    position: 'absolute', inset: '0', display: 'none', alignItems: 'center',
    justifyContent: 'center', background: 'rgba(0,0,0,0.6)', pointerEvents: 'auto',
  });
  const menuCard = el('div', undefined, {
    background: '#1c2733', color: '#fff', borderRadius: '10px', padding: '28px 36px',
    maxWidth: '520px', textAlign: 'center', fontFamily: 'sans-serif',
  });
  menu.appendChild(menuCard);
  root.appendChild(menu);

  const hud = {
    root, menu, menuCard,
    setCash(v) { cash.textContent = `$${v}`; },
    setWanted(n) {
      stars.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
      stars.style.color = n >= 4 ? '#ff5252' : '#ffd54f';
    },
    setHealth(hp, max) {
      const pct = Math.max(0, Math.min(100, (hp / max) * 100));
      healthFill.style.width = `${pct}%`;
      healthFill.style.background = pct > 50 ? '#4caf50' : pct > 25 ? '#ff9800' : '#f44336';
    },
    setSpeed(kmh) { speed.textContent = `${Math.round(kmh)} km/h`; },
    setCompass(headingDeg) {
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const idx = Math.round((((headingDeg % 360) + 360) % 360) / 45) % 8;
      compass.textContent = `N NE E SE S SW W NW · ${dirs[idx]}`;
    },
    setObjective(text, seconds) {
      objective.textContent = seconds > 0 ? `${text} — ${Math.ceil(seconds)}s` : text;
    },
    banner(title, sub) {
      banner.firstChild.textContent = title;
      bannerSub.textContent = sub || '';
      banner.style.display = 'block';
      clearTimeout(hud._bannerTimer);
      hud._bannerTimer = setTimeout(() => { banner.style.display = 'none'; }, 3200);
    },
    toast(text) {
      toast.textContent = text;
      toast.style.display = 'block';
      clearTimeout(hud._toastTimer);
      hud._toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2200);
    },
    showMenu(html) { menuCard.innerHTML = html; menu.style.display = 'flex'; },
    hideMenu() { menu.style.display = 'none'; },
    // The minimap: grass, the sea on the right, roads as pale lines, the
    // player as a white arrow, police as blue dots, the objective as gold.
    drawMap(G) {
      const g = map.getContext('2d');
      const W = map.width, H = map.height;
      const sx = (x) => ((x - WORLD.minX) / (WORLD.maxX - WORLD.minX)) * W;
      const sz = (z) => ((z - WORLD.minZ) / (WORLD.maxZ - WORLD.minZ)) * H;
      g.fillStyle = '#6fae4e'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2e7fa8'; g.fillRect(sx(WORLD.seaX), 0, W - sx(WORLD.seaX), H);
      g.fillStyle = '#dcc98f'; g.fillRect(sx(WORLD.sandX0), 0, sx(WORLD.sandX1) - sx(WORLD.sandX0), H);
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.5;
      for (const x of ROADS_X) { g.beginPath(); g.moveTo(sx(x), 0); g.lineTo(sx(x), H); g.stroke(); }
      for (const z of ROADS_Z) { g.beginPath(); g.moveTo(0, sz(z)); g.lineTo(W, sz(z)); g.stroke(); }
      const dot = (x, z, color, r) => {
        g.fillStyle = color;
        g.beginPath(); g.arc(sx(x), sz(z), r, 0, Math.PI * 2); g.fill();
      };
      const M = G.missions;
      const target = M.active ? M.active.steps[M.step]?.target
        : M.fare ? (M.fareStep === 0 ? M.fare.from : M.fare.to) : null;
      if (target) dot(target.x, target.z, '#ffeb3b', 5);
      for (const car of G.police.cars) dot(car.x, car.z, '#448aff', 3);
      // The player, drawn as an arrow pointing where they face.
      g.save();
      g.translate(sx(G.player.x), sz(G.player.z));
      g.rotate(Math.atan2(Math.sin(G.player.heading), -Math.cos(G.player.heading)) + Math.PI / 2);
      g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill();
      g.restore();
    },
  };
  return hud;
}

// The start screen: the game's name, what it is, and how to play it.
export function startMenuHtml() {
  return `<h1 style="margin:0 0 6px">SOLMAR BAY</h1>
  <p style="margin:0 0 14px;color:#b0bec5">An original open-world crime game in the spirit of GTA 6.</p>
  <p style="text-align:left;line-height:1.7;margin:0 0 16px">Rico Marlowe drives for Vera Costa across a sun-soaked coastal city: six jobs, a garage to spend the cash in, and the Solmar PD on his tail. Steal cars, run fares, outrun the law.<br><br>
  <b>WASD</b> move / drive &nbsp;·&nbsp; <b>E</b> enter or leave a car &nbsp;·&nbsp; <b>Click</b> shoot<br>
  <b>M</b> next job &nbsp;·&nbsp; <b>T</b> taxi fare &nbsp;·&nbsp; <b>G</b> garage &nbsp;·&nbsp; <b>P</b> pause</p>
  <button id="playBtn" style="font-size:18px;padding:10px 28px;border-radius:8px;border:0;background:#2e7d32;color:#fff;cursor:pointer">Play</button>`;
}

// The garage: spend cash on repairs and upgrades.
export function garageMenuHtml(G) {
  const u = G.upgrades;
  return `<h2 style="margin:0 0 10px">RICO'S GARAGE</h2>
  <p style="margin:0 0 14px">Cash: <b>$${G.cash}</b> &nbsp;·&nbsp; Engine: ${u.engine ? 'Upgraded (+25% speed)' : 'Stock'} &nbsp;·&nbsp; Armour: ${u.armor ? 'Fitted (+50 HP)' : 'Stock'}</p>
  <div style="display:flex;flex-direction:column;gap:8px">
  <button data-act="repair" style="padding:10px;border-radius:8px;border:0;background:#1565c0;color:#fff;cursor:pointer">Repair — $${GARAGE_PRICES.repair}</button>
  <button data-act="engine" style="padding:10px;border-radius:8px;border:0;background:#1565c0;color:#fff;cursor:pointer" ${u.engine ? 'disabled' : ''}>Engine upgrade (+25% speed) — $${GARAGE_PRICES.engine}</button>
  <button data-act="armor" style="padding:10px;border-radius:8px;border:0;background:#1565c0;color:#fff;cursor:pointer" ${u.armor ? 'disabled' : ''}>Armour (+50 max HP) — $${GARAGE_PRICES.armor}</button>
  <button data-act="close" style="padding:10px;border-radius:8px;border:0;background:#555;color:#fff;cursor:pointer">Back to the city</button>
  </div>`;
}

// The mission list: what is done, what is next, what it pays.
export function missionsMenuHtml(G) {
  const M = G.missions;
  const rows = M.done.map((id) => `<div>✓ ${id}</div>`).join('');
  const next = M.index < 6 ? `<div>Next: <b>${['First Wheels', 'Harbour Escape', 'City Taxi', 'Sunset Courier', 'Rooftop Leap', 'Lighthouse Cache'][M.index]}</b></div>` : '<div>Story complete — taxi fares keep paying.</div>';
  return `<h2 style="margin:0 0 10px">JOBS FOR VERA COSTA</h2>
  <div style="text-align:left;line-height:1.9">${rows || '<div>No jobs done yet.</div>'}${next}</div>
  <button data-act="close" style="padding:10px 20px;margin-top:16px;border-radius:8px;border:0;background:#555;color:#fff;cursor:pointer">Close</button>`;
}
