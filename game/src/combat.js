// Combat and health: the player's punch, crash damage, slow
// regeneration, and the wasted screen when health runs out.

import { TUNING } from './config.js';

export function createCombat(game) {
  const combat = {
    health: TUNING.playerHealth,
    maxHealth: TUNING.playerHealth,
    lastDamageT: -99,
    punchCooldown: 0,
    time: 0,
  };

  combat.damagePlayer = function damagePlayer(n) {
    if (game.mode !== 'playing') return;
    combat.health -= n;
    combat.lastDamageT = combat.time;
    game.audio.crash(0.5);
    if (combat.health <= 0) {
      combat.health = 0;
      game.onWasted();
    }
  };

  // A punch on foot: knocks down the nearest pedestrian in front
  // of the player and draws the law's attention.
  combat.tryPunch = function tryPunch() {
    if (combat.punchCooldown > 0) return false;
    combat.punchCooldown = 0.6;
    const p = game.player;
    const fx = Math.sin(p.heading);
    const fz = Math.cos(p.heading);
    let best = null;
    let bestD = 2.8;
    for (const ped of game.peds.peds) {
      if (ped.state === 'down') continue;
      const dx = ped.pos.x - p.pos.x;
      const dz = ped.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > bestD) continue;
      const dot = (dx * fx + dz * fz) / (d || 1);
      if (dot < 0.3) continue;
      best = ped;
      bestD = d;
    }
    if (!best) return false;
    game.peds.knockDown(best.pos.x, best.pos.z, 3);
    game.police.addHeat(TUNING.heatPerPunch);
    game.audio.beep(180, 0.15);
    game.hud.toast('That will draw the law…');
    return true;
  };

  combat.update = function update(dt) {
    combat.time += dt;
    combat.punchCooldown = Math.max(0, combat.punchCooldown - dt);
    // Slow regeneration after five quiet seconds.
    if (combat.time - combat.lastDamageT > 5 && combat.health > 0 && combat.health < combat.maxHealth) {
      combat.health = Math.min(combat.maxHealth, combat.health + 3 * dt);
    }
  };

  combat.reset = function reset() {
    combat.health = combat.maxHealth;
    combat.lastDamageT = -99;
    combat.punchCooldown = 0;
  };

  return combat;
}
