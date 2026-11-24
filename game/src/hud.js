// hud.js — HUD text + minimap. The minimap canvas is vertically centered on
// the left edge (bottom-anchored maps fall into a headless-Chromium compositing
// hole — keep it centered).
export function createHud(spots) {
  const el = (id) => document.getElementById(id);
  const minimap = el('minimap');
  const mctx = minimap.getContext('2d');
  let toastTimer = 0;
  return {
    setObjective(t) { el('objective').textContent = t; },
    setToast(t) { el('toast').textContent = t; toastTimer = 3; },
    update(G, dt) {
      if (dt > 0) toastTimer = Math.max(0, toastTimer - dt);
      el('toast').style.opacity = toastTimer > 0 ? 1 : 0;
      const stars = '★'.repeat(G.wanted) + '☆'.repeat(5 - G.wanted);
      el('stars').textContent = stars;
      el('cash').textContent = '$' + Math.floor(G.cash);
      el('health').style.width = Math.max(0, (G.health / G.maxHealth) * 100) + '%';
      el('mode').textContent = G.mode === 'drive' ? 'W · DRIVING' : 'E · ON FOOT';
      const spd = G.mode === 'drive' && G.vehicle ? Math.abs(G.vehicle.speed) * 3.6 : 0;
      el('speed').textContent = Math.round(spd) + ' km/h';
      if (G.missions.timer > 0) el('timer').textContent = Math.ceil(G.missions.timer) + 's';
      else el('timer').textContent = '';
      // Minimap: 150x150, world -240..240 mapped in, sea east in blue.
      const W = 150, S = W / 480;
      mctx.fillStyle = '#10141a'; mctx.fillRect(0, 0, W, W);
      mctx.fillStyle = '#12344a'; mctx.fillRect(150 * S + 75, 0, W, W);
      mctx.strokeStyle = '#3a4150'; mctx.lineWidth = 1;
      for (let s = -140; s <= 140; s += 40) {
        mctx.beginPath(); mctx.moveTo((s + 6 + 240) * S, 0); mctx.lineTo((s + 6 + 240) * S, W); mctx.stroke();
        mctx.beginPath(); mctx.moveTo(0, (s + 6 + 240) * S); mctx.lineTo(W, (s + 6 + 240) * S); mctx.stroke();
      }
      const dot = (x, z, color, r) => {
        mctx.fillStyle = color;
        mctx.beginPath(); mctx.arc((x + 240) * S, (z + 240) * S, r, 0, Math.PI * 2); mctx.fill();
      };
      dot(spots.lighthouse.x, spots.lighthouse.z, '#ffffff', 3);
      dot(spots.marina.x, spots.marina.z, '#7fd8ff', 3);
      dot(spots.airfield.x, spots.airfield.z, '#c0c0c0', 3);
      dot(spots.plaza.x, spots.plaza.z, '#ffd24a', 3);
      // Mission beacon ring.
      const tp = G.missionTarget;
      if (tp) {
        mctx.strokeStyle = '#ffd24a'; mctx.lineWidth = 2;
        mctx.beginPath(); mctx.arc((tp.x + 240) * S, (tp.z + 240) * S, 6, 0, Math.PI * 2); mctx.stroke();
      }
      for (const p of G.police.cars) dot(p.v.group.position.x, p.v.group.position.z, '#ff4040', 2.5);
      // Player arrow.
      const px = (G.playerPos.x + 240) * S, pz = (G.playerPos.z + 240) * S;
      mctx.fillStyle = '#ffffff';
      mctx.beginPath();
      mctx.moveTo(px, pz - 5); mctx.lineTo(px + 4, pz + 4); mctx.lineTo(px - 4, pz + 4); mctx.closePath(); mctx.fill();
    },
  };
}
