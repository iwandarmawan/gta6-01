// The HUD: wanted stars, cash, health, speed, mission objective and timer,
// compass, a toast line, and a live minimap drawn on a 2D canvas. The minimap
// sits vertically centred on the left edge — bottom-anchored minimaps fall
// into a headless-Chromium compositing hole, so it stays centred.
import { STREETS_X, STREETS_Z, POIS } from './config.js';

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export class HUD {
  constructor() {
    this.stars = document.getElementById('stars');
    this.cash = document.getElementById('cash');
    this.health = document.getElementById('health');
    this.speed = document.getElementById('speed');
    this.objective = document.getElementById('objective');
    this.timer = document.getElementById('timer');
    this.compass = document.getElementById('compass');
    this.toastEl = document.getElementById('toast');
    this.map = document.getElementById('minimap');
    this.ctx = this.map.getContext('2d');
    this.toastTtl = 0;
  }

  showToast(text) {
    this.toastEl.textContent = text;
    this.toastEl.style.opacity = 1;
    this.toastTtl = 3.5;
  }

  update(G, dt) {
    const p = G.player;
    let s = '';
    for (let i = 0; i < 5; i++) s += i < p.wanted ? '★' : '☆';
    this.stars.textContent = s;
    this.cash.textContent = '$' + Math.floor(p.cash);
    this.health.style.width = Math.max(0, p.health) + '%';
    this.speed.textContent = Math.round(Math.abs(p.speed) * 3.6) + ' km/h';
    this.objective.textContent = G.missions.objectiveText();
    this.timer.textContent = G.missions.timeLeft > 0 ? Math.ceil(G.missions.timeLeft) + 's' : '';
    const a = (Math.atan2(Math.sin(p.heading), -Math.cos(p.heading)) * 180 / Math.PI + 360) % 360;
    const idx = Math.round(a / 45) % 8;
    this.compass.textContent = `${DIRS[(idx + 7) % 8]} ${DIRS[idx]} ${DIRS[(idx + 1) % 8]} · ${DIRS[(idx + 2) % 8]} ${DIRS[(idx + 3) % 8]}`;
    if (this.toastTtl > 0) {
      this.toastTtl -= dt;
      if (this.toastTtl <= 0) this.toastEl.style.opacity = 0;
    }
    this.drawMinimap(G);
  }

  drawMinimap(G) {
    const ctx = this.ctx;
    const S = 150;
    const mx = (x) => ((x + 200) / 400) * S;
    const mz = (z) => ((z + 200) / 400) * S;
    ctx.fillStyle = '#3a2a3a';
    ctx.fillRect(0, 0, S, S);
    // Sea on the west (left), beach strip, coast road.
    ctx.fillStyle = '#35356b';
    ctx.fillRect(0, 0, mx(-150), S);
    ctx.fillStyle = '#d9a066';
    ctx.fillRect(mx(-168), 0, mx(-140) - mx(-168), S);
    ctx.strokeStyle = '#8a7a6a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx(-145), 0);
    ctx.lineTo(mx(-145), S);
    ctx.stroke();
    // Street grid.
    ctx.strokeStyle = '#6a5a6a';
    for (const x of STREETS_X) {
      ctx.beginPath();
      ctx.moveTo(mx(x), 0);
      ctx.lineTo(mx(x), S);
      ctx.stroke();
    }
    for (const z of STREETS_Z) {
      ctx.beginPath();
      ctx.moveTo(0, mz(z));
      ctx.lineTo(S, mz(z));
      ctx.stroke();
    }
    // Points of interest.
    const dot = (x, z, color, r = 3) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mx(x), mz(z), r, 0, Math.PI * 2);
      ctx.fill();
    };
    dot(POIS.lighthouse.x, POIS.lighthouse.z, '#ffd24a');
    dot(POIS.marina.x, POIS.marina.z, '#5a8ac2');
    dot(POIS.airfield.x, POIS.airfield.z, '#8a8a8a');
    dot(POIS.plaza.x, POIS.plaza.z, '#5ac28a');
    dot(POIS.garage.x, POIS.garage.z, '#e07a1e');
    // Mission target: a pulsing yellow ring.
    if (G.missions.active) {
      const st = G.missions.stageDef();
      ctx.strokeStyle = '#ffd24a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx(st.x), mz(st.z), 5 + Math.sin(G.time * 4) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Police: red dots.
    for (const u of G.police.units) {
      dot(u.v.group.position.x, u.v.group.position.z, '#ff2a2a', 2.5);
    }
    // Player: a white arrow pointing along the heading.
    const p = G.player;
    ctx.save();
    ctx.translate(mx(p.pos.x), mz(p.pos.z));
    ctx.rotate(Math.atan2(Math.sin(p.heading), -Math.cos(p.heading)));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
