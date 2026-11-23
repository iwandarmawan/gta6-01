// The wanted system: heat, stars, police cars that chase and ram,
// and the bust that ends the run when the law catches the player.

import { TUNING, ROADS, PALETTE } from './config.js';
import { makeCar, driveCar } from './cars.js';

const THREE = window.THREE;

export function createPolice(scene, city, rng) {
  const police = {
    heat: 0,
    stars: 0,
    cars: [],
    bustTimer: 0,
    unseenTimer: 0,
    flashT: 0,
  };

  function starCount() {
    if (police.heat <= 0) return 0;
    return Math.min(5, Math.ceil(police.heat / 20));
  }

  police.addHeat = function addHeat(n) {
    police.heat = Math.min(100, police.heat + n);
    police.stars = starCount();
  };

  police.reset = function reset() {
    police.heat = 0;
    police.stars = 0;
    police.bustTimer = 0;
    police.unseenTimer = 0;
    for (const p of police.cars) scene.remove(p.car.group);
    police.cars = [];
  };

  function spawnPointNear(playerPos) {
    for (let tries = 0; tries < 20; tries++) {
      const road = rng.pick(ROADS);
      const t = rng.next();
      const x = road.x1 + (road.x2 - road.x1) * t;
      const z = road.z1 + (road.z2 - road.z1) * t;
      const d = Math.hypot(x - playerPos.x, z - playerPos.z);
      if (d > 45 && d < 70) return { x, z };
    }
    return { x: playerPos.x + 50, z: playerPos.z };
  }

  police.update = function update(dt, player, game) {
    // Heat decays only when no police car can see the player.
    let nearest = Infinity;
    for (const p of police.cars) {
      const d = Math.hypot(p.car.pos.x - player.pos.x, p.car.pos.z - player.pos.z);
      if (d < nearest) nearest = d;
    }
    if (nearest > 55 || police.cars.length === 0) {
      police.unseenTimer += dt;
      if (police.unseenTimer > 10 && police.heat > 0) {
        police.heat = Math.max(0, police.heat - TUNING.heatDecay * 6 * dt);
        police.stars = starCount();
      }
    } else {
      police.unseenTimer = 0;
    }

    // Keep the right number of cruisers on the street.
    const want = Math.min(police.stars, 4);
    while (police.cars.length < want) {
      const spot = spawnPointNear(player.pos);
      const car = makeCar(scene, spot.x, spot.z, 0, PALETTE.police, true);
      police.cars.push({ car, ramCooldown: 0, sirenPhase: rng.next() * 2 });
    }
    while (police.cars.length > want) {
      const p = police.cars.pop();
      scene.remove(p.car.group);
    }

    // Chase: steer at the player, ram on contact, flash the light bar.
    police.flashT += dt;
    const flash = Math.sin(police.flashT * 9) > 0;
    let busting = false;
    for (const p of police.cars) {
      const { car } = p;
      const dx = player.pos.x - car.pos.x;
      const dz = player.pos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 1.6));
      const res = driveCar(car, dt, 1, steer, false, city);
      if (res.hit && res.impact > 4) {
        game.audio.crash(0.6);
      }
      p.ramCooldown -= dt;
      if (dist < 3.8 && p.ramCooldown <= 0) {
        p.ramCooldown = 1;
        game.combat.damagePlayer(9);
        if (player.car) {
          player.car.health -= 6;
          player.car.speed *= 0.6;
        }
        police.addHeat(0); // ramming the law keeps the heat it already has
        game.audio.crash(0.8);
      }
      const bar = car.group.userData.lightBar;
      if (bar) {
        bar.redMat.emissiveIntensity = flash ? 1.6 : 0.15;
        bar.blueMat.emissiveIntensity = flash ? 0.15 : 1.6;
      }
      if (dist > 150) {
        scene.remove(car.group);
        police.cars.splice(police.cars.indexOf(p), 1);
      }
      if (dist < TUNING.policeBustRange && Math.abs(player.speed || 0) < 3) busting = true;
    }

    // Busted: a cruiser sits on the player while they crawl.
    if (busting && police.stars > 0) {
      police.bustTimer += dt;
      if (police.bustTimer > TUNING.policeBustTime) {
        police.bustTimer = 0;
        game.onBusted();
      }
    } else {
      police.bustTimer = Math.max(0, police.bustTimer - dt * 2);
    }
  };

  return police;
}
